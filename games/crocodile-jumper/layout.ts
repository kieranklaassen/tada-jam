import type { Kind } from './row'
import type { Point } from './input'

// Where everything stands, in stage units.

/** The pincushion: the neck of whoever lies on the table, and the start of the strip. */
export const NECK = 226
/** The table top that bellies rest on. */
export const TABLE_Y = 448
export const STRIP = { y: 462, h: 118, mid: 521 } as const

export type Box = { x: number; y: number; w: number; h: number }
export const TRAY: Record<Kind, Box> = {
  sausage: { x: 34, y: 614, w: 282, h: 158 },
  shoe: { x: 338, y: 614, w: 244, h: 158 },
  duck: { x: 604, y: 614, w: 216, h: 158 },
}
export const WINDOW: Box = { x: 40, y: 26, w: 290, h: 200 }
export const DOOR: Box = { x: 862, y: 18, w: 282, h: 268 }
export const MAGPIE: Box = { x: 858, y: 592, w: 296, h: 196 }
export const MICE: Box = { x: 1110, y: 366, w: 70, h: 84 }
/** The heads: of the one on the table, and of the one at the door. */
export const HEAD: Box = { x: 14, y: 262, w: 214, h: 190 }
/** The head of the second one on the table, whose neck is `from` along. */
export const headTwo = (from: number): Box => ({ x: NECK + from - 150, y: 250, w: 190, h: 150 })
export const BODY: Box = { x: NECK, y: 288, w: 884, h: 168 }

export const inside = (b: Box, p: Point, pad = 0): boolean => p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad
/** Whether something let go here lies down on the strip. */
export const onStrip = (p: Point): boolean => p.y > STRIP.y - 26 && p.y < STRIP.y + STRIP.h + 30 && p.x > NECK - 70
export const centre = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })

/** Where a tray's nearest piece lies, and where one hops home to. */
export const trayPoint = (k: Kind): Point => ({ x: TRAY[k].x + TRAY[k].w / 2, y: TRAY[k].y + 74 })
