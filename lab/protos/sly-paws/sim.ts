// Sly Paws. Each round the child hides a pebble in one of its own paws and
// guesses which paw the creature hid its pebble in. The creature does the same
// by its own habit, reading the child's earlier rounds. Five creatures each
// hide by one rule and guess by another; the Crow (a hook) learns the child's
// own stay-or-switch habit. Nothing about the creature is shown except what a
// round has already revealed, so the habits must be worked out from play.
//
// Pure and deterministic: no DOM, no clocks, no Math.random. Randomness comes
// from the seeded rng: the roster at the start, then four draws per round.

import { chance, createRng, int } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

// 0 is the left paw, 1 is the right paw.
export type Paw = 0 | 1
export type CreatureId = 'fox' | 'owl' | 'hare' | 'badger' | 'magpie' | 'crow'
export type Outcome = 'fresh' | 'won' | 'lost' | 'both' | 'neither' | 'sly'

// One resolved round, from the child's side. mH/mG: where I hid and where I
// looked. cH/cG: where it hid and where it looked. found: I found its pebble.
// caught: it found mine. dodge: it acted on a read of me and missed.
export interface Round {
  mH: Paw
  mG: Paw
  cH: Paw
  cG: Paw
  found: boolean
  caught: boolean
  dodge: boolean
}

// A guess, and whether it was drawn from the child's earlier rounds.
export interface Move {
  paw: Paw
  read: boolean
}

interface Creature {
  id: CreatureId
  name: string
  color: string
  // `r` is a random paw for the case there is nothing to go on yet.
  hide(h: readonly Round[], r: Paw): Paw
  guess(h: readonly Round[], r: Paw): Move
}

export const PAW_R = 75
export const CREATURE_PAWS = [
  { x: 440, y: 400 },
  { x: 740, y: 400 },
] as const
export const MY_PAWS = [
  { x: 440, y: 650 },
  { x: 740, y: 650 },
] as const

export const REVEAL_TICKS = 36
export const VISIT_ROUNDS = 10
export const MATCH_TO = 5
// A creature now and then does something off-habit, so a habit is never a machine.
const NOISE = 0.12
// The field splits in four: a touch anywhere in the top half picks one of its
// paws, anywhere in the bottom half one of mine, left or right by which side of
// the middle it lands. Forgiving on purpose, for a hurried finger.
const SPLIT_X = 590
const SPLIT_Y = 525
const HINT_AFTER_TICKS = 90
const MAX_EVENTS = 64
const UNLOCK_DODGES = 2
const SHOWN = 6

const other = (p: Paw): Paw => (p === 0 ? 1 : 0)
const lastOf = (h: readonly Round[]): Round => h[h.length - 1]!

export const CREATURES: Record<CreatureId, Creature> = {
  // Guesses by win-stay, lose-shift; hides where you last looked.
  fox: {
    id: 'fox',
    name: 'Fox',
    color: '#e0803a',
    hide: (h, r) => (h.length === 0 ? r : lastOf(h).mG),
    guess: (h, r) => {
      if (h.length === 0) return { paw: r, read: false }
      const l = lastOf(h)
      return { paw: l.caught ? l.cG : other(l.cG), read: false }
    },
  },
  // Bets you will repeat, but only once you have hidden in the same paw three
  // times running; otherwise looks left. Hides away from where you last looked.
  owl: {
    id: 'owl',
    name: 'Owl',
    color: '#8a7a9b',
    hide: (h, r) => (h.length === 0 ? r : other(lastOf(h).mG)),
    guess: (h) => {
      const n = h.length
      if (n >= 3 && h[n - 1]!.mH === h[n - 2]!.mH && h[n - 2]!.mH === h[n - 3]!.mH) return { paw: h[n - 1]!.mH, read: true }
      return { paw: 0, read: false }
    },
  },
  // Runs its own patterns and ignores you: alternates its hiding paw and looks
  // left, right, right, left, right, right.
  hare: {
    id: 'hare',
    name: 'Hare',
    color: '#b9a48a',
    hide: (h, r) => (h.length === 0 ? r : other(lastOf(h).cH)),
    guess: (h) => ({ paw: ([0, 1, 1] as const)[h.length % 3]!, read: false }),
  },
  // Hides in one paw until found twice running there; bets you will switch.
  badger: {
    id: 'badger',
    name: 'Badger',
    color: '#6f7f72',
    hide: (h, r) => {
      if (h.length === 0) return r
      const l = lastOf(h)
      const p = h[h.length - 2]
      return p && l.found && p.found && p.cH === l.cH ? other(l.cH) : l.cH
    },
    guess: (h, r) => (h.length === 0 ? { paw: r, read: false } : { paw: other(lastOf(h).mH), read: true }),
  },
  // Hides away from where you last hid; looks where you last looked.
  magpie: {
    id: 'magpie',
    name: 'Magpie',
    color: '#3f4a5c',
    hide: (h, r) => (h.length === 0 ? r : other(lastOf(h).mH)),
    guess: (h, r) => (h.length === 0 ? { paw: r, read: false } : { paw: lastOf(h).mG, read: true }),
  },
  // Learns whether you stay or switch after being caught, and bets on it.
  // Hides in the paw you have looked in least lately.
  crow: {
    id: 'crow',
    name: 'Crow',
    color: '#22252b',
    hide: (h, r) => {
      const recent = h.slice(-4)
      const right = recent.filter((x) => x.mG === 1).length
      const left = recent.length - right
      return right > left ? 0 : left > right ? 1 : r
    },
    guess: (h, r) => {
      const n = h.length
      if (n < 2) return { paw: r, read: false }
      const state = h[n - 1]!.caught
      let stay = 0
      let swap = 0
      for (let i = 1; i < n; i++) {
        if (h[i - 1]!.caught !== state) continue
        if (h[i]!.mH === h[i - 1]!.mH) stay++
        else swap++
      }
      if (stay + swap < 2) return { paw: r, read: false }
      const mine = h[n - 1]!.mH
      return { paw: stay >= swap ? mine : other(mine), read: true }
    },
  },
}

// The five that can walk in at the start; the Crow only comes by the hook.
export const POOL: readonly CreatureId[] = ['fox', 'owl', 'hare', 'badger', 'magpie']

// Plain data the view draws from.
export interface SlySnapshot {
  tick: number
  phase: 'choose' | 'reveal'
  creature: { id: CreatureId; name: string; color: string }
  myHide: Paw | null
  myGuess: Paw | null
  // Both sides' paws, only while a round is being revealed.
  reveal: { mH: Paw; mG: Paw; cH: Paw; cG: Paw; outcome: Outcome } | null
  // The last few rounds with this creature, oldest first.
  history: Round[]
  // Null when the match hook is removed.
  score: { me: number; it: number; to: number } | null
  visitRound: number
  crowUnlocked: boolean
  hint: { x: number; y: number } | null
}

export const createSim: CreateSim<SlySnapshot> = (config): Sim<SlySnapshot> => {
  const rng: Rng = createRng(config.seed)
  const hooks = new Set(config.hooks)

  // Three of the five, in a seeded order.
  const deck = [...POOL]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const t = deck[i]!
    deck[i] = deck[j]!
    deck[j] = t
  }
  const roster: CreatureId[] = deck.slice(0, 3)

  let visitor = 0
  let history: Round[] = []
  let phase: 'choose' | 'reveal' = 'choose'
  let revealLeft = 0
  let myHide: Paw | null = null
  let myGuess: Paw | null = null
  let reveal: SlySnapshot['reveal'] = null
  let lastOutcome: Outcome = 'fresh'
  let me = 0
  let it = 0
  let winner: 'child' | 'creature' | null = null
  let visitRounds = 0
  let visitDodges = 0
  let totalRounds = 0
  let totalDodges = 0
  let crowUnlocked = false
  let recent: number[] = []
  let hideLog: Paw[] = []
  let pending: SimEvent[] = []
  let tick = 0
  let idle = 0

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }
  const current = () => CREATURES[roster[visitor]!]

  // How far the child has this creature's number over the last four rounds: one
  // for having found its pebble three times in four, one for not being caught once.
  const grip = (): number => {
    const w = history.slice(-4)
    if (w.length < 4) return 0
    return (w.filter((r) => r.found).length >= 3 ? 1 : 0) + (w.every((r) => !r.caught) ? 1 : 0)
  }

  const nextVisitor = () => {
    visitor = (visitor + 1) % roster.length
    history = []
    me = 0
    it = 0
    visitRounds = 0
    visitDodges = 0
    lastOutcome = 'fresh'
    emit({ kind: 'state', name: 'visitor' })
  }

  // Both choices are in: the creature chooses from what it has seen of past
  // rounds only, then the round is resolved.
  const commit = () => {
    const mH = myHide!
    const mG = myGuess!
    const c = current()
    const fbH: Paw = chance(rng, 0.5) ? 0 : 1
    const fbG: Paw = chance(rng, 0.5) ? 0 : 1
    const slipH = chance(rng, NOISE)
    const slipG = chance(rng, NOISE)
    const cH = slipH ? fbH : c.hide(history, fbH)
    const g = c.guess(history, fbG)
    const cG = slipG ? fbG : g.paw
    const read = !slipG && g.read

    const found = mG === cH
    const caught = cG === mH
    const dodge = read && !caught
    const outcome: Outcome = dodge ? 'sly' : found && caught ? 'both' : found ? 'won' : caught ? 'lost' : 'neither'
    const round: Round = { mH, mG, cH, cG, found, caught, dodge }

    history.push(round)
    lastOutcome = outcome
    visitRounds++
    totalRounds++
    recent.push((found ? 1 : 0) - (caught ? 1 : 0))
    if (recent.length > 10) recent.shift()
    hideLog.push(mH)
    if (hideLog.length > 8) hideLog.shift()
    reveal = { mH, mG, cH, cG, outcome }
    phase = 'reveal'
    revealLeft = REVEAL_TICKS
    myHide = null
    myGuess = null

    if (found) emit({ kind: 'state', name: 'found' })
    if (caught) emit({ kind: 'state', name: 'caught' })
    if (dodge) {
      emit({ kind: 'state', name: 'sly' })
      visitDodges++
      totalDodges++
    }

    if (hooks.has('match')) {
      me += (found ? 1 : 0) + (dodge ? 1 : 0)
      it += caught ? 1 : 0
      if (me >= MATCH_TO || it >= MATCH_TO) {
        winner = me >= it ? 'child' : 'creature'
        emit({ kind: 'hook', name: 'match' })
      }
    }
    if (hooks.has('crow') && !crowUnlocked && visitDodges >= UNLOCK_DODGES) {
      crowUnlocked = true
      roster.splice(visitor + 1, 0, 'crow')
      emit({ kind: 'hook', name: 'crow' })
    }
  }

  // The reveal is over: the visit goes on, or ends and someone new walks in.
  const endReveal = () => {
    phase = 'choose'
    reveal = null
    idle = 0
    if (hooks.has('match')) {
      if (winner === 'child') nextVisitor()
      else if (winner === 'creature') {
        // A rematch: the creature remembers you, the score starts again.
        me = 0
        it = 0
        visitRounds = 0
        emit({ kind: 'state', name: 'rematch' })
      }
      winner = null
    } else if (visitRounds >= VISIT_ROUNDS) {
      nextVisitor()
    }
  }

  const pawAt = (x: number, y: number): { side: 'mine' | 'its'; paw: Paw } => ({
    side: y < SPLIT_Y ? 'its' : 'mine',
    paw: x < SPLIT_X ? 0 : 1,
  })

  const pointer = (input: PointerInput) => {
    if (input.phase !== 'down') return
    if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) return
    idle = 0
    if (phase !== 'choose') return
    const hit = pawAt(input.x, input.y)
    if (hit.side === 'mine') {
      myHide = hit.paw
      emit({ kind: 'state', name: 'hide' })
    } else {
      myGuess = hit.paw
      emit({ kind: 'state', name: 'guess' })
    }
    if (myHide !== null && myGuess !== null) commit()
  }

  const step = () => {
    tick++
    if (phase === 'reveal') {
      revealLeft--
      if (revealLeft <= 0) endReveal()
    } else {
      idle++
    }
  }

  const rectAround = (p: { x: number; y: number }) => ({ x: p.x - PAW_R, y: p.y - PAW_R, w: PAW_R * 2, h: PAW_R * 2 })

  const affordances = (): Affordance[] => {
    const need = (chosen: Paw | null) => (phase === 'reveal' ? 0.2 : chosen === null ? 0.75 : 0.3)
    return [
      ...MY_PAWS.map((p): Affordance => ({ ...rectAround(p), kind: 'tap', salience: need(myHide) })),
      ...CREATURE_PAWS.map((p): Affordance => ({ ...rectAround(p), kind: 'tap', salience: need(myGuess) })),
    ]
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const g = grip()
    const edge = recent.length === 0 ? 0 : recent.reduce((a, b) => a + b, 0) / recent.length
    let swaps = 0
    for (let i = 1; i < hideLog.length; i++) if (hideLog[i] !== hideLog[i - 1]) swaps++
    return {
      // Per creature: fresh, or one of four outcome classes of the last round
      // (won, lost, wash, sly) with the grip 0 to 2: 1 + 4 x 3 = 13 classes.
      signature:
        lastOutcome === 'fresh'
          ? `${current().id}-fresh`
          : `${current().id}-${lastOutcome === 'both' || lastOutcome === 'neither' ? 'wash' : lastOutcome}-${g}`,
      features: {
        edge,
        switchRate: hideLog.length < 2 ? 0 : swaps / (hideLog.length - 1),
        grip: g,
        dodges: totalDodges,
        rounds: totalRounds,
      },
      events,
    }
  }

  // Only with hints on, and only after a quiet spell: point at the paw that
  // still needs a choice. It never changes what the sim does.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || phase !== 'choose' || idle < HINT_AFTER_TICKS) return null
    return myHide === null ? { ...MY_PAWS[0] } : myGuess === null ? { ...CREATURE_PAWS[0] } : null
  }

  const snapshot = (): SlySnapshot => {
    const c = current()
    return {
      tick,
      phase,
      creature: { id: c.id, name: c.name, color: c.color },
      myHide,
      myGuess,
      reveal: reveal ? { ...reveal } : null,
      history: history.slice(-SHOWN).map((r) => ({ ...r })),
      score: hooks.has('match') ? { me, it, to: MATCH_TO } : null,
      visitRound: visitRounds,
      crowUnlocked,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
