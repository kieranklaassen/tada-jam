import { dye, type G } from './loom'

// The few strokes every figure is cut from. Nothing finer than two beads.

export const INK = dye('walnut', 0)

export function blob(g: G, x: number, y: number, rx: number, ry: number, colour: string | CanvasGradient, turn = 0): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), turn, 0, Math.PI * 2)
  g.fillStyle = colour
  g.fill()
}

export function shape(g: G, points: readonly (readonly [number, number])[], colour: string | CanvasGradient): void {
  g.beginPath()
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
  g.fillStyle = colour
  g.fill()
}

/** A closed soft outline through points. */
export function trace(g: G, points: readonly (readonly [number, number])[]): void {
  const n = points.length
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n], z = points[(i + n - 1) % n]
    if (i === 0) g.moveTo((z[0] + a[0]) / 2, (z[1] + a[1]) / 2)
    g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  }
  g.closePath()
}

export function soft(g: G, points: readonly (readonly [number, number])[], colour: string | CanvasGradient): void {
  trace(g, points)
  g.fillStyle = colour
  g.fill()
}

export function line(g: G, points: readonly (readonly [number, number])[], colour: string, width: number): void {
  g.beginPath()
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = colour
  g.lineWidth = width
  g.stroke()
}

/** A bent tube from `a` to `c` by way of `b`. */
export function limb(g: G, a: readonly [number, number], b: readonly [number, number], c: readonly [number, number], colour: string, width: number): void {
  g.beginPath()
  g.moveTo(a[0], a[1])
  g.quadraticCurveTo(b[0], b[1], c[0], c[1])
  g.lineCap = 'round'
  g.strokeStyle = colour
  g.lineWidth = width
  g.stroke()
}

/** Light at the top left, dark at the bottom right: the loom turns it to hatching. */
export function lit(g: G, x: number, y: number, r: number, light: string, dark: string): CanvasGradient {
  const made = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.15, x, y, r * 1.15)
  made.addColorStop(0, light)
  made.addColorStop(1, dark)
  return made
}

export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k
export const ease = (k: number): number => { const t = clamp(k); return t * t * (3 - 2 * t) }
export const span = (t: number, a: number, b: number): number => clamp((t - a) / (b - a))
export const bump = (k: number): number => (k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI))
export const jolt = (t: number, rate = 20, fade = 5): number => (t < 0 ? 0 : Math.sin(t * rate) * Math.exp(-t * fade))
