import type { Act, Anchors, Prop } from './acts'
import type { BrookAct } from './brookActs'
import { HULL_KINDS, KINDS, MAKINGS, aboard, copyBuild, draftOf, isBlanket, type Build, type Making } from './build'
import { EDDY, FROG, FROG_AT_FALL, FROG_AT_REEDS, GNOME, KINGFISHER, BIRD_AT_BRANCH, LINE, PLACES, POND, SEAT, SPRITE, clamp, type Spot } from './layout'
import { buildOf, hullShape, newPiece, seatOf, slotOf, type Piece, type Place } from './pieces'
import { newStage, type Stage } from './rig'
import { makeRng, type Rng } from './rng'
import type { Scene } from './scene'
import type { SoundName } from './voices'

// The game's world: the bank, the brook and the pond, as plain state. Pure
// rules on game time, stepped at a fixed rate, with one seeded stream of
// chance that only bends the pitch of sounds. The other rule files hold what
// changes it (finger.ts, tick.ts, journey.ts, scenes.ts); the view reads the
// fields; nothing here draws.

/** The part of the saved state the world holds (save.ts adds the version and the position). */
export type WorldSave = {
  finished: boolean
  place: 'bank' | 'brook' | 'pond'
  boat: Build & { at: 'stone' | 'eddy'; x: number; aboard: boolean }
  loose: { kind: Making; x: number; y: number }[]
  journey: { reach: number | null; stuck: boolean; done: boolean }
  pond: Build[]
}

export type Boat = {
  /** Where it rests on the bank scene, or rested when it was picked up: this is what is saved. */
  at: 'stone' | 'eddy'
  restX: number
  /** `none`: no hull stands on the stone. `brook`: the brook has it, and journey.ts moves it. */
  mode: 'none' | 'stone' | 'afloat' | 'held' | 'fall' | 'glide' | 'brook'
  /** The keel point, in stage units of the frame it is in. */
  x: number
  y: number
  vx: number
  vy: number
  /** Springs that ring out: the lean of the hull, how far it is pressed down, its squash, and the belly of its sails. */
  lean: number
  leanV: number
  dip: number
  dipV: number
  squash: number
  squashV: number
  billow: number
  billowV: number
  /** A glide back to the stone: where it began, and how far along it is, 0 to 1. */
  fromX: number
  fromY: number
  glide: number
  /** Seconds of dripping left after it was lifted out of the water. */
  wet: number
  /** A heavy thing has just landed on it and the hull has not yet groaned. */
  groan: boolean
  /** Which way it lies at the pond: 1 bow downstream, -1 turned about. */
  face: number
  /** The slot a thing in the hand would take: the hole darkens, the mast leans, the deck dips. */
  offer: { on: 'mast' | 'sail' | 'deck'; index: number } | null
}

export type Ring = { x: number; y: number; age: number; strength: number; hitBoat: boolean; hitFrog: boolean; /** The floating things it has already pushed. */ pushed?: Piece[] }
/** What a tap on nothing in particular leaves where it landed: petals off the near ground, a smaller puff of them off the far bank, a gust in the sky. */
export type Puff = { x: number; y: number; age: number; kind: 'ground' | 'far' | 'sky' }

/** An act that is playing, and the thing it has, when it has one. */
export type Running = { act: Act; t: number; piece: Piece | null; prop: Prop; drop: Spot; brook: boolean }

/** How the boat was on the brook when it was lifted: a lift that is taken away puts all of it back. */
/** What a boat lifted off the brook was doing, so that a lift the shell takes away changes nothing: `runs` is the answer it was in the middle of. */
export type Lifted = { x: number; phase: Journey['phase']; stuck: boolean; holder: BrookAct | null; queue: BrookAct[]; gain: number; low: boolean; runs: Running[] }

export type Hand =
  | { on: 'piece'; piece: Piece; pulled: boolean }
  | { on: 'boat'; dx: number; dy: number; from?: Lifted }
  /** A finger on the boat while a place is answering it: the answer goes on, and the boat is lifted only if the finger pulls. */
  | { on: 'answer' }
  | { on: 'water'; x: number; y: number }
  | { on: 'sun'; y: number }
  | { on: 'other' }

/** A sound of this handler or this frame. A scene's sounds go to their own bus, which a touch that ends the scene shuts. */
export type Heard = { name: SoundName; rate: number; scene: boolean }

export type Journey = {
  /** Which of the six places the boat has come to, or null on the bank. */
  reach: number | null
  /** The boat is held at that place and waits for a ring. */
  stuck: boolean
  /** The place has begun to answer the boat. Found again after a put-away, that answer is over and is not given twice. */
  done: boolean
  /**
   * `wait`: found here on load, still until the first touch. `out`: leaving the bank. `pan`: the view follows
   * it to the next frame. `enter`: drifting to where the place meets it. `answer`: the place answers.
   * `held`: it waits for a ring or a lift. `leave`: drifting on. `moor`: the ending has it.
   */
  phase: 'none' | 'wait' | 'out' | 'pan' | 'enter' | 'answer' | 'held' | 'leave' | 'moor'
  /** The acts the place has still to answer with, and how much of their travel fits in the frame. */
  queue: BrookAct[]
  gain: number
  /** The act that holds the boat. */
  holder: BrookAct | null
  /** The boat is below the fall, where the water is lower. */
  low: boolean
  /** A pan: how far along it is, 0 to 1, and where the boat was when it began. */
  pan: number
  panFrom: number
  /** Leaving the bank the boat swings out into the far channel, 0 to 1, to pass behind the frog's stone. */
  swing: number
}

export type World = {
  pieces: Piece[]
  boat: Boat
  /** Where the gnome is: on the flat stone, aboard, or on a lily pad at the pond. */
  gnomeAt: 'stone' | 'aboard' | 'pad'
  where: 'bank' | 'brook' | 'pond'
  finished: boolean
  /** The frame the boat and the child are in: -1 the bank, 0 to 5 the places. */
  frame: number
  /** The left edge of the view, in the world. */
  cam: number
  journey: Journey
  /** The boats moored at the pond, oldest first, the one just moored last. */
  pond: Build[]
  stage: Stage
  acts: Running[]
  rings: Ring[]
  puffs: Puff[]
  /** Where the finger is, and whether it is down: the eyes follow it. */
  finger: { x: number; y: number; down: boolean }
  /** The sounds of this handler or this frame. The Mount plays them and empties the list. */
  sounds: Heard[]
  /** A touch has ended a scene: the Mount shuts the scene's sound and clears this. */
  cut: boolean
  /** What changed since the last save: nothing, a small change, or one that must be saved at once. */
  dirty: 'no' | 'soon' | 'now'
  /** Seconds of play. */
  time: number
  hand: Hand | null
  owed: number
  chance: Rng
  scene: { name: 'aboard' | 'lamp' | 'morning'; play: Scene; started: number } | null
  /** What a scene shows on its way to what is already saved. */
  show: {
    /** The gnome's way aboard, 0 on the stone to 1 in his seat. */
    aboard: number
    /** His way from his seat onto the pad, 0 to 1. */
    pad: number
    /** How lit each moored boat's lamp is, in the order of `pond`. */
    lamps: number[]
    /** The sky, 0 morning to 1 dusk. */
    dusk: number
    /** How far the sun has been lifted, in stage units. */
    sun: number
    /** The boat just moored is still shown at its mooring while the morning scene leaves the pond. */
    ghost: boolean
    /** The aboard scene: how far he is through looking the boat over, 0 to 1 (each part in turn, the keel first), and his hand at his hat, 0 to 1. */
    look: number
    /** How far he has shuffled astern in his seat, away from a pebble aboard, 0 to 1. */
    scoot: number
    fix: number
    /** The pond's answers: the pads piled at the bow, the hull still rocking, the sail still full, the berry set on its pad, each 0 to 1. */
    pile: number
    rock: number
    sigh: number
    berry: number
  }
  /** The sprite's breath now under way has reached the boat. Cleared when the breath is over. */
  blown: boolean
}

export const STEP = 1 / 60
/** How far over the fingertip a held making is drawn, so the finger does not hide it. */
export const HOLD_LIFT = 30
export const RING_LIFE = 1.5
export const PUFF_LIFE = 0.7
/** The most rings and puffs of petals alive at once: a finger scribbling in the water replaces its oldest ring. */
export const MAX_RINGS = 5
export const MAX_PUFFS = 2
export const MAX_POND = 5
/** The nearest the brook's pull a boat can be set down or found: nearer than this the current has it. */
export const EDDY_IN = EDDY.left + 30

/** How wide a ring has spread at `age`. */
export function ringRadius(ring: Ring): number {
  return 24 + 250 * ring.age * (0.6 + 0.4 * Math.min(1, ring.strength))
}

const newBoat = (): Boat => ({
  at: 'stone', restX: SEAT.x, mode: 'none', x: SEAT.x, y: SEAT.y, vx: 0, vy: 0, lean: 0, leanV: 0, dip: 0, dipV: 0, squash: 0, squashV: 0, billow: 0, billowV: 0,
  fromX: SEAT.x, fromY: SEAT.y, glide: 0, wet: 0, groan: false, face: 1, offer: null,
})

export function newJourney(): Journey {
  return { reach: null, stuck: false, done: false, phase: 'none', queue: [], gain: 1, holder: null, low: false, pan: 0, panFrom: 0, swing: 0 }
}

/**
 * Whether the answer under way is one that ends with the place holding the boat. Put away now, the boat is found
 * held there, waiting for a ring, and not past the place: nothing has moved that the child did not move.
 */
function willHold(w: World): boolean {
  const j = w.journey
  if (w.where !== 'brook' || j.phase !== 'answer' || !j.done || j.holder) return false
  const holds = (act: object): boolean => { const each = act as { holds?: unknown; frees?: unknown }; return Boolean(each.holds && each.frees) }
  return w.acts.some((run) => run.brook && holds(run.act)) || j.queue.some(holds)
}

/** The world a saved state describes. Nothing in it moves, sounds or is on its way: a load is a still picture until the child touches it. */
export function newWorld(save: WorldSave, seed: number): World {
  const pieces: Piece[] = []
  if (save.boat.hull) pieces.push(newPiece(save.boat.hull, { on: 'hull' }))
  let order = 0
  for (const item of aboard(save.boat)) {
    const place: Place = item.slot.on === 'deck' ? { on: 'deck', order: ++order } : { on: item.slot.on, index: item.slot.index }
    pieces.push(newPiece(item.kind, place))
  }
  for (const item of save.loose) pieces.push(newPiece(item.kind, { on: 'bank', x: item.x, y: item.y }))
  const boat = newBoat()
  const world: World = {
    pieces, boat, gnomeAt: save.boat.aboard ? 'aboard' : 'stone', where: save.place, finished: save.finished, frame: -1, cam: 0, journey: newJourney(),
    pond: save.pond.map(copyBuild), stage: newStage(), acts: [], rings: [], puffs: [], finger: { x: 590, y: 520, down: false }, sounds: [], cut: false,
    dirty: 'no', time: 0, hand: null, owed: 0, chance: makeRng(seed), scene: null,
    show: { aboard: save.boat.aboard ? 1 : 0, pad: 0, lamps: save.pond.map(() => 0), dusk: 0, sun: 0, ghost: false, look: 0, scoot: save.boat.deck.includes('pebble') ? 1 : 0, fix: 0, pile: 0, rock: 0, sigh: 0, berry: 0 },
    blown: false,
  }
  if (!save.boat.hull) return world
  if (save.place === 'bank') {
    const afloat = save.boat.at === 'eddy'
    boat.at = save.boat.at
    boat.mode = afloat ? 'afloat' : 'stone'
    boat.restX = boat.x = afloat ? clamp(save.boat.x, EDDY_IN, EDDY.right) : SEAT.x
    boat.y = afloat ? LINE + draftOf(save.boat, save.boat.aboard) : SEAT.y
  } else {
    // The brook has it: it left from the eddy's end, which is what its save goes on saying.
    boat.at = 'eddy'
    boat.restX = EDDY_IN
  }
  return world
}

/** The boat as it stands now: a part in the hand is not on it. */
export function buildNow(w: World): Build {
  return buildOf(w.pieces.filter((piece) => piece.mode !== 'held'))
}

/** What is saved. A making in the hand is saved where it was picked up from; one that is floating or flying, where it will come to rest. */
export function toSave(w: World): WorldSave {
  const build = buildOf(w.pieces)
  const order = [...HULL_KINDS, ...KINDS] as Making[]
  const loose = [...w.pieces].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).filter((piece) => piece.place.on === 'bank').map((piece) => {
    const place = piece.place as { x: number; y: number }
    return { kind: piece.kind, x: Math.round(place.x), y: Math.round(place.y) }
  })
  return {
    finished: w.finished, place: w.where,
    boat: { ...build, at: w.boat.at, x: Math.round(w.boat.restX), aboard: w.gnomeAt !== 'stone' },
    loose, journey: { reach: w.journey.reach, stuck: w.journey.stuck || willHold(w), done: w.where === 'brook' && w.journey.done }, pond: w.pond.map(copyBuild),
  }
}

export function emit(w: World, name: SoundName, rate = 1, scene = false): void {
  w.sounds.push({ name, rate: rate * (0.96 + w.chance.next() * 0.08), scene })
}

export function mark(w: World, now: boolean): void {
  if (now) w.dirty = 'now'
  else if (w.dirty === 'no') w.dirty = 'soon'
}

/** What the child holds, for the view and the eyes. */
export function heldOf(w: World): Piece | 'boat' | null {
  if (w.hand?.on === 'piece' && w.hand.pulled) return w.hand.piece
  return w.hand?.on === 'boat' ? 'boat' : null
}

/** Where a piece is drawn: its own spot, or its seat on the boat when it rests there. The lean of the hull is the view's. */
export function spotOf(w: World, piece: Piece): Spot {
  if (piece.mode !== 'rest' || piece.place.on === 'bank') return { x: piece.x, y: piece.y }
  const seat = seatOf(piece, w.pieces)
  return { x: w.boat.x + seat.x, y: w.boat.y + seat.y }
}

/** The gnome's hips when he sits aboard, from the keel point. */
export function seatOffset(w: World): Spot {
  const shape = hullShape(buildOf(w.pieces).hull)
  // With a pebble aboard he sits as far from it as the deck allows: right at the stern.
  return { x: shape.seat + SCOOT * w.show.scoot, y: shape.deck }
}

/** How far astern of his seat the deck lets him shuffle. */
export const SCOOT = 14

/** What he looks at when he looks the boat over, in the order he looks: the keel, then each thing aboard from the lowest to the top. */
export function partsToLookAt(w: World): Spot[] {
  const parts: Spot[] = w.pieces.filter((piece) => piece.place.on !== 'bank' && piece.place.on !== 'hull').map((piece) => {
    const seat = seatOf(piece, w.pieces)
    return { x: w.boat.x + seat.x, y: w.boat.y + seat.y - (piece.place.on === 'deck' ? 0 : MAKINGS[piece.kind].length * 0.5) }
  })
  parts.sort((a, b) => b.y - a.y || a.x - b.x)
  return [{ x: w.boat.x - 90, y: w.boat.y + 4 }, ...parts]
}

/** The gnome's hips, in stage units of his frame: on the stone, in his seat, on the pad, or on his way between them. */
export function gnomeSpot(w: World): Spot {
  const seat = seatOffset(w)
  const aboardAt = { x: w.boat.x + seat.x, y: w.boat.y + seat.y }
  if (w.gnomeAt === 'stone') return { x: GNOME.x, y: GNOME.y - 45 }
  if (w.gnomeAt === 'pad' || w.show.pad > 0) {
    const k = w.gnomeAt === 'pad' && !w.scene ? 1 : w.show.pad
    return { x: aboardAt.x + (POND.pad.x - aboardAt.x) * k, y: aboardAt.y + (POND.pad.y - 45 - aboardAt.y) * k - Math.sin(k * Math.PI) * 50 }
  }
  const k = w.show.aboard
  if (k >= 1) return aboardAt
  return { x: GNOME.x + (aboardAt.x - GNOME.x) * k, y: GNOME.y - 45 + (aboardAt.y - GNOME.y + 45) * k - Math.sin(k * Math.PI) * 74 }
}

/** The boat's keel point where the view draws it: an answer of the brook, or a place that holds it, moves the picture before it moves the boat. */
export function boatShown(w: World): Spot {
  return { x: w.boat.x + w.stage.boat.dx, y: w.boat.y + w.stage.boat.dy }
}

/** How the view sets the boat down: its keel point, its turn, and its stretch across and up (across is negative when it faces upstream). */
export function boatPose(w: World): { x: number; y: number; turn: number; sx: number; sy: number } {
  const boat = w.boat, rig = w.stage.boat
  // Turned about, it is seen end on in the middle of the turn.
  const face = boat.face * rig.face, facing = (face < 0 ? -1 : 1) * Math.max(0.14, Math.abs(face))
  return { ...boatShown(w), turn: boat.lean * 0.12 + rig.tilt, sx: facing * (1 + boat.squash * 0.06), sy: 1 - boat.squash * 0.06 }
}

/** A point measured from the keel, where the view draws it: turned and stretched with the hull. */
export function onBoatShown(w: World, x: number, y: number): Spot {
  const pose = boatPose(w), cos = Math.cos(pose.turn), sin = Math.sin(pose.turn)
  return { x: pose.x + cos * pose.sx * x - sin * pose.sy * y, y: pose.y + sin * pose.sx * x + cos * pose.sy * y }
}

const isSeated = (w: World): boolean => w.gnomeAt === 'aboard' && w.show.aboard >= 1 && w.show.pad <= 0

/** The gnome's middle line where the view draws him, from `up` above his hips to `down` below them: in his seat he is turned and stretched with the hull, and an act moves him too. */
function gnomeLine(w: World, up: number, down: number, off = -4): [Spot, Spot] {
  const rig = w.stage.gnome
  if (isSeated(w)) {
    const seat = seatOffset(w)
    return [onBoatShown(w, seat.x + rig.dx + off, seat.y + rig.dy - up), onBoatShown(w, seat.x + rig.dx + off, seat.y + rig.dy + down)]
  }
  const at = gnomeSpot(w)
  return [{ x: at.x + rig.dx + off, y: at.y + rig.dy - up }, { x: at.x + rig.dx + off, y: at.y + rig.dy + down }]
}

/** How far a blanket is lifted off its place while the gnome sits under it. */
export const BLANKET_UP = 62

/**
 * Where a thing at rest on the boat is drawn, `up` along it from its middle: at its seat, turned and stretched
 * with the hull, and a blanket up over the gnome's head while he is under it. It is touched there.
 */
export function partShown(w: World, piece: Piece, up = 0): Spot {
  const seat = seatOf(piece, w.pieces), slot = slotOf(piece, w.pieces)
  const under = slot?.on === 'deck' && isBlanket(buildOf(w.pieces), slot.index) && isSeated(w) ? w.stage.gnome.hide * BLANKET_UP : 0
  return onBoatShown(w, seat.x, seat.y - under - up)
}

/** The gnome's hips where the view draws him. */
export function gnomeShown(w: World): Spot {
  return gnomeLine(w, 0, 0, 0)[0]
}

/** The tip of his hat where the view draws it. */
export function hatShown(w: World): Spot {
  return gnomeLine(w, 214, 0)[0]
}

/**
 * How far a point is from the gnome as drawn, along his middle line from the tip of his hat down: to his feet
 * where he stands, and to his chest where he sits, since below that is the stern of the hull, by which the boat is taken.
 */
export function fromGnome(w: World, x: number, y: number): number {
  const [top, foot] = gnomeLine(w, 214, isSeated(w) ? -44 : 6)
  const ax = foot.x - top.x, ay = foot.y - top.y
  const along = Math.max(0, Math.min(1, ((x - top.x) * ax + (y - top.y) * ay) / (ax * ax + ay * ay)))
  return Math.hypot(x - (top.x + ax * along), y - (top.y + ay * along))
}

/** Where each of the folk is in the frame on show. */
export function homesOf(frame: number): { frog: Spot | null; bird: Spot | null; sprite: Spot | null } {
  const place = frame < 0 ? 'bank' : PLACES[frame]
  return {
    frog: place === 'bank' ? FROG : place === 'reeds' ? FROG_AT_REEDS : place === 'fall' ? FROG_AT_FALL : null,
    bird: place === 'bank' ? KINGFISHER : place === 'branch' ? BIRD_AT_BRANCH : null,
    sprite: place === 'bank' || place === 'sprite' ? SPRITE : null,
  }
}

const NOWHERE: Spot = { x: -4000, y: -4000 }

/** Where everyone is for an act, in the frame the boat is in. */
export function anchorsOf(w: World, drop: Spot, home: Spot): Anchors {
  const homes = homesOf(w.frame)
  return { frog: homes.frog ?? NOWHERE, bird: homes.bird ?? NOWHERE, sprite: homes.sprite ?? NOWHERE, gnome: gnomeSpot(w), boat: { x: w.boat.x, y: w.boat.y }, drop, home, gain: w.journey.gain }
}
