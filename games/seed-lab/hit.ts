import { SHELF_POTS, type LabState, type Plant } from './lab'
import { HANDLE, PLANT, flowerHandle, stemHeight, type Layout, type PotPlace } from './layout'
import { plantAt, podOn, type PotRow } from './page'
import { PACKET_IDS, lookOf, type PacketId } from './plant'

// What lies under a finger. No DOM: the page, its layout and a point in, a
// target out. Handles are generous, at least 48 px across, and where two
// meet the smaller thing wins: a pod before its flower, a flower before the
// plant under it.

export type Point = { x: number; y: number }

export type Target =
  | { kind: 'flower'; plant: number }
  | { kind: 'pod'; plant: number }
  /** A pot and whatever stands in it: its plant's stem and leaves count as the pot. `plant` is none for bare soil. */
  | { kind: 'pot'; row: PotRow; slot: number; plant: number | null }
  | { kind: 'border'; plant: number }
  | { kind: 'packet'; packet: PacketId }
  | { kind: 'beetle' }
  | { kind: 'paper' }
  /** The grown-up's corner at the top right: nothing of the game answers there. */
  | { kind: 'none' }

/** Where the middle of a pod hangs from the middle of its flower, at scale 1. The view draws it there (specimen.ts), and a test holds the two together. */
export const POD_AT = { x: 39.5, y: 28 } as const

/** The side of the square at the top right that is kept bare for the grown-up's overlay. */
export const GROWN_UP_CORNER = 72

const POT_ROWS: readonly PotRow[] = ['shelf', 'tray']

/** Where a plant in a pot stands: its place, its soil point, and its flower and pod. */
export function standingOf(layout: Layout, plant: Plant): { x: number; y: number; k: number; flower: Point; pod: Point; place: PotPlace | null } {
  const joints = lookOf(plant.pairs, plant.dry).joints
  if (plant.row === 'border') {
    const spot = layout.border[plant.slot] ?? layout.border[layout.border.length - 1]
    const top = spot.ground - stemHeight(joints, layout.small)
    return { x: spot.x, y: spot.ground, k: layout.small, flower: { x: spot.x, y: top }, pod: { x: spot.x, y: top }, place: null }
  }
  const place = layout[plant.row][plant.slot], k = layout.k
  const top = place.soil - stemHeight(joints, k)
  return { x: place.x, y: place.soil + k, k, flower: { x: place.x, y: top }, pod: { x: place.x + POD_AT.x * k, y: top + POD_AT.y * k }, place }
}

/** The packets that have arrived, in their fixed order, each with its place. */
export function packetPlaces(state: LabState, layout: Layout): { packet: PacketId; x: number; y: number; w: number; h: number }[] {
  return PACKET_IDS.filter((id) => state.kit.includes(id)).flatMap((packet, at) => (layout.packets[at] ? [{ packet, ...layout.packets[at] }] : []))
}

/**
 * The one strip of tape that will not lie flat: where it is stuck down (the corner of the tray's last cell), how it is
 * turned, and where its free end is. The view draws it by these numbers and the beetle walks to them.
 */
export function stubbornTape(layout: Layout): { x: number; y: number; turn: number; end: Point } {
  const last = layout.tray[layout.tray.length - 1].cell, k = layout.k, x = last.x + last.w + 1 * k, y = last.y + last.h, turn = -0.78
  return { x, y, turn, end: { x: x + Math.cos(turn) * 33 * k, y: y + Math.sin(turn) * 33 * k } }
}

/** How far in front of the middle of its feet the beetle's forefeet come down when it leans in, in its own size. */
export const BEETLE_REACH = 48

/**
 * How far the beetle walks from home to press the strip's free end with its forefeet. Where its corner is not beside
 * that strip (an upright page) it does not cross the page for it: it takes a small step and presses where it is.
 */
export function tapeWalk(layout: Layout): number {
  const home = beetleHome(layout), walk = home.x - (stubbornTape(layout).end.x + BEETLE_REACH * home.s)
  return walk > 0 && walk < 220 * home.s && Math.abs(home.y - stubbornTape(layout).end.y) < 30 * home.s ? walk : 18 * home.s
}

/** Where the beetle is at home: its feet, and its size against the plants. The view places it by the same numbers. */
export function beetleHome(layout: Layout): { x: number; y: number; s: number } {
  const box = layout.beetle
  return { x: box.x + box.w * 0.64, y: box.y + box.h * 0.9, s: Math.min(1.7 * layout.k, box.w / 205, box.h / 100) }
}

const inRect = (p: Point, r: { x: number; y: number; w: number; h: number }) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
const near = (p: Point, c: Point, r: number) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2 <= r * r

/**
 * What a finger at `point` touches. `inBloom` says whether a plant has
 * finished drawing itself: one that has not has no flower to touch yet.
 * `beetle` is where the beetle's feet are now.
 */
export function targetAt(state: LabState, layout: Layout, point: Point, inBloom: (id: number) => boolean, beetle: Point = beetleHome(layout)): Target {
  if (point.x > layout.w - GROWN_UP_CORNER && point.y < GROWN_UP_CORNER) return { kind: 'none' }
  const k = layout.k
  // Pods first, then flowers: both sit at the top of a plant, and the pod is the smaller.
  for (const plant of state.plants) {
    if (plant.row === 'border' || !podOn(state, plant.id)) continue
    if (near(point, standingOf(layout, plant).pod, Math.max(HANDLE * 0.42, 20 * k))) return { kind: 'pod', plant: plant.id }
  }
  for (const plant of state.plants) {
    if (plant.row === 'border' || !inBloom(plant.id)) continue
    const handle = flowerHandle(layout[plant.row][plant.slot], lookOf(plant.pairs, plant.dry).joints, k)
    if (near(point, handle, handle.r)) return { kind: 'flower', plant: plant.id }
  }
  const home = beetleHome(layout)
  if (inRect(point, { x: beetle.x - 62 * home.s, y: beetle.y - 78 * home.s, w: 118 * home.s, h: 86 * home.s })) return { kind: 'beetle' }
  for (const spot of packetPlaces(state, layout)) if (inRect(point, spot)) return { kind: 'packet', packet: spot.packet }
  for (const row of POT_ROWS) {
    for (let slot = 0; slot < SHELF_POTS; slot++) {
      const place = layout[row][slot], plant = plantAt(state, row, slot)
      const half = Math.max(HANDLE / 2, PLANT.leaf * k)
      const top = plant ? place.soil - stemHeight(lookOf(plant.pairs, plant.dry).joints, k) : place.pot.y
      if (inRect(point, place.pot) || (plant && inRect(point, { x: place.x - half, y: top, w: half * 2, h: place.soil - top }))) return { kind: 'pot', row, slot, plant: plant?.id ?? null }
    }
  }
  for (const plant of state.plants) {
    if (plant.row !== 'border' || !layout.border[plant.slot] || !inRect(point, layout.border[plant.slot].cell)) continue
    // A border plant is small: where it holds a pod, the whole of it is the pod's handle.
    return podOn(state, plant.id) ? { kind: 'pod', plant: plant.id } : { kind: 'border', plant: plant.id }
  }
  return { kind: 'paper' }
}

/** The pot a thing let go at `point` is set down on: the pot whose slot holds the point, or the nearest pot within reach, or none. */
export function potAt(layout: Layout, point: Point, reach = 70): { row: PotRow; slot: number } | null {
  let best: { row: PotRow; slot: number } | null = null, bestGap = reach
  for (const row of POT_ROWS) {
    for (let slot = 0; slot < layout[row].length; slot++) {
      const cell = layout[row][slot].cell
      if (inRect(point, cell)) return { row, slot }
      const dx = Math.max(cell.x - point.x, 0, point.x - cell.x - cell.w), dy = Math.max(cell.y - point.y, 0, point.y - cell.y - cell.h)
      const gap = Math.hypot(dx, dy)
      if (gap < bestGap) { best = { row, slot }; bestGap = gap }
    }
  }
  return best
}

/**
 * Where dust let go at `point` lands. On a pod or a flower it touches; on the
 * beetle or a packet; otherwise on whatever stands in the pot whose slot
 * holds the point, so a child need not hit the flower itself: a plant in
 * bloom takes it on its flower, bare soil takes it as soil. Anywhere else it
 * falls on the paper.
 */
export function dustAt(state: LabState, layout: Layout, point: Point, inBloom: (id: number) => boolean, beetle: Point = beetleHome(layout)): Target {
  const exact = targetAt(state, layout, point, inBloom, beetle)
  if (exact.kind === 'flower' || exact.kind === 'pod' || exact.kind === 'beetle' || exact.kind === 'packet' || exact.kind === 'none') return exact
  const pot = potAt(layout, point, 0)
  if (!pot) return { kind: 'paper' }
  const plant = plantAt(state, pot.row, pot.slot)
  if (!plant) return { kind: 'pot', row: pot.row, slot: pot.slot, plant: null }
  if (!inBloom(plant.id)) return { kind: 'paper' }
  return podOn(state, plant.id) ? { kind: 'pod', plant: plant.id } : { kind: 'flower', plant: plant.id }
}
