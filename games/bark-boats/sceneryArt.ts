import { FRAME, MARGIN, SUN, WATER } from './layout'
import { INK, artChance, flat, grained, line, oval, printOnce, shape, trace, wiped, type G, type Stamp } from './print'
import { STAGE } from './stage'

// What stands still behind everything: the paper, the sky and the brook's
// own colour (one sheet); the sun (its own sheet, since it sinks along the
// journey and is lifted at the pond); and the far shore, a long strip that
// slides at half the view's pace, so the hills pass more slowly than the
// brook. All of it is lower in contrast than anything a finger can pick up.

export const W = STAGE.width
const H = STAGE.height
export const INSIDE = { left: MARGIN, top: MARGIN, right: W - MARGIN, bottom: H - MARGIN }

/** The far strip is two frames long and repeats. */
export const FAR = { width: FRAME * 2, top: 60, height: 300, pace: 0.5 } as const

/** A pine as the old prints draw it: a trunk and flat clouds of needles. No two in the print are the same size. */
function pine(g: G, x: number, y: number, s: number, deep: boolean, clouds: number): void {
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + 2 * s, y - 30 * s)
  line(g, 2.4 * s, INK.barkDeep)
  const all = [[-7, -24, 13], [8, -33, 12], [0, -44, 10]] as const
  for (const [dx, dy, r] of all.slice(0, clouds)) {
    oval(g, x + dx * s, y + dy * s, r * s * 1.5, r * s * 0.62)
    flat(g, deep ? INK.pine : '#5f8a6a')
  }
}

/** The paper, the sky wiped from indigo down to a blush, bands of mist, and the brook's water wiped from deep to pale and back. */
export function printBase(density: number): Stamp {
  return printOnce(W, H, 0, 0, density, (g) => {
    g.fillStyle = INK.paper
    g.fillRect(0, 0, W, H)
    g.beginPath()
    g.rect(INSIDE.left, INSIDE.top, INSIDE.right - INSIDE.left, WATER.top - INSIDE.top + 2)
    const sky = g.createLinearGradient(0, INSIDE.top, 0, WATER.top)
    sky.addColorStop(0, INK.indigo)
    sky.addColorStop(0.17, '#93b1c2')
    sky.addColorStop(0.42, INK.sky)
    sky.addColorStop(0.74, '#ecdcc0')
    sky.addColorStop(1, INK.blush)
    g.fillStyle = sky
    g.fill()
    // Mist, left as bare paper: one long band that thins to a point, and one cloud with a lumpy back. Two
    // shapes of different make at different heights, not a set of bars.
    trace(g, [196, 136, 300, 126, 430, 130, 520, 138, 470, 146, 330, 148, 230, 146], true)
    flat(g, 'rgba(246,240,222,0.9)')
    trace(g, [900, 122, 930, 104, 968, 110, 990, 96, 1034, 100, 1062, 112, 1112, 118, 1066, 128, 960, 130], true)
    flat(g, 'rgba(246,240,222,0.9)')
    g.beginPath()
    g.rect(INSIDE.left, WATER.top, INSIDE.right - INSIDE.left, INSIDE.bottom - WATER.top)
    const water = g.createLinearGradient(0, WATER.top, 0, WATER.bottom + 10)
    water.addColorStop(0, INK.indigo)
    water.addColorStop(0.2, INK.water)
    water.addColorStop(0.55, INK.waterPale)
    water.addColorStop(0.82, '#7fb0c6')
    water.addColorStop(1, INK.indigo)
    g.fillStyle = water
    g.fill()
    grained(g, INSIDE.left, INSIDE.top, INSIDE.right - INSIDE.left, INSIDE.bottom - INSIDE.top, 0.2)
  })
}

/** The sun, low and red. */
export function printSun(density: number): Stamp {
  return printOnce(SUN.r * 2 + 8, SUN.r * 2 + 8, SUN.r + 4, SUN.r + 4, density, (g) => {
    oval(g, 0, 0, SUN.r, SUN.r)
    wiped(g, INK.red, '#e7866a', -SUN.r, SUN.r)
    line(g, 1.8)
  })
}

/** The strip's own length, and how far a hill's outline runs on past each end so that it meets itself where the strip repeats. */
const LONG = FRAME * 2
const PAST = 100

/** A band of hills along the whole strip: level at both ends, so the strip joins itself without a seam. */
function hills(g: G, ends: number, points: readonly number[], foot: number): void {
  trace(g, [-PAST, ends, PAST, ends, ...points, LONG - PAST, ends, LONG + PAST, ends, LONG + PAST * 4, foot + 40, -PAST * 4, foot + 40], true)
}

/** The far shore along both frames: hills behind hills, their pines, and the strip of ochre earth at the water. */
function shore(g: G): void {
  // The back hills, with a crest where the sun stands half behind it over the bank.
  hills(g, 262, [220, 238, 360, 262, 480, 244, 640, 268, SUN.x - 70, 236, SUN.x + 40, 226, SUN.x + 150, 252, 1120, 242, 1250, 258, 1390, 240, 1560, 264, 1700, 246, 1880, 262, 1990, 240, 2090, 232, 2180, 250], 300)
  wiped(g, '#86a886', '#cdd0a4', 226, 340)
  line(g, 1.6)
  // Small pines along the back hills, in uneven clumps.
  for (const [left, seed] of [[0, 5], [FRAME, 9]] as const) {
    const chance = artChance(seed)
    let x = 360 + chance.next() * 40
    while (x < 1000) {
      const clump = 1 + Math.floor(chance.next() * 3)
      for (let i = 0; i < clump; i++) {
        pine(g, left + x, 260 + chance.next() * 12, 0.45 + chance.next() * 0.4, false, 2 + (i % 2))
        x += 16 + chance.next() * 20
      }
      x += 50 + chance.next() * 110
    }
  }
  // The nearer hills.
  hills(g, 306, [220, 280, 300, 304, 470, 316, 660, 304, 820, 290, 1000, 286, 1140, 300, 1300, 290, 1480, 306, 1650, 314, 1840, 300, 2000, 292, 2180, 288], 300)
  wiped(g, INK.mossDeep, '#93ad72', 272, 344)
  line(g, 1.8)
  const chance = artChance(13)
  for (const [px, py, s, clouds] of [[452, 312, 1, 3], [506, 317, 0.7, 2], [706, 300, 1.15, 3], [884, 288, 1.0, 3], [918, 292, 0.6, 2], [1296, 292, 1.1, 3], [1640, 314, 0.8, 2], [1700, 310, 1.2, 3], [2040, 292, 0.9, 3], [2210, 290, 0.65, 2]] as const) pine(g, px + chance.next() * 30, py, s, true, clouds)
  // The far bank: a strip of ochre earth, and stones at the water's edge, each of its own size and none in a row.
  hills(g, 326, [300, 322, 640, 328, 960, 322, 1180, 326, 1480, 322, 1820, 328, 2140, 322], WATER.top - 34)
  wiped(g, '#b9a060', INK.ochre, 322, WATER.top + 6)
  line(g, 1.6)
  for (const [sx, sy, rx] of [[396, 344, 13], [536, 351, 25], [574, 341, 11], [820, 349, 29], [1410, 347, 27], [1760, 342, 12], [2150, 350, 22], [2196, 342, 10]] as const) {
    oval(g, sx + chance.next() * 40, sy, rx, rx * 0.42)
    wiped(g, INK.stone, INK.stoneDeep, sy - 10, sy + 10)
    line(g, 1.6)
  }
}

/** The far shore: two frames of it, the snow mountain in the first. Its anchor is its top left corner. */
export function printFar(density: number): Stamp {
  return printOnce(FAR.width, FAR.height, 0, -FAR.top, density, (g) => {
    // The mountain.
    shape(g, [470, 300, 610, 150, 668, 96, 704, 90, 742, 120, 828, 196, 990, 300])
    wiped(g, '#6f8fb0', '#dcdcc8', 90, 300)
    shape(g, [668, 96, 704, 90, 742, 120, 760, 142, 734, 132, 716, 152, 698, 130, 676, 150, 652, 122])
    flat(g, INK.white)
    shape(g, [470, 300, 610, 150, 668, 96, 704, 90, 742, 120, 828, 196, 990, 300])
    line(g, 1.8)
    // A lower, rounder mountain in the second frame, further off, and clear of the sun wherever the view rests.
    trace(g, [FRAME + 400, 300, FRAME + 540, 190, FRAME + 612, 160, FRAME + 690, 196, FRAME + 840, 300], true)
    wiped(g, '#8aa4bd', '#dcdcc8', 160, 300)
    line(g, 1.6)
    shore(g)
    grained(g, 0, FAR.top, FAR.width, FAR.height, 0.2)
  })
}

/** How far a row of water lines runs before it repeats: a sheet is one period wider than the brook, and slides by up to that much. */
export const WAVE_PERIOD = 592

export type Waves = { stamp: Stamp; top: number; speed: number }

/**
 * One sheet of the brook's lines. Each line is one curl, a long back and a short hook, and within a row no two
 * that follow each other are alike: each has its own length, its own height of back, its own hook and its own
 * gap to the next, so a row has no step to it. A row comes round again only after a stretch half as wide as
 * the brook. The rows are set off against each other. The far sheet is printed in indigo, small and close; the
 * near sheet in paper white, large and wide apart. They slide downstream at different speeds.
 */
/** A curl of a row: where it begins in the period, how long its back is, how high it stands, and how far its hook turns. */
export type Curl = readonly [at: number, long: number, high: number, hook: number]

const LONGS = [0.08, 0.86, 0.42, 0.66, 0.2] as const

/** The curls of one period of each row of a sheet. Drawn from a fixed seed, so every print of the sheet is the same. */
export function curlsOf(far: boolean): Curl[][] {
  const chance = artChance(far ? 31 : 37)
  const rows: Curl[][] = []
  for (let row = 0; row < (far ? 5 : 4); row++) {
    const curls: Curl[] = []
    let x = chance.next() * 40
    // Short, long and middling follow each other in an order that is the row's own, each nudged by chance.
    for (let i = row * 2; x < WAVE_PERIOD - 70; i++) {
      const long = (far ? 38 : 46) + (LONGS[i % LONGS.length] + chance.next() * 0.12) * (far ? 64 : 70)
      if (x + long * 1.2 > WAVE_PERIOD - 14) break
      curls.push([x, long, 0.55 + (LONGS[(i + 2) % LONGS.length] + chance.next() * 0.1) * 0.9, 0.5 + chance.next() * 1.1])
      x += long * 1.15 + 16 + (LONGS[(i + 1) % LONGS.length] + chance.next() * 0.1) * 50
    }
    rows.push(curls)
  }
  return rows
}

export function printWaves(density: number, far: boolean): Waves {
  const top = far ? WATER.top + 16 : WATER.top + 106, h = far ? 118 : 160
  const span = INSIDE.right - INSIDE.left
  const rows = curlsOf(far), gap = h / rows.length, tall = far ? 5 : 9
  const stamp = printOnce(span + WAVE_PERIOD, h, 0, 0, density, (g) => {
    g.beginPath()
    rows.forEach((curls, row) => {
      const y = gap * (row + 0.5)
      for (let from = -WAVE_PERIOD; from < span + WAVE_PERIOD * 2; from += WAVE_PERIOD) {
        for (const [at, long, high, hook] of curls) {
          const x0 = from + at
          g.moveTo(x0, y + tall * 0.3)
          g.quadraticCurveTo(x0 + long * (0.35 + high * 0.15), y - tall * high, x0 + long, y)
          g.quadraticCurveTo(x0 + long + 9 * hook, y + tall * 0.6 * hook, x0 + long + 15 * hook, y - tall * 0.3)
        }
      }
    })
    line(g, far ? 1.6 : 2.2, far ? 'rgba(34,52,92,0.6)' : 'rgba(246,240,222,0.72)')
  })
  return { stamp, top, speed: far ? 13 : 24 }
}
