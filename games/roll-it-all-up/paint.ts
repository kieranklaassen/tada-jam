import { makeRng, type Rng } from './rng'

// Biscuit and piped icing. Every shape is baked: a flat brown fill with a
// darker baked edge and crumbs. Everything drawn on it is icing: a round white
// line with a soft shadow under it and a light along its top. Shapes are
// painted once into sprites and stamped.

export const BISCUIT = '#bd7a3e'
export const BAKED = '#8b4c22'
export const DARK = '#6e3b1e'
export const PALE = '#d89c5c'
export const ICING = '#fffaf0'
export const SHADE = '#e8d6c2'
export const CHOC = '#3a1c10'
export const RED = '#d2322f'
export const GREEN = '#3f8f55'
export const GOLD = '#f2b233'

export type Ctx = CanvasRenderingContext2D
export type PathOf = (ctx: Ctx) => void

/** Makes a drawing surface. Replaced in tests, which have no document. */
export const surface = {
  make(width: number, height: number): { canvas: CanvasImageSource; ctx: Ctx } {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return { canvas, ctx: canvas.getContext('2d')! }
  },
}

export function crumbs(ctx: Ctx, rng: Rng, x: number, y: number, w: number, h: number, each = 260): void {
  for (const color of ['rgba(80,38,14,0.22)', 'rgba(255,214,160,0.2)']) {
    ctx.fillStyle = color
    ctx.beginPath()
    for (let i = 0; i < (w * h) / each; i++) {
      const px = x + rng.next() * w, py = y + rng.next() * h, r = 0.8 + rng.next() * 1.9
      ctx.moveTo(px + r, py)
      ctx.ellipse(px, py, r, r * 0.75, 0, 0, 7)
    }
    ctx.fill()
  }
}

/** A baked shape. `size` is about how far it reaches from its origin. */
export function biscuit(ctx: Ctx, rng: Rng, path: PathOf, size: number, color = BISCUIT, edge = BAKED): void {
  ctx.save()
  ctx.beginPath()
  path(ctx)
  ctx.fillStyle = color
  ctx.fill()
  ctx.clip()
  crumbs(ctx, rng, -size, -size, size * 2, size * 2, 70)
  ctx.strokeStyle = edge
  ctx.lineJoin = 'round'
  for (const [w, a] of [[14, 0.18], [8, 0.3], [3.5, 0.75]] as const) {
    ctx.globalAlpha = a
    ctx.lineWidth = w
    ctx.beginPath()
    path(ctx)
    ctx.stroke()
  }
  ctx.restore()
}

/** A piped line. */
export function pipe(ctx: Ctx, path: PathOf, width = 5, color = ICING): void {
  ctx.save()
  ctx.lineCap = ctx.lineJoin = 'round'
  const run = (dx: number, dy: number, w: number, c: string) => { ctx.save(); ctx.translate(dx, dy); ctx.beginPath(); path(ctx); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(); ctx.restore() }
  run(0.8, 1.8, width, 'rgba(70,32,12,0.42)')
  run(0, 0, width, color)
  if (color === ICING) run(0.5, width * 0.22, width * 0.34, SHADE)
  ctx.restore()
}
export function dot(ctx: Ctx, x: number, y: number, r: number, color = ICING): void {
  ctx.fillStyle = 'rgba(70,32,12,0.4)'
  ctx.beginPath(); ctx.arc(x + 0.8, y + 1.6, r, 0, 7); ctx.fill()
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.28, 0, 7); ctx.fill()
}
/** A boiled sweet: clear colour with a light in it. */
export function sweet(ctx: Ctx, path: PathOf, color: string): void {
  ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill()
  ctx.save(); ctx.beginPath(); path(ctx); ctx.clip()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 5; ctx.translate(3, 4); ctx.beginPath(); path(ctx); ctx.stroke()
  ctx.restore()
}
export const ell = (x: number, y: number, rx: number, ry = rx, rot = 0): PathOf => (c) => { c.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2) }
export const line = (...p: number[]): PathOf => (c) => { c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]) }
export const poly = (...p: number[]): PathOf => (c) => { line(...p)(c); c.closePath() }
/** A closed smooth line through points. */
export const blob = (...p: number[]): PathOf => (c) => {
  const n = p.length / 2, mx = (i: number) => (p[(i % n) * 2] + p[((i + 1) % n) * 2]) / 2, my = (i: number) => (p[(i % n) * 2 + 1] + p[((i + 1) % n) * 2 + 1]) / 2
  c.moveTo(mx(n - 1), my(n - 1))
  for (let i = 0; i < n; i++) c.quadraticCurveTo(p[i * 2], p[i * 2 + 1], mx(i), my(i))
  c.closePath()
}
export const rounded = (x: number, y: number, w: number, h: number, r: number): PathOf => (c) => {
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
}

export type Sprite = { name: string; x: number; y: number; w: number; h: number; paint: (ctx: Ctx, rng: Rng) => void }
export const sprite = (name: string, x: number, y: number, w: number, h: number, paint: Sprite['paint']): Sprite => ({ name, x, y, w, h, paint })
/** A picture about its own middle. */
export const middle = (name: string, half: number, paint: Sprite['paint']): Sprite => sprite(name, -half, -half, half * 2, half * 2, paint)

/** Painted sprites at one scale of the surface. */
export class Stamps {
  private readonly made = new Map<string, CanvasImageSource>()
  private scale = 0
  stamped = 0
  painted = 0

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
      let seed = 17
      for (const c of s.name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
      s.paint(made.ctx, makeRng(seed))
      image = made.canvas
      this.made.set(s.name, image)
      this.painted++
    }
    return image
  }
  stamp(ctx: Ctx, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = sx): void {
    const image = this.warm(s)
    this.stamped++
    ctx.save()
    ctx.translate(x, y)
    if (rot) ctx.rotate(rot)
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
    ctx.drawImage(image, s.x, s.y, s.w, s.h)
    ctx.restore()
  }
}
