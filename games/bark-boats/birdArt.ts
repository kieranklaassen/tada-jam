import { BIRD_NECK } from './acts'
import type { Spot } from './layout'
import { INK, flat, grained, line, oval, printOnce, shape, stamp, trace, wiped, type G, type Stamp } from './print'
import type { BirdRig } from './rig'

// The kingfisher: plump, orange below and teal above, with a beak as long
// as his head. Quick and jerky. His body, his head with the upper half of
// his beak, his tail and one spread wing are printed once and stamped each
// at its own turn; the lower half of his beak, his pupil and his crest are
// the pen's, one path each.

export type BirdStamps = { body: Stamp; head: Stamp; tail: Stamp; wing: Stamp }

/** The hinge of his beak and his eye, from his neck. */
const HINGE = { x: 38, y: -28 } as const
const EYE = { x: 16, y: -38 } as const

export function printBird(density: number): BirdStamps {
  const body = printOnce(170, 150, 85, 140, density, (g) => {
    // Feet on the branch: toes that grip, one foot a little ahead of the other.
    g.beginPath()
    for (const [x, toe] of [[-10, 9], [17, 11]] as const) {
      g.moveTo(x, -16)
      g.lineTo(x + 1, 0)
      g.quadraticCurveTo(x + toe * 0.5, 5, x + toe, 3)
    }
    line(g, 3, INK.redDeep)
    // The belly: a teardrop, widest low.
    trace(g, [10, -128, 50, -100, 58, -54, 34, -14, -8, -8, -44, -26, -52, -66, -34, -108], true)
    wiped(g, '#f0a04e', INK.orange, -128, -8)
    line(g, 2.4)
    // The wing folded over his back, its feathers lapping.
    trace(g, [-30, -110, -54, -70, -50, -32, -22, -22, -4, -52, -6, -92], true)
    wiped(g, '#3aa3ab', INK.indigo, -110, -22)
    line(g, 2.2)
    for (const [y, far] of [[-86, 14], [-64, 20], [-44, 12]] as const) {
      trace(g, [-46, y, -46 + far, y + 8, -46 + far * 2, y + 1])
      line(g, 1.4, 'rgba(246,240,222,0.8)')
    }
    grained(g, -85, -140, 170, 150, 0.18)
  })
  const head = printOnce(210, 110, 60, 78, density, (g) => {
    // The upper half of his beak, behind the head's line.
    shape(g, [HINGE.x, HINGE.y - 1, HINGE.x, HINGE.y - 12, HINGE.x + 78, HINGE.y - 2])
    flat(g, '#3b3f52')
    line(g, 2)
    oval(g, 0, -30, 44, 40)
    wiped(g, '#3aa3ab', INK.teal, -70, 10)
    line(g, 2.4)
    // The orange cheek, the white throat and the white of his eye.
    oval(g, 12, -16, 17, 12)
    flat(g, INK.orange)
    trace(g, [-4, -4, 18, 2, 34, -6, 20, 10, 0, 8], true)
    flat(g, INK.white)
    line(g, 1.4)
    oval(g, EYE.x, EYE.y, 10, 10)
    flat(g, INK.white)
    line(g, 1.6)
    // Flecks on his crown.
    for (const [x, y, r] of [[-18, -52, 3], [-3, -61, 2.2], [11, -55, 3.4], [-27, -37, 2]] as const) {
      oval(g, x, y, r, r * 0.7)
      flat(g, '#bfe3df')
    }
    grained(g, -60, -78, 120, 110, 0.18)
  })
  const tail = printOnce(70, 70, 60, 10, density, (g) => {
    shape(g, [0, 0, -54, 22, -50, 38, -36, 30, -30, 48, -16, 30, 0, 14])
    wiped(g, INK.teal, INK.indigo, 0, 48)
    line(g, 2.2)
    grained(g, -60, -10, 70, 70, 0.18)
  })
  /** A wing spread: hinged at the shoulder, reaching back and up. */
  const wing = printOnce(130, 110, 120, 96, density, (g) => {
    shape(g, [0, 0, -40, -86, -64, -70, -62, -50, -92, -50, -82, -30, -108, -22, -90, -6, -60, 6, -20, 8])
    wiped(g, '#3aa3ab', INK.indigo, -86, 8)
    line(g, 2.2)
    for (const [x, y] of [[-44, -62], [-66, -40], [-80, -18]] as const) {
      trace(g, [-10, 0, x * 0.6, y * 0.55, x, y])
      line(g, 1.4, 'rgba(246,240,222,0.8)')
    }
  })
  return { body, head, tail, wing }
}

/** Draws the kingfisher with his feet at `at`. Hanging, he turns about his feet until he is upside down under his perch. Every field of his rig is read here. */
export function drawBird(g: G, stamps: BirdStamps, r: BirdRig, at: Spot): void {
  g.save()
  g.translate(at.x + r.dx, at.y + r.dy)
  g.rotate(r.tilt + r.flip * Math.PI)
  stamp(g, stamps.tail, -34, -34, -r.tail)
  // Ruffled, he is nearly half as wide again.
  const puff = 1 + r.ruffle * 0.4
  stamp(g, stamps.body, 0, 0, 0, puff, 1 + r.ruffle * 0.05)
  if (r.wing > 0.04) stamp(g, stamps.wing, -22, -92, 1.2 * (1 - r.wing) - 0.2, 1, 0.5 + 0.5 * r.wing)
  g.translate(BIRD_NECK.x, BIRD_NECK.y)
  g.rotate(r.head)
  // The crest stands on end when he is ruffled.
  if (r.ruffle > 0.05) {
    g.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = -2.5 + i * 0.3 + (i % 2) * 0.05
      g.moveTo(Math.cos(a) * 36, -30 + Math.sin(a) * 34)
      g.lineTo(Math.cos(a) * (40 + r.ruffle * (16 + i * 3)), -30 + Math.sin(a) * (38 + r.ruffle * (16 + i * 3)))
    }
    line(g, 4, INK.teal)
  }
  // The lower half of the beak opens about its hinge.
  const open = 0.02 + r.beak * 0.5, cos = Math.cos(open), sin = Math.sin(open)
  shape(g, [HINGE.x, HINGE.y + 1, HINGE.x - 12 * sin, HINGE.y + 12 * cos, HINGE.x + 78 * cos - 2 * sin, HINGE.y + 78 * sin + 2 * cos])
  flat(g, INK.redDeep)
  stamp(g, stamps.head, 0, 0)
  oval(g, EYE.x + r.lookX * 4, EYE.y + r.lookY * 4, 5.2, 5.2)
  flat(g, INK.line)
  g.restore()
}
