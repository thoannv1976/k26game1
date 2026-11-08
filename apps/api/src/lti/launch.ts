import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { AssignmentDoc, CourseDoc, Role, UserDoc } from '@ecs/shared';
import type { Deps } from '../deps.js';
import { ApiError, forbidden } from '../errors.js';
import { paths } from '../paths.js';
import { newUserDoc } from '../services/users.js';
import { getApprovedMission, getTenant } from '../tenants.js';
import { verifyLaunchTicket, type LaunchContext } from './hubSdk.js';

const h = (s: string, n: number) => createHash('sha256').update(s).digest('hex').slice(0, n);
const MISSION_RE = /^M\d{2,3}$/;

/** Firestore paths owned by the LTI adapter (server-only; firestore.rules denies clients). */
export const ltiPaths = (deps: Deps) => ({
  ticket: (jti: string) => deps.db.doc(`lti_tickets/${jti}`),
  link: (t: string, uid: string, assignmentId: string) => deps.db.doc(`tenants/${t}/lti_links/${uid}_${assignmentId}`),
  outbox: (t: string, sessionId: string) => deps.db.doc(`tenants/${t}/lti_outbox/${sessionId}`),
});

export interface LtiLink {
  gradeTarget: string;
  launchId: string;
  hubUserId: string;
  updatedAt: string;
}

/**
 * Verifies a UniGame Hub launch ticket, provisions the Moodle user in this app and returns
 * a Firebase custom token plus where to send the browser.
 * Users are keyed by the Hub's stable user id (never by e-mail), so existing standalone accounts are untouched.
 */
export async function ltiLaunch(deps: Deps, ticket: string): Promise<{ customToken: string; redirect: string }> {
  const cfg = deps.config;
  const lp = ltiPaths(deps);
  let ctx: LaunchContext;
  try {
    ctx = await verifyLaunchTicket(ticket, {
      hubUrl: cfg.ltiHubUrl,
      gameId: cfg.ltiGameId,
      jwks: deps.ltiJwks,
      markUsed: async (jti, expiresAt) => {
        try {
          await lp.ticket(jti).create({ expiresAt, usedAt: deps.now().toISOString() });
          return true;
        } catch (e) {
          if ((e as { code?: number }).code === 6) return false; // ALREADY_EXISTS
          throw e;
        }
      },
    });
  } catch (e) {
    throw new ApiError('UNAUTHENTICATED', `Invalid launch ticket: ${(e as Error).message}`);
  }

  const tenantId = cfg.ltiTenantMap[ctx.tenantId];
  if (!tenantId) throw forbidden(`LMS tenant "${ctx.tenantId}" is not connected to this app`);
  const tenant = await getTenant(deps, tenantId);
  if (!tenant.active) throw forbidden('School is not active');

  const p = paths(deps.db);
  const now = deps.now();
  const uid = `lti-${h(ctx.hubUserId, 28)}`;
  const displayName = (ctx.name || [ctx.givenName, ctx.familyName].filter(Boolean).join(' ') || 'Moodle user').slice(0, 120);

  // 1) Auth user (no e-mail/password: sign-in only through the Hub).
  let user;
  try {
    user = await deps.auth.getUser(uid);
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
    user = await deps.auth.createUser({ uid, displayName });
  }
  const claims = (user.customClaims ?? {}) as { tenantId?: string; role?: Role };
  if (claims.tenantId && claims.tenantId !== tenantId) throw new ApiError('CONFLICT', 'Account belongs to another school');
  // Never downgrade an admin that was promoted inside the app; never grant admin via LTI.
  const role: Role = claims.role === 'school_admin' ? 'school_admin' : ctx.role === 'instructor' ? 'teacher' : 'student';
  if (claims.tenantId !== tenantId || claims.role !== role) {
    await deps.auth.setCustomUserClaims(uid, { ...claims, tenantId, role });
  }

  // 2) Profile.
  const userRef = p.user(tenantId, uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    await userRef.set(newUserDoc(uid, tenantId, { email: ctx.email ?? '', displayName, role }, now));
  } else {
    const u = snap.data() as UserDoc;
    if (u.disabled) throw forbidden('Account disabled');
    await userRef.update({ displayName, role, ...(ctx.email ? { email: ctx.email } : {}) });
  }

  // 3) Course = Moodle course (context), membership by role.
  let courseId: string | null = null;
  if (ctx.context?.id) {
    courseId = `lti-${h(`${ctx.platform.issuer}|${ctx.context.id}`, 20)}`;
    const courseRef = p.course(tenantId, courseId);
    const field = role === 'student' ? 'studentIds' : 'teacherIds';
    await deps.db.runTransaction(async (tx) => {
      const c = await tx.get(courseRef);
      if (!c.exists) {
        const doc: CourseDoc = {
          id: courseId!, tenantId, code: (ctx.context!.label || 'MOODLE').slice(0, 40), name: (ctx.context!.title || 'Moodle course').slice(0, 200),
          teacherIds: [], studentIds: [], monthlyBudgetUsd: null, createdAt: now.toISOString(),
        };
        tx.set(courseRef, { ...doc, [field]: [uid], source: 'lti' });
      } else {
        tx.update(courseRef, { [field]: FieldValue.arrayUnion(uid) });
      }
    });
    await userRef.update({ courseIds: FieldValue.arrayUnion(courseId) });
  }

  // 4) Assignment = Moodle activity (resource link) when the teacher chose a mission.
  let assignmentId: string | null = null;
  const missionId = ctx.activity && MISSION_RE.test(ctx.activity) ? ctx.activity : null;
  if (courseId && missionId) {
    await getApprovedMission(deps, tenantId, missionId); // 404 if the mission is not approved for this school
    assignmentId = `lti-${h(`${ctx.platform.issuer}|${ctx.resourceLink.id}`, 20)}`;
    const aRef = p.assignments(tenantId).doc(assignmentId);
    const a: AssignmentDoc = {
      id: assignmentId, courseId, missionId, dueAt: null, note: (ctx.resourceLink.title ?? 'Moodle').slice(0, 500),
      createdBy: role === 'student' ? 'lti' : uid, createdAt: now.toISOString(),
    };
    await aRef.set({ ...a, source: 'lti' }, { merge: true });
  }

  // 5) Remember where this learner's grade goes (looked up server-side when the session is assessed).
  if (role === 'student' && assignmentId && ctx.gradeTarget) {
    const link: LtiLink = { gradeTarget: ctx.gradeTarget, launchId: ctx.launchId, hubUserId: ctx.hubUserId, updatedAt: now.toISOString() };
    await lp.link(tenantId, uid, assignmentId).set(link);
  }

  const redirect =
    role === 'student'
      ? missionId && assignmentId
        ? `/missions/${missionId}?assignment=${assignmentId}`
        : '/student'
      : courseId
        ? `/teacher/classes/${courseId}`
        : '/teacher';
  return { customToken: await deps.auth.createCustomToken(uid), redirect };
}
