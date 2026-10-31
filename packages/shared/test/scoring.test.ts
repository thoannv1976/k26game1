import { describe, expect, it } from 'vitest';
import { applyEvidence, initialState } from '../src/engine.js';
import {
  applyTeacherReview,
  computeAchievements,
  fluencyScore,
  recommendNext,
  taskCompletionScore,
  totals,
  xpForSession,
} from '../src/scoring.js';
import { toCsv } from '../src/csv.js';
import type { Criterion, CriterionResult } from '../src/schemas.js';
import { FIXTURE } from './fixture.js';

const crit = (score: number | null, max: number): CriterionResult => ({
  max,
  score,
  status: score === null ? 'not_assessed' : 'assessed',
  comment: '',
  source: 'ai',
});

describe('task completion', () => {
  it('scores by required objectives met', () => {
    const s = applyEvidence(FIXTURE, initialState(), 'lost', [{ objectiveId: 'explain', quote: 'lost' }], 1).state;
    const r = taskCompletionScore(FIXTURE, s, 0);
    expect(r.score).toBe(10); // 1 of 3 required → 30 * 1/3
  });
  it('penalizes heavy hint use lightly', () => {
    const s = applyEvidence(FIXTURE, initialState(), 'lost VN 301 blue', [
      { objectiveId: 'explain', quote: 'lost' },
      { objectiveId: 'flight', quote: 'VN 301' },
      { objectiveId: 'colour', quote: 'blue' },
    ], 1).state;
    expect(taskCompletionScore(FIXTURE, s, 0).score).toBe(30);
    expect(taskCompletionScore(FIXTURE, s, 4).score).toBe(27);
  });
});

describe('fluency', () => {
  it('is not assessed without enough voice data', () => {
    const r = fluencyScore(15, 2, { words: 40, speechSeconds: 20, longPauses: 0, confidence: 0.9 });
    expect(r.status).toBe('not_assessed');
    expect(r.score).toBeNull();
  });
  it('gives full marks for a natural rate and few pauses', () => {
    const r = fluencyScore(15, 6, { words: 120, speechSeconds: 60, longPauses: 0, confidence: 0.9 });
    expect(r.score).toBe(15);
  });
  it('lowers the score for very slow speech with pauses', () => {
    const r = fluencyScore(15, 6, { words: 30, speechSeconds: 60, longPauses: 12, confidence: 0.9 });
    expect(r.score!).toBeLessThan(5);
  });
});

describe('totals and teacher review', () => {
  const criteria: Record<Criterion, CriterionResult> = {
    taskCompletion: crit(30, 30),
    comprehension: crit(15, 20),
    grammar: crit(14, 20),
    vocabulary: crit(11, 15),
    fluency: crit(null, 15),
  };
  it('excludes not-assessed criteria from the denominator', () => {
    expect(totals(criteria)).toEqual({ total: 70, maxAssessed: 85, percent: 82 });
  });
  it('teacher scores override and are clamped', () => {
    const r = applyTeacherReview(criteria, {
      reviewerUid: 't', reviewerName: 'T', comment: '', status: 'adjusted', reviewedAt: '',
      scores: { grammar: 99, fluency: 10 },
    });
    expect(r.criteria.grammar.score).toBe(20);
    expect(r.criteria.fluency.source).toBe('teacher');
    expect(r.percent).toBe(Math.round((30 + 15 + 20 + 11 + 10) / 100 * 100));
  });
});

describe('xp, achievements, recommendation', () => {
  it('gives partial xp for incomplete missions', () => {
    expect(xpForSession(FIXTURE, false, 40)).toBe(20);
    expect(xpForSession(FIXTURE, true, 90)).toBe(120);
  });
  it('awards first mission and high achiever once', () => {
    const a = computeAchievements([FIXTURE], { completedMissionIds: ['M99'], voiceSessions: 1, bestPercentByMission: {} }, [], 92);
    expect(a).toContain('first_mission');
    expect(a).toContain('high_achiever');
    expect(a).toContain('city_explorer');
    const again = computeAchievements([FIXTURE], { completedMissionIds: ['M99'], voiceSessions: 1, bestPercentByMission: {} }, a, 92);
    expect(again).toEqual([]);
  });
  it('recommends replay when incomplete', () => {
    const r = recommendNext([FIXTURE], FIXTURE, false, 30, { completedMissionIds: [], voiceSessions: 0, bestPercentByMission: {} });
    expect(r.nextMissionId).toBe('M99');
  });
});

describe('csv', () => {
  it('escapes quotes/commas and neutralizes formulas', () => {
    const csv = toCsv(['a', 'b'], [['x,y', '=SUM(A1)'], ['He said "hi"', null]]);
    expect(csv).toContain('"x,y",\'=SUM(A1)');
    expect(csv).toContain('"He said ""hi"""');
    expect(csv.startsWith('﻿')).toBe(true);
  });
});
