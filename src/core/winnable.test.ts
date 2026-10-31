import { describe, expect, it } from 'vitest';
import { generateMap, PROOF_BUDGET, PROOF_CRATES, proofBudget, roughMap } from './generate';
import { score } from './rules';
import { safeRoute, shuttleRoundTrip } from './solver';
import { newGame } from './state';

describe('the hand-made map', () => {
  it('can be crossed to the pole and back', () => {
    for (const seed of [1, 2, 3]) {
      const start = newGame(seed);
      const end = shuttleRoundTrip(start, safeRoute(start)!, PROOF_BUDGET);
      expect(end.status).toBe('won');
      expect(end.party.reachedPole).toBe(true);
      expect(end.turn).toBeLessThan(130);
      expect(score(end)).toBeGreaterThan(0);
    }
  });
});

describe('generated maps', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => i * 104729 + 17);

  it('can all be crossed to the pole and back', () => {
    for (const seed of seeds) {
      const start = newGame(seed, generateMap(seed));
      const route = safeRoute(start);
      expect(route, `seed ${seed}`).not.toBeNull();
      const budget = proofBudget(generateMap(seed));
      expect(budget!.food + budget!.fuel).toBe(PROOF_CRATES);
      const end = shuttleRoundTrip(start, route!, budget!);
      expect(end.status, `seed ${seed}`).toBe('won');
      expect(end.party.reachedPole).toBe(true);
    }
  });

  it('are the same for the same seed and differ between seeds', () => {
    expect(generateMap(42)).toEqual(generateMap(42));
    const distinct = new Set(seeds.slice(0, 50).map(s => generateMap(s).join('\n')));
    expect(distinct.size).toBe(50);
  });

  it('keep the shape of the hand-made map', () => {
    for (const seed of seeds.slice(0, 50)) {
      const rows = generateMap(seed);
      expect(rows).toHaveLength(30);
      expect(rows.every(r => r.length === 9)).toBe(true);
      expect(rows.slice(0, 3).join('')).toMatch(/^C+$/);
      expect(rows.filter(r => /^[MP]+$/.test(r))).toHaveLength(3);
      expect(rows.at(-1)![4]).toBe('^');
    }
  });

  it('throws away rough drafts that cannot be won', () => {
    const drafts = seeds.slice(0, 100).map(roughMap);
    const unwinnable = drafts.filter(rows => proofBudget(rows) === null).length;
    expect(unwinnable).toBeGreaterThan(0); // so the check above is not trivially true
    for (const [i, seed] of seeds.slice(0, 100).entries())
      if (proofBudget(drafts[i]) === null) expect(generateMap(seed)).not.toEqual(drafts[i]);
  });
});
