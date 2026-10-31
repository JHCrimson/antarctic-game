import { expect, it } from 'vitest';
import { fromOffset, key, type HexKey } from './hex';
import { apply, checkMove, score } from './rules';
import { newGame, type GameState, type Supplies } from './state';

const at = (col: number, row: number) => key(fromOffset(col, row));

// A safe route down the fixed map: ice to the western pass, then straight down the plateau.
const ROUTE: HexKey[] = [
  at(4, 0), at(4, 1), at(4, 2), at(3, 3), at(3, 4), at(3, 5), at(3, 6), at(3, 7), at(3, 8), at(2, 9),
  at(2, 10), at(2, 11), at(2, 12), at(2, 13), at(3, 14), at(3, 15), at(3, 16), at(3, 17),
  ...Array.from({ length: 12 }, (_, i) => at(4, 18 + i)),
];

const none: Supplies = { food: 0, fuel: 0 };
const sum = (a: Supplies, b: Supplies): Supplies => ({ food: a.food + b.food, fuel: a.fuel + b.fuel });
const minus = (a: Supplies, b: Supplies): Supplies => ({ food: a.food - b.food, fuel: a.fuel - b.fuel });

// Plays the simplest depot strategy for the round trip: shuttle a share of the stores south one hex
// at a time, leaving at each hex what the walk home from it will cost, then walk home eating those.
function roundTrip(seed: number, budget: Supplies): GameState {
  let s = newGame(seed);
  const costOf = (from: HexKey, to: HexKey): Supplies => {
    const check = checkMove({ ...s, party: { ...s.party, at: from, carried: { food: 9, fuel: 9 } } }, to);
    if (!check.ok) throw new Error(`Route step ${from} -> ${to} is not walkable: ${check.reason}`);
    return check.cost;
  };
  const move = (to: HexKey) => {
    const before = s;
    s = apply(s, { kind: 'move', to });
    if (s === before) throw new Error(`Stuck on turn ${s.turn} at ${s.party.at} carrying ${JSON.stringify(s.party.carried)}`);
  };
  const unload = () => {
    const c = s.party.carried;
    if (c.food + c.fuel > 0) s = apply(s, { kind: 'transfer', food: -c.food, fuel: -c.fuel });
  };
  unload();
  // Crates at each hex that are not to be hauled further: base surplus, and food for the walk home.
  const keep = new Map<HexKey, Supplies>([[ROUTE[0], minus(s.caches[s.base], budget)]]);

  for (let i = 0; i < ROUTE.length - 1 && s.status === 'playing'; i++) {
    const here = ROUTE[i], next = ROUTE[i + 1];
    if (i > 0) keep.set(here, costOf(here, ROUTE[i - 1]));
    const back = costOf(next, here);
    const available = () => minus(s.caches[here] ?? none, keep.get(here) ?? none);
    const fwd = costOf(here, next);
    // Load the crates this trip itself needs first, then fill up in proportion to what's left.
    const load = (a: Supplies, roundTrip: boolean) => {
      const own = roundTrip ? sum(fwd, back) : fwd;
      const first = { food: Math.min(a.food, own.food), fuel: Math.min(a.fuel, own.fuel) };
      const rest = minus(a, first);
      const room = s.party.capacity - first.food - first.fuel;
      let fuel = Math.min(rest.fuel, Math.round(room * rest.fuel / Math.max(1, rest.food + rest.fuel)));
      const food = Math.min(rest.food, room - fuel);
      fuel = Math.min(rest.fuel, room - food);
      const total = sum(first, { food, fuel });
      if (total.food + total.fuel > 0) s = apply(s, { kind: 'transfer', ...total });
    };
    while (available().food + available().fuel > s.party.capacity) {
      load(available(), true);
      move(next);
      const c = s.party.carried;
      s = apply(s, { kind: 'transfer', food: back.food - c.food, fuel: back.fuel - c.fuel });
      move(here);
    }
    load(available(), false);
    move(next);
    unload();
  }
  // Walk home, picking up the crates left for each step.
  for (let i = ROUTE.length - 1; i > 0 && s.status === 'playing'; i--) {
    const need = costOf(ROUTE[i], ROUTE[i - 1]);
    const here = s.caches[ROUTE[i]] ?? none;
    const take = { food: Math.min(here.food, Math.max(0, need.food - s.party.carried.food)), fuel: Math.min(here.fuel, Math.max(0, need.fuel - s.party.carried.fuel)) };
    if (take.food + take.fuel > 0) s = apply(s, { kind: 'transfer', ...take });
    move(ROUTE[i - 1]);
  }
  return s;
}

it('the fixed map can be crossed to the pole and back', () => {
  for (const seed of [1, 2, 3]) {
    const end = roundTrip(seed, { food: 100, fuel: 40 });
    expect(end.status).toBe('won');
    expect(end.party.reachedPole).toBe(true);
    expect(end.turn).toBeLessThan(130);
    expect(score(end)).toBeGreaterThan(0);
  }
});
