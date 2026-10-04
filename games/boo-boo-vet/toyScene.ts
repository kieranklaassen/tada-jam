// What the game looks like at this moment, as a list of things to draw in
// order, back to front. Pure numbers, so the tests can look at a frame
// without a canvas: the view only maps each item onto a sticker.
//
// Every character reacts with its whole sticker: an item for a figure is a
// place, a tilt, a squash and a face. What a sign adds to it (a paw held up,
// the arms round itself, the tongue, burrs, a puff of breath, the dark it
// hides in) is a part laid on or beside the figure.

import { taste, type Species, type Taste } from './cast'
import { sampleCell, type CellAnchor, type CellThing, type HeldInCell } from './cells'
import type { Kept } from './clinic'
import { flourishPose } from './flourish'
import { helps } from './grid'
import { handPose, type Guidance, type HandPose } from './guidance'
import { REST, add, blinking, idle, jolt, stroked, type Face, type Pose } from './motion'
import { MISCHIEF_SECONDS, TIDIED_FROM, mischief, nearMouse, showingUse, type MouseUse } from './mouse'
import type { Care, Need } from './needs'
import { isWell, showing as showingNeed, type Patient } from './patient'
import { sample, wornAt, type Held, type ThingKey } from './reactions'
import { WELL } from './scenes'
import { NO_SHOW, sign, type Show } from './signs'
import { CART_OUT, hideSize, NOSED, SEATED_AT, SHIFT_SECONDS, TIDY_SECONDS, TOUCHED_SECONDS, cartIn as cartInAt, lies, mayComeIn, needOnTable, type Coming, type Room, type Toy, type Vec } from './toy'

/** A part laid on or beside a figure, or a piece of the room that is not always there. */
export type PartName = 'paw' | 'arms' | 'tongue1' | 'tongue2' | 'burr' | 'puff' | 'shade' | 'eyes' | 'eyesShut' | 'eye' | 'fur' | 'beard' | 'foam' | 'den' | 'denLifted' | 'table' | 'carrier' | 'carrierOpen' | 'shelf' | 'ball'

export type Item =
  | { kind: 'figure'; who: 'patient' | 'waiting' | 'leaving' | 'garden'; species: Species; x: number; y: number; rot: number; sx: number; sy: number; face: Face; shut: boolean; size: number; alpha: number; /** How many of its ears hang: 0, 1 or 2. */ hang: number }
  | { kind: 'thing'; care: Care; look: 'whole' | 'lifted' | 'open' | 'one' | 'one-lifted'; x: number; y: number; rot: number; sx: number; sy: number; alpha: number; /** A thing an animal took with it when it left: nothing that was made of the room's own thing shows on it. */ kept?: true }
  | { kind: 'part'; part: PartName; species: Species | null; x: number; y: number; rot: number; sx: number; sy: number; alpha: number }
  | { kind: 'cart'; x: number }
  | { kind: 'lamp'; rot: number; alpha: number }
  | { kind: 'mouse'; x: number; y: number; rot: number; sx: number; sy: number; hat: boolean; fuss: boolean; shut: boolean }
  | { kind: 'halo'; x: number; y: number; strength: number; size: number }
  | { kind: 'hand'; x: number; y: number; press: number; alpha: number }
  | { kind: 'drop'; x: number; y: number; alpha: number }
  | { kind: 'ring'; x: number; y: number; age: number }
  /** A ring spreading on the water of a bowl: `age` 0 to 1 from the middle to the rim. */
  | { kind: 'ripple'; x: number; y: number; age: number; size: number; alpha: number }

/** Where the three who were made well sit in the garden, from the window's own places. */
export type Garden = readonly [Vec, Vec, Vec]

const GARDEN_SIZE = 0.36
/** The moments of the exchange at the door, in seconds: the one who leaves starts to walk, reaches the door, and is gone. */
export const WALKS_AT = 1.3, OUT_AT = 2.35, GONE_AT = 2.85
/** How far up the path the next one stands while the one before it goes in, how long it takes to step up to the door, and how quickly it is there to be seen. */
export const NEXT_BACK = 104, NEXT_STEPS_UP = 0.9, NEXT_SEEN = 0.25
/** The blanket spread out is this wide and high as drawn, from its bottom centre. */
const BLANKET_OPEN = { w: 300, h: 200 }
const TAU = Math.PI * 2
/** How far from a plastered paw the middle of another plaster lies, along the strip: more than the two half lengths. */
const PLASTER_CLEAR = 88
/** How long the long tongue is drawn before it is stretched to reach (view/parts.ts, `TONGUE`). */
const TONGUE_LONG = 72
/** How far from the animal's side a paw can be laid in a hand. */
const PAW_REACH = 110
/** The turn of a paw that is dipped: pointing down. */
const DIPPED = 2.95
/** The part of a pair's secret during which the thing that was put on the other is in the air. */
const SECRET_FLIGHT = 0.1
/** How far up from an animal's mouth to the top of its head its eyes are. */
const EYES_UP = 0.42
/** Where the three patches are on the cloth of the den, from its middle: on the roof, clear of the way in. */
const PATCH_DEN = [{ x: -52, y: -14 }, { x: 50, y: -30 }, { x: -6, y: -52 }] as const
/** Where the three patches are on the blanket spread open, from the middle of its hem: low on the cloth, clear of a plaster on the chest of whoever wears it. */
const PATCH_OPEN = [{ x: -92, y: -38 }, { x: 22, y: -42 }, { x: -36, y: -24 }] as const
/** Where along each fold of the blanket its patch lies, and how it is tipped. */
const PATCH_AT = [{ x: -18, rot: -0.3 }, { x: 14, rot: 0.2 }, { x: -6, rot: 0.5 }] as const
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const smooth = (p: number) => { const c = clamp(p, 0, 1); return c * c * (3 - 2 * c) }

/** A walk in hops from one place to another over progress 0 to 1. */
function hops(from: Vec, to: Vec, progress: number, count: number, height: number): Vec & { air: number } {
  const p = clamp(progress, 0, 1), air = Math.abs(Math.sin(Math.PI * count * p))
  return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p - height * air, air }
}

/** One arc from one place to another: up, over and down. */
function arc(from: Vec, to: Vec, progress: number, height: number): Vec {
  const p = clamp(progress, 0, 1)
  return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p - height * Math.sin(Math.PI * p) }
}

export type Exchange = {
  leaving: (Vec & { size: number; alpha: number; sy: number }) | null
  arriving: Vec & { sy: number; size: number; seated: boolean }
  /**
   * How far forward the next one at the door has come, 0 to 1. It is in view from the first moment, a little way up
   * the path behind the one who is going in, and steps up to the door once that one is on the table.
   */
  waitingIn: number
  /** How far in the cart is, 0 to 1: it rolls in behind every newcomer with the new layout, and out first when it stood there. */
  cartIn: number
}

/**
 * The exchange at the door, `since` seconds after the child touched the one
 * who waits or the carrier. The one on the table hops down to the front of
 * the floor, looks on while the newcomer goes past behind it, walks to the
 * door in front of everything and goes out. The newcomer comes in the way
 * its need makes it move, along the back of the floor, and hops up onto the
 * table; the one that is frightened scurries under it instead. The two never
 * share a place: one walks in front of the other.
 */
export function exchange(room: Room, since: number, how: Pick<Coming, 'from' | 'need' | 'first'> & { species?: Species } = { from: 'door', need: null, first: false }): Exchange {
  const lane = room.waiting.y + 76
  const down = { x: room.patient.x - 30, y: lane }, atDoor = { x: room.waiting.x + 26, y: lane }
  // Somebody is always at the door, so the one who leaves goes out past it, in front.
  const out = { x: atDoor.x - 80, y: lane }
  let leaving: Exchange['leaving']
  if (since < 0.7) leaving = { ...arc(room.patient, down, since / 0.7, 70), size: 1 + 0.06 * (since / 0.7), alpha: 1, sy: 1 }
  // It lands and looks on from the front while the newcomer goes past behind it and up.
  else if (since < WALKS_AT) leaving = { ...down, size: 1.06, alpha: 1, sy: 1 - 0.07 * Math.exp(-(since - 0.7) * 7) * Math.cos((since - 0.7) * 16) }
  else if (since < OUT_AT) { const walk = hops(down, atDoor, (since - WALKS_AT) / (OUT_AT - WALKS_AT), 4, 22); leaving = { x: walk.x, y: walk.y, size: 1.06, alpha: 1, sy: 1 - 0.06 * (1 - walk.air) } }
  else if (since < GONE_AT) { const p = (since - OUT_AT) / (GONE_AT - OUT_AT); leaving = { x: atDoor.x + (out.x - atDoor.x) * p, y: atDoor.y + (out.y - atDoor.y) * p, size: 1.06 - 0.3 * p, alpha: 1 - p, sy: 1 } }
  else leaving = null

  const foot = { x: room.patient.x - 196, y: room.waiting.y }
  const hides = how.need === 'scared'
  const small = hides && how.species ? hideSize(room, how.species) : 1
  // Out of the carrier it first hops down to where the one at the door starts from.
  const start = how.from === 'carrier' ? room.carrier : room.waiting
  const walkFrom = 0.15, walkTo = 1.1
  let arriving: Exchange['arriving']
  if (how.from === 'carrier' && since < SEATED_AT) {
    // Out of the carrier it comes down from the shelf in one long hop, over the one who waits: onto the table, or for
    // the frightened one to the table's end and under.
    const p = smooth(since / (hides ? walkTo : SEATED_AT)), grown = 0.8 + 0.2 * p
    // It lands at the table's end, clear of the one who waits at the door.
    const end = { x: room.hide.x - 100, y: room.waiting.y }
    if (!hides) arriving = { ...arc(start, room.patient, p, 70), sy: 1 + 0.06 * Math.sin(Math.PI * p), size: grown, seated: false }
    // It goes sideways first and falls late, so it comes down beside the one who waits and never onto it.
    else if (since < walkTo) arriving = { x: start.x + (end.x - start.x) * Math.sqrt(p), y: start.y + (end.y - start.y) * p * p - 40 * Math.sin(Math.PI * p), sy: 1, size: grown * small + (1 - small) * grown * (1 - p), seated: false }
    else { const q = smooth((since - walkTo) / (SEATED_AT - walkTo)); arriving = { x: end.x + (room.hide.x - end.x) * q, y: end.y + (room.hide.y - end.y) * q, sy: 0.86, size: small, seated: false } }
  } else if (since < walkFrom) arriving = { ...room.waiting, sy: 1 - 0.1 * (since / walkFrom), size: 1, seated: false }
  else if (since < walkTo) {
    const p = (since - walkFrom) / (walkTo - walkFrom)
    // The way its need makes it move: a limp is uneven, a shiver takes many small steps, an itch stops to scratch,
    // a droop drags itself along the floor, a fright runs low.
    const gait: Record<Need | 'none', { count: number; height: number; warp: (p: number) => number; sy: number }> = {
      none: { count: 3, height: 30, warp: (q) => q, sy: 0.93 },
      sore: { count: 3, height: 18, warp: (q) => q + 0.05 * Math.sin(q * TAU * 3), sy: 0.95 },
      cold: { count: 6, height: 9, warp: (q) => q, sy: 0.95 },
      itchy: { count: 3, height: 22, warp: (q) => (q < 0.4 ? q / 0.4 * 0.5 : q < 0.6 ? 0.5 : 0.5 + (q - 0.6) / 0.4 * 0.5), sy: 0.94 },
      thirsty: { count: 2, height: 5, warp: (q) => q * q * (3 - 2 * q), sy: 0.88 },
      scared: { count: 5, height: 6, warp: (q) => 1 - (1 - q) * (1 - q), sy: 0.84 },
    }
    const way = gait[how.need ?? 'none']
    const walk = hops(room.waiting, foot, way.warp(p), way.count, way.height)
    arriving = { x: walk.x, y: walk.y, sy: way.sy + (1 - way.sy) * walk.air, size: 1 - (1 - small) * p, seated: false }
  } else if (since < SEATED_AT) {
    const p = (since - walkTo) / (SEATED_AT - walkTo)
    // The frightened one does not go up: it slips under the table from its end.
    arriving = hides ? { x: foot.x + (room.hide.x - foot.x) * smooth(p), y: foot.y + (room.hide.y - foot.y) * smooth(p), sy: 0.86, size: small, seated: false } : { ...arc(foot, room.patient, p, 120), sy: 1.06, size: 1, seated: false }
  } else arriving = hides ? { ...room.hide, sy: 1, size: small, seated: true } : { ...room.patient, sy: 1, size: 1, seated: true }
  return { leaving, arriving, waitingIn: how.from === 'carrier' ? 1 : smooth((since - SEATED_AT) / NEXT_STEPS_UP), cartIn: cartInAt(since, how.first) }
}

/** A place on a figure, carried along by the figure's own pose: an offset from where it stands, squashed and turned with it. */
function onFigure(base: Vec, pose: Pose, size: number, ox: number, oy: number, ride = 1): Vec & { rot: number } {
  const turn = pose.rot * ride
  const sx = (1 + (pose.sx - 1) * ride) * size, sy = (1 + (pose.sy - 1) * ride) * size
  const px = ox * sx, py = oy * sy
  return { x: base.x + pose.x * ride + px * Math.cos(turn) - py * Math.sin(turn), y: base.y + pose.y * ride + px * Math.sin(turn) + py * Math.cos(turn), rot: turn }
}

/** The fine shake of a shiver or a tremble, from the time. */
function shaken(pose: Pose, shake: number, t: number): Pose {
  if (shake <= 0) return pose
  return { ...pose, x: pose.x + shake * (1.5 * Math.sin(TAU * 11.3 * t) + 0.8 * Math.sin(TAU * 17.9 * t + 1)), rot: pose.rot + shake * 0.011 * Math.sin(TAU * 13.1 * t + 2) }
}

/** The parts of a sign laid on a figure that stands at `base` in `pose`. */
function parts(items: Item[], room: Room, species: Species, base: Vec, pose: Pose, size: number, show: Show, alpha: number, t: number, hand: Vec | null = null): void {
  const body = room.bodies[species], a = body.anchors
  const put = (part: PartName, ox: number, oy: number, rot = 0, scale = 1, fade = 1) => {
    const at = onFigure(base, pose, size, ox, oy)
    items.push({ kind: 'part', part, species, x: at.x, y: at.y, rot: at.rot + rot, sx: size * scale, sy: size * scale, alpha: alpha * fade })
  }
  if (show.arms > 0.02) put('arms', a.lap.x, (a.lap.y + a.mouth.y) / 2 + 12, 0, 1, clamp(show.arms, 0, 1))
  const burrs: readonly (readonly [number, number, number])[] = [[-body.w * 0.2, -body.h * 0.42, 0.3], [body.w * 0.22, -body.h * 0.3, -0.5], [-body.w * 0.04, -body.h * 0.18, 1.1]]
  for (let n = 0; n < burrs.length; n++) {
    const there = clamp(show.burrs - n, 0, 1)
    // A burr that is coming out flies up and away as it goes.
    if (there > 0.02) put('burr', burrs[n][0] + (1 - there) * 46 * (n % 2 ? 1 : -1), burrs[n][1] - (1 - there) * 60, burrs[n][2] + (1 - there) * 3, 1, there)
  }
  if (show.tongue > 1.5) {
    // The long tongue hangs right down to what the animal sits on, however tall the animal: it is drawn as long as that.
    const root = onFigure(base, pose, size, a.mouth.x, a.mouth.y + 4)
    // On a small animal whose mouth is near the table it is shorter than it is drawn, but never shorter than the short tongue.
    const long = clamp((base.y - 2 - root.y) / (TONGUE_LONG * size), 0.6, 2.6)
    items.push({ kind: 'part', part: 'tongue2', species, x: root.x, y: root.y, rot: root.rot * 0.3 + 0.04 * Math.sin(t * 5), sx: size, sy: size * long, alpha })
  } else if (show.tongue > 0.3) put('tongue1', a.mouth.x, a.mouth.y + 4, 0.06 * Math.sin(t * 5))
  if (show.puff > 0.02) put('puff', a.mouth.x + body.w * 0.14 + 14 * show.puff, a.mouth.y - 6 - 10 * show.puff, 0, 0.7 + 0.5 * show.puff, clamp(1.3 - show.puff, 0, 1) * clamp(show.puff * 4, 0, 1))
  // A paw that is dipped goes to the bowl in the animal's lap, wherever its side is: wrist over the water, paw down in it.
  const dip = clamp(show.dip, 0, 1), inBowl = { x: a.lap.x - 6, y: a.lap.y - 74 }
  // A paw that is laid in the hand goes to where the finger is, as far as a paw can reach from the animal's side.
  const reach = hand ? clamp(show.reach, 0, 1) : 0
  const toHand = hand ? { x: clamp(hand.x, a.side.x - 30, a.side.x + PAW_REACH), y: clamp(hand.y + 30, a.side.y - PAW_REACH * 0.6, -20) } : { x: 0, y: 0 }
  const pawAt = { x: a.side.x + show.pawX + (inBowl.x - a.side.x - show.pawX) * dip, y: a.side.y + show.pawY + (inBowl.y - a.side.y - show.pawY) * dip }
  if (show.paw > 0) put('paw', pawAt.x + (toHand.x - pawAt.x) * reach, pawAt.y + (toHand.y - pawAt.y) * reach, show.pawRot + (DIPPED - show.pawRot) * dip)
  // A hind foot thumping the table: out past the animal's side, lying flat, lifted and brought down.
  else if (show.foot > 0.5) put('paw', -body.w * 0.4, -8 - 22 * clamp(show.foot - 1, 0, 1), -1.45 + 0.35 * clamp(show.foot - 1, 0, 1))
}

const still = (key: ThingKey): Held => ({ from: key, to: key, by: 1, rot: key.rot, size: key.size, front: key.front, ride: 1 })

/** The things an animal in the garden took with it, drawn small at its feet so its face stays clear. */
function kept(items: Item[], room: Room, entry: Kept, at: Vec, alpha: number): void {
  const half = (room.bodies[entry.species].w / 2) * GARDEN_SIZE
  entry.keeps.forEach((care, index) => {
    const side = index === 0 ? 1 : -1, small = GARDEN_SIZE * (care === 'blanket' ? 0.34 : 0.62)
    items.push({ kind: 'thing', care, look: care === 'blanket' ? 'open' : care === 'plaster' ? 'one' : 'whole', x: at.x + side * (half + 4), y: at.y - (care === 'blanket' ? 0 : 14), rot: side * (care === 'plaster' ? 0.4 : 0.12), sx: small, sy: small, alpha, kept: true })
  })
}

/** What the animal does once it is well, for progress 0 to 1 of each part of the well scene. */
function featPose(need: Need, p: number): Pose {
  const up = Math.sin(Math.PI * p)
  switch (need) {
    // The one that limped leaps.
    case 'sore': return { ...REST, y: -86 * Math.sin(Math.PI * Math.min(1, p * 1.25)), sy: 1 + 0.08 * up, rot: 0.25 * Math.sin(TAU * Math.min(1, p * 1.25)), face: 'glad' }
    // The one that shook stretches out loose.
    case 'cold': return { ...REST, sx: 1 + 0.12 * up, sy: 1 - 0.05 * up + 0.08 * Math.max(0, Math.sin(Math.PI * (p * 2 - 1))), rot: 0.05 * Math.sin(TAU * p), face: 'bliss' }
    // The one that scratched lies still.
    case 'itchy': return { ...REST, y: 5 * smooth(p * 3), sy: 1 - 0.07 * smooth(p * 3), sx: 1 + 0.04 * smooth(p * 3), face: 'bliss' }
    // The one that drooped stands tall.
    case 'thirsty': return { ...REST, y: -10 * up, sy: 1 + 0.13 * up, sx: 1 - 0.04 * up, face: 'glad' }
    // The one that hid comes out: the path is laid by the caller.
    case 'scared': return { ...REST, sy: 1 + 0.06 * up, face: p > 0.5 ? 'glad' : 'wow' }
  }
}

/**
 * What the one at the door does with a thing held out to it, `age` seconds
 * after it was let go there. One that loves the thing bounces three times and
 * sways; one that is wary of it leans well away and shudders; any other gives
 * it one hop. A thing that would fit its need is sniffed, head down, and then
 * nosed back toward the table with a push. `face` is its sign's face, kept
 * when it has a need.
 */
function doorPose(manner: Taste | 'nosed', age: number, face: Face | null): Pose {
  const up = (p: number) => Math.sin(Math.PI * clamp(p, 0, 1))
  switch (manner) {
    case 'nosed': {
      const sniff = up(age / NOSED.sniff), push = up((age - NOSED.sniff) / NOSED.back)
      return { ...REST, x: 10 * sniff + 22 * push, y: 8 * sniff + 4 * push, rot: 0.14 * sniff + 0.2 * push, sy: 1 - 0.05 * sniff, face: face ?? 'calm' }
    }
    case 'loves':
      return { ...REST, y: -30 * Math.abs(Math.sin(age * 6.5)) * Math.exp(-age * 1.3), rot: 0.09 * Math.sin(age * 9) * Math.exp(-age * 1.5), sy: 1 + 0.06 * Math.exp(-age * 2), face: face ?? 'bliss' }
    case 'wary': {
      const away = up(age / 1.5)
      return { ...REST, x: -18 * away, rot: -0.13 * away + 0.035 * Math.sin(age * 34) * Math.exp(-age * 2.5), sy: 1 - 0.04 * away, face: face ?? 'wary' }
    }
    case 'plain':
      return { ...REST, y: -26 * Math.abs(Math.sin(age * 7)) * Math.exp(-age * 2.2), sy: 1 + 0.05 * Math.exp(-age * 3), face: face ?? 'glad' }
  }
}

/** Where a cell's thing key holds its thing. */
function cellPlace(room: Room, species: Species, key: CellThing, base: Vec, show: Show, resting: Vec | null): Vec {
  if (resting) return resting
  const at: CellAnchor = key.at
  if (at === 'edge') return { x: room.hide.x - 150 + key.dx, y: room.hide.y - 44 + key.dy }
  if (at === 'over') return { x: room.patient.x + key.dx, y: room.patient.y - 52 + key.dy }
  const a = room.bodies[species].anchors
  const anchor = at === 'seat' ? { x: 0, y: 0 } : at === 'paw' ? { x: a.side.x + show.pawX, y: a.side.y + show.pawY } : a[at]
  return { x: base.x + anchor.x + key.dx, y: base.y + anchor.y + key.dy }
}

/**
 * The frame at this moment. `guide` is what the idle ladder says to show:
 * a glow on what can be touched now, then the ghost hand showing one move.
 */
export function scene(toy: Toy, room: Room, garden: Garden, guide: Guidance | null, scratch: HandPose = { travel: 0, press: 0, opacity: 0 }): Item[] {
  const items: Item[] = []
  const { clinic, t } = toy
  const table = clinic.table, seed = clinic.seed % 1000
  const coming = toy.coming ? exchange(room, toy.coming.since, { ...toy.coming, species: toy.coming.arriving }) : null
  const act = toy.act

  // The lamp sways, swings when it is knocked, and dims a little while a frightened one rests.
  const dimAge = t - toy.dimmedAt, dim = clamp(dimAge / 0.6, 0, 1) * clamp((4.2 - dimAge) / 0.8, 0, 1)
  items.push({ kind: 'lamp', rot: 0.012 * Math.sin(t * 0.7) + 0.13 * Math.exp(-(t - toy.lampKnocked) * 2.2) * Math.sin((t - toy.lampKnocked) * 7), alpha: 1 - 0.45 * dim })

  // The garden: the last three, oldest first. The newest pops up once the one who left is out of the door.
  clinic.garden.forEach((entry, index) => {
    const newest = toy.coming?.leaving && index === clinic.garden.length - 1
    const grown = newest ? clamp((toy.coming!.since - GONE_AT) / 0.4, 0, 1) : 1
    if (grown <= 0) return
    const at = garden[index % garden.length], life = idle(entry.species, t + index * 3.1, seed + index + 11)
    const size = GARDEN_SIZE * (0.6 + 0.4 * grown + 0.12 * Math.sin(Math.PI * grown))
    items.push({ kind: 'figure', who: 'garden', species: entry.species, x: at.x + life.x * GARDEN_SIZE, y: at.y + life.y * GARDEN_SIZE, rot: life.rot, sx: life.sx, sy: life.sy, face: life.face, shut: blinking(entry.species, t, seed + index + 11), size, alpha: grown, hang: 0 })
    kept(items, room, entry, at, grown)
  })

  // The carrier on its shelf, shut, with two eyes at its window. When its own patient comes in, the open one
  // slides out and a shut one slides in where it stood, before the patient is on the table.
  const fromCarrier = toy.coming?.from === 'carrier' ? toy.coming.since : null
  if (clinic.carrier || fromCarrier !== null) {
    items.push({ kind: 'part', part: 'shelf', species: null, x: room.carrier.x, y: room.carrier.y, rot: 0, sx: 1, sy: 1, alpha: 1 })
    if (fromCarrier !== null && fromCarrier < 1.2) items.push({ kind: 'part', part: 'carrierOpen', species: null, x: room.carrier.x - 260 * smooth((fromCarrier - 0.5) / 0.6), y: room.carrier.y, rot: 0, sx: 1, sy: 1, alpha: 1 })
    if (clinic.carrier) {
      const slide = fromCarrier === null ? 1 : smooth((fromCarrier - 0.9) / 0.7)
      const blink = t - toy.carrierBlinked, rock = 0.07 * Math.exp(-blink * 4) * Math.sin(blink * 18)
      const x = room.carrier.x - 260 * (1 - slide)
      if (slide > 0) {
        items.push({ kind: 'part', part: 'carrier', species: null, x, y: room.carrier.y, rot: rock, sx: 1, sy: 1, alpha: 1 })
        items.push({ kind: 'part', part: blink < 0.16 || blinking(clinic.carrier.species, t, seed + 31) ? 'eyesShut' : 'eyes', species: null, x: x + 3 * Math.sin(t * 0.9), y: room.carrier.y - 62, rot: rock, sx: 0.8, sy: 0.8, alpha: 1 })
      }
    }
  }

  // Nothing of the cart is there before the first patient: it rolls in behind it.
  const cartIn = table ? (coming ? coming.cartIn : 1) : 0
  const cartX = (1 - cartIn) * CART_OUT
  const cart = table?.cart ?? []
  if (cartIn > 0) items.push({ kind: 'cart', x: cartX })

  /** The thing that was put on another is in the air for the first moment of their secret, and where it lies again after that. */
  const flying = (care: Care) => act.secret !== null && act.secret.one === care && act.secret.p < SECRET_FLIGHT
  const lying = (care: Care, places: readonly string[]) => care !== 'plaster' && places.includes(clinic.things[care]) && toy.cell?.track.given !== care && !flying(care) && lies(toy, room, care)
  /** A thing lying somewhere, with what was made of it: the den for the basket under the blanket, foam and a boat on the bowl, patches on the blanket. */
  const lay = (care: Care, lying: Vec, wiggle = 0) => {
    // A thing that was let go, or nosed back, is still on its way to where it lies.
    // The sheet of plasters never leaves the cart: only the one plaster that came off it slides.
    const slide = care === 'plaster' ? undefined : toy.slides[care], slid = slide ? smooth((t - slide.since - slide.wait) / slide.lasts) : 1
    const at = slide ? { x: slide.from.x + (lying.x - slide.from.x) * slid, y: slide.from.y + (lying.y - slide.from.y) * slid } : lying
    const pop = act.secret && (act.secret.other === care || act.secret.one === care) ? 1 + 0.18 * Math.sin(Math.PI * clamp(act.secret.p * 6, 0, 1)) : 1
    const twitch = care === 'blanket' && (clinic.made.crackle || act.secret?.kind === 'crackle') ? 2.2 * Math.sin(TAU * 9 * t) * (act.secret?.kind === 'crackle' ? 1 : 0.25 * Number((t % 2.4) < 0.4)) : 0
    if (care === 'basket' && clinic.made.den) items.push({ kind: 'part', part: 'den', species: null, x: at.x, y: at.y + 6, rot: wiggle, sx: pop * 0.8, sy: pop * 0.8, alpha: 1 })
    else if (care === 'blanket' && clinic.things.blanket === 'on-basket') return
    else items.push({ kind: 'thing', care, look: 'whole', x: at.x + twitch, y: at.y, rot: wiggle, sx: pop, sy: pop, alpha: 1 })
  }
  for (const care of cart) {
    const at = lying(care, ['floor-left', 'floor-right'])
    if (at) lay(care, at, act.glance?.care === care ? 0.2 * Math.sin(TAU * act.glance.p * 2) : 0)
  }

  // --- The animal on the table ------------------------------------------------
  const tableAt = items.length
  if (table) {
    const species = table.species, body = room.bodies[species]
    const arrived = !coming || coming.arriving.seated
    const shown = showingNeed(table)
    // The sign under a cell is the cell's own need, also once the rules have marked it met.
    const signOf = toy.cell ? table.needs.find((entry) => entry.need === toy.cell!.track.need) ?? shown : shown
    const signed = signOf && (toy.cell || shown) ? sign(species, signOf.need, signOf.step, t, seed) : null
    const cellNow = toy.cell && signed && toy.cell.since >= 0 ? sampleCell(toy.cell.track, species, toy.cell.since, signed) : null
    const played = !signed && toy.playing && toy.playing.since >= 0 ? sample(toy.playing.reaction, species, toy.playing.since) : null
    const rock = jolt(species, t - toy.landedAt)
    const landing: Pose = { ...REST, rot: rock.rot, sx: rock.sx, sy: rock.sy }

    let pose: Pose, show: Show = { ...NO_SHOW }
    const hidesNow = toy.hid
    if (cellNow) {
      pose = add(landing, cellNow.pose)
      show = cellNow.show
      // A thing that does not fit plays its cell in this animal's manner: the one that loves the thing enjoys it for a
      // moment before the need comes back, the one that is wary of it ducks it. The manner never helps and never
      // looks like a sign.
      const given = toy.cell!.track.given
      if (given !== 'hand' && !helps(given, toy.cell!.track.need)) {
        const manner = taste(species, given), early = Math.sin(Math.PI * clamp(toy.cell!.since / 0.7, 0, 1))
        if (manner === 'loves' && early > 0) pose = add(pose, { ...REST, y: -6 * early, sy: 1 + 0.04 * early, face: toy.cell!.since < 0.7 ? 'bliss' : 'calm' })
        if (manner === 'wary' && early > 0) pose = add(pose, { ...REST, x: -9 * early, rot: -0.08 * early, face: toy.cell!.since < 0.7 ? 'wary' : 'calm' })
      }
      // The hand's cell is written for a finger on the right: for one on the left it is turned round, so the animal
      // leans to the hand, wherever on it the hand is.
      if (given === 'hand' && signed && toy.touched && toy.touched.at.x < 0 && !hidesNow) pose = { ...pose, x: signed.pose.x - (pose.x - signed.pose.x), rot: signed.pose.rot - (pose.rot - signed.pose.rot) }
      // A stroke on the spot it loves or on the one that makes it squirm: for a moment it melts, or it wriggles,
      // and then the stroke is the stroke of its need again. The manner never looks like a sign.
      if (given === 'hand' && toy.touched && toy.touched.manner !== 'leans') {
        const age = t - toy.touched.since, early = Math.sin(Math.PI * clamp(age / TOUCHED_SECONDS, 0, 1))
        if (toy.touched.manner === 'loved') pose = add(pose, { ...REST, y: 5 * early, sx: 1 + 0.05 * early, sy: 1 - 0.04 * early, face: early > 0.15 ? 'bliss' : 'calm' })
        else pose = add(pose, { ...REST, rot: 0.09 * Math.sin(age * 38) * early, y: -5 * early, face: early > 0.15 ? 'wow' : 'calm' })
      }
      // The taste decides how an animal takes the care that fits. One that is wary of the bowl and is thirsty does not
      // put its face to the water: it dips a paw and licks it, again and again, and is helped all the same.
      if (given === 'bowl' && helps(given, toy.cell!.track.need) && taste(species, given) === 'wary' && cellNow.signLeft >= 1) {
        const a = body.anchors, dip = Math.sin(toy.cell!.since * 6.5), up = (dip + 1) / 2
        const inBowl = { x: a.lap.x - a.side.x - 8, y: a.lap.y - 14 - a.side.y }, atMouth = { x: a.mouth.x - a.side.x - 12, y: a.mouth.y + 16 - a.side.y }
        pose = { ...pose, y: pose.y * 0.25, rot: pose.rot * 0.35, sy: 1 + (pose.sy - 1) * 0.4, face: up > 0.6 ? 'bliss' : 'wary' }
        show = { ...show, paw: 1, pawX: inBowl.x + (atMouth.x - inBowl.x) * up, pawY: inBowl.y + (atMouth.y - inBowl.y) * up, pawRot: 0.9 - 0.5 * up, tongue: up > 0.75 ? 1 : 0 }
      }
    }
    // A care has just helped and another need is left: for a moment it plays with the thing that helped, in the
    // manner of its taste, and nothing of a sign is on it; then the need that is left has it again.
    else if (toy.aside) pose = add(landing, flourishPose(species, toy.aside.taste, (t - toy.aside.since) / WELL.flourish))
    else if (signed) { pose = add(landing, signed.pose); show = signed.show }
    else if (played) {
      pose = add(landing, played.animal)
      // A paw it uses in a reaction of its own: the cat's one paw, dipped in the bowl and shaken dry.
      if (played.paw) show = { ...show, paw: 1, pawX: played.paw.x, pawY: played.paw.y, pawRot: played.paw.rot }
    }
    else {
      pose = add(idle(species, t, seed), landing)
      // A held breath while it checks itself: drawn up a little and quite still, eyes wide.
      if (act.check) { const held = Math.sin(Math.PI * Math.min(1, act.check.p * 1.6)); pose = add(landing, { ...REST, y: -4 * held, sy: 1 + 0.045 * held, sx: 1 - 0.02 * held, face: 'wow' }) }
      // It sits down, well, with a small settle, and looks about: one way, then the other.
      else if (act.sits) { const p = act.sits.p, down = Math.sin(Math.PI * clamp(p / 0.3, 0, 1)); pose = add(landing, { ...REST, y: 5 * down, sy: 1 - 0.05 * down, sx: 1 + 0.03 * down, rot: 0.07 * Math.sin(TAU * clamp((p - 0.25) / 0.75, 0, 1)), face: 'glad' }) }
      else if (act.feat) pose = add(landing, featPose(act.feat.need, act.feat.p))
      else if (act.flourish) pose = add(landing, flourishPose(species, act.flourish.taste, act.flourish.p))
      else if (act.glance) {
        // A plaster that did not fit lies at an end of the table, not on its sheet: the glance goes there.
        const stuck = [...clinic.things.plasters].reverse().find((spot) => spot === 'table' || spot === 'table-far')
        const there = act.glance.care === 'plaster' && stuck ? plasterOnTable(room, stuck === 'table-far') : lies(toy, room, act.glance.care) ?? room.spots['table-left']
        pose = add(pose, { ...REST, rot: clamp((there.x - room.patient.x) / 1400, -0.1, 0.1) * Math.sin(Math.PI * act.glance.p), face: act.glance.p < 0.5 ? 'wow' : 'glad' })
      }
      else if (act.secret) {
        // Two things have made something: the animal on the table looks over at it with a start, and then takes it
        // in the manner of its taste for the thing that was put on the other, with its own flourish.
        const at = lies(toy, room, act.secret.other) ?? room.cart[act.secret.other], p = act.secret.p
        const look = Math.sin(Math.PI * clamp((p - 0.06) / 0.24, 0, 1))
        pose = p < 0.3 ? add(pose, { ...REST, rot: clamp((at.x - room.patient.x) / 1400, -0.1, 0.1) * look, sy: 1 + 0.03 * look, face: look > 0.2 ? 'wow' : pose.face })
          : p < 0.64 ? add(landing, flourishPose(species, taste(species, act.secret.one), (p - 0.3) / 0.34)) : pose
      }
      else if (toy.stroking) pose = add(pose, stroked(species, toy.stroking.manner, t - toy.stroking.since, toy.stroking.side, toy.stroking.letGo < 0 ? -1 : t - toy.stroking.letGo))
      else if (toy.hand || toy.flights.length > 0) {
        // It turns to the thing that is coming: a start, then gladness.
        const thing = toy.hand ? toy.hand.at : toy.flights[0].from, age = toy.hand ? t - toy.hand.since : 1
        pose = add(pose, { ...REST, rot: clamp((thing.x - room.patient.x) / 2600, -0.09, 0.09), sy: 1 + 0.03 * Math.exp(-age * 6), face: age < 0.35 ? 'wow' : 'glad' })
      }
    }
    // Fur on end from the crackling blanket: short-lived, and gone before it could be saved.
    if (t < toy.furUntil) show = { ...show, fur: Math.max(show.fur, clamp(toy.furUntil - t, 0, 1)) }
    // With a need, it only turns to what two things have made: its sign stays as it is.
    if (signed && !cellNow && !toy.aside && act.secret) { const at = lies(toy, room, act.secret.other) ?? room.cart[act.secret.other]; pose = add(pose, { ...REST, rot: clamp((at.x - room.patient.x) / 1400, -0.1, 0.1) * Math.sin(Math.PI * clamp((act.secret.p - 0.06) / 0.4, 0, 1)) }) }
    // A waiting animal with a hand or a thing coming still shows its sign, and turns to it a little.
    if (signed && !cellNow && !toy.aside && (toy.hand || toy.flights.length > 0)) pose = add(pose, { ...REST, rot: clamp(((toy.hand?.at.x ?? room.cart.bowl.x) - room.patient.x) / 3000, -0.06, 0.06) })
    pose = shaken(pose, show.shake, t)

    // Where it is: on the table, or in its hiding place under it, small and leaning out of the dark. While it comes
    // in, the exchange says where; a well scene brings the one that hid out itself.
    const hiding = arrived ? toy.hid || act.under : show.under > 0
    const small = hideSize(room, species)
    // With two needs of which one is fear, it changes place between them, and is seen to go.
    const shift = arrived && !act.feat && !toy.scene && t - toy.hidAt < SHIFT_SECONDS ? (t - toy.hidAt) / SHIFT_SECONDS : null
    let base: Vec = room.patient, size = 1
    if (!arrived) { base = coming!.arriving; size = coming!.arriving.size; pose = shaken({ ...REST, sy: coming!.arriving.sy, face: signed ? signed.pose.face : 'glad' }, show.shake * 0.6, t) }
    else if (shift !== null) {
      const foot = { x: room.patient.x - 196, y: room.waiting.y }
      if (toy.hid) {
        // Down from the table to its end in one hop, then low and quick in under it, small.
        base = shift < 0.5 ? arc(room.patient, foot, shift / 0.5, 70) : { x: foot.x + (room.hide.x - foot.x) * smooth((shift - 0.5) / 0.5), y: foot.y + (room.hide.y - foot.y) * smooth((shift - 0.5) / 0.5) }
        size = 1 - (1 - small) * smooth((shift - 0.4) / 0.3)
      } else {
        // Out from under the table to its end, and up onto it: its own size again only once it is out.
        base = shift < 0.45 ? { x: room.hide.x + (foot.x - room.hide.x) * smooth(shift / 0.45), y: room.hide.y + (foot.y - room.hide.y) * smooth(shift / 0.45) } : arc(foot, room.patient, (shift - 0.45) / 0.55, 120)
        size = small + (1 - small) * smooth((shift - 0.45) / 0.25)
      }
      // On its way it carries nothing of a sign but its face.
      pose = { ...REST, sy: 0.92 + 0.08 * Math.abs(Math.sin(Math.PI * 4 * shift)), face: pose.face }
      show = { ...NO_SHOW, fur: show.fur }
    }
    else if (act.feat?.need === 'scared') {
      // It comes out: from under the table to its end, and up onto it.
      const p = act.feat.p, foot = { x: room.patient.x - 196, y: room.waiting.y }
      base = p < 0.45 ? { x: room.hide.x + (foot.x - room.hide.x) * smooth(p / 0.45), y: room.hide.y + (foot.y - room.hide.y) * smooth(p / 0.45) } : arc(foot, room.patient, (p - 0.45) / 0.55, 120)
      // It is its own size again only once it is out from under the table.
      size = small + (1 - small) * smooth((p - 0.45) / 0.25)
    } else if (hiding && shift === null) {
      // Under the table there is no room to rise: a stretch there is a small one.
      base = { x: room.hide.x - 56 * show.out, y: room.hide.y }, size = small
      pose = { ...pose, y: Math.max(pose.y, -3), sy: Math.min(pose.sy, 1.03) }
    }
    // Whether it is in the dark now: not once it has stepped out, and on its way under only once it is there.
    const underNow = shift !== null ? (toy.hid ? shift > 0.72 : shift < 0.25) : hiding && !(act.feat?.need === 'scared' && act.feat.p > 0.25)

    // What lies on the animal, but not the thing of the cell that is playing: its keys hold that one.
    const worn = cart.filter((care) => care !== 'plaster' && clinic.things[care] === 'patient' && toy.cell?.track.given !== care && lies(toy, room, care))
    const holdOf = (care: Care): Held => (toy.playing?.reaction.care === care && played ? played.thing : still(wornAt(species, care)))
    const wornItem = (care: Care): Item => {
      const held = holdOf(care)
      const from = onBodyAt(room, species, held.from), to = onBodyAt(room, species, held.to)
      const low = care === 'blanket' ? (1 - clamp(body.h / 256, 0.55, 1)) * 60 : 0
      const at = onFigure(base, pose, size, from.x + (to.x - from.x) * held.by, from.y + (to.y - from.y) * held.by + low, held.ride)
      const covers = care === 'blanket' && toy.playing?.reaction.care === care && played?.covers
      // Spread over the animal it is as large as the animal; lying in its lap it is small enough to leave the face clear.
      const lap = care === 'blanket' ? clamp(body.h / 256, 0.55, 1) : 1
      const fit = covers ? { sx: (body.w * 1.14) / BLANKET_OPEN.w, sy: (body.h * 1.06) / BLANKET_OPEN.h } : { sx: held.size * lap * size, sy: held.size * lap * size }
      // Nosed back from the door onto the animal it lay on, it is seen to come back.
      const slide = toy.slides[care], slid = slide ? smooth((t - slide.since - slide.wait) / slide.lasts) : 1
      const x = slide ? slide.from.x + (at.x - slide.from.x) * slid : at.x, y = slide ? slide.from.y + (at.y - slide.from.y) * slid : at.y
      return { kind: 'thing', care, look: care === 'blanket' ? 'open' : 'whole', x, y, rot: held.rot + at.rot, sx: fit.sx * (covers ? pose.sx : 1), sy: fit.sy * (covers ? pose.sy : 1), alpha: 1 }
    }
    // The thing of the cell that is playing: where its keys hold it, and at the end of a cell that did not help, where it lies.
    const cellThing = (front: boolean): void => {
      // A heavy animal answers a moment late; the thing is where the cell first has it from the frame it lands.
      const held: HeldInCell | null = cellNow?.thing ?? (toy.cell && signed ? sampleCell(toy.cell.track, species, 0, signed).thing : null)
      if (!held || !toy.cell || held.front !== front) return
      const care = toy.cell.track.given as Care, track = toy.cell.track
      const last = track.thing[track.thing.length - 1]
      // Where it lies when the cell is over: a plaster on the table's end, tipped as it will lie there.
      const rests = care === 'plaster' && !helps(care, track.need) ? plasterOnTable(room, clinic.things.plasters[clinic.things.plasters.length - 1] === 'table-far') : null
      const resting = helps(care, track.need) ? null : rests ?? lies({ ...toy, cell: null } as Toy, room, care)
      const tip = rests ? rests.rot * (held.from === last ? 1 : held.to === last ? held.by : 0) : 0
      // Every key at which the thing has come to rest beside the animal is at the place where it will lie, which
      // need not be the near end of the table: so it goes straight there and never to one end and then the other.
      const atRest = (key: CellThing) => key === last || (key.at === last.at && key.dx === last.dx && key.dy === last.dy)
      const from = cellPlace(room, species, held.from, base, show, atRest(held.from) ? resting : null)
      const to = cellPlace(room, species, held.to, base, show, atRest(held.to) ? resting : null)
      const rides = held.to.at === 'edge' || held.to.at === 'over' || atRest(held.to) && resting ? 0 : held.ride
      const at = onFigure({ x: 0, y: 0 }, pose, 1, 0, 0, rides)
      const x = from.x + (to.x - from.x) * held.by + at.x, y = from.y + (to.y - from.y) * held.by + at.y
      const open = care === 'blanket' && track.open, covers = open && (cellNow ? cellNow.covers : track.coversUntil > 0)
      // Spread over the animal, it is the animal's shape: it heaves and sinks with whoever is under it.
      const fit = covers ? { sx: ((body.w * 1.14) / BLANKET_OPEN.w) * pose.sx, sy: ((body.h * 1.06) / BLANKET_OPEN.h) * pose.sy } : { sx: held.size, sy: held.size }
      items.push(asDen(clinic.made.den, { kind: 'thing', care, look: care === 'plaster' ? 'one' : open ? 'open' : 'whole', x, y, rot: held.rot + at.rot + tip, sx: fit.sx, sy: fit.sy, alpha: 1 }))
      // Rings spread in the bowl: two at a time, one behind the other, on the water where it shows.
      if (care === 'bowl' && show.rings > 0.02) for (const lag of [0, 0.5]) items.push({ kind: 'ripple', x, y: y - 18 * fit.sy, age: (t * 1.3 + lag) % 1, size: fit.sx, alpha: clamp(show.rings, 0, 1) })
    }

    if (arrived) for (const care of worn) if (!holdOf(care).front) items.push(asDen(clinic.made.den, wornItem(care)))
    cellThing(false)
    const seen = !played?.hidden && !cellNow?.hidden
    // Each animal hides in its own body: a frightened hedgehog is a ball of spines, and uncurls only to peek.
    const curled = species === 'hedgehog' && underNow && arrived && show.out < 0.2 && !act.feat && shift === null
    // The curled hedgehog's spines bristle too: the ring stands out behind the ball.
    if (seen && curled && show.fur > 0.02) items.push({ kind: 'part', part: 'fur', species, x: base.x + pose.x * size, y: base.y + pose.y * size, rot: pose.rot + 0.03 * Math.sin(TAU * 7 * t) * show.fur, sx: pose.sx * size * (0.86 + 0.14 * show.fur), sy: pose.sy * size * (0.86 + 0.14 * show.fur), alpha: clamp(show.fur * 2, 0, 1) })
    if (seen && curled) items.push({ kind: 'part', part: 'ball', species, x: base.x + pose.x * size, y: base.y + pose.y * size, rot: pose.rot + 0.5 * Math.sin(t * 0.8), sx: pose.sx * size, sy: pose.sy * size, alpha: 1 })
    else if (seen) {
      // Fur on end stands out behind the animal, all round it, and shivers with it.
      if (show.fur > 0.02) items.push({ kind: 'part', part: 'fur', species, x: base.x + pose.x * size, y: base.y + pose.y * size, rot: pose.rot + 0.03 * Math.sin(TAU * 7 * t) * show.fur, sx: pose.sx * size * (0.86 + 0.14 * show.fur), sy: pose.sy * size * (0.86 + 0.14 * show.fur), alpha: clamp(show.fur * 2, 0, 1) })
      items.push({ kind: 'figure', who: 'patient', species, x: base.x + pose.x * size, y: base.y + pose.y * size, rot: pose.rot, sx: pose.sx, sy: pose.sy, face: pose.face, shut: blinking(species, t, seed), size, alpha: 1, hang: Math.round(show.ears) })
    }
    if (seen && !curled) parts(items, room, species, base, { ...pose, x: pose.x * size, y: pose.y * size }, size, show, 1, t, toy.touched?.at ?? null)
    // A foam beard from a foamy bowl: short-lived.
    if (seen && t < toy.beardUntil) { const chin = onFigure(base, pose, size, body.anchors.mouth.x, body.anchors.mouth.y + 8); items.push({ kind: 'part', part: 'beard', species: null, x: chin.x, y: chin.y, rot: chin.rot, sx: size, sy: size, alpha: clamp(toy.beardUntil - t, 0, 1) }) }
    if (arrived) {
      for (const care of worn) if (holdOf(care).front) items.push(asDen(clinic.made.den, wornItem(care)))
      // The plaster that helped a sore paw stays on that paw: it is rebuilt from the need marked met.
      const healed = table.needs.some((entry) => entry.need === 'sore' && entry.met) && !(toy.cell?.track.given === 'plaster')
      if (healed) { const at = onFigure(base, pose, size, body.anchors.side.x, body.anchors.side.y + 6); items.push({ kind: 'thing', care: 'plaster', look: 'one', x: at.x, y: at.y, rot: at.rot + 0.5, sx: 0.8 * size, sy: 0.8 * size, alpha: 1 }) }
      // Plasters stuck on the animal in play: the one a reaction is playing with, or up to two.
      const stuck = clinic.things.plasters.filter((spot) => spot === 'patient').length
      for (let index = 0; index < stuck; index++) {
        const newest = index === stuck - 1
        const held = newest && toy.playing?.reaction.care === 'plaster' && played ? played.thing : still(wornAt(species, 'plaster'))
        const from = onBodyAt(room, species, held.from), to = onBodyAt(room, species, held.to)
        // Beside a paw that wears the plaster that helped it, one stuck on in play lies clear of that paw.
        const wornX = from.x + (to.x - from.x) * held.by, wornY = from.y + (to.y - from.y) * held.by
        const clear = healed && Math.abs(wornY - body.anchors.side.y) < 70 ? Math.max(0, body.anchors.side.x + PLASTER_CLEAR - wornX) : 0
        const at = onFigure(base, pose, size, wornX + clear, wornY, held.ride)
        if (newest) items.push({ kind: 'thing', care: 'plaster', look: 'one', x: at.x, y: at.y, rot: held.rot + at.rot, sx: held.size * size, sy: held.size * size, alpha: 1 })
        else {
          // An older one is on another part of the animal altogether, at its own tilt: on its forehead, or behind its
          // shoulder where the newest is on its head. Two plasters never cross and never lie as two bars together.
          const elsewhere = wornAt(species, 'plaster').at === 'head' ? { x: body.anchors.back.x - 14, y: body.anchors.back.y, rot: 0.7 } : { x: body.anchors.head.x, y: body.anchors.head.y + 24, rot: 0.34 }
          const there = onFigure(base, pose, size, elsewhere.x, elsewhere.y)
          items.push({ kind: 'thing', care: 'plaster', look: 'one', x: there.x, y: there.y, rot: there.rot + elsewhere.rot, sx: 0.8 * size, sy: 0.8 * size, alpha: 1 })
        }
      }
    }
    cellThing(true)
    // The dark it hides in lies over it, and the table stands in front of both.
    if (underNow && arrived) {
      const lifting = act.feat?.need === 'scared' ? 1 - act.feat.p / 0.25 : 1
      items.push({ kind: 'part', part: 'shade', species: null, x: room.hide.x, y: room.patient.y + 38, rot: 0, sx: 1, sy: 1, alpha: clamp((0.58 - 0.3 * show.out) * lifting, 0, 1) })
    }
    // Eyes in the dark, over it and bright: two that blink, or the one that watches what was put down beside it.
    if (underNow && arrived && (show.eyes > 0.05 || show.eye > 0.05)) {
      const a = body.anchors, at = onFigure(base, pose, size, 0, a.mouth.y + (a.head.y - a.mouth.y) * EYES_UP)
      const wide = Math.max(0.5, size * 0.8)
      if (show.eyes > 0.05) items.push({ kind: 'part', part: show.blink > 0.5 ? 'eyesShut' : 'eyes', species: null, x: at.x, y: at.y, rot: at.rot, sx: wide, sy: wide, alpha: clamp(show.eyes * 1.5, 0, 1) })
      else items.push({ kind: 'part', part: 'eye', species: null, x: at.x - 12 * wide, y: at.y, rot: at.rot, sx: wide, sy: wide, alpha: clamp(show.eye * 1.5, 0, 1) })
    }
    if ((hiding && arrived) || shift !== null || (coming && toy.coming?.need === 'scared' && toy.coming.since > 1.1) || act.feat?.need === 'scared') items.push({ kind: 'part', part: 'table', species: null, x: room.patient.x, y: room.patient.y - 12, rot: 0, sx: 1, sy: 1, alpha: 1 })
  }

  for (const care of cart) {
    const at = lying(care, ['table-left', 'table-right'])
    if (at) lay(care, at, act.glance?.care === care ? 0.2 * Math.sin(TAU * act.glance.p * 2) : 0)
  }
  // Plasters stuck about the room. The newest slides to its place from where it was let go.
  const nosedPlaster = toy.doorPlay?.manner === 'nosed' && toy.doorPlay.care === 'plaster'
  clinic.things.plasters.forEach((spot, index) => {
    const onTable = spot === 'table' || spot === 'table-far' ? plasterOnTable(room, spot === 'table-far') : null
    const place = onTable ? { ...onTable, rot: onTable.rot + (act.glance?.care === 'plaster' ? 0.4 * Math.sin(TAU * act.glance.p * 2) : 0) }
      // On the floor it lies in front of the table, clear of the hiding place under it.
      : spot === 'floor' ? { x: room.patient.x + 44, y: room.waiting.y + 58, rot: 0.25 }
      : spot === 'lamp' ? { x: room.lamp.x + 30, y: room.lamp.y - 34, rot: -0.5 } : null
    if (!place) return
    const newest = index === clinic.things.plasters.length - 1
    // The plaster of the cell that is playing is the cell's to draw: it comes to rest here when the cell is over.
    if (newest && onTable && toy.cell?.track.given === 'plaster' && !helps('plaster', toy.cell.track.need)) return
    const slide = newest && !nosedPlaster ? toy.slides.plaster : undefined, slid = slide ? smooth((t - slide.since - slide.wait) / slide.lasts) : 1
    items.push({ kind: 'thing', care: 'plaster', look: 'one', x: slide ? slide.from.x + (place.x - slide.from.x) * slid : place.x, y: slide ? slide.from.y + (place.y - slide.from.y) * slid : place.y, rot: place.rot, sx: 1, sy: 1, alpha: 1 })
  })

  // --- The one who waits at the door ------------------------------------------
  // It shows its sign at the step it was laid out with; the sign does not grow while it waits. Touched while the
  // table is taken, it looks up and shows it once more.
  const waiting: Patient = clinic.waiting
  const stepIn = coming ? coming.waitingIn : 1
  // The next one is in view the whole time: as the one before it goes in, it is already there, up the path.
  const seen = coming && toy.coming!.from === 'door' ? smooth(toy.coming!.since / NEXT_SEEN) : 1
  const drawnSoFar = items.length
  {
    const who = waiting.species, need = showingNeed(waiting)
    const signed = need ? sign(who, need.need, need.step, t + 1.7, seed + 5) : null
    let life: Pose = signed ? signed.pose : idle(who, t + 1.7, seed + 5)
    const look = t - toy.doorLooked
    if (look < 1.1) life = add(life, { ...REST, y: -14 * Math.sin(Math.PI * clamp(look / 0.5, 0, 1)), rot: 0.07 * Math.sin(Math.PI * clamp(look / 1.1, 0, 1)), sy: 1 + 0.04 * Math.sin(Math.PI * clamp(look / 0.5, 0, 1)) })
    // It looks about the room, slowly, and turns to the table while something happens there.
    const watching = smooth((t - toy.watchFrom) / 0.35) * smooth((toy.watchUntil - t) / 0.5)
    life = add(life, { ...REST, x: 7 * watching, rot: 0.075 * watching + 0.035 * Math.sin(t * 0.47 + seed) * (1 - watching) })
    // Handed a thing at the door, it takes it as play in the manner of its taste, or sniffs it and noses it back.
    // Its sign's face stays: a need is met on the table only.
    if (toy.doorPlay) life = add(life, doorPose(toy.doorPlay.manner, t - toy.doorPlay.since, signed ? life.face : null))
    // At the door there is nowhere to hide: the frightened one crouches low and trembles.
    const show: Show = signed ? { ...signed.show, under: 0, out: 0, paw: signed.show.under ? 0 : signed.show.paw } : { ...NO_SHOW }
    if (signed?.show.under) life = { ...life, sy: life.sy * 0.9, face: need!.step > 0 ? 'afraid' : life.face }
    life = shaken(life, show.shake, t)
    const size = 0.74 + 0.26 * stepIn
    const base = { x: room.waiting.x - 10 * (1 - stepIn), y: room.waiting.y - NEXT_BACK * (1 - stepIn) }
    items.push({ kind: 'figure', who: 'waiting', species: who, x: base.x + life.x, y: base.y + life.y, rot: life.rot, sx: life.sx, sy: life.sy, face: life.face, shut: blinking(who, t, seed + 5), size, alpha: seen, hang: Math.round(show.ears) })
    parts(items, room, who, base, life, size, show, seen, t)
    if (clinic.things.plasters.includes('waiting')) { const lap = onFigure(base, life, size, room.bodies[who].anchors.lap.x, room.bodies[who].anchors.lap.y - 40); items.push({ kind: 'thing', care: 'plaster', look: 'one', x: lap.x, y: lap.y, rot: 0.34, sx: 1, sy: 1, alpha: seen }) }
  }
  // While the one before it is still on its way in from the door, the next one is behind it, further up the path.
  if (coming && toy.coming!.from === 'door' && !coming.arriving.seated) items.splice(tableAt, 0, ...items.splice(drawnSoFar))

  // --- The cart's own: the mouse and the things on it --------------------------
  if (cartIn > 0) {
    const ducked = Math.exp(-(t - toy.mouseDucked) * 5) * Math.cos((t - toy.mouseDucked) * 9)
    const fuss = (t * 0.45 + 0.3) % 1 < 0.38
    // What the mouse is doing with a thing: using a new one on itself, once, or answering one the child put on it.
    const showingNow = act.showing, playNow = toy.mousePlay
    const use: MouseUse | null = showingNow ? showingUse(showingNow.care, showingNow.p) : playNow ? mischief(playNow.care, (t - playNow.since) / MISCHIEF_SECONDS) : null
    // How much of that shows: a showing eases in as the thing comes over and out as it goes back.
    const taken = showingNow ? nearMouse(showingNow.p) : playNow ? 1 : 0
    const stands = { x: room.mouse.x + cartX + 7 * Math.sin(t * 0.8) * (1 - taken), y: room.mouse.y - (fuss && !use ? Math.abs(Math.sin(t * 3.1)) * 2.5 : 0) }
    // A thing that came back to the cart is straightened: the mouse leans over to it, paws out, and the thing is
    // jogged square in its place.
    const tidying = !use && toy.tidied && t >= toy.tidied.since ? (t - toy.tidied.since) / TIDY_SECONDS : null
    const reach = tidying !== null ? Math.sin(Math.PI * clamp(tidying, 0, 1)) : 0, towards = toy.tidied ? Math.sign(room.cart[toy.tidied.care].x - room.mouse.x) || -1 : 0
    const mouse = use ? { x: stands.x + use.mouse.x * taken, y: stands.y + use.mouse.y * taken } : { x: stands.x + towards * 16 * reach, y: stands.y + 3 * reach }
    items.push({
      kind: 'mouse', x: mouse.x, y: mouse.y, rot: 0.07 * Math.sin(t * 1.6) * (1 - taken) * (1 - reach) + (use ? use.mouse.rot * taken : 0) + towards * 0.2 * reach,
      sx: (1 + 0.16 * ducked) * (use ? 1 + (use.mouse.sx - 1) * taken : 1), sy: (1 - 0.3 * ducked) * (use ? 1 + (use.mouse.sy - 1) * taken : 1),
      hat: clinic.things.plasters.includes('mouse'), fuss: use ? use.mouse.fuss && taken > 0.5 : reach > 0.2 || fuss, shut: use && taken > 0.5 ? use.mouse.shut : blinking('hedgehog', t, seed + 9),
    })
    if (use && use.breath > 0.02) items.push({ kind: 'part', part: 'puff', species: null, x: stands.x + 22 + 12 * use.breath, y: stands.y - 54 - 8 * use.breath, rot: 0, sx: 0.5 + 0.3 * use.breath, sy: 0.5 + 0.3 * use.breath, alpha: clamp(1.3 - use.breath, 0, 1) * clamp(use.breath * 4, 0, 1) })

    // What the idle ladder offers: in the toy the thing given longest ago; with a need on the table every thing on the
    // cart glows, since any of them may be tried, and the hand shows a stroke of the animal.
    const glow = guide && guide.glow > 0 ? guide.glow : 0
    const need = needOnTable(toy)
    const offered = glow > 0 && toy.visitors ? toy.wanted.find((care) => care === 'plaster' || clinic.things[care] === 'cart') ?? null : null
    for (const care of cart) {
      const onCart = care === 'plaster' || (clinic.things[care] === 'cart' && lies(toy, room, care) !== null && toy.cell?.track.given !== care && !flying(care))
      if (!onCart) continue
      const home = { x: room.cart[care].x + cartX, y: room.cart[care].y }
      const withMouse = use && (showingNow?.care === care || playNow?.care === care)
      if (glow > 0 && !withMouse && (offered === care || (need && !toy.visitors))) items.push({ kind: 'halo', x: home.x, y: home.y, strength: glow * (need ? 0.8 : 1), size: 1 })
      // The thing the mouse is busy with is where the mouse has it: it comes over from its place on the cart, and goes
      // back there. A thing the child put on the mouse starts on the mouse and is put back at the end.
      if (withMouse) {
        const by = showingNow ? taken : 1 - smooth(((t - playNow!.since) / MISCHIEF_SECONDS - TIDIED_FROM) / (1 - TIDIED_FROM))
        const there = { x: stands.x + use.thing.x, y: stands.y + use.thing.y }
        const size = 1 + (use.thing.size - 1) * by
        // Turned the short way back to how it lies on the cart.
        const turn = use.thing.rot * by
        items.push(asDen(clinic.made.den, { kind: 'thing', care, look: by > 0.5 ? use.thing.look : 'whole', x: home.x + (there.x - home.x) * by, y: home.y + (there.y - home.y) * by, rot: turn, sx: size, sy: size, alpha: 1 }))
        // The sheet of plasters stays on the cart: one plaster came off it.
        if (care !== 'plaster') continue
      }
      // A plaster nosed back from the door is seen to slide back onto its sheet.
      if (care === 'plaster' && nosedPlaster && toy.slides.plaster) {
        const slide = toy.slides.plaster, slid = smooth((t - slide.since - slide.wait) / slide.lasts)
        items.push({ kind: 'thing', care, look: 'one', x: slide.from.x + (home.x - slide.from.x) * slid, y: slide.from.y + (home.y - slide.from.y) * slid, rot: PLASTER_TILT, sx: 1, sy: 1, alpha: 1 })
      }
      // A thing that was tried and went back to the cart is glanced at there; one the mouse is straightening is jogged.
      const jog = tidying !== null && toy.tidied!.care === care ? 0.16 * Math.sin(TAU * 2.5 * tidying) * (1 - clamp(tidying, 0, 1)) : 0
      lay(care, home, jog + (act.glance?.care === care ? 0.2 * Math.sin(TAU * act.glance.p * 2) : 0))
    }
    if (offered && guide && guide.demo !== null) {
      const hand = handPose(guide.demo, false, scratch)
      items.push({ kind: 'hand', x: room.cart[offered].x + 18, y: room.cart[offered].y + 10 - 26 * (1 - hand.press), press: hand.press, alpha: hand.opacity })
    }
    // With a need on the table the move it shows is a stroke of the animal, never a tap on the thing that fits.
    if (!toy.visitors && need && table && guide && guide.demo !== null) {
      const hand = handPose(guide.demo, false, scratch)
      const at = need === 'scared' ? { x: room.hide.x, y: room.hide.y - 60 } : { x: room.patient.x + 20, y: room.patient.y - room.bodies[table.species].h * 0.45 }
      items.push({ kind: 'hand', x: at.x, y: at.y - 26 * (1 - hand.press), press: hand.press, alpha: hand.opacity })
    }
  }
  // With the table empty or the animal on it well, the one who waits is what can be touched next.
  if (!toy.visitors && guide && guide.glow > 0 && mayComeIn(toy) && (!table || isWell(table))) {
    const who = waiting.species, mid = { x: room.waiting.x, y: room.waiting.y - room.bodies[who].h * 0.5 }
    // The glow is as large as the animal it is behind, so it shows round a bear as it does round a hedgehog.
    items.splice(items.findIndex((item) => item.kind === 'figure' && item.who === 'waiting'), 0, { kind: 'halo', x: mid.x, y: mid.y, strength: guide.glow, size: Math.max(1, (Math.max(room.bodies[who].w, room.bodies[who].h) + 70) / 170) })
    if (guide.demo !== null) { const hand = handPose(guide.demo, false, scratch); items.push({ kind: 'hand', x: mid.x + 16, y: mid.y - 26 * (1 - hand.press), press: hand.press, alpha: hand.opacity }) }
  }

  // The one who is going out walks in front of everything on the floor.
  if (coming?.leaving && toy.coming?.leaving) {
    const out = coming.leaving
    items.push({ kind: 'figure', who: 'leaving', species: toy.coming.leaving, x: out.x, y: out.y, rot: 0, sx: 1, sy: out.sy, face: 'glad', shut: false, size: out.size, alpha: out.alpha, hang: 0 })
    // It goes out with what helped it, its own to keep: held in front of it, small, all the way to the door.
    const took = clinic.garden[clinic.garden.length - 1]
    took?.keeps.forEach((care, index) => {
      const side = index === 0 ? 1 : -1, small = out.size * (care === 'blanket' ? 0.26 : 0.46)
      items.push({ kind: 'thing', care, look: care === 'blanket' ? 'open' : care === 'plaster' ? 'one' : 'whole', x: out.x + side * 30 * out.size, y: out.y - (care === 'blanket' ? 8 : 34) * out.size, rot: side * (care === 'plaster' ? 0.4 : 0.1), sx: small, sy: small, alpha: out.alpha, kept: true })
    })
  }

  for (const one of toy.drops) items.push({ kind: 'drop', x: one.at.x, y: one.at.y, alpha: clamp(1.4 - one.since * 2, 0, 1) })

  // A secret: the one thing goes onto the other.
  if (act.secret && act.secret.p < SECRET_FLIGHT) {
    const to = lies(toy, room, act.secret.other) ?? room.cart[act.secret.other], from = room.cart[act.secret.one]
    const at = arc(from, to, act.secret.p / SECRET_FLIGHT, 50)
    items.push({ kind: 'thing', care: act.secret.one, look: act.secret.one === 'plaster' ? 'one' : 'lifted', x: at.x, y: at.y, rot: 0.4, sx: 1, sy: 1, alpha: 1 })
  }

  // A thing in the air: one arc to the animal, turning a little as it goes.
  if (table) {
    const aim = needOnTable(toy) === 'scared' ? { x: room.hide.x - 150, y: room.hide.y - 44 } : { x: room.patient.x, y: room.patient.y - room.bodies[table.species].h * 0.55 }
    for (const flight of toy.flights) {
      const p = clamp(flight.since / flight.lasts, 0, 1), at = arc(flight.from, aim, p, 70)
      items.push(asDen(clinic.made.den, { kind: 'thing', care: flight.care, look: flight.care === 'plaster' ? 'one-lifted' : 'lifted', x: at.x, y: at.y, rot: 0.5 * p + (flight.care === 'plaster' ? PLASTER_TILT : 0), sx: 1 + 0.1 * Math.sin(Math.PI * p), sy: 1 - 0.08 * Math.sin(Math.PI * p), alpha: 1 }))
    }
  }
  // The thing in the hand: it stretches as it lifts, swings as it is carried, and bobs while it waits for the finger.
  if (toy.hand) {
    const age = t - toy.hand.since, stretch = 0.13 * Math.exp(-age * 8) * Math.cos(age * 20)
    const bob = toy.hand.lifted ? 5 * Math.sin(t * 5) : 0
    items.push(asDen(clinic.made.den, { kind: 'thing', care: toy.hand.care, look: toy.hand.care === 'plaster' ? 'one-lifted' : 'lifted', x: toy.hand.at.x, y: toy.hand.at.y - 10 * Math.min(1, age * 12) + bob, rot: toy.hand.swing + (toy.hand.care === 'plaster' ? PLASTER_TILT : 0), sx: 1.06 - stretch * 0.6, sy: 1.06 + stretch, alpha: 1 }))
  }

  if (toy.knock) items.push({ kind: 'ring', x: toy.knock.at.x, y: toy.knock.at.y, age: t - toy.knock.since })
  return withMade(items, clinic.made, t)
}

/** Where a plaster lies on the table: at its near end, or at its far end, tipped the other way: so far from the middle, and so far down the front edge. */
const PLASTER_TILT = -0.3, PLASTER_OUT = 126, PLASTER_DOWN = 20
function plasterOnTable(room: Room, far = false): Vec & { rot: number } {
  // Stuck on the front edge of the table's top, below where a thing stands at that end: it never lies on that thing.
  return { x: room.patient.x + (far ? 1 : -1) * PLASTER_OUT, y: room.patient.y + PLASTER_DOWN, rot: far ? -PLASTER_TILT : PLASTER_TILT }
}

/**
 * What two things made is on the thing wherever the thing is: foam and the
 * boat on the bowl, patches on the blanket, lying, in the hand, in the air,
 * in a cell or on the animal. Each rides the thing: placed from the thing's
 * own middle, turned and sized with it. A thing an animal took away with it
 * shows none of it.
 */
function withMade(items: Item[], made: Toy['clinic']['made'], t: number): Item[] {
  if (!made.foam && !made.boat && made.patches === 0) return items
  const out: Item[] = []
  for (const item of items) {
    out.push(item)
    // The den is the blanket over the basket: its patches are on the cloth of the den.
    if (item.kind === 'part' && (item.part === 'den' || item.part === 'denLifted')) {
      for (let n = 0; n < made.patches; n++) {
        const dx = PATCH_DEN[n].x, dy = PATCH_DEN[n].y
        out.push({ kind: 'thing', care: 'plaster', look: 'one', x: item.x + (dx * Math.cos(item.rot) - dy * Math.sin(item.rot)) * item.sx, y: item.y + (dx * Math.sin(item.rot) + dy * Math.cos(item.rot)) * item.sy, rot: item.rot + PATCH_AT[n].rot, sx: 0.42 * item.sx, sy: 0.42 * item.sy, alpha: item.alpha, kept: true })
      }
    }
    if (item.kind !== 'thing' || item.kept) continue
    const on = (dx: number, dy: number): Vec => ({ x: item.x + (dx * Math.cos(item.rot) - dy * Math.sin(item.rot)) * item.sx, y: item.y + (dx * Math.sin(item.rot) + dy * Math.cos(item.rot)) * item.sy })
    if (item.care === 'bowl' && (item.look === 'whole' || item.look === 'lifted')) {
      if (made.foam) { const at = on(0, -26); out.push({ kind: 'part', part: 'foam', species: null, x: at.x, y: at.y, rot: item.rot, sx: item.sx * (1 + 0.04 * Math.sin(t * 3)), sy: item.sy, alpha: item.alpha }) }
      // The boat floats askew and bobs: never a level bar across the bowl.
      if (made.boat) { const at = on(10 + 12 * Math.sin(t * 1.3), -31 + 2 * Math.sin(t * 2.6)); out.push({ kind: 'thing', care: 'plaster', look: 'one', x: at.x, y: at.y, rot: item.rot - 0.42 + 0.14 * Math.sin(t * 1.3), sx: 0.56 * item.sx, sy: 0.56 * item.sy, alpha: item.alpha, kept: true }) }
    }
    if (item.care === 'blanket' && item.look !== 'one' && item.look !== 'one-lifted') {
      // A patch on each fold of the folded blanket, or spread over the cloth when it is open; each at its own tilt,
      // none level, no two crossing.
      for (let n = 0; n < made.patches; n++) {
        const at = item.look === 'open' ? on(PATCH_OPEN[n].x, PATCH_OPEN[n].y) : on(PATCH_AT[n].x, -26 + n * 28)
        out.push({ kind: 'thing', care: 'plaster', look: 'one', x: at.x, y: at.y, rot: item.rot + PATCH_AT[n].rot, sx: 0.5 * item.sx, sy: 0.5 * item.sy, alpha: item.alpha, kept: true })
      }
    }
  }
  return out
}

/**
 * The basket with the blanket over it is the den wherever it goes: given to
 * the animal, in the hand or in the air, it is drawn as the den and never as
 * a bare basket with the blanket out of view.
 */
function asDen(den: boolean, item: Item): Item {
  if (!den || item.kind !== 'thing' || item.care !== 'basket') return item
  // In the hand or in the air it is a lifted sticker like any other thing: its corner curls and its gloss slides.
  return { kind: 'part', part: item.look === 'lifted' ? 'denLifted' : 'den', species: null, x: item.x, y: item.y + 6 * item.sy, rot: item.rot, sx: item.sx * 0.8, sy: item.sy * 0.8, alpha: item.alpha }
}

/** A thing key's place on an animal, as an offset from where it sits. */
function onBodyAt(room: Room, species: Species, key: ThingKey): Vec {
  const anchor = key.at === 'seat' ? { x: 0, y: 0 } : room.bodies[species].anchors[key.at]
  return { x: anchor.x + key.dx, y: anchor.y + key.dy }
}
