import { describe, expect, it } from 'vitest';
import { fromOffset, key } from './hex';
import { apply, isStranded, score } from './rules';
import { newGame, type GameState } from './state';

const at = (col: number, row: number) => key(fromOffset(col, row));

function game(col: number, row: number, food: number, fuel: number): GameState {
  const s = newGame(1);
  return { ...s, party: { ...s.party, at: at(col, row), carried: { food, fuel } } };
}

describe('winning', () => {
  it('needs the party to reach the pole and then get back to base', () => {
    const s = game(4, 28, 10, 5);
    const atPole = apply(s, { kind: 'move', to: s.pole });
    expect(atPole.status).toBe('playing');
    expect(atPole.party.reachedPole).toBe(true);
    expect(atPole.log.at(-1)?.kind).toBe('pole');

    // Teleport next to base for the last step home.
    const nearHome = { ...atPole, turn: 60, party: { ...atPole.party, at: at(4, 1) } };
    const won = apply(nearHome, { kind: 'move', to: s.base });
    expect(won.status).toBe('won');
    expect(won.log.at(-1)).toMatchObject({ kind: 'won', turn: 61 });
    // 10 points per crate (base stores 116 + 44, sledge 9 + 4) minus 61 turns
    expect(score(won)).toBe(10 * (116 + 44 + 9 + 4) - 61);
  });

  it('does not count coming home without having reached the pole', () => {
    const s = apply(game(4, 1, 10, 5), { kind: 'move', to: at(4, 0) });
    expect(s.status).toBe('playing');
  });

  it('ends the game: no more moves or transfers', () => {
    const s = { ...game(4, 1, 10, 5), party: { ...game(4, 1, 10, 5).party, reachedPole: true } };
    const won = apply(s, { kind: 'move', to: s.base });
    expect(won.status).toBe('won');
    expect(apply(won, { kind: 'move', to: at(4, 1) })).toBe(won);
    expect(apply(won, { kind: 'transfer', food: -1, fuel: 0 })).toBe(won);
  });
});

describe('losing', () => {
  it('happens when the last food runs out away from any cache', () => {
    const lost = apply(game(4, 4, 1, 0), { kind: 'move', to: at(4, 3) });
    expect(lost.status).toBe('lost');
    expect(lost.log.at(-1)?.kind).toBe('lost');
  });

  it('does not happen out of food on a cache that still has food', () => {
    const s = newGame(1);
    let g: GameState = { ...s, party: { ...s.party, at: at(4, 1), carried: { food: 1, fuel: 0 } } };
    g = apply(g, { kind: 'move', to: s.base });
    expect(g.party.carried.food).toBe(0);
    expect(g.status).toBe('playing');
  });

  it('counts fuel-only ground as a dead end when there is no fuel anywhere near', () => {
    // On the plateau with food but no fuel: every neighbour costs fuel.
    expect(isStranded(game(4, 23, 10, 0))).toBe(true);
    expect(isStranded(game(4, 23, 10, 1))).toBe(false);
  });
});

describe('journal', () => {
  it('merges button presses on one visit into a single entry', () => {
    let s = game(3, 5, 20, 4);
    for (let i = 0; i < 3; i++) s = apply(s, { kind: 'transfer', food: -5, fuel: 0 });
    s = apply(s, { kind: 'transfer', food: 0, fuel: -1 });
    expect(s.log).toHaveLength(1);
    expect(s.log[0].text).toBe('Left 15 food and 1 fuel at a cache.');
  });

  it('describes restocking at the base', () => {
    const s = apply(apply(newGame(1), { kind: 'transfer', food: -10, fuel: 0 }), { kind: 'transfer', food: 0, fuel: 10 });
    expect(s.log.at(-1)?.text).toBe('Loaded 10 fuel and left 10 food at the base.');
  });

  it('starts a new entry after a move', () => {
    let s = game(3, 5, 20, 4);
    s = apply(s, { kind: 'transfer', food: -5, fuel: 0 });
    s = apply(s, { kind: 'move', to: at(3, 4) });
    s = apply(s, { kind: 'move', to: at(3, 5) });
    s = apply(s, { kind: 'transfer', food: 5, fuel: 0 });
    expect(s.log.map(e => e.text)).toEqual(['Left 5 food at a cache.', 'Loaded 5 food at a cache.']);
  });
});
