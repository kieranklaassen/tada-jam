import { due, freshPace, touched, waited, waitingLead, withWorld, type Pace } from './cycle'
import { GRID, type Action, type ObjectKind } from './grid'
import type { CreatureKind } from './kinds'
import { PERSONALITY } from './motion'
import { Play, type Seen, type Travel } from './play'
import { creatureAt, dropHat, placeOf, tapCreature, tapHat, type Drop, type Happened, type Outcome, type Place } from './rules'
import { worldOf, type Saved } from './save'
import { Scene } from './scene'
import { changeShow, firstShowing, nextCrewShow, paradeShow, type Show } from './shows'
import { IN_ARCH, LOOSE_Z, ROW_Z, TILE_Z, holeX, nearestSpot, spotPoint, spotX } from './stage'
import { ACTS as TASTE_ACTS, moodFor, tasteFor } from './tastes'
import { babble, bap, creak, fwump, hoot, pip, plop, pok, scuttle, squeak, voiceLength, type Mood } from './voices'

// The game on the toy: the rules, the cycle and the scenes, played on the
// puppet theatre. No renderer and no DOM. The Mount hands it what the finger
// did, as a thing touched and a place let go, steps it, draws `play` and
// saves `saved` when `dirty` says so. Every touch is answered; nothing is
// refused, rated or counted on screen.

/** What a finger landed on. A creature is named as the theatre names it. */
export type Target = { type: 'hat'; hat: number } | { type: 'creature'; who: string } | { type: 'arch' } | { type: 'floor'; x: number; z: number }

/** Where a dragged thing is let go. */
export type LetGo = { on: 'creature'; who: string } | { on: 'tile' } | { on: 'floor'; x: number; z: number }

/** The name of the creature that waits in the arch for the child's touch: the next crew's first, while the finished crew still stands. */
export const waits = (kind: CreatureKind): string => `${kind}+`

export class Game {
  saved: Saved
  pace: Pace
  readonly play = new Play()
  /** The save changed: 'soon' for a small change that keeps coming, 'now' for a scene's outcome. The Mount saves and clears it. */
  dirty: 'soon' | 'now' | null = null
  /** Goes up each time a new tile is laid, so the view cuts the tile's holes again. */
  tileLaid = 0
  /** What has been seen, by the names of the grid's cells and the scenes: for tests, and for nothing on screen. */
  readonly seen: string[] = []
  private scene: Scene | null = null
  private held: Target | null = null
  private carrying: { hat: number; from: Seen; object: ObjectKind } | null = null
  private pulling = false
  private sounded = 0

  /** The stage is laid out as the world was left: nothing eases in and no scene replays. */
  constructor(saved: Saved) {
    this.saved = saved
    this.pace = freshPace(saved)
    this.layStage()
  }

  /** Lays the theatre out from the save: every creature on its spot, every hat where the world has it, the next crew's first in the arch if the cycle is finished. */
  layStage(): void {
    const world = worldOf(this.saved)
    for (const who of this.play.cast) this.play.leave(who)
    this.play.layTile(world.tile)
    this.play.tileZ = TILE_Z
    this.tileLaid++
    for (const creature of world.crew) this.play.enter(creature.kind, creature.kind, spotPoint(creature.spot))
    world.tile.forEach((_, hat) => this.play.place(hat, this.seenFor(placeOf(world, hat))))
    if (this.saved.finished) this.someoneWaits()
    this.dress()
  }

  /** The next crew's first creature stands in the arch. */
  someoneWaits(): string {
    const kind = waitingLead(this.saved)
    if (!this.play.has(waits(kind))) this.play.enter(waits(kind), kind, IN_ARCH)
    return waits(kind)
  }

  /** After load: the first showing plays once ever, if it has not. */
  begin(): void {
    if (!this.saved.shown) this.show(firstShowing(this))
  }

  get sceneRunning(): boolean {
    return this.scene !== null && this.scene.running
  }

  // --- Scenes -------------------------------------------------------------

  /** Starts a scene: its outcome goes into the save at once, before its first beat. */
  show(show: Show): void {
    this.scene = new Scene(show.beats)
    this.scene.start(this.play.time, () => {
      this.saved = show.save(this.saved)
      this.dirty = 'now'
    })
    this.seen.push(show.name)
    this.dress()
  }

  /** A touch ends the scene that is playing: everything is at once where the scene was taking it. */
  endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
    this.play.settle()
    this.dress()
  }

  // --- Time ---------------------------------------------------------------

  step(dt: number): void {
    this.play.step(dt)
    if (this.scene) {
      this.scene.update(this.play.time)
      if (!this.scene.running) this.scene = null
    }
    // A finger on a hat or a creature is a touch for as long as it stays down.
    if (this.held && (this.held.type === 'hat' || this.held.type === 'creature')) return
    this.pace = waited(this.pace, dt)
    if (this.scene) return
    const now = due(this.saved, this.pace)
    if (now === 'change') this.show(changeShow(this))
    else if (now === 'parade') {
      this.show(paradeShow(this))
      this.pace = { ...this.pace, paraded: true }
    }
  }

  // --- Sound --------------------------------------------------------------

  private next(): number { return this.sounded++ }

  /** A creature babbles, and its mouth moves for as long as it sounds. */
  says(who: string, mood: Mood, delay = 0): void {
    if (!this.play.has(who)) return
    const voice = babble(this.play.kindOf(who), mood, this.next())
    this.play.speaks(who, delay + voiceLength(voice))
    this.play.cue(mood === 'ask' ? 'babble-ask' : mood === 'grump' ? 'babble-grump' : 'babble', voice, delay)
  }

  // --- What the world says of the stage -----------------------------------

  private seenFor(place: Place): Seen {
    if (place.at === 'head') return { at: 'head', who: creatureAt(worldOf(this.saved), place.spot)!.kind, level: place.level }
    return place
  }

  /** Tells the theatre which creature cannot stand the one hat it wears. */
  dress(): void {
    const world = worldOf(this.saved)
    for (const creature of world.crew) {
      const one = creature.hats.length === 1 ? world.tile[creature.hats[0]] : null
      this.play.sulks(creature.kind, one !== null && tasteFor(creature.kind, one) === 'cannot-stand')
    }
  }

  /** The creature of the crew on this spot, by its name in the theatre. */
  private at(spot: number): string { return creatureAt(worldOf(this.saved), spot)!.kind }

  private inCrew(who: string): boolean { return this.saved.crew.some((creature) => creature.kind === who) }

  private objectOf(hat: number): ObjectKind {
    const place = placeOf(worldOf(this.saved), hat)
    if (place.at === 'tile') return 'hat-in-tile'
    if (place.at === 'loose') return 'loose-hat'
    return creatureAt(worldOf(this.saved), place.spot)!.hats.length > 1 ? 'tower-top' : 'hat-on-head'
  }

  /** A tap on any hat of a tower lifts the one on top. */
  private topOf(hat: number): number {
    const place = placeOf(worldOf(this.saved), hat)
    if (place.at !== 'head') return hat
    const hats = creatureAt(worldOf(this.saved), place.spot)!.hats
    return hats[hats.length - 1]
  }

  // --- The finger ---------------------------------------------------------

  /** The finger lands: a scene ends, and the foam gives at once, before any lift. */
  press(target: Target): void {
    this.endScene()
    this.held = target
    this.play.cue(target.type === 'floor' ? 'squeak' : 'creak', target.type === 'floor' ? squeak(this.next()) : creak(this.next()))
    if (target.type === 'hat') {
      this.play.pressHat(target.hat, true)
      const place = placeOf(worldOf(this.saved), target.hat)
      if (place.at === 'head') this.play.bounce(this.at(place.spot), 0.93)
      this.pace = touched(this.pace, this.saved)
    } else if (target.type === 'creature') {
      this.play.pressActor(target.who, true)
      this.pace = touched(this.pace, this.saved)
    } else if (target.type === 'arch') this.play.archPressed = true
    else this.play.dimple(target.x, target.z)
  }

  private lift(): Target | null {
    const held = this.held
    this.held = null
    if (held?.type === 'hat') this.play.pressHat(held.hat, false)
    if (held?.type === 'creature') this.play.pressActor(held.who, false)
    this.play.archPressed = false
    return held
  }

  /** The finger lifted where it landed: the tap column of the grid. */
  tap(): void {
    const held = this.lift()
    if (!held) return
    if (held.type === 'hat') {
      const hat = this.topOf(held.hat), object = this.objectOf(held.hat)
      this.note(object, 'tap')
      this.apply(tapHat(worldOf(this.saved), hat), object, 'tap', false)
    } else if (held.type === 'creature') {
      if (!this.inCrew(held.who)) return this.archTapped()
      const creature = this.saved.crew.find((one) => one.kind === held.who)!
      const object: ObjectKind = creature.hats.length === 0 ? 'bare-creature' : 'hatted-creature'
      this.note(object, 'tap')
      if (object === 'bare-creature' && tapCreature(worldOf(this.saved), creature.spot).happened[0]?.type !== 'noHat') this.says(held.who, 'ask')
      this.apply(tapCreature(worldOf(this.saved), creature.spot), object, 'tap', false)
    } else if (held.type === 'arch') this.archTapped()
  }

  /** The press is over and was not a tap: the foam springs back, and a hat in the hand goes back where it was. */
  pressEnd(): void {
    this.lift()
    if (this.carrying) this.play.moveHat(this.carrying.hat, this.carrying.from, 'carry')
    this.carrying = null
    this.pulling = false
  }

  /** The finger has moved far enough to be dragging: a hat comes away in the hand, a creature stretches after the finger. */
  dragStart(): void {
    const held = this.held
    if (held?.type === 'hat') {
      const hat = this.topOf(held.hat), object = this.objectOf(held.hat), kind = this.saved.tile[hat]
      this.play.pressHat(held.hat, false)
      this.carrying = { hat, from: this.play.seen(hat), object }
      this.play.cue(object === 'hat-in-tile' ? 'pok' : object === 'loose-hat' ? 'squeak' : 'pip', object === 'hat-in-tile' ? pok(kind, this.next()) : object === 'loose-hat' ? squeak(this.next()) : pip(kind, this.next()))
      const pose = this.play.hatPose(hat)
      this.play.holdHat(hat, pose.x, pose.y, pose.z)
    } else if (held?.type === 'creature' && this.inCrew(held.who)) {
      this.pulling = true
      this.play.cue('squeak', squeak(this.next()))
    }
  }

  /** The finger moves: the hat in the hand goes to this point, and a pulled creature leans this far, each from -1 to 1. */
  dragTo(x: number, y: number, z: number, pullX: number, pullY: number): void {
    if (this.carrying) this.play.holdHat(this.carrying.hat, x, y, z)
    else if (this.pulling && this.held?.type === 'creature') this.play.pull(this.held.who, pullX, pullY)
  }

  /** The finger lets go of what it dragged. */
  letGo(where: LetGo): void {
    const held = this.lift(), carrying = this.carrying, pulling = this.pulling
    this.carrying = null
    this.pulling = false
    const world = worldOf(this.saved)
    const other = where.on === 'creature' && this.inCrew(where.who) ? this.saved.crew.find((one) => one.kind === where.who)! : null
    const action: Action = other ? (other.hats.length === 0 ? 'to-bare-head' : 'to-hatted-head') : where.on === 'tile' ? 'to-tile' : 'elsewhere'
    if (carrying) {
      const drop: Drop = other ? { on: 'head', spot: other.spot } : where.on === 'tile' ? { on: 'tile' } : { on: 'floor', spot: nearestSpot(where.on === 'floor' ? where.x : IN_ARCH.x) }
      const outcome = dropHat(world, carrying.hat, drop)
      this.pace = touched(this.pace, this.saved)
      if (outcome.world === world) {
        // Let go where it already was: it dips back, and nothing changed.
        this.note(carrying.object, action)
        const kind = this.saved.tile[carrying.hat]
        this.play.moveHat(carrying.hat, carrying.from, 'carry', () => this.play.cue(carrying.from.at === 'tile' ? 'fwump' : 'bap', carrying.from.at === 'tile' ? fwump(kind, this.next()) : bap(kind, this.next())))
        return
      }
      this.note(carrying.object, action)
      this.apply(outcome, carrying.object, action, true)
    } else if (pulling && held?.type === 'creature') this.comedy(held.who, other && other.kind !== held.who ? other.kind : null, action)
  }

  private note(object: ObjectKind, action: Action): void {
    this.seen.push(GRID[object][action].seen)
  }

  private archTapped(): void {
    if (this.saved.finished) return this.show(nextCrewShow(this))
    this.play.arch.v += 2.2
    this.play.cue('hoot', hoot(this.next()))
  }

  // --- What a move does on the stage --------------------------------------

  /** A move of the child's has an outcome: the save holds the new world, and the theatre plays what happened. */
  private apply(outcome: Outcome, object: ObjectKind, action: Action, carried: boolean): void {
    const before = worldOf(this.saved)
    if (outcome.world !== before) {
      this.saved = withWorld(this.saved, outcome.world)
      this.dirty = this.dirty ?? 'soon'
    }
    this.pace = touched(this.pace, this.saved)
    this.dress()
    for (const event of outcome.happened) this.plays(event, object, action, carried, outcome.happened)
  }

  private plays(event: Happened, object: ObjectKind, action: Action, carried: boolean, all: Happened[]): void {
    const play = this.play
    if (event.type === 'hatMoved') {
      const kind = this.saved.tile[event.hat], hat = event.hat
      const travel: Travel = carried ? (event.to.at === 'loose' ? 'skid' : 'carry') : event.from.at === 'loose' ? 'hop' : 'pop'
      if (!carried) play.cue(event.from.at === 'tile' ? 'pok' : event.from.at === 'head' ? 'pip' : 'plop', event.from.at === 'tile' ? pok(kind, this.next()) : event.from.at === 'head' ? pip(kind, this.next()) : plop(kind, this.next()))
      // A hat lifted off a tower: the creature under it blinks in the light.
      if (event.from.at === 'head' && object === 'tower-top' && !all.some((one) => one.type === 'towerFell' && one.spot === (event.from as { spot: number }).spot)) {
        const under = this.at(event.from.spot)
        play.act(under, 'blinks-in-the-light')
        this.says(under, 'plain', 0.05)
      }
      if (event.to.at === 'tile') {
        // Carried home: a loose hat is pressed in with a long creak, any other pushed in under the finger with a rising squeak.
        if (carried) play.cue(object === 'loose-hat' ? 'creak' : 'squeak', object === 'loose-hat' ? creak(this.next()) : squeak(this.next()))
        play.moveHat(hat, { at: 'tile' }, travel, () => {
          play.cue('fwump', fwump(kind, this.next()))
          play.dimple(holeX(hat, this.saved.tile.length), TILE_Z)
          // The hat left under a tower's top spins once as the top goes home.
          if (object === 'tower-top' && action === 'to-tile') play.cue('squeak', squeak(this.next()), 0.08)
        })
      } else if (event.to.at === 'loose') {
        const spot = event.to.spot
        play.moveHat(hat, { at: 'loose', spot }, travel, () => {
          play.cue('plop', plop(kind, this.next()))
          if (object === 'tower-top') play.cue('plop', plop(kind, this.next()), 0.12)
          play.cue('scuttle', scuttle(this.next()), 0.3)
          play.everyoneLooks(spotX(spot), LOOSE_Z, 1.6)
        })
      } else {
        const who = this.kindAt(event.to.spot, all)
        // A hat stretched out of the tile after the finger snaps onto the head it is let go on.
        if (carried && object === 'hat-in-tile') play.cue('squeak', squeak(this.next()))
        const fell = all.find((one) => one.type === 'towerFell')
        play.moveHat(hat, { at: 'head', who, level: event.to.level }, travel, fell?.type === 'towerFell' ? () => this.topples(who, fell.hats) : () => this.lands(hat, who, object))
      }
    } else if (event.type === 'bared') {
      const who = this.at(event.spot)
      play.act(who, action === 'to-tile' ? 'waves-it-off' : action === 'tap' ? 'pats-its-bare-head' : 'watches-it-go')
      this.says(who, action === 'to-tile' ? 'plain' : 'ask', 0.12)
    } else if (event.type === 'noHat') {
      play.act(this.at(event.spot), 'looks-into-the-holes')
      this.says(this.at(event.spot), 'ask', 0.1)
    } else if (event.type === 'trick') {
      const who = this.at(event.spot), hat = this.saved.tile[event.hat], tower = creatureAt(worldOf(this.saved), event.spot)!.hats.length > 1
      play.act(who, tower ? 'totters-blind' : TASTE_ACTS[play.kindOf(who)][hat])
      this.says(who, tower ? 'grump' : moodFor(tasteFor(play.kindOf(who), hat)))
    } else if (event.type === 'towerFell') this.seen.push('the-tower-falls')
  }

  /** The creature on a spot, by its name in the theatre. A tower that fell left its creature bare in the world, so the event names the spot. */
  private kindAt(spot: number, _all: Happened[]): string { return this.at(spot) }

  /** The secret that works every time: the third hat lands, the tower sways, salutes and topples, and every hat of it bounces home. */
  private topples(who: string, hats: number[]): void {
    const play = this.play
    play.cue('bap', bap(this.saved.tile[hats[hats.length - 1]], this.next()))
    play.act(who, 'salutes-and-topples')
    play.cue('hoot', hoot(this.next()), 0.1)
    play.after(0.5, () => hats.forEach((hat) => {
      const kind = this.saved.tile[hat]
      if (play.seen(hat).at === 'head') play.moveHat(hat, { at: 'tile' }, 'pop', () => play.cue('fwump', fwump(kind, this.next())))
    }))
  }

  /** A hat comes down on a head: the creature gives under it and reacts to exactly this hat, and the others look. */
  private lands(hat: number, who: string, object: ObjectKind): void {
    const play = this.play, kind = this.saved.tile[hat], creature = this.saved.crew.find((one) => one.kind === who)
    if (!creature || !play.has(who)) return
    play.cue('bap', bap(kind, this.next()))
    play.bounce(who, 1 - PERSONALITY[creature.kind].bounce)
    if (creature.hats.length > 1) {
      // A second hat: the tower slips over its eyes and it totters, bewildered and never hurt.
      play.cue(object === 'loose-hat' ? 'creak' : 'bap', object === 'loose-hat' ? creak(this.next()) : bap(kind, this.next()), 0.09)
      play.act(who, 'totters-blind')
      this.says(who, 'grump', 0.14)
    } else {
      play.act(who, object === 'loose-hat' ? 'ducks-under' : TASTE_ACTS[creature.kind][kind])
      this.says(who, moodFor(tasteFor(creature.kind, kind)), 0.1)
    }
    play.everyoneLooks(spotX(creature.spot), ROW_Z, 1.2, who)
  }

  /** A creature was pulled and let go: it does something funny with whoever or whatever it was pulled to, and stays on its spot. */
  private comedy(who: string, other: string | null, action: Action): void {
    const play = this.play, bare = this.saved.crew.find((one) => one.kind === who)!.hats.length === 0
    this.note(bare ? 'bare-creature' : 'hatted-creature', action)
    this.pace = touched(this.pace, this.saved)
    const hat = this.saved.tile[this.saved.crew.find((one) => one.kind === who)!.hats[0] ?? 0]
    if (bare && action === 'to-bare-head' && other) {
      play.act(who, 'boings-and-pats'); play.act(other, 'boings-and-pats')
      play.cue('plop', plop(hat, this.next())); this.says(who, 'ask', 0.3); this.says(other, 'ask', 0.5)
    } else if (bare && action === 'to-hatted-head' && other) {
      play.act(who, 'peeks-up-under'); play.act(other, 'lifts-it-like-a-lid')
      play.cue('pip', pip(hat, this.next()), 0.2); this.says(who, 'ask', 0.3); this.says(other, 'plain', 0.6)
    } else if (bare && action === 'to-tile') {
      play.act(who, 'babbles-into-a-hole'); this.says(who, 'ask', 0.2); play.cue('hoot', hoot(this.next()), 0.6)
    } else if (bare) {
      play.act(who, 'twangs-back'); play.cue('hoot', hoot(this.next()))
    } else if (action === 'to-bare-head' && other) {
      play.act(who, 'bows-and-tips-its-hat'); play.act(other, 'claps')
      this.says(who, 'plain'); play.cue('plop', plop(hat, this.next()), 0.4); play.cue('plop', plop(hat, this.next()), 0.65)
    } else if (action === 'to-hatted-head' && other) {
      play.act(who, 'knocks-hats'); play.act(other, 'knocks-hats')
      play.cue('bap', bap(hat, this.next()), 0.3); this.says(who, 'plain', 0.4); this.says(other, 'plain', 0.6)
    } else if (action === 'to-tile') {
      play.act(who, 'shakes-its-hat-out'); play.cue('scuttle', scuttle(this.next()), 0.4); this.says(who, 'ask', 0.9)
    } else {
      play.act(who, 'twangs-holding-its-hat'); play.cue('hoot', hoot(this.next())); this.says(who, 'plain', 0.3)
    }
  }
}
