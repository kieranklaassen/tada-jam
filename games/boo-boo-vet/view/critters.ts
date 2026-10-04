// The small ones: the mouse who lives on the cart, and the two in the garden
// who were made well earlier. Each is one sticker, its origin where it stands.

import { blob, box, ell, eye, fill, line, poly, puff, type Pen } from './paint'
import { PAL } from './palette'
import type { Bounds } from './sticker'

export const MOUSE_BOUNDS: Bounds = { x0: -52, y0: -118, x1: 56, y1: 4 }

/** The mouse, with its little hat. `fuss` lifts its paws from its middle to its whiskers, as a mouse does when it tidies itself. */
export function mouse(pen: Pen, shut: boolean, fuss: boolean): void {
  const c = PAL.mouse
  line(pen, [16, -8, 40, -4, 48, -20, 38, -30], c.pink, 6)
  for (const s of [-1, 1]) {
    puff(pen, ell(s * 30, -84, 20, 20), c.fur, 0.7)
    fill(pen, ell(s * 30, -83, 12, 12), c.pink)
  }
  puff(pen, ell(0, -30, 29, 32), c.fur, 0.9)
  fill(pen, ell(0, -26, 17, 21), c.belly)
  for (const s of [-1, 1]) fill(pen, ell(s * 14, -3, 12, 6), c.pink)
  puff(pen, ell(0, -66, 35, 29), c.fur, 0.9)
  // The hat: a little round cap with a band, sat between the ears.
  puff(pen, box(-15, -114, 30, 24, 11), c.hat, 0.6)
  fill(pen, box(-15, -98, 30, 6, 0), c.hatBand)
  puff(pen, ell(0, -92, 25, 6.5), c.hat, 0.5)
  for (const s of [-1, 1]) eye(pen, s * 13, -68, 5.6, PAL.ink, c.fur, shut ? 1 : 0)
  // Its whiskers: a long hair curving up and a short one curving down, each side of the nose.
  for (const s of [-1, 1]) {
    line(pen, [s * 9, -59, s * 20, -64, s * 33, -63], 'rgba(67, 48, 90, 0.5)', 1.6)
    line(pen, [s * 9, -55, s * 18, -51, s * 26, -46], 'rgba(67, 48, 90, 0.5)', 1.6)
  }
  fill(pen, ell(0, -58, 5, 4), c.pink)
  line(pen, [-5, -51, 0, -49, 5, -51], PAL.ink, 2.4)
  if (fuss) {
    fill(pen, ell(-8, -50, 8, 6.5), c.pink)
    fill(pen, ell(8, -50, 8, 6.5), c.pink)
  } else {
    fill(pen, ell(-7, -36, 8, 6), c.pink)
    fill(pen, ell(7, -36, 8, 6), c.pink)
  }
}

/** A plaster of any size, lying along x about its centre: a strip, a pad, and the small holes that make it a plaster. */
export function plasterStrip(pen: Pen, x: number, y: number, w: number, h: number, rot = 0): void {
  const c = PAL.plaster, { g } = pen
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  puff(pen, box(-w / 2, -h / 2, w, h, h / 2), c.strip, h / 34)
  fill(pen, box(-w * 0.17, -h / 2 + h * 0.1, w * 0.34, h * 0.8, h * 0.14), c.pad)
  const r = h * 0.065
  for (const s of [-1, 1]) for (const dx of [0.27, 0.36]) for (const dy of [-0.2, 0.2]) fill(pen, ell(s * w * dx, h * dy, r, r), c.dot)
  g.restore()
}

export const HEDGEHOG_BOUNDS: Bounds = { x0: -50, y0: -96, x1: 52, y1: 4 }

/** The hedgehog, well, with the plaster that helped it stuck on its spines like a flag. */
export function hedgehog(pen: Pen, shut: boolean): void {
  const c = PAL.hedgehog
  plasterStrip(pen, -8, -70, 46, 17, -1.15)
  const spines: number[] = []
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (1.0 + (i / 14) * 1.06) - 0.1, r = i % 2 ? 46 : 36
    spines.push(-6 + Math.cos(a) * r, -18 + Math.sin(a) * r * 0.92)
  }
  spines.push(30, -2, -40, -2)
  puff(pen, poly(spines), c.spines, 0.8)
  puff(pen, blob([-8, -4, -4, -30, 22, -34, 46, -18, 30, -3]), c.face, 0.7)
  for (const x of [-14, 12]) fill(pen, ell(x, -2, 10, 5), c.face)
  fill(pen, ell(45, -19, 5.5, 5), c.nose)
  eye(pen, 23, -24, 5, PAL.ink, c.face, shut ? 1 : 0)
  line(pen, [28, -11, 34, -9, 39, -12], PAL.ink, 2.2)
  fill(pen, ell(14, -14, 6, 4), 'rgba(255, 143, 163, 0.7)')
}

export const DUCK_BOUNDS: Bounds = { x0: -50, y0: -98, x1: 56, y1: 4 }

/** The duck, well, sitting in the bowl that helped it as if the bowl were a boat. */
export function duck(pen: Pen, shut: boolean): void {
  const c = PAL.duck, b = PAL.bowl
  fill(pen, ell(0, -30, 46, 10), b.rim)
  fill(pen, ell(0, -30, 39, 7), b.waterDeep)
  puff(pen, blob([-34, -34, -44, -62, -30, -52, 6, -60, 30, -44, 20, -24, -20, -22]), c.body, 0.8)
  fill(pen, ell(-8, -40, 17, 10, 0.2), c.wing)
  puff(pen, ell(42, -70, 13, 6.5, 0.1), c.bill, 0.5)
  puff(pen, ell(20, -74, 21, 20), c.body, 0.8)
  eye(pen, 25, -78, 5, PAL.ink, c.body, shut ? 1 : 0)
  fill(pen, ell(16, -66, 6, 4), 'rgba(255, 138, 60, 0.55)')
  // The near side of the bowl, in front of the duck.
  puff(pen, blob([-46, -30, -20, -24, 20, -24, 46, -30, 34, -4, 22, 0, -22, 0, -34, -4], 0.7), b.body, 0.8)
}
