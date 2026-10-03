// The patch of tar: its own units, and the things that are part of it.
// Everything in the rules is measured in these units; the view scales them to
// the surface. No pixel of the screen is named here.

export type Pt = { x: number; y: number }

/** The tar is this many units wide and high, whatever the surface measures. */
export const TAR = { w: 1200, h: 800 } as const

/** The strip along the bottom where wrists rest. Nothing a child aims at lies in it. */
export const WRIST_STRIP = 120

/** How far across a thing a child aims at is, at least: about 100 logical pixels on a tablet. */
export const TARGET = 100

/** The puddle, part of the tar from the first visit. */
export const PUDDLE = { x: 600, y: 600, rx: 150, ry: 52 } as const

/** The dandelion in the crack. `reach` is how far its leaves and head spread. */
export const DANDELION = { x: 600, y: 96, reach: 55 } as const

/** A rail that runs past a place lies this far below the place's middle, under the feet of whoever stands there. */
export const RAIL_DROP = 60

/** The place the engine stands at on a first visit, and the spot on its stub of rail there. */
export const ENGINE_PLACE = 'mid-1'
export const ENGINE_START = { x: 150, y: 400 + RAIL_DROP } as const

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

/** Keeps a point on the tar. */
export const onTar = (p: Pt): Pt => ({ x: Math.max(0, Math.min(TAR.w, p.x)), y: Math.max(0, Math.min(TAR.h, p.y)) })
