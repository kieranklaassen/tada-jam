import type { Point } from './input'
import { ROAD, TAPE_WIDTH, type Kind } from './layout'
import { along, angleOf, isStub, lengthOf, nearestOn, type Strip } from './tape'

// The strips of one tape taken together, and where they join: the roads
// (grey), and in the same way the rivers, hedges and rails.
// Nothing here is stored. A join is where two strips of the same tape cross
// or touch, and a rider is a toy's place on one strip: which strip, how far
// along, and which way it is heading. The car's one habit lives here: at
// every join it takes the turn onto the other strip, toward that strip's
// longer side.

export type Join = {
  /** The two strips, as indices into the network's own list. */
  i: number
  j: number
  /** How far along each strip the join lies. */
  di: number
  dj: number
}

export type Network = { strips: Strip[]; joins: Join[] }

/** Two strips this near each other at an end are stuck together. */
const TOUCH = TAPE_WIDTH * 0.75

function crossing(p: Strip, q: Strip): { dp: number; dq: number } | null {
  const lp = lengthOf(p), lq = lengthOf(q)
  const px = (p.bx - p.ax) / lp, py = (p.by - p.ay) / lp, qx = (q.bx - q.ax) / lq, qy = (q.by - q.ay) / lq
  const cross = px * qy - py * qx
  if (Math.abs(cross) > 0.08) {
    // Where the two centre lines meet. Each strip reaches half a width past its ends, so two ends laid corner to corner join.
    const wx = q.ax - p.ax, wy = q.ay - p.ay
    const dp = (wx * qy - wy * qx) / cross, dq = (wx * py - wy * px) / cross
    const reach = TAPE_WIDTH / 2
    if (dp >= -reach && dp <= lp + reach && dq >= -reach && dq <= lq + reach) return { dp: clamp(dp, 0, lp), dq: clamp(dq, 0, lq) }
  }
  // An end of one lying on the other, as when a road is carried on in the same line.
  let best: { dp: number; dq: number; off: number } | null = null
  for (const [d, end] of [[0, { x: q.ax, y: q.ay }], [lq, { x: q.bx, y: q.by }]] as const) {
    const near = nearestOn(p, end)
    if (near.off <= TOUCH && (!best || near.off < best.off)) best = { dp: near.d, dq: d, off: near.off }
  }
  for (const [d, end] of [[0, { x: p.ax, y: p.ay }], [lp, { x: p.bx, y: p.by }]] as const) {
    const near = nearestOn(q, end)
    if (near.off <= TOUCH && (!best || near.off < best.off)) best = { dp: d, dq: near.d, off: near.off }
  }
  return best && { dp: best.dp, dq: best.dq }
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

/** The strips of one tape and their joins. A stub joins nothing: there is no way along it. */
export function network(strips: readonly Strip[], kind: Kind = ROAD): Network {
  const own = strips.filter((strip) => strip.kind === kind)
  const joins: Join[] = []
  for (let i = 0; i < own.length; i++) {
    for (let j = i + 1; j < own.length; j++) {
      if (isStub(own[i]) || isStub(own[j])) continue
      const at = crossing(own[i], own[j])
      if (at) joins.push({ i, j, di: at.dp, dj: at.dq })
    }
  }
  return { strips: own, joins }
}

export type Rider = {
  /** Which strip of the network, how far along it, and which way: 1 toward its second end, -1 toward its first. */
  s: number
  d: number
  dir: 1 | -1
  /** The join just taken, which is not taken again until the rider is clear of it. -1 for none. */
  skip: number
}

export function placeOf(net: Network, rider: Rider): Point {
  return along(net.strips[rider.s], rider.d)
}

export function headingOf(net: Network, rider: Rider): number {
  const angle = angleOf(net.strips[rider.s])
  return rider.dir === 1 ? angle : angle + Math.PI
}

/** The strip of the network that `at` stands on, nearest first, or null: a rider there, heading the way `heading` is nearest to. */
export function locate(net: Network, at: Point, heading: number): Rider | null {
  let found: { s: number; d: number; off: number } | null = null
  net.strips.forEach((strip, s) => {
    const near = nearestOn(strip, at)
    if (near.off <= TAPE_WIDTH * 0.6 && (!found || near.off < found.off)) found = { s, d: near.d, off: near.off }
  })
  if (!found) return null
  const { s, d } = found as { s: number; d: number }
  const angle = angleOf(net.strips[s])
  return { s, d, dir: Math.cos(heading - angle) >= 0 ? 1 : -1, skip: -1 }
}

/** The end of the network nearest to `at`: a rider standing on that end, facing along the strip. Null when there is no road. */
export function nearestEnd(net: Network, at: Point): Rider | null {
  let best: { rider: Rider; far: number } | null = null
  net.strips.forEach((strip, s) => {
    const length = lengthOf(strip)
    for (const rider of [{ s, d: 0, dir: 1 as const, skip: -1 }, { s, d: length, dir: -1 as const, skip: -1 }]) {
      const end = along(strip, rider.d), far = Math.hypot(end.x - at.x, end.y - at.y)
      if (!best || far < best.far) best = { rider, far }
    }
  })
  return best ? (best as { rider: Rider }).rider : null
}

export type Travel = {
  rider: Rider
  /** A turn was taken at a join during this step. */
  turned: boolean
  /** The end of the road was reached: the rider stands on it, still facing off the end. */
  ended: boolean
}

/** A join seen from one of its strips: how far along that strip it lies, and the other strip with the place on it. */
function seenFrom(join: Join, s: number): { d: number; other: number; od: number } | null {
  if (join.i === s) return { d: join.di, other: join.j, od: join.dj }
  if (join.j === s) return { d: join.dj, other: join.i, od: join.di }
  return null
}

/**
 * Moves a rider `distance` along its strip. With `turns`, at the first join it reaches it takes the turn onto
 * the other strip, toward the side of it with more tape left (toward that strip's second end when both are as
 * long); without, it goes straight on at every join. With no join ahead it stops `nose` short of the end of
 * its strip, so that a toy as long as twice `nose` stops with its nose at the torn end and not its middle.
 */
export function travel(net: Network, from: Rider, distance: number, nose = 0, turns = true): Travel {
  let rider = { ...from }, left = distance, turned = false
  for (let hops = 0; hops < 4 && left > 0; hops++) {
    const strip = net.strips[rider.s], length = lengthOf(strip)
    // The nearest join ahead on this strip, leaving out the one just taken.
    let next: { index: number; d: number; other: number; od: number } | null = null
    if (turns) {
      net.joins.forEach((join, index) => {
        if (index === rider.skip) return
        const seen = seenFrom(join, rider.s)
        if (!seen) return
        const ahead = (seen.d - rider.d) * rider.dir
        if (ahead < -0.001) return
        if (!next || ahead < (next.d - rider.d) * rider.dir) next = { index, ...seen }
      })
    }
    const hit = next as { index: number; d: number; other: number; od: number } | null
    if (hit) {
      const toJoin = (hit.d - rider.d) * rider.dir
      if (toJoin > left) {
        rider = { ...rider, d: rider.d + left * rider.dir }
        break
      }
      const other = net.strips[hit.other], otherLength = lengthOf(other)
      const forward = otherLength - hit.od, back = hit.od
      left -= toJoin
      // No way on along the other strip from here: the join is passed by.
      if (Math.max(forward, back) < TAPE_WIDTH * 0.6) rider = { ...rider, d: hit.d, skip: hit.index }
      else {
        rider = { s: hit.other, d: hit.od, dir: forward >= back ? 1 : -1, skip: hit.index }
        turned = true
      }
      continue
    }
    const stop = rider.dir === 1 ? Math.max(length - nose, length / 2) : Math.min(nose, length / 2)
    const toStop = (stop - rider.d) * rider.dir
    if (toStop <= left) return { rider: clearOf(net, { ...rider, d: toStop >= 0 ? stop : rider.d }), turned, ended: true }
    rider = { ...rider, d: rider.d + left * rider.dir }
    break
  }
  return { rider: clearOf(net, rider), turned, ended: false }
}

/** A rider that is clear of the join it has just taken may take it again the next time it comes round. */
function clearOf(net: Network, rider: Rider): Rider {
  if (rider.skip < 0) return rider
  const seen = seenFrom(net.joins[rider.skip], rider.s)
  return !seen || Math.abs(seen.d - rider.d) > TAPE_WIDTH ? { ...rider, skip: -1 } : rider
}
