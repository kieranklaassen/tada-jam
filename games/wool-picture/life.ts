import type { Kind } from './wool'

// How each kind of shape moves once it lives, as plain numbers for the view.
// No two kinds share a motion: each has its own channels, tempo and weight.
// Wool is fleece on felt, so every motion comes back to where the shape was
// laid and nothing wanders off the sheet; but each is large enough to be seen
// at arm's length (`travelOf`, and a test holds a floor for every kind). Time is the toy's own
// clock, passed in.

export type Motion = {
  /** A slide, in stage units. */
  dx: number
  dy: number
  /** A stretch about the pivot. */
  sx: number
  sy: number
  /** A lean: how far the top slides sideways for each unit of height. */
  skew: number
  /** A turn about the pivot, in radians. */
  rot: number
  /** The pivot, as a share of the shape's box: 0.5, 1 is the middle of its foot. */
  px: number
  py: number
  /** For a shape that runs: 0 to 1 through one pass of its second copy, or -1 for none. */
  flow: number
  /** How far the second copy slides in one pass, in stage units. */
  flowBy: number
}

export function still(): Motion {
  return { dx: 0, dy: 0, sx: 1, sy: 1, skew: 0, rot: 0, px: 0.5, py: 0.5, flow: -1, flowBy: 0 }
}

const TAU = Math.PI * 2
/** How a veil changes the pace of the thing under it, by the veil's dye: overgrown at half its pace, hazed slow, wet as it was, lit quicker, weathered heavy. */
export const PACE: readonly number[] = [0.5, 0.4, 1, 1.7, 0.75]
const wave = (t: number, period: number, shift = 0): number => Math.sin((t / period + shift) * TAU)
/** 0 to 1 and back within the first `share` of each period, and 0 for the rest: a burst with rests between. */
const burst = (t: number, period: number, share: number): number => {
  const u = (((t / period) % 1) + 1) % 1
  return u < share ? Math.sin((u / share) * Math.PI) : 0
}

/**
 * The motion of a living shape of this kind at time `t`. `seed` sets each shape off at its own moment, so two
 * hills do not breathe together. `calm` is 0 while the shape moves freely and 1 while a finger lays wool into
 * it, when it lies still under the hand. `veil` is the dye of the veil that lies over it, or -1: a veil changes
 * its pace, and a weathered thing droops.
 */
export function motionOf(kind: Kind, t: number, seed: number, calm: number, out: Motion, veil = -1): Motion {
  const m = out
  m.dx = 0; m.dy = 0; m.sx = 1; m.sy = 1; m.skew = 0; m.rot = 0; m.px = 0.5; m.py = 0.5; m.flow = -1; m.flowBy = 0
  const a = 1 - calm
  if (a <= 0) return m
  const s = t * (veil < 0 ? 1 : PACE[veil]) + seed * 1.37
  switch (kind) {
    case 'hill': // A sleeper's back: one slow breath, taller and a little narrower.
      m.py = 1
      m.sy = 1 + 0.08 * a * wave(s, 5.2)
      m.sx = 1 - 0.02 * a * wave(s, 5.2)
      break
    case 'bush': // Still, then a quick shiver from the middle outward.
      m.sx = 1 + 0.065 * a * burst(s, 3.4, 0.3) * wave(s, 0.11)
      m.sy = 1 - 0.04 * a * burst(s, 3.4, 0.3) * wave(s, 0.11)
      break
    case 'treetop': // Leans from its foot and sways back, with a quicker shake on top.
      m.py = 1
      m.skew = a * (0.1 * wave(s, 4.1) + 0.03 * wave(s, 1.3))
      break
    case 'mist': // Creeps sideways, thinning as it goes and gathering as it comes back.
      m.dx = 15 * a * wave(s, 9)
      m.sx = 1 + 0.06 * a * wave(s, 9, 0.25)
      break
    case 'smoke': // Curls upward: it rises, bends, and thins toward the top.
      m.py = 1
      m.dy = -9 * a * (0.5 - 0.5 * wave(s, 5, 0.25))
      m.skew = 0.09 * a * wave(s, 3.7)
      m.sy = 1 + 0.06 * a * wave(s, 5)
      break
    case 'cloud': // Drifts far and slowly, puffing as it goes.
      m.dx = 22 * a * wave(s, 11)
      m.sy = 1 + 0.035 * a * wave(s, 3.1)
      m.sx = 1 + 0.02 * a * wave(s, 3.1, 0.5)
      break
    case 'pond': // Lies flat; rings widen: broader as it flattens, and back.
      m.sx = 1 + 0.06 * a * wave(s, 2.6)
      m.sy = 1 - 0.08 * a * wave(s, 2.6)
      break
    case 'stream': // Runs: a second copy slides along it and fades in and out.
      m.flow = (((s / 1.7) % 1) + 1) % 1
      m.flowBy = 34 * a
      m.dy = 1.2 * a * wave(s, 0.9)
      break
    case 'wind': // Races: the second copy is quick and far, and the whole leans into it.
      m.flow = (((s / 0.8) % 1) + 1) % 1
      m.flowBy = 70 * a
      m.skew = 0.05 * a * wave(s, 2.3)
      break
    case 'corn': // Waves cross it: the ears lean one way and then the other, quicker than a tree.
      m.py = 1
      m.skew = 0.09 * a * wave(s, 2.2)
      m.sy = 1 + 0.015 * a * wave(s, 1.1)
      break
    case 'fire': // Tongues leap and shrink, fast and uneven.
      m.py = 1
      m.sy = 1 + a * (0.07 * wave(s, 0.31) + 0.05 * wave(s, 0.47, 0.3))
      m.sx = 1 - 0.035 * a * wave(s, 0.31)
      break
    case 'sun': // Rays breathe out and in, and it turns a little.
      m.sx = m.sy = 1 + 0.075 * a * wave(s, 3.3)
      m.rot = 0.14 * a * wave(s, 14)
      break
    case 'earth': // Heavy: a clod slumps now and then, and it settles back slowly.
      m.py = 1
      m.sy = 1 - 0.12 * a * burst(s, 4.6, 0.6) * burst(s, 4.6, 0.6)
      break
    case 'trunk': // Stands, and sways stiffly from the root.
      m.py = 1
      m.skew = 0.065 * a * wave(s, 6.5)
      break
    case 'leaves': // Loosen and tumble in loops.
      m.rot = 0.1 * a * wave(s, 2.9)
      m.dx = 6 * a * wave(s, 2.9, 0.25)
      m.dy = 5 * a * wave(s, 1.9)
      break
    case 'fluff': // Too slight to live: it only trembles.
      m.dx = 0.7 * a * wave(s, 0.13)
      m.dy = 0.5 * a * wave(s, 0.17)
      break
  }
  // Weathered: it droops and goes heavy.
  if (veil === 4) { m.sy *= 1 - 0.07 * a; m.skew += 0.05 * a }
  return m
}

/**
 * How far a shape of this kind travels as it lives: the longest way any corner or the middle of its top goes
 * between two moments, in stage units, for a shape `w` wide and `h` high. A shape that runs counts the way
 * its second copy slides. At 1180 by 820 a stage unit is a pixel.
 */
export function travelOf(kind: Kind, w = 240, h = 100): number {
  const m = still(), points = [[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0]] as const
  const lo = points.map(() => [Infinity, Infinity]), hi = points.map(() => [-Infinity, -Infinity])
  let flow = 0
  for (let i = 0; i < 1500; i++) {
    motionOf(kind, i / 50, 0, 0, m)
    if (m.flow >= 0) flow = Math.max(flow, Math.abs(m.flowBy))
    const px = m.px * w, py = m.py * h, cos = Math.cos(m.rot), sin = Math.sin(m.rot)
    points.forEach(([x, y], n) => {
      // As the view places it: stretched and leant about the pivot, turned, then slid.
      const sy = (y - py) * m.sy, sx = (x - px) * m.sx - m.skew * sy
      const ax = px + m.dx + sx * cos - sy * sin, ay = py + m.dy + sx * sin + sy * cos
      lo[n][0] = Math.min(lo[n][0], ax); lo[n][1] = Math.min(lo[n][1], ay); hi[n][0] = Math.max(hi[n][0], ax); hi[n][1] = Math.max(hi[n][1], ay)
    })
  }
  return Math.max(flow, ...points.map((_, n) => Math.hypot(hi[n][0] - lo[n][0], hi[n][1] - lo[n][1])))
}

/** The one squash a shape gives as it clings, `age` seconds after the finger lifted: down and wide, then back with one small overshoot. */
export function cling(age: number): number {
  if (age < 0 || age > 0.7) return 0
  const u = age / 0.7
  return Math.sin(u * Math.PI * 2.5) * (1 - u) * (1 - u)
}
