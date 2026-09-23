import { BAG, FEEDING, SCALE, type MatKey, type Point } from './layout'

// Wordless guidance for a four-year-old: no text, no voice, no verdicts.
// When the child has been idle for a while, a ghost hand shows one possible
// next act (tap the bag, move a stone to a pan, hand a stone to a guest), and
// whatever can be touched right now breathes gently. Any touch fades it all
// at once. Hints back off within an idle stretch and stop after a few
// demonstrations, so an idle table goes quiet instead of nagging.

export type HintKind = 'tapBag' | 'toPan' | 'dealFromBowl' | 'toGuest' | 'useKnife' | 'swapMat'

export type Hint = {
  kind: HintKind
  from: Point
  to: Point | null
  /** Stones the demonstration is about; they breathe with the hint. */
  stoneIds: number[]
}

export type TableSummary = {
  liveMat: MatKey
  bag: number
  /** Stones lying loose on the table (not on a pan, plate, or in the bowl). */
  loose: { id: number; x: number; y: number }[]
  panWeights: readonly [number, number]
  bowl: { id: number; x: number; y: number }[]
  plates: readonly number[]
  seats: readonly boolean[]
  shareComplete: boolean
  leftover: boolean
  knife: Point
  shelf: Point | null
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

const bagTap: Point = { x: BAG.x, y: BAG.y - 20 }

/** The one next act worth demonstrating, given what is on the table. */
export function chooseHint(table: TableSummary): Hint | null {
  const onTable = table.loose.length + table.bowl.length
  if (table.bag > 0 && onTable === 0 && table.panWeights[0] + table.panWeights[1] === 0 && table.plates.every((p) => p === 0)) {
    return { kind: 'tapBag', from: bagTap, to: null, stoneIds: [] }
  }
  const swap: Hint | null = table.shelf ? { kind: 'swapMat', from: table.shelf, to: null, stoneIds: [] } : null

  if (table.liveMat === 'scale') {
    const lighter = table.panWeights[0] <= table.panWeights[1] ? 0 : 1
    const pan = SCALE.pans[lighter]
    const stone = nearest(table.loose, pan)
    if (stone) return { kind: 'toPan', from: stone, to: pan, stoneIds: [stone.id] }
    if (table.bag > 0) return { kind: 'toPan', from: bagTap, to: pan, stoneIds: [] }
    return swap
  }

  const seated = table.seats.flatMap((isSeated, index) => (isSeated ? [index] : []))
  if (table.leftover && table.bowl[0]) {
    return { kind: 'useKnife', from: table.knife, to: table.bowl[0], stoneIds: [table.bowl[0].id] }
  }
  if (seated.length > 0 && table.bowl.length > 0 && !table.shareComplete) {
    const stone = table.bowl[0]
    return { kind: 'dealFromBowl', from: stone, to: null, stoneIds: [stone.id] }
  }
  if (seated.length > 0 && !table.shareComplete) {
    const emptiest = seated.reduce((best, index) => (table.plates[index] < table.plates[best] ? index : best), seated[0])
    const plate = FEEDING.seats[emptiest].plate
    const stone = nearest(table.loose, plate)
    if (stone) return { kind: 'toGuest', from: stone, to: plate, stoneIds: [stone.id] }
    if (table.bag > 0) return { kind: 'toGuest', from: bagTap, to: plate, stoneIds: [] }
  }
  return swap
}

export const IDLE_BEFORE_HINT = 5
export const IDLE_BEFORE_GLOW = 3
export const DEMO_SECONDS = 2.8
export const MAX_DEMOS_PER_IDLE = 4
export const FIRST_PEEK_DELAY = 1.2
export const PEEK_SECONDS = 1.6
export const PEEK_EVERY = 6
export const MAX_PEEKS = 3

export type GuidanceState = {
  /** 0..1 progress through the current ghost-hand demonstration, or null when none is playing. */
  demo: number | null
  /** 0..1 strength of the breathing glow on things that can be touched now. */
  glow: number
  /** 0..1 progress of the first-open bag wiggle and peeking stone, or null. */
  peek: number | null
}

/** When to show guidance. Time is in seconds of attended play; any touch resets the idle clock. */
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

  /** Start times of this idle stretch's demonstrations: 5 s idle, then 10 s, 20 s, 40 s gaps. */
  private scheduledStarts(): number[] {
    const starts: number[] = []
    let at = this.idleSince + IDLE_BEFORE_HINT
    let gap = IDLE_BEFORE_HINT * 2
    for (let i = 0; i < MAX_DEMOS_PER_IDLE; i++) {
      starts.push(at)
      at += DEMO_SECONDS + gap
      gap *= 2
    }
    return starts
  }

  state(now: number, untouchedTable: boolean): GuidanceState {
    const idle = now - this.idleSince
    const glow = idle < IDLE_BEFORE_GLOW ? 0 : Math.min(1, (idle - IDLE_BEFORE_GLOW) / 1.5) * (0.55 + 0.45 * Math.sin(now * 2.6))
    let demo: number | null = null
    for (const start of this.scheduledStarts()) {
      if (now >= start && now < start + DEMO_SECONDS) demo = (now - start) / DEMO_SECONDS
    }
    let peek: number | null = null
    if (!this.everTouched && untouchedTable) {
      const sinceOpen = now - this.openedAt - FIRST_PEEK_DELAY
      if (sinceOpen >= 0) {
        const cycle = Math.floor(sinceOpen / PEEK_EVERY)
        const within = sinceOpen - cycle * PEEK_EVERY
        if (cycle < MAX_PEEKS && within < PEEK_SECONDS) peek = within / PEEK_SECONDS
      }
    }
    return { demo, glow: Math.max(0, glow), peek }
  }
}

export type HandPose = { at: Point; press: number; opacity: number }

function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
}

function window01(t: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}

/** The ghost hand over one demonstration: fade in, press, (drag), lift, fade out. */
export function handPose(hint: Hint, progress: number): HandPose {
  const fadeIn = window01(progress, 0, 0.12)
  const fadeOut = 1 - window01(progress, 0.86, 1)
  const opacity = Math.min(fadeIn, fadeOut)
  if (!hint.to) {
    const tap = (a: number, b: number) => Math.sin(window01(progress, a, b) * Math.PI)
    return { at: hint.from, press: Math.max(tap(0.2, 0.42), tap(0.5, 0.72)), opacity }
  }
  const press = progress < 0.14 ? 0 : progress < 0.22 ? window01(progress, 0.14, 0.22) : progress < 0.72 ? 1 : 1 - window01(progress, 0.72, 0.8)
  const travel = ease(window01(progress, 0.24, 0.7))
  return {
    at: { x: hint.from.x + (hint.to.x - hint.from.x) * travel, y: hint.from.y + (hint.to.y - hint.from.y) * travel },
    press,
    opacity,
  }
}

/** Guests lean toward the bowl and reach out only while the child is idle and there is something to share. */
export function guestsShouldReach(table: TableSummary, glow: number): boolean {
  if (table.liveMat !== 'feeding' || glow <= 0 || table.shareComplete) return false
  return table.bowl.length > 0 || table.loose.length > 0 || table.bag > 0
}
