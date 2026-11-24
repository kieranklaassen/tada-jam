import {
  BROOD, FENCE, GROUND, HEN, PUDDLE, SCENERY, SIZE, SQUAT, THINGS, apart, clampSpot, freeSpot, fromPuddle, scaleAt,
  type BroodId, type Id, type SceneryKey, type Spot, type ThingKey,
} from './layout'
import { childrenOf, gaitOf, isBrood, lineOf, ringOf, stepsOf, type Gait, type Mothers } from './lineage'
import { actLasts, type ActName } from './moves'
import { below, type Rng } from './rng'
import { STATE_VERSION, type GameState, type SavedBrood } from './save'

// The yard: who stands where, who takes whom for its mother, what a touch
// does. No browser in it. The Mount and the tests reach it by one path
// (play.ts). It draws nothing and sounds nothing: it keeps bodies for the view
// and a queue of sounds by name.

/** Seconds after the tap: the lid of the shell goes, the eyes land, and the chick is out. */
export const LID = 0.45
export const LAND = 1.2
export const OUT = 2.4
/** Seconds between a mother's act and her chick's copy of it, at each step down the chain. */
export const BEAT = 0.42
export const WING_S = 6
export const TUCK_S = 1.8
export const LAY_S = 1.1
export const GAG_S = 2.8
/** How near two loose things must be set down to do something together. */
export const BESIDE = 46
const CARRY_LIFT = 34
const RING_R: readonly number[] = [0, 26, 60, 70, 82, 96]

export type Body = {
  id: Id
  kind: ThingKey | 'hen' | 'egg' | 'chick'
  x: number; y: number
  /** Height above the ground, of a thing carried or falling. */
  z: number
  dir: 1 | -1
  /** The act it is playing, how far in, and how much of it. */
  act: { name: ActName; t: number; amount: number } | null
  /** Where it is going by itself, and how fast. */
  go: { x: number; y: number; speed: number } | null
  /** A short hop drawn from where it was; it stands at its end already. */
  hop: { x: number; y: number; z: number; t: number; lasts: number } | null
  /** Steps taken, and how much it is moving, 0 to 1. */
  phase: number
  going: number
  /** A ball's turn. */
  spin: number
  /** A press squashes it: a spring. */
  squash: number
  squashV: number
  /** The way it last went, for who follows where. */
  hx: number; hy: number
}

export type Chick = Body & {
  id: BroodId
  kind: 'egg' | 'chick'
  mother: Id | null
  host: Id | null
  dizzy: boolean
  /** Seconds since the tap that opens it, or null. */
  opening: number | null
  /** Seconds since it went under the hen, and where it went from. */
  tucking: number | null
  from: Spot
  laying: number | null
  /** Seconds the thread to its mother still shows. */
  thread: number
  /** The bottom of the shell it still stands in, by seconds left. */
  shell: number
  stance: number
  /** Seconds shut in between two things. */
  stuck: number
  /** Stands beside its mother. */
  settled: boolean
}

export type Sound = { name: string; steps: number }
export type Fx = { kind: 'tea' | 'steam' | 'water' | 'shell' | 'fluff' | 'bubble' | 'feather' | 'dust'; x: number; y: number; z: number; vx: number; vz: number; age: number; lasts: number; turn: number }
export type Target = { kind: 'body'; id: Id } | { kind: 'puddle' } | { kind: 'scenery'; key: SceneryKey } | { kind: 'ground' }

const PAIR: Record<string, { a: ActName | null; b: ActName | null; roll?: 'a' | 'b'; fx?: Fx['kind']; face?: boolean }> = {
  'boot-teapot': { a: 'bootFill', b: 'teapotPour', fx: 'tea' },
  'boot-pig': { a: null, b: 'pigFaint' },
  'boot-farmer': { a: 'bootSeen', b: 'farmerHug' },
  'boot-ball': { a: 'bootKick', b: 'ballBoing', roll: 'b' },
  'boot-bell': { a: 'bootHop', b: 'bellStruck' },
  'teapot-pig': { a: 'teapotPour', b: 'pigSlurp' },
  'teapot-farmer': { a: 'teapotSeen', b: 'farmerSip', fx: 'steam' },
  'teapot-ball': { a: 'teapotSteam', b: 'ballHover', fx: 'steam' },
  'teapot-bell': { a: 'teapotTink', b: 'bellTurns' },
  'pig-farmer': { a: 'pigLick', b: 'farmerGiggle' },
  'pig-ball': { a: 'pigNose', b: 'ballBoing', roll: 'b' },
  'pig-bell': { a: 'pigDance', b: 'bellJingle' },
  'farmer-ball': { a: 'farmerSnore', b: 'ballBounceOff' },
  'farmer-bell': { a: 'farmerWakes', b: 'bellSwing' },
  'ball-bell': { a: 'ballBounceOff', b: 'bellStruck' },
}

const TAP: Record<ThingKey, { act: ActName; step: number; speed: number }> = {
  boot: { act: 'bootStomp', step: 120, speed: 120 },
  teapot: { act: 'teapotPour', step: 46, speed: 60 },
  pig: { act: 'pigTrot', step: 170, speed: 160 },
  farmer: { act: 'farmerLurch', step: 96, speed: 110 },
  ball: { act: 'ballBoing', step: 260, speed: 280 },
  bell: { act: 'bellSwing', step: 44, speed: 60 },
}
const SET: Record<ThingKey, ActName> = { boot: 'bootFlop', teapot: 'teapotRattle', pig: 'pigFlat', farmer: 'farmerSmack', ball: 'ballDrop', bell: 'bellClank' }
const SEATED: Record<ThingKey, ActName> = { boot: 'bootSquelch', teapot: 'teapotLid', pig: 'pigGiggle', farmer: 'farmerBelly', ball: 'ballWobble', bell: 'bellJingle' }
const WET: Record<ThingKey, ActName> = { boot: 'bootSpurt', teapot: 'teapotBlub', pig: 'pigWallow', farmer: 'farmerKick', ball: 'ballBob', bell: 'bellDroop' }
const SEEN: Record<ThingKey, ActName> = { boot: 'bootSeen', teapot: 'teapotSeen', pig: 'pigSeen', farmer: 'farmerSeen', ball: 'ballSeen', bell: 'bellSeen' }
/** What the thing and the hen do when it is set on her, and where the thing is drawn meanwhile. */
export const GAG: Record<ThingKey, { thing: ActName; hen: ActName; dx: number; dz: number; behind: boolean }> = {
  boot: { thing: 'bootHop', hen: 'henFoot', dx: -10, dz: -6, behind: false },
  teapot: { thing: 'teapotSteam', hen: 'henLaunched', dx: 0, dz: 0, behind: false },
  pig: { thing: 'pigSit', hen: 'henUnder', dx: -20, dz: 118, behind: false },
  farmer: { thing: 'farmerPillow', hen: 'henHugged', dx: -78, dz: 0, behind: false },
  ball: { thing: 'ballWobble', hen: 'henCircus', dx: 0, dz: 0, behind: false },
  bell: { thing: 'bellDroop', hen: 'henEcho', dx: -84, dz: 196, behind: false },
}
/** The hen's look for each mother. */
export function henLook(mother: Id, self: BroodId, egg: boolean): ActName {
  if (mother === self) return 'henLean'
  if (isBrood(mother)) return egg ? 'henCompare' : 'henTwice'
  return ({ boot: 'henGasp', teapot: 'henTurn', pig: 'henFaint', farmer: 'henTut', ball: 'henRound', bell: 'henNod', hen: 'henSmug', puddle: 'henLean' } as const)[mother]
}

function body(id: Id, kind: Body['kind'], at: Spot, dir: 1 | -1 = 1): Body {
  return { id, kind, x: at.x, y: at.y, z: 0, dir, act: null, go: null, hop: null, phase: 0, going: 0, spin: 0, squash: 0, squashV: 0, hx: dir, hy: 0 }
}

type Later = { at: number; run: () => void; round: boolean }
export type Carry = { id: Id; x: number; y: number; from: Spot & { dir: 1 | -1 }; host: Id | null }

export class Yard {
  time = 0
  readonly things: Record<ThingKey, Body>
  readonly hen: Body
  brood: Chick[]
  carry: Carry | null = null
  /** Where the finger is, while it is down or carrying, for eyes to follow. */
  finger: Spot | null = null
  /** The thing that is doing its piece with the hen, and how far in. */
  gag: { thing: ThingKey; t: number } | null = null
  wing = 0
  /** A tucked chick that one tap on the hen brings back. */
  private undo: { id: BroodId; mother: Id | null } | null = null
  puddleT = 9
  readonly scenery: Record<SceneryKey, number> = { sheep: 9, cow: 9, sun: 9, cloudA: 9, cloudB: 9, tree: 9, fence: 9 }
  /** Turned round to the yard: the cow, in the round of five. */
  cowFaces = 0
  fx: Fx[] = []
  sounds: Sound[] = []
  /** Something to save: small, or at once. */
  changed: 'no' | 'soon' | 'now' = 'no'
  /** A little spot of fluff where a second finger landed. */
  dabs: { x: number; y: number; t: number }[] = []
  /** What the hen last watched happen. */
  watch: Spot = { x: 500, y: 560 }
  /** Where the ground is pressed in, and how long since. */
  dent: (Spot & { t: number }) | null = null
  /** Where the foil has just been creased. */
  creases: (Spot & { t: number; turn: number })[] = []
  knocking = true
  private later: Later[] = []
  private rings = new Map<string, { x: number; y: number; a: number }>()
  private knockT = 1.4

  constructor(state: GameState, private readonly rng: Rng) {
    this.things = Object.fromEntries(THINGS.map((k) => [k, body(k, k, state.things[k], state.things[k].dir)])) as Record<ThingKey, Body>
    this.hen = body('hen', 'hen', HEN, -1)
    this.brood = state.brood.map((b) => this.chick(b))
  }

  private chick(b: SavedBrood): Chick {
    return { ...body(b.id, b.kind, b, b.x > 600 ? -1 : 1), id: b.id, kind: b.kind, mother: b.mother, host: b.host, dizzy: b.dizzy, opening: null, tucking: null, from: { x: b.x, y: b.y }, laying: null, thread: 0, shell: 0, stance: this.rng.next() * 10, stuck: 0, settled: false }
  }

  // --- what is so -----------------------------------------------------------

  get mothers(): Mothers {
    return new Map(this.brood.map((c) => [c.id, c.mother]))
  }

  of(id: Id): Body | null {
    if (id === 'hen') return this.hen
    if (isBrood(id)) return this.brood.find((c) => c.id === id) ?? null
    if (id === 'puddle') return null
    return this.things[id]
  }

  one(id: BroodId): Chick | null {
    return this.brood.find((c) => c.id === id) ?? null
  }

  gait(c: Chick): Gait {
    return gaitOf(c.id, this.mothers)
  }

  riderOf(id: Id): Chick | null {
    return this.brood.find((c) => c.host === id) ?? null
  }

  /** Where a body is drawn: its place on the ground and how high above it. */
  place(b: Body): { x: number; y: number; z: number } {
    const host = this.hostOf(b)
    if (host) {
      const at = this.place(host)
      const s = scaleAt(at.y), size = SIZE[host.kind]
      let z = at.z + (size.seat - (host.kind === 'teapot' ? 34 : host.kind === 'boot' ? 40 : 0)) * s
      if (host.act && (host.kind === 'farmer' || host.kind === 'bell')) z += Math.abs(Math.sin(host.act.t * 5)) * 5
      return { x: at.x + size.seatX * host.dir * s, y: at.y, z }
    }
    if (b.hop) {
      const u = b.hop.t / b.hop.lasts
      return { x: b.hop.x + (b.x - b.hop.x) * u, y: b.hop.y + (b.y - b.hop.y) * u, z: b.hop.z * (1 - u) + Math.sin(u * Math.PI) * 46 }
    }
    if (this.gag && b.id === this.gag.thing) {
      const g = GAG[this.gag.thing]
      const u = Math.min(1, this.gag.t / 0.25) * Math.min(1, Math.max(0, (GAG_S - this.gag.t) / 0.35))
      const to = { x: HEN.x + g.dx, y: HEN.y + 3 }
      return { x: b.x + (to.x - b.x) * u, y: b.y + (to.y - b.y) * u, z: g.dz * u + Math.sin(u * Math.PI) * 30 }
    }
    return { x: b.x, y: b.y, z: b.z }
  }

  hostOf(b: Body): Body | null {
    return 'host' in b && (b as Chick).host ? this.of((b as Chick).host!) : null
  }

  /** The middle of a body as drawn, which a finger aims at. */
  middle(b: Body): Spot {
    const p = this.place(b)
    return { x: p.x, y: p.y - p.z - SIZE[b.kind].h * 0.48 * scaleAt(p.y) }
  }

  private carried(id: Id): boolean {
    for (let at: Id | null = id; at; ) {
      if (this.carry?.id === at) return true
      const b: Body | null = this.of(at)
      at = b && 'host' in b ? (b as Chick).host : null
    }
    return false
  }

  /** A chick that stands on the ground and may go where it likes. */
  private free(c: Chick): boolean {
    return c.kind === 'chick' && c.host === null && c.opening === null && c.tucking === null && c.laying === null && !this.carried(c.id)
  }

  /** How far the thing `id` is from an egg at `c`, edge to edge on the ground. */
  private gap(c: Chick, id: Id): number {
    const at = this.place(c)
    if (id === 'puddle') return fromPuddle(at)
    const b = this.of(id)!
    if (c.host === id) return -1000
    return apart(at, this.place(b)) - SIZE[b.kind].r
  }

  /** What the egg would take for its mother now: whatever stands nearest. */
  nearest(c: Chick): Id {
    let best: Id = 'hen', least = Infinity
    const ids: Id[] = [...THINGS, 'hen', 'puddle', ...this.brood.filter((o) => o !== c && o.tucking === null && o.laying === null && !this.rides(o, c)).map((o) => o.id)]
    for (const id of ids) {
      const d = this.gap(c, id)
      if (d < least) { best = id; least = d }
    }
    return best === 'puddle' ? c.id : best
  }

  /** Whether `o` rides on `on`, or on what rides on it. */
  private rides(o: Chick, on: Body): boolean {
    for (let at = o.host; at; ) {
      if (at === on.id) return true
      const b = this.of(at)
      at = b && 'host' in b ? (b as Chick).host : null
    }
    return false
  }

  /** The egg that asks to be opened. */
  get asking(): Chick | null {
    return this.brood.find((c) => c.kind === 'egg' && c.opening === null && c.tucking === null && c.laying === null && !this.carried(c.id)) ?? null
  }

  running(ring: readonly BroodId[]): boolean {
    return ring.every((id) => { const c = this.one(id); return c !== null && this.free(c) && !c.dizzy && c.act?.name !== 'chickFlap' })
  }

  // --- touch ----------------------------------------------------------------

  /** Everything that can be drawn and touched, back to front. */
  drawOrder(): Body[] {
    const depth = (b: Body): number => {
      const host = this.hostOf(b)
      if (host) return depth(host) + (host.kind === 'teapot' || host.kind === 'boot' ? -0.01 : 0.01)
      if (this.carry?.id === b.id) return 5000
      return this.place(b).y
    }
    return [...THINGS.map((k) => this.things[k]), this.hen, ...this.brood].map((b) => ({ b, d: depth(b) })).sort((p, q) => p.d - q.d).map((e) => e.b)
  }

  /** What is under a finger. Whatever is drawn in front wins, and a near miss is taken for the nearest. */
  at(p: Spot): Target {
    const order = this.drawOrder()
    let hit: Body | null = null, hitBy = 1, near: Body | null = null, nearBy = 1
    for (let i = order.length - 1; i >= 0; i--) {
      const b = order[i]
      if (this.hostOf(b)?.kind === 'teapot') continue
      if ('tucking' in b && (b as Chick).tucking !== null && (b as Chick).tucking! < 1.2) continue
      const m = this.middle(b), s = scaleAt(this.place(b).y), size = SIZE[b.kind]
      const off = (pad: number) => Math.hypot((p.x - m.x) / ((size.w / 2) * s + pad), (p.y - m.y) / ((size.h / 2) * s + pad))
      const inside = off(2), outside = off(26)
      // A finger in the middle of something partly covered means that one. What sits in the boot is ahead of the boot.
      if (inside <= 1 && (hit === null || inside < hitBy - 0.5 || this.hostOf(b) === hit)) { hit = b; hitBy = inside }
      if (outside < nearBy) { near = b; nearBy = outside }
    }
    if (hit) return { kind: 'body', id: hit.id }
    if (near) return { kind: 'body', id: near.id }
    if (fromPuddle(p) < 0) return { kind: 'puddle' }
    for (const key of Object.keys(SCENERY) as SceneryKey[]) if (Math.hypot(p.x - SCENERY[key].x, p.y - SCENERY[key].y) <= SCENERY[key].r) return { kind: 'scenery', key }
    if (p.y >= FENCE.top && p.y <= FENCE.bottom) return { kind: 'scenery', key: 'fence' }
    return { kind: 'ground' }
  }

  /** The finger lands. Answered in this frame, whatever it turns out to be. */
  press(target: Target, p: Spot): void {
    this.finger = p
    this.endRound()
    if (target.kind === 'body') {
      const b = this.of(target.id)!
      b.squashV -= 3.4
      this.sound(b.kind === 'egg' ? 'press.egg' : b.kind === 'chick' ? 'press.chick' : b.kind === 'hen' ? 'press.hen' : 'press.thing')
      this.watch = this.middle(b)
    } else if (target.kind === 'ground') {
      this.sound('press.ground')
      this.dent = { ...p, t: 0 }
      this.puff('dust', p.x, p.y, 3)
    }
  }

  tap(target: Target): void {
    if (target.kind === 'scenery') return this.tapScenery(target.key)
    if (target.kind === 'puddle') {
      this.puddleT = 0
      this.sound('puddle')
      this.puff('water', PUDDLE.x, PUDDLE.y, 7)
      return
    }
    if (target.kind === 'ground') return
    const b = this.of(target.id)
    if (!b) return
    if (b.id === 'hen') return this.tapHen()
    if (isBrood(b.id)) return this.tapBrood(this.one(b.id)!)
    this.tapThing(b.id as ThingKey)
  }

  private tapThing(k: ThingKey): void {
    const b = this.things[k]
    if (this.gag?.thing === k) { this.sound('press.hen'); return }
    const t = TAP[k]
    this.sound(`tap.${k}`)
    if (k === 'teapot') {
      const in_ = this.riderOf('teapot')
      this.puff('tea', b.x + b.dir * 90, b.y - 60, 8)
      if (in_) this.getDown(in_, b.dir * 130)
    }
    this.perform(b, t.act)
    this.travel(b, t.step, t.speed)
    this.maybeRound(k)
  }

  /** A few steps on the way it faces, turning where the yard or something in it is in the way. */
  private travel(b: Body, step: number, speed: number): void {
    const r = SIZE[b.kind].r, solids = this.solids(b.id, true)
    const clear = (p: Spot) => p.x >= GROUND.left && p.x <= GROUND.right && p.y >= GROUND.top && p.y <= GROUND.bottom && solids.every((s) => apart(p, s) >= s.r + r) && this.leavesInSight(b, p)
    for (const share of [1, 0.6]) {
      for (const turn of [0, 0.6, -0.6, 1.2, -1.2, Math.PI, Math.PI - 0.6, Math.PI + 0.6, 1.6, -1.6]) {
        const ux = Math.cos(turn) * b.dir, uy = Math.sin(turn) * SQUAT
        const to = { x: b.x + ux * step * share, y: b.y + uy * step * share }
        if (clear(to) && clear({ x: (b.x * 2 + to.x) / 3, y: (b.y * 2 + to.y) / 3 }) && clear({ x: (b.x + to.x * 2) / 3, y: (b.y + to.y * 2) / 3 })) {
          b.go = { ...to, speed }
          if (Math.abs(ux) > 0.2) b.dir = ux > 0 ? 1 : -1
          this.change()
          return
        }
      }
    }
  }

  private tapHen(): void {
    const back = this.wing > 0 && this.undo ? this.one(this.undo.id) : null
    if (back && back.kind === 'egg' && back.opening === null && !this.carried(back.id)) {
      back.kind = 'chick'
      back.mother = this.undo!.mother
      back.tucking = null
      this.undo = null
      this.wing = 0
      this.hopTo(back, { x: HEN.x, y: HEN.y }, 60, { x: back.x, y: back.y })
      back.act = { name: 'chickFlap', t: 0, amount: 1 }
      this.act(this.hen, 'henWing')
      this.sound('hen.back')
      this.change(true)
      return
    }
    if (this.gag || this.hen.act?.name === 'henFluff' || this.hen.act?.name === 'henLay') { this.sound('press.hen'); return }
    const id = BROOD.find((c) => !this.one(c))
    if (id) {
      const at = this.nestSpot()
      const c = this.chick({ id, kind: 'egg', x: at.x, y: at.y, mother: null, host: null, dizzy: false })
      c.laying = 0
      this.brood.push(c)
      this.brood.sort((p, q) => BROOD.indexOf(p.id) - BROOD.indexOf(q.id))
      this.perform(this.hen, 'henLay')
      this.sound('hen.lay')
      this.puff('feather', HEN.x - 40, HEN.y - 60, 4)
      this.change(true)
      return
    }
    this.undo = null
    this.perform(this.hen, 'henWing')
    this.sound('hen.wing')
    this.wing = WING_S
  }

  private tapBrood(c: Chick): void {
    if (c.tucking !== null || c.laying !== null) { this.sound('press.egg'); return }
    if (c.kind === 'egg' && c.opening === null) {
      c.opening = 0
      c.act = { name: 'eggSquash', t: 0, amount: 1 }
      this.sound('egg.crack')
      this.change(true)
      return
    }
    if (c.opening !== null) { this.sound('press.egg'); return }
    if (this.wing > 0 && !this.undo) return this.tuck(c, true)
    c.thread = 1.6
    const ring = ringOf(c.id, this.mothers)
    if (ring && c.host === null) {
      const dizzy = !c.dizzy
      for (const id of ring) { const o = this.one(id); if (o) o.dizzy = dizzy }
      this.sound(dizzy ? 'ring.sit' : 'ring.go')
      this.change(true)
    }
    if (c.host !== null) {
      this.getDown(c, 0)
      this.perform(c, 'chickDown')
      this.cry(c, 0)
      return
    }
    if (!(ring && c.dizzy)) this.perform(c, 'chickHop')
    this.cry(c, 0)
  }

  private tapScenery(key: SceneryKey): void {
    this.scenery[key] = 0
    this.sound(`scenery.${key}`)
  }

  /** A finger that is not the one at work: a small answer where it landed. */
  dab(p: Spot): void {
    this.endRound()
    this.dabs.push({ x: p.x, y: p.y, t: 0 })
    if (this.dabs.length > 4) this.dabs.shift()
    this.sound('dab')
  }

  // --- carrying -------------------------------------------------------------

  /** Takes up what is under the finger, if it can be carried. What cannot still answers. */
  take(target: Target, p: Spot): boolean {
    if (target.kind === 'puddle') { this.crease(p); return false }
    if (target.kind !== 'body') return false
    if (target.id === 'hen') {
      if (!this.gag) this.act(this.hen, 'henStretch')
      this.sound('hen.stretch')
      return false
    }
    const b = this.of(target.id)!
    if ('tucking' in b) {
      const c = b as Chick
      if (c.tucking !== null || c.laying !== null) return false
    }
    if (this.gag?.thing === b.id) this.gag = null
    const host = 'host' in b ? (b as Chick).host : null
    this.carry = { id: b.id, x: p.x, y: p.y, from: { x: b.x, y: b.y, dir: b.dir }, host }
    if (host) (b as Chick).host = null
    b.go = null
    b.hop = null
    this.sound('lift')
    this.move(p)
    return true
  }

  /** A finger that drags over the foil creases it there. */
  crease(p: Spot): void {
    if (fromPuddle(p) > 0) return
    const last = this.creases[this.creases.length - 1]
    if (last && Math.hypot(last.x - p.x, last.y - p.y) < 16) return
    this.creases.push({ x: p.x, y: p.y, t: 0, turn: this.rng.next() * 6 })
    if (this.creases.length > 12) this.creases.shift()
    this.sound('puddle.rustle')
  }

  move(p: Spot): void {
    this.finger = p
    const carry = this.carry
    if (!carry) return
    const b = this.of(carry.id)!
    const dx = p.x - carry.x
    carry.x = p.x
    carry.y = p.y
    if (Math.abs(dx) > 2 && b.kind !== 'egg') b.dir = dx > 0 ? 1 : -1
    const half = SIZE[b.kind].h * 0.48
    const want = { x: p.x, y: p.y + half + CARRY_LIFT }
    const at = clampSpot(want)
    const ox = b.x, oy = b.y
    b.x = at.x
    b.y = at.y
    b.z = Math.max(0, at.y - half * scaleAt(at.y) - p.y)
    this.heading(b, b.x - ox, b.y - oy)
    this.watch = p
  }

  /** The finger lets go of what it carried. */
  drop(): void {
    const carry = this.carry
    if (!carry) return
    const b = this.of(carry.id)!
    this.carry = null
    const z = b.z
    b.z = 0
    b.hop = z > 4 ? { x: b.x, y: b.y, z, t: 0, lasts: 0.16 } : null
    const near = apart(b, HEN) < SIZE.hen.r + SIZE[b.kind].r * 0.5 || Math.hypot((carry.x - HEN.x) / 150, (carry.y - (HEN.y - 110)) / 150) < 1
    if (isBrood(b.id)) this.dropBrood(b as Chick, { x: carry.x, y: carry.y }, near, z)
    else this.dropThing(b as Body & { id: ThingKey }, near)
    this.change(true)
  }

  /** The finger was taken away: what it carried goes back where it came from. */
  cancel(): void {
    const carry = this.carry
    this.carry = null
    this.finger = null
    if (!carry) return
    const b = this.of(carry.id)!
    const was = this.place(b)
    b.x = carry.from.x
    b.y = carry.from.y
    b.z = 0
    b.dir = carry.from.dir
    if ('host' in b) {
      const host = carry.host ? this.of(carry.host) : null
      ;(b as Chick).host = host && !this.riderOf(host.id) ? carry.host : null
    }
    if (!('host' in b && (b as Chick).host)) b.hop = { ...was, t: 0, lasts: 0.35 }
    this.sound('bump')
  }

  private dropThing(b: Body & { id: ThingKey }, onHen: boolean): void {
    const k = b.id
    if (onHen) {
      if (this.gag) this.gag = null
      const to = this.spotFor(b, { x: HEN.x - 170, y: HEN.y + 60 })
      b.hop = null
      b.x = to.x
      b.y = to.y
      this.gag = { thing: k, t: 0 }
      b.act = null
      this.perform(b, GAG[k].thing)
      this.act(this.hen, GAG[k].hen)
      this.sound(`hen.${k}`)
      this.puff('feather', HEN.x, HEN.y - 120, 6)
      if (k === 'teapot') this.puff('steam', HEN.x, HEN.y - 40, 10)
      return
    }
    const r = SIZE[k].r
    const at = this.childSpot(b)
    if (apart(at, b) > 6) {
      const p = this.place(b)
      this.hopTo(b, p, p.z, at)
      this.sound('bump')
    }
    if (fromPuddle(b) < 10) {
      this.puddleT = 0
      this.perform(b, WET[k])
      this.sound(`wet.${k}`)
      this.puff(k === 'teapot' ? 'bubble' : 'water', b.x + (k === 'boot' ? 72 * b.dir : 0), b.y, 10)
      return
    }
    let mate: ThingKey | null = null, least = BESIDE
    for (const o of THINGS) {
      if (o === k || this.gag?.thing === o) continue
      const d = apart(b, this.things[o]) - r - SIZE[o].r
      if (d < least) { mate = o; least = d }
    }
    if (mate) return this.together(k, mate)
    this.perform(b, SET[k])
    this.sound(`set.${k}`)
    this.puff('dust', b.x, b.y, 4)
  }

  private together(p: ThingKey, q: ThingKey): void {
    const [a, b] = THINGS.indexOf(p) < THINGS.indexOf(q) ? [p, q] : [q, p]
    const key = `${a}-${b}`, how = PAIR[key], A = this.things[a], B = this.things[b]
    A.dir = B.x >= A.x ? 1 : -1
    B.dir = (A.dir * -1) as 1 | -1
    A.go = B.go = null
    if (how.a) this.perform(A, how.a)
    if (how.b) this.perform(B, how.b)
    this.sound(`pair.${key}`)
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
    if (how.fx) { const hat = key === 'teapot-farmer' ? { x: B.x - 76 * B.dir, y: B.y - 190 } : { x: mid.x, y: mid.y - 70 }; this.puff(how.fx, hat.x, hat.y, 9) }
    if (how.roll) {
      // Sent off away from what sent it.
      const ball = how.roll === 'a' ? A : B
      ball.dir = (ball.dir * -1) as 1 | -1
      this.after(0.4, () => { if (!this.carried(ball.id) && this.gag?.thing !== ball.id) this.travel(ball, 300, 320) })
    }
    this.watch = mid
  }

  private dropBrood(c: Chick, finger: Spot, onHen: boolean, z: number): void {
    if (onHen && c.opening === null) {
      if (c.kind === 'chick') return this.tuck(c, false)
      const to = this.spotFor(c, { x: HEN.x - 40, y: HEN.y + 130 })
      c.from = { x: c.x, y: c.y - z }
      c.hop = null
      c.x = to.x
      c.y = to.y
      c.z = 0
      c.tucking = 0
      this.act(this.hen, 'henCoo')
      this.sound('hen.egg')
      return
    }
    const seat = this.seatUnder(c, finger)
    if (seat) {
      c.hop = null
      c.host = seat.id
      c.z = 0
      if (seat.kind === 'chick') {
        this.act(c, 'chickPerch')
        this.perform(seat, 'chickFlap')
        this.sound('seat.chick')
      } else {
        const k = seat.kind as ThingKey
        this.perform(seat, SEATED[k])
        this.sound(`seat.${k}`)
      }
      return
    }
    const r = SIZE[c.kind].r
    const at = this.childSpot(c)
    if (apart(at, c) > 6) {
      const p = this.place(c), other = this.brood.find((o) => o !== c && o.kind === 'egg' && apart(o, c) < SIZE.egg.r + r)
      this.hopTo(c, p, p.z, at)
      if (other) { this.act(other, 'eggTok'); if (c.kind === 'egg') this.act(c, 'eggTok'); this.sound('egg.tok') } else this.sound('bump')
    }
    if (fromPuddle(c) < 4) {
      this.puddleT = 0
      this.puff('water', c.x, c.y, 7)
      if (c.kind === 'egg') { this.act(c, 'eggSpin'); this.sound('egg.wet') } else { this.perform(c, 'chickPaddle'); this.sound('wet.chick') }
      return
    }
    if (c.kind === 'egg') { if (!c.act) this.act(c, 'eggRock'); this.sound('egg.set') } else { this.perform(c, 'chickFlap'); this.sound('set.chick') }
  }

  /** Where a chick or an egg let go at `finger` would sit: a loose thing, or a chick, or whoever sits highest on it. */
  private seatUnder(c: Chick, finger: Spot): Body | null {
    const order = this.drawOrder()
    for (let i = order.length - 1; i >= 0; i--) {
      const b = order[i]
      if (b === c || b.id === 'hen' || b.kind === 'egg' || this.rides(b as Chick, c) || (this.gag && b.id === this.gag.thing)) continue
      if (b.kind === 'chick' && ((b as Chick).opening !== null || (b as Chick).tucking !== null)) continue
      const m = this.middle(b), s = scaleAt(this.place(b).y), size = SIZE[b.kind]
      if (Math.hypot((finger.x - m.x) / ((size.w / 2) * s), (finger.y - m.y) / ((size.h / 2) * s)) > 1) continue
      let top: Body = b
      for (let next = this.riderOf(top.id); next; next = this.riderOf(top.id)) {
        if (next === c) break
        top = next
      }
      return top.kind === 'egg' || (top !== b && b.kind === 'teapot') ? null : top
    }
    return null
  }

  // --- what follows ---------------------------------------------------------

  private tuck(c: Chick, byTap: boolean): void {
    const was = this.place(c)
    const rider = this.riderOf(c.id)
    if (rider) this.getDown(rider, 60)
    if (byTap) { this.undo = { id: c.id, mother: c.mother }; this.wing = WING_S + TUCK_S } else { this.undo = null; this.wing = 0 }
    const ring = ringOf(c.id, this.mothers)
    if (ring) for (const id of ring) { const o = this.one(id); if (o) o.dizzy = false }
    c.kind = 'egg'
    c.mother = null
    c.host = null
    c.dizzy = false
    c.thread = 0
    c.act = null
    c.hop = null
    c.from = { x: was.x, y: was.y - was.z }
    c.tucking = 0
    const at = this.nestSpot(c)
    c.x = at.x
    c.y = at.y
    c.z = 0
    this.act(this.hen, 'henFluff')
    this.sound('hen.tuck')
    this.change(true)
  }

  private nestSpot(self?: Chick): Spot {
    return this.spotFor(self ?? body('puddle', 'egg', HEN), { x: HEN.x - 152, y: HEN.y + 74 })
  }

  /** Down from what it rides, onto free ground. */
  private getDown(c: Chick, aside: number): void {
    const p = this.place(c)
    c.host = null
    c.z = 0
    const host = { x: p.x + aside, y: p.y + 46 }
    this.hopTo(c, p, p.z, this.spotFor(c, host))
    this.change(true)
  }

  private hopTo(b: Body, from: Spot, z: number, to: Spot): void {
    b.x = to.x
    b.y = to.y
    b.z = 0
    b.hop = { x: from.x, y: from.y, z, t: 0, lasts: 0.4 }
  }

  /** A place the game chooses: free ground, with nothing hidden. */
  private spotFor(b: Body, want: Spot): Spot {
    const solids = this.solids(b.id, true), r = SIZE[b.kind].r, sight = (p: Spot) => this.leavesInSight(b, p)
    const p = freeSpot(want, r, solids, sight)
    return sight(p) ? p : freeSpot(want, r, solids)
  }

  /** Where a thing let go stands: where the child let it go, or, where it cannot, the nearest place the game would choose. */
  private childSpot(b: Body): Spot {
    const there = freeSpot(b, SIZE[b.kind].r, this.solids(b.id, true))
    return apart(there, b) < 1 ? there : this.spotFor(b, b)
  }

  /** Whatever stands on the ground, for finding free ground round it. */
  private solids(but: Id, brood: boolean): (Spot & { r: number })[] {
    const out: (Spot & { r: number })[] = [{ x: HEN.x, y: HEN.y, r: SIZE.hen.r }]
    for (const k of THINGS) {
      if (k === but || this.carried(k)) continue
      const b = this.things[k], at = b.go ?? b
      out.push({ x: at.x, y: at.y, r: SIZE[k].r })
      if (b.go) out.push({ x: b.x, y: b.y, r: SIZE[k].r })
    }
    if (brood) for (const c of this.brood) {
      if (c.id === but || c.host || this.carried(c.id)) continue
      if (c.kind === 'egg') out.push({ x: c.x, y: c.y, r: SIZE.egg.r })
    }
    return out
  }

  /** Whether a body at `p` would stand in front of the middle of anything else that answers, or behind another so that its own middle is hidden. */
  private leavesInSight(b: Body, p: Spot): boolean {
    const others = [...THINGS.map((k) => this.things[k]), this.hen, ...this.brood.filter((c) => c.kind === 'egg' && !c.host)]
    return others.every((o) => o === b || this.carried(o.id) || !(hides(b, p, o, o) || hides(o, o, b, p)))
  }

  /** Plays an act on one body alone. */
  private act(b: Body, name: ActName, amount = 1): void {
    b.act = { name, t: 0, amount }
  }

  /** Plays an act, and every chick down the chain does it after, one beat later for each step. */
  perform(b: Body, name: ActName, steps = 0, seen: readonly Id[] = []): void {
    this.act(b, name, steps === 0 ? 1 : 0.8)
    const line = [...seen, b.id]
    for (const id of childrenOf(b.id, this.mothers)) {
      if (line.includes(id)) continue
      this.after(BEAT, () => {
        const c = this.one(id)
        if (!c || c.kind !== 'chick' || c.tucking !== null || c.opening !== null || this.carried(c.id)) return
        this.perform(c, name, steps + 1, line)
        this.cry(c, steps)
      })
    }
  }

  private cry(c: Chick, extra: number): void {
    void extra
    this.sound(`cry.${this.gait(c)}`, stepsOf(c.id, this.mothers))
  }

  private after(seconds: number, run: () => void, round = false): void {
    this.later.push({ at: this.time + seconds, run, round })
  }

  /** All five belong in the end to one thing, and it is tapped: the sheep and the cow take the round up. */
  private maybeRound(k: ThingKey): void {
    if (this.brood.length < BROOD.length) return
    let deepest = 0
    for (const c of this.brood) {
      const line = lineOf(c.id, this.mothers)
      if (c.kind !== 'chick' || line.kind !== 'root' || line.root !== k) return
      deepest = Math.max(deepest, line.depth)
    }
    const start = (deepest + 1) * BEAT + 0.3
    for (let i = 0; i < 3; i++) this.after(start + i * 0.5, () => { this.scenery.sheep = 0; this.sound('scenery.sheep') }, true)
    this.after(start + 1.7, () => { this.cowFaces = 3.2; this.sound('round.cow') }, true)
  }

  private endRound(): void {
    this.cowFaces = 0
    this.later = this.later.filter((l) => !l.round)
  }

  private sound(name: string, steps = 0): void {
    this.sounds.push({ name, steps })
    if (this.sounds.length > 24) this.sounds.shift()
  }

  private change(now = false): void {
    this.changed = now ? 'now' : this.changed === 'now' ? 'now' : 'soon'
  }

  puff(kind: Fx['kind'], x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng.next()
      const up = kind === 'steam' || kind === 'bubble'
      this.fx.push({ kind, x: x + (a - 0.5) * 40, y, z: up ? 10 + a * 20 : 14, vx: (this.rng.next() - 0.5) * (up ? 40 : 190), vz: up ? 60 + a * 50 : kind === 'dust' ? 50 + a * 50 : 190 + a * 150, age: -i * 0.03, lasts: up ? 1.1 : 0.8, turn: a * 6 })
    }
    if (this.fx.length > 70) this.fx.splice(0, this.fx.length - 70)
  }

  // --- time -----------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    const due = this.later.filter((l) => l.at <= this.time)
    this.later = this.later.filter((l) => l.at > this.time)
    for (const l of due) l.run()
    if (this.gag) {
      this.gag.t += dt
      if (this.gag.t >= GAG_S) { const b = this.things[this.gag.thing]; this.gag = null; this.act(b, SET[b.kind as ThingKey]); this.sound(`set.${b.kind}`) }
    }
    this.wing = Math.max(0, this.wing - dt)
    if (this.wing === 0) this.undo = null
    this.puddleT += dt
    this.cowFaces = Math.max(0, this.cowFaces - dt)
    for (const key of Object.keys(this.scenery) as SceneryKey[]) this.scenery[key] += dt
    for (const d of this.dabs) d.t += dt
    if (this.dent) { this.dent.t += dt; if (this.dent.t > 0.5) this.dent = null }
    for (const c of this.creases) c.t += dt
    this.creases = this.creases.filter((c) => c.t < 1.6)
    this.dabs = this.dabs.filter((d) => d.t < 0.6)
    for (const f of this.fx) {
      f.age += dt
      if (f.age < 0) continue
      f.x += f.vx * dt
      f.z = Math.max(0, f.z + f.vz * dt)
      if (f.kind !== 'steam' && f.kind !== 'bubble') f.vz -= 620 * dt
    }
    this.fx = this.fx.filter((f) => f.age < f.lasts)
    for (const b of [this.hen, ...THINGS.map((k) => this.things[k]), ...this.brood]) this.bodyStep(b, dt)
    for (const c of this.brood) this.openStep(c, dt)
    this.follow(dt)
    this.knock(dt)
  }

  private bodyStep(b: Body, dt: number): void {
    if (b.act) { b.act.t += dt; if (b.act.t >= actLasts(b.act.name)) b.act = null }
    if (b.hop) { b.hop.t += dt; if (b.hop.t >= b.hop.lasts) { b.hop = null; b.squashV -= 2.2 } }
    b.squashV += (-b.squash * 190 - b.squashV * 13) * dt
    b.squash += b.squashV * dt
    const before = { x: b.x, y: b.y }
    if (b.go && !this.carried(b.id)) {
      const dx = b.go.x - b.x, dy = b.go.y - b.y, d = Math.hypot(dx, dy), step = b.go.speed * dt
      if (d <= step) { b.x = b.go.x; b.y = b.go.y; b.go = null; this.change() } else { b.x += (dx / d) * step; b.y += (dy / d) * step }
      if (b.kind === 'ball') b.spin += ((b.x - before.x) / 60)
      this.heading(b, b.x - before.x, b.y - before.y)
    }
    if (!isBrood(b.id)) {
      const moved = Math.hypot(b.x - before.x, b.y - before.y)
      b.going += ((moved > 0 ? 1 : 0) - b.going) * Math.min(1, dt * 8)
      b.phase += moved / 40
    }
  }

  private heading(b: Body, dx: number, dy: number): void {
    const d = Math.hypot(dx, dy)
    if (d < 0.2) return
    const k = Math.min(1, d / 30)
    b.hx += (dx / d - b.hx) * k
    b.hy += (dy / d - b.hy) * k
  }

  private lastNearest = new Map<BroodId, Id>()

  private openStep(c: Chick, dt: number): void {
    c.thread = Math.max(0, c.thread - dt)
    c.shell = Math.max(0, c.shell - dt)
    if (c.laying !== null) { c.laying += dt; if (c.laying >= LAY_S) { c.laying = null; this.act(c, 'eggRock'); this.sound('egg.set') } }
    if (c.tucking !== null) {
      const was = c.tucking
      c.tucking += dt
      if (was < 1.2 && c.tucking >= 1.2) { this.sound('hen.pop'); this.puff('feather', HEN.x - 60, HEN.y - 30, 5) }
      if (c.tucking >= TUCK_S) { c.tucking = null; this.act(c, 'eggRock') }
    }
    if (c.opening === null) return
    const was = c.opening
    c.opening += dt
    const now = c.opening
    if (was < LAND) {
      const near = this.nearest(c)
      if (this.lastNearest.get(c.id) !== near) { this.lastNearest.set(c.id, near); this.change() }
    }
    if (was < LID && now >= LID) {
      const p = this.place(c)
      this.sound('egg.lid')
      this.puff('shell', p.x, p.y - p.z - 60, 6)
    }
    if (was < LAND && now >= LAND) this.land(c)
    if (now >= OUT) {
      c.opening = null
      c.shell = 0
      const p = this.place(c)
      this.puff('shell', p.x, p.y, 5)
      c.squashV += 4
      this.sound('egg.out')
    }
  }

  /** The eyes land, and that is its mother. */
  private land(c: Chick): void {
    const mother = this.nearest(c)
    const m = this.of(mother)
    const egg = m?.kind === 'egg'
    c.kind = 'chick'
    c.mother = mother
    c.thread = OUT - LAND + 0.5
    c.stance = this.rng.next() * 10
    this.lastNearest.delete(c.id)
    // A ring that has just closed turns.
    const ring = ringOf(c.id, this.mothers)
    if (ring) for (const id of ring) { const o = this.one(id); if (o) o.dizzy = false }
    this.act(c, 'chickCry')
    this.sound('thread')
    this.cry(c, 0)
    const at = this.place(m ?? c)
    this.watch = { x: at.x, y: at.y - 60 }
    this.after(0.35, () => {
      if (mother === c.id) { this.puddleT = 0; this.sound('puddle'); return }
      const b = this.of(mother)
      if (!b) return
      if (mother === 'hen') { this.sound('seen.hen') } else if (isBrood(mother)) { this.act(b, b.kind === 'egg' ? 'eggRock' : 'chickCry'); this.sound(b.kind === 'egg' ? 'egg.set' : `cry.${this.gait(b as Chick)}`, 1) } else if (!b.act) { this.act(b, SEEN[mother as ThingKey]); this.sound(`seen.${mother}`) }
    })
    this.after(0.75, () => { if (!this.gag && this.hen.act?.name !== 'henFluff' && this.hen.act?.name !== 'henLay') { this.act(this.hen, henLook(mother, c.id, egg)); this.sound(`look.${mother === c.id ? 'self' : isBrood(mother) ? (egg ? 'egg' : 'chick') : mother}`) } })
    this.change(true)
  }

  /** Where a chick stands by its mother: behind her as she goes, and beside her as she stands, each of several in a place of its own. */
  private slot(c: Chick, m: Body): Spot {
    const at = this.place(m)
    const kin = this.brood.filter((o) => o.mother === m.id && o.id !== c.id && o.id < c.id && o.kind === 'chick' && o.host === null).length
    const gapR = SIZE[m.kind].r + SIZE.chick.r + 12
    const back = Math.atan2(-m.hy / SQUAT, -m.hx) + ([0, 0.85, -0.85, 1.6, -1.6][kin] ?? 0)
    const there = (turn: number): Spot => ({ x: at.x + Math.cos(back + turn) * gapR, y: at.y + Math.sin(back + turn) * gapR * SQUAT })
    if (m.going > 0.3) return clampSpot(there(0))
    // She stands: the nearest place round her that is in the yard, clear, and in sight.
    const bodies = [...THINGS.map((k) => this.things[k]), this.hen].filter((o) => !this.carried(o.id) && this.gag?.thing !== o.id)
    // Away from the edges of the yard first, or those who follow have nowhere to stand.
    for (const edge of [56, 0]) for (const turn of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.6, -2.6, Math.PI]) {
      const p = there(turn)
      if (p.x < GROUND.left + edge || p.x > GROUND.right - edge || p.y < GROUND.top + edge * 0.6 || p.y > GROUND.bottom) continue
      if (this.brood.every((o) => o === c || o === m || o.mother === c.id || o.host || apart(p, o) >= SIZE[o.kind].r + SIZE.chick.r - 8) && bodies.every((o) => apart(p, o) >= SIZE[o.kind].r + SIZE.chick.r - 2 && !hides(o, o, c, p) && !hides(c, p, o, o))) return p
    }
    return clampSpot(there(0))
  }

  private follow(dt: number): void {
    const mothers = this.mothers
    const live = new Set<string>()
    for (const c of this.brood) {
      const before = { x: c.x, y: c.y }
      if (this.free(c) && !c.hop) {
        const ring = ringOf(c.id, mothers)
        let to: Spot | null = null, quick = 0
        if (ring && this.running(ring)) {
          const ids = [...ring].sort()
          const key = ids.join()
          live.add(key)
          let st = this.rings.get(key)
          const R = RING_R[ring.length]
          if (!st) {
            const members = ring.map((id) => this.one(id)!)
            const mid = { x: members.reduce((s, o) => s + o.x, 0) / ring.length, y: members.reduce((s, o) => s + o.y, 0) / ring.length }
            const first = this.one(ids[0])!
            st = { ...this.ringSpot(mid, ring), a: Math.atan2((first.y - mid.y) / SQUAT, first.x - mid.x) }
            this.rings.set(key, st)
          }
          if (c.id === ids[0]) {
            st.a += dt * (ring.length === 1 ? 4.2 : 1.9)
            const clear = this.ringSpot(st, ring)
            st.x += (clear.x - st.x) * Math.min(1, dt * 2)
            st.y += (clear.y - st.y) * Math.min(1, dt * 2)
          }
          // Each runs after its mother, so the order round is the order of the ring.
          const first = ring.indexOf(ids[0])
          const i = (ring.indexOf(c.id) - first + ring.length) % ring.length
          const a = st.a - (i / ring.length) * Math.PI * 2
          to = { x: st.x + Math.cos(a) * R, y: st.y + Math.sin(a) * R * SQUAT }
          quick = 520
        } else if (!(ring && c.dizzy) && c.mother && c.mother !== c.id) {
          const m = this.of(c.mother)
          if (m) {
            to = this.slot(c, m)
            const d = apart(c, to)
            // Once it stands beside her it stays there until she goes off: a place that comes free is no reason to walk.
            if (d < 16) c.settled = true
            if (apart(c, this.place(m)) > SIZE[m.kind].r + SIZE.chick.r + 46) c.settled = false
            quick = c.settled ? 0 : Math.min(330, 60 + d * 2.1)
          }
        }
        if (to && quick > 0) {
          const dx = to.x - c.x, dy = to.y - c.y, d = Math.hypot(dx, dy)
          const step = Math.min(d, quick * dt)
          if (d > 0.01) { c.x += (dx / d) * step; c.y += (dy / d) * step }
        }
        this.part(c, ring && this.running(ring) ? ring : null, to, dt)
      }
      const mx = c.x - before.x, my = c.y - before.y, moved = Math.hypot(mx, my)
      const going = moved / dt > 26 ? 1 : 0
      c.going += (going - c.going) * Math.min(1, dt * 7)
      c.phase += moved / 30
      c.stance += dt
      if (this.free(c) && moved / dt > 14) {
        this.heading(c, mx, my)
        if (Math.abs(mx) > Math.abs(my) * 0.3 && Math.abs(mx) / dt > 12) c.dir = mx > 0 ? 1 : -1
      } else if (this.free(c) && c.mother && c.mother !== c.id && c.going < 0.1) {
        const m = this.of(c.mother)
        if (m) { const at = this.place(m); if (Math.abs(at.x - c.x) > 8) c.dir = at.x > c.x ? 1 : -1 }
      }
    }
    for (const key of [...this.rings.keys()]) if (!live.has(key)) this.rings.delete(key)
  }

  private ringSpot(want: Spot, ring: readonly BroodId[]): Spot {
    const r = RING_R[ring.length] + SIZE.chick.r
    const solids = this.solids('puddle', false).concat(this.brood.filter((o) => o.kind === 'egg' && !o.host && !this.carried(o.id)).map((o) => ({ x: o.x, y: o.y, r: SIZE.egg.r })))
    const inside = { x: Math.min(GROUND.right - r, Math.max(GROUND.left + r, want.x)), y: Math.min(GROUND.bottom - r * SQUAT, Math.max(GROUND.top + r * SQUAT, want.y)) }
    const spot = freeSpot(inside, r, solids)
    return { x: Math.min(GROUND.right - r, Math.max(GROUND.left + r, spot.x)), y: Math.min(GROUND.bottom - r * SQUAT, Math.max(GROUND.top + r * SQUAT, spot.y)) }
  }

  /** Keeps a chick out of everything that stands on the ground, and out from behind what would hide it. */
  private part(c: Chick, ring: readonly BroodId[] | null, to: Spot | null, dt: number): void {
    const push = (o: Spot, r: number, hard: number) => {
      const need = SIZE.chick.r + r, dx = c.x - o.x, dy = (c.y - o.y) / SQUAT, d = Math.hypot(dx, dy)
      if (d >= need) return
      const over = need - d
      const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0
      // A little to the side as well, so a chick in the way goes round instead of stopping against it.
      const k = Math.min(1, dt * 18)
      const t = to && (to.x - c.x) * -uy + ((to.y - c.y) / SQUAT) * ux < 0 ? -0.5 : 0.5
      c.x += (ux * hard - uy * t * k) * over
      c.y += (uy * hard + ux * t * k) * over * SQUAT
    }
    push(HEN, SIZE.hen.r, 1)
    for (const t of THINGS) if (!this.carried(t) && this.gag?.thing !== t) push(this.things[t], SIZE[t].r, 1)
    for (const o of this.brood) {
      if (o === c || o.host || o.tucking !== null || this.carried(o.id) || ring?.includes(o.id)) continue
      push(o, SIZE[o.kind].r, 0.3)
    }
    if (!ring) {
      for (const o of [...THINGS.map((k) => this.things[k]), this.hen, ...this.brood.filter((b) => b !== c && !b.host && b.tucking === null)]) {
        if (this.carried(o.id) || o.going > 0.2 || (!hides(o, o, c, c) && !hides(c, c, o, o))) continue
        const side = to && Math.abs(to.x - o.x) > 10 ? to.x >= o.x : c.x >= o.x
        c.x += (side ? 1 : -1) * (o.kind === 'chick' || o.kind === 'egg' ? 80 : 190) * dt
      }
    }
    const at = clampSpot(c)
    c.x = at.x
    c.y = at.y
    // Shut in between two things: it flaps out to free ground.
    const shut = THINGS.some((k) => !this.carried(k) && this.gag?.thing !== k && !this.things[k].go && apart(c, this.things[k]) < SIZE.chick.r + SIZE[k].r - 8)
    c.stuck = shut ? c.stuck + dt : 0
    if (c.stuck > 0.8) { c.stuck = 0; this.act(c, 'chickFlap'); this.hopTo(c, c, 0, this.spotFor(c, c)) }
  }

  private knock(dt: number): void {
    const c = this.asking
    if (!c || !this.knocking) { this.knockT = 1.4; return }
    this.knockT -= dt
    if (this.knockT > 0) return
    this.knockT = 3.2
    if (!c.act) { this.act(c, 'eggKnock'); this.sound('egg.knock') }
  }

  // --- put away -------------------------------------------------------------

  /** The game goes to rest: what lies under a finger goes back, and an opening egg takes what stands nearest. */
  settle(): void {
    this.cancel()
    this.later = []
    this.sounds = []
    for (const c of this.brood) {
      if (c.opening !== null && c.opening < LAND) { c.kind = 'chick'; c.mother = this.nearest(c) }
      c.opening = null
      c.tucking = null
      c.laying = null
      c.thread = 0
      c.hop = null
    }
    for (const k of THINGS) { const b = this.things[k]; if (b.go) { b.x = b.go.x; b.y = b.go.y; b.go = null } b.act = null; b.hop = null }
    this.gag = null
    this.wing = 0
    this.undo = null
    this.fx = []
    this.cowFaces = 0
    this.change(true)
  }

  toState(): GameState {
    const carry = this.carry
    const spot = (b: Body): Spot & { dir: 1 | -1 } => (carry?.id === b.id ? carry.from : { x: b.go?.x ?? b.x, y: b.go?.y ?? b.y, dir: b.dir })
    const round = (n: number) => Math.round(n * 10) / 10
    return {
      v: STATE_VERSION,
      things: Object.fromEntries(THINGS.map((k) => { const p = spot(this.things[k]); return [k, { x: round(p.x), y: round(p.y), dir: p.dir }] })) as GameState['things'],
      brood: this.brood.map((c) => {
        const p = spot(c), opens = c.opening !== null && c.kind === 'egg'
        return { id: c.id, kind: opens ? 'chick' : c.kind, x: round(p.x), y: round(p.y), mother: opens ? this.nearest(c) : c.mother, host: carry?.id === c.id ? carry.host : c.host, dizzy: c.dizzy }
      }),
    }
  }

  /** A pick that changes nothing in play: which small habit comes next. */
  chance(n: number): number {
    return below(this.rng, n)
  }
}

/** Whether `front`, standing at `fp`, is drawn over the middle of `back`, standing at `bp`. */
export function hides(front: Body, fp: Spot, back: Body, bp: Spot): boolean {
  if (fp.y <= bp.y) return false
  const fs = scaleAt(fp.y), bs = scaleAt(bp.y)
  const fm = { x: fp.x, y: fp.y - SIZE[front.kind].h * 0.48 * fs }, bm = { x: bp.x, y: bp.y - SIZE[back.kind].h * 0.48 * bs }
  return Math.hypot((bm.x - fm.x) / (SIZE[front.kind].w * 0.4 * fs), (bm.y - fm.y) / (SIZE[front.kind].h * 0.42 * fs)) < 1
}
