import { REST, poseOf, type Pose } from './gestures'
import { GRID, type Actor } from './pairings'
import { CARDS, type CardId } from './sprites'
import { PLACES, ROWS, type PlaceId, type Rect, type ThingId } from './yard'

// Where each thing is shown in each place, and as which card: the last picture
// of the thirty pairings. A thing in a place is drawn here and nowhere else,
// so what a save rebuilds on load is exactly what the scene left.

export type Look = {
  x: number
  y: number
  tilt: number
  scale: number
  /** The card it is shown as once the pairing has turned it into what it leaves; the plain thing before that. */
  card: CardId | null
  /** Nothing of it is drawn below this height: the waterline of the pond. */
  cut?: number
  alpha: number
  /** Where it is before it has turned, where that is another spot (the cabbage wig, before it is a collar). */
  before?: { x: number; y: number }
}

const look = (x: number, y: number, more: Partial<Look> = {}): Look => ({ x, y, tilt: 0, scale: 0.9, card: null, alpha: 1, ...more })

/** Where a thing floats in the pond: between the reeds and the frog's lily pad. */
const FLOAT_X = 404
/** The waterline: what floats is cut off below it. */
export const WATER = 748
/** Where a thing hangs on the washing line, and how far along the line that is. */
export const HANG = { u: 0.4, x: 567, y: 336 }
/** The scarecrow's head, hand, neck and hat peg, as he stands. */
export const ON_HIM = { head: { x: 250, y: 190 }, peg: { x: 250, y: 186 }, hand: { x: 346, y: 290 }, neck: { x: 250, y: 342 } }
/** Where the goose sits on the nest, hops under the line and lands in the pond: clear of the frog on his pad. */
export const GOOSE_AT = {
  nest: { x: 700, y: 450, face: -1 as const },
  // Under the line she stands a little to the right of what hangs there, so her beak is under it and her card is clear of the raccoon.
  under: { x: HANG.x + 64, y: ROWS[1], face: -1 as const },
  pond: { x: 362, y: 722, face: -1 as const },
}

export const LOOKS: Record<PlaceId, Record<ThingId, Look>> = {
  nest: {
    ball: look(704, 446),
    potato: look(650, 446),
    clock: look(650, 448),
    boot: look(654, 444, { tilt: 1.3 }),
    cabbage: look(650, 446, { card: 'cabbageHeart' }),
    egg: look(650, 444),
  },
  pond: {
    ball: look(FLOAT_X, 758, { cut: WATER - 4 }),
    potato: look(FLOAT_X, 764, { alpha: 0.4, scale: 0.8 }),
    clock: look(FLOAT_X, 766, { alpha: 0.4, scale: 0.8 }),
    boot: look(FLOAT_X, 784, { cut: WATER }),
    cabbage: look(FLOAT_X, 744, { card: 'cabbagePad', scale: 1 }),
    egg: look(FLOAT_X, 762, { cut: WATER - 2 }),
  },
  scarecrow: {
    ball: look(ON_HIM.peg.x, ON_HIM.peg.y),
    potato: look(ON_HIM.hand.x, ON_HIM.hand.y, { card: 'potatoFace' }),
    clock: look(ON_HIM.neck.x, ON_HIM.neck.y),
    boot: look(ON_HIM.head.x + 4, ON_HIM.head.y),
    cabbage: look(ON_HIM.neck.x, 300, { card: 'collar', scale: 1, before: { x: ON_HIM.head.x, y: ON_HIM.head.y + 2 } }),
    egg: look(ON_HIM.head.x, ON_HIM.head.y - 2),
  },
  bowl: {
    ball: look(884, 732),
    potato: look(884, 734),
    clock: look(884, 736),
    boot: look(906, 752, { tilt: -1.25 }),
    cabbage: look(884, 734, { card: 'cabbageHeart' }),
    // Buried: the egg is under the mound the dog lies on.
    egg: look(884, 730),
  },
  line: {
    ball: look(460, 384),
    // At the point of the V the line hangs in under its weight.
    potato: look(HANG.x, 383),
    clock: look(HANG.x, HANG.y + 2),
    boot: look(HANG.x, HANG.y + 6, { tilt: 0.45 }),
    cabbage: look(HANG.x, HANG.y - 14, { card: 'cabbageHeart' }),
    egg: look(HANG.x, HANG.y - 60, { card: 'sockEgg', scale: 1 }),
  },
}

/** Where a thing floats before it has sunk: the potato and the clock go down from here. */
export const AFLOAT = { y: 750, scale: 0.9 }
/** Where the mound is, with the dog on it. */
export const MOUND = { x: 944, y: 752 }
/** How far the dog shoves his bowl away. */
export const SHOVED = -42

// --- The washing line -------------------------------------------------------------

/** The rope, from the scarecrow's side to the barn, and how far it hangs in by itself. */
export const LINE = { x1: 356, y1: 250, x2: 884, y2: 212, sag: 34 } as const
/** The washing: how far along the rope each piece hangs, and where it has slid to with the potato on the line. */
export const WASHING = [{ card: 'longjohns', u: 0.22, slid: 0.25 }, { card: 'sheet', u: 0.62, slid: 0.58 }, { card: 'sock', u: 0.8, slid: 0.745 }, { card: 'sock', u: 0.89, slid: 0.83 }] as const
/** The prop that holds the rope up. */
export const POLE = { x: 404, y: 470 } as const
/** How deep the line sags under the potato, at the spot where things hang. */
export const SAG = 96
/** Where the scarecrow, the dog's kennel and the reeds of the pond stand. */
export const SCARECROW = { x: 250, y: 462 } as const
export const KENNEL = { x: 1046, y: 716 } as const
export const REEDS = { x: 306, y: 768 } as const
/** Where the crow perches on the scarecrow's shoulder, the frog sits on his lily pad and the dog sits by his bowl. */
export const CROW = { x: 196, y: 262 } as const
export const FROG = { x: 520, y: 722 } as const
export const DOG = { x: 968, y: 736 } as const

/** Where the washing line hangs at `u` along it, with the potato's weight on it `sag` of the way down. */
export function lineAt(u: number, sag = 0): { x: number; y: number } {
  const l = LINE
  const vee = u <= HANG.u ? u / HANG.u : (1 - u) / (1 - HANG.u)
  return { x: l.x1 + (l.x2 - l.x1) * u, y: l.y1 + (l.y2 - l.y1) * u + l.sag * 4 * u * (1 - u) * (1 - sag * 0.8) + SAG * sag * vee }
}

// --- Where a finger on the drawing lands ------------------------------------------

/** No box a finger is meant for is smaller than this across. */
const TOUCH_MIN = 56

/** The box a card is drawn in with its pin at (x, y): a turned card takes the box of its turned middle. */
function boxOf(id: CardId, x: number, y: number, tilt = 0, scale = 1): Rect {
  const card = CARDS[id]
  const mx = (card.w / 2 - card.ax) * scale, my = (card.h / 2 - card.ay) * scale
  const cx = x + mx * Math.cos(tilt) - my * Math.sin(tilt), cy = y + mx * Math.sin(tilt) + my * Math.cos(tilt)
  const w = Math.max(TOUCH_MIN, (tilt ? Math.max(card.w, card.h) : card.w) * scale), h = Math.max(TOUCH_MIN, (tilt ? Math.max(card.w, card.h) : card.h) * scale)
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

/**
 * The box a thing is drawn in while it rests in a place: its last picture, at the spot and on the card the
 * frame draws. Null for the egg the dog has buried, of which nothing is drawn.
 */
export function restBox(place: PlaceId, thing: ThingId): Rect | null {
  if (place === 'bowl' && thing === 'egg') return null
  const look = LOOKS[place][thing]
  // A bowl the dog shoved away stays shoved, with what is in it.
  const shoved = place === 'bowl' && GRID[thing].bowl.acts.some((act) => act.who === 'bowl' && act.does === 'shoved') ? SHOVED : 0
  return boxOf(look.card ?? thing, look.x + shoved, look.y, look.tilt, look.scale)
}

/**
 * How a place's owner is left by the last picture of the thing the place holds: the end of its last move in that
 * cell, which is the pose the frame holds it in. At rest when the place is empty or the owner has no part.
 */
export function ownerRest(who: Actor, place: PlaceId, held: ThingId | null): Pose {
  if (!held) return REST
  let does: string | null = null
  for (const act of GRID[held][place].acts) if (act.who === who) does = act.does
  return does ? poseOf(who, does, 1) : REST
}

/**
 * Everything a place is drawn as, as it stands with `held` in it: its own patch of the stage, its owner in the
 * pose that picture leaves it in, and the thing in it. A finger on any of these has touched the place. The
 * washing line's patch is only the head of its prop: the rest is its rope, its washing and its prop, wherever they hang.
 */
export function drawnBoxes(place: PlaceId, held: ThingId | null): Rect[] {
  const boxes: Rect[] = [PLACES[place].hit]
  if (place === 'scarecrow') {
    // He stands taller or lower in some pictures: his head and peg, his two arms out to his straw hands, the foot of his pole.
    const he = ownerRest('scarecrow', place, held), crow = ownerRest('crow', place, held)
    boxes.push({ x: SCARECROW.x - 52, y: SCARECROW.y - 330 + he.dy, w: 104, h: 120 }, { x: SCARECROW.x - 128, y: 258 + he.dy, w: 256, h: 56 }, { x: SCARECROW.x - 40, y: SCARECROW.y - 22, w: 80, h: 28 })
    // His crow, wherever the picture leaves it: on his shoulder, on the ball, on the egg, at his hand.
    boxes.push(boxOf(crow.card ?? 'crow', CROW.x + crow.dx, CROW.y + crow.dy + he.dy, crow.tilt, crow.scale))
  }
  if (place === 'bowl') {
    // The roof of the kennel, which stands higher than the dog's patch, and the dog as the picture leaves him.
    const dog = ownerRest('dog', place, held)
    boxes.push({ x: KENNEL.x - 56, y: KENNEL.y - 158, w: 116, h: 34 }, boxOf('dog', DOG.x + dog.dx, DOG.y + dog.dy, dog.tilt))
  }
  if (place === 'pond') {
    // The reeds at the left of the pond, and the frog wherever he sits: on his pad, on the ball, in the boot.
    const frog = ownerRest('frog', place, held)
    boxes.push({ x: REEDS.x - 60, y: REEDS.y - 104, w: 56, h: 100 }, boxOf(frog.card ?? 'frog', FROG.x + frog.dx, FROG.y + frog.dy, frog.tilt, frog.scale))
  }
  if (place === 'line') {
    // The rope from end to end as it hangs, the washing where it has slid to under the potato, and the prop.
    const down = held === 'potato' ? 1 : 0
    for (let i = 0; i <= ROPE_BOXES; i++) { const at = lineAt(i / ROPE_BOXES, down); boxes.push({ x: at.x - 16, y: at.y - ROPE_REACH, w: 32, h: ROPE_REACH * 2 }) }
    for (const piece of WASHING) { const at = lineAt(piece.u + (piece.slid - piece.u) * down, down); boxes.push(boxOf(piece.card, at.x, at.y)) }
    boxes.push(boxOf('pole', POLE.x, POLE.y))
  }
  const thing = held ? restBox(place, held) : null
  if (thing) boxes.push(thing)
  return boxes
}
/** How many boxes follow the rope, and how far above and below it a finger still has it. */
const ROPE_BOXES = 24, ROPE_REACH = 22

/** Where the glow lies and the ghost hand taps to show a place to a raccoon with full paws: on the place as it is drawn. */
export function showSpot(place: PlaceId): { x: number; y: number } {
  // The washing line is shown on its rope, where a thing would be pegged.
  if (place === 'line') return { x: HANG.x, y: lineAt(HANG.u).y + 4 }
  return { x: PLACES[place].holds.x, y: PLACES[place].holds.y - 22 }
}

/** The middle of a thing that rests in a place: where the glow lies and the ghost hand taps. */
export function restMiddle(place: PlaceId, thing: ThingId): { x: number; y: number } {
  const box = restBox(place, thing)
  return box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : { x: MOUND.x, y: MOUND.y - 20 }
}
