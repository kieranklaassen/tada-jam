import { FLAT, INK, CARD_IDS, paintCard } from './art'
import type { Item } from './frame'
import { CARDS, FINE, type CardId } from './sprites'
import { fit, type Fit } from './stage'

// Draws a frame (frame.ts) onto the canvas. Every card is painted once into
// a canvas of its own at the surface's density, with a small soft shadow so
// it stands off the sheet behind it, and then only stamped. The count this
// returns is what the grown-up handle reports as draw calls: stamps plus live
// strokes, the same list the frame-budget test counts.

/** Room round a card for its shadow, in stage units. */
const MARGIN = 8
/** What shows round the stage on a surface of another shape: the dark of the room the theatre stands in. */
export const ROOM = '#3a1c20'

type Baked = { image: HTMLCanvasElement; margin: number }

export class StageView {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private cards = new Map<CardId, Baked>()
  private density = 0
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private ratio = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.context = canvas.getContext('2d')!
  }

  /** The one fit of the stage into the surface, made from its size in CSS pixels: touches come back through it. */
  get fit(): Fit {
    return this.by
  }

  /** The surface has a new size or pixel ratio: the cards are painted again at that density, so they stay sharp. */
  resize(width: number, height: number, ratio: number): void {
    this.by = fit(width, height)
    this.ratio = ratio
    const density = Math.round(this.by.scale * ratio * 100) / 100
    if (density === this.density || density <= 0) return
    this.density = density
    this.cards = new Map()
    for (const id of CARD_IDS) this.cards.set(id, this.bake(id))
  }

  private bake(id: CardId): Baked {
    const card = CARDS[id], d = this.density * (FINE[id] ?? 1)
    const flat = FLAT.includes(id) || id === 'curtain'
    const margin = flat ? 0 : MARGIN
    const make = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil((card.w + margin * 2) * d)
      canvas.height = Math.ceil((card.h + margin * 2) * d)
      return [canvas, canvas.getContext('2d')!]
    }
    const [plain, c] = make()
    c.setTransform(d, 0, 0, d, margin * d, margin * d)
    paintCard(id, c)
    if (flat) return { image: plain, margin }
    // The card again with a soft shadow under it: it is a cut-out standing a little in front of what is behind.
    const [image, s] = make()
    s.shadowColor = 'rgba(48, 30, 14, 0.38)'
    s.shadowBlur = 5 * d
    s.shadowOffsetX = 2 * d
    s.shadowOffsetY = 3 * d
    s.drawImage(plain, 0, 0)
    return { image, margin }
  }

  /** Draws the frame and returns how many draws it took. */
  draw(items: readonly Item[]): number {
    const c = this.context, S = this.by.scale * this.ratio, ox = this.by.x * this.ratio, oy = this.by.y * this.ratio
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    if (S <= 0) return 0
    if (this.by.x > 0.5 || this.by.y > 0.5) { c.fillStyle = ROOM; c.fillRect(0, 0, this.canvas.width, this.canvas.height) }
    for (const item of items) {
      if (item.kind === 'stamp') {
        const baked = this.cards.get(item.card)
        if (!baked) continue
        const card = CARDS[item.card]
        const cos = Math.cos(item.tilt), sin = Math.sin(item.tilt)
        c.setTransform(S * cos * item.sx, S * sin * item.sx, -S * sin * item.sy, S * cos * item.sy, S * item.x + ox, S * item.y + oy)
        c.globalAlpha = item.alpha
        if (item.cutBelow !== undefined) {
          c.save()
          c.setTransform(S, 0, 0, S, ox, oy)
          c.beginPath()
          c.rect(0, 0, 1180, item.cutBelow)
          c.clip()
          c.setTransform(S * cos * item.sx, S * sin * item.sx, -S * sin * item.sy, S * cos * item.sy, S * item.x + ox, S * item.y + oy)
        }
        c.drawImage(baked.image, -card.ax - baked.margin, -card.ay - baked.margin, card.w + baked.margin * 2, card.h + baked.margin * 2)
        if (item.cutBelow !== undefined) c.restore()
        continue
      }
      c.setTransform(S, 0, 0, S, ox, oy)
      c.globalAlpha = 1
      switch (item.kind) {
        case 'gaze': {
          c.beginPath()
          item.points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
          c.closePath()
          // Pale on the floor while she only looks; hot while she is making up her mind.
          const cool = [255, 246, 178], hot = [246, 120, 62]
          const mix = cool.map((v, i) => Math.round(v + (hot[i] - v) * item.hot))
          c.fillStyle = `rgba(${mix[0]}, ${mix[1]}, ${mix[2]}, ${0.5 + item.hot * 0.16})`
          c.fill()
          c.setLineDash([9, 7])
          c.lineWidth = 1.6
          c.strokeStyle = INK
          c.globalAlpha = 0.55
          c.stroke()
          c.setLineDash([])
          break
        }
        case 'wire':
          c.beginPath()
          c.moveTo(item.x1, item.y1)
          c.lineTo(item.x2, item.y2)
          c.lineWidth = 1.8
          c.strokeStyle = '#5a5046'
          c.stroke()
          break
        case 'rope':
          c.beginPath()
          item.points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
          c.lineWidth = 2.2
          c.lineJoin = 'round'
          c.strokeStyle = INK
          c.stroke()
          break
        case 'pupils':
          c.beginPath()
          for (const eye of item.eyes) {
            if (item.shut) c.rect(eye.x - eye.r, eye.y - eye.r * 0.2, eye.r * 2, eye.r * 0.5)
            else { c.moveTo(eye.x + item.dx * eye.r * 0.42 + eye.r * 0.5, eye.y + item.dy * eye.r * 0.42); c.arc(eye.x + item.dx * eye.r * 0.42, eye.y + item.dy * eye.r * 0.42, eye.r * 0.5, 0, Math.PI * 2) }
          }
          c.fillStyle = INK
          c.fill()
          break
        case 'glow': {
          const glow = c.createRadialGradient(item.x, item.y, 4, item.x, item.y, item.r)
          glow.addColorStop(0, `rgba(255, 250, 200, ${0.85 * item.alpha})`)
          glow.addColorStop(0.6, `rgba(255, 244, 160, ${0.5 * item.alpha})`)
          glow.addColorStop(1, 'rgba(255, 244, 160, 0)')
          c.fillStyle = glow
          c.fillRect(item.x - item.r, item.y - item.r, item.r * 2, item.r * 2)
          break
        }
        case 'burst': {
          // Seven lines flying out of her beak: a honk drawn, never a sign over her head.
          c.beginPath()
          for (let i = 0; i < 7; i++) {
            const a = (i - 3) * 0.27, from = 10 + item.k * 26, to = from + 20 + (i % 2) * 12
            c.moveTo(item.x + item.face * Math.cos(a) * from, item.y + Math.sin(a) * from)
            c.lineTo(item.x + item.face * Math.cos(a) * to, item.y + Math.sin(a) * to)
          }
          c.lineWidth = 3
          c.lineCap = 'round'
          c.strokeStyle = INK
          c.globalAlpha = 1 - item.k * 0.6
          c.stroke()
          break
        }
        default:
          item satisfies never
      }
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    return items.length
  }
}
