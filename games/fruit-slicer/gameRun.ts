import { FLING_SPEED, drop, fling, grab, rollOver, type Held } from './carry'
import { newActor, poseOf as castPose, reactTo, stepActor, type Actor } from './cast'
import type { Ending, Game } from './cycle'
import { newDog, poseOf as dogPose, react, stepDog, type DogState, type Reaction } from './dogMotion'
import { MOUTH, newFx, spawn, step, whoosh, type FxState } from './fx'
import { guideOf, type Guide } from './guide'
import { handPose, type Guidance, type HandPose } from './guidance'
import { newStroke, poke, slice, thingAt, tinAt, type GameEvent, type Stroke, type Whom } from './moves'
import { Scene, followedBy } from './scene'
import { gliderBeats, restShow, servedShow, serveBeats, showingBeats, type Show } from './scenes'
import { shown, type Point } from './stage'
import { dogTaste } from './tastes'
import type { VoiceId } from './voices'
import type { Customer } from './orders'
import { eaten } from './world'

// The game while it runs: the game itself, what is moving, the cast, the
// blade or the piece under the finger, the scene that is playing, and the
// sounds waiting to be played. The Mount hands it gestures and seconds and
// asks it for a frame; it touches no canvas, no storage and no audio, so all
// of it can be played in a test.
//
// The world changes at once, on the touch. Everything that moves afterwards
// (a hop, a flight, a whole scene) only shows what has already happened, so
// the game is whole at every instant: a piece in the hand is still where it
// was picked up, and a scene's outcome is in the game before its first beat.

/** A sound to play: a voice, the length it is about, a count where it counts something, and seconds to wait first. */
export type Sound = { id: VoiceId; length?: number; count?: number; delay: number }

/** A stroke shorter than this that cut nothing is not a swing: it gets no whistle. */
export const SWING = 60
/** The stretch of a carry, in seconds, over which its speed at the moment of letting go is taken. */
export const SPEED_WINDOW = 0.1
/** Cuts made by one step of a stroke sound one after another, this many seconds apart, so a long stroke is a run of notes. */
export const RUN_GAP = 0.055

/** What the view needs for one frame, besides what it reads from the game. Points are in stage units. */
export type Scenery = {
  game: Game
  fx: FxState
  dog: ReturnType<typeof dogPose>
  /** The customers' motion: the one at the window, and the two who wait. */
  window: Actor | null
  queue: [Actor, Actor]
  time: number
  blade: Point | null
  /** The pieces in the hand, and how far they have been carried from where they lie in the world. */
  carried: { ids: number[]; dx: number; dy: number } | null
  /** The roller: where the finger has it, or nothing while it hangs on its hook. */
  roller: Point | null
  /** The scene that is playing, or the last pose of the serve while a served customer stands at the window. */
  show: Show | null
  /** The ending whose serve is playing: the taste lands on these pieces. Nothing once the scene is over. */
  ending: Ending | null
  /** A customer who has left the game and is still on its way out: the pelican, gliding. */
  leaving: Customer | null
  /** The idle ladder: how strongly the next thing glows, what glows, and the ghost hand when it is showing a move. */
  glow: number
  guide: Guide | null
  hand: HandPose | null
}

export class GameRun {
  game: Game
  fx: FxState
  dog: DogState
  window: Actor | null
  queue: [Actor, Actor]
  blade: Point | null = null
  /** The game changed since this was last cleared: it wants saving, and at once when `urgent` is set. */
  dirty = false
  urgent = false
  private stroke: Stroke | null = null
  private last: Point | null = null
  private held: { held: Held; at: Point; trail: { at: Point; t: number }[] } | null = null
  private roller: Point | null = null
  private sounds: Sound[] = []
  private coming: { wait: number; reaction: Reaction; amount: number }[] = []
  private hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private scene: Scene | null = null
  private show: Show | null = null
  private ending: Ending | null = null
  private leaving: Customer | null = null
  private skipping = false
  private clock = 0
  private seed: number

  /** `seed` scatters the effects and paces the cast; the game's own stream is in the game. */
  constructor(game: Game, seed: number) {
    this.game = game
    this.seed = seed
    this.fx = newFx(seed)
    this.dog = newDog(seed + 1)
    this.window = game.window ? newActor(game.window.who, seed + 2) : null
    this.queue = [newActor(game.queue[0].who, seed + 3), newActor(game.queue[1].who, seed + 4)]
  }

  /** A scene is playing. The idle ladder stays at the bottom while one is. */
  get playing(): boolean {
    return this.scene?.running ?? false
  }

  /**
   * The finger lands. A scene that is playing ends first, and the touch is then an ordinary touch. On a piece,
   * the finger takes hold of it; on the roller, of the roller; anywhere else the blade is there at once.
   */
  press(at: Point, t = 0): void {
    this.finishScene()
    const hit = thingAt(this.game, at)
    if (hit.thing === 'roller') {
      this.roller = at
      this.sounds.push({ id: 'tickEnd', delay: 0 })
      return
    }
    const held = hit.thing === 'fruit' || hit.thing === 'piece' ? grab(this.game, at) : null
    if (held) {
      this.held = { held, at, trail: [{ at, t }] }
      this.sounds.push({ id: 'pick', length: hit.thing === 'fruit' || hit.thing === 'piece' ? hit.piece.length : undefined, delay: 0 })
      return
    }
    this.blade = at
    this.last = at
    this.stroke = newStroke()
    this.sounds.push({ id: 'ring', delay: 0 })
  }

  /** The finger moves: a piece or the roller goes with it; the blade's hairline goes with it and whatever the step crosses is cut. */
  move(at: Point, t = 0): void {
    if (this.roller) {
      this.roller = at
      return
    }
    if (this.held) {
      this.held.at = at
      this.held.trail.push({ at, t })
      if (this.held.trail.length > 12) this.held.trail.shift()
      return
    }
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

  /** The finger lifts after a drag: the piece is let go, flung if it was moving fast; the roller rolls what it is over; a swing that crossed nothing whistles. */
  lift(): void {
    if (this.roller) {
      const result = rollOver(this.game, this.roller)
      this.roller = null
      this.take(result.game, result.events)
      return
    }
    if (this.held) {
      const { held, at, trail } = this.held
      this.held = null
      // How fast it was going as it was let go: over the last tenth of a second of the carry, no further back.
      const lastOne = trail[trail.length - 1]
      const first = trail.find((sample) => sample.t >= lastOne.t - SPEED_WINDOW) ?? lastOne
      const dt = lastOne.t - first.t
      const v = dt > 0.001 ? { x: (lastOne.at.x - first.at.x) / dt, y: (lastOne.at.y - first.at.y) / dt } : { x: 0, y: 0 }
      const result = held.ids.length === 1 && Math.hypot(v.x, v.y) >= FLING_SPEED ? fling(this.game, held, at, v) : drop(this.game, held, at)
      this.take(result.game, result.events)
      return
    }
    const stroke = this.stroke, at = this.blade
    if (stroke && at && stroke.made.length === 0 && !stroke.crate && !stroke.dog && !stroke.tin && stroke.snipped.length === 0 && stroke.travelled >= SWING) {
      this.fx = whoosh(this.fx, at.x, at.y, Math.PI / 2)
      this.sounds.push({ id: 'whistle', delay: 0 })
    }
    this.end()
  }

  /** The finger lifts where it landed: a poke at whatever is under it. A piece that was only held, not carried, is poked where it lies. */
  tap(at: Point): void {
    this.held = null
    this.roller = null
    const result = poke(this.game, at)
    this.take(result.game, result.events)
    this.end()
  }

  /** The touch is over, however it ended: the blade goes, and anything in the hand stays where it was in the world. */
  end(): void {
    this.blade = null
    this.stroke = null
    this.last = null
    this.held = null
    this.roller = null
  }

  /** Plays `dt` seconds of everything that moves. The game itself does not change with time. */
  step(dt: number): void {
    this.clock += dt
    this.scene?.update(this.clock)
    if (this.scene && !this.scene.running) this.sceneOver()
    this.fx = step(this.fx, dt)
    this.dog = stepDog(this.dog, dt)
    if (this.window) this.window = stepActor(this.window, dt)
    this.queue = [stepActor(this.queue[0], dt), stepActor(this.queue[1], dt)]
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
  frame(time: number, guidance: Guidance): Scenery {
    const idle = !this.playing && (guidance.glow > 0.01 || guidance.demo !== null)
    const guide = idle ? guideOf(this.game, Math.max(0, guidance.demoIndex)) : null
    const hand = guide && guidance.demo !== null ? handPose(guidance.demo, guide.hand.drag, this.hand) : null
    // While a finger is down the dog watches it; otherwise it looks up at the board by itself.
    const finger = this.blade ?? this.held?.at ?? this.roller
    const look = finger ? { x: (finger.x - MOUTH.x) / 420, y: (finger.y - MOUTH.y) / 260 } : null
    const carried = this.held ? { ids: this.held.held.ids, dx: this.held.at.x - this.held.held.dx - this.held.held.boxes[0].x, dy: this.held.at.y - this.held.held.dy - this.held.held.boxes[0].y } : null
    // With no scene playing, a served customer is in the last pose of its serve: that is what a load finds.
    const show = this.show ?? (this.game.window && this.game.finished ? servedShow(eaten(this.game.world).length) : null)
    return { game: this.game, fx: this.fx, dog: dogPose(this.dog, look), window: this.window, queue: this.queue, time, blade: this.blade, carried, roller: this.roller, show, ending: this.ending, leaving: this.leaving, glow: idle ? guidance.glow : 0, guide, hand }
  }

  /** A customer's pose, for the view: the one at the window or one who waits, and which of its bodies. */
  static pose = castPose

  private passedAnEnd(fromX: number, toX: number): boolean {
    const low = Math.min(fromX, toX), high = Math.max(fromX, toX)
    return shown(this.game.world, tinAt(this.game)).some(({ box }) => (box.x > low && box.x <= high) || (box.x + box.w > low && box.x + box.w <= high))
  }

  private actorOf(whom: Whom): Actor | null {
    return whom === 'window' ? this.window : this.queue[whom]
  }

  private reactAs(whom: Whom, reaction: Parameters<typeof reactTo>[1]): void {
    const actor = this.actorOf(whom)
    if (!actor) return
    if (whom === 'window') this.window = reactTo(actor, reaction)
    else this.queue[whom] = reactTo(actor, reaction)
  }

  /** A touch ends the scene that is playing: every beat lands at its end, and none of the sounds it had not reached is heard. */
  private finishScene(): void {
    if (!this.scene?.running) return
    this.skipping = true
    this.scene.finish()
    this.skipping = false
    this.sceneOver()
  }

  private sceneOver(): void {
    this.scene = null
    this.ending = null
    // The serve leaves its last pose, which is rebuilt from the game; the showing leaves the ruled rail; the glider leaves an empty window.
    this.show = null
    this.leaving = null
    if (!this.game.window) this.window = null
  }

  private start(beats: Parameters<typeof followedBy>[0], show: Show, ending: Ending | null): void {
    this.finishScene()
    this.show = show
    this.ending = ending
    this.scene = new Scene(beats)
    // The outcome is already in the game: all that is left is to hand it to storage at once.
    this.scene.start(this.clock, () => {
      this.dirty = true
      this.urgent = true
    })
  }

  /** Takes in what a move did: the new game, an effect and a sound for each thing that happened, the cast's part in it, and a scene where one starts. */
  private take(game: Game, events: readonly GameEvent[]): void {
    const before = this.game
    if (game.world !== before.world || game.seed !== before.seed || game.window !== before.window || game.queue !== before.queue || game.finished !== before.finished || game.position !== before.position || game.shown !== before.shown) this.dirty = true
    this.game = game
    const cue = (id: VoiceId, length?: number, count?: number): void => {
      if (!this.skipping) this.sounds.push({ id, length, count, delay: 0 })
    }
    let cuts = 0
    let showing: string | null = null
    for (const event of events) {
      this.fx = spawn(this.fx, event)
      if ('voice' in event) {
        const delay = event.kind === 'cut' || event.kind === 'curl' ? cuts++ * RUN_GAP : 0
        const length = 'length' in event ? event.length : 'piece' in event ? event.piece.length : undefined
        const count = event.kind === 'pressed' || event.kind === 'rolled' ? event.parts : undefined
        this.sounds.push({ id: event.voice, length, count, delay })
      }
      switch (event.kind) {
        case 'bark':
          this.dog = react(this.dog, 'bark')
          break
        case 'snap':
          this.dog = react(this.dog, 'snap')
          break
        case 'curl':
          this.coming.push({ wait: 0.5, reaction: 'spin', amount: 0 })
          break
        case 'fell': {
          const taste = dogTaste(event.piece.length, event.piece.fruit)
          this.coming.push({ wait: 0.36, reaction: taste.act === 'spin' ? 'spin' : taste.act === 'snap' ? 'gulp' : 'cheeks', amount: taste.cheeks })
          break
        }
        case 'rolled':
          if (event.on === 'dog') this.dog = react(this.dog, 'ironed')
          if (event.on === 'customer' && event.whom !== null) this.reactAs(event.whom, 'flat')
          break
        case 'flinch':
          this.reactAs(event.whom, 'flinch')
          break
        case 'snip':
          this.reactAs(event.whom, 'snip')
          break
        case 'splat':
          this.reactAs(event.whom, 'lick')
          break
        case 'ate':
          this.reactAs(event.whom, 'gulp')
          break
        case 'called': {
          // The one who was called steps up; whoever now stands in its place in the queue has just arrived there.
          const called = this.queue[event.index]
          this.queue[event.index] = event.did === 'swapped' && this.window ? reactTo(this.window, 'step') : reactTo(newActor(game.queue[event.index].who, ++this.seed + 10), 'step')
          this.window = reactTo(called, 'step')
          this.sounds.push({ id: 'step', delay: 0 })
          this.urgent = true
          break
        }
        case 'gliderAway':
          this.queue[event.whom] = reactTo(newActor(game.queue[event.whom].who, ++this.seed + 10), 'step')
          this.sounds.push({ id: 'whistle', delay: 0.2 }, { id: 'step', delay: 0.5 })
          this.urgent = true
          break
        case 'given':
          showing = event.firstShowing ?? showing
          break
        case 'ending': {
          const customer = before.window ?? game.window
          if (!customer) break
          if (event.ending.glider) {
            // The pelican has already left the game; it is kept here only for as long as its leaving is shown.
            const show = restShow('glider')
            this.leaving = customer
            this.start(gliderBeats(show, cue), show, event.ending)
          } else {
            const show = restShow('serve')
            const serve = serveBeats(show, event.ending, cue)
            this.start(showing ? followedBy(showingBeats(show, customer, cue), serve) : serve, show, event.ending)
          }
          showing = null
          break
        }
      }
    }
    // A new idea shown with nothing ending: the first showing plays alone, and the tin stays open after it.
    if (showing && game.window) {
      const show = restShow('showing')
      this.start(showingBeats(show, game.window, cue), show, null)
    }
  }
}
