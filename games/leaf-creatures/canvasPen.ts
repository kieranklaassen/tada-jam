import { paintAcorn, paintAirLeaf, paintCheek, paintFlush, paintFrond, paintGlow, paintHand, paintLid, paintMitt, paintPupil, paintShade, paintShut, paintStir, paintToad, paintWind } from './castArt'
import { INK, Wax, rgba, toothTile, type InkName } from './crayon'
import { paintEye, paintHeap, paintPale, paintPart } from './partArt'
import { KINDS, type Kind } from './parts'
import { AIR_HUES, GAZES, LOOKS, PALE, ROW, eyeKey, heapKey, leafKey, partKey, pictures, spillOf, type Pen, type Picture } from './pen'
import { paintScenery } from './scenery'
import { STAGE, type Fit } from './stage'

// The pen on a real canvas. Every picture is drawn in crayon once, at the
// sharpness of the surface, and kept; a frame only stamps them. The pictures
// are made again when the surface changes size or shape, never when the
// quality tier changes: a cheaper tier draws the same pictures on to fewer
// pixels. The picture of the place reaches as far past the stage as the
// surface shows, so a tall surface is wood from its top edge to its bottom.

type Kept = { canvas: HTMLCanvasElement; w: number; h: number; ox: number; oy: number }

/** The most pixels along one side of a creature's own picture. */
const SLOT_PIXELS = 1024

function painterOf(key: string): (wax: Wax) => void {
  for (const kind of KINDS) {
    if (key === heapKey(kind)) return (wax) => paintHeap(wax, kind)
    for (let look = 0; look < LOOKS; look++) if (key === partKey(kind, look)) return (wax) => paintPart(wax, kind as Kind, look)
  }
  for (let look = 0; look < LOOKS; look++) for (let gaze = 0; gaze < GAZES; gaze++) if (key === eyeKey(look, gaze)) return (wax) => paintEye(wax, look, gaze)
  for (let hue = 0; hue < AIR_HUES; hue++) if (key === leafKey(hue)) return (wax) => paintAirLeaf(wax, hue)
  switch (key) {
    case PALE: return paintPale
    case 'pupil': return paintPupil
    case 'cheek': return paintCheek
    case 'flush': return paintFlush
    case 'shut': return paintShut
    case 'mitt': return paintMitt
    case 'stir': return paintStir
    case 'wind-big': return (wax) => paintWind(wax, 'big')
    case 'wind-small': return (wax) => paintWind(wax, 'small')
    case 'toad': return paintToad
    case 'lid': return paintLid
    case 'frond': return (wax) => paintFrond(wax, 236)
    case 'hand': return paintHand
    case 'glow': return paintGlow
    case 'acorn': return paintAcorn
    default: return paintShade
  }
}

export class CanvasPen implements Pen {
  count = 0
  epoch = 0
  private readonly main: CanvasRenderingContext2D
  private ctx: CanvasRenderingContext2D
  private readonly kept = new Map<string, Kept>()
  private readonly inks = new Map<InkName, CanvasPattern | string>()
  /** Device pixels to a stage unit that the kept pictures were drawn at, or 0 before any were; and how far past the stage the place is drawn. */
  private sharp = 0
  private spillX = -1
  private spillY = -1
  private tooth: HTMLCanvasElement | null = null
  private patching = false

  constructor(ctx: CanvasRenderingContext2D) {
    this.main = ctx
    this.ctx = ctx
  }

  /**
   * Draws every picture again if the surface needs them at another sharpness or shows more of the wood round the
   * stage. `sharp` is device pixels to a stage unit at full quality; `fit` is how the stage lies in the surface.
   */
  prepare(sharp: number, fit: Fit): void {
    // In steps of a quarter, so a surface that changes size by a hair does not draw everything again.
    const want = Math.max(0.5, Math.min(2, Math.ceil(sharp * 4) / 4))
    const { x: spillX, y: spillY } = spillOf(fit)
    if (want === this.sharp && spillX === this.spillX && spillY === this.spillY) return
    this.sharp = want; this.spillX = spillX; this.spillY = spillY
    this.epoch++
    this.kept.clear()
    this.inks.clear()
    this.tooth = toothTile(want, 0.035, 0x700d)
    const edge = toothTile(want, 0.46, 0xed6e)
    const draw = (picture: Picture, paint: (wax: Wax) => void, seed: number): HTMLCanvasElement => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(picture.w * want); canvas.height = Math.ceil(picture.h * want)
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(want, 0, 0, want, (picture.w / 2 - picture.ox) * want, (picture.h / 2 - picture.oy) * want)
      const wax = new Wax(ctx, seed, ctx.createPattern(this.tooth!, 'repeat')!, ctx.createPattern(edge, 'repeat')!)
      paint(wax)
      wax.grain(canvas.width, canvas.height)
      return canvas
    }
    let seed = 0x1eaf
    for (const picture of pictures()) this.kept.set(picture.key, { canvas: draw(picture, painterOf(picture.key), seed++), ...picture })
    // The clearing: crayon on a layer of its own, then laid on the sheet of paper.
    const scenery: Picture = { key: 'scenery', w: STAGE.width + spillX * 2, h: STAGE.height + spillY * 2, ox: STAGE.width / 2, oy: STAGE.height / 2 }
    const layer = draw(scenery, (wax) => paintScenery(wax, { x: spillX, y: spillY }), 0x5ce9)
    const sheet = document.createElement('canvas')
    sheet.width = layer.width; sheet.height = layer.height
    const ctx = sheet.getContext('2d')!
    ctx.fillStyle = rgba(INK.paper, 1)
    ctx.fillRect(0, 0, sheet.width, sheet.height)
    ctx.drawImage(layer, 0, 0)
    this.kept.set('scenery', { canvas: sheet, ...scenery })
    // The same sheet again, for the view to lay on it whatever lies still.
    const laid = document.createElement('canvas')
    laid.width = sheet.width; laid.height = sheet.height
    this.kept.set('laid', { canvas: laid, ...scenery, key: 'laid' } as Kept)
  }

  /** Starts a frame: the sheet of paper to every edge, then the stage fitted into the surface. */
  begin(fit: Fit, dpr: number, width: number, height: number): void {
    const ctx = this.main
    this.ctx = ctx
    this.patching = false
    this.count = 0
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.fillStyle = rgba(INK.paper, 1)
    ctx.fillRect(0, 0, width * dpr, height * dpr)
    ctx.setTransform(dpr * fit.scale, 0, 0, dpr * fit.scale, dpr * fit.x, dpr * fit.y)
  }

  into(key: string, w: number, h: number): void {
    let kept = this.kept.get(key)
    if (!kept || kept.w < w || kept.h < h) {
      const canvas = kept?.canvas ?? document.createElement('canvas')
      // A very large creature is kept a little softer, so its picture stays a size a tablet can hold.
      // The row of heaps is kept as sharp as every other picture of the place: it is wide and low.
      const scale = key === ROW ? this.sharp : Math.min(this.sharp, SLOT_PIXELS / Math.max(w, h))
      canvas.width = Math.ceil(w * scale); canvas.height = Math.ceil(h * scale)
      kept = { canvas, w, h, ox: 0, oy: 0 }
      this.kept.set(key, kept)
    }
    const ctx = kept.canvas.getContext('2d')!
    const scale = kept.canvas.width / kept.w
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, kept.canvas.width, kept.canvas.height)
    ctx.setTransform(scale, 0, 0, scale, kept.canvas.width / 2, kept.canvas.height / 2)
    this.ctx = ctx
  }

  patch(x0: number, y0: number, x1: number, y1: number): void {
    const kept = this.kept.get('laid')
    if (!kept) return
    const ctx = kept.canvas.getContext('2d')!, s = this.sharp
    ctx.save()
    ctx.setTransform(s, 0, 0, s, (kept.w / 2 - kept.ox) * s, (kept.h / 2 - kept.oy) * s)
    ctx.beginPath()
    ctx.rect(x0, y0, x1 - x0, y1 - y0)
    ctx.clip()
    this.ctx = ctx
    this.patching = true
  }

  out(): void {
    if (this.patching) this.ctx.restore()
    this.patching = false
    this.ctx = this.main
  }

  stamp(key: string, x: number, y: number, turn = 0, sx = 1, sy = 1, alpha = 1): void {
    const kept = this.kept.get(key)
    if (!kept || alpha <= 0) return
    const ctx = this.ctx
    this.count++
    ctx.globalAlpha = Math.min(1, alpha)
    if (turn === 0 && sx === 1 && sy === 1) {
      ctx.drawImage(kept.canvas, x - kept.w / 2 + kept.ox, y - kept.h / 2 + kept.oy, kept.w, kept.h)
    } else {
      ctx.save()
      ctx.translate(x, y)
      if (turn !== 0) ctx.rotate(turn)
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
      ctx.drawImage(kept.canvas, -kept.w / 2 + kept.ox, -kept.h / 2 + kept.oy, kept.w, kept.h)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  sprite(key: string, x: number, y: number, turn: number, sx: number, sy: number, alpha = 1): void {
    const kept = this.kept.get(key)
    if (!kept || alpha <= 0) return
    const ctx = this.ctx
    this.count++
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sx, sy)
    if (turn !== 0) ctx.rotate(turn)
    ctx.drawImage(kept.canvas, -kept.w / 2, -kept.h / 2, kept.w, kept.h)
    ctx.restore()
    ctx.globalAlpha = 1
  }

  /** The crayon a live line is drawn with: its hue with the tooth of the paper taken out, fixed to the sheet. */
  private crayon(ink: InkName): CanvasPattern | string {
    let style = this.inks.get(ink)
    if (style) return style
    style = rgba(INK[ink], 1)
    if (this.tooth && this.sharp > 0) {
      const tile = document.createElement('canvas')
      tile.width = this.tooth.width; tile.height = this.tooth.height
      const ctx = tile.getContext('2d')!
      ctx.fillStyle = style
      ctx.fillRect(0, 0, tile.width, tile.height)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(this.tooth, 0, 0)
      const pattern = this.main.createPattern(tile, 'repeat')
      if (pattern && typeof pattern.setTransform === 'function') {
        pattern.setTransform(new DOMMatrix().scale(1 / this.sharp))
        style = pattern
      }
    }
    this.inks.set(ink, style)
    return style
  }

  line(points: readonly number[], ink: InkName, width: number, alpha = 1): void {
    if (points.length < 4 || alpha <= 0) return
    const ctx = this.ctx
    this.count++
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.strokeStyle = this.crayon(ink)
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(points[0], points[1])
    for (let i = 2; i < points.length - 2; i += 2) ctx.quadraticCurveTo(points[i], points[i + 1], (points[i] + points[i + 2]) / 2, (points[i + 1] + points[i + 3]) / 2)
    ctx.lineTo(points[points.length - 2], points[points.length - 1])
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  dot(x: number, y: number, rx: number, ry: number, ink: InkName, alpha = 1): void {
    if (alpha <= 0 || rx <= 0 || ry <= 0) return
    const ctx = this.ctx
    this.count++
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.fillStyle = this.crayon(ink)
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}
