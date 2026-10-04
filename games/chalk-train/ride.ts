import { atDandelion } from './grid'
import type { Mark, Reading } from './marks'
import { crossings, lengths, nearestOn, spotAt } from './path'
import type { Feel } from './tastes'
import { distance, inPuddle, type Pt } from './yard'

// The ride a mark gives. The one rule of the toy: chalk is smooth and fast,
// bare tar is slow and bumpy, and the form of the line is the form of the
// ride. A route is worked out whole when the mark is made; the view then
// plays it, and the world is saved as the ride leaves it.

/** One stretch of a route: along chalk, or across bare tar. */
export type Leg = { on: 'chalk' | 'tar'; pts: Pt[] }

/** Something that happens at a distance along a route. A feel is felt by whoever is aboard. */
export type Happening = { at: number; what: Feel | 'twang' | 'clack' | 'roundabout' }

/** A stretch of a route ridden all the way round, by distance along the route: a loop in the line, or a ring. */
export type Round = { from: number; to: number }

export type Route = { legs: Leg[]; length: number; happenings: Happening[]; rounds: Round[] }

/** A mark that starts this near the train is joined to it: the hop across counts as chalk. */
export const JOIN = 70
/** On bare tar there is a bump at the start and one every so often after. */
const BUMP_EVERY = 130
/** How finely a way across bare tar is looked at for water. */
const WADE = 12

const legLength = (leg: Leg): number => lengths(leg.pts).total

/** The way from the train to a point: a short hop is as good as chalk, anything longer is bare tar. */
function approach(train: Pt, to: Pt): Leg | null {
  const gap = distance(train, to)
  if (gap < 1) return null
  return { on: gap <= JOIN ? 'chalk' : 'tar', pts: [train, to] }
}

/** The stretch of a mark between two distances along it, in the order travelled. */
function stretch(p: readonly Pt[], from: number, to: number): Pt[] {
  const { each } = lengths(p)
  const lo = Math.min(from, to), hi = Math.max(from, to)
  const out: Pt[] = [spotAt(p, lo)].map(({ x, y }) => ({ x, y }))
  let walked = 0
  for (let i = 1; i < p.length; i++) {
    walked += each[i - 1]
    if (walked > lo && walked < hi) out.push({ x: p[i].x, y: p[i].y })
  }
  const end = spotAt(p, hi)
  out.push({ x: end.x, y: end.y })
  return from <= to ? out : out.reverse()
}

/** What riding a stretch of a mark does, at distances from the start of the stretch as travelled. */
function alongMark(p: readonly Pt[], reading: Reading, from: number, to: number, older: readonly Mark[]): Happening[] {
  const lo = Math.min(from, to), hi = Math.max(from, to)
  const at = (s: number) => (from <= to ? s - from : from - s)
  const within = (s: number) => s >= lo && s <= hi
  const out: Happening[] = []
  for (const c of reading.corners) if (within(c)) out.push({ at: at(c), what: 'corner' })
  // A ring is a loop too, felt once, half-way round it, whether or not the ride gets all the way round; ridden
  // all the way it is then a roundabout.
  if (reading.ring) {
    if (within(reading.length / 2)) out.push({ at: at(reading.length / 2), what: 'loop' })
  } else for (const l of reading.loops) if (within((l.from + l.to) / 2)) out.push({ at: at((l.from + l.to) / 2), what: 'loop' })
  for (const r of reading.runs) {
    const start = from <= to ? r.from : r.to
    if (within(start)) out.push({ at: at(start), what: 'fast' })
  }
  if (reading.kind === 'scribble') out.push({ at: (hi - lo) / 2, what: 'scribble' })

  // The water and the dandelion are met where the way goes into them, and a crossing where it is crossed.
  const way = stretch(p, from, to)
  // The stalk is brushed wherever a line counts as on the dandelion: at its head or at its foot.
  let walked = 0, wet = inPuddle(way[0]), brushing = atDandelion(way[0])
  if (wet) out.push({ at: 0, what: 'splash' })
  // And a mark begun at the dandelion brushes it as the train sets off along it.
  if (brushing) out.push({ at: 0, what: 'twang' })
  for (let i = 1; i < way.length; i++) {
    const before = walked
    walked += distance(way[i - 1], way[i])
    const nowWet = inPuddle(way[i]), nowBrushing = atDandelion(way[i])
    if (nowWet && !wet) out.push({ at: walked, what: 'splash' })
    if (nowBrushing && !brushing) out.push({ at: walked, what: 'twang' })
    wet = nowWet
    brushing = nowBrushing
    const step = [way[i - 1], way[i]]
    if (older.some((m) => m.p !== p && crossings(step, m.p) > 0)) out.push({ at: (before + walked) / 2, what: 'clack' })
  }
  if (reading.ring && Math.abs(to - from) >= reading.length - 1) out.push({ at: hi - lo, what: 'roundabout' })
  return out
}

function join(legs: (Leg | null)[], perLeg: Happening[][], perLegRounds: Round[][] = []): Route {
  const kept: Leg[] = [], happenings: Happening[] = [], rounds: Round[] = []
  let length = 0
  legs.forEach((leg, i) => {
    if (!leg) return
    const own = legLength(leg)
    if (leg.on === 'tar') {
      for (let s = 0; s < own; s += BUMP_EVERY) happenings.push({ at: length + s, what: 'bump' })
      // Water is water on bare tar too: where the way across goes into the puddle there is a splash.
      let wet = inPuddle(leg.pts[0])
      for (let s = WADE; s <= own; s += WADE) {
        const now = inPuddle(spotAt(leg.pts, s))
        if (now && !wet) happenings.push({ at: length + s, what: 'splash' })
        wet = now
      }
    }
    // Held inside the leg, so a happening at its very end is never a hair past the end of the route.
    for (const h of perLeg[i] ?? []) happenings.push({ at: length + Math.min(own, h.at), what: h.what })
    for (const r of perLegRounds[i] ?? []) rounds.push({ from: length + Math.min(own, r.from), to: length + Math.min(own, r.to) })
    kept.push(leg)
    length += own
  })
  happenings.sort((a, b) => a.at - b.at)
  return { legs: kept, length, happenings, rounds }
}

/** Where a stretch of a mark goes all the way round, at distances from the start of the stretch as travelled. */
function roundsOn(reading: Reading, from: number, to: number): Round[] {
  const lo = Math.min(from, to), hi = Math.max(from, to)
  if (reading.ring) return [{ from: 0, to: hi - lo }]
  const at = (s: number) => (from <= to ? s - from : from - s)
  return reading.loops.filter((l) => l.from >= lo && l.to <= hi).map((l) => ({ from: Math.min(at(l.from), at(l.to)), to: Math.max(at(l.from), at(l.to)) }))
}

/**
 * The ride a new mark gives: to where the finger landed, then along the mark
 * the way it was drawn. So the engine can set off for the landing spot at
 * once and follow the chalk as it comes. With `back`, a finished mark is
 * ridden the other way, from where the finger lifted: a line drawn toward the
 * train is ridden from the train.
 */
export function routeAlong(train: Pt, p: readonly Pt[], reading: Reading, older: readonly Mark[], back = false): Route {
  const from = back ? reading.length : 0, to = back ? 0 : reading.length
  const along: Leg = { on: 'chalk', pts: stretch(p, from, to) }
  return join([approach(train, along.pts[0]), along], [[], alongMark(p, reading, from, to, older)], [[], roundsOn(reading, from, to)])
}

/** The ride a tap on bare tar gives: straight to the dot, over the tar however near it is, with its bump. */
export function routeTo(train: Pt, dot: Pt): Route {
  return join([distance(train, dot) < 1 ? null : { on: 'tar', pts: [train, dot] }], [[]])
}

/**
 * The ride a tap on a line gives: along that line to the tapped spot. A train
 * standing on the line sets off from where it stands; a train elsewhere comes
 * to the line's nearer end first.
 */
export function routeCalled(train: Pt, tapped: Pt, mark: Mark, reading: Reading, older: readonly Mark[]): Route {
  const to = nearestOn(mark.p, tapped).s, here = nearestOn(mark.p, train)
  if (here.gap <= JOIN) {
    const on = spotAt(mark.p, here.s)
    return join([approach(train, on), { on: 'chalk', pts: stretch(mark.p, here.s, to) }], [[], alongMark(mark.p, reading, here.s, to, older)], [[], roundsOn(reading, here.s, to)])
  }
  const first = mark.p[0], last = mark.p[mark.p.length - 1]
  const from = distance(train, first) <= distance(train, last) ? 0 : reading.length
  return join([approach(train, from === 0 ? first : last), { on: 'chalk', pts: stretch(mark.p, from, to) }], [[], alongMark(mark.p, reading, from, to, older)], [[], roundsOn(reading, from, to)])
}

/** A ring ridden round again, `times` times over, as one route with nothing happening on it. */
export function laps(ring: readonly Pt[], times: number): Route {
  const pts: Pt[] = []
  for (let i = 0; i < times; i++) for (const p of i === 0 ? ring : ring.slice(1)) pts.push({ x: p.x, y: p.y })
  const leg: Leg = { on: 'chalk', pts }
  const length = legLength(leg)
  return { legs: [leg], length, happenings: [], rounds: [{ from: 0, to: length }] }
}

/** Where a route ends, and which way the train faces there. */
export function restOf(route: Route, train: Pt & { face: 1 | -1 }): Pt & { face: 1 | -1 } {
  const leg = route.legs[route.legs.length - 1]
  if (!leg) return train
  const end = leg.pts[leg.pts.length - 1], before = leg.pts[Math.max(0, leg.pts.length - 2)]
  return { x: end.x, y: end.y, face: end.x === before.x ? train.face : end.x > before.x ? 1 : -1 }
}

/** The point a distance along a whole route, the unit direction of travel there, and whether it is on chalk. */
export function along(route: Route, s: number): Pt & { tx: number; ty: number; on: 'chalk' | 'tar' } {
  let left = Math.max(0, s)
  for (let i = 0; i < route.legs.length; i++) {
    const leg = route.legs[i], own = legLength(leg)
    if (left <= own || i === route.legs.length - 1) {
      const spot = spotAt(leg.pts, Math.min(left, own))
      return { x: spot.x, y: spot.y, tx: spot.tx, ty: spot.ty, on: leg.on }
    }
    left -= own
  }
  return { x: 0, y: 0, tx: 1, ty: 0, on: 'tar' }
}

/** The first `length` of a route: what the train rode of it when something stopped it on the way. */
export function cut(route: Route, length: number): Route {
  if (length >= route.length) return route
  const legs: Leg[] = []
  let left = Math.max(0, length)
  for (const leg of route.legs) {
    const own = legLength(leg)
    if (left <= 0) break
    if (own <= left) legs.push(leg)
    else {
      const pts: Pt[] = [leg.pts[0]]
      let walked = 0
      for (let i = 1; i < leg.pts.length; i++) {
        const d = distance(leg.pts[i - 1], leg.pts[i])
        if (walked + d >= left) {
          const t = d === 0 ? 0 : (left - walked) / d
          pts.push({ x: leg.pts[i - 1].x + (leg.pts[i].x - leg.pts[i - 1].x) * t, y: leg.pts[i - 1].y + (leg.pts[i].y - leg.pts[i - 1].y) * t })
          break
        }
        pts.push(leg.pts[i])
        walked += d
      }
      legs.push({ on: leg.on, pts })
    }
    left -= own
  }
  return {
    legs,
    length: Math.max(0, length),
    happenings: route.happenings.filter((h) => h.at <= length),
    rounds: route.rounds.filter((r) => r.from < length).map((r) => ({ from: r.from, to: Math.min(length, r.to) })),
  }
}

/** How much of the first `length` of a route is chalk and how much bare tar. */
export function ridden(route: Route, length: number): { chalk: number; tar: number } {
  const out = { chalk: 0, tar: 0 }
  let left = Math.max(0, length)
  for (const leg of route.legs) {
    const part = Math.min(left, legLength(leg))
    out[leg.on] += part
    left -= part
    if (left <= 0) break
  }
  return out
}
