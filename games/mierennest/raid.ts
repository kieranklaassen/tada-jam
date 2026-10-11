import { chambers } from './chambers'
import { MOUTH, OPEN, at, clone, put, settle, type Ground, type Lump } from './ground'
import { HABITS, PUSHERS_IN_A_LINE, type Shot } from './habits'
import type { Party } from './order'
import { chamberCells, entry, farFromChambers, isInside, nearestTo, reach, sticks, wallToLeanOn, wayIn, wayTo, type Lean, type Walker } from './routes'
import { lean } from './walls'

// A raid: the party at the log comes into a copy of the nest and each invader goes by its habits. Pure and on
// game time alone, a fixed step at a time, with no chance in it: the same party against the same nest plays the
// same way every time, so that changing one thing and calling it again shows what that one thing did. The nest
// as built is never touched: what a raid knocks down is knocked down in the copy.
//
// This file plays the three kinds a raid has before the great one: raider ants, beetles and flies.

/** Seconds of game time in one step of a raid. */
export const TICK = 1 / 20
/** How fast each kind goes, in cells a second, and how much faster it goes home. */
export const SPEED: Record<Walker, number> = { ant: 6, beetle: 3, fly: 5 }
export const HOME_FASTER = 1.6
/** Seconds between two invaders of a party leaving the log, and before the first. */
export const APART = 1.1
/** A raid that has not ended by itself by now is ended: everyone still inside sits down where they are. */
export const LONGEST = 150

export type InvaderState =
  /** Walking from the log to the mouth. */
  | 'coming'
  /** On its way, or looking for one. */
  | 'going'
  /** Leaning on a wall that holds. */
  | 'straining'
  /** Stuck in mud, for good. */
  | 'stuck'
  /** Doing its own act in a chamber. */
  | 'acting'
  /** Bewildered by a shot, for a moment. */
  | 'dazed'
  /** At something it cannot pass, making up its mind to go. */
  | 'givingUp'
  /** Trudging home. */
  | 'leaving'
  /** Held where it is until the workers free it when the raid is over: balled in mud, or at the foot of a drop it cannot climb. */
  | 'held'
  /** Back at the camp. */
  | 'home'

export type Invader = {
  id: number
  kind: Walker
  state: InvaderState
  /** The place it is in, and the one it came from, with how far it is between them, from 0 to 1. Both -1 before it has come in. */
  cell: number
  from: number
  along: number
  /** Which way it faces along the row. */
  facing: -1 | 1
  /** Seconds left in a state that waits. */
  wait: number
  /** The way it is on, and where it is on it. */
  way: number[]
  step: number
  /** Every place it has been, for the way home. */
  trail: number[]
  /** The wall it leans on. */
  leaning: Lean | null
  /** It finished its own act in a chamber. */
  acted: boolean
  /** It has touched a chamber and is on its way to where it does its act. */
  insideSince: boolean
  /** What it does when it stops being dazed, and the last shot that hit it. */
  after: 'going' | 'leaving'
  lastShot: Shot | null
  /** The name of the answer to the last shot, for the view. */
  answer: string | null
}

export type RaidEvent =
  | { type: 'in'; id: number; kind: Walker }
  | { type: 'inside'; id: number; kind: Walker; cell: number }
  | { type: 'stuck'; id: number; cell: number }
  | { type: 'strain'; id: number; cell: number }
  /** A wall gave: these cells of the copy changed. */
  | { type: 'gave'; id: number; cells: number[] }
  | { type: 'acted'; id: number; kind: Walker }
  | { type: 'givesUp'; id: number; kind: Walker }
  | { type: 'held'; id: number; kind: Walker }
  | { type: 'hit'; id: number; kind: Walker; shot: Shot; answer: string }
  | { type: 'home'; id: number; kind: Walker }
  | { type: 'over' }

export type Raid = {
  /** The copy of the nest the raid runs on. */
  ground: Ground
  invaders: Invader[]
  /** Seconds of game time played. */
  time: number
  /** The chambers of the kingdom as the raid was called. */
  chambersWhenCalled: number
  /** The invaders that finished their own act in a chamber. */
  acts: number
  /** The cells where a wall gave or a lump fell: the places that stay readable until the next raid. */
  gave: Set<number>
  /** The places where an ant is stuck in mud: the next walks over its back. */
  covered: Set<number>
  over: boolean
  events: RaidEvent[]
  /** Raised whenever the copy changes, so every way is looked for again. */
  changes: number
  inside: Uint8Array
  far: Int32Array
  /** The columns of the mouth. */
  mouth: readonly number[]
}

/** The creature that plays each invader of a party in this file. The dung beetle and the dung fly come with the great raid. */
const walkerOf = (kind: Party[number]): Walker | null => (kind === 'ant' || kind === 'beetle' || kind === 'fly' ? kind : null)

/** Calls the party in. The raid runs on a copy of `built`, which is not changed. */
export function callRaid(built: Ground, party: Party, mouth: readonly number[] = MOUTH): Raid {
  const ground = clone(built)
  const inside = chamberCells(ground, mouth)
  const invaders: Invader[] = []
  for (const member of party) {
    const kind = walkerOf(member)
    if (!kind) continue
    invaders.push({
      id: invaders.length, kind, state: 'coming', cell: -1, from: -1, along: 0, facing: 1, wait: APART * (invaders.length + 1),
      way: [], step: 0, trail: [], leaning: null, acted: false, insideSince: false, after: 'going', lastShot: null, answer: null,
    })
  }
  return {
    ground, invaders, time: 0, chambersWhenCalled: chambers(ground, mouth).length, acts: 0, gave: new Set(), covered: new Set(),
    over: false, events: [], changes: 0, inside, far: farFromChambers(ground, inside), mouth,
  }
}

/** The copy changed: the chambers and every way are worked out again. `gave` says a wall gave there, which stays readable. */
function changed(raid: Raid, cells: readonly number[], gave = true): void {
  if (gave) for (const cell of cells) raid.gave.add(cell)
  raid.changes++
  raid.inside = chamberCells(raid.ground, raid.mouth)
  raid.far = farFromChambers(raid.ground, raid.inside)
  for (const invader of raid.invaders) if (invader.state === 'going' || invader.state === 'straining') invader.way = []
}

function setOff(invader: Invader, way: number[]): void {
  invader.way = way
  invader.step = 0
}

/** Sends an invader home by the places it came through, last first. Where it once dropped further than it can climb, it stops and is held. */
function sendHome(invader: Invader): void {
  invader.state = 'leaving'
  invader.leaning = null
  const back = invader.trail.slice().reverse()
  if (back[0] !== invader.cell) back.unshift(invader.cell)
  setOff(invader, back)
}

/** How many beetles lean on the same wall as this one, itself included. */
function leaningWith(raid: Raid, invader: Invader): number {
  const wall = invader.leaning
  if (!wall) return 1
  let n = 0
  for (const other of raid.invaders) {
    if (other.kind === 'beetle' && other.state === 'straining' && other.leaning && other.leaning.x === wall.x && other.leaning.y === wall.y && other.leaning.dx === wall.dx) n++
  }
  return Math.max(1, Math.min(PUSHERS_IN_A_LINE, n))
}

/** How far into a chamber a walker goes before it does its act, in steps of its own, at most. */
export const INTO_THE_ROOM = 5

/** Where a walker that has just come inside does its act: the place on a floor inside a chamber that is furthest in, up to a few steps, and reached first among those. */
function actSpot(raid: Raid, invader: Invader): number {
  const { ground } = raid, cols = ground.cols
  const found = reach(ground, invader.kind, invader.cell)
  const steps = new Int32Array(ground.cells.length)
  let best = invader.cell, bestSteps = 0
  for (const cell of found.order) {
    if (cell !== invader.cell) steps[cell] = steps[found.from[cell]] + 1
    if (steps[cell] > INTO_THE_ROOM) break
    if (steps[cell] <= bestSteps || !isInside(ground, invader.kind, cell, raid.inside)) continue
    if (at(ground, cell % cols, Math.floor(cell / cols) + 1) === OPEN) continue
    if (invader.kind === 'ant' && sticks(ground, cell % cols, Math.floor(cell / cols), raid.covered)) continue
    best = cell
    bestSteps = steps[cell]
  }
  return best
}

/** An invader that stands still and is free to choose looks for what to do next. */
function decide(raid: Raid, invader: Invader): void {
  const { ground } = raid
  if (isInside(ground, invader.kind, invader.cell, raid.inside)) {
    // It is inside from the first cell of a chamber it touches. A walker then goes on to a place on the chamber's
    // floor, well into the room, and does its act there; a flier does it where it hangs.
    if (!invader.insideSince) {
      invader.insideSince = true
      raid.events.push({ type: 'inside', id: invader.id, kind: invader.kind, cell: invader.cell })
      const spot = invader.kind === 'fly' ? invader.cell : actSpot(raid, invader)
      if (spot !== invader.cell) {
        setOff(invader, wayTo(reach(ground, invader.kind, invader.cell), spot))
        return
      }
    }
    invader.state = 'acting'
    invader.wait = HABITS[invader.kind].act.seconds
    return
  }
  invader.insideSince = false
  const way = wayIn(ground, invader.kind, invader.cell, raid.inside)
  if (way && way.length > 1) {
    setOff(invader, way)
    return
  }
  const found = reach(ground, invader.kind, invader.cell)
  if (invader.kind === 'beetle') {
    const wall = wallToLeanOn(ground, found, raid.far)
    if (wall) {
      if (wall.stand !== invader.cell) {
        setOff(invader, wayTo(found, wall.stand))
        return
      }
      invader.leaning = wall
      invader.facing = wall.dx as -1 | 1
      invader.state = 'straining'
      invader.wait = HABITS.beetle.patience
      raid.events.push({ type: 'strain', id: invader.id, cell: invader.cell })
      return
    }
  }
  const near = nearestTo(found, raid.far)
  if (near !== invader.cell) {
    setOff(invader, wayTo(found, near))
    return
  }
  invader.state = 'givingUp'
  invader.wait = HABITS[invader.kind].patience
  raid.events.push({ type: 'givesUp', id: invader.id, kind: invader.kind })
}

/** A beetle that leans pushes with everyone who leans with it. The wall gives, or it holds until their patience is gone. */
function strain(raid: Raid, invader: Invader): void {
  const wall = invader.leaning!
  const did = lean(raid.ground, wall.x, wall.y, wall.dx, HABITS.beetle.push * leaningWith(raid, invader))
  if (did.did === 'shoved' || did.did === 'ploughed') {
    const before = raid.ground.cells.slice()
    settle(raid.ground)
    const moved = new Set(did.cells)
    for (let i = 0; i < before.length; i++) if (before[i] !== raid.ground.cells[i]) moved.add(i)
    for (const other of raid.invaders) {
      if (other.state === 'straining' && other.leaning && other.leaning.x === wall.x && other.leaning.y === wall.y) {
        other.state = 'going'
        other.leaning = null
      }
    }
    raid.events.push({ type: 'gave', id: invader.id, cells: [...moved] })
    changed(raid, [...moved])
    return
  }
  if (did.did === 'nothing') {
    invader.state = 'going'
    invader.leaning = null
    return
  }
  invader.wait -= TICK
  if (invader.wait <= 0) {
    invader.state = 'givingUp'
    invader.wait = 1
    invader.leaning = null
    raid.events.push({ type: 'givesUp', id: invader.id, kind: invader.kind })
  }
}

/** Moves an invader along its way by one step of time. Gives true when it has just arrived in a new place. */
function move(raid: Raid, invader: Invader, speed: number): boolean {
  const next = invader.way[invader.step + 1]
  if (next === undefined) return false
  if (invader.from !== invader.cell || invader.along === 0) {
    invader.from = invader.cell
    const dx = (next % raid.ground.cols) - (invader.cell % raid.ground.cols)
    if (dx !== 0) invader.facing = dx > 0 ? 1 : -1
  }
  // A drop of several cells takes as long as it is deep.
  const cols = raid.ground.cols
  const far = Math.max(1, Math.abs(Math.floor(next / cols) - Math.floor(invader.cell / cols)), Math.abs((next % cols) - (invader.cell % cols)))
  invader.along += (speed * TICK) / far
  if (invader.along < 1) return false
  invader.along = 0
  invader.from = invader.cell
  invader.cell = next
  invader.step++
  return true
}

/** One step of the raid. */
export function stepRaid(raid: Raid): void {
  if (raid.over) return
  raid.time += TICK
  const { ground } = raid
  const cols = ground.cols
  for (const invader of raid.invaders) {
    switch (invader.state) {
      case 'coming': {
        invader.wait -= TICK
        if (invader.wait > 0) break
        const start = entry(ground, invader.kind, raid.mouth)
        if (start === null) {
          // The mouth is shut to it: it never comes in, and goes back to the log.
          invader.state = 'home'
          raid.events.push({ type: 'home', id: invader.id, kind: invader.kind })
          break
        }
        // It comes in at the top of the mouth and goes from there to its first place: a beetle drops to it.
        const top = invader.kind === 'fly' ? start : raid.mouth[0]
        invader.cell = top
        invader.from = top
        invader.trail = [top]
        invader.state = 'going'
        if (start !== top) setOff(invader, [top, start])
        raid.events.push({ type: 'in', id: invader.id, kind: invader.kind })
        break
      }
      case 'going': {
        if (invader.step + 1 >= invader.way.length) {
          decide(raid, invader)
          break
        }
        if (!move(raid, invader, SPEED[invader.kind])) break
        invader.trail.push(invader.cell)
        const x = invader.cell % cols, y = Math.floor(invader.cell / cols)
        if (invader.kind === 'ant' && sticks(ground, x, y, raid.covered)) {
          invader.state = 'stuck'
          raid.covered.add(invader.cell)
          raid.events.push({ type: 'stuck', id: invader.id, cell: invader.cell })
        }
        break
      }
      case 'straining':
        strain(raid, invader)
        break
      case 'acting':
        invader.wait -= TICK
        if (invader.wait <= 0) {
          invader.acted = true
          raid.acts++
          raid.events.push({ type: 'acted', id: invader.id, kind: invader.kind })
          sendHome(invader)
        }
        break
      case 'dazed':
        invader.wait -= TICK
        if (invader.wait <= 0) {
          if (invader.after === 'leaving') sendHome(invader)
          else {
            invader.state = 'going'
            invader.way = []
          }
        }
        break
      case 'givingUp':
        invader.wait -= TICK
        if (invader.wait <= 0) sendHome(invader)
        break
      case 'leaving': {
        const next = invader.way[invader.step + 1]
        if (next === undefined) {
          invader.state = 'home'
          raid.events.push({ type: 'home', id: invader.id, kind: invader.kind })
          break
        }
        // A beetle cannot climb back up a drop of more than one cell: it sits down at its foot and waits for the workers.
        if (invader.kind === 'beetle' && Math.floor(invader.cell / cols) - Math.floor(next / cols) > 1) {
          invader.state = 'held'
          raid.events.push({ type: 'held', id: invader.id, kind: invader.kind })
          break
        }
        move(raid, invader, SPEED[invader.kind] * HOME_FASTER)
        break
      }
      case 'stuck':
      case 'held':
      case 'home':
        break
      default:
        invader.state satisfies never
    }
  }
  const done = raid.invaders.every((invader) => invader.state === 'home' || invader.state === 'held' || invader.state === 'stuck')
  if (done || raid.time >= LONGEST) {
    for (const invader of raid.invaders) if (invader.state !== 'home' && invader.state !== 'stuck') invader.state = 'held'
    raid.over = true
    raid.events.push({ type: 'over' })
  }
}

/**
 * A shot hits an invader. Nobody is hurt and nobody is removed: by its habits it goes home, is held where it is
 * until the raid is over, or carries on after a moment, thrown back along the way it came.
 */
export function hit(raid: Raid, id: number, shot: Shot): void {
  const invader = raid.invaders[id]
  if (!invader || invader.cell < 0 || invader.state === 'home' || invader.state === 'held' || invader.state === 'leaving') return
  const habit = HABITS[invader.kind].shots[shot]
  const again = invader.state === 'dazed' && invader.lastShot === shot && habit.twiceIsHome === true
  const wasStuck = invader.state === 'stuck'
  invader.lastShot = shot
  invader.answer = habit.id
  invader.leaning = null
  raid.events.push({ type: 'hit', id, kind: invader.kind, shot, answer: habit.id })
  if (habit.then === 'held') {
    invader.state = 'held'
    raid.events.push({ type: 'held', id, kind: invader.kind })
    return
  }
  // Thrown back along the way it came: a number of places, or to the end of the straight stretch behind it.
  const cols = raid.ground.cols
  let back = habit.back === 'hall' ? 0 : habit.back
  if (habit.back === 'hall') {
    const row = Math.floor(invader.cell / cols)
    while (back + 1 < invader.trail.length && Math.floor(invader.trail[invader.trail.length - 2 - back] / cols) === row) back++
  }
  if (!wasStuck) {
    for (let n = 0; n < back && invader.trail.length > 1; n++) invader.trail.pop()
    invader.from = invader.cell
    invader.cell = invader.trail[invader.trail.length - 1]
    invader.along = 0
  }
  invader.way = []
  invader.step = 0
  invader.state = 'dazed'
  invader.wait = Math.max(habit.pause, TICK)
  invader.after = habit.then === 'home' || again ? 'leaving' : 'going'
  if (wasStuck) raid.covered.delete(invader.cell)
}

/** A lump lands in the copy during a raid, from a machine: it lies where it lands and the ground comes to rest. */
export function landInRaid(raid: Raid, cell: number, lump: Lump): void {
  const cols = raid.ground.cols
  if (at(raid.ground, cell % cols, Math.floor(cell / cols)) !== OPEN) return
  const before = raid.ground.cells.slice()
  put(raid.ground, cell % cols, Math.floor(cell / cols), lump)
  settle(raid.ground)
  const moved: number[] = []
  for (let i = 0; i < before.length; i++) if (before[i] !== raid.ground.cells[i]) moved.push(i)
  changed(raid, moved, false)
}

/** How the raid ended, for the judging. */
export function endOf(raid: Raid, putAway = false): { chambersWhenCalled: number; actsFinished: number; putAway: boolean } {
  return { chambersWhenCalled: raid.chambersWhenCalled, actsFinished: raid.acts, putAway }
}

/** Plays a raid to its end. For tests and for a raid that must be over at once. */
export function playOut(raid: Raid): Raid {
  while (!raid.over) stepRaid(raid)
  return raid
}
