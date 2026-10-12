import { BASKET, FOLK, HANDS, LANTERNS, POT, WHO, WINDOW, inEllipse, type Who } from './hall'
import { handAt } from './holds'
import type { Craft, Thing } from './things'

// The hall as a round of five places: the four stalls and the door. Where
// everything a child touches stands at each of them, in stage units, and what
// a touch lands on. The rules, the view and the tests read their places from
// here and from hall.ts, so a thing is touched where it is drawn.

export type Place = 'candle' | 'star' | 'wreath' | 'biscuit' | 'door'
export const PLACES: readonly Place[] = ['candle', 'star', 'wreath', 'biscuit', 'door']
export type Stall = Exclude<Place, 'door'>
export const STALLS: readonly Stall[] = ['candle', 'star', 'wreath', 'biscuit']

export function isStall(place: Place): place is Stall {
  return place !== 'door'
}

/** The place next along the hall, to the left (-1) or the right (1). The hall is a round: past the door comes the candle stall again. */
export function neighbour(place: Place, dir: -1 | 1): Place {
  return PLACES[(PLACES.indexOf(place) + dir + PLACES.length) % PLACES.length]
}

/** The two dark walking lanterns that stand on the floor at the left and the right edge of every place. */
export const WALK = { left: { x: 72, y: 762, r: 52 }, right: { x: 1108, y: 762, r: 52 } } as const

/** Along the front, at the foot of the cloth: the three colours a stall has (wax pots, paper rolls, ribbon spools, icing bags), gold first. */
export const SOURCE = { y: 768, rx: 54, ry: 44 } as const
export const COLOUR_X = [215, 335, 455] as const
/** And the three sizes the star stall (sheets), the wreath stall (bundles of twigs) and the biscuit stall (tins) have, small first. */
export const SIZE_X = [640, 760, 880] as const
/** The cloth that lies over the second and third colour until it is lifted. */
export const CLOTH = { x: 272, y: 716, w: 246, h: 104 } as const

/** The star on the window pane, by its sheet's size. */
export const STAR = { x: 590, y: 330, r: [62, 86, 110] } as const
/** The straw ring on its hook: twigs are bound on in a band round it. */
export const RING = { x: 590, y: 350, r: 100, band: 36 } as const
/** The board with the dough, and the biscuit on it by its tin. One icing cell is `cell` across. */
export const BOARD = { x: 590, y: 400, r: [62, 84, 106], cell: 30, dough: 128 } as const
/** The doorway: its opening, and the sill the basket is carried over. */
export const DOORWAY = { left: 462, right: 718, top: 170, sill: 640 } as const
/** Where the basket stands in the snow once it has been carried out. */
export const SNOW = { x: 590, y: 600 } as const

/** The middle of each stall's bench, where a thing brought from the basket is used, and how near counts. */
export const BENCH: Record<Stall, { x: number; y: number; r: number }> = {
  candle: { x: POT.x, y: POT.y - 30, r: 150 },
  star: { x: STAR.x, y: STAR.y, r: 140 },
  wreath: { x: RING.x, y: RING.y, r: RING.r + RING.band },
  biscuit: { x: BOARD.x, y: BOARD.y, r: 140 },
}

/** The six places in the basket, three behind and three in front: each is its own target. */
export const SLOT = { w: 64, h: 68 } as const
export function slotAt(index: number): { x: number; y: number } {
  return { x: BASKET.x - SLOT.w + (index % 3) * SLOT.w, y: index < 3 ? 548 : 596 }
}

/** The hanging lanterns, which swing when touched. */
export const LAMPS = LANTERNS

export type Spot =
  | { kind: 'slot'; index: number }
  | { kind: 'basket' }
  | { kind: 'lantern'; dir: -1 | 1 }
  | { kind: 'cloth' }
  | { kind: 'colour'; index: number }
  | { kind: 'size'; index: number }
  | { kind: 'bench' }
  | { kind: 'who'; who: Who }
  | { kind: 'lamp'; index: number }
  | { kind: 'window' }
  | { kind: 'wall' }

/** What of the fair decides what a touch lands on. */
export type Standing = {
  place: Place
  /** Whether the place's cloth still lies over its second and third colour. */
  covered: boolean
  /** How many things lie in the basket. */
  things: number
  /** Whether the basket has been carried out: it then stands in the snow by the door and nowhere else. */
  finished: boolean
  /** What each fair-goer is seen to hold: the thing is touched where it is held, which is not always on its holder. */
  held?: Partial<Record<Who, Craft>>
  /** The piece in work at the place: where it is drawn it lies over a hand held out, and a finger there is on the piece. */
  piece?: Thing | null
}

/** The goat's chin is in front of the tuba player, and the bundle sits in front of the window. */
const FRONT_FIRST = ['goat', 'bundle', 'maker', 'baker', 'tuba'] as const

/** How near a thing in a fair-goer's hand a finger must land to be on it. */
export const HELD_REACH = 46

const near = (x: number, y: number, at: { x: number; y: number }, rx: number, ry: number): boolean => inEllipse(x, y, { x: at.x, y: at.y, rx, ry })

/** Whether a stall has sizes to choose: sheets at the star stall, bundles of twigs at the wreath stall, tins at the biscuit stall. */
export function hasSizes(place: Place): boolean {
  return place === 'star' || place === 'wreath' || place === 'biscuit'
}

/** Whether a point is over the basket where it stands on the counter (or hangs on its hook, at the door). */
export function overBasket(x: number, y: number): boolean {
  return x > BASKET.x - BASKET.rx - 8 && x < BASKET.x + BASKET.rx + 8 && y > 456 && y < BASKET.bottom
}

/** Whether a point is in the open doorway, over the sill or beyond it. */
export function inDoorway(x: number, y: number): boolean {
  return x > DOORWAY.left && x < DOORWAY.right && y > DOORWAY.top
}

/** Whether a point is on the stall's own working piece: the wax and the pot, the star's pane, the ring, the board. */
export function onBench(place: Place, x: number, y: number): boolean {
  switch (place) {
    case 'candle':
      return inEllipse(x, y, { x: POT.x, y: POT.y + 20, rx: POT.rx + 14, ry: POT.ry + 44 })
    case 'star':
      return Math.hypot(x - STAR.x, y - STAR.y) <= STAR.r[2] + 22
    case 'wreath':
      return Math.hypot(x - RING.x, y - RING.y) <= RING.r + RING.band
    case 'biscuit':
      return Math.hypot(x - BOARD.x, y - BOARD.y) <= BOARD.dough
    case 'door':
      return inDoorway(x, y)
  }
}

/**
 * Whether a point is on the piece in work as it is drawn on its bench: the star on its pane, the ring with its
 * twigs, the sheet of dough, or the biscuit the tin cut, which is smaller than the board it lies on.
 */
export function drawnOn(piece: Thing, x: number, y: number): boolean {
  switch (piece.craft) {
    case 'star':
      return Math.hypot(x - STAR.x, y - STAR.y) <= STAR.r[piece.size] + 22
    case 'wreath':
      return Math.hypot(x - RING.x, y - RING.y) <= RING.r + RING.band
    case 'biscuit':
      return piece.cut ? Math.hypot(x - BOARD.x, y - BOARD.y) <= BOARD.r[piece.tin] + 4 : inEllipse(x, y, { x: BOARD.x, y: BOARD.y, rx: BOARD.dough, ry: BOARD.dough * 0.94 })
    case 'candle':
      return false
  }
}

/** What a touch lands on, nearest the child first. The dipping stick and its candle are asked before this (dipping.ts). */
export function spotAt(x: number, y: number, s: Standing): Spot {
  const stall = isStall(s.place)
  // The basket: on the counter at a stall, on its hook at the door, in the snow once it has been carried out.
  if (s.finished) {
    if (s.place === 'door' && near(x, y, { x: SNOW.x, y: SNOW.y - 40 }, BASKET.rx + 10, 96)) return { kind: 'basket' }
  } else if (overBasket(x, y)) {
    // A thing in the basket answers for itself, at a stall and on the hook at the door alike. The two rows
    // overlap: of the things under the finger, the one whose middle is nearest answers.
    let best = -1, reach = Infinity
    for (let i = 0; i < Math.min(s.things, BASKET.slots); i++) {
      const at = slotAt(i)
      if (Math.abs(x - at.x) > SLOT.w / 2 || Math.abs(y - at.y) > SLOT.h / 2) continue
      const far = Math.hypot(x - at.x, y - at.y)
      if (far < reach) { best = i; reach = far }
    }
    if (best >= 0) return { kind: 'slot', index: best }
    return { kind: 'basket' }
  }
  // A thing a fair-goer holds is in front of whatever is behind it: a finger on it is on its holder.
  if (s.held) for (const who of WHO) {
    const craft = s.held[who]
    if (!craft) continue
    const at = handAt(who, craft)
    if (Math.hypot(x - at.x, y - at.y) <= HELD_REACH) return { kind: 'who', who }
  }
  if (Math.hypot(x - WALK.left.x, y - WALK.left.y) <= WALK.left.r) return { kind: 'lantern', dir: -1 }
  if (Math.hypot(x - WALK.right.x, y - WALK.right.y) <= WALK.right.r) return { kind: 'lantern', dir: 1 }
  if (stall) {
    if (s.covered && x >= CLOTH.x && x <= CLOTH.x + CLOTH.w && y >= CLOTH.y) return { kind: 'cloth' }
    for (let i = 0; i < COLOUR_X.length; i++) if (near(x, y, { x: COLOUR_X[i], y: SOURCE.y }, SOURCE.rx, SOURCE.ry)) return { kind: 'colour', index: i }
    if (hasSizes(s.place)) for (let i = 0; i < SIZE_X.length; i++) if (near(x, y, { x: SIZE_X[i], y: SOURCE.y }, SOURCE.rx, SOURCE.ry)) return { kind: 'size', index: i }
  }
  // A hand held out is drawn in front of the bench and of the doorway, and is its owner's: a finger on it is on
  // him or her, not on the board or the pane behind. Only the piece in work lies over a hand, where it is drawn.
  const hand = handOf(x, y)
  if (hand && !(s.piece && drawnOn(s.piece, x, y))) return { kind: 'who', who: hand }
  if (onBench(s.place, x, y)) return { kind: 'bench' }
  const who = whoAt(x, y)
  if (who) return { kind: 'who', who }
  for (let i = 0; i < LAMPS.length; i++) if (Math.hypot(x - LAMPS[i].x, y - LAMPS[i].y - 22) < 46) return { kind: 'lamp', index: i }
  if (x > WINDOW.x && x < WINDOW.x + WINDOW.w && y > WINDOW.y && y < WINDOW.y + WINDOW.h) return { kind: 'window' }
  return { kind: 'wall' }
}

/** The fire door under the pot, with its embers: only at the candle stall. */
export const EMBERS = { x: POT.x, y: 790, rx: 78, ry: 52 } as const
export function inEmbers(x: number, y: number): boolean {
  return inEllipse(x, y, EMBERS)
}

/** The two rails of candles dipped earlier, either side of the stick. */
export function onRack(x: number, y: number): boolean {
  return y > 140 && y < 270 && (Math.abs(x - 470) < 60 || Math.abs(x - 710) < 60)
}

/** Whose held-out hand a point is on, or null. */
export function handOf(x: number, y: number): Who | null {
  for (const who of FRONT_FIRST) if (inEllipse(x, y, HANDS[who])) return who
  return null
}

/** Which fair-goer a thing let go at this point is given to, or null. */
export function whoAt(x: number, y: number): Who | null {
  // The hand it holds out first, then the body: a hand reaches in front of a neighbour.
  for (const who of FRONT_FIRST) if (inEllipse(x, y, HANDS[who])) return who
  for (const who of FRONT_FIRST) if (inEllipse(x, y, FOLK[who].touch)) return who
  return null
}
