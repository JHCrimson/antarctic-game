import { fromOffset, key, type HexKey } from './hex';
import type { Terrain, Tile } from './state';

// Stage 2's hand-made map, one string per row from the coast (top) to the pole (bottom).
// C coast   . ice   s sastrugi   x crevasse field   M mountain ridge   P glacier pass   ^ polar plateau
export const FIXED_MAP = [
  'CCCCCCCCC', //  0  home base in the middle
  'CCCCCCCCC',
  'CCCCCCCCC',
  '.........',
  '..s......',
  '....s..s.', //  5
  'xxx...xx.', //    first crevasse band
  '.xx..xxx.',
  '..x.s..x.',
  's....s...',
  'MMPMMMPMM', // 10 mountain ridge, crossed at two passes
  'MMPMMMPMM',
  'MMPMMMPMM',
  '.........',
  '.x....x..',
  'xxx.s.xxx', // 15 second crevasse band
  '.xx...xx.',
  '...s.....',
  '^^^^^^^^^', //    polar plateau from here on
  '^^^^^^^^^',
  '^^^^^^^^^', // 20
  '^^s^^^^s^',
  '^^^^^^^^^',
  '^^^^^^^^^',
  '^^^^^^^^^',
  '^s^^^s^^^', // 25
  '^^^^^^^^^',
  '^^^^^^^^^',
  '^^^^^^^^^',
  '^^^^^^^^^', //    the pole is in the middle of the last row
];

const LETTERS: Record<string, Terrain> = {
  C: 'coast', '.': 'ice', s: 'sastrugi', x: 'crevasse', M: 'ridge', P: 'pass', '^': 'plateau',
};

export function parseMap(rows: readonly string[]): Record<HexKey, Tile> {
  const tiles: Record<HexKey, Tile> = {};
  rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const terrain = LETTERS[ch];
      if (!terrain) throw new Error(`Unknown map letter "${ch}" at row ${row}, col ${col}`);
      tiles[key(fromOffset(col, row))] = { terrain };
    });
  });
  return tiles;
}
