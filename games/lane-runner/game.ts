import type { Note } from './audio'
import { boxAt, lanePixels, shotFor, type Box, type Shot } from './camera'
import { IdleLadder } from './guidance'
import type { Gesture } from './input'
import { emptyHint, hintFor, type Hint, type Wants } from './guide'
import { gotOf, planFor } from './handover'
import { Lap } from './lap'
import { deserializeLap, type LapState } from './lapState'
import { inCorner } from './overlay'
import { Scene, type Beat } from './scene'
import { Stage, type Touch } from './stage'
import { Steer, reachFor, type Command } from './steer'
import { PLACES, offset, zoneAt } from './trail'
import { notesFor, stepNotes } from './voices'

// The whole game with no browser in it: the lap, everyone on the board, the
// hand-over scene, the idle ladder and what a finger does. The Mount hands
// it touches and frames and is told what to sound and what to save; it
// decides nothing itself. Everything a test needs to hold (one clock for
// sight and sound, found as left, parked equals loaded, the corner, a
// cancelled touch) is held here.

/** What the game tells the outside. */
export type Sink = {
  /** Sound these notes now: all of them are the sound of what happened in this frame or under this touch. */
  play(notes: readonly Note[]): void
  /** Everything that is sounding stops now. */
  hush(): void
  /** The saved state changed. `urgent` is saved at once, the rest at the throttle. */
  save(state: LapState, urgent: boolean): void
}

/** What a finger that is down is doing: running the fox, or nothing more (it took a load, began a lap, ended the scene), or resting in the grown-up's corner. */
type Finger = { does: 'runs' | 'spent' | 'corner'; steer: Steer }

/** The finger the touch reader calls the working one. Any other finger on the glass comes with its own pointer's number. */
export const FIRST = -1

export class Game {
  state: LapState
  readonly lap: Lap
  stage: Stage
  readonly hint: Hint = emptyHint()
  private scene: Scene | null = null
  private readonly ladder = new IdleLadder(0)
  /** Every finger that is down, by its pointer. The fox runs while any of them runs it, and each of them steers. */
  private readonly fingers = new Map<number, Finger>()
  private readonly commands: Command[] = []
  private readonly boxes: Box[] = []
  private readonly touches: Touch[] = []
  private clock = 0
  /** How many times the ghost hand has shown a move on the trail since the game was opened or put away, and whether it is showing one now. */
  private shown = 0
  private showing = false
  /** A slide made while something was carrying the fox: the lane it asked for, taken when the fox is let down if the same finger is still down. */
  private wish: -1 | 0 | 1 = 0
  private readonly age: () => number | null
  private readonly seed: number
  private loose: number
  private readonly sink: Sink

  /** `saved` is whatever storage held. `age` is asked each time it matters, and only ever sets a default. */
  constructor(saved: unknown, age: () => number | null, seed: number, loose: number, sink: Sink) {
    this.age = age
    this.seed = seed
    this.loose = loose
    this.sink = sink
    this.state = deserializeLap(saved, age())
    // Found as left: the fox stands where the save says, and nothing plays.
    this.lap = new Lap(this.state)
    this.stage = new Stage(this.lap, seed, loose)
    this.stage.update(0, 0, this.lap, this.hint)
  }

  /** A quality tier changed how many loose beads fly. */
  setLoose(loose: number): void {
    this.loose = loose
    this.stage.spray.limit = loose
  }

  get sceneRunning(): boolean {
    return this.scene !== null && this.scene.running
  }

  /** The shot for a surface, from where the fox is: what the view draws with and what a finger is read against. */
  shot(width: number, height: number, lean = this.lap.x): Shot {
    return shotFor(width, height, lean, offset(PLACES.shelf, this.lap.s))
  }

  /**
   * What a finger at this place on the surface lands on, or null: what is drawn there, and where nothing is, the
   * nearest thing whose box the finger is in or beside, since a finger is wide.
   */
  touchAt(x: number, y: number, width: number, height: number, shot: Shot): Touch | null {
    const drawn = this.stage.drawnAt(shot, width, height, x, y, this.lap.s)
    if (drawn) return drawn
    const boxes = this.boxes, touches = this.touches
    boxes.length = 0
    touches.length = 0
    for (const item of this.stage.items) {
      if (!item.touch) continue
      boxes.push(this.stage.boxOf(item, this.lap.s, boxes[boxes.length] ?? { minX: 0, maxX: 0, minY: 0, maxY: 0, z: 0 }))
      touches.push(item.touch)
    }
    const found = boxAt(shot, width, height, x, y, boxes)
    return found < 0 ? null : touches[found]
  }

  /** Whether any finger that is down is running the fox. */
  private get running(): boolean {
    for (const finger of this.fingers.values()) if (finger.does === 'runs') return true
    return false
  }

  /**
   * What the game does with a gesture of the working finger. A finger down is the fox running, or one thing done
   * at once (a load taken, the scene ended, the next lap begun); the last such finger gone is the fox stopped
   * dead, whichever way it went: lifted, taken away by the browser, or parked under. Nothing is done on a lift,
   * so there is nothing a cancelled touch could do in the child's place. Any other finger on the glass (a thumb
   * resting while the other hand flicks) is handed to `press`, `move` and `lift` with its own pointer's number.
   */
  gesture(gesture: Gesture, width: number, height: number, timeMs: number, shot?: Shot): void {
    switch (gesture.type) {
      case 'press':
        this.press(gesture.at.x, gesture.at.y, width, height, timeMs, shot)
        break
      case 'dragStart':
        break
      case 'dragMove':
        this.move(gesture.at.x, gesture.at.y, width, height, timeMs)
        break
      case 'tap':
      case 'pressEnd':
      case 'dragLift':
      case 'dragEnd':
      case 'dragCancel':
        this.lift()
        break
      default:
        // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
        gesture satisfies never
    }
  }

  /** A finger landed: `id` is its pointer. `timeMs` is the event's own time; `shot` is the one the last frame was drawn with. */
  press(x: number, y: number, width: number, height: number, timeMs: number, shot: Shot = this.shot(width, height), id = FIRST): void {
    const finger: Finger = { does: 'corner', steer: new Steer() }
    this.fingers.set(id, finger)
    // The grown-up's corner is not the child's: a press there answers nothing, and is not a touch to the idle ladder.
    if (inCorner(x, y, width)) return
    finger.does = 'spent'
    if (!this.running) this.wish = 0
    this.ladder.touch(this.clock)
    const lap = this.lap
    // A touch during the hand-over lands every beat at its end, in silence, and does nothing else. Every motion
    // of the scene ends on this frame with it, the ones that had seconds left to run too (the mother owl half
    // way to the branch, petals in the air): the stage is the one a load of the save would make, as at put-away.
    if (this.scene?.running) {
      this.scene.finish()
      this.sink.hush()
      this.stage = new Stage(lap, this.seed, this.loose)
      this.stage.update(0, this.clock, lap, this.hint)
      return
    }
    const touch = this.touchAt(x, y, width, height, shot)
    // The press after the hand-over is the next lap. On one of those who watch it also pokes it, as everywhere.
    if (lap.finished) {
      lap.begin()
      if (touch?.kind === 'who') lap.poke(touch.who)
      this.drain()
      return
    }
    // A press on a load on the shelf puts it in the fox's hands, at once, and the fox stays where it is.
    if (touch?.kind === 'load' && lap.canTake) {
      lap.take(touch.load)
      this.drain()
      return
    }
    // A finger on one of those who watch pokes it, and the fox runs all the same.
    if (touch?.kind === 'who') lap.poke(touch.who)
    const flying = lap.act?.kind === 'flight'
    finger.steer.press(x, y, timeMs)
    // The fox runs while any finger is down: a second one changes nothing about that, and steers.
    if (!this.running) lap.hold(true)
    // A touch lets the fox down where the owl's flight ends, at once and in silence.
    if (flying && !lap.act) this.sink.hush()
    finger.does = 'runs'
    this.drain()
  }

  /** A finger moved: a slide of a lane's worth, or a flick up or down, whichever finger makes it. */
  move(x: number, y: number, width: number, height: number, timeMs: number, id = FIRST): void {
    const finger = this.fingers.get(id)
    if (!finger || finger.does !== 'runs' || !this.lap.down) return
    finger.steer.move(x, y, timeMs, reachFor(width, height, lanePixels(width, height, offset(PLACES.shelf, this.lap.s))), this.commands)
    for (const command of this.commands) {
      // A slide while the fox is being carried (thrown back off the thorns, say) cannot change its lane yet. It is
      // kept for as long as this finger stays down and taken when the fox is let down, so the slide is not lost.
      if (command === 'left' || command === 'right') {
        const dir = command === 'left' ? -1 : 1
        if (this.lap.act) this.wish = dir
        else this.lap.shift(dir)
      } else if (command === 'jump') this.lap.jump()
      else this.lap.tuck()
    }
    this.drain()
  }

  /**
   * A finger is gone: lifted by the child, taken away by the browser, or parked under. Whichever it was, when it
   * was the last one running the fox the fox stops dead, and nothing else happens: there is nothing a lift does
   * that a cancel must not.
   */
  lift(id = FIRST): void {
    const finger = this.fingers.get(id)
    this.fingers.delete(id)
    if (!finger || finger.does !== 'runs' || this.running) return
    this.wish = 0
    this.lap.hold(false)
    this.drain()
  }

  /** One frame: `seconds` of play, at `clock` seconds of attended time. */
  frame(seconds: number, clock: number): void {
    this.clock = clock
    // A finger that is working is not idle. Nothing a character does by itself counts as a touch.
    for (const finger of this.fingers.values()) if (finger.does !== 'corner') this.ladder.touch(clock)
    const lap = this.lap
    lap.step(seconds)
    if (this.wish !== 0 && !lap.act) {
      lap.shift(this.wish)
      this.wish = 0
    }
    this.drain()
    this.scene?.update(clock)
    const resting = !lap.busy && !this.sceneRunning
    const wants: Wants = lap.finished ? 'next' : lap.load === 'none' && lap.canTake ? 'load' : 'run'
    // A load that lies under the branch or under the thorns is had back by a roll: the next showing is the roll.
    const lies = !lap.carrying && lap.lies !== null && lap.lies !== 'branch' ? zoneAt(lap.lies.at) : null
    const under = lies === 'branch' || lies === 'brambles'
    hintFor(this.ladder.update(clock), resting, wants, this.age(), this.hint, this.shown, under ? 'down' : null)
    // The next showing on the trail takes the next move.
    const showing = wants === 'run' && this.hint.hand !== null
    if (this.showing && !showing) this.shown += 1
    this.showing = showing
    this.stage.update(seconds, clock, lap, this.hint)
  }

  /**
   * Put away: the game settles into what a load of its save would find, at once and in silence. The scene lands
   * at its end, the fox stands, every motion is forgotten and the idle ladder is taken back to the bottom.
   */
  park(): void {
    this.fingers.clear()
    this.lap.settle()
    this.lap.events.length = 0
    this.lap.dirty = this.lap.urgent = false
    this.scene?.finish()
    this.scene = null
    this.sink.hush()
    this.state = this.lap.snapshot(this.state)
    this.sink.save(this.state, true)
    this.stage = new Stage(this.lap, this.seed, this.loose)
    this.ladder.touch(this.clock)
    this.shown = 0
    this.showing = false
    this.wish = 0
    hintFor(null, false, 'run', this.age(), this.hint)
    this.stage.update(0, this.clock, this.lap, this.hint)
  }

  /** Plays what the lap says happened, on the spot: every motion and every sound of this frame or this touch, and the save. */
  private drain(): void {
    const lap = this.lap, events = lap.events
    if (events.length > 0) {
      const notes: Note[] = []
      let arrived = false
      for (const event of events) {
        this.stage.on(event, lap)
        for (const note of notesFor(event)) notes.push(note)
        if (event.type === 'arrive') arrived = true
      }
      events.length = 0
      if (notes.length > 0) this.sink.play(notes)
      if (arrived) this.handOver()
    }
    if (lap.dirty) {
      this.state = lap.snapshot(this.state)
      this.sink.save(this.state, lap.urgent)
      lap.dirty = lap.urgent = false
    }
  }

  /** The hand-over begins. Its outcome is already in the lap, which the same frame saves at once: finished, at the spot. */
  private handOver(): void {
    const lap = this.lap
    const plan = planFor(gotOf({ load: lap.load, held: lap.carrying, lies: lap.lies, left: lap.left, marks: lap.marks, trail: lap.trail }))
    const beats: Beat[] = plan.steps.map((step) => ({
      at: step.at,
      lasts: 0,
      play: (_progress: number, finishing: boolean) => {
        // A touch is ending the scene: no motion is started and nothing sounds; the last beat puts everyone where the scene ends.
        if (finishing) return
        this.stage.step(step.who, step.step, lap)
        const notes = stepNotes(step.who, step.step, step.n)
        if (notes.length > 0) this.sink.play(notes)
      },
    }))
    beats.push({ at: plan.ends, lasts: 0, play: () => this.stage.settle(lap) })
    this.scene = new Scene(beats)
    this.scene.start(this.clock, () => {})
  }
}
