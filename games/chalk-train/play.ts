import { REACH, answer, landsOn, type Thing } from './grid'
import { STEP, addMark, nextChalk, readMark, tidy, type MarkKind } from './marks'
import { WORK, nearestOn } from './path'
import { along, routeAlong, routeCalled, routeTo, type Route } from './ride'
import { finishCycle, type CycleOutcome } from './state'
import { CHARACTERS, FEELS, feel, mostFelt, taste, type Feel, type RiderKind, type Taste } from './tastes'
import { NONE, SEATS, SHOWING_CLEAR, ensureNext, inPlay, settleIn, showingLine, waitsAhead, type Rider, type World } from './world'
import { PLACES, bodyOf, clearance, distance, type PlaceId, type Pt } from './yard'

// The one act of the game: a chalk mark is made, and the world answers. The
// answer is worked out whole and returned as the new world, already at rest,
// with a list of what happened for the view to play.

/** How far ahead a line is read to see whether it runs to a figure, and about how far short of one the train stops. */
export const STOP_SHORT = 205
export { bodyOf, clearance }
/** How a cycle is judged: by the share of the riders' way that was ridden on chalk. */
export const WELL_FROM = 0.75
export const BADLY_UP_TO = 0.25

/**
 * Why a ride ended: a rider got home; the line ended; the line ended at a
 * waiting rider who found the wagons full, at a rider at home, who greeted the
 * train, or at a home with nobody in it.
 */
export type Stopped = 'home' | 'end' | 'full' | 'greeted' | 'figure'
/** A line that ends this near the middle of a figure ends in it: the train stops short of the figure. */
export const THROUGH = 100

/** What happened, in order, for the view. `at` is a distance along the route, and `ridden` how far along it the train got. */
export type Told =
  | { what: 'began' }
  | { what: 'answer'; thing: Thing; kind: MarkKind; sight: string; sound: string; rider: RiderKind | null }
  | { what: 'home-answered'; home: RiderKind; sight: string; sound: string }
  | { what: 'route'; route: Route; ridden: number; back?: boolean }
  | { what: 'happening'; at: number; name: Feel | 'twang' | 'clack' | 'roundabout' }
  | { what: 'reaction'; at: number; rider: RiderKind; feel: Feel; taste: Taste }
  | { what: 'boarded'; at: number; rider: RiderKind; walked: boolean }
  | { what: 'full'; at: number; rider: RiderKind }
  | { what: 'home'; at: number; rider: RiderKind; how: Feel | null; taste: Taste }
  | { what: 'greeted'; at: number; rider: RiderKind }
  | { what: 'stopped'; at: number; why: Stopped; shortBy: { rider: RiderKind; gap: number }[] }
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

/** The figures that stand on the tar: each waiting rider at its stop, and every home, with why the train would stop for it. */
function figures(riders: readonly Rider[]): { place: PlaceId; why: Stopped; rider: RiderKind; at: Rider['at'] }[] {
  return riders.flatMap((r) => [
    ...(r.at === 'stop' || waitsAhead(r) ? [{ place: r.stop, why: 'full' as const, rider: r.kind, at: r.at }] : []),
    { place: r.home, why: r.at === 'home' || r.at === 'before' ? ('greeted' as const) : ('figure' as const), rider: r.kind, at: r.at },
  ])
}

/** How near the engine at a spot is to a point: by its spot on the rail or by the middle of its body, whichever is nearer. */
const nearness = (spot: Pt, at: Pt): number => Math.min(distance(spot, at), distance(bodyOf(spot), at))

/** Whether the way ahead, from `s` along the route, comes near enough the middle of a figure to run to it. */
function runsThrough(route: Route, s: number, at: Pt): boolean {
  for (let ahead = 0; ahead <= STOP_SHORT; ahead += STEP) {
    // The engine stands above its rail: both its spot on the rail and the middle of its body count.
    if (nearness(along(route, Math.min(route.length, s + ahead)), at) < THROUGH) return true
  }
  return false
}

/** The engine is beside a figure from this near to touching it: a rider there climbs aboard, or gets out at its home. */
export const BESIDE = 30
const beside = (spot: Pt, place: PlaceId): boolean => spare([place], spot) <= BESIDE
/** The clearance of a spot, counted as work: the frame budget holds these with the rest. */
const spare = (places: readonly PlaceId[], spot: Pt): number => {
  WORK.pairs += places.length
  return clearance(places, spot)
}
/** A rider gets out at its home once it has ridden this far: one whose stop is right beside its home still gets a ride. */
export const MIN_RIDE = 100
/** A line that ends in a figure is ridden to the last clear spot within this of the figure. */
const APPROACH = 300

/**
 * Whether this is the spot to stop at, of the stretch ahead for as long as
 * `still` holds of it: the first spot clear of every figure, or, where the
 * figures stand too close together for that, the spot clearest of them.
 */
function bestToStop(riders: readonly Rider[], route: Route, s: number, still: (spot: Pt) => boolean): boolean {
  const places = figures(riders).map((f) => f.place)
  const here = spare(places, along(route, s))
  if (here >= 0) return true
  for (let on = s + STEP; on <= route.length; on += STEP) {
    const spot = along(route, on)
    if (!still(spot)) return true
    if (spare(places, spot) > here) return false
  }
  return true
}

/**
 * Where a ride comes to rest when nobody gets home on it: at the end of the
 * line, or, where the engine would stand in a figure there, short of it, with
 * the figure that is in the way. Short of it is the last spot clear of every
 * figure on the train's approach; where figures stand too close together for
 * a clear spot, it is the clearest spot of the approach.
 */
function restOn(riders: readonly Rider[], route: Route, from: number): { at: number; by: { why: Stopped; rider: RiderKind } | null } {
  const room = riders.filter((r) => r.at === 'train').length < SEATS, end = along(route, route.length)
  const all = figures(riders).filter((f) => {
    // Not in the way: the home of a rider aboard, who gets out beside it; and a rider who will climb aboard, the
    // one for the cycle to come too where the line ends at it.
    if (f.why === 'figure') return f.at !== 'train'
    if (f.why === 'full') return !room
    return true
  })
  const places = all.map((f) => f.place)
  if (spare(places, end) >= 0) return { at: route.length, by: null }
  let by = all[0], least = Infinity
  for (const f of all) {
    const gap = spare([f.place], end)
    if (gap < least) { least = gap; by = f }
  }
  let best = route.length, clearest = spare(places, end)
  for (let on = Math.floor((route.length - 0.001) / STEP) * STEP; on >= from; on -= STEP) {
    const spot = along(route, on)
    if (distance(spot, PLACES[by.place]) > APPROACH) break
    const gap = spare(places, spot)
    if (gap >= 0) return { at: on, by }
    if (gap > clearest) { clearest = gap; best = on }
  }
  return { at: best, by }
}

/** Plays a route out on the world: who boards, what each rider feels, who gets home, and where the train comes to rest. */
function rideOut(start: World, route: Route, told: Told[], occupied: readonly Pt[] = []): World {
  let riders = start.riders, train = start.train, world = start
  let h = 0, before = 0, stoppedAt = route.length, why: Stopped = 'end'
  const turnedAway: RiderKind[] = []
  // The stops riders leave empty on this ride: nobody new is laid out at one while its rider is still seen there.
  const freed: Pt[] = []
  let rest = restOn(riders, route, 0)
  const end = along(route, route.length)
  // Riders at home that the train has come beside on this ride: each greets it once. One it starts beside does not.
  const greeted: RiderKind[] = riders.filter((r) => (r.at === 'home' || r.at === 'before') && beside(along(route, 0), r.home)).map((r) => r.kind)
  for (let s = 0; ; s = Math.min(route.length, s + STEP)) {
    const here = along(route, s), step = s - before
    // The stretch just ridden counts for everyone aboard, as chalk or as bare tar.
    if (step > 0) riders = riders.map((r) => (r.at === 'train' ? { ...r, [here.on]: Math.round(r[here.on] + step) } : r))
    for (; h < route.happenings.length && route.happenings[h].at <= s; h++) {
      const { at, what } = route.happenings[h]
      told.push({ what: 'happening', at, name: what })
      if (what === 'splash') train = { ...train, stripes: NONE, tint: world.water !== NONE ? world.water : train.tint }
      const felt: Feel | null = isFeel(what) ? what : null
      if (!felt) continue
      riders = riders.map((r) => {
        if (r.at !== 'train') return r
        told.push({ what: 'reaction', at, rider: r.kind, feel: felt, taste: taste(r.kind, felt) })
        return { ...r, felt: feel(r.felt, felt) }
      })
    }
    // Anyone waiting beside the train climbs aboard while a wagon is free, the rider for the cycle to come included.
    // With both wagons taken the rider stays at its stop, and boards the next time the train comes with one free.
    let fetchedEarly = false, seated = riders.filter((r) => r.at === 'train').length
    const seatedBefore = seated
    riders = riders.map((r) => {
      if ((r.at !== 'stop' && !waitsAhead(r)) || !beside(here, r.stop)) return r
      // The rider for the cycle to come is fetched only by a line that runs to it or ends at it, never by one that passes by.
      if (waitsAhead(r) && !runsThrough(route, s, PLACES[r.stop]) && clearance([r.stop], end) >= 0) return r
      // A free wagon is a free wagon: the one waiting ahead climbs in too where nobody can be laid out to wait in
      // its place just yet, four riders being on the tar and none at home. Someone is laid out again later.
      if (seated >= SEATS) {
        if (!turnedAway.includes(r.kind)) {
          turnedAway.push(r.kind)
          told.push({ what: 'full', at: s, rider: r.kind })
        }
        return r
      }
      seated++
      freed.push(PLACES[r.stop])
      told.push({ what: 'boarded', at: s, rider: r.kind, walked: false })
      if (waitsAhead(r)) fetchedEarly = true
      return { ...r, at: 'train' as const }
    })
    // With a figure gone from its stop, the place to rest is found again.
    if (riders.filter((r) => r.at === 'train').length !== seatedBefore) rest = restOn(riders, route, s)
    if (fetchedEarly) {
      // Nobody is laid out where the train is. Where the ride ends is left out of it on purpose: the end moves with
      // the finger while the line is drawn, and whoever is laid out must be the same rider at the same place for
      // every move of it. A line that ends at the new rider is stopped short of it, like any other.
      world = ensureNext({ ...world, riders }, [here, ...occupied, ...freed])
      riders = world.riders
      rest = restOn(riders, route, s)
    }
    // A rider at home leans out and greets the train as it comes beside, whether it stops there or rides on.
    for (const r of riders) {
      if ((r.at !== 'home' && r.at !== 'before') || greeted.includes(r.kind) || !beside(here, r.home)) continue
      greeted.push(r.kind)
      told.push({ what: 'greeted', at: s, rider: r.kind })
    }
    // The train never comes to rest in a figure where the way lets it. Where a line ends in or on a rider or a
    // home, the train comes up to it and stops short. A figure it only passes, it rides in front of. And where
    // a rider's home is in reach but the spot is in some other figure, it rides on to the first spot clear of
    // them all, or to the clearest there is.
    const short = rest.by !== null && s >= rest.at
    // A rider whose home the train is beside gets out, and the train stops there.
    const arriving = riders.findIndex((r) => {
      if (r.at !== 'train' || r.chalk + r.tar < MIN_RIDE || !beside(here, r.home)) return false
      return short || bestToStop(riders, route, s, (spot) => beside(spot, r.home))
    })
    if (arriving >= 0) {
      const r = riders[arriving], how = mostFelt(r.kind, r.felt)
      told.push({ what: 'home', at: s, rider: r.kind, how, taste: how ? taste(r.kind, how) : 'plain' })
      // The rider that gets home goes to the end of the list, so that the list's last home is the home reached last.
      riders = [...riders.filter((_, i) => i !== arriving), { ...r, at: 'home' as const }]
      // Anyone else aboard whose home the train is beside here gets out here too: it does not ride on past it.
      for (const other of riders.filter((x) => x.at === 'train' && x.chalk + x.tar >= MIN_RIDE && beside(here, x.home))) {
        const felt = mostFelt(other.kind, other.felt)
        told.push({ what: 'home', at: s, rider: other.kind, how: felt, taste: felt ? taste(other.kind, felt) : 'plain' })
        riders = [...riders.filter((x) => x.kind !== other.kind), { ...other, at: 'home' as const }]
      }
      stoppedAt = s
      why = 'home'
    } else if (short && rest.by) {
      stoppedAt = s
      why = rest.by.why
      if (why === 'greeted' && !greeted.includes(rest.by.rider)) told.push({ what: 'greeted', at: s, rider: rest.by.rider })
      if (why === 'full' && !turnedAway.includes(rest.by.rider)) told.push({ what: 'full', at: s, rider: rest.by.rider })
    }
    const from = along(route, before)
    train = { ...train, x: Math.round(here.x), y: Math.round(here.y), face: here.x === from.x ? train.face : here.x > from.x ? 1 : -1 }
    before = s
    if (why !== 'end' || s >= route.length) break
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

/** A finished mark is ridden from its far end where that end is nearer the train by this much. */
const NEARER_BY = 40

/** A home as it is drawn, for a touch: its middle this far below its place, and this much to each side of it. */
const HOME_DOWN = 22
const HOME_HALF = { w: 100, h: 48 }

/** A rider as it is seen sitting in its wagon: who it is, and the middle of it on the tar. */
export type Aboard = { kind: RiderKind; at: Pt }

/**
 * The child makes a mark. `raw` is where the finger went, in tar units. With
 * `whole` off the mark is still under the finger. The
 * world that comes back is at rest and ready to be saved.
 */
export function makeMark(before: World, raw: readonly Pt[], cycle = true, seen?: Pt, occupied: readonly Pt[] = [], aboard: readonly Aboard[] = [], whole = true): { world: World; told: Told[] } {
  const p = tidy(raw)
  const told: Told[] = []
  if (p.length === 0) return { world: before, told }
  const reading = readMark(p)
  // A mark laid on a rider who waits is for that rider: where this mark also begins a cycle, the rider stays at
  // its stop to be chalked and does not walk over to the train first.
  const waiting = before.riders.filter((r) => r.at === 'stop' || waitsAhead(r))
  const onWaiting = reading.kind === 'line' ? -1 : landsOn(p, reading, { engine: seen ?? bodyOf(before.train), riders: waiting.map((r) => PLACES[r.stop]), marks: before.marks })
  const stays = onWaiting !== -1 && onWaiting.thing === 'rider' ? waiting[onWaiting.rider].kind : null
  // With `cycle` off, as at the toy stage, no cycle begins and nobody is laid out.
  // Whoever is laid out as this mark begins a cycle is laid out once, when the mark begins: clear of where the
  // finger landed, where the tar has room, and the same rider at the same place however the mark then grows.
  const settled = cycle ? settleIn(before, occupied, stays, [p[0]]) : { world: before, began: false, boarded: [] }
  let world = settled.world
  if (settled.began) told.push({ what: 'began' })
  for (const i of settled.boarded) told.push({ what: 'boarded', at: 0, rider: world.riders[i].kind, walked: true })

  const stand = standing(world.riders)
  // `seen` is the middle of the engine's body where the child sees it, while it is still riding to where it will rest.
  // A rider is chalked where it is seen, which the toy passes in for anyone seen somewhere the world no longer has
  // it: in its wagon, or still at its stop when it is aboard already. Tapped, tickled, ringed or dusted. A line is
  // not read as laid on it, since every line from the train starts beside one.
  const seated = reading.kind === 'line' ? [] : aboard.filter((a) => world.riders.some((r) => r.kind === a.kind))
  const landed = landsOn(p, reading, { engine: seen ?? bodyOf(world.train), riders: [...stand.map((s) => s.at), ...seated.map((a) => a.at)], marks: world.marks })
  const cell = answer(landed.thing, reading.kind)
  const who = landed.rider < 0 ? null : landed.rider < stand.length ? world.riders[stand[landed.rider].index].kind : seated[landed.rider - stand.length].kind
  told.push({ what: 'answer', thing: landed.thing, kind: reading.kind, sight: cell.sight, sound: cell.sound, rider: who })

  // A home is not a thing of the grid: chalk on it lies on the tar under it, and the home answers the touch too,
  // with its rider in it or not. A rider there that the mark is laid on answers as a rider as well.
  // A home is touched anywhere on it as it is drawn: its middle a little below the place, and wider than it is high.
  const on = (q: Pt, at: Pt): boolean => Math.abs(q.x - at.x) <= HOME_HALF.w && Math.abs(q.y - (at.y + HOME_DOWN)) <= HOME_HALF.h
  const touches = (at: Pt): boolean => (reading.kind === 'tap' ? on(p[0], at) : p.some((q) => on(q, at)))
  for (const r of world.riders) {
    if (!touches(PLACES[r.home])) continue
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
  // A finished mark is ridden from whichever of its ends is nearer the train: a line drawn toward the train is
  // ridden from the train, all of its chalk. While it is still being drawn it is ridden the way it comes.
  const back = whole && reading.kind !== 'tap' && !reading.ring && distance(train, p[p.length - 1]) + NEARER_BY < distance(train, p[0])
  if (reading.kind !== 'tap') route = routeAlong(train, p, reading, older, back)
  else {
    const called = landed.thing === 'line' ? older.find((m) => m.p.length > 1 && nearestOn(m.p, p[0]).gap <= REACH.line) : undefined
    route = called ? routeCalled(train, p[0], called, readMark(called.p), older) : routeTo(train, p[0])
  }
  const planned: Extract<Told, { what: 'route' }> = { what: 'route', route, ridden: route.length, back }
  told.push(planned)
  const rode = rideOut(world, route, told, occupied)
  // How far the train got: to a home, to a figure the line ends in, or to the end.
  for (const t of told) if (t.what === 'stopped') planned.ridden = t.at
  return { world: rode, told }
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
  const { from, to: home, far, reach } = showingLine(world.train, first.home)
  const line: Pt[] = []
  for (let d = 0; d <= reach; d += STEP) {
    // A hand's small wobble, the same every time.
    const wobble = Math.sin(d / 37) * 5
    const point = { x: from.x + ((home.x - from.x) * d) / far - ((home.y - from.y) / far) * wobble, y: from.y + ((home.y - from.y) * d) / far + ((home.x - from.x) / far) * wobble }
    // The line ends well short of the home: the last stretch is the child's to draw.
    if (line.length > 2 && clearance([first.home], point) < SHOWING_CLEAR) break
    line.push(point)
  }
  const made = makeMark({ ...world, shown: true }, line)
  // The showing is not the child's mark: nobody is laid out to wait for the cycle to come until the child makes one.
  const riders = made.world.riders.filter((r) => !waitsAhead(r) || world.riders.some((was) => was.kind === r.kind))
  const shown = riders.length === made.world.riders.length ? made.world : { ...made.world, riders, seed: world.seed, ahead: world.ahead }
  return { world: shown, told: made.told }
}
