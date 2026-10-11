import { ACTS, KNOCK_EVERY, momentOf, type Moment } from './acts'
import { cellKey, cellOf, type CellKey } from './grid'
import type { Point } from './input'
import { CAT_ACTS, CAT_BEATS, CAT_IS_DOWN, CAT_MEWS, CAT_STAYS_DOWN, GULL_HOP, OPINIONS, SHOAL_SCATTERS, TAU, catPose, driftOf, isCatch, poseOf, type Around, type CatAct, type Catch, type Moving, type Pose } from './motion'
import { below, type Rng } from './rng'
import { Scene, type Beat } from './scene'
import { BOUNCE_SECONDS, FLIGHT_SECONDS, OFF_THE_PILE, SLIDE, TIP, TIP_BEATS, TIP_LASTS, TOW, TOW_BEATS, TOW_LASTS, splashOf, tipAt, towAt, underKeel, type Bite, type FlightKind } from './scenes'
import { BAITS, BUBBLE_POPS_AT, CAT, CAT_IN_TUB, CREATURES, CREATURE_IDS, HIT, HOOK_BOUNDS, HOOK_REST, HULL, KEEL_DEPTH, LAYERS, NET, NET_DEPTH, ROD_TIP, SEABED, SHARK_TEETH, TUB, TUB_FRONT_FIRST, TUB_HOLDS, TUB_SLOTS, UNDER_BOAT, UNDER_NET, WATERLINE, clampHook, depthOf, inside, lineLength, pegRect, slotRect, type Bait, type CreatureId, type Rect } from './sea'
import type { Cue } from './voices'

// The rules of the game (ART.md): the line and the hook, the six baits on
// their pegs, each creature's answer to each bait, who bites, steals, follows
// and bolts, the three rules of passing, the net and the tub, the cat's
// opinions, and the two scenes.
//
// It has no renderer and reads no clock: `step` plays the seconds it is given,
// and whatever makes a sound is queued in `cues` for the Mount to play. An
// answer is played by its cell's timeline (grid.ts), the same one its figure
// is drawn by (acts.ts), and a scene by its own (scenes.ts).

/** What a child leaves behind and finds again: the fields of the saved state that are the game's own. */
export type Left = { bait: Bait; hook: Point; hooked: CreatureId | null; following: CreatureId[]; tub: Catch[]; finished: boolean }

export type CreatureState = Moving & {
  /** Ready to answer the hook again: the hook has to leave before it can come back. */
  armed: boolean
  /** Its answer was broken off (the hook was drawn away, the bait was changed) and is fading out: no more of it sounds. */
  cut: boolean
  /** How much of a broken-off answer still shows, from 1 down to 0. */
  fade: number
  /** The outcome of its answer has landed. */
  landed: boolean
  /** The bait it follows. */
  lure: Bait
  /** A count of its own: the tooth the hook last played, the squid's wave still owed. */
  count: number
  /** Seconds the black of an ink cloud stays on it. */
  inked: number
  /** It is in the boot it came up in. */
  booted: boolean
  /** A hunter is near and it has already bolted from it. */
  scared: boolean
  /** Seconds it has hung at the top of a flight upward. */
  wait: number
  /** Seconds since it bolted. */
  fled: number
  /** How much it is looking at a hook that has not been drawn yet, from 0 to 1 (ART.md, the first visit). */
  notice: number
  /** The hook lies on its body, away from the part that answers: it is bringing that part to the hook, and for how many seconds it has been. */
  comes: boolean
  coming: number
  /** It came to the hook to answer, and stays where it came to until its answer is over. */
  came: boolean
  /** The shark is hurrying round to a hook that was laid on it. */
  hurries: boolean
}

export type Bubble = { x: number; y: number; r: number; rise: number; sway: number; big: boolean }
export type InkCloud = { x: number; y: number; age: number; size: number }
export type Ripple = { x: number; age: number }
type Light = { at: Point; by: CreatureId | 'bait' }
export type Flight = { id: Catch; kind: FlightKind; fits: boolean; t: number; from: Point; slot: number }
/** What the idle ladder shows: draw the line to begin, tap the full tub, draw a catch up, take a bait or draw down. */
export type Want = 'line' | 'tub' | 'up' | 'bare' | 'down'

/** When each of the three drops leaves a hook that has come out of the water, in seconds after the splash. */
export const DRIPS = [0.18, 0.3, 0.47] as const
export const INK_LASTS = 3.4
export const RIPPLE_LASTS = 0.9
/** One reel click for each of these lengths of line. */
export const LINE_PER_CLICK = 26
/** Coming in, the clicks are quicker: a shorter stretch of line for each. */
export const LINE_PER_CLICK_UP = 17
/** How far the reel turns at each click, in radians: out one way, in the other. */
export const REEL_STEP = Math.PI / 4
/** How the reel's bar lies when the game opens: aslant by half a step, so that no number of steps lays it level across its drum or upright in it. */
export const REEL_OPENS = Math.PI / 8
/** How long the stick lights the shark from inside, and how long the blobfish stays under its sand, in seconds. */
export const SHARK_GLOWS = 12, BLOBFISH_SULKS = 6
/** How near a light makes the spoon flash, and how near a hunter sends the timid ones off. */
export const LIGHT_REACHES = 150, HUNTER_REACHES = 240
/** An answer is broken off when the hook is drawn this many reaches away. */
export const CUT_AT = 1.9
/** How fast a broken-off answer fades, per second. */
const FADE_RATE = 4
/** A hook that something has hold of comes free when the finger draws this far from where it is held. */
export const PULL_OUT = 40
/**
 * The furthest a body is shoved in one step. A body with no room nearer than this is cornered: it slips away to the
 * nearest room at `SLIPS` stage units a second, and whoever came at it waits against it until it has gone.
 */
export const SHOVE = 28, SLIPS = 700
/** A catch within this depth of the waterline is about to come out: the cat gets down. */
export const CAT_DUCKS_AT = 80
/** How near the part that answers the hook must come for a creature to stop and look at a hook nobody has drawn yet, as a share of its reach. */
const NOTICE_AT = 0.8
/** Where each creature's own clock stands when the game opens. The turtle is at the kelp end of its stretch, about to swim toward the rod. */
const OPENS_AT: Record<CreatureId, number> = { shoal: 0, puffer: 1.37, turtle: 7.8, squid: 4.11, jelly: 5.48, shark: 6.85, angler: 8.22, octopus: 9.59, blobfish: 10.96 }
/** Who never leaves its place to meet the hook: the octopus in its pot and the blobfish on the sand answer a hook anywhere on them. */
const STAYS_PUT: readonly CreatureId[] = ['octopus', 'blobfish']
const MAX_SMALL_BUBBLES = 4
/** The hook on its line: a spring toward the finger, damped a little under critical, so it swings once and settles. */
const HOOK_STIFFNESS = 130, HOOK_DAMPING = 17
const SUBSTEP = 1 / 120
/** How fast each follower can go after the hook, and how fast anyone swims home, in stage units a second. */
const FOLLOW_SPEED: Partial<Record<CreatureId, number>> = { shoal: 300, turtle: 120, jelly: 100, angler: 150, blobfish: 80 }
const HOME_SPEED: Record<CreatureId, number> = { shoal: 220, puffer: 110, turtle: 90, squid: 120, jelly: 70, shark: 170, angler: 120, octopus: 130, blobfish: 90 }
/** How far behind the hook the first of a train keeps, from the hook to its middle: near enough for its nose to be at the bait. */
const FOLLOW_GAP: Partial<Record<CreatureId, number>> = { shoal: 76, turtle: 142, jelly: 112, angler: 122, blobfish: 132 }
const FLEE_SPEED = 430
/** Where a catch hangs from the hook, from the hook to its middle. The jellyfish sits on the boot and the octopus in it. */
const hungAt = (id: CreatureId): Point => (id === 'jelly' ? { x: 16, y: -4 } : id === 'octopus' ? { x: 18, y: 34 } : { x: 6, y: CREATURES[id].hang })

/** Where the cat shows above the rim while it sleeps curled up in the tub. */
/** What the cat is not drawn out of by a touch: it mews where it is. */
const BUSY: readonly CatAct[] = ['duck', 'wake', 'settle', 'ride', 'cling', 'shake']
const CAT_ASLEEP: Rect = { left: TUB.x - 62, top: 62, right: TUB.x + 74, bottom: HIT.tub.top }
const approach = (from: number, to: number, rate: number, dt: number): number => to + (from - to) * Math.exp(-rate * dt)
const far = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
const overlap = (a: Rect, b: Rect): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/** The room a creature's body takes about its middle, as it is now: the pufferfish swollen, the octopus in the boot. */
export function bodyBox(id: CreatureId, c: CreatureState, at: Point): Rect {
  const body = CREATURES[id].body
  let rx: number = body.rx, ry: number = body.ry, y: number = body.y
  if (id === 'puffer' && (c.mode === 'flee' || c.mode === 'hooked')) { rx *= 1.5; ry *= 1.5 }
  if (id === 'octopus' && c.booted) { rx = 52; ry = 58; y = -6 }
  return { left: at.x + body.x - rx, top: at.y + y - ry, right: at.x + body.x + rx, bottom: at.y + y + ry }
}

/** What hangs into the sea from above, and how low the top of a body under it may come: the bag of the net, then the keel. */
const CEILINGS = [{ left: NET.left - 4, right: NET.right + 4, under: NET.bottom + 6 }, { left: HULL.left, right: HULL.right, under: HULL.bottom + 6 }] as const
/** A body this near under the edge of one of them ducks under it; one that is higher is stopped by the edge. */
const DUCKS_UNDER = 10

/** The lowest the top of a body may come at this place: under the keel, under the bag of the net, or under the waves. */
export function ceilingAt(left: number, right: number): number {
  if (left < NET.right + 4 && right > NET.left - 4) return NET.bottom + 6
  if (left < HULL.right && right > HULL.left) return HULL.bottom + 6
  return WATERLINE + 6
}

/**
 * The shortest way for a box out of the boxes already placed: how far to move it so that it lies in none of them,
 * stays in the sea, and stays under the keel, the net and the waves. The nearest free room of a box among boxes is
 * always flush against an edge of one of them or of the sea, so only those places are tried. `off` is how far a
 * creature at home already is from its own place: of two ways about as short, it takes the one nearer home.
 * Null when there is no free room at all.
 */
function wayOut(box: Rect, placed: readonly Rect[], off: Point | null): Point | null {
  const xs = [0, 4 - box.left, 1176 - box.right, HULL.right + 0.5 - box.left, HULL.left - 0.5 - box.right, NET.right + 4.5 - box.left, NET.left - 4.5 - box.right]
  const ys = [0, SEABED + 12 - box.bottom, WATERLINE + 6 - box.top, HULL.bottom + 6 - box.top, NET.bottom + 6 - box.top]
  for (const other of placed) {
    xs.push(other.right - box.left + 1, other.left - box.right - 1)
    ys.push(other.bottom - box.top + 1, other.top - box.bottom - 1)
  }
  // A body that already lies a little past an edge of the sea is not held to that edge on its way out.
  const floor = Math.max(SEABED + 12, box.bottom)
  let best: Point | null = null, least = Infinity
  for (const x of xs) {
    const left = box.left + x, right = box.right + x
    if (left < 4 - 0.01 || right > 1176 + 0.01) continue
    const ceiling = ceilingAt(left, right) - 4
    for (const y of ys) {
      const top = box.top + y, bottom = box.bottom + y
      if (bottom > floor + 0.01 || top < ceiling) continue
      const cost = Math.hypot(x, y) + (off ? 0.08 * Math.hypot(off.x + x, off.y + y) : 0)
      if (cost >= least) continue
      let free = true
      for (const other of placed) if (left < other.right && other.left < right && top < other.bottom && other.top < bottom) { free = false; break }
      if (free) { least = cost; best = { x, y } }
    }
  }
  return best
}

const NUMBERS = ['x', 'y', 'rot', 'sx', 'sy', 'open', 'a', 'b', 'lid', 'glow', 'alt', 'hid', 'pupil', 'more'] as const

export class Game {
  time = 0
  readonly hook = { x: 0, y: 0, vx: 0, vy: 0 }
  /** Where the finger wants the hook. */
  private target: Point
  /** Where the hook hangs at rest. While a finger draws the line it is still where the line was taken up. */
  rest: Point
  /** A finger is drawing the line. */
  held = false
  /** The child has drawn the line since the game was opened: until then nobody starts anything. */
  private live = false
  bait: Bait
  /** Seconds since the bait on the hook changed, and what was on it before: the bait flies between hook and peg. */
  baitSince = 9
  baitWas: Bait = 'none'
  /** A bait that was tapped while the hook was busy swings on its peg. */
  readonly peg: { bait: Bait; since: number } = { bait: 'none', since: 9 }
  hooked: CreatureId | null
  following: CreatureId[]
  tub: Catch[]
  finished: boolean
  readonly creatures: Record<CreatureId, CreatureState>
  readonly cat: { t: number; act: CatAct | null; since: number; last: CatAct | null; slot: Point; asleep: boolean; dreamt: number; poked: number } = { t: 0, act: null, since: 0, last: null, slot: { x: 0, y: 0 }, asleep: false, dreamt: 0, poked: 9 }
  readonly gull: { t: number; hop: number | null; watching: number } = { t: 0, hop: null, watching: 0 }
  readonly tubWater = { slosh: 0, phase: 0 }
  readonly boat = { t: 0, dip: 0, speed: 0, pulled: 0, shift: 0, heel: 0 }
  /** Seconds since the net last scooped, or null. */
  netSwing: number | null = null
  readonly bubbles: Bubble[] = []
  readonly inks: InkCloud[] = []
  readonly ripples: Ripple[] = []
  readonly flights: Flight[] = []
  /** The shark's dropped tooth on the sand, for a while. */
  tooth: { x: number; age: number } | null = null
  /** The tow as it is shown, and the tip-out. Null when none plays. */
  tow: { t: number; bite: Bite } | null = null
  tip: { t: number; who: Catch[]; out: number; from: Point } | null = null
  /** The sounds of this step, for the Mount to play and empty. */
  readonly cues: Cue[] = []
  /** What has changed and not been handed to storage yet: 1 a hook let go in a new place, 2 anything that must be saved at once. */
  dirty: 0 | 1 | 2 = 0
  /** Seconds since the hook came out of the water, for its drips. */
  dripping = Infinity
  /**
   * Whose sounds stop before this step's own are played: `scene` when a touch ended a scene, a creature when its
   * answer was cut short, `cat` when the catch it had an opinion of was tipped back. Only those voices stop; a purr
   * or another creature's answer that is still drawn goes on. The Mount reads and empties it.
   */
  readonly hushes: string[] = []
  /** The touch was taken away, and the child did not let go: until the next touch nothing is swung into the tub. */
  private taken = false
  private scene: Scene | null = null
  private grip: { id: CreatureId; at: Point } | null = null
  private paid: number
  /** How far the reel has turned: one step at each click, so the picture and the sound keep the same beats. */
  reel = REEL_OPENS
  /** The reel as it is drawn: it turns to each step and does not snap. */
  reelShown = REEL_OPENS
  private nextBubble = 1.2
  private readonly rng: Rng
  private readonly poses = {} as Record<CreatureId, Pose>
  /** The seconds of the step being played, for what moves at a pace while bodies make way. */
  private lastStep = 1 / 60
  /** Who is slipping out of a corner, and the room each is making for: where the top left of its body will lie. */
  private readonly slipping = new Map<CreatureId, { room: Point; age: number }>()
  /** Where each body lay when the last step was over. */
  private readonly lastBox: Partial<Record<CreatureId, Rect>> = {}
  /** The lights as they stand, worked out once and kept until something moves. */
  private lit: Light[] | null = null

  constructor(left: Left, rng: Rng) {
    this.rng = rng
    this.bait = left.bait
    this.hooked = left.hooked
    this.following = [...left.following]
    this.tub = [...left.tub]
    this.finished = left.finished
    this.cat.asleep = left.finished
    // Nothing lands without a touch: a catch found on a hook that rests in the air hangs under the boat instead.
    this.rest = left.hooked !== null && left.hook.y <= WATERLINE ? { ...HOOK_REST } : clampHook(left.hook)
    this.target = { ...this.rest }
    this.hook.x = this.rest.x
    this.hook.y = this.rest.y
    this.paid = lineLength(ROD_TIP, this.hook)
    this.creatures = Object.fromEntries(CREATURE_IDS.map((id) => [id, { t: OPENS_AT[id], now: 0, mode: 'home', cell: null, since: 0, act: 0, off: { x: 0, y: 0 }, heading: 0, extra: 0, armed: true, cut: false, fade: 0, landed: false, lure: 'none', count: -1, inked: 0, booted: false, scared: false, wait: 0, fled: 0, notice: 0, comes: false, coming: 0, came: false, hurries: false }])) as Record<CreatureId, CreatureState>
    // As it was left: the catches lie in the tub, the one on the hook hangs under it, and those who follow are strung out behind it.
    this.tub.forEach((id, index) => {
      const c = this.creatures[id]
      c.mode = 'away'
      c.off = { ...TUB_SLOTS[index] }
      c.booted = id === 'jelly' || id === 'octopus'
    })
    if (this.hooked !== null) {
      const c = this.creatures[this.hooked], hung = hungAt(this.hooked)
      c.mode = 'hooked'
      c.booted = this.hooked === 'jelly' || this.hooked === 'octopus'
      this.moveTo(this.hooked, { x: this.hook.x + hung.x, y: this.hook.y + hung.y })
    }
    for (const id of this.following) {
      this.creatures[id].mode = 'following'
      this.creatures[id].lure = this.bait
    }
    // A catch left hanging just under the surface: the cat is already down, and says nothing about it.
    if (this.hooked !== null && isCatch(this.hooked) && this.hook.y < WATERLINE + CAT_DUCKS_AT) {
      this.cat.act = 'duck'
      this.cat.since = CAT_STAYS_DOWN
    }
    for (let i = 0; i < 40; i++) this.stepTrain(1, true)
    // Whoever the hook already hangs beside when the game opens looks at it, like one whose stretch brings it there, and answers at the first touch on the line.
    this.separate()
  }

  /** What the child has left, for storage. */
  snapshot(): Left {
    return { bait: this.bait, hook: { ...this.rest }, hooked: this.hooked, following: [...this.following], tub: [...this.tub], finished: this.finished }
  }

  // --- Where things are -------------------------------------------------------

  /** The middle of a creature as the rules have it, before its answer moves it. */
  centre(id: CreatureId): Point {
    const c = this.creatures[id], free = driftOf(id, c.t)
    return { x: free.x + c.off.x, y: free.y + c.off.y }
  }
  private moveTo(id: CreatureId, to: Point): void {
    const c = this.creatures[id], free = driftOf(id, c.t)
    c.off.x = to.x - free.x
    c.off.y = to.y - free.y
  }

  /** Where a bait hangs on the hook when nobody has hold of it. */
  baitAt(): Point {
    return { x: this.hook.x + 12, y: this.hook.y + 4 }
  }

  /** The lights in the water that are not daylight: the glow stick below the sunlit water, the jellyfish, an anglerfish hooked or following, and the shark with the stick inside it. */
  lights(): readonly Light[] {
    if (this.lit) return this.lit
    const lights: Light[] = []
    if (this.bait === 'glow' && this.hook.y > LAYERS.sunlit.bottom) lights.push({ at: { x: this.hook.x, y: this.hook.y + 30 }, by: 'bait' })
    const { jelly, angler, shark } = this.creatures
    if (jelly.mode !== 'away') lights.push({ at: this.centre('jelly'), by: 'jelly' })
    if (angler.mode === 'hooked' || angler.mode === 'following') { const at = this.centre('angler'); lights.push({ at: { x: at.x, y: at.y - 60 }, by: 'angler' }) }
    if (shark.extra > 0 && shark.mode !== 'away') lights.push({ at: this.centre('shark'), by: 'shark' })
    return (this.lit = lights)
  }
  /** How much a point is lit by one of those lights, from 0 to 1, leaving out a light of its own. */
  litAt(at: Point, own: CreatureId | null = null, reach = LIGHT_REACHES): number {
    if (at.y < LAYERS.sunlit.bottom) return 0
    let lit = 0
    for (const light of this.lights()) if (light.by !== own) lit = Math.max(lit, 1 - far(light.at, at) / reach)
    return Math.max(0, lit)
  }
  /** The spoon flashes: it is in the sunlit water, or beside something that glows. */
  spoonFlashes(): boolean {
    return this.bait === 'spoon' && this.hook.y > WATERLINE && (this.hook.y < LAYERS.sunlit.bottom || this.litAt(this.hook) > 0)
  }
  /** The hunters going about: an anglerfish hooked or following, and the shark while it tows. */
  private hunters(): Point[] {
    const hunters: Point[] = []
    const angler = this.creatures.angler
    if (angler.mode === 'hooked' || angler.mode === 'following') hunters.push(this.centre('angler'))
    if (this.tow) hunters.push(this.centre('shark'))
    return hunters
  }

  private aroundOf(id: CreatureId): Around {
    const at = this.centre(id)
    let light: Point | null = null, near = Infinity
    for (const each of this.lights()) if (each.by !== id && far(each.at, at) < near) { near = far(each.at, at); light = each.at }
    return { hook: this.hook, light, bright: this.spoonFlashes() || (this.bait === 'glow' && this.hook.y > LAYERS.sunlit.bottom) }
  }
  private basePose(id: CreatureId): Pose {
    const c = this.creatures[id], pose = poseOf(id, c, this.aroundOf(id))
    if (id === 'octopus' && c.booted) { pose.alt = 1; pose.sx = pose.sy = 0.7 }
    if (c.notice > 0.01) {
      // It has seen a hook nobody has drawn yet: its eyes go wide and it tips its nose toward it.
      const dy = this.hook.y - (pose.y + CREATURES[id].touch.y)
      pose.pupil *= 1 + 0.3 * c.notice
      pose.lid *= 1 - c.notice
      pose.rot += pose.face * Math.max(-0.14, Math.min(0.14, dy / 160)) * c.notice
    }
    if (id === 'shark' && this.tow) {
      const tow = towAt(this.tow.t, this.tow.bite)
      pose.face = tow.face
      pose.open = tow.open
      if (tow.looks) pose.look = { ...ROD_TIP }
    }
    return pose
  }
  /** A creature as it would be drawn with no answer laid over it. */
  resting(id: CreatureId): Pose {
    return this.basePose(id)
  }
  /** The moment of the answer a creature is giving, for its figure. */
  momentOf(id: CreatureId): Moment | null {
    const c = this.creatures[id]
    return c.cell === null ? null : momentOf(c.cell, c.since, this.time, this.hook, this.baitAt())
  }
  /** How much of its answer shows: all of it, or what is left of one that was broken off. */
  showing(id: CreatureId): number {
    const c = this.creatures[id]
    return c.cell === null ? 0 : c.cut ? c.fade : 1
  }
  /** A creature as it is drawn: where the rules have it, with its answer to the hook laid over. */
  shown(id: CreatureId): Pose {
    const c = this.creatures[id], base = this.basePose(id)
    const act = c.cell === null ? undefined : ACTS[c.cell].pose
    if (!act) return base
    const moment = this.momentOf(id)!
    if (!c.cut) { act(base, moment); return base }
    const acted = { ...base }
    act(acted, moment)
    for (const key of NUMBERS) base[key] += (acted[key] - base[key]) * c.fade
    return base
  }

  /** The part of a creature the hook is brought to. With a bait on, the turtle is met at its mouth. */
  private touchOf(id: CreatureId, pose: Pose): Point {
    const touch = id === 'turtle' && this.bait !== 'none' ? { x: 118, y: 4 } : CREATURES[id].touch
    // The blobfish is met where its nose lies, toward the boat, also while it has turned its back.
    const face = id === 'blobfish' && this.creatures[id].mode === 'home' ? -1 : pose.face
    return { x: pose.x + touch.x * face, y: pose.y + touch.y }
  }
  /** Where the hook has to be brought for a creature to answer what is on it. */
  touchPoint(id: CreatureId): Point {
    return this.touchOf(id, this.basePose(id))
  }
  /** How near that point the hook has to come. */
  reachOf(id: CreatureId): number {
    return id === 'turtle' && this.bait !== 'none' ? 46 : CREATURES[id].reach
  }
  private reachTo(id: CreatureId, pose: Pose): number {
    return far(this.hook, this.touchOf(id, pose))
  }

  /** How many catches lie in the tub, leaving out one still in the air. */
  landed(): number {
    return this.tub.length - this.flights.filter((flight) => flight.fits && flight.kind !== 'tipBack').length
  }

  /** What the idle ladder points at. */
  want(): Want {
    if (this.finished) return 'line'
    if (this.landed() >= TUB_HOLDS) return 'tub'
    if (this.hooked !== null) return 'up'
    return this.bait === 'none' && this.following.length === 0 ? 'bare' : 'down'
  }

  // --- Touch ------------------------------------------------------------------

  /** A finger landed. A scene that is playing ends first, and the touch is then an ordinary one, answered in the same frame. */
  press(at: Point): void {
    if (this.scene?.running) {
      this.scene.finish()
      this.hushes.push('scene')
    }
    // The deck is where the boat is: a touch is read on the boat as it is drawn.
    const deck = { x: at.x - this.boat.shift, y: at.y }
    for (const bait of BAITS) if (inside(at, pegRect(bait))) return this.takeBait(bait)
    if (inside(at, HIT.gull)) return this.startleGull()
    // The cat is touched where it is: on its seat, or curled up in the tub when the trip is over.
    if (inside(deck, this.catRect())) return this.cat.asleep ? this.stirCat() : this.pokeCat()
    // A catch is touched where it stands: of two that overlap, the one in front, and an empty place above the rim is only air.
    // While the catches close up after one was tipped back, each is touched where it is at that moment.
    const slot = TUB_FRONT_FIRST.find((each) => each < this.tub.length && inside({ x: deck.x - (this.creatures[this.tub[each]].off.x - TUB_SLOTS[each].x), y: deck.y }, slotRect(each)) && !this.flights.some((flight) => flight.id === this.tub[each]))
    if (slot !== undefined && !this.finished) return this.tipBack(slot)
    if (inside(deck, HIT.tub)) return this.finished ? this.stirCat() : this.landed() >= TUB_HOLDS && this.flights.length === 0 ? this.startTip() : this.slopTub()
    if (this.finished) this.beginTrip()
    this.live = true
    this.held = true
    this.taken = false
    this.target = this.clampCarry(at)
    this.pullOut()
    const up = this.target.y < this.hook.y
    this.cues.push({ name: 'click', depth: depthOf(this.hook.y), up })
    this.reel += up ? -REEL_STEP : REEL_STEP
  }

  /** Whoever has hold of the hook lets go the moment the finger draws it away: no touch waits for a joke to end. */
  private pullOut(): void {
    if (this.grip && far(this.target, this.grip.at) > PULL_OUT) this.cutShort(this.grip.id)
  }

  /** The finger moved: the hook follows it. */
  drag(at: Point): void {
    if (!this.held) return
    this.target = this.clampCarry(at)
    this.pullOut()
  }

  /** The finger let go: the hook stays where it was let go and swings to rest there. */
  release(): void {
    if (!this.held) return
    this.held = false
    const rest = { x: Math.round(this.target.x), y: Math.round(this.target.y) }
    if (rest.x !== this.rest.x || rest.y !== this.rest.y) this.dirty = Math.max(this.dirty, 1) as 1 | 2
    this.rest = rest
  }

  /** The touch was taken away and the child did not let go: the hook goes back to where the line was taken up. */
  cancel(): void {
    if (!this.held) return
    this.held = false
    this.taken = true
    this.target = { ...this.rest }
  }

  /** Where a wished-for hook ends up: in the sea, and with a catch on it, where the catch has room under it. */
  private clampCarry(at: Point): Point {
    const to = clampHook(at)
    if (this.hooked === null || to.y <= WATERLINE) return to
    const c = this.creatures[this.hooked], hung = hungAt(this.hooked)
    const box = bodyBox(this.hooked, c, { x: to.x + hung.x, y: to.y + hung.y })
    let lift = Math.max(0, box.bottom - SEABED)
    for (const id of ['octopus', 'blobfish'] as const) {
      const other = this.creatures[id]
      if (id === this.hooked || other.mode !== 'home') continue
      const fixed = bodyBox(id, other, this.centre(id))
      if (box.left < fixed.right && fixed.left < box.right) lift = Math.max(lift, box.bottom - fixed.top)
    }
    return clampHook({ x: to.x, y: to.y - lift })
  }

  private takeBait(bait: Exclude<Bait, 'none'>): void {
    // With someone on the hook there is no room for a bait: the bait only swings on its peg.
    if (this.hooked !== null) {
      this.peg.bait = bait
      this.peg.since = 0
      this.cues.push({ name: 'pegTok' })
      return
    }
    const off = this.bait === bait
    this.cues.push({ name: off ? 'baitOff' : 'baitOn' })
    this.setBait(off ? 'none' : bait)
    // Whoever the hook is beside answers the new bait without the hook having to leave first.
    for (const id of CREATURE_IDS) this.creatures[id].armed = true
  }

  /** The bait on the hook changes: by the child's hand, by a thief, or by a bite. Those who followed the old one drift home. */
  private setBait(bait: Bait): void {
    if (bait === this.bait) return
    const squid = this.creatures.squid
    this.baitWas = this.bait
    this.bait = bait
    this.lit = null
    this.baitSince = 0
    this.dirty = 2
    for (const id of [...this.following]) if (this.creatures[id].lure !== bait) this.leave(id)
    for (const id of CREATURE_IDS) {
      const c = this.creatures[id]
      // An answer to a bait that is no longer there is broken off, unless its outcome is what took the bait.
      if (c.cell !== null && !c.cut && !c.landed) this.cutShort(id)
    }
    // The stick has left: the squid that answered it waves one arm.
    if (this.baitWas === 'glow' && squid.count === 1 && squid.mode === 'home' && (squid.cell === null || squid.cut)) this.begin('squid', 'glow.squid.bye')
    squid.count = -1
  }

  private leave(id: CreatureId): void {
    const at = this.following.indexOf(id)
    if (at >= 0) this.following.splice(at, 1)
    this.creatures[id].mode = 'return'
    this.dirty = 2
  }

  private cutShort(id: CreatureId): void {
    const c = this.creatures[id]
    c.cut = true
    c.fade = 1
    this.hushes.push(id)
    if (this.grip?.id === id) this.grip = null
    // What it had already queued in this step is not sounded after the hush: only the snap of the jaws is.
    for (let i = this.cues.length - 1; i >= 0; i--) if (this.cues[i].by === id) this.cues.splice(i, 1)
    if (c.cell === 'none.shark') this.cues.push({ name: 'snap', by: id })
  }

  /** Where the cat is drawn at this moment: on its seat, in the tub it pounced into, on its way there or back, or curled up asleep. */
  catRect(): Rect {
    const cat = this.cat, pose = catPose(cat.t, this.time, cat.act, cat.since, cat.slot, cat.asleep, CAT_IN_TUB, cat.poked)
    if (pose.curl > 0.5) return CAT_ASLEEP
    return { left: HIT.cat.left + pose.x, right: HIT.cat.right + pose.x, top: HIT.cat.top - pose.lift, bottom: HIT.cat.bottom - pose.lift }
  }

  private pokeCat(): void {
    const cat = this.cat
    // It is not to be drawn away from a catch it has an opinion of, or up from under one that is coming in.
    if (cat.act !== null && (cat.act.startsWith('op') || BUSY.includes(cat.act))) {
      // It mews where it is, mouth open and tail lashing.
      cat.poked = 0
      return void this.cues.push({ name: 'mew', index: 1 })
    }
    const others = CAT_MEWS.filter((act) => act !== cat.last)
    const act = others[below(this.rng, others.length)]
    cat.last = act
    this.catDoes(act)
    this.cues.push({ name: 'mew', index: CAT_MEWS.indexOf(act) })
  }

  /** The cat asleep in the tub, touched: it stirs and sleeps on. */
  private stirCat(): void {
    this.catDoes('sleepy')
    this.cues.push({ name: 'sleepy' })
  }

  private catDoes(act: CatAct | null): void {
    // An opinion that something else takes the place of stops sounding in that frame.
    if (this.cat.act !== null && this.cat.act.startsWith('op') && act !== this.cat.act) this.hushes.push('cat')
    this.cat.act = act
    this.cat.since = 0
  }

  private slopTub(): void {
    this.tubWater.slosh = 1
    this.cues.push({ name: 'slosh' })
    // The cat flinches at it, and is heard, unless it is busy with a catch or lying flat under one.
    if (this.cat.act !== null && (this.cat.act.startsWith('op') || BUSY.includes(this.cat.act))) return
    this.catDoes('flinch')
    this.cues.push({ name: 'flinch' })
  }

  private startleGull(): void {
    this.gull.hop = 0
    this.cues.push({ name: 'squawk' })
  }

  /** A tap on one catch in the tub tips that one back over the rail. Saved at once. */
  private tipBack(index: number): void {
    const [id] = this.tub.splice(index, 1)
    // The cat's opinion of a catch ends with the catch: no arm from an empty place, no purr, no stare.
    if (this.cat.act === OPINIONS[id as Catch]) {
      // A cat that had pounced into the tub climbs out of it; otherwise it simply sits.
      const inTub = this.catRect().right < HIT.cat.left + 40
      this.catDoes(inTub ? 'wake' : null)
    }
    this.flights.push({ id, kind: 'tipBack', fits: false, t: 0, from: { ...this.creatures[id].off }, slot: index })
    this.cues.push({ name: 'tipBack' })
    this.tubWater.slosh = 0.6
    this.dirty = 2
  }

  /** The child touches the line after a trip: the cat wakes and stretches, the lantern goes out, and the next trip has begun. */
  private beginTrip(): void {
    this.finished = false
    this.cat.asleep = false
    this.catDoes('wake')
    this.cues.push({ name: 'wake' })
    this.dirty = 2
  }

  // --- The scenes ---------------------------------------------------------------

  /** A scene's beats: one that carries its seconds along, and one for each sound, which a touch that ends the scene leaves unsounded. */
  private play(lasts: number, sounds: readonly { at: number; cue: Cue }[], carry: (t: number, finishing: boolean) => void, also: (at: number) => void): void {
    const beats: Beat[] = [{ at: 0, lasts, play: (progress, finishing) => carry(progress * lasts, finishing) }]
    for (const sound of sounds) beats.push({ at: sound.at, lasts: 0, play: (_progress, finishing) => { if (!finishing) { this.cues.push({ ...sound.cue, by: 'scene' }); also(sound.at) } } })
    this.scene = new Scene(beats)
  }
  /** A scene is playing. */
  get playing(): boolean {
    return this.scene?.running === true
  }

  /** The shark has taken the worm: the tow. Its outcome is applied here, at its start, and saved at once. */
  private startTow(pose: Pose): void {
    const bite: Bite = { x: pose.x, y: pose.y, face: pose.face }
    this.play(TOW_LASTS, TOW_BEATS, (t, finishing) => {
      if (!this.tow) return
      this.tow.t = t
      if (t >= TOW_LASTS) this.endTow(finishing)
    }, (at) => {
      if (at === TOW.lurch) this.catDoes('cling')
      if (at === TOW.shakes) this.catDoes('shake')
    })
    this.scene!.start(this.time, () => {
      // The finger that drew the worm to the shark is let go of, so that only a new touch ends the scene.
      this.held = false
      this.grip = null
      this.setBait('none')
      for (const id of [...this.following]) this.leave(id)
      this.rest = { ...HOOK_REST }
      this.target = { ...HOOK_REST }
      this.dirty = 2
    })
    this.tow = { t: 0, bite }
    this.creatures.shark.mode = 'hooked'
  }
  private endTow(finishing: boolean): void {
    this.tow = null
    this.creatures.shark.mode = 'return'
    this.creatures.shark.armed = false
    // Ended by a touch, the hook is at once where the scene was taking it.
    if (finishing) this.hookTo(HOOK_REST)
  }

  /** A tap on the full tub: the tip-out, which ends the trip. Its outcome is applied here, at its start, and saved at once. */
  private startTip(): void {
    const who = [...this.tub]
    this.play(TIP_LASTS, TIP_BEATS, (t, finishing) => {
      const tip = this.tip
      if (!tip) return
      tip.t = t
      // Each catch is in the water once its slide is over, and swims home from under the keel.
      while (tip.out < who.length && t >= TIP.slides[tip.out] + SLIDE) this.overTheRail(who[tip.out], splashOf(tip.out++).x, !finishing)
      if (t >= TIP_LASTS) {
        this.tip = null
        this.cat.asleep = true
        this.cat.act = null
        if (finishing) this.hookTo(HOOK_REST)
      }
    }, (at) => {
      if (at === TIP.wave) this.catDoes('ride')
      if (at === TIP.curls + 0.4) this.catDoes('settle')
    })
    this.scene!.start(this.time, () => {
      this.held = false
      this.grip = null
      this.tub = []
      this.finished = true
      if (this.hooked !== null) { this.creatures[this.hooked].mode = 'return'; this.hooked = null }
      for (const id of [...this.following]) this.leave(id)
      this.rest = { ...HOOK_REST }
      this.target = { ...HOOK_REST }
      this.dirty = 2
    })
    this.tip = { t: 0, who, out: 0, from: { x: this.hook.x, y: this.hook.y } }
    this.catDoes(null)
  }

  private hookTo(at: Point): void {
    this.hook.x = at.x
    this.hook.y = at.y
    this.hook.vx = this.hook.vy = 0
    this.paid = lineLength(ROD_TIP, this.hook)
  }

  /** A catch that left the boat is in the water under the keel and swims home. */
  private overTheRail(id: Catch, x: number, seen: boolean, sounded = false): void {
    const c = this.creatures[id]
    c.mode = 'return'
    c.cell = null
    c.armed = false
    const box = bodyBox(id, c, { x: 0, y: 0 })
    this.moveTo(id, underKeel(x, -box.top))
    // Seen and heard on one clock: the ring on the water and its splash begin in the same step.
    if (seen) this.ripples.push({ x, age: 0 })
    if (seen && sounded) this.cues.push({ name: 'railSplash' })
  }

  // --- Time -------------------------------------------------------------------

  step(dt: number): void {
    if (!(dt > 0)) return
    this.lastStep = dt
    this.time += dt
    this.baitSince += dt
    const dripped = this.dripping
    this.dripping += dt
    this.peg.since += dt
    this.scene?.update(this.time)
    this.stepHook(dt)
    // Each drop is heard as it leaves the hook: the same moments the drops are drawn from (frame.ts).
    if (Number.isFinite(this.dripping)) DRIPS.forEach((at, index) => { if (dripped < at && this.dripping >= at) this.cues.push({ name: 'drip', index, by: 'hook' }) })
    this.lit = null
    for (const id of CREATURE_IDS) this.stepCreature(id, dt)
    this.stepTrain(dt, false)
    this.lit = null
    this.stepPassing(dt)
    this.separate()
    this.lit = null
    this.stepDeck(dt)
    this.stepWater(dt)
  }

  /** What holds the hook besides the finger: a creature that has hold of it or of the bait. */
  private pull(): Point {
    const grip = this.grip
    if (!grip) return { x: 0, y: 0 }
    const c = this.creatures[grip.id], t = c.since
    // The anglerfish pulls the hook down and lets go; the octopus shakes it three times; the shark worries the boot.
    if (c.cell === 'none.angler') return { x: 0, y: t < 1.3 ? 52 * Math.min(1, t / 0.3) : 0 }
    if (c.cell === 'none.octopus') return { x: 0, y: t < 1.35 ? 18 * Math.sin((TAU * t) / 0.45) : 0 }
    if (c.cell === 'boot.shark') return t > 0.15 && t < 1.7 ? { x: 9 * Math.sin(this.time * 26), y: 6 * Math.cos(this.time * 21) } : { x: 0, y: 0 }
    return { x: 0, y: 0 }
  }

  private stepHook(dt: number): void {
    const hook = this.hook, wasUnder = hook.y > WATERLINE
    if (this.tow && towAt(this.tow.t, this.tow.bite).held) {
      // The hook is in the shark and goes where the shark goes.
      const tow = towAt(this.tow.t, this.tow.bite)
      this.hookTo({ x: tow.x + 112 * tow.face, y: tow.y + 16 })
      return
    }
    let goal: Point = this.target
    if (this.tip) {
      const wound = tipAt(this.tip.t).wound
      goal = { x: this.tip.from.x + (HOOK_REST.x - this.tip.from.x) * wound, y: this.tip.from.y + (HOOK_REST.y - this.tip.from.y) * wound }
    } else if (this.grip) {
      const pull = this.pull()
      goal = { x: this.grip.at.x + pull.x, y: this.grip.at.y + pull.y }
    }
    let wasX = hook.x
    for (let left = dt; left > 0; left -= SUBSTEP) {
      const h = Math.min(SUBSTEP, left)
      hook.vx += (HOOK_STIFFNESS * (goal.x - hook.x) - HOOK_DAMPING * hook.vx) * h
      hook.vy += (HOOK_STIFFNESS * (goal.y - hook.y) - HOOK_DAMPING * hook.vy) * h
      hook.x += hook.vx * h
      hook.y += hook.vy * h
      // Neither the hook nor the line goes through the boat or the net: a hook swung against the bow or the bag
      // slides down it until it can pass under, and one already under stays under until it is clear.
      for (const [edge, depth] of [[UNDER_BOAT, KEEL_DEPTH], [UNDER_NET, NET_DEPTH]] as const) {
        if (hook.x >= edge || hook.y >= depth) continue
        if (wasX >= edge) { hook.x = edge; hook.vx = Math.max(0, hook.vx) }
        else { hook.y = depth; hook.vy = Math.max(0, hook.vy) }
      }
      wasX = hook.x
      if (hook.y > HOOK_BOUNDS.bottom) { hook.y = HOOK_BOUNDS.bottom; hook.vy = Math.min(0, hook.vy) }
      if (hook.y < HOOK_BOUNDS.top - 8) { hook.y = HOOK_BOUNDS.top - 8; hook.vy = Math.max(0, hook.vy) }
    }
    const under = hook.y > WATERLINE
    if (under !== wasUnder) {
      this.cues.push({ name: under ? 'splashIn' : 'splashOut' })
      // A hook dipped back in has no drops left on it, to see or to hear.
      if (under && this.dripping < DRIPS[DRIPS.length - 1] + 0.2) this.hushes.push('hook')
      this.dripping = under ? Infinity : 0
      this.ripples.push({ x: hook.x, age: 0 })
    }
    // The reel: one click for each stretch of line that goes out or comes in, and no more than one a step.
    const out = lineLength(ROD_TIP, hook)
    if (out - this.paid >= LINE_PER_CLICK || this.paid - out >= LINE_PER_CLICK_UP) {
      const up = out < this.paid
      // (Also while the line winds in at the end of a trip: those clicks are the line's own, so a hook already wound in makes none.)
      this.cues.push(this.tip ? { name: 'click', depth: depthOf(hook.y), up, by: 'scene' } : { name: 'click', depth: depthOf(hook.y), up })
      this.reel += up ? -REEL_STEP : REEL_STEP
      // The next click is one stretch on from this one, so the clicks keep the line's own measure; a hook that outruns them is not clicked after.
      const stretch = up ? -LINE_PER_CLICK_UP : LINE_PER_CLICK
      this.paid = Math.abs(out - (this.paid + stretch)) > Math.abs(stretch) ? out : this.paid + stretch
    }
  }

  private stepCreature(id: CreatureId, dt: number): void {
    const c = this.creatures[id]
    c.now = this.time
    if (c.inked > 0) c.inked = Math.max(0, c.inked - dt)
    if (c.extra > 0 && (id !== 'blobfish' || (c.mode === 'home' && c.cell === null))) c.extra = Math.max(0, c.extra - dt)
    if (c.mode === 'away') return
    const pose = this.basePose(id), reach = this.reachOf(id), away = this.reachTo(id, pose)
    // A thing is touched where it is drawn: a hook anywhere on its body is at it. The two who never leave their
    // place answer it there; the shark comes round to it (below); everyone else brings the part that answers to the hook.
    const onBody = this.hook.y > WATERLINE && inside(this.hook, bodyBox(id, c, pose))
    // The shark's mouth comes round to a hook that lies level with it; one laid higher on its back it answers there.
    const level = id === 'shark' && Math.abs(this.hook.y - (pose.y + CREATURES.shark.touch.y)) < reach * 0.8
    const on = onBody && !level
    const within = away < reach && this.hook.y > WATERLINE
    // One that has no room to come any nearer answers from where it is.
    const near = within || (on && (STAYS_PUT.includes(id) || id === 'shark' || c.mode !== 'home' || c.coming > 0.7))
    const free = c.cell === null && c.armed && !this.playing && !this.finished && (c.mode === 'home' || c.mode === 'return') && this.hooked === null
    c.comes = free && this.live && on && !near
    // Until the child has drawn the line nobody starts anything, but whoever the hook comes to stops and looks at it.
    c.notice = approach(c.notice, free && !this.live && away < reach * NOTICE_AT && this.hook.y > WATERLINE ? 1 : 0, 6, dt)
    if (c.cell === null) {
      if (!c.armed && away > reach * 1.5 && !onBody) {
        c.armed = true
        // The stick it answered has gone: the squid waves one arm after it.
        if (id === 'squid' && c.count === 1 && c.mode === 'home') { c.count = -1; this.begin(id, 'glow.squid.bye') }
      }
      // Only someone at home answers, only a hook the child has drawn, and nobody while a scene plays or a trip is over.
      if (free && near && this.live) {
        const key = cellKey(this.bait, id, this.spoonFlashes())
        if (cellOf(key).outcome === 'tows') this.startTow(pose)
        else this.begin(id, key)
      }
    } else if (c.cut) {
      c.fade -= FADE_RATE * dt
      if (c.fade <= 0) this.endAnswer(id)
    } else this.carryOn(id, c, dt, pose, away, onBody)
    c.act = approach(c.act, c.cell !== null && !c.cut ? 1 : 0, 7, dt)
    // Whoever is busy with the hook stops drifting about, and so does whoever is looking at it; the others never stop.
    c.t += dt * (1 - Math.max(0.92 * c.act, c.notice))
    // The pufferfish's one weakness is worms: with a worm hanging in the sunlit water beside its stretch, it hurries along until it comes to it.
    if (id === 'puffer' && c.cell === null && c.mode === 'home' && this.live && !this.finished && this.bait === 'worm' && !near && !this.playing && this.hook.y > WATERLINE && this.hook.y < LAYERS.sunlit.bottom + 30 && Math.abs(this.hook.x - CREATURES.puffer.home.x) < 150) c.t += dt * 2
    // A hook laid on the shark's back, away from its mouth: it hurries round its stretch until its mouth comes to it,
    // for as long as the hook stays where its mouth will pass.
    if (id === 'shark') {
      const waits = free && this.live && c.mode === 'home' && !near && level && Math.abs(this.hook.x - CREATURES.shark.home.x) < 330
      if (waits && onBody) c.hurries = true
      if (!waits) c.hurries = false
      if (c.hurries) c.t += dt * 4
    }
    this.settle(id, c, dt)
  }

  /** The hook has come within reach: the creature's answer to what is on it begins. */
  private begin(id: CreatureId, key: CellKey): void {
    const c = this.creatures[id], cell = cellOf(key)
    c.cell = key
    c.since = 0
    c.cut = false
    c.fade = 1
    c.landed = false
    c.armed = false
    // The squid that answers the stick owes it a wave from the moment it answers, however soon the stick is drawn away.
    c.count = key === 'glow.squid' ? 1 : -1
    // A blobfish under its sand comes out of it to answer.
    if (id === 'blobfish') c.extra = 0
    if (c.mode === 'return') c.mode = 'home'
    if (cell.grip) this.grip = { id, at: { x: this.hook.x, y: this.hook.y } }
    this.sound(id, key, -1, 0)
  }

  /** The sounds of an answer that fall between two moments of it, and whatever else happens with them. */
  private sound(id: CreatureId, key: CellKey, was: number, now: number): void {
    for (const beat of cellOf(key).beats) {
      if (!(was < beat.at && now >= beat.at)) continue
      this.cues.push(beat.index === undefined ? { name: beat.cue, by: id } : { name: beat.cue, index: beat.index, by: id })
      const at = this.centre(id)
      if (beat.cue === 'squirt') this.inks.push({ x: at.x, y: at.y + 10, age: 0, size: 0.8 })
      if (beat.cue === 'inkPuff') this.inks.push({ x: at.x, y: at.y, age: 0, size: 1.15 })
      if (beat.cue === 'wetThump') this.inks.push({ x: at.x, y: at.y - 16, age: 0, size: 1.7 })
      if (beat.cue === 'creak' && beat.index === 0) { this.catDoes('cling'); this.boat.pulled = 7 }
      if (beat.cue === 'twangLine') { this.hook.vy -= 900; this.boat.speed -= 60; this.boat.pulled = 0 }
      if (beat.cue === 'growl') this.boat.speed += beat.index === 0 ? 46 : -46
    }
  }

  /** One more step of an answer that is under way. */
  private carryOn(id: CreatureId, c: CreatureState, dt: number, pose: Pose, away: number, onBody: boolean): void {
    const key = c.cell!, cell = cellOf(key), was = c.since, hook = this.hook
    c.since += dt
    const crossed = (at: number): boolean => was < at && c.since >= at
    this.sound(id, key, was, c.since)
    // The outcome lands at its moment.
    if (!c.landed && cell.outcome !== 'joke' && c.since >= cell.at) {
      c.landed = true
      this.land(id, cell.outcome)
    }
    switch (key) {
      case 'none.turtle':
        // One thump of the back flipper for each stretch of scratching.
        if (Math.floor(c.since / KNOCK_EVERY) > Math.floor(was / KNOCK_EVERY)) this.cues.push({ name: 'knock', by: id })
        break
      case 'none.shark': {
        // The hook plays whichever tooth it is at, once each time it comes to it.
        const along = (hook.x - pose.x) * pose.face, level = Math.abs(hook.y - (pose.y + 22))
        let tooth = -1
        SHARK_TEETH.forEach((x, index) => { if (level < 44 && Math.abs(along - x) < 4.5) tooth = index })
        if (tooth >= 0 && tooth !== c.count) {
          c.count = tooth
          this.cues.push({ name: 'tooth', index: tooth, by: id })
        }
        if (away > CREATURES.shark.reach * 1.3 || hook.y <= WATERLINE) return this.cutShort(id)
        break
      }
      case 'none.jelly':
        // A hook drawn out of the water shakes it off.
        if (c.since < 2.2 && hook.y < WATERLINE + 30) c.since = 2.2
        break
      case 'none.blobfish':
        if (crossed(1)) this.bubbles.push({ x: pose.x - 84, y: pose.y - 16, r: 22, rise: 86, sway: 0, big: true })
        break
      case 'spoon.shark':
        if (crossed(1.95)) this.tooth = { x: pose.x + 150 * pose.face, age: 0 }
        break
      case 'worm.blobfish': {
        // It waits with its mouth open for as long as the worm is near. Only a worm lowered right into the mouth is taken.
        const mouth = { x: pose.x + 70 * pose.face, y: pose.y + 2 }
        if (far(hook, mouth) < 24) return this.begin(id, 'worm.blobfish.gulp')
        if (c.since >= cell.lasts && away < CREATURES.blobfish.reach * 1.5) c.since = cell.lasts
        break
      }
      default:
        break
    }
    // An answer nobody stays for is broken off: the hook has been drawn away before its outcome, or in the middle of a joke.
    const gone = (away > this.reachOf(id) * CUT_AT && !onBody) || hook.y <= WATERLINE
    if (gone && cell.stays !== true && cell.grip !== true && !c.landed) return this.cutShort(id)
    if (c.since >= cell.lasts && !(key === 'worm.blobfish' && c.since === cell.lasts)) {
      if (key === 'none.shark') this.cues.push({ name: 'snap', by: id })
      this.endAnswer(id)
    }
  }

  private endAnswer(id: CreatureId): void {
    const c = this.creatures[id], key = c.cell
    c.cell = null
    if (this.grip?.id === id) this.grip = null
    if (key === 'none.angler') this.boat.pulled = 0
    if (c.cut) { c.cut = false; return }
    if (key === 'glow.blobfish') c.extra = BLOBFISH_SULKS
  }

  /** The outcome of an answer: the bait is gone, the creature is on the hook, follows, or bolts. Saved at once. */
  private land(id: CreatureId, outcome: 'bites' | 'steals' | 'follows' | 'flees' | 'tows'): void {
    const c = this.creatures[id]
    if (outcome === 'steals') {
      if (this.bait === 'glow' && id === 'shark') c.extra = SHARK_GLOWS
      this.setBait('none')
    } else if (outcome === 'bites') {
      c.booted = this.bait === 'boot'
      this.setBait('none')
      this.hooked = id
      c.mode = 'hooked'
      // The line was taken up from a rest in the air (after the last catch was landed): a touch that is taken away
      // would swing the hook back there and land this one by itself. It goes back to its rest under the boat instead.
      if (this.rest.y <= WATERLINE) this.rest = { ...HOOK_REST }
    } else if (outcome === 'follows') {
      c.mode = 'following'
      c.lure = this.bait
      this.following.push(id)
    } else if (outcome === 'flees') this.bolt(id)
    this.dirty = 2
  }

  private bolt(id: CreatureId): void {
    const c = this.creatures[id]
    c.mode = 'flee'
    c.wait = 0
    c.fled = 0
  }

  /** Where the rules carry a creature, and how it comes home afterwards. */
  private settle(id: CreatureId, c: CreatureState, dt: number): void {
    const off = c.off
    if (id === 'shark' && this.tow) {
      const tow = towAt(this.tow.t, this.tow.bite)
      return this.moveTo(id, tow)
    }
    if (c.mode === 'hooked') {
      // It hangs under the hook and swings after it.
      const hung = hungAt(id), at = this.centre(id)
      this.moveTo(id, { x: approach(at.x, this.hook.x + hung.x, 12, dt), y: approach(at.y, this.hook.y + hung.y, 12, dt) })
      // Lifted out of the water it swings into the tub, or bounces off a full one. Saved at once.
      // The cat is down before it leaves the water: nothing is swung in over a cat that is sitting up. And nothing is
      // swung in by a hook that springs back to its rest after the touch was taken away: only the child's hand lands a catch.
      if (this.hook.y < WATERLINE - 6 && c.cell === null && isCatch(id) && !this.taken && this.cat.act === 'duck' && this.cat.since >= CAT_IS_DOWN) this.swingIn(id)
      return
    }
    if (c.mode === 'flee') return this.rise(id, c, dt)
    if (c.mode === 'following') return
    if (id === 'jelly' && c.cell === 'none.jelly' && !c.cut && c.since < 2.2) {
      // Twined round the line, it hangs under the hook and goes where the hook goes, as far as it has room.
      const at = this.centre(id), to = this.keep(id, { x: this.hook.x, y: this.hook.y + 36 })
      return this.moveTo(id, { x: approach(at.x, to.x, 14, dt), y: approach(at.y, to.y, 14, dt) })
    }
    if (c.mode === 'return') {
      // It swims home at its own pace.
      const left = Math.hypot(off.x, off.y), go = HOME_SPEED[id] * dt
      if (left <= go + 1) {
        off.x = off.y = 0
        c.mode = 'home'
        c.booted = false
      } else {
        c.heading = Math.atan2(-off.y, -off.x)
        off.x -= (off.x / left) * go
        off.y -= (off.y / left) * go
      }
      return
    }
    // The jellyfish drifts after a light that goes by, once the child has drawn the line; everyone else, shoved aside, drifts back.
    const light = id === 'jelly' && c.cell === null && this.live ? this.lights().find((each) => each.by !== 'jelly' && each.by !== 'bait' && far(each.at, this.centre(id)) < 320) : undefined
    if (light) {
      const at = this.centre(id), dx = light.at.x - at.x, dy = light.at.y + 30 - at.y, gap = Math.hypot(dx, dy)
      if (gap > 150) this.moveTo(id, this.keep(id, { x: at.x + (dx / gap) * 60 * dt, y: at.y + (dy / gap) * 60 * dt }))
      return
    }
    if (c.comes) {
      // The hook lies on it: it turns the part that answers to the hook, as far as it has room.
      const at = this.centre(id), touch = this.touchOf(id, this.basePose(id))
      const to = this.keep(id, { x: at.x + this.hook.x - touch.x, y: at.y + this.hook.y - touch.y })
      c.came = true
      c.coming += dt
      return this.moveTo(id, { x: approach(at.x, to.x, 9, dt), y: approach(at.y, to.y, 9, dt) })
    }
    // Where it came to, it stays until its answer is over.
    if (c.came && c.cell !== null && !c.cut) { c.coming = 0; return }
    c.came = false
    c.coming = 0
    const rate = id === 'jelly' ? 1.4 : 2.6
    off.x = approach(off.x, 0, rate, dt)
    off.y = approach(off.y, 0, rate, dt)
  }

  /** A body kept in the sea: inside its edges, on or over the sand, and under the keel, the net or the waves. */
  private keep(id: CreatureId, at: Point): Point {
    const box = bodyBox(id, this.creatures[id], at)
    let x = at.x, y = at.y
    if (box.left < 6) x += 6 - box.left
    if (box.right > 1174) x -= box.right - 1174
    const ceiling = ceilingAt(box.left + (x - at.x), box.right + (x - at.x))
    if (box.bottom > SEABED + 2) y -= box.bottom - SEABED - 2
    if (box.top + (y - at.y) < ceiling) y += ceiling - (box.top + (y - at.y))
    return { x, y }
  }

  /** It bolts straight up: into the net if it comes up under it, or against the hull, or through the waves. */
  private rise(id: CreatureId, c: CreatureState, dt: number): void {
    const at = this.centre(id), box = bodyBox(id, c, at)
    const netted = at.x >= NET.left && at.x <= NET.right
    const stop = netted ? NET.bottom + 4 : ceilingAt(box.left, box.right) - 2
    // One that somebody cornered stands in the way of gives up and swims home.
    c.fled += dt
    if (c.fled > 3 && c.wait === 0 && c.cell === null) { c.mode = 'return'; return }
    if (box.top > stop) {
      this.moveTo(id, { x: at.x, y: at.y - Math.min(FLEE_SPEED * dt, box.top - stop) })
      return
    }
    if (c.wait === 0) {
      // Nobody is scooped while the boat is being towed: the net is travelling with it.
      if (netted && isCatch(id) && !this.tow) return this.scoop(id, at)
      if (stop > WATERLINE + 10) {
        this.cues.push({ name: 'bump' })
        this.boat.speed -= 40
        if (this.cat.act === null) this.catDoes('twitch')
      } else {
        this.cues.push({ name: 'surface' })
        this.ripples.push({ x: at.x, age: 0 })
      }
    }
    c.wait += dt
    if (c.wait > 0.45 && c.cell === null) c.mode = 'return'
  }

  private scoop(id: Catch, at: Point): void {
    const c = this.creatures[id]
    c.mode = 'away'
    c.cell = null
    const fits = this.tub.length < TUB_HOLDS
    if (fits) this.tub.push(id)
    this.flights.push({ id, kind: 'scoop', fits, t: 0, from: at, slot: this.tub.length - 1 })
    this.netSwing = 0
    this.cues.push({ name: 'scoop' })
    this.dirty = 2
  }

  private swingIn(id: Catch): void {
    const c = this.creatures[id]
    this.hooked = null
    c.mode = 'away'
    const fits = this.tub.length < TUB_HOLDS
    if (fits) this.tub.push(id)
    this.flights.push({ id, kind: 'land', fits, t: 0, from: this.centre(id), slot: this.tub.length - 1 })
    this.dirty = 2
  }

  /** Those who follow the hook, strung out behind it as a train: each keeps its distance from the one before. */
  private stepTrain(dt: number, placing: boolean): void {
    let lead: Point = this.hook, before: CreatureId | null = null
    for (const id of this.following) {
      const c = this.creatures[id], spot = CREATURES[id], at = this.centre(id)
      const gap = before === null ? FOLLOW_GAP[id] ?? 110 : (CREATURES[before].body.rx + spot.body.rx) * 0.8 + (CREATURES[before].body.ry + spot.body.ry) * 0.45 + 14
      const dx = lead.x - at.x, dy = lead.y - at.y, away = Math.hypot(dx, dy)
      if (away > gap) {
        const go = placing ? away - gap : Math.min(away - gap, (FOLLOW_SPEED[id] ?? 100) * dt)
        at.x += (dx / away) * go
        at.y += (dy / away) * go
        // It turns the way it is going, and not all at once.
        const turn = Math.atan2(Math.sin(Math.atan2(dy, dx) - c.heading), Math.cos(Math.atan2(dy, dx) - c.heading))
        c.heading += placing ? turn : turn * Math.min(1, 6 * dt)
      }
      const kept = this.keep(id, at)
      this.moveTo(id, kept)
      lead = kept
      before = id
    }
  }

  /** The three rules of passing: a light in the dark, a hunter going by, and ink. */
  private stepPassing(dt: number): void {
    const hunters = this.hunters()
    for (const id of ['squid', 'puffer', 'shoal'] as const) {
      const c = this.creatures[id]
      if (c.mode === 'away') continue
      const at = this.centre(id)
      let near = Infinity
      for (const hunter of hunters) near = Math.min(near, far(hunter, at))
      if (near > HUNTER_REACHES * 1.5) c.scared = false
      // Until the child draws the line nothing starts: whoever a hunter hangs beside when the game opens is already past its scare.
      if (!this.live) { if (near < HUNTER_REACHES * 1.5) c.scared = true; continue }
      if (near >= HUNTER_REACHES || c.scared || c.cell !== null || (c.mode !== 'home' && c.mode !== 'return')) continue
      c.scared = true
      if (id === 'shoal') {
        // The shoal scatters and gathers again.
        c.extra = SHOAL_SCATTERS
        this.cues.push({ name: 'scatter' })
        continue
      }
      // The squid bolts straight up out of a puff of ink; the pufferfish swells and bobs up.
      this.cues.push({ name: 'startle' })
      if (id === 'squid') this.inks.push({ x: at.x, y: at.y, age: 0, size: 1 })
      this.bolt(id)
    }
    // Whoever follows loses the line in an ink cloud and drifts home; a catch drawn up through ink comes up black.
    for (const ink of this.inks) {
      if (ink.age > INK_LASTS * 0.7) continue
      const reach = 62 * ink.size
      for (const id of [...this.following]) {
        if (far(this.centre(id), ink) > reach + 30) continue
        this.leave(id)
        this.cues.push({ name: 'inkLost' })
      }
      if (this.hooked !== null && far(this.centre(this.hooked), ink) < reach + 20) this.creatures[this.hooked].inked = 14
    }
    void dt
  }

  /**
   * Nothing passes through anything. The bodies are placed one after another, whoever has most to do first, and
   * each one that would lie in a body already placed takes the nearest free room instead: the shortest way out
   * that keeps it in the sea and clear of everyone placed before it. So a body is pushed along by whoever comes
   * at it and slips round only when it is cornered, and it drifts home when it is let be.
   */
  private separate(): void {
    type Body = { id: CreatureId; box: Rect; rank: number }
    const bodies: Body[] = []
    CREATURE_IDS.forEach((id, index) => {
      const c = this.creatures[id]
      if (c.mode === 'away') return
      // Where the rules have it, it is under the keel and under the bag of the net too: what holds it down is kept, so that being shoved never winds it up against a ceiling.
      if (c.mode !== 'hooked' && !(id === 'shark' && this.tow !== null)) {
        const at = this.centre(id), last = this.lastBox[id]
        let core = bodyBox(id, c, at)
        // One that drifts sideways at the bag of the net or at the keel, too high to go under, is stopped by its edge like a wall until it has sunk far enough.
        const edge = CEILINGS.find((each) => core.left < each.right && core.right > each.left)
        if (edge && last && (c.mode === 'home' || c.mode === 'return') && edge.under - 2 - core.top > DUCKS_UNDER && (last.left >= edge.right - 1 || last.right <= edge.left + 1)) {
          at.x += last.left >= edge.right - 1 ? edge.right + 0.5 - core.left : edge.left - 0.5 - core.right
          core = bodyBox(id, c, at)
        }
        const under = ceilingAt(core.left, core.right) - 2
        if (core.top < under - 0.01) at.y += under - core.top
        this.moveTo(id, at)
      }
      const pose = (this.poses[id] = this.shown(id))
      // Who gives way to whom: the octopus in its pot, the blobfish on the sand and the shark with the boat in tow move for nobody; then whoever the hook carries, whoever bolts or answers, the train in its order, and whoever is only drifting.
      const fixed = (c.mode === 'home' && (id === 'octopus' || (id === 'blobfish' && c.cell !== 'cheese.blobfish'))) || (id === 'shark' && this.tow !== null)
      const carried = c.mode === 'hooked' || (id === 'jelly' && c.cell === 'none.jelly')
      const rank = fixed ? 5 : carried ? 4 : c.mode === 'flee' || c.cell !== null || c.comes ? 3 : c.mode === 'following' ? 2 - this.following.indexOf(id) * 0.01 : 1 - index * 0.01
      let box = bodyBox(id, c, pose)
      // However its answer throws it about, it stays under the keel and under the bag of the net.
      const ceiling = ceilingAt(box.left, box.right)
      if (ceiling > WATERLINE + 6 && box.top < ceiling - 2 && !fixed) {
        const down = ceiling - 2 - box.top
        pose.y += down
        box = { left: box.left, right: box.right, top: box.top + down, bottom: box.bottom + down }
      }
      bodies.push({ id, box, rank })
    })
    // A body is shoved only a little way in a step. One whose nearest free room is further than that is cornered:
    // it keeps the place it had, and whoever came at it is the one that makes way and waits. From there it slips
    // toward that room, a little each step and through nobody who is also holding their place, until it is there.
    const shift = (box: Rect, x: number, y: number): Rect => ({ left: box.left + x, right: box.right + x, top: box.top + y, bottom: box.bottom + y })
    bodies.sort((a, b) => b.rank - a.rank)
    const fixed = bodies.filter((body) => body.rank >= 5).map((body) => body.box)
    const cornered = new Map<CreatureId, Point>(), ways = new Map<CreatureId, Point>(), arrived = new Set<CreatureId>()
    for (const body of bodies) {
      const slip = this.slipping.get(body.id), last = this.lastBox[body.id]
      if (slip && last && body.rank < 5 && !fixed.some((other) => overlap(last, other))) cornered.set(body.id, slip.room)
    }
    for (let round = 0; round < 8; round++) {
      ways.clear()
      arrived.clear()
      const placed: { box: Rect; yields: boolean }[] = fixed.map((box) => ({ box, yields: false }))
      const holding = bodies.filter((body) => cornered.has(body.id)), lasts = holding.map((body) => this.lastBox[body.id]!)
      holding.forEach((body, index) => {
        const last = lasts[index], room = cornered.get(body.id)!
        const dx = room.x - last.left, dy = room.y - last.top, away = Math.hypot(dx, dy), go = Math.min(1, (SLIPS * this.lastStep) / (away || 1))
        // It slips on only where that crosses nobody who is standing still or holding: straight for its room, or else along or down toward it, and never up into the keel or the net.
        const clear = (on: Rect): boolean => on.top >= ceilingAt(on.left, on.right) - 4.01 && !fixed.some((other) => overlap(on, other)) && !lasts.some((other, at) => at !== index && overlap(on, other)) && !placed.some((other) => overlap(on, other.box))
        const pace = SLIPS * this.lastStep, tries = [shift(last, dx * go, dy * go), shift(last, Math.max(-pace, Math.min(pace, dx)), 0), shift(last, 0, Math.max(-pace, Math.min(pace, dy)))]
        const box = tries.find((on) => (on.left !== last.left || on.top !== last.top) && clear(on)) ?? last
        if (box === tries[0] && go >= 1) arrived.add(body.id)
        if (away < 0.5) arrived.add(body.id)
        ways.set(body.id, { x: box.left - body.box.left, y: box.top - body.box.top })
        placed.push({ box, yields: true })
      })
      let stuck: CreatureId | null = null, room: Point = { x: 0, y: 0 }
      for (const body of bodies) {
        if (body.rank >= 5 || cornered.has(body.id)) continue
        let box = body.box
        const hit = placed.filter((other) => overlap(box, other.box))
        if (hit.length > 0) {
          const c = this.creatures[body.id], way = wayOut(box, placed.map((other) => other.box), c.mode === 'home' || c.mode === 'return' ? c.off : null)
          if (way) {
            const last = this.lastBox[body.id]
            if (round < 7 && Math.hypot(way.x, way.y) > SHOVE && hit.some((other) => other.yields) && last && !fixed.some((other) => overlap(last, other))) { stuck = body.id; room = { x: box.left + way.x, y: box.top + way.y }; break }
            ways.set(body.id, way)
            box = shift(box, way.x, way.y)
          }
        }
        placed.push({ box, yields: true })
      }
      if (stuck === null) break
      cornered.set(stuck, room)
    }
    for (const body of bodies) {
      const way = ways.get(body.id), box = body.box
      this.lastBox[body.id] = way ? shift(box, way.x, way.y) : box
    }
    for (const id of CREATURE_IDS) if (this.creatures[id].mode === 'away') delete this.lastBox[id]
    // One that could not get away in a second and a half is let go of, and is shoved like anyone else again.
    for (const id of CREATURE_IDS) {
      const room = cornered.get(id), age = (this.slipping.get(id)?.age ?? 0) + this.lastStep
      if (room && !arrived.has(id) && age < 1.5) this.slipping.set(id, { room, age })
      else this.slipping.delete(id)
    }
    for (const [id, way] of ways) {
      const c = this.creatures[id], pose = this.poses[id]
      c.off.x += way.x
      c.off.y += way.y
      pose.x += way.x
      pose.y += way.y
      // The hook goes no further than the catch on it can: it is stopped with it.
      if (id === this.hooked) {
        this.hook.x += way.x
        this.hook.y += way.y
        this.hook.vx = this.hook.vy = 0
      }
    }
  }
  /** A creature as it is drawn this step, after everyone has made way. */
  pose(id: CreatureId): Pose {
    return this.poses[id] ?? this.shown(id)
  }

  private stepDeck(dt: number): void {
    const cat = this.cat, gull = this.gull, tub = this.tubWater, boat = this.boat
    cat.t += dt
    cat.poked += dt
    this.reelShown = approach(this.reelShown, this.reel, 28, dt)
    // A catch is coming up: the cat flattens itself before it leaves the water, with a small sound, and stays down until it has gone by overhead.
    const rising = (this.hooked !== null && isCatch(this.hooked) && this.hook.y < WATERLINE + CAT_DUCKS_AT) || this.flights.some((flight) => flight.kind === 'land' && flight.t < FLIGHT_SECONDS.land)
    if (rising && cat.act !== 'duck') {
      this.catDoes('duck')
      this.cues.push({ name: 'catDuck' })
    }
    if (rising && cat.act === 'duck') cat.since = Math.min(cat.since, CAT_STAYS_DOWN - dt)
    if (cat.act !== null) {
      const was = cat.since
      cat.since += dt
      for (const beat of CAT_BEATS[cat.act] ?? []) if (was < beat.at && cat.since >= beat.at) this.cues.push({ name: beat.cue, by: 'cat' })
      // (Curled up in the tub at the end of a trip, it stays curled until the scene is over and it is asleep.)
      if (cat.since >= CAT_ACTS[cat.act] && !(cat.act === 'settle' && this.tip)) cat.act = null
    }
    // The shoal has followed the spoon up to the hull: the cat leans over the rail and pats the water. Not before the child has drawn the line: nothing starts by itself.
    cat.dreamt += dt
    const shoal = this.creatures.shoal
    if (this.live && shoal.mode === 'following' && cat.act === null && cat.dreamt > 4 && !this.playing) {
      const at = this.centre('shoal')
      if (at.y < 300 && at.x > 380 && at.x < 720) { this.catDoes('dream'); cat.dreamt = 0 }
    }
    gull.t += dt
    if (gull.hop !== null) {
      gull.hop += dt
      if (gull.hop >= GULL_HOP) gull.hop = null
    }
    // The gull watches a catch come up.
    gull.watching = approach(gull.watching, this.hooked !== null && this.hook.y < WATERLINE + 130 ? 1 : 0, 5, dt)
    tub.slosh = approach(tub.slosh, this.tow ? towAt(this.tow.t, this.tow.bite).slop : 0, this.tow ? 9 : 1.6, dt)
    tub.phase += dt * 9
    boat.t += dt
    // The boat on the water is a soft spring: it dips when the line is pulled and bobs back.
    boat.speed += (60 * (boat.pulled - boat.dip) - 7 * boat.speed) * dt
    boat.dip += boat.speed * dt
    const tow = this.tow ? towAt(this.tow.t, this.tow.bite) : null
    boat.shift = approach(boat.shift, tow ? tow.shift : 0, 5, dt)
    boat.heel = approach(boat.heel, tow ? tow.heel : this.tip ? tipAt(this.tip.t).heel : 0, 14, dt)
    if (this.netSwing !== null) {
      this.netSwing += dt
      if (this.netSwing > FLIGHT_SECONDS.scoop) this.netSwing = null
    }
    // The catches in the tub lie side by side, and close up when one is tipped back.
    this.tub.forEach((id, index) => {
      if (this.flights.some((flight) => flight.id === id)) return
      const c = this.creatures[id]
      c.off.x = approach(c.off.x, TUB_SLOTS[index].x, 10, dt)
      c.off.y = approach(c.off.y, TUB_SLOTS[index].y, 10, dt)
    })
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i], was = flight.t, lasts = FLIGHT_SECONDS[flight.kind]
      flight.t += dt
      if (flight.kind === 'tipBack') {
        if (flight.t >= lasts) { this.flights.splice(i, 1); this.overTheRail(flight.id, splashOf(flight.slot).x, true, true) }
        continue
      }
      if (was < lasts && flight.t >= lasts) {
        if (flight.fits) {
          // It lands in its place, and the cat gives its opinion of it: the same one every time.
          this.flights.splice(i, 1)
          const slot = TUB_SLOTS[this.tub.indexOf(flight.id)] ?? TUB_SLOTS[0]
          this.creatures[flight.id].off = { ...slot }
          this.cues.push({ name: 'land' })
          tub.slosh = 0.7
          this.catDoes(OPINIONS[flight.id])
          this.aim()
          continue
        }
        this.cues.push({ name: 'bounce' })
      }
      if (!flight.fits && flight.t >= lasts + BOUNCE_SECONDS) {
        this.flights.splice(i, 1)
        this.overTheRail(flight.id, OFF_THE_PILE.x, true, true)
      }
    }
    this.aim()
  }

  /** The cat's opinion goes with its catch: its eyes, its paw and the octopus's arm are on the place the catch is at now, also while the catches close up. */
  private aim(): void {
    const cat = this.cat, id = cat.act === null ? undefined : this.tub.find((each) => OPINIONS[each] === cat.act)
    if (id === undefined) return
    const at = this.creatures[id].off
    cat.slot = { x: at.x - CAT.x, y: at.y - CAT.y }
  }

  private stepWater(dt: number): void {
    const bubbles = this.bubbles
    this.nextBubble -= dt
    if (this.nextBubble <= 0) {
      this.nextBubble = 1.4 + this.rng.next() * 1.8
      if (bubbles.filter((bubble) => !bubble.big).length < MAX_SMALL_BUBBLES) {
        bubbles.push({ x: 60 + this.rng.next() * 1060, y: SEABED - 6 - this.rng.next() * 160, r: 3 + this.rng.next() * 4, rise: 40 + this.rng.next() * 30, sway: this.rng.next() * 6, big: false })
      }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const bubble = bubbles[i]
      bubble.y -= bubble.rise * dt
      bubble.sway += dt
      if (bubble.big) {
        // The blobfish's bubble makes for the boat as it rises, and pops under the cat.
        bubble.x = approach(bubble.x, BUBBLE_POPS_AT.x, 0.42, dt)
        if (bubble.y <= BUBBLE_POPS_AT.y) {
          bubbles.splice(i, 1)
          this.cues.push({ name: 'pop' })
          this.ripples.push({ x: bubble.x, age: 0 })
          if (this.cat.act === null) this.catDoes('twitch')
        }
      } else if (bubble.y <= ceilingAt(bubble.x - 8, bubble.x + 8) + 2) bubbles.splice(i, 1)
    }
    for (let i = this.inks.length - 1; i >= 0; i--) {
      this.inks[i].age += dt
      if (this.inks[i].age >= INK_LASTS) this.inks.splice(i, 1)
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].age += dt
      if (this.ripples[i].age >= RIPPLE_LASTS) this.ripples.splice(i, 1)
    }
    if (this.tooth && (this.tooth.age += dt) > 20) this.tooth = null
  }
}
