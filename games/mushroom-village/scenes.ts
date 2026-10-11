import { SNEEZE_BACK_AFTER, bonk, brushPuff, bump, cartStops, clack, content, crawl, creak, doorOpens, doorShuts, emptyBucket, fillBucket, flick, getUp, groan, hatBoing, hup, knockEmpty, lamp, land, lightOut, lightUp, lookAtWater, mossStep, passDoor, scratch, setOff, sitDown, slop, smoke, sneezeBack, sneezeIndoors, snore, splashDown, squelch, stone, stoop, sunGoes, toeTaps, wade, wash, yawn, type Answer } from './answers'
import { CART, SEATS, SNAIL, STREAM, atLog, inWater, stepOff, waterAt, type GnomeId } from './ground'
import type { Point } from './input'
import { crossing, hopLift } from './crossing'
import { along, lengthOf, loopFrom, reachable, route, wayToEnd } from './paths'
import { Scene, followedBy, sceneLength, type Beat } from './scene'
import { stepAt } from './shapes'
import { clamp, settle } from './spring'
import { LOW, TALL_FROM, fits } from './tastes'
import { JUMP_S, PACE, SCENE, WALKER, keyOf, type Mushroom, type Prop, type Target, type World } from './world'

// The glade's short scenes, each a list of timed beats on scene.ts. A scene
// is filled in from the village as it stands when it starts, its outcome is
// kept before its first beat, and what is seen arrives there beat by beat. A
// beat sets a pose and starts an answer in the same call, so what is seen
// and what is heard share the scene's clock. A touch ends a scene at once:
// the beats that are left stay silent, and the last beat puts everything
// where the kept village says it is.

export { PACE, SCENE, WALKER } from './world'

/** How many times round a loop each gnome goes before he is dizzy: his own manner, with his own pace. */
export const ROUNDS: Readonly<Record<GnomeId, number>> = { tall: 2, baker: 3, sleepy: 1, sneezy: 2 }

/**
 * How long each gnome may take over a way, against the tall one: the bounds of a walk are his own, as his pace is,
 * so that over any way, however short or long, the four take four different times: the baker the least, then the
 * sneezy one, the tall one, and the sleepy one the most.
 */
export const MANNER_S: Readonly<Record<GnomeId, number>> = { baker: 0.65, sneezy: 0.8, tall: 1, sleepy: 1.2 }

/** Seconds a gnome takes over a way of `total` units: at his own pace, within his own bounds. */
export function walkLasts(who: GnomeId, total: number, shortest = 0.8, longest = 3.4): number {
  return clamp(total / PACE[who], shortest * MANNER_S[who], longest * MANNER_S[who])
}

export { HOPS, STRIDE } from './crossing'

const lerp = (a: number, b: number, p: number): number => a + (b - a) * p
const ease = (p: number): number => p * p * (3 - 2 * p)

/** A cue: at its moment it sets a pose and starts an answer. Ended by a touch it does neither. */
function cue(w: World, at: number, answer: (() => Answer) | null, on: Target, pose?: () => void): Beat {
  return { at, lasts: 0, play: (_progress, finishing) => {
    if (finishing) return
    pose?.()
    if (answer) w.play(answer(), on, 0, SCENE)
  } }
}

/** A move over a stretch of time. Ended by a touch it is left where it was: the last beat lands everything. */
function tween(at: number, lasts: number, move: (progress: number) => void): Beat {
  return { at, lasts, play: (progress, finishing) => { if (!finishing) move(progress) } }
}

/** The last beat of every scene: everything that is seen is where the kept village says it is. */
function landing(w: World, at: number): Beat {
  return { at, lasts: 0, play: (_progress, finishing) => {
    w.land(false)
    if (finishing) for (const m of w.mushrooms) { settle(m.built); settle(m.glow) }
  } }
}

/**
 * Ends the scene that is playing, as a touch does: silent from this call. Its beats that are left stay silent,
 * and what was already ringing of it is cut (`cut`, which the Mount hands to the scene's own gain).
 */
export function endScene(w: World): void {
  if (!w.scene?.running) return
  w.scene.finish()
  w.hushTag(SCENE)
  w.sceneNotes = []
  w.props = w.props.filter((prop) => prop.what !== 'toss')
  w.cut = true
}

/**
 * Starts a scene. `keep` puts its outcome into the kept village, and the caller's change is handed to storage at
 * once. `own` marks a scene that is a villager's own doing: it is no answer to the child and leaves the idle
 * ladder where it is.
 */
function begin(w: World, beats: Beat[], keep: (() => void) | null, own = false): void {
  endScene(w)
  w.sceneOwn = own
  w.scene = new Scene([...beats, landing(w, sceneLength(beats) + 0.05)])
  w.scene.start(w.t, () => { if (keep) { keep(); w.change = 'now' } })
  // The beats at the start are played here and now, inside the touch that caused the scene.
  w.scene.update(w.t)
}

// ---------------------------------------------------------------- a gnome on his way

/** A gnome walks a way from `from` seconds on, at his pace, and reacts to what he passes. Returns when he arrives. */
function walk(w: World, beats: Beat[], who: GnomeId, way: readonly Point[], from: number, own: Mushroom | null, shortest = 0.8, longest = 3.4): number {
  const g = w.gnomes[who], total = lengthOf(way)
  if (way.length < 2 || total <= 0) return from
  const lasts = walkLasts(who, total, shortest, longest)
  let before = 0
  beats.push(tween(from, lasts, (progress) => {
    const at = along(way, progress)
    if (Math.abs(at.x - g.at.x) > 0.5) g.facing = at.x > g.at.x ? 1 : -1
    g.walked += (progress - before) * total
    before = progress
    g.at = at
  }))
  const passed = new Set<number>()
  let gone = 0
  for (let i = 1; i < way.length; i++) {
    gone += Math.hypot(way[i].x - way[i - 1].x, way[i].y - way[i - 1].y)
    const p = way[i], when = from + (gone / total) * lasts
    // A stepping stone, with a plonk and a ring.
    if (inWater(p.x, p.y)) beats.push(cue(w, when, stone, { pebble: p }))
    for (const m of w.mushrooms) {
      if (m === own || passed.has(m.id)) continue
      const step = stepAt(m)
      if (m.door && Math.hypot(step.x - p.x, step.y - p.y) <= 34 && i < way.length - 1) {
        passed.add(m.id)
        beats.push(cue(w, when, () => passDoor(who), { gnome: who }))
        // The sleepy one is woken by everyone who passes his door.
        if (w.occupant(m) === 'sleepy') beats.push(cue(w, when + 0.15, groan, { mushroom: m.id }))
      } else if (m.kind === 'puff' && Math.hypot(m.x - p.x, m.y - p.y) <= 70) {
        passed.add(m.id)
        beats.push(cue(w, when, brushPuff, { mushroom: m.id }))
        if (who === 'sneezy') beats.push(cue(w, when + SNEEZE_BACK_AFTER, sneezeBack, { gnome: who }))
      }
    }
  }
  return from + lasts
}

/**
 * A gnome crosses moss where no pebbles lie, from `from` seconds on, in his own way and at his own pace, seen and
 * heard at every step: the tall one in long strides, the baker bouncing, the sleepy one shuffling, the sneezy one
 * in quick steps with a sniff. Where the line crosses the stream the tall and the sleepy one wade it, with a ring
 * and a slosh at every step, and the baker and the sneezy one hop it, with a hup and a splash where they come
 * down. Returns when he arrives.
 */
export function overMoss(w: World, beats: Beat[], who: GnomeId, way: readonly Point[], from: number): number {
  const g = w.gnomes[who], plan = crossing(who, way), total = plan.total
  if (total <= 0) return from
  const lasts = walkLasts(who, total, 1.2, 5)
  let before = 0
  beats.push(tween(from, lasts, (progress) => {
    const at = along(way, progress)
    if (Math.abs(at.x - g.at.x) > 0.5) g.facing = at.x > g.at.x ? 1 : -1
    g.walked += (progress - before) * total
    before = progress
    g.at = { x: at.x, y: at.y - hopLift(plan, progress * total) }
  }))
  for (const step of plan.cues) {
    const when = from + (step.d / total) * lasts
    if (step.what === 'step') beats.push(cue(w, when, () => mossStep(who), { gnome: who }))
    else if (step.what === 'hup') beats.push(cue(w, when, () => hup(who), { gnome: who }))
    else beats.push(cue(w, when, step.what === 'down' ? splashDown : wade, { at: step.at }))
  }
  return from + lasts
}

/**
 * The pebbles a gnome who is sent to a house takes when no path leads all the way: from the log, as far as they
 * bring him nearer its doorstep than his own place on the log is. Null when none do.
 */
export function pebblesToward(w: World, who: GnomeId, step: Point): Point[] | null {
  const far = (p: Point): number => Math.hypot(p.x - step.x, p.y - step.y)
  const nearest = reachable(w.paths, (p) => atLog(p.x, p.y) && !w.unlaid.has(keyOf(p))).sort((a, b) => far(a) - far(b))[0]
  if (!nearest || far(nearest) > far(stepOff(who)) - 40) return null
  return route(w.paths, (p) => atLog(p.x, p.y), (p) => p.x === nearest.x && p.y === nearest.y)
}

/** A gnome jumps between his seat on the log and a place on the moss. */
function jump(w: World, who: GnomeId, at: number, moss: Point, down: boolean): Beat {
  const g = w.gnomes[who], seat = SEATS[who]
  return tween(at, JUMP_S, (progress) => {
    const p = ease(down ? progress : 1 - progress)
    g.where = 'out'
    g.at = { x: lerp(seat.x, moss.x, p), y: lerp(seat.y, moss.y, p) - 70 * Math.sin(Math.PI * progress) }
    g.scale = lerp(1, WALKER, p)
  })
}

/** In through his own door: it opens, he goes, it shuts behind him. Returns when he is in. */
function goIn(w: World, beats: Beat[], who: GnomeId, house: Mushroom, at: number): number {
  const g = w.gnomes[who]
  beats.push(cue(w, at, () => doorOpens(house.kind), { mushroom: house.id }))
  beats.push(tween(at + 0.1, 0.4, (progress) => { g.fade = 1 - progress }))
  beats.push(cue(w, at + 0.5, () => doorShuts(house.kind), { mushroom: house.id }, () => { g.where = 'home'; g.carries = false; g.low = 0 }))
  return at + 0.8
}

/**
 * The tall gnome at a door that is not tall enough, every time he goes in. Too low: he bumps on the frame, backs
 * off, tries again, and in the end crawls in, and from that crawl his hat lies on the step, where it stays; when
 * it lies there already it is his bare head he bumps. Middling: he stoops. Returns when he is ready to go in.
 */
function tallAtDoor(w: World, beats: Beat[], house: Mushroom, at: number): number {
  const g = w.gnomes.tall, step = stepAt(house)
  let t = at
  if (house.size > LOW) {
    beats.push(cue(w, t, stoop, { gnome: 'tall' }))
    beats.push(tween(t, 0.3, (progress) => { g.low = 0.4 * progress }))
    return t + 0.5
  }
  for (let i = 0; i < 2; i++) {
    beats.push(cue(w, t, () => (g.bare ? bump() : bonk()), { gnome: 'tall' }))
    beats.push(tween(t + 0.05, 0.4, (progress) => { g.at = { x: step.x - 26 * Math.sin(Math.PI * progress) * (house.x < 600 ? -1 : 1), y: step.y } }))
    t += 0.5
  }
  beats.push(cue(w, t, crawl, { gnome: 'tall' }, () => { g.bare = true; w.hatSeen = true }))
  beats.push(tween(t, 0.4, (progress) => { g.low = progress }))
  return t + 0.5
}

/**
 * Round and round a loop of pebbles, as often as is his manner and at his pace, until he is dizzy: he sits down
 * with a bump and gets up again. `from` is where he comes onto the pebbles. Returns when he is up, and the way
 * he took to the loop; null when the pebbles there make no loop.
 */
function roundAndRound(w: World, beats: Beat[], who: GnomeId, from: Point, at: number, own: Mushroom | null, lead: readonly Point[] = []): { t: number; to: Point[] } | null {
  const loop = loopFrom(w.paths, from)
  if (!loop) return null
  const g = w.gnomes[who], rounds = ROUNDS[who]
  let t = walk(w, beats, who, [...lead, ...loop.to], at, own) + 0.1
  const round: Point[] = [loop.round[0]]
  for (let i = 0; i < rounds; i++) round.push(...loop.round.slice(1))
  t = walk(w, beats, who, round, t, own, 0.8 * rounds, 2.2 * rounds) + 0.1
  beats.push(cue(w, t, () => sitDown(who), { gnome: who }, () => { g.sat = true }))
  t += 0.9
  beats.push(cue(w, t, () => getUp(who), { gnome: who }, () => { g.sat = false }))
  return { t: t + 0.4, to: loop.to }
}

/**
 * Moving in: he shoulders his bundle, walks the pebbles at his own pace, does what his taste makes of this house,
 * and goes in. `way` is the pebbles from the log to the door, or null when none lead all the way: then the sleepy
 * one goes straight over the moss in his sleep, and a gnome the child `sent` takes the pebbles there are and
 * crosses the rest in his own way (`overMoss`). Nobody glides: every step off the pebbles is seen and heard. His
 * entry in `homes` is kept by the act that caused this, before the first beat.
 */
export function movingIn(w: World, who: GnomeId, house: Mushroom, way: readonly Point[] | null, lead: number, first = false, sent = false): Beat[] {
  const g = w.gnomes[who], step = stepAt(house), beats: Beat[] = []
  // A gnome who was walking back to the log when the house became his goes from where he stands.
  const walking = first ? w.walkers.find((walker) => walker.who === who && walker.up === 0) : undefined
  if (walking) w.walkers = w.walkers.filter((walker) => walker !== walking)
  const start = walking ? { ...g.at } : null
  const part = way ?? (sent && !start ? pebblesToward(w, who, step) : null)
  const path = start ? [start, ...(part ?? [])] : part ? [...part] : [stepOff(who)]
  let t = lead
  beats.push(cue(w, t, () => setOff(who), { gnome: who }, () => { w.movingIn = { who, house: house.id }; w.walkers = w.walkers.filter((walker) => walker.who !== who) }))
  t += 0.3
  if (!start) {
    beats.push(jump(w, who, t, path[0], true))
    t += JUMP_S
    beats.push(cue(w, t, () => land(who), { gnome: who }))
    t += 0.15
  }
  // Only the sleepy one walks in his sleep; anyone else who crosses the moss does it wide awake.
  beats.push(cue(w, t, null, {}, () => { g.asleep = way === null && who === 'sleepy' }))
  if (way) t = walk(w, beats, who, [...path, step], t, house, 2, 5) + 0.1
  else {
    // The pebbles there are, and then the moss and the water that are left, in his own way.
    if (path.length > 1) t = walk(w, beats, who, path, t, house) + 0.05
    t = overMoss(w, beats, who, [path[path.length - 1], step], t) + 0.1
  }
  const facts = w.facts(house)
  if (who === 'tall' && house.size < TALL_FROM) t = tallAtDoor(w, beats, house, t)
  else if (who === 'baker' && house.kind !== 'bell') {
    beats.push(cue(w, t, emptyBucket, { gnome: who }, () => { g.facing = STREAM[24].x > g.at.x ? 1 : -1 }))
    t += 0.9
  } else if (who === 'sleepy' && way) {
    beats.push(cue(w, t, yawn, { gnome: who }))
    t += 0.8
  } else if (who === 'sneezy' && facts.puffNear) {
    beats.push(cue(w, t, sneezeBack, { gnome: who }))
    t += 0.7
  }
  t = goIn(w, beats, who, house, t)
  // His window shows him: at what he likes, or at what is wrong with the house.
  if (fits(who, facts)) beats.push(cue(w, t, () => content(who), { mushroom: house.id }))
  else if (who === 'sneezy' && house.kind === 'puff') beats.push(cue(w, t, sneezeIndoors, { mushroom: house.id }))
  else if (who === 'tall' && house.size <= LOW) beats.push(cue(w, t, hatBoing, { hat: true }))
  else beats.push(cue(w, t, () => doorShuts(house.kind), { mushroom: house.id }))
  beats.push(tween(t, 0.6, () => {}))
  return beats
}

/** The move-ins the kept village now calls for, as one scene. Returns whether anybody moved. */
export function settleIn(w: World, lead = 0, first: Beat[] = []): boolean {
  let beats = first, going: { who: GnomeId; house: number } | null = null
  w.assign().forEach((moved, i) => {
    going ??= { who: moved.who, house: moved.house.id }
    beats = followedBy(beats, movingIn(w, moved.who, moved.house, moved.way, i === 0 && first.length === 0 ? lead : 0.2, i === 0 && first.length === 0))
  })
  if (beats.length === 0) return false
  const moved = beats !== first
  begin(w, beats, () => {})
  // Who is on his way is known from the first beat, the snail's showing included: a tap on another gnome who waits can send that one instead.
  if (moved && going) w.movingIn = going
  return true
}

/** One gnome is sent to a house by the child: kept at once, and shown. */
export function send(w: World, who: GnomeId, house: Mushroom, lead: number): void {
  begin(w, movingIn(w, who, house, w.routeTo(house), lead, false, true), () => {})
}

/**
 * A walk: he comes out, walks his path to its other end, reacts to what he passes and to what is there, and
 * walks home. The baker goes for water. It keeps nothing: it is a view of the village and ends where it began.
 */
export function aWalk(w: World, who: GnomeId, own = false): void {
  const house = w.houseOf(who)
  if (!house) return
  const g = w.gnomes[who], step = stepAt(house), beats: Beat[] = []
  const near = (p: Point) => Math.hypot(p.x - step.x, p.y - step.y) <= 34
  // The hat that lies on the step stays there: the tall gnome comes out without it.
  beats.push(cue(w, 0, () => doorOpens(house.kind), { mushroom: house.id }, () => { g.where = 'out'; g.at = { ...step }; g.scale = WALKER; g.fade = 0; g.low = 0; g.bare = who === 'tall' && w.hatSeen }))
  beats.push(tween(0.05, 0.35, (progress) => { g.fade = progress }))
  let t = 0.5
  const there = (way: readonly Point[]): number => walk(w, beats, who, [step, ...way], t, house) + 0.1
  const back = (way: readonly Point[]): number => walk(w, beats, who, [...way].reverse().concat(step), t, house) + 0.1
  const look = () => { g.facing = STREAM[24].x > g.at.x ? 1 : -1 }
  // A loop is walked round by whoever walks it, before anything else he does out there.
  const round = roundAndRound(w, beats, who, step, t, house, [step])
  if (round) t = round.t
  if (who === 'baker') {
    const water = route(w.paths, near, (p) => waterAt(p.x, p.y).out < 12)
    if (round && !water) {
      beats.push(cue(w, t, lookAtWater, { gnome: who }, look))
      t += 1.1
      t = back(round.to)
    } else {
      if (round) t = back(round.to)
      const way = water ?? wayToEnd(w.paths, step) ?? []
      t = there(way)
      if (water) {
        beats.push(cue(w, t, fillBucket, { gnome: who }, () => { g.carries = true }))
        t += 0.7
        const home = t
        t = back(way)
        // He slops as he carries it.
        for (const share of [0.3, 0.7]) beats.push(cue(w, home + (t - home) * share, slop, { gnome: who }))
      } else {
        beats.push(cue(w, t, lookAtWater, { gnome: who }, look))
        t += 1.1
        t = back(way)
      }
    }
  } else if (round) t = back(round.to)
  else {
    const way = wayToEnd(w.paths, step) ?? []
    t = there(way)
    const end = way.length > 0 ? way[way.length - 1] : step
    const neighbour = w.mushrooms.find((m) => m !== house && m.door && Math.hypot(stepAt(m).x - end.x, stepAt(m).y - end.y) <= 40)
    if (neighbour) {
      beats.push(cue(w, t, () => knockEmpty(neighbour.kind), { mushroom: neighbour.id }))
      beats.push(cue(w, t, () => passDoor(who), { gnome: who }))
      if (w.occupant(neighbour) === 'sleepy') beats.push(cue(w, t + 0.4, groan, { mushroom: neighbour.id }))
      t += 0.8
    } else if (way.length > 0 && waterAt(end.x, end.y).out < 30) {
      beats.push(cue(w, t, lookAtWater, { gnome: who }, look))
      t += 1.1
    } else {
      beats.push(cue(w, t, scratch, { gnome: who }))
      t += 0.8
    }
    t = back(way)
  }
  // He bumps or stoops every time he goes in, and the hat stays where it lies.
  if (who === 'tall' && house.size < TALL_FROM) t = tallAtDoor(w, beats, house, t)
  goIn(w, beats, who, house, t)
  begin(w, beats, null, own)
}

/**
 * A path drawn onto a gnome who waits and leading to no house of his: he tests the first pebble with one toe,
 * walks the path to its end, scratches his head there, and walks back to the log. It keeps nothing.
 */
export function stroll(w: World, who: GnomeId, from: Point): void {
  const beats: Beat[] = [], loop = loopFrom(w.paths, from), way = loop ? loop.to : wayToEnd(w.paths, from) ?? []
  beats.push(cue(w, 0, toeTaps, { gnome: who }))
  let t = 0.6
  if (way.length > 1 || loop) {
    beats.push(jump(w, who, t, way[0], true))
    t += JUMP_S
    beats.push(cue(w, t, () => land(who), { gnome: who }))
    // A loop is walked round by whoever walks it, before he scratches his head.
    const round = roundAndRound(w, beats, who, from, t + 0.1, null)
    t = round ? round.t : walk(w, beats, who, way, t + 0.1, null) + 0.1
    beats.push(cue(w, t, scratch, { gnome: who }))
    t += 0.8
    t = walk(w, beats, who, [...way].reverse(), t, null) + 0.1
    beats.push(jump(w, who, t, way[0], false))
    t += JUMP_S
    beats.push(cue(w, t, () => land(who), { gnome: who }, () => { w.gnomes[who].where = 'log'; w.gnomes[who].scale = 1 }))
  } else {
    beats.push(cue(w, t, scratch, { gnome: who }))
  }
  beats.push(tween(t, 0.5, () => {}))
  begin(w, beats, null)
}

// ---------------------------------------------------------------- the first showings

/**
 * The cart comes: the snail goes off at the right edge, pulls a small cart of doors in to its place, stops with a
 * clack and looks at the mushroom that was grown. Kept when it starts: `cart` among the showings.
 */
export function cartComes(w: World): void {
  const snail = w.snail, cart = w.cart, off = SNAIL.x + 230, hitch = CART.x - SNAIL.x
  const newest = [...w.mushrooms].sort((a, b) => b.id - a.id)[0]
  const beats: Beat[] = [
    cue(w, 0, squelch, { snail: true }, () => { snail.facing = -1 }),
    tween(0.1, 0.9, (progress) => { snail.crawled += Math.abs(lerp(SNAIL.x, off, ease(progress)) - snail.x); snail.x = lerp(SNAIL.x, off, ease(progress)) }),
    cue(w, 1.1, squelch, { snail: true }, () => { snail.facing = 1; cart.there = true; cart.x = off + hitch }),
    tween(1.2, 2, (progress) => { snail.crawled += Math.abs(lerp(off, SNAIL.x, progress) - snail.x); snail.x = lerp(off, SNAIL.x, progress); cart.x = snail.x + hitch }),
    ...[1.4, 1.8, 2.2, 2.6, 3].map((at, i) => cue(w, at, () => creak(i), { cart: true })),
    cue(w, 3.2, cartStops, { cart: true }),
    cue(w, 3.5, null, {}, () => { if (newest) w.interest = { at: { x: newest.x, y: newest.y - 50 }, left: 2.5 } }),
    tween(3.5, 0.5, () => {}),
  ]
  begin(w, beats, () => { if (!w.shown.includes('cart')) w.shown.push('cart') })
}

/** Where the snail's three pebbles lie for a door at `x`: in a gap between the gnomes, from the log towards the moss. */
export function snailPebbles(x: number): Point[] {
  // Up between the sneezy gnome and the baker, where the log shows, as a crooked trail and no straight row;
  // its last pebble bends to the side the door is on, wherever the door stands.
  return [{ x: 520, y: 560 }, { x: 500, y: 540 }, { x: x < 500 ? 480 : 520, y: 520 }]
}

/** Where the three pebbles lie before the snail flicks them, on the bank in front of its face and not on it, and how long one is in the air. */
export const HEAP: readonly Point[] = [{ x: 962, y: 740 }, { x: 946, y: 754 }, { x: 970, y: 762 }]
export const TOSS_S = 0.5

/**
 * The first pebbles: three pebbles lie beside the snail on its stone, and it flicks them one after the other in a
 * high arc over the pond to the log, where each lands with a clack; then it looks at the door the child fitted.
 * The snail does not leave its stone: the stream lies between it and the log all the way down, and there is no
 * dry way round. Kept when it starts: `pebbles` among the showings, and the three points.
 */
export function firstPebbles(w: World, house: Mushroom, lead: number): Beat[] {
  const points = snailPebbles(house.x)
  if (!w.shown.includes('pebbles')) w.shown.push('pebbles')
  w.paths.push(points)
  for (const p of points) w.unlaid.add(keyOf(p))
  w.change = 'now'
  const heap: Prop[] = points.map((p, i) => ({ what: 'toss' as const, x: HEAP[i].x, y: HEAP[i].y, to: p, age: 0, life: lead + 0.5 + 0.6 * i + TOSS_S, phase: 'lie', since: 0 }))
  return [
    cue(w, 0, null, {}, () => { w.props.push(...heap) }),
    cue(w, lead, squelch, { snail: true }, () => { w.snail.facing = 1 }),
    ...points.flatMap((p, i) => [
      cue(w, lead + 0.5 + 0.6 * i, flick, { snail: true, prop: heap[i] }, () => { w.interest = { at: p, left: 1.2 } }),
      cue(w, lead + 0.5 + 0.6 * i + TOSS_S, () => clack(p.x, p.y), { pebble: p }, () => { w.unlaid.delete(keyOf(p)) }),
    ]),
    cue(w, lead + 2.5, null, {}, () => { w.interest = { at: { x: house.x, y: house.y - 30 }, left: 2 } }),
    tween(lead + 2.5, 0.3, () => {}),
  ]
}

// ---------------------------------------------------------------- night and morning

/**
 * Night: the sun goes down behind the hill, the sky is painted over from the top down, the windows light one by
 * one in the order the houses were built, chimneys smoke, the snail's lamp comes on and the sleepy gnome snores.
 * Kept when it starts: `night`.
 */
export function nightFalls(w: World): void {
  const from = w.sun.drop, houses = w.mushrooms.filter((m) => m.door).sort((a, b) => a.id - b.id)
  const gap = Math.min(0.45, 2.2 / Math.max(1, houses.length))
  const lit = 3 + houses.length * gap
  const beats: Beat[] = [
    cue(w, 0, () => sunGoes(true), { sun: true }),
    tween(0, 1.2, (progress) => { w.sun.drop = lerp(from, 1, ease(progress)) }),
    cue(w, 1, () => wash(true), { sun: true }),
    tween(1, 2, (progress) => { w.dark = progress }),
    ...houses.map((m, i) => cue(w, 3 + i * gap, () => lightUp(m.kind, m.size), { mushroom: m.id })),
    ...houses.filter((m) => m.kind === 'red').slice(0, 4).map((m, i) => cue(w, lit + 0.2 + 0.12 * i, smoke, { mushroom: m.id })),
    cue(w, lit + 0.8, () => lamp(true), { snail: true }),
    cue(w, lit + 1.2, snore, { gnome: 'sleepy' }),
    tween(lit + 1.2, Math.max(0.6, 6 - lit - 1.2), () => {}),
  ]
  begin(w, beats, () => { w.night = true })
}

/** Morning is night in reverse, in about two seconds. Kept when it starts: `night` cleared. */
export function morningComes(w: World): void {
  const from = w.sun.drop, houses = w.mushrooms.filter((m) => m.door)
  const beats: Beat[] = [
    cue(w, 0, () => sunGoes(false), { sun: true }),
    tween(0, 1, (progress) => { w.sun.drop = lerp(from, 0, ease(progress)) }),
    cue(w, 0.2, () => wash(false), { sun: true }),
    tween(0.2, 1.1, (progress) => { w.dark = 1 - progress }),
    ...(houses.length > 0 ? [cue(w, 1.4, lightOut, { mushroom: houses[0].id }, () => { for (const m of houses) m.glow.target = 0 })] : []),
    cue(w, 1.6, () => lamp(false), { snail: true }),
    tween(1.6, 0.4, () => {}),
  ]
  begin(w, beats, () => { w.night = false })
}
