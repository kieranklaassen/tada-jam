import { isPrimary, PRIMARIES, type Hue } from './colors'
import { PLOTS, POUCH_SLOTS, type Point } from './layout'

// Wordless guidance for a four-year-old: no text, no voice, no verdicts.
// When the child stops, one next act is chosen from the meadow as it is:
// plant a loose seed, else plant a seed from the pouch, else tap a flower so
// the bee visits it, else pick a flower to make room. A glow ring breathes on
// that act first; a little later a felt hand shows it once. Demonstrations
// back off and stop after four, and any touch clears everything at once.

export type HintKind = 'plantLoose' | 'plantPouch' | 'callBee' | 'pick'

export type Hint = {
  kind: HintKind
  from: Point
  to: Point | null
  /** The molehill the act is about (the target for plants, the flower for taps and picks). */
  plot: number
  seedId: number
  slot: number
}

export type MeadowSummary = {
  empty: readonly number[]
  bloomed: readonly { plot: number; hue: Hue }[]
  loose: readonly { id: number; hue: Hue; x: number; z: number }[]
  pollen: readonly Hue[]
  /** The bee could drop a new seed (the grass has room). */
  beeHasRoom: boolean
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function nearestEmpty(empty: readonly number[], from: Point): number {
  let best = empty[0]
  for (const plot of empty) if (distance(PLOTS[plot], from) < distance(PLOTS[best], from)) best = plot
  return best
}

/** The one next act worth showing, given the meadow. */
export function chooseHint(meadow: MeadowSummary): Hint | null {
  if (meadow.empty.length > 0 && meadow.loose.length > 0) {
    let seed = meadow.loose[0]
    let bestScore = Infinity
    for (const candidate of meadow.loose) {
      const plot = nearestEmpty(meadow.empty, candidate)
      const score = distance(candidate, PLOTS[plot]) - (isPrimary(candidate.hue) ? 0 : 40)
      if (score < bestScore) {
        bestScore = score
        seed = candidate
      }
    }
    const plot = nearestEmpty(meadow.empty, seed)
    return { kind: 'plantLoose', from: { x: seed.x, z: seed.z }, to: PLOTS[plot], plot, seedId: seed.id, slot: -1 }
  }
  if (meadow.empty.length > 0) {
    const blooming = new Set(meadow.bloomed.map((flower) => flower.hue))
    let slot = PRIMARIES.findIndex((hue) => !blooming.has(hue))
    if (slot < 0) slot = 0
    const from = POUCH_SLOTS[slot]
    const plot = nearestEmpty(meadow.empty, from)
    return { kind: 'plantPouch', from, to: PLOTS[plot], plot, seedId: -1, slot }
  }
  if (meadow.bloomed.length > 0 && meadow.beeHasRoom) {
    const fresh = meadow.bloomed.find((flower) => !meadow.pollen.includes(flower.hue)) ?? meadow.bloomed[0]
    return { kind: 'callBee', from: PLOTS[fresh.plot], to: null, plot: fresh.plot, seedId: -1, slot: -1 }
  }
  if (meadow.bloomed.length > 0) {
    const flower = meadow.bloomed[meadow.bloomed.length - 1]
    const p = PLOTS[flower.plot]
    return { kind: 'pick', from: p, to: { x: p.x + (p.x < 0 ? 12 : -12), z: p.z + 13 }, plot: flower.plot, seedId: -1, slot: -1 }
  }
  return null
}

export const IDLE_BEFORE_GLOW = 3
export const IDLE_BEFORE_DEMO = 5
export const DEMO_SECONDS = 3
export const MAX_DEMOS = 4
export const INVITE_DELAY = 1.1
export const INVITE_SECONDS = 1.5
export const INVITE_EVERY = 6
export const MAX_INVITES = 3

export type GuidanceTiming = {
  /** 0..1 through the current demonstration, or -1 when none is playing. */
  demo: number
  /** 0..1 strength of the breathing glow. */
  glow: number
  /** 0..1 through the first-open pouch wiggle, or -1. */
  invite: number
  /** Seconds since the last touch. */
  idle: number
}

/** When to guide. Time is seconds of attended play; any touch resets the idle clock. */
export class GuidanceClock {
  private idleSince: number
  private readonly openedAt: number
  private touched = false

  constructor(now: number) {
    this.idleSince = now
    this.openedAt = now
  }

  touch(now: number): void {
    this.idleSince = now
    this.touched = true
  }

  /** Something happened in the meadow that the child is watching (a bloom, the bee's seed): hold off hints. */
  settle(now: number): void {
    if (now - this.idleSince > IDLE_BEFORE_GLOW - 1) this.idleSince = now - (IDLE_BEFORE_GLOW - 1)
  }

  timing(now: number, untouchedMeadow: boolean, out: GuidanceTiming): GuidanceTiming {
    const idle = now - this.idleSince
    out.idle = idle
    out.glow = idle < IDLE_BEFORE_GLOW ? 0 : Math.min(1, (idle - IDLE_BEFORE_GLOW) / 1.2) * (0.6 + 0.4 * Math.sin(now * 2.2))
    out.demo = -1
    let start = IDLE_BEFORE_DEMO
    let gap = IDLE_BEFORE_DEMO * 2
    for (let i = 0; i < MAX_DEMOS; i++) {
      if (idle >= start && idle < start + DEMO_SECONDS) out.demo = (idle - start) / DEMO_SECONDS
      start += DEMO_SECONDS + gap
      gap *= 2
    }
    out.invite = -1
    if (!this.touched && untouchedMeadow) {
      const since = now - this.openedAt - INVITE_DELAY
      if (since >= 0) {
        const round = Math.floor(since / INVITE_EVERY)
        const within = since - round * INVITE_EVERY
        if (round < MAX_INVITES && within < INVITE_SECONDS) out.invite = within / INVITE_SECONDS
      }
    }
    return out
  }
}

export type HandPose = { x: number; z: number; press: number; opacity: number; visible: boolean }

function span(t: number, a: number, b: number): number {
  return Math.min(1, Math.max(0, (t - a) / (b - a)))
}

/** The felt hand through one demonstration: float in, press, carry (or pat twice), lift, float away. */
export function handPose(hint: Hint, progress: number, out: HandPose): HandPose {
  out.opacity = Math.min(span(progress, 0, 0.1), 1 - span(progress, 0.88, 1))
  out.visible = out.opacity > 0.01
  if (!hint.to) {
    const pat = (a: number, b: number) => Math.sin(span(progress, a, b) * Math.PI)
    out.x = hint.from.x
    out.z = hint.from.z
    out.press = Math.max(pat(0.18, 0.4), pat(0.48, 0.7))
    return out
  }
  out.press = progress < 0.14 ? 0 : progress < 0.22 ? span(progress, 0.14, 0.22) : progress < 0.74 ? 1 : 1 - span(progress, 0.74, 0.82)
  const k = span(progress, 0.24, 0.72)
  const travel = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2
  out.x = hint.from.x + (hint.to.x - hint.from.x) * travel
  out.z = hint.from.z + (hint.to.z - hint.from.z) * travel
  return out
}
