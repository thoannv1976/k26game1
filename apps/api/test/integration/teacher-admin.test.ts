import { beforeAll, describe, expect, it } from 'vitest';
import { BUILTIN_MISSIONS, getBuiltinMission } from '@ecs/shared';
import { api, createCourse, createPlatformAdmin, createTenant, createUser, makeApp, signIn, uuid, type TestCtx, type TestUser } from '../helpers.js';

let ctx: TestCtx;
let tenantId: string;
let admin: TestUser, teacher: TestUser, student: TestUser;
let courseId: string;
let sessionId: string;

beforeAll(async () => {
  ctx = await makeApp();
  tenantId = (await createTenant(ctx.deps)).id;
  [admin, teacher, student] = await Promise.all([
    createUser(ctx.deps, tenantId, 'school_admin'),
    createUser(ctx.deps, tenantId, 'teacher'),
    createUser(ctx.deps, tenantId, 'student'),
  ]);
  courseId = await createCourse(ctx.deps, tenantId, [teacher.uid], [student.uid]);
});

describe('teacher workflow', () => {
  it('creates an assignment that the student sees and plays', async () => {
    const a = await api(ctx, teacher, 'POST', '/api/teacher/assignments', { courseId, missionId: 'M05', dueAt: '2026-12-01T10:00:00.000Z', note: 'Week 3' });
    expect(a.status).toBe(200);
    const prog = await api(ctx, student, 'GET', '/api/student/progress');
    expect(prog.body.assignments.map((x: any) => x.missionId)).toContain('M05');
    const start = await api(ctx, student, 'POST', '/api/sessions', { missionId: 'M05', assignmentId: a.body.assignment.id });
    expect(start.status).toBe(200);
    sessionId = start.body.session.id;
    for (const line of getBuiltinMission('M05')!.stages.flatMap((s) => s.sampleStudentLines)) {
      const r = await api(ctx, student, 'POST', `/api/sessions/${sessionId}/turns`, { clientTurnId: uuid(), text: line });
      if (r.body.session?.status === 'ready_to_complete') break;
    }
    expect((await api(ctx, student, 'POST', `/api/sessions/${sessionId}/complete`)).status).toBe(200);
  });

  it('shows class progress and results', async () => {
    const list = await api(ctx, teacher, 'GET', '/api/teacher/classes');
    expect(list.body.classes.map((c: any) => c.id)).toEqual([courseId]);
    const cls = await api(ctx, teacher, 'GET', `/api/teacher/classes/${courseId}`);
    expect(cls.body.students).toHaveLength(1);
    expect(cls.body.students[0].missionsCompleted).toBe(1);
    expect(cls.body.students[0].pendingReview).toBe(1);
    expect(cls.body.assignments[0].completedBy).toBe(1);
    expect(cls.body.results[0].sessionId).toBe(sessionId);
    const st = await api(ctx, teacher, 'GET', `/api/teacher/students/${student.uid}`);
    expect(st.body.sessions[0].id).toBe(sessionId);
  });

  it('reviews and adjusts an AI assessment', async () => {
    const before = await api(ctx, teacher, 'GET', `/api/teacher/sessions/${sessionId}`);
    expect(before.body.assessment.teacherReview).toBeNull();
    const r = await api(ctx, teacher, 'PUT', `/api/teacher/assessments/${sessionId}/review`, { scores: { grammar: 12, fluency: 10 }, comment: 'Good job, watch your verb tenses.' });
    expect(r.status).toBe(200);
    expect(r.body.assessment.teacherReview.status).toBe('adjusted');
    const after = await api(ctx, student, 'GET', `/api/sessions/${sessionId}/results`);
    expect(after.body.assessment.criteria.grammar.score).toBe(12);
    expect(after.body.assessment.criteria.grammar.source).toBe('teacher');
    expect(after.body.assessment.criteria.fluency.score).toBe(10);
    expect(after.body.assessment.aiCriteria.fluency.status).toBe('not_assessed');
    expect(after.body.assessment.teacherReview.comment).toContain('verb tenses');
  });

  it('rejects invalid review scores', async () => {
    const r = await api(ctx, teacher, 'PUT', `/api/teacher/assessments/${sessionId}/review`, { scores: { grammar: -5 }, comment: '' });
    expect(r.status).toBe(400);
  });

  it('exports results as CSV', async () => {
    const r = await api(ctx, teacher, 'GET', `/api/teacher/export.csv?courseId=${courseId}`);
    expect(r.status).toBe(200);
    expect(r.raw.headers['content-type']).toContain('text/csv');
    const text = r.raw.body;
    expect(text.split('\r\n')[0]).toContain('student_code,student_name,email,mission_id');
    expect(text).toContain(student.email);
    expect(text).toContain('M05');
    expect(text).toContain('adjusted');
  });

  it('exposes LMS evidence for the school', async () => {
    const r = await api(ctx, admin, 'GET', `/api/lms/v1/results?courseId=${courseId}`);
    expect(r.status).toBe(200);
    expect(r.body.items[0]).toMatchObject({
      schema: 'k26-evidence-1.0',
      source: 'english-city-simulator',
      learner: { uid: student.uid, email: student.email },
      activity: { id: 'M05', type: 'speaking_mission' },
      result: { scoreType: 'teacher_validated', speakingEvidence: false, completed: true },
    });
    const one = await api(ctx, admin, 'GET', `/api/lms/v1/evidence/${sessionId}`);
    expect(one.body.evidenceId).toBe(`ecs:${tenantId}:${sessionId}`);
  });
});

describe('school administration', () => {
  it('creates users and courses and keeps membership in sync', async () => {
    const t = await api(ctx, admin, 'POST', '/api/admin/users', { email: `gv-${uuid().slice(0, 6)}@test.edu.vn`, displayName: 'Cô Lan', role: 'teacher' });
    expect(t.status).toBe(200);
    expect(t.body.temporaryPassword).toMatch(/.{12,}/);
    const c = await api(ctx, admin, 'POST', '/api/admin/courses', { code: 'ENG201', name: 'English 2', teacherIds: [t.body.uid], studentIds: [student.uid] });
    expect(c.status).toBe(200);
    const me = await api(ctx, student, 'GET', '/api/me');
    expect(me.body.user.courseIds).toContain(c.body.course.id);
    await api(ctx, admin, 'PATCH', `/api/admin/courses/${c.body.course.id}`, { studentIds: [] });
    const me2 = await api(ctx, student, 'GET', '/api/me');
    expect(me2.body.user.courseIds).not.toContain(c.body.course.id);
    const bad = await api(ctx, admin, 'POST', '/api/admin/courses', { code: 'X', name: 'X', teacherIds: [student.uid] });
    expect(bad.status).toBe(400);
  });

  it('imports users from CSV and reports bad rows', async () => {
    const courses = await api(ctx, admin, 'GET', '/api/admin/courses');
    const code = courses.body.courses[0].code;
    const csv = [
      'email,displayName,role,studentCode,courseCode,password',
      `sv1-${uuid().slice(0, 6)}@test.edu.vn,Nguyễn Văn A,student,SV001,${code},Password-123`,
      `sv2-${uuid().slice(0, 6)}@test.edu.vn,"Trần Thị B",student,SV002,,`,
      'not-an-email,Bad,student,,,',
      `x-${uuid().slice(0, 6)}@test.edu.vn,Bad Course,student,,NOPE,`,
    ].join('\n');
    const r = await api(ctx, admin, 'POST', '/api/admin/users/import', { csv });
    expect(r.status).toBe(200);
    expect(r.body.imported).toBe(2);
    expect(r.body.errors).toHaveLength(2);
    const first = r.body.results[0];
    // The imported student can sign in and is placed in the course.
    const token = await signIn(first.email, 'Password-123');
    const me = await api(ctx, { uid: first.uid, email: first.email, token }, 'GET', '/api/me');
    expect(me.body.user.studentCode).toBe('SV001');
    expect(me.body.user.courseIds).toHaveLength(1);
    expect(r.body.results[1].temporaryPassword).toBeTruthy();
  });

  it('changes roles and disables accounts', async () => {
    const u = await createUser(ctx.deps, tenantId, 'student');
    await new Promise((r) => setTimeout(r, 1100)); // revocation is second-granular
    expect((await api(ctx, admin, 'PATCH', `/api/admin/users/${u.uid}`, { role: 'teacher' })).status).toBe(200);
    // Old tokens (with the old role) are revoked.
    expect((await api(ctx, u, 'GET', '/api/me')).status).toBe(401);
    await new Promise((r) => setTimeout(r, 1100)); // revocation is second-granular
    const fresh = { ...u, token: await signIn(u.email) };
    expect((await api(ctx, fresh, 'GET', '/api/teacher/classes')).status).toBe(200);
    await new Promise((r) => setTimeout(r, 1100));
    await api(ctx, admin, 'PATCH', `/api/admin/users/${u.uid}`, { disabled: true });
    expect((await api(ctx, fresh, 'GET', '/api/me')).status).toBe(401);
    expect((await api(ctx, admin, 'PATCH', `/api/admin/users/${admin.uid}`, { role: 'student' })).status).toBe(400);
  });

  it('mission bank: drafts are hidden until approved, invalid content is rejected', async () => {
    const t2 = await createTenant(ctx.deps, { approve: false });
    const a2 = await createUser(ctx.deps, t2.id, 'school_admin');
    const s2 = await createUser(ctx.deps, t2.id, 'student');
    expect((await api(ctx, s2, 'GET', '/api/missions')).body.missions).toHaveLength(0);
    expect((await api(ctx, s2, 'POST', '/api/sessions', { missionId: 'M01' })).status).toBe(404);
    const list = await api(ctx, a2, 'GET', '/api/admin/missions');
    expect(list.body.missions.every((m: any) => m.pendingApproval)).toBe(true);
    expect((await api(ctx, a2, 'POST', '/api/admin/missions/M01/approve', { version: 1 })).status).toBe(200);
    expect((await api(ctx, s2, 'GET', '/api/missions')).body.missions.map((m: any) => m.id)).toEqual(['M01']);

    const content = structuredClone(BUILTIN_MISSIONS[0]!) as any;
    content.title.en = 'Airport Check-in (edited)';
    const saved = await api(ctx, a2, 'PUT', '/api/admin/missions/M01', { content, note: 'title edit' });
    expect(saved.body.version).toBe(2);
    // Students still get version 1 until approval.
    expect((await api(ctx, s2, 'GET', '/api/missions/M01')).body.mission.title.en).toBe(BUILTIN_MISSIONS[0]!.title.en);
    await api(ctx, a2, 'POST', '/api/admin/missions/M01/approve', { version: 2 });
    expect((await api(ctx, s2, 'GET', '/api/missions/M01')).body.mission.title.en).toBe('Airport Check-in (edited)');

    content.rubric.grammar = 50;
    const invalid = await api(ctx, a2, 'PUT', '/api/admin/missions/M01', { content });
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(invalid.body.error.details)).toContain('Rubric must total 100');
    // Archive hides a mission.
    await api(ctx, a2, 'POST', '/api/admin/missions/M01/archive', { archived: true });
    expect((await api(ctx, s2, 'GET', '/api/missions')).body.missions).toHaveLength(0);
  });

  it('updates AI settings and quotas with validation', async () => {
    const s = await api(ctx, admin, 'GET', '/api/admin/settings');
    expect(s.body.quotas.aiCallsPerStudentPerDay).toBeGreaterThan(0);
    const q = { ...s.body.quotas, aiCallsPerStudentPerDay: 80, monthlyBudgetUsd: 250 };
    expect((await api(ctx, admin, 'PUT', '/api/admin/quotas', q)).status).toBe(200);
    expect((await api(ctx, admin, 'PUT', '/api/admin/quotas', { ...q, warnRatio: 5 })).status).toBe(400);
    const ai = { ...s.body.aiConfig, temperature: 0.5, audioRetentionDays: 7 };
    expect((await api(ctx, admin, 'PUT', '/api/admin/ai-config', ai)).status).toBe(200);
    const s2 = await api(ctx, admin, 'GET', '/api/admin/settings');
    expect(s2.body.quotas.monthlyBudgetUsd).toBe(250);
    expect(s2.body.aiConfig.audioRetentionDays).toBe(7);
    const h = await api(ctx, admin, 'POST', '/api/admin/health/ai');
    expect(h.body.ok).toBe(true);
  });

  it('reports usage and audit logs, exports usage CSV', async () => {
    const u = await api(ctx, admin, 'GET', '/api/admin/usage');
    expect(u.status).toBe(200);
    expect(u.body.byKind.converse.calls).toBeGreaterThan(0);
    expect(u.body.totals.costUsd).toBeGreaterThan(0);
    expect(u.body.budget.monthlyBudgetUsd).toBe(250);
    const csv = await api(ctx, admin, 'GET', '/api/admin/usage.csv');
    expect(csv.raw.body).toContain('converse');
    const logs = await api(ctx, admin, 'GET', '/api/admin/audit-logs');
    const actions = logs.body.logs.map((l: any) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['settings.quotas', 'user.create', 'course.create', 'export.usage']));
    const ov = await api(ctx, admin, 'GET', '/api/admin/reports/overview');
    expect(ov.body.users).toBeGreaterThan(2);
  });

  it('deletes a user\'s data on request', async () => {
    const u = await createUser(ctx.deps, tenantId, 'student');
    const id = (await api(ctx, u, 'POST', '/api/sessions', { missionId: 'M01' })).body.session.id;
    await api(ctx, u, 'POST', `/api/sessions/${id}/turns`, { clientTurnId: uuid(), text: 'Hello, I would like to check in.' });
    await api(ctx, u, 'POST', `/api/sessions/${id}/complete`);
    const r = await api(ctx, admin, 'DELETE', `/api/admin/users/${u.uid}`);
    expect(r.status).toBe(200);
    expect(r.body.sessions).toBe(1);
    expect((await api(ctx, admin, 'GET', `/api/teacher/sessions/${id}`)).status).toBe(404);
    await expect(signIn(u.email)).rejects.toThrow();
  });
});

describe('platform administration', () => {
  it('creates a school with a school admin and draft missions', async () => {
    const p = await createPlatformAdmin(ctx.deps);
    const id = `uni-${uuid().slice(0, 6)}`;
    const r = await api(ctx, p, 'POST', '/api/platform/tenants', { id, name: 'Đại học Thử nghiệm', allowedEmailDomains: ['thunghiem.edu.vn'], adminEmail: `admin@${id}.edu.vn`, adminName: 'Admin' });
    expect(r.status).toBe(200);
    expect(r.body.admin.temporaryPassword).toBeTruthy();
    const token = await signIn(`admin@${id}.edu.vn`, r.body.admin.temporaryPassword);
    const adminUser = { uid: r.body.admin.uid, email: `admin@${id}.edu.vn`, token };
    const ms = await api(ctx, adminUser, 'GET', '/api/admin/missions');
    expect(ms.body.missions).toHaveLength(6);
    expect((await api(ctx, p, 'POST', '/api/platform/tenants', { id, name: 'Dup', adminEmail: 'x@y.vn', adminName: 'X' })).status).toBe(409);
  });

  it('self-provisions students from an allowed e-mail domain', async () => {
    const p = await createPlatformAdmin(ctx.deps);
    const id = `dom-${uuid().slice(0, 6)}`;
    await api(ctx, p, 'POST', '/api/platform/tenants', { id, name: 'Domain Uni', allowedEmailDomains: [`${id}.edu.vn`], adminEmail: `a@${id}.edu.vn`, adminName: 'A' });
    const email = `student@${id}.edu.vn`;
    await ctx.deps.auth.createUser({ email, password: 'Test-password-123' });
    const t1 = await signIn(email);
    const first = await api(ctx, { uid: '', email, token: t1 }, 'GET', '/api/me');
    expect(first.body.refreshToken).toBe(true);
    const t2 = await signIn(email);
    const second = await api(ctx, { uid: '', email, token: t2 }, 'GET', '/api/me');
    expect(second.body.user.role).toBe('student');
    expect(second.body.user.tenantId).toBe(id);
  });
});
