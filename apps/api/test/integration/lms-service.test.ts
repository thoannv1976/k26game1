import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createDeps } from '../../src/deps.js';
import { FakeAiProvider } from '../../src/ai/fake.js';
import { MemoryBlobStore } from '../../src/blob.js';
import type { ServiceTokenVerifier } from '../../src/serviceAuth.js';
import { createTenant, createUser } from '../helpers.js';

/** D4: VSTEP Quest reads one learner's evidence with a Google service ID token (stubbed here). */
const verifier: ServiceTokenVerifier = async (token, audience) => {
  if (audience !== 'k26-lms') throw new Error('bad audience');
  if (token === 'vstep-token') return { email: 'vstep-api@k26game1.iam.gserviceaccount.com', email_verified: true };
  if (token === 'other-token') return { email: 'someone@else.iam.gserviceaccount.com', email_verified: true };
  throw new Error('invalid');
};

let app: Awaited<ReturnType<typeof buildApp>>;
let deps: ReturnType<typeof createDeps>;
let tenantId: string;
let studentUid: string;
let adminToken: string;

beforeAll(async () => {
  const config = loadConfig({
    env: 'test', projectId: process.env.GCLOUD_PROJECT ?? 'demo-ecs', aiProvider: 'fake', speechProvider: 'fake', ttsProvider: 'fake', blobStore: 'memory',
    lmsServiceAccounts: ['vstep-api@k26game1.iam.gserviceaccount.com'],
  });
  deps = createDeps(config, { ai: new FakeAiProvider(), blobs: new MemoryBlobStore(), serviceTokenVerifier: verifier });
  app = await buildApp(deps, { logger: false });
  tenantId = (await createTenant(deps)).id;
  const s = await createUser(deps, tenantId, 'student');
  studentUid = s.uid;
  adminToken = (await createUser(deps, tenantId, 'school_admin')).token;
  await deps.db.doc(`tenants/${tenantId}/assessments/a1`).set({
    id: 'a1', tenantId, uid: studentUid, sessionId: 'a1', missionId: 'M01', missionVersion: 1, level: 'B1', courseId: null, evidenceMode: 'voice',
    criteria: {}, percent: 70, finalPercent: 70, missionCompleted: true, objectivesMet: 3, objectivesRequired: 3, feedback: null, teacherReview: null,
    versions: { rubric: 'r' }, disclaimer: 'd', createdAt: '2026-01-01T00:00:00.000Z',
  });
});

const get = (headers: Record<string, string>) => app.inject({ method: 'GET', url: `/api/lms/v1/learners/${studentUid}/evidence`, headers });

describe('learner evidence for VSTEP Quest (service account)', () => {
  it('returns the learner evidence to the allowed service account', async () => {
    const r = await get({ authorization: 'Bearer vstep-token', 'x-k26-tenant': tenantId });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ schema: 'k26-evidence-1.0', count: 1 });
    expect(r.json().items[0].learner.uid).toBe(studentUid);
  });
  it('refuses other service accounts, invalid tokens and unknown schools', async () => {
    expect((await get({ authorization: 'Bearer other-token', 'x-k26-tenant': tenantId })).statusCode).toBe(403);
    expect((await get({ authorization: 'Bearer forged', 'x-k26-tenant': tenantId })).statusCode).toBe(401);
    expect((await get({ 'x-k26-tenant': tenantId })).statusCode).toBe(401);
    expect((await get({ authorization: 'Bearer vstep-token', 'x-k26-tenant': 'no-such-school' })).statusCode).toBe(404);
  });
  it('service tokens only work on this endpoint', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/lms/v1/results', headers: { authorization: 'Bearer vstep-token', 'x-k26-tenant': tenantId } });
    expect(r.statusCode).toBe(401);
  });
  it('school admins can use it with their Firebase token', async () => {
    const r = await get({ authorization: `Bearer ${adminToken}` });
    expect(r.statusCode).toBe(200);
    expect(r.json().count).toBe(1);
  });
  it('disabled when no service accounts are configured', async () => {
    const d2 = createDeps({ ...deps.config, lmsServiceAccounts: [] }, { db: deps.db, auth: deps.auth, ai: new FakeAiProvider(), serviceTokenVerifier: verifier });
    const a2 = await buildApp(d2, { logger: false });
    const r = await a2.inject({ method: 'GET', url: `/api/lms/v1/learners/${studentUid}/evidence`, headers: { authorization: 'Bearer vstep-token', 'x-k26-tenant': tenantId } });
    expect(r.statusCode).toBe(403);
  });
});
