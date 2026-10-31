import { describe, expect, it } from 'vitest';
import { fromOffset, key } from './hex';
import { apply, canTransfer } from './rules';
import { BASE_STOCKPILE, newGame, type GameState } from './state';

const at = (col: number, row: number) => key(fromOffset(col, row));

function awayFromBase(food = 20, fuel = 4): GameState {
  const s = newGame(1);
  return { ...s, party: { ...s.party, at: at(3, 5), carried: { food, fuel } } };
}

describe('base stores', () => {
  it('hold the rest of the 150-crate stockpile at the start', () => {
    const s = newGame(1);
    const base = s.caches[s.base];
    expect(base.food + s.party.carried.food).toBe(BASE_STOCKPILE.food);
    expect(base.fuel + s.party.carried.fuel).toBe(BASE_STOCKPILE.fuel);
  });

  it('let you swap food for fuel, but never overfill the sledge', () => {
    const s = newGame(1); // sledge starts full: 34 + 6 = 40
    expect(canTransfer(s, 1, 0)).toBe(false);
    const lighter = apply(s, { kind: 'transfer', food: -6, fuel: 0 });
    expect(lighter.party.carried.food).toBe(28);
    const swapped = apply(lighter, { kind: 'transfer', food: 0, fuel: 6 });
    expect(swapped.party.carried).toEqual({ food: 28, fuel: 12 });
    expect(swapped.caches[s.base]).toEqual({ food: 122, fuel: 38 });
  });
});

describe('caches', () => {
  it('are created by dropping crates and keep them for later', () => {
    const s = apply(awayFromBase(), { kind: 'transfer', food: -12, fuel: -2 });
    expect(s.caches[at(3, 5)]).toEqual({ food: 12, fuel: 2 });
    expect(s.party.carried).toEqual({ food: 8, fuel: 2 });
    expect(s.turn).toBe(0); // loading and unloading is free
  });

  it('can be picked up from on a later visit, and disappear when empty', () => {
    let s = apply(awayFromBase(), { kind: 'transfer', food: -12, fuel: 0 });
    s = apply(s, { kind: 'move', to: at(3, 4) });
    s = apply(s, { kind: 'move', to: at(3, 5) });
    s = apply(s, { kind: 'transfer', food: 12, fuel: 0 });
    expect(s.party.carried.food).toBe(18);
    expect(s.caches[at(3, 5)]).toBeUndefined();
  });

  it('refuse to take more than the cache holds or drop more than the sledge carries', () => {
    const s = apply(awayFromBase(), { kind: 'transfer', food: -5, fuel: 0 });
    expect(canTransfer(s, 6, 0)).toBe(false);
    expect(canTransfer(s, 0, -5)).toBe(false);
    expect(apply(s, { kind: 'transfer', food: 6, fuel: 0 })).toBe(s);
  });

  it('keep the base stores even when emptied', () => {
    const s = newGame(1);
    const emptyBase = { ...s, caches: { [s.base]: { food: 0, fuel: 1 } }, party: { ...s.party, carried: { food: 0, fuel: 0 } } };
    const after = apply(emptyBase, { kind: 'transfer', food: 0, fuel: 1 });
    expect(after.caches[s.base]).toEqual({ food: 0, fuel: 0 });
  });

  it('ignore empty or fractional transfers', () => {
    const s = awayFromBase();
    expect(canTransfer(s, 0, 0)).toBe(false);
    expect(canTransfer(s, -0.5, 0)).toBe(false);
  });
});
