import { beetleHome, packetPlaces, potAt, standingOf, targetAt, type Point, type Target } from './hit'
import type { ThingId } from './things'
import type { LabState } from './lab'
import type { Layout } from './layout'
import { bigAsksOf } from './order'
import type { PotRow } from './page'
import { visitorSpot } from './walker'

// What lies under a finger in the game: everything the toy can touch
// (hit.ts), and the visitors, their larger sketch, the tools, the loupe and
// the runner buds. No DOM.

export type GameTarget =
  | Target
  /** The visitor on the page. */
  | { kind: 'visitor' }
  /** Its sketch, where it carries a larger one that a touch unrolls or rolls up. */
  | { kind: 'sketch' }
  /** The next visitor, waiting at the edge. */
  | { kind: 'waiting' }
  | { kind: 'can' }
  | { kind: 'blotter' }
  | { kind: 'loupe' }
  | { kind: 'bud'; plant: number }
  /** The worm's head, where it stands up out of a bare pot above the pot's own handle. */
  | { kind: 'worm'; pot: number }
  /** A paper thing of the page (things.ts): it answers a touch in a small way of its own and is part of no move. */
  | { kind: 'thing'; id: ThingId }

const inRect = (p: Point, r: { x: number; y: number; w: number; h: number }) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
const near = (p: Point, c: Point, r: number) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2 <= r * r

/** Where the can and the blotter stand when they are not in the hand: the point each is drawn from. The view draws them there. */
export function toolHome(layout: Layout, kind: 'can' | 'blotter'): Point {
  const box = layout.tools[kind]
  return kind === 'can' ? { x: box.x + box.w * 0.39, y: box.y + box.h * 0.58 } : { x: box.x + box.w / 2, y: box.y + box.h * 0.56 }
}

/** Where the loupe lies when it is not in the hand: the middle of its glass, by the beetle. The view draws it there. */
export function loupeHome(layout: Layout): { x: number; y: number; r: number } {
  const home = beetleHome(layout)
  return { x: home.x - 72 * home.s, y: home.y - 22.7 * home.s, r: Math.max(26, 30 * home.s) }
}

/**
 * What a finger at `point` touches, in the game. The small things first: a
 * runner bud before the pot beside it, the loupe before the beetle, a tool,
 * a visitor or its sketch; then whatever the toy finds there.
 */
export function gameTargetAt(state: LabState, layout: Layout, point: Point, inBloom: (id: number) => boolean, beetle: Point = beetleHome(layout), loupeInHand = false): GameTarget {
  const below = targetAt(state, layout, point, inBloom, beetle)
  if (below.kind === 'none') return below
  if (state.kit.includes('runner')) {
    for (const plant of state.plants) {
      if (plant.row === 'border' || !inBloom(plant.id)) continue
      const bud = layout[plant.row][plant.slot].bud
      if (near(point, bud, bud.r)) return { kind: 'bud', plant: plant.id }
    }
  }
  const loupe = loupeHome(layout)
  if (!loupeInHand && near(point, loupe, loupe.r)) return { kind: 'loupe' }
  if (state.kit.includes('water')) {
    if (inRect(point, layout.tools.can)) return { kind: 'can' }
    if (inRect(point, layout.tools.blotter)) return { kind: 'blotter' }
  }
  if (state.visitor) {
    if (inRect(point, layout.wish) && !state.finished && bigAsksOf(state.visitor, state.kit)) return { kind: 'sketch' }
    if (inRect(point, layout.visitor) || inRect(point, layout.wish)) return { kind: 'visitor' }
  }
  if (inRect(point, layout.waiting)) return { kind: 'waiting' }
  // The first visitor of a page waits on the visitors' own ground, with nobody there yet: a touch anywhere on that ground is a touch on it.
  if (!state.visitor && layout.wide && inRect(point, layout.visitor)) return { kind: 'waiting' }
  return below
}

/** Where a carried thing is let go: on the visitor, in the beetle's corner, on a pot, or nowhere in particular. */
export type Drop = { kind: 'visitor' } | { kind: 'corner' } | { kind: 'pot'; row: PotRow; slot: number } | { kind: 'paper' }

export function dropAt(state: LabState, layout: Layout, point: Point): Drop {
  if (state.visitor && (inRect(point, layout.visitor) || inRect(point, layout.wish))) return { kind: 'visitor' }
  if (inRect(point, layout.beetle)) return { kind: 'corner' }
  const pot = potAt(layout, point)
  return pot ? { kind: 'pot', ...pot } : { kind: 'paper' }
}

/** Whether a point is over the tray: where the loupe, let go, sorts the plants standing there. */
export function overTray(layout: Layout, point: Point): boolean {
  const first = layout.tray[0].cell, last = layout.tray[layout.tray.length - 1].cell
  return inRect(point, { x: first.x, y: first.y, w: last.x + last.w - first.x, h: first.h })
}

/** The plant whose flower, stem or pot the loupe's glass is over, or the pod it is over: what its note is about. */
export function underLoupe(state: LabState, layout: Layout, point: Point): { plant: number; pod: boolean } | null {
  for (const plant of state.plants) {
    const at = standingOf(layout, plant)
    if (state.pods.some((pod) => pod.on === plant.id) && near(point, at.pod, 26 * at.k + 8)) return { plant: plant.id, pod: true }
  }
  let best: { plant: number; gap: number } | null = null
  for (const plant of state.plants) {
    const at = standingOf(layout, plant)
    // Anywhere along the plant counts, from its soil to a little above its flower.
    if (point.y < at.flower.y - 40 * at.k || point.y > at.y + 30 * at.k) continue
    const gap = Math.abs(point.x - at.x)
    if (gap < Math.max(22, 44 * at.k) && (!best || gap < best.gap)) best = { plant: plant.id, gap }
  }
  return best ? { plant: best.plant, pod: false } : null
}

/** The place of the visitor on the page as a point to carry something to, for the idle ladder's hand. */
export function visitorPoint(state: LabState, layout: Layout): Point | null {
  if (!state.visitor) return null
  const spot = visitorSpot(layout, state.visitor.who)
  return { x: spot.x, y: spot.y - 30 * spot.s }
}

export { packetPlaces }
