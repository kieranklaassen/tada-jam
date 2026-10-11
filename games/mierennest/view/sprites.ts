import { paintCreature, type CreatureKind, type Look } from './creatures'

// A creature in one pose is painted once into a small canvas of its own and stamped from then on, so a creature
// costs one draw a frame however many shapes it is made of.

/** A sprite's canvas is this many stage units wide and high, with the creature's feet at `FOOT`: room for the largest pose, its feelers, wings and props. */
export const SPRITE = { width: 240, height: 190 } as const
export const FOOT = { x: 120, y: 150 } as const

export type Sprite = { image: CanvasImageSource; scale: number }

export class Sprites {
  private readonly made = new Map<string, Sprite>()

  /** `scale` is canvas pixels a stage unit: the pixel ratio times the stage's fit. A change of scale makes them all again. */
  constructor(private scale: number, private readonly canvasOf: (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas) {}

  rescale(scale: number): void {
    if (scale === this.scale) return
    this.scale = scale
    this.made.clear()
  }

  get(kind: CreatureKind, pose: string, look?: Look): Sprite {
    const key = `${kind}/${pose}`
    let sprite = this.made.get(key)
    if (!sprite) {
      const canvas = this.canvasOf(Math.ceil(SPRITE.width * this.scale), Math.ceil(SPRITE.height * this.scale))
      const pen = canvas.getContext('2d') as CanvasRenderingContext2D
      pen.setTransform(this.scale, 0, 0, this.scale, FOOT.x * this.scale, FOOT.y * this.scale)
      paintCreature(pen, kind, pose, look, 0)
      sprite = { image: canvas, scale: this.scale }
      this.made.set(key, sprite)
    }
    return sprite
  }

  /** Stamps a creature with the middle of its feet at (x, y) in stage units. One draw. */
  stamp(pen: CanvasRenderingContext2D, kind: CreatureKind, pose: string, x: number, y: number, flip = false, size = 1, look?: Look): void {
    const sprite = this.get(kind, pose, look)
    const w = SPRITE.width * size, h = SPRITE.height * size
    if (flip) {
      pen.save()
      pen.translate(x, y)
      pen.scale(-1, 1)
      pen.drawImage(sprite.image, -FOOT.x * size, -FOOT.y * size, w, h)
      pen.restore()
    } else pen.drawImage(sprite.image, x - FOOT.x * size, y - FOOT.y * size, w, h)
  }
}
