import {
  applyEvidence,
  currentStage,
  initialState,
  toSessionView,
  type AiTurnOutput,
  type MissionContent,
  type SessionDoc,
  type TenantDoc,
  type TurnDoc,
  type TurnMode,
  type TurnResponse,
  type AssignmentDoc,
  type CourseDoc,
  type AiConfig,
} from '@ecs/shared';
import { randomUUID } from 'node:crypto';
import type { Member } from '../auth.js';
import type { Deps } from '../deps.js';
import { ApiError, forbidden, notFound } from '../errors.js';
import { isInappropriate } from '../moderation.js';
import { paths } from '../paths.js';
import { recordUsage, reserveAiCall, reserveAttempt } from '../quota.js';
import { parseWav, rmsLevel } from '../speech/wav.js';
import { cachedTts, type Voice } from '../speech/tts.js';
import { getMissionVersion, getApprovedMission, getTenant, publicMission } from '../tenants.js';
import { canViewStudent } from './access.js';
import { withRetry } from './retry.js';

const ACTIVE_STATUSES = ['active', 'paused', 'ready_to_complete'] as const;
const PENDING_STALE_MS = 90_000;
const MIN_STT_CONFIDENCE = 0.35;

export interface PublicTurn {
  id: string;
  seq: number;
  speaker: TurnDoc['speaker'];
  text: string;
  mode: TurnMode;
  stageId: string;
  ttsHash: string | null;
  fallback: boolean;
  createdAt: string;
}

export function publicTurn(t: TurnDoc): PublicTurn {
  return {
    id: t.id,
    seq: t.seq,
    speaker: t.speaker,
    text: t.text,
    mode: t.mode,
    stageId: t.stageId,
    ttsHash: t.ttsHash ?? null,
    fallback: Boolean(t.fallback),
    createdAt: t.createdAt,
  };
}

const DEFAULT_VOICES = {
  'en-GB': { female: 'en-GB-Neural2-A', male: 'en-GB-Neural2-B' },
  'en-US': { female: 'en-US-Neural2-F', male: 'en-US-Neural2-D' },
} as const;
const MALE = new Set(['en-GB-Neural2-B', 'en-GB-Neural2-D', 'en-US-Neural2-A', 'en-US-Neural2-D', 'en-US-Neural2-I', 'en-US-Neural2-J']);

export function voiceFor(mission: MissionContent, ai: AiConfig): Voice {
  const v = mission.npc.voice;
  if (ai.defaultAccent === 'mission' || ai.defaultAccent === v.languageCode) return v;
  const gender = MALE.has(v.name) ? 'male' : 'female';
  return { languageCode: ai.defaultAccent, name: DEFAULT_VOICES[ai.defaultAccent][gender] };
}

export const speakingRate = (m: MissionContent) => (m.level === 'B1' ? 0.92 : 1.0);

function viewOpts(tenant: TenantDoc, quotaWarning = false) {
  return { maxSessionMinutes: tenant.quotas.maxSessionMinutes, maxRecordSeconds: tenant.quotas.maxRecordSeconds, quotaWarning };
}

async function loadOwnSession(deps: Deps, m: Member, sessionId: string): Promise<SessionDoc> {
  const snap = await paths(deps.db).session(m.tenantId, sessionId).get();
  const s = snap.data() as SessionDoc | undefined;
  if (!s) throw notFound('Session');
  if (s.uid !== m.uid) throw forbidden('This is not your session');
  return s;
}

export async function listTurns(deps: Deps, tenantId: string, sessionId: string): Promise<TurnDoc[]> {
  const snap = await paths(deps.db).turns(tenantId, sessionId).orderBy('seq').get();
  return snap.docs.map((d) => d.data() as TurnDoc).filter((t) => t.status !== 'processing' && t.status !== 'failed');
}

async function ttsSafe(deps: Deps, tenant: TenantDoc, mission: MissionContent, text: string, uid: string, sessionId: string, courseId: string | null) {
  try {
    const r = await cachedTts(deps.tts, deps.blobs, text, voiceFor(mission, tenant.aiConfig), speakingRate(mission));
    if (r.chars > 0) {
      void recordUsage(deps, tenant, { kind: 'tts', uid, sessionId, courseId, ttsChars: r.chars, ok: true });
    }
    return r.hash;
  } catch (e) {
    console.error('TTS failed', e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Start / resume                                                      */
/* ------------------------------------------------------------------ */

export async function startSession(deps: Deps, m: Member, input: { missionId: string; assignmentId?: string; restart?: boolean }) {
  const p = paths(deps.db);
  const tenant = await getTenant(deps, m.tenantId);
  const mission = await getApprovedMission(deps, m.tenantId, input.missionId);
  const missionDoc = (await p.mission(m.tenantId, mission.id).get()).data() as { approvedVersion: number };

  // Resume an unfinished session for the same mission unless a restart is requested.
  const existing = await p
    .sessions(m.tenantId)
    .where('uid', '==', m.uid)
    .where('missionId', '==', mission.id)
    .where('status', 'in', [...ACTIVE_STATUSES])
    .limit(5)
    .get();
  if (!existing.empty && !input.restart) {
    const s = existing.docs[0]!.data() as SessionDoc;
    const sMission = await getMissionVersion(deps, m.tenantId, s.missionId, s.missionVersion);
    return {
      resumed: true,
      session: toSessionView(s, sMission, viewOpts(tenant), deps.now()),
      turns: (await listTurns(deps, m.tenantId, s.id)).map(publicTurn),
      mission: publicMission(sMission),
    };
  }

  let courseId: string | null = null;
  let assignmentId: string | null = null;
  if (input.assignmentId) {
    const a = (await p.assignments(m.tenantId).doc(input.assignmentId).get()).data() as AssignmentDoc | undefined;
    if (!a || a.missionId !== mission.id) throw notFound('Assignment');
    const c = (await p.course(m.tenantId, a.courseId).get()).data() as CourseDoc | undefined;
    if (!c || !c.studentIds.includes(m.uid)) throw forbidden('You are not in this course');
    courseId = a.courseId;
    assignmentId = a.id;
  }

  const now = deps.now();
  const sessionId = randomUUID();
  const openingHash = await ttsSafe(deps, tenant, mission, mission.npc.openingLine, m.uid, sessionId, courseId);
  const firstStage = mission.stages[0]!;
  const session: SessionDoc = {
    id: sessionId,
    tenantId: m.tenantId,
    uid: m.uid,
    missionId: mission.id,
    missionVersion: missionDoc.approvedVersion,
    level: mission.level,
    courseId,
    assignmentId,
    status: 'active',
    state: initialState(),
    turnSeq: 1,
    studentTurns: 0,
    voiceTurns: 0,
    textTurns: 0,
    hintsUsed: 0,
    replaysUsed: 0,
    speech: { words: 0, speechSeconds: 0, longPauses: 0, confidence: 0 },
    activeMs: 0,
    resumedAt: now.toISOString(),
    startedAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    completedAt: null,
    pendingTurnId: null,
    pendingSince: null,
    lastNpcLine: mission.npc.openingLine,
    lastNpcTtsHash: openingHash,
  };
  const opening: TurnDoc = {
    id: 'opening',
    seq: 1,
    speaker: 'npc',
    text: mission.npc.openingLine,
    mode: 'scripted',
    stageId: firstStage.id,
    createdAt: now.toISOString(),
    ttsHash: openingHash,
    fallback: false,
  };

  await deps.db.runTransaction(async (tx) => {
    const commitAttempt = await reserveAttempt(deps, tx, tenant, m.uid, mission.id);
    // Close previous unfinished sessions of this mission when restarting.
    for (const d of existing.docs) tx.update(d.ref, { status: 'expired', resumedAt: null, lastActivityAt: now.toISOString() });
    commitAttempt();
    tx.create(p.session(m.tenantId, sessionId), session);
    tx.create(p.turn(m.tenantId, sessionId, opening.id), opening);
  });

  return {
    resumed: false,
    session: toSessionView(session, mission, viewOpts(tenant), now),
    turns: [publicTurn(opening)],
    mission: publicMission(mission),
  };
}

export async function getSession(deps: Deps, m: Member, sessionId: string) {
  const snap = await paths(deps.db).session(m.tenantId, sessionId).get();
  const s = snap.data() as SessionDoc | undefined;
  if (!s) throw notFound('Session');
  if (s.uid !== m.uid && !(await canViewStudent(deps, m, s.uid))) throw forbidden();
  const tenant = await getTenant(deps, m.tenantId);
  const mission = await getMissionVersion(deps, m.tenantId, s.missionId, s.missionVersion);
  return {
    session: toSessionView(s, mission, viewOpts(tenant), deps.now()),
    turns: (await listTurns(deps, m.tenantId, s.id)).map(publicTurn),
    mission: publicMission(mission),
  };
}

/* ------------------------------------------------------------------ */
/* Turns                                                               */
/* ------------------------------------------------------------------ */

export type TurnInput = { clientTurnId: string; text: string; audio?: undefined } | { clientTurnId: string; audio: Buffer; text?: undefined };

function checkPlayable(s: SessionDoc, mission: MissionContent, tenant: TenantDoc, now: Date) {
  if (s.status === 'paused') throw new ApiError('SESSION_NOT_ACTIVE', 'The session is paused. Resume it first.');
  if (s.status === 'ready_to_complete') throw new ApiError('SESSION_NOT_ACTIVE', 'All objectives are done. Finish the mission to see your results.');
  if (s.status !== 'active') throw new ApiError('SESSION_NOT_ACTIVE', `Session is ${s.status}`);
  if (s.studentTurns >= mission.limits.maxTurns) throw new ApiError('TURN_LIMIT', 'Turn limit reached. Finish the mission to see your results.');
  const v = toSessionView(s, mission, viewOpts(tenant), now);
  if (v.elapsedSeconds >= v.maxSeconds) throw new ApiError('TIME_LIMIT', 'Time is up. Finish the mission to see your results.');
}

export async function processTurn(deps: Deps, m: Member, sessionId: string, input: TurnInput): Promise<TurnResponse> {
  const p = paths(deps.db);
  const tenant = await getTenant(deps, m.tenantId);
  const s0 = await loadOwnSession(deps, m, sessionId);
  const mission = await getMissionVersion(deps, m.tenantId, s0.missionId, s0.missionVersion);
  const turnRef = p.turn(m.tenantId, sessionId, input.clientTurnId);
  const sessionRef = p.session(m.tenantId, sessionId);
  const courseBudget = s0.courseId ? (((await p.course(m.tenantId, s0.courseId).get()).data() as CourseDoc | undefined)?.monthlyBudgetUsd ?? null) : null;

  // ---- Phase A: claim the turn (idempotency + concurrency + limits + quota) ----
  const claim = await deps.db.runTransaction(async (tx) => {
    const [sSnap, tSnap] = await Promise.all([tx.get(sessionRef), tx.get(turnRef)]);
    const s = sSnap.data() as SessionDoc;
    const existing = tSnap.data() as TurnDoc | undefined;
    if (existing?.status === 'done' && existing.response) return { replay: existing.response } as const;
    if (existing?.status === 'processing') throw new ApiError('TURN_IN_PROGRESS', 'This turn is already being processed.');
    const now = deps.now();
    if (s.pendingTurnId && s.pendingTurnId !== input.clientTurnId && s.pendingSince && now.getTime() - new Date(s.pendingSince).getTime() < PENDING_STALE_MS) {
      throw new ApiError('TURN_IN_PROGRESS', 'Another turn is being processed. Please wait.');
    }
    checkPlayable(s, mission, tenant, now);
    const quota = await reserveAiCall(deps, tx, tenant, m.uid, s.courseId, courseBudget);
    quota.commit();
    tx.set(turnRef, {
      id: input.clientTurnId,
      seq: -1,
      speaker: 'student',
      text: '',
      mode: input.audio ? 'voice' : 'text',
      stageId: currentStage(mission, s.state).id,
      createdAt: now.toISOString(),
      status: 'processing',
      response: null,
    } satisfies TurnDoc);
    tx.update(sessionRef, { pendingTurnId: input.clientTurnId, pendingSince: now.toISOString() });
    return { session: s, warning: quota.check.warning } as const;
  });
  if ('replay' in claim) return claim.replay!;
  const s = claim.session;

  const release = async (reason: string) => {
    await deps.db.runTransaction(async (tx) => {
      const cur = (await tx.get(sessionRef)).data() as SessionDoc;
      tx.set(turnRef, { status: 'failed', failReason: reason }, { merge: true });
      if (cur.pendingTurnId === input.clientTurnId) tx.update(sessionRef, { pendingTurnId: null, pendingSince: null });
    });
  };

  try {
    // ---- Phase B: speech-to-text, moderation, AI, engine, TTS (no locks held) ----
    let studentText: string;
    let mode: TurnMode;
    let speech = null as TurnDoc['speech'];
    let audioPath: string | null = null;
    const stage = currentStage(mission, s.state);

    if (input.audio) {
      mode = 'voice';
      let wav;
      try {
        wav = parseWav(input.audio);
      } catch (e) {
        throw new ApiError('VALIDATION', `Invalid audio: ${(e as Error).message}`);
      }
      const maxRec = Math.min(mission.limits.maxRecordSeconds, tenant.quotas.maxRecordSeconds);
      if (wav.durationSeconds > maxRec + 1) throw new ApiError('AUDIO_TOO_LONG', `Recording longer than ${maxRec}s.`);
      if (wav.durationSeconds < 0.3 || rmsLevel(wav.pcm) < 0.003) throw new ApiError('AUDIO_UNCLEAR', 'We could not hear you. Please try again closer to the microphone.');
      const sampleIdx = Math.max(0, s.studentTurns - stagesBefore(mission, s.state.stageIndex));
      const stt = await withRetry(
        () =>
          deps.stt.recognize(wav, {
            scriptedLine: stage.sampleStudentLines[sampleIdx % stage.sampleStudentLines.length],
            phraseHints: [...mission.targetVocabulary, ...mission.studentCard.map((c) => c.value)],
          }),
        { retries: 1, timeoutMs: 20_000 },
      );
      void recordUsage(deps, tenant, { kind: 'stt', uid: m.uid, sessionId, courseId: s.courseId, sttSeconds: stt.billedSeconds, ok: true });
      if (!stt.transcript || stt.confidence < MIN_STT_CONFIDENCE) {
        throw new ApiError('AUDIO_UNCLEAR', 'The audio was not clear enough. Please speak again.', { transcript: stt.transcript, confidence: stt.confidence });
      }
      studentText = stt.transcript.slice(0, 600);
      speech = stt.metrics;
      if (tenant.aiConfig.audioRetentionDays > 0) {
        audioPath = `tenants/${m.tenantId}/sessions/${sessionId}/${input.clientTurnId}.wav`;
        try {
          await deps.blobs.put(audioPath, input.audio, 'audio/wav');
        } catch (e) {
          console.error('audio store failed', e);
          audioPath = null;
        }
      }
    } else {
      mode = 'text';
      studentText = input.text;
    }

    if (isInappropriate(studentText)) {
      throw new ApiError('CONTENT_BLOCKED', 'Please keep the conversation appropriate for a classroom.');
    }

    const history = (await listTurns(deps, m.tenantId, sessionId))
      .slice(-tenant.aiConfig.historyTurns)
      .map((t) => ({ speaker: t.speaker, text: t.text }));

    let output: AiTurnOutput | null = null;
    const started = Date.now();
    try {
      const model = deps.config.geminiModel ?? tenant.aiConfig.model;
      const r = await withRetry(
        () =>
          deps.ai.converse({
            mission,
            state: s.state,
            level: mission.level,
            history,
            studentText,
            model,
            temperature: tenant.aiConfig.temperature,
            maxOutputTokens: tenant.quotas.maxOutputTokens,
          }),
        { retries: deps.config.aiMaxRetries, timeoutMs: deps.config.aiTimeoutMs },
      );
      output = r.output;
      void recordUsage(deps, tenant, { kind: 'converse', uid: m.uid, sessionId, courseId: s.courseId, model, ...r.usage, ok: true, latencyMs: Date.now() - started });
      if (output.inappropriate || isInappropriate(output.npcReply)) output = { ...output, npcReply: stage.fallbackLine, objectivesEvidence: [] };
    } catch (e) {
      console.error('AI converse failed – using scripted fallback', e);
      void recordUsage(deps, tenant, { kind: 'converse', uid: m.uid, sessionId, courseId: s.courseId, ok: false, latencyMs: Date.now() - started });
      output = null;
    }

    const studentSeq = s.turnSeq + 1;
    const applied = output
      ? applyEvidence(mission, s.state, studentText, output.objectivesEvidence, studentSeq)
      : { state: s.state, credited: [], rejected: [], stageChanged: false, enteredStages: [], completedNow: false };
    const fallback = !output;
    let npcText: string;
    if (output) {
      npcText = output.npcReply.trim();
      if (applied.completedNow && npcText.length < 3) npcText = mission.npc.closingLine;
    } else {
      // AI unavailable: re-prompt the current stage without changing progress.
      npcText = `Sorry, could you repeat that, please? ${stage.fallbackLine}`;
    }
    const npcHash = await ttsSafe(deps, tenant, mission, npcText, m.uid, sessionId, s.courseId);

    // ---- Phase C: commit atomically ----
    return await deps.db.runTransaction(async (tx) => {
      const cur = (await tx.get(sessionRef)).data() as SessionDoc;
      if (cur.pendingTurnId !== input.clientTurnId || cur.turnSeq !== s.turnSeq) {
        throw new ApiError('CONFLICT', 'Session changed while processing this turn. Please retry.');
      }
      const now = deps.now().toISOString();
      const npcSeq = studentSeq + 1;
      const next: SessionDoc = {
        ...cur,
        state: applied.state,
        status: applied.state.allStagesDone ? 'ready_to_complete' : cur.status,
        turnSeq: npcSeq,
        studentTurns: cur.studentTurns + 1,
        voiceTurns: cur.voiceTurns + (mode === 'voice' ? 1 : 0),
        textTurns: cur.textTurns + (mode === 'text' ? 1 : 0),
        speech: speech
          ? {
              words: cur.speech.words + speech.words,
              speechSeconds: cur.speech.speechSeconds + speech.speechSeconds,
              longPauses: cur.speech.longPauses + speech.longPauses,
              confidence: cur.voiceTurns ? (cur.speech.confidence * cur.voiceTurns + speech.confidence) / (cur.voiceTurns + 1) : speech.confidence,
            }
          : cur.speech,
        lastActivityAt: now,
        pendingTurnId: null,
        pendingSince: null,
        lastNpcLine: npcText,
        lastNpcTtsHash: npcHash,
      };
      if (next.status === 'ready_to_complete' && cur.resumedAt) {
        next.activeMs = cur.activeMs + Math.max(0, deps.now().getTime() - new Date(cur.resumedAt).getTime());
        next.resumedAt = null;
      }
      const response: TurnResponse = {
        clientTurnId: input.clientTurnId,
        studentText,
        mode,
        npcText,
        ttsHash: npcHash,
        fallback,
        needsClarification: Boolean(output?.needsClarification),
        objectivesCredited: applied.credited,
        stageChanged: applied.stageChanged,
        session: toSessionView(next, mission, viewOpts(tenant, claim.warning), deps.now()),
      };
      tx.set(turnRef, {
        id: input.clientTurnId,
        seq: studentSeq,
        speaker: 'student',
        text: studentText,
        mode,
        stageId: stage.id,
        createdAt: now,
        audioPath,
        speech,
        objectivesCredited: applied.credited,
        status: 'done',
        response,
      } satisfies TurnDoc);
      tx.create(p.turn(m.tenantId, sessionId, `${input.clientTurnId}_npc`), {
        id: `${input.clientTurnId}_npc`,
        seq: npcSeq,
        speaker: 'npc',
        text: npcText,
        mode: fallback ? 'scripted' : 'voice',
        stageId: currentStage(mission, applied.state).id,
        createdAt: now,
        ttsHash: npcHash,
        fallback,
      } satisfies TurnDoc);
      tx.set(sessionRef, next);
      return response;
    });
  } catch (e) {
    await release(e instanceof ApiError ? e.code : 'INTERNAL').catch(() => undefined);
    throw e;
  }
}

/** Number of student turns that can be attributed to earlier stages (for the offline STT script). */
function stagesBefore(mission: MissionContent, stageIndex: number): number {
  return mission.stages.slice(0, stageIndex).reduce((n, st) => n + st.sampleStudentLines.length, 0);
}

/* ------------------------------------------------------------------ */
/* Hints, replays, pause/resume                                        */
/* ------------------------------------------------------------------ */

export async function useHint(deps: Deps, m: Member, sessionId: string) {
  const p = paths(deps.db);
  const tenant = await getTenant(deps, m.tenantId);
  const s0 = await loadOwnSession(deps, m, sessionId);
  const mission = await getMissionVersion(deps, m.tenantId, s0.missionId, s0.missionVersion);
  return deps.db.runTransaction(async (tx) => {
    const ref = p.session(m.tenantId, sessionId);
    const s = (await tx.get(ref)).data() as SessionDoc;
    if (s.status !== 'active') throw new ApiError('SESSION_NOT_ACTIVE', `Session is ${s.status}`);
    if (s.hintsUsed >= mission.limits.maxHints) throw new ApiError('HINT_LIMIT', 'No hints left for this mission.');
    const stage = currentStage(mission, s.state);
    const stageHintsUsed = Object.values(s.state.objectivesMet).length; // vary hints as progress changes
    const hint = stage.hints[(s.hintsUsed + stageHintsUsed) % stage.hints.length]!;
    const seq = s.turnSeq + 1;
    const now = deps.now().toISOString();
    tx.create(p.turn(m.tenantId, sessionId, `hint_${seq}`), {
      id: `hint_${seq}`,
      seq,
      speaker: 'system',
      text: `Hint: ${hint}`,
      mode: 'scripted',
      stageId: stage.id,
      createdAt: now,
    } satisfies TurnDoc);
    const next = { ...s, hintsUsed: s.hintsUsed + 1, turnSeq: seq, lastActivityAt: now };
    tx.set(ref, next);
    return { hint, session: toSessionView(next, mission, viewOpts(tenant), deps.now()) };
  });
}

export async function useReplay(deps: Deps, m: Member, sessionId: string, kind: 'replay' | 'repeat_request') {
  const p = paths(deps.db);
  const tenant = await getTenant(deps, m.tenantId);
  const s0 = await loadOwnSession(deps, m, sessionId);
  const mission = await getMissionVersion(deps, m.tenantId, s0.missionId, s0.missionVersion);
  return deps.db.runTransaction(async (tx) => {
    const ref = p.session(m.tenantId, sessionId);
    const s = (await tx.get(ref)).data() as SessionDoc;
    if (!['active', 'ready_to_complete'].includes(s.status)) throw new ApiError('SESSION_NOT_ACTIVE', `Session is ${s.status}`);
    if (s.replaysUsed >= mission.limits.maxReplays) throw new ApiError('REPLAY_LIMIT', 'No replays left for this mission.');
    const now = deps.now().toISOString();
    const next = { ...s, replaysUsed: s.replaysUsed + 1, lastActivityAt: now };
    if (kind === 'repeat_request') {
      const seq = s.turnSeq + 1;
      tx.create(p.turn(m.tenantId, sessionId, `repeat_${seq}`), {
        id: `repeat_${seq}`,
        seq,
        speaker: 'system',
        text: 'Student asked the NPC to repeat.',
        mode: 'scripted',
        stageId: currentStage(mission, s.state).id,
        createdAt: now,
      } satisfies TurnDoc);
      next.turnSeq = seq;
    }
    tx.set(ref, next);
    return { text: s.lastNpcLine, ttsHash: s.lastNpcTtsHash, session: toSessionView(next, mission, viewOpts(tenant), deps.now()) };
  });
}

export async function setPaused(deps: Deps, m: Member, sessionId: string, pause: boolean) {
  const p = paths(deps.db);
  const tenant = await getTenant(deps, m.tenantId);
  const s0 = await loadOwnSession(deps, m, sessionId);
  const mission = await getMissionVersion(deps, m.tenantId, s0.missionId, s0.missionVersion);
  return deps.db.runTransaction(async (tx) => {
    const ref = p.session(m.tenantId, sessionId);
    const s = (await tx.get(ref)).data() as SessionDoc;
    const now = deps.now();
    let next = s;
    if (pause && s.status === 'active') {
      next = {
        ...s,
        status: 'paused',
        activeMs: s.activeMs + (s.resumedAt ? Math.max(0, now.getTime() - new Date(s.resumedAt).getTime()) : 0),
        resumedAt: null,
        lastActivityAt: now.toISOString(),
      };
    } else if (!pause && s.status === 'paused') {
      next = { ...s, status: 'active', resumedAt: now.toISOString(), lastActivityAt: now.toISOString() };
    } else if (!['active', 'paused'].includes(s.status)) {
      throw new ApiError('SESSION_NOT_ACTIVE', `Session is ${s.status}`);
    }
    tx.set(ref, next);
    return { session: toSessionView(next, mission, viewOpts(tenant), now) };
  });
}
