import { STAGE } from './stage'

// Where things stand on the stage, in stage units. The view paints the garden
// from these and the garden reads touches against them, so what is drawn and
// what answers a finger are one set of numbers.

/** The path in front of the bed and the table, where a piece that is let go comes to lie. */
export const PATH = { top: 744, bottom: 792, left: 34, right: STAGE.width - 34 } as const
/** How many pieces lie on the path before the robin comes for the oldest. */
export const PATH_HOLDS = 16
/** Nothing that lies on the path is drawn above this line: above it the bed, the table and the visitors begin. */
export const PATH_CLEAR = 716

/** The stone table the visitor stands behind. */
export const TABLE = { left: 696, right: 1004, top: 592, bottom: 734 } as const

export const VASES = ['boot', 'jar', 'vase'] as const
export type VaseId = (typeof VASES)[number]

export type Vase = {
  id: VaseId
  /** The middle of the mouth. */
  x: number
  mouthY: number
  /** How far down inside a cut end rests. */
  depth: number
  /** How tall the vase stands: a piece that stands out of it by more than this tips its head. */
  tall: number
  halfMouth: number
  /** How many pieces fit. */
  holds: number
  /** How many more heads tipped to one side than to the other send it over; 0 for a vase that never goes over. */
  tips: number
}

const VASE_X = 800
const vase = (id: VaseId, tall: number, depth: number, halfMouth: number, tips: number): Vase => ({ id, x: VASE_X, mouthY: TABLE.top - tall, depth, tall, halfMouth, holds: 7, tips })

/** The three vases. The boot holds any length and never goes over; the jar is shallow and wide; the tall vase is narrow. */
export const VASE: Record<VaseId, Vase> = {
  boot: vase('boot', 98, 84, 34, 0),
  jar: vase('jar', 64, 54, 40, 4),
  vase: vase('vase', 150, 120, 19, 2),
}
/** The goat's boot, which the tests of the toy use. */
export const BOOT = VASE.boot

/** How far a piece in a vase can lean before it rests on the rim. */
export function maxLean(of: Vase): number {
  return Math.atan(of.halfMouth / of.depth) * 0.92
}

/** How far to either side of the middle of the mouth a piece let go still goes in. */
export function mouthReach(of: Vase): number {
  return Math.min(46, of.halfMouth + 26)
}

/** The visitor behind the table: where its head is across the stage, and the oval a finger must land in to touch it. */
export const VISITOR = { x: 894, y: 410, rx: 88, ry: 172 } as const
/** The ground the visitor at the table stands on, behind the table. */
export const FLOOR_Y = 736

/** The gateway to the street, and the visitor who waits in it: where its feet are, and how much smaller it stands there. */
export const GATE = { left: 1040, right: 1160, top: 252, bottom: 668 } as const
export const WAITING = { x: 1108, feetY: 664, scale: 0.5, left: 1046, right: 1170, top: 340, bottom: 668 } as const

/** The top of the garden wall: the street shows above it, between the house and the gate. */
export const WALL = { left: 292, right: 1024, top: 236 } as const

/** Where each visitor stands in the street when it is neither at the table nor in the gateway, and how small. */
export const STREET_SCALE = 0.42
export const HOME = {
  aunt: { x: 352, y: 176 },
  beekeeper: { x: 590, y: 196 },
  goat: { x: 706, y: 190 },
  bride: { x: 836, y: 172 },
} as const
/** Where the bee-keeper's and the aunt's bouquets stand: on the hive, and on the table at the aunt's window. */
export const HIVE = { x: 506, top: 170 } as const
export const SILL = { x: 430, top: 206 } as const

/** The cat on the window sill. */
export const CAT = { x: 182, y: 252, rx: 86, ry: 38 } as const
/** The robin on the handle of the garden fork, at the window end of the bed. */
export const ROBIN = { x: 32, y: 452, r: 26 } as const

/** The window the daylight comes from. */
export const WINDOW = { left: 74, right: 262, top: 58, bottom: 268 } as const

/** The jam's round home control, drawn over every game at the top centre of the surface, in CSS pixels. */
export const HOME_CONTROL = { size: 48, fromTop: 10 } as const
