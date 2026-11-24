// Where things are in the yard, in stage units (1180 by 820).

export const GROUND = 652
/** How far a half's middle may go along the yard. */
export const LEFT = 78
export const RIGHT = 884

/** A half as it is touched and drawn: its middle above its feet, and its size. */
export const BODY = { y: -196, rx: 112, ry: 98 }
/** Where the cloth is sewn on, from a half's middle, on its inner side. */
export const SEAM = { x: 64, y: -196 }
/** A finger this near an end's middle has hold of it. */
export const GRAB = 150

/** The cloth's length when nothing pulls, and where pulling begins to be felt by the other end. */
export const CLOTH_REST = 165
export const SLACK = 300
/** Beyond this a finger drags the other end along. */
export const DRAG_FROM = 420

/** The least room between two ends that stand, and between two in the stable. */
export const ROOM = 178
export const STABLE_ROOM = 64

export const STABLE = { right: 232, mouth: 218 }
export const LOFT = { x: 122, y: 292 }
export const PUDDLE = { x: 586, y: 668, rx: 92, ry: 20 }
export const TREE = { x: 696, y: 356, w: 170, h: 190 }
export const POST = { x: 836, y: 388 }
export const FARMER = { x: 1076, y: 470, w: 170, h: 380 }
/** An end whose middle is past this is being greeted. */
export const MEET = 800
export const PIG = { x: 330, y: 742, w: 190, h: 110 }

/** The washing line: a lace that sags between two poles, below the jam's home control. */
export const LINE = { left: 250, right: 1010, y: 132, sag: 26 }
export const PEGS = 8
export function pegAt(peg: number): { x: number; y: number } {
  const t = (peg + 0.5) / PEGS
  return { x: LINE.left + (LINE.right - LINE.left) * t, y: LINE.y + LINE.sag * 4 * t * (1 - t) }
}
/** A hung costume is drawn and touched round a point this far under its peg. */
export const HANG = 42
export const HANG_REACH = 52
/** A costume let go above this goes back to its peg. */
export const LINE_FLOOR = 235

export const FOOD_R = 20
export const FOOD_REACH = 52
export const MAX_FOOD = 5
export const FOOD_LEFT = 255
export const FOOD_RIGHT = 940
