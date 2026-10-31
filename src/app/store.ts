import { apply } from '../core/rules';
import type { Action, GameState } from '../core/state';

type Listener = (state: GameState) => void;

// Holds the current GameState and tells the screen when it changes.
export class Store {
  private listeners: Listener[] = [];

  constructor(private current: GameState) {}

  get state(): GameState { return this.current; }

  dispatch(action: Action): void {
    const next = apply(this.current, action);
    if (next === this.current) return;
    this.current = next;
    this.listeners.forEach(l => l(next));
  }

  reset(state: GameState): void {
    this.current = state;
    this.listeners.forEach(l => l(state));
  }

  subscribe(listener: Listener): void { this.listeners.push(listener); }
}
