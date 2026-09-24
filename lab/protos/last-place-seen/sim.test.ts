// Proof for Last Place Seen. The characteristic moment: the child shifts the
// treasure while a guard is not looking, and that guard keeps standing at the
// OLD log, sure the treasure is still there, until its own habit makes it
// check. Everything below reaches that moment by scripted play, then shows the
// habits (goose glance, peek, and clockwise search; hound pause and sniff) and
// that a patient play hauls while an impatient one is caught.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { LOGS, N_LOGS, createSim } from './sim.ts'
import type { LastPlaceSnapshot } from './sim.ts'

type S = Sim<LastPlaceSnapshot>

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const centre = (log: number) => ({ x: LOGS[log]!.x + LOGS[log]!.w / 2, y: LOGS[log]!.y + LOGS[log]!.h / 2 })

function tapLog(sim: Sim, log: number, id = 1): void {
  const { x, y } = centre(log)
  sim.pointer({ id, phase: 'down', x, y })
  sim.pointer({ id, phase: 'up', x, y })
}

const goose = (s: LastPlaceSnapshot) => s.guards[0]!
const hound = (s: LastPlaceSnapshot) => s.guards[1]!

// Steps until the predicate holds on the snapshot; fails loudly if it never does.
function runUntil(sim: S, done: (s: LastPlaceSnapshot) => boolean, limit = 4000): LastPlaceSnapshot {
  for (let i = 0; i < limit; i++) {
    const s = sim.snapshot()
    if (done(s)) return s
    sim.step()
  }
  throw new Error(`the condition never held within ${limit} ticks`)
}

// True when no guard is looking at either log right now.
const unwatched = (s: LastPlaceSnapshot, ...logs: number[]) => s.guards.every((g) => !logs.includes(g.gaze))
const settled = (s: LastPlaceSnapshot) => s.guards.every((g) => g.mode === 'post')

// Lift the treasure and put it down at `dest` (tap, then tap).
function shift(sim: Sim, from: number, dest: number): void {
  tapLog(sim, from)
  tapLog(sim, dest)
}

// A patient player who knows the guards' habits: shift only when neither
// guard looks at the source or the destination, pocket only when nobody looks
// at the flag. Prefers the flag; otherwise hops to a log no guard believes in.
function patientPlayer(sim: S, ticks: number): void {
  for (let i = 0; i < ticks; i++) {
    const s = sim.snapshot()
    if (s.treasure === s.home) {
      if (unwatched(s, s.home)) tapLog(sim, s.home)
    } else if (unwatched(s, s.treasure, s.home)) {
      shift(sim, s.treasure, s.home)
    } else {
      const hop = [...Array(N_LOGS).keys()].find(
        (y) => y !== s.treasure && y !== s.home && unwatched(s, s.treasure, y) && s.guards.every((g) => g.belief !== y),
      )
      if (hop !== undefined && s.guards.some((g) => g.gaze === s.home)) shift(sim, s.treasure, hop)
    }
    sim.step()
  }
}

describe('the setup', () => {
  it('hides the treasure away from the flag, and both guards head for it', () => {
    const sim = start()
    const s = sim.snapshot()
    expect(s.treasure).not.toBe(s.home)
    expect(s.guards).toHaveLength(2)
    expect(s.guards.every((g) => g.belief === s.treasure && g.mode === 'walk')).toBe(true)
    expect(sim.observe().signature).toMatch(/^away\/goose-true\/hound-true$/)
    const there = runUntil(sim, settled)
    expect(there.guards.every((g) => g.belief === s.treasure && g.target === -1)).toBe(true)
    // Standing at the post of the treasure's log: closer to it than to any other log.
    const c = centre(s.treasure)
    for (const g of there.guards) expect(Math.hypot(g.x - c.x, g.y - c.y)).toBeLessThan(200)
  })

  it('lays the world out differently for different seeds, the same for the same seed', () => {
    const json = (seed: number) => JSON.stringify(start({ seed }).snapshot())
    expect(json(3)).toBe(json(3))
    const layouts = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
      const s = start({ seed }).snapshot()
      return `${s.home}/${s.treasure}`
    }))
    expect(layouts.size).toBeGreaterThan(3)
  })

  it('reports affordances as top-left rectangles centred on the logs', () => {
    const sim = start()
    const affordances = sim.affordances()
    expect(affordances).toHaveLength(N_LOGS)
    LOGS.forEach((_, i) => {
      const a = affordances[i]!
      expect(a.x + a.w / 2).toBeCloseTo(centre(i).x)
      expect(a.y + a.h / 2).toBeCloseTo(centre(i).y)
      expect(a.w).toBeGreaterThanOrEqual(60)
      expect(a.h).toBeGreaterThanOrEqual(60)
    })
  })
})

describe('the characteristic moment: a guard keeps watching the old log', () => {
  function unseenShift(seed = 4) {
    const sim = start({ seed })
    const settledAt = runUntil(sim, settled)
    const from = settledAt.treasure
    const dest = (from + 3) % N_LOGS // the opposite log: never the one the goose glances at (from + 1)
    // Wait until neither guard looks at either log, then move it.
    runUntil(sim, (s) => unwatched(s, from, dest))
    sim.observe()
    shift(sim, from, dest)
    return { sim, from, dest }
  }

  it('the goose still believes the old log and the signature says it is fooled', () => {
    const { sim, from, dest } = unseenShift()
    const s = sim.snapshot()
    expect(s.treasure).toBe(dest)
    expect(goose(s).belief).toBe(from)
    const obs = sim.observe()
    expect(obs.signature).toContain('goose-false')
    expect(obs.features.fooled).toBeGreaterThanOrEqual(1)
    expect(obs.features.spotted).toBe(0)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'shift-unseen' })
    // Ninety more ticks: it is still at the old post, still staring at it or glancing along the row.
    run(sim, 20)
    const later = sim.snapshot()
    expect(goose(later).belief).toBe(from)
    expect(goose(later).mode).toBe('post')
    expect([from, (from + 1) % N_LOGS]).toContain(goose(later).gaze)
  })

  it('a shift a guard watches sends that guard straight to the new log', () => {
    const sim = start({ seed: 4 })
    const s0 = runUntil(sim, settled)
    const dest = (s0.treasure + 2) % N_LOGS
    // Wait for the goose to be staring at the treasure log itself.
    runUntil(sim, (s) => goose(s).gaze === s0.treasure)
    sim.observe()
    shift(sim, s0.treasure, dest)
    const obs = sim.observe()
    expect(obs.features.spotted).toBe(1)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'spotted-goose' })
    const s = sim.snapshot()
    expect(goose(s).belief).toBe(dest)
    expect(goose(s).mode).toBe('walk')
    expect(goose(s).target).toBe(dest)
  })

  it('the hound only learns of an unseen move at the end of its pause, then goes to the truth', () => {
    const { sim, from, dest } = unseenShift()
    const s = sim.snapshot()
    expect(hound(s).belief).toBe(from)
    runUntil(sim, (x) => hound(x).belief === dest, 300)
    const after = sim.snapshot()
    expect(hound(after).mode).toBe('walk')
    expect(hound(after).target).toBe(dest)
    expect(hound(after).gaze).toBe(-1) // nose to the ground while it walks
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'hound-sniffed' })
  })

  it('the goose peeks by habit, finds the log empty, and searches the ring clockwise', () => {
    const { sim, from, dest } = unseenShift()
    const lost = runUntil(sim, (s) => goose(s).belief === -1, 800)
    expect(sim.observe().signature).toContain('goose-search')
    expect(goose(lost).target).toBe((from + 1) % N_LOGS)
    expect(goose(lost).mode).toBe('walk')
    // It checks each log in turn and only believes again once it has seen the treasure.
    const found = runUntil(sim, (s) => goose(s).belief !== -1, 3000)
    expect(goose(found).belief).toBe(dest)
    expect(sim.observe().signature).toContain('goose-true')
  })
})

describe('patience against impatience', () => {
  it('an impatient pocket attempt under the goose\'s eye is caught, and the treasure is re-hidden', () => {
    const sim = start({ seed: 2 })
    const s0 = sim.snapshot()
    sim.observe()
    // Straight to the flag and take it, with both guards walking toward the treasure.
    run(sim, 3)
    shift(sim, s0.treasure, s0.home)
    const mid = sim.observe()
    expect(mid.features.spotted).toBe(1)
    tapLog(sim, s0.home)
    const obs = sim.observe()
    expect(obs.features.caught).toBe(1)
    expect(obs.features.hauls).toBe(0)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'caught' })
    const s = sim.snapshot()
    expect(s.treasure).not.toBe(s.home)
    expect(s.guards.every((g) => g.belief === s.treasure)).toBe(true)
  })

  it('a patient play hauls: unseen shift, then a pocket when nobody looks at the flag', () => {
    const sim = start({ seed: 4 })
    sim.observe()
    patientPlayer(sim, 4000)
    const obs = sim.observe()
    expect(obs.features.hauls).toBeGreaterThanOrEqual(1)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'shift-unseen' })
    expect(sim.snapshot().hauls).toBe(obs.features.hauls)
  })

  it('patience pays across worlds, and beats rushing on caught and spotted', () => {
    let patientHauls = 0
    let patientCaught = 0
    for (let seed = 1; seed <= 6; seed++) {
      const sim = start({ seed })
      patientPlayer(sim, 3600)
      const f = sim.observe().features
      patientHauls += f.hauls!
      patientCaught += f.caught!
    }
    expect(patientHauls).toBeGreaterThanOrEqual(6)
    expect(patientCaught).toBe(0)
  })

  it('a haul moves the flag and hides a new treasure that both guards saw hidden', () => {
    const sim = start({ seed: 4 })
    const flagBefore = sim.snapshot().home
    let s = sim.snapshot()
    while (s.hauls === 0 && s.tick < 5000) {
      patientPlayer(sim, 1)
      s = sim.snapshot()
    }
    expect(s.hauls).toBe(1)
    expect(s.home).not.toBe(flagBefore)
    expect(s.treasure).not.toBe(s.home)
    expect(s.guards.every((g) => g.belief === s.treasure)).toBe(true)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'haul' })
  })
})

describe('input', () => {
  it('a drag from the treasure log onto another log shifts it too', () => {
    const sim = start({ seed: 4 })
    const s0 = runUntil(sim, settled)
    const dest = (s0.treasure + 3) % N_LOGS
    runUntil(sim, (s) => unwatched(s, s0.treasure, dest))
    const a = centre(s0.treasure)
    const b = centre(dest)
    sim.pointer({ id: 5, phase: 'down', x: a.x, y: a.y })
    for (let k = 1; k <= 6; k++) sim.pointer({ id: 5, phase: 'move', x: a.x + ((b.x - a.x) * k) / 6, y: a.y + ((b.y - a.y) * k) / 6 })
    expect(sim.snapshot().drag).not.toBeNull()
    sim.pointer({ id: 5, phase: 'up', x: b.x, y: b.y })
    expect(sim.snapshot().treasure).toBe(dest)
    expect(sim.snapshot().drag).toBeNull()
  })

  it('tapping the lifted treasure again puts it back, and a tap in the grass does nothing', () => {
    const sim = start()
    const t = sim.snapshot().treasure
    tapLog(sim, t)
    expect(sim.snapshot().selected).toBe(true)
    sim.pointer({ id: 1, phase: 'down', x: 5, y: 5 })
    sim.pointer({ id: 1, phase: 'up', x: 5, y: 5 })
    expect(sim.snapshot().selected).toBe(true)
    tapLog(sim, t)
    expect(sim.snapshot().selected).toBe(false)
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    const t = sim.snapshot().treasure
    for (let i = 0; i < 400; i++) tapLog(sim, t)
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('determinism, hooks, hints, meta', () => {
  it('the same seed and the same script give the same signatures and features', () => {
    const play = () => {
      const sim = start({ seed: 9 })
      const sigs: string[] = []
      for (let i = 0; i < 900; i++) {
        const s = sim.snapshot()
        if (i % 47 === 0) tapLog(sim, i % 94 === 0 ? s.treasure : (s.treasure + 2) % N_LOGS)
        sim.step()
        sigs.push(sim.observe().signature)
      }
      return { sigs, features: sim.observe().features }
    }
    expect(play()).toEqual(play())
  })

  it('an empty hooks list yields no hook events (the loop declares none)', () => {
    expect(meta.hooks).toEqual([])
    const sim = start({ hooks: [] })
    patientPlayer(sim, 1500)
    expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('hints point at the treasure log after a quiet spell, only when on, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 100)
    run(off, 400)
    run(on, 300)
    expect(on.snapshot().hint).toEqual({ log: on.snapshot().treasure })
    expect(off.snapshot().hint).toBeNull()
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
    expect(JSON.stringify(on.observe().features)).toBe(JSON.stringify(off.observe().features))
  })

  it('declares an honest signature bound and observes every declared feature', () => {
    expect(meta.signatureBound).toBe(3 * 3 * 2 * 2)
    expect(meta.features.filter((f) => f.objective)).toHaveLength(3)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
