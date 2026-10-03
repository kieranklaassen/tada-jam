import { letIn } from './cycle'
import { Hair } from './hair'
import { Hand, type Happening, type Held } from './hand'
import type { Gesture } from './input'
import { LOCK_X } from './layout'
import { LION as LION_PAINT } from './paintAnimals'
import { LION } from './personality'
import type { Point } from './poses'
import { Puppet } from './puppet'
import { makeRng } from './rng'
import { TUFTS } from './rules'
import { deserializeGame, serializeGame, type Game } from './save'
import { MOST_NOTES, notesFor, type Note } from './sound'
import type { Salon } from './world'

// The toy: one customer under the cape, his lock, his mane and his face, and
// the pieces that fall. It joins the finger (hand.ts) to the model
// (world.ts), and tells the puppet, the hair and the sound what happened.
// There is no goal: the friend, the model, the ribbon, the cape coming off
// and the door belong to the game stage and are not wired here. No canvas and
// no Web Audio in this file: the Mount draws it and plays its notes.

export class Toy {
  /** The saved salon, or nothing until the slot has been read. */
  game: Game | null = null
  readonly hand = new Hand()
  readonly hair: Hair
  readonly puppet: Puppet
  /** Seconds of play. */
  time = 0
  private notes: Note[] = []
  private pressedAt: Point | null = null
  /** The game changed since this was last taken: something to hand to storage. */
  private dirty = false

  constructor(seed: number) {
    this.hair = new Hair(TUFTS, makeRng(seed))
    this.puppet = new Puppet(LION, makeRng(seed + 7))
  }

  /**
   * Sets the toy up from the slot, as it was left. On a first visit the chair
   * is empty and the first pair waits at the door; the coming-in scene belongs
   * to the game stage, so the toy seats the first customer at once, without a
   * scene, in the state that scene would end in.
   */
  open(raw: unknown, childAge: number | null): void {
    const game = deserializeGame(raw, childAge)
    this.game = game.chair === null ? letIn(game).game : game
    // The toy has no cape to pull off: a salon left with the cape off opens with it on.
    if (this.game.cape !== 'on') this.game = { ...this.game, cape: 'on' }
  }

  /** What goes to storage, or nothing before the slot has been read. */
  save(): Game | null {
    return this.game ? serializeGame(this.game) : null
  }

  /** Whether the game changed since the last call. */
  takeDirty(): boolean {
    const dirty = this.dirty
    this.dirty = false
    return dirty
  }

  /** The notes to play now, a few at most, or nothing. */
  takeNotes(): Note[] {
    const notes = this.notes.slice(0, MOST_NOTES)
    this.notes = []
    return notes
  }

  /** One gesture of the finger, with its points already in scene units. */
  gesture(gesture: Gesture): void {
    const game = this.game
    if (!game) return
    const hand = this.hand
    switch (gesture.type) {
      case 'press': this.pressedAt = gesture.at; this.took(game, hand.press(game, gesture.at, this.time)); return
      case 'tap': this.took(game, hand.tap(game, gesture.at)); return
      case 'dragMove': {
        this.follow(gesture.at)
        this.took(game, hand.move(game, gesture.at, this.time))
        return
      }
      case 'pressEnd':
      case 'dragEnd': this.took(game, hand.end(game, gesture.at)); return
      // A lifted finger mid-drag: the thing waits where it is. A drag has begun: its first move follows.
      case 'dragLift':
      case 'dragStart': return
    }
  }

  /** Plays `dt` seconds. `idle` says no finger is working. */
  step(dt: number, idle: boolean): void {
    this.time += dt
    if (!this.game) return
    this.puppet.step(dt, idle)
    this.hair.step(dt, this.game)
  }

  /** The finger moved with something in it. */
  private follow(at: Point): void {
    const held = this.hand.held
    if (held === 'scissors') { this.hair.scissorsMove(at); return }
    this.hair.follow(at)
    if (!held || this.hand.ruffling) return
    if (held.object === 'face' && this.pressedAt) this.puppet.cheekHeld({ x: at.x - this.pressedAt.x, y: at.y - this.pressedAt.y })
    if (held.object === 'lock' || held.object === 'tuft') this.puppet.pulledTowards(this.hair.pull)
  }

  private took(before: Game, step: { salon: Salon; happenings: Happening[] }): void {
    const after: Game = step.salon === before ? before : { ...before, ...step.salon }
    if (after !== before) { this.game = after; this.dirty = true }
    for (const happening of step.happenings) {
      this.notes.push(...notesFor(happening, before, after))
      this.happened(happening, before, after)
    }
  }

  /** Tells the puppet and the hair what happened, so they can act it out. */
  private happened(h: Happening, before: Game, after: Game): void {
    const { hair, puppet } = this
    switch (h.kind) {
      case 'scissors': hair.scissorsIn(h.at); return
      case 'airSnip': hair.scissorsClose(); return
      case 'away': hair.scissorsOut(); return
      case 'caught': this.caught(h.held, h.at, before); return
      case 'letGo':
        hair.letGo()
        hair.carried = null
        puppet.pulledTowards(null)
        puppet.cheekHeld(null)
        return
      case 'cell': break
    }
    const added = after.clippings.filter((piece) => !before.clippings.includes(piece))
    switch (h.cell.voice) {
      case 'lock/pull': if (!puppet.busy) puppet.react('pulled'); return
      case 'lock/snip':
        hair.lockSnipped()
        hair.scissorsClose()
        for (const piece of added) hair.fly(piece, h.at)
        puppet.react('snipped')
        return
      case 'lock/poke': hair.lockPlucked(h.at.x - LOCK_X); puppet.react('plucked'); return
      case 'lock/ruffle': hair.lockRuffled(); puppet.react('fluttered'); return
      case 'tuft/pull': if (!puppet.busy) puppet.react('maneTugged'); return
      case 'tuft/snip':
        if (h.held?.object === 'tuft') hair.tuftSnipped(h.held.index, h.at, LION_PAINT.mane)
        hair.scissorsClose()
        if (!puppet.busy) puppet.react('snipped')
        return
      case 'tuft/poke': if (h.held?.object === 'tuft') hair.tuftPoked(h.held.index); puppet.react('manePoked'); return
      case 'tuft/ruffle': hair.maneFrizzed(); puppet.react('frizzed'); return
      case 'face/pull': puppet.cheekHeld(null); puppet.react('cheekPulled'); return
      case 'face/snip': hair.scissorsClose(); puppet.react('airSnipped'); return
      case 'face/poke': puppet.react(`${h.held?.object === 'face' ? h.held.part : 'cheek'}Tickled`); return
      case 'face/ruffle': puppet.cheekHeld(null); puppet.react('rubbed'); return
      case 'clipping/pull':
        hair.carried = null
        for (const piece of added) if (piece.on === 'floor') hair.fly(piece, h.at)
        if (h.place?.on === 'face') puppet.react('wearing')
        return
      case 'clipping/snip':
        hair.scissorsClose()
        for (const piece of added) hair.fly(piece, h.at, 260)
        // A piece too small to cut turned to fluff.
        if (added.length === 0) hair.fluff(h.at, LION_PAINT.mane, 4)
        return
      case 'clipping/poke': hair.carried = null; for (const piece of added) hair.fly(piece, { x: h.at.x, y: h.at.y - 6 }, 420); return
      case 'clipping/ruffle': hair.carried = null; hair.rollAway(h.at, LION_PAINT.mane); return
      default: return
    }
  }

  private caught(held: Held, at: Point, game: Game): void {
    const { hair, puppet } = this
    if (held.object === 'lock') { hair.catchLock(at); puppet.react('caught'); return }
    if (held.object === 'tuft') { hair.catchTuft(held.index, at); puppet.react('caught'); return }
    if (held.object === 'clipping') {
      const piece = game.clippings[held.index]
      if (piece) hair.carried = { piece, at }
      if (!puppet.busy) puppet.react('floorWatched')
      return
    }
    // A face that is touched looks to see who it is.
    puppet.react('caught')
  }
}
