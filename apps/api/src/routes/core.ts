import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  LOCATIONS,
  LevelSchema,
  StartSessionInputSchema,
  TextTurnInputSchema,
  type AssessmentDoc,
  type AssignmentDoc,
  type CourseDoc,
  type SessionDoc,
  type TenantDoc,
  type UserDoc,
} from '@ecs/shared';
import { parseBody } from '../app.js';
import { requireMember, requireTenantMember } from '../auth.js';
import type { Deps } from '../deps.js';
import { ApiError, notFound } from '../errors.js';
import { paths } from '../paths.js';
import { getTenant, getUserDoc, listApprovedMissions, publicMission } from '../tenants.js';
import { completeSession, getResults } from '../services/assessment.js';
import { syncGrade } from '../lti/gradeSync.js';
import { getSession, processTurn, setPaused, startSession, useHint, useReplay } from '../services/sessions.js';
import { newUserDoc } from '../services/users.js';
import { ttsPath } from '../speech/tts.js';

export async function coreRoutes(app: FastifyInstance, deps: Deps) {
  const p = paths(deps.db);

  /* ---------------- me ---------------- */
  app.get('/api/me', async (req) => {
    const u = req.authUser!;
    if (u.role === 'platform_admin') {
      return { user: { uid: u.uid, email: u.email, displayName: u.name, role: u.role, tenantId: null }, tenant: null };
    }
    if (!u.role || !u.tenantId) {
      // Self-provisioning for allowed school e-mail domains (e.g. Google sign-in).
      const domain = u.email.split('@')[1]?.toLowerCase();
      if (domain) {
        const t = await p.tenants().where('allowedEmailDomains', 'array-contains', domain).limit(1).get();
        const tenant = t.docs[0]?.data() as TenantDoc | undefined;
        if (tenant?.active) {
          await deps.auth.setCustomUserClaims(u.uid, { tenantId: tenant.id, role: 'student' });
          const ref = p.user(tenant.id, u.uid);
          if (!(await ref.get()).exists) await ref.set(newUserDoc(u.uid, tenant.id, { email: u.email, displayName: u.name, role: 'student' }, deps.now()));
          return { refreshToken: true, user: null, tenant: null };
        }
      }
      throw new ApiError('NOT_PROVISIONED', 'Your account has not been added to a school yet. Please contact your teacher.');
    }
    const m = requireTenantMember(u);
    const tenantSnap = await p.tenant(m.tenantId).get();
    if (!tenantSnap.exists) throw new ApiError('NOT_PROVISIONED', 'Your school has not been set up in English City Simulator yet. Please contact the school administrator.');
    const tenant = await getTenant(deps, m.tenantId);
    let user = await getUserDoc(deps, m.tenantId, m.uid);
    if (!user) {
      // Account created by another K26 game (e.g. English Detective) in the same Firebase project: create the profile on first visit.
      user = newUserDoc(m.uid, m.tenantId, { email: m.email, displayName: m.name, role: m.role as Exclude<UserDoc['role'], 'platform_admin'> }, deps.now());
      await p.user(m.tenantId, m.uid).set(user);
    }
    if (user.disabled) throw new ApiError('FORBIDDEN', 'This account is disabled');
    return { user, tenant: { id: tenant.id, name: tenant.name } };
  });

  app.patch('/api/me', async (req) => {
    const m = requireTenantMember(req.authUser);
    const body = parseBody(
      z.object({ locale: z.enum(['vi', 'en']).optional(), level: LevelSchema.optional(), recordingConsent: z.boolean().optional(), displayName: z.string().trim().min(1).max(120).optional() }),
      req.body,
    );
    const update: Partial<UserDoc> = {};
    if (body.locale) update.locale = body.locale;
    if (body.level) update.level = body.level;
    if (body.displayName) update.displayName = body.displayName;
    if (body.recordingConsent !== undefined) update.recordingConsentAt = body.recordingConsent ? deps.now().toISOString() : null;
    await p.user(m.tenantId, m.uid).update(update);
    return { user: await getUserDoc(deps, m.tenantId, m.uid) };
  });

  /* ---------------- world ---------------- */
  app.get('/api/locations', async (req) => {
    const m = requireTenantMember(req.authUser);
    const missions = await listApprovedMissions(deps, m.tenantId);
    return {
      locations: LOCATIONS.map((l) => ({ ...l, missionCount: missions.filter((x) => x.locationId === l.id).length })),
    };
  });

  app.get('/api/missions', async (req) => {
    const m = requireTenantMember(req.authUser);
    const q = parseBody(z.object({ locationId: z.string().optional(), level: LevelSchema.optional() }), req.query);
    const user = await getUserDoc(deps, m.tenantId, m.uid);
    const missions = (await listApprovedMissions(deps, m.tenantId)).filter(
      (x) => (!q.locationId || x.locationId === q.locationId) && (!q.level || x.level === q.level),
    );
    return {
      missions: missions.map((x) => ({
        ...publicMission(x),
        completed: Boolean(user?.completedMissionIds?.includes(x.id)),
        bestPercent: user?.bestPercent?.[x.id] ?? null,
      })),
    };
  });

  app.get('/api/missions/:id', async (req) => {
    const m = requireTenantMember(req.authUser);
    const { id } = req.params as { id: string };
    const mission = (await listApprovedMissions(deps, m.tenantId)).find((x) => x.id === id);
    if (!mission) throw notFound('Mission');
    const active = await p
      .sessions(m.tenantId)
      .where('uid', '==', m.uid)
      .where('missionId', '==', id)
      .where('status', 'in', ['active', 'paused', 'ready_to_complete'])
      .limit(1)
      .get();
    return { mission: publicMission(mission), activeSessionId: active.docs[0]?.id ?? null };
  });

  /* ---------------- sessions ---------------- */
  app.post('/api/sessions', async (req) => {
    const m = requireTenantMember(req.authUser);
    const body = parseBody(StartSessionInputSchema.extend({ restart: z.boolean().optional() }), req.body);
    return startSession(deps, m, body);
  });

  app.get('/api/sessions/:id', async (req) => {
    const m = requireTenantMember(req.authUser);
    return getSession(deps, m, (req.params as { id: string }).id);
  });

  app.post('/api/sessions/:id/turns', async (req) => {
    const m = requireTenantMember(req.authUser);
    const body = parseBody(TextTurnInputSchema, req.body);
    return processTurn(deps, m, (req.params as { id: string }).id, { clientTurnId: body.clientTurnId, text: body.text });
  });

  app.post('/api/sessions/:id/voice', async (req) => {
    const m = requireTenantMember(req.authUser);
    const user = await getUserDoc(deps, m.tenantId, m.uid);
    if (!user?.recordingConsentAt) throw new ApiError('CONSENT_REQUIRED', 'Please agree to voice recording first.');
    let clientTurnId: string | undefined;
    let audio: Buffer | undefined;
    for await (const part of req.parts()) {
      if (part.type === 'file') audio = await part.toBuffer();
      else if (part.fieldname === 'clientTurnId') clientTurnId = String(part.value);
    }
    const id = parseBody(z.string().uuid(), clientTurnId);
    if (!audio) throw new ApiError('VALIDATION', 'Missing audio file');
    return processTurn(deps, m, (req.params as { id: string }).id, { clientTurnId: id, audio });
  });

  app.post('/api/sessions/:id/hint', async (req) => {
    const m = requireTenantMember(req.authUser);
    return useHint(deps, m, (req.params as { id: string }).id);
  });

  app.post('/api/sessions/:id/replay', async (req) => {
    const m = requireTenantMember(req.authUser);
    const body = parseBody(z.object({ kind: z.enum(['replay', 'repeat_request']).default('replay') }), req.body ?? {});
    return useReplay(deps, m, (req.params as { id: string }).id, body.kind);
  });

  app.post('/api/sessions/:id/pause', async (req) => {
    const m = requireTenantMember(req.authUser);
    return setPaused(deps, m, (req.params as { id: string }).id, true);
  });

  app.post('/api/sessions/:id/resume', async (req) => {
    const m = requireTenantMember(req.authUser);
    return setPaused(deps, m, (req.params as { id: string }).id, false);
  });

  app.post('/api/sessions/:id/complete', async (req) => {
    const m = requireTenantMember(req.authUser);
    const a = await completeSession(deps, m, (req.params as { id: string }).id);
    await syncGrade(deps, m.tenantId, a, a.createdAt, req.log);
    return { assessmentId: a.id };
  });

  app.get('/api/sessions/:id/results', async (req) => {
    const m = requireTenantMember(req.authUser);
    return getResults(deps, m, (req.params as { id: string }).id);
  });

  /** NPC voice audio (cached TTS). Content is not personal; any signed-in member may fetch it. */
  app.get('/api/tts/:hash', async (req, reply) => {
    requireMember(req.authUser);
    const { hash } = req.params as { hash: string };
    if (!/^[a-f0-9]{40}$/.test(hash)) throw notFound('Audio');
    const buf = await deps.blobs.get(ttsPath(hash));
    if (!buf) throw notFound('Audio');
    return reply.header('Content-Type', 'audio/mpeg').header('Cache-Control', 'private, max-age=86400').send(buf);
  });

  /* ---------------- student ---------------- */
  app.get('/api/student/progress', async (req) => {
    const m = requireTenantMember(req.authUser);
    const user = await getUserDoc(deps, m.tenantId, m.uid);
    if (!user) throw notFound('User');
    const [assessSnap, activeSnap, missions] = await Promise.all([
      p.assessments(m.tenantId).where('uid', '==', m.uid).orderBy('createdAt', 'desc').limit(20).get(),
      p.sessions(m.tenantId).where('uid', '==', m.uid).where('status', 'in', ['active', 'paused', 'ready_to_complete']).limit(10).get(),
      listApprovedMissions(deps, m.tenantId),
    ]);
    const recent = assessSnap.docs.map((d) => d.data() as AssessmentDoc);
    let assignments: (AssignmentDoc & { courseName: string; completed: boolean })[] = [];
    if (user.courseIds.length) {
      const courses = (await Promise.all(user.courseIds.slice(0, 30).map((c) => p.course(m.tenantId, c).get()))).map((s) => s.data() as CourseDoc | undefined).filter(Boolean) as CourseDoc[];
      const aSnap = await p.assignments(m.tenantId).where('courseId', 'in', courses.map((c) => c.id).slice(0, 30)).get();
      assignments = aSnap.docs.map((d) => {
        const a = d.data() as AssignmentDoc;
        return { ...a, courseName: courses.find((c) => c.id === a.courseId)?.name ?? '', completed: user.completedMissionIds.includes(a.missionId) };
      });
    }
    const titleOf = (id: string) => missions.find((x) => x.id === id)?.title ?? { en: id, vi: id };
    return {
      user,
      stats: {
        xp: user.xp,
        level: user.level,
        missionsCompleted: user.completedMissionIds.length,
        missionsTotal: missions.length,
        sessionsPlayed: recent.length,
        averagePercent: recent.length ? Math.round(recent.reduce((s, a) => s + a.finalPercent, 0) / recent.length) : null,
      },
      achievements: user.achievements,
      recent: recent.map((a) => ({
        sessionId: a.sessionId,
        missionId: a.missionId,
        title: titleOf(a.missionId),
        level: a.level,
        missionCompleted: a.missionCompleted,
        percent: a.finalPercent,
        reviewed: Boolean(a.teacherReview),
        createdAt: a.createdAt,
      })),
      recommendation: recent[0] ? { ...recent[0].recommendation, title: recent[0].recommendation.nextMissionId ? titleOf(recent[0].recommendation.nextMissionId) : null, tips: recent[0].feedback?.nextPractice ?? [] } : null,
      activeSessions: activeSnap.docs.map((d) => {
        const s = d.data() as SessionDoc;
        return { id: s.id, missionId: s.missionId, title: titleOf(s.missionId), status: s.status, lastActivityAt: s.lastActivityAt };
      }),
      assignments,
    };
  });
}
