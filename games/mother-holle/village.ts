import { BEARS, BOTTOM, EDGE, FEATHER, FEATHERS, HAY, HOME_LANE, IDS, MOST_HIGH, POND, QUILT, SIZE, SLEDS, SLOTS, SUN, TOP, WAITS, ground, isSled, seen, type Id, type SledId } from './layout'
import type { GameState } from './save'
import { Snow } from './snow'

// The village: the quilt, the feathers in the air, the snow and the six who
// live there. It knows no browser and draws nothing. It advances in fixed
// steps, and chance is in the feathers only (where each leaves the quilt).

export const STEP = 1 / 60
const PULL = 13
/** A sled starts where this much of its runners is on snow. */
const STARTS = 0.6
/** With less than this under it, it digs in. */
const DIGS = 0.45
const BRAKE = 30
const RUNS_DOWN = 0.3
/** A head this full is blown clear. */
export const HEADFUL = 0.36
/** How long the hand is seen at the first shake. */
export const SHOWING_S = 1.8
/** Right of this is the dip before the jump: from there it takes a shove to get over. */
const DIP = 1.5
const SHOVE = 5.2
const SHOWING_AT = 1.4
const SNEEZE_S = 0.75
export const RISE_PER_S = FEATHERS / 3.2

export type Mode = 'rest' | 'slide' | 'air' | 'hop' | 'ride' | 'held'
export type React = 'sneeze' | 'stop' | 'land' | 'splash' | 'meet' | 'poke' | 'fly' | 'lay' | 'knock' | 'home' | 'go'
export type Hop = { x0: number; y0: number; z0: number; x1: number; z1: number; t: number; s: number; high: number; hops: number; out: boolean }

export type Body = {
  id: Id
  x: number
  y: number
  z: number
  v: number
  vy: number
  face: 1 | -1
  mode: Mode
  on: Id | null
  out: boolean
  /** Snow on the head. */
  cap: number
  egg: boolean
  hop: Hop | null
  /** Getting up onto somebody: where from, and how far along. */
  mount: { x: number; y: number; z: number; t: number } | null
  tilt: number
  react: { name: React; t: number } | null
  sneeze: number
  /** Seconds it has been sliding or flying, for who turns and who flaps. */
  ran: number
  floats: boolean
  back: { x: number; z: number; on: Id | null; out: boolean; mode: Mode } | null
}

export type Feather = { x: number; y: number; z: number; age: number; seed: number; speed: number; amount: number; head: boolean }
export type Happened = { type: 'grab' | 'shake' | 'puff' | 'flat' | 'pat' | 'fat' | 'land' | 'call' | 'night' | 'morning' | 'hay' | 'spill' | React; id?: Id; power?: number; x?: number }
/** What a finger is on. */
export type Target = { kind: 'body'; id: Id } | { kind: 'sun' } | { kind: 'quilt' }

export class Village {
  readonly snow = new Snow()
  readonly bodies: Record<Id, Body>
  readonly feathers: Feather[] = []
  readonly quilt = { x: QUILT.start, to: QUILT.start, left: FEATHERS, hem: QUILT.hem, hemTo: QUILT.hem, energy: 0, due: 0, grabbed: false, vx: 0, empty: false, rising: 0, pats: 0 }
  night = false
  /** Who has yet to ride this evening, and the seconds till the next goes. */
  private evening: { left: Id[]; wait: number } | null = null
  readonly events: Happened[] = []
  changed: 'no' | 'soon' | 'now' = 'no'
  /** Whether a short lift is being forgiven. */
  waiting = false
  held: Id | null = null
  private hand = { x: 0, y: 0 }
  private travel = 0
  private rest = 0
  private count = 0
  time = 0

  constructor(state: GameState, private readonly rng: () => number) {
    this.bodies = {} as Record<Id, Body>
    for (const id of IDS) {
      const s = state.bodies[id]
      this.bodies[id] = { id, x: s.x, y: 0, z: s.out || !isSled(id) ? 0 : WAITS[id].z, v: 0, vy: 0, face: s.face, mode: s.on ? 'ride' : 'rest', on: s.on, out: s.out, cap: s.cap, egg: s.egg, hop: null, mount: null, tilt: 0, react: null, sneeze: 0, ran: 0, floats: false, back: null }
    }
    state.snow.forEach((d, i) => { this.snow.depth[i] = d })
    this.night = state.night
    // What the quilt holds is whatever is not lying about, so nothing is ever lost or made.
    this.shown = state.shown
    this.quilt.left = Math.max(0, FEATHERS - this.snow.total - this.capped())
    this.quilt.empty = state.empty && this.quilt.left < FEATHERS - 1e-6
    this.quilt.x = this.quilt.to = state.quilt
    this.settleAll()
  }

  // --- Reading the village ---------------------------------------------------

  get list(): Body[] {
    return IDS.map((id) => this.bodies[id])
  }

  private capped(): number {
    return this.list.reduce((sum, b) => sum + b.cap, 0)
  }

  /** All the feathers there are, wherever they are. A test holds this still. */
  get all(): number {
    return this.quilt.left + this.snow.total + this.capped() + this.feathers.reduce((sum, f) => sum + f.amount, 0)
  }

  base(b: Body): Body {
    let at = b
    while (at.on) at = this.bodies[at.on]
    return at
  }

  above(id: Id): Body | null {
    return this.list.find((b) => b.on === id) ?? null
  }

  top(id: Id): Body {
    let at = this.bodies[id]
    for (let next = this.above(at.id); next; next = this.above(at.id)) at = next
    return at
  }

  high(id: Id): number {
    let n = 1
    for (let next = this.above(id); next; next = this.above(next.id)) n++
    return n
  }

  /** Those standing on the hill itself, in the lane the sleds run in. */
  private grounded(b: Body): boolean {
    return b.on === null && b.mode !== 'hop' && b.mode !== 'held' && Math.abs(b.z) < 0.5
  }

  /** The sled that could go if there were snow: the front one at the top. */
  get asker(): Body | null {
    let best: Body | null = null
    for (const id of SLEDS) {
      const b = this.bodies[id]
      if (b.out && b.on === null && b.mode === 'rest' && b.x < BOTTOM && Math.abs(b.z) < 0.5 && (!best || b.x > best.x)) best = b
    }
    return best
  }

  /** Whoever waits to be called, in their order. */
  get nextUp(): Body | null {
    for (const id of SLEDS) if (!this.bodies[id].out && !this.bodies[id].hop) return this.bodies[id]
    return null
  }

  get busy(): boolean {
    return this.feathers.length > 0 || this.quilt.rising > 0 || this.evening !== null || this.list.some((b) => b.mode === 'slide' || b.mode === 'air' || b.mode === 'hop' || b.mount !== null)
  }

  /** Where the snow in front of a place runs out. */
  snowEnds(from: number): number {
    let x = from
    while (x < HAY && this.snow.at(x) > 0.09) x += 0.2
    return x
  }

  at(p: { x: number; y: number }): Target {
    // Whoever is in front, and of those the topmost, is who the finger is on. Small ones reach a little further than they look.
    let best: Body | null = null, bestScore = Infinity
    for (const b of this.list) {
      const s = SIZE[b.id], half = Math.max(1.15, s.half + 0.15), tall = Math.max(1.8, s.tall)
      const s0 = seen(b.x, b.y, b.z)
      if (Math.abs(p.x - s0.x) > half || p.y < s0.y - 0.35 || p.y > s0.y + tall + 0.15) continue
      const score = Math.abs(p.x - s0.x) / half + Math.abs(p.y - s0.y - tall / 2) / tall - b.z * 0.2
      if (score < bestScore) { best = b; bestScore = score }
    }
    if (best) return { kind: 'body', id: best.id }
    // The quilt may hang before the sun.
    const q = this.quilt
    if (Math.abs(p.x - q.x) < 3.2 && p.y > q.hem - 0.3 && p.y < q.hem + 3.2) return { kind: 'quilt' }
    if (Math.hypot(p.x - SUN.x, p.y - SUN.y) < SUN.r + 0.25) return { kind: 'sun' }
    return { kind: 'quilt' }
  }

  // --- The finger ------------------------------------------------------------

  private say(type: Happened['type'], more: Omit<Happened, 'type'> = {}): void {
    this.events.push({ type, ...more })
  }

  private change(now = false): void {
    if (now || this.changed === 'no') this.changed = now ? 'now' : 'soon'
  }

  private react(b: Body, name: React, power = 1): void {
    b.react = { name, t: 0 }
    this.say(name, { id: b.id, power, x: b.x })
  }

  /** A finger lands: the answer starts here. */
  press(target: Target, p: { x: number; y: number }): void {
    this.untouched = false
    this.shown = true
    if (target.kind === 'body') { this.poke(target.id); return }
    if (target.kind === 'sun') { this.toggleNight(); return }
    this.grab(p)
  }

  grab(p: { x: number; y: number }): void {
    if (this.night) this.morning()
    const q = this.quilt
    q.grabbed = true
    q.to = clampQuilt(p.x)
    this.hand = { ...p }
    this.travel = 0
    this.say('grab')
    if (q.empty) { this.pat(); return }
    this.shake(12)
    this.callNext()
    this.change()
  }

  /** The finger goes on: the quilt with it, and feathers for every bit of the way. */
  drag(p: { x: number; y: number }): void {
    const q = this.quilt
    if (!q.grabbed) return
    const d = Math.hypot(p.x - this.hand.x, p.y - this.hand.y)
    this.hand = { ...p }
    q.to = clampQuilt(p.x)
    this.travel += d
    if (q.empty) {
      while (this.travel > 2.6) { this.travel -= 2.6; this.pat() }
      return
    }
    while (this.travel > 0.55) { this.travel -= 0.55; this.shake(1, true) }
  }

  letGoQuilt(): void {
    this.quilt.grabbed = false
    this.change()
  }

  private shake(n: number, trailing = false): void {
    const q = this.quilt
    q.energy = Math.min(1, q.energy + (trailing ? 0.12 : 0.75))
    q.due = Math.min(q.due + n, 22)
    if (!trailing) this.say('shake', { power: Math.min(1, n / 12) })
    else if (++this.count % 5 === 0) this.say('puff', { power: q.energy })
  }

  /** A second finger: a small shake, or a ruffle of the empty quilt. */
  nudge(): void {
    if (this.night) return
    if (this.quilt.empty) { this.quilt.energy = Math.min(1, this.quilt.energy + 0.4); this.say('grab'); return }
    this.shake(3)
  }

  private pat(): void {
    const q = this.quilt
    q.energy = 1
    q.pats++
    q.rising = Math.min(FEATHERS, q.rising + FEATHERS / 4 + 0.01)
    this.say('pat', { power: q.left / FEATHERS })
    this.change(true)
  }

  /** The next one steps up to the start, once nobody with a sled is at the top. */
  private callNext(): void {
    if (this.quilt.empty) return
    if (SLEDS.some((id) => { const b = this.bodies[id]; return b.out && (b.mode === 'hop' || b.mode === 'held' || (this.base(b).x < DIP)) })) return
    const next = this.nextUp
    if (!next) {
      // Nobody waits: whoever is down and first in the order goes up again.
      const down = SLEDS.map((id) => this.bodies[id]).find((b) => b.mode === 'rest' && b.on === null)
      if (down) { this.home(down); this.change(true) }
      return
    }
    next.out = true
    this.hopTo(next, this.freeSlot(next), 0, 2)
    this.say('call', { id: next.id })
    this.change(true)
  }

  poke(id: Id): void {
    const b = this.bodies[id]
    this.react(b, 'poke')
    // Whatever was on the head jumps with it.
    for (let up = this.above(id); up; up = this.above(up.id)) up.react = { name: 'meet', t: 0 }
  }

  /** A tap, lifted: whoever is down the hill goes home, whoever waits comes out, whoever stands on snow is off. */
  tap(target: Target): void {
    if (target.kind !== 'body') return
    const b = this.bodies[target.id]
    if (b.hop || b.mount || b.mode === 'held') return
    if (this.evening) this.evening.left = this.evening.left.filter((id) => id !== b.id)
    if (b.on) { this.alight(b); return }
    if (b.mode === 'slide' || b.mode === 'air') return
    if (isSled(b.id)) {
      if (!b.out) { b.out = true; this.hopTo(b, this.freeSlot(b), 0, 2); this.say('call', { id: b.id }) }
      else if (b.x < BOTTOM && this.canStart(b)) { b.v = b.x > DIP ? SHOVE : 2.2; b.mode = 'slide'; b.face = 1; this.react(b, 'go') }
      else if (b.x > TOP) this.home(b)
    } else if (Math.abs(b.x - WAITS[b.id].x) > 1.2) this.home(b)
    this.change(true)
  }

  /** Off whoever it sits on, down onto the hill in front. */
  private alight(b: Body): void {
    const from = this.base(b)
    b.on = null
    this.hopTo(b, this.clearX(from.x + from.face * (SIZE[from.id].half + SIZE[b.id].half + 0.5), b, from), 0, 1)
  }

  private home(b: Body): void {
    // Whoever sat on this one drops into its place.
    const up = this.above(b.id)
    if (up) { up.on = null; up.mode = 'air'; up.mount = null; up.vy = 0; up.v = 0; up.z = 0 }
    b.egg = false
    this.react(b, 'home')
    if (isSled(b.id)) {
      const slot = this.freeSlot(b)
      if (slot === null) { b.out = false; this.hopTo(b, WAITS[b.id].x, WAITS[b.id].z, 0); return }
      this.hopTo(b, slot, 0, 0)
    } else this.hopTo(b, this.clearX(WAITS[b.id].x, b), 0, 0)
  }

  private taken(x: number, b: Body, also?: Body, room = 0.12): boolean {
    return this.list.some((o) => {
      if (o === b || o.on !== null || o.mode === 'held') return false
      const ox = o.hop ? o.hop.x1 : o.x, oz = o.hop ? o.hop.z1 : o.z
      return Math.abs(oz) < 0.5 && Math.abs(ox - x) < SIZE[o.id].half + SIZE[b.id].half + room - 1e-6
    }) || (also !== undefined && Math.abs(also.x - x) < SIZE[also.id].half + SIZE[b.id].half)
  }

  private freeSlot(b: Body): number {
    for (const x of SLOTS) if (!this.taken(x, b)) return x
    return this.clearX(SLOTS[SLOTS.length - 1], b)
  }

  /** The nearest place along the hill where it stands clear of everybody. */
  private clearX(x: number, b: Body, also?: Body): number {
    const lo = EDGE.left, hi = EDGE.right - SIZE[b.id].half
    const want = Math.min(hi, Math.max(lo, x))
    for (let d = 0; d < 26; d += 0.2) {
      for (const at of [want + d, want - d]) if (at >= lo && at <= hi && !this.taken(at, b, also)) return at
    }
    return want
  }

  private hopTo(b: Body, x1: number, z1: number, high: number): void {
    const d = Math.hypot(x1 - b.x, z1 - b.z)
    b.hop = { x0: b.x, y0: b.y, z0: b.z, x1, z1, t: 0, s: Math.min(3, 0.5 + d / 6.5), high: high || 1, hops: high ? Math.max(1, Math.round(d / 3)) : Math.max(1, Math.round(d / 2.1)), out: Math.abs(x1 - b.x) > 4 }
    b.mode = 'hop'
    b.mount = null
    b.v = b.vy = 0
    b.on = null
  }

  /** Into the hand, with whoever sits on it. Returns whether there was anybody to take. */
  lift(id: Id, p: { x: number; y: number }): boolean {
    const b = this.bodies[id]
    if (b.hop || b.mount) return false
    b.back = { x: b.x, z: b.z, on: b.on, out: b.out, mode: b.mode }
    b.on = null
    b.mode = 'held'
    b.out = b.out || isSled(id)
    b.v = b.vy = 0
    this.held = id
    this.hand = { ...p }
    if (this.evening) this.evening.left = this.evening.left.filter((o) => o !== id)
    this.say('home', { id })
    return true
  }

  carry(p: { x: number; y: number }): void {
    this.hand = { ...p }
  }

  drop(): void {
    const b = this.held ? this.bodies[this.held] : null
    this.held = null
    if (!b) return
    b.back = null
    b.mode = 'air'
    b.z = 0
    b.v = 0
    b.vy = 0
    this.change(true)
  }

  /** The finger was taken away: what it carried goes back. */
  cancel(): void {
    this.quilt.grabbed = false
    const b = this.held ? this.bodies[this.held] : null
    this.held = null
    if (!b || !b.back) return
    const back = b.back
    b.back = null
    b.x = back.x
    b.z = back.z
    b.out = back.out
    const under = back.on ? this.bodies[back.on] : null
    // Back onto the same head, if that is still free.
    if (under && under.mode !== 'hop' && !this.above(under.id) && this.base(under) !== b) { b.on = under.id; b.mode = 'ride' }
    else { b.on = null; b.mode = 'rest'; if (under) b.x = this.clearX(b.x, b); this.seat(b) }
  }

  // --- Evening ---------------------------------------------------------------

  private toggleNight(): void {
    if (this.night) { this.morning(); return }
    this.night = true
    this.quilt.grabbed = false
    this.quilt.due = 0
    const riders = SLEDS.filter((id) => this.bodies[id].out)
    for (const id of [...riders].reverse()) {
      const b = this.bodies[id]
      if (b.mode === 'held') continue
      if (b.on) { b.on = null }
      if (b.x > TOP || b.mode === 'air' || b.mode === 'slide') this.home(b)
      else if (b.mode === 'ride') { b.mode = 'air'; b.vy = 0 }
    }
    this.evening = { left: [...riders], wait: 0.6 }
    this.say('night')
    this.change(true)
  }

  private morning(): void {
    this.night = false
    this.evening = null
    this.say('morning')
    this.change(true)
  }

  private evenings(dt: number): void {
    const e = this.evening
    if (!e) return
    if (this.list.some((b) => b.mode === 'hop')) return
    e.wait -= dt
    if (e.wait > 0) return
    // The front one of those still to ride goes first.
    const next = e.left.map((id) => this.bodies[id]).filter((b) => b.mode === 'rest' && b.on === null).sort((a, b) => b.x - a.x)[0]
    if (!next) { if (!e.left.length || !this.list.some((b) => b.mode === 'slide' || b.mode === 'air')) this.evening = null; return }
    e.left = e.left.filter((id) => id !== next.id)
    e.wait = 1.7
    if (this.canStart(next)) { next.v = 1.8; next.mode = 'slide'; next.face = 1 }
    this.react(next, 'go')
  }

  // --- Time ------------------------------------------------------------------

  step(dt: number): void {
    this.rest = Math.min(this.rest + dt, 0.2)
    while (this.rest >= STEP) { this.rest -= STEP; this.tick(STEP) }
  }

  private tick(dt: number): void {
    this.time += dt
    this.showing()
    this.quiltTick(dt)
    this.featherTick(dt)
    this.snow.settle()
    for (const b of this.list) this.bodyTick(b, dt)
    this.contacts()
    for (const b of this.list) if (b.on === null) this.carryUp(b)
    this.evenings(dt)
  }

  private quiltTick(dt: number): void {
    const q = this.quilt
    const x = q.x
    q.x += (q.to - q.x) * (1 - Math.exp(-dt * 9))
    q.vx = (q.x - x) / dt
    // Held clear of whoever is under it, however many sit on one another.
    let hem = QUILT.hem
    for (const b of this.list) if (Math.abs(b.x - q.x) < SIZE[b.id].half + 2.7) hem = Math.max(hem, b.y + SIZE[b.id].tall + 0.5)
    q.hemTo = Math.min(5.2, hem)
    q.hem += (q.hemTo - q.hem) * (1 - Math.exp(-dt * 10))
    q.energy *= Math.exp(-dt * 1.9)
    // A shake lets its feathers go over a moment, so a moving quilt leaves a line and not a heap.
    let release = q.due > 0 ? Math.min(q.due, Math.max(dt * 34, q.due * dt * 2.4)) : 0
    q.due -= release
    release += this.owed
    while (release >= 1) {
      release -= 1
      if (q.left < FEATHER * 0.5) { q.due = 0; continue }
      const amount = Math.min(FEATHER, q.left)
      q.left -= amount
      const r = (this.rng() + this.rng()) / 2
      this.feathers.push({ x: Math.min(13.5, Math.max(-13.5, q.x + (r * 2 - 1) * QUILT.half * 1.25)), y: q.hem + this.rng() * 1.4, z: (this.rng() * 2 - 1) * 0.9, age: -this.rng() * 0.1, seed: this.rng(), speed: 4.6 + this.rng() * 1.2, amount, head: this.count++ % 3 === 0 })
    }
    this.owed = release
    if (!q.empty && q.left < FEATHER * 0.5 && q.rising <= 0) {
      q.empty = true
      q.due = 0
      this.say('flat')
      this.change(true)
    }
    if (q.rising > 0) {
      const want = Math.min(q.rising, RISE_PER_S * dt)
      q.rising -= want
      let got = this.snow.take(want)
      for (const b of this.list) { const c = Math.min(b.cap, want - got); if (c > 0) { b.cap -= c; got += c } }
      q.left = Math.min(FEATHERS, q.left + got)
      if (q.rising < 1e-6) q.rising = 0
      if (this.snow.total < 1e-6 && this.capped() < 1e-6 && this.feathers.length === 0) { q.rising = 0; q.left = FEATHERS }
    }
    if (q.empty && q.rising === 0 && q.left > FEATHERS - FEATHER) this.fat()
  }
  private owed = 0
  shown: boolean
  private untouched = true
  /** Seconds for which the hand is seen to do the first shake. */
  showingLeft = 0
  /** And for which the tub may slip on what it shook. */
  private slipping = 0

  /** One shake before anyone has touched: feathers, snow, and a slip of the tub. */
  private showing(): void {
    this.slipping = Math.max(0, this.slipping - STEP)
    this.showingLeft = this.untouched ? Math.max(0, this.showingLeft - STEP) : 0
    if (this.shown || !this.untouched || this.time < SHOWING_AT) return
    this.shown = true
    this.showingLeft = SHOWING_S
    this.slipping = 4
    this.quilt.energy = 0.9
    this.quilt.due = 9
    this.say('shake', { power: 0.5 })
    this.change(true)
  }

  /** The quilt is fat again and the hill green: the next round stands ready. */
  private fat(): void {
    const q = this.quilt
    q.empty = false
    q.left = FEATHERS - this.snow.total - this.capped() - this.feathers.reduce((s, f) => s + f.amount, 0)
    this.say('fat')
    // From the top of every heap down, so each has a clear way out.
    const first = !SLEDS.some((id) => { const b = this.bodies[id]; return b.out && this.base(b).x < BOTTOM })
    const lead = first ? SLEDS.map((id) => this.bodies[id]).find((b) => b.out) : undefined
    for (const b of [...this.list].sort((a, c) => c.y - a.y)) {
      if (b.mode === 'held' || (b.mode === 'hop' && b.hop) || (isSled(b.id) && this.base(b).x < BOTTOM)) continue
      const w = b === lead ? { x: SLOTS[0], z: 0 } : WAITS[b.id]
      b.egg = false
      b.on = null
      b.mount = null
      b.face = 1
      if (isSled(b.id)) b.out = b === lead
      if (Math.hypot(b.x - w.x, b.z - w.z) < 0.4) { b.mode = 'rest'; b.x = w.x; b.z = w.z; b.v = b.vy = 0 }
      else { this.hopTo(b, w.x, w.z, 0); this.say('home', { id: b.id }) }
    }
    this.change(true)
  }

  private featherTick(dt: number): void {
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const f = this.feathers[i]
      f.age += dt
      f.y -= f.speed * dt * Math.min(1, 0.25 + Math.max(0, f.age) * 2)
      const body = f.head ? this.headUnder(f.x, f.y) : null
      if (body) { body.cap += f.amount; this.feathers.splice(i, 1); continue }
      if (f.y > this.snow.top(f.x)) continue
      this.snow.add(f.x, f.amount)
      this.feathers.splice(i, 1)
      this.change()
      if (++this.count % 6 === 0) this.say('land', { x: f.x })
    }
  }

  private headUnder(x: number, y: number): Body | null {
    for (const b of this.list) {
      if (b.mode === 'held' || b.mode === 'hop' || this.above(b.id) || Math.abs(b.z) > 0.5) continue
      if (Math.abs(b.x - x) < SIZE[b.id].half * 0.75 && y < b.y + SIZE[b.id].tall && y > b.y) return b
    }
    return null
  }

  private bodyTick(b: Body, dt: number): void {
    if (b.react) { b.react.t += dt; if (b.react.t > 3) b.react = null }
    if (b.mount) { b.mount.t += dt / 0.42; if (b.mount.t >= 1) b.mount = null }
    if (b.cap >= HEADFUL && b.sneeze === 0) { b.sneeze = 1e-6; this.react(b, 'sneeze') }
    if (b.sneeze > 0) {
      b.sneeze += dt
      if (b.sneeze > SNEEZE_S) {
        const half = b.cap / 2, off = SIZE[b.id].half + 0.5
        this.snow.add(b.x - off, half)
        this.snow.add(b.x + off, half)
        b.cap = 0
        b.sneeze = 0
        this.change()
      }
    }
    if (b.mode === 'held') {
      // It follows the hand, hung by its middle, and never under the hill.
      const t = 1 - Math.exp(-dt * 22), tall = SIZE[b.id].tall
      const x = Math.min(EDGE.right - SIZE[b.id].half, Math.max(EDGE.left, this.hand.x))
      b.x += (x - b.x) * t
      b.y += (Math.min(6.5, Math.max(this.surface(b) + 0.25, this.hand.y - tall / 2)) - b.y) * t
      b.z += (0 - b.z) * t
      b.tilt += (Math.max(-0.4, Math.min(0.4, (x - b.x) * 0.4)) - b.tilt) * t
      b.floats = false
      return
    }
    if (b.mode === 'hop' && b.hop) { this.hopTick(b, b.hop, dt); return }
    if (b.mode === 'ride') return
    if (b.mode === 'air') this.airTick(b, dt)
    else this.slideTick(b, dt)
  }

  private hopTick(b: Body, h: Hop, dt: number): void {
    h.t = Math.min(1, h.t + dt / h.s)
    const t = h.t
    b.face = h.x1 < h.x0 ? -1 : 1
    b.x = h.x0 + (h.x1 - h.x0) * t
    // A long way home goes along the front, out of everybody's way.
    const lane = h.out ? HOME_LANE : 0
    const out = Math.min(1, t * 5), inn = Math.min(1, (1 - t) * 5)
    b.z = h.out ? (t < 0.5 ? h.z0 + (lane - h.z0) * ease(out) : h.z1 + (lane - h.z1) * ease(inn)) : h.z0 + (h.z1 - h.z0) * ease(t)
    const base = this.surface(b), from = Math.max(0, 1 - t * 4)
    b.y = Math.max(base, base + (h.y0 - base) * from * from) + Math.abs(Math.sin(t * Math.PI * h.hops)) * (h.out ? 0.9 : 1.1)
    b.tilt += (0 - b.tilt) * (1 - Math.exp(-dt * 10))
    b.floats = false
    if (t < 1) return
    b.hop = null
    b.face = 1
    b.z = h.z1
    b.mode = 'rest'
    if (Math.abs(b.z) < 0.5) this.ontoWhoeverIsHere(b)
    if (b.mode === 'rest') { this.seat(b); this.react(b, 'land', 0.4) }
    this.change(true)
  }

  private seat(b: Body): void {
    b.y = this.surface(b)
    b.tilt = Math.atan(this.slope(b.x, SIZE[b.id].half))
    b.floats = this.snow.water(b.x)
    b.vy = 0
  }

  private surface(b: Body): number {
    if (b.z < -1) return ground(b.x) + 0.12
    const half = SIZE[b.id].half * 0.75
    let y = -Infinity
    const mid = (this.snow.top(b.x - half) + this.snow.top(b.x + half)) / 2
    y = Math.max(this.snow.top(b.x), mid)
    if (b.mode === 'hop') for (const o of [-half, half]) y = Math.max(y, this.snow.top(b.x + o))
    return this.snow.water(b.x) && b.mode !== 'hop' ? y - (isSled(b.id) ? 0.32 : 0.5) : y
  }

  private slope(x: number, half: number): number {
    const reach = half * 1.2
    return (this.snow.top(x + reach) - this.snow.top(x - reach)) / (reach * 2)
  }

  private canStart(b: Body): boolean {
    const half = SIZE[b.id].half
    return !this.snow.water(b.x) && this.snow.cover(b.x - half * 0.8, b.x + half) >= STARTS
  }

  private slideTick(b: Body, dt: number): void {
    const half = SIZE[b.id].half
    if (Math.abs(b.z) > 0.5) { b.y = ground(b.x) + 0.12; b.tilt = 0; return }
    const wet = this.snow.water(b.x)
    const slope = this.slope(b.x, half)
    if (b.mode === 'rest') {
      b.y += (this.surface(b) - b.y) * (1 - Math.exp(-dt * 12))
      b.tilt += (Math.atan(slope) - b.tilt) * (1 - Math.exp(-dt * 10))
      b.floats = wet
      b.ran = 0
      if (!isSled(b.id) || !b.out || this.held) return
      // A sled goes by itself only while the child is snowing: feathers in the air, or a hand on the quilt.
      if (this.canStart(b) && (Math.abs(slope) > 0.1 || (b.x > DIP && b.x < BOTTOM) || ground(b.x + half) < ground(b.x - half) - 0.2) && slope < 0.6 && (this.feathers.length > 0 || this.quilt.grabbed || (this.untouched && this.slipping > 0))) {
        b.mode = 'slide'
        const dip = b.x > DIP && b.x < BOTTOM
        b.face = slope > 0.14 && !dip ? -1 : 1
        b.v = dip ? SHOVE : b.face * 1.5
        this.react(b, 'go')
      }
      return
    }
    b.ran += dt
    const dir = b.v === 0 ? b.face : Math.sign(b.v)
    if (wet) {
      b.v *= Math.exp(-dt * 2.6)
      const lo = POND.left + half * 0.6, hi = POND.right - half * 0.6
      if (b.x > hi && b.v > 0) b.v = -b.v * 0.3
      if (b.x < lo && b.v < 0) b.v = -b.v * 0.3
      if (Math.abs(b.v) < 0.15) this.halt(b, false)
    } else {
      b.v -= slope * PULL * dt
      // It paddles on: a little heap never holds a sled for good.
      if (Math.abs(b.v) < 2.2 && b.x < BOTTOM) b.v += b.face * 3.2 * dt
      const cover = this.snow.cover(b.x - half * 0.5 * dir, b.x + half * 0.9 * dir)
      const brake = cover < DIGS ? BRAKE : RUNS_DOWN + Math.abs(b.v) * 0.13 + b.v * b.v * 0.012 + (1 - cover) * 4
      const before = b.v
      b.v -= Math.sign(b.v) * brake * dt
      if (Math.sign(b.v) !== Math.sign(before) || (Math.abs(b.v) < 0.12 && (cover < DIGS || Math.abs(slope) < 0.06))) { this.halt(b, cover < DIGS); return }
    }
    if (b.v !== 0) b.face = b.v > 0 ? 1 : -1
    const wasSlope = slope
    b.x += b.v * dt
    if (b.x > EDGE.right - half && b.v > 0) {
      this.say('hay', { id: b.id, power: Math.min(1, b.v / 8), x: b.x })
      b.x = EDGE.right - half
      b.v = -b.v * 0.28
      if (Math.abs(b.v) < 0.9) this.halt(b, false)
    }
    if (b.x < EDGE.left) { b.x = EDGE.left; this.halt(b, false) }
    const nowWet = this.snow.water(b.x)
    if (nowWet && !wet) { this.splash(b); return }
    const y = this.surface(b)
    // The ground falls away faster than it would fall: it flies.
    const vy = b.v * wasSlope, soon = 0.14
    const would = b.y + vy * soon - 4.9 * soon * soon
    if (!nowWet && Math.abs(b.v) > 3.6 && would - this.snow.top(b.x + b.v * soon) > 0.16) {
      b.mode = 'air'
      b.vy = Math.max(vy, 0.4) + 0.6
      b.ran = 0
      this.react(b, 'fly', Math.min(1, Math.abs(b.v) / 7))
      return
    }
    b.y += (y - b.y) * (1 - Math.exp(-dt * 24))
    b.tilt += (Math.atan(this.slope(b.x, half)) - b.tilt) * (1 - Math.exp(-dt * 14))
    b.floats = nowWet
  }

  private airTick(b: Body, dt: number): void {
    b.ran += dt
    b.vy -= 9.8 * dt
    b.x += b.v * dt
    b.y += b.vy * dt
    const half = SIZE[b.id].half
    if (b.x > EDGE.right - half) {
      if (b.v > 0.5) this.say('hay', { id: b.id, power: Math.min(1, b.v / 8), x: b.x })
      b.x = EDGE.right - half
      b.v *= -0.25
    }
    if (b.x < EDGE.left) { b.x = EDGE.left; b.v = 0 }
    b.tilt += (Math.atan2(b.vy, Math.max(3, Math.abs(b.v))) * 0.6 * b.face - b.tilt) * (1 - Math.exp(-dt * 5))
    const y = this.surface(b)
    if (b.y > y) return
    const hard = Math.min(1, -b.vy / 7)
    b.y = y
    b.vy = 0
    if (this.ontoWhoeverIsHere(b)) return
    if (this.snow.water(b.x)) { this.splash(b); return }
    this.react(b, 'land', hard)
    this.snowPuff(b)
    b.mode = 'slide'
    if (!isSled(b.id) || (this.snow.cover(b.x - half, b.x + half) < DIGS && Math.abs(b.v) < 1)) this.halt(b, false)
    this.change()
  }

  private snowPuff(b: Body): void {
    if (this.snow.at(b.x) > 0.1) this.say('puff', { power: 0.5, x: b.x, id: b.id })
  }

  private splash(b: Body): void {
    const power = Math.min(1, (Math.abs(b.v) + Math.abs(b.vy)) / 7)
    this.react(b, 'splash', power)
    b.mode = 'slide'
    b.vy = 0
    b.floats = true
    b.v *= 0.55
    for (let up = this.above(b.id); up; up = this.above(up.id)) up.react = { name: 'meet', t: 0 }
    // Splashed snow comes off heads too.
    if (b.cap > 0) { this.snow.add(b.x, b.cap); b.cap = 0; b.sneeze = 0 }
    this.change()
  }

  private halt(b: Body, dug: boolean): void {
    const ran = b.ran
    b.mode = 'rest'
    b.v = 0
    b.ran = 0
    if (dug && ran > 0.15) this.react(b, 'stop', Math.min(1, 0.4 + ran / 2))
    this.change(true)
  }

  /** Those on top go where the one below goes, and a moment behind it. */
  private carryUp(b: Body): void {
    const up = this.above(b.id)
    if (!up) return
    const seat = SIZE[b.id].seat
    const t = up.mount ? ease(Math.min(1, up.mount.t)) : 1
    const tx = b.x - Math.sin(b.tilt) * seat * 0.4, ty = b.y + seat * (0.6 + 0.4 * Math.cos(b.tilt)), tz = b.z
    if (up.mount) {
      up.x = up.mount.x + (tx - up.mount.x) * t
      up.y = up.mount.y + (ty - up.mount.y) * t + Math.sin(Math.PI * t) * 1.1
      up.z = up.mount.z + (tz - up.mount.z) * t
    } else { up.x = tx; up.y = ty; up.z = tz }
    up.mode = 'ride'
    up.floats = false
    up.tilt += (b.tilt * 0.6 - up.tilt) * 0.15
    up.face = b.face
    this.carryUp(up)
  }

  // --- Meeting ---------------------------------------------------------------

  private contacts(): void {
    for (const a of this.list) {
      if (a.mode !== 'slide' && a.mode !== 'air') continue
      if (a.on !== null || (a.mode === 'slide' && Math.abs(a.v) < 0.5)) continue
      for (const b of this.list) {
        if (b === a || !this.grounded(b) || b.mode === 'air' || a.mode === 'air' && a.y > b.y + this.stackTall(b) * 0.8) continue
        // A hair of room: a sled meets what is ahead of it.
        const gap = SIZE[a.id].half * 0.85 + SIZE[b.id].half * 0.7
        const dx = b.x - a.x
        if (Math.abs(dx) > gap || (a.mode === 'slide' && Math.sign(dx) !== Math.sign(a.v))) continue
        if (Math.abs(b.v) > Math.abs(a.v) && b.mode === 'slide') continue
        this.meet(a, b)
        return
      }
    }
  }

  private stackTall(b: Body): number {
    const top = this.top(b.id)
    return top.y + SIZE[top.id].tall - b.y
  }

  private ontoWhoeverIsHere(a: Body): boolean {
    for (const b of this.list) {
      if (b === a || !this.grounded(b)) continue
      if (Math.abs(b.x - a.x) > SIZE[a.id].half * 0.6 + SIZE[b.id].half * 0.75) continue
      if (isSled(a.id) && !isSled(b.id) && b.mode === 'rest') { this.sit(b, a) ; a.mode = 'rest'; this.seat(a); return true }
      this.sit(a, b)
      return true
    }
    return false
  }

  /** A, under way, has run into B. A stander is scooped up; anybody else is hopped onto. */
  private meet(a: Body, b: Body): void {
    if (isSled(a.id) && !isSled(b.id)) this.sit(b, a)
    else this.sit(a, b)
  }

  /** Puts a, and all who sit on it, on top of b's heap. Whoever makes it too high is tipped off in front. */
  private sit(a: Body, b: Body): void {
    while (this.high(a.id) + this.high(b.id) > MOST_HIGH) {
      const top = this.high(b.id) > 1 ? this.top(b.id) : this.top(a.id)
      if (top === a || top === b) return
      top.on = null
      this.hopTo(top, this.clearX(b.x + (a.v >= 0 ? 1 : -1) * 3.2, top, a), 0, 1)
      this.say('spill', { id: top.id })
    }
    const seat = this.top(b.id)
    a.mount = { x: a.x, y: a.y, z: a.z, t: 0 }
    a.on = seat.id
    a.mode = 'ride'
    if (b.mode === 'rest' && Math.abs(a.v) > 2 && isSled(b.id) && this.canStart(b)) { b.mode = 'slide'; b.v = a.v * 0.45; b.face = a.v > 0 ? 1 : -1 }
    a.v = a.vy = 0
    this.react(a, 'meet')
    this.react(b, 'meet', 0.5)
    if (a.id === 'hen' && !seat.egg) { seat.egg = true; this.react(a, 'lay') }
    this.change(true)
  }

  // --- Put away --------------------------------------------------------------

  /** As a load would find it: nothing in the air, nothing on the way, nothing in a hand. */
  settle(): void {
    this.cancel()
    const q = this.quilt
    q.due = 0
    q.grabbed = false
    q.energy = 0
    for (const f of this.feathers) this.snow.add(f.x, f.amount)
    this.feathers.length = 0
    while (q.rising > 0) this.quiltTick(STEP)
    if (q.left < FEATHER * 0.5 && !q.empty) q.empty = true
    this.evening = null
    for (const b of this.list) {
      if (b.hop) { b.x = b.hop.x1; b.z = b.hop.z1; b.hop = null; b.mode = 'rest'; b.face = 1 }
      b.mount = null
      b.react = null
      b.sneeze = 0
      if (b.mode === 'slide' || b.mode === 'air') b.mode = 'rest'
      b.v = b.vy = b.ran = 0
      // As it is saved, so a load decides the same.
      b.x = Math.round(b.x * 100) / 100
    }
    for (let i = 0; i < 400; i++) this.snow.settle()
    q.x = q.to
    this.settleAll()
    this.events.length = 0
    this.quiltTick(0.0001)
    q.hem = q.hemTo
    this.events.length = 0
  }

  private settleAll(): void {
    // Two in one place: the later one stands clear.
    for (let pass = 0, moved = true; moved && pass < 6; pass++) {
      moved = false
      for (const b of this.list) if (b.on === null && b.mode !== 'held' && Math.abs(b.z) < 0.5 && this.taken(b.x, b, undefined, 0)) { const x = this.clearX(b.x, b); moved ||= x !== b.x; b.x = x }
    }
    for (const b of this.list) if (b.on === null && b.mode !== 'held') this.seat(b)
    for (const b of this.list) if (b.on === null) this.carryUp(b)
  }

  toState(): GameState {
    return {
      v: 1,
      quilt: this.quilt.to,
      empty: this.quilt.empty,
      night: this.night,
      shown: this.shown,
      snow: Array.from(this.snow.depth, (d) => Math.round(d * 200) / 200),
      bodies: Object.fromEntries(IDS.map((id) => { const b = this.bodies[id], at = b.back ?? b; return [id, { x: Math.round((b.hop ? b.hop.x1 : at.x) * 100) / 100, on: at.on, out: at.out, face: b.face, cap: Math.round(b.cap * 1000) / 1000, egg: b.egg }] })) as GameState['bodies'],
    }
  }
}

const ease = (t: number): number => t * t * (3 - 2 * t)
const clampQuilt = (x: number): number => Math.min(QUILT.right, Math.max(QUILT.left, x))
export { BEARS, type SledId }
