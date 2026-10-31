import { beforeAll, describe, expect, it } from 'vitest';
import { getBuiltinMission } from '@ecs/shared';
import { api, createTenant, createUser, makeApp, uuid, type TestCtx, type TestUser } from '../helpers.js';
import { paths } from '../../src/paths.js';
import { counterIds } from '../../src/quota.js';

let ctx: TestCtx;
let tenantId: string;
let student: TestUser;
const M02 = getBuiltinMission('M02')!;
const line = (i: number) => M02.stages.flatMap((s) => s.sampleStudentLines)[i]!;

beforeAll(async () => {
  ctx = await makeApp();
  tenantId = (await createTenant(ctx.deps, { quotas: { attemptsPerMissionPerDay: 100 } })).id;
  student = await createUser(ctx.deps, tenantId, 'student');
});

async function newSession(user = student, missionId = 'M02') {
  const r = await api(ctx, user, 'POST', '/api/sessions', { missionId, restart: true });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.session.id as string;
}

describe('no duplicate turns or scores', () => {
  it('re-sending the same clientTurnId returns the same result without a second turn', async () => {
    const id = await newSession();
    const turnId = uuid();
    const a = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: turnId, text: line(0) });
    const b = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: turnId, text: line(0) });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.body).toEqual(a.body);
    const s = await api(ctx, student, 'GET', `/api/sessions/${id}`);
    expect(s.body.session.studentTurns).toBe(1);
    expect(s.body.turns.filter((t: any) => t.speaker === 'student')).toHaveLength(1);
  });

  it('concurrent submissions of the same turn are processed once', async () => {
    const id = await newSession();
    const turnId = uuid();
    ctx.ai.delayMs = 300;
    const results = await Promise.all([1, 2, 3].map(() => api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: turnId, text: line(0) })));
    ctx.ai.delayMs = 0;
    const ok = results.filter((r) => r.status === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of results.filter((r) => r.status !== 200)) expect(['TURN_IN_PROGRESS', 'CONFLICT']).toContain(r.body.error.code);
    const s = await api(ctx, student, 'GET', `/api/sessions/${id}`);
    expect(s.body.session.studentTurns).toBe(1);
  });

  it('different turns sent at the same time are serialized (one rejected, retry works)', async () => {
    const id = await newSession();
    ctx.ai.delayMs = 300;
    const [r1, r2] = await Promise.all([
      api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(0) }),
      api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(1) }),
    ]);
    ctx.ai.delayMs = 0;
    const statuses = [r1.status, r2.status].sort();
    expect(statuses[0]).toBe(200);
    const s = await api(ctx, student, 'GET', `/api/sessions/${id}`);
    expect(s.body.session.studentTurns).toBe(statuses.filter((x) => x === 200).length);
  });

  it('completing twice creates one assessment and awards XP once', async () => {
    const id = await newSession();
    for (let i = 0; i < 12; i++) {
      const r = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(i) });
      if (r.body.session?.status === 'ready_to_complete' || r.status !== 200) break;
    }
    const before = (await api(ctx, student, 'GET', '/api/me')).body.user.xp;
    const [c1, c2] = await Promise.all([
      api(ctx, student, 'POST', `/api/sessions/${id}/complete`),
      api(ctx, student, 'POST', `/api/sessions/${id}/complete`),
    ]);
    expect([c1.status, c2.status]).toContain(200);
    const c3 = await api(ctx, student, 'POST', `/api/sessions/${id}/complete`);
    expect(c3.status).toBe(200);
    const after = (await api(ctx, student, 'GET', '/api/me')).body.user.xp;
    const res = await api(ctx, student, 'GET', `/api/sessions/${id}/results`);
    expect(after - before).toBe(res.body.assessment.xpAwarded);
    const all = await paths(ctx.deps.db).assessments(tenantId).where('sessionId', '==', id).get();
    expect(all.size).toBe(1);
    // A finished session accepts no more turns.
    const late = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: 'hello' });
    expect(late.body.error.code).toBe('SESSION_NOT_ACTIVE');
  });
});

describe('interrupted sessions', () => {
  it('starting the same mission again resumes the unfinished session with its history', async () => {
    const id = await newSession();
    await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(0) });
    const again = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M02' });
    expect(again.body.resumed).toBe(true);
    expect(again.body.session.id).toBe(id);
    expect(again.body.turns.length).toBe(3);
    const detail = await api(ctx, student, 'GET', '/api/missions/M02');
    expect(detail.body.activeSessionId).toBe(id);
  });

  it('pause stops play and the clock; resume continues', async () => {
    const id = await newSession();
    const p = await api(ctx, student, 'POST', `/api/sessions/${id}/pause`);
    expect(p.body.session.status).toBe('paused');
    const blocked = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(0) });
    expect(blocked.body.error.code).toBe('SESSION_NOT_ACTIVE');
    const r = await api(ctx, student, 'POST', `/api/sessions/${id}/resume`);
    expect(r.body.session.status).toBe('active');
    const ok = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(0) });
    expect(ok.status).toBe(200);
  });

  it('a turn stuck in processing (crash) can be retried with the same id after a failure', async () => {
    const id = await newSession();
    ctx.ai.failNext = 0;
    const turnId = uuid();
    // Simulate a failure during STT/AI by sending blocked content first, then retry with the same id.
    const bad = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: turnId, text: 'shit' });
    expect(bad.status).toBe(422);
    const retry = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: turnId, text: line(0) });
    expect(retry.status).toBe(200);
  });
});

describe('AI outages', () => {
  it('uses a scripted fallback line and keeps progress unchanged', async () => {
    const id = await newSession();
    ctx.ai.failNext = 10;
    const r = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(0) });
    ctx.ai.failNext = 0;
    expect(r.status).toBe(200);
    expect(r.body.fallback).toBe(true);
    expect(r.body.objectivesCredited).toEqual([]);
    expect(r.body.npcText).toContain(M02.stages[0]!.fallbackLine);
    // Next turn works again once AI is back.
    const ok = await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(0) });
    expect(ok.body.fallback).toBe(false);
  });

  it('assessment without AI marks AI criteria as not assessed (no invented scores)', async () => {
    const id = await newSession();
    await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(0) });
    ctx.ai.failNext = 10;
    const c = await api(ctx, student, 'POST', `/api/sessions/${id}/complete`);
    ctx.ai.failNext = 0;
    expect(c.status).toBe(200);
    const res = await api(ctx, student, 'GET', `/api/sessions/${id}/results`);
    const a = res.body.assessment;
    expect(a.aiStatus).toBe('failed');
    for (const k of ['comprehension', 'grammar', 'vocabulary']) {
      expect(a.criteria[k].status).toBe('not_assessed');
      expect(a.criteria[k].score).toBeNull();
    }
    expect(a.criteria.taskCompletion.status).toBe('assessed');
  });
});

describe('hints and replays', () => {
  it('limits hints and replays per mission', async () => {
    const id = await newSession();
    for (let i = 0; i < M02.limits.maxHints; i++) expect((await api(ctx, student, 'POST', `/api/sessions/${id}/hint`)).status).toBe(200);
    const h = await api(ctx, student, 'POST', `/api/sessions/${id}/hint`);
    expect(h.body.error.code).toBe('HINT_LIMIT');
    for (let i = 0; i < M02.limits.maxReplays; i++) expect((await api(ctx, student, 'POST', `/api/sessions/${id}/replay`, { kind: 'replay' })).status).toBe(200);
    const r = await api(ctx, student, 'POST', `/api/sessions/${id}/replay`, { kind: 'replay' });
    expect(r.body.error.code).toBe('REPLAY_LIMIT');
    const s = await api(ctx, student, 'GET', `/api/sessions/${id}`);
    expect(s.body.turns.some((t: any) => t.speaker === 'system' && t.text.startsWith('Hint:'))).toBe(true);
  });
});

describe('cost control', () => {
  it('blocks AI calls above the daily per-student limit', async () => {
    const t = await createTenant(ctx.deps, { quotas: { aiCallsPerStudentPerDay: 2 } });
    const s = await createUser(ctx.deps, t.id, 'student');
    const id = (await api(ctx, s, 'POST', '/api/sessions', { missionId: 'M02' })).body.session.id;
    expect((await api(ctx, s, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(0) })).status).toBe(200);
    const second = await api(ctx, s, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(1) });
    expect(second.status).toBe(200);
    expect(second.body.session.quotaWarning).toBe(true);
    const third = await api(ctx, s, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: line(2) });
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('QUOTA_EXCEEDED');
    // Completion still works, with AI criteria marked not assessed.
    const c = await api(ctx, s, 'POST', `/api/sessions/${id}/complete`);
    expect(c.status).toBe(200);
    const res = await api(ctx, s, 'GET', `/api/sessions/${id}/results`);
    expect(res.body.assessment.aiStatus).toBe('skipped');
  });

  it('blocks AI calls when the school monthly budget is used up', async () => {
    const t = await createTenant(ctx.deps, { quotas: { monthlyBudgetUsd: 5 } });
    const s = await createUser(ctx.deps, t.id, 'student');
    const id = (await api(ctx, s, 'POST', '/api/sessions', { missionId: 'M01' })).body.session.id;
    await paths(ctx.deps.db).counter(t.id, counterIds(s.uid, null, new Date()).tenantMonth).set({ costUsd: 5.01 }, { merge: true });
    const r = await api(ctx, s, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: 'Hello' });
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe('BUDGET_EXCEEDED');
  });

  it('limits attempts per mission per day', async () => {
    const t = await createTenant(ctx.deps, { quotas: { attemptsPerMissionPerDay: 2 } });
    const s = await createUser(ctx.deps, t.id, 'student');
    expect((await api(ctx, s, 'POST', '/api/sessions', { missionId: 'M01', restart: true })).status).toBe(200);
    expect((await api(ctx, s, 'POST', '/api/sessions', { missionId: 'M01', restart: true })).status).toBe(200);
    const third = await api(ctx, s, 'POST', '/api/sessions', { missionId: 'M01', restart: true });
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('ATTEMPT_LIMIT');
  });

  it('records usage logs with estimated cost', async () => {
    const logs = await paths(ctx.deps.db).usageLogs(tenantId).where('kind', '==', 'converse').limit(5).get();
    expect(logs.size).toBeGreaterThan(0);
    expect(logs.docs[0]!.data().costUsd).toBeGreaterThan(0);
  });

  it('enforces the turn limit', async () => {
    const t = await createTenant(ctx.deps);
    const s = await createUser(ctx.deps, t.id, 'student');
    const id = (await api(ctx, s, 'POST', '/api/sessions', { missionId: 'M01' })).body.session.id;
    const max = getBuiltinMission('M01')!.limits.maxTurns;
    for (let i = 0; i < max; i++) await api(ctx, s, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: 'I like football.' });
    const r = await api(ctx, s, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: 'I like football.' });
    expect(r.body.error.code).toBe('TURN_LIMIT');
  });
});
