import type { AssessmentDoc, SessionDoc } from '@ecs/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Deps } from '../deps.js';
import { paths } from '../paths.js';
import { submitResult } from './hubSdk.js';
import { ltiPaths, type LtiLink } from './launch.js';

/**
 * Sends an assessment's final percent to the LMS through UniGame Hub when the session belongs to an
 * LTI-launched assignment. Never throws: grading in the app must not fail because the LMS is unreachable
 * (the Hub queues and retries; the outcome is recorded in tenants/{t}/lti_outbox/{sessionId}).
 */
export async function syncGrade(deps: Deps, tenantId: string, a: AssessmentDoc, occurredAt: string, log?: FastifyBaseLogger): Promise<void> {
  const cfg = deps.config;
  if (!cfg.ltiEnabled) return;
  const lp = ltiPaths(deps);
  try {
    const s = (await paths(deps.db).session(tenantId, a.sessionId).get()).data() as SessionDoc | undefined;
    if (!s?.assignmentId) return;
    const link = (await lp.link(tenantId, a.uid, s.assignmentId).get()).data() as LtiLink | undefined;
    if (!link) return;
    const graded = a.aiStatus === 'ok' || a.teacherReview !== null;
    const res = await Promise.race([
      submitResult(
        { hubUrl: cfg.ltiHubUrl, gameId: cfg.ltiGameId, secret: cfg.ltiGameSecret, fetch: deps.ltiFetch },
        {
          gradeTarget: link.gradeTarget,
          attemptId: a.sessionId,
          score: Math.round(a.finalPercent * 100) / 100,
          maxScore: 100,
          occurredAt,
          activityProgress: 'Completed',
          gradingProgress: graded ? 'FullyGraded' : 'PendingManual',
          comment: a.teacherReview?.comment ? a.teacherReview.comment.slice(0, 1000) : undefined,
        },
      ),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Hub timeout')), 10_000)),
    ]);
    await lp.outbox(tenantId, a.sessionId).set({ status: res.status, jobId: res.job_id ?? null, finalPercent: a.finalPercent, occurredAt, at: deps.now().toISOString() });
  } catch (e) {
    log?.warn({ err: (e as Error).message, sessionId: a.sessionId }, 'LTI grade sync failed');
    await lp
      .outbox(tenantId, a.sessionId)
      .set({ status: 'error', error: (e as Error).message.slice(0, 500), finalPercent: a.finalPercent, occurredAt, at: deps.now().toISOString() })
      .catch(() => undefined);
  }
}
