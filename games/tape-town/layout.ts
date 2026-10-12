import type { Point } from './input'
import { STAGE } from './stage'

// Where everything stands on the stage, in stage units (stage.ts): the bare
// floor the tape goes on, the four rolls, the shoebox, the toys' places in
// and out of the box, and the two places that belong to grown-ups. Nothing
// here draws: the model and the view both read it, and a test holds the
// distances a small hand needs.

/**
 * The bare floor: the boards the toys stand on, whole bodies and all. Its top edge stops short of the jam's home
 * control, so that no toy is ever under it; on a surface where the control reaches lower the model moves the
 * edge down (floor.ts).
 */
export const FIELD = { x0: 250, y0: 64, x1: 1000, y1: 700 } as const

/**
 * Tape is laid on the bare floor and stops this far short of its edge: half the width of the widest toy, so that
 * a toy travelling a strip along the edge still has its whole body on the boards, and none of it on the
 * shoebox, the rug or under the home control. A strip that is pulled past it stops there.
 */
export const EDGE = 48

/** How wide a strip of tape is, and how long a stub is. */
export const TAPE_WIDTH = 62

/** The four tapes, in the order of their rolls: grey road, blue river, green hedge, yellow rail. */
export const KINDS = [0, 1, 2, 3] as const
export type Kind = (typeof KINDS)[number]
export const ROAD: Kind = 0

/** A roll is about 100 across, the size a three-year-old's tap needs, and the rolls stand 130 apart. */
export const ROLL_RADIUS = 50
export const ROLLS: readonly Point[] = KINDS.map((kind) => ({ x: 1092, y: 170 + kind * 130 }))

/** The shoebox, tipped or upright, takes the same patch of floor. */
export const BOX = { x: 10, y: 90, w: 232, h: 266 } as const

/** The jam's round home control: 48 across at the top centre, 10 from the top. Nothing that answers a touch lies under it. */
export const HOME_CONTROL = { x: STAGE.width / 2, y: 34, r: 24 } as const
/** Kept clear round the home control, so a fat finger aiming at it meets nothing. */
export const HOME_KEEP_OUT = 44

/** Where the rug begins and the skirting board ends: a finger on either gets that thing's own sound. */
export const RUG_TOP = 716
export const SKIRTING = 60

/** The wicker basket of wool against the wall, and the pot plant: each answers a touch in its own way. */
export const BASKET = { x: 104, y: 40, rx: 86, ry: 50 } as const
export const PLANT = { x: 1040, y: 36, r: 56 } as const

/** The cat asleep on the rug. */
export const CAT = { x: 884, y: 762, rx: 132, ry: 46 } as const

export const TOY_IDS = ['car', 'bus', 'duck', 'train', 'dog', 'pegA', 'pegB', 'pegC'] as const
export type ToyId = (typeof TOY_IDS)[number]

export type Pose = { x: number; y: number; a: number }

/** The toys are painted at their drawn size times this, so that they are large in the frame. */
export const TOY_SCALE = 1.22

/** How long and how wide each toy is from above, nose along its heading, and the round reach a touch or another toy meets. */
export const TOY_SIZE: Record<ToyId, { long: number; wide: number; r: number }> = {
  car: { long: 137, wide: 81, r: 60 },
  bus: { long: 205, wide: 95, r: 78 },
  duck: { long: 120, wide: 98, r: 56 },
  train: { long: 200, wide: 88, r: 76 },
  dog: { long: 154, wide: 76, r: 60 },
  pegA: { long: 76, wide: 76, r: 39 },
  pegB: { long: 76, wide: 76, r: 39 },
  pegC: { long: 76, wide: 76, r: 39 },
}

/** Where each toy lands when the box is tipped out: on the bare floor, clear of each other and of the first road. */
export const OUT_PLACE: Record<ToyId, Pose> = {
  car: { x: 352, y: 196, a: 0.12 },
  duck: { x: 322, y: 338, a: 0.3 },
  dog: { x: 336, y: 468, a: -0.2 },
  bus: { x: 366, y: 612, a: -0.1 },
  train: { x: 616, y: 640, a: 0 },
  pegA: { x: 706, y: 166, a: 0.5 },
  pegB: { x: 512, y: 500, a: -0.4 },
  pegC: { x: 800, y: 640, a: 0.2 },
}

/** Where each toy lies in the upright box: a heap, looking up. */
export const HOME_PLACE: Record<ToyId, Pose> = {
  bus: { x: 126, y: 300, a: 0 },
  train: { x: 126, y: 206, a: Math.PI },
  car: { x: 92, y: 146, a: 0.3 },
  duck: { x: 184, y: 142, a: -0.6 },
  dog: { x: 104, y: 258, a: 0.9 },
  pegA: { x: 198, y: 250, a: 0.3 },
  pegB: { x: 54, y: 204, a: -0.2 },
  pegC: { x: 200, y: 314, a: 1.2 },
}

/** The mouth of the tipped box, where a toy tumbles out from. */
export const BOX_MOUTH = { x: BOX.x + BOX.w - 26, y: BOX.y + BOX.h / 2 } as const

/** The first road of a youngest child's first visit, and the car's place on it. */
export const STARTER = { ax: 450, ay: 262, bx: 910, by: 338 } as const

/** The order the toys leave the box in, and go home in: smallest first, the bus last. */
export const HOME_ORDER: readonly ToyId[] = ['pegA', 'pegB', 'pegC', 'duck', 'car', 'dog', 'train', 'bus']

/** The nearest place tape can be laid: on the bare floor, `EDGE` and `inset` in from its sides. */
export function clampToField(at: Point, inset = 0): Point {
  const by = EDGE + inset
  return { x: Math.min(FIELD.x1 - by, Math.max(FIELD.x0 + by, at.x)), y: Math.min(FIELD.y1 - by, Math.max(FIELD.y0 + by, at.y)) }
}

export function inField(at: Point): boolean {
  return at.x >= FIELD.x0 && at.x <= FIELD.x1 && at.y >= FIELD.y0 && at.y <= FIELD.y1
}

export function inBox(at: Point): boolean {
  return at.x >= BOX.x && at.x <= BOX.x + BOX.w && at.y >= BOX.y && at.y <= BOX.y + BOX.h
}

export function onCat(at: Point): boolean {
  const dx = (at.x - CAT.x) / CAT.rx, dy = (at.y - CAT.y) / CAT.ry
  return dx * dx + dy * dy <= 1
}

export function onBasket(at: Point): boolean {
  const dx = (at.x - BASKET.x) / BASKET.rx, dy = (at.y - BASKET.y) / BASKET.ry
  return dx * dx + dy * dy <= 1
}

export function onPlant(at: Point): boolean {
  return Math.hypot(at.x - PLANT.x, at.y - PLANT.y) <= PLANT.r
}

/** Under the home control, or so near that a finger aiming at it would land here. */
export function nearHomeControl(at: Point): boolean {
  return Math.hypot(at.x - HOME_CONTROL.x, at.y - HOME_CONTROL.y) <= HOME_KEEP_OUT
}

/** Which roll a touch lands on, or -1. */
export function rollAt(at: Point): number {
  return ROLLS.findIndex((roll) => Math.hypot(at.x - roll.x, at.y - roll.y) <= ROLL_RADIUS + 6)
}
