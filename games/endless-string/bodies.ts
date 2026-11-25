import type { Kind, Motion } from './kinds'
import { NATURE } from './kinds'
import { PIVOT, type Hook, type HostId } from './layout'
import type { Point } from './input'

// How the four hosts move. A pose is numbers; the view draws with it and the
// string hangs by it, so what is drawn and what is caught are the same place.

/** Seconds a host takes over a thing it does. */
export const ACT_SECONDS = 1.5

export type Pose = {
  dx: number; dy: number; rot: number; sx: number; sy: number
  /** How far the parts at its sides are thrown open, 0 to 1. */
  open: number
  tongue: number
  /** 0 awake to 1 asleep. */
  doze: number
  /** How full of breath it is. */
  puff: number
}

/** Nobody shares a tempo: the moose is slow and heavy, the house stiff, the tree whippy, the dog quick. */
const NATURES: Readonly<Record<HostId, { tempo: number; hop: number; sway: number; squash: number; breath: number; idle: number }>> = {
  moose: { tempo: 1, hop: 20, sway: 0.05, squash: 0.06, breath: 0.012, idle: 1.5 },
  house: { tempo: 0.8, hop: 30, sway: 0.04, squash: 0.1, breath: 0, idle: 0 },
  tree: { tempo: 1.3, hop: 38, sway: 0.13, squash: 0.08, breath: 0.006, idle: 0.7 },
  dog: { tempo: 2.1, hop: 26, sway: 0.16, squash: 0.14, breath: 0.03, idle: 4.2 },
}

const bump = (t: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)))

export class Body {
  kind: Kind | null = null
  colour = 'yellow'
  t = 0
  tickled = 9
  dip = 9
  clock = 0
  readonly pose: Pose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, open: 0, tongue: 0, doze: 0, puff: 0 }
  constructor(readonly id: HostId) {}

  act(kind: Kind, colour: string): void { this.kind = kind; this.colour = colour; this.t = 0 }
  /** It is asleep, as the world is when the switch is up, or not. */
  step(dt: number, alive: boolean): void {
    this.clock += dt
    this.t += dt; this.tickled += dt; this.dip += dt
    if (this.kind && this.t >= ACT_SECONDS) this.kind = null
    const n = NATURES[this.id], p = this.pose, w = this.clock * n.idle
    p.dx = 0; p.dy = 0; p.rot = 0; p.sx = 1 - Math.sin(w) * n.breath * 0.5; p.sy = 1 + Math.sin(w) * n.breath
    p.open = 0; p.tongue = 0; p.doze = 0; p.puff = 0
    if (this.kind && alive) this.perform(NATURE[this.kind].motion)
    if (this.tickled < 0.7) {
      const u = this.tickled, f = Math.exp(-u * 5) * Math.sin(u * 20 * n.tempo)
      p.rot += f * n.sway * 0.45; p.sy *= 1 + f * n.squash * 0.5
    }
    if (this.dip < 0.6) p.sy *= 1 - Math.exp(-this.dip * 6) * Math.cos(this.dip * 14) * n.squash * 0.7
  }

  private perform(motion: Motion): void {
    const n = NATURES[this.id], p = this.pose, u = this.t / ACT_SECONDS, t = this.t * n.tempo, env = bump(u)
    switch (motion) {
      case 'glow': p.sy *= 1 + 0.35 * n.squash * env; break
      case 'stamp': { const h = Math.abs(Math.sin(t * 7)) * env; p.dy = -n.hop * h; p.sy *= 1 + n.squash * (h - 0.5) * env; break }
      case 'dance': p.rot = Math.sin(t * 8) * n.sway * env; p.dx = Math.sin(t * 8) * n.sway * 160 * env; break
      case 'lick': p.tongue = env; p.sx *= 1 + 0.5 * n.squash * env; break
      case 'blow': p.puff = env; p.sy *= 1 + n.squash * 0.8 * Math.max(0, bump(u * 2)) - n.squash * 0.6 * Math.max(0, bump(u * 2 - 1)); break
      case 'doze': p.doze = env; p.rot = n.sway * 0.8 * env; p.sy *= 1 - n.squash * 0.7 * env; break
      case 'gulp': p.puff = Math.abs(Math.sin(t * 6)) * env; p.sx *= 1 + n.squash * p.puff * 0.7; break
      case 'toot': { const k = Math.max(0, Math.sin(t * 9)) * env; p.puff = k; p.sx *= 1 - n.squash * 0.6 * k; p.sy *= 1 + n.squash * k; break }
      case 'strain': { const push = bump(u * 1.6); p.sx *= 1 + n.squash * push + Math.sin(t * 40) * 0.008 * push; p.sy *= 1 - n.squash * 0.8 * push; p.puff = push; if (u > 0.62) p.dy = -n.hop * 0.8 * bump((u - 0.62) / 0.38); break }
      case 'open': p.open = Math.min(1, env * 1.4) * (0.75 + 0.25 * Math.cos(t * 12)); p.dy = -n.hop * 0.4 * env; break
      case 'wobble': { const s = Math.sin(t * 17) * env; p.sx *= 1 + n.squash * 1.3 * s; p.sy *= 1 - n.squash * 1.3 * s; p.rot = n.sway * 0.4 * Math.sin(t * 11) * env; break }
    }
  }

  /** Where a point of this host is, in its pose. */
  place(x: number, y: number, side: number, out: Point): Point {
    const p = this.pose, o = PIVOT[this.id], spread = OPENING[this.id] * p.open * side
    const lx = (x + spread - o.x) * p.sx, ly = (y - o.y - Math.abs(spread) * 0.2) * p.sy, c = Math.cos(p.rot), s = Math.sin(p.rot)
    out.x = o.x + p.dx + lx * c - ly * s
    out.y = o.y + p.dy + lx * s + ly * c
    return out
  }
  hook(hook: Hook, out: Point): Point { return this.place(hook.x, hook.y - (hook.lift ?? 0) * this.pose.open, hook.side, out) }
}
/** How far the sides of each go when it opens. */
export const OPENING: Readonly<Record<HostId, number>> = { moose: 40, house: 24, tree: 56, dog: 30 }
