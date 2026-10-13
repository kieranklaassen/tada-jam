import { BASKET_BOX, aimAt, hitBox, hitLevel, nearestBox, type Aim, type Box, type Ray } from './aim'
import { COLS, KINDS, PER_KIND, SHAPE, hangingSlope, heights, highestTop, landing, lowestOf, pull, seated, settle, slopeAt, tapPlace, type Kind, type Landing, type Placed } from './blocks'
import { FIXED_STEP_S } from './config'
import { BELL_BOX, type Thing } from './castle'
import { Evening, type EveningEvent } from './evening'
import { Folk, WHO } from './folk'
import { BASKET, BELL, FOLK, GRID, HALF_LEVEL, OFFER, RUG, SIZE, WALL_Z, placeX, placeZ, standAt, yawAt, type Who } from './layout'
import { Spring, clamp01, smooth } from './motion'
import { below, makeRng, type Rng } from './rng'
import { Scene, type Beat } from './scene'
import { VARIANT_COUNT } from './voices'

// The toy: carrying blocks out of the basket and setting them down. Pure and
// on game time alone: it is stepped in whole fixed steps, draws its chance
// from its own seeded stream, and knows nothing of the renderer. A touch
// reaches it as a ray through the camera, so tests can play it.
//
// The rug is a list of blocks in the order they were set down (`blocks.ts`).
// Everything else here is how that list looks while it changes: a block in
// the hand, a block in the air, the folk flinching. None of it is saved.
// A block in the hand counts as being where it came from until the child
// lets it go (`rug()`), so nothing is ever saved in the air.
//
// The bell and what it starts are in evening.ts. Tidying is here: the third
// scene, which empties the rug into the basket.

export type PlayEvent =
  | { type: 'lift'; kind: Kind }
  | { type: 'land'; kind: Kind; level: number; tier: number; wood: boolean; air: boolean; soft: boolean; variant: number; at: [number, number, number] }
  | { type: 'shed'; why: 'slope' | 'tip' }
  | { type: 'flip' }
  | { type: 'basket'; kind: Kind }
  | { type: 'rise'; kind: Kind }
  | { type: 'creak' }
  | { type: 'pat'; surface: 'rug' | 'floor' | 'wall'; at: [number, number, number] }
  | { type: 'poke'; who: Who }
  | { type: 'taste'; who: Who }
  /** The basket tips over toward the rug, and its side comes down on the boards. */
  | { type: 'tip' }
  | { type: 'tipped' }
  | EveningEvent

type Leg = {
  kind: 'fall' | 'arc' | 'ease'
  from: [number, number, number]
  to: [number, number, number]
  seconds: number
  /** How high an arc rises above the straight line. */
  arc: number
  /** Seconds to wait before it starts. */
  wait: number
  t: number
  /** What happens when it arrives. */
  done: PlayEvent[]
}

export type Piece = {
  id: number
  kind: Kind
  /** On the rug, offered in the basket, out of sight in the basket, or in the hand. */
  state: 'rug' | 'offer' | 'under' | 'hand' | 'tidy'
  /** The middle of its foot, as drawn. */
  x: number
  y: number
  z: number
  /** Where it rests. */
  home: [number, number, number]
  /** The half level it rests at on the rug, and how many blocks stand under it. */
  level: number
  tier: number
  /** Something rests on it, so it neither hops nor rocks. */
  covered: boolean
  /** Its turn about its upright axis, easing toward `yawTo`. */
  yaw: number
  yawTo: number
  /** A small turn of its own, so no two stand quite alike. */
  jitter: number
  /** 0 out of sight, 1 shown: it pops up on a spring. */
  scale: Spring
  /** Extra height: up to the finger on a press, and a hop when something lands beside it. */
  lift: Spring
  hop: Spring
  /** Seconds since it landed, for its settling pose; large when at rest. */
  settled: number
  /** Seconds since it came up into the hand, for its stretch; large otherwise. */
  sinceLift: number
  /** How it leans against the way it is carried. */
  leanX: number
  leanZ: number
  legs: Leg[]
}

type Hand = {
  id: number
  from: 'basket' | 'rug'
  /** False while it is only pressed: it is carried once the finger moves. */
  carried: boolean
  /** The rug as it was, when the block came from the rug: where it goes back if the carry is taken away. */
  before: { placed: Placed[]; ids: number[] } | null
  /** The blocks that rest on a pressed block, lifted with it. */
  riders: number[]
  aim: Aim
  landing: Landing | null
  /** Where the finger holds it in the room. */
  point: [number, number, number]
}

/** How far a pressed block comes up to the finger. */
const PRESS_LIFT = 0.22
/** How far above its landing place a carried block hangs. */
const HOVER = 0.6
/** How far toward the rug a finger pulls the basket's wicker before it tips, in world units. */
const TIP_PULL = 0.5
/** Where a finger takes hold of the wicker to pull the basket over: the middle of its side toward the rug. */
export const WICKER: [number, number, number] = [BASKET.x - BASKET.wide / 2, BASKET.rim * 0.55, BASKET.z + 0.6]
/** Tidying never takes less than this, in seconds. */
export const TIDY_LEAST = 3
/**
 * Where the blocks go in when the basket lies tipped: the middle of its
 * mouth. The blocks that stand in the basket have ducked down into it.
 */
export const MOUTH: [number, number, number] = [BASKET.x - 1, 1.4, BASKET.z]
/** How high a block being tidied is lifted at least: over the side of the tipped basket and its mouth. */
const TIDY_PEAK = 1.8
/** Seconds one block takes from the rug into the basket, at most: one at a time, a big pile faster. */
const TIDY_HOP = 0.34
/** Seconds all the hops of the biggest pile take together. */
const TIDY_HOPS = 3.3

/**
 * Where a block being tidied is, `p` of the way from where it stood (0 to
 * 1), how far it has turned and how large. It is lifted straight up to
 * `peak`, which is over everything that still stands on the rug, crosses to
 * the mouth turning, then drops straight in, dwindling, and is gone as it
 * arrives.
 */
export function tidyHop(from: readonly [number, number, number], peak: number, p: number): { x: number; y: number; z: number; turn: number; scale: number } {
  const up = Math.sin(clamp01(p / 0.3) * Math.PI / 2)
  const across = smooth(clamp01((p - 0.3) / 0.4))
  const drop = clamp01((p - 0.7) / 0.3)
  const y = p < 0.7 ? from[1] + (peak - from[1]) * up : peak + (MOUTH[1] - peak) * drop * drop
  return { x: from[0] + (MOUTH[0] - from[0]) * across, y, z: from[2] + (MOUTH[2] - from[2]) * across, turn: across * 2.4, scale: (1 - drop) ** 1.5 }
}

/** Where a finger's ray meets the room, near enough for eyes to follow: at the height of a block's middle over the floor. */
function touchPoint(ray: Ray): [number, number, number] {
  const at = hitLevel(ray, 0.4)
  return at ?? [ray.origin[0] + ray.dir[0] * 8, ray.origin[1] + ray.dir[1] * 8, ray.origin[2] + ray.dir[2] * 8]
}

export class Play {
  readonly pieces: Piece[] = []
  readonly folk: Folk
  /** The basket rocks when its wicker is touched. */
  readonly basketRock = new Spring(0, 140, 7)
  hand: Hand | null = null
  /** Seconds of play so far. */
  time = 0
  /** The bell, the evening castle and the folk in it. */
  readonly evening: Evening
  /** How far the basket lies tipped toward the rug, 0 to 1. */
  basketTip = 0
  private tidying: Scene | null = null
  /** The child has set a block down since the rug was opened: the idle hand shows the bell first from then on. */
  private built = false
  /**
   * The castle has been seen and the afternoon rung back, with blocks still
   * on the rug: from then until the rug is tidied the basket glows for an
   * idle child and the idle hand shows it pulled over. Not saved: it is a
   * hint, and nothing of the world.
   */
  private seen = false
  /**
   * The game was put away and is back: what the idle hand goes by that is
   * not saved is forgotten, so a parked game comes back as a loaded one does.
   */
  asLoaded(): void {
    this.built = false
    this.seen = false
    // Nor is the colour a flag was tapped to, or how far one of the folk has got on a trip or in a scene: the
    // evening is as a load finds it, each thing in its first state and each of the folk where he rests.
    this.evening.load(this.placed, this.evening.on)
    this.gaze()
  }

  /** A finger is on the wicker: where it took hold, along the room's width. */
  private grip: number | null = null
  /** Where a bare finger touches now, in the room: the folk look at it. Null when no finger is down. */
  private finger: [number, number, number] | null = null
  private saveNow = false
  private placed: Placed[] = []
  /** The piece that is each block of `placed`. */
  private ids: number[] = []
  private readonly offer = {} as Record<Kind, number | null>
  private readonly under = {} as Record<Kind, number[]>
  private events: PlayEvent[] = []
  private owed = 0
  private readonly chance: Rng

  constructor(rug: readonly Placed[], seed: number, evening = false) {
    this.chance = makeRng(seed)
    this.folk = new Folk(makeRng(seed ^ 0x9e3779b9))
    this.evening = new Evening(this.folk, (event) => this.events.push(event))
    KINDS.forEach((kind, k) => {
      this.offer[kind] = null
      this.under[kind] = []
      for (let n = 0; n < PER_KIND; n++) {
        const [x, y, z] = OFFER[kind]
        this.pieces.push({
          id: k * PER_KIND + n, kind, state: 'under', x, y, z, home: [x, y, z], level: 0, tier: 0, covered: false,
          yaw: 0, yawTo: 0, jitter: 0, scale: new Spring(0, 320, 20), lift: new Spring(0, 420, 30), hop: new Spring(0, 300, 14),
          settled: 99, sinceLift: 99, leanX: 0, leanZ: 0, legs: [],
        })
      }
    })
    // The rug as it was left: each block takes a piece of its kind, and the rest are in the basket.
    const free = {} as Record<Kind, number[]>
    for (const kind of KINDS) free[kind] = this.pieces.filter((piece) => piece.kind === kind).map((piece) => piece.id).reverse()
    // A slope a saved rug has with its heel in the air is set down again where it can stay.
    for (const block of seated(rug)) {
      const id = free[block.kind].pop()
      if (id === undefined) continue
      this.placed.push({ kind: block.kind, col: block.col, row: block.row })
      this.ids.push(id)
    }
    for (const kind of KINDS) {
      const left = free[kind]
      const shown = left.pop() ?? null
      this.offer[kind] = shown
      this.under[kind] = left
      if (shown !== null) this.pieces[shown].state = 'offer'
    }
    this.rehome(true)
    // As it was left: the afternoon, or the evening castle standing with the folk in their places. No scene plays.
    this.evening.load(this.placed, evening)
    this.gaze()
  }

  /** Whether it is evening: the other thing that is saved. */
  get finished(): boolean {
    return this.evening.on
  }

  /** A scene has started, and its outcome is to be saved at once. Reading it clears it. */
  takeSaveNow(): boolean {
    const now = this.saveNow || this.evening.saveNow
    this.saveNow = false
    this.evening.saveNow = false
    return now
  }

  /** A scene is playing: evening falling, the afternoon returning, or the tidying. */
  get sceneRunning(): boolean {
    return this.evening.running || (this.tidying !== null && this.tidying.running)
  }

  /** The rug to save: the blocks in the order they were set down. A block in the hand is where it came from. */
  rug(): Placed[] {
    return (this.hand?.before?.placed ?? this.placed).map((block) => ({ ...block }))
  }

  /** What has happened since the last call, in order: the sounds and the puffs are made from it. */
  take(): PlayEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  /** Whether anything is still moving by itself: a block in the air or settling. */
  get busy(): boolean {
    return this.sceneRunning || this.evening.busy || this.pieces.some((piece) => piece.legs.length > 0)
  }

  // --- Picking ---------------------------------------------------------------

  private boxOf(piece: Piece): Box {
    const [w, h, d] = SIZE[piece.kind]
    // A thin one is still a whole place wide to a finger.
    const hw = Math.max(w, 0.86) / 2, hd = Math.max(d, 0.86) / 2
    return { min: [piece.home[0] - hw, piece.home[1], piece.home[2] - hd], max: [piece.home[0] + hw, piece.home[1] + h, piece.home[2] + hd] }
  }

  /** What a finger landing along this ray touches. */
  private pick(ray: Ray): { on: 'block'; id: number } | { on: 'folk'; who: Who } | { on: 'basket' } | { on: 'room'; surface: 'rug' | 'floor' | 'wall'; at: [number, number, number] } {
    const shown = this.pieces.filter((piece) => (piece.state === 'rug' || piece.state === 'offer') && piece.legs.length === 0)
    const block = nearestBox(ray, shown.map((piece) => this.boxOf(piece)))
    let folk: { who: Who; t: number } | null = null
    for (const who of WHO) {
      const at = FOLK[who]
      const t = hitBox(ray, { min: [at.x - at.box.left, 0, at.z - at.box.deep], max: [at.x + at.box.right, at.box.tall, at.z + at.box.deep] })
      if (t !== null && (!folk || t < folk.t)) folk = { who, t }
    }
    const basket = hitBox(ray, BASKET_BOX)
    // The wicker side of the basket is the basket, whatever stands behind it.
    if (basket !== null && ray.origin[1] + ray.dir[1] * basket < BASKET.rim - 0.03 && (!folk || basket < folk.t) && (!block || basket < block.t)) return { on: 'basket' }
    if (block && (!folk || block.t <= folk.t)) return { on: 'block', id: shown[block.index].id }
    if (folk) return { on: 'folk', who: folk.who }
    if (basket !== null) {
      // A finger on the basket near a block means that block.
      const x = ray.origin[0] + ray.dir[0] * basket, z = ray.origin[2] + ray.dir[2] * basket
      let near: Piece | null = null
      let nearest = 0.95
      for (const piece of shown) {
        if (piece.state !== 'offer') continue
        const far = Math.hypot(piece.home[0] - x, piece.home[2] - z)
        if (far < nearest) { nearest = far; near = piece }
      }
      return near ? { on: 'block', id: near.id } : { on: 'basket' }
    }
    return this.roomAt(ray)
  }

  /** The bare room under a finger: the rug, the boards or the wall. */
  private roomAt(ray: Ray): { on: 'room'; surface: 'rug' | 'floor' | 'wall'; at: [number, number, number] } {
    const floor = hitLevel(ray, 0)
    if (!floor || floor[2] < WALL_Z) {
      const t = (WALL_Z - ray.origin[2]) / (ray.dir[2] || -1e-9)
      return { on: 'room', surface: 'wall', at: [ray.origin[0] + ray.dir[0] * t, Math.max(0, ray.origin[1] + ray.dir[1] * t), WALL_Z] }
    }
    const onRug = floor[0] >= RUG.x0 && floor[0] <= RUG.x1 && floor[2] >= RUG.z0 && floor[2] <= RUG.z1
    return { on: 'room', surface: onRug ? 'rug' : 'floor', at: floor }
  }

  // --- The finger ------------------------------------------------------------

  /** A finger lands. Whatever it lands on answers now. */
  press(ray: Ray): void {
    if (this.hand) return
    this.finger = touchPoint(ray)
    this.watch()
    // A touch ends a scene, and is then an ordinary touch.
    const ended = this.evening.running
    this.evening.finish()
    if (this.tidying) this.tidying.finish()
    this.grip = null
    if (this.evening.on) return this.pressAtEvening(ray, ended)
    if (hitBox(ray, BELL_BOX) !== null) return this.ringBell(ended)
    const target = this.pick(ray)
    switch (target.on) {
      case 'block': {
        const piece = this.pieces[target.id]
        const from = piece.state === 'rug' ? 'rug' : 'basket'
        const riders = from === 'rug' ? this.ridersOf(target.id) : []
        this.hand = { id: piece.id, from, carried: false, before: null, riders, aim: { over: 'basket' }, landing: null, point: [piece.x, piece.y, piece.z] }
        piece.sinceLift = 0
        piece.settled = 99
        piece.lift.target = PRESS_LIFT
        for (const id of riders) this.pieces[id].lift.target = PRESS_LIFT
        this.events.push({ type: 'lift', kind: piece.kind })
        break
      }
      case 'folk':
        this.folk.stir(target.who, 'poke')
        this.events.push({ type: 'poke', who: target.who })
        break
      case 'basket':
        this.basketRock.velocity += 1.6
        this.events.push({ type: 'creak' })
        this.grip = hitLevel(ray, BASKET.rim)?.[0] ?? BASKET.x
        break
      case 'room':
        this.events.push({ type: 'pat', surface: target.surface, at: target.at })
        break
    }
    this.gaze()
  }

  /** The bell is rung. A second touch while its own ring is still in the air rings it again and turns nothing back. */
  private ringBell(ended: boolean): void {
    if (ended && this.evening.justRung(this.time)) {
      this.evening.bell.velocity += 7
      this.events.push({ type: 'bell' })
      return
    }
    if (this.evening.on) this.seen = true
    this.evening.ring(this.placed, this.time)
    // The ring's own first beat is played now, so the bell sounds under the finger.
    this.evening.step(0, this.time)
  }

  /** A finger lands in the evening. Nothing can be lifted: each thing answers as the grid's fifth column says. */
  private pressAtEvening(ray: Ray, ended: boolean): void {
    const basket = hitBox(ray, BASKET_BOX)
    const target = this.evening.pick(ray, basket ?? Infinity)
    if (target?.on === 'folk') {
      this.folk.stir(target.who, 'poke')
      this.events.push({ type: 'poke', who: target.who })
    } else if (target?.on === 'bell') this.ringBell(ended)
    else if (target?.on === 'thing') this.evening.act(target.index)
    else if (basket !== null) {
      this.basketRock.velocity += 1.6
      this.events.push({ type: 'creak' })
    } else {
      const room = this.roomAt(ray)
      this.events.push({ type: 'pat', surface: room.surface, at: room.at })
    }
  }

  /** The finger moves with a block: it is carried, and hangs over where it would land. */
  carry(ray: Ray): void {
    const hand = this.hand
    if (!hand) {
      // The folk's eyes follow a bare finger as it moves.
      this.finger = touchPoint(ray)
      this.watch()
      // A finger that has hold of the wicker and pulls it toward the rug tips the basket.
      const at = this.grip === null ? null : hitLevel(ray, BASKET.rim)
      if (at && this.grip !== null && this.grip - at[0] > TIP_PULL) {
        this.grip = null
        this.tidy()
      }
      return
    }
    const piece = this.pieces[hand.id]
    if (!hand.carried) this.beginCarry(hand, piece)
    hand.aim = aimAt(ray, heights(this.placed))
    // What it is over: the rim of the basket, or the top of whatever it would first touch.
    let base: number
    if (hand.aim.over === 'basket') {
      hand.landing = null
      base = BASKET.rim
    } else {
      const wide = SHAPE[piece.kind].wide
      // A slope goes with its heel under the finger; any other block with its left place there, or its middle.
      const col = piece.kind === 'slope' ? slopeAt(this.placed, hand.aim.col, hand.aim.row) : hand.aim.col - Math.floor((wide - 1) / 2)
      hand.landing = landing(this.placed, piece.kind, col, hand.aim.row)
      base = (hand.landing.over ?? hand.landing).level * HALF_LEVEL
      const yawTo = yawAt(piece.kind, (hand.landing.over ?? hand.landing).col)
      if (piece.kind === 'slope' && yawTo !== piece.yawTo) {
        piece.yawTo = yawTo
        this.events.push({ type: 'flip' })
      }
    }
    // The finger points at where the block will touch, and the block hangs above that point: the finger never
    // hides it, its shadow shows under it where it will land, and it never passes through a pile.
    const held = hitLevel(ray, base)
    if (held) hand.point = [held[0], base + HOVER, held[2]]
    this.gaze()
  }

  private beginCarry(hand: Hand, piece: Piece): void {
    hand.carried = true
    piece.lift.target = 0
    for (const id of hand.riders) this.pieces[id].lift.target = 0
    if (hand.from === 'rug') {
      const index = this.ids.indexOf(piece.id)
      hand.before = { placed: this.placed.map((block) => ({ ...block })), ids: [...this.ids] }
      const pulled = pull(this.placed, index)
      this.placed = pulled.placed
      this.ids = this.ids.filter((id) => id !== piece.id)
      piece.state = 'hand'
      // What stood on it drops straight down, the lowest first and from left to right, each with its own knock.
      const standing = settle(this.placed)
      const falling = pulled.dropped.map((by, i) => ({ by, i })).filter((entry) => entry.by > 0).sort((a, b) => standing[a.i].level - standing[b.i].level || standing[a.i].col - standing[b.i].col)
      this.rehome(false)
      // Pulled from under, it comes out toward the child, or away where something stands in front of it, before
      // what stood on it drops: it never goes up through them.
      let out = 0
      if (falling.length > 0) {
        const [w, , d] = SIZE[piece.kind]
        for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
          const x = piece.x + sx * (w / 2 + 0.5), z = piece.z + sz * (d / 2 + 0.5)
          if (z - d / 2 < RUG.z0 || x - w / 2 < RUG.x0 || x + w / 2 > RUG.x1 || this.topUnder(piece, x, z) > piece.y + 1e-6) continue
          // Out from under everything that stood on it, the ones that reach past its ends too.
          if (falling.some((entry) => { const rider = this.pieces[this.ids[entry.i]], [rw, , rd] = SIZE[rider.kind]; return Math.abs(x - rider.x) < (w + rw) / 2 + 0.02 && Math.abs(z - rider.z) < (d + rd) / 2 + 0.02 })) continue
          const leg = this.leg('ease', [piece.x, piece.y, piece.z], [x, piece.y, z], 0, 0, [])
          leg.seconds = out = 0.09
          piece.legs = [leg]
          break
        }
      }
      // Hemmed in on every side it cannot come out where it stands. It comes up with what stands on it, as far
      // as the lowest way out asks, goes out sideways there, and what stood on it drops.
      let rise = 0
      if (falling.length > 0 && out === 0) {
        const [w, , d] = SIZE[piece.kind]
        const riders = new Set(falling.map((entry) => this.ids[entry.i]))
        let best: { x: number; z: number; high: number } | null = null
        for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
          // Far enough to be out from under everything that stood on it.
          let reach = (sx ? w : d) / 2 + 0.5
          for (const id of riders) {
            const rider = this.pieces[id], [rw, , rd] = SIZE[rider.kind]
            reach = Math.max(reach, sx ? (w + rw) / 2 + 0.03 + sx * (rider.x - piece.x) : (d + rd) / 2 + 0.03 + sz * (rider.z - piece.z))
          }
          const x = piece.x + sx * reach, z = piece.z + sz * reach
          if (z - d / 2 < RUG.z0 || x - w / 2 < RUG.x0 || x + w / 2 > RUG.x1) continue
          let high = piece.y
          for (let k = 1; k <= 12; k++) high = Math.max(high, this.topUnder(piece, piece.x + ((x - piece.x) * k) / 12, piece.z + ((z - piece.z) * k) / 12, null, riders) + 0.12)
          if (!best || high < best.high - 1e-6) best = { x, z, high }
        }
        if (best) {
          const top: [number, number, number] = [piece.x, best.high, piece.z]
          const up = this.leg('ease', [piece.x, piece.y, piece.z], top, 0, 0, [])
          const across = this.leg('ease', top, [best.x, best.high, best.z], 0, 0, [])
          up.seconds = 0.1
          across.seconds = 0.1
          piece.legs = [up, across]
          rise = best.high - piece.y
          out = 0.1
        }
      }
      // The lowest lands first and knocks highest: what comes down sounds as a run down the scale.
      const tiers = falling.map((entry) => this.pieces[this.ids[entry.i]].tier).sort((a, b) => b - a)
      falling.forEach((entry, order) => {
        const rider = this.pieces[this.ids[entry.i]]
        const land = this.landEvent(rider, true)
        if (land.type === 'land') land.tier = tiers[order]
        if (rise === 0) return this.fall(rider, out + 0.07 * order, [land])
        const top: [number, number, number] = [rider.x, rider.y + rise, rider.z]
        const up = this.leg('ease', [rider.x, rider.y, rider.z], top, 0, 0, [])
        up.seconds = 0.1
        rider.legs = [up, this.leg('fall', top, rider.home, 0, out + 0.07 * order, [land])]
      })
      // A slope whose heel stood on what was pulled, with something lower under its toe, would be left held up
      // by its toe alone. It cannot stay so: it comes down with the others, touches, and hops to the nearest
      // place that holds it.
      let order = falling.length
      for (let tries = 0; tries < this.placed.length; tries++) {
        const hangs = hangingSlope(this.placed)
        if (hangs < 0) break
        const slope = this.pieces[this.ids[hangs]], was = this.placed[hangs]
        this.placed = this.placed.filter((_, i) => i !== hangs)
        this.ids = this.ids.filter((id) => id !== slope.id)
        const top: [number, number, number] = [slope.x, slope.y + rise, slope.z]
        this.setDown(slope, landing(this.placed, 'slope', was.col, was.row), 'fall')
        const first = slope.legs[0]
        first.wait = out + 0.07 * order++
        if (rise > 0) {
          const up = this.leg('ease', [slope.x, slope.y, slope.z], top, 0, 0, [])
          up.seconds = 0.1
          first.from = top
          slope.legs = [up, ...slope.legs]
        }
      }
    } else {
      piece.state = 'hand'
      this.offerNext(piece.kind)
    }
  }

  /** The finger lets go of a carried block: it lands. */
  drop(): void {
    this.grip = null
    this.fingerUp()
    const hand = this.hand
    if (!hand || !hand.carried) return
    const piece = this.pieces[hand.id]
    this.hand = null
    piece.leanX = 0
    piece.leanZ = 0
    if (hand.aim.over === 'basket' || !hand.landing) this.intoBasket(piece)
    else this.setDown(piece, hand.landing, 'fall')
    this.gaze()
  }

  /** The finger lifts without having moved. A block of the basket hops out onto the rug by itself; a block of the rug is set back with its knock. */
  tap(): void {
    // A tap on the basket once it is empty tips it too.
    if (this.grip !== null && KINDS.every((kind) => this.offer[kind] === null)) this.tidy()
    this.grip = null
    this.fingerUp()
    const hand = this.hand
    if (!hand || hand.carried) return
    const piece = this.pieces[hand.id]
    this.hand = null
    piece.lift.target = 0
    for (const id of hand.riders) this.pieces[id].lift.target = 0
    if (hand.from === 'basket') {
      piece.state = 'hand'
      this.offerNext(piece.kind)
      this.setDown(piece, tapPlace(this.placed, piece.kind), 'arc')
    } else {
      this.arrive(piece, [this.landEvent(piece, false)])
      hand.riders.forEach((id, order) => { this.fall(this.pieces[id], 0.05 * (order + 1), [this.landEvent(this.pieces[id], true)]) })
    }
    this.gaze()
  }

  /** The press was taken away and was not a tap: what it lifted comes down again, and nothing else happens. */
  pressEnd(): void {
    this.grip = null
    this.fingerUp()
    const hand = this.hand
    if (!hand || hand.carried) return
    this.hand = null
    this.pieces[hand.id].lift.target = 0
    for (const id of hand.riders) this.pieces[id].lift.target = 0
    this.gaze()
  }

  /** The carry was taken away with the finger still down. The child made no drop: the block goes back where it came from. */
  cancel(): void {
    this.grip = null
    this.fingerUp()
    const hand = this.hand
    if (!hand) return
    if (!hand.carried) return this.pressEnd()
    const piece = this.pieces[hand.id]
    this.hand = null
    piece.leanX = 0
    piece.leanZ = 0
    if (hand.before) {
      this.placed = hand.before.placed
      this.ids = hand.before.ids
      piece.state = 'rug'
      this.rehome(false)
      for (const id of this.ids) this.ease(this.pieces[id])
    } else {
      const risen = this.offer[piece.kind]
      if (risen !== null) {
        this.pieces[risen].state = 'under'
        this.under[piece.kind].push(risen)
      }
      this.offer[piece.kind] = piece.id
      piece.state = 'offer'
      piece.yawTo = 0
      this.rehome(false)
      this.ease(piece)
    }
    this.gaze()
  }

  // --- What a drop does ------------------------------------------------------

  private setDown(piece: Piece, at: Landing, how: 'fall' | 'arc'): void {
    const before = this.placed
    const wasHighest = highestTop(before)
    const wasLowestCube = lowestOf(before, 'cube')
    const wood = at.level > 0
    // A long one with a place under it that does not reach it rings on.
    const under = heights(before)
    let air = false
    if (piece.kind === 'long' && wood) for (let i = 0; i < SHAPE.long.wide; i++) if (under[at.row * COLS + at.col + i] < at.level) air = true
    this.built = true
    this.placed = [...before, { kind: piece.kind, col: at.col, row: at.row }]
    this.ids = [...this.ids, piece.id]
    piece.state = 'rug'
    piece.yawTo = yawAt(piece.kind, at.col)
    piece.jitter = piece.kind === 'round' || piece.kind === 'thin' ? this.chance.next() * Math.PI * 2 : (this.chance.next() - 0.5) * 0.05
    this.rehome(false)
    const done: PlayEvent[] = [{ type: 'land', kind: piece.kind, level: at.level, tier: at.tier, wood, air, soft: false, variant: below(this.chance, VARIANT_COUNT), at: [piece.home[0], piece.home[1], piece.home[2]] }]
    // Whose taste it is to: a new highest top for the king, a cube lower than any before for the cook, any arch for the dragon.
    const top = at.level + SHAPE[piece.kind].high
    if (!wasHighest || top > wasHighest.level + SHAPE[wasHighest.kind].high) done.push({ type: 'taste', who: 'king' })
    if (piece.kind === 'cube' && (!wasLowestCube || at.level < wasLowestCube.level)) done.push({ type: 'taste', who: 'cook' })
    if (piece.kind === 'arch') done.push({ type: 'taste', who: 'dragon' })
    const from: [number, number, number] = [piece.x, piece.y, piece.z]
    if (at.over) {
      // It touches where it was set, cannot stay, and hops to where it can.
      const touch = standAt(piece.kind, at.over.col, at.over.row, at.over.level)
      piece.legs = [
        this.leg('fall', from, touch, 0, 0, [{ type: 'shed', why: at.shed ?? 'tip' }]),
        ...this.wayOver(piece, touch, piece.home, [0.45, 1, 2], 0.34, done, at.shed === 'slope'),
      ]
    } else if (how === 'arc') {
      piece.legs = this.wayOver(piece, from, piece.home, [1.5, 2.2, 3], 0.5, done)
    } else {
      piece.legs = [this.leg('fall', from, piece.home, 0, 0, done)]
    }
  }

  private intoBasket(piece: Piece): void {
    const shown = this.offer[piece.kind]
    if (shown !== null) {
      this.pieces[shown].state = 'under'
      this.under[piece.kind].push(shown)
    }
    this.offer[piece.kind] = piece.id
    piece.state = 'offer'
    piece.yawTo = 0
    piece.jitter = 0
    this.rehome(false)
    piece.legs = this.wayOver(piece, [piece.x, piece.y, piece.z], piece.home, [0.3, 1], 0.26, [{ type: 'basket', kind: piece.kind }])
  }

  /** The next block of a kind comes up in the basket, if there is one. */
  private offerNext(kind: Kind, quiet = false): void {
    const next = this.under[kind].pop() ?? null
    this.offer[kind] = next
    if (next === null) return
    const piece = this.pieces[next]
    piece.state = 'offer'
    piece.scale.snap(quiet ? 1 : 0)
    piece.scale.target = 1
    if (!quiet) this.events.push({ type: 'rise', kind })
  }

  // --- Tidying -----------------------------------------------------------------

  /**
   * The basket is tipped. With blocks on the rug it lies over with its mouth
   * to the pile, they hop in from the top down, and it rocks upright: the
   * empty rug is the outcome, saved now. With nothing on the rug it only
   * creaks and rocks.
   */
  private tidy(): void {
    this.basketRock.velocity += 2.4
    if (this.placed.length === 0) {
      this.events.push({ type: 'creak' })
      return
    }
    // From the top down by the top of each, so none is lifted through one above it, and among equals the last set down first.
    const top = (id: number): number => this.pieces[id].home[1] + SIZE[this.pieces[id].kind][1]
    const going = this.ids.map((id, i) => ({ id, i })).sort((a, b) => top(b.id) - top(a.id) || b.i - a.i).map((entry) => this.pieces[entry.id])
    this.placed = []
    this.ids = []
    this.saveNow = true
    this.seen = false
    for (const piece of going) {
      piece.state = 'tidy'
      piece.legs = []
      piece.lift.target = 0
      piece.covered = false
    }
    const from = going.map((piece): [number, number, number] => [piece.x, piece.y, piece.z])
    // One at a time, a big pile faster: none meets another on the way.
    const hop = Math.min(TIDY_HOP, TIDY_HOPS / going.length)
    const hops = 0.6 + going.length * hop
    // Each is lifted over everything that still stands when it goes.
    const peaks = going.map((piece, n) => Math.max(TIDY_PEAK, piece.y + 0.12, ...going.slice(n + 1).map((other) => other.y + SIZE[other.kind][1] + 0.1)))
    // The blocks standing in the basket duck down into it as it goes over, and come up again once it is upright.
    for (const piece of this.pieces) if (piece.state === 'offer') piece.scale.target = 0
    const upright = Math.max(hops + 0.15, TIDY_LEAST - 0.8)
    const beats: Beat[] = [
      { at: 0, lasts: 0, play: (_, finishing) => { if (!finishing) this.events.push({ type: 'tip' }) } },
      { at: 0, lasts: 0.55, play: (p) => { this.basketTip = smooth(p) } },
      { at: 0.5, lasts: 0, play: (_, finishing) => { if (!finishing) this.events.push({ type: 'tipped' }) } },
    ]
    going.forEach((piece, n) => {
      beats.push({
        at: 0.6 + n * hop, lasts: hop,
        play: (p, finishing) => {
          const at = tidyHop(from[n], peaks[n], p)
          piece.x = at.x; piece.y = at.y; piece.z = at.z
          piece.yaw = piece.yawTo + at.turn
          piece.scale.snap(at.scale)
          if (p < 1) return
          // In: it is one of the basket's blocks again, out of sight until it is offered.
          piece.state = 'under'
          piece.home = [...OFFER[piece.kind]]
          piece.x = piece.home[0]; piece.y = piece.home[1]; piece.z = piece.home[2]
          piece.yaw = piece.yawTo = 0
          piece.jitter = 0
          piece.scale.snap(0)
          this.under[piece.kind].push(piece.id)
          if (!finishing) this.events.push({ type: 'basket', kind: piece.kind })
        },
      })
    })
    beats.push({ at: upright, lasts: 0.5, play: (p) => { this.basketTip = 1 - smooth(p) } })
    beats.push({
      at: upright + 0.5, lasts: 0.3,
      play: (p, finishing) => {
        if (p < 1) return
        this.basketRock.velocity += finishing ? 0 : 2
        for (const kind of KINDS) if (this.offer[kind] === null) this.offerNext(kind, finishing)
        this.rehome(finishing)
        this.gaze()
      },
    })
    this.tidying = new Scene(beats)
    this.tidying.start(this.time, () => {})
    this.gaze()
  }

  private landEvent(piece: Piece, soft: boolean): PlayEvent {
    return { type: 'land', kind: piece.kind, level: piece.level, tier: piece.tier, wood: piece.level > 0, air: false, soft, variant: below(this.chance, VARIANT_COUNT), at: [piece.home[0], piece.home[1], piece.home[2]] }
  }

  private leg(kind: Leg['kind'], from: [number, number, number], to: [number, number, number], arc: number, wait: number, done: PlayEvent[]): Leg {
    const seconds = kind === 'fall' ? Math.max(0.07, Math.min(0.24, Math.sqrt((2 * Math.max(0, from[1] - to[1])) / 34))) : 0.2
    return { kind, from: [from[0], from[1], from[2]], to: [to[0], to[1], to[2]], seconds, arc, wait, t: 0, done }
  }

  /** Whether another block is over this one, within the reach of its stretch as it comes up. */
  private closeOver(piece: Piece): boolean {
    const [w, h, d] = SIZE[piece.kind]
    for (const other of this.pieces) {
      if (other === piece || (other.state !== 'rug' && other.state !== 'hand')) continue
      const [ow, , od] = SIZE[other.kind]
      if (Math.abs(piece.x - other.x) > (w + ow) / 2 - 0.01 || Math.abs(piece.z - other.z) > (d + od) / 2 - 0.01) continue
      const gap = other.y - (piece.y + h)
      if (gap > -0.05 && gap < 0.25 * h) return true
    }
    return false
  }

  /**
   * The top of whatever a block of this piece's size is over at a place of
   * the room: the blocks that stand on the rug, the basket, and the blocks
   * that stand in it. A place on the rug counts for its whole square, so a
   * block keeps a finger's width from its neighbours.
   */
  private topUnder(piece: Piece, x: number, z: number, slidesOff: readonly [number, number] | null = null, without: ReadonlySet<number> | null = null): number {
    const [w, , d] = SIZE[piece.kind]
    let top = 0
    // Each block of the rug counts as high as its highest part over all the places it covers: a slope too.
    const standing = settle(this.placed)
    for (let i = 0; i < standing.length; i++) {
      const block = standing[i]
      // What comes up with the block is not in its way.
      if (without?.has(this.ids[i])) continue
      const shape = SHAPE[block.kind]
      const x0 = placeX(block.col) - 0.48, x1 = placeX(block.col + shape.wide - 1) + 0.48
      // A block that slides down the face of a slope is on it, not in it.
      if (slidesOff && block.kind === 'slope' && slidesOff[0] > x0 - 0.02 && slidesOff[0] < x1 + 0.02 && Math.abs(slidesOff[1] - placeZ(block.row)) < 0.5) continue
      if (x + w / 2 > x0 && x - w / 2 < x1 && Math.abs(z - placeZ(block.row)) < d / 2 + 0.48) top = Math.max(top, (block.level + shape.high) * HALF_LEVEL)
    }
    // A block that is on its way by itself counts where it is now, as high as it is now.
    for (const other of this.pieces) {
      if (other === piece || other.legs.length === 0 || (other.state !== 'rug' && other.state !== 'offer') || without?.has(other.id)) continue
      const [ow, oh, od] = SIZE[other.kind]
      if (Math.abs(x - other.x) < (w + ow) / 2 + 0.02 && Math.abs(z - other.z) < (d + od) / 2 + 0.02) top = Math.max(top, other.y + oh)
    }
    if (x + w / 2 > BASKET.x - BASKET.wide / 2 && x - w / 2 < BASKET.x + BASKET.wide / 2 && z + d / 2 > BASKET.z - BASKET.deep / 2 && z - d / 2 < BASKET.z + BASKET.deep / 2) {
      top = Math.max(top, BASKET.rim)
      for (const other of this.pieces) {
        if (other === piece || other.state !== 'offer') continue
        const [ow, oh, od] = SIZE[other.kind]
        if (Math.abs(x - other.home[0]) < (w + ow) / 2 + 0.02 && Math.abs(z - other.home[2]) < (d + od) / 2 + 0.02) top = Math.max(top, other.home[1] + oh)
      }
    }
    return top
  }

  /**
   * The way of a block that travels by itself to its place, over everything
   * between: an arc where an arc clears it all, and else straight up, across
   * and down, as a hand moves a toy.
   */
  private wayOver(piece: Piece, from: [number, number, number], to: [number, number, number], arcs: readonly number[], seconds: number, done: PlayEvent[], slides = false): Leg[] {
    const clears = (start: [number, number, number], arc: number, slidesOff: readonly [number, number] | null = null): boolean => {
      for (let k = 1; k < 60; k++) {
        const t = k / 60
        const x = start[0] + (to[0] - start[0]) * t, z = start[2] + (to[2] - start[2]) * t
        const y = start[1] + (to[1] - start[1]) * t + arc * 4 * t * (1 - t)
        if (y < this.topUnder(piece, x, z, slidesOff) + 0.04) return false
      }
      return true
    }
    // Down the face of a slope it slides as it is, where that takes it through nothing else.
    if (slides && clears(from, arcs[0], [from[0], from[2]])) {
      const leg = this.leg('arc', from, to, arcs[0], 0, done)
      leg.seconds = seconds
      return [leg]
    }
    // First straight up out of whatever stands beside it, where it starts lower than that.
    const out = Math.max(from[1], this.topUnder(piece, from[0], from[2]) + 0.1)
    const start: [number, number, number] = [from[0], out, from[2]]
    const legs: Leg[] = []
    if (out > from[1] + 1e-6) {
      legs.push(this.leg('ease', from, start, 0, 0, []))
      legs[0].seconds = 0.08
    }
    for (const arc of arcs) {
      if (!clears(start, arc)) continue
      const leg = this.leg('arc', start, to, arc, 0, done)
      leg.seconds = seconds
      return [...legs, leg]
    }
    let highest = Math.max(start[1], to[1])
    for (let k = 0; k <= 20; k++) highest = Math.max(highest, this.topUnder(piece, from[0] + ((to[0] - from[0]) * k) / 20, from[2] + ((to[2] - from[2]) * k) / 20) + 0.12)
    const up = this.leg('ease', start, [from[0], highest, from[2]], 0, 0, [])
    up.seconds = 0.1
    const across = this.leg('ease', [from[0], highest, from[2]], [to[0], highest, to[2]], 0, 0, [])
    across.seconds = seconds * 0.7
    return [...legs, up, across, this.leg('fall', [to[0], highest, to[2]], to, 0, 0, done)]
  }

  private fall(piece: Piece, wait: number, done: PlayEvent[]): void {
    piece.legs = [this.leg('fall', [piece.x, piece.y, piece.z], piece.home, 0, wait, done)]
  }

  private ease(piece: Piece): void {
    piece.legs = [this.leg('ease', [piece.x, piece.y, piece.z], piece.home, 0, 0, [])]
  }

  /** The blocks that rest on a block of the rug, directly or through another. */
  private ridersOf(id: number): number[] {
    const index = this.ids.indexOf(id)
    if (index < 0) return []
    const dropped = pull(this.placed, index).dropped
    const rest = this.ids.filter((other) => other !== id)
    return rest.filter((_, i) => dropped[i] > 0)
  }

  /** Where every block rests now. With `snap` they are put there at once, as on load: nothing eases in. */
  private rehome(snap: boolean): void {
    const standing = settle(this.placed)
    const high = heights(this.placed)
    standing.forEach((block, i) => {
      const piece = this.pieces[this.ids[i]]
      piece.state = 'rug'
      piece.level = block.level
      piece.tier = block.tier
      piece.home = standAt(block.kind, block.col, block.row, block.level)
      piece.covered = false
      for (let c = 0; c < SHAPE[block.kind].wide; c++) if (high[block.row * COLS + block.col + c] > block.level + SHAPE[block.kind].high) piece.covered = true
      if (snap) piece.yaw = piece.yawTo = yawAt(block.kind, block.col)
    })
    for (const piece of this.pieces) {
      if (piece.state === 'offer' || piece.state === 'under') {
        piece.home = [...OFFER[piece.kind]]
        piece.level = 0
        piece.tier = 0
        piece.covered = false
      }
      if (snap) {
        piece.x = piece.home[0]; piece.y = piece.home[1]; piece.z = piece.home[2]
        piece.scale.snap(piece.state === 'under' ? 0 : 1)
      }
      piece.scale.target = piece.state === 'under' ? 0 : 1
    }
  }

  // --- Where the folk look -----------------------------------------------------

  /** The finger has left the surface: the folk look at what they want again, or at the block that is on its way. */
  private fingerUp(): void {
    if (!this.finger) return
    this.finger = null
    if (!this.hand) this.gaze()
  }

  /** A bare finger on the surface: each of the folk looks at where it touches, until a block is in the hand. */
  private watch(): void {
    if (!this.finger || this.hand) return
    for (const who of WHO) this.folk.lookAt(who, this.finger[0], this.finger[1], this.finger[2])
  }

  /**
   * Each of the folk looks at the block in the hand or in the air, and with
   * none of those at a bare finger that is on the surface. With none,
   * each looks at what he wants: the king at the highest top on the rug, the
   * cook at the lowest cube, the dragon at the nearest arch, on the rug or in
   * the basket.
   */
  private gaze(): void {
    const moving = this.hand ? this.pieces[this.hand.id] : this.pieces.find((piece) => piece.legs.length > 0 && piece.state === 'rug')
    if (moving) {
      for (const who of WHO) this.folk.lookAt(who, moving.x, moving.y + SIZE[moving.kind][1] / 2, moving.z)
      return
    }
    if (this.finger) return this.watch()
    const standing = settle(this.placed)
    const top = highestTop(this.placed)
    if (top) {
      const [x, y, z] = standAt(top.kind, top.col, top.row, top.level + SHAPE[top.kind].high)
      this.folk.lookAt('king', x, y, z)
    } else this.folk.lookAt('king', GRID.x, 2.6, GRID.z)
    const cube = lowestOf(this.placed, 'cube')
    const cubeAt = cube ? standAt('cube', cube.col, cube.row, cube.level + 1) : OFFER.cube
    this.folk.lookAt('cook', cubeAt[0], cubeAt[1] + 0.3, cubeAt[2])
    let arch: [number, number, number] = [OFFER.arch[0], OFFER.arch[1] + 0.8, OFFER.arch[2]]
    let nearest = Infinity
    for (const block of standing) {
      if (block.kind !== 'arch') continue
      const at = standAt('arch', block.col, block.row, block.level + 1)
      const far = Math.hypot(at[0] - FOLK.dragon.x, at[2] - FOLK.dragon.z)
      if (far < nearest) { nearest = far; arch = at }
    }
    this.folk.lookAt('dragon', arch[0], arch[1], arch[2])
  }

  // --- Time ------------------------------------------------------------------

  /** Plays `seconds` of game time in whole fixed steps, carrying the rest over. A first frame of no time plays nothing. */
  advance(seconds: number): void {
    this.owed += seconds
    // A frame never plays more than a few steps' worth beyond the longest frame the clock hands out.
    let steps = 0
    while (this.owed >= FIXED_STEP_S && steps < 24) {
      this.owed -= FIXED_STEP_S
      this.step(FIXED_STEP_S)
      steps++
    }
    if (steps === 24) this.owed = 0
  }

  private step(dt: number): void {
    this.time += dt
    this.basketRock.step(dt)
    if (this.tidying) this.tidying.update(this.time)
    this.evening.step(dt, this.time)
    let looked = false
    for (const piece of this.pieces) {
      piece.settled += dt
      // A block comes up tall for a moment and in its own way. With another close over it there is no room to:
      // its coming up waits until it is out from under.
      if (piece.sinceLift > 0 || !this.closeOver(piece)) piece.sinceLift += dt
      piece.scale.step(dt)
      piece.lift.step(dt)
      piece.hop.step(dt)
      if (piece.hop.value < 0) { piece.hop.value = 0; piece.hop.velocity = Math.abs(piece.hop.velocity) * 0.25 }
      piece.yaw += (piece.yawTo - piece.yaw) * (1 - Math.exp(-16 * dt))
      const leg = piece.legs[0]
      if (leg) {
        if (leg.wait > 0) { leg.wait -= dt; continue }
        leg.t = Math.min(1, leg.t + dt / leg.seconds)
        const along = leg.kind === 'fall' ? smooth(Math.min(1, leg.t * 1.6)) : leg.kind === 'ease' ? smooth(leg.t) : leg.t
        const down = leg.kind === 'fall' ? leg.t * leg.t : along
        piece.x = leg.from[0] + (leg.to[0] - leg.from[0]) * along
        piece.z = leg.from[2] + (leg.to[2] - leg.from[2]) * along
        piece.y = leg.from[1] + (leg.to[1] - leg.from[1]) * down + leg.arc * 4 * leg.t * (1 - leg.t)
        if (leg.t >= 1) {
          piece.legs.shift()
          this.arrive(piece, leg.done)
          looked = true
        }
        continue
      }
      if (piece.state === 'hand' && this.hand && this.hand.carried && this.hand.id === piece.id) {
        const [tx, ty, tz] = this.hand.point
        const follow = 1 - Math.exp(-32 * dt)
        let nx = piece.x + (tx - piece.x) * follow, nz = piece.z + (tz - piece.z) * follow
        // It goes over things and never through them: beside something higher it rises first, and it comes down
        // only once it is past.
        const there = this.topUnder(piece, nx, nz)
        if (piece.y < there + 0.04) { nx = piece.x; nz = piece.z }
        const vx = (nx - piece.x) / dt, vz = (nz - piece.z) / dt
        piece.x = nx
        piece.z = nz
        const here = this.topUnder(piece, nx, nz)
        piece.y += (Math.max(ty, there + 0.14, here + 0.14) - piece.y) * (1 - Math.exp(-22 * dt))
        piece.y = Math.max(piece.y, Math.min(here + 0.04, piece.y + 9 * dt))
        // It leans back against the way it moves.
        const lean = 1 - Math.exp(-12 * dt)
        piece.leanZ += (Math.max(-0.3, Math.min(0.3, -vx * 0.035)) - piece.leanZ) * lean
        piece.leanX += (Math.max(-0.3, Math.min(0.3, vz * 0.035)) - piece.leanX) * lean
        continue
      }
      if (piece.state === 'tidy') continue
      const settle = 1 - Math.exp(-24 * dt)
      piece.x += (piece.home[0] - piece.x) * settle
      piece.y += (piece.home[1] - piece.y) * settle
      piece.z += (piece.home[2] - piece.z) * settle
    }
    if (looked) this.gaze()
    this.folk.step(dt)
  }

  /** A block has arrived: it settles in its own way, and what its arrival sets off is set off. */
  private arrive(piece: Piece, done: readonly PlayEvent[]): void {
    for (const event of done) {
      this.events.push(event)
      if (event.type === 'land') {
        // Only a block with nothing on it squashes and rocks: one that carries others stays as it is under them.
        if (!piece.covered) piece.settled = 0
        if (event.soft) continue
        const strength = clamp01(0.55 + event.level / 12)
        // The blocks beside it hop a hair, and the ones in the basket rattle.
        for (const other of this.pieces) {
          if (other === piece || other.covered || other.legs.length > 0 || other.state === 'under' || other.state === 'hand') continue
          const far = Math.hypot(other.home[0] - piece.home[0], other.home[2] - piece.home[2])
          if (other.state === 'rug' && far < 2.2) other.hop.velocity += 1.5 * strength * (1 - far / 2.2)
          if (other.state === 'offer') other.hop.velocity += 0.35 * strength
        }
        for (const who of WHO) this.folk.stir(who, 'knock', strength)
      }
      if (event.type === 'taste') this.folk.stir(event.who, 'taste')
    }
  }

  // --- For the view ------------------------------------------------------------

  /** Where the block in the hand would land: the middle of its foot and its turn, or null. The view lays its shadow there. */
  landingSpot(): { at: [number, number, number]; kind: Kind } | null {
    const hand = this.hand
    if (!hand || !hand.carried || !hand.landing) return null
    const kind = this.pieces[hand.id].kind
    return { at: standAt(kind, hand.landing.col, hand.landing.row, hand.landing.level), kind }
  }

  /**
   * What the idle hand shows: one move the child could make now, and never a
   * plan. In the afternoon it carries one block of the basket out to where a
   * tap would send it, and, once something stands on the rug, every other
   * time it taps the bell: the carry first, until the child has set a block
   * down, and the bell first from then on. With the basket empty it taps the
   * basket, which tips, and the bell. Once the castle has been seen and the
   * afternoon is back, it first pulls the basket over by its wicker, the way
   * a finger tips it while blocks still stand in it, then the bell, then a
   * carry. In the evening it taps the bell. `turn` picks a different kind of
   * block each time. Null when there is nothing to show.
   */
  guide(turn: number): { kind: 'carry'; id: number; from: [number, number, number]; to: [number, number, number] } | { kind: 'pull'; from: [number, number, number]; to: [number, number, number] } | { kind: 'tap'; at: [number, number, number] } | null {
    if (this.hand) return null
    const bell: { kind: 'tap'; at: [number, number, number] } = { kind: 'tap', at: [BELL.x, BELL.hangs - 0.25, BELL.z] }
    if (this.evening.on) return bell
    const order: Kind[] = ['cube', 'round', 'long', 'arch', 'thin', 'slope']
    const offered = order.filter((kind) => this.offer[kind] !== null)
    const bellToo = this.placed.length > 0
    if (offered.length === 0) {
      if (!bellToo) return null
      return turn % 2 === 0 ? { kind: 'tap', at: [BASKET.x - 0.22, BASKET.rim + 0.45, BASKET.z] } : bell
    }
    if (this.seen && bellToo) {
      if (turn % 3 === 0) return { kind: 'pull', from: [...WICKER], to: [WICKER[0] - TIP_PULL * 2.6, WICKER[1], WICKER[2]] }
      if (turn % 3 === 1) return bell
      const kind = offered[((Math.floor(turn / 3) % offered.length) + offered.length) % offered.length]
      const at = tapPlace(this.placed, kind)
      return { kind: 'carry', id: this.offer[kind]!, from: [OFFER[kind][0], OFFER[kind][1] + SIZE[kind][1] * 0.6, OFFER[kind][2]], to: standAt(kind, at.col, at.row, at.level + 1) }
    }
    if (bellToo && turn % 2 === (this.built ? 0 : 1)) return bell
    const n = bellToo ? Math.floor(turn / 2) : turn
    const kind = offered[((n % offered.length) + offered.length) % offered.length]
    const at = tapPlace(this.placed, kind)
    const from = OFFER[kind]
    return { kind: 'carry', id: this.offer[kind]!, from: [from[0], from[1] + SIZE[kind][1] * 0.6, from[2]], to: standAt(kind, at.col, at.row, at.level + 1) }
  }

  /** Whether the bell glows for an idle child: in the evening, and by day once something stands on the rug. */
  bellGlows(): boolean {
    return this.evening.on || this.placed.length > 0
  }

  /**
   * Whether the basket glows for an idle child: once it is empty, when a tap
   * tips it and the rug is tidied, and once the castle has been seen and the
   * afternoon is back, when a pull on its wicker does.
   */
  basketGlows(): boolean {
    return !this.evening.on && this.placed.length > 0 && (this.seen || KINDS.every((kind) => this.offer[kind] === null))
  }

  /** The blocks a child can take now: the ones offered in the basket. They glow when the child is idle. */
  touchable(): number[] {
    if (this.evening.on) return []
    return KINDS.map((kind) => this.offer[kind]).filter((id): id is number => id !== null)
  }

  /** The castle things a child can tap now: each one that has become itself. They glow when the child is idle. */
  tappable(): Thing[] {
    if (!this.evening.on) return []
    return this.evening.things.filter((thing) => this.evening.dress[thing.index] >= 1)
  }
}
