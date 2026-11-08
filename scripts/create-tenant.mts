/**
 * Creates a school (tenant) that is used through the LMS (UniGame Hub / LTI): no admin account is created,
 * teachers and students are provisioned on their first launch from Moodle.
 *
 *   npx tsx scripts/create-tenant.mts --project k26game1 --tenant aiedu2026 --name "AIEdu2026" [--approve]
 *
 * --approve  marks the built-in missions as approved so LMS activities can use them right away
 *            (otherwise a school admin must approve them in Admin → Missions).
 * Idempotent: an existing tenant or mission is left unchanged.
 * Requires Application Default Credentials with Firestore access to --project.
 */
import { parseArgs } from 'node:util';
import { DEFAULT_AI_CONFIG, DEFAULT_QUOTAS, type TenantDoc } from '@ecs/shared';

const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    tenant: { type: 'string' },
    name: { type: 'string' },
    approve: { type: 'boolean', default: false },
  },
});
if (!values.project || !values.tenant || !values.name || !/^[a-z0-9-]{3,40}$/.test(values.tenant)) {
  console.error('Usage: --project <id> --tenant <a-z0-9-> --name "<School name>" [--approve]');
  process.exit(1);
}
process.env.GCP_PROJECT_ID = values.project;

const { loadConfig } = await import('../apps/api/src/config.js');
const { createDeps } = await import('../apps/api/src/deps.js');
const { paths } = await import('../apps/api/src/paths.js');
const { seedBuiltinMissions } = await import('../apps/api/src/services/missions.js');

const deps = createDeps(loadConfig({ env: 'development', aiProvider: 'fake', speechProvider: 'fake', ttsProvider: 'fake', blobStore: 'memory' }));
const ref = paths(deps.db).tenant(values.tenant);
if (!(await ref.get()).exists) {
  const t: TenantDoc = {
    id: values.tenant,
    name: values.name,
    allowedEmailDomains: [],
    quotas: DEFAULT_QUOTAS,
    aiConfig: DEFAULT_AI_CONFIG,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await ref.set(t);
  console.log(`Created school ${t.id} – ${t.name}`);
} else {
  console.log(`School ${values.tenant} already exists (unchanged)`);
}
const seeded = await seedBuiltinMissions(deps, values.tenant, values.approve ? { approvedBy: 'lti-setup' } : {});
console.log(`Missions seeded: ${seeded.created} (${values.approve ? 'approved' : 'draft'})`);
process.exit(0);
