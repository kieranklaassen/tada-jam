import { DARK, alpha, brush, daub, dot, mix, oval, type Light, type Pen } from './paint'
import { BOARD, COLOUR_X, SIZE_X, SOURCE, WALK, type Place } from './places'
import { makeRng, type Rng } from './rng'
import { COPPER, FIR, WAX, WAX_PALE, WICKER } from './scenery'

// The front of each place, along the foot of the cloth: the three colours a
// stall has, the three sizes where it has sizes, what else its maker keeps
// there, and at both ends the dark lanterns that are walked by. One sprite
// for each place. A source is painted where places.ts says it is touched.

/** The strip of the stage a front covers: from this line down to the bottom of the surface. */
export const FRONT_TOP = 700

const UP: Light = { x: 0, y: 1 }

/** One source on its own, round its middle: the view stamps it as it hops under a tap. */
export function paintSource(g: Pen, place: Place, kind: 'colour' | 'size', index: number): void {
  const rng = makeRng(2000 + index * 7 + (kind === 'size' ? 50 : 0))
  if (kind === 'size') return place === 'star' ? sheets(g, index, rng) : place === 'wreath' ? bundle(g, index, rng) : tin(g, index, rng)
  switch (place) {
    case 'candle':
      return waxPot(g, index, rng)
    case 'star':
      return paperRoll(g, index, rng)
    case 'wreath':
      return spool(g, index, rng)
    case 'biscuit':
      return icingBag(g, index, rng)
    case 'door':
      return
  }
}

/** A small copper pot of wax on a trivet. */
function waxPot(g: Pen, c: number, rng: Rng): void {
  brush(g, [-34, 36, 34, 36], '#2a2420', 6)
  daub(g, [-40, -14, -34, 30, 34, 30, 40, -14], COPPER, UP, rng, 0.8)
  daub(g, oval(0, -14, 42, 13, rng), '#c9763c')
  daub(g, oval(0, -14, 35, 9, rng), WAX[c])
  daub(g, oval(-8, -16, 14, 3.5, rng), WAX_PALE[c])
  brush(g, [40, -8, 54, -18], '#8a8478', 6)
}

/** A roll of paper stood on end, a length of it pulled out. */
function paperRoll(g: Pen, c: number, rng: Rng): void {
  daub(g, [-24, -30, -24, 34, 24, 34, 24, -30], WAX[c], { x: -1, y: 0 }, rng, 0.8)
  daub(g, oval(0, -30, 24, 9, rng), WAX_PALE[c])
  daub(g, oval(0, -30, 8, 3, rng), mix(WAX[c], DARK, 0.6))
  daub(g, [22, 6, 48, 14, 50, 36, 24, 34], mix(WAX[c], WAX_PALE[c], 0.4))
}

/** A wooden spool wound with ribbon. Its end is tucked in: nothing hangs from it. */
function spool(g: Pen, c: number, rng: Rng): void {
  daub(g, oval(0, 30, 34, 9, rng), '#c79a62')
  daub(g, [-26, -24, -26, 28, 26, 28, 26, -24], WAX[c], { x: -1, y: 0 }, rng, 0.8)
  for (let k = 0; k < 5; k++) brush(g, [-25, -16 + k * 10, 25, -20 + k * 10], alpha(mix(WAX[c], DARK, 0.5), 0.6), 2.5)
  daub(g, oval(0, -26, 34, 9, rng), '#d9b27a')
  dot(g, 0, -26, 5, '#7a5630')
}

/** A piping bag full of icing, lying with its nozzle up. */
function icingBag(g: Pen, c: number, rng: Rng): void {
  daub(g, [-36, 30, -30, -4, 10, -26, 34, 20, 20, 36], '#efe6d0', { x: -1, y: -1 }, rng, 0.7)
  daub(g, [-8, -14, 12, -40, 26, -30, 12, -6], '#b8bcc0')
  dot(g, 20, -38, 7, WAX[c])
  daub(g, oval(-6, 14, 22, 14, rng, 0.5), alpha(WAX[c], 0.75))
  brush(g, [-36, 30, -46, 38], '#efe6d0', 7)
}

/** A pile of plain paper sheets of one size, the top one a little askew. Nothing is drawn on them. */
function sheets(g: Pen, size: number, rng: Rng): void {
  const half = 20 + size * 12
  for (let k = 0; k < 3; k++) {
    const y = 30 - k * 7, skew = k === 2 ? 6 : 0
    daub(g, [-half - k * 2 + skew, y, -half * 0.5 + skew, y - half * 0.7, half + k * 2 + skew, y - 6, half * 0.6 + skew, y + half * 0.5], k === 2 ? '#f4ecd8' : mix('#f4ecd8', DARK, 0.25 - k * 0.1), UP, rng, 0.3)
  }
}

/** A bundle of fir twigs tied round the middle: a few, a good handful, or an armful. */
function bundle(g: Pen, size: number, rng: Rng): void {
  // Five, nine or thirteen strokes, fanned from the tie, which is a wound knot and not a line across them.
  const twigs = 5 + size * 4, wide = 16 + size * 13
  for (let k = 0; k < twigs; k++) {
    const t = twigs === 1 ? 0 : k / (twigs - 1) - 0.5, lean = t * 0.9 + (rng.next() - 0.5) * 0.3, long = 44 + size * 8 + rng.next() * 14
    brush(g, [t * wide * 0.5, 30, t * wide * 0.5 + Math.sin(lean) * long, 30 - Math.cos(lean) * long], mix(FIR, '#5f9a58', rng.next() * 0.6), 8)
  }
  daub(g, oval(0, 15, wide * 0.42 + 5, 7, rng, 0.1, 8), '#cfa85c')
}

/** A biscuit tin: a scalloped ring of tinplate, as big as the biscuit it cuts. */
function tin(g: Pen, size: number, rng: Rng): void {
  const r = (BOARD.r[size] / BOARD.r[2]) * 40
  const edge: number[] = [], scallops = 10 + size * 3
  for (let i = 0; i < scallops * 2; i++) {
    const a = (i / (scallops * 2)) * Math.PI * 2, rr = r * (i % 2 ? 0.9 : 1.04)
    edge.push(Math.cos(a) * rr, 6 + Math.sin(a) * rr * 0.7)
  }
  daub(g, edge, '#aab0b4', UP, rng, 0.6)
  daub(g, oval(0, 6, r * 0.78, r * 0.52, rng), '#2a3a2e')
  brush(g, [-r * 0.6, -r * 0.3, 0, -r * 0.62, r * 0.6, -r * 0.3], alpha('#ffffff', 0.5), 3)
}

/** A dark lantern stood on the floor at one end of the place, with the trodden way that leads on past it. */
function walkLantern(g: Pen, x: number, y: number, dir: -1 | 1): void {
  const rng = makeRng(2100 + dir)
  // Flagstones worn pale, going off the end: a large one and a small one, not a row.
  daub(g, oval(x + dir * 40, y + 35, 26, 9, rng, 0, 7), alpha('#8a9a8c', 0.5))
  daub(g, oval(x + dir * 84, y + 27, 13, 6, rng, 0.3 * dir, 7), alpha('#8a9a8c', 0.36))
  daub(g, oval(x, y + 40, 34, 9, rng), alpha(DARK, 0.5))
  daub(g, [-22 + x, y + 38, -18 + x, y - 6, 18 + x, y - 6, 22 + x, y + 38], '#59606a', UP, rng, 0.7)
  daub(g, [-13 + x, y + 30, -11 + x, y, 11 + x, y, 13 + x, y + 30], '#28323e')
  dot(g, x, y + 20, 4, '#b8763a')
  daub(g, [-24 + x, y - 4, x, y - 24, 24 + x, y - 4], '#454b54')
  brush(g, [x - 14, y - 22, x, y - 44, x + 14, y - 22], '#8a8478', 4)
  brush(g, [x - 24, y + 38, x + 24, y + 38], '#454b54', 7)
}

/** Paints the whole front of one place, in stage units. */
export function paintFront(g: Pen, place: Place): void {
  const rng = makeRng(2200)
  walkLantern(g, WALK.left.x, WALK.left.y, -1)
  walkLantern(g, WALK.right.x, WALK.right.y, 1)
  const put = (kind: 'colour' | 'size', index: number, x: number) => {
    g.save()
    g.translate(x, SOURCE.y)
    daub(g, oval(0, 38, 46, 8, rng), alpha(DARK, 0.45))
    paintSource(g, place, kind, index)
    g.restore()
  }
  if (place !== 'door') for (let i = 0; i < COLOUR_X.length; i++) put('colour', i, COLOUR_X[i])
  if (place === 'star' || place === 'wreath' || place === 'biscuit') for (let i = 0; i < SIZE_X.length; i++) put('size', i, SIZE_X[i])
  switch (place) {
    case 'candle':
      // One big ball of wick in a tray, its end trailing. The three waxes stand at the other end, and nothing here
      // comes in threes or looks like a choice.
      daub(g, [700, 840, 708, 772, 900, 772, 910, 840], mix(WICKER, DARK, 0.25), UP, rng, 0.6)
      daub(g, oval(796, 756, 66, 44, rng, 0.1, 12), '#d9cdb0', UP, rng, 0.7)
      brush(g, [744, 742, 790, 724, 846, 744], mix('#d9cdb0', DARK, 0.3), 3)
      brush(g, [738, 764, 800, 742, 856, 770], mix('#d9cdb0', DARK, 0.3), 3)
      brush(g, [856, 760, 884, 772, 892, 800, 920, 808], '#d9cdb0', 4)
      break
    case 'door':
      // Snow blown in over the floor at both sides, and a broom.
      daub(g, oval(300, 812, 150, 26, rng), alpha('#cbd6e8', 0.55))
      daub(g, oval(880, 816, 130, 22, rng), alpha('#cbd6e8', 0.5))
      brush(g, [330, 720, 392, 800], '#8a5a2c', 9)
      for (let k = 0; k < 6; k++) brush(g, [388 + k * 3, 794, 398 + k * 9, 822], '#cfa85c', 5)
      break
    default:
      break
  }
}
