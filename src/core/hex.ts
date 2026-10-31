// Pointy-top hexes in axial coordinates (q, r).
// Rows are laid out "odd-r": odd rows are pushed half a hex to the right.
// Reference: https://www.redblobgames.com/grids/hexagons/

export interface Hex { q: number; r: number; }
export type HexKey = `${number},${number}`;

export const SQRT3 = Math.sqrt(3);

const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

export const key = (h: Hex): HexKey => `${h.q},${h.r}`;

export function fromKey(k: HexKey): Hex {
  const [q, r] = k.split(',').map(Number);
  return { q, r };
}

export const neighbours = (h: Hex): Hex[] => DIRECTIONS.map(d => ({ q: h.q + d.q, r: h.r + d.r }));

export const distance = (a: Hex, b: Hex): number => {
  const dq = a.q - b.q, dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
};

export const isNeighbour = (a: Hex, b: Hex): boolean => distance(a, b) === 1;

// Offset (col, row) <-> axial, for odd-r layout.
export const fromOffset = (col: number, row: number): Hex => ({ q: col - (row - (row & 1)) / 2, r: row });
export const toOffset = (h: Hex): { col: number; row: number } => ({ col: h.q + (h.r - (h.r & 1)) / 2, row: h.r });

// Centre of a hex in pixels, for hexes of the given size (centre to corner).
export const toPixel = (h: Hex, size: number): { x: number; y: number } => ({
  x: size * SQRT3 * (h.q + h.r / 2),
  y: size * 1.5 * h.r,
});

// The hex containing a pixel position.
export function fromPixel(x: number, y: number, size: number): Hex {
  const q = (SQRT3 / 3 * x - y / 3) / size;
  const r = (2 / 3 * y) / size;
  return round(q, r);
}

function round(fq: number, fr: number): Hex {
  const fs = -fq - fr;
  let q = Math.round(fq), r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 }; // + 0 turns -0 into 0
}

// Corner points of a hex centred on (cx, cy).
export function corners(cx: number, cy: number, size: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  return pts;
}

// The map wraps east-west like a band around the pole: column `cols` is column 0 again.
// In axial coordinates that is a shift of q by `cols` in the same row.
export function wrap(h: Hex, cols: number): Hex {
  const { col, row } = toOffset(h);
  return fromOffset(((col % cols) + cols) % cols, row);
}

export const wrappedNeighbours = (h: Hex, cols: number): Hex[] => neighbours(h).map(n => wrap(n, cols));

// Steps between two hexes, going either way round the band.
export function wrappedDistance(a: Hex, b: Hex, cols: number): number {
  return Math.min(...[-cols, 0, cols].map(dq => distance(a, { q: b.q + dq, r: b.r })));
}
