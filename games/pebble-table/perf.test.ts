import * as CANNON from 'cannon-es'
import { describe, expect, it, vi } from 'vitest'
import { TableController } from './controller'
import { BAG, SCALE, type Point } from './layout'
import { JARS, PART_COUNTS, PART_KINDS } from './parts'
import { toWorld2 } from './physics3d'
import { defaultTable } from './state'

// Frame-time budget for the CPU side of a frame. The heaviest thing the
// game simulates is a spill: ten stones tumbling onto the table at once.
// On an iPad the whole frame has about 12 ms, and the GPU needs most of it,
// so the controller (physics, guidance, rules) must stay a small slice even
// on a CI runner. The budget is loose enough not to flake on a busy runner
// and tight enough to catch a collider or substep regression, which cost
// several times this.

const FRAME = 1 / 60
const topDown = { toScreen: (v: { x: number; z: number }) => toWorld2(v), toPlane: (screen: Point) => screen }

function spillFrameTimes(frames: number): number[] {
  const table = new TableController({ ...defaultTable(4), seats: [true, true, false, false, true] }, { save: () => {} })
  table.setProjector(topDown)
  for (let i = 0; i < 30; i++) table.step(FRAME)
  table.pointerDown(1, { x: BAG.x, y: BAG.y }, 10)
  table.pointerUp(1, { x: BAG.x, y: BAG.y }, 90)
  const times: number[] = []
  for (let i = 0; i < frames; i++) {
    const start = performance.now()
    table.step(FRAME)
    times.push(performance.now() - start)
  }
  return times
}

type ScaleWork = { steps: number; tests: number; sunkTests: number; contacts: number }

/**
 * The Honest Scale at its busiest, seeded: four stones on the mat, every jar
 * tipped out over them, then sticks and shells (the parts built of the most
 * balls) carried onto one pan and the other, so both pans swing with parts
 * in them, one carried back off, and the table left to settle. Each frame is
 * what the view asks of physics too: the controller's step, then `sunk` for
 * every part. Counts, per frame, cannon's steps, the shape-against-shape tests
 * its narrowphase runs (in steps and in `sunk`), and the contacts it hands
 * the solver.
 */
function busyScale() {
  let seed = 5
  const random = vi.spyOn(Math, 'random').mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
  try {
    const pieces = [0, 1, 2, 3].map((i) => ({ id: 500 + i, q: 4 as const, x: 700 + i * 60, y: 640 }))
    const table = new TableController({ ...defaultTable(6), liveMat: 'scale', pieces, bag: 36 }, { save: () => {} })
    table.setProjector(topDown)
    const { physics } = table
    const world = physics.world
    const tally = { tests: 0, sunk: false, sunkTests: 0 }
    const narrowphase = world.narrowphase as unknown as Record<number, (...args: unknown[]) => unknown>
    for (const type of Object.values(CANNON.COLLISION_TYPES)) {
      const test = narrowphase[type]
      if (!test) continue
      Object.defineProperty(narrowphase, type, {
        value: function (this: unknown, ...args: unknown[]) {
          if (tally.sunk) tally.sunkTests++
          else tally.tests++
          return test.apply(this, args)
        },
      })
    }
    const work: ScaleWork[] = []
    let [clock, mostTilt, mostOnPans] = [0, 0, [0, 0]]
    const onPan = (at: Point) => SCALE.pans.findIndex((pan) => Math.hypot(at.x - pan.x, at.y - pan.y) < pan.r)
    const frame = () => {
      const [steps, before] = [world.stepnumber, tally.tests]
      table.step(FRAME)
      tally.sunk = true
      tally.sunkTests = 0
      physics.sunk(new Set(table.state.parts.flatMap((part) => physics.body(part.id) ?? [])))
      tally.sunk = false
      work.push({ steps: world.stepnumber - steps, tests: tally.tests - before, sunkTests: tally.sunkTests, contacts: world.contacts.length })
      mostTilt = Math.max(mostTilt, Math.abs(table.beam.angle))
      const lying = [0, 1].map((side) => table.state.parts.filter((part) => !table.isHeld(part.id) && onPan(part) === side).length)
      mostOnPans = lying.map((n, side) => Math.max(n, mostOnPans[side]))
    }
    const wait = (seconds: number) => {
      for (let t = 0; t < seconds - 1e-9; t += FRAME) frame()
    }
    const carry = (from: Point, to: Point) => {
      table.pointerDown(1, from, (clock += 10))
      wait(0.1)
      for (let k = 1; k <= 60; k++) {
        table.pointerMove(1, { x: from.x + ((to.x - from.x) * k) / 60, y: from.y + ((to.y - from.y) * k) / 60 }, (clock += 16))
        frame()
      }
      wait(0.3)
      table.pointerUp(1, to, (clock += 16))
      wait(0.5)
    }
    wait(0.5)
    for (const kind of PART_KINDS) {
      table.pointerDown(1, JARS[kind], (clock += 10))
      table.pointerUp(1, JARS[kind], (clock += 80))
      wait(0.4)
    }
    wait(2)
    const out = table.state.parts.length
    for (let i = 0; i < 6; i++) {
      const kind = i % 2 === 0 ? 'stick' : 'shell'
      const part = table.state.parts.find((p) => p.kind === kind && onPan(p) < 0)
      if (part) carry(part, { x: SCALE.pans[i % 2].x + ((i % 3) - 1) * 25, y: SCALE.pans[i % 2].y })
    }
    const back = table.state.parts.find((p) => onPan(p) === 0)
    if (back) carry(back, { x: 800, y: 330 })
    wait(3)
    const awake = table.state.parts.filter((part) => physics.body(part.id)?.sleepState !== CANNON.Body.SLEEPING).length
    return { work, out, mostTilt, mostOnPans, awake }
  } finally {
    random.mockRestore()
  }
}

describe('frame budget', () => {
  it('a ten-stone spill costs the controller under 0.75 ms per frame on average', () => {
    spillFrameTimes(60)
    // A busy runner stalls random frames, not the same frame in every run, so
    // each frame's minimum across runs is its real cost with the noise removed.
    const runs = Array.from({ length: 7 }, () => spillFrameTimes(180))
    const perFrame = runs[0].map((_, i) => Math.min(...runs.map((run) => run[i])))
    const average = perFrame.reduce((a, b) => a + b, 0) / perFrame.length
    console.log(`spill: average of per-frame minimums ${average.toFixed(3)} ms, worst frame ${Math.max(...perFrame).toFixed(2)} ms`)
    expect(average).toBeLessThan(0.75)
  })

  it('the Honest Scale at its busiest does a counted amount of collision work a frame', () => {
    const { work, out, mostTilt, mostOnPans, awake } = busyScale()
    const total = (key: keyof ScaleWork) => work.reduce((sum, frame) => sum + frame[key], 0)
    const most = (key: keyof ScaleWork) => Math.max(...work.map((frame) => frame[key]))
    const frames = work.length
    console.log(
      `busy scale: ${frames} frames, ${out} parts out, tilt ${mostTilt.toFixed(3)}, most on pans ${mostOnPans.join('/')}, awake at end ${awake}; ` +
        `steps ${total('steps')} (most ${most('steps')}), shape tests ${total('tests')} (most ${most('tests')}), ` +
        `sunk tests ${total('sunkTests')} (most ${most('sunkTests')}), contacts most ${most('contacts')}`,
    )
    expect(out, 'every jar tipped out').toBe(Object.values(PART_COUNTS).reduce((a, b) => a + b, 0))
    expect(mostOnPans.every((n) => n >= 2), 'parts lying in both pans').toBe(true)
    expect(mostTilt, 'the beam tipped').toBeGreaterThan(0.05)
    expect(awake, 'parts left awake after the table settles').toBe(0)
    // Seeded, so these are the same on any machine. Trying every shape of a
    // pair against every other costs four times the shape tests, and `sunk`
    // finding every pair afresh a sixth more of its own.
    expect(total('steps') / frames, 'cannon steps a frame').toBeLessThan(2.2)
    expect(most('steps'), 'cannon steps in the busiest frame').toBeLessThanOrEqual(9)
    expect(total('tests') / frames, 'shape tests a frame').toBeLessThan(300)
    expect(most('tests'), 'shape tests in the busiest frame').toBeLessThan(1300)
    expect(total('sunkTests') / frames, "sunk's shape tests a frame").toBeLessThan(14)
    expect(most('contacts'), 'contacts in the busiest frame').toBeLessThan(200)
  })
})
