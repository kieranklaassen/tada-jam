import { FLING_SPEED, drop, fling, grab, rollOver, type Held } from './carry'
import { SHEETS, newActor, poseOf as castPose, reactAfter, reactTo, stepActor, type Actor } from './cast'
import type { Ending, Game } from './cycle'
import { newDog, poseOf as dogPose, react, stepDog, type DogState, type Reaction } from './dogMotion'
import { CURL_FLIGHT, CURL_LIFE, LANDS_AFTER, LID_STRIKES, MOUTH, mark, newFx, rollAlong, spawn, step, whoosh, type FxState } from './fx'
import { guideOf, type Guide } from './guide'
import { handPose, type Guidance, type HandPose } from './guidance'
import { newStroke, poke, slice, thingAt, tinAt, type GameEvent, type Stroke, type Whom } from './moves'
import { Scene, followedBy } from './scene'
import { headOf } from './seats'
import { gliderBeats, restShow, servedShow, serveBeats, showingBeats, type Show } from './scenes'
import { hiccupAt } from './feast'
import { CRATE, DOG, TIN, shown, type Point } from './stage'
import { dogTaste } from './tastes'
import type { VoiceId } from './voices'
import type { Fruit } from './measure'
import { CAST, type Customer } from './orders'
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

/** How far a stroke has to travel to whistle when it crossed nothing: no distance at all. Every stroke that crosses nothing whistles, however short; the touch layer has already told a stroke from a tap. */
export const SWING = 0
/** The stretch of a carry, in seconds, over which its speed at the moment of letting go is taken. */
export const SPEED_WINDOW = 0.1
/** A finger that came back just after a lift is still tapping while it stays within this of where it landed, in stage units: the tracker's own slop for a tap. */
const LANDED_SLOP = 14

/** Cuts made by one step of a stroke sound one after another, this many seconds apart, so a long stroke is a run of notes. */
export const RUN_GAP = 0.055
/** And each sounds at the pitch of its own piece or a step above the cut before it, whichever is higher: one stroke is a run of rising notes. */
export const RUN_STEP = 0.94
/** How far through being rolled flat each customer springs back into shape, as its own motion has it: that is when it honks. */
export const SPRINGS_BACK = { pelican: 0.6, twins: 0.54, ants: 0.65, cat: 0.66, boa: 0.7 } as const
/** How long what one who waits was given shows in its body: it goes down in the first of these seconds and is gone at the last. */
export const SNACK_SECONDS = 5
export const SNACK_DOWN = 0.6

/** What the view needs for one frame, besides what it reads from the game. Points are in stage units. */
export type Scenery = {
  game: Game
  fx: FxState
  dog: ReturnType<typeof dogPose>
  /** The customers' motion: the one at the window, and the two who wait. */
  window: Actor | null
  queue: [Actor, Actor]
  /** The motion of a pelican gliding out of the queue, while it is still on screen. */
  leavingActor: Actor | null
  time: number
  blade: Point | null
  /** Where the finger is while it is down, whatever it holds: every eye in the stall follows it. */
  finger: Point | null
  /** The pieces in the hand, and how far they have been carried from where they lie in the world. */
  carried: { ids: number[]; dx: number; dy: number } | null
  /** The roller: where the finger has it, or nothing while it hangs on its hook. */
  roller: Point | null
  /** The scene that is playing, or the last pose of the serve while a served customer stands at the window. */
  show: Show | null
  /** The ending whose serve is playing: the taste lands on these pieces. Nothing once the scene is over. */
  ending: Ending | null
  /** A customer who has left the game and is still on its way out: the pelican, gliding, from the window or from its place in the queue, with the fruit it was fed across its beak. */
  leaving: { customer: Customer; whom: Whom; fruit: Fruit } | null
  /** What the two who wait have been given by hand and eaten: each piece shows in the body that ate it for a few seconds, and is in no state. */
  snacks: readonly { whom: 0 | 1; length: number; fruit: Fruit; age: number }[]
  /** The served customer on its way out with its tin, as the one who was called steps up: who it is, how it moves, and the pieces it ate. */
  departing: { customer: Customer; actor: Actor; lengths: number[]; fruits: Fruit[]; sides: number[] } | null
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
  /** What the last move did, in order: for whoever wants to follow the game without drawing it. */
  happened: readonly GameEvent[] = []
  private stroke: Stroke | null = null
  /** The length the last cut of this stroke sounded at, or nothing before its first cut. */
  private rung: number | null = null
  private last: Point | null = null
  /** Where a finger that came back just after a lift has landed, until it moves away from there: lifted where it landed, it was a tap. */
  private landed: Point | null = null
  private held: { held: Held; at: Point; trail: { at: Point; t: number }[] } | null = null
  private roller: Point | null = null
  private sounds: Sound[] = []
  private coming: { wait: number; reaction: Reaction; amount: number }[] = []
  private hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private scene: Scene | null = null
  private show: Show | null = null
  private ending: Ending | null = null
  private leaving: { customer: Customer; whom: Whom; fruit: Fruit } | null = null
  private skipping = false
  private leavingActor: Actor | null = null
  private departing: { customer: Customer; actor: Actor; lengths: number[]; fruits: Fruit[]; sides: number[] } | null = null
  private snacks: { whom: 0 | 1; length: number; fruit: Fruit; age: number }[] = []
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
    this.landed = null
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
    this.rung = null
    this.sounds.push({ id: 'ring', delay: 0 })
  }

  /** The finger moves: a piece or the roller goes with it; the blade's hairline goes with it and whatever the step crosses is cut. */
  move(at: Point, t = 0): void {
    // A finger that came back and has stayed where it landed has not moved: nothing goes with it yet.
    if (this.landed) {
      if (Math.hypot(at.x - this.landed.x, at.y - this.landed.y) <= LANDED_SLOP) return
      this.landed = null
    }
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
    // A finger that comes back just after a lift arrives as a move with no press. It is a finger that has landed: on a piece it takes
    // hold of the piece, on the roller of the roller, and anywhere else it is the blade with its ring. Nothing is cut along the jump.
    // Lifted again where it landed, it was a tap, and pokes what is under it as any tap does.
    if (!this.stroke || !this.last) {
      this.press(at, t)
      this.landed = at
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
    if (this.landed) {
      this.tap(this.landed)
      return
    }
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
      // Let go over a thing, the piece is given to that thing, however fast the hand was going: a child who hurries to the
      // tin has still reached the tin. Only a piece let go at speed over bare wood or the wall is thrown.
      const over = thingAt(this.game, at, held.ids).thing
      const bare = over === 'board' || over === 'shelf' || over === 'counter' || over === 'wall' || over === 'nothing'
      const result = bare && held.ids.length === 1 && Math.hypot(v.x, v.y) >= FLING_SPEED ? fling(this.game, held, at, v) : drop(this.game, held, at)
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
    this.rung = null
    this.last = null
    this.landed = null
    this.held = null
    this.roller = null
  }

  /** Plays `dt` seconds of everything that moves. The game itself does not change with time. */
  step(dt: number): void {
    this.clock += dt
    this.scene?.update(this.clock)
    if (this.scene && !this.scene.running) this.sceneOver()
    this.fx = step(this.fx, dt)
    // Juice that came down where somebody's face is: it licks it off, in its own way, unless it is busy with something else.
    for (const hit of this.fx.hits) {
      for (const whom of ['window', 0, 1] as const) {
        const actor = this.actorOf(whom), head = this.headAt(this.game, whom)
        if (actor && head && !actor.react && Math.hypot(hit.x - head.x, hit.y - head.y) < 54) this.reactAs(whom, 'lick')
      }
    }
    this.dog = stepDog(this.dog, dt)
    if (this.window) this.window = stepActor(this.window, dt)
    this.queue = [stepActor(this.queue[0], dt), stepActor(this.queue[1], dt)]
    if (this.departing) {
      // It is shown for as long as its own way of leaving takes, a second at most, and then it is gone.
      const actor = stepActor(this.departing.actor, dt)
      this.departing = actor.react === 'leave' ? { ...this.departing, actor } : null
    }
    this.snacks = this.snacks.map((one) => ({ ...one, age: one.age + dt })).filter((one) => one.age < SNACK_SECONDS)
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
    // A curl of peel that has come down on its head: it looks up at it, cross as that makes it.
    const hat = this.fx.fx.some((one) => one.kind === 'curl' && one.age >= CURL_FLIGHT)
    const look = hat ? { x: 0, y: -1 } : finger ? { x: (finger.x - MOUTH.x) / 420, y: (finger.y - MOUTH.y) / 260 } : null
    const carried = this.held ? { ids: this.held.held.ids, dx: this.held.at.x - this.held.held.dx - this.held.held.boxes[0].x, dy: this.held.at.y - this.held.held.dy - this.held.held.boxes[0].y } : null
    // With no scene playing, a served customer is in the last pose of its serve: that is what a load finds.
    const show = this.show ?? (this.game.window && this.game.finished ? servedShow(eaten(this.game.world).length) : null)
    return { game: this.game, fx: this.fx, dog: dogPose(this.dog, look), window: this.window, queue: this.queue, leavingActor: this.leavingActor, departing: this.departing, snacks: this.snacks, time, blade: this.blade, finger: finger ?? null, carried, roller: this.roller, show, ending: this.ending, leaving: this.leaving, glow: idle ? guidance.glow : 0, guide, hand }
  }

  /** A customer's pose, for the view: the one at the window or one who waits, and which of its bodies. */
  static pose = castPose

  private passedAnEnd(fromX: number, toX: number): boolean {
    const low = Math.min(fromX, toX), high = Math.max(fromX, toX)
    return shown(this.game.world, tinAt(this.game)).some(({ box }) => (box.x > low && box.x <= high) || (box.x + box.w > low && box.x + box.w <= high))
  }

  /** Where a customer's face is on the stage, or nothing when nobody is in that seat. */
  private headAt(game: Game, whom: Whom): Point | null {
    const customer = whom === 'window' ? game.window : game.queue[whom]
    return customer ? headOf(customer, whom) : null
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

  /**
   * Something absurd has happened to somebody: everyone else stares, each in its own way, and then goes back
   * to what it was doing.
   */
  private stare(except: Whom | null): void {
    for (const whom of ['window', 0, 1] as const) {
      const actor = this.actorOf(whom)
      // One that is rolled flat, on its way in or on its way out stays as it is; anyone else drops what it was doing and stares.
      if (whom === except || !actor || actor.react === 'flat' || actor.react === 'step' || actor.then === 'step') continue
      // One in the middle of its own flinch or snip finishes it first, and stares after.
      const first = actor.react === 'flinch' || actor.react === 'snip' ? Math.max(0, SHEETS[actor.who].react[actor.react] - actor.reactAge) : 0
      if (whom === 'window') this.window = reactAfter(actor, 'gawp')
      else this.queue[whom] = reactAfter(actor, 'gawp')
      const head = this.headAt(this.game, whom)
      if (head) this.fx = mark(this.fx, 'shock', { x: head.x, y: head.y - 10 }, first + (actor.who === 'pelican' ? 0.5 : actor.who === 'cat' ? 0.75 : actor.who === 'boa' ? 0.6 : 0.05))
    }
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
    this.leavingActor = null
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
    this.happened = events
    const cue = (id: VoiceId, length?: number, count?: number): void => {
      if (!this.skipping) this.sounds.push({ id, length, count, delay: 0 })
    }
    let cuts = 0
    let showing: string | null = null
    const heads = { window: this.headAt(before, 'window') ?? undefined, 0: this.headAt(before, 0) ?? undefined, 1: this.headAt(before, 1) ?? undefined }
    for (const event of events) {
      this.fx = spawn(this.fx, event, heads)
      if ('voice' in event) {
        // A customer under the roller honks as it springs back into shape, which each does in its own time, not as it goes flat.
        const rolledFlat = event.kind === 'rolled' && event.on === 'customer' && event.whom !== null ? (event.whom === 'window' ? before.window : before.queue[event.whom]) : null
        // A piece the crate chews is heard going down the dog only once the crate has let go of it; and a lid clangs as it strikes, not before.
        // A fruit out of the crate thumps as it comes down on its lane.
        const late = event.kind === 'fell' ? event.after ?? 0 : event.kind === 'misfit' && event.how === 'over' ? LID_STRIKES : event.kind === 'land' ? LANDS_AFTER : 0
        const delay = event.kind === 'cut' || event.kind === 'curl' ? cuts++ * RUN_GAP : rolledFlat ? SHEETS[rolledFlat.who].react.flat * SPRINGS_BACK[rolledFlat.who] : late
        let length = 'length' in event ? event.length : 'piece' in event ? event.piece.length : undefined
        if (event.kind === 'cut') length = this.rung = this.rung === null ? event.length : Math.min(event.length, this.rung * RUN_STEP)
        // A customer's own noise is in its own throat: its place in the cast goes with the voice.
        const noisy = event.kind === 'flinch' || event.kind === 'ate' ? (event.whom === 'window' ? before.window : before.queue[event.whom]) : null
        const count = event.kind === 'pressed' || event.kind === 'rolled' ? event.parts : noisy ? CAST.indexOf(noisy.who) : undefined
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
          // The peel comes down on the dog's head and sits there a moment; then the dog turns its full circle and has it.
          this.coming.push({ wait: CURL_LIFE, reaction: 'spin', amount: 0 })
          break
        case 'misfit': {
          // A lid that will not shut on its order: the customer sweats.
          const head = heads.window
          if (head) this.fx = mark(this.fx, 'sweat', head, 0.1)
          break
        }
        case 'fell': {
          const taste = dogTaste(event.piece.length, event.piece.fruit)
          // A flung piece is caught in the air, with a flip that is bigger the longer the piece; anything else is eaten as it arrives.
          if (event.voice === 'catch') this.coming.push({ wait: 0.14, reaction: 'flip', amount: taste.cheeks })
          else this.coming.push({ wait: 0.36 + (event.after ?? 0), reaction: taste.act === 'spin' ? 'spin' : taste.act === 'snap' ? 'gulp' : 'cheeks', amount: taste.cheeks })
          break
        }
        case 'pressed': {
          // The roller runs the length of what it marks, as its ticks sound.
          const box = shown(game.world, tinAt(game)).find(({ piece }) => piece.id === event.id)?.box
          if (box) this.fx = rollAlong(this.fx, box.x, box.x + box.w, box.y + box.h / 2, Math.min(0.6, 0.15 + event.parts * 0.05))
          break
        }
        case 'rolled': {
          // And it is seen rolling over whatever else it was let go on: along the rail of an open tin as the parts answer, along the lid of a
          // shut one, across a customer, the crate or the dog.
          const tin = tinAt(game), head = event.whom !== null ? heads[event.whom] : undefined
          if (event.on === 'tin' && tin) this.fx = tin.open ? rollAlong(this.fx, tin.ruler.x, tin.ruler.x + tin.ruler.w, TIN.rulerY - 6, Math.min(0.9, 0.2 + event.parts * 0.09)) : rollAlong(this.fx, tin.body.x, tin.body.x + tin.body.w, tin.body.y + tin.body.h / 2, 0.3)
          else if (event.on === 'customer' && head) this.fx = rollAlong(this.fx, head.x - 70, head.x + 70, head.y + 30, 0.3)
          else if (event.on === 'crate') this.fx = rollAlong(this.fx, CRATE.x + 20, CRATE.x + CRATE.w - 20, CRATE.y + CRATE.h / 2, 0.3)
          else if (event.on === 'dog') this.fx = rollAlong(this.fx, DOG.x + 20, DOG.x + DOG.w - 20, DOG.y + 30, 0.3)
          else this.fx = rollAlong(this.fx, event.x - 40, event.x + 40, event.y, 0.25)
          if (event.on === 'dog') this.dog = react(this.dog, 'ironed')
          if (event.on === 'customer' && event.whom !== null) {
            this.reactAs(event.whom, 'flat')
            // As it springs back into shape: a start.
            const head = heads[event.whom]
            if (head) this.fx = mark(this.fx, 'shock', head, 0.6, 1.3)
          }
          // A customer or the dog under the roller is a thing to stare at.
          if (event.on === 'customer' || event.on === 'dog') this.stare(event.whom)
          break
        }
        case 'spill':
          this.stare(null)
          break
        case 'flinch': {
          this.reactAs(event.whom, 'flinch')
          const head = heads[event.whom]
          if (head) this.fx = mark(this.fx, 'star', { x: head.x - 26, y: head.y - 22 })
          break
        }
        case 'snip': {
          this.reactAs(event.whom, 'snip')
          const head = heads[event.whom]
          if (head) this.fx = mark(this.fx, 'sweat', head)
          this.stare(event.whom)
          break
        }
        case 'splat':
          this.reactAs(event.whom, 'lick')
          this.stare(event.whom)
          break
        case 'ate':
          this.reactAs(event.whom, 'gulp')
          // What one who waits was given shows in its body, exactly as it went in, for a few seconds: it is in no state.
          if (event.whom !== 'window') this.snacks = [...this.snacks.filter((one) => one.whom !== event.whom).slice(-5), ...this.snacks.filter((one) => one.whom === event.whom).slice(-5), { whom: event.whom, length: event.piece.length, fruit: event.piece.fruit, age: 0 }]
          break
        case 'called': {
          // The one who was called steps up; whoever now stands in its place in the queue has just arrived there.
          const called = this.queue[event.index]
          // Whoever stood in that place in the queue has left it, and what it had been given with it.
          this.snacks = this.snacks.filter((one) => one.whom !== event.index)
          // The served one leaves as the called one steps up. It left the game on the touch: this only shows it going, and no touch waits for it.
          this.departing = event.did === 'stepped' && before.window && before.finished && this.window ? { customer: before.window, actor: reactTo(this.window, 'leave'), lengths: eaten(before.world).map((piece) => piece.length), fruits: eaten(before.world).map((piece) => piece.fruit), sides: eaten(before.world).map((piece) => (piece.place.on === 'eaten' ? piece.place.part : 0)) } : null
          // A pelican that swallowed its order in more than one piece hiccups all the way out, and is heard doing it.
          if (this.departing && this.departing.customer.who === 'pelican') {
            // One for every seam, each at the top of its own hop on the way out.
            const seams = this.departing.lengths.length - 1
            for (let k = 0; k < seams; k++) this.sounds.push({ id: 'hiccup', delay: SHEETS.pelican.react.leave * hiccupAt(k, seams) })
          }
          this.queue[event.index] = event.did === 'swapped' && this.window ? reactTo(this.window, 'step') : reactTo(newActor(game.queue[event.index].who, ++this.seed + 10), 'step')
          // One that was poked to call it flinches first, in its own way, and steps up as the flinch ends: the step is heard then.
          this.window = reactAfter(called, 'step')
          this.sounds.push({ id: 'step', delay: this.window.then === 'step' ? SHEETS[called.who].react.flinch - called.reactAge : 0 })
          this.urgent = true
          break
        }
        case 'gliderAway': {
          // The glider all the same: the pelican that waited glides out from its place, and the one who joins steps in after it.
          const show = restShow('glider')
          const gone = this.queue[event.whom]
          this.start(gliderBeats(show, cue), show, null)
          this.leaving = { customer: before.queue[event.whom], whom: event.whom, fruit: event.fruit }
          this.leavingActor = gone
          this.queue[event.whom] = reactTo(newActor(game.queue[event.whom].who, ++this.seed + 10), 'step')
          this.snacks = this.snacks.filter((one) => one.whom !== event.whom)
          this.stare(event.whom)
          break
        }
        case 'given':
          showing = event.firstShowing ?? showing
          break
        case 'ending': {
          const customer = before.window ?? game.window
          if (!customer) break
          if (event.ending.glider) {
            // The pelican has already left the game; it is kept here only for as long as its leaving is shown.
            const show = restShow('glider')
            // The fruit it leaves with is the one it was fed, whatever was on its ticket.
            const fed = event.ending.result.parts.flatMap((part) => part.pieces)[0] ?? event.ending.result.strays[0]
            // A serve that was playing for it (a piece fed just before the fruit, in one row) ends first; the pelican and how it moves are kept
            // past that ending, since the glider is its scene too.
            const actor = this.window
            this.start(gliderBeats(show, cue), show, event.ending)
            this.window = actor
            this.leaving = { customer, whom: 'window', fruit: fed?.fruit ?? customer.fruit }
            this.stare('window')
          } else {
            const show = restShow('serve')
            const serve = serveBeats(show, event.ending, cue)
            this.start(showing ? followedBy(showingBeats(show, customer, cue), serve) : serve, show, event.ending)
            // Sent off with a tin that will not shut: the two who wait have seen it.
            if (event.ending.outcome === 'badly') this.stare('window')
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
