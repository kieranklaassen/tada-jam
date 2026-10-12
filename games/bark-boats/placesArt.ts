import { FALL_DROP, MEET, POND, WATER } from './layout'
import { INK, artChance, flat, grained, line, oval, printOnce, shape, trace, wiped, type G, type Stamp } from './print'

// What each place of the brook is named for, printed once: the old tree
// with its low branch, the rushes, the reed bed, the stepping stones, the
// small fall and the lilies of the pond. Each is in two sheets where a boat
// passes through it, one behind the boat and one in front, so what is
// nearer is drawn in front.

export type PlaceStamps = {
  tree: Stamp; rushes: Stamp; reedsBack: Stamp; reedsFront: Stamp; stonesBack: Stamp; stonesFront: Stamp
  fallBack: Stamp; fallFront: Stamp; liliesBack: Stamp; liliesFront: Stamp; pile: Stamp
}

/** A sheet for a part of a frame: drawn in the frame's own units, and stamped at the frame's left edge. */
const region = (x: number, y: number, w: number, h: number, density: number, paint: (g: G) => void): Stamp =>
  printOnce(w, h, -x, -y, density, (g) => { paint(g); grained(g, x, y, w, h, 0.16) })

/** Below the fall: the far bank's face where the water lies lower, and the deeper pool. Neither reaches the frame's downstream end at x 0 (reader.test.ts). */
export const BELOW_FALL = {
  face: [70, WATER.top, MEET.fall.at, WATER.top, MEET.fall.at - 6, WATER.top + FALL_DROP, 380, WATER.top + FALL_DROP - 4, 240, WATER.top + FALL_DROP * 0.62, 140, WATER.top + FALL_DROP * 0.24],
  pool: [MEET.fall.at - 6, WATER.top + FALL_DROP, 360, WATER.top + FALL_DROP + 2, 196, WATER.top + FALL_DROP + 34, 132, 474, 178, 556, 330, WATER.bottom + 4, MEET.fall.at - 30, WATER.bottom + 4],
} as const

/** The old tree: its trunk, the low branch that reaches out over the brook, and its clouds of needles. */
function tree(g: G): void {
  trace(g, [-4, 352, 8, 250, 14, 120, 0, 14, 96, 14, 84, 130, 96, 214, 180, 228, 300, 226, 404, 214, 432, 220, 404, 232, 300, 252, 190, 262, 108, 268, 98, 352], true)
  wiped(g, INK.barkDeep, INK.bark, 14, 352)
  line(g, 2.2)
  // Bark, cut as short strokes.
  const chance = artChance(3)
  for (let i = 0; i < 16; i++) {
    const x = 26 + chance.next() * 56, y = 40 + chance.next() * 290, long = 16 + chance.next() * 18
    trace(g, [x, y, x + 3, y + long * 0.5, x - 1, y + long])
    line(g, 1.4, 'rgba(34,52,92,0.55)')
  }
  // A twig off the branch, and needles in flat clouds.
  trace(g, [330, 226, 352, 196, 384, 186])
  line(g, 4, INK.barkDeep)
  for (const [x, y, rx, ry] of [[120, 52, 130, 40], [300, 44, 110, 30], [70, 104, 70, 26], [250, 96, 120, 30], [392, 170, 62, 20], [418, 66, 60, 18]] as const) {
    oval(g, x, y, rx, ry)
    wiped(g, INK.pine, '#4d7c62', y - ry, y + ry)
    line(g, 1.8)
    // Needles: a few in each cloud, no two clouds with the same number, each of its own length and slant, in tufts.
    g.beginPath()
    const count = 3 + Math.floor(chance.next() * 6)
    let nx = x - rx * (0.5 + chance.next() * 0.3)
    for (let i = 0; i < count && nx < x + rx * 0.8; i++) {
      const long = 4 + chance.next() * 13, slant = -3 + chance.next() * 9, ny = y + ry * (-0.1 + chance.next() * 0.5)
      g.moveTo(nx, ny)
      g.lineTo(nx + slant, ny + long)
      // A tuft is two or three close together, and then a gap.
      nx += chance.next() < 0.55 ? 5 + chance.next() * 5 : rx * (0.25 + chance.next() * 0.45)
    }
    line(g, 1.2, 'rgba(34,52,92,0.5)')
  }
}

/** Reeds: blades of uneven height, lean and spacing in clumps, some with a brown head. `foot` and `top` give the band they stand in. */
function reeds(g: G, seed: number, left: number, right: number, foot: [number, number], top: [number, number], thick: number): void {
  const chance = artChance(seed)
  let x = left
  while (x < right) {
    const clump = 2 + Math.floor(chance.next() * 3)
    for (let i = 0; i < clump && x < right; i++) {
      const fy = foot[0] + chance.next() * (foot[1] - foot[0]), ty = top[0] + chance.next() * (top[1] - top[0]), bend = (chance.next() - 0.4) * 50
      trace(g, [x, fy, x + bend * 0.4, (fy + ty) / 2, x + bend, ty])
      line(g, thick, chance.next() < 0.4 ? INK.pine : '#5f8a5a')
      if (chance.next() < 0.45) {
        oval(g, x + bend, ty + 4, 5, 12 + chance.next() * 6, bend * 0.01)
        flat(g, INK.barkDeep)
      }
      x += 9 + chance.next() * 14
    }
    x += 14 + chance.next() * 30
  }
}

function stone(g: G, x: number, y: number, rx: number, ry: number): void {
  trace(g, [x - rx, y + ry * 0.3, x - rx * 0.7, y - ry * 0.7, x + rx * 0.1, y - ry, x + rx * 0.8, y - ry * 0.6, x + rx, y + ry * 0.4, x + rx * 0.3, y + ry, x - rx * 0.5, y + ry * 0.9], true)
  wiped(g, '#c4c6ba', INK.stoneDeep, y - ry, y + ry)
  line(g, 2.2)
  // The water curls round its foot on the upstream side.
  trace(g, [x + rx * 0.2, y + ry + 3, x + rx + 6, y + ry * 0.8, x + rx + 12, y + ry * 0.1])
  line(g, 2, 'rgba(246,240,222,0.85)')
}

function pad(g: G, x: number, y: number, rx: number, turn: number, bloom: 0 | 1 | 2): void {
  // A lily pad: a flat leaf with one cleft, turned its own way.
  g.beginPath()
  g.ellipse(x, y, rx, rx * 0.34, 0, turn + 0.3, turn + Math.PI * 2 - 0.3)
  g.lineTo(x, y)
  g.closePath()
  flat(g, bloom === 2 ? '#5f9a63' : INK.moss)
  line(g, 1.8)
  if (bloom === 0) return
  // A lily: three petals of unequal height.
  for (const [dx, tall, lean] of [[-9, 16, -0.5], [8, 13, 0.5], [0, 21, 0]] as const) {
    oval(g, x + dx, y - tall * 0.6, 6, tall * 0.6, lean)
    flat(g, bloom === 1 ? INK.white : '#f3b9a8')
    line(g, 1.3)
  }
}

export function printPlaces(density: number): PlaceStamps {
  const lip = MEET.fall.at
  return {
    tree: region(-10, 0, 500, 360, density, tree),
    // The rushes the sprite lives among, on the far bank and in the shallows.
    rushes: region(900, 180, 280, 250, density, (g) => reeds(g, 11, 926, 1160, [340, 400], [196, 266], 3.4)),
    reedsBack: region(280, 150, 460, 340, density, (g) => { reeds(g, 71, 320, 700, [392, 440], [176, 250], 4.4); reeds(g, 72, 340, 690, [440, 474], [210, 300], 5) }),
    reedsFront: region(300, 290, 460, 320, density, (g) => { reeds(g, 73, 340, 710, [552, 580], [330, 400], 5); reeds(g, 74, 330, 700, [580, 602], [370, 450], 5.6) }),
    stonesBack: region(420, 340, 220, 200, density, (g) => {
      // The sill the stones stand on shows pale under the water in the gap.
      oval(g, 524, 508, 70, 13)
      flat(g, 'rgba(196,198,186,0.55)')
      stone(g, 550, 374, 40, 20)
      stone(g, 496, 412, 28, 16)
      stone(g, 560, 452, 36, 19)
    }),
    stonesFront: region(420, 520, 220, 110, density, (g) => {
      stone(g, 488, 560, 34, 19)
      stone(g, 548, 594, 44, 22)
    }),
    fallBack: region(0, 330, 620, 290, density, (g) => {
      // Below the lip the water lies lower: the far bank's face shows, and the pool is a shade deeper. Both
      // run out before the frame's downstream end, so that no edge stands in the water where two frames join.
      shape(g, BELOW_FALL.face)
      wiped(g, '#b9a060', INK.stoneDeep, WATER.top, WATER.top + FALL_DROP)
      line(g, 1.8)
      trace(g, BELOW_FALL.pool, true)
      flat(g, 'rgba(43,79,134,0.3)')
      // The fall. Its lip is the firm edge the brook bends over, running across the brook; the water falls from
      // it downstream and down to a foot that is ragged with foam. The lip is where the edge of the water was.
      const chance = artChance(81)
      const lipAt = (y: number): number => lip + 22 - (y - WATER.top) * 0.06
      const foot: number[] = []
      for (let y = WATER.bottom + 4; y >= WATER.top; y -= 22) foot.push(lipAt(y) - 34 - chance.next() * 22 - (y > 470 ? 10 : 0), y)
      trace(g, [lipAt(WATER.top), WATER.top, lipAt(WATER.bottom + 4), WATER.bottom + 4, ...foot], true)
      wiped(g, INK.white, INK.waterPale, WATER.top, WATER.bottom)
      line(g, 1.6)
      // The falling water: strands that leave the lip where they like, each of its own length, weight and slant.
      let at = WATER.top + 8 + chance.next() * 10
      while (at < WATER.bottom - 6) {
        const long = 12 + chance.next() * 26, drop = 3 + chance.next() * 12
        trace(g, [lipAt(at) - 2, at, lipAt(at) - long * 0.55, at + drop * 0.35, lipAt(at) - long, at + drop])
        line(g, 1 + chance.next() * 1.4, 'rgba(34,52,92,0.5)')
        at += chance.next() < 0.4 ? 5 + chance.next() * 5 : 14 + chance.next() * 30
      }
      // The lip itself: a dark edge, and the smooth water bending over it, seen as one pale line upstream of it.
      trace(g, [lipAt(WATER.top), WATER.top, lipAt(470) + 3, 470, lipAt(WATER.bottom + 4), WATER.bottom + 4])
      line(g, 3.2)
      trace(g, [lipAt(WATER.top + 30) + 12, WATER.top + 30, lipAt(440) + 17, 440, lipAt(WATER.bottom - 20) + 11, WATER.bottom - 20])
      line(g, 2, 'rgba(246,240,222,0.85)')
      // Foam at its foot: billows of unequal size, scattered along it and out into the pool, and a few flecks.
      for (const [x, y, r, turn] of [[lip - 46, 392, 9, 0.2], [lip - 78, 421, 16, -0.3], [lip - 52, 468, 7, 0.5], [lip - 96, 489, 11, 0.1], [lip - 64, 531, 19, -0.2], [lip - 112, 548, 8, 0.4], [lip - 58, 590, 12, 0]] as const) {
        g.beginPath()
        g.arc(x, y, r, Math.PI * (0.9 + turn), Math.PI * (2.2 + turn))
        line(g, 1.6 + r * 0.06, 'rgba(246,240,222,0.9)')
      }
      g.beginPath()
      for (const [x, y, r] of [[lip - 92, 404, 2.4], [lip - 124, 452, 3.2], [lip - 86, 512, 2], [lip - 132, 580, 2.8], [lip - 102, 446, 1.8]] as const) {
        g.moveTo(x + r, y)
        g.arc(x, y, r, 0, Math.PI * 2)
      }
      flat(g, 'rgba(246,240,222,0.9)')
      stone(g, lip + 14, 350, 38, 18)
    }),
    fallFront: region(lip - 70, 540, 170, 90, density, (g) => stone(g, lip + 10, 592, 46, 24)),
    liliesBack: region(40, 360, 660, 120, density, (g) => {
      for (const [x, y, rx, turn, bloom] of [[84, 448, 34, 0.4, 0], [214, 452, 28, 2.2, 1], [348, 456, 36, 1.1, 0], [478, 446, 26, 3.4, 0], [600, 452, 38, 5, 2], [660, 398, 22, 0.9, 0]] as const) pad(g, x, y, rx, turn, bloom)
    }),
    liliesFront: region(40, 500, 660, 120, density, (g) => {
      for (const [x, y, rx, turn, bloom] of [[100, 566, 44, 1.6, 1], [236, 590, 34, 4.2, 0], [372, 572, 30, 0.2, 0], [POND.pad.x, POND.pad.y + 4, 50, 2.6, 0], [POND.berry.x, POND.berry.y + 4, 30, 5.2, 0]] as const) pad(g, x, y, rx, turn, bloom)
    }),
    // Pads pushed up in a pile at the bow of a heavy boat.
    pile: printOnce(130, 80, 65, 66, density, (g) => {
      pad(g, -18, -6, 38, 0.6, 0)
      pad(g, 14, -22, 32, 3.6, 0)
      pad(g, -4, -40, 26, 2, 2)
    }),
  }
}
