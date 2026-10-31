// Small seeded random number generator (mulberry32), so the rules stay pure and replayable.
// Returns a number in [0, 1) and the next seed to store in the game state.
export function nextRandom(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}
