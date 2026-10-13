import type { Note } from './audio'
import { Cast } from './cast'
import type { Tier } from './config'
import { Effects } from './effects'
import { Game } from './game'
import { IdleLadder, type Guidance } from './guidance'
import type { Point } from './input'
import { toSave, worldOf, type Save } from './save'
import { notesFor } from './voices'
import type { World } from './world'

// One visit to the game, without a screen or a speaker: the rules in time
// (game.ts), everyone's motion (cast.ts), what a touch throws off
// (effects.ts) and the idle ladder, all on one clock. The Mount passes
// touches and frames in and takes out what to play, what to cut and what to
// save; the view draws what is here. Everything a touch or a step sets off
// is heard in the same call that shows it.

/** What the Mount does after a touch or a step. */
export type Out = {
  /** Everything that sounds now, as one voice. */
  notes: Note[]
  /** Whatever is still ringing from before stops first: a scene was ended by a touch, or the game was put to rest. */
  cut: boolean
  /** Whether a save is due: none, at the throttle, or at once. */
  save: 'no' | 'soon' | 'now'
}

export class Play {
  game: Game
  cast: Cast
  effects: Effects
  /** What an idle child is shown now. */
  guidance: Guidance
  /** Seconds of this visit that have been played. */
  time = 0
  private ladder: IdleLadder
  private notes: Note[] = []
  private cut = false
  private save: Out['save'] = 'no'
  /** Whether the finger that is down came down outside the grown-up's corner. */
  private mine = false

  /** `seed` is the visit's own, for the streams the cast and the effects draw from; `tier` is the quality tier in use. */
  constructor(world: World, private readonly seed: number, private tier: Tier) {
    this.game = new Game(world)
    this.cast = new Cast(seed, this.game)
    this.game.dwellerUnder = (at) => this.cast.under(at)
    this.effects = new Effects(seed)
    this.ladder = new IdleLadder(0)
    this.guidance = this.ladder.update(0)
  }

  setTier(tier: Tier): void {
    this.tier = tier
  }

  /** What a save holds now: the end of the scene that is playing, or the hill as it stands. */
  get keeps(): Save {
    return toSave(this.game.keeps)
  }

  /** The finger landed. A touch in the grown-up's corner is no touch of the child's: nothing answers it. */
  press(at: Point, inCorner: boolean): void {
    this.mine = !inCorner
    if (inCorner) return
    this.ladder.touch(this.time)
    // A touch ends the scene that is playing, and the scene is silent from this moment.
    if (this.game.sceneName !== null) this.cut = true
    this.game.press(at)
    this.flush()
  }

  /** The finger moved while down. A move that enters the grown-up's corner is none. */
  drag(at: Point, inCorner: boolean): void {
    if (inCorner) return
    this.ladder.touch(this.time)
    this.game.drag(at)
    this.flush()
  }

  /** The finger is up: a tap, a drop where it was let go, or a touch that was taken away. */
  release(how: 'tap' | 'drop' | 'cancel', at: Point | undefined, inCorner: boolean): void {
    this.mine = false
    this.game.release(how, at, inCorner)
    this.flush()
  }

  /** Plays `dt` seconds. `touching` says a finger is on the glass. */
  step(dt: number, touching: boolean): void {
    this.time += dt
    this.game.step(dt)
    this.flush()
    this.cast.step(dt, this.game)
    this.effects.step(dt)
    // A finger that is working is not idle, and neither is anything a touch set going: a scene, a walk, a fall.
    // A finger that came down in the grown-up's corner is not the child's, and keeps nothing waiting.
    if ((touching && this.mine) || this.game.busy) this.ladder.touch(this.time)
    this.guidance = this.ladder.update(this.time)
    this.cast.nudge(this.game, this.guidance.demo)
  }

  /** What the game has just done is heard and seen here: its events go to the cast and the effects, and to the voice. */
  private flush(): void {
    const events = this.game.drain()
    for (const event of events) {
      this.cast.feed(event, this.game)
      this.effects.feed(event, this.game, this.tier)
    }
    this.notes.push(...notesFor(events))
    const changed = this.game.changed()
    if (changed === 'now' || (changed === 'soon' && this.save === 'no')) this.save = changed
  }

  /** What to play, cut and save since the last call. */
  take(): Out {
    const out: Out = { notes: this.notes, cut: this.cut, save: this.save }
    this.notes = []
    this.cut = false
    this.save = 'no'
    return out
  }

  /**
   * The game is put to rest: parked, hidden or unattended. It stays mounted, so it is made here into exactly what
   * a load of its save would give: the hill as the save holds it, everyone at rest in place, no scene, no errand,
   * nothing in the air, the idle ladder at the bottom and the clock at nought. Whatever was sounding is cut.
   */
  park(): void {
    const world = worldOf(JSON.parse(JSON.stringify(this.keeps)), null, this.seed)
    this.game = new Game(world)
    this.cast = new Cast(this.seed, this.game)
    this.game.dwellerUnder = (at) => this.cast.under(at)
    this.effects = new Effects(this.seed)
    this.time = 0
    this.ladder = new IdleLadder(0)
    this.guidance = this.ladder.update(0)
    this.notes = []
    this.cut = true
    this.mine = false
  }
}
