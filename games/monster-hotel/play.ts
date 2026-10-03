import { arrivalsAt } from './airs'
import { awake, isGuestAt, placeOf, roomOf, thing as thingOf, type Arrangement } from './arrangement'
import { castById, neatOf } from './casts'
import { LADDER, WHOLE_PATHS_UNTIL } from './config'
import { porterComesIn, setDownIn, tapIn, touchCoach, turnWheelIn, type Cue, type Pairing, type Turn } from './cycle'
import { handPose, type Guidance, type HandPose } from './guidance'
import { TASTES, type GuestId, type Phase } from './guests'
import { hintsFor, type Hint } from './hint'
import { dropAt, dropThingAt, hitAt, roomUnder, type Drop, type Standing } from './hit'
import type { Gesture } from './input'
import { bodyBox, fromPlain, spotsOf, thingBox, toPlain, type Spot } from './inkPlaces'
import { REST, type InkBody, type InkGuest, type InkScene, type InkSide, type InkSweep, type InkThing, type InkView } from './inkScene'
import type { PageLayout } from './layout'
import { Dangle, MotionDirector, both, pressed, settles } from './motion'
import type { Held, Outcome, Target } from './moves'
import { ownRoom, pageOfArrangement, takes } from './page'
import { Scene, followedBy, sceneLength, type Beat } from './scene'
import { coachChangesOver, neatWay, pairing, restStage, sentAway, settledDay, whereOn, type Hooks, type Leg, type Point, type Stage, type Walk } from './stage'
import { arrangementOf, type Stay } from './stay'
import * as voices from './voices'
import type { HeardAs, Sound } from './voices'

// The game on the toy. It holds the stay (stay.ts), plays every touch through
// the cycle's rules (cycle.ts), and hands the page a scene and the Mount the
// sounds to play. Touch a guest and the page is drawn again from where it
// stands; carry a guest or a thing and set it down; turn the wheel; touch the
// coach. When the rules cue a short scene, it plays here on scene.ts over a
// stay that already holds its outcome. No renderer, no DOM and no clock: time
// is the seconds the Mount hands to `step`, and the page's layout comes with
// each touch.

/** How long the page takes to be drawn again from a new place, in seconds. */
export const SWEEP_SECONDS = 0.34
/** How long the wheel takes to come round. */
export const WHEEL_SECONDS = 0.5
/** How long a guest keeps looking toward a knock, and how long a knock's marks last. */
export const LOOK_SECONDS = 1.1
export const KNOCK_SECONDS = 0.5
/** How long a guest takes to walk to a new place that the rules, and not the child's hand, gave it. */
export const WALK_SECONDS = 0.6
/** How far the porter trundles toward the house when he comes in, in the drawing's units. */
export const PORTER_REACH = 6
/** After this long with no touch the house's own sounds thin, and after the second they stop: an idle game goes quiet. */
export const QUIET_AFTER = [25, 60] as const

/** What a touch asks to be saved: nothing, soon (at the throttle), or at once. */
export type Save = 'none' | 'soon' | 'now'

const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3
const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }
const sameView = (a: InkView | null, b: InkView | null) => (a === null ? b === null : b !== null && a.from === b.from)
const keyOf = (held: Held) => ('guest' in held ? `g:${held.guest}` : `t:${held.thing}`)
/** A sound, later by some seconds. */
const later = (sound: Sound, by: number): Sound => sound.map((note) => ({ ...note, at: note.at + by }))

type Pressing = { held: Held; downAt: number; liftedAt: number | null; again: boolean }
type Carrying = { held: Held; x: number; y: number; lastX: number; dangle: Dangle; room: number | null }
type Sweeping = { x: number; y: number; from: number; under: InkView | null }

/** How a thing takes a finger: a small squash that rings a little. */
function thingPressed(held: number, since: number | null): InkBody {
  const down = 0.14 * (0.7 + 0.3 * Math.min(1, held / 0.1))
  if (since === null) return { sx: 1 + down * 0.6, sy: 1 - down, rot: 0, dx: 0, dy: 0 }
  const ring = down * Math.exp(-6 * since) * Math.cos(since * 5.5 * Math.PI * 2)
  return { sx: 1 + ring * 0.6, sy: 1 - ring, rot: 0, dx: 0, dy: 0 }
}

/** The sound of each way a guest or a thing can be set down that needs no more than its name. */
const SET_DOWN: Partial<Record<Outcome, Sound>> = {
  'moves-in': voices.movesIn,
  shares: voices.shares,
  swaps: voices.swaps,
  'through-the-wall': voices.throughTheWall,
  'to-lobby': voices.toLobby,
  'to-bench': voices.toBench,
  'no-bed': voices.noBed,
  nothing: voices.putBack,
  'quilt-on-bed': voices.quiltOnBed,
  wraps: voices.wraps,
  'quilt-hangs': voices.quiltHangs,
  'pipe-stands': voices.pipeStands,
  trumpet: voices.trumpet,
  'pipe-joins': voices.pipeJoins,
  'stove-warms': voices.stoveWarms,
  'stove-scorches': voices.stoveScorches,
  'ice-chills': voices.iceChills,
  'ice-frosts': voices.iceFrosts,
  'clock-by-bed': voices.clockByBed,
  'clock-kept': voices.clockKept,
  'clock-shrugged-off': voices.clockShruggedOff,
  'clock-on-wall': voices.clockOnWall,
  'to-cupboard': voices.toCupboard,
  'handed-back': voices.handedBack,
}

export class Play {
  stay: Stay
  private seconds = 0
  private readonly director: MotionDirector
  private readonly sounds: Sound[] = []
  private save: Save = 'none'
  /** What is under the finger, and everything still springing back from one. */
  private pressing: Pressing | null = null
  private readonly springing = new Map<string, Pressing>()
  private carrying: Carrying | null = null
  /** The view the page is in, and the sweep that is bringing it. */
  private view: InkView | null
  private sweeping: Sweeping | null = null
  private hour: { x: number; y: number; from: number; under: Phase } | null = null
  private readonly lamps = new Map<number, { angle: number; speed: number }>()
  private knocks: { x: number; y: number; from: number }[] = []
  private readonly looking = new Map<GuestId, { side: InkSide; until: number }>()
  private readonly ways = new Map<GuestId, number>()
  private lastTouch = 0
  private beat = -1
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** The scene that is playing, and the stage it plays on. */
  private scene_: Scene | null = null
  private sceneEnds = 0
  private stage: Stage = restStage()
  private landing = false
  private honk = -10
  /** Where each guest stood on the plain page when the page was last drawn, and who is walking from where. */
  private readonly stood = new Map<GuestId, Spot>()
  private readonly walking = new Map<GuestId, { legs: Leg[]; from: number }>()
  private readonly placedByHand = new Set<GuestId>()
  private readonly stepped = new WeakSet<Walk>()
  private page: PageLayout | null = null
  private readonly breaths = new Map<GuestId, number>()

  constructor(stay: Stay, seed: number) {
    this.stay = stay
    this.director = new MotionDirector(seed)
    // Found as left: the page is in the view it was left in, with no sweep and no scene to replay.
    this.view = this.viewFor(stay.from)
  }

  /** The sounds queued since the last call, for the Mount to play inside the touch. */
  takeSounds(): Sound[] {
    return this.sounds.splice(0)
  }

  /** What has to be saved since the last call. */
  takeSave(): Save {
    const save = this.save
    this.save = 'none'
    return save
  }

  /** A finger is working, a guest or a thing is in the hand, or a scene is playing: none of them is idleness. */
  get busy(): boolean {
    return this.pressing?.liftedAt === null || this.carrying !== null || this.playing
  }

  /** A short scene is playing. */
  get playing(): boolean {
    return this.scene_ !== null && this.scene_.running
  }

  /** The house as the page shows it: the child's, or the one a scene is showing, at the hour the page is showing. */
  private get shown(): Arrangement {
    const house = this.stage.house ?? arrangementOf(this.stay)
    return this.stage.hour === null ? house : { ...house, phase: this.stage.hour }
  }

  private get arrangement(): Arrangement {
    return arrangementOf(this.stay)
  }

  /** The view from a guest's place. Carried (`heldOver` given, a room or null), its room is the one it is held over, and the house lies as it is: nothing large, nothing turned. */
  private viewFor(from: GuestId | null, heldOver?: number | null): InkView | null {
    if (from === null || placeOf(this.arrangement, from) === null || placeOf(this.arrangement, from) === 'gone') return null
    // Its own room is drawn large; while it has none, the room it asks for keeps its ink at its own size.
    if (heldOver === undefined) return typeof placeOf(this.arrangement, from) === 'number' ? { from, room: ownRoom(this.arrangement, from) } : { from, room: ownRoom(this.arrangement, from), large: false }
    return { from, room: heldOver, large: false, inHand: true }
  }

  /** Every guest the page shows with its standing place on the plain page. */
  private standing(page: PageLayout): Standing[] {
    return spotsOf(pageOfArrangement(this.shown, null, true).guests, page)
  }

  private things(): InkThing[] {
    return this.shown.things.map((item) => ({ kind: item.kind, at: item.at, dial: item.dial }))
  }

  private sound(sound: Sound | null | undefined): void {
    if (sound && sound.length > 0) this.sounds.push(sound)
  }

  private mark(save: Save): void {
    if (save === 'now' || (save === 'soon' && this.save === 'none')) this.save = save
  }

  /** Draws the page again from a new place, spreading from a point on the screen. Nothing happens when the place is the same. */
  private sweepTo(view: InkView | null, at: Point): void {
    if (sameView(this.view, view)) {
      this.view = view
      return
    }
    this.sweeping = { x: at.x, y: at.y, from: this.seconds, under: this.view }
    this.view = view
    this.sound(view ? voices.sweepTo(view.from) : voices.sweepPlain)
  }

  private look(from: GuestId | null, at: Point): void {
    if (this.stay.from === from) return
    this.stay = { ...this.stay, from }
    this.sweepTo(this.viewFor(from), at)
    this.mark('soon')
  }

  /** The feet of a guest on the screen, in the view the page is in. */
  private feet(page: PageLayout, id: GuestId): Point | null {
    const found = this.standing(page).find((one) => one.guest.id === id)
    return found ? fromPlain(page, this.view, { x: found.spot.x, y: found.spot.y }) : null
  }

  // --- Touch ----------------------------------------------------------------

  /** One gesture from the Mount, in logical pixels of the surface. */
  gesture(gesture: Gesture, page: PageLayout): void {
    this.page = page
    if (gesture.type === 'press') this.press(gesture.at, page)
    else if (gesture.type === 'tap') this.lift(page, true)
    else if (gesture.type === 'pressEnd') this.lift(page, false)
    else if (gesture.type === 'dragStart') this.pickUp(gesture.from)
    else if (gesture.type === 'dragMove' || gesture.type === 'dragLift') this.carry(gesture.at, page)
    else this.setDown(gesture.at, page)
  }

  /** The finger lands: a scene that is playing ends, and then whatever the finger landed on answers now, in this frame. */
  private press(at: Point, page: PageLayout): void {
    this.endScene()
    const speed = Math.max(0, Math.min(1, 1 - (this.seconds - this.lastTouch) / 1.2))
    this.lastTouch = this.seconds
    const plain = toPlain(page, this.view, at)
    const hit = hitAt(page, this.standing(page), plain, this.things(), true)
    if (hit.kind === 'corner') return
    this.pressing = null
    if (hit.kind === 'guest') {
      const id = hit.id
      const again = this.stay.from === id
      this.hold({ guest: id }, again)
      const way = this.ways.get(id) ?? 0
      this.ways.set(id, way + 1)
      const up = awake(this.arrangement, id, this.stay.phase) || typeof placeOf(this.arrangement, id) !== 'number'
      this.sound(voices.grunt(id, way, hit.where, speed, up))
      // The page is drawn again from where it stands, starting at its feet, without waiting for the finger to lift.
      if (!again) this.look(id, this.feet(page, id) ?? at)
      return
    }
    if (hit.kind === 'thing') {
      // A thing answers the finger with a squash and its own small sound; what the touch does to it waits for the lift or the carry.
      this.hold({ thing: hit.thing }, false)
      return this.sound(voices.touched[hit.thing])
    }
    if (hit.kind === 'wheel') return this.turn(page)
    if (hit.kind === 'coach') return this.coach()
    if (hit.kind === 'room') {
      // The room's lamp is set swinging, the way the finger came.
      const lamp = this.lamps.get(hit.room) ?? { angle: 0, speed: 0 }
      const middle = page.rooms[hit.room].rect
      lamp.speed += (plain.x < middle.x + middle.w / 2 ? 1 : -1) * 4.2
      this.lamps.set(hit.room, lamp)
      return this.sound(voices.lamp)
    }
    if (hit.kind === 'paper') {
      // The paper margin gives the plain page back.
      this.sound(voices.paper)
      return this.look(null, at)
    }
    // Plaster, slate, the lobby floor, the bench, the porter and the door: each knocks, rings or creaks, and everyone looks.
    this.knocks.push({ x: at.x, y: at.y, from: this.seconds })
    this.sound(hit.kind === 'porter' ? voices.bell : hit.kind === 'door' ? voices.door : hit.kind === 'bench' ? voices.toBench : voices.knock)
    this.lookToward(plain, page, false)
  }

  private hold(held: Held, again: boolean): void {
    this.pressing = { held, downAt: this.seconds, liftedAt: null, again }
    this.springing.set(keyOf(held), this.pressing)
  }

  /** Every guest who is up looks toward a point for a moment: left, right, up or down, whichever it mostly is. `all` wakes the sleepers' eyes too. */
  private lookToward(point: Point, page: PageLayout, all: boolean): void {
    for (const { guest, spot } of this.standing(page)) {
      if (!guest.awake && !all) continue
      const dx = point.x - spot.x, dy = point.y - (spot.y - 60 * page.scale)
      const side: InkSide = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
      this.looking.set(guest.id, { side, until: this.seconds + LOOK_SECONDS })
    }
  }

  /** The child turns the day-and-night wheel: the hour changes, the page is redrawn from the wheel outward, and every placed thing answers the new hour in turn. */
  private turn(page: PageLayout): void {
    const under = this.stay.phase
    const turn = turnWheelIn(this.stay)
    this.stay = turn.stay
    this.sweepHour(under, page)
    let chain = voices.wheelTurns(this.stay.phase)
    let at = 0.75
    for (const item of this.arrangement.things) {
      if (item.at === 'cupboard') continue
      const keeper = item.kind === 'clock' && isGuestAt(item.at) && TASTES[item.at.guest].flexible ? item.at.guest : null
      chain = [...chain, ...later(keeper ? voices.yawn(keeper) : voices.throughTheHour[item.kind], at)]
      at += 0.14
    }
    this.sound(chain.filter((note) => note.at + note.attack + note.length <= voices.RANGE.total))
    this.mark('soon')
    this.follow(turn, page)
  }

  private sweepHour(under: Phase, page: PageLayout): void {
    const wheel = fromPlain(page, this.view, { x: page.wheel.x + page.wheel.w / 2, y: page.wheel.y + page.wheel.h / 2 })
    this.hour = { x: wheel.x, y: wheel.y, from: this.seconds, under }
  }

  /** The child touches the coach: before the cycle is judged the driver honks and the door swings; after it, the coach changes over. */
  private coach(): void {
    const turn = touchCoach(this.stay)
    if (turn.outcome === 'coach-honks') {
      this.honk = this.seconds
      return this.sound(voices.horn)
    }
    this.changeOver(turn)
  }

  /** The finger lifts without having moved (a tap), or the touch is taken away. */
  private lift(page: PageLayout, tapped: boolean): void {
    const pressing = this.pressing
    if (!pressing || pressing.liftedAt !== null) return
    pressing.liftedAt = this.seconds
    if (!tapped) return
    const held = pressing.held
    if ('guest' in held) {
      // Touching the guest the page is already drawn from gives the plain page back.
      if (pressing.again && this.stay.from === held.guest) this.look(null, this.feet(page, held.guest) ?? { x: page.width / 2, y: page.height / 2 })
      return
    }
    // A tapped thing does its own thing: feathers, a toot, a step of the dial, a ring.
    const turn = tapIn(this.stay, held)
    this.stay = turn.stay
    const box = thingBox({ kind: held.thing, at: thingOf(this.arrangement, held.thing)?.at ?? 'cupboard' }, page, this.standing(page))
    const where = box ? fromPlain(page, this.view, { x: box.x + box.w / 2, y: box.y + box.h / 2 }) : null
    if (turn.outcome === 'feathers') {
      this.sound(voices.feathers)
      if (where) this.knocks.push({ ...where, from: this.seconds })
    } else if (turn.outcome === 'toots') this.sound(voices.toots)
    else if (turn.outcome === 'stove-dial') this.sound(voices.stoveDial(thingOf(this.arrangement, 'stove')?.dial ?? 1))
    else if (turn.outcome === 'ice-dial') this.sound(voices.iceDial(thingOf(this.arrangement, 'ice')?.dial ?? 1))
    else if (turn.outcome === 'clock-rings') {
      this.sound(voices.clockRings)
      // Every sleeper in the house opens one eye.
      if (box) this.lookToward({ x: box.x + box.w / 2, y: box.y + box.h / 2 }, page, true)
    }
    if (turn.outcome === 'stove-dial' || turn.outcome === 'ice-dial') this.mark('soon')
    this.follow(turn, page)
  }

  /** The finger that landed on a guest or a thing has moved: it is picked up. A carried guest's page stays its own for as long as it is carried. */
  private pickUp(from: Point): void {
    const pressing = this.pressing
    if (!pressing || pressing.liftedAt !== null) return
    pressing.liftedAt = this.seconds
    const held = pressing.held
    if ('guest' in held) {
      const id = held.guest
      if (placeOf(this.arrangement, id) === 'gone' || placeOf(this.arrangement, id) === null) return
      this.carrying = { held, x: from.x, y: from.y, lastX: from.x, dangle: new Dangle(id), room: null }
      this.sound(voices.lifted(id))
      // In the hand, no room is drawn large: the house lies as it is under the finger.
      this.stay = { ...this.stay, from: id }
      this.sweepTo(this.viewFor(id, null), from)
      return
    }
    // A thing in the hand swings like something light. The page stays as it was.
    this.carrying = { held, x: from.x, y: from.y, lastX: from.x, dangle: new Dangle('lizard'), room: null }
    this.sound(voices.touched[held.thing])
  }

  private carry(at: Point, page: PageLayout): void {
    const carrying = this.carrying
    if (!carrying) return
    carrying.x = at.x
    carrying.y = at.y
    if (!('guest' in carrying.held)) return
    // The room it is held over is the one in full ink, so the child sees what would reach it there.
    const over = roomUnder(page, toPlain(page, this.view, at))
    if (over !== carrying.room) {
      carrying.room = over
      this.view = this.viewFor(carrying.held.guest, over)
    }
  }

  private targetOf(drop: Drop): Target | null {
    if (drop.kind === 'nowhere') return null
    if (drop.kind === 'guest') return { guest: drop.id }
    if (drop.kind === 'room') return { room: drop.room }
    if (drop.kind === 'edge') return { edge: drop.id, nearer: drop.nearer }
    return drop.kind
  }

  /** What is in the hand is set down: the house changes as the grid says, each way with its own sound, and the rules say what follows. */
  private setDown(at: Point, page: PageLayout): void {
    const carrying = this.carrying
    if (!carrying) return
    this.carrying = null
    const held = carrying.held
    const plain = toPlain(page, this.view, at)
    const standing = this.standing(page)
    const drop = 'guest' in held ? dropAt(page, standing, plain, held.guest, true) : dropThingAt(page, standing, plain)
    const target = this.targetOf(drop)
    let turn: Turn = { stay: this.stay, outcome: 'nothing', cues: [] }
    if (target) turn = setDownIn(this.stay, held, target)
    this.stay = turn.stay
    if ('guest' in held) this.placedByHand.add(held.guest)
    const outcome = turn.outcome
    if (outcome === 'stove-to-guest' || outcome === 'ice-to-guest') this.sound(drop.kind === 'guest' ? voices.takesTo(drop.id, outcome === 'stove-to-guest' ? 'stove' : 'ice') : null)
    else if (outcome !== 'sent-away' && outcome !== 'coach-honks') this.sound(SET_DOWN[outcome] ?? voices.putBack)
    if ('guest' in held) {
      // Setting a guest down gives the plain page back, from where it was set down.
      this.stay = { ...this.stay, from: null }
      this.sweepTo(null, at)
    }
    this.mark('soon')
    this.follow(turn, page)
  }

  /** What the rules cue after a touch: the scenes, each over a stay that already holds its outcome. */
  private follow(turn: Turn, page: PageLayout): void {
    const cues = turn.cues
    if (cues.includes('coach-changes-over')) return this.changeOver(turn)
    const hooks = this.hooks(page)
    let beats: Beat[] = []
    const pair = cues.find((cue): cue is Pairing => cue === 'sauna' || cue === 'duet')
    if (pair) beats = pairing(this.stage, pair, hooks)
    if (cues.includes('sent-away')) beats = followedBy(beats, sentAway(this.stage, this.leaving(turn, page), hooks))
    if (cues.includes('settled-day')) {
      beats = followedBy(beats, settledDay(this.stage, this.stay.phase, hooks))
      const cast = castById(this.stay.cast)
      if (cues.includes('neat-way') && cast) beats = followedBy(beats, neatWay(this.stage, { ...neatOf(cast), phase: this.stay.phase }, hooks))
    }
    if (beats.length > 0) this.start(beats, cues)
  }

  private start(beats: Beat[], cues: readonly Cue[]): void {
    this.endScene()
    this.scene_ = new Scene(beats)
    this.sceneEnds = this.seconds + sceneLength(beats)
    // The outcome is in the stay already; a scene that judged a cycle or emptied the house is saved at once.
    this.scene_.start(this.seconds, () => this.mark(cues.some((cue) => cue === 'settled-day' || cue === 'sent-away' || cue === 'coach-changes-over') ? 'now' : 'soon'))
  }

  /** A touch, or a put-away: the scene ends now, every beat lands where it was going in silence, and the stage is at rest. */
  private endScene(): void {
    if (!this.scene_) return
    if (this.scene_.running) {
      this.landing = true
      this.scene_.finish()
      this.landing = false
      this.walking.clear()
      this.hour = null
    }
    this.scene_ = null
    this.stage = restStage()
  }

  private hooks(page: PageLayout): Hooks {
    return {
      landing: () => this.landing,
      hour: (to) => {
        // The page shows another hour and back: a view, swept from the wheel like any turn of it.
        const showing = this.stage.hour ?? this.stay.phase
        const next = to ?? this.stay.phase
        if (showing !== next) {
          this.sweepHour(showing, page)
          this.sound(voices.wheelTurns(next))
        }
      },
      houseChanges: () => {},
      porterComesIn: () => {
        this.stay = porterComesIn(this.stay)
        this.mark('now')
      },
      cue: (name) => {
        const sound: Record<typeof name, Sound> = {
          'door-opens': voices.doorOpens, 'door-shuts': voices.doorShuts, 'coach-leaves': voices.coachLeaves, 'coach-arrives': voices.coachArrives,
          'porter-trundles': voices.porterTrundles, 'porter-shows': voices.porterShows, 'porter-goes': voices.porterGoes, sauna: voices.sauna, duet: voices.duet,
        }
        this.sound(sound[name])
      },
    }
  }

  /** The door a guest standing at a point goes out by: its room's door, the house end of the lobby, or the steps from the street. */
  private doorFor(page: PageLayout, at: Point): Point {
    const u = page.scale
    const room = page.rooms.find((layout) => at.x >= layout.rect.x && at.x <= layout.rect.x + layout.rect.w && at.y >= layout.rect.y && at.y <= layout.rect.y + layout.rect.h + 4 * u)
    if (room) return { x: room.door.x + room.door.w / 2, y: room.door.y + room.door.h }
    if (at.y <= page.lobby.y + page.lobby.h + 4 * u) return { x: page.lobby.x + 14 * u, y: at.y }
    return this.doors(page).steps
  }

  /** The way from one standing place to another without passing through a wall: straight across a room, or out by one door and in by another. */
  private legsBetween(page: PageLayout, from: Point, to: Point): Leg[] {
    const a = this.doorFor(page, from), b = this.doorFor(page, to)
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1) return [{ from, to }]
    return [{ from, to: a }, { from: b, to }]
  }

  /** The foot of the coach's door, the foot of the front door, and the foot of the steps between them. */
  private doors(page: PageLayout): { coach: Point; front: Point; steps: Point } {
    return {
      coach: { x: page.coachDoor.x + page.coachDoor.w / 2, y: page.coachDoor.y + page.coachDoor.h },
      front: { x: page.frontDoor.x + page.frontDoor.w / 2, y: page.frontDoor.y + page.frontDoor.h },
      steps: { x: page.steps.x + page.steps.w / 2, y: page.coachDoor.y + page.coachDoor.h },
    }
  }

  /**
   * The guests who were on the page before a turn emptied it, as walks out to
   * the coach by doors and never through a wall: a guest in a room goes out
   * by its room's door and comes out of the front door; one in the lobby
   * walks to the front door; all go down the steps and along the street. The
   * one on the bench walks along the street.
   */
  private leaving(_turn: Turn, page: PageLayout): Walk[] {
    const { coach, front, steps } = this.doors(page)
    const out = [{ from: front, to: steps }, { from: steps, to: coach }]
    return [...this.stood].map(([id, spot]) => {
      const here = { x: spot.x, y: spot.y }
      const room = page.rooms.find((layout) => here.x >= layout.rect.x && here.x <= layout.rect.x + layout.rect.w && here.y >= layout.rect.y && here.y <= layout.rect.y + layout.rect.h + 4 * page.scale)
      if (room) return { id, legs: [{ from: here, to: { x: room.door.x + room.door.w / 2, y: room.door.y + room.door.h } }, ...out], progress: 0 }
      const inLobby = here.y <= page.lobby.y + page.lobby.h + 4 * page.scale && here.x >= page.lobby.x
      if (inLobby) return { id, legs: [{ from: here, to: front }, ...out], progress: 0 }
      return { id, legs: [{ from: here, to: coach }], progress: 0 }
    })
  }

  /** The coach changes over: the stay already holds the new coach-load. The old guests file out, the new ones walk to their places. */
  private changeOver(turn: Turn): void {
    const page = this.page
    const leaving = page ? this.leaving(turn, page) : []
    this.stay = turn.stay
    this.view = null
    this.sweeping = null
    this.stood.clear()
    this.walking.clear()
    this.endScene()
    if (!page) return this.mark('now')
    // The new guests come along the street from the coach, up the steps, in at the front door and along the lobby to their places.
    const { coach, front, steps } = this.doors(page)
    const arriving: Walk[] = this.standing(page)
      .filter((one) => one.guest.place === 'lobby')
      .map((one) => ({ id: one.guest.id, legs: [{ from: coach, to: steps }, { from: steps, to: front }, { from: front, to: { x: one.spot.x, y: one.spot.y } }], progress: -1 }))
    this.start(coachChangesOver(this.stage, leaving, arriving, this.hooks(page)), ['coach-changes-over'])
  }

  /** The surface is going to rest: a scene ends, and what is in the hand goes back where it came from, since nothing is saved in the air. */
  rest(): void {
    if (this.playing) {
      this.endScene()
      this.mark('now')
    }
    if (this.carrying) {
      const held = this.carrying.held
      this.carrying = null
      if ('guest' in held) {
        this.stay = { ...this.stay, from: null }
        this.view = null
        this.sweeping = null
      }
      this.mark('now')
    }
    if (this.pressing && this.pressing.liftedAt === null) this.pressing.liftedAt = this.seconds
  }

  // --- Time ------------------------------------------------------------------

  /** Plays `dt` seconds of the game's own time: the scene, the springs, the lamps, and the house's own sounds on their beat. */
  step(dt: number): void {
    this.seconds += dt
    const now = this.seconds
    if (this.scene_) {
      this.scene_.update(now)
      for (const walk of [...this.stage.leaving, ...this.stage.arriving]) {
        if (walk.progress > 0 && walk.progress < 1 && !this.stepped.has(walk)) {
          this.stepped.add(walk)
          this.sound(voices.step)
        }
      }
      if (!this.scene_.running) {
        this.scene_ = null
        this.stage = restStage()
      }
    }
    const carrying = this.carrying
    if (carrying) {
      carrying.dangle.step(dt, dt > 0 ? (carrying.x - carrying.lastX) / dt : 0)
      carrying.lastX = carrying.x
    }
    if (this.sweeping && now - this.sweeping.from >= SWEEP_SECONDS) this.sweeping = null
    if (this.hour && now - this.hour.from >= WHEEL_SECONDS) this.hour = null
    for (const [key, pressing] of this.springing) {
      const lasts = key.startsWith('g:') ? settles(key.slice(2) as GuestId) : 0.8
      if (pressing.liftedAt !== null && now - pressing.liftedAt > lasts) this.springing.delete(key)
    }
    for (const [room, lamp] of this.lamps) {
      // A lamp on its flex: a pendulum that dies away in a few swings.
      lamp.speed += (-46 * lamp.angle - 1.5 * lamp.speed) * dt
      lamp.angle = Math.max(-0.9, Math.min(0.9, lamp.angle + lamp.speed * dt))
      if (Math.abs(lamp.angle) < 0.004 && Math.abs(lamp.speed) < 0.02) this.lamps.delete(room)
    }
    this.knocks = this.knocks.filter((one) => now - one.from < KNOCK_SECONDS)
    for (const [id, look] of this.looking) if (now >= look.until) this.looking.delete(id)
    for (const [id, walk] of this.walking) if (now - walk.from >= WALK_SECONDS) this.walking.delete(id)
    this.ambient(now)
  }

  /** The house's own sounds: the tuba and the singer on their beat, as the page's place hears them, and each sleeper's snore. An idle game thins them and then goes quiet. */
  private ambient(now: number): void {
    const idle = now - this.lastTouch
    if (idle > QUIET_AFTER[1] && !this.playing) return
    const thin = idle > QUIET_AFTER[0] && !this.playing
    const beat = Math.floor(now * voices.TUBA_BEAT)
    const house = this.shown
    if (beat !== this.beat) {
      this.beat = beat
      if (!thin || beat % 2 === 0) {
        const tuba = this.heard(house, 'troll')
        if (tuba) this.sound(voices.tuba(beat, tuba))
        const aria = this.heard(house, 'singer')
        if (aria) this.sound(voices.aria(beat, aria))
      }
    }
    // A snore at the top of every few breaths of each sleeper who has a room, each in its own voice.
    for (const guest of house.guests) {
      const id = guest.id
      const inHand = !!this.carrying && 'guest' in this.carrying.held && this.carrying.held.guest === id
      if (typeof guest.at !== 'number' || awake(house, id, house.phase) || inHand) continue
      const breath = Math.floor(now * voices.SNORES[id])
      if (breath === this.breaths.get(id)) continue
      this.breaths.set(id, breath)
      if (thin || this.view?.from === id) continue
      this.sound(voices.snore(id, breath, this.view ? 'faint' : 'plain'))
    }
  }

  /** How a noise-maker is heard just now, or null when it is not making its noise. */
  private heard(house: Arrangement, id: 'troll' | 'singer'): HeardAs | null {
    const carried = this.carrying && 'guest' in this.carrying.held && this.carrying.held.guest === id
    if (roomOf(house, id) === null || carried || !awake(house, id, house.phase)) return null
    if (house.things.some((item) => item.kind === 'quilt' && isGuestAt(item.at) && item.at.guest === id)) return null
    const view = this.view
    if (!view) return 'plain'
    if (view.from === id) return 'loved'
    const reaching = arrivalsAt(house, house.phase).find((arrival) => arrival.source.air === 'din' && 'guest' in arrival.source.by && arrival.source.by.guest === id && arrival.room === view.room)
    return reaching ? takes(house, view.from, reaching) : 'faint'
  }

  // --- The page ----------------------------------------------------------------

  /** How a guest's figure is moved this frame: its own breathing and fidgets, the spring of a finger on it, and its part in a pairing. */
  private bodyOf(id: GuestId, isAwake: boolean): InkBody {
    const pressing = this.springing.get(`g:${id}`)
    const carried = this.carrying && 'guest' in this.carrying.held && this.carrying.held.guest === id
    const free = !pressing && !carried && !this.playing
    let body = this.director.body(id, this.seconds, isAwake, free)
    if (pressing) body = both(body, pressed(id, (pressing.liftedAt ?? this.seconds) - pressing.downAt, pressing.liftedAt === null ? null : this.seconds - pressing.liftedAt))
    const pair = this.stage.pair
    if (pair) {
      const t = pair.progress, swell = Math.sin(Math.min(1, t * 4) * Math.PI * 0.5) * Math.sin(Math.min(1, (1 - t) * 4) * Math.PI * 0.5)
      // The sauna: the yeti sags lower and lower and wider and wider. The duet: the two sway against each other, in time.
      if (pair.kind === 'sauna' && id === 'yeti') body = both(body, { sx: 1 + 0.12 * swell, sy: 1 - 0.16 * swell, rot: 0, dx: 0, dy: 0 })
      if (pair.kind === 'duet' && (id === 'troll' || id === 'singer')) body = both(body, { sx: 1, sy: 1 + 0.04 * swell, rot: (id === 'troll' ? 1 : -1) * 0.09 * swell * Math.sin(t * Math.PI * 6), dx: 0, dy: 0 })
    }
    return body
  }

  /** The moves the ghost hand may show, and the one this showing is of. */
  private hintOf(guidance: Guidance): Hint | null {
    const hints = hintsFor(this.stay)
    return hints.length > 0 ? hints[Math.max(0, guidance.demoIndex) % hints.length] : null
  }

  /** Where the ghost hand's fingertip is on the screen, what it presses, and how far that is lifted. */
  private handFor(hint: Hint | null, guidance: Guidance, page: PageLayout, standing: Standing[]): { hand: NonNullable<InkScene['hand']>; press: Held | null; lifted: number } | null {
    if (!hint || guidance.demo === null) return null
    let target: Point | null = null
    let held: Held | null = null
    if (hint.kind === 'wheel') target = { x: page.wheel.x + page.wheel.w * 0.62, y: page.wheel.y + page.wheel.h * 0.62 }
    else if (hint.kind === 'coach') target = { x: page.coachDoor.x + page.coachDoor.w * 0.6, y: page.coachDoor.y + page.coachDoor.h * 0.45 }
    else if (hint.kind === 'handle') {
      const box = thingBox({ kind: hint.thing, at: thingOf(this.arrangement, hint.thing)?.at ?? 'cupboard' }, page, standing)
      target = box ? { x: box.x + box.w * 0.7, y: box.y + box.h * 0.5 } : null
      held = { thing: hint.thing }
    } else {
      const found = standing.find((one) => one.guest.id === hint.guest)
      const box = found ? bodyBox(found.spot, page) : null
      // The fingertip lands on the guest's near shoulder, so the hand itself lies beside the figure and not over it.
      target = box ? { x: box.x + box.w * 0.8, y: box.y + box.h * 0.38 } : null
      held = { guest: hint.guest }
    }
    if (!target) return null
    target = fromPlain(page, this.view, target)
    // The template's hand: it fades in, presses and fades out. A tap is its presses where it stands; a lift is one
    // press held while the guest or the thing comes up a little and goes back down.
    const lifts = hint.kind === 'lift' || hint.kind === 'handle'
    const pose = handPose(guidance.demo, lifts, this.pose)
    const down = pose.press > 0.5
    const lifted = lifts ? Math.sin(pose.travel * Math.PI) * 24 * pose.press : 0
    return {
      hand: { x: target.x, y: target.y - lifted * page.scale + (1 - pose.press) * 10 * page.scale, down, alpha: pose.opacity },
      press: down ? held : null,
      lifted,
    }
  }

  /** The scene the page draws this frame. `guidance` is what the idle ladder returned. */
  scene(page: PageLayout, guidance: Guidance | null = null): InkScene {
    this.page = page
    const house = this.shown
    const now = this.seconds
    const view = this.playing && this.stage.leaving.length + this.stage.arriving.length > 0 ? null : this.view
    const cast = castById(this.stay.cast)
    const early = cast ? LADDER.indexOf(cast.position) <= LADDER.indexOf(WHOLE_PATHS_UNTIL) : true
    const base = pageOfArrangement(house, view?.from ?? null, early, view?.room)
    const carrying = this.carrying
    const u = page.scale
    const standing = spotsOf(base.guests, page)
    const showing = guidance && !this.busy && (guidance.glow > 0 || guidance.demo !== null)
    const shown = showing && guidance ? this.handFor(this.hintOf(guidance), guidance, page, standing) : null

    // Who walks: a guest whose place changed by the rules and not by the child's hand walks there from where it stood.
    for (const { guest, spot } of standing) {
      const before = this.stood.get(guest.id)
      if (before && !this.placedByHand.has(guest.id) && !(carrying && 'guest' in carrying.held && carrying.held.guest === guest.id) && Math.hypot(before.x - spot.x, before.y - spot.y) > 2 * u) {
        this.walking.set(guest.id, { legs: this.legsBetween(page, before, spot), from: now })
      }
    }
    this.placedByHand.clear()
    this.stood.clear()
    for (const { guest, spot } of standing) this.stood.set(guest.id, spot)

    const arriving = new Map(this.stage.arriving.map((walk) => [walk.id, walk]))
    const guests: InkGuest[] = standing.map(({ guest, spot }) => {
      const isCarried = !!carrying && 'guest' in carrying.held && carrying.held.guest === guest.id
      const look = this.looking.get(guest.id)
      let body = this.bodyOf(guest.id, guest.awake)
      const pressedByHand = shown?.press && 'guest' in shown.press && shown.press.guest === guest.id
      // The ghost hand's press squashes the guest as a finger would, without touching the house.
      if (pressedByHand && shown) body = both(both(body, pressed(guest.id, 0.2, null)), { ...REST, dy: -shown.lifted })
      const walk = this.walking.get(guest.id)
      if (walk) {
        // It goes out by one door and comes in by another, and is not seen between them.
        const progress = smooth((now - walk.from) / WALK_SECONDS)
        const at = progress <= 0 ? walk.legs[0].from : whereOn({ id: guest.id, legs: walk.legs, progress })
        if (at) body = both(body, { ...REST, dx: (at.x - spot.x) / u, dy: (at.y - spot.y) / u - Math.abs(Math.sin((now - walk.from) * 14)) * 3 })
        else if (progress < 1) body = { sx: 0.001, sy: 0.001, rot: 0, dx: 0, dy: 0 }
      }
      const coming = arriving.get(guest.id)
      if (coming) {
        // Still in the coach, or behind a door, it is not seen; then it walks to its place.
        const at = whereOn(coming)
        if (at) body = both(body, { ...REST, dx: (at.x - spot.x) / u, dy: (at.y - spot.y) / u - Math.abs(Math.sin(coming.progress * 40)) * 3 })
        else if (coming.progress < 1) body = { sx: 0.001, sy: 0.001, rot: 0, dx: (coming.legs[0].from.x - spot.x) / u, dy: (coming.legs[0].from.y - spot.y) / u }
      }
      return {
        ...guest,
        body,
        ...(isCarried && carrying ? { carried: { x: carrying.x, y: carrying.y, swing: carrying.dangle.angle } } : {}),
        ...(look ? { looks: look.side } : {}),
      }
    })

    // Guests who have left the house, filing out to the coach: in no saved field, drawn only while they are seen walking.
    const ghosts = this.stage.leaving.map((walk) => ({ walk, at: whereOn(walk) ?? (walk.progress <= 0 ? walk.legs[0].from : null) })).filter((one) => one.at !== null)
    if (ghosts.length > 0) {
      const list: InkGuest[] = [...guests, ...ghosts.map(({ walk }): InkGuest => ({ id: walk.id, place: 'lobby', awake: true, mood: 'content', turnedTo: null, wrapped: false, staresAt: null }))]
      const bases = spotsOf(list, page)
      const first = guests.length
      ghosts.forEach(({ walk, at }, index) => {
        const base = bases[first + index]?.spot
        if (!base || !at) return
        guests.push({ ...list[first + index], body: { sx: 1, sy: 1, rot: 0, dx: (at.x - base.x) / u, dy: (at.y - base.y) / u - (walk.progress > 0 ? Math.abs(Math.sin(walk.progress * 40)) * 3 : 0) } })
      })
    }

    const things: InkThing[] = base.things.map((item) => {
      const key = `t:${item.kind}`
      const pressing = this.springing.get(key)
      const isCarried = !!carrying && 'thing' in carrying.held && carrying.held.thing === item.kind
      let body: InkBody | null = pressing ? thingPressed((pressing.liftedAt ?? now) - pressing.downAt, pressing.liftedAt === null ? null : now - pressing.liftedAt) : null
      if (shown?.press && 'thing' in shown.press && shown.press.thing === item.kind) body = both(thingPressed(0.2, null), { ...REST, dy: -shown.lifted })
      return {
        ...item,
        ...(body ? { body } : {}),
        ...(isCarried && carrying ? { carried: { x: carrying.x, y: carrying.y, swing: carrying.dangle.angle } } : {}),
      }
    })

    const sweep: InkSweep | null = this.sweeping ? { x: this.sweeping.x, y: this.sweeping.y, progress: easeOut((now - this.sweeping.from) / SWEEP_SECONDS) } : null
    const hour = this.hour
    const hourProgress = hour ? easeOut((now - hour.from) / WHEEL_SECONDS) : 1
    // Once the cycle has been judged one thing is wanted, the coach, and the hand shows it: nothing else glows to compete.
    const glow = showing && guidance && guidance.glow > 0 && !this.stay.finished
      ? { strength: guidance.glow, guests: guests.filter((guest) => !guest.carried).map((guest) => guest.id), wheel: true }
      : null
    return {
      ...base,
      guests,
      things,
      view,
      under: this.sweeping ? this.sweeping.under : null,
      sweep,
      hourUnder: hour ? hour.under : null,
      hourSweep: hour ? { x: hour.x, y: hour.y, progress: hourProgress } : null,
      // The wheel comes round half a turn to the new hour.
      wheelTurn: hour ? -Math.PI * (1 - hourProgress) : 0,
      glow,
      hand: shown ? shown.hand : null,
      lamps: [...this.lamps].map(([room, lamp]) => ({ room, angle: lamp.angle })),
      knocks: this.knocks.map((one) => ({ x: one.x, y: one.y, age: now - one.from })),
      coach: true,
      coachAt: this.stage.coachAt,
      // The door stands open while guests file through it, for a moment after the horn, and for as long as the judged house waits for the child's touch.
      coachOpen: this.stage.coachOpen || now - this.honk < 0.6 || (this.stay.finished && !this.playing),
      // He trundles up to the wall of the house and no further: he arranges from the lobby and never walks through plaster.
      porterAt: { dx: -this.stage.porter * PORTER_REACH, dy: 0 },
      numerals: true,
    }
  }

  /** How long the scene that is playing still has to run, in seconds; 0 when none is. */
  get sceneLeft(): number {
    return this.playing ? Math.max(0, this.sceneEnds - this.seconds) : 0
  }
}

