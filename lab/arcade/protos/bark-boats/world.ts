// The lie of the land: one long sheet of paper, 5300 wide, that the brook
// runs along from the mossy bank on the left to the still pond on the right.
// These are the lines the painter and the game both keep to. All pure numbers.

import { clamp, lerp } from '../../kit/math.ts'

// World length, and how tall the sheet is: the pond lies one small waterfall
// lower than the bank, so the view sinks by DROP on the way.
export const LEN = 5300
export const DROP = 110
export const SHEET_H = 820 + DROP
export const VIEW_W = 1180

// The waterfall's lip runs slantwise across the brook, centred here.
export const LIP = 3850
const LIP_LEAN = 140

// The flat stone on the bank: where a keel rests.
export const STONE = { x: 590, y: 640 }

export function sstep(a: number, b: number, v: number): number {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// The pond closes in a round shore.
const POND_A = 4930
const POND_B = 5170
const POND_MID = 604
function pondClose(x: number): number {
  const t = clamp((x - POND_A) / (POND_B - POND_A), 0, 1)
  return 1 - Math.sqrt(1 - t * t)
}

// The brook's far edge before the fall, with no step in it.
function farUpper(x: number): number {
  return 440 + 8 * Math.sin(x * 0.0041 + 1) + 4 * Math.sin(x * 0.0113 + 2)
}

// The near edge before the fall: the bank is a mound at the start and falls
// away to a low fringe as the brook widens.
function nearUpper(x: number): number {
  const stream = 744 + 6 * Math.sin(x * 0.0052 + 0.5) + 4 * Math.sin(x * 0.0127)
  const mound = 562 + 16 * ((x - 590) / 560) ** 2
  return lerp(mound, stream, sstep(1010, 1300, x))
}

export const LIP_FAR = { x: LIP + LIP_LEAN, y: farUpper(LIP + LIP_LEAN) }
export const LIP_NEAR = { x: LIP - LIP_LEAN, y: nearUpper(LIP - LIP_LEAN) }

// Where the lip crosses a lane (y given at the upper level).
export function lipX(yUpper: number): number {
  const t = clamp((yUpper - LIP_FAR.y) / (LIP_NEAR.y - LIP_FAR.y), 0, 1)
  return lerp(LIP_FAR.x, LIP_NEAR.x, t)
}

// Water's far edge, in sheet coordinates.
export function farEdge(x: number): number {
  if (x <= LIP_FAR.x) return farUpper(x)
  const y = farUpper(x) + DROP - 26 * sstep(4250, 4520, x)
  return lerp(y, POND_MID + DROP, pondClose(x))
}

// Water's near edge, in sheet coordinates.
export function nearEdge(x: number): number {
  if (x <= LIP_NEAR.x) return nearUpper(x)
  const y = nearUpper(x) + DROP + 50 * sstep(4250, 4520, x)
  return lerp(y, POND_MID + DROP, pondClose(x))
}

// The land sinks with the water after the fall.
function sink(x: number): number {
  return 86 * sstep(LIP - 300, LIP + 560, x)
}

// The far hills' skyline, and where the meadow begins.
export function ridge(x: number): number {
  return 250 + 26 * Math.sin(x * 0.0023 + 1.3) + 13 * Math.sin(x * 0.0061) + 6 * Math.sin(x * 0.0137 + 2) + sink(x)
}
export function meadowTop(x: number): number {
  return 346 + 7 * Math.sin(x * 0.0049 + 2) + 4 * Math.sin(x * 0.0171) + sink(x)
}

// How far the view has sunk when it looks at x (its left edge at x - 430).
export function sinkAt(boatX: number): number {
  return DROP * sstep(LIP - 420, LIP + 170, boatX)
}

// How far evening has come at x: 0 is day, 1 is dusk.
export function duskAt(x: number): number {
  return sstep(3150, 4450, x)
}

// The lane the current carries a boat along (upper-level y), by x.
const FLOW: readonly [number, number][] = [
  [0, 498],
  [700, 500],
  [1150, 566],
  [1420, 598],
  [1760, 598],
  [2000, 522],
  [2150, 522],
  [2340, 600],
  [2860, 600],
  [3030, 652],
  [3090, 652],
  [3260, 600],
  [LEN, 600],
]
export function flowLane(x: number): number {
  for (let i = 1; i < FLOW.length; i++) {
    const b = FLOW[i]!
    if (x <= b[0]) {
      const a = FLOW[i - 1]!
      return lerp(a[1], b[1], sstep(a[0], b[0], x))
    }
  }
  return 600
}

// Things in the brook that a boat can catch on. `y` is at the upper level.
export interface Snag {
  x: number
  y: number
  r: number
}
// The reeds stand out from the far bank; open water is on the near side.
export const REEDS: Snag = { x: 2110, y: 496, r: 62 }
export const REEDS_CLEAR = 566
export const STEP_STONES: readonly Snag[] = [
  { x: 3050, y: 470, r: 40 },
  { x: 3076, y: 548, r: 40 },
  { x: 3066, y: 652, r: 44 },
  { x: 3094, y: 728, r: 40 },
]
// The lanes between the stepping stones.
export const STONE_GAPS: readonly number[] = [509, 600, 690]
export const FROG_STONE = { x: 1580, y: 486 }
export const SPRITE_AT = 2560
export const KINGFISHER = { x: 3500, y: 376 }

// Mooring places in the pond (sheet coordinates). Filled in this order. Each
// has a lily pad beside it, astern, for the gnome to step onto.
export interface Slot {
  x: number
  y: number
}
export const SLOTS: readonly Slot[] = [
  { x: 4770, y: 770 },
  { x: 4540, y: 842 },
  { x: 4970, y: 846 },
  { x: 4620, y: 684 },
  { x: 4910, y: 700 },
]
export function padOf(slot: Slot): { x: number; y: number } {
  return { x: slot.x - 150, y: slot.y + 10 }
}
