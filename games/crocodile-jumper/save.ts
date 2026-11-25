import { MOST_TOGETHER, PARTY, ROUND, WHO, lengthOf, needs, type Who } from './cast'
import { LADDER } from './config'
import { KINDS, MOST, clampX, type Kind, type Piece } from './row'
import { deserialize as readPosition, finishCycle, beginCycle, freshState, isReadable, isRecord, type CycleOutcome, type GameState } from './state'

// Everything that stays. state.ts keeps the position; this wraps it.

export type Save = GameState & {
  on: Who[]
  /** The row on the strip, which is the jumper as well. */
  row: Piece[]
  wait: Who[]
  turn: number
  open: Record<Kind, boolean>
  /** Who was dressed last, and in what: seen outside the window. */
  out: { who: Who[]; worn: Piece[] } | null
  /** New things the magpie has shown. */
  shown: Idea[]
}

export type Idea = 'touching' | 'long' | 'duck' | 'shoe' | 'mix' | 'two'
export const IDEAS: readonly Idea[] = ['touching', 'long', 'duck', 'shoe', 'mix', 'two']
/** The new thing that whoever lies on the table brings. */
export function ideaOf(on: readonly Who[]): Idea {
  if (on.length > 1) return 'two'
  return ({ croc: 'touching', dog: 'long', snail: 'duck', seal: 'shoe', python: 'mix' } as const)[on[0]]
}
/** What the magpie still owes the child for the one on the table. */
export const owed = (s: Save): Idea | null => (s.shown.includes(ideaOf(s.on)) ? null : ideaOf(s.on))

const same = (a: readonly Who[], b: readonly Who[]): boolean => a.join() === b.join()

/** Who comes to the door next, after the position. Never the same as who lies on the table. */
export function nextParty(s: { position: string; on: readonly Who[]; turn: number }): { who: Who[]; turn: number } {
  let at = LADDER.indexOf(s.position) + 1
  if (at < LADDER.length - 1 && same(PARTY[LADDER[at]], s.on)) at += 1
  if (at < LADDER.length - 1) return { who: [...PARTY[LADDER[at]]], turn: s.turn }
  let turn = s.turn
  while (same(ROUND[turn % ROUND.length], s.on)) turn = (turn + 1) % ROUND.length
  return { who: [...ROUND[turn % ROUND.length]], turn: (turn + 1) % ROUND.length }
}

const opened = (open: Record<Kind, boolean>, on: readonly Who[]): Record<Kind, boolean> => {
  const now = { ...open }
  for (const k of needs(on)) now[k] = true
  return now
}

export function freshSave(childAge: number | null): Save {
  const base = freshState(childAge)
  const on = [...(PARTY[base.position] ?? PARTY[LADDER[0]])]
  const next = nextParty({ position: base.position, on, turn: 0 })
  return { ...base, on, row: [], wait: next.who, turn: next.turn, open: opened({ sausage: true, shoe: false, duck: false }, on), out: null, shown: [] }
}

const party = (raw: unknown): Who[] | null => {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 2) return null
  const who = raw.filter((w): w is Who => WHO.includes(w as Who))
  return who.length === raw.length && (who.length === 1 || lengthOf(who) <= MOST_TOGETHER) ? who : null
}
const pieces = (raw: unknown): Piece[] | null => {
  if (!Array.isArray(raw)) return null
  return raw.filter((p): p is Piece => isRecord(p) && KINDS.includes(p.k as Kind) && typeof p.x === 'number' && Number.isFinite(p.x)).slice(0, MOST).map((p) => ({ k: p.k, x: clampX(p.k, p.x) }))
}

export function deserialize(raw: unknown, childAge: number | null = null): Save {
  if (!isReadable(raw)) return freshSave(childAge)
  const base = readPosition(raw, childAge), fresh = freshSave(childAge)
  const on = party(raw.on) ?? (PARTY[base.position] ? [...PARTY[base.position]] : [...ROUND[0]])
  const turn = Number.isInteger(raw.turn) && (raw.turn as number) >= 0 ? (raw.turn as number) % ROUND.length : 0
  const next = nextParty({ position: base.position, on, turn })
  const wait = party(raw.wait)
  const open = isRecord(raw.open) ? raw.open : {}
  const out = isRecord(raw.out) ? { who: party(raw.out.who), worn: pieces(raw.out.worn) } : null
  return {
    ...fresh, position: base.position, finished: false, on,
    row: pieces(raw.row) ?? [],
    wait: wait ?? next.who, turn: wait ? turn : next.turn,
    open: opened({ sausage: true, shoe: open.shoe === true, duck: open.duck === true }, on),
    out: out?.who && out.worn?.length ? { who: out.who, worn: out.worn } : null,
    shown: Array.isArray(raw.shown) ? IDEAS.filter((i) => (raw.shown as unknown[]).includes(i)) : [],
  }
}

/** The one who lies there goes off dressed and the one who waited lies down. */
export function callNext(s: Save, outcome: CycleOutcome): Save {
  const moved = beginCycle(finishCycle(s, outcome))
  const on = [...s.wait]
  const next = nextParty({ position: moved.position, on, turn: s.turn })
  return { ...moved, on, row: [], wait: next.who, turn: next.turn, open: opened(s.open, on), out: s.row.length ? { who: [...s.on], worn: s.row } : s.out }
}

export const canJoin = (s: Save): boolean => s.on.length === 1 && s.wait.length === 1 && lengthOf([...s.on, ...s.wait]) <= MOST_TOGETHER

/** The one who waited lies down behind the one on the table. */
export function join(s: Save): Save {
  const on = [...s.on, ...s.wait]
  const next = nextParty({ position: s.position, on, turn: s.turn })
  return { ...s, on, wait: next.who, turn: next.turn, open: opened(s.open, on) }
}

