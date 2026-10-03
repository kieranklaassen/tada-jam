import { type Kind } from './voices'
import { type World, canTip, waitingOf } from './world'

// What the scene asks for and what the idle ladder shows, read from the
// world. The template's guidance.ts keeps the timing (a glow, then one move,
// backing off, on attended time); this module says where. The ghost hand
// shows how to hear, never which hide to open: while someone asks it only
// ever shows a first tap.

/** The one thing in the scene that visibly wants something. */
export type Want = { who: 'asker' | 'waiting' | 'row'; kind: Kind | null }

export function wantOf(world: World): Want {
  const cycle = world.cycle
  if (cycle && !world.finished && cycle.asker !== null) return { who: 'asker', kind: cycle.asker }
  const waiting = waitingOf(world)
  if (waiting) return { who: 'waiting', kind: waiting.kind }
  // Only in a row of pairs with nobody out yet: the eggs themselves, wobbling.
  return { who: 'row', kind: null }
}

/** Everything a tap would answer now: what the glow rests on. */
export type Touchable = { edge: boolean; slots: number[]; asker: boolean; basket: boolean; residents: number[] }

export function touchableOf(world: World): Touchable {
  const cycle = world.cycle
  const playing = cycle !== null && !world.finished
  return {
    edge: waitingOf(world) !== null,
    slots: playing ? cycle.slots.flatMap((slot, i) => (slot === 'done' ? [] : [i])) : [],
    asker: playing && cycle.asker !== null,
    basket: world.extra !== null,
    residents: world.hill.map((_, i) => i),
  }
}

/** The one move the ghost hand shows, as a single tap. */
export type Move = { on: 'edge' } | { on: 'slot'; slot: number } | { on: 'asker' }

export function moveToShow(world: World): Move | null {
  const cycle = world.cycle
  if (world.finished || !cycle) return waitingOf(world) ? { on: 'edge' } : null
  const fresh = cycle.slots.indexOf('fresh')
  if (cycle.asker !== null) {
    // A first tap on a hide not yet heard; and when all have been heard, a tap on the asker to hear them again.
    return fresh >= 0 ? { on: 'slot', slot: fresh } : { on: 'asker' }
  }
  if (cycle.form !== 'alike') return waitingOf(world) ? { on: 'edge' } : null
  // A row of pairs with nobody asking: any egg may be opened, so any tap is fair to show.
  const heard = cycle.slots.indexOf('heard')
  return fresh >= 0 ? { on: 'slot', slot: fresh } : heard >= 0 ? { on: 'slot', slot: heard } : null
}

/** Whether the move shown would be an attempt. It never is while someone asks. */
export function wouldAttempt(world: World, move: Move): boolean {
  return move.on === 'slot' && world.cycle !== null && world.cycle.slots[move.slot] === 'heard' && world.cycle.asker !== null
}

// --- The asker calls again ---------------------------------------------------

/**
 * Seconds of attended idleness at which the one at the stone calls again by itself and those still hidden
 * answer: soon, then at longer gaps, and three times at most. It calls for its own, never for the child, and
 * the one who waits at the edge never calls at all.
 */
export const CALLS_AGAIN_AT: readonly number[] = [2.5, 10.5, 18.5]

/** How many of those calls are due after this long idle. Any touch starts the count again. */
export function callsDue(idleSeconds: number): number {
  return CALLS_AGAIN_AT.filter((at) => idleSeconds >= at).length
}

/** The basket's egg is offered only while a tap would tip it in. */
export function offersBasket(world: World): boolean {
  return canTip(world)
}
