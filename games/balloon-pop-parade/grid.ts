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
// of its colour is sent is one too many, and whatever is done to it is done to
// friends with a balloon in hand. Each row has a result of its own there, seen
// and heard, which every kind plays with its own lift-off, refusal or start.
const SERVED: Record<Row, Cell> = {
  // The nearest friend catches it in its other hand and is carried off alone, a balloon in each hand.
  ownColour: { motion: 'liftOffAloneTwoBalloons', voice: 'balloonsSqueal' },
  // Its refusal knocks the balloon it already holds, which swings round and bumps it on the head.
  otherColour: { motion: 'refusalKnocksHeld', voice: 'hollowBonk' },
  // Every friend grabs one more and the whole troop is carried off at the same moment.
  fittingBunch: { motion: 'liftOffWholeTroop', voice: 'squeaksClimbTogether' },
  // A bunch bigger than the whole troop: the spare balloons bump the cloud on their way out and it sheds its drops.
  tooMany: { motion: 'sparesBumpCloud', voice: 'cloudSqueakAndDrops' },
  // Its kind's own start, then the troop stops swaying and looks at the empty hand.
  popHeld: { motion: 'troopStopsAndLooks', voice: 'squeakOfHeels' },
  // Its kind's own squeak, and the balloon it holds bobs along on its string.
  poke: { motion: 'pokeWithBalloon', voice: 'stringHum' },
}

export const GRID: Record<Row, Record<Column, Cell>> = {
  ownColour: { ...kindCells('ownColour', (taste) => taste.catch), served: SERVED.ownColour },
  otherColour: { ...kindCells('otherColour', (taste) => taste.refuse), served: SERVED.otherColour },
  // A bunch with one for each friend is the catch, done by all of them together.
  fittingBunch: { ...kindCells('fittingBunch', (taste) => `${taste.catch}Together`), served: SERVED.fittingBunch },
  tooMany: { ...kindCells('tooMany', (taste) => taste.liftOff), served: SERVED.tooMany },
  popHeld: { ...kindCells('popHeld', (taste) => taste.popped), served: SERVED.popHeld },
  poke: { ...kindCells('poke', (taste) => taste.poke), served: SERVED.poke },
}
