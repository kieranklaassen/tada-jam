import type { Note } from './audio'
import { Errand } from './errand'
import { exampleIn, freshHouse, ideaOf, isTidy, put, take, type House } from './house'
import type { Gesture, Point } from './input'
import { DREAM, ROPE, ROPE_MOST, ROPE_PULL, SIZE, VESSELS, bodyMiddle, homeOf, onThing, placeAt, slotOf, type Spot } from './layout'
import type { Idea } from './learner'
import { Mover, springTo, type Character, type Spring } from './motion'
import type { Saved } from './save'
import { BUTLER, PLACES, THINGS, thingOf, type Place, type ThingId, type Where } from './things'
import { VOICES, landVoice, pokeVoice, type VoiceName } from './voices'
import { WISHES, isMet, nextWish } from './wishes'

// The game with no browser in it. Gestures come in stage units and time in
// seconds; the Mount and the tests both play it through here.
// - The saved house says where everything ends up. What is on screen (`shown`)
//   is on its way there, and the butler (errand.ts) carries it.
// - A thing the child holds is nobody else's. A cancel puts it back where it
//   came from and changes nothing.

/** Where a thing on screen is now. */
export type Shown =
  | { mode: 'rest'; where: Where }
  | { mode: 'hand'; from: Where; at: Point }
  | { mode: 'butler'; n: number }
  | { mode: 'fly'; from: Spot; where: Where; t: number; dur: number; high: number }
  | { mode: 'worn'; by: ThingId; t: number; dy: number }

export type Splash = { place: Place; t: number; x: number; big: boolean }
export type Ring = { x: number; y: number; t: number }

/** How long a thing let go on somebody is worn. */
export const WORN_SECONDS = 1.7
export const SCENE_SECONDS = 5
const GRAN_BOUNCE = 0.5

export class Play {
  readonly shown: Record<ThingId, Shown> = {}
  readonly squash: Record<ThingId, Spring> = {}
  readonly movers: Record<string, Mover> = {}
  readonly errand: Errand
  readonly rope: Spring = { x: 0, v: 0 }
  readonly slosh: Record<Place, Spring> = { bed: { x: 0, v: 0 }, soup: { x: 0, v: 0 }, bath: { x: 0, v: 0 } }
  readonly splashes: Splash[] = []
  readonly rings: Ring[] = []
  /** How far each heavy person is pulled out of shape by a tug. */
  readonly tug: Record<ThingId, Spring> = {}
  time = 0
  /** Where the eyes look: the finger, or what is moving. */
  gaze: Point = { x: 590, y: 560 }
  gazeHeld = 0
  /** Seconds into the grandmother's laugh, or null. */
  scene: number | null = null
  /** Whether the dream bubble has been shown since it was dreamed: it waits for the first errand to end. */
  dreamShown = 0
  private held: { kind: 'thing'; id: ThingId; grab: Point } | { kind: 'tug'; id: ThingId; from: Point } | { kind: 'rope'; from: number } | null = null
  private pressed: ThingId | null = null
  private turn = 0
  private queue: Note[][] = []
  private dirty = false

  constructor(readonly saved: Saved, seed: number) {
    for (const one of THINGS) {
      this.shown[one.id] = { mode: 'rest', where: saved.house.at[one.id] }
      this.squash[one.id] = { x: 0, v: 0 }
      this.tug[one.id] = { x: 0, v: 0 }
      if (one.alive) this.movers[one.id] = new Mover(one.kind as Character, seed + one.id.length * 97)
    }
    this.squash.butler = { x: 0, v: 0 }
    this.movers.butler = new Mover('butler', seed + 5)
    this.errand = new Errand(saved.house.butler)
    this.dreamShown = saved.dreaming ? 1 : 0
  }

  get house(): House {
    return this.saved.house
  }

  idea(place: Place): Idea | null {
    return ideaOf(this.house, place)
  }

  /** The child is doing something, or the game is. */
  get busy(): boolean {
    return this.held !== null || this.scene !== null || this.errand.busy || this.errand.inside !== this.house.butler || THINGS.some((one) => this.shown[one.id].mode !== 'rest' || this.house.at[one.id] !== (this.shown[one.id] as { where: Where }).where)
  }

  get holding(): ThingId | null {
    return this.held?.kind === 'thing' ? this.held.id : null
  }

  voices(): Note[][] {
    const out = this.queue
    this.queue = []
    return out
  }

  /** Whether something changed that should be saved, asked once. */
  changed(): boolean {
    const was = this.dirty
    this.dirty = false
    return was
  }

  say(name: VoiceName): void {
    this.queue.push(VOICES[name])
  }

  // --- Where things are -------------------------------------------------------

  restSpot(id: ThingId, where: Where): Spot {
    return where === 'home' ? homeOf(id) : slotOf(id, where)
  }

  spotOf(id: ThingId): Spot {
    const now = this.shown[id]
    switch (now.mode) {
      case 'rest': return this.restSpot(id, now.where)
      case 'hand': return { x: now.at.x, y: now.at.y, s: 1.08 }
      case 'butler': return this.errand.loadSpot(now.n, id)
      case 'worn': {
        const on = this.headOf(now.by)
        return { x: on.x, y: on.y + 30 + now.dy, s: 0.82 }
      }
      case 'fly': {
        const to = this.restSpot(id, now.where), p = Math.max(0, Math.min(1, now.t / now.dur))
        return {
          x: now.from.x + (to.x - now.from.x) * p,
          y: now.from.y + (to.y - now.from.y) * p - Math.sin(Math.PI * p) * now.high,
          s: now.from.s + (to.s - now.from.s) * p,
        }
      }
    }
  }

  private headOf(id: ThingId): Point {
    const spot = id === BUTLER.id ? this.errand.spot() : this.spotOf(id)
    return { x: spot.x, y: spot.y - SIZE[thingOf(id).kind].h * spot.s }
  }

  /** The butler is a target too: where he stands or lies. */
  private onButler(at: Point): boolean {
    return onThing(BUTLER.id, this.errand.spot(), at, 0)
  }

  /** What a finger landing here takes: the nearest of what it is on, small before large, and nearer the front first. */
  pick(at: Point): ThingId | null {
    let best: ThingId | null = null, score = Infinity
    for (const one of THINGS) {
      const now = this.shown[one.id]
      if (now.mode === 'hand') continue
      const spot = this.spotOf(one.id)
      // What is under the front edge of a place is hidden, and is not touched through it.
      if (now.mode === 'rest' && now.where !== 'home' && at.y > VESSELS[now.where].rim + 34) continue
      if (!onThing(one.id, spot, at)) continue
      const middle = bodyMiddle(one.id, spot)
      const value = Math.hypot(at.x - middle.x, at.y - middle.y) + (one.heavy ? 1000 : one.alive ? 60 : 0)
      if (value < score) {
        best = one.id
        score = value
      }
    }
    return best
  }

  // --- The finger -------------------------------------------------------------

  act(gestures: readonly Gesture[]): void {
    for (const gesture of gestures) {
      switch (gesture.type) {
        case 'press': this.press(gesture.at); break
        case 'tap': this.pressed = null; break
        case 'pressEnd': this.pressed = null; break
        case 'dragStart': this.dragStart(gesture.from); break
        case 'dragMove': this.dragMove(gesture.at); break
        case 'dragLift': break
        case 'dragEnd': this.drop(gesture.at); break
        case 'dragCancel': this.cancel(); break
        default: gesture satisfies never
      }
    }
  }

  private look(at: Point): void {
    this.gaze = at
    this.gazeHeld = 1.4
  }

  private press(at: Point): void {
    this.scene = null
    this.look(at)
    this.rings.push({ x: at.x, y: at.y, t: 0 })
    if (this.rings.length > 6) this.rings.shift()
    this.pressed = null
    if (Math.abs(at.x - ROPE.x) < ROPE.r && at.y > ROPE.top && at.y < ROPE.y + this.rope.x + 46) {
      this.rope.v += 160
      this.say('jingle')
      this.pressed = 'rope'
      return
    }
    const id = this.pick(at)
    if (id) {
      this.poke(id)
      this.pressed = id
      return
    }
    if (this.onButler(at) && (!this.errand.inside || at.y < VESSELS[this.errand.inside].rim + 20)) {
      this.pressed = BUTLER.id
      this.poke(BUTLER.id)
      return
    }
    const place = placeAt(at)
    if (place) {
      this.slosh[place].v += 5
      this.queue.push(landVoice('hat', place).slice(0, 2))
      return
    }
    if (this.dreaming && Math.abs(at.x - DREAM.x) < DREAM.w / 2 && Math.abs(at.y - DREAM.y) < DREAM.h / 2) {
      this.poke('gran')
      return
    }
    this.say('wall')
  }

  private poke(id: ThingId): void {
    const thing = thingOf(id)
    this.squash[id].v -= 7
    const variant = thing.alive ? this.movers[id].touch() : (this.turn = (this.turn + 1) % 3)
    this.queue.push(pokeVoice(thing.kind, variant))
    if (id === 'gran') this.dreamNext()
  }

  private dreamNext(): void {
    const saved = this.saved
    if (!saved.begun || saved.dreaming) return
    saved.wish = nextWish(saved.wish, saved.house)
    saved.dreaming = true
    this.dirty = true
    if (!this.errand.busy && this.pending() === null) this.showDream()
  }

  private showDream(): void {
    this.dreamShown = 0.001
    this.say('dream')
  }

  /** A wish is on show. */
  get dreaming(): boolean {
    return this.saved.dreaming && this.dreamShown > 0
  }

  private dragStart(from: Point): void {
    const id = this.pressed
    this.pressed = null
    if (id === 'rope') {
      this.held = { kind: 'rope', from: from.y - this.rope.x }
      return
    }
    if (id === null || id === BUTLER.id) return
    const now = this.shown[id]
    if (thingOf(id).heavy && this.atHome(now)) {
      this.held = { kind: 'tug', id, from }
      this.say('strain')
      return
    }
    const spot = this.spotOf(id)
    const where = now.mode === 'rest' || now.mode === 'fly' ? now.where : 'home'
    if (now.mode === 'butler') this.errand.lose(id)
    this.renumber()
    this.held = { kind: 'thing', id, grab: { x: spot.x - from.x, y: spot.y - from.y } }
    this.shown[id] = { mode: 'hand', from: where, at: { x: spot.x, y: spot.y } }
    if (where !== 'home') this.slosh[where].v += 4
    this.squash[id].v += 4
  }

  private atHome(now: Shown): boolean {
    return (now.mode === 'rest' || now.mode === 'fly') && now.where === 'home'
  }

  private dragMove(at: Point): void {
    this.look(at)
    const held = this.held
    if (!held) return
    if (held.kind === 'rope') {
      this.rope.x = Math.max(0, Math.min(ROPE_MOST, at.y - held.from))
      this.rope.v = 0
      return
    }
    if (held.kind === 'tug') {
      this.tug[held.id].x = Math.max(-1, Math.min(1, (at.x - held.from.x) / 90))
      this.tug[held.id].v = 0
      return
    }
    const now = this.shown[held.id]
    // The grab eases to the middle of the thing, so a person lifted by the head hangs from the finger.
    const size = SIZE[thingOf(held.id).kind]
    held.grab.x *= 0.86
    held.grab.y += (size.h * 0.5 - held.grab.y) * 0.14
    if (now.mode === 'hand') now.at = { x: at.x + held.grab.x, y: at.y + held.grab.y }
  }

  private drop(at: Point): void {
    const held = this.held
    this.held = null
    if (!held) return
    if (held.kind === 'rope') {
      if (this.rope.x >= ROPE_PULL) this.ring()
      return
    }
    if (held.kind === 'tug') {
      this.squash[held.id].v -= 5
      this.queue.push(pokeVoice(thingOf(held.id).kind, 1))
      return
    }
    const id = held.id, now = this.shown[id]
    if (now.mode !== 'hand') return
    // Where the thing is, not where the finger is: what a child sees let go is what lands.
    const thing = thingOf(id), size = SIZE[thing.kind], middle = { x: now.at.x, y: now.at.y - size.h * 0.4 }
    const place = placeAt(at) ?? placeAt(middle)
    if (place) {
      if (place === now.from) {
        // Back where it was lifted from: nothing was said.
        this.fly(id, place, 0.22, 20)
        return
      }
      this.fly(id, place, 0.24, 26)
      this.change(put(this.house, id, place), place)
      return
    }
    const on = this.someoneAt(at, id)
    if (now.from !== 'home' && this.house.at[id] === now.from) this.change(take(this.house, id), now.from)
    if (on && !thing.heavy) {
      this.shown[id] = { mode: 'worn', by: on, t: 0, dy: 0 }
      this.movers[on].touch()
      this.queue.push([...VOICES.worn, ...pokeVoice(thing.kind, 0)])
      return
    }
    if (on) {
      this.movers[on].touch()
      this.queue.push([...pokeVoice(thingOf(on).kind, 2), ...pokeVoice(thing.kind, 0)])
    }
    this.flyHome(id)
  }

  private someoneAt(at: Point, not: ThingId): ThingId | null {
    for (const one of THINGS) {
      if (!one.alive || !one.heavy || one.id === not) continue
      const now = this.shown[one.id]
      if (now.mode === 'rest' && onThing(one.id, this.spotOf(one.id), at, 4)) return one.id
    }
    return this.onButler(at) ? BUTLER.id : null
  }

  private cancel(): void {
    const held = this.held
    this.held = null
    this.pressed = null
    if (held?.kind !== 'thing') return
    const now = this.shown[held.id]
    if (now.mode === 'hand') this.fly(held.id, now.from, 0.3, 30)
  }

  private fly(id: ThingId, where: Where, dur: number, high: number): void {
    this.shown[id] = { mode: 'fly', from: this.spotOf(id), where, t: 0, dur, high }
  }

  private flyHome(id: ThingId): void {
    const from = this.spotOf(id), to = homeOf(id)
    this.fly(id, 'home', 0.34 + Math.hypot(to.x - from.x, to.y - from.y) / 1900, 90)
  }

  /** The bell: the house is tidied. */
  private ring(): void {
    this.say('bell')
    const wasTidy = isTidy(this.house)
    this.saved.house = freshHouse()
    this.errand.home()
    let n = 0
    for (const one of THINGS) {
      const now = this.shown[one.id]
      if (now.mode === 'hand' || (now.mode === 'rest' && now.where === 'home')) continue
      const from = this.spotOf(one.id)
      this.shown[one.id] = { mode: 'fly', from, where: 'home', t: -0.05 * n++, dur: 0.7, high: 140 }
    }
    for (const place of PLACES) this.slosh[place].v += wasTidy ? 2 : 9
    this.dirty = true
    if (wasTidy) this.movers.butler.touch()
    this.dreamNext()
  }

  private change(house: House, place: Place): void {
    const saved = this.saved
    saved.house = house
    this.dirty = true
    if (!saved.begun) {
      saved.begun = true
      saved.wish = nextWish(saved.wish, house)
      saved.dreaming = true
      this.dreamShown = 0
    }
    this.errand.think(place, house.examples[place], ideaOf(house, place))
  }

  // --- Time -------------------------------------------------------------------

  /** The next thing on screen that is not where the house has it, or null. What he takes out comes before what he brings. */
  pending(): ThingId | null {
    let bring: ThingId | null = null
    for (const one of THINGS) {
      const now = this.shown[one.id]
      if (now.mode !== 'rest') continue
      const to = this.house.at[one.id]
      if (to === now.where) continue
      if (now.where !== 'home') return one.id
      bring ??= one.id
    }
    return bring
  }

  /** Things of one zone that go to one place are carried together, three at a time; an animal or a person alone. */
  private loadFrom(first: ThingId): ThingId[] {
    const lead = this.shown[first]
    if (lead.mode !== 'rest' || thingOf(first).alive) return [first]
    const to = this.house.at[first]
    return THINGS.filter((one) => {
      const now = this.shown[one.id]
      return !one.alive && now.mode === 'rest' && now.where === lead.where && this.house.at[one.id] === to
    }).map((one) => one.id).slice(0, 3)
  }

  step(dt: number): void {
    this.time += dt
    this.gazeHeld -= dt
    if (this.scene !== null) {
      this.scene += dt
      if (this.scene > SCENE_SECONDS) this.scene = null
    }
    for (const one of THINGS) {
      const now = this.shown[one.id]
      if (now.mode === 'fly') {
        now.t += dt
        if (now.t >= now.dur) this.land(one.id, now.where)
      } else if (now.mode === 'worn') {
        now.t += dt
        now.dy = Math.sin(now.t * 9) * 3
        if (now.t >= WORN_SECONDS) this.flyHome(one.id)
      }
    }
    this.errand.step(dt, {
      next: () => {
        const id = this.pending()
        return id === null ? null : this.loadFrom(id)
      },
      targetOf: (id) => this.house.at[id],
      spotOf: (id) => this.spotOf(id),
      free: (id) => this.shown[id].mode === 'rest' && (this.shown[id] as { where: Where }).where !== this.house.at[id],
      took: (id, n) => {
        const now = this.shown[id]
        if (now.mode === 'rest' && now.where !== 'home') this.slosh[now.where].v += 4
        this.shown[id] = { mode: 'butler', n }
        this.say('grab')
        if (thingOf(id).alive) {
          this.movers[id].touch()
          this.queue.push(pokeVoice(thingOf(id).kind, 1))
        }
      },
      tossed: (id, where) => {
        this.fly(id, where, 0.46, 70)
        this.say('toss')
        this.renumber()
      },
      butlerTo: () => this.house.butler,
      others: () => THINGS.some((one) => this.shown[one.id].mode !== 'rest'),
      landed: (place) => this.splash(place, 'butler', VESSELS[place].x),
      say: (name) => this.say(name),
    })
    const gazeAt = this.errand.watching()
    if (this.gazeHeld <= 0 && gazeAt) this.gaze = gazeAt
    this.wishes(dt)
    this.springs(dt)
    for (const [id, mover] of Object.entries(this.movers)) {
      const now = this.shown[id]
      mover.update(dt, id === BUTLER.id ? (this.errand.inside ?? 'home') : now.mode === 'rest' ? now.where : 'home')
    }
    for (const list of [this.splashes, this.rings]) {
      for (const one of list) one.t += dt
      while (list.length > 0 && list[0].t > 1) list.shift()
    }
  }

  private renumber(): void {
    this.errand.load.forEach((id, n) => {
      const now = this.shown[id]
      if (now.mode === 'butler') now.n = n
    })
  }

  private land(id: ThingId, where: Where): void {
    this.shown[id] = { mode: 'rest', where }
    this.squash[id].v -= 8
    const thing = thingOf(id)
    if (where === 'home') this.say('home')
    else {
      this.splash(where, thing.kind, slotOf(id, where).x)
      if (thing.alive) this.movers[id].touch()
    }
  }

  private splash(place: Place, kind: (typeof THINGS)[number]['kind'] | 'butler', x: number): void {
    const big = kind === 'king' || kind === 'queen' || kind === 'gran' || kind === 'butler'
    this.slosh[place].v += big ? 15 : 8
    this.splashes.push({ place, t: 0, x, big })
    if (this.splashes.length > 10) this.splashes.shift()
    this.queue.push(landVoice(kind, place))
  }

  private wishes(dt: number): void {
    const saved = this.saved
    if (this.dreamShown > 0) this.dreamShown = Math.min(1, this.dreamShown + dt * 2.4)
    if (!saved.dreaming || this.errand.busy || this.held || this.pending() !== null || THINGS.some((one) => this.shown[one.id].mode !== 'rest')) return
    if (this.errand.inside !== this.house.butler) return
    if (this.dreamShown === 0) {
      this.showDream()
      return
    }
    if (!isMet(WISHES[saved.wish], saved.house)) return
    saved.wish = (saved.wish + 1) % WISHES.length
    saved.dreaming = false
    this.dirty = true
    this.scene = 0
    this.dreamShown = 0
    this.say('cackle')
  }

  private springs(dt: number): void {
    for (const id of Object.keys(this.squash)) {
      const thing = thingOf(id)
      const stiff = thing.heavy ? 170 : thing.kind === 'sock' ? 130 : thing.kind === 'teapot' ? 420 : 260
      springTo(this.squash[id], 0, stiff, thing.kind === 'sock' ? 7 : 11, dt)
    }
    const tugged = this.held?.kind === 'tug' ? this.held.id : null
    for (const id of Object.keys(this.tug)) if (id !== tugged) springTo(this.tug[id], 0, 190, 8, dt)
    if (this.held?.kind !== 'rope') springTo(this.rope, 0, 220, 9, dt)
    springTo(this.slosh.soup, 0, 90, 4, dt)
    springTo(this.slosh.bath, 0, 60, 3.4, dt)
    springTo(this.slosh.bed, 0, 180, 7, dt)
  }

  /** How far the grandmother's chair has walked off its feet in her laugh. */
  granLift(): number {
    return this.scene === null ? 0 : Math.abs(Math.sin(this.scene * 11)) * 26 * Math.max(0, 1 - this.scene / SCENE_SECONDS) * GRAN_BOUNCE * 2
  }

  /** One move the ghost hand may show: a small thing on the shelf carried to a place, and by turns, once something is out, the bell rope pulled. It is never chosen to meet a wish. */
  demo(index: number): { id: ThingId | null; from: Point; to: Point } | null {
    if (index % 2 === 1 && !isTidy(this.house)) return { id: null, from: { x: ROPE.x, y: ROPE.y + 20 }, to: { x: ROPE.x, y: ROPE.y + 120 } }
    const free = THINGS.filter((one) => !one.alive && this.atHome(this.shown[one.id]))
    if (free.length === 0) return null
    const one = free[(index * 4) % free.length]
    const place = PLACES[(index + 1) % PLACES.length]
    return { id: one.id, from: bodyMiddle(one.id, homeOf(one.id)), to: { x: VESSELS[place].x, y: VESSELS[place].rim - 24 } }
  }

  /** Whether this is the child's own in some place. */
  isExample(id: ThingId): boolean {
    return exampleIn(this.house, id) !== null
  }
}
