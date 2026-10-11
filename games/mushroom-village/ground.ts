import type { Point } from './input'
import { STAGE } from './stage'

// Where things are in the glade, in stage units: the moss a mushroom can stand
// in, its three grounds, the stream and its pond, the log the gnomes wait on,
// the sun and the snail. Pure numbers: the model asks what lies under a
// finger, and the painter paints the same shapes, so what is seen is what
// answers.

/** What a mushroom is comes from the ground its foot stands in. */
export type Kind = 'red' | 'bell' | 'puff'

/** A mushroom's foot stands between these two lines. Behind the gnomes on their log the lower line lies higher: `mossBottom`. */
export const MOSS = { top: 345, bottom: 560, left: 26, right: STAGE.width - 26 } as const

/** The tallest a mushroom gets and the farthest one reaches to a side of its foot (a full bell, hanging over), in round numbers a little over what shapes.ts gives: what the sun must stay clear of. */
const TALLEST = { height: 236, half: 100 } as const

/** How far to each side of the sun's middle its top shows above the hill at night. */
const SUN_TOP_HALF = 50

/**
 * The jam's round home control (48 px across at the top centre, 10 px from the top, with a finger's slack round
 * it) as it lies over the stage on the smallest surface the game's tests name, a phone on its side, where the
 * stage is fitted smallest and the control reaches farthest into it: to this far each side of the middle, and
 * this far down. On every larger surface it reaches less far.
 */
export const HOME_REACH = { x: STAGE.width / 2, half: 72, down: 146 } as const
/** How far a mushroom's touch shape reaches above its foot and to a side of it at the most: a little over what shapes.ts gives. */
const BODY_MOST = { up: 244, half: 108 } as const

/**
 * The highest a foot can stand at `x`: lower under the sun, by just as much as keeps the tallest mushroom's cap
 * out of its rays by day, and off the top of it where it sleeps behind the hill at night.
 */
export function mossTop(x: number): number {
  const reach = SUN.r * 1.8 + 2, dx = Math.max(0, Math.abs(x - SUN.x) - TALLEST.half)
  let top: number = MOSS.top
  if (dx < reach) top = Math.max(top, Math.ceil(SUN.y + TALLEST.height + Math.sqrt(reach * reach - dx * dx)))
  if (dx < SUN_TOP_HALF) top = Math.max(top, 500)
  // Under the home control the band's upper edge lies lower too: no mushroom, however tall, grows up under it.
  if (Math.abs(x - HOME_REACH.x) < HOME_REACH.half + BODY_MOST.half) top = Math.max(top, HOME_REACH.down + BODY_MOST.up)
  return top
}

/** The lowest a foot can stand at `x`: above the heads of the gnomes where they sit, so nothing grows behind one, and above the door cart. */
export function mossBottom(x: number): number {
  if (x <= LOG.right + 40) return 505
  // At the right edge the band ends higher, so that the cart's place is clear of every foot and of every stem beside it.
  return x >= CART.left - 42 ? CART.top - 16 : MOSS.bottom
}

/** The top edge of the green: a wobbly line with a hill under the sun. */
export function skyline(x: number): number {
  return 292 - 34 * Math.exp(-(((x - SUN.x) / 210) ** 2)) + 7 * Math.sin(x / 120 + 1)
}

// ---------------------------------------------------------------- the stream

/** The stream runs from the skyline down to its pond as one curve; these are its four control points. */
const COURSE = [
  [684, 280],
  [770, 400],
  [590, 470],
  [790, 700],
] as const

export type StreamPoint = { x: number; y: number; /** Half the width of the water here. */ half: number }

const SAMPLES = 48

/** The middle of the stream, from the skyline to the pond. */
export const STREAM: readonly StreamPoint[] = Array.from({ length: SAMPLES + 1 }, (_, i) => {
  const t = i / SAMPLES, u = 1 - t
  const at = (axis: 0 | 1) => u * u * u * COURSE[0][axis] + 3 * u * u * t * COURSE[1][axis] + 3 * u * t * t * COURSE[2][axis] + t * t * t * COURSE[3][axis]
  return { x: at(0), y: at(1), half: 15 + 23 * t }
})

/** The pond the stream ends in, at the bottom edge between the log and the snail. */
export const POND = { x: 806, y: 742, rx: 104, ry: 62 } as const

/** How far a point lies outside the water: negative in it, and by how much. `along` is 0 at the skyline and 1 at the pond. */
export function waterAt(x: number, y: number): { out: number; along: number } {
  let out = Infinity, along = 0
  for (let i = 0; i < STREAM.length; i++) {
    const s = STREAM[i]
    const d = Math.hypot(s.x - x, s.y - y) - s.half
    if (d < out) { out = d; along = i / SAMPLES }
  }
  // The pond, as the distance to an ellipse measured along the line to its middle.
  const dx = (x - POND.x) / POND.rx, dy = (y - POND.y) / POND.ry
  const r = Math.hypot(dx, dy)
  const pond = (r - 1) * Math.min(POND.rx, POND.ry)
  if (pond < out) { out = pond; along = 1 }
  return { out, along }
}

export function inWater(x: number, y: number): boolean {
  return waterAt(x, y).out < 0
}

// ---------------------------------------------------------------- the grounds

/** The wet bank reaches this far from the water's edge. */
export const BANK = 62
/** A bell stands only this near the water: well inside the bank as it is painted, whose edge wanders. */
export const BELL_BANK = BANK - 14
/** The shade under the big tree, as an ellipse. */
export const SHADE = { x: 196, y: 462, rx: 276, ry: 150 } as const

export function inShade(x: number, y: number): boolean {
  return ((x - SHADE.x) / SHADE.rx) ** 2 + ((y - SHADE.y) / SHADE.ry) ** 2 < 1
}

/** The kind of ground at a point of the moss: the bank wins over the shade, and everything else lies in the sun. */
export function kindAt(x: number, y: number): Kind {
  if (waterAt(x, y).out < BELL_BANK) return 'bell'
  if (inShade(x, y)) return 'puff'
  return 'red'
}

// ---------------------------------------------------------------- who stands where

export type GnomeId = 'tall' | 'baker' | 'sleepy' | 'sneezy'
export const GNOMES: readonly GnomeId[] = ['tall', 'sleepy', 'sneezy', 'baker']

/** The log the gnomes wait on, along the bottom edge. */
export const LOG = { left: 14, right: 706, seat: 752 } as const

/** The gnomes are painted this much larger than their parts are drawn: they are the largest things in the frame. */
export const GNOME_SCALE = 1.3

/** Where each gnome sits: the middle of his seat. `top` is where the tip of his hat reaches at rest, and `half` is half his width. */
export const SEATS: Readonly<Record<GnomeId, { x: number; y: number; top: number; half: number }>> = {
  tall: { x: 98, y: LOG.seat, top: 302, half: 58 },
  sleepy: { x: 262, y: LOG.seat, top: 474, half: 78 },
  sneezy: { x: 420, y: LOG.seat, top: 456, half: 70 },
  baker: { x: 606, y: LOG.seat, top: 479, half: 84 },
}

/** The sun stands over the hill, clear of the grown-up's corner. */
export const SUN = { x: 968, y: 132, r: 56 } as const
/** The snail, in the bottom right corner. */
export const SNAIL = { x: 1070, y: 742, r: 62 } as const
/**
 * The snail's lamp at night: a lantern on a crook that stands on the stone behind the snail, its foot at this
 * point and the lantern hanging in towards the shell. The box it is painted in lies below the cart and clear of it.
 */
export const LAMP = { x: 1158, y: 776, left: 44, right: 22, up: 64 } as const

/** Where the sun rests at night: behind the hill, with its top in sight. */
export const SUN_DOWN_Y = 290

/** The door cart, at the right edge below where a foot can stand and above the snail: the box it is drawn in and touched in. */
export const CART = { x: 1094, y: 632, left: 1034, right: 1154, top: 556, bottom: 652 } as const

/** The jam's round home control lies over the top centre; nothing that a child aims at rests under it. */
export const HOME_CONTROL = { x: STAGE.width / 2, y: 34, r: 24 } as const

// ---------------------------------------------------------------- pebbles

/** A path that has a pebble here has reached the log: the strip behind the gnomes' heads and down to their seat. */
export function atLog(x: number, y: number): boolean {
  return y >= 500 && y <= 700 && x >= MOSS.left && x <= LOG.right + 44
}

/**
 * Where each gnome steps off the log onto the moss, and so where a path drawn from him begins: at his feet, in
 * the gap beside him where the moss shows between him and his neighbour, never behind his head or his hat. Each
 * is a point of the pebbles' grid, and no two are the same.
 */
const STEP_OFF: Readonly<Record<GnomeId, Point>> = { tall: { x: 160, y: 600 }, sleepy: { x: 340, y: 620 }, sneezy: { x: 500, y: 660 }, baker: { x: 520, y: 640 } }

export function stepOff(who: GnomeId): Point {
  return { ...STEP_OFF[who] }
}

/**
 * Where the idle hand comes down on a gnome to show a path drawn from him: on his chest, well below his hat, so
 * that the move to any doorstep, even one right behind his hat, is a move a child can see and copy.
 */
export function handOn(who: GnomeId): Point {
  return { x: SEATS[who].x, y: 610 }
}

export function onCart(x: number, y: number): boolean {
  return x >= CART.left && x <= CART.right && y >= CART.top && y <= CART.bottom
}

export function onSnail(x: number, y: number): boolean {
  return Math.hypot(x - SNAIL.x, (y - SNAIL.y) * 1.1) <= SNAIL.r + 26
}

/** Whether a pebble may lie at a point: on the green or in the water, below the far trees and above the log, and never under the cart or the snail. */
export function pebbleMay(x: number, y: number): boolean {
  if (x < MOSS.left || x > MOSS.right || y > 700 || y < skyline(x) + 24) return false
  if (x >= CART.left - 14 && x <= CART.right + 14 && y >= CART.top - 14) return false
  return !onSnail(x, y)
}

// ---------------------------------------------------------------- what a finger meets

export type Under =
  | { what: 'gnome'; who: GnomeId }
  | { what: 'sun' }
  | { what: 'snail' }
  | { what: 'cart' }
  | { what: 'water'; along: number }
  | { what: 'moss'; kind: Kind }
  | { what: 'log' }
  | { what: 'leaves' }

/** Half the width of a gnome's head and hat, above his shoulders. */
export const HEAD_HALF = 46
/** Where the brim of a gnome's hat ends, above his seat: the brim and all above it is his hat, what is below it is he. */
export const BROW_UP = 172

/**
 * The shape each hat is touched in, which covers its paint: one or two pieces, each from `up` units above the
 * hat's tip line (negative is below it) down to the brim's lower edge, with its left and right edge from the
 * seat's middle at its top and at its foot. A pointed hat narrows to a finger's width at its bent tip; the baker's
 * hat is as wide as its three puffs all the way up; the sleepy one's nightcap has a second piece for the end that
 * has fallen over to one side and the tassel on it.
 */
type HatPiece = { from: number; top: readonly [number, number]; foot: readonly [number, number] }
export const HATS: Readonly<Record<GnomeId, readonly HatPiece[]>> = {
  tall: [{ from: 8, top: [-11, 47], foot: [-58, 58] }],
  sneezy: [{ from: 8, top: [-23, 35], foot: [-58, 58] }],
  baker: [{ from: 8, top: [-68, 68], foot: [-68, 68] }],
  sleepy: [{ from: 8, top: [-62, 62], foot: [-62, 62] }, { from: -34, top: [56, 112], foot: [56, 112] }],
}

/**
 * A gnome is touched in two shapes, each its own: his hat, from its tip down to the lower edge of its brim, and
 * his body, from under the brim down past his seat. A touch that begins on the hat is the hat's, and one that
 * begins on his body is his.
 */
export function onHat(who: GnomeId, x: number, y: number): boolean {
  const seat = SEATS[who], foot = seat.y - BROW_UP
  if (y >= foot) return false
  for (const piece of HATS[who]) {
    const top = seat.top - piece.from
    if (y < top) continue
    const p = (y - top) / (foot - top), left = piece.top[0] + (piece.foot[0] - piece.top[0]) * p, right = piece.top[1] + (piece.foot[1] - piece.top[1]) * p
    if (x - seat.x >= left && x - seat.x <= right) return true
  }
  return false
}

export function onBody(who: GnomeId, x: number, y: number): boolean {
  const seat = SEATS[who]
  return y >= seat.y - BROW_UP && y <= seat.y + 40 && Math.abs(x - seat.x) <= seat.half
}

/** Whether a point is on a gnome: his hat or his body. */
export function onGnome(who: GnomeId, x: number, y: number): boolean {
  return onHat(who, x, y) || onBody(who, x, y)
}

/** The ground under a point, with nobody and nothing standing on it: water, the log, the leaves and sky, or moss. */
export function groundAt(x: number, y: number): Extract<Under, { what: 'water' | 'log' | 'leaves' | 'moss' }> {
  const water = waterAt(x, y)
  if (water.out < 0 && y > skyline(x)) return { what: 'water', along: water.along }
  if (y >= LOG.seat - 20 && x >= LOG.left && x <= LOG.right) return { what: 'log' }
  if (y < skyline(x)) return { what: 'leaves' }
  return { what: 'moss', kind: kindAt(x, y) }
}

/** Whether a point is on the sun where it stands by day. */
export function onSun(x: number, y: number): boolean {
  return Math.hypot(x - SUN.x, y - SUN.y) <= SUN.r + 22
}

/** Whether a point is on the top of the sun where it sleeps behind the hill at night: the part of it above the skyline, and a little round it. */
export function onSunAsleep(x: number, y: number): boolean {
  return Math.hypot(x - SUN.x, y - SUN_DOWN_Y) <= SUN.r + 22 && y <= skyline(x) + 8
}

/** What in the painted place lies under a point by day with all four gnomes on the log, mushrooms aside. */
export function under(x: number, y: number): Under {
  for (const who of GNOMES) if (onGnome(who, x, y)) return { what: 'gnome', who }
  if (onSun(x, y)) return { what: 'sun' }
  if (onSnail(x, y)) return { what: 'snail' }
  return groundAt(x, y)
}

/** The nearest place in the moss a mushroom's foot can stand for a finger at this point, or null when the finger is not on moss a foot can reach. */
export function footFor(x: number, y: number): Point | null {
  if (y < skyline(x) - 4) return null
  const fx = Math.round(Math.min(MOSS.right, Math.max(MOSS.left, x)))
  if (y > mossBottom(fx) + 70) return null
  const foot = { x: fx, y: Math.round(Math.min(mossBottom(fx), Math.max(mossTop(fx), y))) }
  if (inWater(foot.x, foot.y)) return null
  // The tall gnome's hat stands up into the moss: no foot goes behind it.
  const tall = SEATS.tall
  if (Math.abs(foot.x - tall.x) < 56 && foot.y > tall.top - 20) return null
  return foot
}
