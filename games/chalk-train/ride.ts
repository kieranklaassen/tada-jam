import { REACH } from './grid'
import type { Mark, Reading } from './marks'
import { crossings, lengths, nearestOn, spotAt } from './path'
import type { Feel } from './tastes'
import { DANDELION, distance, inPuddle, type Pt } from './yard'

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
const BUMP_EVERY = 200

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
  // A ring is ridden as a roundabout, which is felt once as a loop when it ends.
  if (!reading.ring) for (const l of reading.loops) if (within((l.from + l.to) / 2)) out.push({ at: at((l.from + l.to) / 2), what: 'loop' })
  for (const r of reading.runs) {
    const start = from <= to ? r.from : r.to
    if (within(start)) out.push({ at: at(start), what: 'fast' })
  }
  if (reading.kind === 'scribble') out.push({ at: (hi - lo) / 2, what: 'scribble' })

  // The water and the dandelion are met where the way goes into them, and a crossing where it is crossed.
  const way = stretch(p, from, to)
  const head = { x: DANDELION.x, y: DANDELION.y - 28 }
  let walked = 0, wet = inPuddle(way[0]), brushing = distance(way[0], head) <= REACH.stalk
  if (wet) out.push({ at: 0, what: 'splash' })
  for (let i = 1; i < way.length; i++) {
    const before = walked
    walked += distance(way[i - 1], way[i])
    const nowWet = inPuddle(way[i]), nowBrushing = distance(way[i], head) <= REACH.stalk
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
    if (leg.on === 'tar') for (let s = 0; s < own; s += BUMP_EVERY) happenings.push({ at: length + s, what: 'bump' })
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
 * once and follow the chalk as it comes.
 */
export function routeAlong(train: Pt, p: readonly Pt[], reading: Reading, older: readonly Mark[]): Route {
  const along: Leg = { on: 'chalk', pts: stretch(p, 0, reading.length) }
  return join([approach(train, p[0]), along], [[], alongMark(p, reading, 0, reading.length, older)], [[], roundsOn(reading, 0, reading.length)])
}

/** The ride a tap on bare tar gives: straight to the dot. */
export function routeTo(train: Pt, dot: Pt): Route {
  return join([approach(train, dot)], [[]])
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
