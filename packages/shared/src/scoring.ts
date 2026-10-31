/**
 * Deterministic parts of the assessment: task completion (from the Scenario Engine),
 * fluency (from speech-to-text timing data), totals, XP, achievements and next-mission choice.
 */
import { metRequiredCount, requiredObjectiveCount } from './engine.js';
import type {
  AssessmentDoc,
  Criterion,
  CriterionResult,
  Level,
  MissionContent,
  ScenarioState,
  SpeechMetrics,
  TeacherReview,
} from './schemas.js';

export const RUBRIC_VERSION = 'ecs-rubric-1.0';
export const ASSESSMENT_DISCLAIMER =
  'AI-assisted learning feedback. This is not an official VSTEP score. / Phản hồi học tập do AI hỗ trợ, không phải điểm VSTEP chính thức.';

/** Minimum voice evidence before fluency is scored. */
export const FLUENCY_MIN_VOICE_TURNS = 4;
export const FLUENCY_MIN_SPEECH_SECONDS = 30;

export function taskCompletionScore(
  mission: MissionContent,
  state: ScenarioState,
  hintsUsed: number,
): CriterionResult {
  const max = mission.rubric.taskCompletion;
  const required = requiredObjectiveCount(mission);
  const met = metRequiredCount(mission, state);
  const ratio = required === 0 ? 0 : met / required;
  // Light penalty for heavy hint use (max 20% of the criterion).
  const hintPenalty = Math.min(0.2, Math.max(0, hintsUsed - 2) * 0.05);
  const score = Math.round(max * ratio * (1 - hintPenalty));
  return {
    max,
    score,
    status: 'assessed',
    source: 'engine',
    comment: `${met}/${required} required communication objectives met${hintsUsed ? `, ${hintsUsed} hint(s) used` : ''}.`,
  };
}

/**
 * Fluency from speech timing. Only assessed with enough reliable voice data;
 * otherwise "not_assessed" (never invented).
 */
export function fluencyScore(max: number, voiceTurns: number, speech: SpeechMetrics): CriterionResult {
  if (voiceTurns < FLUENCY_MIN_VOICE_TURNS || speech.speechSeconds < FLUENCY_MIN_SPEECH_SECONDS) {
    return {
      max,
      score: null,
      status: 'not_assessed',
      source: 'speech_metrics',
      comment: `Not assessed: needs at least ${FLUENCY_MIN_VOICE_TURNS} voice turns and ${FLUENCY_MIN_SPEECH_SECONDS}s of speech (got ${voiceTurns} turns, ${Math.round(speech.speechSeconds)}s).`,
    };
  }
  const wpm = (speech.words / speech.speechSeconds) * 60;
  // Speech rate component (0..1): ideal band 90–150 wpm for B1–B2 conversation.
  let rate: number;
  if (wpm >= 90 && wpm <= 150) rate = 1;
  else if (wpm < 90) rate = Math.max(0, (wpm - 40) / 50);
  else rate = Math.max(0.5, 1 - (wpm - 150) / 100);
  // Pause component: long pauses (>1.5 s) per voice turn.
  const pausesPerTurn = speech.longPauses / voiceTurns;
  const pause = Math.max(0, 1 - pausesPerTurn * 0.25);
  const score = Math.round(max * (0.6 * rate + 0.4 * pause));
  return {
    max,
    score,
    status: 'assessed',
    source: 'speech_metrics',
    comment: `Speech rate ≈ ${Math.round(wpm)} words/min, ${speech.longPauses} long pause(s) over ${voiceTurns} voice turns.`,
  };
}

export function totals(criteria: Record<Criterion, CriterionResult>) {
  let total = 0;
  let maxAssessed = 0;
  for (const c of Object.values(criteria)) {
    if (c.status === 'assessed' && c.score !== null) {
      total += c.score;
      maxAssessed += c.max;
    }
  }
  const percent = maxAssessed === 0 ? 0 : Math.round((total / maxAssessed) * 100);
  return { total, maxAssessed, percent };
}

/** Apply a teacher review on top of the AI/engine criteria and recompute the final percentage. */
export function applyTeacherReview(
  criteria: Record<Criterion, CriterionResult>,
  review: TeacherReview | null,
): { criteria: Record<Criterion, CriterionResult>; percent: number } {
  if (!review) return { criteria, percent: totals(criteria).percent };
  const out = { ...criteria };
  for (const [k, v] of Object.entries(review.scores) as [Criterion, number][]) {
    const c = out[k];
    if (!c || v === undefined) continue;
    out[k] = { ...c, score: Math.min(c.max, Math.max(0, Math.round(v))), status: 'assessed', source: 'teacher' };
  }
  return { criteria: out, percent: totals(out).percent };
}

export function xpForSession(mission: MissionContent, missionCompleted: boolean, percent: number): number {
  if (!missionCompleted) return Math.round(mission.xpReward * 0.2);
  const bonus = percent >= 85 ? 1.2 : 1;
  return Math.round(mission.xpReward * bonus);
}

export interface PlayerHistory {
  completedMissionIds: string[];
  voiceSessions: number;
  bestPercentByMission: Record<string, number>;
}

export const ACHIEVEMENTS: Record<string, { en: string; vi: string }> = {
  first_mission: { en: 'First mission completed', vi: 'Hoàn thành nhiệm vụ đầu tiên' },
  airport_pro: { en: 'Airport pro', vi: 'Chuyên gia sân bay' },
  restaurant_regular: { en: 'Restaurant regular', vi: 'Khách quen nhà hàng' },
  campus_star: { en: 'Campus star', vi: 'Ngôi sao giảng đường' },
  b2_challenger: { en: 'B2 challenger', vi: 'Chinh phục B2' },
  voice_hero: { en: '5 voice missions', vi: '5 nhiệm vụ bằng giọng nói' },
  high_achiever: { en: 'Scored 90%+', vi: 'Đạt từ 90%' },
  city_explorer: { en: 'All 6 missions completed', vi: 'Hoàn thành cả 6 nhiệm vụ' },
};

export function computeAchievements(
  missions: MissionContent[],
  history: PlayerHistory,
  existing: string[],
  latestPercent: number,
): string[] {
  const done = new Set(history.completedMissionIds);
  const byLoc = (loc: string) => missions.filter((m) => m.locationId === loc).every((m) => done.has(m.id));
  const earned = new Set<string>();
  if (done.size >= 1) earned.add('first_mission');
  if (byLoc('airport')) earned.add('airport_pro');
  if (byLoc('restaurant')) earned.add('restaurant_regular');
  if (byLoc('university')) earned.add('campus_star');
  if (missions.some((m) => m.level === 'B2' && done.has(m.id))) earned.add('b2_challenger');
  if (history.voiceSessions >= 5) earned.add('voice_hero');
  if (latestPercent >= 90) earned.add('high_achiever');
  if (missions.length > 0 && missions.every((m) => done.has(m.id))) earned.add('city_explorer');
  return [...earned].filter((a) => !existing.includes(a));
}

/** Choose the next mission: first uncompleted at the right level; move to B2 when B1 is mastered. */
export function recommendNext(
  missions: MissionContent[],
  current: MissionContent,
  missionCompleted: boolean,
  percent: number,
  history: PlayerHistory,
): { nextMissionId: string | null; nextLevel: Level; reason: string } {
  if (!missionCompleted || percent < 50) {
    return {
      nextMissionId: current.id,
      nextLevel: current.level,
      reason: 'Replay this mission to complete all communication objectives.',
    };
  }
  const done = new Set(history.completedMissionIds);
  done.add(current.id);
  const nextLevel: Level = current.level === 'B1' && percent >= 80 ? 'B2' : current.level;
  const candidates = missions.filter((m) => !done.has(m.id));
  const pick =
    candidates.find((m) => m.level === nextLevel && m.locationId === current.locationId) ??
    candidates.find((m) => m.level === nextLevel) ??
    candidates.find((m) => m.level === current.level) ??
    candidates[0];
  if (!pick) {
    return { nextMissionId: null, nextLevel, reason: 'All missions completed – replay any mission to improve your score.' };
  }
  return {
    nextMissionId: pick.id,
    nextLevel,
    reason:
      nextLevel !== current.level
        ? `Strong result (${percent}%). Try a ${nextLevel} mission next.`
        : `Continue with another ${nextLevel} mission.`,
  };
}

export type AssessmentSummaryRow = Pick<
  AssessmentDoc,
  'sessionId' | 'missionId' | 'level' | 'missionCompleted' | 'percent' | 'finalPercent' | 'createdAt'
>;
