import { CART, GNOMES, HEAD_HALF, SEATS, type Kind } from './ground'
import { STAGE } from './stage'

// How big a mushroom of a kind and a size is, in stage units. The model asks
// for what a finger can hit and the painter for what to paint, so the two
// agree. Sizes run from 1 (a button) to FULL (twelve steps).

export type Shape = {
  /** The whole mushroom: how far it stands above its foot, and how wide it is at its widest. */
  height: number
  width: number
  stemHeight: number
  stemWidth: number
  capWidth: number
  capHeight: number
  /** A bell's stem bends over, and the bell hangs this far to the side of the foot. */
  lean: number
}

export function shapeOf(kind: Kind, size: number): Shape {
  if (kind === 'red') {
    const stemHeight = 18 + 12.5 * size, capHeight = 40 + 3.6 * size, capWidth = 62 + 7.6 * size
    return { height: stemHeight + capHeight * 0.8, width: capWidth, stemHeight, stemWidth: 24 + 2.4 * size, capWidth, capHeight, lean: 0 }
  }
  if (kind === 'bell') {
    const stemHeight = 34 + 13 * size, capWidth = 50 + 5.4 * size, lean = 16 + 2.2 * size
    return { height: stemHeight + 12, width: capWidth + lean, stemHeight, stemWidth: 14 + 1 * size, capWidth, capHeight: 42 + 5.5 * size, lean }
  }
  const capWidth = 58 + 7.4 * size, capHeight = 48 + 9.4 * size
  return { height: capHeight, width: capWidth, stemHeight: 10, stemWidth: capWidth * 0.5, capWidth, capHeight, lean: 0 }
}

/**
 * The box a finger hits: never narrower or lower than a small hand needs, so a button of a mushroom is still easy
 * to poke, and reaching a finger's height above where a door's touch shape begins, so that the cap above a door is
 * never less than a finger high.
 */
export function hitBox(kind: Kind, size: number): { half: number; up: number } {
  const shape = shapeOf(kind, size)
  return { half: Math.max(50, shape.width / 2 + 6), up: Math.max(92, shape.height + 8, Math.ceil(FINGER - doorHit(kind, size).y0)) }
}

// ---------------------------------------------------------------- a house's parts

/** A box round a mushroom's foot, x to the side its bell hangs on and y downward: where a part is painted, and so where it is touched. */
export type Box = { x0: number; y0: number; x1: number; y1: number }

/** The door of a house of this kind and size: its box from the foot, before the mushroom is flipped. */
export function doorOf(kind: Kind, size: number): Box {
  const shape = shapeOf(kind, size)
  if (kind === 'red') {
    const w = shape.stemWidth * 0.62, h = Math.min(shape.stemHeight - 6, 16 + 3.4 * size)
    return { x0: -w / 2, y0: -h - 1, x1: w / 2, y1: -1 }
  }
  if (kind === 'bell') {
    const length = Math.min(shape.capHeight, shape.stemHeight - 8), top = -shape.stemHeight - 2
    const w = shape.capWidth * 0.3, h = length * 0.42, bottom = top + length * 0.86
    return { x0: shape.lean - w / 2, y0: bottom - h, x1: shape.lean + w / 2, y1: bottom }
  }
  const w = 16 + 1.6 * size, h = 20 + 3 * size
  return { x0: -w / 2, y0: -h - 2, x1: w / 2, y1: -2 }
}

/** The round window its gnome shows in: its middle from the foot and how big it is. */
export function windowOf(kind: Kind, size: number): { x: number; y: number; r: number } {
  const shape = shapeOf(kind, size)
  // Large enough that who lives there, and how he carries himself, is seen from across the glade.
  if (kind === 'red') return { x: shape.capWidth * 0.15, y: -shape.stemHeight - shape.capHeight * 0.4, r: 12 + 1.1 * size }
  if (kind === 'bell') {
    const length = Math.min(shape.capHeight, shape.stemHeight - 8)
    return { x: shape.lean, y: -shape.stemHeight - 2 + length * 0.25, r: 8 + 0.75 * size }
  }
  return { x: shape.capWidth * 0.18, y: -shape.capHeight * 0.66, r: 10 + 1.0 * size }
}

/** A red house's crooked chimney: where it comes out of the cap and where its top is. */
export function chimneyOf(size: number): { x: number; y: number; top: number } {
  const shape = shapeOf('red', size)
  const y = -shape.stemHeight - shape.capHeight * 0.6
  return { x: -shape.capWidth * 0.24, y, top: y - 16 - 1.5 * size }
}

/** A bell house's rope ladder: from under its door down to the moss. */
export function ladderOf(size: number): { x: number; y0: number; y1: number } {
  const door = doorOf('bell', size)
  return { x: (door.x0 + door.x1) / 2, y0: door.y1, y1: 2 }
}

/** The top of a mushroom, where its spores, its smoke and a hat that sticks out come from. */
export function topOf(kind: Kind, size: number): { x: number; y: number } {
  const shape = shapeOf(kind, size)
  return kind === 'bell' ? { x: shape.lean, y: -shape.stemHeight - 10 } : { x: 0, y: -shape.height }
}

/** A touch shape is never under this many units each way: 48 px on a tablet of 1024 by 768, where the stage is fitted at 0.868. */
export const FINGER = 58

/** A bell or a puffball up to this size is too small for its painted door and its cap to have a finger's height each. */
export const SMALL_HOUSE = 3

/**
 * Whether a house is too small for both its door and its cap: a bell or a puffball of the three smallest sizes,
 * whose door is painted on the cap itself. There the cap takes the tap and the pull up, and the door is reached
 * by its doorstep, on the moss in front of the foot. A red mushroom's door is in its stem and its cap is all above
 * it, so a red house is never too small, and on every other house the painted door is the door.
 */
export function doorstepped(kind: Kind, size: number): boolean {
  return kind !== 'red' && Math.round(size) <= SMALL_HOUSE
}

/**
 * What a finger hits as the door: the door over its whole painted height and the doorstep under it, and never the
 * cap above it. On a house too small for both (`doorstepped`) the door's touch shape starts a finger's height
 * below the top of the mushroom and is made up by the doorstep.
 */
export function doorHit(kind: Kind, size: number): Box {
  const door = doorOf(kind, size), mid = (door.x0 + door.x1) / 2, shape = shapeOf(kind, size)
  const half = Math.max(FINGER / 2, (door.x1 - door.x0) / 2 + 8)
  const top = doorstepped(kind, size) ? Math.max(door.y0 - 4, FINGER - shape.height) : door.y0 - 4
  return { x0: mid - half, y0: top, x1: mid + half, y1: Math.max(door.y1 + 12, top + FINGER) }
}

/** The part of a mushroom's own touch shape that no door's lies over: the cap, as a box round the foot. Never under a finger each way. */
export function capHit(kind: Kind, size: number): Box {
  const box = hitBox(kind, size), door = doorHit(kind, size), mid = kind === 'bell' ? shapeOf(kind, size).lean * 0.5 : 0
  return { x0: mid - box.half, y0: -box.up, x1: mid + box.half, y1: door.y0 }
}

/** A mushroom as it stands: enough to say where its parts are on the stage. */
export type Standing = { x: number; y: number; kind: Kind; size: number; flip: boolean }

/** A box round a foot, as a box of the stage: mirrored where the mushroom is painted the other way round. */
export function onStage(m: Standing, box: Box): Box {
  return m.flip ? { x0: m.x - box.x1, y0: m.y + box.y0, x1: m.x - box.x0, y1: m.y + box.y1 } : { x0: m.x + box.x0, y0: m.y + box.y0, x1: m.x + box.x1, y1: m.y + box.y1 }
}

export const inBox = (box: Box, x: number, y: number): boolean => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1
export const boxesMeet = (a: Box, b: Box): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/** What a finger hits as the mushroom itself, as a box of the stage. A bell's box lies over its bell, to the side of its foot. */
export function bodyBox(m: Standing, pull = 0): Box {
  const box = hitBox(m.kind, m.size)
  const mid = m.x + (m.kind === 'bell' ? (m.flip ? -1 : 1) * shapeOf(m.kind, m.size).lean * 0.5 : 0)
  return { x0: mid - box.half, y0: m.y - box.up - pull, x1: mid + box.half, y1: m.y + 14 }
}

/**
 * The door a finger hits, as a box of the stage. The cart stands just below the lowest feet at the right edge, and
 * what lies on it is the cart's: a doorstep there ends where the cart begins, and the door's shape is made up
 * above, as far as the cap keeps a finger's height of its own.
 */
export function doorBox(m: Standing): Box {
  const box = onStage(m, doorHit(m.kind, m.size))
  if (box.y1 <= CART.top || box.x1 <= CART.left || box.x0 >= CART.right) return box
  const capTop = m.y - hitBox(m.kind, m.size).up
  return { ...box, y0: Math.min(box.y0, Math.max(capTop + FINGER, CART.top - FINGER)), y1: CART.top }
}

/** Where a gnome stands to go in, and where a path has arrived: on the moss in front of the foot. */
export function stepAt(m: { x: number; y: number }): { x: number; y: number } {
  return { x: m.x, y: m.y + 16 }
}

/** How long and how high the tall gnome's hat lies on a doorstep. */
export const HAT_LIES = { long: 96, high: 40 } as const

/**
 * Where the tall gnome's hat lies when he had to leave it outside: on the moss beside the door and clear of it,
 * on the side towards the middle of the glade, or on the other side where that one lies behind a gnome's head.
 */
export function hatBox(m: Standing): Box {
  const door = doorBox(m), towards = m.x < 600 ? 1 : -1
  const at = (side: number): Box => {
    const from = side > 0 ? Math.max(door.x1, m.x + 30) + 6 : Math.min(door.x0, m.x - 30) - 6
    return side > 0 ? { x0: from, y0: m.y - HAT_LIES.high + 16, x1: from + HAT_LIES.long, y1: m.y + 16 } : { x0: from - HAT_LIES.long, y0: m.y - HAT_LIES.high + 16, x1: from, y1: m.y + 16 }
  }
  // How much of its length shows: what is not behind a gnome's head or hat, and not off the stage.
  const shows = (box: Box): number => {
    let hidden = Math.max(0, -box.x0) + Math.max(0, box.x1 - STAGE.width)
    for (const who of GNOMES) if (box.y1 > SEATS[who].top - 8) hidden += Math.max(0, Math.min(box.x1, SEATS[who].x + HEAD_HALF) - Math.max(box.x0, SEATS[who].x - HEAD_HALF))
    return HAT_LIES.long - hidden
  }
  const first = at(towards), other = at(-towards)
  return shows(other) > shows(first) ? other : first
}

/** What a finger hits as the hat on a doorstep: the hat as it lies, and a finger's height of it upward. */
export function hatHit(m: Standing): Box {
  const box = hatBox(m)
  return { ...box, y0: Math.min(box.y0, box.y1 - FINGER) }
}
