// Small painting helpers for Flower Table: a seeded random, cached sprites,
// and a few hand-made looking shapes (wobbly blobs, wood grain, colour washes).
// Nothing here touches the DOM at import time; `makeSprite` is only called
// from inside `create`.

export type G = CanvasRenderingContext2D

export const TAU = Math.PI * 2

export interface Sprite {
  c: HTMLCanvasElement
  // Logical size, the anchor inside it, and how many pixels per logical unit.
  w: number
  h: number
  ax: number
  ay: number
  res: number
}

export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeSprite(w: number, h: number, ax: number, ay: number, res: number, paint: (g: G) => void): Sprite {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * res))
  c.height = Math.max(1, Math.ceil(h * res))
  const g = c.getContext('2d')!
  g.scale(res, res)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  paint(g)
  return { c, w, h, ax, ay, res }
}

export function drawSprite(g: G, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = sx): void {
  if (rot === 0 && sx === 1 && sy === 1) {
    g.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h)
    return
  }
  g.save()
  g.translate(x, y)
  if (rot !== 0) g.rotate(rot)
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h)
  g.restore()
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${((1 << 24) | (c(ar, br) << 16) | (c(ag, bg) << 8) | c(ab, bb)).toString(16).slice(1)}`
}

// Negative darkens, positive lightens.
export function shade(hex: string, amount: number): string {
  return amount < 0 ? mix(hex, '#3a2a1c', -amount) : mix(hex, '#fff8ea', amount)
}

// A closed curve through points, rounded at every corner.
export function smoothClosed(g: G, pts: readonly (readonly [number, number])[]): void {
  const n = pts.length
  const last = pts[n - 1]!
  const first = pts[0]!
  g.beginPath()
  g.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
  for (let i = 0; i < n; i++) {
    const p = pts[i]!
    const q = pts[(i + 1) % n]!
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
  }
  g.closePath()
}

// An ellipse drawn by an unsteady hand.
export function blob(g: G, cx: number, cy: number, rx: number, ry: number, rng: () => number, wobble = 0.06, n = 11, rot = 0): void {
  const pts: [number, number][] = []
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const k = 1 + (rng() * 2 - 1) * wobble
    const x = Math.cos(a) * rx * k
    const y = Math.sin(a) * ry * k
    pts.push([cx + x * c - y * s, cy + x * s + y * c])
  }
  smoothClosed(g, pts)
}

export function fillBlob(g: G, cx: number, cy: number, rx: number, ry: number, rng: () => number, fill: string, wobble = 0.06, rot = 0): void {
  blob(g, cx, cy, rx, ry, rng, wobble, 11, rot)
  g.fillStyle = fill
  g.fill()
}

// Soft watercolour blooms inside a rectangle.
export function wash(g: G, x: number, y: number, w: number, h: number, rng: () => number, colors: readonly string[], count: number, rMin: number, rMax: number, alpha: number): void {
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  for (let i = 0; i < count; i++) {
    const cx = x + rng() * w
    const cy = y + rng() * h
    const r = rMin + rng() * (rMax - rMin)
    const color = colors[Math.floor(rng() * colors.length)]!
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0, rgba(color, alpha * (0.6 + rng() * 0.4)))
    grad.addColorStop(1, rgba(color, 0))
    g.fillStyle = grad
    g.fillRect(cx - r, cy - r, r * 2, r * 2)
  }
  g.restore()
}

// Grain lines over an area that is already filled. Caller clips if needed.
export function grain(g: G, x: number, y: number, w: number, h: number, rng: () => number, color: string, lines: number, vertical = false): void {
  g.save()
  g.lineCap = 'round'
  for (let i = 0; i < lines; i++) {
    const t = rng()
    const alpha = 0.05 + rng() * 0.13
    g.strokeStyle = rgba(color, alpha)
    g.lineWidth = 0.8 + rng() * 1.8
    const wave = (rng() * 2 - 1) * 5
    g.beginPath()
    if (vertical) {
      const px = x + t * w
      const from = y + rng() * h * 0.4
      const to = from + h * (0.3 + rng() * 0.7)
      g.moveTo(px, from)
      g.quadraticCurveTo(px + wave, (from + to) / 2, px + wave * 0.3, Math.min(to, y + h))
    } else {
      const py = y + t * h
      const from = x + rng() * w * 0.5
      const to = from + w * (0.2 + rng() * 0.6)
      g.moveTo(from, py)
      g.quadraticCurveTo((from + to) / 2, py + wave, Math.min(to, x + w), py + wave * 0.3)
    }
    g.stroke()
  }
  g.restore()
}

// Fine paper tooth: thousands of faint specks.
export function tooth(g: G, x: number, y: number, w: number, h: number, rng: () => number, count: number): void {
  for (let i = 0; i < count; i++) {
    const light = rng() < 0.5
    g.fillStyle = light ? `rgba(255,250,235,${0.04 + rng() * 0.05})` : `rgba(90,60,30,${0.025 + rng() * 0.035})`
    const r = 0.6 + rng() * 1.6
    g.beginPath()
    g.arc(x + rng() * w, y + rng() * h, r, 0, TAU)
    g.fill()
  }
}
