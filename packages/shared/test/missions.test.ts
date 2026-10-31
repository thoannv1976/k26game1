import { describe, expect, it } from 'vitest';
import { BUILTIN_MISSIONS } from '../src/missions.js';
import { LOCATIONS } from '../src/locations.js';

describe('built-in missions', () => {
  it('has the six v1.0 missions M01–M06', () => {
    expect(BUILTIN_MISSIONS.map((m) => m.id)).toEqual(['M01', 'M02', 'M03', 'M04', 'M05', 'M06']);
  });

  it('matches the planned location/level table', () => {
    const table = BUILTIN_MISSIONS.map((m) => `${m.id}:${m.locationId}:${m.level}`);
    expect(table).toEqual([
      'M01:airport:B1',
      'M02:airport:B1',
      'M03:restaurant:B1',
      'M04:restaurant:B2',
      'M05:university:B1',
      'M06:university:B2',
    ]);
  });

  it('only uses available locations', () => {
    const available = new Set(LOCATIONS.filter((l) => l.available).map((l) => l.id));
    for (const m of BUILTIN_MISSIONS) expect(available.has(m.locationId)).toBe(true);
  });
});
