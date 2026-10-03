import { inCompany, placeOf, standsAt, weightOn, type Arrangement } from './arrangement'
import { landingOf, reactionsTo, tossed, type Landing, type Reaction } from './cells'
import { Grains } from './grains'
import type { Guidance } from './guidance'
import { bite as biteMark, biteDepth, furrow, rake as rakeMarks, rakeIsOut, ring as ringMark, stamp } from './marks'
import { HOLD_HEIGHT, Playground, type PlayEvent } from './motion'
import type { Frame } from './pose'
import { layout, rideOf, type Kind, type Ride } from './rides'
import { afterMove, beginRide, endRide, markShown, rideIsOver, save, type Saved, type World } from './save'
import { Scene, type Beat } from './scene'
import { endingBeats, showingBeats } from './scenes'
import { moodOf } from './tastes'
import * as v from './voices'
import type { Part } from './voices'
import { FRIEND_IDS, FRIENDS, PLANK, otherEnd, type FriendId } from './world'

// The game on the toy: rides, their endings, the showings, the friends'
// reactions, the sand's marks and what is saved, joined to the playground in
// motion. No renderer and no DOM: the Mount tells it what the finger touched
// and plays the cues it hands back. Nothing here rates, counts for the child
// or praises: the only count is the hidden one of moves in a ride.

export type Touched = { kind: 'friend'; id: FriendId } | { kind: 'plank'; along: number } | { kind: 'sand'; x: number; z: number } | { kind: 'rake' } | { kind: 'none' }

/** What the Mount does for the game: a sound to play, or a mark to draw in the sand. */
export type Cue =
  | { type: 'voice'; parts: readonly Part[] }
  | { type: 'dimple'; x: number; z: number; radius: number; depth: number }
  | { type: 'groove'; x0: number; z0: number; x1: number; z1: number }
  | { type: 'bite'; x: number; strength: number }
  | { type: 'ring'; x: number; z: number; radius: number }
  | { type: 'rake' }

type Pressed = { kind: 'friend'; id: FriendId } | { kind: 'sand'; x: number; z: number } | { kind: 'other' }

/** A finger must travel this far over the sand before the groove grows, in tray units. */
const GROOVE_STEP = 0.14
const HISS_EVERY = 0.09
/** Idle seconds after which the asker gives one small hop: three times at most, further and further apart. */
export const ASK_AT = [2.5, 10.5, 26.5] as const
/** Bo snores this many times after he dozes off, then sleeps quietly. */
export const SNORES = 4
/** Seconds the rake takes to cross the tray. */
export const RAKE_SECONDS = 1.2

export class Game {
  world: World
  readonly play: Playground
  readonly grains: Grains
  time = 0
  /** What the Mount should do about storage: nothing, at the throttle, or at once. It clears this when it has. */
  wantsSave: 'no' | 'soon' | 'now' = 'no'
  /** The idle guidance, for the view: who the glow is on, how strong, and how far through the hand's one tap. */
  readonly guide: { on: FriendId | null; glow: number; hand: number | null } = { on: null, glow: 0, hand: null }
  /** 0 to 1 while the rake crosses the tray, else null. */
  rakeSweep: number | null = null
  frame: Frame
  private scene: Scene | null = null
  private sceneKind: 'ending' | 'showing' | null = null
  /** A touch ended the scene: its beats land where they were going and do nothing else. */
  cut = false
  private cues: Cue[] = []
  private later: { at: number; reaction: Reaction }[] = []
  private pressed: Pressed = { kind: 'other' }
  private landings: Partial<Record<FriendId, Landing>> = {}
  private pendingShowing: Kind | null
  private idle = 0
  private asked = 0
  private said = 0
  private lastHiss = -1
  private snores = 0
  private snoreAt = 0
  private company: boolean
  private lastDemo = -1

  constructor(world: World, seed: number) {
    this.world = world
    this.play = new Playground(world.arrangement, seed)
    this.grains = new Grains(seed + 17)
    this.company = inCompany(world.arrangement)
    this.pendingShowing = this.wantsShowing() ? world.kind : null
    this.moods()
    this.frame = this.play.frame()
  }

  get ride(): Ride {
    return rideOf(this.world.kind, this.world.turn)
  }

  /** A scene is playing: an ending or a showing. The Mount keeps the idle ladder at the bottom meanwhile. */
  get sceneRunning(): boolean {
    return this.scene !== null
  }

  get rakeOut(): boolean {
    return this.rakeSweep !== null || rakeIsOut(this.world.marks)
  }

  /** What goes to storage now: who is where, never a friend in the air or in the hand. */
  saved(): Saved {
    return save(this.world)
  }

  takeCues(): Cue[] {
    const cues = this.cues
    this.cues = []
    return cues
  }

  // --- The finger -----------------------------------------------------------

  /** The finger landed. A scene that is playing ends first; then the touch is an ordinary touch and is answered at once. */
  press(touched: Touched): void {
    this.idle = 0
    this.asked = 0
    if (this.scene) this.endScene(true)
    // The child acted before the showing began: it waits for the next time this kind is laid out.
    this.pendingShowing = null
    this.pressed = { kind: 'other' }
    if (touched.kind === 'friend') {
      this.play.touch(touched.id)
      this.pressed = { kind: 'friend', id: touched.id }
    } else if (touched.kind === 'plank') this.tapPlank(touched.along)
    else if (touched.kind === 'sand') {
      this.play.pokeSand(touched.x, touched.z)
      this.pressed = { kind: 'sand', x: touched.x, z: touched.z }
    } else if (touched.kind === 'rake') this.rake()
    else this.voice(v.poke())
  }

  tap(): void {
    const pressed = this.pressed
    this.pressed = { kind: 'other' }
    if (pressed.kind !== 'friend') return
    if (this.world.arrangement.waiting === pressed.id) this.begin()
    else this.moved(pressed.id, () => this.play.tapFriend(pressed.id))
  }

  dragStart(): void {
    const pressed = this.pressed
    if (pressed.kind !== 'friend') return
    // The friend who waits is not carried: any touch that takes hold of it begins the next ride.
    if (this.world.arrangement.waiting === pressed.id) {
      this.pressed = { kind: 'other' }
      this.begin()
    } else this.play.grab(pressed.id)
  }

  /** The finger moved: `over` is where it is above the tray at carrying height, `sand` where it is on the sand; either may be null. */
  dragTo(over: { x: number; z: number } | null, sand: { x: number; z: number } | null): void {
    const pressed = this.pressed
    if (pressed.kind === 'friend' && this.play.held && over) this.play.carryTo(over.x, over.z)
    else if (pressed.kind === 'sand' && sand && Math.hypot(sand.x - pressed.x, sand.z - pressed.z) >= GROOVE_STEP) {
      this.play.dragSand(pressed.x, pressed.z, sand.x, sand.z)
      pressed.x = sand.x
      pressed.z = sand.z
    }
  }

  dragEnd(): void {
    const id = this.play.held
    this.pressed = { kind: 'other' }
    if (id) this.moved(id, () => this.play.release())
  }

  pressEnd(): void {
    this.pressed = { kind: 'other' }
  }

  /** How high above the sand the middle of a carried friend hangs, for the Mount to find the point under the finger. */
  get carryHeight(): number {
    return HOLD_HEIGHT + (this.play.held ? FRIENDS[this.play.held].halfHeight : 0)
  }

  // --- A step ---------------------------------------------------------------

  step(dt: number, guidance: Guidance): void {
    this.time += dt
    this.idle += dt
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.endScene(false)
    }
    this.play.advance(dt)
    this.grains.step(dt)
    for (const event of this.play.takeEvents()) this.answer(event)
    if (this.later.length) {
      const due = this.later.filter((item) => item.at <= this.time)
      if (due.length) {
        this.later = this.later.filter((item) => item.at > this.time)
        for (const item of due) this.apply(item.reaction)
      }
    }
    if (this.rakeSweep !== null) {
      this.rakeSweep += dt / RAKE_SECONDS
      if (this.rakeSweep >= 1) this.rakeSweep = null
    }
    if (!this.scene && !this.play.held) {
      if (this.pendingShowing && this.play.settled) this.startShowing(this.pendingShowing)
      else if (rideIsOver(this.world) && this.play.plankArrived && this.play.bodies[this.ride.asker].landed) this.startEnding()
    }
    this.looks()
    this.snore()
    this.dotAlone()
    this.guideFrom(guidance)
    this.frame = this.play.frame(this.guide.glow, this.guide.on)
  }

  // --- Moves ------------------------------------------------------------------

  /** The child moved a friend: the world takes it in, the move is counted if a ride runs, and the landing is remembered for when it lands. */
  private moved(id: FriendId, act: () => void): void {
    const before = this.play.arrangement
    act()
    const after = this.play.arrangement
    this.world = afterMove(this.world, after)
    this.landings[id] = landingOf(before, after, id)
    this.wantSave('soon')
    this.moods()
  }

  /** The child touched the friend who waits: the next ride is laid out, and everyone hops to their places. */
  private begin(): void {
    const before = this.world
    this.world = beginRide(this.world)
    if (this.world === before) return
    this.wantSave('now')
    this.landings = {}
    this.later = []
    this.play.relayout(this.world.arrangement)
    this.voice(v.chirp(this.ride.asker, this.said++))
    this.moods()
    this.pendingShowing = this.world.shown.includes(this.world.kind) ? null : this.world.kind
  }

  private wantsShowing(): boolean {
    const world = this.world
    if (world.state.finished || world.moves > 0 || world.shown.includes(world.kind)) return false
    return JSON.stringify(world.arrangement) === JSON.stringify(layout(rideOf(world.kind, world.turn)))
  }

  // --- Scenes -----------------------------------------------------------------

  /** The ending of a ride. Its outcome goes into the world, and to storage at once, before the first beat. */
  private startEnding(): void {
    const ride = this.ride, before = this.play.arrangement
    const place = placeOf(before, ride.asker)
    if (place.at !== 'end') return
    const lifters = [...before[otherEnd(place.end)]]
    this.world = endRide(this.world)
    this.wantSave('now')
    this.play.look(ride.asker, 0, 0)
    this.run('ending', endingBeats(this, ride.asker, lifters))
  }

  /** A showing: once ever for each kind. That it has played, and the world as it stands at its end, are saved before the first beat. */
  private startShowing(kind: Kind): void {
    this.pendingShowing = null
    this.world = markShown(this.world, kind)
    this.wantSave('now')
    this.run('showing', showingBeats(this, this.ride))
  }

  private run(kind: 'ending' | 'showing', beats: Beat[]): void {
    this.cut = false
    this.sceneKind = kind
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => {})
  }

  /** The scene is over, by itself or because a touch ended it: every beat is at its end, and the playground stands as the saved world has it. */
  private endScene(touched: boolean): void {
    const scene = this.scene, kind = this.sceneKind
    if (!scene) return
    this.cut = touched
    scene.finish()
    this.scene = null
    this.sceneKind = null
    this.cut = false
    if (touched) {
      this.later = []
      this.landings = {}
      // A showing ended by a touch is found finished: everyone at once where its end has them.
      if (kind === 'showing') this.play.settleTo(this.world.arrangement)
    }
    if (JSON.stringify(this.play.arrangement) !== JSON.stringify(this.world.arrangement)) this.play.relayout(this.world.arrangement)
    else this.play.arrangement = this.world.arrangement
    this.moods()
    this.company = inCompany(this.world.arrangement)
  }

  // --- What the scenes may do (scenes.ts) -------------------------------------

  /** A reaction now, or after its own small delay. */
  react(reactions: readonly Reaction[]): void {
    for (const reaction of reactions) {
      if (reaction.after <= 0) this.apply(reaction)
      else this.later.push({ at: this.time + reaction.after, reaction })
    }
  }

  voice(parts: readonly Part[]): void {
    this.cues.push({ type: 'voice', parts })
  }

  nextSaid(): number {
    return this.said++
  }

  /** For a showing: remember how a friend it moved will land, so the landing plays its cell like any other. */
  expectLanding(before: Arrangement, id: FriendId): void {
    this.landings[id] = landingOf(before, this.play.arrangement, id)
  }

  // --- What happened, into sound and sand ---------------------------------------

  private apply(reaction: Reaction): void {
    if (reaction.act) this.play.act(reaction.who, reaction.act, reaction.seconds ?? 0.6, reaction.way ?? 0)
    if (reaction.voice) this.voice(reaction.voice)
    if (reaction.mark === 'ring') {
      const at = standsAt(this.play.arrangement, reaction.who), radius = FRIENDS[reaction.who].radius * 1.25
      ringMark(this.world.marks, at.x, at.z, radius)
      this.cues.push({ type: 'ring', x: at.x, z: at.z, radius })
      this.wantSave('soon')
    }
  }

  private answer(event: PlayEvent): void {
    const marks = this.world.marks
    if (event.type === 'touch') this.voice(v.chirp(event.id, this.said++))
    else if (event.type === 'leap') this.voice(v.leap(event.id))
    else if (event.type === 'lift') this.voice(v.lift(event.id))
    else if (event.type === 'slide') this.voice(v.slide())
    else if (event.type === 'creak') this.voice(v.creak(event.strength))
    else if (event.type === 'toss') this.react(tossed(event.id, event.speed))
    else if (event.type === 'level') {
      this.voice(v.levelHum())
      // Everyone on the floating plank sways with it, one after another.
      const riders = [...this.play.arrangement.left, ...this.play.arrangement.right]
      riders.forEach((id, index) => this.react([{ who: id, after: index * 0.12, act: 'sway', seconds: 1.6, way: index % 2 ? -1 : 1 }]))
    } else if (event.type === 'land') {
      const spec = FRIENDS[event.id], hard = event.speed / 9
      this.voice(v.thump(spec.weight, event.on, hard))
      if (event.on === 'sand') {
        const depth = Math.min(1, 0.35 + 0.16 * spec.weight)
        stamp(marks, event.x, event.z, spec.radius * 0.8, 2 + spec.weight)
        this.cues.push({ type: 'dimple', x: event.x, z: event.z, radius: spec.radius * 0.8, depth })
        this.grains.burst(event.x, event.z, 0.25 + 0.15 * spec.weight, 4 + spec.weight * 3)
        this.wantSave('soon')
      }
      const landing = this.landings[event.id]
      if (landing) {
        delete this.landings[event.id]
        this.react(reactionsTo(landing))
      }
    } else if (event.type === 'knock') {
      const weight = weightOn(this.play.arrangement, event.end), power = Math.min(1, event.speed / 3)
      this.voice(v.knock(event.speed))
      this.voice(v.crunch(weight))
      biteMark(marks, event.x, biteDepth(weight))
      this.cues.push({ type: 'bite', x: event.x, strength: power })
      // A ring of sand flies from under the end that came down, and the end that lifted lets grains slide back.
      this.grains.burst(event.x, PLANK.z, 0.35 + 0.65 * power, Math.round(8 + 22 * power), PLANK.halfWidth * 2)
      if (power > 0.45) {
        this.voice(v.whisper())
        // Thrown grains settle on the heads of whoever rides.
        if (this.play.arrangement.left.length + this.play.arrangement.right.length > 1) this.react([{ who: 'pim', after: 0.35, voice: v.patter() }])
      }
      this.wantSave('soon')
    } else if (event.type === 'poke') {
      this.voice(v.poke())
      stamp(marks, event.x, event.z, 0.24, 6)
      this.cues.push({ type: 'dimple', x: event.x, z: event.z, radius: 0.24, depth: 0.8 })
      this.wantSave('soon')
    } else if (event.type === 'groove') {
      furrow(marks, event.x0, event.z0, event.x1, event.z1)
      this.cues.push({ type: 'groove', x0: event.x0, z0: event.z0, x1: event.x1, z1: event.z1 })
      if (this.time - this.lastHiss >= HISS_EVERY) {
        this.lastHiss = this.time
        this.voice(v.drag(Math.hypot(event.x1 - event.x0, event.z1 - event.z0) / HISS_EVERY))
      }
      this.wantSave('soon')
    }
  }

  /** A tap on the plank: the low end clonks on the sand, the high end dips and twangs, a level plank creaks; riders bob. */
  private tapPlank(along: number): void {
    const tilt = this.play.plank.tilt, side = along >= 0 ? 1 : -1
    this.play.tapPlank(along)
    // The motion model answers every plank tap with a creak; the ends have sounds of their own on top.
    if (Math.abs(tilt) < 0.05) return
    if (Math.sign(tilt) === side) {
      this.voice(v.clonk())
      this.grains.burst(side * PLANK.halfLength * 0.96, PLANK.z, 0.3, 6, PLANK.halfWidth * 2)
    } else this.voice(v.twang())
  }

  /** The rake is drawn once across the tray: even lines again, and nothing else changes. */
  private rake(): void {
    if (this.rakeSweep !== null || !rakeIsOut(this.world.marks)) return
    rakeMarks(this.world.marks)
    this.rakeSweep = 0
    this.cues.push({ type: 'rake' })
    this.voice(v.comb())
    this.wantSave('soon')
  }

  private wantSave(how: 'soon' | 'now'): void {
    if (how === 'now' || this.wantsSave === 'no') this.wantsSave = how
  }

  // --- How the friends are, standing as they stand ------------------------------

  private moods(): void {
    for (const id of FRIEND_IDS) this.play.setMood(id, moodOf(this.play.arrangement, id).mood)
  }

  /** Where everyone looks. The asker looks along the plank to where it wants to go; it never looks at the child to plead. */
  private looks(): void {
    const play = this.play, a = play.arrangement
    if (this.scene) return
    const asking = !this.world.state.finished
    const ride = this.ride
    for (const id of FRIEND_IDS) {
      const at = standsAt(a, id)
      if (a.waiting === id) play.look(id, 0, 0.7)
      else if (asking && id === ride.asker && placeOf(a, id).at === 'end') play.look(id, at.x < 0 ? 0.9 : -0.9, ride.asks === 'up' ? 0.8 : -0.8)
      else play.look(id, Math.max(-0.7, Math.min(0.7, -at.x * 0.25)), placeOf(a, id).at === 'end' ? 0 : 0.35)
    }
    // After a still while the asker gives one small hop on the spot: three times at most, then it only looks.
    if (asking && this.asked < ASK_AT.length && this.idle >= ASK_AT[this.asked] && play.bodies[ride.asker].mode === 'rest' && !play.held) {
      this.asked += 1
      play.act(ride.asker, 'bounce', 0.6)
      this.voice(v.ask(ride.asker))
    }
  }

  /** Bo alone on the plank dozes off and snores a few times, then sleeps on without a sound. Anything landing wakes him. */
  private snore(): void {
    const doze = this.play.bodies.bo.doze
    if (doze < 0.5) {
      this.snores = 0
      this.snoreAt = this.time + 0.8
      return
    }
    if (doze > 0.95 && this.snores < SNORES && this.time >= this.snoreAt) {
      this.snores += 1
      this.snoreAt = this.time + 3.4
      this.voice(v.snore())
    }
  }

  /** Dot left alone in the sand, by a friend who was beside it going away, draws its one ring: once, when it is left. */
  private dotAlone(): void {
    const now = inCompany(this.play.arrangement)
    if (now === this.company) return
    const was = this.company
    this.company = now
    const dot = this.play.bodies.dot
    if (was && !now && placeOf(this.play.arrangement, 'dot').at === 'sand' && dot.mode === 'rest' && !dot.away) {
      this.react([{ who: 'dot', after: 0.6, voice: v.scratch(), act: 'spin', seconds: 1.1, mark: 'ring' }])
    }
  }

  // --- The idle ladder ------------------------------------------------------------

  /**
   * What an idle child is shown: a glow under one friend, then a ghost hand
   * that taps it once. It shows a move, never the answer: after a ride the
   * friend who waits, and during one a friend standing in the sand, taken in
   * turn and not for being the one that would do it.
   */
  private guideFrom(guidance: Guidance): void {
    const guide = this.guide, a = this.play.arrangement
    guide.glow = 0
    guide.hand = null
    if (this.scene || this.play.held) {
      guide.on = null
      return
    }
    if (guidance.glow <= 0 && guidance.demo === null) {
      guide.on = null
      this.lastDemo = -1
      return
    }
    let on: FriendId | null = a.waiting
    if (!on) {
      const asker = this.world.state.finished ? null : this.ride.asker
      const standing = (['mog', 'bo', 'pim', 'dot'] as const).filter((id) => id !== asker && placeOf(a, id).at === 'sand' && this.play.bodies[id].mode === 'rest')
      const turn = Math.max(0, guidance.demoIndex >= 0 ? guidance.demoIndex : this.lastDemo)
      on = standing.length ? standing[turn % standing.length] : (a.right[a.right.length - 1] ?? a.left[a.left.length - 1] ?? null)
    }
    guide.on = on
    guide.glow = guidance.glow
    guide.hand = guidance.demo
    if (guidance.demoIndex >= 0 && guidance.demoIndex !== this.lastDemo) {
      this.lastDemo = guidance.demoIndex
      if (on) this.play.bodies[on].squashV -= 4
    }
  }
}
