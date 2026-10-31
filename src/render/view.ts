import { SQRT3, fromPixel, toPixel, type Hex } from '../core/hex';

const MAX_SIZE = 34; // keeps hexes sensible on tablets and desktops

// Maps between hexes and screen pixels, and owns the vertical scroll.
export class View {
  size = 20;
  width = 0;
  height = 0;
  scroll = 0;
  private ox = 0;
  private oy = 0;
  private bottomInset = 0;

  constructor(private cols: number, private rows: number) {}

  resize(width: number, height: number, topInset: number, bottomInset: number): void {
    this.bottomInset = bottomInset;
    this.width = width;
    this.height = height;
    this.size = Math.min(MAX_SIZE, width / ((this.cols + 0.5) * SQRT3));
    const gridWidth = (this.cols + 0.5) * SQRT3 * this.size;
    this.ox = (width - gridWidth) / 2 + SQRT3 * this.size / 2;
    this.oy = topInset + this.size * 2.5; // a strip of sea above the coast
    this.scroll = this.clamp(this.scroll);
  }

  get worldHeight(): number {
    return this.oy + this.rows * 1.5 * this.size + this.size * 4 + this.bottomInset;
  }

  toScreen(h: Hex): { x: number; y: number } {
    const p = toPixel(h, this.size);
    return { x: p.x + this.ox, y: p.y + this.oy - this.scroll };
  }

  fromScreen(x: number, y: number): Hex {
    return fromPixel(x - this.ox, y - this.oy + this.scroll, this.size);
  }

  scrollBy(dy: number): void { this.scroll = this.clamp(this.scroll + dy); }

  // Keep the party about a third of the way down the screen.
  follow(h: Hex): void {
    const y = toPixel(h, this.size).y + this.oy;
    this.scroll = this.clamp(y - this.height * 0.35);
  }

  private clamp(s: number): number {
    return Math.max(0, Math.min(s, Math.max(0, this.worldHeight - this.height)));
  }
}
