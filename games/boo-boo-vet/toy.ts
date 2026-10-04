// The game as it runs, and the toy it grew from. The finger takes a care
// thing and the thing goes onto the animal (ART.md, "The toy"); the animal has
// a need, the thing fits it or does not, and what happens next is the grid's
// cell (cells.ts), the well scene, the coming in of the next one (scenes.ts,
// clinic.ts). With `visitors` the animals need nothing and every give is play:
// that is the toy.
//
// This module holds what is in the hand, what is in the air, which cell,
// reaction or scene is playing and what the next one in does, on top of the
// saved room in clinic.ts. It answers a press in the call that reports it, so
// the answer starts when the finger lands, and a press ends a scene that is
// playing before it is answered.
//
// Pure: no renderer, no DOM, no clock. Time is game time in seconds, places
// are in the room's design units, and sounds are queued as plain notes for
// the Mount to play.

import { strokeTaste, taste, type Species, type Spot, type StrokeTaste, type Taste } from './cast'
import { cellCuesBetween, cellLasts, cellTrack, type CellTrack } from './cells'
import { comeIn, giveAtTheDoor, giveCare, join, markShown, putDown, stick, tableEnd, toShow, MOVABLES, type Clinic, type Movable, type ThingPlace } from './clinic'
import { pairOf, type Given } from './grid'
import { beatSeconds, fixed, lateness } from './motion'
import { MISCHIEF_SECONDS } from './mouse'
import type { Care, Need } from './needs'
import { isWell, showing as showingNeed } from './patient'
import { cuesBetween, goesUnder, lasts, reactionFor, wornAt, type Anchor, type Reaction, type ThingKey } from './reactions'
import { Scene } from './scene'
import { NO_ACT, WELL, secretBeats, showingBeats, wellBeats, type Act } from './scenes'
import { call, carrier as carrierVoice, cellVoice, clothRustle, drops, lamp as lampVoice, land, peel, rest, secret as secretVoice, showing as showingVoice, signVoice, squeak, steps, tap as knock, well as wellVoice, whoosh, type Notes } from './voices'

export type Vec = { x: number; y: number }

/** The named spots a thing can come to rest on, besides the cart and the animal. */
export type RestSpot = Extract<ThingPlace, 'table-left' | 'table-right' | 'floor-left' | 'floor-right'>
export const REST_SPOTS: readonly RestSpot[] = ['table-left', 'table-right', 'floor-left', 'floor-right']

/** A round place on an animal's drawing, from where it sits. */
export type Round = Vec & { r: number }
/**
 * One animal's size and the places on it, in design units from where it sits:
 * how far its drawing reaches to the left and the right, and where on the
 * drawing the spots are that it loves a stroke on or squirms at (cast.ts).
 */
export type Body = { w: number; h: number; left: number; right: number; anchors: Readonly<Record<Exclude<Anchor, 'seat'> | 'side', Vec>>; spots: Readonly<Partial<Record<Spot, readonly Round[]>>> }

/** The room's geometry, in design units: the view's layout hands it over. */
export type Room = {
  cart: Readonly<Record<Care, Vec>>
  spots: Readonly<Record<RestSpot, Vec>>
  /** Where the animal on the table sits, and where the one at the door sits. */
  patient: Vec
  waiting: Vec
  mouse: Vec
  lamp: Vec
  /** Where the carrier stands, and the hiding place: the floor under the table, in the dark. */
  carrier: Vec
  hide: Vec
  /** How big a thing's touch target is, and how big the mouse and the lamp are. */
  thing: { w: number; h: number }
  bodies: Readonly<Record<Species, Body>>
}

/** The thing in the hand. It trails the finger a little and swings. */
export type InHand = { care: Care; at: Vec; finger: Vec; swing: number; since: number; from: Vec; lifted: boolean }
/** A thing on its way to the animal. */
export type Flight = { care: Care; from: Vec; since: number; lasts: number }
/** The reaction playing on the table. `since` is negative while a heavy animal has not started to answer yet. */
export type Playing = { reaction: Reaction; since: number; /** A well animal's own scene with the thing it loves: a secret, which gives way to any touch. */ secret: boolean }
export type Stroking = { manner: 'loved' | 'squirms' | 'leans'; since: number; side: number; letGo: number }
/** The exchange at the door: one goes out, one comes in. */
export type Coming = { since: number; leaving: Species | null; arriving: Species; from: 'door' | 'carrier'; need: Need | null; first: boolean }
/** A cell of the grid playing on the animal. `since` is negative while a heavy animal has not started to answer yet. */
export type InCell = { track: CellTrack; since: number }
export type Drop = { at: Vec; v: Vec; since: number }
/** A thing sliding to rest: from where it was let go, starting `wait` seconds after `since` and taking `lasts`. */
export type Slide = { from: Vec; since: number; wait: number; lasts: number }
export const SLIDE_SECONDS = 0.3
/** How long the one at the door sniffs a thing before it noses it back, and how long the thing takes to slide back. */
export const NOSED = { sniff: 0.5, back: 0.6 } as const

/** How much of what changed must reach storage: nothing, at the throttle, or at once. */
export type SaveNeed = 0 | 1 | 2

export type Toy = {
  /** The animals need nothing and every give is play: the toy. */
  visitors: boolean
  clinic: Clinic
  t: number
  hand: InHand | null
  flights: Flight[]
  playing: Playing | null
  /** The cell of the grid that is playing, and the short scene, with what it shows at this moment. */
  cell: InCell | null
  scene: Scene | null
  act: Act
  /** True while a touch is ending the scene. */
  ending: boolean
  /**
   * The thing the mouse has still to show, and its showing while it plays. The showing is the mouse's own scene, on
   * the cart: it starts when the cart is in whatever the animal on the table is doing, so nothing can be in its way.
   * One that had not started when the game was put away is still owed, and starts at the first touch after that.
   */
  toShow: Care | null
  show: Scene | null
  /** When the one at the door and the carrier last answered a touch where they stand, the lamp was last dimmed, and the sign last sounded. */
  doorLooked: number
  carrierBlinked: number
  dimmedAt: number
  signSaid: number
  /** Until when a foam beard and fur on end are still to be seen: short-lived, never saved. */
  beardUntil: number
  furUntil: number
  /** When the last thing landed on the animal, for the rock of the sticker. */
  landedAt: number
  /** The plain reaction played last for each thing, so it is not played twice running. */
  lastPlain: Partial<Record<Care, string>>
  gives: number
  stroking: Stroking | null
  coming: Coming | null
  /**
   * Whether the animal on the table is in its hiding place under it, and when it last went there or came out by
   * itself. With two needs of which one is fear it changes place between them, and it is seen to go: down from the
   * table and under, or out and up. Never saved: the place follows from the needs.
   */
  hid: boolean
  hidAt: number
  /**
   * The moment after a care has helped an animal that has another need still: it plays with the thing that helped,
   * in the manner of its taste, as it does in the well scene, before the other need has it again.
   */
  aside: { taste: Taste; need: Need; since: number } | null
  /** The taste and the need of the helping cell that is playing, kept for that moment. */
  helped: { taste: Taste; need: Need } | null
  /** A thing on an animal with a need that the finger is pressing: a drag from here takes it off, a tap is a stroke. */
  offAnimal: { care: Care; from: Vec } | null
  /** How an animal with a need took the last stroke, by where on it the finger landed: its tastes hold with a need too. */
  touched: { manner: StrokeTaste; since: number; /** Where the finger landed, from where the animal sits. */ at: Vec } | null
  /** The finger is down on the animal and has not lifted: the one that shivers stays pressed to the warm hand for as long. */
  fingerOn: boolean
  /** The thing the mouse is straightening, back in its place on the cart. */
  tidied: { care: Care; since: number } | null
  /** Since when, and until when, something has been happening on the table for the one who waits to watch. */
  watchFrom: number
  watchUntil: number
  /** The one at the door with a thing it was handed: it takes it as play, in the manner of its taste, or sniffs it and noses it back. */
  doorPlay: { care: Care; since: number; manner: Taste | 'nosed' } | null
  /** Things on their way to where they lie: let go, or nosed back, each slides to rest from where it was. Never saved: the room already holds where it lies. */
  slides: Partial<Record<Care, Slide>>
  /** The thing the child put on the mouse, while the mouse answers it. It lies on the cart in the saved room from the start. */
  mousePlay: { care: Movable; since: number } | null
  /** When the mouse last ducked, the lamp was last knocked, and the bare room was last touched and where. */
  mouseDucked: number
  lampKnocked: number
  knock: { at: Vec; since: number } | null
  drops: Drop[]
  /** The order the idle glow goes through the things: the one given longest ago comes first. */
  wanted: Care[]
  sounds: Notes[]
  save: SaveNeed
}

export const FLIGHT_SECONDS = 0.28
export const COMING_SECONDS = 3.5
/** The moment in the exchange at which the newcomer sits down on the table. */
export const SEATED_AT = 1.8
const LONG_AGO = -100
/** The moment in the exchange at which the cart has rolled in with the new layout: the mouse's showing starts then. */
export const CART_IN_AT = 1.6
/** How long the animal takes to go from the table to its hiding place under it, or out of it and up again. */
export const SHIFT_SECONDS = 1
/** The beat of the hand's cell for the one that shivers at which its shaking has eased against the hand: held there while the finger stays. */
const WARM_AT = 2.4
/** The beats of the hand's cell for the one that hides between which it has crept out, and the beat from which it draws back in. */
const CREPT_AT = 1.5, BACK_AT = 3.4
/** How long after the lamp has dimmed for a rest it starts to come back. */
const LAMP_BACK = 3.4
/** How long an animal with a need shows how it took a stroke on one of its spots, before its need has it again. */
export const TOUCHED_SECONDS = 0.8
/** How long the mouse takes to straighten a thing that came back to the cart. */
export const TIDY_SECONDS = 0.7
const DROP_SECONDS = 0.7

/** The running model on top of a saved room. With `visitors` it is the toy. */
export function freshToy(clinic: Clinic, visitors = true): Toy {
  // A showing that had not started when the game was put away is still owed, since the room does not count the thing
  // as shown: `toShow` holds it, and it starts at the child's first touch (`press`). No scene plays before the child acts.
  const toy: Toy = {
    visitors, clinic, t: 0, hand: null, flights: [], playing: null, cell: null, scene: null, act: { ...NO_ACT }, ending: false,
    toShow: !visitors && clinic.table ? toShow(clinic, clinic.table.cart) : null, show: null,
    doorLooked: LONG_AGO, carrierBlinked: LONG_AGO, dimmedAt: LONG_AGO, signSaid: 0, beardUntil: LONG_AGO, furUntil: LONG_AGO,
    landedAt: LONG_AGO, lastPlain: {}, gives: 0, stroking: null, coming: null, doorPlay: null, slides: {}, mousePlay: null,
    aside: null, helped: null, offAnimal: null, touched: null, fingerOn: false, tidied: null, watchFrom: LONG_AGO, watchUntil: LONG_AGO,
    hid: clinic.table !== null && (showingNeed(clinic.table)?.need ?? null) === 'scared', hidAt: LONG_AGO,
    mouseDucked: LONG_AGO, lampKnocked: LONG_AGO, knock: null, drops: [],
    // The first thing the glow offers is the first of the designed order; after that, whatever was given longest ago.
    wanted: [...(clinic.table?.cart ?? [])], sounds: [], save: 0,
  }
  return toy
}

/** The need whose sign the animal on the table shows now, or null when nobody is there or it is well. */
export function needOnTable(toy: Toy): Need | null {
  return toy.clinic.table ? showingNeed(toy.clinic.table)?.need ?? null : null
}

/** Whether somebody may come in: the table is empty or the animal on it is well. */
export function mayComeIn(toy: Toy): boolean {
  return !toy.coming && (!toy.clinic.table || isWell(toy.clinic.table))
}

// --- Where things are -------------------------------------------------------

/** A place on an animal that sits at `seat`, in the room. */
export function onBody(room: Room, species: Species, seat: Vec, at: Anchor, dx = 0, dy = 0): Vec {
  const anchor = at === 'seat' ? { x: 0, y: 0 } : room.bodies[species].anchors[at]
  return { x: seat.x + anchor.x + dx, y: seat.y + anchor.y + dy }
}

/** How small an animal makes itself to fit under the table. */
export function hideSize(room: Room, species: Species): number {
  return Math.min(1, (HIDE.h - 26) / room.bodies[species].h)
}

/** Where a thing key holds its thing on the animal on the table, when the animal is at rest. With `hidden`, on the animal in its hiding place under the table, as small as it is there. */
export function keyPlace(room: Room, species: Species, key: ThingKey, hidden = false): Vec {
  if (!hidden) return onBody(room, species, room.patient, key.at, key.dx, key.dy)
  const anchor = key.at === 'seat' ? { x: 0, y: 0 } : room.bodies[species].anchors[key.at], small = hideSize(room, species)
  return { x: room.hide.x + (anchor.x + key.dx) * small, y: room.hide.y + (anchor.y + key.dy) * small }
}

/** How far outside the room the cart stands when it is rolled out, in design units. */
export const CART_OUT = 620

/**
 * How far in the cart is, 0 to 1, `since` seconds into a coming in. With the
 * first patient it rolls in behind it. At every later coming in it rolls out
 * as the one on the table gets down, and in again behind the newcomer carrying
 * every thing of the new layout; it is in at `CART_IN_AT`.
 */
export function cartIn(since: number, first: boolean): number {
  const ease = (p: number) => { const c = Math.min(1, Math.max(0, p)); return c * c * (3 - 2 * c) }
  if (first) return ease((since - 0.5) / (CART_IN_AT - 0.5))
  return since < 0.6 ? 1 - ease(since / 0.5) : ease((since - 0.7) / (CART_IN_AT - 0.7))
}

/** How far to the side the cart stands now, with everything on it: nothing while it is in. */
export function cartShift(toy: Toy): number {
  if (!toy.clinic.table) return CART_OUT
  return toy.coming ? (1 - cartIn(toy.coming.since, toy.coming.first)) * CART_OUT : 0
}

/** Where a movable thing lies now, or null when it is in the hand or in the air. A thing on the cart is where the cart is. */
export function lies(toy: Toy, room: Room, care: Care): Vec | null {
  if (toy.hand?.care === care || toy.flights.some((flight) => flight.care === care)) return null
  const onCart = (): Vec => ({ x: room.cart[care].x + cartShift(toy), y: room.cart[care].y })
  // A thing the child put on the mouse is at the mouse until the mouse has put it back.
  if (toy.mousePlay?.care === care) return { x: room.mouse.x + cartShift(toy), y: room.mouse.y - 50 }
  // The sheet of plasters never leaves the cart: a plaster comes off it.
  if (care === 'plaster') return onCart()
  const place = toy.clinic.things[care]
  if (place === 'cart') return onCart()
  // A thing on the animal is where the animal is: under the table with one that hides, so it is taken where it is seen.
  if (place === 'patient') return toy.clinic.table ? keyPlace(room, toy.clinic.table.species, wornAt(toy.clinic.table.species, care), toy.hid) : onCart()
  // The blanket on the basket lies where the basket lies.
  if (place === 'on-basket') return lies(toy, room, 'basket') ?? onCart()
  return room.spots[place]
}

function within(point: Vec, centre: Vec, w: number, h: number): boolean {
  return Math.abs(point.x - centre.x) <= w / 2 && Math.abs(point.y - centre.y) <= h / 2
}

/** The middle of an animal sitting at `seat`. */
function middle(room: Room, species: Species, seat: Vec): Vec {
  return { x: seat.x, y: seat.y - room.bodies[species].h / 2 }
}

/** The thing under the finger: one on the animal first, then one lying about, then one on the cart. */
function thingAt(toy: Toy, room: Room, point: Vec): Care | null {
  const order = (care: Care) => (care === 'plaster' ? 2 : toy.clinic.things[care as Movable] === 'patient' ? 0 : toy.clinic.things[care as Movable] === 'cart' ? 2 : 1)
  const cares = [...(toy.clinic.table?.cart ?? [])].sort((one, other) => order(one) - order(other))
  for (const care of cares) {
    // The den is one thing: the blanket that lies over the basket is taken with the basket, never off it.
    if (care === 'blanket' && toy.clinic.things.blanket === 'on-basket') continue
    const at = lies(toy, room, care)
    if (at && within(point, at, room.thing.w, room.thing.h)) return care
  }
  return null
}

/** What the finger is on, in the order things are in front of one another. */
export type Under = { on: 'thing'; care: Care } | { on: 'patient' } | { on: 'waiting' } | { on: 'carrier' } | { on: 'mouse' } | { on: 'lamp' } | { on: 'room' }

/** The size of the hiding place and of the carrier, as a finger finds them. */
export const HIDE = { w: 300, h: 150 } as const
export const CARRIER = { w: 190, h: 160 } as const

export function under(toy: Toy, room: Room, point: Vec): Under {
  const care = thingAt(toy, room, point)
  if (care) return { on: 'thing', care }
  const table = toy.clinic.table, waiting = toy.clinic.waiting.species
  if (table && !toy.coming) {
    // The one that hides is under the table: a touch on the dark there is a touch on it.
    const hiding = needOnTable(toy) === 'scared'
    // All of its drawing counts, also what reaches out to one side: a tail is part of the animal.
    const body = room.bodies[table.species], across = point.x - room.patient.x, up = room.patient.y - point.y
    const on = hiding ? within(point, { x: room.hide.x, y: room.hide.y - HIDE.h / 2 }, HIDE.w, HIDE.h) : across >= body.left && across <= body.right && up >= 0 && up <= body.h
    if (on) return { on: 'patient' }
  }
  if (within(point, middle(room, waiting, room.waiting), room.bodies[waiting].w, room.bodies[waiting].h)) return { on: 'waiting' }
  if (toy.clinic.carrier && within(point, { x: room.carrier.x, y: room.carrier.y - CARRIER.h / 2 }, CARRIER.w, CARRIER.h)) return { on: 'carrier' }
  // The lamp hangs over the table whether or not anybody sits there; the mouse rides the cart, which is out of the room while the table is empty.
  if (within(point, room.lamp, 170, 130)) return { on: 'lamp' }
  if (!table && !toy.coming) return { on: 'room' }
  if (within(point, { x: room.mouse.x + cartShift(toy), y: room.mouse.y - 50 }, 110, 120)) return { on: 'mouse' }
  return { on: 'room' }
}

// --- The finger -------------------------------------------------------------

/**
 * How this animal takes a stroke that landed `at` this place on its drawing
 * (from where it sits): the spot it loves, the spot that makes it squirm, as
 * they are drawn on it, or anywhere else, where it simply leans in. Where two
 * spots overlap, the one whose middle is nearer for its size is meant.
 */
export function strokeAt(species: Species, body: Body, at: Vec): StrokeTaste {
  let best: Spot | null = null, nearest = 1
  for (const spot of Object.keys(body.spots) as Spot[]) {
    for (const round of body.spots[spot] ?? []) {
      const far = Math.hypot(at.x - round.x, at.y - round.y) / round.r
      if (far <= nearest) { nearest = far; best = spot }
    }
  }
  return best ? strokeTaste(species, best) : 'leans'
}

function say(toy: Toy, notes: Notes): void {
  if (notes.length > 0) toy.sounds.push(notes)
}

function needs(toy: Toy, need: SaveNeed): void {
  toy.save = Math.max(toy.save, need) as SaveNeed
}

/** The scene on the table ends: every beat lands where it was going, silently. The mouse's showing is its own. */
function endScene(toy: Toy): void {
  if (!toy.scene) return
  toy.ending = true
  toy.scene.finish()
  toy.ending = false
  toy.scene = null
  toy.act = { ...NO_ACT, showing: toy.act.showing }
  // A scene cut short leaves the animal where the scene was taking it, at once: it does not walk there afterwards.
  toy.hid = needOnTable(toy) === 'scared'
}

/** A touch ends the mouse's showing too. */
function endShowing(toy: Toy): void {
  if (!toy.show) return
  toy.ending = true
  toy.show.finish()
  toy.ending = false
  toy.show = null
  toy.act = { ...toy.act, showing: null }
}

/**
 * The mouse's showing starts. The thing counts as shown from this moment, and
 * that is saved at once: a put-away in the middle of it loses nothing and it
 * never plays again.
 */
function startShowing(toy: Toy): void {
  const care = toy.toShow
  if (!care) return
  toy.toShow = null
  toy.clinic = markShown(toy.clinic, care)
  toy.show = new Scene(showingBeats(toy, care, showingVoice(care)))
  toy.show.start(toy.t, () => {})
  needs(toy, 2)
}

function startScene(toy: Toy, beats: ConstructorParameters<typeof Scene>[0]): void {
  endScene(toy)
  toy.scene = new Scene(beats)
  // The outcome is already in the room and a save at once is already asked for: see scenes.ts.
  toy.scene.start(toy.t, () => needs(toy, 2))
}

/** A cell of the grid begins on the animal. Where its track is not written, the sign simply goes on. */
function startCell(toy: Toy, given: Given, need: Need): void {
  const track = cellTrack(given, need), species = toy.clinic.table!.species
  toy.cell = track ? { track, since: given === 'hand' ? 0 : -lateness(species) } : null
  // A thing's landing is heard as it lands, and the cell's own voice follows at its cue. A touch of the hand has no
  // landing, so its voice is the answer and sounds now.
  if (!track || given === 'hand') say(toy, cellVoice(given, need, species))
}

/**
 * The finger landed. A scene that is playing ends first, and then whatever
 * the finger landed on answers now: a thing lifts off with its peel, the
 * animal shows its sign to the hand or leans into a stroke, the one at the
 * door or in the carrier comes in or answers where it stands, the mouse and
 * the lamp answer, and the bare room gives a soft knock.
 */
export function press(toy: Toy, room: Room, point: Vec): void {
  endScene(toy)
  endShowing(toy)
  // A showing still owed from before the game was put away starts with this touch, before the touch is answered:
  // so it has always started before anyone else can be brought in.
  if (toy.toShow && !toy.coming) startShowing(toy)
  // A well animal's own scene with the thing it loves is a secret too, and gives way to any touch: it cuts to its
  // last pose, with the thing where the scene would have left it.
  if (toy.playing?.secret) toy.playing = null
  toy.aside = null
  if (toy.hand) {
    // A thing waiting in the air after a lifted finger is taken up again from anywhere.
    toy.hand.lifted = false
    toy.hand.finger = point
    return
  }
  let hit = under(toy, room, point)
  // A thing that lies on an animal with a need is not lifted by a touch: the touch is a stroke of the animal, as the
  // hand always is, and nothing is given. A drag from there takes the thing off (`drag`).
  toy.offAnimal = null
  if (hit.on === 'thing' && hit.care !== 'plaster' && toy.clinic.things[hit.care] === 'patient' && needOnTable(toy) && !toy.coming) {
    toy.offAnimal = { care: hit.care, from: lies(toy, room, hit.care)! }
    hit = { on: 'patient' }
  }
  if (hit.on === 'thing') {
    const from = lies(toy, room, hit.care)!
    // Taken off the animal in the middle of its reaction, the reaction ends: the animal sits as it sat. Taken off
    // the mouse, the mouse stands as it stood.
    if (toy.playing?.reaction.care === hit.care) toy.playing = null
    if (toy.mousePlay?.care === hit.care) toy.mousePlay = null
    delete toy.slides[hit.care]
    toy.hand = { care: hit.care, at: { ...from }, finger: point, swing: 0, since: toy.t, from, lifted: false }
    toy.mouseDucked = toy.t
    say(toy, peel(hit.care, toy.gives))
    say(toy, squeak('duck'))
  } else if (hit.on === 'patient') {
    const species = toy.clinic.table!.species, body = room.bodies[species], need = needOnTable(toy)
    toy.fingerOn = true
    const crept = toy.cell && toy.cell.track.given === 'hand' && toy.cell.track.need === 'scared' ? toy.cell : null
    if (need && crept && need === 'scared' && crept.since >= CREPT_AT * beatSeconds(species) && crept.since < BACK_AT * beatSeconds(species)) {
      // The one that hides has crept a step out to the finger: a second quick touch sends it back in.
      crept.since = BACK_AT * beatSeconds(species)
      say(toy, steps(species, 1))
    } else if (need) {
      // The hand is how a child says "what is it?": the animal shows its sign again, turned to the child. Nothing is counted.
      startCell(toy, 'hand', need)
      // Its tastes hold with a need too: on the spot it loves it melts for a moment, on the one that makes it squirm
      // it wriggles, and then the stroke is the stroke of its need. One that hides is touched through the dark, on no spot.
      const manner = need === 'scared' ? 'leans' : strokeAt(species, body, { x: point.x - room.patient.x, y: point.y - room.patient.y })
      toy.touched = { manner, since: toy.t, at: { x: point.x - room.patient.x, y: point.y - room.patient.y } }
      if (manner !== 'leans') say(toy, call(species, manner === 'loved' ? 'bliss' : 'wow', toy.gives++))
    } else {
      const manner = strokeAt(species, body, { x: point.x - room.patient.x, y: point.y - room.patient.y })
      toy.stroking = { manner, since: toy.t, side: point.x >= room.patient.x ? 1 : -1, letGo: -1 }
      say(toy, call(species, manner === 'loved' ? 'bliss' : manner === 'squirms' ? 'wow' : 'hum', toy.gives++))
    }
  } else if (hit.on === 'waiting') {
    if (mayComeIn(toy)) arrive(toy, 'door', room)
    else {
      // While a need on the table is unmet nobody comes in: it looks up and shows its sign once more.
      const waiting = toy.clinic.waiting, shown = showingNeed(waiting)
      toy.doorLooked = toy.t
      say(toy, shown ? signVoice(shown.need, waiting.species, shown.step) : call(waiting.species, 'hum', toy.gives++))
    }
  } else if (hit.on === 'carrier') {
    if (mayComeIn(toy)) arrive(toy, 'carrier', room)
    else {
      toy.carrierBlinked = toy.t
      say(toy, carrierVoice('blink'))
    }
  } else if (hit.on === 'mouse') {
    toy.mouseDucked = toy.t
    say(toy, squeak('peek'))
  } else if (hit.on === 'lamp') {
    toy.lampKnocked = toy.t
    say(toy, knock())
  } else {
    toy.knock = { at: point, since: toy.t }
    say(toy, knock())
  }
}

/** The one at the door, or the one in the carrier, comes in and the one on the table goes out to the garden. Saved at once: nothing replays on load. */
function arrive(toy: Toy, from: 'door' | 'carrier', room: Room): void {
  // A thing still in the air was sent to the one who is leaving: it lands on that one, never on the newcomer.
  const flying = toy.flights
  toy.flights = []
  for (const flight of flying) landed(toy, room, flight.care)
  endScene(toy)
  const leaving = toy.clinic.table?.species ?? null
  const away = MOVABLES.find((thing) => toy.clinic.things[thing] !== 'cart' && toy.clinic.things[thing] !== 'on-basket') ?? null
  const { clinic, cameIn } = comeIn(toy.clinic, from, toy.visitors)
  if (!cameIn) return
  toy.clinic = clinic
  const table = clinic.table!
  toy.coming = { since: 0, leaving, arriving: table.species, from, need: showingNeed(table)?.need ?? null, first: leaving === null && !toy.visitors }
  toy.playing = null
  toy.cell = null
  toy.stroking = null
  toy.doorPlay = null
  toy.mousePlay = null
  toy.slides = {}
  toy.aside = null
  toy.helped = null
  // Every thing the new cart carries is on it again: the mouse straightens one of those that came back, once the cart is in.
  toy.tidied = away && table.cart.includes(away) ? { care: away, since: toy.t + CART_IN_AT } : null
  toy.touched = null
  toy.hid = (showingNeed(table)?.need ?? null) === 'scared'
  toy.hidAt = LONG_AGO
  toy.lastPlain = {}
  toy.wanted = [...table.cart]
  toy.toShow = cameIn.showing
  toy.signSaid = toy.t
  say(toy, from === 'carrier' ? carrierVoice('open') : steps(table.species, 1))
  needs(toy, 2)
}

/** The finger moved with something under it. */
export function drag(toy: Toy, room: Room, point: Vec): void {
  if (!toy.hand && toy.offAnimal) {
    // The finger pressed a thing on the animal and now pulls: the thing comes off in the hand, and the stroke ends.
    const { care, from } = toy.offAnimal
    toy.offAnimal = null
    if (toy.cell?.track.given === 'hand') toy.cell = null
    toy.touched = null
    toy.fingerOn = false
    toy.hand = { care, at: { ...from }, finger: point, swing: 0, since: toy.t, from, lifted: false }
    toy.mouseDucked = toy.t
    say(toy, peel(care, toy.gives))
    return
  }
  if (toy.hand) {
    // A finger that came back after a lift carries on the same drag.
    toy.hand.finger = point
    toy.hand.lifted = false
  } else if (toy.stroking && toy.stroking.letGo < 0) toy.stroking.side = point.x >= room.patient.x ? 1 : -1
}

/** The finger lifted in the middle of a drag: the thing waits in the air where it is. */
export function lift(toy: Toy): void {
  if (toy.hand) toy.hand.lifted = true
}

/** The finger went up where it came down. A thing in the hand flies to the animal. */
export function tap(toy: Toy): void {
  if (toy.hand) send(toy)
  release(toy)
}

function release(toy: Toy): void {
  toy.fingerOn = false
  toy.offAnimal = null
  if (toy.stroking && toy.stroking.letGo < 0) toy.stroking.letGo = toy.t
}

/** Sends the thing in the hand to the animal on the table in one arc. */
function send(toy: Toy): void {
  const hand = toy.hand!
  // While the newcomer is still on its way, the thing arrives just after it has sat down.
  const wait = toy.coming ? Math.max(0, SEATED_AT + 0.1 - toy.coming.since - FLIGHT_SECONDS) : 0
  toy.flights.push({ care: hand.care, from: { ...hand.at }, since: -wait, lasts: FLIGHT_SECONDS })
  toy.hand = null
  // The mouse ducks what flies.
  toy.mouseDucked = toy.t
  say(toy, whoosh(hand.care))
}

/** Where a give is aimed: the middle of the animal, or the hiding place when it hides. */
export function target(toy: Toy, room: Room): Vec {
  const table = toy.clinic.table!
  return needOnTable(toy) === 'scared' ? { x: room.hide.x, y: room.hide.y - HIDE.h / 2 } : middle(room, table.species, room.patient)
}

/** How near the animal a thing must be let go to land on it: generous, so a drag that is partly done counts. */
export function reaches(room: Room, species: Species, from: Vec, at: Vec, aim: Vec = middle(room, species, room.patient), hiding = false): boolean {
  const body = room.bodies[species]
  if (within(at, aim, (hiding ? HIDE.w : body.w) + room.thing.w, (hiding ? HIDE.h : body.h) + room.thing.h)) return true
  // Brought at least half the way to the animal counts, wherever it started; below the table's top it is on the floor.
  return !hiding && at.y <= room.patient.y && Math.hypot(at.x - aim.x, at.y - aim.y) <= 0.5 * Math.hypot(from.x - aim.x, from.y - aim.y)
}

/** Whether the animal on the table hides under it, now or once another need of its is met: fear is one of its unmet needs. */
function mayHide(toy: Toy): boolean {
  return toy.hid || (toy.clinic.table?.needs.some((entry) => entry.need === 'scared' && !entry.met) ?? false)
}

/** The nearest named spot that no other thing lies on. With `onTheTable`, only the two ends of the table count. */
function freeSpot(toy: Toy, room: Room, care: Movable, at: Vec, onTheTable = false): RestSpot | null {
  const taken = MOVABLES.filter((other) => other !== care).map((other) => toy.clinic.things[other])
  // While an animal hides under the table, or may hide there next, nothing is laid in its hiding place.
  const open = onTheTable || mayHide(toy) ? REST_SPOTS.filter((spot) => !spot.startsWith('floor')) : REST_SPOTS
  const free = open.filter((spot) => !taken.includes(spot))
  let best: RestSpot | null = null, nearest = Infinity
  for (const spot of free) {
    const far = Math.hypot(room.spots[spot].x - at.x, room.spots[spot].y - at.y)
    if (far < nearest) { nearest = far; best = spot }
  }
  return best
}

/** The other thing a thing was let go on, where the two make something together. */
function pairedWith(toy: Toy, room: Room, care: Care, at: Vec): Care | null {
  for (const other of toy.clinic.table?.cart ?? []) {
    if (other === care || !pairOf(care, other)) continue
    const lying = lies(toy, room, other)
    if (lying && toy.clinic.things[other as Movable] !== 'patient' && within(at, lying, room.thing.w, room.thing.h)) return other
  }
  return null
}

/**
 * The drag ended. On another thing with which it makes something, the two
 * make it: a secret, the same every time. Near the animal the thing lands on
 * it. On the one at the door it is taken as play, or nosed back if it would
 * fit a need. A plaster sticks to the mouse or the lamp. Let go anywhere
 * else, a thing slides to rest on the nearest free named spot, or back onto
 * the cart when it is let go there, and can be picked up again.
 */
export function drop(toy: Toy, room: Room): void {
  const hand = toy.hand
  release(toy)
  if (!hand || !toy.clinic.table) return
  const at = hand.finger, table = toy.clinic.table.species, waiting = toy.clinic.waiting.species
  const other = pairedWith(toy, room, hand.care, at)
  if (other) {
    const { clinic, secret } = join(toy.clinic, hand.care, other)
    toy.clinic = clinic
    toy.hand = null
    if (secret) {
      const manner = taste(table, hand.care)
      startScene(toy, secretBeats(toy, secret, hand.care, other, { made: secretVoice(secret), animal: call(table, manner === 'loves' ? 'bliss' : manner === 'wary' ? 'wary' : 'glad', toy.gives++) }))
    }
    return needs(toy, 2)
  }
  const hiding = needOnTable(toy) === 'scared'
  if (reaches(room, table, hand.from, at, target(toy, room), hiding)) return send(toy)
  toy.hand = null
  if (within(at, middle(room, waiting, room.waiting), room.bodies[waiting].w + 40, room.bodies[waiting].h + 40)) {
    const { clinic, atTheDoor } = giveAtTheDoor(toy.clinic, hand.care)
    toy.clinic = clinic
    toy.doorPlay = { care: hand.care, since: toy.t, manner: atTheDoor.kind === 'nosed-back' ? 'nosed' : atTheDoor.taste }
    if (atTheDoor.kind === 'nosed-back') {
      // The thing that would fit is sniffed and nosed back toward the table: it lies where it lay, and is seen to
      // go there, pushed by the nose, once it has been sniffed.
      toy.slides[hand.care] = { from: { ...hand.at }, since: toy.t, wait: NOSED.sniff, lasts: NOSED.back }
      say(toy, call(waiting, 'hum', toy.gives++))
      return
    }
    // It comes to rest by the door, or on the nearest spot nothing else lies on.
    if (hand.care !== 'plaster') {
      toy.clinic = putDown(toy.clinic, hand.care, freeSpot(toy, room, hand.care, room.waiting) ?? 'cart')
      toy.slides[hand.care] = { from: { ...hand.at }, since: toy.t, wait: 0, lasts: SLIDE_SECONDS }
    }
    say(toy, land(hand.care, waiting))
    say(toy, call(waiting, atTheDoor.taste === 'wary' ? 'wary' : 'glad', toy.gives++))
    return needs(toy, 1)
  }
  if (hand.care === 'plaster') {
    const on = within(at, { x: room.mouse.x, y: room.mouse.y - 50 }, 150, 150) ? 'mouse' : within(at, room.lamp, 190, 150) ? 'lamp' : at.y > room.patient.y + 30 ? 'floor' : tableEnd(toy.clinic.things)
    toy.clinic = stick(toy.clinic, on)
    // On the table, the floor or the lamp it slides to its place from where it was let go.
    if (on !== 'mouse') toy.slides.plaster = { from: { ...hand.at }, since: toy.t, wait: 0, lasts: SLIDE_SECONDS }
    if (on === 'mouse') { toy.mouseDucked = toy.t; say(toy, squeak('tidy')) }
    say(toy, rest('plaster'))
    return needs(toy, 1)
  }
  const care = hand.care
  if (within(at, { x: room.mouse.x + cartShift(toy), y: room.mouse.y - 50 }, 150, 150)) {
    // Mischief works: the mouse answers the thing where it stands, and then puts it back in its place on the cart.
    // In the saved room the thing lies on the cart from now.
    toy.clinic = putDown(toy.clinic, care, 'cart')
    toy.mousePlay = { care, since: toy.t }
    say(toy, rest(care))
    say(toy, squeak(care === 'bowl' || care === 'basket' ? 'duck' : 'peek'))
    if (care === 'bowl') {
      say(toy, drops(3))
      for (const side of [-1, 0, 1]) toy.drops.push({ at: { x: room.mouse.x + cartShift(toy), y: room.mouse.y - 96 }, v: { x: side * 170, y: -230 - 40 * Math.abs(side) }, since: 0 })
    }
    return needs(toy, 1)
  }
  const home = room.cart[care]
  const spot = within(at, home, room.thing.w * 1.6, room.thing.h * 1.6) ? null : freeSpot(toy, room, care, at)
  toy.clinic = putDown(toy.clinic, care, spot ?? 'cart')
  // It slides to rest from where it was let go.
  toy.slides[care] = { from: { ...hand.at }, since: toy.t, wait: 0, lasts: SLIDE_SECONDS }
  // Back on the cart, the mouse straightens it.
  if (!spot) { say(toy, squeak('tidy')); toy.tidied = { care, since: toy.t + SLIDE_SECONDS } }
  say(toy, rest(care))
  needs(toy, 1)
}

/** The press ended without a tap or a drag (the surface was parked, the browser took the finger): the thing goes back where it lay. */
export function cancel(toy: Toy): void {
  toy.hand = null
  release(toy)
}

// --- Time -------------------------------------------------------------------

/**
 * A thing landed on the animal. The give is made in the room and saved at
 * once. An animal that needs nothing plays with it. For one with a need the
 * cell of the grid begins: the care that fits helps, and when it was the last
 * need the well scene begins; a care that does not fit is never refused, its
 * own cell plays, and the thing comes to rest beside the animal.
 */
function landed(toy: Toy, room: Room, sent: Care): void {
  const before = toy.clinic.table
  if (!before) return
  const species = before.species
  // The den is given as one thing and helps as the basket or as the blanket, whichever the animal needs: for one
  // that is cold (and is not showing fear first) it is the blanket that is given. The den then comes apart: the
  // blanket is on the animal, and the basket slides back to where it lay.
  const unmet = before.needs.filter((entry) => !entry.met).map((entry) => entry.need)
  const asBlanket = sent === 'basket' && toy.clinic.made.den && unmet.includes('cold') && (!unmet.includes('scared') || showingNeed(before)?.need === 'cold')
  const care: Care = asBlanket ? 'blanket' : sent
  if (asBlanket) toy.slides.basket = { from: target(toy, room), since: toy.t, wait: 0, lasts: SLIDE_SECONDS * 1.5 }
  // The reaction a well animal will play with it, chosen now, since it decides whether the animal drinks from the
  // bowl or goes under the blanket (the foam and the crackle are for whoever does that next).
  const flip = (((toy.gives + 1) * 0.61803) % 1 + (toy.clinic.seed % 97) / 97) % 1
  const chosen = reactionFor(species, care, toy.lastPlain[care] ?? null, flip)
  const { clinic, gave } = giveCare(toy.clinic, care, { drinks: chosen.reaction.drinks, under: goesUnder(chosen.reaction) })
  if (!gave) return
  toy.clinic = clinic
  toy.landedAt = toy.t
  toy.gives++
  toy.stroking = null
  // Given longest ago comes first: this one goes to the back of what the glow offers.
  toy.wanted = [...toy.wanted.filter((other) => other !== care), care]
  // Whoever goes under the crackling blanket comes out with its fur on end: it crackles as it lands.
  if (gave.furOnEnd) say(toy, secretVoice('crackle'))
  // A beard or fur on end is shaken off before the reaction that left it ends: it lasts as long as what is about to
  // play (a reaction, a cell, or the well scene's first six seconds), and no longer.
  const leaves = (seconds: number) => {
    if (gave.beard) toy.beardUntil = toy.t + seconds
    if (gave.furOnEnd) toy.furUntil = toy.t + seconds
  }
  say(toy, land(care, species))
  needs(toy, 2)
  const answer = gave.answer
  if (answer.kind === 'play') {
    const { reaction, taste: manner } = chosen
    if (manner === 'plain') toy.lastPlain[care] = reaction.id
    toy.playing = { reaction, since: -lateness(species), secret: gave.signature }
    leaves(lasts(reaction, species) + lateness(species))
    return
  }
  const track = cellTrack(care, answer.need)
  leaves(answer.kind === 'helps' && answer.well ? WELL.least : track ? cellLasts(track, species) + lateness(species) : 2)
  toy.playing = null
  if (answer.kind === 'misses') {
    // A thing that did not fit lies beside the animal, on a spot nothing else lies on, and can be given again.
    // Beside the animal is on the table: at one of its two ends, and back on the cart when both are taken. Never on
    // the floor under it.
    if (care !== 'plaster') {
      const spot = freeSpot(toy, room, care, room.spots['table-left'], true)
      toy.clinic = putDown(toy.clinic, care, spot ?? 'cart')
      // Back on the cart when both ends of the table are taken: the mouse straightens it once its cell has brought it there.
      const track = cellTrack(care, answer.need)
      if (!spot) toy.tidied = { care, since: toy.t + (track ? cellLasts(track, species) + lateness(species) : 0) }
    }
    startCell(toy, care, answer.need)
    return
  }
  if (!answer.well) {
    // Another need is left: the cell that helps plays, and then the animal takes the thing in the manner of its taste.
    toy.helped = { taste: answer.taste, need: answer.need }
    return startCell(toy, care, answer.need)
  }
  // The last need is met: the well scene. The cycle was judged and saved in the give above.
  toy.cell = null
  startScene(toy, wellBeats(toy, {
    species, need: answer.need, care, taste: answer.taste, track: cellTrack(care, answer.need), tried: clinic.table!.tried,
    voices: { feat: wellVoice(species, answer.need), flourish: call(species, answer.taste === 'loves' ? 'bliss' : answer.taste === 'wary' ? 'wary' : 'glad', toy.gives), glance: call(species, 'wow', toy.gives + 1) },
  }))
}

/** What a cue of a cell or a reaction makes heard and seen. */
function cue(toy: Toy, room: Room, species: Species, at: { call?: Parameters<typeof call>[1]; drops?: number; thump?: number; dim?: number; voice?: true; first?: number; note?: number; rest?: number; rustle?: true; t: number }, own: Notes | null): void {
  if (at.voice && own) say(toy, own)
  // A piece of the cell's voice, played at the beat where what it names is drawn, from its own first note.
  const piece = !own ? null : at.first !== undefined ? own.slice(0, at.first) : at.note !== undefined ? own.slice(at.note, at.note + 1) : at.rest !== undefined ? own.slice(at.rest) : null
  if (piece && piece.length > 0) { const from = Math.min(...piece.map((note) => note.at)); say(toy, piece.map((note) => ({ ...note, at: note.at - from }))) }
  if (at.rustle) say(toy, clothRustle())
  if (at.call) say(toy, call(species, at.call, toy.gives + Math.round(at.t * 10)))
  if (at.thump) say(toy, steps(species, at.thump))
  if (at.dim) { toy.dimmedAt = toy.t; say(toy, lampVoice('dim')) }
  if (at.drops) {
    say(toy, drops(at.drops))
    // A good shake of water reaches the lamp above: it swings and rings.
    if (at.drops >= 3) { toy.lampKnocked = toy.t; say(toy, knock()) }
    const from = onBody(room, species, room.patient, 'head')
    for (let n = 0; n < at.drops; n++) {
      const spread = (n + 0.5) / at.drops - 0.5
      toy.drops.push({ at: { ...from }, v: { x: spread * 520, y: -260 - 60 * Math.abs(spread) }, since: 0 })
    }
  }
}

/** Plays `seconds` of game time: the hand trails the finger, things fly and land, the cell, the reaction, the scene and the exchange at the door go on. */
export function step(toy: Toy, room: Room, seconds: number): void {
  toy.t += seconds
  const hand = toy.hand
  if (hand) {
    const pull = 1 - Math.exp(-seconds * 20)
    const before = hand.at.x
    hand.at = { x: hand.at.x + (hand.finger.x - hand.at.x) * pull, y: hand.at.y + (hand.finger.y - hand.at.y) * pull }
    const speed = seconds > 0 ? (hand.at.x - before) / seconds : 0
    hand.swing += (Math.max(-0.5, Math.min(0.5, -speed / 1400)) - hand.swing) * (1 - Math.exp(-seconds * 9))
  }
  for (const flight of toy.flights) flight.since += seconds
  const down = toy.flights.filter((flight) => flight.since >= flight.lasts)
  toy.flights = toy.flights.filter((flight) => flight.since < flight.lasts)
  for (const flight of down) landed(toy, room, flight.care)

  const species = toy.clinic.table?.species
  // A scene moves the cell it plays; a cell outside a scene runs on game time.
  const cellBefore = toy.cell ? toy.cell.since : 0
  if (toy.scene) {
    toy.scene.update(toy.t)
    if (!toy.scene.running) { toy.scene = null; toy.act = { ...NO_ACT, showing: toy.act.showing } }
  } else if (toy.cell) {
    // The one that shivers presses against the warm hand: its shaking stays eased for as long as the finger stays,
    // and comes back when it lifts.
    const warmed = toy.cell.track.given === 'hand' && toy.cell.track.need === 'cold' && toy.fingerOn && species !== undefined && toy.cell.since >= WARM_AT * beatSeconds(species)
    if (!warmed) toy.cell.since += seconds
  }
  if (toy.cell && species) {
    const { track, since } = toy.cell
    for (const at of cellCuesBetween(track, species, Math.max(0, cellBefore), since)) cue(toy, room, species, at, track.given === 'hand' ? null : cellVoice(track.given, track.need, species))
    if (!toy.scene && since >= cellLasts(track, species)) {
      toy.cell = null
      if (toy.helped && toy.helped.need === track.need && track.given !== 'hand') {
        toy.aside = { ...toy.helped, since: toy.t }
        say(toy, call(species, toy.helped.taste === 'loves' ? 'bliss' : toy.helped.taste === 'wary' ? 'wary' : 'glad', toy.gives++))
      }
      toy.helped = null
    }
  }
  const playing = toy.playing
  if (playing && species) {
    const before = playing.since
    playing.since += seconds
    for (const at of cuesBetween(playing.reaction, species, Math.max(0, before), playing.since)) cue(toy, room, species, at, null)
    if (playing.since >= lasts(playing.reaction, species)) toy.playing = null
  }
  for (const one of toy.drops) {
    one.since += seconds
    one.v.y += 1500 * seconds
    one.at = { x: one.at.x + one.v.x * seconds, y: one.at.y + one.v.y * seconds }
  }
  toy.drops = toy.drops.filter((one) => one.since < DROP_SECONDS)

  if (toy.coming) {
    const before = toy.coming.since
    toy.coming.since += seconds
    // A footfall for each hop of the one who comes in, and one when it lands on the table.
    for (const at of [0.45, 0.75, 1.05, SEATED_AT]) if (before < at && toy.coming.since >= at) say(toy, steps(toy.coming.arriving, 1))
    if (before < SEATED_AT && toy.coming.since >= SEATED_AT) toy.landedAt = toy.t
    // Out of the carrier: a shut one slides in where the open one stood.
    if (toy.coming.from === 'carrier' && toy.clinic.carrier && before < 0.9 && toy.coming.since >= 0.9) say(toy, carrierVoice('slide'))
    if (toy.coming.since >= COMING_SECONDS) toy.coming = null
  }
  // The mouse shows a new thing once the cart that carries it is in.
  if (toy.toShow && !toy.show && toy.coming && toy.coming.since >= CART_IN_AT) startShowing(toy)
  if (toy.show) {
    toy.show.update(toy.t)
    if (!toy.show.running) { toy.show = null; toy.act = { ...toy.act, showing: null } }
  }
  // Where the animal is: under the table while the need it shows, or the cell that is playing, is fear. In a scene
  // and in the exchange at the door that is played by the scene itself; otherwise the animal is seen to change place.
  if (toy.clinic.table) {
    // An animal that hides is never brought out by a thing: while fear is one of its unmet needs and it is under
    // the table, the cell of another need plays there. It comes out once the basket has helped.
    const afraid = toy.clinic.table.needs.some((entry) => entry.need === 'scared' && !entry.met)
    const hides = toy.scene ? toy.act.under : toy.cell ? toy.cell.track.need === 'scared' || (toy.hid && afraid) : toy.aside ? toy.aside.need === 'scared' || (toy.hid && afraid) : needOnTable(toy) === 'scared'
    if (hides !== toy.hid) {
      toy.hid = hides
      if (!toy.scene && !toy.coming) { toy.hidAt = toy.t; say(toy, steps(toy.clinic.table.species, 1)) }
    }
    // Nothing lies in the hiding place of an animal that hides: a thing the child had put on the floor under the
    // table slides out of its way, onto a free end of the table or back onto the cart.
    if (toy.hid) for (const thing of MOVABLES) {
      const place = toy.clinic.things[thing]
      if (!place.startsWith('floor')) continue
      const from = room.spots[place as RestSpot]
      const spot = freeSpot(toy, room, thing, room.spots['table-right'], true)
      toy.clinic = putDown(toy.clinic, thing, spot ?? 'cart')
      toy.slides[thing] = { from: { ...from }, since: toy.t, wait: 0, lasts: SLIDE_SECONDS * 2 }
      if (!spot) toy.tidied = { care: thing, since: toy.t + SLIDE_SECONDS * 2 }
      needs(toy, 1)
    }
  }
  // The sign sounds now and then while the animal waits to be helped, never louder with time.
  const need = needOnTable(toy), table = toy.clinic.table
  if (need && table && !toy.cell && !toy.scene && !toy.coming && toy.t - toy.signSaid > 4.5 + 3 * fixed(Math.floor(toy.t / 4), 31)) {
    say(toy, signVoice(need, table.species, showingNeed(table)!.step))
    toy.signSaid = toy.t
  }
  if (toy.stroking && toy.stroking.letGo >= 0 && toy.t - toy.stroking.letGo > 0.5) toy.stroking = null
  if (toy.doorPlay && toy.t - toy.doorPlay.since > 1.6) toy.doorPlay = null
  if (toy.tidied && toy.t - toy.tidied.since >= TIDY_SECONDS) toy.tidied = null
  if (toy.aside && toy.t - toy.aside.since >= WELL.flourish) toy.aside = null
  // Where the finger landed is kept for as long as the hand's cell plays: the animal leans to that side.
  if (toy.touched && toy.t - toy.touched.since >= TOUCHED_SECONDS && !(toy.cell?.track.given === 'hand')) toy.touched = null
  // The one who waits watches the table while something happens on it.
  if (toy.cell || toy.playing || toy.scene) {
    if (toy.t > toy.watchUntil) toy.watchFrom = toy.t
    toy.watchUntil = toy.t + 0.6
  }
  for (const care of Object.keys(toy.slides) as Care[]) { const slide = toy.slides[care]!; if (toy.t - slide.since >= slide.wait + slide.lasts) delete toy.slides[care] }
  if (toy.mousePlay && toy.t - toy.mousePlay.since >= MISCHIEF_SECONDS) {
    // The mouse has put it back, and straightens it.
    toy.tidied = { care: toy.mousePlay.care, since: toy.t }
    toy.mousePlay = null
    say(toy, squeak('tidy'))
  }
  if (toy.knock && toy.t - toy.knock.since > 0.6) toy.knock = null
  // The lamp that dimmed for a rest comes back.
  if (toy.t - toy.dimmedAt >= LAMP_BACK && toy.t - seconds - toy.dimmedAt < LAMP_BACK) say(toy, lampVoice('bright'))
}

/** Whether something is going on that is not idleness: a thing in the hand or the air, a cell, a reaction, a scene, the exchange at the door. */
export function busy(toy: Toy): boolean {
  return toy.hand !== null || toy.flights.length > 0 || toy.cell !== null || toy.playing !== null || toy.scene !== null || toy.show !== null || toy.coming !== null || toy.stroking !== null || toy.aside !== null || toy.mousePlay !== null || Object.keys(toy.slides).length > 0 || toy.t - toy.hidAt < SHIFT_SECONDS
}

/**
 * Everything at rest before a save or a park: a thing in the hand goes back
 * where it last lay, wherever the finger had taken it, and is not given; a
 * stroke ends; and a thing the child had already sent lands, so nothing is
 * saved in the air.
 */
export function settle(toy: Toy, room: Room): void {
  cancel(toy)
  toy.mousePlay = null
  toy.tidied = null
  toy.slides = {}
  const flying = toy.flights
  toy.flights = []
  for (const flight of flying) landed(toy, room, flight.care)
}

/** The sounds queued since the last call, for the Mount to play. */
export function takeSounds(toy: Toy): Notes[] {
  const sounds = toy.sounds
  toy.sounds = []
  return sounds
}

/** How much of what changed must reach storage, and clears it. */
export function takeSave(toy: Toy): SaveNeed {
  const need = toy.save
  toy.save = 0
  return need
}
