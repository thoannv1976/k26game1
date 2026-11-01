import type { FastifyRequest } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import type { Deps } from './deps.js';
import { ApiError } from './errors.js';

/**
 * Service-to-service access for the K26 games (D4): VSTEP Quest (Game 3) reads one learner's evidence with a
 * Google-signed ID token of its Cloud Run service account. Only the accounts in LMS_SERVICE_ACCOUNTS and the
 * audience LMS_SERVICE_AUDIENCE (default "k26-lms") are accepted; the school comes from the X-K26-Tenant header.
 * Read-only: used by GET /api/lms/v1/learners/:uid/evidence only.
 */
export type ServiceTokenVerifier = (idToken: string, audience: string) => Promise<{ email?: string; email_verified?: boolean } | undefined>;

const client = new OAuth2Client();
export const googleServiceTokenVerifier: ServiceTokenVerifier = async (idToken, audience) => (await client.verifyIdToken({ idToken, audience })).getPayload();

export const isServiceRequest = (req: FastifyRequest) => req.url.startsWith('/api/lms/v1/learners/') && typeof req.headers['x-k26-tenant'] === 'string';

export async function authenticateService(deps: Deps, req: FastifyRequest): Promise<{ email: string; tenantId: string }> {
  const allowed = deps.config.lmsServiceAccounts;
  if (!allowed.length) throw new ApiError('FORBIDDEN', 'Service access is not configured');
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
  if (!m) throw new ApiError('UNAUTHENTICATED', 'Missing bearer token');
  let payload;
  try {
    payload = await (deps.serviceTokenVerifier ?? googleServiceTokenVerifier)(m[1]!, deps.config.lmsServiceAudience);
  } catch {
    throw new ApiError('UNAUTHENTICATED', 'Invalid service token');
  }
  if (!payload?.email || payload.email_verified === false || !allowed.includes(payload.email)) throw new ApiError('FORBIDDEN', 'Service account not allowed');
  const tenantId = String(req.headers['x-k26-tenant']);
  if (!/^[a-z0-9-]{3,40}$/.test(tenantId)) throw new ApiError('VALIDATION', 'Invalid X-K26-Tenant header');
  return { email: payload.email, tenantId };
}
