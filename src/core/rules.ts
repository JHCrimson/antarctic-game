import { fromKey, isNeighbour, type HexKey } from './hex';
import { nextRandom } from './random';
import type { Action, GameState, Supplies, Terrain } from './state';

export interface TerrainInfo { name: string; cost: Supplies | null; } // null cost = impassable

export const TERRAIN: Record<Terrain, TerrainInfo> = {
  coast: { name: 'Coast', cost: { food: 1, fuel: 0 } },
  ice: { name: 'Ice shelf', cost: { food: 1, fuel: 0 } },
  sastrugi: { name: 'Sastrugi', cost: { food: 2, fuel: 0 } },
  crevasse: { name: 'Crevasse field', cost: { food: 1, fuel: 0 } },
  ridge: { name: 'Mountain ridge', cost: null },
  pass: { name: 'Glacier pass', cost: { food: 2, fuel: 1 } },
  plateau: { name: 'Polar plateau', cost: { food: 1, fuel: 1 } },
};

export const CREVASSE_CHANCE = 0.25;
export const CREVASSE_LOSS = 2; // food crates lost when one falls in

export type MoveCheck =
  | { ok: true; cost: Supplies }
  | { ok: false; reason: 'off-map' | 'not-adjacent' | 'impassable' | 'no-food' | 'no-fuel'; cost: Supplies | null };

export function checkMove(state: GameState, to: HexKey): MoveCheck {
  const tile = state.map.tiles[to];
  if (!tile) return { ok: false, reason: 'off-map', cost: null };
  const cost = TERRAIN[tile.terrain].cost;
  if (!isNeighbour(fromKey(state.party.at), fromKey(to))) return { ok: false, reason: 'not-adjacent', cost };
  if (!cost) return { ok: false, reason: 'impassable', cost };
  const { food, fuel } = state.party.carried;
  if (food < cost.food) return { ok: false, reason: 'no-food', cost };
  if (fuel < cost.fuel) return { ok: false, reason: 'no-fuel', cost };
  return { ok: true, cost };
}

// Pure rules: returns the next state, or the same state if the action is not allowed.
export function apply(state: GameState, action: Action): GameState {
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
          log.push(`Turn ${turn}: a sledge runner slipped into a crevasse. Lost ${lost} food.`);
        }
      }
      return { ...state, turn, rng, log, party: { ...state.party, at: action.to, carried } };
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
      return { ...state, caches, party: { ...state.party, carried } };
    }
  }
}

// Whether crates can move between the sledge and the cache on the party's hex.
export function canTransfer(state: GameState, food: number, fuel: number): boolean {
  if (!Number.isInteger(food) || !Number.isInteger(fuel) || (food === 0 && fuel === 0)) return false;
  const cache = state.caches[state.party.at] ?? { food: 0, fuel: 0 };
  const { carried, capacity } = state.party;
  const after = { food: carried.food + food, fuel: carried.fuel + fuel };
  return after.food >= 0 && after.fuel >= 0
    && cache.food - food >= 0 && cache.fuel - fuel >= 0
    && after.food + after.fuel <= capacity;
}
