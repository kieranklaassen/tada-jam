// Proof for Slump Castles. The characteristic moment: damp sand holds a tower
// that dry sand cannot, then the tower dries and slumps to a gentle slope all
// by itself. The scripted plays go through the sim's own pointer() and step().

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { BASE, BOX, BUCKET_BTN, CELL, COLS, ROWS, SHOVEL_BTN, analyse, createSim } from './sim.ts'
import type { SandSnapshot } from './sim.ts'

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const centre = (c: number, r: number) => ({ x: BOX.x + (c + 0.5) * CELL, y: BOX.y + (r + 0.5) * CELL })
const mid = (rect: { x: number; y: number; w: number; h: number }) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })

function tapAt(sim: Sim, p: { x: number; y: number }, id = 1): void {
  sim.pointer({ id, phase: 'down', x: p.x, y: p.y })
  sim.step()
  sim.pointer({ id, phase: 'up', x: p.x, y: p.y })
}

function drag(sim: Sim, from: { x: number; y: number }, to: { x: number; y: number }, ticks: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= ticks; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((to.x - from.x) * s) / ticks, y: from.y + ((to.y - from.y) * s) / ticks })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x: to.x, y: to.y })
}

const snap = (sim: Sim) => sim.snapshot() as SandSnapshot
const sandTotal = (s: SandSnapshot) => s.h.reduce((sum, v) => sum + v, 0) + s.fingers.reduce((sum, f) => sum + f.load, 0)

// Wet the strip of row 10 from column 6 to 16, twice over, with the bucket.
function soakStrip(sim: Sim): void {
  tapAt(sim, mid(BUCKET_BTN))
  drag(sim, centre(6, 10), centre(16, 10), 40)
  drag(sim, centre(16, 10), centre(6, 10), 40)
}

// Plough the strip from column 7 to 15 and let go: the load lands as a heap.
function plough(sim: Sim): void {
  tapAt(sim, mid(SHOVEL_BTN))
  drag(sim, centre(7, 10), centre(15, 10), 16)
}

describe('the characteristic moment: a damp tower stands, then dries and slumps', () => {
  it('holds a taller heap from damp sand than from dry sand', () => {
    const dry = start()
    plough(dry)
    run(dry, 90)

    const damp = start()
    soakStrip(damp)
    plough(damp)
    run(damp, 90)

    expect(snap(damp).peak).toBeGreaterThan(snap(dry).peak + 1.5)
    expect(damp.observe().signature).toMatch(/^mound-standing$/)
    expect(damp.observe().features.standing).toBeGreaterThan(0)
    expect(dry.observe().features.standing).toBe(0)
  })

  it('then dries out and slumps to the gentle dry slope all by itself', () => {
    const sim = start()
    soakStrip(sim)
    plough(sim)
    run(sim, 90)
    sim.observe()
    const tall = snap(sim).peak
    expect(sim.observe().signature).toMatch(/standing$/)

    // Nobody touches it. A hundred and twenty sim-seconds later it has slumped.
    run(sim, 3600)
    expect(snap(sim).peak).toBeLessThan(tall - 2)
    expect(sim.observe().signature).toMatch(/settled$/)
    expect(sim.observe().features.standing).toBe(0)
    expect(sim.observe().features.damp).toBeLessThan(0.05)
  })

  it('reports the slump as an event while the sand is moving', () => {
    const sim = start()
    soakStrip(sim)
    plough(sim)
    const seen = new Set<string>()
    for (let i = 0; i < 4200; i++) {
      sim.step()
      for (const e of sim.observe().events) seen.add(`${e.kind}:${e.name}`)
    }
    expect(seen.has('state:slump')).toBe(true)
  })
})

// One heap the way a child builds it: (soak a strip,) scoop it in one stroke,
// carry the load to a cell, and let go.
function heap(sim: Sim, k: number, at: { c: number; r: number }, wet: boolean): void {
  const row = 1 + (k % 3) * 2
  const c0 = 2 + Math.floor(k / 3) * 8
  if (wet) {
    tapAt(sim, mid(BUCKET_BTN))
    drag(sim, centre(c0, row), centre(c0 + 6, row), 15)
    drag(sim, centre(c0 + 6, row), centre(c0, row), 15)
  }
  tapAt(sim, mid(SHOVEL_BTN))
  const a0 = centre(c0, row)
  const a1 = centre(c0 + 6, row)
  const to = centre(at.c, at.r)
  sim.pointer({ id: 1, phase: 'down', x: a0.x, y: a0.y })
  for (let s = 1; s <= 15; s++) {
    sim.pointer({ id: 1, phase: 'move', x: a0.x + ((a1.x - a0.x) * s) / 15, y: a0.y })
    sim.step()
  }
  for (let s = 1; s <= 20; s++) {
    sim.pointer({ id: 1, phase: 'move', x: a1.x + ((to.x - a1.x) * s) / 20, y: a1.y + ((to.y - a1.y) * s) / 20 })
    sim.step()
  }
  sim.pointer({ id: 1, phase: 'up', x: to.x, y: to.y })
}

// The signatures a sim passes through while it runs, in order, without repeats.
function path(sim: Sim, ticks: number, each?: () => void): string[] {
  const seen: string[] = []
  for (let i = 0; i < ticks; i++) {
    sim.step()
    const sig = sim.observe().signature
    if (seen[seen.length - 1] !== sig) seen.push(sig)
    each?.()
  }
  return seen
}

describe('building with the drying in mind (the play-5 outcomes)', () => {
  it('seven damp heaps around a pit close into a rim that holds, then dries into an even ring', () => {
    for (const seed of [1, 2, 3]) {
      const sim = start({ seed })
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2
        heap(sim, k, { c: Math.round(17 + Math.cos(a) * 4), r: Math.round(13 + Math.sin(a) * 4) }, true)
      }
      // While the damp wall stands the crater is wide; the slump then finishes
      // the rim, leaving a small even crater rather than a broken wall.
      let widest = 0
      const seen = path(sim, 4200, () => {
        widest = Math.max(widest, sim.observe().features.enclosed ?? 0)
      })
      expect(seen).toContain('ring-standing')
      expect(seen[seen.length - 1]).toBe('ring-settled')
      const settled = sim.observe().features.enclosed ?? 0
      expect(settled).toBeGreaterThanOrEqual(2)
      expect(widest).toBeGreaterThan(settled)
    }
  })

  it('two damp heaps a little apart slump toward each other into a saddle between two peaks', () => {
    const sim = start()
    heap(sim, 0, { c: 14, r: 13 }, true)
    heap(sim, 1, { c: 19, r: 13 }, true)
    const seen = path(sim, 4200)
    expect(seen).toContain('saddle-standing')
    expect(seen[seen.length - 1]).toBe('saddle-settled')
  })

  it('the same two heaps built dry make only a low saddle that never stands on its own', () => {
    const damp = start()
    heap(damp, 0, { c: 14, r: 13 }, true)
    heap(damp, 1, { c: 19, r: 13 }, true)
    run(damp, 300)
    const dry = start()
    heap(dry, 0, { c: 14, r: 13 }, false)
    heap(dry, 1, { c: 19, r: 13 }, false)
    const seen = path(dry, 300)
    expect(seen.some((sig) => sig.endsWith('standing'))).toBe(false)
    expect(snap(damp).peak).toBeGreaterThan(snap(dry).peak + 2)
  })

  it('the same seven heaps built dry do not keep a ring', () => {
    const sim = start()
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      heap(sim, k, { c: Math.round(17 + Math.cos(a) * 4), r: Math.round(13 + Math.sin(a) * 4) }, false)
    }
    run(sim, 600)
    expect(sim.observe().signature).not.toBe('ring-settled')
    expect(sim.observe().features.standing).toBe(0)
  })
})

describe('the sand', () => {
  it('starts flat, in one piece, with a bucket, a shovel, and something to touch', () => {
    const sim = start()
    const s = snap(sim)
    expect(s.h).toHaveLength(COLS * ROWS)
    expect(Math.max(...s.h)).toBeLessThan(BASE + 0.5)
    expect(Math.min(...s.h)).toBeGreaterThan(BASE - 0.5)
    expect(sim.observe().signature).toBe('flat-settled')
    expect(sim.affordances().length).toBeGreaterThan(0)
  })

  it('a bare tap with the shovel already piles a small mound (first touch matters)', () => {
    const sim = start()
    sim.observe()
    tapAt(sim, centre(18, 8))
    run(sim, 6)
    expect(snap(sim).peak).toBeGreaterThan(0.5)
    expect(sim.observe().events.some((e) => e.kind === 'state' && e.name === 'dig')).toBe(true)
  })

  it('never makes or loses sand, whatever the child does', () => {
    const sim = start()
    const before = sandTotal(snap(sim))
    soakStrip(sim)
    plough(sim)
    drag(sim, centre(2, 3), centre(30, 16), 25, 2)
    run(sim, 500)
    expect(sandTotal(snap(sim))).toBeCloseTo(before, 6)
  })

  it('over-watering turns the sand to soup that will not hold a wall', () => {
    const damp = start()
    soakStrip(damp)
    plough(damp)
    run(damp, 30)
    const soaked = start()
    soakStrip(soaked)
    plough(soaked)
    run(soaked, 30)
    // Now drown the soaked one.
    tapAt(soaked, mid(BUCKET_BTN))
    const top = centre(15, 10)
    soaked.pointer({ id: 3, phase: 'down', x: top.x, y: top.y })
    run(soaked, 150) // five seconds of holding the bucket in one place
    soaked.pointer({ id: 3, phase: 'up', x: top.x, y: top.y })
    run(damp, 150)
    expect(snap(soaked).peak).toBeLessThan(snap(damp).peak - 1)
    expect(soaked.observe().signature).toMatch(/soupy$/)
    // The water drains and the soup thickens again.
    run(soaked, 600)
    expect(soaked.observe().signature).not.toMatch(/soupy$/)
  })

  it('weather changes how fast a wall dries, by seed', () => {
    const rate = (seed: number) => {
      const sim = start({ seed })
      soakStrip(sim)
      plough(sim)
      run(sim, 600)
      return snap(sim).peak
    }
    const peaks = [1, 2, 3, 4, 5, 6].map(rate)
    expect(new Set(peaks.map((p) => p.toFixed(2))).size).toBeGreaterThan(1)
  })
})

describe('landforms', () => {
  const flat = () => Array.from({ length: COLS * ROWS }, () => BASE)
  const dryOf = (h: number[]) => h.slice()
  const zero = () => Array.from({ length: COLS * ROWS }, () => 0)
  const at = (c: number, r: number) => r * COLS + c
  const read = (h: number[]) => analyse(h, dryOf(h), zero())

  it('reads a flat pit as flat', () => {
    expect(read(flat()).form).toBe('flat')
  })

  it('reads one heap as a mound and a long one as a ridge', () => {
    const h = flat()
    for (const [c, r] of [[10, 10], [11, 10], [10, 11], [11, 11]]) h[at(c!, r!)] = BASE + 3.5
    expect(read(h).form).toBe('mound')
    const ridge = flat()
    for (let c = 8; c < 18; c++) for (const r of [10, 11]) ridge[at(c, r)] = BASE + 3.5
    expect(read(ridge).form).toBe('ridge')
  })

  it('reads two peaks with a col between them as a saddle, and two apart as a scatter', () => {
    const h = flat()
    for (let c = 8; c <= 16; c++) for (const r of [10, 11]) h[at(c, r)] = BASE + 2
    for (const c of [8, 9, 15, 16]) for (const r of [10, 11]) h[at(c, r)] = BASE + 4
    expect(read(h).form).toBe('saddle')
    const apart = flat()
    for (const c of [5, 6]) for (const r of [5, 6]) apart[at(c, r)] = BASE + 3
    for (const c of [20, 21]) for (const r of [12, 13]) apart[at(c, r)] = BASE + 3
    expect(read(apart).form).toBe('scatter')
  })

  it('reads a closed rim as a ring, and the same rim with a gap as not a ring', () => {
    const rim = flat()
    for (let c = 10; c <= 16; c++) for (const r of [7, 13]) rim[at(c, r)] = BASE + 3
    for (let r = 7; r <= 13; r++) for (const c of [10, 16]) rim[at(c, r)] = BASE + 3
    const closed = read(rim)
    expect(closed.form).toBe('ring')
    expect(closed.enclosed).toBeGreaterThan(10)
    rim[at(10, 10)] = BASE
    rim[at(10, 9)] = BASE
    const gap = read(rim)
    expect(gap.form).not.toBe('ring')
    expect(gap.enclosed).toBe(0)
  })

  it('reads a dug hole as a pit', () => {
    const h = flat()
    for (let c = 10; c <= 13; c++) for (let r = 8; r <= 11; r++) h[at(c, r)] = BASE - 2.5
    expect(read(h).form).toBe('pit')
  })
})

describe('determinism, hooks, and hints', () => {
  const script = (sim: Sim) => {
    soakStrip(sim)
    plough(sim)
    run(sim, 200)
  }

  it('the same seed and script give the same signature, features, and snapshot', () => {
    const a = start({ seed: 5 })
    const b = start({ seed: 5 })
    script(a)
    script(b)
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('has no hooks: an empty list means no hook events, and so does the full one', () => {
    for (const hooks of [[], meta.hooks]) {
      const sim = start({ hooks })
      const kinds: string[] = []
      script(sim)
      for (let i = 0; i < 20; i++) {
        sim.step()
        for (const e of sim.observe().events) kinds.push(e.kind)
      }
      expect(kinds.includes('hook')).toBe(false)
    }
    expect(meta.hooks).toEqual([])
  })

  it('shows a hint after a quiet spell only when hints are on, and never changes the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    run(off, 20)
    expect(snap(on).hint).toBeNull()
    run(on, 200)
    run(off, 200)
    expect(snap(on).hint).not.toBeNull()
    expect(snap(off).hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(snap(on).hint).toBeNull()
  })

  it('ignores non-finite coordinates, an up with no down, and touches outside the tray', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    sim.pointer({ id: 4, phase: 'down', x: 5, y: 810 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('reports affordances as top-left rectangles that centre on the tools', () => {
    const list = start().affordances()
    const shovel = list.find((a) => a.x === SHOVEL_BTN.x && a.y === SHOVEL_BTN.y)
    expect(shovel).toBeDefined()
    expect(shovel!.w).toBe(SHOVEL_BTN.w)
    expect(list.some((a) => a.x === BOX.x && a.y === BOX.y && a.w === BOX.w)).toBe(true)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    expect(meta.signatureBound).toBe(7 * 4)
  })

  it('observes every declared feature and marks an objective', () => {
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
    expect(meta.features.some((f) => f.objective)).toBe(true)
  })
})
