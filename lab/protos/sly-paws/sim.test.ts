// Proof for Sly Paws. The characteristic moment: the child feeds the owl a
// false habit (hides right three times, so the owl bets on a fourth) and breaks
// it on the fourth round, slipping the owl's read. Written before the sim.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { CREATURES, CREATURE_PAWS, MY_PAWS, POOL, REVEAL_TICKS, createSim } from './sim.ts'
import type { Paw, Round, SlySnapshot } from './sim.ts'

function start(o: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: o.seed ?? 1, hooks: o.hooks ?? meta.hooks, hints: o.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

function tapAt(sim: Sim, x: number, y: number): void {
  sim.pointer({ id: 1, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id: 1, phase: 'up', x, y })
}

// One whole round: hide in my paw, guess its paw, then let the reveal finish.
// Returns the round as the sim recorded it.
function playRound(sim: Sim<SlySnapshot>, hide: Paw, guess: Paw): Round {
  tapAt(sim, MY_PAWS[hide].x, MY_PAWS[hide].y)
  tapAt(sim, CREATURE_PAWS[guess].x, CREATURE_PAWS[guess].y)
  const round = sim.snapshot().history.at(-1)!
  run(sim, REVEAL_TICKS + 2)
  return round
}

// The first seed at or after `from` whose first visitor is `id`.
function seedWithFirst(id: string, from = 1): number {
  for (let seed = from; seed < from + 400; seed++) {
    if (start({ seed }).snapshot().creature.id === id) return seed
  }
  throw new Error(`no seed starts with ${id}`)
}

const hasEvent = (events: ReturnType<Sim['observe']>['events'], kind: string, name: string) =>
  events.some((e) => e.kind === kind && e.name === name)

describe('the characteristic moment: feeding the owl a false habit and breaking it', () => {
  it('hiding right three times makes the owl bet on a fourth, and hiding left slips its read', () => {
    let dodged = 0
    let earlyDodge = 0
    const trials = 25
    for (let i = 0; i < trials; i++) {
      const sim = start({ seed: seedWithFirst('owl', 1 + i * 7), hooks: [] })
      const early = [playRound(sim, 1, 0), playRound(sim, 1, 0), playRound(sim, 1, 0)]
      const r4 = playRound(sim, 0, 0)
      if (early.some((r) => r.dodge)) earlyDodge++
      if (r4.dodge) dodged++
    }
    // The owl only bets once it has seen a streak, so there is no read to slip early.
    expect(earlyDodge).toBe(0)
    // It slips now and then, so most (not all) trials show the dodge.
    expect(dodged).toBeGreaterThanOrEqual(Math.floor(trials * 0.7))
  })

  it('the dodge shows as a sly state event and an owl-sly signature', () => {
    let seen = false
    for (let from = 1; from < 200 && !seen; from += 5) {
      const sim = start({ seed: seedWithFirst('owl', from), hooks: [] })
      for (let r = 0; r < 3; r++) playRound(sim, 1, 0)
      sim.observe()
      tapAt(sim, MY_PAWS[0].x, MY_PAWS[0].y)
      tapAt(sim, CREATURE_PAWS[0].x, CREATURE_PAWS[0].y)
      const obs = sim.observe()
      if (hasEvent(obs.events, 'state', 'sly')) {
        seen = true
        expect(obs.signature).toMatch(/^owl-sly-[0-2]$/)
        expect(sim.snapshot().reveal?.outcome).toBe('sly')
      }
    }
    expect(seen).toBe(true)
  })

  it('a child who keeps hiding left is caught by the owl nearly every time (it looks left)', () => {
    const sim = start({ seed: seedWithFirst('owl'), hooks: [] })
    let caught = 0
    for (let i = 0; i < 8; i++) if (playRound(sim, 0, 0).caught) caught++
    expect(caught).toBeGreaterThanOrEqual(6)
  })
})

describe('creature habits (pure, noise aside)', () => {
  const round = (o: Partial<Round>): Round => ({ mH: 0, mG: 0, cH: 0, cG: 0, found: false, caught: false, dodge: false, ...o })

  it('the fox stays after a hit and switches after a miss, and hides where you last looked', () => {
    expect(CREATURES.fox.guess([round({ cG: 1, caught: true })], 0).paw).toBe(1)
    expect(CREATURES.fox.guess([round({ cG: 1, caught: false })], 0).paw).toBe(0)
    expect(CREATURES.fox.hide([round({ mG: 1 })], 0)).toBe(1)
  })

  it('the owl bets a repeat only after three in a row, otherwise looks left; it hides away from where you looked', () => {
    expect(CREATURES.owl.guess([round({ mH: 1 }), round({ mH: 1 }), round({ mH: 1 })], 0)).toEqual({ paw: 1, read: true })
    expect(CREATURES.owl.guess([round({ mH: 1 }), round({ mH: 1 })], 0)).toEqual({ paw: 0, read: false })
    expect(CREATURES.owl.guess([round({ mH: 1 }), round({ mH: 0 }), round({ mH: 1 })], 1)).toEqual({ paw: 0, read: false })
    expect(CREATURES.owl.guess([round({ mH: 1 })], 1)).toEqual({ paw: 0, read: false })
    expect(CREATURES.owl.hide([round({ mG: 1 })], 1)).toBe(0)
  })

  it('the hare runs a fixed cycle and alternates its hiding paw', () => {
    const cycle = [0, 1, 2, 3, 4, 5].map((n) => CREATURES.hare.guess(Array.from({ length: n }, () => round({})), 0).paw)
    expect(cycle).toEqual([0, 1, 1, 0, 1, 1])
    expect(CREATURES.hare.hide([round({ cH: 0 })], 0)).toBe(1)
  })

  it('the badger bets you switch, and stays put until found twice at the same paw', () => {
    expect(CREATURES.badger.guess([round({ mH: 0 })], 0)).toEqual({ paw: 1, read: true })
    expect(CREATURES.badger.hide([round({ cH: 1, found: true })], 0)).toBe(1)
    expect(CREATURES.badger.hide([round({ cH: 1, found: true }), round({ cH: 1, found: true })], 0)).toBe(0)
  })

  it('the magpie guesses where you last looked and hides away from where you last hid', () => {
    expect(CREATURES.magpie.guess([round({ mG: 1 })], 0)).toEqual({ paw: 1, read: true })
    expect(CREATURES.magpie.hide([round({ mH: 1 })], 0)).toBe(0)
  })

  it('the crow learns whether you stay or switch after being caught, and bets on it', () => {
    // Caught three times and each time the child switched next: it bets a switch.
    const h = [round({ mH: 0, caught: true }), round({ mH: 1, caught: true }), round({ mH: 0, caught: true })]
    expect(CREATURES.crow.guess(h, 0)).toEqual({ paw: 1, read: true })
    // With too little to go on it has no read.
    expect(CREATURES.crow.guess([round({ mH: 0 })], 1).read).toBe(false)
  })
})

describe('the visit and the hooks', () => {
  it('the match hook ends a visit in a win and brings the next creature', () => {
    let won = 0
    for (let i = 0; i < 12; i++) {
      const sim = start({ seed: seedWithFirst('owl', 1 + i * 11), hooks: ['match'] })
      const first = sim.snapshot().creature.id
      sim.observe()
      // Hide right three times then left (a dodge), repeated; look away from where I looked last (the owl hides away from it).
      let looked: Paw = 0
      let matchEvents = 0
      for (let r = 0; r < 14; r++) {
        const hide: Paw = r % 4 === 3 ? 0 : 1
        looked = looked === 0 ? 1 : 0
        playRound(sim, hide, looked)
        if (sim.observe().events.some((e) => e.kind === 'hook' && e.name === 'match')) matchEvents++
        if (sim.snapshot().creature.id !== first) break
      }
      if (matchEvents > 0 && sim.snapshot().creature.id !== first) won++
    }
    expect(won).toBeGreaterThanOrEqual(8)
  })

  it('a creature that wins stays for a rematch with the score reset', () => {
    const sim = start({ seed: seedWithFirst('owl'), hooks: ['match'] })
    const first = sim.snapshot().creature.id
    sim.observe()
    let matchSeen = false
    for (let r = 0; r < 14 && !matchSeen; r++) {
      playRound(sim, 0, 0)
      matchSeen = sim.observe().events.some((e) => e.kind === 'hook' && e.name === 'match')
    }
    expect(matchSeen).toBe(true)
    expect(sim.snapshot().creature.id).toBe(first)
    expect(sim.snapshot().score).toEqual({ me: 0, it: 0, to: 5 })
  })

  it('without the match hook a visit is ten rounds and there is no score', () => {
    const sim = start({ seed: seedWithFirst('owl'), hooks: [] })
    const first = sim.snapshot().creature.id
    expect(sim.snapshot().score).toBeNull()
    for (let r = 0; r < 9; r++) playRound(sim, 0, 0)
    expect(sim.snapshot().creature.id).toBe(first)
    playRound(sim, 0, 0)
    expect(sim.snapshot().creature.id).not.toBe(first)
  })

  it('two dodges in one visit unlock the crow, only with the crow hook', () => {
    let unlockedSeed = -1
    for (let from = 1; from < 300 && unlockedSeed < 0; from += 3) {
      const seed = seedWithFirst('owl', from)
      const sim = start({ seed, hooks: ['crow'] })
      sim.observe()
      for (let r = 0; r < 9; r++) playRound(sim, r % 4 === 3 ? 0 : 1, 0)
      if (hasEvent(sim.observe().events, 'hook', 'crow')) unlockedSeed = seed
    }
    expect(unlockedSeed).toBeGreaterThan(0)
    const sim = start({ seed: unlockedSeed, hooks: ['crow'] })
    for (let r = 0; r < 9; r++) playRound(sim, r % 4 === 3 ? 0 : 1, 0)
    expect(sim.snapshot().crowUnlocked).toBe(true)
    // The crow is next to visit.
    playRound(sim, 0, 0)
    expect(sim.snapshot().creature.id).toBe('crow')

    const without = start({ seed: unlockedSeed, hooks: [] })
    for (let r = 0; r < 9; r++) playRound(without, r % 4 === 3 ? 0 : 1, 0)
    expect(without.snapshot().crowUnlocked).toBe(false)
    expect(hasEvent(without.observe().events, 'hook', 'crow')).toBe(false)
  })

  it('an empty hooks list means no hook events over a long play', () => {
    const sim = start({ hooks: [] })
    let hooks = 0
    for (let r = 0; r < 60; r++) {
      playRound(sim, (r % 2) as Paw, ((r >> 1) % 2) as Paw)
      hooks += sim.observe().events.filter((e) => e.kind === 'hook').length
    }
    expect(hooks).toBe(0)
  })
})

describe('the rounds', () => {
  it('a round needs both a hide and a guess, in either order, and a re-tap changes the choice', () => {
    const sim = start()
    tapAt(sim, CREATURE_PAWS[1].x, CREATURE_PAWS[1].y)
    expect(sim.snapshot().myGuess).toBe(1)
    expect(sim.snapshot().phase).toBe('choose')
    tapAt(sim, CREATURE_PAWS[0].x, CREATURE_PAWS[0].y)
    expect(sim.snapshot().myGuess).toBe(0)
    tapAt(sim, MY_PAWS[1].x, MY_PAWS[1].y)
    expect(sim.snapshot().phase).toBe('reveal')
    expect(sim.snapshot().history).toHaveLength(1)
    // Taps during the reveal do nothing.
    tapAt(sim, MY_PAWS[0].x, MY_PAWS[0].y)
    expect(sim.snapshot().history).toHaveLength(1)
    run(sim, REVEAL_TICKS + 2)
    expect(sim.snapshot().phase).toBe('choose')
    expect(sim.snapshot().myHide).toBeNull()
  })

  it('reveals the creature paws only during the reveal', () => {
    const sim = start()
    expect(sim.snapshot().reveal).toBeNull()
    tapAt(sim, MY_PAWS[0].x, MY_PAWS[0].y)
    tapAt(sim, CREATURE_PAWS[0].x, CREATURE_PAWS[0].y)
    const reveal = sim.snapshot().reveal!
    expect(reveal.mH).toBe(0)
    expect(reveal.mG).toBe(0)
    run(sim, REVEAL_TICKS + 2)
    expect(sim.snapshot().reveal).toBeNull()
  })

  it('reports the four paws as top-left rectangles that centre on them, in every phase', () => {
    const sim = start()
    const check = () => {
      const list = sim.affordances()
      expect(list).toHaveLength(4)
      for (const paw of [...MY_PAWS, ...CREATURE_PAWS]) {
        const a = list.find((x) => Math.abs(x.x + x.w / 2 - paw.x) < 1e-9 && Math.abs(x.y + x.h / 2 - paw.y) < 1e-9)
        expect(a).toBeDefined()
        expect(a!.w).toBeGreaterThanOrEqual(120)
      }
    }
    check()
    tapAt(sim, MY_PAWS[0].x, MY_PAWS[0].y)
    tapAt(sim, CREATURE_PAWS[0].x, CREATURE_PAWS[0].y)
    check()
  })

  it('forgives a rough touch and ignores stray input', () => {
    const sim = start()
    tapAt(sim, MY_PAWS[0].x + 60, MY_PAWS[0].y - 60)
    expect(sim.snapshot().myHide).toBe(0)
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 3, phase: 'up', x: 300, y: 300 })
    sim.pointer({ id: 3, phase: 'move', x: Number.POSITIVE_INFINITY, y: 0 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let r = 0; r < 80; r++) playRound(sim, (r % 2) as Paw, 0)
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('determinism and variety', () => {
  const script = (sim: Sim<SlySnapshot>) => {
    for (let r = 0; r < 30; r++) playRound(sim, ((r * 7) % 3 === 0 ? 1 : 0) as Paw, (r % 2) as Paw)
  }

  it('the same seed and script give the same signature, features, and snapshot', () => {
    const a = start({ seed: 42 })
    const b = start({ seed: 42 })
    script(a)
    script(b)
    expect(a.observe()).toEqual(b.observe())
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('different seeds bring different visitors in different orders', () => {
    const rosters = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const sim = start({ seed, hooks: [] })
      const order: string[] = [sim.snapshot().creature.id]
      for (let v = 0; v < 2; v++) {
        for (let r = 0; r < 10; r++) playRound(sim, 0, 0)
        order.push(sim.snapshot().creature.id)
      }
      rosters.add(order.join('>'))
    }
    expect(rosters.size).toBeGreaterThanOrEqual(6)
  })

  it('signatures stay inside the declared closed set over a long play', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 6; seed++) {
      const sim = start({ seed })
      for (let r = 0; r < 60; r++) {
        playRound(sim, ((r * 5) % 3 === 0 ? 1 : 0) as Paw, ((r >> 1) % 2) as Paw)
        seen.add(sim.observe().signature)
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(4)
    expect(seen.size).toBeLessThanOrEqual(meta.signatureBound)
    for (const s of seen) expect(s).toMatch(/^(fox|owl|hare|badger|magpie|crow)-(fresh|(won|lost|wash|sly)-[0-2])$/)
  })

  it('the pool holds five habits and the crow is not among them', () => {
    expect([...POOL].sort()).toEqual(['badger', 'fox', 'hare', 'magpie', 'owl'])
  })
})

describe('hints and the meta', () => {
  it('a hint points at the paw still needed after a quiet spell, only with hints on, and never changes the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 60)
    run(off, 60)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    tapAt(on, MY_PAWS[0].x, MY_PAWS[0].y)
    expect(on.snapshot().hint).toBeNull()
    tapAt(off, MY_PAWS[0].x, MY_PAWS[0].y)
    expect(on.observe().signature).toBe(off.observe().signature)
  })

  it('declares an honest signature bound and observes every feature', () => {
    // Four creatures in a session, each fresh or 4 outcomes x 3 grips.
    expect(meta.signatureBound).toBe(4 * (1 + 4 * 3))
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
