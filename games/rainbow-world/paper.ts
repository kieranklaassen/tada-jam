import { makeRng, type Rng } from './rng'

// Kite paper on a sunny window: the look's few tools. A sheet is a flat fill of one clear hue that lets the
// light through, laid with `multiply`, so wherever two sheets overlap the colour is a deeper mixed one, for
// free. Each sheet has a slightly deeper edge and a fold line or two. Every thing is cut once into a sprite and
// stamped; nothing is blurred or filtered per frame.

export type Ctx = CanvasRenderingContext2D
export type Canvas = { image: CanvasImageSource; ctx: Ctx }
export type MakeCanvas = (width: number, height: number) => Canvas

let make: MakeCanvas = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  return { image: canvas, ctx: canvas.getContext('2d')! }
}
/** Where sprites are cut. A test hands in canvases that record instead of drawing. */
export function useCanvases(factory: MakeCanvas): void {
  make = factory
}
export function makeCanvas(width: number, height: number): Canvas {
  return make(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)))
}

/** The clear hues of the paper. */
export const HUE = {
  red: '#ff5468', orange: '#ff9a3a', yellow: '#ffd43a', green: '#52cc70', blue: '#48a4ff', violet: '#a574ff', pink: '#ff82c6', turquoise: '#34d4c4',
  skin: '#ffd2ad', cream: '#fff6dc', wicker: '#f0a04a', ink: '#2c2452',
} as const

/** A thing cut once: its picture, its size in stage units, and where its anchor is in it. */
export type Sprite = { image: CanvasImageSource; w: number; h: number; ax: number; ay: number }

/**
 * Cuts a sprite. `paint` draws in stage units round the anchor, which is the thing's foot or its pivot;
 * `left`, `top`, `right` and `bottom` say how far the picture reaches from it. `density` is device pixels per
 * stage unit, so the paper's edges are sharp at the size it is shown.
 */
export function cut(density: number, left: number, top: number, right: number, bottom: number, paint: (ctx: Ctx) => void): Sprite {
  const w = left + right, h = top + bottom
  const canvas = makeCanvas(w * density, h * density)
  const ctx = canvas.ctx
  ctx.setTransform(density, 0, 0, density, left * density, top * density)
  ctx.globalCompositeOperation = 'multiply'
  paint(ctx)
  return { image: canvas.image, w, h, ax: left, ay: top }
}

/** Stamps a sprite with its anchor at a point, turned and stretched round that anchor. The caller counts it. */
export function stamp(ctx: Ctx, sprite: Sprite, x: number, y: number, turn = 0, sx = 1, sy = 1, alpha = 1): void {
  ctx.save()
  ctx.translate(x, y)
  if (turn) ctx.rotate(turn)
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
  ctx.globalAlpha = alpha
  ctx.drawImage(sprite.image, -sprite.ax, -sprite.ay, sprite.w, sprite.h)
  ctx.restore()
}

/**
 * One sheet of paper: the path is filled with a hue that lets light through, its edge is a little deeper, and
 * `folds` straight creases cross it, each a faint dark line with a pale one beside it. `box` is the size the
 * creases are thrown across. The stream decides where they fall, so a seed gives the same paper again.
 */
export function sheet(ctx: Ctx, path: (ctx: Ctx) => void, hue: string, alpha: number, rng: Rng | null = null, folds = 0, box = 120): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = hue
  ctx.beginPath()
  path(ctx)
  ctx.fill()
  // A slightly darker rim of its own colour, so that each sheet keeps its edge where it lies over another.
  ctx.globalAlpha = alpha * 0.8
  ctx.strokeStyle = hue
  ctx.lineWidth = 2.8
  ctx.stroke()
  if (rng && folds > 0) {
    ctx.clip()
    for (let i = 0; i < folds; i++) {
      const angle = rng.next() * Math.PI, off = (rng.next() - 0.5) * box * 0.8
      const cx = Math.cos(angle), cy = Math.sin(angle), nx = -cy * off, ny = cx * off
      ctx.beginPath()
      ctx.moveTo(nx - cx * box, ny - cy * box)
      ctx.lineTo(nx + cx * box, ny + cy * box)
      ctx.globalAlpha = 0.16
      ctx.strokeStyle = hue
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(nx - cx * box + 1.4, ny - cy * box + 1.4)
      ctx.lineTo(nx + cx * box + 1.4, ny + cy * box + 1.4)
      ctx.stroke()
      ctx.globalCompositeOperation = 'multiply'
    }
  }
  ctx.restore()
}

/** A stream for one thing's creases, from the visit's seed and the thing's own number. */
export function creases(seed: number, thing: number): Rng {
  return makeRng((seed ^ Math.imul(thing + 1, 0x9e3779b1)) >>> 0)
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2)
}

/** A closed, soft-cornered shape through points, for hills, hats and bodies. */
export function blob(ctx: Ctx, points: readonly (readonly [number, number])[]): void {
  const n = points.length
  const mid = (i: number): [number, number] => [(points[i % n][0] + points[(i + 1) % n][0]) / 2, (points[i % n][1] + points[(i + 1) % n][1]) / 2]
  const start = mid(n - 1)
  ctx.moveTo(start[0], start[1])
  for (let i = 0; i < n; i++) {
    const to = mid(i)
    ctx.quadraticCurveTo(points[i][0], points[i][1], to[0], to[1])
  }
  ctx.closePath()
}

/** The pane's own pale colour, which a nearer thing lays over what is behind it. */
const VEIL = '#f7faef'

/**
 * A sprite's own outline filled with the pane's pale colour. Stamped under a thing that stands in front of
 * another, it dims what is behind, so that two translucent things never read as one.
 */
export function veilOf(sprite: Sprite, density: number): Sprite {
  const canvas = makeCanvas(sprite.w * density, sprite.h * density), ctx = canvas.ctx
  ctx.setTransform(density, 0, 0, density, 0, 0)
  ctx.drawImage(sprite.image, 0, 0, sprite.w, sprite.h)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = VEIL
  ctx.fillRect(0, 0, sprite.w, sprite.h)
  return { image: canvas.image, w: sprite.w, h: sprite.h, ax: sprite.ax, ay: sprite.ay }
}
