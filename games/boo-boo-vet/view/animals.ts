// The two patients of the spike, each drawn as one sticker with its origin
// where it sits. A need is in the body and the face and nowhere else: no icon,
// no mark over the animal. Motion is the whole sticker's (spike.ts); what
// changes inside one is a second drawing, baked as its own sprite.

import { blob, box, ell, eye, fill, line, puff, type Pen } from './paint'
import { PAL } from './palette'
import type { Bounds } from './sticker'

/** The rabbit, cold, at the plain step: hunched, ears pressed down, arms hugged across its chest, a miserable face. */
export const RABBIT_BOUNDS: Bounds = { x0: -118, y0: -226, x1: 118, y1: 6 }

export function rabbit(pen: Pen, shut: boolean): void {
  const c = PAL.rabbit
  // Ears down: they hang from the top of the head past the cheeks.
  for (const s of [-1, 1]) {
    puff(pen, ell(s * 80, -128, 24, 66, -s * 0.3), c.fur)
    fill(pen, ell(s * 83, -122, 11, 46, -s * 0.3), c.inner)
  }
  puff(pen, ell(66, -30, 19, 19), c.belly, 0.7)
  // Hunched: the shoulders are up round the head.
  puff(pen, blob([-56, -132, 56, -132, 76, -62, 60, -6, -60, -6, -76, -62]), c.fur)
  fill(pen, ell(0, -52, 38, 40), c.belly)
  for (const s of [-1, 1]) puff(pen, ell(s * 38, -12, 32, 18), c.paw, 0.8)
  puff(pen, ell(0, -152, 74, 62), c.fur)
  // The hug: each arm crosses the chest from a tucked elbow up to the other shoulder, and holds it.
  puff(pen, ell(-7, -86, 60, 19, -0.46), c.arm, 0.8)
  puff(pen, ell(44, -112, 17, 15), c.paw, 0.6)
  puff(pen, ell(7, -86, 60, 19, 0.46), c.arm, 0.8)
  puff(pen, ell(-44, -112, 17, 15), c.paw, 0.6)

  // The face: brows up in the middle, heavy lids, a small mouth pulled down and wavering.
  for (const s of [-1, 1]) {
    eye(pen, s * 30, -160, 13, PAL.ink, c.fur, shut ? 1 : 0.34, s * 0.42)
    line(pen, [s * 14, -187, s * 42, -179], PAL.ink, 5.5, false)
    fill(pen, ell(s * 50, -138, 14, 9), 'rgba(255, 143, 163, 0.75)')
  }
  fill(pen, blob([-8, -146, 8, -146, 0, -137], 0.6), c.nose)
  line(pen, [-15, -121, -8, -127, 0, -123, 8, -127, 15, -121], PAL.ink, 4.5)
}

/** The dog, thirsty, at the plain step: slumped where it sits, head hung to one side, eyes on the floor, a long tongue out. */
export const DOG_BOUNDS: Bounds = { x0: -112, y0: -232, x1: 112, y1: 6 }

/** `pant` from 0 to 1 is how far the tongue hangs in this drawing. */
export function dog(pen: Pen, shut: boolean, pant: number): void {
  const c = PAL.dog, { g } = pen
  // The tail lies flat on the floor.
  puff(pen, ell(-80, -12, 30, 11, 0.1), c.fur, 0.7)
  // A sagging pear of a body, the hind feet out to the sides, the front legs straight down the middle.
  puff(pen, blob([-46, -150, 46, -150, 78, -58, 64, -6, -64, -6, -78, -58]), c.fur)
  fill(pen, ell(0, -64, 42, 54), c.muzzle)
  for (const s of [-1, 1]) puff(pen, ell(s * 52, -11, 30, 16), c.paw, 0.8)
  for (const x of [-27, 5]) {
    puff(pen, box(x, -100, 23, 94, 11), c.fur, 0.7)
    puff(pen, ell(x + 11.5, -9, 19, 11), c.paw, 0.6)
  }

  // The head hangs forward and to one side, low over the chest.
  g.save()
  g.translate(6, -142)
  g.rotate(0.13)
  puff(pen, ell(0, 0, 76, 62), c.fur)
  // The long ears hang straight down past the jaw.
  for (const s of [-1, 1]) puff(pen, ell(s * 78, 20, 23, 60, -s * 0.08), c.ear, 0.9)
  // The open mouth and the tongue hanging out of it, then the muzzle over them.
  const hang = 66 + pant * 14
  fill(pen, ell(2, 44, 26, 18), c.mouth)
  puff(pen, box(-13, 38, 30, hang, 15), c.tongue, 0.7)
  line(pen, [2, 54, 2, 38 + hang - 18], c.tongueLine, 3.5, false)
  puff(pen, blob([-46, 22, -26, 2, 26, 2, 46, 22, 32, 46, -32, 46]), c.muzzle, 0.8)
  fill(pen, ell(0, 12, 15, 10), c.nose)
  // The face: heavy lids low over eyes that look at the floor, and brows that have given up.
  for (const s of [-1, 1]) {
    eye(pen, s * 32, -14, 15, PAL.ink, c.fur, shut ? 1 : 0.46, s * 0.3)
    line(pen, [s * 16, -47, s * 42, -39], PAL.ink, 5, false)
  }
  g.restore()
}

/** A drawing made larger or smaller about its origin, with the box it then stays inside. */
export function sized(bounds: Bounds, scale: number): Bounds {
  return { x0: bounds.x0 * scale, y0: bounds.y0 * scale, x1: bounds.x1 * scale, y1: bounds.y1 * scale }
}
