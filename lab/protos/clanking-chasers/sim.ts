// Clanking Chasers. A grid of squares. A tap makes the child step ONE square
// toward the tapped square (or stay put on its own square). Then every robot
// takes one straight step toward the child, all at once. Robots that land on
// the same square tangle into a scrap heap; a robot that lands on a heap is
// stopped and joins it; a robot that lands on the child catches it.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now,
// or performance.now. The seed picks each round's formation and layout; ticks
// only time the pauses and the idle hint.

import { createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

// The board, in logical coordinates: 12 by 8 squares, 96 px each, centred.
export const COLS = 12
export const ROWS = 8
export const CELL = 96
export const X0 = 14
export const Y0 = 44

export type Formation = 'line' | 'ring' | 'corners' | 'pillars' | 'scatter'
export const FORMATIONS: readonly Formation[] = ['line', 'ring', 'corners', 'pillars', 'scatter']
// The first round is one of the gentler shapes.
const EASY: readonly Formation[] = ['line', 'scatter', 'ring']
export type Phase = 'play' | 'caught' | 'cleared'

const BASE_ROBOTS = 4
// The level hook adds a robot per cleared round up to this many extra; past six
// robots a single heap is out of reach even for a careful planner.
const MAX_LEVEL_EXTRA = 2
// Robots start at least this far (in squares) from the child.
const MIN_START_DISTANCE = 3
const CAUGHT_PAUSE = 30
const CLEARED_PAUSE = 40
const HINT_AFTER_TICKS = 120
// The browser view never calls observe(), so the queue must not grow forever.
const MAX_EVENTS = 64

export interface Cell {
  c: number
  r: number
}
export interface Robot extends Cell {
  id: number
  // Where it stood before its last step, for the view's slide.
  pc: number
  pr: number
}
export interface Heap extends Cell {
  // Robots inside. Zero for a heap that was there from the start.
  n: number
}

export interface TurnResult {
  robots: Robot[]
  heaps: Heap[]
  caught: boolean
  // Robots ended this turn (bumped together or stopped by a heap).
  destroyed: number
  // Of those, robots that ran into a heap that already stood there.
  joined: number
  // Squares where robots ended this turn.
  clanks: Cell[]
}

export interface ChaserSnapshot {
  tick: number
  phase: Phase
  formation: Formation
  round: number
  turns: number
  child: Cell
  robots: Array<{ c: number; r: number; pc: number; pr: number }>
  heaps: Array<{ c: number; r: number; n: number }>
  // Ticks since the last turn: the view slides robots over the first few.
  sinceTurn: number
  clanks: Cell[]
  // Null when the stars hook is off or the round is not cleared.
  stars: number | null
  // Only when hints are on and the child has been quiet for a while.
  hint: { arrows: Array<{ c0: number; r0: number; c1: number; r1: number }> } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
export const cellKey = (c: number, r: number): number => r * COLS + c
export const inBounds = (c: number, r: number): boolean => c >= 0 && c < COLS && r >= 0 && r < ROWS
const distance = (a: Cell, b: Cell): number => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r))

// The square under a point on the field, clamped to the board: a tap in the
// margin still means "toward that edge".
export function cellAt(x: number, y: number): Cell {
  return { c: clamp(Math.floor((x - X0) / CELL), 0, COLS - 1), r: clamp(Math.floor((y - Y0) / CELL), 0, ROWS - 1) }
}

// The child's one step toward a tapped square: on the diagonal when both
// coordinates differ, sliding along an axis when the diagonal is blocked.
// Null when every way is blocked.
export function childStep(child: Cell, target: Cell, blocked: (c: number, r: number) => boolean): Cell | null {
  const dx = Math.sign(target.c - child.c)
  const dy = Math.sign(target.r - child.r)
  if (dx === 0 && dy === 0) return { c: child.c, r: child.r }
  const tries: Array<[number, number]> = [[dx, dy]]
  if (dx !== 0 && dy !== 0) {
    const wide = Math.abs(target.c - child.c) >= Math.abs(target.r - child.r)
    tries.push(wide ? [dx, 0] : [0, dy], wide ? [0, dy] : [dx, 0])
  }
  for (const [ax, ay] of tries) {
    const c = child.c + ax
    const r = child.r + ay
    if (inBounds(c, r) && !blocked(c, r)) return { c, r }
  }
  return null
}

// Every robot takes one straight step toward the child, all at once.
export function robotsMove(child: Cell, robots: readonly Robot[], heaps: readonly Heap[]): TurnResult {
  const landing = new Map<number, Robot[]>()
  for (const b of robots) {
    const c = b.c + Math.sign(child.c - b.c)
    const r = b.r + Math.sign(child.r - b.r)
    const moved: Robot = { id: b.id, c, r, pc: b.c, pr: b.r }
    const list = landing.get(cellKey(c, r))
    if (list) list.push(moved)
    else landing.set(cellKey(c, r), [moved])
  }
  const nextHeaps: Heap[] = heaps.map((h) => ({ c: h.c, r: h.r, n: h.n }))
  const nextRobots: Robot[] = []
  const clanks: Cell[] = []
  let caught = false
  let destroyed = 0
  let joined = 0
  for (const [k, group] of landing) {
    const c = k % COLS
    const r = Math.floor(k / COLS)
    if (c === child.c && r === child.r) {
      caught = true
      nextRobots.push(...group)
      continue
    }
    const heap = nextHeaps.find((h) => h.c === c && h.r === r)
    if (heap) {
      heap.n += group.length
      destroyed += group.length
      joined += group.length
      clanks.push({ c, r })
    } else if (group.length > 1) {
      nextHeaps.push({ c, r, n: group.length })
      destroyed += group.length
      clanks.push({ c, r })
    } else nextRobots.push(group[0]!)
  }
  return { robots: nextRobots, heaps: nextHeaps, caught, destroyed, joined, clanks }
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

interface Layout {
  child: Cell
  robots: Cell[]
  heaps: Cell[]
}

// Fisher-Yates, in place, on the seeded rng.
function shuffle<T>(rng: Rng, items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const swap = items[i]!
    items[i] = items[j]!
    items[j] = swap
  }
}

// Seeded starting positions for one formation. Robots are distinct, off the
// heaps, and at least MIN_START_DISTANCE squares from the child.
function makeLayout(rng: Rng, formation: Formation, count: number): Layout {
  const taken = new Set<number>()
  const robots: Cell[] = []
  const heaps: Cell[] = []
  let child: Cell = { c: 5, r: 4 }
  const setChild = (c: number, r: number) => {
    child = { c, r }
    taken.add(cellKey(c, r))
  }
  const addRobot = (c: number, r: number) => {
    if (robots.length >= count || !inBounds(c, r) || taken.has(cellKey(c, r)) || distance({ c, r }, child) < MIN_START_DISTANCE) return
    taken.add(cellKey(c, r))
    robots.push({ c, r })
  }
  // Whatever the formation left over lands on random squares, then on the
  // first free squares in reading order, so the squad is always full.
  const fillRest = () => {
    for (let tries = 0; robots.length < count && tries < 400; tries++) addRobot(int(rng, 0, COLS - 1), int(rng, 0, ROWS - 1))
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) addRobot(c, r)
  }

  if (formation === 'line') {
    const edge = pick(rng, ['top', 'bottom', 'left', 'right'] as const)
    if (edge === 'top' || edge === 'bottom') {
      setChild(int(rng, 3, COLS - 4), edge === 'top' ? ROWS - 2 : 1)
      for (let i = 0; i < count; i++) {
        const row = int(rng, 0, 1)
        addRobot(Math.round(((i + 0.5) * COLS) / count - 0.5), edge === 'top' ? row : ROWS - 1 - row)
      }
    } else {
      setChild(edge === 'left' ? COLS - 3 : 2, int(rng, 2, ROWS - 3))
      for (let i = 0; i < count; i++) {
        const col = int(rng, 0, 1)
        addRobot(edge === 'left' ? col : COLS - 1 - col, Math.round(((i + 0.5) * ROWS) / count - 0.5))
      }
    }
  } else if (formation === 'ring') {
    setChild(int(rng, 4, 7), int(rng, 3, 4))
    const ring: Cell[] = []
    for (let i = -3; i <= 3; i++) ring.push({ c: child.c + i, r: child.r - 3 })
    for (let i = -2; i <= 3; i++) ring.push({ c: child.c + 3, r: child.r + i })
    for (let i = 2; i >= -3; i--) ring.push({ c: child.c + i, r: child.r + 3 })
    for (let i = 2; i >= -2; i--) ring.push({ c: child.c - 3, r: child.r + i })
    // An uneven ring: some robots side by side, some far apart.
    shuffle(rng, ring)
    for (const spot of ring) addRobot(spot.c, spot.r)
  } else if (formation === 'corners') {
    setChild(int(rng, 4, 7), int(rng, 3, 4))
    const anchors: Array<[number, number]> = [
      [0, 0],
      [COLS - 1, 0],
      [0, ROWS - 1],
      [COLS - 1, ROWS - 1],
      [5, 0],
      [6, ROWS - 1],
      [0, 3],
      [COLS - 1, 4],
    ]
    shuffle(rng, anchors)
    for (const [c, r] of anchors) addRobot(c, r)
  } else if (formation === 'pillars') {
    setChild(int(rng, 3, 8), int(rng, 2, 5))
    const wanted = int(rng, 3, 5)
    for (let tries = 0; heaps.length < wanted && tries < 80; tries++) {
      const c = int(rng, 2, 9)
      const r = int(rng, 2, 5)
      if (taken.has(cellKey(c, r)) || distance({ c, r }, child) < 2) continue
      taken.add(cellKey(c, r))
      heaps.push({ c, r })
    }
  } else {
    setChild(int(rng, 3, 8), int(rng, 2, 5))
  }
  fillRest()
  return { child, robots, heaps }
}

// ---------------------------------------------------------------------------
// Winnable layouts
// ---------------------------------------------------------------------------

// A retry brings back the same layout, so a layout must be winnable. Each fresh
// one is checked by playing it with a planner that looks two turns ahead for
// the step that ends the most robots.
const SOLVE_TURNS = 16
const LAYOUT_TRIES = 40
// A square the child cannot step onto: a heap or a robot stands on it.
export const blockedAt = (c: number, r: number, robots: readonly Cell[], heaps: readonly Cell[]): boolean =>
  heaps.some((h) => h.c === c && h.r === r) || robots.some((b) => b.c === c && b.r === r)

// Squares the child could step to from here: its eight neighbours and its own.
function stepsFrom(child: Cell, robots: readonly Robot[], heaps: readonly Heap[]): Cell[] {
  const list: Cell[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = child.c + dc
      const r = child.r + dr
      if (inBounds(c, r) && !blockedAt(c, r, robots, heaps)) list.push({ c, r })
    }
  }
  return list
}

// What one turn is worth to the planner: robots ended, and a cleared board counts extra.
const turnValue = (turn: TurnResult): number => turn.destroyed * 10 + (turn.robots.length === 0 ? 100 : 0)

// The most robots the child can end on its next turn without being caught
// (a cleared board counts extra).
function foresee(child: Cell, robots: readonly Robot[], heaps: readonly Heap[]): number {
  let best = -1000
  for (const move of stepsFrom(child, robots, heaps)) {
    const turn = robotsMove(move, robots, heaps)
    if (turn.caught) continue
    const value = turnValue(turn)
    if (value > best) best = value
  }
  return best
}

// A layout's cells as live pieces: robots numbered in order, heaps that were there from the start.
const spawnRobots = (cells: readonly Cell[]): Robot[] => cells.map((b, i) => ({ id: i, c: b.c, r: b.r, pc: b.c, pr: b.r }))
const spawnHeaps = (cells: readonly Cell[]): Heap[] => cells.map((h) => ({ c: h.c, r: h.r, n: 0 }))

// Turns the two-turn planner needs to clear a layout, or null if it cannot.
function solveTurns(layout: Layout): number | null {
  let child: Cell = layout.child
  let robots: Robot[] = spawnRobots(layout.robots)
  let heaps: Heap[] = spawnHeaps(layout.heaps)
  for (let turn = 1; turn <= SOLVE_TURNS; turn++) {
    let best: { move: Cell; result: TurnResult; value: number } | null = null
    for (const move of stepsFrom(child, robots, heaps)) {
      const result = robotsMove(move, robots, heaps)
      if (result.caught) continue
      let value = turnValue(result)
      if (result.robots.length > 0) value += foresee(move, result.robots, result.heaps)
      // Prefer staying clear of the squad when nothing else separates two steps.
      value += 0.01 * result.robots.reduce((least, b) => Math.min(least, distance(move, b)), 99)
      if (best === null || value > best.value) best = { move, result, value }
    }
    if (best === null) return null
    child = best.move
    robots = best.result.robots
    heaps = best.result.heaps
    if (robots.length === 0) return turn
  }
  return null
}

// ---------------------------------------------------------------------------
// The sim
// ---------------------------------------------------------------------------

export const createSim: CreateSim<ChaserSnapshot> = (config): Sim<ChaserSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) Each hook is honoured only when it is in this list.
  const hooks = new Set(config.hooks)

  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let pause = 0
  let sinceTurn = 99

  let phase: Phase = 'play'
  let formation: Formation = 'line'
  let roundsCleared = 0
  let caughtCount = 0
  let turns = 0
  let stars = 0
  let par = 0
  let initial: Layout = { child: { c: 5, r: 4 }, robots: [], heaps: [] }
  let child: Cell = { c: 5, r: 4 }
  let robots: Robot[] = []
  let heaps: Heap[] = []
  let clanks: Cell[] = []

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const squadSize = () => BASE_ROBOTS + (hooks.has('level') ? Math.min(MAX_LEVEL_EXTRA, roundsCleared) : 0)

  const nextFormation = (): Formation => {
    if (roundsCleared === 0) return pick(rng, EASY)
    return pick(
      rng,
      FORMATIONS.filter((f) => f !== formation),
    )
  }

  // fresh: a new layout (a new round); otherwise the same layout again.
  const startRound = (fresh: boolean) => {
    if (fresh) {
      formation = nextFormation()
      // Re-roll until a two-turn planner can clear it; a formation that keeps
      // failing (a crowded ring) gives way to another after ten tries.
      let solved: number | null = null
      for (let tries = 1; tries <= LAYOUT_TRIES && solved === null; tries++) {
        if (tries % 10 === 0) formation = nextFormation()
        initial = makeLayout(rng, formation, squadSize())
        solved = solveTurns(initial)
      }
      par = (solved ?? initial.robots.length + 1) + 1
    }
    child = { ...initial.child }
    robots = spawnRobots(initial.robots)
    heaps = spawnHeaps(initial.heaps)
    phase = 'play'
    turns = 0
    stars = 0
    pause = 0
    sinceTurn = 99
    clanks = []
    idleTicks = 0
    emit({ kind: 'state', name: 'round' })
  }
  startRound(true)

  // Scrap heaps that robots ended in (not the ones that stood there at the start).
  const piles = () => heaps.filter((h) => h.n > 0)

  const isBlocked = (c: number, r: number) => blockedAt(c, r, robots, heaps)

  // One full turn: the child steps, then every robot answers.
  const takeTurn = (target: Cell) => {
    const next = childStep(child, target, isBlocked)
    if (!next) {
      emit({ kind: 'state', name: 'blocked' })
      return
    }
    emit({ kind: 'state', name: next.c === child.c && next.r === child.r ? 'wait' : 'step' })
    child = next
    turns++
    sinceTurn = 0
    const result = robotsMove(child, robots, heaps)
    robots = result.robots
    heaps = result.heaps
    clanks = result.clanks
    if (result.destroyed > 0) emit({ kind: 'state', name: 'clank' })
    if (result.joined > 0) emit({ kind: 'state', name: 'pile' })
    if (result.caught) {
      phase = 'caught'
      pause = CAUGHT_PAUSE
      caughtCount++
      emit({ kind: 'state', name: 'caught' })
    } else if (robots.length === 0) {
      phase = 'cleared'
      pause = CLEARED_PAUSE
      roundsCleared++
      // One star for clearing, one for doing it in par turns, one for putting
      // the whole squad in a single heap.
      stars = 1 + (turns <= par ? 1 : 0) + (piles().length === 1 ? 1 : 0)
      emit({ kind: 'state', name: 'cleared' })
      if (hooks.has('stars')) emit({ kind: 'hook', name: 'stars' })
      if (hooks.has('level') && roundsCleared <= MAX_LEVEL_EXTRA) emit({ kind: 'hook', name: 'level' })
    }
  }

  // (contract: pointer) Only a finger going down takes a turn; the sim's own
  // hit-test is the square under it, and any square on the field will do.
  const pointer = (input: PointerInput) => {
    idleTicks = 0
    if (input.phase !== 'down' || phase !== 'play') return
    if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) return
    takeTurn(cellAt(input.x, input.y))
  }

  // (contract: step) One fixed tick: only pauses and the hint clock move.
  const step = () => {
    tick++
    idleTicks++
    sinceTurn = Math.min(99, sinceTurn + 1)
    if (phase !== 'play') {
      pause--
      if (pause <= 0) startRound(phase === 'cleared')
    }
  }

  const rectOf = (cell: Cell) => ({ x: X0 + cell.c * CELL, y: Y0 + cell.r * CELL, w: CELL, h: CELL })

  // (contract: affordances) The squares a child could step to, the robots
  // and heaps that catch the eye, and the child's own square (wait).
  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    const gap = (cell: Cell) => (robots.length === 0 ? 99 : Math.min(...robots.map((b) => distance(cell, b))))
    const here = gap(child)
    // Backing away from the nearest robot draws the eye a little more.
    const awayFrom = (cell: Cell) => {
      const g = gap(cell)
      return g > here ? 0.6 : g < here ? 0.25 : 0.4
    }
    for (const cell of stepsFrom(child, robots, heaps)) {
      const own = cell.c === child.c && cell.r === child.r
      list.push({ ...rectOf(cell), kind: 'tap', salience: own ? 0.2 : awayFrom(cell) })
    }
    for (const b of robots) list.push({ ...rectOf(b), kind: 'tap', salience: 0.3 })
    for (const h of heaps) list.push({ ...rectOf(h), kind: 'tap', salience: 0.25 })
    return list
  }

  // (contract: observe) A discrete outcome class: which formation, and how the
  // round stands. 5 x (3 + 6 + 1) at most.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const heaped = piles()
    let state: string
    if (phase === 'caught') state = 'caught'
    else if (phase === 'cleared') state = (heaped.length === 1 ? 'herded' : 'scattered') + (hooks.has('stars') ? `-${stars}` : '')
    else state = heaped.length === 0 ? 'fresh' : heaped.length === 1 ? 'one-pile' : 'many-piles'
    return {
      signature: `${formation}/${state}`,
      features: {
        robots: robots.length,
        pile: heaped.reduce((most, h) => Math.max(most, h.n), 0),
        piles: heaped.length,
        turns,
        cleared: roundsCleared,
        caught: caughtCount,
      },
      events,
    }
  }

  // (contract: hints) Purely data for the view: it never changes the outcome.
  const hint = (): ChaserSnapshot['hint'] => {
    if (!config.hints || phase !== 'play' || idleTicks < HINT_AFTER_TICKS) return null
    return {
      arrows: robots.map((b) => ({ c0: b.c, r0: b.r, c1: b.c + Math.sign(child.c - b.c), r1: b.r + Math.sign(child.r - b.r) })),
    }
  }

  const snapshot = (): ChaserSnapshot => ({
    tick,
    phase,
    formation,
    round: roundsCleared,
    turns,
    child: { ...child },
    robots: robots.map((b) => ({ c: b.c, r: b.r, pc: b.pc, pr: b.pr })),
    heaps: heaps.map((h) => ({ c: h.c, r: h.r, n: h.n })),
    sinceTurn,
    clanks: clanks.map((k) => ({ ...k })),
    stars: hooks.has('stars') && phase === 'cleared' ? stars : null,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
