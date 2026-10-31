/**
 * Response shapes of the ECS API (see apps/api/src/routes/*.ts).
 * Core domain types come from @ecs/shared; the shapes below mirror route handlers.
 */
import type {
  AiConfig,
  AssessmentDoc,
  AssignmentDoc,
  CourseDoc,
  Criterion,
  CriterionResult,
  I18nText,
  Level,
  LocationInfo,
  MissionContent,
  MissionDoc,
  MissionLimits,
  QuotaConfig,
  Role,
  Rubric,
  SessionStatus,
  SessionView,
  Speaker,
  TurnMode,
  TurnResponse,
  UserDoc,
} from '@ecs/shared';

export type { SessionView, TurnResponse, UserDoc, Criterion, CriterionResult, Level, Role, I18nText };

/* ---------------- me ---------------- */
export interface PlatformUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'platform_admin';
  tenantId: null;
}
export type MeUser = UserDoc | PlatformUser;
export interface MeResponse {
  user: MeUser | null;
  tenant: { id: string; name: string } | null;
  refreshToken?: boolean;
}

export function isTenantUser(u: MeUser | null | undefined): u is UserDoc {
  return Boolean(u && u.role !== 'platform_admin');
}

/* ---------------- world ---------------- */
export interface LocationWithCount extends LocationInfo {
  missionCount: number;
}

export interface PublicMission {
  id: string;
  locationId: MissionContent['locationId'];
  level: Level;
  title: I18nText;
  summary: I18nText;
  briefing: I18nText;
  goals: I18nText[];
  estimatedMinutes: number;
  xpReward: number;
  studentCard: { label: string; value: string }[];
  npc: { name: string; role: string; avatar: string; accent: 'en-US' | 'en-GB' };
  stages: { id: string; title: string; objectives: { id: string; label: I18nText; required: boolean }[] }[];
  targetVocabulary: string[];
  limits: MissionLimits;
  rubric: Rubric;
}

export interface MissionListItem extends PublicMission {
  completed: boolean;
  bestPercent: number | null;
}

export interface MissionDetailResponse {
  mission: PublicMission;
  activeSessionId: string | null;
}

/* ---------------- sessions ---------------- */
export interface PublicTurn {
  id: string;
  seq: number;
  speaker: Speaker;
  text: string;
  mode: TurnMode;
  stageId: string;
  ttsHash: string | null;
  fallback: boolean;
  createdAt: string;
}

export interface SessionResponse {
  resumed?: boolean;
  session: SessionView;
  turns: PublicTurn[];
  mission: PublicMission;
}

export interface HintResponse {
  hint: string;
  session: SessionView;
}

export interface ReplayResponse {
  text: string;
  ttsHash: string | null;
  session: SessionView;
}

/* ---------------- results ---------------- */
export interface ResultTurn extends PublicTurn {
  hasAudio: boolean;
  objectivesCredited: string[];
}

export interface ResultsResponse {
  assessment: AssessmentDoc & { aiCriteria: Record<Criterion, CriterionResult> };
  turns: ResultTurn[];
  mission: {
    id: string;
    title: I18nText;
    level: Level;
    locationId: string;
    objectives: { id: string; label: I18nText; required: boolean; met: boolean }[];
  };
  session: {
    id: string;
    uid: string;
    startedAt: string;
    completedAt: string | null;
    studentTurns: number;
    voiceTurns: number;
    textTurns: number;
    hintsUsed: number;
    replaysUsed: number;
    activeSeconds: number;
  };
}

/* ---------------- student ---------------- */
export interface StudentProgress {
  user: UserDoc;
  stats: {
    xp: number;
    level: Level;
    missionsCompleted: number;
    missionsTotal: number;
    sessionsPlayed: number;
    averagePercent: number | null;
  };
  achievements: string[];
  recent: {
    sessionId: string;
    missionId: string;
    title: I18nText;
    level: Level;
    missionCompleted: boolean;
    percent: number;
    reviewed: boolean;
    createdAt: string;
  }[];
  recommendation: {
    nextMissionId: string | null;
    nextLevel: Level;
    reason: string;
    title: I18nText | null;
    tips: string[];
  } | null;
  activeSessions: { id: string; missionId: string; title: I18nText; status: SessionStatus; lastActivityAt: string }[];
  assignments: (AssignmentDoc & { courseName: string; completed: boolean })[];
}

/* ---------------- teacher ---------------- */
export interface TeacherClass {
  id: string;
  code: string;
  name: string;
  studentCount: number;
  teacherCount: number;
  monthlyBudgetUsd: number | null;
}

export interface ClassStudentRow {
  uid: string;
  displayName: string;
  email: string;
  studentCode: string;
  level: Level;
  xp: number;
  missionsCompleted: number;
  sessions: number;
  averagePercent: number | null;
  pendingReview: number;
  lastPlayedAt: string | null;
}

export interface ClassResultRow {
  sessionId: string;
  uid: string;
  studentName: string;
  missionId: string;
  level: Level;
  missionCompleted: boolean;
  percent: number;
  finalPercent: number;
  evidenceMode: 'voice' | 'text' | 'mixed';
  aiStatus: 'ok' | 'failed' | 'skipped';
  reviewed: 'confirmed' | 'adjusted' | null;
  createdAt: string;
}

export interface ClassDetail {
  course: { id: string; code: string; name: string; monthlyBudgetUsd: number | null };
  missions: { id: string; title: I18nText; level: Level; locationId: string }[];
  assignments: (AssignmentDoc & { completedBy: number })[];
  students: ClassStudentRow[];
  results: ClassResultRow[];
}

export interface TeacherStudentDetail {
  student: { uid: string; displayName: string; email: string; studentCode: string; level: Level; xp: number; achievements: string[] };
  sessions: { id: string; missionId: string; status: SessionStatus; startedAt: string; studentTurns: number; voiceTurns: number; percent: number | null; reviewed: boolean }[];
}

/* ---------------- admin ---------------- */
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: Exclude<Role, 'platform_admin'>;
  studentCode: string;
  level: Level;
  courseIds: string[];
  xp: number;
  disabled: boolean;
  createdAt: string;
}

export interface ImportResult {
  imported: number;
  results: { email: string; uid?: string; created?: boolean; temporaryPassword?: string | null; error?: string }[];
  errors: { line: number; error: string }[];
}

export interface AdminMissionRow {
  id: string;
  locationId: string;
  level: Level;
  status: MissionDoc['status'];
  approvedVersion: number;
  latestVersion: number;
  title: I18nText | null;
  pendingApproval: boolean;
  updatedAt: string;
}

export interface MissionVersion {
  version: number;
  content: MissionContent;
  status: 'draft' | 'approved' | 'superseded';
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  note: string;
}

export interface AdminMissionDetail {
  mission: MissionDoc;
  versions: MissionVersion[];
}

export interface AdminSettings {
  tenant: { id: string; name: string; allowedEmailDomains: string[] };
  aiConfig: AiConfig;
  quotas: QuotaConfig;
  modelOverride: string | null;
}

export interface AiHealth {
  ok: boolean;
  provider: string;
  model: string;
  reply?: string;
  error?: string;
  latencyMs: number;
  stt?: string;
  tts?: string;
}

export interface UsageReport {
  month: string;
  entries: number;
  totals: { costUsd: number; inputTokens: number; outputTokens: number; sttSeconds: number; ttsChars: number };
  byKind: Record<string, { calls: number; costUsd: number; failures: number }>;
  byDay: Record<string, { calls: number; costUsd: number }>;
  topUsers: { uid: string; name: string; calls: number; costUsd: number }[];
  budget: { monthlyBudgetUsd: number; usedRatio: number; warnRatio: number; policy: 'block' | 'warn_only' };
  note: string;
}

export interface AuditLog {
  id: string;
  at: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string | null;
  action: string;
  target: string;
  details: Record<string, unknown>;
}

export interface OverviewReport {
  users: number;
  sessions: number;
  recentAssessments: number;
  reviewed: number;
  byMission: Record<string, { sessions: number; completed: number; avgPercent: number }>;
}

export type Course = CourseDoc;

/* ---------------- platform ---------------- */
export interface TenantRow {
  id: string;
  name: string;
  active: boolean;
  allowedEmailDomains: string[];
  monthlyBudgetUsd: number | null;
  users: number;
  createdAt: string;
}
