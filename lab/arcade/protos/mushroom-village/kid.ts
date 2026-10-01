// The hand of a happy five-year-old: wobbly felt-tip lines that do not quite
// close, poster paint that misses the edges, and scribbled felt-tip fills.
// Everything here draws on whatever context it is given; the callers decide
// what is painted once and kept and what is drawn live.

import { TAU } from '../../kit/math.ts'

export type G = CanvasRenderingContext2D
export type Pt = [number, number]
export type Rand = () => number

// The dark felt-tip most outlines are drawn with.
export const INK = '#2b2840'
export const PAPER = '#fbf6e9'

export function rng(seed: number): Rand {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeCanvas(w: number, h: number, scale: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = Math.max(2, Math.ceil(w * scale))
  c.height = Math.max(2, Math.ceil(h * scale))
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return [c, g]
}

// ------------------------------------------------------------ point lists

// Points round an oval, or along an arc of it when a0 and a1 are given.
export function oval(cx: number, cy: number, rx: number, ry: number, n = 12, a0 = 0, a1 = TAU): Pt[] {
  const pts: Pt[] = []
  const full = Math.abs(a1 - a0) >= TAU - 1e-6
  for (let i = 0; i < n; i++) {
    const a = a0 + (full ? i / n : i / (n - 1)) * (a1 - a0)
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  return pts
}

// A box with doubled corners, so the smoothing leaves them nearly square.
export function box(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x, y],
    [x + w / 2, y],
    [x + w, y],
    [x + w, y],
    [x + w, y + h / 2],
    [x + w, y + h],
    [x + w, y + h],
    [x + w / 2, y + h],
    [x, y + h],
    [x, y + h],
    [x, y + h / 2],
  ]
}

function closedPath(g: G, pts: Pt[]): void {
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

function openPath(g: G, pts: Pt[]): void {
  const n = pts.length
  g.beginPath()
  g.moveTo(pts[0]![0], pts[0]![1])
  if (n < 3) {
    for (let i = 1; i < n; i++) g.lineTo(pts[i]![0], pts[i]![1])
    return
  }
  for (let i = 1; i < n - 1; i++) {
    const p = pts[i]!
    const q = pts[i + 1]!
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
  }
  g.lineTo(pts[n - 1]![0], pts[n - 1]![1])
}

// ------------------------------------------------------------ the three media

// Poster paint: one flat colour, a little off register and a little the
// wrong size, so the paper shows on one side and the paint spills on the
// other.
export function paint(g: G, pts: Pt[], color: string, r: Rand, miss = 3): void {
  let cx = 0
  let cy = 0
  for (const p of pts) {
    cx += p[0]
    cy += p[1]
  }
  cx /= pts.length
  cy /= pts.length
  const k = 0.955 + r() * 0.06
  const ox = (r() * 2 - 1) * miss
  const oy = (r() * 2 - 1) * miss
  const out: Pt[] = []
  for (const p of pts) out.push([cx + (p[0] - cx) * k + ox + (r() * 2 - 1) * miss * 0.45, cy + (p[1] - cy) * k + oy + (r() * 2 - 1) * miss * 0.45])
  closedPath(g, out)
  g.fillStyle = color
  g.fill()
}

// A felt-tip line round a shape. It starts somewhere, wobbles all the way
// round, and runs a little past where it began without meeting it.
export function ink(g: G, pts: Pt[], r: Rand, color = INK, width = 4, wob = 1.3): void {
  const n = pts.length
  const k = Math.floor(r() * n)
  const out: Pt[] = []
  for (let i = 0; i < n + 2; i++) {
    const p = pts[(k + i) % n]!
    const w = i >= n ? wob * 1.5 : wob
    out.push([p[0] + (r() * 2 - 1) * w, p[1] + (r() * 2 - 1) * w])
  }
  openPath(g, out)
  g.strokeStyle = color
  g.lineWidth = width
  g.stroke()
}

// An open felt-tip stroke through the points.
export function stroke(g: G, pts: Pt[], r: Rand, color = INK, width = 4, wob = 1.2): void {
  const out: Pt[] = []
  for (const p of pts) out.push([p[0] + (r() * 2 - 1) * wob, p[1] + (r() * 2 - 1) * wob])
  openPath(g, out)
  g.strokeStyle = color
  g.lineWidth = width
  g.stroke()
}

// Paint and then the line: the usual way a thing is made.
export function thing(g: G, pts: Pt[], fill: string, r: Rand, width = 4, miss = 3, line = INK): void {
  paint(g, pts, fill, r, miss)
  ink(g, pts, r, line, width)
}

export interface ScribbleOptions {
  angle?: number
  gap?: number
  width?: number
  alpha?: number
  // How far the pen runs past the edge (or stops short of it).
  over?: number
}

// Colouring in with a felt-tip: back and forth across the shape, each pass
// its own stroke so the overlaps come out darker, never quite reaching every
// edge and sometimes going over.
export function scribble(g: G, pts: Pt[], color: string, r: Rand, o: ScribbleOptions = {}): void {
  const angle = o.angle ?? -0.5
  const gap = o.gap ?? 7
  const width = o.width ?? 7
  const over = o.over ?? 4
  const ca = Math.cos(-angle)
  const sa = Math.sin(-angle)
  const rot: Pt[] = pts.map((p) => [p[0] * ca - p[1] * sa, p[0] * sa + p[1] * ca])
  let y0 = Infinity
  let y1 = -Infinity
  for (const p of rot) {
    if (p[1] < y0) y0 = p[1]
    if (p[1] > y1) y1 = p[1]
  }
  const zig: Pt[] = []
  let flip = false
  for (let y = y0 + gap * 0.5; y < y1; y += gap * (0.8 + r() * 0.4)) {
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i < rot.length; i++) {
      const a = rot[i]!
      const b = rot[(i + 1) % rot.length]!
      if (a[1] > y === b[1] > y) continue
      const x = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0])
      if (x < lo) lo = x
      if (x > hi) hi = x
    }
    if (hi <= lo) continue
    const x = flip ? hi + (r() * 2 - 1.2) * over : lo + (r() * 2 - 0.8) * over
    zig.push([x, y])
    flip = !flip
  }
  const cb = Math.cos(angle)
  const sb = Math.sin(angle)
  g.save()
  g.globalAlpha *= o.alpha ?? 0.8
  g.strokeStyle = color
  g.lineWidth = width
  for (let i = 0; i < zig.length - 1; i++) {
    const a = zig[i]!
    const b = zig[i + 1]!
    g.beginPath()
    g.moveTo(a[0] * cb - a[1] * sb, a[0] * sb + a[1] * cb)
    g.lineTo(b[0] * cb - b[1] * sb, b[0] * sb + b[1] * cb)
    g.stroke()
  }
  g.restore()
}

// A dot of paint with a line round it.
export function dot(g: G, x: number, y: number, rad: number, fill: string, r: Rand, line: string | null = INK, width = 2.5): void {
  // The offset start keeps each dot's seam somewhere different.
  const a0 = r() * TAU
  const pts = oval(x, y, rad, rad, 8, a0, a0 + TAU)
  paint(g, pts, fill, r, rad * 0.22)
  if (line) ink(g, pts, r, line, width, rad * 0.1)
}

// ------------------------------------------------------------ night colours

// What the picture is multiplied by at dusk.
export const NIGHT: [number, number, number] = [86, 96, 186]

const parsed = new Map<string, [number, number, number]>()
const toned = new Map<string, string>()

function rgb(hex: string): [number, number, number] {
  let c = parsed.get(hex)
  if (!c) {
    const v = parseInt(hex.slice(1), 16)
    c = [(v >> 16) & 255, (v >> 8) & 255, v & 255]
    parsed.set(hex, c)
  }
  return c
}

// A '#rrggbb' colour as it looks `night` (0..1) of the way into dusk.
export function tone(hex: string, night: number): string {
  if (night <= 0.02) return hex
  const q = Math.round(Math.min(1, night) * 8)
  const key = hex + q
  let out = toned.get(key)
  if (!out) {
    const c = rgb(hex)
    const t = q / 8
    const m = (i: 0 | 1 | 2) => Math.round(c[i] * (1 - t + (t * NIGHT[i]) / 255))
    out = `rgb(${m(0)},${m(1)},${m(2)})`
    toned.set(key, out)
  }
  return out
}

export function nightCopy(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'multiply'
  g.fillStyle = `rgb(${NIGHT[0]},${NIGHT[1]},${NIGHT[2]})`
  g.fillRect(0, 0, c.width, c.height)
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'source-over'
  return c
}

// ------------------------------------------------------------ sprites

// Something painted once, with its dusk twin. (ax, ay) is the anchor in the
// sprite's own logical pixels.
export interface Sprite {
  day: HTMLCanvasElement
  night: HTMLCanvasElement
  w: number
  h: number
  ax: number
  ay: number
}

export function makeSprite(w: number, h: number, ax: number, ay: number, scale: number, paintIt: (g: G) => void, twin = true): Sprite {
  const [c, g] = makeCanvas(w, h, scale)
  g.translate(ax, ay)
  paintIt(g)
  return { day: c, night: twin ? nightCopy(c) : c, w, h, ax, ay }
}

export function drawSprite(g: G, s: Sprite, x: number, y: number, night = 0, sx = 1, sy = 1, rot = 0): void {
  const plain = sx === 1 && sy === 1 && rot === 0
  if (!plain) {
    g.save()
    g.translate(x, y)
    if (rot) g.rotate(rot)
    g.scale(sx, sy)
    x = 0
    y = 0
  }
  if (night < 0.99) g.drawImage(s.day, x - s.ax, y - s.ay, s.w, s.h)
  if (night > 0.01) {
    const a = g.globalAlpha
    if (night < 0.99) g.globalAlpha = a * night
    g.drawImage(s.night, x - s.ax, y - s.ay, s.w, s.h)
    g.globalAlpha = a
  }
  if (!plain) g.restore()
}
