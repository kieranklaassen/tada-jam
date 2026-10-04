import { type Box } from './stage'

// The clockwork mouse: a tin toy that has been waiting on the bench for a new
// wheel for longer than anyone remembers. With one good wheel it only turns
// left, so it goes round and round on the bare mat, running down, for as long
// as nothing lies there. When a board comes down it shoots out of the way,
// into the matchbox it lives in, and it comes out again when the mat is
// clear. A tap winds it up.
//
// It is scenery that answers a touch: it has nothing to do with any mend, it
// is counted nowhere, and nothing about it is saved. Numbers only; the view
// draws from them.

type P = { x: number; y: number }

/** The matchbox it lives in, at the edge of the old hand's corner, and the mouth of it. */
export const GARAGE: Box = { x: 58, y: 598, w: 70, h: 36 }
export const GARAGE_MOUTH: P = { x: GARAGE.x + GARAGE.w - 8, y: GARAGE.y + GARAGE.h / 2 }
/** The middle of the bare mat, where it runs when nothing lies there. */
const RUN = { x: 590, y: 450, wide: 150, tall: 62 } as const
/** How long it takes to get out of the way, to come out, and to wait before it dares. */
const DASH = 0.34, OUT = 1.5, DARES = 1.3

export class Mouse {
  at: P = { ...GARAGE_MOUTH }
  /** The way it faces, in radians: 0 is to the right. */
  heading = 0
  /** How tightly its spring is wound, 0 to 1. It runs down, but never quite stops. */
  wound = 0.55
  /** How far its key has turned, in radians. */
  key = 0
  /** A hop, when it is wound: it rears up and comes down. 0 at rest. */
  hop = 0
  where: 'home' | 'out' | 'running' | 'dash' = 'home'
  private seconds = 0
  private phase = 0.6
  private since = 0
  private from: P = { ...GARAGE_MOUTH }
  private hopV = 0

  /** Where it is on its round at the moment, and which way it faces there. */
  private round(): { at: P; heading: number } {
    const t = this.seconds
    const cx = RUN.x + RUN.wide * Math.sin(t * 0.071), cy = RUN.y + RUN.tall * Math.sin(t * 0.113 + 1)
    const r = 78 + 26 * Math.sin(t * 0.19 + 2)
    // It only turns left: the round is always the same way about.
    return { at: { x: cx + Math.cos(-this.phase) * r, y: cy + Math.sin(-this.phase) * r * 0.8 }, heading: -this.phase - Math.PI / 2 }
  }

  /** `clear`: nothing lies on the mat where it runs. */
  step(dt: number, clear: boolean): void {
    this.seconds += dt
    this.since += dt
    this.wound = Math.max(0.22, this.wound - dt * 0.07 * this.wound)
    const speed = 26 + 150 * this.wound * this.wound
    this.hopV += (-this.hop * 220 - this.hopV * 9) * Math.min(dt, 0.03)
    this.hop += this.hopV * Math.min(dt, 0.03)
    if (this.where === 'running') {
      if (!clear) { this.where = 'dash'; this.since = 0; this.from = { ...this.at }; return }
      this.phase += (speed / 80) * dt
      const now = this.round()
      this.at = now.at
      this.heading = now.heading
      this.key += dt * speed * 0.11
    } else if (this.where === 'dash') {
      // Out of the way, in a straight line, faster than it has ever gone.
      const t = Math.min(1, this.since / DASH)
      this.at = { x: this.from.x + (GARAGE_MOUTH.x - this.from.x) * t, y: this.from.y + (GARAGE_MOUTH.y - this.from.y) * t }
      this.heading = Math.atan2(GARAGE_MOUTH.y - this.from.y, GARAGE_MOUTH.x - this.from.x)
      this.key += dt * 40
      if (t >= 1) { this.where = 'home'; this.since = 0; this.heading = 0 }
    } else if (this.where === 'home') {
      this.at = { ...GARAGE_MOUTH }
      this.heading = 0
      this.key += dt * 0.6
      if (!clear) this.since = 0
      else if (this.since >= DARES) { this.where = 'out'; this.since = 0 }
    } else {
      if (!clear) { this.where = 'dash'; this.since = 0; this.from = { ...this.at }; return }
      // Out of the box and onto its round, easing in.
      const t = Math.min(1, this.since / OUT), ease = t * t * (3 - 2 * t), to = this.round()
      this.at = { x: GARAGE_MOUTH.x + (to.at.x - GARAGE_MOUTH.x) * ease, y: GARAGE_MOUTH.y + (to.at.y - GARAGE_MOUTH.y) * ease }
      this.heading = Math.atan2(to.at.y - GARAGE_MOUTH.y, to.at.x - GARAGE_MOUTH.x) * (1 - ease) + to.heading * ease
      this.key += dt * speed * 0.11
      if (t >= 1) this.where = 'running'
    }
  }

  /** Whether a finger at `at` is on it: on the mouse where it runs, or on its box while it is in. */
  hit(at: P): boolean {
    if (this.where === 'home') return at.x >= GARAGE.x && at.x <= GARAGE.x + GARAGE.w + 22 && at.y >= GARAGE.y - 4 && at.y <= GARAGE.y + GARAGE.h + 4
    return Math.hypot(at.x - this.at.x, at.y - this.at.y) <= 44
  }

  /** Wound up: it rears, and is off at full speed. */
  wind(): void {
    this.wound = 1
    this.hopV += 7
  }
}
