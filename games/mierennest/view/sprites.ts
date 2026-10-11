import type { Move } from '../motion'
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

  /**
   * Stamps a creature as its motion has it: shifted, turned about its feet and squashed, then turned again by
   * `turn` about the middle of its body, which is how the ant climbs a shaft. One draw.
   */
  stampMoved(pen: CanvasRenderingContext2D, kind: CreatureKind, pose: string, x: number, y: number, flip: boolean, size: number, tall: number, move: Move | null, turn: number, bodyHeight: number): void {
    if (!move && turn === 0 && tall === 1) {
      this.stamp(pen, kind, pose, x, y, flip, size)
      return
    }
    const sprite = this.get(kind, pose)
    pen.save()
    pen.translate(x + (move?.dx ?? 0), y + (move?.dy ?? 0))
    if (turn !== 0) {
      pen.translate(0, -bodyHeight / 2)
      pen.rotate(turn)
      pen.translate(0, bodyHeight / 2)
    }
    if (move) pen.rotate(move.turn)
    pen.scale((flip ? -1 : 1) * (move?.sx ?? 1), (move?.sy ?? 1) * tall)
    pen.drawImage(sprite.image, -FOOT.x * size, -FOOT.y * size, SPRITE.width * size, SPRITE.height * size)
    pen.restore()
  }
}
