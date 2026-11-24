import { makeRng, type Rng } from './rng'

// Two materials. The rug is tufts: short dabs of one dyed colour each, so that
// every printed edge is fuzzy by the width of a tuft. The toys are hard: one
// clean edge, a soft round shade and a small sharp light.

export const C = {
  grass: '#6f9d4f', grassDark: '#5b8842', road: '#8a8378', roadEdge: '#6d675e', line: '#efe4c6', water: '#4a8fb8', waterLight: '#79b6d2', night: '#35426f', star: '#f2d977', bed: '#e8cf8c', bedDark: '#d3b56c', ridge: '#c9825a', border: '#9c4a3c', flower: '#e2698a',
  cream: '#fbf1dc', creamShade: '#d9c19b', face: '#8a5a44', faceDark: '#6b4231', muzzle: '#c98f77', ink: '#2b1d1a', white: '#fffaf0', tongue: '#e2687a',
  blue: '#3f74c9', pink: '#ee7fa6', yellow: '#f3bf2f', green: '#3f9f6b', orange: '#ee7a2e',
  wood: '#d9a55f', woodDark: '#b27c3c', red: '#d2473d', glass: '#dfeef0', milk: '#fffdf4', quilt: '#5d6cb5', quiltLight: '#8c98d6', quiltDark: '#465295',
} as const
/** What each of the five is known by. */
export const OWN = [C.blue, C.pink, C.yellow, C.green, C.orange] as const

export type Ctx = CanvasRenderingContext2D
export type Make = (width: number, height: number) => { canvas: CanvasImageSource; ctx: Ctx }

/** Makes a drawing surface. Replaced in tests, which have no document. */
export const surface: { make: Make } = {
  make(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return { canvas, ctx: canvas.getContext('2d')! }
  },
}

/** How far apart the tufts of the rug are, from the quality tier. */
export const pile = { apart: 5 }

export function mix(a: string, b: string, k: number): string {
  const p = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16)
  const c = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k).toString(16).padStart(2, '0')
  return `#${c(1)}${c(3)}${c(5)}`
}

export function disc(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, rot = 0): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + k, y)
  ctx.arcTo(x + w, y, x + w, y + h, k)
  ctx.arcTo(x + w, y + h, x, y + h, k)
  ctx.arcTo(x, y + h, x, y, k)
  ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}
/** A hard toy part: filled with a round shade, and a light at its upper left. */
export function moulded(ctx: Ctx, path: () => void, color: string, b: { x: number; y: number; w: number; h: number }, gloss = 0.5): void {
  const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w * 0.5, b.y + b.h)
  g.addColorStop(0, mix(color, '#ffffff', 0.28))
  g.addColorStop(0.45, color)
  g.addColorStop(1, mix(color, '#2b1d1a', 0.34))
  path()
  ctx.fillStyle = g
  ctx.fill()
  if (gloss <= 0) return
  ctx.save()
  path()
  ctx.clip()
  ctx.globalAlpha = gloss
  disc(ctx, b.x + b.w * 0.32, b.y + b.h * 0.18, b.w * 0.2, b.h * 0.07, '#ffffff', -0.3)
  ctx.restore()
}

export type Sprite = { name: string; box: { x: number; y: number; w: number; h: number }; paint: (ctx: Ctx, rng: Rng) => void }
export const sprite = (name: string, x: number, y: number, w: number, h: number, paint: Sprite['paint']): Sprite => ({ name, box: { x, y, w, h }, paint })

/** Painted sprites at one scale of the surface. A new scale paints them anew, each the first time it is stamped. */
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
      const made = surface.make(Math.ceil(s.box.w * this.scale), Math.ceil(s.box.h * this.scale))
      made.ctx.scale(this.scale, this.scale)
      made.ctx.translate(-s.box.x, -s.box.y)
      let seed = 23
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
