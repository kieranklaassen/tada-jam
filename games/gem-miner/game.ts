import type { Point } from './input'
import { BLOCKS, BURROW, BURROW_INDEX, CAGE, CELL, COLS, GRASS, HILL, LIFT, MAMMOTH, TOOLS, apart, cellAt, cellOf, colOf, feetOf, grassNode, inBox, inHill, indexOf, isGrass, nearestCell, rowOf, type Tool } from './layout'
import { nextMove } from './route'
import { Scene, type Beat } from './scene'
import { dwellerBox, gemBox, gemSpot, moleBox, toolBox, toolRest, toolSpot, GEM_R } from './shapes'
import { BLOWS, POCKET_HOLDS, canPack, clone, dwellersOf, floorUnder, gemsIn, isColour, isGround, layWorld, lightOf, nextSeed, pack, pour, roofOver, settle, takeGround, toolAt, toolFall, unstable, wormsOf, type Colour, type Dweller, type DwellerKind, type Flow, type Gem, type Ground, type Load, type Rest, type Settled, type World } from './world'

// The game in time: the mole and what he does with the pick and the three
// tools, the finger that carries a gem, the lift, and the three scenes. Pure
// rules on game time. The Mount passes touches in stage units and steps the
// game; the view draws what `world`, `mole` and the short-lived lists hold;
// every sound is made from an event the game queues in the same step that
// shows its cause, so sight and sound share one clock.

/** Seconds the mole takes to walk one block. */
export const WALK_S = 0.2
/** How long his hat sits over his eyes after a finger knocks it there. */
export const HAT_S = 1.1
/** How long he stays cross after he comes off the roof. */
export const CROSS_S = 2.4
/** Seconds between the drops of a spout. */
export const DRIP_S = 2.6
/** How long he stays turned round when he looks back over his shoulder. */
export const LOOK_BACK_S = 0.9
/** A press that lasted longer than this is a hold: when it lifts, the work stops as it does when a slide lifts. */
export const TAP_S = 0.3

/**
 * Everything the mole does to a block, with how long it takes and the moments in it at which something happens.
 * The view reads the same moments for its poses, so a blow is seen to land when it is heard.
 */
export const ACTS = {
  swing: { length: 0.3, cues: [0.15] },
  judder: { length: 0.55, cues: [] },
  wedgeEarth: { length: 1.5, cues: [0.25, 1.0, 1.22] },
  wedgeSplit: { length: 0.55, cues: [0.2] },
  mallet: { length: 0.5, cues: [0.22] },
  spoutMake: { length: 1.0, cues: [0.22] },
  ventMake: { length: 2.0, cues: [0.22] },
  prise: { length: 0.8, cues: [0.22, 0.5] },
  scoop: { length: 0.6, cues: [0.3] },
  scoopSand: { length: 0.6, cues: [0.3] },
  gong: { length: 1.1, cues: [0.22, 0.45, 0.65, 0.85] },
  fillWater: { length: 0.6, cues: [0.3] },
  plipDrop: { length: 0.7, cues: [0.4] },
  catchGas: { length: 0.5, cues: [0.3] },
  float: { length: 1, cues: [] },
  scoopGem: { length: 0.5, cues: [0.25] },
  tip: { length: 0.6, cues: [0.3] },
  refuse: { length: 0.7, cues: [0.3] },
  ropeEarth: { length: 1.3, cues: [0.3, 0.95] },
  ropeSaw: { length: 1.0, cues: [0.2, 0.55] },
  ropeTwang: { length: 1.3, cues: [0.4, 0.65] },
  haul: { length: 1.0, cues: [0.15, 0.45] },
  ropeBob: { length: 1.6, cues: [0.3, 0.6, 1.1] },
  ropeSlap: { length: 0.7, cues: [0.3] },
  ropeCharm: { length: 0.9, cues: [0.25] },
  hang: { length: 0.9, cues: [0.35] },
  take: { length: 0.35, cues: [0.15] },
  put: { length: 0.35, cues: [0.15] },
  shake: { length: 0.75, cues: [0.1, 0.3, 0.5] },
  tipFeet: { length: 2.8, cues: [0.3, 0.8, 1.8] },
} as const satisfies Record<string, { length: number; cues: readonly number[] }>
export type ActName = keyof typeof ACTS
/** Seconds between the hisses of a rope held in a gas pocket. */
export const CHARM_EVERY_S = 0.45
/** Seconds the bucket of gas takes to carry him up one block. */
export const FLOAT_S = 0.35

/** What a knocked block is, for its sound and its dust. */
export type KnockKind = 'earth' | 'sandstone' | 'granite' | 'water' | 'gas' | 'gem' | 'open' | 'grass'

/**
 * Something that happened, as the view, the cast and the voices take it. Each is queued in the step in which the
 * model shows it. `index` is the block it happened in, `n` a count within it, `from` the place a blow came from.
 */
export type Event =
  | { type: 'knock'; kind: KnockKind; index: number; at: Point; colour?: Colour }
  | { type: 'chip' | 'break'; kind: Ground; index: number; n: number; aside: boolean; from: Point }
  | { type: 'clang'; index: number; from: Point }
  | { type: 'step'; node: number; wade: boolean; slop: boolean }
  | { type: 'print'; at: Point }
  | { type: 'poke'; who: 'mole' | 'mammoth' | 'lift' | Tool | DwellerKind; index: number }
  | { type: 'take' | 'put'; tool: Tool; node: number }
  | { type: 'squelch' | 'pop' | 'split' | 'boom' | 'jet' | 'whistle' | 'gong' | 'bloop' | 'plip' | 'fff' | 'ropehiss' | 'worm' | 'twang' | 'creak' | 'strain' | 'thud' | 'plap' | 'charm' | 'hang' | 'whoomph' | 'bump' | 'gush' | 'lap' | 'clunk' | 'pat'; index: number }
  | { type: 'sit' | 'ding' | 'teeth' | 'burp' | 'clink' | 'flop' | 'trickle' | 'soak' | 'grumble' | 'clack' | 'slurp' | 'spray' | 'wash' | 'unroll' | 'shoot' | 'hm' }
  | { type: 'ring'; index: number; n: number; loose: boolean }
  | { type: 'scoop'; index: number; what: 'earth' | 'sand' }
  | { type: 'tip'; index: number; what: 'earth' | 'sand' | 'water' }
  | { type: 'zip' | 'bip' | 'flap' | 'squeal' | 'roll'; n: number }
  | { type: 'rumble'; from: number; to: number }
  | { type: 'glug'; index: number; n: number }
  | { type: 'gemring' | 'ping' | 'chime' | 'prise'; colour: Colour; index: number }
  | { type: 'tik' | 'tock'; index: number }
  | { type: 'plink'; index: number }
  | { type: 'leave'; kind: DwellerKind; index: number }
  | { type: 'show'; kind: DwellerKind; index: number }
export type EventType = Event['type']

/** How the mole is drawn while a scene has him. */
export type ScenePose = 'shoot' | 'splat' | 'glare' | 'swept' | 'ride'

export type Mole = {
  /** Where his feet are, in stage units. */
  x: number
  y: number
  /** 1 facing right, -1 facing left. */
  face: 1 | -1
  mode: 'rest' | 'walk' | 'act' | 'scene'
  /** What he is doing to a block, while `mode` is `act`. */
  act: ActName | null
  /** Seconds into the walk or the act, and how long this act takes. */
  t: number
  length: number
  /** The node he walks to or works on. */
  to: number
  /** Which blow this is of the blows the block takes: the tink of sandstone, the ring of granite. */
  n: number
  /** Seconds his hat still sits over his eyes. */
  hat: number
  /** Where he looks: the finger while it is down, the place it last pressed after that. */
  look: Point
  /** Seconds he still stands turned round, looking back over his shoulder at the child. */
  back: number
  /** Hanging under the roof after a blast, until the next touch. */
  hang: boolean
  /** Seconds he is still cross after coming off the roof. */
  cross: number
  /** Standing in white light, with his hat pulled down. */
  dazzled: boolean
  /** Ducking under a lamp that hangs in his block. */
  duck: boolean
  /** Rising under a bucket of gas. */
  afloat: boolean
  /** How a scene holds him. */
  pose: ScenePose | null
}

/** A thing on its way from one place to another: a boulder, a gem or a tool that falls or is hauled. */
export type Motion = {
  what: 'boulder' | 'gem' | 'tool'
  /** The gem or the tool that moves; for a boulder, the block it lands in. */
  gem?: Gem
  tool?: Tool
  to: number
  /** Where it is drawn from, as an offset in stage units from where it rests, shrinking to nothing. */
  dx: number
  dy: number
  t: number
  length: number
  /** How it moves: a straight fall, a slide, a spring out of the rock with two bounces, a pop off a wall, an arc through the air, a spin where it lies. */
  how: 'fall' | 'slide' | 'spring' | 'pop' | 'arc' | 'spin'
  /** The events still to come, by the second at which each happens. */
  cues: { at: number; event: Event }[]
  /** A popped gem's way: the offset from where it rests of the point it strikes on the way, and the second it strikes it. */
  via?: { dx: number; dy: number; at: number }
}

/** `ride` says the mole stood in the cage when the finger came down on the lift: a tap then starts the ride. */
type Errand = { type: 'fetch'; tool: Tool } | { type: 'cage'; ride: boolean } | { type: 'feet' } | { type: 'use'; gem: Gem }

/** A gem under the finger. */
export type Hand = { gem: Gem; x: number; y: number; moved: boolean }

export type SceneName = 'blast' | 'run' | 'ride'
/** What a scene shows beyond the world: the lift, the rolled hide, the water on its way. */
export type Staging = {
  name: SceneName | null
  /** The cage: how far up it is, 0 to 1, and whether its door is shut. */
  rise: number
  door: boolean
  /** The crank's turn, in whole turns. */
  wind: number
  /** The hillside rolled away to the left (`away`, 0 to 1) or unrolling from the right (`in`, 0 to 1). */
  roll: { phase: 'away' | 'in'; k: number } | null
  /** Where the head of the running water is, in stage units, and null when none runs. */
  stream: Point | null
  /** The pool that rocks, and how far through its rocking it is. */
  lap: { index: number; k: number } | null
}

const feet = feetOf

export class Game {
  /** The hill as it is shown. During a scene the save is ahead of it (`saved`). */
  world: World
  readonly mole: Mole
  /** The light on every block, as the colours that reach it. */
  masks: number[]
  /** Who lives where. */
  dwellers: Dweller[]
  /** The earth blocks a worm looks out of. */
  worms: number[]
  /** The gem the finger carries. */
  hand: Hand | null = null
  motions: Motion[] = []
  readonly staging: Staging = { name: null, rise: 0, door: false, wind: 0, roll: null, stream: null, lap: null }
  /** Seconds of play. */
  time = 0
  /** Seconds since each spout last let a drop go, by block. */
  drips = new Map<number, number>()
  /** What the mole took into the cage with him, while a ride shows it: it stays in his paw until he steps out onto the fresh hillside. */
  carried: { tool: Tool; load: Load } | null = null
  /** The blocks a worm looks out of on this hillside as it was laid; one is there whenever its block is earth. */
  private wormHomes: number[]
  /** The dug block the finger carries a gem over, a place on the grass when it is over none, and null with no gem carried. */
  private carryAt: number | null = null
  /** The second of play at which the finger that is down landed. */
  private pressedAt = 0
  /** Whether a blow has begun under the finger that is down: a tap whose blow has begun has had its blow. */
  private struck = false

  /** The node the finger points at, or null when he has nowhere to go. */
  private aim: number | null = null
  private errand: Errand | null = null
  private held = false
  /** Blows he may still begin: any number while the finger is down or on an errand, one after a tap on rock. */
  private blows = 0
  /** The block a tool has just been used on: the held finger has to move on before the tool is used again. */
  private spent: number | null = null
  private queue: Event[] = []
  /** What a save needs: nothing, a change that keeps coming, or one that must be written at once. */
  private dirty: 'no' | 'soon' | 'now' = 'no'
  private scene: Scene | null = null
  /** What the scene that is playing ends in. A save holds this from the scene's first moment. */
  private saved: World | null = null
  private holdDwellers = false

  constructor(world: World) {
    this.world = world
    const stand = feet(world.mole.at)
    this.mole = { x: stand.x, y: stand.y, face: 1, mode: 'rest', act: null, t: 0, length: 0, to: world.mole.at, n: 0, hat: 0, look: { x: stand.x + 200, y: stand.y - 40 }, back: 0, hang: false, cross: 0, dazzled: false, duck: false, afloat: false, pose: null }
    this.masks = lightOf(world)
    this.dwellers = dwellersOf(world, this.masks)
    this.wormHomes = wormsOf(layWorld(world.seed, world.position))
    this.worms = this.wormHomes.filter((index) => world.kinds[index] === 'earth')
    this.stance()
  }

  // --- What a save holds ------------------------------------------------------------------------------------

  /** The world a save keeps: the end of the scene that is playing, or the hill as it stands. */
  get keeps(): World {
    return this.saved ?? this.world
  }

  /** Whether anything a save keeps has changed since this was last asked, and how soon it must be written. */
  changed(): 'no' | 'soon' | 'now' {
    const was = this.dirty
    this.dirty = 'no'
    return was
  }

  /** The events since the last call, oldest first. */
  drain(): Event[] {
    const out = this.queue
    this.queue = []
    return out
  }

  /** Whether a finger is down and working: digging, or carrying a gem. */
  get working(): boolean {
    return this.held || this.hand !== null
  }

  /** Whether anything is still in motion that a touch started: the mole, a scene, something falling. */
  get busy(): boolean {
    return this.mole.mode !== 'rest' || this.scene !== null || this.motions.length > 0 || this.aim !== null
  }

  get sceneName(): SceneName | null {
    return this.staging.name
  }

  // --- Where things are, for a finger and for the view --------------------------------------------------------

  /**
   * Where the mole's feet are drawn: where he stands, a little behind it while he is eased back from a heave or
   * along with the water, and up with the cage while it is up.
   */
  moleAt(): Point {
    const mole = this.mole
    const eased = this.backed ?? this.swept
    const k = eased ? Math.max(0, 1 - (this.time - eased.at) / EASE_S) : 0
    const up = this.riding ? this.staging.rise * RISE : 0
    return { x: mole.x + (eased ? eased.dx * k * k : 0), y: mole.y + (eased ? eased.dy * k * k : 0) - up }
  }

  /** The mole as drawn. */
  moleShape(): { x: number; y: number; w: number; h: number } {
    const at = this.moleAt()
    return moleBox(at.x, at.y, this.mole.duck)
  }

  /** Seconds the scene that is playing has played. */
  get sceneAge(): number {
    return this.scene ? this.time - this.sceneFrom : 0
  }
  private sceneFrom = 0

  /**
   * The block a still idle child is shown: the nearest one to the mole that his pick can dig, the one under his
   * feet first. On the grass or in the cage he goes into the hill by the burrow, so it is the nearest to the burrow.
   */
  suggestion(): number | null {
    const at = isGrass(this.world.mole.at) ? BURROW_INDEX : this.world.mole.at
    let best: number | null = null
    for (let index = 0; index < BLOCKS; index++) {
      if (!isGround(this.world.kinds[index])) continue
      if (best === null || apart(index, at) < apart(best, at) || (apart(index, at) === apart(best, at) && rowOf(index) > rowOf(best))) best = index
    }
    return best
  }

  /** Where a gem that is out of its block is drawn now, and how far it is turned: where it rests, or on its way there. */
  gemPlace(gem: Gem): { x: number; y: number; turn: number } {
    const spot = gemSpot(this.world, gem)
    let x = spot.x, y = spot.y, turn = 0
    const motion = this.motions.find((other) => other.gem === gem)
    if (motion) {
      const k = Math.max(0, Math.min(1, motion.t / motion.length))
      if (motion.how === 'fall') { x += motion.dx * (1 - k); y += motion.dy * (1 - k * k) }
      else if (motion.how === 'spring') {
        // Out of its block and down in two bounces, which land on the two tiks.
        y += motion.t < 0.3 ? motion.dy * (1 - motion.t / 0.3) - Math.sin((motion.t / 0.3) * Math.PI) * 26 : -Math.sin(Math.max(0, Math.min(1, (motion.t - 0.3) / 0.2)) * Math.PI) * 12
        turn = k * 5
      } else if (motion.how === 'pop' && motion.via) {
        // Out of the wall to the hat, which it strikes, and off the hat down to the floor.
        const via = motion.via
        if (motion.t < via.at) { const p = motion.t / via.at; x += motion.dx + (via.dx - motion.dx) * p; y += motion.dy + (via.dy - motion.dy) * p - Math.sin(p * Math.PI) * 8 }
        else { const p = Math.min(1, (motion.t - via.at) / (motion.length - via.at)); x += via.dx * (1 - p); y += via.dy * (1 - p * p) - Math.sin(p * Math.PI) * 14 }
        turn = k * 6
      } else if (motion.how === 'pop') { x += motion.dx * (1 - k); y += motion.dy * (1 - k * k) - Math.sin(k * Math.PI) * 30; turn = k * 6 }
      // Thrown: up and over, higher the further it has to go.
      else if (motion.how === 'arc') { x += motion.dx * (1 - k); y += motion.dy * (1 - k) - Math.sin(k * Math.PI) * (26 + Math.hypot(motion.dx, motion.dy) * 0.16); turn = k * 6 }
      else if (motion.how === 'spin') turn = (1 - (1 - k) * (1 - k)) * Math.PI * 6
    }
    return { x, y, turn }
  }

  /** The top left corner of where a boulder on its way is drawn now. */
  boulderPlace(motion: Motion): Point {
    const k = Math.max(0, Math.min(1, motion.t / motion.length))
    const left = motion.how === 'fall' ? 1 - k * k : 1 - ease(k)
    const at = { x: HILL.x + colOf(motion.to) * CELL, y: HILL.y + rowOf(motion.to) * CELL }
    return { x: at.x + motion.dx * left, y: at.y + motion.dy * left }
  }

  /** The point under the middle of a tool that lies somewhere, as it is drawn now: where it lies, or on its way down to it. */
  toolPlace(tool: Tool): Point {
    const spot = toolRest(this.world, tool)
    const motion = this.motions.find((other) => other.tool === tool)
    if (!motion) return spot
    const via = motion.via
    if (via) {
      // Down onto the tool that lies there, and off it in a hop, sideways first, to where it comes to rest.
      if (motion.t < via.at) { const p = motion.t / via.at; return { x: spot.x + via.dx + (motion.dx - via.dx) * (1 - p), y: spot.y + via.dy + (motion.dy - via.dy) * (1 - p * p) } }
      const p = Math.min(1, (motion.t - via.at) / (motion.length - via.at))
      return { x: spot.x + via.dx * (1 - p) * (1 - p), y: spot.y + via.dy * (1 - p * p) - Math.sin(p * Math.PI) * 14 }
    }
    const k = Math.max(0, Math.min(1, motion.t / motion.length))
    return { x: spot.x + motion.dx * (1 - k), y: spot.y + motion.dy * (1 - k * k) }
  }

  /**
   * The dweller a finger lands on. Who is drawn where, and how much of it, is the cast's to say (play.ts sets
   * this); a game with no cast finds each dweller whole in its place.
   */
  dwellerUnder: (at: Point) => Dweller | null = (at) => {
    for (const dweller of this.dwellers) if (inBox(at, dwellerBox(dweller.kind, dweller.at))) return dweller
    return null
  }

  private gemUnder(at: Point, tight: boolean): Gem | null {
    for (const gem of this.world.gems) {
      if (gem.rest === 'bucket') continue
      const spot = this.gemPlace(gem)
      if (tight ? Math.hypot(at.x - spot.x, at.y - spot.y) <= GEM_R + 5 : inBox(at, gemBox(spot))) return gem
    }
    return null
  }

  private toolUnder(at: Point): Tool | null {
    for (const tool of TOOLS) {
      if (this.world.mole.tool === tool) continue
      // The rope that holds a lamp up is not lying anywhere: the lamp is what a finger takes.
      if (tool === 'rope' && this.world.gems.some((gem) => gem.rest === 'hung')) continue
      if (inBox(at, toolBox(tool, this.toolPlace(tool)))) return tool
    }
    return null
  }

  // --- Touch ----------------------------------------------------------------------------------------------------

  /** The finger landed. The answer starts here, in this call. A touch in the grown-up's corner is none. */
  press(at: Point, inCorner = false): void {
    if (inCorner) return
    // A touch ends the scene that is playing, and is then an ordinary touch.
    this.finishScene()
    const mole = this.mole, world = this.world
    this.release('cancel')
    this.pressedAt = this.time
    this.struck = false
    mole.look = at
    this.spent = null
    if (mole.hang) { mole.hang = false; mole.cross = CROSS_S }

    const near = this.gemUnder(at, true)
    if (near) return this.lift(near, at)
    // In the cage he is part of the lift: a tap there is a tap on the lift.
    if (inBox(at, this.moleShape()) && !(world.mole.at === CAGE && inBox(at, LIFT))) return this.pokeMole()
    const gem = this.gemUnder(at, false)
    if (gem) return this.lift(gem, at)
    const tool = this.toolUnder(at)
    if (tool) {
      this.push({ type: 'poke', who: tool, index: world.tools[tool] })
      this.go(world.tools[tool], { type: 'fetch', tool })
      return
    }
    if (inBox(at, LIFT)) {
      // Only with the mole standing in the cage does a tap on the lift start the ride, and only a tap: the ride
      // starts when the finger lifts, so a hold or the start of a drag there starts nothing.
      this.push({ type: 'poke', who: 'lift', index: CAGE })
      this.go(CAGE, { type: 'cage', ride: world.mole.at === CAGE && mole.mode === 'rest' })
      return
    }
    if (inBox(at, MAMMOTH)) {
      this.push({ type: 'poke', who: 'mammoth', index: 0 })
      // It likes water: with a bucket of water in his paws the mole takes the hint.
      if (world.mole.tool === 'bucket' && world.mole.load === 'water' && mole.mode !== 'act') this.go(grassNode(BURROW.c - 1), { type: 'feet' })
      return
    }
    const cell = cellAt(at)
    if (!cell) {
      if (inBox(at, GRASS)) {
        const node = grassNode(Math.max(BURROW.c - 1, Math.min(COLS - 1, Math.floor((at.x - HILL.x) / CELL))))
        this.push({ type: 'knock', kind: 'grass', index: node, at })
        this.go(node, null)
      } else this.push({ type: 'print', at })
      return
    }
    const index = indexOf(cell.c, cell.r)
    this.push({ type: 'knock', kind: this.knockKind(index), index, at, colour: world.lode[index] ?? undefined })
    const dweller = this.dwellerUnder(at)
    if (dweller) this.push({ type: 'poke', who: dweller.kind, index: dweller.at })
    this.go(index, null)
  }

  private knockKind(index: number): KnockKind {
    const kind = this.world.kinds[index]
    if (this.world.lode[index]) return 'gem'
    return kind === 'boulder' ? 'granite' : kind === 'spout' ? 'water' : kind
  }

  private go(node: number, errand: Errand | null): void {
    this.point(node)
    this.errand = errand
    this.held = true
    this.blows = Infinity
    if (this.mole.mode === 'rest') this.decide()
  }

  private lift(gem: Gem, at: Point): void {
    this.aim = null
    this.errand = null
    this.hand = { gem, x: at.x, y: at.y, moved: false }
    this.carryAt = gem.at
    this.push({ type: 'gemring', colour: gem.colour, index: gem.at })
  }

  /** The light on every block now: a gem the finger carries lights the dug block it is carried over, and nothing while it is over rock or the grass. */
  private lit(): number[] {
    const hand = this.hand
    if (!hand || this.carryAt === null) return lightOf(this.world)
    const gem = hand.gem, at = gem.at, rest = gem.rest
    gem.at = this.carryAt
    gem.rest = 'floor'
    const masks = lightOf(this.world)
    gem.at = at
    gem.rest = rest
    return masks
  }

  private pokeMole(): void {
    const mole = this.mole, world = this.world
    this.aim = null
    this.errand = null
    this.push({ type: 'poke', who: 'mole', index: world.mole.at })
    // His hat goes over his eyes whatever he holds, and a tool in his paws is set down.
    mole.hat = HAT_S
    if (world.mole.tool && mole.mode === 'rest') this.begin('put', world.mole.at)
  }

  /** The finger moved while down. A carried gem goes with it; otherwise the mole follows it. A move into the grown-up's corner is none. */
  drag(at: Point, inCorner = false): void {
    if (inCorner) return
    if (this.hand) {
      this.hand.x = at.x
      this.hand.y = at.y
      this.hand.moved = true
      // The gem is drawn above the finger, and lights the dug block it is drawn in.
      const cell = cellAt({ x: at.x, y: at.y - CARRY_UP })
      const over = cell && this.world.kinds[indexOf(cell.c, cell.r)] === 'open' ? indexOf(cell.c, cell.r) : grassNode(COLS - 1)
      if (over !== this.carryAt) { this.carryAt = over; this.refresh() }
      return
    }
    if (!this.held) return
    this.mole.look = at
    const node = !cellAt(at) && inBox(at, GRASS) ? grassNode(Math.max(BURROW.c - 1, Math.min(COLS - 1, Math.floor((at.x - HILL.x) / CELL)))) : indexOf(nearestCell(at).c, nearestCell(at).r)
    if (node === this.aim) return
    // The finger has gone on to another block: an errand is dropped, and a tool may be used again.
    if (this.errand) { if (this.errand.type === 'fetch' && node === this.world.tools[this.errand.tool]) return; this.errand = null }
    if (node !== this.spent) this.spent = null
    if (node === this.spent) this.aim = null
    else this.point(node)
  }

  /** The finger points at a node. What a bucket or a rope does to dug space, it does only to space that was dug when the finger came to it. */
  private point(node: number): void {
    this.aim = node
    this.wasOpen = !isGrass(node) && this.world.kinds[node] === 'open'
  }
  private wasOpen = false

  /**
   * The finger is up. `tap` and `drop` are the child's own; `cancel` is a finger that was taken away, which makes
   * no move. A carried gem is set down where it was let go, or goes back where it was taken from. The mole
   * finishes what he has begun; after a tap he still walks toward the place through what is dug, and does one
   * thing to the first block in his way.
   */
  release(how: 'tap' | 'drop' | 'cancel', at?: Point, inCorner = false): void {
    // A finger that stayed down and then lifts where it landed held; it did not tap.
    if (how === 'tap' && this.time - this.pressedAt > TAP_S) how = 'drop'
    const hand = this.hand
    if (hand) {
      this.hand = null
      this.carryAt = null
      if (how === 'drop') {
        if (hand.moved && at && !inCorner && this.setDown(hand.gem, at)) return
        // Let go where it cannot lie and has nowhere near to drop to, it flies back to where it was taken from.
        this.flyBack(hand.gem, { x: hand.x, y: hand.y - CARRY_UP })
      }
      // The gem is back where it was taken from, and its light with it.
      this.refresh()
      if (how === 'tap') {
        // A tap on a gem sends the mole to it with what he holds.
        this.aim = hand.gem.at
        this.errand = { type: 'use', gem: hand.gem }
        this.blows = Infinity
        if (this.mole.mode === 'rest') this.decide()
      }
      return
    }
    if (!this.held) return
    this.held = false
    this.spent = null
    if (this.aim === null) return
    // Only a tap sends him on: a finger that lifts out of a hold or a slide stops the work where it is, an errand
    // to a tool, to the lift or to the mammoth's feet included.
    if (how !== 'tap') {
      // An errand that a hold lets go of is not run: he stops and looks back over his shoulder.
      if (this.errand && how === 'drop') this.lookBack()
      this.aim = null
      this.errand = null
      return
    }
    // An errand whose last step waited for the finger to lift is run now.
    if (this.errand) { if (this.mole.mode === 'rest') this.decide(); return }
    // After a tap he walks there through what is dug and lands one blow on the first block in his way, wherever
    // the tap was; a blow the tap itself began is that blow. A tap that came down during the blow of the tap
    // before has its own blow in hand, one at the most, and gives it when that blow has landed.
    this.blows = this.struck ? 0 : 1
  }

  /** He looks back over his shoulder, at the child: he stands turned round for a moment, with a small questioning sound of his own. */
  private lookBack(): void {
    const mole = this.mole
    mole.look = { x: mole.x - mole.face * 200, y: mole.y - 70 }
    if (mole.back <= 0) this.push({ type: 'hm' })
    mole.back = LOOK_BACK_S
  }

  /**
   * An errand is run only by a tap. With the finger still down where the errand's last step begins he waits for
   * it to lift; a finger that has stayed down longer than a tap makes him look back and let the errand be. Says
   * whether the errand may be run now.
   */
  private tapped(): boolean {
    if (!this.held) return true
    if (this.time - this.pressedAt > TAP_S) { this.lookBack(); this.stop() }
    return false
  }

  /**
   * A gem let go by the finger, in the block it is drawn in, which is above the finger: beside a wall of a dug
   * block it is set in that wall, elsewhere in dug space it drops to the floor. On a floor where a gem already
   * lies it lands on that one and comes to rest beside it, on the floor of the dug block to either side. Over
   * rock it drops into the dug block under it or to either side, and over the grass into a shaft that is open
   * under it. Where it has none of these it flies back to where it was taken from. Says whether it was set down.
   */
  private setDown(gem: Gem, finger: Point): boolean {
    const world = this.world
    const at = { x: finger.x, y: finger.y - CARRY_UP }
    const cell = cellAt(at)
    const taken = (rest: Rest, where: number): boolean => gemsIn(world, where).some((other) => other !== gem && other.rest === rest)
    const dug = (c: number, r: number): number => (inHill(c, r) && world.kinds[indexOf(c, r)] === 'open' ? indexOf(c, r) : -1)
    /** The free floor under the first of these dug blocks that has one. */
    const freeFloor = (blocks: number[]): number => {
      for (const block of blocks) if (block >= 0 && !taken('floor', floorUnder(world, block))) return floorUnder(world, block)
      return -1
    }
    let rest: Rest = 'floor', land = -1, off: number | null = null
    if (cell && world.kinds[indexOf(cell.c, cell.r)] === 'open') {
      const index = indexOf(cell.c, cell.r)
      const x = at.x - (HILL.x + cell.c * CELL)
      const wall = (dc: number): boolean => cell.c + dc < 0 || cell.c + dc >= COLS || world.kinds[index + dc] !== 'open'
      rest = x < CELL * 0.34 && wall(-1) ? 'left' : x > CELL * 0.66 && wall(1) ? 'right' : 'floor'
      if (rest !== 'floor' && taken(rest, index)) rest = 'floor'
      land = rest === 'floor' ? floorUnder(world, index) : index
      if (rest === 'floor' && taken('floor', land)) {
        // The child is putting two gems together: this one lands on the one that lies there and rolls off beside it, to the side the finger is on first.
        const lies = cellOf(land), side = x < CELL / 2 ? -1 : 1
        off = land
        land = freeFloor([dug(lies.c + side, lies.r), dug(lies.c - side, lies.r)])
      }
    } else if (cell) {
      // Over rock: into the dug block under it, or the one to either side, the nearer side first.
      const side = at.x - (HILL.x + cell.c * CELL) < CELL / 2 ? -1 : 1
      land = freeFloor([dug(cell.c, cell.r + 1), dug(cell.c + side, cell.r), dug(cell.c - side, cell.r)])
    } else if (inBox(at, GRASS) && at.x >= HILL.x && at.x < HILL.x + COLS * CELL) {
      // Over the grass: down a shaft that is open under it.
      land = freeFloor([dug(Math.floor((at.x - HILL.x) / CELL), 0)])
    }
    if (land < 0) return false
    const was = gem.rest, from = gem.at
    this.motions = this.motions.filter((motion) => motion.gem !== gem)
    if (off !== null) {
      // Where it strikes the gem that lies there, before it rolls off.
      gem.at = off
      gem.rest = 'floor'
      const strikes = gemSpot(world, gem)
      gem.at = land
      const spot = gemSpot(world, gem)
      const first = fallTime(strikes.y - GEM_R - at.y), length = first + 0.3 + fallTime(spot.y - strikes.y) / 2
      this.motions.push({ what: 'gem', gem, to: land, dx: at.x - spot.x, dy: at.y - spot.y, t: 0, length, how: 'pop', via: { dx: strikes.x - spot.x, dy: strikes.y - GEM_R - spot.y, at: first }, cues: [{ at: first, event: { type: 'tik', index: off } }, { at: length, event: { type: 'tik', index: land } }] })
    } else {
      gem.at = land
      gem.rest = rest
      if (rest === 'floor') {
        const spot = gemSpot(world, gem)
        const length = fallTime(spot.y - at.y)
        this.motions.push({ what: 'gem', gem, to: land, dx: at.x - spot.x, dy: at.y - spot.y, t: 0, length, how: 'fall', cues: [{ at: length, event: { type: 'tik', index: land } }] })
      } else this.push({ type: 'tock', index: land })
    }
    if (was === 'hung') this.dropRope(from)
    this.touched('soon')
    this.afterChange()
    return true
  }

  /** A gem that could not be set down flies back in an arc to where it was taken from, and is heard arriving: a tik on a floor, a tock in a wall or on the rope. */
  private flyBack(gem: Gem, from: Point): void {
    const spot = gemSpot(this.world, gem)
    const length = 0.26 + Math.min(0.3, Math.hypot(from.x - spot.x, from.y - spot.y) / 1600)
    this.motions = this.motions.filter((motion) => motion.gem !== gem)
    this.motions.push({ what: 'gem', gem, to: gem.at, dx: from.x - spot.x, dy: from.y - spot.y, t: 0, length, how: 'arc', cues: [{ at: length, event: { type: gem.rest === 'floor' ? 'tik' : 'tock', index: gem.at } }] })
  }

  /** The rope that held a lamp up lets go and drops: to the floor under it, or beside the tool that lies there. */
  private dropRope(from: number): void {
    const world = this.world
    const { to, over } = toolFall(world, 'rope', from)
    world.tools.rope = to
    this.toolFalls({ tool: 'rope', from, to, over, letGo: true })
  }

  /**
   * A tool on its way down, seen all the way and heard landing. One that comes down on a tool lying there is
   * heard on it, and then hops to where it comes to rest. The rope a lamp let go starts from the roof of its block.
   */
  private toolFalls(moved: Settled['tools'][number]): void {
    const start = toolSpot(moved.from), rest = toolRest(this.world, moved.tool)
    const up = moved.letGo ? 50 : 0
    this.motions = this.motions.filter((motion) => motion.tool !== moved.tool)
    if (moved.over === null) {
      const length = fallTime(rest.y - start.y + up)
      this.motions.push({ what: 'tool', tool: moved.tool, to: moved.to, dx: start.x - rest.x, dy: start.y - up - rest.y, t: 0, length, how: 'fall', cues: [{ at: length, event: { type: 'clunk', index: moved.to } }] })
      return
    }
    const strikes = toolSpot(moved.over)
    const first = fallTime(strikes.y - start.y + up), length = first + 0.3 + fallTime(rest.y - strikes.y) / 2
    this.motions.push({ what: 'tool', tool: moved.tool, to: moved.to, dx: start.x - rest.x, dy: start.y - up - rest.y, t: 0, length, how: 'fall', via: { dx: strikes.x - rest.x, dy: strikes.y - 14 - rest.y, at: first }, cues: [{ at: first, event: { type: 'clunk', index: moved.over } }, { at: length, event: { type: 'clunk', index: moved.to } }] })
  }

  // --- Time -----------------------------------------------------------------------------------------------------

  /** Plays `dt` seconds. */
  step(dt: number): void {
    this.time += dt
    const mole = this.mole
    mole.hat = Math.max(0, mole.hat - dt)
    mole.cross = Math.max(0, mole.cross - dt)
    mole.back = mole.mode === 'rest' ? Math.max(0, mole.back - dt) : 0
    if (this.backed && this.time - this.backed.at >= EASE_S) this.backed = null
    if (this.swept && this.time - this.swept.at >= EASE_S) this.swept = null
    this.stepMotions(dt)
    this.stepDrips(dt)
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.endScene()
      this.stance()
      return
    }
    mole.t += dt
    if (mole.mode === 'walk') this.stepWalk()
    else if (mole.mode === 'act') this.stepAct()
    else if (this.aim !== null) this.decide()
    this.stance()
  }

  private stepWalk(): void {
    const mole = this.mole, world = this.world
    const from = feet(world.mole.at), to = feet(mole.to)
    const k = Math.min(1, mole.t / WALK_S)
    mole.x = from.x + (to.x - from.x) * k
    mole.y = from.y + (to.y - from.y) * k
    if (k < 1) return
    const left = world.mole.at
    world.mole.at = mole.to
    const wade = !isGrass(mole.to) && world.water[mole.to]
    this.push({ type: 'step', node: mole.to, wade, slop: world.mole.tool === 'bucket' && world.mole.load === 'water' })
    if (wade && world.mole.sooty) { world.mole.sooty = false; this.push({ type: 'wash' }) }
    this.touched('soon')
    this.rest()
    this.afterChange()
    if (this.scene) return
    // Out of the water onto dry ground he shakes himself like a dog.
    if (!wade && !isGrass(left) && world.water[left]) return this.begin('shake', mole.to)
    this.decide()
  }

  private stepAct(): void {
    const mole = this.mole
    const act = mole.act!
    if (act === 'float') return this.stepFloat()
    const cues: readonly number[] = ACTS[act].cues
    while (mole.mode === 'act' && mole.act === act && this.fired < cues.length && mole.t >= cues[this.fired]) {
      this.fired += 1
      this.cue(act, this.fired - 1)
      if (this.scene) return
    }
    if (mole.mode !== 'act' || mole.act !== act) return
    // A rope in a gas pocket sways and hisses for as long as the finger holds it there.
    if (act === 'ropeCharm' && this.held && this.aim === null && this.charmed) {
      if (mole.t >= this.nextHiss) { this.nextHiss += CHARM_EVERY_S; this.push({ type: 'charm', index: mole.to }) }
      return
    }
    if (mole.t < mole.length) return
    if (act === 'ventMake') {
      this.world.kinds[mole.to] = 'open'
      this.touched('soon')
      this.rest()
      this.afterChange()
      if (this.scene) return
    } else this.rest()
    this.decide()
  }

  private fired = 0
  private charmed = false
  private nextHiss = 0
  private floatPath: number[] = []

  private stepFloat(): void {
    const mole = this.mole, world = this.world
    const done = Math.min(this.floatPath.length, Math.floor(mole.t / FLOAT_S))
    while (this.fired < done) {
      world.mole.at = this.floatPath[this.fired]
      this.fired += 1
      this.touched('soon')
      this.afterChange()
    }
    const from = this.fired === 0 ? feet(this.floatFrom) : feet(this.floatPath[this.fired - 1])
    const next = this.fired < this.floatPath.length ? feet(this.floatPath[this.fired]) : from
    const k = this.fired < this.floatPath.length ? (mole.t - this.fired * FLOAT_S) / FLOAT_S : 0
    mole.x = from.x + (next.x - from.x) * k
    mole.y = from.y + (next.y - from.y) * k
    if (mole.t >= mole.length - 0.3 && mole.afloat) {
      mole.afloat = false
      this.push({ type: 'burp' })
    }
    if (mole.t >= mole.length) { this.rest(); this.decide() }
  }
  private floatFrom = 0

  private stepMotions(dt: number): void {
    for (let i = this.motions.length - 1; i >= 0; i--) {
      const motion = this.motions[i]
      motion.t += dt
      while (motion.cues.length > 0 && motion.t >= motion.cues[0].at) this.push(motion.cues.shift()!.event)
      if (motion.t >= motion.length) this.motions.splice(i, 1)
    }
    if (this.staging.lap) {
      this.staging.lap.k += dt / LAP_S
      if (this.staging.lap.k >= 1 && !this.scene) this.staging.lap = null
    }
  }

  /**
   * Each spout lets a drop go every few seconds. Over a dug block it is heard where it lands, on the floor below;
   * over rock it runs down the spout's own face and is heard there, so a spout is never still and silent.
   */
  private stepDrips(dt: number): void {
    const world = this.world
    for (let index = 0; index < BLOCKS; index++) {
      if (world.kinds[index] !== 'spout') { if (this.drips.has(index)) this.drips.delete(index); continue }
      const was = this.drips.get(index) ?? -((index * 0.37) % 1) * DRIP_S
      let now = was + dt
      if (now >= DRIP_S) {
        now -= DRIP_S
        if (!this.scene) this.push({ type: 'plink', index: index + COLS < BLOCKS && world.kinds[index + COLS] === 'open' ? index + COLS : index })
      }
      this.drips.set(index, now)
    }
  }

  /** What follows from where he stands: white light on him, a lamp hanging in his block. */
  private stance(): void {
    const mole = this.mole, at = this.world.mole.at
    mole.dazzled = !isGrass(at) && this.masks[at] === 7
    const near = [at, mole.mode === 'walk' ? mole.to : at]
    mole.duck = this.world.gems.some((gem) => gem.rest === 'hung' && near.includes(gem.at))
  }

  private rest(): void {
    const mole = this.mole
    const stand = feet(this.world.mole.at)
    mole.mode = 'rest'
    mole.act = null
    mole.t = 0
    mole.length = 0
    mole.to = this.world.mole.at
    mole.x = stand.x
    mole.y = stand.y
    mole.afloat = false
    this.charmed = false
  }

  private begin(act: ActName, to: number, length: number = ACTS[act].length): void {
    const mole = this.mole
    mole.mode = 'act'
    mole.act = act
    mole.t = 0
    mole.length = length
    mole.to = to
    this.fired = 0
    this.face(to)
  }

  private face(to: number): void {
    const dc = colOf(to) - colOf(this.world.mole.at)
    if (dc !== 0) this.mole.face = dc > 0 ? 1 : -1
  }

  private push(event: Event): void {
    // While a touch ends a scene nothing sounds: what the scene's end sets going lands unheard too.
    if (this.quiet) return
    this.queue.push(event)
  }

  private touched(how: 'soon' | 'now'): void {
    if (how === 'now' || this.dirty === 'no') this.dirty = how
  }

  // --- What he does next ----------------------------------------------------------------------------------------

  private decide(): void {
    const mole = this.mole, world = this.world
    if (this.scene || this.aim === null || mole.mode !== 'rest') return
    const aim = this.aim, at = world.mole.at
    const move = nextMove(world, at, aim)
    if (move.type === 'stay') {
      if (at === aim) this.arrived()
      else if (!this.held) this.stop()
      return
    }
    if (move.type === 'walk') {
      // Only a tap sends him into the cage: under a finger that is still down he stops in front of it.
      if (move.to === CAGE && this.errand?.type === 'cage' && !this.tapped()) return
      // A dug block the finger points at may hold something the tool in his paws is for.
      const use = move.to === aim ? this.useOnOpen(aim) : null
      if (use) return this.work(use.act, aim, use.gem)
      mole.mode = 'walk'
      mole.t = 0
      mole.to = move.to
      this.face(move.to)
      return
    }
    // On an errand he digs his way with the pick, but a pocket is the child's to open: he stops in front of it and looks back.
    const inWay = world.kinds[move.at]
    if (this.errand && (inWay === 'water' || inWay === 'spout' || inWay === 'gas')) {
      this.face(move.at)
      this.lookBack()
      return this.stop()
    }
    // A block is in his way. The tool he holds is for the block the finger points at; the pick is for the rest.
    const act = move.at === aim && !this.errand ? this.useOnSolid(move.at) : 'swing'
    this.work(act, move.at)
  }

  private stop(): void {
    this.aim = null
    this.errand = null
  }

  private work(act: ActName, at: number, gem: Gem | null = null): void {
    if (this.blows <= 0) return this.stop()
    this.blows -= 1
    if (this.held) this.struck = true
    const world = this.world
    this.target = gem
    this.mole.n = act === 'swing' && world.kinds[at] === 'sandstone' ? world.hits[at] + 1 : act === 'mallet' ? (world.kinds[at] === 'boulder' ? BLOWS.granite : world.hits[at] + 1) : 0
    this.begin(act, at)
    if (act === 'ropeCharm') { this.charmed = true; this.nextHiss = ACTS.ropeCharm.cues[0] + CHARM_EVERY_S }
    // Every use of a tool is one use: the finger moves on, or comes down again, before the next. The pick and
    // the mallet go on for as long as the finger stays.
    const goesOn = (act === 'swing' && !gem) || (act === 'mallet' && world.kinds[at] === 'granite' && world.hits[at] + 1 < BLOWS.granite)
    if (!goesOn) {
      // Only a finger that is still down has a block to move on from.
      if (this.held) this.spent = at
      if (this.errand?.type === 'use' || !this.held) this.errand = null
      this.aim = null
    }
  }

  /** He stands where the finger pointed, or where his errand took him. */
  private arrived(): void {
    const world = this.world, errand = this.errand
    // Only a tap sends him on to fetch or to tip the water out.
    if (errand && errand.type !== 'use' && !this.tapped()) return
    this.aim = null
    this.errand = null
    if (!errand) return
    if (errand.type === 'cage') {
      if (errand.ride) this.startRide()
    } else if (errand.type === 'fetch') {
      if (world.mole.tool !== errand.tool && world.tools[errand.tool] === world.mole.at) this.begin('take', world.mole.at)
    } else if (errand.type === 'feet') {
      if (world.mole.tool === 'bucket' && world.mole.load === 'water') { this.mole.face = -1; this.begin('tipFeet', world.mole.at) }
    } else if (errand.type === 'use') {
      this.errand = errand
      const use = this.useOnOpen(world.mole.at)
      this.errand = null
      if (use?.gem) { this.blows = 1; this.work(use.act, world.mole.at, use.gem) }
    }
  }

  /** What the tool in his paws does to a block of the hill. */
  private useOnSolid(index: number): ActName {
    const world = this.world, kind = world.kinds[index], tool = world.mole.tool
    if (tool === 'wedge') return kind === 'earth' ? 'wedgeEarth' : kind === 'sandstone' ? 'wedgeSplit' : kind === 'granite' || kind === 'boulder' ? 'mallet' : kind === 'gas' ? 'ventMake' : 'spoutMake'
    if (tool === 'bucket') {
      if (kind === 'granite' || kind === 'boulder') return 'gong'
      // A bucket that is full scoops nothing more: until it is tipped out, the pick does the digging.
      if (world.mole.load !== 'nothing') return 'swing'
      return kind === 'earth' ? 'scoop' : kind === 'sandstone' ? 'scoopSand' : kind === 'gas' ? 'catchGas' : 'plipDrop'
    }
    if (tool === 'rope') return kind === 'earth' ? 'ropeEarth' : kind === 'sandstone' ? 'ropeSaw' : kind === 'granite' ? 'ropeTwang' : kind === 'boulder' ? 'haul' : kind === 'gas' ? 'ropeCharm' : 'ropeSlap'
    return 'swing'
  }

  /**
   * What he does to a dug block the finger points at, when it holds something his pick or his tool is for; null
   * when he just walks in. A gem is worked on only when the child has tapped that gem.
   */
  private useOnOpen(index: number): { act: ActName; gem: Gem | null } | null {
    const world = this.world, tool = world.mole.tool, load = world.mole.load
    if (isGrass(index) || world.kinds[index] !== 'open' || index === this.spent) return null
    const wanted = this.errand?.type === 'use' ? this.errand.gem : null
    if (wanted && world.gems.includes(wanted) && wanted.rest !== 'bucket' && wanted.at === index) {
      const full = tool === 'bucket' && load !== 'nothing'
      return { act: tool === 'wedge' ? 'prise' : tool === 'bucket' && !full ? 'scoopGem' : tool === 'rope' ? 'hang' : 'swing', gem: wanted }
    }
    if (index === world.mole.at || !this.wasOpen) return null
    if (tool === 'bucket' && load !== 'nothing') {
      // Nothing is tipped onto a tool, and earth has no room at the burrow or under a hung lamp: he shakes his head and pats it back in.
      if (toolAt(world, index) !== null || (load === 'earth' && !canPack(world, index))) return { act: 'refuse', gem: null }
      return { act: 'tip', gem: null }
    }
    if (world.water[index]) return tool === 'bucket' ? { act: 'fillWater', gem: null } : tool === 'rope' ? { act: 'ropeBob', gem: null } : null
    return null
  }
  /** The gem the act in hand is for. */
  private target: Gem | null = null

  // --- The moment each act lands ----------------------------------------------------------------------------------

  private cue(act: ActName, k: number): void {
    const mole = this.mole, world = this.world, at = mole.to
    const from = { x: mole.x, y: mole.y - CELL / 2 + 6 }
    switch (act) {
      case 'swing': return this.land(at, from)
      case 'wedgeEarth':
        this.push(k === 0 ? { type: 'squelch', index: at } : k === 1 ? { type: 'pop', index: at } : { type: 'sit' })
        return
      case 'wedgeSplit': {
        const kind = world.kinds[at]
        if (kind !== 'sandstone') return
        const colour = takeGround(world, at)
        this.push({ type: 'split', index: at })
        this.freed(colour, at)
        this.touched('soon')
        return this.afterChange()
      }
      case 'mallet': {
        if (world.kinds[at] === 'boulder') { this.push({ type: 'ring', index: at, n: BLOWS.granite, loose: true }); return }
        if (world.kinds[at] !== 'granite') return
        world.hits[at] += 1
        this.push({ type: 'ring', index: at, n: world.hits[at], loose: false })
        if (world.hits[at] >= BLOWS.granite) {
          world.kinds[at] = 'boulder'
          world.hits[at] = 0
          this.push({ type: 'boom', index: at })
        }
        this.touched('soon')
        return this.afterChange()
      }
      case 'spoutMake':
        if (world.kinds[at] === 'water') { world.kinds[at] = 'spout'; this.touched('soon') }
        this.push({ type: 'jet', index: at })
        return this.afterChange()
      case 'ventMake':
        this.push({ type: 'whistle', index: at })
        return
      case 'prise': {
        const gem = this.target
        if (k === 1) { this.push({ type: 'ding' }); return }
        if (!gem || !world.gems.includes(gem) || gem.rest === 'bucket') return
        const spot = gemSpot(world, gem)
        if (gem.rest === 'hung') this.dropRope(gem.at)
        gem.rest = 'floor'
        gem.at = floorUnder(world, gem.at)
        const lands = gemSpot(world, gem)
        this.push({ type: 'prise', colour: gem.colour, index: gem.at })
        // It flies to his hat, which it strikes as the ding sounds, and drops from there to the floor.
        const strikes = ACTS.prise.cues[1] - ACTS.prise.cues[0]
        const hat = { x: mole.x + mole.face * HAT_AT.x, y: mole.y + HAT_AT.y }
        this.motions.push({ what: 'gem', gem, to: gem.at, dx: spot.x - lands.x, dy: spot.y - lands.y, t: 0, length: 0.6, how: 'pop', via: { dx: hat.x - lands.x, dy: hat.y - lands.y, at: strikes }, cues: [{ at: 0.6, event: { type: 'tik', index: gem.at } }] })
        this.touched('soon')
        return this.afterChange()
      }
      case 'scoop': {
        if (world.kinds[at] !== 'earth' || world.mole.load !== 'nothing') return
        const colour = takeGround(world, at)
        world.mole.load = 'earth'
        this.push({ type: 'scoop', index: at, what: 'earth' })
        this.freed(colour, at)
        this.touched('soon')
        return this.afterChange()
      }
      case 'scoopSand':
        if (world.mole.load !== 'nothing') return
        world.mole.load = 'sand'
        this.push({ type: 'scoop', index: at, what: 'sand' })
        this.touched('soon')
        return
      case 'gong':
        this.push(k === 0 ? { type: 'gong', index: at } : { type: 'teeth' })
        return
      case 'fillWater':
        if (!world.water[at] || world.mole.load !== 'nothing') return
        world.water[at] = false
        world.mole.load = 'water'
        this.push({ type: 'bloop', index: at })
        this.touched('soon')
        return this.afterChange()
      case 'plipDrop':
        this.push({ type: 'plip', index: at })
        return
      case 'catchGas': {
        if (world.kinds[at] !== 'gas') return
        world.kinds[at] = 'open'
        this.push({ type: 'fff', index: at })
        this.touched('soon')
        this.afterChange()
        if (this.scene) return
        // The gas carries the bucket up the dug space over him, and him with it.
        const top = roofOver(world, world.mole.at)
        this.floatFrom = world.mole.at
        this.floatPath = []
        for (let b = world.mole.at - COLS; b >= top; b -= COLS) this.floatPath.push(b)
        this.begin('float', top, this.floatPath.length * FLOAT_S + 0.6)
        this.mole.afloat = true
        return
      }
      case 'scoopGem': {
        const gem = this.target
        if (!gem || !world.gems.includes(gem) || gem.rest === 'bucket' || world.mole.load !== 'nothing') return
        if (gem.rest === 'hung') this.dropRope(gem.at)
        gem.rest = 'bucket'
        world.mole.load = gem.colour
        this.push({ type: 'clink' })
        this.touched('soon')
        return this.afterChange()
      }
      case 'tip': return this.tip(at)
      case 'refuse':
        this.push({ type: 'pat', index: at })
        return
      case 'ropeEarth':
        this.push(k === 0 ? { type: 'ropehiss', index: at } : { type: 'worm', index: at })
        return
      case 'ropeSaw':
        this.push({ type: 'zip', n: k + 1 })
        return
      case 'ropeTwang':
        this.push(k === 0 ? { type: 'twang', index: at } : { type: 'flop' })
        return
      case 'haul': return k === 0 ? this.tie(at) : this.heave(at)
      case 'ropeBob':
        this.push(k < 2 ? { type: 'bip', n: k + 1 } : { type: 'trickle' })
        return
      case 'ropeSlap':
        this.push({ type: 'plap', index: at })
        return
      case 'ropeCharm':
        this.push({ type: 'charm', index: at })
        return
      case 'hang': {
        const gem = this.target
        if (!gem || !world.gems.includes(gem) || gem.rest === 'bucket' || world.mole.tool !== 'rope') return
        gem.at = roofOver(world, gem.at)
        gem.rest = 'hung'
        world.tools.rope = gem.at
        world.mole.tool = null
        world.tied = null
        this.push({ type: 'hang', index: gem.at })
        this.touched('soon')
        return this.afterChange()
      }
      case 'take':
      case 'put': return this.swap()
      case 'shake':
        this.push({ type: 'flap', n: k + 1 })
        return
      case 'tipFeet':
        if (k === 0) {
          if (world.mole.load !== 'water') return
          world.mole.load = 'nothing'
          this.push({ type: 'tip', index: world.mole.at, what: 'water' })
          this.touched('soon')
        } else if (k === 1) this.push({ type: 'slurp' })
        else {
          // Blown back over the mole: he is soaked, and the soot is gone.
          this.push({ type: 'spray' })
          if (world.mole.sooty) { world.mole.sooty = false; this.touched('soon') }
        }
        return
      case 'judder':
      case 'float':
        return
    }
  }

  /** The pick comes down on the block he swung at, or on a gem that lies free in it. */
  private land(at: number, from: Point): void {
    const mole = this.mole, world = this.world
    const kind = world.kinds[at]
    if (kind === 'open') {
      const gem = this.target
      if (gem && world.gems.includes(gem) && gem.rest !== 'bucket') {
        this.push({ type: 'chime', colour: gem.colour, index: gem.at })
        this.motions = this.motions.filter((motion) => motion.gem !== gem)
        this.motions.push({ what: 'gem', gem, to: gem.at, dx: 0, dy: 0, t: 0, length: 1.2, how: 'spin', cues: [] })
      }
      return
    }
    if (kind === 'granite' || kind === 'boulder') {
      this.push({ type: 'clang', index: at, from })
      const aside = this.aside(at)
      if (aside !== null) this.blow(aside, true, from)
      if (this.scene) return
      mole.mode = 'act'
      mole.act = 'judder'
      mole.t = 0
      mole.length = ACTS.judder.length
      this.fired = 0
      return
    }
    this.blow(at, false, from)
  }

  private blow(index: number, aside: boolean, from: Point): void {
    const world = this.world, kind = world.kinds[index]
    if (kind === 'water' || kind === 'spout') return this.startRun({ pocket: index })
    if (kind === 'gas') return this.startBlast(index)
    if (!isGround(kind)) return
    const hits = world.hits[index] + 1
    this.touched('soon')
    if (hits < BLOWS[kind]) {
      world.hits[index] = hits
      this.push({ type: 'chip', kind, index, n: hits, aside, from })
      return
    }
    const colour = takeGround(world, index)
    this.push({ type: 'break', kind, index, n: hits, aside, from })
    this.freed(colour, index)
    this.afterChange()
  }

  /** A gem whose block has gone springs free with a ping, bounces twice and lies shining. */
  private freed(colour: Colour | null, index: number): void {
    if (!colour) return
    const gem = this.world.gems[this.world.gems.length - 1]
    this.push({ type: 'ping', colour, index })
    this.motions.push({ what: 'gem', gem, to: index, dx: 0, dy: -(CELL / 2 - GEM_R), t: 0, length: 0.62, how: 'spring', cues: [{ at: 0.3, event: { type: 'tik', index } }, { at: 0.5, event: { type: 'tik', index } }] })
  }

  /**
   * Where a blow goes that granite turned aside: onto a block beside the mole that the pick can open. A sideways
   * swing skids down before up; a swing up or down skids to the side the mole faces before the other.
   */
  private aside(granite: number): number | null {
    const mole = this.mole, at = this.world.mole.at
    if (isGrass(at)) return null
    const { c, r } = cellOf(at)
    const sideways = Math.abs(granite - at) === 1
    const tries = sideways ? [[0, 1], [0, -1]] : [[mole.face, 0], [-mole.face, 0]]
    for (const [dc, dr] of tries) {
      const cc = c + dc, rr = r + dr
      if (!inHill(cc, rr)) continue
      const kind = this.world.kinds[indexOf(cc, rr)]
      if (kind !== 'open' && kind !== 'granite' && kind !== 'boulder') return indexOf(cc, rr)
    }
    return null
  }

  /** The bucket is tipped out into a dug block. */
  private tip(at: number): void {
    const world = this.world, load = world.mole.load
    if (load === 'nothing') return
    if (load === 'water') return this.startRun({ tip: at })
    // Earth that has lost its room since he lifted the bucket stays in it.
    if (load === 'earth' && !canPack(world, at)) { this.push({ type: 'pat', index: at }); return }
    world.mole.load = 'nothing'
    this.touched('soon')
    if (load === 'earth') {
      // It packs into a block wherever it has room, in standing water too: the earth takes the water up.
      // One gem that lay there is in the earth again; any other is pushed out by the earth and seen going, in an arc, to the floor it lands on.
      const lay = new Map(gemsIn(world, at).map((gem) => [gem, gemSpot(world, gem)]))
      for (const { gem, to } of pack(world, at)) {
        const from = lay.get(gem)!, spot = gemSpot(world, gem)
        const length = 0.3 + fallTime(Math.max(0, spot.y - from.y)) / 2
        this.motions = this.motions.filter((motion) => motion.gem !== gem)
        this.motions.push({ what: 'gem', gem, to, dx: from.x - spot.x, dy: from.y - spot.y, t: 0, length, how: 'arc', cues: [{ at: length, event: { type: 'tik', index: to } }] })
      }
      this.motions = this.motions.filter((motion) => !motion.gem || world.gems.includes(motion.gem))
      this.push({ type: 'tip', index: at, what: 'earth' })
    } else if (load === 'sand') this.push({ type: 'tip', index: at, what: 'sand' })
    else if (isColour(load)) {
      const gem = world.gems.find((other) => other.rest === 'bucket')
      if (gem) {
        const from = feet(world.mole.at)
        gem.rest = 'floor'
        gem.at = floorUnder(world, at)
        const spot = gemSpot(world, gem)
        const length = fallTime(Math.abs(spot.y - (from.y - 40)))
        this.push({ type: 'clink' })
        this.motions.push({ what: 'gem', gem, to: gem.at, dx: from.x - spot.x, dy: from.y - 40 - spot.y, t: 0, length, how: 'fall', cues: [{ at: length, event: { type: 'tik', index: gem.at } }] })
      }
    }
    this.afterChange()
  }

  /** The rope is tied to a loose boulder. */
  private tie(at: number): void {
    if (this.world.kinds[at] !== 'boulder') return
    this.world.tied = at
    this.push({ type: 'creak', index: at })
    this.touched('soon')
  }

  /** One heave: the boulder comes one block toward the mole, who steps back to make room, when there is room behind him. */
  private heave(at: number): void {
    const world = this.world, here = world.mole.at
    if (world.kinds[at] !== 'boulder' || isGrass(here)) return
    const a = cellOf(at), m = cellOf(here)
    const dc = m.c - a.c, dr = m.r - a.r
    const bc = m.c + dc, br = m.r + dr
    const behind = inHill(bc, br) ? indexOf(bc, br) : -1
    // There is room for it where he stands when there is room for him behind, and nothing lies or stands where he is: no gem, no tool, no water.
    const room = behind >= 0 && world.kinds[behind] === 'open' && gemsIn(world, here).length === 0 && toolAt(world, here) === null && !world.water[here]
    if (!room) { this.push({ type: 'strain', index: at }); return }
    world.kinds[at] = 'open'
    world.kinds[here] = 'boulder'
    world.mole.at = behind
    world.tied = here
    this.push({ type: 'rumble', from: at, to: here })
    this.motions.push({ what: 'boulder', to: here, dx: -dc * CELL, dy: -dr * CELL, t: 0, length: 0.3, how: 'slide', cues: [] })
    // He backs off as it comes.
    const stand = feet(behind)
    this.mole.x = stand.x
    this.mole.y = stand.y
    this.backed = { dx: -dc * CELL, dy: -dr * CELL, at: this.time }
    this.touched('soon')
    this.afterChange()
  }
  /** How far the mole has just stepped back in a heave, so the view can ease him there. */
  backed: { dx: number; dy: number; at: number } | null = null

  /** The tool in his paws is set down where he stands, and the one that lay there is picked up. */
  private swap(): void {
    const world = this.world, node = world.mole.at
    const held = world.mole.tool, lying = toolAt(world, node)
    if (held) { world.tools[held] = node; this.push({ type: 'put', tool: held, node }) }
    world.mole.tool = lying
    world.tied = null
    if (lying) this.push({ type: 'take', tool: lying, node })
    this.touched('soon')
    this.afterChange()
  }

  // --- After every change: what falls, what flows, who lives where ---------------------------------------------------

  private afterChange(): void {
    const world = this.world
    // Everything but the water comes to rest at once; water that has somewhere to go is a scene.
    const settled = settle(world, false)
    this.showFalls(settled, (gem) => gem)
    if (settled.boulders.length + settled.gems.length + settled.tools.length > 0) this.touched('soon')
    this.refresh()
    if (!this.scene && unstable(world)) this.startRun({})
  }

  /** Every fall is seen, and is heard when the thing lands. `shown` gives the gem on screen for the gem that fell. */
  private showFalls(settled: Settled, shown: (gem: Gem) => Gem | undefined): void {
    for (const fall of settled.boulders) {
      const rows = rowOf(fall.to) - rowOf(fall.from)
      const length = fallTime(rows * CELL)
      this.motions.push({ what: 'boulder', to: fall.to, dx: 0, dy: -rows * CELL, t: 0, length, how: 'fall', cues: [{ at: length, event: { type: 'thud', index: fall.to } }] })
    }
    for (const moved of settled.gems) {
      const gem = shown(moved.gem)
      if (!gem) continue
      const rows = rowOf(moved.to) - rowOf(moved.from)
      const length = fallTime(Math.max(20, rows * CELL))
      const side = moved.was === 'left' ? -1 : moved.was === 'right' ? 1 : 0
      // A gem freed over a drop is seen falling from the block it sprang out of, and is heard where it lands.
      const sprung = this.motions.some((motion) => motion.gem === gem && motion.how === 'spring')
      if (sprung && rows <= 0) continue
      this.motions = this.motions.filter((motion) => motion.gem !== gem)
      if (sprung) {
        const from = centreOf(moved.from), spot = gemSpot(this.world, gem)
        const drop = fallTime(spot.y - from.y)
        this.motions.push({ what: 'gem', gem, to: moved.to, dx: from.x - spot.x, dy: from.y - spot.y, t: 0, length: drop, how: 'fall', cues: [{ at: drop, event: { type: 'tik', index: moved.to } }] })
        continue
      }
      this.motions.push({ what: 'gem', gem, to: moved.to, dx: side * 30, dy: -rows * CELL - (moved.was === 'floor' ? 0 : 30), t: 0, length, how: 'fall', cues: [{ at: length, event: { type: 'tik', index: moved.to } }] })
    }
    for (const moved of settled.tools) this.toolFalls(moved)
  }

  /**
   * The falling half of a change, inside a scene. `settled` is what fell in bringing the hill the scene ends in to
   * rest; the same boulders, gems and tools fall in the hill that is shown, on the scene's clock, so nothing hangs
   * in the air until the scene is over and nothing jumps when it is.
   */
  private fallIn(after: World, settled: Settled): void {
    const world = this.world
    for (const fall of settled.boulders) {
      if (world.kinds[fall.from] !== 'boulder') continue
      world.kinds[fall.from] = 'open'
      world.kinds[fall.to] = 'boulder'
      world.hits[fall.to] = world.hits[fall.from]
      world.hits[fall.from] = 0
    }
    const shown = (gem: Gem): Gem | undefined => world.gems[after.gems.indexOf(gem)]
    for (const moved of settled.gems) {
      const gem = shown(moved.gem)
      if (gem) { gem.at = moved.to; gem.rest = 'floor' }
    }
    // A lamp whose roof has gone lets its rope go with it: the rope is one of the tools that fall.
    for (const moved of settled.tools) world.tools[moved.tool] = moved.to
    this.showFalls(settled, shown)
    this.refresh()
  }

  /** Works out the light and who lives where again, and says who has left. */
  private refresh(): void {
    this.masks = this.lit()
    this.worms = this.wormHomes.filter((index) => this.world.kinds[index] === 'earth')
    // Who lives where follows the hill as it would be saved: while a scene holds them, or a gem is in the child's hand (it is saved where it was taken from), nobody moves in or out.
    if (this.holdDwellers || this.hand) return
    const now = dwellersOf(this.world, this.masks)
    for (const was of this.dwellers) if (!now.some((d) => d.kind === was.kind && d.at === was.at)) this.push({ type: 'leave', kind: was.kind, index: was.at })
    this.dwellers = now
  }

  // --- The scenes -----------------------------------------------------------------------------------------------

  private startScene(name: SceneName, after: World, beats: Beat[]): void {
    this.aim = null
    this.errand = null
    this.held = false
    this.spent = null
    // A gem the finger carries goes back where it was taken from, seen and heard, in the scene's first beat.
    if (this.hand) {
      const hand = this.hand
      this.hand = null
      this.carryAt = null
      this.flyBack(hand.gem, { x: hand.x, y: hand.y - CARRY_UP })
      this.masks = this.lit()
    }
    this.saved = after
    this.staging.name = name
    this.mole.mode = 'scene'
    this.mole.act = null
    this.scene = new Scene(beats)
    this.sceneFrom = this.time
    this.scene.start(this.time, () => this.touched('now'))
    // Its first beat is seen and heard in the call that starts it.
    this.scene.update(this.time)
  }

  /** A touch ends the scene: every beat that is left lands unheard, and the hill stands as the scene left it and whatever follows it. */
  private finishScene(): void {
    if (!this.scene) return
    // From this frame the scene is silent: its beats land unheard, and whoever its end sends away goes without a sound.
    // A scene that its end sets going (water the blast let go) is ended by the same touch.
    this.quiet = true
    while (this.scene) {
      this.scene.finish()
      this.endScene()
    }
    this.quiet = false
  }
  private quiet = false

  private endScene(): void {
    const after = this.saved
    this.scene = null
    this.saved = null
    this.holdDwellers = false
    const staging = this.staging
    staging.name = null
    staging.rise = 0
    staging.wind = 0
    staging.door = false
    staging.roll = null
    staging.stream = null
    staging.lap = null
    if (after) {
      this.world = after
      this.motions = []
    }
    this.mole.pose = null
    this.carried = null
    this.riding = false
    this.stepping = 0
    this.swept = null
    this.backed = null
    this.shaking = 0
    this.rest()
    this.refresh()
    this.stance()
    // What the scene's end leaves unsettled comes to rest now.
    this.afterChange()
  }

  /** The blast: the pick opens a gas pocket, and the mole goes up the dug space above him to the roof. */
  private startBlast(pocket: number): void {
    const world = this.world, mole = this.mole
    const after = clone(world)
    after.kinds[pocket] = 'open'
    const from = world.mole.at
    const roof = isGrass(from) ? from : roofOver(after, from)
    after.mole.at = roof
    after.mole.sooty = true
    after.tied = null
    // Water that the open pocket lets go runs when the blast is over, as a scene of its own.
    const fell = settle(after, false)
    const start = feet(from), end = feet(roof)
    const rows = isGrass(from) ? 0 : rowOf(from) - rowOf(roof)
    const fly = 0.12 + rows * 0.07
    const beats: Beat[] = [
      { at: 0, lasts: 0, play: (_k, finishing) => {
        world.kinds[pocket] = 'open'
        if (!finishing) this.push({ type: 'whoomph', index: pocket })
        // Whatever rested on the pocket falls now, on the scene's clock, as it does in what the scene ends in.
        this.fallIn(after, fell)
      } },
      { at: 0.25, lasts: 0, play: (_k, finishing) => { if (!finishing) this.push({ type: 'shoot' }) } },
      { at: 0.25, lasts: fly, play: (k) => {
        mole.pose = 'shoot'
        mole.x = start.x + (end.x - start.x) * k
        mole.y = start.y + (end.y - start.y) * k
      } },
      { at: 0.25 + fly, lasts: 0, play: (_k, finishing) => {
        world.mole.at = roof
        world.mole.sooty = true
        mole.pose = 'splat'
        mole.x = end.x
        mole.y = end.y
        if (!finishing) this.push({ type: 'bump', index: roof })
      } },
      { at: 3.2, lasts: 0, play: (_k, finishing) => {
        mole.pose = 'glare'
        if (!finishing) this.push({ type: 'grumble' })
      } },
      { at: 4.8, lasts: 0, play: () => { mole.hang = true } },
    ]
    this.startScene('blast', after, beats)
  }

  /**
   * The run: water goes down whatever was dug. `pocket` is a water pocket the pick has opened, `tip` the dug block
   * a bucket of water is tipped into; with neither, standing water has been let go by digging.
   */
  private startRun(cause: { pocket?: number; tip?: number }): void {
    const world = this.world, mole = this.mole, staging = this.staging
    const after = clone(world)
    const flows: Flow[] = []
    let source = -1
    if (cause.pocket !== undefined) {
      source = cause.pocket
      after.kinds[source] = 'open'
      after.hits[source] = 0
      for (let i = 0; i < POCKET_HOLDS; i++) flows.push(pour(after, source))
    } else if (cause.tip !== undefined) {
      source = cause.tip
      after.mole.load = 'nothing'
      flows.push(pour(after, source))
    }
    const fell = settle(after)
    flows.push(...fell.flows)
    // A mole in its way is carried one block along, and the soot is washed off him.
    const stood = world.mole.at
    let carried = stood
    for (const flow of flows) {
      const k = flow.path.indexOf(stood)
      if (k < 0 && flow.rest !== stood) continue
      after.mole.sooty = false
      if (k >= 0 && k + 1 < flow.path.length && carried === stood) carried = flow.path[k + 1]
    }
    after.mole.at = carried
    after.tied = null
    // What the mole or a pool held up falls when it has gone from under it, and water that such a fall lets go
    // runs on: round after round, until the hill the scene ends in is at rest.
    const rounds: Settled[] = []
    for (let i = 0; i < 4; i++) {
      const more = settle(after)
      if (more.boulders.length + more.gems.length + more.tools.length + more.flows.length === 0) break
      rounds.push(more)
    }
    const late = rounds.flatMap((round) => round.flows)
    if (late.some((flow) => flow.path.includes(carried) || flow.rest === carried)) after.mole.sooty = false
    const soaked = flows.some((flow) => flow.path.includes(stood) || flow.rest === stood) || late.some((flow) => flow.path.includes(carried) || flow.rest === carried)

    const blocks = [...flows, ...late].reduce((n, flow) => n + flow.path.length, 0)
    // A block of the way takes a moment and each stretch of water a pause after it; a long drain is hurried so that
    // the whole run stays inside its eight seconds.
    const tail = LAP_S + (soaked ? 0.75 : 0) + 0.5
    const wanted = Math.max(0.16, Math.min(0.34, (soaked ? 2.2 : 2.9) / Math.max(1, blocks)))
    const hurry = Math.min(1, (RUN_MOST_S - 0.3 - tail) / (blocks * wanted + (flows.length + late.length) * 0.2))
    const each = wanted * hurry, pause = 0.2 * hurry
    const beats: Beat[] = []
    let t = 0.3
    // The second at which the water leaves each block of a pool that drains, and at which the mole is swept away.
    const drained = new Map<number, number>()
    let sweptAt: number | null = null
    beats.push({ at: 0, lasts: 0, play: (_k, finishing) => {
      this.holdDwellers = true
      if (cause.pocket !== undefined) { world.kinds[source] = 'open'; world.hits[source] = 0 }
      if (cause.tip !== undefined) world.mole.load = 'nothing'
      // Whatever rested on the pocket falls now, on the scene's clock, as it does in what the scene ends in.
      this.fallIn(after, fell)
      if (!finishing) this.push(cause.tip !== undefined ? { type: 'tip', index: source, what: 'water' } : { type: 'gush', index: source >= 0 ? source : flows[0].from })
    } })
    let n = 0
    /** One stretch of water is played: `stands` is where the mole is when it comes. */
    const run = (flow: Flow, stands: number, sweeps: boolean): void => {
      const stood = stands
      const startsAt = t
      if (flow.from !== source) drained.set(flow.from, startsAt)
      beats.push({ at: startsAt, lasts: 0, play: () => { if (world.kinds[flow.from] === 'open' && flow.from !== source) world.water[flow.from] = false } })
      flow.path.forEach((index, k) => {
        const note = n
        n += 1
        if (index === stood && sweeps && sweptAt === null) sweptAt = t
        const here = centreOf(index), next = centreOf(flow.path[Math.min(flow.path.length - 1, k + 1)])
        beats.push({ at: t, lasts: each, play: (p) => {
          world.wet[index] = true
          staging.stream = { x: here.x + (next.x - here.x) * p, y: here.y + (next.y - here.y) * p }
        } })
        beats.push({ at: t, lasts: 0, play: (_k, finishing) => {
          world.wet[index] = true
          if (!finishing) this.push({ type: 'glug', index, n: note })
          if (index === stood && sweeps) {
            const to = feet(carried)
            world.mole.at = carried
            mole.pose = 'swept'
            mole.x = to.x
            mole.y = to.y
            this.swept = { dx: feet(stood).x - to.x, dy: feet(stood).y - to.y, at: this.time }
          }
          if ((index === stood || flow.rest === stood) && world.mole.sooty) world.mole.sooty = false
          if (index === stood && !finishing) this.push({ type: 'soak' })
        } })
        t += each
      })
      const rest = flow.rest
      beats.push({ at: t, lasts: 0, play: (_k, finishing) => {
        staging.stream = null
        if (rest === null) return
        world.water[rest] = true
        world.wet[rest] = true
        staging.lap = { index: rest, k: 0 }
        if (!finishing) this.push({ type: 'lap', index: rest })
      } })
      beats.push({ at: t + LAP_S / 2, lasts: 0, play: (_k, finishing) => { if (rest !== null && !finishing) this.push({ type: 'lap', index: rest }) } })
      t += pause
    }
    for (const flow of flows) run(flow, stood, carried !== stood)
    let since = 0.3
    for (const round of rounds) {
      // A boulder, a gem or a tool that the mole or a pool held up falls, seen and heard, when the last of the
      // water it falls through has gone and the mole is out from under it. Things in one column fall together,
      // and a gem set in the side of a boulder falls with that boulder.
      const whenClear = (from: number, to: number): number => {
        let at = since
        for (let block = from + COLS; block < BLOCKS && rowOf(block) <= rowOf(to); block += COLS) {
          at = Math.max(at, drained.get(block) ?? 0)
          if (block === stood && carried !== stood) at = Math.max(at, sweptAt ?? 0)
        }
        return at
      }
      const when = new Map<number, number>()
      const later = (c: number, at: number): void => { when.set(c, Math.max(when.get(c) ?? 0, at)) }
      for (const fall of round.boulders) later(colOf(fall.from), whenClear(fall.from, fall.to))
      for (const moved of round.tools) later(colOf(moved.from), whenClear(moved.from, Math.max(moved.to, moved.over ?? 0)))
      for (const moved of round.gems) later(colOf(moved.from), whenClear(moved.from, moved.to))
      for (const moved of round.gems) {
        const beside = moved.was === 'left' ? colOf(moved.from) - 1 : moved.was === 'right' ? colOf(moved.from) + 1 : -1
        if (when.has(beside)) later(colOf(moved.from), when.get(beside)!)
      }
      for (const [c, at] of when) {
        const part: Settled = { boulders: round.boulders.filter((fall) => colOf(fall.from) === c), gems: round.gems.filter((moved) => colOf(moved.from) === c), tools: round.tools.filter((moved) => colOf(moved.from) === c), flows: [] }
        beats.push({ at: at + 0.01, lasts: 0, play: () => this.fallIn(after, part) })
      }
      // The water such a fall lets go runs now.
      since = t
      for (const flow of round.flows) run(flow, carried, false)
    }
    t += LAP_S
    if (soaked) {
      // He shakes himself dry, flap, flap, flap.
      for (let i = 0; i < 3; i++) beats.push({ at: t + 0.1 + i * 0.2, lasts: 0, play: (_k, finishing) => { mole.pose = 'swept'; this.shaking = finishing ? 0 : this.time; if (!finishing) this.push({ type: 'flap', n: i + 1 }) } })
      t += 0.75
    }
    // The blocks it ran through shine, and the dwellers of those places change.
    beats.push({ at: t, lasts: 0, play: () => { this.holdDwellers = false; this.refresh() } })
    beats.push({ at: Math.max(4, t + 0.5), lasts: 0, play: () => {} })
    this.startScene('run', after, beats)
  }
  /** Where the water has just carried him from, for the view to ease him along. */
  swept: { dx: number; dy: number; at: number } | null = null
  /** The second at which he last began to shake the water off inside a scene. */
  shaking = 0

  /**
   * The ride, which ends a hillside: the cage goes up, the cave is seen whole a last time, the hillside rolls away
   * and a fresh one unrolls, and the mole steps out into the new burrow.
   */
  private startRide(): void {
    const world = this.world, mole = this.mole, staging = this.staging
    // Every ride moves the position on to the wild hillsides, where it stays.
    const after = layWorld(nextSeed(world.seed), 'wild')
    after.mole.sooty = world.mole.sooty
    const lived = [...this.dwellers].sort((a, b) => colOf(a.at) - colOf(b.at) || a.at - b.at)
    const beats: Beat[] = []
    const took = world.mole.tool ? { tool: world.mole.tool, load: world.mole.load } : null
    beats.push({ at: 0, lasts: 0, play: (_k, finishing) => {
      staging.door = true
      mole.pose = 'ride'
      this.carried = took
      if (!finishing) this.push({ type: 'clack' })
    } })
    // The mammoth winds, and the crank squeals at every turn.
    beats.push({ at: 0.3, lasts: 1.8, play: (k) => { staging.rise = ease(k); staging.wind = k * 5 } })
    for (let i = 0; i < 5; i++) beats.push({ at: 0.3 + i * 0.36, lasts: 0, play: (_k, finishing) => { if (!finishing) this.push({ type: 'squeal', n: i }) } })
    // Every lived-in place, from left to right, does its own move once.
    const span = 2.0
    lived.forEach((dweller, i) => {
      beats.push({ at: 2.2 + (i * span) / Math.max(1, lived.length), lasts: 0, play: (_k, finishing) => { if (!finishing) this.push({ type: 'show', kind: dweller.kind, index: dweller.at }) } })
    })
    // The hillside rolls away to the left like a hide being rolled up.
    beats.push({ at: 4.3, lasts: 1.1, play: (k) => { staging.roll = { phase: 'away', k } } })
    for (let i = 0; i < 4; i++) beats.push({ at: 4.3 + i * 0.27, lasts: 0, play: (_k, finishing) => { if (!finishing) this.push({ type: 'roll', n: i }) } })
    // The fresh one unrolls from the right.
    beats.push({ at: 5.4, lasts: 0, play: (_k, finishing) => {
      const fresh = clone(after)
      fresh.mole.at = CAGE
      this.world = fresh
      this.motions = []
      this.wormHomes = wormsOf(fresh)
      // The old hill is rolled away with whoever lived in it: nobody is heard leaving.
      this.dwellers = []
      this.refresh()
      if (!finishing) this.push({ type: 'unroll' })
    } })
    beats.push({ at: 5.4, lasts: 0.9, play: (k) => { staging.roll = { phase: 'in', k } } })
    for (let i = 0; i < 3; i++) beats.push({ at: 5.5 + i * 0.27, lasts: 0, play: (_k, finishing) => { if (!finishing) this.push({ type: 'roll', n: 4 + i }) } })
    beats.push({ at: 6.3, lasts: 0, play: () => { staging.roll = null } })
    // The cage comes down, and the mole steps out into the new burrow.
    beats.push({ at: 6.35, lasts: 0.5, play: (k) => { staging.rise = 1 - ease(k); staging.wind = 5 - k * 2 } })
    // The crank turns back twice on the way down, and squeals at each turn as it did on the way up.
    for (let i = 0; i < 2; i++) beats.push({ at: 6.35 + i * 0.25, lasts: 0, play: (_k, finishing) => { if (!finishing) this.push({ type: 'squeal', n: 4 - i }) } })
    // The door opens, and what he carried is back in its place on the grass of the fresh hillside.
    beats.push({ at: 6.85, lasts: 0, play: (_k, finishing) => { staging.door = false; this.carried = null; if (!finishing) this.push({ type: 'clack' }) } })
    const way = [CAGE, grassNode(BURROW.c - 1), grassNode(BURROW.c), BURROW_INDEX]
    for (let i = 0; i + 1 < way.length; i++) {
      const a = feet(way[i]), b = feet(way[i + 1])
      beats.push({ at: 6.9 + i * WALK_S, lasts: WALK_S, play: (k) => { mole.pose = null; mole.mode = 'scene'; this.riding = false; mole.face = 1; mole.x = a.x + (b.x - a.x) * k; mole.y = a.y + (b.y - a.y) * k; this.stepping = k } })
      beats.push({ at: 6.9 + (i + 1) * WALK_S, lasts: 0, play: (_k, finishing) => { this.world.mole.at = way[i + 1]; if (!finishing) this.push({ type: 'step', node: way[i + 1], wade: false, slop: false }) } })
    }
    this.riding = true
    this.startScene('ride', after, beats)
  }
  /** Whether the mole is still in the cage during the ride, and how far through a step of the walk out he is. */
  riding = false
  stepping = 0
}

/** Where the crown of his hat is from his feet, facing right: where a prised gem strikes it. */
export const HAT_AT = { x: 4, y: -82 } as const
/** How far above the finger a carried gem is drawn, in stage units. */
export const CARRY_UP = 30
/** Seconds the mole takes to be eased to where a heave or the water has put him. */
export const EASE_S = 0.25
/** How far the cage rises in its frame, in stage units. */
export const RISE = 30
/** The longest a run lasts, in seconds. */
export const RUN_MOST_S = 8
/** How long a pool rocks after water comes to rest in it. */
export const LAP_S = 0.7

const ease = (k: number): number => k * k * (3 - 2 * k)
const centreOf = (index: number): Point => ({ x: HILL.x + (colOf(index) + 0.5) * CELL, y: HILL.y + (rowOf(index) + 0.5) * CELL })
/** Seconds a thing takes to fall a distance in stage units. */
export const fallTime = (distance: number): number => Math.max(0.12, Math.sqrt(Math.max(0, distance) / 1300))

