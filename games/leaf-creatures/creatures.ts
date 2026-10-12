import { newBody, type Body, type Poked } from './gait'
import type { Kind } from './parts'
import { caps, count, front, wayOf, type Thing, type Way } from './things'
import type { VoiceKey } from './voices'

// A creature: a thing with two caps on it, awake. Here is what a creature
// is, as plain numbers, and the small things it does by itself in one place:
// it blinks, looks, answers a poke, tumbles when it is bowled over. How it
// travels is in travel.ts, what it wants in meet.ts, and the scenes that
// move it are in scenes.ts. Nothing here draws.

/** How long each kind's answer to a poke lasts, and when its second sound comes, if it has one. */
export const POKES: Record<Kind, { lasts: number; second?: { at: number; key: VoiceKey } }> = {
  twig: { lasts: 0.5 },
  maple: { lasts: 1.1 },
  willow: { lasts: 1.05, second: { at: 0.55, key: 'boing' } },
  round: { lasts: 1.3 },
  feather: { lasts: 1.3 },
  seed: { lasts: 0.9, second: { at: 0.4, key: 'sneeze' } },
  cap: { lasts: 0.7 },
}

/** `said`: its sound has been made. A poke that cannot play yet, on a creature thrown along or in the air, sounds when it does. */
export type Poke = { kind: Kind; index: number; t: number; awayX: number; awayY: number; fired: boolean; said: boolean }

/** What a creature is after, which is also where its eyes point. */
export type Want =
  | { what: 'finger'; x: number; y: number }
  | { what: 'tease'; whom: Creature }
  | { what: 'bowl'; whom: Creature }
  | { what: 'dig'; acorn: number; x: number; y: number }
  | { what: 'push'; acorn: number; x: number; y: number }
  | { what: 'show'; whom: Creature }
  | { what: 'flee'; from: Creature }
  | { what: 'hide' }
  | { what: 'curl'; beside: Creature }
  | { what: 'roam' }
  | { what: 'still' }

/** A leap over a crawler: from where it took off to where it lands behind the other. */
export type Leap = { fromX: number; fromY: number; toX: number; toY: number; t: number; lasts: number; high: number; beats: number }

/** Bowled over: thrown along, turning over itself, until it gets up. */
export type Tumble = { t: number; lasts: number; vx: number; vy: number; spin: number }

/** A habit of a kind that does not lead the way of going, playing now. */
export type Habit = { kind: Kind; t: number; lasts: number; fired: number }

export type Creature = {
  thing: Thing
  body: Body
  /** Where it is going, or null while it rests. */
  target: { x: number; y: number } | null
  /** Seconds of rest left before it wanders off again. */
  rest: number
  want: Want
  /** How many of its caps have turned over into eyes. */
  eyes: number
  /** How far its lids are down: 0 open, about a half when drowsy, 1 asleep. */
  lids: number
  poke: Poke | null
  /** 0 open, 1 shut, and seconds to the next blink; the third eye blinks in its own time. */
  blink: number
  nextBlink: number
  oddBlink: number
  nextOdd: number
  /** Where its pupils point, each from -1 to 1, eased. */
  lookX: number
  lookY: number
  /** Seconds its pupils still go round. */
  dizzy: number
  /** It was the one woken longest ago when a sixth woke, and is walking off for good. */
  leaving: boolean
  /** Whether it went anywhere in the last step. */
  moved: boolean
  /** A scene is moving it: it does nothing of its own until the scene is over. */
  inScene: boolean
  /** What a scene has it doing: striding on the spot while the scene carries it along a path, or going forward by itself. */
  acting: 'none' | 'path' | 'forward'
  /** Where the scene that has it will leave it: what is saved from the scene's first moment. */
  sceneEnd: { x: number; y: number; turn: number } | null
  /** The finger is on it: the part it landed on, or -1. */
  held: number
  leap: Leap | null
  tumble: Tumble | null
  habit: Habit | null
  /** Seconds of travel until the next habit, and which kind is next in turn. */
  nextHabit: number
  habitTurn: number
  /** A turn on the spot still to make, in radians: teased, or turning round before it lies down. */
  twirl: number
  /** Bursts, hops, sniffs or fans counted, for whatever happens every few of them. */
  counted: number
  /** Seconds a trip, a landing on the back or a tip backwards still lasts. */
  spill: number
  /** Seconds before it teases, bowls, pushes or fans again. */
  again: number
  /** Cross after being bowled over: seconds it smooths itself with its back turned. */
  cross: number
  /** 0 to 1: it leans into a finger that strokes it, towards `leanX`, `leanY` (a unit direction on the stage). */
  lean: number
  leanX: number
  leanY: number
  /** An eye a finger is pulling at, and how far it is stretched out of its place, in the creature's own frame. */
  tug: { index: number; x: number; y: number } | null
  /** It is on its way back on to the ground from behind the trees: where it will stand. */
  entering: { x: number; y: number } | null
  /** It is leaving because another began to leave after it, or has been on its way off too long: it bolts. */
  bolt: boolean
  /** Seconds since it set out to leave. */
  gone: number
  /** It cannot stand where it is, by its reach, and is sliding to where it can: it does nothing else meanwhile. */
  sliding: boolean
}

export function newCreature(thing: Thing, awakeAlready: boolean): Creature {
  const asleep = thing.bedded
  const creature: Creature = {
    thing, body: newBody(), target: null, rest: 0, want: { what: 'still' }, eyes: awakeAlready ? caps(thing) : 0,
    lids: asleep ? 1 : thing.drowsy ? 0.5 : 0, poke: null, blink: 0, nextBlink: 2, oddBlink: 0, nextOdd: 3.1, lookX: 0, lookY: 0, dizzy: 0,
    leaving: false, moved: false, inScene: false, acting: 'none', sceneEnd: null, held: -1, leap: null, tumble: null, habit: null, nextHabit: 3, habitTurn: 0, twirl: 0, counted: 0, spill: 0, again: 4, cross: 0, lean: 0, leanX: 0, leanY: 0, tug: null, entering: null, bolt: false, gone: 0, sliding: false,
  }
  if (asleep) creature.body.curl = 1
  return creature
}

/** The way a creature faces on the stage. */
export function facing(creature: Creature): number {
  return creature.thing.turn + front(creature.thing)
}

/** The kind a creature travels by, and how many parts of it there are. */
export function leading(thing: Thing): { way: Way; n: number } {
  const way = wayOf(thing)
  return { way, n: way === 'cap' ? caps(thing) : count(thing, way) }
}

/** Whether it has no kind of part but this one, besides its eyes: the wrong uses that are funniest. */
export function only(thing: Thing, kind: Kind): boolean {
  let any = false
  for (const part of thing.parts) {
    if (part.kind === 'cap') continue
    if (part.kind !== kind) return false
    any = true
  }
  return any
}

/** Whether it is up and about: not asleep, not leaving, and no scene has it. */
export function about(creature: Creature): boolean {
  return !creature.thing.bedded && !creature.leaving && !creature.inScene
}

/** Steps the blinks and the dizziness, which go on whatever else it does. */
export function stepFace(creature: Creature, dt: number, chance: () => number): void {
  creature.nextBlink -= dt
  if (creature.nextBlink <= 0) { creature.blink = 1; creature.nextBlink = 1.5 + chance() * 3.5 }
  creature.blink = Math.max(0, creature.blink - dt * 8)
  // A third cap blinks out of turn.
  if (caps(creature.thing) >= 3) {
    creature.nextOdd -= dt
    if (creature.nextOdd <= 0) { creature.oddBlink = 1; creature.nextOdd = 0.9 + chance() * 2.2 }
  }
  creature.oddBlink = Math.max(0, creature.oddBlink - dt * 6)
  creature.dizzy = Math.max(0, creature.dizzy - dt)
  creature.again = Math.max(0, creature.again - dt)
  creature.cross = Math.max(0, creature.cross - dt)
  // In a scene the beats move the lids: what is saved is not yet what is shown.
  if (creature.inScene) return
  const lids = creature.thing.bedded ? 1 : creature.thing.drowsy ? 0.5 : 0
  creature.lids += (lids - creature.lids) * Math.min(1, dt * 6)
}

/** Turns the pupils toward a point, or to the front when there is none. */
export function look(creature: Creature, at: { x: number; y: number } | null, dt: number): void {
  let tx = 0, ty = 0
  if (at) {
    const dx = at.x - creature.thing.x, dy = at.y - creature.thing.y, far = Math.hypot(dx, dy) || 1
    tx = dx / far; ty = dy / far
  }
  const ease = Math.min(1, dt * 9)
  creature.lookX += (tx - creature.lookX) * ease
  creature.lookY += (ty - creature.lookY) * ease
}

/** Begins a creature's answer to a poke on one of its parts. The poke's own sound is asked for by the caller, in the touch. */
/** True while a poke on it would wait: it is being thrown along, is in the air over a crawler, or is sliding to where it can stand. */
export const pokeWaits = (creature: Creature): boolean => creature.tumble !== null || creature.leap !== null || creature.sliding

export function poke(creature: Creature, index: number, fromX: number, fromY: number): void {
  const dx = creature.thing.x - fromX, dy = creature.thing.y - fromY, far = Math.hypot(dx, dy) || 1
  creature.poke = { kind: creature.thing.parts[index].kind, index, t: 0, awayX: far > 1 ? dx / far : 0, awayY: far > 1 ? dy / far : -1, fired: false, said: false }
  creature.thing.drowsy = false
  creature.habit = null
}

/** The poke that is playing, as the pose of one part needs it. */
export function pokedFor(creature: Creature, partIndex: number): Poked {
  const p = creature.poke
  if (!p) return null
  return { kind: p.kind, u: Math.min(1, p.t / POKES[p.kind].lasts), own: p.index === partIndex }
}

/** Throws a creature along, turning over itself: what a roller does to whatever it rolls into. */
export function bowlOver(creature: Creature, dirX: number, dirY: number, far: number): void {
  const lasts = 1.1
  creature.tumble = { t: 0, lasts, vx: (dirX * far * 2) / lasts, vy: (dirY * far * 2) / lasts, spin: (dirX >= 0 ? 1 : -1) * Math.PI * 2 }
  creature.poke = null; creature.habit = null; creature.leap = null; creature.target = null
  creature.thing.drowsy = false
}
