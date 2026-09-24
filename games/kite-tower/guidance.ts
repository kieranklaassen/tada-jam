import type { Vec2 } from './pieces'

// Wordless help for a five-year-old (R8): no text, no voice, no verdicts.
// When the child stops, whatever can be touched starts to glow; a little
// later a ghost hand carries one piece to the place it would help most, a
// move and never the answer. Demonstrations back off and stop after four, so
// an idle playroom goes quiet instead of nagging. Any touch clears it all.

export type Hint =
  | { kind: 'fromTray'; id: number; to: Vec2 }
  | { kind: 'loose'; id: number; from: Vec2; to: Vec2 }

export type PlayroomSummary = {
  flying: boolean
  /** Pieces still in the tray, in tray order. */
  tray: readonly { id: number; cube: boolean }[]
  /** Pieces on the build plane that are not part of what the doll stands on. */
  loose: readonly { id: number; x: number; y: number }[]
  /** Where one more piece would help the doll most (the top of the best spot under the kite). */
  buildAt: Vec2
  /** The piece that helps at `buildAt` (from the tray, or one left over from an earlier build), when the usual pick (the first cube, else the first piece) would not. */
  buildWith?: number
}

/** The one move worth showing now, chosen from the state. */
export function chooseHint(room: PlayroomSummary): Hint | null {
  if (room.flying) return null
  const chosen = room.tray.find((p) => p.id === room.buildWith)
  if (chosen) return { kind: 'fromTray', id: chosen.id, to: room.buildAt }
  const leftover = room.loose.find((p) => p.id === room.buildWith)
  if (leftover) return { kind: 'loose', id: leftover.id, from: { x: leftover.x, y: leftover.y }, to: room.buildAt }
  const fromTray = room.tray.find((p) => p.cube) ?? room.tray[0]
  if (fromTray) return { kind: 'fromTray', id: fromTray.id, to: room.buildAt }
  let far: PlayroomSummary['loose'][number] | null = null
  for (const piece of room.loose) {
    if (Math.abs(piece.x - room.buildAt.x) < 1.2) continue
    if (!far || Math.abs(piece.x - room.buildAt.x) > Math.abs(far.x - room.buildAt.x)) far = piece
  }
  return far ? { kind: 'loose', id: far.id, from: { x: far.x, y: far.y }, to: room.buildAt } : null
}

export const GLOW_AFTER = 3
export const DEMO_AFTER = 5
export const DEMO_SECONDS = 3.2
export const MAX_DEMOS = 4
export const PEEK_AFTER = 1.2
export const PEEK_SECONDS = 1.4
export const PEEK_EVERY = 6
export const MAX_PEEKS = 3

export type Guidance = {
  /** 0..1 strength of the breathing glow on what can be touched now. */
  glow: number
  /** 0..1 through the current demonstration, or null. */
  demo: number | null
  /** 0..1 through a first-open wiggle of the first tray piece, or null. */
  peek: number | null
}

export class HintClock {
  private idleSince: number
  private touched = false
  private readonly opened: number
  private readonly current: Guidance = { glow: 0, demo: null, peek: null }

  constructor(now: number) {
    this.idleSince = now
    this.opened = now
  }

  touch(now: number): void {
    this.idleSince = now
    this.touched = true
  }

  /** Idle time right now; a flight or a climb in progress counts as the world acting, not the child idling. */
  idle(now: number): number {
    return now - this.idleSince
  }

  /** Something big is happening on its own (the kite flies): restart the idle stretch without counting it as a touch. */
  restart(now: number): void {
    this.idleSince = now
  }

  /** The guidance right now; the returned object is reused, so read it before the next call. */
  state(now: number): Guidance {
    const idle = now - this.idleSince
    const glow = idle < GLOW_AFTER ? 0 : Math.min(1, (idle - GLOW_AFTER) / 1.2) * (0.6 + 0.4 * Math.sin(now * 2.4))
    let demo: number | null = null
    let start = this.idleSince + DEMO_AFTER
    let gap = DEMO_AFTER * 2
    for (let i = 0; i < MAX_DEMOS; i++) {
      if (now >= start && now < start + DEMO_SECONDS) demo = (now - start) / DEMO_SECONDS
      start += DEMO_SECONDS + gap
      gap *= 2
    }
    let peek: number | null = null
    if (!this.touched) {
      const since = now - this.opened - PEEK_AFTER
      const round = Math.floor(since / PEEK_EVERY)
      const within = since - round * PEEK_EVERY
      if (since >= 0 && round < MAX_PEEKS && within < PEEK_SECONDS) peek = within / PEEK_SECONDS
    }
    const out = this.current
    out.glow = Math.max(0, glow)
    out.demo = demo
    out.peek = peek
    return out
  }
}

export type HandPose = { at: Vec2; press: number; opacity: number; carry: number }

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

function ease(t: number): number {
  const k = clamp01(t)
  return k * k * (3 - 2 * k)
}

/** How far the ghost hand has carried its piece through a demonstration: 0 still at the piece, 1 at the spot. */
export function handTravel(progress: number): number {
  return ease((progress - 0.22) / 0.46)
}

/**
 * The ghost hand over one demonstration: it fades in on the piece, presses,
 * lifts it in an arc to the target, lets go, and fades out. `from` and `to`
 * are screen points, so the arc reads the same wherever the piece starts.
 */
export function handPose(from: Vec2, to: Vec2, progress: number, out: HandPose = { at: { x: 0, y: 0 }, press: 0, opacity: 0, carry: 0 }): HandPose {
  const travel = handTravel(progress)
  const lift = Math.sin(travel * Math.PI) * Math.min(160, Math.abs(to.x - from.x) * 0.35 + 60)
  out.opacity = Math.min(clamp01(progress / 0.1), clamp01((1 - progress) / 0.12))
  out.press = progress < 0.12 ? 0 : progress < 0.2 ? (progress - 0.12) / 0.08 : progress < 0.74 ? 1 : 1 - clamp01((progress - 0.74) / 0.08)
  out.at.x = from.x + (to.x - from.x) * travel
  out.at.y = from.y + (to.y - from.y) * travel - lift
  out.carry = progress > 0.18 && progress < 0.76 ? 1 : 0
  return out
}
