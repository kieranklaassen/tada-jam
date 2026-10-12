import type { Note } from './audio'
import { Game } from './game'
import { IdleLadder, type Guidance } from './guidance'
import { box, type Box } from './layout'
import { inCorner } from './overlay'
import type { Save } from './save'
import type { SoundEvent } from './sounds'
import { fit, toStage } from './stage'
import { voiceNotes } from './voices'

// The path every pointer takes from the surface to the game, with nothing in
// it that needs a browser: the Mount hands it pointers in the surface's own
// pixels and the seconds of each frame, and a test does the same. It turns a
// pointer into stage units, keeps the grown-up's corner out of the game,
// plays the game's clock, hands the game's sounds to a speaker, and runs the
// idle ladder on the game's own seconds, so there is one clock for what is
// seen, what is heard and what is shown to an idle child.

/** What makes the sound. A scene's sounds go through a gain of their own, which a touch closes. */
export type Speaker = {
  play(notes: readonly Note[], scene: boolean): void
  /** What a scene was sounding is silent from now. */
  hushScene(): void
  /** Everything is silent from now: the game is put away. */
  hushAll(): void
}

/** What the idle guidance points at: a box to mark, and one move, which is a straight carry, a tap, or a path the hand goes along. */
export type Aimed = { fromX: number; fromY: number; toX: number; toY: number; tap: boolean; glow: Box; path: number[] | null }

export class Play {
  readonly game: Game
  readonly ladder: IdleLadder
  /** What the idle ladder shows now, and what it points at. */
  guidance: Guidance | null = null
  readonly aim: Aimed = { fromX: 0, fromY: 0, toX: 0, toY: 0, tap: false, glow: box(0, 0, 0, 0), path: null }
  /** The surface's size in its own pixels. */
  width = 0
  height = 0
  /** Every sound event the game has made, for a test to read: the Mount leaves it off. */
  heard: SoundEvent[] | null = null

  /** `keep` hands the state to storage: at once when `urgent`, at the throttle otherwise. */
  constructor(save: Save, seed: number, private readonly speaker: Speaker, keep: (urgent: boolean) => void) {
    this.game = new Game(save, seed)
    this.game.onSave = keep
    this.ladder = new IdleLadder(this.game.time)
  }

  size(width: number, height: number): void {
    this.width = width; this.height = height
  }

  /** What the game made a sound for since the last call, as one voice. */
  private sing(): void {
    const events = this.game.takeEvents()
    if (events.length === 0) return
    if (this.heard) for (const event of events) this.heard.push(event)
    this.speaker.play(voiceNotes(events), this.game.sceneRunning)
  }

  /**
   * A finger lands, at a point of the surface. The grown-up's corner answers nothing and leaves the idle ladder
   * where it is. False when the game did not take the finger on.
   */
  down(id: number, x: number, y: number): boolean {
    if (this.width <= 0 || this.height <= 0 || inCorner(x, y, this.width)) return false
    this.ladder.touch(this.game.time)
    const at = toStage({ x, y }, fit(this.width, this.height))
    // A touch ends a scene where it is, and what the scene was sounding stops in the same frame.
    const scene = this.game.sceneRunning
    const taken = this.game.down(id, at.x, at.y)
    if (scene) this.speaker.hushScene()
    this.sing()
    return taken
  }

  move(id: number, x: number, y: number): void {
    if (this.width <= 0 || this.height <= 0) return
    const at = toStage({ x, y }, fit(this.width, this.height))
    this.game.move(id, at.x, at.y)
    this.sing()
  }

  up(id: number, x: number, y: number): void {
    if (this.width <= 0 || this.height <= 0) return
    const at = toStage({ x, y }, fit(this.width, this.height))
    this.game.up(id, at.x, at.y)
    this.sing()
  }

  /** The browser took the finger away. It makes no move and no sound for the child. */
  cancel(id: number): void {
    this.game.cancel(id)
    this.sing()
  }

  /** Plays `seconds` of the game, and updates what an idle child is shown. */
  frame(seconds: number): void {
    const game = this.game
    game.step(seconds)
    this.sing()
    // A finger that is working is not idle, and neither is a scene. What a creature does by itself is: it never takes the ladder back.
    if (game.working || game.sceneRunning) this.ladder.touch(game.time)
    this.guidance = this.ladder.update(game.time)
    game.aim(this.aim, this.guidance.demoIndex)
  }

  /**
   * The game is put away. Fingers are taken away, a scene lands where its start saved it, all sound closes, and
   * the idle ladder is taken back, so the game that is opened again is the game a load would give.
   */
  rest(): void {
    this.game.park()
    this.game.takeEvents()
    this.speaker.hushAll()
    this.ladder.touch(this.game.time)
    this.guidance = this.ladder.update(this.game.time)
    this.game.aim(this.aim, this.guidance.demoIndex)
  }
}
