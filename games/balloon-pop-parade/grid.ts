import { KINDS, TASTES, type Kind, type Taste } from './kinds'

// The design sheet's object-by-action grid, as data. The rows are what the
// child sends or touches, the columns are who it meets. Every cell looks and
// sounds different from its neighbours, and the test beside this file holds
// that, so a kind never borrows another kind's answer.

export type Row = 'ownColour' | 'otherColour' | 'fittingBunch' | 'tooMany' | 'popHeld' | 'poke'

/** The four kinds, and a troop of any kind that already has its balloons. */
export type Column = Kind | 'served'

/** What plays in one cell: the id of a motion and the id of a sound. */
export type Cell = { motion: string; voice: string }

export const ROWS: readonly Row[] = ['ownColour', 'otherColour', 'fittingBunch', 'tooMany', 'popHeld', 'poke']

export const COLUMNS: readonly Column[] = [...KINDS, 'served']

// One family of sounds per kind (the duck boings, the frog twangs, the hippo
// honks, the crab clicks), and inside a family one sound per row.
const VOICES: Record<Kind, Record<Row, string>> = {
  duck: { ownColour: 'duckBoing', otherColour: 'duckBoingSwat', fittingBunch: 'duckBoingRun', tooMany: 'duckBoingPlop', popHeld: 'duckBoingYelp', poke: 'duckBoingSqueak' },
  frog: { ownColour: 'frogTwang', otherColour: 'frogTwangBounce', fittingBunch: 'frogTwangCross', tooMany: 'frogTwangStretch', popHeld: 'frogTwangCroak', poke: 'frogTwangDouble' },
  hippo: { ownColour: 'hippoHonk', otherColour: 'hippoHonkRaspberry', fittingBunch: 'hippoHonkRow', tooMany: 'hippoHonkThud', popHeld: 'hippoHonkLate', poke: 'hippoHonkLong' },
  crab: { ownColour: 'crabClick', otherColour: 'crabClickPinch', fittingBunch: 'crabClickScissors', tooMany: 'crabClickWhirr', popHeld: 'crabClickPeek', poke: 'crabClickTwice' },
}

/** One row for the four kinds: each kind's own motion from its fixed tastes, and its own sound for the row. */
function kindCells(row: Row, motion: (taste: Taste) => string): Record<Kind, Cell> {
  const cell = (kind: Kind): Cell => ({ motion: motion(TASTES[kind]), voice: VOICES[kind][row] })
  return { duck: cell('duck'), frog: cell('frog'), hippo: cell('hippo'), crab: cell('crab') }
}

// A troop that already has its balloons has no friend without one, so whatever
// of its colour is sent is one too many: the first and third rows are the
// fourth there, the same lift-off, for fun, as often as the child likes. The
// troop is of some kind, so a voice in this column names which of that kind's
// own sounds is heard.
const LIFT_OFF_FOR_FUN: Cell = { motion: 'liftOffForFun', voice: 'kindLiftOffVoice' }

export const GRID: Record<Row, Record<Column, Cell>> = {
  ownColour: { ...kindCells('ownColour', (taste) => taste.catch), served: LIFT_OFF_FOR_FUN },
  // Each kind still refuses in its own way when it already has its balloons.
  otherColour: { ...kindCells('otherColour', (taste) => taste.refuse), served: { motion: 'refusesStill', voice: 'kindRefusalVoice' } },
  // A bunch with one for each friend is the catch, done by all of them together.
  fittingBunch: { ...kindCells('fittingBunch', (taste) => `${taste.catch}Together`), served: LIFT_OFF_FOR_FUN },
  tooMany: { ...kindCells('tooMany', (taste) => taste.liftOff), served: LIFT_OFF_FOR_FUN },
  // After the pop the friend reaches up again and can be given another.
  popHeld: { ...kindCells('popHeld', (taste) => taste.popped), served: { motion: 'reachesAgain', voice: 'kindPopVoice' } },
  // The same poke, with its balloon bobbing along.
  poke: { ...kindCells('poke', (taste) => taste.poke), served: { motion: 'pokeWithBalloon', voice: 'kindPokeVoice' } },
}
