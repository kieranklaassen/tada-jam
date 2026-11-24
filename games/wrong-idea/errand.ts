import type { Point } from './input'
import { BUTLER_HOME, LANE, SIZE, VESSELS, slotOf, type Spot } from './layout'
import { isEverything, type Idea } from './learner'
import { thingOf, type Place, type ThingId, type Where } from './things'
import type { VoiceName } from './voices'

// The butler at work. He has no list: each time his hands are empty he looks
// for the next thing that is not where his idea says, fetches it, and throws
// it in. So whatever the child does meanwhile, he carries on from where he
// stands. He works a little faster the longer an errand runs.

export type World = {
  next(): ThingId[] | null
  targetOf(id: ThingId): Where
  spotOf(id: ThingId): Spot
  /** Still resting where he saw it, and still wrong there. */
  free(id: ThingId): boolean
  took(id: ThingId, n: number): void
  tossed(id: ThingId, where: Where): void
  butlerTo(): Place | null
  /** Something is still in the air, worn, or in the child's hand. */
  others(): boolean
  landed(place: Place): void
  say(name: VoiceName): void
}

export const THINK = { freeze: 0.34, show: 0.9, settle: 0.66 } as const
export const THINK_SECONDS = THINK.freeze + THINK.show + THINK.settle
const REACH_SECONDS = 0.3
const TOSS_SECONDS = 0.24
const SELF_LOOK = 1.3
const JUMP_SECONDS = 0.62
const SPEED = 520
const FASTEST = 940
/** The bubble stays this long after the last of an errand. */
const LINGER = 2.4

type Act =
  | { do: 'idle' }
  | { do: 'think'; t: number }
  | { do: 'fetch'; ids: ThingId[] }
  | { do: 'reach'; ids: ThingId[]; t: number; to: Point }
  | { do: 'carry' }
  | { do: 'toss'; t: number }
  | { do: 'look'; t: number; place: Place }
  | { do: 'jump'; t: number; from: Spot; place: Place | null }

export class Errand {
  act: Act = { do: 'idle' }
  x: number = BUTLER_HOME.x
  /** Which way he faces and how fast he goes, for the view. */
  speed = 0
  stride = 0
  load: ThingId[] = []
  /** The place he has put himself in, or null. */
  inside: Place | null
  /** What he is thinking, for the bubble: the examples, then the idea. */
  thought: { place: Place; examples: readonly ThingId[]; idea: Idea | null; t: number } | null = null
  /** 0..1 how far up the bubble is. */
  bubble = 0
  private linger = 0
  private hurry = 0
  private foot = false
  /** A thought that came while he was in the air. */
  private owed = false

  constructor(inside: Place | null) {
    this.inside = inside
  }

  get busy(): boolean {
    return this.act.do !== 'idle'
  }

  /** Where he is: on the floor, in the air, or in a place. */
  spot(): Spot {
    if (this.act.do === 'jump') {
      const { from, t, place } = this.act
      const to: Spot = place ? slotOf('butler', place) : { x: this.x, y: BUTLER_HOME.y, s: 1 }
      const p = Math.min(1, t / JUMP_SECONDS), e = p * p * (3 - 2 * p)
      return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - Math.sin(Math.PI * p) * 190, s: from.s + (to.s - from.s) * e }
    }
    if (this.inside) return slotOf('butler', this.inside)
    return { x: this.x, y: BUTLER_HOME.y, s: 1 }
  }

  /** Where the nth thing of his load is held: stacked over his head. */
  loadSpot(n: number, id: ThingId): Spot {
    const at = this.spot()
    let up = SIZE.butler.h * at.s + 6
    for (let i = 0; i < n; i++) up += (SIZE[thingOf(this.load[i] ?? id).kind]?.h ?? 80) * 0.62
    const sway = Math.sin(this.stride * 2 + n) * (4 + n * 5) * Math.min(1, Math.abs(this.speed) / 300)
    const alive = thingOf(id).heavy
    return { x: at.x + sway, y: at.y - up + (alive ? 46 : 10), s: alive ? 0.72 : 0.9 }
  }

  /** What his eyes are on. */
  watching(): Point | null {
    if (this.act.do === 'reach') return this.act.to
    if (this.act.do === 'toss' || this.act.do === 'carry') return { x: this.x, y: 520 }
    return null
  }

  think(place: Place, examples: readonly ThingId[], idea: Idea | null): void {
    this.thought = { place, examples: [...examples], idea, t: 0 }
    this.linger = LINGER
    this.hurry = 0
    // In the air he lands first.
    if (this.act.do === 'jump') this.owed = true
    else this.act = { do: 'think', t: 0 }
  }

  /** The child took a thing out of his hands. */
  lose(id: ThingId): void {
    this.load = this.load.filter((one) => one !== id)
  }

  /** The bell: his hands are empty and his head too. */
  home(): void {
    this.load = []
    this.thought = null
    this.owed = false
    if (this.inside || this.act.do === 'jump') {
      const from = this.spot()
      this.inside = null
      this.act = { do: 'jump', t: 0, from, place: null }
    } else this.act = { do: 'idle' }
  }

  private walk(to: number, dt: number): boolean {
    const goal = Math.max(LANE.left, Math.min(LANE.right, to))
    const gap = goal - this.x
    const most = Math.min(FASTEST, SPEED + this.hurry * 42)
    const move = Math.sign(gap) * Math.min(Math.abs(gap), most * dt)
    this.x += move
    this.speed += (move / Math.max(dt, 1e-4) - this.speed) * Math.min(1, dt * 14)
    this.stride += Math.abs(move) / 46
    return Math.abs(goal - this.x) < 1
  }

  private footsteps(before: number, world: World): void {
    if (Math.floor(this.stride / Math.PI) === Math.floor(before / Math.PI)) return
    this.foot = !this.foot
    world.say(this.foot ? 'stepLeft' : 'stepRight')
  }

  step(dt: number, world: World): void {
    const before = this.stride
    const act = this.act
    this.bubble += ((this.thought ? 1 : 0) - this.bubble) * Math.min(1, dt * 9)
    if (this.thought) this.thought.t += dt
    let walking = false
    switch (act.do) {
      case 'idle': {
        const ids = world.next()
        const to = world.butlerTo()
        if (ids || (this.load.length > 0)) {
          if (this.inside) this.leap(null)
          else if (this.load.length > 0) this.act = { do: 'carry' }
          else this.act = { do: 'fetch', ids: ids! }
        } else if (this.inside !== to && !world.others()) {
          if (to && !this.inside) this.act = { do: 'look', t: 0, place: to }
          else this.leap(null)
        } else {
          if (!this.inside && Math.abs(this.x - BUTLER_HOME.x) > 1) {
            walking = true
            this.walk(BUTLER_HOME.x, dt)
          }
          if (this.thought && (this.linger -= dt) <= 0) this.thought = null
        }
        break
      }
      case 'think': {
        const was = act.t
        act.t += dt
        if (was === 0) world.say('ah')
        const at = THINK.freeze + THINK.show
        if (was < at && act.t >= at && this.thought?.idea) world.say(isEverything(this.thought.idea) ? 'everything' : 'idea')
        if (act.t >= THINK_SECONDS) this.act = { do: 'idle' }
        break
      }
      case 'fetch': {
        const ids = act.ids.filter((id) => world.free(id))
        if (ids.length === 0) {
          this.act = { do: this.load.length > 0 ? 'carry' : 'idle' }
          break
        }
        act.ids = ids
        const first = world.spotOf(ids[0])
        const middle = ids.reduce((sum, id) => sum + world.spotOf(id).x, 0) / ids.length
        walking = true
        // He stands beside what he lifts, his arms do the rest.
        if (this.walk(Math.abs(first.x - middle) > 260 ? first.x : middle, dt)) this.act = { do: 'reach', ids, t: 0, to: world.spotOf(ids[0]) }
        break
      }
      case 'reach': {
        act.t += dt
        if (act.t < REACH_SECONDS) break
        const [id, ...rest] = act.ids
        if (world.free(id)) {
          this.load.push(id)
          world.took(id, this.load.length - 1)
          this.hurry += 1
        }
        this.act = rest.length > 0 ? { do: 'reach', ids: rest, t: 0, to: world.spotOf(rest[0]) } : { do: 'carry' }
        break
      }
      case 'carry': {
        if (this.load.length === 0) {
          this.act = { do: 'idle' }
          break
        }
        const where = world.targetOf(this.load[0])
        walking = true
        // Home is thrown from where he stands.
        if (where === 'home' || this.walk(VESSELS[where].x, dt)) this.act = { do: 'toss', t: 0 }
        break
      }
      case 'toss': {
        act.t += dt
        if (act.t < TOSS_SECONDS) break
        if (this.load.length > 0) {
          const id = this.load[0], where = world.targetOf(id)
          this.load.shift()
          world.tossed(id, where)
          const next = this.load[0]
          this.act = next !== undefined && world.targetOf(next) === where ? { do: 'toss', t: 0 } : { do: this.load.length > 0 ? 'carry' : 'idle' }
        } else this.act = { do: 'idle' }
        break
      }
      case 'look': {
        if (act.t === 0) world.say('quack')
        act.t += dt
        walking = true
        const there = this.walk(VESSELS[act.place].x, dt)
        if (world.butlerTo() !== act.place || world.next()) this.act = { do: 'idle' }
        else if (there && act.t >= SELF_LOOK) this.leap(act.place)
        break
      }
      case 'jump': {
        act.t += dt
        if (act.t < JUMP_SECONDS) break
        this.inside = act.place
        if (act.place) world.landed(act.place)
        this.act = this.owed ? { do: 'think', t: 0 } : { do: 'idle' }
        this.owed = false
        break
      }
    }
    if (!walking) this.speed *= Math.max(0, 1 - dt * 10)
    this.footsteps(before, world)
  }

  private leap(place: Place | null): void {
    const from = this.spot()
    if (this.inside) this.x = VESSELS[this.inside].x
    this.inside = null
    this.act = { do: 'jump', t: 0, from, place }
  }
}
