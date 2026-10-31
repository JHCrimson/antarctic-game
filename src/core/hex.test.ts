import { describe, expect, it } from 'vitest';
import { distance, fromOffset, fromPixel, isNeighbour, neighbours, toOffset, toPixel } from './hex';

describe('hex', () => {
  it('has six neighbours, each one step away', () => {
    const h = { q: 2, r: 3 };
    const ns = neighbours(h);
    expect(ns).toHaveLength(6);
    ns.forEach(n => expect(distance(h, n)).toBe(1));
  });

  it('measures distance along the grid', () => {
    expect(distance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3);
    expect(distance({ q: 0, r: 0 }, { q: 0, r: 5 })).toBe(5);
  });

  it('round-trips offset coordinates', () => {
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 9; col++) {
        expect(toOffset(fromOffset(col, row))).toEqual({ col, row });
      }
    }
  });

  it('treats the hexes left and right in the same row as neighbours', () => {
    expect(isNeighbour(fromOffset(3, 1), fromOffset(4, 1))).toBe(true);
    expect(isNeighbour(fromOffset(3, 1), fromOffset(5, 1))).toBe(false);
  });

  it('finds the hex under any point inside it', () => {
    const size = 20;
    for (const h of [{ q: 0, r: 0 }, { q: 3, r: 2 }, { q: -1, r: 5 }]) {
      const p = toPixel(h, size);
      expect(fromPixel(p.x, p.y, size)).toEqual(h);
      expect(fromPixel(p.x + size * 0.6, p.y + size * 0.3, size)).toEqual(h);
    }
  });
});
