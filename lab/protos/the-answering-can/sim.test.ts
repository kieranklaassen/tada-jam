// Proof for The Answering Can. The characteristic moment: a can pulled taut,
// knocked on, and answered down the string with a rhythm the friend's hidden
// rule changed; a slack can answers nothing. The rest proves the puzzle is
// fair (any two rules can be told apart within three knocks), the guess
// check, the stacked friend's hook, and the shared contract points.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { RULE_IDS, SINGLES, STACKS, applyRule, createSim, friendsFor, LONG_TICKS, SHORT_TICKS, STRING_LEN } from './sim.ts'
import type { AnswerSnapshot, Gap, RuleId } from './sim.ts'

// Hooks are off unless a test asks for them, so every friend is awake.
function start(o: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: o.seed ?? 1, hooks: o.hooks ?? [], hints: o.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const snap = (sim: Sim<AnswerSnapshot>) => sim.snapshot()

// The first seed that hands out `rule`, and the slot it lands in.
function seedWith(rule: RuleId): { seed: number; slot: number } {
  for (let seed = 1; seed < 400; seed++) {
    const slot = friendsFor(seed).indexOf(rule)
    if (slot >= 0) return { seed, slot }
  }
  throw new Error(`no seed gives ${rule}`)
}

// Drag a can out along its string until it is taut.
function pullTaut(sim: Sim<AnswerSnapshot>, slot: number): void {
  const f = snap(sim).friends[slot]!
  const from = f.can
  const to = { x: f.ax - STRING_LEN * 0.97, y: f.ay + 20 }
  sim.pointer({ id: 1, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 8; s++) {
    sim.pointer({ id: 1, phase: 'move', x: from.x + ((to.x - from.x) * s) / 8, y: from.y + ((to.y - from.y) * s) / 8 })
    sim.step()
  }
  sim.pointer({ id: 1, phase: 'up', x: to.x, y: to.y })
}

// One knock on the can where it now sits (a press and release in place).
function knock(sim: Sim<AnswerSnapshot>, slot: number, id = 2): void {
  const c = snap(sim).friends[slot]!.can
  sim.pointer({ id, phase: 'down', x: c.x, y: c.y })
  sim.pointer({ id, phase: 'up', x: c.x, y: c.y })
}

// Knocks with the given short/long spacing, then waits for the whole answer.
function say(sim: Sim<AnswerSnapshot>, slot: number, gaps: readonly Gap[]): void {
  knock(sim, slot)
  for (const g of gaps) {
    run(sim, g === 'S' ? SHORT_TICKS : LONG_TICKS)
    knock(sim, slot)
  }
  run(sim, 140)
}

function tapAt(sim: Sim<AnswerSnapshot>, x: number, y: number): void {
  sim.pointer({ id: 3, phase: 'down', x, y })
  sim.pointer({ id: 3, phase: 'up', x, y })
}

// Open a friend's bush and pick a rule chip.
function guess(sim: Sim<AnswerSnapshot>, slot: number, rule: RuleId): void {
  const b = snap(sim).friends[slot]!.bush
  tapAt(sim, b.x + b.w / 2, b.y + b.h / 2)
  const chip = snap(sim).panel!.chips.find((c) => c.rule === rule)!
  tapAt(sim, chip.x + chip.w / 2, chip.y + chip.h / 2)
}

const SHAPES: Gap[][] = [[], ['S'], ['L'], ['S', 'S'], ['S', 'L'], ['L', 'S'], ['L', 'L']]

describe('the rules', () => {
  it('echo repeats, flip swaps short and long, reverse turns the gaps around, double answers each knock twice', () => {
    expect(applyRule('echo', ['S', 'L'])).toEqual(['S', 'L'])
    expect(applyRule('flip', ['S', 'L'])).toEqual(['L', 'S'])
    expect(applyRule('rev', ['S', 'L'])).toEqual(['L', 'S'])
    expect(applyRule('rev', ['L'])).toEqual(['L'])
    expect(applyRule('dbl', [])).toEqual(['S'])
    expect(applyRule('dbl', ['L'])).toEqual(['S', 'L', 'S'])
  })

  it('stacked rules compose: flip, then reverse, then double', () => {
    expect(applyRule('rev+flip', ['S', 'S'])).toEqual(['L', 'L'])
    expect(applyRule('rev+flip', ['S', 'L'])).toEqual(['S', 'L'])
    expect(applyRule('dbl+rev', ['S', 'L'])).toEqual(['S', 'L', 'S', 'S', 'S'])
    expect(applyRule('dbl+flip', ['L'])).toEqual(['S', 'S', 'S'])
  })

  it('any two rules can be told apart by some phrase of at most three knocks', () => {
    for (const a of RULE_IDS) {
      for (const b of RULE_IDS) {
        if (a === b) continue
        const apart = SHAPES.some((p) => JSON.stringify(applyRule(a, p)) !== JSON.stringify(applyRule(b, p)))
        expect(apart, `${a} vs ${b}`).toBe(true)
      }
    }
  })

  it('a session has three friends: two single rules and one stacked pair, in a seeded order', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rules = friendsFor(seed)
      expect(rules).toHaveLength(3)
      expect(rules.filter((r) => STACKS.includes(r))).toHaveLength(1)
      const singles = rules.filter((r) => SINGLES.includes(r))
      expect(new Set(singles).size).toBe(2)
    }
    expect(friendsFor(5)).toEqual(friendsFor(5))
    expect(new Set(Array.from({ length: 40 }, (_, i) => friendsFor(i + 1).join())).size).toBeGreaterThan(10)
  })
})

describe('the characteristic moment: a taut can is answered, a slack can is dead', () => {
  it('a knock on a slack can gets no answer at all', () => {
    const sim = start({ seed: 3 })
    sim.observe()
    knock(sim, 0)
    run(sim, 200)
    const obs = sim.observe()
    expect(obs.signature).toBe('slack/dead/none')
    expect(obs.events.some((e) => e.name === 'answer')).toBe(false)
    expect(snap(sim).exchange).toBeNull()
  })

  it('pulling a can out until its string is tight makes the line live', () => {
    const { seed, slot } = seedWith('echo')
    const sim = start({ seed })
    expect(snap(sim).friends[slot]!.can.taut).toBe(false)
    pullTaut(sim, slot)
    expect(snap(sim).friends[slot]!.can.taut).toBe(true)
    expect(sim.observe().signature).toBe('taut/none/none')
  })

  it('a lone knock is answered by two from the doubling friend', () => {
    const { seed, slot } = seedWith('dbl')
    const sim = start({ seed })
    pullTaut(sim, slot)
    sim.observe()
    say(sim, slot, [])
    expect(snap(sim).exchange).toMatchObject({ friend: slot, you: [], back: ['S'], shown: 2 })
    const obs = sim.observe()
    expect(obs.signature).toBe('taut/twice/none')
    expect(obs.events).toContainEqual({ kind: 'state', name: 'answer' })
    expect(snap(sim).friends[slot]!.exchanges).toBe(1)
    // One lone shape sent to one friend is one probe.
    expect(obs.features.probes).toBe(1)
  })

  it('the same lone knock is echoed by the echoing friend, so one knock already tells them apart', () => {
    const { seed, slot } = seedWith('echo')
    const sim = start({ seed })
    pullTaut(sim, slot)
    say(sim, slot, [])
    expect(snap(sim).exchange).toMatchObject({ you: [], back: [], shown: 1 })
    expect(sim.observe().signature).toBe('taut/same/none')
  })

  it('a short then long triple comes back long then short from the reversing friend', () => {
    const { seed, slot } = seedWith('rev')
    const sim = start({ seed })
    pullTaut(sim, slot)
    say(sim, slot, ['S', 'L'])
    expect(snap(sim).exchange).toMatchObject({ you: ['S', 'L'], back: ['L', 'S'], shown: 3 })
    expect(sim.observe().signature).toBe('taut/changed/none')
  })

  it('the answer arrives one knock at a time, not all at once', () => {
    const { seed, slot } = seedWith('rev')
    const sim = start({ seed })
    pullTaut(sim, slot)
    knock(sim, slot)
    run(sim, SHORT_TICKS)
    knock(sim, slot)
    run(sim, LONG_TICKS)
    knock(sim, slot)
    run(sim, 20) // just past the reply delay: the first pulse only
    const early = snap(sim).exchange!
    expect(early.shown).toBeGreaterThanOrEqual(1)
    expect(early.shown).toBeLessThan(3)
    run(sim, 100)
    expect(snap(sim).exchange!.shown).toBe(3)
  })

  it('a stacked friend needs the right probe: doubles-and-flips answers a spaced pair with four even knocks', () => {
    const { seed, slot } = seedWith('dbl+flip')
    const sim = start({ seed })
    pullTaut(sim, slot)
    say(sim, slot, ['L'])
    expect(snap(sim).exchange!.back).toEqual(['S', 'S', 'S'])
  })

  it('a stacked answer is heard as more knocks in another rhythm', () => {
    const { seed, slot } = seedWith('dbl+rev')
    const sim = start({ seed })
    pullTaut(sim, slot)
    say(sim, slot, ['S', 'L'])
    expect(snap(sim).exchange).toMatchObject({ you: ['S', 'L'], back: ['S', 'L', 'S', 'S', 'S'], shown: 6 })
    expect(sim.observe().signature).toBe('taut/twice-changed/none')
  })

  it('letting the string go slack mid-answer stops the answer', () => {
    const { seed, slot } = seedWith('rev')
    const sim = start({ seed })
    pullTaut(sim, slot)
    knock(sim, slot)
    run(sim, SHORT_TICKS)
    knock(sim, slot)
    run(sim, SHORT_TICKS)
    knock(sim, slot)
    run(sim, 20)
    const c = snap(sim).friends[slot]!
    sim.pointer({ id: 5, phase: 'down', x: c.can.x, y: c.can.y })
    sim.pointer({ id: 5, phase: 'move', x: c.can.x + 150, y: c.can.y })
    sim.pointer({ id: 5, phase: 'up', x: c.can.x + 150, y: c.can.y })
    run(sim, 150)
    expect(snap(sim).friends[slot]!.can.taut).toBe(false)
    expect(snap(sim).exchange!.shown).toBeLessThan(3)
  })

  it('knocking over an answer cuts it off and starts a fresh phrase', () => {
    const { seed, slot } = seedWith('dbl')
    const sim = start({ seed })
    pullTaut(sim, slot)
    sim.observe()
    knock(sim, slot)
    run(sim, 45) // phrase closed, answer under way
    knock(sim, slot)
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'cut' })
    expect(obs.signature).toBe('taut/none/none')
  })
})

describe('guessing the rule', () => {
  it('a friend that has not answered twice cannot be guessed yet', () => {
    const { seed, slot } = seedWith('echo')
    const sim = start({ seed })
    pullTaut(sim, slot)
    say(sim, slot, [])
    const b = snap(sim).friends[slot]!.bush
    tapAt(sim, b.x + b.w / 2, b.y + b.h / 2)
    expect(snap(sim).panel).toBeNull()
    expect(sim.affordances().some((a) => a.x === b.x && a.y === b.y)).toBe(false)
  })

  it('a right guess solves the friend; a wrong guess makes the child wait', () => {
    const { seed, slot } = seedWith('echo')
    const sim = start({ seed })
    pullTaut(sim, slot)
    say(sim, slot, [])
    say(sim, slot, [])
    sim.observe()
    guess(sim, slot, 'dbl')
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'wrong' })
    expect(sim.observe().features.solved).toBe(0)
    expect(snap(sim).cooling).toBe(true)
    // While cooling, the bush does not open.
    const b = snap(sim).friends[slot]!.bush
    tapAt(sim, b.x + b.w / 2, b.y + b.h / 2)
    expect(snap(sim).panel).toBeNull()
    run(sim, 200)
    expect(snap(sim).cooling).toBe(false)
    guess(sim, slot, 'echo')
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'solved' })
    expect(obs.features.solved).toBe(1)
    expect(obs.signature).toBe('taut/same/some')
    expect(snap(sim).friends[slot]!.label).toBe('echoes')
  })
})

describe('the hooks list', () => {
  function solveOne(sim: Sim<AnswerSnapshot>, slot: number, rule: RuleId): void {
    pullTaut(sim, slot)
    say(sim, slot, [])
    say(sim, slot, [])
    guess(sim, slot, rule)
  }

  it('declares the one hook it has', () => {
    expect(meta.hooks).toEqual(['stack-wakes'])
  })

  it('with the hook, the stacked friend sleeps until one friend is solved, then wakes with a hook event', () => {
    const seed = 4
    const rules = friendsFor(seed)
    const stack = rules.findIndex((r) => STACKS.includes(r))
    const other = rules.findIndex((_, i) => i !== stack)
    const sim = start({ seed, hooks: ['stack-wakes'] })
    expect(snap(sim).friends[stack]!.can.asleep).toBe(true)
    sim.observe()
    solveOne(sim, other, rules[other]!)
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'stack-wakes' })
    expect(snap(sim).friends[stack]!.can.asleep).toBe(false)
  })

  it('an empty list means every friend is awake from the start and no hook event ever fires', () => {
    const seed = 4
    const rules = friendsFor(seed)
    const sim = start({ seed, hooks: [] })
    expect(snap(sim).friends.every((f) => !f.can.asleep)).toBe(true)
    solveOne(sim, 0, rules[0]!)
    const obs = sim.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(obs.features.solved).toBe(1)
  })

  it('removing the hook changes the world: a sleeping friend has no affordance', () => {
    const seed = 4
    const withHook = start({ seed, hooks: ['stack-wakes'] })
    const without = start({ seed, hooks: [] })
    expect(withHook.affordances().length).toBeLessThan(without.affordances().length)
  })
})

describe('determinism, affordances, hints', () => {
  it('the same seed and script give the same signature and snapshot; other seeds deal other friends', () => {
    const { seed, slot } = seedWith('rev')
    const play = () => {
      const sim = start({ seed })
      pullTaut(sim, slot)
      say(sim, slot, ['S', 'L'])
      return [sim.observe().signature, JSON.stringify(sim.snapshot())]
    }
    expect(play()).toEqual(play())
    expect(JSON.stringify(start({ seed: 1 }).snapshot())).not.toBe(JSON.stringify(start({ seed: 2 }).snapshot()))
  })

  it('affordances are top-left rectangles centred on the cans', () => {
    const sim = start({ hooks: [] })
    const list = sim.affordances()
    for (const f of snap(sim).friends) {
      const match = list.find((a) => Math.abs(a.x + a.w / 2 - f.can.x) < 1e-9 && Math.abs(a.y + a.h / 2 - f.can.y) < 1e-9)
      expect(match, `an affordance centred on the can at ${f.can.x},${f.can.y}`).toBeDefined()
      expect(match!.w).toBeGreaterThanOrEqual(60)
    }
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('a can never leaves the length of its string, however it is dragged', () => {
    const sim = start({ hooks: [] })
    const f = snap(sim).friends[0]!
    sim.pointer({ id: 1, phase: 'down', x: f.can.x, y: f.can.y })
    for (const [x, y] of [[-500, -500], [5000, 5000], [0, 900], [1100, 10]] as const) sim.pointer({ id: 1, phase: 'move', x, y })
    sim.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    const c = snap(sim).friends[0]!
    expect(Math.hypot(c.can.x - c.ax, c.can.y - c.ay)).toBeLessThanOrEqual(STRING_LEN + 35)
  })

  it('hints ring something after a quiet spell, only when on, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 400)
    run(off, 400)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    // 3 poses x 6 things heard x 3 solved states.
    expect(meta.signatureBound).toBe(3 * 6 * 3)
  })

  it('observes exactly the declared features, and both have an objective', () => {
    const observed = Object.keys(start().observe().features).sort()
    expect(observed).toEqual(meta.features.map((f) => f.name).sort())
    expect(meta.features.filter((f) => f.objective).map((f) => f.name)).toEqual(['solved', 'probes'])
  })

  it('probes count distinct shapes per friend, not repeats', () => {
    const { seed, slot } = seedWith('echo')
    const sim = start({ seed })
    pullTaut(sim, slot)
    say(sim, slot, [])
    say(sim, slot, [])
    expect(sim.observe().features.probes).toBe(1)
    say(sim, slot, ['S'])
    say(sim, slot, ['L'])
    expect(sim.observe().features.probes).toBe(3)
  })
})
