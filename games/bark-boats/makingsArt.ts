import { HULLS, MAKINGS, type HullKind, type Making } from './build'
import { INK, artChance, flat, grained, line, oval, printOnce, shape, trace, wiped, type G, type Stamp } from './print'

// The twelve makings: the pieces the child works with. They are the plainest
// things in the print: one flat colour each, the key line, and nothing that
// moves by itself. Each is printed once, standing as it stands on the boat,
// and is stamped turned when it lies on the bank.

export type MakingStamps = Record<Making, Stamp>

/** How far a making is turned when it lies on the bank, in radians. */
export const LYING: Record<Making, number> = {
  bark: 0, walnut: 0, pod: 0, twig: 1.45, stalk: 1.46, stem: 1.42, birch: 0.35, maple: -0.35, feather: 1.32, berry: 0, cap: 0, pebble: 0,
}

/** The holes a mast is pressed into, a little below the deck line. */
export const HOLE_DROP = 8

function holes(g: G, kind: HullKind): void {
  const s = HULLS[kind]
  for (const x of s.holes) {
    oval(g, x, s.deck + HOLE_DROP, 8, 3.4)
    flat(g, INK.barkDeep)
  }
}

/** A curl of bark seen from the side: the bow, to the left, curls up higher than the stern. */
function printBark(density: number): Stamp {
  const s = HULLS.bark, w = s.halfWidth
  return printOnce(w * 2 + 40, 100, w + 20, 84, density, (g) => {
    trace(g, [-w - 6, s.rim - 12, -w + 14, s.rim + 4, -w + 60, s.deck, 0, s.deck + 2, w - 50, s.deck, w - 8, s.rim + 8, w + 4, s.rim, w - 6, -22, w - 60, -4, 0, 0, -w + 70, -4, -w + 10, -26], true)
    wiped(g, INK.bark, INK.barkDeep, s.rim, 0)
    line(g, 2.4)
    // The pale inside of the bark shows along the deck.
    trace(g, [-w + 22, s.rim + 10, -w + 62, s.deck + 3, 0, s.deck + 5, w - 52, s.deck + 3, w - 14, s.rim + 12, w - 54, s.deck + 12, 0, s.deck + 14, -w + 64, s.deck + 12], true)
    flat(g, '#d9b98a')
    line(g, 1.5)
    holes(g, 'bark')
    // Bark, cut as short strokes along the side: of uneven length, at uneven gaps, in two ragged rows, none level with the last.
    const chance = artChance(41)
    let x = -w + 38 + chance.next() * 10
    while (x < w - 44) {
      const long = 6 + chance.next() * chance.next() * 34, y = -30 + chance.next() * 20, slope = (chance.next() - 0.5) * 9
      trace(g, [x, y, x + long * 0.5, y + slope * 0.7 + 2, x + long, y + slope])
      line(g, 1 + chance.next() * 0.9, 'rgba(34,52,92,0.5)')
      x += long + (chance.next() < 0.35 ? 4 + chance.next() * 6 : 14 + chance.next() * 30)
    }
    grained(g, -w - 20, -84, w * 2 + 40, 100, 0.22)
  })
}

/** Half a walnut shell: a deep round bowl, short and tall, wrinkled like a brain. */
function printWalnut(density: number): Stamp {
  const s = HULLS.walnut, w = s.halfWidth
  return printOnce(w * 2 + 30, 116, w + 15, 104, density, (g) => {
    trace(g, [-w, s.rim + 4, -w + 8, -40, -w + 44, -8, 0, 2, w - 44, -8, w - 8, -40, w, s.rim + 4, w - 30, s.deck - 4, 0, s.deck + 2, -w + 30, s.deck - 4], true)
    wiped(g, '#b98d5c', '#7a5433', s.rim, 2)
    line(g, 2.4)
    trace(g, [-w + 12, s.rim + 8, -w + 34, s.deck + 2, 0, s.deck + 8, w - 34, s.deck + 2, w - 12, s.rim + 8, w - 36, s.deck + 16, 0, s.deck + 22, -w + 36, s.deck + 16], true)
    flat(g, '#e6cfa3')
    line(g, 1.5)
    holes(g, 'walnut')
    // The shell's wrinkles: furrows that wander, no two alike. One runs long from the rim and forks, one is a
    // short crease low on the bowl, one lies almost flat along the shell, and a dimple sits between them.
    trace(g, [-66, -50, -58, -36, -70, -24, -52, -10])
    line(g, 1.7, 'rgba(34,52,92,0.5)')
    trace(g, [-60, -30, -44, -28, -38, -20])
    line(g, 1.2, 'rgba(34,52,92,0.5)')
    trace(g, [-14, -16, -4, -10, -8, -3])
    line(g, 1.4, 'rgba(34,52,92,0.5)')
    trace(g, [22, -34, 44, -40, 62, -30, 78, -34])
    line(g, 1.5, 'rgba(34,52,92,0.5)')
    oval(g, 14, -22, 3, 2, 0.4)
    line(g, 1.2, 'rgba(34,52,92,0.5)')
    grained(g, -w - 15, -104, w * 2 + 30, 116, 0.22)
  })
}

/** A pea pod split open: long, low and narrow, pointed at both ends, with the stalk curling up at the stern. */
function printPod(density: number): Stamp {
  const s = HULLS.pod, w = s.halfWidth
  return printOnce(w * 2 + 50, 86, w + 22, 74, density, (g) => {
    trace(g, [-w - 10, s.rim - 6, -w + 30, s.deck + 2, 0, s.deck + 4, w - 40, s.deck + 2, w + 4, s.rim - 2, w - 30, -10, 0, 0, -w + 40, -8], true)
    wiped(g, '#a9c964', '#5f8f48', s.rim, 0)
    line(g, 2.4)
    trace(g, [-w + 26, s.deck + 4, 0, s.deck + 7, w - 36, s.deck + 4, w - 60, s.deck + 13, 0, s.deck + 16, -w + 54, s.deck + 13], true)
    flat(g, '#dbe8a6')
    line(g, 1.5)
    holes(g, 'pod')
    // The stalk it hung by, curled over the stern.
    trace(g, [w + 2, s.rim, w + 16, s.rim - 14, w + 12, s.rim - 24])
    line(g, 4.4, INK.line)
    line(g, 2.2, '#5f8f48')
    grained(g, -w - 22, -74, w * 2 + 50, 86, 0.2)
  })
}

/** A mast: a wide dark stroke with a narrower coloured one on it, standing, with its middle at the anchor. */
function printMast(density: number, kind: 'twig' | 'stalk' | 'stem'): Stamp {
  const half = MAKINGS[kind].length / 2
  return printOnce(64, half * 2 + 24, 32, half + 16, density, (g) => {
    if (kind === 'twig') {
      trace(g, [0, half, 2, half * 0.3, -2, -half * 0.3, 1, -half])
      line(g, 13, INK.line)
      line(g, 8.6, '#a57a4c')
      // One stub where a side twig broke off.
      g.beginPath()
      g.moveTo(1, -half * 0.42)
      g.lineTo(11, -half * 0.56)
      line(g, 8, INK.line)
      line(g, 4, '#a57a4c')
    } else if (kind === 'stalk') {
      // A tall rush stalk, straight and pale, with one leaf sheath and a brown head.
      trace(g, [0, half, 1, 0, -1, -half + 30])
      line(g, 11, INK.line)
      line(g, 7, '#c9b56a')
      trace(g, [0, half * 0.3, 12, half * 0.05, 15, -half * 0.22])
      line(g, 6, INK.line)
      line(g, 3, '#8fa85a')
      oval(g, -1, -half + 20, 8, 22)
      flat(g, INK.barkDeep)
      line(g, 2)
    } else {
      // A grass stem: thin and bowed in one long curve, with no hook at its top. Its ear is a slanted spindle of
      // seed at the tip, with three hairs of unequal length.
      trace(g, [0, half, -3, half * 0.3, 2, -half * 0.35, 14, -half + 22])
      line(g, 8, INK.line)
      line(g, 4.4, '#7fae58')
      g.beginPath()
      g.ellipse(20, -half + 14, 7, 19, 0.62, 0, Math.PI * 2)
      flat(g, '#d9c36e')
      line(g, 1.8)
      g.beginPath()
      for (const [dx, dy, long] of [[24, -half + 2, 15], [29, -half + 9, 9], [18, -half - 2, 11]] as const) {
        g.moveTo(dx, dy)
        g.lineTo(dx + long * 0.75, dy - long * 0.66)
      }
      line(g, 1.2, INK.line)
    }
  })
}

function printLeaf(density: number, broad: boolean): Stamp {
  if (!broad) {
    return printOnce(84, 112, 42, 56, density, (g) => {
      // A birch leaf: small, with a point, and veins that sweep off its rib to one side and the other in turn.
      trace(g, [0, -50, 22, -30, 32, 2, 20, 30, 0, 44, -20, 30, -32, 2, -22, -30], true)
      flat(g, '#c9cf5f')
      line(g, 2.2)
      trace(g, [0, 52, 2, 10, -1, -44])
      line(g, 1.6)
      trace(g, [1, 24, 12, 14, 20, 12])
      line(g, 1.2)
      trace(g, [0, 0, -12, -8, -20, -8])
      line(g, 1.2)
      grained(g, -42, -56, 84, 112, 0.14)
    })
  }
  return printOnce(150, 150, 75, 75, density, (g) => {
    // A maple leaf: broad, five lobes, its veins a fan from the foot of the leaf out to each lobe.
    shape(g, [0, -68, 16, -40, 44, -52, 38, -20, 68, -12, 44, 12, 56, 42, 22, 34, 0, 60, -22, 34, -56, 42, -44, 12, -68, -12, -38, -20, -44, -52, -16, -40])
    flat(g, INK.orange)
    line(g, 2.2)
    for (const [x, y, bow] of [[0, -58, 0], [36, -42, 6], [-36, -42, -6], [56, -10, 12], [-56, -10, -12]] as const) {
      g.beginPath()
      g.moveTo(0, 70)
      g.quadraticCurveTo(x * 0.3 + bow, 30 + y * 0.2, x, y)
      line(g, 1.5)
    }
    grained(g, -75, -75, 150, 150, 0.14)
  })
}

/** The kingfisher's own feather: teal with a white quill, curved, standing on its quill. */
function printFeather(density: number): Stamp {
  return printOnce(70, 132, 35, 66, density, (g) => {
    trace(g, [2, -60, 22, -36, 24, 0, 14, 34, 2, 44, -12, 30, -18, -4, -12, -40], true)
    wiped(g, '#3aa3ab', INK.indigo, -60, 44)
    line(g, 2.2)
    trace(g, [0, 62, 3, 20, 2, -56])
    line(g, 2.2, INK.white)
    // Barbs that part here and there, as on a feather that has been preened.
    for (const [y, side, far] of [[-30, 1, 14], [-8, -1, 13], [10, 1, 15], [26, -1, 9]] as const) {
      trace(g, [2, y + 8, 2 + side * far * 0.6, y + 2, 2 + side * far, y - 6])
      line(g, 1.2, 'rgba(246,240,222,0.8)')
    }
  })
}

function printBerry(density: number): Stamp {
  return printOnce(48, 52, 24, 28, density, (g) => {
    oval(g, 0, 1, 17, 17)
    flat(g, INK.red)
    line(g, 2.2)
    oval(g, -6, -6, 4, 3, -0.6)
    flat(g, '#f0a48f')
    trace(g, [0, -15, 2, -21, 7, -24])
    line(g, 2.2, INK.pine)
  })
}

/** An acorn cap, standing as a cup: scaled outside, pale inside, its little stalk to one side. */
function printCap(density: number): Stamp {
  return printOnce(64, 56, 32, 28, density, (g) => {
    trace(g, [-24, -8, -20, 10, -8, 20, 8, 20, 20, 10, 24, -8], true)
    wiped(g, '#a8814f', INK.barkDeep, -8, 20)
    line(g, 2.2)
    oval(g, 0, -8, 24, 7)
    flat(g, '#e6cfa3')
    line(g, 1.8)
    // Scales: round-bottomed scallops of unequal width, set like roof tiles and not in a row.
    g.beginPath()
    for (const [x, y, wide] of [[-12, 3, 6], [2, 8, 8], [14, 1, 4.5], [-4, 14, 5.5]] as const) {
      g.moveTo(x - wide, y)
      g.ellipse(x, y, wide, wide * 0.7, 0, Math.PI, 0, true)
    }
    line(g, 1.2, 'rgba(34,52,92,0.55)')
    trace(g, [16, 14, 24, 20, 27, 18])
    line(g, 3.4)
  })
}

function printPebble(density: number): Stamp {
  return printOnce(84, 64, 42, 32, density, (g) => {
    trace(g, [-32, 6, -24, -18, 4, -25, 30, -14, 34, 8, 16, 24, -16, 24], true)
    wiped(g, '#98a1ab', '#6b7480', -25, 24)
    line(g, 2.4)
    // One pale vein across it, as river stones have.
    trace(g, [-26, -6, -8, -13, 10, -8, 27, -3])
    line(g, 3, 'rgba(246,240,222,0.8)')
  })
}

export function printMakings(density: number): MakingStamps {
  return {
    bark: printBark(density), walnut: printWalnut(density), pod: printPod(density),
    twig: printMast(density, 'twig'), stalk: printMast(density, 'stalk'), stem: printMast(density, 'stem'),
    birch: printLeaf(density, false), maple: printLeaf(density, true), feather: printFeather(density),
    berry: printBerry(density), cap: printCap(density), pebble: printPebble(density),
  }
}
