import { settle, solve, type Answer, type Frame } from './frame'
import { layPart, plucked, pullPin, putPin, takeOffPart, turnPart } from './grid'
import { key, length, pinsOf, reach, samePoint, type Kind, type Part, type Point } from './kit'
import { bayAt, touched } from './layout'
import { ChiefDirector } from './motion'
import { atRest, ends, follow, rests, unrest, type Moving, type Rest } from './pose'
import { edit, type Save } from './save'
import { groundAt } from './sheet'
import { canPin, isFooting, site, type Site } from './sites'
import { chiefCroak, chiefRuffle, chiefTaps, fold, knock, lay as layVoice, pick, pinClick, pinRattle, putBack, snapTick, type VoiceSpec } from './voices'

// The toy: the bridge on the board, a finger, and what the two do to each
// other. Pure: no renderer, no DOM and no clock of its own. The Mount feeds it
// gestures in grid cells and steps of attended time; it answers with what to
// draw (its public fields), what to sound (`takeVoices`) and whether the saved
// state changed (`takeChange`).
//
// Every press is answered where it lands, in the same call: a pin clicks in,
// a part lifts, a pile stirs. What follows (a tap, a drag, a hold) builds on
// that answer and never waits for it.

/** What the finger is doing. */
export type Hand =
  /** On a grid point: a pin went in on touch-down. A hold pulls it out again, parts and all. */
  | { what: 'pin'; at: Point; held: number; done: boolean }
  /** Dragging a new part out from that pin: it grows to the grid point nearest the finger that it can reach. */
  | { what: 'lay'; kind: Kind; from: Point; to: Point; finger: readonly [number, number] }
  /** On a part's body: a tap plucks or turns it, a drag carries it off. `finger` is where it is carried to. */
  | { what: 'part'; index: number; carried: boolean; from: readonly [number, number]; finger: readonly [number, number] }
  | { what: 'bay'; kind: Kind }
  | { what: 'chief' }
  /** The game's own (game.ts): a vehicle at either bank, the next sheet's roll, a sheet on the rack. */
  | { what: 'vehicle'; id: string; across: boolean }
  | { what: 'roll' }
  | { what: 'rack'; index: number }

/** How long a plucked part goes on ringing, in seconds: a second tap inside it turns the part. */
export const RING = 0.8
/** How long a finger rests on a pin before the pin comes out. */
export const HOLD = 0.55
/** A carried part let go further than this from where it lay goes back to the tray; nearer, it goes back where it was. */
export const CARRY_OFF = 1
/** Where the crew chief stands, in cells: on a ruled ledge in the top left margin of the sheet, clear of both banks. And how near a touch must be to poke it. */
export const CHIEF = { x: 0.7, y: 10.9, reach: 1.5 } as const

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
  turned: number[] = []
  laid: number[] = []
  /** Seconds since a pin last clicked in at each grid point, by its key. */
  clicked = new Map<string, number>()
  flying: Flying[] = []
  readonly chief: ChiefDirector
  seconds = 0
  protected voices: VoiceSpec[] = []
  protected changed = false

  constructor(save: Save, random: () => number) {
    this.save = save
    const sheet = save.sheets[save.on]
    this.at = site(sheet.site, sheet.variant)
    this.selected = (['plank', 'stick', 'tube', 'thread'] as const).find((kind) => this.at.kit[kind] > 0) ?? 'plank'
    this.chief = new ChiefDirector(random)
    this.model()
    // Found as left: every part is where it rests, and nothing eases in.
    this.moving = this.rest.map(atRest)
    this.rung = this.bridge.map(() => Infinity)
    this.turned = this.bridge.map(() => Infinity)
    this.laid = this.bridge.map(() => Infinity)
  }

  get bridge(): readonly Part[] {
    return this.save.sheets[this.save.on].bridge
  }

  /** The two ends of every part as drawn now. */
  drawn(): { a: [number, number]; b: [number, number] }[] {
    return this.bridge.map((part, index) => ends(this.moving[index], length(part)))
  }

  /** How many parts of a kind are still in the tray. */
  left(kind: Kind): number {
    return this.at.kit[kind] - this.bridge.filter((part) => part.kind === kind).length
  }

  /** True while anything is still on its way to rest: the scene is alive and must be drawn. */
  get busy(): boolean {
    return this.hand !== null || this.flying.length > 0 || this.bridge.some((part, index) => unrest(this.moving[index], this.rest[index], length(part)) > 0.002 || this.rung[index] < RING + 0.4 || this.turned[index] < 0.6 || this.laid[index] < 0.6)
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
      return
    }
    if (Math.hypot(x - CHIEF.x - 0.4, y - (CHIEF.y + 1.2)) <= CHIEF.reach) {
      this.hand = { what: 'chief' }
      this.chief.poke()
      this.voices.push(chiefCroak)
      return
    }
    const target = touched(this.at, this.bridge, this.drawn(), x, y)
    if (!target) { this.hand = null; return }
    if ('pin' in target) {
      this.hand = { what: 'pin', at: target.pin, held: 0, done: false }
      this.clicked.set(key(target.pin), 0)
      this.voices.push(pinClick)
      // Every part already on that pin shivers.
      this.bridge.forEach((part, index) => { if (pinsOf(part).some((p) => samePoint(p, target.pin))) this.moving[index].turn.speed += index % 2 ? 0.9 : -0.9 })
      return
    }
    this.hand = { what: 'part', index: target.part, carried: false, from: [x, y], finger: [x, y] }
    // The part lifts under the finger: it jumps a hair toward it, and the springs bring it back.
    this.moving[target.part].y.speed += 1.2
  }

  tap(): void {
    const hand = this.hand
    this.hand = null
    if (!hand) return
    if (hand.what === 'pin' && !hand.done) {
      const back = putPin(this.bridge, hand.at)
      if (back.pinned.length) { this.voices.push(back.result.voice); this.commit(back.bridge); return }
      const on = this.bridge.flatMap((part, index) => (pinsOf(part).some((p) => samePoint(p, hand.at)) ? [index] : []))
      if (on.length === 0) return
      // Every part on the pin rattles at once, each in its own voice.
      this.voices.push(pinRattle(on.map((index) => this.pluckOf(index)[0].pitch)))
      for (const index of on) this.rung[index] = RING * 0.5
    }
    if (hand.what === 'part') {
      const index = hand.index
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
      }
    }
  }

  dragStart(): void {
    const hand = this.hand
    if (!hand) return
    if (hand.what === 'pin') this.hand = hand.done ? null : { what: 'lay', kind: this.selected, from: hand.at, to: hand.at, finger: hand.at }
    if (hand.what === 'part') hand.carried = true
  }

  dragMove(x: number, y: number): void {
    const hand = this.hand
    if (!hand) return
    if (hand.what === 'lay') {
      hand.finger = [x, y]
      const to = reach(hand.kind, hand.from, [x, y])
      if (canPin(this.at, to) && !samePoint(to, hand.to)) {
        hand.to = to
        this.voices.push(snapTick(hand.kind, length({ a: hand.from, b: to })))
      }
    }
    if (hand.what === 'part') hand.finger = [x, y]
  }

  /** The drag is over: the part is laid, or the carried part goes to the tray or back where it lay. Also where a parked game puts down what is in the hand. */
  dragEnd(): void {
    const hand = this.hand
    this.hand = null
    if (!hand) return
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

  /** The press ended and was not a tap: the browser took the finger, or the game was parked under it. */
  pressEnd(): void {
    this.hand = null
  }

  // --- Time --------------------------------------------------------------------

  step(dt: number): void {
    this.seconds += dt
    const hand = this.hand
    if (hand?.what === 'pin' && !hand.done) {
      hand.held += dt
      if (hand.held >= HOLD) {
        hand.done = true
        const pulled = pullPin(this.bridge, hand.at)
        if (pulled.loosened.length + pulled.dropped.length > 0) {
          this.voices.push(pulled.result.voice)
          const now = this.drawn()
          for (const index of pulled.dropped) this.flying.push({ part: this.bridge[index], a: now[index].a, b: now[index].b, since: 0 })
          this.forget(pulled.dropped)
          this.commit(pulled.bridge)
        }
      }
    }
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
      this.rung[index] += dt; this.turned[index] += dt; this.laid[index] += dt
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
    }
    for (const [point, since] of this.clicked) { if (since > 1) this.clicked.delete(point); else this.clicked.set(point, since + dt) }
    for (const flight of this.flying) flight.since += dt
    this.flying = this.flying.filter((flight) => flight.since < FLIGHT)
    this.chief.step(dt)
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

/** How far under the drawn ground a swinging part may dip before it is turned back, in cells: a pixel or so. */
const CLEAR = 0.03

/** How long a part takes to fly back to the tray, in seconds. */
export const FLIGHT = 0.45

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
