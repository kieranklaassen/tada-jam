import { backUnderCape, capeOff, ideasDue, letIn, markShown, sendFriend, type Idea } from './cycle'
import { Hair, type StrandId } from './hair'
import { Hand, type Happening, type Held } from './hand'
import type { Gesture } from './input'
import { PERSONALITIES, type Reaction } from './personality'
import { bowOn, clippingBox, placesOf, stripOf, tuftRoot, whatIsAt, type Button, type Point } from './poses'
import { Puppet, ease, type Spring } from './puppet'
import { makeRng } from './rng'
import { TUFTS } from './rules'
import { deserializeGame, serializeGame, type Game } from './save'
import { Scene, sceneLength, type Beat } from './scene'
import { RIBBON_FIRST, capeComesOff, comingIn, shownOnce, tuftShown, type Cast, type Cue } from './scenes'
import { MOST_NOTES, notesFor, notesForCue, notesForSaying, type Note } from './sound'
import { RIBBON_HOME, Staging, lowFor, walk } from './staging'
import { TASTES, type CustomerId } from './tastes'
import { OTHER_VOICES, type Said } from './voices'
import type { Salon, Who } from './world'

// The game on the toy: the finger (hand.ts) joined to the model (world.ts)
// and to the cycle (cycle.ts), with the short scenes in between. It tells the
// puppets, the hair and the sound what happened, and keeps the game that goes
// to storage. A scene's outcome is in the game, and marked to be saved at
// once, before its first beat plays; a touch ends a scene and is then an
// ordinary touch. No canvas and no Web Audio in this file: the Mount draws
// it and plays its notes.

/** How soon a change has to be in storage: a scene's outcome now, a small change at the throttle. */
export type Save = 'now' | 'soon'

/** How far a piece on the floor is from a point, for telling the piece that was cut from one that was crowded out. */
const near = (salon: Salon, piece: Salon['clippings'][number], p: Point): number => { const box = clippingBox(salon, piece); return box ? Math.hypot(box.x - p.x, box.y - p.y) : Infinity }

/** A second tap this soon after the one that began a scene, and this near it, is taken as part of the same touch. */
const ECHO_S = 1, ECHO_REACH = 70
/** How long the finger is off the glass before a thing that waited behind a cut scene is shown. */
const SHOW_AFTER = 0.6
/** The most notes that wait their turn: a few frames' worth, so nothing is heard late. */
const MOST_WAITING = MOST_NOTES * 5

/** How often, in seconds, something stirs by itself while nobody is touching. */
const STIR_EVERY = 6

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
  /** The next pair, outside the door's glass, and the pair on its way out. */
  waiting: [Puppet, Puppet] | null = null
  leaving: Puppet[] = []
  private scene: Scene | null = null
  private notes: Note[] = []
  private said: Note[] = []
  private pressedAt: Point | null = null
  private untilStir = STIR_EVERY
  /** Where and when the press landed that began the scene now playing. */
  private began: { at: Point; time: number } | null = null
  private echo = false
  /** How far the face in the looking glass has swollen towards a finger that touched it: a spring that settles at nothing. */
  readonly glass: Spring = { x: 0, v: 0 }
  /** What is waiting to be shown once the scene that is playing has ended, and how long it waits after a scene that was cut short. */
  private owed: Idea[] = []
  private showIn = 0
  /** The finger has come off a drag and the drag has not been ended yet: the child let go, and what was in hand is to be put down there. */
  lifted = false
  private stirs = 0
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
    this.owed = []
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
    // What a touch set off starts a few at a time, and the rest on the frames that follow, so that a stroke through
    // everything is a flurry in which each thing is heard; what a customer says in a scene is its own short phrase and is played whole.
    const notes = [...this.notes.splice(0, MOST_NOTES), ...this.said]
    if (this.notes.length > MOST_WAITING) this.notes.length = MOST_WAITING
    this.said = []
    return notes
  }

  /** A scene is playing. */
  get inScene(): boolean {
    return this.scene?.running === true
  }

  cue(cue: Cue, who?: CustomerId): void {
    if (this.game) this.notes.push(...notesForCue(cue, who ?? null, this.game))
  }

  say(who: CustomerId, said: Said): void {
    this.said.push(...notesForSaying(who, said))
  }

  // --- Scenes ---------------------------------------------------------------

  /** Starts a scene whose outcome is already in the game: the game is marked to be saved at once. `touched` says a touch began it. */
  private play(beats: Beat[], touched = true): void {
    if (beats.length === 0) { this.settle(); return }
    const length = sceneLength(beats)
    // Whatever the beats leave on the way, the scene ends with everything where the model has it.
    this.scene = new Scene([...beats, { at: length, lasts: 0, play: () => this.settle() }])
    this.scene.start(this.time, () => { this.save = 'now' })
    this.scene.update(this.time)
    this.began = touched && this.pressedAt ? { at: this.pressedAt, time: this.time } : null
  }

  /** A touch: the scene that is playing ends now, with everything where it was going. */
  private endScene(): void {
    if (!this.scene?.running) return
    // What waits to be shown waits a moment longer, for the finger that cut this short to be done.
    this.showIn = SHOW_AFTER
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

  /**
   * The next thing that is waiting to be shown, if it is still due, as a scene
   * of its own. It is marked as shown, and what it changes is in the game, the
   * moment it starts, and not before: a showing that has not begun is not
   * lost when the scene before it is cut short or the game is put away.
   */
  private show(): void {
    while (this.owed.length > 0) {
      const idea = this.owed.shift()!, before = this.game
      if (!before || !ideasDue(before).includes(idea)) continue
      const after = markShown(before, idea)
      this.game = after
      // The game holds what the showing changes from its first moment. Until the paw gets there, the thing is drawn as it
      // was: the tuft at its old length, and the ribbon short on its peg.
      const tuft = idea === 'ribbon' ? null : tuftShown(before, after)
      const held = tuft ? this.hair.tufts[tuft.tuft] : null
      if (tuft && held) { held.rest = tuft.share; held.stretch.x = tuft.share; held.stretch.v = 0 }
      if (idea === 'ribbon') this.staging.ribbon = { x: RIBBON_HOME.x, y: RIBBON_HOME.y, len: RIBBON_FIRST }
      this.play(shownOnce(this, idea, before, after), false)
      return
    }
  }

  /** Notes what the scene that is about to start has to be followed by. */
  private owe(when: 'coming in' | 'later'): void {
    // A new customer starts the list afresh; a scene with the same customer adds to what is still waiting.
    const due = this.game ? ideasDue(this.game, when) : []
    this.owed = when === 'coming in' ? due : [...this.owed, ...due.filter((idea) => !this.owed.includes(idea))]
    this.showIn = 0
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
      this.owe('coming in')
      this.play(comingIn(this, game, done.game))
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
      this.owe('later')
      this.play([
        { at: 0, lasts: 0.45, play: (p) => { this.staging.cape = p } },
        { at: 0.1, lasts: 0.9, play: (p) => { if (from && to) this.staging.friend = from.x === to.x ? { ...to, lift: 0, seen: 1 } : walk(from, to, p, gait, 0.9, lowFor(from, to)) } },
      ])
      return
    }
    // The empty seat: the friend goes to it, at any moment while a customer is under the cape and as often as the child likes.
    const seated = sendFriend(game, button === 'stool' ? 'beside' : 'across')
    if (seated === game) return
    this.game = seated
    const from = this.staging.friend, to = placesOf(seated).friend
    const gait = seated.friend ? PERSONALITIES[seated.friend].gait : { hop: 10, steps: 2 }
    this.owe('later')
    this.play([
      { at: 0, lasts: 1.0, play: (p) => { if (from && to) this.staging.friend = walk(from, to, p, gait, 1.0, lowFor(from, to)) } },
      { at: 1.0, lasts: 0, play: () => { if (!this.cut) { this.puppets.friend?.react('hopsOver'); this.cue('landed', seated.friend ?? undefined) } } },
    ])
  }

  // --- The finger -----------------------------------------------------------

  /** One gesture of the finger, with its points already in scene units. */
  gesture(gesture: Gesture): void {
    const game = this.game
    if (!game) return
    const hand = this.hand
    if (this.echo && gesture.type !== 'press') return
    switch (gesture.type) {
      case 'press':
        // A second tap in the same place, straight after the one that began a scene, is part of that touch: a child who taps
        // twice, as the ghost hand does, does not undo what the first tap did. It does nothing.
        this.echo = this.inScene && this.began !== null && this.time - this.began.time < ECHO_S && Math.hypot(gesture.at.x - this.began.at.x, gesture.at.y - this.began.at.y) < ECHO_REACH
        if (this.echo) return
        // A touch ends a scene, and is then an ordinary touch on hair, a face, a piece or the air. On a thing that moves the
        // game on it is not: the touch that ends one scene never starts another, so the door, the knot, the chair and a
        // seat do nothing under it. A child who taps the knot again while the cape is coming off sees the ending, whole.
        if (this.inScene) {
          this.endScene()
          // It is still answered: the small knock of a finger.
          if (whatIsAt(this.game!, gesture.at)?.object === 'button') { this.echo = true; this.notes.push(OTHER_VOICES.caught); return }
        }
        this.pressedAt = gesture.at
        this.took(this.game!, hand.press(this.game!, gesture.at, this.time), 0)
        return
      case 'tap':
        this.took(game, hand.tap(game, gesture.at), 0)
        // A poke holds nothing: the hair it touched is free to wobble, and a ribbon or a piece it touched is where it was.
        this.hair.release()
        this.hair.carried = null
        return
      case 'dragMove':
        this.lifted = false
        this.follow(gesture.at)
        this.took(game, hand.move(game, gesture.at, this.time), 0)
        return
      // The browser took the finger away: nothing it was on is done.
      case 'pressEnd': this.abandon(); return
      case 'dragEnd': {
        const out = hand.drawnOut
        this.lifted = false
        this.took(game, hand.end(game, gesture.at), out)
        // A seat, the door or the chair that was pressed and then left by a drag is let go of untouched.
        this.pressed = null
        return
      }
      // A lifted finger mid-drag: the thing waits where it is, and the child has let go of it.
      case 'dragLift': this.lifted = true; return
      // A drag has begun: its first move follows.
      case 'dragStart': return
    }
  }

  /**
   * The finger is gone without letting go: the game was put away under it, or
   * the browser took it. Nothing the child did not do is done: a door, a
   * knot or a seat that was pressed is not touched, a ribbon or a piece that
   * was carried is where it was picked up, and a lock that was drawn out
   * under the cape is as long as it was drawn.
   */
  abandon(): void {
    this.lifted = false
    this.echo = false
    this.hand.drop()
    this.pressed = null
    this.pressedAt = null
    this.hair.release()
    this.hair.carried = null
    this.hair.scissorsOut()
    this.hair.scared = false
    for (const puppet of [this.puppets.chair, this.puppets.friend]) { puppet?.pulledTowards(null); puppet?.cheekHeld(null) }
  }

  /**
   * The game is put away. A scene that was playing ends there, with everyone
   * where it would have put them, so the game is found in that state however
   * it is opened again; and what was waiting to sound does not.
   */
  putAway(): void {
    this.endScene()
    // A showing that had not begun is not begun behind the child's back: it waits for its cause to come round again.
    this.owed = []
    this.notes = []
    this.said = []
  }

  /** Plays `dt` seconds. `idle` says no finger is working. */
  step(dt: number, idle: boolean): void {
    this.time += dt
    const game = this.game
    if (!game) return
    ease(this.glass, 0, 300, 14, dt)
    const playing = this.inScene
    this.scene?.update(this.time)
    // A thing to be shown follows the scene before it at once when that has played to its end; after one that was cut
    // short, it waits until the finger has been off the glass for a moment.
    if (!this.inScene && this.owed.length > 0) {
      if (!idle) this.showIn = SHOW_AFTER
      else if (playing || (this.showIn -= dt) <= 0) this.show()
    }
    const calm = idle && !this.inScene
    this.puppets.chair?.step(dt, calm)
    this.puppets.friend?.step(dt, calm)
    for (const puppet of this.waiting ?? []) puppet.step(dt, true)
    // Left alone, things go on by themselves: in an empty salon the pair at the door look about and rock on their heels, turn about; under the cape the pair show what they want, and the mane stirs.
    // Left alone means left alone: a touch or a scene starts the wait again.
    if (!calm) this.untilStir = STIR_EVERY
    if (calm) {
      this.untilStir -= dt
      if (this.untilStir <= 0) {
        this.untilStir = STIR_EVERY
        this.stirs++
        // The pair at the door look about and rock on their heels, one and then the other, whoever is in the salon.
        this.waiting?.[this.stirs % 2]?.react('looksAbout')
        if (game.chair !== null) {
          // The one want, always there to see, under the cape and with it off: the customer looks from its lock to the friend's and pats its own, and the friend looks from its lock to the customer's.
          // Each looks to the side the other's lock is on: the friend beside the chair is on the customer's right and looks left.
          // With the friend across the room, the customer's own lock is still on its right, so only its second look goes the other way.
          const beside = game.cape === 'off' || game.seat === 'beside'
          this.puppets.chair?.react('wantsItSo', beside ? false : 'second')
          this.puppets.chair?.react('patsItsLock')
          this.puppets.friend?.react('wantsItSo', beside)
          if (game.cape === 'on' && this.stirs % 2 === 0 && this.hair.settled) this.hair.moodOf('wave', 1.3)
        }
      }
    }
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
      // In an empty salon there is nothing to cut and no scissors come: the pair at the door look round at what was touched. They do not knock or wave.
      case 'looked': for (const puppet of this.waiting ?? []) puppet.react('looksAbout'); return
      // The room's own two things. The face in the looking glass swells towards the finger and settles (its giggle is the
      // poke that follows); the swept-up hair sends up a puff of fluff.
      case 'room':
        if (h.thing === 'glass') this.glass.v += 9
        else hair.fluff({ x: h.at.x, y: h.at.y - 6 }, 'fluff', 3)
        return
      case 'scissors':
        hair.scissorsIn(h.at)
        // The mane does not like the look of scissors: it trembles for as long as they are out.
        hair.scared = before.chair !== null && before.cape === 'on'
        return
      case 'airSnip': hair.scissorsClose(); return
      case 'away': hair.scissorsOut(); hair.scared = false; return
      case 'caught': this.caught(h.held, h.at, before); return
      case 'pressed':
        this.pressed = h.button
        // The door stays shut while a customer is under the cape: the pair behind it duck and peek.
        if (h.button === 'door' && before.chair !== null && before.cape === 'on') for (const puppet of this.waiting ?? []) puppet.react('ducksAndPeeks')
        // On a first visit the pair is in the room: touched, each gives under the finger.
        if (h.button === 'door' && before.chair === null) for (const puppet of this.waiting ?? []) puppet.bump(0.9)
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
    // A piece too many: the oldest one on the floor turns to fluff and blows away with a sigh.
    if (h.action === 'snip' && added.length > 0) {
      const cut = h.object === 'clipping' ? before.clippings.filter((c) => !after.clippings.includes(c)).sort((a, b) => near(before, a, h.at) - near(before, b, h.at))[0] : null
      for (const gone of before.clippings.filter((c) => c.on === 'floor' && c !== cut && !after.clippings.includes(c))) {
        const box = clippingBox(before, gone)
        if (box) hair.fluff({ x: box.x, y: box.y }, 'fluff', 4)
        this.notes.push(OTHER_VOICES.sigh)
      }
    }
    const who: Who = h.held?.object === 'face' ? h.held.who : 'chair'
    const mine = this.of(who), taste = (w: Who) => { const id = w === 'chair' ? after.chair : after.friend; return id ? TASTES[id] : null }
    const react = (puppet: Puppet | null, name: Reaction, always = true): void => { if (puppet && (always || !puppet.busy)) puppet.react(name) }
    const strand = (h.object === 'lock' || h.object === 'model' || h.object === 'ribbon' ? h.object : null) as StrandId | null
    switch (h.cell.voice) {
      case 'lock/pull': react(chair, 'pulled', false); hair.rippled(after.mane.length - 1, 0.3); return
      // The model answers a pull once for each press, so its owner always does: its eyes cross as its lock is drawn out.
      case 'model/pull': react(friend, 'friendPulled'); return
      case 'ribbon/pull': return
      case 'lock/snip':
      case 'model/snip':
      case 'ribbon/snip':
        if (strand) hair.snipped(strand)
        hair.scissorsClose()
        for (const piece of added) hair.fly(after, piece, h.at)
        if (strand === 'lock') { react(chair, 'snipped'); chair?.bump(0.7); hair.rippled(after.mane.length - 1) }
        if (strand === 'model') { react(friend, 'friendSnipped'); friend?.bump(1) }
        return
      case 'lock/poke': hair.plucked('lock', 1); react(chair, 'plucked'); chair?.bump(0.5); return
      case 'model/poke': hair.plucked('model', -1); react(friend, 'friendPoked'); friend?.bump(0.6); return
      case 'ribbon/poke': hair.snapped('ribbon'); return
      case 'lock/ruffle': hair.ruffled('lock'); react(chair, 'fluttered'); return
      case 'model/ruffle': hair.ruffled('model'); react(friend, 'friendRuffled'); return
      case 'ribbon/ruffle': hair.ruffled('ribbon'); return
      case 'tuft/pull': react(chair, 'maneTugged', false); return
      case 'tuft/snip':
        if (h.held?.object === 'tuft') hair.tuftSnipped(h.held.index, h.at, after.chair ?? 'lion')
        hair.scissorsClose()
        react(chair, 'snipped', false)
        return
      case 'tuft/poke': if (h.held?.object === 'tuft') hair.tuftPoked(h.held.index); react(chair, 'manePoked'); chair?.bump(0.6); return
      case 'tuft/ruffle': hair.maneFrizzed(); react(chair, 'frizzed'); chair?.bump(-0.5); return
      case 'face/pull': mine?.cheekHeld(null); react(mine, 'cheekPulled'); mine?.bump(-0.8); return
      case 'face/snip': hair.scissorsClose(); react(mine, 'airSnipped'); return
      case 'face/poke':
        react(mine, `${h.held?.object === 'face' ? h.held.part : 'cheek'}Tickled`)
        mine?.bump(1)
        // A nose that is pressed sneezes a little fluff.
        if (h.held?.object === 'face' && h.held.part === 'nose') hair.fluff({ x: h.at.x, y: h.at.y + 10 }, 'fluff', 3)
        return
      case 'face/ruffle': mine?.cheekHeld(null); react(mine, taste(who)?.rub === 'hates' ? 'rubHated' : 'rubLoved'); return
      // The ribbon was brought to something: it leaves the fingers and hangs there.
      case 'lock/ribbon': hair.carried = null; react(chair, 'wantsItSo', false); return
      case 'model/ribbon': hair.carried = null; react(friend, 'holdsBreath'); return
      case 'tuft/ribbon': {
        // The customer looks up at the bow and likes it or hates it, by its taste, and is heard to.
        const bow = taste('chair')?.bow === 'hates' ? 'bowHated' as const : 'bowLoved' as const
        hair.carried = null
        react(chair, bow)
        // A paw that goes for the bow goes to the tuft it is on.
        if (chair) chair.reaching = bowOn(after)
        if (after.chair) this.say(after.chair, bow)
        return
      }
      case 'face/ribbon': hair.carried = null; react(mine, 'blindfolded'); return
      case 'clipping/ribbon':
      case 'ribbon/ribbon': hair.carried = null; return
      case 'clipping/pull':
        hair.carried = null
        for (const piece of added) if (piece.on === 'floor') hair.fly(after, piece, h.at)
        if (h.place?.on === 'face') { react(this.of(h.place.who), 'wearing'); this.of(h.place.who)?.bump(0.8) }
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
