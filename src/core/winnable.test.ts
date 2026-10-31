import { expect, it } from 'vitest';
import { fromOffset, key, type HexKey } from './hex';
import { apply, checkMove, score } from './rules';
import { newGame, type GameState, type Supplies } from './state';

const at = (col: number, row: number) => key(fromOffset(col, row));

// A safe route down the fixed map: ice to the western pass, then straight down the plateau.
const ROUTE: HexKey[] = [
  at(4, 0), at(4, 1), at(4, 2), at(3, 3), at(3, 4), at(3, 5), at(3, 6), at(3, 7), at(3, 8), at(3, 9),
  at(3, 10), at(2, 11), at(2, 12), at(2, 13), at(2, 14), at(2, 15), at(2, 16), at(2, 17), at(3, 18),
  at(3, 19), at(3, 20), at(3, 21), at(3, 22), at(3, 23),
  ...Array.from({ length: 16 }, (_, i) => at(4, 24 + i)),
];

// Plays the simplest depot strategy: shuttle a fixed share of the stores one hex at a time,
// leaving just enough on the sledge to walk back for the next load.
function shuttle(seed: number, budget: Supplies): GameState {
  let s = newGame(seed);
  s = apply(s, { kind: 'transfer', food: -s.party.carried.food, fuel: -s.party.carried.fuel });
  const keepAtBase = { food: s.caches[s.base].food - budget.food, fuel: s.caches[s.base].fuel - budget.fuel };
  const costOf = (from: HexKey, to: HexKey) => {
    const check = checkMove({ ...s, party: { ...s.party, at: from, carried: { food: 9, fuel: 9 } } }, to);
    if (!check.ok) throw new Error(`Route step ${from} -> ${to} is not walkable: ${check.reason}`);
    return check.cost;
  };
  const move = (to: HexKey) => {
    const before = s;
    s = apply(s, { kind: 'move', to });
    if (s === before) throw new Error(`Stuck on turn ${s.turn} carrying ${JSON.stringify(s.party.carried)}`);
  };

  for (let i = 0; i < ROUTE.length - 1 && s.status === 'playing'; i++) {
    const here = ROUTE[i], next = ROUTE[i + 1];
    const back = costOf(next, here);
    const available = (): Supplies => {
      const c = s.caches[here] ?? { food: 0, fuel: 0 };
      return i === 0 ? { food: c.food - keepAtBase.food, fuel: c.fuel - keepAtBase.fuel } : c;
    };
    const load = (a: Supplies) => {
      const room = s.party.capacity - s.party.carried.food - s.party.carried.fuel;
      let fuel = Math.min(a.fuel, Math.round(room * a.fuel / (a.food + a.fuel)));
      const food = Math.min(a.food, room - fuel);
      fuel = Math.min(a.fuel, room - food);
      s = apply(s, { kind: 'transfer', food, fuel });
    };
    while (available().food + available().fuel > s.party.capacity) {
      load(available());
      move(next);
      const c = s.party.carried;
      s = apply(s, { kind: 'transfer', food: back.food - c.food, fuel: back.fuel - c.fuel });
      move(here);
    }
    const rest = available();
    if (rest.food + rest.fuel > 0) load(rest);
    move(next);
    const c = s.party.carried;
    if (s.status === 'playing' && c.food + c.fuel > 0) s = apply(s, { kind: 'transfer', food: -c.food, fuel: -c.fuel });
  }
  return s;
}

it('the fixed map can be won with about two thirds of the stores', () => {
  for (const seed of [1, 2, 3]) {
    const end = shuttle(seed, { food: 110, fuel: 25 });
    expect(end.status).toBe('won');
    expect(end.turn).toBeLessThan(120);
    expect(score(end)).toBeGreaterThan(0);
  }
});
