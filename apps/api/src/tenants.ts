import {
  DEFAULT_AI_CONFIG,
  DEFAULT_QUOTAS,
  MissionContentSchema,
  type MissionContent,
  type MissionDoc,
  type TenantDoc,
  type UserDoc,
} from '@ecs/shared';
import type { Deps } from './deps.js';
import { notFound } from './errors.js';
import { paths } from './paths.js';

export async function getTenant(deps: Deps, tenantId: string): Promise<TenantDoc> {
  const snap = await paths(deps.db).tenant(tenantId).get();
  if (!snap.exists) throw notFound('School');
  const t = snap.data() as TenantDoc;
  return {
    ...t,
    quotas: { ...DEFAULT_QUOTAS, ...(t.quotas ?? {}) },
    aiConfig: { ...DEFAULT_AI_CONFIG, ...(t.aiConfig ?? {}), pricing: { ...DEFAULT_AI_CONFIG.pricing, ...(t.aiConfig?.pricing ?? {}) } },
  };
}

export async function getUserDoc(deps: Deps, tenantId: string, uid: string): Promise<UserDoc | null> {
  const snap = await paths(deps.db).user(tenantId, uid).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

export async function getApprovedMission(deps: Deps, tenantId: string, missionId: string): Promise<MissionContent> {
  const snap = await paths(deps.db).mission(tenantId, missionId).get();
  const doc = snap.data() as MissionDoc | undefined;
  if (!doc || !doc.content || doc.approvedVersion < 1 || doc.status === 'archived') throw notFound('Mission');
  return MissionContentSchema.parse(doc.content);
}

/** Content of a specific mission version (used when a session started on an older version). */
export async function getMissionVersion(deps: Deps, tenantId: string, missionId: string, version: number): Promise<MissionContent> {
  const snap = await paths(deps.db).missionVersions(tenantId, missionId).doc(String(version)).get();
  if (snap.exists) return MissionContentSchema.parse((snap.data() as { content: unknown }).content);
  return getApprovedMission(deps, tenantId, missionId);
}

export async function listApprovedMissions(deps: Deps, tenantId: string): Promise<MissionContent[]> {
  const snap = await paths(deps.db).missions(tenantId).get();
  return snap.docs
    .map((d) => d.data() as MissionDoc)
    .filter((d) => d.content && d.approvedVersion > 0 && d.status !== 'archived')
    .map((d) => MissionContentSchema.parse(d.content))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Student-safe mission view: hides NPC facts, AI instructions and evidence keywords. */
export function publicMission(m: MissionContent) {
  return {
    id: m.id,
    locationId: m.locationId,
    level: m.level,
    title: m.title,
    summary: m.summary,
    briefing: m.briefing,
    goals: m.goals,
    estimatedMinutes: m.estimatedMinutes,
    xpReward: m.xpReward,
    studentCard: m.studentCard,
    npc: { name: m.npc.name, role: m.npc.role, avatar: m.npc.avatar, accent: m.npc.voice.languageCode },
    stages: m.stages.map((s) => ({ id: s.id, title: s.title, objectives: s.objectives.map((o) => ({ id: o.id, label: o.label, required: o.required })) })),
    targetVocabulary: m.targetVocabulary,
    limits: m.limits,
    rubric: m.rubric,
  };
}
export type PublicMission = ReturnType<typeof publicMission>;
