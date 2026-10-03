// What each step of the designed order lays out (ART.md, "The designed order,
// and what is stored"). The ids live in config.ts as LADDER; this module says
// what a patient laid out at each of them is given. Pure: no renderer, no DOM.

import { LADDER } from './config'
import { CARES, NEEDS, PLAIN, QUIET, type Care, type Need, type Step } from './needs'

export type Rung = {
  id: string
  /** The needs a patient laid out here can have. */
  needs: readonly Need[]
  /** The care things its cart carries: the wrong options grow one at a time. */
  cart: readonly Care[]
  /** The step a sign starts at. */
  start: Step
  /** How many needs one patient has. */
  perPatient: 1 | 2
  /** The need that is new here, at the steps that add one. */
  newest: Need | null
}

const ALL = NEEDS.length

function build(id: string, inPlay: number, start: Step, perPatient: 1 | 2, addsNeed: boolean): Rung {
  return { id, needs: NEEDS.slice(0, inPlay), cart: CARES.slice(0, inPlay), start, perPatient, newest: addsNeed ? NEEDS[inPlay - 1] : null }
}

/** One new thing at a time, then combinations of what is known. Keyed by the ids in config.ts. */
const RUNGS: Readonly<Record<string, Rung>> = {
  bowl: build('bowl', 1, PLAIN, 1, true),
  blanket: build('blanket', 2, PLAIN, 1, true),
  plaster: build('plaster', 3, PLAIN, 1, true),
  brush: build('brush', 4, PLAIN, 1, true),
  basket: build('basket', ALL, PLAIN, 1, true),
  quiet: build('quiet', ALL, QUIET, 1, false),
  two: build('two', ALL, PLAIN, 2, false),
  'two-quiet': build('two-quiet', ALL, QUIET, 2, false),
}

/** The rung for a position id. An id the game does not know lays out as the first. */
export function rung(position: string): Rung {
  return RUNGS[position] ?? RUNGS[LADDER[0]]
}

/** Where a position stands in the order, or 0 for an id the game does not know. */
export function place(position: string, ladder: readonly string[] = LADDER): number {
  return Math.max(0, ladder.indexOf(position))
}

/** The position one step above, staying at the top. The carrier's patient is laid out there. */
export function above(position: string, ladder: readonly string[] = LADDER): string {
  return ladder[Math.min(ladder.length - 1, place(position, ladder) + 1)]
}

/** From this position on, and at every position but the last, a carrier stands beside the one who waits. */
export const CARRIER_FROM = 'basket'

/** Whether a carrier is laid out at this position. Its patient comes from the step above, so the last step has none. */
export function carrierCanStand(position: string, ladder: readonly string[] = LADDER): boolean {
  const at = place(position, ladder)
  return at >= place(CARRIER_FROM, ladder) && at < ladder.length - 1
}

/**
 * The care things that count as shown on a first visit that starts at this
 * position: the first, which lies alone on the cart and needs no showing, and
 * those of every position before the starting one.
 */
export function shownAtStart(position: string): Care[] {
  const before = rung(position).cart.slice(0, -1)
  return before.length > 0 ? [...before] : [CARES[0]]
}
