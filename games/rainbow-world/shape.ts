import { DOLL, DOLL_SCALE, hatY, headY, type DollId } from './figures'
import { ARCH_RING, type PieceId } from './pieces'

// The outline of each thing as the view draws it, in a few boxes and discs measured from its foot, so that a
// touch goes to the thing that shows at that point (hit.ts): a hat's tip, the bobble and the horse's ears count, and
// the empty corner of an arch's box does not. The numbers are the sprites' own (figures.ts). Nothing here draws.

type Part = { x0: number; x1: number; y0: number; y1: number } | { x: number; y: number; r: number; ry?: number }

const box = (x0: number, x1: number, top: number, bottom: number): Part => ({ x0, x1, y0: top, y1: bottom })

function dollParts(id: DollId): Part[] {
  const d = DOLL[id], k = DOLL_SCALE, hat = hatY(id) * k
  // The body narrows from its base to its neck: three boxes that follow the curve it is cut by, and the scarf.
  const waist = d.base * 0.8, chest = d.base * 0.165 + d.neck * 1.055
  const parts: Part[] = [
    box(-d.base * 1.03 * k, d.base * 1.03 * k, -d.tall * 0.66 * k, 4), box(-waist * k, waist * k, -d.tall * 0.85 * k, -d.tall * 0.66 * k), box(-chest * k, chest * k, -d.tall * k, -d.tall * 0.85 * k),
    box(-d.neck * 1.5 * k, d.neck * 1.5 * k, -d.tall * 0.98 * k, -d.tall * 0.82 * k), { x: 0, y: headY(id) * k, r: d.head * k },
  ]
  // The hats: a tall point that leans, a flat cap with a peak, a dome with a bobble.
  if (id === 'doll-tall') parts.push(box(-33 * k, 33 * k, hat - 22 * k, hat + 6 * k), box(-18 * k, 24 * k, hat - 42 * k, hat - 22 * k), box(-2 * k, 22 * k, hat - 60 * k, hat - 42 * k))
  else if (id === 'doll-round') parts.push(box(-36 * k, 50 * k, hat - 27 * k, hat + 8 * k))
  else parts.push(box(-33 * k, 33 * k, hat - 40 * k, hat + 7 * k), { x: 9 * k, y: hat - 46 * k, r: 17 * k })
  return parts
}

/** The horse facing right: its body and legs, its neck and head, its ears and forelock, and its tail. */
const HORSE: Part[] = [box(-76, 58, -114, 3), box(14, 104, -176, -84), box(44, 74, -192, -160), box(-104, -70, -112, -56)]

const PARTS: Record<PieceId, Part[] | null> = {
  'arch-large': null, 'arch-middle': null, 'arch-small': null,
  'doll-tall': dollParts('doll-tall'), 'doll-round': dollParts('doll-round'), 'doll-small': dollParts('doll-small'),
  horse: HORSE,
  // The silk spread on the mat: a wavy-edged pool, seen at a slant.
  silk: [{ x: 0, y: -42, r: 94, ry: 48 }],
}

/** The silk as it is drawn in its other places, by the same sprites' numbers: gathered in a heap, lying in folds by the mat with one corner lifted, and gathered by the mat. */
const SILK: Record<SilkLook, Part[]> = {
  spread: PARTS.silk!,
  heap: [{ x: 0, y: -36, r: 62, ry: 42 }],
  lying: [{ x: 0, y: -34, r: 106, ry: 44 }, box(40, 100, -122, -58)],
  lyingHeap: [{ x: 0, y: -40, r: 74, ry: 46 }],
}
export type SilkLook = 'spread' | 'heap' | 'lying' | 'lyingHeap'

/** How far each thing shows above its foot, standing: its hat's tip, its ears. */
export function topOf(id: PieceId): number {
  const parts = PARTS[id]
  if (!parts) return ARCH_RING[id as keyof typeof ARCH_RING].outer
  return -Math.min(...parts.map((part) => ('r' in part ? part.y - (part.ry ?? part.r) : part.y0)))
}

/** Whether a point, measured from a thing's foot with the thing upright and facing right, is on its outline or within `pad` of it. `size` is the size it is drawn at. An arch is its band, or with `solid` the whole half disc; `turned` is an arch on its back. */
export function covers(id: PieceId, lx: number, ly: number, pad = 0, size = 1, turned = false, solid = false, silk: SilkLook | null = null): boolean {
  const x = lx / size, y = ly / size, near = pad / size, parts = id === 'silk' ? SILK[silk ?? (turned ? 'heap' : 'spread')] : PARTS[id]
  if (!parts) {
    const ring = ARCH_RING[id as keyof typeof ARCH_RING]
    // On its feet the ring's middle is at its foot and the band is above it; on its back the band is below its middle, which is a radius up.
    const cy = turned ? -ring.outer : 0, far = Math.hypot(x, y - cy)
    return (turned ? y - cy >= -near : y <= near) && far <= ring.outer + near && (solid || far >= ring.inner - near)
  }
  for (const part of parts) {
    if ('r' in part) { if (Math.hypot((x - part.x) / (part.r + near), (y - part.y) / ((part.ry ?? part.r) + near)) <= 1) return true }
    else if (x >= part.x0 - near && x <= part.x1 + near && y >= part.y0 - near && y <= part.y1 + near) return true
  }
  return false
}
