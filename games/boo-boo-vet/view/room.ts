// The room: floor, door, table, cart, window, lamp, and a leaf in the garden.
// Each is one sticker. The surfaces things lie on are plain and calm, so what
// stands on them is what the eye finds.

import { CART, CART_HEIGHT, TABLE_HEIGHT } from './layout'
import { blob, box, ell, fill, line, puff, type Pen } from './paint'
import { PAL } from './palette'
import type { Bounds } from './sticker'

/** The floor: a band from its top edge down, `w` wide and `h` deep, its origin at its top left corner. */
export function floor(pen: Pen, w: number, h: number): void {
  puff(pen, box(-60, 0, w + 120, h + 60, 0), PAL.floor, 0.8)
  line(pen, [-60, 46, w + 60, 46], PAL.floorLine, 4, false)
}

export const DOOR_BOUNDS: Bounds = { x0: -120, y0: -492, x1: 120, y1: 0 }

/** A doorway with a round top: straight sides of half-width `hw` up from the foot, and a half circle over them reaching `top`. */
function arch(hw: number, top: number): Path2D {
  const p = new Path2D()
  p.moveTo(-hw, 0)
  p.lineTo(-hw, top + hw)
  p.arc(0, top + hw, hw, Math.PI, 0)
  p.lineTo(hw, 0)
  p.closePath()
  return p
}

/** The doorway, open onto the garden path, with the door swung back on its hinges. Origin: the middle of the threshold. */
export function door(pen: Pen): void {
  const c = PAL.door, { g } = pen
  puff(pen, arch(118, -490), c.frame)
  g.save()
  g.clip(arch(94, -466))
  fill(pen, box(-120, -500, 240, 500, 0), c.sky)
  puff(pen, ell(60, -150, 150, 70), c.hill, 0.8)
  puff(pen, ell(-10, -40, 200, 110), c.grass, 0.8)
  fill(pen, blob([-10, 0, 22, -128, 44, -128, 84, 0], 0.4), c.path)
  // The door itself, swung in on the hinge side: a tall panel with a round knob.
  puff(pen, blob([-98, 6, -98, -480, -44, -452, -44, 6], 0.08), c.leaf, 0.8)
  fill(pen, ell(-58, -262, 8.5, 8.5), c.knob)
  g.restore()
}

export const TABLE_BOUNDS: Bounds = { x0: -172, y0: -4, x1: 172, y1: TABLE_HEIGHT + 8 }

/** The examination table: a thick plain top on two legs. Origin: the middle of the top's surface. */
export function table(pen: Pen): void {
  const c = PAL.table
  for (const s of [-1, 1]) {
    puff(pen, box(s * 118 - 13, 30, 26, TABLE_HEIGHT - 30, 8), c.leg, 0.7)
    puff(pen, box(s * 118 - 28, TABLE_HEIGHT - 12, 56, 18, 9), c.foot, 0.6)
  }
  puff(pen, box(-122, 96, 244, 16, 8), c.leg, 0.6)
  puff(pen, box(-170, 0, 340, 50, 20), c.edge, 0.8)
  puff(pen, box(-170, -2, 340, 34, 17), c.top, 0.8)
}

export const CART_BOUNDS: Bounds = { x0: -CART.w / 2 - 8, y0: -CART_HEIGHT - 8, x1: CART.w / 2 + 8, y1: 2 }

/** The cart: two plain trays between two posts, on wheels, with a push rail. Origin: the middle of where its wheels stand. */
export function cart(pen: Pen): void {
  const c = PAL.cart, half = CART.w / 2, top = -CART_HEIGHT
  for (const s of [-1, 1]) {
    puff(pen, box(s * (half - 16) - 12, top + 4, 24, CART_HEIGHT - 30, 10), c.post, 0.7)
    puff(pen, ell(s * (half - 44), -20, 21, 21), c.wheel, 0.7)
    fill(pen, ell(s * (half - 44), -20, 8, 8), c.hub)
  }
  // The push rail, across the top from post to post.
  puff(pen, box(-half - 6, top - 6, CART.w + 12, 20, 10), c.post, 0.6)
  for (const tray of [0, 1]) {
    const y = top + CART.rail + tray * (CART.trayH + CART.gap)
    puff(pen, box(-half, y, CART.w, CART.trayH, 22), c.lip, 0.8)
    puff(pen, box(-half + 9, y + 7, CART.w - 18, CART.trayH - 26, 16), c.tray, 0.6)
  }
}

export const WINDOW_BOUNDS: Bounds = { x0: -172, y0: -108, x1: 172, y1: 118 }

/** The window onto the garden: sky, two hills and a bush, in a frame with a sill. Origin: the middle of the glass. */
export function windowFrame(pen: Pen): void {
  const c = PAL.window, { g } = pen
  puff(pen, box(-170, -106, 340, 212, 30), c.frame)
  const glass = box(-150, -86, 300, 172, 16)
  g.save()
  g.clip(glass)
  const sky = g.createLinearGradient(0, -86, 0, 86)
  sky.addColorStop(0, c.sky)
  sky.addColorStop(1, c.skyLow)
  fill(pen, glass, sky)
  puff(pen, ell(110, 78, 170, 74), c.hillFar, 0.8)
  puff(pen, ell(-60, 108, 210, 78), c.hill, 0.8)
  puff(pen, blob([118, 86, 104, 40, 130, 14, 156, 40, 150, 86]), c.bush, 0.7)
  g.restore()
  puff(pen, box(-172, 92, 344, 24, 12), c.sill, 0.6)
}

export const LAMP_BOUNDS: Bounds = { x0: -78, y0: -240, x1: 78, y1: 26 }

/** The lamp over the table: a cord and a round shade with the bulb showing under it. Origin: the middle of the shade's rim. */
export function lamp(pen: Pen): void {
  const c = PAL.lamp
  fill(pen, box(-3.5, -240, 7, 180, 0), c.cord)
  puff(pen, ell(0, 4, 24, 20), c.bulb, 0.6)
  puff(pen, blob([-76, 0, -66, -44, -30, -72, 30, -72, 66, -44, 76, 0, 40, 6, -40, 6], 0.75), c.shade)
  puff(pen, box(-14, -84, 28, 18, 8), c.cord, 0.5)
}

export const LEAF_BOUNDS: Bounds = { x0: -40, y0: -6, x1: 40, y1: 74 }

/** A sprig that hangs into the window and moves in the air. Origin: where it hangs from. */
export function leaf(pen: Pen): void {
  const c = PAL.leaf
  line(pen, [0, 0, -4, 30, 4, 60], c.stem, 5)
  puff(pen, ell(-18, 22, 18, 10, 0.5), c.green, 0.6)
  puff(pen, ell(18, 36, 18, 10, -0.5), c.green, 0.6)
  puff(pen, ell(2, 62, 11, 17, 0.1), c.green, 0.6)
}
