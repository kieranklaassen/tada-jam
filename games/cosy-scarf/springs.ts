// One damped spring for every bit of weight in the scene: balls hopping,
// the scarf swinging, the loom rocking. Low damping overshoots and settles,
// which is where the squash and follow-through come from.

export type Spring = { x: number; v: number }

export function spring(x = 0): Spring {
  return { x, v: 0 }
}

/** Advance `s` toward `target`. Sub-steps keep stiff springs stable at low frame rates. */
export function springStep(s: Spring, target: number, dt: number, stiffness: number, damping: number): number {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    s.v += (stiffness * (target - s.x) - damping * s.v) * h
    s.x += s.v * h
  }
  return s.x
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

export function smooth(t: number): number {
  const k = clamp01(t)
  return k * k * (3 - 2 * k)
}

/** Ease out with a little overshoot: things arrive, pass, and settle. */
export function backOut(t: number, overshoot = 1.6): number {
  const k = clamp01(t) - 1
  return 1 + k * k * ((overshoot + 1) * k + overshoot)
}
