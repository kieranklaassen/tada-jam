import { AFTERIMAGE, AFTER_STRENGTH, Figure, same, type Beat } from './figure'
import { DOORS_OF, dogAbout, goThrough, lightsOut, untouched, type House, type RoomId } from './house'
import type { Point } from './input'
import { CORD, CORD_AREAS, DOORS, DOOR_AREAS, LAMP_AREAS, PULL, PULL_HOLD, buttonAt, doorAt, inGlass, inShape, middleOf, onCord, onLamp } from './layout'
import { PEEKS } from './peeks'
import { b, planLength, type Answer, type Cast, type Hint, type Live, type Plan, type RoomDef, type Target } from './room'
import { OWL_BACK, bedtime, morning } from './roomBedroom'
import { ROOM } from './rooms'
import { makeRng, type Rng } from './rng'
import { Scene, type Beat as SceneBeat } from './scene'
import type { Cue } from './voices'

// The game as rules with no drawing in them: the house, the room on the
// glass, and every figure of that room at one pose at a time. A touch is
// answered in the call that takes it: the pose is lit and its sound handed
// out before `press` returns.
//
// What is saved and what is seen are two things. `house` is the saved truth
// and changes when a touch lands; `seen` is the room and the light on the
// glass, which a scene changes at the beat that shows it.
//
// Time is the attended clock's, passed to `step`. Nothing here reads a clock,
// and chance comes from one seeded stream that only varies how long a figure
// holds a pose and which of its answers comes next.

/** One segment on the glass this frame. `strength` is 1 for a lit segment and less for one that flickers; `fading` marks one that has just gone out and lingers. */
export type Lit = { name: string; strength: number; fading: boolean }

/** What the view draws from: the game as it stands at this instant. */
export type Shown = {
  /** The room whose card and segments are on the glass, and whether it is seen by day. */
  room: RoomId
  day: boolean
  lit: Lit[]
  /** The dark bloom a finger leaves on bare glass, or null. */
  bloom: { x: number; y: number; r: number } | null
  /** The case button held down, or null. */
  held: 0 | 1 | null
  /** While a button is held every segment of the display shows at once. */
  test: boolean
  /** The whole display flickers for a moment after a knock on the case. */
  shock: boolean
  /** How far the lamp's cord is pulled, 0 to 1: the house dims as it goes. */
  dim: number
}

type Finger = { kind: 'none' } | { kind: 'button' } | { kind: 'cord'; from: Point; level: 0 | 1 | 2; held: number } | { kind: 'rub' } | { kind: 'pull'; from: Point }

/** One thing a scene does at one moment: a figure takes a pose, a figure is let go to its own idle run, or the room on the glass changes. */
type Event = { at: number; who?: string; beat?: Beat; free?: boolean; act?: () => void }

const NONE: Finger = { kind: 'none' }

/** The figures of the stairwell, which every room has. */
const STAIR_FIGURES = ['lamp', 'cord', 'door0', 'door1', 'door2'] as const

export class Game {
  /** The house as it is saved. */
  house: House
  /** The house as the glass tells it: the saved one, except while a scene is on its way to showing it. */
  private told: House
  private readonly seed: number
  private rng: Rng
  private room: RoomDef
  private live: Live
  private seen: { room: RoomId; day: boolean }
  private figures = new Map<string, Figure>()
  private rested = new Map<string, readonly string[]>()
  private scene: Scene | null = null
  private time = 0
  private finger: Finger = NONE
  /** A finger the game was given is on the glass. */
  private down = false
  private pulled: 0 | 1 | 2 = 0
  private bloom: { x: number; y: number; age: number } | null = null
  private held: 0 | 1 | null = null
  private shock = 0
  private look = { x: 0, left: 0 }
  private handed: Cue[] = []
  private readonly tally = { poses: 0 }
  private unsaved: 'no' | 'soon' | 'now' = 'no'
  private hushed = false
  /** The child has touched the game since it was loaded or put away. Until then it makes no sound of its own. */
  private woken = false
  private readonly shown: Shown = { room: 'bedroom', day: false, lit: [], bloom: null, held: null, test: false, shock: false, dim: 0 }

  /** The house as it was left: the room that was on screen, every thing at its saved step, everyone at rest. Nothing replays. */
  constructor(house: House, seed: number) {
    this.house = house
    this.told = house
    this.seed = seed
    this.rng = makeRng(seed)
    this.room = ROOM[house.place]
    this.live = this.room.enter(house)
    this.seen = { room: house.place, day: house.day }
    this.stage(this.live)
  }

  // --- What the Mount asks ------------------------------------------------------

  /** The cues handed out since the last call, which the Mount plays at once as one voice. */
  cues(): Cue[] {
    const cues = this.handed
    this.handed = []
    return cues
  }

  /** Whether something that is saved has changed since the last call: 'now' for a change that must not wait for the throttle. */
  changed(): 'no' | 'soon' | 'now' {
    const unsaved = this.unsaved
    this.unsaved = 'no'
    return unsaved
  }

  /** Whether every sound that is still ringing has to stop now: a touch ended a scene, or the game was put away. Asked once. */
  hush(): boolean {
    const hushed = this.hushed
    this.hushed = false
    return hushed
  }

  /** A scene is playing: the Mount keeps the idle ladder at the bottom for as long as it does. */
  get playing(): boolean {
    return this.scene !== null
  }

  /** A finger is holding something: a case button, the lamp's cord, the weed, or a rub on the glass. */
  get holding(): boolean {
    return this.finger.kind !== 'none'
  }

  /** Everything that answers a touch in the room on the glass, nearest the finger first. For the tests of what a touch lands on. */
  targets(): Target[] {
    return [...LAMP_AREAS.map((shape) => ({ id: 'lamp', shape })), ...DOOR_AREAS.map((shape, i) => ({ id: `door${i}`, shape })), ...this.room.targets(this.house, this.live)]
  }

  /** What each figure of the room on the glass shows now, by figure. For the tests that ask which figure a lit segment belongs to. */
  poses(): [string, readonly string[]][] {
    return [...this.figures].map(([who, figure]) => [who, figure.show])
  }

  /** How many poses were taken, flickers included, since this was last asked. For the test that every sound has its pose. */
  fresh(): number {
    const count = this.tally.poses
    this.tally.poses = 0
    return count
  }

  /** The room on the glass and the light it is seen in. */
  get glass(): { room: RoomId; day: boolean } {
    return this.seen
  }

  /** What the idle ladder shows for its `demoIndex`th demonstration: the room's thing, then a door, then the lamp's cord once there is something to put to bed (the thing again until then), then another door. */
  hint(demoIndex: number): Hint {
    const door = (i: number): Hint => ({ at: middleOf(DOORS[i]), glow: DOOR_AREAS[i] })
    const thing = this.room.hint(this.house, this.live)
    const turn = ((demoIndex % 4) + 4) % 4
    if (turn === 0) return thing ?? door(0)
    if (turn === 1) return door(1)
    if (turn === 3) return door(2)
    // The hand takes the cord's bobble and draws it down, which is the whole gesture.
    if (this.house.day && !untouched(this.house)) return { at: { x: CORD.x, y: CORD.y[0] }, to: { x: CORD.x, y: CORD.y[0] + PULL[1] + 26 }, glow: CORD_AREAS[0] }
    return thing ?? door(2)
  }

  // --- Touch --------------------------------------------------------------------

  /** A finger landed at `at` on the stage. The answer is lit, and its sound handed out, before this returns. */
  press(at: Point): void {
    this.woken = true
    // Any touch ends a scene at once, with everyone where the scene was taking them and no sound left of it.
    if (this.scene) {
      this.scene.finish()
      this.scene = null
      this.settle()
      this.handed.length = 0
      this.hushed = true
    }
    this.drop(false)
    this.down = true
    this.lookAt(at)
    const button = buttonAt(at)
    if (button !== null) {
      this.held = button
      this.finger = { kind: 'button' }
      this.handed.push('buttonDown')
      return
    }
    if (!inGlass(at)) {
      // A second knock while the display still flickers from the first is the same knock: one flicker, one sound.
      if (this.shock <= 0) this.handed.push('caseKnock')
      this.shock = 0.12
      return
    }
    if (onLamp(at)) {
      // A tap only swings the lamp. Its cord has to be pulled down and held for the lamp to click.
      const rays = this.lampShow().slice(1)
      this.run([{ who: 'lamp', beats: [b(['lampL', ...rays], 0.14, 'lampSwing'), b(['lampR', ...rays], 0.14), b(['lampL', ...rays], 0.1), b(this.lampShow(), 0.01)] }])
      // Only the cord starts a pull. A finger that lands on the shade and slides down pulls nothing.
      if (onCord(at)) this.finger = { kind: 'cord', from: at, level: 0, held: 0 }
      return
    }
    const door = doorAt(at)
    if (door !== null) {
      this.through(door)
      return
    }
    let grip: Target['grip']
    for (const target of this.room.targets(this.house, this.live)) {
      if (!inShape(at, target.shape)) continue
      grip = grip ?? target.grip
      const answer = this.room.touch(target.id, this.house, this.live, this.rng, at)
      if (!answer) continue
      this.apply(answer)
      if (target.grip === 'pull' && !this.scene) this.finger = { kind: 'pull', from: at }
      else if (grip === 'rub' && !this.scene) this.finger = { kind: 'rub' }
      return
    }
    if (grip === 'rub') this.finger = { kind: 'rub' }
    this.bloom = { x: at.x, y: at.y, age: 0 }
    this.handed.push('glassThock')
  }

  /** The finger that is down moved to `at`. */
  move(at: Point): void {
    // A move with no press before it is no touch: a finger that landed in the grown-up's corner and slid out of
    // it was never given to the game, and moves nothing, not even the eyes.
    if (!this.down) return
    this.lookAt(at)
    const finger = this.finger
    // A scene that a rub or a pull started has let go of the finger: its moves are no touch.
    if (this.scene) return
    if (finger.kind === 'cord') {
      const down = at.y - finger.from.y
      const level = down >= PULL[1] ? 2 : down >= PULL[0] ? 1 : 0
      if (level !== finger.level) this.pull(finger, level)
    } else if (finger.kind === 'rub' && this.room.rub) {
      const answer = this.room.rub(this.house, this.live, at)
      if (answer) this.apply(answer)
      if (this.scene) this.finger = NONE
    } else if (finger.kind === 'pull' && this.room.pull) {
      const answer = this.room.pull(this.house, this.live, finger.from.y - at.y)
      if (answer) this.apply(answer)
      if (this.scene) this.finger = NONE
    }
  }

  /** The finger lifted: whatever it held is let go. */
  release(): void {
    this.drop(true)
  }

  /** The finger was taken away, which is not the child letting go: whatever it held goes back without a sound, and nothing is done for the child. */
  cancel(): void {
    this.drop(false)
  }

  private drop(heard: boolean): void {
    const finger = this.finger
    this.finger = NONE
    this.down = false
    const from = this.handed.length
    if (finger.kind === 'button') {
      this.held = null
      this.handed.push('buttonUp')
    } else if (finger.kind === 'cord') {
      if (finger.level > 0) this.pull(finger, 0)
    } else if (finger.kind === 'pull' && this.room.letGo && !this.scene) {
      this.run(this.room.letGo(this.house, this.live))
    }
    if (!heard) this.handed.length = from
  }

  /** The cord goes to `level`: its bobble jumps, the lamp's light shrinks and the house dims. */
  private pull(finger: Extract<Finger, { kind: 'cord' }>, level: 0 | 1 | 2): void {
    const cue: Cue = level === 0 ? 'cordBack' : level === 1 ? 'cordTickA' : 'cordTickB'
    finger.level = level
    finger.held = 0
    this.pulled = level
    this.figures.get('cord')!.play([b(`cord${level}`, Infinity, cue)], this.handed)
    this.rested.set('cord', [`cord${level}`])
    const lamp = this.figures.get('lamp')!
    lamp.idle([b(this.lampShow(), Infinity)], this.handed)
    this.rested.set('lamp', this.lampShow())
  }

  /** Where the finger is, for the eyes that follow it. */
  private lookAt(at: Point): void {
    this.look = { x: at.x, left: 2.5 }
  }

  // --- Time ---------------------------------------------------------------------

  /** Plays `dt` seconds of the house. */
  step(dt: number): void {
    if (!(dt > 0)) return
    const cues = this.handed
    this.time += dt
    const finger = this.finger
    // The cord held right down for long enough: the lamp clicks.
    if (finger.kind === 'cord' && finger.level === 2 && (finger.held += dt) >= PULL_HOLD) {
      this.finger = NONE
      this.pull(finger, 0)
      // The cord springs back under the lamp's click, which is the one sound of that moment.
      if (cues[cues.length - 1] === 'cordBack') cues.pop()
      this.toBed()
    }
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) {
        this.scene = null
        for (const [who, figure] of this.figures) if (figure.posed) this.toIdle(who, figure)
      }
    }
    for (const [who, figure] of this.figures) if (figure.step(dt, cues) && !figure.posed) this.toIdle(who, figure)
    if (this.bloom && (this.bloom.age += dt) > 0.22) this.bloom = null
    this.shock = Math.max(0, this.shock - dt)
    this.look.left = Math.max(0, this.look.left - dt)
    // Nothing sounds by itself before the child's first touch.
    if (!this.woken) cues.length = 0
  }

  /**
   * The game is put away, or goes to rest: it settles as a load would. A scene ends where it was going, whatever
   * a finger held is let go without a sound, everyone is at rest, and the chance starts again from its seed. From
   * here on the game is the one a load of the same save would give.
   */
  park(): void {
    if (this.scene) {
      this.scene.finish()
      this.scene = null
    }
    this.finger = NONE
    this.pulled = 0
    this.held = null
    this.bloom = null
    this.shock = 0
    this.look = { x: 0, left: 0 }
    this.time = 0
    this.handed = []
    this.hushed = true
    this.woken = false
    this.rng = makeRng(this.seed)
    this.told = this.house
    this.room = ROOM[this.house.place]
    this.live = this.room.enter(this.house)
    this.seen = { room: this.house.place, day: this.house.day }
    this.stage(this.live)
  }

  // --- What is on the glass -------------------------------------------------------

  /** The game as it stands now. The same object is filled in again on every call. */
  show(): Shown {
    const shown = this.shown
    shown.room = this.seen.room
    shown.day = this.seen.day
    shown.lit.length = 0
    for (const [who, figure] of this.figures) {
      if (figure.since < AFTERIMAGE) for (const name of figure.before) if (!figure.show.includes(name)) shown.lit.push({ name, strength: AFTER_STRENGTH * (1 - figure.since / AFTERIMAGE), fading: true })
      for (const name of figure.show) shown.lit.push({ name, strength: figure.flicker > 0 ? figure.dip : 1, fading: false })
      for (const eyes of this.room.eyes ?? []) {
        if (eyes.who !== who || !eyes.when.includes(figure.show[0])) continue
        const way = this.look.left <= 0 ? 'C' : this.look.x < eyes.x - 110 ? 'L' : this.look.x > eyes.x + 110 ? 'R' : 'C'
        shown.lit.push({ name: `${eyes.base}${way}`, strength: 1, fading: false })
      }
    }
    shown.bloom = this.bloom ? { x: this.bloom.x, y: this.bloom.y, r: this.bloom.age < 0.08 ? 46 : 30 } : null
    shown.held = this.held
    shown.test = this.held !== null
    shown.shock = this.shock > 0
    shown.dim = this.pulled / 2
    return shown
  }

  private lampShow(): readonly string[] {
    if (!this.seen.day) return ['lampHang']
    return this.pulled === 0 ? ['lampHang', 'lampRays'] : this.pulled === 1 ? ['lampHang', 'lampRaysLow'] : ['lampHang']
  }

  private doorShow(i: number, pose: 'Ajar' | 'Half' | 'Open' = 'Ajar', room: RoomId = this.seen.room, house: House = this.told): readonly string[] {
    return [`door${i}${pose}`, `peek${i}_${PEEKS[DOORS_OF[room][i]].of(house)}`]
  }

  /** Everyone at rest, as the house stands and as the room is seen. */
  private rest(): Cast {
    return { ...this.room.rest({ ...this.told, day: this.seen.day }, this.live), lamp: this.lampShow(), cord: [`cord${this.pulled}`], door0: this.doorShow(0), door1: this.doorShow(1), door2: this.doorShow(2) }
  }

  /** Puts the room `this.seen` names on the glass with everyone at rest, each waiting a time of its own before its first idle run. */
  private stage(live: Live): void {
    this.room = ROOM[this.seen.room]
    this.live = live
    this.figures = new Map()
    this.rested = new Map()
    for (const [who, show] of Object.entries(this.rest())) {
      this.figures.set(who, new Figure(show, 0.3 + this.rng.next() * 2.2, this.tally))
      this.rested.set(who, show)
    }
  }

  /** A scene was ended by a touch: the glass shows the house as it is saved, with everyone at rest. */
  private settle(): void {
    const sameRoom = this.seen.room === this.house.place
    this.told = this.house
    this.seen = { room: this.house.place, day: this.house.day }
    this.pulled = 0
    this.stage(sameRoom ? this.live : ROOM[this.house.place].enter(this.house))
  }

  /** A figure's run is over: it goes to its own idle run, or to rest. */
  private toIdle(who: string, figure: Figure): void {
    const rest = this.rest()[who] ?? []
    const own = (STAIR_FIGURES as readonly string[]).includes(who) ? null : this.room.idle(who, { ...this.told, day: this.seen.day }, this.live, this.rng)
    figure.idle(own ?? [b(rest, Infinity)], this.handed)
    this.rested.set(who, rest)
  }

  // --- Answers --------------------------------------------------------------------

  private apply(answer: Answer): void {
    if (answer.scene) {
      this.play(this.events(answer.plan, 0), answer.house ?? this.house, true)
    } else {
      if (answer.house) {
        this.house = answer.house
        this.told = answer.house
        this.unsaved = answer.save === 'soon' && this.unsaved !== 'now' ? 'soon' : 'now'
      }
      this.run(answer.plan)
    }
    this.refresh(answer.plan)
  }

  /** Each figure of a plan starts its run: now, with its first pose lit in this call, or after its latency. */
  private run(plan: Plan): void {
    for (const part of plan) {
      const figure = this.figures.get(part.who)
      if (!figure) continue
      if (part.after) figure.after(part.after, part.beats)
      else figure.play(part.beats, this.handed)
    }
  }

  /** Whoever is not in the plan, and whose rest the touch has changed, jumps to it. */
  private refresh(plan: Plan): void {
    const rest = this.rest()
    for (const [who, figure] of this.figures) {
      if (figure.busy || figure.posed || plan.some((part) => part.who === who)) continue
      if (!same(this.rested.get(who) ?? [], rest[who] ?? [])) this.toIdle(who, figure)
    }
  }

  /** A plan as the events of a scene, starting `from` seconds into it. */
  private events(plan: Plan, from: number): Event[] {
    const events: Event[] = []
    for (const part of plan) {
      let at = from + (part.after ?? 0)
      for (const beat of part.beats) {
        events.push({ at, who: part.who, beat })
        at += beat.hold
      }
      if (Number.isFinite(at)) events.push({ at, who: part.who, free: true })
    }
    return events
  }

  /**
   * Plays a scene on scene.ts. Its outcome, `house`, is saved as it starts. Each event lights a pose with its
   * sound at its moment; a touch that ends the scene lands none of them, and the glass is settled from the
   * saved house instead. With `tell` the glass is told the outcome at once, as a punchline shows it where it
   * happens; without it the glass goes on telling the house as it was until the scene's cut.
   */
  private play(events: readonly Event[], house: House, tell: boolean): void {
    const beats: SceneBeat[] = [...events]
      .sort((a, c) => a.at - c.at)
      .map((event) => ({
        at: event.at,
        lasts: 0,
        play: (_progress: number, finishing: boolean) => {
          if (finishing) return
          event.act?.()
          const figure = event.who ? this.figures.get(event.who) : undefined
          if (!figure) return
          if (event.beat) figure.pose(event.beat, this.handed)
          else if (event.free) this.toIdle(event.who!, figure)
        },
      }))
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => {
      if (house !== this.house) {
        this.house = house
        this.unsaved = 'now'
      }
      if (tell) this.told = house
    })
    // The beats of its first moment are lit in the call that took the touch.
    this.scene.update(this.time)
    if (!this.scene.running) this.scene = null
  }

  /** The room `house` names is put on the glass, as it stands, with `live` for its short-lived things. */
  private cut(room: RoomId, day: boolean, live: Live): void {
    this.seen = { room, day }
    this.told = this.house
    this.tally.poses += 1
    this.stage(live)
  }

  /** Whoever has a part in what follows a cut is dark until that part begins. */
  private dark(plan: Plan, at: number): Event[] {
    return plan.map((part) => ({ at, who: part.who, beat: b([], Infinity) }))
  }

  /** Through a door: the thing of the room being left does its last, the door swings in three poses, and the next room is lit as it stands. */
  private through(door: 0 | 1 | 2): void {
    const before = this.house
    const { house, morning: first, eats, serves } = goThrough(before, door)
    const events: Event[] = []
    let at = 0
    if (first) {
      // The morning: the lamp comes on, and the baker and the hen get up and go out ahead.
      events.push({ at: 0, act: () => { this.seen = { room: before.place, day: true } } }, { at: 0, who: 'lamp', beat: b(['lampHang', 'lampRays'], Infinity, 'lampClick') })
      const getUp = morning(before, this.live)
      events.push(...this.events(getUp, 0))
      at = planLength(getUp) + 0.1
    }
    const leave = this.room.leave(before, this.live)
    events.push(...this.events(leave.map((part) => ({ ...part, beats: [...part.beats, b(part.beats[part.beats.length - 1].show, Infinity)] })), at))
    at += planLength(leave)
    const peek = this.doorShow(door, 'Half', before.place, before)[1]
    events.push({ at, who: `door${door}`, beat: b([`door${door}Half`, peek], Infinity, 'doorCreak') }, { at: at + 0.11, who: `door${door}`, beat: b([`door${door}Open`, peek], Infinity, 'doorSwing') })
    // The dog who is on his feet goes ahead.
    if (dogAbout(before)) events.push({ at: at + 0.11, who: this.room.dog ?? 'dog', beat: b([], Infinity, before.full ? 'dogRoll' : 'dogTrot') })
    at += 0.3
    const next = ROOM[house.place], live = next.enter(house)
    const back = DOORS_OF[house.place].indexOf(before.place)
    const arrive = next.arrive(house, live, eats || serves)
    const behind = this.doorShow(back, 'Open', house.place, house)[1]
    events.push({ at, act: () => this.cut(house.place, true, live) }, ...this.dark(arrive, at))
    // The door he came through swings shut behind the child.
    events.push(
      { at, who: `door${back}`, beat: b([`door${back}Open`, behind], Infinity) },
      { at: at + 0.14, who: `door${back}`, beat: b([`door${back}Half`, behind], Infinity) },
      { at: at + 0.28, who: `door${back}`, beat: b([`door${back}Ajar`, behind], Infinity, 'latch') },
      { at: at + 0.4, who: `door${back}`, free: true },
    )
    events.push(...this.events(arrive, at))
    // Beside the bathroom, with its glass rubbed clear, the bath is seen through its door, and the duck squeaks.
    const bath = DOORS_OF[house.place].indexOf('bathroom')
    // It squeaks on every arrival, through the bathroom's own door as well: that door is ajar again by then.
    if (bath >= 0 && house.fog === 0) {
      const clear = this.doorShow(bath, 'Ajar', house.place, house)
      events.push({ at: at + 0.5, who: `door${bath}`, beat: b(clear, Infinity, 'duckSqueak') }, { at: at + 0.8, who: `door${bath}`, free: true })
    }
    this.play(events, house, false)
  }

  /** The lamp has clicked. With nothing to put to bed it only blinks; otherwise the whole house goes back to bed. */
  private toBed(): void {
    const before = this.house
    const blink: Plan = [{ who: 'lamp', beats: [b(['lampR', 'lampRays'], 0.16, 'lampClick'), b(['lampHang'], 0.18), b(['lampHang', 'lampRays'], 0.5, 'lampClack'), b(this.lampShow(), 0.01)] }]
    const squint = this.room.squint(before, this.live).map((part) => ({ ...part, after: (part.after ?? 0) + 0.12 }))
    if (!before.day && untouched(before)) {
      this.run([...blink, ...squint])
      return
    }
    const events: Event[] = [...this.events(blink.map((part) => ({ ...part, beats: part.beats.slice(0, 3) })), 0), ...this.events(squint, 0)]
    let at = Math.max(1, planLength(squint) + 0.1)
    const house = lightsOut(), live = ROOM.bedroom.enter(house)
    const beds = bedtime(before)
    // The room is the bedroom, still lit; then everyone gets into bed.
    events.push({ at, act: () => this.cut('bedroom', before.day, live) }, { at, who: 'lamp', beat: b(['lampHang', 'lampRays'], Infinity) }, ...this.dark(beds, at), ...this.events(beds, at))
    at += planLength(beds) + 0.25
    // The lamp goes dark, and the owl opens its eyes in the window.
    events.push({ at, act: () => { this.seen = { room: 'bedroom', day: false } } }, { at, who: 'lamp', beat: b(['lampHang'], Infinity, 'lampOut') })
    if (before.day) events.push({ at, who: 'owl', beat: b([], Infinity) }, ...this.events([{ who: 'owl', after: 0.25, beats: OWL_BACK }], at))
    events.push({ at: at + 0.9, who: 'lamp', free: true })
    this.play(events, house, false)
  }
}
