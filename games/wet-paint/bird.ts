import { SILL } from './layout'
import { below, type Rng } from './rng'

// The bird on the window sill. It has nothing to do with the tray: it hops,
// pecks and looks about in quick, clipped moves, and is there so that
// something is alive that wants nothing. Tapped, it flutters up and lands
// somewhere else on the sill. Numbers on the seconds `step` is given.

export type BirdPose = {
  /** Where it stands on the sill, and how far it is off it (0 standing, below 0 in the air). */
  x: number
  lift: number
  /** 1 facing right, -1 facing left. */
  facing: number
  /** 0 to 1: the head down at the sill. */
  peck: number
  /** -1 to 1 while it flutters, 0 with its wings shut. */
  flap: number
}

type Act = { kind: 'stand' | 'hop' | 'peck' | 'flutter'; since: number; from: number; to: number }

const HOP_SECONDS = 0.24
const PECK_SECONDS = 0.6
const FLUTTER_SECONDS = 0.9

export class Bird {
  readonly pose: BirdPose
  private time = 0
  private readonly rng: Rng
  private act: Act
  private next: number

  constructor(rng: Rng) {
    this.rng = rng
    const x = SILL.from + (SILL.to - SILL.from) * (0.3 + 0.4 * rng.next())
    this.pose = { x, lift: 0, facing: -1, peck: 0, flap: 0 }
    this.act = { kind: 'stand', since: 0, from: x, to: x }
    this.next = 1 + rng.next() * 2
  }

  /** Tapped: up it goes, and down somewhere else. */
  startle(): void {
    const span = SILL.to - SILL.from
    // Somewhere on the sill at least a third of it away, so the landing is seen.
    const to = SILL.from + ((this.pose.x - SILL.from + span * (0.35 + 0.3 * this.rng.next())) % span)
    this.act = { kind: 'flutter', since: this.time, from: this.pose.x, to }
    this.pose.facing = to > this.pose.x ? 1 : -1
  }

  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    const pose = this.pose, act = this.act, t = this.time - act.since
    pose.peck = 0
    pose.flap = 0
    pose.lift = 0
    if (act.kind === 'hop') {
      const p = Math.min(1, t / HOP_SECONDS)
      pose.x = act.from + (act.to - act.from) * p
      pose.lift = -Math.sin(p * Math.PI) * 14
      if (p >= 1) this.rest()
    } else if (act.kind === 'peck') {
      // Two quick pecks, each a jab down and back.
      const p = Math.min(1, t / PECK_SECONDS)
      pose.peck = Math.abs(Math.sin(p * Math.PI * 2))
      if (p >= 1) this.rest()
    } else if (act.kind === 'flutter') {
      const p = Math.min(1, t / FLUTTER_SECONDS)
      pose.x = act.from + (act.to - act.from) * p * p * (3 - 2 * p)
      pose.lift = -Math.sin(p * Math.PI) * 46
      pose.flap = Math.sin(this.time * 44)
      if (p >= 1) this.rest()
    } else if (this.time >= this.next) {
      const pick = below(this.rng, 5)
      if (pick <= 2) {
        const far = (22 + this.rng.next() * 46) * (below(this.rng, 2) === 0 ? 1 : -1)
        const to = Math.min(SILL.to, Math.max(SILL.from, pose.x + far))
        pose.facing = to >= pose.x ? 1 : -1
        this.act = { kind: 'hop', since: this.time, from: pose.x, to }
      } else if (pick === 3) this.act = { kind: 'peck', since: this.time, from: pose.x, to: pose.x }
      else {
        pose.facing = -pose.facing
        this.rest()
      }
    }
  }

  private rest(): void {
    this.act = { kind: 'stand', since: this.time, from: this.pose.x, to: this.pose.x }
    this.next = this.time + 0.7 + this.rng.next() * 2.6
  }
}
