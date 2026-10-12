import { coverPieces } from './footprints'
import { BEFORE_HOG, IN_WATER, ON_BALL, ON_PATH, ON_STONE, PAIRED, SAIL, STOLEN, TOUCHED, type Cue } from './cells'
import { clearAt, edgeSpot, freeSpot, freeTable, settleAt, stretchOf, toadFeetFor, toadOnTable, underToad } from './ground'
import { DIP, DOOR, FAR_BANK, FOOT_SPOTS, GROUND, HANGERS, HEDGEHOG, JAY, LOG_FOOT, NEST, NEST_SLOTS, NOSE, NOSE_REACH, ON_SPINES, PUDDLE, PUDDLE_SLOT, SPOTS, STEP, STONE_SPOT, TOAD_HOME, TOAD_REACH, TOAD_RISE, TUCKS, WHEEL, near, within, type P } from './layout'
import { COVERS, HELLO, LOUSE, MANNERS } from './motion'
import { pick } from './rng'
import { BOWL, BOWL_BANK, BOWL_SLOT, PAIR_GAP, PAIR_REACH, ROOM_DOOR, TABLE, onTable } from './room'
import type { ToadAt, Where } from './save'
import { Scene } from './scene'
import { BALL_TOP, SPINE, coupleOf, drawn, jayBody, miniSpot, restOf, thingUnder, toadNow, toadRest, wayOut } from './things'
import { NEVER, TURN, amount, begin, drop, dwellerAt, findAt, homeOf, isWet, lookAt, moving, setWet, tuckFor, type Mover, type Toy } from './toy'
import { SOUNDS, type SoundId } from './voices'
import { PLACES, THINGS, nextSeason, pairOf, type PlaceId, type ThingId } from './wood'

// What a touch does. The finger lands (`press`), moves (`carry`), lets go
// (`release`) or is taken away (`cancel`), and each is answered now, on this
// moment of the model's clock: the save is changed at once, and acts show it.

export type Target =
  | { kind: 'thing'; thing: ThingId }
  | { kind: 'cover'; place: PlaceId }
  | { kind: 'find'; place: PlaceId }
  | { kind: 'hedgehog' | 'jay' | 'toad' | 'wheel' | 'door' | 'nest' | 'bowl' | 'water' | 'wood' | 'regrab' }

/** How near its middle a thing is picked up, and how near a thing that hangs where it was let go a finger takes it up again. */
export const GRAB = 58
export const REGRAB = 70
/** A second touch this soon after a cover set off is part of the same tap: it moves the cover no further, and is a knock on it. A third of a second, as the sheet has it. */
export const SAME_TAP = 1 / 3
/**
 * A slipped tap is no carry to somewhere new. A thing that lay on open ground and is let go again within this
 * long of the touch, or nearer than this to where it lay (a finger's width: 48 px at 1180 wide), has not been
 * let go on open ground: it stays where it lay, and nothing comes of it.
 */
export const SLIP_TIME = 0.25
export const SLIP_REACH = 48
/** How near a hanging piece hangs to a knock for the knock to set it swinging. */
export const KNOCK_REACH = 260

const OPEN_SOUND: Record<PlaceId, SoundId> = { grass: 'grassOpen', log: 'logOpen', stone: 'stoneOpen', puddle: 'puddleOpen', branch: 'branchOpen', burrow: 'burrowOpen' }
const SHUT_SOUND: Record<PlaceId, SoundId> = { grass: 'grassShut', log: 'logShut', stone: 'stoneShut', puddle: 'puddleShut', branch: 'branchShut', burrow: 'burrowShut' }
const one = (sound: SoundId, after = 0, pitch = 1): Cue => ({ after, sound, pitch })

/** What a finger at `at` lands on, in the frame that is on screen. Everything is tested where it is drawn. */
/** A cover is touched where it is drawn: anywhere on the piece itself, where it rests. */
const onCover = (place: PlaceId, open: boolean, at: P): boolean => coverPieces(place, open).some((piece) => piece.discs.some((disc) => within(at, disc)))

export function targetAt(toy: Toy, at: P): Target {
  const thing = thingUnder(toy, at, GRAB)
  if (thing) return { kind: 'thing', thing }
  const toad = toadNow(toy)
  if (toad.room === toy.room && Math.hypot(at.x - toad.feet.x, at.y - (toad.feet.y - TOAD_RISE)) <= TOAD_REACH) return { kind: 'toad' }
  if (toy.room) {
    if (within(at, BOWL)) return { kind: 'bowl' }
    if (within(at, ROOM_DOOR)) return { kind: 'door' }
    return { kind: 'wood' }
  }
  if (within(at, HEDGEHOG)) return { kind: 'hedgehog' }
  const jay = jayBody(toy)
  if (Math.hypot(at.x - jay.x, at.y - jay.y) <= JAY.r) return { kind: 'jay' }
  if (within(at, NEST)) return { kind: 'nest' }
  if (within(at, WHEEL)) return { kind: 'wheel' }
  if (within(at, DOOR)) return { kind: 'door' }
  for (const place of PLACES) {
    const spots = SPOTS[place]
    if (toy.covers[place].open) {
      // What is under it first, then the cover where it rests open, then the rest of the hollow.
      if (within(at, spots.find)) return { kind: 'find', place }
      if (spots.away.some((spot) => within(at, spot)) || onCover(place, true, at)) return { kind: 'cover', place }
      if (within(at, spots.shut)) return { kind: 'find', place }
    } else if (within(at, spots.shut) || onCover(place, false, at)) return { kind: 'cover', place }
  }
  // The open water of the puddle, beside the leaf and whatever lies in it.
  if (inPuddle(at)) return { kind: 'water' }
  return { kind: 'wood' }
}

// --- Scenes ---------------------------------------------------------------------------------

/** Starts a short scene: its acts have begun and its outcome is in the model; a touch takes the acts away. */
function play(toy: Toy, kind: string, movers: readonly Mover[]): void {
  const length = Math.max(...movers.map((mover) => toy.acts[mover]?.length ?? 0))
  const scene = new Scene([...movers.map((mover) => ({ at: 0, lasts: toy.acts[mover]?.length ?? 0, play: (_progress: number, finishing: boolean) => { if (finishing) drop(toy, mover) } })), { at: length, lasts: 0, play: () => {} }])
  scene.start(toy.time, () => { toy.dirty = true })
  toy.scene = scene
  toy.sceneKind = kind
}

/** A touch ends the scene that is playing: every act of it is gone, so everything is where the save has it, and its sound stops now. */
export function finishScene(toy: Toy): void {
  let ended = false
  if (toy.scene) { ended = toy.scene.running; toy.scene.finish(); toy.scene = null; toy.sceneKind = '' }
  for (const mover of Object.keys(toy.acts) as Mover[]) if (toy.acts[mover]!.scene) { ended = ended || moving(toy, mover); drop(toy, mover) }
  if (ended) toy.cut.scene = true
}

// --- The covers --------------------------------------------------------------------------------

/** The stone lands at the end of its roll, either way, and the lid of the log claps down. */
function landing(place: PlaceId, open: boolean): Cue[] {
  const travel = open ? COVERS[place].open : COVERS[place].shut
  if (place === 'stone') return [one('stoneLand', travel, open ? 1 : 0.86)]
  if (place === 'log' && !open) return [one('logClap', travel)]
  return []
}

function setCover(toy: Toy, place: PlaceId, open: boolean, scene = false): void {
  const cover = toy.covers[place], motion = COVERS[place]
  const from = amount(toy, place)
  // What is under it is of the season as long as nobody can see it change.
  if (open && from < 0.15) cover.shows = toy.season
  cover.from = Math.min(1, Math.max(0, from))
  cover.open = open
  cover.greeted = !open
  const travel = open ? motion.open : motion.shut
  // Shut by the turning year, the wheel's clacks are the sound of the turn: the cover adds only its landing.
  begin(toy, `cover:${place}`, open ? 'open' : 'shut', travel + motion.settles, { cues: scene ? landing(place, open) : [one(open ? OPEN_SOUND[place] : SHUT_SOUND[place]), ...landing(place, open)], scene })
  toy.dirty = true
  nudge(toy)
}

/** Where the worm comes out to when the cover its head was under is opened: onto the path beside it. */
const BARED = { stone: { x: 470, y: 706 }, grass: { x: 500, y: 640 } } as const

/**
 * Where a cover has come to rest on a thing, or the toad has sat down on one, the thing is moved clear to the
 * nearest free ground. And the worm whose head was tucked under a cover that now stands open comes out from
 * where the cover was, onto the path.
 */
function nudge(toy: Toy): void {
  for (const thing of THINGS) {
    const where = toy.things[thing]
    if (where.at !== 'path') continue
    const bared = thing === 'worm' ? (['stone', 'grass'] as const).find((place) => toy.covers[place].open && near(TUCKS[place], where) < 0.5) : undefined
    if (!bared && clearAt(toy, where, thing)) continue
    const to = freeSpot(toy, bared ? BARED[bared] : where, thing)
    toy.things[thing] = { at: 'path', x: to.x, y: to.y }
    begin(toy, `thing:${thing}`, 'set', 0.4, { from: where, to, room: false })
    toy.dirty = true
    // Its cover is opened over it: the worm has come into the open, and the hedgehog unrolls for it.
    if (bared) wormShows(toy)
  }
}

/**
 * The worm has come into the open or has wriggled: the hedgehog unrolls for it, or snuffles its way. While the
 * child is in the room he is not seen: he is unrolled when the child comes out, and nothing is heard.
 */
function wormShows(toy: Toy): void {
  if (toy.room) { if (toy.rolled) { toy.rolled = false; toy.dirty = true } return }
  if (toy.rolled) {
    toy.rolled = false
    toy.dirty = true
    begin(toy, 'hedgehog', 'unroll', SOUNDS.hogUnroll.rides, { cues: [one('hogUnroll')], room: false })
  } else if (!moving(toy, 'hedgehog')) {
    begin(toy, 'hedgehog', 'sniff', SOUNDS.hogSniff.rides, { cues: [one('hogSniff')], room: false })
  }
}

/** What shines catches the jay's eye when it is touched or uncovered. */
function glints(toy: Toy): void {
  if (!toy.room && !moving(toy, 'jay')) begin(toy, 'jay', 'ooh', SOUNDS.jayOoh.rides, { cues: [one('jayOoh')] })
}

/**
 * A knock on wood: one of three pitches, a ring, a puff of sawdust, and a chip of wood that hops up from under the
 * finger. The hanging piece nearest the knock swings when it hangs near enough; in the room that piece is the lamp.
 */
function knock(toy: Toy, at: P): void {
  let nearest = -1, best: number = KNOCK_REACH
  HANGERS.forEach((hanger, index) => { const far = near(hanger, at); if (far < best) { best = far; nearest = index } })
  toy.knock = { at: { x: at.x, y: at.y }, since: toy.time, hanger: toy.room ? HANGERS.length : nearest }
  begin(toy, 'knock', 'knock', SOUNDS.knock.rides, { cues: [one('knock', 0, pick(toy.rng, [0.88, 1, 1.14]))] })
}

// --- A touch --------------------------------------------------------------------------------

/** Whatever an animal was doing with a thing stops when the thing is taken from it. */
function untie(toy: Toy, thing: ThingId): void {
  for (const who of ['hedgehog', 'jay', 'toad', 'slab'] as const) if (toy.acts[who]?.kind.endsWith(`:${thing}`)) drop(toy, who)
  if (thing === 'snail') { toy.perch.snail = false; toy.trail = null; if (toy.acts['cover:puddle']?.kind === 'ferry') drop(toy, 'cover:puddle') }
  if (thing === 'feather') toy.perch.feather = false
}

/** The finger lands. Whatever it lands on answers now, on this moment of the clock. Returns what it landed on. */
export function press(toy: Toy, at: P): Target {
  // A slide between the wood and the room is a scene, so it ends here too: the view arrives at once under a new
  // touch, the touch lands on what is seen, and a thing that hangs where it was let go is set down in the frame at rest.
  finishScene(toy)
  const hand = toy.hand
  if (hand) {
    // A thing hangs where it was let go for a moment: a finger landing on it again carries on.
    if (!hand.down && near(at, hand.at) <= REGRAB) {
      hand.down = true
      hand.grab = { x: hand.at.x - at.x, y: hand.at.y - at.y }
      return { kind: 'regrab' }
    }
    // A finger that lands anywhere else sets it down first, where it was let go.
    if (!hand.down) letGo(toy)
    else return { kind: 'wood' }
  }
  const target = targetAt(toy, at)
  lookAt(toy, at)
  switch (target.kind) {
    case 'thing':
      touchThing(toy, target.thing, at)
      break
    case 'cover': {
      const cover = toy.covers[target.place], act = toy.acts[`cover:${target.place}`]
      if (act && toy.time - act.since < SAME_TAP && (act.kind === 'open' || act.kind === 'shut')) { knock(toy, at); break }
      setCover(toy, target.place, !cover.open)
      break
    }
    case 'find': {
      // Still coming up from under its cover: this touch is part of the one that opened it, and is a knock.
      if (!toy.covers[target.place].greeted) { knock(toy, at); break }
      const who = dwellerAt(toy, target.place)
      if (who === 'woodlouse') begin(toy, `find:${target.place}`, 'act', LOUSE.length, { cues: [one('louse')] })
      else if (toy.things[who as ThingId]?.at === 'home') touchThing(toy, who as ThingId, at)
      else begin(toy, `find:${target.place}`, 'act', MANNERS[who].length, { cues: [one(who)] })
      break
    }
    case 'hedgehog':
      if (toy.rolled) {
        // Poked again he is put out, not afraid: a huff, and the ball turns its back.
        begin(toy, 'hedgehog', 'huff', SOUNDS.hogHuff.rides, { cues: [one('hogHuff')] })
      } else {
        toy.rolled = true
        toy.dirty = true
        begin(toy, 'hedgehog', 'roll', SOUNDS.hogRoll.rides, { cues: [one('hogRoll')] })
      }
      break
    case 'jay':
      begin(toy, 'jay', 'ruffle', SOUNDS.jayScold.rides, { cues: [one('jayScold')] })
      break
    case 'toad':
      touchToad(toy)
      break
    case 'nest':
      tipNest(toy)
      break
    case 'wheel':
      turnYear(toy)
      break
    case 'door':
      if (toy.room) goOut(toy)
      else comeHome(toy)
      break
    case 'bowl':
      begin(toy, 'water', 'splash', 0.6, { to: BOWL_SLOT, cues: [one('bowlTap')] })
      break
    case 'water':
      // The open water of the puddle: rings where the finger is, and a plip.
      begin(toy, 'water', 'splash', SOUNDS.puddleTap.rides, { to: { x: at.x, y: at.y - 8 }, cues: [one('puddleTap')], room: false })
      break
    case 'wood':
      knock(toy, at)
      break
    case 'regrab':
      break
  }
  return target
}

/** A thing is touched where it lies: it does its own act at once, and it is in the hand from now, to be carried if the finger moves. */
function touchThing(toy: Toy, thing: ThingId, at: P): void {
  const where = drawn(toy, thing)
  if (!where) return
  untie(toy, thing)
  const rest = restOf(toy, thing) ?? where.at, cell = TOUCHED[thing]
  begin(toy, `thing:${thing}`, `touched:${thing}`, cell.length, { from: rest, to: rest, cues: cell.cues, room: toy.room })
  toy.hand = { thing, at: { x: where.at.x, y: where.at.y }, grab: { x: where.at.x - at.x, y: where.at.y - at.y }, since: toy.time, down: true, letGoAt: NEVER, carried: false }
  if (!toy.room && thing === 'worm') wormShows(toy)
  if (thing === 'button') glints(toy)
}

/** The finger moves with a thing under it: the thing is carried. */
export function carry(toy: Toy, at: P): void {
  const hand = toy.hand
  if (!hand || !hand.down) return
  if (!hand.carried) {
    hand.carried = true
    toy.carried = true
    untie(toy, hand.thing)
    // It comes up off where it lay: off the hedgehog's spines with a pop.
    const worn = toy.things[hand.thing].at === 'hedgehog'
    begin(toy, `thing:${hand.thing}`, 'lift', 0.2, { cues: [one(worn ? 'applePop' : 'pick')], room: toy.room })
    if (worn) begin(toy, 'hedgehog', 'pulled', 0.5, { room: false })
  }
  hand.at = { x: at.x + hand.grab.x, y: at.y + hand.grab.y }
  // Carried onto the door of the room, it goes out in the hand: the view slides to the wood under the carry.
  if (toy.room && within(hand.at, ROOM_DOOR)) goOut(toy)
}

/** The finger lifts. A thing that was only touched stays where it lay; a thing that was carried hangs where it was let go. */
export function release(toy: Toy): void {
  const hand = toy.hand
  if (!hand || !hand.down) return
  if (!hand.carried) { toy.hand = null; return }
  hand.down = false
  hand.letGoAt = toy.time
}

/** The finger was taken away, which is not the child letting go: the thing in the hand is back where it came from, and nothing else happens. */
export function cancel(toy: Toy): void {
  const hand = toy.hand
  if (!hand || !hand.down) return
  if (hand.carried) drop(toy, `thing:${hand.thing}`)
  toy.hand = null
}

// --- Letting go ------------------------------------------------------------------------------

const inPuddle = (at: P): boolean => ((at.x - PUDDLE.x) / (PUDDLE.rx + 6)) ** 2 + ((at.y - PUDDLE.y) / (PUDDLE.ry + 6)) ** 2 <= 1

/** Where the toad sits when he has swapped places with a thing: where the thing came from. */
function cameFrom(toy: Toy, thing: ThingId, origin: Where): ToadAt {
  switch (origin.at) {
    case 'home': { const place = homeOf(toy, thing); return place ? { at: 'seat', place } : { at: 'foot' } }
    case 'puddle': return { at: 'seat', place: 'puddle' }
    case 'path': {
      if (FOOT_SPOTS.some((spot) => near(spot, origin) < 0.5)) return { at: 'foot' }
      const feet = toadFeetFor(origin)
      return { at: 'path', x: feet.x, y: feet.y }
    }
    case 'hedgehog': { const feet = toadFeetFor(NOSE); return { at: 'path', x: feet.x, y: feet.y } }
    case 'table': { const feet = toadOnTable(origin); return { at: 'table', x: feet.x, y: feet.y } }
    case 'bowl': { const feet = toadOnTable(freeTable(toy, BOWL_BANK, thing) ?? BOWL_BANK); return { at: 'table', x: feet.x, y: feet.y } }
    default: return { at: 'foot' }
  }
}

/** The thing in the hand is set down where it was let go, and whatever is there answers it. */
export function letGo(toy: Toy): void {
  const hand = toy.hand
  if (!hand) return
  toy.hand = null
  if (!hand.carried) return
  const thing = hand.thing, at = hand.at, origin = toy.things[thing]
  const hollow = origin.at === 'home' ? homeOf(toy, thing) : null
  // Let go again at once, or hardly moved: a slipped tap, not a carry to somewhere new.
  const lay = restOf(toy, thing)
  const slipped = origin.at === 'path' && lay !== null && (hand.letGoAt - hand.since < SLIP_TIME || near(at, lay) < SLIP_REACH)
  drop(toy, `thing:${thing}`)
  lookAt(toy, at)
  toy.dirty = true
  setDown(toy, thing, at, origin, slipped)
  // Carried off from under its cover: a woodlouse has moved in there instead, and comes up to be seen.
  if (hollow && toy.things[thing].at !== 'home' && toy.covers[hollow].open) begin(toy, `find:${hollow}`, 'hello', HELLO, { room: false })
}

function setDown(toy: Toy, thing: ThingId, at: P, origin: Where, slipped: boolean): void {
  // Out of the water it is wet, wherever it goes next but back in.
  const fromWater = origin.at === 'puddle' || origin.at === 'bowl'
  if (toy.room) {
    if (within(at, BOWL)) return intoWater(toy, thing, at, 'bowl')
    if (fromWater) setWet(toy, thing, true)
    return ontoTable(toy, thing, onTable(at), at)
  }
  // A thing that lay on open ground and slipped under the finger stays where it lay, whatever stands where the
  // finger left it: nothing else comes of it. The jay takes only what a carry sets down, and the hedgehog answers only that.
  if (slipped) { begin(toy, `thing:${thing}`, 'set', 0.4, { from: at, to: origin as P, cues: [one('setDown')], room: false }); return }
  if (inPuddle(at)) return intoWater(toy, thing, at, 'puddle')
  if (fromWater) setWet(toy, thing, true)
  if (within(at, DOOR)) return sendIn(toy, thing, at)
  if (within(at, HEDGEHOG) || near(at, NOSE) <= NOSE_REACH) return beforeHog(toy, thing, at)
  const toad = toadNow(toy)
  if (near(at, STONE_SPOT) <= 64 || (toy.toadAt.at === 'stone' && Math.hypot(at.x - toad.feet.x, at.y - (toad.feet.y - TOAD_RISE)) <= TOAD_REACH)) {
    if (origin.at === 'stone' || !THINGS.some((other) => other !== thing && toy.things[other].at === 'stone')) return ontoStone(toy, thing, at, origin)
  }
  for (const place of PLACES) if (toy.covers[place].open && findAt(toy, place) === thing && within(at, SPOTS[place].shut)) return backHome(toy, thing, at, place, origin.at !== 'home')
  onGround(toy, thing, at)
}

function lie(toy: Toy, thing: ThingId, from: P, where: Where, to: P): void {
  toy.things[thing] = where
  begin(toy, `thing:${thing}`, 'set', 0.45, { from, to, cues: [one('setDown')] })
}

function sendIn(toy: Toy, thing: ThingId, at: P): void {
  const spot = edgeSpot(toy, thing)
  // No room at the table at all: it stays by the step.
  if (!spot) { const by = settleAt(toy, STEP, thing); if (thing === 'worm') wormShows(toy); return lie(toy, thing, at, { at: 'path', x: by.x, y: by.y }, by) }
  toy.things[thing] = { at: 'table', x: spot.x, y: spot.y }
  toy.arrivals = [...toy.arrivals.filter((other) => other !== thing), thing]
  // It sails in through the door and lands on the table that shows through it, where it stays in sight.
  begin(toy, `thing:${thing}`, 'sent', SOUNDS.sentIn.rides, { from: at, to: miniSpot(toy, thing) ?? wayOut(false), cues: [one('sentIn')], room: false })
}

function beforeHog(toy: Toy, thing: ThingId, at: P): void {
  const spot = settleAt(toy, NOSE, thing), lying: Where = { at: 'path', x: spot.x, y: spot.y }
  if (thing === 'worm') {
    // The hedgehog and the worm: he unrolls if he is a ball, snuffles, the worm dives, and he stares at the hole.
    const unroll = toy.rolled ? SOUNDS.hogUnroll.rides : 0
    toy.rolled = false
    toy.things.worm = { at: 'home' }
    setWet(toy, 'worm', false)
    begin(toy, 'thing:worm', 'hog:worm', unroll + 1.9, { from: at, to: spot, n: unroll, scene: true })
    begin(toy, 'hedgehog', 'hog:worm', unroll + BEFORE_HOG.worm.length, { n: unroll, to: spot, scene: true, cues: [...(unroll > 0 ? [one('hogUnroll')] : []), one('hogSniff', unroll + 0.1), one('wormDive', unroll + 1.4), one('hogHm', unroll + 3.4)] })
    return play(toy, 'hedgehog', ['thing:worm', 'hedgehog'])
  }
  const cell = toy.rolled ? ON_BALL[thing] : BEFORE_HOG[thing], kind = `${toy.rolled ? 'ball' : 'hog'}:${thing}`
  let to = spot
  toy.things[thing] = lying
  if (thing === 'apple') { toy.things.apple = { at: 'hedgehog' }; to = ON_SPINES }
  if (toy.rolled && thing === 'snail') { toy.perch.snail = true; to = BALL_TOP }
  if (toy.rolled && thing === 'feather') { toy.perch.feather = true; to = SPINE }
  begin(toy, `thing:${thing}`, kind, cell.length, { from: at, to, cues: cell.cues })
  begin(toy, 'hedgehog', kind, cell.length)
}

function ontoStone(toy: Toy, thing: ThingId, at: P, origin: Where): void {
  // Lifted from the stone and set back on it: nobody moves.
  // The worm has come into the open: the hedgehog unrolls for it, here as anywhere in the wood.
  if (thing === 'worm') wormShows(toy)
  if (origin.at === 'stone' || toy.toadAt.at !== 'stone') return lie(toy, thing, at, { at: 'stone' }, STONE_SPOT)
  // The toad's swap: the thing has the stone, and he sits where the thing came from.
  const cell = ON_STONE[thing], heavy = thing === 'apple', land = heavy ? 1.5 : 2.6
  const to = cameFrom(toy, thing, origin)
  toy.things[thing] = { at: 'stone' }
  toy.toadAt = to
  const rest = toadRest(toy)
  if (rest.room) {
    // Whatever lay where he lands on the table moves along to the nearest free point of it, or with none, out to the step.
    for (const other of THINGS) {
      const where = toy.things[other]
      if (where.at !== 'table' || !underToad(toy, where)) continue
      const free = freeTable(toy, where, other)
      if (free) { toy.things[other] = { at: 'table', x: free.x, y: free.y }; continue }
      const by = settleAt(toy, STEP, other)
      toy.things[other] = { at: 'path', x: by.x, y: by.y }
      if (other === 'worm') wormShows(toy)
    }
  }
  const seen = !rest.room
  begin(toy, 'toad', `stone:${thing}`, cell.length, { from: TOAD_HOME, to: seen ? rest.feet : wayOut(false), scene: true, room: false, cues: [...(heavy ? [] : [one('toadLeap', 1.7)]), ...(seen ? [one('toadLand', land), one('toadOnce', land + 0.5)] : [])] })
  begin(toy, `thing:${thing}`, `stone:${thing}`, cell.length, { from: at, to: STONE_SPOT, cues: cell.cues, scene: true })
  if (heavy) begin(toy, 'slab', 'stone:apple', 1.9, { scene: true })
  nudge(toy)
  play(toy, 'toad', heavy ? ['toad', `thing:${thing}`, 'slab'] : ['toad', `thing:${thing}`])
}

function intoWater(toy: Toy, thing: ThingId, at: P, water: 'puddle' | 'bowl'): void {
  const room = water === 'bowl', slot = room ? BOWL_SLOT : PUDDLE_SLOT
  // One thing lies in the water at a time.
  if (THINGS.some((other) => other !== thing && toy.things[other].at === water)) {
    if (toy.things[thing].at === 'puddle' || toy.things[thing].at === 'bowl') setWet(toy, thing, true)
    return room ? rollOff(toy, thing, at) : onGround(toy, thing, at)
  }
  const cell = IN_WATER[thing]
  let to = slot
  toy.things[thing] = { at: water }
  if (thing === 'worm') {
    // It swims across and climbs out, wet, by itself.
    const bank = room ? freeTable(toy, BOWL_BANK, thing) : settleAt(toy, FAR_BANK, thing)
    if (bank) { to = bank; toy.things.worm = room ? { at: 'table', x: bank.x, y: bank.y } : { at: 'path', x: bank.x, y: bank.y }; setWet(toy, 'worm', true) }
    // It climbs out into the open, and the hedgehog unrolls for it.
    if (!room) wormShows(toy)
  }
  begin(toy, `thing:${thing}`, `water:${thing}`, cell.length, { from: at, to, cues: cell.cues })
  begin(toy, 'water', 'splash', 1, { to: slot })
  if (room) return
  // The snail climbs onto the leaf, which sails a slow circle with it and keeps it (things.ts), the jay comes to look at the button, and the apple splashes the toad.
  if (thing === 'snail') begin(toy, 'cover:puddle', 'ferry', cell.length)
  if (thing === 'button') begin(toy, 'jay', 'water:button', SOUNDS.jayPuddle.rides, { cues: [one('jayPuddle')] })
  if (thing === 'apple' && toy.toadAt.at === 'stone') begin(toy, 'toad', 'water:apple', cell.length)
}

function backHome(toy: Toy, thing: ThingId, at: P, place: PlaceId, wasAway: boolean): void {
  toy.things[thing] = { at: 'home' }
  setWet(toy, thing, false)
  begin(toy, `thing:${thing}`, 'home', 0.45, { from: at, to: SPOTS[place].find, cues: [one('setDown')] })
  // The woodlouse that had moved in trundles out of sight. A thing lifted from its hollow and set straight back never left: no woodlouse moved in.
  if (wasAway) begin(toy, `find:${place}`, 'louseOut', SOUNDS.louseOut.rides, { cues: [one('louseOut')] })
}

function onGround(toy: Toy, thing: ThingId, at: P): void {
  const spot = freeSpot(toy, at, thing)
  if (thing === 'button' || isWet(toy, thing)) return theft(toy, thing, spot)
  if (thing === 'worm') wormShows(toy)
  // At the foot of the jay's tree a dull thing lies where it was let go.
  if (stretchOf(spot) !== 0) return lie(toy, thing, at, { at: 'path', x: spot.x, y: spot.y }, spot)
  const box = GROUND[0], along = (dx: number): P => ({ x: Math.min(box.x1, Math.max(box.x0, spot.x + dx)), y: spot.y })
  const tuck = TUCKS[tuckFor(toy)]
  const goal: Record<Exclude<ThingId, 'button'>, P> = { worm: tuck, snail: along(spot.x < 420 ? 80 : -80), feather: along(spot.x < 420 ? 96 : -96), acorn: DIP, apple: LOG_FOOT }
  const cell = ON_PATH[thing]
  toy.things[thing] = { at: 'path', x: spot.x, y: spot.y }
  const to = thing === 'snail' || thing === 'feather' ? freeSpot(toy, goal[thing], thing) : settleAt(toy, goal[thing], thing)
  toy.things[thing] = { at: 'path', x: to.x, y: to.y }
  // The worm ends turned as its tuck asks: `n` is that turn, and 0 where the tuck was taken and it lies in the open.
  begin(toy, `thing:${thing}`, `path:${thing}`, cell.length, { from: spot, to, cues: cell.cues, n: thing === 'worm' && near(to, tuck) < 0.5 ? tuck.turn : 0 })
  begin(toy, 'jay', `path:${thing}`, cell.length, { from: spot, to: thing === 'snail' ? { x: (spot.x + to.x) / 2, y: spot.y } : to })
  if (thing === 'snail') toy.trail = { from: spot, to, since: toy.time }
}

/** The jay's theft: the thing is in his nest from now, and dry; only the wet apple is too heavy and stays, a hand's width off. */
function theft(toy: Toy, thing: ThingId, spot: P): void {
  const cell = STOLEN[thing]
  if (thing === 'apple') {
    toy.things.apple = { at: 'path', x: spot.x, y: spot.y }
    const to = dragged(toy, spot)
    toy.things.apple = { at: 'path', x: to.x, y: to.y }
    begin(toy, 'thing:apple', 'steal:apple', cell.length, { from: spot, to, cues: cell.cues, scene: true })
    begin(toy, 'jay', 'steal:apple', cell.length, { from: spot, to, scene: true })
  } else {
    toy.things[thing] = { at: 'nest' }
    setWet(toy, thing, false)
    begin(toy, `thing:${thing}`, `steal:${thing}`, cell.length, { from: spot, to: restOf(toy, thing) ?? NEST_SLOTS[0], cues: cell.cues, scene: true })
    begin(toy, 'jay', `steal:${thing}`, cell.length, { from: spot, to: spot, scene: true })
  }
  play(toy, 'jay', [`thing:${thing}`, 'jay'])
}

/** A hand's width, which is how far the jay drags the wet apple. */
export const DRAG = 70

/**
 * Where the wet apple lies when the jay has dragged it: a hand's width toward his tree, or, where the open ground
 * ends or is taken that way, a hand's width along it, as near that way as there is free ground.
 */
function dragged(toy: Toy, spot: P): P {
  const far = Math.hypot(JAY.x - spot.x, JAY.y + 240 - spot.y) || 1, wx = (JAY.x - spot.x) / far, wy = (JAY.y + 240 - spot.y) / far
  let best: P | null = null, most = -Infinity
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2, dx = Math.cos(angle), dy = Math.sin(angle)
    const to = { x: spot.x + dx * DRAG, y: spot.y + dy * DRAG }
    if (!GROUND.some((box) => to.x >= box.x0 && to.x <= box.x1 && to.y >= box.y0 && to.y <= box.y1) || !clearAt(toy, to, 'apple')) continue
    const toward = dx * wx + dy * wy
    if (toward > most) { most = toward; best = to }
  }
  return best ?? freeSpot(toy, { x: spot.x + wx * DRAG, y: spot.y + wy * DRAG }, 'apple')
}

// --- The table ----------------------------------------------------------------------------------

function rollOff(toy: Toy, thing: ThingId, at: P): void {
  const by = settleAt(toy, STEP, thing)
  toy.things[thing] = { at: 'path', x: by.x, y: by.y }
  if (thing === 'worm') wormShows(toy)
  begin(toy, `thing:${thing}`, 'rolloff', SOUNDS.rollOff.rides, { from: at, cues: [one('rollOff')], room: true })
}

function ontoTable(toy: Toy, thing: ThingId, at: P, from: P): void {
  if (underToad(toy, at)) return rollOff(toy, thing, from)
  let partner: ThingId | null = null, nearest: number = PAIR_REACH
  for (const other of THINGS) {
    const where = toy.things[other]
    if (other === thing || where.at !== 'table') continue
    const far = near(where, at)
    if (far <= nearest) { nearest = far; partner = other }
  }
  if (!partner) return lie(toy, thing, from, { at: 'table', x: at.x, y: at.y }, at)
  // No room: the other is one of a pair already.
  toy.things[thing] = { at: 'home' }
  if (coupleOf(toy, partner)) { toy.things[thing] = { at: 'table', x: at.x, y: at.y }; return rollOff(toy, thing, from) }
  const beside = toy.things[partner] as { at: 'table'; x: number; y: number }, first = at.x >= beside.x ? 1 : -1
  const fits = (way: number): P | null => {
    const spot = { x: beside.x + way * PAIR_GAP, y: beside.y }
    if (spot.x < TABLE.x0 || spot.x > TABLE.x1 || underToad(toy, spot)) return null
    for (const other of THINGS) { const where = toy.things[other]; if (other !== thing && other !== partner && where.at === 'table' && near(where, spot) <= PAIR_REACH + 2) return null }
    return spot
  }
  const spot = fits(first) ?? fits(-first)
  if (!spot) { toy.things[thing] = { at: 'table', x: at.x, y: at.y }; return rollOff(toy, thing, from) }
  toy.things[thing] = { at: 'table', x: spot.x, y: spot.y }
  together(toy, thing, partner)
}

/** How far into the act of the snail and the apple the first rasp bites. */
export const FIRST_RASP = 0.5

/** Two things set together on the table do what the two of them do. */
function together(toy: Toy, set: ThingId, partner: ThingId): void {
  const pair = pairOf(set, partner), [first, second] = THINGS.indexOf(set) < THINGS.indexOf(partner) ? [set, partner] : [partner, set]
  const cell = PAIRED[pair], a = restOf(toy, first)!, b = restOf(toy, second)!, side = b.x >= a.x ? 1 : -1
  const ends: Record<string, P> = { [first]: a, [second]: b }
  const cues: Cue[] = [...cell.cues]
  // The hole is the snail's from now, and it shows with the first rasp.
  if (pair === 'snail+apple' && !toy.bitten) { toy.bitten = true; toy.biteAt = toy.time + FIRST_RASP }
  // The feather wipes a wet thing dry.
  if (first === 'feather' || second === 'feather') {
    const other = first === 'feather' ? second : first
    if (isWet(toy, other)) { setWet(toy, other, false); cues.push(one('wipe', 0.05)) }
  }
  if (pair === 'snail+feather') {
    // They glide a hand's width together, where there is room for it.
    for (const way of [1, -1]) {
      const moved = { a: { x: a.x + way * SAIL, y: a.y }, b: { x: b.x + way * SAIL, y: b.y } }
      if ([moved.a, moved.b].some((spot) => spot.x < TABLE.x0 || spot.x > TABLE.x1 || underToad(toy, spot))) continue
      if (THINGS.some((other) => other !== first && other !== second && toy.things[other].at === 'table' && (near(toy.things[other] as P, moved.a) <= PAIR_REACH + 2 || near(toy.things[other] as P, moved.b) <= PAIR_REACH + 2))) continue
      toy.things[first] = { at: 'table', ...moved.a }
      toy.things[second] = { at: 'table', ...moved.b }
      ends[first] = moved.a; ends[second] = moved.b
      break
    }
  }
  if (pair === 'button+apple') {
    // The button is flicked into the bowl, or, with the bowl full, to the nearest free point of the table by it.
    if (!THINGS.some((other) => toy.things[other].at === 'bowl')) { toy.things.button = { at: 'bowl' }; ends.button = BOWL_SLOT }
    else { const free = freeTable(toy, BOWL_BANK, 'button'); if (free) { toy.things.button = { at: 'table', x: free.x, y: free.y }; ends.button = free } }
  }
  for (const thing of [first, second]) begin(toy, `thing:${thing}`, `pair:${pair}`, cell.length, { from: thing === first ? a : b, to: ends[thing], n: side, cues: thing === first ? cues : [], room: true })
}

// --- The animals, the nest, the wheel, the door ---------------------------------------------------

function touchToad(toy: Toy): void {
  const rest = toadRest(toy)
  if (toy.toadAt.at === 'stone') {
    // He blows up his throat, lets it out as he hops, and lands: three moments of one motion.
    begin(toy, 'toad', 'croak', 1.3, { cues: [one('toadPuff'), one('toadCroak', 0.5), one('toadLand', 1)], room: false })
    return
  }
  // One tap sends him back to his stone.
  toy.toadAt = { at: 'stone' }
  toy.dirty = true
  if (rest.room) begin(toy, 'toad', 'home', 0.9, { from: rest.feet, to: wayOut(true), room: true, cues: [one('toadLeap', 0.1)] })
  else begin(toy, 'toad', 'home', 1.3, { from: rest.feet, to: TOAD_HOME, room: false, cues: [one('toadLeap', 0.1), one('toadLand', 0.9)] })
}

function tipNest(toy: Toy): void {
  const inside = THINGS.filter((thing) => toy.things[thing].at === 'nest')
  if (inside.length === 0) { begin(toy, 'nest', 'rustle', SOUNDS.nestRustle.rides, { cues: [one('nestRustle')] }); return }
  // One tap tips everything in it out at the foot of his tree, each on a spot nothing is on.
  const slots = inside.map((thing) => restOf(toy, thing)!)
  inside.forEach((thing, index) => {
    const spot = FOOT_SPOTS.find((foot) => clearAt(toy, foot, thing)) ?? freeSpot(toy, FOOT_SPOTS[0], thing)
    toy.things[thing] = { at: 'path', x: spot.x, y: spot.y }
    const wait = index * 0.15
    begin(toy, `thing:${thing}`, 'tip', wait + 0.9, { from: slots[index], to: spot, n: wait, cues: [one('tipLand', wait + 0.6, 1 + index * 0.07)], room: false })
  })
  toy.dirty = true
  // Tipped out with the rest, the worm has come into the open.
  if (inside.includes('worm')) wormShows(toy)
  begin(toy, 'nest', 'tip', SOUNDS.nestTip.rides, { cues: [one('nestTip')] })
  begin(toy, 'jay', 'tipped', 0.9)
}

/** The turn of the year: the season is the next from now, the open covers are shut, and the scene shows it. */
function turnYear(toy: Toy): void {
  toy.turnedFrom = toy.season
  toy.season = nextSeason(toy.season)
  const movers: Mover[] = ['wheel']
  begin(toy, 'wheel', 'turn', TURN.length, { scene: true, cues: [...TURN.clacks.map((after, index) => one('clack', after, 1 + index * 0.06)), one('wheelStop', TURN.stop)] })
  for (const place of PLACES) {
    if (!toy.covers[place].open) continue
    setCover(toy, place, false, true)
    toy.covers[place].greeted = true
    movers.push(`cover:${place}`)
  }
  play(toy, 'year', movers)
}

/**
 * Through the door: whatever was still moving in the frame that is left is at its end from now, where the save has
 * it, and its sound stops, so nothing is heard that is not seen. The thing in the hand goes with the hand.
 */
function leave(toy: Toy, room: boolean): void {
  let cut = false
  for (const mover of Object.keys(toy.acts) as Mover[]) {
    const act = toy.acts[mover]!
    if (mover === 'view' || act.room !== room || (toy.hand && mover === `thing:${toy.hand.thing}`)) continue
    cut = cut || moving(toy, mover)
    drop(toy, mover)
  }
  // What was coming up from under a cover has come up.
  if (!room) for (const place of PLACES) if (toy.covers[place].open) toy.covers[place].greeted = true
  if (cut) toy.cut.all = true
}

/**
 * Coming home: the room is on screen from now. With things sent in through the door on this walk it is the scene:
 * they rock once where they landed. With none it is only the way in, as the way out is only the way out.
 */
function comeHome(toy: Toy): void {
  leave(toy, false)
  toy.room = true
  toy.roomSeen = true
  toy.dirty = true
  const movers: Mover[] = ['view']
  begin(toy, 'view', 'in', SOUNDS.comeHome.rides, { scene: true, cues: [one('comeHome')], room: true })
  const landed = toy.arrivals.filter((thing) => toy.things[thing].at === 'table')
  toy.arrivals = []
  if (landed.length === 0) return
  landed.forEach((thing, index) => {
    const wait = 1.6 + index * 0.3, at = restOf(toy, thing)!
    begin(toy, `thing:${thing}`, 'rock', wait + 0.6, { from: at, to: at, n: wait, scene: true, room: true, cues: [one('rockHome', wait, 1 + index * 0.08)] })
    movers.push(`thing:${thing}`)
  })
  play(toy, 'home', movers)
}

/** Back out to the wood, as it was left. It is not a scene: the touch is the whole restart. */
function goOut(toy: Toy): void {
  leave(toy, true)
  toy.room = false
  toy.dirty = true
  // A new touch takes the slide away with its sound, as it does a scene's.
  begin(toy, 'view', 'out', SOUNDS.goOut.rides, { scene: true, cues: [one('goOut')], room: false })
}
