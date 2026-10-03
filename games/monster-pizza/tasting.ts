import type { Kind } from './kinds'
import type { Difference } from './order'

// What a tasting plays: the difference between the card and the pizza, acted
// out one piece at a time, so the child sees which pieces had no partner
// (pack: game-design, errors-show-as-consequences.md). Pure: a plan of what
// happens when, in seconds from the start of the scene. The scene plays it
// and the view draws it.

export type Taste = {
  kind: Kind
  /** Too many of this kind on the pizza, or too few. */
  way: 'many' | 'few'
  /** Which of the pieces that are off this beat is about, counted from 0. */
  index: number
  /** More than three off: one big version stands for all of them. */
  big: boolean
  at: number
  lasts: number
}

export type TastingPlan = {
  /** The lean and the lick. */
  lick: { at: number; lasts: number }
  tastes: Taste[]
  /** The pizza pushed back to the board, exactly as it was. */
  push: { at: number; lasts: number }
  seconds: number
}

/** Pieces off are played one by one up to this many; beyond it one big version plays. */
export const ONE_BY_ONE = 3
/** At most this many kinds are played in one tasting. */
export const KINDS_PLAYED = 3
const LICK = 1.4
const SAVOUR = 0.5
const BETWEEN = 0.25
const AFTER = 0.4
const PUSH = 0.9
/** A big version, alone and among others. */
const BIG = 2
const BIG_AMONG = 1.4
/** A tasting lasts 4 to 8 seconds. */
export const SHORTEST = 4
export const LONGEST = 8

export function planTasting(differences: readonly Difference[]): TastingPlan {
  // Too many first: those pieces are on the pizza, in front of the child.
  const played = [...differences.filter((d) => d.off > 0), ...differences.filter((d) => d.off < 0)].slice(0, KINDS_PLAYED)
  const small = played.reduce((n, d) => n + (Math.abs(d.off) <= ONE_BY_ONE ? Math.abs(d.off) : 0), 0)
  const bigs = played.filter((d) => Math.abs(d.off) > ONE_BY_ONE).length
  const big = bigs > 1 ? BIG_AMONG : BIG
  const fixed = LICK + SAVOUR + bigs * big + Math.max(0, played.length - 1) * BETWEEN + AFTER + PUSH
  // Each single piece gets as long as fits: a lone one is savoured, a row of nine goes briskly.
  const each = small > 0 ? Math.max(0.38, Math.min(1.1, (LONGEST - fixed) / small, (Math.max(SHORTEST, fixed + small * 0.7) - fixed) / small)) : 0
  const tastes: Taste[] = []
  let at = LICK + SAVOUR
  played.forEach((d, i) => {
    if (i > 0) at += BETWEEN
    const way = d.off > 0 ? 'many' : 'few'
    const n = Math.abs(d.off)
    if (n > ONE_BY_ONE) {
      tastes.push({ kind: d.kind, way, index: 0, big: true, at, lasts: big })
      at += big
    } else {
      for (let index = 0; index < n; index++) {
        tastes.push({ kind: d.kind, way, index, big: false, at, lasts: each })
        at += each
      }
    }
  })
  const push = { at: at + AFTER, lasts: PUSH }
  return { lick: { at: 0, lasts: LICK }, tastes, push, seconds: push.at + push.lasts }
}

/** The short tasting of a pizza served raw: the dough sticks, stretches and snaps back, and the customer looks at the oven. */
export const RAW = { lick: 1.2, stretch: 1.2, snap: 0.3, look: 0.8, push: 0.7, seconds: 4.2 } as const
