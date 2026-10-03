// The sticker pipeline. A drawing (fills only) is baked once into a sprite
// that carries the white cut border of even width and the small soft shadow;
// each frame then costs one drawImage for the sticker, and for its gloss one
// gradient filled through the drawing's outline. Nothing is composited off
// screen per frame. Sprites are made lazily at first draw, at the pixel ratio
// in use, and made again only when that changes.

import { penFor, type Ctx, type Pen } from './paint'

/** The look's numbers, in design units (one unit is one logical pixel at 1180×820). */
export const BORDER = 7
export const SHADOW = { dy: 5, blur: 9, color: 'rgba(44, 62, 104, 0.34)' } as const
/** The gloss streak: widths as a share of the sticker's size, the angle of its axis, and how white it is. */
export const GLOSS = { width: 0.14, thin: 0.035, gap: 0.04, soft: 0.06, alpha: 0.4, angle: 0.42 } as const
const PAD = BORDER + SHADOW.blur + SHADOW.dy + 2

export type Bounds = { x0: number; y0: number; x1: number; y1: number }
export type Paint = (pen: Pen) => void

export type Sticker = {
  /** The sticker as it lies on the sheet: shadow, border, drawing. */
  face: HTMLCanvasElement
  /** The drawing's outline, in its own units: what the gloss is clipped to. The border is white, so gloss on it would not show. */
  cut: Path2D
  /** Size in design units, and where the drawing's origin sits inside it. */
  w: number
  h: number
  ox: number
  oy: number
}

export type Pose = { x: number; y: number; rot?: number; sx?: number; sy?: number }

function surface(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return [canvas, canvas.getContext('2d')!]
}

/** The working surfaces of a bake, kept and reused, so baking leaves nothing behind to be collected but the sprite itself. */
const bench: [HTMLCanvasElement, Ctx][] = []

function work(i: number, w: number, h: number): [HTMLCanvasElement, Ctx] {
  const held = bench[i]
  if (!held) return (bench[i] = surface(w, h))
  // Sizing a canvas wipes it and resets its state.
  held[0].width = w
  held[0].height = h
  return held
}

/**
 * Bakes one sticker. `bounds` is the box the drawing stays inside, in its own
 * units; `k` is device pixels per unit. `peel` from 0 to 1 curls the lower
 * right corner up, as a sticker lifted by a fingernail.
 */
export function bake(paint: Paint, bounds: Bounds, k: number, peel = 0): Sticker {
  const W = Math.ceil((bounds.x1 - bounds.x0 + PAD * 2) * k), H = Math.ceil((bounds.y1 - bounds.y0 + PAD * 2) * k)
  const ox = PAD - bounds.x0, oy = PAD - bounds.y0
  const [art, ag] = work(0, W, H)
  ag.setTransform(k, 0, 0, k, ox * k, oy * k)
  const pen = penFor(ag, k)
  paint(pen)

  // The cut shape: the drawing grown by the border on every side, so the border is the same width everywhere.
  const [mask, mg] = work(1, W, H)
  const r = BORDER * k
  for (const [ring, steps] of [[1, 28], [0.5, 12]] as const) {
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      mg.drawImage(art, Math.cos(a) * r * ring, Math.sin(a) * r * ring)
    }
  }
  mg.drawImage(art, 0, 0)
  mg.globalCompositeOperation = 'source-in'
  mg.fillStyle = '#ffffff'
  mg.fillRect(0, 0, W, H)
  mg.globalCompositeOperation = 'source-over'
  mg.drawImage(mask, 0, 0)
  mg.drawImage(mask, 0, 0)

  const [top, tg] = work(2, W, H)
  tg.drawImage(mask, 0, 0)
  tg.drawImage(art, 0, 0)
  if (peel > 0) curl(tg, mg, mask, (bounds.x1 + BORDER + ox) * k, (bounds.y1 + BORDER + oy) * k, peel * Math.min(W, H) * 0.5, k)

  const [face, fg] = surface(W, H)
  fg.shadowColor = SHADOW.color
  fg.shadowBlur = SHADOW.blur * k
  fg.shadowOffsetY = SHADOW.dy * k
  fg.drawImage(mask, 0, 0)
  fg.shadowColor = 'transparent'
  fg.drawImage(top, 0, 0)
  return { face, cut: pen.cut, w: W / k, h: H / k, ox, oy }
}

/**
 * The corner curl. The part of the cut shape beyond a slanted fold line is cut
 * away, and its back is laid over the sticker, mirrored in the fold: a skewed
 * wedge with the sticker's own outline, paler at the tip, with a small shadow.
 */
function curl(tg: Ctx, mg: Ctx, mask: HTMLCanvasElement, cx: number, cy: number, d: number, k: number): void {
  const W = mask.width, H = mask.height, far = d * 4
  const beyond = (g: Ctx) => {
    g.beginPath()
    g.moveTo(cx - d - far, cy + far)
    g.lineTo(cx - d, cy)
    g.lineTo(cx, cy - d)
    g.lineTo(cx + far, cy - d - far)
    g.lineTo(cx + far, cy + far)
    g.closePath()
    g.fill()
  }
  // The lifted corner, seen from the back.
  const [corner, cg] = work(3, W, H)
  cg.drawImage(mask, 0, 0)
  cg.globalCompositeOperation = 'destination-in'
  beyond(cg)
  const back = cg.createLinearGradient(cx - d / 2, cy - d / 2, cx, cy)
  back.addColorStop(0, '#c3cee3')
  back.addColorStop(0.3, '#ffffff')
  back.addColorStop(1, '#e3eaf5')
  cg.globalCompositeOperation = 'source-in'
  cg.fillStyle = back
  cg.fillRect(0, 0, W, H)
  for (const g of [tg, mg]) {
    g.save()
    g.globalCompositeOperation = 'destination-out'
    beyond(g)
    g.restore()
  }
  // Mirrored in the fold line, which runs up and to the right through (cx - d, cy).
  const through = cx - d + cy
  tg.save()
  tg.shadowColor = 'rgba(44, 62, 104, 0.42)'
  tg.shadowBlur = 5 * k
  tg.shadowOffsetX = -2 * k
  tg.shadowOffsetY = -2 * k
  tg.setTransform(0, -1, -1, 0, through, through)
  tg.drawImage(corner, 0, 0)
  tg.restore()
}

function place(g: Ctx, pose: Pose): void {
  g.translate(pose.x, pose.y)
  if (pose.rot) g.rotate(pose.rot)
  if (pose.sx !== undefined || pose.sy !== undefined) g.scale(pose.sx ?? 1, pose.sy ?? 1)
}

/** Draws a sticker with its origin at the pose. Squash and tilt act on the whole sticker, about its origin. */
export function drawSticker(g: Ctx, s: Sticker, pose: Pose): void {
  g.save()
  place(g, pose)
  g.drawImage(s.face, -s.ox, -s.oy, s.w, s.h)
  g.restore()
}

/**
 * The gloss: one slanted streak of light (a wide band and a thin one beside
 * it) clipped to the sticker's outline. `at` from 0 to 1 is where across the
 * sticker it lies; moving it is what makes the sticker shine. `strength` dims
 * it for a large calm piece.
 */
export function drawGloss(g: Ctx, s: Sticker, pose: Pose, at: number, strength = 1): void {
  // The streak lies across a slanted axis, so it leans like light on a curled sheet. Its widths follow the sticker's size.
  const size = Math.min(s.w, s.h), reach = s.w + s.h
  const ax = Math.cos(GLOSS.angle), ay = Math.sin(GLOSS.angle), cx = at * s.w - s.ox, cy = s.h / 2 - s.oy
  const w = (GLOSS.width * size) / 2, gap = GLOSS.gap * size, thin = GLOSS.thin * size, soft = GLOSS.soft * size, a = GLOSS.alpha * strength
  // Only the upright strip of the sticker that the streak crosses is filled: on a long sticker that is a small part of it.
  const lean = (s.h / 2) * (ay / ax)
  const x0 = Math.max(-s.ox, cx - (w + soft) / ax - lean), x1 = Math.min(s.w - s.ox, cx + (w + gap + thin + 1) / ax + lean)
  if (x1 <= x0) return
  g.save()
  place(g, pose)
  g.clip(s.cut)
  const band = g.createLinearGradient(cx - ax * reach, cy - ay * reach, cx + ax * reach, cy + ay * reach)
  const stop = (units: number, alpha: number) => band.addColorStop(0.5 + units / (reach * 2), `rgba(255, 255, 255, ${alpha})`)
  stop(-w - soft, 0)
  stop(-w, a)
  stop(w, a * 0.75)
  stop(w + 0.75, 0)
  stop(w + gap, 0)
  stop(w + gap + 0.75, a * 0.7)
  stop(w + gap + thin, a * 0.7)
  stop(w + gap + thin + 0.75, 0)
  g.fillStyle = band
  g.fillRect(x0, -s.oy, x1 - x0, s.h)
  g.restore()
}

/** The sprites in use, by name. Emptied when the pixels per unit change, so each is baked again at the new size. */
export class Sheet {
  private k = 0
  private readonly made = new Map<string, { sticker: Sticker; stamp: string }>()

  /** Call once a frame, before any `get`, with the device pixels per design unit. Returns whether the sprites were emptied. */
  use(k: number): boolean {
    if (k === this.k) return false
    this.k = k
    this.made.clear()
    return true
  }

  /** The sticker of that name, baked at first use. A sticker whose drawing depends on something (the floor's width) passes it as `stamp`, and is baked again when it changes. */
  get(name: string, bounds: Bounds, paint: Paint, peel = 0, stamp = ''): Sticker {
    const held = this.made.get(name)
    if (held && held.stamp === stamp) return held.sticker
    const sticker = bake(paint, bounds, this.k, peel)
    this.made.set(name, { sticker, stamp })
    return sticker
  }
}
