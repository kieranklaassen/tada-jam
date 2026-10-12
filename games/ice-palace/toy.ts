import { restOf, type Kind, type Place, type Rest } from './blocks'
import { AT, WHO, type Actor, type Who } from './cast'
import { SUN, type Hole, type Point } from './ground'
import type { Night } from './night'
import { makeRng, type Rng } from './rng'
import type { Scene } from './scene'
import { dayStep, settleNight } from './toyDay'
import type { Skate } from './toyKids'
import { kingHome, type KingNow } from './toyKing'
import { endScene } from './toyScenes'
import { movePiece, warmStep } from './toyPieces'
import * as touch from './toyTouch'
import type { Sound } from './voices'

// The clearing as it is played. The finger cuts a line across the pond and a
// block of that length comes out; things are knocked, carried and set down,
// and rest where they are set; the sun is the handle of the day. Nothing here
// knows about drawing or about the browser.
//
// One clock. Play advances in fixed steps of a sixtieth of a second, and a
// touch is answered inside the call that brings it. Whatever is heard is
// asked for in the same step in which it is seen: a landing's sound comes
// from the step the block lands in, never from a timer started at the lift.
//
// The class holds the state and the calls the Mount makes. What a finger does
// is in toyTouch.ts, how a thing moves and melts in toyPieces.ts, and the
// day, the night, the two scenes and the characters' places in toyDay.ts.

export const STEP = 1 / 60

export type Mode = 'rest' | 'held' | 'hop' | 'fall' | 'sink' | 'hat' | 'roll' | 'melt'

/** A thing as it is played. `x` and `y` are where it is drawn now; `rest` is where the save has it. */
export type Piece = {
  id: number
  kind: Kind
  len: number
  x: number
  y: number
  /** How far it is turned from level, which only a block hopping out of an angled cut is. */
  turn: number
  mode: Mode
  /** Seconds in this mode. */
  age: number
  vy: number
  /** Where it rests, or will: what a save holds. A thing in the hand keeps where it came from. */
  rest: { x: number; y: number; place: Place }
  /** What it will land on, for the sound of the landing. */
  on: 'snow' | 'block' | 'ice'
  /** Where a hop or a slide started. */
  from: { x: number; y: number; turn: number }
  /** A landing's squash and a knock's shiver, each a spring that dies away. */
  squash: number
  squashV: number
  wobble: number
  wobbleV: number
  /** The hole a sinking thing is going into. */
  into: LiveHole | null
  /** A snow block's dents, and whether it wears fresh snow; `capAge` is how far the cap has settled, 0 to 1. */
  dent: number[]
  cap: boolean
  capAge: number
  /** How warm a thumb has made it, 0 to 1: it sweats as this rises. */
  heat: number
  /** The places a rolling snowball has still to pass. */
  path: { x: number; y: number }[]
  /** How far a snowball has turned, in radians. */
  spin: number
  /** Seconds of bubbling a snowball afloat still has to sound: set when it lands in the water, 0 on load. */
  fizz: number
}

/** A hole as it is played: `closing` runs from 0 to 1 once the ice has begun to take it back. */
export type LiveHole = Hole & { closing: number; shut: boolean }

/** The line being cut. */
export type Cut = { from: Point; angle: number; aimed: boolean; len: number; stopped: boolean; scraped: number }

/** What the view shows that the save does not hold: short-lived, gone on load. */
export type Motion =
  | { type: 'chips'; x: number; y: number; angle: number; many: number }
  | { type: 'splash'; x: number; y: number }
  | { type: 'dust'; x: number; y: number; len: number }
  | { type: 'puff'; x: number; y: number }
  | { type: 'flakes'; x: number; y: number }
  | { type: 'ripple'; x: number; y: number }
  | { type: 'drips'; x: number; y: number; many: number }
  | { type: 'scratch'; from: Point; to: Point }
  /** Drops flying from a splash to someone: they arrive after `lasts` seconds, which is the step that one answers in. */
  | { type: 'spray'; from: Point; to: Point; lasts: number }
  | { type: 'bubbles'; x: number; y: number }

/** What a save holds of the clearing. */
export type World = { night: boolean; blocks: Rest[]; holes: Hole[]; drift: number; icicles: number[] }

export type Hand = { piece: Piece; dx: number; dy: number; moved: boolean; held: number }

/** How long after a load, or a return, the hare first crosses. */
export const HARE_FIRST = 16

export class Toy {
  readonly pieces: Piece[] = []
  readonly holes: LiveHole[] = []
  readonly cast: Record<Who, Actor>
  readonly chance: Rng
  /** Seconds of attended play, which every idle motion is a curve of. Always 0 on load. */
  time = 0
  /** Where the finger is while it is down, for eyes to follow. */
  finger: Point | null = null

  // What the finger is doing: at most one of these.
  hand: Hand | null = null
  cut: Cut | null = null
  /** A line the finger has just left: for as long as the lift may still be a skip, a finger coming back carries it on. */
  lastCut: { cut: Cut; piece: Piece | null; hole: LiveHole | null } | null = null
  /** A scoop of snow under the finger: where it started and how long it has got. */
  scoop: { at: Point; len: number; shuffled: number } | null = null
  /** The sun in the hand: how far the finger is from its middle. */
  sunHand: { dy: number } | null = null

  // The day.
  night: boolean
  /** How many scoops the drift has given since the morning, and which of the bough's icicles are gone. */
  drift: number
  icicles: number[]
  /** What of those two is shown: a morning's fresh snow arrives a little after it is saved. */
  driftShown: number
  iciclesShown: number[]

  // What is worked out and never saved.
  sunY: number
  sunV = 0
  /** How far the night's blue has come down over the sheet, 0 to 1. */
  flood: number
  /** How many of the night's lamps are hung and lit. */
  lampsLit = 0
  nightNow: Night = { lamps: [], patches: [], stopped: [], lit: [], shutIn: -1, shut: [], clearLit: -1 }
  /** What the light does at each thing it reaches, by the thing's id: a new entry is heard. */
  lit = new Map<number, string>()
  /** What the characters' tastes look at: the first hollow, snow that shuts a lamp in, clear ice with a lamp behind it (each of those two with the thing's id), and the highest thing that stands. */
  taste: { hollow: Point | null; shut: (Point & { id: number }) | null; clear: (Point & { id: number }) | null; highest: Point | null } = { hollow: null, shut: null, clear: null, highest: null }
  /** The snow the lamp child has rapped on, by its id, or 0 while a rap is still owed: it raps once for a lamp shut in, and then waits. */
  knocked = 0
  /** The lamps that are shut in behind snow, each by its place: when there are more of them than before, one has been shut in anew. */
  shutLamps: string[] = []
  /** What the lamp child is about at night, the stretches it has still to walk for it, and the rap it is going to give: where it stands, where its mitten lands and how high it jumps. */
  lampErrand = ''
  lampWalk: { x: number; y: number; behind: boolean }[] = []
  rap: { id: number; at: Point; on: Point; jump: number } | null = null
  /** The ways the frost children skate in the scene that is playing. */
  skate: Skate | null = null
  king: KingNow = kingHome()
  /** Where the two frost children are, and how far each is up on its feet, 0 to 1. `behind` says the lamp child is behind the wall. */
  kids = { lamp: { x: AT.lamp.x, y: AT.lamp.y, up: 0, behind: false }, peeper: { x: AT.peeper.x, y: AT.peeper.y, up: 0 } }
  bird = { x: AT.bird.x, y: AT.bird.y, fromX: AT.bird.x, fromY: AT.bird.y, toX: AT.bird.x, toY: AT.bird.y, flight: 1 }
  /** How far its darts have thrown the fish along its path, and how far it has come to stare at something red. */
  fishAhead = 0
  fishStare = 0
  /** When the hare next crosses the far snow, in seconds of play, and how long ago it was sent running. */
  hareAt = HARE_FIRST
  hareBolt = -1
  /** Fresh snow is falling: a morning's caps settle while it does. */
  snowing = 0
  scene: Scene | null = null

  nextId = 1
  private carry = 0
  private sounds: Sound[] = []
  private motions: Motion[] = []
  private changed: 'no' | 'soon' | 'now' = 'no'
  private hush = false

  constructor(world: World, seed: number) {
    this.chance = makeRng(seed)
    this.cast = Object.fromEntries(WHO.map((who) => [who, { what: null, age: 0, next: [] }])) as unknown as Record<Who, Actor>
    this.night = world.night
    this.drift = this.driftShown = world.drift
    this.icicles = [...world.icicles]
    this.iciclesShown = [...world.icicles]
    this.sunY = world.night ? SUN.night : SUN.day
    this.flood = world.night ? 1 : 0
    for (const hole of world.holes) this.holes.push({ ...hole, closing: 0, shut: false })
    for (const block of world.blocks) this.pieces.push(this.pieceOf(block))
    // A clearing left at night is found at night: lamps lit, the king seated, no scene.
    settleNight(this)
  }

  // --- What a save holds ---------------------------------------------------

  /** The things at rest: one in the hand is where it came from, one in the air is where it will land, and one going under or melting away is already gone. */
  rests(): Rest[] {
    return this.pieces.filter((piece) => piece.mode !== 'sink' && piece.mode !== 'melt').map((piece) => ({ kind: piece.kind, len: piece.len, x: piece.rest.x, y: piece.rest.y, place: piece.rest.place, dent: [...piece.dent], cap: piece.cap }))
  }
  /** The clearing with everything at rest. */
  world(): World {
    return {
      night: this.night,
      blocks: this.rests(),
      holes: this.holes.filter((hole) => !hole.shut).map(({ x, y, angle, len }) => ({ x, y, angle, len })),
      drift: this.drift,
      icicles: [...this.icicles],
    }
  }

  takeSounds(): Sound[] {
    const sounds = this.sounds
    this.sounds = []
    return sounds
  }
  takeMotions(): Motion[] {
    const motions = this.motions
    this.motions = []
    return motions
  }
  /** Whether anything a save holds has changed since the last call: `now` for an outcome a put-away must find saved, `soon` for a change that keeps coming. */
  takeChanged(): 'no' | 'soon' | 'now' {
    const changed = this.changed
    this.changed = 'no'
    return changed
  }
  /** Whether a touch has just ended a scene: everything the scene was sounding stops in this frame. */
  takeHush(): boolean {
    const hush = this.hush
    this.hush = false
    return hush
  }
  get carrying(): Piece | null {
    return this.hand?.moved ? this.hand.piece : null
  }
  get sceneRunning(): boolean {
    return this.scene !== null && this.scene.running
  }

  // --- The finger (toyTouch.ts) --------------------------------------------

  /** The finger lands. A scene that is playing ends first, and the touch is then an ordinary touch. */
  press(at: Point): void {
    if (this.sceneRunning) {
      endScene(this)
      this.hush = true
    }
    touch.press(this, at)
  }
  drag(at: Point): void {
    touch.drag(this, at)
  }
  /** The finger lifts mid-drag: a line cracks out now, and may still be carried on. */
  lift(): void {
    touch.lift(this)
  }
  /** The drag is over and the child let go. */
  drop(): void {
    touch.drop(this)
  }
  /** A press and a lift with no move between: the child's tap. */
  tap(): void {
    touch.tap(this)
  }
  /** A press that was taken away, which is no tap. */
  release(): void {
    touch.release(this)
  }
  /** The touch was taken away with the finger still down, which is no drop. */
  cancel(): void {
    touch.cancel(this)
  }

  /**
   * The game is put away. Whatever is in the hand goes back, a scene lands every beat, and everything comes to
   * rest where a save has it, without a sound: what is on the surface is then what a load would show.
   */
  putAway(): void {
    touch.cancel(this)
    this.lastCut = null
    endScene(this)
    for (const piece of [...this.pieces]) {
      if (piece.mode === 'sink' || piece.mode === 'melt') this.pieces.splice(this.pieces.indexOf(piece), 1)
      else Object.assign(piece, { mode: 'rest', age: 0, x: piece.rest.x, y: piece.rest.y, vy: 0, turn: 0, squash: 0, squashV: 0, wobble: 0, wobbleV: 0, heat: 0, capAge: 1, path: [], into: null })
    }
    for (let i = this.holes.length - 1; i >= 0; i--) if (this.holes[i].shut) this.holes.splice(i, 1)
    for (const piece of this.pieces) piece.fizz = 0
    for (const who of WHO) Object.assign(this.cast[who], { what: null, age: 0, next: [] })
    this.sunY = this.night ? SUN.night : SUN.day
    this.sunV = 0
    this.snowing = 0
    this.fishStare = 0
    // The hare is gone, as after a load: it comes again when a first visit's would.
    this.hareBolt = -1
    this.hareAt = this.time + HARE_FIRST
    this.driftShown = this.drift
    this.iciclesShown = [...this.icicles]
    settleNight(this)
    this.sounds = []
    this.motions = []
    this.hush = true
  }

  // --- Time ----------------------------------------------------------------

  /** Plays `seconds` of attended time in fixed steps. A first frame plays none. */
  advance(seconds: number): void {
    this.carry += seconds
    while (this.carry >= STEP) {
      this.carry -= STEP
      this.step()
    }
  }

  /** One sixtieth of a second. */
  step(): void {
    this.time += STEP
    if (this.scene) this.scene.update(this.time)
    warmStep(this)
    for (const piece of [...this.pieces]) movePiece(this, piece)
    dayStep(this)
  }

  // --- For the rules in the other files ------------------------------------

  say(sound: Sound): void {
    this.sounds.push(this.sceneRunning ? { ...sound, scene: true } : sound)
  }
  show(motion: Motion): void {
    this.motions.push(motion)
  }
  mark(when: 'soon' | 'now'): void {
    if (when === 'now' || this.changed === 'no') this.changed = when
  }
  pieceOf(block: Rest): Piece {
    const { kind, len, x, y, place } = block
    return { id: this.nextId++, kind, len, x, y, turn: 0, mode: 'rest', age: 0, vy: 0, rest: { x, y, place }, on: 'snow', from: { x, y, turn: 0 }, squash: 0, squashV: 0, wobble: 0, wobbleV: 0, into: null, dent: [...block.dent], cap: block.cap, capAge: 1, heat: 0, path: [], spin: 0, fizz: 0 }
  }
  newPiece(kind: Kind, len: number, x: number, y: number, place: Place): Piece {
    const piece = this.pieceOf(restOf(kind, len, x, y, place))
    this.pieces.push(piece)
    return piece
  }
}
