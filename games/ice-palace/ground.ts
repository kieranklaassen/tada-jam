// The clearing in stage units (stage.ts): where the snow bank, the pond and
// the characters are, and the geometry of a cut. Pure numbers: the rules, the
// view and the tests all read the same places from here.

export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

/** The top of the snow bank: what is set down above this line falls to it and stacks. */
export const GROUND_Y = 500
/** The bank between these two lines takes a palace; outside them sit the lamp child and King Winter. */
export const BUILD = { x0: 214, x1: 872 } as const

/** How thick the pond's ice is, which is every block's height and every hole's width. */
export const BLOCK_H = 46
/** A line shorter than this gives chips and no block. */
export const MIN_LEN = 64
/** The longest block the pond gives. */
export const MAX_LEN = 300

/** The pond, an ellipse lying across the foot of the frame. */
export const POND = { cx: 590, cy: 668, rx: 410, ry: 122 } as const
/** The saw's line stays this far inside the pond's edge, so the hole it leaves stays in the ice. */
const SAW_INSET = 30
/** Inside this share of the pond's radius the ice is clear; outside it is cloudy. */
export const CLEAR_WITHIN = 0.58
/** A new cut keeps this much ice between itself and a hole or a lying block. */
export const SAW_GAP = 6

/** The drift, a mound of snow on the front snow by King Winter's feet, which the hand scoops from. */
export const DRIFT = { cx: 962, cy: 556, rx: 66, ry: 30 } as const
/** A scoop shorter than this packs into a snowball; a longer one into a snow block of the scoop's length. */
export const SCOOPS = 8

/** The line where the far snow meets the sky. */
export function ridge(x: number): number {
  return 238 + 16 * Math.sin(x / 150 + 0.6) + 8 * Math.sin(x / 53 + 2)
}
/** The firs along the ridge: where each stands and how tall it is. None stands behind the sun, and the tall ones are at the two ends. */
export const FIRS: readonly (readonly [number, number])[] = [
  [-40, 170], [18, 150], [62, 110], [104, 84],
  [286, 70], [322, 98], [360, 62],
  [432, 92], [478, 128], [530, 84], [668, 78], [716, 118], [762, 146], [808, 96],
  [884, 122], [942, 152], [1004, 172], [1076, 150], [1140, 184], [1210, 160],
]
/** How far below the ridge a fir's foot is. */
export const FIR_FOOT = 8

/** The front snow, in front of the bank's face: where King Winter walks along the wall. */
export const FRONT_Y = 512

/** The fir bough that hangs in at the top of the frame, and where its five icicles hang from: clear of the sun and of the jam's home control. */
export const BOUGH: readonly Point[] = [{ x: 318, y: 62 }, { x: 362, y: 74 }, { x: 406, y: 66 }, { x: 450, y: 78 }, { x: 494, y: 64 }]

/** Where the sun hangs by day, and where its sleeping top half shows above the ridge by night: the same side of the top centre. */
export const SUN = { x: 176, day: 108, night: 252, r: 62 } as const
/** The sun let go lower than this goes to bed; let go higher than `up`, it rises. Between the two it goes back where it was. */
export const SUN_PULL = { down: 200, up: 170 } as const

/**
 * What lies below the bank and must stay clear of a thing set down there: the peeper at one corner, the berry
 * bush at the other, the drift, and the snow under the lamp child's feet, where the frost children stand at night.
 */
export const KEEP_OUT: readonly Rect[] = [
  { x: 0, y: 626, w: 232, h: 194 },
  { x: 1020, y: 610, w: 160, h: 210 },
  { x: DRIFT.cx - DRIFT.rx - 6, y: DRIFT.cy - DRIFT.ry - 8, w: DRIFT.rx * 2 + 12, h: DRIFT.ry * 2 + 14 },
  { x: 0, y: 516, w: 206, h: 110 },
]

/** Whether a point is on the drift. */
export function onDrift(x: number, y: number): boolean {
  return Math.hypot((x - DRIFT.cx) / (DRIFT.rx + 8), (y - DRIFT.cy) / (DRIFT.ry + 10)) <= 1
}
/** Where a block may lie below the bank: its whole length stays on the stage. */
export const LYING = { y0: GROUND_Y + BLOCK_H / 2 + 22, y1: 820 - BLOCK_H / 2 - 6, margin: 10 } as const

/** How far out a point of the stage is in the pond: 0 at its middle, 1 on its edge. */
export function pondReach(x: number, y: number, inset = 0): number {
  return Math.hypot((x - POND.cx) / (POND.rx - inset), (y - POND.cy) / (POND.ry - inset))
}
export function onPond(x: number, y: number): boolean {
  return pondReach(x, y) <= 1
}
/** Whether the saw's line may pass here, as far as the pond's edge goes. */
export function sawable(x: number, y: number): boolean {
  return pondReach(x, y, SAW_INSET) <= 1
}
/** The ice of this place: clear in the middle of the pond, cloudy round its edge. */
export function iceAt(x: number, y: number): 'clear' | 'cloudy' {
  return pondReach(x, y) <= CLEAR_WITHIN ? 'clear' : 'cloudy'
}

/** An open cut: a slab of ice `len` long and one block thick taken out along a line. */
export type Hole = { x: number; y: number; angle: number; len: number }

/** How far a point is from a hole's water: 0 inside it. */
export function awayFromHole(hole: Hole, x: number, y: number): number {
  const c = Math.cos(hole.angle), s = Math.sin(hole.angle)
  const u = (x - hole.x) * c + (y - hole.y) * s, v = -(x - hole.x) * s + (y - hole.y) * c
  return Math.hypot(Math.max(0, Math.abs(u) - hole.len / 2), Math.max(0, Math.abs(v) - BLOCK_H / 2))
}
/** The point of a hole's water nearest to a point. */
export function nearestInHole(hole: Hole, x: number, y: number): Point {
  const c = Math.cos(hole.angle), s = Math.sin(hole.angle)
  const u = Math.max(-hole.len / 2, Math.min(hole.len / 2, (x - hole.x) * c + (y - hole.y) * s))
  const v = Math.max(-BLOCK_H / 2, Math.min(BLOCK_H / 2, -(x - hole.x) * s + (y - hole.y) * c))
  return { x: hole.x + c * u - s * v, y: hole.y + s * u + c * v }
}
/** How much ice a new cut keeps between its middle and a hole or a lying block. */
export const SAW_KEEP = BLOCK_H / 2 + SAW_GAP
export function inHole(hole: Hole, x: number, y: number): boolean {
  return awayFromHole(hole, x, y) === 0
}
/** How far a point is from a level rectangle given by its centre: 0 inside it. */
export function awayFromBar(cx: number, cy: number, len: number, x: number, y: number): number {
  return Math.hypot(Math.max(0, Math.abs(x - cx) - len / 2), Math.max(0, Math.abs(y - cy) - BLOCK_H / 2))
}

/** A level bar lying somewhere, as far as the saw cares. */
export type Bar = { x: number; y: number; len: number }

/** Whether the middle of the saw's cut may be at this point: on the pond's ice, clear of every hole and of every block that lies on it. */
export function freeIce(x: number, y: number, holes: readonly Hole[], bars: readonly Bar[]): boolean {
  if (!sawable(x, y)) return false
  const keep = SAW_KEEP
  for (const hole of holes) if (awayFromHole(hole, x, y) < keep) return false
  for (const bar of bars) if (awayFromBar(bar.x, bar.y, bar.len, x, y) < keep) return false
  return true
}

/**
 * How far a cut gets from `from` along `angle` when the finger has gone `asked` along it: it stops at the first
 * thing in its way and at the longest block the pond gives. `stopped` says something stopped it short.
 */
export function cutReach(from: Point, angle: number, asked: number, holes: readonly Hole[], bars: readonly Bar[]): { len: number; stopped: boolean } {
  const c = Math.cos(angle), s = Math.sin(angle)
  const want = Math.min(asked, MAX_LEN)
  let len = 0
  for (;;) {
    const next = Math.min(want, len + 3)
    if (next <= len) break
    if (!freeIce(from.x + c * next, from.y + s * next, holes, bars)) return { len, stopped: true }
    len = next
  }
  return { len, stopped: asked > MAX_LEN }
}

/** The hole a cut leaves. Lengths and places are kept as whole stage units, and the angle in hundredths of a radian, so a save holds what the game played. */
export function holeOf(from: Point, angle: number, len: number): Hole {
  const length = Math.round(len)
  return { x: Math.round(from.x + (Math.cos(angle) * length) / 2), y: Math.round(from.y + (Math.sin(angle) * length) / 2), angle: Math.round(angle * 100) / 100, len: length }
}
