import { fromKey, key, neighbours, type HexKey } from './hex';
import { apply, checkMove, TERRAIN } from './rules';
import type { GameState, Supplies } from './state';

const none: Supplies = { food: 0, fuel: 0 };
const sum = (a: Supplies, b: Supplies): Supplies => ({ food: a.food + b.food, fuel: a.fuel + b.fuel });
const minus = (a: Supplies, b: Supplies): Supplies => ({ food: a.food - b.food, fuel: a.fuel - b.fuel });

// Cheapest route from base to pole that never enters a crevasse field (so no luck is involved),
// counting food + fuel crates per step. Returns null if there is no such route.
export function safeRoute(state: GameState): HexKey[] | null {
  const dist = new Map<HexKey, number>([[state.base, 0]]);
  const prev = new Map<HexKey, HexKey>();
  const open = new Set<HexKey>([state.base]);
  while (open.size) {
    let here: HexKey | undefined;
    for (const k of open) if (here === undefined || dist.get(k)! < dist.get(here)!) here = k;
    open.delete(here!);
    if (here === state.pole) break;
    for (const n of neighbours(fromKey(here!)).map(key)) {
      const tile = state.map.tiles[n];
      const cost = tile && tile.terrain !== 'crevasse' ? TERRAIN[tile.terrain].cost : null;
      if (!cost) continue;
      const d = dist.get(here!)! + cost.food + cost.fuel;
      if (d < (dist.get(n) ?? Infinity)) { dist.set(n, d); prev.set(n, here!); open.add(n); }
    }
  }
  if (!dist.has(state.pole)) return null;
  const route: HexKey[] = [state.pole];
  while (route[0] !== state.base) route.unshift(prev.get(route[0])!);
  return route;
}

// Plays the simplest depot strategy for the round trip along a route: shuttle `budget` crates south
// one hex at a time, leaving at each hex what the walk home from it will cost, then walk home eating
// those. Returns the final state, which is 'won' if the plan worked. Used to prove a map is winnable.
export function shuttleRoundTrip(start: GameState, route: HexKey[], budget: Supplies): GameState {
  let s = start;
  let stuck = false;
  const costOf = (from: HexKey, to: HexKey): Supplies => {
    const check = checkMove({ ...s, party: { ...s.party, at: from, carried: { food: 9, fuel: 9 } } }, to);
    if (!check.ok) throw new Error(`Route step ${from} -> ${to} is not walkable: ${check.reason}`);
    return check.cost;
  };
  const move = (to: HexKey) => {
    const before = s;
    s = apply(s, { kind: 'move', to });
    if (s === before) stuck = true;
  };
  const unload = () => {
    const c = s.party.carried;
    if (c.food + c.fuel > 0) s = apply(s, { kind: 'transfer', food: -c.food, fuel: -c.fuel });
  };
  unload();
  // Crates at each hex that are not to be hauled further: base surplus, and food for the walk home.
  const keep = new Map<HexKey, Supplies>([[route[0], minus(s.caches[s.base], budget)]]);

  for (let i = 0; i < route.length - 1 && s.status === 'playing' && !stuck; i++) {
    const here = route[i], next = route[i + 1];
    if (i > 0) keep.set(here, costOf(here, route[i - 1]));
    const back = costOf(next, here);
    const fwd = costOf(here, next);
    const available = () => minus(s.caches[here] ?? none, keep.get(here) ?? none);
    // Load the crates this trip itself needs first, then fill up in proportion to what's left.
    const load = (a: Supplies, roundTrip: boolean) => {
      const own = roundTrip ? sum(fwd, back) : fwd;
      const first = { food: Math.max(0, Math.min(a.food, own.food)), fuel: Math.max(0, Math.min(a.fuel, own.fuel)) };
      const rest = minus(a, first);
      const room = s.party.capacity - first.food - first.fuel;
      let fuel = Math.max(0, Math.min(rest.fuel, Math.round(room * rest.fuel / Math.max(1, rest.food + rest.fuel))));
      const food = Math.max(0, Math.min(rest.food, room - fuel));
      fuel = Math.max(0, Math.min(rest.fuel, room - food));
      const total = sum(first, { food, fuel });
      if (total.food + total.fuel > 0) s = apply(s, { kind: 'transfer', ...total });
    };
    while (available().food + available().fuel > s.party.capacity && !stuck) {
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
  for (let i = route.length - 1; i > 0 && s.status === 'playing' && !stuck; i--) {
    const need = costOf(route[i], route[i - 1]);
    const here = s.caches[route[i]] ?? none;
    const take = {
      food: Math.min(here.food, Math.max(0, need.food - s.party.carried.food)),
      fuel: Math.min(here.fuel, Math.max(0, need.fuel - s.party.carried.fuel)),
    };
    if (take.food + take.fuel > 0) s = apply(s, { kind: 'transfer', ...take });
    move(route[i - 1]);
  }
  return s;
}
