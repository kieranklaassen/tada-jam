import { CREAM, DARK, OCHRE, SEA, SKY, paintSprite } from './art'
import type { Dye, Item } from './items'
import { SPRITES, type SpriteId } from './rig'
import { WATERLINE } from './sea'
import { STAGE, fit, type Fit } from './stage'

// The painter. Every sprite is painted once, at the density of the surface
// (art.ts), and a frame is the list frame.ts makes, carried out in order:
// stamps, and a few live strokes. Nothing is laid out here.

/** Room round a sprite for the dye that creeps past its edge, in stage units. */
const PAD = 6
const IDS = Object.keys(SPRITES) as SpriteId[]
const DYES: Record<Dye, string> = { cream: CREAM, ochre: OCHRE, dark: DARK }
/** The dye a sprite is stamped in when it is not its own: inked black, or turned cheese yellow. */
const TINTS = ['', '#0a0d20', '#e2b23c'] as const

export class View {
  /** The one fit of the stage into the surface, made from the surface's size in CSS pixels: touches come back through it. */
  fit: Fit = { scale: 0, x: 0, y: 0 }
  private readonly canvas: HTMLCanvasElement
  private readonly g: CanvasRenderingContext2D
  private readonly sprites = new Map<string, HTMLCanvasElement>()
  private dpr = 1
  /** Canvas pixels per stage unit that the sprites were painted at. */
  private density = 0
  private ground: CanvasGradient | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.g = canvas.getContext('2d')!
  }

  /** The surface's new size in CSS pixels and its pixel ratio. Call it before drawing, after the canvas has been sized. */
  size(width: number, height: number, dpr: number): void {
    this.fit = fit(width, height)
    this.dpr = dpr
    this.ground = null
    // Sprites are painted again only when the surface is denser by a quarter step, so a tier change or a small resize does not repaint them all.
    const density = Math.max(0.25, Math.ceil(dpr * this.fit.scale * 4) / 4)
    if (density !== this.density) {
      this.density = density
      this.sprites.clear()
    }
  }

  /** A sprite, painted the first time it is asked for. In another dye it keeps its shape and the lines cut into it, and its fill is dyed over. */
  private sprite(id: SpriteId, tint: 0 | 1 | 2 = 0): HTMLCanvasElement {
    const key = tint === 0 ? id : `${id}.${tint}`
    let canvas = this.sprites.get(key)
    if (!canvas) {
      const box = SPRITES[id], pad = id === 'cloth' ? 0 : PAD, d = this.density
      canvas = this.canvas.ownerDocument.createElement('canvas')
      canvas.width = Math.ceil((box.x1 - box.x0 + pad * 2) * d)
      canvas.height = Math.ceil((box.y1 - box.y0 + pad * 2) * d)
      const g = canvas.getContext('2d')!
      if (tint === 0) {
        g.setTransform(d, 0, 0, d, (pad - box.x0) * d, (pad - box.y0) * d)
        paintSprite(id, { g, d })
      } else {
        g.drawImage(this.sprite(id), 0, 0)
        g.globalCompositeOperation = 'source-atop'
        g.globalAlpha = tint === 1 ? 0.9 : 0.78
        g.fillStyle = TINTS[tint]
        g.fillRect(0, 0, canvas.width, canvas.height)
      }
      this.sprites.set(key, canvas)
    }
    return canvas
  }

  /** Paints every sprite now, so the first frame of play does not wait for one. */
  prepare(): void {
    if (this.fit.scale > 0) for (const id of IDS) this.sprite(id)
  }

  /**
   * Draws one frame: the list from frame.ts, or with `null` the bare cloth, which is what shows before the saved
   * state has been read. Returns what it drew, stamps plus strokes.
   */
  draw(items: readonly Item[] | null): number {
    const g = this.g, s = this.dpr * this.fit.scale, ox = this.dpr * this.fit.x, oy = this.dpr * this.fit.y
    if (!(s > 0)) return 0
    // Past the stage's edges, on a surface of another shape, the cloth's dye carries on without its figures.
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    if (!this.ground) {
      const ground = g.createLinearGradient(0, oy, 0, oy + STAGE.height * s), line = WATERLINE / STAGE.height
      ground.addColorStop(0, SKY[0])
      ground.addColorStop(line, SKY[1])
      for (const [stop, color] of SEA) ground.addColorStop(Math.min(1, line + 0.0001 + stop * (1 - line - 0.0001)), color)
      this.ground = ground
    }
    if (ox > 0.5 || oy > 0.5) {
      g.fillStyle = this.ground
      g.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (items === null) {
      this.stamp('cloth', 0, 0, 0, 0, 1, 1, s, ox, oy)
      return 1
    }
    for (const item of items) {
      g.globalAlpha = item.a
      if (item.k === 'sprite') {
        g.globalCompositeOperation = item.add ? 'lighter' : 'source-over'
        this.stamp(item.id, item.tint, item.x, item.y, item.r, item.sx, item.sy, s, ox, oy)
        continue
      }
      g.globalCompositeOperation = 'source-over'
      g.setTransform(s, 0, 0, s, ox, oy)
      g.beginPath()
      if (item.k === 'disc') {
        g.fillStyle = DYES[item.dye]
        g.ellipse(item.x, item.y, item.rx, item.ry, item.r, 0, Math.PI * 2)
        g.fill()
      } else if (item.k === 'ring') {
        g.strokeStyle = CREAM
        g.lineWidth = item.w
        g.lineCap = 'round'
        if (item.flat < 0.6) {
          // A ripple on the water: its near and far edges, open at the sides.
          g.ellipse(item.x, item.y, item.rad, item.rad * item.flat, 0, 0.12 * Math.PI, 0.88 * Math.PI)
          g.moveTo(item.x + item.rad * Math.cos(1.2 * Math.PI), item.y + item.rad * item.flat * Math.sin(1.2 * Math.PI))
          g.ellipse(item.x, item.y, item.rad, item.rad * item.flat, 0, 1.2 * Math.PI, 1.8 * Math.PI)
        } else {
          // A bubble: its round edge, and the glint of light on it.
          g.ellipse(item.x, item.y, item.rad, item.rad * item.flat, 0, 0, Math.PI * 2)
          g.moveTo(item.x + item.rad * 0.55 * Math.cos(1.05 * Math.PI), item.y + item.rad * 0.55 * Math.sin(1.05 * Math.PI))
          g.arc(item.x, item.y, item.rad * 0.55, 1.05 * Math.PI, 1.45 * Math.PI)
        }
        g.stroke()
      } else {
        g.strokeStyle = DYES[item.dye]
        g.lineWidth = item.w
        g.lineCap = 'round'
        g.lineJoin = 'round'
        g.moveTo(item.pts[0], item.pts[1])
        for (let i = 2; i < item.pts.length; i += 2) g.lineTo(item.pts[i], item.pts[i + 1])
        g.stroke()
      }
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    return items.length
  }

  private stamp(id: SpriteId, tint: 0 | 1 | 2, x: number, y: number, r: number, sx: number, sy: number, s: number, ox: number, oy: number): void {
    const box = SPRITES[id], pad = id === 'cloth' ? 0 : PAD, canvas = this.sprite(id, tint)
    const cos = Math.cos(r) * s, sin = Math.sin(r) * s
    this.g.setTransform(cos * sx, sin * sx, -sin * sy, cos * sy, s * x + ox, s * y + oy)
    this.g.drawImage(canvas, box.x0 - pad, box.y0 - pad, canvas.width / this.density, canvas.height / this.density)
  }
}
