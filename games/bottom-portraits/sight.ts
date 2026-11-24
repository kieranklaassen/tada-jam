import { FIGURES, STAND, type Box, type Id, type Turn } from './cast'
import { EYE, FRAME_ASPECT, SPOTS, inRoom, seenFrom, type P3, type View } from './layout'
import type { Arrangement } from './table'

// What the painter sees, in numbers: how he frames it, and how each one comes
// out. The picture is drawn with the same frame, so the two cannot disagree.

/** Near places, towards the painter: he is too close to them to fit anything over this in. */
const NEAR_TOP = 3.75
export const isNear = (spot: number): boolean => SPOTS[spot].z < 0
export const topOf = (id: Id, spot: number): number => {
  const top = FIGURES[id].height + STAND.h
  return isNear(spot) ? Math.min(NEAR_TOP, top) : top
}

/** His frame closes in on whoever stands there. */
export function framing(arrangement: Arrangement): View {
  const view: View = { at: EYE, to: { x: 0, y: 1.6, z: 0 }, fov: 40, aspect: FRAME_ASPECT }
  const points: P3[] = []
  arrangement.forEach((entry, n) => {
    if (!entry) return
    const r = 1.2, top = topOf(entry[0], n), p = SPOTS[n]
    for (const x of [-r, r]) for (const y of [0.06, top]) points.push({ x: p.x + x, y, z: p.z })
  })
  if (points.length === 0) return view
  let half = 0
  for (let pass = 0; pass < 6; pass++) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const p of points) {
      const s = seenFrom(view, p)
      x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y)
    }
    const far = Math.hypot(view.to.x - EYE.x, view.to.y - EYE.y, view.to.z - EYE.z), t = Math.tan((view.fov * Math.PI) / 360)
    // Aim at the middle of what is seen. Looking down the room, the picture's right is the child's left.
    view.to = { x: view.to.x - ((x0 + x1) / 2) * t * view.aspect * far, y: view.to.y + ((y0 + y1) / 2) * t * far, z: view.to.z }
    half = Math.max((x1 - x0) / 2, (y1 - y0) / 2) * t * 1.07
    view.fov = (Math.atan(half) * 360) / Math.PI
  }
  return view
}

export type Side = 'front' | 'back' | 'side'
export type Sight = { id: Id; spot: number; side: Side; how: 'seen' | 'hidden' | 'cut' | 'hole' }

/** Which side meets the painter. Turn 0 looks at the child, so he has its back. */
export const sideOf = (turn: Turn): Side => (turn === 2 ? 'front' : turn === 0 ? 'back' : 'side')

type Rect = { x0: number; x1: number; y0: number; y1: number; far: number }

function rectOf(view: View, spot: number, turn: Turn, box: Box): Rect {
  const r: Rect = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, far: Infinity }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const s = seenFrom(view, inRoom(SPOTS[spot], turn, box.x + sx * box.hx, box.y + STAND.h + sy * box.hy, box.z + sz * box.hz))
    r.x0 = Math.min(r.x0, s.x); r.x1 = Math.max(r.x1, s.x); r.y0 = Math.min(r.y0, s.y); r.y1 = Math.max(r.y1, s.y); r.far = Math.min(r.far, s.far)
  }
  return r
}

/** The share of `what` that `covers` leave in sight. */
function left(what: readonly Rect[], covers: readonly Rect[]): number {
  let seen = 0, all = 0
  for (const r of what) for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
    const x = r.x0 + ((i + 0.5) / 12) * (r.x1 - r.x0), y = r.y0 + ((j + 0.5) / 12) * (r.y1 - r.y0)
    all++
    if (!covers.some((c) => x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1)) seen++
  }
  return seen / all
}

/** What the picture will show of each one on the table, nearest to him first. */
export function sights(arrangement: Arrangement): Sight[] {
  const view = framing(arrangement), out: Sight[] = []
  arrangement.forEach((entry, spot) => {
    if (!entry) return
    const [id, turn] = entry, figure = FIGURES[id], side = sideOf(turn)
    const body = rectOf(view, spot, turn, figure.body), head = rectOf(view, spot, turn, figure.head)
    const before = isNear(spot) ? null : arrangement[spot + 2]
    let how: Sight['how'] = 'seen'
    if (seenFrom(view, inRoom(SPOTS[spot], turn, figure.head.x, figure.head.y + STAND.h, figure.head.z)).y > 0.9) how = 'cut'
    if (before && before[0] === 'board' && before[1] % 2 === 0) how = id === 'board' ? 'hidden' : 'hole'
    else {
      const covers: Rect[] = []
      arrangement.forEach((other, n) => {
        if (!other || n === spot || !isNear(n) || isNear(spot)) return
        covers.push(rectOf(view, n, other[1], FIGURES[other[0]].body), ...(other[0] === 'board' ? [] : [rectOf(view, n, other[1], FIGURES[other[0]].head)]))
      })
      if (covers.length > 0 && left([body, head], covers) < 0.22 && left([head], covers) < 0.3) how = 'hidden'
    }
    out.push({ id, spot, side, how })
  })
  return out.sort((a, b) => SPOTS[a.spot].z - SPOTS[b.spot].z || a.spot - b.spot)
}

/** The affront: two or more, no board, and every one painted from behind. */
export function affronts(arrangement: Arrangement): boolean {
  const seen = sights(arrangement)
  return seen.length >= 2 && seen.every((s) => s.id !== 'board' && s.side === 'back' && s.how === 'seen')
}

export type Act = 'front' | 'back' | 'side' | 'cut' | 'hole'
export const actOf = (sight: Sight): Act => (sight.how === 'hole' ? 'hole' : sight.how === 'seen' ? sight.side : 'cut')
