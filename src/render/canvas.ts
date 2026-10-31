import { corners, fromKey, type HexKey } from '../core/hex';
import { moveTargets } from '../core/rules';
import type { GameState, Terrain } from '../core/state';
import type { View } from './view';

const COLOURS = {
  sea: '#0d2a45',
  edge: '#b9cad6',
  move: '#2f7fd8',
  base: '#8a4b2a',
  party: '#c0392b',
  pole: '#d4a017',
  cache: '#e67e22',
};

const TERRAIN: Record<Terrain, string> = {
  coast: '#dce8ef',
  ice: '#f7fafc',
  sastrugi: '#e4eaee',
  crevasse: '#bcdcf0',
  ridge: '#7d8790',
  pass: '#c9c2b4',
  plateau: '#f3ecdc',
};

// Simple marks on top of the colour, so terrain reads even without colour vision.
const MARK = {
  sastrugi: '#93a5b3',
  crevasse: '#2a6a99',
  ridge: '#4b545c',
  pass: '#7a6f5e',
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

  draw(state: GameState, preview: HexKey | null): void {
    const { ctx, view } = this;
    const size = view.size;
    ctx.fillStyle = COLOURS.sea;
    ctx.fillRect(0, 0, view.width, view.height);

    const moves = moveTargets(state).filter(k => state.map.tiles[k].terrain !== 'ridge');
    // The map wraps east-west, so each thing is drawn at every copy that is on screen.
    const each = (k: HexKey, draw: (p: { x: number; y: number }) => void) => {
      const p = view.toScreen(fromKey(k));
      if (p.y < -size * 2 || p.y > view.height + size * 2) return;
      for (const x of view.copiesX(p.x)) draw({ x, y: p.y });
    };

    for (const [k, tile] of Object.entries(state.map.tiles)) {
      each(k as HexKey, p => {
        this.hex(p.x, p.y, size, TERRAIN[tile.terrain], COLOURS.edge, 1);
        this.mark(tile.terrain, p.x, p.y, size);
      });
    }

    for (const k of moves) each(k, p => this.hex(p.x, p.y, size - 2, 'rgba(47, 127, 216, 0.14)', COLOURS.move, 2));
    if (preview) each(preview, p => this.hex(p.x, p.y, size - 2, 'rgba(47, 127, 216, 0.35)', COLOURS.move, 4));

    for (const k of Object.keys(state.caches) as HexKey[]) {
      if (k !== state.base) each(k, p => this.flag(p, size));
    }
    each(state.base, p => this.base(p, size));
    each(state.pole, p => this.pole(p, size));
    // At the base or a cache, sit beside the hut or flag so both stay visible.
    const beside = state.party.at in state.caches;
    each(state.party.at, at => this.party(beside ? { x: at.x + size * 0.4, y: at.y + size * 0.35 } : at, beside ? size * 0.75 : size));
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

  private mark(terrain: Terrain, x: number, y: number, size: number): void {
    const { ctx } = this;
    const s = size * 0.4;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    switch (terrain) {
      case 'sastrugi':
        for (const dx of [-s * 0.8, 0, s * 0.8]) {
          ctx.moveTo(x + dx - s * 0.3, y + s * 0.3);
          ctx.lineTo(x + dx + s * 0.3, y - s * 0.3);
        }
        ctx.strokeStyle = MARK.sastrugi;
        ctx.stroke();
        break;
      case 'crevasse':
        ctx.moveTo(x - s, y - s * 0.2);
        ctx.lineTo(x - s * 0.4, y + s * 0.3);
        ctx.lineTo(x + s * 0.1, y - s * 0.3);
        ctx.lineTo(x + s * 0.6, y + s * 0.25);
        ctx.lineTo(x + s, y - s * 0.1);
        ctx.strokeStyle = MARK.crevasse;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case 'ridge':
        ctx.moveTo(x - s * 1.1, y + s * 0.6);
        ctx.lineTo(x - s * 0.4, y - s * 0.6);
        ctx.lineTo(x + s * 0.1, y + s * 0.2);
        ctx.lineTo(x + s * 0.5, y - s * 0.3);
        ctx.lineTo(x + s * 1.1, y + s * 0.6);
        ctx.closePath();
        ctx.fillStyle = MARK.ridge;
        ctx.fill();
        break;
      case 'pass':
        ctx.moveTo(x - s * 0.6, y - s * 0.4);
        ctx.lineTo(x, y + s * 0.3);
        ctx.lineTo(x + s * 0.6, y - s * 0.4);
        ctx.strokeStyle = MARK.pass;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        break;
    }
  }

  // A cache: a small orange flag on a pole, to the left of the hex centre.
  private flag(p: { x: number; y: number }, size: number): void {
    const { ctx } = this;
    const x = p.x - size * 0.35, top = p.y - size * 0.55, bottom = p.y + size * 0.45;
    ctx.strokeStyle = '#3d2b1f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, top);
    ctx.stroke();
    ctx.fillStyle = COLOURS.cache;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + size * 0.6, top + size * 0.2);
    ctx.lineTo(x, top + size * 0.4);
    ctx.closePath();
    ctx.fill();
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
