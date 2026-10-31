/**
 * Scenario Engine – deterministic mission rules.
 *
 * The AI only writes the NPC's words and *proposes* which objectives the student met
 * (with a quote). This engine decides what actually counts, when a stage advances,
 * when the twist starts and when the mission is complete.
 */
import type { MissionContent, ScenarioState, Stage } from './schemas.js';

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** True when `phrase` occurs in `text` on word boundaries (both normalized). */
export function containsPhrase(text: string, phrase: string): boolean {
  const t = ` ${normalizeText(text)} `;
  const p = normalizeText(phrase);
  if (!p) return false;
  return t.includes(` ${p} `);
}

export function initialState(): ScenarioState {
  return { stageIndex: 0, objectivesMet: {}, twistsIntroduced: [], allStagesDone: false };
}

export function currentStage(mission: MissionContent, state: ScenarioState): Stage {
  const idx = Math.min(state.stageIndex, mission.stages.length - 1);
  return mission.stages[idx]!;
}

export function allObjectives(mission: MissionContent) {
  return mission.stages.flatMap((s, stageIndex) => s.objectives.map((o) => ({ ...o, stageIndex })));
}

export function requiredObjectiveCount(mission: MissionContent): number {
  return allObjectives(mission).filter((o) => o.required).length;
}

export function metRequiredCount(mission: MissionContent, state: ScenarioState): number {
  return allObjectives(mission).filter((o) => o.required && state.objectivesMet[o.id]).length;
}

function stageDone(stage: Stage, state: ScenarioState): boolean {
  return stage.objectives.filter((o) => o.required).every((o) => state.objectivesMet[o.id]);
}

export interface EvidenceProposal {
  objectiveId: string;
  quote: string;
}

export interface ApplyResult {
  state: ScenarioState;
  credited: string[];
  rejected: { objectiveId: string; reason: string }[];
  stageChanged: boolean;
  /** Stages entered during this turn (for twist / fallback lines). */
  enteredStages: number[];
  completedNow: boolean;
}

/**
 * Apply AI-proposed evidence for one student utterance.
 *
 * Rules:
 *  - Only objectives of the current stage or later stages can be credited (no going back).
 *  - The quote must actually appear in the student's utterance (prevents invented evidence).
 *  - Already-met objectives are ignored.
 *  - The stage advances (possibly several times) while all required objectives of the current stage are met.
 */
export function applyEvidence(
  mission: MissionContent,
  prev: ScenarioState,
  studentText: string,
  proposals: EvidenceProposal[],
  turnSeq: number,
): ApplyResult {
  const state: ScenarioState = {
    stageIndex: prev.stageIndex,
    objectivesMet: { ...prev.objectivesMet },
    twistsIntroduced: [...prev.twistsIntroduced],
    allStagesDone: prev.allStagesDone,
  };
  const credited: string[] = [];
  const rejected: { objectiveId: string; reason: string }[] = [];
  const objectives = allObjectives(mission);

  for (const p of proposals) {
    const obj = objectives.find((o) => o.id === p.objectiveId);
    if (!obj) {
      rejected.push({ objectiveId: p.objectiveId, reason: 'unknown_objective' });
      continue;
    }
    if (state.objectivesMet[obj.id]) continue;
    if (obj.stageIndex < state.stageIndex) {
      rejected.push({ objectiveId: obj.id, reason: 'past_stage' });
      continue;
    }
    const quote = p.quote.trim();
    if (quote.length < 2 || !containsPhrase(studentText, quote)) {
      rejected.push({ objectiveId: obj.id, reason: 'quote_not_in_utterance' });
      continue;
    }
    state.objectivesMet[obj.id] = { turnSeq, quote: quote.slice(0, 200) };
    credited.push(obj.id);
  }

  const before = state.stageIndex;
  const enteredStages: number[] = [];
  while (!state.allStagesDone && stageDone(currentStage(mission, state), state)) {
    if (state.stageIndex >= mission.stages.length - 1) {
      state.allStagesDone = true;
    } else {
      state.stageIndex += 1;
      enteredStages.push(state.stageIndex);
      const st = mission.stages[state.stageIndex]!;
      if (st.twist && !state.twistsIntroduced.includes(st.id)) state.twistsIntroduced.push(st.id);
    }
  }

  return {
    state,
    credited,
    rejected,
    stageChanged: state.stageIndex !== before,
    enteredStages,
    completedNow: state.allStagesDone && !prev.allStagesDone,
  };
}

/** Offline evidence detector used by the fake AI provider (dev/tests only). */
export function keywordEvidence(mission: MissionContent, state: ScenarioState, studentText: string): EvidenceProposal[] {
  const out: EvidenceProposal[] = [];
  for (const o of allObjectives(mission)) {
    if (state.objectivesMet[o.id] || o.stageIndex < state.stageIndex) continue;
    const kw = o.evidenceKeywords.find((k) => containsPhrase(studentText, k));
    if (kw) out.push({ objectiveId: o.id, quote: kw });
  }
  return out;
}
