import {
  ASSESSMENT_DISCLAIMER,
  RUBRIC_VERSION,
  allObjectives,
  applyTeacherReview,
  computeAchievements,
  fluencyScore,
  metRequiredCount,
  recommendNext,
  requiredObjectiveCount,
  taskCompletionScore,
  totals,
  xpForSession,
  type AiAssessmentOutput,
  type AssessmentDoc,
  type CourseDoc,
  type Criterion,
  type CriterionResult,
  type MissionContent,
  type SessionDoc,
  type TeacherReview,
  type UserDoc,
} from '@ecs/shared';
import type { Member } from '../auth.js';
import type { Deps } from '../deps.js';
import { ApiError, forbidden, notFound } from '../errors.js';
import { paths } from '../paths.js';
import { recordUsage, reserveAiCall } from '../quota.js';
import { PROMPT_VERSION } from '../ai/prompts.js';
import { getMissionVersion, getTenant, listApprovedMissions } from '../tenants.js';
import { canViewStudent } from './access.js';
import { listTurns, publicTurn } from './sessions.js';
import { withRetry } from './retry.js';

const ASSESSING_STALE_MS = 120_000;

function clampScore(score: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(score)));
}

export async function completeSession(deps: Deps, m: Member, sessionId: string): Promise<AssessmentDoc> {
  const p = paths(deps.db);
  const sessionRef = p.session(m.tenantId, sessionId);
  const assessmentRef = p.assessment(m.tenantId, sessionId);
  const tenant = await getTenant(deps, m.tenantId);

  const s0 = (await sessionRef.get()).data() as SessionDoc | undefined;
  if (!s0) throw notFound('Session');
  if (s0.uid !== m.uid) throw forbidden('This is not your session');
  const mission = await getMissionVersion(deps, m.tenantId, s0.missionId, s0.missionVersion);
  const courseBudget = s0.courseId ? (((await p.course(m.tenantId, s0.courseId).get()).data() as CourseDoc | undefined)?.monthlyBudgetUsd ?? null) : null;

  // ---- Phase A: lock the session for assessment (idempotent) ----
  const claim = await deps.db.runTransaction(async (tx) => {
    const [sSnap, aSnap] = await Promise.all([tx.get(sessionRef), tx.get(assessmentRef)]);
    if (aSnap.exists) return { done: aSnap.data() as AssessmentDoc } as const;
    const s = sSnap.data() as SessionDoc;
    const now = deps.now();
    if (s.status === 'assessing' && s.pendingSince && now.getTime() - new Date(s.pendingSince).getTime() < ASSESSING_STALE_MS) {
      throw new ApiError('TURN_IN_PROGRESS', 'Your results are being prepared. Please wait.');
    }
    if (!['active', 'paused', 'ready_to_complete', 'assessing'].includes(s.status)) {
      throw new ApiError('SESSION_NOT_ACTIVE', `Session is ${s.status}`);
    }
    if (s.pendingTurnId && s.pendingSince && now.getTime() - new Date(s.pendingSince).getTime() < 90_000 && s.status !== 'assessing') {
      throw new ApiError('TURN_IN_PROGRESS', 'A turn is still being processed.');
    }
    let aiAllowed = s.studentTurns > 0;
    if (aiAllowed) {
      try {
        const q = await reserveAiCall(deps, tx, tenant, m.uid, s.courseId, courseBudget);
        q.commit();
      } catch (e) {
        if (e instanceof ApiError && (e.code === 'QUOTA_EXCEEDED' || e.code === 'BUDGET_EXCEEDED')) aiAllowed = false;
        else throw e;
      }
    }
    const activeMs = s.activeMs + (s.resumedAt ? Math.max(0, now.getTime() - new Date(s.resumedAt).getTime()) : 0);
    tx.update(sessionRef, { status: 'assessing', resumedAt: null, activeMs, pendingSince: now.toISOString() });
    return { session: { ...s, activeMs }, aiAllowed } as const;
  });
  if ('done' in claim) return claim.done!;
  const s = claim.session;

  try {
    // ---- Phase B: compute ----
    const turns = await listTurns(deps, m.tenantId, sessionId);
    const missionCompleted = s.state.allStagesDone;
    const rubric = mission.rubric;
    const criteria = {} as Record<Criterion, CriterionResult>;
    criteria.taskCompletion = taskCompletionScore(mission, s.state, s.hintsUsed);
    criteria.fluency = fluencyScore(rubric.fluency, s.voiceTurns, s.speech);

    let ai: AiAssessmentOutput | null = null;
    let aiStatus: AssessmentDoc['aiStatus'] = 'skipped';
    const model = deps.config.geminiModel ?? tenant.aiConfig.assessmentModel;
    if (claim.aiAllowed) {
      const started = Date.now();
      try {
        const r = await withRetry(
          () =>
            deps.ai.assess({
              mission,
              level: mission.level,
              transcript: turns
                .filter((t) => t.speaker !== 'system')
                .map((t) => ({ seq: t.seq, speaker: t.speaker as 'npc' | 'student', text: t.text, mode: t.mode })),
              objectivesSummary: objectivesSummary(mission, s),
              model,
              maxOutputTokens: tenant.quotas.maxOutputTokens,
            }),
          { retries: deps.config.aiMaxRetries, timeoutMs: Math.max(deps.config.aiTimeoutMs, 30_000) },
        );
        ai = r.output;
        aiStatus = 'ok';
        void recordUsage(deps, tenant, { kind: 'assess', uid: m.uid, sessionId, courseId: s.courseId, model, ...r.usage, ok: true, latencyMs: Date.now() - started });
      } catch (e) {
        console.error('AI assessment failed', e);
        aiStatus = 'failed';
        void recordUsage(deps, tenant, { kind: 'assess', uid: m.uid, sessionId, courseId: s.courseId, model, ok: false, latencyMs: Date.now() - started });
      }
    }
    for (const k of ['comprehension', 'grammar', 'vocabulary'] as const) {
      const max = rubric[k];
      criteria[k] = ai
        ? { max, score: clampScore(ai[k].score, max), status: 'assessed', source: 'ai', comment: ai[k].comment }
        : {
            max,
            score: null,
            status: 'not_assessed',
            source: 'ai',
            comment: s.studentTurns === 0 ? 'Not assessed: no student turns.' : 'Not assessed: AI assessment unavailable. Your teacher can review this session.',
          };
    }

    const { total, maxAssessed, percent } = totals(criteria);
    const evidenceMode: AssessmentDoc['evidenceMode'] = s.voiceTurns && s.textTurns ? 'mixed' : s.voiceTurns ? 'voice' : 'text';

    // ---- Phase C: commit assessment + session + player profile ----
    return await deps.db.runTransaction(async (tx) => {
      const userRef = p.user(m.tenantId, m.uid);
      const [aSnap, uSnap] = await Promise.all([tx.get(assessmentRef), tx.get(userRef)]);
      if (aSnap.exists) return aSnap.data() as AssessmentDoc;
      const user = uSnap.data() as UserDoc | undefined;
      const completedIds = new Set(user?.completedMissionIds ?? []);
      if (missionCompleted) completedIds.add(mission.id);
      const history = {
        completedMissionIds: [...completedIds],
        voiceSessions: (user?.voiceSessions ?? 0) + (s.voiceTurns > 0 ? 1 : 0),
        bestPercentByMission: user?.bestPercent ?? {},
      };
      const allMissions = await listApprovedMissions(deps, m.tenantId);
      const xp = xpForSession(mission, missionCompleted, percent);
      const newAchievements = computeAchievements(allMissions, history, user?.achievements ?? [], missionCompleted ? percent : 0);
      const recommendation = recommendNext(allMissions, mission, missionCompleted, percent, history);
      const now = deps.now().toISOString();
      const doc: AssessmentDoc = {
        id: sessionId,
        tenantId: m.tenantId,
        uid: m.uid,
        sessionId,
        missionId: mission.id,
        missionVersion: s.missionVersion,
        level: mission.level,
        courseId: s.courseId,
        missionCompleted,
        objectivesMet: metRequiredCount(mission, s.state),
        objectivesRequired: requiredObjectiveCount(mission),
        evidenceMode,
        criteria,
        total,
        maxAssessed,
        percent,
        aiStatus,
        feedback: ai
          ? {
              strengths: ai.strengths,
              improvements: ai.improvements,
              grammarCorrections: ai.grammarCorrections,
              vocabularyToReview: ai.vocabularyToReview,
              listeningTips: ai.listeningTips,
              nextPractice: ai.nextPractice,
              ...(ai.pronunciationNote ? { pronunciationNote: ai.pronunciationNote } : {}),
            }
          : null,
        recommendation,
        xpAwarded: xp,
        newAchievements,
        versions: { rubric: RUBRIC_VERSION, prompt: PROMPT_VERSION, model: aiStatus === 'ok' ? `${deps.ai.name}:${model}` : 'none', mission: s.missionVersion },
        teacherReview: null,
        finalPercent: percent,
        disclaimer: ASSESSMENT_DISCLAIMER,
        createdAt: now,
      };
      tx.create(assessmentRef, doc);
      tx.update(sessionRef, { status: 'completed', completedAt: now, pendingSince: null, pendingTurnId: null });
      if (user) {
        const best = Math.max(user.bestPercent?.[mission.id] ?? 0, percent);
        tx.update(userRef, {
          xp: (user.xp ?? 0) + xp,
          missionsCompleted: (user.missionsCompleted ?? 0) + (missionCompleted ? 1 : 0),
          completedMissionIds: history.completedMissionIds,
          voiceSessions: history.voiceSessions,
          bestPercent: { ...(user.bestPercent ?? {}), [mission.id]: best },
          achievements: [...(user.achievements ?? []), ...newAchievements],
          // Move the student to B2 when recommended.
          level: recommendation.nextLevel === 'B2' && user.level === 'B1' ? 'B2' : user.level,
        });
      }
      return doc;
    });
  } catch (e) {
    // Release the lock so the student can retry.
    await sessionRef.update({ status: s.state.allStagesDone ? 'ready_to_complete' : 'paused', pendingSince: null }).catch(() => undefined);
    throw e;
  }
}

function objectivesSummary(mission: MissionContent, s: SessionDoc): string {
  return allObjectives(mission)
    .map((o) => `- ${o.description}: ${s.state.objectivesMet[o.id] ? `MET (turn ${s.state.objectivesMet[o.id]!.turnSeq})` : 'not met'}${o.required ? '' : ' (optional)'}`)
    .join('\n');
}

/** Results for the student (own) or a teacher/admin allowed to view the student. */
export async function getResults(deps: Deps, m: Member, sessionId: string) {
  const p = paths(deps.db);
  const s = (await p.session(m.tenantId, sessionId).get()).data() as SessionDoc | undefined;
  if (!s) throw notFound('Session');
  if (!(await canViewStudent(deps, m, s.uid))) throw forbidden();
  const a = (await p.assessment(m.tenantId, sessionId).get()).data() as AssessmentDoc | undefined;
  if (!a) throw new ApiError('NOT_FOUND', 'Results are not available yet. Finish the mission first.');
  const mission = await getMissionVersion(deps, m.tenantId, s.missionId, s.missionVersion);
  const turns = (await listTurns(deps, m.tenantId, sessionId)).map((t) => ({
    ...publicTurn(t),
    hasAudio: Boolean(t.audioPath),
    objectivesCredited: t.objectivesCredited ?? [],
  }));
  const reviewed = applyTeacherReview(a.criteria, a.teacherReview);
  return {
    assessment: { ...a, criteria: reviewed.criteria, aiCriteria: a.criteria },
    turns,
    mission: { id: mission.id, title: mission.title, level: mission.level, locationId: mission.locationId, objectives: allObjectives(mission).map((o) => ({ id: o.id, label: o.label, required: o.required, met: Boolean(s.state.objectivesMet[o.id]) })) },
    session: { id: s.id, uid: s.uid, startedAt: s.startedAt, completedAt: s.completedAt, studentTurns: s.studentTurns, voiceTurns: s.voiceTurns, textTurns: s.textTurns, hintsUsed: s.hintsUsed, replaysUsed: s.replaysUsed, activeSeconds: Math.round(s.activeMs / 1000) },
  };
}

export async function reviewAssessment(
  deps: Deps,
  m: Member,
  sessionId: string,
  input: { scores: Partial<Record<Criterion, number>>; comment: string },
) {
  const p = paths(deps.db);
  const ref = p.assessment(m.tenantId, sessionId);
  const a = (await ref.get()).data() as AssessmentDoc | undefined;
  if (!a) throw notFound('Assessment');
  if (m.role !== 'teacher' && m.role !== 'school_admin') throw forbidden();
  if (!(await canViewStudent(deps, m, a.uid)) || a.uid === m.uid) throw forbidden('You cannot review this student');
  const changed = Object.entries(input.scores).some(([k, v]) => a.criteria[k as Criterion]?.score !== v);
  const review: TeacherReview = {
    reviewerUid: m.uid,
    reviewerName: m.name,
    scores: input.scores,
    comment: input.comment,
    status: changed ? 'adjusted' : 'confirmed',
    reviewedAt: deps.now().toISOString(),
  };
  const { percent } = applyTeacherReview(a.criteria, review);
  await ref.update({ teacherReview: review, finalPercent: percent });
  return { ...a, teacherReview: review, finalPercent: percent };
}
