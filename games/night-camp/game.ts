import { SUPPLY_LANES, USER_ROWS, boardFor, cardHome, dogPath, hourAt, hourX, rowEnd, streamPoint, targetAt, trailCell, trailPoint, unitLength, unitsAt, type Board, type Live, type Point, type Target } from './board'
import { backToDusk, cardAmount, cardNow, clickWick, fetchNeatWay, flipCard, hoursOf, layIn, layTrail, lightsOut, moveLantern, moveOn, pickTrail, planOf, reachDawn, rowOf, rubLast, serializeCamp, showStamps, siteOf, stamp, turnDial, unfold, type CampState } from './camp'
import { sparePlaces, towerLoad, towerPlaces } from './consequences'
import { restGameFrame, type GameFrame, type StripFrame } from './frame'
import { use, type Action, type Thing } from './grid'
import { handPose, type Guidance, type HandPose } from './guidance'
import { Cast } from './motion'
import { moment, runNight, type Night } from './night'
import { EYES_FROM, LURK_AWAY, ashAt, boundAt, facing, lightsAt, lurkersAt, mothsFor, raccoonLines, type Bound } from './nightView'
import { alongWay, nearestOpen, wayBetween, wayLength } from './paths'
import { HALVES, stampedStrip, value } from './ratio'
import { Rows } from './rows'
import { Scene, followedBy, type Beat } from './scene'
import { seeded } from './terrain'
import { DISLIKED, content, reactions, type Reaction } from './tastes'
import * as V from './voices'
import { PLACES, ROD_LENGTH, SUPPLY_OF, type CamperId, type Supply, type User } from './world'

// The game on the toy. One class holds the saved camp (camp.ts), the board of
// its site (board.ts) and everything that moves, takes gestures as points on
// the surface, steps on game time, and writes one frame of numbers for the
// view. Every rule it applies is in the pure modules beside it: this file is
// only how a finger reaches them and how the world shows what they answer.
//
// - A touch is answered in the call that lands it, before any frame.
// - The night is a view of the saved plan under the cursor's hour: it runs
//   only when the child starts it, on game time, and plays backwards as it
//   plays forwards. Nothing reads a clock.
// - A scene saves its outcome when it starts, and any touch ends it.
// - Nothing is rated, counted for the child or praised.

type Hold =
  | { kind: 'row'; supply: Supply; fromPile: boolean; waiting: boolean; before: number; end: number | null }
  | { kind: 'carry'; thing: 'log' | 'flask' | 'can' | 'marshmallow' }
  | { kind: 'card'; user: User; moved: boolean }
  | { kind: 'lantern'; index: number; moved: boolean }
  | { kind: 'cursor'; moved: boolean; wasGliding: boolean }
  | { kind: 'dial'; moved: boolean }
  | { kind: 'corner' }

type Figure = { at: Point; turn: number; way: Point[]; far: number; long: number; to: Point; act: string | null; actAge: number; walk: number; withCamper: CamperId | null; upright: boolean; faceTo: number }
type Raccoon = { away: number; hop: number; walk: number; trailAt: number; flee: number }
type Effect = { kind: string; x: number; y: number; age: number; lasts: number; who: CamperId | null; seed: number; follow: number }
type Flight = { from: Point; to: Point; age: number; lasts: number }

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const ease = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x) }
const SUPPLY_THING: Record<Supply, 'log' | 'flask' | 'can'> = { logs: 'log', oil: 'flask', water: 'can' }
/** How fast the cursor glides once pushed, in hours of the night a second of game time; and how fast it runs home when the plan changes. */
export const GLIDE = 1 / 1.5
const HOMING = 9
/** How fast a figure walks, drags its bag, and how fast a raccoon creeps, in design pixels a second. */
const WALK = 150
const DRAG = 46
const CREEP = 120
/** How far, in design pixels, whatever watches from the dark jumps back when the fire flares, and how much the circle of light swells. */
const JUMP_BACK = 46
const BULGE = 0.16
const DOG_SPEED = 250

export class Game {
  camp: CampState
  board: Board
  readonly frame: GameFrame
  private w: number
  private h: number
  private readonly rows: Rows
  private readonly cast: Cast
  private readonly next: () => number
  private hold: Hold | null = null
  private sounds: (readonly V.Note[])[] = []
  private save: 'no' | 'soon' | 'now' = 'no'
  private now = 0
  private night!: Night
  private acts: Reaction[] = []
  private tower = 0
  private hour = 0
  private gliding = false
  private homing = false
  private scene: Scene | null = null
  private sceneKind: 'lights-out' | 'morning' | 'picnic' | 'packing' | 'showing' | null = null
  private figures: Partial<Record<CamperId, Figure>> = {}
  private bound: Partial<Record<CamperId, Bound>> = {}
  private boundKey = ''
  private woken = 99
  private dog: { at: Point; turn: number; way: Point[]; far: number; long: number; mode: 'home' | 'row' | 'sniff' | 'stay' | 'back' | 'night' | 'lap'; age: number; trot: number }
  private raccoons: Raccoon[] = []
  private mule = { sit: 0, look: 0, sat: false, since: 0 }
  private needle = { turn: 0, speed: 0 }
  private fireAge = 9
  private readonly tentAge: Record<CamperId, number> = { reader: 9, sleeper: 9, cook: 9, scout: 9, small: 9 }
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private effects: Effect[] = []
  private carried: { thing: 'log' | 'flask' | 'can' | 'marshmallow'; at: Point; back: Flight | null; then?: Flight | null; unseen?: boolean } | null = null
  private lamps: { at: Point; back: Flight | null; click: number; on: Point | null; onFor: number; roll: number }[] = []
  private cards: Partial<Record<User, { at: Point; back: Flight | null; flipAge: number; left: boolean; away: number }>> = {}
  private knobAge = 9
  private foldAge = 9
  private readonly pinAge: Record<User, number> = { fire: 9, lantern: 9, kettle: 9 }
  private pinShown: Record<User, number | null> = { fire: null, lantern: null, kettle: null }
  private tinPop = 0
  private sledRefuse = 0
  private sinceRefuse = 9
  private sinceSqueak = 9
  private hoot = 0
  private flare = 0
  private dim: { user: 'fire' | 'lantern'; t: number } | null = null
  private filmOff = 0
  private pull = 0
  private packing = 0
  private towerShown = 0
  private stampsShown: { user: User; count: number } | null = null
  private dialShown: number | null = null
  private showing: { move: string; t: number } | null = null
  private picnic = 0
  /** The cursor has passed the middle of a dark night and the picnic has not played yet. */
  private picnicDue = false
  /** The next site's camp, saved from the moment the sheet starts to turn and laid out when it has turned. */
  private next_: CampState | null = null

  constructor(w: number, h: number, camp: CampState, seed: number) {
    this.w = w; this.h = h
    this.camp = camp
    this.board = boardFor(w, h, siteOf(camp), camp.unfolded)
    this.rows = new Rows(camp)
    this.cast = new Cast(seed)
    this.next = seeded(seed + 17)
    this.dog = { at: { ...this.board.dog.at }, turn: this.board.dog.turn, way: [], far: 0, long: 0, mode: 'home', age: 0, trot: 0 }
    this.frame = restGameFrame(this.board)
    this.settle()
    this.write(null)
  }

  // --- What the Mount asks for -------------------------------------------------

  /** The camp as it is saved: whole numbers and ids, a row in the hand included. */
  saved(): CampState { return serializeCamp(this.next_ ?? this.camp) }
  /** Whether what is saved has changed since this was last asked: not at all, at the throttle, or at once (a scene's outcome, a site laid out). */
  takeChanged(): 'no' | 'soon' | 'now' { const was = this.save; this.save = 'no'; return was }
  takeSounds(): (readonly V.Note[])[] { const queued = this.sounds; this.sounds = []; return queued }
  /** A scene is playing: not idleness, so the idle ladder waits. */
  get playing(): boolean { return this.scene !== null && this.scene.running }
  /** The cursor is on its way through the night by itself. */
  get running(): boolean { return this.gliding || this.homing }

  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return
    const sx = w / this.w, sy = h / this.h, scale = (p: Point): Point => ({ x: p.x * sx, y: p.y * sy })
    this.w = w; this.h = h
    this.board = boardFor(w, h, siteOf(this.camp), this.camp.unfolded)
    this.dog.at = scale(this.dog.at); this.dog.way = []; this.dog.far = 0; this.dog.long = 0
    if (this.dog.mode !== 'home' && this.dog.mode !== 'night') this.dog.mode = 'back'
    this.boundKey = ''
    this.settle()
  }

  private say(notes: readonly V.Note[]): void { if (this.sounds.length < 24) this.sounds.push(notes) }
  private mark(how: 'soon' | 'now'): void { if (how === 'now' || this.save === 'no') this.save = how }

  /** Where the things that move are now, for a touch to be read against. */
  private live(): Live {
    return { dog: this.dog.at, cursorHour: this.hour, lanterns: this.lamps.map((lamp) => lamp.at), trail: this.camp.trail }
  }
  targetAt(p: Point): Target | null { return targetAt(this.board, p, this.live()) }

  // --- The plan, and what follows from a change to it --------------------------

  /** Takes a new saved camp. When the plan changed, the night is worked out again, and a night or a morning that was showing is over: the cursor runs home. */
  private take(camp: CampState, how: 'soon' | 'now' = 'soon'): void {
    if (camp === this.camp) return
    const before = this.camp, plan = JSON.stringify(planOf(camp)) !== JSON.stringify(planOf(before)) || camp.unfolded !== before.unfolded
    this.camp = camp
    this.mark(how)
    if (camp.unfolded !== before.unfolded) { this.board = boardFor(this.w, this.h, siteOf(camp), camp.unfolded); this.foldAge = 0 }
    if (plan) {
      this.reckon()
      if (this.hour > 0) { this.homing = true; this.gliding = false }
      for (const supply of SUPPLY_LANES) this.rows.set(supply, camp[supply])
    }
  }

  /** Works the night out from the plan as it stands. */
  private reckon(): void {
    const site = siteOf(this.camp), plan = planOf(this.camp)
    this.night = runNight(site, plan, this.camp.unfolded)
    this.tower = towerPlaces(site, plan, this.night)
    this.acts = reactions(site, this.night, this.tower, sparePlaces(site, plan, this.night))
    this.boundKey = ''
  }

  /** Everything is set where the saved camp says it is, at once: a save just read, a site just laid out. Nothing eases in, nothing sounds, no scene replays. */
  private settle(keepScene = false): void {
    const board = this.board, site = siteOf(this.camp), scene = this.scene, kind = this.sceneKind
    this.reckon()
    this.rows.lay(this.camp)
    this.hour = this.camp.phase === 'morning' ? this.night.hours : 0
    this.gliding = false; this.homing = false; this.scene = null; this.sceneKind = null
    this.filmOff = this.camp.phase === 'morning' ? 1 : 0
    this.woken = 99; this.towerShown = this.camp.phase === 'morning' ? this.tower : 0
    this.lamps = this.camp.lanterns.map((lantern) => ({ at: { ...board.pins[lantern.pin] }, back: null, click: 0, on: null, onFor: 0, roll: -1 }))
    this.cards = {}
    for (const user of USER_ROWS) if (board.rods.includes(SUPPLY_OF[user])) this.cards[user] = { at: cardHome(board, user), back: null, flipAge: 9, left: false, away: 0 }
    this.pinShown = { fire: null, lantern: null, kettle: null }
    this.figures = {}
    this.refresh()
    for (const camper of board.campers) {
      const to = this.bound[camper.who]!
      this.figures[camper.who] = { at: { ...to.to }, turn: to.turn, way: [], far: 0, long: 0, to: to.to, act: to.act, actAge: 9, walk: 0, withCamper: to.withCamper, upright: to.upright, faceTo: to.turn }
    }
    this.raccoons = raccoonLines(site).map(() => ({ away: LURK_AWAY, hop: 0, walk: 0, trailAt: 0, flee: 0 }))
    this.dog.at = { ...this.dogPlace() }; this.dog.way = []; this.dog.far = 0; this.dog.long = 0; this.dog.mode = this.hour > 0 ? 'night' : 'home'
    this.effects = []; this.carried = null; this.hold = null; this.pull = 0; this.packing = 0; this.dim = null; this.showing = null; this.stampsShown = null; this.dialShown = null; this.picnic = 0; this.picnicDue = false
    if (keepScene) { this.scene = scene; this.sceneKind = kind }
  }

  /** The phase the camp is seen in: the plan open at dusk, the cursor on its way, or the morning after. */
  private phase(): 'dusk' | 'night' | 'morning' {
    return this.camp.phase === 'morning' && this.hour >= this.night.hours ? 'morning' : this.hour > 0 ? 'night' : 'dusk'
  }

  /** Where each camper is bound, worked out again only when the hour, the phase or the plan has changed. */
  private refresh(): void {
    const phase = this.phase(), key = `${phase}:${this.hour.toFixed(3)}:${this.woken}`
    if (key === this.boundKey) return
    this.boundKey = key
    const now = boundAt(this.board, planOf(this.camp), this.night, this.acts, this.hour, phase)
    // In the morning scene the campers wake one after another: those not yet woken are still as the night left them.
    if (phase === 'morning' && this.woken < this.board.campers.length) {
      const asleep = boundAt(this.board, planOf(this.camp), this.night, this.acts, this.night.hours, 'night')
      this.board.campers.forEach((camper, i) => { if (i >= this.woken) now[camper.who] = asleep[camper.who] })
    }
    this.bound = now
  }

  /** Where the dog belongs when nothing calls it: at home at dusk, and by the small one in the night. */
  private dogPlace(): Point {
    const small = this.bound.small
    if (this.hour > 0 && small) return nearestOpen(this.board, { x: small.to.x + 20 * this.board.u, y: small.to.y + 4 * this.board.u })
    return this.board.dog.at
  }

  // --- Gestures ------------------------------------------------------------------

  /** A finger landed. A scene that is playing ends first, and the touch is then an ordinary touch. The answer starts here, before any frame. */
  press(p: Point): void {
    if (this.scene && this.scene.running) this.scene.finish()
    this.scene = null; this.sceneKind = null
    for (const user of USER_ROWS) { const card = this.cards[user]; if (card && card.left) { card.left = false; card.back = { from: card.at, to: cardHome(this.board, user), age: 0, lasts: 0.3 } } }
    const on = this.targetAt(p), board = this.board, site = siteOf(this.camp)
    if (!on) return
    if (on.kind === 'pile' || on.kind === 'rod') {
      const supply = on.supply, count = this.camp[supply]
      if (site.given) { this.rows.rattle(supply); this.sledRefuse = 1; this.say(V.STRAP_TWANG); return }
      if (on.kind === 'pile') {
        this.rows.rattle(supply); this.say(V.RATTLE[supply])
        this.hold = { kind: 'row', supply, fromPile: true, waiting: false, before: count, end: null }
        this.rows.hold(supply, unitsAt(board, supply, p.x), false)
        // From an empty rod the first piece jumps to the finger.
        if (count === 0) this.layTo(supply, 1)
        return
      }
      // The last piece of the row, or the only one, is the handle the row is pulled by: a finger that lands on it and
      // lifts without moving has tapped it, and it answers then as any other piece does.
      const last = on.onRow && count >= 1 && on.units >= count - 1 && on.units <= count ? Math.max(0, Math.ceil(count) - 1) : null
      this.hold = { kind: 'row', supply, fromPile: false, waiting: false, before: count, end: last }
      this.rows.hold(supply, on.units, true)
      if (on.onRow && on.units < count - 1 && on.units >= 0) {
        // On a piece that lies in the row: it answers, and the row waits to see whether the finger moves.
        this.hold.waiting = true
        this.rows.finger(supply, on.units, false)
        this.rows.tap(supply, Math.floor(on.units))
        this.say(supply === 'logs' ? V.logTap(Math.floor(on.units) + 1) : supply === 'oil' ? V.FLASK_TAP : V.CAN_TAP)
      } else if (on.units < count - 1 || on.units > count) this.follow(supply, on.units)
    } else if (on.kind === 'card') {
      this.hold = { kind: 'card', user: on.user, moved: false }
      this.say(V.CURSOR_TAKEN)
    } else if (on.kind === 'cursor' || (on.kind === 'ruler' && this.hour > 0)) {
      this.hold = { kind: 'cursor', moved: false, wasGliding: this.gliding }
      this.gliding = false; this.homing = false
      this.say(V.CURSOR_TAKEN)
      if (on.kind === 'ruler') { this.hold.moved = true; this.toHour(clamp(on.hour, 0, this.night.hours)) }
    } else if (on.kind === 'section') {
      this.take(unfold(this.camp, this.camp.unfolded + (on.unfold ? 1 : -1)))
      this.say(on.unfold ? V.UNFOLDS : V.FOLDS_BACK)
    } else if (on.kind === 'dial') {
      this.hold = { kind: 'dial', moved: false }
    } else if (on.kind === 'lantern') {
      this.hold = { kind: 'lantern', index: on.index, moved: false }
      this.lamps[on.index].back = null; this.lamps[on.index].on = null
      this.say(V.LANTERN_SQUEAK)
    } else if (on.kind === 'pin') {
      this.say(V.LANTERN_SET)
    } else if (on.kind === 'tin') {
      this.tinPop = 1; this.say(V.TIN_POP)
      this.hold = { kind: 'carry', thing: 'marshmallow' }
      this.carried = { thing: 'marshmallow', at: { ...board.tin }, back: null }
    } else if (on.kind === 'marshmallow') {
      // A marshmallow of the trail is picked up again: the calm way to tidy up, one at a time.
      this.take(pickTrail(this.camp, on.cell)); this.say(V.MARSH_LAID)
      this.hold = { kind: 'carry', thing: 'marshmallow' }
      this.carried = { thing: 'marshmallow', at: trailPoint(board, on.cell), back: null }
    } else if (on.kind === 'corner') {
      this.hold = { kind: 'corner' }
      this.pull = Math.max(this.pull, 0.12)
      this.say(V.CORNER_RUSTLE)
    } else if (on.kind === 'camper') {
      // Help is fetched: at dusk a tap on the scout plays the neat way again, once it has had its one showing.
      const move = on.who === 'scout' ? fetchNeatWay(this.camp) : null
      if (move && this.phase() === 'dusk') this.show(move, false)
      else { this.cast.poke(on.who); this.say(V.POKED[on.who]) }
    } else if (on.kind === 'tent') { this.tentAge[on.who] = 0; this.say(V.TENT_TWANG[on.who]) }
    else if (on.kind === 'dog') { this.cast.poke('dog'); this.say(V.DOG_YIP) }
    else if (on.kind === 'frog') { if (!this.cast.busy('frog')) { this.cast.poke('frog'); this.say(V.FROG_HOP) } }
    else if (on.kind === 'mule') { this.cast.poke('mule'); this.say(V.MULE_BRAY) }
    else if (on.kind === 'fire') { this.fireAge = 0; this.say(V.FIRE_STONES); if (board.kettle) this.say(V.KETTLE_LID) }
    else { this.needle.speed += 16; this.say(V.COMPASS_SPIN) }
  }

  /** The finger moved while down. */
  move(p: Point): void {
    const hold = this.hold, board = this.board, u = board.u
    if (!hold) return
    if (hold.kind === 'row') {
      const supply = hold.supply
      // Lifted off the lanes and up onto the map, the finger carries one piece away, and the row is as it was.
      if (p.y < board.walkway + 4 * u) {
        this.layTo(supply, hold.before)
        this.rows.release(supply)
        this.rows.wantHeap(supply, 0)
        this.hold = { kind: 'carry', thing: SUPPLY_THING[supply] }
        this.carried = { thing: SUPPLY_THING[supply], at: { ...p }, back: null }
        return
      }
      const units = unitsAt(board, supply, p.x)
      hold.waiting = false; hold.end = null
      if (hold.fromPile) {
        // Sliding out from the pile over what already lies there changes nothing until the finger reaches the row's end.
        if (units < this.camp[supply] - 0.5) { this.rows.finger(supply, units, false); return }
        hold.fromPile = false
      }
      this.follow(supply, units)
    } else if (hold.kind === 'carry' && this.carried) {
      this.carried.at = { ...p }
      if (hold.thing === 'marshmallow') {
        const cell = trailCell(board, p)
        if (cell >= 0 && !this.camp.trail.includes(cell) && this.clearCell(cell)) { this.take(layTrail(this.camp, cell)); this.say(V.MARSH_LAID) }
      }
    } else if (hold.kind === 'card') {
      const card = this.cards[hold.user]
      if (!card) return
      hold.moved = true; card.at = { ...p }; card.back = null
      // Along the night ruler the card stamps as it goes, and rubs its last stamp out when it is drawn back.
      if (Math.abs(p.y - board.ruler.y) < 64 * u && p.x > board.ruler.x - 20 * u) this.stampTo(hold.user, hourAt(board, p.x))
    } else if (hold.kind === 'lantern') {
      hold.moved = true
      this.lamps[hold.index].at = { ...p }
      if (this.sinceSqueak > 0.45) { this.sinceSqueak = 0; this.say(V.LANTERN_SQUEAK) }
    } else if (hold.kind === 'cursor') {
      hold.moved = true
      this.toHour(clamp(hourAt(board, p.x), 0, this.night.hours))
    } else if (hold.kind === 'dial') {
      hold.moved = true
      // The knob goes to the notch nearest the finger's bearing from the fire: the notches run along the top of the ring.
      const count = siteOf(this.camp).fire.length, bearing = Math.atan2(p.y - board.fire.y, p.x - board.fire.x)
      const notch = (i: number) => -Math.PI / 2 + (count === 1 ? 0 : (i / (count - 1) - 0.5) * 1.3)
      let best = this.camp.fire, least = Infinity
      for (let i = 0; i < count; i++) { const off = Math.abs(Math.atan2(Math.sin(bearing - notch(i)), Math.cos(bearing - notch(i)))); if (off < least) { least = off; best = i } }
      this.dial(best)
    } else if (hold.kind === 'corner') {
      this.pull = clamp(Math.hypot(board.corner.x - p.x, board.corner.y - p.y) / (220 * u), 0.12, 1)
    }
  }

  /** The finger let go: a tap, or the end of a drag. */
  lift(): void {
    const hold = this.hold, board = this.board
    this.hold = null
    if (!hold) return
    if (hold.kind === 'row') {
      const supply = hold.supply
      if (this.rows.release(supply)) this.say(V.SETTLE[supply])
      if (hold.end !== null && this.camp[supply] === hold.before) {
        // Tapped: a log rolls half a turn and rings its own note, a flask wobbles and rings, a can sloshes and a cup hops out and back.
        this.rows.tap(supply, hold.end)
        this.say(supply === 'logs' ? V.logTap(hold.end + 1) : supply === 'oil' ? V.FLASK_TAP : V.CAN_TAP)
      }
      this.lookAtRow(supply)
    } else if (hold.kind === 'carry' && this.carried) {
      const at = this.carried.at, thing = this.carried.thing, on = this.dropOn(at)
      if (thing === 'marshmallow' && Math.hypot(at.x - board.tin.x, at.y - board.tin.y) < 16 * board.u) {
        // The tin was tapped: one jumps out, lands beside it, sits a moment, and hops back in.
        const beside = { x: board.tin.x + 40 * board.u, y: board.tin.y + 14 * board.u }
        this.carried.at = { ...board.tin }
        this.carried.back = { from: { ...board.tin }, to: beside, age: 0, lasts: 0.34 }
        this.carried.then = { from: beside, to: { ...board.tin }, age: -0.55, lasts: 0.3 }
        this.say(V.MARSH_LAID)
      } else if (on) { this.cell(thing, on.action, on.at, on.who, on.index); this.carried = null }
      else if (thing === 'marshmallow' && trailCell(board, at) >= 0) this.carried = null
      else { this.carried.back = { from: at, to: thing === 'marshmallow' ? board.tin : { x: board.pile, y: board.lanes[SUPPLY_LANES.indexOf(thing === 'log' ? 'logs' : thing === 'flask' ? 'oil' : 'water')] - 12 * board.u }, age: 0, lasts: 0.32 }; this.say(V.HOPS_BACK) }
    } else if (hold.kind === 'card') {
      const card = this.cards[hold.user]
      if (!card) return
      if (!hold.moved) { this.take(flipCard(this.camp, hold.user)); card.flipAge = 0; this.say(V.CARD_FLIP); return }
      const on = this.dropOn(card.at)
      // In its show the card is the show's own (curling at the fire, stuck on the lantern, in the dog's mouth): the card
      // itself is out of sight until the show is over, and then it is back beside its pile.
      if (on) { this.cell('card', on.action, on.at, on.who, on.index); card.away = on.action === 'on-camper' ? 4.2 : 1.9; card.at = cardHome(board, hold.user) }
      else card.back = { from: card.at, to: cardHome(board, hold.user), age: 0, lasts: 0.34 }
    } else if (hold.kind === 'lantern') {
      const lamp = this.lamps[hold.index]
      if (!hold.moved) { this.take(clickWick(this.camp, hold.index)); lamp.click = 1; this.say(V.WICK_CLICK); return }
      const home = board.pins[this.camp.lanterns[hold.index].pin]
      // Let go by a free pin it stands there; on another lantern, on the fire or on a camper it puts on its show and hops back.
      let nearest = -1, least = 44 * board.u
      board.pins.forEach((pin, i) => { const away = Math.hypot(pin.x - lamp.at.x, pin.y - lamp.at.y); if (away < least) { least = away; nearest = i } })
      const taken = nearest >= 0 && this.camp.lanterns.some((other, i) => i !== hold.index && other.pin === nearest)
      const on = taken ? { action: 'on-lantern' as const, at: board.pins[nearest], who: null, index: nearest } : nearest >= 0 ? null : this.dropOn(lamp.at, hold.index)
      if (nearest >= 0 && !taken) { this.take(moveLantern(this.camp, hold.index, nearest)); lamp.back = { from: lamp.at, to: board.pins[nearest], age: 0, lasts: 0.12 }; this.say(V.LANTERN_SET) }
      else {
        if (on) this.cell('lantern', on.action, on.at, on.who, on.index, hold.index)
        else this.say(V.HOPS_BACK)
        if (!lamp.on) lamp.back = { from: lamp.at, to: home, age: 0, lasts: 0.34 }
      }
    } else if (hold.kind === 'cursor') {
      if (this.hour >= this.night.hours - 0.03) this.dawn()
      else if (this.hour <= 0.03 && hold.moved) this.toHour(0)
      else if (hold.moved || !hold.wasGliding) this.gliding = true
    } else if (hold.kind === 'dial') {
      if (!hold.moved) this.dial((this.camp.fire + 1) % siteOf(this.camp).fire.length)
    } else if (hold.kind === 'corner') {
      if (this.pull >= 0.5) this.pack()
    }
  }

  /**
   * The finger was taken away without lifting: the game was put away under it, or the browser took the pointer.
   * Whatever was in the hand is let go where it safely is, and nothing the finger had not done yet is done for it:
   * no dial turns, no wick clicks, no card flips or is dropped on anything, no night starts, and no sheet turns.
   */
  drop(): void {
    const hold = this.hold, board = this.board
    this.hold = null
    if (!hold) return
    if (hold.kind === 'row') {
      // A row stays as long as it was drawn: that is the child's own work.
      this.rows.release(hold.supply)
    } else if (hold.kind === 'carry' && this.carried) {
      const thing = this.carried.thing
      this.carried.back = { from: this.carried.at, to: thing === 'marshmallow' ? board.tin : { x: board.pile, y: board.lanes[SUPPLY_LANES.indexOf(thing === 'log' ? 'logs' : thing === 'flask' ? 'oil' : 'water')] - 12 * board.u }, age: 0, lasts: 0.32 }
    } else if (hold.kind === 'card') {
      const card = this.cards[hold.user]
      if (card && hold.moved) card.back = { from: card.at, to: cardHome(board, hold.user), age: 0, lasts: 0.34 }
    } else if (hold.kind === 'lantern') {
      const lamp = this.lamps[hold.index]
      if (hold.moved) lamp.back = { from: lamp.at, to: board.pins[this.camp.lanterns[hold.index].pin], age: 0, lasts: 0.34 }
    }
    // The cursor stays where it stands and does not set off; the dial is not turned; the corner falls back.
  }

  /**
   * The game is put away: parked, hidden or closed. What the finger held is let go as `drop` does. A scene that is
   * playing is finished, since its outcome was saved as it started. A night on its way ends, since a night is not
   * saved: the camp is found at dusk with the plan as it was, here as after a load, and nothing sets off by itself.
   */
  rest(): void {
    this.drop()
    if (this.scene && this.scene.running) this.scene.finish()
    this.scene = null; this.sceneKind = null
    if (this.phase() === 'night' || this.gliding || this.homing) this.settle()
  }

  // --- What a gesture does ---------------------------------------------------------

  /** Lays a supply in to a count, through the camp's limits. What does not fit shows where it does not: off the end of the rod, or off the tail of the sled. */
  private layTo(supply: Supply, count: number): void {
    const { state, refusal } = layIn(this.camp, supply, count)
    this.take(state)
    this.rows.set(supply, state[supply])
    if (refusal && refusal.kind === 'sled-full' && this.sinceRefuse > 0.3) {
      this.sinceRefuse = 0; this.sledRefuse = 1; this.say(V.SLIDES_OFF)
      // The piece that slid off the tail hops back to its own pile, once it is off.
      const board = this.board, sled = board.sled
      if (sled && this.carried === null) {
        const tail = { x: sled.x + 9 * board.u, y: sled.top + sled.places * sled.place + 30 * board.u }
        this.carried = { thing: SUPPLY_THING[supply], at: tail, unseen: true, back: { from: tail, to: { x: board.pile, y: board.lanes[SUPPLY_LANES.indexOf(supply)] - 12 * board.u }, age: -0.4, lasts: 0.55 } }
        this.say(V.HOPS_BACK)
      }
    }
  }

  /** The row's end goes to where the finger is: a whole count of pieces, and a heap for whatever lies past the rod's end. */
  private follow(supply: Supply, units: number): void {
    const most = ROD_LENGTH[supply]
    this.rows.finger(supply, units, true)
    this.layTo(supply, clamp(Math.round(units), 0, most))
    this.rows.wantHeap(supply, ((units - most) * unitLength(this.board, supply)) / (16 * this.board.u))
  }

  /** A marshmallow is laid only on bare map: never on a tent, a camper, the fire or a lantern. */
  private clearCell(cell: number): boolean {
    const at = trailPoint(this.board, cell), on = targetAt(this.board, at, this.live())
    return on === null
  }

  private dial(setting: number): void {
    if (setting === this.camp.fire) return
    this.take(turnDial(this.camp, setting))
    this.knobAge = 0
    this.say(V.dialClick(setting))
  }

  /** The card's strip follows the finger along the ruler: one more stamp once the finger is half way into the next span, the last one rubbed out once it is drawn well back. */
  private stampTo(user: User, hour: number): void {
    const site = siteOf(this.camp), card = cardNow(planOf(this.camp), user), amount = cardAmount(site, user, card)
    for (let guard = 0; guard < 40; guard++) {
      const sides = rowOf(this.camp, user, card), halves = sides.reduce((sum, side) => sum + HALVES[side], 0)
      const reach = (halves * amount.hours) / 2, span = (HALVES[this.camp.cards[user]] * amount.hours) / 2
      const last = sides.length > 0 ? (HALVES[sides[sides.length - 1]] * amount.hours) / 2 : 0
      if (hour >= reach + span / 2) {
        const stamped = stamp(this.camp, user)
        if (stamped === this.camp) return
        this.take(stamped); this.say(V.CARD_STAMP)
      } else if (sides.length > 0 && hour < reach - last * 1.2) {
        this.take(rubLast(this.camp, user, card)); this.say(V.RUB_OUT)
      } else return
    }
  }

  /** What a thing let go at a place has been dropped on: the fire, a lantern or a camper, or nothing. */
  private dropOn(at: Point, notLantern = -1): { action: Action; at: Point; who: CamperId | null; index: number } | null {
    const board = this.board, u = board.u
    if (Math.hypot(at.x - board.fire.x, at.y - board.fire.y) < 62 * u) return { action: 'on-fire', at: board.fire, who: null, index: -1 }
    for (let i = 0; i < this.lamps.length; i++) if (i !== notLantern && Math.hypot(at.x - this.lamps[i].at.x, at.y - this.lamps[i].at.y) < 40 * u) return { action: 'on-lantern', at: this.lamps[i].at, who: null, index: i }
    for (const camper of board.campers) {
      const figure = this.figures[camper.who]!
      if (Math.hypot(at.x - figure.at.x, at.y - figure.at.y) < 44 * u || Math.hypot(at.x - camper.head.x, at.y - camper.head.y) < 34 * u) return { action: 'on-camper', at: figure.at, who: camper.who, index: -1 }
    }
    return null
  }

  /** One cell of the grid: the world puts on its show, and only a right use changes anything. `mine` is the lantern that was carried. */
  private cell(thing: Thing, action: Action, at: Point, who: CamperId | null, index: number, mine = -1): void {
    const when = this.hour > 0 ? 'night' : 'dusk', result = use(thing, action, when), board = this.board
    const lasts: Record<string, number> = { 'lantern-tips-and-rolls-into-the-stream': 3.4, 'steam-cloud-hides-a-patch-of-map': 3.2, 'the-dog-runs-a-lap-with-it': 4.2, 'swells-to-the-size-of-a-tent-and-sags': 2.8, 'puddle-and-a-frog': 2.8, 'worn-as-a-hat': 2.4 }
    this.effects.push({ kind: result.result, x: at.x, y: at.y, age: 0, lasts: lasts[result.result] ?? 1.9, who, seed: Math.floor(this.next() * 1000), follow: -1 })
    const voices: Record<string, readonly V.Note[]> = {
      'log on-fire': when === 'night' ? V.LOG_FLARE : V.LOG_ON_FIRE, 'log on-lantern': V.LOG_ON_LANTERN, 'log on-camper': who ? V.LOG_ON_CAMPER[who] : V.HOPS_BACK,
      'flask on-fire': V.FLASK_ON_FIRE, 'flask on-lantern': V.FLASK_ON_LANTERN, 'flask on-camper': V.FLASK_ON_CAMPER,
      'can on-fire': when === 'night' ? V.CAN_STEAM : V.CAN_ON_FIRE, 'can on-lantern': V.CAN_ON_LANTERN, 'can on-camper': V.CAN_ON_CAMPER,
      'lantern on-fire': V.LANTERN_ON_FIRE, 'lantern on-lantern': V.LANTERN_ON_LANTERN, 'lantern on-camper': who === 'reader' ? V.LANTERN_ON_READER : who === 'sleeper' ? V.LANTERN_ON_SLEEPER : V.LANTERN_ON_CAMPER,
      'card on-fire': V.CARD_ON_FIRE, 'card on-lantern': V.CARD_ON_LANTERN, 'card on-camper': V.CARD_ON_CAMPER,
      'marshmallow on-fire': V.MARSH_ON_FIRE, 'marshmallow on-lantern': V.MARSH_ON_LANTERN, 'marshmallow on-camper': who === 'sleeper' ? V.MARSH_ON_SLEEPER : V.MARSH_ON_CAMPER,
    }
    this.say(voices[`${thing} ${action}`] ?? V.HOPS_BACK)
    if (who) this.cast.poke(who)
    if (action === 'on-fire') {
      this.fireAge = 0
      if (when === 'night' || thing === 'flask') this.flare = 1
      // In the night the circle of light bulges for a beat, and whatever watches from the dark jumps back from it.
      if (when === 'night' && this.flare === 1) for (const raccoon of this.raccoons) if (raccoon.away < LURK_AWAY - 2) raccoon.flee = JUMP_BACK
    }
    // A supply dropped on its own user at dusk is laid in: one more piece on its rod.
    if (result.changes === 'stock') this.layTo(thing === 'log' ? 'logs' : 'oil', this.camp[thing === 'log' ? 'logs' : 'oil'] + 1)
    if (thing === 'log' && action === 'on-lantern' && index >= 0) {
      // The lantern tips, rolls down to the stream, and bobs back to its pin.
      this.lamps[index].roll = 0
    }
    if (thing === 'lantern' && mine >= 0) {
      // The carried lantern sits where it was dropped for the length of its show, then hops back to its pin.
      const lamp = this.lamps[mine], home = board.pins[this.camp.lanterns[mine].pin]
      lamp.on = { x: at.x, y: at.y - (action === 'on-lantern' ? 30 * board.u : 0) }; lamp.onFor = action === 'on-camper' ? 2.4 : 1.6
      lamp.at = { ...lamp.on }; lamp.back = { from: lamp.at, to: home, age: -lamp.onFor, lasts: 0.34 }
    }
    if (thing === 'card' && action === 'on-camper') {
      // The dog takes it and runs a lap of the camp along the walkway.
      const home = this.dogPlace(), y = board.walkway
      this.dog.way = [this.dog.at, { x: this.dog.at.x, y }, { x: board.inset + 70 * board.u, y }, { x: board.flap.top - 70 * board.u, y }, { x: home.x, y }, home]
      this.dog.long = wayLength(this.dog.way); this.dog.far = 0; this.dog.mode = 'lap'
    }
  }

  /** The nearest camper turns to look at a row's end, and at dusk the dog trots over to sniff it. */
  private lookAtRow(supply: Supply): void {
    const board = this.board, end = rowEnd(board, supply, this.camp[supply])
    let nearest: CamperId | null = null, least = Infinity
    for (const camper of board.campers) { const away = Math.hypot(camper.head.x - end.x, camper.head.y - end.y); if (away < least) { least = away; nearest = camper.who } }
    if (nearest) {
      const lying = board.campers.find((one) => one.who === nearest)!, toward = Math.atan2(end.y - lying.head.y, end.x - lying.head.x) - (lying.turn - Math.PI / 2)
      this.cast.watch(nearest, clamp(Math.atan2(Math.sin(toward), Math.cos(toward)), -0.7, 0.7), 2.4)
    }
    if (this.camp[supply] > 0 && this.hour === 0 && (this.dog.mode === 'home' || this.dog.mode === 'row' || this.dog.mode === 'sniff' || this.dog.mode === 'stay')) {
      const way = dogPath(board, supply, this.camp[supply])
      this.dog.way = this.dog.mode === 'home' ? way : [this.dog.at, way[2]]
      this.dog.long = wayLength(this.dog.way); this.dog.far = 0; this.dog.mode = 'row'
    }
  }

  // --- The night -------------------------------------------------------------------

  /** The cursor goes to an hour. Going forward, everything it passes on the way happens: an owl at each hour, a round poured, a light going out. Going back, nothing does: the night is simply as it was then. */
  private toHour(hour: number): void {
    const before = this.hour, site = siteOf(this.camp), night = this.night, board = this.board
    this.hour = hour
    if (hour <= 0) { this.gliding = false; if (this.camp.phase === 'morning') this.take(backToDusk(this.camp), 'now'); this.filmOff = 0; this.pinShown = { fire: null, lantern: null, kettle: null }; return }
    if (hour < night.hours && this.camp.phase === 'morning') { this.take(backToDusk(this.camp), 'now'); this.filmOff = 0; this.towerShown = 0 }
    if (hour <= before) return
    const passed = (at: number) => before < at && at <= hour
    for (let k = Math.floor(before) + 1; k <= Math.floor(hour) && k < night.hours; k++) { this.hoot = 1; this.say(V.HOOT) }
    if (night.kettle) for (const round of night.kettle.rounds) {
      // A round is poured as the cursor leaves its hour.
      if (!(before <= round.hour && round.hour < hour)) continue
      const kinds = new Set<string>()
      for (const camper of board.campers) {
        const served = round.served.includes(camper.who), kind = !served ? 'empty-mug' : round.cold ? 'cold-mug' : 'mug', at = this.figures[camper.who]!.at
        this.effects.push({ kind, x: at.x, y: at.y, age: 0, lasts: 1.6, who: camper.who, seed: round.hour, follow: -1 })
        kinds.add(kind)
      }
      for (const kind of kinds) this.say(kind === 'mug' ? V.MUG : kind === 'cold-mug' ? V.COLD_MUG : V.EMPTY_MUG)
      if (night.kettle.firstShort === round.hour) { this.pinAge.kettle = 0; this.say(V.PIN_DROPS) }
    }
    for (const user of ['fire', 'lantern'] as const) {
      const run = user === 'fire' ? night.fire : night.lantern
      if (!run || !run.short || !passed(value(run.until))) continue
      const at = user === 'fire' ? board.fire : this.lamps[0]?.at ?? board.fire
      this.effects.push({ kind: 'gutters', x: at.x, y: at.y, age: 0, lasts: 1.2, who: null, seed: 0, follow: -1 })
      this.say(V.GUTTERS); this.say(V.PIN_DROPS)
      this.pinAge[user] = 0
      // The first time a light goes out at this site the whole camp plays it out, and the cursor waits.
      const marked = lightsOut(this.camp, user)
      if (marked.first) this.dim = { user, t: 0 }
      if (marked.first) this.play('lights-out', [{ at: 0, lasts: 1, play: (t) => { if (this.dim) this.dim.t = t } }, { at: 1, lasts: 3.6, play: () => {} }], () => this.take(marked.state, 'now'))
    }
    // The secret: a camp with no light at all at the middle of the night.
    // Every time, also when the light that went out at that very moment is playing its own scene first: then the picnic waits for it.
    if (night.darkAtMiddle && passed(night.hours / 2)) this.picnicDue = true
    if (site.tents.length > 0 && before === 0) this.say(V.NIGHT_BEGINS)
  }

  /** The cursor reached dawn. The morning is saved as its scene starts; on a later look it stands finished. */
  private dawn(): void {
    this.hour = this.night.hours
    this.gliding = false
    if (this.camp.phase === 'morning') return
    const { state, showing } = reachDawn(this.camp), campers = this.board.campers
    const beats: Beat[] = [
      { at: 0, lasts: 1.2, play: (t) => { this.filmOff = ease(t) } },
      ...campers.map((camper, i): Beat => ({ at: 0.7 + i * 0.5, lasts: 0, play: () => { if (this.woken <= i) { this.woken = i + 1; this.boundKey = ''; this.say(this.wakes(camper.who) ? V.WAKES_RESTED : V.WAKES_FRAZZLED) } } })),
      { at: 1.2 + campers.length * 0.5, lasts: 2.4, play: (t) => { this.towerShown = this.tower * ease(t) } },
      { at: 3.8 + campers.length * 0.5, lasts: 1.2, play: () => {} },
    ]
    this.say(V.DAWN)
    this.woken = 0
    this.play('morning', showing ? followedBy(beats, this.showBeats(showing, state)) : beats, () => this.take(showing ? this.shown(showing, state) : state, 'now'))
  }

  /** Whether a camper wakes rested: nothing it dislikes happened in its night. */
  private wakes(who: CamperId): boolean {
    return content(who, this.acts)
  }

  // --- Scenes ------------------------------------------------------------------------

  /** Starts a scene: its outcome is put into the saved camp and marked to be saved at once, then its beats play on game time. */
  private play(kind: NonNullable<Game['sceneKind']>, beats: Beat[], saveOutcome: () => void): void {
    if (this.scene && this.scene.running) this.scene.finish()
    this.scene = new Scene(beats)
    this.sceneKind = kind
    this.scene.start(this.now, saveOutcome)
  }

  /** The saved camp after the scout's neat way: the row it shows is brought to its stamps and the card left on its side. A row the child already made is left alone. */
  private shown(move: string, camp: CampState): CampState {
    const site = siteOf(camp), plan = planOf(camp)
    if (move === 'strip') return showStamps(camp, 'fire', cardNow(plan, 'fire'), 'single', 2)
    if (move === 'dial') return showStamps(camp, 'fire', (cardNow(plan, 'fire') + 1) % site.fire.length, 'single', 2)
    if (move === 'span') return showStamps(camp, 'lantern', cardNow(plan, 'lantern'), 'single', 2)
    if (move === 'double') return showStamps(camp, 'fire', cardNow(plan, 'fire'), 'doubled', 1)
    if (move === 'halve') return showStamps(camp, 'fire', cardNow(plan, 'fire'), 'halved', 2)
    return camp
  }

  /** The beats of the scout's neat way with this site's own card and ruler. It shows a move and never the amount the night needs. */
  private showBeats(move: string, camp: CampState): Beat[] {
    const board = this.board, scout = board.campers.find((one) => one.who === 'scout')
    const user: User = move === 'span' ? 'lantern' : move === 'round' ? 'kettle' : 'fire', site = siteOf(camp)
    const after = this.shown(move, camp), stamps = after.strips[user].length - camp.strips[user].length
    const other = move === 'dial' ? (cardNow(planOf(camp), 'fire') + 1) % site.fire.length : null
    const walkTo = scout ? nearestOpen(board, { x: board.card + 60 * board.u, y: board.walkway }) : board.fire
    const out = scout ? wayBetween(board, scout.middle, walkTo) : [], long = wayLength(out)
    const card = this.cards[user], home = cardHome(board, user)
    const walk = (t: number, back: boolean) => { const figure = this.figures.scout; if (!figure || long === 0) return; const now = alongWay(out, long * (back ? 1 - t : t)); figure.at = now.at; figure.turn = now.heading + (back ? Math.PI / 2 : -Math.PI / 2); figure.walk = t < 1 ? (t * 6) % 1 : 0; figure.way = []; figure.far = 0; figure.long = 0; figure.to = figure.at }
    const beats: Beat[] = [{ at: 0, lasts: 1.6, play: (t) => { this.showing = { move, t: t * 0.25 }; walk(ease(t), false) } }]
    if (move === 'round') {
      // One round poured down the line of mugs.
      beats.push(...board.campers.map((camper, i): Beat => ({ at: 1.8 + i * 0.4, lasts: 0, play: () => { const at = this.figures[camper.who]?.at ?? camper.middle; if (!this.effects.some((one) => one.kind === 'mug' && one.who === camper.who && one.age < 1)) { this.effects.push({ kind: 'mug', x: at.x, y: at.y, age: 0, lasts: 1.6, who: camper.who, seed: i, follow: -1 }); this.say(V.MUG) } } })))
      beats.push({ at: 1.8 + board.campers.length * 0.4, lasts: 1, play: (t) => { this.showing = { move, t: 0.25 + t * 0.5 } } })
    } else if (card) {
      if (other !== null) beats.push({ at: 1.7, lasts: 0.3, play: () => { if (this.dialShown !== other) { this.dialShown = other; this.knobAge = 0; this.say(V.dialClick(other)) } } })
      const flips = move === 'double' || move === 'halve'
      if (flips) beats.push({ at: 1.8, lasts: 0.4, play: () => { if (card.flipAge > 1) { card.flipAge = 0; this.say(V.CARD_FLIP) } } })
      // The card goes along the ruler and leaves its stamps one after another; the save holds them all from the start.
      const each = 0.8, from = camp.strips[user].length
      if (stamps > 0) this.stampsShown = { user, count: from }
      for (let n = 0; n < Math.max(1, stamps); n++) beats.push({ at: 2.3 + n * each, lasts: each, play: (t) => {
        const amount = cardAmount(site, user, other ?? cardNow(planOf(camp), user)), span = (HALVES[after.cards[user]] * amount.hours) / 2
        card.at = { x: hourX(board, (n + ease(t)) * span), y: board.ruler.y - 30 * board.u }; card.back = null
        if (t >= 1 && stamps > 0 && (this.stampsShown === null || this.stampsShown.count < from + n + 1)) { this.stampsShown = { user, count: from + n + 1 }; this.say(V.CARD_STAMP) }
        this.showing = { move, t: 0.25 + (0.5 * (n + t)) / Math.max(1, stamps) }
      } })
      beats.push({ at: 2.3 + Math.max(1, stamps) * each, lasts: 0, play: () => { card.left = true; this.stampsShown = null; if (other !== null && this.dialShown !== null) { this.dialShown = null; this.knobAge = 0; this.say(V.dialClick(this.camp.fire)) } } })
    }
    const end = Math.max(...beats.map((beat) => beat.at + beat.lasts))
    beats.push({ at: end + 0.2, lasts: 1.4, play: (t) => { this.showing = t < 1 ? { move, t: 0.75 + t * 0.25 } : null; walk(ease(t), true); if (t >= 1) { this.boundKey = ''; if (card && !card.left) card.back = { from: card.at, to: home, age: 0, lasts: 0.3 } } } })
    return beats
  }

  /** The scout shows a neat way: once after the child's own try, and again whenever the child fetches it. */
  private show(move: string, first: boolean): void {
    const camp = this.camp
    this.play('showing', this.showBeats(move, camp), () => { if (first || this.shown(move, camp) !== camp) this.take(this.shown(move, camp), 'now') })
  }

  /** The child pulled the fold over: the cycle ends and is judged, and the next site is laid out. It is saved at once, before the sheet has turned; the camp on screen changes when it has. */
  private pack(): void {
    const next = moveOn(this.camp).state
    this.say(V.PACKS_UP)
    this.play('packing', [{ at: 0, lasts: 3.4, play: (t) => {
      this.packing = t
      if (t >= 0.5 && this.next_) { this.camp = this.next_; this.next_ = null; this.board = boardFor(this.w, this.h, siteOf(this.camp), this.camp.unfolded); this.settle(true); this.packing = t }
      if (t >= 1) { this.packing = 0; this.pull = 0 }
    } }], () => { this.next_ = next; this.mark('now') })
  }

  // --- A step of game time -----------------------------------------------------------

  /** Advance by a step of game time, in seconds, and write the frame. `guidance` is what the idle ladder asks to be shown. */
  step(dt: number, guidance: Guidance | null): void {
    const board = this.board, u = board.u
    this.now += dt
    this.cast.step(dt)
    this.rows.step(dt, (notes) => this.say(notes))
    this.fireAge += dt; this.knobAge += dt; this.foldAge += dt; this.sinceRefuse += dt; this.sinceSqueak += dt
    for (const user of USER_ROWS) this.pinAge[user] += dt
    for (const camper of board.campers) this.tentAge[camper.who] += dt
    this.tinPop = Math.max(0, this.tinPop - dt * 2.5); this.sledRefuse = Math.max(0, this.sledRefuse - dt * 2); this.hoot = Math.max(0, this.hoot - dt * 1.4); this.flare = Math.max(0, this.flare - dt * 1.2)
    if (this.scene) { this.scene.update(this.now); if (!this.scene.running) { this.scene = null; this.sceneKind = null } }
    if (this.picnicDue && !this.playing) {
      this.picnicDue = false
      // Only in the night it belongs to: a cursor taken back to dusk, or a night already at dawn, has no picnic left to play.
      if (this.hour > 0 && this.phase() === 'night') {
        this.say(V.RACCOON)
        this.play('picnic', [{ at: 0, lasts: 2.2, play: (t) => { this.picnic = t } }, { at: 2.2, lasts: 3.8, play: () => { this.picnic = 1 } }, { at: 6, lasts: 0, play: () => { this.picnic = 0 } }], () => {})
      }
    }
    if (this.dim && !(this.playing && this.sceneKind === 'lights-out')) this.dim = null
    if (!this.hold || this.hold.kind !== 'corner') if (this.packing === 0 && this.pull > 0) this.pull = Math.max(0, this.pull - dt * 4)

    // The cursor: running home after a change to the plan, or gliding on through the night once pushed. A scene of the night holds it still.
    if (this.homing) { this.hour = Math.max(0, this.hour - HOMING * dt * Math.max(1, this.night.hours / 8)); if (this.hour === 0) { this.homing = false; this.filmOff = 0 } }
    else if (this.gliding && !(this.playing && (this.sceneKind === 'lights-out' || this.sceneKind === 'picnic'))) {
      this.toHour(Math.min(this.night.hours, this.hour + GLIDE * dt))
      if (this.hour >= this.night.hours) this.dawn()
    }

    this.refresh()
    for (const camper of board.campers) this.stepFigure(camper.who, dt)
    this.stepDog(dt)
    // The raccoons creep as near as the dark allows, each along its own line; the secret brings them all to the ring.
    // At dawn they go back the way they came.
    const dark = this.hour > 0 && this.phase() !== 'morning'
    const lurkers = dark ? lurkersAt(board, planOf(this.camp), this.night, this.hour) : []
    this.raccoons.forEach((raccoon, i) => {
      const lines = raccoonLines(siteOf(this.camp)), wanted = this.picnic > 0 ? Math.max(lines[i].floor, 80) : lurkers[i] ? lurkers[i].away : LURK_AWAY
      const before = raccoon.away
      if (raccoon.flee > 0) {
        // Startled: back along its own line in one hop, faster than it ever creeps, and only then in again.
        const back = Math.min(raccoon.flee, (JUMP_BACK / 0.22) * dt)
        raccoon.away = Math.min(LURK_AWAY - 3, raccoon.away + back); raccoon.flee -= back; raccoon.hop = 1 - raccoon.flee / JUMP_BACK
      } else { raccoon.hop = 0; raccoon.away += clamp(wanted - raccoon.away, -CREEP * dt, CREEP * dt) }
      // It chitters as it comes out of the dark far enough to be seen.
      if (before > EYES_FROM && raccoon.away <= EYES_FROM) this.say(V.RACCOON)
      raccoon.walk = raccoon.away !== before ? (raccoon.walk + dt * 3) % 1 : 0
      raccoon.trailAt = dark && this.camp.trail.length > 0 ? Math.min(this.camp.trail.length - 1, raccoon.trailAt + dt / 0.45) : 0
    })
    // The mule looks at a heap, then at the sled, and sits down; it gets up when the heap has gone.
    const mule = this.mule, heap = this.rows.heap()
    mule.since += dt
    if (heap >= 1 && !mule.sat) { mule.sat = true; mule.since = 0 }
    if (heap < 0.05 && mule.sat && mule.since > 0.9) { mule.sat = false; mule.since = 0 }
    const look = mule.sat ? (mule.since < 0.45 ? 1 : 2) : 0, sits = mule.sat && mule.since > 0.9, sat = mule.sit
    mule.look += (look - mule.look) * Math.min(1, dt * 7)
    mule.sit += ((sits ? 1 : 0) - mule.sit) * Math.min(1, dt * (sits ? 5 : 2.5))
    if (sat < 0.5 && mule.sit >= 0.5 && sits) this.say(V.MULE_SITS)
    this.needle.speed += (-this.needle.turn * 26 - this.needle.speed * 2.4) * dt
    this.needle.turn += this.needle.speed * dt

    // Things on their way back to where they belong.
    const fly = (flight: Flight, at: Point): boolean => {
      flight.age += dt
      if (flight.age < 0) return false
      const t = ease(flight.age / flight.lasts)
      at.x = flight.from.x + (flight.to.x - flight.from.x) * t
      at.y = flight.from.y + (flight.to.y - flight.from.y) * t - Math.sin(Math.PI * t) * 22 * u
      return flight.age >= flight.lasts
    }
    this.lamps.forEach((lamp, i) => {
      lamp.click = Math.max(0, lamp.click - dt * 4)
      const home = board.pins[this.camp.lanterns[i]?.pin ?? 0] ?? board.fire
      if (lamp.roll >= 0) {
        // Tipped by a log: it rolls down to the stream, sits in it a moment, and bobs back to its pin.
        lamp.roll += dt / 3.4
        const stream = streamPoint(board, home), t = lamp.roll, out = ease((t - 0.2) / 0.35), back = ease((t - 0.75) / 0.25), far = out - back
        lamp.at = { x: home.x + (stream.x - home.x) * far, y: home.y + (stream.y - home.y) * far - (t > 0.75 ? Math.sin(Math.PI * back) * 26 * u : 0) }
        if (lamp.roll >= 1) { lamp.roll = -1; lamp.at = { ...home } }
      } else if (lamp.back) { if (fly(lamp.back, lamp.at)) { lamp.at = { ...lamp.back.to }; lamp.back = null; lamp.on = null } }
      else if (!(this.hold && this.hold.kind === 'lantern' && this.hold.index === i)) lamp.at = { ...home }
    })
    for (const user of USER_ROWS) {
      const card = this.cards[user]
      if (!card) continue
      card.flipAge += dt; card.away = Math.max(0, card.away - dt)
      if (card.back) { if (fly(card.back, card.at)) { card.at = { ...card.back.to }; card.back = null } }
      else if (!card.left && !(this.hold && this.hold.kind === 'card' && this.hold.user === user) && !(this.playing && this.sceneKind !== 'packing')) card.at = cardHome(board, user)
    }
    if (this.carried && this.carried.back && fly(this.carried.back, this.carried.at)) {
      // A flight may be followed by one more: out of the tin, and back in.
      if (this.carried.then) { this.carried.back = this.carried.then; this.carried.then = null } else this.carried = null
    }
    for (const effect of this.effects) effect.age += dt
    this.effects = this.effects.filter((effect) => effect.age < effect.lasts)
    this.write(guidance)
  }

  /** A camper goes toward where it is bound, along a way that passes through nothing, at its own pace: walking when upright, humping along when in its bag. */
  private stepFigure(who: CamperId, dt: number): void {
    const figure = this.figures[who], to = this.bound[who], board = this.board, u = board.u
    if (!figure || !to) return
    // While the scout shows a neat way, the scene walks it.
    if (who === 'scout' && this.showing !== null) { figure.actAge += dt; return }
    if (to.act !== figure.act) {
      figure.act = to.act; figure.actAge = 0
      // A camper says what it thinks of the night in its own voice, when the night does something it dislikes.
      if (this.hour > 0 && to.act !== null && DISLIKED.has(to.act as never)) this.say(V.POKED[who])
    }
    figure.actAge += dt; figure.upright = to.upright; figure.withCamper = to.withCamper; figure.faceTo = to.turn
    if (Math.hypot(to.to.x - figure.to.x, to.to.y - figure.to.y) > 0.5) {
      figure.to = to.to
      // A short shuffle in the bag goes straight; anything further finds its way round what stands between.
      figure.way = !to.upright && Math.hypot(to.to.x - figure.at.x, to.to.y - figure.at.y) < 150 * u ? [figure.at, to.to] : wayBetween(board, { x: Math.round(figure.at.x), y: Math.round(figure.at.y) }, to.to)
      figure.long = wayLength(figure.way); figure.far = 0
    }
    if (figure.far < figure.long) {
      figure.far = Math.min(figure.long, figure.far + (to.upright ? WALK : DRAG) * u * dt)
      const now = alongWay(figure.way, figure.far)
      figure.at = now.at
      figure.walk = (figure.walk + dt * (to.upright ? 2.6 : 1.4)) % 1
      // An upright camper faces down its own frame, the way its feet lay.
      if (to.upright) figure.turn = now.heading - Math.PI / 2
    } else {
      figure.at = { ...figure.to }; figure.walk = 0
      figure.turn += Math.atan2(Math.sin(figure.faceTo - figure.turn), Math.cos(figure.faceTo - figure.turn)) * Math.min(1, dt * 8)
    }
  }

  private stepDog(dt: number): void {
    const dog = this.dog, board = this.board, home = this.dogPlace()
    dog.age += dt
    const go = (way: Point[], mode: typeof dog.mode) => { dog.way = way; dog.long = wayLength(way); dog.far = 0; dog.mode = mode }
    if (dog.mode === 'home' || dog.mode === 'night') {
      // At rest it lies where it belongs; when that place moves (the night begins, the small one moves in) it goes there.
      if (Math.hypot(home.x - dog.at.x, home.y - dog.at.y) > 2) go(wayBetween(board, { x: Math.round(dog.at.x), y: Math.round(dog.at.y) }, home), this.hour > 0 ? 'night' : 'back')
      else dog.turn += Math.atan2(Math.sin(board.dog.turn - dog.turn), Math.cos(board.dog.turn - dog.turn)) * Math.min(1, dt * 6)
    }
    if (dog.long > 0 && dog.far < dog.long) {
      dog.far = Math.min(dog.long, dog.far + DOG_SPEED * board.u * dt)
      const now = alongWay(dog.way, dog.far), facing = now.heading + Math.PI / 2
      dog.at = now.at
      dog.turn += Math.atan2(Math.sin(facing - dog.turn), Math.cos(facing - dog.turn)) * Math.min(1, dt * 14)
      dog.trot = (dog.trot + dt * 3.4) % 1
      if (dog.far >= dog.long) {
        dog.long = 0; dog.trot = 0
        if (dog.mode === 'row') { dog.mode = 'sniff'; dog.age = 0; this.say(V.DOG_SNIFF) } else dog.mode = this.hour > 0 ? 'night' : 'home'
      }
    } else if (dog.mode === 'sniff') {
      dog.turn += Math.atan2(Math.sin(Math.PI - dog.turn), Math.cos(Math.PI - dog.turn)) * Math.min(1, dt * 8)
      if (dog.age > 1.5) { dog.mode = 'stay'; dog.age = 0 }
    } else if (dog.mode === 'stay') {
      if ((dog.age > 2.6 && !this.hold) || this.hour > 0) go([dog.at, { x: board.dog.at.x, y: dog.at.y }, board.dog.at], 'back')
    } else if (dog.mode === 'back' || dog.mode === 'lap' || dog.mode === 'row') dog.mode = this.hour > 0 ? 'night' : 'home'
  }

  // --- The frame -----------------------------------------------------------------------

  private write(guidance: Guidance | null): void {
    const frame = this.frame, board = this.board, u = board.u, cast = this.cast, camp = this.camp, site = siteOf(camp), plan = planOf(camp), phase = this.phase()
    this.rows.write(frame.rows)
    // In the night a row is what is left of it: it shortens from its far end as its user takes from it, and in the
    // morning what was not used still lies there as a length. A log that has been taken has left the rod whole.
    if (this.hour > 0) {
      const left = moment(site, plan, this.night, this.hour)
      frame.rows.logs.length = Math.floor(left.logs + 1e-9); frame.rows.logs.pop = 1
      frame.rows.oil.length = left.oil; frame.rows.water.length = left.water
    }
    for (const who of ['reader', 'sleeper', 'cook', 'scout', 'small'] as const) {
      frame.campers[who] = cast.camper(who)
      frame.tents[who] = this.tentAge[who] < 0.7 ? 1 - this.tentAge[who] / 0.7 : 0
      const figure = this.figures[who]
      if (figure) frame.places[who] = { x: figure.at.x, y: figure.at.y, turn: figure.turn, act: figure.act, actAge: figure.actAge, withCamper: figure.withCamper, walk: figure.far < figure.long || (who === 'scout' && this.showing !== null) ? figure.walk : 0 }
      // A can of water on the sleeper: it sits up and shakes itself dry, for as long as the splash lasts.
      const splash = who === 'sleeper' ? this.effects.find((effect) => effect.kind === 'splash-and-the-camper-shakes-dry' && effect.who === 'sleeper' && effect.age < 1.7) : undefined
      if (splash && figure) frame.places[who] = { ...frame.places[who], act: 'sits-up-and-shakes', actAge: splash.age, walk: 0 }
    }
    const dog = this.dog
    frame.dog.x = dog.at.x; frame.dog.y = dog.at.y; frame.dog.turn = dog.turn
    frame.dog.trot = dog.long > 0 ? dog.trot : 0
    frame.dog.tail = dog.mode === 'home' || dog.mode === 'night' ? cast.idle('dog') : Math.sin(this.now * 19)
    frame.dog.sniff = dog.mode === 'sniff' ? clamp(dog.age / 1.5, 0, 1) : 0
    frame.dog.poke = cast.busy('dog') ? cast.pokeProgress('dog') : 0
    frame.frog.throat = (cast.breath('frog') + 1) / 2
    frame.frog.hop = cast.busy('frog') ? cast.pokeProgress('frog') : 0
    frame.mule.ear = cast.idle('mule'); frame.mule.tail = cast.breath('mule'); frame.mule.look = this.mule.look; frame.mule.sit = this.mule.sit; frame.mule.poke = cast.poked('mule')
    frame.kettle = board.kettle && this.fireAge < 0.45 ? 1 - this.fireAge / 0.45 : 0
    frame.fire = this.fireAge < 0.55 ? 1 - this.fireAge / 0.55 : 0
    frame.needle = this.needle.turn
    frame.stream = (this.now * 0.07) % 1

    // The night under the cursor.
    // In the morning the fire and the lanterns are left exactly as they ended: still burning if they reached dawn, out if they did not.
    const lit = lightsAt(board, plan, this.night, phase === 'morning' ? this.night.hours - 1e-6 : this.hour), dimmed = (user: 'fire' | 'lantern') => (this.dim && this.dim.user === user ? 1 - this.dim.t : 0)
    frame.night.hour = this.hour
    frame.night.film = this.hour > 0 ? ease(this.hour / 0.35) * (1 - this.filmOff) : 0
    frame.night.held = this.hold !== null && this.hold.kind === 'cursor'
    frame.night.hoot = this.hoot
    frame.night.morning = phase === 'morning'
    const setting = this.dialShown ?? camp.fire, fading = dimmed('fire')
    frame.blaze.setting = setting; frame.blaze.knob = clamp(this.knobAge / 0.2, 0, 1); frame.blaze.flare = this.flare
    // A flare in the night swells the circle for a beat and lets it sink back; over a dead fire it is a smaller circle that comes and goes.
    const swell = this.hour > 0 && phase !== 'morning' && this.flare > 0 ? Math.sin(Math.PI * (1 - this.flare)) : 0
    frame.blaze.lit = lit.fire || fading > 0 || swell > 0.02
    frame.blaze.reach = board.reach[Math.min(setting, board.reach.length - 1)] * (lit.fire ? 1 + BULGE * swell : fading > 0 ? fading : swell > 0.02 ? 0.6 * swell : 1)
    frame.lanterns = this.lamps.map((lamp, i) => {
      const wick = camp.lanterns[i]?.wick ?? 0, fade = dimmed('lantern'), reach = wick === 1 ? board.lampHigh : board.lampLow
      return { x: lamp.at.x, y: lamp.at.y, wick, lit: lit.lanterns || fade > 0, reach: lit.lanterns ? reach : fade > 0 ? reach * fade : reach, held: this.hold !== null && this.hold.kind === 'lantern' && this.hold.index === i, click: lamp.click }
    })
    frame.moths = frame.lanterns.map((lantern) => (lantern.lit && phase !== 'morning' ? mothsFor(lantern.wick) : 0))
    frame.ash = ashAt(site, this.night, this.hour)
    for (const user of USER_ROWS) {
      const run = user === 'fire' ? this.night.fire : user === 'lantern' ? this.night.lantern : null
      // In the night a pin lies where a user has run out by now; at dusk the pins of the last night slid to dawn lie where they fell.
      let at: number | null = null
      if (this.hour > 0) at = user === 'kettle' ? (this.night.kettle && this.night.kettle.firstShort !== null && this.hour > this.night.kettle.firstShort ? this.night.kettle.firstShort : null) : run && run.short && this.hour >= value(run.until) ? value(run.until) : null
      else if (camp.pins[user]) at = value(camp.pins[user]!)
      if (at !== null && this.pinShown[user] === null && this.hour > 0 && this.pinAge[user] > 0.4) this.pinAge[user] = 9
      this.pinShown[user] = at
      frame.rulerPins[user] = at === null ? null : { hour: at, drop: clamp(this.pinAge[user] / 0.35, 0, 1) }
    }
    frame.rulerFold = clamp(this.foldAge / 0.3, 0, 1)

    // The cards and their strips.
    frame.cards = {}
    for (const user of USER_ROWS) {
      const card = this.cards[user]
      if (!card) continue
      const which = user === 'fire' ? setting : cardNow(plan, user)
      if (card.away <= 0) frame.cards[user] = { x: card.at.x, y: card.at.y, held: (this.hold !== null && this.hold.kind === 'card' && this.hold.user === user) || card.back !== null || card.left, side: camp.cards[user], flip: clamp(card.flipAge / 0.3, 0, 1), amount: cardAmount(site, user, which) }
      const stamps = this.stampsShown && this.stampsShown.user === user ? camp.strips[user].slice(0, this.stampsShown.count) : camp.strips[user], rows: StripFrame[] = []
      for (const one of stamps) {
        if (rows.some((row) => row.card === one.card)) continue
        const amount = cardAmount(site, user, one.card), sides = stamps.filter((other) => other.card === one.card).map((other) => other.side)
        rows.push({ card: one.card, amount, current: one.card === cardNow(plan, user), stamps: stampedStrip(amount, sides, hoursOf(camp)).map((row, i) => ({ side: sides[i], hours: row.hours, pieces: row.pieces })) })
      }
      // In the order their last stamp was laid: the view reads the row of the dial's card and, under it, the last of the others.
      const last = (card: number) => stamps.map((one) => one.card).lastIndexOf(card)
      frame.strips[user] = rows.sort((one, other) => last(one.card) - last(other.card))
    }
    for (const user of USER_ROWS) if (!this.cards[user]) frame.strips[user] = []

    // The raccoons: far out, only eyes; nearer, the whole animal; one hops along the marshmallow trail.
    const lines = raccoonLines(site), dark = this.hour > 0 && phase !== 'morning', lurkers = dark ? lurkersAt(board, plan, this.night, this.hour) : []
    frame.raccoons = []; frame.eyes = []
    this.raccoons.forEach((raccoon, i) => {
      if (raccoon.away >= LURK_AWAY - 2) return
      const at = { x: board.fire.x + Math.cos(lines[i].bearing) * raccoon.away * u, y: board.fire.y + Math.sin(lines[i].bearing) * raccoon.away * u }
      if (raccoon.away > EYES_FROM) frame.eyes.push(at)
      else frame.raccoons.push({ ...at, turn: facing(at, board.fire), walk: raccoon.walk, hop: raccoon.hop, has: this.picnic > 0 ? (i === 0 && this.picnic > 0.6 ? 'pan' : i === 3 && this.picnic <= 0.6 ? 'tin' : 'nothing') : lurkers[i]?.has === 'tin' && raccoon.away < lurkers[i].away + 12 ? 'tin' : 'nothing' })
    })
    if (dark && camp.trail.length > 0) {
      const far = this.raccoons[0]?.trailAt ?? 0, a = trailPoint(board, camp.trail[Math.floor(far)]), b = trailPoint(board, camp.trail[Math.min(camp.trail.length - 1, Math.floor(far) + 1)]), t = far % 1
      frame.raccoons.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, turn: facing(a, b.x === a.x && b.y === a.y ? board.fire : b), walk: 0, hop: far >= camp.trail.length - 1 ? 0 : t, has: 'marshmallow' })
    }
    frame.tin = this.tinPop
    frame.tinAt = this.picnic > 0.6 ? 'ring' : frame.raccoons.some((raccoon) => raccoon.has === 'tin') ? 'taken' : 'home'
    const dryFrom = this.night.kettle ? this.night.kettle.firstShort : null
    frame.kettleDry = dryFrom !== null && this.hour > dryFrom
    frame.trail = camp.trail.map((cell) => trailPoint(board, cell))

    // What is in the hand, the sled, the mule's tower, the fold, and the shows.
    const held = this.hold
    // A piece that has slid off the sled is seen sliding there first, and in the air only once it sets off for its pile.
    frame.carried = this.carried && !(this.carried.unseen && this.carried.back && this.carried.back.age < 0) ? { thing: this.carried.thing, x: this.carried.at.x, y: this.carried.at.y } : held && held.kind === 'card' && this.cards[held.user] ? { thing: 'card', x: this.cards[held.user]!.at.x, y: this.cards[held.user]!.at.y } : held && held.kind === 'lantern' ? { thing: 'lantern', x: this.lamps[held.index].at.x, y: this.lamps[held.index].at.y } : null
    frame.sled = board.sled ? { load: SUPPLY_LANES.filter((supply) => camp[supply] > 0).map((supply) => ({ supply, places: camp[supply] * PLACES[supply] })), refuse: this.sledRefuse, strapped: site.given !== null } : null
    frame.tower = Math.round(this.towerShown)
    frame.towerOf = towerLoad(site, plan, this.night)
    frame.fold.pull = this.pull; frame.fold.packing = this.packing
    frame.effects = this.effects.map((effect) => ({ kind: effect.kind, x: effect.x, y: effect.y, t: clamp(effect.age / effect.lasts, 0, 1), who: effect.who, seed: effect.seed }))
    frame.showing = this.showing

    // The idle ladder: a glow on what a child would want next, then one move shown by a ghost hand. Never a plan.
    frame.glow = guidance ? guidance.glow : 0
    frame.halos = []; frame.hand = null
    if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) return
    const empty = SUPPLY_LANES.filter((supply) => board.rods.includes(supply) && camp[supply] === 0)
    let from: Point, to: Point, drag = true
    if (phase === 'morning' && camp.last !== 'short') {
      // A night that held: the fold waits to be pulled over.
      frame.halos.push({ x: board.corner.x, y: board.corner.y, r: 44 * u })
      from = board.corner; to = { x: board.corner.x - 150 * u, y: board.corner.y - 40 * u }
    } else if (phase === 'morning' || (phase === 'dusk' && empty.length > 0 && !site.given)) {
      // Something ran short, or a rod is still bare: a pile to pull from, a short way and no further.
      const short = USER_ROWS.find((user) => camp.pins[user] !== null && board.rods.includes(SUPPLY_OF[user]))
      const supply = phase === 'morning' && short ? SUPPLY_OF[short] : empty[0] ?? board.rods[0]
      for (const one of phase === 'morning' ? [supply] : empty) frame.halos.push({ x: board.pile, y: board.lanes[SUPPLY_LANES.indexOf(one)] - 12 * u, r: 40 * u })
      from = { x: board.pile, y: rowEnd(board, supply, 0).y }; to = rowEnd(board, supply, ROD_LENGTH[supply] / 5)
    } else if (site.given && phase === 'dusk' && camp.nights === 0 && this.hour === 0 && camp.fire === 0 && site.fire.length > 1) {
      // A given load: the dial is what there is to set.
      frame.halos.push({ x: board.fire.x, y: board.fire.y, r: 62 * u })
      from = { x: board.fire.x, y: board.fire.y - 50 * u }; to = from; drag = false
    } else {
      // A plan is laid: the cursor waits to be pushed along the ruler.
      const at = { x: hourX(board, this.hour), y: board.ruler.y - 14 * u }
      frame.halos.push({ x: at.x, y: at.y, r: 34 * u })
      from = at; to = { x: Math.min(hourX(board, this.night.hours), at.x + board.rodLen / 5), y: at.y }
    }
    if (guidance.demo !== null) {
      const pose = handPose(guidance.demo, drag, this.hand)
      frame.hand = { x: from.x + (to.x - from.x) * pose.travel, y: from.y + (to.y - from.y) * pose.travel, press: pose.press, opacity: pose.opacity }
    }
  }
}
