// Scripted play for Chant Rope. The characteristic moment is one held leap that
// hangs over BOTH quick swings and lands back on the slow beat ("pair-quick").
// Every helper reads the snapshot to time the child's fingers, so the script
// follows the chant instead of counting magic ticks.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { GROUND_Y, JUMPER_X, MAX_HANG, MAX_HOLD, createSim } from './sim.ts'
import type { ChantRopeSnapshot } from './sim.ts'

type S = Sim<ChantRopeSnapshot>

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

const run = (sim: S, ticks: number) => {
  for (let i = 0; i < ticks; i++) sim.step()
}
const at = { x: JUMPER_X, y: GROUND_Y - 80 }
const down = (sim: S, id = 1) => sim.pointer({ id, phase: 'down', ...at })
const up = (sim: S, id = 1) => sim.pointer({ id, phase: 'up', ...at })

function until(sim: S, done: (s: ChantRopeSnapshot) => boolean, max = 600): void {
  for (let i = 0; i < max && !done(sim.snapshot()); i++) sim.step()
  expect(done(sim.snapshot()), 'the chant reached the moment the script waits for').toBe(true)
}

// Press, hold for `ticks` steps, let go.
function hold(sim: S, ticks: number, id = 1): void {
  down(sim, id)
  run(sim, ticks)
  up(sim, id)
}

// The expert plays the chant the way a practised child would: a small hop for
// each slow swing, then one held leap over both quick swings. It decides only
// from the snapshot, one tick at a time.
function makeExpert(sim: S) {
  let heldFor: number | null = null
  let plan: 'start' | 'quick' | 'slow' = 'slow'
  return () => {
    const s = sim.snapshot()
    const j = s.jumper
    const ahead = s.beatLen - s.beatTick
    if (heldFor !== null) {
      heldFor++
      // The first hold hangs over the first slow swing; a quick pair is let go
      // a hair before its first swing; a slow swing gets a tap of two ticks.
      const release = plan === 'start' ? heldFor >= 8 : plan === 'quick' ? ahead <= 2 : heldFor >= 2
      if (release) {
        up(sim)
        heldFor = null
      }
    } else if (j.state === 'stand') {
      const quick = s.beat === 2
      // Crouch late enough that the charge is about five ticks when it is let go.
      if (!s.turning || (quick ? ahead <= 7 : ahead <= 14)) {
        plan = !s.turning ? 'start' : quick ? 'quick' : 'slow'
        down(sim)
        heldFor = 0
      }
    }
    sim.step()
  }
}

function expertPlay(sim: S, ticks: number): void {
  const tick = makeExpert(sim)
  for (let i = 0; i < ticks; i++) tick()
}

const names = (sim: S) => sim.observe().events.map((e) => e.name)

describe('the chant', () => {
  it('waits, still, until the child holds the jumper', () => {
    const sim = start()
    run(sim, 200)
    const snap = sim.snapshot()
    expect(snap.turning).toBe(false)
    expect(sim.observe().signature).toBe('still/none')
    expect(sim.observe().events).toHaveLength(0)
    expect(sim.affordances().length).toBeGreaterThan(0)
  })

  it('starts from the first slow beat when the jumper is held', () => {
    const sim = start()
    down(sim)
    const snap = sim.snapshot()
    expect(snap.turning).toBe(true)
    expect(snap.beat).toBe(0)
    expect(snap.jumper.state).toBe('coil')
    expect(names(sim)).toContain('chant-start')
    expect(sim.observe().signature).toBe('coil/none')
  })

  it('keeps the chant slow, slow, quick, quick', () => {
    const sim = start()
    const lens: number[] = []
    let beat = 0
    const play = makeExpert(sim)
    for (let i = 0; i < 400; i++) {
      play()
      const s = sim.snapshot()
      if (s.turning && (lens.length === 0 || s.beat !== beat)) {
        beat = s.beat
        lens.push(s.beatLen)
      }
      if (lens.length >= 4) break
    }
    expect(lens.slice(0, 4)).toEqual([30, 30, 15, 15])
  })
})

describe('the leap', () => {
  it('a longer hold hangs longer, up to a cap', () => {
    const hangAfter = (ticks: number) => {
      const sim = start()
      hold(sim, ticks)
      return sim.snapshot().jumper.hang
    }
    const tap = hangAfter(1)
    const held = hangAfter(10)
    expect(held).toBeGreaterThan(tap)
    expect(hangAfter(20)).toBeGreaterThan(held)
    // Holding on past the cap adds nothing more.
    expect(hangAfter(20)).toBe(MAX_HANG)
    expect(hangAfter(28)).toBe(MAX_HANG)
    const sim = start()
    down(sim)
    run(sim, 20)
    expect(sim.snapshot().jumper.charge).toBeGreaterThan(0.5)
  })

  it('a plain hop, a tap with hardly any hold, clears a slow swing', () => {
    const sim = start()
    // The first tap only starts the chant: it hops long before the swing and lands.
    hold(sim, 1)
    until(sim, (s) => s.jumper.state === 'stand')
    expect(sim.observe().signature).toBe('stand/whiff')
    // The second tap, a moment before the swing, is a plain hop that clears it.
    until(sim, (s) => s.beatLen - s.beatTick <= 9)
    hold(sim, 1)
    until(sim, (s) => s.jumper.state === 'stand')
    const obs = sim.observe()
    expect(obs.events.map((e) => e.name)).toContain('clear')
    expect(obs.events.map((e) => e.name)).toContain('hop')
    expect(obs.signature).toBe('stand/hop-slow')
    expect(obs.features.streak).toBe(1)
  })

  it('a hop early or late trips on the swing, and the turners start over', () => {
    const sim = start()
    down(sim)
    run(sim, 2)
    up(sim) // a hop far too early: it lands well before the swing
    until(sim, (s) => s.jumper.state === 'tangled', 100)
    expect(sim.observe().signature).toBe('tangled/trip')
    expect(sim.snapshot().turning).toBe(false)
    expect(sim.observe().features.streak).toBe(0)
    // The tangle passes, the rope waits, and the next hold begins the chant again from the top.
    until(sim, (s) => s.jumper.state === 'stand')
    expect(sim.observe().signature).toBe('still/trip')
    down(sim)
    expect(sim.snapshot().beat).toBe(0)
    expect(sim.snapshot().beatTick).toBe(0)
  })

  it('holding on through a swing gets the crouching jumper tangled', () => {
    const sim = start()
    down(sim)
    run(sim, 40)
    expect(sim.snapshot().jumper.state).toBe('tangled')
    expect(names(sim)).toContain('trip')
    // The finger coming up afterwards launches nothing.
    up(sim)
    expect(sim.snapshot().jumper.state).toBe('tangled')
  })

  it('a press in the air is kept: it charges while the jumper is up and leaps once it has landed', () => {
    const sim = start()
    hold(sim, 1) // a hop that starts the chant and lands at tick 12
    run(sim, 3)
    sim.observe()
    down(sim)
    run(sim, 3)
    up(sim)
    // Still in the air: nothing leaps yet.
    expect(names(sim)).not.toContain('leap')
    expect(sim.snapshot().jumper.state).toBe('air')
    until(sim, (s) => s.jumper.state === 'air' && s.jumper.airTick === 0 && s.jumper.hang !== 11)
    // The landing squash passed, and the tap made a second, small leap with no second finger.
    expect(sim.snapshot().jumper.hang).toBe(8 + 3 * 3)
  })

  it('a finger kept down through the landing has been charging all along', () => {
    const sim = start()
    hold(sim, 1)
    run(sim, 3)
    down(sim)
    run(sim, 16) // in the air, through the landing, and into the crouch
    expect(sim.snapshot().jumper.state).toBe('coil')
    expect(sim.snapshot().jumper.charge).toBeCloseTo(16 / MAX_HOLD)
    up(sim)
    expect(sim.snapshot().jumper.hang).toBe(8 + 3 * 16)
  })
})

describe('the characteristic moment', () => {
  it('one held leap over both quick swings lands back on the slow beat', () => {
    const sim = start()
    // The first hold starts the chant and hangs over the first slow swing.
    down(sim)
    until(sim, (s) => s.beat === 0 && s.beatTick >= 8)
    up(sim)
    until(sim, (s) => s.jumper.state === 'stand')
    // The second slow swing gets a small hop, early in its window.
    until(sim, (s) => s.beat === 1 && s.beatLen - s.beatTick <= 14)
    hold(sim, 2)
    sim.observe()
    // The quick pair: crouch once it has landed, hold about five ticks, and let go a hair before the first quick swing.
    until(sim, (s) => s.jumper.state === 'stand')
    expect(sim.snapshot().beat).toBe(2)
    until(sim, (s) => s.beat === 2 && s.beatLen - s.beatTick <= 7)
    down(sim)
    until(sim, (s) => s.beat === 2 && s.beatLen - s.beatTick <= 2)
    const ahead = sim.snapshot().beatLen - sim.snapshot().beatTick
    const hangBefore = sim.snapshot().jumper.predictedHang
    up(sim)
    // The hang reaches past the SECOND quick swing (one quick beat after the first).
    expect(hangBefore).toBeGreaterThanOrEqual(ahead + sim.snapshot().beatLen)
    run(sim, 1)
    expect(sim.snapshot().jumper.state).toBe('air')
    until(sim, (s) => s.jumper.state === 'stand')
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'pair-quick' })
    expect(obs.signature).toBe('stand/pair-quick')
    expect(obs.features.streak).toBe(4)
    // It landed after the last quick swing, before the next slow one: back on the slow beat.
    expect(sim.snapshot().beat).toBe(0)
    expect(obs.features.reach).toBeGreaterThan(1)
    expect(sim.snapshot().turning).toBe(true)
  })

  it('a plain hop for the first quick swing cannot reach the second', () => {
    const sim = start()
    const play = makeExpert(sim)
    // Play the expert through the slow swings, then tap once for the quick pair.
    for (let i = 0; i < 200 && !(sim.snapshot().beat === 2 && sim.snapshot().jumper.state === 'stand'); i++) play()
    expect(sim.snapshot().beat).toBe(2)
    // Hop by hand a little before the first quick swing.
    sim.observe()
    until(sim, (s) => s.beat === 2 && s.beatLen - s.beatTick <= 9)
    hold(sim, 1)
    until(sim, (s) => s.jumper.state === 'tangled' || s.beat === 0, 200)
    const events = names(sim)
    expect(events).not.toContain('pair-quick')
    expect(events).toContain('trip')
  })

  it('the expert keeps the chant, cycle after cycle, in two big leaps and a small one', () => {
    const sim = start()
    expertPlay(sim, 3 * 90 + 40)
    const obs = sim.observe()
    expect(obs.features.streak).toBeGreaterThanOrEqual(8)
    expect(sim.snapshot().jumper.state).not.toBe('tangled')
  })
})

describe('the hooks list', () => {
  const hooksFired = (hooks: readonly string[]) => {
    const sim = start({ hooks })
    const play = makeExpert(sim)
    const fired = new Set<string>()
    let topLevel = 0
    for (let i = 0; i < 4 * 90; i++) {
      play()
      topLevel = Math.max(topLevel, sim.snapshot().level)
      for (const e of sim.observe().events) if (e.kind === 'hook') fired.add(e.name)
    }
    return { fired, sim, topLevel }
  }

  it('an empty list means no hook events and no hook behaviour', () => {
    const { fired, sim, topLevel } = hooksFired([])
    expect(fired.size).toBe(0)
    expect(sim.snapshot().streak).toBeNull()
    expect(topLevel).toBe(0)
    expect(sim.observe().features.streak).toBeGreaterThanOrEqual(8)
  })

  it('streak alone counts the run and nothing else', () => {
    const { fired, sim, topLevel } = hooksFired(['streak'])
    expect([...fired]).toEqual(['streak'])
    expect(sim.snapshot().streak).not.toBeNull()
    expect(topLevel).toBe(0)
  })

  it('tempo alone speeds the chant up after a clean run', () => {
    const { fired, sim, topLevel } = hooksFired(['tempo'])
    expect([...fired]).toEqual(['tempo'])
    expect(sim.snapshot().streak).toBeNull()
    expect(topLevel).toBeGreaterThan(0)
  })

  it('both hooks together are both declared', () => {
    const { fired } = hooksFired(meta.hooks)
    expect([...fired].sort()).toEqual([...meta.hooks].sort())
  })

  it('a trip puts the tempo back', () => {
    const sim = start({ hooks: ['tempo'] })
    const play = makeExpert(sim)
    for (let i = 0; i < 4 * 90 && sim.snapshot().level === 0; i++) play()
    expect(sim.snapshot().level).toBeGreaterThan(0)
    // At the faster tempo the slow beat is shorter.
    until(sim, (s) => s.beat === 0)
    expect(sim.snapshot().beatLen).toBeLessThan(30)
    // Stop playing: the next swing trips, and the chant starts over at the slow tempo.
    until(sim, (s) => s.jumper.state === 'tangled', 400)
    until(sim, (s) => s.jumper.state === 'stand')
    expect(sim.snapshot().level).toBe(0)
  })
})

describe('determinism', () => {
  it('the same seed and the same script give the same signature and snapshot', () => {
    const a = start({ seed: 5 })
    const b = start({ seed: 5 })
    expertPlay(a, 500)
    expertPlay(b, 500)
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('a different seed changes the turners, not the chant', () => {
    const a = start({ seed: 5 })
    const b = start({ seed: 6 })
    expect(JSON.stringify(a.snapshot())).not.toBe(JSON.stringify(b.snapshot()))
    expertPlay(a, 500)
    expertPlay(b, 500)
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(a.observe().features).toEqual(b.observe().features)
  })

  it('hints only show data; they never change what happens', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    expertPlay(on, 400)
    expertPlay(off, 400)
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
    expect(on.snapshot().hint).toBeNull()
  })
})

describe('touching', () => {
  it('reports the jumper and both turners as top-left rectangles inside the field', () => {
    const sim = start()
    const list = sim.affordances()
    const jumper = list.find((a) => a.kind === 'hold')!
    expect(jumper.w).toBeGreaterThanOrEqual(60)
    expect(Math.abs(jumper.x + jumper.w / 2 - JUMPER_X)).toBeLessThan(1e-9)
    expect(list.filter((a) => a.kind === 'tap')).toHaveLength(2)
    for (const a of list) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
  })

  it('a tap on a turner waves and echoes the chant without starting the rope', () => {
    const sim = start()
    const turner = sim.affordances().find((a) => a.kind === 'tap')!
    sim.pointer({ id: 3, phase: 'down', x: turner.x + turner.w / 2, y: turner.y + turner.h / 2 })
    sim.pointer({ id: 3, phase: 'up', x: turner.x + turner.w / 2, y: turner.y + turner.h / 2 })
    expect(names(sim)).toContain('wave')
    expect(sim.snapshot().turning).toBe(false)
    expect(sim.snapshot().demoBeat).toBe(0)
    run(sim, 40)
    expect(sim.snapshot().demoBeat).toBe(1)
    run(sim, 200)
    expect(sim.snapshot().demoBeat).toBe(-1)
  })

  it('the hold zone is generous: a finger anywhere off the turners crouches the jumper', () => {
    for (const [x, y] of [
      [JUMPER_X + 200, GROUND_Y + 60],
      [30, 30],
      [FIELD_W - 20, FIELD_H - 20],
    ] as const) {
      const sim = start()
      sim.pointer({ id: 1, phase: 'down', x, y })
      expect(sim.snapshot().jumper.state).toBe('coil')
    }
  })

  it('ignores non-finite coordinates, an up with no down, and touches off the field', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    sim.pointer({ id: 2, phase: 'down', x: -40, y: 20 })
    sim.pointer({ id: 2, phase: 'down', x: 1e9, y: -1e9 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 300; i++) {
      hold(sim, 2)
      run(sim, 3)
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    // 5 jumper modes x 9 kinds of last outcome.
    expect(meta.signatureBound).toBe(5 * 9)
  })

  it('names its objectives and observes every feature', () => {
    expect(meta.features.filter((f) => f.objective).map((f) => f.name)).toEqual(['streak', 'reach'])
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })

  it('declares both hooks, each removable alone', () => {
    expect(meta.hooks).toEqual(['streak', 'tempo'])
    expect(meta.hookAblation.supported).toBe(true)
  })
})
