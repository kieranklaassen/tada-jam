import { IdleLadder, type Guidance } from './guidance'
import { TAP_SLOP, type Point } from './input'
import { CORNER } from './layout'
import { cancel, carry, press, release } from './rules'
import { fit, toStage } from './stage'
import { settle, step } from './step'
import { drain, type SoundEvent, type Toy } from './toy'

// Between the glass and the model: which contact is working, what the idle
// ladder shows, and what goes to the speaker. The Mount hands every pointer
// event, every frame's step and every put-away to this and does nothing with
// them itself, so the tests play the game through the same path a finger does.
//
// One contact works at a time, and a contact that rests never deadens the
// game. A contact that landed where nothing is, or that has been down a
// second without moving, hands the work to the next contact that lands. A
// finger that is carrying a thing is never interrupted while it moves. One
// that has not moved for a second hands the work on too, and the thing goes
// back where it came from: a lift that never arrived (a lost capture) must
// not deaden the game until it is put away.
// Everything answers when the finger lands, so how long a tap lasts makes no
// difference: a tap of half a second is a tap.
// The grown-up's corner answers nothing and is not a touch: it does not take
// the idle ladder back.
// Time is the model's own clock, here as everywhere.

/** A contact that has been down this long without moving hands the work to the next one that lands. */
export const RESTS_AFTER = 1
/** Less than this between two reports of a contact is the finger keeping still. */
const STILL = 3

/**
 * How each pointer event that ends a contact is handed on: a lift is the child letting go; a cancel and a lost
 * capture are the contact being taken away, which puts back what was carried. The Mount listens for exactly these.
 */
export const ENDS = { pointerup: 'up', pointercancel: 'cancel', lostpointercapture: 'cancel' } as const

export type Speaker = { play(events: readonly SoundEvent[]): void; cutScene(): void; closeAll(): void }

type Contact = { id: number; from: Point; last: Point; movedAt: number; onNothing: boolean; dragging: boolean }

export class Play {
  toy: Toy | null = null
  guidance: Guidance | null = null
  private ladder = new IdleLadder(0)
  private working: Contact | null = null

  constructor(private readonly speaker: Speaker) {}

  /** The slot has been read: the game stands as it was left. Nothing starts and nothing sounds. */
  load(toy: Toy): void {
    this.toy = toy
    this.working = null
    this.ladder = new IdleLadder(toy.time)
    this.guidance = null
  }

  /** A contact lands at `at`, in the surface's CSS pixels. Returns whether it is now the working one. */
  down(id: number, at: Point, width: number, height: number): boolean {
    const toy = this.toy
    if (!toy || width <= 0 || height <= 0) return false
    if (at.x > width - CORNER && at.y < CORNER) return false
    const working = this.working
    if (working) {
      const carrying = toy.hand !== null && toy.hand.down && toy.hand.carried
      const still = toy.time - working.movedAt >= RESTS_AFTER
      if (carrying ? !still : !(working.onNothing || still)) return false
      // The resting contact is from now on no one's. What it only touched it lets go of; what it carried and has
      // held still for a second goes back where it came from, as when the browser takes a contact away.
      if (carrying) cancel(toy)
      else release(toy)
    }
    this.ladder.touch(toy.time)
    const target = press(toy, toStage(at, fit(width, height)))
    this.working = { id, from: at, last: at, movedAt: toy.time, onNothing: target.kind === 'wood', dragging: false }
    this.hear()
    return true
  }

  move(id: number, at: Point, width: number, height: number): void {
    const toy = this.toy, working = this.working
    if (!toy || !working || working.id !== id || width <= 0 || height <= 0) return
    if (Math.hypot(at.x - working.last.x, at.y - working.last.y) >= STILL) { working.last = at; working.movedAt = toy.time; this.ladder.touch(toy.time) }
    if (!working.dragging && Math.hypot(at.x - working.from.x, at.y - working.from.y) > TAP_SLOP) working.dragging = true
    if (!working.dragging) return
    carry(toy, toStage(at, fit(width, height)))
    this.hear()
  }

  /** The contact lifts. What it carried hangs where it was let go; the model sets it down a moment later. */
  up(id: number): void {
    const toy = this.toy
    if (!toy || this.working?.id !== id) return
    this.working = null
    release(toy)
    this.hear()
  }

  /**
   * The browser took the contact away, or the surface lost its capture of it. That is not the child letting go,
   * and nothing is done in the child's name: what was carried goes back. Returns whether it was the working contact.
   */
  cancel(id: number): boolean {
    const toy = this.toy
    if (!toy || this.working?.id !== id) return false
    this.working = null
    cancel(toy)
    this.hear()
    return true
  }

  /** Plays `dt` seconds of the one clock: the model, then what the idle ladder shows at the new moment. */
  step(dt: number): void {
    const toy = this.toy
    if (!toy) return
    step(toy, dt)
    // A scene the child set off is not idleness, and neither is a thing in the hand. An animal's own small
    // acts are: they never take the ladder back.
    if (toy.scene || toy.hand) this.ladder.touch(toy.time)
    this.guidance = this.ladder.update(toy.time)
    this.hear()
  }

  /** A put-away. The game settles as a load would find it, all sound is closed, and the ladder starts again. */
  park(): void {
    const toy = this.toy
    this.working = null
    if (!toy) return
    settle(toy)
    this.ladder = new IdleLadder(toy.time)
    this.guidance = null
    this.hear()
  }

  /** What the model has cut and asked for by this moment goes to the speaker, in that order. */
  private hear(): void {
    const toy = this.toy!
    if (toy.cut.all) this.speaker.closeAll()
    else if (toy.cut.scene) this.speaker.cutScene()
    toy.cut = { scene: false, all: false }
    this.speaker.play(drain(toy))
  }
}
