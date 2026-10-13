import { hit, type Target } from './hit'
import { COUNTS_FROM, progressToward } from './input'
import { basketMiddle, basketRests } from './basket'
import { FIELD, SILL_TOP, freeSpot, onMat, toField, type Spot } from './layout'
import { FLIP, REAR, ROCK_KNOCKS, SILK_PATS } from './motion'
import { answer, beside, intoBasket, putOn, tapBasket, tumble } from './pairs'
import { ARCH_RING, OFFER_ORDER, PIECES, isCharacter, type PieceDef, type PieceId } from './pieces'
import { settlePose, stepPose } from './pose'
import type { Beat } from './scene'
import { Scene } from './scene'
import type { Sound } from './sounds'
import { bulkOf, byId, lowestFoot, mend, rests, rootOf, stand, withRiders } from './stack'
import { homePlaces, makePieces, type Flight, type Piece, type Places } from './thing'

export { firstPlaces, homePlaces, type Piece, type Places, type Rest } from './thing'
export { MIN_TARGET, type Target } from './hit'

// The world: eight things, a mat, a basket and a hand. A tap on a thing takes it in hand, a tap on the mat
// sets it down there, a tap on another thing on the mat puts it on that thing (pairs.ts), a tap on the basket
// drops it in, a tap anywhere else sends it back to its place, and a tap on the thing in hand turns it over. A
// drag is the same in one stroke.
//
// One clock. `step` is the only thing that moves time, and everything that moves or sounds does so at a moment
// of that time: a flight, a landing and its knock, the second pair of hooves, each knock of a rocking arch, each
// beat of a scene, the wait after a lifted finger. Sounds are asked for here, at the moment the picture shows
// them, and the Mount plays what `takeSounds` hands it straight after each gesture and each step. No timer, no
// wall clock and no audio clock is read anywhere in the game's rules or its view.

export type Hand = { id: PieceId; from: { at: 'home' | 'mat'; x: number; y: number; on: PieceId | null }; mode: 'held' | 'drag' | 'waiting'; wait: number; tx: number; ty: number }
type Later = { at: number; id: PieceId; gen: number; sound: Sound; squash: number }

/** How high a thing is held after a tap, and while it is carried. */
export const HELD = 30, CARRIED = 46
/** Seconds a carried thing waits in the air for a lifted finger to come back, and how near it must land. */
export const LIFT_GRACE = 0.3, REGRAB = 140
/** The longest a touch off the mat may stay down and still be a tap that sends the thing in hand home, in seconds: longer than the slowest tap of the youngest, shorter than a hand that has come to rest. */
export const OFF_TAP = 0.6
/** The share of its carried height a thing has sunk to when the grace ends: it sinks all the while it waits. */
export const WAITING = 0.2
/** How near a landing a character must stand to hop from the knock. */
export const HOP_NEAR = 190
/** Seconds after its hooves are down that the horse shakes its mane and blows. */
export const SNORT = 0.34
/** Seconds a thing takes to rise out of the basket before it flies to its place. */
export const RISE = 0.16
const STEP = 1 / 120

export class World {
  time = 0
  readonly pieces: Piece[]
  basket: 'upright' | 'tipped'
  hand: Hand | null = null
  /** Rings in the mat's paper, a finger on the pane, and the last time the basket and the cat were touched. */
  ripples: { x: number; y: number; at: number }[] = []
  tinks: { x: number; y: number; at: number }[] = []
  /** How far over the basket is drawn, 0 upright to 1 on its side: its state, but for the moments a scene tips it or sets it up. */
  tip = 0
  basketAt = -Infinity
  catAt = -Infinity
  /** When the sill was last tapped. */
  sillAt = -Infinity
  knockAt = -Infinity
  /** The last time anything landed on the mat. */
  landedAt = -Infinity
  /** Where everyone looks for a moment after something lands, and whether they stretch up to see it. */
  look: { x: number; y: number; until: number; peek: boolean; by?: PieceId } = { x: 0, y: 0, until: -Infinity, peek: false }
  finger: { x: number; y: number; at: number } = { x: FIELD.x, y: FIELD.y, at: -Infinity }
  /** Goes up by one each time something comes to rest somewhere new or is turned over: a save is due. */
  changes = 0
  /** The scene that is playing, or null. */
  scene: Scene | null = null
  /** Goes up by one each time a touch or a put-away ends a scene: its sounds are shut off from that frame. */
  hushes = 0
  private sounds: Sound[] = []
  private later: Later[] = []
  private pressedOn: { id: PieceId; own: boolean } | null = null
  /** A touch that landed off the mat while a thing was in hand, and when: if it lifts as a tap the thing goes home. */
  private offMat: { x: number; y: number; at: number } | null = null

  constructor(places: Places = homePlaces(), basket: 'upright' | 'tipped' = 'upright') {
    this.pieces = makePieces(places)
    this.basket = basket
    this.tip = basket === 'tipped' ? 1 : 0
    mend(this.pieces)
    this.seatBasket(true)
    for (const p of this.pieces) settlePose(this.pieces, p)
  }

  piece(id: PieceId): Piece {
    return byId(this.pieces, id)
  }

  /** What the world asked to be heard since the last call, in order. */
  takeSounds(): Sound[] {
    const sounds = this.sounds
    this.sounds = []
    return sounds
  }

  /** Every thing where it rests: a thing in hand where it came from, a thing in the air or in a scene where it is going. */
  places(): Places {
    // A thing in the basket, or still on its way into it, is saved at its place inside.
    const inside = basketRests(this.pieces, this.basket === 'tipped')
    return Object.fromEntries(this.pieces.map((p) => {
      const from = this.hand?.id === p.def.id ? this.hand.from : p, at = (from.at === 'basket' ? inside.get(p) : null) ?? from
      return [p.def.id, { at: from.at, x: at.x, y: at.y, on: from.at === 'mat' ? from.on : null, turned: p.turned }]
    })) as Places
  }

  get held(): Piece | null {
    return this.hand ? this.piece(this.hand.id) : null
  }

  /** What a touch at a point of the stage lands on (hit.ts). */
  hit(x: number, y: number): Target {
    return hit(this.pieces, this.held, this.basket === 'tipped', x, y)
  }

  // --- The finger -------------------------------------------------------------

  /** A finger lands. A scene that is playing ends first; then whatever the finger lands on answers now, before the finger lifts. */
  press(x: number, y: number): void {
    this.endScene()
    this.finger = { x, y, at: this.time }
    this.pressedOn = null
    this.offMat = null
    const hand = this.hand
    if (hand && hand.mode === 'waiting') {
      // The finger that lifted mid-carry has come back: the same carry goes on.
      const p = this.piece(hand.id)
      if (Math.hypot(x - p.px, y - (p.py - p.lift - p.def.height / 2)) <= REGRAB) {
        hand.mode = 'drag'
        this.pressedOn = { id: hand.id, own: false }
        this.dragMove(x, y)
        return
      }
      this.drop()
    }
    const target = this.hit(x, y)
    if (target.kind === 'piece') {
      const p = target.piece
      if (this.hand?.id === p.def.id) {
        // A finger on the thing already in hand: it gives under the finger. A tap will turn it over, a drag carry it.
        p.squashV += 3
        this.say({ name: 'touch', piece: p.def.id, gain: 0.7 })
        this.pressedOn = { id: p.def.id, own: true }
        return
      }
      // A thing on the mat tapped with another in hand: a pair.
      if (this.hand && p.at === 'mat') return putOn(this, this.release(), p)
      // A thing by the mat tapped with another in hand: that is off the mat, so the one in hand goes back to its place.
      if (this.hand) this.goHome(this.release(), { x, y })
      this.pick(p)
      this.pressedOn = { id: p.def.id, own: false }
      return
    }
    if (target.kind === 'mat') return this.hand ? this.land(this.release(), x, y) : this.thump(x, y)
    if (target.kind === 'basket') {
      this.basketAt = this.time
      return this.hand ? intoBasket(this, this.release()) : tapBasket(this, x, y)
    }
    // Anywhere else is off the mat. The cat, the sill or the pane answers now, in its own way. A thing in hand goes back to its place only if this
    // touch turns out to be a tap (`tap`): the heel of a hand that comes down and stays sends nothing anywhere.
    if (this.hand) this.offMat = { x, y, at: this.time }
    if (target.kind === 'cat') {
      this.catAt = this.time
      this.say({ name: 'mew', gain: 0.8 })
    } else if (y >= SILL_TOP) {
      // The wood gives a soft knock: a ring opens on it, and the cat on the sill flicks its tail.
      this.sillAt = this.time
      this.tinks = [...this.tinks.slice(-2), { x, y, at: this.time }]
      this.say({ name: 'soft', gain: 0.8 })
    } else {
      this.tinks = [...this.tinks.slice(-2), { x, y, at: this.time }]
      this.say({ name: 'tink', gain: 0.7 })
    }
  }

  /** The press was a tap. A tap on the thing in hand turns it over and sets it down. */
  tap(): void {
    const hand = this.hand, off = this.offMat
    this.offMat = null
    // A tap off the mat with a thing in hand: the thing goes back to its place by the mat, and a stack is set down on the mat's nearest edge. A touch that stayed down longer than a tap is a hand at rest.
    if (off && hand?.mode === 'held' && this.time - off.at <= OFF_TAP) return this.goHome(this.release(), off)
    // A finger that came back to a carry and lifted again without moving has let go again.
    if (hand?.mode === 'drag') return this.dragEnd()
    if (!hand || !this.pressedOn?.own || this.pressedOn.id !== hand.id || hand.mode !== 'held') return
    const p = this.piece(hand.id), lower = hand.from.on ? this.piece(hand.from.on) : null
    this.turn(p)
    // An arch on its back never shares a foot with a standing arch. Turned over at the nest by the mat, where the arches lie on their feet, it comes down on the mat's nearest edge; turned over where it nested in a standing arch, it comes down beside it.
    if (p.def.kind === 'arch' && p.turned && hand.from.at === 'home') {
      this.release()
      const spot = freeSpot(p.def, p.def.home.x, p.def.home.y, this.roots(p.def.id), true)
      p.at = 'mat'
      this.moveRest(p, spot.x, spot.y)
      // It is down as its first rock knocks.
      this.fly(p, 'rock', FLIP)
    }
    else if (lower && lower.at === 'mat' && !rests(p, lower)) beside(this, this.release(), lower)
    else this.setDown()
    // An arch that is set back on its feet tips out whoever was in its cradle, and any arch that lay in it on its back.
    if (p.def.kind === 'arch' && !p.turned) for (const rider of withRiders(this.pieces, p).filter((each) => each.on === p.def.id && (isCharacter(each.def.kind) || !rests(each, p)))) tumble(this, rider)
  }

  /** The press became a drag. If it began on a thing, that thing is carried. */
  dragStart(): void {
    if (this.hand && this.pressedOn?.id === this.hand.id) this.hand.mode = 'drag'
  }

  dragMove(x: number, y: number): void {
    this.finger = { x, y, at: this.time }
    const hand = this.hand
    if (!hand || hand.mode !== 'drag') return
    // The finger holds the thing by its middle.
    hand.tx = x
    hand.ty = y + PIECES[hand.id].height * 0.45
  }

  /** The finger let go mid-carry. The thing waits in the air a moment for it to come back, then drops. */
  dragEnd(): void {
    if (this.hand?.mode !== 'drag') return
    this.hand.mode = 'waiting'
    this.hand.wait = LIFT_GRACE
    // Let go, it does not hang: it quivers and begins to sink at once.
    this.piece(this.hand.id).squashV += 4
  }

  /** The carry was taken away with the finger still down: the child made no drop, and the thing goes back where it came from. */
  dragCancel(): void {
    const hand = this.hand
    if (!hand || hand.mode === 'held') return
    this.setDown()
  }

  /** The press ended and was neither a tap nor a drag: nothing more follows from it. */
  pressEnd(): void {
    this.pressedOn = null
    this.offMat = null
    // A carry that was taken up again is let go again: no state of the hand is left without an end.
    if (this.hand?.mode === 'drag') this.dragEnd()
  }

  /**
   * The game goes to rest, and is then as a load of its save would make it. A thing that was let go drops, a
   * thing held is set down where it was, a scene ends, and everything that was still moving, waiting or about to
   * sound is at its end: nothing is left in the air and nothing is left to come.
   */
  settle(): void {
    const hand = this.hand
    if (hand) {
      const p = this.piece(hand.id)
      // A thing that was let go drops as the child dropped it. A thing still carried over the mat stays where the child brought it. Anything else goes back where it was.
      if (hand.mode === 'waiting') this.drop()
      // Carried over another thing and not let go, it is not put on it: it stands clear of it, beside it.
      else if (hand.mode === 'drag' && onMat(p.px, p.py)) { const over = this.dropTarget(p).kind === 'piece'; this.release(); this.land(p, p.px, p.py, undefined, over) }
      else this.setDown()
    }
    this.endScene()
    this.pressedOn = null
    this.offMat = null
    this.later = []
    this.sounds = []
    this.ripples = []
    this.tinks = []
    this.basketAt = this.catAt = this.sillAt = this.knockAt = this.landedAt = -Infinity
    this.look = { x: 0, y: 0, until: -Infinity, peek: false }
    this.finger = { x: FIELD.x, y: FIELD.y, at: -Infinity }
    this.tip = this.basket === 'tipped' ? 1 : 0
    // A thing still on its way into the basket is in it: its flight ends first, and it is then given its place inside.
    for (const p of this.pieces) p.flight = null
    this.seatBasket(true)
    for (const p of this.pieces) {
      p.px = p.x; p.py = p.y; p.lift = p.liftV = p.squash = p.squashV = p.hop = p.hopV = 0
      p.turnAt = p.landAt = -Infinity; p.gen = 0; p.far = p.at === 'basket' ? 1 : 0
      settlePose(this.pieces, p)
    }
  }

  // --- What the idle hand may show --------------------------------------------

  /**
   * The things a child could do now, each a different one, for the idle hand to show one after the other and
   * never the same one twice in a row of showings: with a thing in hand, a free place on the mat, then a thing
   * to put it on; otherwise the things by the mat, then a thing on the mat. The basket is offered last, and
   * only while the mat is bare: one copied tap must never march a child's build away.
   */
  offers(): Spot[] {
    const middle = (p: Piece): Spot => this.aim(p)
    // With nothing by the mat there is still something to show: a thing on the mat, and another to put it on.
    if (!this.hand && !this.pieces.some((p) => p.at === 'home')) return [...this.offered().map(middle), ...(this.pieces.some((p) => p.at === 'mat') ? [] : [basketMiddle(this.basket === 'tipped')])]
    const bare = !this.pieces.some((p) => p.at === 'mat'), basket = bare ? [basketMiddle(this.basket === 'tipped')] : []
    const onMat = this.pieces.filter((p) => p.at === 'mat' && p.on === null && p !== this.held)
    if (this.hand) {
      const spot = freeSpot(PIECES[this.hand.id], FIELD.x, FIELD.y, this.roots(this.hand.id))
      return [spot, ...onMat.slice(0, 1).map(middle), ...basket]
    }
    const home = OFFER_ORDER.map((id) => this.piece(id)).filter((p) => p.at === 'home')
    return [...home.slice(0, 2).map(middle), ...onMat.slice(0, 1).map(middle), ...basket].slice(0, 4)
  }

  /** Where the idle hand points at a thing: its middle, and for an arch that stands on the mat the top of its band, since its middle is its hollow and shows whatever stands behind it. */
  private aim(p: Piece): Spot {
    const at = stand(this.pieces, p)
    const band = p.def.kind === 'arch' && p.at === 'mat' && !p.turned ? ARCH_RING[p.def.id as keyof typeof ARCH_RING] : null
    return { x: at.x, y: at.y - (band ? (band.outer + band.inner) / 2 : p.def.height * 0.5) }
  }

  /**
   * The things on the mat that the idle hand shows when nothing lies by the mat: two that stand on the bare mat,
   * one to take and one to put it on. On a crowded mat they are things the hand can point at without pointing
   * at another: a tap where the hand shows takes that thing and no other.
   */
  offered(): Piece[] {
    const roots = this.pieces.filter((p) => p.at === 'mat' && p.on === null && p !== this.held)
    const clear = roots.filter((p) => { const at = this.aim(p), target = this.hit(at.x, at.y); return target.kind === 'piece' && target.piece === p })
    return (clear.length ? clear : roots).slice(0, 2)
  }

  // --- Time -------------------------------------------------------------------

  /** Plays `seconds` of the world, in small equal steps so the springs behave the same at any frame rate. */
  step(seconds: number): void {
    for (let left = seconds; left > 1e-9; left -= STEP) this.tick(Math.min(left, STEP))
  }

  private tick(h: number): void {
    this.time += h
    if (this.later.length) {
      const due = this.later.filter((each) => each.at <= this.time)
      if (due.length) this.later = this.later.filter((each) => each.at > this.time)
      for (const each of due) {
        const p = this.piece(each.id)
        if (p.gen !== each.gen) continue
        this.sounds.push(each.sound)
        p.squashV += each.squash
      }
    }
    const hand = this.hand
    if (hand && hand.mode === 'waiting' && (hand.wait -= h) <= 0) this.drop()
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.scene = null
    }
    for (const p of this.pieces) {
      const held = this.hand?.id === p.def.id ? this.hand : null
      if (p.flight) this.fly1(p, p.flight, h)
      else if (!p.led) {
        p.far = p.at === 'basket' ? 1 : 0
        // While it waits for a lifted finger it sinks. A stack in hand is held low enough to stay clear of the home control.
        const want = held ? (held.mode === 'held' ? HELD : held.mode === 'drag' ? CARRIED : CARRIED * (WAITING + (1 - WAITING) * Math.max(0, held.wait / LIFT_GRACE))) : 0
        const tx = held ? held.tx : p.x, ty = held ? Math.max(held.ty, lowestFoot(this.pieces, p) + want) : p.y
        const pull = 1 - Math.exp(-h * (held && held.mode !== 'held' ? 30 : 18))
        p.px += (tx - p.px) * pull
        p.py += (ty - p.py) * pull
        p.liftV += ((want - p.lift) * 420 - p.liftV * 26) * h
        p.lift = Math.max(0, p.lift + p.liftV * h)
        if (p.lift === 0 && p.liftV < 0) p.liftV = 0
      }
      p.squashV += (-p.squash * 620 - p.squashV * 17) * h
      p.squash += p.squashV * h
      if (p.hop > 0 || p.hopV > 0) {
        p.hopV -= 1500 * h
        p.hop += p.hopV * h
        if (p.hop <= 0) { p.hop = 0; p.hopV = 0; p.squashV += 1.2 }
      }
      // However the lift springs, the top of a thing in hand stays under the line that is kept free.
      if (held && !p.flight) p.py = Math.max(p.py, lowestFoot(this.pieces, p) + p.lift + p.hop)
      stepPose(this.pieces, p, this.time, h)
    }
    if (this.ripples.length && this.time - this.ripples[0].at > 1.2) this.ripples.shift()
    if (this.tinks.length && this.time - this.tinks[0].at > 0.8) this.tinks.shift()
  }

  private fly1(p: Piece, flight: Flight, h: number): void {
    flight.t += h
    if (flight.rise) {
      // Out of the basket: it rises from inside it first, and flies once the whole of it is out.
      const u = Math.min(1, flight.t / RISE), e = u * u * (3 - 2 * u)
      p.px = flight.sx + (flight.rise.x - flight.sx) * e
      p.py = flight.sy + (flight.rise.y - flight.sy) * e
      p.far = 1
      if (u >= 1) { flight.sx = p.px; flight.sy = p.py; flight.sl = 0; flight.t = 0; flight.rise = null; flight.far = 0.99; p.far = 0.99 }
      return
    }
    const u = Math.min(1, flight.t / flight.dur)
    // It leaves slowly and comes down fast, like a mallet.
    const e = flight.land !== 'tok' && flight.land !== 'quiet' && p.def.kind !== 'silk' ? u * u * (0.4 + 0.6 * u) : u * u * (3 - 2 * u)
    p.px = flight.sx + (p.x - flight.sx) * e
    p.py = flight.sy + (p.y - flight.sy) * e
    p.lift = flight.sl * (1 - e) + flight.arc * 4 * u * (1 - u)
    // On its way into the basket it is seen whole, in front of it, all the way: it is inside once it has landed.
    p.far = p.at === 'basket' ? Math.min(0.99, e) : flight.far * (1 - e)
    if (u < 1) return
    p.flight = null
    p.px = p.x; p.py = p.y; p.lift = 0; p.liftV = 0
    this.landed(p, flight)
  }

  // --- What the pairs and the scenes use ----------------------------------------

  say(sound: Sound): void {
    this.sounds.push(sound)
  }

  /** Asks for a sound `seconds` from now, as that thing's own: it is dropped if the thing is taken in hand first. */
  after(seconds: number, p: Piece, sound: Sound, squash = 0): void {
    this.later.push({ at: this.time + seconds, id: p.def.id, gen: p.gen, sound, squash })
  }

  /** The things that stand on the bare mat, but for one thing and whatever rides on it. */
  roots(except: PieceId): { def: PieceDef; x: number; y: number }[] {
    return this.pieces.filter((p) => p.at === 'mat' && p.on === null && p.def.id !== except).map((p) => ({ def: bulkOf(this.pieces, p), x: p.x, y: p.y }))
  }

  /** A thing with whatever rides on it, as one body (stack.ts). */
  bulk(p: Piece): PieceDef {
    return bulkOf(this.pieces, p)
  }

  /** Starts a scene. Its outcome is already in the things' resting places, so a save is due at once. */
  play(beats: Beat[], changes = true): void {
    if (changes) this.changes += 1
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => {})
  }

  /** A touch or a put-away ends the scene: every beat lands where it was going, unheard, and what the scene had sounding is shut off. */
  endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
    this.sounds = this.sounds.filter((sound) => !sound.scene)
    this.hushes += 1
  }

  /** Puts a thing's resting foot somewhere else, with everything that rides on it. Where it is drawn does not jump. */
  moveRest(p: Piece, x: number, y: number): void {
    const dx = x - p.x, dy = y - p.y
    p.x = x; p.y = y
    for (const rider of withRiders(this.pieces, p).slice(1)) { rider.x += dx; rider.y += dy; rider.px += dx; rider.py += dy }
  }

  /** Takes a thing off what it rests on. Where it is drawn does not jump. */
  detach(p: Piece): void {
    const at = stand(this.pieces, p)
    p.on = null
    p.px = at.x; p.py = at.y + p.lift + p.hop
  }

  /** Rests a thing on another, at the foot of the thing at the bottom. Where it is drawn does not jump: it has its seat still to reach. */
  attach(p: Piece, lower: Piece): void {
    const was = stand(this.pieces, p), root = rootOf(this.pieces, lower)
    p.at = 'mat'
    this.moveRest(p, root.x, root.y)
    p.on = lower.def.id
    p.px = p.x; p.py = p.y; p.lift = 0; p.liftV = 0; p.hop = 0; p.hopV = 0
    const seat = stand(this.pieces, p)
    p.px += was.x - seat.x; p.py += was.y - seat.y
  }

  /** Gives each thing in the basket its place in it: looking out, or out of sight. A thing whose place changes moves there by itself. */
  seatBasket(atOnce = false): void {
    for (const [p, rest] of basketRests(this.pieces, this.basket === 'tipped')) {
      // A thing still on its way in keeps going to where it comes in.
      if (p.flight) continue
      p.x = rest.x; p.y = rest.y; p.on = null
      if (atOnce) { p.px = rest.x; p.py = rest.y; p.far = 1 }
    }
  }

  // --- What the finger sets off -------------------------------------------------

  private pick(p: Piece): void {
    const asleep = p.shut > 0.5
    this.hand = { id: p.def.id, from: { at: p.at === 'basket' ? 'home' : p.at, x: p.x, y: p.y, on: p.on }, mode: 'held', wait: 0, tx: 0, ty: 0 }
    this.detach(p)
    this.hand.tx = p.px; this.hand.ty = p.py
    // Whatever it was still going to do (a second hoof, the rest of a rocking) is over.
    p.gen += 1
    p.stir = null
    if (p.flight) { p.flight = null; p.liftV = 0 }
    p.squashV -= 2.6
    this.say({ name: 'pick', piece: p.def.id, gain: 0.9 })
    // The round doll does not like being lifted while asleep: one grumpy brow and a snort.
    if (p.def.id === 'doll-round' && asleep) { p.mood = -1; this.say({ name: 'grumble', piece: p.def.id, gain: 0.8 }) }
  }

  /** The hand opens: the thing that was in it, off whatever it rested on. */
  release(): Piece {
    const p = this.piece(this.hand!.id)
    this.hand = null
    return p
  }

  /** The thing in hand goes back down where it was, and onto what it was on. */
  private setDown(): void {
    const from = this.hand!.from, p = this.release(), lower = from.on ? this.piece(from.on) : null
    if (lower && lower.at === 'mat') this.attach(p, lower)
  }

  /** A carried thing is let go where it is: onto the thing under it, onto the mat if it is over it or was brought most of the way, into the basket over the basket, and otherwise back to its place. */
  private drop(): void {
    const hand = this.hand!, p = this.piece(hand.id)
    // It drops where the finger let it go, not where its sinking has brought it by now: put away while it waits, it is found where it would have dropped.
    p.px = hand.tx; p.py = hand.ty
    const to = toField(p.px, p.py)
    const most = hand.from.at === 'home' && progressToward(p.def.home, { x: p.px, y: p.py }, to) >= COUNTS_FROM
    const under = this.dropTarget(p)
    this.release()
    if (under.kind === 'piece') putOn(this, p, under.piece)
    else if (under.kind === 'basket') intoBasket(this, p)
    else if (onMat(p.px, p.py) || most) this.land(p, to.x, to.y, 0.12)
    else this.goHome(p)
  }

  /** What a carried thing is over when it is let go: the thing on the mat under the finger that held it by its middle, or the basket. How high it still is in the air does not count. */
  private dropTarget(p: Piece): Target {
    const target = hit(this.pieces, null, this.basket === 'tipped', p.px, p.py - p.def.height * 0.45, p)
    if (target.kind === 'piece' && target.piece.at !== 'mat') return { kind: 'pane' }
    return target
  }

  /** Sets a thing down on the bare mat at a point, or at the nearest free place to it. `strict` is for a place the game chooses and not the child: the whole of it stands clear of every other thing while the mat has room. */
  land(p: Piece, x: number, y: number, dur?: number, strict = false): void {
    const spot: Spot = freeSpot(strict ? this.bulk(p) : p.def, x, y, this.roots(p.def.id), strict)
    p.at = 'mat'
    this.moveRest(p, spot.x, spot.y)
    this.changes += 1
    // The silk has no weight: it sinks, and sighs as it goes.
    if (p.def.kind === 'silk') this.say({ name: 'sigh', piece: p.def.id, gain: 0.8 })
    else this.say({ name: 'touch', piece: p.def.id, gain: 0.4 })
    this.fly(p, 'knock', p.def.kind === 'silk' ? 0.8 : dur)
  }

  /** Sends a single thing back to its place by the mat. A stack has no place there: it is set down whole on the mat instead, at the edge nearest `toward`: where the finger tapped, or where the stack was let go. */
  goHome(p: Piece, toward: Spot = { x: p.px, y: p.py }): void {
    if (withRiders(this.pieces, p).length > 1) return this.land(p, toward.x, toward.y, undefined, true)
    p.at = 'home'; p.on = null; p.x = p.def.home.x; p.y = p.def.home.y
    // By the mat an arch lies on its feet, nested with the others.
    if (p.def.kind === 'arch') p.turned = false
    p.stir = null
    this.fly(p, 'tok')
    this.changes += 1
    this.say({ name: 'touch', piece: p.def.id, gain: 0.4 })
  }

  fly(p: Piece, land: Flight['land'], dur?: number, rise: Spot | null = null): void {
    const far = Math.hypot(p.x - p.px, p.y - p.py)
    p.flight = { sx: p.px, sy: p.py, sl: p.lift, t: 0, dur: dur ?? Math.min(0.34, 0.14 + far / 2600), arc: Math.min(70, 14 + far * 0.12), land, gain: Math.min(1, 0.5 + far / 700), rise, far: 0 }
  }

  private landed(p: Piece, flight: Flight): void {
    const id = p.def.id
    p.landAt = this.time
    if (flight.land === 'quiet') return
    // An arch that comes down on its back, already rocking: its knocks are the rocking's own.
    if (flight.land === 'rock') { p.squashV += 3; return this.ring(p.x, p.y) }
    if (flight.land === 'tok') {
      p.squashV += 2.2
      this.say({ name: 'tok', piece: id, gain: 0.6 })
      return
    }
    // A thing that has reached its seat on another, or the basket: the pair answers now, as it lands.
    if (flight.land === 'seat') return answer(this, p, flight.gain)
    this.knock(p, flight.gain)
  }

  /** A thing knocks down on the mat: its own sound, a ring in the paper, everyone looks, and whoever stands close hops. */
  /** A thing has landed on the mat at a point: a ring opens in the mat's paper there, and the silk, if it lies on the mat, ripples once. */
  ring(x: number, y: number): void {
    this.ripples = [...this.ripples.slice(-3), { x, y, at: this.time }]
    this.landedAt = this.time
  }

  knock(p: Piece, gain: number): void {
    const id = p.def.id
    this.knockAt = this.time
    // Everyone looks at what landed; the one who landed looks at the finger that set it down.
    this.look = { x: p.x, y: p.y - p.def.height * 0.4, until: this.time + 1.4, peek: false, by: id }
    this.ring(p.x, p.y)
    if (p.def.kind === 'silk') {
      this.say({ name: 'bell', piece: id, gain: 0.8 })
      return
    }
    p.squashV += 5.5 * gain
    if (p.def.kind === 'horse') {
      // Front hooves, then back hooves.
      this.say({ name: 'clop', piece: id, gain })
      this.after(0.11, p, { name: 'clop', piece: id, gain: gain * 0.8 }, 2.5)
      // Then it shakes its mane and blows.
      this.after(SNORT, p, { name: 'snort', piece: id, gain: 0.8 })
    } else {
      this.say({ name: 'knock', piece: id, gain })
      // One small bounce.
      p.hopV = 120 * gain
    }
    // Whoever stands close hops from the knock.
    for (const q of this.pieces) {
      const far = Math.hypot(q.x - p.x, (q.y - p.y) * 2)
      if (q !== p && q.at !== 'basket' && q.on === null && isCharacter(q.def.kind) && !q.flight && !q.led && this.hand?.id !== q.def.id && far < HOP_NEAR) q.hopV = 150 + 190 * (1 - far / HOP_NEAR)
    }
  }

  /** The bare mat, tapped with nothing in hand: a paper drum, and the things by the mat hop once. */
  private thump(x: number, y: number): void {
    this.say({ name: 'thump', gain: 0.9 })
    this.ripples = [...this.ripples.slice(-3), { x, y, at: this.time }]
    this.look = { x, y, until: this.time + 1.2, peek: false }
    for (const p of this.pieces) if (!p.flight && p.hop === 0 && p.on === null && p.at !== 'basket') p.hopV = (p.at === 'home' ? 210 : 120) + (isCharacter(p.def.kind) ? 60 : 0)
  }

  /** Turns a thing over where it is, each kind in its own way. */
  private turn(p: Piece): void {
    const id = p.def.id
    p.turned = !p.turned
    p.turnAt = this.time
    this.changes += 1
    switch (p.def.kind) {
      case 'arch':
        if (p.turned) for (const knock of ROCK_KNOCKS) this.after(knock.at, p, { name: 'rock', piece: id, gain: knock.wide })
        else this.after(FLIP, p, { name: 'knock', piece: id, gain: 0.7 }, 4)
        break
      case 'doll':
        p.hopV = 300
        this.say({ name: 'chirp', piece: id, gain: 0.9 })
        break
      case 'horse':
        this.say({ name: 'whinny', piece: id, gain: 0.9 })
        this.after(REAR, p, { name: 'clop', piece: id, gain: 0.9 }, 4)
        break
      case 'silk':
        for (const at of SILK_PATS) this.after(at, p, { name: 'pat', piece: id, gain: 0.8 })
        break
    }
  }
}
