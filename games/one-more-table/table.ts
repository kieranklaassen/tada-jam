import { CAST, GUESTS, HOME, arrivals, type DishId, type GuestId } from './cast'
import { APRON, DISH_Y, SHUT, SPARE, SPOTS, SPOT_KEYS, TOP, cameraFor, gripRadius, toStagePoint, toWorld, type Camera, type Point, type SpotKey } from './layout'
import { dishAt, freshDishes, taste, type GameState } from './save'
import type { SoundName } from './voices'

// The table and everyone at it. It knows no browser and no pixels: play.ts
// hands it touches in stage units and the seconds of each frame.
// - The row is a list of places with widths, laid one after the other from
//   the table's left end, so no two can ever overlap.
// - `ext` is how far the table is pulled: 0 packed, 1 a whole gap open, -1 shut.
// - What is saved is decided the moment a thing happens; what is seen follows.

export type Target =
  | { kind: 'knob' }
  | { kind: 'bell' }
  | { kind: 'waiter' }
  | { kind: 'guest'; id: GuestId }
  | { kind: 'dish'; id: DishId }
  | { kind: 'spot'; key: SpotKey }
  | { kind: 'ground' }

export type Place = { id: GuestId | null; w: number; want: number }
export type Fly = { t: number; lasts: number; x: number; y: number; high: number; spin: number; home: boolean; delay: number; landed: boolean }
export type Body = {
  id: GuestId
  /** What it is doing to a neighbour, and what is being done to it; seconds, below 0 still to come, -9 nothing. */
  act: number
  dir: 1 | -1
  took: number
  takes: GuestId | null
  /** A squash and its speed: 1 is at rest. */
  sq: number
  sv: number
  fly: Fly | null
  hiccup: number
}
export type Slide = { t: number; x: number; y: number }
export type Carry = { kind: 'guest' | 'dish' | 'waiter'; guest: GuestId; dish: DishId; x: number; y: number; index: number }
export type Feast = { t: number; length: number; eats: { who: GuestId; dish: DishId | null; from: GuestId; at: number; heard: boolean }[]; leaned: boolean }
export type Sound = { name: SoundName; steps: number; delay: number }
export type Mark = { x: number; y: number; t: number; kind: number }

export const ACT_S = 1.15
export const EAT_S = 1.5
export const BITE_S = 0.75
const COMMIT = 0.94
const WALK_S = 0.5
const NOTHING = -9
const clamp = (t: number, a: number, b: number) => Math.min(b, Math.max(a, t))
const INTRO = { hand: 0.9, pull: 1.0, rest: 1.1 } as const

export class Table {
  readonly state: GameState
  readonly row: Place[] = []
  readonly bodies: Record<GuestId, Body>
  /** Those on their way home: they are drawn until they are out of sight. */
  readonly leaving: GuestId[] = []
  ext = 0
  private extV = 0
  /** Where a held knob is pulled to, or null when it is let go. */
  private held: number | null = null
  /** The table moves by itself: a pull being finished, or a push. */
  auto: 1 | -1 | null = null
  private shutDone = false
  tilt = 0
  private tiltTo = 0
  private tiltArmed = true
  readonly cam: Camera = { z: 1, x: 0 }
  private readonly camTo: Camera = { z: 1, x: 0 }
  /** 0 to 1: the one who waits has come to the door. Below 0 it is still to set out. */
  waiterT = 1
  /** The one who waits bumps off the packed row: seconds, or -9. */
  bump = NOTHING
  /** The knob stays lit until the next touch. */
  lit = false
  /** Attended seconds without a touch, and whether the ladder still shows. Play sets them. */
  idle = 0
  asking = false
  private nudge = 0
  carry: Carry | null = null
  /** A carried thing hangs while a lifted finger may come back. */
  waiting = false
  feast: Feast | null = null
  /** Seconds into the first showing, or null. */
  intro: number | null = null
  bell = 0
  private bellV = 0
  knobPress = 0
  readonly slides = new Map<DishId, Slide>()
  readonly jiggle = new Map<DishId, number>()
  readonly wag = new Map<SpotKey, number>()
  readonly marks: Mark[] = []
  sounds: Sound[] = []
  changed: 'no' | 'soon' | 'now' = 'no'
  /** Where they all look, in world units, or null for the one who matters most. */
  finger: Point | null = null
  time = 0
  private reed = 0
  private marksMade = 0
  /** The bell is what the finger took: a pull that the visit ended must not become one. */
  private swinging = false
  private along = false
  private grabX = 0
  private grabY = 0
  private grabExt = 0

  constructor(state: GameState) {
    this.state = state
    this.bodies = Object.fromEntries(GUESTS.map((id) => [id, { id, act: NOTHING, dir: 1, took: NOTHING, takes: null, sq: 1, sv: 0, fly: null, hiccup: NOTHING } satisfies Body])) as unknown as Record<GuestId, Body>
    for (const id of state.order) this.row.push({ id, w: CAST[id].width, want: CAST[id].width })
    if (!state.shown) {
      state.shown = true
      this.intro = 0
      this.changed = 'now'
    }
    this.aim(true)
  }

  // --- Places ---------------------------------------------------------------

  get waiter(): GuestId | null {
    return arrivals(this.state.rounds).find((g) => !this.state.order.includes(g)) ?? null
  }
  /** How wide a gap has to open for the next one. */
  get gapWidth(): number {
    const id = this.waiter
    return id ? CAST[id].width : SPARE
  }
  /** How narrow everyone is squeezed. */
  get squeeze(): number {
    return this.ext < 0 ? 1 + this.ext * (1 - SHUT) : 1
  }
  get gap(): number {
    return Math.max(0, this.ext) * this.gapWidth
  }
  get seatsLength(): number {
    let w = 0
    for (const p of this.row) w += p.w
    return w * this.squeeze
  }
  get length(): number {
    return this.seatsLength + this.gap
  }
  get radius(): number {
    return gripRadius(this.cam.z)
  }
  knobAt(): Point {
    return { x: this.length + this.radius + 4, y: -this.radius - 88 + this.dip(this.length) }
  }
  bellAt(): Point {
    return { x: -this.radius - 8, y: -this.radius - 88 }
  }
  /** How far the tipped table has gone down at x. */
  dip(x: number): number {
    return this.tilt * 60 * clamp(x / Math.max(200, this.length), 0, 1.1)
  }
  /** Where a seated guest's place is: its middle and its width now. */
  place(id: GuestId): { x: number; w: number } | null {
    let x = 0
    const s = this.squeeze
    for (const p of this.row) {
      if (p.id === id) return { x: x + (p.w * s) / 2, w: p.w * s }
      x += p.w * s
    }
    return null
  }
  /** Where the one who waits stands: behind the end of the table, where the gap will open. */
  door(): Point {
    let rest = 0
    for (const id of this.state.order) rest += CAST[id].width
    return { x: rest + this.gapWidth / 2 + 44 + (1 - clamp(this.waiterT, 0, 1)) * 420, y: 0 }
  }
  /** The middle of a guest's head line, seated, flying or waiting: the point its base stands on. */
  base(id: GuestId): Point & { w: number } {
    const body = this.bodies[id]
    const at = this.place(id)
    const w = at?.w ?? CAST[id].width
    if (this.carry && this.carry.kind !== 'dish' && this.carry.guest === id) return { x: this.carry.x, y: this.carry.y + CAST[id].tall * 0.7, w: CAST[id].width }
    const f = body.fly
    if (f && (at || f.home)) {
      const u = clamp((f.t - f.delay) / f.lasts, 0, 1)
      const tx = f.home ? f.x + 900 + this.length * 0.4 : at!.x
      const ty = f.home ? TOP - 200 : TOP + this.dip(at!.x)
      return { x: f.x + (tx - f.x) * u, y: f.y + (ty - f.y) * u - Math.sin(u * Math.PI) * f.high, w: f.home ? CAST[id].width : at!.w }
    }
    if (!at) { const d = this.door(); return { x: d.x, y: TOP, w } }
    return { x: at.x, y: TOP + this.dip(at.x), w }
  }
  /** Where a dish stands when nothing moves it. */
  dishHome(dish: DishId): Point {
    const d = this.state.dishes[dish]
    const seated = this.state.order.includes(d.at)
    const b = this.base(d.at)
    if (d.on === 'head') return { x: b.x, y: b.y - CAST[d.at].tall - 52 }
    if (!seated) return CAST[d.at].tall < 130 ? { x: b.x + b.w * 0.5, y: TOP + 4 } : { x: b.x - b.w * 0.16, y: TOP - 30 }
    if (this.bodies[d.at].fly || (this.carry?.kind === 'guest' && this.carry.guest === d.at)) {
      const at = this.place(d.at)
      if (at) return { x: at.x, y: DISH_Y + this.dip(at.x) }
      return { x: b.x, y: b.y - 20 }
    }
    return { x: b.x, y: DISH_Y + this.dip(b.x) }
  }
  dishPos(dish: DishId): Point {
    if (this.carry?.kind === 'dish' && this.carry.dish === dish) return { x: this.carry.x, y: this.carry.y }
    const to = this.dishHome(dish)
    const s = this.slides.get(dish)
    if (!s) return to
    const u = clamp(s.t / 0.5, 0, 1), k = u * u * (3 - 2 * u), far = Math.abs(to.x - s.x)
    return { x: s.x + (to.x - s.x) * k, y: s.y + (to.y - s.y) * k - Math.sin(u * Math.PI) * (far > 260 ? 260 : Math.abs(to.y - s.y) > 60 ? 40 : 0) }
  }
  /** Whether a dish is seen full: the save empties it when the feast starts, the eye when it is eaten. */
  isFull(dish: DishId): boolean {
    const e = this.feast?.eats.find((x) => x.dish === dish && x.who === x.from)
    return e ? this.feast!.t < e.at + BITE_S : this.state.dishes[dish].full
  }
  /** What can be seen of what someone ate. */
  eaten(id: GuestId): DishId | null {
    const e = this.feast?.eats.find((x) => x.who === id)
    if (e && this.feast!.t < e.at + BITE_S) return null
    return this.state.ate[id] ?? null
  }

  at(p: Point): Target {
    const q = toWorld(p, this.cam)
    const z = this.cam.z
    const near = (c: Point, r: number) => Math.hypot(q.x - c.x, q.y - c.y) <= r
    if (near(this.knobAt(), this.radius + 14 / z)) return { kind: 'knob' }
    if (near(this.bellAt(), this.radius + 10 / z)) return { kind: 'bell' }
    let best: DishId | null = null, d0 = Math.max(48, 36 / z)
    for (const id of this.state.order) for (const on of ['table', 'head'] as const) {
      const dish = dishAt(this.state, id, on)
      if (!dish) continue
      const c = this.dishPos(dish), d = Math.hypot(q.x - c.x, q.y - (c.y - 26))
      if (d < d0) { d0 = d; best = dish }
    }
    if (best) return { kind: 'dish', id: best }
    for (const id of this.state.order) {
      const b = this.base(id)
      if (Math.abs(q.x - b.x) <= b.w / 2 && q.y > b.y - CAST[id].tall - 74 && q.y < APRON + 84) return { kind: 'guest', id }
    }
    const w = this.waiter
    if (w && this.waiterT > 0.3) {
      const c = this.door()
      if (Math.abs(q.x - c.x) <= CAST[w].width / 2 + 24 && q.y > TOP - CAST[w].tall - 80 && q.y < 10) return { kind: 'waiter' }
    }
    for (const key of SPOT_KEYS) if (near(SPOTS[key], SPOTS[key].r)) return { kind: 'spot', key }
    return { kind: 'ground' }
  }

  // --- Fingers --------------------------------------------------------------

  private sound(name: SoundName, steps = 0, delay = 0): void {
    if (this.sounds.length < 24) this.sounds.push({ name, steps, delay })
  }
  private dirty(now = false): void {
    if (now) this.changed = 'now'
    else if (this.changed === 'no') this.changed = 'soon'
  }

  press(target: Target, p: Point): void {
    this.endShows()
    this.lit = false
    const q = toWorld(p, this.cam)
    this.finger = q
    switch (target.kind) {
      case 'knob':
        this.auto = null
        this.knobPress = 1
        this.sound('creak')
        break
      case 'bell':
        this.bellV += 2
        this.sound('clink')
        break
      case 'waiter': {
        const w = this.waiter!
        this.kick(w, -3)
        this.sound('pat', 2)
        break
      }
      case 'guest':
        this.kick(target.id, -4)
        this.sound('pat', GUESTS.indexOf(target.id) % 5)
        break
      case 'dish':
        this.jiggle.set(target.id, 0)
        this.sound('plate', 0)
        break
      case 'spot':
        this.wag.set(target.key, 0)
        this.sound(target.key)
        break
      case 'ground':
        this.dab(p)
    }
  }

  /** A soft brush flower under a finger that has nothing else to do. */
  dab(p: Point): void {
    const q = toWorld(p, this.cam)
    this.marks.push({ x: q.x, y: q.y, t: 0, kind: this.marksMade++ % 3 })
    if (this.marks.length > 6) this.marks.shift()
    this.sound('dab', this.marksMade % 5)
  }

  tap(target: Target): void {
    this.release()
    switch (target.kind) {
      case 'knob':
        this.held = null
        if (this.state.fed && !this.waiter) { this.auto = -1; this.shutDone = false }
        else { this.auto = 1; if (!this.waiter) this.bellV += 5 }
        break
      case 'bell':
        this.ring()
        break
      case 'waiter':
        this.bump = 0
        this.lit = true
        this.sound('bump', 0, 0.22)
        break
      case 'guest':
        this.doAct(target.id)
        break
      case 'dish': {
        const d = this.state.dishes[target.id]
        this.jiggle.set(target.id, 0)
        if (!d.full) { d.full = true; this.sound('refill'); this.dirty() }
        else this.sound(target.id)
        break
      }
      default:
        break
    }
  }

  /** A press that was neither a tap nor a drag, and the start of every ending. */
  release(): void {
    this.knobPress = 0
    this.finger = null
  }

  /** A finger goes: returns whether something is carried by it. */
  take(target: Target, p: Point): boolean {
    const q = toWorld(p, this.cam)
    this.swinging = false
    if (target.kind !== 'knob') {
      this.held = null
      // A table that is shutting stops for a hand, and one opening does not seat the one who is carried.
      if (this.auto === -1 || target.kind === 'waiter') this.auto = null
    }
    if (target.kind === 'knob') {
      this.grabX = p.x
      this.grabY = p.y
      this.grabExt = this.ext
      this.held = this.ext
      this.along = false
      this.shutDone = false
      return true
    }
    if (target.kind === 'bell') { this.bellV += 4; this.swinging = true; return true }
    if (target.kind === 'guest') {
      const index = this.state.order.indexOf(target.id)
      if (index < 0) return false
      const body = this.bodies[target.id]
      body.fly = null
      this.carry = { kind: 'guest', guest: target.id, dish: 'corn', x: q.x, y: q.y, index }
      this.sound(target.id, 7)
      this.hover()
      return true
    }
    if (target.kind === 'waiter') {
      const id = this.waiter
      if (!id) return false
      this.bump = NOTHING
      this.carry = { kind: 'waiter', guest: id, dish: 'corn', x: q.x, y: q.y, index: this.state.order.length }
      this.sound(id, 7)
      this.hover()
      return true
    }
    if (target.kind === 'dish') {
      this.carry = { kind: 'dish', guest: this.state.dishes[target.id].at, dish: target.id, x: q.x, y: q.y, index: -1 }
      this.sound(this.state.dishes[target.id].full ? 'slosh' : 'ring')
      return true
    }
    return false
  }

  /** Stage units of finger for one whole gap: what the gap measures on the stage, within reach of an arm. */
  private get pull(): number {
    return clamp(this.gapWidth * this.cam.z, 120, 240)
  }

  move(p: Point): void {
    const q = toWorld(p, this.cam)
    this.finger = q
    if (this.held !== null) {
      const dx = p.x - this.grabX, dy = p.y - this.grabY
      const raw = this.grabExt + dx / this.pull
      // Tipping is nearly straight up or down and long; a pull that has gone along stays a pull.
      if (Math.abs(dx) > 40 && this.tiltTo === 0) this.along = true
      const steep = !this.along && Math.abs(dy) > 60 && Math.abs(dx) < Math.abs(dy) * 0.46
      this.tiltTo = steep ? clamp((dy - Math.sign(dy) * 60) / 80, -1, 1) : 0
      if (Math.abs(this.tiltTo) > 0.75 && this.tiltArmed) { this.tiltArmed = false; this.slideDishes(this.tiltTo > 0 ? 1 : -1) }
      if (Math.abs(this.tiltTo) < 0.35) this.tiltArmed = true
      const ready = this.waiter !== null && this.waiterT >= 1
      const most = ready ? 1.05 : 0.4
      this.held = raw >= 0 ? (raw <= most ? raw : most + (1 - Math.exp(-(raw - most) * 2)) * 0.1) : Math.max(-1, raw * 0.85)
      return
    }
    if (this.carry) {
      this.carry.x = q.x
      this.carry.y = q.y
      if (this.carry.kind !== 'dish') this.hover()
    } else if (this.swinging) this.bellV += (q.x - this.bellAt().x) * 0.0006
  }

  /** The finger let go of what it carried. */
  drop(): void {
    this.knobPress = 0
    this.tiltTo = 0
    this.tiltArmed = true
    if (this.held !== null) {
      this.held = null
      if (this.ext >= 0.5 && this.waiter) this.auto = 1
      else this.sound(this.ext > 0.08 ? 'wheezeIn' : 'wheezeOut', 0)
      this.finger = null
      return
    }
    const c = this.carry
    this.carry = null
    if (!c) { if (this.swinging && this.finger && Math.hypot(this.finger.x - this.bellAt().x, this.finger.y - this.bellAt().y) < 260 / this.cam.z) this.ring(); this.swinging = false; this.finger = null; return }
    const at = { x: this.finger?.x ?? c.x, y: this.finger?.y ?? c.y }
    this.finger = null
    if (c.kind === 'dish') this.dropDish(c.dish, at)
    else if (c.kind === 'waiter') {
      if (at.x < this.door().x + 40 || this.waiterT < 1) { this.carried = true; this.seat(c.guest, c.index, c.x, c.y + CAST[c.guest].tall * 0.7) }
      else { this.sound('bump'); this.kick(c.guest, -5); this.sync() }
    } else {
      const order = this.state.order.filter((g) => g !== c.guest)
      order.splice(c.index, 0, c.guest)
      const moved = order.some((g, i) => g !== this.state.order[i])
      this.state.order = order
      this.land(c.guest, c.x, c.y + CAST[c.guest].tall * 0.7)
      if (moved) this.dirty()
      const head = at.y < TOP - 150 && moved
      this.meet(c.guest, head ? 0.3 : 0.55)
    }
  }

  /** The finger was taken away: what it carried goes back, and nothing is done. */
  cancel(): void {
    this.knobPress = 0
    this.tiltTo = 0
    this.tiltArmed = true
    this.held = null
    this.swinging = false
    this.finger = null
    const c = this.carry
    this.carry = null
    if (!c) return
    if (c.kind === 'dish') this.slides.set(c.dish, { t: 0, x: c.x, y: c.y })
    else if (c.kind === 'guest') this.land(c.guest, c.x, c.y + CAST[c.guest].tall * 0.7)
    else this.sync()
  }

  // --- What happens ---------------------------------------------------------

  private kick(id: GuestId, speed: number): void {
    this.bodies[id].sv += speed
  }

  /** Where a carried guest would sit: the row makes room there. */
  private hover(): void {
    const c = this.carry!
    let x = 0, i = 0
    for (const g of this.state.order) {
      if (g === c.guest) continue
      const w = CAST[g].width * this.squeeze
      if (c.x < x + w / 2) break
      x += w
      i++
    }
    c.index = i
    this.sync()
  }

  /** Brings the row to the order: those who belong stay, the rest close up, and a carried guest's room is kept. */
  private sync(): void {
    const c = this.carry && this.carry.kind !== 'dish' ? this.carry : null
    const want: (GuestId | 'room')[] = this.state.order.filter((g) => g !== c?.guest)
    if (c && (c.kind === 'guest' || c.y > TOP - 420)) want.splice(c.index, 0, 'room')
    // Places that are kept in the same order; anything else closes where it stands.
    const kept = new Map<GuestId, Place>()
    let from = 0
    for (const g of want) {
      if (g === 'room') continue
      const i = this.row.findIndex((p, k) => k >= from && p.id === g)
      if (i >= 0) { kept.set(g, this.row[i]); from = i + 1 }
    }
    for (const p of this.row) if (!p.id || kept.get(p.id) !== p) { p.id = null; p.want = 0 }
    let at = 0
    for (const g of want) {
      if (g === 'room') {
        // A closing place that is here already opens again.
        const here = this.row[at]
        if (here && here.id === null) { here.want = CAST[c!.guest].width; at++ }
        else this.row.splice(at++, 0, { id: null, w: 0, want: CAST[c!.guest].width })
        continue
      }
      const p = kept.get(g)
      if (p) { at = this.row.indexOf(p) + 1; continue }
      const here = this.row[at]
      if (here && here.id === null) { here.id = g; here.want = CAST[g].width; at++ }
      else this.row.splice(at++, 0, { id: g, w: 0, want: CAST[g].width })
    }
  }

  private land(id: GuestId, x: number, y: number): void {
    const c = this.carry
    if (!c) {
      // The room that was kept becomes the place.
      const index = this.state.order.indexOf(id)
      let seen = 0
      for (const p of this.row) {
        if (p.id !== null) { seen++; continue }
        if (seen === index && p.want > 0) { p.id = id; p.want = CAST[id].width; break }
      }
    }
    this.sync()
    const at = this.place(id)
    if (!at) return
    const far = Math.hypot(at.x - x, TOP - y)
    this.bodies[id].fly = { t: 0, lasts: clamp(far / 900, 0.28, 0.6), x, y, high: 70 + far * 0.15, spin: id === 'baby' || id === 'bear' ? 1 : 0, home: false, delay: 0, landed: false }
  }

  private seat(id: GuestId, index: number, x: number, y: number): void {
    this.state.order.splice(index, 0, id)
    this.state.fed = false
    if (index === this.state.order.length - 1) this.row.push({ id, w: this.gap, want: CAST[id].width })
    this.ext = Math.min(0, this.ext)
    this.extV = 0
    this.land(id, x, y)
    const fly = this.bodies[id].fly
    if (fly) { fly.lasts = 0.5; fly.high = 150 }
    this.waiterT = -0.35
    this.bump = NOTHING
    this.sound(this.carried ? 'forced' : 'jump', GUESTS.indexOf(id) % 4)
    this.carried = false
    this.meet(id, 0.75)
    this.dirty(true)
    // The knob is taken up again where the finger is.
    if (this.intro !== null) this.held = null
    if (this.held !== null) { this.held = 0; this.grabExt = 0; this.grabX = this.lastX; this.grabY = this.lastY }
    this.aim(false)
  }
  private carried = false
  lastX = 0
  lastY = 0

  /** Two who newly sit side by side do what they do to each other, one after the other. */
  private meet(id: GuestId, delay: number): void {
    const i = this.state.order.indexOf(id)
    const left = this.state.order[i - 1], right = this.state.order[i + 1]
    if (left) this.doAct(left, delay, 1)
    if (right) this.doAct(id, left ? delay + 0.7 : delay, 1)
    else if (left) this.doAct(id, delay + 0.7, -1)
  }

  doAct(id: GuestId, delay = 0, way: 1 | -1 | 0 = 0): void {
    const order = this.state.order
    const i = order.indexOf(id)
    if (i < 0) return
    const dir: 1 | -1 = way !== 0 ? way : i < order.length - 1 ? 1 : -1
    const other = order[i + dir]
    const body = this.bodies[id]
    body.act = -delay
    body.dir = dir
    this.sound(id, 0, delay)
    if (!other) return
    const to = this.bodies[other]
    to.took = -delay - 0.35
    to.takes = id
    this.sound(`${other}Takes`, 0, delay + 0.4)
  }

  private ring(): void {
    this.bellV += 9
    this.sound('bell')
    if (this.feast) return
    if (this.auto === -1) this.auto = null
    const order = this.state.order
    const step = Math.min(0.45, 3.4 / order.length)
    const eats: Feast['eats'] = order.map((who, i) => {
      const own = dishAt(this.state, who)
      const full = own !== null && this.state.dishes[own].full
      // Nothing before it: one bite of what the neighbour has.
      const has = (g: GuestId | undefined): g is GuestId => { const d = g && dishAt(this.state, g); return !!d && this.state.dishes[d].full }
      const from = full ? who : [order[i + 1], order[i - 1]].find(has) ?? who
      const dish = full ? own : dishAt(this.state, from)
      const there = dish !== null && this.state.dishes[dish].full
      return { who, dish: there ? dish : null, from: there ? from : who, at: 0.9 + i * step, heard: false }
    })
    const any = eats.some((e) => e.dish)
    for (const e of eats) if (e.dish) this.state.ate[e.who] = e.dish
    for (const e of eats) if (e.dish && e.from === e.who) this.state.dishes[e.dish].full = false
    this.state.fed = any || this.state.fed
    if (this.waiter) this.sound('smack', 0, 1.2)
    this.feast = { t: 0, length: 0.9 + order.length * step + EAT_S + 1.6, eats, leaned: false }
    for (const id of order) this.kick(id, 2)
    this.dirty(true)
  }

  private shut(): void {
    if (this.state.fed) { this.goHome(); return }
    const order = this.state.order
    const id = order[Math.floor(order.length / 2)]
    const at = this.place(id)!
    this.sound('popUp', GUESTS.indexOf(id) % 4)
    this.bodies[id].fly = { t: 0, lasts: 0.95, x: at.x, y: TOP, high: 230, spin: 1, home: false, delay: 0, landed: false }
    for (const g of order) this.kick(g, 5)
  }

  private goHome(): void {
    let n = 0
    for (const id of [...this.state.order].reverse()) {
      if (HOME.includes(id)) continue
      const b = this.base(id)
      this.bodies[id].fly = { t: 0, lasts: 0.95, x: b.x, y: b.y, high: 330 + (n % 3) * 60, spin: n % 2 ? 1 : -1, home: true, delay: n * 0.14, landed: false }
      this.bodies[id].act = this.bodies[id].took = NOTHING
      this.leaving.push(id)
      this.sound(id, 5, n * 0.14)
      n++
    }
    this.state.order = this.state.order.filter((g) => HOME.includes(g))
    this.state.rounds = (this.state.rounds + 1) % 8
    this.state.dishes = freshDishes()
    this.state.ate = {}
    this.state.fed = false
    this.slides.clear()
    this.feast = null
    this.carry = null
    this.auto = null
    this.sync()
    this.waiterT = -(1 + n * 0.14) / WALK_S
    this.held = null
    this.sound('goHome')
    this.aim(false)
    this.dirty(true)
  }

  /** The table is tipped: every dish slides a place toward the low end, and the end one flies back. */
  private slideDishes(dir: 1 | -1): void {
    const order = this.state.order
    const was = order.map((g) => dishAt(this.state, g))
    for (const d of was) if (d) { const p = this.dishPos(d); this.slides.set(d, { t: 0, x: p.x, y: p.y }) }
    was.forEach((d, i) => { if (d) this.state.dishes[d].at = order[(i + dir + order.length) % order.length] })
    this.sound('scrape', dir)
    this.dirty()
  }

  private dropDish(dish: DishId, at: Point): void {
    if (!this.state.order.includes(this.state.dishes[dish].at)) return
    const d = this.state.dishes[dish]
    this.slides.set(dish, { t: 0, x: at.x, y: at.y })
    let to: GuestId | null = null
    for (const id of this.state.order) {
      const p = this.place(id)!
      if (Math.abs(at.x - p.x) <= p.w / 2) to = id
    }
    if (!to || at.y > 0) { this.sound('plate', -4); return }
    const on = at.y < TOP - CAST[to].tall * 0.75 ? 'head' : 'table'
    if (to === d.at && on === d.on) { this.sound('plate', 0); return }
    const other = dishAt(this.state, to, on)
    if (other) {
      const p = this.dishPos(other)
      this.slides.set(other, { t: 0, x: p.x, y: p.y })
      Object.assign(this.state.dishes[other], { at: d.at, on: d.on })
    }
    d.at = to
    d.on = on
    this.sound(on === 'head' ? (d.full ? 'flop' : 'tonk') : d.full ? 'clink' : 'clack')
    this.kick(to, on === 'head' ? -7 : -2)
    this.dirty()
  }

  /** A touch ends whatever plays by itself, with everything as it was going to be. */
  endShows(): void {
    if (this.intro !== null) this.endIntro()
    this.feast = null
  }

  private endIntro(): void {
    const id = this.waiter
    this.intro = null
    this.held = null
    if (id && this.state.order.length === HOME.length) {
      const d = this.door()
      this.waiterT = 1
      this.seat(id, this.state.order.length, d.x, TOP)
    }
  }

  /** What is written: the first showing is saved with its end. */
  saved(): GameState {
    if (this.intro === null || !this.waiter || this.state.order.length > HOME.length) return this.state
    return { ...this.state, order: [...this.state.order, this.waiter] }
  }

  /** The hand of the first showing: 0 to 1 of its way, and how well it is seen. */
  introHand(): { press: number; show: number } | null {
    if (this.intro === null) return null
    const t = this.intro
    return { press: t > INTRO.hand * 0.7 && t < INTRO.hand + INTRO.pull ? 1 : 0, show: clamp(t * 2.5, 0, 1) * clamp((INTRO.hand + INTRO.pull + 0.5 - t) * 3, 0, 1) }
  }

  private aim(now: boolean): void {
    let rest = 0
    for (const id of this.state.order) rest += CAST[id].width
    cameraFor(rest, this.gapWidth, this.camTo)
    if (now) { this.cam.z = this.camTo.z; this.cam.x = this.camTo.x }
  }

  /** Put away: nothing is in the air and nothing plays. */
  settle(): void {
    this.cancel()
    this.endShows()
    // What was already begun is done.
    if (this.auto === 1 && this.waiter) this.seat(this.waiter, this.state.order.length, this.length, TOP)
    else if (this.auto === -1 && this.state.fed) this.goHome()
    this.auto = null
    this.ext = this.extV = this.tilt = 0
    for (const id of GUESTS) Object.assign(this.bodies[id], { act: NOTHING, took: NOTHING, fly: null, sq: 1, sv: 0, hiccup: NOTHING })
    this.leaving.length = 0
    this.slides.clear()
    this.waiterT = 1
    this.bump = NOTHING
    this.sounds.length = 0
    this.row.length = 0
    for (const id of this.state.order) this.row.push({ id, w: CAST[id].width, want: CAST[id].width })
    this.aim(true)
  }

  get busy(): boolean {
    return this.intro !== null || this.feast !== null || this.auto !== null || this.leaving.length > 0 || (this.waiter !== null && this.waiterT < 1)
  }

  // --- Time -----------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    const ease = (k: number) => 1 - Math.exp(-k * dt)
    this.cam.z += (this.camTo.z - this.cam.z) * ease(5)
    this.cam.x += (this.camTo.x - this.cam.x) * ease(5)
    if (this.waiter && this.waiterT < 1) {
      const was = this.waiterT
      this.waiterT = Math.min(1, this.waiterT + dt / WALK_S)
      if (was < 0 && this.waiterT >= 0) this.sound('steps', GUESTS.indexOf(this.waiter) % 4)
    }
    if (this.intro !== null) {
      this.intro += dt
      const t = this.intro - INTRO.hand
      if (this.state.order.length === HOME.length && t > 0) {
        const u = clamp(t / INTRO.pull, 0, 1)
        this.held = u * u * (3 - 2 * u)
      }
      if (this.intro > INTRO.hand + INTRO.pull + INTRO.rest) { this.intro = null; this.held = null }
    }
    this.pullStep(dt)
    for (const p of this.row) p.w += (p.want - p.w) * ease(9)
    for (let i = this.row.length - 1; i >= 0; i--) if (this.row[i].id === null && this.row[i].want === 0 && this.row[i].w < 0.5) this.row.splice(i, 1)
    this.tilt += (this.tiltTo - this.tilt) * ease(10)
    this.bellV += -this.bell * 90 * dt
    this.bellV *= Math.exp(-2.2 * dt)
    this.bell = clamp(this.bell + this.bellV * dt, -0.9, 0.9)
    if (this.bump > NOTHING) { const was = this.bump; this.bump += dt; if (was <= 0.2 && this.bump > 0.2) this.extV += 3.4; if (this.bump > 0.8) this.bump = NOTHING }
    for (const id of GUESTS) this.bodyStep(this.bodies[id], dt)
    for (const [d, s] of this.slides) { s.t += dt; if (s.t > 0.5) this.slides.delete(d) }
    for (const [d, t] of this.jiggle) { if (t > 1) this.jiggle.delete(d); else this.jiggle.set(d, t + dt) }
    for (const [k, t] of this.wag) { if (t > 1.6) this.wag.delete(k); else this.wag.set(k, t + dt) }
    for (const m of this.marks) m.t += dt
    while (this.marks.length > 0 && this.marks[0].t > 2.4) this.marks.shift()
    this.feastStep(dt)
  }

  private pullStep(dt: number): void {
    const was = this.ext
    if (this.auto !== null) {
      this.held = null
      const none = this.auto === 1 && !this.waiter
      if (this.auto === 1 && this.waiter && this.waiterT < 1) { /* the gap waits for the next to come to the door */ this.ext = Math.min(0.4, this.ext + dt * 1.6) }
      else this.ext += this.auto * dt * (this.auto > 0 ? 1.9 : 1.6)
      if (none && this.ext > 0.35) this.auto = null
      if (this.ext <= -1) { this.ext = -1; if (!this.shutDone) { this.shutDone = true; this.auto = null; this.shut() } }
      this.extV = 0
    } else if (this.held !== null) {
      this.ext += (this.held - this.ext) * (1 - Math.exp(-28 * dt))
      this.extV = 0
      if (this.ext < -0.82 && !this.shutDone) { this.shutDone = true; this.shut() }
      if (this.ext > -0.5) this.shutDone = false
    } else {
      // Let go: it breathes back. Idle, whoever wants something gives it a nudge.
      this.nudge += dt
      if (this.asking && this.idle > 1.2 && this.nudge > 3.4) {
        this.nudge = 0
        if (this.waiter && this.waiterT >= 1) this.extV += 2.6
        else if (this.state.fed) this.extV -= 2.4
        else this.bellV += 5
      }
      this.extV += (-this.ext * 60 - this.extV * 7) * dt
      this.ext = clamp(this.ext + this.extV * dt, -1, 0.9)
      if (Math.abs(this.ext) < 0.002 && Math.abs(this.extV) < 0.02) this.ext = this.extV = 0
    }
    this.reed += Math.abs(this.ext - was)
    if (this.reed > 0.14) {
      this.reed = 0
      this.sound(this.ext > was ? 'reedOut' : 'reedIn', Math.round(this.ext * 7) + this.state.order.length)
    }
    const id = this.waiter
    if (id && this.ext >= COMMIT && this.waiterT >= 1) {
      this.auto = null
      const d = this.door()
      this.seat(id, this.state.order.length, d.x, TOP)
    }
  }

  private bodyStep(b: Body, dt: number): void {
    const n = Math.ceil(dt * 60), h = dt / n
    for (let i = 0; i < n; i++) { b.sv += ((1 - b.sq) * 260 - b.sv * 11) * h; b.sq = clamp(b.sq + b.sv * h, 0.6, 1.45) }
    if (b.act > NOTHING) { b.act += dt; if (b.act > ACT_S) b.act = NOTHING }
    if (b.took > NOTHING) { b.took += dt; if (b.took > ACT_S) { b.took = NOTHING; b.takes = null } }
    if (b.hiccup > NOTHING) { b.hiccup += dt; if (b.hiccup > 0.5) b.hiccup = NOTHING }
    const f = b.fly
    if (!f) return
    f.t += dt
    if (f.t < f.delay + f.lasts) return
    b.fly = null
    if (f.home) { const i = this.leaving.indexOf(b.id); if (i >= 0) this.leaving.splice(i, 1); return }
    // Down with a plop of its size, and a wave along the row.
    b.sv -= 5
    const order = this.state.order, at = order.indexOf(b.id)
    order.forEach((g, i) => { if (i !== at) this.bodies[g].sv += 4.5 / (1 + Math.abs(i - at) * 0.5) })
    this.sound('plop', Math.round((CAST[b.id].width / 120 - 1) * -8))
    for (const g of order) { const d = dishAt(this.state, g); if (d) this.jiggle.set(d, 0) }
  }

  private feastStep(dt: number): void {
    const f = this.feast
    if (!f) return
    f.t += dt
    for (const e of f.eats) {
      if (e.heard || f.t < e.at) continue
      e.heard = true
      if (!e.dish) { this.sound('spoon'); continue }
      this.sound(`${e.dish}Eaten`, taste(e.who, e.dish) === 'hates' ? -4 : taste(e.who, e.dish) === 'likes' ? 3 : 0)
    }
    if (!f.leaned && f.t > f.length - 1.4) {
      f.leaned = true
      this.sound('sigh')
      f.eats.forEach((e, i) => { if (i % 3 === 1) { this.bodies[e.who].hiccup = -0.2 * i; this.sound('hiccup', i, 0.3 + 0.16 * i) } })
    }
    if (f.t >= f.length) this.feast = null
  }

  /** Where the idle hand goes: the one move that helps now. */
  toShow(): { kind: 'drag' | 'tap'; x: number; y: number; dx: number } {
    const k = toStagePoint(this.knobAt(), this.cam)
    if (this.waiter) return { kind: 'drag', x: k.x, y: k.y, dx: this.pull }
    if (this.state.fed) return { kind: 'drag', x: k.x, y: k.y, dx: -230 }
    const b = toStagePoint(this.bellAt(), this.cam)
    return { kind: 'tap', x: b.x, y: b.y, dx: 0 }
  }
}
