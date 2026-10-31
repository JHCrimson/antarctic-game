import { describe, expect, it } from 'vitest';
import { fromKey, fromOffset, key, neighbours } from './hex';
import { apply } from './rules';
import { newGame } from './state';

describe('move', () => {
  it('moves the party to a neighbouring hex and advances the turn', () => {
    const s = newGame();
    const to = key(fromOffset(4, 1));
    const next = apply(s, { kind: 'move', to });
    expect(next.party.at).toBe(to);
    expect(next.turn).toBe(1);
  });

  it('refuses a hex that is not next to the party', () => {
    const s = newGame();
    expect(apply(s, { kind: 'move', to: key(fromOffset(4, 3)) })).toBe(s);
  });

  it('refuses a hex off the map', () => {
    const s = newGame();
    const off = neighbours(fromKey(s.base)).map(key).find(k => !(k in s.map.tiles))!;
    expect(apply(s, { kind: 'move', to: off })).toBe(s);
  });
});

describe('newGame', () => {
  it('starts the party at the base on the coast, with the pole on the last row', () => {
    const s = newGame();
    expect(s.party.at).toBe(s.base);
    expect(fromKey(s.base).r).toBe(0);
    expect(s.map.tiles[s.base].terrain).toBe('coast');
    expect(fromKey(s.pole).r).toBe(s.map.rows - 1);
    expect(Object.keys(s.map.tiles)).toHaveLength(9 * 40);
  });
});
