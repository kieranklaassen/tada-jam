// The Sulking Lamp. Eight coloured shapes wait in a tray. The child arranges
// some of them on a stage; a lamp above glows warm when the arrangement obeys
// a hidden rule and sulks dim when it does not. Twelve families of rule
// (uniform, all different, banned, a count, a half of the stage, an order, a
// row, a huddle, personal space, a touching pair, leaning, balance), each with
// its own parameters, so every visit hides a different secret. Chips name the
// family; a wrong name costs one of two guesses, a right name earns the next
// rule. The lamp gives the answer away after a while if the child gets stuck.
//
// Pure and deterministic: no DOM, no Vite globals, no wall clock. Randomness
// only from the seeded rng, and state changes only in step() and pointer().

import { between, createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Field furniture, in logical coordinates. Rect x and y are the top-left corner.
export const STAGE: Rect = { x: 60, y: 200, w: 1060, h: 400 }
export const TRAY: Rect = { x: 60, y: 630, w: 1060, h: 170 }
export const LAMP_RECT: Rect = { x: 510, y: 20, w: 160, h: 160 }
const MID_X = STAGE.x + STAGE.w / 2
const MID_Y = STAGE.y + STAGE.h / 2
const TRAY_Y = TRAY.y + TRAY.h / 2

export const FAMILIES = [
  'alike',
  'different',
  'banned',
  'howmany',
  'corner',
  'leftof',
  'row',
  'huddle',
  'space',
  'touching',
  'leaning',
  'balanced',
] as const
export type Family = (typeof FAMILIES)[number]

const CHIP_LABELS: Record<Family, string> = {
  alike: 'alike',
  different: 'different',
  banned: 'banned',
  howmany: 'how many',
  corner: 'corner',
  leftof: 'left of',
  row: 'row',
  huddle: 'huddle',
  space: 'space',
  touching: 'touching',
  leaning: 'leaning',
  balanced: 'balanced',
}

// Two blocks of six chips flank the lamp, three across and two down.
export function chipRect(index: number): Rect {
  const k = index % 6
  return { x: (index < 6 ? 30 : 710) + (k % 3) * 150, y: 22 + Math.floor(k / 3) * 80, w: 140, h: 70 }
}

export const SKIP_AFTER = 450
export const SOLVED_TICKS = 90
export const SHOWN_TICKS = 120
const GUESSES = 2
const RADII = [34, 52]
const HIT_SLOP = 16
const TAP_MOVE = 24
const HINT_AFTER_TICKS = 150
// How long the lamp shrugs after a locked chip, a wrong name, or a poke.
const SHRUG_TICKS = 12
const MAX_EVENTS = 64
const TOUCH_GAP = 6
const ROW_BAND = 60
const HUDDLE_R = 130
const CARD = [4, 3, 2] // colours, shapes, sizes
const COLOR_NAMES = ['red', 'blue', 'yellow', 'green']
const KIND_NAMES = ['circle', 'square', 'triangle']
const SIZE_NAMES = ['small', 'big']
const ATTR_WORDS = ['colour', 'shape', 'size']
const HALVES = ['on the left', 'on the right', 'at the top', 'at the bottom']

// A rule: a family plus what it is about. attr is 0 colour, 1 shape, 2 size;
// a and b are values of that attribute; n is a count, a half (0 left, 1 right,
// 2 top, 3 bottom), or an axis (0 left to right, 1 top to bottom).
export interface Rule {
  family: Family
  attr: number
  a: number
  b: number
  n: number
}

export interface StagePiece {
  x: number
  y: number
  r: number
  color: number
  kind: number
  size: number
}

// bad is how far from obeying the rule (0 obeys); of is the scale it is
// measured on.
export interface Verdict {
  bad: number
  of: number
}

const attrOf = (p: StagePiece, attr: number): number => (attr === 0 ? p.color : attr === 1 ? p.kind : p.size)
const touch = (p: StagePiece, q: StagePiece): boolean => Math.hypot(p.x - q.x, p.y - q.y) <= p.r + q.r + TOUCH_GAP

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length === 0 ? 0 : s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

export function evaluate(rule: Rule, stage: readonly StagePiece[]): Verdict {
  const n = stage.length
  const value = (p: StagePiece) => attrOf(p, rule.attr)
  const mine = stage.filter((p) => value(p) === rule.a)
  const theirs = stage.filter((p) => value(p) === rule.b)
  switch (rule.family) {
    case 'alike': {
      const counts = new Map<number, number>()
      for (const p of stage) counts.set(value(p), (counts.get(value(p)) ?? 0) + 1)
      return { bad: n - Math.max(0, ...counts.values()), of: Math.max(1, n) }
    }
    case 'different':
      return { bad: n - new Set(stage.map(value)).size, of: Math.max(1, n - 1) }
    case 'banned':
      return { bad: mine.length, of: Math.max(1, n) }
    case 'howmany':
      return { bad: Math.abs(n - rule.n), of: Math.max(n, rule.n) }
    case 'corner': {
      const outside = mine.filter((p) => {
        if (rule.n === 0) return p.x >= MID_X
        if (rule.n === 1) return p.x < MID_X
        return rule.n === 2 ? p.y >= MID_Y : p.y < MID_Y
      })
      return { bad: outside.length, of: Math.max(1, mine.length) }
    }
    case 'leftof': {
      let bad = 0
      for (const p of mine) for (const q of theirs) if ((rule.n === 0 ? p.x >= q.x : p.y >= q.y)) bad++
      return { bad, of: Math.max(1, mine.length * theirs.length) }
    }
    case 'row': {
      const m = median(stage.map((p) => p.y))
      return { bad: stage.filter((p) => Math.abs(p.y - m) > ROW_BAND).length, of: Math.max(1, n) }
    }
    case 'huddle': {
      const mx = median(stage.map((p) => p.x))
      const my = median(stage.map((p) => p.y))
      return { bad: stage.filter((p) => Math.hypot(p.x - mx, p.y - my) > HUDDLE_R).length, of: Math.max(1, n) }
    }
    case 'space': {
      let bad = 0
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (touch(stage[i]!, stage[j]!)) bad++
      return { bad, of: Math.max(1, (n * (n - 1)) / 2) }
    }
    case 'touching': {
      const met = mine.some((p) => theirs.some((q) => touch(p, q)))
      const both = mine.length > 0 && theirs.length > 0
      return { bad: met ? 0 : both ? 1 : 2, of: 2 }
    }
    case 'leaning':
      return { bad: mine.filter((p) => !theirs.some((q) => touch(p, q))).length, of: Math.max(1, mine.length) }
    case 'balanced': {
      const left = stage.filter((p) => p.x < MID_X).length
      return { bad: Math.abs(left - (n - left)), of: Math.max(1, n) }
    }
  }
}

export function ruleText(rule: Rule): string {
  const names = rule.attr === 0 ? COLOR_NAMES : rule.attr === 1 ? KIND_NAMES : SIZE_NAMES
  const a = names[rule.a]!
  const b = names[rule.b]!
  switch (rule.family) {
    case 'alike':
      return `every piece the same ${ATTR_WORDS[rule.attr]}`
    case 'different':
      return `no two pieces the same ${ATTR_WORDS[rule.attr]}`
    case 'banned':
      return `no ${a} pieces`
    case 'howmany':
      return `exactly ${rule.n} pieces`
    case 'corner':
      return `${a} pieces stay ${HALVES[rule.n]}`
    case 'leftof':
      return `${a} pieces ${rule.n === 0 ? 'left of' : 'above'} ${b} pieces`
    case 'row':
      return 'all in one row'
    case 'huddle':
      return 'all close together'
    case 'space':
      return 'no two touching'
    case 'touching':
      return `a ${a} piece touches a ${b} piece`
    case 'leaning':
      return `each ${a} piece touches a ${b} piece`
    case 'balanced':
      return 'as many on the left as on the right'
  }
}

const ATTRS_FOR: Record<Family, number[]> = {
  alike: [0, 1, 2],
  different: [0, 1],
  banned: [0, 1, 2],
  howmany: [0],
  corner: [0, 1, 2],
  leftof: [0, 1],
  row: [0],
  huddle: [0],
  space: [0],
  touching: [0, 1],
  leaning: [0, 1, 2],
  balanced: [0],
}

function makeRule(rng: Rng, family: Family): Rule {
  const attr = pick(rng, ATTRS_FOR[family])
  const card = CARD[attr]!
  const a = int(rng, 0, card - 1)
  const b = (a + 1 + int(rng, 0, card - 2)) % card
  const n = family === 'howmany' ? int(rng, 3, 5) : family === 'corner' ? int(rng, 0, 3) : family === 'leftof' ? int(rng, 0, 1) : 0
  return { family, attr, a, b, n }
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const tmp = list[i]!
    list[i] = list[j]!
    list[j] = tmp
  }
  return list
}

export type LampState = 'waiting' | 'dim' | 'glow' | 'warm'
export type Phase = 'seeking' | 'solved' | 'shown'
export type ChipState = 'open' | 'locked' | 'wrong' | 'right' | 'off'

interface Piece extends StagePiece {
  id: number
  onTray: boolean
  heldBy: number | null
}

interface Grab {
  piece: number
  offX: number
  offY: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  fromStage: boolean
}

export interface LampSnapshot {
  tick: number
  round: number
  phase: Phase
  lamp: LampState
  // 0 to about 1.3: how bright the lamp is drawn, eased by the sim.
  level: number
  shrug: number
  pieces: Array<{ id: number; x: number; y: number; r: number; color: number; kind: number; size: number; held: boolean; onStage: boolean }>
  // Draw order, back to front.
  order: number[]
  chips: Array<{ family: Family; label: string; x: number; y: number; w: number; h: number; state: ChipState }>
  unlocked: boolean
  guessesLeft: number
  solved: number
  // The rule in words, only once the round has ended.
  reveal: string | null
  // The piece whose move last changed the lamp, or -1.
  flipPiece: number
  skipReady: boolean
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inRect = (r: Rect, x: number, y: number, slop = 0) =>
  x >= r.x - slop && x <= r.x + r.w + slop && y >= r.y - slop && y <= r.y + r.h + slop

const slotX = (id: number) => TRAY.x + 66 + id * 132
const LEVELS: Record<LampState, number> = { waiting: 0.05, dim: 0.15, glow: 0.55, warm: 1 }

export const createSim: CreateSim<LampSnapshot> = (config): Sim<LampSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) `warmer` is the only hook: the graded glow.
  const warmer = config.hooks.includes('warmer')

  let deck: Family[] = []
  let deckPos = 0
  let lastFamily: Family | null = null
  let pieces: Piece[] = []
  let order: number[] = []
  let rule: Rule = { family: 'alike', attr: 0, a: 0, b: 1, n: 0 }
  let roundNo = 0
  let phase: Phase = 'seeking'
  let phaseTicks = 0
  let roundTicks = 0
  let seenWarm = false
  let seenDim = false
  let guessesLeft = GUESSES
  let wrong: Family[] = []
  let solved = 0
  let lamp: LampState = 'waiting'
  let level: number = LEVELS.waiting
  let flipPiece = -1
  let shrug = 0
  let tick = 0
  let idleTicks = 0
  let pending: SimEvent[] = []
  const grabs = new Map<number, Grab>()

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const nextFamily = (): Family => {
    if (deckPos >= deck.length) {
      deck = shuffle(rng, FAMILIES)
      if (deck[0] === lastFamily) [deck[0], deck[1]] = [deck[1]!, deck[0]!]
      deckPos = 0
    }
    lastFamily = deck[deckPos++]!
    return lastFamily
  }

  const home = (p: Piece) => {
    p.onTray = true
    p.x = slotX(p.id)
    p.y = TRAY_Y
  }

  const newRound = () => {
    grabs.clear()
    const colors = shuffle(rng, [0, 0, 1, 1, 2, 2, 3, 3])
    const kinds = shuffle(rng, [0, 1, 2, 0, 1, 2, 0, 1])
    const sizes = shuffle(rng, [0, 0, 0, 0, 1, 1, 1, 1])
    pieces = colors.map((color, id) => {
      const size = sizes[id]!
      const p: Piece = { id, x: 0, y: 0, r: RADII[size]!, color, kind: kinds[id]!, size, onTray: true, heldBy: null }
      home(p)
      return p
    })
    order = pieces.map((p) => p.id)
    rule = makeRule(rng, nextFamily())
    roundNo++
    phase = 'seeking'
    phaseTicks = 0
    roundTicks = 0
    seenWarm = false
    seenDim = false
    guessesLeft = GUESSES
    wrong = []
    flipPiece = -1
    lamp = 'waiting'
    emit({ kind: 'state', name: 'round' })
  }

  const onStage = (p: Piece) => (p.heldBy !== null ? inRect(STAGE, p.x, p.y) : !p.onTray)
  const stagePieces = () => pieces.filter(onStage)

  // Re-judge the arrangement; the lamp follows the child's hands live.
  const refresh = (touched: number) => {
    const staged = stagePieces()
    const verdict = evaluate(rule, staged)
    let next: LampState
    if (staged.length < 2) next = 'waiting'
    else if (verdict.bad === 0) next = 'warm'
    else if (warmer && 1 - verdict.bad / verdict.of >= 0.5) next = 'glow'
    else next = 'dim'
    if (next !== lamp) {
      lamp = next
      emit({ kind: 'state', name: `lamp-${next}` })
      if (next === 'glow') emit({ kind: 'hook', name: 'warmer' })
      if (touched >= 0) flipPiece = touched
    }
    if (lamp === 'warm') seenWarm = true
    if (lamp === 'dim' || lamp === 'glow') seenDim = true
  }

  const unlocked = () => seenWarm && seenDim

  const showRule = () => {
    phase = 'shown'
    phaseTicks = 0
    emit({ kind: 'state', name: 'shown' })
  }

  const guess = (family: Family) => {
    if (phase !== 'seeking' || wrong.includes(family)) return
    if (!unlocked()) {
      shrug = SHRUG_TICKS
      emit({ kind: 'state', name: 'locked' })
      return
    }
    if (family === rule.family) {
      phase = 'solved'
      phaseTicks = 0
      solved++
      emit({ kind: 'state', name: 'solved' })
      return
    }
    wrong.push(family)
    guessesLeft--
    shrug = SHRUG_TICKS
    emit({ kind: 'state', name: 'wrong' })
    if (guessesLeft <= 0) showRule()
  }

  const pokeLamp = () => {
    if (phase !== 'seeking') return
    if (roundTicks >= SKIP_AFTER) {
      showRule()
    } else {
      shrug = SHRUG_TICKS
      emit({ kind: 'state', name: 'lamp-poke' })
    }
  }

  const hitPiece = (x: number, y: number): Piece | null => {
    for (let i = order.length - 1; i >= 0; i--) {
      const p = pieces[order[i]!]!
      if (p.heldBy === null && Math.hypot(x - p.x, y - p.y) <= p.r + HIT_SLOP) return p
    }
    return null
  }

  // A tap sends a tray piece to the roomiest of a few seeded spots on the stage.
  const placeOnStage = (p: Piece) => {
    const others = stagePieces().filter((q) => q !== p)
    let best = { x: MID_X, y: MID_Y, room: -1 }
    for (let k = 0; k < 8; k++) {
      const x = between(rng, STAGE.x + p.r, STAGE.x + STAGE.w - p.r)
      const y = between(rng, STAGE.y + p.r, STAGE.y + STAGE.h - p.r)
      const room = others.length === 0 ? 1 : Math.min(...others.map((q) => Math.hypot(x - q.x, y - q.y) - q.r - p.r))
      if (room > best.room) best = { x, y, room }
    }
    p.onTray = false
    p.x = best.x
    p.y = best.y
  }

  const release = (id: number) => {
    const g = grabs.get(id)
    if (!g) return
    grabs.delete(id)
    const p = pieces[g.piece]!
    p.heldBy = null
    const moved = Math.hypot(g.lastX - g.startX, g.lastY - g.startY) >= TAP_MOVE
    if (!moved) {
      if (g.fromStage) {
        home(p)
        emit({ kind: 'state', name: 'return' })
      } else {
        placeOnStage(p)
        emit({ kind: 'state', name: 'place' })
      }
    } else if (inRect(STAGE, p.x, p.y)) {
      p.onTray = false
      p.x = clamp(p.x, STAGE.x + p.r, STAGE.x + STAGE.w - p.r)
      p.y = clamp(p.y, STAGE.y + p.r, STAGE.y + STAGE.h - p.r)
      emit({ kind: 'state', name: 'drop' })
    } else {
      home(p)
      emit({ kind: 'state', name: 'return' })
    }
    refresh(p.id)
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase: action, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (action === 'down') {
      if (!finite) return
      release(id)
      for (let i = 0; i < FAMILIES.length; i++) {
        if (inRect(chipRect(i), x, y, 6)) {
          guess(FAMILIES[i]!)
          return
        }
      }
      if (inRect(LAMP_RECT, x, y)) {
        pokeLamp()
        return
      }
      const p = hitPiece(x, y)
      if (p) {
        p.heldBy = id
        grabs.set(id, { piece: p.id, offX: p.x - x, offY: p.y - y, startX: x, startY: y, lastX: x, lastY: y, fromStage: !p.onTray })
        order = order.filter((o) => o !== p.id)
        order.push(p.id)
        emit({ kind: 'state', name: 'grab' })
      }
      return
    }
    const g = grabs.get(id)
    if (g && finite) {
      const p = pieces[g.piece]!
      p.x = clamp(x + g.offX, p.r, FIELD_W - p.r)
      p.y = clamp(y + g.offY, p.r, FIELD_H - p.r)
      g.lastX = x
      g.lastY = y
      refresh(p.id)
    }
    if (action === 'up') release(id)
  }

  const step = () => {
    tick++
    idleTicks++
    roundTicks++
    if (shrug > 0) shrug--
    if (phase !== 'seeking') {
      phaseTicks++
      if (phaseTicks >= (phase === 'solved' ? SOLVED_TICKS : SHOWN_TICKS)) newRound()
    }
    // No re-judging here: the lamp only changes when the arrangement does, and
    // pointer() and release() refresh it then. A new round starts on an empty
    // stage, which is already 'waiting'.
    const target = phase === 'solved' ? 1.3 : phase === 'shown' ? 0.35 : LEVELS[lamp]
    level += (target - level) * 0.2
  }

  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const p of pieces) {
      if (p.heldBy !== null) continue
      list.push({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2, kind: 'drag', salience: p.onTray ? 0.55 : 0.4 })
    }
    if (phase === 'seeking') {
      FAMILIES.forEach((family, i) => {
        if (wrong.includes(family)) return
        list.push({ ...chipRect(i), kind: 'tap', salience: unlocked() ? 0.5 : 0.12 })
      })
      list.push({ ...LAMP_RECT, kind: 'tap', salience: roundTicks >= SKIP_AFTER ? 0.3 : 0.1 })
    }
    return list
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const state = phase === 'seeking' ? (lamp === 'waiting' ? 'dim' : lamp) : phase
    return {
      signature: `${rule.family}/${state}`,
      features: {
        solved,
        warmth: lamp === 'warm' ? 1 : lamp === 'glow' ? 0.5 : 0,
        onStage: stagePieces().length,
        guessesLeft,
      },
      events,
    }
  }

  // The idle hint is data for the view only: point at a tray piece while the
  // stage is bare, at the lamp while the child has not yet seen it change, and
  // at the first open chip once both lamp states have been seen.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS || phase !== 'seeking') return null
    if (stagePieces().length < 2) {
      const p = pieces.find((q) => q.onTray && q.heldBy === null)
      return p ? { x: p.x, y: p.y } : null
    }
    if (!unlocked()) return { x: LAMP_RECT.x + LAMP_RECT.w / 2, y: LAMP_RECT.y + LAMP_RECT.h / 2 }
    const i = FAMILIES.findIndex((f) => !wrong.includes(f))
    const c = chipRect(Math.max(0, i))
    return { x: c.x + c.w / 2, y: c.y + c.h / 2 }
  }

  const chipState = (family: Family): ChipState => {
    if (phase !== 'seeking') return family === rule.family ? 'right' : 'off'
    return wrong.includes(family) ? 'wrong' : unlocked() ? 'open' : 'locked'
  }

  const snapshot = (): LampSnapshot => ({
    tick,
    round: roundNo,
    phase,
    lamp,
    level,
    shrug,
    pieces: pieces.map((p) => ({ id: p.id, x: p.x, y: p.y, r: p.r, color: p.color, kind: p.kind, size: p.size, held: p.heldBy !== null, onStage: onStage(p) })),
    order: [...order],
    chips: FAMILIES.map((family, i) => ({ family, label: CHIP_LABELS[family], ...chipRect(i), state: chipState(family) })),
    unlocked: unlocked(),
    guessesLeft,
    solved,
    reveal: phase === 'seeking' ? null : ruleText(rule),
    flipPiece,
    skipReady: phase === 'seeking' && roundTicks >= SKIP_AFTER,
    hint: hint(),
  })

  newRound()
  pending = []
  return { step, pointer, affordances, observe, snapshot }
}
