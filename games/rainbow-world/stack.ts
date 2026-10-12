import { HOME_CONTROL } from './layout'
import { ARCH_RING, PIECE_IDS, type PieceDef, type PieceId } from './pieces'
import { topOf as shapeTop } from './shape'
import type { Piece } from './thing'

// Things that rest on things. `on` names what a thing rests on, so a tower, a nest, a rider and a ghost are
// chains of `on`. A thing carries one thing at most, and beside that any arches it wears (a collar on a doll, a
// ring round the horse's neck). The silk is always the top of whatever it lies over. This module says who rests
// on whom, how high, and so where each thing is drawn and touched. Nothing here draws or reads a clock.

type Pieces = readonly Piece[]

export function byId(pieces: Pieces, id: PieceId): Piece {
  return pieces[PIECE_IDS.indexOf(id)]
}

export function parentOf(pieces: Pieces, p: Piece): Piece | null {
  return p.on ? byId(pieces, p.on) : null
}

/** An arch on a doll or on the horse is worn: it hangs on its wearer and nothing is put on it. */
export function isWorn(pieces: Pieces, p: Piece): boolean {
  const parent = parentOf(pieces, p)
  return p.def.kind === 'arch' && parent !== null && (parent.def.kind === 'doll' || parent.def.kind === 'horse')
}

/** Everything that rests directly on a thing: what it carries first, then what it wears. */
export function ridersOf(pieces: Pieces, p: Piece): Piece[] {
  const riders = pieces.filter((each) => each.at === 'mat' && each.on === p.def.id)
  return riders.sort((a, b) => Number(isWorn(pieces, a)) - Number(isWorn(pieces, b)))
}

/** The one thing a thing carries, or null. */
export function carriedBy(pieces: Pieces, p: Piece): Piece | null {
  return pieces.find((each) => each.at === 'mat' && each.on === p.def.id && !isWorn(pieces, each)) ?? null
}

export function rootOf(pieces: Pieces, p: Piece): Piece {
  let root = p
  for (let parent = parentOf(pieces, root); parent; parent = parentOf(pieces, root)) root = parent
  return root
}

/** The top of the stack a thing belongs to: the next thing is put on this one. */
export function topOf(pieces: Pieces, p: Piece): Piece {
  let top = rootOf(pieces, p)
  for (let next = carriedBy(pieces, top); next; next = carriedBy(pieces, top)) top = next
  return top
}

/** A thing and everything that rests on it, the lower before the upper. */
export function withRiders(pieces: Pieces, p: Piece): Piece[] {
  return [p, ...ridersOf(pieces, p).flatMap((each) => withRiders(pieces, each))]
}

/** Whether `upper` can stay on `lower`. A doll and the horse never stay on a standing arch: they slide down it or go through it. Nor does an arch on its back. */
export function rests(upper: Piece, lower: Piece): boolean {
  if (upper === lower || lower.def.kind === 'silk') return false
  if (upper.def.kind === 'silk') return true
  // An arch on its back never stays on a standing arch: at one foot their two bands would cross and close a ring. It comes down beside it.
  if (lower.def.kind === 'arch') return lower.turned || (upper.def.kind === 'arch' && !upper.turned)
  if (lower.def.kind === 'horse') return upper.def.kind !== 'horse'
  return true
}

/** Which way a doll or the horse faces: 1 to the right. */
export function facing(p: Piece): number {
  // In the basket everything faces the same way, so that no cap's peak or muzzle is over a neighbour's face.
  if (p.far >= 1) return 1
  return p.way !== 0 ? p.way : p.turned ? -1 : 1
}

const ring = (p: Piece): { outer: number; inner: number } => ARCH_RING[p.def.id as keyof typeof ARCH_RING]

/** Where the foot of `upper` is, measured from the foot of `lower`: to the side and up. */
export function seatOf(lower: Piece, upper: Piece): { dx: number; dy: number } {
  if (upper.def.kind === 'silk') return { dx: 0, dy: lower.def.kind === 'arch' && lower.turned ? ring(lower).outer - ring(lower).inner : 0 }
  switch (lower.def.kind) {
    case 'arch':
      // Standing, another arch nests at the same foot. On its back it is a cradle: a standing arch lies across its rim, and everything else sits in its hollow.
      if (!lower.turned) return { dx: 0, dy: 0 }
      if (upper.def.kind === 'arch') return { dx: 0, dy: upper.turned ? 0 : ring(lower).outer * 0.9 }
      return { dx: 0, dy: ring(lower).outer - ring(lower).inner }
    case 'doll':
      return { dx: 0, dy: lower.def.height * (upper.def.kind === 'arch' ? 0.42 : 0.8) }
    case 'horse':
      return upper.def.kind === 'arch' ? { dx: facing(lower) * 58, dy: 70 } : { dx: -8 * facing(lower), dy: 92 }
    default:
      return { dx: 0, dy: 0 }
  }
}

/** The arches that stand nested at one foot with a standing arch, itself among them. Any other thing is alone. */
export function nestWith(pieces: Pieces, arch: Piece): Piece[] {
  const standing = (p: Piece): boolean => p.def.kind === 'arch' && !p.turned
  if (!standing(arch)) return [arch]
  let base = arch
  for (let lower = parentOf(pieces, base); lower && standing(lower); lower = parentOf(pieces, base)) base = lower
  const inNest = (p: Piece): boolean => { for (let each: Piece | null = p; each; each = parentOf(pieces, each)) { if (!standing(each)) return false; if (each === base) return true } return false }
  return withRiders(pieces, base).filter(inNest)
}

/** The arch a nest is seen as from outside: the largest of the arches nested with this one. A nest is climbed, covered and gone round as that arch. */
export function outermost(pieces: Pieces, arch: Piece): Piece {
  if (arch.def.kind !== 'arch' || arch.turned) return arch
  return nestWith(pieces, arch).reduce((widest, p) => (ring(p).outer > ring(widest).outer ? p : widest), arch)
}

/** What the silk lies over, as it is seen: the thing it rests on, or the whole nest that thing is part of. */
export function coveredBy(pieces: Pieces, silk: Piece): Piece | null {
  const lower = parentOf(pieces, silk)
  return lower ? outermost(pieces, lower) : null
}

/** How wide to each side and how high the draped silk is, from the foot it is drawn at: a drape as wide and as high as what it covers, or a hammock that hangs in a cradle from its rim. `rim` is how far above that foot it hangs from. */
export function drapeOf(pieces: Pieces, silk: Piece): { wide: number; high: number; rim: number } | null {
  const lower = coveredBy(pieces, silk)
  if (!lower) return null
  if (lower.def.kind === 'arch' && lower.turned) return { wide: ring(lower).inner, high: -ring(lower).inner * 0.8, rim: ring(lower).inner }
  return { wide: lower.def.halfWidth + (lower.def.kind === 'arch' ? 8 : 14), high: lower.def.height + 8, rim: 0 }
}

/** No stack reaches higher than this on the stage: under it lies the jam's home control. */
export const TOP_LIMIT = 70

/** Every thing of a stack: how high its seat is above the stack's foot with every seat at its full height, and how far it reaches above its own foot, to the tip of its hat or its ears. */
function measure(pieces: Pieces, root: Piece): { rise: number; top: number }[] {
  const all: { rise: number; top: number }[] = []
  const climb = (p: Piece, rise: number): void => {
    all.push({ rise, top: shapeTop(p.def.id) })
    for (const rider of ridersOf(pieces, p)) climb(rider, rise + seatOf(p, rider).dy)
  }
  climb(root, 0)
  return all
}

/** The closest a stack's seats ever sit: a fifth of their height. */
const CLOSEST = 0.2

/** How much of its seats' heights a stack keeps: 1, or less where any thing of it would reach above `TOP_LIMIT` from where its foot is drawn now, on the mat or in the hand. */
function squeeze(pieces: Pieces, root: Piece): number {
  const room = root.py - root.lift - root.hop - TOP_LIMIT
  // Only the seats give: the things themselves stay their size.
  let k = 1
  for (const each of measure(pieces, root)) if (each.rise > 0 && each.rise + each.top > room) k = Math.min(k, (room - each.top) / each.rise)
  return Math.max(CLOSEST, k)
}

/**
 * The highest a thing's foot may be drawn while it is in the hand, for the whole of it and of what rides on it
 * to stay under `TOP_LIMIT`: a stack with its seats at their closest, wherever it is, and a single thing where
 * it is carried under the home control. Anywhere else a single thing goes where the finger takes it.
 */
export function lowestFoot(pieces: Pieces, root: Piece): number {
  const all = measure(pieces, root)
  if (all.length === 1 && Math.abs(root.px - HOME_CONTROL.x) > root.def.halfWidth + HOME_CONTROL.r + 16) return -Infinity
  return TOP_LIMIT + Math.max(...all.map((each) => each.rise * CLOSEST + each.top))
}

/** A thing with whatever rides on it, as one body: as wide as its widest and as high as its highest. The game uses it to find a free place for the whole of it. */
export function bulkOf(pieces: Pieces, p: Piece): PieceDef {
  const k = squeeze(pieces, p)
  let height = p.def.height, halfWidth = p.def.halfWidth
  const climb = (lower: Piece, rise: number): void => {
    for (const rider of ridersOf(pieces, lower)) {
      const up = rise + seatOf(lower, rider).dy * k
      height = Math.max(height, up + rider.def.height)
      halfWidth = Math.max(halfWidth, rider.def.halfWidth)
      climb(rider, up)
    }
  }
  climb(p, 0)
  return height === p.def.height && halfWidth === p.def.halfWidth ? p.def : { ...p.def, height, halfWidth }
}

export type Stand = { x: number; y: number; rot: number }

/** Where a thing's foot is drawn and touched, and how far it leans: its own place, or its seat on what it rests on, leaning with it. */
export function stand(pieces: Pieces, p: Piece, out: Stand = { x: 0, y: 0, rot: 0 }): Stand {
  const chain: Piece[] = [p]
  for (let parent = parentOf(pieces, p); parent; parent = parentOf(pieces, parent)) chain.unshift(parent)
  const root = chain[0], k = chain.length > 1 ? squeeze(pieces, root) : 1
  let x = root.px, y = root.py - root.lift - root.hop, rot = root.tilt
  for (let i = 1; i < chain.length; i++) {
    const lower = chain[i - 1], upper = chain[i], seat = seatOf(lower, upper)
    const cos = Math.cos(rot), sin = Math.sin(rot), up = seat.dy * k
    x += seat.dx * cos + up * sin + (upper.px - upper.x)
    y += seat.dx * sin - up * cos + (upper.py - upper.y) - upper.lift - upper.hop
    rot += upper.tilt
  }
  out.x = x; out.y = y; out.rot = rot
  return out
}

/**
 * A saved mat is untrusted. Whatever rests on something it cannot rest on (a thing that is not on the mat, a
 * ring of things each on the next, a second thing carried, a pair that never stays) stands on the bare mat
 * instead, and whatever does rest on something stands at the foot of the thing at the bottom.
 */
export function mend(pieces: Pieces): void {
  // By the mat an arch lies on its feet, nested with the others; and an arch on its back that a save puts on a standing arch is set on its feet, nested.
  for (const p of pieces) {
    const parent = parentOf(pieces, p)
    if (p.def.kind === 'arch' && p.turned && (p.at !== 'mat' || (parent && parent.at === 'mat' && parent.def.kind === 'arch' && !parent.turned))) p.turned = false
  }
  for (const p of pieces) {
    const parent = parentOf(pieces, p)
    if (!parent) continue
    let loops = false
    for (let up: Piece | null = parent, n = 0; up; up = parentOf(pieces, up), n++) if (up === p || n > pieces.length) { loops = true; break }
    const taken = !isWorn(pieces, p) && pieces.some((each) => each !== p && each.at === 'mat' && each.on === parent.def.id && !isWorn(pieces, each) && PIECE_IDS.indexOf(each.def.id) < PIECE_IDS.indexOf(p.def.id))
    if (loops || p.at !== 'mat' || parent.at !== 'mat' || !rests(p, parent) || taken) p.on = null
  }
  // Whatever still rests on something stands at the foot of the thing at the bottom.
  for (const p of pieces) {
    const root = rootOf(pieces, p)
    if (root !== p) { p.x = root.x; p.y = root.y; p.px = root.x; p.py = root.y }
  }
}
