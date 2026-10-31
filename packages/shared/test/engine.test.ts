import { describe, expect, it } from 'vitest';
import { applyEvidence, containsPhrase, initialState, keywordEvidence, normalizeText } from '../src/engine.js';
import { FIXTURE } from './fixture.js';

describe('text matching', () => {
  it('normalizes punctuation and case', () => {
    expect(normalizeText('VN-301, please!')).toBe('vn 301 please');
  });
  it('matches on word boundaries only', () => {
    expect(containsPhrase('It was VN-301.', 'vn 301')).toBe(true);
    expect(containsPhrase('It was VN3010', '301')).toBe(false);
    expect(containsPhrase('bluebird', 'blue')).toBe(false);
  });
});

describe('applyEvidence', () => {
  it('credits a valid quote and advances the stage, introducing the twist', () => {
    const r = applyEvidence(FIXTURE, initialState(), 'Hi, my bag is missing', [{ objectiveId: 'explain', quote: 'my bag is missing' }], 1);
    expect(r.credited).toEqual(['explain']);
    expect(r.stageChanged).toBe(true);
    expect(r.state.stageIndex).toBe(1);
    expect(r.state.twistsIntroduced).toEqual(['info']);
    expect(r.completedNow).toBe(false);
  });

  it('rejects quotes not present in the utterance (invented evidence)', () => {
    const r = applyEvidence(FIXTURE, initialState(), 'Hello there', [{ objectiveId: 'explain', quote: 'my bag is missing' }], 1);
    expect(r.credited).toEqual([]);
    expect(r.rejected[0]?.reason).toBe('quote_not_in_utterance');
    expect(r.state.stageIndex).toBe(0);
  });

  it('rejects unknown objectives', () => {
    const r = applyEvidence(FIXTURE, initialState(), 'lost', [{ objectiveId: 'hack', quote: 'lost' }], 1);
    expect(r.rejected[0]?.reason).toBe('unknown_objective');
  });

  it('does not credit past-stage objectives and ignores duplicates', () => {
    let s = applyEvidence(FIXTURE, initialState(), 'my bag is lost', [{ objectiveId: 'explain', quote: 'lost' }], 1).state;
    const r = applyEvidence(FIXTURE, s, 'blue', [{ objectiveId: 'colour', quote: 'blue' }, { objectiveId: 'colour', quote: 'blue' }], 2);
    expect(r.credited).toEqual(['colour']);
    s = r.state;
    expect(s.allStagesDone).toBe(false); // flight still missing
  });

  it('allows information given early (future stage) and completes only when all required are met', () => {
    const r1 = applyEvidence(FIXTURE, initialState(), 'I lost my blue bag from VN 301', [
      { objectiveId: 'explain', quote: 'lost' },
      { objectiveId: 'colour', quote: 'blue bag' },
      { objectiveId: 'flight', quote: 'VN 301' },
    ], 1);
    expect(r1.state.allStagesDone).toBe(true);
    expect(r1.completedNow).toBe(true);
    expect(r1.enteredStages).toEqual([1]);
  });

  it('optional objectives are not needed for completion', () => {
    let s = initialState();
    for (const line of ['missing', 'VN 301 blue']) {
      s = applyEvidence(FIXTURE, s, line, keywordEvidence(FIXTURE, s, line), 1).state;
    }
    expect(s.allStagesDone).toBe(true);
    expect(s.objectivesMet['thanks']).toBeUndefined();
  });
});
