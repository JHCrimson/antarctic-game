import { fromOffset, key, type HexKey } from './hex';

export type Terrain = 'coast' | 'ice';

export interface Tile { terrain: Terrain; }

export interface GameState {
  version: 1;
  turn: number;
  map: { cols: number; rows: number; tiles: Record<HexKey, Tile>; };
  base: HexKey;
  pole: HexKey;
  party: { at: HexKey; };
}

export type Action = { kind: 'move'; to: HexKey };

export const MAP_COLS = 9;
export const MAP_ROWS = 40;
const COAST_ROWS = 3;

// Stage 1 map: plain ice with a coastal strip. Terrain arrives in stage 2.
export function newGame(cols = MAP_COLS, rows = MAP_ROWS): GameState {
  const tiles: Record<HexKey, Tile> = {};
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles[key(fromOffset(col, row))] = { terrain: row < COAST_ROWS ? 'coast' : 'ice' };
    }
  }
  const mid = Math.floor(cols / 2);
  const base = key(fromOffset(mid, 0));
  return {
    version: 1,
    turn: 0,
    map: { cols, rows, tiles },
    base,
    pole: key(fromOffset(mid, rows - 1)),
    party: { at: base },
  };
}
