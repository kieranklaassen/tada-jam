import { streamPoint, type Board, type BoardCamper, type Point } from './board'
import type { AshFrame } from './frame'
import { LAMP_BODY, TIN, apart, obstacles, pinSpots, wrap } from './ground'
import type { Night, Plan } from './night'
import { nearestOpen } from './paths'
import { compare, value, whole } from './ratio'
import { content, type Reaction } from './tastes'
import type { CamperId, Site } from './world'

// The night as it is seen at one moment: what is lit, what lies as ash, where
// each camper is bound for and what it is doing, and how near the raccoons
// dare to come. Everything here is a pure reading of the night the plan gives
// (night.ts) and of the campers' fixed tastes (tastes.ts) at the hour the
// cursor stands at, so the night plays backwards as it plays forwards. The
// game (game.ts) walks the figures toward where this says they are bound.

/** Which acts are done out of the bag, upright. */
const UPRIGHT = new Set(['walks-to-the-light', 'walks-into-the-stream', 'beams-at-the-fire', 'tends-the-fire', 'fans-the-fire', 'looks-into-the-kettle', 'tastes-cold-cocoa', 'keeps-watch', 'tips-the-hat', 'straps-a-tower-on-the-mule', 'moves-in-with'])

export type Bound = {
  /** The act the camper is in, or `at-dusk`, or one of the two morning acts. */
  act: string
  /** Where it is bound for, and which way it lies or faces once there. */
  to: Point
  turn: number
  upright: boolean
  withCamper: CamperId | null
  /** The hour of the night at which the act began. */
  since: number
}

/** What is lit at an hour of the night: the fire and how far it reaches, and whether the lanterns burn. Nothing burns at dusk. */
export function lightsAt(board: Board, plan: Plan, night: Night, hour: number): { fire: boolean; reach: number; lanterns: boolean } {
  const on = hour > 0
  return {
    fire: on && plan.logs > 0 && hour < value(night.fire.until),
    reach: board.reach[Math.min(plan.fire, board.reach.length - 1)],
    lanterns: on && night.lantern !== null && plan.oil > 0 && hour < value(night.lantern.until),
  }
}

/** The spot at the fire's edge on a camper's own side, where it stands to tend the fire or to read by it. */
export function fireEdge(board: Board, camper: BoardCamper): Point {
  const away = Math.hypot(camper.middle.x - board.fire.x, camper.middle.y - board.fire.y) || 1, r = 84 * board.u
  return nearestOpen(board, { x: board.fire.x + ((camper.middle.x - board.fire.x) / away) * r, y: board.fire.y + ((camper.middle.y - board.fire.y) / away) * r })
}

/** Which way an animal at a place faces something: the turn of a frame whose head is at its top. */
export const facing = (from: Point, toward: Point) => Math.atan2(toward.y - from.y, toward.x - from.x) + Math.PI / 2
/** Which way a camper at a place faces something: a camper faces down its own frame, the way its feet lay in the bag. */
export const looking = (from: Point, toward: Point) => Math.atan2(toward.y - from.y, toward.x - from.x) - Math.PI / 2

/**
 * Where every camper of the site is bound and what it is doing, at an hour.
 * `phase` is `dusk` (the plan open, hour 0), `night` (the cursor on its way)
 * or `morning` (the night slid to dawn).
 */
export function boundAt(board: Board, plan: Plan, night: Night, reactions: readonly Reaction[], hour: number, phase: 'dusk' | 'night' | 'morning'): Partial<Record<CamperId, Bound>> {
  const bound: Partial<Record<CamperId, Bound>> = {}, u = board.u
  const lit = lightsAt(board, plan, night, phase === 'dusk' ? 0 : hour)
  for (const camper of board.campers) {
    const who = camper.who, home: Point = camper.at
    // Before any night the want shows: the cook stands at the fire with the pan raised, the scout stands by its tent, the rest lie in their bags.
    let now: Bound = { act: 'at-dusk', to: who === 'cook' ? fireEdge(board, camper) : who === 'scout' ? camper.middle : home, turn: camper.turn, upright: who === 'cook' || who === 'scout', withCamper: null, since: 0 }
    if (who === 'cook') now.turn = looking(now.to, board.fire)
    if (who === 'scout') now.turn = looking(now.to, { x: board.rodX + board.rodLen / 2, y: board.lanes[1] })
    if (phase !== 'dusk') {
      for (const reaction of reactions) {
        if (reaction.camper !== who || compare(reaction.at, whole(night.hours)) > 0 || value(reaction.at) > hour) continue
        // A morning act belongs to the morning: the scout's opinion of the leftovers comes at dawn and not a moment before.
        if (compare(reaction.at, whole(night.hours)) === 0 && phase !== 'morning' && (reaction.act === 'tips-the-hat' || reaction.act === 'straps-a-tower-on-the-mule')) continue
        const act = reaction.act, since = value(reaction.at), upright = UPRIGHT.has(act)
        let to = now.to, turn = now.turn, withCamper: CamperId | null = null
        if (act === 'reads-by-lantern' || act === 'reads-by-fire' || act === 'sleeps-through' || act === 'sleeps-on-the-dog' || act === 'hides-under-the-dog') { to = home; turn = camper.turn }
        else if (act === 'keeps-watch') { to = camper.middle; turn = looking(camper.middle, { x: 2 * camper.middle.x - board.fire.x, y: 2 * camper.middle.y - board.fire.y }) }
        else if (act === 'walks-to-the-light') {
          // The nearest light left, as the cursor stands now and not as it stood when the walk began: to the fire
          // or to a lantern, whichever is nearer of those that still burn, and on to the other when that one goes out.
          // With none left the next act, into the stream, takes over.
          // At dawn it is where the last moment of the night left it.
          const when = Math.min(Math.max(since, hour), night.hours - 1e-6), fireStill = plan.logs > 0 && when < value(night.fire.until)
          const lampsStill = night.lantern !== null && plan.oil > 0 && when < value(night.lantern.until)
          const lamps = lampsStill ? plan.lanterns.map((lantern) => board.pins[lantern.pin]) : [], far = (pin: Point) => Math.hypot(pin.x - camper.middle.x, pin.y - camper.middle.y)
          const nearest = lamps.length > 0 ? lamps.reduce((best, pin) => (far(pin) < far(best) ? pin : best)) : null
          const lamp = nearest !== null && (!fireStill || far(nearest) < far(board.fire)) ? nearest : null
          if (!lamp) { to = fireEdge(board, camper); turn = looking(to, board.fire) }
          else { const away = Math.hypot(lamp.x - board.fire.x, lamp.y - board.fire.y) || 1; to = nearestOpen(board, { x: lamp.x - ((lamp.x - board.fire.x) / away) * (LAMP_BODY + 16) * u, y: lamp.y - ((lamp.y - board.fire.y) / away) * (LAMP_BODY + 16) * u }); turn = looking(to, lamp) }
        } else if (act === 'walks-into-the-stream') { to = streamPoint(board, camper.middle); turn = looking(now.to, to) }
        else if (act === 'hides-in-the-bag') {
          // Inching away from the light, along its own length, away from the fire.
          const away = Math.hypot(home.x - board.fire.x, home.y - board.fire.y) || 1
          to = { x: home.x + ((home.x - board.fire.x) / away) * 14 * u, y: home.y + ((home.y - board.fire.y) / away) * 14 * u }; turn = camper.turn
        } else if (act === 'drags-the-bag-to-the-fire') {
          // Inside the circle, on its own side, as far out as the circle allows.
          const away = Math.hypot(camper.middle.x - board.fire.x, camper.middle.y - board.fire.y) || 1, r = Math.max(96 * u, lit.reach - 62 * u)
          to = { x: board.fire.x + ((camper.middle.x - board.fire.x) / away) * (r + 30 * u), y: board.fire.y + ((camper.middle.y - board.fire.y) / away) * (r + 30 * u) }; turn = camper.turn
        } else if (act === 'beams-at-the-fire' || act === 'tends-the-fire' || act === 'fans-the-fire' || act === 'looks-into-the-kettle' || act === 'tastes-cold-cocoa') { to = fireEdge(board, camper); turn = looking(to, board.fire) }
        else if (act === 'moves-in-with') {
          const host = board.campers.find((one) => one.who === reaction.withCamper)
          if (host) { const away = Math.hypot(host.head.x - host.tentMiddle.x, host.head.y - host.tentMiddle.y) || 1; to = { x: host.head.x + ((host.head.x - host.tentMiddle.x) / away) * 16 * u, y: host.head.y + ((host.head.y - host.tentMiddle.y) / away) * 16 * u }; turn = host.turn; withCamper = host.who }
        }
        // `wakes-hugging-a-raccoon`, `tips-the-hat` and `straps-a-tower-on-the-mule` happen wherever the camper already is.
        now = { act, to, turn, upright, withCamper, since }
      }
      // In the morning whoever is in a bag wakes the way the night went. Whoever the night left standing somewhere
      // (in the stream, at the fire with the kettle) is found exactly there, still at it.
      if (phase === 'morning' && !now.upright) now = { ...now, act: content(who, reactions as Reaction[]) ? 'wakes-rested' : 'wakes-frazzled', since: night.hours }
    }
    bound[who] = now
  }
  return bound
}

/** What the night has used by an hour, to be laid as ash under the ruler. Empty at dusk. */
export function ashAt(site: Site, night: Night, hour: number): AshFrame {
  if (hour <= 0) return { fire: null, lantern: null, kettle: null }
  return {
    fire: { amount: night.fire.amount, until: Math.min(hour, value(night.fire.until)) },
    lantern: night.lantern ? { amount: night.lantern.amount, until: Math.min(hour, value(night.lantern.until)) } : null,
    kettle: night.kettle ? night.kettle.rounds.filter((round) => round.hour < hour).map((round) => ({ hour: round.hour, cups: round.served.length * site.kettle!.cups, wanted: site.tents.length * site.kettle!.cups })) : null,
  }
}

/** A raccoon further out than this is only a pair of eyes in the dark. */
export const EYES_FROM = 300
/** Where a raccoon waits in the woods before the night begins. */
export const LURK_AWAY = 340

/**
 * The raccoons' own lines from the woods toward the fire: one in each gap between the campers' bearings, turned a
 * little until it is clear of every tent, camper and lantern pin at this site as far in as it can be. `floor` is how near the fire
 * that line stays clear: a raccoon comes no nearer than that, whatever the dark allows.
 */
export function raccoonLines(site: Site): { bearing: number; floor: number }[] {
  const known = LINES.get(site)
  if (known) return known
  const blocks = [...obstacles(site).filter((one) => one.name !== 'fire' && one.name !== 'dog' && one.name !== 'tin'), ...pinSpots(site).map((at) => ({ name: 'pin', at, radius: LAMP_BODY - 4 }))], found: { bearing: number; floor: number }[] = []
  const clearTo = (bearing: number) => {
    for (let r = LURK_AWAY; r >= 72; r -= 2) { const at = { x: Math.cos(bearing) * r, y: Math.sin(bearing) * r }; if (blocks.some((one) => apart(at, one.at) < one.radius + 10)) return r + 2 }
    return 72
  }
  for (const middle of [3.13, 4.19, 5.25, 6.31]) {
    let best = { bearing: middle, floor: clearTo(middle) }
    for (const nudge of [0.06, -0.06, 0.12, -0.12, 0.18, -0.18, 0.24, -0.24, 0.3, -0.3]) { const floor = clearTo(middle + nudge); if (floor < best.floor) best = { bearing: middle + nudge, floor } }
    found.push(best)
  }
  LINES.set(site, found)
  return found
}
const LINES = new WeakMap<Site, { bearing: number; floor: number }[]>()
export const raccoonBearings = (site: Site): number[] => raccoonLines(site).map((line) => line.bearing)

export type Lurker = {
  /** Where it dares to come: a point on its own line toward the fire. */
  to: Point
  /** How far from the fire that is, in design pixels: far out it is only a pair of eyes. */
  away: number
  has: 'nothing' | 'tin'
}

/** How far out from the fire, along a bearing, the light ends at an hour: the far edge of every lit circle the line crosses. Zero in full dark. */
function lightEdge(board: Board, plan: Plan, night: Night, hour: number, bearing: number): number {
  const lit = lightsAt(board, plan, night, hour), u = board.u
  let edge = lit.fire ? lit.reach / u : 0
  if (lit.lanterns) for (const lantern of plan.lanterns) {
    const pin = board.pins[lantern.pin], reach = (lantern.wick === 1 ? board.lampHigh : board.lampLow) / u
    const px = (pin.x - board.fire.x) / u, py = (pin.y - board.fire.y) / u
    // Where the line from the fire along this bearing leaves the lantern's circle, if it enters it at all.
    const along = px * Math.cos(bearing) + py * Math.sin(bearing), off = Math.abs(-px * Math.sin(bearing) + py * Math.cos(bearing))
    if (off < reach && along > 0) edge = Math.max(edge, along + Math.sqrt(reach * reach - off * off))
  }
  return edge
}

/** Where each raccoon dares to come at an hour of the night: exactly as far as the dark reaches along its own line, and no further. None at dusk. */
export function lurkersAt(board: Board, plan: Plan, night: Night, hour: number): Lurker[] {
  if (hour <= 0) return []
  const u = board.u, lit = lightsAt(board, plan, night, hour)
  const tinLit = (lit.fire && apart(TIN, { x: 0, y: 0 }) + 24 < lit.reach / u) || (lit.lanterns && plan.lanterns.some((lantern) => { const pin = board.pins[lantern.pin]; return Math.hypot(pin.x - board.tin.x, pin.y - board.tin.y) < (lantern.wick === 1 ? board.lampHigh : board.lampLow) }))
  return raccoonLines(board.site).map(({ bearing, floor }, i) => {
    const edge = lightEdge(board, plan, night, hour, bearing)
    // The last raccoon's line runs out past the snack tin: with the tin in the dark it stops there and takes it.
    const takes = i === 3 && !tinLit
    const away = Math.max(floor, takes ? Math.max(edge + 16, apart(TIN, { x: 0, y: 0 }) - 30) : Math.max(edge + 16, 72))
    return { to: { x: board.fire.x + Math.cos(bearing) * away * u, y: board.fire.y + Math.sin(bearing) * away * u }, away, has: takes ? 'tin' : 'nothing' }
  })
}

/** How many moths circle a lit lantern: more on the high wick. */
export const mothsFor = (wick: 0 | 1) => (wick === 1 ? 5 : 2)

export { wrap }
