import { ACT_BEAT, ACT_SECONDS, PLANK_TIPS, THING_ACT_SECONDS, actBody, takesIce, takesStove, thingActBody, type GuestAct, type ThingAct } from './acts'
import { arrivalsAt, madeAt, type Air } from './airs'
import { awake, holds, isEdgeAt, isGuestAt, isRoomAt, placeOf, roomOf, thing as thingOf, type Arrangement, type ThingKind } from './arrangement'
import { castById, neatOf } from './casts'
import { demandOf } from './demand'
import { LADDER, WHOLE_PATHS_UNTIL } from './config'
import { neatHourOf, pairingsIn, porterComesIn, setDownIn, tapIn, touchCoach, turnWheelIn, type Cue, type Pairing, type Turn } from './cycle'
import { handPose, type Guidance, type HandPose } from './guidance'
import { GUEST_IDS, TASTES, type GuestId, type Phase } from './guests'
import { hintsFor, type Hint } from './hint'
import { doingAt } from './hours'
import { CORNER, dropAt, dropThingAt, hitAt, roomUnder, type Drop, type Hit, type Standing } from './hit'
import type { Gesture } from './input'
import { bodyBox, fromPlain, spotsOf, thingBox, toPlain, type Spot } from './inkPlaces'
import { TOP } from './inkGuests'
import { REST, type InkBody, type InkGuest, type InkMoment, type InkScene, type InkSide, type InkSweep, type InkThing, type InkView } from './inkScene'
import { SHELF } from './inkMoving'
import { PORTER_BELL, TROLLEY_WHEEL } from './inkProps'
import { layoutPage, type PageLayout } from './layout'
import { Dangle, MotionDirector, PERSONALITY, both, pressed, settles } from './motion'
import type { Held, Outcome, Target } from './moves'
import { moodOf } from './mood'
import { FLIGHT_SECONDS } from './inkSky'
import { ownRoom, pageOfArrangement, takes } from './page'
import { Scene, followedBy, sceneLength, type Beat } from './scene'
import { FETCH, FETCH_REACH, NEAT, NEAT_REACH, coachChangesOver, neatWay, pairing, restStage, sentAway, settledDay, whereOn, type Hooks, type Leg, type Point, type Stage, type Walk } from './stage'
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
/** What each part of the page that only answers a finger sounds like. Anything not here is plaster or slate, and knocks. */
const ANSWERS: Partial<Record<Hit['kind'], voices.Sound>> = {
  porter: voices.bell, door: voices.door, bench: voices.toBench, roomDoor: voices.roomDoor, bed: voices.bedSprings, boiler: voices.boiler, luggage: voices.luggage, cage: voices.cage,
}

/** How long a guest keeps looking toward a knock, and how long a knock's marks last. */
export const LOOK_SECONDS = 1.1
export const KNOCK_SECONDS = 0.5
/** How long a guest takes to walk to a new place that the rules, and not the child's hand, gave it. */
export const WALK_SECONDS = 0.6
/** How far the porter trundles, in the drawing's units: a short way to the wall of the house when he brings the things back, and well out into the lobby, which is empty then, when he comes in to show his way. */
export const PORTER_REACH = Math.abs(FETCH_REACH)
export const PORTER_COMES_IN = NEAT_REACH
/** How far the troll and the singer lean in to bow at the end of their duet, in radians: as far as the wall between them, and not through it. */
export const BOW = 0.16
/** How long a guest with no room holds a thing it is given before it hands it back. */
export const HELD_SECONDS = 0.45
/** How long a guest glances at the door it had asked for: when it is given another room, when the house is settled, and each time its page is opened in a room it did not ask for. Long enough to be seen by a child who was looking elsewhere when it began. */
export const GLANCE_SECONDS = 2.6
/** How many beats a pairing has: on each but the first and the last, something more happens than the two figures moving. */
export const PAIR_BEATS = 8
/** A stove or an ice box set on a wall stays against it this long, then takes this long to slide to its place in the room. */
export const SLIDE = { hold: 0.35, lasts: 0.8 } as const
/** How long each thing a touch sets off for a moment is seen. */
export const MOMENT_SECONDS: Readonly<Record<InkMoment['kind'], number>> = { feathers: 1.5, sneeze: 0.4, breath: 0.8, puff: 0.9, scorch: 1.6, frost: 1.6, rustle: 0.45 }

/** What a touch asks to be saved: nothing, soon (at the throttle), or at once. */
export type Save = 'none' | 'soon' | 'now'

const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3
const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }
const sameView = (a: InkView | null, b: InkView | null) => (a === null ? b === null : b !== null && a.from === b.from)
const keyOf = (held: Held) => ('guest' in held ? `g:${held.guest}` : `t:${held.thing}`)
/** A sound, later by some seconds. */
const later = (sound: Sound, by: number): Sound => sound.map((note) => ({ ...note, at: note.at + by }))

type Pressing = { held: Held; downAt: number; liftedAt: number | null; again: boolean }
type Carrying = { held: Held; x: number; y: number; lastX: number; dangle: Dangle; room: number | null; /** The finger has let go and the drag is waiting out its grace: the set-down is already the child's. */ lifted: boolean; /** The browser took the touch away (a system gesture, a call): no finger let go, and what is held goes back where it came from unless the finger comes back. */ taken: boolean }
type Sweeping = { x: number; y: number; from: number; under: InkView | null }

/** How a thing takes a finger: a small squash that rings a little. */
function thingPressed(held: number, since: number | null): InkBody {
  const down = 0.14 * (0.7 + 0.3 * Math.min(1, held / 0.1))
  if (since === null) return { sx: 1 + down * 0.6, sy: 1 - down, rot: 0, dx: 0, dy: 0 }
  const ring = down * Math.exp(-6 * since) * Math.cos(since * 5.5 * Math.PI * 2)
  return { sx: 1 + ring * 0.6, sy: 1 - ring, rot: 0, dx: 0, dy: 0 }
}

/** What a thing is seen to do for each way it can be put somewhere. A stove or an ice box put to a wall slides instead, and one given to a guest is the guest's to take. */
const LANDS: Partial<Record<Outcome, ThingAct>> = {
  'quilt-on-bed': 'flumps', 'quilt-hangs': 'pressed-on', 'pipe-stands': 'wobbles', 'pipe-joins': 'bolted', 'stove-warms': 'clunks', 'ice-chills': 'sloshes',
  'clock-by-bed': 'ticks', 'clock-on-wall': 'swings', 'to-cupboard': 'shelved', 'stove-to-guest': 'clunks', 'ice-to-guest': 'sloshes',
}

/** The sound of each way a guest or a thing can be set down that needs no more than its name. */
const SET_DOWN: Partial<Record<Outcome, Sound>> = {
  'moves-in': voices.movesIn,
  shares: voices.shares,
  swaps: voices.swaps,
  'through-the-wall': voices.throughTheWall,
  'to-lobby': voices.toLobby,
  'to-bench': voices.toBench,
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
  /** When a finger last set the crows flying out of the tree, in the toy's seconds, or null. */
  private startledAt: number | null = null
  /** Knocks and their marks. One made by a finger is where the finger was, on the screen; one that happens in the house (`plain`) is a point of the plain page, and is drawn wherever the page of the moment draws that point: enlarged with the large room it belongs to (`room`), turned over on the bat's page. */
  private knocks: { x: number; y: number; from: number; plain?: boolean; room?: number | null }[] = []
  private readonly looking = new Map<GuestId, { side: InkSide; until: number }>()
  /** The small acts of the grid that guests are in the middle of, what a touch has set off for a moment, and a stove or ice box sliding off a wall. None is saved. */
  /** `at` is the point of the plain page an act is about (the wall a guest is stuck in, the thing it goes to): how far that is from the guest is worked out each frame from where the guest stands then. */
  private readonly acts = new Map<GuestId, { act: GuestAct; from: number; at?: Point }>()
  private readonly queued = new Map<GuestId, { act: GuestAct; from: number; at?: Point }>()
  private moments: (Omit<InkMoment, 'age'> & { from: number })[] = []
  private readonly slides = new Map<ThingKind, { x: number; y: number; from: number }>()
  private readonly thingActs = new Map<ThingKind, { act: ThingAct; from: number }>()
  /** Where each thing stood on the plain page when the page was last drawn, and the things on their way somewhere a scene sends them: a view, in no saved field. */
  /** Guests glancing at the door they had asked for, each from one moment until another. */
  private readonly glances = new Map<GuestId, { from: number; until: number }>()
  private readonly thingStood = new Map<ThingKind, { x: number; y: number; dial: 1 | 2 | 3; out: boolean }>()
  private readonly travelling = new Map<ThingKind, { parts: { legs: Leg[]; from: number; lasts: number }[]; dial: 1 | 2 | 3 }>()
  private readonly ways = new Map<GuestId, number>()
  private lastTouch = 0
  private beat = -1
  private hum = -1
  /** The beat a pairing has reached, and how far apart its two are, in the drawing's units: from the yeti to the stove, or from the troll to the singer. */
  private pairBeat = -1
  private reach = 0
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
  /** The guest the child has just set down on the coach: it is in the coach already, and the rest follow it out. */
  private aboard: GuestId | null = null
  private readonly stepped = new WeakSet<Walk>()
  private page: PageLayout | null = null
  private readonly breaths = new Map<GuestId, number>()
  private readonly doings = new Map<GuestId, number>()
  private readonly steadies = new Map<ThingKind, number>()

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

  /**
   * The house as it is while something is in the child's hand: what is in
   * the hand is not where it stood. A lodger has left its room and a thing
   * its wall, room or guest, so nothing they did there is drawn or heard, and
   * the house answers as it truly is without them. The stay is untouched:
   * what is in the hand is saved where it came from.
   */
  private get reckoned(): Arrangement {
    const house = this.shown, carrying = this.carrying
    if (!carrying) return house
    const held = carrying.held
    if ('guest' in held) return typeof placeOf(house, held.guest) === 'number' ? { ...house, guests: house.guests.map((guest) => (guest.id === held.guest ? { ...guest, at: 'lobby' as const } : guest)) } : house
    return { ...house, things: house.things.map((item) => (item.kind === held.thing ? { ...item, at: 'cupboard' as const } : item)) }
  }

  /** The view from a guest's place. Carried (`heldOver` given, a room or null), its room is the one it is held over, and the house lies as it is: nothing large, nothing turned. */
  private viewFor(from: GuestId | null, heldOver?: number | null): InkView | null {
    if (from === null || placeOf(this.arrangement, from) === null || placeOf(this.arrangement, from) === 'gone') return null
    if (heldOver === undefined) return this.viewIn(this.arrangement, from)
    return { from, room: heldOver, large: false, inHand: true }
  }

  /** The view from where a guest stands in a house: its own room drawn large; while it has none, the room it asks for keeps its ink at its own size. */
  private viewIn(house: Arrangement, from: GuestId): InkView | null {
    const at = placeOf(house, from)
    if (at === null || at === 'gone') return null
    return typeof at === 'number' ? { from, room: ownRoom(house, from) } : { from, room: ownRoom(house, from), large: false }
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
    // A guest whose page is opened in a room that is not the one it asked for glances again at the door it wanted, once the page has turned; the room itself stays ringed in dots while the page is open (`asked` in page.ts).
    const room = from ? placeOf(this.arrangement, from) : null
    if (from && typeof room === 'number' && room !== demandOf(this.arrangement.house, from)) this.glances.set(from, { from: this.seconds + SWEEP_SECONDS, until: this.seconds + SWEEP_SECONDS + GLANCE_SECONDS })
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
    else if (gesture.type === 'dragMove' || gesture.type === 'dragLift') this.carry(gesture.at, page, gesture.type === 'dragLift')
    else this.setDown(gesture.at, page)
  }

  /** The finger lands: a scene that is playing ends, and then whatever the finger landed on answers now, in this frame. */
  private press(at: Point, page: PageLayout): void {
    this.endScene()
    const speed = Math.max(0, Math.min(1, 1 - (this.seconds - this.lastTouch) / 1.2))
    this.lastTouch = this.seconds
    // The grown-up's corner is the top right of the screen whatever way the page is turned, and answers nothing.
    if (at.x >= page.width - CORNER && at.y <= CORNER) return
    const plain = toPlain(page, this.view, at)
    const found = hitAt(page, this.standing(page), plain, this.things(), true, this.arrangement.house)
    // On a page turned half round the plain page's corner lies at the bottom left of the screen: there it is only paper.
    const hit: Hit = found.kind === 'corner' ? { kind: 'paper' } : found
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
    if (hit.kind === 'tree') {
      // The crows go up out of the tree, all three, take a turn round the sky and come back to their boughs. No page is turned for it.
      this.startledAt = this.seconds
      return this.sound(voices.caw)
    }
    if (hit.kind === 'paper') {
      // The paper margin gives the plain page back, and the paper creases where the finger landed: a touch always draws something.
      this.sound(voices.paper)
      this.moment('rustle', plain, page)
      return this.look(null, at)
    }
    // Plaster, slate, the lobby floor, the bench, the porter and the front door; a room's door and its beds; the boiler; the luggage and the
    // bird cage on it: each answers as itself, with its own knock, ring, creak, squeak, clang, thump or rattle, and everyone looks. None of
    // them turns a guest's page back: only bare paper does that.
    // The porter's touch rings the bell on his trolley, and the marks are at the bell; anything else is marked where the finger is.
    if (hit.kind === 'porter') this.ringBell(page)
    else this.knocks.push({ x: at.x, y: at.y, from: this.seconds })
    this.sound(ANSWERS[hit.kind] ?? voices.knock)
    // Every guest looks toward the knock: whoever is up turns its eyes, and a sleeper opens one.
    this.lookToward(plain, page)
  }

  private hold(held: Held, again: boolean): void {
    this.pressing = { held, downAt: this.seconds, liftedAt: null, again }
    this.springing.set(keyOf(held), this.pressing)
  }

  /** Every guest looks toward a point for a moment: left, right, up or down, whichever it mostly is. A sleeper opens one eye that way and sleeps on. */
  private lookToward(point: Point, page: PageLayout): void {
    for (const { guest, spot } of this.standing(page)) {
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
    const house = this.arrangement
    for (const item of house.things) {
      // Each placed thing answers the new hour as the grid's last column says, and a thing with nothing to do at this hour is quiet.
      const sound = this.atTheHour(house, item.kind, page)
      if (!sound) continue
      // Each in its turn, and each begun early enough to be heard to its end: a long answer starts sooner rather than being cut off.
      chain = [...chain, ...later(sound, Math.max(0.3, Math.min(at, voices.RANGE.total - voices.lengthOf(sound) - 0.001)))]
      at += 0.14
    }
    this.sound(chain.filter((note) => note.at + note.attack + note.length <= voices.RANGE.total))
    // Whoever has just fallen asleep with the quilt on its bed tucks in.
    this.tuckIn(page, 0.75)
    this.mark('soon')
    this.follow(turn, page)
  }

  /** What a placed thing sounds like as the hour turns over it, or null when it has nothing to do at the new hour. */
  private atTheHour(house: Arrangement, kind: ThingKind, page: PageLayout): Sound | null {
    const doing = doingAt(house, { thing: kind }, house.phase)
    if (doing.kind === 'burns') return voices.throughTheHour.stove
    if (doing.kind === 'chills') return voices.throughTheHour.ice
    // The quilt patters only with something bunched against it, and the pipe whooshes only with something passing.
    if (doing.kind === 'stops') return doing.airs.length > 0 ? voices.throughTheHour.quilt : null
    if (doing.kind === 'carries') return doing.airs.length > 0 ? voices.throughTheHour.pipe : null
    if (doing.kind === 'turns-hours') {
      // The keeper who has changed its hours yawns as the hour turns.
      this.acts.set(doing.guest, { act: { kind: 'yawns' }, from: this.seconds + 0.75 })
      return voices.yawn(doing.guest)
    }
    if (kind !== 'clock') return null
    const at = thingOf(house, 'clock')?.at
    if (!at || at === 'cupboard') return null
    // On a wall it gives its slow loud tock. By a bed it trills at dawn and at dusk, and whoever sleeps there opens an eye at it.
    if (isEdgeAt(at)) {
      this.thingActs.set('clock', { act: 'swings', from: this.seconds + 0.75 })
      return voices.throughTheHour.clock
    }
    if (!isRoomAt(at)) return null
    this.thingActs.set('clock', { act: 'rings', from: this.seconds + 0.75 })
    const box = thingBox({ kind: 'clock', at }, page, this.standing(page))
    for (const { guest, spot } of this.standing(page)) {
      if (typeof guest.place !== 'object' || guest.place.room !== at.room || guest.awake || !box) continue
      this.looking.set(guest.id, { side: box.x + box.w / 2 < spot.x ? 'left' : 'right', until: this.seconds + 0.75 + LOOK_SECONDS })
    }
    return voices.clockTrill
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
    const middle = box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : null
    if (turn.outcome === 'feathers') {
      this.sound(voices.feathers)
      if (middle) this.feathers(middle, page)
    } else if (turn.outcome === 'toots') {
      this.sound(voices.toots)
      // A puff out of its mouth, of whatever is passing through it at this hour.
      if (box && middle) this.moment('puff', { x: middle.x, y: box.y }, page, 1, 0, this.passing(this.arrangement))
    }
    else if (turn.outcome === 'stove-dial') this.sound(voices.stoveDial(thingOf(this.arrangement, 'stove')?.dial ?? 1))
    else if (turn.outcome === 'ice-dial') this.sound(voices.iceDial(thingOf(this.arrangement, 'ice')?.dial ?? 1))
    else if (turn.outcome === 'clock-rings') {
      this.sound(voices.clockRings)
      this.thingActs.set('clock', { act: 'rings', from: this.seconds })
      // Every sleeper in the house opens one eye.
      if (box) this.lookToward({ x: box.x + box.w / 2, y: box.y + box.h / 2 }, page)
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
      this.carrying = { held, x: from.x, y: from.y, lastX: from.x, dangle: new Dangle(id), room: null, lifted: false, taken: false }
      this.sound(voices.lifted(id))
      // In the hand, no room is drawn large: the house lies as it is under the finger.
      this.stay = { ...this.stay, from: id }
      this.sweepTo(this.viewFor(id, null), from)
      return
    }
    // A thing in the hand swings like something light. The page stays as it was. Wherever it was on its way to, it is in the hand now.
    this.travelling.delete(held.thing)
    this.slides.delete(held.thing)
    this.thingActs.delete(held.thing)
    this.carrying = { held, x: from.x, y: from.y, lastX: from.x, dangle: new Dangle('lizard'), room: null, lifted: false, taken: false }
    this.sound(voices.touched[held.thing])
  }

  private carry(at: Point, page: PageLayout, lifted: boolean): void {
    const carrying = this.carrying
    if (!carrying) return
    carrying.lifted = lifted
    // A finger that is carrying again has come back.
    if (!lifted) carrying.taken = false
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
    // The touch was taken away by the browser and no finger came back: the child set nothing down.
    if (carrying.taken) return this.putBack()
    // The house as it was while this was in the hand, without it: a pairing that the set-down makes again is made, also when the thing or the guest only goes back where it was.
    const without = pairingsIn(this.reckoned)
    this.carrying = null
    const held = carrying.held
    const plain = toPlain(page, this.view, at)
    const standing = this.standing(page)
    const drop = 'guest' in held ? dropAt(page, standing, plain, held.guest, true) : dropThingAt(page, standing, plain)
    const target = this.targetOf(drop)
    const before = this.stay
    let turn: Turn = { stay: this.stay, outcome: 'nothing', cues: [] }
    if (target) turn = setDownIn(this.stay, held, target)
    this.stay = turn.stay
    // Every time a pairing's combination is made it plays: lifted out of it and set back into it counts as made.
    const again = pairingsIn(this.arrangement).filter((pair) => !without.includes(pair) && !turn.cues.includes(pair))
    if (again.length > 0) turn = { ...turn, cues: [...again, ...turn.cues] }
    if ('guest' in held) this.placedByHand.add(held.guest)
    const outcome = turn.outcome
    this.aboard = 'guest' in held && target === 'coach' ? held.guest : null
    const was = arrangementOf(before)
    // A guest carried or changed out to the lobby or the bench hands back what it held: the thing is seen going back to its shelf.
    if ('guest' in held) {
      for (const item of was.things) {
        if (isGuestAt(item.at) && thingOf(this.arrangement, item.kind)?.at === 'cupboard' && placeOf(this.arrangement, item.at.guest) !== 'gone') this.goesBack(item.kind, item.at.guest, page)
      }
    }
    // Whoever has just been given a room that is not the one it asked for glances once at the door it wanted.
    for (const guest of this.arrangement.guests) {
      if (typeof guest.at === 'number' && guest.at !== placeOf(was, guest.id) && guest.at !== demandOf(this.arrangement.house, guest.id)) this.glances.set(guest.id, { from: this.seconds + SWEEP_SECONDS, until: this.seconds + SWEEP_SECONDS + GLANCE_SECONDS })
    }
    if (outcome === 'stove-to-guest' || outcome === 'ice-to-guest') this.sound(drop.kind === 'guest' ? voices.takesTo(drop.id, outcome === 'stove-to-guest' ? takesStove(drop.id) : takesIce(drop.id)) : null)
    else if (outcome !== 'sent-away' && outcome !== 'coach-honks') this.sound(SET_DOWN[outcome] ?? voices.putBack)
    if (outcome !== 'coach-honks') this.seen(outcome, held, drop, plain, page)
    if ('guest' in held) {
      // Setting a guest down gives the plain page back, from where it was set down.
      this.stay = { ...this.stay, from: null }
      this.sweepTo(null, at)
    }
    this.mark('soon')
    this.follow(turn, page)
  }

  /** Something is seen for a moment, at a point of the plain page, `after` seconds from now. */
  private moment(kind: InkMoment['kind'], at: Point, page: PageLayout, side: -1 | 1 = 1, after = 0, of: Air | null = null): void {
    const room = page.rooms.findIndex((layout) => at.x >= layout.rect.x && at.x <= layout.rect.x + layout.rect.w && at.y >= layout.rect.y - 6 * page.scale && at.y <= layout.rect.y + layout.rect.h)
    this.moments.push({ kind, x: at.x, y: at.y, room: room >= 0 ? room : null, from: this.seconds + after, lasts: MOMENT_SECONDS[kind], side, of })
  }

  /** Whoever sleeps in the room where the quilt lies on the bed tucks in: when the quilt is laid there, when a sleeper is set down there, and when a lodger there falls asleep at a turn of the wheel. `only` is one guest. */
  private tuckIn(page: PageLayout, after: number, only?: GuestId): void {
    const quilt = thingOf(this.arrangement, 'quilt')
    if (!quilt || !isRoomAt(quilt.at)) return
    const room = quilt.at.room
    for (const { guest } of this.standing(page)) {
      if (typeof guest.place !== 'object' || guest.place.room !== room || guest.awake || (only && guest.id !== only)) continue
      // After whatever it is in the middle of: a guest does one thing at a time.
      const tuck = { act: { kind: 'tucks-in' } as const, from: this.seconds + after }
      if (this.acts.has(guest.id)) this.queued.set(guest.id, tuck); else this.acts.set(guest.id, tuck)
    }
  }

  /** The quilt puffs its feathers, and whoever is nearest sneezes: back, back, and then all at once, in its own voice. */
  private feathers(at: Point, page: PageLayout): void {
    this.moment('feathers', at, page)
    let nearest: Standing | null = null, least = Infinity
    for (const one of this.standing(page)) {
      const far = Math.hypot(one.spot.x - at.x, one.spot.y - 70 * page.scale - at.y)
      if (far < least) { least = far; nearest = one }
    }
    if (!nearest) return
    const id = nearest.guest.id
    this.acts.set(id, { act: { kind: 'sneezes' }, from: this.seconds })
    this.moment('sneeze', { x: nearest.spot.x + 18 * page.scale, y: nearest.spot.y - (nearest.spot.tall ?? TOP[id]) * 0.72 * page.scale }, page, 1, ACT_BEAT.sneeze)
    this.sound(later(voices.sneeze(id), ACT_BEAT.sneeze))
  }

  /** What is passing through the pipe at this hour, for the puff it toots: the smell, warmth or cold that goes between its two rooms, or what the guest who blows it gives off. Standing in a corner or lying in the cupboard, nothing. */
  private passing(house: Arrangement): Air | null {
    const pipe = thingOf(house, 'pipe')
    if (!pipe || pipe.at === 'cupboard' || isRoomAt(pipe.at)) return null
    if (isGuestAt(pipe.at)) {
      const blower = pipe.at.guest
      if (roomOf(house, blower) === null) return null
      const made = madeAt(house, house.phase).find((source) => 'guest' in source.by && source.by.guest === blower)
      const carries = TASTES[blower].carries
      return made ? made.air : carries > 0 ? 'warm' : carries < 0 ? 'cold' : null
    }
    const doing = doingAt(house, { thing: 'pipe' }, house.phase)
    return doing.kind === 'carries' ? doing.airs[0] ?? null : null
  }

  /** A thing in the hand of a guest with no room goes back to the cupboard: seen with the guest for a moment, then along to the porter, over his trolley and up his ladder to its shelf. */
  private goesBack(kind: ThingKind, holder: GuestId, page: PageLayout): void {
    const u = page.scale
    const found = this.standing(page).find((one) => one.guest.id === holder)
    const item = thingOf(this.arrangement, kind)
    const shelf = item ? this.footOf({ kind, at: 'cupboard', dial: item.dial }, page, []) : null
    if (!found || !item || !shelf) return
    const hand = { x: found.spot.x, y: found.spot.y - (found.spot.tall ?? TOP[holder]) * 0.5 * u }
    const { trolley, foot } = this.portersEnd(page), { front, steps } = this.doors(page)
    // From the lobby it goes along the floor to the porter; from the bench, up the steps and in at the front door first.
    const toPorter: Leg[] = found.guest.place === 'bench' ? [{ from: hand, to: steps }, { from: front, to: trolley }] : [{ from: hand, to: trolley }]
    this.travelling.set(kind, { parts: [{ legs: [...toPorter, { from: trolley, to: foot }, ...this.byLadder(page, shelf, false)], from: this.seconds + HELD_SECONDS, lasts: 1.3 }], dial: item.dial })
  }

  /**
   * What a set-down is seen to do besides moving something, cell by cell of
   * the grid: a guest stuck half through a wall while both neighbours stare;
   * a sleeper tucking in under the quilt; a guest peering down the standing
   * pipe, blowing it, winding the alarm clock or stopping its bell; how a
   * guest takes to the stove or the ice box; and the patch a stove scorches
   * or an ice box frosts before it slides into the room.
   */
  private seen(outcome: Outcome, held: Held, drop: Drop, plain: Point, page: PageLayout): void {
    const u = page.scale, now = this.seconds
    const house = this.arrangement
    const standing = this.standing(page)
    // The thing itself, as it lands: each way of putting it somewhere has its own small move.
    const lands = 'thing' in held ? LANDS[outcome] : undefined
    if ('thing' in held && lands) this.thingActs.set(held.thing, { act: lands, from: now })
    // A guest who has just been given a bed tests it, and where two now share a room each tests once.
    if ('guest' in held && (outcome === 'moves-in' || outcome === 'shares' || outcome === 'swaps') && typeof placeOf(house, held.guest) === 'number') {
      // Changing places with the one who lodged there, it is set down at the door and walks in while the other walks out: the two pass without a glance.
      const me = outcome === 'swaps' ? standing.find((one) => one.guest.id === held.guest) : undefined
      if (me) this.walking.set(held.guest, { legs: [{ from: this.doorFor(page, me.spot), to: { x: me.spot.x, y: me.spot.y } }], from: now })
      this.acts.set(held.guest, { act: { kind: 'tests-bed', once: outcome === 'shares' }, from: now + (me ? WALK_SECONDS : 0) })
      if (outcome === 'shares' && drop.kind === 'guest') this.acts.set(drop.id, { act: { kind: 'tests-bed', once: true }, from: now + 0.15 })
    }
    // A guest set down asleep in a room where the quilt lies on the bed tucks in when it has tested the bed.
    if ('guest' in held) this.tuckIn(page, 1.05 + ('guest' in held && outcome === 'swaps' ? WALK_SECONDS : 0), held.guest)
    const within = (room: number) => standing.filter((one) => typeof one.guest.place === 'object' && one.guest.place.room === room)
    const edge = drop.kind === 'edge' ? page.edges.find((one) => one.id === drop.id) : undefined
    // The point of the wall or floor nearest the finger.
    const onEdge = edge ? { x: Math.max(edge.rect.x, Math.min(edge.rect.x + edge.rect.w, plain.x)), y: Math.max(edge.rect.y, Math.min(edge.rect.y + edge.rect.h, plain.y)) } : null
    if (outcome === 'through-the-wall' && 'guest' in held && edge && onEdge) {
      const me = standing.find((one) => one.guest.id === held.guest)
      if (!me || typeof me.guest.place !== 'object') return
      // In a wall it stands in it at floor level; in a floor it hangs half through, wherever the finger was.
      const feet = edge.kind === 'wall' ? { x: edge.rect.x + edge.rect.w / 2, y: me.spot.y } : { x: onEdge.x, y: edge.rect.y + edge.rect.h / 2 + 60 * u }
      this.acts.set(held.guest, { act: { kind: 'stuck', dx: (feet.x - me.spot.x) / u, dy: (feet.y - me.spot.y) / u }, from: now, at: feet })
      // The crunch as it goes in and the pop as it comes out, on the plaster; and whoever lives on either side stares at it.
      this.knocks.push({ ...onEdge, from: now, plain: true }, { ...onEdge, from: now + ACT_BEAT.pop, plain: true })
      for (const { guest, spot } of standing) {
        if (guest.id === held.guest || typeof guest.place !== 'object' || (guest.place.room !== edge.a && guest.place.room !== edge.b)) continue
        const dx = onEdge.x - spot.x, dy = onEdge.y - (spot.y - 60 * u)
        this.looking.set(guest.id, { side: Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down', until: now + ACT_SECONDS.stuck + 0.4 })
      }
      return
    }
    if (outcome === 'quilt-on-bed') return this.tuckIn(page, 0)
    // A guest with no room yet holds the thing for a moment and hands it back: it is seen in its hand, and then on its way to its shelf.
    if (outcome === 'handed-back' && drop.kind === 'guest' && 'thing' in held) return this.goesBack(held.thing, drop.id, page)
    // Wrapped in the quilt, a guest who loves it lets out a long sigh.
    if (outcome === 'wraps' && drop.kind === 'guest' && TASTES[drop.id].loves.includes('wrap')) return this.sound(later(voices.sigh(drop.id), 0.5))
    // What a guest does with the pipe at its mouth or the alarm clock in its hand.
    if (drop.kind === 'guest' && (outcome === 'trumpet' || outcome === 'clock-kept' || outcome === 'clock-shrugged-off')) {
      this.acts.set(drop.id, { act: outcome === 'trumpet' ? { kind: 'blows' } : outcome === 'clock-kept' ? { kind: 'winds' } : { kind: 'stops-bell', weight: PERSONALITY[drop.id].weight }, from: now })
      return
    }
    const boxOf = (kind: ThingKind) => thingBox({ kind, at: thingOf(house, kind)?.at ?? 'cupboard' }, page, standing)
    if (outcome === 'pipe-stands' && drop.kind === 'room') {
      const box = boxOf('pipe'), there = within(drop.room)
      const listener = there.find((one) => one.guest.awake) ?? there[0]
      if (!box || !listener) return
      const mouth = { x: box.x + box.w / 2, y: box.y }
      this.acts.set(listener.guest.id, { act: { kind: 'peers', dx: (mouth.x - listener.spot.x) / u }, from: now, at: mouth })
      this.moment('breath', mouth, page, listener.spot.x < mouth.x ? -1 : 1, ACT_BEAT.breath)
      this.sound(later(voices.breathBack, ACT_BEAT.breath))
      return
    }
    if ((outcome === 'stove-to-guest' || outcome === 'ice-to-guest') && drop.kind === 'guest') {
      const kind = outcome === 'stove-to-guest' ? 'stove' : 'ice'
      const box = boxOf(kind), taker = standing.find((one) => one.guest.id === drop.id)
      if (!box || !taker) return
      const how = kind === 'stove' ? takesStove(drop.id) : takesIce(drop.id)
      this.acts.set(drop.id, { act: { kind: how, dx: (box.x + box.w / 2 - taker.spot.x) / u }, from: now, at: { x: box.x + box.w / 2, y: box.y + box.h } })
      // The one knock of the plank: where its head comes to rest, tipped over away from the ice box.
      if (how === 'plank') {
        const away = box.x + box.w / 2 < taker.spot.x ? 1 : -1, tall = (taker.spot.tall ?? TOP[drop.id]) * u
        this.knocks.push({ x: taker.spot.x + away * Math.sin(PLANK_TIPS) * tall, y: taker.spot.y - Math.cos(PLANK_TIPS) * tall, from: now + ACT_BEAT.knock, plain: true, room: typeof taker.guest.place === 'object' ? taker.guest.place.room : null })
      }
      return
    }
    if ((outcome === 'stove-scorches' || outcome === 'ice-frosts') && edge && onEdge && drop.kind === 'edge') {
      const kind = outcome === 'stove-scorches' ? 'stove' : 'ice'
      const box = boxOf(kind), room = page.rooms[drop.nearer]
      if (!box || !room) return
      this.moment(kind === 'stove' ? 'scorch' : 'frost', onEdge, page)
      this.moments[this.moments.length - 1].room = drop.nearer
      // It starts against the wall or floor it was put to, inside the nearer room, and slides from there to its place.
      const half = box.w / 2
      const x = edge.kind === 'wall' ? (room.rect.x + room.rect.w / 2 < onEdge.x ? edge.rect.x - half : edge.rect.x + edge.rect.w + half) : Math.max(room.rect.x + half, Math.min(room.rect.x + room.rect.w - half, onEdge.x))
      // Put to a ceiling it starts up against it; put to a floor or a wall it starts on the floor.
      const y = edge.kind === 'floor' && edge.rect.y < room.rect.y ? room.rect.y + box.h : box.y + box.h
      this.slides.set(kind, { x, y, from: now })
    }
  }

  /** What the rules cue after a touch: the scenes, each over a stay that already holds its outcome. */
  private follow(turn: Turn, page: PageLayout): void {
    const cues = turn.cues
    if (cues.includes('coach-changes-over')) return this.changeOver(turn)
    const hooks = this.hooks(page)
    let beats: Beat[] = []
    const pair = cues.find((cue): cue is Pairing => cue === 'sauna' || cue === 'duet')
    if (pair) beats = pairing(this.stage, pair, hooks)
    if (cues.includes('sent-away')) beats = followedBy(beats, sentAway(this.stage, this.leaving(turn, page), hooks, this.bringBack(page, sceneLength(beats))))
    if (cues.includes('settled-day')) {
      // The comparison the house rests on, shown once as the settled day begins: every guest content in a room it did not ask for glances at the door it had asked for, and goes back to its own thing.
      const starts = this.seconds + sceneLength(beats)
      for (const guest of this.arrangement.guests) {
        if (typeof guest.at === 'number' && guest.at !== demandOf(this.arrangement.house, guest.id)) this.glances.set(guest.id, { from: starts, until: starts + GLANCE_SECONDS })
      }
      beats = followedBy(beats, settledDay(this.stage, this.stay.phase, hooks))
      const cast = castById(this.stay.cast)
      if (cues.includes('neat-way') && cast) {
        // The neat way is shown at the hour at which it has most to show, the place's new thing at work before anything: the hour the wheel was left at when it shows as much, and otherwise the other hour, as a view.
        const neat = neatOf(cast), hour = neatHourOf(cast.position, neat, this.stay.phase)
        beats = followedBy(beats, neatWay(this.stage, { ...neat, phase: this.stay.phase }, hooks, hour))
      }
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
      this.travelling.clear()
      this.glances.clear()
      // Everybody is where the stay has them at once: nobody is seen walking back from where the scene had put them.
      this.stood.clear()
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
      houseChanges: () => {
        // The porter's arrangement, or the child's again: every thing that is somewhere else now goes there by the doors, as the guests do.
        if (!this.landing) this.rearrange(page)
      },
      porterComesIn: () => {
        this.stay = porterComesIn(this.stay)
        this.mark('now')
      },
      cue: (name) => {
        const sound: Record<typeof name, Sound> = {
          'door-opens': voices.doorOpens, 'door-shuts': voices.doorShuts, 'coach-leaves': voices.coachLeaves, 'coach-arrives': voices.coachArrives,
          'porter-trundles': voices.porterTrundles, 'porter-shows': voices.porterShows, 'porter-goes': voices.porterGoes, 'porter-fetches': voices.bell, sauna: voices.sauna, duet: voices.duet,
        }
        this.sound(sound[name])
        if (name === 'porter-fetches') this.ringBell(page)
      },
    }
  }

  /** Where a thing's foot is on the plain page: the middle of the bottom of its box, or of its shelf in the cupboard. */
  private footOf(item: InkThing, page: PageLayout, standing: readonly Standing[]): Point | null {
    const box = thingBox(item, page, standing)
    if (!box) return null
    return { x: box.x + box.w / 2, y: box.y + box.h - (item.at === 'cupboard' ? SHELF * page.scale : 0) }
  }

  /** The door of the room a point of the house is in or nearest to. */
  private doorNear(page: PageLayout, at: Point): Point {
    let best = page.rooms[0], least = Infinity
    for (const room of page.rooms) {
      const far = Math.hypot(Math.max(room.rect.x - at.x, 0, at.x - room.rect.x - room.rect.w), Math.max(room.rect.y - at.y, 0, at.y - room.rect.y - room.rect.h))
      if (far < least) { least = far; best = room }
    }
    return { x: best.door.x + best.door.w / 2, y: best.door.y + best.door.h }
  }

  /** The bell on the porter's trolley rings: a knock's marks at the bell itself, wherever he has trundled to. */
  private ringBell(page: PageLayout): void {
    const u = page.scale
    const bell = { x: page.porter.x + (52 + PORTER_BELL.x + this.stage.porter * this.stage.reach) * u, y: page.porter.y + page.porter.h + (PORTER_BELL.y - 8) * u }
    this.knocks.push({ ...fromPlain(page, this.view, bell), from: this.seconds })
  }

  /** The porter's end of the lobby: the bed of his trolley, and the foot and the top of the ladder to the cupboard. */
  private portersEnd(page: PageLayout): { trolley: Point; foot: Point; top: Point } {
    const u = page.scale, floor = page.lobby.y + page.lobby.h
    return {
      // Where his trolley is just now: he may have trundled out into the lobby.
      trolley: { x: page.porter.x + (52 + TROLLEY_WHEEL.x - 8 + this.stage.porter * this.stage.reach) * u, y: page.porter.y + page.porter.h - 12 * u },
      foot: { x: page.lobby.x + 26 * u, y: floor },
      top: { x: page.lobby.x + 44 * u, y: page.cupboard.y + page.cupboard.h },
    }
  }

  /** The way between a thing's place in the house and its shelf: up or down the porter's ladder and along the loft. `down` is from the shelf. */
  private byLadder(page: PageLayout, shelf: Point, down: boolean): Leg[] {
    const { foot, top } = this.portersEnd(page)
    const under = { x: shelf.x, y: top.y }
    const up: Leg[] = [{ from: foot, to: top }, { from: top, to: under }, { from: under, to: shelf }]
    return down ? up.reverse().map((leg) => ({ from: leg.to, to: leg.from })) : up
  }

  /** The way a thing goes from one place to another without passing through a wall: across its room, out by a door and in by another, or by the porter's ladder to and from the cupboard. */
  private thingLegs(page: PageLayout, from: Point, to: Point, fromShelf: boolean, toShelf: boolean): Leg[] {
    const { trolley, foot } = this.portersEnd(page)
    if (fromShelf && toShelf) return [{ from, to }]
    // Between the cupboard and the house a thing goes over the porter's trolley: he is the one who carries it.
    if (toShelf) return [{ from, to: this.doorNear(page, from) }, { from: trolley, to: foot }, ...this.byLadder(page, to, false)]
    if (fromShelf) return [...this.byLadder(page, from, true), { from: foot, to: trolley }, { from: this.doorNear(page, to), to }]
    const a = this.doorNear(page, from), b = this.doorNear(page, to)
    return Math.hypot(a.x - b.x, a.y - b.y) < 1 ? [{ from, to }] : [{ from, to: a }, { from: b, to }]
  }

  /** A scene has changed the house the page shows: each thing that is now somewhere else sets out for it, and is there when the guests are. */
  private rearrange(page: PageLayout): void {
    const house = this.shown
    const standing = spotsOf(pageOfArrangement(house, null, true).guests, page)
    for (const item of house.things) {
      const was = this.thingStood.get(item.kind), foot = this.footOf(item, page, standing)
      if (!was || !foot || Math.hypot(was.x - foot.x, was.y - foot.y) < 2 * page.scale) continue
      this.travelling.set(item.kind, { parts: [{ legs: this.thingLegs(page, was, foot, !was.out, item.at === 'cupboard'), from: this.seconds, lasts: NEAT.move }], dial: item.dial })
    }
  }

  /**
   * The house has been emptied and every thing is back in the cupboard in
   * the stay. On the page the porter fetches them: each thing that was out
   * goes by its door to his trolley, waits there while he trundles it to his
   * ladder, and goes up to its shelf. `after` is how long into the scene that
   * begins. Returns whether there was anything to fetch.
   */
  private bringBack(page: PageLayout, after: number, fromPlaces = true): boolean {
    const { trolley } = this.portersEnd(page)
    const lobbyEnd = { x: page.lobby.x + 14 * page.scale, y: page.lobby.y + page.lobby.h }
    const start = this.seconds + after
    this.travelling.clear()
    for (const [kind, was] of this.thingStood) {
      if (!was.out) continue
      const shelf = this.footOf({ kind, at: 'cupboard', dial: was.dial }, page, [])
      if (!shelf) continue
      const door = this.doorNear(page, was)
      this.travelling.set(kind, {
        parts: [
          // In another house than the one it stood in, it is seen from the house end of the lobby on.
          { legs: fromPlaces ? [{ from: was, to: door }, { from: lobbyEnd, to: trolley }] : [{ from: lobbyEnd, to: trolley }], from: start + FETCH.call, lasts: FETCH.hop },
          { legs: [{ from: trolley, to: this.portersEnd(page).foot }, ...this.byLadder(page, shelf, false)], from: start + FETCH.call + FETCH.hop + FETCH.trundle, lasts: FETCH.stow },
        ],
        dial: was.dial,
      })
    }
    return this.travelling.size > 0
  }

  /** Where a travelling thing is just now and whether it is on the move, or null once it has arrived. */
  private onItsWay(kind: ThingKind): { at: Point; moving: boolean; riding?: boolean } | null {
    const travel = this.travelling.get(kind)
    if (!travel) return null
    const now = this.seconds
    let rests: Point = travel.parts[0].legs[0].from
    for (const part of travel.parts) {
      // Not yet set out on this stretch: it waits where the last one left it, which between two stretches is the porter's trolley.
      if (now < part.from) return { at: rests, moving: false, riding: part !== travel.parts[0] }
      if (now < part.from + part.lasts) return { at: whereOn({ legs: part.legs, progress: smooth((now - part.from) / part.lasts) }) ?? part.legs[0].from, moving: true }
      rests = part.legs[part.legs.length - 1].to
    }
    return null
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
   * one on the bench walks along the street. The guest the child set down on
   * the coach is in it already and is not among them: the rest follow it.
   */
  private leaving(_turn: Turn, page: PageLayout, fromPlaces = true): Walk[] {
    const { coach, front, steps } = this.doors(page)
    const out = [{ from: front, to: steps }, { from: steps, to: coach }]
    const aboard = this.aboard
    this.aboard = null
    // Where the next house is another house, the page is that house from the first frame: the old guests are seen from its front door on, one after another, and not walking through rooms that are no longer there.
    if (!fromPlaces) return [...this.stood].filter(([id]) => id !== aboard).map(([id]) => ({ id, legs: out, progress: -1 }))
    return [...this.stood].filter(([id]) => id !== aboard).map(([id, spot]) => {
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
    // The page is drawn to the new house from the first frame of the scene, so every walk and every thing's way is laid out on the new house's page.
    const old = this.page, shape = arrangementOf(turn.stay).house.shape
    const page = old === null || old.shape === shape ? old : layoutPage(old.width, old.height, shape)
    const sameHouse = page === old
    const leaving = page ? this.leaving(turn, page, sameHouse) : []
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
    // The new guest for the bench sits there from the first frame, unless it is one of those who are leaving: then it is one guest, seen walking out, and it comes along the street to the bench when it has got on and off again.
    const going = new Set(leaving.map((walk) => walk.id))
    for (const one of this.standing(page)) {
      if (one.guest.place === 'bench' && going.has(one.guest.id)) arriving.push({ id: one.guest.id, legs: [{ from: coach, to: { x: one.spot.x, y: one.spot.y } }], progress: -1 })
    }
    this.page = page
    this.start(coachChangesOver(this.stage, leaving, arriving, this.hooks(page), this.bringBack(page, 0, sameHouse)), ['coach-changes-over'])
  }

  /**
   * The surface is going to rest. What is still in the child's hand goes back
   * where it came from, since nothing is saved in the air and a put-away makes
   * no move the child did not make. But a finger that had already let go made
   * its move: the drag was only waiting out the moment in which a finger may
   * come back, so the set-down is made now and not lost. Then a scene ends.
   */
  rest(): void {
    const carrying = this.carrying
    if (carrying && carrying.lifted && !carrying.taken && this.page) this.setDown({ x: carrying.x, y: carrying.y }, this.page)
    else if (carrying) this.putBack()
    if (carrying) this.mark('now')
    if (this.playing) {
      this.endScene()
      this.mark('now')
    }
    if (this.pressing && this.pressing.liftedAt === null) this.pressing.liftedAt = this.seconds
  }

  /** The browser has taken the touch away in the middle of a carry. That is not a finger letting go: unless a finger comes back and carries on, what is in the hand goes back where it came from. */
  takenAway(): void {
    if (!this.carrying) return
    this.carrying.taken = true
    this.carrying.lifted = false
  }

  /** What is in the hand goes back where it came from, and no move is made. */
  private putBack(): void {
    const carrying = this.carrying
    if (!carrying) return
    this.carrying = null
    if ('guest' in carrying.held) {
      // The page stays the one the child had turned to by touching this guest: drawn from its own place again, now that it is back there.
      this.view = this.viewFor(carrying.held.guest)
      this.sweeping = null
      // It is back where it stood at once, by the same hand that held it: it is not seen walking there.
      this.placedByHand.add(carrying.held.guest)
    }
    this.mark('soon')
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
    const pair = this.stage.pair
    if (pair && this.page) {
      const beat = Math.floor(pair.progress * PAIR_BEATS)
      if (beat !== this.pairBeat) {
        this.pairBeat = beat
        if (beat > 0 && beat < PAIR_BEATS - 1) this.onTheBeat(pair.kind, beat, this.page)
      }
    } else this.pairBeat = -1
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
    for (const [id, doing] of this.acts) {
      if (now - doing.from < ACT_SECONDS[doing.act.kind]) continue
      const next = this.queued.get(id)
      this.queued.delete(id)
      if (next) this.acts.set(id, { ...next, from: Math.max(next.from, now) }); else this.acts.delete(id)
    }
    this.moments = this.moments.filter((one) => now - one.from < one.lasts)
    for (const [kind, slide] of this.slides) if (now - slide.from >= SLIDE.hold + SLIDE.lasts) this.slides.delete(kind)
    for (const [kind, doing] of this.thingActs) if (now - doing.from >= THING_ACT_SECONDS[doing.act]) this.thingActs.delete(kind)
    for (const [id, glance] of this.glances) if (now >= glance.until) this.glances.delete(id)
    for (const [kind, travel] of this.travelling) { const last = travel.parts[travel.parts.length - 1]; if (now >= last.from + last.lasts) this.travelling.delete(kind) }
    for (const [id, look] of this.looking) if (now >= look.until) this.looking.delete(id)
    for (const [id, walk] of this.walking) if (now - walk.from >= WALK_SECONDS) this.walking.delete(id)
    this.ambient(now)
  }

  /**
   * What a pairing does on each of its beats besides the two figures. The
   * sauna: a puff of steam off the yeti as it melts on the stove, and the lid
   * rattles. The duet: the wall between the two takes a knock, and the lamps
   * of both rooms swing, one way and then the other.
   */
  private onTheBeat(kind: Pairing, beat: number, page: PageLayout): void {
    const u = page.scale, standing = this.standing(page)
    const spotOf = (id: GuestId) => standing.find((one) => one.guest.id === id)
    if (kind === 'sauna') {
      const yeti = spotOf('yeti')
      if (!yeti) return
      this.moment('puff', { x: yeti.spot.x + this.reach * u, y: yeti.spot.y - 96 * u }, page, beat % 2 ? 1 : -1, 0, 'warm')
      return this.sound(voices.saunaPuff)
    }
    const troll = spotOf('troll'), singer = spotOf('singer')
    if (!troll || !singer || typeof troll.guest.place !== 'object' || typeof singer.guest.place !== 'object') return
    const a = troll.guest.place.room, b = singer.guest.place.room
    const wall = page.edges.find((edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a))
    if (wall) this.knocks.push({ ...fromPlain(page, this.view, { x: wall.rect.x + wall.rect.w / 2, y: wall.rect.y + wall.rect.h * (0.3 + 0.08 * (beat % 3)) }), from: this.seconds })
    for (const room of [a, b]) {
      const lamp = this.lamps.get(room) ?? { angle: 0, speed: 0 }
      lamp.speed += (beat % 2 ? 1 : -1) * (room === a ? 1 : -1) * 2.6
      this.lamps.set(room, lamp)
    }
    this.sound(voices.duetBeat(beat))
  }

  /**
   * The house's own sounds: the tuba and the singer on their beat, as the
   * page's place hears them, each sleeper's snore, each guest at its thing
   * and each thing where it stands. They are steady, as the sheet has them:
   * for as long as the game is attended they do not thin or stop because
   * nobody has touched the house. (Unattended or hidden, the Mount stops the
   * clock and the sound altogether.)
   */
  private ambient(now: number): void {
    const beat = Math.floor(now * voices.TUBA_BEAT)
    // What is in the hand is not where it stood: the house is heard without it.
    const house = this.reckoned
    if (beat !== this.beat) {
      this.beat = beat
      {
        const tuba = this.heard(house, 'troll')
        if (tuba) this.sound(voices.tuba(beat, tuba))
        const aria = this.heard(house, 'singer')
        if (aria) this.sound(voices.aria(beat, aria))
        // The cook hums along to a noise it loves, for as long as one reaches it and nothing troubles it.
        const humming = this.humHeard(house)
        if (humming) this.sound(voices.hum(beat, humming))
      }
    }
    // The fly's small buzz, heard only in its own room: from the plain page, from the fly's own place, and from the place of whoever shares that room.
    const hum = Math.floor(now * voices.BUZZ_BEAT)
    if (hum !== this.hum) {
      this.hum = hum
      const heard = this.buzzHeard(house)
      if (heard) this.sound(voices.buzz(heard))
    }
    // What stands somewhere keeps sounding: the stove's rumble, the ice box's hum and drip, the clock's tick or its tock on a wall.
    for (const item of house.things) {
      // The pipe whooshes for as long as something passes through it, and the quilt patters for as long as something is pressed against it.
      const doing = item.kind === 'pipe' || item.kind === 'quilt' ? doingAt(house, { thing: item.kind }, house.phase) : null
      const busy = !!doing && (doing.kind === 'carries' || doing.kind === 'stops') && doing.airs.length > 0
      const kind = item.kind === 'stove' && isRoomAt(item.at) ? 'rumble' : item.kind === 'ice' && isRoomAt(item.at) ? 'hum' : item.kind === 'clock' && item.at !== 'cupboard' ? (isEdgeAt(item.at) ? 'tock' : 'tick') : busy ? (item.kind === 'pipe' ? 'whoosh' : 'patter') : null
      const inHand = !!this.carrying && 'thing' in this.carrying.held && this.carrying.held.thing === item.kind
      if (!kind || inHand) continue
      const nth = Math.floor(now * voices.STEADY_BEAT[kind])
      if (nth === this.steadies.get(item.kind)) continue
      this.steadies.set(item.kind, nth)
      // From a guest's place it is plain in that guest's own room and faint from anywhere else in the house.
      const room = isRoomAt(item.at) ? item.at.room : isGuestAt(item.at) ? roomOf(house, item.at.guest) : null
      this.sound(voices.steady(kind, nth, !this.view || this.view.room === room ? 'plain' : 'faint'))
    }
    // Awake, content and left to it, each guest whose one thing is not a noise makes the small sound of being at it, at a tempo of its own.
    for (const guest of house.guests) {
      const id = guest.id, rate = voices.AT_ITS_THING[id]
      const inHand = !!this.carrying && 'guest' in this.carrying.held && this.carrying.held.guest === id
      // Rolled in the quilt it makes no noise at all.
      if (rate === undefined || typeof guest.at !== 'number' || inHand || !awake(house, id, house.phase) || holds(house, id, 'quilt')) continue
      const nth = Math.floor(now * rate + GUEST_IDS.indexOf(id) * 0.37)
      if (nth === this.doings.get(id)) continue
      this.doings.set(id, nth)
      if (!moodOf(house, id, house.phase).content) continue
      this.sound(voices.atItsThing(id, nth, !this.view || this.view.from === id ? 'plain' : 'faint'))
    }
    // A snore at the top of every few breaths of each sleeper who has a room, each in its own voice. A sleeper rolled in the quilt makes no noise.
    for (const guest of house.guests) {
      const id = guest.id
      const inHand = !!this.carrying && 'guest' in this.carrying.held && this.carrying.held.guest === id
      if (typeof guest.at !== 'number' || awake(house, id, house.phase) || inHand || holds(house, id, 'quilt')) continue
      const breath = Math.floor(now * voices.SNORES[id])
      if (breath === this.breaths.get(id)) continue
      this.breaths.set(id, breath)
      if (this.view?.from === id) continue
      this.sound(voices.snore(id, breath, this.view ? 'faint' : 'plain'))
    }
  }

  /** How the cook's hum is heard just now: on the plain page and from the cook's own place, while a noise it loves reaches it and it is content. Null otherwise. */
  private humHeard(house: Arrangement): HeardAs | null {
    const carried = this.carrying && 'guest' in this.carrying.held && this.carrying.held.guest === 'cook'
    if (roomOf(house, 'cook') === null || carried || holds(house, 'cook', 'quilt')) return null
    if (!moodOf(house, 'cook', house.phase).delights.some((delight) => delight.kind === 'din')) return null
    return this.view === null ? 'plain' : this.view.from === 'cook' ? 'loved' : null
  }

  /**
   * How the fly's buzz is heard just now. It stays in the fly's own room,
   * unless the fly has the pipe at its mouth, which carries it a room
   * further. On the plain page it is plain; from the fly's place its own;
   * from the place of a guest it reaches, as that guest takes it; and from
   * anywhere it does not reach, or when the fly is asleep or rolled in the
   * quilt, nothing.
   */
  private buzzHeard(house: Arrangement): HeardAs | null {
    const room = roomOf(house, 'fly')
    const carried = this.carrying && 'guest' in this.carrying.held && this.carrying.held.guest === 'fly'
    if (room === null || carried || !awake(house, 'fly', house.phase)) return null
    const reaches = arrivalsAt(house, house.phase).filter((arrival) => arrival.source.air === 'din' && 'guest' in arrival.source.by && arrival.source.by.guest === 'fly')
    if (reaches.length === 0) return null
    const view = this.view
    if (!view) return 'plain'
    if (view.from === 'fly') return 'loved'
    const here = reaches.find((arrival) => arrival.room === view.room)
    return here ? takes(house, view.from, here) : null
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
    const free = !pressing && !carried && !this.playing && !this.acts.has(id)
    let body = this.director.body(id, this.seconds, isAwake, free)
    if (pressing) body = both(body, pressed(id, (pressing.liftedAt ?? this.seconds) - pressing.downAt, pressing.liftedAt === null ? null : this.seconds - pressing.liftedAt))
    const pair = this.stage.pair
    if (pair) {
      const t = pair.progress, on = smooth(t / 0.12) * smooth((1 - t) / 0.1)
      if (pair.kind === 'sauna' && id === 'yeti') {
        // The sauna: up onto the stove, and there it melts, lower and wider with every puff of steam, down to a puddle with a face; and up again at the end as if nothing had happened.
        const melt = smooth((t - 0.12) / 0.6) * on
        body = both(body, { sx: 1 + 0.42 * melt, sy: 1 - 0.5 * melt, rot: 0, dx: this.reach * on, dy: -34 * on * (1 - 0.6 * melt) })
      }
      if (pair.kind === 'duet' && (id === 'troll' || id === 'singer')) {
        // The duet: the two sway against each other in time, and for the last long note each leans in and bows to the wall between them.
        const mine = id === 'troll' ? 1 : -1, toward = mine * (this.reach < 0 ? -1 : 1)
        const sway = Math.sin(t * Math.PI * 8) * 0.09 * on * (1 - smooth((t - 0.68) / 0.08))
        const bow = smooth((t - 0.72) / 0.1) * smooth((1 - t) / 0.08)
        body = both(body, { sx: 1, sy: 1 + 0.04 * on - 0.14 * bow, rot: mine * sway + toward * BOW * bow, dx: 0, dy: 0 })
      }
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
    // While the porter shows his way on a guest's page, the page is drawn from where that guest stands in his house, not in the child's.
    const mine = this.stage.house && this.view && !this.view.inHand ? this.viewIn(house, this.view.from) : this.view
    const view = this.playing && this.stage.leaving.length + this.stage.arriving.length > 0 ? null : mine
    const cast = castById(this.stay.cast)
    const early = cast ? LADDER.indexOf(cast.position) <= LADDER.indexOf(WHOLE_PATHS_UNTIL) : true
    const carrying = this.carrying
    // A lodger in the hand has left its room: nothing is made there and nobody is cross at it, and what would reach it in the room it is held over is reckoned with it there and nowhere else. A thing in the hand has left its place the same way.
    const lifted = carrying && 'guest' in carrying.held && typeof placeOf(house, carrying.held.guest) === 'number' ? carrying.held.guest : null
    const base = pageOfArrangement(this.reckoned, view?.from ?? null, early, view?.room)
    const u = page.scale
    const standing = spotsOf(base.guests, page)
    const showing = guidance && !this.busy && (guidance.glow > 0 || guidance.demo !== null)
    const shown = showing && guidance ? this.handFor(this.hintOf(guidance), guidance, page, standing) : null

    // How far apart the two of a pairing are: the yeti goes over to the stove, and the troll and the singer bow toward each other.
    const pairing = this.stage.pair
    if (pairing) {
      const spotOf = (id: GuestId) => standing.find((one) => one.guest.id === id)?.spot
      const stove = base.things.find((item) => item.kind === 'stove'), stoveBox = stove ? thingBox(stove, page, standing) : null
      const yeti = spotOf('yeti'), troll = spotOf('troll'), singer = spotOf('singer')
      this.reach = pairing.kind === 'sauna' ? (stoveBox && yeti ? (stoveBox.x + stoveBox.w / 2 - yeti.x) / u : 0) : troll && singer ? (singer.x - troll.x) / u : 0
    }

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
      // A small act of the grid, reckoned from where the guest stands in this frame: it goes to the thing, never past it. A guest in a pairing is doing that and nothing else.
      const doing = this.acts.get(guest.id)
      const paired = !!pairing && (pairing.kind === 'sauna' ? guest.id === 'yeti' : guest.id === 'troll' || guest.id === 'singer')
      // Nor is one that is walking to a new standing place: the act takes up again from where it comes to stand.
      if (doing && !isCarried && !paired && !this.walking.has(guest.id)) {
        const to = doing.at, act = doing.act
        const live: GuestAct = !to ? act : act.kind === 'stuck' ? { ...act, dx: (to.x - spot.x) / u, dy: (to.y - spot.y) / u } : 'dx' in act ? { ...act, dx: (to.x - spot.x) / u } : act
        const moved = actBody(live, now - doing.from)
        if (moved) body = both(body, moved)
      }
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
      const glance = this.glances.get(guest.id)
      return {
        ...guest,
        body,
        ...(isCarried && carrying ? { carried: { x: carrying.x, y: carrying.y, swing: carrying.dangle.angle } } : {}),
        ...(look ? { looks: look.side } : {}),
        ...(glance && now >= glance.from && now < glance.until && typeof guest.place === 'object' ? { glancesAt: demandOf(house.house, guest.id) } : {}),
        ...(this.acts.get(guest.id)?.act.kind === 'tests-bed' && !isCarried && typeof guest.place === 'object' ? { unpacks: true } : {}),
      }
    })

    // Guests who have left the house, filing out to the coach: in no saved field, drawn only while they are seen walking.
    // One that has not set out stands where it stood; one that is yet to come out of a door (its walk starts below zero) is not seen.
    const ghosts = this.stage.leaving.map((walk) => ({ walk, at: whereOn(walk) ?? (walk.progress === 0 ? walk.legs[0].from : null) })).filter((one) => one.at !== null)
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

    /** A thing on its way somewhere a scene sends it: drawn where it has got to, hopping, and not where the house has it. */
    const onWay = (item: InkThing): InkBody | null => {
      const way = this.onItsWay(item.kind), foot = way ? this.footOf(item, page, standing) : null
      // On the trolley it goes where the trolley goes: the porter is carrying it.
      const ride = way?.riding ? this.stage.porter * this.stage.reach : 0
      return way && foot ? { ...REST, dx: (way.at.x - foot.x) / u + ride, dy: (way.at.y - foot.y) / u - (way.moving ? Math.abs(Math.sin(now * 16)) * 4 : 0) } : null
    }
    // What a guest in the hand holds is in the hand with it, and is not drawn where the guest is not.
    const things: InkThing[] = base.things.filter((item) => !(lifted && typeof item.at === 'object' && 'guest' in item.at && item.at.guest === lifted)).map((item) => {
      const key = `t:${item.kind}`
      const pressing = this.springing.get(key)
      const isCarried = !!carrying && 'thing' in carrying.held && carrying.held.thing === item.kind
      let body: InkBody | null = pressing ? thingPressed((pressing.liftedAt ?? now) - pressing.downAt, pressing.liftedAt === null ? null : now - pressing.liftedAt) : null
      if (shown?.press && 'thing' in shown.press && shown.press.thing === item.kind) body = both(thingPressed(0.2, null), { ...REST, dy: -shown.lifted })
      const slide = this.slides.get(item.kind), box = slide && !isCarried ? thingBox(item, page, standing) : null
      if (slide && box) {
        // Against the wall it scorched or frosted for a moment, and then across the floor to where it stands.
        const left = 1 - smooth((now - slide.from - SLIDE.hold) / SLIDE.lasts)
        body = both(body ?? REST, { ...REST, dx: ((slide.x - (box.x + box.w / 2)) / u) * left, dy: ((slide.y - (box.y + box.h)) / u) * left })
      }
      if (pairing?.kind === 'sauna' && item.kind === 'stove') {
        // Under the yeti the stove hops and its lid rattles, on the beat.
        const t = pairing.progress, on = smooth(t / 0.12) * smooth((1 - t) / 0.1)
        body = both(body ?? REST, { ...REST, rot: Math.sin(t * Math.PI * PAIR_BEATS * 2) * 0.05 * on, dy: -Math.abs(Math.sin(t * Math.PI * PAIR_BEATS)) * 5 * on })
      }
      const doing = isCarried ? undefined : this.thingActs.get(item.kind)
      const moved = doing ? thingActBody(doing.act, now - doing.from) : null
      if (moved) body = both(body ?? REST, moved)
      const going = isCarried ? null : onWay(item)
      if (going) body = both(body ?? REST, going)
      return {
        ...item,
        ...(body ? { body } : {}),
        ...(isCarried && carrying ? { carried: { x: carrying.x, y: carrying.y, swing: carrying.dangle.angle } } : {}),
      }
    })
    // A thing the new coach-load has no use for is still seen going back to its shelf, and is put away when it gets there.
    for (const [kind, travel] of this.travelling) {
      if (things.some((item) => item.kind === kind)) continue
      const ghost: InkThing = { kind, at: 'cupboard', dial: travel.dial }
      const going = onWay(ghost)
      if (going) things.push({ ...ghost, body: going })
    }
    // Where each thing stands now, for the next time a scene moves the house.
    this.thingStood.clear()
    for (const item of base.things) {
      const foot = this.footOf(item, page, standing)
      if (foot) this.thingStood.set(item.kind, { ...foot, dial: item.dial, out: item.at !== 'cupboard' })
    }

    const sweep: InkSweep | null = this.sweeping ? { x: this.sweeping.x, y: this.sweeping.y, progress: easeOut((now - this.sweeping.from) / SWEEP_SECONDS) } : null
    const hour = this.hour
    const hourProgress = hour ? easeOut((now - hour.from) / WHEEL_SECONDS) : 1
    // Once the cycle has been judged one thing is wanted, the coach, and the hand shows it: nothing else glows to compete.
    const glow = showing && guidance && guidance.glow > 0 && !this.stay.finished
      ? { strength: guidance.glow, guests: guests.filter((guest) => !guest.carried).map((guest) => guest.id), wheel: true, things: things.filter((item) => !item.carried && !this.travelling.has(item.kind)).map((item) => item.kind) }
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
      knocks: this.knocks.map((one) => ({ ...(one.plain ? fromPlain(page, view, { x: one.x, y: one.y }, one.room ?? null) : { x: one.x, y: one.y }), age: now - one.from })),
      moments: this.moments.map(({ from, ...one }) => ({ ...one, age: now - from })),
      startled: this.startledAt !== null && now - this.startledAt < FLIGHT_SECONDS + 1 ? now - this.startledAt : null,
      coach: true,
      coachAt: this.stage.coachAt,
      // The door stands open while guests file through it, for a moment after the horn, and for as long as the judged house waits for the child's touch.
      coachOpen: this.stage.coachOpen || now - this.honk < 0.6 || (this.stay.finished && !this.playing),
      // And while it waits so, its engine runs and the next coach-load looks out: the one sign that a cycle has ended, so it is a large one.
      coachWaits: this.stay.finished && !this.playing,
      // He trundles up to the wall of the house and no further: he arranges from the lobby and never walks through plaster.
      porterAt: { dx: this.stage.porter * this.stage.reach, dy: 0 },
      numerals: true,
    }
  }

  /** How long the scene that is playing still has to run, in seconds; 0 when none is. */
  get sceneLeft(): number {
    return this.playing ? Math.max(0, this.sceneEnds - this.seconds) : 0
  }
}

