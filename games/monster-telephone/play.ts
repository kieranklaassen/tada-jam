import type { Note } from './audio'
import { CATCH, CURTAIN, MIDDLE, MOLE_FACE, ON_MOLE, OSTRICH_HEAD, PULL, SACKS, SHELF_Y, catches, inBody, nearestPlace, onMole, onOstrich, placeAt, shelfOf, targetAt, type Target, type Who } from './layout'
import { BODIES, PARTS, PLACES, alike, bare, compare, copy, count, moved, type Body, type Compared, type Monster, type Part, type Place } from './monster'
import { PAIRS, copyWorld, refill, serialize, type World } from './save'
import type { Point } from './stage'
import { agree, bodyVoice, dance, later, partVoice, quieter, rub, takes, voice, type VoiceName } from './voices'

// The game with no browser in it. The Mount passes pointers in by their ids
// and stage points, and the seconds of each frame; a test does the same.
// - Every finger is on its own, and at most three carry, hold or pull.
// - The rules change at once; what flies, slides or runs is a picture of it.
// - A magnet in the hand has left the board in `world` and is put back by a
//   cancel, by a put-away and in what is saved.
// - Motion is read from when a thing last happened (`at`), so the view keeps
//   no springs and a test needs no view.

export const TAP_SLOP = 14
export const TAP_S = 0.45
export const LIFT_GRACE_S = 0.3
export const REGRAB = 140
const WORKING = 3

export type From = { kind: 'shelf' } | { kind: 'stuck'; who: Who; place: Place } | { kind: 'worn'; by: 'ostrich' | 'mole' }
export type Carry = { finger: number | null; part: Part; large: boolean; from: From; at: Point; start: Point; off: Point; vx: number; swing: number; lifted: number }
export type Flight = { part: Part; large: boolean; from: Point; to: Point; t: number; dur: number; kind: 'home' | 'slide' | 'patter'; /** Where it lands on a monster, so the view leaves it off until then. */ land?: { who: Who; place: Place } }
export type SackCarry = { finger: number | null; i: 0 | 1; at: Point; off: Point; lifted: number }
export type Stroke = { points: Point[]; finger: number | null; age: number; wiped: number }
export type Fact = { kind: 'part'; place: Place; part: Part; large: boolean } | { kind: 'body'; body: Body }
export type Meeting = { t: number; list: Compared[]; same: boolean; a: Monster; b: Monster; beat: number }
export type Hiding = { t: number; kind: 'sack' | 'own'; sack: 0 | 1; from: Point; a: Monster; b: Monster }

export const RUN_S = 0.9
export const LEAN_S = 0.6
export const BEAT_S = 0.7
export const TAKE_S = 2.4
export const HIDE_S = 1.8
export const MIME_S = 3
export const MIME_PEEK = 0.75
const SHOW_AFTER = 1.5

type Contact = { id: number; target: Target; from: Point; at: Point; seconds: number; moved: boolean; fired: boolean; extra: boolean; /** A small sound owed to a drag, so a slow one is not a machine gun. */ said: number }

export function meetingLength(m: Meeting): number {
  return RUN_S + LEAN_S + m.list.length * BEAT_S + TAKE_S
}

export class Play {
  now = 0
  heard: Note[] = []
  changed = false
  urgent = false
  readonly contacts = new Map<number, Contact>()
  carries: Carry[] = []
  sackCarry: SackCarry | null = null
  flights: Flight[] = []
  strokes: Stroke[] = []
  ready: Part | null = null
  meeting: Meeting | null = null
  hiding: Hiding | null = null
  mime: { t: number; fact: Fact; said: number } | null = null
  /** 0 hangs, 1 is rolled up by a finger. */
  lift = 0
  /** 0 shut, 1 drawn aside. */
  aside = 0
  /** How far the cord is pulled, in units. */
  pull = 0
  ostrichBend: Point | null = null
  moleReach: Point | null = null
  private told = 0
  private lastTouch = 0
  /** The mime on now is the first showing, which any touch ends; an answer is not ended by one. */
  private showing = false
  private readonly times = new Map<string, number>()

  constructor(readonly world: World) {
    this.aside = world.open ? 1 : 0
  }

  // --- What the view reads ----------------------------------------------------

  /** Seconds since something happened, or a long time. */
  since(key: string): number {
    return this.now - (this.times.get(key) ?? -99)
  }
  private mark(key: string): void {
    this.times.set(key, this.now)
  }
  /** A finger is doing something, or a scene runs: the child is not idle. */
  get busy(): boolean {
    return this.contacts.size > 0 || this.carries.length > 0 || this.meeting !== null || this.hiding !== null || this.mime !== null
  }
  get peeked(): boolean {
    return !this.world.open && [...this.contacts.values()].some((c) => c.target.kind === 'curtain' && !c.extra)
  }

  // --- What is saved ----------------------------------------------------------

  /** The board as it stands when nobody touches it. */
  saved(): Record<string, unknown> {
    const w = copyWorld(this.world)
    for (const carry of this.carries) this.restore(w, carry)
    return serialize(w)
  }
  private restore(w: World, carry: Carry): boolean {
    const from = carry.from
    if (from.kind === 'stuck' && w[from.who].on[from.place] === null) { w[from.who].on[from.place] = { part: carry.part, large: carry.large }; return true }
    if (from.kind === 'worn' && w.worn[from.by] === null) { w.worn[from.by] = carry.part; return true }
    return false
  }
  private change(now = false): void {
    this.changed = true
    if (now) this.urgent = true
  }
  private say(name: VoiceName): void {
    this.heard.push(...voice(name))
  }

  // --- Fingers ------------------------------------------------------------------

  private working(): number {
    let n = this.carries.filter((c) => c.finger !== null).length + (this.sackCarry && this.sackCarry.finger !== null ? 1 : 0)
    for (const c of this.contacts.values()) if (!c.extra && (c.target.kind === 'curtain' || c.target.kind === 'cord')) n++
    return n
  }

  down(id: number, p: Point): void {
    this.lastTouch = this.now
    // A scene gives way to any touch, and the touch is then answered as usual.
    if (this.showing) { this.mime = null; this.showing = false }
    this.land()
    const w = this.world
    // A carry that waits out a lifted finger goes on with the one that comes back.
    const waiting = this.carries.find((c) => c.finger === null && Math.hypot(p.x - c.at.x, p.y - c.at.y) < REGRAB)
    if (waiting) {
      waiting.finger = id
      waiting.off = { x: waiting.at.x - p.x, y: waiting.at.y - p.y }
      this.contacts.set(id, { id, target: { kind: 'board' }, from: p, at: p, seconds: 9, moved: true, fired: false, extra: false, said: 0 })
      return
    }
    if (this.sackCarry && this.sackCarry.finger === null && Math.hypot(p.x - this.sackCarry.at.x, p.y - this.sackCarry.at.y) < REGRAB) {
      this.sackCarry.finger = id
      this.sackCarry.off = { x: this.sackCarry.at.x - p.x, y: this.sackCarry.at.y - p.y }
      this.contacts.set(id, { id, target: { kind: 'board' }, from: p, at: p, seconds: 9, moved: true, fired: false, extra: false, said: 0 })
      return
    }
    const target = targetAt(p, { open: w.open, a: w.a, b: w.b, sacks: w.sacks !== null && this.sackCarry === null, drawings: w.pairs.length })
    const extra = this.working() >= WORKING
    const contact: Contact = { id, target, from: p, at: p, seconds: 0, moved: false, fired: false, extra, said: 0 }
    this.contacts.set(id, contact)
    if (extra) { this.say('tick'); this.mark('tick'); return }
    const worn = this.wornAt(p)
    if (worn) { contact.target = { kind: worn }; this.act(w.worn[worn]!, `worn:${worn}`); return }
    switch (target.kind) {
      case 'shelf': this.act(target.part, `shelf:${target.part}`); break
      case 'stuck':
        if (this.peeked) { this.mark(`${target.who}:${target.place}`); this.say('thup') } else this.act(w[target.who].on[target.place]!.part, `${target.who}:${target.place}`)
        break
      case 'body': this.mark(`press:${target.who}`); this.heard.push(...quieter(bodyVoice(w[target.who].body), 0.7)); break
      case 'curtain': {
        const second = [...this.contacts.values()].some((c) => c !== contact && c.target.kind === 'curtain')
        this.mark(second ? 'flap' : 'roll')
        this.say(second ? 'flap' : 'rollUp')
        if (!second) { this.mark('cover'); this.heard.push(...later(voice('slap'), 0.12), ...later(voice('rustle'), 0.2), ...later(voice('shy'), 0.5)) }
        break
      }
      case 'cord': this.mark('cord'); this.say('cord'); break
      case 'sack': this.mark(`sack:${target.i}`); this.say('knock'); break
      case 'ostrich': this.mark('ostrich'); this.say('cluck'); break
      case 'mole': this.mark('mole'); this.say('mumble'); break
      case 'wiper': this.wipe(); break
      case 'string': this.mark('string'); this.say('twang'); break
      case 'drawing': this.mark(`drawing:${target.i}`); this.say('doodle'); break
      case 'board':
        if (p.y < SHELF_Y - 70) this.strokes.push({ points: [p], finger: id, age: 0, wiped: 0 })
        this.say('marker')
        break
    }
  }

  private wornAt(p: Point): 'ostrich' | 'mole' | null {
    const near = (q: Point) => Math.hypot(p.x - q.x, p.y - q.y) < 46
    if (this.world.worn.ostrich && near({ x: OSTRICH_HEAD.x, y: OSTRICH_HEAD.y - 66 })) return 'ostrich'
    if (this.world.worn.mole && near(MOLE_FACE)) return 'mole'
    return null
  }

  private act(part: Part, key: string, soft = this.peeked): void {
    this.mark(key)
    this.heard.push(...quieter(partVoice(part), soft ? 0.5 : 1))
  }

  move(id: number, p: Point): void {
    const c = this.contacts.get(id)
    if (!c) return
    c.at = p
    const far = Math.hypot(p.x - c.from.x, p.y - c.from.y)
    if (!c.moved && far > TAP_SLOP) { c.moved = true; if (!c.extra) this.begin(c) }
    if (c.extra) return
    for (const carry of this.carries) if (carry.finger === id) carry.at = { x: p.x + carry.off.x, y: p.y + carry.off.y }
    if (this.sackCarry?.finger === id) this.sackCarry.at = { x: p.x + this.sackCarry.off.x, y: p.y + this.sackCarry.off.y }
    const stroke = this.strokes.find((s) => s.finger === id)
    if (stroke) {
      const last = stroke.points[stroke.points.length - 1]
      if (Math.hypot(p.x - last.x, p.y - last.y) > 7 && stroke.points.length < 90 && p.y < SHELF_Y - 60) {
        stroke.points.push(p)
        if (c.seconds - c.said > 0.12) { c.said = c.seconds; this.say('marker') }
      }
    }
    if (c.moved && c.target.kind === 'body' && c.seconds - c.said > 0.3) { c.said = c.seconds; this.say('creak') }
    if (c.target.kind === 'ostrich' && c.moved) { this.ostrichBend = p; if (c.seconds - c.said > 0.4) { c.said = c.seconds; this.say('bend') } }
    if (c.target.kind === 'mole' && c.moved) { this.moleReach = p; if (c.seconds - c.said > 0.35) { c.said = c.seconds; this.say('pat') } }
    if (c.target.kind === 'cord') {
      this.pull = Math.max(0, Math.min(90, p.y - c.from.y))
      if (!c.fired && this.pull >= PULL) { c.fired = true; this.pulled() }
    }
  }

  /** A press that has gone far enough becomes a carry. */
  private begin(c: Contact): void {
    const w = this.world, target = c.target
    if (target.kind === 'shelf') {
      if (this.ready === target.part) this.ready = null
      this.take(c, target.part, true, { kind: 'shelf' }, shelfOf(target.part))
      this.say('lift')
    } else if (target.kind === 'stuck') {
      const stuck = w[target.who].on[target.place]
      if (!stuck) return
      const at = placeAt(target.who, w[target.who].body, target.place)
      w[target.who].on[target.place] = null
      this.take(c, stuck.part, stuck.large, { kind: 'stuck', who: target.who, place: target.place }, at)
      this.mark(`wobble:${target.who}`)
      this.say('suck')
      this.change()
    } else if ((target.kind === 'ostrich' || target.kind === 'mole') && this.wornAt(c.from)) {
      const part = w.worn[target.kind]
      if (!part) return
      w.worn[target.kind] = null
      this.take(c, part, true, { kind: 'worn', by: target.kind }, target.kind === 'mole' ? MOLE_FACE : { x: OSTRICH_HEAD.x, y: OSTRICH_HEAD.y - 66 })
      this.mark(target.kind === 'mole' ? 'mole' : 'ostrich')
      this.say('suck')
      this.change()
      c.target = { kind: 'board' }
    } else if (target.kind === 'sack' && this.sackCarry === null && w.sacks) {
      this.sackCarry = { finger: c.id, i: target.i, at: { ...SACKS[target.i] }, off: { x: SACKS[target.i].x - c.from.x, y: SACKS[target.i].y - c.from.y }, lifted: 0 }
      this.say('hop')
    }
  }

  private take(c: Contact, part: Part, large: boolean, from: From, at: Point): void {
    this.carries.push({ finger: c.id, part, large, from, at: { ...at }, start: { ...at }, off: { x: (at.x - c.from.x) * 0.5, y: (at.y - c.from.y) * 0.5 - 8 }, vx: 0, swing: 0, lifted: 0 })
  }

  up(id: number): void {
    const c = this.contacts.get(id)
    if (!c) return
    this.contacts.delete(id)
    this.unhold(c)
    if (c.extra) return
    for (const carry of this.carries) if (carry.finger === id) { carry.finger = null; carry.lifted = 0; return }
    if (this.sackCarry?.finger === id) { this.sackCarry.finger = null; this.sackCarry.lifted = 0; return }
    if (c.moved || c.seconds > TAP_S) {
      // A magnet pressed long and not moved still hovers: a slow tap is a tap.
      if (!(c.target.kind === 'shelf' && !c.moved)) return
    }
    this.tap(c)
  }

  /** What a finger held is let go of, however it ends. */
  private unhold(c: Contact): void {
    const stroke = this.strokes.find((s) => s.finger === c.id)
    if (stroke) stroke.finger = null
    if (c.target.kind === 'cord') this.pull = 0
    if (c.target.kind === 'ostrich') this.ostrichBend = null
    if (c.target.kind === 'mole') this.moleReach = null
    if (c.target.kind === 'curtain' && !this.world.open && !this.peeked && !c.extra) { this.mark('drop'); this.say('drop') }
  }

  private tap(c: Contact): void {
    const w = this.world, target = c.target
    const ready = this.ready
    if (target.kind === 'shelf') {
      if (ready === target.part) { this.ready = null; this.say('tock') } else { this.ready = target.part; this.mark('ready') }
      return
    }
    if (ready && (target.kind === 'body' || target.kind === 'stuck' || target.kind === 'board')) {
      for (const who of this.hosts()) {
        const place = target.kind === 'stuck' ? (target.who === who ? target.place : null) : catches(c.at, who, w[who])
        if (place) { this.put(who, place, ready, true, null); this.ready = null; return }
      }
    }
    if (ready && (target.kind === 'ostrich' || target.kind === 'mole')) { this.wear(target.kind, ready); this.ready = null; return }
    switch (target.kind) {
      case 'stuck': {
        const stuck = w[target.who].on[target.place]
        if (!stuck) return
        stuck.large = !stuck.large
        this.mark(`${target.who}:${target.place}`)
        this.mark(`size:${target.who}:${target.place}`)
        this.say(this.peeked ? 'thup' : stuck.large ? 'growLarge' : 'goSmall')
        this.echo(target.place)
        this.change()
        return
      }
      case 'body': {
        const m = w[target.who]
        m.body = BODIES[(BODIES.indexOf(m.body) + 1) % BODIES.length]
        this.mark(`shape:${target.who}`)
        this.heard.push(...bodyVoice(m.body))
        this.echo(null)
        this.change()
        return
      }
      case 'ostrich':
        if (w.open || this.wornAt(c.at)) { this.mark('kick'); this.say('honk') } else this.nextMime()
        return
      case 'mole': this.mark('nod'); return
      case 'sack': this.say('hop'); return
      case 'cord': this.mark('shiver'); return
    }
  }

  /** Two that stand open and now agree somewhere answer each other there, once for each touch. */
  private echo(place: Place | null): void {
    const w = this.world
    if (!w.open || this.meeting) return
    if (alike(w.a, w.b) && count(w.a) > 0) {
      for (const one of PLACES) if (w.a.on[one]) { this.mark(`a:${one}`); this.mark(`b:${one}`) }
      this.mark('hopBoth')
      this.heard.push(...later(agree(0), 0.1), ...later(agree(2), 0.22), ...later(agree(3), 0.34))
      return
    }
    if (!place) return
    const p = w.a.on[place], q = w.b.on[place]
    if (p && q && p.part === q.part && p.large === q.large) {
      this.mark(`a:${place}`); this.mark(`b:${place}`)
      this.heard.push(...later(agree(PLACES.indexOf(place)), 0.12))
    }
  }

  private hosts(): Who[] {
    return this.world.open ? ['b', 'a'] : ['b']
  }

  // --- Magnets -------------------------------------------------------------------

  /** Sticks a part on. What was there changes places with it, or flies home. */
  private put(who: Who, place: Place, part: Part, large: boolean, from: From | null): void {
    const m = this.world[who], there = m.on[place]
    m.on[place] = { part, large }
    this.mark(`${who}:${place}`)
    this.mark(`wobble:${who}`)
    for (const one of PLACES) if (one !== place && m.on[one]) this.mark(`ring:${who}:${one}`)
    if (there) {
      this.say('swap')
      if (from && from.kind === 'stuck' && this.world[from.who].on[from.place] === null && !(from.who === who && from.place === place)) {
        this.world[from.who].on[from.place] = there
        this.flights.push({ part: there.part, large: there.large, from: placeAt(who, m.body, place), to: placeAt(from.who, this.world[from.who].body, from.place), t: 0, dur: 0.35, kind: 'home', land: { who: from.who, place: from.place } })
      } else this.home(there.part, there.large, placeAt(who, m.body, place), 'home')
    }
    this.say('clack')
    this.echo(place)
    this.change()
  }

  private home(part: Part, large: boolean, from: Point, kind: Flight['kind']): void {
    this.flights.push({ part, large, from: { ...from }, to: shelfOf(part), t: 0, dur: kind === 'slide' ? 0.75 : 0.45, kind })
    this.say(kind === 'slide' ? 'squeal' : 'whistle')
  }

  private wear(by: 'ostrich' | 'mole', part: Part): void {
    const old = this.world.worn[by]
    if (old) this.home(old, true, by === 'mole' ? MOLE_FACE : { x: OSTRICH_HEAD.x, y: OSTRICH_HEAD.y - 66 }, 'home')
    this.world.worn[by] = part
    this.mark(`wear:${by}`)
    this.say('smack')
    this.heard.push(...later(voice(by === 'ostrich' ? (part === 'nose' ? 'coo' : part === 'mouth' ? 'hiccup' : 'cluck') : part === 'hand' ? 'giggle' : part === 'eye' ? 'hinge' : 'snort'), 0.12))
    this.change()
  }

  private drop(carry: Carry): void {
    const p = carry.at
    this.carries = this.carries.filter((c) => c !== carry)
    for (const who of this.hosts()) {
      const place = catches(p, who, this.world[who])
      if (place) { this.put(who, place, carry.part, carry.large, carry.from); return }
    }
    if (onMole(p)) { this.wear('mole', carry.part); return }
    if (onOstrich(p) || Math.hypot(p.x - OSTRICH_HEAD.x, p.y - OSTRICH_HEAD.y + 60) < 60) { this.wear('ostrich', carry.part); return }
    if (p.y > SHELF_Y - 70) {
      this.flights.push({ part: carry.part, large: carry.large, from: { ...p }, to: shelfOf(carry.part), t: 0, dur: 0.22, kind: 'patter' })
      this.say('tock')
    } else this.home(carry.part, carry.large, p, 'slide')
    this.change()
  }

  /** Back where it came from: the child did not let go. */
  private putBack(carry: Carry): void {
    this.carries = this.carries.filter((c) => c !== carry)
    const from = carry.from
    if (this.restore(this.world, carry)) {
      const to = from.kind === 'stuck' ? placeAt(from.who, this.world[from.who].body, from.place) : from.kind === 'worn' && from.by === 'mole' ? MOLE_FACE : { x: OSTRICH_HEAD.x, y: OSTRICH_HEAD.y - 66 }
      this.flights.push({ part: carry.part, large: carry.large, from: { ...carry.at }, to, t: 0, dur: 0.3, kind: 'home', land: from.kind === 'stuck' ? { who: from.who, place: from.place } : undefined })
      this.change()
    } else this.flights.push({ part: carry.part, large: carry.large, from: { ...carry.at }, to: shelfOf(carry.part), t: 0, dur: 0.3, kind: 'home' })
  }

  cancel(id: number): void {
    const c = this.contacts.get(id)
    if (!c) return
    this.contacts.delete(id)
    this.unhold(c)
    for (const carry of [...this.carries]) if (carry.finger === id) this.putBack(carry)
    if (this.sackCarry?.finger === id) this.sackCarry = null
  }

  /** The game is put away: what the child had let go of falls where it hung, what is under a finger goes back. */
  clear(): void {
    for (const carry of [...this.carries]) if (carry.finger === null) this.drop(carry)
    if (this.sackCarry && this.sackCarry.finger === null) this.dropSack()
    for (const id of [...this.contacts.keys()]) this.cancel(id)
    this.land()
    this.flights = []
    this.lift = 0
    this.aside = this.world.open ? 1 : 0
    this.heard = []
  }

  // --- The board -------------------------------------------------------------------

  private wipe(): void {
    this.mark('wiper')
    this.say('rub')
    for (const s of this.strokes) { s.finger = null; if (s.age < 6) s.age = 6 }
  }

  // --- Curtain, cord, sacks ----------------------------------------------------------

  private pulled(): void {
    if (this.meeting || this.hiding) return
    if (this.world.open) this.hide('own', 0, SACKS[0])
    else this.meet()
  }

  private meet(): void {
    const w = this.world
    this.mime = null
    const list = compare(w.a, w.b)
    this.meeting = { t: 0, list, same: alike(w.a, w.b), a: copy(w.a), b: copy(w.b), beat: -1 }
    w.place = moved(w.place, w.a, w.b, w.own)
    w.open = true
    refill(w)
    w.pairs.push([copy(w.a), copy(w.b)])
    if (w.pairs.length > PAIRS) { w.pairs.shift(); this.mark('wiped') }
    this.mark('met')
    this.say('zip')
    this.heard.push(...later(voice('glug'), 0.1), ...later(voice('peep'), RUN_S))
    this.change(true)
  }

  private dropSack(): void {
    const s = this.sackCarry!
    this.sackCarry = null
    const home = SACKS[s.i], far = Math.hypot(MIDDLE.a.x - s.at.x, MIDDLE.a.y - s.at.y), whole = Math.hypot(MIDDLE.a.x - home.x, MIDDLE.a.y - home.y)
    const over = s.at.x > CURTAIN.x0 - 40 && s.at.x < CURTAIN.x1 + 20 && s.at.y < CURTAIN.y1
    if (over || far < whole / 2) this.hide('sack', s.i, s.at)
    else { this.mark(`sack:${s.i}`); this.mark('sackHome'); this.say('hop') }
  }

  private hide(kind: 'sack' | 'own', sack: 0 | 1, from: Point): void {
    const w = this.world
    if (!w.open || (kind === 'sack' && !w.sacks)) return
    this.mime = null
    this.told = 0
    // What is in a hand stays in the hand: it belongs to no monster now, so it will not go back to one that has left.
    for (const carry of this.carries) if (carry.from.kind === 'stuck') carry.from = { kind: 'shelf' }
    this.hiding = { t: 0, kind, sack, from: { ...from }, a: copy(w.a), b: copy(w.b) }
    for (const place of PLACES) {
      const stuck = w.b.on[place]
      if (stuck) this.flights.push({ part: stuck.part, large: stuck.large, from: placeAt('b', w.b.body, place), to: shelfOf(stuck.part), t: -0.15 - 0.07 * PLACES.indexOf(place), dur: 0.5, kind: 'patter' })
    }
    if (kind === 'sack') { w.a = copy(w.sacks![sack]); w.own = false } else w.own = true
    w.b = bare()
    w.sacks = null
    w.open = false
    this.say('zipBack')
    if (kind === 'sack') this.say('sackIn')
    if (count(this.hiding.b) > 0) this.say('patter')
    this.mark('hid')
    this.change(true)
  }

  /** Any touch lands a scene where it ends. */
  private land(): void {
    if (this.meeting) { this.meeting = null; this.aside = 1; this.mark('landed') }
    if (this.hiding) { this.hiding = null; this.aside = 0; this.flights = this.flights.filter((f) => f.kind !== 'patter') }
  }

  // --- The mime -------------------------------------------------------------------------

  facts(): Fact[] {
    const { a, b } = this.world, out: Fact[] = []
    if (a.body !== 'round' || b.body !== 'round') out.push({ kind: 'body', body: a.body })
    for (const place of PLACES) { const s = a.on[place]; if (s) out.push({ kind: 'part', place, part: s.part, large: s.large }) }
    return out
  }

  private nextMime(): void {
    const facts = this.facts()
    if (facts.length === 0) { this.mark('kick'); this.say('honk'); return }
    const fact = facts[this.told % facts.length]
    this.told += 1
    this.mime = { t: 0, fact, said: 0 }
    this.say('peek')
  }

  // --- Time ---------------------------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    this.now += dt
    const w = this.world
    for (const c of this.contacts.values()) c.seconds += dt
    for (const carry of [...this.carries]) {
      if (carry.finger === null) { carry.lifted += dt; if (carry.lifted > LIFT_GRACE_S) { this.drop(carry); continue } }
      const v = (carry.at.x - carry.start.x) / dt
      carry.start = { ...carry.at }
      carry.vx += (Math.max(-900, Math.min(900, v)) - carry.vx) * Math.min(1, dt * 10)
      carry.swing += (carry.vx * 0.0006 - carry.swing) * Math.min(1, dt * 9)
    }
    if (this.sackCarry && this.sackCarry.finger === null) { this.sackCarry.lifted += dt; if (this.sackCarry.lifted > LIFT_GRACE_S) this.dropSack() }
    for (const f of this.flights) {
      const was = f.t
      f.t += dt
      if (was < f.dur && f.t >= f.dur) {
        this.mark(f.land ? `${f.land.who}:${f.land.place}` : `shelfLand:${f.part}`)
        if (f.kind === 'home') this.say('tick')
      }
    }
    if (this.flights.some((f) => f.t >= f.dur)) this.flights = this.flights.filter((f) => f.t < f.dur)
    for (const s of this.strokes) if (s.finger === null) s.age += dt
    if (this.strokes.some((s) => s.age > 9)) this.strokes = this.strokes.filter((s) => s.age <= 9)
    if (this.strokes.length > 8) this.strokes.splice(0, this.strokes.length - 8)
    this.lift += ((this.peeked ? 1 : 0) - this.lift) * Math.min(1, dt * (this.peeked ? 11 : 15))
    const aside = w.open ? 1 : 0
    this.aside = aside > this.aside ? Math.min(aside, this.aside + dt / RUN_S) : Math.max(aside, this.aside - dt / RUN_S)
    this.stepMeeting(dt)
    if (this.hiding) { this.hiding.t += dt; if (this.hiding.t >= HIDE_S) this.hiding = null }
    this.stepMime(dt)
    if (!w.shown && !this.mime && !this.busy && !w.open && this.now - this.lastTouch >= SHOW_AFTER) {
      w.shown = true
      this.showing = true
      this.change(true)
      this.nextMime()
    }
  }

  private stepMeeting(dt: number): void {
    const m = this.meeting
    if (!m) return
    m.t += dt
    const beat = Math.floor((m.t - RUN_S - LEAN_S) / BEAT_S)
    if (beat !== m.beat && beat >= 0 && m.t > RUN_S + LEAN_S) {
      m.beat = beat
      const one = m.list[beat]
      if (one) {
        this.mark(`beat:${one.place}`)
        if (one.a) { this.mark(`a:${one.place}`); this.heard.push(...quieter(partVoice(one.a.part), 0.6)); this.mark(`rattle:${one.a.part}`) }
        if (one.b) {
          // Alone, each in its turn; together, at once.
          if (one.likeness === 'same') this.mark(`b:${one.place}`)
          else { this.times.set(`b:${one.place}`, this.now + 0.22); this.heard.push(...later(quieter(partVoice(one.b.part), 0.6), 0.22)) }
        }
        this.heard.push(...(one.likeness === 'same' ? agree(beat) : rub(beat)))
        if (one.likeness !== 'same') this.mark('stare')
      } else if (beat === m.list.length) {
        this.mark('taken')
        if (m.same) {
          this.heard.push(...dance())
          for (const one of m.list) { this.mark(`a:${one.place}`); this.mark(`b:${one.place}`) }
        } else this.heard.push(...takes(m.a.body), ...later(takes(m.b.body), 0.35), ...later(voice('clang'), 0.6))
        this.heard.push(...later(voice('pop'), 1.2))
      }
    }
    if (m.t >= meetingLength(m)) this.meeting = null
  }

  private stepMime(dt: number): void {
    const m = this.mime
    if (!m) return
    m.t += dt
    if (m.said === 0 && m.t >= MIME_PEEK) { m.said = 1; this.say('babble'); this.mark('pulse'); if (m.fact.kind === 'part') this.say('marker') }
    if (m.said === 1 && m.t >= MIME_PEEK + 0.5) {
      m.said = 2
      const fact = m.fact
      if (fact.kind === 'part') { this.heard.push(...partVoice(fact.part)); this.mark('mimeAct') } else { this.say(fact.body === 'round' ? 'swell' : fact.body === 'tall' ? 'stretch' : 'sink'); this.mark('mimeAct') }
    }
    if (m.said === 2 && m.t >= MIME_PEEK + 1.2) { m.said = 3; this.mark('molePat'); this.say('pat') }
    if (m.t >= MIME_S) { this.mime = null; if (this.showing) { this.showing = false; this.mark('reach') } }
  }

  /** Where the mole pats itself for the fact that is being told, or null. */
  patting(): Point | null {
    const m = this.mime
    return m && m.fact.kind === 'part' && m.t >= MIME_PEEK + 1.1 ? ON_MOLE[m.fact.place] : null
  }

  /** For the idle hand: a part that is not the next answer, and a place to show it going to. */
  example(): Part {
    const taken = this.world.a.on.top?.part
    return PARTS.find((part) => part !== taken && part === 'tail') ?? 'ear'
  }

  /** Whether a carried magnet would jump on if it were let go now, for the view's glow. */
  wouldCatch(p: Point): { who: Who; place: Place } | null {
    for (const who of this.hosts()) {
      const near = nearestPlace(p, who, this.world[who].body)
      if (near.far <= CATCH || inBody(p, who, this.world[who].body)) return { who, place: near.place }
    }
    return null
  }
}
export type { Monster }
