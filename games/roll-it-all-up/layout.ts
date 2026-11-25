// Where things are, in stage units (1180 by 820). The snow is a ground seen a
// little from above: y is how near a thing is, and it stands on its point.

export type Point = { x: number; y: number }

export const THINGS = ['boot', 'wheel', 'cat', 'tuba', 'rake', 'umbrella', 'goose', 'spring'] as const
export type ThingId = (typeof THINGS)[number]
export const PLACES = ['base', 'belly', 'head'] as const
export type PlaceId = (typeof PLACES)[number]

/** The snow, as a grid of cells. */
export const CELL = 20
export const SNOW = { x: 20, y: 560, cols: 57, rows: 11 } as const
export const CELLS = SNOW.cols * SNOW.rows

/** Where the point under a ball may be. */
export const FIELD = { x0: 60, x1: 1120, y0: 618, y1: 756 } as const

/** Where the snowman stands. */
export const HOME: Point = { x: 850, y: 612 }
/** How far out he walks before he turns. */
export const WALK_TO = 320
/** Where a new ball falls from the tree. */
export const START: Point = { x: 236, y: 690 }
export const DROP_FROM: Point = { x: 118, y: 330 }

export const START_R = 36
/** How big each ball can get. */
export const FULL: Record<PlaceId, number> = { base: 106, belly: 86, head: 72 }
/** How much of a ball sits in the one below. */
export const SINK = 0.26

/** Half the height of a thing as it stands on the snow, and how near a ball must come to touch it. */
export const HALF: Record<ThingId, number> = { boot: 40, wheel: 42, cat: 44, tuba: 48, rake: 56, umbrella: 52, goose: 48, spring: 42 }
export const REACH = 26

/** Where loose things lie. They are dealt out anew each round. */
export const SPOTS: readonly Point[] = [
  { x: 400, y: 640 }, { x: 520, y: 742 }, { x: 590, y: 626 }, { x: 690, y: 722 },
  { x: 980, y: 748 }, { x: 1080, y: 650 }, { x: 110, y: 752 }, { x: 350, y: 752 },
]

/** The robin's ledge, on the hill at the left. */
export const ROBIN = { x: 300, y: 500, left: 236, right: 420 } as const
export const HOUSE = { x: 560, y: 470 } as const
export const TREE: Point = { x: 118, y: 560 }
