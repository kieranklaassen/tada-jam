import { Pen } from './lacquer'

// Painted once, stamped every frame. A sprite is keyed by everything that changes its look, rounded to a few
// steps, and the ones not stamped for longest make room for new ones.

/** Where a sprite's picture lies round its own origin, in stage units. */
export type Frame = { left: number; top: number; width: number; height: number }

const KEPT = 110

export class Sprites {
  /** Stamps since it was last set to 0. */
  stamps = 0
  /** Sprites painted since it was made. */
  painted = 0
  density = 1
  private readonly kept = new Map<string, HTMLCanvasElement>()

  constructor(readonly ctx: CanvasRenderingContext2D, readonly pen: Pen) {}

  /** The surface changed size: everything is painted again when it is next needed. */
  clear(density: number): void {
    this.density = density
    for (const canvas of this.kept.values()) canvas.width = canvas.height = 0
    this.kept.clear()
  }

  get size(): number {
    return this.kept.size
  }

  stamp(key: string, frame: Frame, dark: number, paint: (pen: Pen) => void): void {
    let canvas = this.kept.get(key)
    if (canvas) this.kept.delete(key)
    else {
      if (this.kept.size >= KEPT) {
        const [oldest, spare] = this.kept.entries().next().value!
        this.kept.delete(oldest)
        canvas = spare
      } else canvas = document.createElement('canvas')
      canvas.width = Math.ceil(frame.width * this.density)
      canvas.height = Math.ceil(frame.height * this.density)
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(this.density, 0, 0, this.density, -frame.left * this.density, -frame.top * this.density)
      ctx.lineJoin = 'round'
      const pen = new Pen(ctx)
      pen.dark = dark
      paint(pen)
      this.painted += 1
    }
    this.kept.set(key, canvas)
    this.ctx.drawImage(canvas, frame.left, frame.top, frame.width, frame.height)
    this.stamps += 1
  }
}

export const steps = (value: number, size: number) => Math.round(value / size) * size
