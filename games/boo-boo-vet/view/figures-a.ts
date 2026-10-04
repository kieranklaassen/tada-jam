// The bear, the rabbit and the dog, sitting upright and well. The rabbit and
// the dog are the animals of the spike (animals.ts): the same colours and the
// same heads, at rest instead of in need.

import { cheeks, eyes, mouth, tongueOut, type Face } from './faces'
import type { Figure } from './figures'

/** Whether the ear on side `s` (-1 the left of the screen, 1 the right) hangs when `hang` of them do: the left one comes up first. */
export const hangs = (hang: number, s: number): boolean => hang >= 2 || (hang >= 1 && s > 0)
import { blob, box, ell, fill, puff, type Pen } from './paint'
import { PAL } from './palette'

/** The bear: the biggest, wide and heavy, and most of it is belly. */
export const bear: Figure = {
  bounds: { x0: -128, y0: -252, x1: 128, y1: 4 },
  anchors: { head: { x: 0, y: -244 }, mouth: { x: 0, y: -160 }, lap: { x: 0, y: -40 }, back: { x: 100, y: -150 }, side: { x: -104, y: -88 } },
  paint(pen: Pen, face: Face, shut: boolean, hang = 0): void {
    const c = PAL.bear
    for (const s of [-1, 1]) {
      // A hanging ear has slid down the side of the head and lies flat against it.
      const [x, y, ry] = hangs(hang, s) ? [s * 80, -196, 17] : [s * 58, -228, 23]
      puff(pen, ell(x, y, 23, ry), c.fur, 0.7)
      fill(pen, ell(x, y + 2, 12, ry * 0.52), c.inner)
    }
    puff(pen, blob([-64, -162, 64, -162, 118, -76, 98, -6, -98, -6, -118, -76]), c.fur)
    // The belly: round, pale, and far out in front.
    puff(pen, ell(0, -74, 80, 66), c.belly, 1.1)
    for (const s of [-1, 1]) {
      puff(pen, ell(s * 76, -17, 42, 24), c.fur, 0.8)
      fill(pen, ell(s * 80, -14, 22, 13), c.pad)
      // The arms rest on the sides of the belly.
      puff(pen, ell(s * 100, -100, 23, 50, -s * 0.2), c.fur, 0.8)
    }
    puff(pen, ell(0, -186, 80, 60), c.fur)
    puff(pen, ell(0, -168, 36, 27), c.belly, 0.7)
    fill(pen, ell(0, -181, 14, 10), c.nose)
    const at = { eyes: 36, eyeY: -200, r: 10.5, mouthY: -163, wide: 14, fur: c.fur }
    eyes(pen, at, face, shut)
    mouth(pen, at, face)
    cheeks(pen, 56, -178, 13, face)
  },
}

/** The rabbit's own drawing is larger than it sits here: it is the spike's rabbit, ears up, drawn small. */
const RABBIT = 0.74

/** The rabbit: small and light, and half its height is ears. */
export const rabbit: Figure = {
  bounds: { x0: -68, y0: -212, x1: 68, y1: 4 },
  anchors: { head: { x: 0, y: -157 }, mouth: { x: 0, y: -93 }, lap: { x: 0, y: -30 }, back: { x: 52, y: -90 }, side: { x: -48, y: -70 } },
  paint(pen: Pen, face: Face, shut: boolean, hang = 0): void {
    const c = PAL.rabbit, { g } = pen
    g.save()
    g.scale(RABBIT, RABBIT)
    // Ears up, a little apart: the first thing anyone sees of it. A hanging ear lops down beside the cheek.
    for (const s of [-1, 1]) {
      const [x, y, turn] = hangs(hang, s) ? [s * 62, -128, -s * 0.34] : [s * 36, -226, s * 0.13]
      puff(pen, ell(x, y, 22, 60, turn), c.fur)
      fill(pen, ell(x + s, y + 3, 10, 43, turn), c.inner)
    }
    puff(pen, ell(66, -30, 19, 19), c.belly, 0.7)
    puff(pen, blob([-52, -132, 52, -132, 76, -62, 60, -6, -60, -6, -76, -62]), c.fur)
    fill(pen, ell(0, -56, 40, 46), c.belly)
    for (const s of [-1, 1]) {
      puff(pen, ell(s * 38, -12, 32, 18), c.paw, 0.8)
      // Arms loose at its sides, paws in its lap.
      puff(pen, ell(s * 62, -84, 17, 40, -s * 0.22), c.arm, 0.8)
      puff(pen, ell(s * 50, -50, 16, 14), c.paw, 0.6)
    }
    puff(pen, ell(0, -152, 74, 62), c.fur)
    fill(pen, blob([-8, -146, 8, -146, 0, -137], 0.6), c.nose)
    const at = { eyes: 30, eyeY: -160, r: 13, mouthY: -128, wide: 15, fur: c.fur }
    eyes(pen, at, face, shut)
    mouth(pen, at, face)
    cheeks(pen, 50, -138, 14, face)
    g.restore()
  },
}

/** The dog: bouncy and eager, ears hanging, tail up, and its tongue out whenever it is pleased. */
export const dog: Figure = {
  bounds: { x0: -106, y0: -222, x1: 106, y1: 4 },
  anchors: { head: { x: 0, y: -218 }, mouth: { x: 0, y: -124 }, lap: { x: 0, y: -34 }, back: { x: 86, y: -108 }, side: { x: -68, y: -76 } },
  paint(pen: Pen, face: Face, shut: boolean, hang = 0): void {
    const c = PAL.dog, { g } = pen
    // The tail stands up behind it.
    puff(pen, ell(-76, -50, 11, 32, -0.55), c.fur, 0.7)
    puff(pen, blob([-46, -150, 46, -150, 78, -58, 64, -6, -64, -6, -78, -58]), c.fur)
    for (const s of [-1, 1]) puff(pen, ell(s * 52, -11, 30, 16), c.paw, 0.8)
    for (const x of [-27, 4]) {
      puff(pen, box(x, -100, 23, 94, 11), c.fur, 0.7)
      puff(pen, ell(x + 11.5, -9, 19, 11), c.paw, 0.6)
    }
    // A pale bib under the chin.
    puff(pen, ell(0, -96, 34, 22), c.muzzle, 0.6)
    g.save()
    g.translate(0, -156)
    puff(pen, ell(0, 0, 76, 62), c.fur)
    // Its ears hang at the best of times; drooping, they hang lower, straight down and close in to the cheeks.
    for (const s of [-1, 1]) puff(pen, hangs(hang, s) ? ell(s * 70, 40, 20, 64, s * 0.1) : ell(s * 78, 20, 23, 60, -s * 0.08), c.ear, 0.9)
    puff(pen, blob([-46, 22, -26, 2, 26, 2, 46, 22, 32, 46, -32, 46]), c.muzzle, 0.8)
    fill(pen, ell(0, 12, 15, 10), c.nose)
    const at = { eyes: 32, eyeY: -14, r: 14, mouthY: 30, wide: 13, fur: c.fur }
    eyes(pen, at, face, shut)
    // Pleased, the tongue comes out: the funniest part of a dog.
    if (face === 'glad') tongueOut(pen, 0, 36, 22, 34)
    if (face === 'bliss') tongueOut(pen, 7, 35, 20, 30)
    mouth(pen, at, face)
    cheeks(pen, 56, 10, 13, face)
    g.restore()
  },
}
