import { allObjectives, currentStage } from './engine.js';
import type { MissionContent, SessionDoc, SessionView } from './schemas.js';

export function elapsedSeconds(s: Pick<SessionDoc, 'activeMs' | 'resumedAt'>, now: Date = new Date()): number {
  const running = s.resumedAt ? Math.max(0, now.getTime() - new Date(s.resumedAt).getTime()) : 0;
  return Math.floor((s.activeMs + running) / 1000);
}

/** Student-facing session view (hides NPC facts and AI details). */
export function toSessionView(
  s: SessionDoc,
  mission: MissionContent,
  opts: { maxSessionMinutes: number; maxRecordSeconds: number; quotaWarning?: boolean },
  now: Date = new Date(),
): SessionView {
  const stage = currentStage(mission, s.state);
  const maxMinutes = Math.min(mission.limits.maxMinutes, opts.maxSessionMinutes);
  return {
    id: s.id,
    missionId: s.missionId,
    status: s.status,
    stageIndex: s.state.stageIndex,
    stageCount: mission.stages.length,
    stageTitle: stage.title,
    objectives: allObjectives(mission).map((o) => ({
      id: o.id,
      label: o.label,
      stageIndex: o.stageIndex,
      required: o.required,
      met: Boolean(s.state.objectivesMet[o.id]),
    })),
    studentTurns: s.studentTurns,
    maxTurns: mission.limits.maxTurns,
    hintsUsed: s.hintsUsed,
    maxHints: mission.limits.maxHints,
    replaysUsed: s.replaysUsed,
    maxReplays: mission.limits.maxReplays,
    elapsedSeconds: elapsedSeconds(s, now),
    maxSeconds: maxMinutes * 60,
    maxRecordSeconds: Math.min(mission.limits.maxRecordSeconds, opts.maxRecordSeconds),
    lastNpcLine: s.lastNpcLine,
    lastNpcTtsHash: s.lastNpcTtsHash,
    quotaWarning: Boolean(opts.quotaWarning),
  };
}
