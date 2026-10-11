import { STAGE } from './stage'
import { ANIMALS, type AnimalId } from './state'

// Where everything stands on the page, in stage units (stage.ts). The page is
// a farmyard seen from the front: the henhouse on the left, the pony in the
// middle and the goat on the right stand along the back; the hens' patch, the
// pale step with the four things, and the pig in its wallow lie along the
// front. Nothing here draws: the view paints from these numbers and the model
// hit-tests against them, so a target is where it looks.

export const THINGS = ['scoop', 'bucket', 'brush', 'fork'] as const
export type ThingId = (typeof THINGS)[number]

export type Point = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }
export type Circle = { x: number; y: number; r: number }

export const inBox = (p: Point, b: Box): boolean => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h
export const inCircle = (p: Point, c: Circle): boolean => Math.hypot(p.x - c.x, p.y - c.y) <= c.r
export const centreOf = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })

/**
 * The jam draws one round home control over every game at the top centre, 48 px across and 10 px from the top
 * edge of the surface. On a small surface the stage shrinks and the control does not, so the keep-out is wider
 * than the control at the size of the stills. Nothing that is a target stands in it.
 */
export const HOME_CONTROL: Box = { x: STAGE.width / 2 - 80, y: 0, w: 160, h: 104 }
/**
 * The stage kept clear of targets under the grown-up's corner (overlay.ts), with the same allowance for a small
 * surface. It is a keep-out for the layout only: which touches are the grown-up's is decided in the surface's
 * own pixels (corner.ts).
 */
export const GROWN_UP_CORNER: Box = { x: STAGE.width - 96, y: 0, w: 96, h: 96 }
/** Wrists rest along the bottom edge: no target has its middle below this line. */
export const WRIST_LINE = 740

// --- The henhouse and its door ----------------------------------------------

export const HENHOUSE = {
  wall: { x: 24, y: 196, w: 444, h: 344 } as Box,
  roof: [{ x: 0, y: 212 }, { x: 246, y: 78 }, { x: 492, y: 212 }] as readonly Point[],
  /** The die-cut opening the door covers. */
  opening: { x: 60, y: 270, w: 190, h: 250 } as Box,
  /** The rail the door hangs from. */
  rail: { x: 44, y: 252, w: 424, h: 14 } as Box,
  /** The loft hatch in the gable, hinged along its top edge. */
  hatch: { x: 198, y: 118, w: 96, h: 82 } as Box,
}

/** The door is a slider: it covers the opening when shut and stands beside it when open. */
export const DOOR = {
  w: 206,
  h: 262,
  y: 262,
  shutX: 52,
  openX: 258,
  /** Three round holes in the door, in the door's own units from its top left corner. */
  holes: [{ x: 52, y: 96, r: 23 }, { x: 103, y: 142, r: 23 }, { x: 154, y: 78, r: 23 }] as readonly Circle[],
}

/** Where the door stands for a slide from 0 (shut) to 1 (open). */
export function doorBox(slide: number): Box {
  return { x: DOOR.shutX + (DOOR.openX - DOOR.shutX) * slide, y: DOOR.y, w: DOOR.w, h: DOOR.h }
}

/** Everywhere the door can be along its rail, less its foot: a second tap that lands where the door just was still reaches it. */
export const DOOR_TRACK: Box = { x: DOOR.shutX, y: DOOR.y, w: DOOR.openX - DOOR.shutX + DOOR.w, h: DOOR.h - 40 }

/** The hens stand in front of the foot of the open door, so the door as a target stops this far above its lower edge. */
export const DOOR_FOOT = 40

/** What a touch has to land in to reach the door: the door as drawn, less its foot. */
export function doorTarget(slide: number): Box {
  const box = doorBox(slide)
  return { ...box, h: box.h - DOOR_FOOT }
}

// --- The animals -------------------------------------------------------------

/** Where each large animal's feet stand: the middle of its hooves or trotters on the ground. The hens have a patch instead. */
export const FEET: Record<Exclude<AnimalId, 'hens'>, Point> = {
  pony: { x: 655, y: 548 },
  goat: { x: 959, y: 548 },
  pig: { x: 925, y: 752 },
}

/** What a touch has to land in to reach each large animal: its body as drawn, squared off. */
export const BODY: Record<Exclude<AnimalId, 'hens'>, Box> = {
  pony: { x: 488, y: 196, w: 322, h: 356 },
  goat: { x: 852, y: 204, w: 214, h: 348 },
  pig: { x: 768, y: 566, w: 316, h: 200 },
}

/** What each animal is short of stands beside it, and a touch there reaches the animal too. */
export const TROUGH: Box = { x: 262, y: 566, w: 124, h: 60 }
export const RACK: Box = { x: 1062, y: 292, w: 88, h: 196 }
export const WALLOW: Box = { x: 696, y: 610, w: 470, h: 196 }
/** The part of the wallow that reaches the pig: the mud beside and below it. Its left rim is bare ground, where a hen can stand. */
export const WALLOW_TARGET: Box = { x: 768, y: 610, w: 398, h: 196 }
/** The post the pony rubs on. */
export const POST: Box = { x: 812, y: 372, w: 26, h: 178 }

/** Three hens: a big white one, a quick russet one and a small black bantam. */
export const HENS = [
  { id: 'white', home: { x: 92, y: 608 }, size: 1 },
  { id: 'russet', home: { x: 246, y: 604 }, size: 0.92 },
  { id: 'bantam', home: { x: 418, y: 606 }, size: 0.74 },
] as const

/** A hen as a target: a circle round her body, which stands above her feet. */
export const HEN_REACH = 66
export const henCircle = (feet: Point, size: number): Circle => ({ x: feet.x, y: feet.y - 56 * size, r: HEN_REACH })

/** Where a hen's head is from her feet, at size 1 and facing right: what looks out of a hole in the door. */
export const HEN_HEAD: Point = { x: 48, y: -112 }

/** Where the hens stand inside when the door is shut: each with her head behind one of its holes. */
export const ROOST: readonly Point[] = DOOR.holes.map((hole, i) => ({ x: DOOR.shutX + hole.x - HEN_HEAD.x * HENS[i].size, y: DOOR.y + hole.y - HEN_HEAD.y * HENS[i].size }))

/**
 * Where the hens peck when grain has fallen by another animal: on bare ground beside it and never on it. By the
 * pony that is under its nose, at the near end of their own patch. By the goat and the pig it is the bare rim of
 * the wallow, the one stretch of open ground on that side of the yard.
 */
export const VISIT: Record<Exclude<AnimalId, 'hens'>, readonly Point[]> = {
  pony: [{ x: 228, y: 612 }, { x: 330, y: 604 }, { x: 420, y: 598 }],
  goat: [{ x: 698, y: 800 }, { x: 690, y: 676 }, { x: 700, y: 724 }],
  pig: [{ x: 690, y: 676 }, { x: 696, y: 800 }, { x: 700, y: 730 }],
}

/** Where a thing tips out over each animal. Over the hens it is over the trough, or over the hen that was touched. */
export const USE_AT: Record<AnimalId, Point> = {
  hens: { x: 324, y: 486 },
  pony: { x: 612, y: 214 },
  goat: { x: 952, y: 204 },
  pig: { x: 905, y: 556 },
}

/**
 * Where a thing is used when it is not tipped out over the animal: the scoop at the pony's lip and before the
 * goat's teeth, the bucket at the goat's mouth, the brush on a flank or a belly, the fork over the pony's head
 * and over the hay rack. Over a hen it is at her head or above her, wherever she stands.
 */
export const USE_PLACE: Partial<Record<`${ThingId}-${AnimalId}`, Point>> = {
  'scoop-pony': { x: 486, y: 322 },
  'scoop-goat': { x: 1000, y: 296 },
  'bucket-goat': { x: 1092, y: 268 },
  'brush-pony': { x: 668, y: 398 },
  'brush-goat': { x: 944, y: 400 },
  'brush-pig': { x: 934, y: 664 },
  'fork-pony': { x: 566, y: 206 },
  'fork-goat': { x: 1106, y: 246 },
}
/** Where the goat holds the scoop in its teeth. */
export const TEETH: Point = { x: 1008, y: 324 }

/** The middle of each animal, for eyes that turn to it and for a drag that is measured towards it. */
export const MIDDLE: Record<AnimalId, Point> = {
  hens: { x: 250, y: 552 },
  pony: centreOf(BODY.pony),
  goat: centreOf(BODY.goat),
  pig: centreOf(BODY.pig),
}

// --- The things ---------------------------------------------------------------

/** The pale bare step the four things lie on. */
export const STEP: Box = { x: 20, y: 632, w: 610, h: 150 }

/** Where each thing lies, by its middle. */
export const HOME: Record<ThingId, Point> = {
  scoop: { x: 94, y: 704 },
  bucket: { x: 246, y: 704 },
  brush: { x: 398, y: 708 },
  fork: { x: 550, y: 702 },
}

export const THING_REACH = 68
/**
 * A lifted thing comes off the page towards the child: it stands this much larger over its own place, and this far
 * lower, so that it grows down and outwards and never up over the hens' ground.
 */
export const NEAR = { scale: 1.3, down: 12 }
/** A lifted thing as a target: its own circle, grown with it. */
export const HELD_REACH = Math.round(THING_REACH * 1.2)

// --- The bystanders -------------------------------------------------------------

export const SUN = { x: 804, low: 166, high: 80, r: 50 }
export const CLOUDS: readonly Point[] = [{ x: 386, y: 46 }, { x: 962, y: 104 }]
export const BYSTANDER_REACH = 66

/** How high the sun stands for a number of content animals. */
export function sunY(content: number): number {
  return SUN.low + (SUN.high - SUN.low) * (content / ANIMALS.length)
}

// --- Where an answer's loose bits start ------------------------------------------

/** Each large animal's mouth, where a sneeze, a fountain or a dropped straw starts. */
/** The tip of the goat's nearer horn, where a spark comes off. */
export const HORN: Point = { x: 1004, y: 170 }

export const MOUTH: Record<Exclude<AnimalId, 'hens'>, Point> = {
  pony: { x: 532, y: 330 },
  goat: { x: 1024, y: 318 },
  pig: { x: 862, y: 676 },
}

/** Where the hens stand to peck at the trough, and where they sit once it is full: each on her own side of it. */
export const AT_TROUGH: readonly Point[] = [{ x: 92, y: 612 }, { x: 266, y: 602 }, { x: 414, y: 600 }]

/** Where the hens scatter to when water lands on them. */
export const SCATTER: readonly Point[] = [{ x: 60, y: 614 }, { x: 178, y: 604 }, { x: 404, y: 594 }]

/** Where the cat sits when it comes out onto the roof: on the right slope, well clear of the home control. */
export const ROOFTOP: Point = { x: 420, y: 176 }
