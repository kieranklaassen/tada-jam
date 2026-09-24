// Tidy Ants. A cross-section of sand, seen from the side. The child pours
// beads onto it (hold to pour, tap a cup to choose a colour, tap the sand to
// plant a seed bead). Eight ants wander the sand: an ant lifts a bead that has
// no friends beside it and sets it down next to beads of its own colour, so
// heaps grow with nobody planning them. A seed bead is one the ants never
// lift, and an ant carrying that colour walks to it from anywhere: plant a
// seed where a heap should start and the colour gathers there.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now,
// or performance.now. It reads a seeded rng and counts ticks, nothing else.
// State changes only inside step() and pointer().

import { createRng, int } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// The sand is a grid of cells, one bead to a cell.
export const CELL = 40
export const COLS = 29
export const ROWS = 17
export const SAND: Rect = { x: 10, y: 120, w: COLS * CELL, h: ROWS * CELL }

export const COLOUR_NAMES = ['red', 'blue', 'yellow', 'green', 'pink'] as const
export const COLOUR_HEX = ['#d9412f', '#2f6fc9', '#f0b62a', '#3aa55b', '#e07ab5'] as const
const BASE_COLOURS = 4
const PINK = 4

const cupRect = (i: number): Rect => ({ x: 24 + i * 128, y: 16, w: 112, h: 84 })
export const SHAKE: Rect = { x: 900, y: 16, w: 120, h: 84 }
export const TIP: Rect = { x: 1036, y: 16, w: 120, h: 84 }

// A finger is not a pixel: buttons and the sand edge forgive this much.
const HIT_SLOP = 14
// A touch shorter than this that barely moves is a tap; longer, or dragged, it pours.
const TAP_TICKS = 7
const TAP_MOVE = 26
const POUR_EVERY = 3
const HANDFUL = 6
const MAX_LOOSE = 96
const MAX_SEEDS = 6

const ANT_COUNT = 8
// One ant move every MOVE_TICKS ticks (about 7 cells a second).
const MOVE_TICKS = 4
const SEE_LONE = 7
const SEE_HOME = 12
const CARRY_LIMIT = 260
// Deneubourg-style thresholds: a lone bead is lifted almost surely, a bead in
// a crowd of its own colour almost never; the reverse for setting one down.
const K_PICK = 0.1
const K_DROP = 0.1
// Same-colour neighbours (of 24) that make a heap count as full-sized.
const HEAP_FULL = 8
const SEED_SETTLED = 0.85
const FAR_FROM_SEED = 0.5
// A bead less settled than this is one the ants go looking for.
const LONE = 0.22

const HEAP_MIN = 4
const TIDY_RATIO = 0.8
const CHEER_TICKS = 90
const CHEER_GAP = 240
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

interface Ant {
  c: number
  r: number
  x: number
  y: number
  dx: number
  dy: number
  carry: number
  carryMoves: number
  phase: number
}

interface Touch {
  kind: 'sand' | 'cup'
  cup: number
  x: number
  y: number
  startX: number
  startY: number
  startTick: number
  moved: boolean
  lastPour: number
}

interface Heap {
  colour: number
  size: number
  cx: number
  cy: number
  seeded: boolean
}

interface Stats {
  loose: number
  seeds: number
  heapCount: number
  best: Heap[]
  tidy: number
  tidyNow: boolean
  cornered: number
  stage: 'bare' | 'mixed' | 'heaping' | 'tidy'
  seedClass: 0 | 1 | 2
}

// Plain data the view draws from (contract: snapshot).
export interface TidySnapshot {
  tick: number
  sand: Rect
  cups: Array<Rect & { name: string; colour: string | null; selected: boolean }>
  shake: Rect
  tip: Rect
  beads: Array<{ x: number; y: number; colour: string; hex: string; seed: boolean }>
  ants: Array<{ x: number; y: number; dx: number; dy: number; carry: string | null }>
  inHand: string
  touches: Array<{ x: number; y: number }>
  // The biggest heap of each colour that has one, in cell units.
  heaps: Array<{ colour: string; size: number; cx: number; cy: number; seeded: boolean }>
  tidy: number
  stage: string
  // True while the cheer shows (always false when the tidy hook is removed).
  cheer: boolean
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inflated = (rect: Rect, slop: number, x: number, y: number) =>
  x >= rect.x - slop && x <= rect.x + rect.w + slop && y >= rect.y - slop && y <= rect.y + rect.h + slop
const idx = (c: number, r: number) => r * COLS + c
const cellCentre = (c: number, r: number) => ({ x: SAND.x + c * CELL + CELL / 2, y: SAND.y + r * CELL + CELL / 2 })

const inCorner = (cx: number, cy: number) => (cx <= 6 || cx >= COLS - 7) && (cy <= 4 || cy >= ROWS - 5)

export const createSim: CreateSim<TidySnapshot> = (config): Sim<TidySnapshot> => {
  const rng: Rng = createRng(config.seed)
  // (contract: hooks) Each hook is honoured only when it is in this list.
  const hooks = new Set(config.hooks)

  const colourAt: number[] = new Array<number>(COLS * ROWS).fill(-1)
  const seedAt: boolean[] = new Array<boolean>(COLS * ROWS).fill(false)
  const seedOrder: number[] = []
  let looseN = 0
  let version = 0

  const ants: Ant[] = []
  for (let i = 0; i < ANT_COUNT; i++) {
    const c = int(rng, 0, COLS - 1)
    const r = int(rng, 0, ROWS - 1)
    const at = cellCentre(c, r)
    const dir = DIRS[int(rng, 0, 7)]!
    ants.push({ c, r, x: at.x, y: at.y, dx: dir[0], dy: dir[1], carry: -1, carryMoves: 0, phase: i % MOVE_TICKS })
  }

  const touches = new Map<number, Touch>()
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  // -1 is the mix cup.
  let inHand = -1
  let everTidy = false
  let wasTidy = false
  let pinkUnlocked = false
  let lastCheer = -100000
  let cheerUntil = -1

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  // ---- the grid ----------------------------------------------------------

  const putBead = (i: number, colour: number, seed: boolean) => {
    colourAt[i] = colour
    seedAt[i] = seed
    if (seed) seedOrder.push(i)
    else looseN++
    version++
  }

  const takeBead = (i: number) => {
    if (colourAt[i]! < 0) return
    if (seedAt[i]) seedOrder.splice(seedOrder.indexOf(i), 1)
    else looseN--
    colourAt[i] = -1
    seedAt[i] = false
    version++
  }

  const cellOf = (x: number, y: number) => ({
    c: clamp(Math.floor((x - SAND.x) / CELL), 0, COLS - 1),
    r: clamp(Math.floor((y - SAND.y) / CELL), 0, ROWS - 1),
  })

  // A free cell near (c0, r0): the smallest square around it that has room,
  // then one of its free cells at random. Piles fill from the middle out.
  const freeNear = (c0: number, r0: number, spread: number): number => {
    for (let radius = spread; radius <= Math.max(COLS, ROWS); radius++) {
      const options: number[] = []
      for (let r = Math.max(0, r0 - radius); r <= Math.min(ROWS - 1, r0 + radius); r++) {
        for (let c = Math.max(0, c0 - radius); c <= Math.min(COLS - 1, c0 + radius); c++) {
          if (colourAt[idx(c, r)]! < 0) options.push(idx(c, r))
        }
      }
      if (options.length > 0) return options[int(rng, 0, options.length - 1)]!
    }
    return -1
  }

  const availableColours = () => (pinkUnlocked ? BASE_COLOURS + 1 : BASE_COLOURS)
  const randomColour = () => int(rng, 0, availableColours() - 1)

  const pourOne = (x: number, y: number) => {
    if (looseN >= MAX_LOOSE) return
    const { c, r } = cellOf(x, y)
    const i = freeNear(c, r, 1)
    if (i < 0) return
    putBead(i, inHand >= 0 ? inHand : randomColour(), false)
    emit({ kind: 'state', name: 'pour' })
  }

  const handful = (x: number, y: number) => {
    for (let n = 0; n < HANDFUL; n++) pourOne(x, y)
  }

  const plantSeed = (c: number, r: number, colour: number) => {
    const i = idx(c, r)
    takeBead(i)
    if (seedOrder.length >= MAX_SEEDS) {
      // The oldest seed goes back to being an ordinary bead.
      const old = seedOrder.shift()!
      seedAt[old] = false
      looseN++
    }
    putBead(i, colour, true)
    emit({ kind: 'state', name: 'plant' })
  }

  // ---- neighbours and stats ----------------------------------------------

  // Beads in the 5 by 5 square round a cell (not the cell itself): how many
  // are this colour, and how many there are of any colour.
  const around = (c: number, r: number, colour: number): { same: number; all: number } => {
    let same = 0
    let all = 0
    for (let nr = Math.max(0, r - 2); nr <= Math.min(ROWS - 1, r + 2); nr++) {
      for (let nc = Math.max(0, c - 2); nc <= Math.min(COLS - 1, c + 2); nc++) {
        if (nc === c && nr === r) continue
        const k = colourAt[idx(nc, nr)]!
        if (k < 0) continue
        all++
        if (k === colour) same++
      }
    }
    return { same, all }
  }

  const seedNear = (c: number, r: number, colour: number): boolean => {
    for (let nr = Math.max(0, r - 2); nr <= Math.min(ROWS - 1, r + 2); nr++) {
      for (let nc = Math.max(0, c - 2); nc <= Math.min(COLS - 1, c + 2); nc++) {
        const j = idx(nc, nr)
        if (seedAt[j] && colourAt[j] === colour) return true
      }
    }
    return false
  }

  const hasSeed = (colour: number): boolean => seedOrder.some((i) => colourAt[i] === colour)

  // How settled a bead of this colour would be at this cell, 0 to 1: how pure
  // its neighbourhood is, scaled down for a small handful (a pair is not a
  // heap yet). A seed of its colour nearby settles it for good; a heap far
  // from the seed of its colour is only half as settled.
  const settled = (c: number, r: number, colour: number): number => {
    const { same, all } = around(c, r, colour)
    const f = all === 0 ? 0 : (same / all) * Math.min(1, same / HEAP_FULL)
    if (seedNear(c, r, colour)) return Math.max(f, SEED_SETTLED)
    return hasSeed(colour) ? f * FAR_FROM_SEED : f
  }

  let cachedStats: Stats | null = null
  let cachedVersion = -1

  const computeStats = (): Stats => {
    const totals = new Array<number>(COLOUR_NAMES.length).fill(0)
    const best: Array<Heap | null> = new Array<Heap | null>(COLOUR_NAMES.length).fill(null)
    let heapCount = 0
    const seen = new Uint8Array(COLS * ROWS)
    const stack: number[] = []
    for (let i = 0; i < colourAt.length; i++) {
      const colour = colourAt[i]!
      if (colour < 0) continue
      totals[colour]!++
      if (seen[i]) continue
      let size = 0
      let sumC = 0
      let sumR = 0
      let seeded = false
      seen[i] = 1
      stack.push(i)
      while (stack.length > 0) {
        const j = stack.pop()!
        const c = j % COLS
        const r = Math.floor(j / COLS)
        size++
        sumC += c
        sumR += r
        if (seedAt[j]) seeded = true
        for (const [dx, dy] of DIRS) {
          const nc = c + dx
          const nr = r + dy
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue
          const k = idx(nc, nr)
          if (!seen[k] && colourAt[k] === colour) {
            seen[k] = 1
            stack.push(k)
          }
        }
      }
      if (size >= HEAP_MIN) heapCount++
      const current = best[colour]
      if (!current || size > current.size) best[colour] = { colour, size, cx: sumC / size, cy: sumR / size, seeded }
    }

    const heaps = best.filter((h): h is Heap => h !== null && h.size >= HEAP_MIN)
    const qualifying = totals.map((t, k) => (t >= HEAP_MIN ? k : -1)).filter((k) => k >= 0)
    const ratios = qualifying.map((k) => (best[k] ? best[k]!.size / totals[k]! : 0))
    const tidy = ratios.length === 0 ? 0 : ratios.reduce((a, b) => a + b, 0) / ratios.length
    const tidyNow = qualifying.length >= 2 && ratios.every((q) => q >= TIDY_RATIO)
    const cornered = heaps.filter((h) => inCorner(h.cx, h.cy)).length
    const seededN = heaps.filter((h) => h.seeded).length
    const seedClass: 0 | 1 | 2 = seededN === 0 ? 0 : seededN === heaps.length ? 2 : 1
    const loose = looseN
    const stage = loose === 0 ? 'bare' : heaps.length === 0 ? 'mixed' : tidyNow ? 'tidy' : 'heaping'
    return { loose, seeds: seedOrder.length, heapCount, best: heaps, tidy, tidyNow, cornered, stage, seedClass }
  }

  const stats = (): Stats => {
    if (cachedStats === null || cachedVersion !== version) {
      cachedStats = computeStats()
      cachedVersion = version
    }
    return cachedStats
  }

  // ---- the ants ----------------------------------------------------------

  const stepAnt = (a: Ant, dx: number, dy: number) => {
    const nc = a.c + dx
    const nr = a.r + dy
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) {
      // Bump the wall and turn round.
      a.dx = -a.dx || 1
      a.dy = -a.dy
      return
    }
    a.c = nc
    a.r = nr
    a.dx = dx
    a.dy = dy
  }

  const randomStep = (a: Ant) => {
    const [dx, dy] = DIRS[int(rng, 0, 7)]!
    stepAnt(a, dx, dy)
  }

  const wander = (a: Ant) => {
    // Mostly straight on, sometimes a new heading.
    if (rng() < 0.3) {
      const [dx, dy] = DIRS[int(rng, 0, 7)]!
      a.dx = dx
      a.dy = dy
    }
    stepAnt(a, a.dx, a.dy)
  }

  const walkToward = (a: Ant, tc: number, tr: number) => {
    if (rng() < 0.2) return randomStep(a)
    stepAnt(a, Math.sign(tc - a.c), Math.sign(tr - a.r))
  }

  // The nearest bead with no friends beside it, within sight.
  const nearestLone = (a: Ant): { c: number; r: number } | null => {
    let best: { c: number; r: number } | null = null
    let bestD = Infinity
    for (let r = Math.max(0, a.r - SEE_LONE); r <= Math.min(ROWS - 1, a.r + SEE_LONE); r++) {
      for (let c = Math.max(0, a.c - SEE_LONE); c <= Math.min(COLS - 1, a.c + SEE_LONE); c++) {
        const i = idx(c, r)
        const colour = colourAt[i]!
        if (colour < 0 || seedAt[i]) continue
        if (settled(c, r, colour) >= LONE) continue
        const d = (c - a.c) ** 2 + (r - a.r) ** 2
        if (d < bestD) {
          bestD = d
          best = { c, r }
        }
      }
    }
    return best
  }

  // Where a laden ant is headed: the nearest seed of its colour (smelled from
  // anywhere), else the nearest bead of its colour in sight.
  const homeFor = (a: Ant): { c: number; r: number } | null => {
    let best: { c: number; r: number } | null = null
    let bestD = Infinity
    for (const i of seedOrder) {
      if (colourAt[i] !== a.carry) continue
      const c = i % COLS
      const r = Math.floor(i / COLS)
      const d = (c - a.c) ** 2 + (r - a.r) ** 2
      if (d < bestD) {
        bestD = d
        best = { c, r }
      }
    }
    if (best) return best
    // No seed: head for the fullest heap in sight, nearer counting for more.
    let bestScore = -1
    for (let r = Math.max(0, a.r - SEE_HOME); r <= Math.min(ROWS - 1, a.r + SEE_HOME); r++) {
      for (let c = Math.max(0, a.c - SEE_HOME); c <= Math.min(COLS - 1, a.c + SEE_HOME); c++) {
        if (colourAt[idx(c, r)] !== a.carry) continue
        const { same, all } = around(c, r, a.carry)
        const score = ((all === 0 ? 0 : (same * same) / all) + 1) / (2 + Math.hypot(c - a.c, r - a.r))
        if (score > bestScore) {
          bestScore = score
          best = { c, r }
        }
      }
    }
    return best
  }

  const act = (a: Ant) => {
    const i = idx(a.c, a.r)
    if (a.carry < 0) {
      const colour = colourAt[i]!
      if (colour >= 0 && !seedAt[i]) {
        const f = settled(a.c, a.r, colour)
        const q = K_PICK / (K_PICK + f)
        if (rng() < q * q) {
          a.carry = colour
          a.carryMoves = 0
          takeBead(i)
          return
        }
      }
      const lone = nearestLone(a)
      if (lone) walkToward(a, lone.c, lone.r)
      else wander(a)
      return
    }

    a.carryMoves++
    if (colourAt[i]! < 0) {
      const f = settled(a.c, a.r, a.carry)
      const q = f / (K_DROP + f)
      const forced = a.carryMoves > CARRY_LIMIT
      // With a seed of its colour on the sand an ant sets its bead down only
      // beside a seed: it walks there first.
      const onTheWay = hasSeed(a.carry) && !seedNear(a.c, a.r, a.carry)
      if (forced || (f > 0 && !onTheWay && rng() < q * q)) {
        putBead(i, a.carry, false)
        if (f > 0) emit({ kind: 'state', name: 'ant-drop' })
        a.carry = -1
        return
      }
    }
    const home = homeFor(a)
    if (home && Math.max(Math.abs(home.c - a.c), Math.abs(home.r - a.r)) > 2) walkToward(a, home.c, home.r)
    else if (home) randomStep(a)
    else wander(a)
  }

  // ---- child input -------------------------------------------------------

  const cupCount = () => (pinkUnlocked ? 6 : 5)

  // The nearest cup under a finger, with slop. Index 0 is the mix cup.
  const cupAt = (x: number, y: number): number => {
    for (let i = 0; i < cupCount(); i++) if (inflated(cupRect(i), HIT_SLOP, x, y)) return i
    return -1
  }

  const shake = () => {
    const beads: number[] = []
    for (let i = 0; i < colourAt.length; i++) {
      if (colourAt[i]! >= 0 && !seedAt[i]) {
        beads.push(colourAt[i]!)
        takeBead(i)
      }
    }
    for (const a of ants) {
      if (a.carry >= 0) {
        beads.push(a.carry)
        a.carry = -1
      }
    }
    for (const colour of beads) {
      let i = -1
      for (let tries = 0; tries < 40 && i < 0; tries++) {
        const j = int(rng, 0, colourAt.length - 1)
        if (colourAt[j]! < 0) i = j
      }
      if (i < 0) i = freeNear(int(rng, 0, COLS - 1), int(rng, 0, ROWS - 1), 1)
      if (i >= 0) putBead(i, colour, false)
    }
    emit({ kind: 'state', name: 'shake' })
  }

  const tip = () => {
    for (let i = 0; i < colourAt.length; i++) takeBead(i)
    for (const a of ants) a.carry = -1
    emit({ kind: 'state', name: 'tip' })
  }

  const tapSand = (x: number, y: number) => {
    const { c, r } = cellOf(x, y)
    const i = idx(c, r)
    if (seedAt[i]) {
      takeBead(i)
      emit({ kind: 'state', name: 'lift-seed' })
    } else if (inHand >= 0) plantSeed(c, r, inHand)
    else handful(x, y)
  }

  const isPouring = (t: Touch) => t.kind === 'sand' && (t.moved || tick - t.startTick >= TAP_TICKS)

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      touches.delete(id)
      if (!finite) return
      const cup = cupAt(x, y)
      if (cup >= 0) {
        inHand = cup === 0 ? -1 : cup === 5 ? PINK : cup - 1
        touches.set(id, { kind: 'cup', cup, x, y, startX: x, startY: y, startTick: tick, moved: false, lastPour: -1 })
        emit({ kind: 'state', name: 'choose' })
      } else if (inflated(SHAKE, HIT_SLOP, x, y)) shake()
      else if (inflated(TIP, HIT_SLOP, x, y)) tip()
      else if (inflated(SAND, HIT_SLOP, x, y)) {
        touches.set(id, { kind: 'sand', cup: -1, x, y, startX: x, startY: y, startTick: tick, moved: false, lastPour: -1 })
      }
      return
    }
    const t = touches.get(id)
    if (!t) return
    if (finite) {
      t.x = x
      t.y = y
      if (Math.hypot(x - t.startX, y - t.startY) > TAP_MOVE) t.moved = true
    }
    if (phase !== 'up') return
    touches.delete(id)
    if (t.kind === 'sand') {
      if (!t.moved && t.lastPour < 0) tapSand(t.x, t.y)
    } else if (t.moved && inflated(SAND, 0, t.x, t.y)) {
      // A bead dragged from its cup and let go on the sand.
      if (inHand >= 0) {
        const { c, r } = cellOf(t.x, t.y)
        plantSeed(c, r, inHand)
      } else handful(t.x, t.y)
    }
  }

  // ---- one tick ----------------------------------------------------------

  const step = () => {
    tick++
    idleTicks++
    for (const t of touches.values()) {
      if (isPouring(t) && tick - t.lastPour >= POUR_EVERY) {
        t.lastPour = tick
        pourOne(t.x, t.y)
      }
    }
    for (const a of ants) {
      if ((tick + a.phase) % MOVE_TICKS === 0) act(a)
      // Glide toward the cell centre (for the view only).
      const to = cellCentre(a.c, a.r)
      a.x += (to.x - a.x) * 0.4
      a.y += (to.y - a.y) * 0.4
    }
    if (tick % 6 === 0) {
      const s = stats()
      if (s.tidyNow && !wasTidy) {
        everTidy = true
        if (hooks.has('tidy') && tick - lastCheer > CHEER_GAP) {
          lastCheer = tick
          cheerUntil = tick + CHEER_TICKS
          emit({ kind: 'hook', name: 'tidy' })
        }
      }
      wasTidy = s.tidyNow
      if (hooks.has('pink') && everTidy && !pinkUnlocked) {
        pinkUnlocked = true
        emit({ kind: 'hook', name: 'pink' })
      }
    }
  }

  // ---- what the child can be drawn to ------------------------------------

  const affordances = (): Affordance[] => {
    const s = stats()
    const list: Affordance[] = []
    for (let i = 0; i < cupCount(); i++) {
      const selected = (i === 0 && inHand < 0) || (i > 0 && inHand === (i === 5 ? PINK : i - 1))
      list.push({ ...cupRect(i), kind: 'tap', salience: selected ? 0.2 : 0.35 })
    }
    list.push({ ...SHAKE, kind: 'tap', salience: s.stage === 'tidy' ? 0.5 : 0.25 })
    list.push({ ...TIP, kind: 'tap', salience: 0.15 })
    if (s.loose === 0) list.push({ x: 390, y: 330, w: 400, h: 300, kind: 'hold', salience: 0.9 })
    else list.push({ ...SAND, kind: 'hold', salience: 0.4 })
    if (inHand >= 0) {
      // A colour in hand: the corners are where a seed can start a heap.
      const w = 6 * CELL
      const h = 4 * CELL
      const corners: Array<[number, number]> = [
        [SAND.x, SAND.y],
        [SAND.x + SAND.w - w, SAND.y],
        [SAND.x, SAND.y + SAND.h - h],
        [SAND.x + SAND.w - w, SAND.y + SAND.h - h],
      ]
      for (const [x, y] of corners) list.push({ x, y, w, h, kind: 'tap', salience: 0.3 })
    }
    for (const i of seedOrder) {
      const at = cellCentre(i % COLS, Math.floor(i / COLS))
      list.push({ x: at.x - CELL / 2, y: at.y - CELL / 2, w: CELL, h: CELL, kind: 'tap', salience: 0.1 })
    }
    return list
  }

  // ---- what happened ------------------------------------------------------

  // The signature names a discrete outcome class: the stage of the sand, how
  // many colours' biggest heaps sit in a corner, and how many of them grew
  // round a seed. 2 + 9 + 9 = 20 classes.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const s = stats()
    const signature =
      s.stage === 'bare' || s.stage === 'mixed' ? s.stage : `${s.stage}-c${Math.min(2, s.cornered)}s${s.seedClass}`
    return {
      signature,
      features: { tidy: s.tidy, cornered: s.cornered, heaps: s.heapCount, beads: s.loose, seeds: s.seeds },
      events,
    }
  }

  // Idle hints only point; they never change what the sim does.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS) return null
    const s = stats()
    if (s.loose === 0) return { x: 590, y: 480 }
    if (s.seeds === 0 && idleTicks >= HINT_AFTER_TICKS * 2) {
      const cup = cupRect(1)
      return { x: cup.x + cup.w / 2, y: cup.y + cup.h / 2 }
    }
    return null
  }

  const snapshot = (): TidySnapshot => {
    const s = stats()
    const beads: TidySnapshot['beads'] = []
    for (let i = 0; i < colourAt.length; i++) {
      const colour = colourAt[i]!
      if (colour < 0) continue
      const at = cellCentre(i % COLS, Math.floor(i / COLS))
      beads.push({ x: at.x, y: at.y, colour: COLOUR_NAMES[colour]!, hex: COLOUR_HEX[colour]!, seed: seedAt[i]! })
    }
    const cups: TidySnapshot['cups'] = []
    for (let i = 0; i < cupCount(); i++) {
      const colour = i === 0 ? -1 : i === 5 ? PINK : i - 1
      cups.push({
        ...cupRect(i),
        name: colour < 0 ? 'mix' : COLOUR_NAMES[colour]!,
        colour: colour < 0 ? null : COLOUR_HEX[colour]!,
        selected: colour === inHand,
      })
    }
    return {
      tick,
      sand: { ...SAND },
      cups,
      shake: { ...SHAKE },
      tip: { ...TIP },
      beads,
      ants: ants.map((a) => ({ x: a.x, y: a.y, dx: a.dx, dy: a.dy, carry: a.carry >= 0 ? COLOUR_HEX[a.carry]! : null })),
      inHand: inHand < 0 ? 'mix' : COLOUR_NAMES[inHand]!,
      touches: [...touches.values()].filter(isPouring).map((t) => ({ x: t.x, y: t.y })),
      heaps: s.best.map((h) => ({ colour: COLOUR_NAMES[h.colour]!, size: h.size, cx: h.cx, cy: h.cy, seeded: h.seeded })),
      tidy: s.tidy,
      stage: s.stage,
      cheer: hooks.has('tidy') && tick < cheerUntil,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
