import type { Point } from './input'
import { CORNER } from './overlay'
import { toStage, type Fit } from './stage'

// Where the parts of the pocket game that every room shares are, in stage
// units: the glass, the stairwell at the right edge with its three doors and
// the lamp, and the two buttons of the case. The pictures and the touch both
// read these, so a thing answers where it is drawn. Nothing here draws.

/** The display behind the glass. Everything outside it is the plastic case. */
export const GLASS = { x: 36, y: 30, w: 1108, h: 712 } as const

/** The stairwell at the right edge of every room. A room's own things lie left of it. */
export const STAIRS_X = 992
/** The floor line of every room: the wall is above it. */
export const FLOOR_Y = 566

export type Rect = { x: number; y: number; w: number; h: number }
export type Oval = { x: number; y: number; rx: number; ry: number }
/** Where a thing answers a touch: an oval, or a box. */
export type Shape = Oval | Rect

export const DOORS: readonly Rect[] = [
  { x: 1026, y: 180, w: 106, h: 160 },
  { x: 1026, y: 368, w: 106, h: 160 },
  { x: 1026, y: 556, w: 106, h: 160 },
]

/** Where each door answers: its doorway and its frame, and nothing of the strip the lamp's cord hangs in. */
export const DOOR_AREAS: readonly Rect[] = DOORS.map((d) => ({ x: d.x - 6, y: d.y - 8, w: d.w + 14, h: d.h + 14 }))

/** The lamp over the doors, and the cord that hangs from it down the edge of the stairwell. */
export const LAMP = { x: 1079, y: 96 } as const
/** The cord's bobble at each of its three heights: hanging, half pulled, and pulled right down. */
export const CORD = { x: 1003, y: [136, 172, 208] } as const
/** How far down a finger has pulled, in stage units, for the cord's second and third heights. */
export const PULL = [34, 72] as const
/** Seconds the cord is held right down before the lamp clicks. */
export const PULL_HOLD = 0.45

/** The lamp's shade. A tap on it swings the lamp, and nothing more: no pull starts here. */
export const SHADE: Oval = { x: LAMP.x, y: LAMP.y, rx: 56, ry: 54 }
/**
 * Where the cord is taken hold of: a strip round it, from the ceiling to just above the top door. It is 48 CSS
 * pixels or more across on an upright tablet, where a stage unit is about 0.69 pixels, and shares no point with
 * a door. Where it lies on the shade, it is the cord's.
 */
export const CORD_AREAS: readonly Rect[] = [{ x: CORD.x - 44, y: 44, w: 88, h: 126 }]
/**
 * Just under the strip, where it stands over the corner of the top door: a finger that lands here on the door's
 * frame, and not on the door itself, missed the cord and did not mean the door. It swings the lamp, starts no pull
 * and opens nothing. A tap on the door itself is always the door's.
 */
export const CORD_MISS: Rect = { x: 1012, y: 170, w: 68, h: 36 }
/** Where the lamp answers, the cord's strips first. */
export const LAMP_AREAS: readonly Shape[] = [...CORD_AREAS, SHADE]

/** The two rubber buttons of the case. */
export const BUTTONS: readonly { x: number; y: number; r: number }[] = [
  { x: 120, y: 781, r: 30 },
  { x: 1060, y: 781, r: 30 },
]

/** The jam's home control: a round one at the top centre of the surface, in CSS pixels. Nothing a child touches lies under it. */
export const HOME = { size: 48, top: 10 } as const

export const isOval = (shape: Shape): shape is Oval => 'rx' in shape

export function inShape(p: Point, shape: Shape, pad = 0): boolean {
  if (isOval(shape)) return ((p.x - shape.x) / (shape.rx + pad)) ** 2 + ((p.y - shape.y) / (shape.ry + pad)) ** 2 <= 1
  return p.x >= shape.x - pad && p.x <= shape.x + shape.w + pad && p.y >= shape.y - pad && p.y <= shape.y + shape.h + pad
}

/** The box a shape lies in. */
export function boxOfShape(shape: Shape): Rect {
  return isOval(shape) ? { x: shape.x - shape.rx, y: shape.y - shape.ry, w: shape.rx * 2, h: shape.ry * 2 } : shape
}

export const middleOf = (shape: Shape): Point => (isOval(shape) ? { x: shape.x, y: shape.y } : { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 })

export const inGlass = (p: Point): boolean => p.x >= GLASS.x && p.x <= GLASS.x + GLASS.w && p.y >= GLASS.y && p.y <= GLASS.y + GLASS.h

/** Which case button a point is on, or null. */
export function buttonAt(p: Point): 0 | 1 | null {
  for (let i = 0; i < BUTTONS.length; i++) if (Math.hypot(p.x - BUTTONS[i].x, p.y - BUTTONS[i].y) <= BUTTONS[i].r + 6) return i as 0 | 1
  return null
}

/** Which door a point is on, or null. */
export function doorAt(p: Point): 0 | 1 | 2 | null {
  for (let i = 0; i < DOORS.length; i++) if (inShape(p, DOOR_AREAS[i])) return i as 0 | 1 | 2
  return null
}

export const onCord = (p: Point): boolean => CORD_AREAS.some((area) => inShape(p, area))
/** Beside the cord, on the frame round the top door's corner: a near miss, which is the lamp's and never the door's. */
export const besideCord = (p: Point): boolean => !onCord(p) && inShape(p, CORD_MISS) && !inShape(p, DOORS[0])
export const onLamp = (p: Point): boolean => onCord(p) || inShape(p, SHADE) || besideCord(p)

/**
 * Where on the stage a touch on the surface lands: the touch arrives in the surface's CSS pixels. The top right
 * corner of the surface is the grown-up's (overlay.ts): a touch there is answered by nothing, and so is a touch
 * on a surface that has no size yet.
 */
export function stagePoint(at: Point, width: number, by: Fit): Point | null {
  if (by.scale <= 0 || (at.x >= width - CORNER && at.y <= CORNER)) return null
  return toStage(at, by)
}
