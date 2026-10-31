import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Basic enums                                                         */
/* ------------------------------------------------------------------ */

export const LEVELS = ['B1', 'B2'] as const;
export const LevelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof LevelSchema>;

export const ROLES = ['student', 'teacher', 'school_admin', 'platform_admin'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const LOCATION_IDS = ['airport', 'restaurant', 'university', 'hotel', 'office', 'mall'] as const;
export const LocationIdSchema = z.enum(LOCATION_IDS);
export type LocationId = z.infer<typeof LocationIdSchema>;

/** Text shown in the UI in both languages. */
export const I18nTextSchema = z.object({
  en: z.string().min(1),
  vi: z.string().min(1),
});
export type I18nText = z.infer<typeof I18nTextSchema>;

/* ------------------------------------------------------------------ */
/* Mission content                                                     */
/* ------------------------------------------------------------------ */

export const ObjectiveSchema = z.object({
  /** Unique inside the mission, e.g. "explain_problem". */
  id: z.string().regex(/^[a-z0-9_]+$/),
  /** What the student must do, in English (shown to the AI and the teacher). */
  description: z.string().min(5),
  /** Short student-facing label for the progress bar. */
  label: I18nTextSchema,
  required: z.boolean().default(true),
  /**
   * Lower-case words/phrases that indicate the objective was met.
   * Given to the AI as a hint; used directly by the offline (fake) provider.
   */
  evidenceKeywords: z.array(z.string().min(1)).min(1),
});
export type Objective = z.infer<typeof ObjectiveSchema>;

export const StageSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  title: z.string().min(2),
  /** What the NPC tries to achieve in this stage (instructions for the AI). */
  npcGoal: z.string().min(10),
  /** Controlled unexpected situation introduced when this stage starts (optional). */
  twist: z.string().optional(),
  /** Scripted NPC line used when the stage starts offline or when the AI is unavailable. */
  fallbackLine: z.string().min(5),
  objectives: z.array(ObjectiveSchema).min(1),
  /** Hints a student can request (English, short). */
  hints: z.array(z.string().min(3)).min(1),
  /** Example good student lines for this stage (used for teacher reference and tests). */
  sampleStudentLines: z.array(z.string().min(3)).min(1),
});
export type Stage = z.infer<typeof StageSchema>;

export const VoiceSchema = z.object({
  languageCode: z.enum(['en-US', 'en-GB']),
  /** Google Cloud TTS voice name, e.g. "en-GB-Neural2-A". */
  name: z.string().min(3),
});

export const NpcSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  /** Avatar key rendered by the web app (see apps/web/src/components/Avatar.tsx). */
  avatar: z.string().min(2),
  voice: VoiceSchema,
  personality: z.string().min(5),
  openingLine: z.string().min(5),
  closingLine: z.string().min(5),
});

export const MissionLimitsSchema = z.object({
  maxTurns: z.number().int().min(4).max(60),
  maxMinutes: z.number().int().min(3).max(40),
  maxReplays: z.number().int().min(0).max(50),
  maxHints: z.number().int().min(0).max(20),
  maxRecordSeconds: z.number().int().min(5).max(60),
});
export type MissionLimits = z.infer<typeof MissionLimitsSchema>;

export const RubricSchema = z.object({
  taskCompletion: z.number().int(),
  comprehension: z.number().int(),
  grammar: z.number().int(),
  vocabulary: z.number().int(),
  fluency: z.number().int(),
});
export type Rubric = z.infer<typeof RubricSchema>;
export const DEFAULT_RUBRIC: Rubric = {
  taskCompletion: 30,
  comprehension: 20,
  grammar: 20,
  vocabulary: 15,
  fluency: 15,
};

export const MissionContentSchema = z
  .object({
    id: z.string().regex(/^M\d{2,3}$/),
    locationId: LocationIdSchema,
    level: LevelSchema,
    title: I18nTextSchema,
    summary: I18nTextSchema,
    /** Situation description shown before playing. */
    briefing: I18nTextSchema,
    /** Communication goals shown to the student. */
    goals: z.array(I18nTextSchema).min(2),
    estimatedMinutes: z.number().int().min(3).max(40),
    xpReward: z.number().int().min(10).max(500),
    /** Facts the student was given (fictional profile/ticket). English. */
    studentCard: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
    npc: NpcSchema,
    /** Fixed facts on the NPC side. The AI must not contradict or invent beyond these. */
    npcFacts: z.array(z.string().min(3)).min(1),
    stages: z.array(StageSchema).min(2).max(6),
    targetVocabulary: z.array(z.string()).min(3),
    limits: MissionLimitsSchema,
    rubric: RubricSchema.default(DEFAULT_RUBRIC),
  })
  .superRefine((m, ctx) => {
    const ids = new Set<string>();
    for (const s of m.stages) {
      for (const o of s.objectives) {
        if (ids.has(o.id)) {
          ctx.addIssue({ code: 'custom', message: `Duplicate objective id ${o.id}` });
        }
        ids.add(o.id);
      }
    }
    const total = Object.values(m.rubric).reduce((a, b) => a + b, 0);
    if (total !== 100) ctx.addIssue({ code: 'custom', message: `Rubric must total 100, got ${total}` });
  });
export type MissionContent = z.infer<typeof MissionContentSchema>;

export const MISSION_STATUSES = ['draft', 'approved', 'archived'] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

/** Firestore document tenants/{t}/missions/{id}. */
export interface MissionDoc {
  id: string;
  locationId: LocationId;
  level: Level;
  /** Version number of the approved content currently served to students (0 = none). */
  approvedVersion: number;
  /** Latest version number (draft or approved). */
  latestVersion: number;
  status: MissionStatus;
  content: MissionContent | null; // approved content
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

export interface LocationInfo {
  id: LocationId;
  name: I18nText;
  description: I18nText;
  /** Locations not yet available in v1 are shown as "coming soon". */
  available: boolean;
  /** Isometric grid position on the city map. */
  grid: { x: number; y: number };
  color: string;
}

/* ------------------------------------------------------------------ */
/* Tenants, users, courses                                             */
/* ------------------------------------------------------------------ */

export const QuotaConfigSchema = z.object({
  aiCallsPerStudentPerDay: z.number().int().min(0).max(5000),
  attemptsPerMissionPerDay: z.number().int().min(1).max(100),
  maxSessionMinutes: z.number().int().min(3).max(60),
  maxRecordSeconds: z.number().int().min(5).max(60),
  maxOutputTokens: z.number().int().min(128).max(8192),
  monthlyBudgetUsd: z.number().min(0).max(100000),
  warnRatio: z.number().min(0.1).max(1),
  /** What to do when the budget is reached. */
  onBudgetExceeded: z.enum(['block', 'warn_only']),
});
export type QuotaConfig = z.infer<typeof QuotaConfigSchema>;
export const DEFAULT_QUOTAS: QuotaConfig = {
  aiCallsPerStudentPerDay: 150,
  attemptsPerMissionPerDay: 5,
  maxSessionMinutes: 25,
  maxRecordSeconds: 30,
  maxOutputTokens: 1024,
  monthlyBudgetUsd: 100,
  warnRatio: 0.8,
  onBudgetExceeded: 'block',
};

export const PricingSchema = z.object({
  inputTokensPer1M: z.number().min(0),
  outputTokensPer1M: z.number().min(0),
  sttPerMinute: z.number().min(0),
  ttsPer1MChars: z.number().min(0),
});
export type Pricing = z.infer<typeof PricingSchema>;

export const AiConfigSchema = z.object({
  model: z.string().min(3),
  assessmentModel: z.string().min(3),
  temperature: z.number().min(0).max(1.5),
  historyTurns: z.number().int().min(2).max(40),
  defaultAccent: z.enum(['en-US', 'en-GB', 'mission']),
  /** Keep student audio this many days (0 = do not store audio). */
  audioRetentionDays: z.number().int().min(0).max(365),
  pricing: PricingSchema,
});
export type AiConfig = z.infer<typeof AiConfigSchema>;
export const DEFAULT_AI_CONFIG: AiConfig = {
  model: 'gemini-2.5-flash',
  assessmentModel: 'gemini-2.5-flash',
  temperature: 0.7,
  historyTurns: 16,
  defaultAccent: 'mission',
  audioRetentionDays: 30,
  // Reference prices (USD) – review against the current Google Cloud price list.
  pricing: { inputTokensPer1M: 0.3, outputTokensPer1M: 2.5, sttPerMinute: 0.016, ttsPer1MChars: 16 },
};

export interface TenantDoc {
  id: string;
  name: string;
  allowedEmailDomains: string[];
  quotas: QuotaConfig;
  aiConfig: AiConfig;
  active: boolean;
  createdAt: string;
}

export interface UserDoc {
  uid: string;
  tenantId: string;
  role: Role;
  email: string;
  displayName: string;
  studentCode?: string;
  courseIds: string[];
  level: Level;
  xp: number;
  missionsCompleted: number;
  completedMissionIds: string[];
  /** Best final percentage per mission id. */
  bestPercent: Record<string, number>;
  voiceSessions: number;
  achievements: string[];
  /** ISO time when the student agreed to voice recording; null = not yet. */
  recordingConsentAt: string | null;
  locale: 'vi' | 'en';
  disabled: boolean;
  createdAt: string;
}

export interface CourseDoc {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
  /** Optional monthly AI budget for this course (USD). */
  monthlyBudgetUsd: number | null;
  createdAt: string;
}

export interface AssignmentDoc {
  id: string;
  courseId: string;
  missionId: string;
  dueAt: string | null;
  note: string;
  createdBy: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Game sessions                                                       */
/* ------------------------------------------------------------------ */

export const SESSION_STATUSES = [
  'active',
  'paused',
  'ready_to_complete',
  'assessing',
  'completed',
  'expired',
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface ObjectiveHit {
  turnSeq: number;
  quote: string;
}

/** Deterministic mission state owned by the Scenario Engine. */
export interface ScenarioState {
  stageIndex: number;
  objectivesMet: Record<string, ObjectiveHit>;
  /** Stage ids whose twist has been introduced. */
  twistsIntroduced: string[];
  /** True when every required objective of every stage is met. */
  allStagesDone: boolean;
}

export interface SpeechMetrics {
  words: number;
  speechSeconds: number;
  longPauses: number;
  confidence: number;
}

export interface SessionDoc {
  id: string;
  tenantId: string;
  uid: string;
  missionId: string;
  missionVersion: number;
  level: Level;
  courseId: string | null;
  assignmentId: string | null;
  status: SessionStatus;
  state: ScenarioState;
  /** Number of turn documents written (student + NPC). */
  turnSeq: number;
  studentTurns: number;
  voiceTurns: number;
  textTurns: number;
  hintsUsed: number;
  replaysUsed: number;
  /** Accumulated speech metrics from voice turns. */
  speech: SpeechMetrics;
  /** Accumulated active play time in ms (excluding pauses). */
  activeMs: number;
  /** ISO time when the clock last (re)started; null while paused/finished. */
  resumedAt: string | null;
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  /** Turn currently being processed (concurrency guard). */
  pendingTurnId: string | null;
  pendingSince: string | null;
  lastNpcLine: string;
  lastNpcTtsHash: string | null;
}

export type Speaker = 'student' | 'npc' | 'system';
export type TurnMode = 'voice' | 'text' | 'scripted';

export interface TurnDoc {
  id: string;
  seq: number;
  speaker: Speaker;
  text: string;
  mode: TurnMode;
  stageId: string;
  createdAt: string;
  /** Student voice turns only. */
  audioPath?: string | null;
  speech?: SpeechMetrics | null;
  /** NPC turns only. */
  ttsHash?: string | null;
  fallback?: boolean;
  /** Objectives credited on this (student) turn. */
  objectivesCredited?: string[];
  /** Processing state for idempotency (student turns only). */
  status?: 'processing' | 'done' | 'failed';
  /** Cached API response for idempotent replays (student turns only). */
  response?: TurnResponse | null;
}

/* ------------------------------------------------------------------ */
/* AI contracts (validated at runtime)                                 */
/* ------------------------------------------------------------------ */

export const AiTurnOutputSchema = z.object({
  npcReply: z.string().min(1).max(800),
  objectivesEvidence: z
    .array(z.object({ objectiveId: z.string(), quote: z.string() }))
    .max(10)
    .default([]),
  needsClarification: z.boolean().default(false),
  offTopic: z.boolean().default(false),
  inappropriate: z.boolean().default(false),
});
export type AiTurnOutput = z.infer<typeof AiTurnOutputSchema>;

const CriterionAiSchema = z.object({
  score: z.number().min(0),
  comment: z.string().max(600),
  evidenceTurns: z.array(z.number().int()).max(10).default([]),
});

export const AiAssessmentOutputSchema = z.object({
  comprehension: CriterionAiSchema,
  grammar: CriterionAiSchema,
  vocabulary: CriterionAiSchema,
  strengths: z.array(z.string().max(300)).max(6),
  improvements: z.array(z.string().max(300)).max(6),
  grammarCorrections: z
    .array(z.object({ original: z.string().max(400), corrected: z.string().max(400), explanation: z.string().max(300) }))
    .max(8),
  vocabularyToReview: z.array(z.object({ term: z.string().max(80), example: z.string().max(300) })).max(10),
  listeningTips: z.array(z.string().max(300)).max(5),
  nextPractice: z.array(z.string().max(300)).max(5),
  pronunciationNote: z.string().max(400).optional(),
});
export type AiAssessmentOutput = z.infer<typeof AiAssessmentOutputSchema>;

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

export const CRITERIA = ['taskCompletion', 'comprehension', 'grammar', 'vocabulary', 'fluency'] as const;
export type Criterion = (typeof CRITERIA)[number];

export interface CriterionResult {
  max: number;
  score: number | null;
  status: 'assessed' | 'not_assessed';
  comment: string;
  /** Who/what produced the score. */
  source: 'engine' | 'ai' | 'speech_metrics' | 'teacher';
}

export interface AssessmentDoc {
  id: string; // = sessionId
  tenantId: string;
  uid: string;
  sessionId: string;
  missionId: string;
  missionVersion: number;
  level: Level;
  courseId: string | null;
  missionCompleted: boolean;
  objectivesMet: number;
  objectivesRequired: number;
  evidenceMode: 'voice' | 'text' | 'mixed';
  criteria: Record<Criterion, CriterionResult>;
  total: number;
  maxAssessed: number;
  percent: number;
  aiStatus: 'ok' | 'failed' | 'skipped';
  feedback: Omit<AiAssessmentOutput, 'comprehension' | 'grammar' | 'vocabulary'> | null;
  recommendation: { nextMissionId: string | null; nextLevel: Level; reason: string };
  xpAwarded: number;
  newAchievements: string[];
  versions: { rubric: string; prompt: string; model: string; mission: number };
  teacherReview: TeacherReview | null;
  finalPercent: number;
  disclaimer: string;
  createdAt: string;
}

export interface TeacherReview {
  reviewerUid: string;
  reviewerName: string;
  scores: Partial<Record<Criterion, number>>;
  comment: string;
  status: 'confirmed' | 'adjusted';
  reviewedAt: string;
}

export const TeacherReviewInputSchema = z.object({
  scores: z.partialRecord(z.enum(CRITERIA), z.number().min(0).max(100)).default({}),
  comment: z.string().max(2000).default(''),
});

/* ------------------------------------------------------------------ */
/* API payloads                                                        */
/* ------------------------------------------------------------------ */

export const StartSessionInputSchema = z.object({
  missionId: z.string().regex(/^M\d{2,3}$/),
  assignmentId: z.string().max(100).optional(),
});

export const TextTurnInputSchema = z.object({
  clientTurnId: z.string().uuid(),
  text: z.string().trim().min(1).max(600),
});

export interface TurnResponse {
  clientTurnId: string;
  studentText: string;
  mode: TurnMode;
  npcText: string;
  ttsHash: string | null;
  fallback: boolean;
  needsClarification: boolean;
  objectivesCredited: string[];
  stageChanged: boolean;
  session: SessionView;
}

/** Session shape returned to the student (no hidden facts). */
export interface SessionView {
  id: string;
  missionId: string;
  status: SessionStatus;
  stageIndex: number;
  stageCount: number;
  stageTitle: string;
  objectives: { id: string; label: I18nText; stageIndex: number; required: boolean; met: boolean }[];
  studentTurns: number;
  maxTurns: number;
  hintsUsed: number;
  maxHints: number;
  replaysUsed: number;
  maxReplays: number;
  elapsedSeconds: number;
  maxSeconds: number;
  maxRecordSeconds: number;
  lastNpcLine: string;
  lastNpcTtsHash: string | null;
  quotaWarning: boolean;
}

export const ApiErrorCodes = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_PROVISIONED',
  'NOT_FOUND',
  'VALIDATION',
  'CONFLICT',
  'TURN_IN_PROGRESS',
  'SESSION_NOT_ACTIVE',
  'TURN_LIMIT',
  'TIME_LIMIT',
  'HINT_LIMIT',
  'REPLAY_LIMIT',
  'QUOTA_EXCEEDED',
  'BUDGET_EXCEEDED',
  'ATTEMPT_LIMIT',
  'AUDIO_UNCLEAR',
  'AUDIO_TOO_LONG',
  'CONSENT_REQUIRED',
  'CONTENT_BLOCKED',
  'INTERNAL',
] as const;
export type ApiErrorCode = (typeof ApiErrorCodes)[number];
