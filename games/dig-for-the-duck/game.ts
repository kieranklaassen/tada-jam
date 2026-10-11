import { BOOTS } from './art'
import type { Note } from './audio'
import {
  CELL, COLS, HOT, HOT_WET, PANE, ROWS, SAND_COLOURS, SEED, STEAM, WATER, cellAt, encode, decode, isAir, isLoose, isMoss, isSand, kindOf, stageOf, type Box, type GroundKind, type Kind, type Layout,
} from './cells'
import { FLOATS_FROM, Ground, RUB_RADIUS, type Dug, type Moved } from './ground'
import { VARIANTS, groundsOf, layHill, type Hill } from './hills'
import type { Point } from './input'
import { duckSunk, type Now } from './residents'
import { makeRng, type Rng } from './rng'
import { freshHill, type Save } from './save'
import { Scene } from './scene'
import { beginCycle, finishCycle } from './state'
import { ANSWERS, ANSWER_NAMES, OWNER, SCENE_NAMES, SHOWING, beatsOf, partsAt, type AnswerName, type Parts, type SceneName } from './timeline'
import * as voices from './voices'

// The game: the hill, the finger on it, the four residents, the scenes and the
// sounds all of it sets off. No canvas and no clock: the Mount passes touches
// in stage units and steps it by attended seconds.

export type Resident = 'duck' | 'mole' | 'worm' | 'badger'
export const RESIDENTS: readonly Resident[] = ['duck', 'mole', 'worm', 'badger']
/** Everything a tap is given to before the hill. */
const WHO: readonly (Resident | 'chain')[] = [...RESIDENTS, 'chain']

/** Where something stands, in stage units: the middle of its foot, and the box a tap on it lands in. */
export type Place = { x: number; y: number; left: number; top: number; right: number; bottom: number }

const edge = (box: Box): { left: number; top: number; right: number; bottom: number } => ({
  left: PANE.x + box.col0 * CELL, top: PANE.y + box.row0 * CELL, right: PANE.x + (box.col1 + 1) * CELL, bottom: PANE.y + (box.row1 + 1) * CELL,
})

/** How far the chain is pulled before it is taut, and how far it can be pulled, in stage units. */
export const TAUT = 34
export const PULL_MOST = 52

/** How far the plug comes up under a finger that only lands on its chain, in stage units. */
export const TUG = 5
/** How tall the duck is drawn, in stage units: it stops that far short of the chamber's roof. */
export const DUCK_TALL = 146
/** How far the duck sits in from the middle of its seat, away from the wall behind it, in stage units. */
export const DUCK_IN = 9
/** How far in from the end of her line the badger stands, in stage units. */
export const BADGER_IN = 62

/**
 * Where each resident is on a hill at rest, and the plug's chain: the middle of its foot, and the box its figure fills
 * as it stands or sits there. The view draws them here; a touch is tested against the figure as it is drawn now (`at` in the game).
 */
export function placesOf(hill: Hill): Record<Resident | 'chain', Place> {
  const { layout } = hill
  const bath = edge(layout.bath), mole = edge(layout.moleRoom), worm = edge(layout.wormRoom)
  const ground = PANE.y + layout.drying.row * CELL
  // The badger stands at the end of her line the wind comes from, and faces along it.
  const badgerX = layout.wind > 0 ? PANE.x + layout.drying.col0 * CELL + BADGER_IN : PANE.x + (layout.drying.col1 + 1) * CELL - BADGER_IN
  // The duck sits a little in from the wall behind it, so its tail never lies over the tin.
  const duckX = PANE.x + ((layout.seat.col0 + layout.seat.col1 + 1) / 2) * CELL + (layout.seat.col0 === layout.bath.col0 ? DUCK_IN : -DUCK_IN)
  const chainX = PANE.x + ((layout.chain.col0 + layout.chain.col1 + 1) / 2) * CELL
  return {
    duck: { x: duckX, y: bath.bottom, left: duckX - 62, top: bath.bottom - 138, right: duckX + 62, bottom: bath.bottom },
    mole: { x: mole.left + 108, y: mole.bottom, left: mole.left + 40, top: mole.bottom - 166, right: mole.left + 176, bottom: mole.bottom },
    worm: { x: worm.left + 108, y: worm.bottom, left: worm.left + 80, top: worm.bottom - 150, right: worm.left + 152, bottom: worm.bottom },
    badger: { x: badgerX, y: ground, left: badgerX - (layout.wind > 0 ? 52 : 62), top: ground - 142, right: badgerX + (layout.wind > 0 ? 62 : 52), bottom: ground },
    chain: { x: chainX, y: bath.bottom, left: chainX - 24, top: bath.top - 54, right: chainX + 24, bottom: bath.bottom },
  }
}

/** A grain, a blob, a drop or a tuft in the air: seen and gone, never saved. `kind` is a sand colour, or one of the kinds below. */
export type Crumb = { x: number; y: number; vx: number; vy: number; kind: number; life: number }
export const DROP = SAND_COLOURS
export const MUD = SAND_COLOURS + 1
export const CURL = SAND_COLOURS + 2
export const TUFT = SAND_COLOURS + 3
export const SPORE = SAND_COLOURS + 4
export const SOIL = SAND_COLOURS + 5
export const SPARK = SAND_COLOURS + 6
export const PUFF = SAND_COLOURS + 7
/** A drop of rain on its way from the cloud to where it lands: a streak. */
export const RAIN = SAND_COLOURS + 8
export const CRUMB_KINDS = SAND_COLOURS + 9
/** How hard each kind of crumb falls: mud slides, tufts and spores float, a puff of steam rises, rain falls at one steady speed. */
const WEIGHT = [1, 1, 1, 1, 1, 1, 0.15, 0.8, 0.12, -0.05, 1, 0.5, -0.25, 0.25]
/** How fast a streak of rain falls, in stage units a second. */
const RAIN_SPEED = 135

/** A ring where a fingertip met glass or water. */
export type Ripple = { x: number; y: number; age: number; wet: boolean }

/** A mark a touch or the water leaves for a moment: drawn while it lasts, never saved. An age below 0 has not begun. */
export type MarkKind = 'scratch' | 'light' | 'shine' | 'knock' | 'boing' | 'ring' | 'wobble' | 'patter' | 'bubbles' | 'twang' | 'rattle' | 'groan' | 'dust' | 'snap' | 'dent' | 'tin' | 'wood'
export type Mark = { kind: MarkKind; x: number; y: number; age: number; life: number; turn: number }

/** The five things that can happen to a ground, as the design sheet's grid has them. */
export type Action = 'dry' | 'wet' | 'tap' | 'water' | 'under'
export const ACTIONS: readonly Action[] = ['dry', 'wet', 'tap', 'water', 'under']

/** One hill as it is played and drawn: its cells, where everyone is, and what the residents are up to. */
export class Side {
  readonly hill: Hill
  readonly ground: Ground
  readonly places: Record<Resident | 'chain', Place>
  mole: Save['mole']
  worm: Save['worm']
  badger: Save['badger']
  /** The duck is off the floor of the bath, and the bath is boiled, and muddy. */
  afloat: boolean
  boiled = false
  muddy = false
  /** How far the duck is off the floor, in stage units, eased toward what it sits or floats on. */
  lift: number
  /** How high the water lets the mole's chair ride, in stage units, eased. */
  rise = 0
  /** How far the chair has drifted from where the water came in, in stage units: gone on load. */
  drift = 0
  /** Which boots the water covers, in the order it reached them. */
  bootOrder: number[] = [0, 1, 2, 3, 4, 5]
  /** The pieces on the line in the order the rain reached them. */
  sagOrder: number[] = [0, 1, 2, 3]
  /** A boot that steam has shrunk: gone on load. */
  shrunken = false
  /** How far the chain is pulled up, in stage units. */
  pull = 0

  constructor(save: Pick<Save, 'hill' | 'variant' | 'cells' | 'mole' | 'worm' | 'badger'>) {
    this.hill = layHill(save.hill, save.variant)
    this.ground = new Ground(this.hill.layout, decode(save.cells) ?? this.hill.cells)
    this.places = placesOf(this.hill)
    this.mole = save.mole
    this.worm = save.worm
    this.badger = save.badger
    this.afloat = this.ground.bathState().floats
    this.lift = this.liftFor()
    this.rise = this.riseFor()
    this.settle()
  }

  /** What the bath holds, read again: a hot stone in it, loose sand in its water. */
  settle(): void {
    const { bath } = this.ground.layout
    this.boiled = this.ground.count(bath, HOT) + this.ground.count(bath, HOT_WET) > 0
    let loose = 0
    for (let row = bath.row0; row <= bath.row1; row++) for (let col = bath.col0; col <= bath.col1; col++) if (isLoose(this.ground.cells[row * COLS + col])) loose++
    this.looseInBath = loose
    this.muddy = loose >= MUDDY_FROM
  }

  looseInBath = 0

  /** How high the duck is: on whatever lies under its seat, or on the water once it floats. */
  liftFor(): number {
    const { bath, seat } = this.ground.layout
    const state = this.ground.bathState(), deep = (bath.row1 - bath.row0 + 1) * CELL
    const sitting = this.ground.stack(seat.col0 + 5, seat.col1 - 5) * CELL
    const floating = state.floats ? (state.fill - FLOATS_FROM) * deep + 10 : 0
    return Math.max(sitting, floating)
  }

  /** How high the chair rides: the water over its seat, as far as the roof lets it. */
  riseFor(): number {
    if (this.mole !== 'afloat') return 0
    return Math.max(4, Math.min(MOST_RISE, this.ground.level(this.ground.layout.moleRoom) * CELL - SEAT_HIGH + 8))
  }
}

/** The seat of the armchair above the floor, in stage units and in cells of water, and how far the chair can rise under its roof. */
export const SEAT_HIGH = 42
export const SEAT_ROWS = 7
export const MOST_RISE = 16
/** The column of each piece on the badger's line, counted from the end of the drying ground she stands at. */
export const PIECE_COLS = [27, 34, 43, 52]
/** The column of a piece on a hill's line. */
export const pieceCol = (layout: Layout, piece: number): number => (layout.wind > 0 ? layout.drying.col0 + PIECE_COLS[piece] : layout.drying.col1 - PIECE_COLS[piece])
/** The cells the pieces hang in, from the rope down to the longest piece's end: water in them is rain or a spout on the washing, not a puddle under it. */
export function washingBox(layout: Layout): Box {
  const { drying, wind } = layout
  const near = wind > 0 ? drying.col0 + 22 : drying.col1 - 60
  return { col0: near, row0: drying.row - 19, col1: near + 38, row1: drying.row - 5 }
}
/** What a first showing puts into the hill, and the part of its scene that is seen doing it: the cells change when that part has played `at` of its length. */
type Due = { scene: SceneName; part: string; at: number; pour: (ground: Ground) => void }

const TICK = 1 / 60
/** How many cells of loose sand in the bath make it a muddy one: more than a tidy tunnel drops into it. */
export const MUDDY_FROM = 40
/** The most marks drawn at once: the oldest goes when another comes. */
export const MOST_MARKS = 4
const RIPPLE_SECONDS = 0.45
const never = (): Record<AnswerName, number> => Object.fromEntries(ANSWER_NAMES.map((name) => [name, Infinity])) as Record<AnswerName, number>
const ZERO = Object.fromEntries(SCENE_NAMES.map((name) => [name, partsAt(name, 0)])) as Record<SceneName, Parts>
const ONE = Object.fromEntries(SCENE_NAMES.map((name) => [name, partsAt(name, 1)])) as Record<SceneName, Parts>

export class Game {
  /** The hill that is played and saved, and the one that is leaving while the plug's scene shows it. */
  on: Side
  leaving: Side | null = null
  /** Attended seconds since the game was set up. */
  time = 0
  /** Where the finger is on the hill, or null when none is down. */
  finger: Point | null = null
  /** How long ago each short answer of a resident started, in seconds. */
  readonly since = never()
  readonly crumbs: Crumb[] = []
  readonly ripples: Ripple[] = []
  readonly marks: Mark[] = []
  /** The most crumbs in the air at once; the quality tier sets it. */
  maxCrumbs = 140
  /** Water that moved in the last tick. */
  flowing = 0
  /** The cells of the grid that were answered since the last call of `answeredCells`, as "ground.action". */
  private readonly answered = new Set<string>()

  private save: Save
  private readonly chance: Rng
  private readonly parts = Object.fromEntries(SCENE_NAMES.map((name) => [name, partsAt(name, 0)])) as Record<SceneName, Parts>
  private readonly scenes: Record<SceneName, Scene>
  private last: Point | null = null
  /** What the finger is doing: nothing, on a resident, on the chain, or on the hill. */
  private hand: 'none' | 'poke' | 'chain' | 'hill' = 'none'
  private pullFrom = 0
  private groaned = false
  private owed = 0
  private queue: Note[] = []
  /** Notes of a playing scene's voices that are not yet due, each with the moment it is. */
  private later: { at: number; note: Note }[] = []
  /** 0: nothing to save. 1: something the child did, saved at the throttle. 2: an outcome that is saved at once. */
  private dirty = 0
  /** The hill's own rules moved something since the last call of `moving`: stored when the game comes to rest, never asked for by itself. */
  private unsettled = false
  /** The duck was sunk to the beak in a boiled bath when last looked at: the sigh sounds as that begins. */
  private sunkWas = false
  private trickle = 0
  private sliding = 0
  /** When each throttled sound last played, by name, in attended seconds. */
  private readonly lastAt: Record<string, number> = {}
  private ticks = 0
  private hintAt: Hint | null = null
  private hintAge = 9
  private steamWas = { mole: 0, worm: 0, badger: 0 }
  private looseWas = { bath: 0, worm: 0 }
  /** The water of a showing that is playing and has not reached the beat that pours it. */
  private due: Due | null = null

  /** Sets the game up as it was left: nothing eases in, nothing sounds and no scene plays. */
  constructor(save: Save, seed: number) {
    this.save = save
    this.on = new Side(save)
    this.chance = makeRng(seed)
    // A scene's voice is handed over a note at a time, each when it is due, so a touch that ends the scene leaves none to ring on.
    const sound = (note: string): void => { for (const part of voices.NAMED[note]) { if (part.delay) this.later.push({ at: this.time + part.delay, note: { ...part, delay: 0 } }); else this.queue.push(part) } }
    this.scenes = Object.fromEntries(SCENE_NAMES.map((name) => [name, new Scene(beatsOf(name, this.parts[name], sound))])) as Record<SceneName, Scene>
    this.looseWas.bath = this.on.looseInBath
    this.looseWas.worm = this.looseIn(this.on.ground.layout.wormRoom)
    this.steamWas = this.steamNow()
    this.sunkWas = this.on.boiled && this.on.afloat
  }

  /** The hill's id and layout, and the child's place in the order, as saved. */
  get hillId(): string { return this.save.hill }
  get variant(): number { return this.save.variant }
  get position(): string { return this.save.position }
  get finished(): boolean { return this.save.finished }
  get shown(): readonly GroundKind[] { return this.save.shown }
  running(name: SceneName): boolean { return this.scenes[name].running }
  get anyScene(): boolean { return SCENE_NAMES.some((name) => this.scenes[name].running) }

  /** What the residents of a hill pose from: a running scene's parts as they play, and every other scene at the rest its saved state gives it. */
  now(side: Side): Now {
    const scenes = {} as Record<SceneName, Parts>
    for (const name of SCENE_NAMES) {
      if (this.scenes[name].running) { scenes[name] = this.parts[name]; continue }
      const done = name === 'moleAfloat' ? side.mole === 'afloat' || this.scenes.moleDown.running : name === 'wormBoots' ? side.worm === 'squelching' : name === 'badgerRain' ? side.badger === 'rained' : false
      scenes[name] = done ? ONE[name] : ZERO[name]
    }
    return { time: this.time, since: this.since, scenes }
  }

  /** How far a part of a running scene has played, or 0 when the scene is not running. */
  part(scene: SceneName, part: string): number {
    return this.scenes[scene].running ? this.parts[scene][part] ?? 0 : 0
  }

  // --- The finger -----------------------------------------------------------

  /**
   * Whether a point is on a resident, or on the chain, as it is drawn now: the duck lifted by what it sits or floats
   * on, the mole risen and adrift with his chair, the worm in its own boot, looking out of another or lying along them all.
   */
  private at(side: Side, who: Resident | 'chain', at: Point): boolean {
    const place = side.places[who]
    let { left, top, right, bottom } = place
    if (who === 'duck') {
      const { bath, chamber } = side.ground.layout
      const up = Math.max(0, Math.min((bath.row1 + 1 - chamber.row0) * CELL - DUCK_TALL, side.lift))
      // In a boiled bath it lies sunk to the beak, and is touched where it lies.
      const down = up - duckSunk(side.afloat, side.boiled, this.since.duckSigh)
      top -= down; bottom -= down
    } else if (who === 'mole') {
      top -= side.rise
      if (side.mole === 'afloat') { left += Math.min(0, side.drift); right += Math.max(0, side.drift) }
    } else if (who === 'worm') {
      // The row of boots is the worm's: it lives in one, looks out of another when it is tapped, and lies along the tops of all six once they are wet.
      const room = place.x - 108, lying = side.worm === 'squelching'
      const high = lying ? 112 : this.since.wormPop < ANSWERS.wormPop.lasts ? 104 : 70
      if (at.x >= room + BOOTS[0].x - 16 && at.x <= room + BOOTS[BOOTS.length - 1].x + 28 && at.y <= bottom && at.y >= bottom - high) return true
      if (lying) return false
    }
    return at.x >= left && at.x <= right && at.y >= top && at.y <= bottom
  }

  /** The finger lands. A scene that is playing ends first, and what was still to sound of it is dropped; then the touch is an ordinary one. */
  press(at: Point): void {
    this.later.length = 0
    for (const name of SCENE_NAMES) this.scenes[name].finish()
    this.endPlug()
    this.pourDue()
    if (at.x < PANE.x || at.x >= PANE.x + PANE.width || at.y < PANE.y || at.y >= PANE.y + PANE.height) {
      // The oak frame: it knocks as wood, and a few chips jump off it and fall. A rub that goes on from there onto the glass digs as any rub does.
      this.hand = 'hill'
      this.finger = at
      this.last = at
      this.play(voices.wood)
      this.mark('wood', at.x, at.y, 0.3)
      return
    }
    this.show()
    const side = this.on
    this.hand = 'poke'
    if (this.at(side, 'duck', at)) { this.cue('duckSqueak'); this.play(voices.squeak(side.afloat)); return }
    if (this.at(side, 'mole', at)) { this.cue('moleHide'); return }
    if (this.at(side, 'worm', at)) { this.cue('wormPop'); return }
    if (this.at(side, 'badger', at)) { this.cue('badgerSnap'); return }
    if (this.at(side, 'chain', at)) {
      // The chain ticks taut and the plug comes up a little under the finger, at once.
      this.hand = 'chain'
      side.pull = TUG
      this.pullFrom = at.y + TUG
      this.play(voices.chain)
      return
    }
    this.hand = 'hill'
    this.finger = at
    this.last = at
    this.tap(at)
  }

  /** The finger rubs on to another place. */
  rubTo(at: Point): void {
    if (this.hand === 'chain') { this.pullTo(at); return }
    if (this.hand !== 'hill') return
    // A touch that lands just after a rub lifted carries the rub on, except on a resident or the chain: there it is a tap of its own, and no tunnel is dug toward it.
    if (this.finger === null && this.last !== null && WHO.some((who) => this.at(this.on, who, at))) { this.release(); this.press(at); return }
    const from = this.last ?? at
    this.finger = at
    this.last = at
    const a = cellAt(from.x, from.y), b = cellAt(at.x, at.y)
    const speed = Math.min(1, Math.hypot(at.x - from.x, at.y - from.y) / 40)
    const dug = this.on.ground.rub(a.col, a.row, b.col, b.row, speed > 0.7)
    this.rubbed(at, from, dug, speed)
  }

  /** The finger is off the glass for a moment: nobody watches it, and the tunnel can still be carried on. */
  lifted(): void {
    this.finger = null
  }

  /** The finger has rubbed on to where the game does not answer, the grown-up's corner: the tunnel ends where it left, and a rub that comes back starts another from where it comes back. */
  away(): void {
    this.finger = null
    this.last = null
  }

  /** The touch is over, however it ended. A chain let go drops the plug back. */
  release(): void {
    if (this.hand === 'chain' && this.on.pull > 0) { this.on.pull = 0; this.play(voices.plugDrop) }
    this.finger = null
    this.last = null
    this.hand = 'none'
    this.groaned = false
  }

  private pullTo(at: Point): void {
    const side = this.on
    side.pull = Math.max(0, Math.min(PULL_MOST, this.pullFrom - at.y))
    // Pulled taut on a finished hill, the plug brings the next hill. The finger is let go of first, so its next move is not the touch that ends the scene.
    if (side.pull >= TAUT && this.save.finished) {
      // Nothing drops back: the plug is out, and its own scene has the sound of that.
      this.finger = null
      this.last = null
      this.hand = 'none'
      this.nextHill()
    }
  }

  // --- A resident's short answer, and a cell of the grid --------------------

  /** Starts a short answer and its voice in one call, so the move and the sound begin together. */
  private cue(name: AnswerName): void {
    this.since[name] = 0
    const note = (ANSWERS[name] as { note?: string }).note
    if (note) this.play(voices.NAMED[note])
  }

  /** Whether a throttled sound may play again, and if so notes that it does. */
  private ready(name: string, every: number): boolean {
    if (this.time - (this.lastAt[name] ?? -9) < every) return false
    this.lastAt[name] = this.time
    return true
  }

  private did(kind: GroundKind, action: Action): void {
    this.answered.add(`${kind}.${action}`)
  }

  /** The cells of the grid answered since the last call, for the tests that walk the grid. */
  answeredCells(): string[] {
    const cells = [...this.answered]
    this.answered.clear()
    return cells
  }

  private mark(kind: MarkKind, x: number, y: number, life: number, turn = 0, delay = 0): void {
    if (this.marks.length >= MOST_MARKS) this.marks.shift()
    this.marks.push({ kind, x, y, age: -delay, life, turn })
  }

  private play(notes: readonly Note[]): void {
    for (const note of notes) this.queue.push(note)
  }

  /** Everything queued since the last call, as one list for one voice, or null when there is nothing. */
  sounds(): Note[] | null {
    if (this.queue.length === 0) return null
    const notes = this.queue
    this.queue = []
    return notes
  }

  /** Whether there is something to save since the last call: 0 not, 1 something the child did, 2 an outcome to save at once. */
  changed(): 0 | 1 | 2 {
    const dirty = this.dirty as 0 | 1 | 2
    this.dirty = 0
    return dirty
  }

  /**
   * Whether the hill's own rules moved anything since the last call: water on its way, sand on the slide, steam, rain.
   * That is no reason to save by itself, or a running stream would ask for a save on every tick and the store would
   * never find the quiet it waits for. It is stored with the child's next act, the next outcome, or when the game rests.
   */
  moving(): boolean {
    const moving = this.unsettled
    this.unsettled = false
    return moving
  }

  // --- What the finger does to the hill --------------------------------------

  /** The ground a fingertip lands on: the cell under it, or the nearest cell that holds something within two cells. */
  private under(col: number, row: number): { kind: Kind; col: number; row: number } {
    const ground = this.on.ground
    let best = { kind: kindOf(ground.at(Math.floor(col), Math.floor(row))), col: Math.floor(col), row: Math.floor(row) }, near = 9
    if (best.kind !== 'open') return best
    for (let r = Math.floor(row) - 2; r <= Math.floor(row) + 2; r++) {
      for (let c = Math.floor(col) - 2; c <= Math.floor(col) + 2; c++) {
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue
        const kind = kindOf(ground.cells[r * COLS + c]), far = Math.hypot(c + 0.5 - col, r + 0.5 - row)
        if (kind !== 'open' && far < near && far <= 2.4) { near = far; best = { kind, col: c, row: r } }
      }
    }
    return best
  }

  /** The finger lands on the hill: each ground answers a tap as itself, at once. */
  private tap(at: Point): void {
    const ground = this.on.ground
    const { col, row } = cellAt(at.x, at.y)
    const found = this.under(col, row)
    const spot = found.kind === 'open' || found.kind === 'sand' || found.kind === 'water' ? at : stageOf(found.col, found.row)
    switch (found.kind) {
      case 'sand': {
        const dug = ground.rub(col, row, col, row)
        const colour = most(dug)
        if (colour >= 0) { this.play(voices.bite(depthOf(at))); this.play(voices.patter(depthOf(at))); this.did('sand', 'tap') }
        if (dug.mud > 0) { this.play(voices.mud(2)); this.did('sand', 'wet') }
        this.scatter(at, dug, 1)
        this.afterDig(dug.mud + dug.loosened + dug.dry.reduce((sum, n) => sum + n, 0))
        break
      }
      case 'clay':
        // A thumbprint: a shallow dent of open cells, which stays.
        this.afterDig(ground.dent(found.col + 0.5, found.row + 0.5))
        this.play(voices.dull)
        this.mark('dent', spot.x, spot.y, 0.35)
        this.burst(spot, CURL, 3, 90)
        this.did('clay', 'tap')
        break
      case 'rock': {
        // It knocks like a door, and something inside the hill knocks back twice.
        const inside = { x: Math.min(PANE.x + PANE.width - 60, spot.x + 44), y: Math.min(PANE.y + PANE.height - 40, spot.y + 52) }
        this.mark('knock', spot.x, spot.y, 0.3)
        this.mark('knock', inside.x, inside.y, 0.2, 0, 0.42)
        this.mark('knock', inside.x, inside.y, 0.2, 0, 0.62)
        this.play(voices.knockBack)
        this.cue('knockBack')
        this.did('rock', 'tap')
        break
      }
      case 'moss':
        this.mark('boing', spot.x, spot.y, 0.5)
        this.burst(spot, SPORE, 7, 60)
        this.play(voices.boing)
        this.did('moss', 'tap')
        break
      case 'hot':
        this.mark('light', spot.x, spot.y, 0.5)
        this.burst({ x: spot.x, y: spot.y - 8 }, SPARK, 1, 260)
        this.play(voices.ting)
        this.did('hot', 'tap')
        break
      case 'earth': {
        const seed = this.seedNear(found.col, found.row)
        this.mark('rattle', seed.x, seed.y, 0.4)
        this.play(voices.maraca)
        this.did('earth', 'tap')
        break
      }
      case 'root':
        this.pluck(spot)
        break
      case 'tin':
        // The bath's rim rings, and a gleam shivers on it where it was touched.
        this.play(voices.tin)
        this.mark('tin', spot.x, spot.y, 0.34)
        break
      default:
        this.play(found.kind === 'water' ? voices.plip : voices.glass)
        if (this.ripples.length >= 2) this.ripples.shift()
        this.ripples.push({ x: at.x, y: at.y, age: 0, wet: found.kind === 'water' })
        if (found.kind === 'water') this.burst(at, DROP, 5, 190)
    }
  }

  /** The nearest seed to a cell of seed earth, in stage units, or the cell itself when the earth holds none near. */
  private seedNear(col: number, row: number): Point {
    const ground = this.on.ground
    let best = stageOf(col, row), near = 99
    for (let r = Math.max(0, row - 6); r <= Math.min(ROWS - 1, row + 6); r++) {
      for (let c = Math.max(0, col - 6); c <= Math.min(COLS - 1, col + 6); c++) {
        const far = Math.hypot(c - col, r - row)
        if (ground.cells[r * COLS + c] === SEED && far < near) { near = far; best = stageOf(c, r) }
      }
    }
    return best
  }

  /** A root plucked: it twangs and shakes off its drops. */
  private pluck(at: Point): void {
    this.play(voices.twang)
    this.mark('twang', at.x, at.y, 0.6)
    this.burst(at, DROP, 4, 120)
    this.did('earth', 'wet')
  }

  /** What a rub met: each ground under the finger answers in its own way, with its own sound and its own bits in the air. */
  private rubbed(at: Point, from: Point, dug: Dug, speed: number): void {
    const colour = most(dug)
    if (colour >= 0 || dug.mud > 0) this.scatter(at, dug, speed)
    if (colour >= 0) { if (this.ready('hiss', 0.07)) this.play(voices.hiss(depthOf(at), speed)); this.did('sand', 'dry') }
    // Wet sand comes away as mud, whatever dry sand comes with it.
    if (dug.mud > 0) { if (this.ready('mud', 0.17)) this.play(voices.mud(1 + Math.round(speed * 2))); this.did('sand', 'wet') }
    if (dug.tin && colour < 0 && this.ready('tin', 0.3)) { this.play(voices.tin); this.mark('tin', at.x, at.y, 0.34) }
    if (dug.clay > 0 && this.ready('creak', 0.22)) { this.play(voices.creak); this.burst(at, CURL, 3, 80); this.did('clay', 'dry') }
    if (dug.slick > 0 && this.ready('rubber', 0.25)) { this.play(voices.rubber); this.mark('shine', at.x, at.y, 0.5); this.did('clay', 'wet') }
    if (dug.shelf > 0 && !this.groaned) { this.groaned = true; this.play(voices.groan); this.mark('groan', at.x, at.y - RUB_RADIUS * CELL, 0.6); this.did('clay', 'under') }
    const turn = Math.atan2(at.y - from.y, at.x - from.x)
    if (dug.rock > 0) {
      if (this.ready('clack', 0.16)) {
        // One scratch in any one place: a new one takes the place of an older one it could lie across.
        for (let i = this.marks.length - 1; i >= 0; i--) if (this.marks[i].kind === 'scratch' && Math.hypot(this.marks[i].x - at.x, this.marks[i].y - at.y) < 30) this.marks.splice(i, 1)
        this.play(voices.clack); this.mark('scratch', at.x, at.y, 1.6, turn); this.did('rock', 'dry')
      }
      // The mole cannot bear it: his fingers stay in his ears for as long as the scraping goes on.
      if (this.since.moleEars > ANSWERS.moleEars.lasts * 0.5) this.cue('moleEars')
    }
    if (dug.rockWet > 0 && this.ready('plate', 0.3)) { this.play(voices.plate); this.mark('shine', at.x, at.y, 0.5); this.did('rock', 'wet') }
    if (dug.moss > 0 && this.ready('rip', 0.16)) { this.play(voices.rip); this.burst(at, TUFT, 4, 70); this.did('moss', 'dry') }
    if (dug.squeezed + dug.mossFull > 0 && this.ready('squelch', 0.25)) { this.play(voices.squelch); this.squirt(at); this.did('moss', 'wet') }
    if (dug.hot > 0 && this.ready('sizzle', 0.2)) { this.play(voices.sizzle); this.mark('light', at.x, at.y, 1.1); this.did('hot', 'dry') }
    if (dug.hotWet > 0 && this.ready('kettle', 0.22)) { this.play(voices.kettle(speed)); this.mark('ring', at.x, at.y - 10, 0.8); this.did('hot', 'wet') }
    if (dug.earth > 0 && this.ready('puff', 0.16)) { this.play(voices.puff); this.burst(at, SOIL, 4, 70); this.did('earth', 'dry') }
    if (dug.seeds > 0 && this.ready('tock', 0.12)) { this.play(voices.tock); this.did('earth', 'dry') }
    if (dug.snapped > 0) { if (this.ready('crack', 0.2)) { this.play(voices.crack); this.mark('snap', at.x, at.y, 0.3) } this.did('earth', 'wet') }
    else if (dug.roots > 0 && this.ready('twang', 0.35)) this.pluck(at)
    this.afterDig(dug.mud + dug.loosened + dug.clay + dug.slick + dug.moss + dug.squeezed + dug.earth + dug.snapped + dug.dry.reduce((sum, n) => sum + n, 0))
  }

  private afterDig(cells: number): void {
    if (cells > 0) this.dirty = Math.max(this.dirty, 1)
  }

  /** Grains jump out of what was dug, in its colours. */
  private scatter(at: Point, dug: Dug, speed: number): void {
    for (let colour = 0; colour < SAND_COLOURS; colour++) {
      for (let n = Math.min(5, Math.ceil(dug.dry[colour] / 5)); n > 0; n--) this.crumb(at, colour, 150 + 190 * speed)
    }
    // Mud comes away in fat blobs that slide down the tunnel's wall, one side and then the other, each a little after the last.
    for (let n = Math.min(4, Math.ceil(dug.mud / 6)); n > 0; n--) {
      if (this.crumbs.length >= this.maxCrumbs) return
      const side = n % 2 ? 1 : -1
      this.crumbs.push({ x: at.x + side * (RUB_RADIUS - 0.6) * CELL, y: at.y - 6 + 9 * n + 6 * this.chance.next(), vx: 0, vy: 10, kind: MUD, life: 0.55 + 0.12 * n })
    }
  }

  private burst(at: Point, kind: number, count: number, speed: number): void {
    for (let n = count; n > 0; n--) this.crumb(at, kind, speed)
  }

  /** Squeezed moss squirts its water out sideways. */
  private squirt(at: Point): void {
    for (const side of [-1, 1]) for (let n = 0; n < 3; n++) {
      if (this.crumbs.length >= this.maxCrumbs) return
      this.crumbs.push({ x: at.x + side * 10, y: at.y, vx: side * (160 + 120 * this.chance.next()), vy: -40 - 80 * this.chance.next(), kind: DROP, life: 0.4 + 0.2 * this.chance.next() })
    }
  }

  private crumb(at: Point, kind: number, speed: number): void {
    if (this.crumbs.length >= this.maxCrumbs) return
    const turn = this.chance.next() * Math.PI * 2, far = this.chance.next() * RUB_RADIUS * CELL
    const push = speed * (0.35 + 0.65 * this.chance.next())
    const floats = WEIGHT[kind] < 0.3
    this.crumbs.push({ x: at.x + Math.cos(turn) * far, y: at.y + Math.sin(turn) * far, vx: Math.cos(turn) * push, vy: Math.sin(turn) * push - (floats ? 30 : 120), kind, life: (floats ? 1.1 : 0.3) + 0.35 * this.chance.next() })
  }

  // --- The scenes ------------------------------------------------------------

  /**
   * Starts a scene. Its outcome goes into the state first and is saved at once, so a put-away at any moment of
   * the scene loses nothing and nothing replays on load. Another scene of the same owner ends first.
   */
  private start(name: SceneName, outcome: () => void): void {
    for (const other of SCENE_NAMES) if (OWNER[other] === OWNER[name]) this.scenes[other].finish()
    Object.assign(this.parts[name], ZERO[name])
    this.scenes[name].start(this.time, () => { outcome(); this.dirty = 2 })
  }

  /** The first touch on a hill that holds a ground not yet shown: the resident beside it does the new thing once. */
  private show(): void {
    const side = this.on, { spots } = side.ground.layout
    const kind = groundsOf(side.ground.layout).find((ground) => !this.save.shown.includes(ground))
    if (!kind) return
    const spot = spots[kind]!, scene = SHOWING[kind as keyof typeof SHOWING]
    this.start(scene, () => { this.save = { ...this.save, shown: [...this.save.shown, kind] } })
    // What the showing puts into the hill goes in on the beat that is seen doing it, and the hill's own rules carry it on.
    // The save holds it from the scene's first moment (`toSave`), so a showing that a put-away cuts off has still happened.
    if (kind === 'clay') this.due = { scene, part: 'tip', at: 0.3, pour: (ground) => { ground.pour(spot.col, spot.row, 7) } }
    else if (kind === 'moss') {
      this.due = { scene, part: 'sock', at: 0.4, pour: (ground) => {
        // A drop under each column of the moss in the roof, right against it, so all of it drinks and hangs down as one beard.
        const { cells } = ground
        for (let col = spot.col - 2; col <= spot.col + 1; col++) {
          let row = spot.row - 5
          while (row < spot.row && !isMoss(cells[row * COLS + col])) row++
          while (isMoss(cells[row * COLS + col])) row++
          ground.pour(col, row, 1)
        }
      } }
    }
    else if (kind === 'hot') this.due = { scene, part: 'toss', at: 1, pour: (ground) => { ground.pour(spot.col, spot.row, 5) } }
    else if (kind === 'earth') this.due = { scene, part: 'can', at: 0.5, pour: (ground) => { ground.pour(spot.col, spot.row - 1, 2) } }
  }

  /** Pours a showing's water once the part that is seen pouring it has come that far, or the scene has been ended. */
  private pourDue(): void {
    const due = this.due
    if (!due || (this.scenes[due.scene].running && this.parts[due.scene][due.part] < due.at)) return
    this.due = null
    due.pour(this.on.ground)
    this.dirty = Math.max(this.dirty, 1)
  }

  /** The duck floats: the hill is finished and the position moves one step up, at once. */
  private finish(): void {
    this.start('ending', () => { this.save = finishCycle(this.save, 'well') })
  }

  /** The plug is pulled on a finished hill: the next hill is laid out and saved at once, and the old one is only shown leaving. */
  private nextHill(): void {
    for (const name of SCENE_NAMES) this.scenes[name].finish()
    this.pourDue()
    const old = this.on
    old.pull = PULL_MOST
    this.start('plug', () => {
      this.save = { ...beginCycle(this.save), ...freshHill(this.save.position, (this.save.variant + 1) % VARIANTS) }
      this.on = new Side(this.save)
      this.leaving = old
    })
    this.steamWas = this.steamNow()
    this.sunkWas = false
    this.looseWas = { bath: this.on.looseInBath, worm: this.looseIn(this.on.ground.layout.wormRoom) }
    this.hintAge = 9
  }

  /** Once the plug's scene is over, by itself or by a touch, the old hill is gone. */
  private endPlug(): void {
    if (!this.scenes.plug.running) this.leaving = null
  }

  // --- Time ------------------------------------------------------------------

  /** Plays `seconds` of attended time: the hill in whole ticks, the scenes, and everything that eases beside them. */
  step(seconds: number): void {
    this.time += seconds
    this.owed = Math.min(this.owed + seconds, 4 * TICK)
    while (this.owed >= TICK) {
      this.owed -= TICK
      this.tick()
    }
    for (const name of SCENE_NAMES) this.scenes[name].update(this.time)
    if (this.later.length > 0) {
      for (const held of this.later) if (held.at <= this.time) this.queue.push(held.note)
      this.later = this.later.filter((held) => held.at > this.time)
    }
    this.endPlug()
    this.pourDue()
    for (const name of ANSWER_NAMES) if (this.since[name] < ANSWERS[name].lasts + 1) this.since[name] += seconds
    for (const side of this.leaving ? [this.on, this.leaving] : [this.on]) {
      side.lift += (side.liftFor() - side.lift) * Math.min(1, seconds * 7)
      side.rise += (side.riseFor() - side.rise) * Math.min(1, seconds * 3)
    }
    this.hintAge += seconds
    this.voice()
    for (let i = this.crumbs.length - 1; i >= 0; i--) {
      const crumb = this.crumbs[i]
      crumb.life -= seconds
      if (crumb.life <= 0) { this.crumbs.splice(i, 1); continue }
      crumb.vy += 1100 * WEIGHT[crumb.kind] * seconds
      if (WEIGHT[crumb.kind] < 0.3) { crumb.vx *= 1 - Math.min(1, 3 * seconds); crumb.vy *= 1 - Math.min(1, 2 * seconds) }
      crumb.x += crumb.vx * seconds
      crumb.y += crumb.vy * seconds
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].age += seconds
      if (this.ripples[i].age >= RIPPLE_SECONDS) this.ripples.splice(i, 1)
    }
    for (let i = this.marks.length - 1; i >= 0; i--) {
      this.marks[i].age += seconds
      if (this.marks[i].age >= this.marks[i].life) this.marks.splice(i, 1)
    }
  }

  private tick(): void {
    this.ticks++
    const side = this.on
    const moved = side.ground.step()
    this.heard(moved)
    // The plug held up before the duck floats: whatever is in the bath runs out for as long as it is held.
    if (this.hand === 'chain' && side.pull >= TAUT && !this.save.finished && side.ground.drain(4) > 0) {
      this.dirty = Math.max(this.dirty, 1)
      if (this.ready('gurgling', 0.22)) this.play(voices.gurgling(this.ticks))
    }
    // The hill that is leaving empties its bath down the plughole while it is still shown.
    if (this.leaving) { this.leaving.ground.step(); this.leaving.ground.drain(5); this.leaving.afloat = this.leaving.ground.bathState().floats }
    this.causes()
  }

  /** What the hill's own rules did in a tick, cell of the grid by cell of the grid: each has its sound and its mark. */
  private heard(moved: Moved): void {
    const at = (index: number): Point => stageOf(index % COLS, (index / COLS) | 0)
    this.flowing = moved.water
    this.trickle += moved.water
    this.sliding += moved.grains
    if (moved.water + moved.grains + moved.wetted + moved.earthFell + moved.seedsLanded + moved.drunk + moved.steamed + moved.rained + moved.sprouted + moved.dripped > 0 || moved.thud) this.unsettled = true
    if (moved.wetted > 0) { if (this.ready('fizz', 0.7)) this.play(voices.fizz); this.did('sand', 'water') }
    if (moved.intoBath > 3 && this.ready('splash', 0.5)) this.play(voices.splash)
    if (moved.onClay > 0 && this.ready('glug', 0.45)) { this.play(voices.glug); const spot = at(moved.clayAt); this.mark('wobble', spot.x, spot.y, 0.5); this.did('clay', 'water') }
    if (moved.onRock > 0 && this.ready('roof', 0.16)) { this.play(voices.roof(this.ticks)); const spot = at(moved.rockAt); this.mark('patter', spot.x, spot.y, 0.25); this.did('rock', 'water') }
    if (moved.drunk > 0) { if (this.ready('slurp', 0.2)) this.play(voices.slurp); this.did('moss', 'water') }
    if (moved.steamed > 0) { if (this.ready('steam', 0.3)) { this.play(voices.steam); const spot = at(moved.steamAt); this.burst(spot, PUFF, 3, 40) } this.did('hot', 'water') }
    if (moved.boiling > 0 && this.ready('blub', 0.4)) { this.play(voices.blub(this.ticks)); const spot = at(moved.boilAt); this.mark('bubbles', spot.x, spot.y, 0.5) }
    if (moved.rained > 0) {
      // Rain: a streak is seen falling from the cloud to where it lands, and the washing it falls through is rained on.
      if (this.ready('rain', 0.22)) this.play(voices.rain(this.ticks))
      const from = at(moved.rainAt), far = Math.max(CELL, at(moved.rainTo).y - from.y)
      if (this.crumbs.length < this.maxCrumbs) this.crumbs.push({ x: from.x + 16 * (this.chance.next() - 0.5), y: from.y + 8, vx: 0, vy: RAIN_SPEED, kind: RAIN, life: far / RAIN_SPEED })
      const line = washingBox(this.on.ground.layout), col = moved.rainAt % COLS
      if (col >= line.col0 && col <= line.col1 && ((moved.rainTo / COLS) | 0) >= line.row0) this.wash(col)
    }
    if (moved.sprouted > 0) { this.play(voices.sprout); const spot = at(moved.sproutAt); this.mark('twang', spot.x, spot.y, 0.5); this.did('earth', 'water') }
    if (moved.seedsLanded > 0) { if (this.ready('ticks', 0.1)) this.play(voices.ticks(moved.seedsLanded)); this.did('earth', 'under') }
    if (moved.earthFell > 0) { if (this.ready('tumble', 0.4)) this.play(voices.tumble); this.did('earth', 'under') }
    if (moved.dripped > 0) { this.play(voices.drip); const spot = at(moved.dripAt); this.burst({ x: spot.x, y: spot.y + CELL }, DROP, 1, 10); this.did('moss', 'under') }
    if (moved.thud) {
      // A stone lands: it thuds or clonks, dust jumps, every resident hops and the mole's book jumps out of his hands.
      const spot = stageOf(moved.thud.col, moved.thud.row)
      this.play(moved.thud.hot ? voices.clonk : voices.thud(moved.thud.cells))
      this.mark('dust', spot.x, spot.y, 0.5)
      this.cue('hop')
      this.cue('moleJump')
      this.did(moved.thud.hot ? 'hot' : 'rock', 'under')
    }
  }

  /** The sounds that follow how much is moving: more plinks for more water, a hush for sand on the slide. */
  private voice(): void {
    if (this.ready('trickle', 0.11)) {
      if (this.trickle > 3) this.play(voices.plinks(1 + Math.floor(this.trickle / 45), this.ticks * 7 + this.trickle))
      this.trickle = 0
    }
    if (this.ready('hush', 0.16)) {
      if (this.sliding > 8) { this.play(voices.hush(this.sliding / 120)); this.did('sand', 'under') }
      this.sliding = 0
    }
  }

  private looseIn(box: Box): number {
    const cells = this.on.ground.cells
    let loose = 0
    for (let row = box.row0; row <= box.row1; row++) for (let col = box.col0; col <= box.col1; col++) if (isLoose(cells[row * COLS + col])) loose++
    return loose
  }

  /** How much steam is in the mole's room, in the worm's room and on the hillside by the badger. */
  private steamNow(): { mole: number; worm: number; badger: number } {
    const ground = this.on.ground, { moleRoom, wormRoom, drying } = ground.layout
    if (ground.has(STEAM) === 0) return { mole: 0, worm: 0, badger: 0 }
    const badger: Box = ground.layout.wind > 0 ? { col0: Math.max(0, drying.col0 - 10), row0: 0, col1: drying.col0 + 30, row1: drying.row - 1 } : { col0: drying.col1 - 30, row0: 0, col1: Math.min(COLS - 1, drying.col1 + 10), row1: drying.row - 1 }
    return { mole: ground.count(moleRoom, STEAM), worm: ground.count(wormRoom, STEAM), badger: ground.count(badger, STEAM) }
  }

  /** What the water, the sand and the steam cause: the duck floats, the mole floats and is set down, the boots fill, the washing is rained on. */
  private causes(): void {
    const side = this.on, ground = side.ground, { layout } = ground
    const bath = ground.bathState()
    if (!side.afloat && bath.floats) {
      side.afloat = true
      if (!this.save.finished) this.finish()
      else if (this.ready('afloat', 1.5)) { this.play(voices.afloat); this.since.duckSqueak = 0 }
    } else if (side.afloat && !bath.floats) side.afloat = false
    if (side.badger === 'dry' && ground.water > 0) {
      // A spout of water on its way down through the pieces.
      const line = washingBox(layout)
      let drops = 0, cols = 0
      for (let row = line.row0; row <= line.row1; row++) for (let col = line.col0; col <= line.col1; col++) if (ground.cells[row * COLS + col] === WATER) { drops++; cols += col }
      if (drops > 0) this.wash(cols / drops)
    }
    if (this.ticks % 6 !== 0) return
    side.settle()
    // The sigh sounds as the duck sinks to the beak: when it first floats in a bath with a hot stone in it, or a stone lands in the bath it floats in.
    const sunk = side.boiled && side.afloat
    if (sunk && !this.sunkWas) this.cue('duckSigh')
    this.sunkWas = sunk
    if (side.looseInBath > this.looseWas.bath && this.ready('sneeze', 1.5)) this.cue('duckSneeze')
    this.looseWas.bath = side.looseInBath
    const looseWorm = this.looseIn(layout.wormRoom)
    if (looseWorm > this.looseWas.worm && this.ready('tipOut', 3)) this.cue('wormTip')
    this.looseWas.worm = looseWorm
    const steam = this.steamNow()
    if (steam.mole > 0 && this.steamWas.mole === 0) this.cue('moleWipe')
    if (steam.worm > 0 && this.steamWas.worm === 0) { side.shrunken = true; this.cue('wormShrink') }
    if (steam.badger > 0 && this.steamWas.badger === 0) this.cue('badgerPress')
    this.steamWas = steam

    const { moleRoom, wormRoom } = layout
    const level = ground.level(moleRoom)
    if (side.mole === 'home' && level >= SEAT_ROWS) {
      // The chair drifts away from the side the water came in.
      const mid = (moleRoom.col0 + moleRoom.col1) >> 1
      const left = ground.count({ ...moleRoom, col1: mid }, WATER), right = ground.count({ ...moleRoom, col0: mid + 1 }, WATER)
      side.drift = left >= right ? 10 : -10
      this.start('moleAfloat', () => { side.mole = 'afloat'; this.save = { ...this.save, mole: 'afloat' } })
    } else if (side.mole === 'afloat' && level < SEAT_ROWS - 2 && !this.scenes.moleAfloat.running) {
      this.start('moleDown', () => { side.mole = 'home'; this.save = { ...this.save, mole: 'home' } })
    }
    if (side.worm === 'dry') {
      const floor: Box = { ...wormRoom, row0: wormRoom.row1 - 1 }
      if (ground.count(floor, WATER) >= 4) {
        // The boots fill in the order the water reaches them: from the side it came in.
        const mid = (wormRoom.col0 + wormRoom.col1) >> 1
        const left = ground.count({ ...floor, col1: mid }, WATER), right = ground.count({ ...floor, col0: mid + 1 }, WATER)
        side.bootOrder = left >= right ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0]
        this.start('wormBoots', () => { side.worm = 'squelching'; this.save = { ...this.save, worm: 'squelching' } })
      }
    }
  }

  /** Rain, or a spout of water, has fallen on the washing at a column: the pieces sag one by one, the one nearest to it first. */
  private wash(col: number): void {
    const side = this.on, { layout } = side.ground
    if (side.badger !== 'dry') return
    side.sagOrder = [0, 1, 2, 3].sort((a, b) => Math.abs(pieceCol(layout, a) - col) - Math.abs(pieceCol(layout, b) - col))
    this.start('badgerRain', () => { side.badger = 'rained'; this.save = { ...this.save, badger: 'rained' } })
  }

  // --- The idle ladder -------------------------------------------------------

  /**
   * Where an idle child might touch next. On a finished hill it is the chain. Before that it is the sand
   * under or beside the lowest water that stands outside the bath: a place to rub, never the way to the bath.
   */
  hint(): Hint | null {
    if (this.hintAge < 0.5) return this.hintAt
    this.hintAge = 0
    this.hintAt = null
    const side = this.on, ground = side.ground, cells = ground.cells, { bath } = ground.layout
    if (this.save.finished) {
      const chain = side.places.chain
      this.hintAt = { ring: { x: chain.x, y: chain.top + 14 }, from: { x: chain.x, y: chain.top + 14 }, to: { x: chain.x, y: chain.top + 14 - TAUT - 10 } }
      return this.hintAt
    }
    for (let row = ROWS - 2; row >= 0; row--) {
      let run = 0
      for (let col = 0; col <= COLS; col++) {
        const standing = col < COLS && cells[row * COLS + col] === WATER && !isAir(cells[(row + 1) * COLS + col]) && cells[(row + 1) * COLS + col] !== WATER && !(col >= bath.col0 - 1 && col <= bath.col1 + 1 && row >= bath.row0 - 1)
        if (standing) { run++; continue }
        if (run >= 1) {
          const mid = col - 1 - (run >> 1), first = col - run
          let ring: Point | null = null
          if (isSand(cells[(row + 1) * COLS + mid])) ring = stageOf(mid, row + 1 + RUB_RADIUS)
          else if (first > 0 && isSand(cells[row * COLS + first - 1])) ring = stageOf(first - 1 - RUB_RADIUS, row)
          else if (col < COLS && isSand(cells[row * COLS + col])) ring = stageOf(col + RUB_RADIUS, row)
          if (ring) {
            const pool = stageOf(mid, row)
            this.hintAt = { ring, from: { x: pool.x, y: pool.y - 30 }, to: ring }
            return this.hintAt
          }
        }
        run = 0
      }
    }
    return null
  }

  /** The state to store: the hill as it stands, with whatever is in the air left out. A showing's water that is still on its way is stored as poured. */
  toSave(): Save {
    if (!this.due) return { ...this.save, cells: encode(this.on.ground.cells) }
    const poured = new Ground(this.on.ground.layout, this.on.ground.cells)
    this.due.pour(poured)
    return { ...this.save, cells: encode(poured.cells) }
  }
}

/** Where an idle child might touch next: a place to rub, or the chain to pull. The ring lies at `ring` and the hand moves from `from` to `to`. */
export type Hint = { ring: Point; from: Point; to: Point }

/** How deep a place on the hill lies, as a step of the sand's scale: one step for each band's depth, from the top of the hill down. */
const depthOf = (at: Point): number => Math.floor((at.y - PANE.y) / CELL / 8) - 3

/** The colour most of the dry sand a rub took away was, or -1 when it took none. */
export function most(dug: Dug): number {
  let colour = -1, count = 0
  for (let i = 0; i < SAND_COLOURS; i++) if (dug.dry[i] > count) { count = dug.dry[i]; colour = i }
  return colour
}

