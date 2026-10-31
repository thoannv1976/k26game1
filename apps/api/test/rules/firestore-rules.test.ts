import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

let env: RulesTestEnvironment;
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8085').split(':');

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ecs-rules',
    firestore: { rules: readFileSync(new URL('../../../../firebase/firestore.rules', import.meta.url), 'utf8'), host: host!, port: Number(port) },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'tenants/A'), { id: 'A', name: 'A' });
    await setDoc(doc(db, 'tenants/B'), { id: 'B', name: 'B' });
    await setDoc(doc(db, 'tenants/A/users/s1'), { uid: 's1', role: 'student' });
    await setDoc(doc(db, 'tenants/A/users/s2'), { uid: 's2', role: 'student' });
    await setDoc(doc(db, 'tenants/A/game_sessions/g1'), { uid: 's1' });
    await setDoc(doc(db, 'tenants/A/game_sessions/g1/conversation_turns/t1'), { text: 'hi' });
    await setDoc(doc(db, 'tenants/A/assessments/g1'), { uid: 's1', percent: 80 });
    await setDoc(doc(db, 'tenants/A/missions/M01'), { status: 'approved' });
    await setDoc(doc(db, 'tenants/A/missions/M02'), { status: 'draft' });
    await setDoc(doc(db, 'tenants/A/courses/c1'), { code: 'ENG' });
    await setDoc(doc(db, 'tenants/A/usage_logs/u1'), { kind: 'converse' });
    await setDoc(doc(db, 'tenants/B/game_sessions/gb'), { uid: 'sb' });
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const as = (uid: string, tenantId: string | null, role: string) =>
  env.authenticatedContext(uid, tenantId ? { tenantId, role } : { role }).firestore();

describe('Firestore security rules', () => {
  it('unauthenticated users can read nothing', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'tenants/A/users/s1')));
    await assertFails(getDoc(doc(db, 'tenants/A/missions/M01')));
  });

  it('a student reads only their own profile, sessions, turns and assessments', async () => {
    const db = as('s1', 'A', 'student');
    await assertSucceeds(getDoc(doc(db, 'tenants/A/users/s1')));
    await assertSucceeds(getDoc(doc(db, 'tenants/A/game_sessions/g1')));
    await assertSucceeds(getDoc(doc(db, 'tenants/A/game_sessions/g1/conversation_turns/t1')));
    await assertSucceeds(getDoc(doc(db, 'tenants/A/assessments/g1')));
    await assertSucceeds(getDoc(doc(db, 'tenants/A/missions/M01')));
    await assertFails(getDoc(doc(db, 'tenants/A/missions/M02'))); // draft
    await assertFails(getDoc(doc(db, 'tenants/A/courses/c1')));
    await assertFails(getDoc(doc(db, 'tenants/A/usage_logs/u1')));
    await assertFails(getDoc(doc(db, 'tenants/A')));
  });

  it('a student cannot read another student\'s data', async () => {
    const db = as('s2', 'A', 'student');
    await assertFails(getDoc(doc(db, 'tenants/A/users/s1')));
    await assertFails(getDoc(doc(db, 'tenants/A/game_sessions/g1')));
    await assertFails(getDoc(doc(db, 'tenants/A/game_sessions/g1/conversation_turns/t1')));
    await assertFails(getDoc(doc(db, 'tenants/A/assessments/g1')));
    await assertFails(getDocs(collection(db, 'tenants/A/assessments')));
  });

  it('nobody can write from the client – scores are server-side only', async () => {
    for (const db of [as('s1', 'A', 'student'), as('t1', 'A', 'teacher'), as('a1', 'A', 'school_admin')]) {
      await assertFails(updateDoc(doc(db, 'tenants/A/assessments/g1'), { percent: 100 }));
      await assertFails(setDoc(doc(db, 'tenants/A/users/s1'), { role: 'school_admin' }));
      await assertFails(setDoc(doc(db, 'tenants/A/game_sessions/new'), { uid: 's1' }));
      await assertFails(setDoc(doc(db, 'tenants/A/missions/M01'), { status: 'approved' }));
    }
  });

  it('school admins read their school but never another school', async () => {
    const db = as('a1', 'A', 'school_admin');
    await assertSucceeds(getDoc(doc(db, 'tenants/A/game_sessions/g1')));
    await assertSucceeds(getDoc(doc(db, 'tenants/A/usage_logs/u1')));
    await assertSucceeds(getDoc(doc(db, 'tenants/A/courses/c1')));
    await assertFails(getDoc(doc(db, 'tenants/B/game_sessions/gb')));
    await assertFails(getDoc(doc(db, 'tenants/B')));
  });

  it('users of school B cannot read school A', async () => {
    const db = as('sb', 'B', 'student');
    await assertFails(getDoc(doc(db, 'tenants/A/game_sessions/g1')));
    await assertFails(getDoc(doc(db, 'tenants/A/missions/M01')));
  });

  it('platform admins get no learning data', async () => {
    const db = as('p1', null, 'platform_admin');
    await assertFails(getDoc(doc(db, 'tenants/A/game_sessions/g1')));
    await assertFails(getDoc(doc(db, 'tenants/A/assessments/g1')));
    await assertFails(getDoc(doc(db, 'tenants/A/users/s1')));
  });

  it('teachers read draft missions for review but not sessions directly', async () => {
    const db = as('t1', 'A', 'teacher');
    await assertSucceeds(getDoc(doc(db, 'tenants/A/missions/M02')));
    await assertFails(getDoc(doc(db, 'tenants/A/game_sessions/g1')));
  });
});
