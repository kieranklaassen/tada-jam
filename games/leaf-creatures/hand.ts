import { LIFT_GRACE_MS } from './input'
import { MANNERS, SHAPES, type Kind } from './parts'
import type { Part, Thing } from './things'

// The part in the hand. It rides above the finger from the frame it is
// taken, held by its stem, so a small hand never covers it: its middle is as
// far above the finger as its kind rides (parts.ts), it lags behind a moving
// finger at its own pace and swings to the way of travel, and it is never
// lower than a little above the finger. Nothing here draws.

export type Hand = {
  kind: Kind
  look: number
  /** The part it was lifted from where it lay, with its thing, or null for a part fresh from its heap or pulled off a creature. */
  from: { thing: Thing; part: Part } | null
  fingerX: number
  fingerY: number
  /** The middle of the part, and how it is turned: it points away from the finger. */
  x: number
  y: number
  turn: number
  /** The jump it made when the finger landed, ringing out. */
  jump: number
  jumpSpeed: number
  /** Where the carry began, to tell how much of the way to the earth it has come. */
  startX: number
  startY: number
  /** Stage units carried since the last rustle, and how fast the part is going. */
  sinceRustle: number
  speed: number
  /** Seconds in the hand: its twirl, flap and rock run on this. */
  held: number
  /** The finger has let go for a moment and may come back: the part waits where it is. */
  waiting: boolean
  /** Seconds of the toy's clock since the finger let go, while it waits. */
  waited: number
  /** It is a cap that this touch pulled off a creature. */
  pulled: boolean
  /** The very part it was on that creature, or null: the view shows it in the hand once the creature's picture no longer shows it. */
  was: object | null
}

/** How long a lifted finger may stay away before its carry ends, in seconds of the toy's clock: the template's grace (input.ts). */
export const LIFT_GRACE = LIFT_GRACE_MS / 1000
/** How far a part sinks while it waits for the finger, in stage units, and how far it quivers to each side, in radians. */
export const LET_SINK = 14
export const LET_QUIVER = 0.11

/**
 * A part whose finger has lifted is seen to be letting go: it sinks a little, more the longer the finger stays
 * away, and quivers as it does, so it never looks hung in the air. With the finger on it, it does neither.
 */
export function lettingGo(hand: Hand): { sink: number; quiver: number } {
  if (!hand.waiting) return { sink: 0, quiver: 0 }
  const gone = Math.min(1, hand.waited / LIFT_GRACE)
  return { sink: LET_SINK * gone, quiver: LET_QUIVER * (0.5 + 0.5 * gone) * Math.sin(hand.waited * 75) }
}

/** The lowest a held part's middle may be: this far above the finger, so its lower edge stays clear of the fingertip. */
export function clearOf(kind: Kind): number {
  return SHAPES[kind].r + 26
}

/** A part taken by a finger at fingerX, fingerY. It is above the finger at once; `fromX`, `fromY` is where it was, for the carry's start. */
export function newHand(kind: Kind, look: number, from: Hand['from'], fromX: number, fromY: number, fingerX: number, fingerY: number): Hand {
  return { kind, look, from, fingerX, fingerY, x: fingerX, y: fingerY - MANNERS[kind].rope, turn: -Math.PI / 2, jump: 0, jumpSpeed: MANNERS[kind].jump * MANNERS[kind].ring, startX: fromX, startY: fromY, sinceRustle: 0, speed: 0, held: 0, waiting: false, waited: 0, pulled: false, was: null }
}

/** Steps the part in the hand by `dt`. Returns true in a step in which it has gone far enough for its next rustle. */
export function stepHand(hand: Hand, dt: number): boolean {
  const manner = MANNERS[hand.kind]
  hand.held += dt
  // The jump rings out like a plucked spring.
  hand.jumpSpeed += (-manner.ring * manner.ring * hand.jump - manner.ring * 0.9 * hand.jumpSpeed) * dt
  hand.jump += hand.jumpSpeed * dt
  if (hand.waiting) { hand.speed = 0; hand.waited += dt; return false }
  const ease = 1 - Math.exp(-manner.follow * dt)
  const wantX = hand.fingerX, wantY = hand.fingerY - manner.rope
  const beforeX = hand.x, beforeY = hand.y
  hand.x += (wantX - hand.x) * ease
  hand.y += (wantY - hand.y) * ease
  // However fast the finger goes up, the part stays above it.
  hand.y = Math.min(hand.y, hand.fingerY - clearOf(hand.kind))
  const went = Math.hypot(hand.x - beforeX, hand.y - beforeY)
  hand.speed += (went / Math.max(dt, 0.001) - hand.speed) * Math.min(1, dt * 10)
  // Held by its stem, it points away from the finger and so swings behind the way of travel.
  hand.turn = Math.atan2(hand.y - hand.fingerY, hand.x - hand.fingerX)
  hand.sinceRustle += went
  if (hand.sinceRustle < manner.rustleEvery) return false
  hand.sinceRustle = 0
  return true
}
