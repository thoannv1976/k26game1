import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { applyTeacherReview, type AssessmentDoc, type CourseDoc, type SessionDoc, type UserDoc } from '@ecs/shared';
import { parseBody } from '../app.js';
import { requireTenantMember } from '../auth.js';
import type { Deps } from '../deps.js';
import { notFound } from '../errors.js';
import { paths } from '../paths.js';
import { listApprovedMissions } from '../tenants.js';
import { assessmentsForStudents, usersByIds } from './teacher.js';
import { authenticateService, isServiceRequest } from '../serviceAuth.js';

/**
 * Integration API for LMS-AI9 and the AI English Learning Portfolio (v1).
 * Authentication: Firebase ID token of a school_admin (or a dedicated integration account
 * with the school_admin role). LTI 1.3 / SSO will be added in a later phase.
 */
/** Common K26 learning-evidence format (shared with English Detective and VSTEP Quest). */
export const EVIDENCE_SCHEMA_VERSION = 'k26-evidence-1.0';

function evidence(a: AssessmentDoc, user: UserDoc | undefined, title: string, s?: SessionDoc) {
  const reviewed = applyTeacherReview(a.criteria, a.teacherReview);
  return {
    schema: EVIDENCE_SCHEMA_VERSION,
    evidenceId: `ecs:${a.tenantId}:${a.sessionId}`,
    source: 'english-city-simulator',
    tenantId: a.tenantId,
    learner: { uid: a.uid, email: user?.email ?? null, studentCode: user?.studentCode ?? null, name: user?.displayName ?? null },
    courseId: a.courseId,
    activity: { type: 'speaking_mission', id: a.missionId, version: a.missionVersion, title, level: a.level },
    skills: a.evidenceMode === 'text' ? ['listening'] : ['listening', 'speaking'],
    result: {
      completed: a.missionCompleted,
      aiPercent: a.percent,
      finalPercent: a.finalPercent,
      scoreType: a.teacherReview ? 'teacher_validated' : 'ai_practice',
      criteria: Object.fromEntries(Object.entries(reviewed.criteria).map(([k, v]) => [k, { score: v.score, max: v.max, status: v.status, source: v.source }])),
      // Game-specific details
      objectivesMet: a.objectivesMet,
      objectivesRequired: a.objectivesRequired,
      evidenceMode: a.evidenceMode,
      speakingEvidence: a.evidenceMode !== 'text',
    },
    feedback: a.feedback ? { strengths: a.feedback.strengths, improvements: a.feedback.improvements, nextPractice: a.feedback.nextPractice } : null,
    timestamps: { startedAt: s?.startedAt ?? null, completedAt: a.createdAt, reviewedAt: a.teacherReview?.reviewedAt ?? null },
    versions: a.versions,
    disclaimer: a.disclaimer,
  };
}

export async function lmsRoutes(app: FastifyInstance, deps: Deps) {
  const p = paths(deps.db);

  app.get('/api/lms/v1/results', async (req) => {
    const m = requireTenantMember(req.authUser, ['school_admin']);
    const q = parseBody(z.object({ courseId: z.string().optional(), since: z.iso.datetime().optional(), limit: z.coerce.number().int().min(1).max(1000).default(500) }), req.query);
    let list: AssessmentDoc[];
    if (q.courseId) {
      const c = (await p.course(m.tenantId, q.courseId).get()).data() as CourseDoc | undefined;
      if (!c) throw notFound('Course');
      list = await assessmentsForStudents(deps, m.tenantId, c.studentIds);
    } else {
      let query = p.assessments(m.tenantId).orderBy('createdAt', 'desc');
      if (q.since) query = query.where('createdAt', '>', q.since);
      list = (await query.limit(q.limit).get()).docs.map((d) => d.data() as AssessmentDoc);
    }
    if (q.since) list = list.filter((a) => a.createdAt > q.since!);
    list = list.slice(0, q.limit);
    const [users, missions] = await Promise.all([usersByIds(deps, m.tenantId, [...new Set(list.map((a) => a.uid))]), listApprovedMissions(deps, m.tenantId)]);
    return {
      schema: EVIDENCE_SCHEMA_VERSION,
      count: list.length,
      items: list.map((a) => evidence(a, users.find((u) => u.uid === a.uid), missions.find((x) => x.id === a.missionId)?.title.en ?? a.missionId)),
    };
  });

  app.get('/api/lms/v1/evidence/:sessionId', async (req) => {
    const m = requireTenantMember(req.authUser, ['school_admin']);
    const id = (req.params as { sessionId: string }).sessionId;
    const a = (await p.assessment(m.tenantId, id).get()).data() as AssessmentDoc | undefined;
    if (!a) throw notFound('Evidence');
    const [s, users, missions] = await Promise.all([p.session(m.tenantId, id).get(), usersByIds(deps, m.tenantId, [a.uid]), listApprovedMissions(deps, m.tenantId)]);
    return evidence(a, users[0], missions.find((x) => x.id === a.missionId)?.title.en ?? a.missionId, s.data() as SessionDoc | undefined);
  });

  /**
   * One learner's evidence, newest first. Callers: a school admin (Firebase token) or, for the K26 four-skill
   * profile (VSTEP Quest), an allowed service account with X-K26-Tenant (read-only).
   */
  app.get('/api/lms/v1/learners/:uid/evidence', async (req) => {
    const { uid } = req.params as { uid: string };
    const q = parseBody(z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }), req.query);
    let tenantId: string;
    if (isServiceRequest(req)) {
      const s = await authenticateService(deps, req);
      if (!(await p.tenant(s.tenantId).get()).exists) throw notFound('School');
      tenantId = s.tenantId;
      req.log.info({ caller: s.email, tenantId, uid }, 'lms.service_evidence_read');
    } else {
      tenantId = requireTenantMember(req.authUser, ['school_admin']).tenantId;
    }
    const snap = await p.assessments(tenantId).where('uid', '==', uid).limit(300).get();
    const list = snap.docs.map((d) => d.data() as AssessmentDoc).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, q.limit);
    const [users, missions] = await Promise.all([usersByIds(deps, tenantId, [uid]), listApprovedMissions(deps, tenantId)]);
    return { schema: EVIDENCE_SCHEMA_VERSION, count: list.length, items: list.map((a) => evidence(a, users[0], missions.find((x) => x.id === a.missionId)?.title.en ?? a.missionId)) };
  });
}
