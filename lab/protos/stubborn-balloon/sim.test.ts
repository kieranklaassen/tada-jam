// Proof for Stubborn Balloon. The characteristic moment is the bear reaching up
// and batting the balloon back after the child CURLED it across the field with
// off-centre pats. A sim where pats only ever go straight up (so the bear is
// never reached) cannot pass the first describe block.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim, SimEvent } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { createSim } from './sim.ts'
import type { BalloonSnapshot } from './sim.ts'

type S = Sim<BalloonSnapshot>

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: S, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const balloon = (sim: S) => sim.snapshot().balloon
const bear = (sim: S) => sim.snapshot().bear
const dirToBear = (sim: S) => (bear(sim).x > balloon(sim).x ? 1 : -1)

// Pat the balloon at an offset from its centre in balloon radii: u is
// sideways (-1 left, +1 right), v is vertical (+1 the underside).
function pat(sim: S, u: number, v = 0.6, id = 1): void {
  const b = balloon(sim)
  sim.pointer({ id, phase: 'down', x: b.x + u * b.r, y: b.y + v * b.r })
  sim.step()
  sim.pointer({ id, phase: 'up', x: b.x + u * b.r, y: b.y + v * b.r })
}

const has = (events: SimEvent[], name: string) => events.some((e) => e.kind === 'state' && e.name === name)

// The child of the scripted play: when the balloon has sunk into the lower
// half, pat it on the side that faces the bear (or dead centre when
// `straight`). Returns every event seen.
function play(sim: S, ticks: number, opts: { straight?: boolean; stopOnBat?: boolean } = {}): SimEvent[] {
  const seen: SimEvent[] = []
  let since = 99
  for (let t = 0; t < ticks; t++) {
    since++
    const b = balloon(sim)
    if (since > 20 && b.y > 430) {
      pat(sim, opts.straight ? 0 : dirToBear(sim) * 0.8)
      since = 0
    } else sim.step()
    const events = sim.observe().events
    seen.push(...events)
    if (opts.stopOnBat && has(events, 'bat')) break
  }
  return seen
}

describe('the characteristic moment: the bear bats the balloon back', () => {
  it('curling pats carry the balloon across to the bear, and the bear reaches up and bats it back', () => {
    const sim = start({ seed: 1 })
    sim.observe()
    const seen = play(sim, 2500, { stopOnBat: true })
    expect(has(seen, 'pat-curl-left') || has(seen, 'pat-curl-right')).toBe(true)
    expect(has(seen, 'bat')).toBe(true)
    // Right after the bat the balloon heads back the way it came, away from the bear.
    const bearAtBat = bear(sim).x
    const before = balloon(sim).x
    const away = before >= bearAtBat ? 1 : -1
    run(sim, 30)
    expect((balloon(sim).x - before) * away).toBeGreaterThan(20)
    expect(sim.observe().signature).toMatch(/batted/)
    expect(sim.snapshot().bats).toBe(1)
  })

  it('patting only under the middle never gets it across in the same time (the curl is the skill)', () => {
    let curled = 0
    let straight = 0
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const a = start({ seed })
      const b = start({ seed })
      play(a, 900)
      play(b, 900, { straight: true })
      curled += a.snapshot().bats
      straight += b.snapshot().bats
    }
    expect(curled).toBeGreaterThanOrEqual(6)
    expect(straight).toBeLessThanOrEqual(1)
  })

  it('the bear starts across the field from the balloon, on either side by seed', () => {
    const sides = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const sim = start({ seed })
      sides.add(bear(sim).side)
      expect(Math.abs(bear(sim).x - balloon(sim).x)).toBeGreaterThan(400)
    }
    expect(sides.size).toBe(2)
  })
})

describe('the pat', () => {
  it('a slow balloon sinks, and does not reach the floor in a few seconds', () => {
    const sim = start()
    const y0 = balloon(sim).y
    run(sim, 90)
    expect(balloon(sim).y).toBeGreaterThan(y0 + 40)
    expect(balloon(sim).y).toBeLessThan(y0 + 220)
  })

  it('a pat under the middle sends it straight up, and hints that it did', () => {
    const sim = start()
    run(sim, 120)
    sim.observe()
    const before = balloon(sim)
    pat(sim, 0.02)
    run(sim, 40)
    const after = balloon(sim)
    expect(before.y - after.y).toBeGreaterThan(150)
    expect(Math.abs(after.x - before.x)).toBeLessThan(45)
    expect(has(sim.observe().events, 'pat-straight')).toBe(true)
  })

  it('a pat off to the right curls it right, off to the left curls it left, and harder for further out', () => {
    const travel = (u: number) => {
      const sim = start({ seed: 3 })
      run(sim, 80)
      const x0 = balloon(sim).x
      pat(sim, u)
      run(sim, 100)
      return balloon(sim).x - x0
    }
    expect(travel(0.8)).toBeGreaterThan(120)
    expect(travel(-0.8)).toBeLessThan(-120)
    expect(Math.abs(travel(0.8))).toBeGreaterThan(Math.abs(travel(0.4)) + 30)
    expect(Math.abs(travel(0.05))).toBeLessThan(45)
  })

  it('the spin shows: the signature says which way it curls while it flies', () => {
    const sim = start({ seed: 3 })
    run(sim, 80)
    pat(sim, 0.8)
    run(sim, 5)
    expect(sim.observe().signature).toMatch(/curl-right/)
    const other = start({ seed: 3 })
    run(other, 80)
    pat(other, -0.8)
    run(other, 5)
    expect(other.observe().signature).toMatch(/curl-left/)
  })

  it('pats on the same side build the spin, and a pat on the other side takes it away', () => {
    const across = (us: number[]) => {
      const sim = start({ seed: 3 })
      run(sim, 60)
      for (const u of us) {
        pat(sim, u)
        run(sim, 12)
      }
      return Math.abs(balloon(sim).spin)
    }
    expect(across([0.8, 0.8])).toBeGreaterThan(across([0.8]) + 0.1)
    expect(across([0.8, -0.8])).toBeLessThan(across([0.8]))
    expect(across([0.8, 0])).toBeLessThan(across([0.8]) * 0.6)
  })

  it('any pat lifts it, even a rough one on the very top edge', () => {
    const sim = start()
    run(sim, 120)
    const before = balloon(sim)
    pat(sim, 0.9, -0.9)
    run(sim, 15)
    expect(balloon(sim).y).toBeLessThan(before.y - 40)
  })

  it('a resting balloon on the floor can be patted up again', () => {
    const sim = start()
    run(sim, 1500)
    expect(balloon(sim).onFloor).toBe(true)
    expect(sim.observe().features.landings).toBe(1)
    pat(sim, 0.3)
    run(sim, 20)
    expect(balloon(sim).onFloor).toBe(false)
    expect(balloon(sim).y).toBeLessThan(FIELD_H - balloon(sim).r - 60)
  })
})

describe('the cradle', () => {
  it('a finger held beneath a sinking balloon catches it, and it rests there', () => {
    const sim = start()
    const b = balloon(sim)
    sim.observe()
    sim.pointer({ id: 5, phase: 'down', x: b.x, y: b.y + b.r + 130 })
    run(sim, 200)
    const held = balloon(sim)
    expect(held.cradled).toBe(true)
    expect(has(sim.observe().events, 'cradle')).toBe(true)
    run(sim, 150)
    expect(Math.abs(balloon(sim).y - held.y)).toBeLessThan(2)
    expect(sim.observe().signature).toMatch(/^cradle/)
    // Lifting the finger lets it sink again.
    sim.pointer({ id: 5, phase: 'up', x: b.x, y: b.y })
    run(sim, 60)
    expect(balloon(sim).cradled).toBe(false)
    expect(balloon(sim).y).toBeGreaterThan(held.y + 30)
  })

  it('sliding the finger away drops the balloon off the side it slipped', () => {
    const sim = start()
    const b = balloon(sim)
    sim.pointer({ id: 5, phase: 'down', x: b.x, y: b.y + b.r + 100 })
    run(sim, 200)
    expect(balloon(sim).cradled).toBe(true)
    const rest = balloon(sim)
    for (let i = 1; i <= 30; i++) {
      sim.pointer({ id: 5, phase: 'move', x: b.x + i * 12, y: b.y + b.r + 100 })
      sim.step()
    }
    expect(balloon(sim).cradled).toBe(false)
    expect(balloon(sim).x).toBeLessThan(rest.x + 400)
  })
})

describe('the bear', () => {
  it('waves when tapped and never disturbs the balloon', () => {
    const sim = start()
    const before = JSON.stringify(balloon(sim))
    const z = bear(sim).body
    sim.pointer({ id: 1, phase: 'down', x: z.x + z.w / 2, y: z.y + z.h / 2 })
    sim.pointer({ id: 1, phase: 'up', x: z.x + z.w / 2, y: z.y + z.h / 2 })
    expect(has(sim.observe().events, 'bear-wave')).toBe(true)
    expect(bear(sim).pose).toBe('wave')
    expect(JSON.stringify(balloon(sim))).toBe(before)
  })

  it('after a bat it ambles to a new spot across the field, so the next crossing is a new aim', () => {
    const sim = start({ seed: 1 })
    play(sim, 2500, { stopOnBat: true })
    const first = bear(sim).x
    expect(sim.observe().signature).toMatch(/batted/)
    let walked = false
    let farthest = 0
    for (let i = 0; i < 400; i++) {
      sim.step()
      if (bear(sim).pose === 'walk') walked = true
      farthest = Math.max(farthest, Math.abs(bear(sim).x - first))
    }
    expect(walked).toBe(true)
    expect(farthest).toBeGreaterThan(250)
    // Left alone it settles at the new spot and waits again.
    run(sim, 400)
    expect(sim.observe().signature).not.toMatch(/batted/)
  })

  it('bats hardest when the balloon crosses at the paw\'s sweet height, and softer high or low', () => {
    let bats = 0
    let sweet = 0
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const events = play(start({ seed }), 2500)
      bats += events.filter((e) => e.kind === 'state' && e.name === 'bat').length
      sweet += events.filter((e) => e.kind === 'state' && e.name === 'bat-sweet').length
    }
    expect(bats).toBeGreaterThan(10)
    expect(sweet).toBeGreaterThan(0)
    expect(sweet).toBeLessThan(bats)
  })
})

describe('determinism, hooks, hints, and robustness', () => {
  it('the same seed and the same script give the same signature and snapshot', () => {
    const a = start({ seed: 9 })
    const b = start({ seed: 9 })
    const sa: string[] = []
    const sb: string[] = []
    play(a, 800)
    play(b, 800)
    sa.push(a.observe().signature)
    sb.push(b.observe().signature)
    expect(sa).toEqual(sb)
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('an empty hooks list yields no hook events (and there are no hooks to build)', () => {
    expect(meta.hooks).toEqual([])
    const sim = start({ hooks: [] })
    const seen = play(sim, 1500)
    expect(seen.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('shows a ring after a quiet spell, then a side-pat ghost if the child only pats straight; never with hints off', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 220)
    expect(on.snapshot().hint?.kind).toBe('ring')
    expect(off.snapshot().hint).toBeNull()
    // Three straight pats and no curl yet: the ghost points at the bear's side.
    const straight = start({ hints: true })
    for (let i = 0; i < 3; i++) {
      pat(straight, 0)
      run(straight, 30)
    }
    run(straight, 200)
    expect(straight.snapshot().hint?.kind).toBe('side')
  })

  it('hints go away on touch and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 250)
    run(off, 250)
    expect(on.snapshot().hint).not.toBeNull()
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
  })

  it('reports affordances as top-left rectangles that centre on the balloon and sit inside the field', () => {
    const sim = start()
    const b = balloon(sim)
    const list = sim.affordances()
    expect(list.length).toBeGreaterThan(0)
    const body = list.find((a) => Math.abs(a.x + a.w / 2 - b.x) < 1e-9 && Math.abs(a.y + a.h / 2 - b.y) < 1e-9)
    expect(body).toBeDefined()
    expect(body!.w).toBeCloseTo(b.r * 2)
    for (const a of list) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
    // Big targets for the youngest.
    expect(body!.w).toBeGreaterThanOrEqual(120)
  })

  it('the hold affordance is a true finger-beneath touch: it cradles rather than pats', () => {
    for (const seed of [1, 2, 3]) {
      const sim = start({ seed })
      const hold = sim.affordances().find((a) => a.kind === 'hold')!
      expect(hold).toBeDefined()
      sim.observe()
      for (const [fx, fy] of [[0.5, 0.05], [0.05, 0.05], [0.95, 0.5], [0.5, 0.95]] as const) {
        const probe = start({ seed })
        probe.pointer({ id: 3, phase: 'down', x: hold.x + hold.w * fx, y: hold.y + hold.h * fy })
        const events = probe.observe().events
        expect(has(events, 'finger-under')).toBe(true)
        expect(has(events, 'pat-straight') || has(events, 'pat-curl-left') || has(events, 'pat-curl-right')).toBe(false)
      }
    }
  })

  it('ignores non-finite coordinates and an up with no down, and keeps a bounded event queue', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
    for (let i = 0; i < 300; i++) pat(sim, 0.5, 0.5, 4)
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
  })

  it('never leaves the field, however long it runs', () => {
    const sim = start({ seed: 5 })
    for (let i = 0; i < 4000; i++) {
      if (i % 37 === 0) pat(sim, ((i / 37) % 3) - 1)
      else sim.step()
      const b = balloon(sim)
      expect(b.x).toBeGreaterThanOrEqual(b.r - 1e-9)
      expect(b.x).toBeLessThanOrEqual(FIELD_W - b.r + 1e-9)
      expect(b.y).toBeGreaterThanOrEqual(b.r - 1e-9)
      expect(b.y).toBeLessThanOrEqual(FIELD_H - b.r + 1e-9)
    }
  })

  it('declares an honest signature bound and one objective per direction', () => {
    expect(meta.signatureBound).toBe(24)
    const seen = new Set<string>()
    // The scripted child, plus a scattershot one, plus an idle one.
    for (const seed of [1, 2, 3, 4]) {
      const child = start({ seed })
      let since = 99
      for (let t = 0; t < 2500; t++) {
        since++
        if (since > 20 && balloon(child).y > 430) {
          pat(child, dirToBear(child) * 0.8)
          since = 0
        } else child.step()
        seen.add(child.observe().signature)
      }
      const scatter = start({ seed })
      for (let t = 0; t < 2500; t++) {
        if (t % 31 === 0) pat(scatter, ((t / 31) % 5) / 2 - 1, 0.5)
        else scatter.step()
        seen.add(scatter.observe().signature)
      }
      const idle = start({ seed })
      for (let t = 0; t < 1500; t++) {
        idle.step()
        seen.add(idle.observe().signature)
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(6)
    expect(seen.size).toBeLessThanOrEqual(meta.signatureBound)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
