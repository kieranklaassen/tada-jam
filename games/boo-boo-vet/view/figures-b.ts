// The cat, the hedgehog and the duck, sitting upright and well. The hedgehog
// and the duck are the two of the spike's garden (critters.ts), seen from the
// front at table size, in the same colours.

import { cheeks, eyes, mouth, type Face } from './faces'
import type { Figure } from './figures'
import { hangs } from './figures-a'
import { blob, box, ell, fill, line, poly, puff, tube, within, type Pen } from './paint'
import { PAL } from './palette'

/** The cat: smooth and exact, paws together, and a long striped tail curled up at one side. */
export const cat: Figure = {
  bounds: { x0: -128, y0: -202, x1: 74, y1: 4 },
  anchors: { head: { x: 0, y: -190 }, mouth: { x: 0, y: -122 }, lap: { x: 0, y: -32 }, back: { x: 62, y: -98 }, side: { x: -58, y: -70 } },
  paint(pen: Pen, face: Face, shut: boolean, hang = 0): void {
    const c = PAL.cat
    // The tail: out from the seat, up, and curled over at the tip.
    const tail = tube([-34, -18, -76, -14, -108, -36, -114, -80, -98, -114, -72, -118, -60, -98], 26, 20)
    puff(pen, tail, c.fur, 0.8)
    within(pen, tail, () => {
      for (const [x, y, dx, dy] of [[-92, -22, 10, 16], [-112, -58, 16, 2], [-106, -98, 12, -12], [-78, -116, 2, -16]]) {
        line(pen, [x - dx, y - dy, x + dx, y + dy], c.stripe, 8, false)
      }
    })
    puff(pen, blob([-40, -128, 40, -128, 66, -56, 56, -6, -56, -6, -66, -56]), c.fur)
    fill(pen, ell(0, -52, 32, 44), c.belly)
    for (const s of [-1, 1]) puff(pen, ell(s * 38, -11, 26, 15), c.belly, 0.8)
    // The front paws, neatly together.
    for (const x of [-23, 3]) {
      puff(pen, box(x, -88, 20, 82, 10), c.fur, 0.7)
      puff(pen, ell(x + 10, -9, 16, 10), c.belly, 0.6)
    }
    // Pointed ears: what makes it a cat from across the room.
    for (const s of [-1, 1]) {
      // A hanging ear is laid out flat to the side, its point level with the top of the head.
      const down = hangs(hang, s)
      puff(pen, blob(down ? [s * 22, -180, s * 72, -172, s * 62, -148] : [s * 16, -176, s * 54, -201, s * 66, -150], 0.45), c.fur, 0.8)
      fill(pen, blob(down ? [s * 34, -174, s * 64, -170, s * 57, -156] : [s * 30, -174, s * 51, -189, s * 57, -160], 0.45), c.inner)
    }
    const head = ell(0, -140, 68, 52)
    puff(pen, head, c.fur)
    within(pen, head, () => {
      // Tabby marks on the forehead: three soft wedges of darker fur that come down from the top of the head, a long
      // one and two short ones set apart. They are patches, never strokes: no stem, no bars, no arrow.
      fill(pen, blob([-7, -200, 7, -200, 1, -171], 0.5), c.stripe)
      fill(pen, blob([-27, -198, -14, -200, -19, -181], 0.5), c.stripe)
      fill(pen, blob([15, -200, 28, -197, 20, -183], 0.5), c.stripe)
    })
    fill(pen, blob([-7, -136, 7, -136, 0, -128], 0.6), c.nose)
    // Whiskers: a long one curving up and a short one curving down, each side. Never two level strokes together.
    for (const s of [-1, 1]) {
      line(pen, [s * 40, -129, s * 52, -135, s * 66, -134], PAL.ink, 2.4)
      line(pen, [s * 41, -121, s * 50, -116, s * 57, -109], PAL.ink, 2.4)
    }
    const at = { eyes: 28, eyeY: -148, r: 11.5, mouthY: -123, wide: 12, fur: c.fur }
    eyes(pen, at, face, shut)
    mouth(pen, at, face)
    cheeks(pen, 47, -131, 11, face)
  },
}

/** The hedgehog: tiny and round, a pale face in a ring of spines. */
export const hedgehog: Figure = {
  bounds: { x0: -76, y0: -140, x1: 76, y1: 4 },
  anchors: { head: { x: 0, y: -132 }, mouth: { x: 0, y: -47 }, lap: { x: 0, y: -20 }, back: { x: 54, y: -78 }, side: { x: -47, y: -48 } },
  paint(pen: Pen, face: Face, shut: boolean, hang = 0): void {
    const c = PAL.hedgehog
    // The spines: a crown of sharp machine-cut points all the way round.
    // Uneven, as spines are: no two neighbours the same length, so the crown is never a regular star.
    const spines: number[] = [], long = [72, 65, 70, 62, 73, 66, 69, 61, 71, 64, 72, 63, 68, 66, 70]
    for (let i = 0; i < 30; i++) {
      const a = ((i + (i % 2 ? 0.2 : 0)) / 30) * Math.PI * 2, r = i % 2 ? long[(i - 1) / 2] : 55
      spines.push(Math.sin(a) * r, -68 - Math.cos(a) * r * 0.94)
    }
    puff(pen, poly(spines), c.spines, 0.9)
    for (const s of [-1, 1]) {
      // A hanging ear has slipped down beside the cheek.
      const [x, y] = hangs(hang, s) ? [s * 47, -72] : [s * 36, -96]
      puff(pen, ell(x, y, 11, 11), c.face, 0.5)
      fill(pen, ell(x, y + 1, 5.5, 5.5), 'rgba(255, 143, 163, 0.8)')
      fill(pen, ell(s * 22, -5, 15, 8), c.face)
    }
    puff(pen, ell(0, -52, 49, 47), c.face, 0.9)
    // Small paws at rest on its middle.
    for (const s of [-1, 1]) puff(pen, ell(s * 34, -34, 10, 13, s * 0.5), c.face, 0.5)
    fill(pen, ell(0, -62, 7.5, 6), c.nose)
    const at = { eyes: 20, eyeY: -76, r: 7.5, mouthY: -51, wide: 9, fur: c.face }
    eyes(pen, at, face, shut)
    mouth(pen, at, face)
    cheeks(pen, 31, -61, 8.5, face)
  },
}

/** The duck's bill, which is its mouth: shut with a smile or a frown, open, round, slack, or pushed to one side. */
function bill(pen: Pen, face: Face): void {
  const c = PAL.duck, y = -110
  // How far an open bill gapes and how wide it is, for the faces that open it.
  const open: Partial<Record<Face, [number, number]>> = { glad: [14, 29], bliss: [17, 32], wow: [9, 17], worn: [7, 25], afraid: [5, 13] }
  const gaping = open[face]
  if (gaping) {
    const [gape, half] = gaping
    puff(pen, ell(0, y + gape, half * 0.8, 9), c.wing, 0.5)
    fill(pen, ell(0, y + gape * 0.5, half * 0.72, gape * 0.62 + 3), PAL.mouth)
    if (face === 'glad' || face === 'bliss') fill(pen, ell(0, y + gape * 0.85, half * 0.4, 4.5), PAL.tongue)
    puff(pen, ell(0, y - 3, half, 9.5), c.bill, 0.5)
    return
  }
  const tilt = face === 'wary' ? 0.2 : face === 'bothered' ? -0.16 : 0, x = face === 'wary' ? 6 : face === 'bothered' ? -5 : 0
  puff(pen, ell(x, y, 31, 12, tilt), c.bill, 0.5)
  pen.g.save()
  pen.g.translate(x, y)
  pen.g.rotate(tilt)
  const seam = '#c85f1e'
  pen.mute++
  if (face === 'wary') line(pen, [-19, 3, 21, 3], seam, 2.6)
  else if (face === 'miserable') line(pen, [-20, 5, 0, -1, 20, 5], seam, 2.6)
  else if (face === 'hurting') line(pen, [-21, 5, -4, -2, 21, 3], seam, 2.6)
  else if (face === 'bothered') line(pen, [-19, 0, 2, 5, 19, 1], seam, 2.6)
  else line(pen, [-21, 0, 0, 6, 21, 0], seam, 2.6)
  pen.mute--
  pen.g.restore()
}

/** The duck: top-heavy, with a tuft, and two big flat feet out in front. */
export const duck: Figure = {
  bounds: { x0: -82, y0: -170, x1: 82, y1: 4 },
  anchors: { head: { x: 0, y: -164 }, mouth: { x: 0, y: -108 }, lap: { x: 0, y: -30 }, back: { x: 60, y: -78 }, side: { x: -57, y: -58 } },
  paint(pen: Pen, face: Face, shut: boolean, hang = 0): void {
    const c = PAL.duck
    // The tuft, the wings, then the body. A duck has no ears to see: drooping, its wings hang down to the table,
    // and they come up one after the other.
    puff(pen, blob([-9, -158, -4, -170, 3, -161, 10, -169, 11, -156], 0.7), c.body, 0.5)
    for (const s of [-1, 1]) puff(pen, hangs(hang, s) ? ell(s * 60, -40, 13, 34, -s * 0.08) : ell(s * 55, -64, 15, 32, -s * 0.28), c.wing, 0.7)
    puff(pen, blob([-38, -104, 38, -104, 62, -54, 50, -14, -50, -14, -62, -54]), c.body)
    fill(pen, ell(0, -50, 30, 30), '#ffe58a')
    // The feet: big, flat, webbed, and turned out.
    for (const s of [-1, 1]) {
      puff(pen, blob([s * 16, -34, s * 2, -10, s * 12, 2, s * 27, -7, s * 42, 3, s * 57, -6, s * 72, 1, s * 80, -16, s * 52, -34], 0.8), c.bill, 0.8)
      line(pen, [s * 27, -27, s * 27, -9], '#e06f24', 3, false)
      line(pen, [s * 48, -29, s * 57, -9], '#e06f24', 3, false)
    }
    puff(pen, ell(0, -124, 47, 41), c.body)
    bill(pen, face)
    const at = { eyes: 21, eyeY: -134, r: 8.5, mouthY: -110, wide: 12, fur: c.body }
    eyes(pen, at, face, shut)
    pen.mute++
    for (const s of [-1, 1]) fill(pen, ell(s * 34, -119, 9, 6), `rgba(255, 138, 60, ${face === 'glad' || face === 'bliss' ? 0.75 : face === 'afraid' || face === 'worn' ? 0.3 : 0.5})`)
    pen.mute--
  },
}
