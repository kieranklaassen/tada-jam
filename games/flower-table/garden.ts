import { MANNER, lasts, type Act, type ActName } from './acting'
import type { Note } from './audio'
import { RIG, VISITORS, nextPosition, tipping, turnOf, verdict, type Answer, type Turn, type VisitorId } from './cast'
import { COUNTS_FROM, progressToward } from './input'
import { CAT, FLOOR_Y, HOME, PATH, PATH_CLEAR, PATH_HOLDS, ROBIN, STREET_SCALE, TABLE, VASE, VISITOR, WAITING, maxLean, mouthReach, type Vase, type VaseId } from './layout'
import { EARTH, UPRIGHT_REACH, flatPlace, overBed, isUpright, uprightPlace, type Lying } from './place'
import { BED, MIN_PIECE, MIN_STALK, PLANTS, SOIL_Y, fullOf, headOf, type Kind } from './plants'
import { makeRng, type Rng } from './rng'
import type { Bouquet, InVase, OnPath, Saved, Showing } from './save'
import { Scene, type Beat } from './scene'
import * as voices from './voices'

// The garden: the rules of the game and everything that moves in it, as plain
// numbers on game time. Nothing here draws or makes a sound: the view paints
// what these fields say, and the Mount plays the notes queued in `sounds`.
//
// The one act is the cut. A finger that lands on a stem, or crosses one, cuts
// it exactly there, and the piece is in the hand until the finger lets go.
// One touch cuts one stem. Whatever is logically true is true at once (the
// stem is cut, the piece is in the vase, the bouquet is out in the street),
// so a save taken at any instant holds every piece at rest; what the eye sees
// arrives a moment later, eased here, or beat by beat in a scene (scene.ts).

export type Stem = {
  index: number
  kind: Kind
  scale: number
  x: number
  full: number
  /** The height it stands at, as cut. */
  height: number
  /** A stalk growing back: 0 to 1, or 1 when it is not growing. */
  grow: number
  /** The height it grew back from. */
  grewFrom: number
  /** It is grown already and waits its turn to be seen growing: it is drawn as the stalk it was. */
  hold: boolean
  /** A damped spring about the earth, in radians: the shudder after a cut. */
  sway: number
  swayV: number
  /** Seconds left of the bead of sap on the cut. */
  sap: number
  /** Seconds left of its bee's flight. */
  lift: number
}

export type Piece = {
  id: number
  stem: number
  kind: Kind
  scale: number
  base: number
  len: number
  head: boolean
  spent: boolean
  /** The flower as the eye sees it: a poppy keeps its petals until it lands. */
  shownSpent: boolean
  where: 'hand' | 'vase' | 'path' | 'air' | 'robin'
  /** Where it rests on the path: its cut end, and how it is turned from upright. */
  x: number
  y: number
  rot: number
  /** Where across the mouth of the vase it was let go, in tenths. */
  at: number
  /** As drawn this frame: the cut end, the turn, the bend of its upper part and where along it the bend is, and its stretch along its length. */
  px: number
  py: number
  prot: number
  bend: number
  bendAt: number
  stretch: number
  /** How wide it is drawn: a sunflower turning to the window passes through nothing. */
  wide: number
  /** What it is doing on its way to rest, and how far along. `wait`: it is at rest already and not seen there yet. */
  move: 'fall' | 'toVase' | 'landed' | 'stood' | 'wait' | null
  t: number
  dur: number
  fromX: number
  fromY: number
  fromRot: number
  /** A nudge from a neighbour arriving in the vase, in radians, dying away. */
  jolt: number
  joltT: number
  /** Seconds left of its bee's flight. */
  lift: number
  /** Its bee has moved into the bee-keeper's hat. */
  noBee: boolean
  /** An ivy's tendril on its way over the rim: 0 to 1. */
  creep: number
  /** How high it springs on its way down: a piece that bounced off a full vase. */
  hop: number
}

export type Bit = { kind: 'seed' | 'petal' | 'fluff' | 'haze' | 'drop'; x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; spin: number; floor: number }

/** A visitor, wherever it is: at the table, in the gateway, out in the street. */
export type Actor = {
  who: VisitorId
  where: 'table' | 'gate' | 'street' | 'away'
  /** Where its feet are, how large it stands and how solid it is drawn. */
  x: number
  feetY: number
  scale: number
  alpha: number
  /** What it is playing, or null when it only waits. `timed` acts run by themselves; a scene sets the others. */
  act: Act | null
  timed: boolean
  actT: number
  actDur: number
  /** Where its eyes are turned, on the stage. */
  lookX: number
  lookY: number
  blink: number
  nextBlink: number
  /** Seconds left of leaning in to what has just arrived in the vase. */
  lean: number
  /** How far its hands or its muzzle are held out to the vase, 0 to 1. */
  offer: number
  /** How far it holds its empty vase out, turned to the child, 0 to 1. */
  present: number
  /** Short-lived marks, gone on load: a yellow nose, a bun shaken loose, bees in the hat, the bees sagging. */
  yellow: boolean
  loose: boolean
  hatBees: number
  sag: number
}

type Origin =
  | { from: 'bed' | 'cut'; x: number; y: number; rot: number }
  | { from: 'path'; x: number; y: number; rot: number; index: number }
  | { from: 'vase'; at: number; index: number }

/** One move for the ghost hand. `cut` says the blades make it: the hand crosses a stem. */
export type Hint = { fromX: number; fromY: number; toX: number; toY: number; cut: boolean }

/** What a finger at a point would land on. */
export type Target =
  | { on: 'inVase' | 'onPath'; piece: Piece }
  | { on: 'stem'; stem: Stem }
  | { on: 'pot' | 'visitor' | 'gate' | 'cat' | 'robin' | 'air' }

const TAU = Math.PI * 2
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const smooth = (t: number): number => t * t * (3 - 2 * t)
const inOval = (x: number, y: number, oval: { x: number; y: number; rx: number; ry: number }): boolean => ((x - oval.x) / oval.rx) ** 2 + ((y - oval.y) / oval.ry) ** 2 <= 1

/**
 * How each plant hangs in the hand: how far it lags the finger, how hard it springs back, how soon it settles,
 * and how it kicks as it comes away. A sunflower is heavy and slow, a thistle stiff, an ivy quivers, a dandelion trails.
 */
const IN_HAND: Record<Kind, { lag: number; spring: number; damp: number; kick: number }> = {
  sunflower: { lag: 0.0017, spring: 60, damp: 4, kick: 3.4 },
  poppy: { lag: 0.0012, spring: 150, damp: 10, kick: 1.2 },
  onion: { lag: 0.001, spring: 210, damp: 7, kick: 0.6 },
  thistle: { lag: 0.0004, spring: 320, damp: 26, kick: 0 },
  ivy: { lag: 0.0015, spring: 420, damp: 5, kick: 7 },
  dandelion: { lag: 0.002, spring: 55, damp: 11, kick: 0.8 },
}

/** How each visitor holds its empty vase out, turned to the child: how far towards the bed, how high, how far tipped, and how it moves. */
const HOLDS_OUT: Record<VisitorId, { dx: number; dy: number; tilt: number; bob: number; pace: number }> = {
  goat: { dx: -8, dy: -8, tilt: -0.2, bob: 3, pace: 5 },
  beekeeper: { dx: -6, dy: -6, tilt: -0.13, bob: 1.5, pace: 1.6 },
  bride: { dx: -8, dy: -20, tilt: -0.1, bob: 4, pace: 2.2 },
  aunt: { dx: -16, dy: -5, tilt: 0, bob: 0, pace: 1 },
}

/** How far a sniffed sunflower has turned its face to the visitor's, 0 to 1, by how far through the sniff it is: round before the boop, back at the end. */
export function facing(u: number): number {
  return smooth(clamp((u - 0.06) / 0.2, 0, 1)) * (1 - smooth(clamp((u - 0.86) / 0.14, 0, 1)))
}

/** How much of an onion flower's landing its two bounces take; it rolls for the rest. */
export const BOUNCES = 0.8
/** The turn of a thistle on its way down: point first, however it hung in the hand. */
const pointFirst = (rot: number): number => clamp(rot, -0.3, 0.3)

/** The floor of a loose bit that never lands: a haze that lifts, fluff on the wind. */
const NO_FLOOR = 1e6

/** How near a finger must land to a stem, a piece or the path of the blades to count. */
export const REACH = 24
/** Seconds without a touch before the visitor shows, once ever, that the vase can come to it. */
export const REACH_AFTER = 4
/** The least distance between two leans in a vase, in radians, where the mouth has the room. */
const LEAN_GAP = 0.09
/** How much of a headless piece shows over the rim however short it is. */
const SHOWS = 20
/** How far the vase is taken up to the visitor's nose. */
const TAKEN = { dx: 2, dy: -30 }
/** How long the double tick of the opening blades is heard before the snip of a finger that landed on a stem, in seconds. */
const TICK = 0.07

export type Standing = { lean: number; sink: number; droop: number; bendAt: number }

/**
 * How the pieces of a vase stand, worked out from what is saved of them: where across the mouth each was let
 * go, how long it is and what plant it is. Pieces lean out from the middle and against each other; a thistle
 * stands stiff and the others lean round it; a piece shorter than the vase is deep sinks until only its top
 * shows; one that stands out by more than the vase is tall tips its head to the side it leans.
 */
export function arrange(pieces: readonly { at: number; len: number; kind: Kind; head: boolean; scale: number }[], vase: Vase): Standing[] {
  const most = maxLean(vase)
  const gap = Math.min(LEAN_GAP, (most * 2) / 8)
  const lean = pieces.map((piece) => (piece.at / 10) * most * (piece.kind === 'thistle' ? 0.3 : 1))
  const order = pieces.map((_, index) => index).sort((a, b) => lean[a] - lean[b] || a - b)
  for (let pass = 0; pass < 8; pass++) {
    for (let k = 0; k + 1 < order.length; k++) {
      const a = order[k], b = order[k + 1]
      const short = gap - (lean[b] - lean[a])
      if (short <= 0) continue
      const stiffA = pieces[a].kind === 'thistle', stiffB = pieces[b].kind === 'thistle'
      if (stiffA && !stiffB) lean[b] += short
      else if (stiffB && !stiffA) lean[a] -= short
      else { lean[a] -= short / 2; lean[b] += short / 2 }
    }
  }
  return pieces.map((piece, index) => {
    const angle = clamp(lean[index], -most, most)
    const top = piece.head ? PLANTS[piece.kind].head * piece.scale * 0.8 : SHOWS
    const sink = clamp(piece.len - top, 6, vase.depth)
    const out = piece.len - sink
    const side = angle > 0.001 ? 1 : angle < -0.001 ? -1 : index % 2 ? -1 : 1
    // The boot holds any length upright: a head tips only in a vase that can be tipped.
    const droop = vase.id !== 'boot' && out > vase.tall ? side * clamp((out - vase.tall) / 110, 0.3, 1) * 1.7 : 0
    return { lean: angle, sink, droop, bendAt: sink + vase.tall * 0.85 }
  })
}

/** Where a point lies along a segment and how far from it: the distance, and the place as a length from `a`. */
function nearSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): { d: number; s: number } {
  const dx = bx - ax, dy = by - ay
  const length = Math.hypot(dx, dy)
  if (length === 0) return { d: Math.hypot(px - ax, py - ay), s: 0 }
  const s = clamp(((px - ax) * dx + (py - ay) * dy) / length, 0, length)
  return { d: Math.hypot(px - (ax + (dx * s) / length), py - (ay + (dy * s) / length)), s }
}

/** Where the path of the finger from `p` to `q` crosses the segment `a` to `b`: how far along the finger's path (0 to 1) and along the segment as a length, or null. */
function crossing(px: number, py: number, qx: number, qy: number, ax: number, ay: number, bx: number, by: number): { along: number; s: number } | null {
  const rx = qx - px, ry = qy - py, sx = bx - ax, sy = by - ay
  const cross = rx * sy - ry * sx
  if (Math.abs(cross) < 1e-9) return null
  const along = ((ax - px) * sy - (ay - py) * sx) / cross
  const u = ((ax - px) * ry - (ay - py) * rx) / cross
  if (along < 0 || along > 1 || u < 0 || u > 1) return null
  return { along, s: u * Math.hypot(sx, sy) }
}

/** The part of the vase a finger takes hold of to carry it: its body, from under the rim to the table. */
export function potBox(vase: Vase): { left: number; right: number; top: number; bottom: number } {
  const half = Math.max(30, vase.halfMouth + 14)
  return { left: vase.x - (vase.id === 'boot' ? 108 : half), right: vase.x + half, top: vase.mouthY + 6, bottom: TABLE.top }
}

/** Where the one who waits in the gateway holds its vase: on top of its head, in plain view. */
export function gateHold(who: VisitorId): { x: number; y: number } {
  return { x: WAITING.x, y: WAITING.feetY - (FLOOR_Y - (RIG[who].headY + RIG[who].top.y)) * WAITING.scale + 4 }
}

/** A cue inside a beat: true the first time the beat's progress reaches `at`, and never again. */
function cues(): (at: number, u: number) => boolean {
  const fired = new Set<number>()
  return (at, u) => {
    if (u < at || fired.has(at)) return false
    fired.add(at)
    return true
  }
}

const strip = (piece: Piece): { stem: number; base: number; len: number; head: boolean; spent: boolean } => ({ stem: piece.stem, base: piece.base, len: piece.len, head: piece.head, spent: piece.spent })

export class Garden {
  readonly stems: Stem[]
  /** The pieces in the vase, in the order they were put in. */
  vase: Piece[] = []
  /** The pieces on the path, oldest first. */
  path: Piece[] = []
  /** The piece the finger holds, if any. Until it is let go it is saved where it came from. */
  hand: Piece | null = null
  /** The pieces the robin is still to come for, where they lie, and the one it is carrying off. All are out of the save already. */
  leaving: Piece[] = []
  taken: Piece | null = null
  /** The bouquet as a scene shows it in the vase, while the save already has it elsewhere. Null: the vase shows `vase`. */
  carried: Piece[] | null = null
  readonly bits: Bit[] = []
  maxBits = 48

  /** The turn of the ring, and whether its visitor has left with the bouquet. */
  position: string
  finished: boolean
  /** The bouquets out in the street as saved, and as the street shows them; `streetVersion` goes up when what is shown changes. */
  street: Bouquet[]
  streetSeen: Bouquet[]
  streetVersion = 0
  shown: Showing[]

  readonly actors: Record<VisitorId, Actor>
  /** The vase on the table as it is drawn: off its place, tilted, scaled, rocking, in the finger. */
  readonly pot = { id: 'boot' as VaseId, on: true, dx: 0, dy: 0, tilt: 0, scale: 1, rock: 0, held: false, back: 0, fromDx: 0, fromDy: 0, grabX: 0, grabY: 0 }
  /** The water a vase spilled: where, and how far through running out and soaking away, or null. */
  puddle: { x: number; side: number; u: number } | null = null

  /** The finger: where it is, whether it is down, and how fast it moves across, eased. */
  readonly finger = { x: 0, y: 0, down: false, vx: 0, lastX: 0 }
  /** The scissors at the finger: how far open, how visible, and a snap that runs from 1 to 0 after a cut. */
  readonly scissors = { x: 0, y: 0, open: 0, seen: 0, snap: 0 }
  /** This touch has cut, or took something up: its blades cut nothing more. */
  private used = false
  /** This touch landed on a creature or the vase: no blades are shown at it. */
  private poking = false
  /** How fast the piece in the hand is swinging, in radians a second. */
  private swing = 0
  /** The round head of an onion flower bobs in the hand for a moment after its cut, in seconds left. */
  private bob = 0
  /** Small things a cell does a moment after it starts: a breath, seeds on the wind. Seen only, never saved. */
  private soon: { at: number; run: () => void }[] = []
  /** The piece the aunt straightens with a fingertip, and how far, 0 to 1: it sinks back when she lets go. Seen only. */
  mend: { piece: Piece; amount: number } | null = null
  /** Seconds left of the aunt squaring her bouquet to the edge of the table at her window. Seen only. */
  squaring = 0

  /** What only the goat does: its jaw, its ears, its tongue. */
  readonly goat = { chew: 0, perk: 0, flick: 0, flickEar: 0, nextFlick: 3.1, lick: 0 }
  readonly cat = { eye: 0, tail: 0, twitch: 0, nextTwitch: 4.2, poke: 0, breath: 0 }
  readonly robin = { state: 'perch' as 'perch' | 'down' | 'off' | 'home', t: 0, x: ROBIN.x as number, y: ROBIN.y as number, hop: 0, nextHop: 5.3, turn: 1, flap: 0 }

  /** The notes this touch or this step set off, for the Mount to play as one voice and empty. */
  sounds: Note[] = []
  /** What the Mount must hand to storage: nothing, a small change at the throttle, or an outcome at once. */
  dirty: 'no' | 'soon' | 'now' = 'no'
  time = 0
  /** Seconds of attended time since the last touch, counted from the load. */
  quiet = 0

  private scene: Scene | null = null
  private origin: Origin | null = null
  private readonly rules: Rng
  private readonly life: Rng
  private nextId = 1

  constructor(saved: Saved, seed: number) {
    this.rules = makeRng(seed)
    this.life = makeRng(seed ^ 0x5bd1e995)
    this.position = saved.position
    this.finished = saved.finished
    this.street = saved.street.map((bouquet) => ({ who: bouquet.who, pieces: bouquet.pieces.map((piece) => ({ ...piece })) }))
    this.streetSeen = this.street
    this.shown = [...saved.shown]
    this.stems = BED.map((spot, index) => ({ index, kind: spot.kind, scale: spot.scale, x: spot.x, full: fullOf(index), height: saved.bed[index] ?? fullOf(index), grow: 1, grewFrom: 0, hold: false, sway: 0, swayV: 0, sap: 0, lift: 0 }))
    // As it was left: every piece at rest, nothing eases in.
    for (const piece of saved.vase) this.vase.push({ ...this.make(piece.stem, piece.base, piece.len, piece.head, piece.spent), where: 'vase', at: piece.at, creep: 1 })
    for (const piece of saved.path) this.path.push({ ...this.make(piece.stem, piece.base, piece.len, piece.head, piece.spent), where: 'path', x: piece.x, y: piece.y, rot: piece.rot })
    const actor = (who: VisitorId, index: number): Actor => ({ who, where: 'street', x: HOME[who].x, feetY: 0, scale: STREET_SCALE, alpha: 1, act: null, timed: false, actT: 0, actDur: 1, lookX: 500, lookY: 560, blink: 0, nextBlink: 1.6 + index * 0.9, lean: 0, offer: 0, present: 0, yellow: false, loose: false, hatBees: 0, sag: 0 })
    this.actors = { goat: actor('goat', 0), beekeeper: actor('beekeeper', 1), bride: actor('bride', 2), aunt: actor('aunt', 3) }
    this.cast()
    this.pose()
  }

  /** The visitor and the vase of this turn, and of the next one, who waits in the gateway. */
  get turn(): Turn { return turnOf(this.position) }
  get next(): Turn { return turnOf(nextPosition(this.position)) }
  /** The vase of this turn. */
  get vaseDef(): Vase { return VASE[this.turn.vase] }

  /** Puts every visitor where the state says it is, at rest: at the table or out in the street, and the next one in the gateway. */
  private cast(): void {
    for (const who of VISITORS) {
      const actor = this.actors[who]
      actor.act = null; actor.alpha = 1
      if (who === this.next.visitor) this.place(actor, 'gate')
      else if (who === this.turn.visitor && !this.finished) this.place(actor, 'table')
      else this.place(actor, 'street')
    }
    const pot = this.pot
    pot.id = this.turn.vase; pot.on = !this.finished
    pot.dx = pot.dy = pot.tilt = pot.rock = pot.back = 0; pot.scale = 1; pot.held = false
  }

  private place(actor: Actor, where: Actor['where']): void {
    actor.where = where
    if (where === 'table') { actor.x = VISITOR.x; actor.feetY = FLOOR_Y; actor.scale = 1 }
    else if (where === 'gate') { actor.x = WAITING.x; actor.feetY = WAITING.feetY; actor.scale = WAITING.scale }
    // Out in the street it is seen over the garden wall: `HOME` is where its head is, and its feet are behind the wall.
    else { actor.x = HOME[actor.who].x; actor.feetY = HOME[actor.who].y + (FLOOR_Y - RIG[actor.who].headY) * STREET_SCALE; actor.scale = STREET_SCALE }
  }

  /** Something is still on its way, so the child is not idle and the hand stays away. */
  get busy(): boolean {
    return this.scene !== null || this.robin.state !== 'perch' || this.leaving.length > 0 || this.pot.held || this.pot.back > 0
      || this.stems.some((stem) => stem.grow < 1) || VISITORS.some((who) => this.actors[who].act !== null)
      || [...this.vase, ...this.path].some((piece) => piece.move === 'fall' || piece.move === 'toVase' || piece.move === 'wait')
  }

  /** The visitor has the vase in its hands: a scene has it carry, lift or sniff it. */
  holds(who: VisitorId): boolean {
    const actor = this.actors[who]
    return this.pot.on && who === this.turn.visitor && actor.act !== null && !actor.timed && actor.act.name !== 'stepBack'
  }

  /** A scene is playing. */
  get playing(): boolean { return this.scene !== null }

  // --- The finger ------------------------------------------------------------

  /** What a finger at this point would land on. The order is the order a press answers in. */
  targetAt(x: number, y: number): Target {
    const stem = this.stemAt(x, y)
    // A long head that tips out of the vase can hang over the end of the bed: there the finger belongs to the stem.
    const inVase = this.pot.on && !this.carried && !stem ? this.nearest(this.vase, x, y, true) : null
    if (inVase) return { on: 'inVase', piece: inVase }
    const lying = this.nearest(this.path, x, y, false)
    if (lying) return { on: 'onPath', piece: lying }
    if (stem) return { on: 'stem', stem }
    if (this.pot.on && !this.finished) {
      const box = potBox(this.vaseDef)
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return { on: 'pot' }
      if (inOval(x, y, VISITOR)) return { on: 'visitor' }
    }
    if (x >= WAITING.left && x <= WAITING.right && y >= WAITING.top && y <= WAITING.bottom && this.actors[this.next.visitor].where === 'gate') return { on: 'gate' }
    if (inOval(x, y, CAT)) return { on: 'cat' }
    if (this.robin.state === 'perch' && Math.hypot(x - ROBIN.x, y - ROBIN.y) <= ROBIN.r) return { on: 'robin' }
    return { on: 'air' }
  }

  /** The finger landed. A scene that is playing ends first; then whatever the finger landed on answers now. */
  press(x: number, y: number): void {
    this.endScene()
    // One finger works at a time: a press that lands while something is still in the hand first puts that back.
    if (this.hand || this.pot.held) this.putBack()
    this.quiet = 0
    const finger = this.finger
    finger.x = finger.lastX = x; finger.y = y; finger.down = true; finger.vx = 0
    this.used = false
    this.poking = false
    const scissors = this.scissors
    scissors.x = x; scissors.y = y; scissors.seen = 1; scissors.snap = 0

    const target = this.targetAt(x, y)
    switch (target.on) {
      case 'inVase': {
        const index = this.vase.indexOf(target.piece)
        this.vase.splice(index, 1)
        this.take(target.piece, { from: 'vase', at: target.piece.at, index })
        this.jostle(0.05)
        // A head drawn out may have been the counterweight.
        this.weigh()
        return
      }
      case 'onPath': {
        const index = this.path.indexOf(target.piece)
        this.path.splice(index, 1)
        this.take(target.piece, { from: 'path', x: target.piece.x, y: target.piece.y, rot: target.piece.rot, index })
        return
      }
      case 'stem':
        if (target.stem.height < target.stem.full) {
          // The blades spring open at the finger here as anywhere, and the stalk shoots up between them.
          scissors.open = 0.4
          this.sounds.push(...voices.bladesOpen)
          this.growBack(target.stem)
        }
        else {
          // The blades spring open with their double tick as the finger lands, and shut on the stem at once.
          this.sounds.push(...voices.bladesOpen)
          this.cutStem(target.stem, y, TICK)
        }
        return
      case 'pot': return this.holdPot(x, y)
      case 'visitor': return this.vase.length > 0 ? this.handOver() : this.poke()
      case 'gate': return this.finished ? this.comeIn() : this.pokeGate()
      case 'cat': return this.pokeCat()
      case 'robin': return this.pokeRobin()
      case 'air':
        // Nothing there: the blades spring open on the air.
        scissors.open = 0.4
        this.sounds.push(...voices.bladesOpen)
    }
  }

  /** The finger moved while down. With open blades it cuts the first stem it crosses, exactly where it crosses. */
  move(x: number, y: number): void {
    const finger = this.finger
    const fromX = finger.x, fromY = finger.y
    finger.x = x; finger.y = y
    this.scissors.x = x; this.scissors.y = y
    if (!finger.down) return
    const pot = this.pot
    if (pot.held) { pot.dx = x - pot.grabX; pot.dy = Math.min(0, y - pot.grabY); return }
    if (this.used || this.hand) return
    const offers: { along: number; cut: () => void }[] = []
    const offer = (along: number, cut: () => void): void => { offers.push({ along, cut }) }
    for (const stem of this.stems) {
      if (stem.grow < 1) continue
      const hit = crossing(fromX, fromY, x, y, stem.x, SOIL_Y, stem.x, SOIL_Y - stem.height)
      if (hit && this.canCutStem(stem, SOIL_Y - hit.s)) offer(hit.along, () => this.cutStem(stem, SOIL_Y - hit.s))
    }
    for (const list of [this.path, this.vase]) {
      if (list === this.vase && (!pot.on || this.carried)) continue
      for (const piece of list) {
        if (piece.move === 'fall' || piece.move === 'toVase' || piece.move === 'wait') continue
        const low = list === this.vase ? this.standingOf(piece).sink + 10 : 0
        const [ax, ay, bx, by] = this.spine(piece)
        const hit = crossing(fromX, fromY, x, y, ax, ay, bx, by)
        if (hit && hit.s >= Math.max(MIN_PIECE, low) && piece.len - hit.s >= MIN_PIECE) offer(hit.along, () => this.cutPiece(piece, hit.s))
      }
    }
    // The first thing the blades reach is the one they cut.
    offers.sort((a, b) => a.along - b.along)[0]?.cut()
  }

  /** The finger let go. What is in the hand goes where it was let go: into the vase, onto the visitor, or down onto the path. */
  lift(x: number, y: number): void {
    const finger = this.finger
    finger.x = x; finger.y = y; finger.down = false
    if (this.pot.held) return this.letPotGo(x, y)
    const piece = this.hand, origin = this.origin
    if (!piece || !origin) {
      // The blades shut on nothing.
      // A snip of the air is a snip: the cat opens an eye at it too.
      if (!this.used) { this.scissors.snap = 1; this.sounds.push(...voices.snick); this.cat.eye = 1.1 }
      this.scissors.open = 0
      return
    }
    this.hand = null
    this.origin = null
    // No blades at a piece that is let go: they stay hidden for the carry and for its end.
    this.scissors.seen = 0
    const vase = this.vaseDef, there = this.pot.on && !this.finished && !this.carried
    const over = there && Math.abs(x - vase.x) <= mouthReach(vase) && y <= vase.mouthY + vase.depth && y >= vase.mouthY - 330
    const moved = Math.hypot(x - piece.fromX, y - piece.fromY) > 14
    // Drawn out and let go again where it stood: it goes back as it was.
    if (origin.from === 'vase' && there && (!moved || over)) return this.stand(piece, moved ? this.across(x) : origin.at, moved ? this.vase.length : origin.index)
    if (over) return this.intoVase(piece, this.across(x))
    if (there && moved && inOval(x, y, VISITOR)) return this.dropOn(piece)
    if (there && origin.from !== 'vase' && moved && progressToward({ x: piece.fromX, y: piece.fromY }, { x, y }, { x: vase.x, y: vase.mouthY }) >= COUNTS_FROM) return this.intoVase(piece, x < vase.x ? -5 : 5)
    // A piece picked up and let go where it lay stays as it lay.
    if (origin.from === 'path' && !moved) return this.layBack(piece, origin)
    this.drop(piece, x, true, y)
  }

  private intoVase(piece: Piece, at: number): void {
    const vase = this.vaseDef
    if (this.vase.length >= vase.holds) {
      // An eighth piece does not fit: it bounces off the bunch.
      this.sounds.push(...voices.boing)
      this.jostle(0.09)
      this.drop(piece, vase.x - 150 + this.rules.next() * 70, false)
      piece.hop = 90; piece.dur = Math.max(piece.dur, 0.5)
      return
    }
    this.stand(piece, at, this.vase.length)
  }

  /** The touch was taken away and the child let nothing go: what is in the hand goes back where it came from, and the vase to its place. */
  putBack(): void {
    this.finger.down = false
    this.scissors.open = 0
    if (this.pot.held) this.slidePotBack(false)
    const piece = this.hand, origin = this.origin
    this.hand = null
    this.origin = null
    if (!piece || !origin) return
    if (origin.from === 'vase') {
      piece.where = 'vase'; piece.at = origin.at; piece.move = null
      this.vase.splice(Math.min(origin.index, this.vase.length), 0, piece)
    } else this.layBack(piece, origin)
    this.changed('now')
  }

  // --- Cutting ---------------------------------------------------------------

  private canCutStem(stem: Stem, y: number): boolean {
    return stem.height - this.cutHeight(stem, y) >= MIN_PIECE
  }

  /** The height a cut at `y` leaves standing: a finger on the flower cuts just below it. */
  private cutHeight(stem: Stem, y: number): number {
    const underFlower = stem.height >= stem.full ? stem.full - headOf(stem.index) - 8 : stem.height - MIN_PIECE
    return clamp(SOIL_Y - y, MIN_STALK, Math.max(MIN_STALK, underFlower))
  }

  private cutStem(stem: Stem, y: number, after = 0): void {
    const height = this.cutHeight(stem, y)
    const len = stem.height - height
    if (len < MIN_PIECE) return
    const head = stem.height >= stem.full
    stem.height = height
    stem.sap = 1.5
    // The stalk left behind whips and settles; a thistle stays stiff. Its neighbours tremble once.
    const dir = this.rules.next() < 0.5 ? -1 : 1
    if (stem.kind !== 'thistle') stem.swayV = dir * (stem.kind === 'ivy' ? 9 : stem.kind === 'sunflower' ? 7.5 : 5.5)
    for (const other of this.stems) if (Math.abs(other.index - stem.index) === 1) other.swayV -= dir * 1.1
    const piece = this.make(stem.index, height, len, head, false)
    piece.px = stem.x; piece.py = y
    // Until it is let go it is saved on the path at the foot of its plant, so the path makes room for it now.
    this.makeRoom()
    const lie = this.lieAt(stem.x + (this.rules.next() - 0.5) * 28, piece, false)
    this.take(piece, { from: 'bed', ...lie }, false)
    if (head && PLANTS[stem.kind].bee) { piece.lift = 0.8; this.sounds.push(...voices.buzz) }
    // Each plant comes away in its own way: the heavy sunflower lurches, the onion's round head bobs, the ivy quivers.
    this.swing = dir * IN_HAND[stem.kind].kick
    this.bob = stem.kind === 'onion' && head ? 0.6 : 0
    this.snipped(stem.kind, height / stem.full, after)
    this.changed('now')
  }

  /** A piece that lies or stands is cut where the blades cross it: the end beyond the cut comes off into the hand. */
  private cutPiece(piece: Piece, s: number): void {
    const upper = this.make(piece.stem, piece.base + s, piece.len - s, piece.head, piece.spent)
    upper.shownSpent = piece.shownSpent
    upper.noBee = piece.noBee
    const [ax, ay, bx, by] = this.spine(piece)
    const along = s / Math.hypot(bx - ax, by - ay)
    upper.px = lerp(ax, bx, along); upper.py = lerp(ay, by, along); upper.prot = piece.prot
    piece.len = s; piece.head = false; piece.spent = false; piece.shownSpent = false
    this.makeRoom()
    // The end that came off is saved lying beside what it was cut from; cut off in the vase, in front of the table.
    const lie = this.lieAt(piece.where === 'path' ? upper.px : this.vaseDef.x - 60, upper, false)
    this.take(upper, { from: 'cut', ...lie }, false)
    if (upper.head && PLANTS[upper.kind].bee && !upper.noBee) { upper.lift = 0.8; this.sounds.push(...voices.buzz) }
    if (piece.where === 'vase') this.jostle(0.08)
    this.snipped(piece.kind, upper.base / fullOf(piece.stem))
    this.changed('now')
    // A head cut off in the vase no longer pulls it that way.
    if (piece.where === 'vase') this.weigh()
  }

  /** The blades shut on a stem. `high` is how high up its stem the cut is, from 0 at the earth to 1 at the top. */
  private snipped(kind: Kind, high: number, after = 0): void {
    this.used = true
    this.scissors.open = 0
    this.scissors.snap = 1
    this.sounds.push(...voices.later(voices.snip(kind, 1 - high), after))
    // The snip is heard in the garden: the goat's ears go up, the cat opens an eye.
    this.goat.perk = 1
    this.cat.eye = 1.1
  }

  /** A finger on a cut stalk: it shoots back up to its full height, flower and all. */
  private growBack(stem: Stem): void {
    this.used = true
    stem.grewFrom = stem.height
    stem.height = stem.full
    stem.grow = 0
    stem.sap = 0
    this.sounds.push(...voices.growBack)
    this.goat.perk = 0.6
    this.changed('now')
  }

  // --- The hand --------------------------------------------------------------

  private take(piece: Piece, origin: Origin, sound = true): void {
    this.used = true
    this.scissors.open = 0
    piece.where = 'hand'
    piece.move = null
    piece.fromX = this.finger.x; piece.fromY = this.finger.y
    this.hand = piece
    this.origin = origin
    if (sound) this.sounds.push(...voices.pickUp(piece.len))
  }

  private across(x: number): number {
    return Math.round(clamp((x - this.vaseDef.x) / this.vaseDef.halfMouth, -1, 1) * 10)
  }

  /** Into the vase. It is there from this moment; the eye sees it arrive. A vase it tips too far goes over. */
  private stand(piece: Piece, at: number, index: number): void {
    piece.where = 'vase'
    piece.at = at
    this.begin(piece, 'toVase', 0.3)
    this.vase.splice(Math.min(index, this.vase.length), 0, piece)
    this.changed('now')
    this.weigh()
  }

  /** The load of the vase has changed, by a piece stood in it, drawn out of it or cut short in it: past what it stands, it goes over now. */
  private weigh(): void {
    const over = tipping(arrange(this.vase, this.vaseDef), this.vaseDef).over
    if (over !== 0) this.goOver(over)
  }

  /** Down onto the path. `byChild`: the child let it fall there, so a thistle may stick upright; the game sets a piece down flat. */
  private drop(piece: Piece, x: number, byChild: boolean, y: number = PATH.bottom): void {
    const lie = this.lieAt(x, piece, byChild, y)
    this.fall(piece, lie.x, lie.y, lie.rot)
    this.changed('now')
  }

  private layBack(piece: Piece, origin: { x: number; y: number; rot: number; from: string; index?: number }): void {
    if (origin.from === 'path') {
      // Back where it lay, in its old place among the others, with no landing of its own.
      piece.where = 'path'; piece.x = origin.x; piece.y = origin.y; piece.rot = origin.rot; piece.move = null
      this.path.splice(Math.min(origin.index ?? this.path.length, this.path.length), 0, piece)
      this.changed('soon')
      return
    }
    this.fall(piece, origin.x, origin.y, origin.rot)
    this.changed('now')
  }

  /** It lies on the path from this moment, and a poppy's petals are off; the eye sees it fall. */
  private fall(piece: Piece, x: number, y: number, rot: number): void {
    piece.where = 'path'
    piece.x = x; piece.y = y; piece.rot = rot
    if (piece.kind === 'poppy' && piece.head) piece.spent = true
    const far = Math.max(0, y - piece.py)
    this.begin(piece, 'fall', clamp(0.2 + far / 1500, 0.2, 0.55) * (piece.kind === 'dandelion' ? 2.3 : 1))
    this.startle(piece)
    this.path.push(piece)
    this.trim()
  }

  /** A flower is dropped or handed over: its bee lifts off, zigzags with a buzz and settles on it again. */
  private startle(piece: Piece, heard = true): void {
    if (!piece.head || piece.noBee || !PLANTS[piece.kind].bee) return
    piece.lift = 0.8
    if (heard) this.sounds.push(...voices.buzz)
  }

  private lying(): Lying[] {
    return this.path.map((piece) => ({ x: piece.x, y: piece.y, rot: piece.rot, len: piece.len }))
  }

  /** Where a piece let go over `x` comes to lie: the nearest free place of the path (place.ts). */
  private lieAt(x: number, piece: { kind: Kind; scale: number; len: number; head: boolean }, byChild: boolean, y: number = PATH.bottom): { x: number; y: number; rot: number } {
    const others = this.lying()
    const tilt = (this.rules.next() - 0.5) * 0.04
    const toRight = this.rules.next() < 0.5
    // A thistle the child lets go over the bed, between two stems with room beside it, sticks upright in the earth there.
    if (piece.kind === 'thistle' && byChild && overBed(y)) {
      const slot = uprightPlace(x, others)
      if (slot !== null) return { x: slot, y: EARTH.top + Math.round(this.rules.next() * (EARTH.bottom - EARTH.top)), rot: Math.round(tilt * 100) / 100 }
    }
    return flatPlace(x, piece, others, toRight, tilt)
  }

  /** The path holds sixteen. A piece saved there from the hand counts, so the oldest goes to the robin before a seventeenth can lie. */
  private makeRoom(): void {
    while (this.path.length + 1 > PATH_HOLDS) this.sendOff(this.path[0])
  }

  private trim(): void {
    while (this.path.length > PATH_HOLDS) this.sendOff(this.path[0])
  }

  /** The robin will come for it: it is out of the save from this moment, and lies where it is until the robin has it. */
  private sendOff(piece: Piece): void {
    this.path.splice(this.path.indexOf(piece), 1)
    piece.where = 'robin'
    if (piece.move === 'wait') piece.move = null
    this.leaving.push(piece)
    this.changed('now')
  }

  // --- The vase in the finger --------------------------------------------------

  private noBlades(): void {
    this.used = true
    this.poking = true
    this.scissors.seen = 0
  }

  private holdPot(x: number, y: number): void {
    this.noBlades()
    const pot = this.pot
    pot.held = true; pot.back = 0
    pot.grabX = x - pot.dx; pot.grabY = y - pot.dy
    this.sounds.push(...voices.potLift)
  }

  /** The vase is let go: at the visitor it is handed over, and short of it the vase slides back to its place with every piece as it stood. */
  private letPotGo(x: number, y: number): void {
    const pot = this.pot
    pot.held = false
    const moved = Math.hypot(pot.dx, pot.dy) > 14
    // Half of the way counts, measured to the visitor's far shoulder: it stands close, and a nudge is no handing over.
    const toVisitor = moved && progressToward({ x: pot.grabX, y: pot.grabY }, { x, y }, { x: VISITOR.x + 44, y: VISITOR.y + 80 }) >= COUNTS_FROM
    if (toVisitor && this.vase.length > 0) return this.handOver()
    if (toVisitor) this.poke()
    this.slidePotBack(moved)
  }

  private slidePotBack(heard: boolean): void {
    const pot = this.pot
    pot.held = false
    pot.back = 1; pot.fromDx = pot.dx; pot.fromDy = pot.dy
    if (heard) this.sounds.push(...voices.slideBack)
  }

  // --- The creatures -----------------------------------------------------------

  private actNow(actor: Actor, name: ActName, plant: Kind | null = null): void {
    actor.act = { name, plant, u: 0 }
    actor.timed = true
    actor.actT = 0
    actor.actDur = lasts(actor.who, name)
  }

  /** A finger on the visitor at the table with nothing in its vase: its own answer, and nothing else changes. */
  private poke(): void {
    this.noBlades()
    const actor = this.actors[this.turn.visitor]
    this.actNow(actor, 'poke')
    this.goat.perk = 1
    this.sounds.push(...voices.pokeVoice(actor.who))
  }

  /** A finger on the one who waits while the other is still at the table: a small lift of its vase. */
  private pokeGate(): void {
    this.noBlades()
    const actor = this.actors[this.next.visitor]
    this.actNow(actor, 'lift')
    this.sounds.push(...voices.gateLift(actor.who))
  }

  private pokeCat(): void {
    this.noBlades()
    this.cat.poke = 0.7
    this.cat.eye = 1.6
    this.sounds.push(...voices.mrrp)
  }

  private pokeRobin(): void {
    this.noBlades()
    this.robin.hop = 0.35
    this.robin.turn = -this.robin.turn
    this.sounds.push(...voices.tsip)
  }

  /**
   * A piece is let go on the visitor: the last column of the grid plays, in this visitor's manner. The piece lies
   * at the visitor's feet from this moment, as it then is (a poppy without petals, a bald dandelion, an onion
   * flower with its head bitten off); the eye sees it there when the cell has played.
   */
  private dropOn(piece: Piece): void {
    const actor = this.actors[this.turn.visitor]
    if (!piece.head || piece.spent) {
      // A bare stalk or a spent flower has no cell: the visitor starts, and it drops.
      this.drop(piece, VISITOR.x - 40, false)
      this.actNow(actor, 'poke')
      this.sounds.push(...voices.pokeVoice(actor.who))
      return
    }
    const kind = piece.kind
    this.actNow(actor, 'drop', kind)
    this.sounds.push(...voices.dropped(kind))
    // Its petals stay on the eyelids and its fluff is blown off the nose: it is seen bare when it drops.
    if (kind === 'poppy' || kind === 'dandelion') { piece.spent = true; piece.shownSpent = true }
    if (kind === 'onion') {
      piece.len = Math.max(MIN_PIECE, piece.len - headOf(piece.stem))
      piece.head = false
    }
    const lie = this.lieAt(VISITOR.x - 30 - this.rules.next() * 60, piece, false)
    piece.where = 'path'
    piece.x = lie.x; piece.y = lie.y; piece.rot = lie.rot
    // It is on the visitor until the cell has played, and then it falls from there.
    piece.move = 'wait'; piece.t = 0; piece.dur = actor.actDur * 0.78
    piece.px = VISITOR.x - 20; piece.py = RIG[actor.who].headY + 60; piece.prot = 0
    this.path.push(piece)
    this.trim()
    this.changed('now')
    // What is seen of two of the cells a moment in: the long green breath after the bite, and the seeds that sail off over the wall.
    const who = actor.who, noseX = VISITOR.x - 30 + RIG[who].nose.x, noseY = RIG[who].headY + RIG[who].nose.y
    if (kind === 'onion') this.soon.push({ at: this.time + actor.actDur * 0.55, run: () => { for (let i = 0; i < 5; i++) this.bit('haze', noseX - 10 - i * 22, noseY + 24 - i * 5, -70 - i * 14, -10, 1.7, 20 + i * 4, NO_FLOOR) } })
    if (kind === 'dandelion') this.soon.push({ at: this.time + actor.actDur * 0.5, run: () => { for (let i = 0; i < 12; i++) this.bit('fluff', noseX - 6, noseY - 6, -90 - this.life.next() * 150, -150 - this.life.next() * 140, 2.6, 7, NO_FLOOR) } })
  }

  // --- The scenes --------------------------------------------------------------

  private endScene(): void {
    this.scene?.finish()
    this.scene = null
  }

  private play(beats: Beat[], outcome: () => void): void {
    this.endScene()
    const scene = new Scene(beats)
    scene.start(this.time, () => { outcome(); this.dirty = 'now' })
    this.scene = scene
  }

  private heard(finishing: boolean, ...notes: Note[]): void {
    if (!finishing) this.sounds.push(...notes)
  }

  /** The sniff, or a gasp, draws the fluff of each dandelion in the bouquet up the visitor's nose. Seen only. */
  private drawIn(finishing: boolean, actor: Actor): void {
    if (finishing) return
    const who = actor.who, noseX = actor.x - 30 + RIG[who].nose.x, noseY = RIG[who].headY + RIG[who].nose.y
    for (const piece of this.carried ?? []) {
      if (piece.kind !== 'dandelion' || !piece.head || piece.shownSpent) continue
      const tip = this.tipOf(piece, this.standingOf(piece)), from = this.potPoint(tip.x, tip.y - 14)
      for (let i = 0; i < 4; i++) this.bit('fluff', from.x + (i - 1.5) * 6, from.y, (noseX - from.x) / 0.32, (noseY - from.y) / 0.32 + (i - 1.5) * 20, 0.32 + i * 0.03, 7, NO_FLOOR)
    }
  }

  /** What the bouquet in the visitor's hands shows of a sneeze: every dandelion bald, and its fluff in the air. */
  private blowBald(finishing: boolean, actor: Actor): void {
    for (const piece of this.carried ?? []) if (piece.kind === 'dandelion' && piece.head) { piece.spent = true; piece.shownSpent = true }
    if (!finishing) for (let i = 0; i < 9; i++) this.bit('fluff', actor.x - 70 + this.life.next() * 50, RIG[actor.who].headY + 40, -30 - this.life.next() * 90, -40 - this.life.next() * 70, 2, 7, NO_FLOOR)
  }

  /** What is out in the street is now seen there, and no longer in the vase. */
  private showStreet(): void {
    this.carried = null
    if (this.streetSeen !== this.street) { this.streetSeen = this.street; this.streetVersion++ }
  }

  /**
   * The handing over, the ending of a turn: the visitor takes the vase up and sniffs; the first three kinds of
   * plant answer the sniff; the visitor gives its own answer to the whole bouquet; and it carries the bouquet
   * out through the gate. Everything it leaves behind is saved as it starts.
   */
  private handOver(): void {
    this.noBlades()
    const who = this.turn.visitor, actor = this.actors[who], vase = this.vaseDef, pot = this.pot
    const pieces = [...this.vase]
    const v = verdict(who, pieces, arrange(pieces, vase), vase)
    const kept: InVase[] = v.keeps.map((index) => ({ ...strip(pieces[index]), spent: pieces[index].spent || (v.bald && pieces[index].kind === 'dandelion' && pieces[index].head), at: pieces[index].at }))
    // A sniff that is the visitor's own answer is played once, as that answer: the bride's sneeze, the aunt's laugh.
    const own = (kind: Kind): boolean => (who === 'bride' && kind === 'dandelion' && v.answers.includes('cannot')) || (who === 'aunt' && v.answers.includes('laugh') && (kind === 'thistle' || kind === 'dandelion'))
    const meals = who === 'goat' ? pieces.length - 1 : 0
    // A bouquet of one piece is the piece it keeps: it crunches at it all the same, a crisp for a thistle, celery for a stalk.
    const nibble = who === 'goat' && meals === 0 && pieces[0] ? voices.eaten(pieces[0].kind, pieces[0].head && !pieces[0].spent) : null
    type Step = { name: ActName; plant: Kind | null; secs: number }
    const steps: Step[] = [{ name: 'take', plant: null, secs: lasts(who, 'take') }]
    for (const kind of v.sniffs) if (!own(kind)) steps.push({ name: 'sniff', plant: kind, secs: lasts(who, 'sniff') })
    if (meals > 0) steps.push({ name: 'eat', plant: null, secs: 0.3 + 0.42 * meals })
    for (const answer of v.answers) if (!(answer === 'plain' && meals > 0)) steps.push({ name: answer, plant: null, secs: lasts(who, answer) })
    steps.push({ name: 'leave', plant: null, secs: lasts(who, 'leave') })
    // The ending is 6 to 10 seconds whatever the bouquet.
    const total = steps.reduce((sum, step) => sum + step.secs, 0)
    const pace = total < 6 ? 6 / total : total > 10 ? 10 / total : 1
    const fromDx = pot.dx, fromDy = pot.dy
    // The piece the aunt will put right: the first whose head tips, or else the one that leans out widest.
    const stances = arrange(pieces, vase)
    const tipped = stances.findIndex((stance) => stance.droop !== 0)
    const widest = stances.reduce((best, stance, index) => (Math.abs(stance.lean) > Math.abs(stances[best].lean) ? index : best), 0)
    const untidiest: Piece | undefined = pieces[tipped >= 0 ? tipped : widest]
    let at = 0, eaten = 0
    const beats: Beat[] = steps.map((step) => {
      const cue = cues(), start = at, secs = step.secs * pace
      at += secs
      return {
        at: start, lasts: secs, play: (u, finishing) => {
          actor.timed = false
          actor.act = u < 1 ? { name: step.name, plant: step.plant, u, flag: v.neat } : null
          const once = (when: number): boolean => cue(when, u)
          switch (step.name) {
            case 'take': {
              const e = smooth(clamp(u / 0.55, 0, 1))
              pot.dx = lerp(fromDx, TAKEN.dx, e); pot.dy = lerp(fromDy, TAKEN.dy, e)
              // Handed over: each bee of the bouquet lifts off its flower and settles again.
              if (once(0.05) && !finishing) { let buzzed = false; for (const piece of this.carried ?? []) { this.startle(piece, !buzzed); buzzed ||= piece.lift > 0 } }
              if (once(0.6)) this.heard(finishing, ...voices.sniff)
              break
            }
            case 'sniff': this.sniffCell(step.plant!, actor, once, finishing); break
            case 'eat': {
              // Last in, first eaten, all but the first piece that was put in.
              const gone = Math.min(meals, Math.floor(u * meals + 1e-9))
              while (eaten < gone && this.carried && this.carried.length > 1) {
                const piece = this.carried.pop()!
                eaten++
                this.heard(finishing, ...voices.eaten(piece.kind, piece.head && !piece.spent))
                if (!finishing) this.goat.lick = 0.56
              }
              break
            }
            case 'leave': {
              if (once(0)) {
                this.heard(finishing, ...voices.steps(who))
                // The goat's one piece goes behind its horn as it turns to go.
                if (who === 'goat') this.showStreet()
              }
              // The bride tips her bouquet onto her head: the vase goes up and over, and the crown is on.
              const tips = who === 'bride' && u < 0.24 ? Math.sin((u / 0.24) * Math.PI) : 0
              if (who === 'bride' && once(0.12)) this.showStreet()
              actor.x = lerp(VISITOR.x, WAITING.x + 6, u)
              actor.feetY = lerp(FLOOR_Y, WAITING.feetY - 8, u)
              actor.scale = lerp(1, 0.5, u)
              actor.alpha = 1 - clamp((u - 0.8) / 0.2, 0, 1)
              pot.scale = actor.scale
              pot.dx = actor.x - (VISITOR.x - vase.x - TAKEN.dx) * actor.scale - vase.x
              pot.dy = actor.feetY - (FLOOR_Y - TABLE.top - TAKEN.dy) * actor.scale - TABLE.top
              pot.dx += tips * 56; pot.dy -= tips * 150; pot.tilt = tips * 2.3
              if (u >= 1) {
                // The aunt stands it on the table at her window and squares it to the edge.
                if (who === 'aunt' && !finishing) { this.squaring = 0.7; this.sounds.push(...voices.squareUp) }
                // Out in the street with it, and the table is bare.
                this.showStreet()
                this.place(actor, 'street')
                // What this turn left on it ends with the turn: the bees that moved into the hat, a bun shaken loose.
                actor.hatBees = 0; actor.loose = false
                actor.alpha = 1
                pot.on = false; pot.dx = pot.dy = pot.tilt = 0; pot.scale = 1
              }
              break
            }
            default: {
              if (step.name === 'cannot' && who === 'beekeeper') {
                // She turns it round, holds it to her ear and shakes it.
                const up = smooth(clamp((u - 0.3) / 0.15, 0, 1)) * (1 - smooth(clamp((u - 0.86) / 0.14, 0, 1)))
                const shake = u > 0.45 && u < 0.86 ? Math.sin(u * 150) * 5 : 0
                pot.tilt = Math.sin(clamp(u / 0.3, 0, 1) * TAU) * 0.5 * (1 - up) + up
                pot.dx = lerp(TAKEN.dx, VISITOR.x - 50 - Math.sin(1) * vase.tall - vase.x, up) + shake
                pot.dy = lerp(TAKEN.dy, RIG[who].headY + 10 + Math.cos(1) * vase.tall - TABLE.top, up)
              }
              if (step.name === 'cannot' && who === 'aunt') {
                // One fingertip stands the worst piece straight, and it sinks back as she lets go.
                const amount = smooth(clamp((u - 0.3) / 0.15, 0, 1)) * (1 - smooth(clamp((u - 0.62) / 0.18, 0, 1)))
                this.mend = u < 1 && untidiest ? { piece: untidiest, amount } : null
              }
              if (nibble && (step.name === 'loves' || step.name === 'stalks') && once(0.02)) { this.heard(finishing, ...nibble); if (!finishing) this.goat.lick = 0.56 }
              this.answer(step.name as Answer, actor, v.bees, v.neat, once, finishing)
            }
          }
        },
      }
    })
    this.play(beats, () => {
      this.finished = true
      this.vase = []
      this.street = [...this.street.filter((bouquet) => bouquet.who !== who), { who, pieces: kept }]
      if (!this.shown.includes('hand-over')) this.shown.push('hand-over')
      this.carried = pieces
      pot.held = false; pot.back = 0
    })
  }

  /** A flower answers the sniff: its cell of the grid. The pose is the visitor's (acting.ts); here are its sound and what flies. */
  private sniffCell(kind: Kind, actor: Actor, once: (when: number) => boolean, finishing: boolean): void {
    const who = actor.who, noseX = actor.x - 30 + RIG[who].nose.x, noseY = RIG[who].headY + RIG[who].nose.y
    switch (kind) {
      case 'sunflower': if (once(0.28)) { actor.yellow = true; this.heard(finishing, ...voices.sniffed(kind, who)) } break
      case 'poppy': if (once(0.45)) { this.heard(finishing, ...voices.sniffed(kind, who)); if (!finishing) this.bit('petal', noseX, noseY, -20, -230, 1.5, 15, FLOOR_Y) } break
      case 'onion':
        if (once(0.15)) this.heard(finishing, ...voices.sniffed(kind, who))
        if (once(0.52) && !finishing) for (const side of [-1, 1]) for (let i = 0; i < 4; i++) this.bit('drop', noseX + side * 30, noseY - 50, side * (150 + i * 40), -60 - i * 20, 0.8, 7, FLOOR_Y)
        break
      case 'thistle': if (once(0.3)) this.heard(finishing, ...voices.sniffed(kind, who)); break
      case 'ivy': if (once(0.72)) this.heard(finishing, ...voices.sniffed(kind, who)); break
      case 'dandelion':
        if (once(0.25)) { this.heard(finishing, ...voices.sniffed(kind, who)); this.drawIn(finishing, actor) }
        if (once(0.55)) this.blowBald(finishing, actor)
        break
    }
  }

  /** The visitor's own answer to the whole bouquet: its sound, its marks and what flies. The pose is in acting.ts. */
  private answer(name: Answer, actor: Actor, bees: number, neat: boolean, once: (when: number) => boolean, finishing: boolean): void {
    const who = actor.who, headY = RIG[who].headY
    if (name === 'plain') { if (once(0.1)) this.heard(finishing, ...voices.plain); return }
    if (name === 'unveil') { if (once(0.25)) this.heard(finishing, ...voices.peep); return }
    if (name === 'laugh') {
      if (once(0.05)) this.heard(finishing, ...voices.sniffed('thistle', who))
      if (once(0.22)) { this.heard(finishing, ...voices.sneeze(who)); this.drawIn(finishing, actor) }
      if (once(0.36)) { this.blowBald(finishing, actor); actor.loose = true }
      if (once(0.52)) this.heard(finishing, ...voices.laugh)
      return
    }
    switch (who) {
      case 'goat':
        if (name === 'cannot') {
          // Its eyes run and its breath comes out green.
          if (once(0.1) && !finishing) for (let i = 0; i < 3; i++) this.bit('haze', actor.x - 40 - i * 26, headY + 96 - i * 8, -40, -14, 1.6, 26, NO_FLOOR)
          if (once(0.55)) this.heard(finishing, ...voices.crackedBleat)
        } else if (once(0.1)) this.heard(finishing, ...voices.relish)
        break
      case 'beekeeper':
        if (name === 'loves') {
          if (once(0.05)) {
            // Each bee moves into her hat with its own hummed note.
            actor.hatBees = Math.min(7, actor.hatBees + bees)
            for (const piece of this.carried ?? []) piece.noBee = true
            for (let i = 0; i < bees; i++) this.heard(finishing, ...voices.later(voices.humNote(i), i * 0.11))
          }
          if (bees >= 3 && once(0.6)) this.heard(finishing, ...voices.humChord)
        } else if (name === 'cannot') {
          if (once(0.5)) this.heard(finishing, ...voices.rattle)
          if (once(0.8)) { actor.sag = 4; this.heard(finishing, ...voices.sag) }
        } else if (once(0.15)) this.heard(finishing, ...voices.glass)
        break
      case 'bride':
        if (name === 'loves') {
          if (once(0.1)) {
            this.heard(finishing, ...voices.swirl)
            if (!finishing) for (let i = 0; i < 12; i++) this.bit('petal', actor.x - 70 + this.life.next() * 140, headY - 120 - this.life.next() * 60, (this.life.next() - 0.5) * 60, 30, 2.2, 15, FLOOR_Y)
          }
        } else if (name === 'cannot') {
          if (once(0.18)) { this.heard(finishing, ...voices.sneeze(who)); this.drawIn(finishing, actor) }
          if (once(0.36)) this.blowBald(finishing, actor)
        } else if (once(0.1)) this.heard(finishing, ...voices.proud)
        break
      case 'aunt':
        if (name === 'loves') { if (once(0.3)) { actor.loose = false; this.heard(finishing, ...voices.nod, ...voices.later(voices.squeak, 0.12)) } }
        else if (name === 'cannot') { if (once(0.08)) this.heard(finishing, ...voices.brow); if (once(0.3)) this.heard(finishing, ...voices.sinkBack) }
        else { if (once(0.05)) this.heard(finishing, ...voices.tick); if (neat && once(0.78)) this.heard(finishing, ...voices.nod) }
        break
    }
  }

  /**
   * Coming in: the one who waited walks to the table and sets its vase down, every cut stalk grows back from the
   * window end, and the next of the ring steps into the gateway. Saved as it starts: the turn is one on, the bed
   * is whole, and this visitor's old bouquet is gone from the street.
   */
  private comeIn(): void {
    this.noBlades()
    const who = this.next.visitor, actor = this.actors[who], pot = this.pot
    const cut = this.stems.filter((stem) => stem.height < stem.full)
    const hold = gateHold(who)
    let newcomer = actor
    let vase = this.vaseDef
    const walk = cues(), grow = cues(), step = cues()
    const beats: Beat[] = [
      {
        at: 0, lasts: 1.6, play: (u, finishing) => {
          if (walk(0, u)) this.heard(finishing, ...voices.steps(who))
          const e = smooth(u)
          actor.timed = false
          actor.act = u < 1 ? { name: 'walk', plant: null, u } : null
          actor.where = 'table'
          actor.x = lerp(WAITING.x, VISITOR.x, e); actor.feetY = lerp(WAITING.feetY, FLOOR_Y, e); actor.scale = lerp(WAITING.scale, 1, e)
          pot.dx = lerp(hold.x - vase.x, 0, e); pot.dy = lerp(hold.y - TABLE.top, 0, e); pot.scale = lerp(WAITING.scale, 1, e)
          // It sets the empty vase down with that vase's own knock.
          if (walk(1, u)) this.heard(finishing, ...voices.setDown(vase.id))
        },
      },
      {
        at: 2, lasts: cut.length * 0.12 + 0.05, play: (u, finishing) => {
          const reached = u >= 1 ? cut.length : Math.floor((u * (cut.length * 0.12 + 0.05)) / 0.12) + 1
          cut.forEach((stem, index) => {
            if (index >= reached || !grow(index, index)) return
            stem.hold = false
            if (finishing) { stem.grow = 1; return }
            this.sounds.push(...voices.growBack)
          })
        },
      },
      {
        at: 3.2, lasts: 0.8, play: (u, finishing) => {
          if (step(0, u)) this.heard(finishing, ...voices.gateLift(newcomer.who))
          newcomer.timed = false
          newcomer.act = u < 1 ? { name: 'walk', plant: null, u } : null
          this.place(newcomer, 'gate')
          newcomer.x = lerp(WAITING.x + 90, WAITING.x, smooth(u))
          newcomer.alpha = clamp(u * 2.5, 0, 1)
        },
      },
    ]
    this.play(beats, () => {
      this.position = nextPosition(this.position)
      this.finished = false
      this.vase = []
      for (const stem of cut) { stem.grewFrom = stem.height; stem.height = stem.full; stem.grow = 0; stem.hold = true; stem.sap = 0 }
      // It gave its old bouquet up as it came in.
      this.street = this.street.filter((bouquet) => bouquet.who !== who)
      this.showStreet()
      this.streetVersion++
      actor.yellow = false
      vase = this.vaseDef
      pot.id = vase.id; pot.on = true; pot.tilt = 0; pot.rock = 0; pot.held = false; pot.back = 0
      newcomer = this.actors[this.next.visitor]
      newcomer.where = 'away'
    })
  }

  /** The reach, once ever: the visitor lifts the vase a hand's width, sniffs at it once and sets it back. */
  private showReach(): void {
    const actor = this.actors[this.turn.visitor], pot = this.pot
    const cue = cues()
    this.play([{
      at: 0, lasts: lasts(actor.who, 'reach'), play: (u, finishing) => {
        actor.timed = false
        actor.act = u < 1 ? { name: 'reach', plant: null, u } : null
        const up = u < 1 ? Math.min(clamp(u / 0.3, 0, 1), clamp((1 - u) / 0.3, 0, 1)) : 0
        pot.dx = 22 * smooth(up); pot.dy = 0 - 26 * smooth(up)
        if (cue(0.45, u)) this.heard(finishing, ...voices.sniffOnce)
        if (cue(1, u)) this.heard(finishing, ...voices.setDown(pot.id))
      },
    }], () => { this.shown.push('hand-over') })
  }

  /**
   * The vase goes over, to the side with too many tipped heads. Saved as it starts: the vase is empty and every
   * spilled piece lies on the path where it will lie, each as it was; the robins take what is over sixteen.
   */
  private goOver(side: -1 | 1): void {
    const pieces = [...this.vase], vase = this.vaseDef, pot = this.pot
    const actor = this.actors[this.turn.visitor]
    const lean = cues(), up = cues()
    const release = (finishing: boolean): void => {
      let buzzed = false
      this.carried = null
      for (const piece of pieces) {
        if (piece.move !== 'wait') continue
        if (finishing) { piece.move = null; continue }
        const at = this.potPoint(piece.px, piece.py)
        piece.px = at.x; piece.py = at.y; piece.prot += pot.tilt
        this.begin(piece, 'fall', 0.34)
        // Spilled is dropped: each bee flies, and one buzz is heard for them all.
        this.startle(piece, !buzzed)
        buzzed ||= piece.lift > 0
      }
    }
    const beats: Beat[] = [
      {
        at: 0.35, lasts: 0.45, play: (u, finishing) => {
          pot.tilt = side * 1.5 * u * u
          if (!lean(1, u)) return
          release(finishing)
          if (finishing) return
          this.sounds.push(...voices.clonk(vase.id), ...voices.later(voices.water, 0.1))
          this.puddle = { x: vase.x + side * (vase.tall + 30), side, u: 0 }
          for (let i = 0; i < 8; i++) this.bit('drop', vase.x + side * (vase.tall + 10), TABLE.top - 20, side * (60 + this.life.next() * 160), -80 - this.life.next() * 90, 0.9, 8, TABLE.top + 2)
          // It drips off the table to the ground on that side.
          for (let i = 0; i < 6; i++) this.soon.push({ at: this.time + 0.2 + i * 0.09, run: () => this.bit('drop', vase.x + side * (vase.tall + 60 + this.life.next() * 50), TABLE.top + 12, side * this.life.next() * 30, 20, 0.7, 7, TABLE.bottom + 4) })
        },
      },
      { at: 0.8, lasts: 1.5, play: (u) => { if (this.puddle) this.puddle.u = u; if (u >= 1) this.puddle = null } },
      // It steps back and looks until the water has gone, and its hands are on the vase until it stands.
      { at: 0.6, lasts: 2.4, play: (u) => { actor.timed = false; actor.act = u < 1 ? { name: 'stepBack', plant: null, u } : null } },
      {
        at: 2.3, lasts: 0.7, play: (u, finishing) => {
          pot.tilt = side * 1.5 * (1 - smooth(u))
          if (up(1, u)) this.heard(finishing, ...voices.setDown(vase.id))
        },
      },
    ]
    this.play(beats, () => {
      this.vase = []
      pieces.forEach((piece, index) => {
        const lie = this.lieAt(vase.x + side * (vase.tall + 20 + index * 24), piece, false)
        piece.where = 'path'
        piece.x = lie.x; piece.y = lie.y; piece.rot = lie.rot
        piece.move = 'wait'; piece.t = 0; piece.dur = Infinity
        this.path.push(piece)
      })
      this.trim()
      this.carried = pieces
      pot.rock = 0
    })
  }

  /** A point of the vase at its place on the table, where the vase as it is drawn now has it. */
  potPoint(x: number, y: number): { x: number; y: number } {
    const pot = this.potAt, vase = this.vaseDef
    const cos = Math.cos(pot.tilt), sin = Math.sin(pot.tilt)
    const rx = (x - vase.x) * pot.scale, ry = (y - TABLE.top) * pot.scale
    return { x: vase.x + pot.dx + rx * cos - ry * sin, y: TABLE.top + pot.dy + rx * sin + ry * cos }
  }

  /** Where the vase is drawn: where a hand or a scene has it, and, while it is empty, held out to the child by the visitor in its own way. */
  get potAt(): { dx: number; dy: number; tilt: number; scale: number } {
    const pot = this.pot, who = this.turn.visitor, out = this.actors[who].present, way = HOLDS_OUT[who]
    return { dx: pot.dx + way.dx * out, dy: pot.dy + (way.dy + Math.sin(this.time * way.pace) * way.bob) * out, tilt: pot.tilt + way.tilt * out, scale: pot.scale }
  }

  /** The visitor wears what it carried off: the goat its one piece behind a horn, the bride her bouquet as a crown. */
  wears(who: VisitorId): boolean {
    return (who === 'goat' || who === 'bride') && this.streetSeen.some((bouquet) => bouquet.who === who)
  }

  // --- Time ------------------------------------------------------------------

  /** One step of game time, in seconds. */
  step(dt: number): void {
    if (dt <= 0) { this.pose(); return }
    this.time += dt
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.scene = null
    }
    const finger = this.finger
    finger.vx = lerp(finger.vx, (finger.x - finger.lastX) / dt, clamp(dt * 14, 0, 1))
    finger.lastX = finger.x

    const scissors = this.scissors
    const open = finger.down && !this.used ? 1 : 0
    scissors.open += (open - scissors.open) * clamp(dt * 26, 0, 1)
    scissors.snap = Math.max(0, scissors.snap - dt * 5)
    scissors.seen = this.poking ? 0 : finger.down ? 1 : Math.max(0, scissors.seen - dt * 4.5)

    const pot = this.pot
    if (pot.back > 0) {
      pot.back = Math.max(0, pot.back - dt / 0.3)
      const left = 1 - smooth(1 - pot.back)
      pot.dx = pot.fromDx * left + 0; pot.dy = pot.fromDy * left + 0
    }
    pot.rock = Math.max(0, pot.rock - dt)

    // The one wait in the game: a few seconds of attended time without a touch, counted from the load.
    if (finger.down || this.busy) this.quiet = 0
    else this.quiet += dt
    if (this.quiet >= REACH_AFTER && !this.finished && pot.on && this.vase.length > 0 && !this.shown.includes('hand-over')) this.showReach()

    for (const stem of this.stems) {
      if (stem.grow < 1 && !stem.hold) stem.grow = Math.min(1, stem.grow + dt / 0.5)
      stem.swayV += (-stem.sway * 260 - stem.swayV * 9) * dt
      stem.sway += stem.swayV * dt
      stem.sap = Math.max(0, stem.sap - dt)
      stem.lift = Math.max(0, stem.lift - dt)
    }

    // What a scene has in the vase is still a bouquet in time: its bees settle, its tendrils creep.
    for (const piece of new Set([...this.inPot, ...this.vase, ...this.path])) this.advance(piece, dt)
    this.squaring = Math.max(0, this.squaring - dt)
    const hand = this.hand
    if (hand) {
      hand.lift = Math.max(0, hand.lift - dt)
      // In the hand it leans back against the way the finger moves, and the head arrives late and swings through.
      const way = IN_HAND[hand.kind]
      const want = clamp(-finger.vx * way.lag, -0.85, 0.85)
      this.swing += ((want - hand.prot) * way.spring - this.swing * way.damp) * dt
      hand.prot += this.swing * dt
      this.bob = Math.max(0, this.bob - dt)
    } else { this.swing = 0; this.bob = 0 }
    // What a cell does a moment after it starts.
    if (this.soon.length) {
      const due = this.soon.filter((each) => each.at <= this.time)
      this.soon = this.soon.filter((each) => each.at > this.time)
      for (const each of due) each.run()
    }

    this.stepActors(dt)
    this.stepCreatures(dt)
    this.stepRobin(dt)
    this.stepBits(dt)
    this.pose()
  }

  private begin(piece: Piece, move: Piece['move'], dur: number): void {
    piece.move = move
    piece.t = 0
    piece.dur = dur
    piece.fromX = piece.px; piece.fromY = piece.py; piece.fromRot = piece.prot
  }

  private advance(piece: Piece, dt: number): void {
    piece.lift = Math.max(0, piece.lift - dt)
    piece.joltT = Math.max(0, piece.joltT - dt)
    if (piece.where === 'vase' && piece.kind === 'ivy' && piece.move !== 'toVase') piece.creep = Math.min(1, piece.creep + dt / 1.3)
    if (!piece.move) return
    piece.t += dt
    if (piece.t < piece.dur) return
    if (piece.move === 'fall') { piece.hop = 0; this.landed(piece) }
    else if (piece.move === 'toVase') this.stood(piece)
    // What a visitor wore or held drops from it now.
    else if (piece.move === 'wait') { this.begin(piece, 'fall', 0.4); this.startle(piece) }
    else piece.move = null
  }

  /** The piece reaches the path: its plant's own landing. */
  private landed(piece: Piece): void {
    this.begin(piece, 'landed', piece.kind === 'onion' ? 0.75 : 0.6)
    // A poppy that the fall cost its petals sheds them now; one that was spilled keeps them, and one already bare only rattles.
    const sheds = piece.kind === 'poppy' && piece.head && piece.spent && !piece.shownSpent
    this.sounds.push(...voices.landing(piece.kind, piece.kind !== 'poppy' || !piece.head || sheds ? 'own' : piece.spent ? 'bare' : 'whole'))
    const side = Math.sin(piece.rot) >= 0 ? 1 : -1
    const tipX = piece.x + Math.sin(piece.rot) * piece.len, tipY = piece.y - Math.cos(piece.rot) * piece.len
    if (piece.kind === 'sunflower' && piece.head) for (let i = 0; i < 3; i++) this.bit('seed', tipX, tipY - 6, side * (70 + this.life.next() * 120) * (i === 1 ? -0.6 : 1), -60 - this.life.next() * 60, 0.9, 5, piece.y + 4)
    if (sheds) {
      piece.shownSpent = true
      for (let i = 0; i < 5; i++) this.bit('petal', tipX, tipY - 4, (this.life.next() - 0.5) * 260, -70 - this.life.next() * 110, 1.3, 15, piece.y + 6)
    }
    if (piece.kind === 'dandelion' && piece.head && !piece.shownSpent && !piece.spent) for (let i = 0; i < 5; i++) this.bit('fluff', tipX, tipY, (this.life.next() - 0.5) * 70, -30 - this.life.next() * 45, 1.8, 7, NO_FLOOR)
    piece.shownSpent = piece.spent
    this.glance(piece.x, piece.y)
  }

  /** The visitor at the table looks at what has just happened there. */
  private glance(x: number, y: number): void {
    const actor = this.actors[this.turn.visitor]
    actor.lookX = x; actor.lookY = y
    this.glanceT = 1.2
  }
  private glanceT = 0

  /** The piece is down in the vase: its plant's own way of standing there, and the others feel it arrive. */
  private stood(piece: Piece): void {
    this.begin(piece, 'stood', piece.kind === 'sunflower' ? 0.7 : 0.5)
    const vase = this.vaseDef
    const notes: Note[] = [...voices.intoVase(vase.id, this.vase.length), ...voices.standing(piece.kind)]
    if (this.standingOf(piece).sink < vase.depth) notes.push(...voices.later(voices.tonk, 0.02))
    const petal = (poppy: Piece): void => {
      const tip = this.tipOf(poppy, this.standingOf(poppy))
      this.bit('petal', tip.x, tip.y, (this.life.next() - 0.5) * 50, 20, 1.6, 15, TABLE.top - 4)
    }
    let pats = 0
    for (const other of this.vase) {
      if (other === piece) continue
      // A thistle stands stiff and straight, whatever leans on it.
      if (other.kind !== 'thistle') { other.jolt = (other.kind === 'dandelion' ? 0.16 : 0.07) * (this.life.next() < 0.5 ? -1 : 1); other.joltT = 0.6 }
      if (other.kind === 'poppy' && other.head && !other.spent) { petal(other); notes.push(...voices.later(voices.standing('poppy'), 0.04 * pats++)) }
    }
    if (piece.kind === 'poppy' && piece.head && !piece.spent) petal(piece)
    if (piece.kind === 'onion' && piece.head) for (let i = 0; i < 3; i++) this.bit('haze', vase.x + (i - 1) * 14, vase.mouthY - 40 - i * 12, (i - 1) * 8, -34, 1.4, 22, NO_FLOOR)
    if (piece.kind === 'ivy') piece.creep = 0
    // One head short of going over, the vase rocks and creaks: the child can see it coming.
    if (tipping(arrange(this.vase, vase), vase).rocks) { this.pot.rock = 0.9; notes.push(...voices.later(voices.creak, 0.1)) }
    else notes.push(...voices.sniff)
    this.sounds.push(...notes)
    // The visitor leans in to what has just arrived, and the goat licks its lips.
    const actor = this.actors[this.turn.visitor]
    if (!actor.act) actor.lean = 1.1
    this.goat.lick = 1.1
  }

  private jostle(by: number): void {
    for (const other of this.vase) if (other.kind !== 'thistle') { other.jolt = by * (this.life.next() < 0.5 ? -1 : 1); other.joltT = 0.5 }
  }

  private stepRobin(dt: number): void {
    const robin = this.robin
    robin.flap += dt * 30
    robin.hop = Math.max(0, robin.hop - dt)
    if (robin.state === 'perch') {
      robin.x = ROBIN.x; robin.y = ROBIN.y
      // One flight for each piece the path could not hold.
      const next = this.leaving.find((piece) => piece.move !== 'fall')
      if (next) {
        this.leaving.splice(this.leaving.indexOf(next), 1)
        next.move = null
        this.taken = next
        robin.state = 'down'; robin.t = 0
        this.sounds.push(...voices.tsip, ...voices.later(voices.flutter, 0.12))
        return
      }
      robin.nextHop -= dt
      if (robin.nextHop <= 0) { robin.nextHop = 3.5 + this.life.next() * 6; robin.hop = 0.3; if (this.life.next() < 0.6) robin.turn = -robin.turn }
      return
    }
    robin.t += dt
    const piece = this.taken
    const [ax, ay, bx, by] = piece ? this.spine(piece) : [ROBIN.x, ROBIN.y, ROBIN.x, ROBIN.y]
    const midX = (ax + bx) / 2, midY = Math.min(ay, by) - 8
    const exitX = -70, exitY = 150
    if (robin.state === 'down') {
      const u = smooth(clamp(robin.t / 0.6, 0, 1))
      robin.x = lerp(ROBIN.x, midX, u); robin.y = lerp(ROBIN.y, midY, u) - Math.sin(u * Math.PI) * 90
      robin.turn = midX >= ROBIN.x ? 1 : -1
      if (robin.t >= 0.6) { robin.state = 'off'; robin.t = 0; this.sounds.push(...voices.flutter) }
    } else if (robin.state === 'off') {
      const u = smooth(clamp(robin.t / 0.9, 0, 1))
      robin.x = lerp(midX, exitX, u); robin.y = lerp(midY, exitY, u) - Math.sin(u * Math.PI) * 120
      robin.turn = -1
      if (piece) { piece.px = robin.x - Math.sin(piece.rot) * piece.len * 0.5; piece.py = robin.y + 14 + Math.cos(piece.rot) * piece.len * 0.5 }
      if (robin.t >= 0.9) { robin.state = 'home'; robin.t = 0; this.taken = null }
    } else {
      const u = smooth(clamp(robin.t / 0.7, 0, 1))
      robin.x = lerp(exitX, ROBIN.x, u); robin.y = lerp(exitY, ROBIN.y, u) - Math.sin(u * Math.PI) * 50
      robin.turn = 1
      if (robin.t >= 0.7) { robin.state = 'perch'; robin.hop = 0.25 }
    }
  }

  /** Each visitor's eyes, its blink, and the act it plays by itself. The want is in the eyes: from the vase to the flowers and back. */
  private stepActors(dt: number): void {
    const finger = this.finger, vase = this.vaseDef
    this.glanceT = Math.max(0, this.glanceT - dt)
    const toVase = this.time % 5.2 < 2.7
    for (const who of VISITORS) {
      const actor = this.actors[who]
      if (actor.act && actor.timed) {
        actor.actT += dt
        actor.act.u = clamp(actor.actT / actor.actDur, 0, 1)
        if (actor.actT >= actor.actDur) actor.act = null
      }
      actor.lean = Math.max(0, actor.lean - dt)
      actor.sag = Math.max(0, actor.sag - dt)
      actor.blink = Math.max(0, actor.blink - dt)
      actor.nextBlink -= dt
      if (actor.nextBlink <= 0) { actor.nextBlink = 2 + this.life.next() * 4 * MANNER[who].tempo; actor.blink = 0.16 }
      let lookX = actor.lookX, lookY = actor.lookY, quick = 3, offer = 0
      if (actor.where === 'table') {
        if (finger.down) { lookX = finger.x; lookY = finger.y; quick = 12 }
        else if (this.glanceT <= 0) {
          // From its vase to the flowers and back.
          lookX = toVase ? vase.x : 400 + Math.sin(this.time * 0.37) * 220
          lookY = toVase ? vase.mouthY - 30 : 540
        }
        // Once a piece stands in the vase, it holds its hands or its muzzle out to it between its looks.
        offer = this.vase.length > 0 && toVase && !actor.act ? 0.7 : 0
      } else if (actor.where === 'gate') {
        const hold = gateHold(who)
        lookX = toVase ? 400 : hold.x
        lookY = toVase ? 560 : hold.y - 60
      } else { lookX = 700; lookY = 600 }
      const follow = clamp(dt * quick, 0, 1)
      actor.lookX += (lookX - actor.lookX) * follow
      actor.lookY += (lookY - actor.lookY) * follow
      actor.offer += (offer - actor.offer) * clamp(dt * 3 / MANNER[who].tempo, 0, 1)
      // Its one want: while its vase is empty it holds it out, turned to the child. It sets it down for a piece that is on its way.
      const out = actor.where === 'table' && who === this.turn.visitor && this.pot.on && !this.finished && this.vase.length === 0 && !this.carried && !actor.act && !this.scene && !this.hand && !this.pot.held && this.pot.back <= 0 ? 1 : 0
      actor.present += (out - actor.present) * clamp(dt * (out ? 2.5 / MANNER[who].tempo : 10), 0, 1)
      if (!out && actor.present < 0.004) actor.present = 0
    }
  }

  private stepCreatures(dt: number): void {
    const goat = this.goat, cat = this.cat
    goat.lick = Math.max(0, goat.lick - dt)
    goat.perk = Math.max(0, goat.perk - dt * 1.6)
    // The goat chews without end, and stops to listen and when it plays an act.
    if (goat.perk < 0.5 && !this.actors.goat.act && this.actors.goat.lean <= 0) goat.chew += dt * 5.4
    goat.flick = Math.max(0, goat.flick - dt)
    goat.nextFlick -= dt
    if (goat.nextFlick <= 0) { goat.nextFlick = 2.5 + this.life.next() * 5; goat.flick = 0.3; goat.flickEar = this.life.next() < 0.5 ? 0 : 1 }

    cat.breath += dt * 1.5
    cat.eye = Math.max(0, cat.eye - dt)
    cat.poke = Math.max(0, cat.poke - dt)
    cat.twitch = Math.max(0, cat.twitch - dt)
    cat.tail += dt * (cat.twitch > 0 || cat.poke > 0 ? 13 : 1.1)
    cat.nextTwitch -= dt
    if (cat.nextTwitch <= 0) { cat.nextTwitch = 3 + this.life.next() * 6; cat.twitch = 0.5 }
  }

  private bit(kind: Bit['kind'], x: number, y: number, vx: number, vy: number, life: number, size: number, floor: number): void {
    if (this.bits.length >= this.maxBits) this.bits.shift()
    this.bits.push({ kind, x, y, vx, vy, age: 0, life, size: size * (0.8 + this.life.next() * 0.4), spin: this.life.next() * TAU, floor })
  }

  private stepBits(dt: number): void {
    for (const bit of this.bits) {
      bit.age += dt
      const light = bit.kind === 'petal' || bit.kind === 'fluff' || bit.kind === 'haze'
      if (bit.kind === 'petal') { bit.vy += 320 * dt; bit.vx *= 1 - dt * 2.4; bit.vy = Math.min(bit.vy, 130); bit.spin += dt * 5 }
      else if (bit.kind === 'fluff') { bit.vx += Math.sin(bit.age * 5 + bit.spin) * 40 * dt; bit.vy -= 6 * dt }
      else if (!light) bit.vy += 900 * dt
      bit.x += bit.vx * dt; bit.y += bit.vy * dt
      if (bit.y > bit.floor) {
        bit.y = bit.floor
        if (bit.kind === 'seed') { bit.vy = -Math.abs(bit.vy) * 0.35; bit.vx *= 0.7 }
        else { bit.vy = 0; bit.vx = 0 }
      }
    }
    for (let i = this.bits.length - 1; i >= 0; i--) if (this.bits[i].age >= this.bits[i].life) this.bits.splice(i, 1)
  }

  // --- Where everything is drawn ----------------------------------------------

  /** The pieces the vase shows: the bouquet a scene is playing with, or what stands in it. */
  get inPot(): readonly Piece[] {
    return this.carried ?? this.vase
  }

  standingOf(piece: Piece): Standing {
    const list = this.inPot, vase = this.vaseDef
    return arrange(list, vase)[list.indexOf(piece)] ?? { lean: 0, sink: vase.depth, droop: 0, bendAt: vase.depth + vase.tall }
  }

  /** The straight part of a piece as it is drawn: from its cut end to its bend, or to its tip. */
  spine(piece: Piece): [number, number, number, number] {
    const reach = (piece.bend ? Math.min(piece.bendAt, piece.len) : piece.len) * piece.stretch
    return [piece.px, piece.py, piece.px + Math.sin(piece.prot) * reach, piece.py - Math.cos(piece.prot) * reach]
  }

  /** Where the tip of a piece in the vase is. */
  tipOf(piece: Piece, look: Standing): { x: number; y: number } {
    const lower = look.droop ? Math.min(look.bendAt, piece.len) : piece.len
    const upper = piece.len - lower
    return { x: piece.px + Math.sin(look.lean) * lower + Math.sin(look.lean + look.droop) * upper, y: piece.py - Math.cos(look.lean) * lower - Math.cos(look.lean + look.droop) * upper }
  }

  /** Sets what every piece looks like this frame from where it rests and what it is doing. Pieces in the vase are posed with the vase at its place: the view moves them with it. */
  private pose(): void {
    const vase = this.vaseDef
    const list = this.inPot
    const looks = arrange(list, vase)
    const act = this.actors[this.turn.visitor].act
    const sniffed = act && act.name === 'sniff' && act.plant === 'sunflower' ? act : null
    list.forEach((piece, index) => {
      const look = looks[index]
      const restX = vase.x + (piece.at / 10) * Math.min(7, vase.halfMouth * 0.3), restY = vase.mouthY + look.sink
      const jolt = piece.joltT > 0 ? piece.jolt * Math.sin(piece.joltT * 26) * (piece.joltT / 0.6) : 0
      piece.stretch = 1; piece.wide = 1
      piece.bend = look.droop; piece.bendAt = look.bendAt
      if (piece.move === 'toVase') {
        const u = clamp(piece.t / piece.dur, 0, 1)
        const over = smooth(clamp(u / 0.62, 0, 1)), down = smooth(clamp((u - 0.62) / 0.38, 0, 1))
        piece.px = lerp(piece.fromX, restX, over)
        piece.py = lerp(lerp(piece.fromY, vase.mouthY - 12, over), restY, down) - Math.sin(over * Math.PI) * 26
        piece.prot = lerp(piece.fromRot, look.lean, over)
        piece.bend = look.droop * down
        return
      }
      piece.px = restX; piece.py = restY; piece.prot = look.lean + jolt
      // The aunt's fingertip stands it straight, and it sinks back when she lets go.
      if (this.mend?.piece === piece) { piece.prot *= 1 - this.mend.amount; piece.bend *= 1 - this.mend.amount }
      // Sniffed, a sunflower turns its face round to the visitor's face, nose to nose, and back when the nose has gone.
      if (sniffed && piece.kind === 'sunflower' && piece.head && !piece.spent) {
        const faces = facing(sniffed.u)
        piece.wide = Math.abs(Math.cos(faces * Math.PI)); piece.prot += 0.1 * faces
      }
      if (piece.move === 'stood') {
        const u = clamp(piece.t / piece.dur, 0, 1)
        // Each plant's own way of arriving: the sunflower turns its face round to the window, the dandelion bobs, the rest dip and settle.
        if (piece.kind === 'sunflower' && piece.head) piece.wide = Math.abs(Math.cos(u * Math.PI))
        else if (piece.kind === 'dandelion') piece.py += Math.sin(u * TAU * 2) * 9 * (1 - u)
        else if (piece.kind !== 'thistle') piece.py += Math.sin(u * Math.PI) * 5 * (1 - u)
        if (piece.kind === 'poppy') piece.bend += Math.sin(u * TAU * 1.5) * 0.3 * (1 - u)
      }
    })
    for (const piece of [...this.path, ...this.leaving]) {
      // Not seen on the path yet: it is still in the vase that is going over, or on the visitor.
      if (piece.move === 'wait') continue
      piece.stretch = 1; piece.wide = 1
      piece.bend = piece.kind === 'ivy' && !isUpright(piece.rot) ? 0.5 * Math.sign(Math.sin(piece.rot) || 1) : 0
      piece.bendAt = piece.len * 0.5
      if (piece.move === 'fall') {
        const u = clamp(piece.t / piece.dur, 0, 1)
        const drop = piece.kind === 'dandelion' ? smooth(u) : u * u
        piece.px = lerp(piece.fromX, piece.x, smooth(u)) + (piece.kind === 'dandelion' ? Math.sin(u * TAU * 1.5) * 14 * (1 - u) : 0)
        piece.py = lerp(piece.fromY, piece.y, drop) - Math.sin(u * Math.PI) * piece.hop
        // A thistle comes down point first, as it left the hand; the rest turn over as they fall.
        piece.prot = piece.kind === 'thistle' ? pointFirst(piece.fromRot) : lerp(piece.fromRot, piece.rot, smooth(u))
        piece.bend *= u
        continue
      }
      piece.px = piece.x; piece.py = piece.y; piece.prot = piece.rot
      if (piece.move !== 'landed') continue
      const u = clamp(piece.t / piece.dur, 0, 1), fade = 1 - u
      const side = Math.sin(piece.rot) >= 0 ? 1 : -1
      switch (piece.kind) {
        case 'sunflower': piece.stretch = 1 - 0.1 * Math.sin(u * Math.PI) * fade; piece.py -= Math.sin(u * Math.PI) * 5 * fade; break
        case 'poppy': piece.px -= side * 30 * (1 - smooth(u)); piece.prot += side * 0.5 * (1 - smooth(u)); break
        // Two bounces, the second lower, and it rolls on.
        case 'onion': piece.px -= side * 44 * (1 - smooth(u)); piece.py -= Math.abs(Math.sin(Math.min(1, u / BOUNCES) * TAU)) * (u < BOUNCES / 2 ? 50 : 22); break
        // It stuck: it quivers. Anywhere else it stands on its point for a moment, tips over and lies flat.
        case 'thistle': piece.prot = isUpright(piece.rot) ? piece.rot + Math.sin(u * 34) * 0.2 * fade : lerp(pointFirst(piece.fromRot), piece.rot, smooth(clamp((u - 0.15) / 0.6, 0, 1))); break
        case 'ivy': piece.stretch = 1 + Math.sin(u * TAU * 2.5) * 0.3 * fade; break
        case 'dandelion': piece.py -= Math.sin(u * Math.PI) * 6 * fade; break
      }
    }
    const hand = this.hand
    if (hand) {
      // In the hand: flower uppermost, its cut end at the finger.
      hand.px = this.finger.x; hand.py = this.finger.y - (hand.len < 90 ? 22 : 6) - Math.abs(Math.sin(this.bob * 16)) * 14 * (this.bob / 0.6)
      hand.bend = 0; hand.stretch = 1; hand.wide = 1
    }
  }

  // --- Reading touches ---------------------------------------------------------

  private nearest(list: readonly Piece[], x: number, y: number, inVase: boolean): Piece | null {
    let best: Piece | null = null, bestD = REACH
    const vase = this.vaseDef
    for (const piece of list) {
      if (piece.move === 'fall' || piece.move === 'toVase' || piece.move === 'wait') continue
      if (inVase) {
        // What is down inside the vase is behind its side and cannot be pinched there.
        if (y > vase.mouthY + 4) continue
      } else if (y < PATH_CLEAR) {
        // Above the path a finger belongs to the bed, the vase and the visitors. Only a thistle that stuck upright is taken there, by its own stalk.
        if (!isUpright(piece.rot) || Math.abs(x - piece.x) > UPRIGHT_REACH || y < piece.y - piece.len - 6) continue
      }
      const [ax, ay, bx, by] = this.spine(piece)
      let d = nearSegment(x, y, ax, ay, bx, by).d
      if (piece.bend) {
        const upper = (piece.len - Math.min(piece.bendAt, piece.len)) * piece.stretch
        d = Math.min(d, nearSegment(x, y, bx, by, bx + Math.sin(piece.prot + piece.bend) * upper, by - Math.cos(piece.prot + piece.bend) * upper).d)
      }
      // A flower is as wide as it is drawn.
      if (piece.head) {
        const tip = inVase ? this.tipOf(piece, this.standingOf(piece)) : { x: piece.px + Math.sin(piece.prot) * piece.len, y: piece.py - Math.cos(piece.prot) * piece.len }
        d = Math.min(d, Math.hypot(x - tip.x, y - tip.y) - PLANTS[piece.kind].headR * piece.scale * 0.7)
      }
      if (d < bestD) { best = piece; bestD = d }
    }
    return best
  }

  private stemAt(x: number, y: number): Stem | null {
    let best: Stem | null = null, bestD = Infinity
    for (const stem of this.stems) {
      if (stem.grow < 1) continue
      const wholeStem = stem.height >= stem.full
      const half = wholeStem && y < SOIL_Y - stem.height + headOf(stem.index) ? Math.max(REACH, PLANTS[stem.kind].headR * stem.scale) : REACH
      const d = Math.abs(x - stem.x)
      if (d > half || y > SOIL_Y + 4 || y < SOIL_Y - stem.height - (wholeStem ? 6 : REACH)) continue
      if (d < bestD) { best = stem; bestD = d }
    }
    return best
  }

  // --- What the idle ladder shows ----------------------------------------------

  /** What the first step of the ladder lights: the one who waits when the table is bare; else every stem, and the visitor once a piece stands in its vase. */
  glows(): { x: number; y: number; size: number }[] {
    if (this.finished) return [{ x: WAITING.x, y: WAITING.feetY - 150, size: 2.2 }]
    const lit: { x: number; y: number; size: number }[] = []
    for (const stem of this.stems) {
      if (stem.grow < 1) continue
      const wholeStem = stem.height >= stem.full
      lit.push({ x: stem.x, y: SOIL_Y - (wholeStem ? stem.full - PLANTS[stem.kind].head * stem.scale * 0.5 : stem.height), size: wholeStem ? 0.7 + PLANTS[stem.kind].headR / 60 : 0.6 })
    }
    if (this.vase.length > 0) lit.push({ x: VISITOR.x, y: RIG[this.turn.visitor].headY, size: 2.4 })
    return lit
  }

  /**
   * One move a child could make now, for the ghost hand: across a stem that still has its flower, a piece from
   * the path to the vase, a touch on the visitor once a piece stands in its vase, or, when the table is bare, a
   * touch on the one who waits. Never which flower, or how long.
   */
  hint(demoIndex: number): Hint | null {
    const tap = (x: number, y: number): Hint => ({ fromX: x, fromY: y, toX: x, toY: y, cut: false })
    if (this.finished) return tap(WAITING.x, WAITING.feetY - 110)
    const vase = this.vaseDef
    const turn = demoIndex % 3
    if (turn === 2 && this.vase.length > 0) return tap(VISITOR.x + 20, RIG[this.turn.visitor].headY + 30)
    const lying = this.path.find((piece) => !piece.move && !isUpright(piece.rot))
    // What the child has not done yet comes first: with a piece on the path and nothing in the vase, the carry is shown before another cut.
    if (turn === (this.vase.length === 0 ? 0 : 1) && lying && this.vase.length < vase.holds) {
      const [ax, ay, bx, by] = this.spine(lying)
      return { fromX: (ax + bx) / 2, fromY: (ay + by) / 2, toX: vase.x, toY: vase.mouthY - 30, cut: false }
    }
    const stem = this.stems.find((each) => each.height >= each.full && each.grow >= 1 && each.index % 2 === 0) ?? this.stems.find((each) => each.height >= each.full && each.grow >= 1)
    if (!stem) {
      const stalk = this.stems.find((each) => each.grow >= 1)
      return stalk ? tap(stalk.x, SOIL_Y - stalk.height / 2) : null
    }
    const y = SOIL_Y - stem.full * 0.45
    return { fromX: stem.x - 78, fromY: y + 10, toX: stem.x + 78, toY: y - 10, cut: true }
  }

  // --- Saving ------------------------------------------------------------------

  private changed(how: 'soon' | 'now'): void {
    if (how === 'now' || this.dirty === 'no') this.dirty = how
  }

  /** The garden as it is left, every piece at rest: a piece in the hand is where it came from, nothing is in the air, and a scene is at its end. */
  toSave(): Saved {
    const vase: InVase[] = this.vase.map((piece) => ({ ...strip(piece), at: piece.at }))
    const path: OnPath[] = this.path.map((piece) => ({ ...strip(piece), x: piece.x, y: piece.y, rot: piece.rot }))
    const hand = this.hand, origin = this.origin
    if (hand && origin) {
      if (origin.from === 'vase') vase.splice(Math.min(origin.index, vase.length), 0, { ...strip(hand), at: origin.at })
      else if (origin.from === 'path') path.splice(Math.min(origin.index, path.length), 0, { ...strip(hand), x: origin.x, y: origin.y, rot: origin.rot })
      else path.push({ ...strip(hand), spent: hand.spent || (hand.kind === 'poppy' && hand.head), x: origin.x, y: origin.y, rot: origin.rot })
    }
    return {
      v: 1, position: this.position, finished: this.finished, bed: this.stems.map((stem) => stem.height), vase, path,
      street: this.street.map((bouquet) => ({ who: bouquet.who, pieces: bouquet.pieces.map((piece) => ({ ...piece })) })), shown: [...this.shown],
    }
  }

  private make(stem: number, base: number, len: number, head: boolean, spent: boolean): Piece {
    const spot = BED[stem]
    return { id: this.nextId++, stem, kind: spot.kind, scale: spot.scale, base, len, head, spent, shownSpent: spent, where: 'path', x: 0, y: 0, rot: 0, at: 0, px: 0, py: 0, prot: 0, bend: 0, bendAt: len, stretch: 1, wide: 1, move: null, t: 0, dur: 0, fromX: 0, fromY: 0, fromRot: 0, jolt: 0, joltT: 0, lift: 0, noBee: false, creep: 1, hop: 0 }
  }
}
