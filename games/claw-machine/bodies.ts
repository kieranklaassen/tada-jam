import { toySpan } from './builds'
import type { Toy } from './toys'

// A toy as a thing that moves: where the middle of its base is, how it is
// squashed, and where it is flying to. The rules say where a toy belongs
// (world.ts); a body is only how it gets there, and at rest it is exactly
// where the rules have it. Plastic is hard: it hops, flies and clicks down,
// and squashes for an instant when it lands.

export const FALL = 110

export type Landing = 'stand' | 'mouth' | 'belly' | 'again'

export type Body = {
  toy: Toy
  height: number
  /** 1 a small toy, 2 a big one. */
  heavy: 1 | 2
  /**
   * resting: where the rules have it (on the tray or in a belly). held: in
   * the jaws. flying: on its way somewhere. mouth: on a gobbler's tongue.
   * parked: kept where it is by a scene until its cue comes.
   */
  mode: 'resting' | 'held' | 'flying' | 'mouth' | 'parked'
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  /** Drawn size: 1 on the tray, small in a belly. It changes over a flight. */
  scale: number
  scaleFrom: number
  scaleTo: number
  /** Seconds a flight takes and how far through it is. */
  flight: number
  flown: number
  /** How far a hop has lifted it off its rest. */
  hop: number
  hopV: number
  squash: number
  squashV: number
  leanX: number
  leanZ: number
  /** 0 just caught, 1 hanging true in the jaws. */
  hang: number
  /**
   * How many more legs of its flight it is carried by the gobbler it is leaving or going down into: while this is
   * above 0 it is drawn as fixed to that gobbler, so whatever the gobbler does, it does too.
   */
  rides: number
  /** Seconds it still waits, parked, before the flight that has been laid out for it begins. */
  wait: number
  /** What a flight ends in. */
  landing: Landing
  /** The gobbler whose mouth it is in or on its way to, or -1; and seconds it has been there. */
  slot: number
  chewed: number
  /** Legs of a flight still to come after this one: each a point, a time and a size. */
  legs: Leg[]
}

export type Leg = { x: number; y: number; z: number; seconds: number; scale: number; landing: Landing; /** The point is a fixed one, and not wherever the rules or a tongue have the toy by then. */ fixed?: boolean }

export function newBody(toy: Toy): Body {
  return {
    toy, height: toySpan(toy).height, heavy: toy.size === 'big' ? 2 : 1, mode: 'resting',
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, scale: 1, scaleFrom: 1, scaleTo: 1, flight: 0, flown: 0,
    hop: 0, hopV: 0, squash: 1, squashV: 0, leanX: 0, leanZ: 0, hang: 0, rides: 0, wait: 0, landing: 'stand', slot: -1, chewed: 0, legs: [],
  }
}

/**
 * Throws a body to a point so that it arrives after `seconds`, under the
 * world's own fall. The throw is worked out from where it is to go, so it
 * always lands there: nothing that flies depends on chance or on timing.
 */
export function toss(body: Body, to: Leg): void {
  const t = Math.max(0.05, to.seconds)
  body.mode = 'flying'
  body.vx = (to.x - body.x) / t
  body.vz = (to.z - body.z) / t
  body.vy = (to.y - body.y) / t + 0.5 * FALL * t
  body.flight = t; body.flown = 0
  body.scaleFrom = body.scale; body.scaleTo = to.scale
  body.landing = to.landing
  body.hop = 0; body.hopV = 0
}

/**
 * How long a throw takes that rises to `peak` on its way: a toy thrown over
 * something clears it by being thrown high enough, never by passing through.
 */
export function airTime(fromY: number, toY: number, peak: number): number {
  const top = Math.max(peak, fromY + 0.3, toY + 0.3)
  const up = Math.sqrt((2 * (top - fromY)) / FALL), down = Math.sqrt((2 * (top - toY)) / FALL)
  return up + down
}

/** Throws a body along several legs, one after another. */
export function tossAlong(body: Body, legs: Leg[]): void {
  body.legs = legs.slice(1)
  toss(body, legs[0])
}

/**
 * One step of a flight. Returns the landing when the body arrives this step,
 * with the body set exactly on the point it was thrown to.
 */
export function fly(body: Body, to: { x: number; y: number; z: number }, dt: number): Landing | null {
  body.flown += dt
  if (body.flown >= body.flight) {
    body.x = to.x; body.y = to.y; body.z = to.z
    body.vx = body.vy = body.vz = 0
    body.scale = body.scaleTo
    body.leanX = 0; body.leanZ = 0
    return body.landing
  }
  body.vy -= FALL * dt
  body.x += body.vx * dt; body.y += body.vy * dt; body.z += body.vz * dt
  // Stepped in fixed steps it falls a hair faster than its arc, so on the way down it is held at the height it
  // is going to: it never dips into what it lands on in the step before it lands.
  if (body.vy < 0 && body.y < to.y) body.y = to.y
  // It rights itself as it flies: however it hung or lay when it was let go, it comes down level.
  const level = Math.max(0, 1 - 9 * dt)
  body.leanX *= level; body.leanZ *= level
  // What grows in flight grows late, and what shrinks shrinks early: it is small while it is near what it left
  // or what it is going into.
  const through = body.flown / body.flight, rest = 1 - through
  body.scale = body.scaleFrom + (body.scaleTo - body.scaleFrom) * (body.scaleTo > body.scaleFrom ? through * through * through : 1 - rest * rest * rest)
  return null
}

/** The springs every body has: a squash that comes back, and a hop that is a small throw straight up. */
export function settle(body: Body, dt: number): void {
  body.squashV += ((1 - body.squash) * 600 - body.squashV * 22) * dt
  body.squash += body.squashV * dt
  if (body.hop > 0 || body.hopV > 0) {
    body.hopV -= FALL * dt
    body.hop += body.hopV * dt
    if (body.hop <= 0) {
      if (body.hopV < -5) { body.squash = Math.max(0.8, 1 + body.hopV * 0.012); body.squashV = 0 }
      body.hop = 0; body.hopV = 0
    }
  }
}

/** A knock from below: the nearer and the lighter, the higher the hop. */
export function jolt(body: Body, strength: number, distance: number, reach: number): void {
  body.hopV += strength / (1 + (distance / reach) * (distance / reach)) / Math.sqrt(body.heavy)
}
