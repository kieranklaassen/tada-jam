// Where everyone and everything stands, in the look's reference units (a sheet
// of 1180 by 820). Pure numbers: the game's controller uses them to know what
// a finger landed on and where a thing can be put down, and the look uses the
// same numbers to lay its pieces, so the two cannot disagree. A different look
// would bring its own numbers and leave the rules and the controller alone.

import { SPOTS } from './lookLayout'
import type { Place } from './stuff'
import type { Animal, Group } from './tastes'

export type Point = { x: number; y: number }
export type Rect = readonly [x: number, y: number, w: number, h: number]

export const inside = (at: Point, [x, y, w, h]: Rect, pad = 0): boolean => at.x >= x - pad && at.x <= x + w + pad && at.y >= y - pad && at.y <= y + h + pad
export const middle = ([x, y, w, h]: Rect): Point => ({ x: x + w / 2, y: y + h / 2 })

// --- The cast ----------------------------------------------------------------

/** Every printed figure of the cast. The sparrows are three birds and the hen comes with three chicks. */
export type Figure = 'goat' | 'sparrow0' | 'sparrow1' | 'sparrow2' | 'dachshund' | 'bear' | 'crow' | 'hen' | 'chick0' | 'chick1' | 'chick2' | 'duck' | 'mole'

/** The figures an animal is made of; the first is its main figure, whose mouth and basket take the bread. */
export const FIGURES_OF: Record<Animal, readonly Figure[]> = {
  goat: ['goat'], sparrows: ['sparrow1', 'sparrow0', 'sparrow2'], dachshund: ['dachshund'], bear: ['bear'], crow: ['crow'],
  hen: ['hen', 'chick0', 'chick1', 'chick2'], duck: ['duck'], mole: ['mole'],
}

/**
 * Each figure as it is printed, at the size it has alone at the hatch: its
 * width and height, and where its foot (the middle of its lower edge) stands
 * relative to its animal's foot. `mouth` and `basket` are where a bread goes,
 * as shares of the figure's own box (0,0 its top left corner).
 */
export const FIGURE: Record<Figure, { w: number; h: number; dx: number; dy: number; mouth: readonly [number, number]; basket: readonly [number, number] }> = {
  goat: { w: 300, h: 292, dx: 0, dy: 0, mouth: [0.86, 0.42], basket: [0.8, 0.86] },
  sparrow1: { w: 104, h: 96, dx: 0, dy: 0, mouth: [0.87, 0.4], basket: [0.79, 0.95] },
  sparrow0: { w: 104, h: 96, dx: -106, dy: 4, mouth: [0.87, 0.4], basket: [0.79, 0.95] },
  sparrow2: { w: 104, h: 96, dx: 106, dy: -3, mouth: [0.87, 0.4], basket: [0.79, 0.95] },
  dachshund: { w: 330, h: 200, dx: 0, dy: 0, mouth: [0.87, 0.57], basket: [0.35, 0.48] },
  bear: { w: 300, h: 330, dx: 0, dy: 0, mouth: [0.67, 0.42], basket: [0.74, 0.81] },
  crow: { w: 220, h: 250, dx: 0, dy: 0, mouth: [0.95, 0.27], basket: [0.82, 0.86] },
  hen: { w: 230, h: 240, dx: -20, dy: 0, mouth: [0.96, 0.28], basket: [0.77, 0.79] },
  chick0: { w: 60, h: 56, dx: -150, dy: 0, mouth: [0.92, 0.44], basket: [0.84, 0.95] },
  chick1: { w: 60, h: 56, dx: 112, dy: 2, mouth: [0.92, 0.44], basket: [0.84, 0.95] },
  chick2: { w: 60, h: 56, dx: 168, dy: -2, mouth: [0.92, 0.44], basket: [0.84, 0.95] },
  duck: { w: 240, h: 250, dx: 0, dy: 0, mouth: [0.96, 0.24], basket: [0.81, 0.71] },
  mole: { w: 200, h: 220, dx: 0, dy: 0, mouth: [0.8, 0.54], basket: [0.67, 0.66] },
}

/** How wide an animal stands, all its figures together, at full size. */
export function spanOf(animal: Animal): number {
  let left = 0, right = 0
  for (const figure of FIGURES_OF[animal]) { const at = FIGURE[figure]; left = Math.min(left, at.dx - at.w / 2); right = Math.max(right, at.dx + at.w / 2) }
  return right - left
}

// --- The hatch and the lane --------------------------------------------------

/** How large one, two or three stand at the hatch together when they have it to themselves: they are the largest figures in the opening. */
export const HATCH_SCALE = [0.86, 0.62, 0.5] as const
/** How large one, two or three wait in the lane behind someone at the hatch, and when the hatch stands empty. */
export const LANE_SCALE = [0.5, 0.42, 0.36] as const
export const LANE_SCALE_OPEN = [0.62, 0.5, 0.42] as const
/** Those who wait are never drawn larger than this share of those at the hatch. */
export const LANE_SHARE = 0.8
/** The share of the opening those at the hatch may take when one group waits, and when two do: the rest is the lane's. */
const HATCH_SHARE = [0.68, 0.56] as const
/** How close the animals of one group stand: at the hatch almost clear of each other, in the lane a little closer. */
const CLOSE_HATCH = 0.92, CLOSE_LANE = 0.84
const OPENING = { left: SPOTS.hatch[0] + 10, right: SPOTS.hatch[0] + SPOTS.hatch[2] - 6, hatchY: SPOTS.hatch[1] + SPOTS.hatch[3] + 16, laneY: SPOTS.hatch[1] + SPOTS.hatch[3] - 14 }
/** Where the lane leads off: an animal that leaves walks to here and is gone. */
export const LANE_END: Point = { x: SPOTS.hatch[0] - 90, y: OPENING.laneY }

/** How far an animal reaches left and right of its own foot, all its figures together, at full size. */
function reachOf(animal: Animal): { left: number; right: number } {
  let left = 0, right = 0
  for (const figure of FIGURES_OF[animal]) { const at = FIGURE[figure]; left = Math.min(left, at.dx - at.w / 2); right = Math.max(right, at.dx + at.w / 2) }
  return { left, right }
}
const widthOf = (group: Group): number => group.reduce((sum, animal) => sum + spanOf(animal), 0)

export type Stand = { x: number; y: number; scale: number }

/** A group stood side by side from `from` rightwards: each animal's foot. */
function row(group: Group, from: number, y: number, scale: number, close: number): Stand[] {
  let x = from
  return group.map((animal) => {
    const reach = reachOf(animal), foot = x - reach.left * scale * close
    x += (reach.right - reach.left) * scale * close
    return { x: foot, y, scale }
  })
}

/**
 * Where everyone stands. Those at the hatch stand at the right of the opening, the largest in it; those who
 * wait share what is left of it, each group in a place of its own, so nobody stands in front of anybody and
 * each can be seen and touched. With the hatch empty those who wait come forward and share the whole opening.
 */
export function standings(hatch: Group | null, lane: readonly Group[]): { hatch: Stand[]; lane: Stand[][] } {
  const whole = OPENING.right - OPENING.left
  let free = OPENING.right, stood: Stand[] = [], most = 1
  if (hatch) {
    const room = lane.length > 0 ? whole * HATCH_SHARE[Math.min(lane.length, 2) - 1] : whole
    const scale = Math.min(HATCH_SCALE[hatch.length - 1], room / (widthOf(hatch) * CLOSE_HATCH)), wide = widthOf(hatch) * scale * CLOSE_HATCH
    free = OPENING.right - wide - 8
    stood = row(hatch, OPENING.right - wide, OPENING.hatchY, scale, CLOSE_HATCH)
    most = scale * LANE_SHARE
  }
  const place = lane.length > 0 ? (free - OPENING.left) / lane.length : 0, sizes = hatch ? LANE_SCALE : LANE_SCALE_OPEN
  const waiting = lane.map((group, at) => {
    const scale = Math.min(sizes[group.length - 1], most, (place - 8) / (widthOf(group) * CLOSE_LANE)), wide = widthOf(group) * scale * CLOSE_LANE
    return row(group, OPENING.left + place * (at + 0.5) - wide / 2, hatch ? OPENING.laneY : OPENING.hatchY - 8, scale, CLOSE_LANE)
  })
  return { hatch: stood, lane: waiting }
}

/** The least side, in reference units, of the box in which an animal answers a touch: a small bird far back is still easy to hit. */
export const LEAST_TOUCH = 68

/** All of an animal's figures together, as it stands: grown to the least size a finger needs. */
export function animalBox(animal: Animal, at: Stand, least = 0): Rect {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const figure of FIGURES_OF[animal]) { const [x, y, w, h] = figureBox(figure, at); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h) }
  const growX = Math.max(0, least - (x1 - x0)) / 2, growY = Math.max(0, least - (y1 - y0))
  return [x0 - growX, y0 - growY, x1 - x0 + growX * 2, y1 - y0 + growY]
}

/** The box a figure fills when its animal stands at `at`: for drawing, and for knowing what a finger landed on. */
export function figureBox(figure: Figure, at: { x: number; y: number; scale: number }): Rect {
  const made = FIGURE[figure], w = made.w * at.scale, h = made.h * at.scale
  return [at.x + made.dx * at.scale - w / 2, at.y + made.dy * at.scale - h, w, h]
}

// --- The peel and its places -------------------------------------------------

/** How large the peel and what lies on it are drawn in each place. On the board it is full size; on a ledge it is small. */
export const PEEL_SCALE: Record<Place, number> = { board: 1, nook: 0.42, sill: 0.42, oven: 0.5 }

/** The middle of what lies on the peel, in each place the peel can be. */
export const LUMP_AT: Record<Place, Point> = {
  board: middle(SPOTS.dough),
  nook: { x: SPOTS.nook[0] + SPOTS.nook[2] / 2, y: SPOTS.nook[1] + SPOTS.nook[3] - 34 },
  sill: { x: SPOTS.sill[0] + SPOTS.sill[2] / 2, y: SPOTS.sill[1] + SPOTS.sill[3] - 34 },
  oven: { x: SPOTS.mouth[0] + SPOTS.mouth[2] / 2, y: SPOTS.mouth[1] + SPOTS.mouth[3] - 70 },
}

/** Where a peel being carried is let go: the place it goes to, or none. The board takes anything dropped on the bench. */
export function placeAt(at: Point, benchLine: number): Place | null {
  if (inside(at, SPOTS.mouth, 30)) return 'oven'
  if (inside(at, SPOTS.nook, 34)) return 'nook'
  if (inside(at, SPOTS.sill, 34)) return 'sill'
  return at.y >= benchLine - 20 ? 'board' : null
}

/** The four places on the rack. */
export const RACK: readonly Rect[] = [0, 1, 2, 3].map((i) => [SPOTS.loaf[0] + i * 64, SPOTS.loaf[1], SPOTS.loaf[2], SPOTS.loaf[3]])
