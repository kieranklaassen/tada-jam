import { makeRng, type Rng } from './rng'

// The sponge and the five colours. Every shape is one flat opaque colour with
// no outline, and its only shading is a second colour dabbed with a sponge
// along one side. Shapes are painted once into sprites and stamped.

export const INK = '#1c2945'
export const TEAL = '#5aa69c'
export const OCHRE = '#e8ac34'
export const CREAM = '#f7edd4'
/** The sausage's own colour. Nothing else that size in the room has it. */
export const CORAL = '#e4512f'
/** What the sponge makes of them: one colour dabbed over another until it covers. */
export const DEEP = '#1f5a66'
export const SKIN = '#f2bd93'
export const AQUA = '#bfe0d3'

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

export type Side = 'left' | 'right' | 'top' | 'bottom'
export type Box = { x: number; y: number; w: number; h: number }

/** How much of the sponge is used, from the quality tier. */
export const sponge = { dabs: 1 }

/** One touch of the sponge over a box: thick along one side and thinning towards `reach` of the way across. */
export function dabs(ctx: Ctx, rng: Rng, box: Box, color: string, side: Side, reach = 0.5, size = 2.2, thick = 1): void {
  const n = Math.round((box.w * box.h) / (size * size) * 0.16 * reach * thick * sponge.dabs)
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    // Squared, so the dabs crowd at the side; the far ones are the fewest and the smallest.
    const u = rng.next() ** 1.9 * reach, v = rng.next()
    const x = side === 'left' ? box.x + u * box.w : side === 'right' ? box.x + (1 - u) * box.w : box.x + v * box.w
    const y = side === 'top' ? box.y + u * box.h : side === 'bottom' ? box.y + (1 - u) * box.h : box.y + v * box.h
    const r = size * (0.35 + rng.next() * 0.8) * (1 - 0.5 * (u / reach))
    ctx.moveTo(x + r, y)
    ctx.ellipse(x, y, r, r * (0.7 + rng.next() * 0.5), rng.next() * 3, 0, Math.PI * 2)
  }
  ctx.fill()
}

/** A flat shape with a sponged side. */
export function shape(ctx: Ctx, rng: Rng, path: PathOf, box: Box, color: string, shade?: { color: string; side: Side; reach?: number; size?: number; thick?: number }): void {
  ctx.beginPath()
  path(ctx)
  ctx.fillStyle = color
  ctx.fill()
  if (!shade) return
  ctx.save()
  ctx.beginPath()
  path(ctx)
  ctx.clip()
  dabs(ctx, rng, box, shade.color, shade.side, shade.reach, shade.size, shade.thick)
  ctx.restore()
}

export const ellipse = (x: number, y: number, rx: number, ry: number, rot = 0): PathOf => (ctx) => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
export const boxOf = (x: number, y: number, rx: number, ry: number): Box => ({ x: x - rx, y: y - ry, w: rx * 2, h: ry * 2 })
export const poly = (...p: number[]): PathOf => (ctx) => {
  ctx.moveTo(p[0], p[1])
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1])
  ctx.closePath()
}
export const rounded = (x: number, y: number, w: number, h: number, r: number): PathOf => (ctx) => {
  const k = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + k, y)
  ctx.arcTo(x + w, y, x + w, y + h, k)
  ctx.arcTo(x + w, y + h, x, y + h, k)
  ctx.arcTo(x, y + h, x, y, k)
  ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}
/** A closed smooth line through points. */
export const blob = (...p: number[]): PathOf => (ctx) => {
  const n = p.length / 2
  const mx = (i: number) => (p[(i % n) * 2] + p[((i + 1) % n) * 2]) / 2
  const my = (i: number) => (p[(i % n) * 2 + 1] + p[((i + 1) % n) * 2 + 1]) / 2
  ctx.moveTo(mx(n - 1), my(n - 1))
  for (let i = 0; i < n; i++) ctx.quadraticCurveTo(p[i * 2], p[i * 2 + 1], mx(i), my(i))
  ctx.closePath()
}

export type Painter = (ctx: Ctx, rng: Rng) => void
export type Sprite = { name: string; box: Box; paint: Painter }

/** A named picture: where its box lies about its own origin, and how it is painted. */
export function sprite(name: string, x: number, y: number, w: number, h: number, paint: Painter): Sprite {
  return { name, box: { x, y, w, h }, paint }
}

/** Painted sprites at one scale of the surface. A new scale paints them anew, each the first time it is stamped. */
export class Stamps {
  private readonly made = new Map<string, CanvasImageSource>()
  private scale = 0
  private dabs = 1
  stamped = 0
  painted = 0

  at(scale: number): void {
    // Steps of a quarter, so that a surface that changes by a pixel does not paint everything again.
    const step = Math.max(0.5, Math.min(2.5, Math.ceil(scale * 4) / 4))
    if (step === this.scale && this.dabs === sponge.dabs) return
    this.scale = step
    this.dabs = sponge.dabs
    this.made.clear()
  }

  /** Paints a sprite now, unless it is painted. */
  warm(s: Sprite): CanvasImageSource {
    let image = this.made.get(s.name)
    if (!image) {
      const made = surface.make(Math.ceil(s.box.w * this.scale), Math.ceil(s.box.h * this.scale))
      made.ctx.scale(this.scale, this.scale)
      made.ctx.translate(-s.box.x, -s.box.y)
      // Seeded by its name, so the dabs never move between visits.
      let seed = 17
      for (const c of s.name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
      s.paint(made.ctx, makeRng(seed))
      image = made.canvas
      this.made.set(s.name, image)
      this.painted++
    }
    return image
  }

  stamp(ctx: Ctx, s: Sprite): void {
    const image = this.warm(s)
    this.stamped++
    ctx.drawImage(image, s.box.x, s.box.y, s.box.w, s.box.h)
  }

  stampAt(ctx: Ctx, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = sx): void {
    ctx.save()
    ctx.translate(x, y)
    if (rot) ctx.rotate(rot)
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
    this.stamp(ctx, s)
    ctx.restore()
  }
}
