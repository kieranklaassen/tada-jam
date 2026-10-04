import { atRest, clamp01, easeOut, hop, lerp, overshoot, scatter, stepSpring, type Spring } from './fx'
import { beetleHome, standingOf, tapeWalk, type Point } from './hit'
import { SHELF_POTS, type LabState } from './lab'
import type { Layout } from './layout'
import type { Live, Mote, PlantLive, Puff } from './live'
import { AT_REST, Director, actionOf, poseAt, type Channels } from './motion'
import { lookOf, type PacketId, type Pairs } from './plant'
import { CELL_VOICES, GAME_VOICES, TOY_VOICES, noteOf, seedTick, type Part } from './voices'

// Everything on the page that is on its way somewhere: springs, hops, seeds
// in the air, dust, the beetle and the worm. The toy (toy.ts) tells it what
// happened; it steps on game time and fills in what the view draws (live.ts).
// It decides nothing about the page and nothing here is saved: a page that
// is put away and opened again is found with everything at rest.

export type Spot = { x: number; y: number; k: number }
export type Sound = { parts: readonly Part[]; after: number }

type PlantFx = {
  bend: Spring
  squash: Spring
  grow: number
  /** Seconds until it starts to draw itself, and how long that takes. */
  wait: number
  seconds: number
  /** Its own note, played as its flower opens. */
  note: readonly Part[] | null
  hop: { from: Spot; to: Spot; t: number; wait: number; seconds: number; lift: number } | null
  held: Spot | null
}
type PodFx = { age: number; held: boolean; waiting: boolean; shake: Spring; at: Point | null; fat: number; puff: number }
type Flight = { from: Point; to: Point; t: number; wait: number; seconds: number; lift: number; k: number; tick: number; turn: number }
type MoteFx = { x: number; y: number; vx: number; vy: number; life: number; r: number; floor: number; wet?: boolean }
type PuffFx = { x: number; y: number; r: number; t: number; seconds: number; kind: Puff['kind'] }
/** A plant that has left the page and is still on its way off it. */
export type Ghost = { id: number; pairs: Pairs; dry: boolean; from: Spot; t: number; stays?: boolean; to?: Spot; seconds?: number; then?: () => void; ride?: number }

/** A pod swells for this long, then holds its breath for this long, then bursts. */
export const POD_SWELL = 0.5
export const POD_BREATH = 0.8
const GHOST_SECONDS = 0.7
/** How many plants the beetle carries off the page at once, and how long one takes to hop onto its back. */
export const LOAD = 6
const HOP_ON = 0.55
const MOTES = 150
/** The specks of the small cloud that rides on a dusty finger. */
const HAND_SPECKS = 10

export class Effects {
  readonly sounds: Sound[] = []
  readonly ghosts: Ghost[] = []
  /** Goes up whenever the plants leaving the page change, so the toy knows to make its view again. */
  version = 0
  private readonly plants = new Map<number, PlantFx>()
  private readonly pods = new Map<number, PodFx>()
  private flights: Flight[] = []
  private motes: MoteFx[] = []
  private puffs: PuffFx[] = []
  private readonly pots = new Map<number, { squash: Spring; at: Point | null }>()
  private readonly packets = new Map<PacketId, { shake: Spring; spin: number }>()
  private heldSeed: { x: number; y: number } | null = null
  private beetlePlace: Point | null = null
  private beetleGoing: { from: Point; to: Point | null; t: number; seconds: number; then?: () => void } | null = null
  private beetleHeld = false
  /** The plants on the beetle's back, to be carried off the page: the ids of their ghosts, in the order they came. */
  private load: number[] = []
  /** Where it is with its load: not set out, on its way off the page, or on its way home. */
  private trip: 'none' | 'out' | 'back' = 'none'
  private tripGo: object | null = null
  /** It faces away from the plants: on its way off the page. */
  private beetleTurned = false
  private sketching = 1
  /** A sketch that waits to be drawn until the beetle is home from carrying its plant out, and the sound of it. */
  private sketchDue = 0
  /** How flat the beetle has pressed the strip of tape it smooths: 1 as it presses, easing back to 0 as the strip lifts again. */
  // Flat when the page opens: the beetle has been pressing it for a while by then.
  private tapeDown = 1
  private tapeHeld = 0
  /** The beetle's action was asked of it, and is not one of the things it does by itself. */
  private beetleAnswers = false
  private sketchVoice: readonly Part[] | null = null
  private dusty: Point | null = null
  private prints: { x: number; y: number; life: number }[] = []
  private readonly director: Director
  // When the page opens something is already going on: the beetle is halfway through smoothing a strip of tape (half of the action's 3.4 seconds).
  private beetle = { action: 'smooth-tape' as string | null, t: 1.7, wait: 1.5, queue: [] as string[], gold: 0, legs: 0, lastSneeze: 0, printIn: 0, look: 0 }
  private worm: { pot: number; action: string; t: number; cap: boolean } | null = null
  // When the page opens the worm is about to look out of a pot near the middle of it.
  private wormWait = 0.5
  private wormSeen = false
  private time = 0
  private draws = 0
  private ghostId = -1
  private readonly pose: Channels = { ...AT_REST }

  constructor(public layout: Layout, private readonly seed: number) {
    this.director = new Director(seed)
  }

  /** A number from 0 up to 1, the next of this page's own run of them: the same run for the same seed. */
  private some(): number {
    return scatter(this.seed, this.draws++)
  }

  /** Sounds that were still to come are dropped: a touch has cut short the scene they belonged to. */
  hush(): void {
    for (let i = this.sounds.length - 1; i >= 0; i--) if (this.sounds[i].after > 0) this.sounds.splice(i, 1)
  }

  /** While a touch is cutting a scene short, what the scene still had to sound is not sounded. */
  muted = false

  play(parts: readonly Part[], after = 0): void {
    if (!this.muted) this.sounds.push({ parts, after })
  }

  // --- Plants -------------------------------------------------------------------

  private plant(id: number): PlantFx {
    let fx = this.plants.get(id)
    if (!fx) this.plants.set(id, (fx = { bend: { x: 0, v: 0 }, squash: { x: 1, v: 0 }, grow: 1, wait: 0, seconds: 0, note: null, hop: null, held: null }))
    return fx
  }

  /** A plant that has finished drawing itself has a flower to touch. */
  inBloom = (id: number): boolean => (this.plants.get(id)?.grow ?? 1) >= 1

  /** Sets a plant swinging: `bend` sideways, `squash` down (negative) or up. */
  kick(id: number, bend: number, squash = 0): void {
    const fx = this.plant(id)
    fx.bend.v += bend
    fx.squash.v += squash
  }

  /** A plant draws itself from the soil up, after `wait` seconds, and plays its own note as it opens. */
  sprout(id: number, wait: number, seconds: number, note: readonly Part[] | null): void {
    const fx = this.plant(id)
    fx.grow = 0
    fx.wait = wait
    fx.seconds = seconds
    fx.note = note
  }

  /** A plant hops from where it stood to where it stands now. */
  hopTo(id: number, from: Spot, to: Spot, wait: number, seconds = 0.42, lift = 46, quiet = false): void {
    // A long hop rises more than a short one, so that a plant leaving the tray for the border goes over the tray and not through it.
    this.plant(id).hop = { from, to, t: 0, wait, seconds, lift: Math.max(lift * this.layout.k, 0.3 * Math.hypot(to.x - from.x, to.y - from.y)) }
    if (quiet) return
    this.play(TOY_VOICES.hop, wait)
    this.play(TOY_VOICES.land, wait + seconds)
  }

  hold(id: number, at: Spot): void {
    const fx = this.plant(id)
    fx.held = at
    fx.hop = null
  }

  /** Where a held plant is, or none. */
  heldAt(id: number): Spot | null {
    return this.plants.get(id)?.held ?? null
  }

  letGo(id: number): void {
    const fx = this.plants.get(id)
    if (fx) fx.held = null
  }

  /**
   * A plant has left the page. It hops onto the back of the beetle, which
   * carries it out past its corner. With the beetle away from home, already
   * on its way out or fully laden, the plant slides off the near edge by itself.
   */
  leave(pairs: Pairs, dry: boolean, from: Spot): void {
    const id = this.ghostId--
    if (this.trip === 'none' && !this.beetleOut && this.load.length < LOAD) {
      // One after another, a twentieth of a second apart.
      this.ghosts.push({ id, pairs, dry, from, t: -0.09 * this.load.length, seconds: HOP_ON, ride: this.load.length })
      this.load.push(id)
    } else this.ghosts.push({ id, pairs, dry, from, t: 0 })
    this.version++
    this.play(TOY_VOICES.leave)
  }

  /** How many plants are on the beetle's back or on their way to it. */
  get laden(): number {
    return this.load.length
  }

  /** Where a plant rides on the beetle's back: its place in the load, and the scale it left the border at. */
  private backSpot(place: number, k: number): Spot {
    const feet = this.beetleAt(), home = beetleHome(this.layout), side = this.beetleTurned ? -1 : 1
    return { x: feet.x + side * (14 + (place - (this.load.length - 1) / 2) * 15) * home.s, y: feet.y - 55 * home.s, k: k * 0.9 }
  }

  /** A plant that has left the page but still stands where it was set down, until it is dropped: a plant a visitor is about to take. */
  standIn(pairs: Pairs, dry: boolean, at: Spot): number {
    const id = this.ghostId--
    this.ghosts.push({ id, pairs, dry, from: at, t: 0, stays: true })
    this.version++
    return id
  }

  /** A plant that has left the page is carried from one spot to another, growing or shrinking on the way, and is then gone: `then` runs when it is there. */
  carry(pairs: Pairs, dry: boolean, from: Spot, to: Spot, seconds: number, then?: () => void): void {
    this.ghosts.push({ id: this.ghostId--, pairs, dry, from, t: 0, to, seconds: Math.max(0.01, seconds), then })
    this.version++
  }

  /** The plant a stand-in is, or none. */
  standInOf(id: number): Ghost | undefined {
    return this.ghosts.find((ghost) => ghost.id === id)
  }

  /** A stand-in is moved: it rides on the visitor that is about to take it. */
  moveStandIn(id: number, at: Spot): void {
    const ghost = this.ghosts.find((one) => one.id === id && one.stays)
    if (ghost) ghost.from = { ...at }
  }

  dropStandIn(id: number): void {
    const at = this.ghosts.findIndex((ghost) => ghost.id === id)
    if (at < 0) return
    this.ghosts.splice(at, 1)
    this.version++
  }

  /** A hop that is still to come is put off: the plant stands where it was until then. */
  delayHop(id: number, wait: number): void {
    const hop = this.plants.get(id)?.hop
    if (hop && hop.t === 0) hop.wait = wait
  }

  /** Whether a plant has a hop to make or is making one. */
  hopping(id: number): boolean {
    return (this.plants.get(id)?.hop ?? null) !== null
  }

  /** A plant on its way to a new place is there at once. */
  land(id: number): void {
    const fx = this.plants.get(id)
    if (fx) fx.hop = null
  }

  /** A plant that is waiting to draw itself, or drawing itself, starts now or is grown at once. */
  sproutNow(id: number): void {
    const fx = this.plants.get(id)
    if (fx && fx.grow < 1) fx.wait = 0
  }

  grown(id: number): void {
    const fx = this.plants.get(id)
    if (!fx) return
    fx.grow = 1
    fx.wait = 0
    fx.hop = null
  }

  forget(id: number): void {
    this.plants.delete(id)
    this.pods.delete(id)
  }

  // --- Pods and seeds -------------------------------------------------------------

  /** A pod has set. One found on load is `waiting`: it holds until it is touched. */
  setPod(on: number, waiting = false): void {
    this.pods.set(on, { age: waiting ? POD_SWELL + POD_BREATH : 0, held: false, waiting, shake: { x: 0, v: 0 }, at: null, fat: 0, puff: 0 })
  }

  holdPod(on: number, held: boolean): void {
    const pod = this.pods.get(on)
    if (pod) pod.held = held
  }

  /** The game is put away: every pod that has not burst is on its plant and waits for a touch, as one found on load does. */
  podsWait(): void {
    for (const pod of this.pods.values()) {
      pod.waiting = true
      pod.held = false
      pod.at = null
      pod.fat = 0
      pod.age = POD_SWELL + POD_BREATH
    }
  }

  /** A pod that is dusted again puffs up for a moment as it blows the dust back out. */
  puffPod(on: number): void {
    const pod = this.pods.get(on)
    if (pod) pod.puff = 1
  }

  /** A pod that was wetted swells fat, well past the breath it holds, and holds until it is burst. */
  fattenPod(on: number): void {
    const pod = this.pods.get(on)
    if (!pod) return
    pod.age = POD_SWELL + POD_BREATH
    pod.held = true
    pod.fat = Math.max(pod.fat, 0.01)
  }

  /** A pod is in the hand, at that point, or back on its plant. */
  carryPod(on: number, at: Point | null): void {
    const pod = this.pods.get(on)
    if (pod) pod.at = at ? { ...at } : null
  }

  shakePod(on: number, by = 9): void {
    const pod = this.pods.get(on)
    if (pod) pod.shake.v += by * (this.some() < 0.5 ? -1 : 1)
  }

  /** A seed flies from one point to another; it ticks as it lands and throws up a little soil. `tick` is its place in the pod, or -1 for no tick. */
  fly(from: Point, to: Point, wait: number, seconds: number, tick: number): void {
    this.flights.push({ from, to, t: 0, wait, seconds, lift: (70 + 60 * this.some()) * this.layout.k, k: this.layout.k, tick, turn: this.some() * 6 })
  }

  seedInHand(at: Point | null): void {
    this.heldSeed = at
  }

  // --- Dust, puffs, pots and packets ----------------------------------------------

  /** A puff of dust at a point: specks thrown up and out, which drift down and fade. `floor` is the height they settle at, if any. */
  dust(at: Point, count: number, spread: number, floor = Infinity): void {
    for (let i = 0; i < count && this.motes.length < MOTES - HAND_SPECKS; i++) {
      const angle = -Math.PI * (0.15 + 0.7 * this.some()), speed = spread * (0.3 + 0.7 * this.some())
      this.motes.push({ x: at.x + (this.some() - 0.5) * 8, y: at.y + (this.some() - 0.5) * 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.9 + 0.9 * this.some(), r: 1 + 1.8 * this.some(), floor })
    }
  }

  /** Dust on the finger: a few specks shed at each step of the way, which hang in the air behind it and sink. */
  trail(at: Point): void {
    this.dusty = at
    for (let i = 0; i < 3 && this.motes.length < MOTES - HAND_SPECKS; i++) this.motes.push({ x: at.x + (this.some() - 0.5) * 16, y: at.y + (this.some() - 0.5) * 16, vx: (this.some() - 0.5) * 20, vy: 8 + 22 * this.some(), life: 0.7 + 0.7 * this.some(), r: 0.9 + 1.5 * this.some(), floor: Infinity })
  }

  /** Where the dust on the finger is, or none when the finger carries none: a small cloud is drawn there, just above the fingertip. */
  dustInHand(at: Point | null): void {
    this.dusty = at
  }

  /** Drops of water thrown from a point, which fall. */
  drops(at: Point, count: number, spread: number, floor = Infinity): void {
    for (let i = 0; i < count && this.motes.length < MOTES - HAND_SPECKS; i++) {
      const angle = -Math.PI * (0.1 + 0.8 * this.some()), speed = spread * (0.3 + 0.7 * this.some())
      this.motes.push({ x: at.x + (this.some() - 0.5) * 10, y: at.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5 + 0.5 * this.some(), r: 1.6 + 1.4 * this.some(), floor, wet: true })
    }
  }

  /** A wind across the page: every speck of dust in the air is carried off sideways. */
  blow(speed: number): void {
    for (const mote of this.motes) if (!mote.wet) { mote.vx += speed * (0.6 + 0.8 * this.some()); mote.vy -= 40 * this.some(); mote.floor = Infinity }
  }

  puff(at: Point, kind: Puff['kind'], r = 16, seconds = 0.45): void {
    this.puffs.push({ x: at.x, y: at.y, r: r * this.layout.k, t: 0, seconds, kind })
  }

  private pot(index: number) {
    let fx = this.pots.get(index)
    if (!fx) this.pots.set(index, (fx = { squash: { x: 1, v: 0 }, at: null }))
    return fx
  }

  squashPot(index: number, by = -2.2): void {
    this.pot(index).squash.v += by
  }

  holdPot(index: number, at: Point | null): void {
    this.pot(index).at = at
  }

  shakePacket(id: PacketId, by = 60, spin = 0): void {
    let fx = this.packets.get(id)
    if (!fx) this.packets.set(id, (fx = { shake: { x: 0, v: 0 }, spin: 0 }))
    fx.shake.v += by
    fx.spin += spin
  }

  // --- The beetle and the worm ------------------------------------------------------

  /** The beetle answers: this action now, then any that follow. */
  beetleDoes(...actions: string[]): void {
    this.beetle.action = actions[0]
    this.beetle.t = 0
    this.beetle.queue = actions.slice(1)
    this.beetleAnswers = true
  }

  /** The beetle goes over onto its back, pedals, and rights itself with a click, which sounds as it does. */
  beetleFlips(): void {
    this.beetleDoes('flip')
    this.play(CELL_VOICES['beetle-poke'])
    this.play(GAME_VOICES.click, (actionOf('beetle', 'flip')?.seconds ?? 2) * 0.8)
  }

  /** The beetle sneezes: it rears back by degrees and lets go, and the sneeze sounds as it does. */
  beetleSneezes(...then: string[]): void {
    this.beetleDoes('sneeze', ...then)
    // The voice's own let-go is three tenths of a second into it; the beetle's is a little over six tenths of the way through its action.
    this.play(TOY_VOICES.sneeze, Math.max(0, (actionOf('beetle', 'sneeze')?.seconds ?? 1.5) * 0.63 - 0.3))
  }

  beetleGold(): void {
    this.beetle.gold = 1
  }

  /** Where the beetle's feet are now. */
  beetleAt(): Point {
    const home = beetleHome(this.layout), base = this.beetlePlace ?? home
    // Smoothing its tape it goes all the way to the strip: a shift of -1 has its forefeet on the strip's free end.
    const reach = this.beetle.action === 'smooth-tape' && !this.beetlePlace ? tapeWalk(this.layout) : 150 * home.s
    return { x: base.x + this.pose.shift * reach, y: base.y }
  }

  /** The beetle is set down somewhere, at once: in the hand, or on a pot. None puts it at home. `turned` sets it down facing away from the plants. */
  beetleSet(at: Point | null, held = false, turned = false): void {
    this.beetlePlace = at ? { ...at } : null
    this.beetleGoing = null
    this.beetleHeld = held
    this.beetleTurned = turned && at !== null
  }

  /** The beetle walks to a place over some seconds; none is home. `then` runs when it is there. */
  beetleGo(to: Point | null, seconds: number, then?: () => void): void {
    const home = beetleHome(this.layout), from = this.beetlePlace ?? home
    this.beetleGoing = { from: { x: from.x, y: from.y }, to: to ? { ...to } : null, t: 0, seconds: Math.max(0.01, seconds), then }
    this.beetleHeld = false
    this.beetleTurned = false
  }

  /** The beetle is away from home: carried, set down somewhere, or on its way. */
  get beetleOut(): boolean {
    return this.beetlePlace !== null || this.beetleGoing !== null
  }

  /** Plants have left the page: the beetle draws a sketch of each, one after another, when it is home. Until it has begun one, that sketch is not on the page. */
  sketch(voice: readonly Part[] | null = null, count = 1): void {
    this.sketchDue += count
    this.sketchVoice = voice
    this.version++
  }

  /** How many sketches the beetle has still to begin: the page shows that many fewer. */
  get sketchesHeld(): number {
    return this.sketchDue
  }

  /** Whether the beetle is in the middle of answering something: a load or a sketch waits for that to end. */
  /** What the beetle is doing by name, or nothing; and whether it is on its back or in a sneeze. For its face (faces.ts). */
  get beetleDoing(): string | null {
    return this.beetle.action
  }

  private get beetleBusy(): boolean {
    return this.beetle.action !== null && this.beetleAnswers && this.beetle.action !== 'sketch'
  }

  /** The beetle begins the next sketch that is due, when it is home, free, has nothing left to carry out and has finished the one before. */
  private stepSketch(): void {
    if (this.sketchDue === 0 || this.sketching < 1 || this.trip !== 'none' || this.load.length > 0 || this.beetleOut || this.beetleBusy) return
    this.sketchDue--
    this.version++
    this.sketching = 0
    this.beetleDoes('sketch')
    if (this.sketchVoice) this.play(this.sketchVoice, 0.3)
  }

  /** Where the beetle goes off the page with its load: past the nearer side edge, level with its home. */
  private wayOut(): Point {
    const home = beetleHome(this.layout)
    return { x: home.x >= this.layout.w / 2 ? this.layout.w + 110 * home.s : -110 * home.s, y: home.y }
  }

  /** The beetle's load: it sets out when every plant is on its back and it is home and on its feet, and draws the sketch when it is back. */
  private stepTrip(): void {
    // A walk out that something cut short (a finger picked it up): it keeps its load and sets out again when it is home.
    if (this.trip === 'out' && this.beetleGoing !== this.tripGo) this.trip = 'none'
    if (this.trip === 'back' && !this.beetleOut) this.trip = 'none'
    // Not in the middle of something it was asked: a guard, a flip or a sneeze is finished first.
    if (this.trip !== 'none' || this.load.length === 0 || this.beetleOut || this.beetleBusy) return
    if (this.ghosts.some((ghost) => ghost.ride !== undefined && ghost.t < 1)) return
    const out = this.wayOut()
    this.trip = 'out'
    this.beetleDoes('lug')
    this.beetleGo(out, 1.6, () => {
      // Off the page: the plants are gone to be planted out, and it comes home.
      for (const id of this.load) {
        const at = this.ghosts.findIndex((ghost) => ghost.id === id)
        if (at >= 0) this.ghosts.splice(at, 1)
      }
      this.load = []
      this.version++
      this.trip = 'back'
      this.beetleGo(null, 1.2)
    })
    this.tripGo = this.beetleGoing
    // It walks out head first.
    this.beetleTurned = out.x > beetleHome(this.layout).x
  }

  /** The worm looks out of a pot. */
  wormDoes(pot: number, action: string, cap = false): void {
    this.worm = { pot, action, t: 0, cap }
  }

  /** Where the worm's head is while it is up out of its pot, and which pot that is; none while it is down. The view draws it by the same numbers (journal.ts). */
  wormHead(): { x: number; y: number; pot: number } | null {
    if (!this.worm) return null
    const rise = poseAt('worm', this.worm.action, this.worm.t).rise, place = [...this.layout.shelf, ...this.layout.tray][this.worm.pot], k = this.layout.k, s = k * 1.1
    if (!place || rise < 0.25) return null
    return { x: place.x + 3 * k, y: place.soil + 2 * k + (1 - Math.min(1, rise)) * 38 * s - 32 * s, pot: this.worm.pot }
  }

  /** A finger pressed the strip of tape that will not lie flat: it is flat for a moment, and lifts again by itself. */
  tapePressed(): void {
    this.tapeHeld = 0.3
  }

  // --- Time -----------------------------------------------------------------------

  /**
   * Plays `dt` seconds. Returns the plants whose pods have held their breath
   * long enough: the toy bursts them.
   */
  step(dt: number, state: LabState): number[] {
    this.time += dt
    for (const sound of this.sounds) sound.after -= dt

    for (const [id, fx] of this.plants) {
      stepSpring(fx.bend, 0, 150, 7.5, dt)
      stepSpring(fx.squash, 1, 320, 16, dt)
      if (fx.grow < 1) {
        if (fx.wait > 0) fx.wait -= dt
        else {
          fx.grow = Math.min(1, fx.grow + dt / Math.max(0.1, fx.seconds))
          if (fx.grow >= 1) {
            // The flower opens: its own note, and the stem takes the weight.
            if (fx.note) this.play(fx.note)
            fx.squash.v -= 1.4
            fx.bend.v += (this.some() - 0.5) * 2
          }
        }
      }
      if (fx.hop) {
        if (fx.hop.wait > 0) fx.hop.wait -= dt
        else if ((fx.hop.t += dt / fx.hop.seconds) >= 1) { fx.hop = null; fx.squash.v -= 2.4 }
      }
      if (fx.grow >= 1 && !fx.hop && !fx.held && atRest(fx.bend, 0) && atRest(fx.squash, 1)) this.plants.delete(id)
    }

    const due: number[] = []
    for (const [on, pod] of this.pods) {
      if (!state.pods.some((one) => one.on === on)) { this.pods.delete(on); continue }
      stepSpring(pod.shake, 0, 260, 9, dt)
      if (pod.fat > 0) pod.fat = Math.min(1, pod.fat + dt / 0.22)
      pod.puff = Math.max(0, pod.puff - dt / 0.5)
      if (pod.held || pod.waiting) { pod.age = Math.min(pod.age + dt, POD_SWELL + POD_BREATH); continue }
      if ((pod.age += dt) >= POD_SWELL + POD_BREATH) due.push(on)
    }

    this.flights = this.flights.filter((flight) => {
      if (flight.wait > 0) { flight.wait -= dt; return true }
      if ((flight.t += dt / flight.seconds) < 1) return true
      if (flight.tick >= 0) this.play(seedTick(flight.tick))
      this.puff(flight.to, 'soil', 12, 0.35)
      // A seed that lands where the beetle is, away from home among the pots, knocks it over: it goes home on its back.
      const feet = this.beetleAt()
      if (this.beetlePlace && !this.beetleHeld && this.trip === 'none' && this.beetle.action !== 'flip' && Math.hypot(flight.to.x - feet.x, flight.to.y - feet.y) < 90 * this.layout.k) {
        this.beetleFlips()
        this.beetleGo(null, 1.4)
      }
      return false
    })

    this.motes = this.motes.filter((mote) => {
      mote.life -= dt
      mote.vy += (mote.wet ? 520 : 55) * dt
      mote.vx *= 1 - Math.min(1, 1.6 * dt)
      mote.x += mote.vx * dt
      mote.y = Math.min(mote.floor, mote.y + mote.vy * dt)
      return mote.life > 0 && mote.x > -20
    })
    this.puffs = this.puffs.filter((puff) => (puff.t += dt / puff.seconds) < 1)
    for (const [index, pot] of this.pots) {
      stepSpring(pot.squash, 1, 300, 15, dt)
      if (!pot.at && atRest(pot.squash, 1)) this.pots.delete(index)
    }
    for (const [id, packet] of this.packets) {
      stepSpring(packet.shake, 0, 240, 9, dt)
      packet.spin = Math.max(0, packet.spin - dt * 9)
      if (packet.spin === 0 && atRest(packet.shake, 0, 0.05)) this.packets.delete(id)
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const ghost = this.ghosts[i]
      if (ghost.ride !== undefined) {
        // On its way to the beetle's back, and then on it until the beetle is off the page.
        if (ghost.t < 1 && (ghost.t += dt / HOP_ON) >= 1) { ghost.t = 1; this.play(TOY_VOICES.land) }
        continue
      }
      if (ghost.stays || (ghost.t += dt / (ghost.seconds ?? GHOST_SECONDS)) < 1) continue
      this.ghosts.splice(i, 1)
      this.version++
      ghost.then?.()
    }
    if (this.sketching < 1) this.sketching = Math.min(1, this.sketching + dt / 1.3)
    this.prints = this.prints.filter((print) => (print.life -= dt / 6) > 0)

    this.stepBeetle(dt)
    this.stepWorm(dt, state)
    return due
  }

  private stepBeetle(dt: number): void {
    const beetle = this.beetle, home = beetleHome(this.layout)
    this.stepTrip()
    this.stepSketch()
    const going = this.beetleGoing
    if (going) {
      going.t += dt / going.seconds
      const to = going.to ?? home, u = clamp01(going.t), eased = u * u * (3 - 2 * u)
      this.beetlePlace = { x: lerp(going.from.x, to.x, eased), y: lerp(going.from.y, to.y, eased) }
      if (going.t >= 1) {
        this.beetlePlace = going.to ? { ...going.to } : null
        this.beetleGoing = null
        going.then?.()
      }
    }
    if (beetle.action) {
      beetle.t += dt
      if (beetle.t >= (actionOf('beetle', beetle.action)?.seconds ?? 0)) {
        beetle.action = beetle.queue.shift() ?? null
        beetle.t = 0
        beetle.wait = this.director.pause('beetle')
        // Whatever it was doing away from home is done: it walks back.
        if (!beetle.action && this.beetlePlace && !this.beetleHeld && !this.beetleGoing) this.beetleGo(null, 1.3)
      }
    } else if (!this.beetleOut && (beetle.wait -= dt) <= 0) {
      beetle.action = this.director.next('beetle')
      this.beetleAnswers = false
      beetle.t = 0
    }
    poseAt('beetle', beetle.action ?? '', beetle.t, this.pose)
    // Smoothing the tape: while it leans in and presses, the strip lies flat; it lifts again when the beetle steps back.
    // A finger presses it flat as well, for as long as a fingertip is on a thing, and it lifts again as slowly.
    if (this.tapeHeld > 0) { this.tapeHeld -= dt; this.tapeDown = Math.min(1, this.tapeDown + dt / 0.06) }
    else if (beetle.action === 'smooth-tape' && this.pose.lean < -0.18) this.tapeDown = Math.min(1, this.tapeDown + dt / 0.25)
    else this.tapeDown = Math.max(0, this.tapeDown - dt / 1.6)
    // Its legs go as its action says, and also while it walks somewhere or is held in the air.
    beetle.legs = (beetle.legs + (this.pose.legs + (this.beetleGoing ? 2.2 : 0) + (this.beetleHeld ? 3 : 0)) * dt) % 1
    // The sneeze lets go: a cloud at its head, and a wind that takes the dust in the air with it.
    if (beetle.lastSneeze > 0.9 && this.pose.sneeze < 0.2) {
      this.puff({ x: this.beetleAt().x - 52 * home.s, y: home.y - 30 * home.s }, 'sneeze', 22, 0.5)
      this.blow(-320)
    }
    beetle.lastSneeze = this.pose.sneeze
    beetle.gold = Math.max(0, beetle.gold - dt / 7)
    // While it walks its dust off it leaves gold prints, a pair a step.
    if (beetle.action === 'walk-off' && beetle.gold > 0.15 && (beetle.printIn -= dt) <= 0) {
      beetle.printIn = 0.2
      this.prints.push({ x: this.beetleAt().x + 10 * home.s, y: home.y + 2, life: beetle.gold })
    }
  }

  private stepWorm(dt: number, state: LabState): void {
    const taken = (pot: number) => state.plants.some((plant) => plant.row !== 'border' && (plant.row === 'shelf' ? plant.slot : SHELF_POTS + plant.slot) === pot)
    // A plant has come up in the worm's pot: it is gone at once.
    if (this.worm && taken(this.worm.pot)) { this.worm = null; this.wormWait = this.director.pause('worm') }
    if (this.worm) {
      this.worm.t += dt
      if (this.worm.t >= (actionOf('worm', this.worm.action)?.seconds ?? 0)) { this.worm = null; this.wormWait = this.director.pause('worm') }
      return
    }
    if ((this.wormWait -= dt) > 0) return
    // It looks out of some empty pot, by itself, now and then.
    const empty = Array.from({ length: SHELF_POTS * 2 }, (_, pot) => pot).filter((pot) => !taken(pot))
    if (empty.length === 0) { this.wormWait = this.director.pause('worm'); return }
    // The first time it comes up near the middle of the page, as high as it goes: something alive there before any touch. After that, anywhere.
    if (!this.wormSeen) {
      this.wormSeen = true
      const middle = [SHELF_POTS + 2, SHELF_POTS + 3, 3, 2, SHELF_POTS + 4, SHELF_POTS + 1].find((pot) => empty.includes(pot)) ?? empty[0]
      this.worm = { pot: middle, action: 'periscope', t: 0, cap: false }
      return
    }
    this.worm = { pot: empty[Math.min(empty.length - 1, Math.floor(this.some() * empty.length))], action: this.director.next('worm'), t: 0, cap: false }
  }

  // --- What the view draws ----------------------------------------------------------

  /** Fills in what is in motion right now. The glow and the hand are the toy's to set. */
  fill(live: Live, state: LabState): void {
    live.plants.clear()
    for (const [id, fx] of this.plants) {
      const plant = state.plants.find((one) => one.id === id)
      if (!plant) continue
      let at: PlantLive['at'] = fx.held
      if (!at && fx.hop) {
        const u = fx.hop.wait > 0 ? 0 : clamp01(fx.hop.t), point = hop(fx.hop.from.x, fx.hop.from.y, fx.hop.to.x, fx.hop.to.y, fx.hop.lift, u)
        at = { ...point, k: lerp(fx.hop.from.k, fx.hop.to.k, easeOut(u)) }
      }
      live.plants.set(id, { grow: fx.grow, bend: fx.bend.x, squash: fx.squash.x, at, held: fx.held !== null })
    }
    for (const ghost of this.ghosts) {
      // Off the nearer side of the page, and smaller as it goes.
      const u = clamp01(ghost.t), off = -60
      if (ghost.ride !== undefined) {
        // To the beetle in one hop over the tray, low enough to come in under the visitor's place and above the loupe, and then wherever its back is.
        const back = this.backSpot(ghost.ride, ghost.from.k)
        const point = u < 1 ? hop(ghost.from.x, ghost.from.y, back.x, back.y, Math.max(60 * this.layout.k, 0.13 * Math.hypot(back.x - ghost.from.x, back.y - ghost.from.y)), u) : back
        live.plants.set(ghost.id, { grow: 1, bend: 0, squash: 1, at: { x: point.x, y: point.y, k: lerp(ghost.from.k, back.k, easeOut(u)) }, held: false })
        continue
      }
      if (ghost.to) {
        const point = hop(ghost.from.x, ghost.from.y, ghost.to.x, ghost.to.y, 30 * this.layout.k, u)
        live.plants.set(ghost.id, { grow: 1, bend: 0, squash: 1, at: { ...point, k: lerp(ghost.from.k, ghost.to.k, easeOut(u)) }, held: false })
        continue
      }
      live.plants.set(ghost.id, { grow: 1, bend: ghost.stays ? this.plants.get(ghost.id)?.bend.x ?? 0 : -0.25 * u, squash: 1, at: { x: ghost.stays ? ghost.from.x : lerp(ghost.from.x, off, u * u), y: ghost.from.y, k: ghost.from.k }, held: false })
    }
    live.pods.length = 0
    for (const [on, pod] of this.pods) {
      const swell = pod.age < POD_SWELL ? overshoot(pod.age / POD_SWELL, 1.2) : 1 + 0.28 * clamp01((pod.age - POD_SWELL) / POD_BREATH)
      live.pods.push({ on, swell: swell + 0.55 * pod.fat + 0.4 * Math.sin(Math.PI * pod.puff), shake: pod.shake.x, at: pod.at })
    }
    live.seeds.length = 0
    for (const flight of this.flights) {
      if (flight.wait > 0) continue
      const point = hop(flight.from.x, flight.from.y, flight.to.x, flight.to.y, flight.lift, flight.t)
      live.seeds.push({ x: point.x, y: point.y, turn: flight.turn + flight.t * 9, k: flight.k })
    }
    if (this.heldSeed) live.seeds.push({ x: this.heldSeed.x, y: this.heldSeed.y, turn: 0.4, k: this.layout.k * 1.25 })
    // The specks are written over the ones the view was handed last frame: a hundred new objects a frame would be work for nothing.
    let specks = 0
    const speck = (x: number, y: number, r: number, alpha: number, wet = false) => {
      const mote: Mote = live.motes[specks] ?? (live.motes[specks] = { x: 0, y: 0, r: 0, alpha: 0 })
      mote.x = x; mote.y = y; mote.r = r; mote.alpha = alpha; mote.wet = wet
      specks++
    }
    for (const mote of this.motes) speck(mote.x, mote.y, mote.r, clamp01(mote.life / 0.35), mote.wet === true)
    if (this.dusty) {
      // The dust the finger carries: a few specks that circle slowly just above it, where a fingertip does not hide them.
      for (let i = 0; i < HAND_SPECKS; i++) {
        const turn = this.time * (1.1 + 0.3 * scatter(7, i)) + i * 2.4, out = (9 + 9 * scatter(8, i)) * this.layout.k
        speck(this.dusty.x + Math.cos(turn) * out, this.dusty.y - 22 * this.layout.k + Math.sin(turn * 1.3) * out * 0.6, 1.1 + 1.5 * scatter(9, i), 0.9)
      }
    }
    live.motes.length = specks
    live.puffs.length = 0
    for (const puff of this.puffs) live.puffs.push({ x: puff.x, y: puff.y, r: puff.r, age: puff.t, kind: puff.kind })
    live.pots.clear()
    for (const [index, pot] of this.pots) live.pots.set(index, { at: pot.at, squash: pot.squash.x })
    live.packets.clear()
    for (const [id, packet] of this.packets) live.packets.set(id, { shake: packet.shake.x, spin: packet.spin })

    const beetle = this.beetle, pose = this.pose, home = beetleHome(this.layout)
    const idle = beetle.action === null
    live.beetle.at = pose.shift !== 0 || this.beetlePlace ? this.beetleAt() : null
    live.beetle.pose.lean = pose.lean
    live.beetle.pose.look = pose.look + beetle.look
    live.beetle.pose.breath = idle ? 0.5 - 0.5 * Math.cos(this.time * 1.3) : pose.breath
    live.beetle.pose.sway = (this.time * 0.21) % 1
    live.beetle.flip = pose.flip
    live.beetle.pedal = beetle.legs
    live.beetle.gold = beetle.gold
    live.beetle.sneeze = pose.sneeze
    live.beetle.loupe = pose.loupe
    live.sketching = this.sketching
    live.beetle.cases = pose.part
    live.beetle.sink = pose.part2
    live.beetle.turned = this.beetleTurned
    live.tapeDown = this.tapeDown
    live.prints.length = 0
    for (const print of this.prints) live.prints.push({ x: print.x, y: print.y, r: 1.6 * home.s, alpha: clamp01(print.life) })
    if (this.worm) {
      const worm = poseAt('worm', this.worm.action, this.worm.t)
      live.worm = { pot: this.worm.pot, rise: worm.rise, look: worm.look, cap: this.worm.cap }
    } else live.worm = null
  }

  /**
   * Whether something the child set off is still on its way: a plant growing, hopping or swinging, a seed in the air,
   * a pod on its way to bursting. While it is, the child is not idle. Dust in the air does not count: the ghost hand
   * sheds dust of its own, and would otherwise put off its own showing for ever.
   */
  get busy(): boolean {
    if (this.plants.size > 0 || this.flights.length > 0 || this.ghosts.length > 0) return true
    for (const pod of this.pods.values()) if (!pod.waiting) return true
    return false
  }

  /** The standing spot of a plant in the state, for a hop that starts or ends there. */
  spotOf(state: LabState, id: number): Spot | null {
    const plant = state.plants.find((one) => one.id === id)
    if (!plant) return null
    const at = standingOf(this.layout, plant)
    return { x: at.x, y: at.y, k: at.k }
  }

  /** The note of a plant, by what it shows. */
  noteFor(pairs: Pairs, dry: boolean, variant: number): Part[] {
    const look = lookOf(pairs, dry)
    return noteOf(look.joints, look.colour, variant)
  }
}
