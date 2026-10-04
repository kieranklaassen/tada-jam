// Where every piece of the room sits. Pure: no DOM, no clock.
//
// The room is laid out in design units on one of two frames, a wide one and a
// tall one, and the frame is scaled to fit the surface and centred on it. So
// nothing is in pixels: a spot is in design units, and `scale`, `ox` and `oy`
// take it to the surface. Touch targets are given on the surface, in logical
// pixels, since that is where a finger lands.

import { CARES, type Care } from '../needs'

export type Spot = { x: number; y: number }
/** A box on the surface, in logical pixels. */
export type Rect = { x: number; y: number; w: number; h: number }

/** The pieces that are not care things. A spot is the piece's origin: where it stands, or its centre if it hangs or lies. */
export type Piece = 'door' | 'waiting' | 'table' | 'patient' | 'lamp' | 'window' | 'gardenLeft' | 'gardenRight' | 'leaf' | 'cart' | 'mouse'

export type Layout = {
  portrait: boolean
  /** Logical pixels per design unit, and where the frame's corner lies on the surface. */
  scale: number
  ox: number
  oy: number
  /** The frame, in design units. */
  frame: { w: number; h: number }
  /** The floor: its top edge, and how far it runs so it reaches the surface's edges, in design units. */
  floor: { x: number; y: number; w: number; h: number }
  pieces: Readonly<Record<Piece, Spot>>
  /** The centre of each care thing where it lies on the cart, in design units. */
  things: Readonly<Record<Care, Spot>>
  targets: { cares: Readonly<Record<Care, Rect>>; waiting: Rect }
}

/** The size of a care thing's touch target, in design units. A thing is drawn inside it. */
export const THING = { w: 132, h: 122 } as const
/** The touch target of the one who waits, about its spot (which is where it sits). */
const WAITING = { w: 230, h: 236 } as const
/** No touch target reaches into this share of the height at the bottom of the frame. */
export const BOTTOM_STRIP = 0.12

/** The cart: two trays of three places. The mouse has the sixth place. */
export const CART = { w: 462, trayH: 152, gap: 22, rail: 26, wheels: 42, column: 150 } as const
export const CART_HEIGHT = CART.rail + CART.trayH * 2 + CART.gap + CART.wheels
/** How high the table's top stands above the floor. */
export const TABLE_HEIGHT = 176

type Frame = { w: number; h: number; floorY: number; door: number; table: number; lampY: number; window: Spot; cart: Spot }

const WIDE: Frame = { w: 1180, h: 820, floorY: 700, door: 138, table: 478, lampY: 150, window: { x: 905, y: 166 }, cart: { x: 905, y: 708 } }
// The tall frame is wider than a tall tablet in logical pixels, so the whole room is drawn a little smaller there.
const TALL: Frame = { w: 940, h: 1352, floorY: 750, door: 150, table: 484, lampY: 190, window: { x: 762, y: 170 }, cart: { x: 470, y: 1180 } }

/** Which place on the cart each care thing lies at: tray (0 above, 1 below) and column (0 to 2). */
const PLACES: Readonly<Record<Care, readonly [number, number]>> = {
  plaster: [0, 0],
  bowl: [0, 1],
  blanket: [1, 0],
  brush: [1, 1],
  basket: [1, 2],
}
const MOUSE_PLACE = [0, 2] as const

function cartSpot(frame: Frame, tray: number, column: number): Spot {
  const top = frame.cart.y - CART_HEIGHT + CART.rail
  return {
    x: frame.cart.x + (column - 1) * CART.column,
    y: top + tray * (CART.trayH + CART.gap) + CART.trayH / 2,
  }
}

export function layout(width: number, height: number): Layout {
  const portrait = height > width
  const frame = portrait ? TALL : WIDE
  const scale = Math.min(width / frame.w, height / frame.h)
  const ox = (width - frame.w * scale) / 2, oy = (height - frame.h * scale) / 2
  const onSurface = (x: number, y: number, w: number, h: number): Rect => ({ x: ox + x * scale, y: oy + y * scale, w: w * scale, h: h * scale })

  const tableTop = frame.floorY - TABLE_HEIGHT
  const mouse = cartSpot(frame, MOUSE_PLACE[0], MOUSE_PLACE[1])
  const pieces: Record<Piece, Spot> = {
    // The door stands where the wall meets the floor; the floor's edge lies over its foot.
    door: { x: frame.door, y: frame.floorY - 12 },
    waiting: { x: frame.door + 14, y: frame.floorY + 6 },
    table: { x: frame.table, y: tableTop },
    patient: { x: frame.table, y: tableTop + 12 },
    lamp: { x: frame.table, y: frame.lampY },
    window: frame.window,
    gardenLeft: { x: frame.window.x - 62, y: frame.window.y + 72 },
    gardenRight: { x: frame.window.x + 66, y: frame.window.y + 76 },
    leaf: { x: frame.window.x - 4, y: frame.window.y - 94 },
    cart: frame.cart,
    // The mouse stands on its tray, so its spot is the foot of its place.
    mouse: { x: mouse.x, y: mouse.y + CART.trayH / 2 - 22 },
  }

  const things = {} as Record<Care, Spot>
  const cares = {} as Record<Care, Rect>
  for (const care of CARES) {
    const spot = cartSpot(frame, PLACES[care][0], PLACES[care][1])
    things[care] = spot
    cares[care] = onSurface(spot.x - THING.w / 2, spot.y - THING.h / 2, THING.w, THING.h)
  }

  // The floor runs past the frame to the surface's edges, sideways and down.
  const left = -ox / scale, bottom = (height - oy) / scale
  return {
    portrait,
    scale,
    ox,
    oy,
    frame: { w: frame.w, h: frame.h },
    floor: { x: left, y: frame.floorY - 22, w: width / scale, h: bottom - (frame.floorY - 22) },
    pieces,
    things,
    targets: { cares, waiting: onSurface(pieces.waiting.x - WAITING.w / 2, pieces.waiting.y - WAITING.h - 6, WAITING.w, WAITING.h) },
  }
}
