// Small numeric helpers every arcade prototype ends up wanting.

export const TAU = Math.PI * 2

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Map v from [a, b] to [c, d], clamped.
export function remap(v: number, a: number, b: number, c: number, d: number): number {
  return lerp(c, d, clamp((v - a) / (b - a), 0, 1))
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay)
}

// Frame-rate independent "move a fraction of the way there". `rate` is how
// fast (about 8 is snappy, 3 is lazy).
export function damp(current: number, target: number, rate: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-rate * dt))
}

export function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function rndInt(min: number, max: number): number {
  return Math.floor(rnd(min, max + 1))
}

export function pick<T>(items: readonly T[], r: number = Math.random()): T {
  return items[Math.min(items.length - 1, Math.floor(r * items.length))]!
}

export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

export function circleHit(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = bx - ax
  const dy = by - ay
  const r = ar + br
  return dx * dx + dy * dy <= r * r
}

export function inRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h
}

// Easing, all t in 0..1.
export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  // Overshoots past 1 then settles: the default for anything that pops in.
  outBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  inBack: (t: number) => 2.70158 * t * t * t - 1.70158 * t * t,
  outElastic: (t: number) => (t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  outBounce: (t: number) => {
    const n = 7.5625
    const d = 2.75
    if (t < 1 / d) return n * t * t
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
    return n * (t -= 2.625 / d) * t + 0.984375
  },
}

// A damped spring on one number: the cheapest way to get squash, wobble and
// follow-through. Kick it (`vel += n`) or move `target`, call update each frame.
export interface Spring {
  value: number
  target: number
  vel: number
  stiffness: number
  damping: number
  update(dt: number): number
  kick(amount: number): void
}

export function spring(value = 0, stiffness = 180, damping = 12): Spring {
  return {
    value,
    target: value,
    vel: 0,
    stiffness,
    damping,
    update(dt) {
      // Two half steps keep a stiff spring stable at 30 fps.
      for (let i = 0; i < 2; i++) {
        const h = dt / 2
        this.vel += (this.stiffness * (this.target - this.value) - this.damping * this.vel) * h
        this.value += this.vel * h
      }
      return this.value
    },
    kick(amount) {
      this.vel += amount
    },
  }
}
