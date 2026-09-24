// Proof that the loop's characteristic moment happens: the scare circle used on
// purpose. A cat has to cross, an elephant plods toward it on the one-lane
// bridge, and the elephant scares the cat. Sending the mouse first makes the
// elephant back off (the mouse scares the elephant), and the cat crosses
// behind the mouse.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { PREDATOR, SCARES, createSim } from './sim.ts'
import type { Kind, WhoSnapshot } from './sim.ts'

type Options = { seed?: number; hooks?: readonly string[]; hints?: boolean }
const start = (o: Options = {}) => createSim({ seed: o.seed ?? 1, hooks: o.hooks ?? meta.hooks, hints: o.hints ?? false })
const run = (sim: Sim, ticks: number) => {
  for (let i = 0; i < ticks; i++) sim.step()
}
const snap = (sim: Sim<WhoSnapshot>) => sim.snapshot()
const byId = (sim: Sim<WhoSnapshot>, id: number) => snap(sim).animals.find((a) => a.id === id)!
const vipOf = (sim: Sim<WhoSnapshot>) => snap(sim).animals.find((a) => a.vip)!
const names = (sim: Sim) => sim.observe().events.map((e) => `${e.kind}:${e.name}`)

function tap(sim: Sim<WhoSnapshot>, id: number, pointer = 1): void {
  const a = byId(sim, id)
  sim.pointer({ id: pointer, phase: 'down', x: a.x, y: a.y })
  sim.step()
  sim.pointer({ id: pointer, phase: 'up', x: a.x, y: a.y })
}

// A round-0 seed whose marked animal is the given kind.
function seedFor(kind: Kind): number {
  for (let seed = 1; seed < 500; seed++) if (vipOf(start({ seed })).kind === kind) return seed
  throw new Error(`no seed with a ${kind} in round 0`)
}

// Steps until the events since the last look include `name`, or gives up.
function runUntil(sim: Sim<WhoSnapshot>, name: string, limit = 900): boolean {
  for (let i = 0; i < limit; i++) {
    sim.step()
    if (sim.observe().events.some((e) => e.name === name)) return true
  }
  return false
}

// Plays the current round the way a child who knows the circle would: send the
// animal that scares the blocker, then the marked animal right behind it. When
// no helper waits on the marked bank, just wait the blocker out and send the
// marked animal. Returns whether the round was won (the next one has started).
function solveRound(sim: Sim<WhoSnapshot>, limit = 3000): boolean {
  const round = sim.observe().features.rounds!
  const s = snap(sim)
  const vip = vipOf(sim)
  const blocker = s.animals.find((a) => a.phase === 'walk' && a.still)
  const helper = s.animals.find((a) => a.phase === 'wait' && !a.vip && a.from === vip.from && a.kind === SCARES[vip.kind])
  if (blocker && helper) {
    tap(sim, helper.id)
    run(sim, 10)
  }
  for (let i = 0; i < limit && sim.observe().features.rounds === round; i++) {
    const v = vipOf(sim)
    if (v.phase === 'wait' && i % 25 === 0 && (blocker ? true : !snap(sim).animals.some((a) => a.phase === 'walk'))) tap(sim, v.id)
    else sim.step()
  }
  return sim.observe().features.rounds !== round
}

// The child's clever play for a marked cat: the mouse first, the cat right behind it.
function mouseThenCat(sim: Sim<WhoSnapshot>): void {
  const cat = vipOf(sim)
  const mouse = snap(sim).animals.find((a) => a.kind === 'mouse' && a.from === cat.from && a.phase === 'wait')!
  tap(sim, mouse.id)
  run(sim, 10)
  tap(sim, cat.id)
}

describe('the scare circle', () => {
  it('runs in a circle: everyone scares one animal and is scared by another', () => {
    for (const kind of ['mouse', 'cat', 'elephant'] as const) {
      expect(SCARES[kind]).not.toBe(kind)
      expect(SCARES[PREDATOR[kind]]).toBe(kind)
      expect(SCARES[SCARES[SCARES[kind]]]).toBe(kind)
    }
    expect(SCARES.cat).toBe('mouse')
    expect(SCARES.mouse).toBe('elephant')
    expect(SCARES.elephant).toBe('cat')
  })
})

describe('round 0', () => {
  it('starts with the marked animal waiting and its scarier animal already on the bridge', () => {
    for (const kind of ['mouse', 'cat', 'elephant'] as const) {
      const sim = start({ seed: seedFor(kind) })
      const s = snap(sim)
      const vip = vipOf(sim)
      expect(vip.phase).toBe('wait')
      const onBridge = s.animals.filter((a) => a.phase === 'walk')
      expect(onBridge).toHaveLength(1)
      expect(onBridge[0]!.kind).toBe(PREDATOR[vip.kind])
      // The blocker is walking toward the marked animal's bank.
      expect(onBridge[0]!.from).not.toBe(vip.from)
      // A helper that scares the blocker is waiting with the marked animal.
      const helper = s.animals.find((a) => !a.vip && a.from === vip.from && a.phase === 'wait')
      expect(helper?.kind).toBe(SCARES[vip.kind])
    }
  })

  it('has something to touch at tick 0', () => {
    expect(start().affordances().length).toBeGreaterThan(0)
  })
})

describe('the characteristic moment: the mouse clears the elephant so the cat can cross', () => {
  it('sending the marked cat straight into the elephant makes the cat back off', () => {
    const sim = start({ seed: seedFor('cat') })
    sim.observe()
    tap(sim, vipOf(sim).id)
    expect(runUntil(sim, 'scare-elephant-cat')).toBe(true)
    expect(vipOf(sim).phase).toBe('flee')
    // The marked animal's own bank was set back.
    expect(sim.observe().features.setbacks).toBeGreaterThanOrEqual(1)
  })

  it('sending the mouse first makes the elephant back off, and the cat crosses behind the mouse', () => {
    const sim = start({ seed: seedFor('cat') })
    sim.observe()
    const elephant = snap(sim).animals.find((a) => a.kind === 'elephant' && a.phase === 'walk')!
    mouseThenCat(sim)

    const seen = new Set<string>()
    let catBackedOff = false
    for (let i = 0; i < 900 && vipOf(sim).phase !== 'across'; i++) {
      sim.step()
      if (vipOf(sim).phase === 'flee') catBackedOff = true
      for (const e of sim.observe().events) seen.add(`${e.kind}:${e.name}`)
    }
    expect(seen.has('state:scare-mouse-elephant')).toBe(true)
    expect(seen.has('state:scare-elephant-cat')).toBe(false)
    expect(catBackedOff).toBe(false)
    expect(vipOf(sim).phase).toBe('across')
    // The elephant was sent home, not across.
    expect(byId(sim, elephant.id).phase).not.toBe('across')
    expect(seen.has('state:round-done')).toBe(true)
    expect(seen.has('hook:stars')).toBe(true)
    expect(sim.observe().signature.startsWith('done/')).toBe(true)
  })

  it('a sitting blocker never moves on its own: waiting does not clear it, only its scarier animal does', () => {
    const sim = start({ seed: seedFor('cat') })
    const elephant = snap(sim).animals.find((a) => a.phase === 'walk')!
    expect(elephant.still).toBe(true)
    // Hold a finger on the helper (the only animal that would set off) for a long while.
    const helper = snap(sim).animals.find((a) => a.phase === 'wait' && !a.vip && a.from !== elephant.from)!
    sim.pointer({ id: 2, phase: 'down', x: helper.x, y: helper.y })
    run(sim, 250)
    const after = byId(sim, elephant.id)
    expect(after.phase).toBe('walk')
    expect(after.x).toBe(elephant.x)
    // The marked cat cannot get through either: the elephant scares it.
    tap(sim, vipOf(sim).id, 3)
    sim.observe()
    expect(runUntil(sim, 'scare-elephant-cat')).toBe(true)
    expect(byId(sim, elephant.id).phase).toBe('walk')
    expect(byId(sim, elephant.id).x).toBe(elephant.x)
    // Now the mouse: it scares the elephant, which finally moves, home.
    sim.pointer({ id: 2, phase: 'up', x: helper.x, y: helper.y })
    tap(sim, helper.id, 4)
    expect(runUntil(sim, 'scare-mouse-elephant')).toBe(true)
    expect(byId(sim, elephant.id).phase).toBe('flee')
  })

  it('the play is quicker than the star par for the round', () => {
    const sim = start({ seed: seedFor('cat') })
    mouseThenCat(sim)
    let ticks = 11
    while (vipOf(sim).phase !== 'across' && ticks < 2000) {
      sim.step()
      ticks++
    }
    expect(snap(sim).roundTicks).toBeLessThanOrEqual(snap(sim).par)
    expect(snap(sim).stars).toBeGreaterThanOrEqual(2)
  })
})

describe('the rules of the bridge', () => {
  it('the same kind meeting head on: one of the two gives way', () => {
    // Later rounds queue random animals on both banks, so a twin of the
    // blocker turns up on the marked animal's bank now and then.
    let found = false
    for (let seed = 1; seed < 120 && !found; seed++) {
      const sim = start({ seed })
      for (let r = 0; r < 7 && !found; r++) {
        const s = snap(sim)
        const blocker = s.animals.find((a) => a.phase === 'walk' && a.still)
        const twin = blocker && s.animals.find((a) => a.phase === 'wait' && a.kind === blocker.kind && a.from !== blocker.from)
        if (twin) {
          found = true
          sim.observe()
          tap(sim, twin.id)
          expect(runUntil(sim, 'yield-kin')).toBe(true)
          const phases = [byId(sim, twin.id).phase, byId(sim, blocker!.id).phase]
          expect(phases).toContain('flee')
          expect(phases.filter((p) => p === 'flee')).toHaveLength(1)
        } else if (!solveRound(sim)) break
      }
    }
    expect(found).toBe(true)
  })

  it('holding a finger on the front animal keeps it back, and a bare wait does not', () => {
    const patient = start({ seed: 3 })
    const held = start({ seed: 3 })
    const target = snap(held).animals.find((a) => a.phase === 'wait' && !a.vip && a.head)!
    expect(target).toBeDefined()
    held.pointer({ id: 2, phase: 'down', x: target.x, y: target.y })
    run(held, 250)
    expect(byId(held, target.id).phase).toBe('wait')
    run(patient, 250)
    expect(byId(patient, target.id).phase).not.toBe('wait')
  })

  it('a tap sends an animal at once', () => {
    const sim = start({ seed: 5 })
    const a = snap(sim).animals.find((x) => x.phase === 'wait' && !x.vip)!
    tap(sim, a.id)
    expect(byId(sim, a.id).phase).not.toBe('wait')
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(snap(sim))
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(snap(sim))).toBe(before)
  })

  it('the animals behind a loser back off with it', () => {
    // Send the marked animal into a scarier blocker, then a friend from the same bank behind it.
    let found = false
    for (let seed = 1; seed < 400 && !found; seed++) {
      const sim = start({ seed })
      const vip = vipOf(sim)
      const friend = snap(sim).animals.find((a) => a.phase === 'wait' && !a.vip && a.from === vip.from)
      if (!friend) continue
      tap(sim, vip.id)
      run(sim, 20)
      tap(sim, friend.id)
      sim.observe()
      let convoy = false
      for (let i = 0; i < 600 && !convoy; i++) {
        sim.step()
        convoy = sim.observe().events.some((e) => e.name === 'convoy')
      }
      if (!convoy) continue
      found = true
      expect(byId(sim, friend.id).phase).toBe('flee')
    }
    expect(found).toBe(true)
  })
})

describe('determinism and hooks', () => {
  const script = (sim: Sim<WhoSnapshot>) => {
    const vip = vipOf(sim)
    const helper = snap(sim).animals.find((a) => a.phase === 'wait' && a.from === vip.from && !a.vip)
    if (helper) tap(sim, helper.id)
    run(sim, 10)
    tap(sim, vip.id)
    run(sim, 700)
  }

  it('the same seed and script give the same signature and snapshot', () => {
    const a = start({ seed: 9 })
    const b = start({ seed: 9 })
    script(a)
    script(b)
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(snap(a))).toBe(JSON.stringify(snap(b)))
  })

  it('different seeds lay out different rounds', () => {
    expect(JSON.stringify(snap(start({ seed: 1 })))).not.toBe(JSON.stringify(snap(start({ seed: 2 }))))
  })

  it('an empty hooks list means no hook events and no hook behaviour', () => {
    const sim = start({ seed: seedFor('cat'), hooks: [] })
    mouseThenCat(sim)
    const events: string[] = []
    for (let i = 0; i < 1500; i++) {
      sim.step()
      events.push(...names(sim))
    }
    expect(events).toContain('state:round-done')
    expect(events.some((e) => e.startsWith('hook:'))).toBe(false)
    expect(snap(sim).stars).toBeNull()
  })

  it('each hook can be removed alone', () => {
    const play = (hooks: readonly string[]) => {
      const sim = start({ seed: seedFor('cat'), hooks })
      mouseThenCat(sim)
      const events: string[] = []
      for (let i = 0; i < 1500; i++) {
        sim.step()
        events.push(...names(sim))
      }
      return events.filter((e) => e.startsWith('hook:'))
    }
    expect(play(['stars'])).toEqual(['hook:stars'])
    expect(play(['levels'])).toEqual(['hook:levels'])
    expect(play(['stars', 'levels']).sort()).toEqual(['hook:levels', 'hook:stars'])
  })

  it('levels make later rounds bigger; without it every round stays the same size', () => {
    const biggest = (hooks: readonly string[], rounds: number) => {
      const sim = start({ seed: 4, hooks })
      let most = 0
      for (let r = 0; r < rounds; r++) {
        most = Math.max(most, snap(sim).animals.length)
        if (!solveRound(sim)) break
      }
      return most
    }
    expect(biggest(['levels'], 8)).toBeGreaterThan(biggest([], 8))
  })
})

describe('hints', () => {
  it('point at the marked animal after a quiet spell, only when on, and never change the outcome', () => {
    const on = start({ seed: 2, hints: true })
    const off = start({ seed: 2, hints: false })
    run(on, 10)
    expect(snap(on).hint).toBeNull()
    run(on, 300)
    run(off, 310)
    expect(snap(on).hint).not.toBeNull()
    expect(snap(off).hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(snap(on).hint).toBeNull()
  })
})

describe('the meta', () => {
  it('declares an honest signature bound and observes every feature', () => {
    expect(meta.signatureBound).toBe(55)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
    expect(meta.features.filter((f) => f.objective).map((f) => f.name)).toEqual(['crossed', 'setbacks'])
  })
})
