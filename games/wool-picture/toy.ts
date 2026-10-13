import type { Note } from './audio'
import { FLUFF, bareRasp, combPluck, combTeeth, liftUp, loopBack, loopTwang, mothBite, peel, pictureKnock, rasp, setDown, settleOnPeg, VEIL } from './calls'
import { LOVES } from './cast'
import { boxOf, cellFor, combFigure, figureAt, hopFrom, makeFolk, poke, refreshActs, restShown, tickFigure, wear, type Cell, type Figure } from './folk'
import type { Point } from './input'
import { BOWLS, CELL, COLS, COMB_HAND, FELT, FIGURE, LOOP, PEGS, PERCHES, ROWS, inBox, onFelt, perchOn, pictureBox, spotAt, toCells, type Spot } from './layout'
import { below, type Rng } from './rng'
import type { Scene } from './scene'
import { causeScene, endScene, hang, steady, turnFresh, type Show } from './scenes'
import { WAKE, brush, cloudPatter, clung, folkVoice, mothFlutter, muffled, pat, pegKnock, pluck, puff, roomPat, type Cue } from './voices'
import { openPegs, type Picture } from './wall'
import { canRain, dropsFall, weatherKeys, weatherOf, type Weather } from './weather'
import { CELLS, WHITE, YELLOW, heightOf, kindOf, lay, middle, seedOf, shapeFor, thin, tidy, topAt, veilOn, type Join, type Laid, type Shape, type Sheet } from './wool'

// The game's model, with no drawing in it. It has one clock, `t`, which only
// `advance` moves, in steps of a sixtieth of a second. Every motion the view
// draws and every sound the Mount plays is read from this clock: a sound with
// parts in time is queued here and released in the tick it falls due, and a
// landing is heard in the tick it lands.

export const TICK = 1 / 60
/** The three sizes of tuft: how far the wool reaches round the finger, in cells, and how many levels of wool it holds. */
export const SIZES = [{ reach: 2.5, holds: 380 }, { reach: 1.7, holds: 180 }, { reach: 1, holds: 75 }] as const
/** How far the comb reaches round the finger, in cells. */
export const COMB_REACH = 1.8
/** Levels of wool a second under the middle of a full tuft that waits in one place. */
export const RATE = 9
/** Levels of wool for each cell of path under the middle of a full tuft that moves slowly. */
export const PER_CELL = 0.9
/** The speed, in cells a second, at which a moving tuft leaves half of that: faster is wispier. */
export const WISPY_AT = 45
/** What a touch lays in the frame it lands, under the middle of the finger: a soft round tuft. */
export const LANDING = 2.2
/** How far that tuft reaches round the finger, in cells, for each size: a handful, a tuft, a wisp. */
export const LANDS = [2.7, 2.4, 1.5] as const
/** Slower than this, in cells a second, a finger rests: its wool lies every way and makes a round tuft. */
export const RESTING = 2
export const MOST_FLOATERS = 14
export const MOST_NAPS = 10
/** How long the moth takes from one perch to the next, and how long it circles a lit figure, in seconds. */
export const FLIGHT = 1.3
export const ORBIT = 3.2
/** How long a figure or the comb hangs where a carrying finger let it go, in seconds: a finger back on it in that time carries on (input.ts has the same number, in ms). */
export const HANG = 0.3
/** How long a finger that holds nothing in the air must lie still before it is resting, in seconds. */
export const RESTS_AFTER = 1
/** How long after the first shape of a visit wakes the comb wriggles on the table, and how long it wriggles, in seconds. */
export const WAG_AFTER = 0.6
export const WAG = 0.5
/** How near a peg the loop must be let go for the picture to hang there, in stage units: the reach a peg answers a touch on. Past the peg, along the way from the loop, counts too. */
export const HANG_REACH = 30

type Stroke = { comb: boolean; carried: boolean; shape: Shape | null; fresh: boolean; acc: Float32Array; x: number; y: number; tx: number; ty: number; way: number; speed: number; grain: number; salt: number; touched: Set<Shape>; lifted: number }
/** `kept` marks one that is a touch's answer or the motion of a sound (lint, the comb's fluff, a coat's tuft): the view draws it at every tier. */
export type Floater = { x: number; y: number; vx: number; vy: number; born: number; dye: number; spin: number; size: number; kept: boolean }
/** Wool the comb took off one cell, for the view to take out of that shape's picture. */
export type Combed = { shape: number; col: number; row: number; levels: number }
/** The comb on bare felt: dust low down, the nap standing up in the middle, stray fibres on end high up. */
export type Nap = { x: number; y: number; born: number; height: number }
/** What the finger holds, from its press to its one ending. */
export type Held =
  | { kind: 'stroke' }
  /** A tuft, or the comb, taken from the table: `carried` once the finger has gone on from there. */
  | { kind: 'tuft'; carried: boolean }
  | { kind: 'figure'; who: number; origin: Cell | null; lifted: boolean }
  | { kind: 'loop'; lifted: boolean }
  | { kind: 'press' }
/** The five ways a touch ends (input.ts). */
export type End = 'tap' | 'pressEnd' | 'dragLift' | 'dragEnd' | 'dragCancel'
export type More = { folk: readonly { at: Cell | null; coat: number | null }[]; wall: readonly Picture[]; finished: boolean }

const hash = (col: number, row: number, salt: number): number => {
  let h = (col * 374761393 + row * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Whether a loop let go here is at that peg, or past it along the way from the loop's corner. Where a picture
 * hangs on the peg (`hung`), a let-go on that picture counts too, but for the corner of it nearer the loop
 * than the peg's own reach: no let-go that is short of the peg hangs anything.
 */
export function atPeg(at: Point, peg: number, hung = false): boolean {
  const to = PEGS[peg], dx = to.x - LOOP.x, dy = to.y - LOOP.y, far = Math.hypot(dx, dy)
  if (Math.hypot(at.x - to.x, at.y - to.y) <= HANG_REACH) return true
  if (hung && inBox(at, pictureBox(peg)) && Math.hypot(at.x - LOOP.x, at.y - LOOP.y) >= far - HANG_REACH) return true
  const along = ((at.x - LOOP.x) * dx + (at.y - LOOP.y) * dy) / far, aside = Math.abs((at.x - LOOP.x) * dy - (at.y - LOOP.y) * dx) / far
  return along >= far && aside <= HANG_REACH
}

/** Which of eight ways strands lie for a finger going this way: a half turn in eight steps. */
export function wayOf(dx: number, dy: number): number {
  const angle = ((Math.atan2(dy, dx) % Math.PI) + Math.PI) % Math.PI
  return Math.round(angle / (Math.PI / 8)) % 8
}

export class Toy {
  /** The toy's own clock, in seconds. */
  t = 0
  amount = 1
  stroke: Stroke | null = null
  held: Held | null = null
  /** The finger: where it is, whether it is down, when it last moved, and when it landed. */
  finger = { x: BOWLS[0].x, y: BOWLS[0].y, down: false, movedAt: -10, since: -10 }
  /** What was laid, joined, combed off and laid afresh since the view last drew: the view drains all four. */
  laid: Laid[] = []
  joins: Join[] = []
  combed: Combed[] = []
  relaid: number[] = []
  folk: Figure[]
  wall: Picture[]
  finished: boolean
  weather: Weather
  keys: ReturnType<typeof weatherKeys>
  show: Show = steady()
  scene: Scene | null = null
  /** The sheet that is leaving for the wall, while the evening scene shows it swing up. */
  leaving: Sheet | null = null
  /** The moth: its perch (0 to 2 a corner of the frame, 3 to 5 the picture on that peg), where it is drawn, and its flight. */
  moth = { perch: 0, x: PERCHES[0].x, y: PERCHES[0].y, turn: 0, fromX: 0, fromY: 0, flying: null as number | null, via: null as Point | null, orbit: null as { who: number; since: number } | null, wish: null as number | null, biteAt: -10 }
  bowls = BOWLS.map(() => ({ dip: 0, vel: 0 }))
  comb = { dip: 0, vel: 0 }
  /** When the comb last wriggled on the table by itself: once in a visit, a moment after the first shape wakes. */
  combWag = -10
  private wagDue = -1
  private wagged = false
  rise: number[]
  floaters: Floater[] = []
  naps: Nap[] = []
  /** When each peg, or the picture on it, was last knocked, and when the loop was last let go short of a peg. */
  knocked = [-10, -10, -10]
  loopBackAt = -10
  /** The shape under the hand, how still it lies (0 to 1), and when each shape last clung or shook itself free. */
  heldId = 0
  calm = 0
  clungAt = new Map<number, number>()
  /** Something changed that a save should hold; and it is a scene's outcome, to be saved at once. */
  changed = false
  urgent = false
  private sounds: Note[] = []
  private sceneSounds: Note[] = []
  private due: { at: number; notes: Note[]; scene: boolean }[] = []
  private hush = false
  private owed = 0
  private strokes = 0
  private brushed: number[] = []
  /** The bowl a finger landed on while it was already the chosen one: a tap there draws up the next size. */
  private again: number | null = null
  /** The bowl last chosen: with the comb chosen, a touch on felt where no wool lies lays wool from it. A load that finds the comb chosen takes the green bowl. */
  lastBowl: number

  constructor(public sheet: Sheet, public hand: number, public size: number, private rng: Rng, more?: More) {
    this.folk = makeFolk(more ? more.folk : [0, 1, 2, 3].map(() => ({ at: null, coat: null })))
    this.wall = more ? more.wall.map((picture) => ({ ...picture })) : []
    this.finished = more ? more.finished : false
    this.lastBowl = hand < COMB_HAND ? hand : 0
    this.rise = BOWLS.map((_, dye) => (dye === hand && !this.finished ? 1 : 0))
    this.weather = weatherOf(sheet)
    this.keys = weatherKeys(this.weather, this.folk.map((figure) => figure.at))
    // As it was left: every figure is already doing what its place makes it do, and the moth is where a load finds it.
    refreshActs(this, false)
    for (let who = 0; who < this.folk.length; who++) tickFigure(this, who)
    if (this.finished && this.wall.length > 0) this.moth.perch = 3 + this.wall[this.wall.length - 1].peg
    const perch = this.perchPoint()
    this.moth.x = perch.x; this.moth.y = perch.y
  }

  /** A finger lands. A scene that is playing ends first; then the answer is made here, before any time passes. */
  press(at: Point): void {
    // Whatever still hangs from an earlier finger is let go where it hangs before this touch is answered.
    if (this.hanging) this.end('dragEnd')
    this.finger.x = at.x; this.finger.y = at.y; this.finger.down = true; this.finger.movedAt = this.t; this.finger.since = this.t
    this.brushed.length = 0
    this.again = null
    // What the scene still had to show when this touch ended it: the evening, and whether the frame was still on its way up.
    const evening = this.scene !== null && this.show.kind === 'evening', swinging = evening && this.show.swing < 1
    if (this.scene) this.cut()
    // The touch that ends the evening does nothing else, wherever it lands: it chooses no bowl and no comb, pokes
    // no figure, sends no moth off and turns no felt. Its answer is the frame landing on its peg, or a pat and
    // lint where it fell if the frame had landed. A later touch on the felt turns the fresh felt.
    if (evening) {
      this.held = { kind: 'press' }
      if (swinging) { this.knocked[this.show.peg] = this.t; this.play(settleOnPeg) }
      else { this.play(roomPat); for (let i = 0; i < 3; i++) this.loose(at.x, at.y, -1) }
      return
    }
    const spot = spotAt(at, this.mothAt())
    const who = spot.on === 'moth' ? -1 : figureAt(this, at)
    this.held = { kind: 'press' }
    if (spot.on === 'moth') this.fly()
    else if (who >= 0) {
      poke(this, who)
      const origin = this.folk[who].at
      this.held = { kind: 'figure', who, origin: origin ? { ...origin } : null, lifted: false }
    // The felt that waits with its back to the room is turned by a touch on the felt itself. The wood round it is
    // the room's, so a tap on the frame where the loop hung does not end the evening.
    } else if (this.finished && onFelt(at)) turnFresh(this)
    else if (spot.on === 'felt' && !this.finished) {
      // With the comb chosen, a touch that lands where no wool lies lays wool from the bowl last chosen, and the
      // comb is back in its place: a touch on the felt always lays wool, or combs the wool it lands on.
      if (this.hand === COMB_HAND && !this.woolUnder(at)) { this.hand = this.lastBowl; this.comb.vel = 9; this.changed = true }
      this.begin(at); this.held = { kind: 'stroke' }
    }
    else if (spot.on === 'loop' && !this.finished) { this.play(loopTwang); this.held = { kind: 'loop', lifted: false } }
    else this.room(spot, at)
  }

  /** A touch on something that keeps its place: a bowl, the comb, a peg or its picture, or the bare room. */
  private room(spot: Spot, at: Point): void {
    // In the evening no tuft stands, so a bowl or the comb only dips and sounds: nothing is chosen, no size is
    // drawn up, and nothing that is saved changes where it could not be seen to.
    if (spot.on === 'bowl' && this.finished) { this.bowls[spot.dye].vel = 9; this.play(pluck(spot.dye, this.size)) }
    else if (spot.on === 'comb' && this.finished) { this.comb.vel = 9; this.cue(combPluck) }
    else if (spot.on === 'bowl') { this.again = this.hand === spot.dye ? spot.dye : null; this.choose(spot.dye); this.held = { kind: 'tuft', carried: false } }
    else if (spot.on === 'comb') { if (this.hand !== COMB_HAND) this.changed = true; this.hand = COMB_HAND; this.comb.vel = 9; this.cue(combPluck); this.held = { kind: 'tuft', carried: false } }
    else if (spot.on === 'peg') { this.knocked[spot.peg] = this.t; this.play(this.wall.some((picture) => picture.peg === spot.peg) ? pictureKnock : pegKnock) }
    else { this.play(roomPat); for (let i = 0; i < 3; i++) this.loose(at.x, at.y, -1) }
  }

  move(at: Point): void {
    this.finger.x = at.x; this.finger.y = at.y; this.finger.movedAt = this.t
    const held = this.held
    if (!held) return
    // A finger back on what hung where it was let go: it carries on, and is heard taking it up.
    if (!this.finger.down) { this.finger.down = true; this.play(liftUp) }
    if (held.kind === 'stroke' && this.stroke) { const cell = toCells(at); this.stroke.tx = cell.x; this.stroke.ty = cell.y; this.brush(at) }
    else if (held.kind === 'tuft') {
      held.carried = true
      // A tuft, or the comb, carried from the table starts to work where it crosses onto the felt.
      if (onFelt(at) && figureAt(this, at) < 0) { this.begin(at, true); this.held = { kind: 'stroke' } }
      else this.brush(at)
    } else if (held.kind === 'figure' && !held.lifted) { held.lifted = true; this.folk[held.who].hop = null; this.play(liftUp); refreshActs(this, false) }
    else if (held.kind === 'loop') held.lifted = true
  }

  /** Wool, or the comb, drawn across a figure: a coat goes on, or comes off, or it tickles. Once a figure in one touch. */
  private brush(at: Point): void {
    const who = figureAt(this, at)
    if (who < 0 || this.brushed.includes(who)) return
    this.brushed.push(who)
    if (this.hand === COMB_HAND) combFigure(this, who)
    else wear(this, who, this.hand)
  }

  /**
   * The touch is over, in one of the five ways a touch ends. Whatever the finger held is let go here, so nothing
   * it held outlives it. A touch that was taken away (`pressEnd`, `dragCancel`) makes no move for the child: wool
   * already laid stays, a figure in the hand goes back where it came from, and the loop goes back to its corner.
   */
  end(kind: End): void {
    const held = this.held
    // A carrying finger that lifts has not let go yet: the figure or the comb hangs where it is, and a finger back
    // on it carries on (`move`). The drag's one ending comes after, as `dragEnd` or `dragCancel`.
    if (kind === 'dragLift' && this.carrying) { this.finger.down = false; return }
    // A tuft that left the bowl with the finger is gone from it: the next one grows up out of the heap.
    if (this.tuftInHand) this.rise[this.hand] = 0
    this.held = null
    this.finger.down = false
    // A tap on the bowl already chosen draws up the next size. A finger that went on from the bowl to the felt, or was
    // taken away, keeps the size it had.
    const again = this.again
    this.again = null
    if (kind === 'tap' && again !== null && this.hand === again) { this.size = (this.size + 1) % 3; this.bowls[again].vel = 9; this.play(pluck(again, this.size)); this.changed = true }
    if (!held) return
    if (held.kind === 'stroke' || held.kind === 'tuft') this.lift()
    else if (held.kind === 'figure' && held.lifted) {
      const figure = this.folk[held.who], was = figure.at
      if (kind === 'dragCancel') figure.at = held.origin
      else if (!this.finished && onFelt(this.finger)) { figure.at = cellFor(held.who, figure.x, figure.y); this.play(setDown(held.who)) }
      else figure.at = null
      // Set down by the child it stands at once; sent home or put back it hops there, and lands with a knock.
      if (kind === 'dragCancel' || !figure.at) hopFrom(this, held.who)
      if (kind !== 'dragCancel' && (was !== null || figure.at !== null)) this.changed = true
      this.settle(kind !== 'dragCancel')
    } else if (held.kind === 'loop') {
      // A picture is hung only when wool lies on the felt: with a bare sheet the loop swings back, and the frame stays.
      if (this.sheet.shapes.length === 0) { this.loopBackAt = this.t; if (kind === 'tap' || kind === 'dragEnd' || kind === 'dragLift') this.play(loopBack) }
      // Hanging ends the picture for good, so it takes a let-go at a peg: a tap, or a drag let go short of one,
      // lets the loop swing back to its corner, and nothing ends.
      else if (kind === 'tap') { this.loopBackAt = this.t; this.play(loopBack) }
      else if (kind === 'dragEnd' || kind === 'dragLift') {
        // The free peg nearest where it is let go, when the finger is at it or has gone past it.
        const peg = openPegs(this.wall).reduce((best, next) => (Math.hypot(PEGS[next].x - this.finger.x, PEGS[next].y - this.finger.y) < Math.hypot(PEGS[best].x - this.finger.x, PEGS[best].y - this.finger.y) ? next : best))
        if (atPeg(this.finger, peg, this.wall.some((picture) => picture.peg === peg))) hang(this, peg)
        else { this.loopBackAt = this.t; this.play(loopBack) }
      } else this.loopBackAt = this.t
    }
  }

  /** The finger is gone. What was laid stays and clings; what was combed is gone. Then the sheet is read again. */
  private lift(): void {
    const stroke = this.stroke
    if (!stroke) return
    this.stroke = null
    if (stroke.comb) {
      for (const shape of stroke.touched) { tidy(this.sheet, shape); this.relaid.push(shape.id) }
      if (stroke.lifted > 0) this.cue(FLUFF[heightOf(Math.max(0, Math.min(ROWS - 1, Math.floor(stroke.y))))], 0.05)
    } else if (stroke.shape) {
      this.clungAt.set(stroke.shape.id, this.t)
      this.play(clung(stroke.shape.dye))
      if (stroke.fresh && kindOf(stroke.shape) === 'fluff') this.cue(WAKE.fluff, 0.1)
    }
    this.settle(true)
  }

  /**
   * After a touch that changed the sheet or a figure's place: every shape is what its wool now makes it, the
   * weather is read again, every figure does what its place now makes it do, and a scene is caused where the
   * weather gained something. With `sound` each change is heard; a touch that was taken away is silent.
   */
  private settle(sound: boolean): void {
    let woke: Shape | null = null
    const veiled: Shape[] = []
    for (const shape of this.sheet.shapes) {
      shape.seed = seedOf(shape)
      const kind = kindOf(shape), veil = kind === 'fluff' ? -1 : veilOn(this.sheet, shape)
      if (kind !== shape.kind) { shape.kind = kind; if (kind !== 'fluff' && !woke) woke = shape }
      if (veil === shape.veil) continue
      shape.veil = veil
      veiled.push(shape)
    }
    this.weather = weatherOf(this.sheet)
    refreshActs(this, sound)
    const keys = weatherKeys(this.weather, this.folk.map((figure) => figure.at))
    if (sound && !this.scene) causeScene(this, this.keys, keys)
    this.keys = keys
    if (!sound) return
    // What changed is heard once the weather is read, since a cloud's sound has its patter only where its drops are drawn.
    for (const shape of veiled) {
      // A veil settles with its own sound; lifted, the thing shakes itself free and sounds as itself again. Under
      // a white veil the thing gives once and its own sound comes muffled and lower; lit, it gives and sounds as itself.
      const veil = shape.veil
      if (veil >= 0) {
        this.cue(VEIL[veil], 0.15)
        if (veil === WHITE || veil === YELLOW) { this.clungAt.set(shape.id, this.t + 0.15); this.cue(veil === WHITE ? muffled(this.wakeOf(shape)) : this.wakeOf(shape), 0.15) }
      } else { this.clungAt.set(shape.id, this.t); this.cue(peel); this.cue(this.wakeOf(shape), 0.35) }
    }
    if (woke) {
      // It has become something: it wakes with its own sound. Every figure looks at it, and the one that is drawn
      // to such a thing says so in its plain voice, as it looks. None hops, and none says what it thinks of it:
      // what a figure makes of a thing is what it does when it stands by it.
      const kind = woke.kind, at = middle(woke), where = { x: FELT.x + at.col * CELL, y: FELT.y + at.row * CELL }
      this.cue(this.wakeOf(woke), 0.1)
      for (const figure of this.folk) { figure.mood = 'look'; figure.moodSince = this.t; figure.lookAt = where }
      const fond = this.folk.findIndex((_, who) => LOVES[who].includes(kind))
      if (fond >= 0) this.cue(folkVoice(fond, 'look', 0), 0.1)
      // The first thing to wake in a visit: a moment later the comb wriggles on the table, once, so that it is found.
      if (!this.wagged) { this.wagged = true; if (this.hand !== COMB_HAND) this.wagDue = this.t + WAG_AFTER }
    }
  }

  /**
   * What a thing sounds like as it comes alive. A cloud's hollow swell is followed by the patter of drops only
   * when drops are drawn under it now: a cloud too thin to rain has none, and neither has one whose rain the
   * rain's own scene is about to bring on, since that scene sounds its first drops as they fall.
   */
  private wakeOf(shape: Shape): Cue {
    if (shape.kind !== 'cloud') return WAKE[shape.kind]
    const rain = this.weather.rains.find((one) => one.cloud === shape)
    const coming = this.scene !== null && this.show.kind === 'rain' && this.show.cloud === shape.id
    return rain && dropsFall(rain, CELL) && !coming ? [...WAKE.cloud, ...cloudPatter] : WAKE.cloud
  }

  /** The weather is read again while a finger works, where the wool under it has changed what the weather is. No scene is caused: nothing was gained. */
  private reweather(): void {
    this.weather = weatherOf(this.sheet)
    refreshActs(this, true)
    this.keys = weatherKeys(this.weather, this.folk.map((figure) => figure.at))
  }

  /** Whether wool lies where a comb that lands here would reach. */
  private woolUnder(at: Point): boolean {
    const cell = toCells(at)
    for (let row = Math.max(0, Math.floor(cell.y - COMB_REACH)); row <= Math.min(ROWS - 1, Math.ceil(cell.y + COMB_REACH)); row++) {
      for (let col = Math.max(0, Math.floor(cell.x - COMB_REACH)); col <= Math.min(COLS - 1, Math.ceil(cell.x + COMB_REACH)); col++) {
        if (Math.hypot(col + 0.5 - cell.x, row + 0.5 - cell.y) < COMB_REACH && topAt(this.sheet, col, row)) return true
      }
    }
    return false
  }

  /** Plays `seconds` of the toy, a sixtieth at a time. */
  advance(seconds: number): void {
    this.owed += seconds
    while (this.owed >= TICK - 1e-9) { this.owed -= TICK; this.tick() }
  }

  /** The notes that fell due since the last call, as one voice, or null. The Mount plays them. */
  takeSounds(): Note[] | null {
    if (this.sounds.length === 0) return null
    const notes = this.sounds
    this.sounds = []
    return notes
  }

  /** The same for the notes that belong to a scene: the Mount plays them where a touch can silence them. */
  takeSceneSounds(): Note[] | null {
    if (this.sceneSounds.length === 0) return null
    const notes = this.sceneSounds
    this.sceneSounds = []
    return notes
  }

  /** Whether a touch has ended a scene since the last call: the Mount then silences what the scene was sounding. */
  takeHush(): boolean {
    const hush = this.hush
    this.hush = false
    return hush
  }

  /** Whether any sound is still waiting for its moment, for a test. */
  get pending(): number {
    return this.due.length
  }

  /** Where the moth sits, or null while it flies. */
  mothAt(): Point | null {
    return this.moth.flying === null && !this.moth.orbit ? this.perchPoint() : null
  }

  private perchPoint(): Point {
    return this.moth.perch < 3 ? PERCHES[this.moth.perch] : perchOn(this.moth.perch - 3)
  }

  play(notes: readonly Note[], scene = false): void {
    for (const note of notes) (scene ? this.sceneSounds : this.sounds).push(note)
  }

  cue(cue: Cue, after = 0, scene = false): void {
    for (const part of cue) {
      if (after + part.after <= 0) this.play(part.notes, scene)
      else this.due.push({ at: this.t + after + part.after, notes: part.notes, scene })
    }
  }

  /** A touch ends the scene at once: every part lands at its end, and the scene is silent from this frame. */
  private cut(): void {
    this.scene?.finish()
    endScene(this)
    // What a figure was shown doing for the scene's sake is over without a sound: each is found at rest in what it does.
    restShown(this)
    this.due = this.due.filter((entry) => !entry.scene)
    this.sceneSounds = []
    this.hush = true
  }

  private begin(at: Point, carried = false): void {
    const cell = toCells(at), comb = this.hand === COMB_HAND
    const shape = comb ? null : shapeFor(this.sheet, this.hand, Math.floor(cell.x), Math.floor(cell.y), SIZES[this.size].reach, this.joins)
    this.stroke = { comb, carried, shape, fresh: shape !== null && shape.count === 0, acc: new Float32Array(CELLS), x: cell.x, y: cell.y, tx: cell.x, ty: cell.y, way: 0, speed: 0, grain: 0.085, salt: ++this.strokes, touched: new Set(), lifted: 0 }
    if (comb) {
      const before = this.stroke.lifted
      this.rake(this.stroke, 0, 0, LANDING)
      this.play(this.stroke.lifted > before ? rasp(heightOf(Math.floor(cell.y))) : bareRasp(heightOf(Math.floor(cell.y))))
      if (this.stroke.lifted === before) this.nap(at)
      return
    }
    this.amount = 1
    if (shape && this.heldId !== shape.id) { this.heldId = shape.id; this.calm = 0 }
    this.deposit(this.stroke, 0, 0, LANDING)
    this.play(puff(this.hand, this.size))
    this.loose(at.x, at.y, this.hand)
    this.changed = true
  }

  /** Lays wool round where the stroke stands: what `seconds` of waiting and `path` cells of going give, and `boost` at once. */
  private deposit(stroke: Stroke, seconds: number, path: number, boost: number): void {
    // What lands is round and has its own reach; what a finger then leaves behind it reaches as far as the tuft is big.
    const size = SIZES[this.size], reach = boost > 0 ? LANDS[this.size] : size.reach, shape = stroke.shape!
    // Wool comes off the tuft by the way gone and by the time spent: a slow finger leaves both, a fast one little of either.
    const give = (RATE * seconds + (PER_CELL * path) / (1 + (stroke.speed / WISPY_AT) ** 1.5)) * (0.12 + 0.88 * this.amount)
    const resting = stroke.speed < RESTING
    for (let row = Math.max(0, Math.floor(stroke.y - reach)); row <= Math.min(ROWS - 1, Math.ceil(stroke.y + reach)); row++) {
      for (let col = Math.max(0, Math.floor(stroke.x - reach)); col <= Math.min(COLS - 1, Math.ceil(stroke.x + reach)); col++) {
        const d = Math.hypot(col + 0.5 - stroke.x, row + 0.5 - stroke.y)
        if (d >= reach) continue
        // Thick under the finger and thinner toward the edge. A moving finger leaves a ragged edge; a landing is a
        // disc with a soft rim, the same on every side.
        const at = row * COLS + col, fall = 1 - (d / reach) ** 2
        stroke.acc[at] += give * fall * (0.7 + 0.6 * hash(col, row, stroke.salt)) + boost * (1 - (d / reach) ** 4) * (0.92 + 0.16 * hash(col, row, stroke.salt))
        if (stroke.acc[at] < 1) continue
        const want = Math.floor(stroke.acc[at])
        // Under a resting finger the strands lie every way, each cell a good turn from its neighbours, so a tap
        // is a soft round tuft and never a lozenge; under a moving finger they lie the way it goes.
        const way = resting ? (((col * 3 + row * 5 + stroke.salt) % 8) + 8) % 8 : stroke.way
        const got = lay(this.sheet, shape, col, row, way, want, this.laid, this.joins)
        stroke.acc[at] = got < want ? 0 : stroke.acc[at] - want
        if (got > 0) { this.amount = Math.max(0, this.amount - got / size.holds); this.changed = true }
      }
    }
  }

  /** Combs wool off round where the stroke stands: from the topmost shape on each cell, so a veil goes first. */
  private rake(stroke: Stroke, seconds: number, path: number, boost: number): void {
    const take = RATE * seconds + PER_CELL * path + boost
    for (let row = Math.max(0, Math.floor(stroke.y - COMB_REACH)); row <= Math.min(ROWS - 1, Math.ceil(stroke.y + COMB_REACH)); row++) {
      for (let col = Math.max(0, Math.floor(stroke.x - COMB_REACH)); col <= Math.min(COLS - 1, Math.ceil(stroke.x + COMB_REACH)); col++) {
        const d = Math.hypot(col + 0.5 - stroke.x, row + 0.5 - stroke.y)
        if (d >= COMB_REACH) continue
        const at = row * COLS + col
        stroke.acc[at] += take * (1 - (d / COMB_REACH) ** 2)
        if (stroke.acc[at] < 1) continue
        const top = topAt(this.sheet, col, row), want = Math.floor(stroke.acc[at])
        stroke.acc[at] -= want
        if (!top) continue
        const off = thin(this.sheet, top, col, row, want)
        if (off <= 0) continue
        this.combed.push({ shape: top.id, col, row, levels: off })
        stroke.touched.add(top)
        // The fluff that comes off: low it rolls away along the ground, in the middle it drifts, high it floats up and off.
        if ((stroke.lifted % 5) + off >= 5) this.fluff(FELT.x + (col + 0.5) * CELL, FELT.y + (row + 0.5) * CELL, top.dye, heightOf(row))
        stroke.lifted += off
        this.changed = true
      }
    }
  }

  private choose(dye: number): void {
    // The heap dips and springs and the bowl sounds when the finger lands, whether or not the bowl was chosen already.
    if (this.hand !== dye) { this.hand = dye; this.changed = true }
    this.lastBowl = dye
    this.bowls[dye].vel = 9
    this.play(pluck(dye, this.size))
  }

  /** The moth tumbles up, flutters a loop and lands on another corner. */
  private fly(): void {
    this.mothTo(this.moth.perch < 3 ? (this.moth.perch + 1) % 3 : 0, false)
  }

  /** The moth leaves for a perch from wherever it is now. */
  mothTo(perch: number, scene: boolean): void {
    const moth = this.moth
    moth.fromX = moth.x; moth.fromY = moth.y
    moth.perch = perch; moth.flying = 0; moth.orbit = null; moth.via = null
    this.cue(mothFlutter, 0, scene)
  }

  /** In the bow's scene the moth flies through the bow to another corner. */
  mothThroughBow(): void {
    const bow = this.weather.bows.find((entry) => entry.sun === this.show.sun && entry.cloud === this.show.cloud) ?? this.weather.bows[0]
    if (!bow || this.moth.flying !== null || this.moth.orbit) return
    this.mothTo(this.moth.perch < 3 ? (this.moth.perch + 1) % 3 : 0, true)
    this.moth.via = { x: FELT.x + ((bow.from + bow.to) / 2) * CELL, y: FELT.y + (bow.row - 6) * CELL }
  }

  /** A lit figure draws the moth off the frame: it circles the wearer and goes back. One in flight goes when it lands. */
  orbit(who: number): void {
    if (this.moth.flying !== null) { this.moth.wish = who; return }
    this.moth.wish = null
    this.moth.orbit = { who, since: this.t }
  }

  /** The finger carries a figure or the comb: something that hangs where it is let go. */
  get carrying(): boolean {
    const held = this.held
    if (!held) return false
    if (held.kind === 'figure') return held.lifted
    if (held.kind === 'stroke') return this.stroke !== null && this.stroke.comb
    return held.kind === 'tuft' && held.carried && this.hand === COMB_HAND
  }

  /** The tuft has left the bowl with the finger: carried from the bowl toward the felt, and on the felt while that same stroke lays it. */
  get tuftInHand(): boolean {
    const held = this.held
    if (!held || this.hand === COMB_HAND) return false
    return held.kind === 'tuft' ? held.carried : held.kind === 'stroke' && this.stroke !== null && this.stroke.carried
  }

  /** The comb has left the table with the finger: carried toward the felt, or at work on it. */
  get combInHand(): boolean {
    const held = this.held
    if (!held || this.hand !== COMB_HAND) return false
    return held.kind === 'tuft' ? held.carried : held.kind === 'stroke' && this.stroke !== null
  }

  /** What hangs where a carrying finger let it go, until a finger comes back or the drag is over. */
  get hanging(): boolean {
    return this.held !== null && !this.finger.down
  }

  /**
   * The finger that is down is resting: it landed where nothing is to hold; or it took a tuft or the comb from
   * the table and has been down a second without reaching the felt, whether it lies still or drifts, as a palm
   * on a bowl does; or it is on the felt, or holds a figure or the loop it has not lifted, and has lain still a
   * second, as a palm on the felt does (the wool it laid stays). A finger that lays wool or combs by moving, or
   * carries a figure or the loop, never rests. The next finger to land, or one that is down already and
   * waiting, takes over from a resting one (hands.ts).
   */
  get resting(): boolean {
    const held = this.held
    if (!held || !this.finger.down) return false
    if (held.kind === 'press') return true
    if (held.kind === 'tuft') return this.t - this.finger.since >= RESTS_AFTER
    if (held.kind !== 'stroke' && held.lifted) return false
    return this.t - this.finger.movedAt >= RESTS_AFTER
  }

  /** A loose fibre floats up from here. A dye of -1 is grey lint from the room. */
  loose(x: number, y: number, dye: number): void {
    this.float({ x, y, vx: (below(this.rng, 61) - 30) * 1.4, vy: -24 - below(this.rng, 30), born: this.t, dye, spin: (below(this.rng, 21) - 10) / 4, size: 0.5, kept: dye < 0 })
  }

  /** A whole tuft, as a coat combed off: it floats down. */
  tuft(x: number, y: number, dye: number): void {
    this.float({ x, y, vx: (below(this.rng, 41) - 20) * 0.8, vy: 34, born: this.t, dye, spin: (below(this.rng, 21) - 10) / 8, size: 1.5, kept: true })
    this.bite()
  }

  /** Fluff the comb took off, by the third of the sheet it came from. */
  private fluff(x: number, y: number, dye: number, height: number): void {
    const side = below(this.rng, 2) ? 1 : -1
    this.float({ x, y, vx: side * [70, 44, 12][height], vy: [16, 0, -56][height], born: this.t, dye, spin: side * [5, 1.2, 0.6][height], size: 0.7, kept: true })
    this.bite()
  }

  private float(floater: Floater): void {
    if (this.floaters.length >= MOST_FLOATERS) this.floaters.shift()
    this.floaters.push(floater)
  }

  /** Fluff has floated off, and the moth eats it where it sits: never the picture. */
  private bite(): void {
    if (this.t - this.moth.biteAt < 1.2 || this.mothAt() === null) return
    this.moth.biteAt = this.t + 0.6
    this.cue(mothBite, 0.6)
  }

  private nap(at: Point): void {
    if (this.naps.length >= MOST_NAPS) this.naps.shift()
    this.naps.push({ x: at.x, y: at.y, born: this.t, height: heightOf(Math.max(0, Math.min(ROWS - 1, Math.floor((at.y - FELT.y) / CELL)))) })
  }

  private tick(): void {
    this.t += TICK
    // A comb that hangs where it was let go does no work until a finger is back on it.
    const stroke = this.finger.down ? this.stroke : null
    if (stroke) {
      const dx = stroke.tx - stroke.x, dy = stroke.ty - stroke.y, far = Math.hypot(dx, dy), steps = Math.max(1, Math.ceil(far / 0.5))
      if (far > 0.05) stroke.way = wayOf(dx, dy)
      stroke.speed += (far / TICK - stroke.speed) * 0.3
      // Over a figure the wool goes onto the figure, and none is laid behind it.
      const over = figureAt(this, this.finger) >= 0, before = stroke.lifted
      for (let i = 0; i < steps; i++) {
        stroke.x += dx / steps; stroke.y += dy / steps
        if (stroke.comb) this.rake(stroke, TICK / steps, far / steps, 0)
        else if (!over) this.deposit(stroke, TICK / steps, far / steps, 0)
      }
      // A cloud the comb has just made too thin to rain stops raining in this tick, and not when the comb lifts.
      if (stroke.comb && this.weather.rains.some((rain) => !canRain(rain.cloud))) this.reweather()
      stroke.grain -= TICK
      if (stroke.grain <= 0) {
        const moving = stroke.speed > RESTING, row = Math.max(0, Math.min(ROWS - 1, Math.floor(stroke.y)))
        if (stroke.comb) {
          // The comb rasps on wool, by the third of the sheet it works in; on bare felt it only raises the nap.
          const onWool = stroke.lifted > before || topAt(this.sheet, Math.floor(stroke.x), row) !== undefined
          this.play(onWool ? rasp(heightOf(row)) : bareRasp(heightOf(row)))
          if (!onWool) this.nap(this.finger)
        } else {
          // A moving finger brushes, brighter the faster it goes; a waiting one pats the wool down.
          this.play(moving ? brush(Math.min(1, stroke.speed / 60), this.amount) : pat(this.amount))
          if (moving && this.amount > 0.05) this.loose(this.finger.x, this.finger.y, stroke.shape!.dye)
        }
        stroke.grain = moving ? 0.085 : 0.16
      }
    }
    // The shape under the hand lies still while wool goes into it, and moves again after.
    this.calm = Math.max(0, Math.min(1, this.calm + (stroke && !stroke.comb ? TICK / 0.12 : -TICK / 0.5)))
    for (let dye = 0; dye < this.bowls.length; dye++) {
      const bowl = this.bowls[dye]
      bowl.vel += (-300 * bowl.dip - 14 * bowl.vel) * TICK
      bowl.dip += bowl.vel * TICK
      // The tuft stands on the chosen bowl by day; in the evening it is down, and a fresh felt springs it up.
      const up = dye === this.hand && !this.finished ? (this.show.kind === 'fresh' ? this.show.spring : 1) : 0
      this.rise[dye] += (up - this.rise[dye]) * Math.min(1, TICK * 9)
    }
    this.comb.vel += (-300 * this.comb.dip - 14 * this.comb.vel) * TICK
    this.comb.dip += this.comb.vel * TICK
    // The comb's one wriggle, and the sound of its teeth, begin in the same tick. In the hand, or in the evening, it has none.
    if (this.wagDue >= 0 && this.t >= this.wagDue - 1e-9) {
      this.wagDue = -1
      if (this.hand !== COMB_HAND && !this.finished) { this.combWag = this.t; this.cue(combTeeth) }
    }
    if (this.scene) { this.scene.update(this.t); if (!this.scene.running) endScene(this) }
    for (let who = 0; who < this.folk.length; who++) tickFigure(this, who)
    this.flutter()
    for (const floater of this.floaters) { floater.x += floater.vx * TICK; floater.y += floater.vy * TICK; floater.vx *= 0.985; floater.vy *= 0.99 }
    while (this.floaters.length > 0 && this.t - this.floaters[0].born > 1.6) this.floaters.shift()
    while (this.naps.length > 0 && this.t - this.naps[0].born > 0.9) this.naps.shift()
    if (this.due.length > 0) this.due = this.due.filter((entry) => { if (entry.at > this.t + 1e-9) return true; this.play(entry.notes, entry.scene); return false })
  }

  /** One tick of the moth: where it is drawn, on its perch, on its way to the next, or circling a lit figure. */
  private flutter(): void {
    const moth = this.moth, perch = this.perchPoint()
    if (moth.orbit) {
      const age = this.t - moth.orbit.since, wearer = this.folk[moth.orbit.who], a = age * 4.2, r = FIGURE[moth.orbit.who].w * wearer.scale * 0.55 + 20
      moth.x = wearer.x + r * Math.cos(a); moth.y = wearer.y - FIGURE[moth.orbit.who].h * wearer.scale * 0.6 + r * 0.45 * Math.sin(a); moth.turn = 0.4 * Math.cos(a)
      if (age >= ORBIT) this.mothTo(moth.perch, false)
      return
    }
    if (moth.flying === null) { moth.x = perch.x; moth.y = perch.y; moth.turn = 0; return }
    moth.flying += TICK / FLIGHT
    if (moth.flying >= 1) {
      moth.flying = null; moth.via = null; moth.x = perch.x; moth.y = perch.y; moth.turn = 0
      // A figure that was lit while the moth was in the air: it goes to circle it now, if the coat is still on.
      const wish = moth.wish
      moth.wish = null
      if (wish !== null && this.folk[wish].coat === YELLOW) this.orbit(wish)
      return
    }
    const u = moth.flying, e = u * u * (3 - 2 * u)
    // A tumble up and a loop on the way; through the bow, by way of its middle.
    const midX = moth.via ? moth.via.x : (moth.fromX + perch.x) / 2, midY = moth.via ? moth.via.y : (moth.fromY + perch.y) / 2 - 84
    moth.x = (1 - e) * (1 - e) * moth.fromX + 2 * e * (1 - e) * midX + e * e * perch.x + Math.sin(u * Math.PI * 2) * 30
    moth.y = (1 - e) * (1 - e) * moth.fromY + 2 * e * (1 - e) * midY + e * e * perch.y + Math.sin(u * Math.PI * 4) * 12
    moth.turn = Math.sin(u * Math.PI * 4) * 0.5
  }

  /** The box each figure answers a touch on now, for a test. */
  boxes(): ReturnType<typeof boxOf>[] {
    return this.folk.map((_, who) => boxOf(this, who))
  }
}
