// Silk painting with gutta: every area is one flood of dye, lighter in its
// middle and pooled dark at its edge, closed by a raised gold line. These are
// the few strokes the whole picture is made of.

export type G = CanvasRenderingContext2D

export const GOLD = '#c08a1e'
export const GOLD_LIGHT = '#ffe39a'
export const GOLD_DARK = '#6b4308'
export const INK = '#2a1030'

/** Set by the tier: the light edge along each gold line. */
export const brush = { shine: true }

function channel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
}

/** One colour moved toward another, 0 to 1. */
export function mix(a: string, b: string, k: number): string {
  const part = (i: number) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * k).toString(16).padStart(2, '0')
  return `#${part(0)}${part(1)}${part(2)}`
}

const dyes = new WeakMap<G, Map<string, CanvasGradient>>()

/** A dye about the origin: bright in the middle, pooled toward `r`. Made once for each colour and size. */
export function dye(g: G, colour: string, r: number): CanvasGradient {
  let made = dyes.get(g)
  if (!made) dyes.set(g, (made = new Map()))
  const key = `${colour}/${Math.round(r)}`
  let gradient = made.get(key)
  if (!gradient) {
    gradient = g.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.08, 0, 0, r * 1.15)
    gradient.addColorStop(0, mix(colour, '#ffffff', 0.3))
    gradient.addColorStop(0.5, colour)
    gradient.addColorStop(1, mix(colour, '#2a1040', 0.34))
    made.set(key, gradient)
  }
  return gradient
}

/** The gold line along the path that is set now. */
export function gutta(g: G, width = 4.5): void {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = GOLD
  g.lineWidth = width
  g.stroke()
  if (!brush.shine) return
  g.strokeStyle = GOLD_LIGHT
  g.lineWidth = width * 0.3
  g.stroke()
}

/** Fills the path that is set now with dye and closes it with gold. */
export function cell(g: G, colour: string | CanvasGradient, width = 4.5): void {
  g.fillStyle = colour
  g.fill()
  gutta(g, width)
}

export function blob(g: G, x: number, y: number, rx: number, ry: number, turn = 0): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), turn, 0, Math.PI * 2)
}

/** A closed soft shape through points, as a hand would lay the gold. */
export function soft(g: G, points: readonly (readonly [number, number])[]): void {
  const n = points.length
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n]
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    if (i === 0) {
      const z = points[n - 1]
      g.moveTo((z[0] + a[0]) / 2, (z[1] + a[1]) / 2)
    }
    g.quadraticCurveTo(a[0], a[1], mx, my)
  }
  g.closePath()
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

/** An arm, a neck, a leg: a bent tube of dye between two gold edges. */
export function limb(g: G, path: () => void, colour: string, width: number): void {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  path()
  g.strokeStyle = GOLD
  g.lineWidth = width + 8
  g.stroke()
  g.strokeStyle = mix(colour, '#2a1040', 0.2)
  g.lineWidth = width
  g.stroke()
  g.strokeStyle = colour
  g.lineWidth = width * 0.62
  g.stroke()
}

export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v))
export const ease = (k: number): number => k * k * (3 - 2 * k)
/** A swell that rises and falls once over 0 to 1. */
export const bump = (k: number): number => (k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI))
/** A wobble that dies away. */
export const jolt = (t: number, rate = 22, fade = 5): number => (t < 0 ? 0 : Math.sin(t * rate) * Math.exp(-t * fade))
