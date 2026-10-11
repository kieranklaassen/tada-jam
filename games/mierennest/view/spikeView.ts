import { STAGE, fit } from '../stage'
import { paintGlass } from './glass'
import { paintAll } from './groundSheet'
import { GRASS_Y, GROUND, MOUTH_X } from './layout'
import * as P from './palette'
import { paintBell, paintHill } from './props'
import { paintSetting } from './setting'
import type { SpikeScene } from './spike'
import { Sprites } from './sprites'

// Draws a spike scene. Everything that stands still is painted once for a size of surface into cached sheets, and
// a frame is a handful of stamps: the wood behind the stage, the setting, the ground, the hill and bell, one for
// each creature, and the glass.

/** The piece of the stage the hill and the bell are cached in. */
const PROPS = { x: MOUTH_X - 190, y: GRASS_Y - 160, width: 400, height: 166 } as const

export class SpikeView {
  private readonly pen: CanvasRenderingContext2D | null
  private setting: HTMLCanvasElement | null = null
  private ground: HTMLCanvasElement | null = null
  private props: HTMLCanvasElement | null = null
  private glass: HTMLCanvasElement | null = null
  private sprites: Sprites | null = null
  private madeFor = ''

  constructor(private readonly canvas: HTMLCanvasElement, private readonly scene: SpikeScene) {
    this.pen = canvas.getContext('2d')
  }

  private sheet(width: number, height: number, k: number, x: number, y: number, paint: (pen: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    const sheet = this.canvas.ownerDocument.createElement('canvas')
    sheet.width = Math.ceil(width * k)
    sheet.height = Math.ceil(height * k)
    const pen = sheet.getContext('2d')!
    pen.setTransform(k, 0, 0, k, -x * k, -y * k)
    paint(pen)
    return sheet
  }

  /** Paints the cached sheets for this many canvas pixels a stage unit. Done at load and on a resize, never in a frame. */
  private make(k: number): void {
    const doc = this.canvas.ownerDocument
    this.setting = this.sheet(STAGE.width, STAGE.height, k, 0, 0, paintSetting)
    this.ground = this.sheet(GROUND.width, GROUND.height, k, 0, 0, (pen) => {
      pen.setTransform(1, 0, 0, 1, 0, 0)
      paintAll(pen, this.scene.ground, k)
    })
    this.props = this.sheet(PROPS.width, PROPS.height, k, PROPS.x, PROPS.y, (pen) => {
      paintHill(pen, this.scene.hill)
      paintBell(pen, this.scene.bell)
    })
    this.glass = this.sheet(STAGE.width, STAGE.height, k, 0, 0, paintGlass)
    const canvasOf = (width: number, height: number) => Object.assign(doc.createElement('canvas'), { width, height })
    if (this.sprites) this.sprites.rescale(k)
    else this.sprites = new Sprites(k, canvasOf)
  }

  /** Draws the frame into a surface of `width` by `height` CSS pixels at this pixel ratio. Gives the draws it made. */
  draw(width: number, height: number, dpr: number): number {
    const pen = this.pen, by = fit(width, height)
    if (!pen || by.scale <= 0) return 0
    const k = dpr * by.scale, key = `${width}x${height}@${dpr}`
    if (key !== this.madeFor) {
      this.make(k)
      this.madeFor = key
    }
    let draws = 0
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.fillStyle = P.WOOD.dark
    pen.fillRect(0, 0, this.canvas.width, this.canvas.height)
    draws++
    pen.setTransform(k, 0, 0, k, dpr * by.x, dpr * by.y)
    pen.drawImage(this.setting!, 0, 0, STAGE.width, STAGE.height)
    pen.drawImage(this.ground!, GROUND.x, GROUND.y, GROUND.width, GROUND.height)
    pen.drawImage(this.props!, PROPS.x, PROPS.y, PROPS.width, PROPS.height)
    draws += 3
    for (const one of this.scene.cast) {
      this.sprites!.stamp(pen, one.kind, one.pose, one.x, one.y, one.flip === true)
      draws++
    }
    pen.drawImage(this.glass!, 0, 0, STAGE.width, STAGE.height)
    return draws + 1
  }
}
