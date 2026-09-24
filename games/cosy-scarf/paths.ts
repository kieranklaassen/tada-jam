import { BASKET, LOOM } from './layout'

// Walks on the snow go round things instead of through them: the loom, the
// basket, and friends standing on the slope. A walk is a few straight legs
// between the corners of what is in the way, each kept a walker's reach
// clear of it.

export type Point2 = { x: number; z: number }

/** Something on the snow a walker keeps clear of: a box (x0..x1, z0..z1) or a round (x, z, r). */
export type Obstacle = { kind: 'box'; x0: number; x1: number; z0: number; z1: number } | { kind: 'round'; x: number; z: number; r: number }

const KNOB = 2.7
/** The loom's footprint: its posts and knobs, and the feet running forward under them. */
export const LOOM_FOOTPRINT: Obstacle = {
  kind: 'box',
  x0: LOOM.x - LOOM.postX - KNOB,
  x1: LOOM.x + LOOM.postX + KNOB,
  z0: LOOM.z - KNOB,
  z1: LOOM.z + LOOM.foot.z + LOOM.foot.length / 2 + LOOM.foot.radius,
}

/** The basket with its rim and handles. */
export const BASKET_FOOTPRINT: Obstacle = { kind: 'round', x: BASKET.x, z: BASKET.z, r: Math.hypot(BASKET.handle.out + BASKET.handle.tube, BASKET.handle.ring + BASKET.handle.tube) }

/** The corners a route may turn at sit this much further out than the walker needs. */
const TURN_OUT = 0.5

function segmentPoint(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len = dx * dx + dz * dz
  const t = len > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len)) : 0
  return Math.hypot(px - ax - dx * t, pz - az - dz * t)
}

function boxPoint(px: number, pz: number, o: Extract<Obstacle, { kind: 'box' }>): number {
  return Math.hypot(Math.max(o.x0 - px, 0, px - o.x1), Math.max(o.z0 - pz, 0, pz - o.z1))
}

/** How close the segment a–b comes to obstacle `o` (0 when it crosses it). */
export function segmentClearance(ax: number, az: number, bx: number, bz: number, o: Obstacle): number {
  if (o.kind === 'round') return Math.max(0, segmentPoint(o.x, o.z, ax, az, bx, bz) - o.r)
  // Clip the segment to the box (slab test): any overlap is a crossing.
  let t0 = 0
  let t1 = 1
  const dx = bx - ax
  const dz = bz - az
  for (const [p, d, lo, hi] of [
    [ax, dx, o.x0, o.x1],
    [az, dz, o.z0, o.z1],
  ]) {
    if (Math.abs(d) < 1e-12) {
      if (p < lo || p > hi) t0 = 2
    } else {
      const u = (lo - p) / d
      const v = (hi - p) / d
      t0 = Math.max(t0, Math.min(u, v))
      t1 = Math.min(t1, Math.max(u, v))
    }
  }
  if (t0 <= t1) return 0
  return Math.min(
    boxPoint(ax, az, o),
    boxPoint(bx, bz, o),
    segmentPoint(o.x0, o.z0, ax, az, bx, bz),
    segmentPoint(o.x1, o.z0, ax, az, bx, bz),
    segmentPoint(o.x0, o.z1, ax, az, bx, bz),
    segmentPoint(o.x1, o.z1, ax, az, bx, bz),
  )
}

function pointClearance(x: number, z: number, o: Obstacle): number {
  return o.kind === 'round' ? Math.max(0, Math.hypot(x - o.x, z - o.z) - o.r) : boxPoint(x, z, o)
}

/** Where a route may turn round obstacle `o` for a walker needing `room`. */
function corners(o: Obstacle, room: number, out: Point2[]): void {
  const r = room + TURN_OUT
  if (o.kind === 'box') {
    out.push({ x: o.x0 - r, z: o.z0 - r }, { x: o.x1 + r, z: o.z0 - r }, { x: o.x1 + r, z: o.z1 + r }, { x: o.x0 - r, z: o.z1 + r })
    return
  }
  // An octagon round the obstacle, its sides `r` clear.
  const out8 = (o.r + r) / Math.cos(Math.PI / 8)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    out.push({ x: o.x + Math.cos(a) * out8, z: o.z + Math.sin(a) * out8 })
  }
}

/**
 * The shortest route from `from` to `to` that keeps `room` clear of every
 * obstacle: its turning points after `from`, ending at `to`. A walker that
 * starts or ends nearer than `room` to something (stepping off or onto its
 * own spot) comes no nearer to it on the way.
 */
export function planRoute(from: Point2, to: Point2, room: number, obstacles: readonly Obstacle[]): Point2[] {
  const nodes: Point2[] = [from, to]
  for (const o of obstacles) corners(o, room, nodes)
  const near = nodes.map((p) => obstacles.map((o) => Math.min(room, pointClearance(p.x, p.z, o))))
  // Turning points that sit inside another obstacle's reach are no use.
  const usable = near.map((n, i) => i < 2 || n.every((c) => c >= room))
  const clear = (a: number, b: number) => obstacles.every((o, k) => segmentClearance(nodes[a].x, nodes[a].z, nodes[b].x, nodes[b].z, o) >= Math.min(near[a][k], near[b][k]) - 1e-6)
  const n = nodes.length
  const cost = new Array<number>(n).fill(Infinity)
  const back = new Array<number>(n).fill(-1)
  const done = new Array<boolean>(n).fill(false)
  cost[0] = 0
  for (;;) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && usable[i] && cost[i] < Infinity && (u < 0 || cost[i] < cost[u])) u = i
    if (u < 0 || u === 1) break
    done[u] = true
    for (let v = 0; v < n; v++) {
      if (done[v] || !usable[v]) continue
      const c = cost[u] + Math.hypot(nodes[v].x - nodes[u].x, nodes[v].z - nodes[u].z)
      if (c < cost[v] && clear(u, v)) {
        cost[v] = c
        back[v] = u
      }
    }
  }
  if (back[1] < 0) return [{ x: to.x, z: to.z }]
  const route: Point2[] = []
  for (let i = 1; i !== 0; i = back[i]) route.push({ x: nodes[i].x, z: nodes[i].z })
  return route.reverse()
}
