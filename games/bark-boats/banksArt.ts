import { SAND, STONE, WATER } from './layout'
import { INK, artChance, flat, grained, line, oval, printOnce, shape, trace, wiped, type G, type Stamp } from './print'
import type { Rng } from './rng'
import { INSIDE, W } from './sceneryArt'

// The near bank, printed once and stamped over the brook: moss that is dark
// at the water's edge and wiped lighter toward the child, thick with tufts,
// flowers, mushrooms, ferns and small stones. The bank's own frame adds the
// flat stone the boat is built on and the pale sand the makings lie on,
// which is the plainest surface in the print. Every other frame of the brook
// shares one strip of bank with no stone and no sand.

/** Where a bank sheet begins: just above the stone's far edge. */
export const BANK_TOP = STONE.edge - 26

function tuft(g: G, x: number, y: number, s: number, colour: string, chance: Rng): void {
  // Blades of uneven number, length and lean.
  const blades = 2 + Math.floor(chance.next() * 3)
  g.beginPath()
  for (let i = 0; i < blades; i++) {
    const lean = (i / Math.max(1, blades - 1) - 0.5) * 1.3 + (chance.next() - 0.5) * 0.3, long = (14 + chance.next() * 12) * s
    g.moveTo(x + lean * 4, y)
    g.quadraticCurveTo(x + lean * 10 * s, y - long * 0.5, x + lean * 22 * s, y - long)
  }
  line(g, 2.2, colour)
}

/** A flower: a nodding bell of three petals on a bent stalk, with one leaf. */
function flower(g: G, x: number, y: number, colour: string, way: number): void {
  trace(g, [x, y + 16, x + way * 2, y + 6, x + way * 7, y])
  line(g, 1.6, INK.pine)
  oval(g, x - way * 5, y + 11, 6, 2.6, way * 0.5)
  flat(g, INK.pine)
  trace(g, [x + way * 2, y - 6, x + way * 11, y - 8, x + way * 15, y + 1, x + way * 11, y + 7, x + way * 8, y + 3, x + way * 4, y + 6], true)
  flat(g, colour)
  line(g, 1.3)
}

function mushroom(g: G, x: number, y: number, s: number): void {
  shape(g, [x - 4 * s, y, x - 3 * s, y - 14 * s, x + 3 * s, y - 14 * s, x + 4 * s, y])
  flat(g, INK.white)
  line(g, 1.5)
  trace(g, [x - 15 * s, y - 13 * s, x - 9 * s, y - 25 * s, x, y - 29 * s, x + 9 * s, y - 25 * s, x + 15 * s, y - 13 * s], true)
  flat(g, INK.red)
  line(g, 1.8)
  for (const [dx, dy, r] of [[-6, -19, 2.4], [4, -22, 1.6], [8, -16, 2]] as const) {
    oval(g, x + dx * s, y + dy * s, r * s, r * s * 0.8)
    flat(g, INK.white)
  }
}

/** A fern: a curved rib with fronds down both sides, leaning `way`. */
function fern(g: G, x: number, y: number, way: number): void {
  for (const reach of [1, 0.74, 0.5]) {
    const tipX = x + way * 86 * reach, tipY = y - 92 * reach
    trace(g, [x, y, x + way * 22 * reach, y - 62 * reach, tipX, tipY])
    line(g, 2.2, INK.pine)
    for (let i = 1; i < 7; i++) {
      const k = i / 7, rx = x + (tipX - x) * k * k + way * 22 * reach * 2 * k * (1 - k), ry = y + (tipY - y) * k - 30 * reach * k * (1 - k)
      oval(g, rx + way * 6, ry - 7, 11 * (1 - k * 0.6), 4, way * -0.9)
      flat(g, '#4f7d55')
      oval(g, rx - way * 5, ry + 6, 11 * (1 - k * 0.6), 4, way * 0.5)
      flat(g, INK.pine)
    }
  }
}

/** The moss, from a shore line down to the frame's foot. */
function moss(g: G, edge: number[]): void {
  trace(g, [...edge, INSIDE.right + 60, WATER.bottom, INSIDE.right + 90, INSIDE.bottom + 120, INSIDE.left - 90, INSIDE.bottom + 120, INSIDE.left - 60, WATER.bottom], true)
  const fade = g.createLinearGradient(0, WATER.bottom - 6, 0, INSIDE.bottom)
  fade.addColorStop(0, INK.mossDeep)
  fade.addColorStop(0.3, INK.moss)
  fade.addColorStop(1, '#9bb574')
  g.fillStyle = fade
  g.fill()
  line(g, 2)
}

/** What grows on the moss, wherever `free` lets it. */
function growth(g: G, chance: Rng, free: (x: number, y: number) => boolean): void {
  // Moss in darker pats, so the green is not one flat.
  for (let i = 0; i < 26; i++) {
    const x = INSIDE.left + chance.next() * (W - 28), y = WATER.bottom + 24 + chance.next() * 170
    if (!free(x, y)) continue
    oval(g, x, y, 26 + chance.next() * 30, 7 + chance.next() * 6)
    flat(g, 'rgba(63,107,82,0.34)')
  }
  for (let i = 0; i < 130; i++) {
    const x = INSIDE.left + 10 + chance.next() * (W - 60), y = WATER.bottom + 14 + chance.next() * 186
    if (!free(x, y)) continue
    if (i % 5 === 0) flower(g, x, y, i % 10 === 0 ? INK.red : INK.white, chance.next() < 0.5 ? -1 : 1)
    else if (i % 17 === 3) mushroom(g, x, y, 0.8 + chance.next() * 0.5)
    else if (i % 13 === 2) {
      oval(g, x, y, 12 + chance.next() * 8, 7 + chance.next() * 3)
      wiped(g, '#c4c6ba', INK.stoneDeep, y - 8, y + 9)
      line(g, 1.6)
    } else tuft(g, x, y, 0.7 + chance.next() * 0.7, i % 3 === 0 ? INK.pine : '#4f7d55', chance)
  }
}

/** Twice the width of the grain's tile (print.ts). */
const GRAIN_REPEAT = 1024

function sheet(density: number, paint: (g: G) => void): Stamp {
  const h = INSIDE.bottom - BANK_TOP + 2
  return printOnce(W, h, 0, -BANK_TOP, density, (g) => {
    paint(g)
    // The grain is stretched so that it repeats twice in a frame: where two frames of the bank join, the lines of the wood run on.
    g.save()
    g.scale(W / GRAIN_REPEAT, 1)
    grained(g, 0, BANK_TOP, GRAIN_REPEAT, h, 0.2)
    g.restore()
  })
}

/** The bank's own frame: moss, the flat stone and the sand. Its anchor is the top left corner of the stage. */
export function printBank(density: number): Stamp {
  return sheet(density, (g) => {
    const chance = artChance(21)
    const left: number[] = [], right: number[] = []
    for (let x = -20; x <= W + 20; x += 38) {
      const y = WATER.bottom + (chance.next() - 0.5) * 7
      if (x < STONE.left - 20) left.push(x, y)
      else if (x > STONE.right + 20) right.push(x, y)
    }
    moss(g, [...left, STONE.left - 12, WATER.bottom - 2, STONE.right + 12, WATER.bottom - 2, ...right])
    // The sand: plain, pale and of another hue, with nothing printed on it.
    trace(g, [SAND.left - 6, SAND.low + 26, SAND.left + 40, SAND.low - 2, SAND.step - 14, SAND.low - 6, SAND.step + 8, SAND.top + 24, SAND.step + 62, SAND.top - 6, 900, SAND.top - 12, SAND.right - 40, SAND.top - 4, SAND.right + 6, SAND.top + 40, SAND.right + 4, SAND.bottom - 30, SAND.right - 60, SAND.bottom + 6, 900, SAND.bottom + 10, SAND.left + 50, SAND.bottom + 4, SAND.left - 10, SAND.bottom - 40], true)
    wiped(g, '#f1e0b4', INK.sand, SAND.top, SAND.bottom)
    line(g, 1.6, 'rgba(34,52,92,0.6)')
    // The flat stone: a pale top that juts into the brook, and a darker face toward the child.
    trace(g, [STONE.left - 4, 606, STONE.left + 22, STONE.edge + 4, 330, STONE.edge - 4, 540, STONE.edge - 2, STONE.right - 20, STONE.edge + 6, STONE.right + 6, 604, STONE.right - 8, 648, 540, 662, 330, 664, STONE.left + 10, 652], true)
    wiped(g, INK.stoneDeep, '#5e6468', 610, 664)
    line(g, 2.2)
    trace(g, [STONE.left - 4, 604, STONE.left + 22, STONE.edge + 4, 330, STONE.edge - 4, 540, STONE.edge - 2, STONE.right - 20, STONE.edge + 6, STONE.right + 6, 602, STONE.right - 14, 628, 540, 640, 330, 642, STONE.left + 14, 632], true)
    wiped(g, '#c4c6ba', INK.stone, STONE.edge, 642)
    line(g, 2.2)
    growth(g, artChance(31), (x, y) => {
      const onSand = x > SAND.left - 26 && x < SAND.right + 26 && y > (x < SAND.step ? SAND.low : SAND.top) - 30 && y < SAND.bottom + 26
      const onStone = x > STONE.left - 22 && x < STONE.right + 22 && y < 684
      return !onSand && !onStone && x > 66 && x < W - 66
    })
    // Ferns in the two near corners, and rushes where the bank meets the brook.
    for (const [x, y, way] of [[40, 800, 1], [96, 806, 1], [548, 808, -1]] as const) fern(g, x, y, way)
    const rush = artChance(33)
    // In clumps at uneven gaps, some tall and some short: not a row with a step.
    for (const x of [24, 38, 74, 92, 104, 150, 176]) tuft(g, x + rush.next() * 8, WATER.bottom + 6 + rush.next() * 6, 1.1 + rush.next() * 1.1, INK.pine, rush)
    for (const x of [1082, 1094, 1128, 1150]) tuft(g, x + rush.next() * 8, WATER.bottom + 6 + rush.next() * 6, 1.1 + rush.next() * 1, INK.pine, rush)
  })
}

/** The bank of every other frame: moss and what grows on it, with ferns at its foot. It joins itself at both ends. */
export function printNear(density: number): Stamp {
  return sheet(density, (g) => {
    const chance = artChance(57)
    const edge: number[] = []
    for (let x = -20; x <= W + 20; x += 38) edge.push(x, WATER.bottom + (x < 30 || x > W - 30 ? 0 : (chance.next() - 0.5) * 7))
    moss(g, edge)
    // Nothing grows across the tile's two ends, where the next frame's moss begins: a pat cut there would stand as an edge.
    growth(g, artChance(61), (x) => x > 66 && x < W - 66)
    for (const [x, y, way] of [[250, 806, 1], [700, 808, -1], [1010, 804, 1]] as const) fern(g, x, y, way)
    const rush = artChance(63)
    for (const x of [130, 158, 196, 470, 492, 880, 934, 950]) tuft(g, x + rush.next() * 10, WATER.bottom + 8, 1.4 + rush.next() * 0.7, INK.pine, rush)
  })
}
