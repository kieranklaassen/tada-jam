import type { Build, Kind } from './build'
import { saveWith } from './drive'
import { EDDY, LAID_OUT, LINE, SEAT, SUN } from './layout'
import { seatOf } from './pieces'
import { Session } from './session'
import { STEP, boatShown, type World } from './world'

// A child's hands on a whole visit, for the tests: the same calls the Mount
// makes, on a clock the test steps. Nothing here is part of the game.

export type Visit = { game: Session; now: number }

const BOAT: Partial<Build> = { masts: ['twig', null], sails: ['maple', null], deck: ['berry'] }
export const HEAVY: Partial<Build> = { masts: ['twig', null], sails: ['birch', null], deck: ['pebble'] }

export function visit(build: Partial<Build> = BOAT, more: Parameters<typeof saveWith>[1] = {}, childAge: number | null = null): Visit {
  return { game: new Session(saveWith(build, more), childAge, 1), now: 0 }
}

/** Plays `seconds` with the finger up, or down. */
export function play(v: Visit, seconds: number, down = false): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    v.now += STEP
    v.game.frame(STEP, v.now, down)
  }
}

export function tapAt(v: Visit, x: number, y: number): void {
  v.game.press(x, y, false)
  v.game.tap()
}

/** Picks up at `from` and carries to `to`, and holds it there: the finger is still down. */
export function pick(v: Visit, from: { x: number; y: number }, to: { x: number; y: number }): void {
  v.game.press(from.x, from.y, false)
  v.game.dragStart()
  for (let i = 1; i <= 8; i++) {
    v.game.dragMove(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
    play(v, STEP, true)
  }
}

export function carryTo(v: Visit, from: { x: number; y: number }, to: { x: number; y: number }): void {
  pick(v, from, to)
  v.game.dragEnd()
}

/** Where a part of the boat is drawn, which is where it is touched. */
export function partSpot(v: Visit, kind: Kind): { x: number; y: number } {
  const w = v.game.w
  const piece = w.pieces.find((each) => each.kind === kind)
  if (!piece) return { x: 0, y: 0 }
  const seat = seatOf(piece, w.pieces)
  return { x: w.boat.x + seat.x, y: w.boat.y + seat.y }
}

/** By the hull, at its stern end, clear of everything that stands on it. */
export const HULL = { x: SEAT.x + 84, y: SEAT.y - 12 } as const
export const OVER_EDDY = { x: (EDDY.left + EDDY.right) / 2 + 84, y: LINE - 60 } as const

export function launchBoat(v: Visit): void {
  carryTo(v, HULL, OVER_EDDY)
  play(v, 1)
}

/** Plays on, with a ring behind the boat whenever it is still, until `met` or `limit` seconds. */
export function playUntil(v: Visit, met: (w: World) => boolean, limit = 240): boolean {
  let since = 0
  for (let t = 0; t < limit; t += STEP) {
    const w = v.game.w
    if (met(w)) return true
    since += STEP
    const still = w.boat.mode === 'afloat' || (w.boat.mode === 'brook' && (w.journey.phase === 'held' || w.journey.phase === 'wait'))
    if (still && since > 1.2) { tapAt(v, Math.min(1120, boatShown(w).x + 215), LINE + 42 + (w.journey.low ? 46 : 0)); since = 0 }
    play(v, STEP)
  }
  return met(v.game.w)
}

/**
 * Every state a put-away can find the game in, each reached the way a child reaches it. `leave` is called
 * with the finger where the state has it, so some of these end with the finger still down.
 */
export const STATES: Record<string, (v: Visit) => void> = {
  'at rest on the bank': (v) => play(v, 0.5),
  'a making in the hand': (v) => pick(v, LAID_OUT.cap, { x: 560, y: 420 }),
  'a part of the boat in the hand': (v) => pick(v, partSpot(v, 'maple'), { x: 700, y: 400 }),
  'the boat in the hand, the gnome climbing aboard': (v) => pick(v, HULL, { x: 600, y: 420 }),
  'a making on its way to the boat': (v) => { carryTo(v, LAID_OUT.cap, { x: SEAT.x + 60, y: SEAT.y - 60 }); play(v, STEP * 3) },
  'the frog with the cap': (v) => { carryTo(v, LAID_OUT.cap, { x: 150, y: 420 }); play(v, 0.6) },
  'a leaf afloat with the dragonfly on it': (v) => { carryTo(v, LAID_OUT.birch, { x: 900, y: 470 }); play(v, 1.6) },
  'a hull in the hand over the stone': (v) => pick(v, LAID_OUT.walnut, { x: SEAT.x, y: SEAT.y - 30 }),
  'the boat dropping into the eddy': (v) => { carryTo(v, HULL, OVER_EDDY); play(v, STEP * 2) },
  'afloat, a ring spreading': (v) => { launchBoat(v); tapAt(v, 780, 545); play(v, 0.3) },
  'the sprite blowing': (v) => { launchBoat(v); tapAt(v, 1054, 384); play(v, 0.7) },
  'leaving the bank': (v) => { launchBoat(v); playUntil(v, (w) => w.journey.phase === 'out'); play(v, 0.2) },
  'the view moving on': (v) => { launchBoat(v); playUntil(v, (w) => w.journey.phase === 'pan'); play(v, 0.2) },
  'coming into a place': (v) => { launchBoat(v); playUntil(v, (w) => w.journey.phase === 'enter'); play(v, 0.2) },
  'a place answering': (v) => { launchBoat(v); playUntil(v, (w) => w.journey.phase === 'answer'); play(v, 0.4) },
  'drifting on': (v) => { launchBoat(v); playUntil(v, (w) => w.journey.phase === 'leave'); play(v, 0.2) },
  'the boat lifted out of the brook': (v) => { launchBoat(v); playUntil(v, (w) => w.frame === 1 && w.journey.phase === 'enter'); pick(v, { x: v.game.w.boat.x + 84, y: v.game.w.boat.y - 12 }, { x: 500, y: 300 }) },
  'coming in to moor, the lamp scene': (v) => { launchBoat(v); playUntil(v, (w) => w.scene?.name === 'lamp'); play(v, 1) },
  'the lamps answering': (v) => { launchBoat(v); playUntil(v, (w) => w.scene?.name === 'lamp'); play(v, 5.5) },
  'the finished pond': (v) => { launchBoat(v); playUntil(v, (w) => w.finished && !w.scene); play(v, 1) },
  'the sun under the finger': (v) => {
    launchBoat(v); playUntil(v, (w) => w.finished && !w.scene)
    v.game.press(SUN.x, SUN.pond, false); v.game.dragStart(); v.game.dragMove(SUN.x, SUN.pond - 30); play(v, 0.2, true)
  },
  'the morning scene': (v) => {
    launchBoat(v); playUntil(v, (w) => w.finished && !w.scene)
    v.game.press(SUN.x, SUN.pond, false); v.game.dragStart()
    for (let i = 1; i <= 10; i++) { v.game.dragMove(SUN.x, SUN.pond - i * 9); play(v, STEP, true) }
    v.game.dragEnd(); play(v, 1.5)
  },
}

/** The same, for a heavy boat that a place holds. */
export const HELD: Record<string, (v: Visit) => void> = {
  'held on the sill of the stepping stones': (v) => { launchBoat(v); playUntil(v, (w) => w.frame === 2 && w.journey.phase === 'held', 120); play(v, 0.5) },
}

/** Where each making lies on a fresh bank. */
export const LAID = LAID_OUT
