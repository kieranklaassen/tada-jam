// How much room each frog takes, so nothing passes through one: the highest
// and lowest point of its skin in rings around its feet, in pond units above
// the frog's origin (the view stands that origin so the belly rests on the
// pad). The numbers are measured from the rigs posed by their animators, and
// bodies.test.ts checks every rig still fits inside them. The firefly, a
// carried or hopping frog, a splash, shadows, and droplets all keep clear of
// frogs with these, and the controller stays free of three.js.

/** Outer radius of each ring around a frog's feet. */
export const RINGS = [0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2] as const
/** A tap's shape is measured in steps this long, for TAP_STEPS steps; after that the frog is back to its seated or airborne shape. */
export const TAP_STEP = 0.1
export const TAP_STEPS = 14

type Rings = readonly number[]

export type Body = {
  /** How far the view raises a frog's origin above the pad top so its belly rests on it. */
  seat: number
  /** Sitting: singing, invited, pressed, landing, or leaning aside for a visitor. */
  seated: Rings
  seatedLow: Rings
  /** Highest point for each TAP_STEP after a tap, sitting. */
  tapped: readonly Rings[]
  /** Carried or hopping, tapped or not. */
  air: Rings
  airLow: Rings
  splash: Rings
  splashLow: Rings
  /** How far out its skin reaches while it splashes, feet first in and belly under, at any height a pad reaches (PAD_HEIGHTS). */
  splashWater: number
}

/** The heights a lily pad reaches, underside to top, bobbing, struck, and lifted to meet a carried frog. */
export const PAD_HEIGHTS = { low: -0.1, high: 0.18 } as const

/** A ring with nothing in it. */
const _ = Number.NaN

// Measured from the rigs and rounded outward: FROG_BODIES_OUT=<file> npx
// vitest run games/frog-choir/bodies.test.ts writes this table.
const MEASURED: readonly Body[] = [
  // showoff: rest bottom -0.036, seated lowest -0.036, farthest past the rings 0.00
  {
    seat: 0.0360,
    seated: [1.94, 1.92, 1.89, 1.70, 1.57, 1.50, 1.44, 1.38, 1.03, _, _, _],
    seatedLow: [-0.036, -0.036, -0.036, -0.036, -0.036, -0.037, -0.036, -0.036, 0.026, _, _, _],
    tapped: [
      [1.54, 1.52, 1.50, 1.41, 0.76, 0.67, 0.54, _, _, _, _, _],
      [1.85, 1.84, 1.78, 1.69, 1.09, 0.96, 0.61, _, _, _, _, _],
      [1.97, 1.97, 1.92, 1.82, 1.21, 1.09, 0.82, _, _, _, _, _],
      [2.01, 2.01, 1.96, 1.87, 1.21, 1.09, _, _, _, _, _, _],
      [2.01, 2.00, 1.95, 1.86, 1.16, 0.96, _, _, _, _, _, _],
      [1.92, 1.91, 1.87, 1.80, 0.88, 0.88, _, _, _, _, _, _],
      [1.69, 1.70, 1.68, 1.30, 0.83, 0.82, _, _, _, _, _, _],
      [1.55, 1.54, 1.52, 1.13, 0.98, 0.90, 0.66, _, _, _, _, _],
      [1.55, 1.54, 1.51, 1.13, 1.00, 0.89, 0.66, _, _, _, _, _],
      [1.54, 1.54, 1.52, 1.13, 0.97, 0.89, 0.56, _, _, _, _, _],
      [1.54, 1.53, 1.53, 1.13, 0.91, 0.87, 0.65, _, _, _, _, _],
      [1.54, 1.53, 1.52, 1.12, 0.83, 0.82, 0.66, _, _, _, _, _],
      [1.54, 1.53, 1.53, 1.12, 0.56, 0.59, 0.57, _, _, _, _, _],
      [1.54, 1.53, 1.52, 1.40, 0.56, 0.59, 0.56, _, _, _, _, _],
    ],
    air: [2.09, 2.12, 2.11, 2.12, 2.05, 1.83, 1.54, 0.63, _, _, _, _],
    airLow: [-0.121, -0.524, -0.540, -0.521, -0.288, -0.070, 0.049, 0.235, _, _, _, _],
    splash: [1.72, 1.71, 1.69, 1.26, 1.09, 0.96, _, _, _, _, _, _],
    splashLow: [-0.045, 0.006, -0.003, -0.006, 0.005, 0.552, _, _, _, _, _, _],
    splashWater: 0.84,
  },
  // bouncy: rest bottom -0.032, seated lowest -0.032, farthest past the rings 0.00
  {
    seat: 0.0318,
    seated: [1.79, 1.79, 1.78, 1.62, 1.54, 1.48, 1.38, _, _, _, _, _],
    seatedLow: [-0.032, -0.025, -0.020, -0.029, -0.032, -0.032, -0.025, _, _, _, _, _],
    tapped: [
      [1.49, 1.46, 1.42, 1.10, 0.92, 0.80, 0.58, _, _, _, _, _],
      [2.11, 2.09, 1.80, 1.34, 1.26, 1.25, _, _, _, _, _, _],
      [2.42, 2.41, 2.35, 2.24, 2.04, 1.99, 1.47, _, _, _, _, _],
      [2.56, 2.53, 2.62, 2.64, 2.58, 2.39, 2.13, _, _, _, _, _],
      [2.51, 2.65, 2.70, 2.68, 2.55, 2.33, 2.05, _, _, _, _, _],
      [2.09, 2.08, 2.00, 1.91, 1.92, 1.93, 1.93, _, _, _, _, _],
      [1.90, 1.91, 1.80, 1.75, 0.89, _, _, _, _, _, _, _],
      [1.53, 1.49, 1.45, 0.83, 0.34, _, _, _, _, _, _, _],
      [1.53, 1.49, 1.45, 0.80, 0.11, _, _, _, _, _, _, _],
      [1.53, 1.49, 1.45, 0.80, 0.11, _, _, _, _, _, _, _],
      [1.53, 1.49, 1.45, 0.80, 0.11, _, _, _, _, _, _, _],
      [1.53, 1.49, 1.45, 0.80, 0.11, _, _, _, _, _, _, _],
      [1.53, 1.49, 1.45, 0.80, 0.11, _, _, _, _, _, _, _],
      [1.53, 1.49, 1.45, 0.80, 0.11, _, _, _, _, _, _, _],
    ],
    air: [2.56, 2.71, 2.75, 2.72, 2.61, 2.44, 2.16, _, _, _, _, _],
    airLow: [-0.170, -0.352, -0.396, -0.373, -0.079, 0.063, 0.197, _, _, _, _, _],
    splash: [1.61, 1.57, 1.49, 1.06, 0.95, 0.62, _, _, _, _, _, _],
    splashLow: [-0.039, -0.037, -0.094, -0.089, -0.021, 0.506, _, _, _, _, _, _],
    splashWater: 0.78,
  },
  // sleepy: rest bottom -0.041, seated lowest -0.041, farthest past the rings 0.00
  {
    seat: 0.0408,
    seated: [2.47, 2.44, 2.44, 2.38, 2.25, 2.18, 1.97, 1.85, 1.79, 1.70, 1.38, 1.16],
    seatedLow: [-0.041, -0.041, -0.041, -0.041, -0.041, -0.041, -0.041, -0.041, -0.041, 0.047, 0.726, 1.079],
    tapped: [
      [2.71, 2.74, 2.71, 2.69, 2.61, 2.49, 2.30, _, _, _, _, _],
      [2.97, 3.05, 3.07, 2.97, 2.96, 2.82, 2.68, 2.42, _, _, _, _],
      [2.67, 2.96, 3.03, 2.93, 2.90, 2.82, 2.66, 2.44, _, _, _, _],
      [2.18, 2.28, 2.34, 2.38, 2.31, 2.21, 2.11, 1.86, _, _, _, _],
      [1.92, 1.85, 1.84, 1.87, 1.87, 1.82, 1.59, 1.25, _, _, _, _],
      [1.92, 1.85, 1.81, 1.81, 1.82, 1.78, 1.55, _, _, _, _, _],
      [1.92, 1.84, 1.80, 1.80, 1.79, 1.74, 1.54, _, _, _, _, _],
      [1.91, 1.84, 1.82, 1.82, 1.78, 1.70, 1.51, _, _, _, _, _],
      [1.90, 1.86, 1.87, 1.86, 1.82, 1.69, 1.47, _, _, _, _, _],
      [1.92, 1.93, 1.92, 1.92, 1.85, 1.76, 0.97, _, _, _, _, _],
      [1.98, 1.96, 1.99, 1.98, 1.92, 1.81, 0.97, _, _, _, _, _],
      [2.01, 2.00, 2.03, 2.02, 1.96, 1.82, 1.54, _, _, _, _, _],
      [2.02, 2.02, 2.05, 2.02, 1.95, 1.84, 1.58, _, _, _, _, _],
      [2.04, 2.05, 2.06, 2.03, 1.97, 1.81, 1.59, _, _, _, _, _],
    ],
    air: [3.69, 3.73, 3.80, 3.79, 3.65, 3.61, 3.45, 2.96, 2.22, _, _, _],
    airLow: [-0.093, -0.354, -0.508, -0.520, -0.488, -0.148, 0.241, 1.103, 1.375, _, _, _],
    splash: [2.35, 2.37, 2.29, 2.08, 1.98, 1.22, 1.00, _, _, _, _, _],
    splashLow: [-0.053, 0.030, 0.009, -0.007, -0.003, 0.014, 0.661, _, _, _, _, _],
    splashWater: 0.96,
  },
  // shy: rest bottom -0.030, seated lowest -0.030, farthest past the rings 0.00
  {
    seat: 0.0300,
    seated: [1.83, 1.83, 1.83, 1.77, 1.57, 1.46, 1.40, 1.34, _, _, _, _],
    seatedLow: [-0.030, -0.030, -0.030, -0.027, -0.005, -0.002, 0.359, 0.390, 0.401, _, _, _],
    tapped: [
      [1.60, 1.61, 1.60, 1.41, 0.70, _, _, _, _, _, _, _],
      [1.34, 1.34, 1.34, 1.31, 1.28, 1.23, 1.11, _, _, _, _, _],
      [0.93, 0.94, 1.30, 1.31, 1.29, 1.25, 1.19, 1.11, 0.85, _, _, _],
      [0.93, 0.93, 0.93, 0.86, 0.65, 1.16, 1.16, 1.11, 0.97, _, _, _],
      [0.97, 0.99, 0.98, 0.90, 0.64, 0.40, 1.02, 1.03, 0.97, _, _, _],
      [1.01, 1.01, 1.00, 0.91, 0.44, 0.38, 1.00, 1.06, 0.97, _, _, _],
      [1.02, 1.03, 1.00, 0.91, 0.45, 0.38, 1.06, 1.08, 0.97, _, _, _],
      [1.04, 1.04, 1.00, 0.91, 0.46, 0.39, 1.08, 1.09, 0.99, _, _, _],
      [1.04, 1.04, 1.01, 0.91, 0.46, 0.39, 1.09, 1.10, 0.99, _, _, _],
      [1.07, 1.07, 1.02, 0.92, 0.47, 0.41, 1.11, 1.11, 0.99, _, _, _],
      [1.12, 1.11, 1.05, 0.92, 0.49, 0.43, 1.17, 1.16, 1.01, _, _, _],
      [1.17, 1.16, 1.10, 0.95, 0.80, 1.32, 1.30, 1.21, 1.00, _, _, _],
      [1.23, 1.20, 1.13, 1.47, 1.49, 1.46, 1.37, 1.24, _, _, _, _],
      [1.27, 1.62, 1.63, 1.62, 1.56, 1.48, 1.37, 1.19, _, _, _, _],
    ],
    air: [1.57, 1.58, 1.57, 1.47, 1.44, 1.38, 1.32, 1.23, 1.02, 0.76, _, _],
    airLow: [-0.030, -0.019, -0.019, 0.004, 0.100, 0.191, 0.616, 0.357, 0.339, 0.389, _, _],
    splash: [1.82, 1.83, 1.81, 1.77, 1.71, 1.62, 1.48, _, _, _, _, _],
    splashLow: [-0.038, -0.002, -0.005, 0.004, 0.538, 1.347, 1.347, _, _, _, _, _],
    splashWater: 0.70,
  },
  // crooner: rest bottom -0.038, seated lowest -0.038, farthest past the rings 0.00
  {
    seat: 0.0378,
    seated: [2.08, 2.08, 2.05, 2.00, 1.98, 1.89, 1.63, 1.43, 1.32, 0.51, _, _],
    seatedLow: [-0.038, -0.038, -0.038, -0.038, -0.038, -0.038, -0.004, 0.006, 0.060, 0.231, _, _],
    tapped: [
      [1.75, 1.73, 1.70, 1.63, 1.46, 0.82, 0.77, _, _, _, _, _],
      [1.76, 1.75, 1.70, 1.65, 1.56, 1.45, 0.80, _, _, _, _, _],
      [1.70, 1.73, 1.71, 1.66, 1.57, 1.47, 1.33, _, _, _, _, _],
      [1.53, 1.61, 1.66, 1.65, 1.56, 1.44, 1.33, _, _, _, _, _],
      [1.53, 1.53, 1.65, 1.64, 1.57, 1.43, 1.33, _, _, _, _, _],
      [1.52, 1.52, 1.64, 1.63, 1.56, 1.42, 1.31, _, _, _, _, _],
      [1.50, 1.51, 1.60, 1.60, 1.54, 1.39, 1.27, 0.57, _, _, _, _],
      [1.48, 1.50, 1.55, 1.56, 1.50, 1.35, 1.23, 0.56, _, _, _, _],
      [1.53, 1.60, 1.61, 1.57, 1.47, 1.37, 1.04, _, _, _, _, _],
      [1.63, 1.66, 1.64, 1.58, 1.49, 1.31, 0.65, _, _, _, _, _],
      [1.69, 1.69, 1.65, 1.59, 1.45, 0.78, 0.73, _, _, _, _, _],
      [1.72, 1.72, 1.67, 1.62, 1.43, 0.96, 0.80, _, _, _, _, _],
      [1.74, 1.74, 1.69, 1.63, 1.40, 0.97, 0.79, _, _, _, _, _],
      [1.75, 1.75, 1.70, 1.65, 1.41, 0.92, _, _, _, _, _, _],
    ],
    air: [1.74, 1.74, 1.66, 1.63, 1.55, 1.46, 1.35, 1.15, _, _, _, _],
    airLow: [-0.128, -0.249, -0.359, -0.369, -0.379, -0.375, -0.322, -0.179, _, _, _, _],
    splash: [1.88, 1.88, 1.82, 1.76, 1.55, 1.07, _, _, _, _, _, _],
    splashLow: [-0.048, 0.000, -0.003, -0.007, 0.006, 0.659, _, _, _, _, _, _],
    splashWater: 0.89,
  },
]

const tops = (rings: Rings) => rings.map((x) => (Number.isNaN(x) ? -Infinity : x))
const lows = (rings: Rings) => rings.map((x) => (Number.isNaN(x) ? Infinity : x))

/** In frog index order, like the cast. */
export const BODIES: readonly Body[] = MEASURED.map((body) => ({
  seat: body.seat,
  seated: tops(body.seated),
  seatedLow: lows(body.seatedLow),
  tapped: body.tapped.map(tops),
  air: tops(body.air),
  airLow: lows(body.airLow),
  splash: tops(body.splash),
  splashLow: lows(body.splashLow),
  splashWater: body.splashWater,
}))

/** The highest any frog reaches above its origin, doing anything, and the lowest a carried or hopping one reaches. */
export const TALLEST = Math.max(...BODIES.flatMap((body) => [...body.seated, ...body.air, ...body.splash, ...body.tapped.flat()]))
export const DEEPEST_AIRBORNE = Math.min(...BODIES.flatMap((body) => body.airLow))

/** A frog's shape right now: highest and lowest point in each ring, above its origin. */
export type Shape = { top: Float64Array; low: Float64Array }

export function emptyShape(): Shape {
  return { top: new Float64Array(RINGS.length).fill(-Infinity), low: new Float64Array(RINGS.length).fill(Infinity) }
}

export type Posture = 'sit' | 'air' | 'splash'

/**
 * The shape of a frog sitting, in the air, or splashing, `tapAge` seconds
 * after its latest tap. Within a tap on a sitting frog, each step's highest
 * point holds from the end of the step before to the start of the step
 * after, and the shape moves in straight lines between those, so it never
 * dips below the rig.
 */
export function shapeOf(body: Body, posture: Posture, tapAge: number, out: Shape): Shape {
  const top = posture === 'sit' ? body.seated : posture === 'air' ? body.air : body.splash
  const low = posture === 'sit' ? body.seatedLow : posture === 'air' ? body.airLow : body.splashLow
  const tapping = posture === 'sit' && tapAge >= 0 && tapAge < TAP_STEP * TAP_STEPS
  const step = tapping ? Math.floor(tapAge / TAP_STEP) : 0
  const u = tapAge / TAP_STEP - step
  for (let i = 0; i < RINGS.length; i++) {
    let high = top[i]
    if (tapping) {
      const a = Math.max(body.tapped[step - 1]?.[i] ?? -Infinity, body.tapped[step][i])
      const b = Math.max(body.tapped[step][i], body.tapped[step + 1]?.[i] ?? -Infinity)
      high = Math.max(high, Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * u : Math.max(a, b))
    }
    out.top[i] = high
    out.low[i] = low[i]
  }
  return out
}

/** Room kept between two things that must not touch. */
export const MARGIN = 0.04
/**
 * Two frogs whose origins are this far apart (plus the fade) are never kept
 * apart by height: seated neighbours are at least this far apart already,
 * and a frog landing next to one must not be held up.
 */
export const PAIR_REACH = 1.8
export const PAIR_FADE = 0.2
/** Below any height the pond uses: what a fading requirement fades to. */
const FLOOR = -1

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * The lowest a body shaped `low` may put its origin, `d` from the axis of a
 * body shaped `top` whose origin is at `baseY`, to pass over it. -Infinity
 * when they cannot meet.
 */
export function clearOver(baseY: number, top: ArrayLike<number>, low: ArrayLike<number>, d: number): number {
  let need = -Infinity
  if (d >= PAIR_REACH + PAIR_FADE) return need
  for (let i = 0; i < RINGS.length; i++) {
    if (top[i] === -Infinity) continue
    for (let j = 0; j < RINGS.length; j++) {
      if (low[j] === Infinity) continue
      const reach = Math.min(RINGS[i] + RINGS[j], PAIR_REACH)
      if (d >= reach + PAIR_FADE) continue
      const height = baseY + top[i] - low[j] + MARGIN
      need = Math.max(need, FLOOR + (height - FLOOR) * smoothstep(reach + PAIR_FADE, reach, d))
    }
  }
  return need
}

/** The firefly reaches this far from its centre, wings and antennae and all, however it pitches. */
export const FIREFLY_REACH = 0.38
/** Over this much more distance the firefly eases down from a frog's head to its own path. */
export const FIREFLY_FADE = 0.6

/** The lowest the firefly's centre may fly, `d` from the axis of a frog shaped `top` whose origin is at `baseY`. */
export function fireflyOver(baseY: number, top: ArrayLike<number>, d: number): number {
  let need = -Infinity
  for (let i = 0; i < RINGS.length; i++) {
    if (top[i] === -Infinity) continue
    const reach = RINGS[i] + FIREFLY_REACH
    if (d >= reach + FIREFLY_FADE) continue
    const height = baseY + top[i] + FIREFLY_REACH + MARGIN
    need = Math.max(need, FLOOR + (height - FLOOR) * smoothstep(reach + FIREFLY_FADE, reach, d))
  }
  return need
}

/** A flat thing lying less than this far above where a frog's skin reaches down only grazes it. */
export const GRAZE = 0.01

/**
 * How wide a flat thing lying at height `y` may be (its radius), centred
 * `d` from the axis of a frog shaped `top`/`low` whose origin is at
 * `baseY`, before it cuts into the frog. Infinity when the frog does not
 * reach through that height, as when it rests on the surface the thing
 * lies on.
 */
export function flatRoom(baseY: number, top: ArrayLike<number>, low: ArrayLike<number>, d: number, y: number): number {
  let room = Infinity
  for (let i = 0; i < RINGS.length; i++) {
    if (baseY + low[i] >= y - GRAZE || baseY + top[i] <= y) continue
    room = Math.min(room, d - RINGS[i] - MARGIN)
  }
  return Math.max(0, room)
}

/** Whether a ball of radius `r` at height `y`, `d` from a frog's axis, could touch it. */
export function touches(baseY: number, top: ArrayLike<number>, low: ArrayLike<number>, d: number, y: number, r: number): boolean {
  for (let i = 0; i < RINGS.length; i++) {
    if (d - r >= RINGS[i] || d + r <= (i > 0 ? RINGS[i - 1] : 0)) continue
    if (y + r > baseY + low[i] && y - r < baseY + top[i]) return true
  }
  return false
}
