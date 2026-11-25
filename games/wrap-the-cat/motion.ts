import type { FixedId, Id } from './layout'

// How each thing moves when it is touched, wrapped and ripped. Nobody shares a
// curve: each has its own tempo, weight and funniest part.

export type Pose = { dx: number; dy: number; rot: number; sx: number; sy: number; skew: number }
export const still = (): Pose => ({ dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, skew: 0 })

/** A push that rings down. */
export const ringing = (t: number, rate: number, fall: number): number => (t < 0 || t > 3 ? 0 : Math.exp(-t * fall) * Math.sin(t * rate))
const hump = (t: number, a: number, b: number): number => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI))

/** Seconds since each thing happened to it; large when long ago. */
export type Since = { lay: number; bow: number; tear: number; burst: number; poke: number }

type Moves = {
  idle(p: Pose, time: number): void
  lay(p: Pose, t: number): void
  /** The bow goes on; a tear gets the same, smaller. `k` is how much of it. */
  bow(p: Pose, t: number, k: number): void
  burst(p: Pose, t: number): void
}

export const MOVES: Record<FixedId | 'air', Moves> = {
  bike: {
    idle: (p, t) => { p.rot += Math.sin(t * 0.8) * 0.004 },
    lay: (p, t) => { p.dy -= Math.abs(ringing(t, 30, 9)) * 9 },
    bow: (p, t, k) => { p.dy -= (hump(t, 0.15, 0.5) * 34 + hump(t, 0.55, 0.8) * 16) * k; p.rot += (hump(t, 0.15, 0.5) * -0.07 + hump(t, 0.55, 0.8) * 0.05) * k },
    burst: (p, t) => { p.rot += ringing(t, 17, 3.2) * 0.07; p.dy -= hump(t, 0, 0.25) * 20 },
  },
  cat: {
    idle: (p, t) => { p.sy += Math.sin(t * 2.1) * 0.012 },
    lay: (p, t) => { p.sy -= Math.exp(-t * 7) * 0.12; p.sx += Math.exp(-t * 7) * 0.07 },
    bow: (p, t, k) => { p.sx -= hump(t, 0, 0.35) * 0.1 * k; p.sy += hump(t, 0, 0.35) * 0.12 * k; p.rot += ringing(t - 0.2, 26, 6) * 0.06 * k },
    burst: (p, t) => { p.dy -= hump(t, 0, 0.55) * 120; p.sx += hump(t, 0, 0.9) * 0.2; p.sy += hump(t, 0, 0.9) * 0.14; p.rot += Math.sin(t * 40) * hump(t, 0, 0.6) * 0.05 },
  },
  grandpa: {
    idle: (p, t) => { const s = Math.sin(t * 1.35); p.sy += s * 0.018; p.sx -= s * 0.006 },
    lay: (p, t) => { p.rot += ringing(t, 12, 5) * 0.02 },
    bow: (p, t, k) => { const fill = Math.min(1, Math.max(0, (t - 0.3) / 1.2)) * (t < 1.5 ? 1 : 0); p.sx += fill * fill * 0.2 * k; p.sy += fill * fill * 0.1 * k; if (t >= 1.5) { p.sx += ringing(t - 1.5, 30, 5) * -0.12 * k; p.sy += ringing(t - 1.5, 30, 5) * 0.06 * k } },
    burst: (p, t) => { p.rot += (hump(t, 0, 0.5) * -0.07 + hump(t, 0.5, 0.75) * 0.11); p.sy += hump(t, 0, 0.5) * 0.06 - hump(t, 0.5, 0.75) * 0.1 },
  },
  giraffe: {
    idle: (p, t) => { p.skew += Math.sin(t * 0.9) * 0.016 },
    lay: (p, t) => { p.skew += ringing(t, 9, 3) * 0.05 },
    bow: (p, t, k) => { p.skew += ringing(t, 7.5, 1.3) * 0.24 * k; p.sy += ringing(t, 15, 1.8) * 0.02 * k },
    burst: (p, t) => { p.sy += ringing(t, 20, 3) * 0.13; p.skew += ringing(t, 13, 2.2) * -0.14 },
  },
  tuba: {
    idle: (p, t) => { p.rot += Math.sin(t * 0.6 + 1) * 0.008 },
    lay: (p, t) => { p.sx += ringing(t, 22, 6) * 0.07 },
    bow: (p, t, k) => { for (const at of [0.25, 0.7]) { p.sx += hump(t, at, at + 0.32) * 0.16 * k; p.sy -= hump(t, at, at + 0.32) * 0.05 * k } },
    burst: (p, t) => { p.sy += hump(t, 0, 0.4) * 0.2; p.sx -= hump(t, 0, 0.4) * 0.08; p.rot += ringing(t - 0.1, 10, 3) * 0.08 },
  },
  tree: {
    idle: (p, t) => { p.skew += Math.sin(t * 0.7 + 2) * 0.01 },
    lay: (p, t) => { p.skew += ringing(t, 18, 5) * 0.03 },
    bow: (p, t, k) => { p.skew += Math.sin(t * 34) * hump(t, 0.2, 1.1) * 0.06 * k; p.sx -= hump(t, 0, 0.3) * 0.1 * k },
    burst: (p, t) => { p.sx += ringing(t, 16, 3) * 0.22; p.sy += ringing(t - 0.06, 16, 3) * 0.1 },
  },
  air: {
    idle: (p, t) => { p.rot += Math.sin(t * 1.1) * 0.03 },
    lay: (p, t) => { p.sx += ringing(t, 24, 8) * 0.05 },
    bow: (p, t, k) => { p.rot += ringing(t, 6, 1.8) * 0.3 * k; p.dx += ringing(t, 6, 1.8) * 16 * k },
    burst: (p, t) => { p.sx -= Math.exp(-t * 5) * 0.5 },
  },
}

export const movesOf = (id: Id): Moves => MOVES[id === 'air0' || id === 'air1' ? 'air' : id]

export function poseOf(id: Id, s: Since, time: number, out: Pose): Pose {
  Object.assign(out, still())
  const m = movesOf(id)
  m.idle(out, time)
  if (s.lay < 1) m.lay(out, s.lay)
  if (s.bow < 4) m.bow(out, s.bow, 1)
  if (s.tear < 2.5) m.bow(out, s.tear, 0.4)
  if (s.burst < 2.5) m.burst(out, s.burst)
  if (s.poke < 0.5) { out.sy -= Math.exp(-s.poke * 11) * 0.06; out.sx += Math.exp(-s.poke * 11) * 0.04 }
  // Paper pulls tight as the bow goes on.
  if (s.bow < 0.5) { const k = ringing(s.bow, 26, 7); out.sx += 0.06 * k; out.sy += 0.06 * k }
  return out
}
