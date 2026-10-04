// What the toy needs besides the animals and the things on the cart: the
// blanket opened out, one plaster off its sheet, a drop of water, the ghost
// hand of the idle guidance, and the glow that says "this can be touched".

import { plasterStrip } from './critters'
import { blob, box, ell, fill, line, puff, within, type Pen } from './paint'
import { PAL } from './palette'
import type { Bounds, Paint } from './sticker'

/** The blanket unfolded and draped over whoever is under it, seen from the front. Origin: the middle of its hem. */
function blanketOpen(pen: Pen): void {
  const c = PAL.blanket
  // A round top where the head is, shoulders, then the cloth falling wide to two corners and a hem that hangs in folds.
  const cloth = blob([
    -150, 0, -140, -52, -114, -114, -72, -166, -28, -192, 28, -192, 72, -166, 114, -114, 140, -52, 150, 0,
    118, -14, 86, 2, 52, -14, 18, 2, -16, -14, -50, 2, -84, -14, -118, 2,
  ], 0.85)
  puff(pen, cloth, c.cloth, 1.2)
  within(pen, cloth, () => {
    // The pleats: the shaded hollow of each fold, widest at the hem.
    for (const [x, top] of [[-84, -74], [-16, -64], [52, -78]]) fill(pen, blob([x - 20, 8, x - 6, top, x + 6, top, x + 20, 8], 0.9), 'rgba(226, 158, 20, 0.4)')
    // The band of trim, a hand's width above the hem and hanging with it.
    line(pen, [-152, -22, -118, -24, -84, -37, -50, -24, -16, -37, 18, -24, 52, -37, 86, -24, 118, -37, 152, -22], c.trim, 13)
    // The folds, falling from the top of the lump.
    line(pen, [-30, -170, -62, -122, -78, -76], c.fold, 4.5)
    line(pen, [34, -168, 68, -120, 88, -80], c.fold, 4.5)
    line(pen, [0, -150, -6, -110, -14, -72], c.fold, 4)
  })
}

function plasterOne(pen: Pen): void {
  plasterStrip(pen, 0, 0, 84, 34)
}

/** One drop of water: pointed above, round below. */
function drop(pen: Pen): void {
  const c = PAL.drop, shape = new Path2D()
  shape.moveTo(0, -12)
  shape.bezierCurveTo(2.5, -6, 9, -2, 9, 3)
  shape.arc(0, 3, 9, 0, Math.PI)
  shape.bezierCurveTo(-9, -2, -2.5, -6, 0, -12)
  shape.closePath()
  puff(pen, shape, c.water, 0.45)
  pen.mute++
  fill(pen, ell(-3.2, 2.5, 2, 3.2, 0.3), c.glint)
  pen.mute--
}

/**
 * The ghost hand: pale and soft, one finger out, pointing down and to the
 * left at the origin, which is the fingertip. It is seen from the back: the
 * other fingers are curled under, the thumb lies across them, and the wrist
 * runs off up and to the right.
 */
function hand(pen: Pen): void {
  const c = PAL.hand, { g } = pen
  g.save()
  // Drawn pointing straight down, then turned so the finger points down and to the left.
  g.rotate(0.55)
  puff(pen, box(-6, -122, 42, 40, 12), c.skin, 0.6)
  puff(pen, box(-16, -100, 62, 52, 22), c.skin, 0.8)
  // The curled fingers: three knuckles beside the one that points.
  for (const [x, y, r] of [[21, -50, 10.5], [36, -54, 9.5], [47, -62, 8]]) puff(pen, ell(x, y, r, r + 2), c.skin, 0.5)
  puff(pen, ell(-19, -72, 11, 21, 0.25), c.skin, 0.6)
  puff(pen, box(-11, -66, 22, 66, 11), c.skin, 0.7)
  pen.mute++
  // One crease at the knuckle: two level ones would be two bars together.
  line(pen, [-6, -38, 0, -36, 6, -38], c.line, 2.4)
  line(pen, [-4, -112, 34, -112], c.line, 2.6, false)
  pen.mute--
  g.restore()
}

/**
 * The glow behind a thing that can be touched: a warm white disc with a
 * golden rim that fades out. White reads on the blue tray and on the yellow
 * floor; the gold reads on the pale wall. It is light, not vinyl: bake it
 * bare (no border, no shadow) and give it no gloss.
 */
function halo(pen: Pen): void {
  const c = PAL.halo, { g } = pen
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, 85)
  glow.addColorStop(0, c.core)
  glow.addColorStop(0.62, c.core)
  glow.addColorStop(0.8, c.gold)
  glow.addColorStop(1, c.out)
  fill(pen, ell(0, 0, 85, 85), glow)
}

export type Extra = 'blanketOpen' | 'plasterOne' | 'drop' | 'hand' | 'halo'

/** Each extra's drawing and the box it stays inside. `bare` marks the one that is baked without border and shadow. */
export const EXTRAS: Readonly<Record<Extra, { paint: Paint; bounds: Bounds; bare?: boolean }>> = {
  blanketOpen: { paint: blanketOpen, bounds: { x0: -150, y0: -196, x1: 150, y1: 2 } },
  plasterOne: { paint: plasterOne, bounds: { x0: -42, y0: -17, x1: 42, y1: 17 } },
  drop: { paint: drop, bounds: { x0: -9, y0: -12, x1: 9, y1: 12 } },
  hand: { paint: hand, bounds: { x0: -24, y0: -112, x1: 100, y1: 10 } },
  halo: { paint: halo, bounds: { x0: -85, y0: -85, x1: 85, y1: 85 }, bare: true },
}
