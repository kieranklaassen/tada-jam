import { farBlow } from './badger'
import { BODY_APART, FOX_HOME_END, HEDGEHOG_MAT, HOOK_GRIP, PLACES, REACH, WORMS, type Box } from './layout'
import { beginMoths, settleMoths } from './moths'
import { hootAway } from './owl'
import { comeTo, lookAway } from './fox'
import { Scene, type Beat } from './scene'
import { copySheet } from './sheet'
import { handSpots, type Spot } from './spots'
import type { SoundEvent, SoundKind } from './sounds'
import { beginCycle, finishCycle, STATE_VERSION } from './state'
import type { Save } from './save'
import { Table } from './table'
import { STEP, Wood, clamp, freshWood, type Creature } from './wood'

// The whole game as numbers: the table, the wood, the three short scenes
// between them, and what each finger on the glass is doing. The Mount hands
// it pointers in stage units and seconds of play, and gets back sounds and a
// call when something must be saved; everything else is in here, where a
// test can play it.
//
// One clock: `time` is the seconds of play, the table and the wood step with
// it, the scenes' beats are timed on it, and so is a lifted finger's grace.

/** A finger that stays within this of where it landed has not moved, in stage units. */
export const SLOP = 14
/** Seconds a lifted carry or cut waits where it was let go for a finger to come back. */
export const GRACE = 0.3
/** How near the thing in hand a finger must land to carry on with it. */
export const REGRAB = 140
/** Seconds a finger may lie still before the next finger that lands takes the work. */
export const RESTING = 1
/** Seconds of a walk after which the idle hand shows the way to the hook, whatever else it has shown. */
export const LONG_WALK = 60
/** How far the hung lantern must be pulled for it to come off its hook. */
export const PULL = 60

export const SCENE_SECONDS = { out: 6, home: 8, down: 4 } as const
/** Where the lantern comes out of the door and goes back in. */
const DOOR_GRIP = { x: REACH.right, y: PLACES.lantern.y }

type Worker = {
  /** The pointer that works, or null while it is lifted and the thing in hand waits. */
  id: number | null
  x0: number; y0: number
  x: number; y: number
  downAt: number
  moved: boolean
  /** It landed again on the thing in hand and has not moved since: lifted like that, it is a tap. */
  again: boolean
  /** It landed where nothing is. */
  idle: boolean
  /** It landed on the hung lantern, and may pull it off its hook. */
  pulls: boolean
  /** It landed on a lantern whose candle is out: if it goes on to drag, the candle lights as it would for a tap. */
  lamp: boolean
  /** It landed on the lantern in the wood: lifted without moving, it has tapped the lantern, and not a place to bring it to. */
  onIt: boolean
  liftedAt: number
}

export class Game {
  time = 0
  private owed = 0
  position: string
  finished: boolean
  /** Where the game is, as the save has it. During a scene the screen may still show the other place. */
  place: 'table' | 'wood'
  table: Table
  wood: Wood | null = null
  /** What a scene is showing, apart from what is saved. */
  readonly show = { room: true, dim: 0, door: 0, smoke: 0, glow: 1 }
  private scene: Scene | null = null
  /** Where the ending will leave what it moves: the save holds these from the scene's first moment. */
  private ending: { fox: number; hedgehog: number; moths: 'bark' | 'lantern' } | null = null
  /** The first scene is carrying the lantern out to the step: the save holds it on the step from the scene's first moment. */
  private arriving = false
  private worker: Worker | null = null
  private events: SoundEvent[] = []
  /** The hand's places in the wood, worked out again when the sheet or a walking creature has changed. */
  private spots: Spot[] = []
  private spotKey = ''
  /**
   * What the hand has shown in this wood since it was opened: the creatures whose places it has carried the
   * lantern to, which showing of the idle stretch it is at, and what that showing points at. Once it has shown
   * every place it has, or the walk has gone on a long while, it shows the way to the hook. None of it is saved.
   */
  private readonly shown = new Set<Creature>()
  private shownIn: Wood | null = null
  private walkSince = 0
  private showingNow = -1
  private pointsAt: Creature | 'hook' = 'hook'
  private kept = ''
  private rested = ''
  /** Called when the state changed: `now` for a change that must not wait, false for one that keeps coming. */
  onSave: (now: boolean) => void = () => {}

  constructor(save: Save, private readonly seed: number) {
    this.position = save.position
    this.finished = save.finished
    this.place = save.place
    this.table = new Table(save.made, save.sheet)
    this.open(save)
  }

  /** Sets everything up from a save, as it was left: nothing eases in, nothing is in the air and no scene replays. */
  private open(save: Save): void {
    this.position = save.position
    this.finished = save.finished
    this.place = save.place
    this.table = new Table(save.made, save.sheet, this.time)
    this.wood = save.place === 'wood' ? new Wood(save, this.table.sheet, this.seed, save.finished, this.time) : null
    // Found as left, and waiting: whatever light lies on a creature, it answers only once a finger has landed.
    if (this.wood) this.wood.still = true
    this.scene = null
    this.ending = null
    this.arriving = false
    this.worker = null
    this.events = []
    this.show.room = save.place === 'table'
    this.show.dim = 0; this.show.door = 0; this.show.smoke = 0; this.show.glow = 1
    this.spotKey = ''
    this.kept = this.suddenKey()
    this.rested = this.restKey()
  }

  toSave(): Save {
    const wood = this.place === 'wood' && this.wood ? this.wood.toSave() : { ...freshWood(), lit: false }
    if (this.arriving) wood.lantern = { ...PLACES.lantern }
    if (this.ending) {
      wood.fox.x = this.ending.fox
      wood.hedgehog.x = this.ending.hedgehog
      wood.moths = this.ending.moths
    }
    return { v: STATE_VERSION, position: this.position, finished: this.finished, place: this.place, made: this.place === 'wood' ? 'lit' : this.table.made, sheet: copySheet(this.table.sheet), ...wood }
  }

  get sceneRunning(): boolean {
    return this.scene !== null && this.scene.running
  }

  /** A finger is working, or the thing in hand is waiting out a lift. */
  get busy(): boolean {
    return this.worker !== null
  }

  /** A finger is at work: down and not resting, or lifted with the thing in hand still waiting for it. */
  get working(): boolean {
    const worker = this.worker
    return worker !== null && (worker.id === null || !(worker.idle || (!worker.moved && this.time - worker.downAt >= RESTING)))
  }

  /** The sounds made since the last call, oldest first. */
  takeEvents(): SoundEvent[] {
    this.gather()
    const out = this.events
    this.events = []
    return out
  }

  private gather(): void {
    const table = this.table.takeEvents()
    for (const event of table) this.events.push(event)
    if (this.wood) for (const event of this.wood.takeEvents()) this.events.push(event)
  }

  private sound(kind: SoundKind, n = 0, scene = false): void {
    this.gather()
    const event: SoundEvent = { kind, at: this.time, n: clamp(n, 0, 1) }
    if (scene) event.scene = true
    this.events.push(event)
  }

  private suddenKey(): string {
    const wood = this.wood
    return `${this.place}|${this.table.made}|${this.finished}|${this.position}|${this.table.rev}|${wood ? `${wood.lit}|${wood.worms.lamps}|${wood.moths.riding}|${wood.met.size}|${wood.hung}` : ''}`
  }

  private restKey(): string {
    const wood = this.wood
    return wood ? `${Math.round(wood.want.x)}|${Math.round(wood.want.y)}|${Math.round(wood.fox.x)}|${Math.round(wood.hedgehog.x)}` : ''
  }

  /** Hands what changed to storage: at once for a change that must not wait, at the throttle for one that keeps coming. */
  private keep(): void {
    const sudden = this.suddenKey()
    if (sudden !== this.kept) {
      this.kept = sudden
      this.rested = this.restKey()
      this.onSave(true)
      return
    }
    const rest = this.restKey()
    if (rest !== this.rested) {
      this.rested = rest
      this.onSave(false)
    }
  }

  // --- Fingers -------------------------------------------------------------------

  /**
   * A finger lands, at a point of the stage. One finger works at a time, and a finger that is carrying or
   * cutting is never interrupted. A finger that landed where nothing is, or has lain still for a second, is
   * resting: the next finger that lands takes the work from it. True when this finger was taken on.
   */
  down(id: number, x: number, y: number): boolean {
    // A touch ends a scene where it is, and is then an ordinary touch.
    this.endScene()
    const worker = this.worker
    if (worker && worker.id !== null) {
      const resting = worker.idle || (!worker.moved && this.time - worker.downAt >= RESTING)
      if (!resting) {
        // The finger at work is not interrupted, and the one that landed is still answered where it landed.
        if (this.show.room) this.table.rap(x, y)
        else this.wood?.rap(x, y)
        return false
      }
      // The resting finger gives the work up. It did not let go, so nothing is dropped, hung or lit by it.
      this.takeAway()
    } else if (worker) {
      // The thing in hand is waiting out a lift: a finger that lands on it carries on.
      const at = this.inHand()
      if (at && Math.hypot(x - at.x, y - at.y) <= REGRAB) {
        worker.id = id
        worker.x = x; worker.y = y
        worker.x0 = x; worker.y0 = y
        worker.again = true
        worker.onIt = !this.show.room && this.wood !== null && this.wood.onLantern(x, y)
        this.dragTo(x, y)
        this.keep()
        return true
      }
      this.letGo()
    }
    const next: Worker = { id, x0: x, y0: y, x, y, downAt: this.time, moved: false, again: false, idle: false, pulls: false, lamp: false, onIt: false, liftedAt: 0 }
    this.worker = next
    if (this.show.room) next.idle = !this.table.press(x, y)
    else if (this.wood) {
      this.wood.still = false
      next.pulls = this.wood.onHung(x, y)
      // On the hook the lantern is the one thing to take: a finger that landed off it rests, and hands the pull to the next finger.
      next.idle = this.wood.hung && !next.pulls
      next.onIt = this.wood.onLantern(x, y)
      next.lamp = !this.wood.lit && next.onIt
      this.wood.press(x, y)
    }
    this.keep()
    return true
  }

  move(id: number, x: number, y: number): void {
    const worker = this.worker
    if (!worker || worker.id !== id) return
    worker.x = x; worker.y = y
    if (Math.hypot(x - worker.x0, y - worker.y0) > SLOP) { worker.moved = true; worker.again = false }
    if (!worker.moved || worker.again) return
    if (worker.lamp) {
      // A finger that landed on the dark lantern and slipped into a drag has still touched the candle: it lights.
      worker.lamp = false
      this.wood?.tap()
    }
    if (worker.pulls && this.wood?.hung) {
      // Pulled far enough, the lantern comes off its hook. The finger is let go of first, so its next move does not end the scene it began.
      if (Math.hypot(x - worker.x0, y - worker.y0) > PULL) {
        this.worker = null
        this.startDown()
      }
      return
    }
    this.dragTo(x, y)
    this.keep()
  }

  up(id: number, x: number, y: number): void {
    const worker = this.worker
    if (!worker || worker.id !== id) return
    worker.x = x; worker.y = y
    if (worker.moved && !worker.again) {
      // A carry survives a lifted finger: the thing in hand waits where it was let go.
      worker.id = null
      worker.liftedAt = this.time
      return
    }
    // A press that did not move is a tap.
    this.worker = null
    if (this.show.room) {
      const did = this.table.release()
      if (did === 'light' || this.table.lights(worker.x0, worker.y0)) this.startOut()
      else if (did === 'fresh') this.fresh()
    } else if (this.wood) {
      // A tap on the lantern lights it or wakes the badger; a tap anywhere else brings the lantern there as it is.
      // It never hangs the lantern, wherever it lands.
      if (worker.onIt) this.wood.tap()
      this.wood.setDown()
    }
    this.keep()
  }

  /** The browser took the finger away. It never acts for the child: nothing is dropped, hung, lit or cut by it. */
  cancel(id: number): void {
    const worker = this.worker
    if (!worker || worker.id !== id) return
    this.takeAway()
    this.keep()
  }

  private takeAway(): void {
    this.worker = null
    if (this.show.room) this.table.cancel()
    else this.wood?.drop()
  }

  /** Where the thing in hand is, or null when the hand is empty. */
  private inHand(): { x: number; y: number } | null {
    if (this.show.room) {
      const hand = this.table.hand
      if (!hand) return null
      if (hand.kind === 'cut') return this.table.scissors
      if (hand.kind === 'roll') return this.worker
      return hand
    }
    return this.wood && this.wood.holding ? this.wood.want : null
  }

  private dragTo(x: number, y: number): void {
    if (this.show.room) this.table.drag(x, y)
    else this.wood?.drag(x, y)
  }

  /** The child let the thing in hand go, and it is set down where it is: a hand or a hook takes it only now. */
  private letGo(): void {
    this.worker = null
    if (this.show.room) {
      const did = this.table.release()
      if (did === 'fresh') this.fresh()
      // A finger that only slipped on the lantern with the candle in has tapped it: the wick lights.
      else if (did === 'light') this.startOut()
    } else if (this.wood?.release()) this.startHome()
  }

  /** A fresh sheet landed: it is the sheet the position names. */
  private fresh(): void {
    this.table.lay(this.position)
  }

  // --- Time ----------------------------------------------------------------------

  /** Plays `seconds` of the game in fixed steps. What is left over waits for the next call. */
  step(seconds: number): void {
    this.owed += seconds
    while (this.owed >= STEP) {
      this.owed -= STEP
      this.tick()
    }
  }

  tick(): void {
    this.time += STEP
    const worker = this.worker
    if (worker && worker.id === null && this.time - worker.liftedAt > GRACE) this.letGo()
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.scene = null
    }
    this.table.tick(STEP)
    this.wood?.tick()
    this.gather()
    this.keep()
  }

  /**
   * The game is put away, at any instant. A thing the child had let go, and which was still waiting out the lift,
   * is let go for good where it was: the cut is cut, the paper is tucked, the fresh sheet lands, the lantern is
   * hung. A finger still down is taken away, which drops nothing. A scene lands where its start saved it, and
   * everything is set up again from the save, so a parked game is the game a load would give.
   */
  park(): void {
    const worker = this.worker
    if (worker && worker.id === null) this.letGo()
    else if (worker) this.takeAway()
    this.endScene()
    this.open(this.toSave())
  }

  // --- Scenes ----------------------------------------------------------------------

  private endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
    // What the wood made a sound for while the beats landed belongs to the scene, and is not heard.
    this.gather()
    this.events = this.events.filter((event) => !event.scene)
  }

  private play(beats: Beat[]): void {
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => {
      this.kept = this.suddenKey()
      this.rested = this.restKey()
      this.onSave(true)
    })
  }

  /**
   * A beat that only makes a sound, and makes none when a touch is ending the scene. It sounds one step after
   * `at`, where the motion it belongs to starts, so the motion is already seen to move in the step that sounds.
   */
  private cue(at: number, kind: SoundKind, n = 0): Beat {
    return { at: at + STEP, lasts: 0, play: (_, finishing) => { if (!finishing) this.sound(kind, n, true) } }
  }

  /** Out of the door: the tap that lights the wick. */
  private startOut(): void {
    const table = this.table
    table.made = 'lit'
    table.rev++
    table.held = true
    this.place = 'wood'
    this.finished = false
    const wood = new Wood(freshWood(), table.sheet, this.seed, false, this.time)
    wood.still = true
    wood.inScene = true
    wood.awake.fill(0)
    wood.want.x = wood.grip.x = DOOR_GRIP.x
    wood.place()
    this.wood = wood
    this.arriving = true
    // The flame catches in the touch itself.
    table.flame = 0.15
    this.sound('catch')
    const beats: Beat[] = [
      { at: 0, lasts: 0.6, play: (p) => { table.flame = Math.max(table.flame, p) } },
      { at: 0.6, lasts: 1.4, play: (p) => { this.show.dim = p } },
      this.cue(1.6, 'door'),
      { at: 1.6, lasts: 1.2, play: (p) => { this.show.door = p } },
      { at: 2.8, lasts: 0, play: () => { this.show.room = false } },
      {
        at: 2.8, lasts: 1.2,
        play: (p, finishing) => {
          wood.want.x = DOOR_GRIP.x + (PLACES.lantern.x - DOOR_GRIP.x) * p
          if (finishing || p >= 1) wood.want.x = PLACES.lantern.x
          if (finishing) { wood.grip.x = wood.want.x; wood.grip.vx = 0; wood.swing = 0; wood.swingSpeed = 0; wood.place() }
        },
      },
    ]
    for (let i = 0; i < wood.awake.length; i++) {
      beats.push(this.cue(4.0 + i * 0.3, 'eyes', i / (wood.awake.length - 1)))
      beats.push({ at: 4.0 + i * 0.3, lasts: 0.25, play: (p) => { wood.awake[i] = p } })
    }
    // The scene is over and the wood waits: the creatures answer the light from the first touch on.
    beats.push({ at: SCENE_SECONDS.out, lasts: 0, play: () => { wood.inScene = false; table.held = false; this.show.dim = 0; this.show.door = 0; this.arriving = false } })
    this.play(beats)
  }

  /** Home: the lantern was let go on the hook. The walk is over, and the position moves if it went well. */
  private startHome(): void {
    const wood = this.wood!
    const met = wood.met
    // A walk with a window the child cut goes well; any other is mixed; none goes badly.
    const judged = finishCycle({ v: STATE_VERSION, position: this.position, finished: false }, this.table.sheet.some((window) => window.cut) ? 'well' : 'mixed')
    this.position = judged.position
    this.finished = true
    const moths = met.has('moths') && wood.patchOf('yellow') !== null
    // The fox ends a body's length short of wherever the hedgehog ends, so the two never stand one above the other.
    // The fox comes to its place, a body's length short of the moths' tree, whether or not the hedgehog was met: a hedgehog that stands in its road steps aside for it, as it always does.
    const hogEnd = met.has('hedgehog') ? HEDGEHOG_MAT : met.has('fox') ? Math.max(wood.hedgehog.x, FOX_HOME_END + BODY_APART) : wood.hedgehog.x
    const foxEnd = met.has('fox') ? FOX_HOME_END : wood.fox.x
    this.ending = { fox: foxEnd, hedgehog: hogEnd, moths: moths || wood.moths.riding ? 'lantern' : 'bark' }
    const ending = this.ending
    wood.inScene = true
    wood.bump(1.5)
    this.show.glow = 0
    wood.glow = 0
    this.sound('hang', 0, true)
    let hooted = false
    const beats: Beat[] = [
      { at: 1.2, lasts: 0.8, play: (p) => { this.show.glow = p; wood.glow = p } },
      {
        at: 2.0, lasts: 0,
        play: (_, finishing) => {
          if (moths && wood.moths.act !== 'yellow') beginMoths(wood, 'yellow')
          if (finishing) settleMoths(wood)
        },
      },
      {
        at: 2.6, lasts: 0,
        play: (_, finishing) => {
          if (!met.has('fox')) return
          if (finishing) {
            wood.fox.x = ending.fox
            lookAway(wood)
            if (!met.has('hedgehog')) { wood.hedgehog.x = ending.hedgehog; wood.hedgehog.aside = null }
          } else comeTo(wood, ending.fox)
        },
      },
      {
        at: 3.4, lasts: 0.9,
        play: (p, finishing) => {
          if (!met.has('owl')) return
          const owl = wood.owl
          // One hoot, and the head is seen to go round and come back.
          if (!finishing && !hooted) { hooted = true; hootAway(wood) }
          if (p >= 1) { owl.away = false; if (finishing) owl.yaw = 0 }
        },
      },
    ]
    if (met.has('worms')) {
      for (let i = 0; i < WORMS; i++) {
        beats.push({ at: 4.4 + i * 0.11, lasts: 0, play: (_, finishing) => { if (!finishing && (wood.worms.lamps >> i) & 1) { wood.worms.pulse[i] = 1; wood.sound('chime', i / (WORMS - 1)) } } })
      }
    }
    beats.push({
      at: 5.0, lasts: 0,
      play: (_, finishing) => {
        if (!met.has('hedgehog')) return
        if (finishing) { wood.hedgehog.x = ending.hedgehog; wood.hedgehog.goTo = null; wood.hedgehog.mode = 'stand' } else wood.hedgehog.goTo = ending.hedgehog
      },
    })
    // The badger blows at a candle that burns, whatever it was at. A candle that is out it has already dealt with: it sleeps on.
    beats.push({ at: 6.6, lasts: 0, play: (_, finishing) => { if (!finishing && met.has('badger') && wood.lit) farBlow(wood) } })
    beats.push({
      at: SCENE_SECONDS.home, lasts: 0,
      play: () => {
        // Whatever was still on its way is where it was going.
        if (wood.fox.goTo !== null) { wood.fox.x = wood.fox.goTo; lookAway(wood) }
        if (wood.hedgehog.aside !== null && !met.has('hedgehog')) { wood.hedgehog.x = ending.hedgehog; wood.hedgehog.aside = null; wood.hedgehog.mode = 'stand' }
        if (wood.hedgehog.goTo !== null) { wood.hedgehog.x = wood.hedgehog.goTo; wood.hedgehog.goTo = null; wood.hedgehog.mode = 'stand' }
        settleMoths(wood)
        wood.inScene = false
        this.show.glow = 1
        wood.glow = 1
        this.ending = null
      },
    })
    this.play(beats)
  }

  /** Taken down: the child dragged the hung lantern off its hook. The next walk begins at the table. */
  private startDown(): void {
    // The ending may still be running, begun by the let-go a moment ago: it lands first, and nothing of it is left to save.
    this.endScene()
    this.ending = null
    const wood = this.wood!
    const next = beginCycle({ v: STATE_VERSION, position: this.position, finished: this.finished })
    this.finished = next.finished
    this.place = 'table'
    const table = new Table('flat', this.table.sheet, this.time)
    table.rev = this.table.rev + 1
    table.held = true
    table.rolled = 1
    table.flame = wood.lit ? 1 : 0
    table.candle.x = 570; table.candle.y = 502
    this.table = table
    wood.hung = false
    wood.still = true
    wood.inScene = true
    const candleFrom = { x: table.candle.x, y: table.candle.y }
    // A lantern that hung dark has no flame to pinch: no pinch sounds and no smoke curls.
    const burns = wood.lit
    const beats: Beat[] = [
      this.cue(0, 'door'),
      { at: 0, lasts: 1, play: (p) => { this.show.door = p } },
      {
        at: 1, lasts: 1,
        play: (p) => {
          wood.want.x = wood.grip.x = HOOK_GRIP.x + (DOOR_GRIP.x - HOOK_GRIP.x) * p
          wood.want.y = wood.grip.y = HOOK_GRIP.y + (DOOR_GRIP.y - HOOK_GRIP.y) * p
        },
      },
      { at: 2, lasts: 0, play: () => { this.show.room = true; this.show.door = 0 } },
      this.cue(2.8, 'unroll'),
      {
        at: 2.8, lasts: 1.2,
        play: (p) => {
          table.rolled = 1 - p
          table.candle.x = candleFrom.x + (944 - candleFrom.x) * p
          table.candle.y = candleFrom.y + (566 - candleFrom.y) * p
        },
      },
      { at: SCENE_SECONDS.down, lasts: 0, play: () => { table.held = false; table.flame = 0; this.show.smoke = 0; this.wood = null } },
    ]
    // Before the beat that ends the scene, so that a touch which lands them all leaves no smoke behind.
    if (burns) beats.splice(beats.length - 1, 0, this.cue(2, 'pinch'), { at: 2, lasts: 0.8, play: (p) => { table.flame = Math.min(table.flame, 1 - p); this.show.smoke = p } })
    this.play(beats)
  }

  // --- Guidance ----------------------------------------------------------------------

  /** What the idle guidance points at now: one thing to glow, and one move the ghost hand shows with it. */
  aim(out: { fromX: number; fromY: number; toX: number; toY: number; tap: boolean; glow: Box; path: number[] | null }, showing = 0): typeof out {
    if (this.show.room) return this.table.aim(out, showing)
    out.path = null
    const wood = this.wood!
    if (wood !== this.shownIn) { this.shownIn = wood; this.shown.clear(); this.walkSince = this.time; this.showingNow = -1 }
    const lantern = wood.lantern
    out.glow = { left: lantern.x - 70, top: lantern.y - 110, right: lantern.x + 70, bottom: lantern.y + 80 }
    out.fromX = out.toX = wood.grip.x; out.fromY = out.toY = wood.grip.y
    out.tap = false
    if (wood.hung) {
      // The hung lantern can be taken down: the hand pulls it off its hook.
      out.fromX = lantern.x; out.fromY = lantern.y
      out.toX = lantern.x - 150; out.toY = lantern.y + 130
      return out
    }
    if (!wood.lit) {
      out.fromX = out.toX = lantern.x; out.fromY = out.toY = lantern.y
      out.tap = true
      return out
    }
    // The nearest creature it is not already standing at: a place from which the sheet in hand lays a patch on it.
    // Worked out only while the hand is shown, and again only when the sheet or a walking creature has changed.
    if (showing < 0) { this.showingNow = -1; return out }
    const key = `${this.table.rev}|${Math.round(wood.fox.x / 4)}|${Math.round(wood.hedgehog.x / 4)}`
    if (key !== this.spotKey) { this.spotKey = key; this.spots = handSpots(wood) }
    if (showing !== this.showingNow) {
      // A new showing chooses once what it points at: the nearest creature's place the hand has not shown yet and
      // the lantern is not standing at. When there is none left, or the walk has gone on a long while, the hook.
      this.showingNow = showing
      this.pointsAt = 'hook'
      let best = Infinity
      for (const spot of this.spots) {
        const far = Math.hypot(spot.x - wood.grip.x, spot.y - wood.grip.y)
        if (far <= 120) this.shown.add(spot.name)
        else if (!this.shown.has(spot.name) && far < best && this.time - this.walkSince < LONG_WALK) { best = far; this.pointsAt = spot.name }
      }
      if (this.pointsAt !== 'hook') this.shown.add(this.pointsAt)
    }
    const spot = this.pointsAt === 'hook' ? null : this.spots.find((at) => at.name === this.pointsAt)
    // The way home: the hand carries the lantern's ring onto the hook by the door.
    out.toX = spot ? spot.x : HOOK_GRIP.x; out.toY = spot ? spot.y : HOOK_GRIP.y
    return out
  }
}
