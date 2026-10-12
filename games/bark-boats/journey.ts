import type { BrookAct } from './brookActs'
import { AFTER_LIP, answersAt } from './brookActs3'
import { draftOf, weightOf } from './build'
import { EDDY, FALL_DROP, FRAME, LINE, MEET, PLACES, frameLeft, clamp, smooth, type PlaceName, type Spot } from './layout'
import { cutActs, pieceUsed, startAct } from './play'
import { endingCertain } from './scenes'
import { paceOf, traitsOf, twistsOf } from './traits'
import { EDDY_IN, buildNow, emit, mark, newJourney, type Running, type Lifted, type World } from './world'

// The brook: the boat goes where the water and the child's rings send it.
// Nothing hurries it. Each place answers the boat as built, a boat held at a
// place stays held until a ring frees it or the child lifts it, and no place
// is a failure. Found after a put-away, it waits where it had come to until
// the child touches something.

const PAN = 1.6
/**
 * Where the boat comes into a frame, the furthest upstream it can be in one, and how near the frame's left
 * edge it is when the view moves on. It comes in clear of whoever stands at the frame's upstream end.
 */
export const ENTRY = 760
const UPSTREAM = 800
const EXIT = 170
/** On the bank's frame the view moves on sooner, while the boat is still short of the frog's stone, and the boat swings out into the far channel to pass behind him. */
const BANK_EXIT = 330
const SWING = 44
/** Set down this far past where a place meets a boat, the boat has been carried past the place. */
const PAST = 200
const EVERYONE = ['boat', 'frog', 'bird', 'sprite', 'gnome', 'fly'] as const

export const placeOf = (frame: number): PlaceName => PLACES[clamp(frame, 0, PLACES.length - 1)]

/** The acts a place answers the boat with, and how much of their travel fits between where it meets them and the frame's edge. */
export function answersFor(w: World, frame: number): { acts: BrookAct[]; gain: number } {
  const build = buildNow(w), place = placeOf(frame)
  // Two bare masts are not two sails: where the answer is the sails' (the sprite's breath, the stones), the bare
  // mast gets an answer of its own. And the branch holds a boat by its broad leaf only when the leaf is on the tall mast.
  const bareMast = build.masts[0] !== null && build.masts[1] !== null && (build.sails[0] === null || build.sails[1] === null)
  const broadOnTall = ([0, 1] as const).some((index) => build.masts[index] === 'stalk' && build.sails[index] === 'maple')
  const acts = answersAt(place, traitsOf(build), twistsOf(build), { bareMast, broadOnTall })
  return { acts, gain: gainFor(acts, MEET[place].x) }
}

/** How much of the travel of `acts` fits between `x` and the frame's edge. */
function gainFor(acts: readonly BrookAct[], x: number): number {
  const total = acts.reduce((sum, act) => sum + Math.abs((act.holds && act.frees ? act.frees : act).moves), 0)
  return Math.min(1, Math.max(0, x - EXIT - 60) / Math.max(1, total))
}

/** Where a boat held by `holder` has its keel: every act before the holder has moved it. */
function heldX(frame: number, acts: readonly BrookAct[], holder: BrookAct, gain: number): number {
  let x = MEET[placeOf(frame)].x
  for (const act of acts) {
    if (act === holder) break
    x += act.moves * gain
  }
  return x
}

/** Where the water line is for the boat now: lower below the fall. */
export function lineOf(w: World): number {
  return LINE + draftOf(buildNow(w), true) + (w.journey.low ? FALL_DROP : 0)
}

/** The brook takes the boat from the eddy. Saved at once: found again, it is at the first place. */
export function leaveBank(w: World): void {
  w.where = 'brook'
  w.journey = { ...newJourney(), reach: 0, phase: 'out' }
  w.boat.mode = 'brook'
  w.boat.at = 'eddy'
  w.boat.restX = EDDY_IN
  mark(w, true)
}

/** Where the place leaves a boat it has answered: every act has moved it, and the fall has carried it below its lip. */
function answeredX(frame: number, acts: readonly BrookAct[], gain: number): { x: number; low: boolean } {
  let x = MEET[placeOf(frame)].x, low = false
  for (const act of acts) {
    if (act.id.startsWith('fall:')) { x = MEET.fall.at + AFTER_LIP; low = true } else x += (act.holds && act.frees ? act.frees : act).moves * gain
  }
  return { x: clamp(x, EXIT + 40, UPSTREAM), low }
}

/**
 * A boat found on the brook after a put-away: at the place it had come to, still, with nothing playing. With
 * `done` the place had begun to answer it: that answer is over, as if it had played out, and is not given twice.
 */
export function placeOnBrook(w: World, reach: number, stuck: boolean, done = false): void {
  const frame = clamp(reach, 0, PLACES.length - 1)
  w.frame = frame
  w.cam = frameLeft(frame)
  w.gnomeAt = 'aboard'
  w.show.aboard = 1
  w.boat.mode = 'brook'
  const { acts, gain } = answersFor(w, frame)
  const holder = stuck ? acts.find((act) => act.holds) ?? null : null
  w.journey = { ...newJourney(), reach: frame, stuck: holder !== null, done: done || holder !== null, phase: holder ? 'held' : 'wait', gain, holder }
  if (!holder && done) {
    const left = answeredX(frame, acts, gain)
    w.boat.x = left.x
    w.journey.low = left.low
  } else if (holder) {
    w.boat.x = heldX(frame, acts, holder, gain)
    w.journey.queue = acts.slice(acts.indexOf(holder) + 1)
  } else w.boat.x = ENTRY
  w.boat.y = lineOf(w)
}

/** The first touch after a load sets the water going again. */
export function wake(w: World): void {
  if (w.journey.phase !== 'wait') return
  // A place that had answered has nothing more to say: the boat drifts on, or at the pond comes in to moor.
  if (w.journey.done) next(w)
  else w.journey.phase = 'enter'
}

function startPan(w: World, to: number): void {
  const j = w.journey
  j.phase = 'pan'
  j.pan = 0
  w.frame = to
  w.boat.x += FRAME
  // The finger and what it holds are measured in the frame the boat is in: they stay where they are on the stage.
  w.finger.x += FRAME
  for (const piece of w.pieces) if (piece.mode === 'held') piece.x += FRAME
  j.panFrom = w.boat.x
  j.reach = to
  j.stuck = false
  j.done = false
  j.holder = null
  j.queue = []
  mark(w, true)
}

function next(w: World): void {
  const j = w.journey
  const act = j.queue.shift()
  if (!act) {
    if (placeOf(w.frame) === 'pond') return endingCertain(w)
    j.phase = 'leave'
    return
  }
  j.phase = 'answer'
  startAct(w, act, pieceUsed(w, act), { x: w.boat.x, y: w.boat.y }, true)
}

/** An act of the brook has ended: the boat is where the act left it, and the place holds it or answers on. */
export function actEnded(w: World, run: Running): void {
  if (!run.brook) return
  const j = w.journey, act = run.act as BrookAct
  if (act.holds && act.frees && !j.stuck && j.holder !== act) {
    // Held: the boat stays where the act put it, as the act's own pose, until a ring from behind or a lift.
    j.phase = 'held'
    j.holder = act
    j.stuck = true
    return mark(w, true)
  }
  if (act.id.startsWith('fall:')) {
    // The fall carries it from wherever it was to the lip, and on to where it lands.
    w.boat.x = MEET.fall.at + AFTER_LIP
    j.low = true
  } else w.boat.x += act.moves * j.gain
  if (j.holder && act === j.holder.frees) j.holder = null
  next(w)
}

/** A ring has reached the boat on the brook: from behind it frees a held boat, and it pushes a drifting one. */
export function ringOnBrook(w: World, way: number, strength: number): void {
  const j = w.journey, boat = w.boat
  boat.leanV += way * 1.2 * strength
  boat.dipV += 30 * strength
  if (j.phase === 'held') {
    if (way < 0 && j.holder?.frees) {
      j.stuck = false
      j.phase = 'answer'
      startAct(w, j.holder.frees, null, { x: boat.x, y: boat.y }, true)
      mark(w, true)
    }
    return
  }
  if (j.phase === 'enter' || j.phase === 'leave' || j.phase === 'out') boat.vx += (way * strength * 220) / (weightOf(buildNow(w), true) / 6)
}

/** The child lifts the boat off the brook: whatever was answering it stops, and a boat that was held is free. */
export function grabOnBrook(w: World, at: Spot = { x: w.boat.x, y: w.boat.y }): Lifted {
  const j = w.journey
  const from: Lifted = { x: w.boat.x, phase: j.phase, stuck: j.stuck, holder: j.holder, queue: [...j.queue], gain: j.gain, low: j.low, runs: w.acts.filter((run) => run.brook) }
  cutActs(w, EVERYONE)
  if (j.stuck) { j.stuck = false; j.holder = null; mark(w, true) }
  // It comes up from where it was drawn, which the answer had moved; the answer's pose ends with the answer.
  w.boat.x = at.x
  w.boat.y = at.y
  w.stage.boat.dx = w.stage.boat.dy = w.stage.boat.tilt = 0
  w.boat.y -= 12
  w.boat.vx = 0
  w.boat.squash = -0.5
  return from
}

/**
 * The lift was taken away, which is not the child's doing: the boat is back where it was lifted from, and a
 * boat that was held there is held again. Only an answer the lift cut short is not played again.
 */
function putBack(w: World, from: Lifted): void {
  const j = w.journey, boat = w.boat
  boat.x = from.x
  j.low = from.low
  j.gain = from.gain
  j.queue = from.queue
  boat.dip = 0
  boat.dipV = 60
  boat.y = lineOf(w)
  if (from.stuck && from.holder) {
    j.stuck = true
    j.holder = from.holder
    j.phase = 'held'
    return mark(w, true)
  }
  if (from.phase === 'answer' && from.runs.length > 0) {
    // It was lifted out of the middle of an answer: the answer goes on from where it was, and is given.
    for (const run of from.runs) {
      w.acts.push(run)
      if (run.piece) run.piece.mode = 'act'
    }
    j.phase = 'answer'
    return
  }
  if (from.phase === 'answer') return next(w)
  j.phase = from.phase
}

/** The boat let go on the brook: it goes back in the water where it is. With `from`, the lift was taken away and it goes back where it was. */
export function dropOnBrook(w: World, dropped: boolean, from?: Lifted): void {
  const j = w.journey, boat = w.boat
  if (!dropped && from) boat.x = from.x
  if (w.frame < 0) {
    // A tap, or a lift that was taken away, as the brook takes the boat: the brook goes on taking it, and nothing is changed or saved.
    if (!dropped && from) return
    // Caught before it left the bank's frame: it is back in the eddy.
    w.where = 'bank'
    w.journey = newJourney()
    boat.at = 'eddy'
    boat.restX = boat.x = clamp(boat.x, EDDY_IN, EDDY.right)
    boat.vy = 0
    boat.mode = 'fall'
    return mark(w, true)
  }
  if (!dropped && from) return putBack(w, from)
  boat.x = clamp(boat.x, EXIT + 40, UPSTREAM)
  const place = placeOf(w.frame), meet = MEET[place].x
  // Carried over the lip of the fall, it is below it.
  if (place === 'fall') j.low = boat.x < MEET.fall.at
  boat.dip = clamp(boat.y - lineOf(w), -40, 0)
  boat.dipV = 120
  boat.y = lineOf(w) + boat.dip
  if (dropped) {
    emit(w, 'splash', 1.3 - weightOf(buildNow(w), true) / 28)
    w.rings.push({ x: boat.x, y: LINE + 14 + (j.low ? FALL_DROP : 0), age: 0, strength: 1.4, hitBoat: true, hitFrog: true })
  }
  if (boat.x > meet || (place === 'fall' && !j.low)) {
    // Set down upstream of the place: it drifts down to it and is answered there. That is the child's doing.
    // Above the lip of the fall it is always upstream of the place: only the fall's own answer takes a boat down.
    j.queue = []
    j.done = false
    j.phase = 'enter'
    mark(w, true)
  } else if (boat.x < meet - PAST || (place === 'fall' && j.low)) {
    // Carried past the place: the place has nothing left to answer.
    j.queue = []
    j.done = true
    mark(w, true)
    next(w)
  } else if (!j.done && (j.phase === 'enter' || j.phase === 'wait')) arrive(w)
  else {
    j.gain = gainFor(j.queue, boat.x)
    next(w)
  }
}

/** The boat has drifted to where the place meets it. */
function arrive(w: World): void {
  const { acts } = answersFor(w, w.frame)
  w.journey.queue = acts
  w.journey.gain = gainFor(acts, w.boat.x)
  // Saved as answered from the first beat of the answer: put away now, the place does not answer again.
  w.journey.done = true
  mark(w, true)
  next(w)
}

/** Steps the boat on the brook. A boat in the child's hand follows the finger and is left alone here. */
export function stepJourney(w: World, dt: number): void {
  const j = w.journey, boat = w.boat
  if (boat.mode !== 'brook' || w.hand?.on === 'boat') return
  const pace = paceOf(buildNow(w))
  boat.vx *= Math.exp(-1.4 * dt)
  if (j.phase === 'out') {
    boat.x = Math.min(EDDY_IN, boat.x + (Math.min(0, boat.vx) - pace) * dt)
    j.swing = Math.min(1, j.swing + dt / 0.6)
    boat.y = lineOf(w) - SWING * smooth(j.swing) + boat.dip + Math.sin(w.time * 1.9) * 2.4
    if (boat.x <= BANK_EXIT) startPan(w, 0)
    return
  }
  if (j.phase === 'pan') {
    j.pan = Math.min(1, j.pan + dt / PAN)
    const k = smooth(j.pan)
    w.cam = frameLeft(w.frame - 1) + (frameLeft(w.frame) - frameLeft(w.frame - 1)) * k
    boat.x = j.panFrom + (ENTRY - j.panFrom) * k
    // Past the fall the brook runs level again on the way to the pond.
    j.swing = 1 - smooth(clamp((j.pan - 0.55) / 0.45, 0, 1))
    boat.y = LINE + draftOf(buildNow(w), true) + (j.low ? FALL_DROP * (1 - k) : 0) - (w.frame === 0 ? SWING * j.swing : 0) + boat.dip + Math.sin(w.time * 1.9) * 2.4
    if (j.pan >= 1) {
      w.cam = frameLeft(w.frame)
      j.low = false
      j.swing = 0
      j.phase = 'enter'
    }
    return
  }
  const place = placeOf(w.frame)
  if (j.phase === 'enter') {
    boat.x = clamp(boat.x + (boat.vx - pace) * dt, EXIT + 40, UPSTREAM)
    if (boat.x <= MEET[place].x) arrive(w)
  } else if (j.phase === 'leave') {
    boat.x = Math.min(UPSTREAM, boat.x + (boat.vx - pace) * dt)
    if (boat.x <= EXIT) startPan(w, w.frame + 1)
  }
  if (j.phase !== 'moor') boat.y = lineOf(w) + boat.dip + Math.sin(w.time * 1.9) * 2.4
}
