import { registerSW } from 'virtual:pwa-register';
import { Store } from './app/store';
import { fromKey, key, type HexKey } from './core/hex';
import { TERRAIN, checkMove } from './core/rules';
import { newGame, type GameState } from './core/state';
import { attachPointer } from './input/pointer';
import { Renderer } from './render/canvas';
import { View } from './render/view';
import './style.css';

registerSW({ immediate: true });

const $ = (id: string) => document.getElementById(id)!;
const canvas = $('map') as HTMLCanvasElement;
const panel = $('panel');

const store = new Store(newGame());
const view = new View(store.state.map.cols, store.state.map.rows);
const renderer = new Renderer(canvas, view);

let preview: HexKey | null = null;   // hex shown in the panel; a second tap on it moves
let lastLogLength = 0;

const REASONS = {
  'off-map': '',
  'not-adjacent': 'Too far: you can only move to a highlighted hex',
  impassable: 'Impassable: find a glacier pass',
  'no-food': 'Not enough food',
  'no-fuel': 'Not enough fuel',
} as const;

function costText(cost: { food: number; fuel: number } | null): string {
  if (!cost) return 'Cannot be crossed';
  const parts = [`${cost.food} food`];
  if (cost.fuel) parts.push(`${cost.fuel} fuel`);
  return `Costs ${parts.join(' + ')}`;
}

function showPanel(title: string, detail: string, mode: '' | 'warn' | 'event' = ''): void {
  $('panel-title').textContent = title;
  $('panel-detail').textContent = detail;
  panel.className = mode;
}

function showPreview(s: GameState): void {
  if (!preview) return showPanel('Tap a highlighted hex to see what it costs', 'Drag to look ahead');
  const terrain = s.map.tiles[preview].terrain;
  const check = checkMove(s, preview);
  const name = TERRAIN[terrain].name;
  const extra = terrain === 'crevasse' ? '. Risk of losing 2 food' : '';
  if (check.ok) showPanel(name, `${costText(check.cost)}${extra}. Tap again to move`);
  else showPanel(name, `${costText(check.cost)}. ${REASONS[check.reason]}`, 'warn');
}

function renderHud(s: GameState): void {
  const { food, fuel } = s.party.carried;
  $('food').textContent = String(food);
  $('fuel').textContent = String(fuel);
  $('load').textContent = `${food + fuel}/${s.party.capacity}`;
  $('turn').textContent = String(s.turn);
  $('food').classList.toggle('low', food <= 5);
  $('fuel').classList.toggle('low', fuel <= 1);
}

function render(): void {
  renderHud(store.state);
  renderer.draw(store.state, preview);
}

function layout(): void {
  view.resize(window.innerWidth, window.innerHeight, $('hud').offsetHeight, panel.offsetHeight);
  renderer.resize();
  view.follow(fromKey(store.state.party.at));
  render();
}

store.subscribe(state => {
  preview = null;
  view.follow(fromKey(state.party.at));
  if (state.log.length > lastLogLength) showPanel('Accident', state.log[state.log.length - 1], 'event');
  else if (state.party.carried.food === 0) showPanel('Out of food', 'The party cannot go on. Tap Restart to try again.', 'warn');
  else showPreview(state);
  lastLogLength = state.log.length;
  render();
});

function tap(x: number, y: number): void {
  const target = key(view.fromScreen(x, y));
  if (!(target in store.state.map.tiles)) return;
  if (target === preview && checkMove(store.state, target).ok) {
    store.dispatch({ kind: 'move', to: target });
    return;
  }
  preview = target === store.state.party.at ? null : target;
  showPreview(store.state);
  render();
}

attachPointer(canvas, {
  tap,
  drag: dy => { view.scrollBy(dy); render(); },
});

$('restart').addEventListener('click', () => {
  if (store.state.turn > 0 && !confirm('Start a new expedition?')) return;
  lastLogLength = 0;
  store.reset(newGame());
  showPreview(store.state);
});

window.addEventListener('resize', layout);
showPreview(store.state);
layout();

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) Object.assign(window, { game: { store, view } });
