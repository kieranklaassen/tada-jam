import { backUnderCape, capeOff, ideasDue, letIn, markShown, sendFriend } from './cycle'
import { Hair, type StrandId } from './hair'
import { Hand, type Happening, type Held } from './hand'
import type { Gesture } from './input'
import { PERSONALITIES, type Reaction } from './personality'
import { placesOf, stripOf, tuftRoot, type Button, type Point } from './poses'
import { Puppet } from './puppet'
import { makeRng } from './rng'
import { TUFTS } from './rules'
import { deserializeGame, serializeGame, type Game } from './save'
import { Scene, followedBy, sceneLength, type Beat } from './scene'
import { capeComesOff, comingIn, shownOnce, type Cast, type Cue } from './scenes'
import { MOST_NOTES, notesFor, notesForCue, type Note } from './sound'
import { Staging, lowFor, walk } from './staging'
import { TASTES, type CustomerId } from './tastes'
import type { Salon, Who } from './world'

// The game on the toy: the finger (hand.ts) joined to the model (world.ts)
// and to the cycle (cycle.ts), with the short scenes in between. It tells the
// puppets, the hair and the sound what happened, and keeps the game that goes
// to storage. A scene's outcome is in the game, and marked to be saved at
// once, before its first beat plays; a touch ends a scene and is then an
// ordinary touch. No canvas and no Web Audio in this file: the Mount draws
// it and plays its notes.

/** The colour of each customer's hair, for the fluff and pieces that fly: by name, since the view owns the colours. */
export type Save = 'now' | 'soon'

export class Play implements Cast {
  /** The saved salon, or nothing until the slot has been read. */
  game: Game | null = null
  readonly hand = new Hand()
  readonly hair: Hair
  readonly staging = new Staging()
  /** Seconds of play. */
  time = 0
  /** A touch is ending a scene: its beats land without starting anything. */
  cut = false
  private readonly seed: number
  private made = 0
  private puppets: { chair: Puppet | null; friend: Puppet | null } = { chair: null, friend: null }
  /** The next pair, behind the door's window, and the pair on its way out. */
  waiting: [Puppet, Puppet] | null = null
  leaving: Puppet[] = []
  private scene: Scene | null = null
  private notes: Note[] = []
  private pressedAt: Point | null = null
  private save: Save | null = null
  /** The thing that moves the game on which is under the finger now, for the view to show it give. */
  pressed: Button | null = null

  constructor(seed: number) {
    this.seed = seed
    this.hair = new Hair(TUFTS, makeRng(seed))
  }

  customer(): Puppet | null { return this.puppets.chair }
  friend(): Puppet | null { return this.puppets.friend }

  private puppet(who: CustomerId): Puppet {
    return new Puppet(PERSONALITIES[who], makeRng(this.seed + 7 + 13 * ++this.made))
  }

  /** Sets everything up from the slot, as it was left: nobody on the way anywhere and no scene playing. */
  open(raw: unknown, childAge: number | null): void {
    const game = deserializeGame(raw, childAge)
    this.game = game
    this.scene = null
    this.cast(game)
    this.staging.settle(game)
    this.hair.settle()
  }

  /** Makes the puppets for whoever is in the salon and at the door. */
  private cast(game: Game): void {
    this.puppets = { chair: game.chair ? this.puppet(game.chair) : null, friend: game.friend ? this.puppet(game.friend) : null }
    this.waiting = [this.puppet(game.waiting[0]), this.puppet(game.waiting[1])]
    this.leaving = []
  }

  /** What goes to storage, or nothing before the slot has been read. */
  saved(): Game | null {
    return this.game ? serializeGame(this.game) : null
  }

  /** Whether the game changed since the last call, and how soon it must be saved: a scene's outcome at once, a small change at the throttle. */
  takeSave(): Save | null {
    const save = this.save
    this.save = null
    return save
  }

  /** The notes to play now, a few at most, or nothing. */
  takeNotes(): Note[] {
    const notes = this.notes.slice(0, MOST_NOTES)
    this.notes = []
    return notes
  }

  /** A scene is playing. */
  get inScene(): boolean {
    return this.scene?.running === true
  }

  cue(cue: Cue, who?: CustomerId): void {
    if (this.game) this.notes.push(...notesForCue(cue, who ?? null, this.game))
  }

  // --- Scenes ---------------------------------------------------------------

  /** Starts a scene whose outcome is already in the game: the game is marked to be saved at once. */
  private play(beats: Beat[]): void {
    if (beats.length === 0) { this.settle(); return }
    const length = sceneLength(beats)
    // Whatever the beats leave on the way, the scene ends with everything where the model has it.
    this.scene = new Scene([...beats, { at: length, lasts: 0, play: () => this.settle() }])
    this.scene.start(this.time, () => { this.save = 'now' })
    this.scene.update(this.time)
  }

  /** A touch: the scene that is playing ends now, with everything where it was going. */
  private endScene(): void {
    if (!this.scene?.running) return
    this.cut = true
    this.scene.finish()
    this.cut = false
    this.settle()
  }

  private settle(): void {
    if (!this.game) return
    this.staging.settle(this.game)
    this.leaving = []
    if (this.cut) {
      this.hair.settle()
      this.puppets.chair?.rest()
      this.puppets.friend?.rest()
    }
  }

  /** The showings that are due now, each marked as shown, as beats to follow whatever scene is starting. */
  private showings(): Beat[] {
    let beats: Beat[] = []
    for (const idea of this.game ? ideasDue(this.game) : []) {
      const before = this.game!
      const after = markShown(before, idea)
      this.game = after
      beats = followedBy(beats, shownOnce(this, idea, before, after))
    }
    return beats
  }

  /** One of the things that move the game on was touched. */
  private pressedOn(button: Button): void {
    const game = this.game
    if (!game) return
    if (button === 'door') {
      const done = letIn(game)
      if (!done.came) return
      // The pair that was done hand their puppets over to go out with; the pair that waited come in with theirs.
      this.leaving = [this.puppets.chair, this.puppets.friend].filter((p): p is Puppet => p !== null)
      this.puppets = { chair: this.waiting?.[0] ?? this.puppet(done.game.chair!), friend: this.waiting?.[1] ?? this.puppet(done.game.friend!) }
      this.waiting = [this.puppet(done.game.waiting[0]), this.puppet(done.game.waiting[1])]
      this.game = done.game
      this.hair.settle()
      const beats = comingIn(this, game, done.game)
      this.play(followedBy(beats, this.showings()))
      return
    }
    if (button === 'knot') {
      const done = capeOff(game)
      if (!done.showing || done.game === game) return
      this.game = done.game
      this.play(capeComesOff(this, game, done.game, done.showing))
      return
    }
    if (button === 'chair') {
      const back = backUnderCape(game)
      if (back === game) return
      this.game = back
      const from = this.staging.friend, to = placesOf(back).friend
      const gait = back.friend ? PERSONALITIES[back.friend].gait : { hop: 10, steps: 2 }
      this.cue('capeOn')
      this.play(followedBy([
        { at: 0, lasts: 0.45, play: (p) => { this.staging.cape = p } },
        { at: 0.1, lasts: 0.9, play: (p) => { if (from && to) this.staging.friend = from.x === to.x ? { ...to, lift: 0, seen: 1 } : walk(from, to, p, gait, 0.9, lowFor(from, to)) } },
      ], this.showings()))
      return
    }
    // The empty seat: the friend goes to it, at any moment and as often as the child likes.
    const seated = sendFriend(game, button === 'stool' ? 'beside' : 'across')
    if (seated === game) return
    this.game = seated
    const from = this.staging.friend, to = placesOf(seated).friend
    const gait = seated.friend ? PERSONALITIES[seated.friend].gait : { hop: 10, steps: 2 }
    this.play(followedBy([
      { at: 0, lasts: 1.0, play: (p) => { if (from && to) this.staging.friend = walk(from, to, p, gait, 1.0, lowFor(from, to)) } },
      { at: 1.0, lasts: 0, play: () => { if (!this.cut) { this.puppets.friend?.react('hopsOver'); this.cue('landed', seated.friend ?? undefined) } } },
    ], this.showings()))
  }

  // --- The finger -----------------------------------------------------------

  /** One gesture of the finger, with its points already in scene units. */
  gesture(gesture: Gesture): void {
    const game = this.game
    if (!game) return
    const hand = this.hand
    switch (gesture.type) {
      case 'press':
        // A touch ends a scene, and is then an ordinary touch.
        this.endScene()
        this.pressedAt = gesture.at
        this.took(this.game!, hand.press(this.game!, gesture.at, this.time), 0)
        return
      case 'tap':
        this.took(game, hand.tap(game, gesture.at), 0)
        // A poke holds nothing: the hair it touched is free to wobble.
        this.hair.release()
        return
      case 'dragMove':
        this.follow(gesture.at)
        this.took(game, hand.move(game, gesture.at, this.time), 0)
        return
      case 'pressEnd':
      case 'dragEnd': {
        const out = hand.drawnOut
        this.took(game, hand.end(game, gesture.at), out)
        return
      }
      // A lifted finger mid-drag: the thing waits where it is. A drag has begun: its first move follows.
      case 'dragLift':
      case 'dragStart': return
    }
  }

  /** Plays `dt` seconds. `idle` says no finger is working. */
  step(dt: number, idle: boolean): void {
    this.time += dt
    const game = this.game
    if (!game) return
    this.scene?.update(this.time)
    const calm = idle && !this.inScene
    this.puppets.chair?.step(dt, calm)
    this.puppets.friend?.step(dt, calm)
    for (const puppet of this.waiting ?? []) puppet.step(dt, true)
    for (const puppet of this.leaving) puppet.step(dt, false)
    this.hair.step(dt, this.game ?? game)
  }

  /** The finger moved with something in it. */
  private follow(at: Point): void {
    const held = this.hand.held
    if (held === 'scissors') { this.hair.scissorsMove(at); return }
    this.hair.follow(at)
    if (!held || this.hand.ruffling) return
    if (held.object === 'face' && this.pressedAt) this.of(held.who)?.cheekHeld({ x: at.x - this.pressedAt.x, y: at.y - this.pressedAt.y })
    if (held.object === 'lock' || held.object === 'tuft') this.puppets.chair?.pulledTowards(this.hair.pull)
    if (held.object === 'model') this.puppets.friend?.pulledTowards(this.hair.pull)
  }

  private of(who: Who): Puppet | null {
    return who === 'chair' ? this.puppets.chair : this.puppets.friend
  }

  private took(before: Game, step: { salon: Salon; happenings: Happening[] }, drawnOut: number): void {
    const after: Game = step.salon === before ? before : { ...before, ...step.salon }
    if (after !== before) { this.game = after; this.save = this.save ?? 'soon' }
    for (const happening of step.happenings) {
      this.notes.push(...notesFor(happening, before, after))
      this.happened(happening, before, after, drawnOut)
    }
  }

  /** Tells the puppets and the hair what happened, so they can act it out, and moves the game on where a button asks. */
  private happened(h: Happening, before: Game, after: Game, drawnOut: number): void {
    const { hair } = this
    const chair = this.puppets.chair, friend = this.puppets.friend
    switch (h.kind) {
      case 'scissors': hair.scissorsIn(h.at); return
      case 'airSnip': hair.scissorsClose(); return
      case 'away': hair.scissorsOut(); return
      case 'caught': this.caught(h.held, h.at, before); return
      case 'pressed':
        this.pressed = h.button
        // The door stays shut while a customer is under the cape: the pair behind it duck and peek.
        if (h.button === 'door' && before.chair !== null && before.cape === 'on') for (const puppet of this.waiting ?? []) puppet.react('ducksAndPeeks')
        return
      case 'button': this.pressed = null; this.pressedOn(h.button); return
      case 'letGo': {
        const strip = h.held.object === 'lock' || h.held.object === 'model' || h.held.object === 'ribbon' ? stripOf(after, h.held.object) : h.held.object === 'tuft' ? tuftRoot(after, h.held.index) : null
        hair.letGo(strip && strip.length > 0 ? drawnOut / strip.length : 0)
        hair.carried = null
        chair?.pulledTowards(null)
        friend?.pulledTowards(null)
        chair?.cheekHeld(null)
        friend?.cheekHeld(null)
        return
      }
      case 'cell': break
    }
    const added = after.clippings.filter((piece) => !before.clippings.includes(piece))
    const who: Who = h.held?.object === 'face' ? h.held.who : 'chair'
    const mine = this.of(who), taste = (w: Who) => { const id = w === 'chair' ? after.chair : after.friend; return id ? TASTES[id] : null }
    const react = (puppet: Puppet | null, name: Reaction, always = true): void => { if (puppet && (always || !puppet.busy)) puppet.react(name) }
    const strand = (h.object === 'lock' || h.object === 'model' || h.object === 'ribbon' ? h.object : null) as StrandId | null
    switch (h.cell.voice) {
      case 'lock/pull': react(chair, 'pulled', false); return
      // The model answers a pull once for each press, so its owner always does: its eyes cross as its lock is drawn out.
      case 'model/pull': react(friend, 'friendPulled'); return
      case 'ribbon/pull': return
      case 'lock/snip':
      case 'model/snip':
      case 'ribbon/snip':
        if (strand) hair.snipped(strand)
        hair.scissorsClose()
        for (const piece of added) hair.fly(after, piece, h.at)
        if (strand === 'lock') react(chair, 'snipped')
        if (strand === 'model') react(friend, 'friendSnipped')
        return
      case 'lock/poke': hair.plucked('lock', 1); react(chair, 'plucked'); return
      case 'model/poke': hair.plucked('model', -1); react(friend, 'friendPoked'); return
      case 'ribbon/poke': hair.plucked('ribbon', 1); return
      case 'lock/ruffle': hair.ruffled('lock'); react(chair, 'fluttered'); return
      case 'model/ruffle': hair.ruffled('model'); react(friend, 'friendRuffled'); return
      case 'ribbon/ruffle': hair.ruffled('ribbon'); return
      case 'tuft/pull': react(chair, 'maneTugged', false); return
      case 'tuft/snip':
        if (h.held?.object === 'tuft') hair.tuftSnipped(h.held.index, h.at, after.chair ?? 'lion')
        hair.scissorsClose()
        react(chair, 'snipped', false)
        return
      case 'tuft/poke': if (h.held?.object === 'tuft') hair.tuftPoked(h.held.index); react(chair, 'manePoked'); return
      case 'tuft/ruffle': hair.maneFrizzed(); react(chair, 'frizzed'); return
      case 'face/pull': mine?.cheekHeld(null); react(mine, 'cheekPulled'); return
      case 'face/snip': hair.scissorsClose(); react(mine, 'airSnipped'); return
      case 'face/poke': react(mine, `${h.held?.object === 'face' ? h.held.part : 'cheek'}Tickled`); return
      case 'face/ruffle': mine?.cheekHeld(null); react(mine, taste(who)?.rub === 'hates' ? 'rubHated' : 'rubLoved'); return
      // The ribbon was brought to something: it leaves the fingers and hangs there.
      case 'lock/ribbon': hair.carried = null; react(chair, 'wantsItSo', false); return
      case 'model/ribbon': hair.carried = null; react(friend, 'holdsBreath'); return
      case 'tuft/ribbon': hair.carried = null; react(chair, taste('chair')?.bow === 'hates' ? 'bowHated' : 'bowLoved'); return
      case 'face/ribbon': hair.carried = null; react(mine, 'blindfolded'); return
      case 'clipping/ribbon':
      case 'ribbon/ribbon': hair.carried = null; return
      case 'clipping/pull':
        hair.carried = null
        for (const piece of added) if (piece.on === 'floor') hair.fly(after, piece, h.at)
        if (h.place?.on === 'face') react(this.of(h.place.who), 'wearing')
        return
      case 'clipping/snip':
        hair.scissorsClose()
        for (const piece of added) hair.fly(after, piece, h.at, 260)
        // A piece too small to cut turned to fluff.
        if (added.length === 0) hair.fluff(h.at, 'fluff', 4)
        return
      case 'clipping/poke': hair.carried = null; for (const piece of added) hair.fly(after, piece, { x: h.at.x, y: h.at.y - 6 }, 420); return
      case 'clipping/ruffle': hair.carried = null; hair.rollAway(h.at, 'fluff'); return
    }
  }

  private caught(held: Held, at: Point, game: Game): void {
    const { hair } = this
    const chair = this.puppets.chair, friend = this.puppets.friend
    switch (held.object) {
      case 'lock':
      case 'model':
      case 'ribbon': {
        const strip = stripOf(game, held.object)
        if (strip) hair.catch(held.object, at, strip.root)
        if (held.object === 'lock') chair?.react('caught')
        if (held.object === 'model') friend?.react('caught')
        return
      }
      case 'tuft': {
        const root = tuftRoot(game, held.index)
        if (root) hair.catch(held.index, at, root.root)
        chair?.react('caught')
        return
      }
      case 'ribbonClip': hair.carried = { what: 'ribbon', at }; return
      case 'clipping': {
        const piece = game.clippings[held.index]
        if (piece) hair.carried = { what: piece, at }
        if (chair && !chair.busy) chair.react('floorWatched')
        return
      }
      // A face that is touched looks to see who it is.
      case 'face': this.of(held.who)?.react('caught'); return
    }
  }
}
