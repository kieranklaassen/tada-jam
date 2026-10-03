import type { Game } from './cycle'
import { newDog, poseOf, react, stepDog, type DogState, type Reaction } from './dogMotion'
import { MOUTH, newFx, spawn, step, whoosh, type FxState } from './fx'
import { guideOf } from './guide'
import type { Guidance, HandPose } from './guidance'
import { handPose } from './guidance'
import { shown, type Point } from './stage'
import { dogTaste } from './tastes'
import { newStroke, poke, slice, type Stroke, type ToyEvent } from './toy'
import type { Frame } from './toyView'
import type { VoiceId } from './voices'

// The toy while it runs: the game, what is moving, the dog, the blade under
// the finger, and the sounds waiting to be played. The Mount hands it
// gestures and seconds and asks it for a frame; it touches no canvas, no
// storage and no audio, so all of it can be played in a test.
//
// The world changes at once, on the touch. Everything that moves afterwards
// (a hop, a flight to the dog) only shows how, so the game is whole and can be
// saved at any instant: nothing is ever in the air in what is saved.

/** A sound to play: a voice, the length it is about, a count where it counts something, and seconds to wait first. */
export type Sound = { id: VoiceId; length?: number; count?: number; delay: number }

/** A stroke shorter than this that cut nothing is not a swing: it gets no whistle. */
export const SWING = 60
/** Cuts made by one step of a stroke sound one after another, this many seconds apart, so a long stroke is a run of notes. */
export const RUN_GAP = 0.055

export class ToyRun {
  game: Game
  fx: FxState
  dog: DogState
  /** The blade, while a finger is down. */
  blade: Point | null = null
  /** The game changed since this was last cleared: it wants saving. */
  dirty = false
  private stroke: Stroke | null = null
  private last: Point | null = null
  private sounds: Sound[] = []
  /** What the dog will do when something reaches it: seconds to go, and the reaction. */
  private coming: { wait: number; reaction: Reaction; amount: number }[] = []
  private hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  /** `seed` scatters the effects and paces the dog; the game's own stream is in the game. */
  constructor(game: Game, seed: number) {
    this.game = game
    this.fx = newFx(seed)
    this.dog = newDog(seed + 1)
  }

  /** The finger lands: the blade is there at once, with its ring. */
  press(at: Point): void {
    this.blade = at
    this.last = at
    this.stroke = newStroke()
    this.sounds.push({ id: 'ring', delay: 0 })
  }

  /** The finger moves: the hairline goes with it, ticking past each piece end, and whatever the step crosses is cut. */
  move(at: Point): void {
    // A finger that comes back after a lift starts a new stroke where it is: nothing is cut along the jump.
    if (!this.stroke || !this.last) {
      this.blade = at
      this.last = at
      this.stroke = newStroke()
      return
    }
    const from = this.last
    const result = slice(this.game, from, at, this.stroke)
    if (result.events.length === 0 && this.passedAnEnd(from.x, at.x)) this.sounds.push({ id: 'tickEnd', delay: 0 })
    this.take(result.game, result.events)
    this.stroke = result.stroke
    this.last = at
    this.blade = at
  }

  /** The finger lifts after a stroke. A swing that crossed nothing whistles and flaps the awning. */
  lift(): void {
    const stroke = this.stroke, at = this.blade
    if (stroke && at && stroke.made.length === 0 && !stroke.crate && !stroke.dog && stroke.travelled >= SWING) {
      this.fx = whoosh(this.fx, at.x, at.y, Math.PI / 2)
      this.sounds.push({ id: 'whistle', delay: 0 })
    }
    this.end()
  }

  /** The finger lifts where it landed: a poke at whatever is under it. */
  tap(at: Point): void {
    const result = poke(this.game, at)
    this.take(result.game, result.events)
    this.end()
  }

  /** The touch is over, however it ended: the blade goes. */
  end(): void {
    this.blade = null
    this.stroke = null
    this.last = null
  }

  /** Plays `dt` seconds of everything that moves. The game itself does not change with time. */
  step(dt: number): void {
    this.fx = step(this.fx, dt)
    this.dog = stepDog(this.dog, dt)
    for (const one of this.coming) one.wait -= dt
    for (const one of this.coming.filter((due) => due.wait <= 0)) this.dog = react(this.dog, one.reaction, one.amount)
    this.coming = this.coming.filter((due) => due.wait > 0)
  }

  /** The sounds queued since the last call, in order, for the Mount to play. */
  takeSounds(): Sound[] {
    const sounds = this.sounds
    this.sounds = []
    return sounds
  }

  /** What to draw now. `time` is attended seconds; `guidance` is what the idle ladder returned for this frame. */
  frame(time: number, guidance: Guidance): Frame {
    const guide = guidance.glow > 0.01 || guidance.demo !== null ? guideOf(this.game.world, Math.max(0, guidance.demoIndex)) : null
    const hand = guide && guidance.demo !== null ? handPose(guidance.demo, guide.hand.drag, this.hand) : null
    // While a finger is down the dog watches the blade; otherwise it looks up at the board by itself.
    const look = this.blade ? { x: (this.blade.x - MOUTH.x) / 420, y: (this.blade.y - MOUTH.y) / 260 } : null
    return { world: this.game.world, fx: this.fx, dog: poseOf(this.dog, look), time, blade: this.blade, glow: guidance.glow, guide, hand }
  }

  private passedAnEnd(fromX: number, toX: number): boolean {
    const low = Math.min(fromX, toX), high = Math.max(fromX, toX)
    return shown(this.game.world).some(({ box }) => (box.x > low && box.x <= high) || (box.x + box.w > low && box.x + box.w <= high))
  }

  /** Takes in what a move did: the new game, an effect and a sound for each thing that happened, and the dog's part in it. */
  private take(game: Game, events: readonly ToyEvent[]): void {
    if (game.world !== this.game.world || game.seed !== this.game.seed) this.dirty = true
    this.game = game
    let cuts = 0
    for (const event of events) {
      this.fx = spawn(this.fx, event)
      if (event.kind === 'swept') continue
      const delay = event.kind === 'cut' || event.kind === 'curl' ? cuts++ * RUN_GAP : 0
      const length = 'length' in event ? event.length : event.kind === 'fell' ? event.piece.length : undefined
      this.sounds.push({ id: event.voice, length, delay })
      // The dog's part: it barks or snaps at once, and eats what flies to it when it gets there.
      if (event.kind === 'bark') this.dog = react(this.dog, 'bark')
      if (event.kind === 'snap') this.dog = react(this.dog, 'snap')
      if (event.kind === 'curl') this.coming.push({ wait: 0.5, reaction: 'spin', amount: 0 })
      if (event.kind === 'fell') {
        const taste = dogTaste(event.piece.length, event.piece.fruit)
        this.coming.push({ wait: 0.36, reaction: taste.act === 'spin' ? 'spin' : taste.act === 'snap' ? 'gulp' : 'cheeks', amount: taste.cheeks })
      }
    }
  }
}
