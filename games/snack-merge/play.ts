import type { Note } from './audio'
import type { CastCue } from './cast'
import type { Point } from './input'
import { Jar, STEP, THROWN, type JarEvent } from './jar'
import { BREAD, CHEESE, CHILLI, EGG, ICE, JELLY, THINGS, countOf, mannerOf, radiusOf, thingsOf, type Kind } from './kinds'
import { BACK_SHELF, BAG, HANDLE, HANG_Y, JAR, JAR_MID, LAMP, MOUSE, MOUTH, OVER_JAR, PLACES, PULL, RAIL, SEAT, SHELF, SHELF_REACH, TAIL, WINDOW, clawReach, tipped } from './layout'
import { makeRng } from './rng'
import { MONSTERS, MOUTHFULS, serialize, type Lying, type Save } from './save'
import { Scene, type Beat } from './scene'
import { BELL, BUMPED, BURP, CLICK, CLINK, DING, FLAME, GULP, HICCUP, KNOCK, LANDED, LICK, PAT, POKED, ROCK_BACK, RUMBLE, RUSTLE, SAT, SET_DOWN, SHUFFLE, SLID, SLIDE_OUT, SQUEAK, THROWN_OUT, TICK, TINK, TIPPED, TUP, ZIP, answered, call, pitched, said, shaped } from './voices'

// The game's rules: the claw on its rail, the shelf it takes from, the jar it
// lets go into, the counter a full jar burps onto, the handle that tips the
// jar into a mouth, and the round of three monsters (ART.md, "The toy" and
// "The scenes"). The rules are here and in jar.ts, in stage units and on game
// time, with no drawing and no sound: what a touch or a step set off is queued
// as cues, and the Mount plays the sounds and hands the rest to the view and
// the cast. Each scene puts its outcome into the state before its first beat,
// and a touch lands it.

export type PuffKind = 'sugar' | 'smoke' | 'mist' | 'spark' | 'flame' | 'crumb' | 'drip' | 'steam'
/** What joining gave a made snack: these are never dropped to make room for dust (the view's cap on puffs). */
export const HELD: readonly PuffKind[] = ['flame', 'drip', 'steam']

export type Cue =
  | { type: 'sound'; notes: readonly Note[] }
  | { type: 'puff'; what: PuffKind; x: number; y: number; n: number; push: number }
  /** Something for those in the shop to answer: a snack let go, a new snack made, the jar burping, a poke, a mouthful. */
  | { type: 'cast'; cue: CastCue }

export type Zone =
  | { type: 'shelf'; thing: number }
  | { type: 'place'; place: number }
  | { type: 'handle' | 'jar' | 'seat' | 'window' | 'mouse' | 'lamp' | 'bag' | 'back-shelf' | 'bare' }

/** A snack on its way through the air: a view of a move the rules have already made. */
export type Flight = {
  k: Kind
  from: Point
  to: Point
  /** Seconds since it set off; below 0 it has not set off yet and still lies at `from`. */
  t: number
  lasts: number
  lift: number
  turns: number
  goal: 'claw' | 'place' | 'shelf' | 'bag'
  place: number
  /** Part of the burp, which a touch ends. */
  scene: boolean
  /** Thrown out by a burp: it flies as the things it holds do, together (the grid's last column). Otherwise a plain hop. */
  thrown: boolean
}

/** A snack on its way out of the tipped jar into a mouth: where it lay, which mouthful it is in, and how far it has come, 0 to 1. */
export type Pour = Lying & { mouthful: number; out: number }

/** The next monster coming in, as the view shows it: who leaves, and how far each move has come, 0 to 1. */
export type Entrance = { leaving: number; out: number; duck: number; in: number; rise: number }

const PENDULUM = HANG_Y - RAIL.y
/** How long a snack lies low on the shelf after one was taken from its place. */
const SHELF_BACK = 0.45
const REFILL_AFTER = 0.3

/** What stands at a point of the stage. `counter` says which places hold a snack. */
export function zoneAt(p: Point, counter: readonly number[]): Zone {
  // The nearest shelf place within reach: two neighbours' reaches meet, and the nearer one is the one meant.
  let thing = -1, near = SHELF_REACH
  for (let i = 0; i < SHELF.length; i++) {
    const far = Math.hypot(p.x - SHELF[i].x, p.y - SHELF[i].y)
    if (far <= near) { thing = i; near = far }
  }
  if (thing >= 0) return { type: 'shelf', thing }
  let place = -1, nearest = Infinity
  for (let i = 0; i < PLACES.length; i++) {
    const far = Math.hypot(p.x - PLACES[i].x, p.y - PLACES[i].y)
    if (counter[i] && far <= radiusOf(counter[i]) + 8 && far < nearest) { place = i; nearest = far }
  }
  if (place >= 0) return { type: 'place', place }
  const inside = (box: { left: number; right: number; top: number; bottom: number }) => p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom
  if (inside(HANDLE)) return { type: 'handle' }
  if (Math.abs(p.x - LAMP.x) <= LAMP.half && p.y <= LAMP.y + 34) return { type: 'lamp' }
  if (p.x >= OVER_JAR.left && p.x <= OVER_JAR.right && p.y <= OVER_JAR.bottom) return { type: 'jar' }
  if (inside(BACK_SHELF)) return { type: 'back-shelf' }
  if (inside(SEAT) || inside(TAIL)) return { type: 'seat' }
  if (inside(WINDOW)) return { type: 'window' }
  if (Math.abs(p.x - MOUSE.x) <= MOUSE.half && Math.abs(p.y - MOUSE.y) <= MOUSE.half) return { type: 'mouse' }
  if (inside(BAG)) return { type: 'bag' }
  return { type: 'bare' }
}

/**
 * What a burp does to the counter: which thrown-out snack lands on which place, and which snacks on the places
 * nearest the paper bag go into the bag to make room. The places fill from the far end, so what was thrown out
 * last is the last to go. `keep` free places are left free: the one a made snack under the claw goes back to.
 */
export function burpOutcome(thrown: readonly Kind[], counter: readonly number[], keep = 0): { counter: number[]; landed: { k: Kind; place: number }[]; bagged: { k: Kind; place: number }[] } {
  const next = [...counter]
  const bagged: { k: Kind; place: number }[] = []
  let short = thrown.length - (next.filter((k) => !k).length - keep)
  for (let i = 0; i < next.length && short > 0; i++) {
    if (!next[i]) continue
    bagged.push({ k: next[i], place: i })
    next[i] = 0
    short -= 1
  }
  const landed: { k: Kind; place: number }[] = []
  for (const k of thrown) {
    let place = next.length - 1
    while (place >= 0 && next[place]) place -= 1
    if (place < 0) break
    next[place] = k
    landed.push({ k, place })
  }
  return { counter: next, landed, bagged }
}

/**
 * What a tip feeds, as mouthfuls: one for each kind of snack in the jar, the biggest snacks first, at most
 * five. Whatever is left goes down with the fifth.
 */
export function mouthfulsOf(kinds: readonly Kind[]): Kind[] {
  return [...new Set(kinds)].sort((a, b) => countOf(b) - countOf(a) || a - b).slice(0, MOUTHFULS)
}

/** Which mouthful a snack goes down in: the one of its kind, and a kind past the fifth goes down in the fifth. */
export function mouthfulOf(k: Kind, mouthfuls: readonly Kind[]): number {
  const at = mouthfuls.indexOf(k)
  return at < 0 ? mouthfuls.length - 1 : at
}

/** Where a snack that is being poured out is: in the tipped jar on its way to the rim, then in the air to the mouth. */
export function pourAt(pour: Pour, tip: number): { x: number; y: number; size: number } {
  const r = radiusOf(pour.k)
  const lip = { x: JAR.right - r * 0.7, y: JAR.rim + r * 0.5 }
  if (pour.out <= POUR_TO_LIP) {
    const q = pour.out / POUR_TO_LIP
    return { ...tipped({ x: pour.x + (lip.x - pour.x) * q * q, y: pour.y + (lip.y - pour.y) * q * q }, tip), size: 1 }
  }
  const q = (pour.out - POUR_TO_LIP) / (1 - POUR_TO_LIP), from = tipped(lip, tip)
  return { x: from.x + (MOUTH.x - from.x) * q, y: from.y + (MOUTH.y - from.y) * q - 40 * 4 * q * (1 - q), size: 1 - 0.55 * q }
}
/** The share of a pour that a snack spends sliding to the jar's lip. */
export const POUR_TO_LIP = 0.6

export class Play {
  jar = new Jar()
  readonly claw = { x: JAR_MID, to: JAR_MID, v: 0, ang: 0, angv: 0, k: 0 as Kind, in: true, open: 0 }
  pick: number
  counter: number[]
  /** Whether the snack of each place has come to lie there, or is still in the air. */
  readonly placeIn: boolean[]
  /** Seconds each place's snack goes on jiggling after a burp set it down. */
  readonly jiggle: number[]
  /** Seconds until each shelf place shows its thing again. */
  readonly shelfBack: number[] = THINGS.map(() => 0)
  readonly flights: Flight[] = []
  /** Snacks a burp is throwing out, still shown in the jar while it swells. */
  leaving: Lying[] = []
  /** 0 to 1 while the jar swells before a burp, and the jar's rock on its base, in radians. */
  swell = 0
  tilt = 0
  private tiltV = 0
  /** How far the jar is tipped towards the mouth, 0 to 1, and what a tip is pouring out. */
  tip = 0
  private tipTo = 0
  pouring: Pour[] = []
  /** The next monster coming in, while that scene plays. */
  entrance: Entrance | null = null
  /** The finger is down over the jar, and where. */
  held = false
  finger: Point | null = null
  time = 0
  private readonly base: Pick<Save, 'v' | 'position'>
  private seated: number
  private eaten: Kind[]
  private letGo = false
  private refillIn = 0
  /** The finger is on the handle: where it took hold, and how far it has pulled, 0 to 1. */
  private pulling: { from: number } | null = null
  private pull = 0
  /** Seconds left of the look into an empty jar, and until the grain of sugar falls. */
  private gag = 0
  private grain = 0
  private moving = false
  private lastTurn = 0
  private lastSwing = 0
  private lastSizzle = 0
  private trail = 0
  private mist = 0
  private cues: Cue[] = []
  private change: 0 | 1 | 2 = 0
  private scene: Scene | null = null
  private sceneIs: 'burp' | 'tip' | 'next' | null = null
  /** Where in their beats the made snacks start: the one thing the seed feeds, and it does not matter to the rules. */
  private readonly offbeat: number

  /** `seed` feeds only what does not matter to the rules: where in its beat a made snack's flame starts. */
  constructor(save: Save, seed: number) {
    this.base = { v: save.v, position: save.position }
    for (const s of save.jar) this.jar.lay(s.k, s.x, s.y)
    this.claw.k = save.claw
    this.pick = save.pick
    this.counter = [...save.counter]
    this.placeIn = this.counter.map(() => true)
    this.jiggle = this.counter.map(() => 0)
    this.seated = save.seat
    this.eaten = [...save.ate]
    this.offbeat = makeRng(seed).next() * 10
    const reach = clawReach(radiusOf(this.claw.k))
    this.claw.x = this.claw.to = clamp(this.claw.x, reach.min, reach.max)
  }

  /** Which of the three monsters sits at the jar, and which waits at the window: always the next in the round. */
  get seat(): number {
    return this.seated
  }

  get atWindow(): number {
    return (this.seated + 1) % MONSTERS
  }

  /** What the monster at the jar was given in the last tip, as mouthfuls. */
  get ate(): readonly Kind[] {
    return this.eaten
  }

  /** The jar has been tipped into this monster's mouth, and the next one has not been called in. */
  get finished(): boolean {
    return this.eaten.length > 0
  }

  /** The mouthful whose pose the monster at the jar keeps, or 0. */
  get pose(): Kind {
    return this.eaten.length > 0 ? this.eaten[this.eaten.length - 1] : 0
  }

  /** Where the snack under the claw hangs. */
  get hang(): Point {
    return { x: this.claw.x + Math.sin(this.claw.ang) * PENDULUM, y: RAIL.y + Math.cos(this.claw.ang) * PENDULUM }
  }

  /** What those in the shop watch: a snack that is falling, or the one under the claw. */
  get focus(): Point {
    const falling = this.jar.snacks.find((s) => s.fresh)
    return falling ? { x: falling.x, y: falling.y } : this.hang
  }

  /** Which scene is playing, if one is. */
  get playing(): 'burp' | 'tip' | 'next' | null {
    return this.scene !== null && this.scene.running ? this.sceneIs : null
  }

  get burping(): boolean {
    return this.playing === 'burp'
  }

  /** Something is still happening that is not the child's idleness: a scene, a snack in the air, a shifting pile, a pull. */
  get busy(): boolean {
    return this.playing !== null || this.flights.length > 0 || !this.jar.quiet || this.gag > 0 || this.pulling !== null || this.tip > 0.02
  }

  /** The cues queued since the last call. */
  drain(): Cue[] {
    const cues = this.cues
    this.cues = []
    return cues
  }

  /** Whether something changed that a save should hold: 1 at the throttle, 2 at once. Asking clears it. */
  takeChange(): 0 | 1 | 2 {
    const change = this.change
    this.change = 0
    return change
  }

  // --- Touch ----------------------------------------------------------------

  /** A finger landed at `p`, in stage units. The answer starts here, never at the lift. */
  press(p: Point): void {
    // A touch ends the scene that is playing, and is then an ordinary touch.
    this.endScene()
    if (this.gag > 0) {
      this.gag = 0
      this.tipTo = 0
    }
    // A let-go the claw had not yet carried out is carried out first, where the finger left it: the snack the
    // child let go is the one that drops, whatever this touch asks for next.
    this.carryOut()
    this.finger = p
    const zone = zoneAt(p, this.counter)
    switch (zone.type) {
      case 'jar':
        this.held = true
        this.aim(p.x)
        this.sound([...ZIP, ...(this.claw.k && this.claw.in ? said(SLID, this.claw.k) : [])])
        break
      case 'shelf':
        this.choose(zone.thing)
        break
      case 'place':
        this.take(zone.place)
        break
      case 'handle':
        // A knock rocks the jar; a finger that stays and pulls tips it.
        this.jar.rock()
        this.tiltV -= 1.1
        this.sound(CLINK)
        this.pulling = { from: p.x }
        this.pull = 0
        this.mark(1)
        break
      case 'seat':
        this.sound(POKED[this.seated])
        this.cast({ what: 'poke-seat' })
        break
      case 'window':
        // Once the jar has been tipped into a mouth, a touch calls the next one in. Before that it is a poke.
        if (this.finished) this.startNext()
        else {
          this.sound(KNOCK)
          this.cast({ what: 'poke-window' })
        }
        break
      case 'mouse':
        this.sound(SQUEAK)
        this.cast({ what: 'poke-mouse' })
        break
      case 'lamp':
        this.sound(DING)
        this.cast({ what: 'poke-lamp' })
        break
      case 'bag':
        this.sound(RUSTLE)
        this.cast({ what: 'rustle' })
        break
      case 'back-shelf':
        this.sound(TINK)
        this.puff('sugar', p.x, p.y, 2, 40)
        break
      default:
        this.sound(TUP)
        this.puff('sugar', p.x, p.y, 3, 60)
    }
  }

  /** The finger moved. Over the jar it carries the claw; on the handle it pulls the jar over. */
  move(p: Point): void {
    this.finger = p
    if (this.held) this.aim(p.x)
    if (!this.pulling) return
    this.pull = clamp((p.x - this.pulling.from) / PULL, 0, 1)
    this.tipTo = this.pull
    // A pull that gets halfway counts.
    if (this.pull >= 0.5) {
      this.pulling = null
      this.pull = 0
      this.tipOver()
    }
  }

  /** The finger let go: the claw opens once it has come to where the finger was, and holds a snack. */
  release(): void {
    this.finger = null
    this.rockBack()
    if (!this.held) return
    this.held = false
    this.letGo = true
    // Saved now: from the lift on, the save holds the snack as dropped (`toSave`), so no let-go is lost.
    this.mark(2)
  }

  /** A let-go that is still waiting for the claw happens at once, where the finger lifted. */
  private carryOut(): void {
    if (!this.letGo) return
    const claw = this.claw
    if (!claw.k) {
      // The claw was still empty after the last drop: its next snack is the one let go.
      claw.k = 1 << this.pick
      this.shelfBack[this.pick] = SHELF_BACK
    }
    const coming = this.flights.findIndex((flight) => flight.goal === 'claw' && flight.k === claw.k)
    if (coming >= 0) this.flights.splice(coming, 1)
    claw.in = true
    claw.x = claw.to
    claw.v = 0
    this.drop()
  }

  /** The finger was taken away, which is not a let-go: the snack stays under the claw. */
  cancel(): void {
    this.finger = null
    this.rockBack()
    this.held = false
  }

  /**
   * The game is being put away. A pull that was under way ends here and now, with no sound and no motion left
   * for later: when the child comes back the jar stands upright and still, and waits for a touch.
   */
  putAway(): void {
    this.finger = null
    this.held = false
    if (!this.pulling) return
    this.pulling = null
    this.pull = 0
    this.tipTo = 0
    this.tip = 0
    this.tilt = 0
    this.tiltV = 0
  }

  /** A pull let go before halfway: the jar rocks back with nothing spilled. */
  private rockBack(): void {
    if (!this.pulling) return
    this.pulling = null
    if (this.pull > 0.06) {
      this.sound(ROCK_BACK)
      this.tiltV += 0.8
    }
    this.pull = 0
    this.tipTo = 0
  }

  private aim(x: number): void {
    const reach = clawReach(radiusOf(this.claw.k || 1 << this.pick))
    this.claw.to = clamp(x, reach.min, reach.max)
  }

  /** A tap on the shelf: that thing goes to the claw, and the claw takes it again after each let-go. */
  private choose(thing: number): void {
    const k: Kind = 1 << thing
    this.sound(call(k, 0.8))
    this.shelfBack[thing] = SHELF_BACK
    this.pick = thing
    this.mark(1)
    if (this.claw.k === k) return
    this.sendBack()
    this.toClaw(k, SHELF[thing])
  }

  /** A tap on a snack on the counter: it hangs under the claw again. */
  private take(place: number): void {
    const k = this.counter[place]
    if (!k) return
    // One that is still flying back to its place turns round in the air and comes to the claw from there.
    const coming = this.flights.findIndex((flight) => flight.goal === 'place' && flight.place === place)
    const from = coming < 0 ? PLACES[place] : flightAt(this.flights.splice(coming, 1)[0])
    this.sound(call(k, 0.8))
    this.counter[place] = 0
    this.placeIn[place] = true
    this.jiggle[place] = 0
    this.sendBack()
    this.toClaw(k, from)
    this.mark(1)
  }

  /** How many free places the counter keeps free: one, while a made snack hangs under the claw, for it to go back to. */
  private get kept(): number {
    return countOf(this.claw.k) > 1 ? 1 : 0
  }

  /** What hangs under the claw goes back where it belongs: a shelf thing to its tray, a made snack to a free place on the counter. */
  private sendBack(): void {
    const k = this.claw.k
    if (!k) return
    // One that was still on its way to the claw turns round where it is.
    const coming = this.flights.findIndex((flight) => flight.goal === 'claw' && flight.k === k)
    const from = coming < 0 ? this.hang : flightAt(this.flights.splice(coming, 1)[0])
    this.claw.k = 0
    if (countOf(k) === 1) {
      const thing = thingsOf(k)[0]
      this.fly({ k, from, to: SHELF[thing], lasts: 0.3, lift: 60, goal: 'shelf' })
      this.shelfBack[thing] = Math.max(this.shelfBack[thing], 0.3)
      return
    }
    // A place is free for it: the one it left, or the one the counter kept (`kept`).
    const outcome = burpOutcome([k], this.counter)
    for (const gone of outcome.bagged) this.toBag(gone.k, gone.place, 0)
    this.counter = outcome.counter
    const place = outcome.landed[0].place
    this.placeIn[place] = false
    this.fly({ k, from, to: PLACES[place], lasts: 0.38, lift: 90, goal: 'place', place })
  }

  private toClaw(k: Kind, from: Point): void {
    this.claw.k = k
    this.claw.in = false
    this.aim(this.claw.to)
    this.fly({ k, from, to: this.hang, lasts: 0.3, lift: 70, goal: 'claw' })
  }

  private toBag(k: Kind, place: number, wait: number): void {
    this.fly({ k, from: PLACES[place], to: BAG, lasts: 0.55, lift: 170, goal: 'bag', turns: 1, t: -wait, scene: true })
  }

  private fly(flight: Partial<Flight> & Pick<Flight, 'k' | 'from' | 'to' | 'lasts' | 'lift' | 'goal'>): void {
    this.flights.push({ t: 0, turns: 0, place: -1, scene: false, thrown: false, ...flight, from: { ...flight.from }, to: { ...flight.to } })
  }

  // --- Time -----------------------------------------------------------------

  /**
   * Plays `dt` seconds of game time, in steps no longer than the pile's own: the springs here are stepped
   * plainly, and a long frame taken in one step would throw the claw off its rail.
   */
  step(dt: number): void {
    if (!(dt > 0)) return
    const steps = Math.ceil(dt / STEP - 1e-9)
    for (let i = 0; i < steps; i++) this.tick(dt / steps)
  }

  private tick(dt: number): void {
    this.time += dt
    this.stepClaw(dt)
    // While a made snack hangs under the claw a burp throws one fewer, so the place that snack goes back to stays free.
    this.jar.throws = THROWN - this.kept
    for (const event of this.jar.step(dt)) this.heard(event)
    this.scene?.update(this.time)
    this.stepFlights(dt)
    for (let i = 0; i < this.shelfBack.length; i++) if (this.shelfBack[i] > 0) this.shelfBack[i] = Math.max(0, this.shelfBack[i] - dt)
    for (let i = 0; i < this.jiggle.length; i++) if (this.jiggle[i] > 0) this.jiggle[i] = Math.max(0, this.jiggle[i] - dt)
    this.tiltV += (-90 * this.tilt - 7 * this.tiltV) * dt
    this.tilt += this.tiltV * dt
    this.tip += (this.tipTo - this.tip) * Math.min(1, 8 * dt)
    if (this.tipTo === 0 && this.tip < 0.002) this.tip = 0
    if (this.gag > 0) this.stepGag(dt)
    this.breathe(dt)
  }

  private stepClaw(dt: number): void {
    const claw = this.claw
    const before = claw.v
    claw.v += (1100 * (claw.to - claw.x) - 60 * claw.v) * dt
    claw.x += claw.v * dt
    claw.open += ((claw.k && claw.in ? 0 : 1) - claw.open) * Math.min(1, 14 * dt)
    const k = claw.k && claw.in ? claw.k : 0
    // The snack swings as the thing it is (kinds.ts).
    const manner = k ? mannerOf(k) : { swing: 0.6, swingDamp: 3 }
    const pull = clamp((claw.v - before) / dt, -9000, 9000)
    const angBefore = claw.angv
    claw.angv += (-34 * Math.sin(claw.ang) - manner.swingDamp * claw.angv - manner.swing * pull * 0.0016) * dt
    claw.angv = clamp(claw.angv, -9, 9)
    claw.ang = clamp(claw.ang + claw.angv * dt, -0.95, 0.95)
    // What does not swing at all (ice) hangs straight down, whatever the empty claw was doing before it came.
    if (k && manner.swing === 0) {
      claw.ang = 0
      claw.angv = 0
    }
    if (k) this.hangCues(k, before, angBefore, dt)

    if (this.refillIn > 0) {
      this.refillIn -= dt
      if (this.refillIn <= 0 && !claw.k) {
        this.shelfBack[this.pick] = SHELF_BACK
        this.toClaw(1 << this.pick, SHELF[this.pick])
      }
    }
    // The finger has lifted: the claw lets go once it has come to where the finger was, and never on the way.
    if (this.letGo && claw.k && claw.in && Math.abs(claw.to - claw.x) < 6 && Math.abs(claw.v) < 240) this.drop()
  }

  /** What a hanging snack says and trails as it is carried: the grid's first column. */
  private hangCues(k: Kind, vBefore: number, angvBefore: number, dt: number): void {
    const claw = this.claw
    const at = this.hang
    const speed = Math.abs(claw.v)
    // The end of a swing: cheese squeaks, and jelly boings at a pitch that follows the speed it was carried at.
    if (angvBefore * claw.angv < 0 && Math.abs(claw.ang) > 0.16 && this.time - this.lastSwing > 0.16) {
      this.lastSwing = this.time
      const gain = Math.min(1, Math.abs(claw.ang) * 1.6)
      if (k & CHEESE) this.sound(shaped(SLID[1], 0.7 * gain))
      if (k & JELLY) this.sound(pitched(shaped(SLID[4], 0.7 * gain), 0.8 + Math.min(1, Math.abs(claw.ang) / 0.9) * 0.9))
    }
    // A change of direction: the egg's yolk slides over with a blup.
    if (vBefore * claw.v < 0 && Math.abs(vBefore) > 90 && this.time - this.lastTurn > 0.2) {
      this.lastTurn = this.time
      if (k & EGG) this.sound(shaped(SLID[2], 0.8))
    }
    // The claw stops: ice rings.
    if (speed > 260) this.moving = true
    else if (this.moving && speed < 24) {
      this.moving = false
      if (k & ICE) this.sound(shaped(SLID[5], 0.8))
    }
    if (k & CHILLI && speed > 110) {
      this.trail -= dt
      if (this.trail <= 0) {
        this.trail = 0.07
        this.puff('smoke', at.x, at.y - radiusOf(k) * 0.7, 1, 20)
      }
      // It hangs sizzling: the thin hiss goes on for as long as it is carried.
      if (this.time - this.lastSizzle > 0.32) {
        this.lastSizzle = this.time
        this.sound(shaped(SLID[3], 0.6))
      }
    }
    if (k & ICE) {
      this.mist -= dt
      if (this.mist <= 0) {
        this.mist = 0.3
        this.puff('mist', at.x, at.y + radiusOf(k) * 0.7, 1, 14)
      }
    }
  }

  private drop(): void {
    const claw = this.claw
    const at = this.hang
    const snack = this.jar.drop(claw.k, at.x, at.y)
    snack.vx = clamp(claw.v * 0.15 + claw.angv * PENDULUM * 0.25, -200, 200)
    snack.wobv = 6
    claw.k = 0
    this.letGo = false
    this.refillIn = REFILL_AFTER
    this.sound(CLICK)
    this.cast({ what: 'drop' })
    // Saved now, before it lands: the save holds the pile as it will come to rest, and any burp that is certain.
    this.mark(2)
  }

  /** What the pile did in this step, as sound, dust and something for the shop to answer. */
  private heard(event: JarEvent): void {
    if (event.type === 'land') {
      const gain = clamp(event.speed / 900, 0.3, 1)
      this.sound(said(LANDED, event.k, gain))
      this.puff('sugar', event.x, event.y - 4, 4, 120 * gain)
      if (event.k & CHILLI) {
        this.puff('spark', event.x, event.y - 6, 2, 160)
        this.puff('smoke', event.x, event.y - 10, 1, 30)
      }
    } else if (event.type === 'bump') {
      const gain = clamp(event.speed / 900, 0.4, 1)
      this.sound(shaped(BUMPED[event.thing], gain))
      this.puff(event.thing === 3 ? 'smoke' : 'sugar', event.x, event.y, event.thing === 3 ? 2 : 3, 90)
    } else if (event.type === 'join') {
      this.sound([...call(event.into), ...LICK])
      this.puff('sugar', event.x, event.y, 6, 200)
      if (event.into & CHILLI) this.puff('flame', event.x, event.y - radiusOf(event.into) * 0.6, 1, 0)
      this.cast({ what: 'join' })
    } else this.startBurp(event.thrown)
  }

  /**
   * What joining gave a made snack goes on, wherever the snack is: in the jar, on the counter, under the claw.
   * Every few seconds, each on its own beat: fire breathes a small flame with a fwoosh, a cheese band lets a
   * drop fall, and a chilli frozen in ice lets off steam. (Frost's shiver is `shivering`, which the view asks.)
   */
  private breathe(dt: number): void {
    const now = this.time + this.offbeat, before = now - dt
    const beat = (every: number, phase: number) => Math.floor((now + phase) / every) !== Math.floor((before + phase) / every)
    const at = (k: Kind, x: number, y: number, phase: number) => {
      if (countOf(k) < 2) return
      const r = radiusOf(k)
      if (k & CHILLI && beat(FLAME_EVERY, phase * 1.3)) {
        this.puff('flame', x + r * 0.55, y + r * 0.2, 1, 0)
        this.sound(shaped(FLAME, this.quietly))
        if (k & ICE) this.puff('steam', x, y - r * 0.9, 1, 26)
      }
      if (k & CHEESE && beat(DRIP_EVERY, phase * 0.9 + 1.1)) this.puff('drip', x + r * 0.62, y + r * 0.5, 1, 0)
    }
    for (const snack of this.jar.snacks) if (!snack.fresh) at(snack.k, snack.x, snack.y, snack.id)
    for (let i = 0; i < PLACES.length; i++) if (this.counter[i] && this.placeIn[i]) at(this.counter[i], PLACES[i].x, PLACES[i].y + 30 - radiusOf(this.counter[i]) * 0.82, 40 + i)
    if (this.claw.k && this.claw.in) at(this.claw.k, this.hang.x, this.hang.y, 50)
  }

  /** How loud a made snack's own flame is: softer the more of them there are, so a jar of fire is no louder than one. */
  private get quietly(): number {
    const fires = this.jar.snacks.filter((s) => s.k & CHILLI && countOf(s.k) > 1).length + this.counter.filter((k) => k & CHILLI && countOf(k) > 1).length
    return 1 / Math.sqrt(Math.max(1, fires))
  }

  private stepFlights(dt: number): void {
    const hang = this.hang
    for (const flight of this.flights) {
      const before = flight.t
      flight.t += dt
      if (flight.goal === 'claw') flight.to = hang
      // Chilli rockets out on a jet of flame (the view draws the jet) and leaves an arc of smoke behind it.
      if (flight.thrown && flight.k & CHILLI && flight.t > 0 && flight.t < flight.lasts * airOf(flight.k) && Math.floor(flight.t / SMOKE_EVERY) !== Math.floor(Math.max(0, before) / SMOKE_EVERY)) {
        const at = flightAt(flight)
        this.puff('smoke', at.x, at.y, 1, 6)
      }
    }
    for (const flight of this.flights) if (flight.thrown) this.comeDown(flight, flight.t - dt)
    for (let i = this.flights.length - 1; i >= 0; i--) if (this.flights[i].t >= this.flights[i].lasts) this.arrive(this.flights.splice(i, 1)[0], false)
  }

  /**
   * A burped-out snack sounds where it is drawn to touch the counter (`flightAt`): its things come down
   * together when it touches, a cheese squeaks at each of its two bounces as it starts them, and an ice
   * clinks where its slide ends (`arrive`).
   */
  private comeDown(flight: Flight, before: number): void {
    const things = thingsOf(flight.k)
    const gain = 1 / Math.sqrt(things.length)
    const [first, second] = touchesOf(flight)
    if (before < first && flight.t >= first) {
      for (const thing of things) {
        if (thing === 1) this.sound(shaped([SET_DOWN[1][0]], gain))
        else if (thing !== 5) this.sound(shaped(SET_DOWN[thing], gain))
      }
    }
    if (flight.k & CHEESE && before < second && flight.t >= second) this.sound(shaped([{ ...SET_DOWN[1][1], delay: 0 }], gain))
  }

  private arrive(flight: Flight, quietly: boolean): void {
    if (flight.goal === 'claw') {
      if (this.claw.k === flight.k) {
        this.claw.in = true
        // It arrives with a little swing, unless it is a thing that does not swing at all.
        if (mannerOf(flight.k).swing > 0) this.claw.angv += 2.2
        else {
          this.claw.ang = 0
          this.claw.angv = 0
        }
      }
    } else if (flight.goal === 'place') {
      if (this.counter[flight.place] === flight.k) {
        this.placeIn[flight.place] = true
        // A burped-out snack with jelly in it jiggles for a long time where it landed.
        if (flight.thrown && !quietly && flight.k & JELLY) this.jiggle[flight.place] = JIGGLE
      }
      if (!quietly) {
        // A thrown snack has sounded already where it touched (`comeDown`); an ice clinks here, where its slide ends.
        if (!flight.thrown) this.sound(shaped(LANDED[thingsOf(flight.k)[0]], 0.5))
        else if (flight.k & ICE) this.sound(shaped(SET_DOWN[5], 1 / Math.sqrt(countOf(flight.k))))
        this.puff('sugar', flight.to.x, flight.to.y + radiusOf(flight.k) * 0.8, 3, 90)
      }
    } else if (flight.goal === 'bag' && !quietly) {
      this.sound(RUSTLE)
      this.cast({ what: 'rustle' })
    }
  }

  // --- The scenes ---------------------------------------------------------------

  private begin(what: 'burp' | 'tip' | 'next', beats: Beat[], saveOutcome: () => void): void {
    this.scene = new Scene(beats)
    this.sceneIs = what
    this.scene.start(this.time, () => {
      saveOutcome()
      this.mark(2)
    })
  }

  /** A touch, or the next scene, lands the one that is playing: everything is where it was taking it, and nothing sounds. */
  private endScene(): void {
    if (this.playing === null) return
    this.scene!.finish()
    for (let i = this.flights.length - 1; i >= 0; i--) if (this.flights[i].scene) this.arrive(this.flights.splice(i, 1)[0], true)
    for (let i = 0; i < this.placeIn.length; i++) if (!this.flights.some((flight) => flight.goal === 'place' && flight.place === i)) this.placeIn[i] = true
  }

  /**
   * The burp. The jar has thrown its top layer out (jar.ts): each snack goes to a place on the counter. The
   * outcome is in the state before the first beat plays, and it was in the save from the let-go that made it
   * certain (`toSave`).
   */
  private startBurp(thrown: readonly Lying[]): void {
    this.endScene()
    const outcome = burpOutcome(thrown.map((s) => s.k), this.counter, this.kept)
    const beats: Beat[] = [
      {
        // The jar swells and rumbles.
        at: 0,
        lasts: 0.9,
        play: (progress, finishing) => {
          this.swell = finishing ? 0 : Math.sin(progress * Math.PI * 0.5)
        },
      },
      {
        // The burp throws them out, the highest first.
        at: 0.9,
        lasts: 0,
        play: (_, finishing) => {
          this.swell = 0
          const leaving = this.leaving
          this.leaving = []
          if (finishing) return
          this.tiltV += 1.4
          this.sound([...BURP, ...outcome.landed.flatMap((landed, i) => shaped(said(THROWN_OUT, landed.k, 0.8), 1, 0.1 + i * 0.22))])
          this.puff('sugar', JAR_MID, JAR.rim, 6, 260)
          outcome.landed.forEach((landed, i) => {
            const from = leaving[i] ?? { x: JAR_MID, y: JAR.rim }
            const style = throwOf(landed.k)
            this.flights.push({ k: landed.k, from: { x: from.x, y: from.y }, to: PLACES[landed.place], t: -i * 0.22, lasts: style.lasts, lift: style.lift, turns: style.turns, goal: 'place', place: landed.place, scene: true, thrown: true })
          })
        },
      },
      {
        // The jar settles with a hiccup and a last puff of sugar.
        at: 3.4,
        lasts: 0,
        play: (_, finishing) => {
          if (finishing) return
          this.sound(HICCUP)
          this.tiltV -= 0.6
          this.puff('sugar', JAR_MID, JAR.rim, 3, 120)
        },
      },
      { at: 3.4, lasts: 0.6, play: () => {} },
    ]
    this.begin('burp', beats, () => {
      this.leaving = thrown.map((s) => ({ ...s }))
      // The ones nearest the bag wait on their places until the burp, then hop in one by one.
      outcome.bagged.forEach((gone, i) => this.toBag(gone.k, gone.place, 0.9 + i * 0.15))
      for (const landed of outcome.landed) this.placeIn[landed.place] = false
      this.counter = outcome.counter
    })
    this.sound(RUMBLE)
    this.cast({ what: 'burp' })
  }

  /** The handle has been pulled halfway: the jar goes over. What is in it goes into the mouth; with nothing in it, the monster looks in. */
  private tipOver(): void {
    this.endScene()
    // The pile as it comes to rest, by the steps it would take on screen: nothing is fed from the air.
    for (const event of this.jar.rest()) {
      if (event.type !== 'burp') continue
      this.counter = burpOutcome(event.thrown.map((s) => s.k), this.counter, this.kept).counter
    }
    this.sound(TIPPED)
    if (this.jar.snacks.length > 0) {
      this.startTip()
      return
    }
    // An empty jar: no scene and nothing to save.
    this.tipTo = 1
    this.gag = 1.5
    this.grain = 0.75
    this.cast({ what: 'peek' })
  }

  private stepGag(dt: number): void {
    this.gag -= dt
    if (this.grain > 0) {
      this.grain -= dt
      if (this.grain <= 0) {
        // One grain of sugar falls on its tongue.
        this.sound(TICK)
        this.puff('sugar', MOUTH.x, MOUTH.y - 46, 1, 0)
      }
    }
    if (this.gag <= 0) this.tipTo = 0
  }

  /**
   * The tip. The snacks slide out as mouthfuls and the monster answers each. The outcome (an empty jar, what
   * it ate, the cycle finished) is in the state before the first beat plays.
   */
  private startTip(): void {
    const mouthfuls = mouthfulsOf(this.jar.snacks.map((s) => s.k))
    const each = Math.max(1.66, 4.3 / mouthfuls.length)
    const eaten = TIP_UP + mouthfuls.length * each
    const who = this.seated
    const beats: Beat[] = [
      {
        // The jar tips to the mouth.
        at: 0,
        lasts: TIP_UP,
        play: (_, finishing) => {
          this.tipTo = finishing ? 0 : 1
        },
      },
    ]
    mouthfuls.forEach((k, i) => {
      const at = TIP_UP + i * each
      beats.push({
        // The snacks of this mouthful slide out.
        at,
        lasts: 0.6,
        play: (progress, finishing) => {
          if (progress === 0 || finishing) return
          for (const pour of this.pouring) if (pour.mouthful === i) pour.out = progress
        },
      })
      beats.push({ at, lasts: 0, play: (_, finishing) => { if (!finishing) this.sound(SLIDE_OUT) } })
      beats.push({
        // They are in its mouth, and it answers the things in them, all at once.
        at: at + 0.6,
        lasts: 0,
        play: (_, finishing) => {
          this.pouring = this.pouring.filter((pour) => pour.mouthful !== i)
          if (finishing) return
          this.sound(answered(who, k))
          this.cast({ what: 'eat', k })
        },
      })
    })
    beats.push({
      // It swallows, and settles into the pose of its last mouthful, which it keeps. The jar stands up again.
      at: eaten,
      lasts: 0,
      play: (_, finishing) => {
        this.pouring = []
        this.tipTo = 0
        if (finishing) {
          this.tip = 0
          this.cast({ what: 'sit', seat: who, pose: mouthfuls[mouthfuls.length - 1] })
        } else {
          this.sound(GULP)
          this.cast({ what: 'swallow' })
        }
      },
    })
    beats.push({ at: eaten, lasts: 0.8, play: () => {} })
    this.begin('tip', beats, () => {
      this.pouring = this.jar.empty().map((s) => ({ k: s.k, x: s.x, y: s.y, mouthful: mouthfulOf(s.k, mouthfuls), out: 0 }))
      this.eaten = mouthfuls
    })
  }

  /**
   * The next monster comes in. The outcome (who sits, nothing eaten, the cycle open again) is in the state
   * before the first beat plays.
   */
  private startNext(): void {
    this.endScene()
    const entrance: Entrance = { leaving: this.seated, out: 0, duck: 0, in: 0, rise: 0 }
    const next = (this.seated + 1) % MONSTERS
    const beats: Beat[] = [
      // The fed one pats its belly, gets up and shuffles out past the end of the counter.
      { at: 0, lasts: 0, play: (_, finishing) => { if (!finishing) { this.sound(PAT); this.cast({ what: 'pat' }) } } },
      { at: 0.8, lasts: 0, play: (_, finishing) => { if (!finishing) this.sound(SHUFFLE) } },
      { at: 0.8, lasts: 1.5, play: (progress) => { entrance.out = progress } },
      // The one at the window ducks away, and the shop bell rings.
      { at: 1.3, lasts: 0.6, play: (progress) => { entrance.duck = progress } },
      {
        at: 2.3,
        lasts: 0,
        play: (_, finishing) => {
          this.cast({ what: 'sit', seat: next, pose: 0 })
          if (!finishing) this.sound(BELL)
        },
      },
      // It comes in and sits with its mouth at the rim.
      { at: 2.4, lasts: 1.6, play: (progress) => { entrance.in = progress } },
      {
        at: 4,
        lasts: 0,
        play: (_, finishing) => {
          if (finishing) return
          this.sound(SAT)
          this.puff('sugar', SEAT.x, SEAT.bottom, 4, 140)
        },
      },
      // The one after it comes to the window.
      { at: 4, lasts: 1, play: (progress) => { entrance.rise = progress } },
      { at: 5, lasts: 0, play: () => { this.entrance = null } },
    ]
    this.begin('next', beats, () => {
      this.entrance = entrance
      this.seated = next
      this.eaten = []
    })
  }

  // --- Saving -----------------------------------------------------------------

  /**
   * The game as a save holds it: nothing in the air. A snack that is falling and a pile that is still shifting
   * are played on in a copy until everything lies still, by the very steps the pile on screen takes, and a burp
   * on the way leaves the copy's jar and lands on the copy's counter. So the save made at a let-go already
   * holds what the fall ends in, a game put away during the fall is found after it, and no burp plays on load.
   */
  toSave(): Save {
    let jar = this.jar
    let counter = this.counter
    // A let-go the claw has not carried out yet is saved as done: the snack falls, in the copy, from where the
    // finger lifted, and the claw is found with its next one.
    const pending = this.letGo ? this.claw.k || 1 << this.pick : 0
    if (!jar.quiet || pending) {
      jar = jar.clone()
      if (pending) jar.drop(pending as Kind, this.claw.to, RAIL.y + PENDULUM)
      const kept = pending ? 0 : this.kept
      for (const event of jar.rest()) if (event.type === 'burp') counter = burpOutcome(event.thrown.map((s) => s.k), counter, kept).counter
    }
    return serialize({
      ...this.base,
      finished: this.finished,
      jar: jar.snacks.map((s) => ({ k: s.k, x: s.x, y: s.y })),
      claw: pending ? 1 << this.pick : this.claw.k || 1 << this.pick,
      pick: this.pick,
      counter,
      seat: this.seated,
      ate: this.eaten,
    })
  }

  private sound(notes: readonly Note[]): void {
    if (notes.length > 0) this.cues.push({ type: 'sound', notes })
  }

  private puff(what: PuffKind, x: number, y: number, n: number, push: number): void {
    this.cues.push({ type: 'puff', what, x, y, n, push })
  }

  private cast(cue: CastCue): void {
    this.cues.push({ type: 'cast', cue })
  }

  private mark(change: 1 | 2): void {
    if (change > this.change) this.change = change
  }
}

/** Seconds the jar takes to tip to the mouth. */
const TIP_UP = 0.9

/** How each thing leaves a burping jar: the grid's last column, as the numbers of its flight. */
export const THROWS: readonly { lasts: number; lift: number; turns: number }[] = [
  /* bread sails out slowly */ { lasts: 1.35, lift: 250, turns: 0.25 },
  /* cheese shoots out highest and bounces twice */ { lasts: 1.5, lift: 430, turns: 1 },
  /* egg flips like a pancake */ { lasts: 1.1, lift: 300, turns: 2 },
  /* chilli rockets out */ { lasts: 0.6, lift: 340, turns: 0 },
  /* jelly lobs out slowly */ { lasts: 1.5, lift: 280, turns: 0 },
  /* ice skids out and slides along the counter */ { lasts: 1.3, lift: 200, turns: 0 },
]

/**
 * How a snack leaves a burping jar: as its things do, together. It flies as long and as high as its things
 * do on average, and turns as much as all of them.
 */
export function throwOf(k: Kind): { lasts: number; lift: number; turns: number } {
  const parts = thingsOf(k).map((thing) => THROWS[thing])
  const mean = (pick: (t: (typeof THROWS)[number]) => number) => parts.reduce((sum, t) => sum + pick(t), 0) / parts.length
  return { lasts: mean((t) => t.lasts), lift: mean((t) => t.lift), turns: parts.reduce((sum, t) => sum + t.turns, 0) }
}

/** How much of a thrown cheese's flight its two bounces take, and where in them the second one starts. */
const BOUNCING = 0.3, SECOND_BOUNCE = 0.58

/** When a thrown snack touches the counter, in seconds of its flight: first, and (a cheese) at the start of its second bounce. */
export function touchesOf(flight: Pick<Flight, 'k' | 'lasts'>): [number, number] {
  const air = airOf(flight.k)
  return [flight.lasts * air, flight.lasts * (air + BOUNCING * SECOND_BOUNCE)]
}

/** The share of a thrown snack's flight it spends in the air: cheese then bounces twice, and ice then slides along the counter. */
export function airOf(k: Kind): number {
  return 1 - (k & CHEESE ? 0.3 : 0) - (k & ICE ? 0.3 : 0)
}

/**
 * Where a flight is now, how it is turned and how flat it is. Before it sets off it lies at `from`. A snack a
 * burp threw out flies as each of its things does, together: with chilli it rockets off, with egg and bread it
 * turns over, with cheese it bounces twice where it comes down, with ice it comes down beside the jar's foot
 * and slides along the counter to its place, and with bread, egg or jelly it lands flat.
 */
export function flightAt(flight: Flight): { x: number; y: number; ang: number; squash: number } {
  const p = clamp(flight.t / flight.lasts, 0, 1)
  const { from, to, k } = flight
  const arc = (q: number, lift: number) => lift * 4 * q * (1 - q)
  if (!flight.thrown) return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p - arc(p, flight.lift), ang: p * flight.turns * Math.PI * 2, squash: 0 }
  const air = airOf(k), bounces = k & CHEESE ? BOUNCING : 0
  const touch = k & ICE ? { x: to.x + (to.x < (JAR.left + JAR.right) / 2 ? 150 : -150), y: to.y } : to
  const soft = (k & (BREAD | EGG | JELLY)) !== 0
  if (p < air) {
    const q = p / air
    const ease = k & CHILLI ? q * q : q
    return { x: from.x + (touch.x - from.x) * ease, y: from.y + (touch.y - from.y) * ease - arc(ease, flight.lift), ang: q * flight.turns * Math.PI * 2, squash: soft && q > 0.94 ? 0.3 : 0 }
  }
  if (p < air + bounces) {
    // Cheese: two bounces where it comes down, the second lower.
    const b = (p - air) / bounces
    const q = b < SECOND_BOUNCE ? b / SECOND_BOUNCE : (b - SECOND_BOUNCE) / (1 - SECOND_BOUNCE)
    return { x: touch.x, y: touch.y - arc(q, b < SECOND_BOUNCE ? 90 : 36), ang: 0, squash: q < 0.15 ? 0.25 : 0 }
  }
  if (touch === to) return { x: to.x, y: to.y, ang: 0, squash: soft ? 0.3 : 0 }
  // Ice: a slide along the counter to its place.
  const q = (p - air - bounces) / (1 - air - bounces)
  return { x: touch.x + (to.x - touch.x) * (1 - (1 - q) * (1 - q)), y: to.y, ang: 0, squash: 0 }
}

/** Whether a made snack with frost in it shivers now: half a second every few, each on its own beat. */
export function shivering(time: number, phase: number): boolean {
  return (time + phase * 1.7) % SHIVER_EVERY < 0.5
}

/** How often a made snack breathes its flame, shivers and drips, and how long a burped-out jelly jiggles, in seconds. */
export const FLAME_EVERY = 3.4
export const SHIVER_EVERY = 4.2
export const DRIP_EVERY = 2.9
export const JIGGLE = 4
const SMOKE_EVERY = 0.06

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}
