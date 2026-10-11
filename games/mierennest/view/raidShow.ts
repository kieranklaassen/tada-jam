import { partyFile, type Camper } from '../camp'
import type { Room } from '../chambers'
import { CELL, OPEN, at, type Ground } from '../ground'
import type { Flying, Scene } from '../kingdom'
import { RELOAD } from '../machines'
import type { Mover } from '../motion'
import type { Party } from '../order'
import { APART, type Invader, type Raid } from '../raid'
import type { Walker } from '../routes'
import type { Machine } from '../save'
import { GRASS_Y, GROUND, MOUTH_X } from './layout'
import type { Effect, Thing } from './things'

// What a raid, the machines and the rooms show, as numbers and names with no canvas in sight: which creature in
// which pose stands where. The display list (display.ts) turns these into things to draw.

const toStage = (cx: number, cy: number) => ({ x: GROUND.x + cx * CELL, y: GROUND.y + cy * CELL })

/** The creature that plays each kind of invader. */
export const PLAYED_BY: Record<Walker, Mover> = { ant: 'raider', beetle: 'beetle', fly: 'fly' }

/** How long before the end of its own act an invader shows the end of it: the nap, the burp, the foot. */
export const ACT_END = 1.6

export type Shown = { who: Mover; pose: string; x: number; y: number; flip: boolean; turn: number }

const flick = (seconds: number, rate: number) => Math.floor(seconds * rate) % 2 === 0

/** The pose of an invader, from what it is doing. Every state of every kind has a pose of its own. */
export function invaderPose(invader: Invader, seconds: number, cols: number): string {
  const { kind, state } = invader
  const rows = Math.floor(invader.cell / cols) - Math.floor(invader.from / cols)
  const upright = invader.cell !== invader.from && invader.cell % cols === invader.from % cols
  if (kind === 'ant') {
    switch (state) {
      case 'coming': return flick(seconds, 9) ? 'walk' : 'walk2'
      case 'going': case 'leaving': return upright ? 'climb' : flick(seconds, 9) ? 'walk' : 'walk2'
      case 'stuck': return flick(seconds, 1.4) ? 'stuck' : 'stuck2'
      case 'acting': return invader.wait > ACT_END ? 'lie' : flick(seconds, 0.8) ? 'nap' : 'nap2'
      case 'dazed': return invader.lastShot === 'stone' ? 'flat' : 'buried'
      case 'held': return invader.lastShot === 'mud' ? 'balled' : 'shrug'
      case 'givingUp': return 'shrug'
      case 'straining': return 'walk'
      case 'home': return 'nap'
    }
  }
  if (kind === 'beetle') {
    switch (state) {
      case 'coming': return flick(seconds, 5) ? 'walk' : 'walk2'
      case 'going': return rows > 1 ? 'fall' : flick(seconds, 5) ? 'walk' : 'walk2'
      case 'leaving': return invader.lastShot === 'mud' ? 'blind' : flick(seconds, 5) ? 'walk' : 'walk2'
      case 'straining': return flick(seconds, 2) ? 'lean' : 'strain'
      case 'acting': return invader.wait > ACT_END ? 'eat' : 'burp'
      case 'dazed': return invader.lastShot === 'stone' ? (flick(seconds, 3) ? 'onBack' : 'onBack2') : invader.lastShot === 'mud' ? 'blind' : 'walk'
      case 'givingUp': case 'held': case 'home': case 'stuck': return 'sit'
    }
  }
  switch (state) {
    case 'coming': case 'going': return flick(seconds, 14) ? 'fly' : 'fly2'
    case 'leaving': return invader.lastShot === 'mud' ? 'gummed' : flick(seconds, 14) ? 'fly' : 'fly2'
    case 'acting': return invader.wait > ACT_END ? 'taste' : 'tasteFoot'
    case 'dazed': return invader.lastShot === 'sand' ? 'tumble' : invader.lastShot === 'mud' ? 'gummed' : 'dodge'
    case 'givingUp': return 'peer'
    case 'straining': case 'stuck': case 'held': case 'home': return 'bump'
  }
  return 'walk'
}

/** Every pose `invaderPose` can name, by the creature that plays it: a test holds each of them to exist. */
export const RAID_POSES: Record<'raider' | 'beetle' | 'fly', readonly string[]> = {
  raider: ['walk', 'walk2', 'climb', 'stuck', 'stuck2', 'lie', 'nap', 'nap2', 'flat', 'buried', 'balled', 'shrug'],
  beetle: ['walk', 'walk2', 'fall', 'blind', 'lean', 'strain', 'eat', 'burp', 'onBack', 'onBack2', 'sit'],
  fly: ['fly', 'fly2', 'gummed', 'taste', 'tasteFoot', 'tumble', 'dodge', 'peer', 'bump'],
}

/** The middle of an invader's feet for a place, in stage units: a fly hangs in the middle of its block, a little off the floor. */
function feetAt(kind: Walker, cell: number, cols: number): { x: number; y: number } {
  const x = cell % cols, y = Math.floor(cell / cols)
  return kind === 'fly' ? toStage(x + 1, y + 1 - 0.3) : toStage(x + 0.5, y + 1)
}

/** Where an invader in the nest is, between the place it came from and the one it is in. */
export function invaderAt(invader: Invader, cols: number): { x: number; y: number } {
  const a = feetAt(invader.kind, invader.from, cols), b = feetAt(invader.kind, invader.cell, cols)
  return { x: a.x + (b.x - a.x) * invader.along, y: a.y + (b.y - a.y) * invader.along }
}

/** How far behind the one in front an invader stands when two stand still in one place, in stage units. */
export const QUEUE_STEP = 40

/** Where the party steps off the grass into the mouth. */
export const MOUTH_STEP = { x: MOUTH_X - 46, y: GRASS_Y }

/**
 * Everyone of a raid, as they are shown. One still on the grass walks from its place in the file to the mouth
 * over the time it waits; one in the nest is where the raid has it; one that is home sits in the file again.
 */
export function showRaid(raid: Raid, party: Party, seconds: number): Shown[] {
  const cols = raid.ground.cols, file = partyFile(party)
  return raid.invaders.map((invader, n) => {
    const who = PLAYED_BY[invader.kind], seat: Camper | undefined = file[n]
    const pose = invaderPose(invader, seconds, cols)
    if (invader.state === 'coming' && seat) {
      // The last stretch of its wait is its walk to the mouth.
      const walk = Math.min(1, Math.max(0, 1 - invader.wait / Math.min(APART * 1.5, APART * (n + 1))))
      return { who, pose: walk > 0 ? pose : seat.poses[0], x: seat.x + (MOUTH_STEP.x - seat.x) * walk, y: MOUTH_STEP.y, flip: false, turn: 0 }
    }
    if ((invader.state === 'home' || invader.cell < 0) && seat) return { who, pose, x: seat.x, y: seat.y, flip: false, turn: 0 }
    const at = invaderAt(invader, cols)
    // Those who stand still in the same place stand one behind the other, each a little further back, so each is seen.
    if (invader.along === 0 && invader.state !== 'going' && invader.state !== 'leaving') {
      let ahead = 0
      for (let m = 0; m < n; m++) if (raid.invaders[m].cell === invader.cell && raid.invaders[m].along === 0 && raid.invaders[m].state !== 'home') ahead++
      at.x -= ahead * QUEUE_STEP * invader.facing
    }
    const upright = pose === 'climb'
    const goingUp = Math.floor(invader.cell / cols) < Math.floor(invader.from / cols)
    return { who, pose, x: at.x, y: at.y, flip: invader.facing < 0, turn: upright ? (goingUp ? -1 : 1) * (invader.facing < 0 ? -1 : 1) * (Math.PI / 2) : 0 }
  })
}

/** Those the workers carry out when a raid is over: from where each sat to the mouth, then back to the file. */
export function showCarriedOut(scene: Extract<Scene, { is: 'putBack' }>, raid: Raid, party: Party): Shown[] {
  const cols = raid.ground.cols, file = partyFile(party), p = Math.min(1, scene.t / scene.length)
  const out: Shown[] = []
  for (const id of scene.held) {
    const invader = raid.invaders[id], seat = file[id]
    if (!invader || !seat || invader.cell < 0) continue
    const from = invaderAt(invader, cols), who = PLAYED_BY[invader.kind]
    const pose = invader.kind === 'ant' ? (invader.lastShot === 'mud' ? 'balled' : 'stuck') : invader.kind === 'beetle' ? 'sit' : 'bump'
    const a = Math.min(1, p / 0.6), b = Math.min(1, Math.max(0, (p - 0.6) / 0.4))
    const x = b > 0 ? MOUTH_STEP.x + (seat.x - MOUTH_STEP.x) * b : from.x + (MOUTH_STEP.x - from.x) * a
    const y = b > 0 ? GRASS_Y : from.y + (GRASS_Y - from.y) * a
    out.push({ who, pose, x, y, flip: false, turn: 0 })
  }
  return out
}

export type MachineShown = { kind: Machine['kind']; load: Machine['load']; pose: 'ready' | 'fired'; x: number; y: number; flip: boolean }

/** How long a machine stays flung after it fired, in seconds. */
export const FLUNG = 0.4

/** A machine as it is shown: in a raid its cup is empty until its own lump is back in it. */
export function showMachine(machine: Machine, reloading: number, sinceFired: number): MachineShown {
  const p = toStage(machine.x + 1, machine.y + 1)
  const flung = sinceFired < FLUNG || reloading > RELOAD - FLUNG
  return { kind: machine.kind, load: reloading > 0 ? null : machine.load, pose: flung ? 'fired' : 'ready', x: p.x, y: p.y, flip: machine.facing < 0 }
}

/** A shot in the air: which effect, where on its way, and which way it flies. */
export function showShot(flying: Flying, cols: number): { effect: Effect; x: number; y: number; progress: number; flip: boolean } {
  const p = Math.min(1, flying.t / flying.length), at = p * (flying.path.length - 1)
  const a = flying.path[Math.floor(at)], b = flying.path[Math.min(flying.path.length - 1, Math.floor(at) + 1)]
  const part = at - Math.floor(at)
  const ax = (a % cols) + 0.5, ay = Math.floor(a / cols) + 0.5, bx = (b % cols) + 0.5, by = Math.floor(b / cols) + 0.5
  const here = toStage(ax + (bx - ax) * part, ay + (by - ay) * part)
  const first = flying.path[0], last = flying.path[flying.path.length - 1]
  return { effect: flying.shot === 'sand' ? 'sandBlast' : flying.shot === 'mud' ? 'mudBall' : 'stoneShot', x: here.x, y: here.y, progress: p, flip: last % cols < first % cols }
}

/** The things on the back wall of the rooms: two to a chamber, in turn, so no two rooms next in the list look alike. */
export const FURNISHINGS: readonly (readonly [Thing, Thing])[] = [['seeds', 'shelf'], ['bed', 'lamp'], ['cup', 'washing']]
/** The most chambers that are furnished: past this a new room is bare until an older one is gone. */
export const FURNISHED = 6
/** Things that hang on the wall, and how high over the floor they hang. */
const HUNG: Partial<Record<Thing, number>> = { shelf: 34, lamp: 40, washing: 36 }

/** The floor of a room: its lowest row, and the first and last cell of the longest stretch of it with something firm under it. */
export function roomFloor(ground: Ground, room: Room): { y: number; from: number; to: number } {
  const cols = ground.cols
  const lowest = Math.floor(room.cells[room.cells.length - 1] / cols)
  const inRow = new Set(room.cells.filter((i) => Math.floor(i / cols) === lowest).map((i) => i % cols))
  let best = { y: lowest, from: 0, to: -1 }, from = -1
  for (let x = 0; x <= cols; x++) {
    const floor = inRow.has(x) && at(ground, x, lowest + 1) !== OPEN
    if (floor && from < 0) from = x
    if (!floor && from >= 0) {
      if (x - 1 - from > best.to - best.from) best = { y: lowest, from, to: x - 1 }
      from = -1
    }
  }
  return best
}

/**
 * What each chamber has on its back wall, and where: two things, a third and two thirds of the way along its
 * floor. In the queen's room they hang on the part of the wall she does not sit in front of: `queen` is the
 * room she is in and the span of the floor she takes, in cell units.
 */
export function showFurnishings(ground: Ground, chambers: readonly Room[], lit: boolean, queen: { room: number; from: number; to: number } | null = null): { thing: Thing; x: number; y: number; lit: boolean }[] {
  const out: { thing: Thing; x: number; y: number; lit: boolean }[] = []
  chambers.slice(0, FURNISHED).forEach((room, n) => {
    const floor = roomFloor(ground, room)
    let from = floor.from, to = floor.to + 1
    if (queen && queen.room === n) {
      // The longer stretch of floor beside her.
      if (queen.from - from >= to - queen.to) to = queen.from
      else from = queen.to
    }
    if (to - from < 3) return
    const pair = FURNISHINGS[n % FURNISHINGS.length]
    pair.forEach((thing, i) => {
      const p = toStage(from + (to - from) * (i === 0 ? 0.3 : 0.7), floor.y + 1)
      out.push({ thing, x: p.x, y: p.y - (HUNG[thing] ?? 0), lit: thing === 'lamp' && lit })
    })
  })
  return out
}

/** The most marks that are drawn where a wall gave. */
export const MARKS_SHOWN = 6

/** Where the marks lie: on the floor of each cell that gave, the first few of them, in stage units. */
export function showMarks(marks: readonly number[], cols: number): { x: number; y: number }[] {
  return marks.slice(0, MARKS_SHOWN).map((cell) => toStage((cell % cols) + 0.5, Math.floor(cell / cols) + 1))
}
