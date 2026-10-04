// The patch of tar: its own units, and the things that are part of it.
// Everything in the rules is measured in these units; the view scales them to
// the surface. No pixel of the screen is named here.

export type Pt = { x: number; y: number }

/** The tar is this many units wide and high, whatever the surface measures. */
export const TAR = { w: 1200, h: 800 } as const

/** The strip along the bottom where wrists rest. Nothing a child aims at lies in it. */
export const WRIST_STRIP = 100

/** How far across a thing a child aims at is, at least: about 100 logical pixels on a tablet. */
export const TARGET = 100

/** The puddle, part of the tar from the first visit. */
export const PUDDLE = { x: 600, y: 600, rx: 150, ry: 52 } as const

/** The dandelion in the crack. `reach` is how far its leaves and head spread. */
export const DANDELION = { x: 600, y: 215, reach: 55 } as const

/** A rail that runs past a place lies this far below the place's middle, under the feet of whoever stands there. */
export const RAIL_DROP = 60

/** The place the engine stands at on a first visit, and the spot on its stub of rail there: far enough in for its wagons to stand on the tar behind it. */
export const ENGINE_PLACE = 'mid-2'
export const ENGINE_START = { x: 470, y: 400 + RAIL_DROP } as const

/**
 * The places a stop or a home can be laid: three rows of four, with the
 * puddle between the two halves of the low row. Ids are stored, so none is
 * renamed; they name a spot on the tar and nothing else.
 */
export const PLACES = {
  'top-1': { x: 150, y: 170 },
  'top-2': { x: 450, y: 170 },
  'top-3': { x: 750, y: 170 },
  'top-4': { x: 1050, y: 170 },
  'mid-1': { x: 150, y: 400 },
  'mid-2': { x: 450, y: 400 },
  'mid-3': { x: 750, y: 400 },
  'mid-4': { x: 1050, y: 400 },
  'low-1': { x: 150, y: 625 },
  'low-2': { x: 370, y: 625 },
  'low-3': { x: 830, y: 625 },
  'low-4': { x: 1050, y: 625 },
} as const satisfies Record<string, Pt>

export type PlaceId = keyof typeof PLACES
export const PLACE_IDS = Object.keys(PLACES) as PlaceId[]

export const isPlaceId = (value: unknown): value is PlaceId => typeof value === 'string' && value in PLACES

export const distance = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y)

/** Whether a point is in the water. */
export function inPuddle(p: Pt, grow = 0): boolean {
  const dx = (p.x - PUDDLE.x) / (PUDDLE.rx + grow), dy = (p.y - PUDDLE.y) / (PUDDLE.ry + grow)
  return dx * dx + dy * dy <= 1
}

/** Whether the straight way between two points crosses the water. */
export function crossesPuddle(a: Pt, b: Pt): boolean {
  const steps = Math.max(2, Math.ceil(distance(a, b) / 10))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    if (inPuddle({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return true
  }
  return false
}

/**
 * Where chalk can go: far enough in from the edges that a train standing on a
 * mark is in view, its face included. The train stands above its rail, so the
 * most room is kept at the top.
 */
export const CHALK_AREA = { x0: 100, y0: 130, x1: TAR.w - 100, y1: TAR.h - 20 } as const

/** Keeps a point where chalk can go: a finger past the edge leaves its chalk at the edge of that area. */
export const onTar = (p: Pt): Pt => ({ x: Math.max(CHALK_AREA.x0, Math.min(CHALK_AREA.x1, p.x)), y: Math.max(CHALK_AREA.y0, Math.min(CHALK_AREA.y1, p.y)) })

/** The engine's body is this far above its spot on the rail. */
export const BODY_UP = 65
/** The middle of the engine's body, for a train standing upright at a spot. */
export const bodyOf = (spot: Pt): Pt => ({ x: spot.x, y: spot.y - BODY_UP })
/** Half of what the engine's body takes up as drawn, in tar units. */
export const ENGINE_HALF = { w: 94, h: 60 }
/**
 * What stands at a place, as it is drawn: a home with its foot a little below
 * the place, and a rider on its feet there. Its middle is this far below the
 * place, and it takes up this much to each side of it.
 */
export const FIGURE_DOWN = 5
export const FIGURE_HALF = { w: 85, h: 58 }
/**
 * How far the engine's body at a spot stands clear of the nearest figure, as
 * both are drawn: the gap between them, sideways or up and down, whichever is
 * wider. Below nothing, the engine stands in a figure by that much.
 */
export function clearance(places: readonly PlaceId[], spot: Pt): number {
  const body = bodyOf(spot)
  let least = Infinity
  for (const place of places) {
    const at = PLACES[place]
    least = Math.min(least, Math.max(Math.abs(body.x - at.x) - ENGINE_HALF.w - FIGURE_HALF.w, Math.abs(body.y - (at.y + FIGURE_DOWN)) - ENGINE_HALF.h - FIGURE_HALF.h))
  }
  return least
}
