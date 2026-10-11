import { asSaved } from './build'
import { MOUTH, OPEN, STONE, at, clone, isLump, put, type Ground, type Kind, type Lump } from './ground'
import { HABITS, type InvaderKind, type Shot } from './habits'
import { LUMP_OF, RELOAD, SHOT_OF, arrivalPlace, canStand, cellsOf, machineAt, shotFlight, restPlace } from './machines'
import { after, judge, owed, partyAt, type MachineKind, type Party, type Verdict } from './order'
import { TICK, bodyOf, callRaid, endOf, hit, knockInRaid, landInRaid, stepRaid, type Raid, type RaidEvent } from './raid'
import { lean } from './walls'
import { WEDGED, queenSeat } from './residents'
import type { Game, Machine } from './save'
import { Toy } from './toy'

// The game round the toy: the bell that calls a raid, the raid itself, the machines, the put-back, the position in
// the designed order and the first showings. Pure, on game time alone. Building is the toy's (toy.ts); this decides
// which touch is the toy's, and plays everything else.
//
// While a raid runs the nest is not built on: the finger fires the machines and nothing else changes. A raid is a
// view of the nest as it stood when the bell was rung: it runs on a copy, it is never saved, and a put-away in the
// middle of one leaves the invaders at their camp and the nest as built.

export type Scene =
  /** The bell rang with no chamber in the kingdom: the party looks down the mouth, shrugs and goes back. */
  | { is: 'shrug'; t: number; length: number }
  /** A kind is caught out by its own habit at the front of the camp, once. */
  | { is: 'showing'; kind: string; t: number; length: number }
  /** The workers lower a machine down the mouth. */
  | { is: 'arrives'; machine: MachineKind; t: number; length: number }
  /** The workers carry back what the raid knocked down. `cells` are the cells that differ, nearest the mouth first. */
  | { is: 'putBack'; cells: number[]; ground: Ground; held: number[]; t: number; length: number }
  /**
   * The largest chamber of the kingdom has changed, the first time included: workers carry the queen, complaining,
   * from where she was to her new room by the way that is open, and she tries each end of its floor before she
   * sits. `way` is the cells she is carried through, the first of them where she was.
   */
  | { is: 'moves'; way: number[]; t: number; length: number }
  /**
   * The great raid was turned back: the dung fly is handed a leaf, the workers light a glow-worm in every chamber,
   * the queen puts her egg down and dusk comes over the camp. It plays once, and holds on its last beat until a touch.
   */
  | { is: 'ending'; t: number; length: number }

export const SCENE_SECONDS = { shrug: 5, showing: 5, arrives: 7, moves: 6, putBackLeast: 4, putBackMost: 10, ending: 20 } as const

export type Flying = {
  shot: Shot
  path: number[]
  t: number
  length: number
  inRaid: boolean
  machine: number
  /** Which way it flies along the row, and whether it flies level (the cannon) or is lobbed (the catapult). */
  facing: -1 | 1
  level: boolean
  /** The invaders it has gone by, who stepped aside for it. */
  passed: number[]
  /** The cell that stops its flight, the first it cannot pass: what the shot hits. -1 where it flies as far as it carries and nothing stops it. */
  hit: number
}
/**
 * A way through open cells from one cell to another, both ends included; where no open way joins them, the two
 * ends alone. The same every time.
 */
export function openWayBetween(ground: Ground, from: number, to: number): number[] {
  const { cols, rows, cells } = ground
  const came = new Int32Array(cells.length).fill(-1)
  const queue = [from]
  came[from] = from
  for (let head = 0; head < queue.length && came[to] < 0; head++) {
    const i = queue[head], x = i % cols, y = Math.floor(i / cols)
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const n = ny * cols + nx
      if (came[n] < 0 && cells[n] === OPEN) {
        came[n] = i
        queue.push(n)
      }
    }
  }
  if (came[to] < 0) return [from, to]
  const way = [to]
  while (way[way.length - 1] !== from) way.push(came[way[way.length - 1]])
  return way.reverse()
}

/** Whether this kind steps aside for this shot and lets it go by: the fliers, for a stone. */
const stepsAside = (kind: InvaderKind, shot: Shot): boolean => HABITS[kind].shots[shot].id.startsWith('steps-aside')
/** How far through the scene in which a machine arrives it fires its one shot to show that it works. */
export const TRIED_AT = 0.75

/** How fast a shot flies, in cells a second, and the least time it is in the air. */
export const SHOT_SPEED = 26
export const SHOT_LEAST = 0.22

export type KingdomEvent =
  | { type: 'bell' }
  | { type: 'called'; party: Party }
  | { type: 'judged'; verdict: Verdict }
  | { type: 'scene'; is: Scene['is']; who?: string }
  | { type: 'fired'; machine: MachineKind; shot: Shot }
  | { type: 'fizzled'; machine: MachineKind }
  | { type: 'shotLanded'; shot: Shot; cell: number }
  /** A shot met the ground: the kind of cell that stopped it, and which cell. */
  | { type: 'shotHit'; kind: Kind; cell: number }
  /** A machine that has just arrived fires once, empty, to show that it works. */
  | { type: 'tried'; machine: MachineKind }
  | { type: 'loaded'; machine: MachineKind; shot: Shot }
  | { type: 'turned'; machine: MachineKind }
  | { type: 'machineSet'; machine: MachineKind }
  | { type: 'machineBack'; machine: MachineKind }
  | { type: 'machineFell'; machine: MachineKind }

/** The cells of no room at all: the queen is wedged under the mouth. */
const NO_ROOM: number[] = []

export class Kingdom {
  readonly toy: Toy
  raid: Raid | null = null
  scene: Scene | null = null
  /** The cells where a wall gave in the last raid. Short-lived: cleared when the next raid is called, gone on load. */
  marks: number[] = []
  flying: Flying[] = []
  /** For each machine, the seconds left in a raid until its own lump is in its cup again. */
  reloading: number[] = []
  /** The machine under the finger, where it stood, and whether the finger has left its cells. */
  grabbed: { index: number; moved: boolean; facing: -1 | 1 } | null = null
  /** Where the finger is, in cell units, while it holds a machine. */
  holding: { x: number; y: number } | null = null
  /** The raid whose put-back is playing, for the view: where its invaders stood when it ended. */
  lastRaid: Raid | null = null

  private events: KingdomEvent[] = []
  private raidEvents: RaidEvent[] = []
  private sinceTick = 0
  private unsaved = false
  private saveNow = false
  /** First showings owed from before this visit start at the child's first touch. */
  private owedAtTouch: boolean
  /**
   * The great raid has just been turned back in this visit: the ending plays when its put-back is over. Never
   * saved: a game put away before then is found with the kingdom open and plays nothing.
   */
  private endingOwed = false

  /** The great raid has just been turned back and its ending has not begun: nothing of the ending is seen yet. */
  get awaitsEnding(): boolean {
    return this.endingOwed
  }

  /** The cells of the room the queen lives in, as it was when she was last seen to: empty while she is wedged under the mouth. */
  private queenLives: number[]
  /** Where she sat in that room, and how large: null while she is wedged under the mouth. */
  private queenSat: ReturnType<typeof queenSeat> = null

  constructor(readonly game: Game) {
    this.toy = new Toy(game)
    this.reloading = game.machines.map(() => 0)
    this.owedAtTouch = this.owed().length > 0
    // No scene plays on load: she is found where she lives.
    this.queenLives = NO_ROOM
    this.settleQueen()
    // A machine that was saved with its floor dug away comes down to the floor it finds.
    if (this.toy.atRest) this.restMachines()
  }

  private queenRoomCells(): number[] {
    const realm = this.toy.realm
    return realm.queenRoom === null ? NO_ROOM : realm.chambers[realm.queenRoom].cells
  }

  /** She lives where the ground says, from now: no move is owed. */
  private settleQueen(): void {
    const realm = this.toy.realm
    this.queenLives = this.queenRoomCells()
    this.queenSat = queenSeat(this.game.ground, realm.chambers, realm.queenRoom)
  }

  /** Whether the room she lives in now is another one than the room she was last seen to in. */
  private get moveOwed(): boolean {
    const now = this.queenRoomCells(), before = this.queenLives
    if (now === before || now.length === 0) return false
    return !(before.length > 0 && now.some((cell) => before.includes(cell)))
  }

  /**
   * Where the queen is while her move is owed and cannot play yet, because another scene is playing: the seat she
   * had in her old room, or 'mouth' when she was wedged under it. Null when she is where she lives.
   */
  get queenStays(): NonNullable<ReturnType<typeof queenSeat>> | 'mouth' | null {
    if (this.scene?.is === 'moves' || !this.moveOwed) return null
    return this.queenSat ?? 'mouth'
  }

  /**
   * The queen's room is looked at once the ground is at rest and neither a raid nor a scene is playing. A room that
   * has only grown or shrunk is the same room; a room that shares no cell with the one she lived in is a new one,
   * and she is carried to it. While something else plays she waits where she was, and is carried when it is over.
   */
  private seeToTheQueen(): void {
    const before = this.queenLives
    if (!this.moveOwed) {
      this.settleQueen()
      return
    }
    if (this.scene || this.raid) return
    this.settleQueen()
    const ground = this.game.ground, cols = ground.cols, realm = this.toy.realm
    const seat = queenSeat(ground, realm.chambers, realm.queenRoom)
    if (!seat) return
    // Where she was: the floor of her old room, or wedged under the mouth.
    const from = before.length > 0 ? before[before.length - 1] : Math.floor(WEDGED.y) * cols + Math.floor(WEDGED.x)
    const to = seat.y * cols + Math.floor(seat.x)
    this.scene = { is: 'moves', way: openWayBetween(ground, from, to), t: 0, length: SCENE_SECONDS.moves }
    this.events.push({ type: 'scene', is: 'moves' })
  }

  get party(): Party {
    return partyAt(this.game.position, this.game.muster)
  }

  /** The ground that is seen: the raid's copy while a raid runs, and the nest as built otherwise. */
  get shown(): Ground {
    return this.raid ? this.raid.ground : this.game.ground
  }

  drainEvents(): KingdomEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  drainRaidEvents(): RaidEvent[] {
    const events = this.raidEvents
    this.raidEvents = []
    return events
  }

  /** Whether anything a save holds has changed, and whether it must be written at once and not at the throttle. */
  drainUnsaved(): { changed: boolean; now: boolean } {
    const out = { changed: this.unsaved || this.toy.drainUnsaved(), now: this.saveNow }
    this.unsaved = false
    this.saveNow = false
    return out
  }

  private owed(): string[] {
    return owed(this.game.position, this.game.muster, this.game.shown)
  }

  /** Starts the next first showing that is owed, if any: its mark is written as it starts, and a machine is in the nest from then. */
  private startOwed(): boolean {
    const next = this.owed()[0]
    if (next === undefined) return false
    this.game.shown.push(next)
    if (next === 'catapult' || next === 'cannon') {
      const place = arrivalPlace(this.game.ground, this.game.machines)
      if (place) {
        this.game.machines.push({ kind: next, x: place.x, y: place.y, facing: 1, load: null })
        this.reloading.push(0)
      }
      this.scene = { is: 'arrives', machine: next, t: 0, length: SCENE_SECONDS.arrives }
    } else this.scene = { is: 'showing', kind: next, t: 0, length: SCENE_SECONDS.showing }
    this.events.push({ type: 'scene', is: this.scene.is, who: next })
    this.unsaved = true
    this.saveNow = true
    return true
  }

  /** A touch ends the scene that is playing, with its outcome already in place, and is then an ordinary touch. */
  private endScene(): void {
    const scene = this.scene
    if (!scene) return
    this.scene = null
    if (scene.is === 'putBack') this.lastRaid = null
    this.afterScene(scene)
  }

  /** What follows a scene that is over: the ending, once, after the put-back of the great raid; otherwise a first showing that is owed. */
  private afterScene(scene: Scene): void {
    if (scene.is === 'putBack' && this.endingOwed) {
      this.endingOwed = false
      this.scene = { is: 'ending', t: 0, length: SCENE_SECONDS.ending }
      this.events.push({ type: 'scene', is: 'ending' })
      return
    }
    if (scene.is !== 'shrug') this.startOwed()
  }

  /** The bell is rung. With a chamber in the kingdom the party at the log comes in; with none it comes, shrugs and goes back. */
  bell(): void {
    this.events.push({ type: 'bell' })
    // A touch ends the scene that is playing, and is then an ordinary touch: the bell rings, unless what follows
    // that scene has begun. It is a first touch like any other: a showing that is owed starts at it, and the party
    // waits for the next ring.
    this.touch()
    // A move of the queen that waited for that scene plays first: the bell has rung, and the party waits for the next ring.
    if (!this.raid && !this.scene && this.toy.atRest) this.seeToTheQueen()
    if (this.raid || this.scene) return
    this.toy.cancel()
    this.dropMachine()
    // While the ground is still falling the party waits: it is called when the ground has come to rest, so that the
    // raid runs on the nest as it lies and no machine is left in the air.
    if (!this.toy.atRest) {
      this.rung = true
      return
    }
    this.callParty()
  }

  /** The bell was rung while the ground was still falling: the party comes when it has come to rest. */
  private rung = false
  /** The game was put away and has not been touched since: nothing starts by itself until the next touch. */
  private untouched = false

  /** The party at the log is called in, or comes for nothing where the kingdom has no chamber. */
  private callParty(): void {
    if (this.toy.realm.chambers.length === 0) {
      this.scene = { is: 'shrug', t: 0, length: SCENE_SECONDS.shrug }
      this.events.push({ type: 'scene', is: 'shrug' })
      return
    }
    this.marks = []
    this.landShots()
    this.reloading = this.game.machines.map(() => 0)
    // The raid runs on the nest as it lies, at rest: nothing is copied in the air.
    this.raid = callRaid(asSaved(this.game.ground), this.party, MOUTH, this.game.machines.flatMap((machine) => cellsOf(machine, this.game.ground.cols)))
    this.sinceTick = 0
    this.events.push({ type: 'called', party: this.party })
  }

  /** The game is put away, or loses the child's attention: a raid in progress is over without being judged, and nothing is in the hand. */
  putAway(): void {
    this.toy.cancel()
    this.dropMachine()
    this.raid = null
    this.landShots()
    this.marks = []
    this.lastRaid = null
    // A scene that was playing is over, with its outcome in place since it began. A showing that had not begun
    // yet is still owed, and begins at the child's first touch.
    this.scene = null
    this.endingOwed = false
    this.owedAtTouch = this.owed().length > 0
    // A machine that fired in the raid has its lump again: it is ready at the next touch.
    this.reloading = this.game.machines.map(() => 0)
    // A move of the queen that was still owed is not played after a put-away: she is found where she lives, as on load.
    this.settleQueen()
    // And nothing starts by itself on return: a bell that was waiting for the ground is forgotten, and a move the
    // ground still owes her when it comes to rest waits for the next touch.
    this.rung = false
    this.untouched = true
  }

  /**
   * The game as it is stored. A machine fired outside a raid has thrown its lump: from the instant it lets go the
   * lump is a cell of the ground where it lands and the machine is empty, so a save taken while the shot is still
   * seen in the air holds the lump where it will lie, never in neither place.
   */
  stored(): Game {
    const shots = this.flying.filter((shot) => !shot.inRaid)
    if (shots.length === 0) return this.game
    const ground = clone(this.game.ground), cols = ground.cols
    for (const shot of shots) {
      for (let n = shot.path.length - 1; n >= 0; n--) {
        const cell = shot.path[n], x = cell % cols, y = Math.floor(cell / cols)
        if (at(ground, x, y) !== OPEN || machineAt(this.game.machines, x, y) >= 0) continue
        put(ground, x, y, LUMP_OF[shot.shot])
        break
      }
    }
    return { ...this.game, ground }
  }

  /** A shot in the air over the nest lands at once, so that no lump is ever lost; a shot of a raid is gone with the raid. */
  private landShots(): void {
    const flying = this.flying
    this.flying = []
    for (const shot of flying) if (!shot.inRaid) this.arrive(shot)
  }

  private dropMachine(): void {
    if (!this.grabbed) return
    this.events.push({ type: 'machineBack', machine: this.game.machines[this.grabbed.index].kind })
    this.grabbed = null
    this.holding = null
  }

  private fire(index: number): void {
    const machine = this.game.machines[index]
    if (!machine.load || this.reloading[index] > 0) {
      // In a raid a machine with nothing in it yet answers the tap with a cough.
      if (this.raid) this.events.push({ type: 'fizzled', machine: machine.kind })
      return
    }
    const ground = this.shown
    const { path, hit } = shotFlight(ground, machine)
    if (path.length === 0) {
      this.events.push({ type: 'fizzled', machine: machine.kind })
      return
    }
    const shot = machine.load
    this.flying.push({ shot, path, t: 0, length: Math.max(SHOT_LEAST, path.length / SHOT_SPEED), inRaid: this.raid !== null, machine: index, facing: machine.facing, level: machine.kind === 'cannon', passed: [], hit })
    if (this.raid) this.reloading[index] = RELOAD
    else {
      // Outside a raid the lump has really left the machine. It lies where it lands when it has flown there.
      machine.load = null
      this.unsaved = true
    }
    this.events.push({ type: 'fired', machine: machine.kind, shot })
  }

  /** How far along a shot's way the first invader it can meet is, looking no further than `upTo`; -1 for nobody. */
  private firstMet(raid: Raid, path: readonly number[], upTo: number, shot: Shot): number {
    const body: number[] = []
    let first = -1
    for (const invader of raid.invaders) {
      if (invader.cell < 0 || invader.state === 'home' || invader.state === 'held' || invader.state === 'leaving' || invader.state === 'coming') continue
      if (stepsAside(invader.kind, shot)) continue
      for (const place of [invader.cell, invader.toward]) {
        const n = bodyOf(raid, invader, place, body)
        for (let i = 0; i < n; i++) {
          const k = path.indexOf(body[i])
          if (k >= 0 && k <= upTo && (first < 0 || k < first)) first = k
        }
      }
    }
    return first
  }

  /** Those who step aside for this shot and are in its way as far as it has flown: each is told once, and the shot goes by. */
  private goBy(raid: Raid, flying: Flying, upTo: number): void {
    const body: number[] = []
    for (const invader of raid.invaders) {
      if (invader.cell < 0 || !stepsAside(invader.kind, flying.shot) || flying.passed.includes(invader.id)) continue
      if (invader.state === 'home' || invader.state === 'held' || invader.state === 'leaving' || invader.state === 'coming') continue
      const n = bodyOf(raid, invader, invader.cell, body)
      for (let i = 0; i < n; i++) {
        const k = flying.path.indexOf(body[i])
        if (k >= 0 && k <= upTo) {
          flying.passed.push(invader.id)
          hit(raid, invader.id, flying.shot)
          break
        }
      }
    }
  }

  /**
   * A shot has come to lie against something: what stopped its flight answers, whichever way it was hit. Sand
   * bursts, mud takes the shot, a stone rings; and a stone that a level shot strikes rolls one cell on where it is
   * free. The lump that was shot never answers for itself.
   */
  private strike(flying: Flying): void {
    if (flying.hit < 0) return
    const ground = this.raid && flying.inRaid ? this.raid.ground : this.game.ground, cols = ground.cols
    const sx = flying.hit % cols, sy = Math.floor(flying.hit / cols)
    const kind = at(ground, sx, sy)
    if (kind === OPEN) return
    this.events.push({ type: 'shotHit', kind, cell: flying.hit })
    if (kind !== STONE || !flying.level) return
    if (this.raid && flying.inRaid) knockInRaid(this.raid, flying.hit, flying.facing)
    else {
      const did = lean(ground, sx, sy, flying.facing, 3)
      if (did.did === 'shoved') this.toy.touched(did.cells)
    }
  }

  /** A shot arrives. In a raid it bewilders whoever is in its way, or lies where it landed in the copy; in the nest it lies where it landed. */
  private arrive(flying: Flying): void {
    const lump: Lump = LUMP_OF[flying.shot]
    if (flying.inRaid) {
      const raid = this.raid
      if (!raid) return
      const body: number[] = []
      let first = -1, firstAt = Infinity
      const struck: number[] = []
      for (const invader of raid.invaders) {
        if (invader.cell < 0 || invader.state === 'home' || invader.state === 'held' || invader.state === 'leaving' || invader.state === 'coming') continue
        // One who steps aside for this shot was told as it went by.
        if (stepsAside(invader.kind, flying.shot)) continue
        let where = Infinity
        for (const place of [invader.cell, invader.toward]) {
          const n = bodyOf(raid, invader, place, body)
          for (let i = 0; i < n; i++) {
            const k = flying.path.indexOf(body[i])
            if (k >= 0 && k < where) where = k
          }
        }
        if (where === Infinity) continue
        struck.push(invader.id)
        if (where < firstAt) { firstAt = where; first = invader.id }
      }
      // A blast of sand is wide: it bewilders everyone in its way. A ball of mud and a stone meet the first.
      if (flying.shot === 'sand') for (const id of struck) hit(raid, id, 'sand')
      else if (first >= 0) hit(raid, first, flying.shot)
      const last = flying.path[flying.path.length - 1]
      if (struck.length === 0) landInRaid(raid, last, lump)
      this.events.push({ type: 'shotLanded', shot: flying.shot, cell: struck.length > 0 ? flying.path[Math.min(firstAt, flying.path.length - 1)] : last })
      if (struck.length === 0) this.strike(flying)
      return
    }
    // In the nest: the last cell of its way that is still open, in case the ground changed under it as it flew.
    const ground = this.game.ground, cols = ground.cols
    for (let n = flying.path.length - 1; n >= 0; n--) {
      const cell = flying.path[n]
      if (at(ground, cell % cols, Math.floor(cell / cols)) !== OPEN || machineAt(this.game.machines, cell % cols, Math.floor(cell / cols)) >= 0) continue
      put(ground, cell % cols, Math.floor(cell / cols), lump)
      this.toy.touched([cell])
      this.events.push({ type: 'shotLanded', shot: flying.shot, cell })
      this.strike(flying)
      return
    }
    // Nowhere left for it to lie: it is back in the cup.
    const machine = this.game.machines[flying.machine]
    if (machine && !machine.load) machine.load = flying.shot
  }

  /** A touch anywhere, on the ground or on the surface: it ends the scene that is playing, and the first one of a visit starts a showing that is owed. */
  touch(): void {
    const wasOwed = this.owedAtTouch
    this.owedAtTouch = false
    this.untouched = false
    this.endScene()
    if (wasOwed && !this.scene && !this.raid) this.startOwed()
  }

  /** The finger lands on the ground. */
  press(x: number, y: number, t: number): void {
    this.touch()
    const cx = Math.floor(x), cy = Math.floor(y)
    const index = machineAt(this.game.machines, cx, cy)
    if (this.raid) {
      // While a raid runs the finger fires the machines and nothing else changes.
      // What the finger points at is what is shown: the raid's own copy of the ground, with what it has moved.
      if (index >= 0) this.fire(index)
      else this.toy.point(x, y, t, this.raid.ground)
      return
    }
    if (index >= 0) {
      this.grabbed = { index, moved: false, facing: this.game.machines[index].facing }
      this.holding = { x, y }
      return
    }
    this.toy.press(x, y, t)
  }

  drag(x: number, y: number, t: number): void {
    const grabbed = this.grabbed
    if (grabbed && this.holding) {
      const dx = x - this.holding.x
      if (Math.abs(dx) > 0.2) grabbed.facing = dx > 0 ? 1 : -1
      this.holding = { x, y }
      if (machineAt(this.game.machines, Math.floor(x), Math.floor(y)) !== grabbed.index) grabbed.moved = true
      return
    }
    this.toy.drag(x, y, t)
  }

  /** Where a held machine would stand if the finger let go now, or null. */
  standUnder(): { x: number; y: number } | null {
    const grabbed = this.grabbed, finger = this.holding
    if (!grabbed || !finger) return null
    const x = Math.round(finger.x - 1), low = Math.floor(finger.y)
    // The finger may hold it a little above the floor: it stands on the first floor under the finger, two cells down at most.
    for (let y = low; y <= low + 2; y++) if (canStand(this.game.ground, this.game.machines, x, y, grabbed.index)) return { x, y }
    return null
  }

  release(): void {
    const grabbed = this.grabbed
    if (grabbed) {
      const machine = this.game.machines[grabbed.index]
      const place = grabbed.moved ? this.standUnder() : null
      this.grabbed = null
      this.holding = null
      if (!grabbed.moved) {
        // A tap: a loaded machine fires, an empty one turns round where it stands.
        if (machine.load) this.fire(grabbed.index)
        else {
          machine.facing = machine.facing > 0 ? -1 : 1
          this.unsaved = true
          this.events.push({ type: 'turned', machine: machine.kind })
        }
        return
      }
      if (!place) {
        this.events.push({ type: 'machineBack', machine: machine.kind })
        return
      }
      machine.x = place.x
      machine.y = place.y
      machine.facing = grabbed.facing
      this.unsaved = true
      this.events.push({ type: 'machineSet', machine: machine.kind })
      return
    }
    // A lump let go over an empty machine loads it: the lump leaves the ground for the cup.
    const carried = this.toy.carried, finger = this.toy.finger
    if (carried && finger && !this.raid) {
      const index = machineAt(this.game.machines, Math.floor(finger.x), Math.floor(finger.y))
      if (index >= 0) {
        const machine = this.game.machines[index]
        if (!machine.load) {
          const cols = this.game.ground.cols
          this.toy.cancel()
          this.toy.drainEvents()
          put(this.game.ground, carried.from % cols, Math.floor(carried.from / cols), OPEN)
          machine.load = SHOT_OF(carried.kind)
          this.toy.touched([carried.from])
          this.events.push({ type: 'loaded', machine: machine.kind, shot: machine.load })
          return
        }
        this.toy.cancel()
        return
      }
    }
    this.toy.release()
  }

  cancel(): void {
    this.dropMachine()
    this.toy.cancel()
  }

  /** After the ground has come to rest: a machine with no floor falls to the first one, and one a lump has fallen into moves to the nearest place it can stand. */
  private restMachines(): void {
    const ground = this.game.ground
    this.game.machines.forEach((machine, index) => {
      if (this.grabbed?.index === index) return
      const place = restPlace(ground, this.game.machines, index)
      if (!place || (place.x === machine.x && place.y === machine.y)) return
      machine.x = place.x
      machine.y = place.y
      this.unsaved = true
      this.events.push({ type: 'machineFell', machine: machine.kind })
    })
  }

  /** A raid has ended by itself: it is judged, the position moves, and the workers begin to put back what was knocked down. */
  private finishRaid(raid: Raid): void {
    const verdict = judge(endOf(raid))
    this.events.push({ type: 'judged', verdict })
    // Turning back the great raid opens the kingdom. That is saved now, with the position, and the ending is
    // only seen: it plays after the put-back, in this visit or never.
    const wasEnded = this.game.ended
    const next = after({ position: this.game.position, muster: this.game.muster, ended: this.game.ended }, verdict)
    this.game.position = next.position
    this.game.muster = next.muster
    this.game.ended = next.ended
    this.endingOwed = next.ended && !wasEnded
    // The place that gave: each cell where the child had built a lump that the raid shoved away or let fall, the
    // first that gave first. Earth a ball dug, a floor a stone rolled over and a cell a lump came to lie in are not it.
    this.marks = [...raid.gave].filter((cell) => isLump(this.game.ground.cells[cell] as Kind) && raid.ground.cells[cell] !== this.game.ground.cells[cell])
    const built = this.game.ground, cols = built.cols
    const cells: number[] = []
    for (let i = 0; i < built.cells.length; i++) if (built.cells[i] !== raid.ground.cells[i]) cells.push(i)
    const mouthX = cols / 2
    cells.sort((a, b) => Math.hypot((a % cols) - mouthX, Math.floor(a / cols)) - Math.hypot((b % cols) - mouthX, Math.floor(b / cols)))
    const held = raid.invaders.filter((invader) => invader.state !== 'home').map((invader) => invader.id)
    const length = Math.max(SCENE_SECONDS.putBackLeast, Math.min(SCENE_SECONDS.putBackMost, 3 + cells.length * 0.35 + held.length * 0.5))
    this.scene = { is: 'putBack', cells, ground: raid.ground, held, t: 0, length }
    this.lastRaid = raid
    this.raid = null
    this.flying = []
    this.reloading = this.game.machines.map(() => 0)
    this.events.push({ type: 'scene', is: 'putBack' })
    // The position is saved in the instant the raid is judged, before the put-back is seen.
    this.unsaved = true
    this.saveNow = true
  }

  /** Plays this many seconds of game time. */
  step(dt: number): void {
    const wasResting = this.toy.atRest
    this.toy.step(dt)
    if (!wasResting && this.toy.atRest && !this.raid) this.restMachines()
    if (this.toy.atRest && !this.raid && !this.scene && !this.untouched && this.queenLives !== this.queenRoomCells()) this.seeToTheQueen()
    // The bell that was rung while the ground was falling: her move, if the ground owed her one, is seen first and
    // the party waits for the next ring; otherwise the party comes now.
    if (this.rung && this.toy.atRest) {
      this.rung = false
      if (!this.raid && !this.scene) this.callParty()
    }
    for (const flying of this.flying) flying.t += dt
    for (let n = 0; n < this.flying.length; n++) {
      // A ball of mud or a stone stops at the first invader it meets, the moment it gets there.
      const flying = this.flying[n]
      if (flying.inRaid && this.raid && flying.shot !== 'sand' && flying.t < flying.length) {
        const reached = Math.floor((flying.t / flying.length) * (flying.path.length - 1))
        this.goBy(this.raid, flying, reached)
        const met = this.firstMet(this.raid, flying.path, reached, flying.shot)
        if (met >= 0) {
          flying.path = flying.path.slice(0, met + 1)
          flying.t = flying.length
        }
      }
      if (this.flying[n].t >= this.flying[n].length) {
        const [done] = this.flying.splice(n--, 1)
        this.arrive(done)
      }
    }
    if (this.raid) {
      for (let i = 0; i < this.reloading.length; i++) this.reloading[i] = Math.max(0, this.reloading[i] - dt)
      this.sinceTick += dt
      // A frame plays a bounded number of steps, however long the frame before it was.
      let ticks = 0
      while (this.raid && this.sinceTick >= TICK && ticks < 4) {
        this.sinceTick -= TICK
        ticks++
        stepRaid(this.raid)
        if (this.raid.events.length > 0) {
          this.raidEvents.push(...this.raid.events)
          this.raid.events.length = 0
        }
        if (this.raid.over) this.finishRaid(this.raid)
      }
      if (this.sinceTick > TICK) this.sinceTick = 0
    }
    const scene = this.scene
    if (scene) {
      if (scene.is === 'arrives' && scene.t < scene.length * TRIED_AT && scene.t + dt >= scene.length * TRIED_AT) this.events.push({ type: 'tried', machine: scene.machine })
      scene.t += dt
      if (scene.t >= scene.length) {
        if (scene.is === 'ending') {
          // It holds on its last beat as long as the child likes.
          scene.t = scene.length
        } else {
          this.scene = null
          if (scene.is === 'putBack') this.lastRaid = null
          this.afterScene(scene)
        }
      }
    }
  }

  /** The cells a machine stands in, for the view and for the ground's repaint. */
  machineCells(machine: Machine): number[] {
    return cellsOf(machine, this.game.ground.cols)
  }
}
