import { freshBadger, stepBadger, wakeBadger, type Badger } from './badger'
import { foxLands, freshFox, stepFox, type Fox } from './fox'
import { freshHedgehog, stepHedgehog, type Hedgehog } from './hedgehog'
import { BADGER_BOX, FLAME_BOX, FOX_LANE, HEDGEHOG_LANE, HOOK, HOOK_GRIP, HOOK_NEAR, HOOK_TOUCH, OWL_BOX, PAPER_BOX, PLACES, POLE, REACH, STAGE_W, WIRE, WORMS, apart, box, boxAt, foxBox, hedgehogBox, type Box } from './layout'
import { freshMoths, stepMoths, type Moths } from './moths'
import { freshOwl, stepOwl, type Owl } from './owl'
import { makeRng, type Rng } from './rng'
import { freshSight, near, reachOf, see, RUSH_WIDE, type Big, type Sight } from './seen'
import { middleOf, type Paper, type SheetWindow } from './sheet'
import { inside, noise } from './sketch'
import type { SoundEvent, SoundKind } from './sounds'
import { freshWorms, stepWorms, type Worms } from './worms'

// The dark wood as numbers: the lantern on its pole, the patches of light its
// windows throw, and six creatures that answer the light by rule (one module
// each). No canvas, no clock and no chance of its own: time comes in as
// seconds of play and is played in fixed steps, and the one random stream is
// made from the seed.
//
// One clock for sight and sound. Every sound is an event made in the step in
// which the thing that is seen changes, stamped with the model's own time
// (cells.test.ts holds it for every kind of sound).

/** One step of play, in seconds. */
export const STEP = 1 / 120
/** Stage units of light for one hundredth of the sheet. */
export const THROW_SCALE = 5.6
/** How far from the lantern the middle of a patch falls. */
export const THROW = 172
/** How near its middle the spider is touched by a light. */
export const SPIDER_REACH = 26
/** Faster than this, in stage units a second, a light rushes past; slower than `SLOW`, the hedgehog can keep up. */
export const RUSH = 640
export const SLOW = 190
/** How near a lantern that gives no light must come for a creature to answer it. */
export const DARK_NEAR = 210
/** How fast the lantern must swing through the middle to ring, in radians a second: a lantern that only trembles on its wire is silent. */
export const RING_SPEED = 1.1

export type Light = Paper | 'plain'
export const CREATURES = ['moths', 'fox', 'owl', 'worms', 'hedgehog', 'badger'] as const
export type Creature = (typeof CREATURES)[number]

/** What the wood keeps in the save. */
export type WoodSave = {
  lit: boolean
  lantern: { x: number; y: number }
  fox: { x: number; y: number }
  hedgehog: { x: number; y: number }
  /** One bit a glow-worm whose lamp is lit. */
  worms: number
  moths: 'bark' | 'lantern'
  met: Creature[]
}

export function freshWood(): WoodSave {
  return { lit: true, lantern: { ...PLACES.lantern }, fox: { ...PLACES.fox }, hedgehog: { ...PLACES.hedgehog }, worms: 0, moths: 'bark', met: [] }
}

/** One patch of light: a window's outline thrown onto the wood. */
export type Patch = {
  paper: Paper | null
  /** The window's outline round its own middle, in stage units. */
  local: Float32Array
  /** Where the patch falls round the lantern when it hangs still, and how far below the lantern's middle. */
  bearing: number
  drop: number
  /** Half the patch's width and height as it lies unturned. */
  rx: number
  ry: number
  x: number
  y: number
  turn: number
  /** The outline as it lies on the stage now, x, y, x, y. */
  world: Float32Array
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/**
 * Whether a finger at a point is on the hook: on the hook itself, on the place where the grip hangs under it, or
 * anywhere on the line between the two, each with a touch round about it. So the finger put on the hook, the
 * lantern itself held up to the hook and the tip of the pole laid on it all hang the lantern.
 */
export function onHook(x: number, y: number): boolean {
  const dx = HOOK_GRIP.x - HOOK.x, dy = HOOK_GRIP.y - HOOK.y
  const along = clamp(((x - HOOK.x) * dx + (y - HOOK.y) * dy) / (dx * dx + dy * dy), 0, 1)
  return Math.hypot(x - HOOK.x - dx * along, y - HOOK.y - dy * along) <= HOOK_TOUCH
}
/** Moves `from` towards `to` by at most `by`. */
export const toward = (from: number, to: number, by: number) => (Math.abs(to - from) <= by ? to : from + Math.sign(to - from) * by)

export class Wood {
  /** Seconds of play so far. */
  time = 0
  private owed = 0
  readonly rng: Rng
  private events: SoundEvent[] = []
  /** Sounds made while this is true belong to a scene. */
  inScene = false
  /** The creatures only idle, whatever light lies on them: while a scene shows the wood, and from a load until the first touch, so nothing starts by itself. */
  still = false

  // The lantern.
  lit: boolean
  /** It hangs on the hook by the door: the walk is over. */
  hung: boolean
  holding = false
  /** Where the finger wants the grip. */
  readonly want = { x: 0, y: 0 }
  readonly grip = { x: 0, y: 0, vx: 0, vy: 0 }
  /** The swing of the lantern on its wire, and how fast it swings. */
  swing = 0
  swingSpeed = 0
  /** The turn of the lantern on its wire. */
  twirl = 0
  private twirlSpeed = 0
  /** The weight of what sits on it, 0 to 1: it hangs lower and swings slower. */
  sag = 0
  /** The middle of the lantern. */
  readonly lantern = { x: 0, y: 0 }
  /** 1 when the finger has just landed or the wick has just caught, falling to 0. */
  flare = 0
  /** How far the windows of a hung lantern have come up on the wall, 0 to 1. The ending brings them up; until they show, they light nobody. */
  glow = 1
  /** How far the flame is bent over by a stream of breath, -1 to 1: to the left or to the right. */
  bend = 0
  /** Seconds since the candle was blown out, for the curl of smoke; large when it never was. */
  smoke = 99
  readonly patches: Patch[]
  readonly met = new Set<Creature>()
  /** How far each creature's eyes are open, 0 to 1: the first scene opens them one pair after another. */
  readonly awake = new Float32Array(CREATURES.length).fill(1)

  /** What light lies on each of the four large creatures as it is drawn: written once a step (seen.ts). */
  readonly sight: Record<Big, Sight> = { owl: freshSight(), badger: freshSight(), fox: freshSight(), hedgehog: freshSight() }

  // The creatures.
  readonly moths: Moths
  readonly fox: Fox
  readonly owl: Owl
  readonly worms: Worms
  readonly hedgehog: Hedgehog
  readonly badger: Badger
  readonly spider = { y: PLACES.spider.y as number, up: false, dark: 0 }
  /** Where a finger landed that could not take the lantern, because another is carrying it: a nick in the wax, 1 falling to 0. */
  readonly nick = { x: 0, y: 0, pulse: 0 }

  constructor(save: WoodSave, readonly sheet: readonly SheetWindow[], seed: number, hung = false, time = 0) {
    this.rng = makeRng(seed)
    this.time = time
    this.lit = save.lit
    this.hung = hung
    const at = hung ? HOOK_GRIP : save.lantern
    this.want.x = this.grip.x = clamp(at.x, REACH.left, REACH.right)
    this.want.y = this.grip.y = clamp(at.y, REACH.top, REACH.bottom)
    this.patches = sheet.map((window) => patchOf(window))
    for (const name of save.met) if (CREATURES.includes(name)) this.met.add(name)
    this.place()
    this.fox = freshFox(clamp(save.fox.x, FOX_LANE.left, FOX_LANE.right))
    this.hedgehog = freshHedgehog(clamp(save.hedgehog.x, HEDGEHOG_LANE.left, hung ? Math.max(HEDGEHOG_LANE.right, save.hedgehog.x) : HEDGEHOG_LANE.right))
    if (!hung) {
      // Found as left, and never standing on anybody: a lantern saved in the hand over a creature is found beside it.
      // (A place saved to the whole unit may lie a hair inside a room: that much is let be.)
      const at = restPlace(this.want.x, this.want.y, this.rooms(), 1.5)
      this.want.x = this.grip.x = at.x; this.want.y = this.grip.y = at.y
      this.place()
    }
    this.owl = freshOwl()
    this.worms = freshWorms(save.worms & ((1 << WORMS) - 1))
    this.badger = freshBadger()
    this.moths = freshMoths(this, save.moths === 'lantern' && this.lit)
    see(this)
  }

  toSave(): WoodSave {
    return {
      lit: this.lit,
      // Where the finger last held it, which is where it comes to rest.
      lantern: this.hung ? { ...HOOK_GRIP } : this.restsAt(),
      fox: { x: Math.round(this.fox.x), y: PLACES.fox.y },
      hedgehog: { x: Math.round(this.hedgehog.x), y: PLACES.hedgehog.y },
      worms: this.worms.lamps,
      // A moth in the air is saved as where it is going.
      moths: this.moths.riding && this.lit ? 'lantern' : 'bark',
      met: CREATURES.filter((name) => this.met.has(name)),
    }
  }

  /** Where the lantern is saved: where the finger last held it, or beside whoever it is held over, so it is never found standing on anybody. */
  private restsAt(): { x: number; y: number } {
    const at = this.holding ? restPlace(this.want.x, this.want.y, this.rooms()) : this.want
    return { x: Math.round(at.x), y: Math.round(at.y) }
  }

  /** The sounds made since the last call, oldest first. */
  takeEvents(): SoundEvent[] {
    const out = this.events
    this.events = []
    return out
  }

  sound(kind: SoundKind, n = 0): void {
    const event: SoundEvent = { kind, at: this.time, n: clamp(n, 0, 1) }
    if (this.inScene) event.scene = true
    this.events.push(event)
  }

  /** A creature answered the light with its rule: the ending fills in from this, and nothing shows or counts it. */
  meet(name: Creature): void {
    if (!this.hung) this.met.add(name)
  }

  // --- What the creatures see ------------------------------------------------

  /** The lantern gives light: the candle burns and the sheet has a window. */
  get gives(): boolean {
    return this.lit && this.patches.length > 0
  }

  /** It gives light the creatures answer: on the hook the walk is over, and they only idle. */
  get shines(): boolean {
    return this.gives && !this.hung && !this.still
  }

  /** Which light lies on a point, or null: `plain` is a window with no paper. */
  lightOn(x: number, y: number): Light | null {
    const patch = this.shines ? this.patchUnder(x, y) : null
    return patch ? (patch.paper ?? 'plain') : null
  }

  patchUnder(x: number, y: number): Patch | null {
    for (let i = this.patches.length - 1; i >= 0; i--) if (inside(this.patches[i].world, this.patches[i].world.length, x, y)) return this.patches[i]
    return null
  }

  /**
   * The topmost patch that touches a small round thing at `x`, `y` of radius `r`, or within `wide` of doing so: the
   * moths, the glow-worms and the spider are asked this of themselves as they are drawn. Null when the lantern gives no light.
   */
  touching(x: number, y: number, r: number, wide = 0): Patch | null {
    if (!this.gives) return null
    for (let p = this.patches.length - 1; p >= 0; p--) {
      const patch = this.patches[p], reach = reachOf(patch) + r + wide
      if (Math.abs(x - patch.x) > reach || Math.abs(y - patch.y) > reach) continue
      if (near(patch, x, y, wide) || near(patch, x + r, y, wide) || near(patch, x - r, y, wide) || near(patch, x, y + r, wide) || near(patch, x, y - r, wide)) return patch
    }
    return null
  }

  /** The light a small round thing answers: that of the topmost patch that touches it, while the creatures answer at all. */
  lightAt(x: number, y: number, r: number): Light | null {
    const patch = this.shines ? this.touching(x, y, r) : null
    return patch ? (patch.paper ?? 'plain') : null
  }

  /**
   * The light is rushing past a small round thing: it moves faster than `RUSH`, and a patch passes over the thing
   * or within `RUSH_WIDE` of it. The one rule of a rush, for every creature (seen.ts asks it of the large ones).
   */
  rushAt(x: number, y: number, r: number): boolean {
    return this.shines && this.speed > RUSH && this.touching(x, y, r, RUSH_WIDE) !== null
  }

  /** How fast the light is moving over the ground, in stage units a second. */
  get speed(): number {
    return Math.hypot(this.grip.vx, this.grip.vy)
  }

  /** The lantern has been let go out in the wood and stands where it was left: the creatures keep off it. */
  get atRest(): boolean {
    return !this.holding && !this.hung
  }

  /** The lantern is out in the wood and gives no light: unlit, or lit with no window. Never while the creatures only idle. */
  get cold(): boolean {
    return !this.gives && !this.hung && !this.still
  }

  /** A lantern that gives no light has come within `reach` of a point. */
  darkNear(x: number, y: number, reach = DARK_NEAR): boolean {
    return this.cold && Math.hypot(this.lantern.x - x, this.lantern.y - y) < reach
  }

  /** Something knocked the lantern: it swings. */
  bump(by: number): void {
    this.swingSpeed += by
  }

  /** The candle goes out. */
  blowOut(): void {
    this.lit = false
    this.smoke = 0
    this.flare = 0
    this.bend = 0
  }

  // --- The finger --------------------------------------------------------------

  /** Whether a point is on the hung lantern, with room round it for a small finger. */
  onHung(x: number, y: number): boolean {
    return this.hung && Math.abs(x - this.lantern.x) < 78 && y > this.lantern.y - 120 && y < this.lantern.y + 84
  }

  /** Whether a point is on the lantern as it hangs from its pole: its paper, its candle and its handle. */
  onLantern(x: number, y: number): boolean {
    return !this.hung && Math.abs(x - this.lantern.x) <= 60 && y >= this.lantern.y - 110 && y <= this.lantern.y + 70
  }

  /** A finger landed while another carries the lantern: it is not taken on, and it is answered where it landed with a nick in the wax and a tap. */
  rap(x: number, y: number): void {
    this.nick.x = x; this.nick.y = y; this.nick.pulse = 1
    this.sound('tap', x / STAGE_W)
  }

  /** The finger lands: the lantern is on its way at once, and it kicks and rings in this same call. On its hook it only kicks and rings. */
  press(x: number, y: number): void {
    const side = x >= this.lantern.x ? 1 : -1
    this.swingSpeed += -side * 1.6 - (this.swing > 0 ? 0.4 : -0.4)
    // The kick is seen in the frame the finger lands, lit or dark: the lantern is already off its rest.
    this.swing += -side * 0.035
    this.place()
    if (this.hung) {
      this.flare = this.lit ? 1 : 0
      this.sound('hookRing', x / STAGE_W)
      return
    }
    this.holding = true
    this.aim(x, y)
    if (this.lit) {
      this.flare = 1
      this.sound('ring', this.want.x / STAGE_W)
    } else this.sound('tock', this.want.x / STAGE_W)
  }

  drag(x: number, y: number): void {
    if (this.holding) this.aim(x, y)
  }

  /**
   * The finger let the lantern go, and it comes to rest where it was last held. Let go with the tip of its pole on
   * the hook, or with the finger itself on the hook, it is hung there: true then, and the walk is over. Nowhere
   * else hangs it, however far it was carried.
   */
  release(): boolean {
    if (!this.holding) return false
    this.holding = false
    if (Math.hypot(this.want.x - HOOK_GRIP.x, this.want.y - HOOK_GRIP.y) <= HOOK_NEAR) {
      this.hang()
      return true
    }
    if (onHook(this.want.x, this.want.y)) {
      // The finger was on the hook, or held the lantern itself up to it, above where the grip hangs: the lantern is seen to drop onto it.
      this.hang(true)
      return true
    }
    this.settle()
    return false
  }

  /** The finger was taken away, which is not the child letting go: nothing is hung, and the lantern stays where it was held, or beside whoever stands there. */
  drop(): void {
    if (!this.holding) return
    this.holding = false
    // It was in the hand over somebody, perhaps: it comes to rest beside them, as a lantern let go does.
    this.settle()
  }

  /** A tap is over: the lantern is let go where the tap brought it, and is never hung by it. */
  setDown(): void {
    if (!this.holding) return
    this.holding = false
    this.settle()
  }

  /**
   * Let go, the lantern comes to rest beside whoever stands there and never on them: where its paper and flame
   * would hang over the room of a large creature, the grip slides the least way that clears it, and the lantern
   * is seen to swing there. The creatures keep off a lantern at rest by their own lanes.
   */
  private settle(): void {
    const at = restPlace(this.want.x, this.want.y, this.rooms())
    this.want.x = at.x; this.want.y = at.y
  }

  /** The rooms of the four large creatures as they stand, and where the fox will land: what a lantern at rest keeps off. */
  rooms(): Box[] {
    return [foxBox(this.fox.x), foxBox(foxLands(this.fox)), hedgehogBox(this.hedgehog.x), BADGER_BOX, OWL_BOX]
  }

  /** Hangs the lantern on the hook as it is, lit or dark. */
  hang(drops = false): void {
    this.holding = false
    this.hung = true
    this.want.x = HOOK_GRIP.x; this.want.y = HOOK_GRIP.y
    if (!drops) {
      this.grip.x = HOOK_GRIP.x; this.grip.y = HOOK_GRIP.y
      this.grip.vx = this.grip.vy = 0
    }
    this.place()
  }

  /**
   * A tap. It lights a candle that is out, and the badger starts up. On a lantern with no window, which burns
   * and gives no light, it wakes the badger and leaves the candle as it is. On a lantern that gives light it is
   * only the press it began with.
   */
  tap(): void {
    if (this.hung || this.gives) return
    if (!this.lit) {
      this.lit = true
      this.flare = 1
      this.smoke = 99
      this.sound('strike')
    }
    wakeBadger(this)
  }

  private aim(x: number, y: number): void {
    this.want.x = clamp(x, REACH.left, REACH.right)
    this.want.y = clamp(y, REACH.top, REACH.bottom)
  }

  // --- Time ----------------------------------------------------------------------

  /** Plays `seconds` of the wood in fixed steps. What is left over waits for the next call. */
  step(seconds: number): void {
    this.owed += seconds
    while (this.owed >= STEP) {
      this.owed -= STEP
      this.tick()
    }
  }

  /** One fixed step. */
  tick(): void {
    const dt = STEP
    this.time += dt
    this.carry(dt)
    this.place()
    see(this)
    stepMoths(this, dt)
    stepFox(this, dt)
    stepOwl(this, dt)
    stepWorms(this, dt)
    stepHedgehog(this, dt)
    stepBadger(this, dt)
    this.stepSpider(dt)
  }

  private carry(dt: number): void {
    const grip = this.grip
    const ax = 260 * (this.want.x - grip.x) - 30 * grip.vx, ay = 260 * (this.want.y - grip.y) - 30 * grip.vy
    grip.vx += ax * dt; grip.vy += ay * dt
    grip.x += grip.vx * dt; grip.y += grip.vy * dt
    // The lantern is a weight on a wire: the pole's tip pulls it along and gravity brings it back. With moths
    // or worms sitting on it, it is heavier: it swings slower and takes longer to settle.
    const before = this.swing, speedBefore = this.swingSpeed
    const heavy = 1 - 0.55 * this.sag
    this.swingSpeed += (-38 * heavy * Math.sin(this.swing) - clamp(ax / 520, -60, 60) * Math.cos(this.swing) - 1.05 * heavy * this.swingSpeed) * dt
    this.swing += this.swingSpeed * dt
    if (Math.abs(this.swing) > 1.2) {
      this.swing = Math.sign(this.swing) * 1.2
      this.swingSpeed *= -0.3
    }
    this.twirlSpeed += (-16 * this.twirl - 2.4 * this.twirlSpeed + clamp(grip.vx * 0.02, -14, 14)) * dt
    this.twirl += this.twirlSpeed * dt
    // Through the middle with some speed rings a note; the turn of a wide swing ticks the wire.
    if (before !== 0 && Math.sign(before) !== Math.sign(this.swing) && Math.abs(this.swingSpeed) > RING_SPEED) {
      if (this.lit) this.sound('bell', this.lantern.x / STAGE_W)
    } else if (speedBefore !== 0 && Math.sign(speedBefore) !== Math.sign(this.swingSpeed) && Math.abs(this.swing) > 0.3) this.sound('wire', Math.min(1, Math.abs(this.swing)))
    this.flare = Math.max(0, this.flare - dt * 2.4)
    this.nick.pulse = Math.max(0, this.nick.pulse - dt * 3)
    if (!this.lit) this.smoke += dt
  }

  /** Lays the lantern and its patches out from the grip, the swing and the twirl. */
  place(): void {
    const tipX = this.grip.x + POLE.x, tipY = this.grip.y + POLE.y
    const wire = WIRE + this.sag * 16
    this.lantern.x = tipX + Math.sin(this.swing) * wire
    this.lantern.y = tipY + Math.cos(this.swing) * wire
    const turn = this.twirl + this.swing * 0.5
    const cos = Math.cos(turn), sin = Math.sin(turn)
    for (const patch of this.patches) {
      patch.turn = turn
      const bearing = patch.bearing + this.twirl + this.swing * 0.35
      patch.x = this.lantern.x + Math.cos(bearing) * THROW
      patch.y = this.lantern.y + Math.sin(bearing) * THROW + patch.drop
      const local = patch.local, world = patch.world
      for (let i = 0; i < local.length; i += 2) {
        world[i] = patch.x + local[i] * cos - local[i + 1] * sin
        world[i + 1] = patch.y + local[i] * sin + local[i + 1] * cos
      }
    }
  }

  /** The patch of one paper, or null when the sheet has none or the lantern gives no light. */
  patchOf(paper: Paper): Patch | null {
    if (!this.gives) return null
    for (let i = this.patches.length - 1; i >= 0; i--) if (this.patches[i].paper === paper) return this.patches[i]
    return null
  }

  // --- The spider, which has no part in the rules --------------------------------

  /** Where the spider's middle is now: it bobs on its thread while it hangs low. */
  get spiderY(): number {
    return this.spider.y + (this.spider.up ? 0 : Math.sin(this.time * 1.7) * 5)
  }

  private stepSpider(dt: number): void {
    const spider = this.spider
    // It is touched where it is drawn, bob and all, and is shown lit at the same distance.
    if (this.lightAt(PLACES.spider.x, this.spiderY, SPIDER_REACH)) {
      spider.dark = 0
      if (!spider.up) {
        spider.up = true
        this.sound('zip')
      }
    } else {
      spider.dark += dt
      if (spider.dark > 1.6) spider.up = false
    }
    spider.y = toward(spider.y, spider.up ? 104 : PLACES.spider.y, (spider.up ? 620 : 46) * dt)
  }
}

function patchOf(window: SheetWindow): Patch {
  const outline = window.outline
  const count = outline.length / 2
  const middle = middleOf(outline)
  // The edge of a scraped patch is rough: each corner of the outline and the middle of each side is nudged a little.
  const local = new Float32Array(count * 4)
  let rx = 0, ry = 0
  for (let i = 0; i < count; i++) {
    const x = (outline[i * 2] - middle.x) * THROW_SCALE, y = (outline[i * 2 + 1] - middle.y) * THROW_SCALE
    const next = (i + 1) % count
    const nx = (outline[next * 2] - middle.x) * THROW_SCALE, ny = (outline[next * 2 + 1] - middle.y) * THROW_SCALE
    local[i * 4] = x + noise(i, 71) * 2.6
    local[i * 4 + 1] = y + noise(i, 72) * 2.6
    local[i * 4 + 2] = (x + nx) / 2 + noise(i, 73) * 3.4
    local[i * 4 + 3] = (y + ny) / 2 + noise(i, 74) * 3.4
    rx = Math.max(rx, Math.abs(x)); ry = Math.max(ry, Math.abs(y))
  }
  // Where the window sits round the paper is the side its light falls on: the middle of the sheet throws
  // upwards. A window cut low in the sheet throws its light lower.
  const bearing = -Math.PI / 2 + Math.PI * 2 * (middle.x / 100 - 0.5)
  return { paper: window.paper, local, bearing, drop: (middle.y - 50) * 1.6, rx, ry, x: 0, y: 0, turn: 0, world: new Float32Array(local.length) }
}

/** The lantern at rest, from its middle: the paper and the flame over it. */
export const REST_BOX = box(PAPER_BOX.left, FLAME_BOX.top, PAPER_BOX.right, PAPER_BOX.bottom)
/** Where the lantern's middle is when the grip is at rest at a point. */
export const restOf = (x: number, y: number) => ({ x: x + POLE.x, y: y + POLE.y + WIRE })
const rested = { x: 0, y: 0 }

/**
 * The place nearest `x`, `y` where the grip can rest with the lantern on none of `rooms`: the place itself where
 * it is clear, and else the least slide that clears them all inside the reach, to the left, to the right, up
 * or down past one room, or past one and then past another where two stand corner to corner. Where no such
 * slide does, the place stays as it is.
 */
export function restPlace(x: number, y: number, rooms: readonly Box[], slack = 0): { x: number; y: number } {
  rested.x = x; rested.y = y
  const clear = (gx: number, gy: number, by = 0) => {
    const at = restOf(gx, gy), room = box(at.x + REST_BOX.left + by, at.y + REST_BOX.top + by, at.x + REST_BOX.right - by, at.y + REST_BOX.bottom - by)
    return rooms.every((other) => apart(room, other))
  }
  if (clear(x, y, slack)) return rested
  let least = Infinity
  const tryAt = (gx: number, gy: number, more: boolean) => {
    if (gx < REACH.left || gx > REACH.right || gy < REACH.top || gy > REACH.bottom) return
    if (clear(gx, gy)) {
      const far = Math.hypot(gx - x, gy - y)
      if (far < least) { least = far; rested.x = gx; rested.y = gy }
    } else if (more) slides(gx, gy, false)
  }
  const slides = (gx: number, gy: number, more: boolean) => {
    const at = restOf(gx, gy), mine = boxAt(REST_BOX, at.x, at.y)
    for (const other of rooms) {
      if (apart(mine, other)) continue
      tryAt(gx + other.left - mine.right, gy, more)
      tryAt(gx + other.right - mine.left, gy, more)
      tryAt(gx, gy + other.top - mine.bottom, more)
      tryAt(gx, gy + other.bottom - mine.top, more)
    }
  }
  slides(x, y, true)
  return rested
}
