import { KIND, seatOf, type Kind } from './kinds'
import { STRIDE, airborne, strode } from './motion'
import { ENTRY, GATE, STREET, YARD } from './places'
import { HOVER, type Cue, type Play, type Thing } from './play'
import { along, routeIn, type Route } from './route'
import type { Beat } from './scene'
import { beginCycle, finishCycle, type GameState } from './state'
import { layStreet, stockOf } from './street'

// The two scenes: the float goes out, and the next street comes in. Each is a
// list of timed beats (scene.ts) filled in from the street as the child left
// it. What they save is saved by the Mount when they start; everything here is
// what is seen on the way there, kept in `Stage`, which the view draws and the
// save never holds.

/** One thing of the float: where it is, how it leans on the one in front, which way it faces and how much of it is left. */
export type FloatPart = { kind: Kind; x: number; y: number; z: number; lean: number; yaw: number; size: number }

/** `tower` is true while it still stands as the stack it was, before it tips over. */
export type Float = { parts: FloatPart[]; tower: boolean; bottom: Kind; load: number; gait: number; sway: number; squash: number; hat: number }

export class Stage {
  /** How far the gate stands open, 0..1, and a rattle of its bars when a finger lands on it. */
  gate = 0
  rattle = 0
  /** The float, while it is seen going out. */
  float: Float | null = null
  /** The things seen waiting behind the bars after a float, and 0..1 how far they have stepped up. */
  waiting: Kind[] = []
  stepped = 1

  step(dt: number): void {
    this.rattle = Math.max(0, this.rattle - dt * 2.2)
  }

  /** Something happened in the street: a finger on the gate rattles its bars as it sounds, on any street. */
  hear(cue: Cue): void {
    if (cue.type === 'bystander' && cue.who === 'gate') this.rattle = 1
  }
}

/** The number the street after this one is laid out from. */
export function nextSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0
}

/** The two things of a street that are seen waiting behind the bars: a pair that fits between the gate posts side by side. */
export function waitingOf(position: string, seed: number): Kind[] {
  const pairs: readonly (readonly [Kind, Kind])[] = [['balloon', 'pie'], ['dog', 'hat'], ['dog', 'pie']]
  const stock = stockOf(position), pair = pairs[(seed >>> 0) % pairs.length]
  return pair.every((kind) => stock.includes(kind)) ? [...pair] : ['pie']
}

/** A bare street after a float, as it is found: the gate shut and the next things behind it. */
export function showWaiting(stage: Stage, position: string, seed: number): void {
  stage.float = null
  stage.gate = 0
  stage.waiting = waitingOf(position, seed)
  stage.stepped = 1
}

/**
 * What the float's going out leaves in the record, from its first moment: the street finished, the set one step
 * fuller for the street that will wait, and the number that street is laid out from. `Play` has emptied the
 * street and the breath already.
 */
export function floatOutcome<S extends GameState & { seed: number }>(state: S): S {
  if (state.finished) return state
  return { ...finishCycle(state, 'well'), seed: nextSeed(state.seed) }
}

/**
 * What the next street's coming in leaves in the record, from its first moment: the street begun, the hole at
 * its place on a new street, and every thing on the spot where it will stand.
 */
export function enterOutcome<S extends GameState & { seed: number }>(state: S, play: Play): S {
  const hole = play.makeWay()
  play.comeIn(layStreet(state.position, state.seed, { ...hole, mouth: play.wants }))
  return beginCycle(state)
}

/**
 * The gate swings shut, `progress` of the way. In the frame its leaves meet, the clunk is heard, once. A touch that
 * ends the scene shuts it without a sound.
 */
function shutting(stage: Stage, play: Play, progress: number, finishing: boolean): void {
  const open = 1 - progress * progress * (3 - 2 * progress)
  if (progress < 1 && open > 0) {
    stage.gate = Math.min(stage.gate, open, 0.999)
    return
  }
  if (stage.gate > 0 && !finishing) play.cues.push({ type: 'clunk' })
  stage.gate = 0
}

/** The line the float lies along before it rolls out: along the far side of the street, its head in front of the gate. */
const LINE_Z = STREET.z0 + 1.45
/** How far behind the gate a thing is quite gone. */
const GONE = 1.5

const FLOAT_TIMES = { drop: [0, 0.9], tip: [0.9, 1.8], open: [2.5, 0.8], roll: [3.3, 3.7], shut: [7.0, 0.6], wait: [7.6, 0.4] } as const

/** How long the float scene runs, in seconds. */
export const FLOAT_SECONDS = FLOAT_TIMES.wait[0] + FLOAT_TIMES.wait[1]

/** How far a thing of the float lies turned out of the line and leans more or less than the next, one way or the other: twice the angle within which two faces can share a plane on the screen. */
export const ASKEW = 0.06

/**
 * The float goes out. The tower drops where it hung and sways; it tips over, foot toward the gate, each thing
 * clacking down behind the one before, and lies as one long float with its bottom thing in front; the gate
 * swings open; the float rolls out in its bottom thing's walk, each thing sounding as it passes the gate post;
 * the gate shuts, and the next street's things step up behind the bars.
 */
export function floatBeats(stage: Stage, play: Play, parts: readonly Kind[], from: { x: number; z: number }, waiting: readonly Kind[]): Beat[] {
  const count = parts.length, bottom = parts[0]
  // Where each thing lies in the float, as a distance behind its head.
  const behind: number[] = [0]
  let whole = 0
  for (let i = 1; i < count; i++) whole += (KIND[parts[i - 1]].width + KIND[parts[i]].width) / 2
  const pack = Math.min(0.8, (GATE.x - STREET.x0 - 1.2) / Math.max(1, whole))
  for (let i = 1; i < count; i++) behind.push(behind[i - 1] + ((KIND[parts[i - 1]].width + KIND[parts[i]].width) / 2) * pack)
  const float: Float = {
    parts: parts.map((kind, index) => ({ kind, x: from.x, y: HOVER + seatOf(parts, index), z: from.z, lean: 0, yaw: 0, size: 1 })),
    tower: true, bottom, load: parts.reduce((sum, kind) => sum + KIND[kind].width, 0), gait: 0, sway: 0, squash: 0, hat: parts.indexOf('hat'),
  }
  let clacked = 0, passed = 0, rolled = 0, landed = false
  const toGate = LINE_Z - GATE.z
  // The things lie a little askew, each turned and leaning otherwise than the two before it: no face of one lies in the plane of a face of a thing it lies against, so two dogs' wheels never share one, nor a pie's top the brim of a hat.
  const askew = (index: number): number => ((index % 3) - 1) * ASKEW
  const place = (part: FloatPart, far: number, index: number): void => {
    // `far` is how far this thing is past the corner in front of the gate: behind it on the line, and past it on the way through.
    if (far <= 0) { part.x = GATE.x + far; part.z = LINE_Z; part.yaw = askew(index) } else { part.x = GATE.x; part.z = LINE_Z - far; part.yaw = askew(index) + Math.PI / 2 * Math.min(1, far / 0.8) }
    part.size = 1 - Math.min(1, Math.max(0, (far - toGate) / GONE))
  }
  return [
    {
      at: FLOAT_TIMES.drop[0], lasts: FLOAT_TIMES.drop[1],
      play(progress, finishing) {
        stage.float = float
        stage.waiting = []
        const down = Math.min(1, progress / 0.3)
        float.parts.forEach((part, index) => { part.y = seatOf(parts, index) + HOVER * (1 - down * down) })
        float.squash = down >= 1 ? Math.max(0, 1 - (progress - 0.3) / 0.25) : 0
        float.sway = progress > 0.3 ? Math.sin((progress - 0.3) * 13) * (1 - progress) * 0.12 : 0
        // Its thud and the scraps round its foot come in the frame it touches down. A touch that ends the scene lands it without a sound.
        if (down >= 1 && !landed) {
          landed = true
          if (!finishing) play.cues.push({ type: 'thud', parts, x: from.x, z: from.z })
        }
      },
    },
    {
      at: FLOAT_TIMES.tip[0], lasts: FLOAT_TIMES.tip[1],
      play(progress, finishing) {
        float.tower = false
        float.sway = 0
        float.squash = 0
        const seconds = progress * FLOAT_TIMES.tip[1], each = 0.5, gap = (FLOAT_TIMES.tip[1] - each) / Math.max(1, count - 1)
        let down = 0
        float.parts.forEach((part, index) => {
          const t = Math.min(1, Math.max(0, (seconds - index * gap) / each)), eased = t * t * (3 - 2 * t)
          const x = GATE.x - behind[index]
          part.x = from.x + (x - from.x) * eased
          part.z = from.z + (LINE_Z - from.z) * eased
          part.y = seatOf(parts, index) * (1 - eased) + 0.9 * Math.sin(t * Math.PI)
          // Each leans on the one in front of it, as fallen dominoes do.
          part.lean = index > 0 ? (0.28 + askew(index)) * eased : 0
          part.yaw = askew(index) * eased
          if (t >= 1) down += 1
        })
        // A clack for each thing as it lands. A touch that ends the scene lands the rest without a sound.
        while (clacked < down) {
          if (!finishing) play.cues.push({ type: 'clack', kind: parts[clacked] })
          clacked += 1
        }
      },
    },
    {
      at: FLOAT_TIMES.open[0], lasts: FLOAT_TIMES.open[1],
      play(progress, finishing) {
        if (stage.gate === 0 && !finishing) play.cues.push({ type: 'gate', open: true })
        stage.gate = Math.max(stage.gate, progress * progress * (3 - 2 * progress), 0.001)
      },
    },
    {
      at: FLOAT_TIMES.roll[0], lasts: FLOAT_TIMES.roll[1],
      play(progress, finishing) {
        const far = progress * (toGate + GONE + behind[count - 1])
        float.gait = far / STRIDE[bottom]
        // The wheels or the feet it goes on are heard, quietly, at every second step: as the step begins, or as it lands when it is
        // a hop or a bounce. A touch that ends the scene rolls the rest out without a sound.
        while (rolled * 2 + (airborne(bottom) ? 1 : 0) <= float.gait) {
          if (!finishing && progress < 1) play.cues.push({ type: 'roll', kind: bottom, step: rolled })
          rolled += 1
        }
        let through = 0
        float.parts.forEach((part, index) => {
          place(part, far - behind[index], index)
          part.y = 0
          if (far - behind[index] >= toGate) through += 1
        })
        // Each thing sounds as it passes the gate post, so the tune is this order and no other.
        while (passed < through) {
          if (!finishing) play.cues.push({ type: 'pass', kind: parts[passed] })
          passed += 1
        }
        if (progress >= 1) stage.float = null
      },
    },
    {
      at: FLOAT_TIMES.shut[0], lasts: FLOAT_TIMES.shut[1],
      play(progress, finishing) {
        stage.float = null
        if (stage.gate === 1 && !finishing) play.cues.push({ type: 'gate', open: false })
        shutting(stage, play, progress, finishing)
      },
    },
    {
      at: FLOAT_TIMES.wait[0], lasts: FLOAT_TIMES.wait[1],
      play(progress) {
        stage.waiting = [...waiting]
        stage.stepped = progress
      },
    },
  ]
}

/** The order the things of a new street come in: biggest first, which is the order the street was laid in. */
export function arrivals(things: readonly Thing[]): Thing[] {
  return [...things]
}

/** How long a thing takes from the gate to its spot, by how far that is. */
function secondsFor(long: number): number {
  return Math.min(0.5, Math.max(0.28, long / 15))
}

const OPEN_SECONDS = 0.6
const SHUT_SECONDS = 0.5

/** The ways the things of a street take in from the gate, in the order they come, each past those already standing and round the hole. */
export function waysIn(things: readonly Thing[], hole: { x: number; z: number; mouth: number }): Route[] {
  const standing: { x: number; z: number; wide: number }[] = [{ x: hole.x, z: hole.z, wide: hole.mouth }]
  return arrivals(things).map((thing) => {
    const wide = KIND[thing.parts[0]].width
    const route = routeIn(thing, wide, standing)
    standing.push({ x: thing.x, z: thing.z, wide })
    return route
  })
}

/**
 * The next street comes in. The gate opens with a creak and the two that waited step back out of the way; the
 * things come in one at a time, biggest first, each in its own walk, and each stops on its spot with its own
 * sound; the gate shuts. `play.comeIn` has put every thing on its spot in the save before this starts.
 */
export function enterBeats(stage: Stage, play: Play, wait = 0): Beat[] {
  const order = arrivals(play.things), ways = waysIn(play.things, { x: play.x, z: play.z, mouth: play.mouth })
  const beats: Beat[] = [{
    at: 0, lasts: OPEN_SECONDS,
    play(progress, finishing) {
      if (stage.gate === 0 && !finishing) play.cues.push({ type: 'gate', open: true })
      stage.gate = Math.max(stage.gate, progress * progress * (3 - 2 * progress), 0.001)
      stage.stepped = 1 - progress
      if (progress >= 1) stage.waiting = []
    },
  }]
  // The first thing waits for the gate, and for the hole to have glided out of its way (`wait`, in seconds).
  let at = Math.max(OPEN_SECONDS, wait)
  const pose = { x: 0, z: 0, dirX: 0, dirZ: 1 }
  order.forEach((thing, index) => {
    const way = ways[index], kind = thing.parts[0]
    // From behind the gate, through it, and then by its way to its spot.
    const points = [{ x: GATE.x, z: YARD.z }, { ...ENTRY }, ...way.points.slice(1)]
    const long = way.long + (ENTRY.z - YARD.z), lasts = secondsFor(long), steps = Math.max(2, Math.round(long / (STRIDE[kind] * 2)))
    let heard = 0
    beats.push({
      at, lasts,
      play(progress, finishing) {
        thing.away = false
        thing.gait = progress * steps
        along(points, strode(kind, thing.gait, steps) * long, pose)
        thing.sx = pose.x
        thing.sz = pose.z
        thing.dirX = pose.dirX
        thing.dirZ = pose.dirZ
        // Through the gate it comes out of the dark, and on a street with no way round it comes over the others in one leap.
        thing.size = Math.min(1, 0.25 + progress * 4)
        const past = Math.max(0, (progress * long - (ENTRY.z - YARD.z)) / Math.max(0.01, way.long))
        thing.leap = way.over ? 3.4 * Math.sin(Math.min(1, past) * Math.PI) : 0
        // Each step is heard as it begins; a hop or a bounce as it lands.
        while (heard < steps && heard + (airborne(kind) ? 1 : 0) <= thing.gait) {
          if (!finishing) play.cues.push({ type: 'step', parts: thing.parts, step: heard, x: thing.sx, z: thing.sz })
          heard += 1
        }
        if (progress >= 1) {
          thing.sx = thing.x
          thing.sz = thing.z
          thing.leap = 0
          thing.coming = false
          thing.gait = 0
          thing.size = 1
          thing.since = 0
          if (!finishing) {
            thing.squash = 0.7
            thing.poked = 0
            play.cues.push({ type: 'arrive', kind })
          }
        }
      },
    })
    at += lasts * 0.94
  })
  beats.push({
    at: at + 0.1, lasts: SHUT_SECONDS,
    play(progress, finishing) {
      if (stage.gate === 1 && !finishing) play.cues.push({ type: 'gate', open: false })
      shutting(stage, play, progress, finishing)
    },
  })
  return beats
}
