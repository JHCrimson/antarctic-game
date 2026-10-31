import { corners, fromKey, neighbours, key } from '../core/hex';
import type { GameState, Terrain } from '../core/state';
import type { View } from './view';

const COLOURS = {
  sea: '#0d2a45',
  edge: '#b9cad6',
  move: '#2f7fd8',
  base: '#8a4b2a',
  party: '#c0392b',
  pole: '#d4a017',
};

const TERRAIN: Record<Terrain, string> = {
  coast: '#dce8ef',
  ice: '#f7fafc',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement, private view: View) {
    this.ctx = canvas.getContext('2d')!;
  }

  // Match the canvas to the screen at full pixel density so it stays sharp.
  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.view.width * dpr);
    this.canvas.height = Math.round(this.view.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(state: GameState): void {
    const { ctx, view } = this;
    const size = view.size;
    ctx.fillStyle = COLOURS.sea;
    ctx.fillRect(0, 0, view.width, view.height);

    const party = fromKey(state.party.at);
    const moves = new Set(neighbours(party).map(key).filter(k => k in state.map.tiles));

    for (const [k, tile] of Object.entries(state.map.tiles)) {
      const p = view.toScreen(fromKey(k as keyof typeof state.map.tiles));
      if (p.y < -size * 2 || p.y > view.height + size * 2) continue;
      this.hex(p.x, p.y, size, TERRAIN[tile.terrain], COLOURS.edge, 1);
    }

    for (const k of moves) {
      const p = view.toScreen(fromKey(k));
      this.hex(p.x, p.y, size - 2, 'rgba(47, 127, 216, 0.14)', COLOURS.move, 2);
    }

    this.base(view.toScreen(fromKey(state.base)), size);
    this.pole(view.toScreen(fromKey(state.pole)), size);
    const at = view.toScreen(party);
    // At the base, sit beside the hut so both stay visible.
    const onBase = state.party.at === state.base;
    this.party(onBase ? { x: at.x + size * 0.4, y: at.y + size * 0.35 } : at, onBase ? size * 0.75 : size);
  }

  private hex(cx: number, cy: number, size: number, fill: string, stroke: string, width: number): void {
    const { ctx } = this;
    ctx.beginPath();
    corners(cx, cy, size).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  private base(p: { x: number; y: number }, size: number): void {
    const { ctx } = this;
    const w = size * 0.9, h = size * 0.55;
    ctx.fillStyle = COLOURS.base;
    ctx.beginPath();
    ctx.moveTo(p.x - w / 2, p.y + h / 2);
    ctx.lineTo(p.x - w / 2, p.y - h / 6);
    ctx.lineTo(p.x, p.y - h * 0.85);
    ctx.lineTo(p.x + w / 2, p.y - h / 6);
    ctx.lineTo(p.x + w / 2, p.y + h / 2);
    ctx.closePath();
    ctx.fill();
  }

  private pole(p: { x: number; y: number }, size: number): void {
    const { ctx } = this;
    const outer = size * 0.6, inner = outer * 0.45;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? inner : outer;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const x = p.x + r * Math.cos(a), y = p.y + r * Math.sin(a);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = COLOURS.pole;
    ctx.fill();
    ctx.fillStyle = '#f4f8fb';
    ctx.font = `600 ${Math.round(size * 0.55)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('South Pole', p.x, p.y + size * 1.9);
  }

  private party(p: { x: number; y: number }, size: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = COLOURS.party;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
}
