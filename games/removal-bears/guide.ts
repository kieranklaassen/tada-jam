import type { Game, Target } from './game'

// What the idle ladder shows: a glow on what a touch would move on now, then
// one move by the ghost hand. It shows a move and never the answer: the load
// is tapped whichever way it stands, an opening is the one the bears are
// under, and a bear only in a house where changing ends is ever needed.

export type Hint = { glow: Target[]; hand: Target | null }

export function hint(game: Game, demo: number): Hint {
  if (game.saved.finished || game.empty) return { glow: [{ type: 'cart' }], hand: { type: 'cart' } }
  const all: Target[] = [{ type: 'load' }, { type: 'opening', i: game.under }]
  // What is left to do after what was just done: after a turn, send it up; after a bump, turn it.
  if (game.last === 'turn') all.reverse()
  if (game.saved.position === 'other-side' || game.saved.position === 'full-house') all.push({ type: 'bear', who: game.bearOn(1) })
  const hand = all[Math.max(0, demo) % all.length]
  return { glow: demo < 0 ? [all[0]] : [hand], hand }
}
