import { held, place, swapped } from './cells'
import type { Game, Target } from './game'
import { CELLS } from './loads'

// What the idle ladder shows: a glow on what a touch would move on now, then
// one move by the ghost hand. A hand that can be followed is right: it taps the
// load until it stands as it would go in, then the opening it goes in at, which
// glows with the load from the start so that the two belong together. A change
// of ends is shown only when no number of turns would do.

export type Hint = { glow: Target[]; hand: Target | null }

export function hint(game: Game, demo: number): Hint {
  if (game.saved.finished || game.empty) return { glow: [{ type: 'cart' }], hand: { type: 'cart' } }
  const next = nextMove(game)
  if (!next) return { glow: [{ type: 'load' }], hand: { type: 'load' } }
  const into: Target = { type: 'opening', i: next.into }
  if (next.do === 'heave') return { glow: [into], hand: into }
  const hand: Target = next.do === 'turn' ? { type: 'load' } : { type: 'bear', who: game.bearOn(1) }
  return { glow: demo < 0 ? [hand] : [hand, into], hand }
}

/** The shortest way in for the load in hand, and of two as short the opening the bears are nearest to. */
export function nextMove(game: Game): { do: 'turn' | 'swap' | 'heave'; into: number } | null {
  const load = game.saved.loads[game.hands]
  if (!load) return null
  const openings = game.saved.openings
  for (const swap of [false, true]) for (let turns = 0; turns < 4; turns++) {
    const from = swap ? swapped(load.way) : load.way
    const cells = held(CELLS[load.kind], { ...from, turn: (from.turn + turns) % 4 })
    const fitting = openings.map((_, i) => i).filter((i) => place(cells, openings[i].cells).fits)
    if (fitting.length) return { do: swap ? 'swap' : turns > 0 ? 'turn' : 'heave', into: fitting.includes(game.under) ? game.under : fitting[0] }
  }
  return null
}
