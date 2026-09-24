// Proof that the loop's characteristic moment happens when it is played: the
// owl SEES a chick that was left where its sight rules say it can be seen, and
// MISSES one that was tucked where they say it cannot. The shared suite
// (lab/kit/contract.test.ts) covers determinism, fuzz, and hygiene.

import { describe, expect, it } from 'vitest'
import type { Sim, SimEvent } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { CHICK_R, MEADOW_TOP, NEST, OWL_KINDS, SHADOW_LEN, camoAt, createSim, reedShades } from './sim.ts'
import type { Layout, OwlSnapshot, Point } from './sim.ts'

type OwlSim = Sim<OwlSnapshot>

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): OwlSim {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

interface Seen {
  tick: number
  phase: string
  event: SimEvent
}

// Steps the sim, recording every event with the owl phase it happened in, until
// `until` says stop (or `max` ticks pass).
function play(sim: OwlSim, max: number, until: (log: Seen[]) => boolean = () => false): Seen[] {
  const log: Seen[] = []
  for (let tick = 0; tick < max; tick++) {
    sim.step()
    const phase = sim.snapshot().owl.phase
    for (const event of sim.observe().events) log.push({ tick, phase, event })
    if (until(log)) break
  }
  return log
}

const named = (log: Seen[], name: string) => log.filter((s) => s.event.name === name)
const layoutOf = (sim: OwlSim): Layout => sim.snapshot().layout

// Carries chick `index` to (x, y) and lets go: down, six moves, up.
function drag(sim: OwlSim, index: number, to: Point, id = 1): void {
  const from = sim.snapshot().chicks[index]!
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 6; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((to.x - from.x) * s) / 6, y: from.y + ((to.y - from.y) * s) / 6 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x: to.x, y: to.y })
}

const centre = (r: { x: number; y: number; w: number; h: number }): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

// A meadow point no rule protects: off every patch, out of every reed clump and
// its shadow.
function openSpot(layout: Layout): Point {
  for (let y = 240; y <= 640; y += 20) {
    for (let x = 120; x <= 1060; x += 20) {
      const clearOfPatches = layout.patches.every((p) => Math.hypot(x - p.x, y - p.y) > p.r + CHICK_R)
      const clearOfReeds = layout.reeds.every((r) => x < r.x - 40 || x > r.x + r.w + 40 || y < r.y - 40 || y > r.y + r.h + 40)
      if (clearOfPatches && clearOfReeds && reedShades(layout, x, y).length === 0) return { x, y }
    }
  }
  throw new Error('no open spot in this layout')
}

const patchFor = (layout: Layout, colour: number): Point => layout.patches.find((p) => p.colour === colour)!

// Along the line from the perch through a clump's centre: just past the clump
// (behind it, offset > 0) or short of it (in front, offset < 0).
function alongSight(layout: Layout, reedIndex: number, offset: number): Point {
  const reed = layout.reeds[reedIndex]!
  const c = centre(reed)
  const dx = c.x - layout.perch.x
  const dy = c.y - layout.perch.y
  const len = Math.hypot(dx, dy)
  const reach = Math.hypot(reed.w, reed.h) / 2 + offset
  return { x: c.x + (dx / len) * reach, y: c.y + (dy / len) * reach }
}

const inMeadow = (p: Point) => p.x > CHICK_R && p.x < 1180 - CHICK_R && p.y > MEADOW_TOP + 20 && p.y < NEST.y - CHICK_R

describe('the characteristic moment: the owl sees a chick left in the open', () => {
  it('a still chick in the open is passed by a glance and swooped on by a stare', () => {
    const sim = start()
    drag(sim, 0, openSpot(layoutOf(sim)))
    const log = play(sim, 1600, (l) => named(l, 'caught').length > 0)
    const caught = named(log, 'caught')
    expect(caught).toHaveLength(1)
    expect(caught[0]!.phase).toBe('stare')
    // The glance sweeps before it looked and let the still chick be.
    const glanceMisses = named(log, 'missed').filter((s) => s.phase === 'glance')
    expect(glanceMisses.length).toBeGreaterThan(0)
    // The catch reads at a glance in the signature, and the chick is sent home.
    expect(sim.observe().signature.endsWith('/caught')).toBe(true)
    play(sim, 60)
    expect(sim.snapshot().chicks[0]!.inField).toBe(false)
    expect(sim.observe().features.tucked).toBe(0)
  })

  it('a chick that is moving is seen even by a glance', () => {
    const sim = start()
    const spot = openSpot(layoutOf(sim))
    drag(sim, 0, spot)
    // Keep wriggling it: the finger goes down on it again and jiggles.
    const now = sim.snapshot().chicks[0]!
    sim.pointer({ id: 2, phase: 'down', x: now.x, y: now.y })
    const log: Seen[] = []
    for (let i = 0; i < 400 && named(log, 'caught').length === 0; i++) {
      sim.pointer({ id: 2, phase: 'move', x: spot.x + (i % 2 ? 6 : -6), y: spot.y })
      log.push(...play(sim, 1))
    }
    const caught = named(log, 'caught')
    expect(caught).toHaveLength(1)
    expect(caught[0]!.phase).toBe('glance')
  })

  it('a chick that has settled is passed by the first glance', () => {
    const sim = start()
    drag(sim, 0, openSpot(layoutOf(sim)))
    const log = play(sim, 260, (l) => named(l, 'missed').length > 0)
    expect(named(log, 'missed')).toHaveLength(1)
    expect(named(log, 'caught')).toHaveLength(0)
  })
})

// The three owls, by index: barn is fooled by colour and inside-the-reeds,
// tawny by inside and behind, snowy by colour and behind.
const BARN = 0
const TAWNY = 1
const SNOWY = 2

// A fresh sim whose first owl is `kind` (and whose meadow passes `ok`).
function startWith(kind: number, ok: (layout: Layout) => boolean = () => true, extra: { hooks?: readonly string[] } = {}): OwlSim {
  for (let seed = 1; seed <= 300; seed++) {
    const sim = start({ seed, ...extra })
    const layout = layoutOf(sim)
    if (layout.kind === kind && ok(layout)) return sim
  }
  throw new Error(`no meadow with owl kind ${kind} in 300 seeds`)
}

const sawStare = (l: Seen[]) => named(l, 'missed').some((s) => s.phase === 'stare')
const bareOf = (l: Layout, wrong: boolean) =>
  l.patches.find((p) => (wrong ? p.colour !== 1 : p.colour === 1) && reedShades(l, p.x, p.y).length === 0)

describe('the hiding rules', () => {
  it('each owl is fooled by exactly two of the three hiding ways', () => {
    expect(OWL_KINDS.map((k) => [k.colour, k.inside, k.behind].filter(Boolean).length)).toEqual([2, 2, 2])
    // ... and the three owls differ in which one they are not fooled by.
    expect(new Set(OWL_KINDS.map((k) => [k.colour, k.inside, k.behind].join())).size).toBe(3)
  })

  it('a chick on a patch of its own colour is missed by a stare that colour fools', () => {
    for (const kind of [BARN, SNOWY]) {
      const sim = startWith(kind)
      const layout = layoutOf(sim)
      const patch = patchFor(layout, 1)
      drag(sim, 1, patch)
      expect(camoAt(layout, 1, patch.x, patch.y)).toBe(true)
      const log = play(sim, 2400, sawStare)
      expect(sawStare(log)).toBe(true)
      expect(named(log, 'caught')).toHaveLength(0)
      expect(sim.observe().signature.split('/')[1]).toBe('camo')
    }
  })

  it('the tawny owl is not fooled by colour: the same chick on its own patch is seen', () => {
    // A patch that no reed can shade, so only colour is in play.
    const sim = startWith(TAWNY, (l) => bareOf(l, false) !== undefined)
    drag(sim, 1, bareOf(layoutOf(sim), false)!)
    const log = play(sim, 2400, (l) => named(l, 'caught').length > 0)
    expect(named(log, 'caught')).toHaveLength(1)
  })

  it('the same chick on a patch of the wrong colour is seen even by an owl colour fools', () => {
    const sim = startWith(BARN, (l) => bareOf(l, true) !== undefined)
    drag(sim, 1, bareOf(layoutOf(sim), true)!)
    const log = play(sim, 2400, (l) => named(l, 'caught').length > 0)
    expect(named(log, 'caught')).toHaveLength(1)
  })

  it('a chick tucked inside the reeds is missed by the barn and tawny owls', () => {
    for (const kind of [BARN, TAWNY]) {
      const sim = startWith(kind)
      drag(sim, 2, centre(layoutOf(sim).reeds[0]!))
      const log = play(sim, 2400, sawStare)
      expect(sawStare(log)).toBe(true)
      expect(named(log, 'caught')).toHaveLength(0)
      expect(sim.observe().signature.split('/')[1]).toBe('shade')
    }
  })

  it('the snowy owl looks into the reeds: a chick sitting inside is seen', () => {
    const sim = startWith(SNOWY)
    drag(sim, 2, centre(layoutOf(sim).reeds[0]!))
    const log = play(sim, 2400, (l) => named(l, 'caught').length > 0)
    expect(named(log, 'caught')).toHaveLength(1)
  })

  describe('behind a clump, as the owl sees it', () => {
    const fits = (layout: Layout, k: number) => {
      const behind = alongSight(layout, k, 60)
      const front = alongSight(layout, k, -140)
      return (
        inMeadow(behind) &&
        inMeadow(front) &&
        reedShades(layout, behind.x, behind.y).join() === String(k) &&
        reedShades(layout, front.x, front.y).length === 0 &&
        !layout.patches.some((p) => Math.hypot(front.x - p.x, front.y - p.y) <= p.r + CHICK_R) &&
        !layout.patches.some((p) => Math.hypot(behind.x - p.x, behind.y - p.y) <= p.r + CHICK_R)
      )
    }
    const anyFit = (l: Layout) => l.reeds.some((_, k) => fits(l, k))
    const fitIndex = (l: Layout) => l.reeds.findIndex((_, k) => fits(l, k))

    it('is hidden from the tawny and snowy owls, and in front of the clump is not', () => {
      for (const kind of [TAWNY, SNOWY]) {
        const layout = layoutOf(startWith(kind, anyFit))
        const same = (l: Layout) => JSON.stringify(l) === JSON.stringify(layout)
        const k = fitIndex(layout)
        const hidden = startWith(kind, same)
        drag(hidden, 0, alongSight(layout, k, 60))
        const hiddenLog = play(hidden, 2400, sawStare)
        expect(sawStare(hiddenLog)).toBe(true)
        expect(named(hiddenLog, 'caught')).toHaveLength(0)
        const open = startWith(kind, same)
        drag(open, 0, alongSight(layout, k, -140))
        const openLog = play(open, 2400, (l) => named(l, 'caught').length > 0)
        expect(named(openLog, 'caught')).toHaveLength(1)
      }
    })

    it('does not fool the barn owl, which flies round the clump', () => {
      const sim = startWith(BARN, anyFit)
      const layout = layoutOf(sim)
      drag(sim, 0, alongSight(layout, fitIndex(layout), 60))
      const log = play(sim, 2400, (l) => named(l, 'caught').length > 0)
      expect(named(log, 'caught')).toHaveLength(1)
    })
  })

  it('a shadow does not reach forever', () => {
    const layout = layoutOf(start())
    const far = alongSight(layout, 0, SHADOW_LEN + 120)
    expect(reedShades(layout, far.x, far.y)).not.toContain(0)
    const near = alongSight(layout, 0, SHADOW_LEN - 60)
    expect(reedShades(layout, near.x, near.y)).toContain(0)
  })

  it('a clump hides one chick: the crowded second one is seen', () => {
    const sim = startWith(BARN)
    const c = centre(layoutOf(sim).reeds[1]!)
    drag(sim, 0, c)
    drag(sim, 2, { x: c.x + 30, y: c.y })
    const log = play(sim, 2400, (l) => named(l, 'caught').length > 0)
    expect(named(log, 'caught')).toHaveLength(1)
    // The chick nearer the middle keeps its place; the other one goes home.
    play(sim, 60)
    const chicks = sim.snapshot().chicks
    expect(chicks[0]!.inField).toBe(true)
    expect(chicks[2]!.inField).toBe(false)
  })

  it('the owl shows its eyes wide before a stare and narrow before a glance', () => {
    const sim = start()
    const cues = new Set<string>()
    for (let i = 0; i < 1500; i++) {
      sim.step()
      const owl = sim.snapshot().owl
      if (owl.phase === 'rest') cues.add(owl.upcoming)
    }
    expect([...cues].sort()).toEqual(['glance', 'stare'])
  })
})

describe('the hook: dawn', () => {
  // The plan that works on each owl: barn takes colour plus inside, tawny takes
  // three clumps, snowy takes three patches.
  function hideAll(sim: OwlSim): void {
    const layout = layoutOf(sim)
    const clump = (i: number) => centre(layout.reeds[i]!)
    if (layout.kind === BARN) {
      drag(sim, 0, patchFor(layout, 0))
      drag(sim, 1, clump(0))
      drag(sim, 2, clump(1))
    } else if (layout.kind === TAWNY) {
      drag(sim, 0, clump(0))
      drag(sim, 1, clump(1))
      drag(sim, 2, clump(2))
    } else {
      drag(sim, 0, patchFor(layout, 0))
      drag(sim, 1, patchFor(layout, 1))
      drag(sim, 2, patchFor(layout, 2))
    }
  }

  it('all three unseen through a stare brings the dawn on every owl: the meadow is dealt again with another owl', () => {
    for (const kind of [BARN, TAWNY, SNOWY]) {
      const sim = startWith(kind)
      const before = layoutOf(sim)
      hideAll(sim)
      const log = play(sim, 3000, (l) => named(l, 'dawn').length > 0)
      expect(named(log, 'caught')).toHaveLength(0)
      expect(log.find((s) => s.event.name === 'dawn')!.event.kind).toBe('hook')
      expect(sim.observe().signature.startsWith('dawn/')).toBe(true)
      // The dawn lasts 100 ticks, then the owl is back to resting with a new meadow.
      play(sim, 101)
      const after = sim.snapshot()
      expect(after.chicks.every((c) => !c.inField)).toBe(true)
      expect(after.layout.perchIndex).not.toBe(before.perchIndex)
      expect(after.layout.kind).not.toBe(before.kind)
      expect(sim.observe().features.dawns).toBe(1)
      expect(after.owl.phase).toBe('rest')
    }
  })

  it('a plan for the wrong owl does not bring the dawn', () => {
    // Three patches suit the snowy owl; the tawny owl sees straight through them.
    const sim = startWith(TAWNY)
    const layout = layoutOf(sim)
    drag(sim, 0, patchFor(layout, 0))
    drag(sim, 1, patchFor(layout, 1))
    drag(sim, 2, patchFor(layout, 2))
    const log = play(sim, 3000)
    expect(named(log, 'dawn')).toHaveLength(0)
    expect(named(log, 'caught').length).toBeGreaterThan(0)
  })

  it('with the hook removed the same play ends nothing: no event, no new meadow', () => {
    const sim = startWith(BARN, () => true, { hooks: [] })
    const before = JSON.stringify(layoutOf(sim))
    hideAll(sim)
    const log = play(sim, 3000)
    expect(log.some((s) => s.event.kind === 'hook')).toBe(false)
    expect(JSON.stringify(layoutOf(sim))).toBe(before)
    expect(sim.snapshot().chicks.every((c) => c.inField)).toBe(true)
    expect(sim.snapshot().dawns).toBeNull()
    expect(sim.observe().features.dawns).toBe(0)
  })

  it('an empty list yields no hook events even after a catch', () => {
    const sim = start({ hooks: [] })
    drag(sim, 0, openSpot(layoutOf(sim)))
    const log = play(sim, 1600, (l) => named(l, 'caught').length > 0)
    expect(named(log, 'caught')).toHaveLength(1)
    expect(log.some((s) => s.event.kind === 'hook')).toBe(false)
  })
})

describe('determinism, layouts, and the surface', () => {
  const script = (sim: OwlSim) => {
    drag(sim, 0, openSpot(layoutOf(sim)))
    play(sim, 900)
  }

  it('the same seed and script give the same signature', () => {
    const a = start({ seed: 5 })
    const b = start({ seed: 5 })
    script(a)
    script(b)
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('different seeds deal different meadows, always three clumps and every colour of patch', () => {
    const layouts = [1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(layoutOf(start({ seed }))))
    expect(new Set(layouts).size).toBeGreaterThan(4)
    for (let seed = 1; seed <= 30; seed++) {
      const layout = layoutOf(start({ seed }))
      expect(layout.reeds).toHaveLength(3)
      expect(layout.patches).toHaveLength(5)
      for (const colour of [0, 1, 2]) expect(layout.patches.some((p) => p.colour === colour)).toBe(true)
    }
  })

  it('reports affordances as top-left rectangles that centre on the chicks', () => {
    const sim = start()
    const list = sim.affordances()
    expect(list.length).toBeGreaterThan(0)
    for (const chick of sim.snapshot().chicks) {
      const match = list.find((a) => a.kind === 'drag' && Math.abs(a.x + a.w / 2 - chick.x) < 1e-9 && Math.abs(a.y + a.h / 2 - chick.y) < 1e-9)
      expect(match, `an affordance centred on the chick at ${chick.x},${chick.y}`).toBeDefined()
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

  it('a chick dropped back in the nest goes home and is not on the meadow', () => {
    const sim = start()
    drag(sim, 0, openSpot(layoutOf(sim)))
    expect(sim.snapshot().chicks[0]!.inField).toBe(true)
    drag(sim, 0, { x: NEST.x + 80, y: NEST.y + 50 })
    expect(sim.snapshot().chicks[0]!.inField).toBe(false)
    expect(sim.observe().features.tucked).toBe(0)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 400; i++) {
      const c = sim.snapshot().chicks[0]!
      sim.pointer({ id: 4, phase: 'down', x: c.x, y: c.y })
      sim.pointer({ id: 4, phase: 'up', x: c.x, y: c.y })
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('hints', () => {
  it('show a demonstration after a quiet spell, only when hints are on, and change no outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    play(on, 20)
    play(off, 20)
    expect(on.snapshot().hint).toBeNull()
    play(on, 200)
    play(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })
})

describe('the meta', () => {
  it('declares an honest signature bound: 4 phases x 6 scenes x 2 verdicts', () => {
    expect(meta.signatureBound).toBe(4 * 6 * 2)
  })

  it('declares the dawn hook, one objective feature, and observes every feature', () => {
    expect(meta.hooks).toEqual(['dawn'])
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
