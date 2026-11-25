import { HALF, HOME, THINGS, type Point } from './layout'
import { ready, seat, type World } from './world'

// What the hand shows: the one next act.

export type Hint = { glow: 'ball' | 'man'; path: Point[] }

export function hintFor(world: World): Hint | null {
  if (world.walk || world.hop || world.heap?.t) return null
  if (ready(world)) return { glow: 'man', path: [{ x: HOME.x, y: 420 }] }
  const b = world.ball
  if (!b || b.fall > 0) return null
  const from = { x: b.x, y: b.y - b.r * 0.6 }
  // By the nearest thing that lies on the way, and on to him.
  let via: Point | null = null, best = Infinity
  if (!b.things.length || b.r < 60) for (const id of THINGS) {
    const p = world.loose[id]
    if (!p || p.x < b.x + 60 || p.x > HOME.x - 120) continue
    const d = Math.hypot(p.x - b.x, (p.y - b.y) * 1.5)
    if (d < best) { best = d; via = { x: p.x, y: p.y - HALF[id] * 0.6 } }
  }
  const top = seat(world, Math.max(50, b.r))
  const to = { x: top.x, y: Math.max(top.y, 180) }
  return { glow: 'ball', path: via ? [from, via, { x: HOME.x - 60, y: HOME.y }, to] : [from, { x: HOME.x - 60, y: HOME.y }, to] }
}
/** A place along a path, u from 0 to 1. */
export function along(path: readonly Point[], u: number): Point {
  let total = 0
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
  let left = u * total
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
    if (left <= d && d > 0) return { x: path[i - 1].x + ((path[i].x - path[i - 1].x) * left) / d, y: path[i - 1].y + ((path[i].y - path[i - 1].y) * left) / d }
    left -= d
  }
  return path.at(-1)!
}
