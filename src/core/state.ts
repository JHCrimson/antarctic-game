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
  log: string[];                  // events, newest last
}

export type Action = { kind: 'move'; to: HexKey };

export const CAPACITY = 30;
export const STARTING_LOAD: Supplies = { food: 26, fuel: 4 };

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
    log: [],
  };
}
