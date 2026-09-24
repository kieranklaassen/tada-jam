// Pushable Rules. A Baba-style room on a grid. Picture tiles spell the rules
// (NOUN IS PROPERTY, read left to right and top to bottom) and the child pushes
// them by walking into them: pushing a tile out of line breaks the rule,
// pushing one into line makes a new one. Whatever the rules say is true for
// real: a wall stops the frog only while WALL IS STOP is spelled.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now,
// or performance.now. It reads a seeded rng and counts ticks, nothing else.
// The rule engine (parseRules, applyMove, isWon) and the room builder are
// exported pure functions so the tests can solve rooms without the sim.

import { chance, createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export const COLS = 12
export const ROWS = 7
export const CELL = 96
// Grid origin in the 1180 by 820 field. The bottom bar holds the two buttons.
export const OX = 14
export const OY = 24

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export const RESTART: Rect = { x: 14, y: 724, w: 220, h: 80 }
export const UNDO: Rect = { x: 250, y: 724, w: 220, h: 80 }

// A frog step every 4 ticks while it walks toward a tapped cell.
const WALK_TICKS = 4
// The room stays solved for 1.5 seconds, then a fresh one opens.
const SOLVE_HOLD = 45
const HINT_TICKS = 150
const MAX_EVENTS = 64
const MAX_HISTORY = 64
const NO_GAP = COLS + ROWS + 1

export type EntKind = 'obj' | 'noun' | 'is' | 'prop'
// obj: a thing in the room (name is its noun). noun / is / prop: a word tile.
export interface Ent {
  id: number
  x: number
  y: number
  kind: EntKind
  name: string
}
export type Prop = 'you' | 'push' | 'stop' | 'win'
export interface Rule {
  noun: string
  prop: Prop
  // The three word tiles that spell it.
  ids: readonly [number, number, number]
}
export type RoomKind = 'wall' | 'gate' | 'swap'
const KINDS: readonly RoomKind[] = ['wall', 'gate', 'swap']

// ---------------------------------------------------------------------------
// The rule engine
// ---------------------------------------------------------------------------

export function parseRules(ents: readonly Ent[]): Rule[] {
  const words = new Map<number, Ent>()
  for (const e of ents) if (e.kind !== 'obj') words.set(e.y * COLS + e.x, e)
  const wordAt = (x: number, y: number) => (x < COLS && y < ROWS ? words.get(y * COLS + x) : undefined)
  const rules: Rule[] = []
  for (const n of ents) {
    if (n.kind !== 'noun') continue
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const is = wordAt(n.x + dx, n.y + dy)
      const p = wordAt(n.x + 2 * dx, n.y + 2 * dy)
      if (is?.kind === 'is' && p?.kind === 'prop') rules.push({ noun: n.name, prop: p.name as Prop, ids: [n.id, is.id, p.id] })
    }
  }
  return rules
}

const ruleKeys = (ents: readonly Ent[]): string[] => [...new Set(parseRules(ents).map((r) => `${r.noun}:${r.prop}`))].sort()

function flagMap(rules: readonly Rule[]): Map<string, Set<Prop>> {
  const map = new Map<string, Set<Prop>>()
  for (const r of rules) {
    const set = map.get(r.noun) ?? new Set<Prop>()
    set.add(r.prop)
    map.set(r.noun, set)
  }
  return map
}

export interface MoveResult {
  ents: Ent[]
  moved: boolean
  pushed: boolean
}

// Every YOU thing steps (dx, dy). Word tiles and PUSH things are pushed along
// in a chain; a STOP thing (that is not PUSH) or the edge blocks the step.
export function applyMove(ents: readonly Ent[], dx: number, dy: number): MoveResult {
  const next = ents.map((e) => ({ ...e }))
  const flags = flagMap(parseRules(next))
  const has = (e: Ent, p: Prop) => e.kind === 'obj' && (flags.get(e.name)?.has(p) ?? false)
  const isPush = (e: Ent) => e.kind !== 'obj' || has(e, 'push')
  const cells = new Map<number, Ent[]>()
  const put = (e: Ent) => {
    const k = e.y * COLS + e.x
    const list = cells.get(k)
    if (list) list.push(e)
    else cells.set(k, [e])
  }
  const drop = (e: Ent) => {
    const list = cells.get(e.y * COLS + e.x)
    if (list) list.splice(list.indexOf(e), 1)
  }
  for (const e of next) put(e)

  let moved = false
  let pushed = false
  for (const you of next) {
    if (!has(you, 'you')) continue
    const chain: Ent[] = []
    let cx = you.x + dx
    let cy = you.y + dy
    let blocked = false
    for (;;) {
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) {
        blocked = true
        break
      }
      const here = (cells.get(cy * COLS + cx) ?? []).filter((e) => e !== you)
      if (here.some((e) => has(e, 'stop') && !isPush(e))) {
        blocked = true
        break
      }
      const pushables = here.filter(isPush)
      if (pushables.length === 0) break
      chain.push(...pushables)
      cx += dx
      cy += dy
    }
    if (blocked) continue
    for (const e of chain) {
      drop(e)
      e.x += dx
      e.y += dy
      put(e)
    }
    drop(you)
    you.x += dx
    you.y += dy
    put(you)
    moved = true
    if (chain.length > 0) pushed = true
  }
  return { ents: next, moved, pushed }
}

// A YOU thing shares a cell with a WIN thing (or is itself WIN).
export function isWon(ents: readonly Ent[]): boolean {
  const flags = flagMap(parseRules(ents))
  const withProp = (p: Prop) => ents.filter((e) => e.kind === 'obj' && flags.get(e.name)?.has(p))
  const wins = withProp('win')
  return withProp('you').some((y) => wins.some((w) => w.x === y.x && w.y === y.y))
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export interface Room {
  kind: RoomKind
  ents: Ent[]
  // The tile worth pushing first (the STOP word, or the spare ROCK noun).
  key: number
  // True when a long way round leaves the barrier, so rewriting is a choice.
  gap: boolean
}

// Loose tiles that make more rewrites possible, and more ways to go wrong.
const LOOSE: ReadonlyArray<readonly [EntKind, string]> = [
  ['prop', 'push'],
  ['noun', 'rock'],
  ['prop', 'stop'],
  ['prop', 'win'],
  ['is', 'is'],
]

// wall: a full wall with WALL IS STOP in the frog's half. gate: a wall whose
// only doorway is plugged by a STOP rock. swap: the pad is behind an
// unbreakable wall, so PAD IS WIN must become ROCK IS WIN. Each is solvable
// with a few pushes and none can be walked around, unless `gap` says so.
const DOES_NOT_FIT = new Error('room did not fit')

export function buildRoom(rng: Rng, kind: RoomKind, index: number): Room {
  // A crowded draw is thrown away and drawn again from the same stream; the
  // last resorts are the plainest room, which always fits.
  for (let t = 0; t < 40; t++) {
    try {
      return attemptRoom(rng, kind, t < 30 ? index : 0)
    } catch (e) {
      if (e !== DOES_NOT_FIT) throw e
    }
  }
  return attemptRoom(rng, kind, 0)
}

function attemptRoom(rng: Rng, kind: RoomKind, index: number): Room {
  const ents: Ent[] = []
  const occ = new Set<number>()
  let nextId = 1
  const at = (x: number, y: number) => y * COLS + x
  const isFree = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !occ.has(at(x, y))
  const add = (k: EntKind, name: string, x: number, y: number): number => {
    const id = nextId++
    ents.push({ id, kind: k, name, x, y })
    occ.add(at(x, y))
    return id
  }
  const words = (noun: string, prop: string, x: number, y: number, vertical: boolean): number[] => {
    const dx = vertical ? 0 : 1
    const dy = vertical ? 1 : 0
    return [add('noun', noun, x, y), add('is', 'is', x + dx, y + dy), add('prop', prop, x + 2 * dx, y + 2 * dy)]
  }
  const fits = (x: number, y: number, vertical: boolean) =>
    isFree(x, y) && isFree(x + (vertical ? 0 : 1), y + (vertical ? 1 : 0)) && isFree(x + (vertical ? 0 : 2), y + (vertical ? 2 : 0))
  const spot = (x0: number, x1: number, y0: number, y1: number) => {
    for (let t = 0; t < 80; t++) {
      const x = int(rng, x0, x1)
      const y = int(rng, y0, y1)
      if (isFree(x, y)) return { x, y }
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isFree(x, y)) return { x, y }
    throw DOES_NOT_FIT
  }
  // Where a three-tile sentence fits inside the box.
  const spot3 = (x0: number, x1: number, y0: number, y1: number, vertical: boolean) => {
    const xMax = vertical ? x1 : x1 - 2
    const yMax = vertical ? y1 - 2 : y1
    for (let t = 0; t < 80; t++) {
      const x = int(rng, x0, xMax)
      const y = int(rng, y0, yMax)
      if (fits(x, y, vertical)) return { x, y }
    }
    for (let y = y0; y <= yMax; y++) for (let x = x0; x <= xMax; x++) if (fits(x, y, vertical)) return { x, y }
    throw DOES_NOT_FIT
  }

  const cx = int(rng, 4, 7)
  const frogLeft = chance(rng, 0.5)
  const fz = frogLeft ? [0, cx - 1] : [cx + 1, COLS - 1]
  const gz = frogLeft ? [cx + 1, COLS - 1] : [0, cx - 1]
  const gateY = int(rng, 2, 4)
  const detour = kind === 'wall' && index >= 1 && chance(rng, 0.35)
  const gapRow = detour ? ROWS - 1 : -1
  for (let y = 0; y < ROWS; y++) {
    if (kind === 'gate' && y === gateY) add('obj', 'rock', cx, y)
    else if (y !== gapRow) add('obj', 'wall', cx, y)
  }

  // FROG IS YOU: out of reach on the top row, or (later) in the middle where
  // the frog can push it apart and be left with nothing to steer.
  const youFragile = index >= 2 && chance(rng, 0.35)
  const you = youFragile ? spot3(fz[0]!, fz[1]!, 2, 4, false) : spot3(fz[0]!, fz[1]!, 0, 0, false)
  words('frog', 'you', you.x, you.y, false)
  if (kind !== 'swap') {
    const win = spot3(gz[0]!, gz[1]!, 0, 0, false)
    words('pad', 'win', win.x, win.y, false)
  }
  if (kind !== 'wall') {
    const stop = spot3(fz[0]!, fz[1]!, 6, 6, false)
    words('wall', 'stop', stop.x, stop.y, false)
  }

  let key = 0
  if (kind === 'wall' || kind === 'gate') {
    const vertical = chance(rng, 0.4)
    const at3 = vertical ? spot3(fz[0]! + 1, fz[1]! - 1, 1, 5, true) : spot3(fz[0]!, fz[1]!, 2, 4, false)
    key = words(kind === 'wall' ? 'wall' : 'rock', 'stop', at3.x, at3.y, vertical)[2]!
    if (kind === 'gate') {
      const loose = spot(fz[0]!, fz[1]!, 1, 5)
      add('prop', 'push', loose.x, loose.y)
    }
  } else {
    // PAD IS WIN with a spare ROCK noun one or two cells above or below the PAD
    // noun: push it in line and PAD is out, ROCK is in.
    for (let t = 0; t < 300 && key === 0; t++) {
      const x = int(rng, fz[0]!, fz[1]! - 2)
      const y = int(rng, 1, 5)
      const s = chance(rng, 0.5) ? 1 : -1
      const d = int(rng, 1, 2)
      const cells: Array<readonly [number, number]> = [[x, y], [x + 1, y], [x + 2, y], [x, y + s * d], [x, y + s * (d + 1)], [x, y - s]]
      if (d === 2) cells.push([x, y + s])
      if (!cells.every(([a, b]) => isFree(a, b))) continue
      words('pad', 'win', x, y, false)
      key = add('noun', 'rock', x, y + s * d)
      for (const [a, b] of cells.slice(4)) occ.add(at(a, b))
    }
    if (key === 0) throw DOES_NOT_FIT
    const rock = spot(fz[0]!, fz[1]!, 1, 5)
    add('obj', 'rock', rock.x, rock.y)
  }

  const pad = spot(gz[0]!, gz[1]!, 1, 5)
  add('obj', 'pad', pad.x, pad.y)
  const frog = spot(fz[0]!, fz[1]!, 1, 5)
  add('obj', 'frog', frog.x, frog.y)

  // Distractors: loose tiles (and, in a wall room, inert rocks). A tile that
  // would spell an unintended rule is taken back.
  const expected = kind === 'gate' ? 4 : 3
  const count = Math.min(3, 1 + Math.floor(index / 2))
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const [k, name] = kind === 'wall' && chance(rng, 0.5) ? (['obj', 'rock'] as const) : pick(rng, LOOSE)
      const s = spot(fz[0]!, fz[1]!, 1, 5)
      add(k, name, s.x, s.y)
      if (parseRules(ents).length === expected) break
      ents.pop()
      occ.delete(at(s.x, s.y))
      nextId--
    }
  }
  return { kind, ents, key, gap: detour }
}

// ---------------------------------------------------------------------------
// The sim
// ---------------------------------------------------------------------------

export interface PushableSnapshot {
  tick: number
  kind: RoomKind
  // Rooms solved so far this session.
  room: number
  status: 'play' | 'solved' | 'stuck'
  how: 'around' | 'rewrote' | null
  // Tiles and things, in grid cells. `live` marks a tile that is part of a rule.
  ents: Array<Ent & { live: boolean }>
  rules: string[]
  key: number
  // Null when the stars hook is removed.
  stars: number | null
  target: { x: number; y: number } | null
  // A pixel rectangle the idle hint points at, only ever set when hints are on.
  hint: Rect | null
  restart: Rect
  undo: Rect
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

const cellRect = (x: number, y: number): Rect => ({ x: OX + x * CELL, y: OY + y * CELL, w: CELL, h: CELL })
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

function cellAt(x: number, y: number): { x: number; y: number } | null {
  const cx = Math.floor((x - OX) / CELL)
  const cy = Math.floor((y - OY) / CELL)
  return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS ? { x: cx, y: cy } : null
}

// The first step of the shortest path over free cells; the target cell may hold
// a tile (the last step then pushes it). Null when there is no such path.
function routeDir(ents: readonly Ent[], from: { x: number; y: number }, to: { x: number; y: number }): readonly [number, number] | null {
  const flags = flagMap(parseRules(ents))
  const blocked = new Uint8Array(COLS * ROWS)
  for (const e of ents) {
    const push = e.kind !== 'obj' || flags.get(e.name)?.has('push')
    const stop = e.kind === 'obj' && flags.get(e.name)?.has('stop')
    const i = e.y * COLS + e.x
    if (stop && !push) blocked[i] = 2
    else if (push && blocked[i] === 0) blocked[i] = 1
  }
  const first = new Int8Array(COLS * ROWS).fill(-1)
  const seen = new Uint8Array(COLS * ROWS)
  const queue: number[] = [from.y * COLS + from.x]
  seen[queue[0]!] = 1
  const goal = to.y * COLS + to.x
  for (let q = 0; q < queue.length; q++) {
    const cur = queue[q]!
    const cxx = cur % COLS
    const cyy = Math.floor(cur / COLS)
    for (let di = 0; di < 4; di++) {
      const nx = cxx + DIRS[di]![0]
      const ny = cyy + DIRS[di]![1]
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue
      const i = ny * COLS + nx
      if (seen[i] || blocked[i] === 2) continue
      const dir = q === 0 ? di : first[cur]!
      if (i === goal) return DIRS[dir]!
      if (blocked[i] === 1) continue
      seen[i] = 1
      first[i] = dir
      queue.push(i)
    }
  }
  return null
}

export const createSim: CreateSim<PushableSnapshot> = (config): Sim<PushableSnapshot> => {
  const rng = createRng(config.seed)
  // Each hook is honoured only when it is in this list.
  const hooks = new Set(config.hooks)

  let room: Room
  let ents: Ent[] = []
  let startEnts: Ent[] = []
  let baseRules: string[] = []
  let history: Ent[][] = []
  let target: { x: number; y: number } | null = null
  const holding = new Set<number>()
  let walkTimer = 0
  let solveHold = 0
  let how: 'around' | 'rewrote' | null = null
  let solvedCount = 0
  let stars = 0
  let tick = 0
  let idleTicks = 0
  let lastKind: RoomKind | null = null
  let pending: SimEvent[] = []

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const loadRoom = () => {
    const kind = pick(rng, KINDS.filter((k) => k !== lastKind))
    lastKind = kind
    room = buildRoom(rng, kind, solvedCount)
    ents = room.ents
    startEnts = room.ents.map((e) => ({ ...e }))
    baseRules = ruleKeys(ents)
    history = []
    target = null
    walkTimer = 0
    solveHold = 0
    how = null
  }
  loadRoom()

  const flagsNow = () => flagMap(parseRules(ents))
  const objsWith = (p: Prop) => {
    const flags = flagsNow()
    return ents.filter((e) => e.kind === 'obj' && flags.get(e.name)?.has(p))
  }
  const firstYou = (): Ent | null => objsWith('you').sort((a, b) => a.id - b.id)[0] ?? null
  const rewrites = () => {
    const now = ruleKeys(ents)
    return baseRules.filter((k) => !now.includes(k)).length + now.filter((k) => !baseRules.includes(k)).length
  }

  const win = () => {
    solveHold = SOLVE_HOLD
    target = null
    how = rewrites() > 0 ? 'rewrote' : 'around'
    solvedCount++
    emit({ kind: 'state', name: 'solved' })
    if (hooks.has('stars')) {
      stars += how === 'rewrote' ? 2 : 1
      emit({ kind: 'hook', name: 'stars' })
    }
  }

  const move = (dx: number, dy: number): boolean => {
    const before = ruleKeys(ents)
    const hadYou = firstYou() !== null
    const r = applyMove(ents, dx, dy)
    if (!r.moved) return false
    history.push(ents)
    if (history.length > MAX_HISTORY) history.shift()
    ents = r.ents
    emit({ kind: 'state', name: r.pushed ? 'push' : 'move' })
    const after = ruleKeys(ents)
    for (const k of before) if (!after.includes(k)) emit({ kind: 'state', name: 'rule-broken' })
    for (const k of after) if (!before.includes(k)) emit({ kind: 'state', name: 'rule-made' })
    if (hadYou && firstYou() === null) emit({ kind: 'state', name: 'you-lost' })
    if (isWon(ents)) win()
    return true
  }

  const walk = () => {
    if (!target) return
    const you = firstYou()
    if (!you || (you.x === target.x && you.y === target.y)) {
      target = null
      return
    }
    walkTimer = WALK_TICKS
    const route = routeDir(ents, you, target)
    const dx = target.x - you.x
    const dy = target.y - you.y
    const along: Array<readonly [number, number]> = [[Math.sign(dx), 0], [0, Math.sign(dy)]]
    if (Math.abs(dy) > Math.abs(dx)) along.reverse()
    const tries = route ? [route] : along.filter(([a, b]) => a !== 0 || b !== 0)
    let moved = false
    for (const [a, b] of tries) {
      if (move(a, b)) {
        moved = true
        break
      }
    }
    const now = firstYou()
    if (!moved || !now || (target && now.x === target.x && now.y === target.y)) target = null
  }

  const setTarget = (c: { x: number; y: number }) => {
    target = c
    if (walkTimer <= 0) walk()
  }

  const undo = () => {
    const previous = history.pop()
    if (!previous) return
    ents = previous
    target = null
    emit({ kind: 'state', name: 'undo' })
  }

  const restart = () => {
    if (history.length === 0) return
    ents = startEnts.map((e) => ({ ...e }))
    history = []
    target = null
    emit({ kind: 'state', name: 'restart' })
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    if (phase === 'up') {
      holding.delete(id)
      return
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || solveHold > 0) return
    if (phase === 'down') {
      if (inside(RESTART, x, y)) return restart()
      if (inside(UNDO, x, y)) return undo()
      const c = cellAt(x, y)
      if (!c) return
      holding.add(id)
      setTarget(c)
    } else if (holding.has(id)) {
      const c = cellAt(x, y)
      if (c && (!target || c.x !== target.x || c.y !== target.y)) setTarget(c)
    }
  }

  const step = () => {
    tick++
    idleTicks++
    if (solveHold > 0) {
      solveHold--
      if (solveHold === 0) {
        loadRoom()
        emit({ kind: 'state', name: 'room' })
      }
      return
    }
    if (walkTimer > 0) walkTimer--
    if (target && walkTimer <= 0) walk()
  }

  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const e of ents) {
      if (e.kind === 'obj' && e.name !== 'pad' && e.name !== 'rock') continue
      const salience = e.kind === 'obj' ? (e.name === 'pad' ? 0.6 : 0.3) : e.id === room.key ? 0.6 : 0.4
      list.push({ ...cellRect(e.x, e.y), kind: 'tap', salience })
    }
    const stuck = solveHold === 0 && firstYou() === null
    list.push({ ...RESTART, kind: 'tap', salience: stuck ? 0.95 : 0.1 })
    list.push({ ...UNDO, kind: 'tap', salience: 0.1 })
    return list
  }

  // Has the room's own barrier given way? A wall or a rock plug stops being
  // STOP; in a swap room the WIN moved from the pad to the rock.
  const barrierOpen = (): boolean => {
    const flags = flagsNow()
    if (room.kind === 'swap') return flags.get('rock')?.has('win') ?? false
    return !flags.get(room.kind === 'wall' ? 'wall' : 'rock')?.has('stop')
  }

  // A discrete outcome class: which kind of room, whether its barrier has
  // given way, what wins, and whether anything is YOU. 3 x 2 x 4 x 2 = 48 in
  // play, plus 3 x 2 while a solved room is celebrated.
  const signature = (): string => {
    if (solveHold > 0) return `solved/${room.kind}/${how}`
    const flags = flagsNow()
    const winners = [...flags.entries()].filter(([, p]) => p.has('win')).map(([n]) => n)
    const winClass = winners.length === 0 ? 'none' : winners.length === 1 && (winners[0] === 'pad' || winners[0] === 'rock') ? winners[0] : 'other'
    const anyYou = [...flags.values()].some((p) => p.has('you'))
    return `${room.kind}/${barrierOpen() ? 'open' : 'shut'}/win-${winClass}/${anyYou ? 'you' : 'no-you'}`
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const yous = objsWith('you')
    const wins = objsWith('win')
    let gap = NO_GAP
    for (const y of yous) for (const w of wins) gap = Math.min(gap, Math.abs(y.x - w.x) + Math.abs(y.y - w.y))
    return {
      signature: signature(),
      features: { solved: solvedCount, padGap: gap, rules: ruleKeys(ents).length, rewrites: rewrites() },
      events,
    }
  }

  // The idle hint is only data for the view: the key tile, then the thing to
  // step on, or the restart button when nothing is YOU any more.
  const hint = (): Rect | null => {
    if (!config.hints || idleTicks < HINT_TICKS || solveHold > 0) return null
    if (firstYou() === null) return { ...RESTART }
    if (!barrierOpen()) {
      const key = ents.find((e) => e.id === room.key)
      return key ? cellRect(key.x, key.y) : null
    }
    const win = objsWith('win')[0]
    return win ? cellRect(win.x, win.y) : null
  }

  const snapshot = (): PushableSnapshot => {
    const rules = parseRules(ents)
    const live = new Set(rules.flatMap((r) => r.ids))
    const stuck = solveHold === 0 && firstYou() === null
    return {
      tick,
      kind: room.kind,
      room: solvedCount,
      status: solveHold > 0 ? 'solved' : stuck ? 'stuck' : 'play',
      how,
      ents: ents.map((e) => ({ ...e, live: live.has(e.id) })),
      rules: [...new Set(rules.map((r) => `${r.noun} is ${r.prop}`.toUpperCase()))].sort(),
      key: room.key,
      stars: hooks.has('stars') ? stars : null,
      target: target ? { ...target } : null,
      hint: hint(),
      restart: { ...RESTART },
      undo: { ...UNDO },
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
