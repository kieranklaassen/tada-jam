import { makeRng } from './rng'
import type { Point } from './stage'

// How a dry-wipe marker draws: a thin line that beads on the gloss. Whatever
// is drawn is drawn once, into a picture of its own, and stamped from then on.

export type Ctx = CanvasRenderingContext2D
type Make = (width: number, height: number) => HTMLCanvasElement
const browser: Make = (width, height) => Object.assign(document.createElement('canvas'), { width, height })
let make: Make = browser
/** A test hands in canvases of its own, and null takes them back. */
export function useCanvases(other: Make | null): void {
  make = other ?? browser
}
export function canvas(width: number, height: number): HTMLCanvasElement {
  return make(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)))
}

export const INK = { black: '#22262d', red: '#d3212c', blue: '#1b55c4', green: '#0d8648' } as const
export type Ink = keyof typeof INK
export const BOARD = '#f6f9fa'
/** What an ink leaves when it lies flat under a figure, opaque so that a figure hides what is behind it. */
export const WASH: Record<Ink, string> = { black: '#e3e6ea', red: '#f7c6c8', blue: '#c9daf6', green: '#c5e6d3' }

export type Line = readonly Point[]
type Pair = readonly [number, number]

/** A soft curve through points, sampled finely enough to bead. */
export function curve(points: readonly Pair[], closed = false): Point[] {
  const n = points.length, out: Point[] = [], spans = closed ? n : n - 1
  const at = (i: number): Pair => closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]
  for (let i = 0; i < spans; i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2)
    const steps = Math.max(3, Math.round(Math.hypot(c[0] - b[0], c[1] - b[1]) / 6))
    for (let s = 0; s < steps; s++) {
      const t = s / steps, u = t * t, v = u * t
      const k = (p: number, q: number, r: number, w: number) => 0.5 * (2 * q + (r - p) * t + (2 * p - 5 * q + 4 * r - w) * u + (3 * q - p - 3 * r + w) * v)
      out.push({ x: k(a[0], b[0], c[0], d[0]), y: k(a[1], b[1], c[1], d[1]) })
    }
  }
  const last = closed ? points[0] : points[n - 1]
  out.push({ x: last[0], y: last[1] })
  return out
}
export function oval(x: number, y: number, rx: number, ry: number, from = 0, to = Math.PI * 2): Point[] {
  const steps = Math.max(10, Math.round(Math.abs(to - from) * Math.max(rx, ry) / 6)), out: Point[] = []
  for (let i = 0; i <= steps; i++) { const t = from + (to - from) * i / steps; out.push({ x: x + Math.cos(t) * rx, y: y + Math.sin(t) * ry }) }
  return out
}

export function trace(ctx: Ctx, line: Line): void {
  ctx.beginPath()
  line.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y) })
}

/** One beaded line: full where it starts and ends, thinner between, with small breaks where the gloss repelled it. */
export function mark(ctx: Ctx, line: Line, ink: Ink, width = 4.4, alpha = 0.95, seed = line.length): void {
  const rng = makeRng(seed * 7919 + 13)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = INK[ink]
  ctx.globalAlpha = alpha * 0.82
  ctx.lineWidth = width
  trace(ctx, line)
  ctx.stroke()
  // Where the ink pulled together it lies darker, and between there it shows the board.
  ctx.globalAlpha = alpha * 0.5
  for (let i = 0; i + 2 < line.length; i += 2 + Math.floor(rng.next() * 4)) {
    ctx.lineWidth = width * (0.7 + rng.next() * 0.45)
    ctx.beginPath(); ctx.moveTo(line[i].x, line[i].y); ctx.lineTo(line[i + 1].x, line[i + 1].y); ctx.lineTo(line[i + 2].x, line[i + 2].y)
    ctx.stroke()
  }
  ctx.strokeStyle = '#fff'
  ctx.globalAlpha = 0.5
  for (let i = 5 + Math.floor(rng.next() * 6); i + 1 < line.length; i += 9 + Math.floor(rng.next() * 12)) {
    ctx.lineWidth = width * (0.22 + rng.next() * 0.3)
    ctx.beginPath(); ctx.moveTo(line[i].x, line[i].y); ctx.lineTo(line[i + 1].x, line[i + 1].y)
    ctx.stroke()
  }
  ctx.fillStyle = INK[ink]
  ctx.globalAlpha = alpha * 0.6
  const end = line[line.length - 1]
  if (end && Math.hypot(end.x - line[0].x, end.y - line[0].y) > width * 2) { ctx.beginPath(); ctx.arc(end.x, end.y, width * 0.68, 0, 7); ctx.fill() }
  ctx.restore()
}

/** A figure's ground: the board, or an ink rubbed thin, so that what is behind is hidden. */
export function ground(ctx: Ctx, line: Line, colour: string = BOARD): void {
  trace(ctx, line)
  ctx.closePath()
  ctx.fillStyle = colour
  ctx.fill()
}

/** Hatching within a shape: side by side strokes of the same pen. */
export function hatch(ctx: Ctx, inside: Line, ink: Ink, gap: number, slant: number, width = 4, alpha = 0.6): void {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const p of inside) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y) }
  const rng = makeRng(Math.round(x0 * 31 + y1 * 17) + inside.length)
  ctx.save()
  trace(ctx, inside)
  ctx.closePath()
  ctx.clip()
  for (let x = x0 - Math.abs(slant); x < x1 + Math.abs(slant); x += gap * (0.8 + rng.next() * 0.4)) {
    const a = y0 - 4 + rng.next() * 10, b = y1 + 4 - rng.next() * 12
    mark(ctx, curve([[x, a], [x + slant * 0.5 + (rng.next() - 0.5) * 5, (a + b) / 2], [x + slant, b]]), ink, width, alpha, Math.round(x) + 500)
  }
  ctx.restore()
}

/** The grey that stays where something was wiped. */
export function smear(ctx: Ctx, x: number, y: number, w: number, h: number, turn: number, alpha = 0.06): void {
  const rng = makeRng(Math.round(x * 3 + y))
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#4a5768'
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = alpha * (0.4 + rng.next() * 0.6)
    ctx.lineWidth = h / 4 * (0.6 + rng.next())
    const dy = (rng.next() - 0.5) * h
    ctx.beginPath(); ctx.moveTo(-w / 2 + rng.next() * w * 0.2, dy); ctx.quadraticCurveTo(0, dy - h * 0.3, w / 2 - rng.next() * w * 0.2, dy); ctx.stroke()
  }
  ctx.restore()
}

export type Picture = { image: HTMLCanvasElement; x: number; y: number; w: number; h: number }
export type Box = readonly [number, number, number, number]

/** Pictures by name, painted at the surface's density the first time each is asked for. */
export class Album {
  private readonly made = new Map<string, Picture>()
  constructor(readonly density: number) {}
  get(key: string, box: Box, paint: (ctx: Ctx) => void, finer = 1): Picture {
    let picture = this.made.get(key)
    if (!picture) {
      const [x, y, w, h] = box, d = this.density * finer
      const image = canvas(w * d, h * d), ctx = image.getContext('2d')!
      ctx.scale(d, d)
      ctx.translate(-x, -y)
      paint(ctx)
      picture = { image, x, y, w, h }
      this.made.set(key, picture)
    }
    return picture
  }
}
