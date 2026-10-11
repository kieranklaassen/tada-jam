import { fit } from '../stage'
import { paintGlass } from './glass'
import { paintAll } from './groundSheet'
import { GROUND } from './layout'
import * as P from './palette'
import { paintBell, paintHill } from './props'
import { paintSetting } from './setting'
import type { SpikeScene } from './spike'
import { Sprites } from './sprites'

// Draws a spike scene in three layers, each a canvas of its own laid over the last: what stands still (the wood,
// the setting, the ground, the hill and bell), the creatures, and the glass. The still layers are painted once
// for a size of surface and left alone, so a frame's work is the creatures: one stamp each. Putting the layers
// together is the browser's, not the game's.

/** A layer under or over the Mount's own canvas, the same size, that takes no touch. */
function layerOf(canvas: HTMLCanvasElement, over: boolean): HTMLCanvasElement {
  const layer = canvas.ownerDocument.createElement('canvas')
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' })
  canvas.parentElement?.insertBefore(layer, over ? canvas.nextSibling : canvas)
  return layer
}

export class SpikeView {
  private readonly pen: CanvasRenderingContext2D | null
  private readonly back: HTMLCanvasElement
  private readonly glass: HTMLCanvasElement
  private sprites: Sprites | null = null
  private madeFor = ''

  constructor(private readonly canvas: HTMLCanvasElement, private readonly scene: SpikeScene) {
    this.pen = canvas.getContext('2d')
    this.back = layerOf(canvas, false)
    this.glass = layerOf(canvas, true)
  }

  /** Takes the two layers out again. */
  dispose(): void {
    this.back.remove()
    this.glass.remove()
  }

  /** Paints the still layers for this size of surface. Done at load and on a resize, never in a frame. */
  private make(k: number, x: number, y: number): void {
    for (const layer of [this.back, this.glass]) {
      layer.width = this.canvas.width
      layer.height = this.canvas.height
    }
    const back = this.back.getContext('2d')!
    back.fillStyle = P.WOOD.dark
    back.fillRect(0, 0, this.back.width, this.back.height)
    back.setTransform(k, 0, 0, k, x, y)
    paintSetting(back)
    back.setTransform(1, 0, 0, 1, x + GROUND.x * k, y + GROUND.y * k)
    paintAll(back, this.scene.ground, k)
    back.setTransform(k, 0, 0, k, x, y)
    paintHill(back, this.scene.hill)
    paintBell(back, this.scene.bell)
    const glass = this.glass.getContext('2d')!
    glass.setTransform(k, 0, 0, k, x, y)
    paintGlass(glass)
    const doc = this.canvas.ownerDocument
    const canvasOf = (width: number, height: number) => Object.assign(doc.createElement('canvas'), { width, height })
    if (this.sprites) this.sprites.rescale(k)
    else this.sprites = new Sprites(k, canvasOf)
  }

  /** Draws the frame into a surface of `width` by `height` CSS pixels at this pixel ratio. Gives the draws it made. */
  draw(width: number, height: number, dpr: number): number {
    const pen = this.pen, by = fit(width, height)
    if (!pen || by.scale <= 0) return 0
    const k = dpr * by.scale, key = `${this.canvas.width}x${this.canvas.height}@${k}`
    if (key !== this.madeFor) {
      this.make(k, dpr * by.x, dpr * by.y)
      this.madeFor = key
    }
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.clearRect(0, 0, this.canvas.width, this.canvas.height)
    pen.setTransform(k, 0, 0, k, dpr * by.x, dpr * by.y)
    for (const one of this.scene.cast) this.sprites!.stamp(pen, one.kind, one.pose, one.x, one.y, one.flip === true, one.size ?? 1)
    return this.scene.cast.length
  }
}
