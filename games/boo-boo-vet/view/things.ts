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

/** A folded blanket: three thick layers, the fold showing at one end, one band of trim. */
function blanket(pen: Pen): void {
  const c = PAL.blanket
  const layers: [number, number, number][] = [[-58, 14, 116], [-56, -14, 112], [-54, -42, 108]]
  for (const [x, y, w] of layers) {
    const slab = box(x, y, w, 32, 15)
    puff(pen, slab, c.cloth, 0.8)
    within(pen, slab, () => fill(pen, box(x + w - 30, y, 10, 32, 0), c.trim))
  }
  // The folds: where one layer turns into the next, at the left.
  line(pen, [-50, -11, -58, 2, -50, 15], c.fold, 4)
  line(pen, [-44, -12, 34, -12], c.fold, 2.5, false)
  line(pen, [-46, 16, 36, 16], c.fold, 2.5, false)
}

/** Plasters on their small sheet. */
function plaster(pen: Pen): void {
  const { g } = pen
  g.save()
  g.rotate(-0.1)
  puff(pen, box(-58, -48, 116, 96, 12), PAL.plaster.sheet, 0.5)
  plasterStrip(pen, 0, -21, 98, 32)
  plasterStrip(pen, 0, 21, 98, 32)
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
  within(pen, front, () => {
    line(pen, [-62, 10, -36, 25, 0, 30, 36, 25, 62, 10], c.weave, 3.5)
    line(pen, [-60, 26, -32, 39, 0, 43, 32, 39, 60, 26], c.weave, 3.5)
    for (let x = -45; x <= 45; x += 18) line(pen, [x, 4, x, 50], c.weave, 3, false)
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
