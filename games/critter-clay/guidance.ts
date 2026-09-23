import type { Point } from './layout'
import { familyCount, hasKind, type Part, type PartKind } from './parts'

// Wordless guidance for a four-year-old: no text, no voice, no verdicts.
// When the child stops, what can be touched starts to glow, then a ghost
// hand shows one next act chosen from the bench: press a part onto the
// sleepy lump, tap its nose once it has a couple of parts, or carry a
// critter back to the empty turntable. Demonstrations back off and stop
// after four, so an idle bench goes quiet instead of nagging, and any touch
// clears everything at once.

export type Hint =
  | { kind: 'givePart'; part: PartKind }
  | { kind: 'tapNose' }
  | { kind: 'carryToTurntable'; critterId: number }

export type WorkshopSummary = {
  sleeper: { parts: readonly Part[] } | null
  awake: readonly { id: number; x: number; z: number }[]
  childAge: number | null
}

/** Parts a sleeper needs before the demonstration moves on to its nose. */
export const PARTS_BEFORE_NOSE = 2

/** Which part to demonstrate: legs first (they change the most), then eyes; older children are shown a head or a tail, which suggest designing. */
export function partToShow(parts: readonly Part[], childAge: number | null): PartKind {
  const older = childAge !== null && childAge >= 6
  if (familyCount(parts, 'legs') === 0) return older ? 'legLong' : 'legStub'
  if (familyCount(parts, 'eyes') === 0) return 'eye'
  if (older && !hasKind(parts, 'head')) return 'head'
  if (familyCount(parts, 'tail') === 0) return 'tailCurl'
  if (familyCount(parts, 'ears') === 0) return 'earRound'
  return familyCount(parts, 'legs') < 6 ? 'legStub' : 'eye'
}

/** The one next act worth demonstrating, given what is on the bench. */
export function chooseHint(summary: WorkshopSummary, turntable: Point): Hint | null {
  const { sleeper } = summary
  if (sleeper) {
    if (sleeper.parts.length < PARTS_BEFORE_NOSE) return { kind: 'givePart', part: partToShow(sleeper.parts, summary.childAge) }
    return { kind: 'tapNose' }
  }
  let best: { id: number; d: number } | null = null
  for (const critter of summary.awake) {
    const d = Math.hypot(critter.x - turntable.x, critter.z - turntable.z)
    if (!best || d < best.d) best = { id: critter.id, d }
  }
  return best ? { kind: 'carryToTurntable', critterId: best.id } : null
}

/** Friends turn to watch and bounce while the child is idle and the sleeper is ready to wake. */
export function friendsCheer(summary: WorkshopSummary, glow: number): boolean {
  return glow > 0 && summary.sleeper !== null && summary.sleeper.parts.length >= PARTS_BEFORE_NOSE && summary.awake.length > 0
}

export const IDLE_BEFORE_GLOW = 3
export const IDLE_BEFORE_DEMO = 5
export const DEMO_SECONDS = 3.2
export const MAX_DEMOS_PER_IDLE = 4
export const FIRST_INVITE_DELAY = 1.2
export const INVITE_SECONDS = 1.1
export const INVITE_EVERY = 6
export const MAX_INVITES = 3

export type GuidanceTiming = {
  /** 0..1 progress through the current demonstration, or null. */
  demo: number | null
  /** 0..1 breathing strength of the glow on what can be touched now. */
  glow: number
  /** 0..1 progress of the first-open invitation (a tray leg hops), or null. */
  invite: number | null
}

/** When to show guidance. Time is attended play in seconds; any touch resets the idle clock. */
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

  get touched(): boolean {
    return this.everTouched
  }

  /** Start of the demonstration playing at `now` in this idle stretch (5 s idle, then gaps of 10, 20, 40 s), or null. */
  private demoStart(now: number): number | null {
    let at = this.idleSince + IDLE_BEFORE_DEMO
    let gap = IDLE_BEFORE_DEMO * 2
    for (let i = 0; i < MAX_DEMOS_PER_IDLE; i++) {
      if (now >= at && now < at + DEMO_SECONDS) return at
      at += DEMO_SECONDS + gap
      gap *= 2
    }
    return null
  }

  timing(now: number, out: GuidanceTiming): GuidanceTiming {
    const idle = now - this.idleSince
    out.glow = idle < IDLE_BEFORE_GLOW ? 0 : Math.min(1, (idle - IDLE_BEFORE_GLOW) / 1.4) * (0.6 + 0.4 * Math.sin(now * 2.8))
    const start = this.demoStart(now)
    out.demo = start === null ? null : (now - start) / DEMO_SECONDS
    out.invite = null
    if (!this.everTouched) {
      const since = now - this.openedAt - FIRST_INVITE_DELAY
      if (since >= 0) {
        const cycle = Math.floor(since / INVITE_EVERY)
        const within = since - cycle * INVITE_EVERY
        if (cycle < MAX_INVITES && within < INVITE_SECONDS) out.invite = within / INVITE_SECONDS
      }
    }
    return out
  }
}

export type HandPose = {
  x: number
  z: number
  height: number
  press: number
  opacity: number
  carry: boolean
  /** 0..1 after the hand lets go of what it carried: the part settles into place while the hand lifts clear. */
  release: number
}

function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
}

function window01(t: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}

/** The ghost hand through one demonstration: fade in, press, drag from `from` to `to` (or tap twice when `to` is null), let go and lift clear, fade out. */
export function handPose(from: Point, to: Point | null, progress: number, out: HandPose): HandPose {
  out.opacity = Math.min(window01(progress, 0, 0.1), 1 - window01(progress, 0.88, 1))
  if (!to) {
    out.x = from.x
    out.z = from.z
    out.press = Math.max(Math.sin(window01(progress, 0.22, 0.4) * Math.PI), Math.sin(window01(progress, 0.5, 0.68) * Math.PI))
    out.height = (1 - out.press) * 4
    out.carry = false
    out.release = 0
    return out
  }
  out.press = progress < 0.14 ? 0 : progress < 0.22 ? window01(progress, 0.14, 0.22) : progress < 0.76 ? 1 : 1 - window01(progress, 0.76, 0.84)
  const travel = ease(window01(progress, 0.24, 0.72))
  out.x = from.x + (to.x - from.x) * travel
  out.z = from.z + (to.z - from.z) * travel
  out.carry = progress >= 0.18 && progress < 0.78
  out.release = ease(window01(progress, 0.78, 0.9))
  // once it lets go the hand rises well clear, so the last picture is the part on the lump, not a finger on it
  out.height = (1 - out.press) * 4 + Math.sin(travel * Math.PI) * 5 + out.release * 5
  return out
}
