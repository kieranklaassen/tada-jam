import { JOKE, PITCH, wakes, type Carrier, type Sleeper } from './cast'
import { at, byFlame, LENGTH, nearest, placeAt, PLACES, sizeAt } from './garden'
import type { Gesture, Point } from './input'
import { allSet, setDown, type Save } from './save'

// The game, from touches in stage units and seconds. It draws nothing and
// plays nothing: it says what is where and queues what is to be heard. What
// lasts is in `save`; everything else is on its way there.

export type Cue =
  | { cue: 'cry' | 'step' | 'stumble' | 'hum' | 'set' | 'home' | 'light' | 'breath'; who: Carrier }
  | { cue: 'ring'; place: number; who: Carrier; soft: boolean }
  | { cue: 'joke'; sleeper: Sleeper }
  | { cue: 'open'; place: number }
  | { cue: 'out'; place: number }
  | { cue: 'murmur'; place: number; cold: boolean }
  | { cue: 'rustle' | 'flame' | 'flutter' | 'stand' | 'knock' | 'chord' }

/** Units walked in a second when sent, and at most when pulled. */
export const PACE = 1150, PULL = 1900
/** Seconds to set an apple down, to leap home, and for the next one to step up. */
export const SETTING = 0.5, LEAP = 0.85, STEP_UP = 0.4
/** Seconds the glass takes to open from its light to its farthest pane, and to go dark. */
export const OPENING = 0.95, CLOSING = 0.4
/** Seconds before the first showing starts, untouched. */
export const SHOWING_AFTER = 1.5
/** The ending: the wait after the last light, one note of the tune, and the dance after it. */
export const TUNE = { wait: 1.6, note: 0.36, dance: 2 } as const
/** The puff: the breath in, the time between two lights going out, the flame's flutter, and the rest. */
export const PUFF = { breath: 0.8, gap: 0.16, flutter: 1.3 } as const

export type Walker = {
  who: Carrier
  u: number
  /** Units walked, for the gait. */
  walked: number
  speed: number
  heading: 1 | -1
  lit: boolean
  /** Where on the path it is going, and the place it will set its light at when it is there. */
  goal: number | null
  place: number | null
  /** Seconds into setting its apple down, or null. */
  setting: number | null
  /** 1 as it was touched, falling to 0. */
  squash: number
  /** Seconds since its candle caught. */
  caught: number
  /** 0..1 as it steps up to the front at the gate. */
  arrived: number
}

export type Leaver = { who: Carrier; from: Point; size: number; t: number; slot: number }

/** How a place looks: who set it, and seconds since it opened or began to close. */
export type Shown = { who: Carrier | null; open: number; closing: number | null; joke: number; rung: number }

export const WAITING: readonly Point[] = [{ x: 282, y: 800 }, { x: 354, y: 806 }, { x: 430, y: 810 }]
export const WAITING_SIZE = 0.46

type Grip = { on: 'walker' | 'glass'; last: Point; heard: number; moved: boolean }

export class Play {
  walker: Walker
  leavers: Leaver[] = []
  shown: Shown[]
  cues: Cue[] = []
  /** Where the eyes go. */
  gaze: Point | null = null
  /** A trail of touched glass: where and how long ago. */
  trail: (Point & { t: number })[] = []
  /** Each waiting one's hop: 1 as it is touched, falling to 0. */
  hop: Record<Carrier, number> = { gnome: 0, goose: 0, hare: 0, bear: 0 }
  /** How much whoever sleeps at each place stirs: 1 as it is touched, falling to 0. */
  stir: number[] = PLACES.map(() => 0)
  /** The middle flame: how hard it flares, ducks and leans. */
  flare = 0
  duck = 0
  lean = 0
  /** Seconds into the tune or the puff. */
  tune: number | null = null
  puff: number | null = null
  showing: 'owed' | 'on' | 'done'
  private idle = 0
  private grip: Grip | null = null
  private puffed = 0
  private played = 0
  private breathed = false
  private ended = false
  time = 0

  constructor(public save: Save, private readonly changed: (now: boolean) => void = () => {}) {
    this.walker = this.make(save.queue[0], save.u, save.lit)
    this.walker.arrived = 1
    this.shown = save.set.map((who) => ({ who, open: who ? 9 : 0, closing: null, joke: 9, rung: 9 }))
    this.showing = save.shown ? 'done' : 'owed'
  }

  get full(): boolean { return allSet(this.save) }
  get atGate(): boolean { return this.walker.u < 24 }
  /** Nothing is left to carry, and the one at the gate has full cheeks. */
  get asksToBlow(): boolean { return this.full && this.tune === null && this.puff === null && this.leavers.length === 0 && this.shown.every((one) => one.open > OPENING) }
  get busy(): boolean { return this.walker.goal !== null || this.walker.setting !== null || this.tune !== null || this.puff !== null || this.showing === 'on' || this.grip !== null || this.walker.arrived < 1 || this.leavers.length > 0 }

  private make(who: Carrier, u = 0, lit = false): Walker {
    return { who, u, walked: 0, speed: 0, heading: 1, lit, goal: null, place: null, setting: null, squash: 0, caught: 9, arrived: 0 }
  }

  sleeperAt(place: number): Sleeper | null {
    const who = this.shown[place].who
    return who ? wakes(PLACES[place].kind, who) : null
  }

  /** The note of a light: its carrier's pitch, an octave up in the inner turn. */
  static pitch(place: number, who: Carrier): number {
    return PITCH[who] * (place >= 7 ? 2 : 1)
  }

  where(): Point { return at(this.walker.u) }

  /** Which one at the gate is under a point: the one in front, one waiting by its slot, or nobody. */
  private someone(p: Point): 'front' | number | null {
    const w = this.walker, spot = this.where(), k = sizeAt(w.u)
    if (p.x > spot.x - 72 * k - 14 && p.x < spot.x + 72 * k + 14 && p.y > spot.y - 250 * k - 8 && p.y < spot.y + 22) return 'front'
    for (let i = 0; i < WAITING.length; i++) {
      const s = WAITING[i]
      if (Math.abs(p.x - s.x) < 37 && p.y > s.y - 128 && p.y < s.y + 12) return i
    }
    return null
  }

  // --- Touch -------------------------------------------------------------------

  act(gesture: Gesture): void {
    switch (gesture.type) {
      case 'press': return this.press(gesture.at)
      case 'tap': return this.tap(gesture.at)
      case 'pressEnd': this.grip = null; return
      case 'dragStart': return
      case 'dragMove': return this.move(gesture.at)
      case 'dragLift': return
      case 'dragEnd': return this.drop(gesture.at)
      case 'dragCancel': return this.cancel()
      default: gesture satisfies never
    }
  }

  /** A touch that has been used up by ending a scene does nothing more. */
  private spent = false

  private press(p: Point): void {
    this.idle = 0
    this.gaze = p
    this.spent = this.tune !== null || this.puff !== null
    if (this.tune !== null) this.endTune()
    if (this.puff !== null) this.endPuff()
    if (this.showing !== 'done') this.takeOver()
    const on = this.someone(p)
    if (on === 'front') {
      this.walker.squash = 1
      this.cues.push({ cue: 'cry', who: this.walker.who })
      this.grip = { on: 'walker', last: p, heard: 0, moved: false }
      return
    }
    this.grip = { on: 'glass', last: p, heard: 0, moved: false }
    if (on !== null) {
      const who = this.save.queue[on + 1]
      this.hop[who] = 1
      this.cues.push({ cue: 'cry', who })
      return
    }
    if (byFlame(p)) {
      this.duck = 1
      this.cues.push({ cue: 'flame' })
      return
    }
    const { place, far } = placeAt(p)
    const shown = this.shown[place.id]
    this.trail.push({ ...p, t: 0 })
    if (shown.who && shown.open > 0.2 && far < 100) this.answer(place.id)
    else if (far < 110) this.murmur(place.id, false)
    else this.cues.push({ cue: 'rustle' })
  }

  /** Whoever sleeps there rolls over, with a snort where an unlit candle is held to the glass. */
  private murmur(place: number, cold: boolean): void {
    this.stir[place] = 1
    this.cues.push({ cue: 'murmur', place, cold })
  }

  /** An open place rings its light and its sleeper does its joke. */
  private answer(place: number): void {
    const shown = this.shown[place], sleeper = this.sleeperAt(place)
    if (!shown.who || !sleeper) return
    shown.rung = 0
    this.cues.push({ cue: 'ring', place, who: shown.who, soft: false })
    if (shown.joke > JOKE[sleeper]) { shown.joke = 0; this.cues.push({ cue: 'joke', sleeper }) }
  }

  private takeOver(): void {
    const w = this.walker
    if (this.showing === 'on') {
      if (w.setting === null) { w.goal = null; w.place = null; this.keep(true) }
    } else {
      this.save = { ...this.save, shown: true }
      this.changed(true)
    }
    this.showing = 'done'
  }

  private tap(p: Point): void {
    const grip = this.grip
    this.grip = null
    if (this.spent) return
    const w = this.walker, on = this.someone(p)
    if (on !== null && on !== 'front') {
      if (this.atGate && w.setting === null && w.goal === null && this.puff === null && !w.lit) this.call(on)
      return
    }
    if (w.setting !== null) return
    if (on === 'front' && grip?.on === 'walker') {
      if (this.full) { if (this.asksToBlow) this.blow(); return }
      if (w.goal !== null && w.place !== null) return
      if (!w.lit) this.send(LENGTH, null)
      else this.toPlace(this.nearestDark(this.where()))
      return
    }
    if (this.full) return
    if (byFlame(p)) { if (!w.lit) this.send(LENGTH, null); return }
    const { place, far } = placeAt(p)
    if (this.save.set[place.id] !== null && far < 100) return
    if (this.save.set[place.id] === null && far < 170) this.toPlace(place.id)
    else if (!w.lit) this.send(LENGTH, null)
    else this.toPlace(this.nearestDark(p))
  }

  private move(p: Point): void {
    this.idle = 0
    this.gaze = p
    const grip = this.grip
    if (!grip || this.spent) return
    const w = this.walker
    if (grip.on === 'walker') {
      if (w.setting !== null) return
      // The place it was on its way to is given up: the finger says where now.
      if (!grip.moved) { grip.moved = true; w.place = null; this.keep(false) }
      w.goal = byFlame(p) ? LENGTH : nearest(p)
      this.trail.push({ ...p, t: 0 })
      if (this.trail.length > 26) this.trail.shift()
      return
    }
    const step = Math.hypot(p.x - grip.last.x, p.y - grip.last.y)
    grip.heard += step
    for (const place of PLACES) {
      const shown = this.shown[place.id]
      if (!shown.who || shown.open < 0.3 || shown.rung < 0.12) continue
      const near = (q: Point) => Math.min(Math.hypot(q.x - place.apple.x, q.y - place.apple.y + 24), Math.hypot(q.x - at(place.u).x, q.y - at(place.u).y))
      if (near(p) < 52 && near(grip.last) >= 52) this.answer(place.id)
    }
    if (grip.heard > 90) { grip.heard = 0; this.cues.push({ cue: 'rustle' }) }
    grip.last = p
    this.trail.push({ ...p, t: 0 })
    if (this.trail.length > 26) this.trail.shift()
  }

  private drop(p: Point): void {
    const grip = this.grip
    this.grip = null
    if (!grip || this.spent) return
    if (grip.on !== 'walker') return
    const w = this.walker
    if (w.setting !== null) return
    if (this.full) { w.goal = null; this.home(); return }
    const { place, far } = placeAt(p)
    const over = far < 92 && !byFlame(p)
    if (!w.lit) {
      if (byFlame(p)) { w.goal = LENGTH; return }
      if (over && this.save.set[place.id] === null && Math.abs(w.u - place.u) < 400) this.murmur(place.id, true)
      w.goal = null
      this.keep(true)
      return
    }
    if (byFlame(p)) { w.goal = null; this.keep(true); return }
    if (over && this.save.set[place.id] !== null) { w.goal = null; this.answer(place.id); this.keep(true); return }
    // Let go over the dark or beside its part of the path: near enough counts.
    const close = this.nearestDark(p), d = Math.hypot(PLACES[close].apple.x - p.x, PLACES[close].apple.y - p.y)
    if (over) this.toPlace(place.id)
    else if (d < 150) this.toPlace(close)
    else { w.goal = null; this.keep(true) }
  }

  private cancel(): void {
    if (this.grip?.on === 'walker' && this.walker.setting === null) {
      // Taken away under the finger: it stands where the drag began.
      this.walker.goal = null
      this.walker.place = null
      this.walker.u = this.save.u
      this.walker.lit = this.save.lit
    }
    this.grip = null
  }

  // --- The walk ------------------------------------------------------------------

  nearestDark(p: Point): number {
    let best = -1, far = Infinity
    for (const place of PLACES) if (this.save.set[place.id] === null) {
      const d = Math.hypot(place.apple.x - p.x, place.apple.y - p.y)
      if (d < far) { far = d; best = place.id }
    }
    return best
  }

  private send(goal: number, place: number | null): void {
    this.walker.goal = goal
    this.walker.place = place
    this.keep(true)
  }

  /** On to a dark place, by way of the flame while the candle is unlit. */
  private toPlace(place: number): void {
    if (place < 0) return
    this.send(this.walker.lit ? PLACES[place].u : LENGTH, place)
  }

  /** Nothing to carry: it trots back to the gate. */
  private home(): void { this.walker.goal = 0 }

  /** Hands where the one who carries stands, and where it was sent, to storage. */
  private keep(now: boolean): void {
    const w = this.walker
    this.save = { ...this.save, u: this.full ? 0 : w.u, lit: !this.full && w.lit, to: w.place, shown: true }
    this.changed(now)
  }

  /** Someone waiting changes places with the one in front. */
  private call(slot: number): void {
    const queue = [...this.save.queue]
    ;[queue[0], queue[slot + 1]] = [queue[slot + 1], queue[0]]
    this.save = { ...this.save, queue }
    this.walker = this.make(queue[0])
    this.hop[queue[slot + 1]] = 0.6
    this.keep(true)
  }

  private arrive(): void {
    const w = this.walker
    if (w.goal === LENGTH && !w.lit && !this.full) {
      w.lit = true
      w.caught = 0
      this.flare = 1
      this.cues.push({ cue: 'light', who: w.who })
      for (const place of PLACES) if (this.shown[place.id].who && this.shown[place.id].open > 1) this.shown[place.id].rung = 0.3
      this.keep(true)
      if (w.place !== null) w.goal = PLACES[w.place].u
      else if (this.grip?.on !== 'walker') w.goal = null
      return
    }
    if (w.place !== null && w.lit && Math.abs(w.u - PLACES[w.place].u) < 2) {
      w.goal = null
      w.setting = 0
      this.cues.push({ cue: 'set', who: w.who })
      return
    }
    if (this.grip?.on !== 'walker') w.goal = null
  }

  private put(): void {
    const w = this.walker, place = w.place
    if (place === null) return
    const from = this.where()
    this.save = { ...setDown(this.save, place), shown: true }
    this.shown[place] = { who: w.who, open: 0, closing: null, joke: -0.55, rung: 0 }
    this.leavers.push({ who: w.who, from, size: sizeAt(w.u), t: 0, slot: 2 })
    this.cues.push({ cue: 'open', place }, { cue: 'home', who: w.who })
    if (this.shown.some((one, i) => i !== place && one.who && Math.hypot(PLACES[i].apple.x - PLACES[place].apple.x, PLACES[i].apple.y - PLACES[place].apple.y) < 260)) this.cues.push({ cue: 'chord' })
    this.walker = this.make(this.save.queue[0])
    if (this.showing === 'on') this.showing = 'done'
    this.grip = null
    this.changed(true)
    this.ended = false
  }

  // --- Scenes ----------------------------------------------------------------------

  private blow(): void {
    // Stored dark as it starts.
    this.save = { ...this.save, set: this.save.set.map(() => null), u: 0, lit: false, to: null }
    this.puff = 0
    this.puffed = 0
    this.breathed = false
    this.cues.push({ cue: 'breath', who: this.walker.who })
    this.changed(true)
  }

  get puffLength(): number { return PUFF.breath + PUFF.gap * PLACES.length + PUFF.flutter + 0.6 }

  private endPuff(): void {
    this.puff = null
    this.lean = 0
    for (const one of this.shown) if (one.who && one.closing === null) one.closing = 0
  }

  private endTune(): void { this.tune = null; this.ended = true }

  get tuneLength(): number { return TUNE.wait + TUNE.note * PLACES.length + TUNE.dance }
  get dancing(): boolean { return this.tune !== null && this.tune > TUNE.wait + TUNE.note * PLACES.length }

  // --- Time --------------------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    this.idle += dt
    const w = this.walker
    const ease = (v: number, rate: number) => Math.max(0, v - dt * rate)
    this.flare = ease(this.flare, 1.1); this.duck = ease(this.duck, 1.6)
    w.squash = ease(w.squash, 2.6)
    for (const who of this.save.queue) this.hop[who] = ease(this.hop[who], 1.7)
    for (let i = 0; i < this.stir.length; i++) this.stir[i] = ease(this.stir[i], 1.2)
    for (const one of this.trail) one.t += dt
    this.trail = this.trail.filter((one) => one.t < 0.9)
    w.arrived = Math.min(1, w.arrived + dt / STEP_UP)
    w.caught += dt
    for (const one of this.leavers) one.t += dt
    this.leavers = this.leavers.filter((one) => one.t < LEAP)
    for (let i = 0; i < this.shown.length; i++) {
      const one = this.shown[i]
      if (!one.who) continue
      one.open += dt
      one.rung += dt
      const before = one.joke
      one.joke += dt
      if (before < 0 && one.joke >= 0) { const s = this.sleeperAt(i); if (s) { one.joke = 0; this.cues.push({ cue: 'joke', sleeper: s }) } }
      if (one.closing !== null) {
        one.closing += dt
        if (one.closing > CLOSING) this.shown[i] = { who: null, open: 0, closing: null, joke: 9, rung: 9 }
      }
    }
    if (this.showing === 'owed' && this.idle > SHOWING_AFTER && this.atGate) {
      this.showing = 'on'
      this.toPlace(0)
    }
    this.walk(dt)
    this.scenes(dt)
  }

  private walk(dt: number): void {
    const w = this.walker
    if (w.setting !== null) {
      w.setting += dt
      if (w.setting >= SETTING) this.put()
      return
    }
    if (w.goal === null || w.arrived < 0.5) { w.speed = Math.max(0, w.speed - dt * 6000); return }
    const gap = w.goal - w.u, pulled = this.grip?.on === 'walker'
    const top = pulled ? Math.min(PULL, 380 + Math.abs(gap) * 3.2) : PACE
    w.speed = Math.min(top, w.speed + dt * 5200)
    const go = Math.min(Math.abs(gap), w.speed * dt), before = w.u
    if (go > 0.5) w.heading = gap > 0 ? 1 : -1
    w.u += Math.sign(gap) * go
    const size = sizeAt(w.u), strides = Math.floor(w.walked / 62)
    w.walked += go / Math.max(0.5, size)
    if (Math.floor(w.walked / 62) !== strides) this.cues.push({ cue: w.who === 'gnome' && strides % 5 === 4 ? 'stumble' : 'step', who: w.who })
    const low = Math.min(before, w.u), high = Math.max(before, w.u)
    for (const place of PLACES) if (place.u > low && place.u <= high) {
      const shown = this.shown[place.id]
      if (shown.who && shown.open > 0.2 && shown.closing === null) { shown.rung = 0; this.cues.push({ cue: 'ring', place: place.id, who: shown.who, soft: true }) }
    }
    if (high > LENGTH - 160) this.lean = w.heading * Math.min(1, w.speed / PACE)
    if (Math.abs(w.goal - w.u) < 1) this.arrive()
  }

  private scenes(dt: number): void {
    if (this.puff === null) this.lean *= Math.exp(-dt * 4)
    if (this.full && !this.ended && this.tune === null && this.leavers.length === 0 && this.shown.every((one) => one.open > OPENING) && this.shown.some((one) => one.open < 8)) {
      this.tune = 0
      this.played = 0
    }
    if (this.tune !== null) {
      this.tune += dt
      while (this.played < PLACES.length && this.tune > TUNE.wait + TUNE.note * this.played) {
        const i = this.played++, shown = this.shown[i], sleeper = this.sleeperAt(i)
        if (!shown.who || !sleeper) continue
        shown.rung = 0
        shown.joke = 0
        this.cues.push({ cue: 'ring', place: i, who: shown.who, soft: false })
      }
      if (this.played === PLACES.length && this.tune > TUNE.wait + TUNE.note * PLACES.length) {
        this.played++
        this.flare = 1
        this.cues.push({ cue: 'chord' })
        for (const one of this.shown) { one.joke = 0; one.rung = 0 }
        for (const who of this.save.queue) this.hop[who] = 1
        this.walker.squash = 1
      }
      if (this.tune > this.tuneLength) this.endTune()
    }
    if (this.puff !== null) {
      this.puff += dt
      const p = this.puff - PUFF.breath
      if (p > 0 && !this.breathed) { this.breathed = true; this.cues.push({ cue: 'knock' }) }
      while (this.puffed < PLACES.length && p > PUFF.gap * this.puffed) {
        const i = this.puffed++
        if (this.shown[i].who && this.shown[i].closing === null) { this.shown[i].closing = 0; this.cues.push({ cue: 'out', place: i }) }
      }
      const f = p - PUFF.gap * PLACES.length
      const before = f - dt
      if (f > 0 && before <= 0) this.cues.push({ cue: 'flutter' })
      if (f > PUFF.flutter && before <= PUFF.flutter) { this.cues.push({ cue: 'stand' }); this.flare = 0.7 }
      this.lean = f <= 0 ? 0 : f < PUFF.flutter ? 2.2 + Math.sin(f * 30) * 0.5 : 0
      if (this.puff > this.puffLength) this.endPuff()
    }
  }

  /** The way from the gate for one that leaps home, above the hedges. */
  static leap(one: Leaver): Point & { turn: number } {
    const t = Math.min(1, one.t / LEAP), to = WAITING[one.slot]
    return { x: one.from.x + (to.x - one.from.x) * t, y: one.from.y + (to.y - one.from.y) * t - Math.sin(t * Math.PI) * 190, turn: t }
  }

  /** Apples still to be carried: one for each place that is dark to the eye, the one in front's included. */
  get apples(): number { return this.shown.filter((one) => one.who === null).length }
}
