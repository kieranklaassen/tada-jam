import { blob, limb, line, lit, shape, soft } from './draw'
import { balloon, underpants } from './figures'
import { dye, type G } from './loom'
import type { Thing } from './tale'

// The six things, each about 110 units tall about its middle. `tip` is how far
// it is turned over, `k` how much of it has come out.

export function paintThing(g: G, thing: Thing, tip = 0, k = 0): void {
  g.save()
  g.rotate(tip)
  switch (thing) {
    case 'mud': {
      // A pail on its handle, with a heap in it that runs over the rim.
      g.beginPath()
      g.ellipse(0, -6, 54, 50, 0, Math.PI, Math.PI * 2)
      g.strokeStyle = dye('cream', 1)
      g.lineWidth = 7
      g.stroke()
      if (k < 1) soft(g, [[-58, -2], [-52, -34 * (1 - k)], [-14, -58 * (1 - k)], [22, -38 * (1 - k)], [56, -26 * (1 - k)], [60, -2]], dye('walnut', 2))
      if (k < 1) blob(g, -12, -28 * (1 - k), 14, 8, dye('walnut', 3))
      shape(g, [[-60, -8], [60, -8], [44, 50], [-44, 50]], lit(g, -10, 14, 70, dye('ochre', 2), dye('ochre', 1)))
      line(g, [[-50, 30], [50, 30]], dye('walnut', 1), 6)
      if (k < 1) for (const [x, deep] of [[-44, 26], [-16, 14], [14, 34], [42, 18]] as const) line(g, [[x, -6], [x, deep * (1 - k)]], dye('walnut', 2), 15)
      break
    }
    case 'water': {
      // A tall pail with suds.
      limb(g, [-42, -24], [0, -86], [42, -24], dye('walnut', 1), 7)
      if (k < 1) for (const [x, y, r] of [[-28, -26, 17], [4, -36, 22], [32, -24, 16]] as const) blob(g, x, y * (1 - k * 0.5), r * (1 - k), r * (1 - k), dye('cream', 3))
      shape(g, [[-48, -22], [48, -22], [36, 54], [-36, 54]], lit(g, 0, 10, 62, dye('indigo', 3), dye('indigo', 1)))
      line(g, [[-46, -20], [46, -20]], dye('indigo', 0), 9)
      break
    }
    case 'jam': {
      shape(g, [[-44, -26], [44, -26], [48, 46], [40, 54], [-40, 54], [-48, 46]], k < 0.6 ? lit(g, -6, 14, 60, dye('madder', 2), dye('madder', 0)) : dye('cream', 1))
      g.fillStyle = dye('cream', 3)
      g.fillRect(-28, 0, 56, 32)
      blob(g, 0, 16, 13, 12, dye('madder', 1))
      soft(g, [[-54, -22], [-50, -50], [0, -56], [50, -50], [54, -22], [0, -30]], dye('cream', 2))
      line(g, [[-48, -26], [48, -26]], dye('madder', 1), 7)
      break
    }
    case 'pillow': {
      const flat = 1 - k * 0.45
      soft(g, [[-76, -52 * flat], [0, -38 * flat], [76, -52 * flat], [62, 0], [76, 52 * flat], [0, 38 * flat], [-76, 52 * flat], [-62, 0]], lit(g, -10, -10, 86, dye('cream', 3), dye('cream', 2)))
      for (const x of [-36, 0, 36]) line(g, [[x, -30 * flat], [x, 30 * flat]], dye('violet', 2), 8)
      shape(g, [[64, -38 * flat], [92, -46], [78, -22]], dye('ochre', 3))
      shape(g, [[-64, 36 * flat], [-90, 48], [-76, 22]], dye('ochre', 3))
      break
    }
    case 'pants':
      // The right way up on the shelf: band at the top, legs down.
      shape(g, [[-50, -54], [50, -54], [60, 54], [16, 54], [0, 4], [-16, 54], [-60, 54]], dye('cream', 3))
      for (const x of [-34, 34]) line(g, [[x * 0.8, -46], [x * 1.12, 48]], dye('indigo', 2), 9)
      line(g, [[0, -46], [0, -4]], dye('indigo', 2), 9)
      line(g, [[-50, -50], [50, -50]], dye('indigo', 1), 12)
      break
    case 'balloon':
      limb(g, [0, 34], [14, 46], [-4, 62], dye('walnut', 1), 6)
      balloon(g, 0, -14, 40 * (1 - k * 0.3))
      break
  }
  g.restore()
}

/** The thing upside down on a head, for a throw about to land. */
export function pantsOver(g: G, w: number, flop: number): void {
  underpants(g, 0, 0, w, flop)
}
