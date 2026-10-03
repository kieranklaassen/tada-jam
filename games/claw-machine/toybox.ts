import { toySpan } from './builds'
import { STEP, follow, hubAt, letBe, newClaw, release, stepClaw, type Claw, type ClawEvent } from './claw'
import { HINGE_DROP, JAW_REACH } from './clawBuild'
import { RAIL, TRAY, placeAt } from './places'
import type { Toy } from './toys'
import { STACK_MOST, emptyTray, nearestPlace, nearestToy, nearestWithRoom, put, take, type Tray } from './tray'

// The toy: the claw over a tray of toys, with no goal. Every touch is
// answered: the claw closes on what it lands on, a toy let go clicks onto the
// studs or onto another toy, and a claw with nothing under it rings the tray.

export type Piece = {
  key: number
  toy: Toy
  height: number
  /** 1 a small toy, 2 a big one. */
  heavy: 1 | 2
  state: 'standing' | 'held' | 'flying'
  /** The place it stands on, or is on its way to. Nothing is ever between places for the rules. */
  place: number
  /** The middle of its base. */
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  /** How far a hop has lifted it off its rest. */
  hop: number
  hopV: number
  squash: number
  squashV: number
  leanX: number
  leanZ: number
  /** 0 just caught, 1 hanging true in the jaws. */
  hang: number
  /** A full stack it will bounce off first, or -1. */
  bounceOff: number
}

export type ToyEvent =
  | { type: 'chirp'; distance: number }
  | { type: 'tick' }
  | { type: 'buffer'; speed: number }
  | { type: 'clack' }
  | { type: 'pop'; heavy: number; level: number }
  | { type: 'settle' }
  | { type: 'bite' }
  | { type: 'bonk'; column: number }
  | { type: 'ratchet'; progress: number; heavy: number }
  | { type: 'let-go' }
  | { type: 'click'; heavy: number; level: number }
  | { type: 'boing' }

/** How far from the middle of a toy the claw can land and still close on it. */
export const REACH = 4.6
const LOWEST_RIDE = 9.2
const FALL = 110

export class Toybox {
  readonly claw: Claw = newClaw(0, 6, LOWEST_RIDE)
  readonly pieces: Piece[] = []
  readonly tray: Tray = emptyTray()
  held: Piece | null = null
  /** What happened since the events were last taken, for the sounds. */
  events: ToyEvent[] = []
  private owed = 0
  private readonly fromClaw: ClawEvent[] = []

  constructor(load: readonly { toy: Toy; place: number }[]) {
    load.forEach(({ toy, place }, key) => {
      const span = toySpan(toy)
      const piece: Piece = {
        key, toy, height: span.height, heavy: toy.size === 'big' ? 2 : 1, state: 'standing', place,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, hop: 0, hopV: 0, squash: 1, squashV: 0, leanX: 0, leanZ: 0, hang: 0, bounceOff: -1,
      }
      put(this.tray, place, key)
      this.pieces.push(piece)
      this.rest(piece)
    })
  }

  /** The height of the top of a stack: where the next toy would stand, and what a claw lands on. */
  stackTop(place: number, upTo = Infinity): number {
    let y: number = TRAY.top
    for (const key of this.tray[place]) {
      if (key === upTo) break
      y += this.pieces[key].height
    }
    return y
  }

  private rest(piece: Piece): void {
    const at = placeAt(piece.place)
    piece.x = at.x; piece.z = at.z
    piece.y = this.stackTop(piece.place, piece.key)
  }

  /** The finger landed or moved, at a point of the tray. */
  point(x: number, z: number): void {
    follow(this.claw, x, z, this.fromClaw)
  }

  /** The finger lifted. The claw goes for the nearest toy in reach, or with a toy in its jaws for the nearest place with room. */
  lift(): void {
    const claw = this.claw
    const place = this.held ? nearestPlace(claw.targetX, claw.targetZ) : nearestToy(this.tray, claw.targetX, claw.targetZ, REACH)
    if (place >= 0) { const at = placeAt(place); claw.targetX = at.x; claw.targetZ = at.z }
    release(claw, true)
  }

  /** The press ended with no lift: the claw stays where it is with what it has. */
  cancel(): void {
    letBe(this.claw)
  }

  /** Plays `seconds` of game time in fixed steps. */
  advance(seconds: number): void {
    this.owed += seconds
    while (this.owed >= STEP - 1e-9) { this.owed -= STEP; this.step() }
  }

  private step(): void {
    const claw = this.claw
    const under = this.held ? -1 : nearestToy(this.tray, claw.x, claw.z, REACH)
    const landY = under >= 0 ? this.stackTop(under) : TRAY.top
    stepClaw(claw, this.rideY(), landY, this.fromClaw)
    for (const event of this.fromClaw) this.answer(event)
    this.fromClaw.length = 0
    for (const piece of this.pieces) this.move(piece)
  }

  /** The hinge of the jaws rides high enough to clear whatever is near, with what it carries. */
  private rideY(): number {
    let near: number = TRAY.top
    for (let place = 0; place < this.tray.length; place++) {
      const at = placeAt(place)
      if (Math.hypot(at.x - this.claw.x, at.z - this.claw.z) < 7.5) near = Math.max(near, this.stackTop(place))
    }
    const below = this.held ? this.held.height + JAW_REACH * 0.5 : JAW_REACH
    return Math.max(LOWEST_RIDE, near + below + 1.5)
  }

  private answer(event: ClawEvent): void {
    const claw = this.claw
    if (event.type === 'chirp') this.events.push({ type: 'chirp', distance: event.distance })
    else if (event.type === 'tick') this.events.push({ type: 'tick' })
    else if (event.type === 'buffer') this.events.push({ type: 'buffer', speed: event.speed })
    else if (event.type === 'ratchet') this.events.push({ type: 'ratchet', progress: event.progress, heavy: claw.load })
    else if (event.type === 'closed') {
      // A toy off the top of a stack pops higher the taller the stack, and what is left settles with a double click.
      if (!this.held) this.events.push({ type: 'bite' })
      else {
        const left = this.tray[this.held.place].length
        this.events.push({ type: 'pop', heavy: this.held.heavy, level: left })
        if (left > 0) this.events.push({ type: 'settle' })
      }
    }
    else if (event.type === 'landed') {
      this.events.push({ type: 'clack' })
      const place = nearestToy(this.tray, claw.x, claw.z, REACH)
      const key = place >= 0 ? take(this.tray, place) : null
      if (key === null) {
        // Nothing under the jaws: the claw bonks the studs, and the tray rings a note set by how far along it is.
        this.events.push({ type: 'bonk', column: nearestPlace(claw.x, claw.z) % TRAY.columns })
        this.shake(event.x, event.z, 12, 24)
        return
      }
      const piece = this.pieces[key]
      piece.state = 'held'; piece.hang = 0; piece.squash = 1.22; piece.squashV = 0
      this.held = piece
      claw.load = piece.heavy; claw.grip = piece.heavy === 2 ? 0.52 : 0.3
      this.shake(piece.x, piece.z, 13, 6)
      // What it stood on wobbles as its top goes.
      for (const below of this.tray[place]) { this.pieces[below].squash = 0.86; this.pieces[below].squashV = 0 }
    } else if (event.type === 'let-go' && this.held) {
      const piece = this.held
      this.held = null
      piece.state = 'flying'
      // It comes down on the place under the trolley, wherever its swing has carried it: where a toy lands never
      // depends on the moment the finger lifts.
      piece.vx = 0; piece.vz = 0; piece.vy = 0
      const aim = nearestPlace(event.x, event.z)
      // A stack of three takes no more: the toy bounces off its top and lands on the nearest place with room.
      piece.bounceOff = this.tray[aim].length >= STACK_MOST ? aim : -1
      const home = piece.bounceOff < 0 ? aim : nearestWithRoom(this.tray, piece.x, piece.z, aim)
      piece.place = home >= 0 ? home : aim
      // It belongs to its place from the moment it is let go, so nothing is ever between places for the rules.
      put(this.tray, piece.place, piece.key)
      this.events.push({ type: 'let-go' })
    }
  }

  /** Hops the standing toys round a point: hardest beside it, fading with distance. */
  private shake(x: number, z: number, strength: number, reach: number): void {
    for (const piece of this.pieces) {
      if (piece.state !== 'standing') continue
      const d = Math.hypot(piece.x - x, piece.z - z)
      piece.hopV += strength / (1 + (d / reach) * (d / reach)) / Math.sqrt(piece.heavy)
    }
  }

  private move(piece: Piece): void {
    piece.squashV += ((1 - piece.squash) * 600 - piece.squashV * 22) * STEP
    piece.squash += piece.squashV * STEP
    if (piece.state === 'held') {
      // Hangs under the jaws along the cable, easing from where it stood to where it hangs.
      const claw = this.claw, hub = hubAt(claw)
      const down = (hub.y - RAIL.top) / claw.length, across = (hub.x - claw.x) / claw.length, along = (hub.z - claw.z) / claw.length
      const drop = HINGE_DROP + JAW_REACH * 0.5 + piece.height
      piece.hang = Math.min(1, piece.hang + STEP / 0.18)
      const ease = piece.hang * piece.hang * (3 - 2 * piece.hang)
      piece.x += (hub.x + across * drop - piece.x) * ease
      piece.y += (hub.y + down * drop - piece.y) * ease
      piece.z += (hub.z + along * drop - piece.z) * ease
      piece.leanX = claw.swingX * ease; piece.leanZ = claw.swingZ * ease
      piece.hop = 0; piece.hopV = 0
      return
    }
    piece.leanX *= 1 - Math.min(1, 14 * STEP); piece.leanZ *= 1 - Math.min(1, 14 * STEP)
    if (piece.state === 'flying') {
      const target = piece.bounceOff >= 0 ? piece.bounceOff : piece.place
      const at = placeAt(target), floor = piece.bounceOff >= 0 ? this.stackTop(target) : this.stackTop(target, piece.key)
      piece.vy -= FALL * STEP
      piece.x += piece.vx * STEP + (at.x - piece.x) * Math.min(1, 9 * STEP)
      piece.z += piece.vz * STEP + (at.z - piece.z) * Math.min(1, 9 * STEP)
      piece.vx *= 1 - Math.min(1, 6 * STEP); piece.vz *= 1 - Math.min(1, 6 * STEP)
      piece.y += piece.vy * STEP
      if (piece.y > floor || piece.vy > 0) return
      piece.y = floor
      if (piece.bounceOff >= 0) {
        piece.bounceOff = -1
        piece.vy = 30; piece.vx = 0; piece.vz = 0
        piece.squash = 0.7; piece.squashV = 0
        this.events.push({ type: 'boing' })
        return
      }
      piece.state = 'standing'; piece.vx = piece.vy = piece.vz = 0
      piece.squash = 0.68; piece.squashV = 0
      this.events.push({ type: 'click', heavy: piece.heavy, level: this.tray[piece.place].indexOf(piece.key) })
      // A small toy hops its neighbours; a big one hops the whole tray.
      this.shake(at.x, at.z, piece.heavy === 2 ? 16 : 12, piece.heavy === 2 ? 14 : 6)
      piece.hop = 0; piece.hopV = 0
      return
    }
    // Standing: a hop is a small throw straight up, and a landing from it squashes a little.
    if (piece.hop > 0 || piece.hopV > 0) {
      piece.hopV -= FALL * STEP
      piece.hop += piece.hopV * STEP
      if (piece.hop <= 0) {
        if (piece.hopV < -5) { piece.squash = Math.max(0.8, 1 + piece.hopV * 0.012); piece.squashV = 0 }
        piece.hop = 0; piece.hopV = 0
      }
    }
    const at = placeAt(piece.place)
    piece.x = at.x; piece.z = at.z
    // A toy on a stack rides the hop of whatever it stands on.
    const stack = this.tray[piece.place]
    const under = stack.indexOf(piece.key) > 0 ? this.pieces[stack[0]].hop : 0
    piece.y = this.stackTop(piece.place, piece.key) + piece.hop + (stack[0] === piece.key ? 0 : under)
  }

  /** Takes what happened since the last call. */
  takeEvents(): ToyEvent[] {
    const out = this.events
    this.events = []
    return out
  }
}
