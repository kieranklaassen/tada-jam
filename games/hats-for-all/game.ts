import { ACTS } from './acts'
import { LEFT_ALONE_S, due, freshPace, touched, waited, waitingLead, withWorld, type Pace } from './cycle'
import { GRID, type Action, type ObjectKind } from './grid'
import type { CreatureKind, HatKind } from './kinds'
import { PERSONALITY } from './motion'
import { Play, type ActorPose, type Seen, type Travel } from './play'
import type { PropName } from './props'
import { bareSpots, creatureAt, dropHat, hatsInTile, placeOf, settled, tapCreature, tapHat, type Drop, type Happened, type Outcome, type Place } from './rules'
import { worldOf, type Saved } from './save'
import { Scene } from './scene'
import { BODY, CREATURE_DEPTH, HAND, HAT_HALF } from './sizes'
import { changeShow, firstShowing, nextCrewShow, paradeShow, type Show } from './shows'
import { IN_ARCH, LOOSE_Z, ROW_Z, TILE_Z, holeX, nearestSpot, spotPoint, spotX, tileX } from './stage'
import { ACTS as TASTE_ACTS, moodFor, tasteFor } from './tastes'
import {
  babble, bap, bip, bloopBlip, bomBom, chirrup, clap, creak, donk, dwong, flap, fwump, groan, hiss, hoot, hum, longCreak, paf, pip, plap, plop, pok, pomf, rumble, rustle, thup, trundle,
  scuttle, shoop, squeak, squeal, squelch, thwop, tok, twang, voiceLength, whirr, whistle, zrrp, type Mood,
} from './voices'

// The game on the toy: the rules, the cycle and the scenes, played on the
// puppet theatre. No renderer and no DOM. The Mount hands it what the finger
// did, as a thing touched and a place let go, steps it, draws `play` and
// saves `saved` when `dirty` says so. Every touch is answered; nothing is
// refused, rated or counted on screen.

/** What a finger landed on. A creature is named as the theatre names it. */
/** A body squashed as far as an act squashes it is this much wider; and Flop's ears, flung right out, reach this far from its middle. */
const SQUASH_WIDENS = 1.13
const EARS_FLUNG = 2.3

export type Target = { type: 'hat'; hat: number } | { type: 'creature'; who: string } | { type: 'arch' } | { type: 'prop'; prop: PropName } | { type: 'floor'; x: number; z: number }

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
    // Whoever stands bare with every hat given out has made its show before the game was put away: it does not make it again on load.
    this.makesAShow(true)
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

  /** Opened again with a change or a parade held, and no hat or creature touched yet: nothing comes until one is. */
  get asleep(): boolean {
    return !this.pace.touched && !this.sceneRunning && due(this.saved, { ...this.pace, touched: true, quiet: LEFT_ALONE_S }) !== null
  }

  /** The game went to rest and is looked at again: as when it is opened, nothing comes by itself until a hat or a creature is touched. */
  rested(): void {
    // What it still owes is kept: a finished crew that was unsettled and set right again has its parade to come, once it is touched.
    this.pace = { ...freshPace(this.saved), paraded: this.pace.paraded }
  }

  /** A touch ends the scene that is playing: everything is at once where the scene was taking it. */
  endScene(): void {
    if (!this.scene) return
    // What the rest of the scene would have sounded is not heard: its beats all play at once to set the stage, and their voices together would be a noise nobody made.
    const heard = this.play.cues.length
    this.scene.finish()
    this.scene = null
    this.play.settle()
    this.play.cues.length = heard
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
    this.play.feels(who, mood, delay + voiceLength(voice) + 0.9)
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
      this.play.sulks(creature.kind, one !== null && tasteFor(creature.kind, one) === 'cannot-stand', one !== null && tasteFor(creature.kind, one) === 'loves')
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
    // What the finger was over may have gone with the scene it ended (a hat of the old tile, a creature that walked off): the touch is then on the floor where that was.
    if ((target.type === 'hat' && target.hat >= this.play.hatCount) || (target.type === 'creature' && !this.play.has(target.who))) target = { type: 'floor', x: 0, z: TILE_Z }
    this.held = target
    if (target.type !== 'prop') this.play.cue(target.type === 'floor' ? 'squeak' : 'creak', target.type === 'floor' ? squeak(this.next()) : creak(this.next()))
    if (target.type === 'hat') {
      this.play.pressHat(target.hat, true)
      const place = placeOf(worldOf(this.saved), target.hat)
      if (place.at === 'head') this.play.bounce(this.at(place.spot), 0.93)
      // In its hole, the hat sinks under the finger and the tile dimples round it.
      if (place.at === 'tile') this.play.dent(holeX(target.hat, this.saved.tile.length), TILE_Z)
      this.pace = touched(this.pace, this.saved)
    } else if (target.type === 'creature') {
      this.play.pressActor(target.who, true)
      this.pace = touched(this.pace, this.saved)
    } else if (target.type === 'arch') this.play.archPressed = true
    else if (target.type === 'prop') {
      // A thing of the room: it wobbles and sounds, and nothing in the world changes.
      this.play.poke(target.prop)
      // Each has a voice of its own, which no hat and no creature has.
      this.play.cue(target.prop === 'tree' ? 'rustle' : target.prop === 'brick' ? 'thup' : 'trundle', target.prop === 'tree' ? rustle(this.next()) : target.prop === 'brick' ? thup(this.next()) : trundle(this.next()), 0.03)
    } else this.play.dimple(target.x, target.z)
  }

  /** Where the finger is over the mat, for the creatures' eyes. */
  fingerAt(x: number, y: number, z: number): void {
    this.play.fingerAt(x, y, z)
  }

  private readonly shown = new Set<string>()

  /**
   * The one who gets none makes a show of it. When every hat is on a head and a head is still bare, each bare
   * creature does it once: it looks into the holes and at the other heads, throws up its hands, jumps, sits down
   * with a bump and goes cross-eyed. It is about the hats and never about the child, and then it waits, calm.
   * `quiet` only notes who is already in that state, as when the stage is laid out from a save.
   */
  private makesAShow(quiet = false): void {
    const world = worldOf(this.saved), none = settled(world) && hatsInTile(world).length === 0 ? bareSpots(world) : []
    for (const who of [...this.shown]) if (!none.some((spot) => this.at(spot) === who)) this.shown.delete(who)
    for (const spot of none) {
      const who = this.at(spot)
      if (this.shown.has(who)) continue
      this.shown.add(who)
      if (quiet) continue
      this.seen.push('makes-a-show-of-it')
      this.play.act(who, 'makes-a-show-of-it')
      this.says(who, 'ask', 0.25)
    }
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
      // If it is let go again where it was, or put down unlet, it goes back to where the world has it: a hat taken from a tower that is falling is already home.
      this.carrying = { hat, from: this.seenFor(placeOf(worldOf(this.saved), hat)), object }
      // Out of the tile it stretches after the finger with a low rubbery groan; off the floor it comes with a sucker "thwop"; off a head with a "pip".
      if (object === 'hat-in-tile') this.play.cue('groan', groan(this.next()))
      else if (object === 'loose-hat') this.play.cue('thwop', thwop(this.next()))
      else this.play.cue('pip', pip(kind, this.next()))
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
    this.makesAShow()
  }

  private plays(event: Happened, object: ObjectKind, action: Action, carried: boolean, all: Happened[]): void {
    const play = this.play
    if (event.type === 'hatMoved') {
      const kind = this.saved.tile[event.hat], hat = event.hat
      const travel: Travel = carried ? (event.to.at === 'loose' ? 'skid' : 'carry') : event.from.at === 'loose' ? 'hop' : 'pop'
      if (!carried && event.from.at === 'tile') play.cue('pok', pok(kind, this.next()))
      else if (!carried && event.from.at === 'head') play.cue('pip', pip(kind, this.next()))
      // A tapped loose hat hops onto a bare head with an upward chirrup, or home with a double bounce, "bom-bom".
      else if (!carried) play.cue(event.to.at === 'head' ? 'chirrup' : 'bom-bom', event.to.at === 'head' ? chirrup(kind, this.next()) : bomBom(kind, this.next()))
      // The top of a tower: lifted by a tap, the tower shrinks with a "bip"; carried to a bare head, it goes with a smooth "shoop".
      if (!carried && object === 'tower-top' && event.from.at === 'head') play.cue('bip', bip(this.next()), 0.06)
      if (carried && object === 'tower-top' && action === 'to-bare-head') play.cue('shoop', shoop(this.next()))
      // A hat lifted off a tower: the creature under it blinks in the light.
      if (event.from.at === 'head' && object === 'tower-top' && !all.some((one) => one.type === 'towerFell' && one.spot === (event.from as { spot: number }).spot)) {
        const under = this.at(event.from.spot)
        play.act(under, 'blinks-in-the-light')
        this.says(under, 'plain', 0.05)
      }
      if (event.to.at === 'tile') {
        // Carried home: a loose hat is pressed in with a long creak, any other pushed in under the finger with a rising squeak.
        if (carried) play.cue(object === 'loose-hat' ? 'long-creak' : 'squeak', object === 'loose-hat' ? longCreak(this.next()) : squeak(this.next()))
        play.moveHat(hat, { at: 'tile' }, travel, () => {
          play.cue('fwump', fwump(kind, this.next()))
          play.dimple(holeX(hat, this.saved.tile.length), TILE_Z)
          // The hat left under a tower's top spins once as the top goes home, with a quick "zrrp".
          if (object === 'tower-top' && action === 'to-tile' && event.from.at === 'head') {
            play.cue('zrrp', zrrp(this.next()), 0.08)
            const under = this.at(event.from.spot), left = play.has(under) ? play.hatOn(under, event.from.level - 1) : null
            if (left !== null) play.after(0.08, () => play.spinHat(left))
          }
        })
      } else if (event.to.at === 'loose') {
        const spot = event.to.spot
        // Carried out of the tile and let go on the floor, it skids to its spot with a long rubbery squeal; a loose hat let go again spins like a coin with a quickening whirr.
        if (carried && object === 'hat-in-tile') play.cue('squeal', squeal(this.next()))
        if (carried && object === 'loose-hat') play.cue('whirr', whirr(this.next()))
        // Off a head it slides with a hiss of foam on foam; off a tipped tower it rolls with a wobbling rumble.
        if (carried && object === 'hat-on-head') play.cue('hiss', hiss(this.next()))
        // The whole tower is tipped: the creature under it leans right over and comes back as the top hat rolls off.
        if (carried && object === 'tower-top') {
          play.cue('rumble', rumble(this.next()))
          if (event.from.at === 'head') play.tip(this.at(event.from.spot))
        }
        play.moveHat(hat, { at: 'loose', spot }, travel, () => {
          // It lands with a plop; flat off a head, "plap"; and what is left of a tipped tower settles with a low "donk".
          if (carried && object === 'hat-on-head') play.cue('plap', plap(kind, this.next()))
          else play.cue('plop', plop(kind, this.next()))
          if (object === 'tower-top') play.cue('donk', donk(this.next()), 0.12)
          play.cue('scuttle', scuttle(this.next()), 0.3)
          play.everyoneLooks(spotX(spot), LOOSE_Z, 1.6)
        })
      } else {
        const who = this.kindAt(event.to.spot, all)
        const fell = all.find((one) => one.type === 'towerFell')
        play.moveHat(hat, { at: 'head', who, level: event.to.level }, travel, fell?.type === 'towerFell' ? () => this.topples(who, fell.hats) : () => this.lands(hat, who, object, carried))
      }
    } else if (event.type === 'bared') {
      const who = this.at(event.spot)
      play.act(who, action === 'to-tile' ? 'waves-it-off' : action === 'tap' ? 'pats-its-bare-head' : 'watches-it-go')
      // Its eyes follow its hat to where it goes: the hole it is pressed into, the place on the floor where it lies, or the other head.
      const gone = all.find((one) => one.type === 'hatMoved' && one.from.at === 'head' && one.from.spot === event.spot)
      if (gone?.type === 'hatMoved') {
        const to = gone.to
        if (to.at === 'tile') play.look(who, holeX(gone.hat, this.saved.tile.length), TILE_Z, 1.6)
        else play.look(who, spotX(to.spot), to.at === 'loose' ? LOOSE_Z : ROW_Z, 1.6)
      }
      this.says(who, action === 'to-tile' ? 'plain' : 'ask', 0.12)
    } else if (event.type === 'noHat') {
      play.act(this.at(event.spot), 'looks-into-the-holes')
      this.says(this.at(event.spot), 'ask', 0.1)
    } else if (event.type === 'trick') {
      const who = this.at(event.spot), hat = this.saved.tile[event.hat], tower = creatureAt(worldOf(this.saved), event.spot)!.hats.length > 1
      if (tower) play.act(who, 'totters-blind')
      else this.reacts(who, hat)
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
    play.after(0.5, () => { if (play.has(who)) this.crumbsAt(who, this.saved.tile[hats[hats.length - 1]], 8) })
    play.cue('whistle', whistle(this.next()), 0.35)
    // They leave from the top down, a moment apart, so no hat flies through the one above it.
    hats.forEach((hat, level) => play.after(0.5 + (hats.length - 1 - level) * 0.14, () => {
      const kind = this.saved.tile[hat]
      // Unless the child has already taken it somewhere else.
      if (play.seen(hat).at === 'head' && placeOf(worldOf(this.saved), hat).at === 'tile') play.moveHat(hat, { at: 'tile' }, 'pop', () => play.cue('fwump', fwump(kind, this.next())))
    }))
  }

  private readonly crumbPose = { x: 0, y: 0, z: 0 } as ActorPose
  private crumbsAt(who: string, kind: HatKind, count: number): void {
    const at = this.play.actorPose(who, this.crumbPose)
    this.play.puff(at.x, BODY[this.play.kindOf(who)].top * 0.9, at.z + CREATURE_DEPTH / 2 + 0.3, count, kind)
  }

  /** A creature's own reaction to exactly this kind of hat: its act, and for the one act that is a drum roll of feet, the patter of them. */
  reacts(who: string, hat: HatKind): void {
    const act = TASTE_ACTS[this.play.kindOf(who)][hat]
    this.play.act(who, act)
    if (act === 'tap-dances') this.play.cue('scuttle', scuttle(this.next()), 0.12)
  }

  /** A hat comes down on a head: the creature gives under it and reacts to exactly this hat, and the others look. */
  private lands(hat: number, who: string, object: ObjectKind, carried: boolean): void {
    const play = this.play, kind = this.saved.tile[hat], creature = this.saved.crew.find((one) => one.kind === who)
    if (!creature || !play.has(who)) return
    const tower = creature.hats.length > 1
    // How it lands is heard: carried from the tile, a soft "paf" on a bare head and a muffled "pomf" on a hat; from one
    // head to another, a two-note "bloop-blip" on a bare head and a rubbery squelch on a hat; otherwise a "bap".
    if (carried && object === 'hat-in-tile') play.cue(tower ? 'pomf' : 'paf', tower ? pomf(kind, this.next()) : paf(kind, this.next()))
    else if (carried && object === 'hat-on-head') play.cue(tower ? 'squelch' : 'bloop-blip', tower ? squelch(this.next()) : bloopBlip(kind, this.next()))
    else play.cue('bap', bap(kind, this.next()))
    play.bounce(who, 1 - PERSONALITY[creature.kind].bounce)
    // Crumbs of the hat's own foam fly from where it comes down, and lie a moment.
    this.crumbsAt(who, kind, tower ? 6 : 4)
    if (tower) {
      // A second hat: the tower slips over its eyes and it totters, bewildered and never hurt. A loose hat makes the
      // tower lean with a creak; the top of another tower lands with a second soft thump.
      if (object === 'loose-hat') {
        play.cue('creak', creak(this.next()), 0.09)
        if (carried) play.landsAskew(hat)
      }
      else if (object === 'tower-top') play.cue('bap', bap(kind, this.next()), 0.09)
      play.act(who, 'totters-blind')
      this.says(who, 'grump', 0.14)
      // Whoever is left bare looks from the tower to its own head and pats it: it shows where the hat went.
      for (const other of this.saved.crew) {
        if (other.hats.length > 0) continue
        play.look(other.kind, spotX(creature.spot), ROW_Z, 0.9, 0.7)
        play.after(0.9, () => { if (play.has(other.kind) && play.worn(other.kind) === 0) play.act(other.kind, 'pats-its-bare-head') })
      }
    } else {
      if (object === 'loose-hat') play.act(who, 'ducks-under')
      else this.reacts(who, kind)
      // A hat off the floor is ducked under first; then, like any hat, it gets this creature's own reaction to exactly this hat.
      if (object === 'loose-hat') play.after(ACTS['ducks-under'].lasts + 0.06, () => { if (play.has(who) && play.hatOn(who, 0) === hat && play.worn(who) === 1 && !play.walking(who) && play.acting(who) === null) this.reacts(who, kind) })
      this.says(who, moodFor(tasteFor(creature.kind, kind)), 0.1)
    }
    if (creature.hats.length === 1) play.everyoneLooks(spotX(creature.spot), ROW_Z, 1.2, who)
  }

  /** A creature was pulled and let go: it does something funny with whoever or whatever it was pulled to, and stays on its spot. */
  private comedy(who: string, other: string | null, action: Action): void {
    const play = this.play, bare = this.saved.crew.find((one) => one.kind === who)!.hats.length === 0
    this.note(bare ? 'bare-creature' : 'hatted-creature', action)
    this.pace = touched(this.pace, this.saved)
    const hat = this.saved.tile[this.saved.crew.find((one) => one.kind === who)!.hats[0] ?? 0]
    // What it does, it does towards the other one, or towards the tile: each of the two faces the other, and comes as near as leaves a finger's width between them.
    const mine = this.saved.crew.find((one) => one.kind === who)!, theirs = other ? this.saved.crew.find((one) => one.kind === other)! : null
    const here = spotX(mine.spot), there = theirs ? spotX(theirs.spot) : tileX(this.saved.tile.length)
    // How wide each can get while it acts: its hands, pushed out as it squashes; its hat; and Flop's ears, flung out.
    const widest = (one: { kind: CreatureKind; hats: number[] }): number => Math.max((BODY[one.kind].reach + HAND.radius) * SQUASH_WIDENS, one.kind === 'flop' ? EARS_FLUNG : 0, ...one.hats.map((worn) => HAT_HALF[this.saved.tile[worn]]))
    // Each has the room between it and whoever stands nearest on the side it turns to, which need not be the one it turns to: half of it, less a finger's width.
    const roomFor = (one: { kind: CreatureKind; spot: number; hats: number[] }, toward: number): number => {
      const side = Math.sign(toward - spotX(one.spot)) || 1
      const beside = this.saved.crew.filter((next) => (next.spot - one.spot) * side > 0).sort((a, b) => Math.abs(a.spot - one.spot) - Math.abs(b.spot - one.spot))[0]
      return beside ? (Math.abs(spotX(beside.spot) - spotX(one.spot)) - widest(one) - widest(beside)) / 2 - 0.04 : Infinity
    }
    const act = (one: string, name: string): void => play.act(one, name, one === who ? there : here, roomFor(one === who || !theirs ? mine : theirs, one === who ? there : here))
    if (bare && action === 'to-bare-head' && other) {
      act(who, 'boings-and-pats'); act(other, 'boings-and-pats')
      play.cue('plop', plop(hat, this.next())); this.says(who, 'ask', 0.3); this.says(other, 'ask', 0.5)
    } else if (bare && action === 'to-hatted-head' && other) {
      act(who, 'peeks-up-under'); play.act(other, 'lifts-it-like-a-lid')
      play.cue('hum', hum(play.kindOf(who), this.next()), 0.15); play.speaks(who, 0.6); play.cue('pip', pip(hat, this.next()), 0.45); this.says(other, 'plain', 0.7)
    } else if (bare && action === 'to-tile') {
      act(who, 'babbles-into-a-hole'); this.says(who, 'ask', 0.2); play.cue('hoot', hoot(this.next()), 0.6)
    } else if (bare) {
      play.act(who, 'twangs-back'); play.cue('twang', twang(this.next()))
    } else if (action === 'to-bare-head' && other) {
      act(who, 'bows-and-tips-its-hat'); play.act(other, 'claps')
      play.look(other, here, ROW_Z, 1)
      this.says(who, 'plain'); play.cue('clap', clap(this.next()), 0.4); play.cue('clap', clap(this.next()), 0.65)
    } else if (action === 'to-hatted-head' && other) {
      act(who, 'knocks-hats'); act(other, 'knocks-hats')
      play.cue('tok', tok(this.next()), 0.3); this.says(who, 'plain', 0.4); this.says(other, 'plain', 0.6)
    } else if (action === 'to-tile') {
      act(who, 'shakes-its-hat-out'); play.cue('flap', flap(this.next()), 0.4); this.says(who, 'ask', 0.9)
      // Nothing falls out, and it shrugs.
      play.after(ACTS['shakes-its-hat-out'].lasts + 0.06, () => { if (play.has(who) && !play.walking(who) && play.acting(who) === null) play.act(who, 'shrugs') })
    } else {
      play.act(who, 'twangs-holding-its-hat'); play.cue('dwong', dwong(this.next())); this.says(who, 'plain', 0.3)
    }
  }
}
