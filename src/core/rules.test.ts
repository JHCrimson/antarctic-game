import { describe, expect, it } from 'vitest';
import { fromKey, fromOffset, key, neighbours } from './hex';
import { FIXED_MAP } from './map';
import { apply, checkMove } from './rules';
import { newGame, type GameState } from './state';

const at = (col: number, row: number) => key(fromOffset(col, row));

// A game with the party placed on a given hex and carrying a given load.
function game(col: number, row: number, food = 20, fuel = 5, seed = 1): GameState {
  const s = newGame(seed);
  return { ...s, party: { ...s.party, at: at(col, row), carried: { food, fuel } } };
}

describe('move', () => {
  it('moves to a neighbouring hex, spends food and advances the turn', () => {
    const s = newGame(1);
    const next = apply(s, { kind: 'move', to: at(4, 1) });
    expect(next.party.at).toBe(at(4, 1));
    expect(next.turn).toBe(1);
    expect(next.party.carried.food).toBe(s.party.carried.food - 1);
  });

  it('refuses a hex that is not next to the party', () => {
    const s = newGame(1);
    expect(apply(s, { kind: 'move', to: at(4, 3) })).toBe(s);
  });

  it('refuses a hex off the map', () => {
    const s = newGame(1);
    const off = neighbours(fromKey(s.base)).map(key).find(k => !(k in s.map.tiles))!;
    expect(apply(s, { kind: 'move', to: off })).toBe(s);
  });

  it('charges 2 food for sastrugi', () => {
    const s = game(2, 3);
    expect(FIXED_MAP[4][2]).toBe('s');
    expect(apply(s, { kind: 'move', to: at(2, 4) }).party.carried).toEqual({ food: 18, fuel: 5 });
  });

  it('blocks mountain ridges but lets you through a pass for 2 food and 1 fuel', () => {
    const s = game(2, 9);
    expect(checkMove(s, at(3, 10))).toMatchObject({ ok: false, reason: 'impassable' });
    expect(apply(s, { kind: 'move', to: at(2, 10) }).party.carried).toEqual({ food: 18, fuel: 4 });
  });

  it('needs fuel, not food, to cross the plateau', () => {
    expect(checkMove(game(4, 17, 10, 0), at(4, 18))).toMatchObject({ ok: false, reason: 'no-fuel' });
    expect(checkMove(game(4, 17, 10, 1), at(4, 18)).ok).toBe(true);
  });

  it('cannot move without enough food', () => {
    expect(checkMove(game(4, 1, 0), at(4, 2))).toMatchObject({ ok: false, reason: 'no-food' });
    expect(checkMove(game(1, 3, 1), at(2, 4))).toMatchObject({ ok: false, reason: 'no-food' });
  });
});

describe('crevasses', () => {
  it('sometimes cost 2 extra food, and log it', () => {
    let lost = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const next = apply(game(0, 5, 20, 5, seed), { kind: 'move', to: at(0, 6) });
      if (next.party.carried.food === 17) {
        lost++;
        expect(next.log.at(-1)?.text).toMatch(/crevasse/);
      } else {
        expect(next.party.carried.food).toBe(19);
      }
    }
    expect(lost).toBeGreaterThan(60);   // about 1 in 4 of 400
    expect(lost).toBeLessThan(140);
  });

  it('give the same result for the same seed', () => {
    const a = apply(game(0, 5, 20, 5, 42), { kind: 'move', to: at(0, 6) });
    const b = apply(game(0, 5, 20, 5, 42), { kind: 'move', to: at(0, 6) });
    expect(a).toEqual(b);
  });
});

describe('newGame', () => {
  it('starts at the base on the coast with a full-ish sledge, and the pole on the last row', () => {
    const s = newGame(1);
    expect(s.party.at).toBe(s.base);
    expect(fromKey(s.base).r).toBe(0);
    expect(s.map.tiles[s.base].terrain).toBe('coast');
    expect(fromKey(s.pole).r).toBe(s.map.rows - 1);
    expect(Object.keys(s.map.tiles)).toHaveLength(9 * 30);
    expect(s.party.carried.food + s.party.carried.fuel).toBeLessThanOrEqual(s.party.capacity);
  });

  it('has a passable route through the ridge', () => {
    for (const row of [10, 11, 12]) expect(FIXED_MAP[row]).toContain('P');
  });
});
