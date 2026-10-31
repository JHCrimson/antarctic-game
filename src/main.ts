import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { Store } from './app/store';
import { fromKey, key } from './core/hex';
import { newGame } from './core/state';
import { attachPointer } from './input/pointer';
import { Renderer } from './render/canvas';
import { View } from './render/view';

registerSW({ immediate: true });

const canvas = document.getElementById('map') as HTMLCanvasElement;
const hud = document.getElementById('hud')!;
const turnEl = document.getElementById('turn')!;
const hintEl = document.getElementById('hint')!;

const store = new Store(newGame());
const view = new View(store.state.map.cols, store.state.map.rows);
const renderer = new Renderer(canvas, view);

function render(): void {
  const s = store.state;
  turnEl.textContent = `Turn ${s.turn}`;
  hintEl.textContent = s.turn === 0 ? 'Tap a neighbouring hex to move' : 'Drag to look ahead';
  renderer.draw(s);
}

function layout(): void {
  view.resize(window.innerWidth, window.innerHeight, hud.offsetHeight);
  renderer.resize();
  view.follow(fromKey(store.state.party.at));
  render();
}

store.subscribe(state => {
  view.follow(fromKey(state.party.at));
  render();
});

attachPointer(canvas, {
  tap: (x, y) => store.dispatch({ kind: 'move', to: key(view.fromScreen(x, y)) }),
  drag: dy => { view.scrollBy(dy); render(); },
});

window.addEventListener('resize', layout);
layout();
