import { cut, inFrame, opening, poke, slitAlong, type Cell, type Face } from './face'
import { rectOf, type Rect } from './fort'
import { MAX_LINE, ON_FLOOR, type FortState } from './fortState'
import { CELL, CUSHION_HALF, FRONT_Z, SCISSORS_REST, SCISSORS_TURN, STRIP, faceToRoom, kindOf, type OnFace, type Vec } from './layout'
import { BABY_IDLES, BABY_LASTS, BABY_REST, CAT_IDLES, CAT_LASTS, CAT_REST, Director, GRAN_IDLES, GRAN_LASTS, GRAN_REST, type CatFit } from './motion'
import { GRAN_IN, LOAF_FROM, PIECE_RUG, babyAt, catSeat, granAt, holeAt, pieceRest, restBox, restBulbs, restCloth, restCushion, restToy, type Cloth, type Hole, type Pose } from './rest'
import { below, makeRng, type Rng } from './rng'
import { Scene, type Beat } from './scene'
import { variantsOf, type SoundId } from './voices'

// The game with no browser in it. It holds one clock, `time`, which only
// `step` moves. Everything seen is a function of that clock, of the saved
// state and of the kicks stamped with the clock; every sound is a cue stamped
// with it too, queued at the very call that starts the motion it belongs to
// (`cue`). So there is no sound without a motion that is seen, and the two
// cannot drift apart.
// What is saved is always where things end up. What is seen gets there: a
// thing that moves is drawn between where it was and where the save has it
// (`tween`), and a scene holds a thing back until the beat that shows it
// (`hold`). Drop every tween and hold, and the picture is the save: that is
// a put-away, and it is a load.
// The finger's part is here (the scissors and the cut); what it carries is
// in hands.ts, and what the cat, the baby and the grandmother do in acts.ts.

/** What a finger can be on. */
export type Target =
  | { kind: 'face'; id: number; cx: number; cy: number }
  | { kind: 'flap'; id: number }
  | { kind: 'cushion'; index: number }
  | { kind: 'toy'; index: number }
  | { kind: 'cat' | 'baby' | 'gran' | 'heap' | 'blanket' | 'roll' | 'lights' | 'switch' | 'tab' | 'hand' | 'air' }
  | { kind: 'piece'; key: number }

export type Who = 'cat' | 'baby' | 'gran'

/** One sound, with the motion that starts with it and the clock time of both. A sound of a scene is hushed when a touch ends the scene. */
export type Cue = { sound: SoundId; variant: number; pitch: number; gain: number; mover: string; at: number; scene: boolean }

/** How one of the three is being shown: a stage of what it is doing, how far through it, and what it is doing it with. */
export type Show = { stage: string; p: number; from: Vec; to: Vec; box: number; hole: Vec; fit: CatFit; /** A count within the stage: which toy, which strip. */ n: number }

/** What the finger carries. */
export type Hand = {
  kind: 'box' | 'cushion' | 'blanket' | 'tape' | 'lights' | 'tab'
  /** The box or the cushion. */
  id: number
  /** Every box that moves with it. */
  members: number[]
  at: Vec
  start: Vec
  /** When the finger let go, or null while it holds. The thing hangs there a moment and a finger can take it again. */
  lifted: number | null
  travelled: number
  /** The corners the string has been drawn over. */
  corners: number[]
  fromHeap: boolean
  /** What lay under the finger when it let go, apart from the thing itself. */
  over: Target
  /** The box the baby lay at before this box was dragged away from it, to put it back there if the box goes back; null otherwise. */
  was: number | null
  /** Where the box in the hand is: it follows the finger, but stops against what stands in its way. */
  pose: { x: number; y: number } | null
  /** Where the baby lies beside one of the boxes in the hand, as it was when they were taken: the boxes keep out of it until they are let go. */
  feet: { left: number; right: number } | null
}

export type Hit = { p: number; sound: SoundId; mover: string; pitch: number }
type Tween = { from: Pose; t0: number; lasts: number; hop: number; hits: Hit[]; fired: number; scene: boolean; /** Set for a box that goes up and over what stands between: how far above where it starts it travels. */ lift: number | null; /** Set for a toy posted into a box: the depth it runs along, just inside the face, until it is past the toys that lie there. */ lane: number | null }
type ClothTween = { from: Cloth; t0: number; lasts: number; hits: Hit[]; fired: number; scene: boolean }
type BulbsTween = { from: Vec[]; t0: number; lasts: number; hits: Hit[]; fired: number; scene: boolean }
type Timer = { at: number; run: () => void }

/** How long the blades take to run a waiting line shut on a box that is about to go, in seconds. */
export const BLADES_S = 0.3

/** A string of lights that was let go: how long after the bulb before it each bulb starts to fall, in seconds. */
const BULB_LAG = 0.012

/** A box that goes up and over: the share of its move in which it rises, and the share by which it is across and has turned. */
export const OVER = { rise: 0.2, across: 0.6 }
/** A box that tips: the seconds it takes, the shares of them at which it comes down (on its edge, over onto its side, and to rest), and how high it springs between them. Each landing is a knock, each lower. */
export const TIP_S = 1
export const TIP_LANDS: readonly number[] = [0.8, 0.92, 1]
const TIP_HOPS = [0.1, 0.04]
/** How far above the highest thing it leaves or comes to the blanket travels on its way. */
const CLOTH_LIFT = 0.15
/** The share of its way by which a cushion on its way has turned to how it will lie. */
export const TURNED_BY = 0.6
/** A toy posted into a box: how far inside the face it runs, and the shares of its way at which it is there and leaves there. */
export const POSTED = { inside: 0.15, by: 0.25, until: 0.75 }
/** The blanket's way: how far through it is up, and how far through it is across. */
const CLOTH_WAY = { up: 0.3, across: 0.7 }
/** Cells of cut for one closing of the blades. */
export const SNIP_CELLS = 14
/** A finger must travel this many cells before the cut grows by a point. */
export const MIN_STEP = 0.8
/**
 * A cut of this many points is finished where it is and the next one begins at once, so the scissors are never
 * refused. A point is at least `MIN_STEP` cells from the one before, so that is sixteen metres of line or more:
 * over twice round the biggest face, which is 7.6 m round. A finger cutting round a whole face never meets it.
 */
export const MAX_PATH = 1600
/** A cut that takes fewer cells than this is a slit, and nothing falls out of it. */
export const PIECE_MIN = 90
/** Cells: how near either end of a waiting line a finger must land to carry on with it. */
export const RESUME_CELLS = 16
/** Cells: a finger that landed within reach of a waiting line and has gone no further than this from where it landed is still a tap, and pokes a peep-hole; further, and it is a drag that takes the line up. */
export const TAP_CELLS = 3
/** Cells: a line that has been this far from where it began closes when it comes back this near to it. */
export const AWAY_CELLS = 10
export const CLOSE_CELLS = 5
/** Cells past the frame of a face at which a line has run out over the box's edge. */
export const OUT_CELLS = 4
/** Cells: the least way round a loop for a line that crosses itself to have closed. */
export const LOOP_CELLS = 16
/** Seconds: a piece tips out and lands; the scissors run back to close a cut; they wait in the air; they go home. */
export const PIECE_FALL = 0.5
export const CLOSE_S = 0.3
export const HOVER_S = 1.2
export const HOME_S = 0.45
/** Seconds a swept piece takes to slide along the rug and under the sofa. */
export const SWEPT_S = 0.8
/** Seconds a thing that was let go hangs where it is before it is set down. */
export const HANG_S = 0.3
/** Seconds the cushions in a box take to shift back out of the cat's way or forward again, and how long they wait before they come forward: until the cat has drawn back from its hole. */
export const SHIFT_S = 0.25
export const SHIFT_WAITS = 0.4
/** Seconds a strip of tape that found no seam stays stuck to the one box, curling, before it springs back. */
export const CURL_S = 0.5
/** The widest round part of a hole, in metres, up to which only an eye fits, up to which a paw does, and from which the cat's body goes through. */
export const EYE_FITS = 0.105
export const PAW_FITS = 0.27
export const BODY_FITS = 0.36
const NEVER = -1e9

export type Stroke = { box: number; path: Cell[]; /** Cells cut so far. */ length: number; movedAt: number; /** It has been far enough from where it began to close by coming back. */ away: boolean; /** Set while a finger that landed within reach of the waiting line has not yet dragged: the end of the line it takes up when it does (true for the end the line began at). */ takes?: boolean }
export type Piece = {
  key: number; box: number; path: Cell[]; disc: boolean; born: number; landed: boolean
  /** When the cat's tail swept it away, or null. */
  swept: number | null
  /** Where its middle comes down along the rug, and where it lies: the same place, but for the disc of a peep-hole, which rolls on its edge from the one to the other. */
  from: number
  lies: number
  /** Half its width as it lies. */
  half: number
  /** How many pieces it lies on. */
  layer: number
  /** Pushed along the rug out of someone's way: where it lay before, and when. */
  slid?: { from: number; at: number }
  /** Where its box hung when it fell out of it, for a box that was let go to tip: the middle of the face along the rug, and its foot. */
  hung?: { x: number; foot: number }
}
/** How many pieces may lie on the rug, the newest among them. One more, and it pushes the oldest off under the sofa as it lands. */
export const MOST_PIECES = 5
/** How far the disc of a peep-hole rolls, and for how long, before it lies down. */
export const DISC_ROLL = { far: 0.5, lasts: 0.5, topple: 0.25 }
export type Scissors = { mode: 'rest' | 'held' | 'closing' | 'hover' | 'home'; at: Vec; from: Vec; to: Vec; /** The cells the blades run to close a cut. */ gap: number; turn: number; since: number; /** They go home as soon as they have run the cut shut, without waiting in the air. */ leaves: boolean }

export const fitOf = (hole: Hole): CatFit => (hole.tunnel || hole.radius >= BODY_FITS ? 'body' : hole.radius < EYE_FITS ? 'eye' : hole.radius < PAW_FITS ? 'paw' : 'head')

const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const ease = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }
const ZERO: Vec = { x: 0, y: 0, z: 0 }

/** Where the stretch a to b crosses the stretch c to d, as a share of a to b; null when they do not cross. */
function crossing(a: Cell, b: Cell, c: Cell, d: Cell): number | null {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx
  if (Math.abs(den) < 1e-9) return null
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null
}

export class Toy {
  time = 0
  /** Sounds queued since the Mount last played them. */
  readonly cues: Cue[] = []
  /** The clock time each motion last started, by its name. */
  readonly kicks = new Map<string, number>()
  /** A touch has just ended a scene: whatever of it still sounds is cut off. The Mount reads it and puts it back. */
  hushed = false
  /** The state changed since the Mount last saved; `urgent` when a scene's outcome is in it. */
  dirty = false
  urgent = false
  /** Faces whose grid changed since the view last read them. */
  readonly recut = new Set<number>()
  /** The face a box shows while it is on its way to the heap, where the save already has fresh board. */
  readonly kept = new Map<number, Face>()
  stroke: Stroke | null = null
  /** The line of a box that hangs before it tips: cut out of its face in the save already, and shown being closed once whoever was on the box is off it. */
  closing: { stroke: Stroke; hung: { x: number; foot: number }; taken: number } | null = null
  piece: Piece | null = null
  /** The piece before that: it lies where it fell until the cat's tail sweeps it under the sofa. */
  olds: Piece[] = []
  readonly scissors: Scissors = { mode: 'rest', at: { ...SCISSORS_REST }, from: { ...SCISSORS_REST }, to: { ...SCISSORS_REST }, gap: 0, turn: SCISSORS_TURN, since: 0, leaves: false }
  hand: Hand | null = null
  /** The strip of tape on its way back to the roll: where its end was, and when it was let go. */
  strip: { from: Vec; since: number; /** Stuck to a box by its end, where it curls before it springs back. */ stuck: boolean } | null = null
  readonly shows: Record<Who, Show>
  /** Where everyone looks while the finger works, and how closely (0 to 1). */
  focus: Vec = { ...SCISSORS_REST }
  watching = 0
  /** What the child has taken up this visit: the idle ladder does not show a move the child has made already. */
  readonly taken = new Set<Hand['kind'] | 'switch'>()
  /** What the idle ladder has shown once this visit, and what it is showing now. */
  readonly shown = new Set<'carry' | 'switch'>()
  demo: 'cut' | 'carry' | 'switch' = 'cut'
  /** Where a second finger landed while the first one works: a scrap jumps there. */
  dab: Vec = { ...SCISSORS_REST }
  /** In the dark, for each box: how many of its holes have lit so far. */
  readonly holesLit = new Map<number, number>()
  /** In the dark: how many lights have come on so far. Everything is lit once the scene is over. */
  lit: number
  pressed = false
  /** Things a scene keeps where they were until the beat that moves them. */
  readonly holds = new Map<string, Pose>()
  /** Where the hand has a thing, for whatever it carries; null for everything else. Set by hands.ts. */
  carriedBy: ((key: string) => Pose | null) | null = null
  /** The blanket, the string of lights and the tape roll while a hand or one of the three has them: each is drawn as its function says. */
  clothBy: (() => Cloth) | null = null
  bulbsBy: (() => Vec[]) | null = null
  rollBy: (() => Pose) | null = null
  /** Toys shown in the baby's hands whatever the save says, until the beat that posts them. */
  readonly withBaby = new Set<number>()
  /** The hole the cat stuck in, which it looks at from a distance afterwards. */
  wary: Vec | null = null
  private readonly tweens = new Map<string, Tween>()
  /** How deep in its box each cushion lay at the last frame: one that now lies deeper or less deep in the same place is seen to go there. */
  private readonly deep = new Map<string, Pose>()
  private clothTween: ClothTween | null = null
  private bulbsTween: BulbsTween | null = null
  private timers: Timer[] = []
  private scene: Scene | null = null
  private inScene = false
  private keys = 0
  readonly chance: Rng
  readonly directors: { cat: Director<(typeof CAT_IDLES)[number]>; baby: Director<(typeof BABY_IDLES)[number]>; gran: Director<(typeof GRAN_IDLES)[number]> }
  readonly idleAt = { cat: 0, baby: 0, gran: 0 }

  constructor(readonly state: FortState, seed: number) {
    this.chance = makeRng(seed)
    this.directors = {
      cat: new Director(CAT_IDLES, CAT_LASTS, CAT_REST, makeRng(seed + 1), 1.6),
      baby: new Director(BABY_IDLES, BABY_LASTS, BABY_REST, makeRng(seed + 2), 0.6),
      gran: new Director(GRAN_IDLES, GRAN_LASTS, GRAN_REST, makeRng(seed + 3), 2.6),
    }
    // Found as left: everyone is where the save has them, the room is as dark as it was left, and nothing plays.
    this.shows = { cat: this.restShow('cat'), baby: this.restShow('baby'), gran: this.restShow('gran') }
    this.lit = state.dark ? 99 : 0
  }

  get sceneRunning(): boolean {
    return this.scene !== null
  }

  /** Seconds since the motion of that name last started; very large when it never did. */
  age(mover: string): number {
    return this.time - (this.kicks.get(mover) ?? NEVER)
  }

  /** How dark the room is drawn, 0 to 1: it dims when the switch is flicked off, and is light at once when it is flicked on. */
  dusk(): number {
    return this.state.dark ? Math.min(1, this.age('switch') / 0.6) : 0
  }

  kick(mover: string): void {
    this.kicks.set(mover, this.time)
  }

  /** Starts a motion and the sound that belongs to it, at one clock time. */
  cue(sound: SoundId, mover: string, pitch = 1, gain = 1): void {
    this.kick(mover)
    this.cues.push({ sound, variant: below(this.chance, variantsOf(sound)), pitch, gain, mover, at: this.time, scene: this.inScene })
  }

  /** Runs `run` after `delay` seconds of the clock. A put-away drops it. */
  after(delay: number, run: () => void): void {
    this.timers.push({ at: this.time + delay, run })
  }

  changed(urgent = false): void {
    this.dirty = true
    this.urgent = this.urgent || urgent
  }

  // --- Where things are drawn -----------------------------------------------

  restOf(key: string): Pose {
    const [kind, n] = key.split(':'), index = Number(n)
    return kind === 'box' ? restBox(this.state, index) : kind === 'cushion' ? restCushion(this.state, index) : restToy(this.state, index)
  }

  /** Where a box, a cushion or a toy is drawn now. */
  poseOf(key: string): Pose {
    const held = this.carriedBy?.(key) ?? this.holds.get(key)
    if (held) return held
    const rest = this.restOf(key), tween = this.tweens.get(key)
    if (!tween) return rest
    const p = Math.min(1, (this.time - tween.t0) / tween.lasts), e = ease(p), from = tween.from
    if (tween.lift !== null) {
      // Up, over, and down: it rises where it is, travels and turns above everything that stands between, and comes straight down onto its place.
      // One that tips is down early, and springs up twice, less each time, before it lies still.
      const tips = Math.abs(rest.side - from.side) > 0.5, down = tips ? TIP_LANDS[0] : 1, spring = p < TIP_LANDS[1] ? 0 : 1
      const high = Math.max(from.y + tween.lift, rest.y), across = ease((p - OVER.rise) / (OVER.across - OVER.rise)), fall = Math.min(1, Math.max(0, (p - OVER.across) / (down - OVER.across)))
      const sprung = p > down ? TIP_HOPS[spring] * Math.sin((Math.PI * (p - TIP_LANDS[spring])) / (TIP_LANDS[spring + 1] - TIP_LANDS[spring])) : 0
      const y = p < OVER.across ? mix(from.y, high, ease(p / OVER.rise)) : mix(high, rest.y, fall * fall) + sprung
      return { x: mix(from.x, rest.x, across), y, z: mix(from.z, rest.z, across), flat: mix(from.flat, rest.flat, across), side: mix(from.side, rest.side, across) }
    }
    // A cushion has turned the way it will lie before it is there: it comes in beside its neighbours, not through them.
    const turned = key.startsWith('cushion:') ? ease(p / TURNED_BY) : e
    // A posted toy runs along just inside the face and goes back to its place only once it is beside it, past the toys that lie there.
    const z = tween.lane === null ? mix(from.z, rest.z, e) : p < POSTED.by ? mix(from.z, tween.lane, p / POSTED.by) : p < POSTED.until ? tween.lane : mix(tween.lane, rest.z, (p - POSTED.until) / (1 - POSTED.until))
    return { x: mix(from.x, rest.x, e), y: mix(from.y, rest.y, e) + Math.sin(p * Math.PI) * tween.hop, z, flat: mix(from.flat, rest.flat, turned), side: mix(from.side, rest.side, e) }
  }

  /** How far a box is from where it stands, while a finger carries it or it is on its way: whoever is on it or in it rides with it. Null when it is at rest. */
  rideBy(box: number): Vec | null {
    const now = this.poseOf(`box:${box}`), rest = this.restOf(`box:${box}`)
    const shift = { x: now.x - rest.x, y: now.y - rest.y, z: now.z - rest.z }
    return Math.abs(shift.x) + Math.abs(shift.y) + Math.abs(shift.z) < 1e-9 ? null : shift
  }

  /** How far a thing is through its move, 0 to 1; 1 when it is not moving. */
  moving(key: string): number {
    const tween = this.tweens.get(key)
    return tween ? Math.min(1, (this.time - tween.t0) / tween.lasts) : 1
  }

  /** A thing moves from `from` to where the save now has it. `hits` are heard as it passes them: a landing is heard when it lands. */
  tween(key: string, from: Pose, lasts: number, hop = 0, hits: Hit[] = [], lift: number | null = null, lane: number | null = null): void {
    this.holds.delete(key)
    this.tweens.set(key, { from, t0: this.time, lasts, hop, hits, fired: 0, scene: this.inScene, lift, lane })
  }

  /** Every box, cushion and toy as it is drawn now, to move it from there once the save has changed. */
  drawn(): Map<string, Pose> {
    const all = new Map<string, Pose>()
    for (const box of this.state.boxes) all.set(`box:${box.id}`, this.poseOf(`box:${box.id}`))
    this.state.cushions.forEach((_, i) => all.set(`cushion:${i}`, this.poseOf(`cushion:${i}`)))
    this.state.toys.forEach((_, i) => all.set(`toy:${i}`, this.poseOf(`toy:${i}`)))
    return all
  }

  /** After the save has changed: whatever now rests somewhere else is held where it was drawn, for a beat or a tween to move. */
  holdMoved(before: Map<string, Pose>, except: readonly string[] = []): string[] {
    const moved: string[] = []
    for (const [key, was] of before) {
      const now = this.restOf(key)
      if (except.includes(key) || (Math.abs(now.x - was.x) + Math.abs(now.y - was.y) + Math.abs(now.z - was.z) + Math.abs(now.flat - was.flat) + Math.abs(now.side - was.side) < 0.004)) continue
      this.tweens.delete(key)
      this.holds.set(key, was)
      moved.push(key)
    }
    return moved
  }

  /** The blanket as it is drawn now. */
  cloth(): Cloth {
    if (this.clothBy) return this.clothBy()
    const rest = restCloth(this.state), tween = this.clothTween
    if (!tween) return rest
    // It goes up, across and down: every point of it rises above the highest place it leaves or comes to, travels at
    // that height, and comes straight down. So it never passes through a box it slides off or one it is thrown over.
    const p = Math.min(1, (this.time - tween.t0) / tween.lasts), from = tween.from
    // Where the cat sits on a lid it travels over, it travels over the cat.
    const seat = this.state.cat.at === 'top' ? catSeat(this.state) : null, left = Math.min(from.xs[0], rest.xs[0]) - 0.4, right = Math.max(from.xs[from.xs.length - 1], rest.xs[rest.xs.length - 1]) + 0.4
    const cat = seat && seat.x > left && seat.x < right ? seat.y + (seat.y >= LOAF_FROM ? 0.85 : 1.35) : 0
    // It travels with the shorter of the two hangs, and that hem too is above everything: over a box its hem is never down in the lid.
    const hem = Math.min(from.hang, rest.hang), high = Math.max(...from.ys, ...rest.ys, cat) + CLOTH_LIFT + hem
    const up = ease(p / CLOTH_WAY.up), across = ease((p - CLOTH_WAY.up) / (CLOTH_WAY.across - CLOTH_WAY.up)), down = ease((p - CLOTH_WAY.across) / (1 - CLOTH_WAY.across))
    return { xs: rest.xs.map((x, i) => mix(from.xs[i], x, across)), ys: rest.ys.map((y, i) => (p < CLOTH_WAY.across ? mix(from.ys[i], high, up) : mix(high, y, down))), front: mix(from.front, rest.front, across), back: mix(from.back, rest.back, across), hang: across < 0.5 ? mix(from.hang, hem, ease(across / 0.5)) : mix(hem, rest.hang, ease((across - 0.5) / 0.5)) }
  }

  clothTo(from: Cloth, lasts: number, hits: Hit[] = []): void {
    this.clothBy = null
    this.clothTween = { from, t0: this.time, lasts, hits, fired: 0, scene: this.inScene }
  }

  /** How far the blanket is through its move, 0 to 1; 1 when it lies still. */
  clothMoved(): number {
    return this.clothTween ? Math.min(1, (this.time - this.clothTween.t0) / this.clothTween.lasts) : 1
  }

  /** The bulbs of the string as they are drawn now. */
  bulbs(): Vec[] {
    if (this.bulbsBy) return this.bulbsBy()
    const rest = restBulbs(this.state), fall = this.bulbsTween
    if (!fall) return rest
    // Let go, it falls: one bulb after another along the string, each out towards where it will lie first and down faster and faster.
    const span = Math.max(0.05, fall.lasts - BULB_LAG * (rest.length - 1))
    return rest.map((to, n) => {
      const from = fall.from[n] ?? to, p = Math.min(1, Math.max(0, (this.time - fall.t0 - n * BULB_LAG) / span)), out = 1 - (1 - p) * (1 - p), down = p * p
      return { x: mix(from.x, to.x, out), y: mix(from.y, to.y, down), z: mix(from.z, to.z, out) }
    })
  }

  /** The string goes from where it is drawn (`from`, bulb by bulb) to where the save has it, in `lasts` seconds, with what sounds on the way. */
  bulbsTo(from: Vec[], lasts: number, hits: Hit[] = []): void {
    this.bulbsBy = null
    this.bulbsTween = { from, t0: this.time, lasts, hits, fired: 0, scene: this.inScene }
  }

  /** The string is where the save has it from this frame: a hand has taken it. */
  bulbsStill(): void {
    this.bulbsTween = null
  }

  // --- The three ---------------------------------------------------------------

  /** How one of the three is shown when nothing is happening: where the save has them. */
  restShow(who: Who): Show {
    const state = this.state, show: Show = { stage: 'sit', p: 1, from: ZERO, to: ZERO, box: 0, hole: ZERO, fit: 'eye', n: 0 }
    if (who === 'cat') {
      const cat = state.cat, hole = cat.at === 'top' || cat.at === 'rug' ? null : holeAt(state, cat.box, cat.cell)
      show.stage = cat.at
      show.to = catSeat(state)
      show.box = cat.box
      if (hole) { show.hole = hole.at; show.fit = cat.at === 'look' ? (fitOf(hole) === 'body' ? 'head' : fitOf(hole)) : fitOf(hole) }
      else if (cat.at === 'in') { const rect = rectOf(state, cat.box); if (rect) show.hole = { x: rect.x, y: rect.foot + rect.h * 0.45, z: FRONT_Z } }
    } else if (who === 'baby') {
      show.stage = state.baby >= 0 ? 'in' : 'sit'
      show.to = babyAt(state)
      show.box = Math.max(0, state.baby)
    } else {
      show.stage = state.gran.at
      show.to = granAt(state)
      show.box = state.gran.box
    }
    show.from = show.to
    return show
  }

  /** A box as it stands, or null. */
  rect(id: number): Rect | null {
    return rectOf(this.state, id)
  }

  // --- Scenes -------------------------------------------------------------------

  /**
   * Plays a scene: its outcome is already in the state and is saved at once. `poses` show the three on their way
   * there; `sounds` are heard only when their moment is watched, each with the motion `run` starts. A touch ends
   * it: every pose lands, nothing more is heard, and everyone is where the save has them.
   */
  play(poses: { who: Who; at: number; lasts: number; stage: string; set?: Partial<Show> }[], sounds: { at: number; sound?: SoundId; mover?: string; pitch?: number; run?: (finishing: boolean) => void }[]): void {
    this.endScene(true)
    this.changed(true)
    const beats: Beat[] = [
      ...poses.map(({ who, at, lasts, stage, set }): Beat => {
        let began = false
        return { at, lasts, play: (p, finishing) => {
          if (finishing) return
          const show = this.shows[who]
          if (!began) { began = true; if (set) Object.assign(show, set) }
          show.stage = stage; show.p = p
        } }
      }),
      ...sounds.map(({ at, sound, mover, pitch, run }): Beat => ({ at, lasts: 0, play: (_, finishing) => {
        this.inScene = true
        run?.(finishing)
        if (!finishing && sound && mover) this.cue(sound, mover, pitch ?? 1)
        this.inScene = false
      } })),
    ]
    this.scene = new Scene(beats)
    this.inScene = true
    this.scene.start(this.time, () => {})
    this.inScene = false
    this.scene.update(this.time)
    // What the scene's first beat moved in the save is seen to move from this frame, not from the next.
    this.shiftCushions()
  }

  /** Ends the scene that is playing. By a touch, it lands unwatched and is silent from this frame. */
  endScene(byTouch: boolean): void {
    if (!this.scene) return
    if (byTouch) { this.scene.finish(); this.hushed = true }
    this.scene = null
    // Everyone and everything is where the save has them. Ended by a touch, what the scene was still moving has landed; ended by itself, a thing on its last stretch finishes it.
    if (byTouch) {
      for (const [key, tween] of this.tweens) if (tween.scene) this.tweens.delete(key)
      if (this.clothTween?.scene) this.clothTween = null
      if (this.bulbsTween?.scene) this.bulbsTween = null
    }
    this.holds.clear()
    this.withBaby.clear()
    if (this.hand?.kind !== 'blanket') this.clothBy = null
    if (this.hand?.kind !== 'lights') this.bulbsBy = null
    this.rollBy = null
    this.strip = null
    for (const who of ['cat', 'baby', 'gran'] as const) this.shows[who] = this.restShow(who)
    this.lit = this.state.dark ? 99 : 0
    if (byTouch) for (let i = this.cues.length - 1; i >= 0; i--) if (this.cues[i].scene) this.cues.splice(i, 1)
  }

  /** The three are shown again as the save has them, after something outside a scene moved them. */
  restAll(): void {
    if (this.scene) return
    for (const who of ['cat', 'baby', 'gran'] as const) this.shows[who] = this.restShow(who)
  }

  // --- The scissors and the cut ---------------------------------------------------

  /** How far open the blades are, 0 shut to 1 wide: shut at every snip. */
  bladeOpen(): number {
    const { mode, since, gap } = this.scissors, bitten = this.age('blades')
    // Lying on the rug they are half open.
    if (mode === 'rest' || mode === 'home') return 0.5
    if (mode === 'hover') return Math.min(0.5, 0.2 + (this.time - since) * 2)
    if (mode === 'closing') { const phase = ((gap * Math.min(1, (this.time - since) / CLOSE_S)) % SNIP_CELLS) / SNIP_CELLS; return 1 - Math.abs(phase * 2 - 1) }
    if (this.stroke) {
      const phase = (this.stroke.length % SNIP_CELLS) / SNIP_CELLS
      return Math.max(1 - Math.abs(phase * 2 - 1), 1 - bitten / 0.06)
    }
    // In the air the blades close twice.
    return Math.min(1, Math.abs(bitten) / 0.04, Math.abs(bitten - 0.11) / 0.04)
  }

  /** The line that waits, as a stroke the scissors can carry on with. */
  private waiting(reversed: boolean): Stroke | null {
    const line = this.state.line
    if (!line) return null
    const path: Cell[] = []
    for (let i = 0; i + 1 < line.path.length; i += 2) path.push({ x: line.path[i], y: line.path[i + 1] })
    if (reversed) path.reverse()
    let length = 0, away = false
    for (let i = 1; i < path.length; i++) {
      length += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
      away = away || Math.hypot(path[i].x - path[0].x, path[i].y - path[0].y) >= AWAY_CELLS
    }
    return { box: line.box, path, length, movedAt: this.time, away }
  }

  /**
   * The blades bite into a face where the finger landed. Within reach of either end of a line that waits there,
   * the line goes on waiting: a finger that then drags takes it up from that end (`cutTo`), and one that lifts
   * has poked a peep-hole beside it. The scissors keep one line open: a bite anywhere else first finishes the
   * waiting one the short way, and the hole that makes is returned.
   */
  begin(at: { id: number; cx: number; cy: number }, bite = true): Hole | null {
    const rect = this.rect(at.id)
    if (!rect) return null
    let finished: Hole | null = null, takes: boolean | undefined
    const line = this.state.line
    if (line) {
      const n = line.path.length, toEnd = Math.hypot(at.cx - line.path[n - 2], at.cy - line.path[n - 1]), toStart = Math.hypot(at.cx - line.path[0], at.cy - line.path[1])
      const near = line.box === at.id && Math.min(toEnd, toStart) <= RESUME_CELLS
      if (near) takes = toStart < toEnd
      else {
        this.stroke = this.waiting(false)
        this.state.line = null
        this.changed()
        finished = this.commit()
      }
    }
    const start = inFrame(this.state.boxes[at.id].face, { x: at.cx, y: at.cy })
    this.stroke = { box: at.id, path: [start], length: 0, movedAt: this.time, away: false, takes }
    this.holdScissors(faceToRoom(rect, start.x, start.y))
    if (!bite) return finished
    // The box shudders with the bite.
    this.kick(`box:${at.id}`)
    this.cue('bite', 'blades')
    return finished
  }

  holdScissors(at: Vec): void {
    this.scissors.mode = 'held'
    this.scissors.at = at
  }

  /**
   * The finger moves with the scissors in it. `face` is the face under it, if any. Returns the hole when this
   * move made one: the line closed on itself, came back to where it began, or ran out over the box's edge.
   */
  cutTo(at: Vec, face: OnFace | null): Hole | null {
    let stroke = this.stroke
    if (!stroke) {
      if (this.scissors.mode !== 'held') return null
      // Scissors that were snipping the air cut where they meet board.
      if (face) return this.begin(face)
      this.holdScissors({ ...at, z: FRONT_Z + 0.08 })
      return null
    }
    const rect = this.rect(stroke.box)!, board = this.state.boxes[stroke.box].face
    const raw = { x: (at.x - (rect.x - rect.w / 2)) / CELL, y: (at.y - rect.foot) / CELL }
    const cell = inFrame(board, raw)
    if (stroke.takes !== undefined) {
      // Landed within reach of the line that waits: until it has dragged it is a tap. Dragged, it takes the line up from the end it landed near.
      if (Math.hypot(cell.x - stroke.path[0].x, cell.y - stroke.path[0].y) < TAP_CELLS) return null
      const carried = this.waiting(stroke.takes)
      if (carried) { this.stroke = stroke = carried; this.state.line = null; this.changed() }
      else stroke.takes = undefined
    }
    const first = stroke.path[0], last = stroke.path[stroke.path.length - 1], step = Math.hypot(cell.x - last.x, cell.y - last.y)
    // Over the edge of the box the blades have nothing more to cut: the line ends there, closed the short way.
    const out = Math.max(-raw.x, raw.x - board.cols, -raw.y, raw.y - board.rows) > OUT_CELLS
    if (step < MIN_STEP) return out && stroke.path.length >= 2 ? this.commit() : null
    const before = Math.floor(stroke.length / SNIP_CELLS)
    stroke.length += step
    this.scissors.at = faceToRoom(rect, cell.x, cell.y)
    this.scissors.turn = Math.atan2(cell.y - last.y, cell.x - last.x)
    // One closing of the blades for each stretch of cut, higher the faster the finger goes.
    if (Math.floor(stroke.length / SNIP_CELLS) > before) this.cue('snip', 'cut', Math.min(1.35, 0.85 + step / Math.max(1 / 120, this.time - stroke.movedAt) / 500))
    stroke.movedAt = this.time
    // The line closes where it crosses itself: what it went round falls, and the stretch that led there is a slit.
    for (let i = stroke.path.length - 3; i >= 0; i--) {
      const t = crossing(last, cell, stroke.path[i], stroke.path[i + 1])
      if (t === null) continue
      const meet = { x: last.x + (cell.x - last.x) * t, y: last.y + (cell.y - last.y) * t }
      // A wiggle back over the line is not a closing: the loop must go round something.
      let round = Math.hypot(meet.x - last.x, meet.y - last.y) + Math.hypot(stroke.path[i + 1].x - meet.x, stroke.path[i + 1].y - meet.y)
      for (let k = i + 2; k < stroke.path.length; k++) round += Math.hypot(stroke.path[k].x - stroke.path[k - 1].x, stroke.path[k].y - stroke.path[k - 1].y)
      if (round < LOOP_CELLS) break
      const lead = stroke.path.slice(0, i + 1)
      stroke.path = [meet, ...stroke.path.slice(i + 1), meet]
      return this.commit(lead.length > 0 ? [...lead, meet] : null)
    }
    stroke.path.push(cell)
    stroke.away = stroke.away || Math.hypot(cell.x - first.x, cell.y - first.y) >= AWAY_CELLS
    if ((stroke.away && Math.hypot(cell.x - first.x, cell.y - first.y) <= CLOSE_CELLS) || out) return this.commit()
    if (stroke.path.length >= MAX_PATH) {
      const hole = this.commit()
      this.begin({ id: rect.id, cx: cell.x, cy: cell.y }, false)
      return hole
    }
    return null
  }

  /**
   * The finger lifts off a cut. A touch that went nowhere pokes a peep-hole. A line that has not closed waits
   * where it stopped, in the save, and the scissors hang there a moment and go home. Returns the peep-hole, or null.
   */
  liftCut(): Hole | null {
    const stroke = this.stroke
    if (!stroke) { this.release(); return null }
    if (stroke.path.length < 3 && stroke.length < 3) return this.commit()
    this.wait()
    return null
  }

  /** The line the finger was cutting waits on its face. */
  wait(): void {
    const stroke = this.stroke
    this.stroke = null
    this.release()
    if (!stroke || stroke.path.length < 2 || stroke.length < 3) return
    const every = Math.max(1, Math.ceil(stroke.path.length / MAX_LINE)), path: number[] = []
    stroke.path.forEach((cell, i) => { if (i % every === 0 || i === stroke.path.length - 1) path.push(Math.round(cell.x * 10) / 10, Math.round(cell.y * 10) / 10) })
    this.state.line = { box: stroke.box, path }
    this.changed()
  }

  /** The scissors are let go of in the air: they wait where they are, then go home. */
  release(): void {
    if (this.scissors.mode !== 'held') return
    this.scissors.mode = 'hover'
    this.scissors.since = this.time
  }

  /**
   * A box leaves where it stands while a line waits on its face: let go to tip, folded onto the heap, or taken
   * by a pull of the tape end. The line is never dropped. It is closed the short way where the box hangs or
   * stands (`hung`: the middle of its face along the rug, and its foot), before the box goes. What the line
   * encloses is gone from the face in the save at once. It is shown `delay` seconds on, once whoever was on
   * the box is off it: the blades are seen and heard to run the line shut and the piece falls out, so no piece
   * ever falls from a face that showed no line. Until then the line is drawn where it waited.
   */
  closeLine(hung: { x: number; foot: number }, delay: number): void {
    if (this.takeLine(hung)) this.after(delay, () => this.shutLine(true))
  }

  /** The first half of `closeLine`: the waiting line is out of the save and its cut is in the face, still to be shown. Returns whether a line waited. */
  takeLine(hung: { x: number; foot: number }): boolean {
    const stroke = this.waiting(false)
    if (!stroke) return false
    this.state.line = null
    this.changed()
    this.closing = { stroke, hung, taken: cut(this.state.boxes[stroke.box].face, stroke.path) }
    return true
  }

  /** The second half: the blades run the line shut and its piece falls. Not `seen` (a touch ended the scene it belongs to), the face only shows what the save holds. */
  shutLine(seen: boolean): void {
    const closing = this.closing
    if (!closing) return
    this.closing = null
    if (!seen) { this.recut.add(closing.stroke.box); return }
    this.stroke = closing.stroke
    this.cue('bite', 'blades')
    this.commit(null, closing)
  }

  /**
   * A box on its way to the heap shows its face as it was, holes and all, until it lies there folded; the save
   * has it as fresh board from the moment it was let go. `keepFace` keeps the picture, `fresh` lets it go.
   */
  keepFace(id: number): void {
    const face = this.state.boxes[id].face
    this.kept.set(id, { cols: face.cols, rows: face.rows, gone: face.gone.slice() })
  }

  fresh(id: number): void {
    if (this.kept.delete(id)) this.recut.add(id)
  }

  /** The cut is made: what the line encloses is gone from the face, and the scissors run the short way back to where it began. Returns the hole, or null. `closing` is given for a box that hangs before it tips: where it hangs, and the cells its line has taken already. */
  commit(lead: Cell[] | null = null, closing: { hung: { x: number; foot: number }; taken: number } | null = null): Hole | null {
    const hung = closing?.hung ?? null
    const stroke = this.stroke!, box = this.state.boxes[stroke.box], rect = hung ? { id: stroke.box, ...hung } : this.rect(stroke.box)!, first = stroke.path[0], last = stroke.path[stroke.path.length - 1]
    this.stroke = null
    const scissors = this.scissors
    scissors.mode = 'closing'
    scissors.since = this.time
    scissors.from = faceToRoom(rect, last.x, last.y)
    scissors.to = faceToRoom(rect, first.x, first.y)
    scissors.gap = Math.hypot(first.x - last.x, first.y - last.y)
    const poked = stroke.path.length < 3 && stroke.length < 3
    const taken = closing ? closing.taken : (poked ? poke(box.face, first) : cut(box.face, stroke.path)) + (lead ? slitAlong(box.face, lead) : 0)
    // From a box that hangs they do not wait in the air: they go home as soon as the line is shut.
    scissors.leaves = hung !== null
    // A cut inside a hole meets no board.
    if (taken === 0) return null
    this.recut.add(box.id)
    this.changed()
    if (poked) this.cue('pop', `box:${box.id}`)
    if (poked || taken >= PIECE_MIN) {
      // The piece of the cut before lies where it fell until the cat's tail has swept it away; one that is still there when a third falls is swept at once.
      this.sweep()
      const rest = pieceRest(stroke.path, poked, rect.x - kindOf(box.id).w / 2), half = (rest.wide * rest.small) / 2
      // The disc of a peep-hole rolls on its edge to the side where the rug is bare; with a piece in its way on both sides it lies down where it lands.
      const bare = (to: number): boolean => this.olds.every((old) => old.swept !== null || old.lies + old.half + half + 0.03 < Math.min(rest.lies, to) || old.lies - old.half - half - 0.03 > Math.max(rest.lies, to))
      const rolls = [rest.lies + DISC_ROLL.far, rest.lies - DISC_ROLL.far].map((to) => Math.max(PIECE_RUG.left + half, Math.min(PIECE_RUG.right - half, to))).find(bare) ?? rest.lies
      let lies = poked ? rolls : rest.lies, from = rest.lies
      // Where the grandmother's legs stick out of a door, it comes down beside them, not on them.
      const legs = this.state.gran.at === 'in' ? granAt(this.state).x : null
      if (legs !== null) {
        const reach = GRAN_IN.legs + half + 0.04, beside = (x: number): number => (Math.abs(x - legs) >= reach ? x : Math.max(PIECE_RUG.left + half, Math.min(PIECE_RUG.right - half, legs + (rest.lies < legs ? -reach : reach))))
        from = beside(from)
        lies = poked && (from - legs) * (lies - legs) < 0 ? from : beside(lies)
      }
      // It lies on whatever piece is already there.
      const under = this.olds.filter((old) => old.swept === null && Math.abs(old.lies - lies) < old.half + half + 0.02)
      this.piece = { key: ++this.keys, box: box.id, path: stroke.path, disc: poked, born: this.time, landed: false, swept: null, from, lies, half, layer: under.reduce((most, old) => Math.max(most, old.layer + 1), 0), ...(hung ? { hung } : {}) }
      this.clearStrip((from + lies) / 2, half + Math.abs(lies - from) / 2)
    }
    if (hung) return null
    const open = opening(box.face, Math.floor(first.y) * box.face.cols + Math.floor(first.x))
    return open ? holeAt(this.state, box.id, open.cell) : null
  }

  /** The piece on the rug becomes the older one, which the cat's tail sweeps away. */
  sweep(): void {
    if (this.piece) this.olds.push(this.piece)
    this.piece = null
  }

  /** The oldest piece that waits for the cat's tail. */
  get old(): Piece | null {
    return this.olds.find((old) => old.swept === null) ?? null
  }

  /** The piece a finger found, by its key. */
  pieceOf(key: number): Piece | null {
    return this.piece?.key === key ? this.piece : this.olds.find((old) => old.key === key) ?? null
  }

  /** The cat's tail has swept the older piece: it slides off under the sofa. */
  sweepNow(): void {
    for (const old of this.olds) old.swept ??= this.time
  }

  /**
   * Something comes down on the strip of rug in front of the faces, or someone crosses it, `half` to either side
   * of `x`: a cushion that lies there slides to the nearer side that has room, `delay` seconds slower.
   * Where each ends up is in the save at once.
   */
  clearStrip(x: number, half: number, delay = 0): void {
    const state = this.state
    state.cushions.forEach((where, index) => {
      if (where !== ON_FLOOR) return
      const lies = state.cushionAt[index] / 100, reach = half + CUSHION_HALF + 0.04
      if (Math.abs(lies - x) >= reach) return
      const sides = [x - reach, x + reach].filter((to) => to >= STRIP.left && to <= STRIP.right).sort((a, b) => Math.abs(a - lies) - Math.abs(b - lies))
      if (sides.length === 0) return
      const key = `cushion:${index}`, was = this.poseOf(key)
      state.cushionAt[index] = Math.round(sides[0] * 100)
      this.changed()
      this.tween(key, was, 0.2 + delay, 0.06, [{ p: 1, sound: 'puff', mover: key, pitch: 1.2 }])
    })
  }

  /**
   * Someone comes down onto the strip of rug in front of the faces, `half` to either side of `x`: a fallen piece
   * that lies there is pushed along the rug to the nearer side, and is heard and seen to go.
   */
  clearPieces(x: number, half: number): void {
    const lying = [...this.olds.filter((old) => old.swept === null), ...(this.piece ? [this.piece] : [])]
    for (const piece of lying) {
      const reach = half + piece.half + 0.03
      if (Math.abs(piece.lies - x) >= reach) continue
      const sides = [x - reach, x + reach].filter((to) => to >= PIECE_RUG.left + piece.half && to <= PIECE_RUG.right - piece.half).sort((a, b) => Math.abs(a - piece.lies) - Math.abs(b - piece.lies))
      if (sides.length === 0) continue
      piece.slid = { from: piece.lies, at: this.time }
      piece.lies = sides[0]
      piece.from = sides[0]
      // Where it goes it lies on whatever piece is already there.
      piece.layer = lying.filter((other) => other !== piece && Math.abs(other.lies - piece.lies) < other.half + piece.half + 0.02).reduce((most, other) => Math.max(most, other.layer + 1), 0)
      this.cue('scrape', `piece:${piece.key}`, 1.2, 0.4)
    }
  }

  // --- Time ------------------------------------------------------------------------

  private hits(tween: { t0: number; lasts: number; hits: Hit[]; fired: number; scene: boolean }): boolean {
    const p = Math.min(1, (this.time - tween.t0) / tween.lasts)
    // What a scene set moving sounds as part of the scene: a touch that ends the scene hushes it.
    this.inScene = tween.scene
    while (tween.fired < tween.hits.length && p >= tween.hits[tween.fired].p) {
      const hit = tween.hits[tween.fired++]
      this.cue(hit.sound, hit.mover, hit.pitch)
    }
    this.inScene = false
    return p >= 1
  }

  /**
   * The cushions in a box lie further back while the cat is at a hole of it, and come forward again when it has
   * gone. Wherever the save moves them so, they are seen and heard to go: back at once, before the cat is there,
   * and forward only once the cat has drawn back out of their way.
   */
  private shiftCushions(): void {
    this.state.cushions.forEach((where, index) => {
      const key = `cushion:${index}`
      if (where < 0) { this.deep.delete(key); return }
      const rest = this.restOf(key), was = this.deep.get(key)
      this.deep.set(key, rest)
      if (!was || this.tweens.has(key) || this.holds.has(key) || this.carriedBy?.(key)) return
      if (Math.abs(rest.x - was.x) + Math.abs(rest.y - was.y) > 0.004 || Math.abs(rest.z - was.z) < 0.004) return
      if (rest.z < was.z) { this.tween(key, was, SHIFT_S); this.cue('puff', key, 0.9, 0.3); return }
      this.holds.set(key, was)
      this.after(SHIFT_WAITS, () => { if (this.holds.get(key) === was) { this.tween(key, was, SHIFT_S); this.cue('puff', key, 0.9, 0.3) } })
    })
  }

  /** Plays `dt` seconds. */
  step(dt: number): void {
    this.time += dt
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.endScene(false)
    }
    const due = this.timers.filter((timer) => timer.at <= this.time)
    this.timers = this.timers.filter((timer) => timer.at > this.time)
    for (const timer of due) timer.run()
    this.shiftCushions()
    for (const [key, tween] of this.tweens) if (this.hits(tween)) this.tweens.delete(key)
    if (this.clothTween && this.hits(this.clothTween)) this.clothTween = null
    if (this.bulbsTween && this.hits(this.bulbsTween)) this.bulbsTween = null
    if (this.strip && this.time - this.strip.since > (this.strip.stuck ? CURL_S : 0) + 0.18) this.strip = null
    const scissors = this.scissors
    if (scissors.mode === 'closing') {
      // The scissors run the short way back, snipping as they go.
      const now = Math.min(1, (this.time - scissors.since) / CLOSE_S), before = Math.max(0, now - dt / CLOSE_S)
      if (Math.floor((scissors.gap * now) / SNIP_CELLS) > Math.floor((scissors.gap * before) / SNIP_CELLS)) this.cue('snip', 'cut', 1.3)
      scissors.at = { x: mix(scissors.from.x, scissors.to.x, now), y: mix(scissors.from.y, scissors.to.y, now), z: scissors.to.z }
      if (scissors.gap > 0.01) scissors.turn = Math.atan2(scissors.to.y - scissors.from.y, scissors.to.x - scissors.from.x)
      if (now >= 1) { scissors.mode = scissors.leaves ? 'home' : 'hover'; scissors.since = this.time; scissors.from = { ...scissors.at }; scissors.leaves = false }
    } else if (scissors.mode === 'hover' && this.time - scissors.since >= HOVER_S) {
      scissors.mode = 'home'
      scissors.since = this.time
      scissors.from = { ...scissors.at }
    } else if (scissors.mode === 'home' && this.time - scissors.since >= HOME_S) {
      scissors.mode = 'rest'
      scissors.at = { ...SCISSORS_REST }
      scissors.turn = SCISSORS_TURN
      this.cue('clack', 'scissors')
    }
    const piece = this.piece
    if (piece && !piece.landed && this.time >= piece.born + PIECE_FALL) {
      piece.landed = true
      this.cue(piece.disc ? 'roll' : 'slap', 'piece')
      // Too many on the rug: the one that lands pushes the oldest off under the sofa.
      const waiting = this.olds.filter((old) => old.swept === null)
      if (waiting.length >= MOST_PIECES) { waiting[0].swept = this.time; this.cue('scrape', `piece:${waiting[0].key}`, 1.5) }
    }
    if (this.olds.some((old) => old.swept !== null && this.time - old.swept > SWEPT_S)) this.olds = this.olds.filter((old) => old.swept === null || this.time - old.swept <= SWEPT_S)
    if (!this.pressed) this.watching = Math.max(0, this.watching - dt / 1.6)
    this.idleAt.cat = this.directors.cat.update(this.time)
    this.idleAt.baby = this.directors.baby.update(this.time)
    this.idleAt.gran = this.directors.gran.update(this.time)
  }

  /**
   * The game is put away. Whatever was on its way is where the save has it, nothing more is heard, and the
   * picture is what a load would show. The finger's own unfinished work is settled before this by hands.ts.
   */
  settle(): void {
    this.endScene(true)
    this.tweens.clear()
    this.holds.clear()
    this.clothBy = this.bulbsBy = this.rollBy = null
    this.wary = null
    this.clothTween = null
    this.bulbsTween = null
    this.timers = []
    this.kicks.clear()
    this.deep.clear()
    // A line that was still to be shown being closed is closed: the face shows what the save holds.
    if (this.closing) { this.recut.add(this.closing.stroke.box); this.closing = null }
    for (const id of [...this.kept.keys()]) this.fresh(id)
    this.wait()
    this.piece = null
    this.olds = []
    this.strip = null
    this.pressed = false
    this.watching = 0
    Object.assign(this.scissors, { mode: 'rest', at: { ...SCISSORS_REST }, turn: SCISSORS_TURN, leaves: false })
    this.restAll()
    this.cues.length = 0
    this.hushed = true
  }
}
