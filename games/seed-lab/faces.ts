// What a face does by itself: where its eyes go when a finger is on the page,
// and how its brow sits for what it is doing. Every creature keeps its deadpan;
// the eyes follow the finger and the one lid lifts or lowers. No DOM.

import type { Point } from './hit'

/**
 * The look of an eye at `eye` that follows a finger at `finger`: in radians, 0 straight ahead and positive upwards,
 * as a pose's `look` is. A creature faces left, towards the plants; `away` is one that faces right.
 */
export function lookAt(eye: Point, finger: Point, away = false): number {
  return Math.atan2(eye.y - finger.y, away ? finger.x - eye.x : eye.x - finger.x)
}

/** How long after a finger has lifted the eyes still rest where it was, in seconds. */
export const FINGER_SEEN = 0.7

/**
 * A visitor's brow for what it is doing: lifted, wide-eyed, while it likes a trait, takes its plant or is startled by
 * a poke; lowered and cross at the trait that misses; a little lowered in a shrug; as it is drawn otherwise.
 */
export function visitorMood(doing: string | null): number {
  if (!doing) return 0
  if (doing.startsWith('like')) return 0.8
  if (doing.startsWith('miss')) return -0.9
  if (doing === 'poked' || doing === 'hat' || doing === 'vanish') return 1
  if (doing === 'take' || doing === 'use') return 0.7
  if (doing === 'shrug') return -0.5
  return 0
}

/** The beetle's brow: stern on guard, cross when it notices something out of place and over its tape, wide when it goes over or sneezes. */
export function beetleMood(doing: string | null, upset: boolean, untidy: boolean): number {
  if (upset) return 1
  if (doing === 'guard') return -1
  if (doing === 'notice') return -0.7
  if (doing === 'smooth-tape' || doing === 'straighten') return -0.4
  return untidy ? -0.6 : 0
}

/** Eases a look or a brow towards where it is going, so that neither snaps: `rate` is how much of the way it goes in a second, at the start. */
export function ease(from: number, to: number, rate: number, dt: number): number {
  return from + (to - from) * Math.min(1, rate * dt)
}
