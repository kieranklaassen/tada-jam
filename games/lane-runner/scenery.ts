import { blank, box, oval, peak, put, type Plaque } from './beads'
import { makeRng, type Rng } from './rng'
import { LENGTH, PLACES, STEP, TRAIL_HALF, offset, wrap } from './trail'
import type { Receiver } from './lap'
import { KEPT_CLEAR } from './props'

// The setting: what stands round the trail, and where. It is made once from
// a fixed seed, never from the visit's, so the trail is the same trail on
// every visit and a child can come to know it by heart. Everything here is a
// plaque of beads standing on the board, with no dark line round it, so the
// setting stays quieter than the characters.

export type Kind = 'oak' | 'pine' | 'bush' | 'flower' | 'mushroom' | 'rock' | 'tuft' | 'reeds' | 'stump'

export type Standing = {
  kind: Kind
  /** Which of the kind's shapes. */
  shape: number
  /** Pegs to the right of the trail's middle, and pegs along the trail, at the middle of its foot. */
  x: number
  s: number
  /** How far past `s` its plane stands, less than a peg: every thing has a plane of its own, so no two that overlap share one. */
  deep: number
}

/** The seed of the setting. It is the same number for ever. */
const SETTING_SEED = 20261011

function oak(rng: Rng): Plaque {
  const rx = 11 + Math.floor(rng.next() * 5), ry = 9 + Math.floor(rng.next() * 4), trunk = 9 + Math.floor(rng.next() * 6)
  const tree = blank(rx * 2 + 3, ry * 2 + trunk + 2)
  const cx = rx + 1, cy = ry + 0.5
  box(tree, cx - 2, ry * 2 - 2, cx + 1, ry * 2 + trunk, 'B')
  box(tree, cx + 1, ry * 2 - 1, cx + 1, ry * 2 + trunk, 'D')
  oval(tree, cx, cy, rx, ry, 'g')
  oval(tree, cx - 1, cy - 1, rx - 1.5, ry - 1.5, 'G')
  oval(tree, cx - rx * 0.35, cy - ry * 0.35, rx * 0.45, ry * 0.4, 'l')
  // A few apples, always in the same places on the same tree.
  if (rng.next() < 0.5) for (let i = 0; i < 5; i++) put(tree, Math.round(cx + (rng.next() - 0.5) * rx * 1.3), Math.round(cy + (rng.next() - 0.3) * ry), 'R')
  return tree
}

function pine(rng: Rng): Plaque {
  const tiers = 3 + Math.floor(rng.next() * 2), half = 8 + Math.floor(rng.next() * 3), trunk = 6 + Math.floor(rng.next() * 4)
  const rise = 9
  const tree = blank(half * 2 + 3, tiers * (rise - 2) + 4 + trunk)
  const cx = half + 1
  box(tree, cx - 1, tree.h - trunk - 2, cx + 1, tree.h - 1, 'B')
  for (let i = tiers - 1; i >= 0; i--) {
    const top = i * (rise - 2), reach = half - (tiers - 1 - i) * 0 - Math.round((1 - (i + 1) / tiers) * half * 0.45)
    peak(tree, cx, top, top + rise, reach, 'g')
    peak(tree, cx - 1, top + 2, top + rise - 1, Math.max(1, reach - 3), 'E')
  }
  return tree
}

function bush(rng: Rng): Plaque {
  const rx = 6 + Math.floor(rng.next() * 4), ry = 4 + Math.floor(rng.next() * 2)
  const shrub = blank(rx * 2 + 2, ry * 2 + 1)
  oval(shrub, rx + 0.5, ry + 1.5, rx, ry + 1, 'g')
  oval(shrub, rx - 0.5, ry + 1, rx - 1.5, ry - 0.5, 'G')
  oval(shrub, rx - 2, ry - 0.5, rx * 0.4, ry * 0.35, 'l')
  const berry = rng.next() < 0.5 ? 'R' : 'V'
  for (let i = 0; i < 4; i++) put(shrub, Math.round(rx + (rng.next() - 0.5) * rx * 1.4), Math.round(ry + 1 + (rng.next() - 0.4) * ry), berry)
  return shrub
}

function flower(rng: Rng): Plaque {
  const petal = (['R', 'Y', 'P', 'W', 'v'] as const)[Math.floor(rng.next() * 5)]
  const stem = 4 + Math.floor(rng.next() * 4)
  const bloom = blank(5, stem + 5)
  box(bloom, 2, 4, 2, stem + 4, 'G')
  put(bloom, 1, stem + 1, 'l')
  put(bloom, 3, stem + 2, 'l')
  box(bloom, 1, 1, 3, 3, petal)
  put(bloom, 2, 0, petal)
  put(bloom, 0, 2, petal)
  put(bloom, 4, 2, petal)
  put(bloom, 2, 4, petal)
  put(bloom, 2, 2, petal === 'Y' ? 'O' : 'Y')
  return bloom
}

function mushroom(rng: Rng): Plaque {
  const wide = 3 + Math.floor(rng.next() * 2)
  const cap = blank(wide * 2 + 1, wide + 4)
  oval(cap, wide, wide, wide + 0.3, wide, 'R')
  box(cap, 0, wide + 1, wide * 2, wide + 3, null)
  box(cap, wide - 1, wide + 1, wide + 1, wide + 3, 'C')
  put(cap, wide - 2, 2, 'W')
  put(cap, wide + 1, 1, 'W')
  put(cap, wide + 2, 3, 'W')
  return cap
}

function rock(rng: Rng): Plaque {
  const rx = 3 + Math.floor(rng.next() * 3)
  const stone = blank(rx * 2 + 1, rx + 2)
  oval(stone, rx, rx + 1.5, rx + 0.3, rx + 0.5, 'A')
  oval(stone, rx - 1, rx * 0.7 + 1, rx * 0.5, rx * 0.3, 'a')
  return stone
}

function tuft(rng: Rng): Plaque {
  const blades = 3 + Math.floor(rng.next() * 3)
  const grass = blank(blades * 2 - 1, 5)
  for (let i = 0; i < blades; i++) {
    const tall = 2 + Math.floor(rng.next() * 3)
    box(grass, i * 2, 5 - tall, i * 2, 4, i % 2 === 0 ? 'G' : 'l')
  }
  box(grass, 0, 4, grass.w - 1, 4, 'G')
  return grass
}

function reeds(rng: Rng): Plaque {
  const stalks = 3 + Math.floor(rng.next() * 3)
  const bed = blank(stalks * 3, 16)
  for (let i = 0; i < stalks; i++) {
    const tall = 9 + Math.floor(rng.next() * 6)
    box(bed, i * 3 + 1, 16 - tall, i * 3 + 1, 15, 'G')
    box(bed, i * 3 + 1, 16 - tall, i * 3 + 1, 16 - tall + 3, 'D')
  }
  box(bed, 0, 15, bed.w - 1, 15, 'g')
  return bed
}

function stump(): Plaque {
  const wood = blank(9, 7)
  box(wood, 1, 1, 7, 6, 'B')
  box(wood, 0, 5, 8, 6, 'B')
  box(wood, 1, 0, 7, 1, 'T')
  put(wood, 4, 0, 'B')
  put(wood, 3, 3, 'D')
  put(wood, 6, 4, 'D')
  return wood
}

const SHAPES_OF: Record<Kind, number> = { oak: 4, pine: 3, bush: 3, flower: 5, mushroom: 2, rock: 2, tuft: 3, reeds: 2, stump: 1 }

/** Every shape of every kind, made once from the setting's seed. */
export function makeShapes(): Record<Kind, Plaque[]> {
  const rng = makeRng(SETTING_SEED)
  const make: Record<Kind, (rng: Rng) => Plaque> = { oak, pine, bush, flower, mushroom, rock, tuft, reeds, stump }
  const shapes = {} as Record<Kind, Plaque[]>
  for (const kind of Object.keys(SHAPES_OF) as Kind[]) shapes[kind] = Array.from({ length: SHAPES_OF[kind] }, () => make[kind](rng))
  return shapes
}

/** The pond the goose looks at, to the left of her nest: an oval of beads lying flat. Its middle, and half its width and length in pegs. */
export const POND = { x: -74, s: PLACES.goose + 6, halfX: 28, halfS: 38 } as const

export function inPond(x: number, s: number, margin = 0): boolean {
  const dx = (x - POND.x) / (POND.halfX + margin), ds = offset(POND.s, s) / (POND.halfS + margin)
  return dx * dx + ds * ds <= 1
}

/** Where the five who wait stand round the clearing: pegs to the right of the trail's middle, and pegs along the trail. */
export const CLEARING: Record<Receiver, { x: number; s: number }> = {
  owl: { x: -46, s: wrap(PLACES.shelf + 74) },
  bear: { x: -50, s: wrap(PLACES.shelf - 2) },
  hedgehog: { x: 52, s: wrap(PLACES.shelf + 40) },
  frog: { x: 46, s: wrap(PLACES.shelf - 6) },
  cat: { x: 64, s: wrap(PLACES.shelf + 70) },
}

/** The clearing is kept open: nothing of the setting stands this near it. */
function inClearing(x: number, s: number): boolean {
  const d = offset(PLACES.shelf, s)
  return d > -3 * STEP && d < 5 * STEP && Math.abs(x) < 96
}

/** Whether a place is kept for a neighbour, or for what an obstacle keeps beside the trail. */
function keptClear(x: number, s: number): boolean {
  return KEPT_CLEAR.some((box) => x >= box.x0 && x <= box.x1 && offset(box.s0, s) >= 0 && offset(box.s1, s) <= 0)
}

/** The pond as one plaque lying flat: blue beads on their sides, a paler one here and there for the light on the water. */
export function pondPlaque(): Plaque {
  const pond = blank(POND.halfX * 2 + 1, POND.halfS * 2 + 1)
  for (let y = 0; y < pond.h; y++) {
    for (let px = 0; px < pond.w; px++) {
      const x = POND.x - POND.halfX + px, s = POND.s + POND.halfS - y
      if (!inPond(x, s)) continue
      // The light on the water is out from the bank, so the rim is one blue all the way round.
      put(pond, px, y, inPond(x, s, -3) && ((px * 7 + y * 13) % 11 === 0 || (px + y * 3) % 17 === 0) ? 'u' : 'U')
    }
  }
  return pond
}

/** The rows the setting stands in, from the verge outwards: how far out, how far apart along the trail, and what grows there. */
const ROWS: readonly { from: number; to: number; gap: number; kinds: readonly Kind[] }[] = [
  { from: TRAIL_HALF + 5, to: TRAIL_HALF + 14, gap: 17, kinds: ['tuft', 'flower', 'tuft', 'mushroom', 'flower', 'rock', 'tuft'] },
  { from: 58, to: 80, gap: 44, kinds: ['bush', 'bush', 'stump', 'pine', 'bush', 'oak'] },
  { from: 96, to: 128, gap: 62, kinds: ['oak', 'pine', 'oak'] },
  { from: 150, to: 205, gap: 96, kinds: ['pine', 'oak', 'pine', 'pine'] },
]

/** Everything that stands round the trail. The same list every time it is asked for. */
export function layOut(): Standing[] {
  const rng = makeRng(SETTING_SEED ^ 0x5f3759df)
  const standing: Standing[] = []
  for (const row of ROWS) {
    for (const side of [-1, 1] as const) {
      for (let s = rng.next() * row.gap; s < LENGTH - row.gap * 0.5; s += row.gap * (0.7 + rng.next() * 0.6)) {
        const kind = row.kinds[Math.floor(rng.next() * row.kinds.length)]
        const x = side * (row.from + rng.next() * (row.to - row.from))
        const shape = Math.floor(rng.next() * SHAPES_OF[kind])
        if (inClearing(x, s) || inPond(x, s, 10) || keptClear(x, s)) continue
        standing.push({ kind, shape, x: Math.round(x), s: Math.round(s), deep: 0 })
      }
    }
  }
  // Reeds along the near shore of the pond, where the goose looks.
  for (let i = 0; i < 6; i++) {
    const s = wrap(POND.s - POND.halfS * 0.8 + i * POND.halfS * 0.32)
    standing.push({ kind: 'reeds', shape: i % 2, x: POND.x + POND.halfX + 6 - Math.abs(i - 2.5) * 5, s: Math.round(s), deep: 0 })
  }
  standing.forEach((thing, i) => { thing.deep = 0.1 + ((i * 0.6180339887) % 1) * 0.8 })
  return standing
}

/** How long one piece of the setting is. The view draws each piece as one mesh and leaves out the pieces that are out of sight. */
export const PIECE = 12 * STEP
export const PIECES = LENGTH / PIECE
