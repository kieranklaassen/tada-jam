// Scripted plays for Crossed Wires. The characteristic moment: a not-gate wired
// back on itself flickers its lamp. Then the constructions that only make sense
// after learning what each part does: a steady blinker (not through a delay),
// a beat (two blinkers into a both-gate), a latch (either fed back on itself),
// and a traveler crossing the drawbridge.

import { describe, expect, it } from 'vitest'
import type { PointerInput, Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { GATE_CYCLE, PLATE_CX, createSim } from './sim.ts'
import type { CrossedWiresSnapshot, GateType } from './sim.ts'

type Pt = { x: number; y: number }

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const snap = (sim: Sim<CrossedWiresSnapshot>) => sim.snapshot()

function tap(sim: Sim, p: Pt, id = 1): void {
  sim.pointer({ id, phase: 'down', x: p.x, y: p.y })
  sim.step()
  sim.pointer({ id, phase: 'up', x: p.x, y: p.y })
}

function drag(sim: Sim, from: Pt, to: Pt, id = 1): void {
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 8; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((to.x - from.x) * s) / 8, y: from.y + ((to.y - from.y) * s) / 8 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x: to.x, y: to.y })
}

const centre = (r: { x: number; y: number; w: number; h: number }): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

// Tap a socket until it holds the wanted gate.
function setGate(sim: Sim<CrossedWiresSnapshot>, socket: number, type: GateType): void {
  for (let i = 0; i < GATE_CYCLE.length && snap(sim).sockets[socket]!.type !== type; i++) {
    tap(sim, centre(snap(sim).sockets[socket]!.rect))
  }
  expect(snap(sim).sockets[socket]!.type).toBe(type)
}

// Ports are read from the snapshot at the moment of wiring, because a gate's
// input ports move when its type changes.
const gateOut = (sim: Sim<CrossedWiresSnapshot>, socket: number): Pt => snap(sim).sockets[socket]!.out!
const gateIn = (sim: Sim<CrossedWiresSnapshot>, socket: number, slot = 0): Pt => snap(sim).sockets[socket]!.ins[slot]!
const lampIn = (sim: Sim<CrossedWiresSnapshot>, lamp: number): Pt => snap(sim).sinks[lamp]!.port
const bridgeIn = (sim: Sim<CrossedWiresSnapshot>): Pt => snap(sim).sinks[3]!.port
const plateOut = (sim: Sim<CrossedWiresSnapshot>, lane: number): Pt => snap(sim).lanes[lane]!.out

function wire(sim: Sim<CrossedWiresSnapshot>, from: Pt, to: Pt): void {
  drag(sim, from, to)
}

// A not-gate in socket `s` wired back on itself, its output also going to `sink`.
function flicker(sim: Sim<CrossedWiresSnapshot>, s = 0, sink = 0): void {
  setGate(sim, s, 'not')
  wire(sim, gateOut(sim, s), gateIn(sim, s))
  wire(sim, gateOut(sim, s), sink === 3 ? bridgeIn(sim) : lampIn(sim, sink))
}

// A steady blinker: not -> delay -> back into the not; the not drives `sink`.
function blinker(sim: Sim<CrossedWiresSnapshot>, notSocket: number, delaySocket: number, delay: GateType, sink: number): void {
  setGate(sim, notSocket, 'not')
  setGate(sim, delaySocket, delay)
  wire(sim, gateOut(sim, notSocket), gateIn(sim, delaySocket))
  wire(sim, gateOut(sim, delaySocket), gateIn(sim, notSocket))
  wire(sim, gateOut(sim, notSocket), sink === 3 ? bridgeIn(sim) : lampIn(sim, sink))
}

// Drag a beetle onto its plate and leave it resting there (a held plate).
function parkOnPlate(sim: Sim<CrossedWiresSnapshot>, lane: number): void {
  const b = snap(sim).lanes[lane]!
  drag(sim, { x: b.x, y: b.y }, { x: PLATE_CX, y: b.y })
}

const litChanges = (sim: Sim<CrossedWiresSnapshot>, sink: number, ticks: number): number => {
  let changes = 0
  let last = snap(sim).sinks[sink]!.lit
  for (let i = 0; i < ticks; i++) {
    sim.step()
    const now = snap(sim).sinks[sink]!.lit
    if (now !== last) changes++
    last = now
  }
  return changes
}

describe('crossed wires: the courtyard', () => {
  it('starts dark and unwired, with three beetles walking and something to touch', () => {
    const sim = start()
    const first = snap(sim)
    expect(first.wires).toHaveLength(0)
    expect(first.sockets.every((s) => s.type === '')).toBe(true)
    expect(first.sinks.every((s) => !s.lit)).toBe(true)
    expect(sim.observe().signature).toBe('dark')
    expect(sim.affordances().length).toBeGreaterThan(0)
    run(sim, 60)
    expect(snap(sim).lanes.some((l, i) => l.x !== first.lanes[i]!.x)).toBe(true)
  })

  it('a wire from a plate to a lamp lights the lamp while a beetle stands on the plate', () => {
    const sim = start()
    parkOnPlate(sim, 0)
    wire(sim, plateOut(sim, 0), lampIn(sim, 0))
    run(sim, 5)
    expect(snap(sim).lanes[0]!.pressed).toBe(true)
    expect(snap(sim).sinks[0]!.lit).toBe(true)
    expect(sim.observe().features.lit).toBe(1)
    // Tap the beetle: it walks on, and the lamp goes out once it leaves the plate.
    const b = snap(sim).lanes[0]!
    tap(sim, { x: b.x, y: b.y })
    run(sim, 400)
    expect(litChanges(sim, 0, 400)).toBeGreaterThan(0)
  })

  it('a not-gate wired back on itself flickers its lamp (the characteristic moment)', () => {
    const sim = start()
    sim.observe()
    flicker(sim)
    expect(snap(sim).wires).toHaveLength(2)
    expect(litChanges(sim, 0, 120)).toBeGreaterThan(20)
    const obs = sim.observe()
    expect(snap(sim).sinks[0]!.cls).toBe('buzz')
    expect(obs.signature).toContain('buzz')
    expect(obs.events).toContainEqual({ kind: 'state', name: 'buzz' })
    expect(obs.features.blinking).toBe(1)
    expect(obs.features.loops).toBe(1)
  })

  it('not through a delay is a steady blinker, and a longer delay blinks slower', () => {
    const fast = start()
    blinker(fast, 0, 1, 'delay-s', 0)
    run(fast, 400)
    expect(snap(fast).sinks[0]!.cls).toBe('blink')
    const fastChanges = litChanges(fast, 0, 400)

    const slow = start()
    blinker(slow, 0, 1, 'delay-l', 0)
    run(slow, 800)
    expect(snap(slow).sinks[0]!.cls).toBe('blink')
    const slowChanges = litChanges(slow, 0, 400)
    expect(fastChanges).toBeGreaterThan(slowChanges * 2)
  })

  it('two different blinkers into a both-gate make a beat neither gives alone', () => {
    const sim = start()
    blinker(sim, 0, 1, 'delay-s', 0)
    blinker(sim, 2, 3, 'delay-l', 1)
    setGate(sim, 4, 'both')
    wire(sim, gateOut(sim, 0), gateIn(sim, 4, 0))
    wire(sim, gateOut(sim, 2), gateIn(sim, 4, 1))
    wire(sim, gateOut(sim, 4), lampIn(sim, 2))
    run(sim, 900)
    const sinks = snap(sim).sinks
    expect(sinks[0]!.cls).toBe('blink')
    expect(sinks[1]!.cls).toBe('blink')
    expect(sinks[2]!.cls).toBe('beat')
    const obs = sim.observe()
    expect(obs.signature).toBe('blink+beat')
    expect(obs.events).toContainEqual({ kind: 'state', name: 'beat' })
    expect(obs.features.blinking).toBe(3)
  })

  it('an either-gate fed back on itself latches: the lamp stays lit after the beetle leaves', () => {
    const sim = start()
    setGate(sim, 0, 'either')
    parkOnPlate(sim, 0)
    wire(sim, plateOut(sim, 0), gateIn(sim, 0, 0))
    wire(sim, gateOut(sim, 0), gateIn(sim, 0, 1))
    wire(sim, gateOut(sim, 0), lampIn(sim, 0))
    run(sim, 10)
    expect(snap(sim).sinks[0]!.lit).toBe(true)
    // Park the beetle far from the plate. Nothing presses it now.
    const b = snap(sim).lanes[0]!
    drag(sim, { x: b.x, y: b.y }, { x: 80, y: b.y })
    run(sim, 200)
    expect(snap(sim).lanes[0]!.pressed).toBe(false)
    expect(snap(sim).sinks[0]!.lit).toBe(true)
    expect(sim.observe().signature).toBe('lit')
  })

  it('a beetle held on a plate wired to the bridge lets a traveler cross', () => {
    const sim = start()
    sim.observe()
    parkOnPlate(sim, 1)
    wire(sim, plateOut(sim, 1), bridgeIn(sim))
    run(sim, 200)
    const obs = sim.observe()
    expect(snap(sim).crossings).toBeGreaterThanOrEqual(1)
    expect(obs.features.crossings).toBeGreaterThanOrEqual(1)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'cross' })
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'stamps' })
  })

  it('a fast blinker on the bridge makes travelers slip; a slow loop of three long delays lets them over', () => {
    const shortBlink = start()
    blinker(shortBlink, 0, 1, 'delay-s', 3)
    run(shortBlink, 700)
    expect(snap(shortBlink).crossings).toBe(0)
    expect(shortBlink.observe().events.some((e) => e.kind === 'state' && e.name === 'slip')).toBe(true)

    const longBlink = start()
    setGate(longBlink, 0, 'not')
    for (const socket of [1, 2, 3]) setGate(longBlink, socket, 'delay-l')
    wire(longBlink, gateOut(longBlink, 0), gateIn(longBlink, 1))
    wire(longBlink, gateOut(longBlink, 1), gateIn(longBlink, 2))
    wire(longBlink, gateOut(longBlink, 2), gateIn(longBlink, 3))
    wire(longBlink, gateOut(longBlink, 3), gateIn(longBlink, 0))
    wire(longBlink, gateOut(longBlink, 0), bridgeIn(longBlink))
    run(longBlink, 900)
    expect(snap(longBlink).crossings).toBeGreaterThanOrEqual(1)
  })

  it('a plate wired straight to the bridge is never enough: the traveler slips back', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const sim = start({ seed })
      wire(sim, plateOut(sim, 0), bridgeIn(sim))
      run(sim, 1500)
      expect(snap(sim).crossings, `seed ${seed}`).toBe(0)
    }
  })

  it('an either-gate latch holds the bridge down, so travelers keep crossing both ways', () => {
    const sim = start()
    setGate(sim, 0, 'either')
    parkOnPlate(sim, 0)
    wire(sim, plateOut(sim, 0), gateIn(sim, 0, 0))
    wire(sim, gateOut(sim, 0), gateIn(sim, 0, 1))
    wire(sim, gateOut(sim, 0), bridgeIn(sim))
    const b = snap(sim).lanes[0]!
    drag(sim, { x: b.x, y: b.y }, { x: 80, y: b.y })
    run(sim, 700)
    expect(snap(sim).crossings).toBeGreaterThanOrEqual(3)
  })
})

describe('crossed wires: handling', () => {
  it('a tap on a plugged input takes the wire out; dragging a wire off and letting go discards it', () => {
    const sim = start()
    wire(sim, plateOut(sim, 0), lampIn(sim, 0))
    expect(snap(sim).wires).toHaveLength(1)
    tap(sim, lampIn(sim, 0))
    expect(snap(sim).wires).toHaveLength(0)
    wire(sim, plateOut(sim, 0), lampIn(sim, 0))
    drag(sim, lampIn(sim, 0), { x: 700, y: 760 })
    expect(snap(sim).wires).toHaveLength(0)
  })

  it('picking a wire up from one input and dropping it on another reroutes it', () => {
    const sim = start()
    wire(sim, plateOut(sim, 0), lampIn(sim, 0))
    drag(sim, lampIn(sim, 0), lampIn(sim, 2))
    const wires = snap(sim).wires
    expect(wires).toHaveLength(1)
    expect(wires[0]!.x2).toBe(lampIn(sim, 2).x)
    expect(wires[0]!.y2).toBe(lampIn(sim, 2).y)
  })

  it('a wire dropped between a gate\'s two inputs takes the free one', () => {
    const sim = start()
    setGate(sim, 3, 'both')
    const a = gateIn(sim, 3, 0)
    const b = gateIn(sim, 3, 1)
    const between = { x: a.x + 40, y: (a.y + b.y) / 2 }
    wire(sim, plateOut(sim, 0), between)
    wire(sim, plateOut(sim, 1), between)
    expect(snap(sim).wires).toHaveLength(2)
    expect(snap(sim).wires.map((w) => w.y2).sort()).toEqual([a.y, b.y].sort())
  })

  it('turning a gate into a one-input kind drops its second wire, and emptying it drops all wires', () => {
    const sim = start()
    setGate(sim, 0, 'both')
    wire(sim, plateOut(sim, 0), gateIn(sim, 0, 0))
    wire(sim, plateOut(sim, 1), gateIn(sim, 0, 1))
    wire(sim, gateOut(sim, 0), lampIn(sim, 0))
    expect(snap(sim).wires).toHaveLength(3)
    setGate(sim, 0, 'delay-s')
    expect(snap(sim).wires).toHaveLength(2)
    setGate(sim, 0, '')
    expect(snap(sim).wires).toHaveLength(0)
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(snap(sim))
    const bad: PointerInput[] = [
      { id: 1, phase: 'down', x: Number.NaN, y: 10 },
      { id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY },
      { id: 9, phase: 'up', x: 500, y: 500 },
    ]
    for (const input of bad) sim.pointer(input)
    expect(JSON.stringify(snap(sim))).toBe(before)
  })

  it('reports affordances inside the field, and names the plates first', () => {
    const sim = start()
    const list = sim.affordances()
    expect(list.filter((a) => a.kind === 'drag').length).toBeGreaterThanOrEqual(3)
    expect(list.some((a) => a.kind === 'tap')).toBe(true)
  })
})

describe('crossed wires: determinism, hooks, hints', () => {
  const script = (sim: Sim<CrossedWiresSnapshot>) => {
    blinker(sim, 0, 1, 'delay-s', 0)
    flicker(sim, 2, 1)
    run(sim, 300)
  }

  it('the same seed and script give the same signature and snapshot', () => {
    const a = start({ seed: 5 })
    const b = start({ seed: 5 })
    script(a)
    script(b)
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(snap(a))).toBe(JSON.stringify(snap(b)))
  })

  it('different seeds set the beetles walking differently', () => {
    const a = start({ seed: 1 })
    const b = start({ seed: 2 })
    expect(JSON.stringify(snap(a).lanes)).not.toBe(JSON.stringify(snap(b).lanes))
  })

  it('an empty hooks list yields no hook events and no stamp strip', () => {
    const sim = start({ hooks: [] })
    flicker(sim)
    run(sim, 100)
    const obs = sim.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'buzz' })
    expect(snap(sim).stamps).toBeNull()
  })

  it('the stamps hook stamps a flicker once, and only once', () => {
    const sim = start()
    flicker(sim)
    run(sim, 120)
    const first = sim.observe().events.filter((e) => e.kind === 'hook')
    expect(first).toEqual([{ kind: 'hook', name: 'stamps' }])
    expect(snap(sim).stamps).toEqual(['buzz'])
    run(sim, 200)
    expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('hints climb a ladder when the child is idle, and never show with hints off', () => {
    const on = start()
    expect(snap(on).hint).toBeNull()
    run(on, 200)
    expect(snap(on).hint?.kind).toBe('wire')
    wire(on, plateOut(on, 0), lampIn(on, 0))
    run(on, 200)
    expect(snap(on).hint?.kind).toBe('tap')
    setGate(on, 0, 'not')
    run(on, 200)
    expect(snap(on).hint?.kind).toBe('wire')
    const off = start({ hints: false })
    run(off, 600)
    expect(snap(off).hint).toBeNull()
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 200; i++) tap(sim, centre(snap(sim).sockets[0]!.rect))
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})
