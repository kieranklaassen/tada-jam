import { inBasket } from './basket'
import { CAT, inBox, onMat } from './layout'
import { covers } from './shape'
import { drapeOf, facing, rootOf, stand, withRiders, type Stand } from './stack'
import type { Piece } from './thing'

// What is in front of what, and so what a touch lands on. The view draws the things in the order `drawOrder`
// gives, and a touch goes through the same list from the front, with each thing's outline (shape.ts) where
// `stand` puts it: a thing is touched where it is drawn, and a tap goes to the thing that shows at that point.

export type Target = { kind: 'piece'; piece: Piece } | { kind: 'basket' | 'cat' | 'mat' | 'pane' }

/** The least a target measures across and up. */
export const MIN_TARGET = 100

/** The things by the mat and on it, from the back to the front: by the mat, then each stack on the mat from the far edge to the near one, then whatever is in hand. A thing that is inside the basket (`far` at 1) is drawn with the basket. */
export function drawOrder(pieces: readonly Piece[], held: Piece | null): Piece[] {
  const home = pieces.filter((p) => p.at === 'home' && p !== held && p.far < 1)
  // A thing on its way into the basket is drawn where it is, among the things on the mat, until it is inside.
  const roots = pieces.filter((p) => ((p.at === 'mat' && p.on === null) || (p.at === 'basket' && p.far < 1)) && p !== held).sort((a, b) => a.py - b.py)
  return [...home, ...roots.flatMap((p) => withRiders(pieces, p)), ...(held ? withRiders(pieces, held) : [])]
}

/** The arch that a touch on the nest by the mat takes: the outermost one lying there. */
export function nestOf(pieces: readonly Piece[], held: Piece | null): Piece | null {
  return pieces.find((p) => p.at === 'home' && p.def.kind === 'arch' && p !== held) ?? null
}

const at: Stand = { x: 0, y: 0, rot: 0 }

/** Whether a point of the stage is on a thing as it is drawn now, or within `pad` of it. An arch is its band, so what shows through it can be touched through it. */
export function onShape(pieces: readonly Piece[], p: Piece, x: number, y: number, pad = 0, solid = false): boolean {
  stand(pieces, p, at)
  // Into the thing's own frame: from its foot, upright, facing right.
  const dx = x - at.x, dy = y - at.y, cos = Math.cos(-at.rot), sin = Math.sin(-at.rot)
  const lx = (dx * cos - dy * sin) * (p.def.kind === 'silk' || p.def.kind === 'arch' ? 1 : facing(p))
  // The silk over something is touched where the cloth is drawn: the whole drape, down to its hem, or the hammock in its cradle.
  const drape = p.def.kind === 'silk' ? drapeOf(pieces, p) : null
  if (drape) {
    const ly = dx * sin + dy * cos + drape.rim
    // The cloth as it is cut: a dome with straight sides below its shoulders and a hem at the foot; in a cradle it hangs the other way up.
    const u = (lx / drape.wide) * 100, v = (drape.high > 0 ? ly / drape.high : -ly / -drape.high) * 100, near = (pad / Math.min(drape.wide, Math.abs(drape.high))) * 100
    if (v > 8 + near || v < -104 - near) return false
    return v >= -52 ? Math.abs(u) <= 104 + near : Math.hypot(u / (104 + near), (v + 52) / (52 + near)) <= 1
  }
  // By the mat the silk lies in folds, or gathered: it is touched as it is drawn there.
  if (p.def.kind === 'silk') return covers('silk', lx, dx * sin + dy * cos, pad, 1, p.turned, solid, p.at === 'home' && !p.flight && !p.led && Math.abs(p.lift) < 1 ? (p.turned ? 'lyingHeap' : 'lying') : null)
  return covers(p.def.id, lx, dx * sin + dy * cos, pad, 1, p.turned, solid)
}

/** How near its outline a touch still counts as a thing's, where nothing is drawn on top at that point: small fingers aim wide. */
export const NEAR = 22

/** How near an arch's outline a touch still counts as the arch's while a thing is in hand. */
export const HELD_NEAR = 8

/** How far a point is from the middle of a thing, where it stands now. */
function fromMiddle(pieces: readonly Piece[], p: Piece, x: number, y: number): number {
  stand(pieces, p, at)
  return Math.hypot(x - at.x, y - (at.y - p.def.height / 2))
}

/**
 * What a touch at a point of the stage lands on: the thing in hand, which is drawn on top of everything, if
 * the point is on it or in its hollow; else the thing drawn on top at that point, by its shape; where no thing
 * is drawn there, the thing in hand if the point is near it, else (with nothing in hand) the nearest thing
 * whose outline is near,
 * else an arch whose hollow the point is in; then the basket, the cat, the mat or the pane.
 */
export function hit(pieces: readonly Piece[], held: Piece | null, tipped: boolean, x: number, y: number, skip: Piece | null = null): Target {
  // `skip` is a thing being let go: what is under it is asked for, so it and its riders are left out.
  // A thing on its way into the basket is the basket's already: a finger there means the basket.
  const order = drawOrder(pieces, held).filter((p) => rootOf(pieces, p) !== skip && p.at !== 'basket').reverse(), nest = nestOf(pieces, held ?? skip)
  // Whatever rides on the thing in hand is in hand with it, and the arches that lie nested by the mat are one target: the outermost.
  const own = (p: Piece): Piece => (held && rootOf(pieces, p) === held ? held : p.at === 'home' && p.def.kind === 'arch' && nest ? nest : p)
  // The thing in hand is nearest the child: a finger on it, or in its hollow, means it.
  if (held && order.some((p) => own(p) === held && onShape(pieces, p, x, y, 0, true))) return { kind: 'piece', piece: held }
  const front = order.find((p) => onShape(pieces, p, x, y))
  if (front) return { kind: 'piece', piece: own(front) }
  if (held && order.some((p) => own(p) === held && onShape(pieces, p, x, y, NEAR))) return { kind: 'piece', piece: held }
  // An empty hand that lands a little beside a thing takes it. A hand that holds a thing means what it lands on: beside a thing is the mat.
  let near: Piece | null = null, nearest = Infinity
  for (const p of held ? [] : order) {
    if (!onShape(pieces, p, x, y, NEAR)) continue
    const far = fromMiddle(pieces, p, x, y)
    if (far < nearest) { near = p; nearest = far }
  }
  if (near) return { kind: 'piece', piece: own(near) }
  // Nothing shows through the arch at that point: a finger in its hollow means the arch.
  // With a thing in hand the arch still answers a little way round it, so that the smallest arch is no smaller a target than a finger needs.
  const hollow = order.find((p) => p.def.kind === 'arch' && own(p) !== held && onShape(pieces, p, x, y, held ? HELD_NEAR : 0, true))
  if (hollow) return { kind: 'piece', piece: own(hollow) }
  if (inBasket(x, y, tipped)) return { kind: 'basket' }
  if (inBox(x, y, CAT.x, CAT.y, CAT.halfWidth, CAT.height)) return { kind: 'cat' }
  return { kind: onMat(x, y) ? 'mat' : 'pane' }
}
