// Where everything stands. The kitchen is laid out on a stage of 1180 by 820
// units, the size the jam takes its stills at, and the stage is fitted whole
// into whatever surface the shell gives, centred, with paper around it. So
// no pixel geometry is fixed: every position below is in stage units and is
// turned into surface pixels by `fit`.

export const STAGE_W = 1180
export const STAGE_H = 820

export type Fit = {
  /** Surface pixels to a stage unit. */
  scale: number
  /** Where the stage's top left corner falls on the surface. */
  left: number
  top: number
}

export function fit(width: number, height: number): Fit {
  const scale = Math.min(width / STAGE_W, height / STAGE_H)
  return { scale, left: (width - STAGE_W * scale) / 2, top: (height - STAGE_H * scale) / 2 }
}

/** A point on the surface, in stage units. */
export function toStage(f: Fit, x: number, y: number): { x: number; y: number } {
  return { x: (x - f.left) / f.scale, y: (y - f.top) / f.scale }
}

/** Where the three bites are taken, as shares of the pizza's radius: each takes about a third, and the last takes what is left. */
export const BITES = [{ x: -0.8, y: -0.5, r: 0.86 }, { x: 0.85, y: -0.35, r: 0.9 }, { x: 0, y: 0.5, r: 1.3 }] as const

/** Which bite takes the piece that lies at a spot on the pizza: the first one that reaches it. */
export function biteOf(x: number, y: number): number {
  const n = BITES.findIndex((bite) => Math.hypot(x - bite.x, y - bite.y) <= bite.r)
  return n < 0 ? BITES.length - 1 : n
}

/** The line where the counter's far edge runs: customers stand behind it. */
export const COUNTER_Y = 440

export const PIZZA = { x: 596, y: 640, r: 150 }
/** The round board the pizza lies on. */
export const BOARD = { x: 596, y: 642, r: 168 }
/** A piece on the pizza, as a share of the pizza's radius and in stage units. */
export const PIECE_SHARE = 0.152
export const PIECE_R = PIZZA.r * PIECE_SHARE
/** Pieces stay inside this share of the pizza's radius, clear of the crust. */
export const TOP_SHARE = 0.86

export const TUB = { r: 66 }
/**
 * Up to four tubs stand to the left of the pizza, under the customer: one or
 * two in a column beside the board, three or four in two columns. None is in
 * the bottom strip, where a wrist rests.
 */
export function tubPlace(index: number, count: number): { x: number; y: number } {
  if (count <= 2) return { x: 250, y: count === 1 ? 620 : 540 + index * 156 }
  return { x: 122 + (index % 2) * 176, y: 540 + Math.floor(index / 2) * 156 }
}

/** Where the customer at the counter stands: its feet, hidden behind the counter. */
export const CUSTOMER = { x: 596, y: COUNTER_Y + 50 }
/** The card the customer holds up, to its right, over the oven. Its other hand is then free for the tubs, on its left. */
export const CARD = { x: 856, y: 82, w: 300, h: 214 }
/** Where a pizza is slid to be served: up against the counter, under the customer's mouth. */
/** Where the customer's hand holds the card: by its bottom corner on the customer's side, from outside, clear of every picture on it. */
export const CARD_HOLD = { x: CARD.x - 14, y: CARD.y + CARD.h - 6 }

export const SERVE = { x: PIZZA.x, y: PIZZA.y - 74 }
/** How far a hand can slide the pizza towards the oven: up to the oven's side, and no further. Half of this way counts as done. */
export const OVEN_WAY = { x: PIZZA.x + 112, y: PIZZA.y }
/** Where a pizza goes to be baked: the oven's mouth. */
export const OVEN_MOUTH = { x: 1014, y: 668 }
export const OVEN = { x: 1014, y: 650, w: 250, h: 270 }
/** The doorway where the next customers wait, on the left, over the tubs. */
export const DOOR = { x: 196, y: 92, w: 316, h: 348 }
/** How far each of the two at the door stands from its middle, and how big they are drawn there: far enough apart that the two widest never touch. */
export const DOOR_APART = 74
export const DOOR_SIZE = 1 / 3

/** Where each roll is held, from the feet of the one who holds it, in stage units: the small one at one side, the big one across the front. */
export const ROLL = { small: { x: 38, y: -60 }, big: { x: 0, y: -30 } } as const

/** A spot on the pizza, as shares of its radius, in stage units. */
export function onPizza(sx: number, sy: number): { x: number; y: number } {
  return { x: PIZZA.x + sx * PIZZA.r, y: PIZZA.y + sy * PIZZA.r }
}
