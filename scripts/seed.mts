/**
 * Seeds a school (tenant), its first admin and the built-in mission bank.
 *
 * Local emulators (demo data, missions pre-approved):
 *   npm run seed:local
 * Real project (from Cloud Shell, logged in with gcloud auth application-default login):
 *   npx tsx scripts/seed.mts --project k26game1 --tenant dnu --name "Đại học Đại Nam" \
 *       --admin-email admin@dnu.edu.vn [--domain dnu.edu.vn] [--demo] [--approve] [--platform-admin you@gmail.com]
 *
 * --demo     also creates a demo course with 1 teacher and 3 students (for acceptance testing)
 * --approve  marks the built-in missions as approved (otherwise teachers must approve them in Admin → Missions)
 */
import { parseArgs } from 'node:util';
import { DEFAULT_AI_CONFIG, DEFAULT_QUOTAS, type TenantDoc } from '@ecs/shared';

const { values } = parseArgs({
  options: {
    local: { type: 'boolean', default: false },
    project: { type: 'string' },
    tenant: { type: 'string', default: 'demo-university' },
    name: { type: 'string', default: 'Demo University' },
    'admin-email': { type: 'string', default: 'admin@demo.edu.vn' },
    domain: { type: 'string', multiple: true, default: [] },
    demo: { type: 'boolean', default: false },
    approve: { type: 'boolean', default: false },
    'platform-admin': { type: 'string' },
  },
});

if (values.local) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8085';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.GCP_PROJECT_ID = 'demo-ecs';
  values.demo = true;
  values.approve = true;
} else if (values.project) {
  process.env.GCP_PROJECT_ID = values.project;
} else {
  console.error('Use --local (emulators) or --project <id>.');
  process.exit(1);
}

const { loadConfig } = await import('../apps/api/src/config.js');
const { createDeps } = await import('../apps/api/src/deps.js');
const { paths } = await import('../apps/api/src/paths.js');
const { seedBuiltinMissions } = await import('../apps/api/src/services/missions.js');
const { provisionUser } = await import('../apps/api/src/services/users.js');

const deps = createDeps(loadConfig({ env: 'development', aiProvider: 'fake', speechProvider: 'fake', ttsProvider: 'fake', blobStore: 'memory' }));
const p = paths(deps.db);
const DEMO_PASSWORD = 'Demo-12345';

const tenantRef = p.tenant(values.tenant!);
if (!(await tenantRef.get()).exists) {
  const t: TenantDoc = {
    id: values.tenant!,
    name: values.name!,
    allowedEmailDomains: values.domain as string[],
    quotas: DEFAULT_QUOTAS,
    aiConfig: DEFAULT_AI_CONFIG,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await tenantRef.set(t);
  console.log(`Created school ${t.id} – ${t.name}`);
} else {
  console.log(`School ${values.tenant} already exists`);
}

const seeded = await seedBuiltinMissions(deps, values.tenant!, values.approve ? { approvedBy: 'seed-script' } : {});
console.log(`Missions seeded: ${seeded.created} (${values.approve ? 'approved' : 'draft – approve them in Admin → Missions'})`);

const creds: string[][] = [];
const admin = await provisionUser(deps, { id: values.tenant! }, {
  email: values['admin-email']!.toLowerCase(), displayName: 'School Admin', role: 'school_admin', level: 'B1', courseIds: [],
  ...(values.local ? { password: DEMO_PASSWORD } : {}),
});
creds.push(['school_admin', values['admin-email']!, admin.password ?? (values.local ? DEMO_PASSWORD : '(existing account – unchanged)')]);

if (values.demo) {
  const pw = values.local ? { password: DEMO_PASSWORD } : {};
  const teacher = await provisionUser(deps, { id: values.tenant! }, { email: 'teacher@demo.edu.vn', displayName: 'Cô Nguyễn Thu Hà', role: 'teacher', level: 'B1', courseIds: [], ...pw });
  creds.push(['teacher', 'teacher@demo.edu.vn', teacher.password ?? DEMO_PASSWORD]);
  const students = [];
  for (const [i, name] of ['Trần Minh Anh', 'Lê Hoàng Nam', 'Phạm Thu Trang'].entries()) {
    const email = `student${i + 1}@demo.edu.vn`;
    const s = await provisionUser(deps, { id: values.tenant! }, { email, displayName: name, role: 'student', studentCode: `SV00${i + 1}`, level: 'B1', courseIds: [], ...pw });
    students.push(s.uid);
    creds.push(['student', email, s.password ?? DEMO_PASSWORD]);
  }
  const courseRef = p.course(values.tenant!, 'eng-comm-1');
  await courseRef.set({ id: 'eng-comm-1', tenantId: values.tenant!, code: 'ENG101', name: 'English Communication 1', teacherIds: [teacher.uid], studentIds: students, monthlyBudgetUsd: null, createdAt: new Date().toISOString() });
  for (const uid of [teacher.uid, ...students]) await p.user(values.tenant!, uid).update({ courseIds: ['eng-comm-1'] });
  console.log('Demo course ENG101 created');
}

if (values['platform-admin']) {
  const email = values['platform-admin'];
  let uid: string;
  try {
    uid = (await deps.auth.getUserByEmail(email)).uid;
  } catch {
    const rec = await deps.auth.createUser({ email, password: values.local ? DEMO_PASSWORD : undefined });
    uid = rec.uid;
  }
  await deps.auth.setCustomUserClaims(uid, { role: 'platform_admin' });
  creds.push(['platform_admin', email, values.local ? DEMO_PASSWORD : '(set via password reset)']);
}

console.log('\nAccounts (store passwords safely; users should change them):');
console.table(creds.map(([role, email, password]) => ({ role, email, password })));
process.exit(0);
