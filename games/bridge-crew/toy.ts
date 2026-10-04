import { settle, solve, type Answer, type Frame } from './frame'
import { layPart, plucked, pullPin, putPin, takeOffPart, turnPart } from './grid'
import { key, length, pinsOf, reach, samePoint, type Kind, type Part, type Point } from './kit'
import { PART_REACH, TRAY, bayAt, farFromStretch, touched } from './layout'
import { ChiefDirector } from './motion'
import { atRest, ends, follow, rests, unrest, type Moving, type Rest } from './pose'
import { edit, type Save } from './save'
import { groundAt } from './sheet'
import { canPin, isFooting, site, type Site } from './sites'
import { chiefCroak, chiefRuffle, chiefTaps, fold, growCreak, knock, touchPart, lay as layVoice, pick, pinClick, pinRattle, pinSwing, pinTick, putBack, snapTick, type VoiceSpec } from './voices'

// The toy: the bridge on the board, a finger, and what the two do to each
// other. Pure: no renderer, no DOM and no clock of its own. The Mount feeds it
// gestures in grid cells and steps of attended time; it answers with what to
// draw (its public fields), what to sound (`takeVoices`) and whether the saved
// state changed (`takeChange`).
//
// Every press is answered where it lands, in the same call: a pin clicks in,
// a part lifts, a pile stirs. What follows (a tap or a drag) builds on that
// answer and never waits for it.

/** What the finger is doing. */
export type Hand =
  /** On a grid point: a pin went in on touch-down. */
  | { what: 'pin'; at: Point }
  /** Dragging a new part out from that pin: it grows to the grid point nearest the finger that it can reach. Dragged to the tray instead, it is the pin itself that is taken off (`pulling`), and the parts on it drop loose at that end. */
  | { what: 'lay'; kind: Kind; from: Point; to: Point; finger: readonly [number, number]; pulling: boolean }
  /** On a part's body: a tap plucks or turns it, a drag carries it off. `finger` is where it is carried to. */
  | { what: 'part'; index: number; carried: boolean; from: readonly [number, number]; finger: readonly [number, number] }
  | { what: 'bay'; kind: Kind }
  | { what: 'chief' }
  /** The game's own (game.ts): a vehicle at either bank, the next sheet's roll, a sheet on the rack. */
  | { what: 'vehicle'; id: string; across: boolean; from: number; pulled: number }
  | { what: 'roll' }
  | { what: 'rack'; index: number }
  /** The trolley in its compartment or on the bridge, and the tracing paper: `spot` is the pad or one of the two kept tracings. */
  | { what: 'trolley'; placed: boolean; carried: boolean; finger: readonly [number, number]; ran: number; home: { x: number; under: boolean } | { pin: Point } | null }
  | { what: 'tracing'; spot: 'pad' | 0 | 1; carried: boolean; finger: readonly [number, number] }
  /** The small model in the margin, pressed; and one part of the tracing laid on the board, to be copied. */
  | { what: 'model' }
  | { what: 'traced'; index: number }
  /** One of the crew at the foot of the sheet. */
  | { what: 'crew'; who: 'beaver' | 'mole' }

/** How long a plucked part goes on ringing, in seconds: a second tap inside it turns the part. */
export const RING = 0.8
/** A carried part let go further than this from where it lay goes back to the tray; nearer, it goes back where it was. */
export const CARRY_OFF = 1
/** Where the crew chief stands, in cells: on a ruled ledge in the top left margin of the sheet, clear of both banks. And how near a touch must be to poke it. */
export const CHIEF = { x: 0.7, y: 10.9, reach: 1.5 } as const

/** A hinge ticks once for each notch a part on it turns through, in radians, and no faster than one tick in `gap` seconds. The notches lie clear of the angles a part can be laid at. */
export const NOTCH = { turn: 0.3, gap: 0.05, creep: 0.08, rest: 0.2 } as const

/** How fast a lone part on a pin is sent round when its pin is turned, in radians a second: over the top once, and then it hangs. */
export const SPIN = 15

/** How far the two pins of a tied part may be from its own length apart, as a share of it, and still be drawn joined. */
const TIE = 0.3
/** What is built leans toward a part being laid: a pin in the air by up to `far` cells, less the further it is from the finger, and not at all beyond `reach`. */
export const LEAN = { far: 0.07, reach: 5 } as const

/**
 * What a touch leaves behind for a moment, drawn in the drafting white: specks
 * that fly out from a pin as it clicks in, dust where a part lands or a pile
 * is stirred, the blast of a horn, and a feather the chief loses when it is
 * poked, which floats down to its ledge and lies there a while. Short-lived:
 * never saved.
 */
export type Mark = { what: 'ring' | 'dust' | 'toot' | 'feather'; at: readonly [number, number]; since: number; life: number }
/** How long each mark lasts, in seconds, and how many feathers lie on the ledge at most. */
export const MARKS = { ring: 0.5, dust: 0.55, toot: 0.5, feather: 16, feathers: 2, most: 14 } as const
/** Where a feather is at a moment of its life: it sways down from where it came loose to the chief's ledge in a second and a half, and lies still. */
export function featherAt(mark: Mark): { x: number; y: number; turn: number } {
  const t = Math.min(1, mark.since / 1.5), sway = Math.sin(t * Math.PI * 2.5) * (1 - t)
  return { x: mark.at[0] + 0.5 * t + 0.35 * sway, y: mark.at[1] + (CHIEF.y + 0.06 - mark.at[1]) * t * (2 - t), turn: 0.9 * sway }
}

/** A part on its way back to the tray after it was taken off: drawn until it gets there. */
export type Flying = { part: Part; a: readonly [number, number]; b: readonly [number, number]; since: number }

export class Toy {
  save: Save
  at: Site
  /** The kind of part the next drag lays: the pile last touched in the tray. */
  selected: Kind
  hand: Hand | null = null
  frame!: Frame
  answer!: Answer
  rest: Rest[] = []
  /** Each part as it is drawn now, in step with the bridge's list. */
  moving: Moving[] = []
  /** Seconds since each part was plucked, turned and laid: what its ring, its turn and its landing are drawn from. */
  rung: number[] = []
  /** Seconds since each part was shaken by a rattle of a pin it is on, and how far each has crept since its hinge last ticked. Short-lived, and kept by place in the bridge: both start again when a part leaves. */
  shook: number[] = []
  private crept: number[] = []
  turned: number[] = []
  laid: number[] = []
  /** Seconds since a pin last clicked in at each grid point, by its key. */
  clicked = new Map<string, number>()
  flying: Flying[] = []
  marks: Mark[] = []
  /** How far what is built leans toward a part being laid, 0 to 1: it eases in while the part grows and out when it lands. And where to, and the pin the part grows from, which stays put. */
  leaning = 0
  private leanTo: readonly [number, number] = [0, 0]
  private leanFrom: Point | null = null
  /** Seconds since a hinge last ticked. */
  private ticked = Infinity
  /** Seconds since the pin at each grid point was last rattled, by its key: a second tap inside the ring turns it. */
  private rattled = new Map<string, number>()
  readonly chief: ChiefDirector
  seconds = 0
  protected voices: VoiceSpec[] = []
  protected changed = false

  constructor(save: Save, random: () => number) {
    this.save = save
    const sheet = save.sheets[save.on]
    this.at = site(sheet.site, sheet.variant)
    this.selected = this.pileFor()
    this.chief = new ChiefDirector(random)
    this.model()
    // Found as left: every part is where it rests, and nothing eases in.
    this.moving = this.rest.map(atRest)
    this.rung = this.bridge.map(() => Infinity)
    this.turned = this.bridge.map(() => Infinity)
    this.laid = this.bridge.map(() => Infinity)
  }

  /**
   * The pile that is picked when a sheet comes onto the board, or the game is
   * opened again: the kind of the part laid last, so the child finds the pile
   * it was building from, if any of that kind is left; otherwise the first
   * pile that has a part in it.
   */
  protected pileFor(): Kind {
    const kinds = ['plank', 'stick', 'tube', 'thread'] as const, parts = this.save.sheets[this.save.on].bridge, last = parts[parts.length - 1]?.kind
    const left = (kind: Kind) => this.at.kit[kind] - parts.filter((part) => part.kind === kind).length
    if (last && left(last) > 0) return last
    return kinds.find((kind) => left(kind) > 0) ?? kinds.find((kind) => this.at.kit[kind] > 0) ?? 'plank'
  }

  get bridge(): readonly Part[] {
    return this.save.sheets[this.save.on].bridge
  }

  /** The two ends of every part as drawn now. */
  drawn(): { a: [number, number]; b: [number, number] }[] {
    const out = this.bridge.map((part, index) => ends(this.moving[index], length(part)))
    // A part pinned at each end to a part that swings goes with both, for as long as the two pins are as far apart as
    // it is long: so a square leans into a diamond with its top on, and lies down whole.
    this.rest.forEach((rest, index) => {
      if (!rest || !rest.via || !rest.tie || !out[rest.via.part] || !out[rest.tie.part]) return
      const on = (link: { part: number; share: number }): [number, number] => { const e = out[link.part]; return [e.a[0] + (e.b[0] - e.a[0]) * link.share, e.a[1] + (e.b[1] - e.a[1]) * link.share] }
      const near = on(rest.via), far = on(rest.tie), long = length(this.bridge[index])
      if (Math.abs(Math.hypot(far[0] - near[0], far[1] - near[1]) - long) > TIE * long) return
      out[index] = rest.pivot === 0 ? { a: near, b: far } : { a: far, b: near }
    })
    return out
  }

  /** How long ago each part was shaken, by a pluck of its own or by a rattle of a pin it is on: what the view draws its shake from. */
  shakeOf(index: number): number {
    return Math.min(this.rung[index] ?? Infinity, this.shook[index] ?? Infinity)
  }

  /** How many parts of a kind are still in the tray. */
  left(kind: Kind): number {
    return this.at.kit[kind] - this.bridge.filter((part) => part.kind === kind).length
  }

  /** True while anything is still on its way to rest: the scene is alive and must be drawn. */
  get busy(): boolean {
    return this.hand !== null || this.flying.length > 0 || this.marks.length > 0 || this.leaning > 0.01 || this.bridge.some((part, index) => unrest(this.moving[index], this.rest[index], length(part)) > 0.002 || this.rung[index] < RING + 0.4 || this.turned[index] < 0.6 || this.laid[index] < 0.6)
  }

  /** Leaves a mark on the sheet. Only so many at once, and only so many feathers. */
  protected mark(what: Mark['what'], at: readonly [number, number]): void {
    if (what === 'feather') { const lying = this.marks.filter((mark) => mark.what === 'feather'); if (lying.length >= MARKS.feathers) this.marks.splice(this.marks.indexOf(lying[0]), 1) }
    this.marks.push({ what, at, since: 0, life: MARKS[what] })
    if (this.marks.length > MARKS.most) this.marks.shift()
  }

  takeVoices(): VoiceSpec[] {
    const voices = this.voices
    this.voices = []
    return voices
  }

  /** True once after each change to what is saved. */
  takeChange(): boolean {
    const changed = this.changed
    this.changed = false
    return changed
  }

  // --- Gestures, in grid cells -------------------------------------------------

  press(x: number, y: number): void {
    const bay = bayAt(this.at, x, y)
    if (bay) {
      this.hand = { what: 'bay', kind: bay.kind }
      this.selected = bay.kind
      this.voices.push(pick(bay.kind))
      // The pile stirs: a little dust at its foot.
      this.mark('dust', [(bay.x0 + bay.x1) / 2, TRAY.top - TRAY.tall + 0.25])
      return
    }
    if (Math.hypot(x - CHIEF.x - 0.4, y - (CHIEF.y + 1.2)) <= CHIEF.reach) {
      this.hand = { what: 'chief' }
      this.chief.poke()
      this.voices.push(chiefCroak)
      // It loses a feather, which floats down to its ledge.
      this.mark('feather', [CHIEF.x + 0.1, CHIEF.y + 1.7])
      return
    }
    const target = touched(this.at, this.bridge, this.drawn(), x, y)
    if (!target) { this.hand = null; return }
    if ('pin' in target) {
      this.hand = { what: 'pin', at: target.pin }
      this.clicked.set(key(target.pin), 0)
      this.voices.push(pinClick)
      this.mark('ring', target.pin)
      // Every part already on that pin shivers.
      this.bridge.forEach((part, index) => { if (pinsOf(part).some((p) => samePoint(p, target.pin))) this.moving[index].turn.speed += index % 2 ? 0.9 : -0.9 })
      return
    }
    this.hand = { what: 'part', index: target.part, carried: false, from: [x, y], finger: [x, y] }
    // The part lifts under the finger: it jumps a hair toward it, and the springs bring it back. And it is heard, softly.
    this.moving[target.part].y.speed += 1.2
    this.voices.push(touchPart(this.bridge[target.part].kind, length(this.bridge[target.part])))
  }

  tap(): void {
    const hand = this.hand
    this.hand = null
    if (!hand) return
    if (hand.what === 'pin') {
      const back = putPin(this.bridge, hand.at)
      if (back.pinned.length) { this.voices.push(back.result.voice); this.commit(back.bridge); return }
      const on = this.bridge.flatMap((part, index) => (pinsOf(part).some((p) => samePoint(p, hand.at)) ? [index] : []))
      if (on.length === 0) {
        // No part is pinned there. If a part's body passes over that grid point (the middle of a slanting stick), the
        // tap is a tap on that part.
        const drawn = this.drawn()
        let over = -1, far = PART_REACH
        this.bridge.forEach((_, index) => { const d = farFromStretch(hand.at[0], hand.at[1], drawn[index].a, drawn[index].b); if (d <= far) { far = d; over = index } })
        if (over >= 0) this.tapPart(over)
        return
      }
      // A grid point along a plank where no part ends is the plank, not a joint: a tap there plucks the plank, and a
      // second tap while it rings turns it. So any tap on a part plucks it, wherever along it the finger lands.
      if (!on.some((index) => samePoint(this.bridge[index].a, hand.at) || samePoint(this.bridge[index].b, hand.at))) { this.tapPart(on[0]); return }
      // A second tap while it still rings turns the pin: a lone part that hangs on it swings right round like a clock
      // hand, ticking as it goes, and hangs straight down again.
      const lone = on.length === 1 && this.rest[on[0]].how === 'hangs'
      if (lone && (this.rattled.get(key(hand.at)) ?? Infinity) < RING) {
        // Fast enough to go over the top: once round, and then it swings and hangs straight down.
        this.moving[on[0]].turn.speed += on[0] % 2 ? SPIN : -SPIN
        this.voices.push(pinSwing)
        this.rattled.delete(key(hand.at))
        return
      }
      // Every part on the pin rattles at once, each in its own voice.
      this.voices.push(pinRattle(on.map((index) => this.pluckOf(index)[0])))
      // Each shakes as far as if it had been plucked; a tap on one of them after this still plucks it and does not turn it.
      for (const index of on) { this.shook[index] = 0; this.rung[index] = Math.max(this.rung[index], RING) }
      this.rattled.set(key(hand.at), 0)
    }
    if (hand.what === 'part') this.tapPart(hand.index)
  }

  /** A tap on a part: it is plucked, and a second tap while it still rings turns it. */
  private tapPart(index: number): void {
    if (this.rung[index] < RING) {
      const turnedOver = turnPart(this.bridge, index)
      if (!turnedOver) return
      this.voices.push(turnedOver.result.voice)
      this.turned[index] = 0
      this.rung[index] = Infinity
      this.commit(turnedOver.bridge)
    } else {
      this.voices.push(this.pluckOf(index))
      this.rung[index] = 0
      this.plucked(index)
    }
  }

  dragStart(): void {
    const hand = this.hand
    if (!hand) return
    // With none left of the picked kind, the pile that still has some is picked: a drag always lays something while the kit has a part.
    if (hand.what === 'pin' && this.left(this.selected) <= 0) this.selected = this.pileFor()
    if (hand.what === 'pin') this.hand = { what: 'lay', kind: this.selected, from: hand.at, to: hand.at, finger: hand.at, pulling: false }
    if (hand.what === 'part') hand.carried = true
  }

  dragMove(x: number, y: number): void {
    const hand = this.hand
    if (!hand) return
    if (hand.what === 'lay') {
      hand.finger = [x, y]
      // Over the tray nothing is being laid: the pin itself is on its way off.
      hand.pulling = bayAt(this.at, x, y) !== null
      if (hand.pulling) return
      const to = reach(hand.kind, hand.from, [x, y])
      if (canPin(this.at, to) && !samePoint(to, hand.to)) {
        hand.to = to
        // It grows with a dry creak that falls as it gets longer, and its free end ticks onto the grid point.
        this.voices.push(growCreak(hand.kind, length({ a: hand.from, b: to })), snapTick(hand.kind, length({ a: hand.from, b: to })))
      }
    }
    if (hand.what === 'part') hand.finger = [x, y]
  }

  /** The drag is over: the part is laid, or the carried part goes to the tray or back where it lay. */
  dragEnd(): void {
    const hand = this.hand
    this.hand = null
    if (!hand) return
    if (hand.what === 'lay' && hand.pulling) {
      // Take off, the pin's way: dragged to the tray, it comes out with a pop, and every part on it drops loose at that
      // end; a part that hung by that pin alone falls and goes back to its pile.
      const pulled = pullPin(this.bridge, hand.from)
      if (pulled.loosened.length + pulled.dropped.length === 0) return
      this.voices.push(pulled.result.voice)
      const now = this.drawn()
      for (const index of pulled.dropped) this.flying.push({ part: this.bridge[index], a: now[index].a, b: now[index].b, since: 0 })
      this.forget(pulled.dropped)
      this.commit(pulled.bridge)
      return
    }
    if (hand.what === 'lay') {
      const part: Part = { kind: hand.kind, a: hand.from, b: hand.to, turned: false }
      const result = layPart(this.bridge, part, this.at.kit)
      this.voices.push(result.result.voice)
      if (result.bridge.length > this.bridge.length) this.commit(result.bridge, this.bridge.length)
    }
    if (hand.what === 'part' && hand.carried) {
      const part = this.bridge[hand.index]
      const far = Math.hypot(hand.finger[0] - hand.from[0], hand.finger[1] - hand.from[1])
      if (far < CARRY_OFF && !bayAt(this.at, hand.finger[0], hand.finger[1])) { this.voices.push(putBack(part.kind, length(part))); return }
      const off = takeOffPart(this.bridge, hand.index)
      if (!off) return
      const now = this.carriedEnds(hand)
      this.flying.push({ part, a: now.a, b: now.b, since: 0 })
      this.voices.push(off.result.voice)
      this.forget([hand.index])
      this.commit(off.bridge)
    }
  }

  /** The press or the drag ended with nothing done: the browser took the finger, or the game was put away under it. Whatever was in the hand is where it came from: a half-drawn part is not laid, a carried part lies where it lay. */
  pressEnd(): void {
    this.hand = null
  }

  /** A part was plucked. The toy does nothing more with it; the game listens for a tune. */
  protected plucked(_index: number): void {}

  // --- Time --------------------------------------------------------------------

  step(dt: number): void {
    this.seconds += dt
    const hand = this.hand
    // What is built leans toward a part being laid, and stands straight again once it has landed.
    const laying = hand?.what === 'lay' && !samePoint(hand.from, hand.to)
    if (hand?.what === 'lay' && laying) { this.leanTo = hand.finger; this.leanFrom = hand.from }
    this.leaning += ((laying ? 1 : 0) - this.leaning) * Math.min(1, dt * 10)
    if (this.leaning < 0.001) this.leaning = 0
    this.ticked += dt
    // Links of a chain after what they hang from, so each is carried by where its link is now.
    const order = this.bridge.map((_, index) => index).sort((i, j) => this.depth(i) - this.depth(j))
    for (const index of order) {
      const part = this.bridge[index], moving = this.moving[index], before = moving.turn.at, rest = this.rest[index]
      let carried: readonly [number, number] = [0, 0]
      if (rest.via) {
        const link = this.rest[rest.via.part], now = ends(this.moving[rest.via.part], length(this.bridge[rest.via.part])), s = rest.via.share
        carried = [now.a[0] + (now.b[0] - now.a[0]) * s - (link.a[0] + (link.b[0] - link.a[0]) * s), now.a[1] + (now.b[1] - now.a[1]) * s - (link.a[1] + (link.b[1] - link.a[1]) * s)]
      }
      follow(moving, rest, length(part), dt, carried)
      // A link is pinned to the part it hangs from: its pin is exactly where that part's is now, with no lag.
      if (rest.via) {
        moving.x.at = rest.a[0] + (rest.b[0] - rest.a[0]) * rest.pivot + carried[0]; moving.x.speed = 0
        moving.y.at = rest.a[1] + (rest.b[1] - rest.a[1]) * rest.pivot + carried[1]; moving.y.speed = 0
      }
      this.rung[index] += dt; this.turned[index] += dt; this.laid[index] += dt
      if (this.shook[index] !== undefined) this.shook[index] += dt
      // A pin in the air is a hinge, and it ticks as a part on it turns: once for each notch the part passes.
      const notch = (turn: number) => Math.floor(turn / NOTCH.turn - 0.5)
      if (notch(moving.turn.at) !== notch(before) && this.ticked >= NOTCH.gap && this.hinged(index)) { this.voices.push(pinTick); this.ticked = 0; this.crept[index] = 0 }
      // And it ticks when a part on it shifts without turning far: once for each small distance its far end has gone,
      // and never as a rattle.
      // (What it crept leaks away again, so the last hair of a settling part never adds up to a tick.)
      const crept = this.crept[index] ?? 0
      this.crept[index] = (this.crept[index] ?? 0) * Math.max(0, 1 - 2 * dt) + Math.abs(moving.turn.at - before) * length(part) + (Math.abs(moving.x.speed) + Math.abs(moving.y.speed)) * dt
      if (this.crept[index] >= NOTCH.creep && this.ticked >= NOTCH.rest && this.hinged(index)) { this.voices.push(pinTick); this.ticked = 0; this.crept[index] = 0 }
      // A swinging part does not go through the ground: where it would, it is turned back the short way until it
      // lies clear, and it comes off the ground more slowly than it met it, with a knock.
      if (rest.how !== 'hangs') continue
      const long = length(part)
      const under = (turn: number): number => {
        const c = Math.cos(turn), s = Math.sin(turn)
        let deep = 0
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const along = (t - moving.pivot) * long
          deep = Math.max(deep, groundAt(this.at, moving.x.at + c * along) - (moving.y.at + s * along))
        }
        return deep
      }
      if (under(moving.turn.at) <= CLEAR) continue
      let clear = before
      for (let k = 1; k <= 80 && under(clear) > CLEAR; k++) {
        const step = 0.04 * Math.ceil(k / 2) * (k % 2 ? 1 : -1)
        if (under(moving.turn.at + step) <= CLEAR) clear = moving.turn.at + step
      }
      if (Math.abs(moving.turn.speed) > 1.2) this.voices.push(knock(part.kind, long, Math.abs(moving.turn.speed)))
      moving.turn.at = clear
      moving.turn.speed *= -0.35
      // Held off the ground it has not shifted: a part that lies against a bank or a rock is still.
      this.crept[index] = Math.min(this.crept[index], crept * Math.max(0, 1 - 2 * dt) + Math.abs(clear - before) * long)
    }
    for (const [point, since] of this.clicked) { if (since > 1) this.clicked.delete(point); else this.clicked.set(point, since + dt) }
    for (const [point, since] of this.rattled) { if (since > RING) this.rattled.delete(point); else this.rattled.set(point, since + dt) }
    for (const mark of this.marks) mark.since += dt
    if (this.marks.some((mark) => mark.since >= mark.life)) this.marks = this.marks.filter((mark) => mark.since < mark.life)
    for (const flight of this.flying) flight.since += dt
    this.flying = this.flying.filter((flight) => flight.since < FLIGHT)
    this.chief.step(dt)
  }

  /** True for a part that turns on a hinge: one that hangs by one pin, or has a pinned end on a pin in the air. A thread turns on nothing. */
  private hinged(index: number): boolean {
    const part = this.bridge[index], footing = isFooting(this.at)
    if (part.kind === 'thread') return false
    return this.rest[index].how === 'hangs' || (['a', 'b'] as const).some((end) => part.loose !== end && !footing(part[end]))
  }

  /** How far the pin at a grid point is drawn from its place while a part is being laid: toward the finger, a little. A footing does not lean, nor the pin the part grows from. */
  lean(point: Point): readonly [number, number] {
    if (this.leaning <= 0 || isFooting(this.at)(point) || (this.leanFrom && samePoint(point, this.leanFrom))) return STRAIGHT
    const dx = this.leanTo[0] - point[0], dy = this.leanTo[1] - point[1], far = Math.hypot(dx, dy)
    if (far < 0.3 || far >= LEAN.reach) return STRAIGHT
    const by = (LEAN.far * this.leaning * (1 - far / LEAN.reach)) / far
    return [dx * by, dy * by]
  }

  /** Where a carried part is drawn: as it lay, moved by as far as the finger has gone. */
  carriedEnds(hand: Extract<Hand, { what: 'part' }>): { a: [number, number]; b: [number, number] } {
    const now = ends(this.moving[hand.index], length(this.bridge[hand.index]))
    const dx = hand.finger[0] - hand.from[0], dy = hand.finger[1] - hand.from[1]
    return { a: [now.a[0] + dx, now.a[1] + dy], b: [now.b[0] + dx, now.b[1] + dy] }
  }

  // --- The model ---------------------------------------------------------------

  /** How many links of a chain lie between a part and something solid. */
  private depth(index: number): number {
    let depth = 0
    for (let via = this.rest[index].via; via && depth < this.bridge.length; via = this.rest[via.part].via) depth++
    return depth
  }

  protected pluckOf(index: number): VoiceSpec {
    return plucked(this.bridge[index], this.answer.parts[index]).voice
  }

  protected model(): void {
    const { frame, answer, rest } = this.modelOf(this.bridge)
    this.frame = frame; this.answer = answer; this.rest = rest
  }

  /** The frame model on a bridge on this sheet, at rest under its own weight, and where each of its parts comes to rest. */
  protected modelOf(bridge: readonly Part[]): { frame: Frame; answer: Answer; rest: Rest[] } {
    const footing = isFooting(this.at), frame = settle(bridge, footing), answer = solve(frame)
    return { frame, answer, rest: rests(bridge, frame, answer, footing, (x) => groundAt(this.at, x)) }
  }

  /** Drops what the toy keeps beside each part, for parts that have left the bridge. */
  protected forget(gone: readonly number[]): void {
    const keep = <T,>(list: T[]) => list.filter((_, index) => !gone.includes(index))
    this.moving = keep(this.moving); this.rung = keep(this.rung); this.turned = keep(this.turned); this.laid = keep(this.laid)
    this.shook = []; this.crept = []
  }

  /**
   * The bridge changed. It is saved, the model is solved again, and every part
   * heads for its new rest. `added` is the index of a part just laid: it lands
   * from a little above. Then the chief is told what the change did.
   */
  protected commit(bridge: readonly Part[], added = -1): void {
    const folded = this.frame.firm.filter((firm) => !firm).length
    this.save = edit(this.save, bridge)
    this.changed = true
    this.model()
    if (added >= 0) {
      // It lands where it was laid, from a little above, and only then goes where the model sends it: it may hold, sag or fold.
      const landing = atRest({ a: bridge[added].a, b: bridge[added].b, how: 'firm', pivot: 0, slack: false })
      landing.y.at += 0.22
      landing.y.speed = -1.5
      this.moving[added] = landing; this.rung[added] = Infinity; this.turned[added] = Infinity; this.laid[added] = 0
      // Dust where each of its ends comes down.
      this.mark('dust', bridge[added].a); this.mark('dust', bridge[added].b)
    }
    const nowFolded = this.frame.firm.filter((firm) => !firm).length
    if (nowFolded > folded) {
      this.chief.react('feathers-on-end')
      this.voices.push(fold(nowFolded - folded), chiefRuffle)
    } else if (added >= 0) {
      const triangle = closedTriangle(bridge, added, this.frame.firm)
      if (triangle) {
        this.chief.react('taps-and-listens')
        this.voices.push(chiefTaps(triangle.map((index) => layVoice(bridge[index].kind, length(bridge[index]))[0].pitch)))
      }
    }
  }
}

const STRAIGHT: readonly [number, number] = [0, 0]

/** How far under the drawn ground a swinging part may dip before it is turned back, in cells: a pixel or so. */
const CLEAR = 0.03

/** How long a part takes to get back to the tray, in seconds. */
export const FLIGHT = 0.45

/**
 * Where a part taken off is on its way to its pile, at a share `t` of the way:
 * its two ends, in cells. Each kind goes its own way. A plank slides out along
 * its own length and then goes down flat. A stick is flicked: it spins as it
 * flies in an arc. A tube rolls away down the sheet, level all the way. A
 * thread whips back: its far end runs in to its near end, and what is left
 * zips to the spool. Every one ends lying level in its pile.
 */
export function flightEnds(kind: Kind, a: readonly [number, number], b: readonly [number, number], home: readonly [number, number], t: number): { a: [number, number]; b: [number, number] } {
  const u = Math.max(0, Math.min(1, t)), e = u * u * (3 - 2 * u), long = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, half = long / 2
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], along: [number, number] = [(b[0] - a[0]) / long, (b[1] - a[1]) / long]
  const lie = (cx: number, cy: number, turn: number, reach = half): { a: [number, number]; b: [number, number] } => ({ a: [cx - Math.cos(turn) * reach, cy - Math.sin(turn) * reach], b: [cx + Math.cos(turn) * reach, cy + Math.sin(turn) * reach] })
  const was = Math.atan2(along[1], along[0]), level = Math.abs(was) > Math.PI / 2 ? Math.PI * Math.sign(was || 1) : 0
  if (kind === 'plank') {
    // Out along itself for the first two fifths, a cell and a half, then down to the pile, turning level.
    const out = Math.min(1, u / 0.4), rest = Math.max(0, (u - 0.4) / 0.6), r = rest * rest * (3 - 2 * rest)
    const sx = mid[0] + along[0] * 1.5 * out, sy = mid[1] + along[1] * 1.5 * out
    return lie(sx + (home[0] - sx) * r, sy + (home[1] - sy) * r, was + (level - was) * r)
  }
  if (kind === 'stick') {
    // Two whole turns in the air, over an arc.
    return lie(mid[0] + (home[0] - mid[0]) * e, mid[1] + (home[1] - mid[1]) * e + 1.2 * Math.sin(Math.PI * u), was + (level - was) * e + 4 * Math.PI * e)
  }
  if (kind === 'tube') {
    // Level at once, then straight down the sheet with a small bounce on the way, and along to its pile.
    const turn = was + (level - was) * Math.min(1, u * 4)
    return lie(mid[0] + (home[0] - mid[0]) * e * e, mid[1] + (home[1] - mid[1]) * e + 0.12 * Math.abs(Math.sin(u * Math.PI * 5)) * (1 - u), turn)
  }
  // Thread: the far end runs in first, then the short length left goes to the spool.
  const reel = Math.min(1, u / 0.5), go = Math.max(0, (u - 0.5) / 0.5), g = go * go * (3 - 2 * go), left = half * (1 - 0.85 * reel)
  const from: [number, number] = [a[0] + along[0] * left, a[1] + along[1] * left]
  return lie(from[0] + (home[0] - from[0]) * g, from[1] + (home[1] - from[1]) * g, was + (level - was) * g, left)
}

/**
 * The triangle a part just laid closes, if it closes one: three firm parts
 * that meet pin to pin at three different points not in one line. Returns the
 * three, the new one first.
 */
export function closedTriangle(bridge: readonly Part[], added: number, firm: readonly boolean[]): [number, number, number] | null {
  if (!firm[added]) return null
  const pins = bridge.map((part) => pinsOf(part))
  const shared = (i: number, j: number): Point[] => pins[i].filter((p) => pins[j].some((q) => samePoint(p, q)))
  for (let i = 0; i < bridge.length; i++) {
    if (i === added || !firm[i]) continue
    for (const x of shared(added, i)) {
      for (let j = i + 1; j < bridge.length; j++) {
        if (j === added || !firm[j]) continue
        for (const y of shared(i, j)) for (const z of shared(j, added)) {
          const area = (y[0] - x[0]) * (z[1] - x[1]) - (z[0] - x[0]) * (y[1] - x[1])
          if (area !== 0) return [added, i, j]
        }
      }
    }
  }
  return null
}
