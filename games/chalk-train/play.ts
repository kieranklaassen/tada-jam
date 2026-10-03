import { REACH, answer, landsOn, type Thing } from './grid'
import { STEP, addMark, nextChalk, readMark, tidy, type MarkKind } from './marks'
import { middle, nearestOn } from './path'
import { along, routeAlong, routeCalled, routeTo, type Route } from './ride'
import { finishCycle, type CycleOutcome } from './state'
import { CHARACTERS, FEELS, feel, mostFelt, taste, type Feel, type RiderKind, type Taste } from './tastes'
import { NONE, SEATS, ensureNext, inPlay, railAt, settleIn, waitsAhead, type Rider, type World } from './world'
import { PLACES, distance, type Pt } from './yard'

// The one act of the game: a chalk mark is made, and the world answers. The
// answer is worked out whole and returned as the new world, already at rest,
// with a list of what happened for the view to play.

/** The train stops this far short of a home, nose at its edge, and a rider climbs aboard from this far. */
export const STOP_SHORT = 170
/** The engine's body is this far above its spot on the rail. */
const BODY_UP = 65
/** How a cycle is judged: by the share of the riders' way that was ridden on chalk. */
export const WELL_FROM = 0.75
export const BADLY_UP_TO = 0.25

/** What happened, in order, for the view. `at` is a distance along the route. */
export type Told =
  | { what: 'began' }
  | { what: 'answer'; thing: Thing; kind: MarkKind; sight: string; sound: string; rider: RiderKind | null }
  | { what: 'home-answered'; home: RiderKind; sight: string; sound: string }
  | { what: 'route'; route: Route }
  | { what: 'happening'; at: number; name: Feel | 'twang' | 'clack' | 'roundabout' }
  | { what: 'reaction'; at: number; rider: RiderKind; feel: Feel; taste: Taste }
  | { what: 'boarded'; at: number; rider: RiderKind; walked: boolean }
  | { what: 'home'; at: number; rider: RiderKind; how: Feel | null; taste: Taste }
  | { what: 'stopped'; at: number; why: 'home' | 'end'; shortBy: { rider: RiderKind; gap: number }[] }
  | { what: 'cycle'; outcome: CycleOutcome }

const isFeel = (name: string): name is Feel => (FEELS as readonly string[]).includes(name)

/** How a finished cycle went, from the trips of the riders taken home in it. */
export function judge(riders: readonly Rider[]): CycleOutcome {
  const home = riders.filter((r) => r.at === 'home')
  const chalk = home.reduce((sum, r) => sum + r.chalk, 0), all = chalk + home.reduce((sum, r) => sum + r.tar, 0)
  if (all <= 0) return 'mixed'
  const share = chalk / all
  return share >= WELL_FROM ? 'well' : share <= BADLY_UP_TO ? 'badly' : 'mixed'
}

/** Plays a route out on the world: who boards, what each rider feels, who gets home, and where the train comes to rest. */
function rideOut(start: World, route: Route, told: Told[]): World {
  let riders = start.riders, train = start.train, world = start
  let h = 0, before = 0, stoppedAt = route.length, why: 'home' | 'end' = 'end'
  for (let s = 0; ; s = Math.min(route.length, s + STEP)) {
    const here = along(route, s), step = s - before
    // The stretch just ridden counts for everyone aboard, as chalk or as bare tar.
    if (step > 0) riders = riders.map((r) => (r.at === 'train' ? { ...r, [here.on]: Math.round(r[here.on] + step) } : r))
    for (; h < route.happenings.length && route.happenings[h].at <= s; h++) {
      const { at, what } = route.happenings[h]
      told.push({ what: 'happening', at, name: what })
      if (what === 'splash') train = { ...train, stripes: NONE, tint: world.water !== NONE ? world.water : train.tint }
      const felt: Feel | null = what === 'roundabout' ? 'loop' : isFeel(what) ? what : null
      if (!felt) continue
      riders = riders.map((r) => {
        if (r.at !== 'train') return r
        told.push({ what: 'reaction', at, rider: r.kind, feel: felt, taste: taste(r.kind, felt) })
        return { ...r, felt: feel(r.felt, felt) }
      })
    }
    // Anyone waiting within reach climbs aboard while a wagon is free. The rider for the cycle to come may be
    // fetched early, but never into a wagon that a rider of the layout in play still needs.
    let fetchedEarly = false, seated = riders.filter((r) => r.at === 'train').length
    let kept = riders.filter((r) => r.at === 'stop').length
    riders = riders.map((r) => {
      if ((r.at !== 'stop' && !waitsAhead(r)) || distance(here, PLACES[r.stop]) > STOP_SHORT) return r
      if (seated + (waitsAhead(r) ? kept : 0) >= SEATS) return r
      if (r.at === 'stop') kept--
      seated++
      told.push({ what: 'boarded', at: s, rider: r.kind, walked: false })
      if (waitsAhead(r)) fetchedEarly = true
      return { ...r, at: 'train' as const }
    })
    if (fetchedEarly) {
      world = ensureNext({ ...world, riders })
      riders = world.riders
    }
    // A rider whose home is within reach gets out, and the train stops there.
    const arriving = riders.findIndex((r) => r.at === 'train' && distance(here, PLACES[r.home]) <= STOP_SHORT)
    if (arriving >= 0) {
      const r = riders[arriving], how = mostFelt(r.kind, r.felt)
      told.push({ what: 'home', at: s, rider: r.kind, how, taste: how ? taste(r.kind, how) : 'plain' })
      riders = riders.map((x, i) => (i === arriving ? { ...x, at: 'home' as const } : x))
      stoppedAt = s
      why = 'home'
    }
    const from = along(route, before)
    train = { ...train, x: Math.round(here.x), y: Math.round(here.y), face: here.x === from.x ? train.face : here.x > from.x ? 1 : -1 }
    before = s
    if (why === 'home' || s >= route.length) break
  }
  const shortBy = riders.filter((r) => r.at === 'train').map((r) => ({ rider: r.kind, gap: Math.max(0, Math.round(distance(train, PLACES[r.home]) - STOP_SHORT)) }))
  told.push({ what: 'stopped', at: stoppedAt, why, shortBy })
  world = { ...world, riders, train }
  // The cycle ends when nobody in play is left waiting or aboard. The position moves here, and nowhere else.
  if (why === 'home' && !riders.some(inPlay)) {
    const outcome = judge(riders)
    told.push({ what: 'cycle', outcome })
    world = { ...world, ...finishCycle(world, outcome) }
  }
  return world
}

/** Where each rider that stands on the tar is, with its index among the riders. */
function standing(riders: readonly Rider[]): { at: Pt; index: number }[] {
  return riders.flatMap((r, index) => (r.at === 'train' ? [] : [{ at: r.at === 'home' || r.at === 'before' ? PLACES[r.home] : PLACES[r.stop], index }]))
}

/**
 * The child makes a mark. `raw` is where the finger went, in tar units. The
 * world that comes back is at rest and ready to be saved.
 */
export function makeMark(before: World, raw: readonly Pt[]): { world: World; told: Told[] } {
  const p = tidy(raw)
  const told: Told[] = []
  if (p.length === 0) return { world: before, told }
  const settled = settleIn(before)
  let world = settled.world
  if (settled.began) told.push({ what: 'began' })
  for (const i of settled.boarded) told.push({ what: 'boarded', at: 0, rider: world.riders[i].kind, walked: true })

  const reading = readMark(p)
  const stand = standing(world.riders)
  const landed = landsOn(p, reading, { engine: { x: world.train.x, y: world.train.y - BODY_UP }, riders: stand.map((s) => s.at), marks: world.marks })
  const cell = answer(landed.thing, reading.kind)
  const who = landed.rider >= 0 ? world.riders[stand[landed.rider].index].kind : null
  told.push({ what: 'answer', thing: landed.thing, kind: reading.kind, sight: cell.sight, sound: cell.sound, rider: who })

  // A home is not a thing of the grid: chalk on it lies on the tar under it, and the home answers the touch too.
  // A home with its rider in it is answered by the rider.
  const touches = (at: Pt): boolean =>
    reading.kind === 'line' ? p.some((q) => distance(q, at) <= REACH.rider) : distance(reading.kind === 'tap' ? p[0] : middle(p), at) <= REACH.rider
  for (const r of world.riders) {
    if (r.at === 'home' || r.at === 'before' || !touches(PLACES[r.home])) continue
    told.push({ what: 'home-answered', home: r.kind, sight: CHARACTERS[r.kind].homeSight, sound: CHARACTERS[r.kind].homeSound })
  }

  // Chalk laid on a thing chalks that thing.
  const colour = world.chalk
  if (landed.thing === 'engine' && reading.kind === 'zigzag') world = { ...world, train: { ...world.train, stripes: colour } }
  if (landed.thing === 'puddle' && reading.kind === 'scribble') world = { ...world, water: colour }
  const older = world.marks
  world = { ...world, chalk: nextChalk(colour), marks: cell.stays ? addMark(older, { c: colour, p }) : older }
  if (!cell.rides) return { world, told }

  const train = { x: world.train.x, y: world.train.y }
  let route: Route
  if (reading.kind !== 'tap') route = routeAlong(train, p, reading, older)
  else {
    const called = landed.thing === 'line' ? older.find((m) => m.p.length > 1 && nearestOn(m.p, p[0]).gap <= REACH.line) : undefined
    route = called ? routeCalled(train, p[0], called, readMark(called.p), older) : routeTo(train, p[0])
  }
  told.push({ what: 'route', route })
  return { world: rideOut(world, route, told), told }
}

/**
 * The first showing, once: the waiting rider scrapes a short line from the
 * engine's rail about a third of the way toward its home, and the engine
 * rides to the end of it. It is a mark like any the child makes, and the
 * world is at rest when this returns, so any touch can end the showing.
 */
export function showFirst(world: World): { world: World; told: Told[] } {
  const first = world.riders.find((r) => r.at === 'stop')
  if (world.shown || world.finished || !first) return { world: { ...world, shown: true }, told: [] }
  const from = { x: world.train.x + 60 * world.train.face, y: world.train.y }
  const home = railAt(first.home)
  const reach = Math.max(120, distance(from, home) / 3), far = Math.max(1, distance(from, home))
  const line: Pt[] = []
  for (let d = 0; d <= reach; d += STEP) {
    // A hand's small wobble, the same every time.
    const wobble = Math.sin(d / 37) * 5
    line.push({ x: from.x + ((home.x - from.x) * d) / far - ((home.y - from.y) / far) * wobble, y: from.y + ((home.y - from.y) * d) / far + ((home.x - from.x) / far) * wobble })
  }
  const made = makeMark({ ...world, shown: true }, line)
  return { world: made.world, told: made.told }
}
