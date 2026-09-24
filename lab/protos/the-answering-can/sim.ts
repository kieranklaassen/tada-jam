// The Answering Can. Three tin cans on strings run through a hedge to three
// hidden friends. Pull a can out until its string is taut and knock on it: the
// friend answers down the string with your rhythm changed by a rule you have to
// work out. Slack strings carry nothing. Once a friend has answered twice you
// can name its rule; one friend per session stacks two rules together.
//
// Pure and deterministic: the seed only deals the friends' rules and the cans'
// resting places; play itself reads no randomness, only ticks and touches.

import { between, createRng, deriveSeed, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

// ------------------------------------------------------------------ rhythm
// A phrase is up to three knocks; only the gaps between them matter, and each
// gap is Short or Long.
export type Gap = 'S' | 'L'
export type RuleId = 'echo' | 'flip' | 'rev' | 'dbl' | 'dbl+rev' | 'dbl+flip' | 'rev+flip'

export const SINGLES: readonly RuleId[] = ['echo', 'flip', 'rev', 'dbl']
export const STACKS: readonly RuleId[] = ['dbl+rev', 'dbl+flip', 'rev+flip']
export const RULE_IDS: readonly RuleId[] = [...SINGLES, ...STACKS]
export const RULE_LABELS: Record<RuleId, string> = {
  echo: 'echoes',
  flip: 'flips',
  rev: 'reverses',
  dbl: 'doubles',
  'dbl+rev': 'doubles + reverses',
  'dbl+flip': 'doubles + flips',
  'rev+flip': 'reverses + flips',
}

// A rule is a small pipeline, always applied in this order: flip swaps short
// and long gaps, rev turns the gaps around, dbl answers every knock with two
// quick ones (a knock becomes a pair, the gaps between pairs stay).
export function applyRule(rule: RuleId, gaps: readonly Gap[]): Gap[] {
  const parts = rule.split('+')
  let out: Gap[] = [...gaps]
  if (parts.includes('flip')) out = out.map((g) => (g === 'S' ? 'L' : 'S'))
  if (parts.includes('rev')) out.reverse()
  if (parts.includes('dbl')) {
    const doubled: Gap[] = []
    for (let i = 0; i <= out.length; i++) {
      doubled.push('S')
      if (i < out.length) doubled.push(out[i]!)
    }
    out = doubled
  }
  return out
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}

// The rule of each friend by slot: two different single rules and one stacked
// pair, in a seeded order.
export function friendsFor(seed: number): RuleId[] {
  const rng = createRng(seed)
  const singles = shuffle(rng, [...SINGLES]).slice(0, 2)
  const stack = pick(rng, STACKS)
  return shuffle(rng, [...singles, stack])
}

// ------------------------------------------------------------------ field
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const ANCHOR_X = 930
export const ANCHOR_YS = [140, 360, 580] as const
export const STRING_LEN = 430
const TAUT_FRAC = 0.75
const CAN_R = 50
// A finger is not a pixel, and a seven-year-old is not a sniper: a can is
// caught from well outside its rim.
const HIT_SLOP = 45
const TAP_MOVE = 24
const MIN_X = 60
const MIN_Y = 60
const MAX_Y = 630
const CAN_STANDOFF = 40
const COLORS = ['#d9583b', '#3b7fc4', '#e2b23a']
const CHIP_Y = 690
const CHIP_W = 145
const CHIP_H = 90

// ------------------------------------------------------------------ timing
// A gap under SHORT_MAX ticks is Short, from there to just under QUIET_TICKS is
// Long; QUIET_TICKS of silence, or a third knock, ends the phrase.
const SHORT_MAX = 15
const QUIET_TICKS = 27
const MAX_KNOCKS = 3
// What the tests (and a patient child) use for Short and Long spacing.
export const SHORT_TICKS = 10
export const LONG_TICKS = 22
const REPLY_DELAY = 12
const REPLY_S = 8
const REPLY_L = 22
export const WAVE_TICKS = 12
const GUESS_COOLDOWN = 150
export const MIN_HEARD_TO_GUESS = 2
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64
const MAX_WAVES = 48

// What the child last heard: nothing yet, a dead line, or an answer that is the
// same rhythm, the same doubled, another rhythm, or that doubled.
type Heard = 'none' | 'dead' | 'same' | 'twice' | 'changed' | 'twice-changed'

interface Exchange {
  friend: number
  you: Gap[]
  back: Gap[]
  // How many of the friend's knocks have arrived so far.
  shown: number
}

interface Reply {
  arrivals: number[]
  next: number
  kind: Heard
  ex: Exchange
}

interface Friend {
  rule: RuleId
  ax: number
  ay: number
  x: number
  y: number
  color: string
  taut: boolean
  asleep: boolean
  solved: boolean
  heldBy: number | null
  // Tick of each knock in the phrase being listened to.
  phrase: number[]
  reply: Reply | null
  // Answers heard from this friend.
  heard: number
  shapes: Set<string>
}

interface Touch {
  friend: number
  startX: number
  startY: number
  // Where the can sits relative to the finger.
  offX: number
  offY: number
  moved: boolean
}

export interface AnswerSnapshot {
  tick: number
  friends: Array<{
    ax: number
    ay: number
    bush: Rect
    can: { x: number; y: number; r: number; color: string; taut: boolean; held: boolean; asleep: boolean }
    solved: boolean
    label: string | null
    exchanges: number
  }>
  // Open while the child is naming a friend's rule.
  panel: { friend: number; chips: Array<Rect & { rule: RuleId; label: string }> } | null
  cooling: boolean
  waves: Array<{ friend: number; dir: 'out' | 'back'; age: number }>
  exchange: Exchange | null
  tip: string
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inRect = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const bushOf = (ay: number): Rect => ({ x: 940, y: ay - 90, w: 220, h: 180 })
const CHIPS = RULE_IDS.map((rule, i) => ({ rule, label: RULE_LABELS[rule], x: 60 + i * (CHIP_W + 8), y: CHIP_Y, w: CHIP_W, h: CHIP_H }))

function classify(you: readonly Gap[], back: readonly Gap[]): Heard {
  if (back.length === you.length) return back.every((g, i) => g === you[i]) ? 'same' : 'changed'
  return JSON.stringify(back) === JSON.stringify(applyRule('dbl', you)) ? 'twice' : 'twice-changed'
}

export const createSim: CreateSim<AnswerSnapshot> = (config): Sim<AnswerSnapshot> => {
  const rng = createRng(deriveSeed(config.seed, 1))
  const hooks = new Set(config.hooks)
  const rules = friendsFor(config.seed)
  const stackSlot = rules.findIndex((r) => STACKS.includes(r))

  const friends: Friend[] = rules.map((rule, i) => ({
    rule,
    ax: ANCHOR_X,
    ay: ANCHOR_YS[i]!,
    x: 0,
    y: 0,
    color: COLORS[i]!,
    taut: false,
    asleep: hooks.has('stack-wakes') && i === stackSlot,
    solved: false,
    heldBy: null,
    phrase: [],
    reply: null,
    heard: 0,
    shapes: new Set<string>(),
  }))

  const touches = new Map<number, Touch>()
  const waves: Array<{ friend: number; dir: 'out' | 'back'; born: number }> = []
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let cooldown = 0
  let heard: Heard = 'none'
  let exchange: Exchange | null = null
  let panel: { friend: number } | null = null

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }
  const wave = (friend: number, dir: 'out' | 'back') => {
    if (waves.length >= MAX_WAVES) waves.shift()
    waves.push({ friend, dir, born: tick })
  }

  // Put a can somewhere the string allows: inside the yard, no further from
  // its hole than the string is long. Returns the distance.
  const place = (f: Friend, x: number, y: number): number => {
    let px = clamp(x, MIN_X, f.ax - CAN_STANDOFF)
    let py = clamp(y, MIN_Y, MAX_Y)
    const d = Math.hypot(px - f.ax, py - f.ay)
    if (d > STRING_LEN) {
      const k = STRING_LEN / d
      px = f.ax + (px - f.ax) * k
      py = f.ay + (py - f.ay) * k
    }
    f.x = Math.min(px, f.ax - CAN_STANDOFF)
    f.y = py
    return Math.hypot(f.x - f.ax, f.y - f.ay)
  }

  friends.forEach((f) => {
    const d0 = between(rng, 0.58, 0.66) * STRING_LEN
    const a = between(rng, -0.35, 0.35)
    place(f, f.ax - d0 * Math.cos(a), f.ay + d0 * Math.sin(a))
  })

  const updateTaut = (f: Friend) => {
    const now = Math.hypot(f.x - f.ax, f.y - f.ay) >= TAUT_FRAC * STRING_LEN
    if (now && !f.taut) {
      f.taut = true
      emit({ kind: 'state', name: 'taut' })
    } else if (!now && f.taut) {
      // The line goes dead: whatever was being said or heard is lost.
      f.taut = false
      f.phrase = []
      f.reply = null
      emit({ kind: 'state', name: 'slack' })
    }
  }

  const eligibleBush = (f: Friend) => !f.asleep && !f.solved && f.heard >= MIN_HEARD_TO_GUESS && cooldown === 0
  const solvedCount = () => friends.filter((f) => f.solved).length

  const canAt = (x: number, y: number): number => {
    let best = -1
    let bestD = Infinity
    friends.forEach((f, i) => {
      if (f.asleep) return
      const d = Math.hypot(x - f.x, y - f.y)
      if (d <= CAN_R + HIT_SLOP && d < bestD) {
        best = i
        bestD = d
      }
    })
    return best
  }

  const knock = (f: Friend, i: number) => {
    emit({ kind: 'state', name: 'knock' })
    if (!f.taut) {
      heard = 'dead'
      emit({ kind: 'state', name: 'dead' })
      return
    }
    wave(i, 'out')
    if (f.reply) {
      // Knocking over the friend's answer silences it.
      f.reply = null
      heard = 'none'
      emit({ kind: 'state', name: 'cut' })
    } else if (f.phrase.length === 0) heard = 'none'
    f.phrase.push(tick)
  }

  const closePhrase = (f: Friend, i: number) => {
    const gaps: Gap[] = []
    for (let k = 1; k < f.phrase.length; k++) gaps.push(f.phrase[k]! - f.phrase[k - 1]! < SHORT_MAX ? 'S' : 'L')
    f.phrase = []
    f.shapes.add(gaps.join(''))
    const back = applyRule(f.rule, gaps)
    const arrivals = [tick + REPLY_DELAY]
    for (const g of back) arrivals.push(arrivals[arrivals.length - 1]! + (g === 'S' ? REPLY_S : REPLY_L))
    f.reply = { arrivals, next: 0, kind: classify(gaps, back), ex: { friend: i, you: gaps, back, shown: 0 } }
  }

  const guess = (rule: RuleId) => {
    if (!panel) return
    const f = friends[panel.friend]!
    panel = null
    if (rule === f.rule) {
      f.solved = true
      emit({ kind: 'state', name: 'solved' })
      const sleeper = friends[stackSlot]!
      if (hooks.has('stack-wakes') && sleeper.asleep) {
        sleeper.asleep = false
        emit({ kind: 'hook', name: 'stack-wakes' })
      }
    } else {
      cooldown = GUESS_COOLDOWN
      emit({ kind: 'state', name: 'wrong' })
    }
  }

  const endTouch = (id: number, commit: boolean) => {
    const t = touches.get(id)
    if (!t) return
    touches.delete(id)
    const f = friends[t.friend]!
    f.heldBy = null
    if (t.moved) {
      // Let go: a string that is tight enough pulls straight and stays tight.
      // The stretch goes through place(), so the can stays inside the yard; if
      // the yard's edge would leave it looser than it was, it stays where it is.
      if (f.taut) {
        const d = Math.hypot(f.x - f.ax, f.y - f.ay)
        if (d > 0) {
          const keep = { x: f.x, y: f.y }
          const dist = place(f, f.ax + ((f.x - f.ax) * STRING_LEN) / d, f.ay + ((f.y - f.ay) * STRING_LEN) / d)
          if (dist < d) {
            f.x = keep.x
            f.y = keep.y
          }
        }
        updateTaut(f)
      }
    } else if (commit) knock(f, t.friend)
  }

  const down = (id: number, x: number, y: number) => {
    if (panel) {
      const chip = CHIPS.find((c) => inRect(c, x, y))
      if (chip) {
        guess(chip.rule)
        return
      }
    }
    const i = canAt(x, y)
    if (i >= 0) {
      panel = null
      const f = friends[i]!
      // A finger that never lifted (a lost pointer) does not lock the can.
      if (f.heldBy !== null) touches.delete(f.heldBy)
      f.heldBy = id
      touches.set(id, { friend: i, startX: x, startY: y, offX: f.x - x, offY: f.y - y, moved: false })
      return
    }
    const b = friends.findIndex((f) => eligibleBush(f) && inRect(bushOf(f.ay), x, y))
    if (b >= 0) {
      panel = { friend: b }
      emit({ kind: 'state', name: 'guess-open' })
      return
    }
    panel = null
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      endTouch(id, false)
      down(id, x, y)
      return
    }
    const t = touches.get(id)
    if (!t) return
    if (phase === 'move') {
      if (!finite) return
      if (!t.moved && Math.hypot(x - t.startX, y - t.startY) > TAP_MOVE) {
        t.moved = true
        emit({ kind: 'state', name: 'pull' })
      }
      if (t.moved) {
        const f = friends[t.friend]!
        place(f, x + t.offX, y + t.offY)
        updateTaut(f)
      }
      return
    }
    endTouch(id, true)
  }

  const step = () => {
    tick++
    idleTicks++
    if (cooldown > 0) cooldown--
    friends.forEach((f, i) => {
      if (f.phrase.length > 0 && (f.phrase.length >= MAX_KNOCKS || tick - f.phrase[f.phrase.length - 1]! >= QUIET_TICKS)) closePhrase(f, i)
      const r = f.reply
      if (!r) return
      while (r.next < r.arrivals.length && tick >= r.arrivals[r.next]!) {
        wave(i, 'back')
        if (r.next === 0) {
          heard = r.kind
          f.heard++
          exchange = r.ex
          emit({ kind: 'state', name: 'answer' })
        }
        r.next++
        r.ex.shown = r.next
      }
      if (r.next >= r.arrivals.length) f.reply = null
    })
    while (waves.length > 0 && tick - waves[0]!.born > WAVE_TICKS) waves.shift()
  }

  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const f of friends) {
      if (f.asleep || f.heldBy !== null) continue
      list.push({ x: f.x - CAN_R, y: f.y - CAN_R, w: CAN_R * 2, h: CAN_R * 2, kind: f.taut ? 'tap' : 'drag', salience: f.taut ? 0.7 : 0.55 })
    }
    for (const f of friends) {
      if (eligibleBush(f)) list.push({ ...bushOf(f.ay), kind: 'tap', salience: 0.4 })
    }
    if (panel) for (const c of CHIPS) list.push({ x: c.x, y: c.y, w: c.w, h: c.h, kind: 'tap', salience: 0.5 })
    return list
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const pose = panel ? 'guess' : friends.some((f) => f.taut) ? 'taut' : 'slack'
    const solved = solvedCount()
    const solvedClass = solved === 0 ? 'none' : solved === friends.length ? 'all' : 'some'
    let probes = 0
    for (const f of friends) probes += f.shapes.size
    return { signature: `${pose}/${heard}/${solvedClass}`, features: { solved, probes }, events }
  }

  // Data only: where a quiet child might look next. Never changes the sim.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS) return null
    const ready = friends.find(eligibleBush)
    if (ready) {
      const b = bushOf(ready.ay)
      return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
    }
    const live = friends.find((f) => !f.asleep && !f.solved && f.taut)
    const target = live ?? friends.find((f) => !f.asleep && !f.taut)
    return target ? { x: target.x, y: target.y } : null
  }

  const tip = (): string => {
    const awake = friends.filter((f) => !f.asleep)
    if (solvedCount() === friends.length) return 'You know all three friends. Knock on any to check.'
    if (panel) return 'Which rule does this friend follow?'
    if (cooldown > 0) return 'Not quite. Listen a little more.'
    if (!awake.some((f) => f.taut)) return 'Pull a can out until its string is tight, then knock.'
    if (friends.every((f) => f.heard === 0)) return 'Knock on the tight can and listen.'
    if (friends.some(eligibleBush)) return 'Think you know a friend? Tap its bush.'
    return 'Try other rhythms: one knock, two quick, two slow, three.'
  }

  const snapshot = (): AnswerSnapshot => ({
    tick,
    friends: friends.map((f) => ({
      ax: f.ax,
      ay: f.ay,
      bush: bushOf(f.ay),
      can: { x: f.x, y: f.y, r: CAN_R, color: f.color, taut: f.taut, held: f.heldBy !== null, asleep: f.asleep },
      solved: f.solved,
      label: f.solved ? RULE_LABELS[f.rule] : null,
      exchanges: f.heard,
    })),
    panel: panel ? { friend: panel.friend, chips: CHIPS.map((c) => ({ ...c })) } : null,
    cooling: cooldown > 0,
    waves: waves.map((w) => ({ friend: w.friend, dir: w.dir, age: tick - w.born })),
    exchange: exchange ? { friend: exchange.friend, you: [...exchange.you], back: [...exchange.back], shown: exchange.shown } : null,
    tip: tip(),
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
