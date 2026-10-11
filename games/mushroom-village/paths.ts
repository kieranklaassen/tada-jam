import type { Point } from './input'

// Pebble paths as plain numbers. A path is the list of grid points one
// stroke of a finger laid, in the order it laid them. Paths join where their
// points are neighbours on the grid, and a place where two strokes share a
// point is a meeting. Nothing here knows the glade: the model asks which
// pebbles lie where and how a gnome gets from one to another.

/** Pebbles lie on a grid of this many stage units. */
export const GRID = 20
/** The most points all paths hold together. */
export const MOST_POINTS = 240
/** Two pebbles this near are neighbours: next to each other on the grid, diagonals included. */
const NEAR = GRID * 1.5
/** A way round that is at least this many pebbles long is a loop a gnome can go round. */
const LOOP_FROM = 8

export type Path = Point[]

export const snap = (value: number): number => Math.round(value / GRID) * GRID
export const snapPoint = (at: Point): Point => ({ x: snap(at.x), y: snap(at.y) })
const keyOf = (p: Point): string => p.x + ',' + p.y

export function countPoints(paths: readonly Path[]): number {
  return paths.reduce((sum, path) => sum + path.length, 0)
}

/** The grid points on the way from `from` to `to`, one neighbour at a time, `from` left out and `to` included. */
export function stepsBetween(from: Point, to: Point): Point[] {
  const steps: Point[] = []
  let x = from.x, y = from.y
  while (x !== to.x || y !== to.y) {
    x += Math.sign(to.x - x) * GRID
    y += Math.sign(to.y - y) * GRID
    steps.push({ x, y })
  }
  return steps
}

/** How near a pebble a finger must land to be on it: a touch shape 56 units across, which is 48 px on a tablet of 1024 by 768. */
export const PEBBLE_REACH = 28

/** Which pebble lies nearest a point, within `reach`: its path and its place in that path. */
export function pebbleAt(paths: readonly Path[], x: number, y: number, reach = PEBBLE_REACH): { path: number; index: number } | null {
  let found: { path: number; index: number } | null = null, nearest = reach
  paths.forEach((path, p) => path.forEach((point, i) => {
    const d = Math.hypot(point.x - x, point.y - y)
    if (d <= nearest) { nearest = d; found = { path: p, index: i } }
  }))
  return found
}

/** Whether any pebble lies within `reach` of a point. */
export function leadsTo(paths: readonly Path[], at: Point, reach = 34): boolean {
  return paths.some((path) => path.some((point) => Math.hypot(point.x - at.x, point.y - at.y) <= reach))
}

/** The points where two strokes meet: a point that lies in two paths, or twice in one with other pebbles between. */
export function meetings(paths: readonly Path[]): Point[] {
  const seen = new Map<string, { path: number; index: number }>(), met = new Map<string, Point>()
  paths.forEach((path, p) => path.forEach((point, i) => {
    const key = keyOf(point), before = seen.get(key)
    if (before && (before.path !== p || i - before.index > 2)) met.set(key, point)
    if (!before) seen.set(key, { path: p, index: i })
  }))
  return [...met.values()]
}

export type Graph = { nodes: Point[]; next: number[][] }

/** Every pebble once, each with its neighbours. */
export function graphOf(paths: readonly Path[]): Graph {
  const index = new Map<string, number>(), nodes: Point[] = []
  for (const path of paths) for (const point of path) if (!index.has(keyOf(point))) { index.set(keyOf(point), nodes.length); nodes.push(point) }
  const next: number[][] = nodes.map(() => [])
  nodes.forEach((a, i) => {
    for (let dx = -GRID; dx <= GRID; dx += GRID) for (let dy = -GRID; dy <= GRID; dy += GRID) {
      if (dx === 0 && dy === 0) continue
      const j = index.get(keyOf({ x: a.x + dx, y: a.y + dy }))
      if (j !== undefined && Math.hypot(dx, dy) <= NEAR) next[i].push(j)
    }
  })
  return { nodes, next }
}

/** Breadth first from some pebbles: how far every pebble is, and the pebble before it on the way. */
function spread(graph: Graph, from: readonly number[]): { far: number[]; before: number[] } {
  const far = graph.nodes.map(() => -1), before = graph.nodes.map(() => -1)
  const queue = [...from]
  for (const i of from) far[i] = 0
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]
    for (const j of graph.next[i]) if (far[j] < 0) { far[j] = far[i] + 1; before[j] = i; queue.push(j) }
  }
  return { far, before }
}

function wayTo(before: readonly number[], to: number): number[] {
  const way: number[] = []
  for (let i = to; i >= 0; i = before[i]) way.unshift(i)
  return way
}

/** The shortest way over pebbles from any pebble that `starts` to the nearest that `ends`, or null when there is none. */
export function route(paths: readonly Path[], starts: (p: Point) => boolean, ends: (p: Point) => boolean): Point[] | null {
  const graph = graphOf(paths)
  const from = graph.nodes.flatMap((p, i) => (starts(p) ? [i] : []))
  if (from.length === 0) return null
  const { far, before } = spread(graph, from)
  let best = -1
  graph.nodes.forEach((p, i) => { if (far[i] >= 0 && ends(p) && (best < 0 || far[i] < far[best])) best = i })
  return best < 0 ? null : wayTo(before, best).map((i) => graph.nodes[i])
}

/** From the pebble nearest `from`: the way to the pebble farthest from it, the path's other end. Null when no pebble is near. */
export function wayToEnd(paths: readonly Path[], from: Point, reach = 34): Point[] | null {
  const graph = graphOf(paths)
  let start = -1
  graph.nodes.forEach((p, i) => { if (Math.hypot(p.x - from.x, p.y - from.y) <= reach && (start < 0 || Math.hypot(p.x - from.x, p.y - from.y) < Math.hypot(graph.nodes[start].x - from.x, graph.nodes[start].y - from.y))) start = i })
  if (start < 0) return null
  const { far, before } = spread(graph, [start])
  let end = start
  far.forEach((d, i) => { if (d > far[end]) end = i })
  return wayTo(before, end).map((i) => graph.nodes[i])
}

/**
 * A loop on the pebbles that can be reached from the pebble nearest `from`: the way to it and the way once round
 * it, or null when the path has none. Two neighbours that are far apart along the path close a loop; pebbles that
 * merely lie side by side do not.
 */
export function loopFrom(paths: readonly Path[], from: Point, reach = 34): { to: Point[]; round: Point[] } | null {
  const graph = graphOf(paths)
  let start = -1
  graph.nodes.forEach((p, i) => { if (Math.hypot(p.x - from.x, p.y - from.y) <= reach && start < 0) start = i })
  if (start < 0) return null
  const { far, before } = spread(graph, [start])
  let found: number[] | null = null
  graph.nodes.forEach((_, u) => {
    if (far[u] < 0) return
    for (const v of graph.next[u]) {
      if (v <= u || before[u] === v || before[v] === u) continue
      const a = wayTo(before, u), b = wayTo(before, v)
      let shared = 0
      while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared += 1
      const round = [...a.slice(shared - 1), ...b.slice(shared).reverse()]
      if (round.length >= LOOP_FROM && (!found || round.length > found.length)) found = round
    }
  })
  if (!found) return null
  const loop: number[] = found
  return { to: wayTo(before, loop[0]).map((i) => graph.nodes[i]), round: [...loop, loop[0]].map((i) => graph.nodes[i]) }
}

/** How long a way over points is, in stage units. */
export function lengthOf(way: readonly Point[]): number {
  let length = 0
  for (let i = 1; i < way.length; i++) length += Math.hypot(way[i].x - way[i - 1].x, way[i].y - way[i - 1].y)
  return length
}

/** The point a share of the way along, 0 at its start and 1 at its end. */
export function along(way: readonly Point[], share: number): Point {
  if (way.length === 0) return { x: 0, y: 0 }
  let left = Math.min(1, Math.max(0, share)) * lengthOf(way)
  for (let i = 1; i < way.length; i++) {
    const d = Math.hypot(way[i].x - way[i - 1].x, way[i].y - way[i - 1].y)
    if (left <= d && d > 0) return { x: way[i - 1].x + ((way[i].x - way[i - 1].x) * left) / d, y: way[i - 1].y + ((way[i].y - way[i - 1].y) * left) / d }
    left -= d
  }
  return way[way.length - 1]
}

/**
 * The grid points between `from` and `to` on the shortest way round what is not `free`, one neighbour at a time
 * and both ends left out: how a stroke that went through a mushroom's foot is laid round it. Empty when the two
 * are neighbours already, or when there is no way round within a few steps.
 */
export function wayRound(from: Point, to: Point, free: (p: Point) => boolean, margin = 4): Point[] {
  if (Math.hypot(to.x - from.x, to.y - from.y) <= NEAR) return []
  const x0 = Math.min(from.x, to.x) - margin * GRID, x1 = Math.max(from.x, to.x) + margin * GRID
  const y0 = Math.min(from.y, to.y) - margin * GRID, y1 = Math.max(from.y, to.y) + margin * GRID
  const before = new Map<string, Point | null>([[keyOf(from), null]])
  const queue: Point[] = [from]
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head]
    if (at.x === to.x && at.y === to.y) {
      const way: Point[] = []
      for (let p = before.get(keyOf(at)) ?? null; p && !(p.x === from.x && p.y === from.y); p = before.get(keyOf(p)) ?? null) way.unshift(p)
      return way
    }
    // Straight neighbours before diagonal ones, so the way round hugs what it goes round.
    for (const [dx, dy] of [[GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID], [GRID, GRID], [-GRID, GRID], [GRID, -GRID], [-GRID, -GRID]]) {
      const next = { x: at.x + dx, y: at.y + dy }, key = keyOf(next)
      if (before.has(key) || next.x < x0 || next.x > x1 || next.y < y0 || next.y > y1) continue
      if (!(next.x === to.x && next.y === to.y) && !free(next)) continue
      before.set(key, at)
      queue.push(next)
    }
  }
  return []
}

/** Every pebble that can be reached over pebbles from one that `starts`. */
export function reachable(paths: readonly Path[], starts: (p: Point) => boolean): Point[] {
  const graph = graphOf(paths)
  const from = graph.nodes.flatMap((p, i) => (starts(p) ? [i] : []))
  if (from.length === 0) return []
  const { far } = spread(graph, from)
  return graph.nodes.filter((_, i) => far[i] >= 0)
}
