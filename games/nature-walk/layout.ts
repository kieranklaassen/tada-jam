import { STAGE } from './stage'
import { PLACES, type PlaceId } from './wood'

// Where everything in the wood stands, in stage units. Pure numbers: the
// scenery, the motion of the covers and the view all draw from these, and
// the tests hold the sizes, the gaps and the corners of the frame that stay
// bare. The room at the table has its own numbers in room.ts.
//
// The frame has three rows. At the top are the wheel, the low branch with its
// leaves, the jay on his nest and the burrow in its bank. In the middle are
// the log, the long grass and the open ground at the foot of the jay's tree.
// At the front are the hedgehog, the open path, the stone, the puddle and
// the toad on his stone.

export type P = { x: number; y: number }
export type Spot = P & { r: number }

export type PlaceSpots = {
  /** Where the cover rests shut: the circle that answers while it is shut, and the hollow once it is open. */
  shut: Spot
  /** Where the cover rests once it is open: a touch there shuts it again. */
  away: readonly Spot[]
  /** Where what is under it sits. */
  find: Spot
  /** Where the toad sits when he has leapt to this place: his feet. */
  seat: P
}

/** Where each cover turns or starts from: the point motion.ts moves it about. */
export const PIVOT = {
  grass: { x: 625, y: 566 },
  /** The lid of the log is hinged at its right end. */
  log: { x: 460, y: 532 },
  stone: { x: 590, y: 702 },
  puddle: { x: 800, y: 712 },
  branch: { x: 318, y: 272 },
  burrow: { x: 954, y: 276 },
} as const

export const SPOTS: Readonly<Record<PlaceId, PlaceSpots>> = {
  grass: { shut: { x: 625, y: 500, r: 74 }, away: [{ x: 509, y: 509, r: 50 }, { x: 741, y: 509, r: 50 }], find: { x: 625, y: 522, r: 50 }, seat: { x: 588, y: 398 } },
  log: { shut: { x: 350, y: 512, r: 74 }, away: [{ x: 374, y: 468, r: 56 }], find: { x: 330, y: 522, r: 50 }, seat: { x: 366, y: 744 } },
  stone: { shut: { x: 590, y: 702, r: 62 }, away: [{ x: 676, y: 650, r: 54 }], find: { x: 586, y: 708, r: 50 }, seat: { x: 450, y: 744 } },
  puddle: { shut: { x: 800, y: 712, r: 62 }, away: [{ x: 806, y: 644, r: 52 }], find: { x: 800, y: 716, r: 50 }, seat: { x: 956, y: 566 } },
  branch: { shut: { x: 318, y: 338, r: 78 }, away: [{ x: 252, y: 267, r: 58 }], find: { x: 318, y: 350, r: 50 }, seat: { x: 416, y: 246 } },
  burrow: { shut: { x: 895, y: 340, r: 74 }, away: [{ x: 905, y: 204, r: 56 }], find: { x: 897, y: 342, r: 50 }, seat: { x: 900, y: 538 } },
}

export const HEDGEHOG: Spot = { x: 160, y: 652, r: 100 }
export const JAY: Spot = { x: 756, y: 212, r: 80 }
export const NEST: Spot = { x: 730, y: 304, r: 58 }
export const WHEEL: Spot = { x: 128, y: 132, r: 82 }
/** The door of the house: the dark opening that leads to the room. */
export const DOOR: Spot = { x: 1120, y: 440, r: 76 }

/** The toad is drawn at this share of the size he was cut at. */
export const TOAD_SCALE = 0.76
/** His stone: the slab, where he sits on it (his feet), and the bare half beside him where a thing is set. */
export const SLAB = { x: 1056, y: 716, halfWidth: 112, halfHeight: 26 } as const
export const TOAD_HOME: P = { x: 1098, y: 716 }
export const STONE_SPOT: P = { x: 982, y: 700 }
/** Where he sits at the foot of the jay's tree. */
export const TOAD_FOOT: P = { x: 868, y: 580 }
/** How far round his feet a touch on the toad reaches, and how far above them his middle is. */
export const TOAD_REACH = 66
export const TOAD_RISE = 60

/** The point of the path before the hedgehog, where a thing set down for him comes to lie. */
export const NOSE: P = { x: 344, y: 702 }
/** How near the hedgehog's nose a thing must be let go to be set down before him. */
export const NOSE_REACH = 70
/** Where a thing lies in the puddle: the open water beside the leaf. */
export const PUDDLE_SLOT: P = { x: 902, y: 718 }
/** The far bank, where the worm climbs out. */
export const FAR_BANK: P = { x: 968, y: 610 }
/** The bank of the puddle where the jay lands to look at what glints in it. */
export const JAY_BANK: P = { x: 900, y: 634 }
/** The water: an ellipse let into the ground. */
export const PUDDLE = { x: 835, y: 714, rx: 104, ry: 46 } as const
/** The dip in the path the acorn rolls into, and the foot of the log the apple rolls against. */
export const DIP: P = { x: 432, y: 740 }
export const LOG_FOOT: P = { x: 404, y: 636 }
/**
 * Where the worm lies when it has inched along the path and tucked its head in, and how it is turned there: its
 * head under the left edge of the stone, under the foot of the left fan of the long grass, or down among the
 * blades at the front.
 */
export const TUCKS = {
  stone: { x: 516, y: 706, turn: 0 },
  grass: { x: 548, y: 606, turn: -Math.PI / 2 },
  front: { x: 499, y: 748, turn: Math.PI / 2 },
} as const
export type Tuck = keyof typeof TUCKS
/** By the step of the house: where a thing that rolled out of the door comes to lie. */
export const STEP: P = { x: 992, y: 582 }
/** Where things tipped out of the nest land, at the foot of the jay's tree, in the order they are used. */
export const FOOT_SPOTS: readonly P[] = [
  { x: 822, y: 468 }, { x: 906, y: 462 }, { x: 990, y: 468 },
  { x: 826, y: 552 }, { x: 910, y: 548 }, { x: 990, y: 552 },
]
/** Where things lie in the nest: they show over its rim. */
export const NEST_SLOTS: readonly P[] = [
  { x: 700, y: 296 }, { x: 760, y: 296 }, { x: 730, y: 290 }, { x: 684, y: 302 }, { x: 776, y: 302 }, { x: 730, y: 300 },
]
/** Where the apple sits when the hedgehog wears it: on the spines of his back, and on the ball. */
export const ON_SPINES: P = { x: 52, y: 624 }

/** The open ground where a thing can lie: the path at the front, and the foot of the jay's tree. */
export const GROUND: readonly { x0: number; y0: number; x1: number; y1: number }[] = [
  { x0: 332, y0: 632, x1: 506, y1: 742 },
  { x0: 822, y0: 456, x1: 990, y1: 566 },
]
/** How much room a thing takes where it lies. */
export const THING_R = 40

/** The cut pieces that hang on threads from the top of the frame and swing when the wood is knocked. */
export const HANGERS: readonly (P & { kind: 'cloud' | 'sun' | 'bird'; thread: number })[] = [
  { kind: 'cloud', x: 290, y: 112, thread: 130 },
  { kind: 'cloud', x: 476, y: 78, thread: 96 },
  { kind: 'bird', x: 930, y: 92, thread: 110 },
  { kind: 'sun', x: 1070, y: 132, thread: 170 },
]

export function within(at: P, spot: Spot): boolean {
  const dx = at.x - spot.x, dy = at.y - spot.y
  return dx * dx + dy * dy <= spot.r * spot.r
}

export const near = (a: P, b: P): number => Math.hypot(a.x - b.x, a.y - b.y)

/** Everything fixed that answers as itself, with every cover shut or every cover open: what the layout test measures. */
export function answerers(allOpen: boolean): { name: string; owner: string; spot: Spot }[] {
  const list: { name: string; owner: string; spot: Spot }[] = []
  for (const place of PLACES) {
    const spots = SPOTS[place]
    list.push({ name: `${place} shut`, owner: place, spot: spots.shut })
    if (allOpen) {
      list.push({ name: `${place} find`, owner: place, spot: spots.find })
      spots.away.forEach((spot, index) => list.push({ name: `${place} away ${index}`, owner: place, spot }))
    }
  }
  list.push({ name: 'hedgehog', owner: 'hedgehog', spot: HEDGEHOG }, { name: 'jay', owner: 'jay', spot: JAY })
  list.push({ name: 'toad', owner: 'toad', spot: { x: TOAD_HOME.x, y: TOAD_HOME.y - TOAD_RISE, r: TOAD_REACH } })
  list.push({ name: 'wheel', owner: 'wheel', spot: WHEEL }, { name: 'door', owner: 'door', spot: DOOR }, { name: 'nest', owner: 'jay', spot: NEST })
  return list
}

/** The jam's round home control: 48 px across, at the top centre, 10 px from the top edge, in surface pixels. */
export function homeControl(surfaceWidth: number): Spot {
  return { x: surfaceWidth / 2, y: 34, r: 24 }
}

/** The grown-up's corner, in surface pixels: the top right 72 by 72. */
export const CORNER = 72

export const STAGE_SIZE = STAGE
