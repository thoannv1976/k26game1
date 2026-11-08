import { randomUUID } from 'node:crypto';
import { createLocalJWKSet, decodeJwt, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { getBuiltinMission } from '@ecs/shared';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createDeps, type Deps } from '../../src/deps.js';
import { FakeAiProvider } from '../../src/ai/fake.js';
import { MemoryBlobStore } from '../../src/blob.js';
import { TICKET_TYP } from '../../src/lti/hubSdk.js';
import { api, createTenant, createUser, uuid, type TestCtx, type TestUser } from '../helpers.js';

/** UniGame Hub (LTI 1.3) adapter: ticket sign-in, provisioning, and grade sync to the Hub. */
const HUB = 'https://hub.test';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

let ctx: TestCtx;
let deps: Deps;
let tenantId: string;
let hubKey: CryptoKey;
const hubCalls: Array<{ url: string; result: Record<string, unknown> }> = [];

async function ticket(over: Record<string, unknown> = {}, sub = `u_${randomUUID().slice(0, 12)}`) {
  return new SignJWT({
    ugh: {
      tenantId: 'hub-tenant',
      platform: { issuer: 'https://moodle.test', deploymentId: '3' },
      ltiSub: '42',
      name: 'Nguyễn Văn B',
      email: 'b@moodle.test',
      role: 'learner',
      context: { id: 'course-7', title: 'English 1', label: 'ENG1' },
      resourceLink: { id: 'rl-9', title: 'Airport mission' },
      activity: 'M01',
      gradeTarget: 'gt_abc123',
      launchId: 'L1',
      ...over,
    },
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'hub1', typ: TICKET_TYP })
    .setIssuer(HUB)
    .setAudience('k26game1')
    .setSubject(sub)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(hubKey);
}

async function signInWithCustomToken(token: string): Promise<string> {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, returnSecureToken: true }),
  });
  const json = (await res.json()) as { idToken?: string };
  if (!json.idToken) throw new Error('custom token sign-in failed');
  return json.idToken;
}

const launch = (t: string) => ctx.app.inject({ method: 'POST', url: '/api/lti/launch', payload: { ticket: t } });

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  hubKey = privateKey;
  const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'hub1', alg: 'RS256' }] });
  const config = loadConfig({
    env: 'test', projectId: process.env.GCLOUD_PROJECT ?? 'demo-ecs', aiProvider: 'fake', speechProvider: 'fake', ttsProvider: 'fake', blobStore: 'memory',
    ltiEnabled: true, ltiHubUrl: HUB, ltiGameId: 'k26game1', ltiGameSecret: 'x'.repeat(40), ltiTenantMap: { 'hub-tenant': 'pending' },
  });
  const ltiFetch: typeof fetch = async (url, init) => {
    const body = JSON.parse(String(init?.body)) as { result_token: string };
    hubCalls.push({ url: String(url), result: decodeJwt(body.result_token).result as Record<string, unknown> });
    return new Response(JSON.stringify({ status: 'queued', job_id: `job-${hubCalls.length}` }), { status: 202 });
  };
  deps = createDeps(config, { ai: new FakeAiProvider(), blobs: new MemoryBlobStore(), ltiJwks: jwks, ltiFetch });
  ctx = { app: await buildApp(deps, { logger: false }), deps, ai: deps.ai as FakeAiProvider, blobs: deps.blobs as MemoryBlobStore };
  tenantId = (await createTenant(deps)).id;
  deps.config.ltiTenantMap = { 'hub-tenant': tenantId };
});

describe('LTI launch', () => {
  it('signs a learner in, enrols them and deep-links to the mission assignment', async () => {
    const r = await launch(await ticket());
    expect(r.statusCode, r.body).toBe(200);
    const { customToken, redirect } = r.json() as { customToken: string; redirect: string };
    expect(redirect).toMatch(/^\/missions\/M01\?assignment=lti-[0-9a-f]{20}$/);
    const uid = (decodeJwt(customToken) as { uid: string }).uid;
    expect(uid).toMatch(/^lti-/);
    const user = await deps.auth.getUser(uid);
    expect(user.customClaims).toMatchObject({ tenantId, role: 'student' });
    expect(user.email).toBeUndefined(); // never keyed by e-mail
    const assignmentId = redirect.split('assignment=')[1]!;
    const a = (await deps.db.doc(`tenants/${tenantId}/assignments/${assignmentId}`).get()).data()!;
    const c = (await deps.db.doc(`tenants/${tenantId}/courses/${a.courseId}`).get()).data()!;
    expect(c.studentIds).toContain(uid);
    expect(c.name).toBe('English 1');
    const link = (await deps.db.doc(`tenants/${tenantId}/lti_links/${uid}_${assignmentId}`).get()).data();
    expect(link).toMatchObject({ gradeTarget: 'gt_abc123' });
  });

  it('rejects a reused ticket, a forged ticket and an unmapped tenant', async () => {
    const t = await ticket();
    expect((await launch(t)).statusCode).toBe(200);
    expect((await launch(t)).statusCode).toBe(401);
    const forged = await new SignJWT({ ugh: {} }).setProtectedHeader({ alg: 'RS256', kid: 'hub1', typ: TICKET_TYP }).setIssuer(HUB).setAudience('k26game1')
      .setSubject('x').setJti(uuid()).setIssuedAt().setExpirationTime('2m').sign((await generateKeyPair('RS256')).privateKey);
    expect((await launch(forged)).statusCode).toBe(401);
    expect((await launch(await ticket({ tenantId: 'other-school' }))).statusCode).toBe(403);
  });

  it('makes instructors teachers of the course and sends them to the class page', async () => {
    const r = await launch(await ticket({ role: 'instructor', gradeTarget: undefined }));
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().redirect).toMatch(/^\/teacher\/classes\/lti-/);
    const uid = (decodeJwt(r.json().customToken) as { uid: string }).uid;
    expect((await deps.auth.getUser(uid)).customClaims).toMatchObject({ role: 'teacher' });
  });

  it('is invisible when LTI is disabled', async () => {
    const off = await buildApp(createDeps(loadConfig({ env: 'test', projectId: process.env.GCLOUD_PROJECT ?? 'demo-ecs', aiProvider: 'fake', speechProvider: 'fake', ttsProvider: 'fake', blobStore: 'memory' }), { ai: new FakeAiProvider(), blobs: new MemoryBlobStore() }), { logger: false });
    expect((await off.inject({ method: 'POST', url: '/api/lti/launch', payload: { ticket: 'x'.repeat(40) } })).statusCode).toBe(404);
  });
});

describe('grade sync', () => {
  it('reports the assessed percent and the teacher re-score for LTI assignments only', async () => {
    const r = await launch(await ticket({ gradeTarget: 'gt_grade1', resourceLink: { id: 'rl-grade', title: 'Graded' } }, 'u_grader'));
    const { customToken, redirect } = r.json() as { customToken: string; redirect: string };
    const student: TestUser = { uid: (decodeJwt(customToken) as { uid: string }).uid, email: '', token: await signInWithCustomToken(customToken) };
    const assignmentId = redirect.split('assignment=')[1]!;

    const start = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M01', assignmentId, restart: true });
    expect(start.status, JSON.stringify(start.body)).toBe(200);
    const sessionId = start.body.session.id as string;
    await api(ctx, student, 'POST', `/api/sessions/${sessionId}/turns`, { clientTurnId: uuid(), text: getBuiltinMission('M01')!.stages[0]!.sampleStudentLines[0]! });
    const before = hubCalls.length;
    expect((await api(ctx, student, 'POST', `/api/sessions/${sessionId}/complete`)).status).toBe(200);
    expect(hubCalls.length).toBe(before + 1);
    const first = hubCalls.at(-1)!;
    expect(first.url).toBe(`${HUB}/api/v1/results`);
    expect(first.result).toMatchObject({ grade_target: 'gt_grade1', attempt_id: sessionId, max_score: 100 });

    // Teacher of the LTI course re-scores: a newer result is sent for the same attempt.
    const tr = await launch(await ticket({ role: 'instructor', gradeTarget: undefined, resourceLink: { id: 'rl-grade', title: 'Graded' } }, 'u_teacher1'));
    const teacher: TestUser = { uid: '', email: '', token: await signInWithCustomToken(tr.json().customToken) };
    const rev = await api(ctx, teacher, 'PUT', `/api/teacher/assessments/${sessionId}/review`, { scores: { grammar: 15 }, comment: 'Well done' });
    expect(rev.status, JSON.stringify(rev.body)).toBe(200);
    const second = hubCalls.at(-1)!;
    expect(second.result).toMatchObject({ grade_target: 'gt_grade1', attempt_id: sessionId, comment: 'Well done', grading_progress: 'FullyGraded' });
    expect(Date.parse(String(second.result.occurred_at))).toBeGreaterThan(Date.parse(String(first.result.occurred_at)));
    const outbox = (await deps.db.doc(`tenants/${tenantId}/lti_outbox/${sessionId}`).get()).data();
    expect(outbox).toMatchObject({ status: 'queued' });
  });

  it('does not report sessions that are not tied to an LTI assignment', async () => {
    const plain = await createUser(deps, tenantId, 'student');
    const before = hubCalls.length;
    const s = await api(ctx, plain, 'POST', '/api/sessions', { missionId: 'M02', restart: true });
    await api(ctx, plain, 'POST', `/api/sessions/${s.body.session.id}/complete`);
    expect(hubCalls.length).toBe(before);
  });
});
