import { digAlong, openWay, pickUp, setDown, type Carried, type Cell } from './build'
import { kingdom } from './chambers'
import { OPEN, SAND, at, atRest, isLump, step as groundStep, type Kind, type Lump } from './ground'
import type { Game } from './save'

// The toy: what the finger does to the nest and how the nest answers, with no renderer and no clock of its own.
// The Mount hands it touches in cell units and game time in seconds; it changes the game, says what happened as
// a list of events for the view and the voices, and says which cells to repaint. Nothing here is a goal.

export type ToyEvent =
  /** A mouthful or more of earth was bitten at this point; `speed` is the finger's, from 0 to 1. */
  | { type: 'dug'; x: number; y: number; cells: number; speed: number }
  /** The dig met something it cannot bite. */
  | { type: 'met'; kind: Kind; x: number; y: number }
  | { type: 'picked'; kind: Lump; cell: number }
  | { type: 'set'; kind: Lump; cell: number }
  /** A carried lump was let go where it cannot lie, or its drag was taken away: it is where it was. */
  | { type: 'back'; kind: Lump; cell: number }
  /** A lump that fell came to rest after this many cells. */
  | { type: 'landed'; kind: Lump; cell: number; fell: number }
  /** This many cells of sand moved in one step of the ground. */
  | { type: 'pour'; cells: number }
  /** Something fell where the ant stood, and it scrambled to the nearest open cell. */
  | { type: 'buried'; cell: number }

/** Seconds of game time between two steps of the ground coming to rest. */
export const GROUND_STEP = 0.06
/** How fast the ant runs, in cells a second. */
export const ANT_SPEED = 16
/** The finger speed, in cells a second, that counts as a fast drag. */
export const FAST_DRAG = 24

export type AntState = 'idle' | 'run' | 'dig' | 'carry' | 'wait'

export class Toy {
  /** The lump in the jaws, which is still in its cell of the ground. */
  carried: Carried | null = null
  /** Where the finger is on the ground, in cell units, while it is down. */
  finger: { x: number; y: number } | null = null
  /** Where the ant is, in cell units: the middle of the cell it stands in, or on its way to the next. */
  readonly antAt: { x: number; y: number }
  /** Which way the ant last moved: along the row, and up or down a shaft. */
  readonly antHeading = { x: 1, y: 0 }
  antState: AntState = 'idle'
  /** What follows from the ground and is never stored. Worked out again each time the ground comes to rest. */
  realm: ReturnType<typeof kingdom>

  private events: ToyEvent[] = []
  private dirty: number[] = []
  private unsaved = false
  private sinceStep = 0
  private resting = true
  private lastFinger: { x: number; y: number; t: number } | null = null
  private speed = 0
  /** How far each lump on the move has fallen, by the cell it is in now. */
  private falling = new Map<number, number>()
  private way: Uint8Array | null = null
  /** The kinds the last bite met. */
  private meeting: Kind[] = []

  constructor(readonly game: Game) {
    this.antAt = { x: game.ant.x + 0.5, y: game.ant.y + 0.5 }
    this.realm = kingdom(game.ground)
    this.resting = atRest(game.ground)
  }

  /** The events since the last call, oldest first. */
  drainEvents(): ToyEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  /** The cells that changed since the last call. */
  drainDirty(): number[] {
    const dirty = this.dirty
    this.dirty = []
    return dirty
  }

  /** Whether anything a save holds has changed since the last call. */
  drainUnsaved(): boolean {
    const unsaved = this.unsaved
    this.unsaved = false
    return unsaved
  }

  get atRest(): boolean {
    return this.resting
  }

  private inGround(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.game.ground.cols && y < this.game.ground.rows
  }

  private changed(cells: readonly number[]): void {
    if (cells.length === 0) return
    this.dirty.push(...cells)
    this.unsaved = true
    this.resting = false
    this.way = null
  }

  private bite(fromX: number, fromY: number, toX: number, toY: number): void {
    const answer = digAlong(this.game.ground, fromX, fromY, toX, toY)
    this.changed(answer.dug)
    if (answer.dug.length > 0) this.events.push({ type: 'dug', x: toX, y: toY, cells: answer.dug.length, speed: this.speed })
    // A thing the dig cannot bite answers once as the finger comes to it, not once a frame while the finger rubs it.
    for (const kind of answer.met) if (!this.meeting.includes(kind)) this.events.push({ type: 'met', kind, x: toX, y: toY })
    this.meeting = answer.met
  }

  /** The finger lands on the ground. A lump the ant can reach is taken in its jaws; anywhere else is a mouthful. */
  press(x: number, y: number, t: number): void {
    if (!this.inGround(x, y)) return
    this.finger = { x, y }
    this.lastFinger = { x, y, t }
    this.speed = 0
    this.meeting = []
    const cx = Math.floor(x), cy = Math.floor(y)
    const lump = pickUp(this.game.ground, this.game.ant, cx, cy)
    if (lump) {
      this.carried = lump
      this.events.push({ type: 'picked', kind: lump.kind, cell: lump.from })
      return
    }
    this.bite(x, y, x, y)
  }

  /** The finger moves. A carried lump follows it; otherwise the earth along the way is bitten, and no further. */
  drag(x: number, y: number, t: number): void {
    const last = this.lastFinger
    if (!last || !this.finger) return
    const far = Math.hypot(x - last.x, y - last.y), took = Math.max(1e-3, t - last.t)
    this.speed = Math.max(0, Math.min(1, far / took / FAST_DRAG))
    const cx = Math.max(0, Math.min(this.game.ground.cols - 0.001, x)), cy = Math.max(0, Math.min(this.game.ground.rows - 0.001, y))
    if (!this.carried) this.bite(last.x, last.y, cx, cy)
    this.finger = { x: cx, y: cy }
    this.lastFinger = { x: cx, y: cy, t }
  }

  /** The finger lets go. A carried lump is set down where it let go, or is back where it came from. */
  release(): void {
    const carried = this.carried, finger = this.finger
    this.carried = null
    this.finger = null
    this.lastFinger = null
    if (!carried || !finger) return
    const to = setDown(this.game.ground, this.game.ant, carried, finger.x, finger.y)
    if (to === null) this.events.push({ type: 'back', kind: carried.kind, cell: carried.from })
    else {
      this.changed([carried.from, to])
      this.events.push({ type: 'set', kind: carried.kind, cell: to })
    }
  }

  /** The touch was taken away, or the game was put away under it: nothing was set down and nothing changes. */
  cancel(): void {
    const carried = this.carried
    this.carried = null
    this.finger = null
    this.lastFinger = null
    if (carried) this.events.push({ type: 'back', kind: carried.kind, cell: carried.from })
  }

  /** One step of the ground coming to rest, with the falls and the landings it makes. */
  private settleOnce(): void {
    const ground = this.game.ground
    const moves = groundStep(ground)
    if (moves.length === 0) {
      for (const [cell, fell] of this.falling) this.events.push({ type: 'landed', kind: ground.cells[cell] as Lump, cell, fell })
      this.falling.clear()
      if (!this.resting) {
        this.resting = true
        this.realm = kingdom(ground)
      }
      return
    }
    const still = new Map(this.falling)
    const next = new Map<number, number>()
    let sand = 0
    for (let n = 0; n < moves.length; n += 2) {
      const from = moves[n], to = moves[n + 1]
      next.set(to, (still.get(from) ?? 0) + 1)
      still.delete(from)
      if (ground.cells[to] === SAND) sand++
    }
    // What was falling and did not move this step has come to rest.
    for (const [cell, fell] of still) if (isLump(ground.cells[cell] as Kind)) this.events.push({ type: 'landed', kind: ground.cells[cell] as Lump, cell, fell })
    this.falling = next
    if (sand > 0) this.events.push({ type: 'pour', cells: sand })
    this.dirty.push(...moves)
    this.unsaved = true
    this.way = null
  }

  /** The cell the ant makes for: where the finger is if its open way reaches there, else the nearest cell of its way. */
  private goal(way: Uint8Array): number | null {
    const finger = this.finger
    if (!finger) return null
    const { cols, rows } = this.game.ground
    let best = -1, bestFar = Infinity
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (way[y * cols + x] !== 1) continue
      const far = Math.hypot(x + 0.5 - finger.x, y + 0.5 - finger.y)
      if (far < bestFar) {
        bestFar = far
        best = y * cols + x
      }
    }
    return best < 0 ? null : best
  }

  /** The next cell on the shortest open way from the ant to a cell, or null when it is there already. */
  private nextToward(goal: number): Cell | null {
    const { cols, rows, cells } = this.game.ground
    const start = this.game.ant.y * cols + this.game.ant.x
    if (goal === start) return null
    // Walk back from the goal, so the first step off the ant's cell falls out at the end.
    const from = new Int32Array(cells.length).fill(-1)
    const queue = [goal]
    from[goal] = goal
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head]
      if (i === start) break
      const x = i % cols, y = Math.floor(i / cols)
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const n = ny * cols + nx
        if (from[n] < 0 && cells[n] === OPEN) {
          from[n] = i
          queue.push(n)
        }
      }
    }
    if (from[start] < 0) return null
    return { x: from[start] % cols, y: Math.floor(from[start] / cols) }
  }

  /** The ant scrambles to the nearest open cell when something has fallen where it stood. */
  private unbury(): void {
    const ground = this.game.ground, ant = this.game.ant
    if (at(ground, ant.x, ant.y) === OPEN) return
    for (let reach = 1; reach < ground.cols; reach++) {
      for (let y = ant.y - reach; y <= ant.y + reach; y++) for (let x = ant.x - reach; x <= ant.x + reach; x++) {
        if (y >= 1 && at(ground, x, y) === OPEN && this.inGround(x, y)) {
          ant.x = x
          ant.y = y
          this.antAt.x = x + 0.5
          this.antAt.y = y + 0.5
          this.way = null
          this.unsaved = true
          this.events.push({ type: 'buried', cell: y * ground.cols + x })
          return
        }
      }
    }
  }

  private moveAnt(dt: number): void {
    const ant = this.game.ant
    this.unbury()
    if (!this.way) this.way = openWay(this.game.ground, ant)
    const goal = this.goal(this.way)
    const next = goal === null ? null : this.nextToward(goal)
    const target = next ?? ant
    const dx = target.x + 0.5 - this.antAt.x, dy = target.y + 0.5 - this.antAt.y
    const far = Math.hypot(dx, dy), reach = ANT_SPEED * dt
    if (far > 1e-6) {
      const part = Math.min(1, reach / far)
      this.antAt.x += dx * part
      this.antAt.y += dy * part
      if (Math.abs(dx) > Math.abs(dy)) {
        this.antHeading.x = Math.sign(dx)
        this.antHeading.y = 0
      } else this.antHeading.y = Math.sign(dy)
    }
    if (next && far <= reach + 1e-6) {
      ant.x = next.x
      ant.y = next.y
      this.unsaved = true
    }
    const finger = this.finger
    const there = goal !== null && next === null && far <= 0.05
    if (this.carried) this.antState = 'carry'
    else if (!finger) this.antState = far > 0.05 ? 'run' : 'idle'
    else if (!there) this.antState = 'run'
    else this.antState = Math.hypot(finger.x - this.antAt.x, finger.y - this.antAt.y) <= 2.5 ? 'dig' : 'wait'
    if (finger && there && Math.abs(finger.x - this.antAt.x) > 0.3) this.antHeading.x = Math.sign(finger.x - this.antAt.x)
  }

  /** Plays this many seconds of game time: the ground comes to rest a step at a time, and the ant runs. */
  step(dt: number): void {
    this.sinceStep += dt
    let steps = 0
    while (this.sinceStep >= GROUND_STEP && steps < 4) {
      this.sinceStep -= GROUND_STEP
      steps++
      if (!this.resting || this.falling.size > 0) this.settleOnce()
    }
    if (this.sinceStep > GROUND_STEP) this.sinceStep = 0
    this.moveAnt(dt)
  }
}
