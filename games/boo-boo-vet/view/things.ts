// The five care things, each drawn as the real thing with its origin at its
// centre. Working things stay plain: no face, no pattern beyond what makes
// the thing itself readable. The charm goes on the animals and the room.

import type { Care } from '../needs'
import { plasterStrip } from './critters'
import { blob, box, ell, fill, line, puff, within, type Pen } from './paint'
import { PAL } from './palette'
import type { Bounds, Paint } from './sticker'

/** A bowl of water, seen a little from above so the water shows. */
function bowl(pen: Pen): void {
  const c = PAL.bowl
  puff(pen, blob([-56, -20, 56, -20, 46, 22, 30, 42, -30, 42, -46, 22], 0.8), c.body)
  fill(pen, ell(0, -20, 57, 19), c.rim)
  fill(pen, ell(0, -19, 48, 14), c.waterDeep)
  fill(pen, ell(0, -17, 44, 11), c.water)
  line(pen, [-26, -20, -8, -24, 8, -23], '#ffffff', 3.5)
}

/**
 * A folded blanket: a soft thick pile of cloth with its hem hanging in folds along the bottom, as the blanket has
 * when it is spread out, and the band of trim following that hem. It is one shape with a scalloped edge and one
 * curved crease: never a stack of level strips, and no straight band across it.
 */
function blanket(pen: Pen): void {
  const c = PAL.blanket
  // The layer underneath shows a little at the right and below: the pile is thick.
  puff(pen, blob([-50, -30, 56, -34, 60, 30, 44, 46, 22, 38, 0, 48, -22, 38, -44, 46, -54, 30], 0.8), c.fold, 0.6)
  const pile = blob([-58, -40, 50, -44, 56, 22, 40, 40, 20, 30, 0, 42, -20, 30, -42, 40, -58, 24], 0.85)
  puff(pen, pile, c.cloth, 1)
  within(pen, pile, () => {
    // The trim, a hand's width above the hem and hanging with it.
    line(pen, [-60, 12, -42, 24, -20, 14, 0, 26, 20, 14, 40, 24, 58, 8], c.trim, 9)
    // One soft crease where the cloth is folded over, curving from the top down to one side.
    line(pen, [-14, -44, -30, -24, -56, -12], c.fold, 3.5)
  })
}

/** A plaster on its small backing sheet, lying across it at a slant. One strip, tipped: never a level bar, and never two together. */
function plaster(pen: Pen): void {
  const { g } = pen
  g.save()
  g.rotate(-0.1)
  puff(pen, box(-58, -48, 116, 96, 12), PAL.plaster.sheet, 0.5)
  plasterStrip(pen, 0, 0, 104, 36, -0.42)
  g.restore()
}

/** A grooming brush: a wooden back with a handle, and a row of bristles under it. */
function brush(pen: Pen): void {
  const c = PAL.brush
  const teeth: number[] = [-52, -4]
  for (let i = 0; i < 9; i++) {
    const x = -52 + i * 11
    teeth.push(x + 1.5, 34, x + 8.5, 34, x + 10, 10)
    if (i < 8) teeth.push(x + 11, 10)
  }
  teeth.push(47, -4)
  puff(pen, blob(teeth, 0.25), c.bristle, 0.6)
  puff(pen, box(28, -30, 36, 22, 11), c.wood, 0.7)
  puff(pen, box(-60, -36, 108, 36, 18), c.wood, 0.9)
}

/** A basket bed: woven wicker with a high back and a low front, and a cushion in it. */
function basket(pen: Pen): void {
  const c = PAL.basket
  // The back wall, standing up behind the cushion, woven like the front.
  const back = blob([-60, 4, -56, -30, -30, -44, 30, -44, 56, -30, 60, 4, 0, 14], 0.9)
  puff(pen, back, c.inside, 0.8)
  within(pen, back, () => {
    for (let x = -50; x <= 50; x += 20) line(pen, [x, -46, x, 10], c.wicker, 3, false)
  })
  puff(pen, ell(0, 4, 47, 17), c.cushion, 0.8)
  const front = blob([-62, -8, -40, 12, 0, 18, 40, 12, 62, -8, 56, 30, 34, 46, -34, 46, -56, 30], 0.9)
  puff(pen, front, c.wicker)
  // The weave of the front runs one way only, round the basket: no upright crosses it.
  within(pen, front, () => {
    line(pen, [-62, 6, -36, 21, 0, 26, 36, 21, 62, 6], c.weave, 3.5)
    line(pen, [-61, 19, -34, 33, 0, 38, 34, 33, 61, 19], c.weave, 3.5)
    line(pen, [-58, 32, -32, 44, 0, 48, 32, 44, 58, 32], c.weave, 3.5)
  })
}

/** What each care thing draws, and the box it stays inside. Every one fits its touch target (layout.ts). */
export const THINGS: Readonly<Record<Care, { paint: Paint; bounds: Bounds }>> = {
  bowl: { paint: bowl, bounds: { x0: -60, y0: -42, x1: 60, y1: 46 } },
  blanket: { paint: blanket, bounds: { x0: -60, y0: -46, x1: 60, y1: 50 } },
  plaster: { paint: plaster, bounds: { x0: -66, y0: -58, x1: 66, y1: 58 } },
  brush: { paint: brush, bounds: { x0: -62, y0: -40, x1: 68, y1: 38 } },
  basket: { paint: basket, bounds: { x0: -64, y0: -46, x1: 64, y1: 50 } },
}
