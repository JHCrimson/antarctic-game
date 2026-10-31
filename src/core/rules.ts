import { fromKey, isNeighbour } from './hex';
import type { Action, GameState } from './state';

// Pure rules: returns the next state, or the same state if the action is not allowed.
export function apply(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case 'move': {
      if (!canMove(state, action.to)) return state;
      return { ...state, turn: state.turn + 1, party: { ...state.party, at: action.to } };
    }
  }
}

export function canMove(state: GameState, to: GameState['party']['at']): boolean {
  return to in state.map.tiles && isNeighbour(fromKey(state.party.at), fromKey(to));
}
