import type { Note } from './audio'
import { BUCKET_RADIUS, BUILT, CELL, COLS, DIG_RADIUS, type Field, GATE_RADIUS, GROOVE, RIM_WIDTH, ROWS, SEA, X0, X1, Z0, Z1, base, basin, beginStroke, builtNear, cellAt, crumbleWall, decode, deltaAt, dent, encode, furrow, groove, heap, heightAt, inField, isRaised, makeField, pat, peakNear, plough, scoop, shave, sink, smoothAll, smoothUpTo, tower } from './field'
import { type Finger, Folk, type Who, type World } from './folk'
import { MOST_GROOVES, type Kingdom, deserializeKingdom, serializeKingdom } from './kingdom'
import { CLOUDS, type Drawn, LOG, SUN, type Target, rockTop, sunAt } from './layout'
import { CRAB_BACK, DAY_PLAN, type Plan, planFor, wallPatches } from './plan'
import { type Rng, makeRng } from './rng'
import { type Beat, Scene } from './scene'
import { STATE_VERSION } from './state'
import { Sun } from './sun'
import { type Pillar, apart, crabRounds, highest, over, starParts } from './solid'
import { BEACH, FIXED, HANDLE_BOW, type Patch, SHELL_RADIUS, SHELL_SIZES, type Shell, TAKEN, type Things, bucketPatch, fromBough, isClear, keep, patchesOf, reach, roomForBucket, settle, slide, woodEnds, woodPatches } from './things'
import { FOLK_COME, TIDE_OUT } from './timeline'
import { VOICES, type VoiceName, hiss, thud, tick } from './voices'
import { EVENING_SEA, FAR_SEA, type Water, cellOf, drift, dugShare, flood, grooveTurn } from './water'

// The beach with no browser in it. A finger lands and the sand opens; it
// moves and a groove follows; the bucket, the shells and the driftwood answer
// as themselves; the sun goes down and the sea and the folk come. The Mount
// passes touches in, and takes sounds, saves and what to draw out. Time is the
// attended clock's, in seconds, passed to `step`.

/**
 * A grain of sand or a drop of water in the air. A bubble rises instead of falling; one that is not `wet` is a
 * mote of sand stirred up in water, which drifts where it was sent and is gone.
 */
export type Grain = { x: number; y: number; z: number; vx: number; vy: number; vz: number; wet: boolean; bubble?: number }
/**
 * A ripple spreading on the water. One that is `long` is a streak of foam and no round ring: it lies along `turn`
 * (the way it points on the sand, as a piece of wood is turned) and is `long` times as long as it is wide. `y` is
 * the height it lies at where that is not the water's: water welling up in the bottom of a hole.
 */
export type Ring = { x: number; z: number; age: number; big?: boolean; turn?: number; long?: number; y?: number }
/** A cloud as it is pushed: how far it has slid along the sky and how far it is squashed. */
export type Cloud = { slide: number; slideSpeed: number; squash: number; squashSpeed: number }
/** A thing in the air on its way to where it will lie. */
export type Flight = {
  fx: number; fy: number; fz: number; time: number; span: number; high: number; flat?: boolean; skid?: boolean; tip?: number
  /** It tips over from `tip` through the whole of its way, and not only at the end of it. */
  topple?: boolean
  /** Where it stood before it was at (fx, fy, fz), and the share of the flight it takes to get there: the bucket tipped out over a thing beside it goes over onto the thing first. */
  lead?: { x: number; y: number; z: number; share: number }
}
/** The share of the way onto a thing beside it in which the bucket rises to the height it lifts off from. */
const LEAD_UP = 0.6
/** How far across to where it lifts off from a thing is, at a share of the way there: it is up before it goes across. */
const leadAcross = (to: number): number => smooth(clamp((to - 0.3) / 0.7, 0, 1))
/** How far along the part of a flight that starts at (fx, fy, fz) it is, and how far along the way there before that. */
function legs(fly: Flight): { to: number; on: number } {
  const t = clamp(fly.time / fly.span, 0, 1), share = fly.lead?.share ?? 0
  return t < share ? { to: t / share, on: 0 } : { to: 1, on: share >= 1 ? 1 : (t - share) / (1 - share) }
}

/** How the bucket is drawn: its foot, how far it is turned over about the line toward the child, its squash, and how its handle hangs. */
export type BucketPose = { x: number; y: number; z: number; turn: number; wide: number; tall: number; handle: number }
/** How a shell on the sand or in a tower is drawn. */
export type ShellPose = { x: number; y: number; z: number; tip: number; spin: number; roll: number; wide: number; tall: number }
/** How a piece of wood is drawn. */
export type WoodPose = { x: number; y: number; z: number; turn: number; rock: number }

/** What moves in each thing for a moment and is never saved. */
export type Poses = {
  bucket: {
    /** A hop when a finger lands on it, and its speed. */
    hop: number
    hopSpeed: number
    /** 0 upright to 1 on its side. */
    tilt: number
    /** Turned out and lifted off: it flies from the tower to where it stands beside it. */
    fly: Flight | null
    /** How high the full bucket is lifted in the hand over a shell or a piece of wood. Let go, it is 0. */
    perch: number
    /** A swing of its handle. */
    handle: number
  }
  shells: {
    /** 0 lying to 1 pressed half into the sand. */
    sink: number
    /** A squash when a finger lands on it, and its speed. */
    squash: number
    squashSpeed: number
    fly: Flight | null
    /** A spin as it skitters. */
    spin: number
  }[]
  wood: {
    /** Its see-saw, in radians, and its speed. */
    rock: number
    rockSpeed: number
    /** How far it is lifted by the water it floats on. */
    lift: number
    /** Let go in the air over something: it is carried across and set down beside it. */
    fly: Flight | null
  }[]
}

/** Who makes a sound: the test of the timeline holds every note to its maker being drawn doing it. */
export type Maker = 'finger' | 'bucket' | 'shell' | 'wood' | 'sun' | 'sea' | 'sky' | 'rock' | 'log' | 'crab' | 'starfish' | 'eel' | 'gulls' | 'small'
export type Heard = { name: VoiceName | 'thud' | 'hiss' | 'tick'; by: Maker; at: number }

export const MOST_GRAINS = 220
/** How far over the top of a shell and of a piece of wood the full bucket is carried. */
const OVER_SHELL = 0.5
/** How far the longest shell reaches from its middle, squashed flat under a finger. */
const SHELL_REACH = 0.86
const OVER_WOOD = 0.85
/** How far toward the way the bucket goes a shell shot out from under its tower may go, as the cosine of the angle between the two ways. */
const SHOT_ASIDE = 0.5
/** How near a shell or the middle line of a piece of wood the bucket stands when it was set down against it. */
const AT_SHELL = 1.56
const AT_WOOD = 1.2
/** How far over the top of what is under it a shell and a piece of wood are carried in the hand. */
export const SHELL_OVER = 0.22
export const WOOD_OVER = 0.45
/** How high the top of each thing stands above where it is drawn from. */
export const TOPS = { shell: 0.4, window: 0.64, wood: 0.66, bucket: 1.75, bucketOnSide: 1.0 } as const
/** How far from the middle of a piece of wood a tower turned out across it stands, to the side the bucket stood, and how the wood then leans. */
export const OFF_MIDDLE = 0.4
export const WOOD_LEAN = 0.2
/**
 * Where the crab wears a shell, over the middle of its back and in front of it. Its eyes stand 1.56 over the sand
 * (a stalk from 0.86 with a ball of 0.2 at 0.5 up it) and the underside of the widest shell is 0.16 under its
 * middle over them, so the middle of the hat is at 1.73: the shell rests on the two eyeballs and is in neither.
 * It is worn well forward, like a cap with a peak, so that its back edge is clear of the starfish that rides
 * behind it (solid.ts, RIDE_AT).
 */
export const HAT_UP = 0.63
export const HAT_FRONT = 0.34
/** How far ahead of the bucket the eel goes under: a quick finger carries the bucket this far in the three frames the eel takes to go down. */
export const BUCKET_AHEAD = 0.5
/** How near a leg or a claw of the crab comes to a shell before the shell is lifted, and how long it is on its way to its head and off it. */
export const HAT_REACH = 0.2
export const HAT_SECONDS = 0.4
/** How near a leg of the crab comes to a second shell, while it wears one, before it stops to change them. */
export const HAT_STEP = 0.08
/** How wide the way down onto the crab's eyes is kept clear: the shell across and a little round it, which the starfish at rest on its back leaves free. */
export const HAT_COLUMN = 0.56
/** How much further off than its reach (`HAT_REACH`) the crab stands before it puts the shell back where it lay. */
export const HAT_CLEAR = 0.15
/** How high in the side of a tower a shell stands as its window: its top is below the top of the tower. */
export const TOWER_WINDOW = 0.36
/**
 * A shell on its edge in a tower's side, as what lies on the tower finds it: half as long as the longest shell
 * with its tip (0.75), half as thick as it stands leaning (0.3), and as high over its middle as its rim reaches
 * tipped 1.15 from flat (0.42 times the sine, and its thickness over that: 0.46).
 */
export const WINDOW_SLAB = { long: 0.78, thick: 0.32, tall: 0.46 } as const
/** How high the top of the eel's head, with its eyes, comes over the floor of the groove it swims in, and a little more. */
export const EEL_TOP = 0.9
/** How long a shell washed out of a tower's side or out of the sand by the wave takes to lie flat. */
export const WASH_SECONDS = 0.5
/** How far from square a bridge lies across its groove. */
export const ASKEW = 0.6
/** How long a shell shot out from under a tower is on its way, in the air and then skittering. */
export const SHOT_SECONDS = 0.7
/** How long the small wave takes to run back along a pool that the sea has joined. */
export const RUN_BACK_SECONDS = 0.6
/** How many flecks of foam it lays on its way. */
export const RUN_FLECKS = 6
/** How far from square across the pool the least askew of them lies, in radians. */
export const RUN_LEAN = 0.3
/** One fleck of a small wave: how far up the pool, how far off square, how long, and how far off the middle. */
type Fleck = { share: number; lean: number; long: number; aside: number }
/** The longest step the rules, the springs and the folk are advanced by at once. */
const SHORT_STEP = 1 / 50
/** The most rings there are on the water at once. */
export const MOST_RINGS = 24
export const RING_SECONDS = 1.1
const GRAVITY = 15
/** The hiss is a run of short grains of noise, this far apart, for as long as the finger moves. */
const HISS_EVERY = 0.07
/** In water the stroke is a slosh, this far apart, each with its ragged streak of wake. */
export const WAKE_EVERY = 0.22
/** Ticks of landing grains come no closer together than this. */
const TICK_EVERY = 0.045
/** How far the empty bucket is dragged over level sand before it is full. */
export const FILLS_AFTER = 1.2
/** Sand standing this high takes a tier on top; this high, one more brings the stack down. */
/**
 * Sand heaped this high is a heap to a finger or a bucket coming into it: higher than the rim of a finger's
 * groove, so crossing an old groove is a crunch with no crumble before it, and lower than the bank of the
 * bucket's furrow, a patted heap or a tower.
 */
export const HEAPED = 0.13
/** How far a stroke digs before what it has dug is a groove and not a dent: the width of a finger's dent and half as much again. */
export const GROOVE_LENGTH = 0.55
/** How far in front of the finger the sand is read for a gate: just inside the width of the cut, which is where it comes down next. */
export const GATE_LEAD = GATE_RADIUS - 0.03
export const TIER_FROM = 0.2
export const STACK_FALLS = 1.15
/** How far the sea comes up while the sun is on its way down: the scene brings the rest. */
const RISE_BY_SUN = 0.75
/** How strongly a pushed cloud is drawn back to where it was: it is back in about a quarter of a minute. */
const CLOUD_BACK = 0.3
/** The sand a finger shapes at its full depth: the grid, less the few cells at its edge that join the beach beyond. */
export const SAND = { x0: X0 + 1, x1: X1 - 1, z0: Z0 + 0.75, z1: Z1 - 1 } as const

type Stroke = {
  x: number
  z: number
  /** How far the finger has gone since the last step, and its smoothed speed. */
  travelled: number
  speed: number
  dirX: number
  dirZ: number
  sinceHiss: number
  sinceGrain: number
  /** The water has already come into this stroke. */
  wet: boolean
  /** The stroke is inside an older groove or a heap, so entering another is news. */
  inOld: boolean
  inHeap: boolean
  /** The finger has lifted in the middle of the stroke and may come back. */
  lifted: boolean
  /** The finger is out on the sea, past the sand: it digs nothing there. */
  atSea: boolean
  /**
   * The first cell this stroke dug down to a groove's depth, or -1, and how far it has dug on from there. Once
   * it has dug a groove's length the groove is entered in the order, at that cell; -2 says it has been.
   */
  grooveAt: number
  grooved: number
}

/** What is under the finger besides the sand: where it came from, so a touch taken away puts it back. */
type Held =
  | { kind: 'bucket'; fromX: number; fromZ: number; moved: boolean; gone: number; sound: number; before: Float32Array | null }
  | { kind: 'shell'; index: number; fromX: number; fromZ: number; moved: boolean; sound: number; was: Shell }
  | { kind: 'wood'; index: number; fromX: number; fromZ: number; fromTurn: number; moved: boolean; sound: number }
  | { kind: 'sun'; from: number }

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value
}
/** A line along a groove, turned so it starts at its end nearer the sea. */
function fromSea(path: readonly { x: number; z: number }[]): { x: number; z: number }[] {
  return path[0].z <= path[path.length - 1].z ? [...path] : [...path].reverse()
}
function smooth(t: number): number {
  const c = clamp(t, 0, 1)
  return c * c * (3 - 2 * c)
}

/** Where a thing is now: in the air on its way, or at rest at the place given. */
export function flightAt(fly: Flight | null, x: number, y: number, z: number): { x: number; y: number; z: number } {
  if (!fly) return { x, y, z }
  const leg = legs(fly)
  if (fly.lead && leg.to < 1) {
    // Over onto the thing beside it: straight up to the height it lifts off from, and across at that height.
    const up = smooth(clamp(leg.to / LEAD_UP, 0, 1)), e = leadAcross(leg.to), from = fly.lead
    return { x: from.x + (fly.fx - from.x) * e, y: from.y + (fly.fy - from.y) * up, z: from.z + (fly.fz - from.z) * e }
  }
  const t = leg.on, e = smooth(t)
  if (fly.flat) {
    // Lifted, carried across and set down: straight up where it was, level over whatever lies between, straight down.
    const top = Math.max(fly.fy, y) + fly.high, across = smooth(clamp((t - 0.25) / 0.5, 0, 1))
    const up = t < 0.25 ? fly.fy + (top - fly.fy) * smooth(t / 0.25) : t < 0.75 ? top : top + (y - top) * smooth((t - 0.75) / 0.25)
    return { x: fly.fx + (x - fly.fx) * across, y: up, z: fly.fz + (z - fly.fz) * across }
  }
  if (fly.skid) {
    // Shot out low: through the air for the first part of its way, then down on the sand and skittering to a stop.
    const air = Math.min(1, t / SKID_FROM), slid = clamp((t - SKID_FROM) / (1 - SKID_FROM), 0, 1)
    const way = 0.7 * air + 0.3 * (1 - (1 - slid) * (1 - slid))
    return { x: fly.fx + (x - fly.fx) * way, y: fly.fy + (y - fly.fy) * air + Math.sin(air * Math.PI) * fly.high, z: fly.fz + (z - fly.fz) * way }
  }
  return { x: fly.fx + (x - fly.fx) * e, y: fly.fy + (y - fly.fy) * e + Math.sin(t * Math.PI) * fly.high, z: fly.fz + (z - fly.fz) * e }
}
/** The share of a skidding flight that is in the air: it is down on the sand from here on. */
export const SKID_FROM = 0.5

export class Play {
  readonly field: Field = makeField()
  readonly folk: Folk
  readonly things: Things
  readonly sun: Sun
  readonly poses: Poses
  readonly grains: Grain[] = []
  readonly rings: Ring[] = []
  readonly clouds: Cloud[] = CLOUDS.map(() => ({ slide: 0, slideSpeed: 0, squash: 0, squashSpeed: 0 }))
  /** How far to either side the sky shows: the Mount says so for its surface. No cloud goes further than its edge. */
  skyHalf = 15.5
  /**
   * How far along the sky each cloud may be, by its middle: the Mount says so for its surface, which keeps every
   * cloud out from under the home control and the grown-up's corner. Until it has, the edge of the sky is all.
   */
  skyRanges: readonly { from: number; to: number }[] | null = null
  /** How far up the beach the surface shows, where that is further than the long wave runs by itself: the Mount says so, and the wave runs to there. */
  beachEnd: number = TIDE_OUT.toZ
  /** The voices queued since the Mount last played them. Everything one touch sets off is one voice. */
  readonly voices: Note[][] = []
  /** The voices of a scene that is playing, which the Mount plays apart: a touch that ends the scene ends them. */
  readonly sceneVoices: Note[][] = []
  /** A scene was ended by a touch: whatever of it is still sounding is closed. The Mount reads this and clears it. */
  hush = false
  /** Sounds that are still to come, each at its moment on the game's clock. None waits inside a voice. */
  private readonly cues: { at: number; name: VoiceName; by: Maker; scene: boolean; heard: Heard }[] = []
  /** Every sound of late, with who made it and when, for the test of the timeline. */
  readonly heard: Heard[] = []
  /** Where the grooves began, oldest first. */
  dug: number[]
  /** Something to save has changed; `urgent` says it is the outcome of a scene and goes to storage at once. */
  dirty = false
  urgent = false
  /** Seconds of play. */
  time = 0
  /** The level the sea stands at now, with its lapping, and without. */
  sea: number = SEA
  tide: number = SEA
  /** Where the water stands at evening and when it got there, or null by day. */
  water: Water | null = null
  /** For each cell, how far the evening water shows in it, 0 to 1; `wetVersion` rises when any changes. */
  readonly wet = new Float32Array(COLS * ROWS)
  wetVersion = 0
  /** How far the light has gone to evening, 0 to 1, and how gold it is as the tide goes out. */
  dusk = 0
  gold = 0
  /** The long wave: where its front is up the beach, how strong it shows, 0 to 1, and how far up it has cleared the evening water. */
  readonly wave = { front: TIDE_OUT.fromZ as number, show: 0, top: TIDE_OUT.fromZ as number, cleared: -Infinity }
  /** A dark patch where a bucket of water soaked away: where, and 1 fading to 0. */
  readonly stain = { x: 0, z: 0, show: 0 }
  /** Which shell the crab wears, or -1. */
  hat = -1
  /** Where the finger is working, for the folk to watch. */
  finger: Finger = null
  /** What the folk are told of the beach. */
  readonly world: World
  /** The heavy work done so far, counted: the frame-budget test reads these, never a clock. */
  readonly work = { floods: 0, sinks: 0, smooths: 0 }
  private plan: Plan = DAY_PLAN
  private stroke: Stroke | null = null
  private held: Held | null = null
  private scene: Scene | null = null
  /** The outcome of the scene that is playing, as it was saved when it started. */
  private outcome: Kingdom | null = null
  /** The seconds of running water the evening has had; Infinity once it stands filled. */
  private flow = Infinity
  private readonly flowed = new Set<number>()
  private readonly shellWet = [false, false, false]
  private hatStops = 0
  private fieldSeen = -1
  private readonly position: string
  private readonly rng: Rng
  private lastThud = -1
  private sinceTick = 1
  private ticks = 0
  private sinceDuck = 10

  constructor(saved: Kingdom, seed: number) {
    this.position = saved.position
    decode(saved.sand, this.field)
    this.dug = [...saved.dug]
    this.things = { bucket: { ...saved.bucket }, shells: saved.shells.map((shell) => ({ ...shell })), wood: saved.wood.map((wood) => ({ ...wood })) }
    this.sun = new Sun(saved.sun)
    this.poses = {
      bucket: { hop: 0, hopSpeed: 0, tilt: saved.bucket.side ? 1 : 0, fly: null, perch: 0, handle: 0 },
      shells: saved.shells.map((shell) => ({ sink: shell.state === 'pressed' ? 1 : 0, squash: 0, squashSpeed: 0, fly: null, spin: 0 })),
      wood: saved.wood.map(() => ({ rock: 0, rockSpeed: 0, lift: 0, fly: null })),
    }
    // The look of a visit (which variant, where a grain flies) has its own stream; nothing saved depends on it.
    this.rng = makeRng(seed)
    this.folk = new Folk(makeRng(seed ^ 0x5eaf01c))
    this.world = {
      finger: null,
      ground: (x, z) => this.ground(x, z),
      blocked: (x, z, r, shells = true, wood = true) => this.blocked(x, z, r, shells, wood),
      built: (x, z, r) => {
        const cell = builtNear(this.field, x, z, r)
        return cell ? { x: cell.x, z: cell.z, r: CELL * 0.5 } : null
      },
      footing: (x, z) => {
        // A bough that lies on the sand is stood on: its top is the floor over it.
        let floor = this.ground(x, z)
        this.things.wood.forEach((piece, index) => {
          // One in the hand, in the air or adrift is not lying: nothing stands on it.
          if ((this.held?.kind === 'wood' && this.held.index === index) || this.poses.wood[index].fly || this.drifts[index]) return
          const lies = this.woodPose(index)
          for (const patch of woodPatches({ x: lies.x, z: lies.z, turn: piece.turn })) if (Math.hypot(patch.x - x, patch.z - z) < patch.r) floor = Math.max(floor, lies.y + TOPS.wood)
        })
        return floor
      },
      support: (x, z) => Math.max(this.ground(x, z), rockTop(x, z), this.windowTop(x, z)),
      pillars: (who) => this.pillars(who),
      bucket: () => this.bucketPillar(),
      bucketOver: (x, z, r) => {
        // Where it stands or lies, and where it is drawn on its way there, with room for a finger's speed.
        const patch = bucketPatch(this.things.bucket), drawn = this.bucketPose()
        return Math.hypot(patch.x - x, patch.z - z) < patch.r + r + BUCKET_AHEAD || Math.hypot(drawn.x - x, drawn.z - z) < patch.r + r + BUCKET_AHEAD
      },
      shellOver: (x, z, r) =>
        this.things.shells.some((shell, index) => {
          // One in the bucket or on the crab is not on the sand. One in a tower's side hangs above the water: only
          // where the tower is low and its window comes down to the height of the eel's head is it in the way.
          if (shell.state === 'bucket' || this.hat === index) return false
          if (shell.state === 'tower') {
            // It stands on its edge facing the child: as long as the shell across, a hand thick from front to back.
            const stands = this.shellPose(index), size = SHELL_SIZES[index]
            if (stands.y - WINDOW_SLAB.tall * size > this.ground(x, z) + EEL_TOP) return false
            return Math.abs(stands.x - x) < WINDOW_SLAB.long * size + r && Math.abs(stands.z - z) < WINDOW_SLAB.thick + r
          }
          // One carried in the hand over the water is up in the air: nothing under it need duck.
          if (this.held?.kind === 'shell' && this.held.index === index && this.rideOf(this.held) > 0.3) return false
          const drawn = this.shellPose(index)
          return Math.hypot(shell.x - x, shell.z - z) < SHELL_REACH + r || Math.hypot(drawn.x - x, drawn.z - z) < SHELL_REACH + r
        }),
    }
    // The beach is found as it was left: at evening the water stands filled and the folk are at their places.
    if (this.sun.home === 'down') {
      this.tide = EVENING_SEA
      this.sea = EVENING_SEA
      this.dusk = 1
      this.replan()
      this.fillAtOnce()
      this.folk.settle(this.world)
    }
    this.folk.crab.stand(this.world)
    this.folk.starfish.seat(this.world)
    // Nothing sounds and nothing starts because the game was opened: a shell that lies in water is found full,
    // wood that floats is found afloat, and a shell whose tower is gone is found lying.
    this.things.shells.forEach((shell, index) => {
      if (shell.state === 'tower' && peakNear(this.field, shell.x, shell.z - 0.5, 0.4) < 0.3) shell.state = 'lying'
      this.shellWet[index] = shell.state !== 'bucket' && shell.state !== 'tower' && this.standing(shell.x, shell.z)
    })
    this.things.wood.forEach((piece, index) => {
      if (this.standing(piece.x, piece.z) && !this.bridges(piece)) {
        this.poses.wood[index].lift = 0.1
        this.afloat[index] = true
      }
    })
    this.fieldSeen = this.field.version
  }

  /** The beach as it is saved. Nothing in the air and nothing in the hand: a thing under a finger is saved where it came from. */
  toState(): Kingdom {
    if (this.outcome) return this.outcome
    const held = this.held
    const bucket = { ...this.things.bucket }
    if (held?.kind === 'bucket') {
      bucket.x = held.fromX
      bucket.z = held.fromZ
    }
    const shells = this.things.shells.map((shell, index) => (held?.kind === 'shell' && held.index === index ? (held.moved ? { ...held.was } : { ...shell, x: held.fromX, z: held.fromZ }) : { ...shell }))
    const wood = this.things.wood.map((piece, index) => {
      if (held?.kind === 'wood' && held.index === index) return { x: held.fromX, z: held.fromZ, turn: held.fromTurn }
      // Wood the water is carrying is saved where the water will leave it.
      const going = this.drifts[index], end = going ? going.path[going.path.length - 1] : piece
      return { ...piece, x: Math.round(end.x * 100) / 100, z: Math.round(end.z * 100) / 100 }
    })
    // The sun is saved where it set out from: in the hand or travelling by itself, no scene is owed on load.
    return { v: STATE_VERSION, position: this.position, finished: this.sun.home === 'down', sand: encode(this.field), dug: this.dug.slice(-MOST_GROOVES), sun: this.sun.home, bucket, shells, wood }
  }

  /** A scene is playing. The Mount keeps the idle ladder at the bottom for as long as it is. */
  get playing(): boolean {
    return this.scene !== null && this.scene.running
  }

  /** A touch ends the scene that is playing: everything lands where it was going, and the touch is then an ordinary touch. */
  endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
    this.outcome = null
    // One clock for sight and sound: what the scene was sounding stops with it, and what it had still to sound is never heard.
    this.hush = true
    this.sceneVoices.length = 0
    // A shell the scene had in the air, set down by the crab or tipped over by the wave, lies where it was going.
    for (const pose of this.poses.shells) pose.fly = null
    for (let i = this.cues.length - 1; i >= 0; i--) {
      // The tock of a shell that was in the air is the sound of a landing that now never comes, whoever set it flying.
      if (!this.cues[i].scene && !(this.cues[i].name === 'tock' && this.cues[i].by === 'shell')) continue
      const at = this.heard.indexOf(this.cues[i].heard)
      if (at >= 0) this.heard.splice(at, 1)
      this.cues.splice(i, 1)
    }
  }

  /**
   * The game as it is found when it is opened again: put away at any moment, what comes back is this, so a beach
   * that was parked and one that was loaded are the same beach. Nothing is in the air or in the hand, a sun that
   * was on its way is back where it set out, and a scene that was playing is at its end.
   */
  parked(seed: number): Play {
    return new Play(deserializeKingdom(JSON.parse(JSON.stringify(serializeKingdom(this.toState()))), null), seed)
  }

  /** Where along the sky each cloud is drawn now. The touch is taken from this, and so is the picture. */
  cloudXs(): number[] {
    return this.clouds.map((cloud, index) => {
      const range = this.cloudRange(index)
      return clamp(this.cloudHome(index) + cloud.slide, range.from, range.to)
    })
  }

  /** How far along the sky a cloud may be. */
  private cloudRange(index: number): { from: number; to: number } {
    const edge = this.skyHalf - CLOUDS[index].w * 0.3
    return this.skyRanges?.[index] ?? { from: -edge, to: edge }
  }

  /** Where a cloud is when nothing has pushed it: it drifts slowly to and fro about the place a visit finds it. */
  private cloudHome(index: number): number {
    const at = CLOUDS[index]
    return at.x + at.sway * Math.sin((this.time / at.every) * Math.PI * 2)
  }

  /** Where each thing a finger picks up is drawn now. The touch is taken from this, and so is the picture. */
  drawn(): Drawn {
    const bucket = this.things.bucket, pose = this.poses.bucket
    const sun = sunAt(this.sun.t)
    const stands = flightAt(pose.fly, bucket.x, this.ground(bucket.x, bucket.z) + pose.perch, bucket.z)
    return {
      bucket: { x: stands.x, y: stands.y + 0.45, z: stands.z },
      shells: this.things.shells.map((shell, index) => {
        const lies = this.shellPose(index)
        return { x: lies.x, y: lies.y + (shell.state === 'tower' ? 0 : 0.07), z: lies.z, shown: shell.state !== 'bucket' && this.hat !== index }
      }),
      wood: this.things.wood.map((piece, index) => {
        const lies = this.woodPose(index)
        return { x: lies.x, y: lies.y, z: lies.z, turn: piece.turn }
      }),
      sun,
    }
  }

  /** How high a piece of wood lies: on the sand under its two ends, or on the water that floats it. */
  woodHeight(index: number): number {
    const piece = this.things.wood[index]
    // It rests on its two ends. A tower turned out across it stands over it, and the wood goes through the
    // tower and sticks out of it, a long arm one side and a stub the other; it is never carried up onto the top.
    const [end, other] = woodEnds(piece)
    return (this.under(end.x, end.z) + this.under(other.x, other.z)) / 2 + 0.18 + this.poses.wood[index].lift
  }

  /** The sand a piece of wood rests on at a point: the ground there, but no higher than a rim. Sand that is heaped or built on it stands round it. */
  private under(x: number, z: number): number {
    return inField(x, z) ? base(z) + Math.min(deltaAt(this.field, x, z), HEAPED) : base(z)
  }

  /**
   * How a piece of wood leans where built sand stands over it: the end with the longer arm is levered up and the
   * other is pressed into the sand, so wood through a tower is never a level bar across an upright.
   */
  woodLean(index: number): number {
    const piece = this.things.wood[index], ax = Math.cos(piece.turn), az = Math.sin(piece.turn)
    const [end, other] = woodEnds(piece)
    const ends = (Math.min(deltaAt(this.field, end.x, end.z), HEAPED) + Math.min(deltaAt(this.field, other.x, other.z), HEAPED)) / 2
    let peak = BUILT, where = NaN
    for (const along of [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]) {
      const stands = deltaAt(this.field, piece.x + ax * along, piece.z + az * along) - ends
      if (stands > peak) {
        peak = stands
        where = along
      }
    }
    return Number.isNaN(where) ? 0 : where > 0.05 ? -WOOD_LEAN : WOOD_LEAN
  }

  /** The height of the ground at a point: the sand on the grid, the smooth beach beyond it. */
  ground(x: number, z: number): number {
    return inField(x, z) ? heightAt(this.field, x, z) : base(z)
  }

  /** Whether water stands at a point: the sea over the sand, or the evening water in a groove. */
  standing(x: number, z: number): boolean {
    if (!inField(x, z)) return false
    return heightAt(this.field, x, z) < this.sea - 0.01 || this.wet[cellOf(x, z)] > 0.5
  }

  /**
   * What lies in the way of one of the folk: the rocks, the log, the bucket, the wood, and the shells for all
   * but the crab, which picks a shell up. The crab's own ring is no one's obstacle.
   */
  private blocked(x: number, z: number, r: number, shells: boolean, wood = true): Patch | null {
    for (const patch of FIXED) if (Math.hypot(patch.x - x, patch.z - z) < patch.r + r - 0.25) return patch
    const bucket = bucketPatch(this.things.bucket)
    if (Math.hypot(bucket.x - x, bucket.z - z) < bucket.r + r) return bucket
    if (wood) for (const piece of this.things.wood) for (const patch of woodPatches(piece)) if (Math.hypot(patch.x - x, patch.z - z) < patch.r + r) return patch
    if (shells) {
      for (let index = 0; index < this.things.shells.length; index++) {
        const shell = this.things.shells[index]
        if (shell.state !== 'bucket' && shell.state !== 'tower' && this.hat !== index && Math.hypot(shell.x - x, shell.z - z) < SHELL_RADIUS + r) return { x: shell.x, z: shell.z, r: SHELL_RADIUS }
      }
    }
    return null
  }

  /** The bucket where it is drawn now, as the sand it stands over and the height of its top. */
  private bucketPillar(): Pillar {
    const bucket = this.things.bucket, at = this.poses.bucket
    const stands = flightAt(at.fly, bucket.x, this.ground(bucket.x, bucket.z) + at.perch, bucket.z)
    // Upright it is held to its handle; on its side, or on its way over, to the sweep of its rim.
    const lying = bucket.side || at.tilt > 0.02
    return { x: stands.x, z: stands.z, r: lying ? BUCKET_RADIUS + 0.5 : HANDLE_BOW + 0.05, top: stands.y + Math.max(0, at.hop) * 0.5 + (lying && !at.fly ? Math.max(TOPS.bucketOnSide, TOPS.bucket * (1 - at.tilt)) : TOPS.bucket * 1.1) }
  }

  /**
   * Everything that stands on the beach but the one who asks, as the sand it stands over and the height of its
   * top: the folk, the bucket, the shells and the wood, each where it is drawn now. Whatever is carried in the
   * hand, leaps or flies is lifted over these.
   */
  pillars(who?: Who): Pillar[] {
    const out = this.folk.pillars(this.world, who)
    // The crab's three rounds come first: the shell it wears stands on top of its eyes.
    if (this.hat >= 0) for (let i = 0; i < 3; i++) out[i] = { ...out[i], top: out[i].top + 0.55 }
    if (who?.kind !== 'bucket') out.push(this.bucketPillar())
    this.things.shells.forEach((shell, index) => {
      if ((who?.kind === 'shell' && who.index === index) || shell.state === 'bucket' || this.hat === index) return
      const lies = this.shellPose(index)
      out.push({ x: lies.x, z: lies.z, r: SHELL_RADIUS, top: lies.y + (shell.state === 'tower' ? TOPS.window : TOPS.shell) })
    })
    this.things.wood.forEach((piece, index) => {
      if (who?.kind === 'wood' && who.index === index) return
      const lies = this.woodPose(index)
      for (const patch of woodPatches({ x: lies.x, z: lies.z, turn: piece.turn })) out.push({ ...patch, top: lies.y + TOPS.wood })
    })
    return out
  }

  /**
   * How high a shell or a piece of wood in the hand is lifted off the sand where it is: over the top of whatever
   * it has come up to, another shell, the other bough, the bucket or one of the folk, and not at all over open sand.
   */
  private rideOf(held: Extract<Held, { kind: 'shell' | 'wood' }>): number {
    if (held.kind === 'shell') {
      const shell = this.things.shells[held.index], floor = this.ground(shell.x, shell.z)
      return over([{ x: shell.x, z: shell.z, r: SHELL_RADIUS }], floor, SHELL_OVER, this.pillars(held)) - floor
    }
    const piece = this.things.wood[held.index], floor = this.woodHeight(held.index)
    return over(woodPatches(piece), floor, WOOD_OVER, this.pillars(held)) - floor
  }

  /**
   * A thing let go in the air, or where it cannot lie, is carried to where it will lie: straight up, level
   * across over the top of everything on the way, and straight down. `rounds` gives the sand it is over at a
   * place, `fromY` how high it is now and `toY` how high it will lie.
   */
  private carried(who: Who, rounds: (x: number, z: number) => Patch[], under: number, fromX: number, fromY: number, fromZ: number, toX: number, toY: number, toZ: number): Flight {
    const pillars = this.pillars(who)
    let most = Math.max(fromY, toY)
    for (let i = 0; i <= 8; i++) {
      const x = fromX + ((toX - fromX) * i) / 8, z = fromZ + ((toZ - fromZ) * i) / 8
      // Whatever it comes within a hand's width of on the way, it goes over the top of.
      for (const pillar of pillars) if (apart(rounds(x, z), [pillar]) < 0.5) most = Math.max(most, pillar.top + under)
    }
    const far = Math.hypot(toX - fromX, toZ - fromZ)
    return { fx: fromX, fy: fromY, fz: fromZ, time: 0, span: far < 0.7 ? 0.26 : 0.36, high: most - Math.max(fromY, toY) + 0.06, flat: true }
  }

  /**
   * How high the full bucket is lifted in the hand at a place. It is carried over the top of a shell or a piece
   * of wood, and is all the way up before any part of it is over them: no part of the pail goes through either.
   */
  private rideAt(x: number, z: number): number {
    if (this.things.bucket.side) return 0
    const floor = this.ground(x, z)
    let up = 0
    this.things.wood.forEach((piece, index) => {
      const top = Math.max(0.3, this.woodHeight(index) - 0.18 + OVER_WOOD - floor)
      up = Math.max(up, top * clamp((1.2 - fromBough(piece, x, z).off) / 0.25, 0, 1))
    })
    this.things.shells.forEach((shell, index) => {
      if (shell.state === 'bucket' || this.hat === index) return
      const top = Math.max(0.3, (shell.state === 'tower' ? this.windowAt(shell.x, shell.z) : this.ground(shell.x, shell.z)) + OVER_SHELL - floor)
      up = Math.max(up, top * clamp((1.7 - Math.hypot(shell.x - x, shell.z - z)) / 0.25, 0, 1))
    })
    return up
  }

  /** What the bucket is set down clear of: the places always taken, the folk where they stand, the shells and the wood. */
  private roomForBucket(): Patch[] {
    return [...TAKEN, ...this.standingFolk(), ...roomForBucket(this.things, (index) => this.hat === index)]
  }

  /**
   * Where the bucket is set down: where it is if that is clear, and otherwise right beside what is in the way,
   * as near to where it was going as it can stand.
   */
  private setDown(x: number, z: number, side: boolean): { x: number; z: number } {
    const bucket = this.things.bucket, taken = this.roomForBucket()
    const own = (px: number, pz: number): Patch[] => [bucketPatch({ ...bucket, side, x: px, z: pz })]
    const from = keep(x, z), at = settle(x, z, own, taken)
    // The search goes by steps; it is brought back toward where it was going until it touches.
    let far = 1, near = 0
    for (let i = 0; i < 10; i++) {
      const mid = (far + near) / 2
      if (isClear(own(from.x + (at.x - from.x) * mid, from.z + (at.z - from.z) * mid), taken, 0.06)) far = mid
      else near = mid
    }
    return { x: from.x + (at.x - from.x) * far, z: from.z + (at.z - from.z) * far }
  }

  /** The bucket lifted from where it is and set down at a place, over the top of anything that lies between. */
  private lifted(fromY: number, fromX: number, fromZ: number, toX: number, toZ: number): Flight {
    const far = Math.hypot(toX - fromX, toZ - fromZ), land = this.ground(toX, toZ)
    // A short hop is low; a longer way goes as high as the bucket is carried over wood.
    const high = far < 0.7 ? 0.3 : Math.max(0.3, land + OVER_WOOD + 0.1 - Math.max(fromY, land))
    return { fx: fromX, fy: fromY, fz: fromZ, time: 0, span: far < 0.7 ? 0.24 : 0.34, high, flat: true }
  }

  /** How the bucket is drawn now. The picture and the tests of what it touches are both taken from this. */
  bucketPose(): BucketPose {
    const bucket = this.things.bucket, at = this.poses.bucket
    const stands = flightAt(at.fly, bucket.x, this.ground(bucket.x, bucket.z) + at.perch, bucket.z)
    // Turned out it is upside down over the tower and rights itself as it lifts off; its handle lies flat round its rim until it does.
    // Tipped out over a thing beside it, it turns over on its way onto the thing.
    const leg = at.fly ? legs(at.fly) : null
    const over = at.fly && leg && !at.fly.flat ? (leg.to < 1 ? leadAcross(leg.to) : 1 - leg.on) : 0
    return {
      // On its side it lies with its middle where it stood: it falls over to the left, so its foot goes to the right.
      x: stands.x + at.tilt * 0.45,
      y: stands.y + Math.max(0, at.hop) * 0.5 + at.tilt * 0.5,
      z: stands.z,
      turn: at.tilt * 1.45 + over * Math.PI,
      wide: 1 - at.hop * 0.18,
      tall: 1 + at.hop * 0.25,
      handle: (-0.5 + Math.sin(at.handle * 9) * at.handle * 0.7) * (1 - over) - (Math.PI / 2) * over,
    }
  }

  /** Where the crab wears a shell: set down over the tops of its eye stalks, turned and leaning with it. */
  private headOf(): { x: number; y: number; z: number } {
    const crab = this.folk.crab, up = CRAB_BACK + HAT_UP, front = HAT_FRONT
    const lx = -up * Math.sin(crab.lean), ly = up * Math.cos(crab.lean)
    return {
      x: crab.x + lx * Math.cos(crab.turn) + front * Math.sin(crab.turn),
      y: crab.floor + crab.lift * 0.35 + ly,
      z: crab.z - lx * Math.sin(crab.turn) + front * Math.cos(crab.turn),
    }
  }

  /**
   * How high the top of a shell set in the side of a tower stands over a point of the sand, for whoever lies on
   * the tower: the shell stands on its edge facing the child, a slab as long as the shell and a hand thick.
   */
  private windowTop(x: number, z: number): number {
    let top = -Infinity
    this.things.shells.forEach((shell, index) => {
      if (shell.state !== 'tower' || this.hat === index) return
      const size = SHELL_SIZES[index]
      if (Math.abs(x - shell.x) <= WINDOW_SLAB.long * size && Math.abs(z - shell.z) <= WINDOW_SLAB.thick) top = Math.max(top, this.windowAt(shell.x, shell.z) + WINDOW_SLAB.tall * size)
    })
    return top
  }

  /**
   * How high a shell set in the side of a tower is drawn: up the side from the sand at the tower's foot, not from
   * the slope it leans on, so that it stands against the side with its top no higher than the top of a tower of
   * one tier, and the starfish can lie on the tower over it.
   */
  private windowAt(x: number, z: number): number {
    return Math.min(this.ground(x, z), this.ground(x, z + 0.4)) + TOWER_WINDOW
  }

  /** How a shell that lies on the sand, stands in a tower, is carried in the hand or is worn by the crab is drawn now. */
  shellPose(index: number): ShellPose {
    const shell = this.things.shells[index], pose = this.poses.shells[index], size = SHELL_SIZES[index]
    if (this.hat === index) {
      // On its way up onto the crab's head, or on it: tipped like a hat.
      const crab = this.folk.crab, head = this.headOf(), fly = this.hatFly
      const at = flightAt(fly, head.x, head.y, head.z), on = fly ? smooth(fly.time / fly.span / 0.25) : 1
      const from = fly?.tip ?? 0.25
      return { x: at.x, y: at.y, z: at.z, tip: from + (0.25 - from) * on, spin: crab.turn * on + pose.spin * (1 - on), roll: (0.12 + crab.lean) * on, wide: size, tall: size }
    }
    const inTower = shell.state === 'tower'
    const held = this.held?.kind === 'shell' && this.held.index === index ? this.held : null
    const lies = flightAt(pose.fly, shell.x, (inTower ? this.windowAt(shell.x, shell.z) : this.ground(shell.x, shell.z) + 0.03) - pose.sink * 0.1, shell.z)
    // Lying it is a dome or a dish; pressed it tips half into the sand; in a tower it stands in the side, facing the child.
    const rest = inTower ? 1.15 : (shell.up ? 0 : Math.PI) + pose.sink * 0.42
    // Set down from the crab's head it keeps its tilt until it is over where it will lie.
    // Washed loose by the wave it tips over all the way down.
    const fly = pose.fly, turned = fly && fly.tip !== undefined ? smooth(fly.topple ? fly.time / fly.span : (fly.time / fly.span - 0.75) / 0.25) : 1
    return {
      x: lies.x,
      // The other way up it is a dish, and rests on its back. In the hand it is lifted over whatever it has come up to.
      y: lies.y + (!shell.up && !inTower ? 0.16 * size : 0) + (held ? this.rideOf(held) : 0),
      z: lies.z,
      tip: fly && fly.tip !== undefined ? fly.tip + (rest - fly.tip) * turned : rest,
      spin: pose.spin,
      roll: fly && fly.tip !== undefined && !fly.topple ? 0.12 * (1 - turned) : 0,
      wide: size * (1 + pose.squash * 0.12),
      tall: size * (1 - pose.squash * 0.3),
    }
  }

  /** The shell on its way up onto the crab's head. */
  private hatFly: Flight | null = null

  /** How a piece of wood is drawn now: turned as it lies, rocking like a see-saw about its middle, bobbing where it floats. */
  woodPose(index: number): WoodPose {
    const piece = this.things.wood[index], pose = this.poses.wood[index]
    const bob = pose.lift > 0.01 ? Math.sin(this.time * 1.7 + index * 2) * 0.03 * (pose.lift / 0.1) : 0
    const held = this.held?.kind === 'wood' && this.held.index === index ? this.held : null
    const lies = flightAt(pose.fly, piece.x, this.woodHeight(index), piece.z)
    // In the hand it is lifted over whatever it has come up to, and up there it is held all but level.
    const ride = held ? this.rideOf(held) : 0, level = pose.fly ? 1 : Math.min(1, ride / 0.2)
    const rock = pose.rock + this.woodLean(index)
    return { x: lies.x, y: lies.y + ride + bob, z: lies.z, turn: piece.turn, rock: rock + (clamp(rock, -0.08, 0.08) - rock) * level }
  }

  /** Queues a named sound as a voice of its own, or onto `voice`, and notes who made it. */
  private say(name: VoiceName, by: Maker, voice?: Note[], delay = 0): void {
    if (delay > 0) {
      // Later than now: it waits on the game's clock, and is dropped if a touch ends the scene it belongs to.
      this.cues.push({ at: this.time + delay, name, by, scene: this.scene !== null, heard: this.note(name, by, delay) })
      return
    }
    if (voice) voice.push(...VOICES[name])
    else this.sound([...VOICES[name]])
    this.note(name, by)
  }

  /** Hands a voice to the Mount: with the scene's voices while a scene plays, with the touch's otherwise. */
  private sound(voice: Note[]): void {
    if (voice.length > 0) (this.scene !== null ? this.sceneVoices : this.voices).push(voice)
  }

  private note(name: Heard['name'], by: Maker, delay = 0): Heard {
    if (this.heard.length >= 96) this.heard.shift()
    const heard = { name, by, at: this.time + delay }
    this.heard.push(heard)
    return heard
  }

  /** The sounds whose moment has come. */
  private playCues(): void {
    for (let i = 0; i < this.cues.length; i++) {
      const cue = this.cues[i]
      if (cue.at > this.time + 1e-9) continue
      this.cues.splice(i--, 1)
      ;(cue.scene ? this.sceneVoices : this.voices).push([...VOICES[cue.name]])
    }
  }

  // --- Touches ---------------------------------------------------------------

  /** The finger lands. The answer starts here, in the same frame. */
  press(target: Target): void {
    this.stroke = null
    this.held = null
    // A rock, the log, a cloud, the sky and the folk answer and are not carried: the finger passes on from them.
    this.passing = target.kind === 'rock' || target.kind === 'log' || target.kind === 'cloud' || target.kind === 'sky' || target.kind === 'folk'
    switch (target.kind) {
      case 'sand':
      case 'water':
        this.land(target.x, target.z, target.kind === 'water')
        break
      case 'folk':
        if (target.who === 'crab') this.folk.crab.poke()
        else if (target.who === 'starfish') this.folk.starfish.poke()
        else if (target.who === 'eel') this.folk.eel.poke()
        else this.folk.gulls.poke(target.index)
        this.drainFolk()
        break
      case 'bucket': {
        // It hops and its handle clinks; what the touch turns out to be comes with the lift or the first move.
        const bucket = this.things.bucket
        this.poses.bucket.hopSpeed = 3.6
        this.poses.bucket.handle = 1
        this.say('clink', 'bucket')
        this.held = { kind: 'bucket', fromX: bucket.x, fromZ: bucket.z, moved: false, gone: 0, sound: 0, before: null }
        break
      }
      case 'shell':
        this.pressShell(target.index)
        break
      case 'wood': {
        const piece = this.things.wood[target.index], pose = this.poses.wood[target.index]
        // It rocks like a see-saw, one end up and one end into the sand, with two hollow knocks.
        pose.rockSpeed = pose.rock >= 0 ? -3.4 : 3.4
        this.say('seesaw', 'wood')
        this.held = { kind: 'wood', index: target.index, fromX: piece.x, fromZ: piece.z, fromTurn: piece.turn, moved: false, sound: 0 }
        break
      }
      case 'sun': {
        const was = this.sun.mode
        const sound = this.sun.press()
        if (sound) this.say(sound === 'first' ? 'chimeFirst' : sound === 'second' ? 'chimeSecond' : 'hum', 'sun')
        if (was === 'rest') this.held = { kind: 'sun', from: this.sun.t }
        break
      }
      case 'rock':
        this.say('knock', 'rock')
        // It sheds a few grains.
        for (let i = 0; i < 5; i++) this.fling(target.x + (this.rng.next() - 0.5) * 0.8, target.y, target.z + 0.5, (this.rng.next() - 0.5) * 1.6, 0.8 + this.rng.next(), 0.6 + this.rng.next() * 0.8, false)
        break
      case 'log':
        // The gulls' log does not move: a deep hollow knock, and whoever stands on it bounces once.
        this.say('hollow', 'log')
        this.folk.gulls.bounce()
        for (let i = 0; i < 3; i++) this.fling(target.x + (this.rng.next() - 0.5) * 1.6, target.y - 0.2, target.z + 0.35, (this.rng.next() - 0.5) * 1.2, 0.5 + this.rng.next(), 0.5 + this.rng.next() * 0.6, false)
        break
      case 'cloud':
        this.say('puff', 'sky')
        this.clouds[target.index].squashSpeed += 7
        this.clouds[target.index].slideSpeed += 2.6
        break
      case 'sky': {
        this.say('breath', 'sky')
        // A breath of wind pushes the nearest cloud.
        const xs = this.cloudXs()
        let nearest = 0
        for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - target.x) < Math.abs(xs[nearest] - target.x)) nearest = i
        this.clouds[nearest].slideSpeed += 1.8
        break
      }
      default:
        target satisfies never
    }
  }

  /** The finger lifted where it landed: a tap. */
  tap(): void {
    const held = this.held
    if (held?.kind === 'bucket') {
      const bucket = this.things.bucket
      if (bucket.side) this.standUp()
      else if (bucket.holds === 'nothing') this.fill()
      else this.turnOut()
    } else if (held?.kind === 'sun') this.sunLetGo()
    this.letGo()
  }

  /**
   * The finger landed on a thing that answers and is not carried (a rock, the log, a cloud, the sky, one of the
   * folk) and is being drawn on with nothing in the hand.
   */
  passing = false

  /**
   * That finger has come to what is under it now. Onto the sand or the water it lands there as a finger does:
   * the sand's own sound, and a groove from where it came on. The thing it began on has had its answer.
   */
  comeOnto(target: Target): void {
    if (!this.passing || (target.kind !== 'sand' && target.kind !== 'water')) return
    this.passing = false
    this.land(target.x, target.z, target.kind === 'water')
  }

  /** The finger has begun to move with something under it. */
  dragStart(): void {
    // A bucket on its side is stood up by the start of a drag, and then goes with the finger.
    if (this.held?.kind === 'bucket' && this.things.bucket.side) this.standUp()
  }

  /**
   * The finger moves on. `x` and `z` are the point of the beach under it, or
   * null above the horizon; `shift` is how far down the sun's path it has
   * moved since it landed.
   */
  drag(x: number | null, z: number | null, shift: number): void {
    const held = this.held
    if (held?.kind === 'sun') {
      this.sun.drag(held.from + shift)
      return
    }
    if (x === null || z === null) return
    if (held?.kind === 'bucket') this.carryBucket(held, x, z)
    else if (held?.kind === 'shell') this.carryShell(held, x, z)
    else if (held?.kind === 'wood') this.carryWood(held, x, z)
    else this.dig(x, z)
  }

  /** The finger lifts in the middle of a drag. It may come back and carry on. */
  lift(): void {
    if (this.stroke) {
      this.stroke.lifted = true
      // At evening the water and the folk answer what was dug as soon as the finger is off the sand.
      if (this.sun.home === 'down' && this.sun.mode === 'rest' && !this.playing) this.replan(true)
    }
    this.finger = null
  }

  /** A thing is in the hand: the bucket, a shell, a piece of wood or the sun. Its drop is made when the finger lifts. */
  get holding(): boolean {
    return this.held !== null
  }
  /** A groove is being dug: the one thing a finger that lifts may come back to and carry on. */
  get digging(): boolean {
    return this.stroke !== null
  }
  /** True while a scene that is starting sets down what the finger held. */
  private handing = false

  /** Which shell shows over the rim of the bucket: the one that was scooped up, or -1. */
  peek(): number {
    const bucket = this.things.bucket
    return bucket.shell && !bucket.side ? this.things.shells.findIndex((shell) => shell.state === 'bucket') : -1
  }

  /** The drag is over where the finger let go: the thing stays there, and what was dug stays dug. */
  release(): void {
    const held = this.held
    if (held?.kind === 'bucket') {
      const bucket = this.things.bucket
      // It is set down on the sand: clear of the rocks, the log and the folk, and beside a shell or a piece of
      // wood it was let go over, never on it.
      const pose = this.poses.bucket, was = this.bucketPose()
      const at = this.setDown(bucket.x, bucket.z, bucket.side)
      if (pose.perch > 0 || Math.hypot(at.x - bucket.x, at.z - bucket.z) > 0.02) pose.fly = this.lifted(was.y, bucket.x, bucket.z, at.x, at.z)
      else pose.hopSpeed = -1.5
      bucket.x = at.x
      bucket.z = at.z
      pose.perch = 0
    } else if (held?.kind === 'shell') {
      // Let go over something, it is set down beside it: carried across over its top and lowered onto the sand.
      const shell = this.things.shells[held.index], pose = this.poses.shells[held.index]
      const ride = this.rideOf(held), was = this.ground(shell.x, shell.z) + 0.03 - pose.sink * 0.1 + ride
      const own = (x: number, z: number): Patch[] => [{ x, z, r: SHELL_RADIUS }]
      const at = settle(shell.x, shell.z, own, [...TAKEN, ...this.standingFolk(), ...this.handleRoom(), ...patchesOf(this.things, { kind: 'shell', index: held.index })])
      if (ride > 0.02 || Math.hypot(at.x - shell.x, at.z - shell.z) > 0.02) {
        pose.fly = this.carried(held, own, SHELL_OVER, shell.x, was, shell.z, at.x, this.ground(at.x, at.z) + 0.03 - pose.sink * 0.1, at.z)
        this.say('tock', 'shell', undefined, pose.fly.span)
      }
      shell.x = at.x
      shell.z = at.z
    } else if (held?.kind === 'wood') this.dropWood(held.index)
    else if (held?.kind === 'sun') this.sunLetGo()
    this.letGo()
  }

  /**
   * The room the bow of the standing bucket's handle takes: its two ends reach a little past the rim, at the
   * height of the rim. A thing lowered from above beside the bucket comes down clear of them.
   */
  private handleRoom(): Patch[] {
    const bucket = this.things.bucket
    return bucket.side ? [] : [{ x: bucket.x, z: bucket.z, r: HANDLE_BOW + 0.06 }]
  }

  /** The touch was taken away: the child made no drop. The thing in hand goes back where it came from; a groove stays as far as it was dug. */
  cancel(): void {
    const held = this.held
    if (held?.kind === 'bucket') {
      this.things.bucket.x = held.fromX
      this.things.bucket.z = held.fromZ
      this.poses.bucket.perch = 0
    } else if (held?.kind === 'shell') {
      // A drag taken away keeps nothing: the shell is where it was, the way up it was, pressed in or in the
      // side of its tower as it was. The press that began the drag turned it over, and that is undone too.
      Object.assign(this.things.shells[held.index], held.was)
      this.poses.shells[held.index].fly = null
    } else if (held?.kind === 'wood') {
      const piece = this.things.wood[held.index]
      piece.x = held.fromX
      piece.z = held.fromZ
      piece.turn = held.fromTurn
    } else if (held?.kind === 'sun') this.sun.cancel()
    this.letGo()
  }

  /**
   * The sand the folk stand on now, away from their day places: the crab to the tips of its legs and claws, the
   * starfish wherever it is but on its rock, gulls on a wall with the sand in front of them, and the small
   * crabs. A thing let go there comes to rest beside them, and the bucket in the hand slides round them.
   */
  private standingFolk(): Patch[] {
    const crab = this.folk.crab, star = this.folk.starfish
    const out: Patch[] = crabRounds(crab)
    if (star.on !== 'rock' || star.move !== 'perched') out.push(...star.rounds())
    out.push(...wallPatches(this.folk.gulls.birds.filter((bird) => bird.place === 'wall')))
    if (this.plan.gulls.kind === 'wall') out.push(...wallPatches(this.plan.gulls.perches))
    for (const small of this.folk.small.crabs) if (small.shown > 0.02) out.push({ x: small.x, z: small.z, r: 1.15 * small.size })
    return out
  }

  /** Nothing is under the finger any more. At evening the folk answer what was changed as soon as the finger lifts. */
  private letGo(): void {
    const changed = this.held !== null || this.stroke !== null
    this.passing = false
    this.held = null
    this.stroke = null
    this.finger = null
    if (changed) this.dirty = true
    if (changed && !this.handing && this.sun.home === 'down' && this.sun.mode === 'rest' && !this.playing) this.replan(true)
  }

  private sunLetGo(): void {
    const sound = this.sun.release()
    if (sound) this.say(sound === 'second' ? 'chimeSecond' : 'hum', 'sun')
  }

  private land(atX: number, atZ: number, water: boolean): void {
    // A finger anywhere on the sand shapes it. Past the sand the grid holds at its full depth, the nearest of it
    // is shaped; out at sea the water answers under the finger.
    const atSea = water && (atZ < SAND.z0 || !inField(atX, atZ))
    const x = atSea ? atX : clamp(atX, SAND.x0, SAND.x1), z = atSea ? atZ : clamp(atZ, SAND.z0, SAND.z1)
    this.finger = { x, z, digging: !atSea }
    const stroke: Stroke = { x, z, travelled: 0, speed: 0, dirX: 0, dirZ: 0, sinceHiss: 0, sinceGrain: 0, wet: water, inOld: false, inHeap: false, lifted: false, atSea, grooveAt: -1, grooved: 0 }
    this.stroke = stroke
    if (atSea) {
      this.splash(x, z)
      return
    }
    const voice: Note[] = []
    const pool = !water && this.wet[cellOf(x, z)] > 0.5
    if (water || pool) {
      this.splash(x, z)
      dent(this.field, x, z)
      stroke.wet = true
    } else if (isRaised(this.field, x, z)) {
      // Raised sand is patted flat, with a slap and a puff of grains round the edge.
      pat(this.field, x, z)
      beginStroke(this.field)
      stroke.inHeap = true
      this.say('slap', 'finger', voice)
      for (let i = 0; i < 8; i++) {
        const turn = (i / 8) * Math.PI * 2
        this.fling(x + Math.cos(turn) * 0.5, heightAt(this.field, x, z), z + Math.sin(turn) * 0.5, Math.cos(turn) * 1.4, 1.2, Math.sin(turn) * 1.4, false)
      }
    } else {
      const deep = deltaAt(this.field, x, z) < -0.12
      stroke.inOld = deep
      dent(this.field, x, z)
      // A finger in a groove goes deeper and water wells up; on level sand it is a thud.
      if (deep) {
        this.say('squelch', 'finger', voice)
        // The water is seen to come up: a bright ring spreads over the bottom of the hole and bubbles rise from it.
        const bottom = heightAt(this.field, x, z)
        this.ripple({ x, z, age: 0, y: bottom + 0.03 })
        for (let i = 0; i < 6; i++) this.bubble(x + (i % 3) * 0.1 - 0.1, bottom + 0.02, z + (i % 2) * 0.1 - 0.05, 0.5 + i * 0.05, 0.3 + i * 0.07)
      } else {
        voice.push(...thud(this.nextThud()))
        this.note('thud', 'finger')
      }
      for (let i = 0; i < 10; i++) {
        const turn = this.rng.next() * Math.PI * 2, out = 0.9 + this.rng.next() * 1.3
        this.fling(x, heightAt(this.field, x, z) + 0.1, z, Math.cos(turn) * out, 2.2 + this.rng.next() * 1.6, Math.sin(turn) * out, false)
      }
      this.startle(x, z)
    }
    this.shove(x, z)
    if (!stroke.wet && this.reachesSea(x, z)) {
      stroke.wet = true
      this.say('gurgle', 'sea', voice, 0.06)
      this.ripple({ x, z, age: 0 })
    }
    this.sound(voice)
    this.dirty = true
  }

  /** The finger is drawn across the sand: the groove follows it. */
  private dig(x: number, z: number): void {
    const stroke = this.stroke
    if (!stroke) return
    if (z < SAND.z0 && this.sea > base(z) + 0.01) {
      // Out on the sea past the sand: the groove ends at the water's edge, and the sea answers under the finger.
      const gone = stroke.atSea ? Math.hypot(x - stroke.x, z - stroke.z) : 0
      if (gone > 0.01) {
        stroke.dirX = (x - stroke.x) / gone
        stroke.dirZ = (z - stroke.z) / gone
      }
      stroke.atSea = true
      stroke.wet = true
      stroke.x = x
      stroke.z = z
      stroke.travelled += gone
      stroke.sinceGrain += gone
      this.finger = { x, z, digging: false }
      while (stroke.sinceGrain > 0.5) {
        stroke.sinceGrain -= 0.5
        // A finger too slow for a wake still sounds: each ring it throws is a plip.
        if (stroke.speed <= 0.35) this.say('plip', 'sea')
        this.ripple({ x, z, age: 0 })
        for (let i = 0; i < 3; i++) this.fling(x, this.sea + 0.05, z, (this.rng.next() - 0.5) * 1.6, 2.4 + this.rng.next() * 1.6, (this.rng.next() - 0.5) * 1.6, true)
      }
      return
    }
    // The stroke stays on the sand: past its edge the finger digs along the edge.
    const toX = clamp(x, SAND.x0, SAND.x1), toZ = clamp(z, SAND.z0, SAND.z1)
    if (stroke.atSea) {
      // Back from the sea: the groove starts where the finger comes ashore.
      stroke.atSea = false
      stroke.grooveAt = -1
      stroke.grooved = 0
      stroke.x = toX
      stroke.z = toZ
      beginStroke(this.field)
    }
    if (stroke.lifted) {
      // The finger is back. It carries the same groove on from where it lands: the sand between is not dug.
      stroke.lifted = false
      if (Math.hypot(toX - stroke.x, toZ - stroke.z) > DIG_RADIUS * 2) {
        stroke.x = toX
        stroke.z = toZ
      }
    }
    const gone = Math.hypot(toX - stroke.x, toZ - stroke.z)
    if (gone < 0.01) return
    // What the finger is coming into, read before the groove is laid: an older groove, or a heap.
    // It is read a finger's width ahead, past the rim this stroke is pushing up itself.
    const reach = DIG_RADIUS + RIM_WIDTH + CELL
    const aheadX = Math.min(X1, Math.max(X0, toX + ((toX - stroke.x) / gone) * reach))
    const aheadZ = Math.min(Z1, Math.max(Z0, toZ + ((toZ - stroke.z) / gone) * reach))
    const ahead = deltaAt(this.field, aheadX, aheadZ)
    const fresh = this.field.near[cellAt(aheadX, aheadZ)] === Infinity
    const old = fresh && ahead < -0.12
    // Into an old groove: a two-step crunch, and the wall between crumbles with a dry trickle.
    if (old && !stroke.inOld) {
      // The wall is the sand between the finger and the old groove: it falls in as the crunch sounds, and its
      // grains run down into the groove.
      const voice: Note[] = []
      this.say('crunch', 'finger', voice)
      this.say('trickle', 'finger', voice)
      this.voices.push(voice)
      const wallX = (toX + aheadX) / 2, wallZ = (toZ + aheadZ) / 2
      const top = heightAt(this.field, wallX, wallZ) + 0.08
      crumbleWall(this.field, wallX, wallZ)
      for (let i = 0; i < 9; i++) {
        const side = (i / 8 - 0.5) * 0.8
        this.fling(wallX - ((toZ - stroke.z) / gone) * side, top, wallZ + ((toX - stroke.x) / gone) * side, ((toX - stroke.x) / gone) * (0.5 + this.rng.next() * 0.5), 0.35 + this.rng.next() * 0.4, ((toZ - stroke.z) / gone) * (0.5 + this.rng.next() * 0.5), false)
      }
    }
    if (fresh) stroke.inOld = old
    // Through raised sand a gate is cut. Its ticks sound, and grains slide off its two sides, when the cut is
    // made: when the sand a gate's width in front of the finger stands heaped, in the frame it comes down.
    const cutX = clamp(toX + ((toX - stroke.x) / gone) * GATE_LEAD, X0, X1 - 0.01), cutZ = clamp(toZ + ((toZ - stroke.z) / gone) * GATE_LEAD, Z0, Z1 - 0.01)
    const cutting = deltaAt(this.field, cutX, cutZ) > HEAPED
    if (cutting && !stroke.inHeap) {
      this.say('crumble', 'finger')
      const top = heightAt(this.field, cutX, cutZ)
      for (let i = 0; i < 8; i++) {
        const side = i % 2 === 0 ? 1 : -1, sx = (-(toZ - stroke.z) / gone) * side, sz = ((toX - stroke.x) / gone) * side
        // From each cut side, in toward the gate and down.
        this.fling(cutX + sx * GATE_RADIUS, top, cutZ + sz * GATE_RADIUS, -sx * (0.3 + this.rng.next() * 0.4), 0.2 + this.rng.next() * 0.3, -sz * (0.3 + this.rng.next() * 0.4), false)
      }
    }
    stroke.inHeap = cutting
    groove(this.field, stroke.x, stroke.z, toX, toZ)
    // A groove is in the order they were dug from the moment it is one: wherever the stroke began (on level
    // sand, in water, coming ashore from the sea or through a heap), the first place it is dug down to a groove's
    // depth is where the groove began, once it has gone a groove's length from there. A dent is not a groove.
    if (stroke.grooveAt >= 0) stroke.grooved += gone
    else if (stroke.grooveAt === -1 && deltaAt(this.field, toX, toZ) < GROOVE) stroke.grooveAt = cellAt(toX, toZ)
    if (stroke.grooveAt >= 0 && stroke.grooved >= GROOVE_LENGTH) {
      this.dug.push(stroke.grooveAt)
      if (this.dug.length > MOST_GROOVES) this.dug.splice(0, this.dug.length - MOST_GROOVES)
      stroke.grooveAt = -2
    }
    stroke.dirX = (toX - stroke.x) / gone
    stroke.dirZ = (toZ - stroke.z) / gone
    stroke.travelled += gone
    stroke.sinceGrain += gone
    stroke.x = toX
    stroke.z = toZ
    this.finger = { x: toX, z: toZ, digging: true }
    this.shove(toX, toZ)
    // Grains spray off the front of the stroke. Under standing water nothing sprays: the sand that is dug comes up
    // through the water as a cloud, motes of sand that drift out from the finger on the water and are gone.
    const under = stroke.wet && this.reachesSea(toX, toZ)
    while (stroke.sinceGrain > 0.13) {
      stroke.sinceGrain -= 0.13
      const side = this.rng.next() - 0.5
      if (under) {
        const turn = this.rng.next() * Math.PI * 2, out = 0.25 + this.rng.next() * 0.5
        this.silt(toX + Math.cos(turn) * 0.12, this.waterTop(toX, toZ) + 0.04, toZ + Math.sin(turn) * 0.12, Math.cos(turn) * out, Math.sin(turn) * out, 0.5 + this.rng.next() * 0.4)
        continue
      }
      this.fling(toX + stroke.dirX * DIG_RADIUS, heightAt(this.field, toX, toZ) + 0.12, toZ + stroke.dirZ * DIG_RADIUS, stroke.dirX * (1.2 + this.rng.next()) - stroke.dirZ * side * 2.4, 1.6 + this.rng.next() * 1.8, stroke.dirZ * (1.2 + this.rng.next()) + stroke.dirX * side * 2.4, false)
      // Grains flung by a stroke that comes near the gulls: they duck, as they do when a finger lands near them.
      this.startle(toX, toZ)
    }
    if (!stroke.wet && this.reachesSea(toX, toZ)) {
      // The groove has been dug down to the water: it comes in along it.
      stroke.wet = true
      this.say('gurgle', 'sea')
      this.ripple({ x: toX, z: toZ, age: 0 })
    }
    this.dirty = true
  }

  /** A shell where the finger digs is pushed aside: it lies beside the groove, never over it. */
  private shove(x: number, z: number, within = 0.95): void {
    this.things.shells.forEach((shell, index) => {
      if (shell.state === 'bucket' || this.hat === index) return
      const dx = shell.x - x, dz = shell.z - z, apart = Math.hypot(dx, dz)
      if (apart >= within) return
      const ux = apart > 0.05 ? dx / apart : 1, uz = apart > 0.05 ? dz / apart : 0
      const at = settle(x + ux * (within + 0.05), z + uz * (within + 0.05), (px, pz) => [{ x: px, z: pz, r: SHELL_RADIUS }], [...TAKEN, ...patchesOf(this.things, { kind: 'shell', index })])
      shell.x = at.x
      shell.z = at.z
      if (shell.state !== 'lying') {
        shell.state = 'lying'
        this.say('tock', 'shell')
      }
      this.poses.shells[index].squashSpeed = 5
      this.poses.shells[index].spin += 0.6
    })
  }

  // --- The shells --------------------------------------------------------------

  private pressShell(index: number): void {
    const shell = this.things.shells[index], pose = this.poses.shells[index]
    const was = { ...shell }
    this.held = { kind: 'shell', index, fromX: shell.x, fromZ: shell.z, moved: false, sound: 0, was }
    pose.squashSpeed = 6
    if (shell.state === 'lying') {
      // Pressed half into the sand, with a damp squeak.
      shell.state = 'pressed'
      this.say('dampSqueak', 'shell')
    } else {
      // Pressed again, or pulled from the side of a tower: it pops out with a tock and lies the other way up.
      if (shell.state === 'tower') {
        const at = settle(shell.x, shell.z + 0.75, (x, z) => [{ x, z, r: SHELL_RADIUS }], [...TAKEN, ...patchesOf(this.things, { kind: 'shell', index })])
        pose.fly = { fx: shell.x, fy: this.windowAt(shell.x, shell.z), fz: shell.z, time: 0, span: 0.3, high: 0.35 }
        shell.x = at.x
        shell.z = at.z
        // It lands where it came out: a touch taken away leaves it there.
        this.held = { kind: 'shell', index, fromX: at.x, fromZ: at.z, moved: false, sound: 0, was }
      }
      shell.state = 'lying'
      shell.up = !shell.up
      this.say('tock', 'shell')
    }
    this.dirty = true
  }

  /** A shell goes with the finger, ploughing a thin line with a clicking scrape. */
  private carryShell(held: Extract<Held, { kind: 'shell' }>, x: number, z: number): void {
    const shell = this.things.shells[held.index]
    // Only what never moves turns it aside. The crab at its place by day is one of the folk: the shell rides up and over it.
    const to = slide(x, z, (px, pz) => [{ x: px, z: pz, r: SHELL_RADIUS * 0.6 }], FIXED)
    const gone = Math.hypot(to.x - shell.x, to.z - shell.z)
    if (gone < 0.01) return
    if (!held.moved) {
      held.moved = true
      shell.state = 'lying'
      beginStroke(this.field)
    }
    // The line is ploughed behind it, step by step, so it is unbroken however fast the finger goes. Lifted over
    // something it ploughs nothing and makes no scrape: the line stops there and starts again beyond.
    const lifted = this.rideOf(held) > 0.04
    const steps = Math.max(1, Math.ceil(gone / 0.12))
    if (!lifted) for (let i = 1; i <= steps; i++) plough(this.field, shell.x + ((to.x - shell.x) * i) / steps, shell.z + ((to.z - shell.z) * i) / steps)
    shell.x = to.x
    shell.z = to.z
    const up = this.rideOf(held) > 0.04
    if (up && !lifted) this.say('tock', 'shell')
    if (!up && lifted) beginStroke(this.field)
    this.poses.shells[held.index].spin += gone * 0.5
    held.sound += up ? 0 : gone
    if (held.sound > 0.22) {
      held.sound = 0
      this.say('clickScrape', 'shell')
    }
    this.finger = { x: to.x, z: to.z, digging: false }
    this.dirty = true
  }

  // --- The driftwood -----------------------------------------------------------

  /** A piece of wood goes with the finger, with a low woody rumble. */
  private carryWood(held: Extract<Held, { kind: 'wood' }>, x: number, z: number): void {
    const piece = this.things.wood[held.index]
    // Only what never moves turns it aside: over the crab at its place by day it rides, as over any of the folk.
    const to = slide(x, z, (px, pz) => woodPatches({ ...piece, x: px, z: pz }), FIXED)
    const gone = Math.hypot(to.x - piece.x, to.z - piece.z)
    if (gone < 0.01) return
    held.moved = true
    const lifted = this.rideOf(held) > 0.04
    piece.x = to.x
    piece.z = to.z
    // Lifted over something it goes level and quiet; it knocks once as it comes up onto it.
    const up = this.rideOf(held) > 0.04
    if (up && !lifted) this.say('softKnock', 'wood')
    if (!up) this.poses.wood[held.index].rockSpeed += gone * 1.2 * (this.rng.next() < 0.5 ? -1 : 1)
    held.sound += up ? 0 : gone
    if (held.sound > 0.3) {
      held.sound = 0
      this.say('woodRumble', 'wood')
    }
    this.finger = { x: to.x, z: to.z, digging: false }
    this.dirty = true
  }

  /** Whether a piece of wood lies across a groove as a bridge: its middle over the groove and both ends on the banks. */
  private bridges(piece: { x: number; z: number; turn: number }): boolean {
    if (dugShare(this.field, piece.x, piece.z, 0.35) < 0.3) return false
    const [end, other] = woodEnds(piece)
    return deltaAt(this.field, end.x, end.z) > GROOVE * 0.5 && deltaAt(this.field, other.x, other.z) > GROOVE * 0.5
  }

  /**
   * Let go across a groove, it lies as a bridge with a clack; anywhere else it stays where it is let go. Let go
   * over something, it is carried across over its top and set down beside it.
   */
  private dropWood(index: number): void {
    const piece = this.things.wood[index], pose = this.poses.wood[index]
    const held: Extract<Held, { kind: 'wood' }> = this.held?.kind === 'wood' && this.held.index === index ? this.held : { kind: 'wood', index, fromX: piece.x, fromZ: piece.z, fromTurn: piece.turn, moved: false, sound: 0 }
    const ride = this.rideOf(held), was = this.woodHeight(index) + ride, from = { x: piece.x, z: piece.z }
    const others = [...TAKEN, ...this.standingFolk(), ...this.handleRoom(), ...patchesOf(this.things, { kind: 'wood', index })]
    const along = grooveTurn(this.field, piece.x, piece.z)
    let bridge = false
    if (ride < 0.02 && along !== null && dugShare(this.field, piece.x, piece.z, 0.35) >= 0.3) {
      // Across the groove and well askew, as a bough laid by hand lies, if its ends then rest on the banks
      // and nothing is in the way. The two pieces lie askew to different sides.
      const across = { x: piece.x, z: piece.z, turn: along + Math.PI / 2 + (index === 0 ? ASKEW : -ASKEW) }
      while (across.turn > Math.PI / 2) across.turn -= Math.PI
      while (across.turn <= -Math.PI / 2) across.turn += Math.PI
      const clear = isClear(woodPatches(across), others, 0.06)
      if (clear && this.bridges(across)) {
        piece.turn = across.turn
        pose.rockSpeed = 2
        this.say('bridge', 'wood')
        bridge = true
      }
    }
    if (bridge) return
    const own = (x: number, z: number): Patch[] => woodPatches({ ...piece, x, z })
    const at = settle(piece.x, piece.z, own, others)
    piece.x = at.x
    piece.z = at.z
    if (ride > 0.02 || Math.hypot(at.x - from.x, at.z - from.z) > 0.02) {
      pose.fly = this.carried({ kind: 'wood', index }, own, WOOD_OVER, from.x, was, from.z, at.x, this.woodHeight(index), at.z)
      this.say('softKnock', 'wood', undefined, pose.fly.span)
    } else pose.rockSpeed = 1.2
  }

  // --- The bucket --------------------------------------------------------------

  private standUp(): void {
    this.things.bucket.side = false
    this.poses.bucket.hopSpeed = 3
    this.say('clonk', 'bucket')
    this.dirty = true
  }

  /** A tap on the empty bucket fills it where it stands: a scoop and a crunch, or a glug where it stands in water. */
  private fill(): void {
    const bucket = this.things.bucket
    if (this.standing(bucket.x, bucket.z)) {
      bucket.holds = 'water'
      this.say('glug', 'bucket')
      this.ripple({ x: bucket.x, z: bucket.z, age: 0 })
    } else {
      bucket.holds = 'sand'
      // The scoop is taken from the sand in front of it, where it shows.
      scoop(this.field, bucket.x - 0.2, bucket.z + 0.85)
      const voice: Note[] = []
      this.say('scoop', 'bucket', voice)
      this.say('crunch', 'bucket', voice, 0.1)
      this.voices.push(voice)
      for (let i = 0; i < 6; i++) this.fling(bucket.x - 0.2 + (this.rng.next() - 0.5) * 0.5, this.ground(bucket.x, bucket.z + 0.85) + 0.1, bucket.z + 0.85, (this.rng.next() - 0.5) * 1.4, 1.6 + this.rng.next(), (this.rng.next() - 0.5) * 1.0, false)
    }
    this.poses.bucket.hopSpeed = -3
    this.dirty = true
  }

  /** The nearest shell lying on the sand within reach of a point, or -1. */
  private shellNear(x: number, z: number, reach: number): number {
    let best = -1, nearest = reach
    this.things.shells.forEach((shell, index) => {
      if (shell.state === 'bucket' || shell.state === 'tower' || this.hat === index) return
      const apart = Math.hypot(shell.x - x, shell.z - z)
      if (apart < nearest) {
        nearest = apart
        best = index
      }
    })
    return best
  }

  /**
   * The ways a shell can be shot out from under a tower turned out on it at a spot: for each way round, the
   * furthest place it can lie, where the whole way there is clear of the rocks, the wood and the other shells
   * and the place is clear of the tower. None, where it is hemmed in.
   */
  private waysOut(index: number, x: number, z: number): { x: number; z: number }[] {
    // The shell is taken as wide as the longest of the three with room to spare, and each piece of wood by five
    // rounds that hold it to its tips.
    const inWay: Patch[] = [...TAKEN.map((patch) => ({ ...patch, r: patch.r - 0.2 })), ...this.standingFolk()]
    this.things.shells.forEach((shell, other) => {
      if (other !== index && shell.state !== 'bucket' && this.hat !== other) inWay.push({ x: shell.x, z: shell.z, r: SHELL_RADIUS })
    })
    for (const piece of this.things.wood) for (const along of [-1.2, -0.6, 0, 0.6, 1.2]) inWay.push({ x: piece.x + Math.cos(piece.turn) * along, z: piece.z + Math.sin(piece.turn) * along, r: 0.3 })
    const out: { x: number; z: number }[] = []
    for (let i = 0; i < 16; i++) {
      const turn = (i / 16) * Math.PI * 2, dx = Math.cos(turn), dz = Math.sin(turn)
      let far = 0
      for (let gone = 1.0; gone <= 2.6 + 1e-6; gone += 0.1) {
        const px = x + dx * gone, pz = z + dz * gone, kept = keep(px, pz)
        if (Math.hypot(kept.x - px, kept.z - pz) > 1e-6 || !isClear([{ x: px, z: pz, r: SHELL_RADIUS + 0.2 }], inWay, 0.06)) break
        far = gone
      }
      // Far enough to lie clear of the tower's foot.
      if (far >= 0.9 + SHELL_RADIUS + 0.06) out.push({ x: x + dx * far, z: z + dz * far })
    }
    return out
  }

  /**
   * Where the bucket comes down beside what it has turned out at a place: on level sand, on whichever side has
   * the room, the place that needs the least shifting, and never on top of a tower that stands there already.
   */
  private bucketLanding(x: number, z: number, others: readonly Patch[]): { x: number; z: number } {
    const bucket = this.things.bucket
    let best = { x, z }, least = Infinity
    for (const turn of [0, Math.PI, Math.PI / 4, (Math.PI * 3) / 4, Math.PI / 2, -Math.PI / 4, (-Math.PI * 3) / 4]) {
      const aimX = x + Math.cos(turn) * 1.55, aimZ = z + 0.25 + Math.sin(turn) * 1.3
      const aim = keep(aimX, aimZ)
      const to = settle(aim.x, aim.z, (px, pz) => [bucketPatch({ ...bucket, x: px, z: pz })], others)
      const raised = inField(to.x, to.z) && peakNear(this.field, to.x, to.z, BUCKET_RADIUS) > HEAPED
      const off = Math.hypot(to.x - aimX, to.z - aimZ) + (raised ? 3 : 0) + (Math.hypot(to.x - x, to.z - z) < BUCKET_RADIUS * 2 + 0.2 ? 3 : 0)
      if (off < least - 0.01) {
        least = off
        best = to
      }
    }
    return best
  }

  /**
   * A tower turned out on a shell: where the bucket comes down, and where the shell shot out from under the
   * tower comes to lie. The shell goes low over the sand by a way that is clear to its end, never through a
   * piece of wood or another shell, and never the way the bucket is going: as the bucket tumbles upright its
   * rim trails low behind it. Of the ways that leave, the one that leads furthest from the bucket's. Where
   * every way crosses the place the bucket would come down on, the bucket comes down clear of the shell's way.
   * Null when no way and no place go together: the shell is hemmed in.
   */
  private shotOut(under: number, x: number, z: number, others: readonly Patch[]): { at: { x: number; z: number }; to: { x: number; z: number } } | null {
    const ways = this.waysOut(under, x, z)
    const cost = (at: { x: number; z: number }, way: { x: number; z: number }): number | null => {
      const gone = Math.max(0.1, Math.hypot(at.x - x, at.z - z)), out = Math.hypot(way.x - x, way.z - z)
      const toward = ((way.x - x) * (at.x - x) + (way.z - z) * (at.z - z)) / (gone * out)
      if (toward > SHOT_ASIDE) return null
      for (let far = 1.0; far <= out + 1e-6; far += 0.1) if (Math.hypot(x + ((way.x - x) * far) / out - at.x, z + ((way.z - z) * far) / out - at.z) < BUCKET_RADIUS + 0.25 + SHELL_RADIUS) return null
      return toward - out * 0.15
    }
    let best: { at: { x: number; z: number }; to: { x: number; z: number } } | null = null, least = Infinity
    const first = this.bucketLanding(x, z, others)
    for (const way of ways) {
      const now = cost(first, way)
      if (now !== null && now < least) {
        least = now
        best = { at: first, to: way }
      }
    }
    if (best) return best
    for (const way of ways) {
      const out = Math.hypot(way.x - x, way.z - z), path: Patch[] = []
      for (let far = 1.0; far <= out + 1e-6; far += 0.3) path.push({ x: x + ((way.x - x) * far) / out, z: z + ((way.z - z) * far) / out, r: SHELL_RADIUS + 0.25 })
      path.push({ x: way.x, z: way.z, r: SHELL_RADIUS + 0.25 })
      const at = this.bucketLanding(x, z, [...others, ...path])
      const now = cost(at, way)
      if (now !== null && now < least) {
        least = now
        best = { at, to: way }
      }
    }
    return best
  }

  /** The full bucket is turned out where it stands. What comes of it depends on what is on that spot. */
  private turnOut(): void {
    const bucket = this.things.bucket, field = this.field
    let x = bucket.x, z = bucket.z
    const voice: Note[] = []
    let built = false
    const taken: Patch[] = [...TAKEN]
    // Set down against a shell or a piece of wood on level sand, it is tipped out over it: the tower lands on
    // the shell, or across the wood.
    let under = -1, across = -1
    let shot: { at: { x: number; z: number }; to: { x: number; z: number } } | null = null
    if (bucket.holds === 'sand' && !this.standing(x, z) && deltaAt(field, x, z) >= GROOVE && peakNear(field, x, z, 0.45) <= TIER_FROM) {
      under = this.shellNear(x, z, AT_SHELL)
      // A shell with nowhere to go, hemmed in by wood and shells on every side, or with no way out but the way
      // the bucket must go, is left where it lies: the tower is turned out beside it.
      if (under >= 0) {
        const lies = this.things.shells[under]
        const room: Patch[] = [...TAKEN, { x: lies.x, z: lies.z, r: 0.72 }, ...roomForBucket(this.things, (index) => this.hat === index || index === under)]
        if (bucket.shell) room.push({ x: lies.x, z: lies.z + 0.5, r: 0.8 })
        shot = this.shotOut(under, lies.x, lies.z, room)
        if (!shot) under = -1
      }
      if (under >= 0) {
        x = this.things.shells[under].x
        z = this.things.shells[under].z
      } else {
        across = this.things.wood.findIndex((piece) => fromBough(piece, x, z).off < AT_WOOD)
        if (across >= 0) {
          // Across the wood, and to one side of its middle: one arm sticks out long and the other short.
          const piece = this.things.wood[across], ax = Math.cos(piece.turn), az = Math.sin(piece.turn)
          const off = (x - piece.x) * ax + (z - piece.z) * az >= 0 ? OFF_MIDDLE : -OFF_MIDDLE
          x = piece.x + ax * off
          z = piece.z + az * off
        }
      }
    }
    // How high the sand lay there before anything was turned out on it.
    const floor = this.ground(x, z)
    if (bucket.holds === 'water') {
      // Water: one sploosh that soaks away to a dark patch, and no tower.
      this.say('sploosh', 'bucket', voice)
      this.stain.x = x
      this.stain.z = z
      this.stain.show = 1
      for (let i = 0; i < 12; i++) {
        const turn = this.rng.next() * Math.PI * 2, out = 0.8 + this.rng.next() * 1.4
        this.fling(x, this.ground(x, z) + 0.5, z, Math.cos(turn) * out, 1.5 + this.rng.next() * 1.5, Math.sin(turn) * out, true)
      }
    } else {
      const peak = peakNear(field, x, z, 0.45)
      if (this.standing(x, z)) {
        // Into water: a splosh and a ring wave, a fizz, and it slumps at once to a low island.
        heap(field, x, z, 1.0, Math.max(0.22, this.sea - base(z) + 0.14))
        this.say('splosh', 'bucket', voice)
        this.say('fizz', 'bucket', voice, 0.1)
        this.ripple({ x, z, age: 0, big: true })
      } else if (deltaAt(field, x, z) < GROOVE) {
        // Into a groove: it plugs it as a dam, and its foot spreads.
        tower(field, x, z, 0, 1, 1)
        this.say('glop', 'bucket', voice)
        built = true
      } else if (peak >= STACK_FALLS) {
        // A third tier: the whole stack comes down into one big soft heap.
        heap(field, x, z, 1.6, 0.5)
        this.say('slump', 'bucket', voice)
        for (let i = 0; i < 16; i++) {
          const turn = (i / 16) * Math.PI * 2
          this.fling(x + Math.cos(turn) * 0.7, base(z) + 0.9, z + Math.sin(turn) * 0.7, Math.cos(turn) * 2.2, 1.4 + this.rng.next(), Math.sin(turn) * 2.2, false)
        }
      } else if (peak > TIER_FROM) {
        // On raised sand: a second, narrower tier, with a whump and a creak.
        tower(field, x, z, peak, 0.7)
        this.say('whump', 'bucket', voice)
        this.say('creakTier', 'bucket', voice, 0.12)
        built = true
      } else {
        // On level sand: a tower stands, bucket-shaped; a hollow whump, then a sucking pop as the bucket lifts.
        tower(field, x, z, 0, 1)
        if (across >= 0) this.say('thudCrack', 'bucket', voice)
        else this.say('whump', 'bucket', voice)
        this.say('pop', 'bucket', voice, 0.2)
        built = true
      }
      if (across >= 0 && built && peak <= TIER_FROM) {
        // The wood sticks out of the tower, one long arm and one stub: it lies where it lay, through the tower.
        this.poses.wood[across].rockSpeed = 1.5
      }
      // Grains slide down its side.
      for (let i = 0; i < 9; i++) {
        const turn = this.rng.next() * Math.PI * 2
        this.fling(x + Math.cos(turn) * 0.5, this.ground(x, z) + 0.1, z + Math.sin(turn) * 0.5, Math.cos(turn) * 0.9, 0.4 + this.rng.next() * 0.6, Math.sin(turn) * 0.9, false)
      }
      taken.push({ x, z, r: built ? 0.72 : 1.0 })
    }
    bucket.holds = 'nothing'
    // The bucket lifts off and stands beside what it made, clear of everything.
    // Beside it, on level sand, on whichever side has the room: the place that needs the least shifting, and
    // never on top of a tower that stands there already.
    const others = [...taken, ...roomForBucket(this.things, (index) => this.hat === index || index === under)]
    if (built && bucket.shell) others.push({ x, z: z + 0.5, r: 0.8 })
    // With a shell under the tower, where the bucket comes down and where the shell shoots out were found together.
    const at = shot ? shot.at : this.bucketLanding(x, z, others)
    const shotTo = shot ? shot.to : { x, z }
    // It lifts off upside down, its mouth already above the shell or the wood it was tipped out over.
    const mouth = across >= 0 ? this.woodHeight(across) - 0.18 + OVER_WOOD : under >= 0 ? floor + OVER_SHELL + 0.2 : 0
    const lift: Flight = { fx: x, fy: Math.max(this.ground(x, z) + 0.75, mouth + 0.95), fz: z, time: 0, span: 0.42, high: 0.5 }
    // Tipped out over a shell or a bough beside it: it goes over onto the thing from where it stood, turning
    // over as it goes, and lifts off from there. It is never in two places from one frame to the next.
    const stood = this.bucketPose(), aside = Math.hypot(x - bucket.x, z - bucket.z)
    if (aside > 0.05) {
      // Long enough to be seen to go: the higher it must rise and the further across, the longer it takes.
      const reach = clamp(Math.max((lift.fy - stood.y) * 0.12, aside * 0.145), 0.18, 0.32)
      lift.lead = { x: stood.x, y: stood.y, z: stood.z, share: reach / (lift.span + reach) }
      lift.span += reach
    }
    this.poses.bucket.fly = lift
    /** Where a shell that pops up out of the bucket comes to lie: to the side, and never the way the bucket is going. */
    const away = (index: number, far: number): { x: number; z: number } => {
      const gone = Math.max(0.1, Math.hypot(at.x - x, at.z - z)), bx = (at.x - x) / gone, bz = (at.z - z) / gone
      const side = Math.abs(bx) > 0.15 ? -Math.sign(bx) : x > 0 ? -1 : 1
      const room = [...TAKEN, { x, z, r: 0.9 }, { x: at.x, z: at.z, r: BUCKET_RADIUS + 0.25 }, ...patchesOf(this.things, { kind: 'shell', index })]
      let best = { x, z }, lowest = Infinity
      for (const [ax, az] of [[side * far, 0.3], [side * far * 0.85, -far * 0.5], [side * far * 0.85, far * 0.5], [-bx * far, -bz * far], [-side * far, 0.3], [0, -far], [0, far]]) {
        const to = settle(x + ax, z + az, (px, pz) => [{ x: px, z: pz, r: SHELL_RADIUS }], room)
        const out = Math.max(0.1, Math.hypot(to.x - x, to.z - z))
        // How far it would fly the bucket's way, as a share of its flight.
        const toward = ((to.x - x) * bx + (to.z - z) * bz) / out
        if (toward < lowest - 0.05) {
          lowest = toward
          best = to
        }
        if (toward <= 0.1) break
      }
      return best
    }
    if (under >= 0) {
      // The tower landed on a shell: it shoots out sideways with a ping and skitters to a stop.
      const shell = this.things.shells[under], pose = this.poses.shells[under]
      const to = shotTo
      // Out from under the foot of the tower, low over the sand; it comes down and skitters the last of the way,
      // and the skitter sounds from the frame it is down.
      pose.fly = { fx: shell.x, fy: floor + 0.1, fz: shell.z, time: 0, span: SHOT_SECONDS, high: 0.25, skid: true }
      shell.x = to.x
      shell.z = to.z
      shell.state = 'lying'
      this.say('ping', 'shell', voice)
      this.say('skitter', 'shell', voice, SHOT_SECONDS * SKID_FROM)
    }
    if (bucket.shell) {
      // The shell that was scooped up comes out stuck in the side of the tower as a window, toward the child.
      const index = this.things.shells.findIndex((shell) => shell.state === 'bucket')
      bucket.shell = false
      if (index >= 0) {
        const shell = this.things.shells[index]
        if (built) {
          shell.state = 'tower'
          shell.x = x
          shell.z = z + 0.5
        } else {
          // No tower to stand in: it pops up out of the bucket as it lifts, and lands on the other side from it.
          const to = away(index, 1.5)
          shell.state = 'lying'
          shell.x = to.x
          shell.z = to.z
          this.poses.shells[index].fly = { fx: x, fy: lift.fy + 0.5, fz: z, time: 0, span: 0.4, high: 1.0 }
        }
      }
    }
    this.poses.bucket.perch = 0
    bucket.x = at.x
    bucket.z = at.z
    this.voices.push(voice)
    this.dirty = true
  }

  /** The bucket goes with the finger. Empty, it works the sand it is dragged over; full, it rumbles and digs nothing. */
  private carryBucket(held: Extract<Held, { kind: 'bucket' }>, x: number, z: number): void {
    const bucket = this.things.bucket, field = this.field, pose = this.poses.bucket
    // It slides round the rocks and round the folk where they stand: it is never carried through one of them.
    const to = slide(x, z, (px, pz) => [{ x: px, z: pz, r: BUCKET_RADIUS + 0.1 }], [...TAKEN, ...this.standingFolk()])
    const gone = Math.hypot(to.x - bucket.x, to.z - bucket.z)
    if (gone < 0.01) return
    const dirX = (to.x - bucket.x) / gone, dirZ = (to.z - bucket.z) / gone
    if (!held.moved) {
      held.moved = true
      beginStroke(field)
      // The beach as it lay before this drag: what the bucket meets is read from it, not from its own furrow.
      held.before = field.d.slice()
    }
    const before = held.before ?? field.d
    held.sound += gone
    pose.handle = Math.min(1, pose.handle + gone * 0.8)
    this.finger = { x: to.x, z: to.z, digging: false }
    this.dirty = true
    if (bucket.holds !== 'nothing') {
      // Full: a heavy rumble and a rattle of its handle, or a slop of water. It digs nothing.
      if (held.sound > 0.32) {
        held.sound = 0
        if (bucket.holds === 'water') this.say('slop', 'bucket')
        else {
          const voice: Note[] = []
          this.say('rumble', 'bucket', voice)
          this.say('rattle', 'bucket', voice, 0.05)
          this.voices.push(voice)
        }
      }
      bucket.x = to.x
      bucket.z = to.z
      pose.perch = this.rideAt(to.x, to.z)
      return
    }
    pose.perch = 0
    // Against a piece of wood: its rim knocks the wood with a clang, it bounces back off it and falls over on its
    // side where it has the room to, spilling what it holds. It never goes over the wood.
    const hit = this.things.wood.find((piece) => fromBough(piece, to.x, to.z, 0.9).off < 0.95)
    if (hit) {
      const spilled = this.things.shells.findIndex((shell) => shell.state === 'bucket')
      const was = this.bucketPose(), on = fromBough(hit, bucket.x, bucket.z)
      bucket.side = true
      bucket.shell = false
      const back = Math.max(0.05, on.off)
      const at = this.setDown(bucket.x + ((bucket.x - on.x) / back) * 0.45, bucket.z + ((bucket.z - on.z) / back) * 0.45, true)
      pose.fly = this.lifted(was.y, bucket.x, bucket.z, at.x, at.z)
      bucket.x = at.x
      bucket.z = at.z
      if (spilled >= 0) {
        const shell = this.things.shells[spilled]
        const lies = settle(at.x - dirX * 1.3, at.z - dirZ * 1.3 + 0.2, (px, pz) => [{ x: px, z: pz, r: SHELL_RADIUS }], [...TAKEN, ...patchesOf(this.things, { kind: 'shell', index: spilled })])
        this.poses.shells[spilled].fly = { fx: at.x, fy: this.ground(at.x, at.z) + 0.5, fz: at.z, time: 0, span: 0.35, high: 0.2 }
        shell.state = 'lying'
        shell.x = lies.x
        shell.z = lies.z
      }
      for (let i = 0; i < 6; i++) this.fling(at.x, this.ground(at.x, at.z) + 0.4, at.z, dirX * (1 + this.rng.next()) + (this.rng.next() - 0.5), 1 + this.rng.next(), dirZ * (1 + this.rng.next()) + (this.rng.next() - 0.5), false)
      this.say('clang', 'bucket')
      // It lies there: the finger has nothing under it any more. At evening the water and the folk answer its
      // furrow and where it fell now, as they answer a thing let go.
      this.letGo()
      return
    }
    // Over a shell: it is scooped up with the sand and rattles in the bucket. A second one is pushed aside.
    // It is in the bucket, or out of the way, before the pail is over it.
    const shellAt = this.shellNear(to.x, to.z, 1.4)
    if (shellAt >= 0) {
      if (!bucket.shell) {
        this.things.shells[shellAt].state = 'bucket'
        bucket.shell = true
        this.say('shellRattle', 'bucket')
      }
      this.shove(to.x, to.z, 1.45)
    }
    // What its leading edge meets, and what lies a little further on.
    const leadX = clamp(to.x + dirX * 0.3, X0, X1 - 0.01), leadZ = clamp(to.z + dirZ * 0.3, Z0, Z1 - 0.01)
    const frontX = clamp(to.x + dirX * 0.75, X0, X1 - 0.01), frontZ = clamp(to.z + dirZ * 0.75, Z0, Z1 - 0.01)
    if (this.standing(to.x, to.z)) {
      // Through water: it fills with water and slops as it goes.
      bucket.holds = 'water'
      this.say('glug', 'bucket')
      this.ripple({ x: to.x, z: to.z, age: 0 })
    } else if (before[cellAt(leadX, leadZ)] < GROOVE) {
      // Over a groove: the groove is scooped into a round basin, with a heavy wet slurp.
      basin(field, leadX, leadZ)
      bucket.holds = 'sand'
      this.say('slurp', 'bucket')
    } else if (before[cellAt(frontX, frontZ)] > HEAPED) {
      // Over raised sand: the top is shaved off level with a dry rasp, and the bucket is full at once.
      shave(field, frontX, frontZ)
      bucket.holds = 'sand'
      this.say('rasp', 'bucket')
    } else {
      // Over level sand: a wide flat-bottomed furrow, a low grinding scrape, and it fills and heaps over.
      if (held.gone === 0) this.began(bucket.x, bucket.z)
      furrow(field, bucket.x, bucket.z, to.x, to.z)
      held.gone += gone
      if (held.sound > 0.2) {
        held.sound = 0
        this.say('scrape', 'bucket')
      }
      if (held.gone >= FILLS_AFTER) {
        bucket.holds = 'sand'
        pose.hopSpeed = 2
      }
    }
    bucket.x = to.x
    bucket.z = to.z
  }

  // --- Time ----------------------------------------------------------------------

  /**
   * A frame's seconds, played as short steps: the clock may hand over a frame of a tenth of a second, and a hop
   * or a spring stepped that far at once flies off for good.
   */
  step(dt: number): void {
    for (let left = dt; left > 1e-9; left -= SHORT_STEP) this.advance(Math.min(left, SHORT_STEP))
  }

  private advance(dt: number): void {
    this.time += dt
    this.playCues()
    const sun = this.sun
    const arrived = sun.step(dt)
    if (arrived === 'arrived-down') this.folkCome()
    else if (arrived === 'arrived-up') this.tideOut()
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) {
        this.scene = null
        this.outcome = null
      }
    }
    if (!this.scene) {
      // The sea follows the sun. On the way down it comes up; on the way up from evening it draws far back, further than by day.
      const t = smooth(sun.t)
      this.tide = sun.home === 'up' ? SEA + (EVENING_SEA - SEA) * RISE_BY_SUN * t : FAR_SEA + (EVENING_SEA - FAR_SEA) * t
      this.dusk = t
      if (sun.home === 'down' && this.water) {
        // The water in the grooves goes back out with it, the furthest first, and the folk leave for their day places.
        const leaving = sun.t < 1
        if (leaving) this.flow = this.water.last * clamp(sun.t * 1.3 - 0.3, 0, 1)
        else if (this.flow !== Infinity) {
          this.flow += dt
          if (this.flow > this.water.last + 0.3) this.flow = Infinity
        }
        this.folk.setPlan(sun.t < 0.94 ? DAY_PLAN : this.plan)
      }
    }
    // The sea laps: a slow swell and a quicker one on top of it.
    this.sea = this.tide + 0.03 * Math.sin(this.time * 0.8) + 0.012 * Math.sin(this.time * 2.1)
    this.showWater(dt)
    this.runBack(dt)
    this.stain.show = Math.max(0, this.stain.show - dt / 7)

    const stroke = this.stroke
    if (stroke && dt > 0) {
      stroke.speed += (stroke.travelled / dt - stroke.speed) * Math.min(1, dt * 14)
      stroke.travelled = 0
      stroke.sinceHiss += dt
      if (stroke.speed > 0.35 && stroke.sinceHiss >= HISS_EVERY) {
        stroke.sinceHiss = 0
        // In the water the stroke is a slosh, slow or fast; on the sand, the gritty hiss that follows the finger's speed.
        const afloat = stroke.atSea || this.reachesSea(stroke.x, stroke.z)
        if (afloat) {
          // A wake: with each slosh a ragged streak of foam is left behind the finger, never the same twice, and
          // at a fast finger a smaller fleck beside it. No two are alike and none is the mirror of another.
          this.say('wake', 'finger')
          const fast = stroke.speed > 1.5
          if (fast) stroke.sinceHiss = HISS_EVERY - WAKE_EVERY
          const back = Math.atan2(-stroke.dirZ, -stroke.dirX)
          const lay = (behind: number, aside: number, long: number): void => {
            const turn = back + (this.rng.next() - 0.5) * 0.7
            this.ripple({ x: stroke.x + Math.cos(back) * behind - Math.sin(back) * aside, z: stroke.z + Math.sin(back) * behind + Math.cos(back) * aside, age: RING_SECONDS * 0.3, turn, long })
          }
          lay(0.4 + this.rng.next() * 0.3, (this.rng.next() - 0.5) * 0.3, fast ? 2 + this.rng.next() * 1.6 : 1.2 + this.rng.next() * 0.8)
          if (fast && this.rng.next() < 0.6) lay(0.75 + this.rng.next() * 0.3, (this.rng.next() < 0.5 ? -1 : 1) * (0.2 + this.rng.next() * 0.2), 1 + this.rng.next() * 0.6)
        } else {
          this.voices.push(hiss(stroke.speed))
          this.note('hiss', 'finger')
        }
      }
    }
    this.sinceDuck += dt
    this.world.finger = this.finger
    // The sun away from its place at the top, and for the scene in which the folk come: they turn to it.
    this.world.sun = sun.mode !== 'rest' || (this.scene !== null && sun.home === 'down') ? { x: SUN.x, low: sun.t, gone: sun.home === 'down' && this.scene ? this.time - this.sunDown : 0 } : null
    this.folk.step(dt, this.world)
    this.wearHat()
    for (const kick of this.folk.crab.kicks) for (let i = 0; i < 4; i++) this.fling(kick.x, this.ground(kick.x, kick.z) + 0.1, kick.z, (this.rng.next() - 0.5) * 2.4, 1 + this.rng.next(), 0.4 + this.rng.next(), false)
    this.folk.crab.kicks.length = 0
    this.drainFolk()
    this.moveThings(dt)

    this.sinceTick += dt
    for (let i = this.grains.length - 1; i >= 0; i--) {
      const grain = this.grains[i]
      if (grain.bubble !== undefined) {
        // A bubble rises a little way and is gone.
        grain.bubble -= dt
        grain.y += grain.vy * dt
        grain.x += (grain.wet ? Math.sin(grain.bubble * 9) * 0.2 : grain.vx) * dt
        if (!grain.wet) grain.z += grain.vz * dt
        if (grain.bubble <= 0) this.grains.splice(i, 1)
        continue
      }
      grain.vy -= GRAVITY * dt
      grain.x += grain.vx * dt
      grain.y += grain.vy * dt
      grain.z += grain.vz * dt
      const ground = Math.max(this.sea, this.ground(grain.x, grain.z))
      if (grain.y > ground || grain.vy > 0) continue
      this.grains.splice(i, 1)
      if (ground === this.sea && this.rings.length < MOST_RINGS) this.rings.push({ x: grain.x, z: grain.z, age: RING_SECONDS * 0.45 })
      if (Math.hypot(grain.x - this.folk.crab.x, grain.z - this.folk.crab.z) < 0.9) this.folk.crab.pinch()
      if (this.sinceTick >= TICK_EVERY) {
        this.sinceTick = 0
        this.voices.push(tick(this.ticks++))
        this.note('tick', 'finger')
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].age += dt
      if (this.rings[i].age >= RING_SECONDS) this.rings.splice(i, 1)
    }
    this.clouds.forEach((cloud, index) => {
      // Each drifts by itself (cloudHome). A pushed cloud slides off along the sky, slows, and drifts back to
      // where it was; at the edge of the sky it bunches up and goes no further, so the sky always has its clouds.
      cloud.slideSpeed += -cloud.slide * CLOUD_BACK * dt
      cloud.slideSpeed *= Math.pow(0.35, dt)
      cloud.slide += cloud.slideSpeed * dt
      // The same where it would come under the home control or the grown-up's corner, pushed there or drifting
      // there by itself: it stops short of it, and goes back.
      const home = this.cloudHome(index), range = this.cloudRange(index), x = home + cloud.slide
      if (x > range.to || x < range.from) {
        const side = x > range.to ? 1 : -1
        if (cloud.slideSpeed * side > 0.6) cloud.squashSpeed += 4
        cloud.slide = (side > 0 ? range.to : range.from) - home
        if (cloud.slideSpeed * side > 0) cloud.slideSpeed = 0
      }
      cloud.squashSpeed += (-cloud.squash * 90 - cloud.squashSpeed * 7) * dt
      cloud.squash += cloud.squashSpeed * dt
    })
  }

  private drainFolk(): void {
    const folk = this.folk
    const each: [Maker, VoiceName[]][] = [['crab', folk.crab.sounds], ['starfish', folk.starfish.sounds], ['eel', folk.eel.sounds], ['gulls', folk.gulls.sounds], ['small', folk.small.sounds]]
    for (const [who, sounds] of each) {
      for (const sound of sounds) this.say(sound, who)
      sounds.length = 0
    }
  }

  /** What moves in the things for a moment: hops, squashes, flights, the see-saw, floating. */
  private moveThings(dt: number): void {
    const bucket = this.things.bucket, pose = this.poses.bucket
    pose.hopSpeed += (-pose.hop * 260 - pose.hopSpeed * 16) * dt
    pose.hop += pose.hopSpeed * dt
    // Knocked back off a piece of wood, it falls over once it has landed.
    pose.tilt += ((bucket.side && !pose.fly ? 1 : 0) - pose.tilt) * Math.min(1, dt * 14)
    pose.handle = Math.max(0, pose.handle - dt * 1.6)
    if (pose.fly) {
      pose.fly.time += dt
      if (pose.fly.time >= pose.fly.span) {
        pose.hopSpeed = pose.fly.flat ? -1.5 : -2.4
        pose.fly = null
      }
    }
    if (this.hatFly) {
      this.hatFly.time += dt
      if (this.hatFly.time >= this.hatFly.span) this.hatFly = null
    }
    // A shell stuck in a tower that is no longer there lies down where it was.
    const changed = this.field.version !== this.fieldSeen
    this.fieldSeen = this.field.version
    this.things.shells.forEach((shell, index) => {
      const at = this.poses.shells[index]
      if (changed && shell.state === 'tower' && peakNear(this.field, shell.x, shell.z - 0.5, 0.4) < 0.3) {
        // It drops from where it stood, so whoever swims below has the time to go under.
        const was = this.shellPose(index)
        shell.state = 'lying'
        at.fly = { fx: was.x, fy: was.y, fz: was.z, time: 0, span: 0.3, high: 0.08 }
      }
      at.sink += ((shell.state === 'pressed' ? 1 : 0) - at.sink) * Math.min(1, dt * 16)
      at.squashSpeed += (-at.squash * 240 - at.squashSpeed * 14) * dt
      at.squash += at.squashSpeed * dt
      if (at.fly) {
        at.fly.time += dt
        at.spin += dt * 9
        if (at.fly.time >= at.fly.span) {
          at.fly = null
          at.squashSpeed = 4
        }
      }
      // The water reaches it: it fills with a glug and lets go a string of bubbles, and stays where it is.
      const wet = shell.state !== 'bucket' && shell.state !== 'tower' && this.hat !== index && this.standing(shell.x, shell.z)
      if (wet && !this.shellWet[index]) {
        this.say('bubbles', 'shell')
        at.squashSpeed = 3
        for (let i = 0; i < 7; i++) this.bubble(shell.x + (i % 3) * 0.06 - 0.06, this.ground(shell.x, shell.z) + 0.1 - i * 0.12, shell.z, 0.55 + i * 0.03, 0.5 + i * 0.16)
      }
      this.shellWet[index] = wet
    })
    this.things.wood.forEach((piece, index) => {
      const at = this.poses.wood[index]
      at.rockSpeed += (-at.rock * 70 - at.rockSpeed * 5) * dt
      at.rock = clamp(at.rock + at.rockSpeed * dt, -0.32, 0.32)
      if (at.fly) {
        at.fly.time += dt
        if (at.fly.time >= at.fly.span) {
          at.fly = null
          at.rockSpeed = 1.2
        }
      }
      // On water it floats, unless it lies across as a bridge.
      const floats = this.standing(piece.x, piece.z) && !this.bridges(piece) && !(this.held?.kind === 'wood' && this.held.index === index)
      at.lift += ((floats ? 0.1 : 0) - at.lift) * Math.min(1, dt * 3)
      // Lifted off the sand by water that has come to it, by the open sea as much as by a groove: it creaks once
      // as it lifts, and rocks. Wood that sets off down a groove has creaked already.
      if (floats && !this.afloat[index] && !this.drifts[index]) {
        this.say('woodCreak', 'wood')
        at.rockSpeed = 1.4
      }
      this.afloat[index] = floats || (this.afloat[index] && this.held?.kind === 'wood' && this.held.index === index && this.standing(piece.x, piece.z))
      const going = this.drifts[index]
      if (going) {
        going.time += dt
        const t = clamp(going.time / going.span, 0, 1), along = smooth(t) * (going.path.length - 1)
        const low = Math.floor(along), high = Math.min(going.path.length - 1, low + 1)
        piece.x = going.path[low].x + (going.path[high].x - going.path[low].x) * (along - low)
        piece.z = going.path[low].z + (going.path[high].z - going.path[low].z) * (along - low)
        // It bumps the sides with soft knocks on its way.
        for (const knock of [0.35, 0.7]) {
          if (t >= knock && going.knocks < knock) {
            going.knocks = knock
            at.rockSpeed += 1.6
            this.say('softKnock', 'wood')
          }
        }
        if (t >= 1) this.drifts[index] = null
      }
    })
  }

  /**
   * The crab, a shell in its way: a claw lifts it onto its head before a leg comes to it, it wears it as a hat
   * while it goes by, and at the first dead stop where it stands clear of the place it puts the shell back where
   * it lay. The shell's place is never changed: put away with the hat on, the shell is found lying there.
   */
  private wearHat(): void {
    const crab = this.folk.crab
    crab.hatted = this.hat >= 0
    // One shell at a time. A shell that lies within `reach` of its legs, other than the one it wears:
    const inReach = (reach: number): number => this.things.shells.findIndex((shell, at) => at !== this.hat && (shell.state === 'lying' || shell.state === 'pressed') && !this.poses.shells[at].fly && !(this.held?.kind === 'shell' && this.held.index === at) && apart(crabRounds(crab), [{ x: shell.x, z: shell.z, r: SHELL_RADIUS }]) < reach)
    const inAir = this.poses.shells.some((pose) => pose.fly !== null)
    if (this.hat >= 0) {
      // Wearing one, with a leg about to come over another: it stops dead, puts the first down clear of itself,
      // and only then lifts the second. One that it only passes close by is left lying.
      const next = crab.out && this.plan.crab.kind !== 'home' ? inReach(HAT_STEP) : -1
      // And while the shell is on its way up onto its head it stands still under it: the shell comes straight down
      // onto its eyes, and not past an arm of the starfish on its back as it runs on.
      crab.waits = next >= 0 || this.hatFly !== null
      if (this.hatFly) return
      // Too tall under an arm of the starfish with the shell on: it puts the shell down beside it and goes on.
      if (crab.sheds) {
        crab.sheds = false
        if (this.headClear()) {
          this.setHatDown(true)
          return
        }
      }
      if (next >= 0) {
        if (this.headClear()) this.setHatDown(true)
        return
      }
      if (crab.stops === this.hatStops || !this.headClear()) return
      const to = this.things.shells[this.hat]
      if (apart(crabRounds(crab), [{ x: to.x, z: to.z, r: SHELL_RADIUS }]) < HAT_REACH + HAT_CLEAR) return
      this.setHatDown()
      return
    }
    const plan = this.plan.crab
    const out = crab.out && plan.kind !== 'home'
    // While the one it put back is still in the air it lifts no other, and stands still if one lies at its feet.
    crab.waits = out && inAir && inReach(HAT_REACH) >= 0
    if (!out || inAir) return
    const index = inReach(HAT_REACH)
    if (index < 0) return
    // With an arm of the starfish on its back over its head it waits where it stands until the arm is away.
    if (!this.headClear()) {
      crab.waits = true
      return
    }
    const was = this.shellPose(index)
    this.hat = index
    crab.hatted = true
    this.hatStops = crab.stops
    // Up off the sand where it lay, across over the crab's claws, and down onto its eye stalks.
    this.hatFly = { fx: was.x, fy: was.y, fz: was.z, time: 0, span: HAT_SECONDS, high: this.hatHigh(), flat: true, tip: was.tip }
    this.say('tock', 'shell')
  }

  /**
   * Whether the way straight down onto the crab's eyes, and up off them, is clear: no arm of the starfish on its
   * back, curled or reaching, is over its head.
   */
  private headClear(): boolean {
    const crab = this.folk.crab, star = this.folk.starfish
    if (!star.riding || Math.hypot(star.x - crab.x, star.z - crab.z) > 2.6) return true
    const head = this.headOf()
    return star.skin().every(([x, y, z]) => y < head.y - 0.15 || Math.hypot(x - head.x, z - head.z) > HAT_COLUMN)
  }

  /**
   * How high over the crab's head its hat goes on its way on and off: half a step, and with the starfish on its
   * back or coming onto it, over the top of the starfish's arms.
   */
  private hatHigh(): number {
    const crab = this.folk.crab, star = this.folk.starfish
    if (Math.hypot(star.x - crab.x, star.z - crab.z) > 2.6) return 0.5
    return Math.max(0.5, star.y + highest(starParts(star)) + TOPS.shell + 0.1 - this.headOf().y)
  }

  /** The crab sets its hat down: up off its eye stalks, across over its claws, and down onto the sand where it will lie. */
  private setHatDown(now = false): void {
    const index = this.hat
    if (index < 0) return
    const shell = this.things.shells[index], was = this.shellPose(index)
    // Made to set it down while it stands over the place, or `now`, with another shell at its feet and the place
    // too near: the shell goes down beside it instead, out of reach of its legs.
    if (apart(crabRounds(this.folk.crab), [{ x: shell.x, z: shell.z, r: SHELL_RADIUS }]) < (now ? HAT_REACH + HAT_CLEAR : 0.1)) {
      // Beside is on dry, flat sand, never in a groove or on a tower. Where it comes to lie the crab lifts it and
      // puts it back lap after lap, and it lies where it was put.
      const flat = (x: number, z: number): boolean => {
        for (const [dx, dz] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]] as const) if (Math.abs(deltaAt(this.field, x + dx, z + dz)) > 0.05 || this.standing(x + dx, z + dz)) return false
        return true
      }
      const others = [...TAKEN, ...this.standingFolk(), ...patchesOf(this.things, { kind: 'shell', index })], own = (x: number, z: number): Patch[] => [{ x, z, r: SHELL_RADIUS }]
      const gap = now ? HAT_REACH + HAT_CLEAR : 0.12
      let at = settle(shell.x, shell.z, own, others, gap, flat)
      // Nowhere like that on the whole beach: beside it all the same, clear of everything.
      if (!isClear(own(at.x, at.z), others, gap) || !flat(at.x, at.z)) at = settle(shell.x, shell.z, own, others, gap)
      shell.x = at.x
      shell.z = at.z
      this.dirty = true
    }
    this.hat = -1
    this.hatFly = null
    this.folk.crab.hatted = false
    // Back where it lay is a short way; set down beside the crab as the tide goes out it may be further, and takes longer.
    const span = Math.max(HAT_SECONDS, Math.hypot(shell.x - was.x, shell.z - was.z) / 3)
    this.poses.shells[index].fly = { fx: was.x, fy: was.y, fz: was.z, time: 0, span, high: this.hatHigh(), flat: true, tip: was.tip }
    this.say('tock', 'shell', undefined, span)
    // It is down: the water may find it there.
    this.shellWet[index] = this.standing(shell.x, shell.z)
  }

  // --- The water and the two scenes ------------------------------------------------

  /** A piece of wood on its way along the groove the water runs in. Its place is saved as where the water will leave it. */
  private readonly drifts: ({ path: { x: number; z: number }[]; time: number; span: number; knocks: number } | null)[] = [null, null]

  /** Eases what shows of the evening water toward where it stands now. */
  private showWater(dt: number): void {
    const water = this.water, wet = this.wet
    const draining = this.sun.home === 'down' && this.sun.t < 1
    const rate = Math.min(1, dt * 7)
    let changed = false
    for (let cell = 0; cell < wet.length; cell++) {
      const was = wet[cell]
      let to = 0
      if (water && water.arrival[cell] !== Infinity && this.cellZ(cell) > this.wave.cleared) to = water.arrival[cell] <= this.flow || (!draining && was > 0.5) ? 1 : 0
      if (was === to) continue
      const next = was + (to - was) * rate
      wet[cell] = Math.abs(next - to) < 0.02 ? to : next
      changed = true
    }
    if (changed) this.wetVersion += 1
    if (!water || this.flow === Infinity) return
    // Each groove as the water enters it: a gurgle that climbs, or a low whoosh where it already held water.
    for (const one of water.grooves) {
      if (one.arrives > this.flow || this.flowed.has(one.rank) || draining) continue
      this.flowed.add(one.rank)
      this.say(one.dayWet ? 'whoosh' : 'climb', 'sea')
      if (one.path.length === 0) continue
      // Into a pool that held water by day, a small wave runs back along it from the sea's end for as long as
      // the whoosh sounds; into a dry groove, one ring where the water enters.
      if (one.dayWet && one.path.length > 1) this.runs.push({ path: fromSea(one.path), time: 0, laid: -1, flecks: this.flecks() })
      else this.ripple({ x: one.path[0].x, z: one.path[0].z, age: 0 })
    }
  }

  /** The small waves that are running back along a pool, each with the flecks of foam it lays. */
  private readonly runs: { path: readonly { x: number; z: number }[]; time: number; laid: number; flecks: Fleck[] }[] = []

  /**
   * The flecks of foam one small wave lays as it runs: the first at the sea end as it sets off, the rest at
   * unequal steps up the pool, each its own length, off the middle to one side, and turned its own way. They
   * are not a row of bars: no two are alike, none lies square across the pool, and no two lie alike.
   */
  private flecks(): Fleck[] {
    const flecks: Fleck[] = []
    let side = this.rng.next() < 0.5 ? -1 : 1
    for (let i = 0; i < RUN_FLECKS; i++) {
      // Unequal steps by their making, and a little chance on top: short, long, short, long.
      const share = i === 0 ? 0 : (i + (i % 2 === 0 ? 0.3 : -0.3) + (this.rng.next() - 0.5) * 0.15) / RUN_FLECKS
      // Well off square, to one side or the other, and never by the same amount twice running.
      const lean = side * (RUN_LEAN + this.rng.next() * 0.45)
      flecks.push({ share, lean, long: 1.1 + ((i * 3) % 4) * 0.5 + this.rng.next() * 0.4, aside: side * (0.05 + this.rng.next() * 0.12) })
      if (this.rng.next() < 0.7) side = -side
    }
    return flecks
  }

  /** Each small wave moves on: a fleck of foam on the pool, laid a little further along it each time. */
  private runBack(dt: number): void {
    for (let i = this.runs.length - 1; i >= 0; i--) {
      const run = this.runs[i]
      run.time += dt
      const p = Math.min(1, run.time / RUN_BACK_SECONDS), last = run.path.length - 1
      while (run.laid + 1 < run.flecks.length && run.flecks[run.laid + 1].share <= p) {
        run.laid += 1
        const fleck = run.flecks[run.laid]
        // Where along the pool it lies, between the points of the pool's middle line.
        const far = Math.min(last, fleck.share * (RUN_FLECKS / (RUN_FLECKS - 0.5)) * last), at = Math.min(last - 1, Math.floor(far)), part = far - at
        const from = run.path[Math.max(0, at - 2)], to = run.path[Math.min(last, at + 3)]
        const x = run.path[at].x + (run.path[at + 1].x - run.path[at].x) * part, z = run.path[at].z + (run.path[at + 1].z - run.path[at].z) * part
        const along = Math.atan2(to.z - from.z, to.x - from.x), across = along + Math.PI / 2
        // Gone soon after the wave has passed.
        this.ripple({ x: x + Math.cos(across) * fleck.aside, z: z + Math.sin(across) * fleck.aside, age: RING_SECONDS * 0.55, turn: across + fleck.lean, long: fleck.long })
        break
      }
      if (p >= 1) this.runs.splice(i, 1)
    }
  }

  private cellZ(cell: number): number {
    return Z0 + (Math.floor(cell / COLS) + 0.5) * CELL
  }

  /** The evening water stands filled at once, with no running in: on load, and when a touch ends the scene. */
  private fillAtOnce(): void {
    const water = this.water
    for (let cell = 0; cell < this.wet.length; cell++) this.wet[cell] = water && water.arrival[cell] !== Infinity ? 1 : 0
    this.wetVersion += 1
    this.flow = Infinity
    if (water) for (const one of water.grooves) this.flowed.add(one.rank)
    this.things.shells.forEach((shell, index) => (this.shellWet[index] = shell.state !== 'bucket' && shell.state !== 'tower' && this.standing(shell.x, shell.z)))
    // Wood the water now stands under is afloat without a sound, as it is on load.
    this.things.wood.forEach((piece, index) => {
      if (this.standing(piece.x, piece.z)) this.afloat[index] = true
    })
  }

  /**
   * At evening: where the water stands for the sand as it is now, and what
   * the beach holds for each of the folk. `running` lets new water run in
   * from where it enters; without it the water is only read.
   */
  private replan(running = false): void {
    this.work.floods += 1
    this.water = flood(this.field, EVENING_SEA, this.dug, SEA)
    this.plan = planFor(this.field, this.water, this.things)
    this.folk.setPlan(this.plan)
    if (!running) return
    let first = Infinity
    for (let cell = 0; cell < this.wet.length; cell++) if (this.water.arrival[cell] !== Infinity && this.wet[cell] < 0.5 && this.water.arrival[cell] < first) first = this.water.arrival[cell]
    for (const one of this.water.grooves) {
      // A groove that already shows water makes no new sound.
      const shows = one.cells.some((cell) => this.wet[cell] > 0.5)
      if (shows) this.flowed.add(one.rank)
      else this.flowed.delete(one.rank)
    }
    this.flow = first
    // Wood the new water reaches floats off along it.
    this.things.wood.forEach((_, index) => {
      const going = this.driftOf(index, this.field)
      if (going) this.startDrift(index, going)
    })
  }

  /** Where the water carries a piece of wood: the way along its groove and where it leaves it, or null where it does not float off. */
  private driftOf(index: number, field: Field): { path: { x: number; z: number }[]; final: { x: number; z: number; turn: number } } | null {
    const piece = this.things.wood[index], water = this.water
    if (!water || water.arrival[cellOf(piece.x, piece.z)] === Infinity || deltaAt(field, piece.x, piece.z) >= GROOVE || this.bridges(piece)) return null
    const way = drift(water, field, piece)
    if (way.length < 2) return null
    // It stops short of whatever lies in the groove ahead of it.
    const others = [...TAKEN, ...patchesOf(this.things, { kind: 'wood', index })]
    const path = [{ x: piece.x, z: piece.z }]
    for (const point of way) {
      if (!woodPatches({ ...piece, x: point.x, z: point.z }).every((mine) => others.every((other) => Math.hypot(mine.x - other.x, mine.z - other.z) >= mine.r + other.r + 0.05))) break
      if (Math.abs(point.x) > reach(point.z) || point.z < BEACH.z0 || point.z > BEACH.z1) break
      path.push(point)
    }
    if (path.length < 2) return null
    const end = path[path.length - 1]
    return { path, final: { x: Math.round(end.x * 100) / 100, z: Math.round(end.z * 100) / 100, turn: piece.turn } }
  }

  private startDrift(index: number, going: { path: { x: number; z: number }[] }): void {
    let length = 0
    for (let i = 1; i < going.path.length; i++) length += Math.hypot(going.path[i].x - going.path[i - 1].x, going.path[i].z - going.path[i - 1].z)
    this.drifts[index] = { path: going.path, time: 0, span: clamp(length / 1.6, 0.8, FOLK_COME.drift.lasts), knocks: 0 }
    this.poses.wood[index].rockSpeed = 1.4
    // It creaks as it lifts, once: where the water had already lifted it before it sets off, it has creaked.
    if (!this.afloat[index]) this.say('woodCreak', 'wood')
    this.afloat[index] = true
  }

  /** Which pieces of wood the water has lifted: each creaks as it lifts, once. */
  private readonly afloat: boolean[] = []

  /** Every piece that is drifting lies at once where the water was taking it. */
  private landDrifts(): void {
    this.drifts.forEach((going, index) => {
      if (!going) return
      const end = going.path[going.path.length - 1]
      this.things.wood[index].x = end.x
      this.things.wood[index].z = end.z
      this.drifts[index] = null
    })
  }

  /**
   * A scene is starting under a finger that is still at work: the stroke ends here and the thing in hand is set
   * down where it is, so the save made at the scene's start holds what is seen. The finger must land again.
   */
  private handsOff(): void {
    // Set down without an answer: the scene that is starting is the answer, and brings the water and the folk in its own time.
    this.handing = true
    if (this.held && this.held.kind !== 'sun') this.release()
    this.handing = false
    this.held = null
    this.stroke = null
    this.finger = null
  }

  /** When the sun last reached the bottom, on the game's clock. */
  private sunDown = 0

  /** The folk come: the sun has reached the bottom. The outcome is saved before the first beat. */
  private folkCome(): void {
    const field = this.field
    this.sunDown = this.time
    this.endScene()
    this.handsOff()
    const before = Float32Array.from(field.d)
    // What the evening water covers sinks to its mound: saved so at once, and shown as the water comes.
    const sunk = sink(field, EVENING_SEA)
    const after = Float32Array.from(field.d)
    const sinks = after.some((value, cell) => value !== before[cell])
    const sand = encode(field)
    this.work.sinks += 1
    this.work.floods += 1
    this.water = flood(field, EVENING_SEA, this.dug, SEA)
    const water = this.water
    const going = this.things.wood.map((_, index) => this.driftOf(index, field))
    const wood = this.things.wood.map((piece, index) => going[index]?.final ?? { ...piece })
    this.plan = planFor(field, water, { ...this.things, wood })
    const plan = this.plan
    field.d.set(before)
    field.version += 1
    this.outcome = { ...this.toState(), sun: 'down', finished: true, sand, wood }
    this.dirty = true
    this.urgent = true
    this.flow = 0
    this.flowed.clear()
    const from = this.tide, dusk = this.dusk
    const flowFor = clamp(water.last + 0.6, FOLK_COME.flow.least, FOLK_COME.flow.most)
    let fizzed = false, sank = false, drifted = false
    const beats: Beat[] = [
      { ...FOLK_COME.rise, play: (p, finishing) => {
        // The light turns deep orange and violet, and the last of the sea comes up the beach.
        this.tide = from + (EVENING_SEA - from) * smooth(p)
        this.dusk = dusk + (1 - dusk) * smooth(p)
        if (!fizzed && !finishing) this.say('fizz', 'sea')
        fizzed = true
      } },
      { at: FOLK_COME.flow.at, lasts: flowFor, play: (p, finishing) => {
        // Water runs along each groove in the order it was dug.
        if (finishing) this.fillAtOnce()
        else this.flow = p >= 1 ? Infinity : p * (water.last + 0.3)
      } },
      { ...FOLK_COME.sink, play: (p, finishing) => {
        // Whatever sank is shown sinking, whether or not it is among the places that ripple.
        if (!sinks) return
        const t = smooth(p)
        for (let cell = 0; cell < after.length; cell++) if (after[cell] !== before[cell]) field.d[cell] = before[cell] + (after[cell] - before[cell]) * t
        field.version += 1
        if (!sank && !finishing) {
          // Grains slide in with small plops, and what is below the water sinks with a long hush.
          const voice: Note[] = []
          this.say('plops', 'sea', voice)
          this.say('hush', 'sea', voice, 0.1)
          this.sound(voice)
          // The grains are seen to go: from each place that sinks a few slide off and drop into the water, and
          // each makes its ring where it lands.
          for (const at of sunk) {
            this.ripple({ x: at.x, z: at.z, age: 0 })
            for (let i = 0; i < 4; i++) {
              const turn = this.rng.next() * Math.PI * 2
              this.fling(at.x, base(at.z) + before[cellAt(at.x, at.z)] + 0.05, at.z, Math.cos(turn) * 0.7, 0.5 + this.rng.next() * 0.5, Math.sin(turn) * 0.7, false)
            }
          }
        }
        sank = true
      } },
      { ...FOLK_COME.drift, play: (_, finishing) => {
        // Driftwood in the water's way lifts and drifts to the end of its groove.
        if (!drifted && !finishing) going.forEach((one, index) => { if (one) this.startDrift(index, one) })
        if (!drifted && finishing) going.forEach((one, index) => {
          if (!one) return
          this.things.wood[index].x = one.final.x
          this.things.wood[index].z = one.final.z
        })
        drifted = true
        if (finishing) this.landDrifts()
      } },
      // Then the folk come one by one, the crab first, each to what the beach holds for it.
      { at: FOLK_COME.crab, lasts: 0, play: () => this.folk.crab.setPlan(plan.crab) },
      { at: FOLK_COME.star, lasts: 0, play: () => this.folk.starfish.setPlan(plan.star) },
      { at: FOLK_COME.eel, lasts: 0, play: () => this.folk.eel.setPlan(plan.eel) },
      { at: FOLK_COME.gulls, lasts: 0, play: () => this.folk.gulls.setPlan(plan.gulls) },
      { at: FOLK_COME.small, lasts: 0, play: () => this.folk.small.setBored(plan.bored) },
      { at: FOLK_COME.end, lasts: 0, play: (_, finishing) => {
        // A touch ended it: the water stands filled, the wood lies where it was going, and each of the folk is at its place.
        if (finishing) this.folk.settle(this.world)
      } },
    ]
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => {})
  }

  /** The tide goes out: the sun has arrived at the top, after a journey the child saw and could turn round. */
  private tideOut(): void {
    const field = this.field
    this.endScene()
    this.handsOff()
    // The crab sets its hat down as it leaves: the shell goes from its head to where it will lie. A touch that
    // ends the scene lands the shell at once, and the tock of its landing is taken back with it (`endScene`).
    this.setHatDown()
    // Wood that is drifting goes on to the end of its way; it is saved there already.
    const state = this.toState()
    this.outcome = { ...state, sun: 'up', finished: false, sand: '', dug: [], shells: state.shells.map((shell) => (shell.state === 'bucket' ? shell : { ...shell, state: 'lying' as const })) }
    this.dirty = true
    this.urgent = true
    this.plan = DAY_PLAN
    this.folk.setPlan(DAY_PLAN)
    const toZ = Math.max(TIDE_OUT.toZ, this.beachEnd), span = toZ - TIDE_OUT.fromZ
    let hushed = false
    // A shell in a tower's side or pressed into the sand is washed loose as the wave reaches it: it tips over
    // and comes down to lie flat as the sand under it slumps, and is never flat from one frame to the next.
    const lie = (front: number, finishing: boolean) => this.things.shells.forEach((shell, index) => {
      if (shell.state === 'bucket' || shell.state === 'lying' || shell.z >= front) return
      const pose = this.poses.shells[index], now = this.shellPose(index)
      shell.state = 'lying'
      if (finishing || pose.fly) return
      pose.fly = { fx: now.x, fy: now.y - (shell.up ? 0 : 0.16 * SHELL_SIZES[index]), fz: now.z, time: 0, span: WASH_SECONDS, high: 0, tip: now.tip, topple: true }
    })
    const beats: Beat[] = [
      { ...TIDE_OUT.gold, play: (p) => { this.gold = Math.max(this.gold, smooth(p)) } },
      { ...TIDE_OUT.wave, play: (p, finishing) => {
        // One long low wave runs up over the whole beach: each tower and rim slumps as it passes over.
        const front = TIDE_OUT.fromZ + span * smooth(p)
        this.wave.front = front
        this.wave.top = front
        this.wave.show = 1
        this.wave.cleared = front - 0.5
        if (!hushed && !finishing) this.say('wave', 'sea')
        hushed = true
        this.work.smooths += 1
        if (p < 1) {
          smoothUpTo(field, front)
          lie(front, finishing)
          return
        }
        smoothAll(field)
        lie(Infinity, finishing)
        this.dug = []
        this.water = null
        this.flow = Infinity
        this.flowed.clear()
      } },
      { ...TIDE_OUT.back, play: (p, finishing) => {
        // It slides back to its day line, and the sand is smooth and wet behind it.
        this.wave.front = toZ + (-3.2 - toZ) * smooth(p)
        this.wave.show = p >= 1 ? 0 : 1 - p * p * 0.6
        this.tide = FAR_SEA + (SEA - FAR_SEA) * smooth(p)
        this.gold = 1 - smooth(p)
        this.dusk = 0
        if (p < 1) return
        this.wave.cleared = -Infinity
        this.wave.front = TIDE_OUT.fromZ
        this.wave.top = TIDE_OUT.fromZ
        this.wet.fill(0)
        this.wetVersion += 1
        if (finishing) {
          this.landDrifts()
          this.folk.settle(this.world)
        }
      } },
    ]
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => {})
  }

  // --- Small helpers ---------------------------------------------------------------

  /** Whether water stands at this point of the sand now. */
  private reachesSea(x: number, z: number): boolean {
    return this.standing(x, z)
  }

  /** A ring spreads on the water. There are never more than the most: the oldest gives way to a new one. */
  private ripple(ring: Ring): void {
    if (this.rings.length >= MOST_RINGS) this.rings.shift()
    this.rings.push(ring)
  }

  private began(x: number, z: number): void {
    this.dug.push(cellAt(x, z))
    if (this.dug.length > MOST_GROOVES) this.dug.splice(0, this.dug.length - MOST_GROOVES)
  }

  private splash(x: number, z: number): void {
    this.say('plip', 'sea')
    // A ring wide enough to see from across the beach, and drops that jump.
    this.ripple({ x, z, age: 0, big: true })
    for (let i = 0; i < 14; i++) {
      const turn = this.rng.next() * Math.PI * 2, out = 0.8 + this.rng.next() * 1.6
      this.fling(x, this.sea + 0.05, z, Math.cos(turn) * out, 3.8 + this.rng.next() * 2.4, Math.sin(turn) * out, true)
    }
  }

  /** Digging near the gulls sends grains their way: they duck, one after another. */
  private startle(x: number, z: number): void {
    const gull = this.folk.gulls.birds[1]
    if (this.sinceDuck < 2.5 || Math.hypot(x - gull.x, z - gull.z) > 4.5 || Math.hypot(x - (LOG.x0 + LOG.x1) / 2, z - LOG.z) > 9) return
    this.sinceDuck = 0
    this.folk.gulls.duckAll()
  }

  private fling(x: number, y: number, z: number, vx: number, vy: number, vz: number, wet: boolean): void {
    if (this.grains.length >= MOST_GRAINS) this.grains.shift()
    this.grains.push({ x, y, z, vx, vy, vz, wet })
  }

  /** A mote of sand stirred up in water: it drifts out on the water for a while, rising a little, and is gone. */
  private silt(x: number, y: number, z: number, vx: number, vz: number, seconds: number): void {
    if (this.grains.length >= MOST_GRAINS) this.grains.shift()
    this.grains.push({ x, y, z, vx, vy: 0.08, vz, wet: false, bubble: seconds })
  }

  /** How high the water stands at a place: the sea, or the pool up the beach that the place is in. */
  private waterTop(x: number, z: number): number {
    return inField(x, z) && this.wet[cellOf(x, z)] > 0.5 ? Math.max(this.sea, base(z) - 0.07) : this.sea
  }

  /** A bubble that rises for a while and is gone. There are never more grains and bubbles than the most. */
  private bubble(x: number, y: number, z: number, vy: number, seconds: number): void {
    if (this.grains.length >= MOST_GRAINS) this.grains.shift()
    this.grains.push({ x, y, z, vx: 0, vy, vz: 0, wet: true, bubble: seconds })
  }

  private nextThud(): number {
    // Never the same thud twice running.
    let pick = Math.floor(this.rng.next() * 4)
    if (pick === this.lastThud) pick = (pick + 1) % 4
    this.lastThud = pick
    return pick
  }
}
