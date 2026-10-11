import type { Note } from './audio'
import { CELLS, COLS, KINDS, MAX_KNOTS, ROWS, cleanMud, decodeMud, dollop, encodeMud, maskOf, mudLeft, onCloth, patches, rub, spotOn, sudsKnots, type Kind } from './cloth'
import { LADDER } from './config'
import {
  BOARD, CAT, CLOTH, FEET_Y, FRIEND_KINDS, GATE, GATEWAY, GRASS_SIZE, HELD, HILL, HILL_SCALE, HUNG, LANE_END, LINE, LINE_SIZE, PLACE_X, PUDDLE, RAIL, RIDGES, SOAP, TUB,
  TUB_FRIEND, TUB_SIZE, TUB_SLOTS, WAIT_FEET, WAIT_HELD, WAIT_SCALE, WAIT_X, YARD_SCALE, bodyOval, boxAt, clothToStage, heldAt, inBox, inOval, lineSpot, lineY, onLawn,
  pegHome, underPlace, waitBox, waitHeldAt, type FriendKind, type Spot,
} from './layout'
import { DON_S, GUST_EVERY, HICCUPS, LASTS, SNEEZED, STRIDE, hatKnocks, hatSway, nextVariant, windAt, type Happening } from './motion'
import { makeRng, type Rng } from './rng'
import { FRIENDS, PEGS, deal, theOtherThree, type At, type Save, type SavedCat, type SavedLeaver, type SavedSoap, type Where } from './save'
import { Scene, type Beat } from './scene'
import { beginCycle, finishCycle, type GameState } from './state'
import { DAMP, HIDE_CELLS, SOAPY, anchorAtRest, decodeHide, encodeHide, cleanHide, opinion, rubHide, wearNear, wearsOf, type Wear } from './taste'
import * as V from './voices'

// The yard's model: everything that stands in it, what a finger does to it and
// how it moves on by itself. Pure: no canvas, no audio and no clock of its
// own. Time arrives through `step`, chance through two seeded streams (one
// for what is saved, one for what only decorates), and sounds leave as notes
// in `heard`.
//
// What is saved is always at rest. A garment thrown to the board is on the
// board from the moment it is thrown, a thing in the hand is still where it
// was picked up until it is let go, and a scene's outcome is in the state
// from the scene's first moment: the flights, the walks and the beats are
// only how the view shows the yard getting there.

/** A thing on its way to where it now belongs: where it started, and how far along it is. */
export type Fly = { x0: number; y0: number; size0: number; t: number; lasts: number; arc: number }

export type Garment = {
  index: number
  kind: Kind
  /** Whose it is: the place of its friend. */
  owner: number
  at: At
  n: number
  x: number
  y: number
  mud: number[]
  /** The rubbing each cell has had since it last gave up a step. Not saved. */
  work: number[]
  /** How wet and how soapy, 0 to 10. */
  wet: number
  suds: number
  pegs: [boolean, boolean]
  /** Goes up each time the mud changes, so the view knows when to stitch it again. */
  rev: number
  /** Seconds since it came to where it is. */
  since: number
  /** How far it is twisted on the rail, 0 to 1; it springs back. */
  twist: number
  /** How often the dungarees have been wrung without giving anything up. */
  groans: number
  fly: Fly | null
  sinceDrip: number
  sinceBubble: number
}

export type Reaction = { what: Happening; variant: number; age: number }

/** Anyone drawn as a friend: the three of this cycle, and those who are walking off. */
export type Figure = {
  kind: FriendKind
  colour: 0 | 1
  /** Where its feet are and how large it is drawn. */
  x: number
  y: number
  scale: number
  /** Behind the gate: only what is above the gate's top bar shows. */
  clip: boolean
  hidden: boolean
  hide: number[]
  wet: number
  wears: Garment | null
  on: Wear
  /** 0 to 1 through putting on what it wears; 1 when it is on. */
  donning: number
  /** What it holds out, if anything. */
  holds: Garment | null
  reaction: Reaction | null
  lastVariant: number
  /** How many steps it has walked, with a fraction, and whether it is walking now. */
  steps: number
  walking: boolean
  /** How far it has sunk into the tub, 0 to 1. */
  sunk: number
  /** The goat in a muddy thing: how far its neck is stretched and its nose turned away, 0 to 1. It stays so for as long as it wears the thing. */
  stretch: number
}

export type Friend = Figure & {
  index: number
  where: Where
  /** A walk back to where it belongs, outside any scene. */
  move: { x0: number; y0: number; s0: number; t: number; lasts: number } | null
  sinceDripped: number
  sinceBuzz: number
}

export type Peg = {
  shiny: boolean
  /** At its place on the line, playing a cell on the board or the rail, on a friend, or chained under another peg. */
  state: 'home' | 'board' | 'rail' | 'friend' | 'chain'
  /** The friend or the peg it is on. */
  to: number
  age: number
  muddy: number
  fly: Fly | null
}

export type Cat = SavedCat & { reaction: Reaction | null; lastVariant: number; fly: Fly | null; muddy: number; shaking: number; scale: number; tuck: number }
export type Soap = SavedSoap & { fly: Fly | null; muddy: number; act: 'sledge' | 'shoot' | 'fall' | null; age: number }

/** One knot of suds on the board cloth, in the cloth's unit box. `fall` is how far it has slid once the heap goes; `born` is when in the soaping it appears. */
export type Knot = { u: number; v: number; r: number; fall: number; born: number; grey: boolean }
export type Bubble = { x: number; y: number; r: number; vx: number; vy: number; age: number; wobble: number }
/** A loose thread or a drop in the air. */
export type Loose = { x: number; y: number; vx: number; vy: number; turn: number; spin: number; age: number; life: number; what: 'mud' | 'water' | 'suds' }
/** A dollop of mud on its way from the puddle. `cells` are the cells it has already changed, hidden until it lands. */
export type Dollop = { x0: number; y0: number; x1: number; y1: number; t: number; cells: number[]; was: number[]; garment: Garment | null }
export type Ring = { x: number; y: number; age: number }
/** A trickle of brown on its way down the board to the tub: where its lower end is. */
export type Run = { x: number; y: number }
/** A garment nobody wears, on its way back to its owner as the friends walk off. */
export type Ghost = { garment: Garment; x0: number; y0: number; size0: number; to: Figure; t: number }

export type Thing = { what: 'garment'; i: number } | { what: 'cat' } | { what: 'soap' } | { what: 'peg'; i: number } | { what: 'friend'; i: number }

/** What the idle ladder points at: the one thing a child would want next. */
export type Want = { how: 'rub' | 'tap'; x: number; y: number; w: number; h: number }

type Grab =
  | { how: 'none' }
  | { how: 'rub' }
  | { how: 'wring' }
  | { how: 'tubrub'; friend: number }
  | { how: 'pending'; thing: Thing }
  | { how: 'carry'; thing: Thing }

const FLIGHT_S = 0.42
const DOLLOP_S = 0.5
const GRAVITY = 900
const MAX_LOOSE = 60
const MAX_BUBBLES = 8
/** The most trickles of brown on the board at once. */
const MAX_RUNS = 8
/** How fast a trickle runs down the board, in units a second, and where it meets the water. */
const RUN_SPEED = 260
const RUN_END = TUB.y + 30
/** How far the scarf comes across the board with the finger before it lets go for the next length. */
export const SCARF_LENGTH = 30
/** How long after a shirt is sent to the line, and how long into a gust at place `n`, its voice claps: its sleeves clap then. */
/** Where the two cuffs of the wrung shirt lie, from the middle of where it hangs on the rail: this far to each side, and this far down. */
export const CUFFS_WRUNG = { dx: 8, dy: -20 }
/** What clouds the tub: a cell of mud off cloth, a patch off a hide, the cloud at which nothing more would show, and how fast the mud sinks once the water is let clear (a second). */
export const CLOUDS = { cloth: 0.06, hide: 0.15, full: 12, sinks: 2.5 } as const
/** How strongly the cloud is laid over the water, 0 to 1. */
export const murky = (cloud: number): number => Math.min(0.85, cloud * 0.09)
/** Putting on is over by now at the latest, whatever the two answers (seconds). */
export const DRESSED_BY = 5.9
export const CLAP_AFTER_PEG = FLIGHT_S + 0.06
export const CLAP_AFTER_GUST = (n: number): number => 0.25 + n * 0.12
/** How fast the goat's neck goes up, and comes down again, in parts a second. */
const STRETCH_RATE = 6
/** Where the gust timer stands when the yard is opened: past the swing of a gust, so the next one is still to build. */
const GUST_QUIET = 1.4
/** Stage units of rubbing that fill the cloth with suds once. */
const SUDS_FULL = 3000
/** A finger this fast, in units a second, is at the top of the board's pitch. */
const FAST = 1400
/** How far past the board or the rail a rubbing finger goes before it lifts the thing off. */
const LIFT_OFF = 44
/** A thing let go this near where it was picked up was only nudged: that is a tap. */
const NUDGE = 40
/** Stage units of finger travel on the rail that make one squeeze. */
const SQUEEZE = 70
/** Seconds the wind takes to dry one tenth of a garment's water, and a wearer's own warmth. */
const DRY_LINE = 2.2
const DRY_WORN = 3.5
/** How many pegs each garment hangs by. */
const NEEDS: Record<Kind, 1 | 2> = { sock: 1, shirt: 2, dungarees: 2, jumper: 2, hat: 2, scarf: 1 }
/** How soapy the bar leaves each garment, in tenths: the jumper most, the dungarees hardly. */
const LATHER: Record<Kind, number> = { sock: 6, shirt: 6, dungarees: 3, jumper: 10, hat: 6, scarf: 6 }
export const LATHER_S = 1.6
/** How many friends step in on the first touch of a cycle, by the place in the designed order. */
const STEP_IN = (position: string): number => Math.max(1, LADDER.indexOf(position) + 1)

export const BOARD_SPOT: Spot = { x: CLOTH.x + CLOTH.w / 2, y: CLOTH.y + CLOTH.h / 2 }
const SOAP_TUB: Spot = { x: 306, y: 664 }
const CAT_RAIL: Spot = { x: RAIL.hang.x, y: RAIL.y - 36 }
/** Where a waiting friend's feet are before it has come up behind the gate. */
const BELOW_GATE = 150
/** The highest a friend's feet stand on the grass in front of the fence. */
const GROUND = 560
/** How fast the cat on the line pulls its legs and tail up when a friend comes near, in parts a second. */
const TUCK_RATE = 8

const weightOf = (kind: Kind): number => KINDS.indexOf(kind) / (KINDS.length - 1)

export class Yard {
  garments: Garment[]
  friends: Friend[]
  /** Those who are walking off: shown until they are on the hill or down the lane. */
  leaving: Figure[] = []
  readonly ghosts: Ghost[] = []
  readonly cat: Cat
  readonly soap: Soap
  readonly pegs: Peg[]
  /** The tub: how cloudy and how full, each 0 to 10. */
  readonly water: { cloud: number; level: number }
  /** The cloud as the tub shows it: it rises with the water's and sinks slowly after it. Not saved. */
  murk: number
  /** The last three who walked off as the save has them, and as the hill shows them: the hill catches up when they arrive. */
  hill: SavedLeaver[]
  hillShown: SavedLeaver[]
  /** While some walk off: how many of the oldest on the hill go over its far side, and how far the rest have moved up to make room, 0 to 1. Not saved. */
  hillShift: { by: number; t: number } | null = null
  time = 0
  readonly knots: Knot[] = []
  readonly bubbles: Bubble[] = []
  readonly loose: Loose[] = []
  readonly dollops: Dollop[] = []
  readonly rings: Ring[] = []
  readonly runs: Run[] = []
  /** The finger: where it is or last was, and whether it is down. The friends' eyes follow it. */
  readonly finger = { x: BOARD_SPOT.x, y: BOARD_SPOT.y, down: false }
  /** Springs the view draws from: each a displacement that rings and dies away. */
  /** The pucker under the finger on the board, and which way the finger last went across the cloth (a unit step; after a dab it counts as up the board, so what drags behind it hangs down). */
  readonly dimple = { x: 0, y: 0, depth: 0, speed: 0, dx: 0, dy: -1 }
  readonly puddle = { squash: 0, speed: 0 }
  readonly tub = { slosh: 0, speed: 0 }
  readonly line = { pull: 0, speed: 0, at: 0.5 }
  /** The gate: how far open, 0 to 1, and a rattle that rings and dies away. */
  readonly gate = { open: 0, rattle: 0, speed: 0 }
  /** The hat's bobble on the board, pushed about by the finger. */
  readonly bobble = { dx: 0, dy: 0 }
  /** The scarf on the board: how far it has come across with the finger, in stage units. It lets go at a whole length. */
  readonly scarf = { pull: 0 }
  /** The heap of suds is sliding off into the tub: 0 when it is not, else seconds since it went. */
  sliding = 0
  /** The sock's stripes flash as mud comes off it: 1 when it does, and gone in a quarter of a second. */
  flash = 0
  /** The bar is at work on the board garment: seconds since it began, or -1. */
  lather = -1
  /** Seconds since the last gust began. It is not saved: an opened yard waits for a gust of its own, and nothing slides off the line before the child has seen that gust build. */
  gust = GUST_QUIET
  /** What the finger has in hand, and where; null when nothing. */
  carried: (Thing & { x: number; y: number }) | null = null
  /** What the finger has only just landed on. */
  lit: Thing | null = null
  /** The notes this step or this touch set off. The Mount plays them and empties the list. */
  heard: Note[] = []
  /** Whether anything a save holds has changed since the Mount last asked, and whether it must be written at once. */
  /** A yard asks to be written as soon as it is made: the three a first visit is dealt are then the same three at the next opening, even when the game is put away before any touch. */
  changed = true
  urgent = true

  private base: GameState
  private seed: number
  private readonly fancy: Rng
  private scene: Scene | null = null
  private grab: Grab = { how: 'none' }
  private pressAt: Spot = { x: 0, y: 0 }
  private rubbed = false
  private travel = 0
  private crossed = 0
  private speed = 0
  private squeeze = 0
  private sinceScrub = 0
  private sinceSqueak = 0
  private sudsOwed = 0
  private purrIn = 1.2
  private bubbleOwed = 0
  private yowls = 0
  private readonly shown = cleanMud()

  constructor(save: Save) {
    this.base = { v: save.v, position: save.position, finished: save.finished }
    this.seed = save.seed
    this.fancy = makeRng(save.seed ^ 0x5f3759df)
    this.water = { cloud: save.water.cloud, level: save.water.level }
    this.murk = this.water.cloud
    this.garments = save.garments.map((saved, index) => this.garmentOf(index, saved.kind, saved.owner, saved.at, saved.n, saved.x, saved.y, decodeMud(saved.mud, saved.kind) ?? cleanMud(), saved.wet, saved.suds, [saved.pegs[0], saved.pegs[1]]))
    this.friends = save.friends.map((saved, index) => {
      const friend = this.friendOf(index, saved.colour, saved.where, decodeHide(saved.hide) ?? cleanHide(), saved.wet)
      if (saved.wears >= 0 && this.garments[saved.wears]) { friend.wears = this.garments[saved.wears]; friend.on = saved.on }
      return friend
    })
    this.cat = { ...save.cat, reaction: null, lastVariant: -1, fly: null, muddy: 0, shaking: 0, scale: 1, tuck: 0 }
    this.soap = { ...save.soap, fly: null, muddy: 0, act: null, age: 0 }
    this.pegs = save.pegs.map((shiny) => ({ shiny, state: 'home', to: 0, age: 0, muddy: 0, fly: null }))
    this.hill = save.hill.map((leaver) => ({ ...leaver }))
    this.hillShown = this.hill
    this.refresh()
    this.layKnots()
    // Found as left: the cat on the line is already tucked up if a friend is near, and a goat in a muddy thing already has its neck up.
    this.cat.tuck = this.tuckWanted()
    for (const friend of this.friends) friend.stretch = this.stretchWanted(friend)
  }

  private garmentOf(index: number, kind: Kind, owner: number, at: At, n: number, x: number, y: number, mud: number[], wet: number, suds: number, pegs: [boolean, boolean]): Garment {
    return { index, kind, owner, at, n, x, y, mud, work: cleanMud(), wet, suds, pegs, rev: 0, since: 60, twist: 0, groans: 0, fly: null, sinceDrip: 0, sinceBubble: 0 }
  }

  private friendOf(index: number, colour: 0 | 1, where: Where, hide: number[], wet: number): Friend {
    const kind = FRIEND_KINDS[index]
    const friend: Friend = { index, kind, colour, where, x: 0, y: 0, scale: 1, clip: false, hidden: false, hide, wet, wears: null, on: 'torso', donning: 1, holds: null, reaction: null, lastVariant: -1, steps: 0, walking: false, sunk: 0, stretch: 0, move: null, sinceDripped: 9, sinceBuzz: 0 }
    this.stand(friend)
    return friend
  }

  /** Where a friend belongs by where it is, and whether it is behind the gate. */
  homeOf(friend: Friend): { x: number; y: number; scale: number } {
    if (friend.where === 'yard') return { x: PLACE_X[friend.index], y: FEET_Y, scale: YARD_SCALE }
    if (friend.where === 'tub') return { x: TUB_FRIEND.x, y: TUB_FRIEND.y, scale: YARD_SCALE }
    return { x: WAIT_X[friend.index], y: WAIT_FEET[friend.kind], scale: WAIT_SCALE }
  }

  /** Puts a friend where it belongs, at once. */
  private stand(friend: Friend): void {
    const home = this.homeOf(friend)
    friend.x = home.x; friend.y = home.y; friend.scale = home.scale
    friend.clip = friend.where !== 'yard' && friend.where !== 'tub'
    friend.sunk = friend.where === 'tub' ? 1 : 0
    friend.walking = false
    friend.move = null
  }

  /** What each friend holds out: its own garment, for as long as it has not handed it over. */
  private refresh(): void {
    for (const friend of this.friends) {
      const own = this.garments.find((garment) => garment.owner === friend.index && garment.at === 'held')
      friend.holds = own && !own.fly && !this.isCarried({ what: 'garment', i: own.index }) ? own : null
    }
  }

  toSave(): Save {
    return {
      ...this.base,
      seed: this.seed,
      friends: this.friends.map((friend) => ({ kind: friend.kind, colour: friend.colour, where: friend.where, hide: encodeHide(friend.hide), wet: Math.round(friend.wet), wears: friend.wears ? friend.wears.index : -1, on: friend.wears ? friend.on : 'torso' })),
      garments: this.garments.map((garment) => ({ kind: garment.kind, owner: garment.owner, at: garment.at, n: garment.n, x: garment.x, y: garment.y, mud: encodeMud(garment.mud), wet: Math.round(garment.wet), suds: Math.round(garment.suds), pegs: [garment.pegs[0], garment.pegs[1]] })),
      water: { cloud: Math.round(this.water.cloud), level: Math.round(this.water.level) },
      cat: { at: this.cat.at, n: this.cat.n, wet: Math.round(this.cat.wet), fluff: Math.round(this.cat.fluff) },
      soap: { at: this.soap.at, n: this.soap.n },
      pegs: this.pegs.map((peg) => peg.shiny),
      hill: this.hill.map((leaver) => ({ ...leaver })),
    }
  }

  get position(): string {
    return this.base.position
  }

  get finished(): boolean {
    return this.base.finished
  }

  /** A scene is playing: that is not idleness. */
  get sceneRunning(): boolean {
    return this.scene !== null && this.scene.running
  }

  get carrying(): boolean {
    return this.carried !== null
  }

  isCarried(thing: Thing): boolean {
    const held = this.carried
    return held !== null && held.what === thing.what && (!('i' in held) || !('i' in thing) || held.i === thing.i)
  }

  /** The garment that lies on the board, hangs on the rail or hangs at a place of the line, if any. */
  garmentAt(at: At, n = 0): Garment | null {
    return this.garments.find((garment) => garment.at === at && (at !== 'line' || garment.n === n)) ?? null
  }

  private boardFree(): boolean {
    return !this.garmentAt('board') && this.cat.at !== 'board'
  }

  private railFree(): boolean {
    return !this.garmentAt('rail') && this.cat.at !== 'rail'
  }

  private lineFree(n: number): boolean {
    return !this.garmentAt('line', n) && !(this.cat.at === 'line' && this.cat.n === n)
  }

  /** Whether a garment has come to rest where it belongs: not in the air and not in the hand. */
  private settled(garment: Garment): boolean {
    return !garment.fly && !this.isCarried({ what: 'garment', i: garment.index })
  }

  /** Where a garment rests, and how large it is there. One that is held or worn is given where the friend stands still. */
  spotOf(garment: Garment): { x: number; y: number; size: number } {
    switch (garment.at) {
      case 'held': {
        const owner = this.friends[garment.owner]
        if (owner.where === 'gate') { const at = waitHeldAt(owner.index, owner.kind); return { x: at.x, y: at.y, size: WAIT_HELD.size } }
        const at = heldAt(garment.owner)
        return { x: at.x, y: at.y, size: HELD.size }
      }
      case 'tub': return { x: TUB_SLOTS[garment.n % TUB_SLOTS.length].x, y: TUB_SLOTS[garment.n % TUB_SLOTS.length].y, size: TUB_SIZE }
      case 'board': return { x: BOARD_SPOT.x, y: BOARD_SPOT.y, size: CLOTH.w }
      case 'rail': return { x: RAIL.hang.x, y: RAIL.hang.y, size: RAIL.hang.size }
      case 'line': { const at = lineSpot(garment.n); return { x: at.x, y: at.y, size: LINE_SIZE } }
      case 'friend': {
        const friend = this.friends[garment.n], anchor = anchorAtRest(friend.kind, friend.on)
        return { x: PLACE_X[garment.n] + anchor.x * YARD_SCALE, y: FEET_Y + anchor.y * YARD_SCALE, size: 110 }
      }
      default: return { x: garment.x, y: garment.y, size: GRASS_SIZE }
    }
  }

  /** Whether a figure is a goat that wears a muddy thing and has done sneezing at it: then its neck is at full stretch. */
  stretchWanted(figure: Figure): number {
    if (figure.kind !== 'goat' || !figure.wears || figure.donning < 1 || mudLeft(figure.wears.mud) <= 0) return 0
    const now = figure.reaction
    if (now && (now.what === 'catch' || now.what === 'don' || (now.what === 'sneeze' && now.age < SNEEZED))) return 0
    return 1
  }

  /**
   * Whether the cat on the line has a friend near it: one in the yard or walking through it, or one in the hand.
   * Then it hangs short with its legs and tail tucked up, so it never reaches a head.
   */
  tuckWanted(): number {
    if (this.cat.at !== 'line') return 0
    const x = PLACE_X[this.cat.n]
    const near = (at: number) => Math.abs(at - x) < HUNG.near
    if (this.carried && this.carried.what === 'friend' && near(this.carried.x)) return 1
    // One who has been called in counts from the moment the gate opens for it, so the cat is up before it is through.
    for (const friend of this.friends) if (!friend.hidden && friend.where !== 'gate' && near(friend.x)) return 1
    for (const figure of this.leaving) if (!figure.hidden && !figure.clip && figure.scale > 0.5 && near(figure.x)) return 1
    return 0
  }

  catSpot(): Spot {
    if (this.cat.at === 'board') return BOARD_SPOT
    if (this.cat.at === 'rail') return CAT_RAIL
    if (this.cat.at === 'line') return lineSpot(this.cat.n)
    return { x: CAT.x, y: CAT.y }
  }

  soapSpot(): Spot {
    if (this.soap.at === 'tub') return SOAP_TUB
    if (this.soap.at === 'grass') { const at = underPlace(this.soap.n); return { x: at.x - 44, y: at.y + 6 } }
    return { x: SOAP.x, y: SOAP.y }
  }

  /** Where a peg is and how far it is turned: on the line, running down the board, squeezed on the rail, on a friend, or chained under another peg. */
  pegSpot(i: number): { x: number; y: number; turn: number } {
    const peg = this.pegs[i]
    if (peg.state === 'board') return { x: RIDGES.x + RIDGES.w * 0.5 + Math.sin(peg.age * 40) * 6, y: RIDGES.y + RIDGES.h * Math.min(1, peg.age / 0.66), turn: 0.3 }
    if (peg.state === 'rail') return { x: RAIL.hang.x, y: RAIL.y + 18 + Math.sin(peg.age * 30) * 5 * Math.max(0, 1 - peg.age), turn: 0 }
    if (peg.state === 'friend') {
      const friend = this.friends[peg.to], up = friend.kind === 'pig' ? 362 : friend.kind === 'heron' ? 384 : 226
      const dx = friend.kind === 'pig' ? -52 : friend.kind === 'heron' ? -96 : 0
      return { x: friend.x + dx * friend.scale, y: friend.y - up * friend.scale, turn: friend.kind === 'heron' ? 1.4 : 0.2 }
    }
    if (peg.state === 'chain') { const above = pegHome(peg.to); return { x: above.x, y: above.y + 26, turn: Math.sin(this.time * 2.2 + i) * 0.25 } }
    const home = pegHome(i)
    return { x: home.x, y: home.y - 4, turn: 0 }
  }

  /** The board garment's mud as the view shows it: a dollop still in the air has not landed on it yet. */
  mudShown(garment: Garment): readonly number[] {
    if (!this.dollops.some((flying) => flying.garment === garment)) return garment.mud
    for (let i = 0; i < CELLS; i++) this.shown[i] = garment.mud[i]
    for (const flying of this.dollops) if (flying.garment === garment) flying.cells.forEach((cell, n) => { this.shown[cell] = Math.min(this.shown[cell], flying.was[n]) })
    return this.shown
  }

  private touch(garment: Garment): void {
    garment.rev += 1
    this.changed = true
  }

  private hear(notes: readonly Note[]): void {
    for (const note of notes) this.heard.push(note)
  }

  private react(who: { reaction: Reaction | null }, what: Happening, variant = 0): void {
    who.reaction = { what, variant, age: 0 }
  }

  /** A thing sets off for where it now belongs, from where the view last had it. */
  private flyFrom(x: number, y: number, size: number, lasts = FLIGHT_S, arc = 150): Fly {
    return { x0: x, y0: y, size0: size, t: 0, lasts, arc }
  }

  /** Where the view has a garment now: in the hand, in the air or at rest. */
  private seen(garment: Garment): { x: number; y: number; size: number } {
    if (this.carried && this.isCarried({ what: 'garment', i: garment.index })) return { x: this.carried.x, y: this.carried.y, size: 110 }
    return flown(garment.fly, this.spotOf(garment))
  }

  /** A garment goes somewhere else. It is there from this moment; the flight is only how it is shown getting there. */
  private send(garment: Garment, at: At, n = 0, x = 0, y = 0): void {
    const from = this.seen(garment)
    const wasOnBoard = garment.at === 'board'
    for (const friend of this.friends) if (friend.wears === garment) friend.wears = null
    garment.at = at; garment.n = n; garment.x = x; garment.y = y
    garment.pegs = [false, false]
    garment.since = 0; garment.twist = 0; garment.groans = 0
    garment.fly = this.flyFrom(from.x, from.y, from.size)
    if (wasOnBoard || at === 'board') {
      this.knots.length = 0
      this.sliding = 0
      this.lather = -1
    }
    if (at === 'board' || at === 'tub') garment.wet = 10
    this.changed = true
    this.refresh()
  }

  private toBoard(garment: Garment): void {
    const lies = this.garmentAt('board')
    if (lies && lies !== garment) this.toTub(lies)
    if (this.cat.at === 'board') this.catTo('fence', 0)
    this.send(garment, 'board')
  }

  private toTub(garment: Garment): void {
    const taken = this.garments.filter((other) => other !== garment && other.at === 'tub').map((other) => other.n)
    const slot = [0, 1, 2].find((n) => !taken.includes(n)) ?? 0
    this.send(garment, 'tub', slot)
    // The jumper drinks the tub.
    if (garment.kind === 'jumper') this.water.level = Math.max(2, this.water.level - 3)
  }

  private toLine(garment: Garment, n: number): void {
    this.send(garment, 'line', n)
    garment.pegs = NEEDS[garment.kind] === 1 ? [true, false] : [true, true]
    for (const i of [n * 2, n * 2 + 1]) if (this.pegs[i].state !== 'home') this.pegHome(i)
  }

  private pegHome(i: number): void {
    const peg = this.pegs[i], from = this.carried && this.isCarried({ what: 'peg', i }) ? this.carried : this.pegSpot(i)
    peg.state = 'home'; peg.age = 0
    peg.fly = this.flyFrom(from.x, from.y, 0, 0.3, 40)
    for (const other of this.pegs) if (other.state === 'chain' && other.to === i && other !== peg) { other.state = 'home'; other.fly = this.flyFrom(pegHome(i).x, pegHome(i).y + 26, 0, 0.3, 40) }
  }

  private catTo(at: SavedCat['at'], n: number, fromX?: number, fromY?: number): void {
    const from = fromX === undefined || fromY === undefined ? this.catSpot() : { x: fromX, y: fromY }
    this.cat.at = at; this.cat.n = n
    this.cat.fly = this.flyFrom(from.x, from.y, 0, 0.5, 120)
    this.cat.shaking = 0
    this.yowls = 0
    this.changed = true
  }

  private soapTo(at: SavedSoap['at'], n: number, from: Spot, lasts = FLIGHT_S, arc = 90): void {
    this.soap.at = at; this.soap.n = n
    this.soap.fly = this.flyFrom(from.x, from.y, 0, lasts, arc)
    this.changed = true
  }

  // --- The finger ------------------------------------------------------------

  /** The finger lands. A scene that is playing ends first, and then everything the touch sets off starts here, in this call. */
  press(x: number, y: number): void {
    // Whatever the finger crossed before it lifted has its ticks first.
    this.tick(1 / 60)
    this.endScene()
    this.finger.x = x; this.finger.y = y; this.finger.down = true
    this.pressAt = { x, y }
    this.grab = { how: 'none' }
    this.lit = null
    this.rubbed = false
    this.travel = 0; this.squeeze = 0
    if (this.pop(x, y, 14)) return
    for (let i = 0; i < PEGS; i++) {
      const at = this.pegSpot(i)
      if (!this.pegs[i].fly && Math.hypot(x - at.x, y - at.y) <= 28) return this.pend({ what: 'peg', i })
    }
    const bar = this.soapSpot()
    if (!this.soap.fly && Math.hypot(x - bar.x, y - bar.y) <= SOAP.r) return this.pend({ what: 'soap' })
    const puss = this.catSpot()
    if (this.cat.at !== 'board' && !this.cat.fly && Math.hypot(x - puss.x, y - puss.y) <= CAT.r) return this.pend({ what: 'cat' })
    if (inBox(BOARD, x, y)) {
      this.grab = { how: 'rub' }
      this.dab(x, y)
      return
    }
    if (inBox(RAIL.box, x, y)) return this.pressRail()
    for (let n = 0; n < FRIENDS; n++) {
      const at = lineSpot(n)
      if (!inBox(boxAt(at.x, at.y, LINE_SIZE), x, y, 6)) continue
      const hangs = this.garmentAt('line', n)
      if (hangs) { if (this.settled(hangs)) this.pend({ what: 'garment', i: hangs.index }) }
      else this.pressLinePlace(n)
      return
    }
    // What floats in the tub floats close together: the touch takes the one whose middle is nearest.
    let floats: Garment | null = null, near = TUB_SIZE * 0.55
    for (const garment of this.garments) {
      if (garment.at !== 'tub' || !this.settled(garment)) continue
      const at = this.spotOf(garment), far = Math.hypot(x - at.x, y - at.y)
      if (far <= near) { floats = garment; near = far }
    }
    if (floats) return this.pend({ what: 'garment', i: floats.index })
    const bather = this.friends.find((friend) => friend.where === 'tub' && !friend.move)
    if (bather && this.onFriend(bather, x, y)) {
      this.grab = { how: 'tubrub', friend: bather.index }
      this.rubFriend(bather, x, y, 60)
      return
    }
    for (const garment of this.garments) {
      if ((garment.at !== 'grass' && garment.at !== 'puddle') || !this.settled(garment)) continue
      if (inBox(boxAt(garment.x, garment.y, GRASS_SIZE), x, y, 8)) return this.pend({ what: 'garment', i: garment.index })
    }
    // A garment held out is in front of whoever stands behind it, so it is asked first.
    for (const friend of this.friends) {
      if (friend.where !== 'yard' || !friend.holds) continue
      const at = heldAt(friend.index)
      if (inBox(boxAt(at.x, at.y, HELD.size), x, y, 8)) return this.pend({ what: 'garment', i: friend.holds.index })
    }
    // What a friend wears may stick out of its body, on a beak or a horn: a touch there is a touch on the garment.
    for (const friend of this.friends) {
      if (friend.where !== 'yard' || !friend.wears || !this.settled(friend.wears)) continue
      const at = this.spotOf(friend.wears)
      if (Math.hypot(x - at.x, y - at.y) <= 48) return this.pend({ what: 'garment', i: friend.wears.index })
    }
    for (const friend of this.friends) {
      if (friend.where !== 'yard' || !this.onFriend(friend, x, y)) continue
      if (friend.wears && this.settled(friend.wears)) return this.pend({ what: 'garment', i: friend.wears.index })
      if (friend.holds) return this.pend({ what: 'garment', i: friend.holds.index })
      return this.pend({ what: 'friend', i: friend.index })
    }
    for (const friend of this.friends) {
      if (friend.where === 'gate' && !friend.hidden && inBox(waitBox(friend.index, friend.kind), x, y)) return this.comeIn(friend.index)
    }
    if (inBox(GATE, x, y)) return this.touchGate()
    if (inOval(PUDDLE.x, PUDDLE.y, PUDDLE.rx + 14, PUDDLE.ry + 22, x, y)) return this.blop()
    if (inOval(TUB.x, TUB.y, TUB.rx, TUB.ry + TUB.depth * 0.5, x, y)) {
      this.tub.speed += 5
      for (let n = 0; n < 4; n++) this.throwLoose(x, Math.min(y, TUB.y + 20), 'water', 220)
      this.hear(V.plip(this.fancy.next()))
      return
    }
    if (Math.abs(y - lineY(x)) < 34 && x > LINE.x0 && x < LINE.x1) return this.pluckLine(x)
    this.rings.push({ x, y, age: 0 })
    if (this.rings.length > 4) this.rings.shift()
    this.hear(V.pluck(Math.max(0, Math.min(1, x / 1180)), this.fancy.next()))
  }

  private onFriend(friend: Figure, x: number, y: number): boolean {
    const oval = bodyOval(friend.kind, friend.x, friend.y, friend.scale)
    return inOval(oval.cx, oval.cy, oval.rx, oval.ry, x, y)
  }

  /** Whether a garment let go here is let go on this friend: on its body, or close to a place where the garment fits, which may stick out of the body as a beak or a horn does. */
  private reaches(friend: Figure, kind: Kind, x: number, y: number): boolean {
    if (this.onFriend(friend, x, y)) return true
    return wearsOf(friend.kind, kind).some((wear) => {
      const at = anchorAtRest(friend.kind, wear)
      return Math.hypot(x - (friend.x + at.x * friend.scale), y - (friend.y + at.y * friend.scale)) <= 52
    })
  }

  /** The finger has landed on a thing that a tap acts on and a drag carries: it is noticed at once, and what it does waits for the lift or the first move. */
  private pend(thing: Thing): void {
    this.grab = { how: 'pending', thing }
    this.lit = thing
    this.hear(V.noticed(this.fancy.next()))
    if (thing.what === 'friend') this.react(this.friends[thing.i], 'noticed')
    else if (thing.what === 'cat') this.react(this.cat, 'noticed')
    else if (thing.what === 'garment') {
      const garment = this.garments[thing.i]
      const friend = this.friends.find((other) => other.wears === garment || other.holds === garment)
      if (friend && !friend.reaction) this.react(friend, 'noticed')
    }
  }

  private pluckLine(x: number): void {
    this.line.at = (x - LINE.x0) / (LINE.x1 - LINE.x0)
    this.line.speed += 14
    this.hear(V.twang(this.line.at))
  }

  /** A touch on the rail: a thing that hangs there is squeezed once, the cat shakes itself, and an empty rail takes what lies on the board. */
  private pressRail(): void {
    const hangs = this.garmentAt('rail')
    if (hangs) {
      if (!this.settled(hangs)) return
      this.grab = { how: 'wring' }
      this.wring(hangs)
      return
    }
    if (this.cat.at === 'rail') {
      if (!this.cat.fly) this.shakeCat()
      return
    }
    const lies = this.garmentAt('board')
    if (lies && this.settled(lies)) {
      this.send(lies, 'rail')
      return
    }
    this.hear(V.tickDry(0.5, this.fancy.next()))
  }

  /** A touch on an empty place of the line: what hangs on the rail is pegged there. */
  private pressLinePlace(n: number): void {
    const hangs = this.garmentAt('rail')
    if (hangs && this.settled(hangs) && this.lineFree(n)) {
      this.toLine(hangs, n)
      return
    }
    this.pluckLine(PLACE_X[n])
  }

  /** The finger moves while down. */
  drag(x: number, y: number): void {
    const x0 = this.finger.x, y0 = this.finger.y
    this.finger.x = x; this.finger.y = y
    const length = Math.hypot(x - x0, y - y0)
    if (this.grab.how === 'none') return
    if (this.grab.how === 'pending') {
      if (!this.canCarry(this.grab.thing)) {
        // A friend that will not come away in the hand (it wears a thing, holds one or is on its way) answers the pull as
        // itself, as it answers a tap: it hands over what it holds, or jiggles in its own way with its own voice.
        if (this.grab.thing.what === 'friend' && Math.hypot(x - this.pressAt.x, y - this.pressAt.y) > NUDGE) {
          const thing = this.grab.thing
          this.grab = { how: 'none' }
          this.lit = null
          this.tapThing(thing)
        }
        return
      }
      this.pickUp(this.grab.thing, true)
    }
    if (this.grab.how === 'carry') {
      if (this.carried) { this.carried.x = x; this.carried.y = y }
      if (this.carried && this.carried.what === 'friend') {
        // A friend in the hand dangles from the finger.
        const friend = this.friends[this.carried.i]
        friend.x = x; friend.y = y + 150; friend.scale = YARD_SCALE; friend.sunk = 0; friend.clip = false
      }
      return
    }
    this.pop(x, y, 4)
    if (this.grab.how === 'rub') {
      if (inBox(BOARD, x, y, LIFT_OFF)) return this.rubBoard(x0, y0, x, y, length)
      // The finger has left the board: whatever lay on it comes away in the hand.
      const lies = this.garmentAt('board')
      if (lies && this.settled(lies)) this.pickUp({ what: 'garment', i: lies.index }, false)
      else if (this.cat.at === 'board' && !this.cat.fly) this.pickUp({ what: 'cat' }, false)
      else this.grab = { how: 'none' }
      return
    }
    if (this.grab.how === 'wring') {
      const hangs = this.garmentAt('rail')
      if (!hangs) return
      if (!inBox(RAIL.box, x, y, LIFT_OFF)) return this.pickUp({ what: 'garment', i: hangs.index }, false)
      this.squeeze += length
      while (this.squeeze >= SQUEEZE) {
        this.squeeze -= SQUEEZE
        this.wring(hangs)
      }
      return
    }
    const grab: Grab = this.grab
    if (grab.how !== 'tubrub') return
    const bather = this.friends[grab.friend]
    const oval = bodyOval(bather.kind, bather.x, bather.y, bather.scale)
    if (inOval(oval.cx, oval.cy, oval.rx + LIFT_OFF, oval.ry + LIFT_OFF, x, y)) this.rubFriend(bather, x, y, length)
    else this.pickUp({ what: 'friend', i: bather.index }, false)
  }

  private canCarry(thing: Thing): boolean {
    if (thing.what === 'garment') return this.settled(this.garments[thing.i])
    if (thing.what === 'cat') return !this.cat.fly
    if (thing.what === 'soap') return !this.soap.fly
    if (thing.what === 'peg') return this.pegs[thing.i].state !== 'friend' && !this.pegs[thing.i].fly && !this.pegHolds(thing.i)
    const friend = this.friends[thing.i]
    return !friend.wears && !friend.holds && !friend.move && friend.where !== 'gate'
  }

  /** Whether a peg is on a garment that hangs at its place. */
  private pegHolds(i: number): boolean {
    const hangs = this.garmentAt('line', Math.floor(i / 2))
    return hangs !== null && hangs.pegs[i % 2]
  }

  private nudged = false

  /** The thing comes away in the hand. It still belongs where it was until it is let go somewhere. */
  private pickUp(thing: Thing, fromPress: boolean): void {
    this.carried = { ...thing, x: this.finger.x, y: this.finger.y }
    this.grab = { how: 'carry', thing }
    this.lit = null
    this.nudged = fromPress
    if (this.rubbed) this.hear(V.slap(this.fancy.next()))
    this.rubbed = false
    if (thing.what === 'cat') this.hear(V.mew(2, this.fancy.next()))
    else if (thing.what === 'garment' && this.garments[thing.i].at === 'line') this.hear(V.clack(false, this.fancy.next()))
    else if (thing.what === 'friend') this.hear(V.laugh(this.friends[thing.i].kind, this.fancy.next()))
    else this.hear(V.whoosh(this.fancy.next()))
    if (thing.what === 'garment') {
      // A pull at a friend that wears or holds a thing takes the thing and leaves the friend, and the friend answers
      // the pull as itself: the wearer jiggles in its own voice, the holder lets go as it does when it hands over.
      const garment = this.garments[thing.i]
      const wearer = this.friends.find((friend) => friend.where === 'yard' && friend.wears === garment)
      const holder = this.friends.find((friend) => friend.where === 'yard' && friend.holds === garment)
      if (wearer) this.poke(wearer)
      else if (holder) {
        this.react(holder, 'toss')
        this.hear(V.unsure(holder.kind, this.fancy.next()))
      }
    }
    this.refresh()
  }

  /** The finger lifted in the middle of a drag: the thing waits where it was let go. */
  lift(): void {
    this.finger.down = false
  }

  /** The finger lifted where it landed. */
  tap(): void {
    const grab = this.grab
    this.release()
    if (grab.how === 'pending') this.tapThing(grab.thing)
    else if (grab.how === 'tubrub') {
      // A friend with no mud left on it climbs out again when it is tapped.
      const bather = this.friends[grab.friend]
      if (bather.where === 'tub' && bather.hide.every((level) => level <= 0)) {
        bather.where = 'yard'
        bather.wet = 10
        this.changed = true
        this.walkHome(bather, bather.x, bather.y)
      }
    }
  }

  /** The drag is over where the finger let go: the drop is the child's. */
  drop(): void {
    const held = this.carried, nudged = this.nudged
    this.release()
    if (!held) return
    this.carried = null
    if (nudged && Math.hypot(held.x - this.pressAt.x, held.y - this.pressAt.y) < NUDGE) {
      this.tapThing(held)
      // A tap that sent it nowhere leaves it to settle back from the hand.
      if (!this.onItsWay(held)) this.putBack(held, held.x, held.y)
    } else {
      this.dropThing(held, held.x, held.y)
    }
    this.refresh()
  }

  /** The touch was taken away, which is not the child letting go: the thing in hand goes back where it came from and no move is made. */
  cancel(): void {
    const held = this.carried
    this.release()
    if (!held) return
    this.carried = null
    this.putBack(held, held.x, held.y)
    this.refresh()
  }

  private release(): void {
    this.finger.down = false
    if (this.grab.how === 'rub' && this.rubbed) this.hear(V.slap(this.fancy.next()))
    // The ridges crossed since the last step tick now: a lift throws none of them away.
    this.tick(1 / 60)
    this.grab = { how: 'none' }
    this.lit = null
    this.rubbed = false
  }

  private onItsWay(thing: Thing): boolean {
    if (thing.what === 'garment') return this.garments[thing.i].fly !== null
    if (thing.what === 'cat') return this.cat.fly !== null
    if (thing.what === 'soap') return this.soap.fly !== null
    if (thing.what === 'peg') return this.pegs[thing.i].fly !== null
    return this.friends[thing.i].move !== null
  }

  /** A thing that was in the hand flies back to where it has belonged all along. */
  private putBack(thing: Thing, x: number, y: number): void {
    if (thing.what === 'garment') this.garments[thing.i].fly = this.flyFrom(x, y, 110, 0.3, 60)
    else if (thing.what === 'cat') this.cat.fly = this.flyFrom(x, y, 0, 0.3, 60)
    else if (thing.what === 'soap') this.soap.fly = this.flyFrom(x, y, 0, 0.3, 60)
    else if (thing.what === 'peg') this.pegs[thing.i].fly = this.flyFrom(x, y, 0, 0.3, 40)
    else this.walkHome(this.friends[thing.i], x, y + 120)
  }

  /** A friend walks back to where it belongs, in its own walk. */
  private walkHome(friend: Friend, fromX: number, fromY: number): void {
    const home = this.homeOf(friend)
    // It is set down on the grass below where it was let go, and walks from there: nobody walks through the fence or the gate.
    friend.x = Math.max(300, Math.min(1140, fromX)); friend.y = Math.max(GROUND, Math.min(FEET_Y + 20, fromY)); friend.scale = home.scale
    friend.clip = false
    friend.move = { x0: friend.x, y0: friend.y, s0: friend.scale, t: 0, lasts: Math.max(0.3, Math.hypot(home.x - friend.x, home.y - friend.y) / 420) }
  }

  // --- What a tap does ---------------------------------------------------------

  private tapThing(thing: Thing): void {
    if (thing.what === 'friend') return this.poke(this.friends[thing.i])
    if (thing.what === 'cat') return this.tapCat()
    if (thing.what === 'soap') return this.tapSoap()
    if (thing.what === 'peg') return this.tapPeg(thing.i)
    const garment = this.garments[thing.i]
    if (!this.settled(garment)) return
    const owner = this.friends[garment.owner]
    if (garment.at === 'held') {
      // It hands its garment over: to the board, or into the tub when the board is taken.
      this.react(owner, 'toss')
      this.hear(V.whoosh(this.fancy.next()))
      if (this.boardFree()) this.toBoard(garment)
      else this.toTub(garment)
    } else if (garment.at === 'tub') {
      if (this.boardFree()) this.toBoard(garment)
      else {
        this.tub.speed += 4
        this.hear(V.plip(this.fancy.next()))
      }
    } else if (garment.at === 'line') {
      this.tapPegged(garment)
    } else if (garment.at === 'friend') {
      this.poke(this.friends[garment.n])
    } else if (garment.at === 'grass' || garment.at === 'puddle') {
      const free = [0, 1, 2].find((n) => this.lineFree(n))
      if (mudLeft(garment.mud) === 0 && free !== undefined) this.toLine(garment, free)
      else if (this.boardFree()) this.toBoard(garment)
      else this.toTub(garment)
    }
  }

  /** A tap on a pegged garment: dry, it goes to its owner; wet, it is shaken and drops fall from it. */
  private tapPegged(garment: Garment): void {
    // To its owner and to nobody else. An owner who wears another thing drops that at its feet.
    const owner = this.friends[garment.owner]
    if (garment.wet <= DAMP && owner.where === 'yard' && !owner.move) return this.putOn(garment, owner, wearsOf(owner.kind, garment.kind)[0])
    const at = lineSpot(garment.n)
    this.pluckLine(at.x)
    garment.twist = 1
    if (garment.wet > 0) {
      garment.wet = Math.max(0, garment.wet - 1)
      this.changed = true
      for (let n = 0; n < 5; n++) this.throwLoose(at.x + (this.fancy.next() - 0.5) * 70, at.y + 30, 'water', 140)
      this.dripOn(garment.n)
    }
  }

  private poke(friend: Friend): void {
    const variant = nextVariant(friend.lastVariant, 3, this.fancy.next())
    friend.lastVariant = variant
    this.react(friend, 'poke', variant)
    const r = this.fancy.next()
    this.hear(friend.kind === 'pig' ? V.oink(variant, r) : friend.kind === 'heron' ? V.squawk(variant, r) : V.bleat(variant, r))
  }

  private tapCat(): void {
    const cat = this.cat
    if (cat.at === 'fence') {
      const variant = nextVariant(cat.lastVariant, 3, this.fancy.next())
      cat.lastVariant = variant
      this.react(cat, 'poke', variant)
      this.hear(V.mew(variant, this.fancy.next()))
    } else if (cat.at === 'rail') {
      this.shakeCat()
    } else {
      // Off the line: it drops, lands on its feet and goes back to its post.
      this.hear(V.mew(0, this.fancy.next()))
      this.catTo('fence', 0)
    }
  }

  /** The cat cannot be twisted: it shakes itself from nose to tail and sprays everyone, then goes back to its post. */
  private shakeCat(): void {
    const at = this.catSpot()
    this.cat.shaking = 0.0001
    this.cat.wet = 0
    this.changed = true
    this.hear(V.brrrt(this.fancy.next()))
    for (let n = 0; n < 14; n++) this.throwLoose(at.x + (this.fancy.next() - 0.5) * 80, at.y, 'water', 420)
    this.friends.forEach((friend) => { if (friend.where !== 'gate') this.dripped(friend, true) })
  }

  private tapSoap(): void {
    if (this.soap.at !== 'dish') {
      this.hear(V.slither(this.fancy.next()))
      this.soapTo('dish', 0, this.soapSpot())
      return
    }
    const lies = this.garmentAt('board')
    if (lies && this.settled(lies)) this.soapUp(lies)
    else this.hear(V.slither(this.fancy.next()))
  }

  /** The bar goes over the board garment, and each garment takes the soap in its own way. */
  private soapUp(garment: Garment): void {
    this.lather = 0
    garment.suds = Math.max(garment.suds, LATHER[garment.kind])
    this.changed = true
    this.hear(V.lathered(garment.kind))
    this.knots.length = 0
    this.sliding = 0
    const stream = makeRng(0x50a9 + KINDS.indexOf(garment.kind))
    const lay = (u: number, v: number, r: number, born: number, grey = false) => { if (this.knots.length < MAX_KNOTS) this.knots.push({ u, v, r, fall: 0, born, grey }) }
    const bubbleAt = (u: number, v: number, delay: number) => {
      const at = clothToStage(u, v)
      this.float({ x: at.x, y: at.y, r: 12 + stream.next() * 8, vx: 16 + stream.next() * 20, vy: -30 - stream.next() * 20, age: -delay, wobble: stream.next() * 6 })
    }
    switch (garment.kind) {
      case 'sock':
        // It fills with foam like a sausage, and one bubble squirts out of the toe.
        for (let n = 0; n < 16; n++) { const at = spotOn('sock', stream); lay(at.u, at.v, 8 + stream.next() * 5, at.v * 0.5) }
        bubbleAt(0.92, 0.82, 0.45)
        break
      case 'shirt':
        // Bubbles come out of both cuffs at once.
        for (const u of [0.1, 0.9]) { for (let n = 0; n < 6; n++) lay(u + (stream.next() - 0.5) * 0.12, 0.42 + (stream.next() - 0.5) * 0.12, 6 + stream.next() * 5, 0.2 + n * 0.08); bubbleAt(u, 0.4, 0.3); bubbleAt(u, 0.44, 0.7) }
        break
      case 'dungarees':
        // Thin and grey; the pockets fill and burp.
        for (const u of [0.3, 0.7]) { for (let n = 0; n < 4; n++) lay(u + (stream.next() - 0.5) * 0.1, 0.5 + (stream.next() - 0.5) * 0.1, 5 + stream.next() * 3, 0.3 + n * 0.1, true); bubbleAt(u, 0.5, 0.5 + (u > 0.5 ? 0.22 : 0)) }
        break
      case 'jumper':
        // The most suds of all: a tower that climbs.
        for (let n = 0; n < 30; n++) lay(0.5 + (stream.next() - 0.5) * (0.5 - n * 0.012), 0.6 - n * 0.034, 8 + stream.next() * 6, n * 0.04)
        break
      case 'hat':
        // The bobble turns into a ball of foam twice its size: the view draws it from the garment's suds.
        for (let n = 0; n < 6; n++) { const at = spotOn('hat', stream); lay(at.u, at.v, 5 + stream.next() * 4, 0.4 + n * 0.1) }
        break
      default:
        // Foam runs along it like a lit fuse.
        for (let n = 0; n < 22; n++) lay(0.05 + (n / 21) * 0.9, 0.39 + (stream.next() - 0.5) * 0.1, 7 + stream.next() * 4, (n / 21) * 0.7)
    }
  }

  private tapPeg(i: number): void {
    const peg = this.pegs[i], hangs = this.garmentAt('line', Math.floor(i / 2))
    if (peg.state !== 'home') {
      this.hear(V.clack(true, this.fancy.next()))
      this.pegHome(i)
      return
    }
    if (hangs && this.settled(hangs)) {
      hangs.pegs[i % 2] = !hangs.pegs[i % 2]
      hangs.twist = 0.6
      this.changed = true
      this.hear(V.clack(hangs.pegs[i % 2], this.fancy.next()))
      return
    }
    peg.age = 0.0001
    this.hear(V.clack(true, this.fancy.next()))
  }

  // --- What a drop does --------------------------------------------------------

  private linePlaceAt(x: number, y: number): number {
    return [0, 1, 2].findIndex((n) => { const at = lineSpot(n); return inBox(boxAt(at.x, at.y, LINE_SIZE), x, y, 20) })
  }

  private inTub(x: number, y: number): boolean {
    return inOval(TUB.x, TUB.y, TUB.rx, TUB.ry + TUB.depth * 0.5, x, y)
  }

  private inPuddle(x: number, y: number): boolean {
    return inOval(PUDDLE.x, PUDDLE.y, PUDDLE.rx + 10, PUDDLE.ry + 20, x, y)
  }

  private dropThing(thing: Thing, x: number, y: number): void {
    if (thing.what === 'garment') return this.dropGarment(this.garments[thing.i], x, y)
    if (thing.what === 'cat') return this.dropCat(x, y)
    if (thing.what === 'soap') return this.dropSoap(x, y)
    if (thing.what === 'peg') return this.dropPeg(thing.i, x, y)
    this.dropFriend(this.friends[thing.i], x, y)
  }

  private dropGarment(garment: Garment, x: number, y: number): void {
    const wearer = this.friends.find((friend) => friend.where === 'yard' && !friend.move && this.reaches(friend, garment.kind, x, y))
    if (wearer) return this.putOn(garment, wearer, wearNear(wearer.kind, garment.kind, (x - wearer.x) / wearer.scale, (y - wearer.y) / wearer.scale))
    const place = this.linePlaceAt(x, y)
    if (inBox(RAIL.box, x, y, 10) && (this.railFree() || garment.at === 'rail')) {
      if (garment.at === 'rail') this.putBack({ what: 'garment', i: garment.index }, x, y)
      else this.send(garment, 'rail')
    } else if (inBox(BOARD, x, y, 20)) {
      if (garment.at === 'board') this.putBack({ what: 'garment', i: garment.index }, x, y)
      else this.toBoard(garment)
    } else if (place >= 0 && (this.lineFree(place) || (garment.at === 'line' && garment.n === place))) {
      if (garment.at === 'line' && garment.n === place) this.putBack({ what: 'garment', i: garment.index }, x, y)
      else this.toLine(garment, place)
    } else if (this.inTub(x, y)) {
      this.toTub(garment)
    } else if (this.inPuddle(x, y)) {
      // Into the puddle: it comes out muddy.
      this.send(garment, 'puddle', 0, PUDDLE.x, PUDDLE.y - 6)
      const rng = makeRng(this.seed)
      for (let n = 0; n < 2; n++) { const at = spotOn(garment.kind, rng); dollop(garment.mud, garment.kind, at.u, at.v, 0.12).forEach((cell) => { garment.work[cell] = 0 }) }
      this.seed = rng.state
      this.touch(garment)
      this.puddle.squash = 0.5; this.puddle.speed = 0
    } else if (inBox({ x: 430, y: 500, w: 710, h: 240 }, x, y)) {
      const at = onLawn(x, y)
      this.send(garment, 'grass', 0, at.x, at.y)
    } else {
      this.putBack({ what: 'garment', i: garment.index }, x, y)
    }
  }

  private dropCat(x: number, y: number): void {
    const cat = this.cat, place = this.linePlaceAt(x, y)
    if (inBox(RAIL.box, x, y, 10) && this.railFree()) {
      this.catTo('rail', 0, x, y)
    } else if (inBox(BOARD, x, y, 20)) {
      const lies = this.garmentAt('board')
      if (lies) this.toTub(lies)
      this.catTo('board', 0, x, y)
      cat.wet = 10
      this.hear(V.hissed(this.fancy.next()))
    } else if (place >= 0 && this.lineFree(place)) {
      this.catTo('line', place, x, y)
      this.hear([...V.clack(true, this.fancy.next()), ...V.after(V.purr(this.fancy.next()), 0.3)])
    } else if (this.inTub(x, y)) {
      // It hates water as cats do: in, and out again in the same breath.
      cat.wet = 10
      this.tub.speed += 7
      for (let n = 0; n < 10; n++) this.throwLoose(x, TUB.y, 'water', 380)
      this.hear(V.hissed(this.fancy.next()))
      this.catTo('fence', 0, x, y)
    } else if (this.inPuddle(x, y)) {
      cat.muddy = 1.5
      this.splash(x, y)
      this.catTo(cat.at, cat.n, x, y)
    } else {
      if (inBox(RAIL.box, x, y, 10) || place >= 0) {
        // The place is taken: the cat bats at what hangs there with a cross mew, and goes back where it was.
        const hangs = place >= 0 ? this.garmentAt('line', place) : this.garmentAt('rail')
        if (hangs) hangs.twist = 1
        if (place >= 0) this.pluckLine(PLACE_X[place])
        this.react(cat, 'poke', 1)
        this.hear(V.mew(1, this.fancy.next()))
      }
      this.putBack({ what: 'cat' }, x, y)
    }
  }

  private dropSoap(x: number, y: number): void {
    const soap = this.soap, place = this.linePlaceAt(x, y), r = this.fancy.next()
    if (inBox(RAIL.box, x, y, 10)) {
      // It shoots out of the grip into the air and drops back into the tub.
      soap.act = 'shoot'
      this.hear(V.pfft(r))
      this.soapTo('tub', 0, { x, y }, 0.62, 300)
    } else if (inBox(BOARD, x, y, 20)) {
      const lies = this.garmentAt('board')
      if (lies && this.settled(lies)) {
        this.soapUp(lies)
        this.soapTo('dish', 0, { x, y })
      } else {
        // On the bare board it slides off down the ridges like a sledge and lands in the tub, leaving a carpet of foam.
        soap.act = 'sledge'
        this.hear(V.whee(r))
        this.soapTo('tub', 0, { x: BOARD_SPOT.x, y: RIDGES.y }, 0.5, 0)
        this.knots.length = 0
        for (let n = 0; n < 18; n++) this.knots.push({ u: 0.5 + (this.fancy.next() - 0.5) * 0.24, v: 0.04 + (n / 17) * 0.92, r: 7 + this.fancy.next() * 4, fall: 0, born: (n / 17) * 0.45, grey: false })
        this.lather = 0
      }
    } else if (place >= 0) {
      // The peg slips off it and it falls on whoever stands below.
      soap.act = 'fall'
      const at = lineSpot(place)
      this.hear(V.clack(false, r))
      this.soapTo('grass', place, { x: at.x, y: at.y - 30 }, 0.34, 0)
    } else if (this.inTub(x, y)) {
      this.hear(V.plop(r))
      this.tub.speed += 3
      this.soapTo('tub', 0, { x, y }, 0.2, 0)
    } else if (this.inPuddle(x, y)) {
      soap.muddy = 1.5
      this.splash(x, y)
      this.soapTo(soap.at, soap.n, { x, y })
    } else {
      this.putBack({ what: 'soap' }, x, y)
    }
  }

  private dropPeg(i: number, x: number, y: number): void {
    const peg = this.pegs[i], r = this.fancy.next()
    const friend = this.friends.find((other) => other.where !== 'gate' && this.onFriend(other, x, y))
    const other = this.pegs.findIndex((_, j) => j !== i && this.pegs[j].state === 'home' && Math.hypot(x - pegHome(j).x, y - pegHome(j).y) <= 34)
    if (peg.state === 'chain') peg.state = 'home'
    if (inBox(RAIL.box, x, y, 10)) {
      // It has nothing in it: it squeaks like a rubber toy and its spring boings.
      peg.state = 'rail'; peg.age = 0
      this.hear(V.rubber(r))
    } else if (inBox(BOARD, x, y, 20)) {
      // It runs down the ridges like a stick along railings and comes out pale and shiny.
      peg.state = 'board'; peg.age = 0
      peg.shiny = true
      this.changed = true
      this.hear(V.clatter(r))
    } else if (friend) {
      peg.state = 'friend'; peg.to = friend.index; peg.age = 0
      this.react(friend, 'pegged')
      this.hear([...V.clack(true, r), ...V.after(V.puzzled(friend.kind, r), 0.3)])
    } else if (other >= 0) {
      peg.state = 'chain'; peg.to = other; peg.age = 0
      this.hear([...V.clack(true, r), ...V.after(V.jingle(r), 0.08)])
    } else if (this.inPuddle(x, y)) {
      peg.muddy = 1.5
      this.splash(x, y)
      this.pegs[i].fly = this.flyFrom(x, y, 0, 0.3, 40)
    } else {
      this.pegs[i].fly = this.flyFrom(x, y, 0, 0.3, 40)
    }
  }

  private dropFriend(friend: Friend, x: number, y: number): void {
    const r = this.fancy.next()
    const tubTaken = this.friends.some((other) => other !== friend && other.where === 'tub')
    if ((this.inTub(x, y) || inBox(BOARD, x, y)) && !tubTaken) {
      // It climbs into the tub in its own way.
      if (friend.where !== 'tub') { friend.where = 'tub'; this.changed = true }
      this.stand(friend)
      friend.sunk = 0
      this.react(friend, 'climb')
      this.hear(V.climbIn(friend.kind, r))
      this.tub.speed += 8
      for (let n = 0; n < 10; n++) this.throwLoose(TUB_FRIEND.x + (this.fancy.next() - 0.5) * 120, TUB.y, 'water', 340)
      return
    }
    if (friend.where === 'tub') { friend.where = 'yard'; friend.sunk = 0; this.changed = true }
    if ((this.inTub(x, y) || inBox(BOARD, x, y)) && tubTaken) {
      // The tub holds one: this one balks at the rim in its own voice, and the bather splashes it for coming.
      const bather = this.friends.find((other) => other !== friend && other.where === 'tub')!
      this.react(friend, 'refuse')
      this.react(bather, 'tickle')
      this.hear([...V.unsure(friend.kind, r), ...V.after(V.laugh(bather.kind, r), 0.25)])
      this.tub.speed += 6
      friend.wet = Math.min(10, friend.wet + 3)
      this.changed = true
      for (let n = 0; n < 8; n++) this.throwLoose(TUB_FRIEND.x + (this.fancy.next() - 0.5) * 120, TUB.y, 'water', 340)
    } else if (inBox(RAIL.box, x, y, 30)) {
      // Wrung, a friend is tickled: it wriggles and laughs in its own voice.
      this.react(friend, 'tickle')
      this.hear(V.laugh(friend.kind, r))
    } else if (this.inPuddle(x, y)) {
      // Dropped into the puddle, it comes out muddy with a splat.
      for (let n = 0; n < 5; n++) {
        const cell = Math.floor(this.fancy.next() * HIDE_CELLS) % HIDE_CELLS
        friend.hide[cell] = Math.max(friend.hide[cell], 2)
      }
      this.splash(x, y)
      this.react(friend, 'splat')
      this.changed = true
    }
    this.walkHome(friend, x, y + 150)
  }

  /** A thing lands in the puddle: a splat, and mud flies. */
  private splash(x: number, y: number): void {
    this.puddle.squash = 0.5; this.puddle.speed = 0
    for (let n = 0; n < 6; n++) this.throwLoose(x + (this.fancy.next() - 0.5) * 50, y, 'mud', 260)
    this.hear(V.splat(this.fancy.next()))
  }

  // --- The board, the rail and the tub -----------------------------------------

  /** One dab of the fingertip on the board: on mud it lifts the patch under it, on clean cloth it squeaks, on bare wood it ticks dry. */
  private dab(x: number, y: number): void {
    const garment = this.garmentAt('board')
    if (this.cat.at === 'board' && !this.cat.fly) {
      if (this.cat.fluff >= 10) {
        this.hear(V.mew(0, this.fancy.next()))
        this.catTo('fence', 0)
        this.grab = { how: 'none' }
      } else this.rubCat()
      return
    }
    const u = (x - CLOTH.x) / CLOTH.w, v = (y - CLOTH.y) / CLOTH.h
    if (!garment || !this.settled(garment) || !onCloth(garment.kind, u, v)) {
      this.hear(V.tickDry(0.2, this.fancy.next()))
      return
    }
    this.rubbed = true
    this.dimple.x = x; this.dimple.y = y
    this.dimple.depth = 1; this.dimple.speed = 0
    this.dimple.dx = 0; this.dimple.dy = -1
    // The hat's bobble is a ball of foam once it is soapy, and it squeaks when pressed. The press still rubs.
    const foam = garment.kind === 'hat' && garment.suds > SOAPY && Math.hypot(u - 0.5, v - 0.1) < 0.17
    const muddy = this.mudNear(garment, u, v)
    this.unpick(garment, rub(garment.mud, garment.work, garment.kind, u, v, u, v))
    // The first suds sprout as the finger lands: a cloth with no knot on it yet gets one from this dab.
    if (this.knots.length === 0 && this.sliding === 0) this.sudsOwed = Math.max(this.sudsOwed, SUDS_FULL / MAX_KNOTS)
    this.froth(garment, 60, x, y)
    const r = this.fancy.next()
    this.hear(foam ? V.foamSqueak(r) : muddy ? [...V.squelch(r), ...V.ridge(garment.kind, 0.15, r)] : [...V.squeak(1 - Math.min(1, mudLeft(garment.mud) / 40), r), ...V.ridge(garment.kind, 0.15, r)])
  }

  private rubBoard(x0: number, y0: number, x: number, y: number, length: number): void {
    if (length === 0) return
    this.travel += length
    this.crossed += Math.abs(Math.floor((y - RIDGES.y) / RIDGES.gap) - Math.floor((y0 - RIDGES.y) / RIDGES.gap))
    if (this.cat.at === 'board' && !this.cat.fly) {
      this.squeeze += length
      while (this.squeeze >= 56) { this.squeeze -= 56; this.rubCat() }
      return
    }
    const garment = this.garmentAt('board')
    if (!garment || !this.settled(garment)) return
    let across = 0
    if (garment.kind === 'scarf') {
      // Too long for the board: it comes across the ridges with the finger, and at a whole length it lets go with a zip
      // and the next length is under the hand. Pulled sideways it crosses ridges of its own.
      this.crossed += Math.abs(Math.floor(x / RIDGES.gap) - Math.floor(x0 / RIDGES.gap))
      this.scarf.pull += x - x0
      if (Math.abs(this.scarf.pull) >= SCARF_LENGTH) {
        this.scarf.pull -= Math.sign(this.scarf.pull) * SCARF_LENGTH
        this.hear(V.zip(this.fancy.next()))
      }
      across = this.scarf.pull / CLOTH.w
    }
    // The cloth lies where it has been pulled to, so the mud comes off where the finger is.
    const u0 = (x0 - CLOTH.x) / CLOTH.w - across, v0 = (y0 - CLOTH.y) / CLOTH.h, u1 = (x - CLOTH.x) / CLOTH.w - across, v1 = (y - CLOTH.y) / CLOTH.h
    // A move rubs whatever cloth it passes over: either end of it on the cloth, or its middle, is enough.
    const on = onCloth(garment.kind, u1, v1) ? { x, y, u: u1, v: v1 } : onCloth(garment.kind, (u0 + u1) / 2, (v0 + v1) / 2) ? { x: (x0 + x) / 2, y: (y0 + y) / 2, u: (u0 + u1) / 2, v: (v0 + v1) / 2 } : onCloth(garment.kind, u0, v0) ? { x: x0, y: y0, u: u0, v: v0 } : null
    if (!on) return
    this.rubbed = true
    this.dimple.x = on.x; this.dimple.y = on.y
    this.dimple.depth = Math.max(this.dimple.depth, 0.7)
    this.dimple.dx = (x - x0) / length; this.dimple.dy = (y - y0) / length
    if (garment.kind === 'hat') {
      // The bobble rolls under the finger.
      const home = clothToStage(0.5, 0.1), far = Math.hypot(x - home.x, y - home.y)
      if (far < 70) { this.bobble.dx = Math.max(-30, Math.min(30, x - home.x)); this.bobble.dy = Math.max(-8, Math.min(30, y - home.y)) }
    }
    const muddyBefore = this.mudNear(garment, on.u, on.v)
    this.unpick(garment, rub(garment.mud, garment.work, garment.kind, u0, v0, u1, v1))
    this.froth(garment, length, on.x, on.y)
    this.sinceScrub += length
    if (this.sinceScrub > 46) {
      this.sinceScrub = 0
      this.hear(V.scrub(this.fancy.next()))
    }
    if (!muddyBefore) {
      this.sinceSqueak += length
      if (this.sinceSqueak > 70) {
        this.sinceSqueak = 0
        this.hear(V.squeak(1 - Math.min(1, mudLeft(garment.mud) / 40), this.fancy.next()))
      }
    }
  }

  /** The cat on the board, rubbed: it yowls one step higher and comes up one step fluffier. */
  private rubCat(): void {
    const cat = this.cat
    cat.fluff = Math.min(10, cat.fluff + 1)
    this.yowls = Math.min(10, this.yowls + 1)
    this.changed = true
    this.react(cat, 'tickle')
    this.hear(V.yowl(cat.fluff, this.fancy.next()))
    this.dimple.x = BOARD_SPOT.x; this.dimple.y = BOARD_SPOT.y; this.dimple.depth = 0.6
  }

  private mudNear(garment: Garment, u: number, v: number): boolean {
    const mask = maskOf(garment.kind)
    for (let i = 0; i < CELLS; i++) {
      if (!mask[i] || garment.mud[i] <= 0) continue
      if (Math.hypot(((i % COLS) + 0.5) / COLS - u, (Math.floor(i / COLS) + 0.5) / ROWS - v) <= 0.13) return true
    }
    return false
  }

  /** Mud goes into the water. The darker the tub already is the less each patch adds, so that every patch still adds something. */
  private cloud(mud: number): void {
    this.water.cloud = Math.min(10, this.water.cloud + mud * (1 - this.water.cloud / CLOUDS.full))
  }

  /** Mud came off these cells: its threads fly, it runs into the tub, and the water clouds. */
  private unpick(garment: Garment, cells: readonly number[]): void {
    if (cells.length === 0) return
    this.touch(garment)
    if (garment.kind === 'sock') this.flash = 1
    this.cloud(cells.length * CLOUDS.cloth)
    for (const cell of cells) {
      const at = clothToStage(((cell % COLS) + 0.5) / COLS, (Math.floor(cell / COLS) + 0.5) / ROWS)
      this.throwLoose(at.x, at.y, 'mud', 260)
      this.throwLoose(at.x, at.y, 'mud', 260)
    }
    // Brown runs down the board into the tub from where it came off.
    for (const cell of cells.slice(0, 2)) {
      const at = clothToStage(((cell % COLS) + 0.5) / COLS, (Math.floor(cell / COLS) + 0.5) / ROWS)
      if (this.runs.length >= MAX_RUNS) this.runs.shift()
      this.runs.push({ x: at.x + this.scarf.pull, y: at.y })
    }
    this.hear(V.letGo(this.fancy.next()))
  }

  /** Suds build with the distance rubbed, a knot at a time along the finger's path, and now and then a bubble drifts off. */
  private froth(garment: Garment, length: number, x: number, y: number): void {
    if (this.sliding > 0) return
    const before = garment.suds
    garment.suds = Math.min(10, garment.suds + (length / SUDS_FULL) * 10)
    if (Math.floor(garment.suds) !== Math.floor(before)) this.changed = true
    this.sudsOwed += length
    while (this.sudsOwed >= SUDS_FULL / MAX_KNOTS && this.knots.length < MAX_KNOTS) {
      this.sudsOwed -= SUDS_FULL / MAX_KNOTS
      this.knots.push({ u: (x - CLOTH.x) / CLOTH.w + (this.fancy.next() - 0.5) * 0.16, v: (y - CLOTH.y) / CLOTH.h + (this.fancy.next() - 0.5) * 0.16, r: 5 + this.fancy.next() * 6, fall: 0, born: 0, grey: false })
    }
    this.bubbleOwed += length
    if (this.bubbleOwed > 240 && garment.suds > 1.2) {
      this.bubbleOwed = 0
      this.bubble(x, y - 12)
    }
    if (garment.suds >= 10 && this.lather < 0) {
      // The heap leans and goes: it slides off into the tub and the suds start again.
      this.sliding = 0.0001
      garment.suds = 0
      this.changed = true
      this.tub.speed += 3
      this.hear(V.fizz())
    }
  }

  /** A bubble sets off from here; `big` for the ones out of the dungarees' pockets, `delay` seconds from now. */
  private bubble(x: number, y: number, big = false, delay = 0): void {
    this.float({ x, y, r: (big ? 18 : 9) + this.fancy.next() * (big ? 5 : 10), vx: 14 + this.fancy.next() * 22, vy: -26 - this.fancy.next() * 22, age: -delay, wobble: this.fancy.next() * 6 })
  }

  /**
   * Every bubble the yard makes goes through here, so one that is heard is always seen: when as many are in the air
   * as the frame holds, the oldest of them pops to make room.
   */
  private float(bubble: Bubble): void {
    if (this.bubbles.length >= MAX_BUBBLES) {
      const seen = this.bubbles.findIndex((other) => other.age >= 0)
      const [gone] = this.bubbles.splice(Math.max(0, seen), 1)
      if (gone.age >= 0) for (let n = 0; n < 3; n++) this.throwLoose(gone.x, gone.y, 'suds', 120)
    }
    this.bubbles.push(bubble)
  }

  /** One squeeze of what hangs on the rail. Each garment gives its water up in its own way. */
  private wring(garment: Garment): void {
    const r = this.fancy.next(), at = RAIL.hang, was = garment.wet
    garment.twist = 1
    let out = 0, gush = false
    if (garment.kind === 'sock') out = garment.wet
    else if (garment.kind === 'shirt') out = 2
    else if (garment.kind === 'dungarees') {
      // They hardly twist: a groan, a groan, a groan, and then all of it at once.
      garment.groans += 1
      if (garment.groans >= 4) { out = garment.wet; gush = true; garment.groans = 0 }
    } else if (garment.kind === 'jumper') out = 1
    else if (garment.kind === 'hat') { out = 4; gush = true }
    else out = 1.5
    out = Math.min(out, garment.wet)
    this.hear(out > 0 || garment.kind === 'dungarees' ? V.wrung(garment.kind, was / 10, gush && out > 0, r) : V.quiet(V.wrung(garment.kind, 0, false, r), 0.5))
    if (out <= 0) return
    garment.wet -= out
    garment.suds = Math.max(0, garment.suds - out)
    this.changed = true
    this.tub.speed += out * 0.4
    const foot = at.y + at.size * 0.4
    if (garment.kind === 'sock') for (let n = 0; n < 6; n++) this.spill(at.x, foot + n * 9, 0, 260)
    // Its sleeves are wound in over its front, so the two cuffs lie side by side in the middle: a stream runs from each.
    else if (garment.kind === 'shirt') for (const dx of [-CUFFS_WRUNG.dx, CUFFS_WRUNG.dx]) for (let n = 0; n < 3; n++) this.spill(at.x + dx, at.y + CUFFS_WRUNG.dy + n * 12, 0, 240)
    else if (garment.kind === 'dungarees') for (const dx of [-26, 26]) for (let n = 0; n < 8; n++) this.spill(at.x + dx + (this.fancy.next() - 0.5) * 14, foot + n * 6, (this.fancy.next() - 0.5) * 60, 320)
    else if (garment.kind === 'jumper') {
      for (let n = 0; n < 5; n++) this.spill(at.x + (this.fancy.next() - 0.5) * 30, foot + n * 8, 0, 300)
      // It gives back what it drank.
      this.water.level = Math.min(10, this.water.level + 0.3 * out)
    } else if (garment.kind === 'hat') for (let n = 0; n < 7; n++) this.spill(at.x + (this.fancy.next() - 0.5) * 12, at.y - 40, (this.fancy.next() - 0.5) * 50, -520 - n * 20)
    else for (let n = 0; n < 6; n++) this.spill(at.x - 50 + n * 20, at.y + (this.fancy.next() - 0.5) * 60, 0, 120)
  }

  /** A friend in the tub, rubbed: the mud lifts off its hide and it takes it in its own way. */
  private rubFriend(friend: Friend, x: number, y: number, length: number): void {
    this.squeeze += length
    while (this.squeeze >= 56) {
      this.squeeze -= 56
      const oval = bodyOval(friend.kind, friend.x, friend.y, friend.scale)
      const lifted = rubHide(friend.hide, (x - (oval.cx - oval.rx)) / (oval.rx * 2), (y - (oval.cy - oval.ry)) / (oval.ry * 2))
      if (lifted > 0) {
        this.changed = true
        this.cloud(lifted * CLOUDS.hide)
        for (let n = 0; n < lifted * 2; n++) this.throwLoose(x, y, 'mud', 240)
      }
      for (let n = 0; n < 2; n++) this.throwLoose(x, y, 'suds', 180)
      if (!friend.reaction || friend.reaction.age > 0.4) {
        this.react(friend, 'tubrub')
        this.hear(V.tubVoice(friend.kind, this.fancy.next()))
        // The pig blows its bubbles at once; the goat's comes with its hiccup.
        if (friend.kind !== 'heron') this.bubble(friend.x - 30, TUB.y - 10, false, friend.kind === 'goat' ? 0.3 : 0)
      }
    }
  }

  /** A bubble under the finger pops. Returns whether one did. */
  private pop(x: number, y: number, slack: number): boolean {
    const hit = this.bubbles.findIndex((bubble) => bubble.age >= 0 && Math.hypot(bubble.x - x, bubble.y - y) <= bubble.r + slack)
    if (hit < 0) return false
    const [bubble] = this.bubbles.splice(hit, 1)
    for (let n = 0; n < 5; n++) this.throwLoose(bubble.x, bubble.y, 'suds', 160)
    this.hear(V.pip((bubble.r - 9) / 10, this.fancy.next()))
    return true
  }

  /** The puddle is touched: it throws one dollop at whatever lies on the board. The mud is in the save at once; it shows when the dollop lands. */
  private blop(): void {
    this.puddle.squash = 0.5; this.puddle.speed = 0
    for (let n = 0; n < 5; n++) this.throwLoose(PUDDLE.x + (this.fancy.next() - 0.5) * 60, PUDDLE.y - 6, 'mud', 240)
    this.hear(V.blop(this.fancy.next()))
    if (this.dollops.length >= 3) return
    const garment = this.garmentAt('board')
    if (!garment || !this.settled(garment)) {
      this.dollops.push({ x0: PUDDLE.x, y0: PUDDLE.y - 8, x1: BOARD_SPOT.x, y1: BOARD_SPOT.y, t: 0, cells: [], was: [], garment: null })
      return
    }
    const rng = makeRng(this.seed)
    const spot = spotOn(garment.kind, rng)
    const before = garment.mud.slice()
    const cells = dollop(garment.mud, garment.kind, spot.u, spot.v, 0.1 + rng.next() * 0.05)
    this.seed = rng.state
    cells.forEach((cell) => { garment.work[cell] = 0 })
    const to = clothToStage(spot.u, spot.v)
    this.dollops.push({ x0: PUDDLE.x, y0: PUDDLE.y - 8, x1: to.x, y1: to.y, t: 0, cells, was: cells.map((cell) => before[cell]), garment })
    this.changed = true
  }

  /** A drop falls from a place of the line onto whoever stands below. */
  private dripOn(place: number): void {
    const friend = this.friends[place]
    if (friend && friend.where === 'yard' && !friend.move) this.dripped(friend, false)
  }

  /** A friend is dripped on, and takes it by its taste: the pig lifts its snout and wriggles, the heron opens a wing and glares, the goat shakes its head. */
  private dripped(friend: Friend, always: boolean): void {
    friend.wet = Math.min(10, friend.wet + 1)
    if (!always && friend.sinceDripped < 2.6) return
    if (friend.reaction && friend.reaction.what !== 'noticed' && friend.reaction.what !== 'dripped' && !always) return
    friend.sinceDripped = 0
    this.react(friend, 'dripped')
    this.hear(V.drippedOn(friend.kind, this.fancy.next()))
  }

  // --- The gate and the three scenes -------------------------------------------

  private endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
  }

  private play(beats: Beat[], saveOutcome: () => void): void {
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => {
      saveOutcome()
      this.changed = true
      this.urgent = true
    })
  }

  /** A touch on the gate. */
  private touchGate(): void {
    const inYard = this.friends.filter((friend) => friend.where === 'yard')
    const called = this.friends.filter((friend) => friend.where !== 'gate')
    if (inYard.length === 0) {
      const next = this.friends.find((friend) => friend.where === 'gate')
      if (next) this.comeIn(next.index)
      return
    }
    const bare = called.filter((friend) => !friend.wears)
    if (bare.length > 0) {
      // Someone is still in underwear: the gate rattles, that one crosses its arms, and nobody leaves.
      this.gate.speed += 16
      const r = this.fancy.next()
      this.hear(V.rattleGate(r))
      bare.forEach((friend, n) => {
        this.react(friend, 'refuse')
        this.hear(V.after(V.unsure(friend.kind, r), 0.2 + n * 0.12))
      })
      return
    }
    this.walkOff()
  }

  /** One leg of a walk as a beat: from `a` to `b`, in the walker's own walk, with its own step. */
  private leg(figure: Figure, at: number, lasts: number, a: { x: number; y: number; scale: number }, b: { x: number; y: number; scale: number }, last: boolean): Beat {
    let base = -1
    const strides = Math.hypot(b.x - a.x, b.y - a.y) / (STRIDE[figure.kind] * ((a.scale + b.scale) / 2 / YARD_SCALE))
    return {
      at, lasts, play: (p, finishing) => {
        if (base < 0) base = figure.steps
        figure.x = a.x + (b.x - a.x) * p; figure.y = a.y + (b.y - a.y) * p; figure.scale = a.scale + (b.scale - a.scale) * p
        const steps = base + strides * p
        if (!finishing && Math.floor(steps) > Math.floor(figure.steps)) {
          const r = this.fancy.next(), loud = figure.scale / YARD_SCALE
          this.hear(V.quiet(figure.wears && figure.wears.wet > DAMP ? [...V.step(figure.kind, r), ...V.squish(r)] : V.step(figure.kind, r), 0.4 + 0.6 * loud))
          if (figure.wears && figure.wears.suds > SOAPY && Math.floor(steps) % 3 === 0) this.bubble(figure.x, figure.y - 200 * figure.scale)
        }
        figure.steps = steps
        figure.walking = !(last && p >= 1)
      },
    }
  }

  private gateBeat(at: number, lasts: number, opens: boolean): Beat {
    let begun = false
    return {
      at, lasts, play: (p, finishing) => {
        if (!begun && !finishing) this.hear(opens ? V.creak(this.fancy.next()) : [])
        begun = true
        this.gate.open = opens ? p : 1 - p
        if (!opens && p >= 1 && !finishing) this.hear(V.latch(this.fancy.next()))
      },
    }
  }

  /**
   * Coming in. The friend that was touched steps in, or as many as the place in the designed order says on the first
   * touch of a cycle. Saved when it starts: the cycle has begun, and those who step in are in the yard.
   */
  private comeIn(first: number): void {
    const fresh = this.friends.every((friend) => friend.where === 'gate')
    const count = fresh ? Math.min(FRIENDS, STEP_IN(this.base.position)) : 1
    const who: Friend[] = []
    for (let n = 0; n < FRIENDS && who.length < count; n++) {
      const friend = this.friends[(first + n) % FRIENDS]
      if (friend.where === 'gate') who.push(friend)
    }
    if (who.length === 0) return
    const beats: Beat[] = [this.gateBeat(0, 0.5, true)]
    who.forEach((friend, n) => {
      const start = 0.4 + n * 0.5
      const from = { x: WAIT_X[friend.index], y: WAIT_FEET[friend.kind], scale: WAIT_SCALE }
      const through = { x: GATEWAY.x, y: GATEWAY.y + 40, scale: 0.56 }
      const to = { x: PLACE_X[friend.index], y: FEET_Y, scale: YARD_SCALE }
      beats.push({ at: start, lasts: 0, play: () => { friend.clip = false } })
      beats.push(this.leg(friend, start, 0.9, from, through, false))
      beats.push(this.leg(friend, start + 0.9, 1.9, through, to, true))
      beats.push({ at: start + 2.8, lasts: 0, play: (_p, finishing) => {
        if (finishing) return
        this.react(friend, 'arrive')
        this.hear(V.arrived(friend.kind, this.fancy.next()))
      } })
    })
    beats.push(this.gateBeat(Math.max(3.7, 0.4 + (who.length - 1) * 0.5 + 2.6), 0.5, false))
    this.play(beats, () => {
      this.base = beginCycle(this.base)
      for (const friend of who) friend.where = 'yard'
    })
  }

  /**
   * Putting it on. The garment goes on where it fits this body, and the friend answers by its taste to exactly this
   * garment as it is. Saved when it starts: the garment is on this friend with its pegs off, and the friend wears it.
   */
  private putOn(garment: Garment, friend: Friend, on: Wear): void {
    const from = this.seen(garment)
    const was = friend.wears
    if (was && was !== garment) {
      // What it wore before comes off and lies at its feet.
      const at = underPlace(friend.index)
      this.send(was, 'grass', 0, at.x, at.y)
    }
    const view = opinion(friend.kind, garment.kind, on, { mud: mudLeft(garment.mud), wet: garment.wet, suds: garment.suds })
    const say = (at: number, what: Happening): Beat => ({ at, lasts: 0, play: (_p, finishing) => {
      if (finishing) return
      // A damp thing with sleeves is the worst of all for the heron: it shudders hardest at that.
      this.react(friend, what, what === 'shudder' && (garment.kind === 'shirt' || garment.kind === 'jumper') ? 1 : 0)
      this.hear(V.mood(friend.kind, what, this.fancy.next()))
      if (friend.kind === 'goat' && what === 'lick') {
        // It hiccups bubbles with a bleat at each: one hiccup, one hop and one bleat for each bubble that leaves its mouth.
        const mouth = anchorAtRest('goat', 'snout')
        for (const at of HICCUPS) {
          this.float({ x: friend.x + mouth.x * friend.scale, y: friend.y + (mouth.y + 16) * friend.scale, r: 8 + this.fancy.next() * 6, vx: 10 + this.fancy.next() * 18, vy: -30 - this.fancy.next() * 16, age: -at, wobble: this.fancy.next() * 6 })
          this.hear(V.after(V.hiccup(this.fancy.next()), at))
        }
      }
      // The heron shudders the drops off: they fly from both wings.
      if (what === 'shudder') for (let n = 0; n < 8; n++) this.throwLoose(friend.x + (n % 2 ? 70 : -70) * friend.scale, friend.y - 250 * friend.scale, 'water', 280)
    } })
    let begun = false
    const beats: Beat[] = [
      { at: 0, lasts: 0.45, play: (p, finishing) => {
        if (!begun && !finishing) this.react(friend, 'catch')
        begun = true
        if (p >= 1) garment.fly = null
      } },
      { at: 0.45, lasts: DON_S, play: (p, finishing) => {
        if (friend.donning === 0 && !finishing) {
          this.react(friend, 'don')
          this.hear(V.donned(garment.kind, this.fancy.next()))
        }
        friend.donning = Math.max(0.001, p)
        if (p >= 1 && !finishing && garment.kind === 'shirt') {
          // A button strains and pops.
          this.hear(V.ping(this.fancy.next()))
          this.throwLoose(friend.x, friend.y - 170 * friend.scale, 'suds', 300)
        }
      } },
      say(2.0, view.first),
    ]
    let end = 2.0 + LASTS[view.first]
    if (view.second) {
      // The second answer waits a breath after the first, and cuts in on its tail where the two together would run long.
      const at = Math.min(end + 0.15, DRESSED_BY - LASTS[view.second])
      beats.push(say(at, view.second))
      end = at + LASTS[view.second]
    }
    beats.push({ at: Math.max(4, end), lasts: 0, play: (_p, finishing) => {
      friend.donning = 1
      if (finishing) friend.reaction = null
    } })
    this.play(beats, () => {
      for (const other of this.friends) if (other.wears === garment) other.wears = null
      garment.at = 'friend'; garment.n = friend.index; garment.x = 0; garment.y = 0
      garment.pegs = [false, false]
      garment.since = 0; garment.twist = 0
      garment.fly = this.flyFrom(from.x, from.y, from.size, 0.45, 120)
      friend.wears = garment
      friend.on = on
      friend.donning = 0
      this.refresh()
    })
  }

  /**
   * Walking off. Saved when it starts: the cycle is finished and judged, the leavers are on the hill as they were
   * dressed, and the next three wait at the gate with their garments. The yard arrives there beat by beat.
   */
  private walkOff(): void {
    const leavers = this.friends.filter((friend) => friend.where !== 'gate')
    const stay = this.friends.filter((friend) => friend.where === 'gate')
    const old = this.garments
    // The cycle went well when the child called in at least one more friend than stepped in at the first touch.
    const well = leavers.length > Math.min(FRIENDS, STEP_IN(this.base.position))
    const next = deal(theOtherThree(old.map((garment) => garment.kind)), leavers[0].colour === 0 ? 1 : 0, this.seed)
    const garments = next.garments.map((saved, index) => this.garmentOf(index, saved.kind, saved.owner, 'held', 0, 0, 0, decodeMud(saved.mud, saved.kind) ?? cleanMud(), 0, 0, [false, false]))
    const friends = next.friends.map((saved, index) => {
      const friend = this.friendOf(index, saved.colour, 'gate', decodeHide(saved.hide) ?? cleanHide(), 0)
      friend.hidden = true
      friend.y += BELOW_GATE
      return friend
    })
    const hill = [...this.hill, ...leavers.map((friend): SavedLeaver => ({ kind: friend.kind, colour: friend.colour, garment: friend.wears!.kind, on: friend.on, mud: encodeMud(friend.wears!.mud), wet: Math.round(friend.wears!.wet), suds: Math.round(friend.wears!.suds) }))].slice(-FRIENDS)

    const beats: Beat[] = [this.gateBeat(0, 0.6, true)]
    beats.push({ at: 0, lasts: 0.6, play: (p) => {
      for (const ghost of this.ghosts) ghost.t = p
      if (p >= 1) this.ghosts.length = 0
    } })
    // Those on the hill make room before the new ones get there: the oldest go over the far side and the rest move up, a newcomer taking the last place.
    const gone = this.hill.length + leavers.length - hill.length
    if (gone > 0) beats.push({ at: 0.8, lasts: 2.6, play: (p) => { this.hillShift = { by: gone, t: p } } })
    let arrive = 0
    leavers.forEach((friend, n) => {
      const start = 0.3 + n * 0.45
      const slot = hill.length - leavers.length + n
      const from = { x: friend.x, y: friend.y, scale: friend.scale }
      const through = { x: GATEWAY.x, y: GATEWAY.y + 40, scale: 0.5 }
      const lane = { x: GATEWAY.x - 20, y: 340, scale: 0.3 }
      const to = { x: HILL[slot].x, y: HILL[slot].y, scale: HILL_SCALE }
      if (friend.wears && mudLeft(friend.wears.mud) > 0) beats.push({ at: start, lasts: 0, play: (_p, finishing) => { if (!finishing) this.hear(V.quiet(V.buzz(this.fancy.next()), 0.7)) } })
      beats.push(this.leg(friend, start, 2.2, from, through, false))
      beats.push(this.leg(friend, start + 2.2, 1.0, through, lane, false))
      beats.push(this.leg(friend, start + 3.2, 1.6, lane, to, true))
      arrive = start + 4.8
    })
    // They stand small on the far hill, and the hill shows what the save has held since the gate opened.
    beats.push({ at: arrive, lasts: 0, play: () => {
      this.hillShown = this.hill
      this.hillShift = null
      this.leaving = this.leaving.filter((figure) => !leavers.includes(figure as Friend))
    } })
    stay.forEach((friend, n) => {
      // One who was never called in turns from the gate and goes off down the lane with its garment.
      const from = { x: friend.x, y: friend.y, scale: friend.scale }
      beats.push(this.leg(friend, 1.0 + n * 0.4, 2.6, from, { x: LANE_END.x, y: from.y - 20, scale: 0.44 }, true))
      beats.push({ at: 3.6 + n * 0.4, lasts: 0, play: () => { this.leaving = this.leaving.filter((figure) => figure !== friend) } })
    })
    beats.push({ at: arrive + 0.1, lasts: 0, play: (_p, finishing) => {
      // A gust sways the empty line.
      this.gust = 0
      if (!finishing) this.hear(V.gust(this.fancy.next()))
    } })
    beats.push(this.gateBeat(arrive + 0.2, 0.6, false))
    friends.forEach((friend, n) => {
      const home = WAIT_FEET[friend.kind]
      let begun = false
      beats.push({ at: arrive + 1.4 + n * 0.3, lasts: 1.0, play: (p, finishing) => {
        friend.hidden = false
        friend.y = home + BELOW_GATE * (1 - p) * (1 - p)
        friend.walking = p < 1
        friend.steps = p * 4
        if (!begun && !finishing) this.hear(V.quiet(V.arrived(friend.kind, this.fancy.next()), 0.6))
        begun = true
      } })
    })
    this.play(beats, () => {
      this.base = finishCycle(this.base, well ? 'well' : 'mixed')
      this.hill = hill
      this.seed = next.seed
      // While the washed ones walk off the mud sinks to the bottom of the tub: the next three come to clear water.
      this.water.cloud = 0
      this.leaving = [...leavers, ...stay]
      for (const friend of this.leaving) friend.reaction = null
      // What nobody wears goes back to its owner, who takes it along.
      for (const garment of old) {
        if (leavers.some((friend) => friend.wears === garment) || (garment.at === 'held' && stay.some((friend) => friend.index === garment.owner))) continue
        const at = this.seen(garment), owner = this.friends[garment.owner]
        this.ghosts.push({ garment, x0: at.x, y0: at.y, size0: at.size, to: owner, t: 0 })
      }
      this.garments = garments
      this.friends = friends
      this.knots.length = 0
      this.sliding = 0
      this.lather = -1
      this.dollops.length = 0
      for (const peg of this.pegs) if (peg.state === 'friend') { peg.state = 'home'; peg.fly = null }
      this.refresh()
    })
  }

  // --- The idle ladder ---------------------------------------------------------

  /** The one thing a child would want next, for the idle ladder; null while a scene plays or a thing is in the hand. */
  want(): Want | null {
    if (this.sceneRunning || this.carried) return null
    const tap = (x: number, y: number, w: number, h: number): Want => ({ how: 'tap', x, y, w, h })
    const gate = tap(GATE.x + GATE.w / 2, GATE.y + GATE.h / 2, GATE.w - 60, GATE.h - 20)
    const called = this.friends.filter((friend) => friend.where !== 'gate')
    if (called.length === 0) return gate
    if (called.every((friend) => friend.wears)) return gate
    const hangs = this.garmentAt('rail')
    if (hangs && this.settled(hangs)) {
      if (hangs.wet > DAMP) return tap(RAIL.hang.x, RAIL.hang.y, 110, 110)
      const free = [0, 1, 2].find((n) => this.lineFree(n))
      // The ring is tall enough to take in the two pegs of the place, so it reads as the line and not as the hill behind it.
      if (free !== undefined) { const at = lineSpot(free); return tap(at.x, at.y, 110, 130) }
    }
    const lies = this.garmentAt('board')
    if (lies && this.settled(lies)) {
      if (mudLeft(lies.mud) > 0) {
        // The muddiest cell, and the hand rubs across it.
        let best = 0
        for (let i = 0; i < CELLS; i++) if (lies.mud[i] > lies.mud[best]) best = i
        const at = clothToStage(((best % COLS) + 0.5) / COLS, (Math.floor(best / COLS) + 0.5) / ROWS)
        return { how: 'rub', x: at.x, y: Math.max(CLOTH.y + 36, Math.min(CLOTH.y + CLOTH.h - 36, at.y)), w: 0, h: 64 }
      }
      if (this.railFree()) return tap(RAIL.hang.x, RAIL.hang.y, 110, 110)
    }
    const dry = this.garments.find((garment) => garment.at === 'line' && this.settled(garment) && garment.wet <= DAMP && this.friends[garment.owner].where === 'yard' && !this.friends[garment.owner].move)
    if (dry) { const at = this.spotOf(dry); return tap(at.x, at.y, 90, 90) }
    const held = this.garments.find((garment) => garment.at === 'held' && this.friends[garment.owner].where === 'yard' && this.settled(garment))
    if (held) { const at = this.spotOf(held); return tap(at.x, at.y, HELD.size, HELD.size) }
    const loose = this.garments.find((garment) => (garment.at === 'tub' || garment.at === 'grass' || garment.at === 'puddle') && this.settled(garment))
    if (loose && (loose.at !== 'tub' || this.boardFree())) { const at = this.spotOf(loose); return tap(at.x, at.y, 80, 80) }
    return tap(PUDDLE.x, PUDDLE.y, PUDDLE.rx * 2, PUDDLE.ry * 2)
  }

  /** Every ridge the finger has crossed since the last time ticks, one after another across `dt` seconds, in the voice of what lies under the finger. */
  private tick(dt: number): void {
    if (this.crossed <= 0) return
    const crossed = this.crossed
    this.crossed = 0
    const garment = this.garmentAt('board')
    const u = (this.finger.x - CLOTH.x - this.scarf.pull) / CLOTH.w, v = (this.finger.y - CLOTH.y) / CLOTH.h
    const pace = Math.max(0, Math.min(1, this.speed / FAST))
    const cloth = garment && this.settled(garment) && onCloth(garment.kind, u, v) ? garment.kind : null
    if (this.cat.at !== 'board') for (let n = 0; n < crossed; n++) this.hear(V.after(cloth ? V.ridge(cloth, pace, this.fancy.next()) : V.tickDry(pace, this.fancy.next()), (n / crossed) * dt))
  }

  // --- Time ------------------------------------------------------------------

  /** Plays `dt` seconds. */
  step(dt: number): void {
    this.time += dt
    // The water shows its mud at once, and the mud sinks out of sight a little at a time.
    this.murk = Math.max(this.water.cloud, this.murk - dt * CLOUDS.sinks)
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.scene = null
    }
    const advance = (fly: Fly | null): boolean => {
      if (!fly) return false
      fly.t += dt / fly.lasts
      return fly.t >= 1
    }
    for (const garment of this.garments) {
      garment.since += dt
      garment.twist = Math.max(0, garment.twist - dt * 2.2)
      if (advance(garment.fly)) {
        garment.fly = null
        this.landed(garment)
      }
      this.weather(garment, dt)
    }
    if (advance(this.cat.fly)) this.cat.fly = null
    if (advance(this.soap.fly)) {
      this.soap.fly = null
      this.soapLanded()
    }
    this.pegs.forEach((peg, i) => {
      if (advance(peg.fly)) peg.fly = null
      peg.muddy = Math.max(0, peg.muddy - dt)
      if (peg.state === 'home') { if (peg.age > 0) { peg.age += dt; if (peg.age > 0.4) peg.age = 0 } return }
      peg.age += dt
      if (peg.state === 'board' && peg.age > 0.7) this.pegHome(i)
      else if (peg.state === 'rail' && peg.age > 0.9) this.pegHome(i)
      else if (peg.state === 'friend' && peg.age > 1.9) {
        // One flick of an ear, a beak or a beard sends it off.
        this.hear(V.pop(this.fancy.next()))
        this.pegHome(i)
      }
    })

    for (const friend of this.friends) {
      if (friend.move) {
        const move = friend.move, home = this.homeOf(friend)
        move.t = Math.min(1, move.t + dt / move.lasts)
        friend.x = move.x0 + (home.x - move.x0) * move.t; friend.y = move.y0 + (home.y - move.y0) * move.t; friend.scale = move.s0 + (home.scale - move.s0) * move.t
        const before = friend.steps
        friend.steps += (dt * 420) / STRIDE[friend.kind]
        if (Math.floor(friend.steps) > Math.floor(before)) this.hear(V.step(friend.kind, this.fancy.next()))
        friend.walking = true
        if (move.t >= 1) this.stand(friend)
      }
      const deep = friend.where === 'tub' && !friend.move && !this.isCarried({ what: 'friend', i: friend.index }) ? 1 : 0
      friend.sunk += (deep - friend.sunk) * Math.min(1, dt * 5)
      friend.sinceDripped += dt
      if (friend.where === 'tub') friend.wet = 10
      else if (friend.wet > 0) {
        const before = friend.wet
        friend.wet = Math.max(0, friend.wet - dt / 2.5)
        if (Math.floor(before) !== Math.floor(friend.wet)) {
          this.changed = true
          if (friend.where === 'yard' && !friend.hidden) this.spill(friend.x + (this.fancy.next() - 0.5) * 80 * friend.scale, friend.y - 120 * friend.scale, 0, 40)
        }
      }
      age(friend, dt)
    }
    for (const figure of this.leaving) age(figure, dt)
    for (const figure of [...this.friends, ...this.leaving]) {
      const want = this.stretchWanted(figure)
      figure.stretch = figure.stretch < want ? Math.min(want, figure.stretch + dt * STRETCH_RATE) : Math.max(want, figure.stretch - dt * STRETCH_RATE)
    }
    this.flash = Math.max(0, this.flash - dt * 4)

    const cat = this.cat
    age(cat, dt)
    cat.muddy = Math.max(0, cat.muddy - dt)
    this.soap.muddy = Math.max(0, this.soap.muddy - dt)
    if (cat.at !== 'board') {
      const fluff = cat.fluff, wet = cat.wet
      cat.fluff = Math.max(0, cat.fluff - dt / 6)
      cat.wet = Math.max(0, cat.wet - dt / 3)
      if (Math.floor(fluff) !== Math.floor(cat.fluff) || Math.floor(wet) !== Math.floor(cat.wet)) this.changed = true
      // A wet cat drips: a drop falls from it for each tenth of water it loses.
      if (Math.floor(wet) !== Math.floor(cat.wet) && !cat.fly && !this.isCarried({ what: 'cat' })) { const at = this.catSpot(); this.spill(at.x + (this.fancy.next() - 0.5) * 50, at.y + 20, 0, 40) }
    }
    if (cat.shaking > 0) {
      cat.shaking += dt
      if (cat.shaking > 1) {
        cat.shaking = 0
        if (cat.at === 'rail' && !this.isCarried({ what: 'cat' })) this.catTo('fence', 0)
      }
    }
    if (this.lather >= 0) {
      this.lather += dt
      if (this.lather > LATHER_S) this.lather = -1
    }
    this.gust += dt
    if (this.gust >= GUST_EVERY) this.blow()
    // The hat that hangs by a peg swings like a bell, and its bobble is heard each time it is seen to knock: tok to one side, tok to the other.
    const knocked = hatKnocks(this.time)
    if (knocked !== hatKnocks(this.time - dt)) {
      for (const garment of this.garments) {
        if (garment.kind !== 'hat' || garment.at !== 'line' || !this.settled(garment) || !(garment.pegs[0] || garment.pegs[1])) continue
        this.hear(V.quiet(V.knock(knocked, this.fancy.next()), 0.25 + 0.45 * hatSway(windAt(this.time), this.gust)))
      }
    }

    for (let i = this.dollops.length - 1; i >= 0; i--) {
      const flying = this.dollops[i]
      flying.t += dt / DOLLOP_S
      if (flying.t < 1) continue
      this.dollops.splice(i, 1)
      for (let n = 0; n < 8; n++) this.throwLoose(flying.x1, flying.y1, 'mud', 300)
      this.dimple.x = flying.x1; this.dimple.y = flying.y1; this.dimple.depth = 0.8; this.dimple.speed = 0
      this.hear(V.splat(this.fancy.next()))
      if (flying.garment) flying.garment.rev += 1
      else if (this.cat.at === 'board') cat.muddy = 1.5
      // Each friend in the yard takes the splash in its own way: the pig likes it, the heron hates it, the goat sneezes.
      const r = this.fancy.next()
      this.friends.forEach((friend, n) => {
        if (friend.where !== 'yard' || friend.move) return
        if (friend.reaction && friend.reaction.what !== 'splat' && friend.reaction.what !== 'noticed') return
        this.react(friend, 'splat')
        this.hear(V.after(friend.kind === 'pig' ? V.snort(r) : friend.kind === 'heron' ? V.rattle(r) : V.sneeze(r), n * 0.15))
      })
    }
    ring(this.dimple, 'depth', dt, 260, 14)
    ring(this.puddle, 'squash', dt, 180, 9)
    ring(this.tub, 'slosh', dt, 60, 3.2)
    ring(this.line, 'pull', dt, 220, 5)
    ring(this.gate, 'rattle', dt, 400, 9)
    this.bobble.dx *= Math.max(0, 1 - dt * 6); this.bobble.dy *= Math.max(0, 1 - dt * 6)
    if (this.finger.down && this.grab.how === 'rub' && this.rubbed) this.dimple.depth = Math.max(this.dimple.depth, 0.55)

    // The ridges tick at the speed of the hand, in the voice of whatever lies on them.
    this.speed += (this.travel / Math.max(dt, 1e-4) - this.speed) * Math.min(1, dt * 14)
    this.travel = 0
    this.tick(dt)
    // Pegged on the line, it tucks its legs and tail up while a friend is near, and lets them down again after.
    const tuck = this.tuckWanted()
    this.cat.tuck = this.cat.tuck < tuck ? Math.min(tuck, this.cat.tuck + dt * TUCK_RATE) : Math.max(tuck, this.cat.tuck - dt * TUCK_RATE * 0.4)
    // The cat pegged on the line purrs for as long as it hangs there.
    if (this.cat.at === 'line' && !this.cat.fly && !this.isCarried({ what: 'cat' })) {
      this.purrIn -= dt
      if (this.purrIn <= 0) {
        this.purrIn = 2.8
        this.hear(V.quiet(V.purr(this.fancy.next()), 0.7))
      }
    } else this.purrIn = 1.2
    for (let i = this.runs.length - 1; i >= 0; i--) {
      this.runs[i].y += RUN_SPEED * dt
      if (this.runs[i].y >= RUN_END) this.runs.splice(i, 1)
    }
    if (!(this.finger.down && this.grab.how === 'rub')) this.scarf.pull *= Math.max(0, 1 - dt * 8)

    if (this.sliding > 0) {
      this.sliding += dt
      for (const knot of this.knots) knot.fall += dt * (0.5 + this.sliding * 2.4)
      for (let i = this.knots.length - 1; i >= 0; i--) if (this.knots[i].v + this.knots[i].fall > 1.12) this.knots.splice(i, 1)
      if (this.knots.length === 0) this.sliding = 0
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i]
      bubble.age += dt
      if (bubble.age < 0) continue
      bubble.x += (bubble.vx + Math.sin(bubble.age * 2.1 + bubble.wobble) * 16) * dt
      bubble.y += bubble.vy * dt
      // A bubble that reaches the edge of the cloth or grows old pops by itself, quietly.
      if (bubble.age > 9 || bubble.y < 70 || bubble.x > 1150) {
        this.bubbles.splice(i, 1)
        for (let n = 0; n < 3; n++) this.throwLoose(bubble.x, bubble.y, 'suds', 120)
      }
    }
    for (let i = this.loose.length - 1; i >= 0; i--) {
      const thread = this.loose[i]
      thread.age += dt
      if (thread.age >= thread.life) {
        this.loose.splice(i, 1)
        continue
      }
      thread.vy += GRAVITY * dt
      thread.x += thread.vx * dt
      thread.y += thread.vy * dt
      thread.turn += thread.spin * dt
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].age += dt
      if (this.rings[i].age > 0.5) this.rings.splice(i, 1)
    }
    this.refresh()
  }

  /** A garment has come down where it was sent. */
  private landed(garment: Garment): void {
    const at = this.spotOf(garment), r = this.fancy.next()
    if (garment.at === 'board') {
      this.layKnots()
      this.tub.speed += 4
      for (let n = 0; n < 6; n++) this.throwLoose(TUB.x + (this.fancy.next() - 0.5) * 240, TUB.y, 'water', 260)
      this.hear(V.flump(weightOf(garment.kind)))
    } else if (garment.at === 'tub') {
      this.tub.speed += 5
      for (let n = 0; n < 5; n++) this.throwLoose(at.x + (this.fancy.next() - 0.5) * 50, TUB.y, 'water', 240)
      // Big bubbles rise from the pockets, clear of the middle a finger aims at.
      if (garment.kind === 'dungarees') { this.bubble(at.x - 22, at.y - 40, true, 0.4); this.bubble(at.x + 22, at.y - 40, true, 0.58) }
      this.hear(V.tubbed(garment.kind))
    } else if (garment.at === 'line') {
      this.hear([...V.clack(true, r), ...V.after(V.pegged(garment.kind, r), 0.06)])
      this.line.at = (at.x - LINE.x0) / (LINE.x1 - LINE.x0)
      this.line.speed += garment.kind === 'dungarees' ? 22 : 6
    } else if (garment.at === 'puddle') {
      this.splash(at.x, at.y)
    } else if (garment.at === 'held') {
      this.react(this.friends[garment.owner], 'catch')
    } else if (garment.at !== 'friend') {
      this.hear(V.quiet(V.flump(weightOf(garment.kind)), 0.7))
    }
  }

  private soapLanded(): void {
    const soap = this.soap, r = this.fancy.next()
    if (soap.act === 'fall') {
      const friend = this.friends[soap.n]
      if (friend && friend.where === 'yard' && !friend.move) {
        this.react(friend, 'bonk')
        this.hear(V.bonk(r))
        this.bubble(friend.x, friend.y - 300 * friend.scale)
      } else this.hear(V.quiet(V.plop(r)))
    } else if (soap.act) {
      this.tub.speed += 5
      for (let n = 0; n < 6; n++) this.throwLoose(SOAP_TUB.x + (this.fancy.next() - 0.5) * 40, TUB.y + 10, 'water', 260)
    }
    soap.act = null
  }

  /** What the wind and a wearer's warmth do to a garment over `dt` seconds: it dries, drips on whoever stands below, and trails bubbles while it is soapy. */
  private weather(garment: Garment, dt: number): void {
    if (!this.settled(garment) || (garment.at !== 'line' && garment.at !== 'friend')) return
    const at = this.spotOf(garment), onLine = garment.at === 'line'
    const wearer = onLine ? null : this.friends[garment.n]
    if (wearer && (wearer.hidden || wearer.where !== 'yard')) return
    if (garment.wet > 0) {
      const before = garment.wet
      garment.wet = Math.max(0, garment.wet - dt / (onLine ? DRY_LINE : DRY_WORN))
      if (Math.floor(before) !== Math.floor(garment.wet)) this.changed = true
    }
    if (garment.wet > DAMP) {
      garment.sinceDrip += dt
      if (garment.sinceDrip >= 0.5 + 2.4 * (1 - garment.wet / 10)) {
        garment.sinceDrip = 0
        this.spill(at.x + (this.fancy.next() - 0.5) * at.size * 0.5, at.y + at.size * 0.42, 0, 30)
        this.hear(V.drip(this.fancy.next()))
        if (onLine) this.dripOn(garment.n)
      }
    }
    if (garment.suds > SOAPY) {
      garment.sinceBubble += dt
      if (garment.sinceBubble >= 1.7) {
        garment.sinceBubble = 0
        // Off its shoulder and away on the wind: its middle stays clear for a finger.
        this.bubble(at.x + at.size * 0.36, at.y - at.size * 0.36)
      }
    }
    if (wearer && mudLeft(garment.mud) > 0) {
      // Flies circle each patch; now and then they are heard.
      wearer.sinceBuzz += dt
      if (wearer.sinceBuzz > 7) {
        wearer.sinceBuzz = 0
        this.hear(V.quiet(V.buzz(this.fancy.next()), 0.6))
        // And the wearer looks down at the patch.
        if (!wearer.reaction && !wearer.move) this.react(wearer, 'patch')
      }
    }
  }

  /** A gust: what is pegged sounds in the wind, and what has no peg slides off, onto the head of whoever stands below or onto the grass. */
  private blow(): void {
    this.gust = 0
    const r = this.fancy.next()
    this.hear(V.gust(r))
    for (const garment of this.garments) {
      if (garment.at !== 'line' || !this.settled(garment)) continue
      if (garment.pegs[0] || garment.pegs[1]) {
        // The hat has no voice of its own for the gust: it swings wider in it, and its bobble knocks louder at the end of each swing.
        if (garment.kind !== 'hat') this.hear(V.after(V.quiet(V.pegged(garment.kind, r), 0.45), CLAP_AFTER_GUST(garment.n)))
        continue
      }
      const below = this.friends[garment.n], from = this.spotOf(garment)
      this.hear(V.after(V.slither(r), 0.3))
      if (below.where === 'yard' && !below.move && !below.wears) {
        garment.at = 'friend'; garment.since = 0
        garment.fly = this.flyFrom(from.x, from.y, from.size, 0.4, 0)
        below.wears = garment
        below.on = wearsOf(below.kind, garment.kind)[0]
        below.donning = 1
        this.react(below, 'bonk')
        this.hear(V.after(V.bonk(r), 0.4))
        this.changed = true
      } else {
        const at = underPlace(garment.n)
        this.send(garment, 'grass', 0, at.x, at.y)
      }
    }
    if (this.pegs.some((peg) => peg.state === 'chain')) this.hear(V.after(V.quiet(V.jingle(r), 0.6), 0.3))
    if (this.cat.at === 'line') this.hear(V.after(V.quiet(V.purr(r), 0.6), 0.2))
  }

  /** The suds a garment already has, as knots on it: the same knots each time, so a yard that is opened again looks as it was left. */
  private layKnots(): void {
    this.knots.length = 0
    const garment = this.garmentAt('board')
    if (!garment) return
    for (const knot of sudsKnots(garment.kind, garment.suds)) this.knots.push({ u: knot.u, v: knot.v, r: knot.r * CLOTH.w, fall: 0, born: 0, grey: garment.kind === 'dungarees' })
  }

  /** Whether a shirt's button is off: it pops when the shirt is on, and is back when the shirt comes off. */
  buttonOff(garment: Garment): boolean {
    if (garment.kind !== 'shirt') return false
    const wearer = this.friends.find((friend) => friend.wears === garment) ?? this.leaving.find((figure) => figure.wears === garment)
    return !!wearer && wearer.donning >= 1 && !this.isCarried({ what: 'garment', i: garment.index })
  }

  private throwLoose(x: number, y: number, what: Loose['what'], force: number): void {
    if (this.loose.length >= MAX_LOOSE) this.loose.shift()
    const angle = -Math.PI / 2 + (this.fancy.next() - 0.5) * 2.2
    const speed = force * (0.4 + this.fancy.next() * 0.6)
    this.loose.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, turn: this.fancy.next() * 6, spin: (this.fancy.next() - 0.5) * 16, age: 0, life: 0.45 + this.fancy.next() * 0.3, what })
  }

  /** One drop of water let go with a speed of its own: a jet, a stream, a drip. */
  private spill(x: number, y: number, vx: number, vy: number): void {
    if (this.loose.length >= MAX_LOOSE) this.loose.shift()
    this.loose.push({ x, y, vx, vy, turn: Math.PI / 2, spin: 0, age: 0, life: 0.7, what: 'water' })
  }
}

/** Where a thing in the air is: from where it set off to where it rests, along an arc. */
export function flown(fly: Fly | null, rest: { x: number; y: number; size: number }): { x: number; y: number; size: number } {
  if (!fly) return rest
  const p = Math.min(1, fly.t), ease = p * p * (3 - 2 * p)
  return { x: fly.x0 + (rest.x - fly.x0) * ease, y: fly.y0 + (rest.y - fly.y0) * ease - Math.sin(p * Math.PI) * fly.arc, size: fly.size0 + (rest.size - fly.size0) * ease }
}

/** The patches of mud on a garment that draw flies when it is worn. */
export function fliesOn(garment: Garment): { u: number; v: number }[] {
  return patches(garment.mud)
}

function age(who: { reaction: Reaction | null }, dt: number): void {
  if (!who.reaction) return
  who.reaction.age += dt
  if (who.reaction.age > LASTS[who.reaction.what]) who.reaction = null
}

/** A spring towards 0 that rings and dies away. */
function ring<K extends string>(spring: Record<K | 'speed', number>, key: K, dt: number, stiffness: number, damping: number): void {
  spring.speed += (-stiffness * spring[key] - damping * spring.speed) * dt
  spring[key] += spring.speed * dt
}
