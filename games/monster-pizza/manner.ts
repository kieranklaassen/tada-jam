import type { Customer } from './customers'

// Each customer's manner. A reaction is the same joke for everyone, played
// in its owner's way: how big it is, when in its beat it comes and how long
// it takes, how round or thin it is drawn, and how high and how long it
// sounds. It never changes how many beats there are, since one beat is one
// piece. The body's share of the manner is `mannerAct` in scenes.ts.

export type Manner = {
  /** How big its reactions are drawn, 1 as they are. */
  size: number
  /** When in a beat the reaction starts and ends, each 0 to 1: quick and early, or slow and late. */
  from: number
  to: number
  /** 0 thin and sharp to 1 round and rolling. */
  round: number
  /** How its reactions sound: pitch and length, 1 as they are. */
  pitch: number
  length: number
}

export const MANNERS: Record<Customer, Manner> = {
  // One quick spark, with a hop.
  bim: { size: 0.62, from: 0, to: 0.55, round: 0, pitch: 1.5, length: 0.6 },
  // One slow rolling ball, late.
  grum: { size: 1.4, from: 0.15, to: 1, round: 1, pitch: 0.62, length: 1.3 },
  // Thin and jittery, over early.
  fizz: { size: 0.82, from: 0, to: 0.75, round: 0.25, pitch: 1.25, length: 0.8 },
  // Soft and round, a moment behind.
  mops: { size: 1.12, from: 0.2, to: 1, round: 0.7, pitch: 0.85, length: 1.15 },
  // It sags into it and out again.
  ooze: { size: 1, from: 0.08, to: 0.92, round: 0.5, pitch: 0.95, length: 1.1 },
}

/** A reaction drawn for nobody in particular: the still scene of the look spike. */
export const PLAIN: Manner = { size: 1, from: 0, to: 1, round: 0.4, pitch: 1, length: 1 }

/** How far through its reaction a customer is, `t` through the beat. */
export function through(m: Manner, t: number): number {
  return Math.min(1, Math.max(0, (t - m.from) / (m.to - m.from)))
}
