import type { Point } from './input'
import { makeRng, type Rng } from './rng'

// The mosaic. A shape is filled with grout and then with small uneven stones
// laid in rows that follow its own outline: the distance to the edge is traced
// at even depths, and stones are laid along each trace. Nothing lies on a grid.
// Everything is laid once into a picture and stamped.

export type Ctx = CanvasRenderingContext2D
export type Outline = readonly Point[]

/** Makes a drawing surface. Replaced in tests, which have no document. */
export const surface = {
  make(width: number, height: number): { canvas: CanvasImageSource; ctx: Ctx } {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return { canvas, ctx: canvas.getContext('2d')! }
  },
}

export const GROUT = '#e9dfca'

export const oval = (x: number, y: number, rx: number, ry: number, rot = 0): Outline => {
  const n = Math.max(14, Math.round((rx + ry) / 4)), c = Math.cos(rot), s = Math.sin(rot)
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, u = Math.cos(a) * rx, v = Math.sin(a) * ry
    return { x: x + u * c - v * s, y: y + u * s + v * c }
  })
}
export const poly = (...p: number[]): Outline => Array.from({ length: p.length / 2 }, (_, i) => ({ x: p[i * 2], y: p[i * 2 + 1] }))
export const box = (x: number, y: number, w: number, h: number): Outline => poly(x, y, x + w, y, x + w, y + h, x, y + h)
/** A closed smooth line whose corners are the given points. */
export const blob = (...p: number[]): Outline => {
  const n = p.length / 2, out: Point[] = []
  const q = (i: number): Point => ({ x: p[((i + n) % n) * 2], y: p[((i + n) % n) * 2 + 1] })
  for (let i = 0; i < n; i++) {
    const a = q(i - 1), b = q(i), c = q(i + 1), d = q(i + 2)
    for (let k = 0; k < 6; k++) {
      const t = k / 6, t2 = t * t, t3 = t2 * t
      const m = (pa: number, pb: number, pc: number, pd: number) => 0.5 * (2 * pb + (pc - pa) * t + (2 * pa - 5 * pb + 4 * pc - pd) * t2 + (3 * pb - pa - 3 * pc + pd) * t3)
      out.push({ x: m(a.x, b.x, c.x, d.x), y: m(a.y, b.y, c.y, d.y) })
    }
  }
  return out
}
/** A thick line through points, thinning from `w0` to `w1`. */
export const limb = (w0: number, w1: number, ...p: number[]): Outline => {
  const pts: Point[] = []
  const n = p.length / 2
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < 8; k++) {
    const t = k / 8
    const g = (j: number) => ({ x: p[Math.max(0, Math.min(n - 1, j)) * 2], y: p[Math.max(0, Math.min(n - 1, j)) * 2 + 1] })
    const a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2)
    const m = (pa: number, pb: number, pc: number, pd: number) => 0.5 * (2 * pb + (pc - pa) * t + (2 * pa - 5 * pb + 4 * pc - pd) * t * t + (3 * pb - pa - 3 * pc + pd) * t * t * t)
    pts.push({ x: m(a.x, b.x, c.x, d.x), y: m(a.y, b.y, c.y, d.y) })
  }
  pts.push({ x: p[n * 2 - 2], y: p[n * 2 - 1] })
  const left: Point[] = [], right: Point[] = []
  pts.forEach((at, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2, nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l
    left.push({ x: at.x + nx * w, y: at.y + ny * w })
    right.unshift({ x: at.x - nx * w, y: at.y - ny * w })
  })
  return [...left, ...right]
}

function signedDepth(o: Outline, x: number, y: number): number {
  let d = Infinity, inside = false
  for (let i = 0, j = o.length - 1; i < o.length; j = i++) {
    const a = o[i], b = o[j], dx = b.x - a.x, dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    const ex = a.x + dx * t - x, ey = a.y + dy * t - y, e = ex * ex + ey * ey
    if (e < d) d = e
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside ? Math.sqrt(d) : -Math.sqrt(d)
}

/** The lines of even depth inside an outline, as strings of points. */
export function contours(o: Outline, step: number, first: number, gap: number): Point[][][] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of o) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
  x0 -= step; y0 -= step
  const w = Math.ceil((x1 - x0) / step) + 2, h = Math.ceil((y1 - y0) / step) + 2
  const f = new Float32Array(w * h)
  let deepest = 0
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const d = signedDepth(o, x0 + i * step, y0 + j * step)
    f[j * w + i] = d
    if (d > deepest) deepest = d
  }
  const rows: Point[][][] = []
  for (let iso = first; iso < deepest; iso += gap) {
    const at = new Map<number, Point>(), links = new Map<number, number[]>()
    const cross = (a: number, b: number, key: number, horizontal: boolean, i: number, j: number) => {
      const t = (iso - a) / (b - a)
      if (!at.has(key)) at.set(key, horizontal ? { x: x0 + (i + t) * step, y: y0 + j * step } : { x: x0 + i * step, y: y0 + (j + t) * step })
      return key
    }
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
      const a = f[j * w + i], b = f[j * w + i + 1], c = f[(j + 1) * w + i + 1], d = f[(j + 1) * w + i]
      const e: number[] = []
      if (a > iso !== b > iso) e.push(cross(a, b, (j * w + i) * 2, true, i, j))
      if (b > iso !== c > iso) e.push(cross(b, c, (j * w + i + 1) * 2 + 1, false, i + 1, j))
      if (d > iso !== c > iso) e.push(cross(d, c, ((j + 1) * w + i) * 2, true, i, j + 1))
      if (a > iso !== d > iso) e.push(cross(a, d, (j * w + i) * 2 + 1, false, i, j))
      for (let k = 0; k + 1 < e.length; k += 2) {
        links.set(e[k], [...(links.get(e[k]) ?? []), e[k + 1]])
        links.set(e[k + 1], [...(links.get(e[k + 1]) ?? []), e[k]])
      }
    }
    const lines: Point[][] = [], done = new Set<number>()
    for (const start of links.keys()) {
      if (done.has(start)) continue
      const line: Point[] = []
      let key: number | undefined = start
      while (key !== undefined) {
        done.add(key)
        line.push(at.get(key)!)
        key = links.get(key)!.find((k) => !done.has(k))
      }
      if (links.get(start)!.length > 1 && line.length > 3) line.push(line[0])
      lines.push(line)
    }
    rows.push(lines)
  }
  return rows
}

/** One stone: four uneven corners about a middle, along a direction. */
export function stone(ctx: Ctx, rng: Rng, x: number, y: number, angle: number, length: number, depth: number, color: string): void {
  const c = Math.cos(angle), s = Math.sin(angle)
  const put = (u: number, v: number, move: boolean) => {
    const du = u * (0.84 + rng.next() * 0.2), dv = v * (0.84 + rng.next() * 0.2)
    const px = x + du * c - dv * s, py = y + du * s + dv * c
    if (move) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.fillStyle = color
  ctx.beginPath()
  put(-length / 2, -depth / 2, true)
  put(length / 2, -depth / 2, false)
  put(length / 2, depth / 2, false)
  put(-length / 2, depth / 2, false)
  ctx.closePath()
  ctx.fill()
}

export function fillOutline(ctx: Ctx, o: Outline, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  o.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.closePath()
  ctx.fill()
}

/** A shade a little lighter or darker, as stones from one quarry are. */
const channels = (color: string): number[] => (color[0] === '#' ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) : color.match(/\d+/g)!.map(Number))
export function shade(color: string, by: number): string {
  return `rgb(${channels(color).map((v) => Math.max(0, Math.min(255, Math.round(v + by * 255)))).join(',')})`
}

export type Lay = {
  /** The stone's depth; its length varies about it. */
  size: number
  colors: readonly string[]
  /** The outermost row's colour, the dark line a mosaic draws with. */
  edge?: string
  /** The last part of the shape takes another colour: light from above left. */
  light?: string
  grout?: string
  /** How many stones in a hundred are glass. */
  glass?: number
  vary?: number
}

const GLINT = '#fff6d2'

/** Lays a shape. */
export function lay(ctx: Ctx, rng: Rng, o: Outline, how: Lay): void {
  const vary = how.vary ?? 0.05
  let size = how.size
  // Dark stones lie in dark grout, or a thing made of them reads as a net.
  const [red, green, blue] = channels(how.colors[0]), dark = red * 0.3 + green * 0.59 + blue * 0.11 < 112
  fillOutline(ctx, o, how.grout ?? (dark ? shade(how.colors[0], -0.14) : '#d4c8b1'))
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity
  for (const p of o) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x) }
  let rows = contours(o, Math.max(1.2, size / 3), size * 0.47, size * 0.98)
  // What is too thin for its stones is laid in smaller ones.
  while (!rows.length && size > 2) {
    size *= 0.75
    rows = contours(o, Math.max(0.9, size / 3), size * 0.47, size * 0.98)
  }
  rows.forEach((lines, r) => {
    for (const line of lines) {
      let length = 0
      for (let i = 1; i < line.length; i++) length += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y)
      const n = Math.max(1, Math.round(length / (size * 1.12))), each = length / n
      let i = 1, gone = 0
      for (let k = 0; k < n; k++) {
        const want = (k + 0.5) * each
        while (i < line.length - 1 && gone + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y) < want) { gone += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y); i++ }
        const b = line[Math.min(i, line.length - 1)], a = line[Math.min(i, line.length - 1) - 1] ?? b
        const l = Math.hypot(b.x - a.x, b.y - a.y) || 1, t = Math.max(0, Math.min(1, (want - gone) / l))
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t
        let color = how.colors[Math.floor(rng.next() * how.colors.length)]
        if (how.light && (y - y0) / (y1 - y0 || 1) + (x - x0) / (x1 - x0 || 1) * 0.5 < 0.42 + rng.next() * 0.14 && r > 0) color = how.light
        if (r === 0 && how.edge) color = how.edge
        const glass = (how.glass ?? 0) > rng.next() * 100
        stone(ctx, rng, x, y, Math.atan2(b.y - a.y, b.x - a.x), Math.max(size * 0.5, each * 0.88), size * 0.86, shade(color, (rng.next() - 0.5) * 2 * vary + (glass ? 0.12 : 0)))
        if (glass) stone(ctx, rng, x - size * 0.12, y - size * 0.14, 0.6, size * 0.4, size * 0.2, GLINT)
      }
    }
  })
}

/** Rows of stones along a wavy line across a rectangle, for what lies behind. `bend` gives a row's height at x. */
export function rowsAcross(ctx: Ctx, rng: Rng, x0: number, y0: number, x1: number, y1: number, size: number, bend: (x: number, row: number) => number, color: (x: number, y: number, rng: Rng) => string, vary = 0.035): void {
  let row = 0
  for (let y = y0 - size * 2; y < y1 + size * 2; y += size * 0.98, row++) {
    let x = x0 - rng.next() * size
    while (x < x1) {
      const length = size * (0.8 + rng.next() * 0.75), mid = x + length / 2
      const at = y + bend(mid, row)
      if (at > y0 - size && at < y1 + size) stone(ctx, rng, mid, at, Math.atan2(bend(mid + 3, row) - bend(mid - 3, row), 6), length * 0.92, size * 0.86, shade(color(mid, at, rng), (rng.next() - 0.5) * 2 * vary))
      x += length
    }
  }
}

/** `under` draws another picture first, as it was laid. */
export type Painter = (ctx: Ctx, rng: Rng, under: (s: Sprite) => void) => void
export type Sprite = { name: string; x: number; y: number; w: number; h: number; paint: Painter }
/** A named picture: where its box lies about its own origin, and how it is laid. */
export const sprite = (name: string, x: number, y: number, w: number, h: number, paint: Painter): Sprite => ({ name, x, y, w, h, paint })

/** Laid pictures at one scale of the surface. */
export class Stamps {
  private readonly made = new Map<string, CanvasImageSource>()
  private scale = 0
  /** Pictures stamped and shapes drawn in this frame. */
  count = 0

  at(scale: number): void {
    const step = Math.max(0.5, Math.min(2.5, Math.ceil(scale * 4) / 4))
    if (step === this.scale) return
    this.scale = step
    this.made.clear()
  }

  warm(s: Sprite): CanvasImageSource {
    let image = this.made.get(s.name)
    if (!image) {
      const made = surface.make(Math.ceil(s.w * this.scale), Math.ceil(s.h * this.scale))
      made.ctx.scale(this.scale, this.scale)
      made.ctx.translate(-s.x, -s.y)
      // Seeded by its name, so no stone moves between visits.
      let seed = 23
      for (const c of s.name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
      s.paint(made.ctx, makeRng(seed), (o) => made.ctx.drawImage(this.warm(o), o.x, o.y, o.w, o.h))
      image = made.canvas
      this.made.set(s.name, image)
    }
    return image
  }

  stamp(ctx: Ctx, s: Sprite, x = 0, y = 0, rot = 0, sx = 1, sy = sx): void {
    const image = this.warm(s)
    this.count++
    if (!rot && sx === 1 && sy === 1) {
      ctx.drawImage(image, s.x + x, s.y + y, s.w, s.h)
      return
    }
    ctx.save()
    ctx.translate(x, y)
    if (rot) ctx.rotate(rot)
    ctx.scale(sx, sy)
    ctx.drawImage(image, s.x, s.y, s.w, s.h)
    ctx.restore()
  }
}
