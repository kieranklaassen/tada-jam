import type { Paper } from './layout'
import { makeRng, type Rng } from './rng'

// Stretched crepe paper and florist wire. Every shape is filled, ribbed along
// the way it was stretched, darker at its root and edge, and frilled where it
// ends. Wire is wound in tape. Painted once into sprites and stamped.

export type Ctx = CanvasRenderingContext2D
export type PathOf = (c: Ctx) => void
export type Box = { x: number; y: number; w: number; h: number }
export type P = readonly [number, number]

/** The three papers, their undersides, and the bow that goes on each. */
export const PAPER: Record<Paper, { deep: string; main: string; light: string; under: string; bow: string; bowDeep: string }> = {
  0: { deep: '#a31f24', main: '#dc3a34', light: '#ef6256', under: '#f7b9ad', bow: '#f6ead0', bowDeep: '#c9ab77' },
  1: { deep: '#c98a12', main: '#f6c331', light: '#ffe077', under: '#fff1bd', bow: '#b8397a', bowDeep: '#7d1f52' },
  2: { deep: '#2b86bd', main: '#63bfea', light: '#b4e6fb', under: '#dcf4ff', bow: '#f6ead0', bowDeep: '#c9ab77' },
}
export const SKIN = '#efc2a0'
export const TAPE = '#4b6b3c'
export const CREAM = '#f3e6cb'

export const surface = {
  make(width: number, height: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return { canvas, ctx: canvas.getContext('2d')! }
  },
}

export const oval = (x: number, y: number, rx: number, ry = rx, rot = 0): PathOf => (c) => { c.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2) }
export const poly = (...p: number[]): PathOf => (c) => {
  c.moveTo(p[0], p[1])
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1])
  c.closePath()
}
/** A closed smooth line through points. */
export const blob = (...p: number[]): PathOf => (c) => {
  const n = p.length / 2
  const mx = (i: number) => (p[(i % n) * 2] + p[((i + 1) % n) * 2]) / 2
  const my = (i: number) => (p[(i % n) * 2 + 1] + p[((i + 1) % n) * 2 + 1]) / 2
  c.moveTo(mx(n - 1), my(n - 1))
  for (let i = 0; i < n; i++) c.quadraticCurveTo(p[i * 2], p[i * 2 + 1], mx(i), my(i))
  c.closePath()
}
export const rounded = (x: number, y: number, w: number, h: number, r: number): PathOf => (c) => {
  const k = Math.min(r, w / 2, h / 2)
  c.moveTo(x + k, y)
  c.arcTo(x + w, y, x + w, y + h, k)
  c.arcTo(x + w, y + h, x, y + h, k)
  c.arcTo(x, y + h, x, y, k)
  c.arcTo(x, y, x + w, y, k)
  c.closePath()
}
/** A ring with a frilled edge. */
export const frilled = (x: number, y: number, rx: number, ry: number, waves: number, amp: number, turn = 0): PathOf => (c) => {
  const n = waves * 6
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + (amp / Math.max(rx, ry)) * Math.sin(a * waves + turn) + (amp / Math.max(rx, ry)) * 0.4 * Math.sin(a * waves * 1.7 + 1)
    const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k
    if (i === 0) c.moveTo(px, py)
    else c.lineTo(px, py)
  }
  c.closePath()
}

export function mix(a: string, b: string, t: number): string {
  const p = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16)
  const h = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0')
  return `#${h(0)}${h(1)}${h(2)}`
}
export const darker = (c: string, t = 0.35) => mix(c, '#2a1a22', t)
export const lighter = (c: string, t = 0.35) => mix(c, '#fff8e8', t)

/** The ribs of stretched crepe over a box, along a direction. Called inside a clip. */
export function ribs(c: Ctx, rng: Rng, box: Box, color: string, along = Math.PI / 2, gap = 4.2, strength = 1): void {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2, half = Math.hypot(box.w, box.h) / 2
  c.save()
  c.translate(cx, cy)
  c.rotate(along - Math.PI / 2)
  c.lineCap = 'butt'
  const step = gap
  for (const [tone, alpha, w] of [[darker(color, 0.5), 0.26, 1.5], [lighter(color, 0.6), 0.3, 1.2]] as const) {
    c.strokeStyle = tone
    c.globalAlpha = alpha * strength
    c.lineWidth = w
    c.beginPath()
    for (let x = -half; x < half; x += step) {
      const j = x + (rng.next() - 0.5) * gap * 1.1
      c.moveTo(j, -half)
      for (let y = -half; y < half; y += 26) c.lineTo(j + (rng.next() - 0.5) * 2.2, y + 26)
    }
    c.stroke()
  }
  c.restore()
}

/** One piece of crepe: filled, ribbed, darker towards its edge. */
export function crepe(c: Ctx, rng: Rng, path: PathOf, box: Box, color: string, opts: { along?: number; gap?: number; edge?: number; strength?: number } = {}): void {
  c.save()
  c.beginPath()
  path(c)
  c.fillStyle = color
  c.fill()
  c.clip()
  ribs(c, rng, box, color, opts.along, opts.gap, opts.strength)
  const edge = opts.edge ?? 1
  for (const [w, a] of [[22, 0.13], [10, 0.18]] as const) {
    c.beginPath()
    path(c)
    c.strokeStyle = darker(color, 0.6)
    c.globalAlpha = a * edge
    c.lineWidth = w
    c.stroke()
  }
  c.restore()
  // The cut edge catches the light.
  c.beginPath()
  path(c)
  c.strokeStyle = lighter(color, 0.45)
  c.globalAlpha = 0.5
  c.lineWidth = 1.4
  c.stroke()
  c.globalAlpha = 1
}

/** A row of cut strips that hang from a line: fur, needles, a moustache. */
export function fringe(c: Ctx, rng: Rng, a: P, b: P, length: number, color: string, opts: { w?: number; lean?: number; spread?: number } = {}): void {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), w = opts.w ?? 7, n = Math.max(3, Math.round(d / (w * 0.72)))
  const ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t
    const tilt = (opts.lean ?? 0) + (t - 0.5) * (opts.spread ?? 0) + (rng.next() - 0.5) * 0.22
    const l = length * (0.82 + rng.next() * 0.34)
    // Down from the line, whichever way the line runs.
    const dx = -uy * Math.cos(tilt) + ux * Math.sin(tilt), dy = ux * Math.cos(tilt) + uy * Math.sin(tilt)
    const tone = rng.next()
    c.fillStyle = tone < 0.3 ? darker(color, 0.22) : tone > 0.75 ? lighter(color, 0.24) : color
    c.beginPath()
    c.moveTo(x - ux * w * 0.5, y - uy * w * 0.5)
    c.quadraticCurveTo(x + dx * l * 0.6 - ux * w * 0.5, y + dy * l * 0.6 - uy * w * 0.5, x + dx * l, y + dy * l)
    c.quadraticCurveTo(x + dx * l * 0.6 + ux * w * 0.5, y + dy * l * 0.6 + uy * w * 0.5, x + ux * w * 0.5, y + uy * w * 0.5)
    c.fill()
  }
}

function line(c: Ctx, pts: readonly P[], closed = false): void {
  c.beginPath()
  c.moveTo(pts[0][0], pts[0][1])
  for (const p of pts.slice(1)) c.lineTo(p[0], p[1])
  if (closed) c.closePath()
}
export const arc = (x: number, y: number, rx: number, ry: number, from: number, to: number, n = 24): P[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = from + ((to - from) * i) / n; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry] as const })

/** Florist wire wound in tape. */
export function wire(c: Ctx, pts: readonly P[], width: number, color = TAPE, closed = false): void {
  c.lineCap = c.lineJoin = 'round'
  for (const [tone, w, off] of [[darker(color, 0.5), width, 0], [color, width * 0.74, 0], [lighter(color, 0.4), width * 0.22, -width * 0.16]] as const) {
    c.save()
    c.translate(off, off)
    line(c, pts, closed)
    c.strokeStyle = tone
    c.lineWidth = w
    c.stroke()
    c.restore()
  }
  // The turns of the tape.
  c.strokeStyle = darker(color, 0.55)
  c.globalAlpha = 0.55
  c.lineWidth = Math.max(1, width * 0.13)
  c.beginPath()
  const all = closed ? [...pts, pts[0]] : pts
  let left = 0
  for (let i = 1; i < all.length; i++) {
    const [ax, ay] = all[i - 1], [bx, by] = all[i], d = Math.hypot(bx - ax, by - ay)
    if (d === 0) continue
    const ux = (bx - ax) / d, uy = (by - ay) / d
    for (; left < d; left += width * 0.85) {
      const x = ax + ux * left, y = ay + uy * left, h = width * 0.36
      c.moveTo(x - uy * h - ux * h * 0.6, y + ux * h - uy * h * 0.6)
      c.lineTo(x + uy * h + ux * h * 0.6, y - ux * h + uy * h * 0.6)
    }
    left -= d
  }
  c.stroke()
  c.globalAlpha = 1
}

/** A crepe flower: a fan of ribs in a frilled ring, dark at its root. */
export function rosette(c: Ctx, rng: Rng, x: number, y: number, rx: number, ry: number, color: string, rings = 3, root = darker(color, 0.55)): void {
  for (let k = 0; k < rings; k++) {
    const q = 1 - k * (0.8 / rings), path = frilled(x, y, rx * q, ry * q, 9 + (k % 2) * 2, Math.min(rx, ry) * 0.1, k * 1.7)
    c.beginPath()
    path(c)
    c.fillStyle = k % 2 ? darker(color, 0.14) : color
    c.fill()
    c.save()
    c.clip()
    const n = 46
    for (const [tone, a] of [[root, 0.5], [lighter(color, 0.5), 0.4]] as const) {
      c.strokeStyle = tone
      c.globalAlpha = a
      c.lineWidth = 1.1
      c.beginPath()
      for (let i = 0; i < n; i++) {
        const t = ((i + rng.next()) / n) * Math.PI * 2, o = 0.5 + rng.next() * 0.55
        c.moveTo(x + Math.cos(t) * rx * q * 0.08, y + Math.sin(t) * ry * q * 0.08)
        c.lineTo(x + Math.cos(t) * rx * q * o, y + Math.sin(t) * ry * q * o)
      }
      c.stroke()
    }
    c.restore()
    c.beginPath()
    path(c)
    c.strokeStyle = lighter(color, 0.5)
    c.globalAlpha = 0.5
    c.lineWidth = 1.3
    c.stroke()
    c.globalAlpha = 1
  }
  c.fillStyle = root
  c.beginPath()
  c.ellipse(x, y, rx * 0.12, ry * 0.12, 0, 0, Math.PI * 2)
  c.fill()
}

/** A soft flat shadow on the table, for things that stand. */
export function grounded(c: Ctx, x: number, y: number, rx: number, ry: number): void {
  for (const k of [1, 0.8, 0.6]) {
    c.fillStyle = 'rgba(58,36,40,0.13)'
    c.beginPath()
    c.ellipse(x, y, rx * k, ry * k, 0, 0, Math.PI * 2)
    c.fill()
  }
}

// --- Paper on a thing ----------------------------------------------------------

/** What a thing is the shape of, so that paper can hug it. */
export type Shape = { fills?: readonly PathOf[]; lines?: readonly { pts: readonly P[]; w: number; closed?: boolean }[]; marks?: readonly (readonly P[])[] }
// `marks` are what shows through as folds: where the paper sinks in.

function grown(c: Ctx, s: Shape, by: number, color: string): void {
  c.fillStyle = c.strokeStyle = color
  c.lineJoin = c.lineCap = 'round'
  for (const f of s.fills ?? []) {
    c.beginPath()
    f(c)
    c.fill()
    if (by > 0) { c.lineWidth = by * 2; c.stroke() }
  }
  for (const l of s.lines ?? []) {
    line(c, l.pts, l.closed)
    c.lineWidth = Math.max(0.5, l.w + by * 2)
    c.stroke()
  }
}

/** The paper pulled over a shape: grown outward for its thickness, wound in bands, ribbed. `under` is its pale back. */
export function wrapped(c: Ctx, rng: Rng, s: Shape, box: Box, paper: Paper, under: boolean): void {
  const p = PAPER[paper], main = under ? p.under : p.main
  grown(c, s, 13, under ? p.main : p.deep)
  grown(c, s, 10, mix(main, under ? p.main : p.deep, 0.35))
  grown(c, s, 6, main)
  c.globalCompositeOperation = 'source-atop'
  // Bands, one turn over the last.
  const tilt = -0.34, half = Math.hypot(box.w, box.h) / 2
  c.save()
  c.translate(box.x + box.w / 2, box.y + box.h / 2)
  c.rotate(tilt)
  for (let y = -half, i = 0; y < half; y += 46, i++) {
    c.globalAlpha = 0.42
    c.fillStyle = i % 2 ? p.light : p.main
    c.fillRect(-half, y, half * 2, 46)
    c.globalAlpha = 0.8
    c.strokeStyle = p.deep
    c.lineWidth = 3
    c.beginPath()
    for (let x = -half; x <= half; x += 12) {
      const q = y + Math.sin(x * 0.21 + i) * 1.8 + Math.sin(x * 0.09 + i * 2) * 2
      if (x === -half) c.moveTo(x, q)
      else c.lineTo(x, q)
    }
    c.stroke()
    c.globalAlpha = 0.55
    c.strokeStyle = under ? '#ffffff' : p.light
    c.lineWidth = 2
    c.translate(0, 3.4)
    c.stroke()
    c.translate(0, -3.4)
  }
  c.restore()
  ribs(c, rng, box, main, Math.PI / 2 + tilt, 5, 1.1)
  for (const [tone, w, a, off] of [[p.deep, 9, 0.5, 0], [p.light, 3, 0.8, 4]] as const) {
    c.strokeStyle = tone
    c.lineWidth = w
    c.globalAlpha = a
    c.lineJoin = c.lineCap = 'round'
    c.save()
    c.translate(off, off)
    for (const m of s.marks ?? []) { line(c, m); c.stroke() }
    c.restore()
  }
  // Light from above, dark below.
  const g = c.createLinearGradient(0, box.y, 0, box.y + box.h)
  g.addColorStop(0, 'rgba(255,250,230,0.26)')
  g.addColorStop(0.5, 'rgba(255,250,230,0)')
  g.addColorStop(1, 'rgba(50,15,30,0.28)')
  c.globalAlpha = 1
  c.fillStyle = g
  c.fillRect(box.x, box.y, box.w, box.h)
  if (paper === 2 && !under) {
    // See-through: thinned, with a glint left on it.
    c.globalCompositeOperation = 'destination-out'
    c.globalAlpha = 0.46
    c.fillStyle = '#000'
    c.fillRect(box.x, box.y, box.w, box.h)
    c.globalCompositeOperation = 'source-atop'
    c.globalAlpha = 0.5
    c.fillStyle = '#ffffff'
    for (let i = 0; i < 4; i++) {
      c.beginPath()
      c.ellipse(box.x + box.w * (0.25 + 0.18 * i), box.y + box.h * (0.3 + 0.13 * (i % 3)), 5, 34, 0.5, 0, Math.PI * 2)
      c.fill()
    }
  }
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
}

// --- Sprites -------------------------------------------------------------------

export type Painter = (c: Ctx, rng: Rng) => void
export type Sprite = { name: string; box: Box; paint: Painter }
export const sprite = (name: string, x: number, y: number, w: number, h: number, paint: Painter): Sprite => ({ name, box: { x, y, w, h }, paint })

/** Painted sprites at one scale of the surface. A new scale paints them anew, each the first time it is stamped. */
export class Stamps {
  private readonly made = new Map<string, HTMLCanvasElement>()
  scale = 0
  stamped = 0
  painted = 0

  at(scale: number): void {
    const step = Math.max(0.5, Math.min(2, Math.ceil(scale * 4) / 4))
    if (step === this.scale) return
    this.scale = step
    this.clear()
  }

  /** Gives the memory back now, not when the browser gets to it. */
  clear(): void {
    for (const image of this.made.values()) image.width = image.height = 0
    this.made.clear()
  }

  has(s: Sprite): boolean { return this.made.has(s.name) }

  warm(s: Sprite): HTMLCanvasElement {
    let image = this.made.get(s.name)
    if (!image) {
      const made = surface.make(Math.ceil(s.box.w * this.scale), Math.ceil(s.box.h * this.scale))
      made.ctx.scale(this.scale, this.scale)
      made.ctx.translate(-s.box.x, -s.box.y)
      let seed = 17
      for (const ch of s.name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
      s.paint(made.ctx, makeRng(seed))
      image = made.canvas
      this.made.set(s.name, image)
      this.painted++
    }
    return image
  }

  stamp(c: Ctx, s: Sprite): void {
    const image = this.warm(s)
    this.stamped++
    c.drawImage(image, s.box.x, s.box.y, s.box.w, s.box.h)
  }

  stampAt(c: Ctx, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = sx): void {
    c.save()
    c.translate(x, y)
    if (rot) c.rotate(rot)
    if (sx !== 1 || sy !== 1) c.scale(sx, sy)
    this.stamp(c, s)
    c.restore()
  }
}
