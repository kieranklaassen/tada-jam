import { KINDS, type Kind } from './parts'
import { STAGE } from './stage'

// Where everything stands in the clearing, in stage units. Nothing here
// draws: the view paints what these numbers place, and the toy asks them
// what a finger has landed on.

/** The bare earth, where parts are pressed on: the one plain surface of the frame. */
export const EARTH = { x: 590, y: 420, rx: 318, ry: 158 } as const
/** How far past the rim of the earth a part may be let go and still count as on it. */
export const EARTH_MARGIN = 14
/** Where creatures may walk: the earth and the grass round it, short of the heaps, the stump and the fern. */
export const GROUND = { x: 590, y: 424, rx: 372, ry: 176 } as const

/** The heaps along the near edge, one for each kind, the caps in the middle. */
const HEAP_ORDER: readonly Kind[] = ['twig', 'maple', 'willow', 'cap', 'round', 'feather', 'seed']
export const HEAP_Y = 676
export const HEAP_SPACING = 150
export const HEAP_REACH = 64
export const HEAPS = Object.fromEntries(HEAP_ORDER.map((kind, i) => [kind, { x: 140 + i * HEAP_SPACING, y: HEAP_Y }])) as Record<Kind, { x: number; y: number }>

/** The box the row of heaps stands in: its middle, and its size with the crayon edge of the outermost heaps. */
export const ROW_AT = { x: 140 + 3 * HEAP_SPACING, y: HEAP_Y + 10, w: 6 * HEAP_SPACING + 198, h: 158 } as const

/** The strip along the bottom where wrists rest: nothing that answers a touch has its middle here. */
export const WRIST_STRIP = 70

/** The jam's round home control, drawn over every game at the top centre. Nothing a child can tap rests under it. */
export const HOME = { x: STAGE.width / 2, y: 34, r: 24 } as const
/** The grown-up's corner, top right: nothing there answers a touch. */
export const CORNER = 72

export type CastId = 'big' | 'small' | 'toad'
/** The three who are always in the frame: where each one's middle is, and how far a touch on it reaches. */
export const CAST: Record<CastId, { x: number; y: number; rx: number; ry: number }> = {
  big: { x: 232, y: 128, rx: 150, ry: 96 },
  small: { x: 962, y: 136, rx: 118, ry: 80 },
  toad: { x: 104, y: 418, rx: 86, ry: 70 },
}

/** The fern at the right edge: where its fronds spring from, and the hollow under it. */
export const FERN = { x: 1066, y: 500, rx: 104, ry: 150 } as const
/** Where a creature may be bedded under the fern: five hollows, off the earth and clear of the heaps and of one another. */
export const BEDS: readonly { x: number; y: number }[] = [{ x: 1000, y: 560 }, { x: 1082, y: 572 }, { x: 1040, y: 492 }, { x: 1150, y: 520 }, { x: 1112, y: 452 }]
/** The hollow under the fern, where the beds are: a creature may stand here on its way to bed or back from it. */
export const HOLLOW = { x: 1066, y: 512, rx: 130, ry: 110 } as const
/** How far a touch on a sleeper reaches: half of the least distance between two beds. */
export const BED_REACH = 38
/** How much smaller a creature lies when it is curled up asleep. */
export const BED_SIZE = 0.6
/** Where the eyes of the creature that walked off last show between the trunks, at the left edge (-1) and the right (1), and how far a touch on them reaches. */
export const WAIT_AT: Record<-1 | 1, { x: number; y: number }> = { [-1]: { x: 104, y: 284 }, [1]: { x: STAGE.width - 104, y: 284 } }
export const WAIT_REACH = 40
/** How far a touch on an acorn that was dug up reaches. */
export const ACORN_REACH = 36
/** The stump the toad sits on. */
export const STUMP = { x: 104, y: 508, rx: 92, ry: 62 } as const

export function inEllipse(x: number, y: number, e: { x: number; y: number; rx: number; ry: number }, grow = 0): boolean {
  const dx = (x - e.x) / (e.rx + grow), dy = (y - e.y) / (e.ry + grow)
  return dx * dx + dy * dy <= 1
}

export function onEarth(x: number, y: number): boolean {
  return inEllipse(x, y, EARTH, EARTH_MARGIN)
}

/** The nearest point of the walking ground to a point outside it. */
export function ontoGround(x: number, y: number, shrink = 0): { x: number; y: number } {
  const dx = (x - GROUND.x) / (GROUND.rx - shrink), dy = (y - GROUND.y) / (GROUND.ry - shrink)
  const d = Math.hypot(dx, dy)
  if (d <= 1) return { x, y }
  return { x: GROUND.x + (dx / d) * (GROUND.rx - shrink), y: GROUND.y + (dy / d) * (GROUND.ry - shrink) }
}

/** How far a heap is drawn from its middle, to each side and up and down, and how far below its middle the middle of the drawing lies. */
export const HEAP_DRAWN = { rx: 98, ry: 60, dy: 6 } as const

/**
 * The heap a finger is on. A heap is touched as far as it is drawn, to the outermost twig end and leaf tip, and
 * where the drawings of two heaps meet the finger is on the nearer one, so no place along the row is on neither.
 */
export function heapAt(x: number, y: number): Kind | null {
  let best: Kind | null = null, least = Infinity
  for (const kind of KINDS) {
    const dx = x - HEAPS[kind].x, dy = y - HEAPS[kind].y - HEAP_DRAWN.dy
    if ((dx / HEAP_DRAWN.rx) ** 2 + (dy / HEAP_DRAWN.ry) ** 2 > 1) continue
    const far = Math.hypot(dx, dy)
    if (far < least) { least = far; best = kind }
  }
  return best
}

export function castAt(x: number, y: number): CastId | null {
  for (const id of ['toad', 'big', 'small'] as const) if (inEllipse(x, y, CAST[id])) return id
  return null
}

/** The grown-up's corner in stage units, as the stage is laid out at its own size. */
export function inGrownUpCorner(x: number, y: number): boolean {
  return x >= STAGE.width - CORNER && y <= CORNER
}

/** A point on the earth for a new thing to begin at: the candidate furthest from everything in `taken`. */
export function freeSpot(taken: readonly { x: number; y: number }[]): { x: number; y: number } {
  let best: { x: number; y: number } = { x: EARTH.x, y: EARTH.y }, bestRoom = -1
  for (let i = 0; i < 9; i++) {
    // The middle first, then a ring of eight round it.
    const a = (i - 1) * (Math.PI / 4), r = i === 0 ? 0 : 0.56
    const spot = { x: EARTH.x + Math.cos(a) * EARTH.rx * r, y: EARTH.y + Math.sin(a) * EARTH.ry * r }
    let room = 1e9
    for (const t of taken) room = Math.min(room, Math.hypot(t.x - spot.x, t.y - spot.y))
    // The middle wins a tie, so the first thing of a bare earth begins there.
    if (room > bestRoom + 1) { best = spot; bestRoom = room }
  }
  return best
}
