import type { Fruit } from './measure'

// The look: comic-book halftone. A printed page: black brush-ink outlines,
// primaries broken into coarse dots, panel borders, speed lines and impact
// bursts on off-white newsprint. This module holds the palette and the few
// drawing helpers every figure uses. The dots go on the setting and the
// characters; the fruit, its pieces and the board stay flat (ART.md, "The look").

export const INK = '#17130f'
export const PAPER = '#f2e8d2'
export const WHITE = '#fffaf0'
export const RED = '#e3382b'
export const YELLOW = '#f7c518'
export const BLUE = '#2468c8'
export const GREEN = '#2fa24a'
/** The board: a plain pale slab, cool against the three fruit colours. */
export const BOARD = '#dce6ea'
export const BOARD_EDGE = '#9fb3bc'
/** The flat colour of each fruit, and the darker line round it. Nothing else is drawn on a fruit. */
export const FLESH: Readonly<Record<Fruit, string>> = { long: RED, middle: YELLOW, short: GREEN }
export const RIND: Readonly<Record<Fruit, string>> = { long: '#8f1c14', middle: '#9a7200', short: '#17602a' }
/** The same three as pale tints, for the ruled parts of a share on the rail and on a ticket. */
export const TINT: Readonly<Record<Fruit, string>> = { long: '#f4b3aa', middle: '#fae7a0', short: '#aadcb4' }

/** The pitch of the dot screen in design units: coarse enough to see in a still at 1180 by 820. */
export const DOT_PITCH = 8

export type Path = (ctx: CanvasRenderingContext2D) => void

/**
 * Dot screens, made once for a surface and kept: one small tile a colour and tone, laid at 45 degrees. A tile is
 * a whole number of device pixels and is drawn in device pixels whatever the surface is scaled by, so the dots
 * do not shimmer.
 */
export class Screens {
  private readonly tiles = new Map<string, CanvasPattern>()
  /** `k` is how many device pixels one design unit takes. */
  constructor(private readonly k: number) {}

  /** A screen of `colour` dots covering about `tone` of the paper, 0 to 1. */
  of(ctx: CanvasRenderingContext2D, colour: string, tone: number): CanvasPattern | string {
    const key = `${colour}/${tone}`
    const kept = this.tiles.get(key)
    if (kept) return kept
    const size = Math.max(4, Math.round(DOT_PITCH * this.k * Math.SQRT2))
    const tile = document.createElement('canvas')
    tile.width = tile.height = size
    const to = tile.getContext('2d')
    if (!to) return colour
    const radius = size * Math.sqrt(Math.max(0, Math.min(0.9, tone)) / (2 * Math.PI))
    to.fillStyle = colour
    for (const [x, y] of [[0, 0], [size, 0], [0, size], [size, size], [size / 2, size / 2]]) {
      to.beginPath()
      to.arc(x, y, radius, 0, Math.PI * 2)
      to.fill()
    }
    const pattern = ctx.createPattern(tile, 'repeat')
    if (!pattern) return colour
    pattern.setTransform(new DOMMatrix([1 / this.k, 0, 0, 1 / this.k, 0, 0]))
    this.tiles.set(key, pattern)
    return pattern
  }
}

/** Fills a shape flat, lays a dot screen over it when given one, and inks its outline. */
export function inked(ctx: CanvasRenderingContext2D, path: Path, fill: string | null, line = 5, screen?: CanvasPattern | string): void {
  ctx.beginPath()
  path(ctx)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (screen) {
    ctx.fillStyle = screen
    ctx.fill()
  }
  if (line > 0) {
    ctx.lineWidth = line
    ctx.strokeStyle = INK
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

/** Lays a dot screen inside a shape, over part of it: the shaded side of a figure. */
export function shade(ctx: CanvasRenderingContext2D, path: Path, screen: CanvasPattern | string, over: Path): void {
  ctx.save()
  ctx.beginPath()
  path(ctx)
  ctx.clip()
  ctx.beginPath()
  over(ctx)
  ctx.fillStyle = screen
  ctx.fill()
  ctx.restore()
}

export const rect = (x: number, y: number, w: number, h: number): Path => (ctx) => ctx.rect(x, y, w, h)
export const oval = (x: number, y: number, rx: number, ry: number, turn = 0): Path => (ctx) => ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
export const poly = (points: readonly (readonly [number, number])[]): Path => (ctx) => {
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}
/** A rectangle with rounded corners, without relying on `roundRect`. */
export const slab = (x: number, y: number, w: number, h: number, r: number): Path => (ctx) => {
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** A panel of the page: paper inside a heavy black border, with a hard shadow down and to the right. */
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, screen?: CanvasPattern | string): void {
  ctx.fillStyle = INK
  ctx.fillRect(x + 6, y + 6, w, h)
  inked(ctx, rect(x, y, w, h), fill, 6, screen)
}

/** An impact burst: a star of uneven points, seeded so it is the same star every time. */
export function burst(ctx: CanvasRenderingContext2D, x: number, y: number, inner: number, outer: number, points: number, seed: number, fill: string, line = 4): void {
  const star: [number, number][] = []
  for (let i = 0; i < points * 2; i++) {
    const noise = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
    const wobble = 0.82 + 0.36 * (noise - Math.floor(noise))
    const radius = (i % 2 ? inner : outer) * wobble
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    star.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius])
  }
  inked(ctx, poly(star), fill, line)
}

/** Speed lines: tapered black strokes fanning from a point, as a blade or a flung thing leaves behind. */
export function speedLines(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, spread: number, from: number, to: number, count: number): void {
  ctx.fillStyle = INK
  for (let i = 0; i < count; i++) {
    const a = angle + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0)
    const start = from + ((i * 37) % 23), end = to - ((i * 53) % 31)
    const cos = Math.cos(a), sin = Math.sin(a), half = 2.2 + (i % 3)
    ctx.beginPath()
    ctx.moveTo(x + cos * start - sin * half, y + sin * start + cos * half)
    ctx.lineTo(x + cos * end, y + sin * end)
    ctx.lineTo(x + cos * start + sin * half, y + sin * start - cos * half)
    ctx.closePath()
    ctx.fill()
  }
}

/** An eye: a white with a pupil that looks towards (dx, dy), each from -1 to 1. */
export function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dx = 0, dy = 0): void {
  inked(ctx, oval(x, y, r, r * 1.15), WHITE, Math.max(2, r * 0.28))
  ctx.beginPath()
  ctx.arc(x + dx * r * 0.42, y + dy * r * 0.45, r * 0.46, 0, Math.PI * 2)
  ctx.fillStyle = INK
  ctx.fill()
}

/**
 * An eye that may be out on a stalk, as a comic draws a stare: `pop` of the way out towards (ox, oy), given in
 * eye radii, and larger the further out it is. At rest it is an eye like any other.
 */
export function eyeOut(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dx: number, dy: number, pop: number, ox: number, oy: number): void {
  if (pop <= 0.02) {
    eye(ctx, x, y, r, dx, dy)
    return
  }
  const ex = x + ox * r * 4.2 * pop, ey = y + oy * r * 4.2 * pop
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(ex, ey)
  ctx.lineWidth = Math.max(3, r * 0.9)
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.lineWidth = Math.max(1, r * 0.4)
  ctx.strokeStyle = WHITE
  ctx.stroke()
  eye(ctx, ex, ey, r * (1 + 0.9 * pop), dx, dy)
}

/** A brow over an eye: one short brush stroke. Raised (1) it stands high and level; pressed down (-1) it sits on the eye and slopes to the front. */
export function brow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, raise: number): void {
  const up = r * (1.55 + 0.8 * raise), slope = raise < 0 ? -raise * r * 0.55 : 0
  ctx.beginPath()
  ctx.moveTo(x - r * 1.15, y - up - slope * 0.4)
  ctx.lineTo(x + r * 1.15, y - up + slope)
  ctx.lineWidth = Math.max(2, r * 0.5)
  ctx.strokeStyle = INK
  ctx.lineCap = 'round'
  ctx.stroke()
}
