import { BEATS, HOME_SECONDS, JUMP_BEATS, LAP_OUT, PLACES, TWIN_LAG, aim, onBeat, placeOf } from './beat'
import { bodyOf } from './body'
import { cameraPose } from './cast'
import { TEMPO } from './config'
import type { Point } from './input'
import { DIAL, RELEASE, RING, castAt, dialEnd, onDial, onRelease, onTrack, overRack, pieceUnder, rackAt, rackPoint, slotAt, slotOf, slotPoint, uprightOn, type Who } from './layout'
import { KINDS, bySlot, listed, pipeFrom, wayOf, type Kind, type Piece, type Span, type Way } from './pieces'
import { below, makeRng, type Rng } from './rng'
import { STAGE } from './stage'

// The loop: a blob that runs a ring, a tap that makes it jump for one beat, a
// spring left where it took off, six pieces that act when a blob meets them,
// a release, a dial and a cast that watches. No renderer and no sound in
// here: it keeps numbers and says what happened, and the view and the voices
// follow.
//
// One clock. Everything is stepped by the attended clock's seconds, and the
// loop turns those into beats by the tempo. Whatever happens is reported as an
// event in the step, or the touch, in which it happens, so the frame that
// shows a thing start to move is the frame that plays its sound. Nothing here
// schedules a sound: what comes later is a later motion, raised when it moves.
//
// Nothing can go wrong in it. There is no way to fail, nothing is counted and
// nothing hurries: the tempo is the dial's and only the dial's.

/** How a wall is met when a jump flies into it: the sheet's wrong use, beside the five ways of the grid. */
export type Met = Way | 'splat'

/** What follows a meeting a moment later, each a motion of its own with its own sound. */
export type After = 'squelch' | 'plink' | 'gulp' | 'plip' | 'shlup' | 'mlp' | 'bap' | 'spit'

/** What the loop says happened, for the voices and the view. Every one of them is a motion starting in this step. */
export type ToyEvent =
  /** A finger landed on the wall: the spray burst under it, and how the blob took it. */
  | { type: 'touch'; x: number; y: number; answer: 'crouch' | 'jump' | 'kick' | 'again' }
  /** A blob left the line from a place (0 to 31). `muffled` is a hushed blob, which only bumps in its pipe. */
  | { type: 'launch'; place: number; by: 'tap' | 'spring'; accent: boolean; muffled: boolean; second: boolean }
  /** A tap arrived just after a spring had fired: the same jump, accented from here on. */
  | { type: 'accent'; place: number }
  /** A spring was left at a place. */
  | { type: 'lay'; place: number }
  /** A blob came down on a place with no piece on it, from a jump or from a flip's throw. */
  | { type: 'land'; place: number; second: boolean }
  /** A blob's footfall on a bare beat it runs across. */
  | { type: 'step'; beat: number; second: boolean }
  /** A blob met a piece, in one of the ways of the grid. `second` is the twin that runs behind. A mouth met from inside its pipe is the way out, and is met as `hushed`. */
  | { type: 'meet'; kind: Kind; way: Met; beat: number; second: boolean }
  /** What a meeting leads to a moment later. */
  | { type: 'after'; what: After; kind: Kind; beat: number; second: boolean }
  /** The release: grabbed, tapped, let go short of the catch, or let go past it. */
  | { type: 'release'; act: 'grab' | 'clink' | 'tock' | 'clack' }
  /** One spring came off the wall in the clear-out. */
  | { type: 'pop'; place: number }
  /** The dial went over one of its steps, or was tapped. */
  | { type: 'dial'; act: 'click' | 'knock'; tempo: number }
  /** One of the cast answered, with a sound of its own. */
  | { type: 'cast'; who: Who; act: 'poke' | 'coo' | 'rattle' | 'fur' }
  /** A piece in the hand, set down, or sent home to the rack. */
  | { type: 'piece'; kind: Kind; act: 'lift' | 'set' | 'tap' | 'pok' | 'stick' | 'clonk' | 'hat' | 'sniff' | 'flick' | 'bat' | 'rest' }
  /** The pigeon's lap. */
  | { type: 'lap'; act: 'stare' | 'takeoff' | 'flap' | 'perch' }

/** Whether an event belongs to a scene being watched: its sound is cut the moment a touch ends the scene. */
export function ofScene(event: ToyEvent): boolean {
  return event.type === 'pop' || event.type === 'lap' || (event.type === 'cast' && event.act === 'fur')
}

/** A jump in progress, counted in the runner's own beats from the start of play. */
export type Air = {
  /** The place it started from, and where it comes down: exactly one beat on. */
  from: number
  to: number
  /** Where the blob really was when it left the line: at `from`, or a little past it for a tap that came late. */
  start: number
  accent: boolean
  /** Where each kick in the air began. */
  kicks: number[]
}

/** A throw by a flip, from one surface to the other: one beat long, or half a beat for the harder throw of a flip landed on. */
export type Flight = { from: number; to: number; how: 'scoop' | 'hard' | 'drop' | 'pipe' | 'spat'; kicks: number[] }

/** On a wall: flat against it from its beat, peeling off from the half, and back on the line by the next beat. */
export type Stuck = { beat: number; how: 'slap' | 'towel' | 'splat' | 'hang'; second: boolean; lift: number }

/** A soft spring on one number, for squash, swing and wobble. It is stepped in small pieces so a long frame cannot blow it up. */
export class Bounce {
  value = 0
  speed = 0
  private readonly stiff: number
  private readonly damp: number

  constructor(stiff: number, damp: number) {
    this.stiff = stiff
    this.damp = damp
  }

  step(dt: number, target = 0): void {
    for (let left = dt; left > 0; left -= 1 / 120) {
      const h = Math.min(left, 1 / 120)
      this.speed += (-(this.value - target) * this.stiff - this.speed * this.damp) * h
      this.value += this.speed * h
    }
  }
}

const NEVER = Number.POSITIVE_INFINITY
const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}
const RING_MIDDLE = { x: RING.x, y: RING.y } as const
/** How far a piece let go off the track slides down the wall before it goes home. */
export const SLIDE = 60

/** One blob on the course. The twin is a second one, in the second colour, that runs a third of a beat behind. */
export type Runner = {
  twin: boolean
  /** How far behind the loop's position it is, in beats. */
  lag: number
  /** For a twin: where the loop was when it was made, and how. It stands there until it is a third of a beat behind. */
  bornAt: number
  born: 'peel' | 'egg' | 'string' | 'lumps' | null
  /** The last place it crossed, counted in halves from the start of play in its own position. */
  done: number
  ceiling: boolean
  hushed: boolean
  air: Air | null
  flight: Flight | null
  stuck: Stuck | null
  /** Where the harder throw of a flip put it flat on the far side, in its own position: it sticks there a moment. Null when none has. */
  hit: number | null
  /** Its squash: above 0 it is stretched tall, below 0 it is squashed flat. */
  squash: Bounce
  /** Seconds since it tripped up a chime step, bumped in its pipe, was made one of two again, went into a mouth and came out of one. */
  trip: number
  bump: number
  fat: number
  dive: number
  spat: number
  /** Until this position of its own it sits on the rim of a mouth it came down on. */
  perch: number
  /** The pipe it is in, from the mouth it went in by: the spans behind it as they were painted, and the ones ahead as the track now makes them. */
  pipe: Span[]
  /** The two mouths of that pipe, as slots: the one it went in by and the one the pipe ends at. Null out of a pipe. */
  mouth: number | null
  exit: number | null
}

function runner(twin: boolean): Runner {
  return { twin, lag: 0, bornAt: 0, born: null, done: 0, ceiling: false, hushed: false, air: null, flight: null, stuck: null, hit: null, squash: new Bounce(520, 24), trip: NEVER, bump: NEVER, fat: NEVER, dive: NEVER, spat: NEVER, perch: -1, pipe: [], mouth: null, exit: null }
}

/** Something short-lived on the wall or falling off it. A view of play, never saved. */
export type Fx = {
  kind: 'burst' | 'dust' | 'flecks' | 'feather' | 'puff' | 'drip' | 'print' | 'smear' | 'slide' | 'home' | 'zip' | 'bulge' | 'dent' | 'pipe' | 'hum' | 'hat' | 'sniffed'
  x: number
  y: number
  vx: number
  vy: number
  turn: number
  spin: number
  age: number
  life: number
  /** A spring or a burst keeps whether it belongs to a beat or to a half; a twin's mark is the second colour. */
  half: boolean
  /** The piece it is or belongs to. */
  piece?: Kind
  /** Where it is going, for a thing that travels. */
  tx?: number
  ty?: number
  /** The pipe a blob has left, fading. */
  spans?: Span[]
  /** A twin being drawn into the blob: as wide and as tall as it was drawn when the two met, and a lump for as long as it is in a pipe. */
  wide?: number
  tall?: number
  lump?: boolean
  /** What starts when it is over. */
  then?: () => void
}

/** A spring that has come off the wall and is falling out of the frame. Never dropped before it is out. */
export type Faller = { x: number; y: number; vx: number; vy: number; turn: number; spin: number; half: boolean; age: number }

/** The springs a touch took off the wall in the middle of a clear-out: they fall together, `y` stage units so far. */
export type Drop = { places: number[]; y: number; vy: number }

/** How fast a thing falls off the wall, in stage units a second each second. */
export const GRAVITY = 3000
/** How far below the frame's bottom edge a falling spring is out of sight. */
export const OUT_OF_SIGHT = 32

/** A mark of the blob's last position, left on the wall. */
export type Ghost = { beats: number; lift: number; turn: number; ceiling: boolean }

/** An idle habit of one of the cast, and how long it has been going. */
export type Habit = { kind: number; age: number }

/** How deep the crouch is, as a share of the blob's height. */
const CROUCH = -0.3
/** How hard a jump stretches the blob as it leaves the line, and how hard an accented one does: the speed its squash is given. */
export const JUMP_STRETCH = 6.5
export const ACCENT_STRETCH = 12
/** How long the harder throw of a flip landed on lasts, in beats, and how flat the blob is when it hits the far side. */
export const HARD_BEATS = 0.5
export const HARD_FLAT = 0.5
/** How long it sticks where the harder throw put it, in beats: it is held flat for the first of the two, and by the end of the second it is back at its place in the loop. */
export const STICK_FLAT = 0.2
export const STICK_BEATS = 0.5
/**
 * How long a kick in the air takes, in beats. A tap in the last three tenths of a jump or of a flip's throw is held
 * for the landing, so the latest kick there can be is over as the blob comes down.
 */
export const KICK_BEATS = 0.3
/** Seconds a piece put back over the rack takes to settle into its place. */
export const REST = 0.14
/** A ghost is left this often, in beats. */
export const GHOST_EVERY = 0.25
export const GHOSTS_KEPT = 6
/** Seconds between two springs coming off the wall in the clear-out. Sixty-four springs are off in a little over three seconds, and the last is out of the frame inside four, on a frame of any shape: a spring falls harder where the frame goes on below the stage. */
export const POP_EVERY = 0.05
/** How long a habit lasts, and the shortest and longest rest between two, in seconds. */
export const HABIT_SECONDS = 1.8
const HABIT_REST = { least: 5, most: 12 }
export const MOST_FX = 8
/** The pigeon's lap: how long it stares, flies and lands, in beats. Half a lap in all. */
export const LAP = { stare: 1, fly: 6, land: 1 } as const
export { HOME_SECONDS, LAP_OUT }
/** A coo or a rattle is a habit, not a count: each is heard at most once in this many beats, however much there is to like. */
export const VOICE_REST = 2
/** How long a mouth holds a blob that came down on it before it swallows, in beats. */
export const PERCH_BEATS = 0.25
/** How long a print of the flattened blob stays on a wall at the dial's fastest, in seconds: less than a lap there. */
export const PRINT_SECONDS = 5

export type Saved = { tempo: number; springs: number[]; pieces: Piece[] }

/** The piece in the hand: what it is, where on the track it came from (null for the rack), and where the finger has it. */
export type Hand = { kind: Kind; from: number | null; x: number; y: number }

export class Toy {
  tempo: number
  /** Where the loop is, in beats from the start of this visit's play. It only grows. */
  pos = 0
  /** The places that hold a spring: 0 to 31 on the floor, 32 to 63 on the ceiling. */
  readonly springs = new Set<number>()
  /** The pieces on the track, by slot: 0 to 15 the beats of the floor, 16 to 31 those of the ceiling. */
  readonly pieces = new Map<number, Kind>()
  /** The blob, and its twin when it is split. */
  runners: Runner[] = [runner(false)]
  /** The place a held tap is waiting to launch from, counted in halves from the start of play. */
  held: number | null = null
  /** Seconds since each place's spring last fired, was last flown over, and was laid. */
  readonly fired = new Array<number>(PLACES * 2).fill(NEVER)
  readonly ducked = new Array<number>(PLACES * 2).fill(NEVER)
  readonly laid = new Array<number>(PLACES * 2).fill(NEVER)
  /** Seconds since a blob last landed on each place of the floor and of the ceiling. */
  readonly flashed = new Array<number>(PLACES * 2).fill(NEVER)
  /** For each slot: how its piece was last met, by which of two, and how long ago; and how long ago it was set down or nudged. */
  readonly hits: { way: Met; second: boolean; age: number }[] = Array.from({ length: BEATS * 2 }, () => ({ way: 'run' as Met, second: false, age: NEVER }))
  readonly set = new Array<number>(BEATS * 2).fill(NEVER)
  /** Seconds since each place of the rack was last touched or had a piece come home. */
  readonly rack = new Array<number>(KINDS.length).fill(NEVER)
  hand: Hand | null = null
  readonly ghosts: Ghost[] = []
  readonly fx: Fx[] = []
  /** The springs falling out of the frame, one by one in a clear-out, and the ones a touch dropped all at once. */
  readonly fallers: Faller[] = []
  dropping: Drop | null = null
  /** The bottom edge of the frame, in stage units: on a surface taller than the stage the wall goes on below it. */
  bottom: number = STAGE.height

  /** The release. `pull` is how far the grip is drawn down under a finger, 0 to 1; let go, it springs back through `recoil`. */
  readonly release = { held: false, pull: 0, recoil: new Bounce(260, 9), swing: new Bounce(60, 3.2) }
  /** The springs still on the wall in a clear-out, in the order they will come off, and the seconds until the next one does. */
  clearing: { queue: number[]; wait: number } | null = null
  /** The pigeon's lap: the position of the loop it started at. */
  lap: { from: number; flaps: number } | null = null
  /** The pigeon on its way home from a lap a touch ended: where round the ring it was, how far out of its niche (0 to 1), and for how long it has been coming back. */
  homing: { beats: number; out: number; age: number } | null = null
  /** A touch ended a scene in this touch: the Mount cuts the scene's sound and sets this back. */
  sceneEnded = false
  readonly dial = { held: false, from: 0, last: 0, turned: 0, wobble: new Bounce(300, 12) }

  /** Seconds since each of the cast last did each thing. */
  readonly cast = {
    pigeon: { poke: NEVER, coo: NEVER, puff: NEVER, strut: NEVER, duck: NEVER, apart: NEVER, shake: NEVER, pant: NEVER, hat: null as Kind | null, habit: { kind: -1, age: NEVER } as Habit },
    rat: { poke: NEVER, rattle: NEVER, smirk: NEVER, take: NEVER, hush: NEVER, sniff: NEVER, habit: { kind: -1, age: NEVER } as Habit },
    cat: { poke: NEVER, fur: NEVER, ear: NEVER, blink: NEVER, bat: NEVER, habit: { kind: -1, age: NEVER } as Habit },
    camera: { poke: NEVER, nod: NEVER, lookX: 0, lookY: 0 },
    neighbour: { poke: NEVER, habit: { kind: -1, age: NEVER } as Habit },
  }
  /** Seconds of play so far, for whatever the view eases by itself. */
  seconds = 0

  /** 0: nothing to save. 1: a small change, saved at the throttle. 2: saved at once. The Mount reads it and sets it back. */
  changed: 0 | 1 | 2 = 0
  private events: ToyEvent[] = []
  private readonly rng: Rng
  private readonly rest: Record<'pigeon' | 'rat' | 'cat' | 'neighbour', number>
  /** What is to happen at a position of the loop, soonest first. Each is a motion of something already moving, a beat away at most. */
  private moments: { at: number; run: () => void }[] = []
  /** The beats the blob left the ground from in the lap it is running. */
  private readonly sprung = new Set<number>()
  /** Where the loop was when the pigeon last cooed and the rat last rattled. */
  private lastCoo = -NEVER
  private lastRattle = -NEVER

  constructor(saved: Saved, seed: number) {
    this.tempo = saved.tempo
    for (const place of saved.springs) if (Number.isInteger(place) && place >= 0 && place < PLACES * 2) this.springs.add(place)
    for (const [slot, kind] of bySlot(saved.pieces)) this.pieces.set(slot, kind)
    this.rng = makeRng(seed)
    this.rest = { pigeon: this.nextRest(), rat: this.nextRest(), cat: this.nextRest(), neighbour: this.nextRest() }
  }

  /** What a save keeps of the loop. The run itself is a view of it and is not kept; a piece in the hand is where it came from. */
  toSave(): Saved {
    return { tempo: this.dial.held ? this.dial.from : this.tempo, springs: [...this.springs].sort((a, b) => a - b), pieces: listed(this.pieces) }
  }

  /** The events since the last call, oldest first. */
  take(): ToyEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  get blob(): Runner {
    return this.runners[0]
  }

  get split(): boolean {
    return this.runners.length > 1
  }

  /** A runner's own position, in beats from the start of play. */
  at(r: Runner): number {
    return this.pos - r.lag
  }

  /**
   * Where a runner is drawn along its line. That is where it is in the loop, but for the half beat after the harder
   * throw of a flip has put it flat on the far side: it sticks where it hit, comes away slowly and then fast, and
   * is at its place again by the next beat. Its sounds stay where the loop has them.
   */
  shown(r: Runner): number {
    const at = this.at(r)
    if (r.hit === null || r.flight || r.stuck) return at
    const k = (at - r.hit) / STICK_BEATS
    return k < 0 || k >= 1 ? at : at - STICK_BEATS * (k - k ** 3)
  }

  /** Whether a runner is still held flat where the harder throw put it. */
  sticking(r: Runner): boolean {
    return r.hit !== null && !r.air && !r.flight && !r.stuck && this.at(r) - r.hit < STICK_FLAT
  }

  /** How far a runner's feet are off its surface in a jump, in stage units. `jump` is the height of a whole one. */
  liftOf(r: Runner, jump: number): number {
    const air = r.air
    if (!air) return 0
    const u = Math.min(1, Math.max(0, (this.at(r) - air.start) / (air.to - air.start)))
    return 4 * jump * u * (1 - u)
  }

  /** How far a runner has turned over in a jump, in radians: half a turn, and half a turn more for each kick. */
  turnOf(r: Runner): number {
    const air = r.air
    if (!air) return 0
    const at = this.at(r)
    const u = Math.min(1, Math.max(0, (at - air.start) / (air.to - air.start)))
    return Math.PI * u + this.kicked(r)
  }

  /** How far the kicks of a jump or of a flip's throw have turned a runner so far, in radians: half a turn each, over three tenths of a beat. */
  kicked(r: Runner): number {
    const at = this.at(r)
    let turn = 0
    for (const from of (r.air ?? r.flight)?.kicks ?? []) {
      const k = Math.min(1, Math.max(0, (at - from) / KICK_BEATS))
      turn += Math.PI * k * k * (3 - 2 * k)
    }
    return turn
  }

  /** Whether a spring stands at a place (0 to 63) to be seen: one laid, or one still waiting to come off in a clear-out. A piece on its beat stands on it. */
  holds(sp: number): boolean {
    return this.springs.has(sp) || (this.clearing !== null && this.clearing.queue.includes(sp))
  }

  /** The springs to draw: those laid, and those still waiting to come off in a clear-out. */
  standing(): number[] {
    return this.clearing ? this.clearing.queue : [...this.springs]
  }

  /** The piece a blob would meet in a slot: what stands there, unless it is in the hand. */
  pieceIn(slot: number): Kind | undefined {
    return this.hand && this.hand.from === slot ? undefined : this.pieces.get(slot)
  }

  /** How far the release's grip is drawn below its rest and to the side, in stage units: where it is drawn and where it is touched. */
  gripAt(): { drop: number; sway: number } {
    const release = this.release
    return { drop: (release.held ? release.pull : release.recoil.value) * RELEASE.travel, sway: release.swing.value * RELEASE.sway }
  }

  /** What a point of the wall is, to a finger landing on it. */
  under(at: Point): 'release' | 'dial' | 'rack' | 'piece' | 'wall' {
    const grip = this.gripAt()
    if (onRelease(at, grip.drop, grip.sway)) return 'release'
    if (onDial(at)) return 'dial'
    if (rackAt(at) !== null) return 'rack'
    if (pieceUnder(at, this.pieces) !== null) return 'piece'
    return 'wall'
  }

  // --- Touch -----------------------------------------------------------------

  /** A finger landed. Any scene that is playing ends first, and the touch is then an ordinary touch. */
  press(at: Point): 'release' | 'dial' | 'rack' | 'piece' | 'wall' {
    this.endScenes()
    const what = this.under(at)
    if (what === 'release') {
      this.release.held = true
      this.release.pull = Math.max(0, this.release.recoil.value)
      this.release.recoil.value = 0
      this.release.recoil.speed = 0
      this.say({ type: 'release', act: 'grab' })
    } else if (what === 'dial') {
      this.dial.held = true
      this.dial.from = this.tempo
      this.dial.last = Math.atan2(at.y - DIAL.y, at.x - DIAL.x)
      this.dial.turned = 0
    } else if (what === 'rack') {
      const index = rackAt(at)!
      this.hand = { kind: KINDS[index], from: null, x: at.x, y: at.y }
      this.rack[index] = 0
      this.say({ type: 'piece', kind: KINDS[index], act: 'lift' })
    } else if (what === 'piece') {
      const slot = pieceUnder(at, this.pieces)!, kind = this.pieces.get(slot)!
      this.hand = { kind, from: slot, x: at.x, y: at.y }
      this.say({ type: 'piece', kind, act: 'lift' })
      // In the hand it is off the track: a blob in a pipe gets, in this frame, the pipe the track now makes.
      this.repipe()
    } else this.wallTap(at)
    return what
  }

  /** A tap anywhere on the wall, by the working finger or by any other: the blob jumps, or answers as it can. */
  wallTap(at: Point): void {
    const who = this.whoAt(at)
    this.endScenes()
    const blob = this.blob, target = aim(this.pos), place = placeOf(target.half), air = blob.air
    let answer: 'crouch' | 'jump' | 'kick' | 'again' = 'again'
    // Thrown by a flip it is in the air as much as in a jump, and a tap is taken the same way. A lump thrown inside
    // its pipe is not.
    const thrown = blob.flight && blob.flight.how !== 'pipe' ? blob.flight : null
    if (blob.stuck || blob.perch >= this.pos || (blob.flight && !thrown)) {
      // Flat on a wall, on the rim of a mouth or in a pipe: it cannot leave the line. The tap is answered by the
      // hiss and the burst under the finger, and nothing is set on the blob that is not drawn.
    } else if (air || thrown) {
      const flying = air ?? thrown!
      if (target.at === flying.to) {
        // It comes down on the place the tap is for: the blob bounces straight off it.
        if (this.held !== target.half) answer = 'crouch'
        this.held = target.half
      } else if (air && target.late && air.from === target.at && !air.accent) {
        // The spring there has just fired: the tap is on that jump, which stretches further for it.
        air.accent = true
        blob.squash.speed += ACCENT_STRETCH - JUMP_STRETCH
        this.say({ type: 'accent', place })
        answer = 'jump'
      } else {
        // Anywhere else in the air it kicks an extra half turn, however many taps there have been.
        flying.kicks.push(this.pos)
        // Its twin, if it is in the air and not about to land, kicks with it.
        const twin = this.runners[1], other = twin ? twin.air ?? (twin.flight && twin.flight.how !== 'pipe' ? twin.flight : null) : null
        if (twin && other && other.to - this.at(twin) >= KICK_BEATS) other.kicks.push(this.at(twin))
        answer = 'kick'
      }
    } else if (target.late) {
      this.launch(blob, target.at, this.pos, 'tap', false)
      this.lay(place + (blob.ceiling ? PLACES : 0))
      answer = 'jump'
    } else {
      if (this.held !== target.half) answer = 'crouch'
      this.held = target.half
    }
    this.say({ type: 'touch', x: at.x, y: at.y, answer })
    this.add({ kind: 'burst', x: at.x, y: at.y, vx: 0, vy: 0, turn: this.rng.next() * Math.PI * 2, spin: 0, age: 0, life: 2.4, half: !onBeat(place) })
    if (who) {
      this.cast[who].poke = 0
      this.say({ type: 'cast', who, act: 'poke' })
    }
    // The snail and the hare are paint beside the dial. A tap on one is this tap on the wall, and the knob rocks
    // towards that end with its knock: it turns nothing, and shows what does.
    const end = dialEnd(at)
    if (end !== 0) {
      this.dial.wobble.speed += 5 * end
      this.say({ type: 'dial', act: 'knock', tempo: this.tempo })
    }
    this.cast.camera.lookX = at.x
    this.cast.camera.lookY = at.y
  }

  /** Which of the cast a point of the wall is on. The camera is where it is drawn now: turned to the blob, or to the last finger that poked it. */
  whoAt(at: Point): Who | null {
    const pose = cameraPose({ beats: this.pos, seconds: this.seconds, tempo: this.tempo, blob: bodyOf(this, this.blob) }, this.cast.camera)
    return castAt(at, pose.pan + pose.nod)
  }

  /** The working finger moved after it took hold of something. */
  drag(from: Point, at: Point): void {
    if (this.release.held) this.release.pull = Math.min(1, Math.max(0, (at.y - from.y) / RELEASE.travel))
    if (this.dial.held) this.turnDial(at)
    if (this.hand) {
      this.hand.x = at.x
      this.hand.y = at.y
    }
  }

  /** The press ended as a tap. A tap on the wall was answered when it landed; a control or a piece answers a tap here. */
  tap(): void {
    if (this.release.held) {
      this.release.held = false
      this.release.pull = 0
      this.release.swing.speed += 5
      this.say({ type: 'release', act: 'clink' })
    }
    if (this.dial.held) {
      this.dial.held = false
      this.dial.wobble.speed += 4
      this.say({ type: 'dial', act: 'knock', tempo: this.tempo })
    }
    if (this.hand) {
      // Lifted and set straight back: it rocks where it stands.
      const hand = this.hand
      this.hand = null
      if (hand.from === null) this.rack[KINDS.indexOf(hand.kind)] = 0
      else this.set[hand.from] = 0
      this.say({ type: 'piece', kind: hand.kind, act: 'tap' })
      if (hand.from !== null) this.repipe()
    }
  }

  /** The drag ended. `dropped` is true when the child let go, and false when the finger was taken away. */
  endDrag(dropped: boolean): void {
    if (this.release.held) {
      const pull = this.release.pull
      this.release.held = false
      this.release.pull = 0
      this.release.recoil.value = pull
      this.release.recoil.speed = 0
      if (dropped && pull >= RELEASE.catch) this.clear()
      else if (dropped) this.say({ type: 'release', act: 'tock' })
    }
    if (this.dial.held) {
      this.dial.held = false
      // A turn that was taken away is no turn: the tempo goes back to where the finger found it.
      if (!dropped) this.tempo = this.dial.from
      else if (this.tempo !== this.dial.from) this.changed = 2
    }
    if (this.hand) {
      const hand = this.hand
      this.hand = null
      // A piece that was taken away with the finger still on it is back where it came from, and nothing has moved.
      if (dropped) this.drop(hand)
      else if (hand.from !== null) this.repipe()
    }
  }

  /** The press was taken away before it became a tap or a drag: whatever it held is let go, and nothing is done. */
  letGo(): void {
    this.endDrag(false)
  }

  /** Where the piece in the hand would stand if it were let go now, for the view to mark: a slot, or null off the track. */
  aimed(): number | null {
    return this.hand ? slotAt(this.hand) : null
  }

  /** The child let a piece go. */
  private drop(hand: Hand): void {
    const at = { x: hand.x, y: hand.y }, slot = slotAt(at), who = this.whoAt(at), kind = hand.kind
    if (slot !== null) {
      if (hand.from === slot) {
        this.set[slot] = 0
        this.say({ type: 'piece', kind, act: 'set' })
        this.repipe()
        return
      }
      const old = this.pieces.get(slot)
      if (hand.from !== null) this.pieces.delete(hand.from)
      this.pieces.set(slot, kind)
      this.set[slot] = 0
      this.hits[slot].age = NEVER
      this.say({ type: 'piece', kind, act: 'set' })
      if (old) {
        // The one that stood there pops out and goes home.
        const from = slotPoint(slot)
        this.say({ type: 'piece', kind: old, act: 'pok' })
        this.home(old, from.x, from.y, null)
      }
      this.relaid()
      return
    }
    if (hand.from !== null) {
      this.pieces.delete(hand.from)
      this.relaid()
    }
    if (overRack(at)) {
      // Put back: over the rack or its plank it settles into its own place at once, with a small knock of its own
      // in the frame it lands. The joke of a piece let go off the track is for the wall away from the rack.
      this.home(kind, at.x, at.y, 'rest', REST)
      return
    }
    if (who === 'pigeon') {
      // It wears the piece as a hat until its next bob.
      if (this.cast.pigeon.hat) this.home(this.cast.pigeon.hat, at.x, at.y, 'clonk')
      this.cast.pigeon.hat = kind
      this.say({ type: 'piece', kind, act: 'hat' })
    } else if (who === 'rat') {
      // It sniffs the piece, and then flicks it home with its tail.
      this.cast.rat.sniff = 0
      this.say({ type: 'piece', kind, act: 'sniff' })
      this.add({ kind: 'sniffed', x: at.x, y: at.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 0.6, half: false, piece: kind, then: () => {
        this.say({ type: 'piece', kind, act: 'flick' })
        this.home(kind, at.x, at.y, 'clonk')
      } })
    } else if (who === 'cat') {
      // It bats the piece off the ledge without opening an eye.
      this.cast.cat.bat = 0
      this.say({ type: 'piece', kind, act: 'bat' })
      this.home(kind, at.x, at.y, 'clonk')
    } else {
      // Off the track: it sticks to the wall where it was let go, slides down it leaving a smear, and goes home.
      this.say({ type: 'piece', kind, act: 'stick' })
      this.add({ kind: 'slide', x: at.x, y: at.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 0.75, half: false, piece: kind, then: () => this.home(kind, at.x, at.y + SLIDE, 'clonk') })
      this.add({ kind: 'smear', x: at.x, y: at.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 2.6, half: false })
    }
  }

  /** A piece goes home to its place in the rack, and sounds as it gets there: a clonk, the small knock of one put back, or nothing. */
  private home(kind: Kind, x: number, y: number, sound: 'clonk' | 'rest' | null, life = 0.34): void {
    const index = KINDS.indexOf(kind), to = rackPoint(index)
    this.add({ kind: 'home', x, y, vx: 0, vy: 0, turn: 0, spin: life < 0.34 ? 0 : 5, age: 0, life, half: false, piece: kind, tx: to.x, ty: to.y, then: () => {
      this.rack[index] = 0
      if (sound) this.say({ type: 'piece', kind, act: sound })
    } })
  }

  /** The pieces on the track changed: it is saved at the throttle, and a blob in a pipe gets the pipe the track now makes. */
  private relaid(): void {
    if (this.changed < 1) this.changed = 1
    this.repipe()
  }

  /**
   * A blob in a pipe gets the pipe the track now makes, in the frame the track changes: when a piece is lifted, set
   * down, put back or taken off. A pipe is from a mouth to a mouth, so when either mouth of the pipe a blob is in is
   * lifted the pipe has lost an end: the blob is spat out where it is, onto the line, with the pop and the puff, and
   * the pipe fades off the wall. A lump that is changing sides is spat out in that frame too, where it is between
   * the two surfaces: it flies on as a blob and lands as a thrown one. Its pipe is otherwise seen to when it is across.
   */
  private repipe(): void {
    for (const r of this.runners) {
      // On the rim of a mouth that is lifted from under it, it is on the line.
      if (r.perch > this.at(r) && this.pieceIn(slotOf(Math.round(r.perch - PERCH_BEATS), r.ceiling)) !== 'tunnel') r.perch = -1
      this.repiped(r)
    }
  }

  private repiped(r: Runner): void {
    if (!r.hushed) return
    const gone = (slot: number | null) => slot !== null && this.pieceIn(slot) !== 'tunnel'
    const out = gone(r.mouth) || gone(r.exit)
    if (r.flight) {
      if (!out) return
      const at = bodyOf(this, r)
      r.flight = { ...r.flight, how: 'spat' }
      this.spit(r, at)
    } else if (out) this.spit(r, onTrack(this.at(r), 0, r.ceiling))
    else this.pipe(r, false)
  }

  /** A blob comes out of its pipe: loud again, with a puff of grey where it comes out, and the pipe fades. */
  private spit(r: Runner, at: Point): void {
    r.hushed = false
    r.spat = 0
    this.add({ kind: 'pipe', x: at.x, y: at.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 0.5, half: false, spans: r.pipe })
    this.add({ kind: 'puff', x: at.x, y: at.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 0.5, half: false })
    r.pipe = []
    r.mouth = r.exit = null
    // A twin on its way into this blob is out of the pipe with it.
    if (!r.twin) for (const fx of this.fx) if (fx.kind === 'zip') fx.lump = false
    this.say({ type: 'after', what: 'spit', kind: 'tunnel', beat: Math.floor(this.at(r)), second: r.twin })
  }

  // --- The loop --------------------------------------------------------------

  /** Plays `dt` seconds. */
  step(dt: number): void {
    if (!(dt > 0)) return
    this.seconds += dt
    for (const ages of [this.fired, this.ducked, this.laid, this.flashed, this.set, this.rack]) for (let i = 0; i < ages.length; i++) ages[i] += dt
    for (const hit of this.hits) hit.age += dt

    // What is already going on grows older first, so that whatever starts in this step is at its very start when
    // the step is drawn and heard.
    for (const r of this.runners) {
      r.trip += dt; r.bump += dt; r.fat += dt; r.dive += dt; r.spat += dt
    }
    this.stepCast(dt)
    this.stepFx(dt)
    this.stepFalling(dt)
    this.release.recoil.step(dt)
    this.release.swing.step(dt)
    this.dial.wobble.step(dt)

    const before = this.pos
    this.advance(this.pos + (dt * this.tempo) / 60)
    this.leaveGhosts(before)
    if (this.lap) this.flyOver(before)
    for (const r of this.runners) r.squash.step(dt, this.sticking(r) ? -HARD_FLAT : !r.twin && this.held !== null && !r.air && !r.flight && !r.stuck ? CROUCH : 0)
    if (this.clearing) this.stepClearing(dt)
  }

  /**
   * Runs the loop on to a position. Everything in the loop happens on a place or at a moment set a beat ahead at
   * most, so what falls inside this step is played in order, each at its own point, however long the step was.
   */
  private advance(to: number): void {
    for (;;) {
      let next = Infinity, crossing: Runner | null = null
      for (const r of this.runners) {
        // The loop's position at which this runner crosses its next place.
        const due = (r.done + 1) / 2 + (r.twin ? TWIN_LAG : 0)
        if (due < next) {
          next = due
          crossing = r
        }
      }
      const moment = this.moments[0]
      if (moment && moment.at <= next) {
        if (moment.at > to) break
        this.moveTo(moment.at)
        this.moments.shift()
        moment.run()
        continue
      }
      if (next > to || !crossing) break
      this.moveTo(next)
      crossing.done += 1
      this.cross(crossing, crossing.done)
    }
    this.moveTo(to)
  }

  private moveTo(pos: number): void {
    this.pos = Math.max(this.pos, pos)
    // A twin stands where it was made until it is a third of a beat behind, and then runs.
    for (const r of this.runners) if (r.twin) r.lag = Math.min(TWIN_LAG, this.pos - r.bornAt)
  }

  /** Something to happen when the loop reaches a position. */
  private moment(at: number, run: () => void): void {
    let i = this.moments.length
    while (i > 0 && this.moments[i - 1].at > at) i--
    this.moments.splice(i, 0, { at, run })
  }

  /** Something to happen when a runner reaches a position of its own. */
  private later(r: Runner, own: number, run: () => void): void {
    this.moment(own + (r.twin ? TWIN_LAG : 0), run)
  }

  private cross(r: Runner, half: number): void {
    const at = half / 2, place = placeOf(half), beat = onBeat(place)
    // A tap that was held for this place is used here or not at all: it never waits for another.
    const tapped = !r.twin && this.held === half
    if (tapped) this.held = null
    if (!r.twin && beat) this.bob(at)

    let landed = false, hard = false
    if (r.flight) {
      // Thrown by a flip: in the air between the two surfaces, over everything, until the beat it comes down on.
      if (r.flight.to !== at) return
      hard = r.flight.how === 'hard'
      r.flight = null
      r.ceiling = !r.ceiling
      landed = true
      // A lump that changed sides while the track was changed gets its pipe now.
      this.repiped(r)
    }
    if (r.stuck) {
      if (at === r.stuck.beat + 0.5) this.peel(r, r.stuck)
      if (at < r.stuck.beat + 1) return
      r.stuck = null
    }
    if (r.air && r.air.to === at) {
      r.air = null
      landed = true
    }
    const sp = place + (r.ceiling ? PLACES : 0)
    const kind = beat ? this.pieceIn(slotOf(place / 2, r.ceiling)) : undefined
    if (r.air) {
      // Flown over. No jump clears a wall; a spring fires only under a blob that is on the line, and ducks.
      if (kind === 'wall') this.splat(r, at)
      else if (this.springs.has(sp)) this.ducked[sp] = 0
      return
    }
    if (landed) this.landed(r, sp, kind === undefined && !hard)
    if (hard) {
      // The harder throw hits the far side flat: the bap is heard, the dust flies and the body is flat in this step.
      r.squash.value = -HARD_FLAT
      r.squash.speed = -1
      r.hit = at
      this.say({ type: 'after', what: 'bap', kind: 'flip', beat: Math.floor(at), second: r.twin })
    }
    if (kind) {
      this.meet(r, kind, at, landed)
      if (r.flight || r.stuck || r.perch > at) return
    }
    const sprung = this.springs.has(sp)
    if (tapped) {
      this.launch(r, at, at, 'tap', sprung)
      if (!sprung) this.lay(sp)
    } else if (sprung) {
      this.launch(r, at, at, 'spring', false)
    } else if (beat && !landed && !kind && !r.hushed) {
      r.squash.speed -= 0.9
      this.say({ type: 'step', beat: place / 2, second: r.twin })
    }
  }

  /** The blob crosses a beat: the pigeon bobs, a hat comes off, and a lap is over at the first beat. */
  private bob(at: number): void {
    const pigeon = this.cast.pigeon
    if (pigeon.hat) {
      this.home(pigeon.hat, RING_MIDDLE.x, RING_MIDDLE.y - 70, 'clonk')
      pigeon.hat = null
    }
    if (at % BEATS !== 0) return
    // The secret: a lap in which the blob left the ground from every one of the sixteen beats.
    if (this.sprung.size === BEATS && !this.lap) this.startLap()
    this.sprung.clear()
  }

  private launch(r: Runner, from: number, start: number, by: 'tap' | 'spring', accent: boolean): void {
    const place = placeOf(from * 2), sp = place + (r.ceiling ? PLACES : 0)
    this.fired[sp] = 0
    if (r.hushed) {
      // In a pipe a spring only bumps the lump, with a hand over its boing. The cat likes anything hushed.
      r.bump = 0
      this.cast.cat.blink = 0
      this.say({ type: 'launch', place, by, accent, muffled: true, second: r.twin })
      return
    }
    // Launched from the very place the harder throw put it, it does not stick there.
    if (r.hit !== null && start <= r.hit) r.hit = null
    r.air = { from, to: from + JUMP_BEATS, start, accent, kicks: [] }
    r.squash.value = Math.max(r.squash.value, 0)
    r.squash.speed = accent ? ACCENT_STRETCH : JUMP_STRETCH
    this.say({ type: 'launch', place, by, accent, muffled: false, second: r.twin })
    if (!r.twin && onBeat(place)) this.sprung.add(place / 2)
    if (!onBeat(place)) {
      // The rat is for the half: a grin for every jump from one, and its can when it has not just rattled.
      this.cast.rat.smirk = 0
      if (this.pos - this.lastRattle >= VOICE_REST) {
        this.lastRattle = this.pos
        this.cast.rat.rattle = 0
        this.say({ type: 'cast', who: 'rat', act: 'rattle' })
      }
    }
  }

  private lay(sp: number): void {
    if (this.springs.has(sp)) return
    this.springs.add(sp)
    this.laid[sp] = 0
    if (this.changed < 1) this.changed = 1
    this.say({ type: 'lay', place: sp % PLACES })
  }

  /** A blob came down on a place. `plain` is a place with no piece on it, where the landing has its own thump. */
  private landed(r: Runner, sp: number, plain: boolean): void {
    const place = sp % PLACES
    r.squash.value = Math.min(r.squash.value, 0)
    r.squash.speed = -7
    // A lump thrown across inside its pipe comes down unseen and unheard: nobody on the wall answers it.
    if (r.hushed) return
    this.flashed[sp] = 0
    const foot = onTrack(place / 2, 0, sp >= PLACES)
    this.add({ kind: 'dust', x: foot.x, y: foot.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 0.5, half: !onBeat(place) })
    if (plain) this.say({ type: 'land', place, second: r.twin })
    this.cast.cat.ear = 0
    this.cast.camera.nod = 0
    if (onBeat(place)) {
      // The pigeon is for the beat: its chest for every landing on one, and a coo when it has drawn breath.
      this.cast.pigeon.puff = 0
      if (this.pos - this.lastCoo >= VOICE_REST && !this.lap) {
        this.lastCoo = this.pos
        this.cast.pigeon.coo = 0
        this.say({ type: 'cast', who: 'pigeon', act: 'coo' })
      }
    }
  }

  // --- The pieces --------------------------------------------------------------

  /** A blob on the line meets the piece on its beat. What the piece does never changes; how it is met picks the cell. */
  private meet(r: Runner, kind: Kind, at: number, landed: boolean): void {
    const beat = placeOf(at * 2) / 2, slot = slotOf(beat, r.ceiling), split = this.split, hushed = r.hushed
    const way = wayOf({ hushed, split, ceiling: r.ceiling, landed })
    const hit = this.hits[slot]
    hit.way = way
    hit.second = r.twin
    hit.age = 0
    this.say({ type: 'meet', kind, way, beat, second: r.twin })
    const p = slotPoint(slot), cast = this.cast
    // The cat likes anything hushed.
    if (hushed) cast.cat.blink = 0
    switch (kind) {
      case 'drum':
        if (hushed) this.mark('bulge', p, 0.3)
        else {
          cast.pigeon.strut = 0
          cast.cat.fur = 0
          if (way === 'run') this.mark('dust', onTrack(beat, 0, r.ceiling), 0.5)
          if (way === 'landed') this.mark('flecks', p, 0.45)
        }
        break
      case 'chime':
        cast.cat.blink = 0
        if (way === 'run') r.trip = 0
        // It hums until the next beat.
        if (way === 'landed') this.mark('hum', p, 60 / this.tempo)
        break
      case 'flip':
        r.air = null
        // It moves as the cell it sounds as. Twins are thrown as a blob on their surface is.
        // A flip landed on throws harder: the blob comes off too fast and is on the far side half a beat on.
        r.flight = way === 'landed' ? { from: at, to: at + HARD_BEATS, how: 'hard', kicks: [] } : { from: at, to: at + 1, how: way === 'hushed' ? 'pipe' : r.ceiling ? 'drop' : 'scoop', kicks: [] }
        if (split && !hushed) cast.pigeon.apart = 0
        break
      case 'splitter':
        if (split) this.merge()
        else this.divide(r, way === 'hushed' ? 'lumps' : way === 'landed' ? 'egg' : way === 'ceiling' ? 'string' : 'peel')
        break
      case 'tunnel':
        if (hushed) {
          // Reached from inside, it is the way out.
          r.hushed = false
          r.spat = 0
          this.add({ kind: 'pipe', x: p.x, y: p.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 0.5, half: false, spans: r.pipe })
          this.add({ kind: 'puff', x: p.x, y: p.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 0.5, half: false })
          r.pipe = []
          r.mouth = r.exit = null
        } else if (way === 'landed') {
          // It sits on the rim like a coin on a slot, and then drops in.
          r.perch = at + PERCH_BEATS
          this.later(r, at + PERCH_BEATS, () => {
            if (!this.runners.includes(r) || r.hushed) return
            // A mouth lifted from under it swallows nothing: it is on the line.
            if (this.pieceIn(slot) !== 'tunnel') return
            this.swallow(r, slot)
            this.say({ type: 'after', what: 'gulp', kind, beat, second: r.twin })
          })
        } else this.swallow(r, slot)
        break
      case 'wall':
        if (hushed) this.mark('dent', p, 0.3)
        else {
          r.air = null
          // Only a lone blob that lands on a wall of the floor folds over its top. On the ceiling and as twins it slaps.
          r.stuck = { beat: at, how: way === 'landed' ? 'towel' : r.ceiling ? 'hang' : 'slap', second: r.twin && this.blob.stuck?.beat === at, lift: 0 }
          if (way !== 'landed') this.slapped(slot)
        }
        break
      default:
        kind satisfies never
    }
  }

  /** A jump flies into a wall: a bigger splat, and the blob slides down its face before it peels. */
  private splat(r: Runner, at: number): void {
    const beat = placeOf(at * 2) / 2, slot = slotOf(beat, r.ceiling), hit = this.hits[slot]
    hit.way = 'splat'
    hit.second = r.twin
    hit.age = 0
    this.say({ type: 'meet', kind: 'wall', way: 'splat', beat, second: r.twin })
    // Where it was in the air when it hit, as a share of a whole jump's height.
    const air = r.air!, u = Math.min(1, Math.max(0, (at - air.start) / (air.to - air.start)))
    r.air = null
    r.stuck = { beat: at, how: 'splat', second: false, lift: 4 * u * (1 - u) }
    this.slapped(slot)
  }

  /** A slap on a wall: the pigeon ducks and loses a feather, the cat's fur goes up, and at the dial's fastest a print is left. */
  private slapped(slot: number): void {
    const cast = this.cast, p = slotPoint(slot)
    cast.pigeon.duck = 0
    cast.cat.fur = 0
    this.add({ kind: 'feather', x: RING_MIDDLE.x - 30, y: RING_MIDDLE.y - 10, vx: -14, vy: 46, turn: 0.4, spin: 1.2, age: 0, life: 1.8, half: false })
    if (this.tempo >= TEMPO.fastest) this.add({ kind: 'print', x: p.x, y: p.y, vx: slot % BEATS, vy: slot >= BEATS ? 1 : 0, turn: 0, spin: 0, age: 0, life: PRINT_SECONDS, half: false })
  }

  /** Half a beat after a slap the blob peels off: a squelch, or, hanging from the ceiling, a drip that falls the wrong way. */
  private peel(r: Runner, stuck: Stuck): void {
    const beat = placeOf(stuck.beat * 2) / 2
    if (stuck.how === 'towel') return
    if (stuck.how === 'hang') {
      const p = slotPoint(slotOf(beat, true)), dx = RING_MIDDLE.x - p.x, dy = RING_MIDDLE.y - p.y, d = Math.hypot(dx, dy) || 1
      // Towards the ceiling, which is the wrong way for a drip.
      this.add({ kind: 'drip', x: p.x - (dx / d) * 40, y: p.y - (dy / d) * 40, vx: (dx / d) * 110, vy: (dy / d) * 110, turn: 0, spin: 0, age: 0, life: 0.4, half: r.twin })
      this.say({ type: 'after', what: 'plink', kind: 'wall', beat, second: r.twin })
    } else this.say({ type: 'after', what: 'squelch', kind: 'wall', beat, second: r.twin })
  }

  /** A mouth swallows a blob: it is hushed from here to the next mouth, and the pipe it travels is painted on. */
  private swallow(r: Runner, slot: number): void {
    r.hushed = true
    r.air = null
    r.dive = 0
    r.mouth = slot
    this.pipe(r, true)
    // The rat cannot stand the hush.
    this.cast.rat.hush = 0
  }

  /**
   * The pipe a hushed runner is in. A fresh one is painted from the mouth. One relaid while the lump is in it keeps
   * what is behind the lump as it was painted, and is what the track now makes from the lump's beat on: the spans
   * that were ahead and are no longer fade off the wall, and nothing else of the pipe changes.
   */
  private pipe(r: Runner, fresh: boolean): void {
    const from = Math.floor(this.at(r) + 1e-6), beat = ((from % BEATS) + BEATS) % BEATS
    const ahead = pipeFrom((slot) => this.pieceIn(slot), from, r.ceiling)
    if (fresh) r.pipe = ahead
    else {
      const at = (a: Span, b: Span) => a.beat === b.beat && a.ceiling === b.ceiling
      const here = r.pipe.findIndex((span) => span.beat === beat && span.ceiling === r.ceiling)
      const behind = here < 0 ? [] : r.pipe.slice(0, here), was = here < 0 ? r.pipe : r.pipe.slice(here)
      const lost = was.filter((span) => !ahead.some((now) => at(now, span) && now.cross === span.cross))
      // Twins in one pipe lose the same spans: they fade once.
      if (lost.length > 0 && !this.fx.some((fx) => fx.kind === 'pipe' && fx.age === 0 && fx.spans?.length === lost.length && at(fx.spans[0], lost[0]))) {
        const p = onTrack(lost[0].beat, 0, lost[0].ceiling)
        this.add({ kind: 'pipe', x: p.x, y: p.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: 0.5, half: false, spans: lost })
      }
      r.pipe = [...behind.filter((span) => !ahead.some((now) => at(now, span))), ...ahead]
    }
    // The mouth it ends at: the one that stands where the last span leads.
    const last = ahead[ahead.length - 1], end = last ? slotOf((last.beat + 1) % BEATS, last.cross ? !last.ceiling : last.ceiling) : null
    r.exit = end !== null && this.pieceIn(end) === 'tunnel' ? end : null
  }

  /** A splitter makes one blob two: the twin stands where it was made until it is a third of a beat behind. */
  private divide(r: Runner, how: 'peel' | 'egg' | 'string' | 'lumps'): void {
    const twin = runner(true)
    twin.bornAt = this.pos
    twin.born = how
    twin.done = r.done
    twin.ceiling = r.ceiling
    twin.hushed = r.hushed
    twin.pipe = r.pipe
    twin.mouth = r.mouth
    twin.exit = r.exit
    this.runners = [r, twin]
    // The rat likes the splitter: a double-take at the twins, then a slow nod.
    this.cast.rat.take = 0
    // Burst on like a dropped egg, it spits flecks of paint to both sides.
    if (how === 'egg') this.mark('flecks', onTrack(this.at(r), 0, r.ceiling), 0.45)
    if (how === 'string') {
      const beat = placeOf(Math.round(this.pos * 2)) / 2
      // The string of paint it hangs by lets go as it starts to run.
      this.later(twin, this.pos, () => { if (this.runners.includes(twin)) this.say({ type: 'after', what: 'plip', kind: 'splitter', beat, second: true }) })
    }
  }

  /**
   * A splitter met by two zips them back into one: the twin is drawn into the blob, which is fatter for a beat. The
   * twin goes from where and as it was drawn: in a pipe it is a lump in the pipe all the way, and the shlup that ends
   * it is heard through the pipe's wall.
   */
  private merge(): void {
    const [blob, twin] = this.runners
    const from = bodyOf(this, twin)
    this.runners = [blob]
    this.add({ kind: 'zip', x: from.x, y: from.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life: (TWIN_LAG * 60) / this.tempo, half: true, wide: from.wide, tall: from.tall, lump: from.lump, then: () => {
      blob.fat = 0
      this.say({ type: 'after', what: blob.hushed ? 'mlp' : 'shlup', kind: 'splitter', beat: 0, second: false })
    } })
  }

  private mark(kind: Fx['kind'], at: Point, life: number): void {
    this.add({ kind, x: at.x, y: at.y, vx: 0, vy: 0, turn: 0, spin: 0, age: 0, life, half: false })
  }

  private leaveGhosts(before: number): void {
    const blob = this.blob
    for (let n = Math.floor(before / GHOST_EVERY) + 1; n <= Math.floor(this.pos / GHOST_EVERY); n++) {
      // A blob in a pipe, on a wall or thrown by a flip leaves no trail: the trail is the path of a run and a jump.
      // The one it left fades away meanwhile, a copy at a time.
      if (blob.hushed || blob.stuck || blob.flight) {
        this.ghosts.shift()
        continue
      }
      this.ghosts.push({ beats: this.shown(blob), lift: this.liftOf(blob, 1), turn: this.turnOf(blob), ceiling: blob.ceiling })
      if (this.ghosts.length > GHOSTS_KEPT) this.ghosts.shift()
    }
  }

  // --- The two scenes: the clear-out and the pigeon's lap ---------------------------

  /** Any touch ends a scene at once: it lands where it was going, without a sound, and the touch is then an ordinary touch. */
  private endScenes(): void {
    if (this.clearing) {
      // The springs still on the wall let go together and fall as they stand. Should the last such fall still be
      // in the frame, these go one by one.
      const left = this.clearing.queue
      this.clearing = null
      if (!this.dropping) this.dropping = { places: left, y: 0, vy: 0 }
      else for (const sp of left) this.fall(sp)
      this.sceneEnded = true
    }
    if (this.lap) {
      // The pigeon drops straight back to its perch: from where it is, in a move that is seen and not heard.
      const now = this.flying()
      if (now && now.stage !== 'stare') this.homing = { beats: now.beats, out: now.stage === 'fly' ? smoothstep(now.t / LAP_OUT) : 1 - smoothstep(now.t), age: 0 }
      this.lap = null
      this.sceneEnded = true
    }
  }

  /** The clear-out: every spring is off the track at once, in the state and in a save, and comes off the wall one by one. */
  private clear(): void {
    this.say({ type: 'release', act: 'clack' })
    if (this.springs.size === 0) {
      this.cast.cat.ear = 0
      return
    }
    // From the place just ahead of the blob and on round the ring, so the wave runs away from it.
    const first = placeOf(Math.floor(this.pos * 2) + 1)
    const queue: number[] = []
    for (let i = 0; i < PLACES; i++) for (const sp of [(first + i) % PLACES, ((first + i) % PLACES) + PLACES]) if (this.springs.has(sp)) queue.push(sp)
    this.springs.clear()
    this.changed = 2
    this.clearing = { queue, wait: 0 }
    this.cast.cat.fur = 0
    this.say({ type: 'cast', who: 'cat', act: 'fur' })
  }

  private stepClearing(dt: number): void {
    const clearing = this.clearing!
    clearing.wait -= dt
    while (clearing.wait <= 0 && clearing.queue.length > 0) {
      const sp = clearing.queue.shift()!
      this.fall(sp)
      this.say({ type: 'pop', place: sp % PLACES })
      clearing.wait += POP_EVERY
    }
    if (clearing.queue.length === 0) this.clearing = null
  }

  /** A spring comes off the wall with a toss and falls out of the frame. */
  private fall(sp: number): void {
    const place = sp % PLACES, ceiling = sp >= PLACES, foot = onTrack(place / 2, 0, ceiling)
    const out = this.rng.next() - 0.5
    this.fallers.push({ x: foot.x, y: foot.y, vx: out * 160, vy: -150 - this.rng.next() * 80, turn: uprightOn(place / 2, ceiling), spin: out * 14, half: !onBeat(place), age: 0 })
  }

  /** What has come off the wall falls until it is below the frame, and is only then forgotten. */
  private stepFalling(dt: number): void {
    // On a frame that goes on below the stage a spring has further to fall, and falls that much harder: from the top
    // of the ring it is out of any frame in the same time, so a clear-out is as long on a standing tablet as on a
    // lying one, and no more springs are in the air at once.
    const gone = this.bottom + OUT_OF_SIGHT, top = RING.y - RING.floor
    const pull = (GRAVITY * (gone - top)) / (STAGE.height + OUT_OF_SIGHT - top)
    for (let i = this.fallers.length - 1; i >= 0; i--) {
      const faller = this.fallers[i]
      // It is forgotten only after it has been drawn out of the frame: the last place it was seen is under the edge.
      if (faller.y > gone) {
        this.fallers.splice(i, 1)
        continue
      }
      faller.age += dt
      faller.vy += pull * dt
      faller.x += faller.vx * dt
      faller.y += faller.vy * dt
      faller.turn += faller.spin * dt
    }
    const drop = this.dropping
    if (drop) {
      // The highest spring there can be stands at the top of the ring: when that one has been drawn out of the frame, all have.
      if (RING.y - RING.floor - OUT_OF_SIGHT + drop.y > gone) this.dropping = null
      else {
        drop.vy += pull * dt
        drop.y += drop.vy * dt
      }
    }
    if (this.homing) {
      this.homing.age += dt
      if (this.homing.age >= HOME_SECONDS) this.homing = null
    }
  }

  /** The pigeon's lap: it stares, takes off, flies once round the ring ahead of the blob and lands out of breath. Nothing is saved: it changes no field. */
  private startLap(): void {
    const lap = { from: this.pos, flaps: 0 }
    this.lap = lap
    this.say({ type: 'lap', act: 'stare' })
    // Each beat of the scene is raised when the loop gets there, and only while this lap is still the one playing.
    const on = (after: number, run: () => void) => this.moment(lap.from + after, () => { if (this.lap === lap) run() })
    on(LAP.stare, () => this.say({ type: 'lap', act: 'takeoff' }))
    for (let beat = 1; beat < LAP.fly; beat++) on(LAP.stare + beat, () => this.say({ type: 'lap', act: 'flap' }))
    on(LAP.stare + LAP.fly, () => {
      this.cast.pigeon.pant = 0
      this.say({ type: 'lap', act: 'perch' })
    })
    on(LAP.stare + LAP.fly + LAP.land, () => { this.lap = null })
  }

  /** Where the pigeon is in its lap: staring, flying (and at which beat of the ring), or landing. Null when it is on its perch. */
  flying(pos = this.pos): { stage: 'stare' | 'fly' | 'land'; t: number; beats: number } | null {
    const lap = this.lap
    if (!lap) return null
    const e = pos - lap.from
    if (e < LAP.stare) return { stage: 'stare', t: e / LAP.stare, beats: 0 }
    // It starts a beat and a half ahead of the blob and goes once round, at more than twice the blob's speed.
    const start = lap.from + LAP.stare + 1.5
    if (e < LAP.stare + LAP.fly) return { stage: 'fly', t: (e - LAP.stare) / LAP.fly, beats: start + ((e - LAP.stare) / LAP.fly) * BEATS }
    return { stage: 'land', t: Math.min(1, (e - LAP.stare - LAP.fly) / LAP.land), beats: start + BEATS }
  }

  /** The springs the pigeon flies over duck. */
  private flyOver(before: number): void {
    const was = this.flying(before), now = this.flying()
    if (!now || now.stage !== 'fly') return
    const from = was && was.stage === 'fly' ? was.beats : now.beats - 0.01
    for (let half = Math.floor(from * 2) + 1; half <= Math.floor(now.beats * 2); half++) {
      const place = placeOf(half)
      for (const sp of [place, place + PLACES]) if (this.springs.has(sp)) this.ducked[sp] = 0
    }
  }

  // --- The dial ---------------------------------------------------------------------

  private turnDial(at: Point): void {
    const dial = this.dial
    const angle = Math.atan2(at.y - DIAL.y, at.x - DIAL.x)
    let step = angle - dial.last
    if (step > Math.PI) step -= Math.PI * 2
    if (step < -Math.PI) step += Math.PI * 2
    dial.last = angle
    dial.turned += step
    const range = TEMPO.fastest - TEMPO.slowest, sweep = DIAL.to - DIAL.from
    const asked = dial.from + (dial.turned / sweep) * range
    const tempo = Math.round(Math.min(TEMPO.fastest, Math.max(TEMPO.slowest, asked)))
    // A finger that turns on past an end has not wound the dial up: it turns back from the end.
    if (asked !== tempo && (asked > TEMPO.fastest || asked < TEMPO.slowest)) dial.turned = ((tempo - dial.from) / range) * sweep
    if (tempo === this.tempo) return
    if (Math.floor(tempo / 5) !== Math.floor(this.tempo / 5)) this.say({ type: 'dial', act: 'click', tempo })
    // Off the fast end, the pigeon has to shake its head straight.
    if (this.tempo >= TEMPO.fastest) this.cast.pigeon.shake = 0
    this.tempo = tempo
    if (this.changed < 1) this.changed = 1
  }

  // --- Put away ---------------------------------------------------------------------

  /**
   * The loop as a load would find it: whatever a finger held is let go as a taken-away finger lets it go, and a
   * new loop is made from what a save keeps. Nothing that was under way comes with it: no jump, no twin, no pipe,
   * no scene, no held tap, no timer.
   */
  settled(seed: number): Toy {
    this.endDrag(false)
    return new Toy(this.toSave(), seed)
  }

  // --- Short-lived things and the cast -----------------------------------------

  private add(fx: Fx): void {
    this.fx.push(fx)
    if (this.fx.length <= MOST_FX) return
    // The oldest mark that leads to nothing gives way; a thing on its way somewhere is never dropped.
    const oldest = this.fx.findIndex((old) => !old.then && old !== fx)
    if (oldest >= 0) this.fx.splice(oldest, 1)
  }

  private stepFx(dt: number): void {
    for (const fx of [...this.fx]) {
      fx.age += dt
      if (fx.age >= fx.life) {
        const i = this.fx.indexOf(fx)
        if (i >= 0) this.fx.splice(i, 1)
        fx.then?.()
        continue
      }
      if (fx.kind === 'feather' || fx.kind === 'drip') {
        fx.x += fx.vx * dt
        fx.y += fx.vy * dt
        fx.turn += fx.spin * dt
      }
    }
  }

  private stepCast(dt: number): void {
    const { pigeon, rat, cat, camera, neighbour } = this.cast
    pigeon.poke += dt; pigeon.coo += dt; pigeon.puff += dt; pigeon.strut += dt; pigeon.duck += dt; pigeon.apart += dt; pigeon.shake += dt; pigeon.pant += dt
    rat.poke += dt; rat.rattle += dt; rat.smirk += dt; rat.take += dt; rat.hush += dt; rat.sniff += dt
    cat.poke += dt; cat.fur += dt; cat.ear += dt; cat.blink += dt; cat.bat += dt
    camera.poke += dt; camera.nod += dt
    neighbour.poke += dt
    for (const who of ['pigeon', 'rat', 'cat', 'neighbour'] as const) {
      const habit = this.cast[who].habit
      habit.age += dt
      this.rest[who] -= dt
      if (this.rest[who] > 0 || habit.age < HABIT_SECONDS) continue
      // Two habits each, taken in turn with a coin for which comes first, so the same one never plays twice running.
      habit.kind = habit.kind < 0 ? below(this.rng, 2) : 1 - habit.kind
      habit.age = 0
      this.rest[who] = this.nextRest()
    }
  }

  private nextRest(): number {
    return HABIT_REST.least + this.rng.next() * (HABIT_REST.most - HABIT_REST.least)
  }

  private say(event: ToyEvent): void {
    this.events.push(event)
  }
}
