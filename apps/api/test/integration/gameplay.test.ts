import { beforeAll, describe, expect, it } from 'vitest';
import { getBuiltinMission } from '@ecs/shared';
import { api, createTenant, createUser, makeApp, sendVoice, toneWav, uuid, type TestCtx, type TestUser } from '../helpers.js';

let ctx: TestCtx;
let student: TestUser;

beforeAll(async () => {
  ctx = await makeApp();
  const t = await createTenant(ctx.deps);
  student = await createUser(ctx.deps, t.id, 'student');
});

async function playByText(missionId: string, user: TestUser) {
  const mission = getBuiltinMission(missionId)!;
  const start = await api(ctx, user, 'POST', '/api/sessions', { missionId, restart: true });
  expect(start.status).toBe(200);
  const sessionId = start.body.session.id as string;
  for (const stage of mission.stages) {
    for (const line of stage.sampleStudentLines) {
      const r = await api(ctx, user, 'POST', `/api/sessions/${sessionId}/turns`, { clientTurnId: uuid(), text: line });
      if (r.status === 409 && r.body.error.code === 'SESSION_NOT_ACTIVE') break;
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      if (r.body.session.status === 'ready_to_complete') break;
    }
  }
  return sessionId;
}

describe('mission gameplay', () => {
  it('lists 3 available locations and 6 approved missions', async () => {
    const loc = await api(ctx, student, 'GET', '/api/locations');
    expect(loc.body.locations.filter((l: any) => l.available).map((l: any) => l.id)).toEqual(['airport', 'restaurant', 'university']);
    const ms = await api(ctx, student, 'GET', '/api/missions');
    expect(ms.body.missions).toHaveLength(6);
    // Hidden facts are not exposed to students.
    expect(JSON.stringify(ms.body)).not.toContain('npcFacts');
    expect(JSON.stringify(ms.body)).not.toContain('evidenceKeywords');
  });

  it.each(['M01', 'M02', 'M03', 'M04', 'M05', 'M06'])('%s can be completed and assessed (text mode)', async (missionId) => {
    const sessionId = await playByText(missionId, student);
    const s = await api(ctx, student, 'GET', `/api/sessions/${sessionId}`);
    expect(s.body.session.status).toBe('ready_to_complete');
    expect(s.body.session.objectives.filter((o: any) => o.required).every((o: any) => o.met)).toBe(true);

    const done = await api(ctx, student, 'POST', `/api/sessions/${sessionId}/complete`);
    expect(done.status).toBe(200);
    const res = await api(ctx, student, 'GET', `/api/sessions/${sessionId}/results`);
    const a = res.body.assessment;
    expect(a.missionCompleted).toBe(true);
    expect(a.criteria.taskCompletion.score).toBe(30);
    expect(a.criteria.fluency.status).toBe('not_assessed'); // text mode is not speaking evidence
    expect(a.evidenceMode).toBe('text');
    expect(a.aiStatus).toBe('ok');
    expect(a.disclaimer).toMatch(/not an official VSTEP score/);
    expect(res.body.turns.length).toBeGreaterThan(4);
  });

  it('awards XP and achievements to the player profile', async () => {
    const prog = await api(ctx, student, 'GET', '/api/student/progress');
    expect(prog.status).toBe(200);
    expect(prog.body.stats.missionsCompleted).toBe(6);
    expect(prog.body.stats.xp).toBeGreaterThan(600);
    expect(prog.body.achievements).toEqual(expect.arrayContaining(['first_mission', 'airport_pro', 'city_explorer', 'b2_challenger']));
  });

  it('does not complete the mission from an off-topic turn and asks for clarification', async () => {
    const start = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M02', restart: true });
    const r = await api(ctx, student, 'POST', `/api/sessions/${start.body.session.id}/turns`, { clientTurnId: uuid(), text: 'I like football very much.' });
    expect(r.status).toBe(200);
    expect(r.body.needsClarification).toBe(true);
    expect(r.body.objectivesCredited).toEqual([]);
    expect(r.body.session.status).toBe('active');
  });

  it('finishing early gives a partial result (mission not completed)', async () => {
    const start = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M03', restart: true });
    const id = start.body.session.id;
    const mission = getBuiltinMission('M03')!;
    await api(ctx, student, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: mission.stages[0]!.sampleStudentLines[0]! });
    const done = await api(ctx, student, 'POST', `/api/sessions/${id}/complete`);
    expect(done.status).toBe(200);
    const res = await api(ctx, student, 'GET', `/api/sessions/${id}/results`);
    expect(res.body.assessment.missionCompleted).toBe(false);
    expect(res.body.assessment.criteria.taskCompletion.score).toBeLessThan(30);
    expect(res.body.assessment.recommendation.nextMissionId).toBe('M03');
  });
});

describe('voice turns', () => {
  it('requires recording consent', async () => {
    const start = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M01', restart: true });
    const r = await sendVoice(ctx, student, start.body.session.id, toneWav());
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('CONSENT_REQUIRED');
  });

  it('completes a mission by voice and assesses fluency from speech data', async () => {
    await api(ctx, student, 'PATCH', '/api/me', { recordingConsent: true });
    const start = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M02', restart: true });
    const id = start.body.session.id;
    let last: any;
    for (let i = 0; i < 20; i++) {
      const r = await sendVoice(ctx, student, id, toneWav(6));
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      expect(r.body.mode).toBe('voice');
      last = r.body;
      if (r.body.session.status === 'ready_to_complete') break;
    }
    expect(last.session.status).toBe('ready_to_complete');
    // Student audio is stored for the retention period.
    expect([...ctx.blobs.files.keys()].some((k) => k.includes(`/sessions/${id}/`))).toBe(true);
    await api(ctx, student, 'POST', `/api/sessions/${id}/complete`);
    const res = await api(ctx, student, 'GET', `/api/sessions/${id}/results`);
    expect(res.body.assessment.evidenceMode).toBe('voice');
    expect(res.body.assessment.criteria.fluency.status).toBe('assessed');
    expect(res.body.assessment.criteria.fluency.score).toBeGreaterThan(0);
  });

  it('rejects silent or invalid audio without counting a turn', async () => {
    const start = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M01', restart: true });
    const id = start.body.session.id;
    const silent = toneWav(1);
    silent.fill(0, 44);
    const r1 = await sendVoice(ctx, student, id, silent);
    expect(r1.status).toBe(422);
    expect(r1.body.error.code).toBe('AUDIO_UNCLEAR');
    const r2 = await sendVoice(ctx, student, id, Buffer.from('not a wav file at all, definitely not'));
    expect(r2.status).toBe(400);
    const s = await api(ctx, student, 'GET', `/api/sessions/${id}`);
    expect(s.body.session.studentTurns).toBe(0);
  });

  it('rejects recordings longer than the limit', async () => {
    const start = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M01', restart: true });
    const r = await sendVoice(ctx, student, start.body.session.id, toneWav(40));
    expect(r.status).toBe(413);
    expect(r.body.error.code).toBe('AUDIO_TOO_LONG');
  });
});
