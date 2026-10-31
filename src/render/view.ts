import { SQRT3, fromPixel, toPixel, type Hex } from '../core/hex';

const MAX_SIZE = 34; // keeps hexes sensible on tablets and desktops

// How many columns fit across the screen. Fewer than the map has, so the band scrolls sideways
// and its wrap-around is visible.
const VISIBLE_COLS = 7;

// Maps between hexes and screen pixels, and owns the scroll. The map wraps east-west, so the
// sideways scroll is kept within one map width and the renderer draws neighbouring copies.
export class View {
  size = 20;
  width = 0;
  height = 0;
  scroll = 0;
  scrollX = 0;
  private oy = 0;
  private bottomInset = 0;

  constructor(private cols: number, private rows: number) {}

  resize(width: number, height: number, topInset: number, bottomInset: number): void {
    this.bottomInset = bottomInset;
    this.width = width;
    this.height = height;
    this.size = Math.min(MAX_SIZE, width / (VISIBLE_COLS * SQRT3));
    this.oy = topInset + this.size * 2.5; // a strip of sea above the coast
    this.scroll = this.clamp(this.scroll);
  }

  // Pixel width of one copy of the map: after this many pixels the columns repeat.
  get worldWidth(): number { return this.cols * SQRT3 * this.size; }

  get worldHeight(): number {
    return this.oy + this.rows * 1.5 * this.size + this.size * 4 + this.bottomInset;
  }

  toScreen(h: Hex): { x: number; y: number } {
    const p = toPixel(h, this.size);
    return { x: p.x - this.scrollX, y: p.y + this.oy - this.scroll };
  }

  fromScreen(x: number, y: number): Hex {
    return fromPixel(x + this.scrollX, y - this.oy + this.scroll, this.size);
  }

  scrollBy(dx: number, dy: number): void {
    this.scroll = this.clamp(this.scroll + dy);
    this.scrollX = this.wrapX(this.scrollX + dx);
  }

  // Screen x positions of every copy of a hex that might be on screen.
  copiesX(x: number): number[] {
    const w = this.worldWidth, margin = this.size * 2;
    const xs: number[] = [];
    for (let k = -2; k <= 2; k++) {
      const cx = x + k * w;
      if (cx > -margin && cx < this.width + margin) xs.push(cx);
    }
    return xs;
  }

  // Keep the party centred across the screen and about a third of the way down.
  follow(h: Hex): void {
    const p = toPixel(h, this.size);
    this.scroll = this.clamp(p.y + this.oy - this.height * 0.35);
    this.scrollX = this.wrapX(p.x - this.width / 2);
  }

  private wrapX(x: number): number {
    const w = this.worldWidth;
    return w > 0 ? ((x % w) + w) % w : 0;
  }

  private clamp(s: number): number {
    return Math.max(0, Math.min(s, Math.max(0, this.worldHeight - this.height)));
  }
}
