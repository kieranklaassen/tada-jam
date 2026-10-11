import { DOOR, HEAD, PEG } from './layout'
import { placesOf, type Actor } from './poses'
import type { Comparison } from './showing'
import type { CustomerId } from './tastes'
import type { FaceSpot, Salon } from './world'

// Where everyone is drawn, and the few things a scene moves that the model
// does not hold: the door, the cape in the air, a rain hat, a paw that shows
// a move. The model says where everyone is; this says where they are on the
// way there. A scene writes to it beat by beat, and `settle` puts everything
// where the model has it, which is where a scene that is cut short ends.
// Pure numbers: no canvas and no clock.

/** One figure as it is drawn: where the middle of its head is, how big, how far off the ground mid-hop, and how much of it shows. */
export type Shown = { x: number; y: number; s: number; lift: number; seen: number }

/** Standing in the doorway, and the two places outside the door's glass where the next pair wait. */
export const DOORWAY: Actor = { x: DOOR.x + DOOR.w / 2, y: 430, s: 0.65 }
export const WINDOW: readonly [Actor, Actor] = [
  { x: DOOR.glass.x + 56, y: 392, s: 0.62 },
  { x: DOOR.glass.x + 132, y: 426, s: 0.52 },
]

const shown = (a: Actor, seen = 1): Shown => ({ x: a.x, y: a.y, s: a.s, lift: 0, seen })
export const smooth = (t: number): number => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }

/** How far down the low way round the front of the chair goes at its lowest, along the floor in front of the cape. */
export const LOW = 170

/** How much of the low way a walker has gone down by, part of the way along: down quickly, along the floor, up at the end. */
export function dipAt(progress: number): number {
  const c = Math.max(0, Math.min(1, progress))
  return Math.sin(Math.PI * c) ** 0.6
}

/** The low way for a walk that would otherwise take a head across the customer's: nobody passes through the one in the chair. */
export function lowFor(from: Actor, to: Actor): number {
  return (from.x - HEAD.x) * (to.x - HEAD.x) < 0 ? LOW : 0
}

/**
 * A figure part of the way from one place to another, hopping as it goes:
 * `steps` hops over the whole way, each `hop` high. `low` takes it down
 * along the floor on the way, in front of whoever it passes.
 */
export function walk(from: Actor, to: Actor, progress: number, gait: { hop: number; steps: number }, seconds: number, low = 0): Shown {
  const t = smooth(progress), hops = Math.max(1, Math.round(gait.steps * seconds))
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t + (progress >= 1 ? 0 : low * dipAt(progress)),
    s: from.s + (to.s - from.s) * t,
    lift: progress >= 1 ? 0 : gait.hop * Math.abs(Math.sin(Math.PI * hops * progress)),
    seen: 1,
  }
}

/** One of the pair that was done, on its way out with what it has: its lock as the child left it, the customer's mane as it was cut, and whatever is stuck on its face. */
export type Goer = { who: CustomerId; part: 'chair' | 'friend'; at: Shown; from: Actor; lock: number; mane: readonly number[] | null; worn: readonly { spot: FaceSpot; len: number; hue: string }[] }

export class Staging {
  /** The pair in the salon, where they are drawn. Nothing, with nobody in the chair. */
  customer: Shown | null = null
  friend: Shown | null = null
  /** The pair that was done, on their way out. */
  leaving: Goer[] = []
  /** 0 shut, 1 open. */
  door = 0
  /** How much of the next pair shows behind the door's glass. */
  waiting = 1
  /** The cape: 1 over the customer, 0 draped over the chair behind the pair, and between the two in the air. */
  cape = 0
  /** The pair in the salon still wear their rain hats, hair tucked under: 1 on, 0 off. */
  hats = 0
  /** What the two locks are acting out when the cape has come off, and how big the muddle is. */
  fx: { kind: Comparison['kind']; muddle: number } | null = null
  /** The customer's paw, out at work: where it is, and how far open the scissors in it are when it holds a pair. */
  paw: { x: number; y: number; scissors: number | null } | null = null
  /** Where the ribbon is drawn and how long, while the friend shows what it is for. */
  ribbon: { x: number; y: number; len: number } | null = null
  /** How far the customer's tail is held out straight to be measured, 0 to 1. */
  tails = 0
  /** How far the friend's own tail is held out straight, 0 to 1: at the peg, and not when it stands at the customer's tail, where one straight tail is the thing to see. */
  ownTail = 0
  /** How many steps longer the customer's lock is drawn, while its own paw draws it out to see if it will reach. */
  stretch = 0

  /** Everything where the model has it: nobody on the way anywhere, the door shut, no scene left over. */
  settle(salon: Salon): void {
    const places = placesOf(salon)
    this.customer = places.customer ? shown(places.customer) : null
    this.friend = places.friend ? shown(places.friend) : null
    this.leaving = []
    this.door = 0
    this.waiting = 1
    this.cape = salon.chair !== null && salon.cape === 'on' ? 1 : 0
    this.hats = 0
    this.fx = null
    this.paw = null
    this.ribbon = null
    this.tails = 0
    this.ownTail = 0
    this.stretch = 0
  }
}

/** Where the ribbon's peg is, for a scene that takes the ribbon from it and brings it back. */
export const RIBBON_HOME = PEG
