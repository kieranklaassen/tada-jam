import type { Move } from '../motion'
import { paintCreature, type CreatureKind, type Look } from './creatures'

// A creature in one pose is painted once into a small canvas of its own and stamped from then on, so a creature
// costs one draw a frame however many shapes it is made of.

/**
 * The sprite box of each kind, in stage units: its width and height, with the creature's feet in the middle of
 * its width and `FOOT_UP` above its lower edge. Each is its body with room round it for feelers, wings and what
 * it holds, and no more: a stamp costs by its area.
 */
export const BOX: Record<CreatureKind, { width: number; height: number }> = {
  ant: { width: 170, height: 84 },
  worker: { width: 140, height: 100 },
  queen: { width: 200, height: 150 },
  raider: { width: 180, height: 96 },
  beetle: { width: 190, height: 116 },
  fly: { width: 190, height: 124 },
  dungBeetle: { width: 190, height: 128 },
  dungFly: { width: 190, height: 124 },
  dungBall: { width: 120, height: 116 },
}
/** How far above the lower edge of its box a creature's feet are: room for a puddle, a shadow, a dangling leg. */
export const FOOT_UP = 22

export type Sprite = { image: CanvasImageSource; scale: number }

type Painted = HTMLCanvasElement | OffscreenCanvas
/**
 * Lets a painted canvas go: its store is given back at once and not when the canvas is collected. A tablet keeps
 * a small store for canvases, and a few changes of scale in a row can otherwise meet its limit.
 */
export function letGo(canvas: { width: number; height: number } | null): void {
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
}

export class Sprites {
  private readonly made = new Map<string, Sprite & { image: Painted }>()

  /** `scale` is canvas pixels a stage unit: the pixel ratio times the stage's fit. A change of scale makes them all again. */
  constructor(private scale: number, private readonly canvasOf: (width: number, height: number) => Painted) {}

  rescale(scale: number): void {
    if (scale === this.scale) return
    this.scale = scale
    this.release()
  }

  /** Every sprite made so far is dropped, and its canvas let go. */
  release(): void {
    for (const sprite of this.made.values()) letGo(sprite.image)
    this.made.clear()
  }

  get(kind: CreatureKind, pose: string, look?: Look): Sprite {
    const key = `${kind}/${pose}`
    const had = this.made.get(key)
    if (had) return had
    const box = BOX[kind]
    const canvas = this.canvasOf(Math.ceil(box.width * this.scale), Math.ceil(box.height * this.scale))
    const pen = canvas.getContext('2d') as CanvasRenderingContext2D
    pen.setTransform(this.scale, 0, 0, this.scale, (box.width / 2) * this.scale, (box.height - FOOT_UP) * this.scale)
    paintCreature(pen, kind, pose, look, 0)
    const sprite = { image: canvas, scale: this.scale }
    this.made.set(key, sprite)
    return sprite
  }

  /**
   * Stamps a creature with the middle of its feet at (x, y) in stage units, as its motion has it: shifted, turned
   * about its feet and squashed, then turned again by `turn` about the middle of its body, which is how the ant
   * climbs a shaft. `size` scales it both ways and `tall` its height again. One draw. A creature that is neither
   * turned nor squashed is stamped straight, which is the cheap way and the usual one.
   */
  stamp(pen: CanvasRenderingContext2D, kind: CreatureKind, pose: string, x: number, y: number, flip = false, size = 1, tall = 1, move: Move | null = null, turn = 0, bodyHeight = 0): void {
    const sprite = this.get(kind, pose), box = BOX[kind]
    const w = box.width * size, h = box.height * size, left = -(box.width / 2) * size, top = -(box.height - FOOT_UP) * size
    const lean = move ? move.turn : 0, sx = move ? move.sx : 1, sy = (move ? move.sy : 1) * tall
    const straight = Math.abs(lean) < 0.004 && turn === 0 && Math.abs(sx - 1) < 0.004 && Math.abs(sy - 1) < 0.004
    if (straight && !flip) {
      pen.drawImage(sprite.image, x + (move?.dx ?? 0) + left, y + (move?.dy ?? 0) + top, w, h)
      return
    }
    pen.save()
    pen.translate(x + (move?.dx ?? 0), y + (move?.dy ?? 0))
    if (turn !== 0) {
      pen.translate(0, -bodyHeight / 2)
      pen.rotate(turn)
      pen.translate(0, bodyHeight / 2)
    }
    if (!straight && lean !== 0) pen.rotate(lean)
    pen.scale((flip ? -1 : 1) * sx, sy)
    pen.drawImage(sprite.image, left, top, w, h)
    pen.restore()
  }
}

/**
 * Anything else that is painted once and stamped: a machine, a thing on a wall, an effect. Each is named by a key,
 * with the size of its box and where in the box its origin lies; a change of scale makes them all again.
 */
export class Stamps {
  private readonly made = new Map<string, Painted>()

  constructor(private scale: number, private readonly canvasOf: (width: number, height: number) => Painted) {}

  rescale(scale: number): void {
    if (scale === this.scale) return
    this.scale = scale
    this.release()
  }

  /** Every stamp made so far is dropped, and its canvas let go. */
  release(): void {
    for (const image of this.made.values()) letGo(image)
    this.made.clear()
  }

  /** Stamps the thing with its origin at (x, y) in stage units, mirrored about the origin when `flip` is true. One draw. */
  stamp(pen: CanvasRenderingContext2D, key: string, box: { width: number; height: number; originX: number; originY: number }, paint: (pen: CanvasRenderingContext2D) => void, x: number, y: number, flip = false): void {
    let image = this.made.get(key)
    if (!image) {
      image = this.canvasOf(Math.ceil(box.width * this.scale), Math.ceil(box.height * this.scale))
      const own = image.getContext('2d') as CanvasRenderingContext2D
      own.setTransform(this.scale, 0, 0, this.scale, box.originX * this.scale, box.originY * this.scale)
      paint(own)
      this.made.set(key, image)
    }
    if (!flip) {
      pen.drawImage(image, x - box.originX, y - box.originY, box.width, box.height)
      return
    }
    pen.save()
    pen.translate(x, y)
    pen.scale(-1, 1)
    pen.drawImage(image, -box.originX, -box.originY, box.width, box.height)
    pen.restore()
  }
}
