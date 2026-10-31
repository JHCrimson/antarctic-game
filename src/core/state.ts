import { fromOffset, key, type HexKey } from './hex';
import { FIXED_MAP, parseMap } from './map';

export type Terrain = 'coast' | 'ice' | 'sastrugi' | 'crevasse' | 'ridge' | 'pass' | 'plateau';

export interface Tile { terrain: Terrain; }

export interface Supplies { food: number; fuel: number; }

export interface GameState {
  version: 1;
  turn: number;
  rng: number;                    // seed for the next random roll
  map: { cols: number; rows: number; tiles: Record<HexKey, Tile>; };
  base: HexKey;
  pole: HexKey;
  party: { at: HexKey; carried: Supplies; capacity: number; };
  caches: Record<HexKey, Supplies>; // includes the home base stores
  log: string[];                  // events, newest last
}

export type Action =
  | { kind: 'move'; to: HexKey }
  // Move crates between the sledge and the cache on the party's hex.
  // Positive numbers pick up from the cache, negative numbers drop into it.
  | { kind: 'transfer'; food: number; fuel: number };

export const CAPACITY = 30;
export const STARTING_LOAD: Supplies = { food: 26, fuel: 4 };
export const BASE_STOCKPILE: Supplies = { food: 120, fuel: 30 }; // includes the starting load

export function newGame(seed = Date.now(), rows: readonly string[] = FIXED_MAP): GameState {
  const cols = rows[0].length;
  const mid = Math.floor(cols / 2);
  const base = key(fromOffset(mid, 0));
  return {
    version: 1,
    turn: 0,
    rng: seed | 0,
    map: { cols, rows: rows.length, tiles: parseMap(rows) },
    base,
    pole: key(fromOffset(mid, rows.length - 1)),
    party: { at: base, carried: { ...STARTING_LOAD }, capacity: CAPACITY },
    caches: {
      [base]: {
        food: BASE_STOCKPILE.food - STARTING_LOAD.food,
        fuel: BASE_STOCKPILE.fuel - STARTING_LOAD.fuel,
      },
    },
    log: [],
  };
}
