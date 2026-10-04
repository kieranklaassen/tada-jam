import { MAP_SEED, SUPPLY_LANES, USER_ROWS, hourX, placeY, sectionHandle, type Board } from './board'
import type { AmountFrame, CardFrame, GameFrame, LanternFrame, Part, RowFrame, StripFrame } from './frame'
import { drawFraction, drawWhole, fractionBox, wholeWidth, type Ink } from './symbols'
import { seeded } from './terrain'
import { CUPS_IN_A_CAN, PLACES, ROD_LENGTH, SECTION_HOURS, SUPPLY_OF, type Supply, type User } from './world'

// The kit of the game, as the view draws it: everything a hand can pick up or
// set, lying on the map along the bottom and in the camp, and the numerals
// laid on it. Called by look.ts; the map and the figures are drawn there.
//
// The kit is real things lying on a printed sheet: vermilion and white, black
// and steel. Every piece of it casts one small hard shadow, down and to the
// right, and a lifted piece casts it further. Metal carries one white
// highlight line. The pieces a child counts (logs, the oil band, the water
// band, ash) are flat single colours with no face and no texture, and what a
// card stamps along the ruler is drawn in pencil.
//
// Every numeral is drawn by symbols.ts, on or beside the quantity it names:
// the hours on the ruler, the count under a rod and at the end of a row, the
// two amounts of a card, the running total of a pencilled stamp, the cups of
// a can and the places of the sled. The ash carries none. No word and no
// letter is drawn, and this file makes no text call of its own.
//
// Nothing here keeps anything between frames: a frame painted twice is the
// same picture.

type Ctx = CanvasRenderingContext2D

const TAU = Math.PI * 2
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
/** 0 below `a`, 1 above `b`, and an eased climb between. */
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t) }
/** A shake that needs no clock: it swings as the amount runs down to nothing. */
const shake = (amount: number, rate: number, phase = 0) => amount * Math.sin(amount * rate + phase)
/** A fixed small wander for a pencil line, from -0.5 to 0.5: the same for the same number every time. */
const wander = (n: number) => { const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s) - 0.5 }

// The sheet under the kit, for the edge of a numeral that lies on it.
const PAPER = '#f2e9d2'
const PENCIL = '#6d6862'
// A harder pencil, for what a child has to read off a stamped strip.
const PENCIL_DARK = '#4f4a45'
// The figures' key line, for the sled's bed, which is the mule's and not the hand's.
const INK = '#3a2c22'
const SAND = '#e8d3a2'
const BARK = '#96693f'
// The kit.
const RED = '#e2401c'
const WHITE = '#fcf9f1'
const BLACK = '#1c1c1f'
const STEEL = '#c5cdd3'
const STEEL_DARK = '#7d8891'
const SHADOW = 'rgba(46, 34, 22, 0.36)'
// The working pieces: one flat colour each.
const LOG = '#cf9f62'
const LOG_LINE = '#6a4524'
const OIL = '#eca418'
const OIL_LINE = '#8a5a06'
const WATER = '#2c7fd0'
const WATER_DARK = '#17508c'
// Ash keeps a little of what it was: grey first, then warm for wood, yellowish for oil, bluish for water.
const ASH_OF: Record<Supply, string> = { logs: '#b09a80', oil: '#b9ad68', water: '#869db8' }
const ASH_EDGE: Record<Supply, string> = { logs: '#6a5a48', oil: '#6f6630', water: '#465a72' }
// Guidance: a violet no ink on the sheet and no piece of kit uses.
const GLOW = '#7a4ff0'

const FILL: Record<Supply, string> = { logs: LOG, oil: OIL, water: WATER }
const EDGE: Record<Supply, string> = { logs: LOG_LINE, oil: OIL_LINE, water: WATER_DARK }

// Small path helpers. Each starts a new path; the caller fills or strokes it.
function disc(ctx: Ctx, x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU) }
function box(ctx: Ctx, x: number, y: number, w: number, h: number, r = 0) { ctx.beginPath(); if (r > 0) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h) }
function poly(ctx: Ctx, points: readonly number[]) {
  ctx.beginPath()
  for (let i = 0; i < points.length; i += 2) { if (i === 0) ctx.moveTo(points[i], points[i + 1]); else ctx.lineTo(points[i], points[i + 1]) }
  ctx.closePath()
}
function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke()
}
/** Many straight lines of one colour and width in a single stroke: `each` adds its lines with `seg`. */
function lines(ctx: Ctx, color: string, width: number, each: (seg: (x1: number, y1: number, x2: number, y2: number) => void) => void) {
  ctx.beginPath()
  each((x1, y1, x2, y2) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2) })
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke()
}
/** Fills the current path with a flat colour and gives it its key line. */
function ink(ctx: Ctx, fill: string, width = 1.4, color = BLACK) {
  ctx.fillStyle = fill; ctx.fill()
  if (width > 0) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke() }
}
/** The hard shadow of a kit object: the same path, offset down and to the right, in one flat tone. */
function cast(ctx: Ctx, trace: () => void, dx = 3, dy = 4) {
  ctx.save(); ctx.translate(dx, dy); trace(); ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore()
}
/** Draws in a frame of design pixels placed at a point of the surface: `u` is the size of one design pixel. */
function at(ctx: Ctx, x: number, y: number, u: number, turn: number, draw: () => void) {
  ctx.save(); ctx.translate(x, y); if (turn) ctx.rotate(turn); ctx.scale(u, u)
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  draw()
  ctx.restore()
}

/** How much further a lifted thing throws its shadow than one lying on the map. */
const LIFT = 2.4

// --- Numerals: every one goes through symbols.ts ------------------------------

/** Dark on white and on paper, with a pale edge so it reads over a contour line or the join of two bands. */
const ON_PAPER: Ink = { fill: BLACK, edge: 'rgba(252, 249, 241, 0.92)' }
/** On the white of a card: dark, and no edge is needed. */
const ON_WHITE: Ink = { fill: BLACK }
/** The numerals of a pencilled strip: pencil grey, with the paper's own tone round them. */
const IN_PENCIL: Ink = { fill: PENCIL_DARK, edge: PAPER }
/** At night the pencil shows pale on the film that lies over the paper, and its numerals with it. */
const PENCIL_NIGHT = '#d9d2bd'
const IN_PENCIL_NIGHT: Ink = { fill: '#ece5d0', edge: 'rgba(38, 46, 82, 0.9)' }

/** What one paint needs everywhere: the surface, the size of a design pixel on it, and the count of figures drawn. */
type Pen = { ctx: Ctx; u: number; draws: number }

/**
 * The size to ask of symbols.ts for a numeral meant to be `size` design pixels tall, in a frame scaled by `scale`:
 * never under eleven pixels of the surface, however small the surface is.
 */
const tall = (size: number, scale: number) => Math.max(size, 11 / Math.max(scale, 0.01))

/** A whole number, centred on (x, y). */
function drawCount(ctx: Ctx, n: number, x: number, y: number, size: number, look: Ink) {
  drawWhole(ctx, n, x, y, size, look.edge ? { ...look, edgeWidth: look.edgeWidth ?? size * 0.22 } : look)
}
/**
 * A number with a part, set to fit a low row or half a card: the whole number at full size on the line `y`, and
 * beside it the part as a stacked fraction `small` tall in its digits' size, its bar on `mid`. The pair is centred
 * on x. A part with no whole number is the fraction alone.
 */
function drawSplit(ctx: Ctx, part: Part, x: number, y: number, mid: number, size: number, small: number, look: Ink) {
  const den = Math.max(1, Math.round(part.den)), num = Math.max(0, Math.round(part.num)), whole = Math.floor(num / den), rest = num - whole * den
  if (rest === 0) { drawCount(ctx, whole, x, y, size, look); return }
  const wide = whole === 0 ? 0 : wholeWidth(ctx, whole, size), gap = whole === 0 ? 0 : size * 0.12, frac = fractionBox(ctx, { num: rest, den }, 0, 0, small).width
  const left = x - (wide + gap + frac) / 2
  if (whole > 0) drawCount(ctx, whole, left + wide / 2, y, size, look)
  drawFraction(ctx, { num: rest, den }, left + wide + gap + frac / 2, mid, small, look.edge ? { ...look, edgeWidth: small * 0.3 } : look)
}
/** A number of halves as a part in lowest terms: five halves is two and a half, four halves is two. */
const halves = (twice: number): Part => (Math.round(twice) % 2 === 0 ? { num: Math.round(twice) / 2, den: 1 } : { num: Math.round(twice), den: 2 })
/** What a card shows on the side it lies on, as halves of a piece and halves of an hour. */
function shown(amount: AmountFrame, side: CardFrame['side']): { pieces: number; hours: number } {
  const by = side === 'doubled' ? 4 : side === 'halved' ? 1 : 2
  return { pieces: Math.max(0, Math.round(amount.pieces * by)), hours: Math.max(0, Math.round(amount.hours * by)) }
}

// --- The piles, the rods and the rows -----------------------------------------

/** A supply's pile, on a dark tray so it reads as one thing to take hold of. The pieces in it are plain, and rattle on the tray when it is touched. */
function pile(ctx: Ctx, kind: Supply, rattle: number) {
  cast(ctx, () => box(ctx, -31, -25, 62, 50, 8))
  box(ctx, -31, -25, 62, 50, 8); ink(ctx, '#33373d', 1.4, BLACK)
  box(ctx, -27.5, -21.5, 55, 43, 5.5); ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'; ctx.lineWidth = 1.2; ctx.stroke()
  // Each piece jumps its own way, so the pile rattles and does not slide.
  const jolt = (i: number, x: number, y: number, turn: number) => { ctx.save(); ctx.translate(x + shake(rattle, 44, i * 2.1) * 2.4, y + shake(rattle, 37, i * 1.3 + 1) * 2); ctx.rotate(turn + shake(rattle, 31, i * 0.9) * 0.09) }
  if (kind === 'logs') {
    const logs = [[0, -15, 0], [0, -5, 0], [0, 5, 0], [0, 15, 0], [-6, -6, 0.5], [7, 6, -0.38]]
    for (let i = 0; i < logs.length; i++) { jolt(i, logs[i][0], logs[i][1], logs[i][2]); oneLog(ctx); ctx.restore() }
  } else if (kind === 'oil') {
    for (let i = 0; i < 3; i++) { jolt(i, (i - 1) * 18, 0, 0); oneFlask(ctx); ctx.restore() }
  } else {
    for (let i = 0; i < 2; i++) { jolt(i, i * 28 - 14, 0, 0); oneCan(ctx); ctx.restore() }
  }
}
/** One log, one flask and one can as they lie in a pile, each about its own middle. */
function oneLog(ctx: Ctx) { box(ctx, -23, -4.6, 46, 9.2, 2); ink(ctx, LOG, 1.1, LOG_LINE) }
function traceFlask(ctx: Ctx) {
  ctx.beginPath(); ctx.moveTo(-2.6, -16); ctx.lineTo(2.6, -16); ctx.lineTo(2.6, -9); ctx.quadraticCurveTo(7.6, -6, 7.6, 0); ctx.lineTo(7.6, 16)
  ctx.quadraticCurveTo(7.6, 20, 3.6, 20); ctx.lineTo(-3.6, 20); ctx.quadraticCurveTo(-7.6, 20, -7.6, 16); ctx.lineTo(-7.6, 0); ctx.quadraticCurveTo(-7.6, -6, -2.6, -9); ctx.closePath()
}
function oneFlask(ctx: Ctx) {
  box(ctx, -2.6, -21, 5.2, 5, 1); ink(ctx, BARK, 1, BLACK)
  traceFlask(ctx); ink(ctx, OIL, 1.1, OIL_LINE)
}
function oneCan(ctx: Ctx) {
  box(ctx, -9.5, -21.5, 7, 5, 1); ink(ctx, BLACK, 0)
  poly(ctx, [-11.5, -17, 5, -17, 11.5, -10.5, 11.5, 20, -11.5, 20]); ink(ctx, WATER, 1.1, WATER_DARK)
  box(ctx, -1, -13, 9, 3.4, 1.5); ink(ctx, WATER_DARK, 0)
}
/** A small cup from above its side: wider at the lip than at the foot. Adds to the open path. */
function traceCup(ctx: Ctx, x: number, top: number, wide: number, high: number) {
  ctx.moveTo(x - wide / 2, top); ctx.lineTo(x + wide / 2, top); ctx.lineTo(x + wide * 0.34, top + high); ctx.lineTo(x - wide * 0.34, top + high); ctx.closePath()
}

/** How far under a rod its counts lie. The water rod's lie above its row instead, at the top edge of the lane, where the cursor's tab never stands. */
const UNDER = 14
const OVER_ROW = -37

/**
 * A ranging rod: red and white in bands of five units, a black shoe at the pile end and a steel point at the other.
 * The water rod carries a second scale along its lower edge: six small cups to every can.
 */
function rod(ctx: Ctx, length: number, supply: Supply) {
  const units = ROD_LENGTH[supply], unit = length / units, t = 6, low = supply === 'water' ? 17.5 : t
  cast(ctx, () => { ctx.beginPath(); ctx.rect(-9, -t, length + 9, t + low); ctx.moveTo(length, -t); ctx.lineTo(length + 17, 0); ctx.lineTo(length, t) }, 2.5, 3.5)
  poly(ctx, [length, -t, length + 17, 0, length, t]); ink(ctx, STEEL_DARK, 1.2, BLACK)
  box(ctx, -9, -t, 9, t + low); ink(ctx, BLACK, 0)
  if (supply === 'water') {
    box(ctx, 0, t, length, low - t); ink(ctx, WHITE, 1.1, BLACK)
    const cup = unit / CUPS_IN_A_CAN
    ctx.beginPath()
    for (let k = 0; k < units * CUPS_IN_A_CAN; k++) traceCup(ctx, (k + 0.5) * cup, t + 2.4, Math.min(8.6, cup - 3), 6.6)
    ink(ctx, WATER, 0.9, WATER_DARK)
    lines(ctx, BLACK, 1.1, (seg) => { for (let k = 1; k < units; k++) seg(k * unit, t, k * unit, low) })
  }
  for (let b = 0; b * 5 < units; b++) {
    const x = b * 5 * unit, wide = Math.min(5, units - b * 5) * unit
    ctx.fillStyle = b % 2 ? WHITE : RED; ctx.fillRect(x, -t, wide, t * 2)
  }
  lines(ctx, 'rgba(28, 28, 31, 0.55)', 1, (seg) => { for (let k = 1; k < units; k++) seg(k * unit, 0.5, k * unit, t) })
  line(ctx, 1, -t + 1.8, length - 1, -t + 1.8, 'rgba(255, 255, 255, 0.4)', 1.2)
  box(ctx, 0, -t, length, t * 2); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.2; ctx.stroke()
}

/**
 * The counts of a rod: at every fifth mark, how many pieces lie between the pile and that mark. Under the rod for
 * logs and oil. For water they stand above the row, each on a thin leader up from its mark, and over the first can
 * a bracket as wide as the can holds the count of its cups, its two legs coming down to the six cups it counts.
 * The row, once laid, lies over the leaders and the legs.
 */
function rodCounts(ctx: Ctx, length: number, supply: Supply, u: number, night: boolean) {
  const units = ROD_LENGTH[supply], unit = length / units, size = tall(13, u)
  if (supply !== 'water') { for (let k = 5; k <= units; k += 5) drawCount(ctx, k, k * unit, UNDER, size, ON_PAPER); return }
  // The leaders and the bracket are drawn in the water's own blue, dark on paper and pale on the night's film, so these counts are told from the oil rod's just above them.
  lines(ctx, night ? '#a9cdf2' : WATER_DARK, 1.6, (seg) => {
    // A plain stem from each count down to its mark: with a cap across its top it would be a letter.
    for (let k = 5; k <= units; k += 5) seg(k * unit, -31.2, k * unit, -6)
    seg(1.2, -31.2, unit - 1.2, -31.2); seg(1.2, -31.2, 1.2, 6); seg(unit - 1.2, -31.2, unit - 1.2, 6)
  })
  for (let k = 5; k <= units; k += 5) drawCount(ctx, k, k * unit, OVER_ROW, size, ON_PAPER)
  drawCount(ctx, CUPS_IN_A_CAN, unit / 2, OVER_ROW, size, ON_PAPER)
}

/**
 * A row of logs along its rod: plain tan pieces laid end to end, one unit each, with a gap between so that sixty
 * still read as sixty. The newest pops in from nothing; the settling wave squashes each piece as its crest goes by,
 * wider and lower and back; a tapped piece rolls half a turn away from the rod and home. Returns the pieces drawn.
 */
function logRow(ctx: Ctx, unit: number, row: RowFrame): number {
  const n = Math.max(0, Math.floor(row.length))
  if (n === 0) return 0
  const far = row.held ? LIFT : 1, rolled = row.tap > 0 && row.tap < 1 ? Math.floor(row.tapped) : -1
  // Every piece goes into one path: one fill for all the shadows, one for the wood, one stroke for the key lines.
  const trace = (dx: number, dy: number) => {
    ctx.beginPath()
    for (let k = 0; k < n; k++) {
      if (k === rolled) continue
      let w = unit - 2.6, h = 22, y = -8
      if (row.wave > 0) { const d = (k + 0.5 - row.waveAt) / 1.4, squash = row.wave * Math.exp(-d * d); w *= 1 + 0.32 * squash; h *= 1 - 0.36 * squash }
      if (k === n - 1 && row.pop !== 1) { const pop = Math.max(0, row.pop); y = -19 + (11 * pop * h) / 22; w *= pop; h *= pop }
      if (w > 0.2 && h > 0.2) ctx.roundRect((k + 0.5) * unit - w / 2 + dx, y - h + dy, w, h, Math.min(2.6, w / 2, h / 2))
    }
  }
  trace(2 * far, 2.5 * far); ctx.fillStyle = SHADOW; ctx.fill()
  trace(0, 0); ink(ctx, LOG, 1.1, LOG_LINE)
  if (rolled >= 0 && rolled < n) {
    // Half a turn: out from the rod and back, with the one line a round thing shows as it turns.
    const w = unit - 2.6, x = (rolled + 0.5) * unit - w / 2, out = Math.sin(Math.PI * row.tap) * 9, y = -30 - out
    cast(ctx, () => box(ctx, x, y, w, 22, 2.6), 2 + out * 0.35, 2.5 + out * 0.45)
    box(ctx, x, y, w, 22, 2.6); ink(ctx, LOG, 1.1, LOG_LINE)
    line(ctx, x + 1.5, y + 22 * row.tap, x + w - 1.5, y + 22 * row.tap, LOG_LINE, 1)
  }
  return n
}

/**
 * A poured supply: one continuous band along the rod, `length` units long, with a mark at each whole flask or can.
 * Its far end leans and bulges with the slosh, the settling wave runs back along its top as one hump, and a tapped
 * section wobbles.
 */
function band(ctx: Ctx, unit: number, row: RowFrame, fill: string, edge: string, cup: boolean) {
  const length = row.length * unit, top = -30, bottom = -8, far = row.held ? LIFT : 1, r = Math.min(3.5, length / 2)
  const lean = row.slosh * 9, bulge = Math.abs(row.slosh) * 5, nose = Math.min(6, length / 2)
  const crest = row.waveAt * unit, half = Math.min(unit * 0.45, 26), humped = row.wave > 0 && crest - half > r && crest + half < length - 2
  const trace = () => {
    ctx.beginPath(); ctx.moveTo(r, top)
    if (humped) { ctx.lineTo(crest - half, top); ctx.quadraticCurveTo(crest, top - 13 * row.wave, crest + half, top) }
    // The far end is a round nose of liquid, no longer than the band at rest: it leans the way the slosh goes and swells as it does.
    ctx.lineTo(length - nose + lean, top)
    ctx.bezierCurveTo(length + lean + bulge + 1.5, top + 1, length - lean * 0.4 + bulge + 1.5, bottom - 1, length - nose - lean * 0.4, bottom)
    ctx.lineTo(r, bottom); ctx.quadraticCurveTo(0, bottom, 0, bottom - r); ctx.lineTo(0, top + r); ctx.quadraticCurveTo(0, top, r, top); ctx.closePath()
  }
  cast(ctx, trace, 2 * far, 2.5 * far)
  trace(); ink(ctx, fill, 1.2, edge)
  lines(ctx, edge, 1.8, (seg) => { for (let k = 1; k * unit < length - 1; k++) seg(k * unit, top, k * unit, bottom) })
  if (row.tap > 0 && row.tap < 1 && row.tapped >= 0 && row.tapped < row.length) {
    // The flask or can that was tapped swells and sinks a few times, less each time.
    const k = Math.floor(row.tapped), x = k * unit, w = Math.min(unit, length - x), swell = Math.sin(row.tap * Math.PI * 5) * (1 - row.tap) * 4.5
    box(ctx, x - swell * 0.4, top - swell, w + swell * 0.8, 22 + swell * 2, 3); ink(ctx, fill, 1.2, edge)
    if (cup) {
      // A can of water: one cup of it hops out, turns over once in the air and drops back in.
      const t = Math.min(1, row.tap / 0.8), up = Math.sin(Math.PI * t), cx = x + w / 2 + (t - 0.5) * 9, cy = top - 5 - 34 * up
      if (t < 1) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((t - 0.5) * 1.1)
        ctx.beginPath(); traceCup(ctx, 0, -7, 16, 14); ink(ctx, fill, 1.3, edge)
        ctx.restore()
        // Two drops fall behind it.
        ctx.beginPath(); for (const d of [0.22, 0.44]) if (t > d) ctx.rect(cx - 7 + d * 22, cy + 11 + (t - d) * 26, 2.2, 3.8)
        ctx.fillStyle = fill; ctx.fill()
      }
    }
  }
}

/** One loose piece, about its own middle and turned: a log, or one flask or can of a poured supply as a plain lump. Its shadow falls further the higher it is. */
function loose(ctx: Ctx, supply: Supply, unit: number, turn: number, lift: number) {
  const dx = 2 + 7 * lift, dy = 2.5 + 9 * lift, c = Math.cos(turn), s = Math.sin(turn), w = unit - 2.6
  const trace = supply === 'logs' ? () => box(ctx, -w / 2, -11, w, 22, 2.6) : () => box(ctx, -11, -9, 22, 18, 7)
  // The shadow keeps falling down and to the right on the map however the piece is turned.
  cast(ctx, trace, dx * c + dy * s, -dx * s + dy * c)
  trace(); ink(ctx, FILL[supply], supply === 'logs' ? 1.1 : 1.2, EDGE[supply])
}

// How the pieces of a heap lie: tumbled, the same way every time.
const TUMBLE = (() => {
  const next = seeded(MAP_SEED + 7)
  return Array.from({ length: 12 }, (_, i) => ({ x: (next() - 0.5) * 50 + (i % 2 ? 7 : -7), y: 6 - i * 2.6 + (next() - 0.5) * 14, turn: (next() - 0.5) * 2.8 }))
})()

/** What was pulled past the end of the rod, tumbled in a heap beyond its steel point. Returns the pieces drawn. */
function heap(ctx: Ctx, supply: Supply, unit: number, x: number, count: number): number {
  const n = Math.min(TUMBLE.length, Math.max(0, Math.round(count)))
  for (let i = 0; i < n; i++) {
    const lie = TUMBLE[i]
    ctx.save(); ctx.translate(x + lie.x, -14 + lie.y); ctx.rotate(lie.turn)
    loose(ctx, supply, unit, lie.turn, 0)
    ctx.restore()
  }
  return n
}

/** Pieces on their way home: each hops in an arc from its place in the row back to the pile, turning as it goes. Returns the pieces drawn. */
function flying(ctx: Ctx, supply: Supply, unit: number, home: number, pieces: RowFrame['flying']): number {
  for (const piece of pieces) {
    const t = clamp01(piece.t), along = smooth(0, 1, t), arc = Math.sin(Math.PI * t), turn = along * (supply === 'logs' ? Math.PI * 1.5 : 0.9)
    ctx.save(); ctx.translate(mix((piece.from - 0.5) * unit, home, along), -19 - arc * 44 + along * 7); ctx.rotate(turn); ctx.scale(1 + 0.16 * arc, 1 + 0.16 * arc)
    loose(ctx, supply, unit, turn, arc)
    ctx.restore()
  }
  return pieces.length
}

/** The piles and rods of the supplies this site has, the counts under the rods, the rows laid in, and at the end of each row how many pieces lie in it. */
function paintSupplies(pen: Pen, board: Board, frame: GameFrame, night: boolean) {
  const { ctx, u } = pen, len = board.rodLen / u
  for (const supply of board.rods) {
    const y = board.lanes[SUPPLY_LANES.indexOf(supply)]
    at(ctx, board.pile, y - 12 * u, u, 0, () => pile(ctx, supply, frame.rows[supply].rattle))
    at(ctx, board.rodX, y, u, 0, () => { rod(ctx, len, supply); rodCounts(ctx, len, supply, u, night) })
    pen.draws += 3
  }
  // The rows go down after every rod, so a piece in the air or in the heap is never under the next rod.
  for (const supply of board.rods) {
    const row = frame.rows[supply], unit = len / ROD_LENGTH[supply], home = (board.pile - board.rodX) / u
    at(ctx, board.rodX, board.lanes[SUPPLY_LANES.indexOf(supply)], u, 0, () => {
      let end = 0
      if (supply === 'logs') { const n = logRow(ctx, unit, row); end = n * unit; if (n > 0) pen.draws++ }
      else if (row.length * unit >= 1) { band(ctx, unit, row, FILL[supply], EDGE[supply], supply === 'water'); end = row.length * unit + 2 + Math.max(0, row.slosh) * 12; pen.draws++ }
      pen.draws += heap(ctx, supply, unit, len + 38, row.heap)
      pen.draws += flying(ctx, supply, unit, home, row.flying)
      // The count follows the last piece: just past it, at the height of the row. It names what the child laid in, so it
      // is drawn at dusk only: in the night and the morning the row is what is left, and nothing reads that out.
      const count = Math.round(row.length)
      if (end > 0 && count > 0 && frame.night.hour === 0) {
        const size = tall(17, u)
        drawCount(ctx, count, end + 5 + (count > 9 ? 0.62 : 0.31) * size, -19, size, ON_PAPER)
        pen.draws++
      }
    })
  }
}

// --- The night ruler, its cursor and its pins ---------------------------------

/** Where the numerals lie on the ruler's face: under the part marks, centred on the division they count. */
const HOUR_NUMERAL = 7.5

/**
 * One leaf of the folding rule, `count` hours long from the frame's origin: one band to the hour, red and white by
 * turns, with the half hour marked long and the quarters short along the top edge. `first` is the hour its first
 * band is, so the bands of a leaf go on from the leaf before it.
 */
function leaf(ctx: Ctx, hour: number, t: number, first: number, count: number) {
  for (let k = 0; k < count; k++) { ctx.fillStyle = (k + first) % 2 ? WHITE : RED; ctx.fillRect(k * hour, -t, hour, t * 2) }
  // Part marks: dark on white, pale on red.
  for (const white of [0, 1]) lines(ctx, white ? 'rgba(28, 28, 31, 0.8)' : 'rgba(252, 249, 241, 0.9)', 1.25, (seg) => {
    for (let k = 0; k < count; k++) if ((k + first) % 2 === white) { seg((k + 0.5) * hour, -t, (k + 0.5) * hour, -t + 10); for (const part of [0.25, 0.75]) seg((k + part) * hour, -t, (k + part) * hour, -t + 6) }
  })
  // The hour's own mark stops short of the numeral that lies on it.
  lines(ctx, BLACK, 1.5, (seg) => { for (let k = 1; k < count; k++) seg(k * hour, -t, k * hour, -3.5) })
  line(ctx, 1, t - 2, hour * count - 1, t - 2, 'rgba(28, 28, 31, 0.14)', 2)
  box(ctx, 0, -t, hour * count, t * 2); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.3; ctx.stroke()
}
/** A hinge between two leaves: a steel knuckle on the top half, with its rivet, so the numeral under it stays clear. */
function hinge(ctx: Ctx, x: number, t: number) {
  box(ctx, x - 5, -t - 1.5, 10, t - 1.5, 1.5); ink(ctx, STEEL, 1.1, BLACK)
  line(ctx, x - 3.4, -t + 0.6, x - 3.4, -5, 'rgba(255, 255, 255, 0.75)', 1.1)
  disc(ctx, x, -t + 6.5, 2.5); ink(ctx, STEEL_DARK, 0.9, BLACK)
}
/** The end of the rule: a steel shoe, and on it the pivot that a folded leaf turns on when there is one. */
function endPiece(ctx: Ctx, t: number, pivot: boolean) {
  cast(ctx, () => box(ctx, -1, -t - 3, 12, t * 2 + 6, 3), 2.5, 3.5)
  box(ctx, -1, -t - 3, 12, t * 2 + 6, 3); ink(ctx, STEEL, 1.2, BLACK)
  line(ctx, 1.4, -t, 1.4, t, 'rgba(255, 255, 255, 0.7)', 1.2)
  // The pivot is a rivet with a spot: a slot across it would be a minus in a ring.
  if (pivot) { disc(ctx, 5, -t + 7, 3.4); ink(ctx, STEEL_DARK, 1, BLACK); disc(ctx, 5, -t + 7, 1); ctx.fillStyle = BLACK; ctx.fill() }
}
/** A red tab with a white arrow on it: toward dawn, it pulls another leaf out; toward dusk, it folds the last one back. */
function pullTab(ctx: Ctx, toDawn: boolean, small: boolean) {
  const w = small ? 21 : 30, h = small ? 13.5 : 24, a = small ? 3.7 : 6.4, way = toDawn ? 1 : -1, r = small ? 3 : 6
  cast(ctx, () => box(ctx, -w / 2, -h / 2, w, h, r), small ? 1.5 : 2.5, small ? 2 : 3.5)
  box(ctx, -w / 2, -h / 2, w, h, r); ink(ctx, RED, 1.3, BLACK)
  // An arrow with its shaft, so it reads as a way to pull and not as a button.
  poly(ctx, [way * a * 1.5, 0, way * a * 0.1, -a, way * a * 0.1, -a * 0.36, -way * a * 1.5, -a * 0.36, -way * a * 1.5, a * 0.36, way * a * 0.1, a * 0.36, way * a * 0.1, a])
  ctx.fillStyle = WHITE; ctx.fill()
}

/** The cursor: a steel slide over the ruler with a window, an index line on the part marks, a pointer below, and a crescent cut out of its tab. */
function cursor(ctx: Ctx, night: boolean, held: boolean) {
  const plate = () => {
    ctx.beginPath()
    ctx.moveTo(-24, -24); ctx.lineTo(-17, -24); ctx.lineTo(-17, -45); ctx.quadraticCurveTo(-17, -53, -9, -53); ctx.lineTo(9, -53); ctx.quadraticCurveTo(17, -53, 17, -45); ctx.lineTo(17, -24)
    ctx.lineTo(24, -24); ctx.lineTo(24, 24); ctx.lineTo(8, 24); ctx.lineTo(0, 33); ctx.lineTo(-8, 24); ctx.lineTo(-24, 24); ctx.closePath()
    // The window, wound the other way so it stays open.
    ctx.moveTo(-16, -17); ctx.lineTo(-16, 17); ctx.lineTo(16, 17); ctx.lineTo(16, -17); ctx.closePath()
  }
  cast(ctx, plate, held ? 4 * LIFT : 4, held ? 5 * LIFT : 5)
  plate(); ink(ctx, STEEL, 1.5, BLACK)
  line(ctx, -22, -22, -22, 22, 'rgba(255, 255, 255, 0.7)', 1.4)
  box(ctx, -16, -17, 32, 34); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.2; ctx.stroke()
  // The index line reads the part marks and leaves the hour's numeral in the window clear.
  line(ctx, 0, -17, 0, -4, BLACK, 2)
  poly(ctx, [0, 17, -3.6, 13, 3.6, 13]); ctx.fillStyle = BLACK; ctx.fill()
  for (const y of [-21, 21]) for (const x of [-19.5, 19.5]) { disc(ctx, x, y, 1.5); ctx.fillStyle = STEEL_DARK; ctx.fill() }
  // The crescent: a moon-shaped hole, through which whatever lies under the tab shows. Its horns point up and to
  // the left, the way no letter opens.
  ctx.save()
  disc(ctx, 0, -38.5, 10); ctx.clip()
  ctx.beginPath(); ctx.rect(-14, -53, 28, 28); ctx.arc(-5.4, -42.4, 8.6, 0, TAU, true)
  ctx.fillStyle = night ? '#35406f' : '#3d3a3a'; ctx.fill()
  ctx.restore()
}

/** A map pin from above: a red ball head, a white band, and the steel needle that goes into the paper down and to the left. `lift` throws its shadow further. */
function pin(ctx: Ctx, lift = 0) {
  line(ctx, 3, 4, -9, 18, STEEL_DARK, 2.4)
  cast(ctx, () => disc(ctx, 0, 0, 12), 4 + lift * 0.5, 5 + lift * 0.62)
  disc(ctx, 0, 0, 12); ink(ctx, RED, 1.4, BLACK)
  ctx.beginPath(); ctx.arc(0, 0, 7.4, Math.PI * 0.9, Math.PI * 1.75); ctx.strokeStyle = WHITE; ctx.lineWidth = 2.6; ctx.stroke()
}

/** The night ruler along the bottom: its leaves and hinges, the hours counted on it, the leaves still folded back, and the tab that unfolds or folds one. */
function paintRuler(pen: Pen, board: Board, frame: GameFrame) {
  const { ctx, u } = pen, hour = board.ruler.hour / u, t = board.ruler.thick / u, size = tall(15, u)
  const fold = clamp01(frame.rulerFold), moving = fold < 1 && board.sections > 0
  // A leaf on its way: the last one swinging out to lie flat, or, with none unfolded, the one just folded swinging back.
  const out = moving && board.unfolded > 0
  const flat = out ? board.hours - SECTION_HOURS : board.hours, spare = board.sections - board.unfolded
  const back = Math.PI + Math.asin(Math.min(0.3, 15 / hour))
  // Leaves folded back from the frame's origin, one on the other, each swung out just far enough to show.
  const folded = (count: number, first: number) => {
    for (let s = count - 1; s >= 0; s--) {
      ctx.save(); ctx.rotate(back - Math.PI); ctx.translate(-hour * SECTION_HOURS, -s * 5)
      cast(ctx, () => box(ctx, 0, -t, hour * SECTION_HOURS, t * 2, 2))
      leaf(ctx, hour, t, first + 1 + s * SECTION_HOURS, SECTION_HOURS)
      ctx.restore()
    }
    if (count > 1) { ctx.save(); ctx.rotate(back - Math.PI); box(ctx, -hour * SECTION_HOURS - 3, -t - 6, 6, 9, 2); ink(ctx, STEEL, 1, BLACK); ctx.restore() }
  }
  const numerals = (from: number, to: number, origin: number) => {
    for (let k = from; k <= to; k++) drawCount(ctx, k, (k - origin) * hour, HOUR_NUMERAL, size, ON_PAPER)
  }
  // A hinge at every second hour of the rule as it is laid out, and one wherever an unfolded leaf joins on.
  const hinges = (to: number) => {
    const base = board.site.hours
    for (let k = 1; k < to; k++) if (k > base ? (k - base) % SECTION_HOURS === 0 : k === base ? board.sections > 0 || k % 2 === 0 : k % 2 === 0) hinge(ctx, k * hour, t)
  }
  at(ctx, board.ruler.x, board.ruler.y, u, 0, () => {
    const length = flat * hour
    if (!moving && spare > 0) { ctx.save(); ctx.translate(length, 0); folded(spare, flat); ctx.restore(); pen.draws += spare }
    if (moving) {
      const e = smooth(0, 1, fold), turn = out ? mix(back, TAU, e) : mix(TAU, back, e), c = Math.cos(turn), s = Math.sin(turn)
      const others = out ? spare : spare - 1, high = Math.sin(Math.PI * e) * 5
      ctx.save(); ctx.translate(length, 0); ctx.rotate(turn)
      if (others > 0) { ctx.save(); ctx.translate(hour * SECTION_HOURS, 0); folded(others, flat + SECTION_HOURS); ctx.restore() }
      // The shadow keeps falling down and to the right while the leaf swings, and further while it is off the paper.
      cast(ctx, () => box(ctx, 0, -t, hour * SECTION_HOURS, t * 2, 2), (3 + high) * c + (4 + high) * s, -(3 + high) * s + (4 + high) * c)
      leaf(ctx, hour, t, flat, SECTION_HOURS)
      if (out) {
        ctx.globalAlpha = smooth(0.55, 1, fold); numerals(flat + 1, flat + SECTION_HOURS - 1, flat); ctx.globalAlpha = 1
        ctx.save(); ctx.translate(hour * SECTION_HOURS, 0); endPiece(ctx, t, others > 0)
        ctx.globalAlpha = smooth(0.55, 1, fold); numerals(board.hours, board.hours, board.hours); ctx.globalAlpha = 1
        ctx.restore()
      }
      ctx.restore()
      pen.draws += 2
    }
    cast(ctx, () => box(ctx, -7, -t - 1, length + 7, t * 2 + 2, 2))
    box(ctx, -7, -t - 2, 7, t * 2 + 4, 2); ink(ctx, STEEL_DARK, 1.2, BLACK)
    leaf(ctx, hour, t, 0, flat)
    hinges(flat)
    numerals(1, flat - 1, 0)
    ctx.save(); ctx.translate(length, 0)
    endPiece(ctx, t, spare > 0 || moving)
    numerals(flat, flat, flat)
    ctx.restore()
    pen.draws += 3
    // The tabs: one past the end, and, while a leaf can go either way, a small one clipped on the face of the last leaf between its two numerals.
    if (board.sections > 0 && !moving) {
      const handle = sectionHandle(board)
      ctx.save(); ctx.translate((handle.x - board.ruler.x) / u, (handle.y - board.ruler.y) / u)
      line(ctx, -15, 0, -24, 0, BLACK, 4.6); line(ctx, -15, 0, -24, 0, STEEL, 2.4)
      pullTab(ctx, spare > 0, false)
      ctx.restore(); pen.draws++
      if (board.unfolded > 0 && spare > 0) { ctx.save(); ctx.translate((board.hours - 0.5) * hour, HOUR_NUMERAL); pullTab(ctx, false, true); ctx.restore(); pen.draws++ }
    }
  })
}

/** The cursor, and over it the pins that fell on the ruler where a user ran out. */
function paintCursor(pen: Pen, board: Board, frame: GameFrame, night: boolean) {
  const { ctx, u } = pen, t = board.ruler.thick, here = hourX(board, frame.night.hour)
  at(ctx, here, board.ruler.y, u, 0, () => cursor(ctx, night, frame.night.held))
  pen.draws++
  for (const user of USER_ROWS) {
    const fell = frame.rulerPins[user]
    if (!fell) continue
    // It falls in from above and lands with its point in the ruler's top edge, at the moment the user ran out. A pin
    // is the "where" of a shortfall, so it is never hidden: while the cursor stands over it, it stands on the cursor's tab.
    const drop = clamp01(fell.drop), high = (1 - drop * drop) * 64, x = hourX(board, fell.hour), under = Math.abs(x - here) < 27 * u
    at(ctx, x + 6.3 * u, board.ruler.y - t - (10.6 + high + (under ? 37 : 0)) * u, u * 0.7, 0, () => pin(ctx, high))
    pen.draws++
  }
}

// --- The ash and the pencilled strips, under the ruler ------------------------

/**
 * What the night has used so far, laid under the hours it burned in: plain grey pieces, each row with a little of
 * its supply's colour left in it so the three can be told apart: the fire's logs evenly to
 * the hour, the lantern's oil as one band with a mark where each flask ended, and at each round the cups that were
 * poured, with an empty outline for each cup that was wanted and not there. It stops where its user ran out, and
 * no numeral is ever laid on it.
 */
function paintAsh(pen: Pen, board: Board, frame: GameFrame) {
  const { ctx, u } = pen, hour = board.ruler.hour / u, high = board.ash.row / u, ash = frame.ash
  const row = (i: number, draw: () => void) => { at(ctx, board.ruler.x, board.ash.y + i * board.ash.row, u, 0, draw); pen.draws++ }
  const fire = ash.fire
  if (fire && fire.until > 0 && fire.amount.pieces > 0) row(0, () => {
    const each = (hour * fire.amount.hours) / fire.amount.pieces, end = fire.until * hour
    ctx.beginPath()
    // The last piece may be part burned: it is as long as it has burned.
    for (let k = 0; k * each < end - 0.4 && k < 200; k++) ctx.roundRect(k * each + 0.8, 1, Math.max(0.5, Math.min(each, end - k * each) - 1.6), high - 2, 1.2)
    ink(ctx, ASH_OF.logs, 0.9, ASH_EDGE.logs)
  })
  const lamp = ash.lantern
  if (lamp && lamp.until > 0 && lamp.amount.pieces > 0) row(1, () => {
    const each = (hour * lamp.amount.hours) / lamp.amount.pieces, end = lamp.until * hour
    box(ctx, 0.8, 1.2, Math.max(0.5, end - 1.6), high - 2.4, 1.6); ink(ctx, ASH_OF.oil, 0.9, ASH_EDGE.oil)
    lines(ctx, ASH_EDGE.oil, 1.5, (seg) => { for (let k = 1; k * each < end - 1 && k < 200; k++) seg(k * each, 1.4, k * each, high - 1.4) })
  })
  const rounds = ash.kettle
  if (rounds && rounds.length > 0) row(2, () => {
    const span = (board.site.kettle ? board.site.kettle.everyHours : 1) * hour
    for (const empty of [false, true]) {
      ctx.beginPath()
      for (const round of rounds) {
        const wanted = Math.max(round.cups, round.wanted), pitch = Math.min(9.5, span / Math.max(1, wanted))
        for (let c = empty ? round.cups : 0; c < (empty ? wanted : round.cups); c++) traceCup(ctx, round.hour * hour + (c + 0.5) * pitch, 1.2, Math.max(2, pitch - 2), high - 2.4)
      }
      if (empty) { ctx.strokeStyle = ASH_EDGE.water; ctx.lineWidth = 1; ctx.stroke() } else ink(ctx, ASH_OF.water, 0.9, ASH_EDGE.water)
    }
  })
}

/** Four sides of a box as a hand draws them: no corner quite true, and the line runs a little past where it began. Adds to the open path. */
function sketch(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  const j = (k: number) => wander(seed * 7.3 + k) * 0.9
  ctx.moveTo(x + j(0), y + j(1)); ctx.lineTo(x + w + j(2), y + j(3)); ctx.lineTo(x + w + j(4), y + h + j(5)); ctx.lineTo(x + j(6), y + h + j(7)); ctx.lineTo(x + j(8) * 0.6, y - 0.7 + j(9) * 0.6)
}

/**
 * The pieces of one stamp in pencil, `twice` halves of a piece under the span from `x0` to `x1`: logs as boxes, a
 * half log sawn through; oil as one band with a mark at each flask, a half flask as a level half way up; cups as
 * cups, a half cup the same. Adds to the open path.
 */
function sketchPieces(ctx: Ctx, kind: Supply, twice: number, x0: number, x1: number, top: number, high: number, seed: number) {
  const whole = Math.floor(twice / 2), half = twice % 2 === 1, slots = whole + (half ? 1 : 0), wide = x1 - x0
  if (slots === 0 || wide < 2) return
  if (kind === 'logs') {
    const each = wide / (twice / 2)
    for (let k = 0; k < whole; k++) sketch(ctx, x0 + k * each + 1, top, each - 2, high, seed + k)
    if (half) {
      // Sawn through: three sides of half a box, and the saw's teeth down the fourth.
      const x = x0 + whole * each + 1, w = Math.max(1.5, each / 2 - 1.5)
      ctx.moveTo(x + w, top); ctx.lineTo(x, top); ctx.lineTo(x, top + high); ctx.lineTo(x + w, top + high)
      for (let i = 3; i >= 0; i--) ctx.lineTo(x + w + (i % 2 ? 1.6 : -0.4), top + (high * i) / 4)
    }
  } else if (kind === 'oil') {
    const each = wide / slots
    sketch(ctx, x0 + 1, top, wide - 2, high, seed)
    for (let k = 1; k < slots; k++) { ctx.moveTo(x0 + k * each + wander(seed + k) * 0.8, top - 0.5); ctx.lineTo(x0 + k * each, top + high + 0.5) }
    if (half) { ctx.moveTo(x0 + (slots - 1) * each + 1.5, top + high / 2); ctx.lineTo(x1 - 1.5, top + high / 2 + wander(seed) * 0.6) }
  } else {
    // The cups stand evenly under the whole span, as the card shows them.
    const pitch = wide / slots, cup = Math.max(2, Math.min(11, pitch - 2))
    for (let k = 0; k < slots; k++) {
      const x = x0 + (k + 0.5) * pitch + wander(seed + k) * 0.5
      traceCup(ctx, x, top + wander(seed + k + 0.5) * 0.5, cup, high)
      if (half && k === slots - 1) { ctx.moveTo(x - cup * 0.42, top + high / 2); ctx.lineTo(x + cup * 0.42, top + high / 2) }
    }
  }
}

/** How wide `drawSplit` sets a number: the whole number, and its part beside it as a stacked fraction. */
function splitWidth(ctx: Ctx, part: Part, size: number, small: number): number {
  const den = Math.max(1, Math.round(part.den)), num = Math.max(0, Math.round(part.num)), whole = Math.floor(num / den), rest = num - whole * den
  if (rest === 0) return wholeWidth(ctx, whole, size)
  return (whole === 0 ? 0 : wholeWidth(ctx, whole, size) + size * 0.12) + fractionBox(ctx, { num: rest, den }, 0, 0, small).width
}

/**
 * A row of a strip that is read: each stamp's pieces in a hard pencil under its span of hours, as tall as the row
 * leaves over its line of totals, and under the hour each stamp has reached, its running total. A total with a
 * half has its whole number on that line and its half beside it as a small stacked fraction the height of the
 * row; the pieces next to it stop short of the fraction. A stamp that ends half way between two hour divisions has
 * no numeral of the ruler above it, so the hours it has reached are written there too. Where the row has a line
 * of its own for them (`line` design pixels, above the row), each stands on that line over the end of its stamp:
 * hours above, pieces below. Without one, the hours stand to the left of the stamp's end and the total to the
 * right, with the stamp's tick between them. At night the pencil shows pale on the film.
 */
function strip(ctx: Ctx, kind: Supply, row: StripFrame, hour: number, high: number, seed: number, u: number, night: boolean, top: number, line: number) {
  const size = tall(13, u), small = high / 2.1, floor = high - 10, base = high - 4.7, look = night ? IN_PENCIL_NIGHT : IN_PENCIL
  // How far a total with a half reaches past its division on the fraction's side, and on the other when it is a fraction alone.
  const reach = (total: Part) => { const whole = Math.floor(total.num / Math.max(1, total.den)); return (whole === 0 ? 0 : size * (whole > 9 ? 1.32 : 0.72)) / 2 + small * 0.45 }
  const halved = (total: Part) => total.num % Math.max(1, total.den) !== 0
  let hours = 0, pieces = 0, lead = 0
  const pairs: { x: number; hours: number; total: number }[] = []
  ctx.beginPath()
  row.stamps.forEach((stamp, i) => {
    const to = stamp.hours.num / Math.max(1, stamp.hours.den), total = stamp.pieces.num / Math.max(1, stamp.pieces.den), wide = (to - hours) * hour
    const half = halved(stamp.pieces), alone = half && stamp.pieces.num < stamp.pieces.den, between = halved(stamp.hours)
    // With no line of their own, the hours stand to the left of the stamp's end and the total to the right.
    const pair = between && line <= 0 ? { x: to * hour, hours: splitWidth(ctx, stamp.hours, size, small), total: splitWidth(ctx, stamp.pieces, size, small) } : null
    if (pair) pairs[i] = pair
    const kept = pair ? Math.min(pair.hours + 3, wide * 0.45) : Math.min(alone ? reach(stamp.pieces) + 1.5 : 0, wide * 0.3), from = Math.min(lead, wide * 0.45)
    sketchPieces(ctx, kind, Math.max(0, Math.round((total - pieces) * 2)), hours * hour + from, to * hour - kept, top, floor - top, seed + i * 31)
    // A tick where the stamp ends, down toward its total; a total with a half stands there itself. A pair has the
    // tick between it, the height of the row, and under a line of hours the tick runs up to the hours it belongs to.
    if (pair) { ctx.moveTo(to * hour + wander(seed + i) * 0.5, top - 0.5); ctx.lineTo(to * hour, high - 1) }
    else if (!half) { ctx.moveTo(to * hour + wander(seed + i) * 0.5, top - 0.5); ctx.lineTo(to * hour, floor - 0.4) }
    hours = to; pieces = total; lead = pair ? pair.total + 3 : half ? reach(stamp.pieces) + 1.5 : 0
  })
  ctx.strokeStyle = night ? PENCIL_NIGHT : PENCIL_DARK; ctx.lineWidth = 1.3; ctx.stroke()
  row.stamps.forEach((stamp, i) => {
    const pair = pairs[i], x = (stamp.hours.num / Math.max(1, stamp.hours.den)) * hour
    if (pair) {
      drawSplit(ctx, stamp.hours, pair.x - 2.5 - pair.hours / 2, base, high / 2, size, small, look)
      drawSplit(ctx, stamp.pieces, pair.x + 2.5 + pair.total / 2, base, high / 2, size, small, look)
    } else {
      drawSplit(ctx, stamp.pieces, x, base, high / 2, size, small, look)
      if (line > 0 && halved(stamp.hours)) drawSplit(ctx, stamp.hours, x, -line / 2 + 0.6, -line / 2, tall(11, u), line / 2.2, look)
    }
  })
}

/** The rows of a user's cards that are not read, kept as one thin faint line along the top of its band: as long as each was stamped, with a tick where each stamp ended. No numeral. */
function faintSpans(ctx: Ctx, rows: readonly StripFrame[], hour: number, night: boolean) {
  ctx.beginPath()
  for (const row of rows) {
    const last = row.stamps[row.stamps.length - 1]
    ctx.moveTo(0, 1.3); ctx.lineTo((last.hours.num / Math.max(1, last.hours.den)) * hour, 1.3)
    for (const stamp of row.stamps) { const x = (stamp.hours.num / Math.max(1, stamp.hours.den)) * hour; ctx.moveTo(x, 0); ctx.lineTo(x, 2.6) }
  }
  ctx.globalAlpha = 0.5; ctx.strokeStyle = night ? PENCIL_NIGHT : PENCIL; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1
}

/** How many rows of pencil can be read under the ruler at once, how tall a row is when the fourth is there, and how tall a line of hours is, in design pixels. */
const ROWS_READ = 4
const ROW_CLOSE = 15.75
const HOURS_LINE = 13

/**
 * Which rows of the pencilled strips are drawn to be read, from the top down: for each user the row of the card
 * its dial stands on and, under it, the row of the card it stamped last before that, so that two cards stamped
 * along the one ruler can be compared hour by hour. A user's rows come in the order their last stamp was laid.
 * There is room for four such rows; a fifth, which only a second lantern card beside two fire cards and the kettle
 * can ask for, stays a faint line.
 */
export function rowsRead(strips: GameFrame['strips']): { user: User; read: StripFrame[]; faint: StripFrame[] }[] {
  const bands = USER_ROWS.map((user) => {
    const rows = (strips[user] ?? []).filter((row) => row.stamps.length > 0), chief = rows.find((row) => row.current), beside = [...rows].reverse().find((row) => row !== chief)
    return { user, rows, read: chief ? [chief] : [], beside }
  }).filter((band) => band.rows.length > 0)
  let left = ROWS_READ - bands.reduce((sum, band) => sum + band.read.length, 0)
  for (const band of bands) if (band.beside && left > 0) { band.read.push(band.beside); left-- }
  return bands.map((band) => ({ user: band.user, read: band.read, faint: band.rows.filter((row) => !band.read.includes(row)) }))
}

/** Whether a row's stamps are shorter than an hour and end between two hour divisions: too close together for the hours to stand beside each end. */
const fine = (row: StripFrame) => row.stamps.some((stamp, i) => {
  const at = stamp.hours.num / Math.max(1, stamp.hours.den), before = i === 0 ? 0 : row.stamps[i - 1].hours.num / Math.max(1, row.stamps[i - 1].hours.den)
  return stamp.hours.num % Math.max(1, stamp.hours.den) !== 0 && at - before < 1
})

/**
 * Where each row that is read lies under the ruler, in design pixels down from the top of the strips: its top, its
 * height, and the height of the line of hours above it, if it has one. A row whose stamps are shorter than an hour
 * gets a line of its own for the hours of its half-way ends, as far as there is room: the rows lie closer for it,
 * then a second card's row gives way and goes back to a faint line, and a row that still finds no room writes its
 * hours beside each end.
 */
export function stripLayout(strips: GameFrame['strips'], rowHigh: number): { user: User; row: StripFrame; top: number; high: number; line: number; faint: StripFrame[] }[] {
  const room = ROWS_READ * ROW_CLOSE, bands = rowsRead(strips).map((band) => ({ user: band.user, read: [...band.read], faint: [...band.faint] }))
  const count = () => bands.reduce((sum, band) => sum + band.read.length, 0), lines = () => bands.reduce((sum, band) => sum + band.read.filter(fine).length, 0)
  const high = () => (count() > 3 ? Math.min(rowHigh, ROW_CLOSE) : rowHigh)
  // Where even rows lying close leave no room for the lines of hours, a second card's row gives way, the last first.
  for (let k = bands.length - 1; k >= 0 && lines() > 0 && count() * Math.min(high(), ROW_CLOSE) + lines() * HOURS_LINE > room; k--) if (bands[k].read.length > 1) bands[k].faint.push(bands[k].read.pop()!)
  let each = high()
  if (count() * each + lines() * HOURS_LINE > room) each = Math.min(each, ROW_CLOSE)
  let left = room - count() * each
  const out: { user: User; row: StripFrame; top: number; high: number; line: number; faint: StripFrame[] }[] = []
  let y = 0
  for (const band of bands) band.read.forEach((row, k) => {
    const line = fine(row) && left >= HOURS_LINE ? HOURS_LINE : 0
    left -= line
    out.push({ user: band.user, row, top: y + line, high: each, line, faint: k === 0 ? band.faint : [] })
    y += line + each
  })
  return out
}

/**
 * The pencilled strips under the ash. The rows that are read lie one under another, a user's two together; three
 * rows have the height the board gives a row, and four lie a little closer. The rows of a user's older cards are
 * kept as one thin faint line above its first row.
 */
function paintStrips(pen: Pen, board: Board, frame: GameFrame, night: boolean) {
  const { ctx, u } = pen, hour = board.ruler.hour / u
  for (const one of stripLayout(frame.strips, board.strips.row / u)) {
    const faint = one.faint.length > 0
    at(ctx, board.ruler.x, board.strips.y + one.top * u, u, 0, () => {
      if (faint) { ctx.save(); ctx.translate(0, -one.line); faintSpans(ctx, one.faint, hour, night); ctx.restore(); pen.draws++ }
      strip(ctx, SUPPLY_OF[one.user], one.row, hour, one.high, USER_ROWS.indexOf(one.user) * 97 + one.row.card * 13 + 1, u, night, faint && one.line === 0 ? 4 : 0.8, one.line); pen.draws += 2
    })
  }
}

// --- The amount cards ---------------------------------------------------------

/** How the cards lie at home: none quite square to the sheet. */
const CARD_TILT: Record<User, number> = { fire: -0.05, lantern: 0.04, kettle: -0.03 }

/**
 * The face of an amount card, 84 by 48: a piece of the night ruler as long as its span of hours, banded by the
 * hour, and under it the pieces its user takes in that span; beside each, its numeral. A half hour is a span that
 * stops half way to the next division; a half piece is a log sawn through, or a flask or a cup half full.
 */
function cardFace(ctx: Ctx, kind: Supply, pieces2: number, hours2: number, u: number) {
  const left = -37, room = 52, bands = Math.max(1, Math.ceil(hours2 / 2)), hour = Math.min(44, room / bands), wide = (hours2 / 2) * hour
  const top = -19, thick = 12
  // The ruler piece: whole hours banded red and white, and the hour a half span stops in left as bare outline.
  if (hours2 % 2 === 1) {
    ctx.setLineDash([2.2, 2]); box(ctx, left + wide, top, hour / 2, thick); ctx.strokeStyle = 'rgba(28, 28, 31, 0.5)'; ctx.lineWidth = 0.9; ctx.stroke(); ctx.setLineDash([])
    line(ctx, left + bands * hour, top - 2, left + bands * hour, top + thick + 2, 'rgba(28, 28, 31, 0.6)', 1)
  }
  for (let k = 0; k < bands; k++) {
    const w = Math.min(hour, wide - k * hour)
    box(ctx, left + k * hour, top, w, thick); ink(ctx, k % 2 ? WHITE : RED, 1.1, BLACK)
    if (w > hour * 0.75 && hour >= 12) line(ctx, left + (k + 0.5) * hour, top, left + (k + 0.5) * hour, top + 4.5, k % 2 ? BLACK : WHITE, 1)
  }
  // The span carried down to the pieces: two faint lines, as a pencil rules them.
  for (const x of [left, left + wide]) line(ctx, x, top + thick, x, 19, 'rgba(28, 28, 31, 0.4)', 0.9)
  const whole = Math.floor(pieces2 / 2), half = pieces2 % 2 === 1, slots = whole + (half ? 1 : 0)
  if (kind === 'logs' && slots > 0) {
    const rows = slots > 6 ? 2 : 1, per = Math.ceil(slots / rows), each = wide / (half && rows === 1 ? pieces2 / 2 : per), high = rows === 1 ? 11 : 6.4
    ctx.beginPath()
    for (let k = 0; k < whole; k++) ctx.roundRect(left + (k % per) * each + 1, 3.5 + Math.floor(k / per) * (high + 1.6), each - 2, high, 1.5)
    ink(ctx, LOG, 1.1, LOG_LINE)
    if (half) {
      const x = left + (whole % per) * each + 1, y = 3.5 + Math.floor(whole / per) * (high + 1.6), w = Math.max(2, (rows === 1 ? each / 2 : each / 2) - 1.2)
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + 1.5, y); ctx.quadraticCurveTo(x, y, x, y + 1.5); ctx.lineTo(x, y + high - 1.5); ctx.quadraticCurveTo(x, y + high, x + 1.5, y + high); ctx.lineTo(x + w, y + high)
      for (let i = 3; i >= 1; i--) ctx.lineTo(x + w + (i % 2 ? 1.8 : -0.6), y + (high * i) / 4)
      ctx.closePath(); ink(ctx, LOG, 1.1, LOG_LINE)
    }
  } else if (kind === 'oil' && slots > 0) {
    const each = wide / slots, full = whole * each
    box(ctx, left + 1, 4, wide - 2, 11, 2.5); ink(ctx, WHITE, 0)
    ctx.save(); box(ctx, left + 1, 4, wide - 2, 11, 2.5); ctx.clip()
    ctx.fillStyle = OIL; ctx.fillRect(left, 4, full, 11)
    if (half) ctx.fillRect(left + full, 9.5, each, 5.5)
    ctx.restore()
    if (half) line(ctx, left + full + 1, 9.5, left + wide - 1, 9.5, OIL_LINE, 1)
    box(ctx, left + 1, 4, wide - 2, 11, 2.5); ctx.strokeStyle = OIL_LINE; ctx.lineWidth = 1.1; ctx.stroke()
    for (let k = 1; k < slots; k++) line(ctx, left + k * each, 4, left + k * each, 15, OIL_LINE, 1.5)
  } else if (slots > 0) {
    const rows = slots > 8 ? 2 : 1, per = Math.ceil(slots / rows), pitch = wide / per, cup = Math.max(2.5, Math.min(11, pitch - 1.6)), high = rows === 1 ? 11 : 6.4
    const where = (k: number): [number, number] => [left + ((k % per) + 0.5) * pitch, 3.5 + Math.floor(k / per) * (high + 1.6)]
    ctx.beginPath()
    for (let k = 0; k < whole; k++) traceCup(ctx, ...where(k), cup, high)
    ink(ctx, WATER, 1, WATER_DARK)
    if (half) {
      const [x, y] = where(whole)
      ctx.beginPath(); traceCup(ctx, x, y, cup, high); ink(ctx, WHITE, 0)
      ctx.save(); ctx.beginPath(); traceCup(ctx, x, y, cup, high); ctx.clip(); ctx.fillStyle = WATER; ctx.fillRect(x - cup, y + high / 2, cup * 2, high); ctx.restore()
      ctx.beginPath(); traceCup(ctx, x, y, cup, high); ctx.strokeStyle = WATER_DARK; ctx.lineWidth = 1; ctx.stroke()
    }
  }
  // The two numerals, each beside what it counts: the hours beside the span, the pieces beside the pieces.
  // A whole number stands tall. One with a half takes the whole height of its half of the card: the whole number as tall, and the fraction beside it from the card's edge to its middle.
  const size = tall(14.5, u)
  drawSplit(ctx, halves(hours2), 29, -12.2, -12.1, size, 11.3, ON_WHITE)
  drawSplit(ctx, halves(pieces2), 29, 11, 12.1, size, 11.3, ON_WHITE)
}

/** An amount card where it lies or is held: white, with its hard shadow, turning over about its long axis while it is flipped. */
function card(ctx: Ctx, kind: Supply, it: CardFrame, u: number) {
  const turn = clamp01(it.flip), up = Math.sin(Math.PI * turn), squash = Math.max(0.06, Math.abs(Math.cos(Math.PI * turn))), far = (it.held ? LIFT : 1) + up * 1.6
  ctx.save(); ctx.translate(3 * far, 4 * far); ctx.scale(1, squash); box(ctx, -42, -24, 84, 48, 4); ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore()
  ctx.save(); ctx.translate(0, -up * 5); ctx.scale(1, squash)
  box(ctx, -42, -24, 84, 48, 4); ink(ctx, WHITE, 1.2, 'rgba(28, 28, 31, 0.6)')
  // The side it is turning to shows once the card is past its edge; until then its back is bare.
  if (turn >= 0.5) { const face = shown(it.amount, it.side); cardFace(ctx, kind, face.pieces, face.hours, u) }
  ctx.restore()
}

/** The cards of the users this site has: those lying on the sheet, or, with `held`, the one in the hand. */
function paintCards(pen: Pen, frame: GameFrame, held: boolean) {
  const { ctx, u } = pen
  for (const user of USER_ROWS) {
    const it = frame.cards[user]
    if (!it || it.held !== held) continue
    const scale = u * (it.held ? 1.07 : 1)
    at(ctx, it.x, it.y, scale, it.held ? 0 : CARD_TILT[user], () => card(ctx, SUPPLY_OF[user], it, scale))
    pen.draws += 3
  }
}

// --- The kit in the camp: the dial, the lanterns, the pins, the tin, the compass ---

/** How far a light reaches, in pencil, as a hand with a pair of compasses would draw it: one turn, and a second pass over part of it. */
function pencilRing(ctx: Ctx, reach: number) {
  const r = Math.max(0, reach)
  ctx.strokeStyle = PENCIL; ctx.globalAlpha = 0.8
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r, 0.2, TAU + 0.05); ctx.stroke()
  ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0.8, -0.6, r + 0.9, 2.6, 5.2); ctx.stroke()
  ctx.globalAlpha = 1
}

/**
 * The fire's dial: a steel ring round the fire with one notch for each setting, each cut a little wider than the
 * last, and a red knob standing in the notch it is set to. While it slides the knob rides up out of the ring, on
 * its way from the notch before.
 */
function dial(ctx: Ctx, count: number, setting: number, slide: number) {
  const ring = () => { ctx.beginPath(); ctx.arc(0, 0, 51, 0, TAU); ctx.moveTo(40, 0); ctx.arc(0, 0, 40, 0, TAU, true) }
  cast(ctx, ring)
  ring(); ink(ctx, STEEL, 1.4, BLACK)
  ctx.beginPath(); ctx.arc(0, 0, 48.4, Math.PI * 0.95, Math.PI * 1.6); ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'; ctx.lineWidth = 1.6; ctx.stroke()
  const n = Math.max(1, Math.round(count)), notch = (i: number) => -0.86 + (i - (n - 1) / 2) * 0.59
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.rotate(notch(i))
    const half = 2.6 + i * 2
    poly(ctx, [52.5, -half - 1.2, 43, -half, 43, half, 52.5, half + 1.2]); ctx.fillStyle = BLACK; ctx.fill()
    ctx.restore()
  }
  const now = Math.max(0, Math.min(n - 1, Math.round(setting))), e = smooth(0, 1, clamp01(slide)), up = Math.sin(Math.PI * e)
  ctx.save(); ctx.rotate(mix(notch((now - 1 + n) % n), notch(now), e)); ctx.translate(46 + up * 3, 0)
  cast(ctx, () => disc(ctx, 0, 0, 10.5), 2.5 + up * 2.5, 3.5 + up * 3)
  disc(ctx, 0, 0, 10.5); ink(ctx, RED, 1.4, BLACK)
  // A plain white spot on the knob: a ring there would be a nought beside the fire.
  disc(ctx, 0, 0, 3.6); ctx.fillStyle = WHITE; ctx.fill()
  ctx.restore()
}

/**
 * The lantern, standing on the sheet and seen from above: a square black frame with a steel post at each corner,
 * the glass inside it, and in the glass the flame when it burns, short on the low wick and tall on the high, or
 * the dark wick when it does not. Its wire bail has fallen to one side and arches out past the frame, with a
 * wooden grip. A small red knob on a stem at its side has an arm that points down on the low wick and up on the
 * high. A wick just clicked has its knob still turning, and the glass flashes.
 */
function lantern(ctx: Ctx, it: LanternFrame) {
  const far = it.held ? LIFT : 1, click = clamp01(it.click), high = it.wick === 1
  const bail = () => { ctx.beginPath(); ctx.moveTo(-23, 3); ctx.bezierCurveTo(-41, 37, 4, 55, 23, 5) }
  ctx.save(); ctx.translate(3 * far, 4 * far); bail(); ctx.strokeStyle = SHADOW; ctx.lineWidth = 3.4; ctx.stroke(); ctx.restore()
  cast(ctx, () => box(ctx, -23, -23, 46, 46, 8), 4 * far, 5 * far)
  bail(); ctx.strokeStyle = BLACK; ctx.lineWidth = 4.4; ctx.stroke(); ctx.strokeStyle = STEEL; ctx.lineWidth = 2.2; ctx.stroke()
  // The grip, where a hand takes the bail.
  ctx.save(); ctx.translate(-9.5, 37.5); ctx.rotate(0.42); box(ctx, -9, -3.6, 18, 7.2, 3); ink(ctx, BARK, 1.2, BLACK); ctx.restore()
  // The knob, small, out on its stem.
  line(ctx, 22, -9, 28, -9, BLACK, 3)
  ctx.save(); ctx.translate(28.5, -9); ctx.rotate((high ? -Math.PI / 2 : Math.PI / 2) + (high ? 1 : -1) * click * 1.2)
  box(ctx, 0, -1.7, 7.4, 3.4, 1.7); ink(ctx, RED, 1, BLACK)
  ctx.restore()
  disc(ctx, 28.5, -9, 3.4); ink(ctx, RED, 1.1, BLACK)
  box(ctx, -23, -23, 46, 46, 8); ink(ctx, BLACK, 0)
  line(ctx, -17, -21, 14, -21, 'rgba(255, 255, 255, 0.5)', 1.2)
  box(ctx, -16.5, -16.5, 33, 33, 5); ink(ctx, it.lit ? '#ffe08a' : '#dfe8e4', 0)
  if (it.lit) { box(ctx, -15, -15, 30, 30, 4); ctx.strokeStyle = '#fff6cf'; ctx.lineWidth = 3; ctx.stroke() }
  if (it.lit) {
    // The flame: a drop with a pale heart, as tall as the wick is high.
    const tip = high ? -13 : -8, wide = high ? 7.6 : 6
    const drop = (k: number) => { ctx.beginPath(); ctx.moveTo(0, 8 + (tip - 8) * k); ctx.bezierCurveTo(wide * 0.5 * k, 8 + (tip - 8) * 0.5 * k, wide * k, 2, wide * k * 0.94, 5.4); ctx.arc(0, 5.4, wide * k * 0.94, 0, Math.PI); ctx.bezierCurveTo(-wide * k, 2, -wide * 0.5 * k, 8 + (tip - 8) * 0.5 * k, 0, 8 + (tip - 8) * k); ctx.closePath() }
    drop(1); ink(ctx, RED, 1, '#8a2410')
    drop(0.5); ink(ctx, '#ffd34d', 0)
  } else {
    // The wick, unlit: a dark stub in its burner, longer when it is turned high.
    box(ctx, -6.5, 3.4, 13, 6, 1.8); ink(ctx, STEEL_DARK, 1.1, BLACK)
    box(ctx, -2.4, high ? -8 : -3, 4.8, high ? 12.4 : 7.4, 1.6); ink(ctx, '#2a2623', 0)
  }
  if (click > 0) { box(ctx, -16.5, -16.5, 33, 33, 5); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = click * 0.85; ctx.fill(); ctx.globalAlpha = 1 }
  // The four posts of the cage, and the two pins the bail swings on.
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { box(ctx, sx * 18.5 - 4.2, sy * 18.5 - 4.2, 8.4, 8.4, 2.4); ink(ctx, STEEL, 1.1, BLACK) }
  for (const sx of [-1, 1]) { disc(ctx, sx * 23, 4, 2.6); ink(ctx, STEEL_DARK, 1, BLACK) }
}

/** A marshmallow: small, white and square with soft corners. */
function marshmallow(ctx: Ctx, lift = 0) {
  cast(ctx, () => box(ctx, -4.5, -4.5, 9, 9, 3), 1.5 + lift, 2 + lift * 1.3)
  box(ctx, -4.5, -4.5, 9, 9, 3); ink(ctx, WHITE, 1.1, BLACK)
}

/** The snack tin: red with a white band and a steel-rimmed lid, and two marshmallows that have got out. A tapped tin's lid pops up and falls back. */
function tin(ctx: Ctx, pop: number) {
  cast(ctx, () => box(ctx, -19, -14, 38, 28, 5))
  box(ctx, -19, -14, 38, 28, 5); ink(ctx, RED, 1.4, BLACK)
  ctx.fillStyle = WHITE; ctx.fillRect(-18.3, -4.5, 36.6, 9)
  box(ctx, -19, -14, 38, 28, 5); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.4; ctx.stroke()
  const up = clamp01(pop)
  if (up > 0) { box(ctx, -14, -9.5, 28, 19, 3); ink(ctx, '#4a2018', 1.2, BLACK) }
  ctx.save(); ctx.translate(-up * 5, -up * 11); ctx.rotate(-up * 0.3)
  if (up > 0) {
    cast(ctx, () => box(ctx, -14, -9.5, 28, 19, 3), 2 + up * 7, 3 + up * 9)
    box(ctx, -14, -9.5, 28, 19, 3); ink(ctx, RED, 0)
    ctx.fillStyle = WHITE; ctx.fillRect(-13.4, -4.5, 26.8, 9)
  }
  box(ctx, -14, -9.5, 28, 19, 3); ctx.strokeStyle = up > 0 ? BLACK : STEEL_DARK; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.restore()
  for (const [x, y] of [[27, 6], [33, -5]]) { ctx.save(); ctx.translate(x, y); marshmallow(ctx); ctx.restore() }
}

/** The compass: steel case, white card with tick marks and no letters, and a red and white needle that swings when the case is touched. */
function compass(ctx: Ctx, needle: number) {
  // The crown it is wound and held by: a solid knob, since an open ring above the case would be a nought.
  const loop = () => { ctx.beginPath(); ctx.arc(0, -60, 9, 0, TAU) }
  cast(ctx, loop); cast(ctx, () => disc(ctx, 0, 0, 50), 4, 5)
  loop(); ink(ctx, STEEL, 1.3, BLACK)
  box(ctx, -9, -54, 18, 8, 2); ink(ctx, STEEL_DARK, 1.2, BLACK)
  disc(ctx, 0, 0, 50); ink(ctx, STEEL, 1.5, BLACK)
  lines(ctx, STEEL_DARK, 1, (seg) => { for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU; seg(Math.cos(a) * 45, Math.sin(a) * 45, Math.cos(a) * 49, Math.sin(a) * 49) } })
  disc(ctx, 0, 0, 42); ink(ctx, WHITE, 1.3, BLACK)
  for (const long of [false, true]) lines(ctx, BLACK, long ? 1.8 : 1, (seg) => {
    for (let i = 0; i < 32; i++) if ((i % 4 === 0) === long) { const a = (i / 32) * TAU, from = long ? 30 : 34; seg(Math.cos(a) * from, Math.sin(a) * from, Math.cos(a) * 38.5, Math.sin(a) * 38.5) }
  })
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate((i * TAU) / 4); poly(ctx, [0, -29, 3.4, -22, -3.4, -22]); ctx.fillStyle = BLACK; ctx.fill(); ctx.restore() }
  ctx.save(); ctx.rotate(-0.42 + needle)
  cast(ctx, () => poly(ctx, [0, -27, 6.5, 0, 0, 27, -6.5, 0]), 1.5, 2)
  poly(ctx, [0, -27, 6.5, 0, -6.5, 0]); ink(ctx, RED, 1.1, BLACK)
  poly(ctx, [0, 27, 6.5, 0, -6.5, 0]); ink(ctx, WHITE, 1.1, BLACK)
  ctx.restore()
  disc(ctx, 0, 0, 3.6); ink(ctx, STEEL, 1.1, BLACK)
  disc(ctx, 0, 0, 1.2); ink(ctx, BLACK, 0)
}

/** What lies in the camp: the marshmallow trail, the fire's reach in pencil and its dial, the pins, the tin, the lanterns that stand on the sheet, and the compass. */
function paintCamp(pen: Pen, board: Board, frame: GameFrame, night: boolean) {
  const { ctx, u } = pen
  const put = (x: number, y: number, turn: number, draw: () => void) => { at(ctx, x, y, u, turn, draw); pen.draws++ }
  if (frame.trail.length > 0) {
    // The whole trail in two paths: every shadow, then every marshmallow.
    for (const pass of [1, 0]) {
      ctx.beginPath()
      for (const p of frame.trail) ctx.roundRect(p.x + (pass * 1.5 - 5) * u, p.y + (pass * 2 - 5) * u, 10 * u, 10 * u, 3.2 * u)
      if (pass) { ctx.fillStyle = SHADOW; ctx.fill() } else { ctx.lineWidth = 1.1 * u; ink(ctx, WHITE, 1.1 * u, BLACK) }
    }
    pen.draws++
  }
  if (!night) put(board.fire.x, board.fire.y, 0, () => pencilRing(ctx, frame.blaze.reach / u))
  put(board.fire.x, board.fire.y, 0, () => dial(ctx, board.site.fire.length, frame.blaze.setting, frame.blaze.knob))
  for (const spot of board.pins) put(spot.x, spot.y, 0, () => pin(ctx))
  // The tin lies in its place unless a raccoon has it on its back; for the picnic it stands in the cold ring of stones.
  if (frame.tinAt === 'home') put(board.tin.x, board.tin.y, -0.25, () => tin(ctx, frame.tin))
  else if (frame.tinAt === 'ring') put(board.fire.x, board.fire.y, 0.3, () => tin(ctx, frame.tin))
  for (const it of frame.lanterns) if (!it.held) paintLantern(pen, it, night)
  at(ctx, board.compass.x, board.compass.y, board.compass.r / 50, 0.12, () => compass(ctx, frame.needle)); pen.draws++
}
/** One lantern where it is, with its reach round it in pencil at dusk. In the hand it is a little larger and its shadow falls further. */
function paintLantern(pen: Pen, it: LanternFrame, night: boolean) {
  const { ctx, u } = pen
  if (!night) { at(ctx, it.x, it.y, u, 0, () => pencilRing(ctx, it.reach / u)); pen.draws++ }
  at(ctx, it.x, it.y, u * (it.held ? 1.08 : 1), 0, () => lantern(ctx, it)); pen.draws++
}

// --- The sled's bed, on the folded edge ---------------------------------------

/**
 * The sled from straight above: two runners, a slatted bed one slat to the place, and the tow rope up toward the
 * mule. The load lies on it from the front, each supply in its own plain colour with a line at every piece; what
 * does not fit slides off the tail. Beside the bed, at every fifth place, the count of places.
 */
function paintSled(pen: Pen, board: Board, frame: GameFrame) {
  const bed = board.sled, sled = frame.sled
  if (!bed || !sled) return
  const { ctx, u } = pen, half = bed.width / u / 2, place = bed.place / u, long = bed.places * place
  at(ctx, bed.x, bed.top, u, 0, () => {
    // The rope: a bridle from the two runners to one line, which runs up to the mule.
    const tie = Math.min(-34, (board.mule.y - bed.top) / u + 46), over = (board.mule.x - bed.x) / u
    ctx.beginPath()
    for (const side of [-1, 1]) { ctx.moveTo(side * (half + 2.5), -7); ctx.quadraticCurveTo(side * 6, -18, 0, -30) }
    ctx.moveTo(0, -30); ctx.quadraticCurveTo(-5, (tie - 30) / 2, over, tie)
    ctx.strokeStyle = '#8f8266'; ctx.lineWidth = 1.7; ctx.stroke()
    for (const side of [-1, 1]) { box(ctx, side * (half + 2.5) - 2.6, -10, 5.2, long + 17, 2.6); ink(ctx, BARK, 1.2, INK) }
    for (const y of [-3.5, long + 0.5]) { box(ctx, -half - 2, y, half * 2 + 4, 3, 1); ink(ctx, BARK, 1.1, INK) }
    box(ctx, -half, 0, half * 2, long, 2.5); ink(ctx, SAND, 1.3, INK)
    for (const fifth of [false, true]) {
      ctx.beginPath()
      for (let k = 1; k < bed.places; k++) if ((k % 5 === 0) === fifth) { ctx.moveTo(-half + 1, k * place); ctx.lineTo(half - 1, k * place) }
      ctx.strokeStyle = fifth ? 'rgba(58, 44, 34, 0.75)' : 'rgba(58, 44, 34, 0.25)'; ctx.lineWidth = fifth ? 1.3 : 0.8; ctx.stroke()
    }
    pen.draws += 2
    let laid = 0
    for (const lot of sled.load) {
      const n = Math.max(0, Math.min(bed.places - laid, lot.places)), each = PLACES[lot.supply] * place
      if (n <= 0) continue
      box(ctx, -half + 3.5, laid * place + 0.7, half * 2 - 7, n * place - 1.4, 2); ink(ctx, FILL[lot.supply], 1.1, EDGE[lot.supply])
      ctx.beginPath()
      for (let k = 1; k * each < n * place - 1; k++) { ctx.moveTo(-half + 3.5, laid * place + k * each); ctx.lineTo(half - 3.5, laid * place + k * each) }
      ctx.strokeStyle = EDGE[lot.supply]; ctx.lineWidth = 0.9; ctx.stroke()
      laid += n; pen.draws++
    }
    if (sled.strapped && laid > 0) {
      for (const part of [0.28, 0.72]) {
        const y = laid * place * part
        cast(ctx, () => box(ctx, -half - 4, y - 2.8, half * 2 + 8, 5.6, 1.5), 1.5, 2)
        box(ctx, -half - 4, y - 2.8, half * 2 + 8, 5.6, 1.5); ink(ctx, RED, 1.1, BLACK)
        // The buckle is a plain steel plate with one rivet: a bar across it would be a minus on the load.
        box(ctx, -5, y - 4.2, 10, 8.4, 1.5); ink(ctx, STEEL, 1.1, BLACK)
        disc(ctx, 0, y, 1.3); ctx.fillStyle = BLACK; ctx.fill()
      }
      pen.draws++
    }
    const off = clamp01(sled.refuse)
    if (off > 0) {
      // The piece that does not fit: off the tail and away, turning as it goes.
      const supply = sled.load.length > 0 ? sled.load[sled.load.length - 1].supply : 'logs', gone = 1 - off, high = PLACES[supply] * place
      ctx.save(); ctx.translate(gone * 9, long + 3 + high / 2 + gone * 30); ctx.rotate(gone * 0.7); ctx.globalAlpha = Math.min(1, off * 4)
      cast(ctx, () => box(ctx, -half + 3.5, -high / 2, half * 2 - 7, high, 2), 2 + gone * 3, 2.5 + gone * 4)
      box(ctx, -half + 3.5, -high / 2, half * 2 - 7, high, 2); ink(ctx, FILL[supply], 1.1, EDGE[supply])
      ctx.restore(); ctx.globalAlpha = 1
      pen.draws++
    }
    const size = tall(13, u)
    for (let k = 5; k <= bed.places; k += 5) {
      const y = (placeY(board, k) - bed.top) / u
      line(ctx, -half - 11, y, -half - 6, y, INK, 1.2)
      drawCount(ctx, k, -half - 13 - (k > 9 ? 0.62 : 0.31) * size, y, size, ON_PAPER)
    }
    pen.draws++
  })
}

// --- What lies over everything ------------------------------------------------

/** The glow that shows an idle hand where to begin: a soft violet halo round a place, `r` design pixels out, in three flat rings and never a haze. */
function halo(ctx: Ctx, glow: number, r: number) {
  ctx.strokeStyle = GLOW
  for (const [wide, alpha] of [[26, 0.13], [15, 0.28], [6.5, 0.52]]) { ctx.globalAlpha = alpha * glow; ctx.lineWidth = wide; disc(ctx, 0, 0, r); ctx.stroke() }
  ctx.globalAlpha = 1
}

/**
 * The ghost hand: a pale hand with a dark key line, its forefinger's tip at the frame's origin, coming in from the
 * lower right. Pressed, it sinks to the paper: a little smaller, its shadow drawn in under it.
 */
function hand(ctx: Ctx, press: number) {
  const tilt = -0.42, hover = 1 - press, dx = 2 + 7 * hover, dy = 3 + 9 * hover, c = Math.cos(tilt), s = Math.sin(tilt)
  ctx.rotate(tilt); ctx.scale(1 - 0.07 * press, 1 - 0.07 * press)
  const parts: [number, number, number, number, number][] = [[-19, 31, 14, 24, 7], [6.5, 16, 10, 20, 5], [16.5, 18, 10, 20, 5], [26.5, 22, 9.5, 18, 4.7], [-6, 0, 12, 36, 6], [-8, 27, 44, 36, 11]]
  cast(ctx, () => { ctx.beginPath(); for (const [x, y, w, h, r] of parts) ctx.roundRect(x, y, w, h, r) }, dx * c + dy * s, -dx * s + dy * c)
  for (const [x, y, w, h, r] of parts) { box(ctx, x, y, w, h, r); ink(ctx, '#fffaf0', 1.7, INK) }
  // The palm hides where the fingers join it; the forefinger's own two sides run on down into it.
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(-4.5, 24, 9, 8)
}

/** One piece in the hand, lifted: a little larger than it lies, with its shadow thrown well clear of it. */
function carriedPiece(ctx: Ctx, thing: 'log' | 'flask' | 'can' | 'marshmallow') {
  if (thing === 'log') { cast(ctx, () => box(ctx, -23, -4.6, 46, 9.2, 2), 7, 9); oneLog(ctx) }
  else if (thing === 'flask') { cast(ctx, () => { traceFlask(ctx); ctx.rect(-2.6, -21, 5.2, 5) }, 7, 9); oneFlask(ctx) }
  else if (thing === 'can') { cast(ctx, () => poly(ctx, [-11.5, -17, 5, -17, 11.5, -10.5, 11.5, 20, -11.5, 20]), 7, 9); oneCan(ctx) }
  else marshmallow(ctx, 3.5)
}

const sized = (board: Board) => board.w > 0 && board.h > 0 && board.u > 0

/**
 * Draws all the kit, above the night film: what lies in the camp, the sled's bed, the piles, rods and rows, the
 * ruler with what lies under it, the cursor, the cards, and last whatever of it is in the hand. The context
 * arrives scaled so that one unit is one pixel of the surface. Returns how many figures were drawn: a figure is
 * one thing placed, or one row of like pieces drawn as a single path.
 */
export function paintKit(ctx: Ctx, board: Board, frame: GameFrame, opts: { night: boolean }): number {
  if (!sized(board)) return 0
  const pen: Pen = { ctx, u: board.u, draws: 0 }, night = opts.night === true
  ctx.save()
  ctx.globalAlpha = 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  paintCamp(pen, board, frame, night)
  paintSled(pen, board, frame)
  paintSupplies(pen, board, frame, night)
  paintRuler(pen, board, frame)
  paintAsh(pen, board, frame)
  paintStrips(pen, board, frame, night)
  paintCursor(pen, board, frame, night)
  paintCards(pen, frame, false)
  // What the hand holds lies over the rest of the kit.
  for (const it of frame.lanterns) if (it.held) paintLantern(pen, it, night)
  paintCards(pen, frame, true)
  ctx.restore()
  return pen.draws
}

/**
 * Draws what lies over everything: the piece in the hand, the glow of the idle ladder and its ghost hand. A card or
 * a lantern in the hand is the frame's own card or lantern, held, and the kit has drawn it already. Returns how
 * many figures were drawn.
 */
export function paintTop(ctx: Ctx, board: Board, frame: GameFrame): number {
  if (!sized(board)) return 0
  const u = board.u, carried = frame.carried
  let draws = 0
  ctx.save()
  ctx.globalAlpha = 1
  if (carried && carried.thing !== 'card' && carried.thing !== 'lantern') {
    const thing = carried.thing
    at(ctx, carried.x, carried.y, u * (thing === 'marshmallow' ? 1.7 : 1.25), thing === 'log' ? -0.12 : 0, () => carriedPiece(ctx, thing))
    draws++
  }
  const halos = frame.halos ?? []
  if (frame.glow > 0 && halos.length > 0) {
    const glow = clamp01(frame.glow)
    for (const place of halos) if (place.r > 0) at(ctx, place.x, place.y, u, 0, () => halo(ctx, glow, place.r / u))
    draws++
  }
  const ghost = frame.hand
  if (ghost && ghost.opacity > 0) {
    ctx.globalAlpha = clamp01(ghost.opacity)
    at(ctx, ghost.x, ghost.y, u, 0, () => hand(ctx, clamp01(ghost.press)))
    ctx.globalAlpha = 1
    draws++
  }
  ctx.restore()
  return draws
}
