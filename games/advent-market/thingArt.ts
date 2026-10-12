import { cellOffset, cellOnBiscuit } from './benches'
import { drawCandle } from './candleArt'
import { LENGTH } from './hall'
import { DARK, GLOW, alpha, brush, daub, dot, mix, oval, pool, type Light, type Pen, type Ring } from './paint'
import { BOARD, RING, STAR } from './places'
import { makeRng } from './rng'
import { WAX, WAX_PALE, paintFlame } from './scenery'
import { GRID, LEFT, MARK, POINTS, RING_PLACES, type Biscuit, type CandleThing, type Star, type Thing, type Wreath } from './things'

// The four crafts as paint, each as it stands: what was made of it, what
// another stall left on it, the mark a fair-goer left, and the one thing it
// carries. A thing is painted once into a sprite, at the size it has on its
// bench with its middle at the origin, and stamped smaller in the basket and
// in a hand. Nothing here runs in a frame.

/** The sprite every thing is painted into, in stage units. */
export const BOX = { w: 330, h: 390, ox: 165, oy: 200 } as const

/** Paper, ribbon and icing come in the three colours the wax does. */
const PAPER = WAX
const PAPER_PALE = WAX_PALE
const ICING = ['#f6cf58', '#dd4f3e', '#6fae5c'] as const
const STRAW = '#cfa85c'
const FIR = '#2f6a40'
const BAKED = '#d59a55'
const DOUGH = '#ecd9a8'
const LIT: Light = { x: -0.4, y: -1 }

/** What a sprite of this thing is kept under: everything that changes how it looks. */
export function thingKey(thing: Thing, lit: boolean): string {
  return (lit ? 'lit' : '') + JSON.stringify(thing)
}

/** A bite out of a thing: cut clean out of its own sprite, or laid on as dark where the thing lies on another. */
function bite(g: Pen, x: number, y: number, r: number, cut: boolean): void {
  if (!cut) return dot(g, x, y, r, mix(DARK, '#3a2416', 0.5))
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** A coat of wax over what is painted so far: it runs down from the top, and a bead of it sits at each of `ends`. */
function waxed(g: Pen, tint: number, r: number, ends: readonly (readonly [number, number])[]): void {
  g.save()
  g.globalCompositeOperation = 'source-atop'
  g.fillStyle = alpha(WAX[tint % WAX.length], 0.62)
  g.fillRect(-r - 30, -r * 0.1, r * 2 + 60, r * 1.4 + 40)
  g.fillStyle = alpha(WAX_PALE[tint % WAX.length], 0.5)
  g.fillRect(-r - 30, -r * 0.1, r * 2 + 60, 10)
  g.restore()
  for (const [x, y] of ends) {
    dot(g, x, y, 6.5, WAX[tint % WAX.length])
    dot(g, x - 2, y - 2, 2.2, WAX_PALE[tint % WAX.length])
  }
}

function sub(g: Pen, thing: Thing, x: number, y: number, scale: number, lit: boolean): void {
  g.save()
  g.translate(x, y)
  g.scale(scale, scale)
  paintThing(g, thing, lit, false)
  g.restore()
}

/** A candle: the wick up, the fat end down. Lit, a flame stands on the wick; blown out, a thread of smoke. */
function paintCandle(g: Pen, candle: CandleThing, lit: boolean, cut: boolean): void {
  g.save()
  g.translate(0, -150)
  drawCandle(g, candle)
  if (candle.mark === MARK.chewed) for (const [side, part] of [[1, 3], [-1, 6], [1, 9]] as const) bite(g, side * (4 + candle.r[part]), 44 + part * 20, 13, cut)
  if (candle.mark === MARK.blown) {
    dot(g, 0, 1, 3.4, '#2a1c14')
    brush(g, [1, -6, 9, -22, -4, -38, 6, -56], alpha('#d8d2c8', 0.6), 4)
  } else if (lit && candle.mark !== MARK.chewed) {
    g.save()
    g.globalCompositeOperation = 'lighter'
    pool(g, 0, -16, 44, GLOW, 0.5)
    g.restore()
    paintFlame(g)
  }
  g.restore()
}

/** A folded paper star: the sheet as a rosette, and a point for every fold. */
function paintStar(g: Pen, star: Star, lit: boolean, cut: boolean): void {
  const rng = makeRng(301 + star.size), R = STAR.r[star.size], n = POINTS[star.size], colour = PAPER[star.colour % 3], pale = PAPER_PALE[star.colour % 3]
  if (star.on?.craft === 'candle') sub(g, star.on, 0, -R * 0.42, 0.62, lit)
  if (star.on?.craft === 'wreath') sub(g, star.on, 0, 0, (R * 0.98) / RING.r, lit)
  const crumpled = star.mark === MARK.crumpled
  // What a goat leaves of it: a ragged scrap with a corner or two.
  const points = star.mark === MARK.chewed ? Math.min(2, star.points) : star.points
  // The sheet: a soft rosette, paler than the points, with the creases it will be folded along.
  const sheet: Ring = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = R * (i % 2 ? 0.5 : 0.6) * (crumpled ? 0.8 + rng.next() * 0.3 : 1)
    sheet.push(Math.cos(a) * r, Math.sin(a) * r)
  }
  daub(g, sheet, mix(colour, pale, 0.45), LIT, rng, 0.5)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    brush(g, [0, 0, Math.cos(a) * R * 0.54, Math.sin(a) * R * 0.54], alpha(mix(colour, DARK, 0.4), 0.5), 2)
  }
  for (let i = 0; i < points; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, half = (Math.PI / n) * 0.92, reach = R * (crumpled ? 0.72 + rng.next() * 0.2 : 1), skew = crumpled ? (rng.next() - 0.5) * 0.3 : 0
    const tx = Math.cos(a + skew) * reach, ty = Math.sin(a + skew) * reach
    const lx = Math.cos(a - half) * R * 0.52, ly = Math.sin(a - half) * R * 0.52, rx = Math.cos(a + half) * R * 0.52, ry = Math.sin(a + half) * R * 0.52
    // A folded point has a lit face and a far face.
    daub(g, [0, 0, lx, ly, tx, ty], mix(colour, pale, 0.35))
    daub(g, [0, 0, tx, ty, rx, ry], mix(colour, DARK, 0.22))
    brush(g, [0, 0, tx, ty], alpha(pale, 0.7), 2)
  }
  if (crumpled) for (let k = 0; k < 6; k++) brush(g, [(rng.next() - 0.5) * R, (rng.next() - 0.5) * R, (rng.next() - 0.5) * R, (rng.next() - 0.5) * R], alpha(DARK, 0.35), 2.5)
  if (star.mark === MARK.chewed) for (const a of [0.4, 2.2, 4.1]) bite(g, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.22, cut)
  dot(g, 0, 0, R * 0.09, pale)
  // Dipped: a bead of wax on every point that is folded.
  if (star.left === LEFT.wax) waxed(g, star.tint, R, Array.from({ length: points }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [Math.cos(a) * R, Math.sin(a) * R] as const }))
  if (star.on?.craft === 'candle' && lit && star.on.mark === MARK.none) {
    // A lantern: the flame behind the paper shows through its middle.
    g.save()
    g.globalCompositeOperation = 'lighter'
    pool(g, 0, 0, R * 0.9, '#ffe2a0', 0.6)
    g.restore()
  }
}

/** A wreath: the straw ring, and a tuft of fir tied on with ribbon at every place a twig was bound. */
function paintWreath(g: Pen, wreath: Wreath, lit: boolean, cut: boolean): void {
  const rng = makeRng(401), ribbon = PAPER[wreath.colour % 3]
  const ring: Ring = [], hole: Ring = []
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    ring.push(Math.cos(a) * (RING.r + 15), Math.sin(a) * (RING.r + 15))
    hole.push(Math.cos(a) * (RING.r - 15), Math.sin(a) * (RING.r - 15))
  }
  // The straw is a band: an outer round with the inner one taken out of it.
  g.save()
  daub(g, ring, STRAW, LIT, rng, 0.7)
  g.globalCompositeOperation = 'destination-out'
  daub(g, hole, '#000000')
  g.restore()
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
    brush(g, [c * (RING.r - 13), s * (RING.r - 13), c * (RING.r + 13) - s * 8, s * (RING.r + 13) + c * 8], alpha(i % 2 ? '#8a6a30' : '#f0d490', 0.55), 3)
  }
  for (let place = 0; place < RING_PLACES; place++) {
    if (!wreath.twigs[place]) continue
    const a = (place / RING_PLACES) * Math.PI * 2, y = -Math.cos(a) * RING.r
    // A candle pushed into the ring springs the twigs at its foot apart: they stand off to either side of it.
    const parted = wreath.on?.craft === 'candle' && place >= 5 && place <= 7
    const x = Math.sin(a) * RING.r + (parted ? (place === 5 ? 26 : place === 7 ? -26 : 0) : 0)
    const tx = Math.cos(a), ty = Math.sin(a)
    if (parted && place === 6) {
      // The one right under the candle is split in two, a half pushed out each way.
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) brush(g, [x + side * (30 + k * 9), y, x + side * (44 + k * 12), y + (k % 2 ? 26 : -22)], mix(FIR, k % 2 ? '#5f9a58' : '#1c4028', 0.5), 7)
        brush(g, [x + side * 26, y, x + side * 52, y - 4], FIR, 11)
      }
      continue
    }
    // The tuft fans along the ring, needles out to both sides.
    for (let k = -3; k <= 3; k++) {
      const bx = x + tx * k * 9, by = y + ty * k * 9, out = 24 + rng.next() * 16, side = k % 2 ? 1 : -1
      brush(g, [bx, by, bx + Math.sin(a) * out * side + tx * 10, by - Math.cos(a) * out * side + ty * 10], mix(FIR, k % 3 ? '#5f9a58' : '#1c4028', 0.5), 7)
    }
    brush(g, [x - tx * 30, y - ty * 30, x + tx * 30, y + ty * 30], FIR, 13)
    brush(g, [x - Math.sin(a) * 15, y + Math.cos(a) * 15, x + Math.sin(a) * 15, y - Math.cos(a) * 15], ribbon, 8)
  }
  if (wreath.mark === MARK.chewed) for (const a of [0.7, 2.6, 4.6]) bite(g, Math.sin(a) * (RING.r + 14), -Math.cos(a) * (RING.r + 14), 30, cut)
  // Dipped: a bead of wax on the end of every twig, like frost.
  if (wreath.left === LEFT.wax) waxed(g, wreath.tint, RING.r + 20, wreath.twigs.flatMap((twig, place) => { const a = (place / RING_PLACES) * Math.PI * 2; return twig ? [[Math.sin(a) * (RING.r + 36), -Math.cos(a) * (RING.r + 36)] as const] : [] }))
  if (wreath.on?.craft === 'candle') sub(g, wreath.on, 0, RING.r - 124 * 0.6 - 8, 0.6, true)
  // A star is tied to the top of the ring; a biscuit hangs in its middle as an ornament.
  else if (wreath.on?.craft === 'star') sub(g, wreath.on, 0, -RING.r, 0.56, lit)
  else if (wreath.on) sub(g, wreath.on, 0, 6, 0.6, lit)
}

/** A biscuit: a sheet of dough until the tin comes down, then a scalloped round with the icing piped on it. */
function paintBiscuit(g: Pen, biscuit: Biscuit, cut: boolean): void {
  const rng = makeRng(501 + biscuit.tin), R = BOARD.r[biscuit.tin]
  if (!biscuit.cut) {
    daub(g, oval(0, 0, BOARD.dough, BOARD.dough * 0.94, rng, 0.2, 14), DOUGH, LIT, rng, 0.5)
    for (let k = 0; k < 7; k++) dot(g, (rng.next() - 0.5) * 170, (rng.next() - 0.5) * 160, 3 + rng.next() * 3, alpha('#fffaf0', 0.7))
  } else {
    const edge: Ring = [], scallops = 10 + biscuit.tin * 3
    for (let i = 0; i < scallops * 2; i++) {
      const a = (i / (scallops * 2)) * Math.PI * 2, r = R * (i % 2 ? 0.93 : 1.03)
      edge.push(Math.cos(a) * r, Math.sin(a) * r)
    }
    daub(g, edge, mix(BAKED, DARK, 0.25))
    daub(g, oval(0, 0, R * 0.9, R * 0.9, rng, 0, 14), BAKED, LIT, rng, 0.6)
    if (biscuit.left === LEFT.ring) {
      bite(g, 0, 0, R * 0.36, cut)
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; dot(g, Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4, 3, mix(BAKED, DARK, 0.3)) }
    }
    const icing = ICING[biscuit.colour % 3], iced = (row: number, col: number) => row >= 0 && row < GRID && col >= 0 && col < GRID && (biscuit.icing[row] & (1 << col)) !== 0 && cellOnBiscuit(biscuit.tin, row, col)
    for (let row = 0; row < GRID; row++) for (let col = 0; col < GRID; col++) {
      if (!iced(row, col)) continue
      const at = cellOffset(row, col)
      // A cell joins the iced cell to its right and the one below it, so a moved finger leaves a line.
      if (iced(row, col + 1)) brush(g, [at.x, at.y, at.x + BOARD.cell, at.y], icing, 17)
      if (iced(row + 1, col)) brush(g, [at.x, at.y, at.x, at.y + BOARD.cell], icing, 17)
      dot(g, at.x, at.y, 10.5, icing)
      dot(g, at.x - 3, at.y - 4, 3, mix(icing, '#ffffff', 0.6))
    }
    if (biscuit.mark === MARK.bitten) { bite(g, R * 0.78, -R * 0.5, R * 0.42, cut); bite(g, R * 0.42, -R * 0.86, R * 0.2, cut) }
  }
  if (biscuit.left === LEFT.wrap) {
    // Wrapped in the paper that was out: a band round its middle and a twist at each end.
    const paper = PAPER[biscuit.tint % 3]
    daub(g, [-R * 1.02, -R * 0.5, R * 1.02, -R * 0.56, R * 1.04, R * 0.5, -R * 1.04, R * 0.56], paper, LIT, rng, 0.8)
    for (const side of [-1, 1]) {
      daub(g, [side * R, -R * 0.2, side * (R + 44), -R * 0.56, side * (R + 36), 0, side * (R + 46), R * 0.52, side * R, R * 0.2], mix(paper, PAPER_PALE[biscuit.tint % 3], 0.3))
      brush(g, [side * (R + 2), -R * 0.3, side * (R + 2), R * 0.3], mix(paper, DARK, 0.4), 5)
    }
    for (let k = -1; k <= 1; k++) brush(g, [k * R * 0.5 - 6, -R * 0.5, k * R * 0.5 + 6, R * 0.5], alpha(PAPER_PALE[biscuit.tint % 3], 0.5), 4)
  }
  // Glazed in wax, with one fat drop at its lower edge.
  if (biscuit.left === LEFT.wax) waxed(g, biscuit.tint, R, [[R * 0.1, R + 4]])
  // A candle stood in it makes a cake of it, and cracks it right across.
  if (biscuit.on?.craft === 'candle' && biscuit.cut) brush(g, [-R * 0.86, R * 0.16, -R * 0.42, R * 0.02, -R * 0.12, R * 0.2, R * 0.3, R * 0.04, R * 0.84, R * 0.14], mix(BAKED, DARK, 0.6), 4)
  if (biscuit.on) sub(g, biscuit.on, 0, biscuit.on.craft === 'candle' ? -124 * 0.6 + 6 : 0, 0.6, true)
}

/**
 * Paints a thing with its middle at the origin. `lit` is whether its candle burns: in a hand it does, in the
 * basket it does not. `cut` is false where the thing lies on another, whose paint a bite must not take.
 */
export function paintThing(g: Pen, thing: Thing, lit: boolean, cut = true): void {
  switch (thing.craft) {
    case 'candle':
      return paintCandle(g, thing, lit, cut)
    case 'star':
      return paintStar(g, thing, lit, cut)
    case 'wreath':
      return paintWreath(g, thing, lit, cut)
    case 'biscuit':
      return paintBiscuit(g, thing, cut)
  }
}

/** How far the candle's box reaches: its wick's top and its fat end, measured from its middle. */
export const CANDLE_SPAN = { top: -150, bottom: LENGTH - 150 } as const
