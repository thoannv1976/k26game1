import { BUILTIN_MISSIONS, MissionContentSchema, type MissionContent, type MissionDoc } from '@ecs/shared';
import type { Deps } from '../deps.js';
import { ApiError, notFound } from '../errors.js';
import { paths } from '../paths.js';

interface VersionDoc {
  version: number;
  content: MissionContent;
  status: 'draft' | 'approved' | 'superseded';
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  note: string;
}

/**
 * Seeds the built-in mission bank into a school. Missions are created as drafts unless
 * `approvedBy` is given (e.g. after teachers reviewed the content offline).
 */
export async function seedBuiltinMissions(deps: Deps, tenantId: string, opts: { approvedBy?: string; overwrite?: boolean } = {}) {
  const p = paths(deps.db);
  const now = deps.now().toISOString();
  let created = 0;
  for (const m of BUILTIN_MISSIONS) {
    const ref = p.mission(tenantId, m.id);
    const snap = await ref.get();
    if (snap.exists && !opts.overwrite) continue;
    const prev = snap.data() as MissionDoc | undefined;
    const version = (prev?.latestVersion ?? 0) + 1;
    const approved = Boolean(opts.approvedBy);
    await p.missionVersions(tenantId, m.id).doc(String(version)).set({
      version,
      content: m,
      status: approved ? 'approved' : 'draft',
      createdBy: 'system:seed',
      createdAt: now,
      approvedBy: opts.approvedBy ?? null,
      approvedAt: approved ? now : null,
      note: 'Built-in content v1.0',
    } satisfies VersionDoc);
    const doc: MissionDoc = {
      id: m.id,
      locationId: m.locationId,
      level: m.level,
      approvedVersion: approved ? version : (prev?.approvedVersion ?? 0),
      latestVersion: version,
      status: approved ? 'approved' : (prev?.status ?? 'draft'),
      content: approved ? m : (prev?.content ?? null),
      updatedAt: now,
    };
    await ref.set(doc);
    created++;
  }
  return { created };
}

export async function listMissionsAdmin(deps: Deps, tenantId: string) {
  const snap = await paths(deps.db).missions(tenantId).get();
  return snap.docs
    .map((d) => d.data() as MissionDoc)
    .map((d) => ({
      id: d.id,
      locationId: d.locationId,
      level: d.level,
      status: d.status,
      approvedVersion: d.approvedVersion,
      latestVersion: d.latestVersion,
      title: d.content?.title ?? null,
      pendingApproval: d.latestVersion > d.approvedVersion,
      updatedAt: d.updatedAt,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getMissionAdmin(deps: Deps, tenantId: string, id: string) {
  const p = paths(deps.db);
  const doc = (await p.mission(tenantId, id).get()).data() as MissionDoc | undefined;
  if (!doc) throw notFound('Mission');
  const versions = (await p.missionVersions(tenantId, id).orderBy('version', 'desc').limit(20).get()).docs.map((d) => d.data() as VersionDoc);
  return { mission: doc, versions };
}

/** Saves edited content as a new draft version (students keep seeing the approved version). */
export async function saveMissionDraft(deps: Deps, tenantId: string, id: string, content: unknown, actorUid: string, note: string) {
  const parsed = MissionContentSchema.safeParse(content);
  if (!parsed.success) {
    throw new ApiError('VALIDATION', 'Mission content is invalid', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  if (parsed.data.id !== id) throw new ApiError('VALIDATION', 'Mission id in content must match the URL');
  const p = paths(deps.db);
  return deps.db.runTransaction(async (tx) => {
    const ref = p.mission(tenantId, id);
    const doc = (await tx.get(ref)).data() as MissionDoc | undefined;
    const version = (doc?.latestVersion ?? 0) + 1;
    const now = deps.now().toISOString();
    tx.set(p.missionVersions(tenantId, id).doc(String(version)), {
      version,
      content: parsed.data,
      status: 'draft',
      createdBy: actorUid,
      createdAt: now,
      approvedBy: null,
      approvedAt: null,
      note,
    } satisfies VersionDoc);
    tx.set(ref, {
      id,
      locationId: parsed.data.locationId,
      level: parsed.data.level,
      approvedVersion: doc?.approvedVersion ?? 0,
      latestVersion: version,
      status: doc?.status ?? 'draft',
      content: doc?.content ?? null,
      updatedAt: now,
    } satisfies MissionDoc);
    return { version };
  });
}

/** Approves a version: it becomes the content served to students. */
export async function approveMission(deps: Deps, tenantId: string, id: string, version: number, actorUid: string) {
  const p = paths(deps.db);
  return deps.db.runTransaction(async (tx) => {
    const ref = p.mission(tenantId, id);
    const vRef = p.missionVersions(tenantId, id).doc(String(version));
    const [doc, v] = await Promise.all([tx.get(ref), tx.get(vRef)]);
    if (!doc.exists || !v.exists) throw notFound('Mission version');
    const vd = v.data() as VersionDoc;
    const now = deps.now().toISOString();
    const d = doc.data() as MissionDoc;
    if (d.approvedVersion && d.approvedVersion !== version) {
      tx.update(p.missionVersions(tenantId, id).doc(String(d.approvedVersion)), { status: 'superseded' });
    }
    tx.update(vRef, { status: 'approved', approvedBy: actorUid, approvedAt: now });
    tx.update(ref, {
      approvedVersion: version,
      status: 'approved',
      content: MissionContentSchema.parse(vd.content),
      locationId: vd.content.locationId,
      level: vd.content.level,
      updatedAt: now,
    });
    return { approvedVersion: version };
  });
}

export async function setMissionArchived(deps: Deps, tenantId: string, id: string, archived: boolean) {
  const ref = paths(deps.db).mission(tenantId, id);
  const doc = (await ref.get()).data() as MissionDoc | undefined;
  if (!doc) throw notFound('Mission');
  const status = archived ? 'archived' : doc.approvedVersion > 0 ? 'approved' : 'draft';
  await ref.update({ status, updatedAt: deps.now().toISOString() });
  return { status };
}
