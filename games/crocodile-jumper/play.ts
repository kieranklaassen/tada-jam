import type { Note } from './audio'
import { CAST, lengthOf, type Turn, type Who } from './cast'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { BODY, DOOR, HEAD, MAGPIE, MICE, NECK, STRIP, TRAY, WINDOW, headTwo, inside, onStrip, trayPoint } from './layout'
import { KINDS, LENGTH, MOST, endOf, fitOf, hopTo, mostOf, scootTo, settle, slide, type Fit, type Kind, type Piece } from './row'
import { callNext, canJoin, join, owed, type Idea, type Save } from './save'
import type { CycleOutcome } from './state'
import { TICKLE, TURN_VOICE, cap, voice, type VoiceName } from './voices'

// The whole game with no browser in it. Fingers land, move, lift and are taken
// away here in stage units, and time is played here. The Mount and the tests
// make the same calls. What stays is in `save`; everything else is how it
// looks on the way there.

export type Thing =
  | { is: 'piece'; i: number }
  | { is: 'tray'; k: Kind }
  | { is: 'customer'; n: number; x: number }
  | { is: 'jumper'; x: number }
  | { is: 'magpie' | 'wait' | 'window' | 'mice' | 'room' }

/** A thing carried: a piece, or the customer who waited at the door. */
export type Hand =
  | { what: 'piece'; k: Kind; at: Point; from: 'tray' | 'row'; grip: number }
  | { what: 'slide'; i: number; grip: number; at: Point }
  | { what: 'guest'; at: Point }

/** One thing happening to somebody or something: a short act, gone on load. */
export type Act = { kind: string; at: number; n: number }

export type Scene =
  | { is: 'tune'; at: number; lasts: number; order: number[]; said: number }
  | { is: 'next'; at: number; lasts: number; who: Who[]; worn: Piece[]; tore: Kind[]; out: Save['out']; said: number; pitch: number }
  | { is: 'show'; at: number; lasts: number; idea: Idea; said: number }

export type Flight = { k: Kind; from: Point; to: Point; at: number; lasts: number; piece?: Piece; by?: string }
/** How a lying piece is seen: it glides and hops to where it already lies. */
const homePitch = (k: Kind): number => (k === 'duck' ? 1.4 : k === 'shoe' ? 0.8 : 1)

export type Look = { x: number; jolt: number; hop: number; born: number }

export const REST_MS = 1000
/** A finger that slid no further than this has tapped. */
const NEAR = 56
export const GUST = 2.4
/** How high a sliding piece is pulled before it leaves the strip. */
const LIFT = 62
const faultsBad = 3

export class Play {
  readonly touch = new ForgivingTouch()
  now = 0
  hand: Hand | null = null
  scene: Scene | null = null
  flights: Flight[] = []
  acts = new Map<string, Act>()
  looks = new WeakMap<Piece, Look>()
  gustAt = -99
  joinedAt = -99
  /** When the tail tip was last covered. */
  doneAt = -99
  /** When the next in turn came to the door, and when the jumper came off. */
  cameAt = -99
  offAt = -99
  offRow: Piece[] = []
  /** Trays seen torn, and when. */
  torn: Record<Kind, number> = { sausage: -99, shoe: -99, duck: -99 }
  /** The one who waited, let go where it could not lie: it springs back to the door from here. */
  rebound: { at: Point; t: number; stay: number; who: Who } | null = null
  sparks: { at: Point; t: number }[] = []
  heard: Note[] = []
  changed = false
  urgent = false
  private pressed: Thing | null = null
  private slid: Thing | null = null
  private snapshot: Piece[] | null = null
  private landed = { id: -1, t: 0, at: { x: 0, y: 0 }, dragging: false }
  private strokeFrom: Point = { x: 0, y: 0 }
  /** Where the drag began, and the farthest it has been from there. */
  private liftFrom: Point = { x: 0, y: 0 }
  private far = 0
  private skidded = 0
  private count = 0

  constructor(public save: Save) {}

  /** The jumper as it was left has been told already. */
  settled(): this { this.told = this.fit; return this }

  get length(): number { return lengthOf(this.save.on) }
  /** The row as it fits whoever lies there: it is the jumper. */
  get fit(): Fit | null { return this.save.row.length ? fitOf(this.save.row, this.length) : null }
  /** Covered from neck to tail tip, holes or not: the next one can come. */
  get ready(): boolean { const f = this.fit; return !!f && !f.short }
  get gusting(): boolean { return this.now - this.gustAt < GUST }
  get busy(): boolean { return this.touch.active || this.scene !== null || this.gusting }

  saved(): Save {
    const row = this.hand?.what === 'slide' && this.snapshot ? this.snapshot : this.save.row
    const copy = (r: readonly Piece[]): Piece[] => r.map((p) => ({ k: p.k, x: Math.round(p.x) }))
    // A piece that is in the hand off the strip is still where it came from.
    const inHand = this.hand?.what === 'piece' && this.snapshot ? this.snapshot : row
    return { ...this.save, on: [...this.save.on], wait: [...this.save.wait], open: { ...this.save.open }, row: copy(inHand) }
  }

  say(name: VoiceName, p = 1, n = this.count++): void { this.heard.push(...voice(name, p, n)) }
  /** The same a little later. */
  private later(name: VoiceName, delay: number, p = 1, n = this.count++): void {
    this.heard.push(...voice(name, p, n).map((note) => ({ ...note, delay: (note.delay ?? 0) + delay })))
  }
  act(key: string, kind: string): void { this.giveBack(key); this.acts.set(key, { kind, at: this.now, n: this.count++ }) }
  /** Seconds since the act began, or null when it is another or over. */
  acting(key: string, lasts = 1.7): (Act & { age: number }) | null {
    const a = this.acts.get(key)
    return a && this.now - a.at < lasts ? { ...a, age: this.now - a.at } : null
  }
  /** What somebody was playing with goes home when something else happens to them. */
  private giveBack(key?: string): void {
    for (const f of this.flights) if (f.by && f.at > this.now && (!key || f.by === key)) { f.at = this.now; f.by = undefined; this.say('hopHome', homePitch(f.k)) }
  }
  look(p: Piece): Look {
    let l = this.looks.get(p)
    if (!l) { l = { x: p.x, jolt: -99, hop: -99, born: -99 }; this.looks.set(p, l) }
    return l
  }
  pitch(n: number): number { return CAST[this.save.on[Math.min(n, this.save.on.length - 1)]].pitch }

  // --- Fingers ---------------------------------------------------------------

  down(id: number, at: Point, t: number): void {
    const last = this.landed
    const idle = !this.hand && (t - last.t > REST_MS || last.dragging)
    if (this.touch.active && this.touch.holds(last.id) && last.id !== id && idle) this.take(this.touch.cancel(last.id))
    if (this.touch.active && this.touch.holds(last.id)) {
      // A second finger takes nothing from the first and is answered where it lands.
      this.sparks.push({ at, t: this.now })
      this.say('tick')
      return
    }
    this.landed = { id, t, at, dragging: false }
    this.take(this.touch.down(id, at, t))
  }
  move(id: number, at: Point): void { this.take(this.touch.move(id, at)) }
  up(id: number, at: Point, t: number): void { this.take(this.touch.up(id, at, t)) }
  cancel(id: number): void { this.take(this.touch.cancel(id)) }
  clear(): void { this.take(this.touch.clear()) }

  advance(seconds: number, t: number): void {
    this.take(this.touch.advance(t))
    this.now += seconds
    for (const p of this.save.row) {
      const l = this.look(p)
      const d = p.x - l.x
      l.x = Math.abs(d) < 0.4 ? p.x : l.x + d * Math.min(1, seconds * (this.hand?.what === 'slide' ? 34 : 13))
    }
    this.flights = this.flights.filter((f) => this.now - f.at < f.lasts)
    for (const f of this.flights) if (f.by && f.at > this.now - seconds && f.at <= this.now) this.say('hopHome', homePitch(f.k))
    this.sparks = this.sparks.filter((s) => this.now - s.t < 0.6)
    const s = this.scene
    if (s) {
      if (s.is === 'tune') this.playOn(s)
      if (s.is === 'next') this.comeIn(s, this.now - s.at)
      if (s.is === 'show' && s.said < 3 && this.now - s.at >= 0.4 + s.said * 0.9) { this.say('scrap', 1, s.said); s.said++ }
      if (this.now - s.at >= s.lasts) this.finish(true)
    }
  }

  // --- What is under a finger ------------------------------------------------

  pieceAt(at: Point): number {
    if (Math.abs(at.y - STRIP.mid) > 72) return -1
    const x = at.x - NECK, row = this.save.row
    for (let i = row.length - 1; i >= 0; i--) if (x >= row[i].x && x <= endOf(row[i])) return i
    for (let i = row.length - 1; i >= 0; i--) if (x >= row[i].x - 14 && x <= endOf(row[i]) + 14) return i
    return -1
  }

  under(at: Point): Thing {
    const i = this.pieceAt(at)
    if (i >= 0) return { is: 'piece', i }
    for (const k of KINDS) if (inside(TRAY[k], at, 8)) return { is: 'tray', k }
    if (inside(MAGPIE, at, 4)) return { is: 'magpie' }
    if (inside(MICE, at, 6)) return { is: 'mice' }
    if (inside(DOOR, at)) return { is: 'wait' }
    if (this.save.on.length > 1 && inside(headTwo(CAST[this.save.on[0]].length), at)) return { is: 'customer', n: 1, x: CAST[this.save.on[0]].length }
    if (inside(HEAD, at)) return { is: 'customer', n: 0, x: -60 }
    if (inside(BODY, at)) {
      const x = at.x - NECK
      if (this.worn(x)) return { is: 'jumper', x }
      if (x <= this.length + 12) return { is: 'customer', n: this.whoAt(x), x }
    }
    if (inside(WINDOW, at)) return { is: 'window' }
    return { is: 'room' }
  }
  private whoAt(x: number): number { return this.save.on.length > 1 && x > CAST[this.save.on[0]].length ? 1 : 0 }
  /** Whether a ring lies at `x`. */
  private worn(x: number): boolean { return this.save.row.some((p) => x >= p.x && x <= endOf(p)) }

  // --- Gestures --------------------------------------------------------------

  private take(gestures: Gesture[]): void {
    for (const g of gestures) {
      switch (g.type) {
        case 'press': this.press(g.at); break
        case 'tap': this.tap(); this.pressed = null; break
        case 'pressEnd': this.pressed = null; break
        case 'dragStart': this.landed.dragging = true; this.lift(g.from); break
        case 'dragMove': this.drag(g.at); break
        case 'dragLift': break
        case 'dragEnd': this.letGo(g.at); break
        case 'dragCancel': this.putBack(); break
        default: g satisfies never
      }
    }
  }

  private press(at: Point): void {
    const was = this.scene?.is
    // The second tap of a double tap on the door takes nothing away.
    if (this.scene?.is === 'next' && this.now - this.scene.at < 0.8 && this.under(at).is === 'wait') {
      this.sparks.push({ at, t: this.now })
      this.say('tick')
      return
    }
    if (this.scene) this.finish(false)
    this.sparks.push({ at, t: this.now })
    const thing = this.under(at)
    this.pressed = thing
    switch (thing.is) {
      case 'piece': {
        const p = this.save.row[thing.i]
        this.look(p).jolt = this.now
        this.say(`press${cap(p.k)}` as VoiceName)
        break
      }
      case 'tray':
        this.act(thing.k, 'press')
        this.say(this.save.open[thing.k] ? (`press${cap(thing.k)}` as VoiceName) : 'coverPress')
        break
      case 'customer': this.act(`on${thing.n}`, 'touch'); this.say('tick'); break
      case 'jumper': this.puff(thing.x); break
      case 'magpie': this.act('magpie', 'press'); this.say('click'); break
      case 'wait': this.act('wait', 'press'); this.say('tick'); break
      case 'window': this.act('window', 'press'); this.say('tick'); break
      case 'mice': this.act('mice', 'squeak'); this.say('squeak'); break
      case 'room': this.act('room', 'press'); this.say('wall'); break
      default: thing satisfies never
    }
    // What the magpie still owes is shown at a touch; the touch that ended a showing does not start one.
    // Calling the next one comes first: what is owed is for the one who leaves.
    if (was !== 'show' && !(thing.is === 'wait' && this.ready)) this.showOwed()
  }

  private puff(x: number): void {
    const ring = [...this.save.row].reverse().find((p) => x >= p.x && x <= endOf(p))!
    this.acts.set('ring', { kind: String(this.save.row.indexOf(ring)), at: this.now, n: this.count })
    this.say(`puff${cap(ring.k)}` as VoiceName)
  }

  private tap(): void {
    const thing = this.pressed
    if (!thing) return
    switch (thing.is) {
      case 'piece': this.scoot(thing.i); break
      case 'tray': this.tapTray(thing.k); break
      case 'customer':
        this.act(`on${thing.n}`, 'tickle')
        this.say(TICKLE[this.save.on[thing.n]], this.pitch(thing.n))
        this.act('magpie', 'look')
        this.later('click', 0.25)
        break
      case 'magpie': if (this.scene?.is !== 'show') this.tune(); break
      case 'wait': this.callIn(); break
      case 'window': this.gust(); break
      case 'jumper': this.feel(); break
      case 'mice': case 'room': break
      default: thing satisfies never
    }
  }

  private scoot(i: number): void {
    const row = this.save.row, p = row[i]
    if (!p) return
    const to = scootTo(row, i)
    if (to === null) { this.look(p).jolt = this.now; this.say('stuck', p.k === 'duck' ? 1.6 : p.k === 'shoe' ? 1 : 1.25); return }
    const l = this.look(p)
    l.hop = this.now
    this.flights = this.flights.filter((f) => f.piece !== p)
    p.x = to
    this.say(`scoot${cap(p.k)}` as VoiceName)
    this.change()
  }

  private tapTray(k: Kind): void {
    if (!this.save.open[k]) { this.tear(k); return }
    const row = this.save.row
    if (row.length >= MOST) { this.bounce(k); return }
    const p: Piece = { k, x: hopTo(row, k) }
    // No room past the end: it comes home, seen and heard.
    if (row.some((q) => p.x < endOf(q) - 0.5 && q.x < endOf(p) - 0.5)) { this.bounce(k); return }
    row.push(p)
    const from = trayPoint(k)
    this.look(p).hop = this.now + 0.34
    this.look(p).born = this.now + 0.34
    this.act('magpie', 'snip')
    this.later('closeUp', 0.4)
    this.flights.push({ k, piece: p, from, to: { x: NECK + p.x + LENGTH[k] / 2, y: STRIP.mid }, at: this.now, lasts: 0.34 })
    this.say('layDown')
    this.change()
  }

  private bounce(k: Kind): void {
    const from = trayPoint(k)
    this.flights.push({ k, from: { x: from.x, y: STRIP.y + 10 }, to: from, at: this.now, lasts: 0.5 })
    this.say('full')
  }

  private tear(k: Kind): void {
    this.save.open[k] = true
    this.torn[k] = this.now
    this.say('tear')
    this.change(true)
  }

  private gust(): void {
    this.gustAt = this.now
    this.say('gust')
    const kinds = new Set(this.save.row.map((p) => p.k))
    if (kinds.has('sausage')) this.later('rollHum', 0.2)
    if (kinds.has('shoe')) this.later('laces', 0.2)
    if (kinds.has('duck')) this.later('cock', 0.2)
    const f = this.fit
    if (f) this.later('tinsel', 0.2)
    if (f && f.holes.length) this.later('whistle', 0.4)
    if (!f || f.short || f.holes.length) this.later('chatter', 0.6)
    this.act('magpie', 'sit')
    this.later('rustle', 0.1)
  }

  /** A touch on the jumper, let go: the one inside says what it thinks of what it was measured with. */
  private feel(): void {
    const most = mostOf(this.save.row)
    if (!most) return
    for (let n = 0; n < this.save.on.length; n++) {
      const w = CAST[this.save.on[n]]
      const how = most === w.loves ? 'smell' : most === w.hates ? 'groan' : 'hum'
      this.act(`on${n}`, how)
      this.later(how, 0.15 + n * 0.3, w.pitch)
    }
  }

  // --- Carrying ---------------------------------------------------------------

  private lift(from: Point): void {
    const thing = this.pressed
    this.pressed = null
    this.slid = thing
    this.strokeFrom = this.liftFrom = from
    this.far = 0
    if (!thing) return
    if (thing.is === 'piece') {
      this.snapshot = this.save.row.map((p) => ({ ...p }))
      const p = this.save.row[thing.i]
      this.hand = { what: 'slide', i: thing.i, grip: from.x - NECK - p.x, at: from }
      this.slid = null
    } else if (thing.is === 'tray' && this.save.open[thing.k]) {
      this.hand = { what: 'piece', k: thing.k, at: from, from: 'tray', grip: LENGTH[thing.k] / 2 }
      this.slid = null
    } else if (thing.is === 'wait' && this.save.wait.length === 1) {
      this.hand = { what: 'guest', at: from }
      this.slid = null
      this.say('call', CAST[this.save.wait[0]].pitch)
    } else if (thing.is === 'wait') {
      // Two come in by the door or not at all.
      this.act('wait', 'back')
      this.say('noRoom')
    }
  }

  private drag(at: Point): void {
    const h = this.hand
    this.far = Math.max(this.far, Math.hypot(at.x - this.liftFrom.x, at.y - this.liftFrom.y))
    if (!h) { this.stroke(at); return }
    if (h.what === 'slide') {
      const p = this.save.row[h.i]
      if (Math.abs(at.y - STRIP.mid) > LIFT + 10) {
        // Off the strip: from here it is in the air until it is let go.
        this.save.row.splice(h.i, 1)
        this.hand = { what: 'piece', k: p.k, at, from: 'row', grip: h.grip }
        this.say(`press${cap(p.k)}` as VoiceName)
        return
      }
      const before = p.x
      const set = slide(this.save.row, h.i, at.x - NECK - h.grip)
      h.at = at
      const went = Math.abs(p.x - before)
      this.look(p).x = p.x
      for (const q of this.save.row) if (q !== p) this.look(q).x += (q.x - this.look(q).x) * 0.9
      this.skidded += went
      if (set > 0 && !this.shoving) this.say('bump', 1, set + this.count)
      this.shoving = set > 0
      if (this.skidded > 34) {
        this.skidded = 0
        this.say(`skid${cap(p.k)}` as VoiceName, 1 + Math.min(0.6, went / 60))
      }
      return
    }
    h.at = at
  }
  private shoving = false
  private told: Fit | null = null

  private stroke(at: Point): void {
    const thing = this.slid
    if (!thing) return
    const far = Math.hypot(at.x - this.strokeFrom.x, at.y - this.strokeFrom.y)
    if (far < 44) return
    if (thing.is === 'customer') {
      this.strokeFrom = at
      this.acts.set('wriggle', { kind: String(at.x - NECK), at: this.now, n: this.count })
      this.say('purr', this.pitch(thing.n))
    } else if (thing.is === 'jumper') {
      this.strokeFrom = at
      const x = at.x - NECK, ring = this.save.row.findIndex((p) => x >= p.x && x <= endOf(p))
      if (ring >= 0) this.acts.set('ring', { kind: String(ring), at: this.now, n: this.count })
      this.say('ripple')
    } else if (thing.is === 'magpie') {
      this.strokeFrom = at
      this.act('magpie', 'ruffle')
      this.say('trill')
    }
  }

  private letGo(at: Point): void {
    const h = this.hand, near = this.far < NEAR
    this.hand = null
    this.shoving = false
    if (!h) {
      const thing = this.slid
      this.slid = null
      if (!thing) return
      if (thing.is === 'jumper' && this.liftFrom.y - at.y > 60) { this.pullOff(); return }
      if (near && thing.is !== 'customer' && thing.is !== 'magpie' && thing.is !== 'jumper') { this.pressed = thing; this.tap(); this.pressed = null }
      return
    }
    if (h.what === 'guest') { this.seat(at, near); return }
    if (h.what === 'slide') {
      const p = this.save.row[h.i]
      const to = settle(this.save.row, p.k, p.x, p)
      const free = !this.save.row.some((q) => q !== p && to.x < endOf(q) - 0.5 && q.x < to.x + LENGTH[p.k] - 0.5)
      if (to.kissed && free && to.x !== p.x) { p.x = to.x; this.say('kiss') } else this.say('layDown')
      this.snapshot = null
      this.change()
      return
    }
    this.snapshot = null
    if (near && h.from === 'tray') { this.tapTray(h.k); return }
    this.drop(h, at)
    if (h.from === 'row') this.change()
  }

  private drop(h: { k: Kind; grip: number }, at: Point): void {
    const k = h.k
    if (onStrip(at)) {
      if (this.save.row.length >= MOST) { this.home(k, at); this.say('full'); return }
      const to = settle(this.save.row, k, at.x - NECK - h.grip)
      const p: Piece = { k, x: to.x }
      const over = this.save.row.some((q) => p.x < endOf(q) - 0.5 && q.x < endOf(p) - 0.5)
      this.save.row.push(p)
      this.look(p).jolt = this.now
      this.look(p).born = this.now
      this.act('magpie', 'snip')
      this.later('closeUp', 0.12)
      if (over) this.say(`flop${cap(k)}` as VoiceName)
      else { this.say('layDown'); if (to.kissed) this.later('kiss', 0.06) }
      this.change()
      return
    }
    if (inside(MAGPIE, at, 4)) {
      this.act('magpie', k)
      this.say(k === 'sausage' ? 'scarf' : k === 'shoe' ? 'toot' : 'argue')
      this.home(k, at, 1.5, 'magpie')
      return
    }
    const thing = this.under(at)
    if (thing.is === 'customer' || thing.is === 'jumper') {
      const n = thing.is === 'customer' ? thing.n : this.whoAt(thing.x)
      const turn: Turn = CAST[this.save.on[n]].turn[k]
      this.act(`on${n}`, turn)
      this.say(TURN_VOICE[turn])
      this.home(k, at, 1.8, `on${n}`)
      return
    }
    this.home(k, at)
    this.say('hopHome', homePitch(k))
  }

  /** Back into its tray, after `wait` seconds in somebody's keeping. */
  private home(k: Kind, from: Point, wait = 0, by?: string): void {
    this.flights.push({ k, from, to: trayPoint(k), at: this.now + wait, lasts: 0.42, by })
  }

  private seat(at: Point, near: boolean): void {
    const p = CAST[this.save.wait[0]].pitch
    if (near) { this.callIn(); return }
    const back = (stay: number): void => { this.act('wait', 'back'); this.rebound = { at, t: this.now, stay, who: this.save.wait[0] } }
    if (inside(HEAD, at, 10)) {
      this.act('on0', 'rub')
      back(1)
      this.say('noseRub')
      return
    }
    if (inside({ ...BODY, h: BODY.h + 150 }, at)) {
      if (canJoin(this.save)) {
        const open = this.save.open
        this.save = join(this.save)
        for (const k of KINDS) if (this.save.open[k] && !open[k]) { this.torn[k] = this.now; this.say('tear') }
        this.joinedAt = this.cameAt = this.now
        this.say('bellies', p)
        this.change(true)
        return
      }
      back(0.15)
      this.say('noRoom')
      return
    }
    back(0)
    this.say('call', p)
  }

  private putBack(): void {
    this.hand = null
    this.slid = null
    this.shoving = false
    if (!this.snapshot) return
    this.save.row = this.snapshot
    this.snapshot = null
    this.change()
  }

  private pullOff(): void {
    if (this.save.row.length === 0) return
    this.offRow = this.save.row
    this.offAt = this.now
    for (const q of this.save.row) this.flights.push({ k: q.k, from: { x: NECK + q.x + LENGTH[q.k] / 2, y: STRIP.mid }, to: trayPoint(q.k), at: this.now, lasts: 0.5 })
    this.save.row = []
    this.say('off')
    this.change(true)
  }

  /** What the last change did to the jumper, said once, where it shows. */
  private compare(): void {
    const f = this.fit, was = this.told
    this.told = f
    if (!f) return
    if (f.holes.length > (was?.holes.length ?? 0)) this.later('hole', 0.35)
    if (f.bulges.length > (was?.bulges.length ?? 0)) this.later('bulge', 0.35)
    if (f.long && (!was?.long || f.end > was.end)) { this.later('long', 0.3); this.act('mice', 'trip') }
    // Covered to the tail tip: up it wriggles, and the one at the door sees it.
    if (!f.short && (!was || was.short)) { this.doneAt = this.now + 0.5; this.later('knock', 0.9) }
    if (f.close && !was?.close) this.save.on.forEach((w, n) => { this.later('warm', 0.45 + n * 0.3, CAST[w].pitch); this.act(`on${n}`, 'warm') })
  }

  // --- Scenes ----------------------------------------------------------------

  /** She hops along the rings and each gives its note. */
  private tune(): void {
    const row = this.save.row
    if (row.length === 0) {
      this.act('magpie', 'air')
      this.say('air')
      return
    }
    const order = row.map((_, i) => i).sort((a, b) => row[a].x - row[b].x)
    this.scene = { is: 'tune', at: this.now, lasts: 0.9 + 0.22 * row.length, order, said: 0 }
  }
  private playOn(s: Extract<Scene, { is: 'tune' }>): void {
    while (s.said < s.order.length && this.now - s.at >= 0.3 + s.said * 0.22) {
      const i = s.order[s.said++], p = this.save.row[i]
      if (!p) continue
      this.acts.set('ring', { kind: String(i), at: this.now, n: this.count })
      this.say(`puff${cap(p.k)}` as VoiceName)
    }
  }

  outcome(): CycleOutcome {
    const f = this.fit
    if (!f) return 'mixed'
    return f.close ? 'well' : f.faults >= faultsBad ? 'badly' : 'mixed'
  }

  private callIn(): void {
    const p = CAST[this.save.wait[0]].pitch
    if (!this.ready) {
      // Nobody gets up with a bare tail: the bare one shows it.
      this.act('wait', 'call')
      this.say('call', p)
      if (this.save.row.length) { this.act(`on${this.save.on.length - 1}`, 'cold'); this.later('short', 0.35) }
      return
    }
    const before = this.save, was = this.pitch(0), f = this.fit!
    for (const q of before.row) this.flights.push({ k: q.k, from: { x: NECK + q.x + LENGTH[q.k] / 2, y: STRIP.mid }, to: trayPoint(q.k), at: this.now, lasts: 0.5 })
    this.save = callNext(before, this.outcome())
    const tore = KINDS.filter((k) => this.save.open[k] && !before.open[k])
    for (const k of tore) this.torn[k] = Infinity
    this.scene = { is: 'next', at: this.now, lasts: 5.6, who: before.on, worn: before.row, tore, out: before.out, said: 0, pitch: p }
    this.giveBack()
    this.acts.clear()
    this.rebound = null
    this.say('goOff', was)
    if (f.holes.length) this.later('hole', 0.8)
    if (f.long) this.later('long', 1)
    this.change(true)
  }

  private comeIn(s: Extract<Scene, { is: 'next' }>, age: number): void {
    if (s.said === 0 && age >= 2.5) { s.said = 1; this.say('comeIn', s.pitch) }
    if (s.said === 1 && age >= 4) { s.said = 2; this.say('belly') }
    s.tore.forEach((k, n) => {
      if (this.torn[k] !== Infinity || age < 4.6 + n * 0.3) return
      this.torn[k] = this.now
      this.say('tear')
      this.act('magpie', 'air')
    })
  }

  private showOwed(): void {
    const idea = owed(this.save)
    if (!idea || this.scene) return
    this.save.shown = [...this.save.shown, idea]
    this.scene = { is: 'show', at: this.now, lasts: 4.6, idea, said: 0 }
    this.change(true)
  }

  /** The scene is over, by itself or by a touch: everything stands where it was going. */
  private finish(byItself: boolean): void {
    const s = this.scene
    this.scene = null
    if (s?.is === 'next') {
      for (const k of s.tore) if (this.torn[k] === Infinity) this.torn[k] = -99
      if (byItself) this.showOwed()
    }
  }

  private change(now = false): void {
    this.changed = true
    this.compare()
    if (now) this.urgent = true
  }
}
