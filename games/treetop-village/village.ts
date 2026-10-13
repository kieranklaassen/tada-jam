import type { Note } from './audio'
import type { Bus } from './bus'
import { PERSONALITY, REST, STILL, makeOn, type On } from './motion'
import type { Saved, Standing } from './save'
import { Scene, type Beat as SceneBeat } from './scene'
import { RUN_SECONDS, aboard, ask, beatsBegun, board, flourish, grip, meeting, notesBegun, notesRinging, playAt, ride, stretch, wait, type Script } from './scripts'
import { CUP, LINE_UP, bowAt, farFrom, feetAt, seatOf, shapeOf } from './shape'
import { BASKET, BODY, DOOR, FOLK, HILL_Y, HOME, KIND_COUNT, LANDINGS, MOON_Y, OUTLINE, PIECE_REACH, PLACES, PLACE_COUNT, RISE_Y, SET_Y, SNAP_REACH, SUN, SUN_R, TAB_LOW, TRUNK_X, basketSlot, dist, mid, onOak, onTrunk, standAt, toPlace, type Folk, type Pt } from './tree'
import { KINDS, meetStep, restOf, routeTo, wayTo, type Errand, type Kind, type Meeting, type Step } from './ways'

// The rules of Treetop Village. A piece carried from the basket and let go
// near a place snaps on, and the nearest walker who has a way to it comes and
// tries it as the grid says. The sun on its tab is drawn down for evening and
// the moon lifted for morning, and a shaken trunk drops every piece back into
// the basket. Pure: no canvas, no clock but the seconds it is stepped by, and
// no chance. What is seen is composed from this in frame.ts, and what is
// heard is the list of cues it leaves in `cues`, each with its notes.

/**
 * One thing to be heard. `bus` says what it belongs to: `carry` a bucket on its run, `stage` a scene or what a
 * walker does where it stands, and one bus for each walker's doings on a piece; a cue without one is the answer
 * to the child's own touch. The cue `hush` silences whatever still rings on its bus: a scene or a carry that a
 * touch ends is not heard again, and a walker made to stand still on its piece is silent while it stands.
 */
export type Cue = { id: string; n?: number; notes?: readonly Note[]; bus?: Bus }

/** A walker on its way along a landing: to a piece, from a piece to its own spot, or in at its door. */
export type Walk = { phase: 'to' | 'from' | 'in'; step: Step | null; meeting: Meeting; toX: number }
/** A walker at a piece: meeting it as the grid says, getting into its bucket, or finding the bucket away. */
export type OnPiece = { what: 'meet' | 'board' | 'wait'; script: Script; t: number; place: number; forward: boolean; meeting: Meeting; id: string }
/** Something a walker does where it is: its flourish, its asking, holding on, its stretch. */
export type Show = { what: 'flourish' | 'ask' | 'grip' | 'stretch'; script: Script; t: number }

export type Walker = {
  folk: Folk
  /** The landing the walker stands on, or the one its step ends on once it is certain to get across. */
  at: number
  errand: Errand
  /** A newer piece it has been given to try while it was busy: it turns to it when its present try ends. The newest wins. */
  next: Errand
  /** An errand it left standing to go and try a piece, and takes up again afterwards. At rest both are none. */
  back: Errand
  /** The place it last had to stay in front of, so the same try is not made twice over the same piece. */
  blocked: number
  /** The bucket place it waits for, or -1, and whether it sits in that bucket or hangs on it. */
  waiting: number
  seated: boolean
  /** Riding in a bucket that is running: the place, or -1. */
  riding: number
  /** The place it waits to use because someone else is on it, or -1. */
  queued: number
  x: number
  y: number
  face: 1 | -1
  walk: Walk | null
  on: OnPiece | null
  show: Show | null
  /** Whether it sets off when its flourish is over. */
  sets: boolean
  askToward: 1 | -1
  /** A piece no way leads to that it will ask about when it is next standing still, or -1. */
  asks: number
  /** Steps walked, for the gait. */
  strides: number
  /** By night a walker at home is behind its door. `door` is how far through the door it is shown, 0 out and 1 in. */
  indoors: boolean
  door: number
  /** Folded flat by the shake, 0 standing and 1 flat. */
  flat: number
  /** Seconds left of the small jump a tap gets while a flourish is still playing. */
  jump: number
}

/** A piece in the hand. `from` is the place it was lifted off, or -1 for the basket; `moved` is whether the finger has carried it anywhere yet. */
export type Held = { kind: Kind; from: number; at: Pt; swing: number; swingV: number; age: number; moved: boolean }
export type Flutter = { kind: Kind; from: Pt; slot: number; t: number }
/** A leaf or an acorn on its way down. `chute` is the slide an acorn rattles down, or -1. */
export type Bit = { kind: 'leaf' | 'acorn'; x: number; y: number; vx: number; vy: number; t: number; bounced: boolean; chute: number }
/** What the finger holds that is not a piece: the sun or moon on its tab, or the trunk. */
export type Grab = { what: 'tab'; dy: number; moved: boolean } | { what: 'trunk'; x0: number; side: -1 | 0 | 1; crossings: number; moved: boolean }
/** The outcome of the shake, held from its first moment while the pieces are still seen coming down. */
export type Outcome = Pick<Saved, 'places' | 'lifts' | 'folk' | 'newest'>

export type Village = {
  places: (Kind | null)[]
  lifts: (0 | 1)[]
  newest: number | null
  night: boolean
  walkers: Walker[]
  held: Held | null
  /** A placed piece under the finger, before the finger has moved: a tap is its own answer, a drag lifts it off. */
  pressed: number
  grab: Grab | null
  /** Seconds since each place's piece snapped on, since it was tapped, and seconds left of its shake under a finger. */
  born: number[]
  tap: number[]
  wiggle: number[]
  /** Where each bucket is on its run, 0 at `pa` and 1 at `pb`; the ride that is playing there and how far it has got. */
  run: number[]
  rides: (Script | null)[]
  rideT: number[]
  /** How brightly the lanterns in each place burn, 0 to 1. */
  lit: number[]
  flutters: Flutter[]
  bits: Bit[]
  /** How hard the leaf cards shake, the basket hops and a pair of pegs knocks: each dies away. */
  shake: number
  basketHop: number
  knock: { place: number; t: number }
  /** How far the crown leans under a finger on the trunk, -1 to 1, and how hard it rocks in the shake. */
  lean: number
  rock: number
  /** The tab: how high the sun or the moon stands on it, which of the two shows, and its bob when it is tapped. */
  tabY: number
  moon: boolean
  tabBob: number
  /** How far the evening sheet is up, 0 by day and 1 by night. */
  dusk: number
  /** The scene that is playing, if one is: evening, morning or the shake. */
  scene: { what: 'dusk' | 'morning' | 'shake'; play: Scene } | null
  outcome: Outcome | null
  /** The free place a carried piece would snap to, or -1. */
  open: number
  time: number
  cues: Cue[]
  /** What storage is owed: 0 nothing, 1 a small change, 2 an outcome to write at once. */
  dirty: 0 | 1 | 2
}

export const FLUTTER_SECONDS = 0.9
export const UNFOLD_SECONDS = 0.5
/** How long a piece answers a tap. */
export const TAP_SECONDS = 0.9
/** How long the small jump lasts that answers a tap on a walker in the middle of its flourish. */
export const JUMP_SECONDS = 0.3
/** The most acorns and leaves falling, and pieces fluttering home, at one time. The frame budget counts on both. */
export const MOST_BITS = 5
export const MOST_FLUTTERS = 4
const HOLD_ABOVE = 34
const AT_REST = 99

const stand = (folk: Folk, at: number): Walker => {
  const spot = standAt(folk, at)
  return {
    folk, at, errand: 'none', next: 'none', back: 'none', blocked: -1, waiting: -1, seated: false, riding: -1, queued: -1, x: spot.x, y: spot.y, face: spot.x < TRUNK_X ? 1 : -1,
    walk: null, on: null, show: null, sets: false, askToward: 1, asks: -1, strides: 0, indoors: false, door: 0, flat: 0, jump: 0,
  }
}

/** Whether a finger has this place's piece off its pegs. Until it is let go the piece still counts as there: nobody steps on it, and nobody sets off because of it. */
const inHand = (v: Village, place: number): boolean => v.held !== null && v.held.from === place

/** The peg of a place that stands on this landing. */
const pegOn = (place: number, landing: number): Pt => (PLACES[place].from === landing ? PLACES[place].pa : PLACES[place].pb)
/**
 * Where a walker that has to stay at a piece stands, and which way it is turned: on its landing at the foot of the
 * piece, a step back from the peg so the piece shows, turned towards where it was going.
 */
export function stayAt(folk: Folk, landing: number, place: number): { x: number; face: 1 | -1 } {
  const p = PLACES[place], pad = LANDINGS[landing]
  const near = pegOn(place, landing), far = near === p.pa ? p.pb : p.pa
  const own = standAt(folk, landing).x
  // On a rise that goes straight up it is turned as it came, from its own spot.
  const face: 1 | -1 = far.x > near.x ? 1 : far.x < near.x ? -1 : own <= near.x ? 1 : -1
  const within = (x: number): number => Math.max(pad.x0 + 10, Math.min(pad.x1 - 10, x))
  if (p.fit === 'span') return { x: within(near.x - face * 22), face }
  // Beside the foot of a rise, on whichever side leaves the middle of the piece clear of its card, so the piece can still be
  // touched; where the landing is too narrow for either, on its own spot, which is always clear.
  const half = BODY[folk].w / 2, middle = (p.pa.x + p.pb.x) / 2
  for (const side of [-face, face]) {
    const x = within(near.x + side * (half + 8))
    if (Math.abs(middle - x) > half + 6) return { x, face: x === near.x ? face : x < near.x ? 1 : -1 }
  }
  return { x: own, face: own < near.x ? 1 : own > near.x ? -1 : face }
}
/** Which way a walker that stands with somewhere to go is turned: towards the piece it waits at, or towards where it was going. */
function turned(walker: Walker): 1 | -1 {
  const piece = walker.blocked >= 0 ? walker.blocked : walker.waiting >= 0 ? walker.waiting : walker.queued >= 0 ? walker.queued : typeof walker.errand === 'number' ? walker.errand : -1
  const toX = piece >= 0 ? mid(PLACES[piece]).x : walker.errand === 'home' ? HOME[walker.folk].door.x : walker.x
  return toX > walker.x ? 1 : toX < walker.x ? -1 : walker.x < TRUNK_X ? 1 : -1
}
/** Which way a walker in a bucket is turned: along the bucket's line, or, where that goes straight up, the way from its own spot to the bucket. */
function seatFace(walker: Walker, place: number): 1 | -1 {
  const peg = pegOn(place, walker.at), other = peg === PLACES[place].pa ? PLACES[place].pb : PLACES[place].pa
  return other.x > peg.x ? 1 : other.x < peg.x ? -1 : peg.x >= spot(walker).x ? 1 : -1
}
/** Which way a walker at rest is turned. */
const restFace = (walker: Walker): 1 | -1 => (walker.blocked >= 0 ? stayAt(walker.folk, walker.at, walker.blocked).face : turned(walker))
/** Whether a bucket rests at the end that stands on this landing. */
const restsAt = (v: Village, place: number, landing: number): boolean =>
  v.places[place] === 'bucket' && v.run[place] === v.lifts[place] && (v.lifts[place] === 0 ? PLACES[place].from : PLACES[place].to) === landing

const spot = (walker: Walker): Pt => standAt(walker.folk, walker.at)
/** Puts every walker where it stands with nothing in motion, and works out again who waits, who sits and who had to stay. */
function settle(v: Village): void {
  for (const walker of v.walkers) {
    const spot = standAt(walker.folk, walker.at)
    Object.assign(walker, { next: 'none' as Errand, back: 'none' as Errand, blocked: -1, waiting: -1, seated: false, riding: -1, queued: -1, x: spot.x, y: spot.y, face: spot.x < TRUNK_X ? 1 : -1, walk: null, on: null, show: null, sets: false, asks: -1, indoors: false, door: 0, flat: 0, jump: 0 })
  }
  for (const walker of v.walkers) {
    const way = routeTo(walker.at, walker.errand, walker.folk, v)
    if (way === null) continue
    if (way.length === 0) { walker.errand = 'none'; continue }
    const place = way[0].place
    const meetingHere = meetStep(walker.folk, way[0], v)
    if (meetingHere === 'stay') { walker.blocked = place; Object.assign(walker, stayAt(walker.folk, walker.at, place)) }
    else if (meetingHere === 'carry') {
      walker.waiting = place
      // The first to wait where the bucket rests sits in it; anyone else waits on the landing.
      if (restsAt(v, place, walker.at) && !v.walkers.some((other) => other.seated && other.waiting === place)) {
        const peg = pegOn(place, walker.at)
        Object.assign(walker, { seated: true, x: peg.x, y: peg.y, face: seatFace(walker, place) })
      }
    }
  }
  // With everyone seated who sits: a walker whose next step is a piece somebody is in waits behind it.
  for (const walker of v.walkers) {
    const way = walker.errand === 'none' ? null : routeTo(walker.at, walker.errand, walker.folk, v)
    if (way && way.length > 0 && meetStep(walker.folk, way[0], v) === 'across' && occupied(v, way[0].place, walker)) walker.queued = way[0].place
  }
  for (const walker of v.walkers) if (!walker.seated) walker.face = restFace(walker)
  for (const walker of v.walkers) if (v.night && walker.at === HOME[walker.folk].landing && walker.errand === 'none') { walker.indoors = true; walker.door = 1; walker.x = HOME[walker.folk].door.x }
}

/** Builds the village as it was left: every walker on its saved landing, nothing walking, nothing unfolding, no scene playing. */
export function makeVillage(saved: Saved): Village {
  const v: Village = {
    places: [...saved.places], lifts: [...saved.lifts], newest: saved.newest, night: saved.night,
    walkers: FOLK.map((folk) => ({ ...stand(folk, saved.folk[folk].at), errand: saved.folk[folk].errand })),
    held: null, pressed: -1, grab: null,
    born: Array.from({ length: PLACE_COUNT }, () => AT_REST), tap: Array.from({ length: PLACE_COUNT }, () => AT_REST), wiggle: Array.from({ length: PLACE_COUNT }, () => 0),
    run: saved.lifts.map((end) => end), rides: Array.from({ length: PLACE_COUNT }, () => null), rideT: Array.from({ length: PLACE_COUNT }, () => 0),
    lit: saved.places.map((kind) => (saved.night && kind === 'lanterns' ? 1 : 0)),
    flutters: [], bits: [], shake: 0, basketHop: 0, knock: { place: -1, t: 0 }, lean: 0, rock: 0,
    tabY: saved.night ? MOON_Y : SUN.y, moon: saved.night, tabBob: 0, dusk: saved.night ? 1 : 0, scene: null, outcome: null,
    open: -1, time: 0, cues: [], dirty: 0,
  }
  settle(v)
  return v
}

/**
 * What a tap sends a walker to: from anywhere but its own door, home. From its door, to the newest piece when a
 * way leads to it; with no newest piece, or none it has a way to, to the nearest piece it gets to by itself, with
 * every piece on the way one it crosses. The fewer pieces on the way the nearer; of two as near, one it gets
 * over or is carried on comes before one that stops it, and then the lower place.
 */
export function errandOnTap(v: Village, walker: Walker): Errand {
  if (walker.at !== HOME[walker.folk].landing) return 'home'
  const tree = v
  if (v.newest !== null && tree.places[v.newest] && routeTo(walker.at, v.newest, walker.folk, tree) !== null) return v.newest
  let best: Errand = 'none', least = Infinity
  for (let place = 0; place < PLACE_COUNT; place++) {
    if (!tree.places[place]) continue
    const way = wayTo(walker.at, place, walker.folk, tree, 'crossing')
    if (way === null) continue
    const far = way.length * 2 + (meetStep(walker.folk, way[way.length - 1], tree) === 'stay' ? 1 : 0)
    if (far < least) { best = place; least = far }
  }
  return best
}

/**
 * Where a walker will come to rest, with everything it still has to do done as far as the tree lets it. A
 * tapped walker's flourish is still playing: its errand is the tap's. A walker that stands, and will not set
 * off unless something changes, is where it is.
 */
function restAt(v: Village, walker: Walker): Standing {
  const errand = walker.sets ? errandOnTap(v, walker) : walker.errand
  // A walker that waits behind someone sitting in a bucket goes nowhere until the child sends it.
  if (walker.queued >= 0 && v.walkers.some((other) => other !== walker && other.seated && other.waiting === walker.queued)) return { at: walker.at, errand }
  // Nor does it get past a bucket somebody else sits in or waits at where it rests.
  const shut = new Set<number>()
  for (const other of v.walkers) {
    if (other === walker || other.waiting < 0 || !(other.seated || restsAt(v, other.waiting, other.at))) continue
    // Only while its errand still goes by that bucket: one whose errand has changed gets out again.
    const way = other.errand === 'none' ? null : routeTo(other.at, other.errand, other.folk, v)
    if (way && way.length > 0 && way[0].place === other.waiting) shut.add(other.waiting)
  }
  if (walker.sets) return restOf(walker.folk, walker.at, errand, walker.next, 'none', v, shut)
  if (!busy(walker) && walker.queued < 0) return { at: walker.at, errand }
  return restOf(walker.folk, walker.at, errand, walker.next, walker.back, v, shut)
}

/** What goes to storage: every walker where its walk will end, and a piece in the hand where it came from. */
export function savedOf(v: Village, base: Saved): Saved {
  if (v.outcome) return { ...base, places: [...v.outcome.places], lifts: [...v.outcome.lifts], folk: { ...v.outcome.folk }, newest: v.outcome.newest, night: v.night }
  const folk = {} as Record<Folk, Standing>
  for (const walker of v.walkers) folk[walker.folk] = restAt(v, walker)
  return { ...base, places: [...v.places], lifts: [...v.lifts], folk, newest: v.newest, night: v.night }
}

/** Where a bucket is on its run, as the point on the line between its pegs. */
export function bucketAt(v: Village, place: number): Pt {
  const { pa, pb } = PLACES[place]
  const u = v.run[place]
  const eased = u * u * (3 - 2 * u)
  // A cable car's line sags a little under it.
  return { x: pa.x + (pb.x - pa.x) * eased, y: pa.y + (pb.y - pa.y) * eased + (PLACES[place].fit === 'span' ? 40 * eased * (1 - eased) : 0) }
}

/** Where a walker is drawn: its feet, the line below which its card is cut off (or null), and how far it leans with a seat. */
export type Stand = { x: number; y: number; floor: number | null; lean: number }

const base = makeOn(), shown = makeOn()

/**
 * Works out where a walker is and what it is doing, from the one timeline it
 * is on. `on` receives its pose and what its piece does; the return says
 * where its feet are. The frame and the rules both ask here, so a touch lands
 * on a walker where it is drawn.
 */
export function standOf(v: Village, walker: Walker, on: On, out: Stand): Stand {
  Object.assign(on.pose, REST)
  Object.assign(on.piece, STILL)
  on.along = 0
  on.hang = 0
  on.sink = 0
  on.seat = false
  out.x = walker.x
  out.y = walker.y
  out.floor = null
  out.lean = 0
  const at = walker.on
  const inCup = walker.riding >= 0 || walker.seated
  if (walker.riding >= 0) playAt(v.rides[walker.riding]!, v.rideT[walker.riding], on)
  else if (at) playAt(at.script, at.t, on)
  else if (walker.seated) aboard(walker.folk, v.time, on)
  if (inCup || (at && at.what === 'board')) {
    // In or on a bucket: the walker goes with the cup, and what sinks into it is cut off at its bottom.
    const place = walker.riding >= 0 ? walker.riding : walker.waiting >= 0 ? walker.waiting : at!.place
    const cup = bucketAt(v, place)
    out.x = cup.x + (on.seat ? LINE_UP * Math.sin(on.piece.swing) * 0.5 : 0)
    out.y = cup.y + on.sink + on.hang + (on.seat ? on.piece.sag : 0)
    if (on.sink > 0) out.floor = cup.y + CUP.bottom + on.piece.sag + 2
  } else if (at && at.what === 'meet') {
    const place = PLACES[at.place], kind = v.places[at.place] ?? 'plank'
    const [near, far] = at.forward ? [place.pa, place.pb] : [place.pb, place.pa]
    const t = at.forward ? on.along : 1 - on.along
    const edge = near.y + (far.y - near.y) * on.along
    const line = edge + feetAt(kind, place.fit, t) + bowAt(kind, place.fit, t, on.piece.bounce)
    out.x = near.x + (far.x - near.x) * on.along
    out.y = line + on.hang + on.sink
    // What sinks into a trough is hidden behind its near wall.
    if (on.sink > 0) out.floor = edge - 3
    if (on.seat && kind === 'swing') {
      // On the seat of a swing: the walker goes where the seat goes.
      const { pin, seat } = seatOf(at.place)
      const reach = Math.hypot(seat.x - pin.x, seat.y - pin.y), angle = Math.atan2(seat.x - pin.x, seat.y - pin.y) - on.piece.swing
      out.x = pin.x + reach * Math.sin(angle)
      out.y = pin.y + reach * Math.cos(angle) + on.piece.sag + (place.fit === 'rise' ? -2 : 4)
      out.lean = on.piece.swing
    }
  } else if (at) {
    // Finding the bucket away: it stands at the peg and looks along the rope.
    const peg = pegOn(at.place, walker.at)
    out.x = peg.x
    out.y = peg.y
  }
  if (walker.show) {
    // What it does where it is, laid over where it is.
    playAt(walker.show.script, walker.show.t, shown)
    Object.assign(on.pose, shown.pose)
  }
  return out
}

const scratch: Stand = { x: 0, y: 0, floor: null, lean: 0 }
/** Where a walker's feet are now. */
export function feet(v: Village, walker: Walker): Pt {
  const where = standOf(v, walker, base, scratch)
  return { x: where.x, y: where.y }
}

const busy = (walker: Walker): boolean => walker.walk !== null || walker.on !== null || walker.show !== null || walker.riding >= 0
const cue = (v: Village, id: string, n?: number, notes?: readonly Note[], bus?: Bus): void => { v.cues.push({ id, ...(n === undefined ? {} : { n }), ...(notes ? { notes } : {}), ...(bus ? { bus } : {}) }) }
/** A cue of a scene: something the tree does by itself, which a touch can end. */
const staged = (v: Village, id: string, n?: number): void => cue(v, id, n, undefined, 'stage')
/** Whatever still rings on a bus is silenced: what it belonged to has been ended, or stands still. */
const hush = (v: Village, bus: Bus): void => { v.cues.push({ id: 'hush', bus }) }
/** The bus of what a walker does on a piece. */
const onBus = (walker: Walker): Bus => `on:${walker.folk}`
/** Scenes, and everything every walker was doing, are silenced. */
const hushStage = (v: Village): void => { hush(v, 'stage'); for (const walker of v.walkers) hush(v, onBus(walker)) }
const owe = (v: Village, level: 1 | 2): void => { if (level > v.dirty) v.dirty = level }

/**
 * Sound follows the clock the picture is drawn from. A script that is played on from `t0` to `t1` hands over the
 * notes its own time reaches on the way, one by one, and nothing ahead of it: while it waits nothing of it
 * sounds, and when it is dropped nothing of it sounds again. A script that is starting passes a `t0` below zero,
 * and always leaves its cue, with the notes that sound at once.
 */
function sound(v: Village, script: Script, t0: number, t1: number, id: string, bus: Bus, n?: number, fromBeat = 0): void {
  const notes = notesBegun(script, t0, t1, fromBeat)
  if (notes.length > 0 || t0 < 0) cue(v, id, n, notes, bus)
}

/** Whether someone is on a piece, in it or hanging from it: such a piece does not come off, and carries nobody else. */
export function occupied(v: Village, place: number, but: Walker | null = null): boolean {
  return inHand(v, place) || v.walkers.some((walker) => walker !== but && (walker.riding === place || walker.on?.place === place || (walker.waiting === place && walker.seated)))
}

/** A walker that waits at a bucket sits in it or hangs on it. */
export function inBucket(_v: Village, walker: Walker): boolean {
  return walker.waiting >= 0 && walker.seated
}

/**
 * Something a walker does where it is. Its opening beat is the answer to a touch, so that beat is handed over
 * whole, as one voice the first touch of a visit can hold; the beats after it sound note by note as they come.
 * Nothing makes a show wait, and when a scene's end drops it the stage is hushed.
 */
function startShow(v: Village, walker: Walker, what: Show['what'], script: Script): void {
  // What it was doing on a piece stands still while the show plays, and so does its sound: a long note of it is cut here and begins again when the move does.
  if (walker.on) hush(v, onBus(walker))
  walker.show = { what, script, t: 0 }
  for (const beat of beatsBegun(script, -1, 0)) cue(v, `${what}:${walker.folk}`, undefined, beat.sound, 'stage')
}
/** The first beat of a show that does not open it. */
const laterBeats = (script: Script): number => { const first = script.beats.findIndex((beat) => beat.at > 0); return first < 0 ? script.beats.length : first }

/** A walker turns to what it has to do next: the newer piece it was given, or the errand it left standing. False when it has neither. */
function turnTo(walker: Walker): boolean {
  const kept = walker.errand !== 'none'
  if (walker.next !== 'none') {
    if (kept && walker.back === 'none') walker.back = walker.errand
    walker.errand = walker.next
    walker.next = 'none'
    return true
  }
  if (walker.back === 'none') return false
  walker.errand = walker.back
  walker.back = 'none'
  return true
}

/**
 * A walker that stands looks for its next piece and sets off for it. It takes a way it can get all the way
 * along where there is one, however long, and otherwise the shortest way, and does not try again a piece that
 * has just stopped it. When its errand is done, or it has to stay or wait, it turns to a newer piece it was
 * given meanwhile, and after that to the errand it left standing (`restOf` in ways.ts is the same, worked out
 * ahead for the save).
 */
function plan(v: Village, walker: Walker): void {
  if (busy(walker) || walker.flat > 0) return
  for (let turn = 0; turn < 4; turn++) {
    if (walker.errand === 'none' && !turnTo(walker)) return
    const way = routeTo(walker.at, walker.errand, walker.folk, v)
    if (way === null) {
      if (turnTo(walker)) continue
      // No way leads there any more. It keeps its errand, and stops waiting, sitting or staying at a piece: it stands on its own spot, as a load finds it.
      if (walker.waiting >= 0 || walker.blocked >= 0 || walker.queued >= 0) {
        walker.waiting = -1
        walker.seated = false
        walker.blocked = -1
        walker.queued = -1
        if (!walker.indoors) startFrom(walker)
      }
      return
    }
    if (way.length === 0) {
      // It is where it was going, and no piece stops it any more.
      walker.errand = 'none'
      walker.blocked = -1
      walker.queued = -1
      owe(v, 1)
      if (walker.next !== 'none' || walker.back !== 'none') continue
      // A walker that sat waiting in a bucket for another errand gets out and stands on its own spot again.
      if (walker.waiting >= 0) {
        const sat = walker.seated
        walker.waiting = -1
        walker.seated = false
        if (sat) startFrom(walker)
      }
      return
    }
    const step = way[0]
    const how = meetStep(walker.folk, step, v)
    // It has tried this piece and had to stay, or waits for this bucket already: it gets in only when the bucket rests at its end with nobody in it.
    const stays = how === 'stay' && walker.blocked === step.place
    const waits = how === 'carry' && walker.waiting === step.place && (walker.seated || !restsAt(v, step.place, walker.at) || occupied(v, step.place, walker))
    if (stays || waits) {
      if (turnTo(walker)) continue
      return
    }
    if (!(how === 'carry' && walker.waiting === step.place) && walker.queued === step.place && occupied(v, step.place, walker)) {
      // Behind somebody who sits in a bucket it would wait for good, so it turns to whatever else it has to do.
      if (v.walkers.some((other) => other !== walker && other.seated && other.waiting === step.place) && turnTo(walker)) continue
      return
    }
    walker.blocked = -1
    walker.queued = -1
    if (walker.waiting !== step.place) { walker.waiting = -1; walker.seated = false }
    if (walker.indoors) { walker.indoors = false; walker.x = HOME[walker.folk].door.x }
    const near = step.forward ? PLACES[step.place].pa : PLACES[step.place].pb
    walker.walk = { phase: 'to', step, meeting: how, toX: near.x }
    walker.face = near.x >= walker.x ? 1 : -1
    return
  }
}

/** Something in the tree changed: every walker that still has somewhere to go looks again. */
function treeChanged(v: Village): void {
  const tree = v
  for (const walker of v.walkers) {
    if (walker.blocked >= 0 && !tree.places[walker.blocked]) walker.blocked = -1
    if (walker.queued >= 0 && !tree.places[walker.queued]) walker.queued = -1
    if (walker.waiting >= 0 && tree.places[walker.waiting] !== 'bucket') { walker.waiting = -1; walker.seated = false }
    afresh(v, walker)
  }
}

/**
 * A walker looks again from where it is, because the tree or its errand has changed. One that was walking up to a
 * piece drops that walk first: its way is worked out anew from the landing it is on, which is what a save has for it.
 */
function afresh(v: Village, walker: Walker): void {
  if (walker.walk?.phase === 'to') walker.walk = null
  plan(v, walker)
  // Left standing away from its place with nothing to walk to, it walks back to its own spot.
  if (!busy(walker) && walker.flat === 0 && walker.blocked < 0 && !walker.seated && !walker.indoors && walker.x !== standAt(walker.folk, walker.at).x) startFrom(walker)
}

/** The box a touch on a walker lands in: its card where it is drawn, or its door when it is behind it. */
function walkerAt(v: Village, at: Pt): Walker | null {
  // The last drawn is on top, so the last in the list wins.
  for (let i = v.walkers.length - 1; i >= 0; i--) {
    const walker = v.walkers[i]
    if (walker.flat > 0.5) continue
    if (walker.indoors) {
      const door = DOOR[walker.folk]
      if (walker.door >= 1 && Math.abs(at.x - door.x) <= door.w / 2 && Math.abs(at.y - door.y) <= door.h / 2) return walker
      continue
    }
    const body = BODY[walker.folk], here = feet(v, walker)
    if (Math.abs(at.x - here.x) <= body.w / 2 + 6 && at.y <= here.y + 8 && at.y >= here.y - body.h - 8) return walker
    // What is drawn of it outside that box is the walker too: a tail, a letter held out, a hat, a stick.
    const local = { x: (at.x - here.x) * walker.face, y: at.y - here.y }
    if (OUTLINE[walker.folk].some((part) => farFrom(local, [part.line]) <= part.r)) return walker
  }
  return null
}

/** The bare pair of pegs a finger is on. On the trunk the oak answers, so there a pair answers only at its pegs. */
function pegsAt(v: Village, at: Pt): number {
  const trunk = onTrunk(at)
  let best = -1, nearest = PEG_REACH
  PLACES.forEach((place, index) => {
    if (v.places[index] !== null) return
    const far = trunk ? Math.min(dist(at, place.pa), dist(at, place.pb)) : toPlace(at, place)
    if (far < nearest) { best = index; nearest = far }
  })
  return best
}
/** How near a bare pair of pegs a tap must land. */
const PEG_REACH = 26

/**
 * The piece a finger is on: a piece is touched where it is drawn. Near the line
 * between its pegs counts as before; so does the piece's own shape where it
 * hangs away from that line (a swing's seat, a lantern's glass, a bridge's sag,
 * a bucket's cup wherever it is on its run).
 */
export function pieceAt(v: Village, at: Pt): number {
  let best = -1, nearest = PIECE_REACH
  PLACES.forEach((place, index) => {
    const kind = v.places[index]
    if (kind === null) return
    const lines = shapeOf(kind, index)
    if (kind === 'bucket') { const cup = bucketAt(v, index); lines.push([{ x: cup.x, y: cup.y + CUP.rim - 12 }, { x: cup.x, y: cup.y + CUP.bottom }]) }
    const far = Math.min(toPlace(at, place), farFrom(at, lines) + SHAPE_SLACK)
    if (far < nearest) { best = index; nearest = far }
  })
  return best
}
/** A piece's drawn shape is touched a little less widely than the line between its pegs. */
const SHAPE_SLACK = 8

/** The point a carried piece hangs at, a little above the finger so the hand does not hide it. */
const carriedAt = (at: Pt): Pt => ({ x: at.x, y: at.y - HOLD_ABOVE })

function findOpen(v: Village): number {
  // A piece that was only tapped in the basket was carried nowhere, and goes nowhere.
  if (!v.held || !v.held.moved) return -1
  const at = carriedAt(v.held.at)
  let best = -1, nearest = SNAP_REACH
  PLACES.forEach((place, index) => {
    if (v.places[index] !== null && index !== v.held!.from) return
    const far = Math.min(toPlace(at, place), toPlace(v.held!.at, place))
    if (far < nearest) { best = index; nearest = far }
  })
  return best
}

function drop(v: Village, bit: Bit): void {
  v.bits.push(bit)
  if (v.bits.length > MOST_BITS) v.bits.shift()
}

function flutter(v: Village, kind: Kind, from: Pt): void {
  v.flutters.push({ kind, from, slot: KINDS.indexOf(kind), t: 0 })
  // A hand that throws pieces faster than they fly keeps the newest in the air: the frame stays inside its budget.
  if (v.flutters.length > MOST_FLUTTERS) v.flutters.shift()
}

/** Where the sun or the moon is on its tab. */
export const tabAt = (v: Village): Pt => ({ x: SUN.x, y: v.tabY })

/** A touch ends whatever scene is playing: everything lands where the scene was taking it, without a sound. */
function endScenes(v: Village): void {
  if (v.scene) { const playing = v.scene; v.scene = null; playing.play.finish(); hushStage(v) }
  endCarries(v)
}
/** Every bucket on its run is at its end, with whoever rode on its landing, and nothing of the run is heard again. */
function endCarries(v: Village): void {
  let ran = false
  for (let place = 0; place < PLACE_COUNT; place++) if (v.rides[place]) { v.run[place] = v.lifts[place]; arrive(v, place, true); ran = true }
  if (ran) hush(v, 'carry')
}

/** A finger lands. Every touch is answered here, in the frame it lands in. */
export function press(v: Village, at: Pt): void {
  if (v.held || v.grab) return
  endScenes(v)
  v.pressed = -1
  const walker = walkerAt(v, at)
  if (walker) {
    if (walker.indoors) { walker.indoors = false; walker.x = HOME[walker.folk].door.x; walker.face = walker.x < TRUNK_X ? 1 : -1 }
    if (!walker.show) {
      startShow(v, walker, 'flourish', flourish(walker.folk))
      if (walker.waiting >= 0) {
        // A walker that waits in or on a bucket: the child means the ride.
        send(v, walker.waiting)
      } else {
        // It sets off once the flourish is over, unless it is already on its way.
        walker.sets = walker.walk === null && walker.on === null && walker.riding < 0
        if (walker.sets) owe(v, 2)
      }
    } else {
      // Tapped again while it is still showing off: a small jump and its own voice once more.
      walker.jump = JUMP_SECONDS
      cue(v, `again:${walker.folk}`)
    }
    return
  }
  if (at.x >= BASKET.x0 && at.x <= BASKET.x1 && at.y >= BASKET.y0 - 14 && at.y <= BASKET.y1 + 8) {
    const slot = Math.max(0, Math.min(KIND_COUNT - 1, Math.floor(((at.x - BASKET.x0) / (BASKET.x1 - BASKET.x0)) * KIND_COUNT)))
    v.held = { kind: KINDS[slot], from: -1, at, swing: 0, swingV: 0, age: 0, moved: false }
    v.basketHop = 1
    cue(v, `lift:${KINDS[slot]}`)
    return
  }
  const piece = pieceAt(v, at)
  if (piece >= 0) {
    const kind = v.places[piece]!
    if (kind !== 'bucket' && occupied(v, piece)) { holdOn(v, piece); return }
    // The finger lands: the piece jogs on its pegs with a knock of its own wood. What it does next is the finger's: a tap or a carry.
    v.pressed = piece
    v.wiggle[piece] = 0.16
    cue(v, `touch:${kind}`, piece)
    return
  }
  const pegs = pegsAt(v, at)
  if (pegs >= 0) {
    v.knock = { place: pegs, t: 0.35 }
    cue(v, 'knock', pegs)
    return
  }
  if (!v.scene && dist(at, tabAt(v)) <= SUN_R + 12 && (v.moon || at.y <= HILL_Y)) {
    // The sun or the moon on its tab: it gives under the finger, and can be drawn along its slot.
    v.grab = { what: 'tab', dy: at.y - v.tabY, moved: false }
    v.tabBob = 1
    cue(v, v.moon ? 'moon' : 'sun')
    return
  }
  if (onOak(at)) {
    // The oak: the leaf cards quiver under the finger, and the trunk can be pulled.
    v.grab = { what: 'trunk', x0: at.x, side: 0, crossings: 0, moved: false }
    v.shake = Math.max(v.shake, 0.5)
    cue(v, 'grab')
    return
  }
  // Bare page: the nearest cards quiver.
  v.shake = Math.max(v.shake, 0.3)
  cue(v, 'page')
}

/** A tap on a piece in the tree: the piece answers as itself. */
function tapPiece(v: Village, place: number, kind: Kind): void {
  v.tap[place] = 0
  if (kind === 'bucket') { send(v, place); return }
  if (kind === 'slide') {
    // An acorn rattles down it.
    const { pa, pb } = PLACES[place]
    const top = pa.y <= pb.y ? pa : pb
    drop(v, { kind: 'acorn', x: top.x, y: top.y - 10, vx: 0, vy: 0, t: 0, bounced: false, chute: place })
  }
  cue(v, `tap:${kind}`, place)
}

/** A piece pulled at while someone is on it: it shakes, and whoever is on it holds on and squeaks. */
function holdOn(v: Village, place: number): void {
  v.wiggle[place] = 0.5
  cue(v, 'held', place)
  for (const walker of v.walkers) {
    if (walker.riding !== place && walker.on?.place !== place && !(walker.waiting === place && walker.seated)) continue
    if (!walker.show) startShow(v, walker, 'grip', grip(walker.folk))
  }
}

/** The finger moves. A pressed piece comes off its pegs here, a carried piece follows, and the tab and the trunk are drawn along. */
export function move(v: Village, at: Pt): void {
  if (v.grab) {
    const grab = v.grab
    grab.moved = true
    if (grab.what === 'tab') {
      v.tabY = Math.max(SUN.y, Math.min(TAB_LOW, at.y - grab.dy))
      return
    }
    v.lean = Math.max(-1, Math.min(1, (at.x - grab.x0) / 90))
    const side = v.lean > 0.6 ? 1 : v.lean < -0.6 ? -1 : 0
    if (side !== 0 && side !== grab.side) {
      // Pulled over to one side: the crown rustles, and each time it goes across to the other side counts.
      if (grab.side !== 0) grab.crossings += 1
      grab.side = side
      v.shake = 1
      cue(v, 'rustle')
      if (grab.crossings >= 2) {
        // The finger is let go of first, so its next move is not read as the touch that ends the scene.
        v.grab = null
        startShake(v)
      }
    }
    return
  }
  if (!v.held && v.pressed >= 0) {
    const place = v.pressed
    v.pressed = -1
    if (occupied(v, place)) { holdOn(v, place); return }
    v.held = { kind: v.places[place]!, from: place, at, swing: 0, swingV: 0, age: 0, moved: true }
    v.tap[place] = AT_REST
    v.lit[place] = 0
    v.bits = v.bits.filter((bit) => bit.chute !== place)
    cue(v, 'pop', place)
    // Nothing changes for the walkers until the piece is let go: whoever stood at its foot stands there still.
  }
  if (!v.held) return
  v.held.swingV += (at.x - v.held.at.x) * 0.02
  v.held.at = at
  v.held.moved = true
  v.open = findOpen(v)
}

/** The finger lets go: a carried piece snaps onto the open place or flutters home, a tapped bucket runs, the tab and the trunk are let go. */
export function release(v: Village, at: Pt): void {
  if (v.grab) {
    const grab = v.grab
    v.grab = null
    if (grab.what === 'trunk') {
      // A tap or a single pull: the tree springs back with a rustle and drops one acorn.
      v.shake = Math.max(v.shake, 1)
      drop(v, { kind: 'acorn', x: grab.x0, y: Math.max(at.y, 150), vx: grab.x0 < TRUNK_X ? 26 : -26, vy: 0, t: 0, bounced: false, chute: -1 })
      cue(v, 'rustle')
    } else if (!v.moon && v.tabY >= SET_Y) startDusk(v)
    else if (v.moon && v.tabY <= RISE_Y) startMorning(v)
    else if (grab.moved) { v.tabBob = 1; cue(v, 'spring') }
    return
  }
  if (!v.held) {
    const place = v.pressed
    v.pressed = -1
    if (place >= 0 && v.places[place]) tapPiece(v, place, v.places[place])
    return
  }
  const held = v.held
  held.at = at
  const target = findOpen(v)
  v.held = null
  v.open = -1
  if (held.from >= 0) { v.places[held.from] = null; v.lifts[held.from] = 0; v.run[held.from] = 0 }
  if (target < 0) {
    if (held.from >= 0 && v.newest === held.from) v.newest = null
    flutter(v, held.kind, carriedAt(at))
    cue(v, 'flutter')
    if (held.from >= 0) { treeChanged(v); owe(v, 2) }
    return
  }
  v.places[target] = held.kind
  v.lifts[target] = 0
  v.run[target] = 0
  v.born[target] = 0
  v.tap[target] = AT_REST
  v.lit[target] = v.night && held.kind === 'lanterns' ? 1 : 0
  v.newest = target
  v.shake = 1
  const where = mid(PLACES[target])
  drop(v, { kind: 'leaf', x: where.x + 30, y: Math.min(where.y - 120, 260), vx: 14, vy: 0, t: 0, bounced: false, chute: -1 })
  cue(v, `snap:${held.kind}`, target)
  treeChanged(v)
  const comer = comerFor(v, target)
  if (comer) {
    const { walker, moving } = comer
    if (moving) walker.next = target
    else {
      // One that stood with an errand it could not finish takes that errand up again afterwards.
      if (walker.errand !== 'none') walker.back = walker.errand
      walker.errand = target
      walker.next = 'none'
      plan(v, walker)
    }
  } else {
    // No walker has a way to it: the nearest one leans out towards it and asks, when its try is over if it is in the middle of one.
    const up = v.walkers.filter((one) => one.flat === 0)
    const walker = (up.length > 0 ? up : v.walkers).reduce((a, b) => (dist(feet(v, a), where) <= dist(feet(v, b), where) ? a : b))
    for (const other of v.walkers) other.asks = -1
    if (busy(walker) || walker.sets || walker.flat > 0) walker.asks = target
    else askAbout(v, walker, target)
  }
  owe(v, 2)
}

/** A walker leans out towards a piece no way leads to and asks. By night it steps out of its door to do so, and goes in again. */
function askAbout(v: Village, walker: Walker, place: number): void {
  const where = mid(PLACES[place])
  if (walker.indoors) { walker.indoors = false; walker.x = HOME[walker.folk].door.x }
  walker.askToward = where.x >= walker.x ? 1 : -1
  walker.face = walker.askToward
  startShow(v, walker, 'ask', ask(walker.folk))
}

/**
 * Who comes to try a piece that has just been fitted: the nearest walker that can get to it, counted in pieces
 * on its way, the earlier in the fixed order on a tie. A walker that is busy counts from where its present try
 * will leave it, and takes the piece up when that try ends (`moving`). One that stands with an errand it could
 * not finish comes only when no other can get there, and only if it can get there itself. A walker that has a
 * way but will be stopped on it comes when nobody can get there. Null when no walker has a way at all.
 */
function comerFor(v: Village, target: number): { walker: Walker; moving: boolean } | null {
  let best: { walker: Walker; moving: boolean } | null = null, least = Infinity
  for (const walker of v.walkers) {
    if (walker.flat > 0) continue
    const moving = busy(walker) || walker.sets
    const stood = !moving && walker.errand !== 'none'
    const from = moving ? restAt(v, walker).at : walker.at
    const own = wayTo(from, target, walker.folk, v, true)
    const way = own ?? wayTo(from, target, walker.folk, v)
    if (way === null || (stood && !own)) continue
    // One that waits for a bucket, or will, is not picked for a piece that lies beyond that bucket: it cannot get there until the child sends it.
    const rest = moving ? restAt(v, walker) : { at: walker.at, errand: walker.errand }
    const now = rest.errand === 'none' ? null : routeTo(rest.at, rest.errand, walker.folk, v)
    if (now && now.length > 0 && way.length > 0 && now[0].place === way[0].place && meetStep(walker.folk, way[0], v) === 'carry') continue
    const far = ((own ? 0 : 2) + (stood ? 1 : 0)) * 100 + way.length
    if (far < least) { best = { walker, moving }; least = far }
  }
  return best
}

/** The touch was taken away: the child made no drop, so a carried piece goes back where it came from and nothing that was held starts anything. */
export function cancel(v: Village): void {
  v.pressed = -1
  if (v.grab) { v.grab = null; return }
  if (!v.held) return
  const from = v.held.from
  v.held = null
  v.open = -1
  if (from >= 0) {
    // It is back on its pegs, and for the walkers it never left: nobody sets off, so the tree is as a load of the same save finds it.
    v.born[from] = UNFOLD_SECONDS * 0.6
    v.lit[from] = v.night && v.places[from] === 'lanterns' ? 1 : 0
  }
}

/** A bucket is sent to its other end, with whoever sits in it or hangs on it. */
function send(v: Village, place: number): void {
  const end = v.lifts[place]
  if (v.run[place] !== end) return
  let rider: Walker | null = null
  for (const walker of v.walkers) {
    if (walker.on?.what === 'board' && walker.on.place === place) {
      // Still getting in: the cup goes without it. From this frame it stands at the peg on its landing and walks back to its spot, to wait.
      walker.on = null
      hush(v, onBus(walker))
      walker.x = pegOn(place, walker.at).x
      walker.y = spot(walker).y
      startFrom(walker)
      continue
    }
    if (walker.waiting !== place || !walker.seated) continue
    rider = walker
    walker.riding = place
    walker.waiting = -1
    walker.seated = false
    walker.on = null
    walker.at = end === 0 ? PLACES[place].to : PLACES[place].from
    if (walker.errand === place) walker.errand = 'none'
  }
  v.lifts[place] = end === 0 ? 1 : 0
  v.rides[place] = ride(rider ? rider.folk : null, PLACES[place].fit)
  v.rideT[place] = 0
  sound(v, v.rides[place]!, -1, 0, 'send', 'carry', place)
  owe(v, 2)
}

/** A bucket reaches its end: whoever rode gets out and goes on, and whoever waits there gets in. */
function arrive(v: Village, place: number, quiet: boolean): void {
  v.rides[place] = null
  if (!quiet) cue(v, 'arrive', place, undefined, 'carry')
  const far = v.lifts[place] === 0 ? PLACES[place].pa : PLACES[place].pb
  for (const walker of v.walkers) {
    if (walker.riding !== place) continue
    walker.riding = -1
    if (quiet) { const spot = standAt(walker.folk, walker.at); walker.x = spot.x; walker.y = spot.y; continue }
    walker.x = far.x
    walker.y = far.y
    startFrom(walker)
  }
  treeChanged(v)
}

/** From the end of a piece to the walker's own spot on the landing. */
function startFrom(walker: Walker): void {
  const spot = standAt(walker.folk, walker.at)
  walker.y = spot.y
  walker.walk = { phase: 'from', step: null, meeting: 'across', toX: spot.x }
  walker.face = spot.x >= walker.x ? 1 : -1
}

// ---------------------------------------------------------------- the scenes

const beat = (at: number, lasts: number, play: (progress: number, finishing: boolean) => void): SceneBeat => ({ at, lasts, play })
const smooth = (u: number): number => u * u * (3 - 2 * u)

function startScene(v: Village, what: 'dusk' | 'morning' | 'shake', beats: SceneBeat[], outcome: () => void): void {
  const play = new Scene(beats)
  v.scene = { what, play }
  play.start(v.time, () => { outcome(); owe(v, 2) })
}

/** The places that hold lanterns, the lowest first. */
const lanternPlaces = (v: Village): number[] => PLACES.map((_, place) => place).filter((place) => v.places[place] === 'lanterns').sort((a, b) => mid(PLACES[b]).y - mid(PLACES[a]).y)

/** How long the evening is a scene. Whoever is still on its way home after that goes on as in any try. */
export const DUSK_SECONDS = 6
/** The shortest morning, with nobody at home to step out. */
export const MORNING_SECONDS = 3

/** A touch ends a scene with every walker where its walk was taking it, standing still. */
function land(v: Village): void {
  for (const walker of v.walkers) {
    const end = restAt(v, walker)
    walker.at = end.at
    walker.errand = end.errand
  }
  settle(v)
}

/** Evening: the sheet slides up, the lanterns that are hung light from the lowest, and everyone sets off for home along the child's ways. */
function startDusk(v: Village): void {
  const from = v.tabY
  const lamps = lanternPlaces(v)
  const beats: SceneBeat[] = [
    beat(0, 0, (_p, finishing) => { if (!finishing) staged(v, 'dusk') }),
    // The sun goes down behind the hill, and the moon comes up on the same tab.
    beat(0, 0.5, (p) => { v.tabY = from + (TAB_LOW - from) * smooth(p) }),
    beat(0.5, 0, () => { v.moon = true }),
    beat(0.5, 0.9, (p) => { v.tabY = TAB_LOW + (MOON_Y - TAB_LOW) * smooth(p) }),
    beat(0, 1.6, (p) => { v.dusk = smooth(p) }),
    ...lamps.flatMap((place, index) => [
      beat(1.3 + index * 0.35, 0, (_p, finishing) => { if (!finishing) staged(v, 'light', index) }),
      beat(1.3 + index * 0.35, 0.3, (p) => { v.lit[place] = p }),
    ]),
    // The walks home belong to the evening: on a touch everyone is where its walk was taking it.
    beat(Math.max(DUSK_SECONDS, 1.6 + lamps.length * 0.35), 0, (_p, finishing) => { if (finishing) land(v) }),
  ]
  startScene(v, 'dusk', beats, () => {
    v.night = true
    for (const walker of v.walkers) {
      walker.errand = 'home'
      walker.next = 'none'
      walker.back = 'none'
      walker.sets = false
      walker.blocked = -1
      afresh(v, walker)
    }
  })
}

/** Morning: the sheet slides down, the lanterns go out, and whoever is at home steps out onto its sill and stretches. */
function startMorning(v: Village): void {
  const from = v.tabY
  const home = v.walkers.filter((walker) => walker.indoors)
  const beats: SceneBeat[] = [
    beat(0, 0, (_p, finishing) => { if (!finishing) staged(v, 'morning') }),
    beat(0, 0.5, (p) => { v.tabY = from + (SUN.y - from) * smooth(p) }),
    beat(0.25, 0, () => { v.moon = false; v.tabBob = 1 }),
    beat(0, 2.0, (p) => { v.dusk = 1 - smooth(p) }),
    beat(0.3, 0.6, (p) => { for (let place = 0; place < PLACE_COUNT; place++) v.lit[place] = Math.min(v.lit[place], 1 - p) }),
    ...home.map((walker, index) => beat(1.2 + index * 0.5, 0, (_p, finishing) => {
      walker.indoors = false
      if (finishing) { const spot = standAt(walker.folk, walker.at); walker.x = spot.x; walker.door = 0; return }
      walker.x = HOME[walker.folk].door.x
      walker.face = walker.x < TRUNK_X ? 1 : -1
      startShow(v, walker, 'stretch', stretch(walker.folk))
    })),
    // Three seconds with nobody at home, four and a half with all four.
    beat(Math.max(MORNING_SECONDS, 1.2 + home.length * 0.5 + 1.3), 0, (_p, finishing) => { if (finishing) land(v) }),
  ]
  startScene(v, 'morning', beats, () => {
    v.night = false
    for (const walker of v.walkers) {
      // Nobody has anywhere to go any more. Whoever waited at a bucket, sat in one or stood at the foot of a piece goes back to its own spot,
      // and whoever was on its way to a piece turns round; a walker that is on a piece or in a running bucket gets off it first.
      const stood = walker.seated || walker.blocked >= 0 || (walker.on !== null && walker.on.what !== 'meet') || walker.walk?.phase === 'to'
      Object.assign(walker, { errand: 'none' as Errand, next: 'none' as Errand, back: 'none' as Errand, sets: false, blocked: -1, queued: -1, waiting: -1, seated: false })
      if (walker.on && walker.on.what !== 'meet') walker.on = null
      if (stood && !walker.indoors) startFrom(walker)
    }
  })
}

/** The shake: the tree rocks, the pieces come off their pegs one by one from the top, and everyone folds flat and pops up at its own door. */
function startShake(v: Village): void {
  // Whatever anyone was doing is over: each is on its landing, every bucket is at its end, and nothing of it is heard again.
  endCarries(v)
  hushStage(v)
  if (v.held) { v.held = null; v.open = -1 }
  for (const walker of v.walkers) Object.assign(walker, { walk: null, on: null, show: null, sets: false, riding: -1, seated: false, waiting: -1, queued: -1, blocked: -1, errand: 'none' as Errand, next: 'none' as Errand, back: 'none' as Errand })
  const pieces = PLACES.map((_, place) => place).filter((place) => v.places[place] !== null).sort((a, b) => mid(PLACES[a]).y - mid(PLACES[b]).y)
  const comeOff = (place: number, finishing: boolean): void => {
    const kind = v.places[place]
    if (!kind) return
    v.places[place] = null
    v.lifts[place] = 0
    v.run[place] = 0
    v.lit[place] = 0
    v.tap[place] = AT_REST
    if (finishing) return
    flutter(v, kind, mid(PLACES[place]))
    staged(v, `off:${kind}`, place)
  }
  const last = 0.9 + pieces.length * 0.3
  const beats: SceneBeat[] = [
    beat(0, 0, (_p, finishing) => { if (!finishing) staged(v, 'shake') }),
    beat(0, 1.0, (p) => { v.rock = p < 1 ? 1 - p : 0; v.lean = 0 }),
    ...pieces.map((place, index) => beat(0.9 + index * 0.3, 0, (_p, finishing) => comeOff(place, finishing))),
    ...v.walkers.flatMap((walker, index) => [
      // Folds flat where it stands, and pops up at its own door.
      beat(0.5 + index * 0.3, 0.35, (p) => { walker.flat = p }),
      beat(0.85 + index * 0.3, 0, () => { walker.at = HOME[walker.folk].landing; walker.x = HOME[walker.folk].door.x; walker.y = LANDINGS[walker.at].y; walker.face = walker.x < TRUNK_X ? 1 : -1; walker.indoors = false; walker.door = 0 }),
      beat(last + index * 0.2, 0, (_p, finishing) => { if (!finishing) staged(v, `peek:${walker.folk}`) }),
      beat(last + index * 0.2, 0.4, (p) => { walker.flat = 1 - p }),
    ]),
    beat(last + v.walkers.length * 0.2 + 0.4, 0, (_p, finishing) => {
      v.newest = null
      v.outcome = null
      v.rock = 0
      if (finishing) { v.flutters.length = 0; settle(v) } else for (const walker of v.walkers) startFrom(walker)
    }),
  ]
  startScene(v, 'shake', beats, () => {
    const folk = {} as Record<Folk, Standing>
    for (const name of FOLK) folk[name] = { at: HOME[name].landing, errand: 'none' }
    v.outcome = { places: Array.from({ length: PLACE_COUNT }, () => null), lifts: Array.from({ length: PLACE_COUNT }, () => 0), folk, newest: null }
  })
}

// ------------------------------------------------------------ the idle ladder

/** What the ghost hand shows: a piece carried to a free place, a tap, or the tab drawn along its slot. */
export type Hint = { from: Pt; to: Pt; carries: Kind | null } | { tap: Pt }

/** The bucket a walker waits for, if any does: that is the next thing to touch. */
function waitedBucket(v: Village): number {
  for (const walker of v.walkers) if (walker.waiting >= 0 && !walker.on && v.run[walker.waiting] === v.lifts[walker.waiting]) return walker.waiting
  return -1
}

/** The middle of a bucket's cup, where a tap on it lands. */
export const cupAt = (v: Village, place: number): Pt => { const cup = bucketAt(v, place); return { x: cup.x, y: cup.y + (CUP.rim + CUP.bottom) / 2 } }

export function hint(v: Village, index: number): Hint {
  const bucket = waitedBucket(v)
  if (bucket >= 0) return { tap: cupAt(v, bucket) }
  // Now and then the hand shows the tab: by day the sun drawn down, one time in four; by night the moon lifted, every other time, since that is how the day begins again.
  if (v.moon ? index % 2 === 1 : index % 4 === 3) return v.moon ? { from: tabAt(v), to: { x: SUN.x, y: SUN.y + 20 }, carries: null } : { from: tabAt(v), to: { x: SUN.x, y: SET_Y + 24 }, carries: null }
  const free = PLACES.map((_, place) => place).filter((place) => v.places[place] === null)
  if (free.length === 0) {
    const out = v.walkers.filter((walker) => !walker.indoors)
    if (out.length === 0) return { from: tabAt(v), to: { x: SUN.x, y: SUN.y + 20 }, carries: null }
    const walker = out[index % out.length]
    const here = feet(v, walker)
    return { tap: { x: here.x, y: here.y - BODY[walker.folk].h / 2 } }
  }
  const to = mid(PLACES[free[(index * 5 + 2) % free.length]])
  const slot = (index * 3 + 1) % KIND_COUNT
  return { from: basketSlot(slot), to: { x: to.x, y: to.y + HOLD_ABOVE }, carries: KINDS[slot] }
}

/** Where the idle glow lies: on the bucket someone waits for, else on the basket, else on the walkers that are out. */
export function glowOn(v: Village): { bucket: number } | { basket: true } | { walkers: Walker[] } {
  const bucket = waitedBucket(v)
  if (bucket >= 0) return { bucket }
  if (v.places.some((kind) => kind === null)) return { basket: true }
  return { walkers: v.walkers.filter((walker) => !walker.indoors) }
}

/** Whether anything is under way that the idle ladder should wait for. */
export const lively = (v: Village): boolean =>
  v.held !== null || v.grab !== null || v.scene !== null || v.rides.some((one) => one !== null) || v.walkers.some((walker) => busy(walker) || (walker.door > 0 && walker.door < 1))

// ------------------------------------------------------------------ the step

const approach = (value: number, target: number, by: number): number => (value < target ? Math.min(target, value + by) : Math.max(target, value - by))

/** Plays `dt` seconds. */
export function step(v: Village, dt: number): void {
  if (dt <= 0) return
  v.time += dt
  if (v.scene) {
    const playing = v.scene
    playing.play.update(v.time)
    if (!playing.play.running && v.scene === playing) v.scene = null
  }
  v.shake = Math.max(0, v.shake - dt * 1.4)
  v.basketHop = Math.max(0, v.basketHop - dt * 3)
  v.tabBob = Math.max(0, v.tabBob - dt * 1.2)
  v.knock.t = Math.max(0, v.knock.t - dt)
  if (!v.grab || v.grab.what !== 'trunk') v.lean = approach(v.lean, 0, dt * 5)
  if (!v.scene && (!v.grab || v.grab.what !== 'tab')) {
    // Let go short of evening or of morning, the tab springs back to where it rests.
    const rest = v.moon ? MOON_Y : SUN.y
    v.tabY += (rest - v.tabY) * Math.min(1, dt * 9)
    if (Math.abs(rest - v.tabY) < 0.5) v.tabY = rest
  }
  for (let i = 0; i < PLACE_COUNT; i++) {
    v.born[i] += dt
    v.tap[i] = Math.min(AT_REST, v.tap[i] + dt)
    v.wiggle[i] = Math.max(0, v.wiggle[i] - dt)
    const ride = v.rides[i]
    if (ride) {
      const before = v.rideT[i]
      v.rideT[i] = Math.min(RUN_SECONDS, before + dt)
      sound(v, ride, before, v.rideT[i], 'send', 'carry', i)
      v.run[i] = approach(v.run[i], v.lifts[i], dt / RUN_SECONDS)
      if (v.rideT[i] >= RUN_SECONDS) { v.run[i] = v.lifts[i]; arrive(v, i, false) }
    }
  }
  if (v.held) {
    // The piece swings behind the hand and settles.
    const held = v.held
    held.age += dt
    held.swingV += (-held.swing * 60 - held.swingV * 7) * dt
    held.swing = Math.max(-0.7, Math.min(0.7, held.swing + held.swingV * dt))
  }
  for (const one of v.flutters) one.t += dt
  if (v.flutters.some((one) => one.t >= FLUTTER_SECONDS)) {
    v.flutters = v.flutters.filter((one) => one.t < FLUTTER_SECONDS)
    v.basketHop = 1
    cue(v, 'pat')
  }
  for (const bit of v.bits) stepBit(v, bit, dt)
  v.bits = v.bits.filter((bit) => bit.t < 2.6 && !(bit.chute >= 0 && bit.t >= 0.55))
  for (const walker of v.walkers) stepWalker(v, walker, dt)
}

function stepBit(v: Village, bit: Bit, dt: number): void {
  bit.t += dt
  if (bit.chute >= 0) {
    // Down the slide it was dropped into, from its upper end to its lower.
    const { pa, pb } = PLACES[bit.chute]
    const [top, low] = pa.y <= pb.y ? [pa, pb] : [pb, pa]
    const u = Math.min(1, bit.t / 0.55)
    bit.x = top.x + (low.x - top.x) * u * u
    bit.y = top.y + (low.y - top.y) * u * u - 10
    return
  }
  if (bit.kind === 'leaf') {
    // A leaf sways down slowly and lies on the page.
    bit.y = Math.min(LANDINGS[0].y + 14, bit.y + 70 * dt)
    bit.x += Math.sin(bit.t * 5) * 40 * dt
    return
  }
  const floor = LANDINGS[0].y + 16
  if (bit.bounced && bit.vy === 0) {
    // After its bounce the acorn rolls into the gutter of the book and stops there.
    bit.x = approach(bit.x, TRUNK_X, 150 * dt)
    return
  }
  bit.vy += 1500 * dt
  bit.y += bit.vy * dt
  bit.x += bit.vx * dt
  if (bit.y >= floor) {
    bit.y = floor
    if (!bit.bounced) { bit.bounced = true; bit.vy = -260; cue(v, 'acorn') } else bit.vy = 0
  }
}

function stepWalker(v: Village, walker: Walker, dt: number): void {
  // Through its door: in by night, out when something calls it.
  walker.door = approach(walker.door, walker.indoors ? 1 : 0, dt * 4)
  walker.jump = Math.max(0, walker.jump - dt)
  if (walker.flat > 0) return
  if (walker.show) {
    // What it does where it is comes first, and whatever it was on its way to waits for it.
    const show = walker.show
    const before = show.t
    show.t += dt
    sound(v, show.script, before, show.t, `${show.what}:${walker.folk}`, 'stage', undefined, laterBeats(show.script))
    if (show.t < show.script.seconds) return
    walker.show = null
    if (walker.sets) {
      // The child's tap is the newest word: whatever else it had to do is dropped.
      walker.sets = false
      // A piece hung since the tap is still tried, when the tap's errand is done.
      walker.errand = errandOnTap(v, walker)
      walker.back = 'none'
      walker.blocked = -1
    }
    if (show.what === 'stretch') startFrom(walker)
    // The move it stood still in goes on, and a long note of it that was cut begins again from where the move is.
    if (walker.on) { const ringing = notesRinging(walker.on.script, walker.on.t); if (ringing.length > 0) cue(v, walker.on.id, walker.on.place, ringing, onBus(walker)) }
    // The tree may have changed while it was showing off.
    if (!walker.walk && !walker.on && walker.riding < 0) afresh(v, walker)
    return
  }
  if (walker.riding >= 0) return
  if (walker.on) { stepOn(v, walker, walker.on, dt); return }
  const walk = walker.walk
  if (!walk) {
    // Standing: turned towards the piece that stopped it, the one it waits for or where it was going, or as it stands at its door. A load turns it the same way.
    // It was in the middle of a try when a piece was hung that no way leads to: now it asks, if the piece is still there.
    if (walker.asks >= 0) { const place = walker.asks; walker.asks = -1; if (v.places[place] && !walker.sets) { askAbout(v, walker, place); return } }
    // Nothing keeps it away from its own spot any more: it walks back there.
    if (!walker.seated && !walker.indoors && walker.blocked < 0 && walker.x !== spot(walker).x) { startFrom(walker); return }
    if (walker.seated) walker.face = seatFace(walker, walker.waiting)
    else if (!walker.indoors) walker.face = restFace(walker)
    if (walker.queued >= 0 && !occupied(v, walker.queued, walker)) { walker.queued = -1; plan(v, walker) }
    // Behind somebody who has sat down in a bucket, it turns to whatever else it has to do.
    else if (walker.queued >= 0 && (walker.next !== 'none' || walker.back !== 'none') && v.walkers.some((other) => other !== walker && other.seated && other.waiting === walker.queued)) plan(v, walker)
    // It waits on the landing for a bucket that rests here: it gets in as soon as nobody is on the rope.
    else if (walker.waiting >= 0 && !walker.seated && walker.errand !== 'none' && restsAt(v, walker.waiting, walker.at) && !occupied(v, walker.waiting, walker)) plan(v, walker)
    // By night a walker that is at home with nowhere to go goes in, and its window lights.
    else if (v.night && !walker.indoors && !walker.seated && walker.at === HOME[walker.folk].landing && walker.errand === 'none' && v.scene?.what !== 'shake') {
      walker.walk = { phase: 'in', step: null, meeting: 'across', toX: HOME[walker.folk].door.x }
      walker.face = walker.walk.toX >= walker.x ? 1 : -1
    }
    return
  }
  const p = PERSONALITY[walker.folk]
  const before = walker.x
  walker.x = approach(walker.x, walk.toX, p.speed * dt)
  walker.strides += (Math.abs(walker.x - before) / p.speed) * p.cadence
  if (walker.x !== walk.toX) return
  walker.walk = null
  if (walk.phase === 'in') {
    // It goes in, unless it was given a piece to try on its way to the door.
    if (v.night && walker.next === 'none' && walker.back === 'none') { walker.indoors = true; staged(v, `window:${walker.folk}`) } else startFrom(walker)
    return
  }
  if (walk.phase === 'from') {
    plan(v, walker)
    return
  }
  // At the piece. It may have gone, or changed, while the walker was on its way.
  const at = walk.step!
  const tree = v
  const place = PLACES[at.place]
  if (!tree.places[at.place] || meetStep(walker.folk, at, tree) !== walk.meeting) { startFrom(walker); return }
  if (occupied(v, at.place, walker)) {
    // Someone is on it: a piece carries one at a time. It goes back to its spot and comes again when the piece is free.
    if (walk.meeting === 'carry') walker.waiting = at.place
    else walker.queued = at.place
    startFrom(walker)
    return
  }
  const kind = tree.places[at.place]!
  const [near, far] = at.forward ? [place.pa, place.pb] : [place.pb, place.pa]
  walker.face = far.x > near.x ? 1 : far.x < near.x ? -1 : walker.face
  if (walk.meeting === 'carry') {
    walker.waiting = at.place
    const here = restsAt(v, at.place, walker.at)
    const script = here ? board(walker.folk) : wait(walker.folk)
    walker.on = { what: here ? 'board' : 'wait', script, t: 0, place: at.place, forward: at.forward, meeting: 'carry', id: `${here ? 'board' : 'wait'}:${walker.folk}` }
    sound(v, script, -1, 0, walker.on.id, onBus(walker), at.place)
    // A newer piece it was given that is this very bucket is tried by getting in.
    if (walker.next === at.place) walker.next = 'none'
    return
  }
  const script = meeting(walker.folk, kind, place.fit, at.forward, at.place)
  walker.on = { what: 'meet', script, t: 0, place: at.place, forward: at.forward, meeting: walk.meeting, id: `meet:${walker.folk}:${kind}:${place.fit}:${walk.meeting}` }
  sound(v, script, -1, 0, walker.on.id, onBus(walker), at.place)
  // A newer piece it was given and now comes to on its way is tried here, and not again.
  if (walker.next === at.place) walker.next = 'none'
  if (walk.meeting === 'across') {
    // The step's outcome is certain from here, so the walker belongs to the far landing already.
    walker.at = at.forward ? place.to : place.from
    if (walker.errand === at.place) walker.errand = 'none'
  }
  owe(v, 2)
}

/** A walker at a piece plays its script on, and when the script is over it is across, back, or in its bucket. */
function stepOn(v: Village, walker: Walker, on: OnPiece, dt: number): void {
  // The piece may be taken from under a walker that only stands at its end.
  if (v.places[on.place] === null) { walker.on = null; startFrom(walker); return }
  const before = on.t
  on.t += dt
  sound(v, on.script, before, on.t, on.id, onBus(walker), on.place)
  if (on.t < on.script.seconds) return
  walker.on = null
  const place = PLACES[on.place]
  if (on.what === 'board') {
    const peg = pegOn(on.place, walker.at)
    // The child may have sent the bucket off while it was getting in: then it is left on the landing, and waits there.
    if (!restsAt(v, on.place, walker.at)) { walker.x = peg.x; startFrom(walker); return }
    walker.seated = true
    walker.x = peg.x
    walker.y = peg.y
    walker.face = seatFace(walker, on.place)
    // Sitting, it turns to a newer piece it was given while it got in.
    plan(v, walker)
    return
  }
  if (on.what === 'wait') {
    // It waits on the landing, on its own spot, until the bucket rests here.
    const peg = pegOn(on.place, walker.at)
    walker.x = peg.x
    startFrom(walker)
    return
  }
  const end = on.meeting === 'across' ? (on.forward ? place.pb : place.pa) : on.forward ? place.pa : place.pb
  walker.x = end.x
  walker.y = end.y
  if (on.meeting === 'stay' && walker.errand !== 'none') {
    // It stays in front of the piece, at its foot, turned towards where it was going.
    walker.blocked = on.place
    const foot = stayAt(walker.folk, walker.at, on.place)
    walker.walk = { phase: 'from', step: null, meeting: 'across', toX: foot.x }
    walker.face = foot.x >= walker.x ? 1 : -1
    return
  }
  startFrom(walker)
}
