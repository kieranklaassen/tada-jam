// Dip, Shrink, Sift. Marbles fall down a pegboard of five columns and six rows.
// The child puts pieces on the pegboard; every marble meets the piece in each
// row it passes, in order: a dip paints a plain marble, a shrinker makes it
// one size smaller, a fork sends it left or right by its colour, a sieve lets
// only small ones drop straight through, a slope shoves it sideways, a bell
// rings. Bins at the bottom ask for something (a colour, a size). What a fork
// or sieve does depends on what the marble has BECOME by then, so a dip above
// a fork is a different machine from a dip below it.
//
// Pure and deterministic: no DOM, no Vite globals, no clocks, no Math.random.
// The seed picks the marble bag and the orders, and ticks do the rest.

import { createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

// ---------------------------------------------------------------- geometry
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const COLS = 5
export const ROWS = 6
export const START_COL = 2
export const BOARD_X = 290
export const BOARD_Y = 100
export const COL_W = 170
export const ROW_H = 88
export const BIN_Y = 660
export const BIN_H = 130
export const TRAY_X = 30
export const TRAY_Y = 100
export const TRAY_W = 220
export const TRAY_H = 80
export const TRAY_STEP = 88

export const cellRect = (row: number, col: number): Rect => ({ x: BOARD_X + col * COL_W, y: BOARD_Y + row * ROW_H, w: COL_W, h: ROW_H })
export const trayRect = (index: number): Rect => ({ x: TRAY_X, y: TRAY_Y + index * TRAY_STEP, w: TRAY_W, h: TRAY_H })
export const binRect = (col: number): Rect => ({ x: BOARD_X + col * COL_W + 6, y: BIN_Y, w: COL_W - 12, h: BIN_H })
const colX = (col: number) => BOARD_X + col * COL_W + COL_W / 2
const rowY = (row: number) => (row < ROWS ? BOARD_Y + row * ROW_H + ROW_H / 2 : BIN_Y + 40)
const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

// ------------------------------------------------------------------ pieces
export const KINDS = ['slope', 'fork', 'dip', 'shrinker', 'sieve', 'bell'] as const
export type Kind = (typeof KINDS)[number]
export const PAINTS = ['red', 'blue', 'yellow'] as const
export type Paint = (typeof PAINTS)[number]
export type Color = 'gray' | Paint
// 1 small, 2 medium, 3 large.
export type Size = 1 | 2 | 3

export interface MarbleType {
  color: Color
  size: Size
}
// setting: slope 0 left / 1 right; fork and dip the paint; sieve 0 lets small
// through, 1 lets small and medium through. flip: a fork sends its matches
// right instead of left; a sieve shoves the rest left instead of right.
export interface Piece {
  kind: Kind
  setting: number
  flip: boolean
}
export type Grid = Array<Array<Piece | null>>

export interface Want {
  color?: Paint
  size?: Size
}

export const matches = (want: Want, type: MarbleType): boolean =>
  (want.color === undefined || want.color === type.color) && (want.size === undefined || want.size === type.size)

export interface Routed {
  type: MarbleType
  to: number
  note: string | null
}

// What one piece does to one marble in one column. The only place the rules live.
export function route(piece: Piece | null, type: MarbleType, col: number): Routed {
  const shift = (dir: number) => (col + dir >= 0 && col + dir < COLS ? col + dir : col)
  if (!piece) return { type, to: col, note: null }
  switch (piece.kind) {
    case 'slope':
      return { type, to: shift(piece.setting === 0 ? -1 : 1), note: 'slid' }
    case 'fork': {
      const dir = (type.color === PAINTS[piece.setting % 3] ? -1 : 1) * (piece.flip ? -1 : 1)
      return { type, to: shift(dir), note: dir < 0 ? 'fork-left' : 'fork-right' }
    }
    case 'dip':
      // Only a plain marble takes the paint.
      return type.color === 'gray'
        ? { type: { color: PAINTS[piece.setting % 3]!, size: type.size }, to: col, note: 'painted' }
        : { type, to: col, note: null }
    case 'shrinker':
      return type.size > 1
        ? { type: { color: type.color, size: (type.size - 1) as Size }, to: col, note: 'shrunk' }
        : { type, to: col, note: null }
    case 'sieve': {
      const through = type.size <= piece.setting + 1
      return { type, to: through ? col : shift(piece.flip ? -1 : 1), note: through ? 'sieve-through' : 'sieve-aside' }
    }
    case 'bell':
      return { type, to: col, note: 'rang' }
  }
}

// ----------------------------------------------------------------- marbles
interface Marble {
  type: MarbleType
  orig: MarbleType
  row: number
  col: number
  to: number
  t: number
  sawFork: boolean
  sawSieve: boolean
}

const newMarble = (orig: MarbleType): Marble => ({ type: orig, orig, row: 0, col: START_COL, to: START_COL, t: 0, sawFork: false, sawSieve: false })

// A marble reaches a cell. `notes` collects what happened, including the order
// effects: a chain fires when the marble is sent somewhere it would NOT have
// gone had it arrived as it started.
function arrive(m: Marble, piece: Piece | null, notes: string[]): void {
  const r = route(piece, m.type, m.col)
  if (piece) {
    if (piece.kind === 'fork') {
      if (m.type.color !== m.orig.color && route(piece, { ...m.type, color: m.orig.color }, m.col).to !== r.to) notes.push('chain-color')
      m.sawFork = true
    } else if (piece.kind === 'sieve') {
      if (m.type.size !== m.orig.size && route(piece, { ...m.type, size: m.orig.size }, m.col).to !== r.to) notes.push('chain-size')
      m.sawSieve = true
    } else if (piece.kind === 'dip' && r.note === 'painted' && m.sawFork) notes.push('late-paint')
    else if (piece.kind === 'shrinker' && r.note === 'shrunk' && m.sawSieve) notes.push('late-shrink')
  }
  if (r.note) notes.push(r.note)
  m.type = r.type
  m.to = r.to
}

export interface Trace {
  col: number
  final: MarbleType
  chainColor: boolean
  chainSize: boolean
  visited: Array<[number, number]>
}

// A dry run of one marble through the machine as it stands. Changes nothing.
export function traceType(cells: Grid, origin: MarbleType): Trace {
  const m = newMarble(origin)
  const notes: string[] = []
  const visited: Array<[number, number]> = []
  for (let row = 0; row < ROWS; row++) {
    visited.push([row, m.col])
    arrive(m, cells[row]![m.col] ?? null, notes)
    m.col = m.to
  }
  return { col: m.col, final: m.type, chainColor: notes.includes('chain-color'), chainSize: notes.includes('chain-size'), visited }
}

// ----------------------------------------------------------- bag and orders
function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const keep = items[i]!
    items[i] = items[j]!
    items[j] = keep
  }
  return items
}

// Six marbles that come round and round. Always: two plain ones (something to
// dip), a medium (something a shrinker changes), a small and a large.
export function makeBag(rng: Rng): MarbleType[] {
  const anyColor = () => pick(rng, ['gray', ...PAINTS] as const)
  const anySize = () => int(rng, 1, 3) as Size
  return shuffle(rng, [
    { color: 'gray', size: pick(rng, [1, 3] as const) },
    { color: 'gray', size: 2 },
    { color: pick(rng, PAINTS), size: 1 },
    { color: pick(rng, PAINTS), size: 3 },
    { color: anyColor(), size: anySize() },
    { color: anyColor(), size: anySize() },
  ])
}

interface Bin {
  want: Want | null
  // Verdicts of the last three marbles that landed here.
  recent: boolean[]
}

// Level 1: a colour and a size. Level 2: two colours and a size. Level 3 asks
// for a small one of a colour as well, which needs both kinds of chain.
function makeBins(rng: Rng, level: number): Bin[] {
  const paints = shuffle(rng, [...PAINTS])
  const size: Want = { size: pick(rng, [1, 3] as const) }
  const wants: Want[] =
    level <= 1 ? [{ color: paints[0]! }, size] : level === 2 ? [{ color: paints[0]! }, { color: paints[1]! }, size] : [{ color: paints[0]!, size: 1 }, { color: paints[1]! }, size]
  // The middle bin sits under the dispenser and catches whatever falls straight
  // down, so an empty board never already meets an order.
  const places = shuffle(rng, [0, 1, 3, 4])
  const bins: Bin[] = Array.from({ length: COLS }, () => ({ want: null, recent: [] }))
  wants.forEach((want, i) => {
    bins[places[i]!]!.want = want
  })
  return bins
}

const isContent = (bin: Bin) => bin.want !== null && bin.recent.length === 3 && bin.recent.every(Boolean)

// ------------------------------------------------------------------- the sim
const ROW_TICKS = 12
const DISPENSE_EVERY = 30
const FIRST_DISPENSE = 8
const TAP_MOVE = 24
const HOLD_TICKS = 10
const HINT_AFTER_TICKS = 150
const RING_TICKS = 24
const MAX_EVENTS = 64
const MAX_LEVEL = 3

export interface DipSnapshot {
  tick: number
  cells: Array<Array<Piece | null>>
  marbles: Array<{ x: number; y: number; color: Color; size: Size }>
  bins: Array<{ want: Want | null; recent: boolean[]; content: boolean }>
  rings: Array<{ row: number; col: number; color: Color; size: Size; ttl: number }>
  bag: MarbleType[]
  // Index in the bag of the next marble to drop.
  bagIndex: number
  // The piece a tap on an empty cell puts down (the last one picked from the tray).
  brush: Kind
  carrying: { kind: Kind; x: number; y: number } | null
  level: number
  // Orders finished; null when the orders hook is removed.
  orders: number | null
  hint: { from: { x: number; y: number }; to: { x: number; y: number } | null } | null
}

type Spot = { zone: 'tray'; index: number } | { zone: 'cell'; row: number; col: number }

export function locate(x: number, y: number): Spot | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (x >= TRAY_X && x <= TRAY_X + TRAY_W) {
    const index = Math.floor((y - TRAY_Y) / TRAY_STEP)
    return index >= 0 && index < KINDS.length && y - TRAY_Y - index * TRAY_STEP <= TRAY_H ? { zone: 'tray', index } : null
  }
  if (x >= BOARD_X && x < BOARD_X + COLS * COL_W && y >= BOARD_Y && y < BOARD_Y + ROWS * ROW_H) {
    return { zone: 'cell', row: Math.floor((y - BOARD_Y) / ROW_H), col: Math.floor((x - BOARD_X) / COL_W) }
  }
  return null
}

interface Grab {
  from: Spot
  startX: number
  startY: number
  x: number
  y: number
  startTick: number
}

export const createSim: CreateSim<DipSnapshot> = (config): Sim<DipSnapshot> => {
  const rng = createRng(config.seed)
  // Only `orders` is a hook. An empty list means the first order stays for good.
  const hooks = new Set(config.hooks)
  const bag = makeBag(rng)
  const cells: Grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null as Piece | null))
  let level = 1
  let bins = makeBins(rng, level)
  let orders = 0
  let met = false
  let marbles: Marble[] = []
  let rings: Array<{ row: number; col: number; color: Color; size: Size; ttl: number }> = []
  let arrivals: Array<'right' | 'wrong' | 'neutral'> = []
  const grabs = new Map<number, Grab>()
  let brush: Kind = 'dip'
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let bagIndex = 0
  let nextDrop = FIRST_DISPENSE
  let version = 0
  let cache: { version: number; chainColor: boolean; chainSize: boolean; spread: number; pieces: number; paths: Array<[number, number]> } | null = null

  const push = (kind: SimEvent['kind'], name: string) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind, name })
  }
  const emit = (name: string) => push('state', name)
  const emitHook = (name: string) => push('hook', name)

  const pieceCount = () => cells.reduce((sum, row) => sum + row.filter(Boolean).length, 0)
  const contentCount = () => bins.filter(isContent).length
  const wantCount = () => bins.filter((b) => b.want !== null).length

  // ------------------------------------------------------------ the machine
  const changed = () => {
    version++
  }

  const analysis = () => {
    if (cache && cache.version === version) return cache
    const traces = bag.map((t) => traceType(cells, t))
    cache = {
      version,
      chainColor: traces.some((t) => t.chainColor),
      chainSize: traces.some((t) => t.chainSize),
      // How many different bins the bag reaches through the machine as it stands.
      spread: new Set(traces.map((t) => t.col)).size,
      // Pieces only appear or vanish through paths that call changed().
      pieces: pieceCount(),
      paths: traces.flatMap((t) => t.visited),
    }
    return cache
  }

  // A new dip or fork comes set to the first colour an order asks for (left to
  // right), so the first chain a child builds is not spoilt by a paint that
  // matches nothing. Tapping the piece steps it to the other paints.
  const firstWantedPaint = () => {
    const wanted = bins.find((b) => b.want?.color !== undefined)?.want?.color
    return wanted === undefined ? 0 : PAINTS.indexOf(wanted)
  }

  const place = (kind: Kind, row: number, col: number) => {
    cells[row]![col] = { kind, setting: kind === 'dip' || kind === 'fork' ? firstWantedPaint() : 0, flip: false }
    changed()
    emit('placed')
  }

  const cycle = (piece: Piece) => {
    if (piece.kind === 'slope') piece.setting = 1 - piece.setting
    else if (piece.kind === 'fork' || piece.kind === 'dip') piece.setting = (piece.setting + 1) % 3
    else if (piece.kind === 'sieve') piece.setting = (piece.setting + 1) % 2
    else return emit('touched')
    changed()
    emit('cycled')
  }

  // A hold flips a fork or sieve to its other side; on anything else it cycles.
  const flip = (piece: Piece) => {
    if (piece.kind === 'fork' || piece.kind === 'sieve') {
      piece.flip = !piece.flip
      changed()
      emit('flipped')
    } else cycle(piece)
  }

  // --------------------------------------------------------------- marbles
  const land = (m: Marble) => {
    const bin = bins[m.col]!
    if (!bin.want) {
      arrivals.push('neutral')
    } else {
      const ok = matches(bin.want, m.type)
      bin.recent.push(ok)
      if (bin.recent.length > 3) bin.recent.shift()
      arrivals.push(ok ? 'right' : 'wrong')
      emit(ok ? 'bin-right' : 'bin-wrong')
    }
    if (arrivals.length > 12) arrivals.shift()
    if (!met && wantCount() > 0 && contentCount() === wantCount()) {
      met = true
      emit('order-met')
      if (hooks.has('orders')) {
        orders++
        level = Math.min(MAX_LEVEL, level + 1)
        bins = makeBins(rng, level)
        arrivals = []
        met = false
        emitHook('orders')
      }
    }
  }

  const meet = (m: Marble) => {
    const notes: string[] = []
    arrive(m, cells[m.row]![m.col] ?? null, notes)
    for (const note of notes) emit(note)
    if (notes.includes('rang')) {
      rings.push({ row: m.row, col: m.col, color: m.type.color, size: m.type.size, ttl: RING_TICKS })
      if (rings.length > 12) rings.shift()
    }
  }

  const drop = () => {
    const m = newMarble(bag[bagIndex % bag.length]!)
    bagIndex = (bagIndex + 1) % bag.length
    marbles.push(m)
    meet(m)
  }

  // ---------------------------------------------------------------- pointer
  const release = (id: number) => {
    const g = grabs.get(id)
    if (!g) return
    grabs.delete(id)
    const moved = Math.hypot(g.x - g.startX, g.y - g.startY) >= TAP_MOVE
    const spot = locate(g.x, g.y)
    if (g.from.zone === 'tray') {
      const kind = KINDS[g.from.index]!
      brush = kind
      if (!moved) emit('selected')
      else if (spot && spot.zone === 'cell') place(kind, spot.row, spot.col)
      return
    }
    const { row, col } = g.from
    const piece = cells[row]![col] ?? null
    if (!moved) {
      if (!piece) place(brush, row, col)
      else if (tick - g.startTick >= HOLD_TICKS) flip(piece)
      else cycle(piece)
      return
    }
    if (!piece) return
    if (spot && spot.zone === 'cell') {
      if (spot.row === row && spot.col === col) return
      cells[row]![col] = cells[spot.row]![spot.col] ?? null
      cells[spot.row]![spot.col] = piece
      changed()
      emit('moved')
    } else {
      cells[row]![col] = null
      changed()
      emit('removed')
    }
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      release(id)
      const spot = locate(x, y)
      if (spot) grabs.set(id, { from: spot, startX: x, startY: y, x, y, startTick: tick })
      return
    }
    const g = grabs.get(id)
    if (g && finite) {
      g.x = x
      g.y = y
    }
    if (phase === 'up') release(id)
  }

  // ------------------------------------------------------------------- step
  const step = () => {
    tick++
    idleTicks++
    rings = rings.filter((r) => --r.ttl > 0)
    const flying: Marble[] = []
    for (const m of marbles) {
      m.t++
      if (m.t >= ROW_TICKS) {
        m.t = 0
        m.col = m.to
        m.row++
        if (m.row >= ROWS) {
          land(m)
          continue
        }
        meet(m)
      }
      flying.push(m)
    }
    marbles = flying
    if (tick >= nextDrop) {
      nextDrop += DISPENSE_EVERY
      drop()
    }
  }

  // ------------------------------------------------------------ affordances
  // The tray, every placed piece, and the empty cells the bag actually rolls
  // through. Reading this changes nothing.
  const affordances = (): Affordance[] => {
    const list: Affordance[] = KINDS.map((kind, i) => ({ ...trayRect(i), kind: 'drag' as const, salience: brush === kind ? 0.55 : 0.4 }))
    const seen = new Set<string>()
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) if (cells[row]![col]) list.push({ ...cellRect(row, col), kind: 'tap', salience: 0.6 })
    }
    for (const [row, col] of analysis().paths) {
      const key = `${row}:${col}`
      if (seen.has(key) || cells[row]![col]) continue
      seen.add(key)
      list.push({ ...cellRect(row, col), kind: 'tap', salience: Math.max(0.15, 0.5 - row * 0.06) })
    }
    return list
  }

  // ---------------------------------------------------------------- observe
  const observe = (): Observation => {
    const events = pending
    pending = []
    const a = analysis()
    const content = contentCount()
    const chain = a.chainColor && a.chainSize ? 'both' : a.chainColor ? 'painted' : a.chainSize ? 'shrunk' : 'none'
    const rights = arrivals.filter((v) => v === 'right').length
    return {
      // Which chains are alive, how many bins the marbles reach (1, 2, 3 or more),
      // how many bins are content (0, 1, 2 or more): 4 x 3 x 3 = 36.
      signature: `${chain}/${Math.min(3, a.spread)}/${Math.min(2, content)}`,
      features: {
        content,
        purity: arrivals.length === 0 ? 0 : rights / arrivals.length,
        pieces: a.pieces,
        chains: (a.chainColor ? 1 : 0) + (a.chainSize ? 1 : 0),
        order: level,
      },
      events,
    }
  }

  // Data only: it never changes what the sim does.
  const hint = (): DipSnapshot['hint'] => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS) return null
    if (pieceCount() === 0) return { from: centre(trayRect(KINDS.indexOf('dip'))), to: centre(cellRect(0, START_COL)) }
    for (let row = 0; row < ROWS - 1; row++) {
      for (let col = 0; col < COLS; col++) {
        const piece = cells[row]![col]
        if (!piece || (piece.kind !== 'dip' && piece.kind !== 'shrinker') || cells[row + 1]![col]) continue
        return { from: centre(trayRect(KINDS.indexOf(piece.kind === 'dip' ? 'fork' : 'sieve'))), to: centre(cellRect(row + 1, col)) }
      }
    }
    const waiting = bins.findIndex((b) => b.want !== null && !isContent(b))
    return waiting >= 0 ? { from: centre(binRect(waiting)), to: null } : null
  }

  const snapshot = (): DipSnapshot => {
    const carried = [...grabs.values()].find((g) => g.from.zone === 'tray' || cells[g.from.row]![g.from.col])
    let carrying: DipSnapshot['carrying'] = null
    if (carried && Math.hypot(carried.x - carried.startX, carried.y - carried.startY) >= TAP_MOVE) {
      const kind = carried.from.zone === 'tray' ? KINDS[carried.from.index]! : cells[carried.from.row]![carried.from.col]!.kind
      carrying = { kind, x: carried.x, y: carried.y }
    }
    return {
      tick,
      cells: cells.map((row) => row.map((p) => (p ? { ...p } : null))),
      marbles: marbles.map((m) => {
        const f = m.t / ROW_TICKS
        const y0 = rowY(m.row)
        return { x: colX(m.col) + (colX(m.to) - colX(m.col)) * f, y: y0 + (rowY(m.row + 1) - y0) * f, color: m.type.color, size: m.type.size }
      }),
      bins: bins.map((b) => ({ want: b.want ? { ...b.want } : null, recent: [...b.recent], content: isContent(b) })),
      rings: rings.map((r) => ({ ...r })),
      bag: bag.map((t) => ({ ...t })),
      bagIndex,
      brush,
      carrying,
      level,
      orders: hooks.has('orders') ? orders : null,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
