import { COUNTER, POT, REST, STICK } from './hall'
import { DARK, GLOW, alpha, brush, daub, dot, dryBrush, mix, oval, pool, slab, type Light, type Pen } from './paint'
import { BOARD, DOORWAY, RING, STAR, type Place } from './places'
import { makeRng } from './rng'
import { BEAM, COPPER, FIR, NIGHT, WALL, WAX, WOOD } from './scenery'

// The middle of each of the five places, painted once: what stands behind and
// on the counter where the child works. Each is one sprite that covers the
// same strip of the hall, from the beam to the floor, so the walk slides one
// out and the next in. The piece in work is not part of it: the view draws
// that fresh, over this.

/** The strip of the hall a bay covers, in stage units. */
export const BAY = { x: 396, y: 44, w: 388, h: 776 } as const

const UP: Light = { x: 0, y: 1 }

function candleBay(g: Pen): void {
  const rng = makeRng(1101)
  // The two hooks the dipping stick rests on, on cords from the beam.
  for (const side of [-1, 1]) {
    const hx = REST.x + side * (STICK.half - 12)
    brush(g, [hx, 40, hx, REST.y - 4], '#5a4632', 3)
    brush(g, [hx, REST.y - 4, hx + side * 7, REST.y + 10, hx - side * 5, REST.y + 12], '#8a8478', 4)
  }
  // Candles someone dipped earlier, hung along a rail either side of the stick: dim, part of the wall. Three on one
  // rail and five on the other, at uneven gaps, and no two of a length or a girth.
  const RACKS: readonly [number, number, readonly [number, number, number, number][]][] = [
    [470, 150, [[-40, 62, 9, 0], [-6, 104, 13, 2], [34, 78, 8, 1]]],
    [710, 150, [[-44, 92, 11, 1], [-27, 58, 7, 0], [2, 112, 14, 2], [20, 70, 8, 0], [43, 88, 12, 1]]],
  ]
  for (const [rx, ry, hung] of RACKS) {
    brush(g, [rx - 52, ry, rx + 52, ry], '#4a3220', 7)
    for (const [dx, long, wide, c] of hung) {
      brush(g, [rx + dx, ry, rx + dx + 1, ry + 14], '#2a1c12', 2)
      brush(g, [rx + dx + 1, ry + 16, rx + dx + 1, ry + long], mix(WAX[c], WALL, 0.55), wide)
    }
  }
  // The fire door under the pot, with the embers that keep the wax warm.
  slab(g, POT.x - 74, 742, 148, 110, '#1a120e')
  daub(g, oval(POT.x, 742, 74, 30, undefined, 0, 12), '#1a120e')
  daub(g, [POT.x - 56, 860, POT.x - 56, 760, POT.x, 734, POT.x + 56, 760, POT.x + 56, 860], '#7a2410')
  daub(g, [POT.x - 40, 860, POT.x - 34, 790, POT.x, 770, POT.x + 36, 790, POT.x + 40, 860], '#e2641e')
  for (let k = 0; k < 9; k++) dot(g, POT.x - 34 + rng.next() * 68, 790 + rng.next() * 30, 3 + rng.next() * 4, k % 2 ? '#ffc04a' : '#ff8a2a')
  g.save()
  g.globalCompositeOperation = 'lighter'
  pool(g, POT.x, 800, 150, '#ff7a2a', 0.3)
  g.restore()
  // The copper pot, sunk into the counter: a collar, a rolled rim, and the dark inside that the wax covers.
  const px = POT.x, py = POT.y
  daub(g, [px - POT.rx - 26, py + 6, px - POT.rx - 20, py + 78, px, py + 108, px + POT.rx + 20, py + 78, px + POT.rx + 26, py + 6, px, py + 46], COPPER, UP, rng, 0.9)
  dryBrush(g, px - POT.rx - 10, py + 34, POT.rx * 2 + 20, 56, '#e58a4a', 18, rng, 40, 9, 0.26)
  brush(g, [px - POT.rx - 4, py + 34, px - POT.rx + 2, py + 76], alpha(DARK, 0.3), 26)
  brush(g, [px + POT.rx + 4, py + 34, px + POT.rx - 2, py + 76], alpha(DARK, 0.3), 26)
  daub(g, oval(px, py, POT.rx + 24, POT.ry + 12, rng, 0, 16), '#c9763c')
  daub(g, oval(px, py, POT.rx + 8, POT.ry + 4, rng, 0, 16), '#4a2210')
  for (let k = 0; k < 7; k++) dot(g, px - 132 + k * 44, py + 66 + Math.cos((k - 3) * 0.45) * 18, 4, '#f0b27a')
}

/** A lamp-lit pane on an easel: the paper is folded against its light. */
function starBay(g: Pen): void {
  const rng = makeRng(1201), x = STAR.x, y = STAR.y, r = STAR.r[2] + 22
  // The easel: two legs down to the counter and a ledge.
  brush(g, [x - 60, y - r - 20, x - 150, COUNTER.back + 14], '#5a3c22', 16)
  brush(g, [x + 60, y - r - 20, x + 150, COUNTER.back + 14], '#5a3c22', 16)
  brush(g, [x - 150, y + r + 8, x + 150, y + r + 8], '#6b4426', 16)
  g.save()
  g.globalCompositeOperation = 'lighter'
  pool(g, x, y, r + 150, '#ffd98a', 0.34)
  g.restore()
  daub(g, oval(x, y, r + 14, r + 14, rng, 0, 18), '#4a2f1c', UP, rng, 0.6)
  daub(g, oval(x, y, r, r, rng, 0, 18), '#f6e7bd')
  daub(g, oval(x - 20, y - 26, r * 0.62, r * 0.56, rng, 0, 14), alpha('#fffbe8', 0.75))
  // On the counter: a pot of paste with its brush, a folding bone, and offcuts of every paper.
  daub(g, [430, 636, 434, 596, 478, 596, 482, 636], '#7a8a90', { x: 1, y: 0 }, rng, 0.8)
  daub(g, oval(456, 596, 23, 8, rng), '#efe8d4')
  brush(g, [462, 594, 486, 552], '#c79a62', 6)
  // The folding bone: a flat blade, broad and round at one end and coming to a point at the other.
  daub(g, [698, 644, 702, 632, 730, 626, 764, 624, 736, 638], '#efe4c8')
  for (const [sx, sy, c, t] of [[520, 644, 0, 0.3], [652, 650, 1, -0.4], [742, 660, 2, 0.8], [560, 662, 1, 1.2]] as const) daub(g, oval(sx, sy, 20, 9, rng, t, 5), mix(WAX[c], WOOD, 0.2))
}

/** A round of green baize on a chain: the straw ring hangs on its peg. */
function wreathBay(g: Pen): void {
  const rng = makeRng(1301), x = RING.x, y = RING.y, r = RING.r + RING.band + 26
  brush(g, [x - 40, 44, x - 14, y - r + 4], '#8a8478', 4)
  brush(g, [x + 40, 44, x + 14, y - r + 4], '#8a8478', 4)
  g.save()
  g.globalCompositeOperation = 'lighter'
  pool(g, x, y, r + 120, GLOW, 0.26)
  g.restore()
  daub(g, oval(x, y, r + 12, r + 12, rng, 0, 18), '#4a2f1c', UP, rng, 0.6)
  daub(g, oval(x, y, r, r, rng, 0, 18), '#35543c', UP, rng, 0.5)
  dryBrush(g, x - r, y - r, r * 2, r * 2, '#4f7a55', 26, rng, 60, 16, 0.14)
  // The peg the ring hangs on.
  brush(g, [x, y - RING.r - 26, x, y - RING.r - 4], '#c79a62', 9)
  dot(g, x, y - RING.r - 28, 7, '#e2bd86')
  // On the counter: a heap of cut fir, a coil of straw, and a snip of every ribbon.
  for (let k = 0; k < 9; k++) {
    const bx = 426 + k * 13, by = 640 + (k % 3) * 6
    brush(g, [bx, by, bx + 34 + rng.next() * 20, by - 22 - rng.next() * 18], mix(FIR, '#5f9a58', rng.next() * 0.6), 8)
  }
  daub(g, oval(720, 640, 44, 16, rng), '#cfa85c', UP, rng, 0.7)
  daub(g, oval(720, 638, 22, 7, rng), '#7a5c2a')
  // A snip of each ribbon, cut off and left lying where it curled up: a small roll with no tail, each its own size.
  for (const [sx, sy, c, wide] of [[604, 660, 0, 12], [642, 668, 1, 8], [672, 656, 2, 15]] as const) daub(g, oval(sx, sy, wide, wide * 0.6, rng, 0.4), WAX[c])
}

/** A round board propped up on the counter: the dough lies on it, with the flour and the rolling pin beside. */
function biscuitBay(g: Pen): void {
  const rng = makeRng(1401), x = BOARD.x, y = BOARD.y, r = BOARD.dough + 30
  g.save()
  g.globalCompositeOperation = 'lighter'
  pool(g, x, y, r + 130, GLOW, 0.2)
  g.restore()
  // The prop behind it, and the board, seen nearly from above.
  brush(g, [x, y + 40, x, COUNTER.back + 20], '#4a2f1c', 26)
  daub(g, oval(x, y, r + 12, r + 12, rng, 0, 18), '#3a2416')
  daub(g, oval(x, y, r, r, rng, 0, 18), '#7a4c28')
  // The grain of the board, and the joins of its three planks.
  for (let k = -4; k <= 4; k++) brush(g, [x - Math.sqrt(Math.max(0, r * r - k * k * 900)) * 0.94, y + k * 30, x, y + k * 30 + (k % 2) * 5, x + Math.sqrt(Math.max(0, r * r - k * k * 900)) * 0.94, y + k * 30], alpha(k % 3 === 0 ? DARK : '#a06a3a', k % 3 === 0 ? 0.45 : 0.3), k % 3 === 0 ? 3 : 7)
  for (let k = 0; k < 12; k++) dot(g, x + (rng.next() - 0.5) * r * 1.5, y + (rng.next() - 0.5) * r * 1.4, 1.5 + rng.next() * 2.5, alpha('#fffaf0', 0.45))
  // The rolling pin and a bowl of flour on the counter.
  brush(g, [418, 646, 520, 630], '#d9b27a', 22)
  brush(g, [404, 648, 418, 646], '#8a5a2c', 9)
  brush(g, [520, 630, 534, 628], '#8a5a2c', 9)
  daub(g, [676, 620, 684, 664, 754, 664, 762, 620], '#7a8a90', { x: -1, y: 0 }, rng, 0.8)
  daub(g, oval(719, 620, 43, 12, rng), '#fbf6ea')
}

/** The door at the end of the hall: the counter stops for it, and through it the snow lies under the night. */
function doorBay(g: Pen): void {
  const rng = makeRng(1501), d = DOORWAY, mid = (d.left + d.right) / 2
  // Outside: the night, a fir, a far roof with a lit window, and the snow up to the sill.
  slab(g, d.left, d.top, d.right - d.left, d.sill - d.top, NIGHT)
  daub(g, oval(mid, d.top + 8, (d.right - d.left) / 2, 70, undefined, 0, 14), NIGHT)
  dryBrush(g, d.left, d.top - 40, d.right - d.left, 260, '#34518a', 18, rng, 80, 22, 0.26)
  daub(g, [d.left, d.sill, d.left, 430, d.left + 70, 404, mid + 20, 420, d.right, 396, d.right, d.sill], '#b9c6de')
  daub(g, [d.right - 96, 404, d.right - 60, 300, d.right - 22, 404], '#14304a')
  // Snow on the fir: three round dabs in a lump, never a bent stroke.
  for (const [dx, dy, r] of [[-74, 370, 6], [-60, 361, 8], [-45, 372, 6]] as const) dot(g, d.right + dx, dy, r, '#cbd6e8')
  // A house as wide as its roof, with a chimney at one side and snow lying round on it: a lump, not a point.
  slab(g, d.left + 20, 372, 76, 44, '#172340')
  slab(g, d.left + 74, 340, 12, 26, '#172340')
  daub(g, [d.left + 14, 378, d.left + 24, 358, d.left + 50, 348, d.left + 82, 356, d.left + 102, 378], '#cbd6e8')
  dot(g, d.left + 46, 398, 7, '#f1b24a')
  // A trodden path, and the light of the hall lying out over the snow.
  daub(g, [mid - 60, d.sill, mid - 26, 470, mid + 30, 470, mid + 70, d.sill], '#d9e2f2')
  for (let k = 0; k < 30; k++) dot(g, d.left + rng.next() * (d.right - d.left), d.top + rng.next() * 400, 1.6 + rng.next() * 2, alpha('#eef3ff', 0.5 + rng.next() * 0.4))
  g.save()
  g.globalCompositeOperation = 'lighter'
  pool(g, mid, d.sill - 20, 190, '#ffb24a', 0.3)
  g.restore()
  // The floor of the hall where the counter stops, a mat, and the sill.
  g.fillStyle = '#4a3020'
  g.fillRect(d.left - 26, d.sill, d.right - d.left + 52, 300)
  dryBrush(g, d.left - 20, d.sill, d.right - d.left + 40, 180, '#7a5230', 26, rng, 150, 9, 0.24)
  for (let k = 1; k < 5; k++) brush(g, [d.left - 20, d.sill + k * 38, d.right + 20, d.sill + k * 38], alpha(DARK, 0.35), 3)
  daub(g, [mid - 86, 722, mid + 86, 722, mid + 100, 792, mid - 100, 792], '#8a3a2c', UP, rng, 0.5)
  brush(g, [d.left - 6, d.sill, d.right + 6, d.sill], '#8f6238', 14)
  // The frame, and the two ends of the counter either side of the way through.
  slab(g, d.left - 30, d.top - 30, 30, d.sill - d.top + 30, BEAM)
  slab(g, d.right, d.top - 30, 30, d.sill - d.top + 30, BEAM)
  daub(g, [d.left - 30, d.top - 20, d.left - 10, d.top - 86, mid, d.top - 108, d.right + 10, d.top - 86, d.right + 30, d.top - 20, d.right, d.top - 20, mid, d.top - 62, d.left, d.top - 20], BEAM)
  for (const x of [d.left - 34, d.right + 4]) slab(g, x, COUNTER.back - 4, 30, 240, '#5a3a22')
  // A sprig of fir over the lintel.
  // Its strokes are crowded here and thin there, long and short, as fir grows.
  for (const [at, long] of [[-72, 20], [-63, 27], [-44, 22], [-37, 30], [-20, 24], [-2, 31], [9, 21], [33, 28], [41, 19], [66, 25]] as const) brush(g, [mid + at, d.top - 84 + Math.abs(at) / 3, mid + at * 1.07, d.top - 84 + Math.abs(at) / 3 + long], mix(FIR, '#5f9a58', rng.next() * 0.6), 8)
  dot(g, mid, d.top - 80, 9, '#9a3526')
}

/** The door's leaf: planks and an iron ring. The handle is its hinge at the top; it is stamped as narrow as the door stands open. */
export function paintDoorLeaf(g: Pen): void {
  const rng = makeRng(1502), w = DOORWAY.right - DOORWAY.left, h = DOORWAY.sill - DOORWAY.top + 4
  daub(g, [0, 0, w * 0.5, -66, w, 0, w, h, 0, h], '#6a4424', { x: 1, y: 0 }, rng, 0.6)
  for (let k = 1; k < 5; k++) brush(g, [(w * k) / 5, -30, (w * k) / 5 + 2, h], alpha(DARK, 0.4), 4)
  brush(g, [6, 90, w - 6, 90], '#2a2420', 12)
  brush(g, [6, h - 90, w - 6, h - 90], '#2a2420', 12)
  dot(g, w - 40, h * 0.5, 15, '#2a2420')
  dot(g, w - 40, h * 0.5, 8, '#6a4424')
}

/** Paints the middle of one place. */
export function paintBay(g: Pen, place: Place): void {
  switch (place) {
    case 'candle':
      return candleBay(g)
    case 'star':
      return starBay(g)
    case 'wreath':
      return wreathBay(g)
    case 'biscuit':
      return biscuitBay(g)
    case 'door':
      return doorBay(g)
  }
}
