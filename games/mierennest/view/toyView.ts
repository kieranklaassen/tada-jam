import { BODY } from '../camp'
import { CELL, MUD, SAND, type Ground, type Lump } from '../ground'
import { fit } from '../stage'
import type { Item } from './display'
import { paintGlass } from './glass'
import { paintAll, repaint, touchedBy } from './groundSheet'
import { GRASS_Y, GROUND, MOUTH_X } from './layout'
import * as P from './palette'
import { LIP, hillShape, paintDrop, paintHill, paintStalk } from './props'
import { paintSetting } from './setting'
import { Sprites } from './sprites'

// The toy on three layers, each a canvas of its own laid over the last: what stands still (the wood, the setting,
// the ground as a sheet, the hill), what moves (the creatures, a carried lump, crumbs, the bell's drop), and the
// glass. The first is painted at load and on a resize and then only where a cell changed or the hill grew; the
// last is painted once. A frame's work is the middle layer. Putting the three together is the browser's.

/** A layer under or over the Mount's own canvas, the same size, that takes no touch. */
function layerOf(canvas: HTMLCanvasElement, over: boolean): HTMLCanvasElement {
  const layer = canvas.ownerDocument.createElement('canvas')
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' })
  canvas.parentElement?.insertBefore(layer, over ? canvas.nextSibling : canvas)
  return layer
}

/** The piece of the stage the hill can ever cover, which is put back from the setting before the hill is painted again. */
function hillRegion(): { x: number; y: number; width: number; height: number } {
  const largest = hillShape(1)
  const left = MOUTH_X - LIP - largest.left.reach - 4, right = MOUTH_X + LIP + largest.right.reach + 4
  const top = GRASS_Y - Math.max(largest.left.height, largest.right.height) * 1.1 - 4
  return { x: left, y: top, width: right - left, height: GRASS_Y - top }
}

const LUMP_FILL: Record<Lump, string> = { 2: P.SAND.fill, 3: P.MUD.fill, 4: P.STONE.fill }

export class ToyView {
  private readonly pen: CanvasRenderingContext2D | null
  private readonly back: HTMLCanvasElement
  private readonly glass: HTMLCanvasElement
  private setting: HTMLCanvasElement | null = null
  private sprites: Sprites | null = null
  private madeFor = ''
  private k = 1
  private x = 0
  private y = 0
  private ground: Ground | null = null
  private hill = -1
  /** The cells that wait to be repainted, nearest the finger first. */
  private waiting: number[] = []
  /** How many cells the last frame repainted. */
  repainted = 0

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.pen = canvas.getContext('2d')
    this.back = layerOf(canvas, false)
    this.glass = layerOf(canvas, true)
  }

  dispose(): void {
    this.back.remove()
    this.glass.remove()
  }

  /** The ground to show. Null before the save has been read: then the setting stands alone, with the dark of the farm under it. */
  show(ground: Ground | null): void {
    this.ground = ground
    this.madeFor = ''
  }

  /** These cells changed. They and the eight round each are repainted over the coming frames, nearest `near` first. */
  changed(cells: readonly number[], near: { x: number; y: number } | null): void {
    if (!this.ground || cells.length === 0) return
    const cols = this.ground.cols
    const all = new Set(this.waiting)
    for (const cell of touchedBy(this.ground, cells)) all.add(cell)
    this.waiting = [...all]
    if (near) {
      const far = (cell: number) => Math.hypot((cell % cols) + 0.5 - near.x, Math.floor(cell / cols) + 0.5 - near.y)
      this.waiting.sort((a, b) => far(a) - far(b))
    }
  }

  /** Paints the still layers for this size of surface. Done at load and on a resize, never in a frame. */
  private make(): void {
    const { k, x, y } = this
    for (const layer of [this.back, this.glass]) {
      layer.width = this.canvas.width
      layer.height = this.canvas.height
    }
    const doc = this.canvas.ownerDocument
    // The setting is kept apart as well, so the strip under the hill can be put back when the hill grows.
    const region = hillRegion()
    this.setting = Object.assign(doc.createElement('canvas'), { width: Math.ceil(region.width * k), height: Math.ceil(region.height * k) })
    const back = this.back.getContext('2d')!
    back.fillStyle = P.WOOD.dark
    back.fillRect(0, 0, this.back.width, this.back.height)
    back.setTransform(k, 0, 0, k, x, y)
    paintSetting(back)
    paintStalk(back)
    const keep = this.setting.getContext('2d')!
    keep.drawImage(this.back, Math.round(x + region.x * k), Math.round(y + region.y * k), this.setting.width, this.setting.height, 0, 0, this.setting.width, this.setting.height)
    if (this.ground) {
      back.setTransform(1, 0, 0, 1, x + GROUND.x * k, y + GROUND.y * k)
      paintAll(back, this.ground, k)
    }
    this.hill = -1
    this.waiting = []
    const glass = this.glass.getContext('2d')!
    glass.setTransform(k, 0, 0, k, x, y)
    paintGlass(glass)
    const canvasOf = (width: number, height: number) => Object.assign(doc.createElement('canvas'), { width, height })
    if (this.sprites) this.sprites.rescale(k)
    else this.sprites = new Sprites(k, canvasOf)
  }

  /** Brings the still layer up to date: the cells that wait, at most a frame's budget of them, and the hill if it grew. */
  private upkeep(hill: number): void {
    const back = this.back.getContext('2d')!
    const { k, x, y } = this
    this.repainted = 0
    if (this.ground && this.waiting.length > 0) {
      back.setTransform(1, 0, 0, 1, x + GROUND.x * k, y + GROUND.y * k)
      const before = this.waiting.length
      this.waiting = repaint(back, this.ground, this.waiting, k)
      this.repainted = before - this.waiting.length
    }
    if (Math.abs(hill - this.hill) > 0.004 && this.setting) {
      const region = hillRegion()
      back.setTransform(1, 0, 0, 1, 0, 0)
      back.drawImage(this.setting, Math.round(x + region.x * k), Math.round(y + region.y * k))
      back.setTransform(k, 0, 0, k, x, y)
      paintHill(back, hill)
      this.hill = hill
    }
  }

  private paint(pen: CanvasRenderingContext2D, item: Item): void {
    switch (item.is) {
      case 'sprite':
        this.sprites!.stamp(pen, item.who, item.pose, item.x, item.y, item.flip, item.size, item.tall, item.move, item.turn, BODY[item.who].height)
        break
      case 'lump': {
        const s = CELL - 4
        pen.fillStyle = LUMP_FILL[item.lump]
        pen.beginPath()
        pen.roundRect(item.x - s / 2, item.y - s / 2, s, s, item.lump === SAND ? 7 : 10)
        pen.fill()
        pen.fillStyle = item.lump === SAND ? P.SAND.edge : item.lump === MUD ? P.MUD.shine : P.STONE.shine
        pen.beginPath()
        pen.roundRect(item.x - 7, item.y - 8, 7, 6, 3)
        pen.fill()
        break
      }
      case 'hole':
        pen.fillStyle = 'rgba(38,23,16,0.86)'
        pen.fillRect(item.x - CELL / 2, item.y - CELL / 2, CELL, CELL)
        break
      case 'target':
        pen.strokeStyle = 'rgba(255,255,255,0.6)'
        pen.lineWidth = 2
        pen.beginPath()
        pen.roundRect(item.x - CELL / 2 + 2, item.y - CELL / 2 + 2, CELL - 4, CELL - 4, 7)
        pen.stroke()
        break
      case 'crumbs':
        pen.fillStyle = item.colour
        pen.beginPath()
        for (const crumb of item.at) pen.rect(crumb.x - crumb.size / 2, crumb.y - crumb.size / 2, crumb.size, crumb.size)
        pen.fill()
        break
      case 'drop':
        paintDrop(pen, item.sway, item.glint)
        break
      case 'glint': {
        const r = 9 + 5 * item.strength
        pen.fillStyle = `rgba(255,250,215,${(0.75 * item.strength).toFixed(3)})`
        pen.beginPath()
        pen.moveTo(item.x, item.y - r)
        pen.quadraticCurveTo(item.x, item.y, item.x + r, item.y)
        pen.quadraticCurveTo(item.x, item.y, item.x, item.y + r)
        pen.quadraticCurveTo(item.x, item.y, item.x - r, item.y)
        pen.quadraticCurveTo(item.x, item.y, item.x, item.y - r)
        pen.fill()
        break
      }
      case 'hand': {
        // A pale mitt with one finger out, its tip on the point it shows; it sinks a little as it presses.
        const lift = 10 * (1 - item.press)
        pen.globalAlpha = 0.9 * item.opacity
        pen.fillStyle = '#fff8ea'
        pen.beginPath()
        pen.roundRect(item.x - 7, item.y - 4 - lift, 14, 44, 7)
        pen.fill()
        pen.beginPath()
        pen.ellipse(item.x + 12, item.y + 50 - lift, 27, 24, 0.3, 0, Math.PI * 2)
        pen.fill()
        pen.globalAlpha = 1
        break
      }
      default:
        item satisfies never
    }
  }

  /**
   * Draws the frame into a surface of `width` by `height` CSS pixels at this pixel ratio: the still layer's upkeep,
   * then every item of the list on the middle layer.
   */
  draw(width: number, height: number, dpr: number, items: readonly Item[], hill: number): void {
    const pen = this.pen, by = fit(width, height)
    if (!pen || by.scale <= 0) return
    const k = dpr * by.scale, key = `${this.canvas.width}x${this.canvas.height}@${k}`
    if (key !== this.madeFor) {
      this.k = k
      this.x = dpr * by.x
      this.y = dpr * by.y
      this.make()
      this.madeFor = key
    }
    this.upkeep(this.ground ? hill : 0)
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.clearRect(0, 0, this.canvas.width, this.canvas.height)
    pen.setTransform(k, 0, 0, k, this.x, this.y)
    for (const item of items) this.paint(pen, item)
  }
}
