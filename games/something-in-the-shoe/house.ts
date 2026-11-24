import { cuesOf, frameOf, lastSeen, lengthOf, outAt, posed, rest, span, spring, type Cue, type Frame } from './acts'
import { ANKLE, BOOT, HEAD, PEEK, PLACES, REACH, STAGE_PLACE, SUN, WINDOW, pillow, rowPlace, type Place, type Spot } from './layout'
import { OWNERS, nextOwner, type OwnerId } from './owners'
import { emptyShoes, type GameState } from './save'
import { DEEP, THINGS, type ThingId } from './things'

// The room: where every thing is, whose foot is over which shoe, and what time
// of day it is. It knows no browser. A touch arrives as a place in the room.
// What a foot finds is in acts.ts; this only says when and with what.

/** A foot goes in by itself this long after the last thing landed, with no finger down. */
export const WAIT = 2.6
/** From here on a touch ends what the foot set off. */
export const SEEN = 2
export const SUNSET = 1.5
export const SWAP = 1.3
const SUNRISE = 1.5
/** The feet of the morning go in this far apart. */
const NEXT_FOOT = 1.5
const FLIGHT = 0.62
const HEADED = 1.7

export type Phase = 'day' | 'sunset' | 'night' | 'sunrise' | 'morning' | 'back' | 'swap'
export type Target =
  | { kind: 'thing'; id: ThingId }
  | { kind: 'foot' | 'boot' | 'owner' | 'sun' | 'peek' | 'cat' | 'room' }
  | { kind: 'shoe' | 'sleeper'; owner: OwnerId }

type Flight = { from: Spot; to: Spot; t: number; high: number; into: OwnerId | 'home' | 'head' }
export type Thing = { id: ThingId; where: 'home' | 'shoe' | 'air' | 'hand' | 'act' | 'head'; x: number; y: number; rot: number; squash: number; flight: Flight | null; queued: boolean }
export type Act = { owner: OwnerId; found: ThingId[]; t: number; cue: number; cues: Cue[]; home: boolean }
export type Group = { owner: OwnerId; place: Place; frame: Frame; /** Whether the owner stands there, or only the shoe. */ here: boolean; found: ThingId[] }

const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const smooth = (t: number): number => t * t * (3 - 2 * t)

export class House {
  owner: OwnerId
  shoes: Record<OwnerId, ThingId[]>
  phase: Phase
  /** Seconds since the phase began. */
  t = 0
  time = 0
  shown: boolean
  begun: boolean
  readonly things: Record<ThingId, Thing>
  acts: Act[] = []
  /** The whole round that is shown once: seconds in, or null. */
  opener: number | null = null
  /** Seconds since the last thing landed in the boot, or null: nothing is waiting to be found. */
  wait: number | null = null
  /** A foot waits on load for a touch: it never goes in by itself then. */
  private held = false
  finger: Spot | null = null
  hand: ThingId | null = null
  /** What sits on the owner's head, and for how long. */
  headed: { id: ThingId; t: number } | null = null
  tickle = 0
  poke = 0
  sunPoke = 0
  catPoke = 0
  stir: { owner: OwnerId; t: number } | null = null
  bootPoke: Record<string, number> = {}
  /** How far the next owner has come round the edge, 0..1. */
  peekIn = 0
  readonly sounds: string[] = []
  changed: 'no' | 'soon' | 'now' = 'no'
  private from: OwnerId
  private fed = 0
  private sinceFoot = 0

  constructor(state: GameState) {
    this.owner = this.from = state.owner
    this.shoes = state.shoes
    this.phase = state.night ? 'night' : 'day'
    this.shown = state.shown
    this.peekIn = state.begun && !state.night ? 1 : 0
    this.begun = state.begun
    this.things = Object.fromEntries(THINGS.map((id) => [id, { id, where: 'home', x: PLACES[id].x, y: PLACES[id].y, rot: 0, squash: 0, flight: null, queued: false }])) as unknown as Record<ThingId, Thing>
    for (const o of OWNERS) for (const id of this.shoes[o]) this.things[id].where = 'shoe'
    if (this.phase === 'day' && this.shoes[this.owner].length > 0) { this.wait = 0; this.held = true }
    if (!this.shown) this.opener = -1.1
  }

  toState(): GameState {
    const shoes = emptyShoes()
    // Once the sun is on its way up, every shoe is as good as empty.
    if (this.phase !== 'sunrise' && this.phase !== 'morning') for (const o of OWNERS) shoes[o] = [...this.shoes[o]]
    return { v: 1, owner: this.owner, shoes, night: this.phase === 'night' || this.phase === 'sunset', shown: this.shown, begun: this.begun }
  }

  // --- what can be seen ------------------------------------------------------

  /** How far night has come, 0..1. */
  get dark(): number {
    if (this.phase === 'sunset') return smooth(span(this.t, 0.1, SUNSET))
    if (this.phase === 'sunrise') return 1 - smooth(span(this.t, 0.1, SUNRISE))
    return this.phase === 'night' ? 1 : 0
  }
  /** Whether the row of five is out. By day there is the one boot. */
  get row(): boolean {
    return this.phase === 'night' || this.phase === 'sunrise' || this.phase === 'morning' || (this.phase === 'sunset' && this.t > SUNSET / 2) || (this.phase === 'back' && this.t < 0.6)
  }
  /** How far the row has spread over the floor: the basket makes room for it. */
  get spread(): number {
    if (this.phase === 'sunrise') return smooth(span(this.t, 0.3, SUNRISE))
    if (this.phase === 'morning') return 1
    if (this.phase === 'back') return 1 - smooth(span(this.t, 0.6, 1.2))
    return 0
  }
  /** Where the basket has gone, so a thing at home goes with it. */
  get basketX(): number { return this.spread * 360 }
  /** How far the big bed is out, 0..1. */
  get bed(): number {
    if (this.phase === 'sunset') return smooth(span(this.t, 0.75, SUNSET))
    if (this.phase === 'sunrise') return 1 - smooth(span(this.t, 0.3, 0.9))
    return this.phase === 'night' ? 1 : 0
  }
  get busy(): boolean { return this.acts.length > 0 }
  get peeking(): OwnerId | null { return this.begun && this.phase === 'day' && this.peekIn > 0 ? nextOwner(this.owner) : null }
  get calm(): boolean { return this.phase === 'day' || this.phase === 'night' }

  place(owner: OwnerId): Place {
    return this.row ? rowPlace(OWNERS.indexOf(owner), this.spread) : STAGE_PLACE
  }

  groups(): Group[] {
    if (this.row) {
      return OWNERS.map((owner) => {
        const place = this.place(owner), act = this.acts.find((a) => a.owner === owner)
        const here = this.phase === 'morning' || this.phase === 'back' || (this.phase === 'sunrise' && this.t > 0.5)
        const frame = act ? frameOf(act.found, owner, act.t, place.ox, 0) : this.idle(owner, place.ox)
        if (this.phase === 'sunrise') frame.pose.dy += (1 - spring(span(this.t, 0.5 + OWNERS.indexOf(owner) * 0.1, 1.5))) * 420
        if (this.phase === 'back') frame.pose.dy += span(this.t, 0, 0.6) ** 2 * 900
        // In the row the foot hangs lower, so that no leg hides a face.
        frame.pose.footY = Math.max(frame.pose.footY, -368)
        this.shakeBoot(owner, frame)
        return { owner, place, frame, here, found: act ? [] : this.shoes[owner] }
      })
    }
    const act = this.acts[0], owner = this.phase === 'swap' && this.t < SWAP / 2 ? this.from : this.owner
    const frame = act ? frameOf(act.found, owner, act.t, STAGE_PLACE.ox) : this.idle(owner, STAGE_PLACE.ox)
    if (this.phase === 'swap') {
      const u = this.t < SWAP / 2 ? span(this.t, 0, SWAP / 2) : 1 - span(this.t, SWAP / 2, SWAP)
      frame.pose.dx -= u * u * 900; frame.pose.dy -= Math.abs(Math.sin(u * 8)) * 50; frame.pose.arms = 0.8 * u
      frame.pose.eyes = 'happy'; frame.pose.mouth = 'grin'
    }
    if (this.phase === 'sunset') { const u = span(this.t, 0, SUNSET / 2); frame.pose.dy += u * u * 900; frame.pose.eyes = 'shut'; frame.pose.mouth = 'o' }
    if (this.phase === 'back') frame.pose.dy += (1 - spring(span(this.t, 0.6, 1.3))) * 820
    this.shakeBoot(owner, frame)
    return [{ owner, place: STAGE_PLACE, frame, here: true, found: act ? [] : this.shoes[owner] }]
  }

  private shakeBoot(owner: OwnerId, frame: Frame): void {
    const k = this.bootPoke[owner] ?? 0
    if (k <= 0) return
    frame.pose.boot.sy *= 1 - 0.14 * Math.sin(k * 14) * k; frame.pose.boot.sx *= 1 + 0.14 * Math.sin(k * 14) * k
  }

  /** Standing over the boot with a bare foot out: breathing, blinking, looking at the finger, toes going. */
  private idle(owner: OwnerId, ox: number): Frame {
    const pose = rest(), i = OWNERS.indexOf(owner), t = this.time + i * 1.7
    pose.sy = 1 + 0.008 * Math.sin(t * 2.1); pose.toes = 0.5 + 0.5 * Math.sin(t * 4.2)
    pose.tilt = 0.03 * Math.sin(t * 0.9); pose.footY += Math.sin(t * 2.4) * 7; pose.footRot += 0.07 * Math.sin(t * 1.9)
    if ((t * 0.31) % 1 < 0.035) pose.eyes = 'shut'
    if (this.finger && this.phase === 'day') {
      const q = this.local(STAGE_PLACE, this.finger), x = q.x - ox, y = q.y - HEAD.y, d = Math.hypot(x, y) || 1
      pose.lookX = x / d; pose.lookY = y / d
    } else if ((t * 0.17) % 1 > 0.7) { pose.lookX = 0.1; pose.lookY = 0.2 }
    if (this.wait !== null && this.phase === 'day' && !this.held) {
      // It cannot wait: the foot sinks and trembles.
      const u = Math.min(1, this.wait / WAIT)
      pose.footY += u * u * 62 + Math.sin(t * 34) * 3 * u; pose.lookX = 0.8; pose.lookY = 0.6; pose.mouth = 'grin'
    }
    if (this.tickle > 0) {
      const k = this.tickle
      pose.footX += Math.sin(t * 40) * 12 * k; pose.footY -= 40 * k; pose.footRot = Math.sin(t * 36) * 0.4 * k; pose.toes = 1
      pose.eyes = 'happy'; pose.mouth = 'grin'; pose.rot = Math.sin(t * 30) * 0.03 * k; pose.arms = 0.7 * k
    }
    if (this.poke > 0) { pose.sx = 1 + 0.06 * Math.sin(this.poke * 16) * this.poke; pose.sy = 1 - 0.06 * Math.sin(this.poke * 16) * this.poke; pose.mouth = 'o'; pose.eyes = 'wide'; pose.arms = this.poke * 0.4 }
    const f: Frame = { pose, items: [], bits: [] }
    if (this.headed && !this.row) this.sitOnHead(f, ox)
    return f
  }

  private sitOnHead(f: Frame, ox: number): void {
    const { id, t } = this.headed!, p = f.pose, s = Math.sin
    const gone = t > HEADED - 0.25
    p.eyes = gone ? 'shut' : 'cross'; p.lookX = 0; p.lookY = -1; p.mouth = gone ? 'o' : 'wobble'
    p.tilt = gone ? 0.2 * span(t, HEADED - 0.25, HEADED) : 0
    const [x, y, rot] = ({
      mandarin: [s(t * 5) * 52, 0, t * 5], carrot: [0, -14, 3.1 + s(t * 9) * 0.08], biscuit: [0, -6, s(t * 16) * 0.22],
      frog: [0, -Math.abs(s(t * 8)) * 60, 0], mouse: [s(t * 8) * 66, -4, s(t * 8) > 0 ? 0.2 : -0.2],
      porridge: [0, 22 * t, 3.1], bell: [0, 4, s(t * 13) * 0.4],
    } as const)[id]
    p.mask = id === 'porridge' ? 0.75 * span(t, 0.3, 0.8) * (1 - span(t, 1.5, 1.7)) : 0
    const q = posed(p, ox, ox + x, HEAD.top - 26 + y)
    f.items.push({ id, x: q.x, y: q.y, rot, s: 1, fat: 0, over: true })
  }

  /** The room's spot in a group's own units, and back. */
  local(p: Place, at: Spot): Spot { return { x: (at.x - p.x) / p.s, y: (at.y - p.y) / p.s } }
  world(p: Place, at: Spot): Spot { return { x: p.x + at.x * p.s, y: p.y + at.y * p.s } }
  /** Where a thing at home is. */
  homeOf(id: ThingId): Spot { return { x: PLACES[id].x + this.basketX, y: PLACES[id].y } }
  mouthOf(owner: OwnerId): Spot { return this.world(this.place(owner), { x: BOOT.x, y: BOOT.rim }) }

  // --- touches ---------------------------------------------------------------

  at(p: Spot): Target {
    let best: ThingId | null = null, near = REACH
    for (const id of THINGS) {
      if (this.things[id].where !== 'home') continue
      const h = this.homeOf(id), d = Math.hypot(p.x - h.x, p.y - h.y)
      if (d < near) { near = d; best = id }
    }
    if (best) return { kind: 'thing', id: best }
    if (Math.hypot(p.x - SUN.x, p.y - SUN.y) < SUN.r + 24) return { kind: 'sun' }
    if (this.row) {
      for (const owner of OWNERS) {
        const q = this.local(this.place(owner), p)
        if (Math.abs(q.x - (BOOT.x + 50)) < 150 && q.y < 20 && q.y > BOOT.rim - 50) return { kind: 'shoe', owner }
      }
      for (const owner of OWNERS) { const h = pillow(OWNERS.indexOf(owner)); if (this.phase === 'night' && Math.hypot(p.x - h.x, p.y - h.y) < 80) return { kind: 'sleeper', owner } }
      return { kind: 'room' }
    }
    if (this.peeking && Math.hypot(p.x - PEEK.x, p.y - PEEK.y) < PEEK.r + 20) return { kind: 'peek' }
    const q = this.local(STAGE_PLACE, p)
    if (Math.abs(q.x - (ANKLE.x + 40)) < 110 && q.y > ANKLE.y - 70 && q.y < BOOT.rim - 22) return { kind: 'foot' }
    if (q.x > 0 && q.x < 310 && q.y < 10 && q.y >= BOOT.rim - 22) return { kind: 'boot' }
    if (Math.abs(q.x - STAGE_PLACE.ox) < 150 && q.y < 10 && q.y > HEAD.top - 40) return { kind: 'owner' }
    if (Math.abs(p.x - WINDOW.x) < WINDOW.w / 2 && Math.abs(p.y - WINDOW.y) < WINDOW.h / 2 + 40) return { kind: 'cat' }
    return { kind: 'room' }
  }

  /** The finger landed: the answer starts now. */
  press(on: Target, p: Spot): void {
    this.finger = p
    if (this.opener !== null) this.endOpener()
    if (this.wait !== null) { this.held = false; if (this.phase === 'day' && !this.busy) this.wait = 0 }
    this.hurry()
    switch (on.kind) {
      case 'thing': this.things[on.id].squash = 1; this.say(`pick.${on.id}`); break
      case 'foot': this.tickle = Math.max(this.tickle, 0.4); this.say('toe'); break
      case 'boot': this.bootPoke[this.owner] = 1; this.say('leather'); break
      case 'shoe': this.bootPoke[on.owner] = 1; this.say('leather'); break
      case 'owner': this.poke = 1; this.say(`giggle.${this.owner}`); break
      case 'sun': this.sunPoke = 1; this.say(this.dark > 0.5 ? 'moon' : 'sun'); break
      case 'peek': this.say(`giggle.${nextOwner(this.owner)}`); break
      case 'sleeper': this.stir = { owner: on.owner, t: 0 }; this.say(`snort.${on.owner}`); break
      case 'cat': this.catPoke = 1; this.say('cat'); break
      case 'room': this.say('pat'); break
    }
  }

  tap(on: Target): void {
    this.finger = null
    switch (on.kind) {
      case 'thing': this.go(on.id); break
      case 'foot':
        if (this.phase !== 'day' || this.busy) break
        if (this.shoes[this.owner].length > 0) this.footIn()
        else { this.tickle = 1; this.say(`giggle.${this.owner}`) }
        break
      case 'boot': case 'owner':
        if (this.phase === 'day' && !this.busy && this.shoes[this.owner].length > 0 && !this.flying()) this.footIn()
        break
      case 'shoe': if (this.phase === 'night') this.tipOut(on.owner); break
      case 'sun':
        if (this.phase === 'day' && this.begun && !this.busy) this.setSun()
        else if (this.phase === 'night' && !this.flying()) this.raiseSun()
        break
      case 'peek': if (this.phase === 'day' && !this.busy) this.swap(); break
    }
  }

  /** The finger begins to carry. Only a thing at home can be carried. */
  take(on: Target, p: Spot): boolean {
    if (on.kind !== 'thing' || !this.calm) return false
    const thing = this.things[on.id]
    if (thing.where !== 'home') return false
    thing.where = 'hand'; thing.queued = false
    this.hand = on.id
    this.move(p)
    return true
  }
  move(p: Spot): void {
    this.finger = p
    if (!this.hand) return
    const thing = this.things[this.hand]
    thing.rot = Math.max(-0.5, Math.min(0.5, (p.x - thing.x) * 0.02))
    thing.x = p.x; thing.y = p.y - 18
  }
  /** The finger let go. Most of the room is the boot: a child who meant it hits it. */
  drop(): void {
    const id = this.hand
    this.finger = null
    if (!id) return
    this.hand = null
    const thing = this.things[id], p = { x: thing.x, y: thing.y }
    if (this.phase === 'night') {
      let into: OwnerId | null = null, near = 200
      for (const owner of OWNERS) { const m = this.mouthOf(owner), d = Math.abs(p.x - m.x - 20) + Math.max(0, Math.abs(p.y - m.y - 60) - 130); if (d < near) { near = d; into = owner } }
      if (into && p.x < 880) this.fly(id, p, into)
      else { this.say(`drop.${id}`); this.fly(id, p, 'home', 60) }
      return
    }
    const q = this.local(STAGE_PLACE, p)
    if (this.phase === 'day' && !this.busy && !this.headed && Math.abs(q.x - STAGE_PLACE.ox) < 135 && q.y < -380) { this.fly(id, p, 'head', 40); return }
    const far = PLACES[id].x - STAGE_PLACE.x - BOOT.x
    if (q.x > -60 && q.x - BOOT.x < far * 0.5) { if (this.busy) { this.fly(id, p, 'home', 80); thing.queued = true } else this.fly(id, p, this.owner); return }
    this.say(`drop.${id}`)
    this.fly(id, p, 'home', 110)
  }
  /** The finger was taken away: the thing goes back. */
  cancel(): void {
    const id = this.hand
    this.hand = null; this.finger = null
    if (id) this.home(id)
  }

  // --- what it does ----------------------------------------------------------

  private say(sound: string): void { this.sounds.push(sound) }
  private flying(): boolean { return THINGS.some((id) => { const f = this.things[id].flight; return f !== null && f.into !== 'home' }) }
  /** A place for a thing to rest at home, at once. */
  private home(id: ThingId): void {
    const thing = this.things[id]
    Object.assign(thing, { where: 'home', x: PLACES[id].x, y: PLACES[id].y, rot: 0, flight: null })
  }
  private fly(id: ThingId, from: Spot, into: Flight['into'], high = 190): void {
    const thing = this.things[id]
    const to = into === 'home' ? PLACES[id] : into === 'head' ? this.world(STAGE_PLACE, { x: STAGE_PLACE.ox, y: HEAD.top - 30 }) : this.mouthOf(into)
    thing.where = 'air'
    thing.x = from.x; thing.y = from.y
    thing.flight = { from: { ...from }, to: { ...to }, t: 0, high, into }
  }

  /** A tapped thing goes into the boot, or the next empty shoe at night. */
  private go(id: ThingId): void {
    const thing = this.things[id]
    if (thing.where !== 'home') return
    if (this.busy && this.phase === 'day') { thing.queued = true; return }
    if (!this.calm) return
    const room = (n: number): OwnerId | undefined => OWNERS.find((o) => this.shoes[o].length + this.bound(o) === n)
    const into = this.phase === 'day' ? this.owner : room(0) ?? room(1) ?? OWNERS[0]
    this.say(`leap.${id}`)
    this.fly(id, this.homeOf(id), into)
  }
  private bound(o: OwnerId): number { return THINGS.filter((id) => this.things[id].flight?.into === o).length }

  private land(id: ThingId, f: Flight): void {
    const thing = this.things[id]
    thing.flight = null; thing.rot = 0
    if (f.into === 'home') { this.home(id); thing.squash = 0.7; this.say(`drop.${id}`); return }
    if (f.into === 'head') {
      if (this.headed || this.phase !== 'day') { this.fly(id, f.to, 'home'); return }
      thing.where = 'head'; this.headed = { id, t: 0 }; this.say(`head.${id}`); return
    }
    // The room has changed while it was in the air: it goes home.
    if (this.phase === 'day' ? f.into !== this.owner || this.busy : this.phase !== 'night') { this.fly(id, f.to, 'home'); return }
    const shoe = this.shoes[f.into]
    if (shoe.length >= DEEP) this.fly(shoe.shift()!, f.to, 'home', 150)
    shoe.push(id)
    thing.where = 'shoe'
    this.bootPoke[f.into] = 1
    this.say(`in.${id}`)
    if (this.phase === 'day') { this.wait = 0; this.held = false } else if (id === 'bell') this.stir = { owner: f.into, t: 0 }
    this.changed = 'now'
  }

  private tipOut(owner: OwnerId): void {
    if (this.shoes[owner].length === 0) return
    for (const id of this.shoes[owner].splice(0)) this.fly(id, this.mouthOf(owner), 'home', 160)
    this.say('pull')
    this.changed = 'now'
  }

  private footIn(): void {
    if (this.busy) return
    this.begin(this.owner)
    this.wait = null
    this.begun = this.shown = true
    this.changed = 'now'
  }
  private begin(owner: OwnerId): void {
    const found = this.shoes[owner]
    this.shoes[owner] = []
    for (const id of found) this.things[id].where = 'act'
    this.acts.push({ owner, found, t: 0, cue: 0, cues: cuesOf(found, owner), home: false })
    this.tickle = 0; this.poke = 0
    if (this.headed) this.sneeze()
  }
  /** What came out goes back to the basket. */
  private goHome(act: Act, high = 170): void {
    if (act.home) return
    act.home = true
    const place = this.place(act.owner), from = lastSeen(act.found, act.owner, place.ox)
    for (const id of act.found) this.fly(id, this.world(place, from.get(id)!), 'home', high)
  }
  /** A touch while something is going on: once it has been seen, it makes way. */
  private hurry(): void {
    if (this.phase === 'day') {
      for (const act of this.acts) if (act.t > SEEN && act.t < outAt(act.found, act.owner)) { act.t = outAt(act.found, act.owner); this.goHome(act) }
    } else if (this.phase === 'morning') {
      if (this.fed < OWNERS.length) this.sinceFoot = NEXT_FOOT
      else if (this.t > 1) for (const act of this.acts) if (act.t > SEEN) act.t = Math.max(act.t, outAt(act.found, act.owner))
    }
  }
  private sneeze(): void {
    const h = this.headed
    if (!h) return
    this.headed = null
    this.say('sneeze')
    const from = this.world(STAGE_PLACE, { x: STAGE_PLACE.ox, y: HEAD.top - 30 })
    this.fly(h.id, from, 'home', 220)
  }
  private setSun(): void {
    this.empty()
    this.begin2('sunset')
    this.say('dusk')
    this.changed = 'now'
  }
  private raiseSun(): void {
    this.begin2('sunrise')
    this.fed = 0; this.sinceFoot = 0; this.stir = null
    this.say('dawn')
    this.changed = 'now'
  }
  private swap(): void {
    this.empty()
    this.from = this.owner
    this.owner = nextOwner(this.owner)
    this.begin2('swap')
    this.say('step'); this.say(`yelp.${this.owner}`)
    this.changed = 'now'
  }
  private empty(): void {
    this.sneeze()
    for (const id of this.shoes[this.owner].splice(0)) this.fly(id, this.mouthOf(this.owner), 'home', 160)
    this.wait = null
  }
  private begin2(phase: Phase): void { this.phase = phase; this.t = 0 }

  private endOpener(): void {
    // The child's touch ends the showing with everything in place.
    this.opener = null
    for (const act of this.acts) { act.home = true; for (const id of act.found) this.home(id) }
    this.acts = []
    for (const id of this.shoes[this.owner].splice(0)) this.home(id)
    for (const id of THINGS) if (this.things[id].where === 'air') this.home(id)
    this.wait = null
    this.shown = true
    this.changed = 'soon'
  }
  private playOpener(dt: number): void {
    const was = this.opener!, now = (this.opener = was + dt)
    if (was < 0 && now >= 0) { this.shown = true; this.changed = 'now'; this.things.frog.squash = 1 }
    if (was < 0.4 && now >= 0.4) this.fly('frog', this.homeOf('frog'), this.owner)
    if (was < 2 && now >= 2 && this.shoes[this.owner].length > 0) this.begin(this.owner)
    if (now > 3 && !this.busy) { this.opener = null; this.wait = null }
  }

  step(dt: number): void {
    this.time += dt
    this.t += dt
    const fade = (v: number, rate: number): number => Math.max(0, v - dt * rate)
    this.tickle = fade(this.tickle, 0.9); this.poke = fade(this.poke, 1.6); this.sunPoke = fade(this.sunPoke, 1.2); this.catPoke = fade(this.catPoke, 0.8);
    for (const k in this.bootPoke) this.bootPoke[k] = fade(this.bootPoke[k], 1.8)
    if (this.stir && (this.stir.t += dt) > 1.4) this.stir = null
    for (const id of THINGS) {
      const thing = this.things[id]
      thing.squash = fade(thing.squash, 2.2)
      const f = thing.flight
      if (!f) continue
      f.t += dt
      const u = Math.min(1, f.t / FLIGHT), ex = f.into === 'home' ? this.basketX : 0
      thing.x = mix(f.from.x, f.to.x + ex, u); thing.y = mix(f.from.y, f.to.y, u) - f.high * 4 * u * (1 - u)
      thing.rot = Math.sin(u * Math.PI) * (f.into === 'home' ? 1.2 : -1.2)
      if (u >= 1) this.land(id, f)
    }
    if (this.opener !== null) this.playOpener(dt)
    this.stepActs(dt)
    if (this.headed && (this.headed.t += dt) > HEADED) this.sneeze()
    if (this.wait !== null && this.phase === 'day' && !this.busy && this.opener === null) {
      // A finger that is busy, or a thing on its way, holds the foot back.
      if (this.finger || this.held || this.flying()) this.wait = Math.min(this.wait, WAIT * 0.5)
      else if ((this.wait += dt) >= WAIT) this.footIn()
    }
    if (this.phase === 'day' && !this.busy) {
      const next = THINGS.find((id) => this.things[id].queued && this.things[id].where === 'home')
      if (next) { this.things[next].queued = false; this.go(next) }
    }
    // It comes when the round is over, and stays while the next ones go on.
    const come = this.begun && this.phase === 'day' && (this.peekIn > 0 || !this.busy)
    this.peekIn = come ? Math.min(1, this.peekIn + dt * 1.8) : 0
    this.stepPhase(dt)
  }

  private stepActs(dt: number): void {
    for (const act of this.acts) {
      act.t += dt
      while (act.cue < act.cues.length && act.cues[act.cue].at <= act.t) {
        const c = act.cues[act.cue++]
        // What was skipped over is not all heard at once.
        if (act.t - c.at < 0.2) this.say(c.sound)
      }
      if (act.t >= outAt(act.found, act.owner)) this.goHome(act)
    }
    if (this.acts.some((a) => a.t >= lengthOf(a.found, a.owner))) this.acts = this.acts.filter((a) => a.t < lengthOf(a.found, a.owner))
  }

  private stepPhase(dt: number): void {
    switch (this.phase) {
      case 'sunset': if (this.t >= SUNSET) this.begin2('night'); break
      case 'sunrise': if (this.t >= SUNRISE) this.begin2('morning'); break
      case 'swap': if (this.t >= SWAP) this.begin2('day'); break
      case 'back': if (this.t >= 1.3) this.begin2('day'); break
      case 'morning':
        this.sinceFoot += dt
        if (this.fed < OWNERS.length) {
          if (this.sinceFoot >= NEXT_FOOT || (this.fed === 0 && this.sinceFoot > 0.4)) { this.sinceFoot = 0; this.t = 0; this.begin(OWNERS[this.fed++]) }
        } else if (!this.busy) this.begin2('back')
        break
    }
  }

  /** Put away: everything is as a load would find it. */
  settle(): void {
    this.cancel()
    if (this.opener !== null && this.opener >= 0) this.endOpener()
    this.acts = []
    if (this.phase === 'sunrise' || this.phase === 'morning') this.shoes = emptyShoes()
    if (this.phase === 'sunset') this.phase = 'night'
    else if (this.phase !== 'night') this.phase = 'day'
    this.headed = null; this.stir = null
    for (const id of THINGS) if (!OWNERS.some((o) => this.shoes[o].includes(id))) this.home(id)
    for (const id of THINGS) this.things[id].queued = false
    if (this.phase === 'day') for (const o of OWNERS) if (o !== this.owner) for (const id of this.shoes[o].splice(0)) this.home(id)
    this.wait = this.phase === 'day' && this.shoes[this.owner].length > 0 ? 0 : null
    this.held = this.wait !== null
  }
}
