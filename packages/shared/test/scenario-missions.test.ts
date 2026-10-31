import { describe, expect, it } from 'vitest';
import { BUILTIN_MISSIONS } from '../src/missions.js';
import { applyEvidence, initialState, keywordEvidence } from '../src/engine.js';

/**
 * Plays every mission with its own sample student lines through the offline evidence
 * detector and the Scenario Engine: each stage must complete with its own sample lines,
 * and the whole mission must finish.
 */
describe.each(BUILTIN_MISSIONS.map((m) => [m.id, m] as const))('mission %s sample dialogue', (_id, mission) => {
  it('completes every stage in order using the sample lines', () => {
    let state = initialState();
    let seq = 1;
    mission.stages.forEach((stage, i) => {
      expect(state.stageIndex, `before stage ${stage.id}`).toBe(i);
      for (const line of stage.sampleStudentLines) {
        if (state.stageIndex !== i || state.allStagesDone) break;
        const res = applyEvidence(mission, state, line, keywordEvidence(mission, state, line), seq++);
        expect(res.rejected).toEqual([]);
        state = res.state;
      }
      const required = stage.objectives.filter((o) => o.required).map((o) => o.id);
      for (const id of required) expect(state.objectivesMet[id], `objective ${id}`).toBeTruthy();
    });
    expect(state.allStagesDone).toBe(true);
  });

  it('does not complete from small talk', () => {
    const state = initialState();
    const line = 'Hello, nice weather today.';
    const res = applyEvidence(mission, state, line, keywordEvidence(mission, state, line), 1);
    expect(res.state.allStagesDone).toBe(false);
  });
});
