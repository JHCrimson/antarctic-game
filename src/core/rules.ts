import { fromKey, isNeighbour, key, neighbours, type HexKey } from './hex';
import { nextRandom } from './random';
import type { Action, GameState, LogEntry, Supplies, Terrain } from './state';

export interface TerrainInfo { name: string; cost: Supplies | null; } // null cost = impassable

export const TERRAIN: Record<Terrain, TerrainInfo> = {
  coast: { name: 'Coast', cost: { food: 1, fuel: 0 } },
  ice: { name: 'Ice shelf', cost: { food: 1, fuel: 0 } },
  sastrugi: { name: 'Sastrugi', cost: { food: 2, fuel: 0 } },
  crevasse: { name: 'Crevasse field', cost: { food: 1, fuel: 0 } },
  ridge: { name: 'Mountain ridge', cost: null },
  pass: { name: 'Glacier pass', cost: { food: 2, fuel: 1 } },
  plateau: { name: 'Polar plateau', cost: { food: 0, fuel: 1 } },
};

export const CREVASSE_CHANCE = 0.25;
export const CREVASSE_LOSS = 2; // food crates lost when one falls in

export type MoveCheck =
  | { ok: true; cost: Supplies }
  | { ok: false; reason: 'over' | 'off-map' | 'not-adjacent' | 'impassable' | 'no-food' | 'no-fuel'; cost: Supplies | null };

export function checkMove(state: GameState, to: HexKey): MoveCheck {
  const tile = state.map.tiles[to];
  if (!tile) return { ok: false, reason: 'off-map', cost: null };
  const cost = TERRAIN[tile.terrain].cost;
  if (state.status !== 'playing') return { ok: false, reason: 'over', cost };
  if (!isNeighbour(fromKey(state.party.at), fromKey(to))) return { ok: false, reason: 'not-adjacent', cost };
  if (!cost) return { ok: false, reason: 'impassable', cost };
  const { food, fuel } = state.party.carried;
  if (food < cost.food) return { ok: false, reason: 'no-food', cost };
  if (fuel < cost.fuel) return { ok: false, reason: 'no-fuel', cost };
  return { ok: true, cost };
}

// Pure rules: returns the next state, or the same state if the action is not allowed.
export function apply(state: GameState, action: Action): GameState {
  if (state.status !== 'playing') return state;
  switch (action.kind) {
    case 'move': {
      const check = checkMove(state, action.to);
      if (!check.ok) return state;
      let carried = {
        food: state.party.carried.food - check.cost.food,
        fuel: state.party.carried.fuel - check.cost.fuel,
      };
      let rng = state.rng;
      const log = [...state.log];
      const turn = state.turn + 1;
      if (state.map.tiles[action.to].terrain === 'crevasse') {
        const [roll, next] = nextRandom(rng);
        rng = next;
        if (roll < CREVASSE_CHANCE && carried.food > 0) {
          const lost = Math.min(CREVASSE_LOSS, carried.food);
          carried = { ...carried, food: carried.food - lost };
          log.push({ turn, kind: 'accident', text: `A sledge runner slipped into a crevasse. Lost ${lost} food.` });
        }
      }
      return settle({ ...state, turn, rng, log, party: { ...state.party, at: action.to, carried } });
    }
    case 'transfer': {
      if (!canTransfer(state, action.food, action.fuel)) return state;
      const at = state.party.at;
      const cache = state.caches[at] ?? { food: 0, fuel: 0 };
      const left = { food: cache.food - action.food, fuel: cache.fuel - action.fuel };
      const caches: Record<HexKey, Supplies> = { ...state.caches, [at]: left };
      if (left.food === 0 && left.fuel === 0 && at !== state.base) delete caches[at];
      const carried = {
        food: state.party.carried.food + action.food,
        fuel: state.party.carried.fuel + action.fuel,
      };
      const log = logTransfer(state, { food: action.food, fuel: action.fuel });
      return settle({ ...state, caches, log, party: { ...state.party, carried } });
    }
  }
}

// After every action: has the party reached the pole, got home, or run out of ways to go on?
// Winning takes the whole journey: reach the pole, then return to the home base.
function settle(state: GameState): GameState {
  const { at, reachedPole } = state.party;
  if (at === state.pole && !reachedPole) {
    state = {
      ...state,
      party: { ...state.party, reachedPole: true },
      log: [...state.log, { turn: state.turn, kind: 'pole', text: 'Reached the South Pole. Now get everyone home.' }],
    };
  }
  if (at === state.base && reachedPole) {
    return {
      ...state,
      status: 'won',
      log: [...state.log, { turn: state.turn, kind: 'won', text: `Home from the South Pole. Score ${score(state)}.` }],
    };
  }
  if (isStranded(state)) {
    return {
      ...state,
      status: 'lost',
      log: [...state.log, { turn: state.turn, kind: 'lost', text: 'Stranded without the supplies to go on.' }],
    };
  }
  return state;
}

// Stranded = no neighbouring hex can be entered, even after taking everything from the cache here.
export function isStranded(state: GameState): boolean {
  const here = state.caches[state.party.at] ?? { food: 0, fuel: 0 };
  const best = { food: state.party.carried.food + here.food, fuel: state.party.carried.fuel + here.fuel };
  const hopeful: GameState = { ...state, party: { ...state.party, carried: best } };
  return !neighbours(fromKey(state.party.at)).some(n => checkMove(hopeful, key(n)).ok);
}

// Score for a finished expedition: 10 points per crate left at base or on the sledge, minus 1 per turn.
export const POINTS_PER_CRATE = 10;

export function score(state: GameState): number {
  const base = state.caches[state.base] ?? { food: 0, fuel: 0 };
  const { food, fuel } = state.party.carried;
  return Math.max(0, POINTS_PER_CRATE * (base.food + base.fuel + food + fuel) - state.turn);
}

// Whether crates can move between the sledge and the cache on the party's hex.
export function canTransfer(state: GameState, food: number, fuel: number): boolean {
  if (state.status !== 'playing') return false;
  if (!Number.isInteger(food) || !Number.isInteger(fuel) || (food === 0 && fuel === 0)) return false;
  const cache = state.caches[state.party.at] ?? { food: 0, fuel: 0 };
  const { carried, capacity } = state.party;
  const after = { food: carried.food + food, fuel: carried.fuel + fuel };
  return after.food >= 0 && after.fuel >= 0
    && cache.food - food >= 0 && cache.fuel - fuel >= 0
    && after.food + after.fuel <= capacity;
}

function logTransfer(state: GameState, change: Supplies): LogEntry[] {
  const at = state.party.at;
  const last = state.log.at(-1);
  const merge = last?.kind === 'transfer' && last.turn === state.turn && last.at === at;
  const delta = merge
    ? { food: last.delta!.food + change.food, fuel: last.delta!.fuel + change.fuel }
    : change;
  const log = merge ? state.log.slice(0, -1) : [...state.log];
  if (delta.food === 0 && delta.fuel === 0) return log; // the changes cancelled out
  const place = at === state.base ? 'the base' : 'a cache';
  log.push({ turn: state.turn, kind: 'transfer', at, delta, text: describeTransfer(delta, place) });
  return log;
}

function describeTransfer(delta: Supplies, place: string): string {
  const list = (food: number, fuel: number) =>
    [food && `${food} food`, fuel && `${fuel} fuel`].filter(Boolean).join(' and ');
  const loaded = list(Math.max(delta.food, 0), Math.max(delta.fuel, 0));
  const left = list(Math.max(-delta.food, 0), Math.max(-delta.fuel, 0));
  const parts = [loaded && `loaded ${loaded}`, left && `left ${left}`].filter(Boolean).join(' and ');
  const text = `${parts} at ${place}.`;
  return text[0].toUpperCase() + text.slice(1);
}
