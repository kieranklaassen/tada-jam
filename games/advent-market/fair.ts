import { Bench } from './benches'
import { FATTEST, girth, type Colour } from './candle'
import { Dipping, MAX_RINGS } from './dipping'
import { Folk, type Hold, type Sight } from './folk'
import { BASKET, FOLK, LANTERNS, POT, REST, WHO, type Who } from './hall'
import { letGo, moveTo, pressOn } from './handling'
import { handAt } from './holds'
import type { Puff } from './meetings'
import { BENCH, SNOW, isStall, slotAt, type Place, type Stall } from './places'
import { makeRng, type Rng } from './rng'
import type { Save } from './save'
import { Scene } from './scene'
import { tasteOf } from './tastes'
import { copyThing, isMade, sizeOf, type Biscuit, type CandleThing, type Star, type Thing, type Wreath } from './things'
import type { Sound } from './voices'

// The fair as a whole: the five places, the four benches and their pieces in
// work, the basket, the five fair-goers and what they hold, and the scenes.
// It is stepped by the seconds the Mount gives it and by nothing else, and it
// queues its sounds in the step or the touch that causes them, so sight and
// sound share one clock. What a touch does is in handling.ts; the scenes are
// in playing.ts. Everything a save keeps is at the top; the rest are views.

/** How a change wants saving: not at all, at the throttle, or at once. */
export type Change = 0 | 1 | 2
export type Point = { x: number; y: number }
/** Where a thing in the hand came from, which is where a save keeps it until it is let go. */
export type From = { kind: 'slot'; index: number } | { kind: 'bench' } | { kind: 'who'; who: Who }
/** A thing on its way from one place to another by itself: into the basket, back to its bench, through the wax. */
export type Flight = { thing: Thing; from: Point; to: Point; age: number; lasts: number; dip: boolean; hides: From | null; /** It turns once on its way, and is not yet seen on the piece it lands on. */ spin?: boolean }
export type Mote = { x: number; y: number; vx: number; vy: number; age: number; life: number; kind: Puff['kind'] }
type Spring = { x: number; v: number }

/** How far the door stands open: before the basket is carried out, as it swings wide, and ever after. */
export const DOOR = { rest: 0.45, wide: 1, ajar: 0.7 } as const
/**
 * A drag survives a lifted finger. For this many seconds of play after the finger has left a thing it carries
 * (a thing, the dipping stick, the basket), the thing hangs where it is, and a finger that lands within this
 * reach of where it lifted carries on. Then the thing is let go where it hangs.
 */
export const LIFT = { seconds: 0.2, reach: 90 } as const
/**
 * The ending, on the game's clock: how long it lasts from the basket being set in the snow, and when the basket's
 * halo begins to come up. A touch ends the scene, but the basket is not ready before this long has gone by: the
 * halo comes up when it is, and only then does a tap on it begin the next fair.
 */
export const ENDING = { seconds: 9.2, halo: 8.2 } as const
/** How long the goat's tongue is out when it licks its lips at a drop, on the game's clock. */
export const LICK_SECONDS = 0.45
const MAX_MOTES = 24

function settle(s: Spring, stiff: number, damp: number, dt: number): void {
  s.v += (-s.x * stiff - s.v * damp) * dt
  s.x += s.v * dt
}

export class Fair {
  // --- What a save keeps.
  at: Place
  finished: boolean
  readonly uncovered: Record<Stall, boolean>
  readonly pieces: { candle: CandleThing; star: Star; wreath: Wreath; biscuit: Biscuit }
  pot: Colour
  readonly basket: Thing[]
  readonly held: Record<Who, Thing | null>
  readonly rng: Rng
  private readonly base: Pick<Save, 'v' | 'position'>

  // --- Views of it, and the touch in progress. None of this is saved; `settle` puts all of it as a load finds it.
  readonly dipping: Dipping
  readonly bench = new Bench()
  readonly folk: Folk
  /** What each fair-goer is seen to hold. During a meeting it lags the save: the mark shows when the reaction leaves it. */
  readonly shown: Record<Who, Thing | null> = { tuba: null, maker: null, baker: null, bundle: null, goat: null }
  /** Seconds of play so far: the one clock everything here goes by. */
  time = 0
  /** Where the working finger is, or null. */
  finger: Point | null = null
  /** The finger has the dipping stick; it is working on the piece of another bench; it carries a thing; it carries the basket. */
  stick = false
  working = false
  carry: { thing: Thing; from: From; x: number; y: number } | null = null
  hooked: Point | null = null
  /** A press on a thing in the basket or in a hand, which becomes a carry if the finger moves and a tap if it lifts. */
  pending: From | { kind: 'lantern'; dir: -1 | 1 } | null = null
  /** The finger landed on the basket in the snow, in a touch that ended no scene: lifted there, it begins the next fair. */
  snowTap = false
  /** How far the piece on the bench has been drawn after a finger that pulls at it: slack, before it comes off. A view. */
  pull: Point = { x: 0, y: 0 }
  /** Where the finger of the touch in progress landed: a finger that lifts near there has tapped, and a tap gives nothing away. */
  landed: Point | null = null
  /** The finger of the touch in progress landed where nothing is to work: bare wall, or a thing that is only painted. */
  bare = false
  /** How far below the handle the finger took the basket off its hook. */
  hookDy = 0
  /** Seconds the basket's halo has stood in the snow: it pulses a few times and then stands still. A view. */
  haloAge = 0
  /** Seconds since the basket was set in the snow, up to the length of the ending. A load finds the ending long over. */
  out: number = ENDING.seconds
  /** Where the candle's tip and the stick were when the finger lifted off the stick: the candle swings on, and it is let go where it was then. */
  letAt: { tip: Point; stick: Point } | null = null
  /** Seconds since the finger lifted off what it carries, while the thing still hangs there; -1 otherwise. */
  lifted = -1
  flight: Flight | null = null
  /** The walk: the place left, the place reached, which way, and how far along (0 to 1). */
  slide: { from: Place; to: Place; dir: -1 | 1; p: number } | null = null
  doorOpen: number = DOOR.rest
  doorTo: number = DOOR.rest
  /** 0 to 1: how brightly the basket glows in the snow. */
  glow = 0
  /** Where the basket was let go, and how long ago: it goes from there to its hook, or to its place in the snow. */
  basketFrom: Point | null = null
  basketAge = 9
  /** Seconds since the cloth of this place was lifted, while it still flies. */
  clothFlown = 9
  /** The thing in a basket place or the source at the front that hopped under a tap, and how long ago. */
  hop: { what: 'slot' | 'colour' | 'size' | 'lantern'; index: number; age: number } = { what: 'slot', index: -1, age: 9 }
  readonly motes: Mote[] = []
  /** Something that swells in a meeting: a wax bubble at the goat's mouth, a swallowed shape in its neck. */
  swell: { kind: 'bubble' | 'neck'; age: number } | null = null
  /** Seconds since the goat last licked its lips at a drop: its tongue is out for the first `LICK_SECONDS` of them. A view. */
  lick = 9
  /** 0 to 1: how far the new wax has spread through the pot since it was poured. */
  potMix = 1
  potWas: Colour = 0
  readonly lamps: Spring[] = LANTERNS.map(() => ({ x: 0, v: 0 }))
  readonly potRing: Spring = { x: 0, v: 0 }
  readonly basketShake: Spring = { x: 0, v: 0 }
  readonly flutter: Spring = { x: 0, v: 0 }
  /** 0 to 1: the snow behind the window swirls when the glass is tapped. */
  swirl = 0
  scene: Scene | null = null
  /** A touch ended a scene: whatever of it still rings is cut. The Mount asks once. */
  private cut = false
  private sounds: Sound[] = []
  private change: Change = 0
  /** Second parts of sounds, each due at a time on this clock. */
  private later: { at: number; sound: Sound }[] = []
  private size: 0 | 1 | 2 = 0
  private bakerHabit = -1

  constructor(save: Save, seed: number = save.chance) {
    this.base = { v: save.v, position: save.position }
    this.at = save.at
    this.finished = save.finished
    this.uncovered = { ...save.uncovered }
    this.pieces = { candle: copyThing(save.candle), star: copyThing(save.star), wreath: copyThing(save.wreath), biscuit: copyThing(save.biscuit) }
    this.pot = save.pot as Colour
    this.basket = save.basket.map(copyThing)
    this.held = { tuba: null, maker: null, baker: null, bundle: null, goat: null }
    for (const who of WHO) this.held[who] = save.held[who] ? copyThing(save.held[who]) : null
    this.rng = makeRng(seed)
    this.dipping = new Dipping(this.pieces.candle, this.rng, this.pot)
    this.folk = new Folk(seed)
    this.settle()
  }

  /** The fair as storage keeps it. A thing in the hand is still where it came from: nothing is saved in the air. */
  toSave(): Save {
    const held = { tuba: null, maker: null, baker: null, bundle: null, goat: null } as Record<Who, Thing | null>
    for (const who of WHO) held[who] = this.held[who] ? copyThing(this.held[who]) : null
    return {
      ...this.base, finished: this.finished, at: this.at, uncovered: { ...this.uncovered },
      candle: copyThing(this.pieces.candle), star: copyThing(this.pieces.star), wreath: copyThing(this.pieces.wreath), biscuit: copyThing(this.pieces.biscuit),
      pot: this.pot, basket: this.basket.map(copyThing), held, chance: this.rng.state,
    }
  }

  takeSounds(): Sound[] {
    const sounds = this.sounds
    this.sounds = []
    return sounds
  }

  takeChange(): Change {
    const change = this.change
    this.change = 0
    return change
  }

  /** Whether a touch has ended a scene since this was last asked. */
  takeCut(): boolean {
    const cut = this.cut
    this.cut = false
    return cut
  }

  say(sound: Sound): void {
    this.sounds.push(sound)
  }

  /** A second part of a sound, `delay` seconds from now on the game's clock, `times` times, `gap` apart. */
  after(delay: number, sound: Sound, times = 1, gap = 0.11): void {
    for (let i = 0; i < times; i++) this.later.push({ at: this.time + delay + i * gap, sound })
  }

  /** The second parts of sounds that have not sounded yet are dropped: what they belonged to is no longer in view. */
  hushLater(): void {
    this.later.length = 0
  }

  changed(how: 1 | 2): void {
    this.change = Math.max(this.change, how) as Change
  }

  /** Whether anything is in the child's hand. */
  get inHand(): boolean {
    return this.stick || this.working || this.carry !== null || this.hooked !== null
  }

  /** Whether the finger holds something up: the dipping stick, a thing, the basket. Holding still is then the work. */
  get carrying(): boolean {
    return this.stick || this.carry !== null || this.hooked !== null
  }

  get playing(): boolean {
    return this.scene !== null && this.scene.running
  }

  /** The piece in work at the place the child stands, or null at the door. */
  get piece(): Thing | null {
    return isStall(this.at) ? this.pieces[this.at] : null
  }

  /** Whether the basket can take `more` things. Carried out, it stands in the snow and takes none. */
  room(more = 1): boolean {
    return !this.finished && this.basket.length + more <= BASKET.slots
  }

  /** What a fair-goer's pose is told of the thing it is seen to hold. */
  private told(who: Who): Hold {
    const thing = this.shown[who]
    return thing ? { craft: thing.craft, size: sizeOf(thing), taste: tasteOf(who, thing) } : null
  }

  /** Shows a fair-goer holding `thing` (or nothing) from now on. */
  show(who: Who, thing: Thing | null): void {
    this.shown[who] = thing
    this.folk.hold(who, this.told(who))
  }

  /** A touch ends the scene that is playing: every beat lands, unheard, and what still rings of it is cut. */
  endScene(): void {
    if (!this.playing) return
    this.scene!.finish()
    this.cut = true
    this.sounds = this.sounds.filter((sound) => !sound.scene)
  }

  press(x: number, y: number): void {
    const hung = this.lifted >= 0
    if (hung) {
      // The finger is back within the grace. Near where it lifted, it carries on; anywhere else, the thing is let go first.
      const was = this.finger
      this.lifted = -1
      if (was && Math.hypot(x - was.x, y - was.y) <= LIFT.reach) {
        this.letAt = null
        moveTo(this, x, y)
        this.drain()
        return
      }
    }
    // A touch that ends a scene is an ordinary touch, but for one thing: it never begins the next fair.
    const cut = this.playing
    this.endScene()
    // A finger that lands somewhere else inside the grace: the thing is let go where it hung, after the scene that
    // was playing has ended and before this touch is answered. The scene that let-go starts is not ended by this
    // touch: it plays, and a later touch ends it.
    if (hung) {
      letGo(this, true)
      // A giving or the ending has begun: that is this touch's answer, and the touch does nothing more, so nothing
      // it could go on to do (a walk at its lift, a carry) ends the scene it started.
      if (this.playing) {
        this.finger = { x, y }
        this.drain()
        return
      }
    }
    pressOn(this, x, y, cut)
    this.drain()
  }

  move(x: number, y: number): void {
    moveTo(this, x, y)
    this.drain()
  }

  /** The touch is over. `dropped` is true when the child let go and false when the touch was taken away, which makes no move. */
  release(dropped: boolean): void {
    if (dropped && this.lifted < 0 && (this.stick || this.carry !== null || this.hooked !== null)) {
      // The thing hangs where it is for the grace: the lift may be a finger that skipped.
      this.lifted = 0
      const d = this.dipping
      this.letAt = this.stick ? { tip: d.tipShown(), stick: { x: d.stick.x, y: d.stick.y } } : null
      return
    }
    this.lifted = -1
    letGo(this, dropped)
    this.drain()
  }

  /** Small things fly from a point: crumbs, needles, flour, smoke. */
  puff(kind: Puff['kind'], x: number, y: number, count: number, toward: Point | null = null): void {
    for (let i = 0; i < count && this.motes.length < MAX_MOTES; i++) {
      const a = (i / count) * Math.PI * 2 + i * 1.7, speed = 60 + ((i * 37) % 90)
      const vx = toward ? (toward.x - x) * 1.1 + Math.cos(a) * 40 : Math.cos(a) * speed
      const vy = toward ? (toward.y - y) * 1.1 - 260 + Math.sin(a) * 40 : Math.sin(a) * speed - (kind === 'smoke' ? 60 : 120)
      this.motes.push({ x, y, vx, vy, age: 0, life: kind === 'smoke' ? 1.2 : 0.9, kind })
    }
  }

  /** What the fair-goers see: the thing in the child's hand, the candle's tip, or the piece on the bench. */
  sight(): Sight {
    const piece = this.piece, d = this.dipping
    // At the door they look out at the snow, where the basket goes and where it stands when the fair is over.
    let x: number = SNOW.x, y = this.finished ? SNOW.y - 40 : 560
    if (this.carry) ({ x, y } = this.carry)
    else if (this.hooked) ({ x, y } = this.hooked)
    else if (this.at === 'candle') { const tip = d.tipShown(); x = tip.x; y = Math.min(tip.y, POT.y) }
    else if (isStall(this.at)) ({ x, y } = BENCH[this.at])
    return { x, y, size: piece ? sizeOf(piece) : 1, bare: piece ? !isMade(piece) : false, bubbling: d.bubbling, dipping: d.inPot, walking: this.slide ? Math.sin(this.slide.p * Math.PI) : 0 }
  }

  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    this.scene?.update(this.time)
    if (this.lifted >= 0 && (this.lifted += dt) >= LIFT.seconds) {
      this.lifted = -1
      letGo(this, true)
    }
    if (this.out < ENDING.seconds) {
      this.out = Math.min(ENDING.seconds, this.out + dt)
      // An ending that a touch ended: the halo still comes up at its own time, unheard, and tells when the basket is ready.
      if (!this.playing && this.finished) this.glow = Math.min(1, Math.max(0, (this.out - ENDING.halo) / (ENDING.seconds - ENDING.halo)))
    }
    this.haloAge = this.finished && this.glow >= 1 ? this.haloAge + dt : 0
    // Let go, the piece springs back onto its bench.
    if (!this.working) { const back = Math.exp(-dt * 16); this.pull.x *= back; this.pull.y *= back }
    for (let i = this.later.length - 1; i >= 0; i--) if (this.later[i].at <= this.time) this.sounds.push(this.later.splice(i, 1)[0].sound)
    if (this.at === 'candle' && !this.slide) this.dipping.step(dt)
    this.bench.step(dt)
    this.drain()
    for (const lamp of this.lamps) settle(lamp, 22, 1.1, dt)
    settle(this.potRing, 300, 9, dt)
    settle(this.basketShake, 180, 7, dt)
    settle(this.flutter, 60, 5, dt)
    this.swirl = Math.max(0, this.swirl - dt / 2.5)
    this.potMix = Math.min(1, this.potMix + dt / 0.5)
    this.doorOpen += (this.doorTo - this.doorOpen) * Math.min(1, dt * 4)
    this.clothFlown += dt
    this.lick += dt
    this.basketAge += dt
    this.hop.age += dt
    if (this.swell && (this.swell.age += dt) > 0.6) this.swell = null
    if (this.flight && (this.flight.age += dt) >= this.flight.lasts) this.flight = null
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i]
      m.vy += (m.kind === 'smoke' ? -40 : 520) * dt
      m.x += m.vx * dt; m.y += m.vy * dt
      if ((m.age += dt) > m.life) this.motes.splice(i, 1)
    }
    this.folk.step(dt, this.sight(), this.finger?.x ?? null, this.finger?.y ?? null)
    // He dusts flour while he waits: a few specks leave his hand as that habit starts.
    const habit = this.folk.habitOf('baker')
    if (habit === 1 && this.bakerHabit !== 1) this.puff('flour', FOLK.baker.x - 166, FOLK.baker.foot - 172, 5)
    this.bakerHabit = habit
  }

  /**
   * Put away: the scene lands unheard, and everything stands as a load would find it. A touch in progress is taken
   * back, since the child made no move. A finger that has already lifted made its move: the thing it let go, still
   * hanging in the grace, is let go where it hangs (given, laid in the basket, set in the snow, or back where it
   * came from when it hangs over nothing).
   */
  park(): void {
    const lifted = this.lifted >= 0
    this.lifted = -1
    letGo(this, lifted)
    this.endScene()
    this.cut = true
    this.settle()
  }

  /** Puts every view as a load finds it: nothing in the hand, nothing in the air, nothing waiting to sound. */
  settle(): void {
    this.time = 0
    this.finger = null
    this.stick = false; this.working = false; this.carry = null; this.hooked = null; this.pending = null
    this.snowTap = false; this.lifted = -1; this.letAt = null; this.out = ENDING.seconds
    this.pull = { x: 0, y: 0 }; this.landed = null; this.bare = false; this.hookDy = 0
    // A fair found finished has its halo standing still: the pulses were for the moment it came up.
    this.haloAge = this.finished ? 99 : 0
    this.flight = null; this.slide = null; this.swell = null; this.scene = null
    this.motes.length = 0; this.later.length = 0; this.sounds = []
    this.doorOpen = this.doorTo = this.finished ? DOOR.ajar : DOOR.rest
    this.glow = this.finished ? 1 : 0
    this.basketFrom = null; this.basketAge = 9
    this.clothFlown = 9; this.hop = { what: 'slot', index: -1, age: 9 }
    this.potMix = 1; this.potWas = this.pot; this.swirl = 0; this.lick = 9
    for (const spring of [...this.lamps, this.potRing, this.basketShake, this.flutter]) { spring.x = 0; spring.v = 0 }
    this.dipping.candle = this.pieces.candle
    this.dipping.colour = this.pot
    this.dipping.settle()
    this.bench.settle()
    this.size = sizeOf(this.pieces.candle)
    this.bakerHabit = -1
    for (const who of WHO) this.show(who, this.held[who] ? copyThing(this.held[who]) : null)
    this.folk.settle(this.sight())
  }

  /** Turns what the wax pot and the other benches did into sound, into the fair-goers' answers and into what must be saved. */
  drain(): void {
    const d = this.dipping
    for (const event of d.events) {
      switch (event.type) {
        case 'knock':
          this.say({ name: 'knock' })
          this.folk.react('knock')
          // The flames lean as the stick is taken.
          this.flutter.v += 2.5
          break
        case 'gloop':
          this.say({ name: 'gloop', fat: event.fat })
          this.folk.react('gloop')
          break
        case 'lift':
          this.say({ name: 'lift', fat: event.fat })
          if (event.coated > 0) {
            this.say({ name: 'hop' })
            this.folk.react('coat')
            this.changed(1)
          }
          break
        case 'plip':
          this.say({ name: 'plip', size: event.size, variant: event.variant })
          // The goat licks its lips at each drop: heard, and seen as its tongue going over its lip.
          this.say({ name: 'lick' })
          this.lick = 0
          this.folk.react('plip')
          break
        case 'blob':
          this.say({ name: 'blob' })
          this.folk.react('blob')
          break
        case 'bubble':
          this.say({ name: 'bubble', variant: event.variant })
          this.changed(1)
          break
        case 'bare':
          // The last of the wax is gone: a soft tick, and nobody answers it. The whistle was for the candle going thin.
          this.say({ name: 'bare' })
          this.changed(2)
          break
        default:
          this.say({ name: event.type })
      }
    }
    d.events.length = 0
    for (const event of this.bench.events) {
      switch (event.type) {
        case 'touch':
          this.say({ name: 'bench' })
          break
        case 'fold':
          this.say({ name: 'crease' })
          this.after(0.12, { name: 'fft' })
          this.folk.react('coat')
          break
        case 'bind':
          this.say({ name: 'rustle' })
          this.after(0.1, { name: 'vrrp' })
          this.folk.react('coat')
          break
        case 'cut':
          this.say({ name: 'chk' })
          this.folk.react('coat')
          break
        case 'pipe':
          this.say({ name: 'squeak' })
          this.folk.react('plip')
          break
        default:
          this.say({ name: event.type })
      }
    }
    this.bench.events.length = 0
    // The candle crossed from one size to the next: her hum for a fat one, and, once, a falling whistle and her
    // fist sinking for one that has melted thin. A candle growing through thin on its way up gets neither.
    const size = sizeOf(this.pieces.candle)
    if (size !== this.size) {
      if (size === 2) this.say({ name: 'proud' })
      else if (size === 0 && size < this.size) {
        this.say({ name: 'droop' })
        this.folk.react('thin')
      }
      this.size = size
    }
  }

  /** A new candle hangs on the stick: its size is taken as it is, with no hum and no whistle for the change. */
  hung(): void {
    this.dipping.swap(this.pieces.candle)
    this.size = sizeOf(this.pieces.candle)
  }

  /** How fat the candle on the stick is, 0 to 1. */
  get fat(): number {
    return girth(this.dipping.candle) / FATTEST
  }

  /** A ring on the wax where it was tapped. */
  ring(x: number): void {
    this.dipping.rings.push({ x: Math.min(POT.x + POT.rx - 30, Math.max(POT.x - POT.rx + 30, x)), age: 0, size: 0.8 })
    if (this.dipping.rings.length > MAX_RINGS) this.dipping.rings.shift()
  }

  /** Where a thing from `from` is drawn while it waits there: its basket place, its bench, or the hand that holds it. */
  placeOf(from: From, thing: Thing): Point {
    if (from.kind === 'slot') return slotAt(from.index)
    if (from.kind === 'bench') return this.at === 'candle' ? { x: REST.x, y: REST.y + 150 } : isStall(this.at) ? BENCH[this.at] : SNOW
    return handAt(from.who, thing.craft)
  }
}
