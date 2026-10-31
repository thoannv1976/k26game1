import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TeacherReviewInputSchema, toCsv, type AssessmentDoc, type AssignmentDoc, type CourseDoc, type SessionDoc, type TurnDoc, type UserDoc } from '@ecs/shared';
import { parseBody } from '../app.js';
import { requireTenantMember, type Member } from '../auth.js';
import type { Deps } from '../deps.js';
import { forbidden, notFound } from '../errors.js';
import { paths } from '../paths.js';
import { listApprovedMissions } from '../tenants.js';
import { audit } from '../audit.js';
import { canViewStudent, coursesFor } from '../services/access.js';
import { getResults, reviewAssessment } from '../services/assessment.js';

const STAFF = ['teacher', 'school_admin'] as const;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export async function assessmentsForStudents(deps: Deps, tenantId: string, uids: string[]): Promise<AssessmentDoc[]> {
  const p = paths(deps.db);
  const out: AssessmentDoc[] = [];
  for (const c of chunk(uids, 30)) {
    if (!c.length) continue;
    const snap = await p.assessments(tenantId).where('uid', 'in', c).get();
    out.push(...snap.docs.map((d) => d.data() as AssessmentDoc));
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function usersByIds(deps: Deps, tenantId: string, uids: string[]): Promise<UserDoc[]> {
  if (!uids.length) return [];
  const p = paths(deps.db);
  const snaps = await deps.db.getAll(...uids.map((u) => p.user(tenantId, u)));
  return snaps.filter((s) => s.exists).map((s) => s.data() as UserDoc);
}

async function ownCourse(deps: Deps, m: Member, courseId: string): Promise<CourseDoc> {
  const c = (await paths(deps.db).course(m.tenantId, courseId).get()).data() as CourseDoc | undefined;
  if (!c) throw notFound('Course');
  if (m.role !== 'school_admin' && !c.teacherIds.includes(m.uid)) throw forbidden('You do not teach this course');
  return c;
}

export async function teacherRoutes(app: FastifyInstance, deps: Deps) {
  const p = paths(deps.db);

  app.get('/api/teacher/classes', async (req) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    const courses = await coursesFor(deps, m);
    return {
      classes: courses.map((c) => ({ id: c.id, code: c.code, name: c.name, studentCount: c.studentIds.length, teacherCount: c.teacherIds.length, monthlyBudgetUsd: c.monthlyBudgetUsd })),
    };
  });

  app.get('/api/teacher/classes/:id', async (req) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    const c = await ownCourse(deps, m, (req.params as { id: string }).id);
    const [students, assessments, assignSnap, missions] = await Promise.all([
      usersByIds(deps, m.tenantId, c.studentIds),
      assessmentsForStudents(deps, m.tenantId, c.studentIds),
      p.assignments(m.tenantId).where('courseId', '==', c.id).get(),
      listApprovedMissions(deps, m.tenantId),
    ]);
    const assignments = assignSnap.docs.map((d) => d.data() as AssignmentDoc);
    return {
      course: { id: c.id, code: c.code, name: c.name, monthlyBudgetUsd: c.monthlyBudgetUsd },
      missions: missions.map((x) => ({ id: x.id, title: x.title, level: x.level, locationId: x.locationId })),
      assignments: assignments.map((a) => ({
        ...a,
        completedBy: students.filter((s) => assessments.some((x) => x.uid === s.uid && x.missionId === a.missionId && x.missionCompleted)).length,
      })),
      students: students
        .map((s) => {
          const mine = assessments.filter((a) => a.uid === s.uid);
          return {
            uid: s.uid,
            displayName: s.displayName,
            email: s.email,
            studentCode: s.studentCode ?? '',
            level: s.level,
            xp: s.xp,
            missionsCompleted: s.completedMissionIds?.length ?? 0,
            sessions: mine.length,
            averagePercent: mine.length ? Math.round(mine.reduce((n, a) => n + a.finalPercent, 0) / mine.length) : null,
            pendingReview: mine.filter((a) => !a.teacherReview).length,
            lastPlayedAt: mine[0]?.createdAt ?? null,
          };
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      results: assessments.slice(0, 200).map((a) => ({
        sessionId: a.sessionId,
        uid: a.uid,
        studentName: students.find((s) => s.uid === a.uid)?.displayName ?? a.uid,
        missionId: a.missionId,
        level: a.level,
        missionCompleted: a.missionCompleted,
        percent: a.percent,
        finalPercent: a.finalPercent,
        evidenceMode: a.evidenceMode,
        aiStatus: a.aiStatus,
        reviewed: a.teacherReview?.status ?? null,
        createdAt: a.createdAt,
      })),
    };
  });

  app.post('/api/teacher/assignments', async (req) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    const body = parseBody(
      z.object({ courseId: z.string().min(1), missionId: z.string().regex(/^M\d{2,3}$/), dueAt: z.iso.datetime().nullable().default(null), note: z.string().max(500).default('') }),
      req.body,
    );
    await ownCourse(deps, m, body.courseId);
    if (!(await listApprovedMissions(deps, m.tenantId)).some((x) => x.id === body.missionId)) throw notFound('Mission');
    const ref = p.assignments(m.tenantId).doc();
    const doc: AssignmentDoc = { id: ref.id, ...body, createdBy: m.uid, createdAt: deps.now().toISOString() };
    await ref.set(doc);
    await audit(deps, m, m.tenantId, 'assignment.create', ref.id, { courseId: body.courseId, missionId: body.missionId });
    return { assignment: doc };
  });

  app.delete('/api/teacher/assignments/:id', async (req) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    const ref = p.assignments(m.tenantId).doc((req.params as { id: string }).id);
    const a = (await ref.get()).data() as AssignmentDoc | undefined;
    if (!a) throw notFound('Assignment');
    await ownCourse(deps, m, a.courseId);
    await ref.delete();
    await audit(deps, m, m.tenantId, 'assignment.delete', a.id, {});
    return { ok: true };
  });

  app.get('/api/teacher/students/:uid', async (req) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    const { uid } = req.params as { uid: string };
    if (!(await canViewStudent(deps, m, uid))) throw forbidden('You cannot view this student');
    const [user] = await usersByIds(deps, m.tenantId, [uid]);
    if (!user) throw notFound('Student');
    const [sessions, assessments] = await Promise.all([
      p.sessions(m.tenantId).where('uid', '==', uid).orderBy('startedAt', 'desc').limit(100).get(),
      assessmentsForStudents(deps, m.tenantId, [uid]),
    ]);
    return {
      student: { uid: user.uid, displayName: user.displayName, email: user.email, studentCode: user.studentCode ?? '', level: user.level, xp: user.xp, achievements: user.achievements },
      sessions: sessions.docs.map((d) => {
        const s = d.data() as SessionDoc;
        const a = assessments.find((x) => x.sessionId === s.id);
        return { id: s.id, missionId: s.missionId, status: s.status, startedAt: s.startedAt, studentTurns: s.studentTurns, voiceTurns: s.voiceTurns, percent: a?.finalPercent ?? null, reviewed: Boolean(a?.teacherReview) };
      }),
    };
  });

  app.get('/api/teacher/sessions/:id', async (req) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    return getResults(deps, m, (req.params as { id: string }).id);
  });

  app.get('/api/teacher/sessions/:id/audio/:turnId', async (req, reply) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    const { id, turnId } = req.params as { id: string; turnId: string };
    const s = (await p.session(m.tenantId, id).get()).data() as SessionDoc | undefined;
    if (!s) throw notFound('Session');
    if (!(await canViewStudent(deps, m, s.uid))) throw forbidden();
    const t = (await p.turn(m.tenantId, id, turnId).get()).data() as TurnDoc | undefined;
    if (!t?.audioPath) throw notFound('Audio');
    const buf = await deps.blobs.get(t.audioPath);
    if (!buf) throw notFound('Audio (expired by retention policy)');
    return reply.header('Content-Type', 'audio/wav').header('Cache-Control', 'private, no-store').send(buf);
  });

  app.put('/api/teacher/assessments/:id/review', async (req) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    const body = parseBody(TeacherReviewInputSchema, req.body);
    const id = (req.params as { id: string }).id;
    const r = await reviewAssessment(deps, m, id, body);
    await audit(deps, m, m.tenantId, 'assessment.review', id, { status: r.teacherReview?.status, finalPercent: r.finalPercent });
    return { assessment: r };
  });

  app.get('/api/teacher/export.csv', async (req, reply) => {
    const m = requireTenantMember(req.authUser, [...STAFF]);
    const q = parseBody(z.object({ courseId: z.string().min(1) }), req.query);
    const c = await ownCourse(deps, m, q.courseId);
    const [students, assessments, missions] = await Promise.all([
      usersByIds(deps, m.tenantId, c.studentIds),
      assessmentsForStudents(deps, m.tenantId, c.studentIds),
      listApprovedMissions(deps, m.tenantId),
    ]);
    const headers = [
      'student_code', 'student_name', 'email', 'mission_id', 'mission_title', 'level', 'date', 'mission_completed', 'objectives_met',
      'task_completion', 'comprehension', 'grammar', 'vocabulary', 'fluency', 'ai_percent', 'final_percent', 'evidence_mode', 'teacher_review', 'teacher_comment', 'session_id',
    ];
    const cs = (a: AssessmentDoc, k: keyof AssessmentDoc['criteria']) => {
      const t = a.teacherReview?.scores[k];
      if (t !== undefined) return t;
      const v = a.criteria[k];
      return v.status === 'assessed' ? v.score : 'N/A';
    };
    const rows = assessments.map((a) => {
      const s = students.find((x) => x.uid === a.uid);
      return [
        s?.studentCode ?? '', s?.displayName ?? a.uid, s?.email ?? '', a.missionId, missions.find((x) => x.id === a.missionId)?.title.en ?? a.missionId, a.level,
        a.createdAt, a.missionCompleted ? 'yes' : 'no', `${a.objectivesMet}/${a.objectivesRequired}`,
        cs(a, 'taskCompletion'), cs(a, 'comprehension'), cs(a, 'grammar'), cs(a, 'vocabulary'), cs(a, 'fluency'),
        a.percent, a.finalPercent, a.evidenceMode, a.teacherReview?.status ?? 'pending', a.teacherReview?.comment ?? '', a.sessionId,
      ];
    });
    await audit(deps, m, m.tenantId, 'export.results', c.id, { rows: rows.length });
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="results-${c.code}.csv"`)
      .send(toCsv(headers, rows));
  });
}
