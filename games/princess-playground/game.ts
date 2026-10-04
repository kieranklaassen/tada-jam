import { companyOf, inCompany, lean, placeOf, standsAt, tap, weightOn, type Arrangement } from './arrangement'
import { cameDownOn, landingOf, perched, reactionsTo, tossed, type Landing, type Reaction } from './cells'
import { forecast, type SandOp } from './forecast'
import { Grains } from './grains'
import type { Guidance } from './guidance'
import { bite as biteMark, biteDepth, furrow, rake as rakeMarks, rakeIsOut, stamp, swirl as swirlMark } from './marks'
import { Playground, type PlayEvent } from './motion'
import type { Frame } from './pose'
import { askerEnd, layout, rideOf, wantMet, type Kind, type Ride } from './rides'
import { afterMove, beginRide, endRide, markShown, rideIsOver, save, type Saved, type World } from './save'
import { Scene, type Beat } from './scene'
import { endingBeats, showingBeats, showingOpens, type Director } from './scenes'
import { moodOf } from './tastes'
import * as v from './voices'
import type { Part } from './voices'
import { FRIEND_IDS, FRIENDS, MAX_TILT, PLANK, otherEnd, type End, type FriendId } from './world'

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
  | { type: 'swirl'; x: number; z: number; radius: number }
  /** The rake has come to the far side: the sand is drawn again from the saved grid, with whatever was marked while it travelled. */
  | { type: 'raked' }
  | { type: 'rake' }

type Pressed = { kind: 'friend'; id: FriendId } | { kind: 'sand'; x: number; z: number } | { kind: 'other' }

/** A finger must travel this far over the sand before the groove grows, in tray units. */
const GROOVE_STEP = 0.14
const HISS_EVERY = 0.09
/** Idle seconds after which the asker gives one small hop: three times at most, further and further apart. */
export const ASK_AT = [2.5, 10.5, 26.5] as const
/** Seconds between Bo's snores, for as long as he dozes. */
export const SNORE_EVERY = 3.4
/** Seconds between the hums of a plank that floats level, and between the sways of a tower of four, for as long as each holds. */
export const HELD_EVERY = 1.8
/** How often the level hum is struck: a little sooner than one hum dies away, so that it is one long hum for as long as the plank is level. */
export const HUM_EVERY = 1.25
/** Seconds the rake takes to cross the tray. */
export const RAKE_SECONDS = 1.2
/** How long after a ride has begun a tap on its asker is the tail of the touch that began it: seconds. */
const BEGIN_SECONDS = 1.2
/** How long the asker looks one way before it looks the other: at the plank, at the friends who could help. Seconds. */
const ASK_LOOK = 2.2
/** How far a stack sways, by how many it is tall. */
const WOBBLE: Readonly<Record<number, number>> = { 2: 0.7, 3: 0.85, 4: 1.2 }
/** The most an end can carry: all four friends. */
const HEAVIEST = FRIEND_IDS.reduce((sum, id) => sum + FRIENDS[id].weight, 0)
/** How long a purr or a chuckle at being lifted has to itself before an ending may begin: seconds. */
const PERCH_SECONDS = 1
/** The two who like being high. */
const LIKE_HIGH = ['mog', 'bo'] as const
/** How far a friend turns to the one it greets, in radians. */
const GREET_TURN = 1.1

export class Game implements Director {
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
  private snoreAt = 0.8
  private heldAt = 0
  /** Until when the friends on the plank look after Dot, who was just taken away. */
  private lookAfter = 0
  /** Who looks after it: those it was with, on the plank or beside it in the sand. */
  private lookers: readonly FriendId[] = []
  private nextEndOf: World | null = null
  private nextEndIs: End = 'left'
  /** Mog and Bo on the end that is up: whether each has yet said what it makes of it. */
  private perch: Partial<Record<FriendId, 'pending' | 'said'>> = {}
  /** Until when one of them is saying it, and an ending that is due waits. */
  private perchUntil = 0
  /** When the ride on screen was begun by a touch on the friend who waited. */
  private begunAt = -9
  private company: boolean
  private lastDemo = -1
  /** What the scene that is playing does to the sand, as it was read before the scene began and saved with its outcome. */
  private sceneSand: SandOp[] = []
  /**
   * Marks that are in the saved grid already and not yet in the picture, because what makes them has not happened
   * on screen yet: a scene's later beats, or a friend still in the air when the game was put away. Each is drawn
   * when its cause arrives, or all at once when something the child does changes what will happen.
   */
  private owed: SandOp[] = []
  /** Dot's swirl, saved already because what leaves it alone is on its way, and not yet drawn by Dot. */
  private owedSwirl: { x: number; z: number; radius: number } | null = null
  /** For a friend the child has sent and that has not landed yet: the moves counted before it left, and the end it left, or null for the sand. */
  private flights: Partial<Record<FriendId, { base: number; from: End | null }>> = {}
  /** The friend in the hand was taken from the air, on its way from a tap: its flight is still open. */
  private caught: FriendId | null = null

  /** `found`: the world was read from a slot the game had been put away into, not made for a first open. */
  constructor(world: World, seed: number, grains: Grains = new Grains(seed + 17), found = false) {
    this.world = world
    this.play = new Playground(world.arrangement, seed)
    this.grains = grains
    this.company = inCompany(world.arrangement)
    // A showing plays by itself only at the very first open. One that was due and had not begun when the game was
    // put away is still owed: the ride is found laid out, and the showing plays the next time its kind is laid out.
    this.pendingShowing = !found && this.wantsShowing() ? world.kind : null
    // A showing that is due opens as it will play, before anything has been seen: nothing jumps when it begins.
    const opens = this.pendingShowing ? showingOpens(this.ride, world.arrangement) : null
    if (opens) {
      this.play.settleTo(opens.arrangement)
      if (opens.stand) this.play.standAt(opens.stand.id, opens.stand.point)
      if (opens.stand) this.play.plank.tilt = 0
    }
    this.moods()
    this.perchesAsFound()
    // Everyone as found: who asks is known before Bo's doze and Dot's turn are set, so nothing eases in on a load.
    this.looks()
    this.play.asFound()
    this.frame = this.play.frame()
  }

  /** Where everyone is when the scene that is playing is over: the saved world's arrangement. */
  get ends(): Arrangement {
    return this.world.arrangement
  }

  get ride(): Ride {
    return rideOf(this.world.kind, this.world.turn)
  }

  /** A showing is due and has not begun: everyone is where it opens, or on the way there, not yet where the saved ride has them. */
  get showingDue(): boolean {
    return this.pendingShowing !== null
  }

  /** A scene is playing: an ending or a showing. The Mount keeps the idle ladder at the bottom meanwhile. */
  get sceneRunning(): boolean {
    return this.scene !== null
  }

  get rakeOut(): boolean {
    // No tool is on screen before it means something: the rake stays away until the child has touched the game once.
    return this.rakeSweep !== null || (this.world.touched && rakeIsOut(this.world.marks))
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
    if (!this.world.touched) {
      this.world = { ...this.world, touched: true }
      this.wantSave('soon')
    }
    const cut = this.scene !== null
    // A showing has this friend somewhere the ride does not: standing where the showing opens, or on its way in a beat.
    const shown = touched.kind === 'friend' && this.shownAway(touched.id)
    if (this.scene) this.endScene(true)
    // The child acted before the showing began: it waits for the next time this kind is laid out, and everyone goes
    // to where the ride itself has them.
    if (this.pendingShowing) {
      this.pendingShowing = null
      if (showingOpens(this.ride, this.world.arrangement)) this.play.relayout(this.world.arrangement)
    }
    this.pressed = { kind: 'other' }
    if (touched.kind === 'friend') {
      this.play.touch(touched.id)
      // A touch that ended a scene, on the friend who asks next: it was touched where it sat, not where it waits. It
      // goes to the waiting place, and the next ride begins with a touch on it there. A second tap never begins a ride.
      if (cut && this.world.arrangement.waiting === touched.id) return
      // A touch on a friend the showing had moved only ends the showing: the friend goes to where the ride has it,
      // which is not where it was touched, and the touch moves it no further and makes no move.
      if (shown) return
      this.pressed = { kind: 'friend', id: touched.id }
    } else if (touched.kind === 'plank') this.tapPlank(touched.along)
    else if (touched.kind === 'sand') {
      this.play.pokeSand(touched.x, touched.z)
      this.pressed = { kind: 'sand', x: touched.x, z: touched.z }
    } else if (touched.kind === 'rake') this.rake()
    else this.voice(v.poke())
  }

  /** A showing that is due or playing has this friend away from where the saved ride has it. */
  private shownAway(id: FriendId): boolean {
    const playing = this.sceneKind === 'showing'
    if (!playing && !this.pendingShowing) return false
    const body = this.play.bodies[id]
    if (body.away || (playing && body.mode !== 'rest')) return true
    return JSON.stringify(placeOf(this.play.arrangement, id)) !== JSON.stringify(placeOf(this.world.arrangement, id))
  }

  tap(): void {
    const pressed = this.pressed
    this.pressed = { kind: 'other' }
    if (pressed.kind !== 'friend') return
    // The next ride begins with a touch on the friend who waits, where it waits: not while it is still on its way there.
    if (this.world.arrangement.waiting === pressed.id) {
      if (this.play.bodies[pressed.id].mode === 'rest') this.begin()
    }
    // The second tap of a double tap on the friend who was waiting: it is still on its way to its end, and stays on its way.
    else if (!this.world.state.finished && pressed.id === this.ride.asker && this.time - this.begunAt < BEGIN_SECONDS) return
    else {
      this.moved(pressed.id, () => this.play.tapFriend(pressed.id))
      // Dot twirls as it goes.
      if (pressed.id === 'dot') this.play.act('dot', 'spin', 0.5)
    }
  }

  dragStart(): void {
    const pressed = this.pressed
    if (pressed.kind !== 'friend') return
    // The friend who waits is not carried: any touch that takes hold of it begins the next ride.
    if (this.world.arrangement.waiting === pressed.id) {
      this.pressed = { kind: 'other' }
      if (this.play.bodies[pressed.id].mode === 'rest') this.begin()
    } else {
      // Taken from the air before it landed: it never arrived where the tap sent it.
      this.caught = this.play.bodies[pressed.id].mode === 'hop' && this.flights[pressed.id] ? pressed.id : null
      this.play.grab(pressed.id)
    }
  }

  /**
   * The finger moved: `over` is the place in the tray it points at, where a carried friend hangs and will come down;
   * `sand` is where it is on the sand; either may be null.
   */
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
    // Brought in by the hand, Dot twirls as it comes, as it does when a tap brings it in.
    if (id === 'dot' && inCompany(this.play.arrangement)) this.play.act('dot', 'spin', 0.5)
  }

  pressEnd(): void {
    this.pressed = { kind: 'other' }
  }

  /** The pointer was taken away mid-drag and did not come back: the friend goes back to where it was picked up from, and no move is made. */
  dragAbort(): void {
    this.pressed = { kind: 'other' }
    this.backToItsEnd()
  }

  /**
   * The friend in the hand goes back to where it was picked up from. Lifted from under others, it goes back onto
   * its end on top of them, since they have come down a place: the same friends on the same ends, and no move.
   */
  private backToItsEnd(): void {
    const id = this.play.held
    if (!id) return
    this.play.putBack()
    // Where it comes down is answered as any landing is: a head it lands on says so.
    this.landings[id] = landingOf(this.play.arrangement, this.play.arrangement, id)
    if (JSON.stringify(this.play.arrangement) !== JSON.stringify(this.world.arrangement)) {
      this.world = { ...this.world, arrangement: this.play.arrangement }
      this.wantSave('now')
    }
  }

  /** A touch that lands on nothing the game answers (the grown-up corner, or a second finger beside the one that is working): it still ends a scene, as any touch does. */
  touchNothing(): void {
    this.idle = 0
    this.asked = 0
    if (this.scene) this.endScene(true)
  }

  /**
   * The game is put away. A friend in the hand goes back to where it was picked up from, which is where it is saved:
   * putting the game away makes no move the child did not make, and none is counted.
   */
  putAway(): void {
    this.pressed = { kind: 'other' }
    this.backToItsEnd()
    // Whoever is still in the air will land, and the plank will come down, with nobody watching: the marks they
    // make go into the saved sand now, so nothing the child set going is lost. They are drawn when they happen.
    // A swirl Dot was about to draw is in the saved sand too; and one it will draw when it lands, alone, where the child sent it.
    for (const item of this.later) if (item.reaction.mark === 'swirl') this.owedSwirl = this.swirlMarked(item.reaction.who)
    const dotLands = this.landings.dot
    if (dotLands && dotLands.deed === 'in-the-sand' && !dotLands.company) this.owedSwirl = this.swirlMarked('dot')
    if (!this.scene) {
      const coming = forecast(this.play, this.world.arrangement, () => [])
      for (const op of coming) this.mark(op)
      if (coming.length) {
        this.owed.push(...coming)
        this.wantSave('now')
      }
    }
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
      if (this.rakeSweep >= 1) {
        this.rakeSweep = null
        // Whatever was marked while the rake travelled is in the saved grid: the picture is drawn from it again, so
        // the two agree, and the rake lies out again if a mark is left.
        this.owed = []
        this.cues.push({ type: 'raked' })
      }
    }
    // Whoever the move lifted says so before the ending begins: the ending waits for it, and for the plank to lie still again.
    this.perches()
    if (!this.scene && !this.play.held) {
      if (this.pendingShowing && this.play.settled) this.startShowing(this.pendingShowing)
      else if (rideIsOver(this.world) && this.play.plankArrived && this.play.bodies[this.ride.asker].landed && this.play.bodies[this.ride.asker].mode === 'rest' && !this.play.shaking && this.time >= this.perchUntil && !LIKE_HIGH.some((id) => this.perch[id] === 'pending')) this.startEnding()
    }
    this.looks()
    this.snore()
    this.held()
    this.dotAlone()
    this.guideFrom(guidance)
    this.frame = this.play.frame(this.guide.glow, this.guide.on)
  }

  // --- Moves ------------------------------------------------------------------

  /** The child moved a friend: the world takes it in, the move is counted if a ride runs, and the landing is remembered for when it lands. */
  private moved(id: FriendId, act: () => void): void {
    // What was still to come may not come now: the picture catches up with the saved sand first.
    this.drawOwed()
    // Whatever the friend was about to do where it was, it no longer does: it has been taken from there.
    // The sand running off the board is nobody's doing and runs all the same.
    this.later = this.later.filter((item) => item.reaction.who !== id || item.reaction.mark === 'trickle')
    const before = this.play.arrangement, movesBefore = this.world.moves
    // In the air already, from a move not yet landed: this touch turns it round.
    // Or it was taken from the air by the hand, and is now let go: it has made one move from where it last stood, or none.
    const flight = this.play.bodies[id].mode === 'hop' || this.caught === id ? this.flights[id] : undefined
    if (this.caught === id) this.caught = null
    act()
    const after = this.play.arrangement
    this.world = afterMove(this.world, after)
    // A move is a friend arriving on an end or leaving one. Turned round in the air, a friend has made one move from
    // where it last stood, or none if it goes back there: tapping it to and fro before it lands counts nothing more.
    const onEnd = (a: Arrangement) => { const place = placeOf(a, id); return place.at === 'end' ? place.end : null }
    if (flight) this.world = { ...this.world, moves: Math.min(this.world.moves, flight.base + (onEnd(after) === flight.from ? 0 : 1)) }
    else {
      this.flights[id] = { base: movesBefore, from: onEnd(before) }
      // A move by another friend meanwhile counts for itself in every flight that is under way.
      for (const other of FRIEND_IDS) if (other !== id && this.flights[other]) this.flights[other]!.base += this.world.moves - movesBefore
    }
    this.landings[id] = landingOf(before, after, id)
    // Dot taken away from those it was with, on the plank or beside it in the sand: they look after it for a moment.
    if (id === 'dot') {
      const still = companyOf(after, 'dot'), left = companyOf(before, 'dot').filter((other) => !still.includes(other))
      if (left.length) {
        this.lookers = left
        this.lookAfter = this.time + 1.2
      }
    }
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
    this.flights = {}
    this.later = []
    this.drawOwed()
    this.pendingShowing = this.world.shown.includes(this.world.kind) ? null : this.world.kind
    // With a showing due, everyone hops to where the showing opens, so that it begins with no jump.
    const opens = this.pendingShowing ? showingOpens(this.ride, this.world.arrangement) : null
    this.play.relayout(opens ? opens.arrangement : this.world.arrangement)
    if (opens?.stand) this.play.visit(opens.stand.id, opens.stand.point)
    this.voice(v.chirp(this.ride.asker, this.said++))
    this.moods()
    this.perchesAsFound()
    this.begunAt = this.time
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
    this.play.look(ride.asker, 0, 0)
    this.run('ending', (director) => endingBeats(director, ride.asker, lifters))
  }

  /** A showing: once ever for each kind. That it has played, and the world as it stands at its end, are saved before the first beat. */
  private startShowing(kind: Kind): void {
    this.pendingShowing = null
    this.world = markShown(this.world, kind)
    const ride = this.ride
    this.run('showing', (director) => showingBeats(director, ride))
  }

  /**
   * Starts a scene. Its outcome is already in the world but for the sand: the
   * scene is first played on a silent twin, and every bite and hollow it will
   * make goes into the marks now. Then all of it is saved at once, before the
   * first beat.
   */
  private run(kind: 'ending' | 'showing', build: (director: Director) => Beat[]): void {
    // A finger that was already down when the scene began is no touch on the scene: its lift does nothing, and only a
    // new touch ends the scene.
    this.pressed = { kind: 'other' }
    this.drawOwed()
    this.sceneSand = forecast(this.play, this.world.arrangement, build)
    for (const op of this.sceneSand) this.mark(op)
    this.owed = [...this.sceneSand]
    // The friend who goes to wait stood beside Dot: the scene leaves Dot alone, and its swirl is part of the sand the scene leaves.
    const dot = this.play.bodies.dot
    if (kind === 'ending' && placeOf(this.play.arrangement, 'dot').at === 'sand' && dot.mode === 'rest' && !dot.away && inCompany(this.play.arrangement) && placeOf(this.world.arrangement, 'dot').at === 'sand' && !inCompany(this.world.arrangement)) this.owedSwirl = this.swirlMarked('dot')
    this.wantSave('now')
    this.cut = false
    this.sceneKind = kind
    this.scene = new Scene(build(this))
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
    // Ended by a touch, the sand ends as it was saved: whatever of the scene's bites and hollows has not happened is
    // drawn now. Ended by itself, what its last beat set going is still on its way, and each mark is drawn as it comes.
    if (touched) this.drawOwed(false)
    this.sceneSand = []
    if (touched) {
      this.later = []
      this.landings = {}
      // A showing ended by a touch is found finished: everyone at once where its end has them.
      if (kind === 'showing') {
        this.play.settleTo(this.world.arrangement)
        this.play.asFound()
      }
    }
    if (JSON.stringify(this.play.arrangement) !== JSON.stringify(this.world.arrangement)) this.play.relayout(this.world.arrangement)
    else this.play.arrangement = this.world.arrangement
    this.moods()
    // Who is high is not settled here either: if the friend who went to wait lifted Mog or Bo by leaving, each says so.
    // Dot's company is not reset here: if the friend who went to wait stood beside it, Dot has been left alone, and says so.
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

  /** Dot's swirl, into the saved grid, round where it stands. */
  private swirlMarked(who: FriendId): { x: number; z: number; radius: number } {
    const at = standsAt(this.play.arrangement, who), radius = FRIENDS[who].radius * 1.25
    swirlMark(this.world.marks, at.x, at.z, radius)
    this.wantSave('soon')
    return { x: at.x, z: at.z, radius }
  }

  /** A mark that was owed to the picture has just been drawn by its own cause. */
  private paid(op: SandOp): void {
    const index = this.owed.findIndex((owed) => owed.type === op.type && (owed.type === 'bite' ? Math.sign(owed.x) === Math.sign(op.x) : op.type === 'hollow' && owed.id === op.id))
    if (index >= 0) this.owed.splice(index, 1)
  }

  /** Everything saved and not yet drawn is drawn now. Dot's swirl waits for Dot to draw it, unless `all`: then what will happen has changed, and Dot may never. */
  private drawOwed(all = true): void {
    for (const op of this.owed) this.draw(op)
    this.owed = []
    if (all && this.owedSwirl) {
      this.cues.push({ type: 'swirl', ...this.owedSwirl })
      this.owedSwirl = null
    }
  }

  /** One thing done to the sand, into the saved grid. A mark never gets shallower, so doing it twice changes nothing. */
  private mark(op: SandOp): void {
    if (op.type === 'bite') biteMark(this.world.marks, op.x, biteDepth(op.weight))
    else stamp(this.world.marks, op.x, op.z, FRIENDS[op.id].radius * 0.8, 2 + FRIENDS[op.id].weight)
  }

  /** The same thing, for the eye. */
  private draw(op: SandOp): void {
    // Deeper the heavier the end: drawn from the weight that came down, as it is saved, never from how fast it fell.
    // The saved grid keeps eight depths; the picture keeps every weight apart, so a heavier end is always drawn deeper.
    if (op.type === 'bite') this.cues.push({ type: 'bite', x: op.x, strength: Math.min(1, (op.weight + 1) / (HEAVIEST + 1)) })
    else this.cues.push({ type: 'dimple', x: op.x, z: op.z, radius: FRIENDS[op.id].radius * 0.8, depth: Math.min(1, 0.35 + 0.16 * FRIENDS[op.id].weight) })
  }

  private apply(reaction: Reaction): void {
    let way = reaction.way ?? 0
    if (reaction.toward) {
      // It turns to the friend it greets: most of the way round to it, never so far that its face is lost to the child.
      const me = this.play.bodies[reaction.who], other = this.play.bodies[reaction.toward]
      const dx = other.x - me.x, dz = other.z - me.z
      way = Math.hypot(dx, dz) < 0.3 ? 0 : Math.max(-GREET_TURN, Math.min(GREET_TURN, Math.atan2(dx, dz) * 0.7))
    }
    if (reaction.act) this.play.act(reaction.who, reaction.act, reaction.seconds ?? 0.6, way)
    if (reaction.voice) this.voice(reaction.voice)
    if (reaction.blink) this.play.blink(reaction.who, reaction.blink)
    // Never in a scene: its sand was forecast and saved when it began, and a shake would bite it again.
    if (reaction.rock && !this.sceneRunning) this.play.shake(reaction.rock)
    if (reaction.mark === 'settle') {
      // Grains thrown by the landing settle on this head, lie there a moment, and are shaken off.
      const pose = this.play.frame().poses[reaction.who], spec = FRIENDS[reaction.who]
      this.grains.settle(pose.x, pose.y + spec.halfHeight * 2 * pose.squash, pose.z, spec.radius * 0.45, 9, 0.4)
    }
    if (reaction.mark === 'trickle') {
      // Sand thrown onto the board runs off whichever end is low now, in a thin stream.
      const way = Math.sign(this.play.plank.tilt)
      if (way !== 0) this.grains.burst(way * PLANK.halfLength * 0.97, PLANK.z, 0.12, 9, PLANK.halfWidth * 1.6, 0.35)
    }
    if (reaction.mark === 'swirl') {
      const { x, z, radius } = this.swirlMarked(reaction.who)
      this.cues.push({ type: 'swirl', x, z, radius })
      this.owedSwirl = null
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
      // The hum is one: struck when the plank comes level, unless it is sounding already, and again as each dies away.
      if (this.time < this.heldAt) return
      this.voice(v.levelHum())
      this.heldAt = this.time + HUM_EVERY
      // Everyone on the floating plank sways with it, one after another.
      const riders = [...this.play.arrangement.left, ...this.play.arrangement.right]
      riders.forEach((id, index) => this.react([{ who: id, after: index * 0.12, act: 'sway', seconds: 1.6, way: index % 2 ? -1 : 1 }]))
    } else if (event.type === 'land') {
      const spec = FRIENDS[event.id], hard = event.speed / 9
      this.voice(v.thump(spec.weight, event.on, hard))
      if (event.on === 'sand') {
        const op: SandOp = { type: 'hollow', x: event.x, z: event.z, id: event.id }
        this.mark(op)
        this.draw(op)
        this.paid(op)
        this.grains.burst(event.x, event.z, 0.25 + 0.15 * spec.weight, 4 + spec.weight * 3)
        this.wantSave('soon')
      }
      // Thrown by the plank and down again: a squeak in its own voice.
      if (event.thrown) {
        this.voice(v.chirp(event.id, this.said++))
        // Thrown and down again on the head it sat on: that head says what it always says to being landed on, and
        // Pim, on top of someone once more, crows.
        const place = placeOf(this.play.arrived, event.id)
        if (event.on === 'friend' && place.at === 'end' && place.level > 0) this.react(cameDownOn(event.id, this.play.arrived[place.end][place.level - 1]))
      }
      delete this.flights[event.id]
      // The cell is read when the friend lands, from what is there then: a head taken away meanwhile is not landed on.
      // And from who has arrived: a friend sent to the same end and still on its way is not there yet.
      const sent = this.landings[event.id], sitting = this.play.arrived
      const landing = sent ? landingOf(sitting, sitting, event.id) : undefined
      // Come down a place onto a head, because the friend between was taken away: that head answers as it does to anyone landing on it.
      if (event.fell && !landing && !this.scene && event.on === 'friend') {
        // With a friend in the hand, the stack is the one that still sits.
        const place = placeOf(sitting, event.id)
        if (place.at === 'end' && place.level > 0) this.react(cameDownOn(event.id, sitting[place.end][place.level - 1]))
      }
      if (landing) {
        delete this.landings[event.id]
        const answers = reactionsTo(landing)
        this.react(answers)
        // The cell has said what it makes of being high, if it did: Mog's purr with his slow blink, Bo's chuckle.
        if (this.high(event.id) && answers.some((r) => r.who === event.id && (r.act === 'chuckle' || (r.act === 'tall' && r.blink)))) this.perch[event.id] = 'said'
        // Bo on the low end digs it in: a crater under that end, and a ring of sand flies.
        if (event.id === 'bo' && landing.deed === 'low-end' && landing.end) {
          const x = (landing.end === 'left' ? -1 : 1) * PLANK.halfLength * Math.cos(this.play.plank.tilt)
          const op: SandOp = { type: 'bite', x, weight: landing.weightThere, speed: 2 }
          this.mark(op)
          this.draw(op)
          this.grains.burst(x, PLANK.z, 0.7, 20, PLANK.halfWidth * 2)
          // The deepest thump of all: the end driven into the sand under him.
          this.voice(v.thump(FRIENDS.bo.weight, 'sand', 1))
          this.wantSave('soon')
        }
      }
    } else if (event.type === 'knock') {
      // What has arrived on the end that came down: a friend in the hand, or one still on its way, is not on it.
      const weight = weightOn(this.play.arrived, event.end), power = Math.min(1, event.speed / 3)
      this.voice(v.knock(event.speed))
      this.voice(v.crunch(weight))
      const op: SandOp = { type: 'bite', x: event.x, weight, speed: event.speed }
      this.mark(op)
      this.draw(op)
      this.paid(op)
      // A ring of sand flies from under the end that came down, and the end that lifted lets grains slide back.
      this.grains.burst(event.x, PLANK.z, 0.35 + 0.65 * power, Math.round(8 + 22 * power), PLANK.halfWidth * 2)
      if (power > 0.45) {
        // Sand thrown onto the board runs off its low end.
        this.react([{ who: 'pim', after: 0.6, voice: v.trickle(), mark: 'trickle' }])
        // Thrown grains settle on the heads of whoever rides.
        const riders = this.play.arrived[event.end]
        if (riders.length) {
          // They settle on the head that is uppermost there, with a light patter.
          this.react([{ who: riders[riders.length - 1], after: 0.35, voice: v.patter(), mark: 'settle' }])
          // And are shaken off.
          this.react(riders.map((id, index) => ({ who: id, after: 0.55 + index * 0.08, act: 'shake' as const, seconds: 0.45 })))
        }
      }
      this.wantSave('soon')
    } else if (event.type === 'rise') {
      // As an end lifts, grains slide back into the bite it leaves, with a short whisper. The bite stays.
      this.voice(v.whisper())
      this.grains.burst(event.x, PLANK.z, 0.14, 6, PLANK.halfWidth * 2)
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
    // The clonk and its grains are an end knocked on the sand it lies in; an end that is in the air twangs.
    if (Math.sign(tilt) === side && Math.abs(tilt) >= MAX_TILT * 0.92) {
      this.voice(v.clonk())
      this.grains.burst(side * PLANK.halfLength * 0.96, PLANK.z, 0.3, 6, PLANK.halfWidth * 2)
    } else this.voice(v.twang())
  }

  /** This friend sits on the end that is up. */
  private onUpEnd(id: FriendId): boolean {
    const a = this.play.sitting, place = placeOf(a, id)
    return place.at === 'end' && lean(a) === (place.end === 'left' ? 1 : -1)
  }

  /** The arrangement has this friend where it likes to be: high. */
  private high(id: FriendId): boolean {
    // By who sits: a friend in the hand is not on the plank, and is not high itself.
    if (this.play.held === id) return false
    const a = this.play.sitting, place = placeOf(a, id)
    if (place.at !== 'end') return false
    // Mog's high perch is the up end or the top of any stack; Bo's is the up end.
    if (id === 'mog' && place.level > 0 && place.level === a[place.end].length - 1) return true
    return lean(a) === (place.end === 'left' ? 1 : -1)
  }

  /** Found as it stands: whoever is high already has said so, and says nothing on a load or when a scene is over. */
  private perchesAsFound(): void {
    for (const id of LIKE_HIGH) {
      if (this.high(id)) this.perch[id] = 'said'
      else delete this.perch[id]
    }
  }

  /**
   * Mog and Bo like being high, every time. Lifted onto the up end by the others, each says so once the plank has
   * carried it there, and not again until it has been down. The one who asks says it in the ending of its own ride.
   */
  private perches(): void {
    // In a scene nothing is said or settled: when it is over, everyone is as found.
    if (this.scene) return
    for (const id of LIKE_HIGH) {
      if (!this.high(id)) {
        delete this.perch[id]
        continue
      }
      if (this.perch[id] === 'said') continue
      // The one who asks says it in the ending of its own ride, when the plank has carried it up; on top of a stack on
      // the low end it has not got there yet, and purrs as anyone would.
      if (this.play.asking?.id === id && this.onUpEnd(id)) {
        this.perch[id] = 'said'
        continue
      }
      this.perch[id] = 'pending'
      const body = this.play.bodies[id]
      if (this.play.plankArrived && body.landed && body.mode === 'rest') {
        this.perch[id] = 'said'
        // At once, and an ending that is due waits until it has been said.
        this.react(perched(id).map((reaction) => ({ ...reaction, after: 0 })))
        this.perchUntil = this.time + PERCH_SECONDS
      }
    }
  }

  /** The rake is drawn once along the far rim: even lines again, and nothing else changes. */
  private rake(): void {
    if (!this.rakeOut || this.rakeSweep !== null) return
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
    const asking = !this.world.state.finished
    const ride = this.ride
    const asker = placeOf(a, ride.asker)
    // The asker wants it for as long as the ride runs, a showing included; once the plank has carried it there, it has it.
    play.asking = asking && asker.at === 'end' ? { id: ride.asker, side: asker.end === 'left' ? 1 : -1, up: ride.asks === 'up' ? 1 : -0.7 } : null
    if (this.scene) return
    for (const id of FRIEND_IDS) {
      const at = standsAt(a, id)
      // The one who waits looks at the plank: at the end it will hop to, and up.
      if (a.waiting === id) play.look(id, this.nextEnd() === 'left' ? -0.8 : 0.8, 0.6)
      else if (asking && id === ride.asker && placeOf(a, id).at === 'end') {
        // One who wants up looks along the plank and up. One stuck high looks down at the sand under it and back at the sky.
        const up = ride.asks === 'up' ? 0.8 : Math.floor(this.time / 1.6) % 2 === 0 ? -0.9 : 0.9
        // One who wants up looks by turns along the plank and up, and at the friends who could help, where they stand.
        const helpers = FRIEND_IDS.filter((other) => other !== id && placeOf(a, other).at === 'sand')
        if (ride.asks === 'up' && helpers.length && Math.floor(this.time / ASK_LOOK) % 2 === 1) {
          const x = helpers.reduce((sum, other) => sum + play.bodies[other].x, 0) / helpers.length
          play.look(id, Math.max(-0.9, Math.min(0.9, (x - at.x) * 0.3)), 0.05)
        } else play.look(id, ride.asks === 'up' ? (at.x < 0 ? 0.9 : -0.9) : 0, up)
      } else if (this.time < this.lookAfter && this.lookers.includes(id)) play.look(id, Math.sign(play.bodies.dot.x - at.x) * 0.9, 0)
      else this.wants(id)
    }
    // After a still while the asker gives one small hop on the spot: three times at most, then it only looks.
    if (asking && this.asked < ASK_AT.length && this.idle >= ASK_AT[this.asked] && play.bodies[ride.asker].mode === 'rest' && !play.held) {
      this.asked += 1
      play.act(ride.asker, 'bounce', 0.6)
      this.voice(v.ask(ride.asker))
    }
  }

  /** The end the friend who waits will hop to when the child touches it. */
  private nextEnd(): End {
    if (this.nextEndOf !== this.world) {
      const next = beginRide(this.world)
      this.nextEndOf = this.world
      this.nextEndIs = askerEnd(rideOf(next.kind, next.turn))
    }
    return this.nextEndIs
  }

  /**
   * What each friend always wants, shown by where it looks when nothing else has its eye: Pim at the sky and at
   * whichever end is high, Mog at the highest seat there is, Dot at whoever is on the plank, Bo up along the plank.
   */
  private wants(id: FriendId): void {
    const play = this.play, a = play.arrangement, at = standsAt(a, id)
    const toward = (x: number) => Math.max(-0.9, Math.min(0.9, (x - at.x) * 0.3))
    const way = lean(a)
    // The end that is up, or none on a level or empty plank.
    const highX = way === 0 ? null : -way * PLANK.seat
    if (id === 'pim') {
      // Stuck on a high end where nothing moves, she looks down at the sand under her and back at the sky, whoever is asking.
      const there = placeOf(a, 'pim')
      const stuck = there.at === 'end' && way !== 0 && (there.end === 'left' ? -1 : 1) === -way && play.bodies.pim.mode === 'rest'
      if (stuck) play.look('pim', 0, Math.floor(this.time / 1.6) % 2 === 0 ? -0.9 : 0.9)
      else play.look('pim', highX === null ? 0 : toward(highX), 0.9)
    }
    else if (id === 'mog') {
      // The highest seat: the end that is up, or on a level plank the taller stack. Sitting on it, he looks about him.
      const seat = highX ?? (a.left.length === a.right.length ? 0 : a.left.length > a.right.length ? -PLANK.seat : PLANK.seat)
      const there = placeOf(a, 'mog')
      const has = there.at === 'end' && Math.sign(seat) === (there.end === 'left' ? -1 : 1) && there.level === a[there.end].length - 1
      play.look('mog', has ? 0 : toward(seat), has ? 0.2 : 0.55)
    } else if (id === 'dot') {
      // Whoever is on the plank; with nobody on it, the others where they stand.
      const riders = [...a.left, ...a.right].filter((other) => other !== 'dot')
      const them = riders.length ? riders : FRIEND_IDS.filter((other) => other !== 'dot' && a.waiting !== other)
      const x = them.reduce((sum, other) => sum + play.bodies[other].x, 0) / Math.max(1, them.length)
      play.look('dot', toward(x), riders.length ? 0.35 : 0.1)
    } else {
      // Up along the plank: to its high end, or from the sand to the far end of it.
      play.look('bo', toward(highX ?? -Math.sign(at.x || 1) * PLANK.seat), 0.5)
    }
  }

  /** Bo alone on the plank dozes off and snores for as long as he is alone. Anything landing wakes him. */
  private snore(): void {
    const doze = this.play.bodies.bo.doze
    if (doze < 0.5) {
      this.snoreAt = this.time + 0.8
      return
    }
    if (doze > 0.95 && this.time >= this.snoreAt) {
      this.snoreAt = this.time + SNORE_EVERY
      this.voice(v.snore())
    }
  }

  /**
   * The secrets that are held states: a plank that floats level hums for as
   * long as it floats, with everyone on it swaying; a tower of four, or any
   * stack with Bo on top, sways for as long as it stands. Each begins and ends with the arrangement, never
   * with the clock: the clock only spaces the hums and the sways.
   */
  private held(): void {
    // What sits on the plank: a friend in the hand is not on it, so lifting one off can float it level, or leave a tower of three.
    const play = this.play, a = play.sitting
    if (this.time < this.heldAt) return
    // In a scene a held state holds as it does out of one; only a friend a beat has doing something else is left to it.
    const free = (id: FriendId) => !this.scene || play.bodies[id].act === null || play.bodies[id].act === 'sway'
    // Sitting, not on its way there: a held state holds from the moment everyone has landed, however the plank still sways.
    const sits = (id: FriendId) => play.bodies[id].landed && play.bodies[id].mode === 'rest'
    const left = weightOn(a, 'left'), right = weightOn(a, 'right')
    // Level by its weights, everyone sitting, and floating clear of the sand: while it is still on its way up off an end it is not yet level.
    if (left > 0 && left === right && [...a.left, ...a.right].every(sits) && Math.abs(play.plank.tilt) < MAX_TILT * 0.7) {
      this.heldAt = this.time + HUM_EVERY
      this.voice(v.levelHum())
      ;[...a.left, ...a.right].forEach((id, index) => { if (free(id)) play.act(id, 'sway', 1.6, index % 2 ? -1 : 1) })
      return
    }
    // A stack of three or four, or any stack with Bo on top: it sways as one, every friend the same way, for as long as it stands.
    for (const end of ['left', 'right'] as const) {
      const stack = a[end]
      // A taller stack is plainly wobblier: three sway, four sway further; and Bo on top makes even two sway.
      if ((stack.length >= 3 || (stack.length === 2 && stack[1] === 'bo')) && stack.every(sits)) {
        this.heldAt = this.time + HELD_EVERY
        for (const id of stack) if (free(id)) play.act(id, 'sway', 1.7, WOBBLE[stack.length] ?? 1)
      }
    }
  }

  /**
   * Dot left alone in the sand, by a friend who was beside it going away, draws its one swirl: once, when it is left.
   * And a friend set down beside Dot where it stands is company come to it: its one soft note.
   */
  private dotAlone(): void {
    const now = inCompany(this.play.arrangement)
    if (now === this.company) return
    const was = this.company
    this.company = now
    const dot = this.play.bodies.dot
    if (placeOf(this.play.arrangement, 'dot').at !== 'sand' || dot.mode !== 'rest' || dot.away) return
    if (was && !now) this.react([{ who: 'dot', after: 0.6, voice: v.scratch(), act: 'spin', seconds: 1.1, mark: 'swirl' }])
    // A friend set down beside it where it stands: it warms, and hums its one soft note, as when it is set down beside one.
    else if (!was && now) this.react([{ who: 'dot', after: 0.5, voice: v.softNote(), act: 'sway', seconds: 0.8, way: 1 }])
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
      // The one who asks has been taken off the plank: it is the one to tap, back onto its end.
      const strayed = asker !== null && placeOf(a, asker).at === 'sand' && this.play.bodies[asker].mode === 'rest'
      // Dot is never shown: bringing it in is never asked for.
      const idle = (['mog', 'bo', 'pim'] as const).filter((id) => id !== asker && placeOf(a, id).at === 'sand' && this.play.bodies[id].mode === 'rest')
      // Never the answer first: a friend whose one tap would carry the asker there is shown after the others.
      const answers = (id: FriendId) => asker !== null && wantMet(this.ride, tap(a, id))
      const standing = strayed ? [asker] : [...idle.filter((id) => !answers(id)), ...idle.filter(answers)]
      const turn = Math.max(0, guidance.demoIndex >= 0 ? guidance.demoIndex : this.lastDemo)
      const tops = [a.right[a.right.length - 1], a.left[a.left.length - 1]].filter((id): id is FriendId => id !== undefined && id !== 'dot')
      on = standing.length ? standing[turn % standing.length] : (tops[0] ?? null)
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
