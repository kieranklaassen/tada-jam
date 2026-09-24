// Proof for Scrapyard Toolbox. The characteristic moment: the child rigs the
// three dealt tools, releases the ball, and the ball travels the rig to the
// sleepy cat, which wakes. The scripted play reads the day's known solution
// from worldFor() and performs it with real pointer events only.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { KINDS, chuteDistance, createSim, runBall, worldFor } from './sim.ts'
import type { Placement, ScrapSnapshot } from './sim.ts'

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? false })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const snap = (sim: Sim<ScrapSnapshot>) => sim.snapshot()

// Drag the tool at `index` to (x, y) with a real down, moves, up.
function dragTool(sim: Sim<ScrapSnapshot>, index: number, x: number, y: number, id = 1): void {
  const t = snap(sim).tools[index]!
  sim.pointer({ id, phase: 'down', x: t.x, y: t.y })
  for (let s = 1; s <= 6; s++) {
    sim.pointer({ id, phase: 'move', x: t.x + ((x - t.x) * s) / 6, y: t.y + ((y - t.y) * s) / 6 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x, y })
}

// Turn a placed tool by dragging its knob round to the wanted angle.
function turnTool(sim: Sim<ScrapSnapshot>, index: number, angle: number, id = 1): void {
  const t = snap(sim).tools[index]!
  const knob = t.knob!
  const reach = Math.hypot(knob.x - t.x, knob.y - t.y)
  sim.pointer({ id, phase: 'down', x: knob.x, y: knob.y })
  sim.pointer({ id, phase: 'move', x: t.x + Math.cos(angle) * reach, y: t.y + Math.sin(angle) * reach })
  sim.step()
  sim.pointer({ id, phase: 'up', x: t.x + Math.cos(angle) * reach, y: t.y + Math.sin(angle) * reach })
}

function rig(sim: Sim<ScrapSnapshot>, placements: readonly Placement[]): void {
  for (const p of placements) {
    const index = snap(sim).tools.findIndex((t) => t.kind === p.kind)
    dragTool(sim, index, p.x, p.y)
    if (Math.abs(snap(sim).tools[index]!.angle - p.angle) > 1e-6) turnTool(sim, index, p.angle)
  }
}

function release(sim: Sim<ScrapSnapshot>, id = 1): void {
  const box = snap(sim).chuteBox
  const x = box.x + box.w / 2
  const y = box.y + box.h / 2
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}

function runUntil(sim: Sim<ScrapSnapshot>, done: (s: ScrapSnapshot) => boolean, max: number): number {
  for (let i = 0; i < max; i++) {
    sim.step()
    if (done(snap(sim))) return i
  }
  return max
}

const isState = (name: string) => (e: { kind: string; name: string }) => e.kind === 'state' && e.name === name

describe('the characteristic moment: a rig carries the ball to the cat', () => {
  it('rigging the day and releasing the ball wakes the cat', () => {
    const world = worldFor(1)
    const sim = start({ seed: 1 })
    sim.observe()
    expect(snap(sim).cat.awake).toBe(false)
    rig(sim, world.reference)
    expect(sim.observe().features.placed).toBe(3)
    release(sim)
    runUntil(sim, (s) => s.phase !== 'rolling', 900)
    const obs = sim.observe()
    expect(snap(sim).phase).toBe('reached')
    expect(snap(sim).cat.awake).toBe(true)
    expect(obs.events.some(isState('cat-wakes'))).toBe(true)
    expect(obs.signature.startsWith('reached-')).toBe(true)
    expect(obs.features.woken).toBe(1)
    expect(obs.features.closeness).toBe(1)
    // Every dealt tool was needed: the route names all three kinds.
    expect(obs.features.touched).toBe(3)
  })

  it('the same seed and the same script give the same signature and snapshot', () => {
    const play = () => {
      const sim = start({ seed: 3 })
      rig(sim, worldFor(3).reference)
      release(sim)
      run(sim, 500)
      return { signature: sim.observe().signature, snapshot: JSON.stringify(sim.snapshot()) }
    }
    expect(play()).toEqual(play())
  })

  it('a bare release misses, the ball comes home, and the cat sleeps on', () => {
    const sim = start({ seed: 1 })
    sim.observe()
    release(sim)
    runUntil(sim, (s) => s.phase === 'missed', 1200)
    expect(sim.observe().signature).toBe('missed-none')
    expect(snap(sim).cat.awake).toBe(false)
    runUntil(sim, (s) => s.phase === 'rigging', 200)
    expect(snap(sim).phase).toBe('rigging')
    expect(sim.observe().signature.startsWith('rig-')).toBe(true)
    expect(sim.observe().features.attempts).toBe(1)
  })

  it('waking the cat opens the next day: a new deal and a new place for the cat', () => {
    const sim = start({ seed: 1 })
    rig(sim, worldFor(1).reference)
    release(sim)
    runUntil(sim, (s) => s.phase === 'reached', 900)
    const before = snap(sim)
    const day = before.dayBox!
    expect(day).not.toBeNull()
    sim.observe()
    sim.pointer({ id: 1, phase: 'down', x: day.x + day.w / 2, y: day.y + day.h / 2 })
    sim.pointer({ id: 1, phase: 'up', x: day.x + day.w / 2, y: day.y + day.h / 2 })
    const after = snap(sim)
    expect(after.day).toBe(before.day + 1)
    expect(after.phase).toBe('rigging')
    expect(after.tools.every((t) => !t.placed)).toBe(true)
    expect(after.cat.awake).toBe(false)
    expect(`${after.cat.x},${after.cat.y}`).not.toBe(`${before.cat.x},${before.cat.y}`)
    expect(sim.observe().events.some(isState('new-day'))).toBe(true)
    expect(sim.observe().features.woken).toBe(1)
  })
})

describe('every day is solvable and asks for all three tools', () => {
  it('the known solution reaches the cat, and the bare yard does not, for many seeds', () => {
    let full = 0
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1)
    for (const seed of seeds) {
      const world = worldFor(seed)
      expect(world.deal).toHaveLength(3)
      expect(new Set(world.deal).size).toBe(3)
      expect(world.reference).toHaveLength(3)
      expect(['full', 'robust'], `seed ${seed} verified`).toContain(world.verified)
      expect(runBall(world.shape, world.reference).reached, `seed ${seed} rig reaches`).toBe(true)
      expect(runBall(world.shape, []).reached, `seed ${seed} bare yard`).toBe(false)
      if (world.verified === 'full') full++
    }
    // A "full" day also has no sampled one-tool answer; the rest are robust
    // days where one might exist (a known weakness).
    expect(full / seeds.length).toBeGreaterThan(0.4)
  }, 60000)

  it('takes away any one tool and the rig fails (in a full day)', () => {
    let checked = 0
    for (let seed = 1; seed <= 30; seed++) {
      const world = worldFor(seed)
      if (world.verified !== 'full') continue
      checked++
      world.reference.forEach((_, drop) => {
        const rest = world.reference.filter((__, i) => i !== drop)
        expect(runBall(world.shape, rest).reached, `seed ${seed} without tool ${drop}`).toBe(false)
      })
    }
    expect(checked).toBeGreaterThan(8)
  }, 60000)

  it('a rig shifted a little still works (the solution is a region, not a pixel)', () => {
    let held = 0
    let total = 0
    for (let seed = 1; seed <= 30; seed++) {
      const world = worldFor(seed)
      if (world.verified === 'core') continue
      total++
      const nudged = world.reference.map((p) => ({ ...p, x: p.x + 8, y: p.y - 6 }))
      if (runBall(world.shape, nudged).reached) held++
    }
    expect(held / total).toBeGreaterThan(0.8)
  })

  it('different seeds deal different tools and put the cat in different places', () => {
    const deals = new Set<string>()
    const spots = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const world = worldFor(seed)
      deals.add(world.deal.join())
      spots.add(`${Math.round(world.shape.cat!.x / 60)},${Math.round(world.shape.cat!.y / 60)}`)
    }
    expect(deals.size).toBeGreaterThanOrEqual(6)
    expect(spots.size).toBeGreaterThanOrEqual(10)
  })

  it('two seeds give at least two distinct signatures after the same script', () => {
    const after = (seed: number) => {
      const sim = start({ seed })
      const first = snap(sim).tools[0]!
      dragTool(sim, 0, 500, 300)
      release(sim)
      run(sim, 700)
      void first
      return sim.observe().signature
    }
    const seen = new Set([1, 2, 3, 4, 5, 6].map(after))
    expect(seen.size).toBeGreaterThanOrEqual(2)
    expect(after(1)).not.toBe('')
  })
})

describe('what each tool does besides its obvious job', () => {
  const base = worldFor(1).shape
  const bare = runBall(base, [], { record: true })
  // Mid-air, just past the chute lip.
  const i = bare.path.findIndex((q) => q.x >= 260)
  const p = bare.path[i]!
  const speed = (q: { vx: number; vy: number }) => Math.hypot(q.vx, q.vy)

  it('a sponge soaks up the ball: forty ticks after landing on it the ball has lost most of its speed', () => {
    const sponge: Placement = { kind: 'sponge', x: p.x + 40, y: p.y + 40, angle: 0 }
    const soaked = runBall(base, [sponge], { record: true })
    expect(soaked.touched).toContain('sponge')
    expect(speed(soaked.path[i + 40]!)).toBeLessThan(speed(bare.path[i + 40]!) / 3)
  })

  it('a spring pad throws the ball back up', () => {
    const pad: Placement = { kind: 'spring', x: p.x, y: p.y + 50, angle: 0 }
    const sprung = runBall(base, [pad], { record: true })
    const top = Math.min(...sprung.path.slice(i, i + 80).map((q) => q.y))
    expect(sprung.touched).toContain('spring')
    expect(top).toBeLessThan(p.y - 60)
  })

  it('a fan blowing up lifts the ball above where it would otherwise fly', () => {
    const fan: Placement = { kind: 'fan', x: p.x, y: p.y + 60, angle: (3 * Math.PI) / 2 }
    const lifted = runBall(base, [fan], { record: true })
    const highest = (path: typeof bare.path) => Math.min(...path.slice(i, i + 120).map((q) => q.y))
    expect(lifted.touched).toContain('fan')
    expect(highest(lifted.path)).toBeLessThan(highest(bare.path) - 80)
  })

  it('a bumper turns the ball off its line', () => {
    const bumper: Placement = { kind: 'bumper', x: p.x + 60, y: p.y + 30, angle: 0 }
    const bumped = runBall(base, [bumper], { record: true })
    const at = i + 50
    expect(bumped.touched).toContain('bumper')
    expect(Math.hypot(bumped.path[at]!.x - bare.path[at]!.x, bumped.path[at]!.y - bare.path[at]!.y)).toBeGreaterThan(80)
  })

  it('a plank guides the ball along its slope', () => {
    const plank: Placement = { kind: 'ramp', x: p.x, y: p.y + 60, angle: Math.PI / 12 }
    const guided = runBall(base, [plank], { record: true })
    expect(guided.touched).toContain('ramp')
    // Sliding down a gentle slope keeps the ball above the floor for longer.
    expect(guided.path[i + 30]!.y).toBeLessThan(bare.path[i + 30]!.y)
  })
})

describe('the pointer', () => {
  it('a tap on a tool in the tray puts it into the yard, and a tap on a placed tool turns it', () => {
    const sim = start()
    sim.observe()
    const before = snap(sim).tools[0]!
    sim.pointer({ id: 1, phase: 'down', x: before.x, y: before.y })
    sim.pointer({ id: 1, phase: 'up', x: before.x, y: before.y })
    const placed = snap(sim).tools[0]!
    expect(placed.placed).toBe(true)
    expect(placed.y).toBeLessThan(600)
    sim.pointer({ id: 1, phase: 'down', x: placed.x, y: placed.y })
    sim.pointer({ id: 1, phase: 'up', x: placed.x, y: placed.y })
    const turned = snap(sim).tools[0]!
    if (placed.kind !== 'bumper') expect(turned.angle).not.toBe(placed.angle)
  })

  it('dragging a placed tool back to the tray puts it away', () => {
    const sim = start()
    dragTool(sim, 0, 600, 300)
    expect(snap(sim).tools[0]!.placed).toBe(true)
    dragTool(sim, 0, 600, 770)
    expect(snap(sim).tools[0]!.placed).toBe(false)
    expect(sim.observe().features.placed).toBe(0)
  })

  it('turning by the knob snaps to fifteen degrees', () => {
    const sim = start()
    dragTool(sim, 0, 600, 300)
    turnTool(sim, 0, 0.5)
    const angle = snap(sim).tools[0]!.angle
    const step = Math.PI / 12
    expect(Math.abs(angle / step - Math.round(angle / step))).toBeLessThan(1e-9)
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
    for (let i = 0; i < 300; i++) {
      const t = snap(sim).tools[0]!
      sim.pointer({ id: 4, phase: 'down', x: t.x, y: t.y })
      sim.pointer({ id: 4, phase: 'up', x: t.x, y: t.y })
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('the go tap always wins', () => {
  const inside = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
    x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
  const angles = (sim: Sim<ScrapSnapshot>) => snap(sim).tools.map((t) => t.angle)

  it('tapping the middle of the chute releases the ball with the day\'s known rig standing (these seeds used to turn a tool instead)', () => {
    for (const seed of [4, 22, 38, 47, 57, 59, 65, 66, 69, 100]) {
      const sim = start({ seed })
      sim.observe()
      rig(sim, worldFor(seed).reference)
      const before = angles(sim)
      release(sim)
      expect(snap(sim).phase, `seed ${seed} released`).toBe('rolling')
      expect(angles(sim), `seed ${seed} tools untouched`).toEqual(before)
      runUntil(sim, (s) => s.phase !== 'rolling', 900)
      expect(snap(sim).phase, `seed ${seed} woke the cat`).toBe('reached')
    }
  }, 60000)

  it('a plank lying against the chute does not steal the release tap', () => {
    const sim = start()
    const box = snap(sim).chuteBox
    const index = snap(sim).tools.findIndex((t) => t.kind === 'ramp' || t.kind === 'spring' || t.kind === 'sponge')
    // Its centre is just outside the box, its near end reaches into the box.
    dragTool(sim, index, box.x + box.w + 5, box.y + box.h / 2)
    const tool = snap(sim).tools[index]!
    expect(tool.placed).toBe(true)
    expect(inside(box, tool.x, tool.y)).toBe(false)
    const before = angles(sim)
    release(sim)
    expect(snap(sim).phase).toBe('rolling')
    expect(angles(sim)).toEqual(before)
  })

  it('a tool dropped in the middle of the chute is moved just clear, so it can always be picked up again', () => {
    for (let index = 0; index < 3; index++) {
      const sim = start()
      const box = snap(sim).chuteBox
      dragTool(sim, index, box.x + box.w / 2, box.y + box.h / 2)
      const tool = snap(sim).tools[index]!
      expect(tool.placed).toBe(true)
      expect(inside(box, tool.x, tool.y)).toBe(false)
      // Grab it by its middle and it comes along.
      sim.pointer({ id: 2, phase: 'down', x: tool.x, y: tool.y })
      sim.pointer({ id: 2, phase: 'move', x: 600, y: 400 })
      sim.pointer({ id: 2, phase: 'up', x: 600, y: 400 })
      expect(Math.hypot(snap(sim).tools[index]!.x - 600, snap(sim).tools[index]!.y - 400)).toBeLessThan(1)
    }
  })

  it('when two knobs sit close together, the one nearest the finger turns', () => {
    const seed = Array.from({ length: 60 }, (_, i) => i + 1).find((n) => worldFor(n).deal.includes('ramp') && worldFor(n).deal.includes('fan'))!
    const sim = start({ seed })
    const tools = snap(sim).tools
    const ramp = tools.findIndex((t) => t.kind === 'ramp')
    const fan = tools.findIndex((t) => t.kind === 'fan')
    dragTool(sim, ramp, 500, 400)
    dragTool(sim, fan, 560, 420)
    const k = snap(sim).tools
    // The two knobs are within one grab of each other.
    expect(Math.hypot(k[ramp]!.knob!.x - k[fan]!.knob!.x, k[ramp]!.knob!.y - k[fan]!.knob!.y)).toBeLessThan(36)
    turnTool(sim, fan, Math.PI / 2)
    expect(snap(sim).tools[fan]!.angle).toBeCloseTo(Math.PI / 2, 6)
    expect(snap(sim).tools[ramp]!.angle).toBe(0)
  })

  it('the day generator keeps the known answer clear of the go tap (its body never touches the box)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const world = worldFor(seed)
      for (const p of world.reference) {
        expect(chuteDistance(p, world.shape.chute.y0), `seed ${seed} ${p.kind}`).toBeGreaterThanOrEqual(12)
      }
    }
  }, 60000)
})

describe('affordances', () => {
  it('start non-empty, name the tray tools and the chute, as top-left rectangles', () => {
    const sim = start()
    const list = sim.affordances()
    expect(list.length).toBeGreaterThanOrEqual(4)
    for (const t of snap(sim).tools) {
      const match = list.find((a) => Math.abs(a.x + a.w / 2 - t.x) < 1e-9 && Math.abs(a.y + a.h / 2 - t.y) < 1e-9)
      expect(match, `an affordance centred on the ${t.kind}`).toBeDefined()
      expect(match!.w).toBeGreaterThanOrEqual(60)
      expect(match!.h).toBeGreaterThanOrEqual(60)
    }
    const box = snap(sim).chuteBox
    expect(list.some((a) => a.x === box.x && a.y === box.y && a.kind === 'tap')).toBe(true)
  })
})

describe('hooks and hints', () => {
  it('an empty hooks list yields no hook events, and none are ever declared', () => {
    expect(meta.hooks).toEqual([])
    const sim = start({ hooks: [] })
    rig(sim, worldFor(1).reference)
    release(sim)
    run(sim, 900)
    expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('a hint shows a ghost of one tool after a quiet spell, only when hints are on, and never changes the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 100)
    run(off, 400)
    expect(snap(on).hint).toBeNull()
    run(on, 400)
    expect(snap(on).hint).not.toBeNull()
    expect(KINDS).toContain(snap(on).hint!.kind)
    expect(snap(off).hint).toBeNull()
    const t = snap(on).tools[0]!
    on.pointer({ id: 1, phase: 'down', x: t.x, y: t.y })
    expect(snap(on).hint).toBeNull()
    on.pointer({ id: 1, phase: 'up', x: t.x, y: t.y })
    const a = start({ hints: true })
    const b = start({ hints: false })
    run(a, 500)
    run(b, 500)
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(a.observe().features).toEqual(b.observe().features)
  })
})

describe('the meta', () => {
  it('names one objective feature and observes every feature', () => {
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
