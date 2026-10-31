import { nextRandom } from './random';
import { shuttleRoundTrip, safeRoute } from './solver';
import { newGame, type GameState, type Supplies } from './state';

export const MAP_COLS = 9;
export const MAP_ROWS = 30;
// The plan a generated map must survive: a naive shuttle there and back using only this many crates
// from base (out of 200), so a real player always has slack. The food/fuel split is tried in steps.
export const PROOF_CRATES = 140;
export const PROOF_BUDGET = { food: 100, fuel: 40 }; // the split that wins the hand-made map

// Builds a random map from a seed, one string per row in the letters parseMap reads.
// Same bands as the hand-made map, in random places: coast, ice with a crevasse band, a mountain
// ridge crossed at 1-3 passes, more ice with a second crevasse band, then the polar plateau.
export function roughMap(seed: number): string[] {
  let rng = seed | 0;
  const rand = () => { const [r, next] = nextRandom(rng); rng = next; return r; };
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

  const ridge = int(8, 12);                    // first of 3 ridge rows
  const plateau = int(Math.max(17, ridge + 6), 20);
  const grid: string[][] = Array.from({ length: MAP_ROWS }, (_, row) =>
    Array.from({ length: MAP_COLS }, () => {
      if (row < 3) return 'C';
      if (row >= plateau) return rand() < 0.07 ? 's' : '^';
      return rand() < 0.12 ? 's' : '.';
    }));

  // A crevasse band: 2-3 rows of mostly crevasses with a few gaps.
  const band = (first: number, last: number) => {
    const top = int(first, last - 2);
    const depth = int(2, 3);
    for (let row = top; row < top + depth && row <= last; row++)
      for (let col = 0; col < MAP_COLS; col++) if (rand() < 0.55) grid[row][col] = 'x';
  };
  band(4, ridge - 1);
  band(ridge + 3, plateau - 1);

  // The ridge, with 1-3 passes going straight through it.
  for (let row = ridge; row < ridge + 3; row++) grid[row].fill('M');
  const passes = int(1, 3);
  for (let p = 0; p < passes; p++) {
    const col = int(0, MAP_COLS - 1);
    for (let row = ridge; row < ridge + 3; row++) grid[row][col] = 'P';
  }
  // The pole sits on plain plateau.
  grid[MAP_ROWS - 1][Math.floor(MAP_COLS / 2)] = '^';
  return grid.map(r => r.join(''));
}

// A random map that is proven winnable there and back. Tries roughMap with successive sub-seeds
// until the shuttle plan wins on one; the same seed always gives the same map.
export function generateMap(seed: number): string[] {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const rows = roughMap((seed | 0) + attempt * 7919);
    if (isWinnable(rows)) return rows;
  }
  throw new Error(`No winnable map found for seed ${seed}`);
}

export function isWinnable(rows: readonly string[]): boolean {
  return proofBudget(rows) !== null;
}

// The first food/fuel split of PROOF_CRATES with which the shuttle plan wins this map, if any.
export function proofBudget(rows: readonly string[]): Supplies | null {
  const game = newGame(1, rows);
  const route = safeRoute(game);
  if (!route) return null;
  for (let food = 90; food <= 115; food += 5) {
    const budget = { food, fuel: PROOF_CRATES - food };
    if (shuttleRoundTrip(game, route, budget).status === 'won') return budget;
  }
  return null;
}

// A new expedition on a random, winnable map. Pass a seed to replay the same map.
export function newExpedition(seed = Math.floor(Math.random() * 1_000_000)): GameState {
  return newGame(seed, generateMap(seed));
}
