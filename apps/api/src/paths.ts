import type { Firestore } from 'firebase-admin/firestore';

/** Firestore layout (see docs/DATABASE.md). All learning data lives under tenants/{tenantId}. */
export const paths = (db: Firestore) => ({
  tenant: (t: string) => db.collection('tenants').doc(t),
  tenants: () => db.collection('tenants'),
  users: (t: string) => db.collection(`tenants/${t}/users`),
  user: (t: string, uid: string) => db.doc(`tenants/${t}/users/${uid}`),
  courses: (t: string) => db.collection(`tenants/${t}/courses`),
  course: (t: string, id: string) => db.doc(`tenants/${t}/courses/${id}`),
  assignments: (t: string) => db.collection(`tenants/${t}/assignments`),
  missions: (t: string) => db.collection(`tenants/${t}/missions`),
  mission: (t: string, id: string) => db.doc(`tenants/${t}/missions/${id}`),
  missionVersions: (t: string, id: string) => db.collection(`tenants/${t}/missions/${id}/versions`),
  sessions: (t: string) => db.collection(`tenants/${t}/game_sessions`),
  session: (t: string, id: string) => db.doc(`tenants/${t}/game_sessions/${id}`),
  turns: (t: string, sid: string) => db.collection(`tenants/${t}/game_sessions/${sid}/conversation_turns`),
  turn: (t: string, sid: string, id: string) => db.doc(`tenants/${t}/game_sessions/${sid}/conversation_turns/${id}`),
  assessments: (t: string) => db.collection(`tenants/${t}/assessments`),
  assessment: (t: string, sid: string) => db.doc(`tenants/${t}/assessments/${sid}`),
  counters: (t: string) => db.collection(`tenants/${t}/usage_counters`),
  counter: (t: string, id: string) => db.doc(`tenants/${t}/usage_counters/${id}`),
  usageLogs: (t: string) => db.collection(`tenants/${t}/usage_logs`),
  auditLogs: (t: string) => db.collection(`tenants/${t}/audit_logs`),
  locations: () => db.collection('locations'),
  platformAudit: () => db.collection('platform_audit_logs'),
});
export type Paths = ReturnType<typeof paths>;
