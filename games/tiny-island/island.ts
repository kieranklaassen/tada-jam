import { LOG_ROLL, POKE_S, PUFF_S, tappedSheep, catPose, clear, gullPose, handPoseOf, handStretch, restPose, ridePose, spunPose, toyPose, whalePose, type CatDoing, type CatPose, type Grazing, type GullDoing, type GullPose, type Pose } from './motion'
import type { Lens } from './camera'
import { pick, type Sky, type Standing, type Target } from './pick'
import { CAT_TALL, GULL_HALF, RIM_SEAT, SEATS, CAT_FOOT, catSeat, gullSpot, munchSpot, seatFree, settle, type Spot } from './place'
import { makeRng, type Rng } from './rng'
import { OVER, around, cruise, fly, held, overBuoy, riding, swung, type Obstacle } from './route'
import { deserialize, inTray, serialize, type Saved } from './save'
import { Scene, type Beat } from './scene'
import { BOAT_LANE_R, FOOT, GAP, GULL_TALL, KINDS, LAND_R, LAND_Y, PEGS, RIM_IN, RIM_OUT, RIM_TOP, SEA_LANE_R, SIZE, TALL, TRAY_SCALE, TRAY_TOP, TRAY_Z, WEIGHT, lidAt, overTray, roofAt, slotOf, toIsland, toWorld, type Kind, type Toy } from './toys'
import { tapOf, type Sound } from './voices'
import { BARE_BACK, BARE_S, CREST_Y, LIFT_EVERY, LIFT_S, REAR_S, ROLL_Z, SET, SET_S, SINK_S, backAt, crestRow, crestSlot, gateFor, washS, wavePose, type Washing, type WavePose } from './wash'

// The toy itself, with no browser in it: five toys, a tray, an island that
// turns, and the residents who watch. A touch comes in as a target (pick.ts)
// and is answered at once; `step` plays game time; `show` says where
// everything is for the view. What a save holds is `state`, and it is changed
// the moment the child's act is certain: a toy in the air is already saved
// where it will land, and a toy in the hand is still saved where it was.
// The one short scene, the wash, runs on scene.ts: its outcome is saved when
// it starts, and any touch ends it.

type Spring = { x: number; v: number }
const pull = (spring: Spring, to: number, stiff: number, damp: number, dt: number): void => {
  spring.v += ((to - spring.x) * stiff - spring.v * damp) * dt
  spring.x += spring.v * dt
}
const WHOLE = Math.PI * 2
const wrap = (a: number): number => ((((a + Math.PI) % WHOLE) + WHOLE) % WHOLE) - Math.PI
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const smooth = (t: number): number => t * t * (3 - 2 * t)
const bump = (t: number, a: number, b: number): number => Math.sin(clamp01((t - a) / (b - a)) * Math.PI)

/** Where a toy is shown. It trails the save by the length of a flight, and by the whole wash while the wave carries it. */
type Place = { where: 'tray' } | { where: 'crest' } | { where: 'land' | 'sea' | 'boat'; x: number; z: number }

type Flight = {
  /** Seconds before it leaves. */
  wait: number
  t: number
  dur: number
  arc: number
  /** The height it crosses at, over whatever stands in its way; null for a plain arc through clear air. */
  high: number | null
  from: { x: number; y: number; z: number; scale: number }
  to: Place
  /** It was aimed at something and lands beside it. */
  bumped: boolean
  /** It is the sheep's own bound to the tree, or a toy going quietly back: no knock that shakes the island. */
  soft: boolean
  /** The wave is standing it in its slot: it lands with its own knock. */
  washed: boolean
}

type Act = {
  at: Place
  /** Seconds since it came to stand there, since it was tapped, since it left its slot, and since it was spun in the hand. */
  age: number
  poked: number
  held: number
  whipped: number
  hop: Spring
  flight: Flight | null
  /** The lighthouse: where its beam points, in the world. */
  beam: number
  /** The boat: how far round its ring it has sailed since it was set down, in radians. */
  lap: number
  /** The boat on land: how far it has swung against the island's turn, like a needle. */
  needle: number
  /** The boat: seconds since a toy was set down on it and it ducked under, and since the cat patted it. */
  ducked: number
  nudged: number
  /** The tree: how much of its crown is left, 1 to 0.5, and the crown as it is shown, which springs after it. */
  crown: number
  leaf: Spring
  /** The tree: how far its crown hangs behind the trunk of a spun island. */
  lag: Spring
  /** A clock for the toy's own habit: the chew, the puff, the slap; and a second one for its quieter habit. */
  beat: number
  beat2: number
  /** How many times the habit has sounded since it came to stand. */
  count: number
  /** Seconds it has ridden the wave's crest. */
  rode: number
  /** The house: seconds since a ball of smoke last left its chimney, which lifts its roof. */
  puffed: number
}

/** The house's chimney top as it is modelled, from where the house stands; the house is shown `SIZE.house` times as big. */
export const CHIMNEY = { x: 0.34, y: 1.72, z: -0.12 }
/** How far above the chimney the gull's feet ride: clear of the roof from where the child looks. */
const RIDE = 0.12
/** How long the cat glares at the toy that took its seat, once it has come down. */
const GLARE_S = 0.8
/** How high over the water the middle of the tree afloat lies. */
const LOG_Y = 0.25
/** The sound of each toy's ride on the wave. */
const RIDE_SOUND = { lighthouse: 'glug', boat: 'swoosh', sheep: 'baaGlub', tree: 'topWhirr', house: 'gloop' } as const
/** How high over the water the top of the gull's buoy is, where it stands. */
const BUOY_TOP = 1.75
/** How high the boat's deck is above its keel, where the sheep stands. */
const DECK = 0.42 * SIZE.boat
/** Where the sheep aboard stands, from the boat's middle toward its bow (so both are behind): across the boat, and turned to look ahead. */
const ABOARD = { across: -0.22, ahead: -0.38 }
/** How long a tapped toy takes to fly to where it was sent, and a let-go toy to fall. */
export const FLIGHT_S = 0.34
const FALL_S = 0.16
/** How much longer a toy takes to fly to a place where the cat sits. */
const ON_CAT_S = 0.2
/** A flight that has to go up and over something takes this much longer. */
const OVER_S = 0.14
/** The sheep's bound to the tree, and the cat's leap to a new seat. */
const BOUND_S = 0.46
const LEAP_S = 0.5
/** How high a leap of the cat goes at its middle, and how high one that passes close by the house under the gull's wings. */
const LEAP_ARC = 1.9
const LEAP_LOW = 0.4
/** How far off a carried toy is, beyond where it would touch the cat's seat, when the cat begins to shrink from it. */
const WARY_FROM = 2.2
/** How much wider than its ground the house is to the cat while the gull rides its smoke with its wings out, and how far the paddling gull reaches. */
const GULL_WINGS = 0.5
const GULL_REACH = 0.85
/** The ground the gull needs in flight, wings out, and how many steps its way is planned in. */
const GULL_FLIGHT_R = 0.9
const FLIGHT_STEPS = 32
/** How far over the lid a planned flight may be before another way is looked for: the lid is well inside the frame. */
const LID_GIVE = 0.08
/** How far above its head a wing comes on the upstroke, with the bank of a turn. */
const WING_UP = 0.1
/** The gull's flight between its places, its dive, and its ride on the swell. */
const GULL_S = 0.9
const DIVE_S = 1.5
const SURF_S = 1.6
/** What each toy says as it comes out of its slot into the hand, after the "tok": its own voice, softly. */
const HELLO: Record<Kind, Sound['name']> = { lighthouse: 'ding', boat: 'bell', sheep: 'baa', tree: 'rustle', house: 'door' }
/** How high a toy hangs in the hand above its slot, and above the ground under the finger that carries it. */
const HAND_Y = 1.7
const CARRY_Y = 1.25
/** What a carried toy needs above its own height: it rocks in the hand, and its crown swells or its roof lifts as it says who it is. */
const CARRY_ROOM = 0.3
/** A toy from the tray let go nearer the tray than this goes back: half-way between its slot and the rim. */
const HALF_WAY_Z = (TRAY_Z + RIM_OUT) / 2
/** The island slows to a third each half second once let go, and a tap on the rim sends it about one peg on. */
const SPIN_DRAG = 2.2
const NOTCH = (WHOLE / PEGS) * SPIN_DRAG
/** The peg the island's turn is nearest: a turn ticks as it passes half way between two pegs, never on the peg where a tap comes to rest. */
const pegAt = (turn: number): number => Math.floor(turn / (WHOLE / PEGS) + 0.5) % PEGS
const MAX_SPIN = 9
/** The island counts as spun above this speed, in radians a second, and as stopped again below the second. */
const SPUN_FROM = 1.1
const SPUN_TO = 0.3
/** A toy's habit is heard for this long after a touch, more softly for this long again, and then the island goes quiet. */
const LOUD_S = 6
const SOFT_S = 14
/** When the cat pats the bare ground beside it, in seconds without a touch: three times, and then it lets be. */
const PATS = [2.5, 10.5, 18.5]
/** How far from the tower the lamp's light falls on the ground: on the land, and from the shallows. */
const LIGHT_REACH = { land: 2.7, sea: 3.5 }
const LIGHT_R = 0.55
/** How near the light has to pass for the cat to pounce, and how near a splash for it to flinch. */
const POUNCE_R = 1.3
const SPRAY_R = 3.5
/** The cat on the rim sits on its outer edge, clear of the boat's ring. */
const RIM_SEAT_R = RIM_OUT + 0.25
/** How high a peg of the rim lifts the cat that sits where it passes: the peg's height and a hair. */
const PEG_UP = 0.32
/** The seat is a little to the left of the middle of the back, clear of the home control at the top of the glass. */
const RIM_SEAT_X = -2.4

export type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number; grow: number; age: number; life: number; tint: 'smoke' | 'water' | 'leaf' | 'bubble' | 'dust' | 'drift' }
export type Ring = { x: number; y: number; z: number; age: number; life: number; size: number; tint: 'water' | 'dust' }

export type ToyShown = {
  kind: Kind
  /** `island`: it stands on the turntable and turns and rocks with it, and its place is the turntable's own. `world`: the tray, the hand, the air, the wave. */
  on: 'island' | 'world'
  x: number
  y: number
  z: number
  yaw: number
  scale: number
  pose: Pose
  /** How much of the tree's crown is left. */
  crown: number
  /** How dark its shadow is on the ground under it, 0 to 1. */
  shadow: number
}

export type Frame = {
  turn: number
  /** The island rocking on its turntable under a knock. */
  dip: number
  tiltX: number
  tiltZ: number
  toys: ToyShown[]
  /** Where the toy in the finger would come down, in the world. */
  spot: { x: number; y: number; z: number; r: number; home: boolean } | null
  /** The lamp's light on the ground, on the turntable in its own units, and how bright; null when no lamp is lit or it falls outside. */
  light: { x: number; y: number; z: number; r: number; level: number } | null
  /** How far the beam is smeared by a spinning island, 0 to 1. */
  smear: number
  /** The grass the sheep has mown, on the turntable in its own units; `level` 1 fresh to 0 grown back. */
  mown: { x: number; z: number; r: number; level: number } | null
  /** The house's door and shutters: 0 shut to 1 open. */
  flap: number
  cat: { x: number; y: number; z: number; yaw: number; pose: CatPose; lookX: number; lookY: number; leanX: number }
  gull: { x: number; y: number; z: number; yaw: number; pose: GullPose; lookX: number; lookY: number; head: number }
  /** The buoy: its rocking in radians, and how far the swell has lifted it. */
  buoy: number
  buoyLift: number
  wave: WavePose
  whale: { rise: number; lids: number; tail: number }
  particles: readonly Particle[]
  rings: readonly Ring[]
  /** Seconds since the sky was touched: the clouds bob. Seconds since each cloud and the sun were touched. */
  breeze: number
  clouds: number[]
  sun: number
}

export class Island {
  readonly state: Saved
  /** The save has changed; `urgent` when it must be written at once. The Mount clears both. */
  dirty = false
  urgent = false
  /** What this touch or this step set off. The Mount plays them as one voice and empties the list. */
  readonly sounds: Sound[] = []
  /** The wave was called off or its wash was ended: whatever of it still sounds is to stop now. The Mount does that and clears this. */
  hushed = false
  /** The toy hanging in the hand over the tray, waiting for a tap on the island. */
  hand: Kind | null = null
  /** Seconds of play without a touch. */
  sinceTouch = 0
  /** Seconds since a touch, for how loud the island is. An island that was just opened has not been touched: nothing on it is loud until it is. */
  private unheard = Infinity
  private readonly acts: Record<Kind, Act>
  private readonly rng: Rng
  private readonly seed: number
  private time = 0
  /** A toy carried by a finger: where it is aimed in the world, and whether the finger is off the glass for a moment. */
  private carry: { kind: Kind; x: number; z: number; lifted: boolean } | null = null
  private pressed: { kind: 'slot' | 'toy'; toy: Kind } | { kind: 'turn'; angle: number } | { kind: 'cat' } | null = null
  private grip: { angle: number } | null = null
  private spin = 0
  private turned = 0
  private rumble = 0
  private lastTurn = 0
  private savedTurn = 0
  private peg = 0
  /** Whether the island is being spun fast enough for what stands on it to feel it, how fast (0 to 1), and a clock for the sounds of it. */
  private spinning = false
  private spun = 0
  /** How far the sheep aboard has turned to look ahead, 0 to 1: it does when the boat is afloat. */
  private aboard = 0
  private spinBeat = 0
  private readonly dip: Spring = { x: 0, v: 0 }
  private readonly tiltX: Spring = { x: 0, v: 0 }
  private readonly tiltZ: Spring = { x: 0, v: 0 }
  private readonly spotAt = { x: 0, z: 0 }
  private readonly cat = {
    /** The turn its seat was last worked out for: the island at rest. */
    turn: 0,
    /** How far to one side its leap swings at the middle, on the turntable: round whatever stands in its way. */
    far: 0,
    /** How high the leap it is in goes at its middle. */
    arc: 1.9,
    seat: 0, from: 0, leap: -1, high: null as number | null, hop: { x: 0, v: 0 } as Spring, pats: 0, lookX: 0, lookY: 0, face: 0, leanX: 0, boatPat: 3,
    doing: { leap: -1, reach: 1, hop: 0, poked: Infinity, patted: Infinity, startled: Infinity, landedOn: Infinity, splashed: Infinity, pounced: Infinity, crouched: false, spun: 0, stopped: Infinity, pulled: 0, twanged: Infinity, flooded: false, wary: 0 } as CatDoing,
    /** It was landed on, and glares when it has come down: at the toy that took its seat. */
    cross: false,
    by: null as Kind | null,
    pose: {} as CatPose,
  }
  private readonly gull = {
    /** How far to one side its flight swings at the middle, and how high it is at each step of the way. */
    far: 0, heights: new Array<number>(FLIGHT_STEPS + 1).fill(0), over: 0, turn: 0,
    /** How far the swell had lifted the buoy when the flight was planned. */
    lift: 0,
    from: { x: 0, y: 0, z: 0 }, lookX: 0, lookY: 0, head: 0, wind: 0, dodging: false,
    /** Where it paddles beside the house in the sea, on the turntable, or null. */
    spot: null as { x: number; z: number } | null,
    /** Where something last splashed, in the world: its beak points there. */
    splash: null as { x: number; z: number } | null,
    doing: { flying: -1, place: 'buoy', lifted: Infinity, tickled: Infinity, poked: Infinity, craned: Infinity, dive: -1, surf: -1, dodge: 0, room: Infinity } as GullDoing,
    pose: {} as GullPose,
  }
  private readonly buoy: Spring = { x: 0, v: 0 }
  /** The wave: its rearing, the scene of the wash while it plays, and the wave as it is at this moment. */
  private readonly washing: Washing = { rearing: -1, sinking: -1, sankFrom: 0, at: -1, bare: false, back: 0, gate: -Infinity }
  /** How far along the crest each toy rides, from the wave's middle. */
  private readonly crest: Record<Kind, number> = { lighthouse: 0, boat: 0, sheep: 0, tree: 0, house: 0 }
  private scene: Scene | null = null
  private readonly wave = {} as WavePose
  private readonly whale = { poked: Infinity, next: 7, pose: { rise: 0, lids: 1, tail: 0 } }
  private breeze = Infinity
  private readonly clouds = [Infinity, Infinity, Infinity, Infinity]
  private sun = Infinity
  private readonly mown = { x: 0, z: 0, level: 0, fresh: false }
  private readonly particles: Particle[] = []
  private readonly rings: Ring[] = []
  private readonly frame: Frame
  private readonly point = { x: 0, y: 0, z: 0 }
  private readonly flat = { x: 0, z: 0 }
  /** Where the gull's buoy, the wave and the whale are, which the surface's shape decides. */
  posts = { buoy: { x: -7.75, z: -0.2 }, wave: { x: 8.3, z: -3 }, whale: { x: -7.2, z: 5.5 } }

  /** `posts` is where the surface's shape puts the buoy, the wave and the whale, when the surface is already known: the gull takes its place from them. */
  constructor(saved: Saved, seed = 1, posts?: Island['posts']) {
    this.state = saved
    this.seed = seed
    this.rng = makeRng(seed)
    if (posts) this.posts = posts
    // Found as left: every toy stands where the save has it, mid-habit, and nothing eases in.
    this.acts = Object.fromEntries(KINDS.map((kind, index) => {
      const toy = saved.toys[index]
      const at: Place = toy.where === 'tray' ? { where: 'tray' } : { where: toy.where, x: toy.x, z: toy.z }
      // Old enough that no landing rings, and each at a different point of its habit.
      return [kind, {
        at, age: 6 + index * 1.37, poked: Infinity, held: 0, whipped: Infinity, hop: { x: 0, v: 0 }, flight: null, beam: index, lap: 0, needle: 0, ducked: Infinity, nudged: Infinity,
        crown: 1, leaf: { x: 1, v: 0 }, lag: { x: 0, v: 0 }, beat: 0, beat2: 0, count: 0, rode: 0, puffed: Infinity,
      } satisfies Act]
    })) as Record<Kind, Act>
    this.lastTurn = this.savedTurn = saved.turn
    this.peg = pegAt(saved.turn)
    this.cat.turn = saved.turn
    // Found as left: the sheep aboard a boat afloat already looks ahead.
    this.aboard = saved.toys[KINDS.indexOf('boat')].where === 'sea' ? 1 : 0
    // Found as left: the cat in the seat it had, if it can sit there among these toys; else, and in a record that has no seat, the seat worked out from the toys.
    const kept = saved.cat !== undefined && catSeat(saved.toys, saved.turn, saved.cat) === saved.cat
    this.cat.seat = this.cat.from = kept ? saved.cat! : catSeat(saved.toys, saved.turn)
    // From here on the record always says where the cat sits, so the next save carries it. (Nothing is written for it now.)
    this.state.cat = this.cat.seat
    this.frame = {
      turn: saved.turn, dip: 0, tiltX: 0, tiltZ: 0,
      toys: KINDS.map((kind) => ({ kind, on: 'world', x: 0, y: 0, z: 0, yaw: 0, scale: 1, pose: restPose(), crown: 1, shadow: 0 })),
      spot: null, light: null, smear: 0, mown: null, flap: 0,
      cat: { x: 0, y: 0, z: 0, yaw: 0, pose: this.cat.pose, lookX: 0, lookY: 0, leanX: 0 },
      gull: { x: 0, y: 0, z: 0, yaw: 0, pose: this.gull.pose, lookX: 0, lookY: 0, head: 0 },
      buoy: 0, buoyLift: 0, wave: this.wave, whale: this.whale.pose, particles: this.particles, rings: this.rings, breeze: Infinity, clouds: this.clouds, sun: Infinity,
    }
    // Found as left: the gull is where a gull that had been here all along would be, and no flight plays. From its
    // buoy it asks where its place is, by the same rule as in play: the smoke, beside the house in the sea, or the buoy it keeps to.
    this.gull.spot = this.acts.house.at.where === 'sea' ? gullSpot(saved.toys, saved.turn, this.posts.wave) : null
    this.gull.doing.place = this.gullPlace()
    this.show()
  }

  private toy(kind: Kind): Toy {
    return this.state.toys[KINDS.indexOf(kind)]
  }

  private say(name: Sound['name'], more: Omit<Sound, 'name'> = {}): void {
    this.sounds.push({ name, ...more })
  }

  /** A sound of the wave at work: it goes through a gain of its own, which the end of the wash drops to nothing (hush.ts). */
  private sayWash(name: Sound['name'], more: Omit<Sound, 'name' | 'wash'> = {}): void {
    this.sounds.push({ name, ...more, wash: true })
  }

  /** The wave's sounds stop here: what it had queued is dropped, and what is still sounding is cut by the Mount. */
  private hush(): void {
    for (let i = this.sounds.length - 1; i >= 0; i--) if (this.sounds[i].wash) this.sounds.splice(i, 1)
    this.hushed = true
  }

  /** How loud a habit is just now: full after a touch, softer for a while, and silent on an island nobody is touching. */
  private get loud(): number {
    return this.unheard < LOUD_S ? 1 : this.unheard < SOFT_S ? 0.4 : 0
  }

  /** A habit's sound: always heard in a toy's first seconds where it stands, and after that only as loud as the island is. */
  private habit(kind: Kind, name: Sound['name'], gain = 1, pitch = 1, delay = 0): void {
    const loud = this.acts[kind].age < 4 ? 1 : this.loud
    if (loud > 0) this.say(name, { gain: gain * loud, pitch, delay })
  }

  /** A resident's own sound for something it does unasked: as loud as the island is. */
  private murmur(name: Sound['name'], gain = 1, delay = 0): void {
    if (this.loud > 0) this.say(name, { gain: gain * this.loud, delay })
  }

  // --- Where things are ----------------------------------------------------------

  /** The boat's place on the turntable at this moment: where it was set down, and in the sea as far round its ring as it has sailed. */
  private boatAt(): { x: number; z: number } {
    const boat = this.acts.boat.at
    if (boat.where !== 'sea') return boat.where === 'land' ? { x: boat.x, z: boat.z } : { x: 0, z: 0 }
    const a = Math.atan2(boat.z, boat.x) - this.acts.boat.lap
    return { x: Math.cos(a) * BOAT_LANE_R, z: Math.sin(a) * BOAT_LANE_R }
  }

  /** The toys as they stand now, for finding a place among them. */
  private standingToys(): Toy[] {
    return this.state.toys.map((toy) => (toy.kind === 'boat' && toy.where === 'sea' && this.acts.boat.at.where === 'sea' ? { ...toy, ...this.boatAt() } : toy))
  }

  /** Where a toy is shown standing on the turntable, or null in the tray and on the wave. */
  private placeOf(kind: Kind): { x: number; y: number; z: number } | null {
    const at = this.acts[kind].at
    if (at.where === 'tray' || at.where === 'crest') return null
    if (at.where === 'boat') {
      const boat = this.placeOf('boat')
      return boat ? { x: boat.x, y: boat.y + DECK, z: boat.z } : null
    }
    if (kind === 'boat' && at.where === 'sea') return { ...this.boatAt(), y: 0 }
    return { x: at.x, y: at.where === 'land' ? LAND_Y : 0, z: at.z }
  }

  /** How high a toy rides on the crest: the crest sinks as the wave spends itself at the tray. */
  private crestY(): number {
    return CREST_Y - (0.9 - Math.min(0.9, this.wave.tall)) * 1.5
  }

  /** Where a toy is in the world at this moment, whatever it is doing. */
  private worldOf(kind: Kind): { x: number; y: number; z: number; scale: number } {
    const act = this.acts[kind], slot = slotOf(kind)
    if (this.carry?.kind === kind) {
      // Over the fingertip, risen over what it is carried across, and under the lid of the frame: round what it cannot clear there.
      const at = held(this.carry.x, this.carry.z, FOOT[kind], TALL[kind] + CARRY_ROOM, TALL[kind] * handStretch(act.held), CARRY_Y, this.groundUnder, lidAt, this.obstacles(kind), this.heldAt)
      return { x: at.x, y: at.y, z: at.z, scale: 1 }
    }
    if (act.flight && act.flight.wait <= 0) {
      const flight = act.flight, to = this.landing(kind, flight.to), at = fly(flight.t, flight.from, to, flight.arc, flight.high, this.point), t = flight.t
      return { x: at.x, y: at.y, z: at.z, scale: flight.from.scale + (to.scale - flight.from.scale) * t * t * (3 - 2 * t) }
    }
    if (act.flight) return act.flight.from
    if (this.hand === kind) return { x: slot.x, y: HAND_Y, z: slot.z, scale: TRAY_SCALE * 1.08 }
    if (act.at.where === 'boat') {
      // The sheep aboard is wherever the boat is, in a finger and in the air too.
      const boat = this.worldOf('boat')
      return { x: boat.x, y: boat.y + DECK, z: boat.z, scale: 1 }
    }
    if (act.at.where === 'crest') return { ...crestSlot(this.crest[kind], this.wave, this.flat), y: this.crestY(), scale: 1 }
    const place = this.placeOf(kind)
    if (!place) return { x: slot.x, y: TRAY_TOP, z: slot.z, scale: TRAY_SCALE }
    return { ...toWorld(place.x, place.z, this.state.turn), y: place.y, scale: 1 }
  }

  /** Where a flight comes down, in the world, as the island and the wave stand at this moment. */
  private landing(kind: Kind, to: Place): { x: number; y: number; z: number; scale: number } {
    if (to.where === 'tray') return { ...slotOf(kind), y: TRAY_TOP, scale: TRAY_SCALE }
    if (to.where === 'crest') return { ...crestSlot(this.crest[kind], this.wave, this.flat), y: this.crestY(), scale: 1 }
    if (to.where === 'boat') {
      const boat = this.worldOf('boat')
      return { x: boat.x, y: boat.y + DECK, z: boat.z, scale: 1 }
    }
    return { ...toWorld(to.x, to.z, this.state.turn), y: to.where === 'land' ? LAND_Y : 0, scale: 1 }
  }

  /** How high the ground is under a carried toy: the land, the wooden rim, or the water. */
  private readonly groundUnder = (x: number, z: number): number => {
    const r = Math.hypot(x, z)
    return r <= LAND_R ? LAND_Y : r >= RIM_IN - 0.1 && r <= RIM_OUT + 0.1 ? RIM_TOP + 0.05 : 0
  }
  private readonly heldAt = { x: 0, y: 0, z: 0 }

  /** Whether the house stands where it was put: not in the air, not in a finger. */
  private houseStands(): boolean {
    return !this.acts.house.flight && this.carry?.kind !== 'house'
  }

  /** The gull's place, which follows from the house alone: in its smoke on the land, beside it in the sea, otherwise the buoy. */
  private gullPlace(): GullDoing['place'] {
    const where = this.acts.house.at.where
    if (!this.houseStands()) return 'buoy'
    if (where === 'land') {
      // Not where its head would be under the home control, with the house at the back of the land in the middle: it
      // keeps to its buoy then, its beak at the chimney. (Once in the smoke it gives the control a narrower berth, so it does not dither.)
      const chimney = this.chimney(), narrow = this.gull.doing.place === 'smoke' ? 1 : 0.8
      return chimney.y + RIDE + GULL_TALL <= roofAt(chimney.x * narrow, chimney.z) + 1e-3 ? 'smoke' : 'buoy'
    }
    if (where !== 'sea') return 'buoy'
    // Beside the house in the sea, where it covers nothing; with no such spot it stays on its buoy.
    const spot = this.gull.doing.place === 'paddle' ? this.gull.spot : gullSpot(this.state.toys, this.state.turn, this.posts.wave)
    if (!spot || !this.roomToDodge(spot)) return 'buoy'
    // And it goes there only if a way there fits under the lid of the frame: a spot at the back of the sea with a toy in front of it has none.
    if (this.gull.doing.place !== 'paddle' && this.routeFlight(this.gullAt(), { ...toWorld(spot.x, spot.z, this.state.turn), y: -0.2 }) > LID_GIVE) return 'buoy'
    return 'paddle'
  }

  /** How high the gull has to rise from the water to let the boat pass under it, with the sheep's height to spare when it is aboard. */
  private dodgeHigh(): number {
    return TALL.boat + 0.8 + (this.toy('sheep').where === 'boat' ? TALL.sheep * 0.6 : 0)
  }

  /**
   * Whether the gull can paddle at that spot of the turntable: with the boat afloat it has to rise to let it
   * pass, and at the back of the sea the lid of the frame leaves no room for that. It keeps to its buoy then.
   */
  private roomToDodge(spot: { x: number; z: number }): boolean {
    if (this.toy('boat').where !== 'sea') return true
    return this.dodgeHigh() + GULL_TALL <= lidAt(toWorld(spot.x, spot.z, this.state.turn).z)
  }

  private chimney(): { x: number; y: number; z: number } {
    const at = this.acts.house.at
    if (at.where !== 'land') return { x: 0, y: 0, z: 0 }
    return { ...toWorld(at.x + CHIMNEY.x * SIZE.house, at.z + CHIMNEY.z * SIZE.house, this.state.turn), y: LAND_Y + CHIMNEY.y * SIZE.house }
  }

  /** The top of the chimney of the house afloat, in the world: the house lies along the shore there, low in the water. */
  private chimneyAfloat(): { x: number; y: number; z: number } {
    const at = this.acts.house.at
    if (at.where !== 'sea') return { x: 0, y: 0, z: 0 }
    const yaw = Math.atan2(at.x, at.z), c = Math.cos(yaw), s = Math.sin(yaw), cx = CHIMNEY.x * SIZE.house, cz = CHIMNEY.z * SIZE.house
    return { ...toWorld(at.x + cx * c + cz * s, at.z - cx * s + cz * c, this.state.turn), y: (CHIMNEY.y - 0.3) * SIZE.house }
  }

  /** Where the gull paddles beside the house in the sea, in the world: the spot it took, carried round with the island. */
  private paddleSpot(): { x: number; z: number } {
    const spot = this.gull.spot
    return spot ? toWorld(spot.x, spot.z, this.state.turn) : { x: this.posts.buoy.x, z: this.posts.buoy.z }
  }

  /** Everything that stands in the way of a thing in the air, in the world. `except` is the one that is flying. */
  private obstacles(except: Kind | 'cat' | 'gull', wave = true): Obstacle[] {
    const list: Obstacle[] = []
    for (const kind of KINDS) {
      if (kind === except || this.carry?.kind === kind) continue
      // The sheep in the boat is part of the boat for whatever flies over them, and no obstacle to the boat that carries it.
      if (kind === 'sheep' && this.acts.sheep.at.where === 'boat' && except === 'boat') continue
      const at = this.worldOf(kind)
      list.push({ x: at.x, z: at.z, r: FOOT[kind], top: at.y + TALL[kind] + 0.25 })
    }
    if (except !== 'cat') {
      const cat = this.catAt(), seat = toWorld(cat.x, cat.z, this.state.turn)
      list.push({ x: seat.x, z: seat.z, r: CAT_FOOT * 1.15, top: cat.y + 2.3 })
    }
    if (except !== 'gull') {
      const gull = this.gullAt()
      list.push({ x: gull.x, z: gull.z, r: 0.9, top: gull.y + 2.15 })
    }
    list.push({ x: this.posts.buoy.x, z: this.posts.buoy.z, r: 0.9, top: 1.8 })
    // A toy the wave is taking or setting down goes onto its crest and off it: the wave is not in its way.
    if (wave) list.push({ x: this.wave.x, z: this.wave.z, r: 2.4, top: 2.8 })
    list.push({ x: this.posts.whale.x, z: this.posts.whale.z, r: 1.9, top: 0.9 })
    return list
  }

  /** Everything a finger can be on, for pick.ts. */
  standing(): Standing {
    const toys = KINDS.map((kind) => {
      const act = this.acts[kind], at = this.worldOf(kind)
      const where = this.carry?.kind === kind || act.flight || act.at.where === 'crest' ? 'air' as const : this.hand === kind ? 'hand' as const : act.at.where === 'tray' ? 'slot' as const : 'out' as const
      // The tree afloat is a log on its side along the shore: it is touched along its length.
      if (kind === 'tree' && where === 'out' && act.at.where === 'sea') {
        const shore = Math.atan2(act.at.x, act.at.z) + Math.PI / 2, half = TALL.tree / 2, dx = Math.sin(shore) * half, dz = Math.cos(shore) * half
        const lies = [{ ...toWorld(act.at.x - dx, act.at.z - dz, this.state.turn), y: LOG_Y }, { ...toWorld(act.at.x + dx, act.at.z + dz, this.state.turn), y: LOG_Y }] as const
        return { kind, at: where, ...at, lies }
      }
      return { kind, at: where, ...at }
    })
    const cat = this.catAt(), seat = toWorld(cat.x, cat.z, this.state.turn)
    return { toys, cat: { x: seat.x, y: cat.y, z: seat.z }, gull: this.gullAt(), wave: { x: this.wave.x, z: this.wave.z }, whale: this.posts.whale }
  }

  // --- A touch ---------------------------------------------------------------------

  /** A finger landed. Whatever it is on answers now, in this frame. */
  press(target: Target): void {
    // Any touch ends the wash at once, and is then an ordinary touch.
    this.endWash()
    this.sinceTouch = 0
    this.unheard = 0
    this.cat.pats = 0
    this.pressed = null
    this.grip = null
    switch (target.kind) {
      case 'slot': {
        const act = this.acts[target.toy]
        if (this.hand === target.toy) {
          // Already in the hand: it spins once where it hangs.
          act.whipped = 0
          this.say('whip')
        } else {
          if (this.hand) this.home(this.hand, true)
          this.hand = target.toy
          act.held = 0
          act.whipped = Infinity
          this.say('tok', { pitch: 1.25 - WEIGHT[target.toy] * 0.5 })
          // And it says who it is, in the same frame: the lamp winks, the sail swings, the head comes up, the crown pops, the roof lifts (motion.ts).
          this.say(HELLO[target.toy], { gain: 0.45, delay: 0.05 })
        }
        this.pressed = { kind: 'slot', toy: target.toy }
        break
      }
      case 'toy':
        if (this.hand) {
          // A toy set down on another toy: it lands beside it, and both rock. The boat afloat ducks under it instead.
          const at = this.worldOf(target.toy)
          if (target.toy === 'boat') this.duck(this.hand)
          this.send(this.hand, at.x, at.z)
        } else {
          this.poke(target.toy)
          this.pressed = { kind: 'toy', toy: target.toy }
        }
        break
      case 'cat': {
        if (this.hand) {
          // A toy set down on the cat: it lands where the cat sat.
          const seat = this.catAt(), at = toWorld(seat.x, seat.z, this.state.turn)
          this.send(this.hand, at.x, at.z)
        } else {
          this.cat.doing.poked = 0
          this.say('prrp')
          this.pressed = { kind: 'cat' }
        }
        break
      }
      case 'gull':
        this.gull.doing.poked = 0
        this.say('kyah')
        // Standing on its buoy, the buoy rocks and clangs; in the smoke, on the water, in a dive or on its way home there is no bell under it.
        if (this.gull.doing.place === 'buoy' && this.gull.doing.flying < 0 && this.gull.doing.dive < 0) {
          this.buoy.v += 2.4
          this.say('clang', { delay: 0.2 })
        }
        break
      case 'whale':
        this.blow(1)
        break
      case 'wave':
        this.touchWave()
        break
      case 'cloud': {
        // A cloud squeezes out a few drops.
        this.clouds[target.index] = 0
        this.say('pitpat')
        for (let i = 0; i < 4; i++) {
          if (this.particles.length >= 48) this.particles.shift()
          this.particles.push({ x: target.x + (i - 1.5) * target.size * 0.5, y: target.y - target.size * 0.5, z: target.z, vx: 0, vy: -target.size * (0.6 + i * 0.25), vz: 0, size: target.size * 0.16, grow: 0, age: 0, life: 0.8, tint: 'water' })
        }
        break
      }
      case 'sun':
        this.sun = 0
        this.say('bong')
        break
      case 'land':
      case 'sea':
        if (this.hand) this.send(this.hand, target.x, target.z)
        else {
          if (target.kind === 'land') this.thump(target.x, target.z)
          else this.plop(target.x, target.z)
          this.pressed = { kind: 'turn', angle: Math.atan2(target.z, target.x) }
        }
        break
      case 'rim':
        if (this.hand) {
          // With a toy in the hand the rim is the edge of the sea: the toy comes down just inside it.
          this.send(this.hand, target.x, target.z)
          break
        }
        // A tap turns the island one peg on; a finger that slides takes hold of it.
        this.say('clunk')
        this.spin = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, this.spin + (target.x >= 0 ? NOTCH : -NOTCH)))
        this.pressed = { kind: 'turn', angle: Math.atan2(target.z, target.x) }
        break
      case 'open':
        if (this.hand) {
          // Let go over open sea: it comes down at the nearest place inside the rim.
          const r = Math.hypot(target.x, target.z)
          this.send(this.hand, (target.x / r) * SEA_LANE_R, (target.z / r) * SEA_LANE_R)
        } else this.plop(target.x, target.z)
        break
      case 'tray':
        if (this.hand) this.home(this.hand, true)
        else {
          this.say('clack', { gain: 0.7 })
          for (const kind of KINDS) if (this.acts[kind].at.where === 'tray') this.acts[kind].hop.v += 2.2
        }
        break
      case 'sky':
        this.breeze = 0
        this.say('wind')
        break
    }
  }

  /** The finger has started to slide. A pressed toy comes along; pressed ground turns the island; the cat stretches. */
  dragStart(): void {
    const pressed = this.pressed
    if (!pressed) return
    if (pressed.kind === 'turn') {
      this.grip = { angle: pressed.angle }
      this.spin = 0
      return
    }
    if (pressed.kind === 'cat') {
      this.pulling = true
      return
    }
    const at = this.worldOf(pressed.toy)
    this.carry = { kind: pressed.toy, x: at.x, z: at.z, lifted: false }
    this.acts[pressed.toy].flight = null
    if (this.hand === pressed.toy) this.hand = null
    else {
      // Lifted from where it stood: the same "tok" and the same hello as out of its slot.
      this.acts[pressed.toy].held = 0
      this.say('tok', { pitch: 1.25 - WEIGHT[pressed.toy] * 0.5 })
      this.say(HELLO[pressed.toy], { gain: 0.45, delay: 0.05 })
    }
  }
  private pulling = false

  /**
   * The finger slid. `finger` is the point of the world under it; null over the sky. A carried toy is aimed at
   * that point: its landing ring lies under the fingertip the whole way, and the toy rides in the air above it.
   */
  drag(finger: { x: number; z: number } | null): void {
    this.sinceTouch = 0
    this.unheard = 0
    if (this.carry) {
      this.carry.lifted = false
      if (finger) { this.carry.x = finger.x; this.carry.z = finger.z }
    } else if (this.grip && finger) {
      const angle = Math.atan2(finger.z, finger.x)
      // The island follows the finger round: a point of it stays under the fingertip.
      this.state.turn -= wrap(angle - this.grip.angle)
      this.grip.angle = angle
    } else if (this.pressed?.kind === 'turn' && finger) {
      // A finger back on the island it flicked, before the drag was over: it takes hold again where it is, with the clunk of a hold, and the island stops under it.
      this.grip = { angle: Math.atan2(finger.z, finger.x) }
      this.spin = 0
      this.say('clunk')
    } else if (this.pulling && finger) {
      // The cat stretches like toffee toward the finger, the further the more.
      const seat = this.catAt(), at = toWorld(seat.x, seat.z, this.state.turn)
      this.cat.doing.pulled = clamp01(Math.hypot(finger.x - at.x, finger.z - at.z) / 2.5)
      this.cat.leanX = Math.max(-1, Math.min(1, (finger.x - at.x) / 2.5))
    }
  }

  /** The finger left the glass in the middle of a drag: the toy waits in the air for it. */
  lift(): void {
    if (this.carry) this.carry.lifted = true
    // A finger that leaves the rim has flicked it: the island runs on from this moment at the speed the finger gave it.
    this.flick()
  }

  /** The finger lets go of the island: it runs on at the speed it was turned at. */
  private flick(): void {
    if (!this.grip) return
    this.grip = null
    this.spin = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, this.turned))
  }

  /** The cat is let go: it twangs back. */
  private twang(): void {
    if (!this.pulling) return
    this.pulling = false
    if (this.cat.doing.pulled > 0.05) {
      this.cat.doing.twanged = 0
      this.say('boingMrrp')
    }
    this.cat.doing.pulled = 0
  }

  /** The drag is over where the finger let go. */
  drop(): void {
    const carry = this.carry
    this.pressed = null
    this.twang()
    // A flick: the island runs on at the speed the finger gave it (it already does when the finger's lift was told first).
    this.flick()
    if (!carry) return
    const kind = carry.kind, toy = this.toy(kind)
    const spot = this.prospect(kind, carry.x, carry.z)
    if (!spot) {
      this.fly(kind, { where: 'tray' }, 0.24, 0.5, { soft: true })
      this.carry = null
      this.put(kind, inTray(kind))
      return
    }
    const here = toIsland(carry.x, carry.z, this.state.turn), boat = this.boatAt()
    if (spot.where === 'sea' && this.acts.boat.at.where === 'sea' && Math.hypot(here.x - boat.x, here.z - boat.z) <= FOOT.boat) this.duck(kind)
    const bumped = spot.where !== 'boat' && Math.hypot(spot.x - here.x, spot.z - here.z) > 0.45 && Math.hypot(here.x, here.z) <= RIM_OUT
    this.fly(kind, spot, FALL_S, 0, { bumped })
    this.carry = null
    this.put(kind, { kind: toy.kind, where: spot.where, x: spot.x, z: spot.z })
  }

  /** The drag was taken away with the finger still down. The child made no drop: the toy goes back where it came from and nothing is changed. */
  cancel(): void {
    const carry = this.carry
    this.pressed = null
    this.grip = null
    this.twang()
    if (!carry) return
    this.fly(carry.kind, this.acts[carry.kind].at, 0.24, 0.4, { soft: true })
    this.carry = null
  }

  /** The press is over without a drag: a tap, or a press that was taken away. */
  release(): void {
    this.pressed = null
    this.grip = null
    this.twang()
  }

  // --- What a touch does -------------------------------------------------------------

  /**
   * Puts a toy in the air toward a place. It leaves from where it is now, and where something stands in its
   * way it goes up and over it. Called before the finger's hold on it is let go, so a carried toy leaves from
   * the height it was held at.
   */
  private fly(kind: Kind, to: Place, dur: number, arc: number, more: { wait?: number; bumped?: boolean; soft?: boolean; washed?: boolean; high?: number } = {}): void {
    const from = this.worldOf(kind), end = this.landing(kind, to)
    const high = more.high ?? cruise(from, end, FOOT[kind], this.obstacles(kind))
    this.acts[kind].flight = { wait: more.wait ?? 0, t: 0, dur: dur + (high === null ? 0 : OVER_S), arc, high, from, to, bumped: more.bumped ?? false, soft: more.soft ?? false, washed: more.washed ?? false }
  }

  /** Where a carried toy would come down if it were let go over that point of the world, or null for its slot in the tray. */
  private prospect(kind: Kind, x: number, z: number): Spot | null {
    const fromTray = this.acts[kind].at.where === 'tray'
    if (overTray(x, z)) return null
    const r = Math.hypot(x, z)
    if (r > RIM_OUT + 0.35) {
      if (fromTray && z > HALF_WAY_Z) return null
      x *= SEA_LANE_R / r
      z *= SEA_LANE_R / r
    }
    const here = toIsland(x, z, this.state.turn)
    return this.settled(kind, here.x, here.z)
  }

  /** Writes a toy's place into the save. The sheep goes where the boat goes, and stands by the tree when both are on the land. */
  private put(kind: Kind, toy: Toy): void {
    const toys = this.state.toys, was = toys[KINDS.indexOf(kind)]
    // A toy that went back where it was has changed nothing, and nothing is written for it.
    if (was.where === toy.where && was.x === toy.x && was.z === toy.z) return
    toys[KINDS.indexOf(kind)] = toy
    const sheep = this.toy('sheep')
    if (kind === 'boat' && toy.where === 'tray' && sheep.where === 'boat') {
      // The boat goes back to its slot: the sheep hops to its own, in the same save.
      toys[KINDS.indexOf('sheep')] = inTray('sheep')
      this.fly('sheep', { where: 'tray' }, 0.3, 0.8, { wait: 0.1, soft: true })
    }
    if (kind === 'boat' && toy.where !== 'tray') {
      this.acts.boat.lap = 0
      this.acts.boat.needle = 0
    }
    if (kind === 'sheep' || kind === 'tree') {
      const spot = munchSpot(toys)
      // (Not onto a cat that has no way out: the sheep then stays where it is and asks.)
      if (spot && !this.cornered(toys.map((toy) => (toy.kind === 'sheep' ? { kind: 'sheep' as const, where: 'land' as const, x: spot.x, z: spot.z } : toy)))) toys[KINDS.indexOf('sheep')] = { kind: 'sheep', where: 'land', x: spot.x, z: spot.z }
    }
    this.dirty = true
  }

  /** The toy in the hand is sent to a point of the world: it leaves now and comes down a moment later. */
  private send(kind: Kind, x: number, z: number): void {
    const here = toIsland(x, z, this.state.turn)
    const spot = this.settled(kind, here.x, here.z)
    const bumped = spot.where !== 'boat' && Math.hypot(spot.x - here.x, spot.z - here.z) > 0.45
    // A toy that comes down where the cat sits takes a little longer on its way: the cat is out from under it first.
    const cat = this.cat, seat = SEATS[cat.seat]
    const onCat = spot.where === 'land' && cat.seat !== RIM_SEAT && Math.hypot(spot.x - seat.x, spot.z - seat.z) < FOOT[kind] + CAT_FOOT + GAP
    this.fly(kind, spot, FLIGHT_S + (onCat ? ON_CAT_S : 0), 1.5, { bumped })
    this.hand = null
    this.put(kind, { kind, where: spot.where, x: spot.x, z: spot.z })
  }

  /** A toy goes back to its slot in the tray. */
  private home(kind: Kind, fromHand: boolean): void {
    this.fly(kind, { where: 'tray' }, fromHand ? 0.16 : 0.3, fromHand ? 0 : 0.8, { soft: true })
    if (this.hand === kind) this.hand = null
    if (this.toy(kind).where !== 'tray') this.put(kind, inTray(kind))
  }

  /** A toy other than the sheep is set down on the boat afloat: the boat ducks under and pops up to one side. */
  private duck(kind: Kind): void {
    if (kind === 'sheep' || this.acts.boat.at.where !== 'sea' || this.acts.boat.flight) return
    this.acts.boat.ducked = 0
    this.say('bloop')
  }

  /**
   * A toy is tapped where it stands. Its answer is a row of sounds (TAP in voices.ts), each said in the frame its
   * pose arrives: the first here, the rest from the step. A toy lifted in between sounds no more of it.
   */
  private poke(kind: Kind): void {
    const act = this.acts[kind]
    act.poked = 0
    act.hop.v += 1.2
    for (const cue of tapOf(kind, act.at.where === 'sea')) if (cue.at === 0) this.say(cue.name, { pitch: cue.pitch })
    if (kind === 'sheep') {
      // Its fleece puffs out: tufts of it fly off all round and fall.
      const at = this.worldOf('sheep')
      for (let i = 0; i < 7; i++) this.puff('water', at.x, at.y + 1.1, at.z, 1.3, 0.17)
    }
  }

  /** Bare land thumped like a drum: everything on the island and in the tray hops. */
  private thump(x: number, z: number): void {
    this.say('thump')
    this.knock(x, z, 0.5)
    for (const kind of KINDS) this.acts[kind].hop.v += this.acts[kind].at.where === 'tray' ? 2.6 : 3.4
    this.cat.hop.v += 3.6
    this.rings.push({ x, y: LAND_Y + 0.03, z, age: 0, life: 0.5, size: 1.1, tint: 'dust' })
  }

  private plop(x: number, z: number): void {
    this.say('plop', { pitch: 0.9 + this.rng.next() * 0.3 })
    this.rings.push({ x, y: 0.03, z, age: 0, life: 0.9, size: 1.3, tint: 'water' })
    for (let i = 0; i < 3; i++) this.puff('water', x, 0.1, z, 0.9)
  }

  /** The island dips and rocks toward a knock at that point of the world. */
  private knock(x: number, z: number, weight: number): void {
    const r = Math.max(1, Math.hypot(x, z))
    this.dip.v -= 0.9 + weight * 0.9
    this.tiltX.v += (z / r) * (0.25 + weight * 0.3)
    this.tiltZ.v -= (x / r) * (0.25 + weight * 0.3)
  }

  private puff(tint: Particle['tint'], x: number, y: number, z: number, speed: number, size = 0.14): void {
    const a = this.rng.next() * WHOLE, out = this.rng.next() * speed
    if (this.particles.length >= 48) this.particles.shift()
    const rising = tint === 'smoke' || tint === 'bubble', still = tint === 'drift'
    this.particles.push({
      x, y, z, vx: Math.cos(a) * out * (rising ? 0.12 : 1), vy: still ? 0 : rising ? 0.9 + this.rng.next() * 0.3 : 1.6 + this.rng.next() * speed * 1.6, vz: Math.sin(a) * out * (rising ? 0.12 : 1),
      size, grow: tint === 'smoke' ? 0.22 : tint === 'bubble' ? 0.05 : 0, age: 0, life: tint === 'smoke' ? 2.3 : tint === 'bubble' ? 1.2 : still ? 2.2 : 0.7 + this.rng.next() * 0.3, tint,
    })
  }

  /** The whale blows: a tall spout when it is touched, a small one in its own time. */
  private blow(strength: number): void {
    const { x, z } = this.posts.whale
    if (strength === 1) {
      this.whale.poked = 0
      this.say('spout')
      // The drops go up and come down again: they patter on the water about when they land.
      this.say('pitpat', { gain: 0.7, pitch: 0.8, delay: 0.55 })
    }
    for (let i = 0; i < (strength === 1 ? 9 : 3); i++) this.puff('water', x + 0.5, 0.9, z, 0.5 + strength * 0.5, 0.13)
  }

  // --- The wave ------------------------------------------------------------------------

  /** A finger on the wave. It rears first, slowly, and nothing is moved yet; a second touch while it rears lets it sink back. */
  private touchWave(): void {
    const w = this.washing
    if (w.rearing >= 0) {
      w.sankFrom = this.wave.rear
      w.rearing = -1
      w.sinking = 0
      // The yawn going up stops where it is, and the yawn going down is heard alone.
      this.hush()
      this.say('yawnDown')
      return
    }
    w.sinking = -1
    w.rearing = 0
    this.sayWash('yawn')
  }

  /** The wave has reared: the wash starts. What it will have done is saved now, and the scene plays it out. */
  private startWash(): void {
    const w = this.washing
    w.rearing = -1
    // A finger that is still down lets go first: a carried toy is back where it stood, and the hand is empty.
    this.carry = null
    this.grip = null
    this.pressed = null
    this.twang()
    this.hand = null
    // The toys that are out, the nearest to the wave first; the sheep leaves the boat before the boat goes.
    const out = KINDS.filter((kind) => this.toy(kind).where !== 'tray')
    const x = (kind: Kind): number => this.worldOf(kind).x + (kind === 'sheep' && this.acts.sheep.at.where === 'boat' ? 0.01 : 0)
    out.sort((a, b) => x(b) - x(a))
    w.bare = out.length === 0
    w.back = backAt(out.length)
    const length = w.bare ? BARE_S : washS(out.length)
    // Each rides the crest as near as it can to where the crest meets it, a slot's width from the next.
    const row = crestRow(out.map((kind) => this.worldOf(kind).z - ROLL_Z))
    out.forEach((kind, i) => { this.crest[kind] = row[i] })
    const beats: Beat[] = [
      // The wave itself: where it is follows from how far the scene has come; at the end it lies at its edge again.
      { at: 0, lasts: length, play: (progress) => {
        w.at = progress < 1 ? progress * length : -1
        if (progress >= 1) this.cat.doing.flooded = false
      } },
      { at: 0, lasts: 0, play: (_, finishing) => {
        if (finishing) return
        this.sayWash('roll')
        // The cat is off to the back of the rim before the water comes, puffed to twice its size.
        this.cat.doing.flooded = true
      } },
      // (Each sound of the wash is a beat of its own on the game's clock, so one that has not come yet when a touch ends the wash never sounds.)
      { at: 0.2, lasts: 0, play: (_, finishing) => { if (!finishing) this.sayWash('ffft') } },
      // The swell lifts the gull's buoy, and it surfs.
      { at: 0.9, lasts: 0, play: (_, finishing) => {
        if (finishing) return
        this.gull.doing.surf = 0
        this.sayWash('kyahaha')
      } },
      { at: w.bare ? BARE_BACK.at : w.back, lasts: 0, play: (_, finishing) => { if (!finishing) this.sayWash('sigh') } },
    ]
    out.forEach((kind, rank) => {
      // Taken onto the crest, one after another, each with the sound of its own ride. It goes up beside the wave
      // and over onto the crest, and over any toy that is in its way.
      beats.push({ at: 0.05 + rank * LIFT_EVERY, lasts: 0, play: (_, finishing) => {
        if (finishing) return
        const over = cruise(this.worldOf(kind), this.landing(kind, { where: 'crest' }), FOOT[kind], this.obstacles(kind, false))
        this.fly(kind, { where: 'crest' }, LIFT_S - OVER_S, 0, { soft: true, high: Math.max(over ?? 0, this.crestY() + 0.45) })
      } })
      // The sound of its ride, as it comes over onto the crest.
      beats.push({ at: 0.05 + rank * LIFT_EVERY + LIFT_S * 0.7, lasts: 0, play: (_, finishing) => { if (!finishing) this.sayWash(RIDE_SOUND[kind]) } })
    })
    // Stood in their slots from left to right, each with its own knock, each over whatever is in its way.
    KINDS.filter((kind) => out.includes(kind)).forEach((kind, rank) => {
      beats.push({ at: SET.at + rank * SET.each, lasts: 0, play: (_, finishing) => {
        const act = this.acts[kind]
        if (finishing) {
          act.flight = null
          act.at = { where: 'tray' }
          return
        }
        const over = cruise(this.worldOf(kind), this.landing(kind, { where: 'tray' }), FOOT[kind], this.obstacles(kind, false))
        this.fly(kind, { where: 'tray' }, SET_S, 0.9, { soft: true, washed: true, high: Math.max(over ?? 0, this.crestY() + 0.2) })
      } })
    })
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => {
      for (const kind of KINDS) this.state.toys[KINDS.indexOf(kind)] = inTray(kind)
      // And the cat where it will sit on the bare island.
      this.state.cat = catSeat(this.state.toys, this.state.turn)
      this.dirty = true
      this.urgent = true
    })
    w.at = 0
  }

  /** A touch ends the wash: every toy is in its slot, the wave is back at its edge, and what had not sounded yet stays quiet. */
  private endWash(): void {
    if (!this.scene?.running) return
    this.scene.finish()
    for (const kind of KINDS) {
      const act = this.acts[kind]
      if (act.at.where === 'crest' || (act.flight && (act.flight.washed || act.flight.to.where === 'crest'))) {
        act.flight = null
        act.at = { where: 'tray' }
      }
      // In its slot it is as any toy in the tray is: the tree has its whole crown again.
      if (act.at.where === 'tray' && !act.flight) {
        act.crown = 1
        act.count = 0
        act.rode = 0
      }
    }
    this.gull.doing.surf = -1
    // The wave is back at its edge now, for whoever asks where it is before the next step.
    wavePose(this.time, this.washing, this.posts.wave, this.wave)
    // Silent from this frame: what the wash still had sounding is cut.
    this.hush()
  }

  /**
   * A finger is about to land: a wash that is playing ends first, before anyone asks what the finger is on. The
   * toys are in their slots then and the wave is back at its edge, so the touch is answered as an ordinary
   * touch: a finger on a slot gets the toy, a finger where the wave lies gets the wave.
   */
  touch(lens: Lens, px: number, py: number, sky: Sky | null = null): void {
    this.endWash()
    this.press(pick(lens, px, py, this.standing(), sky))
  }

  /**
   * The game is put away: this is the island its save loads, made from what it would write at this moment, with
   * the same seed and the same posts. The Mount carries on with it, so a game put away and returned is the same
   * as one saved and loaded in everything: a wash that was playing is over and every toy is in its slot, a toy
   * in the hand is in its slot and a toy in the air stands where it was going, the island is still, the cat and
   * the gull are in their places, and nothing flies, lands or sounds after the return.
   */
  rested(childAge: number | null): Island {
    const rested = new Island(deserialize(JSON.parse(JSON.stringify(serialize(this.state))), childAge), this.seed, this.posts)
    // An island put away as it ran on has turned since its turn was last handed to storage: the island it becomes asks to be written.
    rested.dirty = this.dirty || Math.abs(wrap(this.state.turn - this.savedTurn)) > 0.001
    return rested
  }

  /** Whether the wash is being played. */
  get washingNow(): boolean {
    return this.scene?.running === true
  }

  // --- Time -------------------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    this.sinceTouch += dt
    this.unheard += dt
    {
      const boat = this.acts.boat, afloat = boat.at.where === 'sea' && !boat.flight && this.carry?.kind !== 'boat' && this.hand !== 'boat'
      this.aboard = clamp01(this.aboard + (afloat ? dt : -dt) / 0.3)
    }
    this.breeze += dt
    this.sun += dt
    for (let i = 0; i < this.clouds.length; i++) this.clouds[i] += dt
    const w = this.washing
    if (w.rearing >= 0) {
      w.rearing += dt
      if (w.rearing >= REAR_S) this.startWash()
    }
    if (w.sinking >= 0) {
      w.sinking += dt
      if (w.sinking >= SINK_S) w.sinking = -1
    }
    this.scene?.update(this.time)
    // The wave may not roll over a toy that is still on its way up.
    w.gate = -Infinity
    if (w.at >= 0 && !w.bare) {
      for (const kind of KINDS) {
        const act = this.acts[kind]
        if (act.at.where === 'tray' || act.at.where === 'crest' || (act.flight && act.flight.t >= 0.32)) continue
        w.gate = Math.max(w.gate, gateFor(this.worldOf(kind).x, FOOT[kind]))
      }
    }
    wavePose(this.time, w, this.posts.wave, this.wave)
    const turnedBy = this.turnBy(dt)
    for (const kind of KINDS) this.stepToy(kind, dt, turnedBy)
    this.stepResidents(dt, turnedBy)
    pull(this.dip, 0, 150, 9, dt)
    pull(this.tiltX, 0, 120, 7, dt)
    pull(this.tiltZ, 0, 120, 7, dt)
    pull(this.buoy, 0, 60, 3, dt)
    // The mown grass grows back once the sheep has stopped grazing it.
    if (!this.mown.fresh) this.mown.level = Math.max(0, this.mown.level - dt / 6)
    this.mown.fresh = false
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.age += dt
      if (p.age >= p.life) { this.particles.splice(i, 1); continue }
      if (p.tint === 'water' || p.tint === 'leaf' || p.tint === 'dust') p.vy -= (p.tint === 'leaf' ? 3 : 7) * dt
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
      p.size += p.grow * dt
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].age += dt
      if (this.rings[i].age >= this.rings[i].life) this.rings.splice(i, 1)
    }
  }

  /** Turns the island, and returns how far it turned in this step. */
  private turnBy(dt: number): number {
    if (!this.grip) {
      this.state.turn += this.spin * dt
      this.spin *= Math.exp(-SPIN_DRAG * dt)
      if (Math.abs(this.spin) < 0.03) this.spin = 0
    }
    this.state.turn = ((this.state.turn % WHOLE) + WHOLE) % WHOLE
    // How fast it is turning, from what it actually did since the last step: a finger's turn and a flick's alike.
    const by = wrap(this.state.turn - this.lastTurn), speed = by / dt
    this.lastTurn = this.state.turn
    this.turned += (speed - this.turned) * Math.min(1, dt * 14)
    if (Math.abs(this.turned) < 0.02) this.turned = 0
    const peg = pegAt(this.state.turn)
    if (peg !== this.peg) {
      this.peg = peg
      this.say('peg', { pitch: 0.9 + Math.min(1, Math.abs(this.turned) / 6) * 0.4 })
      this.dirty = true
    }
    this.rumble -= dt
    if (Math.abs(this.turned) > 0.3 && this.rumble <= 0) {
      this.rumble = 0.11
      this.say('rumble', { pitch: 0.8 + Math.min(1.2, Math.abs(this.turned) * 0.14), gain: Math.min(1, Math.abs(this.turned) / 3) })
    }
    // At rest again: the island's new turn is written.
    if (this.turned === 0 && this.spin === 0 && !this.grip && Math.abs(wrap(this.state.turn - this.savedTurn)) > 0.001) {
      this.savedTurn = this.state.turn
      this.dirty = true
    }
    // What stands on a spun island feels it: each in its own way, with its own sound, for as long as it spins.
    const fast = Math.abs(this.turned)
    this.spun += (clamp01((fast - SPUN_TO) / 3) - this.spun) * Math.min(1, dt * 10)
    const out = (kind: Kind): boolean => { const at = this.acts[kind].at.where; return at === 'land' || at === 'sea' }
    if (!this.spinning && fast >= SPUN_FROM) {
      this.spinning = true
      this.spinBeat = 0
      if (out('tree') && this.acts.tree.at.where === 'land') this.say('swish')
      if (out('sheep')) this.say('slideBaa', { gain: 0.8 })
      if (this.acts.boat.at.where === 'sea') {
        this.say('surf')
        const boat = this.worldOf('boat')
        for (let i = 0; i < 4; i++) this.puff('water', boat.x, 0.1, boat.z, 1.2)
      }
    } else if (this.spinning && fast < SPUN_TO) {
      this.spinning = false
      // It stops: the cat staggers, the gull's neck unwinds, and the crown whips round after its trunk.
      this.cat.doing.stopped = 0
      this.say('stagger', { delay: 0.1 })
      if (Math.abs(this.gull.wind) > 1) this.say('wrrrip')
      if (this.acts.tree.at.where === 'land') this.say('swish', { gain: 0.7 })
    }
    if (this.spinning) {
      this.spinBeat -= dt
      if (this.spinBeat <= 0) {
        this.spinBeat = 0.3
        const pitch = 0.8 + Math.min(1, fast / 7) * 0.9, gain = Math.min(1, fast / 4)
        if (out('lighthouse')) this.say('whirr', { pitch, gain })
        if (this.acts.boat.at.where === 'land') this.say('skree', { pitch: 0.9 + this.rng.next() * 0.2, gain: gain * 0.8 })
        // The door and the shutters bang on the land; afloat nothing flaps.
        if (this.acts.house.at.where === 'land') this.say('clackclack', { gain: gain * 0.8 })
        this.say('skrrt', { gain: gain * 0.7, delay: 0.15 })
      }
    }
    return by
  }

  private stepToy(kind: Kind, dt: number, turnedBy: number): void {
    const act = this.acts[kind]
    pull(act.hop, 0, 160, 11, dt)
    pull(act.leaf, act.crown, 260, 9, dt)
    // The crown hangs behind the trunk of a spun island, and whips round after it when the island stops.
    pull(act.lag, kind === 'tree' ? -Math.max(-1.1, Math.min(1.1, this.turned * 0.3)) : 0, 70, 5, dt)
    act.held += dt
    act.whipped += dt
    act.ducked += dt
    act.nudged += dt
    if (act.flight) {
      const flight = act.flight
      if (flight.wait > 0) {
        flight.wait -= dt
        if (flight.wait > 0) return
      }
      flight.t += dt / flight.dur
      if (flight.t >= 1) this.land(kind, flight)
      return
    }
    if (act.at.where === 'crest') {
      act.rode += dt
      return
    }
    if (act.at.where === 'tray' || this.carry?.kind === kind) return
    const before = act.age, poked = act.poked
    act.age += dt
    act.poked += dt
    const crossed = (at: number): boolean => poked < at && act.poked >= at
    const every = (seconds: number): boolean => Math.floor(act.age / seconds) !== Math.floor(before / seconds)
    // The rest of a tap's answer, each sound in the frame its pose arrives.
    if (poked < POKE_S[kind] + 1) for (const cue of tapOf(kind, act.at.where === 'sea')) if (cue.at > 0 && crossed(cue.at)) this.say(cue.name, { pitch: cue.pitch })
    const sea = act.at.where === 'sea', place = this.placeOf(kind)!, world = toWorld(place.x, place.z, this.state.turn)
    switch (kind) {
      case 'lighthouse': {
        // The beam turns in the world, so a spun island smears it. A tap whips it once round.
        const was = act.beam
        act.beam += 1.2 * dt + (act.poked >= 0.36 && act.poked < 0.96 ? (WHOLE / 0.6) * dt : 0)
        if (act.poked <= POKE_S.lighthouse) break
        if (sea) {
          // From the shallows it moos through a foghorn once each turn, with a ring of ripples.
          if (Math.floor(act.beam / WHOLE) !== Math.floor(was / WHOLE)) {
            this.habit(kind, 'foghorn')
            this.rings.push({ x: world.x, y: 0.03, z: world.z, age: 0, life: 1.4, size: 2.2, tint: 'water' })
          }
        } else if (every(0.62)) {
          // It hums up as the beam comes toward the child and down as it goes.
          this.habit(kind, 'hum', 0.45, 1 + 0.22 * Math.cos(act.beam))
        }
        break
      }
      case 'boat': {
        if (act.at.where === 'sea') {
          // Round the island on its own ring, faster for a moment when tapped. When the island is spun the water
          // turns under it and it stays behind; ducked under a toy, it comes up a little further on.
          const a = Math.atan2(act.at.z, act.at.x)
          const was = a - act.lap - this.state.turn + turnedBy
          const dart = act.poked < 0.9 ? Math.sin((act.poked / 0.9) * Math.PI) * 1.7 : 0
          act.lap += (0.42 + dart + (act.ducked < 0.5 ? 0.9 : 0)) * dt - turnedBy * 0.85
          const now = a - act.lap - this.state.turn
          // It rings its bell each time it passes the front, and the sheep aboard bleats like a ship's horn.
          if (Math.floor((was - Math.PI / 2) / WHOLE) !== Math.floor((now - Math.PI / 2) / WHOLE) && !this.spinning) {
            this.habit(kind, 'bell')
            if (this.acts.sheep.at.where === 'boat') this.habit(kind, 'horn', 1, 1, 0.25)
          }
          // A creak now and then, a hiss of wake behind it always, and foam when it darts.
          if (every(3.4)) {
            this.habit(kind, 'creak', 0.7)
            this.habit(kind, 'wake', 0.7)
          }
          if (every(dart > 0.3 ? 0.07 : 0.4)) {
            const at = this.worldOf('boat')
            this.puff('water', at.x, 0.05, at.z, dart > 0.3 ? 0.8 : 0.25, dart > 0.3 ? 0.12 : 0.07)
          }
        } else {
          // On the land it keeps its heading while the island turns under it, like a needle.
          act.needle -= turnedBy
          if (Math.floor((act.age * 13) / Math.PI) !== Math.floor((before * 13) / Math.PI) && !this.spinning) {
            // Each slap of the hull is heard at first, and then every fourth. The sheep on its deck is bounced by them.
            act.count += 1
            if (act.age < 1.4 || act.count % 4 === 0) this.habit(kind, 'slap', act.age < 1.4 ? 1 : 0.6, 0.9 + (act.count % 3) * 0.08)
            if (this.acts.sheep.at.where === 'boat' && act.count % 4 === 2) this.habit(kind, 'boingBaa', 0.8)
          }
        }
        break
      }
      case 'sheep': {
        if (act.at.where === 'boat') break
        act.beat += dt
        if (sea) {
          if (act.beat >= 3.2) {
            act.beat = 0
            this.habit(kind, 'blub')
            this.puff('bubble', world.x, 0.1, world.z, 0.4, 0.09)
          }
          break
        }
        const grazing = this.grazing()
        if (grazing === 'munch') {
          // Tuft by tuft until the crown is small; then the tree shivers, the leaves pop back, and the sheep hiccups a leaf.
          const tree = this.acts.tree
          if (tree.crown > 0.5 && act.beat >= 0.55) {
            act.beat = 0
            tree.crown = Math.max(0.5, tree.crown - 0.1)
            this.habit(kind, 'crunch', 0.9, 0.9 + this.rng.next() * 0.25)
            const at = this.worldOf('tree')
            this.puff('leaf', at.x, at.y + 1.5, at.z, 1.1, 0.1)
            if (tree.crown <= 0.5) act.beat = -0.5
          } else if (tree.crown <= 0.5 && act.beat >= 0) {
            if (act.count === 0) {
              act.count = 1
              tree.hop.v += 1.4
              this.habit('tree', 'brrr')
            }
            if (act.beat >= 0.6) {
              tree.crown = 1
              act.count = 0
              act.beat = -3
              this.habit('tree', 'pop')
              this.habit(kind, 'hic', 1, 1)
              this.puff('leaf', world.x, place.y + TALL.sheep * 0.8, world.z, 0.6, 0.1)
            }
          }
        } else if (grazing === 'graze') {
          // It nibbles the grass at its feet and leaves a mown patch, which grows back when it has gone.
          if (act.beat >= 1.3) {
            act.beat = 0
            this.habit(kind, 'munch', 0.8)
            if (this.mown.x !== place.x || this.mown.z !== place.z) this.mown.level = 0
            this.mown.x = place.x
            this.mown.z = place.z
            this.mown.level = Math.min(1, this.mown.level + 0.34)
          }
          if (this.mown.x === place.x && this.mown.z === place.z) this.mown.fresh = true
        } else if (grazing === 'ask' && act.beat >= 4) {
          act.beat = 0
          this.habit(kind, 'baaAsk')
        }
        break
      }
      case 'tree': {
        if (crossed(0.3)) for (let i = 0; i < 9; i++) this.puff('leaf', world.x, place.y + 1.5, world.z, 1.8, 0.11)
        // The log's "glonk" comes each time it has rolled half over: one clock for the roll and its sound (the pose rolls it by its age too).
        if (sea) {
          if (every(Math.PI / LOG_ROLL)) this.habit(kind, 'glonk')
        } else {
          act.beat += dt
          if (act.beat >= 6.5) {
            act.beat = 0
            this.habit(kind, 'rustle', 0.5)
          }
        }
        // Afloat, leaves trail from it on the water.
        if (sea && every(0.8)) this.puff('drift', world.x + (this.rng.next() - 0.5) * 1.6, 0.05, world.z + (this.rng.next() - 0.5) * 1.6, 0.1, 0.08)
        break
      }
      case 'house': {
        act.beat += dt
        act.puffed += dt
        const chimney = this.chimney(), gull = this.gull.doing
        if (crossed(0.24)) {
          // Tapped: one big smoke ball bursts out.
          const at = sea ? this.chimneyAfloat() : chimney
          this.puff('smoke', at.x, at.y, at.z, 0.3, 0.42)
          if (gull.place === 'smoke' && gull.flying < 0) gull.lifted = 0
        }
        // On a spun island the puffs come fast and are left behind in a spiral.
        if (act.beat >= (sea ? 1.3 : this.spinning ? 0.2 : PUFF_S)) {
          act.beat = 0
          if (sea) {
            const top = this.chimneyAfloat()
            this.puff('bubble', top.x, top.y, top.z, 0.3, 0.12)
            this.habit(kind, 'blop', 1, 0.9 + this.rng.next() * 0.3)
            // The bubbles tickle the gull paddling beside it.
            if (gull.place === 'paddle' && gull.flying < 0) {
              gull.tickled = 0
              this.habit(kind, 'kyahihi', 0.8, 1, 0.15)
            }
          } else {
            this.puff('smoke', chimney.x, chimney.y, chimney.z, 0.3, this.spinning ? 0.16 : 0.24)
            // The roof lifts with the ball: the pose reads this one clock.
            act.puffed = 0
            if (this.spinning) break
            this.habit(kind, 'whoomp')
            if (gull.place === 'smoke' && gull.flying < 0) {
              gull.lifted = 0
              if (this.loud > 0) this.say('whee', { gain: this.loud * 0.8, delay: 0.12 })
            }
          }
        }
        break
      }
    }
  }

  /** What the sheep is doing on the land. */
  private grazing(): Grazing {
    const sheep = this.acts.sheep.at, tree = this.acts.tree
    if (sheep.where !== 'land' || tree.at.where === 'tray' || tree.at.where === 'crest') return 'graze'
    if (tree.at.where !== 'land' || tree.flight || this.carry?.kind === 'tree') return 'ask'
    return Math.hypot(sheep.x - tree.at.x, sheep.z - tree.at.z) <= FOOT.sheep + FOOT.tree + GAP + 0.1 ? 'munch' : 'ask'
  }

  /** A flight is over: the toy stands where it was sent. */
  private land(kind: Kind, flight: Flight): void {
    const act = this.acts[kind]
    act.flight = null
    act.at = flight.to
    act.age = 0
    act.poked = Infinity
    act.beat = 0
    act.count = 0
    act.crown = 1
    act.rode = 0
    act.puffed = Infinity
    if (kind === 'tree') this.acts.sheep.beat = 0
    if (flight.to.where === 'crest') return
    if (flight.to.where === 'tray') {
      act.hop.v += 1.5
      if (!flight.washed) {
        this.say('clack', { pitch: 1.2 - WEIGHT[kind] * 0.45 })
        return
      }
      // Stood in its slot by the wave, each with its own knock: deep for the lighthouse, the lightest for the sheep.
      if (kind === 'tree') this.say('plunk')
      else if (kind === 'boat') this.say('clack', { pitch: 0.95 })
      else this.say('knock', { pitch: 1.5 - WEIGHT[kind] * 0.8, gain: kind === 'sheep' ? 0.6 : 0.9 })
      return
    }
    const at = this.landing(kind, flight.to)
    if (flight.to.where === 'boat') {
      this.say('baa')
      this.acts.boat.hop.v -= 2
      return
    }
    // The knock: lower the heavier the toy, a splash in the sea, and softer for a toy that only stepped aside.
    const weight = WEIGHT[kind], gain = flight.soft ? 0.5 : 1
    if (flight.to.where === 'sea') {
      this.say('splash', { pitch: 1.3 - weight * 0.5, gain })
      this.rings.push({ x: at.x, y: 0.03, z: at.z, age: 0, life: 1, size: 1.2 + FOOT[kind] * 1.6, tint: 'water' })
      for (let i = 0; i < 6; i++) this.puff('water', at.x, 0.1, at.z, 1.4)
    } else {
      this.say('knock', { pitch: 1.5 - weight * 0.8, gain })
      this.rings.push({ x: at.x, y: LAND_Y + 0.03, z: at.z, age: 0, life: 0.5, size: 0.9 + FOOT[kind] * 1.5, tint: 'dust' })
    }
    if (flight.bumped) this.say('bump', { delay: 0.03 })
    if (!flight.soft) {
      this.knock(at.x, at.z, weight)
      // Everything already there hops, the nearest most.
      for (const other of KINDS) {
        const where = this.acts[other].at.where
        if (other === kind || where === 'tray' || where === 'crest') continue
        const there = this.worldOf(other)
        this.acts[other].hop.v += (flight.bumped ? 3.2 : 2.2) / (1 + Math.hypot(there.x - at.x, there.z - at.z) * 0.35)
      }
      this.cat.hop.v += 2.6
      this.residentsSee(flight.to.where, at.x, at.z)
    }
    // Its own first sound, a moment after the knock.
    const first = { lighthouse: 'ding', boat: flight.to.where === 'sea' ? 'sail' : 'slap', sheep: flight.to.where === 'sea' ? 'blub' : 'baa', tree: flight.to.where === 'sea' ? 'glonk' : 'rustle', house: flight.to.where === 'sea' ? 'blop' : 'door' } as const
    this.say(first[kind], { delay: 0.09, gain })
    // The sheep goes to the tree in one bound, whichever of the two came down.
    const sheep = this.toy('sheep'), shown = this.acts.sheep
    if ((kind === 'sheep' || kind === 'tree') && sheep.where === 'land' && shown.at.where === 'land' && !shown.flight && (shown.at.x !== sheep.x || shown.at.z !== sheep.z)) {
      this.fly('sheep', { where: 'land', x: sheep.x, z: sheep.z }, BOUND_S, 1, { wait: 0.28, soft: true })
    }
  }

  /** A toy has come down on the island or in its sea, at that point of the world: what the gull and the cat make of it. */
  private residentsSee(where: 'land' | 'sea', x: number, z: number): void {
    const gull = this.gull.doing, cat = this.cat
    if (where === 'land') {
      // The gull cranes its neck, its feet paddle on the buoy, the bell clinks, and it asks.
      if (gull.place === 'buoy' && gull.flying < 0 && gull.dive < 0) {
        gull.craned = 0
        this.buoy.v += 0.8
        this.say('clink', { delay: 0.15, gain: 0.8 })
        this.say('kwuk', { delay: 0.25, gain: 0.8 })
      }
      return
    }
    this.gull.splash = { x, z }
    if (gull.place === 'buoy' && gull.flying < 0 && gull.dive < 0 && gull.surf < 0) {
      // Sure that it is a fish, it dives beak first, and comes up with nothing.
      gull.dive = 0
      this.say('splish', { delay: DIVE_S * 0.42 })
    } else if (gull.flying < 0) {
      gull.craned = 0
      this.say('kwuk', { delay: 0.25, gain: 0.8 })
    }
    // A splash beside the cat: it flinches from the spray, shakes each paw and hisses at the water.
    const seat = this.catAt(), sits = toWorld(seat.x, seat.z, this.state.turn)
    if (cat.leap < 0 && Math.hypot(sits.x - x, sits.z - z) <= SPRAY_R) {
      cat.doing.splashed = 0
      this.say('fft', { delay: 0.38 })
      this.say('fft', { delay: 0.68 })
      this.say('kssh', { delay: 0.95 })
    }
  }

  /** Where the lamp's light falls on the ground, in the world, or null when no lamp is lit. */
  private lightSpot(): { x: number; z: number; sea: boolean } | null {
    const act = this.acts.lighthouse, where = act.at.where
    if ((where !== 'land' && where !== 'sea') || act.flight || this.carry?.kind === 'lighthouse' || act.age < 0.3) return null
    const at = toWorld(act.at.x, act.at.z, this.state.turn), reach = where === 'sea' ? LIGHT_REACH.sea : LIGHT_REACH.land
    return { x: at.x + Math.sin(act.beam) * reach, z: at.z + Math.cos(act.beam) * reach, sea: where === 'sea' }
  }

  /** A seat's place on the turntable. The seat on the rim is the back of the rim as the child sees it, however the island is turned. */
  private seatAt(seat: number): { x: number; z: number } {
    return seat === RIM_SEAT ? toIsland(RIM_SEAT_X, -Math.sqrt(RIM_SEAT_R * RIM_SEAT_R - RIM_SEAT_X * RIM_SEAT_X), this.state.turn) : SEATS[seat]
  }

  private stepResidents(dt: number, turnedBy: number): void {
    const cat = this.cat, doing = cat.doing, gull = this.gull, g = gull.doing
    pull(cat.hop, 0, 170, 10, dt)
    doing.poked += dt
    doing.patted += dt
    doing.startled += dt
    doing.landedOn += dt
    doing.splashed += dt
    doing.pounced += dt
    doing.stopped += dt
    doing.twanged += dt
    // On the rim, too: the rim slides round under it.
    doing.spun = this.spun
    // The cat's seat follows from the toys, the one in the finger counted where it would land: it is gone before a toy arrives.
    let toys: readonly Toy[] = this.state.toys
    if (this.carry) {
      const spot = this.prospect(this.carry.kind, this.carry.x, this.carry.z)
      const carried = this.carry.kind
      toys = toys.map((toy) => (toy.kind !== carried ? toy : spot && spot.where === 'land' ? { kind: carried, where: 'land', x: spot.x, z: spot.z } : inTray(carried)))
    }
    // A toy in the finger is coming its way: the nearer the toy, or the ring where it would land, the lower the cat
    // shrinks, ears back, eyes on the toy. When the ring reaches its seat it goes, to the nearest seat that is free.
    let wary = 0
    if (this.carry && cat.leap < 0 && cat.seat !== RIM_SEAT) {
      const spot = this.prospect(this.carry.kind, this.carry.x, this.carry.z), seat = this.seatAt(cat.seat), air = toIsland(this.carry.x, this.carry.z, this.state.turn)
      const off = Math.min(Math.hypot(air.x - seat.x, air.z - seat.z), spot && spot.where === 'land' ? Math.hypot(spot.x - seat.x, spot.z - seat.z) : Infinity)
      wary = clamp01(1 - (off - (FOOT[this.carry.kind] + CAT_FOOT + GAP)) / WARY_FROM)
    }
    doing.wary += (wary - doing.wary) * Math.min(1, dt * 9)
    // Its seat is worked out for the island at rest: while the island turns it stays where it is and is dragged round.
    const still = this.spin === 0 && this.grip === null
    if (still) cat.turn = this.state.turn
    // While the wave is at work it sits on the back of the rim.
    const goal = doing.flooded ? RIM_SEAT : catSeat(toys, cat.turn, cat.seat)
    if (cat.leap >= 0) {
      cat.leap += dt / LEAP_S
      if (cat.leap >= 1) {
        cat.leap = -1
        cat.hop.v -= 1.6
        // Landed beside the toy that took its seat: it glares at it, and then washes a paw.
        if (cat.cross) doing.landedOn = 0
        cat.cross = false
      }
    } else if (goal !== cat.seat && (g.flying < 0 || !seatFree(cat.seat, toys)) && (this.wayTo(goal, toys) !== null || doing.flooded || !seatFree(cat.seat, toys))) {
      // The leap is planned: to the seat it wants, to the nearest seat it can reach, or, with the wave coming and no way round, over.
      const next = this.wayTo(goal, toys) ?? goal
      // (While the gull is in the air the cat waits for it to come down, unless a toy is on its way to where it sits: the two do not cross in the air.)
      // (With no way round to any seat it waits where it is, until the boat has sailed by or the island is turned. A toy is never set down on a cat that has no way out: it lands beside it, as beside a toy.)
      // Landed on, it yowls; with its seat only bettered, it goes without a word.
      if (!doing.flooded && !seatFree(cat.seat, toys)) {
        doing.startled = 0
        cat.cross = true
        // The toy that took its seat: the one on the land nearest to it.
        const had = this.seatAt(cat.seat)
        cat.by = null
        let nearest = Infinity
        for (const toy of toys) {
          const off = Math.hypot(toy.x - had.x, toy.z - had.z)
          if (toy.where === 'land' && off < nearest) { nearest = off; cat.by = toy.kind }
        }
        this.say('mrow', { gain: this.carry ? 0.7 : 1 })
      }
      cat.from = cat.seat
      cat.seat = next
      // Its seat is saved with the island: for the back of the rim in the wash, the seat it will take when the wave has gone.
      this.keepSeat(doing.flooded ? catSeat(this.state.toys, cat.turn) : next)
      cat.leap = 0
    }
    doing.leap = cat.leap
    doing.hop = cat.hop.x
    // Its eyes, and the gull's, go to whatever moves, and never jump there.
    const watched = this.watched(), sits = this.catAt(), seat = toWorld(sits.x, sits.z, this.state.turn), perch = this.gullAt()
    // Come down beside the toy that took its seat, the cat glares at that toy.
    const glared = doing.landedOn < GLARE_S && cat.by ? this.worldOf(cat.by) : null
    aimEyes(cat, seat.x, sits.y + 1, seat.z, glared ? { x: glared.x, y: glared.y + TALL[cat.by!] * 0.5, z: glared.z } : watched, dt)
    aimEyes(gull, perch.x, perch.y + 1.4, perch.z, watched, dt)
    const idle = cat.leap < 0 && doing.landedOn > 2.6 && doing.splashed > 1.5 && doing.poked > 1.1 && !doing.flooded && !this.pulling && this.spun < 0.1
    // While toys wait in the tray and nobody touches, it pats the bare ground beside it: three times, and then it lets be.
    if (cat.pats < PATS.length && this.sinceTouch >= PATS[cat.pats]) {
      cat.pats += 1
      if (idle && this.state.toys.some((toy) => toy.where === 'tray')) {
        doing.patted = 0
        // As loud as the island is: full after a touch, softly for a while, and then only seen.
        this.murmur('pat', 1, 0.3)
      }
    }
    // The lamp's light on the ground: it turns to follow it round, and pounces each time it passes. It never catches it.
    const light = this.lightSpot()
    let face = 0
    doing.crouched = light !== null && light.sea && idle
    if (light) {
      face = Math.max(-1.3, Math.min(1.3, Math.atan2(light.x - seat.x, light.z - seat.z)))
      if (idle && doing.pounced > 1.4 && Math.hypot(light.x - seat.x, light.z - seat.z) <= POUNCE_R) {
        doing.pounced = 0
        this.murmur('patpat')
      }
    }
    // The boat flapping on the land is a fish to it: it pats it, and the boat flaps a step away.
    const boat = this.acts.boat
    if (boat.at.where === 'land' && !boat.flight && this.carry?.kind !== 'boat') {
      const at = this.worldOf('boat')
      if (!light) face = Math.max(-1.3, Math.min(1.3, Math.atan2(at.x - seat.x, at.z - seat.z)))
      cat.boatPat -= dt
      if (cat.boatPat <= 0 && idle && doing.pounced > 0.8) {
        cat.boatPat = 3.6
        doing.patted = 0
        boat.nudged = 0
        boat.hop.v += 2.4
        this.murmur('pat', 1, 0.25)
        this.murmur('slap', 0.7, 0.4)
      }
    } else cat.boatPat = 1.2
    cat.face += (face - cat.face) * Math.min(1, dt * 5)

    // The gull.
    g.poked += dt
    g.craned += dt
    g.lifted += dt
    g.tickled += dt
    // Wherever it is, it knows how much room there is over its head under the lid of the frame: a puff of smoke lifts it, its feathers stand up and its neck stretches as far as that and no further.
    {
      const at = this.gullAt()
      g.room = roofAt(at.x, at.z) - (at.y + GULL_TALL)
    }
    if (g.surf >= 0) {
      g.surf += dt / SURF_S
      if (g.surf >= 1) g.surf = -1
    }
    if (g.dive >= 0) {
      const before = g.dive
      g.dive += dt / DIVE_S
      const dive = this.diveSpot()
      if (before < 0.4 && g.dive >= 0.4) {
        this.rings.push({ x: dive.x, y: 0.03, z: dive.z, age: 0, life: 0.9, size: 1.5, tint: 'water' })
        for (let i = 0; i < 6; i++) this.puff('water', dive.x, 0.1, dive.z, 1.3)
      }
      // It comes up with nothing, spitting water.
      if (before < 0.7 && g.dive >= 0.7) for (let i = 0; i < 4; i++) this.puff('water', dive.x, 1.2, dive.z + 0.5, 0.7, 0.08)
      if (g.dive >= 1) {
        g.dive = -1
        this.buoy.v += 1.2
      }
    } else if (g.flying >= 0) {
      g.flying += dt / GULL_S
      if (g.flying >= 1) {
        g.flying = -1
        if (g.place === 'buoy') this.buoy.v += 1.6
      }
    } else if (cat.leap < 0 && (this.gullPlace() !== g.place || (g.place === 'paddle' && still && this.gullMoved()))) {
      // (It waits for a leaping cat to land first.)
      // Its place follows from the house: it flies there, over whatever stands between.
      const from = this.gullAt()
      gull.from = { x: from.x, y: from.y, z: from.z }
      gull.spot = this.acts.house.at.where === 'sea' && this.houseStands() ? gullSpot(this.state.toys, this.state.turn, this.posts.wave) : null
      g.place = this.gullPlace()
      g.flying = 0
      g.lifted = Infinity
      gull.over = this.routeFlight()
      gull.turn = this.state.turn
    }
    // It follows a spun island round with its head until its neck is wound up; when the island stops the head spins back.
    if (this.spinning) gull.wind = Math.max(-9, Math.min(9, gull.wind + turnedBy))
    else gull.wind *= Math.exp(-9 * dt)
    // Its beak points at the chimney, or at whatever last splashed.
    const aim = this.acts.house.at.where === 'land' && this.houseStands() && g.place !== 'smoke' ? this.chimney() : g.place === 'buoy' ? gull.splash : null
    const head = aim ? Math.max(-1.4, Math.min(1.4, wrap(Math.atan2(aim.x - perch.x, aim.z - perch.z) - this.gullYaw()))) : 0
    gull.head += (head - gull.head) * Math.min(1, dt * 4)
    // Paddling in the boat's ring, it rises to let the boat pass under it.
    g.dodge = 0
    if (g.place === 'paddle' && this.acts.boat.at.where === 'sea' && this.carry?.kind !== 'boat') {
      const spot = this.paddleSpot(), at = this.worldOf('boat')
      g.dodge = smooth(clamp01(1 - (Math.hypot(at.x - spot.x, at.z - spot.z) - 2.1) / 1.5))
      if (!gull.dodging && g.dodge > 0.3) {
        gull.dodging = true
        this.murmur('kwuk', 0.8)
      } else if (g.dodge < 0.05) gull.dodging = false
    }
    // The whale breathes out in its own time.
    this.whale.poked += dt
    this.whale.next -= dt
    if (this.whale.next <= 0) {
      this.whale.next = 9 + this.rng.next() * 5
      this.blow(0.3)
    }
  }

  /**
   * The seat the cat can leap to when it wants `goal`: `goal` itself when there is a way round to it, else the
   * nearest free seat there is a way round to, else null. The leap to the seat it names is left planned.
   */
  private wayTo(goal: number, toys: readonly Toy[]): number | null {
    const cat = this.cat
    if (this.routeLeap(cat.seat, goal, toys)) return goal
    const here = this.seatAt(cat.seat), far = (seat: number): number => Math.hypot(this.seatAt(seat).x - here.x, this.seatAt(seat).z - here.z)
    const others = SEATS.map((_, seat) => seat).filter((seat) => seat !== cat.seat && seat !== goal && seatFree(seat, toys)).sort((a, b) => far(a) - far(b))
    const found = others.find((seat) => this.routeLeap(cat.seat, seat, toys))
    if (found === undefined) this.routeLeap(cat.seat, goal, toys)
    return found ?? null
  }

  /** Writes the cat's seat into the save, if it is another than the one written there. */
  private keepSeat(seat: number): void {
    if (this.state.cat === seat) return
    this.state.cat = seat
    this.dirty = true
  }

  /** Whether the cat would be sat on with those toys standing, and have no way round to any seat. */
  private cornered(toys: readonly Toy[]): boolean {
    const cat = this.cat
    return cat.leap < 0 && cat.seat !== RIM_SEAT && !seatFree(cat.seat, toys) && this.wayTo(catSeat(toys, cat.turn, cat.seat), toys) === null
  }

  /**
   * Where a toy let go over a point of the turntable comes to stand. A toy set down on the cat lands and the cat
   * moves; but a cat with no way out (every seat taken and toys all round) is as a toy: the new one lands beside it.
   */
  private settled(kind: Kind, x: number, z: number): Spot {
    const standing = this.standingToys(), spot = settle(kind, x, z, standing), cat = this.cat
    if (spot.where !== 'land') return spot
    if (!this.cornered(standing.map((toy) => (toy.kind === kind ? { kind, where: 'land' as const, x: spot.x, z: spot.z } : toy)))) return spot
    // The ground the cat sits on is taken, as by a toy at least as wide as the cat.
    return settle(kind, x, z, [...standing, { kind: kind === 'sheep' ? 'house' : 'sheep', where: 'land', x: SEATS[cat.seat].x, z: SEATS[cat.seat].z }])
  }

  /**
   * Plans the cat's leap from the seat it had to the seat it has: round whatever stands between the two, never
   * over it, and no higher than the lid of the frame. With the gull in the smoke the house is wider by its wings.
   * Says whether there is a way round; when there is none the leap planned goes over, as high as the thing in its way.
   */
  private routeLeap(fromSeat: number, toSeat: number, toys: readonly Toy[]): boolean {
    const cat = this.cat, g = this.gull.doing, from = this.seatAt(fromSeat), to = this.seatAt(toSeat)
    const gullOver = this.acts.house.at.where === 'land' && this.houseStands() && g.place === 'smoke'
    const standing: Obstacle[] = []
    let house = -1
    // Each toy where it stands or, if it is in the air or in a finger, where it is about to stand: `toys` is what the seat was chosen from.
    for (const at of toys) {
      if (at.where !== 'land' && at.where !== 'sea') continue
      if (at.kind === 'house') house = standing.length
      standing.push({ x: at.x, z: at.z, r: FOOT[at.kind], top: TALL[at.kind] + 0.6 + (at.kind === 'boat' && toys.some((toy) => toy.where === 'boat') ? TALL.sheep : 0) })
    }
    // And each toy that still stands where the save no longer has it: the wave has not reached it yet.
    for (const kind of KINDS) {
      const at = this.acts[kind].at, planned = toys[KINDS.indexOf(kind)]
      if ((at.where !== 'land' && at.where !== 'sea') || this.acts[kind].flight || this.carry?.kind === kind) continue
      if (planned.where === at.where && planned.x === at.x && planned.z === at.z) continue
      standing.push({ x: at.x, z: at.z, r: FOOT[kind], top: TALL[kind] + 0.6 })
    }
    // A toy in a finger is in its way where it hangs, too, and not only where it would land.
    if (this.carry) {
      const hangs = this.worldOf(this.carry.kind), here = toIsland(hangs.x, hangs.z, this.state.turn)
      standing.push({ x: here.x, z: here.z, r: FOOT[this.carry.kind], top: hangs.y + TALL[this.carry.kind] + 0.6 })
    }
    // The gull paddling beside the house in the sea is in the way of a leap to the rim, as a toy is.
    if (g.place === 'paddle' && this.gull.spot) standing.push({ x: this.gull.spot.x, z: this.gull.spot.z, r: GULL_REACH, top: 2.2 })
    // A toy that is coming down where the cat sits is not in its way: the cat is leaving from under it.
    const inWay = standing.filter((o) => Math.hypot(o.x - from.x, o.z - from.z) >= CAT_FOOT + o.r + GAP)
    const wide = inWay.map((o) => (gullOver && o === standing[house] ? { ...o, r: o.r + GULL_WINGS } : o))
    // The straight way first, then a little to either side, then further.
    // Of two ways round it takes the one nearer the child, where the frame has more room above it.
    const front = toWorld(swung(from, to, 1, 0.5, this.spotAt).x, this.spotAt.z, this.state.turn).z >= toWorld(swung(from, to, -1, 0.5, this.spotAt).x, this.spotAt.z, this.state.turn).z ? 1 : -1
    let far = around(from, to, CAT_FOOT, wide, front), low = false
    if (far === undefined && gullOver) {
      // No way clear of the gull's wings: close by the house, and low, under them.
      far = around(from, to, CAT_FOOT, inWay, front)
      low = far !== undefined
    }
    cat.far = far ?? 0
    // As high as a cat leaps, and no higher than the lid of the frame over any point of its way.
    let arc = low ? LEAP_LOW : LEAP_ARC
    const y0 = this.seatY(fromSeat), y1 = this.seatY(toSeat)
    for (let i = 1; i < 16; i++) {
      // At that moment of the leap it is this far along its way (route.ts eases it along) and this tall:
      // stretched out at the top of its leap; landed on, its fur stands up; with the wave coming it puffs up as it lands.
      const t = i / 16, along = t * t * (3 - 2 * t), at = swung(from, to, cat.far, along, this.spotAt), world = toWorld(at.x, at.z, this.state.turn)
      const tall = CAT_TALL * (1 + 0.25 * Math.sin(t * Math.PI)) * (this.cat.doing.flooded ? 1 + 0.28 * t * t * t * t : seatFree(fromSeat, toys) ? 1 : 1.09)
      arc = Math.min(arc, (roofAt(world.x, world.z) - tall - (y0 + (y1 - y0) * along)) / (4 * t * (1 - t)))
    }
    cat.arc = Math.max(0.1, arc)
    cat.doing.reach = Math.max(0.2, Math.min(1, cat.arc / LEAP_ARC))
    cat.high = null
    if (far === undefined) {
      // No way round at all: over whatever stands in the straight way, as a toy flies.
      const high = cruise(from, to, CAT_FOOT, standing)
      cat.high = high === null ? null : high + LAND_Y
    }
    return far !== undefined
  }

  /** How high the cat sits on a seat: on the land, or on the rim, where each peg that comes by lifts it. */
  private seatY(seat: number): number {
    if (seat !== RIM_SEAT) return LAND_Y
    // The rim turns under the cat that sits on it: it rides up over the peg and down again.
    const at = this.seatAt(RIM_SEAT), pitch = WHOLE / PEGS, along = Math.atan2(at.z, at.x) / pitch - 0.5
    return RIM_TOP + PEG_UP * (1 - smooth(clamp01((Math.abs(along - Math.round(along)) * pitch - 0.11) / 0.09)))
  }

  /** Where the cat is: on the turntable, in its own units. */
  private catAt(): { x: number; y: number; z: number } {
    const cat = this.cat, to = this.seatAt(cat.seat)
    if (cat.leap < 0) return { x: to.x, y: this.seatY(cat.seat), z: to.z }
    const from = this.seatAt(cat.from)
    const at = fly(cat.leap, { x: from.x, y: this.seatY(cat.from), z: from.z }, { x: to.x, y: this.seatY(cat.seat), z: to.z }, cat.arc, cat.high, this.point)
    // A leap that goes round something swings out to one side: furthest at the middle of its way, nothing at either end.
    const dx = to.x - from.x, dz = to.z - from.z, way = dx * dx + dz * dz
    const round = swung(from, to, cat.far, way === 0 ? 0 : clamp01(((at.x - from.x) * dx + (at.z - from.z) * dz) / way), this.spotAt)
    return { x: round.x, y: at.y, z: round.z }
  }

  /** Where the gull dives: off the front of its buoy, into open water. */
  private diveSpot(): { x: number; z: number } {
    return { x: this.posts.buoy.x, z: this.posts.buoy.z + 2 }
  }

  /** How far the swell of the wash has lifted the buoy. */
  private buoyLift(): number {
    const surf = this.gull.doing.surf
    return surf < 0 ? 0 : ((1 - Math.cos(surf * Math.PI * 4)) / 2) * 0.9
  }

  /** Whether the spot beside the house where the gull paddles is no longer the one it would take: a toy came, or the island was turned. */
  private gullMoved(): boolean {
    const now = gullSpot(this.state.toys, this.state.turn, this.posts.wave), had = this.gull.spot
    return now === null || had === null || Math.hypot(now.x - had.x, now.z - had.z) > 0.05
  }

  /**
   * Plans the gull's flight from where it is to the place it has: how far to one side it swings, and how high it
   * is at each step of the way. It rises over each thing in its way and comes down behind it, and is never
   * higher than the lid of the frame over where it is; a thing too tall to pass over under the lid it flies
   * round. With no way that fits it takes the one least over the lid, and says by how much that is.
   */
  private routeFlight(from: { x: number; y: number; z: number } = this.gull.from, to: { x: number; y: number; z: number } = this.perch()): number {
    const gull = this.gull, all: Obstacle[] = [], buoy = this.posts.buoy
    gull.lift = this.buoyLift()
    // Each toy where it stands or, if it is in the air, where it is about to stand. The wave is not in its way: it flies ahead of it.
    for (const at of this.state.toys) {
      if (at.where !== 'land' && at.where !== 'sea') continue
      const aboard = at.kind === 'boat' && this.toy('sheep').where === 'boat' ? TALL.sheep * 0.6 : 0
      all.push({ ...toWorld(at.x, at.z, this.state.turn), r: FOOT[at.kind], top: (at.where === 'land' ? LAND_Y : 0) + TALL[at.kind] + aboard + 0.25 })
    }
    // What stands right at an end is not in the way: the house whose smoke it rides is under it there already, and
    // what it paddles beside is beside it. What stands near an end can ask for no more room on the way than it has
    // at that end, where the gull sits with its wings out.
    const loose: Obstacle[] = []
    for (const o of all) {
      const near = Math.min(Math.hypot(o.x - from.x, o.z - from.z), Math.hypot(o.x - to.x, o.z - to.z))
      if (near >= GULL_HALF + o.r) loose.push({ ...o, r: Math.min(o.r, near - GULL_FLIGHT_R - 0.03) })
    }
    // Any of them can be gone round, the tallest first.
    loose.sort((p, q) => q.top - p.top)
    // Of two ways round it takes the one nearer the child, where the frame has more room above it. (Its places are in the world.)
    const side = swung(from, to, 1, 0.5, this.spotAt).z >= swung(from, to, -1, 0.5, this.spotAt).z ? 1 : -1
    const at = this.spotAt, steps = FLIGHT_STEPS, need: number[] = [], line: number[] = [], cap: number[] = []
    /** Plans a flight that swings `far` to one side round the `n` tallest and goes over the rest, and says by how much it is over the lid at its worst: 0 when it stays under it all the way. */
    const plan = (n: number, far: number | undefined): number => {
      if (far === undefined) return Infinity
      const under = loose.slice(n)
      // A low arc of its own, as far as the lid allows over every step of the way.
      let arc = 0.5
      for (let i = 0; i <= steps; i++) {
        const u = i / steps
        swung(from, to, far, u, at)
        cap[i] = roofAt(at.x, at.z) - GULL_TALL - WING_UP
        if (i > 0 && i < steps) arc = Math.min(arc, (cap[i] - (from.y + (to.y - from.y) * u)) / (4 * u * (1 - u)))
      }
      arc = Math.max(0, arc)
      let over = 0
      for (let i = 0; i <= steps; i++) {
        const u = i / steps
        swung(from, to, far, u, at)
        line[i] = from.y + (to.y - from.y) * u + 4 * u * (1 - u) * arc
        need[i] = line[i]
        for (const o of under) if (Math.hypot(at.x - o.x, at.z - o.z) < GULL_FLIGHT_R + o.r + 0.02) need[i] = Math.max(need[i], o.top + OVER)
        // A thing in the way that it cannot pass over under the lid, or a way that runs too far back for the lid: this plan does not fit.
        if (i > 0 && i < steps) over = Math.max(over, need[i] - cap[i])
      }
      // It is up before it reaches a thing and comes down behind it: each height spreads to its neighbours and is eased, under the lid.
      const spread = need.map((_, i) => Math.max(...need.slice(Math.max(0, i - 3), i + 4)))
      for (let i = 0; i <= steps; i++) {
        let sum = 0, count = 0
        for (let k = Math.max(0, i - 2); k <= Math.min(steps, i + 2); k++) { sum += spread[k]; count += 1 }
        gull.heights[i] = i === 0 ? from.y : i === steps ? to.y : Math.max(need[i], Math.min(sum / count, cap[i]))
      }
      // Its buoy is not flown through either: it comes down onto the top from above and goes up off it, wherever the rest of the way runs.
      for (let i = 1; i < steps; i++) {
        swung(from, to, far, i / steps, at)
        gull.heights[i] = Math.max(gull.heights[i], overBuoy(Math.hypot(at.x - buoy.x, at.z - buoy.z), BUOY_TOP + gull.lift))
      }
      gull.far = far
      return over
    }
    // Over everything if the lid allows; else round the tallest, then the two tallest, and so on: for each, the nearest
    // way round on either side, then one on the child's side further out, then one on the far side. The first that
    // fits is taken (the lid is a hand's breadth inside the frame, and a finger of that is given away); with none
    // that fits, the one that is least over the lid.
    let best = { n: 0, far: 0 as number | undefined, over: plan(0, 0) }
    for (let n = 1; n <= loose.length && best.over > LID_GIVE; n++) {
      const round = loose.slice(0, n)
      for (const far of [around(from, to, GULL_FLIGHT_R, round, side), around(from, to, GULL_FLIGHT_R, round, side, true), around(from, to, GULL_FLIGHT_R, round, -side as 1 | -1, true)]) {
        const over = plan(n, far)
        if (over < best.over) best = { n, far, over }
        if (over <= LID_GIVE) break
      }
    }
    return plan(best.n, best.far)
  }

  /** Where the gull rests in the place it has: the top of its buoy, the smoke above the chimney, the water beside the house. */
  private perch(): { x: number; y: number; z: number } {
    const place = this.gull.doing.place
    if (place === 'smoke') {
      const chimney = this.chimney()
      return { x: chimney.x, y: chimney.y + RIDE, z: chimney.z }
    }
    if (place === 'paddle') {
      // Afloat, its legs under water; over the boat when the boat comes by, with the sheep's height to spare when it is aboard.
      const spot = this.paddleSpot()
      return { ...spot, y: -0.2 + this.gull.doing.dodge * Math.min(this.dodgeHigh() + 0.2, Math.max(0, lidAt(spot.z) - GULL_TALL + 0.2)) }
    }
    return { x: this.posts.buoy.x, y: BUOY_TOP + this.buoyLift(), z: this.posts.buoy.z }
  }

  /** Where the gull is, in the world: in its place, on its way to it, or diving. */
  private gullAt(): { x: number; y: number; z: number } {
    const gull = this.gull, g = gull.doing, to = this.perch()
    if (g.dive >= 0) {
      const d = g.dive, dive = this.diveSpot(), span = (a: number, b: number): number => clamp01((d - a) / (b - a))
      if (d < 0.3) {
        const u = span(0, 0.3), e = smooth(u)
        return { x: to.x + (dive.x - to.x) * e, y: to.y + 4 * u * (1 - u) * 1.2, z: to.z + (dive.z - to.z) * e }
      }
      if (d < 0.8) return { x: dive.x, y: d < 0.6 ? to.y + (-1.6 - to.y) * smooth(span(0.3, 0.45)) : -1.6 + 1.15 * smooth(span(0.6, 0.72)), z: dive.z }
      const u = span(0.8, 1), e = smooth(u)
      return { x: dive.x + (to.x - dive.x) * e, y: -0.45 + (to.y + 0.45) * e + 4 * u * (1 - u) * 0.8, z: dive.z + (to.z - dive.z) * e }
    }
    if (g.flying < 0) return to
    // Eased along its way, at the height planned for each step of it.
    const along = smooth(clamp01(g.flying)), step = along * FLIGHT_STEPS, i = Math.min(FLIGHT_STEPS - 1, Math.floor(step))
    const round = swung(gull.from, to, gull.far, along, this.spotAt)
    const y = gull.heights[i] + (gull.heights[i + 1] - gull.heights[i]) * (step - i)
    // An island turned under it carries its place away from the way it planned: it still keeps under the lid.
    const kept = this.state.turn === gull.turn ? y : Math.min(y, Math.max(to.y, roofAt(round.x, round.z) - GULL_TALL - WING_UP + gull.over))
    // Near its buoy it goes up and down with it: the swell that has lifted or dropped the buoy since the flight was planned lifts or drops the gull as much.
    return { x: round.x, y: kept + (this.buoyLift() - gull.lift) * riding(Math.hypot(round.x - this.posts.buoy.x, round.z - this.posts.buoy.z)), z: round.z }
  }

  /** Which way the gull is turned, in the world. On its buoy it is turned a little toward the island. */
  private gullYaw(): number {
    const g = this.gull.doing
    return g.place === 'buoy' && g.flying < 0 ? Math.atan2(-this.posts.buoy.x, 14) * 0.6 : 0
  }

  /** What the residents look at: the toy that is in the finger, in the hand or in the air, else the lamp's light, else the tray. */
  private watched(): { x: number; y: number; z: number } {
    const kind = this.carry?.kind ?? this.hand ?? KINDS.find((k) => this.acts[k].flight && this.acts[k].flight!.wait <= 0)
    if (kind) {
      const at = this.worldOf(kind)
      return { x: at.x, y: at.y + TALL[kind] * 0.5, z: at.z }
    }
    const light = this.lightSpot()
    if (light) return { x: light.x, y: 0.3, z: light.z }
    // Nothing moves: the cat looks at the tray, where the toys wait.
    return { x: 0, y: 0.5, z: TRAY_Z }
  }

  // --- For the view ------------------------------------------------------------------

  show(): Frame {
    const frame = this.frame, turn = this.state.turn
    wavePose(this.time, this.washing, this.posts.wave, this.wave)
    frame.turn = turn
    frame.dip = this.dip.x
    frame.tiltX = this.tiltX.x
    frame.tiltZ = this.tiltZ.x
    frame.breeze = this.breeze
    frame.sun = this.sun
    frame.smear = this.spun
    frame.spot = null
    for (const shown of frame.toys) {
      const kind = shown.kind, act = this.acts[kind], pose = shown.pose
      const carried = this.carry?.kind === kind, flying = act.flight !== null && act.flight.wait <= 0, riding = act.at.where === 'crest' && !act.flight
      const place = this.placeOf(kind), aboard = act.at.where === 'boat' && !carried && !flying
      shown.crown = act.leaf.x
      if (!aboard && (carried || flying || riding || this.hand === kind || !place)) {
        const at = this.worldOf(kind)
        shown.on = 'world'
        shown.x = at.x; shown.y = at.y + act.hop.x; shown.z = at.z
        shown.scale = at.scale * SIZE[kind]
        shown.yaw = 0
        shown.shadow = 0
        if (carried || this.hand === kind) handPoseOf(kind, act.held, act.whipped, pose)
        else if (riding) ridePose(kind, act.rode, this.wave.yaw - Math.PI / 2, TALL[kind] / SIZE[kind], pose)
        else {
          clear(pose)
          const flight = act.flight
          if (flight && flight.to.where === 'crest') {
            // On its way onto the wave it is already turning into the way it will ride.
            ridePose(kind, flight.t * 0.3, this.wave.yaw - Math.PI / 2, TALL[kind] / SIZE[kind], pose)
          } else if (flight && flight.washed) {
            // Stood in its slot the right way up: it turns over as it comes down.
            ridePose(kind, 1, this.wave.yaw - Math.PI / 2, TALL[kind] / SIZE[kind], pose)
            const left = 1 - smooth(clamp01(flight.t / 0.8))
            pose.roll *= left; pose.pitch *= left; pose.y *= left
            pose.yaw = kind === 'tree' ? pose.yaw : pose.yaw * left
            pose.glow = 0
          } else if (flying) {
            // In the air it tumbles a little toward where it is going.
            pose.roll = Math.sin(flight!.t * Math.PI) * 0.25
          }
        }
        if (carried) {
          const spot = this.prospect(kind, this.carry!.x, this.carry!.z)
          if (spot) {
            const at2 = this.landing(kind, spot)
            frame.spot = { x: at2.x, y: at2.y, z: at2.z, r: FOOT[kind], home: false }
          } else {
            // Let go here it would go home: the ring lies on its slot in the tray.
            const slot = slotOf(kind)
            frame.spot = { x: slot.x, y: TRAY_TOP, z: slot.z, r: FOOT[kind] * TRAY_SCALE, home: true }
          }
          // A finger off the glass for a moment: the toy hangs and waits, bobbing.
          if (this.carry!.lifted) shown.y += Math.abs(Math.sin(this.time * 9)) * 0.06
        } else if (flying && act.flight!.to.where !== 'crest' && !act.flight!.washed) {
          const to = this.landing(kind, act.flight!.to)
          frame.spot = { x: to.x, y: to.y, z: to.z, r: FOOT[kind] * (0.5 + 0.5 * act.flight!.t), home: false }
        }
        continue
      }
      shown.scale = SIZE[kind]
      if (aboard) {
        // The sheep aboard goes where the boat goes, and does what the boat does: it is bounced by a boat that flaps.
        const boat = frame.toys[KINDS.indexOf('boat')], flapping = this.acts.boat.at.where === 'land' && boat.on === 'island'
        clear(pose)
        shown.on = boat.on
        // It stands on the deck behind the mast: across the boat, its face to the child, while the boat is on the land or in a hand; afloat it turns to look ahead, so that it is no wider than the boat's ring.
        const ahead = smooth(this.aboard), heading = boat.yaw + boat.pose.yaw, along = ABOARD.across + (ABOARD.ahead - ABOARD.across) * ahead, tilt = boat.pose.roll * (flapping ? 0.7 : 0.6)
        shown.x = boat.x + Math.cos(heading) * along
        shown.z = boat.z - Math.sin(heading) * along
        // The deck under it goes up and down as the hull see-saws.
        shown.y = boat.y + boat.pose.y * SIZE.boat + DECK + Math.sin(boat.pose.roll) * along + act.hop.x + (flapping ? Math.abs(Math.sin(this.acts.boat.age * 13)) * 0.45 * (1 - this.spun) : 0)
        shown.yaw = heading + (ahead * Math.PI) / 2
        // Looking ahead it stands square on the deck and tips with it.
        pose.roll = tilt * (1 - ahead)
        pose.pitch = -boat.pose.roll * ahead
        // Looking ahead it throws its head back, nose up, like the horn it is; bounced on the land it holds its head high.
        pose.part.pitch = flapping ? -0.4 : -0.8 * ahead
        // Tapped there, it answers as it does anywhere: straight up off the deck with stiff legs, its fleece puffed out to a ball.
        tappedSheep(act.poked, pose)
        shown.shadow = 0
        // With the sheep aboard the sail is taken in: a pennant at the mast, set across the bow.
        boat.pose.part.s = 0.35
        boat.pose.part.yaw = Math.PI / 2
        continue
      }
      shown.on = 'island'
      const where = act.at.where === 'sea' ? 'sea' : 'land'
      toyPose(kind, where, act.age, act.poked, WEIGHT[kind], kind === 'sheep' ? this.grazing() : 'graze', pose, act.puffed)
      spunPose(kind, where, this.spun, this.time, pose)
      shown.x = place!.x; shown.z = place!.z
      shown.y = place!.y + act.hop.x
      // Every toy faces the front of the island, so all of them turn their faces away together when it is spun.
      shown.yaw = 0
      // The boat afloat points along its ring; on the land it keeps its heading like a needle while the island turns.
      if (kind === 'boat') shown.yaw = where === 'sea' ? Math.atan2(place!.x, place!.z) : act.needle
      // The sheep faces the tree it eats, and swims nose first along its ring.
      if (kind === 'sheep' && where === 'land' && this.acts.tree.at.where === 'land') shown.yaw = Math.atan2(this.acts.tree.at.x - place!.x, this.acts.tree.at.z - place!.z)
      if (kind === 'sheep' && where === 'sea') shown.yaw = Math.atan2(place!.x, place!.z) + Math.PI / 2
      // The house afloat lies along the shore too, its door to the open sea.
      if (kind === 'house' && where === 'sea') shown.yaw = Math.atan2(place!.x, place!.z)
      // The tree afloat lies along the shore, so it is clear of the land and of the boat's ring.
      if (kind === 'tree' && where === 'sea') shown.yaw = Math.atan2(place!.x, place!.z) + Math.PI / 2
      if (kind === 'tree' && where === 'land') pose.part.yaw += act.lag.x
      if (kind === 'lighthouse') pose.part.yaw = act.beam - turn - shown.yaw
      if (kind === 'boat') {
        if (this.acts.sheep.at.where === 'boat' && where === 'sea') {
          // With the sheep aboard it lies low and tilted, and lifts its bow no further than keeps its stern deck dry.
          pose.y -= 0.06
          pose.roll = Math.min(pose.roll + 0.12, 0.26)
        }
        // A toy set down on it: it ducks under, and comes up again a little further on.
        if (act.ducked < 0.6) pose.y -= bump(act.ducked, 0, 0.6) * 0.9
        // Patted by the cat, it flaps a step away from it and back.
        if (act.nudged < 0.5 && where === 'land') {
          const cat = this.catAt(), away = Math.atan2(place!.x - cat.x, place!.z - cat.z), by = bump(act.nudged, 0, 0.5) * 0.07
          shown.x += Math.sin(away) * by
          shown.z += Math.cos(away) * by
        }
      }
      // Spun, a toy leans out from the middle.
      const lean = Math.min(0.3, this.turned * this.turned * 0.012) * Math.min(1, Math.hypot(place!.x, place!.z) / 1.5)
      if (!(kind === 'tree' && where === 'sea') && kind !== 'boat') pose.pitch += lean
      shown.shadow = where === 'land' ? 1 : 0
    }
    // The house's door pops open and shut when it lands, and door and shutters bang on a spun island.
    const house = this.acts.house
    frame.flap = house.at.where === 'land' && !house.flight ? Math.max(bump(house.age, 0.12, 0.42), this.spun * Math.abs(Math.sin(this.time * 14))) : 0
    // The lamp's light on the ground, where it falls on the turntable.
    const light = this.lightSpot()
    frame.light = null
    if (light) {
      const at = toIsland(light.x, light.z, turn), r = Math.hypot(at.x, at.z)
      if (r <= RIM_IN - LIGHT_R - 0.1) frame.light = { x: at.x, y: r <= LAND_R - 0.2 ? LAND_Y + 0.035 : 0.05, z: at.z, r: LIGHT_R, level: frame.toys[0].pose.glow }
    }
    frame.mown = this.mown.level > 0.02 ? { x: this.mown.x, z: this.mown.z, r: FOOT.sheep + 0.25, level: this.mown.level } : null
    // The residents.
    const cat = this.catAt()
    catPose(this.time, this.cat.doing, this.cat.pose)
    frame.cat.x = cat.x; frame.cat.y = cat.y; frame.cat.z = cat.z
    // It sits facing the child whichever way the island is turned, and turns to what it is after.
    frame.cat.yaw = -turn + this.cat.face
    frame.cat.lookX = this.cat.lookX; frame.cat.lookY = this.cat.lookY
    frame.cat.leanX = this.cat.doing.pulled > 0 ? this.cat.leanX * this.cat.doing.pulled : 0
    const gull = this.gullAt()
    gullPose(this.time, this.gull.doing, this.gull.pose)
    frame.gull.x = gull.x; frame.gull.y = gull.y; frame.gull.z = gull.z
    frame.gull.yaw = this.gullYaw()
    frame.gull.lookX = this.gull.lookX; frame.gull.lookY = this.gull.lookY
    frame.gull.head = this.gull.head + this.gull.wind
    frame.buoy = this.buoy.x
    frame.buoyLift = this.buoyLift()
    whalePose(this.time, this.whale.poked, this.whale.pose)
    return frame
  }

  /** How long the toy in the hand has hung there, in seconds; 0 with no toy in it. */
  get handFor(): number {
    return this.hand ? this.acts[this.hand].held : 0
  }

  /** For the idle guidance: the toys still in the tray, and whether one hangs in the hand. */
  get waiting(): Kind[] {
    return KINDS.filter((kind) => this.toy(kind).where === 'tray' && this.acts[kind].at.where === 'tray' && !this.acts[kind].flight)
  }

  /** How fast the island is turning, in radians a second. */
  get turning(): number {
    return this.turned
  }

  /** Whether anything is still on its way: the save is written again when all is at rest, and the idle guidance waits. */
  get moving(): boolean {
    return this.spin !== 0 || this.grip !== null || this.washing.rearing >= 0 || this.washing.sinking >= 0 || this.washingNow || KINDS.some((kind) => this.acts[kind].flight !== null)
  }
}

/** Turns a resident's eyes toward a point of the world: -1 to 1 across and up, eased so the eyes never jump. */
function aimEyes(who: { lookX: number; lookY: number }, x: number, y: number, z: number, at: { x: number; y: number; z: number }, dt: number): void {
  const dx = at.x - x, dy = at.y - y, dz = at.z - z, far = Math.max(0.5, Math.hypot(dx, dy, dz)), ease = Math.min(1, dt * 10)
  // Seen from the front: across is the world's x, and up is its height, with nearness to the child read as down.
  who.lookX += (Math.max(-1, Math.min(1, (dx / far) * 1.4)) - who.lookX) * ease
  who.lookY += (Math.max(-1, Math.min(1, ((dy - dz * 0.5) / far) * 1.4)) - who.lookY) * ease
}
