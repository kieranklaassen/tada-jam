import type { PieceId, Point } from './layout'
import { RED, WHITE, type Mask } from './optics'

// Wordless guidance for a seven-year-old: no text, no voice, no verdicts.
// From the first frame one sleeper is the scene's want: the one the next act
// is for. When the child stops, touchable glass breathes and every sleeper
// dreams of its colour; a little later a ghost hand shows one possible next
// act for that sleeper (tap the lamp, carry the sleeper into a beam of its
// colour, bring a piece into a beam, turn a piece the light is touching).
// It shows a move, never the answer. Any touch clears everything at once;
// demonstrations back off and stop after a few, so an idle table goes quiet.

export type HintKind = 'tapLamp' | 'bringPiece' | 'tapPiece' | 'carrySleeper'

export type Hint = {
  kind: HintKind
  from: Point
  to: Point | null
  /** The piece pressed or carried; null when a sleeper is carried. */
  piece: PieceId | null
  /** The sleeper this move is for: the scene's one obvious want. */
  sleeper: number
}

export type Sleeper = { index: number; x: number; y: number; wants: Mask }
export type Placed = { id: PieceId; x: number; y: number }
/** Open panel where exactly sleeper `index`'s colour of light lands. */
export type Spot = { index: number; x: number; y: number }

export type GardenSummary = {
  sleepers: readonly Sleeper[]
  lamps: readonly Placed[]
  tray: readonly Placed[]
  /** A good spot on a white beam crossing open panel, if there is one. */
  whiteBeam: Point | null
  /** A good spot on a coloured beam, if there is one. */
  colourBeam: Point | null
  /** Where each sleeper's own colour already lands on open panel (at most one per sleeper). */
  spots: readonly Spot[]
  /** Panel pieces other than lamps that light is touching now. */
  lit: readonly Placed[]
  /** Somewhere open near the middle of the panel. */
  open: Point
}

function nearest<T extends Point>(items: readonly T[], to: Point): T | null {
  let best: T | null = null
  let bestDistance = Infinity
  for (const item of items) {
    const distance = Math.hypot(item.x - to.x, item.y - to.y)
    if (distance < bestDistance) {
      best = item
      bestDistance = distance
    }
  }
  return best
}

/** Bring a tray piece to `to`, for the sleeper nearest there unless one is named. */
function fromTray(summary: GardenSummary, id: PieceId, to: Point | null, sleeper?: Sleeper): Hint | null {
  const piece = summary.tray.find((p) => p.id === id)
  if (!piece || !to) return null
  return { kind: 'bringPiece', from: { x: piece.x, y: piece.y }, to, piece: id, sleeper: (sleeper ?? nearest(summary.sleepers, to)!).index }
}

/** The one next act worth demonstrating, given the table, and the sleeper it is for. */
export function chooseHint(summary: GardenSummary): Hint | null {
  if (summary.sleepers.length === 0) return null
  const firstSleeper = summary.sleepers[0]
  if (summary.lamps.length === 0) {
    const lamp = summary.tray.find((p) => p.id === 'lampA') ?? summary.tray.find((p) => p.id === 'lampB')
    return lamp ? { kind: 'bringPiece', from: { x: lamp.x, y: lamp.y }, to: summary.open, piece: lamp.id, sleeper: firstSleeper.index } : null
  }
  const moth = summary.sleepers.find((s) => s.wants === WHITE)
  if (moth) {
    const lamp = nearest(summary.lamps, moth)!
    return { kind: 'tapLamp', from: { x: lamp.x, y: lamp.y }, to: null, piece: lamp.id, sleeper: moth.index }
  }
  // Its own colour already crosses the panel somewhere: show that a sleeper can be carried into it.
  let carry: { sleeper: Sleeper; spot: Spot; distance: number } | null = null
  for (const spot of summary.spots) {
    const sleeper = summary.sleepers.find((s) => s.index === spot.index)
    if (!sleeper) continue
    const distance = Math.hypot(spot.x - sleeper.x, spot.y - sleeper.y)
    if (!carry || distance < carry.distance) carry = { sleeper, spot, distance }
  }
  if (carry) {
    const { sleeper, spot } = carry
    return { kind: 'carrySleeper', from: { x: sleeper.x, y: sleeper.y }, to: { x: spot.x, y: spot.y }, piece: null, sleeper: sleeper.index }
  }
  const wantsRed = summary.sleepers.find((s) => s.wants === RED)
  const hint =
    fromTray(summary, 'prism', summary.whiteBeam) ??
    (wantsRed ? fromTray(summary, 'filterR', summary.whiteBeam, wantsRed) : null) ??
    fromTray(summary, 'mirror1', summary.colourBeam ?? summary.whiteBeam) ??
    fromTray(summary, 'mirror2', summary.colourBeam ?? summary.whiteBeam) ??
    fromTray(summary, 'lampB', { x: (firstSleeper.x + summary.open.x) / 2, y: (firstSleeper.y + summary.open.y) / 2 }, firstSleeper)
  if (hint) return hint
  const piece = nearest(summary.lit, firstSleeper)
  if (piece) return { kind: 'tapPiece', from: { x: piece.x, y: piece.y }, to: null, piece: piece.id, sleeper: firstSleeper.index }
  const lamp = nearest(summary.lamps, firstSleeper)!
  return { kind: 'tapLamp', from: { x: lamp.x, y: lamp.y }, to: null, piece: lamp.id, sleeper: firstSleeper.index }
}

export const IDLE_BEFORE_GLOW = 3
export const IDLE_BEFORE_HINT = 5
export const DEMO_SECONDS = 3
export const MAX_DEMOS_PER_IDLE = 4
export const FIRST_PEEK_DELAY = 1.4
export const PEEK_SECONDS = 1.8
export const PEEK_EVERY = 6.5
export const MAX_PEEKS = 3

export type GuidanceTiming = {
  /** 0..1 through the current ghost-hand demonstration, or null. */
  demo: number | null
  /** 0..1 breathing glow on touchable things and sleepers' dreams. */
  glow: number
  /** 0..1 through the first-open lamp wiggle, or null. */
  peek: number | null
}

/** When to show guidance. Time is attended seconds; any touch resets the idle clock. */
export class HintScheduler {
  private idleSince: number
  private everTouched = false
  private readonly openedAt: number

  constructor(now: number) {
    this.idleSince = now
    this.openedAt = now
  }

  touch(now: number): void {
    this.idleSince = now
    this.everTouched = true
  }

  idleFor(now: number): number {
    return now - this.idleSince
  }

  /** Is `now` inside one of this idle stretch's demonstrations (5 s, then gaps of 10, 20, 40 s)? */
  private demoAt(now: number): number | null {
    let at = this.idleSince + IDLE_BEFORE_HINT
    let gap = IDLE_BEFORE_HINT * 2
    for (let i = 0; i < MAX_DEMOS_PER_IDLE; i++) {
      if (now >= at && now < at + DEMO_SECONDS) return (now - at) / DEMO_SECONDS
      at += DEMO_SECONDS + gap
      gap *= 2
    }
    return null
  }

  state(now: number, out: GuidanceTiming): GuidanceTiming {
    const idle = now - this.idleSince
    out.glow = idle < IDLE_BEFORE_GLOW ? 0 : Math.max(0, Math.min(1, (idle - IDLE_BEFORE_GLOW) / 1.5) * (0.6 + 0.4 * Math.sin(now * 2.4)))
    out.demo = this.demoAt(now)
    out.peek = null
    if (!this.everTouched) {
      const sinceOpen = now - this.openedAt - FIRST_PEEK_DELAY
      if (sinceOpen >= 0) {
        const cycle = Math.floor(sinceOpen / PEEK_EVERY)
        const within = sinceOpen - cycle * PEEK_EVERY
        if (cycle < MAX_PEEKS && within < PEEK_SECONDS) out.peek = within / PEEK_SECONDS
      }
    }
    return out
  }
}

export type HandPose = { x: number; y: number; press: number; opacity: number }

function window01(t: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/** The ghost hand over one demonstration: fade in, press, (drag), lift, fade out. Writes into `out`. */
export function handPose(hint: Hint, progress: number, out: HandPose): HandPose {
  const opacity = Math.min(window01(progress, 0, 0.1), 1 - window01(progress, 0.88, 1))
  out.opacity = opacity
  if (!hint.to) {
    const tap = (a: number, b: number) => Math.sin(window01(progress, a, b) * Math.PI)
    out.x = hint.from.x
    out.y = hint.from.y
    out.press = Math.max(tap(0.18, 0.36), tap(0.46, 0.64))
    return out
  }
  out.press = progress < 0.12 ? 0 : progress < 0.2 ? window01(progress, 0.12, 0.2) : progress < 0.74 ? 1 : 1 - window01(progress, 0.74, 0.82)
  const travel = ease(window01(progress, 0.22, 0.72))
  out.x = hint.from.x + (hint.to.x - hint.from.x) * travel
  out.y = hint.from.y + (hint.to.y - hint.from.y) * travel
  return out
}
