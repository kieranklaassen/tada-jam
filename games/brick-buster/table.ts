import * as answers from './answers'
import { AnswerPlayer, sceneBeats, type Answer, type Cue, type Fetcher, type Ringer, type Stage, type ToyName, type Who } from './answers'
import { LADDER } from './config'
import { BALL_R, BELL, BUMPER, FIELD, FULL_SIZE, GATES, LADYBIRD, LANE, PLACES, REACH, SWELL, TOYS, TOY_NAMES, VINE_SEAT, WALL, brickBox, bumperReach, colOf, heapSpot, inBox, rowFromFoot, rowOf, vineFoot, vineTip, vineTop, type Box, type Limits } from './layout'
import { MANNERS, Pose, type MannerName } from './motion'
import { below, makeRng, type Rng } from './rng'
import { isCleared, settleVines, stands, type BallKind, type Brick, type Fallen, type FallenKind, type Save, type Showing } from './save'
import { Scene, sceneLength } from './scene'
import { STATE_VERSION } from './state'
import type { Tone } from './voices'
import { layWall } from './walls'

// The rules of the table: the bumper, the ball and its four kinds, the
// drum-skin floor, the three gates, the wall with its five kinds of brick,
// the pool, the vine, the bell and the scenes. No drawing and no Web Audio:
// the table steps on game time alone, at a fixed rate, and what it answers
// with is in answers.ts.

/** The fixed step of the ball, in seconds. */
export const STEP = 1 / 120
/** How hard the table pulls the ball down it, in stage units a second, each second. */
export const GRAVITY = 700
/** How fast the bumper springs a ball off, and how far to the side a ball from its very end goes. */
export const LAUNCH = 1000
export const AIM_SPEED = 430
/** A heavy ball comes off slower: it reaches the top row of the wall and no higher. */
export const HEAVY_LAUNCH = 0.82
/** How fast the drum skin sends the ball back up: high enough to clear the top of the bumper with room for the bumper to slide under. */
export const DRUM = 610
export const HEAVY_DRUM = 0.8
/** How fast a jelly throws the ball sideways, and a swollen one twice as far. */
export const THROW = 420
/** How fast a jelly flings a heavy ball straight up. */
export const FLING = 1300
/** How much of its speed the ball keeps off a brick, the ice, a rail, the roof and the bell. */
const OFF_BRICK = 0.62, OFF_ICE = 0.95, OFF_RAIL = 0.85, OFF_ROOF = 0.7, OFF_BELL = 0.7
/** How fast the bumper slides to the finger, at most. */
const SLIDE_SPEED = 2600
/** How long a first showing waits after the last touch. */
export const SHOWING_AFTER = 2
/** How fast a vine and a jelly's slip carry the ball, and how fast a jelly takes it in. */
const CARRY = { vine: 330, slip: 520, sink: 420 } as const
/** A ball that has not moved this far in this long has come to rest. */
const REST = { within: 6, seconds: 0.5 } as const
/**
 * How a ball that came to rest on the wall rolls off it, downhill only: how slowly it starts, how fast it gathers
 * speed along the top of a brick and down a drop, the most it reaches, and how often its rumble sounds.
 */
export const ROLL = { from: 24, along: 170, down: 640, most: 460, tick: 0.09 } as const
/** How far under the foot of the wall a ball is where the bumper can reach it: a ball that rolls off the wall is let go there. */
export const UNDER_WALL = WALL.top + WALL.rows * WALL.cellH + BALL_R + 4
/** How often a brick that waits to stand up looks whether it may. */
const STAND_LOOK = 0.1
/** How fast a sleepy brick shuffles over to the rail and back. */
const RAIL_SHUFFLE = 150
/** How hard a ball must come down on the top of a brick to ring it, and how much of its speed it keeps when it lands on the same brick again. */
const TOP_STRIKE = 120, OFF_TOP_AGAIN = 0.2
/** How hard a ball must hit a brick or the bell to be answered. */
const STRIKE = 40
/** How far to either side of the stem a ball winds on its way up a tall vine, and how far it climbs in one turn. */
const WIND = { out: 12, turn: 56 } as const
/** How long a plain ball that rolled through the pool leaves wet tracks. */
const TRACK_SECONDS = 1.1

/**
 * Where the ball is. It rests on the bumper, is caught by it for a moment before it is sprung, or flies. A vine, a
 * jelly or a gate may carry it along a path; the ice or a jelly may hold it where it is; a gate hides it.
 */
export type BallState = 'resting' | 'caught' | 'flying' | 'carried' | 'held' | 'hidden'

export type Ball = {
  x: number
  y: number
  vx: number
  vy: number
  state: BallState
  /** How far it has rolled, for the glint that turns on it. */
  roll: number
}

type Point = { x: number; y: number }

/** A path the ball is carried along, and what happens at its end. */
/** A vine of the last wall, as it stood when the bell rang: where, how far grown, and whether its seed had gone. */
export type OldVine = { row: number; grow: number; tall: number; brown: number; gone: boolean }

type Carry = {
  path: Point[]
  speed: number
  /** Let go upwards or downwards at `out`, off the top of a vine, or held where it arrives. */
  then: 'up' | 'down' | 'vine' | 'tall-vine' | 'hold' | 'hide' | 'drop'
  out: number
  /** A carry along the table stops where a brick or a rail is in its way; one into a jelly or a gate does not. */
  guarded: boolean
  /** For a tall vine: the height the winding starts from. */
  windFrom?: number
  /** For a vine: the place of its seed. The ball rides under the vine's tip and is never above the vine that lifts it. */
  vineOf?: number
  /** How long the ball stays where it is before it is carried. */
  wait?: number
  /** A carry that gathers speed over its length: from `v0` to `gain` times that, in `seconds`. */
  pace?: { v0: number; gain: number; seconds: number; age: number }
  /** A ball rolling off the wall by itself: until its rumble sounds next. */
  roll?: { due: number }
}

/** What a finger landed on. */
export type Target = 'bumper' | 'bell' | 'ladybird' | 'brick' | ToyName | 'corner'

const GATE_KIND: Record<ToyName, BallKind> = { dragon: 'hot', walrus: 'wet', elephant: 'heavy' }
const MIDDLE = (FIELD.left + FIELD.right) / 2
const JELLY_STATES = ['fresh', 'thrown-once', 'thrown-twice'] as const

export class Table {
  position: string
  finished: boolean
  readonly wall: (Brick | null)[]
  /** Whether the brick in a place stands: a brick of a wall that is unfolding stands up at its own beat. */
  readonly up: boolean[]
  /** Whether a swollen jelly has grown: it waits for the ball to be out of the way. */
  readonly grown: boolean[]
  rubble: Fallen[]
  /** For each fallen brick on the board, the place it fell from, or -1 for one that lay there on load. */
  falls: number[] = []
  /** How far to the side of its place each of those bricks was when it fell: a sleepy brick that had gone over to the rail. */
  fellAside: number[] = []
  /** What each of them is. The saved rubble is emptied as an unfolding starts; these lie in the tray until they are swept out. */
  lying: Fallen[] = []
  /** Where each of them lies: under the column it fell from, tumbled onto those that fell there before it. */
  spots: { x: number; y: number; lean: number }[] = []
  bumperX: number
  bumperV = 0
  /** The kind of the ball as it is saved. A gate and the ice change it when they take the ball. */
  kind: BallKind
  /** The kind of the ball as it is seen: it arrives at `kind` when the gate or the ice lets the ball go. */
  look: BallKind
  readonly ball: Ball
  readonly shown: Set<Showing>
  /** Seconds of play. */
  time = 0
  /** Where the ladybird is along its walk, which way it faces, and where a flight takes it. */
  ladybird = { x: (LADYBIRD.fromX + LADYBIRD.toX) / 2, dir: 1 as 1 | -1, pause: 0, flyFrom: 0, flyTo: 0, flying: false }
  /** What the surface sets: how far a brick's finger target reaches, and where the ladybird may walk. */
  limits: Limits = FULL_SIZE
  /** The wet tracks a plain ball leaves after the pool: where, and how old each is. */
  tracks: { x: number; y: number; age: number }[] = []
  /** Where the sticky thread of a melted jelly is fixed while it holds. */
  threadFrom: Point = { x: 0, y: 0 }
  /** The notes of this frame, for the Mount to play as one voice. */
  sounds: Tone[] = []
  /** What has changed since the last save: nothing, a small change for the throttle, or one to save at once. */
  dirty: 'no' | 'soon' | 'now' = 'no'
  /**
   * A touch has ended a scene: whatever is sounding is to be cut before the touch's own sound is played. The Mount
   * reads it and puts it back (`voice` in putaway.ts).
   */
  hushed = false
  /**
   * What the last wall left on the board, shown until the tray is swept: its pools, and a vine that still stood.
   * The save holds the new wall from the unfolding's first moment; these are only seen, and stored nowhere.
   */
  old: { pools: number[]; vine: OldVine | null } = { pools: [], vine: null }

  private readonly poses = new Map<Who, Pose>()
  private readonly player: AnswerPlayer
  private readonly stage: Stage
  private scene: Scene | null = null
  private readonly rng: Rng
  private held = false
  private target = 0
  /** Which way the bumper sends the ball, -1 to 1: where a ball that landed on it stands, or how a sliding bumper throws a resting one. */
  private aim = 0
  /** Where on the bumper the ball sits, -1 to 1. */
  private seat = 0
  /** The toy that is fetching a ball that came to rest where nothing rolls it down, and whether it has hold of it yet. */
  private fetch: { toy: Fetcher; held: boolean } | null = null
  /** Until when each toy is busy with the ball, in seconds of play: its first showing waits for it. */
  private readonly engaged: Record<ToyName, number> = { dragon: 0, walrus: 0, elephant: 0 }
  /** The pools this flight's hot ball melted: the ball boils off none of its own on the way back down. */
  private readonly ownPools = new Set<number>()
  /**
   * The step of the answer player in which the hit was made that started the scene that is playing, or -1 for a
   * scene no hit started (a finger on the bell, a showing): what that step set off belongs to the scene.
   */
  private sceneBorn = -1
  /** The scene that is playing is a first showing, which is a toy's own act. */
  private showing = false
  /** The seat the last save was asked for with: a save is asked for whenever it changes. */
  private keptSeat = 0
  private standLook = 0
  /**
   * The sleepy bricks that have gone over to the rail to lean on it, by place: which way, how far from its place
   * each has got, and what it is doing. Nothing of it is saved: a brick put away on its way is found in its place.
   */
  private readonly aside = new Map<number, { dir: 1 | -1; x: number; phase: 'yawn' | 'out' | 'lean' | 'back'; left: number }>()
  private owed = 0
  private booms = 0
  private carry: Carry | null = null
  /**
   * The vine has carried this ball, and it has not come down to the bumper or the drum since: the vine does not
   * take it again. So one flick is one ride, and a vine never passes a ball round and round by itself.
   */
  private fromVine = false
  /** A jelly flung this ball: the roof answers it with a thud. */
  private flung = false
  /** The child has flicked or sprung the ball since the last brick fell: only such a ball unfolds the next wall at the bell. */
  private sprung = false
  /** Seconds since the last touch of this visit, with no finger down. It does not run before the first press of a visit. */
  private untouched = 0
  /** A finger has landed since the table was set up. */
  private touched = false
  /** A finger is down on the table, wherever it landed. The grown-up's corner is not the table. */
  private down = false
  /** The brick whose top the ball last landed on, until it touches something else: it does not ring that brick again. */
  private landedOn = -1
  /** Where the ball was when it last moved, and for how long it has not. */
  private readonly still = { x: 0, y: 0, seconds: 0 }
  private wetFor = 0
  private trackDue = 0
  private wobble: { place: number; due: number; index: number } | null = null
  private readonly turned = new Array<boolean>(PLACES).fill(false)
  private readonly inPool = new Array<boolean>(PLACES).fill(false)
  private readonly near = { walrus: false, dragon: false }
  private readonly quiet = { brick: new Array<number>(PLACES).fill(0), bell: 0, rail: 0, knock: 0 }
  private readonly waiting = new Array<boolean>(PLACES).fill(false)
  private touching = false

  constructor(save: Save, seed: number) {
    this.position = save.position
    this.finished = save.finished
    this.wall = save.wall.map((brick) => (brick ? { ...brick } : null))
    settleVines(this.wall)
    this.up = this.wall.map((brick) => brick !== null && !(brick.kind === 'seed' && brick.gone))
    this.grown = this.wall.map((brick) => brick !== null && brick.kind === 'jelly' && brick.swollen)
    this.rubble = save.rubble.map((fallen) => ({ ...fallen }))
    this.falls = this.rubble.map(() => -1)
    this.fellAside = this.rubble.map(() => 0)
    this.lying = this.rubble.map((fallen) => ({ ...fallen }))
    this.spots = this.lying.map((fallen, heap) => heapSpot(fallen.col, this.lying.slice(0, heap).filter((other) => other.col === fallen.col).length))
    this.bumperX = save.bumper
    this.target = save.bumper
    this.kind = save.ball
    this.look = save.ball
    this.shown = new Set(save.shown)
    // A saved ball rests on the bumper, where along it it lay, until it is flicked.
    this.seat = clamp(save.seat, -1, 1)
    this.ball = { x: this.seatX(), y: BUMPER.top - BALL_R, vx: 0, vy: 0, state: 'resting', roll: 0 }
    this.rng = makeRng(seed)
    this.stage = {
      pose: (who, channels, lasts) => {
        const pose = this.pose(who)
        for (const name in channels) pose.set(name, channels[name], lasts)
      },
      sound: (notes) => { this.sounds.push(...notes) },
      cue: (cue, finishing) => this.cue(cue, finishing === true),
    }
    this.player = new AnswerPlayer(this.stage)
    // As it was left: every view of the saved state is where it was, at once and unheard.
    this.falls.forEach((_, heap) => this.lie(heap))
    this.wall.forEach((brick, place) => { if (brick) this.asSaved(place, brick) })
    this.pose('dragon').set('flame', 1, 0)
    if (this.finished) {
      this.pose('folded').set('lift', 1, 0)
      // Over a cleared wall the toys are found as they were left: turned to the folded wall.
      for (const toy of ['dragon', 'walrus', 'elephant'] as const) this.pose(toy).set('watch', 1, 0)
    }
    this.keptSeat = this.toSave().seat
  }

  /** The poses a brick's saved state shows, set at once. */
  private asSaved(place: number, brick: Brick): void {
    const pose = this.pose(`brick:${place}`)
    switch (brick.kind) {
      case 'glass':
        if (brick.state === 'sagged') pose.set('sag', 1, 0)
        return
      case 'jelly':
        pose.set('tilt', JELLY_STATES.indexOf(brick.state), 0)
        if (brick.swollen) pose.set('swell', 1, 0)
        return
      case 'ice':
        if (brick.state === 'pool') pose.set('melt', 1, 0)
        if (brick.dimpled) pose.set('dimple', 1, 0)
        if (brick.icicle) pose.set('icicle', 1, 0)
        return
      case 'seed': {
        const vine = this.pose('vine')
        if (brick.state !== 'whole') vine.set('grow', 1, 0)
        if (brick.state === 'tall-vine') vine.set('tall', 1, 0)
        if (brick.browned) vine.set('brown', 1, 0)
        return
      }
      case 'sleepy':
        if (brick.state === 'deep') pose.set('warm', 1, 0)
        return
      default:
        brick satisfies never
    }
  }

  /** A fallen brick lies in the tray with its face up. */
  private lie(heap: number): void {
    const pose = this.pose(`rubble:${heap}`)
    pose.set('fall', 1, 0)
    pose.set('peek', 1, 0)
    const fallen = this.lying[heap]
    if (fallen.kind === 'seed' && fallen.form === 'sprout') pose.set('sprout', 1, 0)
  }

  /** The pose of a thing, made the first time it is asked for, in that thing's manner. */
  pose(who: Who): Pose {
    let pose = this.poses.get(who)
    if (!pose) {
      let manner: MannerName
      if (who.startsWith('brick:')) {
        const kind = this.wall[Number(who.slice(6))]?.kind
        manner = kind === undefined || kind === 'glass' ? 'brick' : kind
      } else manner = who.startsWith('rubble:') ? 'rubble' : (who as MannerName)
      pose = new Pose(MANNERS[manner])
      this.poses.set(who, pose)
    }
    return pose
  }

  /** The pose of a thing if it has one, for the view, which makes none. */
  posed(who: Who): Pose | undefined {
    return this.poses.get(who)
  }

  /** A scene is playing. */
  get busy(): boolean {
    return this.scene !== null && this.scene.running
  }

  /**
   * A scene the child's play set off is playing, a clearing or an unfolding: the idle ladder stays down for it. A
   * first showing is a toy's own act, set off by nothing the child did, and leaves the ladder alone.
   */
  get holdsLadder(): boolean {
    return this.busy && !this.showing
  }

  get bumperHeld(): boolean {
    return this.held
  }

  /** What the saved state holds now, with the ball at rest on the bumper. */
  toSave(): Save {
    return {
      v: STATE_VERSION,
      position: this.position,
      finished: this.finished,
      wall: this.wall.map((brick) => (brick ? { ...brick } : null)),
      rubble: this.rubble.map((fallen) => ({ ...fallen })),
      bumper: Math.round(this.bumperX),
      // A ball in the air is saved as resting on the middle of the bumper.
      seat: this.ball.state === 'resting' || this.ball.state === 'caught' ? Math.round(this.seat * 100) / 100 : 0,
      ball: this.kind,
      shown: [...this.shown],
    }
  }

  /**
   * The table as it is found after being put away: the one its own save sets up. The Mount swaps to it when the
   * game goes to rest, so a game that was parked and one that was closed and opened are the same table.
   */
  settled(): Table {
    const table = new Table(this.toSave(), below(this.rng, 2 ** 30))
    table.fitTo(this.limits)
    return table
  }

  /** The surface changed: the brick targets and the ladybird's walk are those of the new size. */
  fitTo(limits: Limits): void {
    this.limits = limits
    const lady = this.ladybird
    if (!lady.flying) lady.x = clamp(lady.x, limits.ladyFrom, limits.ladyTo)
  }

  /** The box of the brick in a place, as it is drawn and as the ball and a finger meet it: where a sleepy brick has got to, and how far a jelly has swollen. */
  boxOf(place: number): Box {
    const box = brickBox(place), brick = this.wall[place]
    if (!brick) return box
    if (brick.kind === 'sleepy') {
      const pose = this.pose(`brick:${place}`)
      box.x += pose.get('slide') * WALL.cellW + (this.aside.get(place)?.x ?? 0)
      box.y += pose.get('sink') * WALL.cellH
    } else if (brick.kind === 'jelly' && this.grown[place]) {
      box.y -= SWELL
      box.h += SWELL
    }
    return box
  }

  /** Whether a brick stands in a place, for the ball and a finger to meet. A pool is not a brick. */
  solid(place: number): boolean {
    return this.up[place] && stands(this.wall[place])
  }

  /** The place of the seed whose vine has grown, or -1. */
  get vinePlace(): number {
    return this.wall.findIndex((brick) => brick !== null && brick.kind === 'seed' && brick.state !== 'whole')
  }

  /** How far round the stem a ball on its way up a tall vine has wound, in turns, or null: the view draws the stem over it while it is behind. */
  get winding(): number | null {
    const carry = this.carry
    if (this.ball.state !== 'carried' || !carry || carry.windFrom === undefined || this.ball.y > carry.windFrom) return null
    return (carry.windFrom - this.ball.y) / WIND.turn
  }

  /** Where a ball on the bumper lies: at its seat along it, inside the rails. */
  private seatX(): number {
    return clamp(this.bumperX + this.seat * (BUMPER.half - 6), FIELD.left + BALL_R, FIELD.right - BALL_R)
  }

  /** The ball is rolling off the wall by itself: the bricks it passes flinch as for a ball in the air. */
  get rolling(): boolean {
    return this.ball.state === 'carried' && this.carry?.roll !== undefined
  }

  /** The toy that is fetching the ball, or null. Once it has hold of it the ball is lifted off the board and passes over everything. */
  get fetching(): Fetcher | null {
    return this.fetch?.toy ?? null
  }

  /** The ball is in a toy's hold above the board. */
  get lifted(): boolean {
    return this.fetch !== null && this.fetch.held
  }

  /** What an idle child is shown: the bell over a cleared wall, a flick of the resting ball, or a slide under the ball. */
  get want(): 'bell' | 'flick' | 'slide' {
    if (this.finished) return 'bell'
    return this.ball.state === 'resting' ? 'flick' : 'slide'
  }

  // --- The finger --------------------------------------------------------------

  /** What a finger at this point of the stage is on. */
  targetAt(x: number, y: number): Target {
    if (!this.ladybird.flying && Math.hypot(x - this.ladybirdX, y - LADYBIRD.y) <= LADYBIRD.r + 14) return 'ladybird'
    if (Math.hypot(x - BELL.x, y - BELL.y) <= BELL.r + 14) return 'bell'
    for (const toy of TOY_NAMES) if (inBox(x, y, TOYS[toy])) return toy
    if (this.brickAt(x, y) >= 0) return 'brick'
    return 'bumper'
  }

  /**
   * The finger lands. The grown-up's corner answers nothing and ends nothing. Anywhere else a touch ends a scene
   * first, and is then an ordinary touch, answered in this frame.
   */
  press(x: number, y: number, inCorner = false): Target {
    if (inCorner) return 'corner'
    if (this.busy) {
      // The scene is silent from this frame: what is sounding is cut, and what the scene's own hit set off goes on unheard.
      this.hushed = true
      this.sounds = []
      this.player.hush(this.sceneBorn)
    }
    this.scene?.finish()
    this.untouched = 0
    this.touched = true
    this.down = true
    const target = this.targetAt(x, y)
    switch (target) {
      case 'ladybird':
        this.player.start(answers.pokeLadybird())
        break
      case 'bell':
        this.ringBell('finger')
        break
      case 'dragon':
        this.player.start(answers.pokeDragon())
        break
      case 'walrus':
        this.player.start(answers.pokeWalrus())
        break
      case 'elephant':
        this.player.start(answers.pokeElephant())
        break
      case 'brick':
        this.touchBrick(this.brickAt(x, y))
        break
      default:
        this.held = true
        this.touching = true
        this.target = clamp(x, BUMPER.minX, BUMPER.maxX)
        // The finger wins: what the bumper was still going to do by itself, a sink-in's rock, is dropped. A beat
        // the rules wait for (a flick's launch) stays.
        this.player.forget('bumper', true)
        this.player.start(answers.press())
        if (y >= FIELD.floor - 4 && x > FIELD.left && x < FIELD.right) this.player.start(answers.pat(x))
    }
    return target
  }

  /** A finger on a brick, each kind in its own way. It changes nothing on the table. */
  private touchBrick(place: number): void {
    const brick = this.wall[place]
    if (!brick) return
    switch (brick.kind) {
      case 'glass':
        this.player.start(answers.tinkGlass(place))
        return
      case 'jelly':
        // It wobbles for as long as it is pressed.
        this.wobble = { place, due: answers.WOBBLE_GAP, index: 1 }
        this.player.start(answers.jellyWobble(place, 0))
        return
      case 'ice':
        this.player.start(answers.fingerIce(place))
        return
      case 'seed':
        this.player.start(answers.fingerSeed(place))
        return
      case 'sleepy':
        this.turned[place] = !this.turned[place]
        this.player.start(answers.fingerSleepy(place, this.turned[place] ? 1 : 0))
        return
      default:
        brick satisfies never
    }
  }

  /** The finger slides: the bumper goes with it. */
  slide(x: number): void {
    if (this.held) this.target = clamp(x, BUMPER.minX, BUMPER.maxX)
  }

  /** The finger lifts: the bumper springs up, and a ball that rests on it is flicked into the wall. */
  lift(): void {
    this.wobble = null
    this.down = false
    if (!this.held) return
    this.held = false
    if (this.ball.state === 'resting') {
      // A bumper that is sliding as it lets go throws the ball a little that way.
      this.aim = clamp(this.bumperV / 900, -0.7, 0.7)
      this.ball.state = 'caught'
      this.player.start(answers.flick(this.aim, this.kind === 'heavy'))
    } else if (this.ball.state !== 'caught') this.player.start(answers.release())
    // A ball the bumper has just caught is sprung by the catch itself, whose last beat lets the bumper up.
    if (this.touching) this.mark('soon')
    this.touching = false
  }

  /** The finger was taken away, which is not the child letting go: the bumper comes up and flicks nothing. */
  takenAway(): void {
    this.wobble = null
    this.down = false
    if (!this.held) return
    this.held = false
    this.touching = false
    // A catch in progress lets the bumper up by itself.
    if (this.ball.state !== 'caught') this.player.start(answers.release())
    this.mark('soon')
  }

  /**
   * Something the save holds has changed. Where the bumper stands is small and keeps coming, and waits for the
   * throttle. Everything else (a crack, a brick's state, a fall, the kind of the ball, a wall's ending) is saved
   * in the frame it happens, since a put-away in the next moment must find it.
   */
  private mark(how: 'soon' | 'now'): void {
    if (how === 'now' || this.dirty === 'no') this.dirty = how
  }

  // --- Time --------------------------------------------------------------------

  /** Plays `seconds` of game time: the beats of the scene and of the answers first, then the ball at its fixed step, then the poses. */
  step(seconds: number): void {
    if (seconds <= 0) return
    this.time += seconds
    // A first showing counts from the first press of a visit, and not while a finger is down.
    if (this.down) this.untouched = Math.min(this.untouched, 0)
    else if (this.touched) this.untouched += seconds
    this.scene?.update(this.time)
    this.player.step(seconds)
    this.owed += seconds
    while (this.owed >= STEP - 1e-9) {
      this.owed -= STEP
      this.tick()
    }
    this.walkLadybird(seconds)
    for (const track of this.tracks) track.age += seconds
    if (this.tracks.length > 0 && this.tracks[0].age > TRACK_SECONDS) this.tracks.shift()
    for (const pose of this.poses.values()) pose.step(seconds)
    this.showings()
    // Where the ball lies on the bumper is in the save: when the ball leaves it, or comes to lie elsewhere on it,
    // the save is asked for in that frame.
    const seat = this.toSave().seat
    if (seat !== this.keptSeat) {
      this.keptSeat = seat
      this.mark('now')
    }
  }

  /**
   * A first showing starts once, two seconds after the last touch of this visit, with no finger down, while a wall
   * that needs its gate stands. It never starts before the first press of a visit. Its outcome is saved as it starts.
   */
  private showings(): void {
    if (this.busy || this.finished || !this.touched || this.down || this.untouched < SHOWING_AFTER) return
    const needs = (kind: 'ice' | 'sleepy') => this.wall.some((brick, place) => brick !== null && brick.kind === kind && this.solid(place))
    const showing: Showing | null = !this.shown.has('hot-gate') && needs('ice') ? 'hot-gate' : !this.shown.has('wet-gate') && needs('sleepy') ? 'wet-gate' : null
    if (!showing) return
    // A showing waits while its toy is busy with the ball: in its gate, or fetching it.
    if (this.time < this.engaged[showing === 'hot-gate' ? 'dragon' : 'walrus']) return
    const answer = showing === 'hot-gate' ? answers.showHotGate() : answers.showWetGate()
    this.play(answer, () => {
      this.shown.add(showing)
      this.mark('now')
    })
    this.showing = true
    // The next showing waits its own two seconds after this one.
    this.untouched = -sceneLength(sceneBeats(answer, this.stage))
  }

  /** Starts a scene: its outcome is saved first, and a touch ends it. One plays at a time. */
  private play(answer: Answer, saveOutcome: () => void, byHit = false): void {
    this.scene?.finish()
    this.showing = false
    this.sceneBorn = byHit ? this.player.now : -1
    this.scene = new Scene(sceneBeats(answer, this.stage))
    this.scene.start(this.time, saveOutcome)
    this.scene.update(this.time)
  }

  /** The ladybird's place along its walk, mid-flight included. */
  get ladybirdX(): number {
    const lady = this.ladybird
    return lady.flying ? lady.flyFrom + (lady.flyTo - lady.flyFrom) * this.pose('ladybird').get('flight') : lady.x
  }

  private tick(): void {
    const h = STEP
    for (let place = 0; place < PLACES; place++) if (this.quiet.brick[place] > 0) this.quiet.brick[place] -= h
    this.quiet.bell -= h
    this.quiet.rail -= h
    this.quiet.knock -= h

    // A jelly under a finger wobbles again and again for as long as it is pressed.
    if (this.wobble) {
      this.wobble.due -= h
      if (this.wobble.due <= 0) {
        const brick = this.wall[this.wobble.place]
        if (brick && brick.kind === 'jelly') this.player.start(answers.jellyWobble(this.wobble.place, this.wobble.index))
        this.wobble.index += 1
        this.wobble.due += answers.WOBBLE_GAP
      }
    }

    // The bumper slides towards the finger.
    const before = this.bumperX
    if (this.held) {
      const reach = clamp((this.target - this.bumperX) * 18, -SLIDE_SPEED, SLIDE_SPEED)
      this.bumperX = clamp(this.bumperX + reach * h, BUMPER.minX, BUMPER.maxX)
    }

    const ball = this.ball
    if (ball.state === 'flying') this.fly(h, before)
    else if (ball.state === 'carried') {
      if (this.fetch) this.fetchOn(h)
      else this.carryOn(h)
    }
    this.bumperV = (this.bumperX - before) / h
    if (ball.state === 'resting' || ball.state === 'caught') {
      // A ball on the bumper rides it.
      ball.x = this.seatX()
      ball.y = BUMPER.top - BALL_R
      ball.vx = 0
      ball.vy = 0
    }

    // Wet tracks behind a plain ball that rolled through the pool.
    if (this.wetFor > 0 && ball.state === 'flying') {
      this.wetFor -= h
      this.trackDue -= h
      if (this.trackDue <= 0) {
        this.trackDue = 0.05
        this.tracks.push({ x: ball.x, y: ball.y, age: 0 })
      }
    }

    this.toTheRail(h)

    // A brick that waited stands up when the ball has left its place and standing shuts the ball in nowhere.
    this.standLook -= h
    const look = this.standLook <= 0
    if (look) this.standLook = STAND_LOOK
    for (let place = 0; place < PLACES; place++) {
      if (look && this.waiting[place] && this.mayStand(place)) this.stand(place, false)
      // A jelly the pool splashed swells when the ball is out of its way.
      const brick = this.wall[place]
      if (brick && brick.kind === 'jelly' && brick.swollen && !this.grown[place] && this.up[place]) {
        const box = brickBox(place)
        if (!this.ballNear({ x: box.x, y: box.y - SWELL, w: box.w, h: box.h + SWELL })) {
          this.grown[place] = true
          this.player.start(answers.swell(place))
        }
      }
    }
  }

  /**
   * The sleepy bricks that lean on the rail: each goes over from the end of its row, leans and snores once, and
   * comes back. It moves only while the ball is out of its way, so it never shuts the ball against the rail or
   * walks into it, and the ball meets it wherever it has got to.
   */
  private toTheRail(h: number): void {
    for (const [place, trip] of this.aside) {
      const home = brickBox(place), y = home.y + this.pose(`brick:${place}`).get('sink') * WALL.cellH
      const far = trip.dir > 0 ? FIELD.right - (home.x + home.w) : home.x - FIELD.left
      const edge = trip.dir > 0 ? home.x + home.w + trip.x : home.x + trip.x
      switch (trip.phase) {
        case 'yawn':
          trip.left -= h
          if (trip.left <= 0) trip.phase = 'out'
          break
        case 'out': {
          const ahead = trip.dir > 0 ? { x: edge, y, w: FIELD.right - edge, h: home.h } : { x: FIELD.left, y, w: edge - FIELD.left, h: home.h }
          if (this.ballNear(ahead)) break
          trip.x += trip.dir * RAIL_SHUFFLE * h
          if (Math.abs(trip.x) >= far) {
            trip.x = trip.dir * far
            trip.phase = 'lean'
            trip.left = answers.RAIL_LEAN
            this.player.start(answers.leanOnRail(place, trip.dir))
          }
          break
        }
        case 'lean':
          trip.left -= h
          if (trip.left <= 0) trip.phase = 'back'
          break
        case 'back': {
          // The way back is the strip between where it is and its place.
          const behind = trip.dir > 0 ? { x: home.x, y, w: Math.max(0, trip.x), h: home.h } : { x: home.x + home.w + trip.x, y, w: Math.max(0, -trip.x), h: home.h }
          if (this.ballNear(behind)) break
          trip.x -= trip.dir * RAIL_SHUFFLE * h
          if (trip.x * trip.dir <= 0) this.aside.delete(place)
          break
        }
        default:
          trip.phase satisfies never
      }
    }
  }

  // --- The ball in the air -----------------------------------------------------------

  private fly(h: number, bumperBefore: number): void {
    const ball = this.ball
    const wasY = ball.y
    ball.vy += GRAVITY * h
    ball.x += ball.vx * h
    ball.y += ball.vy * h
    ball.roll += ball.vx * h

    // The rails, each with its gates and the toy that stands there.
    if (ball.x - BALL_R < FIELD.left) {
      if (ball.vx < 0 && (this.enters('dragon') || this.enters('walrus'))) return
      ball.x = FIELD.left + BALL_R
      this.offRail(ball.y < TOYS.walrus.y ? 'dragon' : 'walrus', 1)
    } else if (ball.x + BALL_R > FIELD.right) {
      if (ball.vx > 0 && this.enters('elephant')) return
      ball.x = FIELD.right - BALL_R
      this.offRail('elephant', -1)
    }
    if (ball.y - BALL_R < FIELD.roof) {
      ball.y = FIELD.roof + BALL_R
      if (ball.vy < 0) {
        this.player.start(answers.roof(clamp(-ball.vy / LAUNCH, 0, 1), this.flung))
        this.landedOn = -1
        ball.vy = -ball.vy * OFF_ROOF
        if (this.flung) {
          // A ball a jelly flung comes off the roof at a slant, towards the middle of the table, and not back onto the jelly.
          this.flung = false
          ball.vx = (ball.x < MIDDLE ? 1 : -1) * 260
          ball.vy = 60
        }
      }
    }

    // The bumper, which stands on the floor: its top takes the ball, its sides knock it.
    const dx = ball.x - this.bumperX
    if (ball.vy > 0 && ball.y + BALL_R >= BUMPER.top && wasY + BALL_R <= BUMPER.top + 12 && Math.abs(dx) <= BUMPER.half + BALL_R * 0.6) {
      this.booms = 0
      this.fromVine = false
      this.flung = false
      this.landedOn = -1
      this.ownPools.clear()
      this.seat = clamp(dx / BUMPER.half, -1, 1)
      if (this.held) {
        // While the finger is on it, the ball is sprung off again, and where it landed is where it goes.
        this.aim = this.seat
        ball.state = 'caught'
        this.player.start(answers.bounce(this.aim, this.kind === 'heavy'))
      } else {
        // While no finger is on it, the ball sinks into the rubber and rests until a finger lands and lifts.
        ball.state = 'resting'
        this.player.start(answers.sinkIn(this.kind === 'heavy'))
        // Where it lies on the bumper is saved: a ball at rest off the middle is found where it was left.
        this.mark('now')
      }
      return
    }
    // Its side meets the ball where it is drawn: the round end of the cap, and under the cap the stem.
    const reach = bumperReach(ball.y)
    if (ball.y + BALL_R > BUMPER.top + 2 && Math.abs(dx) < reach) {
      const side = dx >= 0 ? 1 : -1
      const slid = this.bumperX - bumperBefore
      ball.x = this.bumperX + side * reach
      const pushed = slid * side > 0
      if (pushed) ball.vx = side * Math.max(Math.abs(slid / h) * 1.05, Math.abs(ball.vx))
      else if (ball.vx * side < 0) ball.vx = -ball.vx * 0.5
      if (pushed && Math.abs(slid / h) > 150 && this.quiet.knock <= 0) {
        this.quiet.knock = 0.25
        this.player.start(answers.knock())
      }
      // Against a rail the ball stops the bumper: nothing passes through anything.
      const limit = side > 0 ? FIELD.right - BALL_R : FIELD.left + BALL_R
      if ((ball.x - limit) * side > 0) {
        ball.x = limit
        ball.vx = 0
        this.bumperX = ball.x - side * reach
      }
    }

    // The bell.
    const bx = ball.x - BELL.x, by = ball.y - BELL.y
    const gap = Math.hypot(bx, by)
    if (gap < BALL_R + BELL.r && gap > 0) {
      const nx = bx / gap, ny = by / gap
      ball.x = BELL.x + nx * (BALL_R + BELL.r)
      ball.y = BELL.y + ny * (BALL_R + BELL.r)
      const into = ball.vx * nx + ball.vy * ny
      if (into < 0) {
        ball.vx -= (1 + OFF_BELL) * into * nx
        ball.vy -= (1 + OFF_BELL) * into * ny
        this.landedOn = -1
        // A ball that only lies against the bell rings nothing.
        if (-into > STRIKE && this.quiet.bell <= 0) {
          this.quiet.bell = 0.2
          this.ringBell(this.kind)
        }
      }
    }

    // The wall. One brick answers a step; the ball is put outside every brick it touches.
    let struck = -1
    const before = { vx: ball.vx, vy: ball.vy }
    for (let place = 0; place < PLACES; place++) {
      if (!this.solid(place)) continue
      const box = this.boxOf(place)
      const nearX = clamp(ball.x, box.x, box.x + box.w), nearY = clamp(ball.y, box.y, box.y + box.h)
      let nx = ball.x - nearX, ny = ball.y - nearY
      let far = Math.hypot(nx, ny)
      if (far >= BALL_R) continue
      if (far > 0) {
        nx /= far
        ny /= far
      } else {
        // The middle of the ball is inside the brick: out by the nearest face.
        const left = ball.x - box.x, right = box.x + box.w - ball.x, top = ball.y - box.y, bottom = box.y + box.h - ball.y
        const least = Math.min(left, right, top, bottom)
        nx = least === left ? -1 : least === right ? 1 : 0
        ny = least === top ? -1 : least === bottom ? 1 : 0
        if (nx !== 0) ny = 0
        far = -least
      }
      ball.x += nx * (BALL_R - far)
      ball.y += ny * (BALL_R - far)
      const into = ball.vx * nx + ball.vy * ny
      if (into < 0) {
        // A ball that comes down on the top of a brick rings it once. Landing on the same brick again it rings
        // nothing and loses most of its bounce, so it comes to rest there, and a ball at rest rolls off or is fetched.
        const onTop = ny < -0.7
        const again = onTop && this.landedOn === place
        const keeps = again ? OFF_TOP_AGAIN : this.wall[place]?.kind === 'ice' ? OFF_ICE : OFF_BRICK
        ball.vx -= (1 + keeps) * into * nx
        ball.vy -= (1 + keeps) * into * ny
        if (again) ball.vx *= 0.6
        else if (struck < 0 && this.quiet.brick[place] <= 0 && -into > (onTop ? TOP_STRIKE : STRIKE)) struck = place
        if (onTop) this.landedOn = place
        else if (-into > STRIKE) this.landedOn = -1
      }
    }
    // In the mouth of the gap between two rows the ball touches two bricks at once: it is put outside both. This
    // second look only moves it; it answers nothing and turns nothing.
    for (let pass = 0; pass < 4; pass++) {
      let moved = false
      for (let place = 0; place < PLACES; place++) {
        if (!this.solid(place)) continue
        const box = this.boxOf(place)
        const nx = ball.x - clamp(ball.x, box.x, box.x + box.w), ny = ball.y - clamp(ball.y, box.y, box.y + box.h)
        const far = Math.hypot(nx, ny)
        if (far >= BALL_R - 0.01 || far <= 0) continue
        ball.x += (nx / far) * (BALL_R - far)
        ball.y += (ny / far) * (BALL_R - far)
        moved = true
      }
      if (!moved) break
    }
    // Whatever pushed it last, the bell or a brick, it is never pushed through a rail.
    ball.x = clamp(ball.x, FIELD.left + BALL_R, FIELD.right - BALL_R)
    if (struck >= 0) {
      this.strike(struck, before)
      if (ball.state !== 'flying') return
    }

    // A vine: any ball that comes to it rides up it, except the one it has just let go.
    const seed = this.vinePlace
    if (seed >= 0 && !this.fromVine && Math.abs(ball.x - LANE.x) <= LANE.half && ball.y <= vineFoot(rowOf(seed)) && ball.y >= this.vineEnd(seed) - 4) {
      this.takeUp(seed)
      if (ball.state !== 'flying') return
    }

    // A pool: each kind of ball that crosses it is answered once as it comes in.
    for (let place = 0; place < PLACES; place++) {
      const brick = this.wall[place]
      if (!brick || brick.kind !== 'ice' || brick.state !== 'pool') continue
      const inside = inBox(ball.x, ball.y, brickBox(place))
      // The hot ball that melted this pool does not boil it off as it falls back through it.
      if (inside && !this.inPool[place] && !this.ownPools.has(place)) this.intoPool(place)
      this.inPool[place] = inside
    }

    // What two of the large toys cannot stand going by.
    const low = ball.x < FIELD.left + 130 && ball.y > TOYS.walrus.y + 30
    if (low && !this.near.walrus && this.kind === 'hot') this.player.start(answers.walrusHot())
    this.near.walrus = low
    const high = ball.x < FIELD.left + 130 && ball.y < TOYS.walrus.y - 100
    if (high && !this.near.dragon && this.kind === 'wet') this.player.start(answers.dragonWet())
    this.near.dragon = high

    // The drum-skin floor: straight back up, in place.
    if (ball.y + BALL_R >= FIELD.floor && ball.vy > 0) {
      ball.y = FIELD.floor - BALL_R
      ball.vy = -DRUM * (this.kind === 'heavy' ? HEAVY_DRUM : 1)
      ball.vx *= 0.25
      if (Math.abs(ball.vx) < 8) ball.vx = 0
      this.fromVine = false
      this.flung = false
      this.landedOn = -1
      this.ownPools.clear()
      const standing = this.kind === 'heavy' ? [...this.wall.keys()].filter((place) => this.solid(place)) : []
      // Each boom of a ball left bouncing is softer than the last, whatever the ball.
      this.player.start(answers.boom(ball.x, this.booms, this.kind, standing))
      this.booms += 1
    }
    ball.vx = clamp(ball.vx, -900, 900)

    // A ball that has come to rest on the wall rolls off it where a way leads down, and is fetched where none does.
    const still = this.still
    if (Math.hypot(ball.x - still.x, ball.y - still.y) > REST.within) {
      still.x = ball.x
      still.y = ball.y
      still.seconds = 0
    } else {
      still.seconds += h
      if (still.seconds >= REST.seconds) this.atRest()
    }
  }

  /**
   * The ball has come to rest on the wall, where the bumper cannot reach it. No ball glides uphill by itself: it
   * rolls off downhill, as a ball would, where a way leads down, and where none does (a pit, a shelf) the nearer
   * toy reaches over, lifts it out and sets it on the bumper. Either way it strikes nothing: a ball at rest never
   * rings, cracks or breaks a thing by itself.
   */
  private atRest(): void {
    const ball = this.ball
    this.still.seconds = 0
    // A ball at rest under the wall or beside the bumper is where the bumper reaches it already.
    if (ball.y >= UNDER_WALL - 1) return
    const path = this.wayDown()
    ball.vx = 0
    ball.vy = 0
    ball.state = 'carried'
    this.flung = false
    this.landedOn = -1
    if (path) {
      this.carry = { path, speed: ROLL.from, then: 'drop', out: 0, guarded: true, roll: { due: 0 } }
      return
    }
    // The nearer toy fetches it: the dragon with its tail, the elephant with its trunk.
    const far = (toy: Fetcher) => Math.hypot(ball.x - REACH[toy].x, ball.y - REACH[toy].y)
    const toy: Fetcher = far('dragon') <= far('elephant') ? 'dragon' : 'elephant'
    this.carry = null
    this.fetch = { toy, held: false }
    this.engaged[toy] = Infinity
    this.player.start(answers.fetchReach(toy))
  }

  /**
   * The way a ball at rest rolls off the wall, or null where there is none. It never rises. The ball drops
   * wherever it can, and goes sideways only along something that bears it, the top of a brick: it does not float
   * across a gap. The way ends under the foot of the wall, where the ball is let go.
   */
  private wayDown(): Point[] | null {
    const ball = this.ball, step = 6
    if (!this.fits(ball.x, ball.y)) return null
    const first = -Math.floor((ball.x - (FIELD.left + BALL_R)) / step), last = Math.floor((FIELD.right - BALL_R - ball.x) / step)
    const cols = last - first + 1, rows = Math.ceil((UNDER_WALL - ball.y) / step) + 1
    const at = (i: number, j: number): Point => ({ x: ball.x + (first + i) * step, y: Math.min(UNDER_WALL, ball.y + j * step) })
    const free = new Map<number, boolean>()
    const open = (i: number, j: number): boolean => {
      if (i < 0 || j < 0 || i >= cols || j >= rows) return false
      const key = j * cols + i
      let is = free.get(key)
      if (is === undefined) {
        const point = at(i, j)
        is = this.fits(point.x, point.y)
        free.set(key, is)
      }
      return is
    }
    const start = -first
    const from = new Map<number, number>([[start, -1]])
    const queue = [start]
    let found = -1
    for (let head = 0; head < queue.length; head++) {
      const key = queue[head], i = key % cols, j = Math.floor(key / cols)
      if (j === rows - 1) {
        found = key
        break
      }
      // Down where it can; sideways only where something under the ball bears it.
      const moves: (readonly [number, number])[] = open(i, j + 1) ? [[0, 1]] : [[-1, 0], [1, 0]]
      for (const [di, dj] of moves) {
        const next = (j + dj) * cols + (i + di)
        if (from.has(next) || !open(i + di, j + dj)) continue
        from.set(next, key)
        queue.push(next)
      }
    }
    if (found < 0) return null
    const nodes: Point[] = []
    for (let key = found; key >= 0 && key !== start; key = from.get(key) ?? -1) nodes.unshift(at(key % cols, Math.floor(key / cols)))
    // The corners are rounded: each stretch runs on for as long as nothing is crossed. No stretch rises, since no step did.
    const path: Point[] = []
    let here: Point = ball
    for (let index = 0; index < nodes.length; ) {
      let reach = index
      while (reach + 1 < nodes.length && this.clearWay(here, nodes[reach + 1])) reach += 1
      path.push(nodes[reach])
      here = nodes[reach]
      index = reach + 1
    }
    return path
  }

  /** The toy that has hold of the ball carries it, lifted clear of the board, to the bumper wherever that now stands, and sets it down. */
  private fetchOn(h: number): void {
    const fetch = this.fetch, ball = this.ball
    if (!fetch || !fetch.held) return
    const to = { x: this.bumperX, y: BUMPER.top - BALL_R }
    const dx = to.x - ball.x, dy = to.y - ball.y, far = Math.hypot(dx, dy)
    const go = answers.FETCH[fetch.toy].speed * h
    if (far > go) {
      ball.roll += (dx / far) * go
      ball.x += (dx / far) * go
      ball.y += (dy / far) * go
      return
    }
    // Set down on the middle of the bumper, at rest, as a ball that landed there with no finger on it.
    this.fetch = null
    this.seat = 0
    this.booms = 0
    this.fromVine = false
    this.ownPools.clear()
    ball.state = 'resting'
    this.engaged[fetch.toy] = this.time + answers.FETCH[fetch.toy].back + 0.4
    this.player.start(answers.fetchBack(fetch.toy))
    this.player.start(answers.sinkIn(this.kind === 'heavy'))
    this.mark('now')
  }

  private offRail(toy: ToyName, away: 1 | -1): void {
    const ball = this.ball
    if (ball.vx * away >= 0) return
    const speed = Math.abs(ball.vx)
    ball.vx = -ball.vx * OFF_RAIL
    this.landedOn = -1
    if (speed < 60 || this.quiet.rail > 0) return
    this.quiet.rail = 0.08
    this.player.start(answers.rail(toy, clamp(speed / 600, 0, 1)))
  }

  // --- The gates ---------------------------------------------------------------------

  /** Whether the ball, at a rail, is wholly inside a toy's gate. If it is, the toy takes it: what the ball will be is saved now. */
  private enters(toy: ToyName): boolean {
    const gate = GATES[toy], ball = this.ball
    if (ball.y - BALL_R < gate.y0 || ball.y + BALL_R > gate.y1) return false
    const makes = GATE_KIND[toy]
    // A ball steered through the gate that made it what it is comes out plain again.
    const undo = this.kind === makes
    this.kind = undo ? 'plain' : makes
    this.mark('now')
    this.flung = false
    this.booms = 0
    this.ownPools.clear()
    this.pose('ball').set('frost', 0, 0)
    this.pose('ball').set('thread', 0, 0)
    this.wetFor = 0
    ball.vx = 0
    ball.vy = 0
    ball.state = 'carried'
    this.landedOn = -1
    // The toy draws the ball in to where it holds it, in its own manner, and the ball is out of sight only when it is there.
    const how = answers.GATE_IN[toy]
    const path: Point[] = []
    // Over a rim the way in bends upwards first: the ball rolls over it and drops.
    const bends = how.over > 0 ? 8 : 1
    for (let bend = 1; bend <= bends; bend++) {
      const t = bend / bends
      path.push({ x: ball.x + (gate.mouth.x - ball.x) * t, y: ball.y + (gate.mouth.y - ball.y) * t - how.over * Math.sin(Math.PI * t) * (1 - t * 0.5) })
    }
    let length = 0
    path.forEach((point, index) => {
      const before = index === 0 ? ball : path[index - 1]
      length += Math.hypot(point.x - before.x, point.y - before.y)
    })
    const v0 = length / ((how.seconds * (1 + how.gain)) / 2)
    this.carry = { path, speed: v0, then: 'hide', out: 0, guarded: false, wait: how.wait, pace: { v0, gain: how.gain, seconds: how.seconds, age: 0 } }
    const answer = answers.gate(toy, undo)
    // The toy is busy with the ball until it has let it out and come back to itself: its first showing waits.
    this.engaged[toy] = this.time + answer[answer.length - 1].at + 0.4
    this.player.start(answer)
    return true
  }

  // --- A ball that is carried ---------------------------------------------------------

  private carryOn(h: number): void {
    const ball = this.ball, carry = this.carry
    if (!carry) {
      ball.state = 'flying'
      return
    }
    if (carry.wait !== undefined && carry.wait > 0) {
      // The ball stays where it is until whatever carries it has come for it.
      carry.wait -= h
      return
    }
    if (carry.pace) {
      const pace = carry.pace
      pace.age += h
      carry.speed = pace.v0 * (1 + (pace.gain - 1) * Math.min(1, pace.age / pace.seconds))
    }
    if (carry.roll) {
      // It rolls as a ball does: slowly at first, faster down a drop than along a top, with its own rumble.
      const next = carry.path[0]
      const drops = next !== undefined && next.y - ball.y > Math.abs(next.x - ball.x) * 0.4
      carry.speed = Math.min(ROLL.most, carry.speed + (drops ? ROLL.down : ROLL.along) * h)
      carry.roll.due -= h
      if (carry.roll.due <= 0) {
        carry.roll.due += ROLL.tick
        this.player.start(answers.rolling(carry.speed / ROLL.most))
      }
    }
    // A ball a vine lifts rides under the vine's tip: it is lifted as the vine reaches it, and never ahead of it.
    const under = carry.vineOf === undefined ? -Infinity : vineTip(rowOf(carry.vineOf), this.pose('vine').get('grow'), this.pose('vine').get('tall')) + VINE_SEAT
    let left = carry.speed * h
    while (left > 0 && carry.path.length > 0) {
      const to = carry.path[0]
      const dx = to.x - ball.x, dy = to.y - ball.y, far = Math.hypot(dx, dy)
      let go = Math.min(left, far)
      // It rises no further than the vine has got: as far as the tip lets it, and no step at all where it is there already.
      if (dy < 0 && ball.y + (dy / far) * go < under) {
        go = Math.min(go, Math.max(0, ((ball.y - under) * far) / -dy))
        if (go <= 1e-9) break
        left = go
      }
      const x = far > 0 ? ball.x + (dx / far) * go : to.x, y = far > 0 ? ball.y + (dy / far) * go : to.y
      // A way round a corner was looked at every few units, so between two looks the ball may graze the corner by a hair.
      if (carry.guarded && !this.fits(x, y, -1, carry.roll ? 1.5 : 0.5)) {
        // Something is in the way: the ball is let go where it is, and drops.
        this.carry = null
        ball.state = 'flying'
        ball.vx = 0
        ball.vy = 0
        return
      }
      ball.roll += x - ball.x
      ball.x = x
      ball.y = y
      left -= go
      if (far - go <= 1e-6) carry.path.shift()
      else break
    }
    if (carry.path.length > 0) return
    this.carry = null
    ball.vx = 0
    ball.vy = 0
    switch (carry.then) {
      case 'hold':
        ball.state = 'held'
        return
      case 'hide':
        ball.state = 'hidden'
        return
      case 'drop':
        ball.state = 'flying'
        this.still.x = ball.x
        this.still.y = ball.y
        this.still.seconds = 0
        return
      case 'up':
      case 'down':
        ball.state = 'flying'
        ball.vy = carry.then === 'up' ? -carry.out : carry.out
        return
      case 'vine':
        // A short vine lets the ball go one brick up; it pops up a little and falls past the vine.
        ball.state = 'flying'
        ball.vy = -300
        this.fromVine = true
        return
      case 'tall-vine':
        // A tall vine rolls the ball onto the wall from above.
        ball.state = 'flying'
        ball.vx = 200
        this.fromVine = true
        return
      default:
        carry.then satisfies never
    }
  }

  /** Whether a ball with its middle here is clear of every standing brick and of the bell, and inside the rails and the roof. */
  private fits(x: number, y: number, also = -1, slack = 0.5): boolean {
    if (x - BALL_R < FIELD.left - 0.01 || x + BALL_R > FIELD.right + 0.01 || y - BALL_R < FIELD.roof - 0.01) return false
    if (Math.hypot(x - BELL.x, y - BELL.y) < BALL_R + BELL.r - 0.5) return false
    for (let place = 0; place < PLACES; place++) {
      // `also` is a place taken as standing: a brick that is about to stand up.
      if (place !== also && !this.solid(place)) continue
      const box = place === also ? brickBox(place) : this.boxOf(place)
      if (Math.hypot(x - clamp(x, box.x, box.x + box.w), y - clamp(y, box.y, box.y + box.h)) < BALL_R - slack) return false
    }
    return true
  }

  private clearWay(from: Point, to: Point, also = -1): boolean {
    const far = Math.hypot(to.x - from.x, to.y - from.y), steps = Math.max(1, Math.ceil(far / 3))
    for (let i = 1; i <= steps; i++) if (!this.fits(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps, also)) return false
    return true
  }

  /** Where the vine of the seed in a place lets a ball go. */
  private vineEnd(seed: number): number {
    const brick = this.wall[seed]
    return brick && brick.kind === 'seed' && brick.state === 'tall-vine' ? LANE.top : Math.max(LANE.top, vineTop(rowOf(seed)))
  }

  /** The vine takes the ball where it can reach it, carries it up the lane and lets it go. A hot ball curls its leaves brown, and it still carries. */
  private takeUp(seed: number): void {
    const brick = this.wall[seed], ball = this.ball
    if (!brick || brick.kind !== 'seed' || brick.state === 'whole') return
    const end = this.vineEnd(seed)
    const first = { x: LANE.x, y: Math.max(end, ball.y) }
    if (!this.clearWay(ball, first) || !this.clearWay(first, { x: LANE.x, y: end })) return
    if (this.kind === 'hot' && !brick.browned) {
      brick.browned = true
      this.mark('now')
      this.player.start(answers.vineBrown())
    }
    ball.state = 'carried'
    ball.vx = 0
    ball.vy = 0
    this.landedOn = -1
    const tall = brick.state === 'tall-vine'
    const path: Point[] = [first]
    // Up a tall vine the ball winds round the stem, to one side of it and then the other.
    if (tall) for (let y = first.y - 4; y > end; y -= 4) path.push({ x: LANE.x + WIND.out * Math.sin(((first.y - y) / WIND.turn) * Math.PI * 2), y })
    path.push({ x: LANE.x, y: end })
    this.carry = { path, speed: CARRY.vine, then: tall ? 'tall-vine' : 'vine', out: 0, guarded: true, windFrom: tall ? first.y : undefined, vineOf: seed }
    this.player.start(answers.vineRide())
  }

  // --- The wall: five kinds of brick by four kinds of ball -------------------------------

  /**
   * A brick leaves the wall for the tray, at once, so a put-away in the middle of its fall loses nothing. It lies
   * under the column it fell from. A seed whose vine has grown leaves its vine standing. Returns its order in the tray.
   */
  private fell(place: number, what: FallenKind): number {
    const brick = this.wall[place]
    this.wall[place] = null
    // The vine of a seed that falls stays, and is kept in the lane it stands in: the seed's own place is empty.
    if (brick && brick.kind === 'seed' && brick.state !== 'whole') this.wall[place - colOf(place) + LANE.col] = { ...brick, gone: true }
    this.up[place] = false
    this.grown[place] = false
    this.poses.delete(`brick:${place}`)
    const heap = this.falls.length
    const fallen: Fallen = { ...what, col: colOf(place) }
    this.spots.push(heapSpot(fallen.col, this.lying.filter((other) => other.col === fallen.col).length))
    this.rubble.push(fallen)
    this.falls.push(place)
    this.fellAside.push(this.aside.get(place)?.x ?? 0)
    this.aside.delete(place)
    this.lying.push({ ...fallen })
    this.poses.delete(`rubble:${heap}`)
    this.mark('now')
    return heap
  }

  /** The hit that takes the last brick off a wall starts the ending. Its outcome is saved as it starts: the wall is finished and the position has moved one place up. */
  private maybeCleared(): void {
    if (this.finished || !isCleared(this.wall)) return
    const answer = answers.cleared(this.rubble.length)
    this.play(answer, () => {
      this.finished = true
      const at = LADDER.indexOf(this.position)
      if (at >= 0) this.position = LADDER[Math.min(LADDER.length - 1, at + 1)]
      // The flight that took the last brick unfolds nothing at the bell.
      this.sprung = false
      this.mark('now')
    }, true)
  }

  private strike(place: number, before: { vx: number; vy: number }): void {
    const brick = this.wall[place]
    if (!brick) return
    this.quiet.brick[place] = 0.09
    switch (brick.kind) {
      case 'glass':
        return this.onGlass(place, brick, before)
      case 'jelly':
        return this.onJelly(place, brick, before)
      case 'ice':
        return this.onIce(place, brick)
      case 'seed':
        return this.onSeed(place, brick)
      case 'sleepy':
        return this.onSleepy(place, brick)
      default:
        brick satisfies never
    }
  }

  private onGlass(place: number, brick: Extract<Brick, { kind: 'glass' }>, before: { vx: number; vy: number }): void {
    const col = colOf(place), row = rowFromFoot(place)
    if (brick.state === 'sagged') {
      // The next ball of any kind that touches the drip pops it.
      this.player.start(answers.popDrip(this.fell(place, { kind: 'glass' })))
      this.maybeCleared()
      return
    }
    if (this.kind === 'heavy') {
      // Straight through: every glass brick in its line breaks at once, and the ball does not turn.
      const along = Math.abs(before.vy) >= Math.abs(before.vx)
      const line = [...this.wall.keys()].filter((other) => this.solid(other) && this.wall[other]?.kind === 'glass' && (along ? colOf(other) === col : rowOf(other) === rowOf(place)))
      const heaps = line.map((other) => this.fell(other, { kind: 'glass' }))
      this.ball.vx = before.vx
      this.ball.vy = before.vy
      this.player.start(answers.crashThrough(heaps))
      this.maybeCleared()
      return
    }
    if (this.kind === 'wet') {
      this.player.start(answers.wipe(place))
      return
    }
    if (this.kind === 'hot') {
      brick.state = 'sagged'
      this.mark('now')
      this.player.start(answers.sag(place))
      return
    }
    if (brick.state === 'whole') {
      brick.state = 'cracked'
      this.mark('now')
      this.player.start(answers.ringAndCrack(place, col, row))
      return
    }
    this.player.start(answers.shatter(this.fell(place, { kind: 'glass' }), col, row))
    this.maybeCleared()
  }

  private onJelly(place: number, brick: Extract<Brick, { kind: 'jelly' }>, before: { vx: number; vy: number }): void {
    const ball = this.ball, box = this.boxOf(place)
    const cx = box.x + box.w / 2
    switch (this.kind) {
      case 'plain': {
        // It throws the ball sideways: the way of the half that was hit, and from the very middle towards the middle of the table.
        const dir = Math.abs(ball.x - cx) > 1 ? Math.sign(ball.x - cx) : colOf(place) < WALL.cols / 2 ? 1 : -1
        ball.vx = dir * THROW * (brick.swollen ? 2 : 1)
        ball.vy = -140
        const count = JELLY_STATES.indexOf(brick.state)
        if (count < 2) {
          brick.state = JELLY_STATES[count + 1]
          this.mark('now')
          this.player.start(answers.jellyThrow(place, count, dir, colOf(place), rowFromFoot(place)))
          return
        }
        // The third throw shakes it off its plate.
        const fallen: FallenKind = { kind: 'jelly', form: 'splat' }
        this.player.start(answers.jellyOff(this.fell(place, fallen), dir, colOf(place), rowFromFoot(place)))
        this.maybeCleared()
        return
      }
      case 'wet': {
        // The ball slips round it and carries on the way it was going: over the top for one that came up, under the foot for one that came down.
        const up = before.vy <= 0
        const left = box.x - BALL_R, right = box.x + box.w + BALL_R, top = box.y - BALL_R, foot = box.y + box.h + BALL_R
        const side = ball.x < cx ? left : right
        const path: Point[] = []
        if (up ? ball.y > box.y : ball.y < box.y + box.h) path.push({ x: side, y: clamp(ball.y, top, foot) }, { x: side, y: up ? top : foot })
        path.push({ x: cx, y: up ? top : foot })
        ball.state = 'carried'
        this.carry = { path, speed: CARRY.slip, then: up ? 'up' : 'down', out: Math.max(320, Math.hypot(before.vx, before.vy) * 0.8), guarded: true }
        this.player.start(answers.slip(place))
        return
      }
      case 'hot': {
        // It melts into syrup, and the ball comes away trailing a sticky thread.
        this.threadFrom = { x: cx, y: box.y + box.h / 2 }
        const fallen: FallenKind = { kind: 'jelly', form: 'syrup' }
        this.player.start(answers.jellyMelt(this.fell(place, fallen)))
        this.maybeCleared()
        return
      }
      case 'heavy':
        // The ball sinks deep in, and the jelly flings it straight up.
        ball.state = 'carried'
        this.carry = { path: [{ x: cx, y: box.y + box.h / 2 }], speed: CARRY.sink, then: 'hold', out: 0, guarded: false }
        this.player.start(answers.jellyFling(place))
        return
      default:
        this.kind satisfies never
    }
  }

  private onIce(place: number, brick: Extract<Brick, { kind: 'ice' }>): void {
    const ball = this.ball
    switch (this.kind) {
      case 'plain':
        this.player.start(answers.skate(place, colOf(place), rowFromFoot(place)))
        return
      case 'wet':
        // The water freezes: the ball sticks for a breath and drops off plain. It is saved as plain from this moment.
        this.kind = 'plain'
        brick.icicle = true
        this.mark('now')
        ball.state = 'held'
        ball.vx = 0
        ball.vy = 0
        this.player.start(answers.freeze(place))
        return
      case 'hot':
        // It melts into a pool that lies where it stood, and the ball stays hot.
        brick.state = 'pool'
        brick.dimpled = false
        brick.icicle = false
        this.inPool[place] = false
        // It lies there: the ball that melted it does not boil it off as it falls back through it on this flight.
        this.ownPools.add(place)
        this.mark('now')
        this.player.start(answers.melt(place))
        this.maybeCleared()
        return
      case 'heavy':
        // The heavy ball is stopped dead and drops straight down.
        ball.vx = 0
        ball.vy = 0
        if (!brick.dimpled) {
          brick.dimpled = true
          this.mark('now')
        }
        this.player.start(answers.anvil(place))
        return
      default:
        this.kind satisfies never
    }
  }

  private onSeed(place: number, brick: Extract<Brick, { kind: 'seed' }>): void {
    switch (this.kind) {
      case 'plain': {
        const grows = brick.state === 'whole'
        if (grows) {
          brick.state = 'vine'
          this.mark('now')
        }
        this.player.start(answers.knockSeed(place, grows, colOf(place), rowFromFoot(place)))
        if (!this.fromVine) this.takeUp(place)
        return
      }
      case 'wet':
        if (brick.state !== 'tall-vine') {
          brick.state = 'tall-vine'
          this.mark('now')
        }
        this.player.start(answers.vineShoot(place))
        if (!this.fromVine) this.takeUp(place)
        return
      case 'hot': {
        const fallen: FallenKind = { kind: 'seed', form: 'flower' }
        this.player.start(answers.popSeed(this.fell(place, fallen)))
        this.maybeCleared()
        return
      }
      case 'heavy': {
        this.ball.vx *= 0.4
        this.ball.vy *= 0.4
        const fallen: FallenKind = { kind: 'seed', form: 'sprout' }
        this.player.start(answers.driveSeed(this.fell(place, fallen)))
        this.maybeCleared()
        return
      }
      default:
        this.kind satisfies never
    }
  }

  /** A sleepy brick moves to another place: it is there in the wall at once, and its pose brings it over. */
  private moveBrick(from: number, to: number): void {
    this.wall[to] = this.wall[from]
    this.wall[from] = null
    this.up[to] = true
    this.up[from] = false
    this.turned[to] = this.turned[from]
    this.turned[from] = false
    // A brick that was over at the rail is as far over in its new place, and comes back from there.
    const trip = this.aside.get(from)
    this.aside.delete(from)
    if (trip) this.aside.set(to, { ...trip, phase: 'back' })
    // What it was in the middle of is over: no late beat finds it in its new place, and it carries no stale look there.
    this.player.forget(`brick:${from}`)
    const pose = this.poses.get(`brick:${from}`)
    this.poses.delete(`brick:${from}`)
    if (pose) {
      for (const name of ['eye', 'lean', 'snore', 'yawn', 'snug', 'pop', 'hop']) pose.set(name, 0, 0)
      this.poses.set(`brick:${to}`, pose)
    }
    this.quiet.brick[to] = 0.09
    this.mark('now')
  }

  private onSleepy(place: number, brick: Extract<Brick, { kind: 'sleepy' }>): void {
    const ball = this.ball, box = this.boxOf(place)
    switch (this.kind) {
      case 'plain': {
        if (brick.state === 'deep') {
          // A deep sleeper touched by a ball of another kind than hot stirs, and yawns and shuffles again after that.
          brick.state = 'asleep'
          this.mark('now')
          this.player.start(answers.stir(place, colOf(place), rowFromFoot(place)))
          return
        }
        // Over at the rail, or on its way there or back, it only hums in its sleep.
        if (this.aside.has(place)) {
          this.player.start(answers.sleepyHum(place, colOf(place), rowFromFoot(place)))
          return
        }
        // It shuffles over one place, away from the ball, where there is a gap. The vine's lane is no gap.
        const dir = ball.x < box.x + box.w / 2 ? 1 : -1
        const to = place + dir
        const inRow = colOf(place) + dir >= 0 && colOf(place) + dir < WALL.cols
        if (!inRow) {
          // At the end of its row there is no neighbour: it shuffles over to the rail, leans on that and snores
          // once, and shuffles back to its place. It is met where it is on the way (`boxOf`).
          this.aside.set(place, { dir, x: 0, phase: 'yawn', left: answers.SHUFFLE_AT })
          this.player.start(answers.yawnToRail(place, colOf(place), rowFromFoot(place)))
          return
        }
        const lane = this.wall.some((other) => other !== null && other.kind === 'seed') && colOf(to) === LANE.col
        if (inRow && !lane && this.wall[to] === null && !this.ballNear(brickBox(to))) {
          this.moveBrick(place, to)
          this.player.start(answers.yawnShuffle(to, dir, colOf(place), rowFromFoot(place)))
        } else this.player.start(answers.yawnLean(place, dir, colOf(place), rowFromFoot(place)))
        return
      }
      case 'wet': {
        const fallen: FallenKind = { kind: 'sleepy' }
        this.player.start(answers.wake(this.fell(place, fallen)))
        this.maybeCleared()
        return
      }
      case 'hot':
        if (brick.state !== 'deep') {
          brick.state = 'deep'
          this.mark('now')
        }
        this.player.start(answers.snuggle(place))
        return
      case 'heavy': {
        if (brick.state === 'deep') {
          brick.state = 'asleep'
          this.pose(`brick:${place}`).set('warm', 0, 0.4)
        }
        // Tipped out of bed: one row down where the place below is free, and otherwise into the rubble.
        const under = place + WALL.cols
        if (under < PLACES && this.wall[under] === null && !this.ballNear(brickBox(under))) {
          this.moveBrick(place, under)
          this.player.start(answers.tipOut(under))
          return
        }
        const fallen: FallenKind = { kind: 'sleepy' }
        this.player.start(answers.tipToRubble(this.fell(place, fallen)))
        this.maybeCleared()
        return
      }
      default:
        this.kind satisfies never
    }
  }

  // --- The pool ----------------------------------------------------------------------

  private intoPool(place: number): void {
    switch (this.kind) {
      case 'plain':
        this.wetFor = TRACK_SECONDS
        this.trackDue = 0
        this.player.start(answers.poolPlip(place))
        return
      case 'wet': {
        // It is splashed across the bricks on either side, and is gone.
        this.wall[place] = null
        this.up[place] = false
        this.mark('now')
        this.player.start(answers.poolSplash(place))
        let last: FallenKind | null = null
        for (const dir of [-1, 1]) {
          const side = place + dir
          if (rowOf(side) !== rowOf(place) || side < 0 || side >= PLACES || !this.solid(side)) continue
          const brick = this.wall[side]!
          if (brick.kind === 'glass' && brick.state !== 'sagged') this.player.start(answers.wipe(side, 0.12))
          else if (brick.kind === 'jelly') brick.swollen = true
          else if (brick.kind === 'sleepy') {
            last = { kind: 'sleepy' }
            this.player.start(answers.wake(this.fell(side, last), 0.12))
          }
        }
        this.maybeCleared()
        return
      }
      case 'hot': {
        // It boils off into a cloud that fogs every glass brick, and is gone.
        this.wall[place] = null
        this.up[place] = false
        this.mark('now')
        const glass = [...this.wall.keys()].filter((other) => this.solid(other) && this.wall[other]?.kind === 'glass')
        this.player.start(answers.poolBoil(place, glass))
        return
      }
      case 'heavy':
        this.player.start(answers.poolSploosh(place))
        return
      default:
        this.kind satisfies never
    }
  }

  // --- The bell and the next wall -------------------------------------------------------

  /**
   * The bell, by the ball or by a finger. Over a cleared wall it unfolds the next one, for a finger or for a ball
   * the child has flicked or sprung since the last brick fell.
   */
  private ringBell(by: Ringer): void {
    if (!this.finished) {
      this.player.start(answers.bellStanding(by))
      return
    }
    if (by !== 'finger' && !this.sprung) {
      this.player.start(answers.bellOnly(by))
      return
    }
    const next = layWall(this.position, below(this.rng, 2 ** 30))
    const places = [...next.keys()].filter((place) => next[place] !== null)
    const heaps = this.rubble.length
    // The unfolding. Its outcome is saved as it starts: the new wall, no rubble, not finished.
    // What the old wall leaves on the board is seen until the tray is swept: its pools, and a vine that stood.
    const pools = [...this.wall.keys()].filter((place) => { const brick = this.wall[place]; return brick !== null && brick.kind === 'ice' && brick.state === 'pool' })
    const seed = this.vinePlace, was = seed >= 0 ? this.wall[seed] : null, vine = this.posed('vine')
    const oldVine: OldVine | null = was && was.kind === 'seed' && vine && vine.get('grow') > 0.03
      ? { row: rowOf(seed), grow: vine.get('grow'), tall: vine.get('tall'), brown: vine.get('brown'), gone: was.gone === true }
      : null
    this.play(answers.unfold(by, heaps, places, WALL.cols, WALL.rows), () => {
      this.old = { pools, vine: oldVine }
      for (let place = 0; place < PLACES; place++) {
        this.poses.delete(`brick:${place}`)
        this.wall[place] = next[place]
        this.up[place] = false
        this.grown[place] = false
        this.waiting[place] = false
        this.inPool[place] = false
        this.turned[place] = false
      }
      this.aside.clear()
      this.ownPools.clear()
      this.poses.delete('vine')
      this.rubble = []
      this.finished = false
      this.mark('now')
    }, by !== 'finger')
  }

  /** A brick stands up in its place, with its pop and its note, once. `unheard` when a touch is ending the unfolding. */
  private stand(place: number, unheard: boolean): void {
    this.up[place] = true
    this.waiting[place] = false
    if (!unheard) this.player.start(answers.stood(place, colOf(place), rowFromFoot(place)))
  }

  private cue(cue: Cue, finishing = false): void {
    const ball = this.ball
    switch (cue.type) {
      case 'launch':
        if (ball.state !== 'caught') return
        ball.state = 'flying'
        ball.vx = this.aim * AIM_SPEED
        ball.vy = -LAUNCH * (this.kind === 'heavy' ? HEAVY_LAUNCH : 1)
        this.sprung = true
        return
      case 'settle':
        this.pose('bumper').set('squash', this.held ? answers.PRESSED : 0)
        return
      case 'stand':
        if (!this.wall[cue.place] || this.up[cue.place]) return
        // A brick whose place the ball is in, or that would shut the ball in, stands up when the ball has gone.
        if (this.mayStand(cue.place)) this.stand(cue.place, finishing)
        else this.waiting[cue.place] = true
        return
      case 'fetched':
        if (this.fetch) this.fetch.held = true
        return
      case 'swept':
        for (let heap = 0; heap < this.falls.length; heap++) this.poses.delete(`rubble:${heap}`)
        this.falls = []
        this.fellAside = []
        this.lying = []
        this.spots = []
        // And with the tray, what the last wall left on the board.
        this.old = { pools: [], vine: null }
        return
      case 'gateOut': {
        if (ball.state !== 'hidden' && ball.state !== 'carried' && ball.state !== 'held') return
        const gate = GATES[cue.gate]
        this.carry = null
        this.look = this.kind
        ball.x = gate.out.x
        ball.y = gate.out.y
        ball.vx = -gate.side * 210
        ball.vy = -30
        ball.state = 'flying'
        return
      }
      case 'drop':
        // The ice lets the ball go: it drops off plain.
        this.look = this.kind
        if (ball.state === 'held') ball.state = 'flying'
        return
      case 'fling': {
        if (ball.state !== 'held' && ball.state !== 'carried') return
        const box = this.boxOf(cue.place)
        this.carry = null
        ball.x = box.x + box.w / 2
        ball.y = box.y - BALL_R - 0.5
        ball.vx = 0
        ball.vy = -FLING
        ball.state = 'flying'
        this.flung = true
        return
      }
      case 'fly': {
        const lady = this.ladybird
        let to = lady.x + lady.dir * 120
        if (to > this.limits.ladyTo || to < this.limits.ladyFrom) {
          lady.dir = lady.dir === 1 ? -1 : 1
          to = lady.x + lady.dir * 120
        }
        to = clamp(to, this.limits.ladyFrom, this.limits.ladyTo)
        lady.flyFrom = lady.x
        lady.flyTo = to
        lady.flying = true
        return
      }
      case 'land': {
        const lady = this.ladybird
        if (!lady.flying) return
        lady.x = lady.flyTo
        lady.flying = false
        lady.pause = 0.8
        return
      }
      default:
        cue satisfies never
    }
  }

  /** The ladybird walks the apron, stops for a look round, and walks on. */
  private walkLadybird(seconds: number): void {
    const lady = this.ladybird
    if (lady.flying) return
    if (lady.pause > 0) {
      lady.pause -= seconds
      return
    }
    lady.x += lady.dir * 16 * seconds
    const { ladyFrom, ladyTo } = this.limits
    if (lady.x >= ladyTo) { lady.x = ladyTo; lady.dir = -1; lady.pause = 1.5 }
    else if (lady.x <= ladyFrom) { lady.x = ladyFrom; lady.dir = 1; lady.pause = 1.5 }
    // Now and then it stops where it is. Which moment is chance in ordinary detail.
    else if (below(this.rng, Math.max(1, Math.round(5 / seconds))) === 0) lady.pause = 1 + this.rng.next() * 2
  }

  /**
   * The brick a finger at this point is on, or -1. A brick's target reaches past its drawn box as far as the
   * surface asks, so that it is large enough for a finger at any size; where two targets meet, the nearer brick
   * takes the finger. A finger that just misses a brick is on that brick, and never on the bumper.
   */
  private brickAt(x: number, y: number): number {
    const { padX, padY } = this.limits
    let best = -1, least = Infinity
    for (let place = 0; place < PLACES; place++) {
      if (!this.solid(place)) continue
      const box = this.boxOf(place)
      if (x < box.x - padX || x > box.x + box.w + padX || y < box.y - padY || y > box.y + box.h + padY) continue
      const far = Math.hypot(x - clamp(x, box.x, box.x + box.w), y - clamp(y, box.y, box.y + box.h))
      if (far < least) {
        least = far
        best = place
      }
    }
    return best
  }

  /**
   * Whether the brick that waits in a place may stand up now. It stands no brick where the ball is, and none
   * that would shut the ball in: with the brick up, a ball on the wall must still have a way to under the wall.
   * So a ball can never be closed into a pocket of an unfolding wall.
   */
  private mayStand(place: number): boolean {
    if (this.ballNear(brickBox(place))) return false
    const ball = this.ball
    // A ball on the bumper, in a gate or in a toy's hold above the board is not on the wall.
    if (this.lifted || (ball.state !== 'flying' && ball.state !== 'carried' && ball.state !== 'held') || ball.y >= UNDER_WALL - 1 || !inBox(ball.x, ball.y, { x: FIELD.left, y: FIELD.roof, w: FIELD.right - FIELD.left, h: FIELD.floor - FIELD.roof })) return true
    return this.wayOut(place)
  }

  /** Whether the ball, where it is, has any way to under the wall with the brick in `also` standing: any way at all, over the wall or round it. */
  private wayOut(also: number): boolean {
    const ball = this.ball, step = 8
    const left = FIELD.left + BALL_R + 0.5, top = FIELD.roof + BALL_R + 0.5
    const cols = Math.floor((FIELD.right - BALL_R - 0.5 - left) / step) + 1, rows = Math.ceil((UNDER_WALL - top) / step) + 1
    const at = (i: number, j: number): Point => ({ x: left + i * step, y: Math.min(UNDER_WALL, top + j * step) })
    const seen = new Set<number>()
    const queue: number[] = []
    const i0 = Math.round((ball.x - left) / step), j0 = Math.round((ball.y - top) / step)
    // From the ball to the nodes beside it that it can get to.
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const i = i0 + di, j = j0 + dj
        if (i < 0 || j < 0 || i >= cols || j >= rows || seen.has(j * cols + i)) continue
        const point = at(i, j)
        if (!this.fits(point.x, point.y, also) || !this.clearWay(ball, point, also)) continue
        seen.add(j * cols + i)
        queue.push(j * cols + i)
      }
    }
    for (let head = 0; head < queue.length; head++) {
      const key = queue[head], i = key % cols, j = Math.floor(key / cols)
      if (j === rows - 1) return true
      for (const [di, dj] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) {
        const ni = i + di, nj = j + dj, next = nj * cols + ni
        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows || seen.has(next)) continue
        const point = at(ni, nj)
        if (!this.fits(point.x, point.y, also)) continue
        seen.add(next)
        queue.push(next)
      }
    }
    return false
  }

  /** Whether the ball is in or right beside a box. */
  private ballNear(box: Box): boolean {
    const ball = this.ball
    if (ball.state === 'hidden') return false
    return Math.hypot(ball.x - clamp(ball.x, box.x, box.x + box.w), ball.y - clamp(ball.y, box.y, box.y + box.h)) < BALL_R + 2
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}
