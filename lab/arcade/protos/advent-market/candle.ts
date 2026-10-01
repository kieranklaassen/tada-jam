// The candle-dipping stall: a pot of warm beeswax, a rack of wicks. Take a
// wick by its top, lower it into the wax, lift it out, carry it round to
// cool, dip again. Each station of the wick keeps its own thickness and its
// own warmth, so the candle that grows is the one the child's hand made:
// dipped deep or shallow, cooled or hurried, carried steady or swung.

import { clamp, damp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import {
  DYE,
  brush,
  candlelit,
  drawSnow,
  duskWindow,
  flame,
  flicker,
  garland,
  glow,
  grain,
  lazure,
  makeSnow,
  makeSprite,
  mix,
  mulberry,
  paperStar,
  planks,
  put,
  rgba,
  shade,
  smoothClosed,
} from './art.ts'
import type { G, Rgb, Sprite } from './art.ts'
import type { Made, Scene, World } from './shared.ts'

// Stations along the wick that can take wax, the length they span, and the
// bare wick above them where the fingers hold.
export const SEG = 20
export const WAX_LEN = 200
export const FREE = 30
const STEP = WAX_LEN / SEG
const LEN = FREE + WAX_LEN

export interface CandleShape {
  // Wax thickness at each station, top to bottom. 0 is bare wick.
  r: number[]
  // Sideways wander of each station: the candle's own lean.
  bend: number[]
  coats: number
  // 0 deep honey .. 1 pale: beeswax is never quite one colour.
  tint: number
  seed: number
}

export function newCandle(seed: number): CandleShape {
  const rng = mulberry(seed * 977 + 13)
  return {
    r: new Array<number>(SEG + 1).fill(0),
    bend: new Array<number>(SEG + 1).fill(0),
    coats: 0,
    tint: rng(),
    seed,
  }
}

// A candle someone else dipped, for the hall and the spiral.
export function readyCandle(seed: number, fat = 1, tall = 1): CandleShape {
  const c = newCandle(seed)
  const rng = mulberry(seed * 31 + 7)
  const top = Math.round(SEG * (1 - clamp(tall, 0.3, 1)))
  const lean = (rng() - 0.5) * 8
  for (let i = top; i <= SEG; i++) {
    const t = (i - top) / Math.max(1, SEG - top)
    c.r[i] = (5 + t * 7.5 + Math.sin(i * 1.7 + seed) * 0.5) * fat
    c.bend[i] = lean * t * t
  }
  c.coats = 9
  return c
}

const radius = (c: CandleShape, i: number): number => 1.2 + c.r[i]!

function topStation(c: CandleShape): number {
  for (let i = 0; i <= SEG; i++) if (c.r[i]! > 0.2) return i
  return -1
}

// Where the trimmed wick ends, in the candle's own frame (hold point at the
// origin, wick hanging down +y).
export function candleTip(c: CandleShape): [number, number] {
  const top = Math.max(0, topStation(c))
  return [c.bend[top]!, FREE + top * STEP - radius(c, top) * 2.3 - 14]
}

// Height of the candle standing on its foot, wick included.
export function candleHeight(c: CandleShape): number {
  return LEN - candleTip(c)[1]
}

const WAX_COOL: Rgb = [238, 178, 66]
const WAX_PALE: Rgb = [240, 198, 104]
const WAX_WARM: Rgb = [246, 150, 44]

export interface CandleDraw {
  // Warmth per station, for the wet shine of wax fresh from the pot.
  warm?: readonly number[]
  // Standing on a cut foot instead of hanging with its drip.
  flat?: boolean
  // The wick cut short above the wax.
  trim?: boolean
  // The loop at the top that hangs on a peg.
  loop?: boolean
}

// The candle in its own frame: hold point at the origin, hanging down +y.
export function drawCandle(g: G, c: CandleShape, o: CandleDraw = {}): void {
  const top = topStation(c)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = '#efe2c2'
  g.lineWidth = 2.4
  g.beginPath()
  if (o.trim && top >= 0) {
    const [tx, ty] = candleTip(c)
    g.moveTo(tx, ty)
    g.lineTo(tx, ty + 18)
  } else {
    g.moveTo(0, 0)
    g.lineTo(c.bend[0]!, FREE)
    for (let i = 1; i <= SEG; i++) g.lineTo(c.bend[i]!, FREE + i * STEP)
  }
  g.stroke()
  if (o.loop) {
    g.lineWidth = 2
    g.beginPath()
    g.ellipse(0, -5, 4, 6, 0, 0, TAU)
    g.stroke()
  }
  if (top < 0) return

  let maxR = 0
  let warmth = 0
  for (let i = top; i <= SEG; i++) {
    maxR = Math.max(maxR, radius(c, i))
    warmth += o.warm ? o.warm[i]! : 0
  }
  warmth /= SEG - top + 1
  const rb = radius(c, SEG)
  const xb = c.bend[SEG]!
  const yEnd = LEN
  const pts: [number, number][] = []
  const yTop = FREE + top * STEP
  const rt = radius(c, top)
  const xt = c.bend[top]!
  // The wax draws up the wick into a point.
  pts.push([xt, yTop - rt * 2.3 - 2])
  pts.push([xt - rt * 0.5, yTop - rt * 1.15])
  for (let i = top; i <= SEG; i++) pts.push([c.bend[i]! - radius(c, i), FREE + i * STEP])
  if (o.flat) {
    pts.push([xb - rb, yEnd + 8])
    pts.push([xb + rb, yEnd + 8])
  } else {
    const nub = Math.min(rb * 0.55, c.coats * 0.6)
    pts.push([xb - rb * 0.74, yEnd + rb * 0.6])
    pts.push([xb, yEnd + rb * 0.9 + nub])
    pts.push([xb + rb * 0.74, yEnd + rb * 0.6])
  }
  for (let i = SEG; i >= top; i--) pts.push([c.bend[i]! + radius(c, i), FREE + i * STEP])
  pts.push([xt + rt * 0.5, yTop - rt * 1.15])

  g.save()
  if (o.flat) {
    g.beginPath()
    g.rect(xb - maxR - 30, -40, maxR * 2 + 60, yEnd + 40)
    g.clip()
  }
  const base = mix(mix(WAX_COOL, WAX_PALE, c.tint * 0.6), WAX_WARM, warmth * 0.5)
  const grad = g.createLinearGradient(xb - maxR, 0, xb + maxR, 0)
  grad.addColorStop(0, rgba(shade(base, 0.76)))
  grad.addColorStop(0.24, rgba(shade(base, 1.36)))
  grad.addColorStop(0.58, rgba(base))
  grad.addColorStop(1, rgba(shade(base, 0.5)))
  smoothClosed(g, pts)
  g.fillStyle = grad
  g.fill()
  // The foot sits in its own shade.
  const foot = g.createLinearGradient(0, yEnd - 30, 0, yEnd + 12)
  foot.addColorStop(0, 'rgba(150,84,20,0)')
  foot.addColorStop(1, 'rgba(150,84,20,0.28)')
  g.fillStyle = foot
  g.fill()
  // The wet shine of wax that has just come out of the pot.
  if (o.warm && warmth > 0.03) {
    g.lineCap = 'butt'
    for (let i = top; i < SEG; i++) {
      const w = o.warm[i]!
      if (w < 0.05) continue
      const r0 = radius(c, i)
      const r1 = radius(c, i + 1)
      g.strokeStyle = `rgba(255,246,216,${0.6 * w})`
      g.lineWidth = Math.max(1.2, r0 * 0.24)
      g.beginPath()
      g.moveTo(c.bend[i]! - r0 * 0.42, FREE + i * STEP)
      g.lineTo(c.bend[i + 1]! - r1 * 0.42, FREE + (i + 1) * STEP + 0.6)
      g.stroke()
    }
    g.lineCap = 'round'
  }
  g.restore()
}

// A finished candle standing with the middle of its foot on (x, y).
export function drawStanding(g: G, c: CandleShape, x: number, y: number, scale: number, time: number, lit = 0): void {
  g.save()
  g.translate(x, y)
  g.scale(scale, scale)
  g.translate(-c.bend[SEG]!, -LEN)
  drawCandle(g, c, { flat: true, trim: true })
  if (lit > 0.01) {
    const [tx, ty] = candleTip(c)
    flame(g, tx, ty + 3, 30 * lit, flicker(time, c.seed))
  }
  g.restore()
}

export function candleMade(c: CandleShape, x: number, y: number): Made {
  return {
    kind: 'candle',
    from: 'candle',
    x,
    y,
    h: candleHeight(c),
    candle: c,
    draw(g, px, py, scale, time, lit = 0) {
      drawStanding(g, c, px, py, scale, time, lit)
    },
  }
}

// ---------------------------------------------------------------------------
// The stall.

const TABLE_Y = 470
const POT = { x: 366, rim: 428, rx: 150, ry: 40, surf: 440, srx: 137, sry: 32, bottom: 606 }
const PEGS = [694, 802, 910, 1018]
const RAIL_Y = 132
const PEG_Y = RAIL_Y + 14
// How low a candle's foot may come beside the pot: it rests on the table.
const TABLE_REST = 626

interface Dipper {
  shape: CandleShape
  peg: number
  warm: number[]
  under: boolean[]
  soak: number[]
  wasWarm: number[]
  x: number
  y: number
  ang: number
  angVel: number
  state: 'hang' | 'held' | 'home'
  // The lower end is down inside the pot's mouth.
  inPot: boolean
  // Any station is under the wax right now.
  wet: boolean
  // This dip has laid wax on at least one station.
  gained: boolean
  drip: number
  ox: number
  oy: number
  pointer: number
}

interface Drop {
  x: number
  y: number
  vy: number
  floor: number
  pot: boolean
}

interface Ripple {
  x: number
  age: number
  size: number
}

interface Spot {
  x: number
  y: number
  r: number
}

function paintBackdrop(g: G): void {
  const rng = mulberry(4107)
  // The wall.
  lazure(g, 0, 0, W, TABLE_Y + 4, DYE.wall, [hexish(236, 190, 140), hexish(214, 150, 110), hexish(226, 170, 120), hexish(200, 132, 104)], rng, 150)
  grain(g, 0, 0, W, TABLE_Y, 3600, rng, 0.03, 0.04)

  // The window, with the afternoon going blue outside.
  duskWindow(g, 64, 52, 250, 300, rng, 0.08)
  // Its sill.
  g.fillStyle = rgba(DYE.wood)
  g.beginPath()
  g.roundRect(46, 352, 286, 20, 4)
  g.fill()
  g.fillStyle = 'rgba(40,20,12,0.25)'
  g.fillRect(52, 372, 274, 7)
  // A stub of candle in a saucer on the sill; its flame is drawn live.
  g.fillStyle = '#8a5a3a'
  g.beginPath()
  g.ellipse(112, 351, 24, 6, 0, 0, TAU)
  g.fill()
  g.fillStyle = rgba(WAX_PALE)
  g.beginPath()
  g.roundRect(104, 318, 16, 33, 4)
  g.fill()

  // A fir swag along the top of the wall, with a ribbon and two paper stars.
  garland(g, 350, 26, 760, 30, 34, rng, 36)
  garland(g, 760, 30, 1200, 18, 38, rng, 36)
  for (const [bx, by] of [[350, 30], [760, 34]] as const) {
    g.fillStyle = rgba(DYE.madder)
    g.beginPath()
    g.ellipse(bx - 13, by, 14, 9, 0.4, 0, TAU)
    g.ellipse(bx + 13, by, 14, 9, -0.4, 0, TAU)
    g.fill()
    g.beginPath()
    g.moveTo(bx - 3, by + 4)
    g.lineTo(bx - 12, by + 40)
    g.lineTo(bx - 2, by + 34)
    g.moveTo(bx + 3, by + 4)
    g.lineTo(bx + 12, by + 40)
    g.lineTo(bx + 2, by + 34)
    g.fill()
    g.fillStyle = rgba(shade(DYE.madder, 0.75))
    g.beginPath()
    g.arc(bx, by, 6, 0, TAU)
    g.fill()
  }
  for (const [sx, sy, sr] of [[452, 112, 22], [1128, 96, 20]] as const) {
    g.strokeStyle = 'rgba(90,60,40,0.6)'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(sx, sy - sr - 44)
    g.lineTo(sx, sy - sr)
    g.stroke()
    paperStar(g, sx, sy, sr, hexish(238, 196, 96), hexish(214, 150, 70), 0.2)
  }

  // Two lanterns hang from the beam; their flames are drawn live.
  for (const lx of [546, 1134]) {
    g.strokeStyle = 'rgba(60,36,24,0.8)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(lx, 30)
    g.lineTo(lx, 150)
    g.stroke()
    lanternBody(g, lx, 196)
  }

  // The table.
  planks(g, 0, TABLE_Y, W, H - TABLE_Y, hexish(176, 120, 70), rng, 4)
  const edge = g.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 26)
  edge.addColorStop(0, 'rgba(50,24,12,0.42)')
  edge.addColorStop(1, 'rgba(50,24,12,0)')
  g.fillStyle = edge
  g.fillRect(0, TABLE_Y, W, 26)

  // A sheet of brown paper under the rack to catch the drips.
  g.fillStyle = '#d9bd8e'
  g.beginPath()
  g.moveTo(628, 572)
  g.lineTo(1104, 566)
  g.lineTo(1142, 716)
  g.lineTo(596, 722)
  g.closePath()
  g.fill()
  g.save()
  g.clip()
  brush(g, 590, 560, 560, 170, rng, 60, 0.1, 0.8, 80)
  // Drips from other people's candles, long dry.
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(236,188,96,${0.5 + rng() * 0.3})`
    g.beginPath()
    g.ellipse(650 + rng() * 440, 590 + rng() * 110, 3 + rng() * 5, 1.6 + rng() * 2.4, 0, 0, TAU)
    g.fill()
  }
  g.restore()

  // The rack: two uprights on feet and a rail with four pegs.
  for (const ux of [640, 1072]) {
    g.fillStyle = 'rgba(40,20,12,0.2)'
    g.beginPath()
    g.ellipse(ux + 6, 566, 46, 9, 0, 0, TAU)
    g.fill()
    planks(g, ux - 9, 96, 18, 466, hexish(150, 98, 56), rng, 1, true)
    g.fillStyle = rgba(DYE.woodDark)
    g.beginPath()
    g.roundRect(ux - 36, 552, 72, 14, 5)
    g.fill()
  }
  planks(g, 616, RAIL_Y - 9, 480, 18, hexish(164, 110, 62), rng, 1)
  g.fillStyle = 'rgba(40,20,12,0.22)'
  g.fillRect(616, RAIL_Y + 9, 480, 5)
  for (const px of PEGS) {
    g.fillStyle = rgba(DYE.woodDark)
    g.beginPath()
    g.arc(px, RAIL_Y + 1, 7, 0, TAU)
    g.fill()
    g.fillStyle = rgba(DYE.woodLight)
    g.beginPath()
    g.arc(px - 1, RAIL_Y, 5, 0, TAU)
    g.fill()
  }

  // The pot on its iron stand, with a small burner beneath.
  g.fillStyle = 'rgba(30,14,10,0.3)'
  g.beginPath()
  g.ellipse(POT.x + 10, 652, 170, 24, 0, 0, TAU)
  g.fill()
  g.strokeStyle = '#2c2422'
  g.lineWidth = 9
  g.beginPath()
  for (const lx of [-104, 104]) {
    g.moveTo(POT.x + lx, POT.bottom - 8)
    g.lineTo(POT.x + lx * 1.12, 654)
  }
  g.moveTo(POT.x - 110, POT.bottom + 2)
  g.lineTo(POT.x + 110, POT.bottom + 2)
  g.stroke()
  // The burner: a squat clay dish.
  g.fillStyle = '#7d4a34'
  g.beginPath()
  g.ellipse(POT.x, 652, 34, 9, 0, 0, TAU)
  g.fill()
  // The pot's body: old copper, darker to the right, wax run down its side.
  const body = () => {
    g.beginPath()
    g.moveTo(POT.x - POT.rx, POT.rim)
    g.bezierCurveTo(POT.x - POT.rx - 4, POT.rim + 90, POT.x - POT.rx + 14, POT.bottom - 6, POT.x - POT.rx + 34, POT.bottom)
    g.quadraticCurveTo(POT.x, POT.bottom + 16, POT.x + POT.rx - 34, POT.bottom)
    g.bezierCurveTo(POT.x + POT.rx - 14, POT.bottom - 6, POT.x + POT.rx + 4, POT.rim + 90, POT.x + POT.rx, POT.rim)
    g.ellipse(POT.x, POT.rim, POT.rx, POT.ry, 0, 0, Math.PI, false)
    g.closePath()
  }
  // The inside of the far wall.
  g.fillStyle = '#5a3526'
  g.beginPath()
  g.ellipse(POT.x, POT.rim, POT.rx, POT.ry, 0, 0, TAU)
  g.fill()
  body()
  const copper = g.createLinearGradient(POT.x - POT.rx, 0, POT.x + POT.rx, 0)
  copper.addColorStop(0, '#8a5236')
  copper.addColorStop(0.22, '#bd7a4c')
  copper.addColorStop(0.5, '#a5643e')
  copper.addColorStop(1, '#5e3524')
  g.fillStyle = copper
  g.fill()
  g.save()
  g.clip()
  brush(g, POT.x - POT.rx, POT.rim, POT.rx * 2, 200, rng, 90, Math.PI / 2, 1, 50)
  // Firelight from below.
  const under = g.createLinearGradient(0, POT.bottom - 60, 0, POT.bottom + 10)
  under.addColorStop(0, 'rgba(255,170,80,0)')
  under.addColorStop(1, 'rgba(255,170,80,0.3)')
  g.fillStyle = under
  g.fillRect(POT.x - POT.rx, POT.bottom - 60, POT.rx * 2, 80)
  // Old runs of wax down the front.
  for (const [dx, len, wd] of [[-78, 70, 9], [-52, 38, 6], [36, 92, 10], [70, 46, 7], [104, 30, 5]] as const) {
    const y0 = POT.rim + Math.sqrt(Math.max(0, 1 - (dx / POT.rx) ** 2)) * POT.ry - 2
    g.strokeStyle = 'rgba(238,186,84,0.9)'
    g.lineWidth = wd
    g.beginPath()
    g.moveTo(POT.x + dx, y0)
    g.lineTo(POT.x + dx + 1, y0 + len)
    g.stroke()
    g.fillStyle = 'rgba(238,186,84,0.9)'
    g.beginPath()
    g.arc(POT.x + dx + 1, y0 + len + 2, wd * 0.7, 0, TAU)
    g.fill()
  }
  g.restore()
  // Handles.
  g.strokeStyle = '#4a2a1e'
  g.lineWidth = 8
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(POT.x + side * (POT.rx + 2), POT.rim + 56, 20, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, side < 0 ? Math.PI * 1.5 : Math.PI * 0.5)
    g.stroke()
  }
  // The rim.
  g.strokeStyle = '#c98a58'
  g.lineWidth = 6
  g.beginPath()
  g.ellipse(POT.x, POT.rim, POT.rx, POT.ry, 0, 0, TAU)
  g.stroke()
  g.strokeStyle = 'rgba(255,226,170,0.4)'
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(POT.x, POT.rim - 2, POT.rx - 2, POT.ry, 0, Math.PI * 1.1, Math.PI * 1.9)
  g.stroke()

  // A cake of beeswax and a honeycomb sheet, waiting to be melted.
  g.fillStyle = 'rgba(30,14,10,0.22)'
  g.beginPath()
  g.ellipse(620, 508, 60, 10, 0, 0, TAU)
  g.fill()
  g.fillStyle = rgba(shade(WAX_COOL, 0.86))
  g.beginPath()
  g.roundRect(566, 476, 96, 30, 7)
  g.fill()
  g.fillStyle = rgba(shade(WAX_PALE, 1.06))
  g.beginPath()
  g.roundRect(566, 468, 96, 22, 7)
  g.fill()
  g.fillStyle = rgba(shade(WAX_COOL, 0.95))
  g.beginPath()
  g.roundRect(590, 452, 70, 20, 6)
  g.fill()
  g.fillStyle = rgba(shade(WAX_PALE, 1.1))
  g.beginPath()
  g.roundRect(590, 446, 70, 15, 6)
  g.fill()

  // Candlelight: a dusky veil, lifted round the wax and each flame.
  candlelit(
    g,
    W,
    H,
    [
      { x: POT.x, y: POT.surf - 30, r: 430 },
      { x: 546, y: 200, r: 330 },
      { x: 1134, y: 200, r: 360 },
      { x: 112, y: 300, r: 230, lift: 0.8 },
      { x: POT.x, y: 650, r: 190, lift: 0.8 },
      { x: 860, y: 420, r: 420, lift: 0.75 },
    ],
    'rgba(58,26,44,0.5)',
    0.13,
  )
  grain(g, 0, 0, W, H, 2600, rng, 0.03, 0.03)
}

function hexish(r: number, g: number, b: number): Rgb {
  return [r, g, b]
}

// A small tin lantern with glass sides, centred on (x, y).
export function lanternBody(g: G, x: number, y: number, s = 1): void {
  g.fillStyle = '#3a2a24'
  g.beginPath()
  g.moveTo(x - 20 * s, y - 34 * s)
  g.lineTo(x, y - 52 * s)
  g.lineTo(x + 20 * s, y - 34 * s)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255,214,140,0.5)'
  g.fillRect(x - 17 * s, y - 34 * s, 34 * s, 60 * s)
  g.strokeStyle = '#3a2a24'
  g.lineWidth = 4 * s
  g.strokeRect(x - 17 * s, y - 34 * s, 34 * s, 60 * s)
  g.fillStyle = '#3a2a24'
  g.fillRect(x - 21 * s, y + 24 * s, 42 * s, 7 * s)
  g.fillStyle = rgba(WAX_PALE)
  g.fillRect(x - 5 * s, y + 6 * s, 10 * s, 18 * s)
}

export function createCandleStall(world: World): Scene {
  const { stage, snd } = world
  let backdrop: Sprite | null = null
  const snow = makeSnow(64, 52, 250, 300, 26, mulberry(88))
  let dippers: Dipper[] = []
  const drops: Drop[] = []
  const ripples: Ripple[] = []
  let spots: Spot[] = []
  let idle = 0
  let nudgeAt = 0
  let touched = false

  const fresh = (): void => {
    dippers = PEGS.map((px, i) => ({
      shape: newCandle(world.visit.n * 10 + i + 1),
      peg: i,
      warm: new Array<number>(SEG + 1).fill(0),
      under: new Array<boolean>(SEG + 1).fill(false),
      soak: new Array<number>(SEG + 1).fill(0),
      wasWarm: new Array<number>(SEG + 1).fill(0),
      x: px,
      y: PEG_Y,
      ang: 0,
      angVel: 0,
      state: 'hang' as const,
      inPot: false,
      wet: false,
      gained: false,
      drip: 0,
      ox: 0,
      oy: 0,
      pointer: -1,
    }))
    drops.length = 0
    ripples.length = 0
    spots = []
    touched = false
  }
  fresh()

  const ripple = (x: number, size = 1): void => {
    if (ripples.length > 14) ripples.shift()
    ripples.push({ x: clamp(x, POT.x - POT.srx + 16, POT.x + POT.srx - 16), age: 0, size })
  }

  // How low the foot of a candle may come when its hold point is at x.
  const floorAt = (x: number): number => {
    const d = Math.abs(x - POT.x)
    if (d < POT.srx - 14) return POT.surf + WAX_LEN + 4
    if (d < POT.rx + 16) return POT.rim - 6
    return TABLE_REST
  }

  // A wax coat for station i that went under at warmth `was` and stayed `soak`.
  const coat = (d: Dipper, i: number): number => {
    if (d.soak[i]! < 0.08) return 0
    const soak = clamp(d.soak[i]! / 0.22, 0.35, 1)
    const taper = 0.56 + 0.6 * (i / SEG)
    const lump = 0.86 + 0.28 * (0.5 + 0.5 * Math.sin(i * 1.9 + d.shape.seed * 3.1 + d.shape.coats * 1.3))
    const room = Math.max(0, 1 - d.shape.r[i]! / 30)
    return 2.6 * (1 - 0.8 * d.wasWarm[i]!) * soak * taper * lump * room
  }

  const stepDipper = (d: Dipper, dt: number): void => {
    const px = d.x
    const py = d.y
    let tx = PEGS[d.peg]!
    let ty = PEG_Y
    let rate = 5
    if (d.state === 'held') {
      const p = stage.pointers.get(d.pointer)
      if (!p || !p.down) {
        d.state = 'home'
      } else {
        d.ox = damp(d.ox, 0, 9, dt)
        d.oy = damp(d.oy, -56, 9, dt)
        tx = p.x + d.ox
        ty = p.y + d.oy
        rate = d.wet ? 10 : 26
      }
    }
    if (d.state !== 'hang') {
      // While the foot is below the rim it cannot pass through the pot's wall.
      const footY = d.y + LEN
      if (footY > POT.rim - 6) {
        const off = d.x - POT.x
        if (Math.abs(off) < POT.srx - 14) tx = clamp(tx, POT.x - POT.srx + 16, POT.x + POT.srx - 16)
        else if (off < 0) tx = Math.min(tx, POT.x - POT.rx - 18)
        else tx = Math.max(tx, POT.x + POT.rx + 18)
      }
      tx = clamp(tx, 30, W - 30)
      ty = clamp(ty, 40, H)
      d.x = damp(d.x, tx, rate, dt)
      d.y = damp(d.y, ty, rate, dt)
      d.y = Math.min(d.y, floorAt(d.x) - LEN)
      if (d.state === 'home' && Math.abs(d.x - tx) < 2.5 && Math.abs(d.y - ty) < 2.5) {
        d.state = 'hang'
        d.x = tx
        d.y = ty
        snd.wood(0.7)
      }
    }
    d.inPot = Math.abs(d.x - POT.x) < POT.srx - 12 && d.y + LEN > POT.rim

    // The swing: the foot lags behind the hand and follows through.
    const vx = (d.x - px) / Math.max(dt, 1e-4)
    const lag = clamp(vx * 0.0007, -0.42, 0.42)
    const k = d.wet ? 70 : 30
    const c = d.wet ? 15 : 2.6
    d.angVel += (k * ((d.wet ? lag * 0.25 : lag) - d.ang) - c * d.angVel) * dt
    d.ang += d.angVel * dt

    // Which stations are under the wax, and what each one gains as it leaves.
    const moved = Math.hypot(d.x - px, d.y - py)
    const cosA = Math.cos(d.ang)
    let anyUnder = false
    for (let i = 0; i <= SEG; i++) {
      const wy = d.y + cosA * (FREE + i * STEP)
      const under = d.inPot && wy > POT.surf
      if (under && !d.under[i]) {
        d.wasWarm[i] = d.warm[i]!
        d.soak[i] = 0
      }
      if (under) d.soak[i]! += dt
      if (!under && d.under[i]) {
        const add = coat(d, i)
        if (add > 0) {
          d.shape.r[i]! += add
          d.gained = true
        }
        d.warm[i] = 1
      }
      d.under[i] = under
      if (under) anyUnder = true
      else d.warm[i] = Math.max(0, d.warm[i]! - d.warm[i]! * (dt / 3.2 + moved / 620))
    }
    if (anyUnder && !d.wet) {
      snd.bloop()
      ripple(d.x, 1)
    }
    if (!anyUnder && d.wet) {
      // Clear of the wax: one more coat on this candle.
      if (d.gained) d.shape.coats++
      d.gained = false
      stage.sfx.tone({ freq: 170, to: 250, dur: 0.16, type: 'sine', vol: 0.06 })
      ripple(d.x, 0.8)
    }
    if (anyUnder && Math.abs(d.x - px) + Math.abs(d.y - py) > 1.4 && Math.random() < dt * 5) ripple(d.x, 0.45)
    d.wet = anyUnder

    // Warm wax leans a little the way it is swung, and keeps the lean.
    const tipWarm = d.warm[SEG]!
    if (!anyUnder && tipWarm > 0.3 && Math.abs(d.ang) > 0.05) {
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG
        d.shape.bend[i] = clamp(d.shape.bend[i]! - Math.sin(d.ang) * t * t * 9 * d.warm[i]! * dt, -7 * t, 7 * t)
      }
    }

    // Drips from the foot while it is still runny.
    if (!anyUnder && tipWarm > 0.2 && d.shape.r[SEG]! > 0) {
      d.drip += dt * 3.4 * tipWarm ** 1.6
      if (d.drip >= 1) {
        d.drip = 0
        const footX = d.x - Math.sin(d.ang) * LEN + d.shape.bend[SEG]!
        const footY = d.y + cosA * LEN + radius(d.shape, SEG)
        const off = Math.abs(footX - POT.x)
        const pot = off < POT.srx - 4
        if (pot || off > POT.rx + 6) {
          drops.push({ x: footX, y: footY, vy: 30, pot, floor: pot ? POT.surf + 2 : Math.max(footY + 40, 628 + ((footX * 7.3) % 64)) })
        }
      }
    }
  }

  const hit = (x: number, y: number): Dipper | null => {
    let best: Dipper | null = null
    let bestD = 62
    for (const d of dippers) {
      if (d.state === 'held') continue
      if (y < d.y - 60 || y > d.y + LEN + 46) continue
      const mid = d.x - Math.sin(d.ang) * clamp(y - d.y, 0, LEN)
      const dx = Math.abs(x - mid)
      if (dx < bestD) {
        bestD = dx
        best = d
      }
    }
    return best
  }

  const drawDipper = (g: G, d: Dipper): void => {
    g.save()
    if (d.inPot) {
      g.beginPath()
      g.rect(0, 0, W, POT.surf)
      g.clip()
    }
    g.translate(d.x, d.y)
    g.rotate(d.ang)
    drawCandle(g, d.shape, { warm: d.warm, loop: true })
    g.restore()
  }

  return {
    enter() {
      if (!backdrop) backdrop = makeSprite(W, H, world.bg, paintBackdrop)
      idle = 0
    },
    reset: fresh,
    made() {
      return dippers.filter((d) => d.shape.r[SEG]! > 0).map((d) => candleMade(d.shape, d.x, d.y + LEN * 0.6))
    },
    update(dt) {
      idle += dt
      for (const d of dippers) stepDipper(d, dt)
      for (let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i]!
        drop.vy += 900 * dt
        drop.y += drop.vy * dt
        if (drop.y < drop.floor) continue
        drops.splice(i, 1)
        snd.plip()
        if (drop.pot) ripple(drop.x, 0.35)
        else {
          if (spots.length > 70) spots.shift()
          spots.push({ x: drop.x, y: drop.floor, r: 3 + Math.random() * 3 })
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]!
        r.age += dt
        if (r.age > 1.6) ripples.splice(i, 1)
      }
      // The invitation, before the first dip: a wick stirs on its peg.
      if (!touched && idle > 5 && stage.time > nudgeAt) {
        nudgeAt = stage.time + 4.5
        const first = dippers[0]
        if (first && first.state === 'hang') first.angVel += 0.9
      }
    },
    draw(g) {
      const t = stage.time
      if (backdrop) put(g, backdrop, 0, 0)
      drawSnow(g, snow, t)

      // The living flames and their halos.
      glow(g, world.halo, 112, 306, 70 + flicker(t, 1) * 8, 0.8)
      flame(g, 112, 318, 20, flicker(t, 1))
      for (const [lx, seed] of [[546, 2], [1134, 3]] as const) {
        glow(g, world.halo, lx, 196, 96 + flicker(t, seed) * 10, 0.9)
        flame(g, lx, 204, 22, flicker(t, seed))
      }
      glow(g, world.halo, POT.x, 640, 50 + flicker(t, 4) * 6, 0.9)
      flame(g, POT.x, 648, 24, flicker(t, 4))

      // The wax: warm, thick, slow.
      g.save()
      g.beginPath()
      g.ellipse(POT.x, POT.surf, POT.srx, POT.sry, 0, 0, TAU)
      g.clip()
      const wax = g.createRadialGradient(POT.x - 36, POT.surf - 6, 6, POT.x, POT.surf, POT.srx)
      wax.addColorStop(0, '#ffdf86')
      wax.addColorStop(0.45, '#f6bd4c')
      wax.addColorStop(1, '#cf8a28')
      g.fillStyle = wax
      g.fillRect(POT.x - POT.srx, POT.surf - POT.sry, POT.srx * 2, POT.sry * 2)
      for (let i = 0; i < 3; i++) {
        const a = t * (0.11 + i * 0.04) + i * 2.1
        g.fillStyle = `rgba(255,240,180,${0.2 - i * 0.04})`
        g.beginPath()
        g.ellipse(POT.x + Math.cos(a) * 62, POT.surf + Math.sin(a) * 12, 44 - i * 8, 7 - i, a * 0.2, 0, TAU)
        g.fill()
      }
      // A glint that crosses the wax now and then.
      const sweep = (t * 0.16) % 1
      g.fillStyle = `rgba(255,250,220,${0.3 * Math.sin(sweep * Math.PI)})`
      g.beginPath()
      g.ellipse(POT.x - POT.srx + sweep * POT.srx * 2, POT.surf - 10, 30, 4, -0.1, 0, TAU)
      g.fill()
      // The shadow of the near rim.
      g.strokeStyle = 'rgba(120,60,20,0.35)'
      g.lineWidth = 10
      g.beginPath()
      g.ellipse(POT.x, POT.surf - 6, POT.srx, POT.sry, 0, Math.PI * 1.05, Math.PI * 1.95)
      g.stroke()
      for (const r of ripples) {
        const k = r.age / 1.6
        const rx = (12 + k * 78) * r.size
        g.strokeStyle = `rgba(255,244,200,${0.6 * (1 - k)})`
        g.lineWidth = 3 * (1 - k) + 1
        g.beginPath()
        g.ellipse(r.x, POT.surf, rx, rx * 0.24, 0, 0, TAU)
        g.stroke()
        g.strokeStyle = `rgba(150,84,20,${0.3 * (1 - k)})`
        g.lineWidth = 1.5
        g.beginPath()
        g.ellipse(r.x, POT.surf + 2, rx + 3, rx * 0.24 + 1, 0, 0, TAU)
        g.stroke()
      }
      g.restore()
      // Warm light rising off the wax.
      glow(g, world.halo, POT.x, POT.surf - 18, 190, 0.3 + 0.03 * Math.sin(t * 1.3))

      // Wax fallen on the table and the paper.
      g.fillStyle = 'rgba(240,196,104,0.92)'
      for (const s of spots) {
        g.beginPath()
        g.ellipse(s.x, s.y, s.r, s.r * 0.5, 0, 0, TAU)
        g.fill()
      }

      for (const d of dippers) if (d.state !== 'held') drawDipper(g, d)
      for (const d of dippers) if (d.state === 'held') drawDipper(g, d)
      // Where a candle stands in the wax, the wax climbs it a little.
      for (const d of dippers) {
        if (!d.inPot || d.y + LEN < POT.surf) continue
        let cut = 0
        for (let i = 0; i <= SEG; i++) if (d.y + FREE + i * STEP <= POT.surf) cut = i
        const r = radius(d.shape, Math.min(SEG, cut + 1)) + 5
        g.strokeStyle = 'rgba(255,240,186,0.85)'
        g.lineWidth = 2.5
        g.beginPath()
        g.ellipse(d.x - Math.sin(d.ang) * (POT.surf - d.y), POT.surf, r, r * 0.3 + 1, 0, 0, Math.PI)
        g.stroke()
      }

      g.fillStyle = '#f3b848'
      for (const drop of drops) {
        g.beginPath()
        g.moveTo(drop.x, drop.y - 7)
        g.quadraticCurveTo(drop.x + 4, drop.y, drop.x, drop.y + 3)
        g.quadraticCurveTo(drop.x - 4, drop.y, drop.x, drop.y - 7)
        g.fill()
      }
    },
    down(p: Pointer) {
      idle = 0
      const d = hit(p.x, p.y)
      if (d) {
        touched = true
        d.state = 'held'
        d.pointer = p.id
        d.ox = d.x - p.x
        d.oy = d.y - p.y
        d.angVel += (p.x - d.x) * 0.004
        snd.wood(0.6)
        return
      }
      const ex = (p.x - POT.x) / POT.srx
      const ey = (p.y - POT.surf) / POT.sry
      if (ex * ex + ey * ey < 1.1) {
        ripple(p.x, 0.9)
        snd.bloop(0.6)
        return
      }
      world.quiet(p.x, p.y)
    },
    up(p: Pointer) {
      for (const d of dippers) {
        if (d.state === 'held' && d.pointer === p.id) {
          d.state = 'home'
          d.pointer = -1
        }
      }
    },
  }
}
