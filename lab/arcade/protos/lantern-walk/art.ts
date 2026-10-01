// Small painting helpers shared by the room, the lantern and the wood. All of
// it is plain canvas: soft watercolour blobs, wobbly hand-drawn outlines, and
// the three window shapes (star, moon, leaf).

import { TAU } from '../../kit/math.ts'

export type G = CanvasRenderingContext2D
export type Rgb = readonly [number, number, number]
export type Rng = () => number
export type Kind = 'star' | 'moon' | 'leaf'
export const KINDS: readonly Kind[] = ['star', 'moon', 'leaf']

// A seeded 0..1 generator, so a painted backdrop is the same every frame it is
// rebuilt and different on the next day.
export function mulberry(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, G] {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w))
  canvas.height = Math.max(1, Math.round(h))
  const g = canvas.getContext('2d')
  if (!g) throw new Error('2D canvas is not available')
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return [canvas, g]
}

// Make the browser finish painting a canvas now. Canvas drawing can be queued
// and only carried out when the canvas is first used, which would land a
// whole backdrop's worth of work in one frame of play.
export function settle(g: G): void {
  g.getImageData(0, 0, 1, 1)
}

export function hexRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(c: Rgb, a = 1): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

// Colour along a list of stops, t in 0..1.
export function along(stops: readonly Rgb[], t: number): Rgb {
  const f = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1)
  const i = Math.floor(f)
  return mix(stops[i]!, stops[i + 1]!, f - i)
}

// A soft round dab of colour: the watercolour brush.
export function blob(g: G, x: number, y: number, r: number, c: Rgb, alpha: number): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, r)
  grad.addColorStop(0, rgba(c, alpha))
  grad.addColorStop(0.6, rgba(c, alpha * 0.55))
  grad.addColorStop(1, rgba(c, 0))
  g.fillStyle = grad
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

// Fine speckle: pigment settling into the tooth of the paper.
export function grain(g: G, x: number, y: number, w: number, h: number, count: number, rng: Rng, dark = 0.05, light = 0.06): void {
  for (let i = 0; i < count; i++) {
    const px = x + rng() * w
    const py = y + rng() * h
    const s = 0.6 + rng() * 1.4
    g.fillStyle = rng() < 0.5 ? `rgba(60,30,20,${dark})` : `rgba(255,250,235,${light})`
    g.fillRect(px, py, s, s)
  }
}

// A closed, smooth shape through points: slightly irregular edges for free.
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

// A round-ish blob outline with a hand's wobble.
export function wobbly(g: G, x: number, y: number, rx: number, ry: number, rng: Rng, wobble = 0.08, points = 12): void {
  const pts: [number, number][] = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU
    const k = 1 + (rng() * 2 - 1) * wobble
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k])
  }
  smoothClosed(g, pts)
}

// A soft-edged shape, by drawing only the blurred shadow of a path that sits
// off the canvas. Works in every browser (canvas `filter` does not). `scale`
// is the context's own scale, which shadows ignore.
export function soft(g: G, color: string, blur: number, scale: number, path: () => void): void {
  const far = 4000
  g.save()
  g.shadowColor = color
  g.shadowBlur = blur * scale
  g.shadowOffsetX = far * scale
  g.shadowOffsetY = 0
  g.translate(-far, 0)
  g.fillStyle = '#000'
  path()
  g.fill()
  g.restore()
}

// The three window shapes, centred on the origin, about `r` in radius.
export function shapePath(g: G, kind: Kind, r: number): void {
  g.beginPath()
  if (kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 === 0 ? r * 1.06 : r * 0.5
      if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
  } else if (kind === 'moon') {
    // A crescent: the big circle with a smaller one bitten out of its right.
    g.arc(-r * 0.12, 0, r, 0.915, TAU - 0.915, false)
    g.arc(-r * 0.12 + r * 0.5, 0, r * 0.8, -1.433, 1.433, true)
  } else {
    g.moveTo(0, -r * 1.08)
    g.bezierCurveTo(r * 0.95, -r * 0.5, r * 0.8, r * 0.55, 0, r * 1.08)
    g.bezierCurveTo(-r * 0.8, r * 0.55, -r * 0.95, -r * 0.5, 0, -r * 1.08)
  }
  g.closePath()
}

// One fallen leaf: a pointed oval with a midrib.
export function leafDab(g: G, x: number, y: number, r: number, rot: number, fill: string, rib?: string): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.beginPath()
  g.moveTo(-r, 0)
  g.quadraticCurveTo(0, -r * 0.62, r, 0)
  g.quadraticCurveTo(0, r * 0.62, -r, 0)
  g.fillStyle = fill
  g.fill()
  if (rib) {
    g.beginPath()
    g.moveTo(-r * 0.8, 0)
    g.lineTo(r * 0.85, 0)
    g.strokeStyle = rib
    g.lineWidth = Math.max(0.6, r * 0.09)
    g.stroke()
  }
  g.restore()
}

export function smooth01(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return c * c * (3 - 2 * c)
}
