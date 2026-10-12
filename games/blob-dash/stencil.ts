import { makeRng } from './rng'

// Paint through a stencil, on a canvas. Every figure of the game is made of
// layers of flat spray: a soft halo of overspray round a hard-edged fill,
// gaps where the stencil's bridges held it together, a drip or two, and a
// grain where the rough wall broke the paint. A figure is painted once into a
// sprite, and a frame only stamps sprites.

/** Makes a canvas of a size in pixels. The Mount gives the document's; a test gives a stand-in. */
export type Canvases = (width: number, height: number) => HTMLCanvasElement
export type Pen = CanvasRenderingContext2D

/** A figure painted once. Sizes are in stage units; `ox` and `oy` say where in it the point it is placed by lies. */
export type Sprite = { image: HTMLCanvasElement; w: number; h: number; ox: number; oy: number }

/** The cans. Two or three flat colours to a figure, over a white undercoat. */
export const PAINT = {
  black: '#1c1a1f',
  white: '#f1ebdd',
  /** The blob, and whatever answers a touch. */
  hot: '#f0432b',
  /** The second colour: springs on a half, the rat's headphones. */
  teal: '#12a7a4',
  gold: '#e3a21f',
  grey: '#8d8a86',
  /** The inside of the blob's mouth. */
  deep: '#8f2217',
} as const

/** One can in one hand: it sprays layers onto a pen at a density of pixels to a stage unit. */
export class Can {
  readonly pen: Pen
  readonly density: number
  private readonly chance: () => number

  constructor(pen: Pen, density: number, seed: number) {
    this.pen = pen
    this.density = density
    // A stream of chance for the painted look only, so the wall is the same wall on every machine.
    const stream = makeRng(seed)
    this.chance = () => stream.next()
  }

  /**
   * A layer of one colour through a stencil. `path` traces the holes of the stencil; the overspray is a blurred
   * copy underneath, `halo` stage units wide, and `shift` moves the whole layer, as a stencil held a little off.
   */
  layer(colour: string, path: (pen: Pen) => void, halo = 6, shift: readonly [number, number] = [0, 0], rule: CanvasFillRule = 'nonzero'): void {
    const pen = this.pen
    pen.save()
    pen.translate(shift[0], shift[1])
    pen.fillStyle = colour
    if (halo > 0) {
      pen.shadowColor = colour
      pen.shadowBlur = halo * this.density
      pen.globalAlpha = 0.55
      pen.beginPath()
      path(pen)
      pen.fill(rule)
      pen.shadowBlur = 0
      pen.shadowColor = 'transparent'
    }
    pen.globalAlpha = 1
    pen.beginPath()
    path(pen)
    pen.fill(rule)
    pen.restore()
  }

  /** A line of one colour through a slit in the stencil. */
  line(colour: string, width: number, path: (pen: Pen) => void, halo = 4): void {
    const pen = this.pen
    pen.save()
    pen.strokeStyle = colour
    pen.lineWidth = width
    pen.lineCap = 'round'
    pen.lineJoin = 'round'
    if (halo > 0) {
      pen.shadowColor = colour
      pen.shadowBlur = halo * this.density
    }
    pen.beginPath()
    path(pen)
    pen.stroke()
    pen.restore()
  }

  /** Bridges: thin strips where the stencil held together and no paint came through. They show whatever lies under this layer. */
  cut(width: number, path: (pen: Pen) => void): void {
    const pen = this.pen
    pen.save()
    pen.globalCompositeOperation = 'destination-out'
    pen.lineWidth = width
    pen.lineCap = 'butt'
    pen.beginPath()
    path(pen)
    pen.stroke()
    pen.restore()
  }

  /** A run of paint down the wall from a point, ending in a bead. */
  drip(colour: string, x: number, y: number, length: number, width = 2.6): void {
    const pen = this.pen
    pen.save()
    pen.strokeStyle = colour
    pen.fillStyle = colour
    pen.lineWidth = width
    pen.lineCap = 'round'
    pen.beginPath()
    pen.moveTo(x, y)
    pen.lineTo(x, y + length)
    pen.stroke()
    pen.beginPath()
    pen.arc(x, y + length, width * 0.85, 0, Math.PI * 2)
    pen.fill()
    pen.restore()
  }

  /** Specks of overspray scattered round a point, thinning outwards. */
  specks(colour: string, x: number, y: number, radius: number, count: number): void {
    const pen = this.pen
    pen.save()
    pen.fillStyle = colour
    for (let i = 0; i < count; i++) {
      const a = this.chance() * Math.PI * 2, r = radius * Math.sqrt(this.chance())
      pen.globalAlpha = 0.25 + this.chance() * 0.5
      pen.beginPath()
      pen.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.5 + this.chance() * 1.1, 0, Math.PI * 2)
      pen.fill()
    }
    pen.restore()
  }

  /**
   * The wall under the paint: specks where the rough brick took no paint, and, for a figure that stays where it
   * was sprayed, a faint groove along each course of mortar. `top` is the stage height of the sprite's own origin
   * line, so the grooves fall on the wall's courses.
   */
  grain(x: number, y: number, w: number, h: number, courses?: { top: number; pitch: number }): void {
    const pen = this.pen
    pen.save()
    pen.globalCompositeOperation = 'destination-out'
    const count = Math.round((w * h) / 110)
    for (let i = 0; i < count; i++) {
      pen.globalAlpha = 0.25 + this.chance() * 0.45
      pen.beginPath()
      pen.arc(x + this.chance() * w, y + this.chance() * h, 0.5 + this.chance() * 0.9, 0, Math.PI * 2)
      pen.fill()
    }
    if (courses) {
      pen.globalAlpha = 0.22
      const first = Math.ceil((courses.top + y) / courses.pitch) * courses.pitch - courses.top
      for (let line = first; line < y + h; line += courses.pitch) pen.fillRect(x, line - 1, w, 2)
    }
    pen.restore()
  }
}

/** Paints a sprite: a canvas `w` by `h` stage units at `density`, with the pen's origin at (`ox`, `oy`) inside it. */
export function bake(make: Canvases, density: number, w: number, h: number, ox: number, oy: number, seed: number, paint: (can: Can) => void): Sprite {
  const image = make(Math.max(1, Math.ceil(w * density)), Math.max(1, Math.ceil(h * density)))
  const pen = image.getContext('2d')!
  pen.setTransform(density, 0, 0, density, ox * density, oy * density)
  paint(new Can(pen, density, seed))
  return { image, w, h, ox, oy }
}

/** A rectangle with round corners, as a subpath. Written out, since not every tablet's browser has the built-in one. */
export function rounded(pen: Pen, x: number, y: number, w: number, h: number, r: number): void {
  const c = Math.min(r, w / 2, h / 2)
  pen.moveTo(x + c, y)
  pen.lineTo(x + w - c, y)
  pen.arcTo(x + w, y, x + w, y + c, c)
  pen.lineTo(x + w, y + h - c)
  pen.arcTo(x + w, y + h, x + w - c, y + h, c)
  pen.lineTo(x + c, y + h)
  pen.arcTo(x, y + h, x, y + h - c, c)
  pen.lineTo(x, y + c)
  pen.arcTo(x, y, x + c, y, c)
  pen.closePath()
}
