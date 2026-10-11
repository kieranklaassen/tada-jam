import { FULL_STRETCH, SEAL_HOLDS, STEP, TANK, TOP_SPEED, clampPouch, launch, step as flightStep, stretchOf, type Body, type End, type Fish, type Happening, type Page } from './flight'
import type { Guidance } from './guidance'
import { handPose, type HandPose } from './guidance'
import { Spring, chickIdle, farSealIdle, nearSealIdle, pilotIdle, puffinIdle, skyIdle, walrusIdle, whaleIdle } from './motion'
import { makeRng, type Rng } from './rng'
import { MOST_PARTS, deserialize, type Save } from './save'
import { Scene, type Beat } from './scene'
import type { Sound, SoundName } from './voices'
import { BERG, CATAPULT, CHICK, DRIFT, ICE_Y, OFF_PAGE, PARTS, PENGUIN, SEALS, SEAL_NOSES, SEA_Y, SHELF_EDGE, SLOTS, SPOUT, WALRUS, WHALE_EYE, WHALE_TAIL, friendAt, offPage, partAt, thingAt, type Floor, type Friend, type Part, type Thing } from './world'

// The game: bolt parts from the kit onto the penguin, pull it back in the
// catapult, and let go. This module is the whole of what happens, with no
// drawing and no sound in it: it takes touches in stage units, advances on
// game time, and hands back a frame for the view (view.ts) and the sounds
// each moment asks for (voices.ts). A sound is asked for in the step that
// shows its cause, so a frame and its sounds always belong together.
// What is saved is in `save`; everything else here is a view of it and of
// the visit, and a toy made again from the same save is the game as it is
// found after being put away.

/** How long the bands take to throw the penguin from where it was let go to the fork. */
export const SNAP = 0.08
/** A pull shorter than this, in stage units, was never a pull: a tap pokes the penguin. */
const POKE_SLOP = 4
/** One creak for each of these stage units of stretch. */
const CREAK_EVERY = 9
/** The ghost hand's pull: a short way back and down from rest. */
const GHOST_PULL = { x: -92, y: 64 } as const
/** A line on the paper keeps at most this many points: a flight that would lay more is drawn with every other one, and goes on. */
export const LINE_POINTS = 420
/** The line takes a point each this many steps of the model, until it is thinned. */
const LINE_EVERY = 3
/** The way back. */
const TOBOGGAN_SPEED = 700
const BUBBLE_SPEED = 520
/** Where the way back ends, under the pouch, and how far behind the things on the ice it runs. */
const HOME_X: number = CATAPULT.rest.x
export const BACK_LANE = 18
/** How high the penguin's middle is when it stands. */
const STAND = PENGUIN.height / 2
/** How long the whale's eye is about a press on it: it rolls right round, and then rests on the penguin. */
export const WHALE_ROLLS = 1.4
/** The near seal's clap: two beats in this long, the flippers meeting a quarter and three quarters of the way through. */
export const CLAP = 0.7
/**
 * A friend takes the fish off the rod: when after the landing, and for how long, in seconds; and of that time,
 * the share by which its hand has reached the fish and the share by which it has carried it home.
 */
export const TAKE = { at: 0.9, lasts: 0.8, reach: 0.45, home: 0.9 } as const
/** The chick's hop onto the penguin and its hop back to its doorway, in seconds, and how long it rides with no fish. */
export const HOP_ON = 0.32
export const HOP_OFF = 0.3
const RIDES = 1.4
/** Going sideways faster than this, the penguin faces the way it goes. */
const FACES = 20
/** Where the water is open between the far seal and the whale. */
const OPEN_WATER = 965
/** How long a part takes from the kit to the penguin, and back. */
export const BOLTING = 0.36
const DROPPING = 0.3
/** How long a friend settles to its fish before the penguin leaves it to it. */
const SETTLES = 1.9
/** The rocket's flame as it is drawn: the small pilot flame that sputters while no finger is held, and the flare of a rocket revved in the pouch. A burning rocket is 1. */
export const PILOT_FLAME = 0.3
export const REV_FLAME = 0.75
/** A finger must rest this long before a rocket in the pouch flares: a tap on a seal does not rev it. */
const REV_AFTER = 0.14
/** Where the ghost hand rests to show a hold: on bare paper beside the catapult. */
/** The hold shown on a flight's line: how far along the line, and how many points a line must have to carry it. */
export const HOLD_ON_LINE = { along: 0.22, least: 8 } as const
export const GHOST_HOLD = { x: CATAPULT.rest.x + 150, y: CATAPULT.rest.y - 40 } as const
/** How long a seal's nosing of the balloon shows. */
const NOSING = 0.45
/** How long a friend takes to swallow the last of its fish. */
const GULP = 0.35

export type Pose = 'seat' | 'fly' | 'beak' | 'belly' | 'buried' | 'hung' | 'bowl' | 'bob' | 'perch' | 'stand' | 'toboggan' | 'hop' | 'walk' | 'under' | 'gone'

export type Crumb = { kind: 'snow' | 'drop' | 'dot' | 'smudge' | 'bubble' | 'mist' | 'steam' | 'soot'; x: number; y: number; vx: number; vy: number; age: number; life: number; size: number }

/** How the umbrella is: not bolted on, shut, open, or turned inside out. */
export type Brolly = 'none' | 'shut' | 'open' | 'flipped'

/** A fish at a friend's: being taken off the rod, answered as the friend answers that fish, eaten slowly, or swallowed. */
export type Meal = { fish: Fish; act: 'take' | 'react' | 'eat' | 'gulp'; p: number }

/** What the view draws. The same object is filled again each frame. */
export type Frame = {
  t: number
  /** What every creature is looking at. */
  focus: { x: number; y: number }
  pouch: { x: number; y: number }
  /** 0 to 1: how far the bands are stretched. */
  stretch: number
  /** 0 to 1: the bands tremble when pulled past their reach. */
  tremble: number
  /** The fork's lean and the sledge's tilt, in radians. */
  fork: number
  sledge: number
  pilot: {
    x: number
    y: number
    /** The rotation of the upright drawing, in radians, and which way it faces. */
    rot: number
    face: 1 | -1
    /** Squash: 1 is at rest, less is flatter. */
    squash: number
    pose: Pose
    /** Sliding along the ice on its belly, still in its flight. */
    skid: boolean
    /** Behind the things that stand on the ice. */
    behind: boolean
    /** 0 to 1 each: eyes wide, feet waggling, flippers spread, shivering. */
    wide: number
    waggle: number
    flap: number
    shiver: number
    feet: number
    blink: number
    misted: boolean
    /** A beak that is open is making a sound. */
    beak: number
    /** What is bolted on and has arrived: each part, and how it is now. */
    rocket: boolean
    /**
     * 0 to 1: the flame. A rocket that is bolted on always shows it wants a finger: a small pilot flame sputters
     * while none is held, in the pouch and in the air, and leans towards where the last touch was; a held finger
     * makes it the whole flame, and a lift cuts it back in the same frame. No flame at all once the tank is
     * empty, in the whale's water, or after the landing.
     */
    flame: number
    /** Where the last touch was, which the pilot flame leans to. */
    flameTo: { x: number; y: number }
    wings: boolean
    /** The wings are soaked and droop, or take more than they hold and flutter. */
    soaked: boolean
    flutter: number
    umbrella: Brolly
    balloon: boolean
    dewy: boolean
    springs: boolean
    /** How far the coils are pressed, in twentieths of their length: 0 at rest, less than 0 when they are stretched. */
    coil: number
    /** The coils dangle loose in the cloud. */
    jangle: number
    rod: boolean
    /** The fish on the rod, or null when the rod is bare. */
    fish: Fish | null
    /** How far the fish has swung on its line, in radians. */
    swing: number
    sooty: boolean
    /** A curl of pencil shaving on its head, from off the paper. */
    shaving: boolean
    /** 0 to 1: the scarf streams out in the walrus's sigh. */
    blown: number
    /** The seal's nose the open umbrella stands on, while a seal balances it there with the penguin sat in it. */
    nose: { x: number; y: number } | null
    /** A seal has just nosed the balloon: where its nose is, and 1 to 0 as the moment passes. */
    nosed: { x: number; y: number; p: number } | null
  }
  /** The pencil line of this flight and of the one before, as x and y in turn. */
  line: number[]
  older: number[]
  /** What this flight has scratched into the ice: the rocket's furrow and the two lines of the wingtips, as x and y in turn, with a NaN between runs. */
  furrow: number[]
  tips: number[]
  /** Where the pouch was last let go. */
  ring: { x: number; y: number; /** 0 to 1: how far the bands were stretched there. */ stretch: number } | null
  /** The kit: its lid's rattle, and which parts are out of their places. */
  kit: { lid: number; out: Record<Part, boolean> }
  /** Parts on their way between the kit and the penguin: 0 at the kit, 1 at the penguin. */
  moving: { part: Part; along: number }[]
  nearSeal: { squash: number; breath: number; ball: number; nose: number; blink: number; clap: number; bark: number; singed: number; chew: number; hold: number; flat: number; /** 0 to 1: its nose goes up at a balloon. */ nosing: number }
  farSeal: { squash: number; breath: number; bubble: number; flipper: number; snort: number; singed: number; chew: number; hold: number; flat: number; awake: number }
  chick: { bob: number; tilt: number; hop: number; blink: number; peep: number; /** Riding the penguin: on its head, or on its feet when it stands on its beak. */ ride: 'head' | 'feet' | null; /** 0 to 1: how far it has hopped from its doorway onto the penguin; it hops back the same way. */ onto: number; /** 0 to 1: the plate turned over. */ plate: number }
  walrus: { twitch: number; brow: number; blink: number; breath: number; sigh: number }
  puffin: { glass: number; lean: number; duck: number; blink: number; /** 0 to 1: the glass held up to the penguin. */ close: number }
  whale: { blow: number; puff: number; wide: number; drift: number; blink: number; /** The tail's turn about its root, in radians. */ tail: number; /** A press on its back: where, and 1 to 0 as the shiver dies away. */ tickle: number; tickleX: number; tickleY: number; /** A press on its eye: 1 to 0 as the eye rolls right round and then rests on the penguin. */ roll: number }
  cloud: { drift: number; part: number; partX: number; partY: number }
  /** The holes this flight's rocket has punched in the cloud, as x and y in turn. */
  holes: number[]
  /** The gull, while a fish is in the cloud, and a moment after. */
  gull: { x: number; y: number; face: 1 | -1; cry: number } | null
  /** Each friend's fish, if it has one. */
  meal: Record<Friend, Meal | null>
  /** 0 to 1: how far the drift has slumped. */
  slump: number
  lights: number
  igloo: number
  berg: number
  balloon: number
  crumbs: Crumb[]
  /** The idle ladder: the glow on the penguin, and the ghost hand. */
  glow: number
  hand: { x: number; y: number; press: number; opacity: number } | null
}

type Phase = 'loaded' | 'pull' | 'snap' | 'fly' | 'scene'

/** A part on its way: to the penguin, or back to the kit. It sets out at `at`. */
type Mover = { part: Part; toPilot: boolean; at: number; lasts: number }

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const mix = (a: number, b: number, t: number): number => a + (b - a) * t

/** How each friend answers each fish: how long the answer lasts, and its sounds on the game clock, as seconds into it. */
const ANSWERS: Record<Friend, Record<Fish, { lasts: number; cues: readonly (readonly [number, SoundName, number])[] }>> = {
  chick: {
    // Swallowed whole.
    fresh: { lasts: 1.1, cues: [[0.2, 'gulp', 0.5], [0.8, 'peep', 0.8]] },
    // It slips out of its flippers three times.
    // Each slip is heard as the fish leaves the plate: at the start of each third of the answer (mealAt in view.ts).
    wet: { lasts: 1.8, cues: [[0, 'slip', 0.2], [0.6, 'slip', 0.5], [1.2, 'slip', 0.9], [1.7, 'peep', 0.3]] },
    // It licks it and its tongue sticks.
    frozen: { lasts: 1.5, cues: [[0.3, 'lick', 0.5], [0.8, 'stuck', 0.5]] },
  },
  walrus: {
    // With great manners and no feeling.
    fresh: { lasts: 1.6, cues: [[0.4, 'dab', 0.5], [1, 'mm', 0.5]] },
    // Wrung out like a cloth, with a look of pain.
    wet: { lasts: 1.9, cues: [[0.3, 'wring', 0.5], [1.1, 'groan', 0.5]] },
    // Crunched like an ice lolly, slowly, with its eyes shut.
    frozen: { lasts: 2.1, cues: [[0.4, 'munch', 0.2], [1, 'munch', 0.6], [1.6, 'munch', 1]] },
  },
  puffin: {
    // Laid crosswise in its beak and kept for later.
    fresh: { lasts: 1.1, cues: [[0.3, 'clack', 0.5]] },
    // Slurped down like a noodle.
    wet: { lasts: 1.3, cues: [[0.3, 'slurp', 0.5]] },
    // Rapped on the rim, found hard, and used as a hammer.
    // Each rap and each hammer blow is heard as the fish comes down on the rim: at the end of each quarter of the answer (mealAt in view.ts).
    frozen: { lasts: 2, cues: [[0.5, 'rap', 0.5], [1, 'rap', 0.5], [1.5, 'hammer', 0.2], [2, 'hammer', 0.8]] },
  },
}

export class Toy {
  readonly save: Save
  phase: Phase = 'loaded'
  /** Game seconds played. */
  t = 0
  /** The flight, while there is one, and the last one's body after it. */
  body: Body | null = null
  private readonly rng: Rng
  private sounds: Sound[] = []
  private saveNow = false

  // The catapult.
  private readonly pouchX = new Spring(CATAPULT.rest.x, 260, 9)
  private readonly pouchY = new Spring(CATAPULT.rest.y, 260, 9)
  private grabX = 0
  private grabY = 0
  private wantX: number = CATAPULT.rest.x
  private wantY: number = CATAPULT.rest.y
  private pulled = false
  private tremble = 0
  private creaks = 0
  private readonly fork = new Spring(0, 150, 7)
  private readonly sledge = new Spring(0, 220, 11)
  private sledgeUp = false
  private let = { x: 0, y: 0 }
  private snapAt = 0

  // The pilot.
  private readonly squash = new Spring(1, 320, 13)
  private pose: Pose = 'seat'
  private px = 0
  private py = 0
  private rot = 0
  private face: 1 | -1 = 1
  private behind = false
  private waggle = 0
  private shiver = 0
  private beak = 0
  private wide = 0
  private misted = false
  private steps = 0
  private blown = 0

  // The kit, and how the parts on the penguin are in this visit.
  private movers: Mover[] = []
  private readonly lid = new Spring(0, 380, 9)
  /**
   * The fish on the rod, as it is in the air. A seal's or a friend's fish leaves the rod bare until the penguin is
   * back in the pouch. What is saved is `save.rod`: the fish as the last flight left it, saved when that flight
   * came down.
   */
  private fish: Fish
  private rodBare = false
  private brolly: 'shut' | 'open' | 'flipped' = 'shut'
  private soaked = false
  private dewy = false
  private sooty = false
  private shaving = false
  private squirted = false
  private flame = 0
  private flutter = 0
  private readonly coil = new Spring(0, 420, 9)
  private readonly swing = new Spring(0, 60, 3)
  private jangle = 0
  /** A seal nosing the balloon: how much of the moment is left, and which seal. */
  private nosed = 0
  private nosedBy = 0

  // The paper.
  private line: number[] = []
  private older: number[] = []
  private furrow: number[] = []
  private tips: number[] = []
  private scratching = false
  private sinceMark = 0
  private sinceLine = 0
  private lineEvery = LINE_EVERY
  private holes: number[] = []
  private gull: { x: number; y: number; face: 1 | -1; left: number } | null = null

  // The creatures and the things, each with its own spring or its own short time.
  private readonly nearSeal = new Spring(0, 120, 5.5)
  private clap = 0
  private bark = 0
  private readonly farSeal = new Spring(0, 80, 9)
  private snort = 0
  private awake = 0
  private singed = [0, 0]
  private chew = [0, 0]
  private flat = [0, 0]
  private readonly chick = new Spring(0, 300, 10)
  private peep = 0
  private ride: 'head' | 'feet' | null = null
  private onto = 0
  private hush = false
  /** The last flight had a rocket on and no finger was held in it: the ghost hand shows the hold on its line. */
  private unlit = false
  /** The ghost hand is showing its hold on that flight's line now. */
  private onLine = false
  /** The hold has been shown on a line in this visit, and is not shown on one again. */
  private told = false
  private lit = false
  private plate = 0
  private sigh = 0
  private brow = 0
  private readonly puffin = new Spring(0, 200, 14)
  private close = 0
  private readonly blow = new Spring(0, 400, 26)
  private whaleWide = 0
  private whaleRoll = 0
  private whalePuff = 0
  private readonly tail = new Spring(0, 70, 4)
  private tickle = 0
  private tickleAt = { x: 0, y: 0 }
  /** Where the paper ends on this surface (world.ts): the stage's own edges until the Mount says what it shows. */
  private page: Page = { left: OFF_PAGE.left, right: OFF_PAGE.right }
  private readonly cloudPart = new Spring(0, 30, 6)
  private partX = 560
  private partY = 220
  private readonly igloo = new Spring(0, 500, 12)
  private readonly slump = new Spring(0, 14, 3)
  private bergRing = 0
  private readonly balloon = new Spring(0, 55, 2.6)
  private crumbs: Crumb[] = []
  private dots: { x: number; y: number; at: number }[] = []

  // A friend's fish, as it is shown; what is saved is `save.eating`.
  private mealAct: Meal['act'] | 'wait' = 'eat'
  private mealP = 0
  private gulping: { who: Friend; fish: Fish; at: number } | null = null

  private scene: Scene | null = null
  /** Sounds and small things that fall a moment after their cause, on the game clock. */
  private later: { at: number; play: () => void }[] = []
  private pulses: Partial<Record<SoundName, number>> = {}
  private pressed: { x: number; y: number } | null = null
  /** When the finger that is down landed, and where the last touch was: the pilot flame leans there. */
  private pressedAt = 0
  /** The finger that is down landed on neither the penguin nor the kit: held, it revs a rocket in the pouch. */
  private resting = false
  private readonly touched = { x: CATAPULT.rest.x + 200, y: CATAPULT.rest.y + 60 }
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly frame: Frame

  constructor(save: Save, seed: number) {
    this.save = save
    this.fish = save.rod
    this.rng = makeRng(seed)
    this.frame = {
      t: 0, focus: { x: 0, y: 0 }, pouch: { x: 0, y: 0 }, stretch: 0, tremble: 0, fork: 0, sledge: 0,
      pilot: {
        x: 0, y: 0, rot: 0, face: 1, squash: 1, pose: 'seat', skid: false, behind: false, wide: 0, waggle: 0, flap: 0, shiver: 0, feet: 0, blink: 0, misted: false, beak: 0,
        rocket: false, flame: 0, flameTo: { x: 0, y: 0 }, wings: false, soaked: false, flutter: 0, umbrella: 'none', balloon: false, dewy: false, springs: false, coil: 0, jangle: 0, rod: false, fish: null, swing: 0,
        sooty: false, shaving: false, blown: 0, nose: null, nosed: null,
      },
      line: this.line, older: this.older, furrow: this.furrow, tips: this.tips, ring: null,
      kit: { lid: 0, out: { rocket: false, wings: false, umbrella: false, balloon: false, springs: false, fish: false } },
      moving: [],
      nearSeal: { squash: 0, breath: 0, ball: 0, nose: 0, blink: 0, clap: 0, bark: 0, singed: 0, chew: 0, hold: 0, flat: 0, nosing: 0 },
      farSeal: { squash: 0, breath: 0, bubble: 0, flipper: 0, snort: 0, singed: 0, chew: 0, hold: 0, flat: 0, awake: 0 },
      chick: { bob: 0, tilt: 0, hop: 0, blink: 0, peep: 0, ride: null, onto: 0, plate: 0 },
      walrus: { twitch: 0, brow: 0, blink: 0, breath: 0, sigh: 0 },
      puffin: { glass: 0, lean: 0, duck: 0, blink: 0, close: 0 },
      whale: { blow: 0, puff: 0, wide: 0, drift: 0, blink: 0, tail: 0, tickle: 0, tickleX: 0, tickleY: 0, roll: 0 },
      cloud: { drift: 0, part: 0, partX: 0, partY: 0 },
      holes: this.holes, gull: null,
      meal: { chick: null, walrus: null, puffin: null },
      slump: 0, lights: 0, igloo: 0, berg: 0, balloon: 0, crumbs: this.crumbs, glow: 0, hand: null,
    }
  }

  /** The surface shows the paper from `x0` to `x1`, in stage units: a flight leaves the paper at the edge that is seen. */
  sees(x0: number, x1: number): void {
    this.page = offPage(x0, x1)
  }

  /** Whether a short scene is playing: the landing, a friend's answer and the way back. */
  get playing(): boolean {
    return this.scene !== null && this.scene.running
  }

  /** The sounds asked for since the last call, in order. The Mount plays them as one voice. */
  /** Whether a touch ended a scene since the last call: what was sounding is cut off, and the game is silent from that frame but for the touch's own answer. */
  takeHush(): boolean {
    const hush = this.hush
    this.hush = false
    return hush
  }

  takeSounds(): Sound[] {
    const sounds = this.sounds
    this.sounds = []
    return sounds
  }

  /** Whether something was saved-worthy since the last call: a part bolted, a release, a fish delivered or swallowed. Each is saved at once. */
  takeSave(): boolean {
    const now = this.saveNow
    this.saveNow = false
    return now
  }

  private say(name: SoundName, level = 0.5): void {
    this.sounds.push({ name, level })
  }

  /** Something that falls `after` seconds from now, on the game clock. */
  private soon(after: number, play: () => void): void {
    this.later.push({ at: this.t + after, play })
  }

  /** A sound that keeps coming while its cause lasts, once in each `every` seconds. */
  private pulse(name: SoundName, every: number, level: number): void {
    if ((this.pulses[name] ?? -Infinity) > this.t) return
    this.pulses[name] = this.t + every
    this.say(name, level)
  }

  private has(part: Part): boolean {
    return this.save.bolted.includes(part)
  }

  // --- Touch -----------------------------------------------------------------

  /** A finger landed at a point of the stage. Everything it sets off starts here, in this call. */
  press(x: number, y: number): void {
    // A touch ends the scene, which is silent from here, and is then an ordinary touch.
    if (this.playing) {
      this.scene!.finish()
      this.later.length = 0
      this.hush = true
    }
    this.pressed = { x, y }
    this.pressedAt = this.t
    this.resting = false
    this.touched.x = x
    this.touched.y = y
    if (this.phase === 'loaded' && Math.hypot(x - this.pouchX.value, y - this.pouchY.value) <= CATAPULT.grip) {
      this.phase = 'pull'
      this.pulled = false
      this.grabX = this.pouchX.value - x
      this.grabY = this.pouchY.value - y
      this.wantX = this.pouchX.value
      this.wantY = this.pouchY.value
      this.creaks = Math.floor(stretchOf({ x: this.wantX, y: this.wantY }) / CREAK_EVERY)
      this.squash.kick(-5.5)
      this.wide = 1
      this.say('grip')
      // A friend who was eating swallows the last of its fish.
      const eating = this.save.eating
      if (eating) {
        this.gulping = { who: eating.who, fish: eating.fish, at: this.t }
        this.save.eating = null
        this.saveNow = true
        this.say('gulp')
      }
      return
    }
    const part = partAt(x, y)
    if (part && this.phase === 'loaded') return this.bolt(part)
    this.resting = true
    this.poke(part ? 'crate' : thingAt(x, y), x, y)
  }

  /**
   * A second finger came down while the first is still at work. It moves nothing and takes nothing over; on
   * the penguin in its pouch it is a poke, so that a child with one finger resting for the rocket's flame and
   * another on the penguin gets an answer.
   */
  also(x: number, y: number): void {
    if (this.phase !== 'loaded' || Math.hypot(x - this.pouchX.value, y - this.pouchY.value) > CATAPULT.grip) return
    this.pokePilot()
  }

  /** The finger moved, with the penguin in hand or without. */
  drag(x: number, y: number): void {
    if (this.pressed) { this.pressed.x = x; this.pressed.y = y }
    this.touched.x = x
    this.touched.y = y
    if (this.phase !== 'pull') return
    const want = clampPouch({ x: x + this.grabX, y: y + this.grabY })
    if (Math.hypot(want.x - CATAPULT.rest.x, want.y - CATAPULT.rest.y) > POKE_SLOP) this.pulled = true
    this.wantX = want.x
    this.wantY = want.y
    // Past the bands' reach they only tremble.
    const over = Math.hypot(x + this.grabX - want.x, y + this.grabY - want.y)
    this.tremble = clamp01(over / 40)
    const stretch = stretchOf(want)
    const creaks = Math.floor(stretch / CREAK_EVERY)
    if (creaks !== this.creaks) {
      this.creaks = creaks
      this.say('creak', stretch / FULL_STRETCH)
    }
  }

  /** The finger let go. With the penguin pulled, this is the release. */
  release(): void {
    this.pressed = null
    if (this.phase !== 'pull') return
    if (!this.pulled) return this.tap()
    const at = { x: this.wantX, y: this.wantY }
    const level = stretchOf(at) / FULL_STRETCH
    this.phase = 'snap'
    this.snapAt = this.t
    this.let = at
    this.tremble = 0
    this.pouchX.set(at.x)
    this.pouchY.set(at.y)
    // The line of the flight before is rubbed pale, and the one before that is rubbed away, whatever it reached.
    this.older.length = 0
    for (const v of this.line) this.older.push(v)
    this.line.length = 0
    this.furrow.length = 0
    this.tips.length = 0
    this.holes.length = 0
    this.sinceMark = 0
    this.sinceLine = 0
    this.lineEvery = LINE_EVERY
    this.save.last = { x: Math.round(at.x - CATAPULT.rest.x), y: Math.round(at.y - CATAPULT.rest.y) }
    this.saveNow = true
    this.fork.kick(5 + 9 * level)
    this.sledgeUp = this.sledge.value > 0.004
    this.say('twang', level)
  }

  /** A press that ended where it began: on the penguin it is a poke. Other things answered when the finger landed. */
  tap(): void {
    this.pressed = null
    if (this.phase !== 'pull') return
    this.phase = 'loaded'
    this.tremble = 0
    this.pokePilot()
  }

  /** Poked in its pouch, the penguin bounces and squawks. */
  private pokePilot(): void {
    this.squash.kick(7)
    this.pouchY.kick(-150)
    this.beak = 0.25
    this.say('squawk', this.rng.next())
  }

  /** The touch was taken away and the child let nothing go: the pouch eases back and nothing is flung. */
  cancel(): void {
    this.pressed = null
    if (this.phase !== 'pull') return
    this.phase = 'loaded'
    this.tremble = 0
    this.say('ease')
  }

  /**
   * A press on a part's place in the kit. A part that is in the kit is bolted on, and a third bumps the first
   * back into the kit; a part that is on comes off. Either is saved at once.
   */
  private bolt(part: Part): void {
    const on = this.save.bolted
    if (on.includes(part)) {
      this.save.bolted = on.filter((other) => other !== part)
      this.movers = this.movers.filter((mover) => mover.part !== part)
      this.movers.push({ part, toPilot: false, at: this.t, lasts: DROPPING })
      this.say('unbolt')
    } else {
      this.movers = this.movers.filter((mover) => mover.part !== part)
      if (on.length >= MOST_PARTS) {
        // Never refused: it goes on, and the part bolted on first drops back when this one arrives.
        const first = on[0]
        this.save.bolted = [...on.slice(1), part]
        this.movers = this.movers.filter((mover) => mover.part !== first)
        this.movers.push({ part: first, toPilot: false, at: this.t + BOLTING, lasts: DROPPING })
      } else this.save.bolted = [...on, part]
      this.movers.push({ part, toPilot: true, at: this.t, lasts: BOLTING })
      // It leaves the kit fresh.
      if (part === 'fish') {
        this.fish = 'fresh'
        this.rodBare = false
      }
      this.say('pick')
    }
    // A rod that is off, or just on, has a fresh fish.
    this.save.rod = this.has('fish') ? this.fish : 'fresh'
    this.saveNow = true
  }

  private poke(thing: Thing, x: number, y: number): void {
    switch (thing) {
      case 'nearSeal':
        this.nearSeal.kick(7)
        this.bark = 0.3
        this.say('bark', this.rng.next())
        break
      case 'farSeal':
        this.farSeal.kick(4)
        this.snort = 0.7
        this.say('snort')
        break
      case 'chick':
        this.chick.kick(9)
        this.peep = 0.22
        this.say('peep', this.rng.next())
        break
      case 'igloo':
        this.igloo.kick(3)
        this.say('knock', 0.3)
        break
      case 'walrus':
        this.sigh = 0.9
        this.say('harrumph')
        break
      case 'berg':
        this.bergRing = 0.6
        this.say('tink', this.rng.next())
        break
      case 'puffin':
        this.puffin.kick(11)
        this.say('krr')
        break
      case 'balloon':
        this.balloon.kick(1.6)
        this.say('bomp', 0.2)
        break
      // The whale answers where it is pressed, each part of it as itself.
      case 'whaleEye':
        // Its eye goes wide, rolls right round, and comes to rest on the penguin.
        this.whaleWide = 0.9
        this.whaleRoll = WHALE_ROLLS
        this.say('moan')
        break
      case 'whale':
        // Its head lets a breath go at the blowhole.
        this.whalePuff = 0.6
        this.say('puff')
        break
      case 'whaleBack':
        // Its skin shivers where it is tickled.
        this.tickle = 0.6
        this.tickleAt = { x, y }
        this.say('rumble')
        break
      case 'whaleTail':
        // Its tail flicks, and stirs up bubbles.
        this.tail.kick(this.tail.value >= 0 ? 5 : -5)
        for (let i = 0; i < 3; i++) this.crumbs.push({ kind: 'bubble', x: WHALE_TAIL.x - 30 - 10 * i, y: WHALE_TAIL.y - 20 + 14 * i, vx: -6 * i, vy: -30 - 8 * i, age: 0, life: 0.8, size: 5 + i })
        this.say('swish')
        break
      case 'cloud':
        this.partX = x
        this.partY = y
        this.cloudPart.kick(4)
        this.say('breath')
        break
      case 'crate':
        this.lid.kick(9)
        this.say('rattle')
        break
      case 'drift':
        this.puffOf('snow', x, y - 6, 5, 70)
        this.say('pat', 0.4)
        break
      case 'paper':
        this.crumbs.push({ kind: 'dot', x, y, vx: 0, vy: 0, age: 0, life: 1.5, size: 3 })
        this.dots.push({ x, y, at: this.t + 0.9 })
        this.say('dot')
        break
      default:
        thing satisfies never
    }
  }

  // --- Time ------------------------------------------------------------------

  /** Advances the game by `dt` seconds of game time. `guidance` is what the idle ladder shows now. */
  step(dt: number, guidance: Guidance | null = null): void {
    this.t += dt
    // The hold is shown on the line once: the next time the hand comes after the unlit flight, and not the time after.
    const showing = this.phase === 'loaded' && this.ghostHolds(guidance) && this.holdsOnLine()
    if (this.onLine && !showing) { this.unlit = false; this.told = true }
    this.onLine = showing
    const ghost = this.ghostPull(guidance)

    if (this.phase === 'pull') {
      // In the hand the pouch keeps close to the finger.
      this.pouchX.value += (this.wantX - this.pouchX.value) * Math.min(1, dt * 30)
      this.pouchY.value += (this.wantY - this.pouchY.value) * Math.min(1, dt * 30)
      this.pouchX.speed = 0
      this.pouchY.speed = 0
    } else if (this.phase === 'snap') {
      const along = clamp01((this.t - this.snapAt) / SNAP)
      // The bands pull hardest at first: the pouch gathers speed all the way to the fork.
      const eased = along * along
      this.pouchX.value = mix(this.let.x, CATAPULT.fork.x, eased)
      this.pouchY.value = mix(this.let.y, CATAPULT.fork.y, eased)
      if (along >= 1) this.takeOff()
    } else {
      this.pouchX.step(CATAPULT.rest.x + ghost.x, dt)
      this.pouchY.step(CATAPULT.rest.y + ghost.y, dt)
    }

    const pouch = { x: this.pouchX.value, y: this.pouchY.value }
    const level = this.phase === 'pull' ? stretchOf(pouch) / FULL_STRETCH : 0
    // The fork bends towards the pouch and the sledge lifts its front runner, more the harder the pull.
    const side = clamp01(Math.abs(CATAPULT.fork.x - pouch.x) / 120) * Math.sign(pouch.x - CATAPULT.fork.x)
    this.fork.step(level * 0.13 * side, dt)
    const sledgeWas = this.sledge.value
    this.sledge.step(level * 0.05, dt)
    if (this.sledgeUp && sledgeWas > 0 && this.sledge.value <= 0) {
      // The runner comes down on the ice.
      this.sledgeUp = false
      this.say('knock', 0.6)
    }
    this.squash.step(this.phase === 'pull' ? 1 - 0.1 * level : 1, dt)

    // The parts on their way: each is bolted on, or lands in the kit, in the step it arrives.
    for (let i = this.movers.length - 1; i >= 0; i--) {
      const mover = this.movers[i]
      if (this.t < mover.at + mover.lasts) continue
      this.movers.splice(i, 1)
      if (mover.toPilot) {
        this.squash.kick(-3)
        this.say('bolt')
        // The rocket's pilot flame lights as it is bolted on.
        if (mover.part === 'rocket') this.say('putt')
      } else {
        this.lid.kick(7)
        this.say('clank')
      }
    }

    if (this.phase === 'fly' && this.body) this.fly(dt)
    // In the pouch, a finger held anywhere but on the penguin revs the rocket: it roars, and goes nowhere.
    if (this.revved()) this.pulse('roar', 0.2, 0.15)
    if (this.scene) {
      this.scene.update(this.t)
      if (!this.scene.running) this.scene = null
    }
    // What was set to fall a moment later falls now, in order.
    for (let i = 0; i < this.later.length;) {
      // A hair of slack, so that a cue falls in the frame whose time has reached it however the frames add up.
      if (this.later[i].at > this.t + 1e-9) { i++; continue }
      const [due] = this.later.splice(i, 1)
      due.play()
    }

    // The creatures and the things settle.
    this.nearSeal.step(0, dt)
    this.farSeal.step(0, dt)
    this.chick.step(0, dt)
    this.puffin.step(0, dt)
    this.lid.step(0, dt)
    this.igloo.step(0, dt)
    this.slump.step(0, dt)
    this.balloon.step(0, dt)
    this.cloudPart.step(0, dt)
    this.coil.step(0, dt)
    this.swing.step(0, dt)
    this.tail.step(0, dt)
    this.tickle = Math.max(0, this.tickle - dt)
    this.blow.step(this.body && this.body.inSpout && !this.body.ended ? 1 : 0, dt)
    const settle = (value: number): number => Math.max(0, value - dt)
    this.clap = settle(this.clap)
    this.bark = settle(this.bark)
    this.snort = settle(this.snort)
    this.awake = settle(this.awake)
    for (const which of [0, 1]) {
      this.chew[which] = settle(this.chew[which])
      this.flat[which] = settle(this.flat[which])
    }
    this.peep = settle(this.peep)
    this.sigh = settle(this.sigh)
    this.brow = settle(this.brow)
    this.blown = settle(this.blown)
    this.whaleWide = settle(this.whaleWide)
    this.whaleRoll = settle(this.whaleRoll)
    this.whalePuff = settle(this.whalePuff)
    this.bergRing = settle(this.bergRing)
    this.beak = settle(this.beak)
    this.flutter = settle(this.flutter)
    this.jangle = settle(this.jangle)
    this.nosed = settle(this.nosed)
    if (this.phase !== 'pull') this.wide = Math.max(0, this.wide - dt * 2)
    if (this.gull && this.gull.left > 0) {
      this.gull.left -= dt
      if (this.gull.left <= 0) this.gull = null
    }
    if (this.gulping && this.t - this.gulping.at >= GULP) this.gulping = null

    // A dot on bare paper is rubbed out a moment later.
    while (this.dots.length > 0 && this.dots[0].at <= this.t) {
      const dot = this.dots.shift()!
      this.crumbs.push({ kind: 'smudge', x: dot.x, y: dot.y, vx: 0, vy: 0, age: 0, life: 0.9, size: 13 })
      this.say('rub')
    }
    this.stepCrumbs(dt)
  }

  /** Whether a finger is revving the rocket in the pouch: held a moment, anywhere but on the penguin. */
  private revved(): boolean {
    return this.phase === 'loaded' && this.pressed !== null && this.resting && this.has('rocket') && this.alongOf('rocket') === null && this.t - this.pressedAt >= REV_AFTER
  }

  /**
   * Which move the ghost hand shows in this demonstration. With a rocket bolted on it shows a hold first, a
   * finger resting on bare paper while the flame flares, and the pull in turn with it; without one, the pull.
   */
  private ghostHolds(guidance: Guidance | null): boolean {
    return guidance !== null && guidance.demo !== null && (guidance.demoIndex % 2 === 0 || this.holdsOnLine()) && this.has('rocket') && this.alongOf('rocket') === null
  }

  /** After a flight with the rocket on in which no finger was held, the ghost hand's hold is shown in the air, on that flight's line, the next time the hand comes. */
  private holdsOnLine(): boolean {
    return this.unlit && this.line.length >= 2 * HOLD_ON_LINE.least
  }

  /** Where the ghost hand rests for its hold: on bare paper beside the catapult, or on the line of an unlit flight, a little way along it. */
  private holdAt(): { x: number; y: number } {
    if (!this.holdsOnLine()) return GHOST_HOLD
    const index = 2 * Math.max(1, Math.floor((this.line.length / 2) * HOLD_ON_LINE.along))
    return { x: this.line[index], y: this.line[index + 1] }
  }

  /** Where the ghost hand has pulled the pouch to: it shows the pull, eases back, and flings nothing. */
  private ghostPull(guidance: Guidance | null): { x: number; y: number } {
    if (!guidance || guidance.demo === null || this.phase !== 'loaded' || this.playing || this.ghostHolds(guidance)) return { x: 0, y: 0 }
    handPose(guidance.demo, true, this.hand)
    const held = this.hand.press * this.hand.travel
    return { x: GHOST_PULL.x * held, y: GHOST_PULL.y * held }
  }

  private takeOff(): void {
    this.phase = 'fly'
    this.lit = false
    // Whatever is on its way is on: the penguin leaves with everything that is bolted.
    this.movers.length = 0
    this.body = launch(this.let, { parts: this.save.bolted, fish: this.fish }, this.page)
    if (this.rodBare && this.body.fish) this.body.fish = 'eaten'
    this.face = this.body.vx >= 0 ? 1 : -1
    this.pose = 'fly'
    this.behind = false
    this.misted = false
    this.steps = 0
    this.waggle = 0
    this.shiver = 0
    this.beak = 0.3
    this.wide = 1
    this.brolly = 'shut'
    this.soaked = false
    this.dewy = false
    this.squirted = false
    this.scratching = false
    this.gull = null
    if (this.shaving) {
      // The shaving is left behind in the air.
      this.shaving = false
      this.crumbs.push({ kind: 'snow', x: this.body.x, y: this.body.y - STAND, vx: -40, vy: -60, age: 0, life: 1, size: 9 })
    }
    // The pouch flies on past the fork and swings back.
    this.pouchX.set(CATAPULT.fork.x)
    this.pouchY.set(CATAPULT.fork.y)
    const speed = Math.hypot(this.body.vx, this.body.vy)
    this.pouchX.kick(this.body.vx * 1.4)
    this.pouchY.kick(this.body.vy * 1.4)
    this.squash.kick(4 + (5 * speed) / TOP_SPEED)
    this.mark(this.body.x, this.body.y)
    this.say('honk', this.rng.next())
  }

  /** A point of the flight's line. A line that is full keeps every other point and takes them half as often, so it lasts the whole of the longest flight. */
  private mark(x: number, y: number): void {
    const line = this.line
    if (line.length >= LINE_POINTS * 2) {
      let kept = 0
      for (let i = 0; i < line.length; i += 4) { line[kept++] = line[i]; line[kept++] = line[i + 1] }
      line.length = kept
      this.lineEvery *= 2
    }
    line.push(Math.round(x * 2) / 2, Math.round(y * 2) / 2)
  }

  private readonly happened: Happening[] = []

  private fly(dt: number): void {
    const body = this.body!
    this.steps += dt / STEP
    while (this.steps >= 1 && !body.ended) {
      this.steps -= 1
      this.happened.length = 0
      // A finger held anywhere on the page burns the rocket.
      flightStep(body, this.happened, this.pressed !== null)
      // It faces the way it goes: sent back by a wall or a seal, it is turned round where it struck, belly down and never on its back.
      if (Math.abs(body.vx) > FACES) this.face = body.vx > 0 ? 1 : -1
      if (body.burning) this.lit = true
      this.sinceMark += 1
      this.sinceLine += 1
      if (this.sinceLine >= this.lineEvery || body.ended) {
        // The line ends where the flight ends.
        this.sinceLine = 0
        this.mark(body.x, body.y)
      }
      if (this.sinceMark >= LINE_EVERY) {
        this.sinceMark = 0
        this.scratch(body)
      }
      for (const what of this.happened) this.answer(what, body)
    }
    // A flight that ended in this frame has been set down by its landing, and is left as the landing put it.
    if (this.phase !== 'fly') return
    if (body.held > 0) {
      // A seal has it on its nose: it settles over the nose in a few frames, round the seal's belly and never through it.
      const seal = SEALS[body.heldBy], ease = Math.min(1, dt * 16)
      this.px += (body.x - this.px) * ease
      this.py += (body.y - this.py) * ease
      const far = Math.hypot(this.px - seal.x, this.py - seal.y), reach = seal.r + PENGUIN.r
      if (far < reach && far > 0) {
        this.px = seal.x + ((this.px - seal.x) / far) * reach
        this.py = seal.y + ((this.py - seal.y) / far) * reach
      }
    } else {
      this.px = body.x
      this.py = body.y
    }
    this.rot = body.turn + Math.PI / 2
    this.misted = body.misted
    this.keep(body)

    // What keeps sounding while its cause lasts.
    if (body.burning) {
      this.pulse('roar', 0.2, body.fuel / TANK)
      if (body.skidding) {
        this.pulse('sizzle', 0.26, this.rng.next())
        this.crumbs.push({ kind: 'steam', x: body.x - this.face * 40, y: body.y + PENGUIN.r - 6, vx: -this.face * 30, vy: -50, age: 0, life: 0.5, size: 9 })
      }
    }
    if (body.inSpout) {
      if (body.umbrella && !body.flipped) this.pulse('drum', 0.11, this.rng.next())
      if (body.fish && body.fish !== 'eaten') {
        // The fish comes to life in the water and flaps in the penguin's face.
        this.pulse('flapslap', 0.17, this.rng.next())
        this.swing.value = 0.7 * Math.sin(this.t * 38)
      }
    }
    if (body.inCloud) {
      if (body.umbrella && !body.flipped) this.pulse('patter', 0.09, this.rng.next())
      if (body.springs) {
        this.pulse('jangle', 0.16, this.rng.next())
        this.jangle = 0.3
      }
      if (body.fish && body.fish !== 'eaten') this.gull = { x: body.x - this.face * 86, y: body.y - 34 + 8 * Math.sin(this.t * 17), face: this.face, left: 0 }
    }
  }

  /** What the flight scratches into the ice as it skids: the furrow of a burning rocket, and the lines of the wingtips. */
  private scratch(body: Body): void {
    const into = body.skidding && body.burning ? this.furrow : body.skidding && body.wings ? this.tips : null
    if (!into) {
      this.scratching = false
      return
    }
    if (into.length >= 240) return
    if (!this.scratching && into.length > 0) into.push(NaN, NaN)
    this.scratching = true
    into.push(Math.round(body.x - this.face * 30), Math.round(body.y + PENGUIN.r))
  }

  /** The state of the gear, kept from the flight for as long as the penguin is out of the pouch. */
  private keep(body: Body): void {
    // The whole flame under a held finger, and the pilot flame the moment it lifts, while there is fuel and no water on it.
    this.flame = body.burning ? 1 : body.rocket && body.fuel > 0 && !body.inSpout ? PILOT_FLAME : 0
    this.brolly = body.flipped ? 'flipped' : body.open || body.held > 0 ? 'open' : 'shut'
    this.soaked = body.wet
    this.dewy = body.dewy
    this.sooty = this.sooty || body.sooty
    if (body.fish === 'eaten') this.rodBare = true
    else if (body.fish) this.fish = body.fish
  }

  /** The landscape's answer to one happening of the flight: what is seen, and its sound in the same step. */
  private answer(what: Happening, body: Body): void {
    switch (what.kind) {
      case 'seal': {
        const level = clamp01(what.speed / 800)
        const seal = what.which === 0 ? this.nearSeal : this.farSeal
        seal.kick(8 + 8 * level)
        this.squash.kick(-6)
        if (body.rocket && body.burning) {
          // Its whiskers curl in the heat: a hiss cut short, and then it sneezes soot.
          this.singed[what.which] = 1
          this.say('hiss')
          this.soon(0.4, () => {
            this.say('cough')
            this.bark = what.which === 0 ? 0.3 : this.bark
            this.snort = what.which === 1 ? 0.7 : this.snort
            const at = SEALS[what.which]
            for (let i = 0; i < 4; i++) this.crumbs.push({ kind: 'soot', x: at.x + (what.which === 0 ? -62 : 62), y: ICE_Y - 30, vx: (what.which === 0 ? -1 : 1) * (40 + 60 * this.rng.next()), vy: -30 - 40 * this.rng.next(), age: 0, life: 0.7, size: 7 })
          })
        } else if (body.springs) {
          // Pressed flat, it pops back indignant: the far seal wakes, glares at nobody, and sleeps again.
          this.flat[what.which] = 0.5
          if (what.which === 1) this.awake = 1.8
          this.coil.kick(160)
          this.say('deeptwang')
          this.soon(0.14, () => this.say('oof'))
        } else if (body.wings) {
          // The near seal claps twice; the far one flaps a flipper at it in its sleep.
          if (what.which === 0) this.clapTwice()
          else this.snort = 0.7
          this.say('flap')
        } else if (body.balloon) {
          // The seal noses the balloon like a ball: its nose goes up at it, and the balloon squashes on the nose.
          this.nosed = NOSING
          this.nosedBy = what.which
          if (what.which === 1) this.snort = 0.3
          this.say('hollow', level)
        } else if (what.which === 0) {
          this.bark = 0.3
          this.say('boing', level)
          this.say('bark', this.rng.next())
        } else {
          // The far seal bounces what lands on it without waking up.
          this.snort = 0.7
          this.say('deepBoing', level)
          this.say('snort')
        }
        break
      }
      case 'caught':
        // The seal has the open umbrella on its nose, and holds it there.
        this.say('rubber')
        this.squash.kick(-4)
        break
      case 'eaten':
        // The fish is snapped off the hook in passing, swallowed, and burped.
        this.chew[what.which] = 0.9
        this.rodBare = true
        this.say('snap')
        this.soon(0.7, () => this.say('burp'))
        break
      case 'bump': {
        const level = clamp01(what.speed / 600)
        if (what.what === 'igloo') { this.igloo.kick(4 + 6 * level); this.chick.kick(6); this.say('knock', level) }
        else if (what.what === 'whale') { this.whaleWide = 0.8; this.say('slap', level); this.puffOf('drop', body.x, body.y + PENGUIN.r, 4, 120) }
        else if (what.what === 'balloon') { this.balloon.kick(2 + 3 * level); this.puffin.kick(8); this.say('bomp', level) }
        else if (what.what === 'berg') { this.bergRing = 0.6; this.say('tink', level) }
        else if (what.what === 'shelf') { this.say('scrape', level); this.puffOf('snow', SHELF_EDGE, ICE_Y, 3, 70) }
        else { this.puffin.kick(10); this.say('wicker') }
        this.squash.kick(-4)
        break
      }
      case 'ice': {
        const level = clamp01(what.speed / 700)
        this.squash.kick(-5)
        if (what.on === 'crate') this.lid.kick(8)
        if (what.hop && body.springs) {
          // Each bounce is shorter than the last, and its twang higher.
          this.coil.kick(140)
          this.say('sproing', 1 - level)
          this.squirt(body)
        } else if (what.hop) {
          this.say('tiptoe', 1 - level)
        } else if (body.rocket && body.burning) {
          this.say('sizzle', 1)
        } else if (body.wings) {
          // Like an aeroplane: two thin squeaks, one for each wingtip.
          this.say('squeak', 0.3)
          this.soon(0.13, () => this.say('squeak', 0.8))
        } else if (what.on === 'crate') {
          this.say('rattle')
        } else {
          this.say('scrape', level)
          this.puffOf('snow', body.x, body.y + PENGUIN.r, 4, 80)
        }
        break
      }
      case 'spout': {
        this.say('rush')
        this.puffOf('drop', SPOUT.x, body.y, 6, 200)
        // The water washes the soot off.
        this.sooty = false
        body.sooty = false
        let own = false
        if (body.wings) { this.say('kite'); own = true }
        if (body.balloon) { this.say('whirr'); own = true }
        if (body.springs) { this.say('gurgle'); own = true }
        if (body.umbrella && !body.flipped) own = true
        if (body.fish && body.fish !== 'eaten') own = true
        if (!own) this.say('gargle')
        break
      }
      case 'cloudIn': {
        this.partX = body.x
        this.partY = body.y
        this.cloudPart.kick(5)
        const dry = body.umbrella && !body.flipped
        const own = dry || body.wings || body.balloon || body.springs || (body.fish !== null && body.fish !== 'eaten') || (body.rocket && body.burning)
        if (!own) this.say('hush')
        break
      }
      case 'cloudOut':
        if (this.gull) {
          // The gull will not cross the cloud's edge, and is left behind squawking.
          this.gull.left = 0.8
          this.say('gullcry')
        } else if (body.misted && !(body.wings || body.balloon || body.springs)) {
          this.say('sneeze')
          this.puffOf('mist', body.x, body.y, 5, 60)
        }
        break
      case 'hole':
        if (this.holes.length < 8) this.holes.push(Math.round(body.x), Math.round(body.y))
        this.say('pok')
        break
      case 'flame':
        if (what.on) this.say('whoosh')
        // Let go of, it is cut to the pilot flame's sputter at once.
        else if (what.why === 'let') { if (!body.ended) this.say('putt') }
        else if (what.why === 'water') {
          this.say('fizzle')
          for (let i = 0; i < 4; i++) this.crumbs.push({ kind: 'steam', x: body.x, y: body.y, vx: 60 * (this.rng.next() - 0.5), vy: -40 - 60 * this.rng.next(), age: 0, life: 0.6, size: 10 })
        } else if (what.why === 'empty') this.say('sputter')
        break
      case 'umbrella':
        if (what.how === 'open') this.say('fwip')
        else if (what.how === 'flip') this.say('fwop')
        break
      case 'flutter':
        this.flutter = 0.4
        this.say('flutter')
        break
      case 'soaked':
        if (what.what === 'wings') {
          this.say('squelch')
          this.puffOf('drop', body.x, body.y, 5, 90)
        } else this.say('wetsqueak')
        break
      case 'fish':
        if (what.now === 'frozen') this.say('clink')
        else if (!body.inSpout && !this.gull) this.say('plip')
        break
      case 'melt':
        // A tunnel: steam from the top, the drift slumps, and a kettle's whistle.
        this.slump.kick(5)
        this.say('whistle')
        for (let i = 0; i < 6; i++) this.crumbs.push({ kind: 'steam', x: DRIFT.x + 30 * (this.rng.next() - 0.5), y: ICE_Y - DRIFT.ry, vx: 40 * (this.rng.next() - 0.5), vy: -50 - 70 * this.rng.next(), age: 0, life: 0.8, size: 11 })
        break
      case 'sprung':
        this.coil.kick(-170)
        this.say('crunch')
        this.soon(0.1, () => this.say('mspring'))
        this.puffOf('snow', body.x, body.y + PENGUIN.r * 0.5, 7, 140)
        break
      case 'end':
        this.land(what.how, what.on, clamp01(what.speed / 700), body)
        break
      default:
        what satisfies never
    }
  }

  /** Springs that the whale's water filled squirt it out at the next landing, once. */
  private squirt(body: Body): void {
    if (!body.filled || this.squirted) return
    this.squirted = true
    this.say('squirt')
    this.puffOf('drop', body.x, body.y + PENGUIN.r, 8, 240)
  }

  private puffOf(kind: Crumb['kind'], x: number, y: number, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * (0.15 + 0.7 * this.rng.next())
      const v = speed * (0.4 + 0.6 * this.rng.next())
      this.crumbs.push({ kind, x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, age: 0, life: 0.5 + 0.4 * this.rng.next(), size: 5 + 5 * this.rng.next() })
    }
  }

  private stepCrumbs(dt: number): void {
    let kept = 0
    for (const crumb of this.crumbs) {
      crumb.age += dt
      if (crumb.age >= crumb.life) continue
      if (crumb.kind === 'snow' || crumb.kind === 'drop' || crumb.kind === 'soot') crumb.vy += (crumb.kind === 'drop' ? 700 : 260) * dt
      crumb.x += crumb.vx * dt
      crumb.y += crumb.vy * dt
      this.crumbs[kept++] = crumb
    }
    this.crumbs.length = kept
  }

  // --- The landing, the friends and the way back ------------------------------

  /** The flight ended: the place's own answer, in this step, and then the scene that takes the penguin home. */
  private land(how: End, on: Floor['of'] | null, level: number, body: Body): void {
    this.phase = 'scene'
    this.px = body.x
    this.py = body.y
    this.keep(body)
    this.flame = 0
    // A rocket flown with no finger held: the idle ladder's hand will show the hold on this flight's line, the first time in a visit.
    this.unlit = !this.told && body.rocket && !this.lit
    const onBerg = on === 'berg'
    const top = onBerg ? BERG.y0 : ICE_Y
    const fishOn = body.fish !== null && body.fish !== 'eaten'
    const settled = how === 'beak' || how === 'belly' || how === 'feet'
    if (on === 'crate') this.lid.kick(9)
    switch (how) {
      case 'beak':
        this.pose = 'beak'
        this.rot = Math.PI
        this.say('thunk', level)
        this.puffOf('snow', body.x, body.y + PENGUIN.r, 4, 90)
        if (onBerg) this.bergRing = 0.6
        break
      case 'belly':
        this.pose = 'belly'
        this.rot = (this.face > 0 ? 0 : Math.PI) + Math.PI / 2
        this.say('flop', level)
        break
      case 'feet':
        this.pose = 'stand'
        this.rot = 0
        this.py = top - STAND
        if (body.springs) {
          this.coil.kick(80)
          this.say('sproing', 1)
          this.squirt(body)
        } else if (body.balloon) this.say('tiptoe', 1)
        else {
          // Two taps of feet.
          this.say('tap', 0.2)
          this.soon(0.11, () => this.say('tap', 0.9))
        }
        break
      case 'drift': {
        const along = Math.min(0.6, Math.max(-0.6, (body.x - DRIFT.x) / DRIFT.rx))
        this.px = DRIFT.x + along * DRIFT.rx
        const crest = DRIFT.y - DRIFT.ry * Math.sqrt(1 - along * along)
        if (body.wings) {
          // The wings stay stuck out on either side, and it cannot sink.
          this.pose = 'hung'
          this.rot = 0
          this.py = crest - 14
          this.say('canvas')
        } else if (body.umbrella && !body.flipped) {
          // Umbrella first: it sits in it like a bowl.
          this.pose = 'bowl'
          this.rot = 0
          this.brolly = 'flipped'
          this.py = crest - PENGUIN.r
          this.say('pat', level)
          this.say('slither')
        } else {
          this.pose = 'buried'
          this.py = crest
          this.say('whump', level)
        }
        this.puffOf('snow', this.px, crest, 9, 150)
        break
      }
      case 'sea':
        // It floats where it came down, as a bath duck does: upright, its feet under the water.
        this.pose = 'bob'
        this.rot = 0
        this.sooty = false
        this.say('splash', level)
        this.puffOf('drop', body.x, SEA_Y, 9, 260)
        break
      case 'basket':
        // It holds on to the side of the basket, where it met it.
        this.pose = 'perch'
        this.rot = 0
        this.face = body.x < 800 ? 1 : -1
        this.puffin.kick(12)
        this.say('wicker')
        break
      case 'off':
        this.pose = 'gone'
        break
      default:
        how satisfies never
    }
    this.squash.kick(-7 * (0.4 + level))
    if (fishOn && settled) {
      // The fish swings forward on its line and slaps the penguin across the face, wetly.
      this.swing.kick(9)
      this.soon(0.18, () => this.say('wetslap'))
    }

    const friend = how === 'basket' ? friendAt('basket', body.x) : settled ? friendAt(on, body.x) : null
    const beats: Beat[] = []
    let out = 2
    if (friend && fishOn) {
      out = this.deliver(beats, friend, body.fish as Fish)
      // A penguin stuck by the beak in front of the igloo gets the chick on its feet, fish or no fish.
      if (friend === 'chick' && how === 'beak') this.rides(beats, TAKE.at + TAKE.lasts, out - TAKE.at - TAKE.lasts, 'feet', false)
    } else if (friend) out = this.visit(beats, friend, how)
    this.wayBack(beats, how, body.x, onBerg, top, out, friend === null, body.balloon)
    // The fish as this flight left it is saved now, at once: a rod that a seal or a friend has emptied is baited fresh.
    const rod: Fish = !this.has('fish') || body.fish === 'eaten' || (friend !== null && fishOn) ? 'fresh' : this.fish
    if (rod !== this.save.rod) {
      this.save.rod = rod
      this.saveNow = true
    }
    this.scene = new Scene(beats)
    // What a delivery saves, it has saved by now, at once.
    this.scene.start(this.t, () => {})
  }

  /** A fish for a friend: saved at once, and then shown. Returns when the penguin pulls itself out. */
  private deliver(beats: Beat[], who: Friend, fish: Fish): number {
    this.save.eating = { who, fish }
    this.saveNow = true
    this.gulping = null
    this.mealAct = 'wait'
    this.mealP = 0
    const answer = ANSWERS[who][fish]
    // The friend takes the fish off the rod.
    const fed = TAKE.at + TAKE.lasts
    // The friend takes the fish off the rod: it reaches for it, and the fish is heard to come off as the reach gets there.
    beats.push({ at: TAKE.at, lasts: 0, play: () => {
      this.rodBare = true
      this.mealAct = 'take'
    } })
    beats.push({ at: TAKE.at + TAKE.lasts * TAKE.reach, lasts: 0, play: (_, finishing) => { if (!finishing) this.say('take') } })
    beats.push({ at: TAKE.at, lasts: TAKE.lasts, play: (p) => { this.mealP = p } })
    // Its answer to the fish as it is.
    beats.push({ at: fed, lasts: answer.lasts, play: (p) => {
      this.mealAct = p >= 1 ? 'eat' : 'react'
      this.mealP = p
    } })
    for (const [at, name, level] of answer.cues) beats.push({ at: fed + at, lasts: 0, play: (_, finishing) => {
      if (finishing) return
      this.say(name, level)
      // Wrung, the fish drips.
      if (name === 'wring') this.puffOf('drop', WALRUS.x + 26, WALRUS.y + 20, 4, 60)
      if (who === 'chick') this.chick.kick(5)
      else if (who === 'puffin') this.puffin.kick(-3)
      else this.brow = 1.4
    } })
    // It settles to eating before the penguin pulls itself out.
    return fed + answer.lasts + SETTLES
  }

  /**
   * The chick rides the penguin from `at` for `lasts` seconds: it hops out of its doorway onto it with a peep,
   * lands with a tap of its feet, and hops back the same way before the penguin gets up. Its feet are on what
   * is drawn under it all the while (the view finds the place).
   */
  private rides(beats: Beat[], at: number, lasts: number, where: 'head' | 'feet', loud: boolean): void {
    const cue = (when: number, play: () => void): void => {
      beats.push({ at: when, lasts: 0, play: (_, finishing) => { if (!finishing) play() } })
    }
    cue(at, () => {
      this.peep = 0.22
      this.say('peep', loud ? 0.7 : 0.4)
    })
    cue(at + HOP_ON, () => this.say('tap', 0.3))
    cue(at + lasts - HOP_OFF, () => this.say('peep', 0.2))
    cue(at + lasts, () => this.say('tap', 0.1))
    beats.push({ at, lasts, play: (p) => {
      this.ride = p >= 1 ? null : where
      this.onto = p >= 1 ? 0 : clamp01(Math.min((p * lasts) / HOP_ON, ((1 - p) * lasts) / HOP_OFF))
    } })
  }

  /** A friend reached without a fish answers the penguin in front of it. Returns when the penguin pulls itself out. */
  private visit(beats: Beat[], who: Friend, how: End): number {
    const cue = (at: number, play: () => void): void => {
      beats.push({ at, lasts: 0, play: (_, finishing) => { if (!finishing) play() } })
    }
    if (who === 'chick') {
      // It turns its plate over, looks under it, and hops onto the penguin: onto its head, or onto its feet when it stands on its beak.
      cue(0.9, () => this.say('plateflip'))
      beats.push({ at: 0.9, lasts: 0.9, play: (p) => { this.plate = p >= 1 ? 0 : Math.sin(Math.PI * Math.min(1, p * 1.4)) } })
      this.rides(beats, 1.8, RIDES, how === 'beak' ? 'feet' : 'head', true)
      return 1.8 + RIDES
    }
    if (who === 'walrus') {
      // It sighs through its moustache, so that the penguin's scarf streams out.
      cue(0.9, () => {
        this.sigh = 0.9
        this.blown = 1.1
        this.say('harrumph')
      })
      return 1.6
    }
    // The puffin puts the spyglass to the penguin from a hand's width away.
    cue(0.9, () => this.say('lens'))
    beats.push({ at: 0.9, lasts: 1.3, play: (p) => { this.close = p >= 1 ? 0 : Math.min(1, Math.sin(Math.PI * p) * 2) } })
    return 2.2
  }

  /** The beats from the landing to the pouch, filled in from where and how the penguin came down. It pulls itself out at `out`. */
  private wayBack(beats: Beat[], how: End, x: number, onBerg: boolean, top: number, out: number, alone: boolean, lifted: boolean): void {
    const cue = (at: number, play: () => void): void => {
      beats.push({ at, lasts: 0, play: (_, finishing) => { if (!finishing) play() } })
    }
    const fromWater = how === 'sea' || onBerg || x > SHELF_EDGE
    const inDrift = how === 'drift'
    let at = 0

    if (how === 'off') {
      // Off the paper: a clatter of pencils, three of them, and then it walks back on with a shaving on its head.
      cue(0.15, () => this.say('pencil', 0.2))
      cue(0.32, () => this.say('pencil', 0.9))
      cue(0.55, () => this.say('pencil', 0.5))
      const right = x > 0
      // It walks back on from the edge it left by, which is the edge of the paper that is seen.
      const fromX = right ? this.page.right : this.page.left, toX = right ? BERG.x0 + 76 : 70
      const ground = (right ? BERG.y0 : ICE_Y) - STAND
      beats.push({ at: 1.1, lasts: 1.2, play: (p) => {
        this.pose = 'walk'
        this.shaving = true
        this.rot = p >= 1 ? 0 : 0.12 * Math.sin(p * 22)
        this.face = right ? -1 : 1
        this.px = mix(fromX, toX, p)
        this.py = ground
      } })
      for (const step of [1.3, 1.6, 1.9, 2.2]) cue(step, () => this.say('tap', this.rng.next()))
      at = 2.4
      x = toX
    } else {
      // The honk, with the feet going, and the nearest creature's own answer.
      cue(0.6, () => {
        this.beak = 0.4
        // Muffled only with its head in the ice or the snow: hung by its wings or sat in its umbrella, its head is out.
        if (how === 'beak' || this.pose === 'buried') this.say('muffled', this.rng.next())
        else if (how === 'belly') this.say('honk', 0)
        else this.say('squawk', this.rng.next())
        if (alone) this.nearestAnswers(x)
      })
      beats.push({ at: 0.6, lasts: out - 0.7, play: (p) => { this.waggle = p >= 1 ? 0 : 1 } })
      // Out, with a pop, and a shake. Out of the drift it comes up through the top, and stands there sunk to its ankles.
      // Out of the drift it stands on the drift's top, on the side away from the igloo, which stands in front of the drift.
      const outX = inDrift ? Math.max(this.px, DRIFT.x - 20) : this.px
      const onDrift = DRIFT.y - DRIFT.ry * Math.sqrt(1 - ((outX - DRIFT.x) / DRIFT.rx) ** 2) - (STAND - 10)
      const outY = how === 'basket' || how === 'sea' ? this.py : inDrift ? onDrift : top - STAND
      cue(out, () => {
        // The balloon tugs the penguin out of the drift by itself.
        // In the sea it only turns to swim, and at the basket it shifts its hold on the wicker: neither is a hop.
        if (how === 'sea') return
        this.say(inDrift && lifted ? 'plop' : how === 'beak' || inDrift ? 'pop' : how === 'basket' ? 'wicker' : 'hop')
        if (how === 'beak' || inDrift) this.puffOf('snow', this.px, this.py + PENGUIN.r * 0.6, 5, 110)
      })
      const fromX = this.px, fromY = this.py, fromRot = this.rot
      beats.push({ at: out, lasts: 0.25, play: (p) => {
        if (how === 'sea') return
        // Its head is in the ice until it has turned clear of it.
        this.pose = how === 'basket' ? 'perch' : how === 'beak' && p < 0.3 ? 'beak' : 'stand'
        if (this.brolly === 'flipped' && p >= 1) this.brolly = 'shut'
        // Out of the drift it is on top at the pop; out of the ice it turns up onto its feet.
        this.px = inDrift ? outX : mix(fromX, outX, p)
        // At the side of the basket it only shifts its hold; anywhere else it comes out with a small hop.
        this.py = (inDrift ? outY : mix(fromY, outY, p)) - (how === 'basket' ? 0 : Math.sin(Math.PI * p) * 22)
        this.rot = mix(fromRot, Math.round(fromRot / (2 * Math.PI)) * 2 * Math.PI, p)
        this.squash.value = p < 1 ? 1 + 0.18 * Math.sin(Math.PI * p) : this.squash.value
      } })
      cue(out + 0.4, () => this.say('shake'))
      beats.push({ at: out + 0.4, lasts: 0.4, play: (p) => { this.shiver = p >= 1 ? 0 : inDrift ? 1 : 0.5 } })
      at = out + 0.9
    }

    const lane = ICE_Y - STAND - BACK_LANE
    let from = x
    let splashed = false
    if (onBerg || (how === 'off' && x > SHELF_EDGE)) {
      // From the iceberg it runs to the edge and dives off, over the whale's back, into the open water between
      // the far seal and the whale.
      const edge = BERG.x0 + 8, stands = BERG.y0 - STAND
      const run = Math.max(0.1, Math.abs(x - edge) / 900)
      let fromX = 0
      let begun = false
      beats.push({ at, lasts: run, play: (p) => {
        if (!begun) { fromX = this.px; begun = true }
        this.pose = 'stand'
        this.face = -1
        this.rot = 0
        this.px = mix(fromX, edge, p)
        this.py = stands - Math.abs(Math.sin(p * Math.PI * Math.max(1, Math.round(run / 0.1)))) * 10
      } })
      at += run
      cue(at, () => this.say('hop'))
      beats.push({ at, lasts: 0.45, play: (p) => {
        this.pose = 'stand'
        this.rot = -1.9 * p
        this.px = mix(edge, OPEN_WATER, p)
        this.py = mix(stands, SEA_Y - PENGUIN.r, p * p * p) - Math.sin(Math.PI * p) * 60
      } })
      at += 0.45
      cue(at, () => {
        this.say('splash', 0.5)
        this.puffOf('drop', OPEN_WATER, SEA_Y, 9, 260)
      })
      x = OPEN_WATER
      splashed = true
    } else if (how === 'basket' && x > SHELF_EDGE) {
      // From the far side of the basket it lets go and drops into the same open water.
      let fromX = 0, fromY = 0, begun = false
      beats.push({ at, lasts: 0.5, play: (p) => {
        if (!begun) { fromX = this.px; fromY = this.py; begun = true }
        this.pose = 'stand'
        this.px = mix(fromX, OPEN_WATER, p * p)
        this.py = mix(fromY, SEA_Y - PENGUIN.r, p * p)
      } })
      at += 0.5
      cue(at, () => {
        this.say('splash', 0.5)
        this.puffOf('drop', OPEN_WATER, SEA_Y, 9, 260)
      })
      x = OPEN_WATER
      splashed = true
    }
    if (fromWater) {
      // Down into the water, a row of bubbles as far as the shelf, and out onto it.
      const start = Math.max(SHELF_EDGE + 30, Math.min(x, BERG.x0 - 10))
      const swim = Math.max(0.15, (start - SHELF_EDGE - 20) / BUBBLE_SPEED)
      cue(at, () => {
        if (splashed) return
        this.say('swim')
        this.puffOf('drop', start, SEA_Y, 5, 150)
      })
      let laid = 0
      beats.push({ at, lasts: swim, play: (p, finishing) => {
        this.pose = 'under'
        this.px = mix(start, SHELF_EDGE + 20, p)
        this.py = SEA_Y + 30
        // The bubbles belong to the scene being watched: a touch that ends it lays none.
        const due = finishing ? laid : Math.floor(p * swim * 12)
        for (; laid < due; laid++) this.crumbs.push({ kind: 'bubble', x: this.px, y: SEA_Y - 2, vx: 0, vy: -14, age: 0, life: 0.7, size: 5 })
      } })
      at += swim
      cue(at, () => {
        this.say('pop')
        this.puffOf('drop', SHELF_EDGE + 16, SEA_Y, 6, 220)
      })
      beats.push({ at, lasts: 0.3, play: (p) => {
        this.pose = 'stand'
        this.rot = 0
        this.behind = true
        this.px = mix(SHELF_EDGE + 20, SHELF_EDGE - 50, p)
        this.py = mix(SEA_Y + 20, lane, p) - Math.sin(Math.PI * p) * 80
      } })
      at += 0.3
      from = SHELF_EDGE - 50
    } else if (how === 'basket' || inDrift) {
      // Down from the basket, or off the back of the drift, to the ice behind whatever stands there.
      let fromY = 0
      cue(at, () => this.say('hop'))
      beats.push({ at, lasts: how === 'basket' ? 0.45 : 0.25, play: (p) => {
        if (!this.behind) fromY = this.py
        this.pose = 'stand'
        this.behind = true
        // A hop: up a little, and then down behind.
        this.py = mix(fromY, lane, p * p) - Math.sin(Math.PI * p) * (how === 'basket' ? 44 : 26)
      } })
      at += how === 'basket' ? 0.45 : 0.25
    }

    // Home on its belly, along the back of the shelf, behind whatever stands on the ice.
    const far = Math.abs(from - HOME_X)
    const ride = Math.max(0.12, far / TOBOGGAN_SPEED)
    cue(at, () => this.say('slide', clamp01(far / 700)))
    beats.push({ at, lasts: ride, play: (p) => {
      this.pose = 'toboggan'
      this.behind = true
      this.face = from >= HOME_X ? -1 : 1
      this.rot = (this.face > 0 ? 0 : Math.PI) + Math.PI / 2
      // It pushes off, and slows into the foot of the catapult.
      this.px = mix(from, HOME_X, 1 - (1 - p) * (1 - p))
      this.py = ICE_Y - PENGUIN.width / 2 - BACK_LANE
    } })
    at += ride

    // Up into the pouch, which sags under it.
    cue(at, () => this.say('hop'))
    beats.push({ at, lasts: 0.4, play: (p) => {
      this.pose = 'hop'
      this.behind = false
      this.face = 1
      this.rot = 0
      this.px = HOME_X
      this.py = mix(ICE_Y - STAND, CATAPULT.rest.y, p) - Math.sin(Math.PI * p) * 50
    } })
    at += 0.4
    beats.push({ at, lasts: 0, play: (_, finishing) => {
      this.seat()
      if (!finishing) {
        this.pouchY.kick(260)
        this.squash.kick(-6)
        this.say('sag')
      }
    } })
  }

  /** The near seal claps twice: two beats, and each is heard in the frame its flippers meet. */
  private clapTwice(): void {
    // It is clapping already: it finishes those two.
    if (this.clap > 0) return
    this.clap = CLAP
    this.soon(CLAP / 4, () => this.say('clap', 0.5))
    this.soon((3 * CLAP) / 4, () => this.say('clap', 1))
  }

  private nearestAnswers(x: number): void {
    const near: readonly [number, () => void][] = [
      [SEALS[0].x, () => this.clapTwice()],
      [CHICK.x, () => { this.chick.kick(9) }],
      // The far seal snores on.
      [SEALS[1].x, () => {}],
      [WHALE_EYE.x, () => { this.whaleWide = 0.9 }],
      [WALRUS.x, () => { this.brow = 1.4 }],
    ]
    let best = near[0]
    for (const one of near) if (Math.abs(one[0] - x) < Math.abs(best[0] - x)) best = one
    best[1]()
  }

  /** The penguin is in the pouch and the catapult is loaded. Everything that was for one flight is as it was before it. */
  private seat(): void {
    this.phase = 'loaded'
    this.pose = 'seat'
    this.behind = false
    this.face = 1
    this.waggle = 0
    this.shiver = 0
    this.misted = false
    this.flame = 0
    this.brolly = 'shut'
    this.soaked = false
    this.dewy = false
    this.ride = null
    this.onto = 0
    this.plate = 0
    this.close = 0
    this.gull = null
    this.singed[0] = 0
    this.singed[1] = 0
    if (this.mealAct !== 'eat') this.mealAct = 'eat'
    // The fish in the kit never runs out: a bare rod is baited again.
    if (this.rodBare) {
      this.rodBare = false
      this.fish = 'fresh'
    }
  }

  // --- What the view draws ----------------------------------------------------

  /** How far along a part on its way is, 0 at the kit and 1 at the penguin; null when it is not on its way. */
  private alongOf(part: Part): number | null {
    for (const mover of this.movers) {
      if (mover.part !== part) continue
      const p = clamp01((this.t - mover.at) / mover.lasts)
      return mover.toPilot ? p : 1 - p
    }
    return null
  }

  show(guidance: Guidance | null = null): Frame {
    const f = this.frame, t = this.t
    f.t = t
    f.pouch.x = this.pouchX.value
    f.pouch.y = this.pouchY.value
    f.stretch = clamp01(stretchOf(f.pouch) / FULL_STRETCH)
    f.tremble = this.tremble
    f.fork = this.fork.value
    f.sledge = Math.max(0, this.sledge.value)

    const idle = pilotIdle(t)
    const seated = this.phase === 'loaded' || this.phase === 'pull' || this.phase === 'snap'
    const p = f.pilot
    if (seated) {
      // In the sling the penguin's head points along the bands to the fork: pulled back, it leans in head first.
      const dx = CATAPULT.fork.x - f.pouch.x, dy = CATAPULT.fork.y - f.pouch.y
      const along = Math.atan2(dx, -dy)
      p.x = f.pouch.x
      p.y = f.pouch.y
      p.rot = along * (0.35 + 0.65 * f.stretch) + (this.phase === 'loaded' ? idle.swing : 0)
      p.face = 1
      p.pose = 'seat'
      p.skid = false
      p.behind = false
    } else {
      p.x = this.px
      p.y = this.py
      p.rot = this.rot
      p.face = this.face
      p.pose = this.pose
      p.skid = this.phase === 'fly' && this.body !== null && this.body.skidding
      p.behind = this.behind
    }
    p.squash = this.phase === 'snap' ? 1.22 : this.squash.value
    p.wide = clamp01(this.wide)
    p.waggle = this.waggle
    p.shiver = this.shiver
    p.misted = this.misted
    p.blink = idle.blink
    p.feet = this.waggle > 0 ? Math.sin(t * 26) : this.phase === 'loaded' ? idle.feet * 0.5 : this.phase === 'pull' ? 0 : Math.sin(t * 11)
    p.flap = this.pose === 'fly' && !seated ? 1 : this.phase === 'loaded' ? idle.flipper : this.phase === 'pull' ? 0.5 + 0.5 * f.stretch : 0.3
    p.beak = clamp01(this.beak / 0.2)

    // The kit and the parts: each part is in its place, on its way, or on the penguin.
    f.moving.length = 0
    f.kit.lid = this.lid.value
    for (const part of PARTS) {
      const along = this.alongOf(part)
      f.kit.out[part] = this.has(part) || along !== null
      if (along !== null && along > 0 && along < 1) f.moving.push({ part, along })
    }
    const on = (part: Part): boolean => {
      const along = this.alongOf(part)
      return along === null ? this.has(part) : along >= 1
    }
    p.rocket = on('rocket')
    const waiting = this.phase === 'loaded' && guidance !== null
    const holding = waiting && this.ghostHolds(guidance)
    if (holding) handPose(guidance.demo!, true, this.hand)
    // In the air the flame is the flight's. In the pouch it is the pilot flame, which flares under a held finger, the ghost hand's included.
    p.flame = !p.rocket ? 0 : this.phase === 'fly' ? this.flame : !seated ? 0 : this.revved() || (holding && this.hand.press > 0.5) ? REV_FLAME : PILOT_FLAME
    const rests = this.holdAt()
    p.flameTo.x = holding ? rests.x : this.touched.x
    p.flameTo.y = holding ? rests.y : this.touched.y
    p.wings = on('wings')
    p.soaked = this.soaked
    p.flutter = clamp01(this.flutter / 0.4)
    p.umbrella = on('umbrella') ? (seated ? 'shut' : this.brolly) : 'none'
    p.balloon = on('balloon')
    p.dewy = this.dewy
    p.springs = on('springs')
    p.coil = this.coil.value
    p.jangle = clamp01(this.jangle / 0.3)
    p.rod = on('fish')
    p.fish = p.rod && !this.rodBare ? this.fish : null
    p.swing = this.swing.value + (seated ? 0.12 * Math.sin(t * 1.9) : 0)
    p.sooty = this.sooty
    p.shaving = this.shaving
    p.blown = clamp01(this.blown / 0.3)
    const balanced = this.phase === 'fly' && this.body !== null && this.body.held > 0 ? this.body : null
    p.nose = balanced ? SEAL_NOSES[balanced.heldBy] : null
    p.nosed = this.nosed > 0 ? { x: SEAL_NOSES[this.nosedBy].x, y: SEAL_NOSES[this.nosedBy].y, p: this.nosed / NOSING } : null

    if (this.save.last) {
      const at = { x: CATAPULT.rest.x + this.save.last.x, y: CATAPULT.rest.y + this.save.last.y }
      f.ring = { x: at.x, y: at.y, stretch: clamp01(stretchOf(at) / FULL_STRETCH) }
    } else f.ring = null

    // Everyone watches the flight; with none to watch, the finger, and with no finger, the penguin in its pouch.
    if (this.phase === 'fly' || this.phase === 'scene') { f.focus.x = p.x; f.focus.y = p.y }
    else if (this.pressed) { f.focus.x = this.pressed.x; f.focus.y = this.pressed.y }
    else { f.focus.x = f.pouch.x; f.focus.y = f.pouch.y }

    const held = this.phase === 'fly' && this.body !== null && this.body.held > 0 ? this.body : null
    const near = nearSealIdle(t)
    f.nearSeal.squash = this.nearSeal.value
    f.nearSeal.breath = near.breath
    f.nearSeal.ball = near.ball
    f.nearSeal.nose = near.nose
    // It puts its nose up at a balloon, and its ball goes up with it.
    f.nearSeal.nosing = this.nosed > 0 && this.nosedBy === 0 ? Math.sin((Math.PI * this.nosed) / NOSING) : 0
    f.nearSeal.blink = near.blink
    f.nearSeal.clap = this.clap > 0 ? Math.abs(Math.sin(((CLAP - this.clap) * Math.PI * 2) / CLAP)) : 0
    f.nearSeal.bark = clamp01(this.bark / 0.15)
    f.nearSeal.singed = this.singed[0]
    f.nearSeal.chew = this.chew[0] > 0 ? Math.abs(Math.sin(this.chew[0] * 14)) : 0
    f.nearSeal.hold = held && held.heldBy === 0 ? clamp01(held.held / SEAL_HOLDS) : 0
    f.nearSeal.flat = clamp01(this.flat[0] / 0.2)
    const far = farSealIdle(t)
    f.farSeal.squash = this.farSeal.value
    f.farSeal.breath = far.breath
    f.farSeal.bubble = this.snort > 0 || this.awake > 0 ? 0 : far.bubble
    f.farSeal.flipper = this.snort > 0 ? Math.sin(t * 30) : far.flipper
    f.farSeal.snort = clamp01(this.snort / 0.3)
    f.farSeal.singed = this.singed[1]
    f.farSeal.chew = this.chew[1] > 0 ? Math.abs(Math.sin(this.chew[1] * 14)) : 0
    f.farSeal.hold = held && held.heldBy === 1 ? clamp01(held.held / SEAL_HOLDS) : 0
    f.farSeal.flat = clamp01(this.flat[1] / 0.2)
    f.farSeal.awake = clamp01(this.awake / 0.3)
    const chick = chickIdle(t)
    f.chick.bob = chick.bob
    f.chick.tilt = chick.tilt
    f.chick.hop = Math.max(0, this.chick.value)
    f.chick.blink = chick.blink
    f.chick.peep = clamp01(this.peep / 0.12)
    f.chick.ride = this.ride
    f.chick.onto = this.onto
    f.chick.plate = this.plate
    const walrus = walrusIdle(t)
    f.walrus.twitch = walrus.twitch
    f.walrus.brow = Math.max(walrus.brow, this.brow > 0 ? Math.sin((Math.PI * (1.4 - this.brow)) / 1.4) : 0)
    // It crunches a frozen fish with its eyes shut.
    const lolly = this.save.eating !== null && this.save.eating.who === 'walrus' && this.save.eating.fish === 'frozen' && (this.mealAct === 'react' || this.mealAct === 'eat')
    f.walrus.blink = lolly ? 1 : walrus.blink
    f.walrus.breath = walrus.breath
    f.walrus.sigh = this.sigh > 0 ? Math.sin((Math.PI * (0.9 - this.sigh)) / 0.9) : 0
    const puffin = puffinIdle(t)
    f.puffin.glass = puffin.glass
    f.puffin.lean = puffin.lean
    f.puffin.duck = Math.max(0, this.puffin.value)
    f.puffin.blink = puffin.blink
    f.puffin.close = this.close
    const whale = whaleIdle(t)
    f.whale.blow = clamp01(this.blow.value)
    f.whale.puff = Math.max(whale.puff, this.whalePuff > 0 ? Math.sin((Math.PI * (0.6 - this.whalePuff)) / 0.6) : 0)
    f.whale.wide = clamp01(this.whaleWide / 0.3)
    f.whale.roll = this.whaleRoll / WHALE_ROLLS
    f.whale.drift = whale.drift
    f.whale.blink = whale.blink
    // The tail sways a little by itself, and flicks under a finger.
    f.whale.tail = 0.05 * Math.sin(t * 0.83 + 1) + this.tail.value
    f.whale.tickle = clamp01(this.tickle / 0.6)
    f.whale.tickleX = this.tickleAt.x
    f.whale.tickleY = this.tickleAt.y
    const sky = skyIdle(t)
    f.cloud.drift = sky.cloud
    f.cloud.part = this.cloudPart.value
    f.cloud.partX = this.partX
    f.cloud.partY = this.partY
    f.gull = this.gull ? { x: this.gull.x, y: this.gull.y, face: this.gull.face, cry: this.gull.left > 0 ? 1 : 0 } : null
    f.lights = sky.lights
    f.igloo = this.igloo.value
    f.slump = clamp01(this.slump.value)
    f.berg = clamp01(this.bergRing / 0.6)
    f.balloon = this.balloon.value

    // A friend's fish: the one being swallowed, or the one that is saved as being eaten.
    f.meal.chick = null
    f.meal.walrus = null
    f.meal.puffin = null
    if (this.gulping) f.meal[this.gulping.who] = { fish: this.gulping.fish, act: 'gulp', p: clamp01((t - this.gulping.at) / GULP) }
    const eating = this.save.eating
    if (eating && this.mealAct !== 'wait') f.meal[eating.who] = { fish: eating.fish, act: this.mealAct, p: this.mealP }

    // The idle ladder speaks only of the penguin in the pouch, and only while it waits there.
    f.glow = waiting ? guidance.glow : 0
    if (waiting && guidance.demo !== null) {
      // One long press either way: carried back from the pouch to show the pull, or resting where it is to show the hold.
      handPose(guidance.demo, true, this.hand)
      if (holding) f.hand = { x: rests.x, y: rests.y, press: this.hand.press, opacity: this.hand.opacity }
      else f.hand = { x: CATAPULT.rest.x + GHOST_PULL.x * this.hand.travel, y: CATAPULT.rest.y + GHOST_PULL.y * this.hand.travel, press: this.hand.press, opacity: this.hand.opacity }
    } else f.hand = null
    return f
  }
}

/**
 * The game as it is found: from what storage holds, or from nothing. The Mount makes its toy here on load, and
 * again from what it has just saved each time the game is put away, so parked and loaded are one and the same.
 * The penguin is in the pouch, nothing is in the air, no scene plays and nothing sounds.
 */
export function found(raw: unknown, childAge: number | null, seed: number): Toy {
  return new Toy(deserialize(raw, childAge), seed)
}

/** Where a part lies in the kit: the middle of its place. */
export function slotOf(part: Part): { x: number; y: number } {
  const slot = SLOTS[part]
  return { x: (slot.x0 + slot.x1) / 2, y: (slot.y0 + slot.y1) / 2 }
}
