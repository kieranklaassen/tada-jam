import { CORNER } from './overlay'
import { STAGE } from './stage'

// Where everything stands, in stage units. Pure, so the model and the view
// read the same numbers and a test can hold the targets apart.
//
// From left to right: the tub with the washboard in it and the wringing rail
// behind it, the cat's post, the three places under the line where the
// friends stand, and the gate with the three who wait behind it. The puddle
// lies in the grass below the gate.

export type Box = { x: number; y: number; w: number; h: number }
export type Spot = { x: number; y: number }

/** The tub's rim: an ellipse, with the staves below it. */
export const TUB = { x: 222, y: 640, rx: 186, ry: 50, depth: 88 }
/** The wooden washboard that stands in the tub. */
export const BOARD: Box = { x: 58, y: 404, w: 236, h: 270 }
/** Its ridged face: the ridges run across, `gap` apart. */
export const RIDGES = { x: 72, y: 436, w: 208, h: 208, gap: 16 }
/** The unit box of the thing that lies on the board. */
export const CLOTH: Box = { x: 76, y: 440, w: 200, h: 200 }
/** The wringing rail behind the tub: its bar, the box a touch on it lands in, and where a thing hangs over it. */
export const RAIL = { x0: 66, x1: 302, y: 254, box: { x: 84, y: 234, w: 200, h: 160 } as Box, hang: { x: 184, y: 316, size: 128 } }
/** The soap's dish, on the top bar of the board. */
export const SOAP = { x: 262, y: 398, r: 38 }
/** Where things float in the tub, to the right of the board. */
export const TUB_SLOTS: readonly Spot[] = [{ x: 348, y: 634 }, { x: 376, y: 654 }, { x: 320, y: 662 }]
export const TUB_SIZE = 84
/** Where a friend stands when it has climbed into the tub. */
export const TUB_FRIEND: Spot = { x: 356, y: 700 }
/** The puddle in the grass. */
export const PUDDLE = { x: 1040, y: 700, rx: 84, ry: 26 }
/** The cat on its fence post: the round a touch on it lands in, and how far below its middle the post's top is. */
export const CAT = { x: 388, y: 318, r: 58, seat: 62 }
/** The washing line, from the tree to the gate's tall post, and how far it hangs in the middle. */
export const LINE = { x0: 84, x1: 1156, y: 150, sag: 30 }

export const FRIEND_KINDS = ['pig', 'heron', 'goat'] as const
export type FriendKind = (typeof FRIEND_KINDS)[number]

/** How large a friend is drawn in the yard, behind the gate and on the hill, against the size it is stitched at. */
export const YARD_SCALE = 0.8
export const WAIT_SCALE = 0.5
export const HILL_SCALE = 0.2

/** The ground the friends stand on. */
export const FEET_Y = 708
/** The oval a touch on each kind of friend lands in, at the size it is stitched at: half its width, half its height. */
export const BODY: Record<FriendKind, { rx: number; ry: number }> = { pig: { rx: 104, ry: 178 }, heron: { rx: 72, ry: 232 }, goat: { rx: 96, ry: 182 } }

/** The three places under the line, one for each friend, and above each the place on the line. */
export const PLACE_X: readonly number[] = [492, 656, 806]
/** How far to each side of a place its two pegs sit on the line. */
export const PEG_REACH = 30
/** How large a thing hangs on the line. */
export const LINE_SIZE = 100

/** Where each friend holds its garment out, from its feet, at the size it is stitched at, and how large the garment is there. */
export const HELD = { dx: -76, dy: -150, size: 96 }

/** The gate: the boards below its top bar. A touch here is a touch on the gate. */
export const GATE: Box = { x: 892, y: 372, w: 256, h: 84 }
/** Where the three wait behind it, and where each kind's feet are, hidden behind the boards. */
export const WAIT_X: readonly number[] = [934, 1020, 1106]
export const WAIT_FEET: Record<FriendKind, number> = { pig: 476, heron: 500, goat: 480 }
/** How large a waiting friend's garment is, held up over the gate, and how far above its feet. */
export const WAIT_HELD = { size: 64, up: { pig: 228, heron: 268, goat: 236 } as Record<FriendKind, number> }
/** The middle of the open gate, where a friend walks through. */
export const GATEWAY: Spot = { x: 1020, y: 470 }
/** Where the lane leaves the frame, for a friend who goes off without coming in. */
export const LANE_END: Spot = { x: 1230, y: 330 }

/** Where the last three who walked off stand on the far hill. */
export const HILL: readonly Spot[] = [{ x: 574, y: 318 }, { x: 731, y: 314 }, { x: 872, y: 322 }]

/** The grass a thing can lie on. */
export const LAWN: Box = { x: 430, y: 500, w: 710, h: 240 }
export const GRASS_SIZE = 84

/** The strip at the bottom where wrists rest: nothing essential in it. */
export const WRIST_STRIP = 60
/** The jam's home control: a round 48 px button at the top centre, 10 px from the top edge. */
export const HOME: Box = { x: STAGE.width / 2 - 24, y: 10, w: 48, h: 48 }
/** The grown-up's corner at the top right. */
export const GROWN_UP: Box = { x: STAGE.width - CORNER, y: 0, w: CORNER, h: CORNER }

export function lineY(x: number, sag: number = LINE.sag): number {
  const t = (x - LINE.x0) / (LINE.x1 - LINE.x0)
  return LINE.y + sag * 4 * t * (1 - t)
}

export function inBox(box: Box, x: number, y: number, slack = 0): boolean {
  return x >= box.x - slack && x <= box.x + box.w + slack && y >= box.y - slack && y <= box.y + box.h + slack
}

export function inOval(cx: number, cy: number, rx: number, ry: number, x: number, y: number): boolean {
  const dx = (x - cx) / rx, dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1
}

export function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

export function boxAt(x: number, y: number, size: number): Box {
  return { x: x - size / 2, y: y - size / 2, w: size, h: size }
}

/** The stage point of a point of the board cloth's unit box. */
export function clothToStage(u: number, v: number): Spot {
  return { x: CLOTH.x + u * CLOTH.w, y: CLOTH.y + v * CLOTH.h }
}

/** The oval a touch on a friend lands in when it stands with its feet at (`x`, `y`) at `scale`. */
export function bodyOval(kind: FriendKind, x: number, y: number, scale: number): { cx: number; cy: number; rx: number; ry: number } {
  const body = BODY[kind]
  return { cx: x, cy: y - body.ry * scale, rx: body.rx * scale, ry: body.ry * scale }
}

/** The middle of the garment a friend holds out in the yard. */
export function heldAt(place: number): Spot {
  return { x: PLACE_X[place] + HELD.dx * YARD_SCALE, y: FEET_Y + HELD.dy * YARD_SCALE }
}

/** The middle of the garment a waiting friend holds up over the gate. */
export function waitHeldAt(place: number, kind: FriendKind): Spot {
  return { x: WAIT_X[place], y: WAIT_FEET[kind] - WAIT_HELD.up[kind] }
}

/** What of a waiting friend a touch can land on: the column above the gate's top bar, up to the top of what it holds. */
export function waitBox(place: number, kind: FriendKind): Box {
  const top = waitHeldAt(place, kind).y - WAIT_HELD.size / 2
  return { x: WAIT_X[place] - 42, y: top, w: 84, h: GATE.y - top }
}

/** Where a thing hangs on the line at a place: its middle. */
export function lineSpot(place: number): Spot {
  const x = PLACE_X[place]
  return { x, y: lineY(x) + LINE_SIZE / 2 + 2 }
}

/** Where a peg sits on the line: pegs 2n and 2n + 1 belong to place n. */
export function pegHome(peg: number): Spot {
  const x = PLACE_X[Math.floor(peg / 2)] + (peg % 2 ? PEG_REACH : -PEG_REACH)
  return { x, y: lineY(x) }
}

/**
 * The cat pegged on the line by its scruff, in the cat's own units from the middle of its seat. It hangs `long`
 * times its sitting height with its hind legs and its tail down. With a friend within `near` of it to either side
 * it hangs `short`, pulls its legs up and carries its tail in a crook beside it, so it stays above every head.
 */
export const HUNG = { long: 1.4, short: 1.1, neck: 84, held: 1.2, wide: 0.9, legs: 24, pulled: 2, thick: 13, near: 300, clear: 8 }
/** How far the fluffed cat is drawn against the dry one: twice the area at most. */
export const fluffScale = (fluff: number): number => 1 + (Math.SQRT2 - 1) * (fluff / 10)
/** How much longer than it sits the hung cat is drawn, from hanging free (`tuck` 0) to tucked up (1). */
export const hungStretch = (tuck: number): number => HUNG.long + (HUNG.short - HUNG.long) * tuck
/** How far its hind legs reach below its seat. */
export const hungLegs = (tuck: number): number => HUNG.legs + (HUNG.pulled - HUNG.legs) * tuck
/**
 * The hung cat's tail as the four points of one curve, `swing` from -1 to 1. Free, it hangs straight down from the
 * hip and swings like a pendulum. Tucked, it rises from the hip in a crook, and the end that hangs from the crook
 * swings as before, beside the body and no lower than the seat.
 */
export function hungTail(tuck: number, swing: number): [number, number][] {
  const free: [number, number][] = [[-34, -8], [-42 + swing * 7, 31], [-43 + swing * 27, 65], [-38 + swing * 60, 96]]
  const crook: [number, number][] = [[-34, -8], [-52, -96], [-88 + swing * 6, -84], [-78 + swing * 16, -12]]
  return free.map(([x, y], i) => [x + (crook[i][0] - x) * tuck, y + (crook[i][1] - y) * tuck])
}
/** The y of the peg end of the hung cat, which it swings about: its neck. */
export function hungNeck(place: number, fluff: number): number {
  return lineSpot(place).y + 50 - HUNG.neck * HUNG.held * fluffScale(fluff)
}
/** The lowest the hung cat reaches at a place of the line: the end of its legs or of its tail. */
export function hungLow(place: number, fluff: number, tuck: number): number {
  const tail = Math.max(...hungTail(tuck, 0).map(([, y]) => y)) + HUNG.thick / 2
  return hungNeck(place, fluff) + (HUNG.neck + Math.max(hungLegs(tuck), tail)) * hungStretch(tuck) * fluffScale(fluff)
}
/** Half the width of the hung cat with its tail, to the side its tail is on and to the other. */
export function hungReach(fluff: number, tuck: number): { left: number; right: number } {
  const tail = Math.max(...[-1, 1].flatMap((swing) => hungTail(tuck, swing).map(([x]) => -x))) + HUNG.thick / 2
  return { left: Math.max(62, tail) * HUNG.wide * fluffScale(fluff), right: 62 * HUNG.wide * fluffScale(fluff) }
}

/** The grass under a place, where a thing that falls off the line lands. */
export function underPlace(place: number): Spot {
  return { x: PLACE_X[place] + 70, y: FEET_Y + 14 }
}

/** A point brought onto the lawn. */
export function onLawn(x: number, y: number): Spot {
  return { x: Math.round(Math.max(LAWN.x, Math.min(LAWN.x + LAWN.w, x))), y: Math.round(Math.max(LAWN.y, Math.min(LAWN.y + LAWN.h, y))) }
}

/** The things a child must be able to hit to play a cycle through, as boxes. */
export function targets(): { name: string; box: Box }[] {
  return [
    { name: 'cloth', box: CLOTH },
    { name: 'rail', box: RAIL.box },
    { name: 'gate', box: GATE },
    ...PLACE_X.map((x, i) => {
      const oval = bodyOval(FRIEND_KINDS[i], x, FEET_Y, YARD_SCALE)
      return { name: FRIEND_KINDS[i], box: { x: oval.cx - oval.rx, y: oval.cy - oval.ry, w: oval.rx * 2, h: oval.ry * 2 } }
    }),
    ...PLACE_X.map((_, i) => ({ name: `line place ${i}`, box: boxAt(lineSpot(i).x, lineSpot(i).y, LINE_SIZE) })),
  ]
}
