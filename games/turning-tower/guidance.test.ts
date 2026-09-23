import { describe, expect, it } from 'vitest'
import { DEMO_SECONDS, handPose, HintScheduler, INVITE_DELAY, MAX_DEMOS, MAX_INVITES, quietAfter, timingFor, type HandPose } from './guidance'

function demoStarts(scheduler: HintScheduler, from: number, seconds: number): number[] {
  const starts: number[] = []
  let was = false
  for (let t = from; t < from + seconds; t += 0.05) {
    const on = scheduler.update(t).demo !== null
    if (on && !was) starts.push(+(t - from).toFixed(2))
    was = on
  }
  return starts
}

describe('guidance ladder', () => {
  it('waits longer for older children', () => {
    expect(timingFor(null)).toEqual({ glow: 3, demo: 5 })
    expect(timingFor(7)).toEqual({ glow: 3, demo: 5 })
    expect(timingFor(8)).toEqual({ glow: 4, demo: 7 })
    expect(timingFor(10)).toEqual({ glow: 6, demo: 10 })
  })

  it('glows first, then demonstrates, with doubling gaps and at most four demonstrations', () => {
    const scheduler = new HintScheduler(0, timingFor(7))
    expect(scheduler.update(2.9).glow).toBe(0)
    expect(scheduler.update(4.5).glow).toBeGreaterThan(0)
    const starts = demoStarts(scheduler, 0, 400)
    expect(starts).toHaveLength(MAX_DEMOS)
    expect(starts[0]).toBeCloseTo(5, 1)
    const gaps = starts.slice(1).map((s, i) => s - starts[i] - DEMO_SECONDS)
    expect(gaps[0]).toBeCloseTo(10, 1)
    expect(gaps[1]).toBeCloseTo(20, 1)
    expect(gaps[2]).toBeCloseTo(40, 1)
  })

  it('vanishes on any touch and starts a fresh idle stretch', () => {
    const scheduler = new HintScheduler(0, timingFor(7))
    expect(scheduler.update(6).demo).not.toBeNull()
    scheduler.touch(6)
    const state = scheduler.update(6.01)
    expect(state.demo).toBeNull()
    expect(state.glow).toBe(0)
    expect(demoStarts(scheduler, 6, 30)[0]).toBeCloseTo(5, 1)
  })

  it('goes quiet a little after the last demonstration, at every age', () => {
    for (const age of [7, 8, 10]) {
      const scheduler = new HintScheduler(0, timingFor(age))
      const starts = demoStarts(scheduler, 0, 600)
      const quiet = quietAfter(timingFor(age))
      expect(quiet).toBeGreaterThan(starts.at(-1)! + DEMO_SECONDS)
      expect(quiet).toBeLessThan(starts.at(-1)! + DEMO_SECONDS + 10)
    }
    expect(quietAfter(timingFor(7))).toBeCloseTo(89.4, 5)
  })

  it('holds the idle clock while the world is busy', () => {
    const scheduler = new HintScheduler(0, timingFor(9))
    scheduler.hold(20)
    expect(scheduler.idleFor(25)).toBe(5)
    expect(scheduler.update(25).glow).toBe(0)
  })

  it('invites with the lantern a few times until the first touch', () => {
    const scheduler = new HintScheduler(0, timingFor(7))
    let invites = 0
    let was = false
    for (let t = 0; t < 60; t += 0.05) {
      const on = scheduler.update(t).invite !== null
      if (on && !was) invites += 1
      was = on
    }
    expect(invites).toBe(MAX_INVITES)
    const touched = new HintScheduler(0, timingFor(7))
    touched.touch(0.2)
    expect(touched.update(INVITE_DELAY + 0.5).invite).toBeNull()
    touched.reopen(10)
    expect(touched.update(10 + INVITE_DELAY + 0.5).invite).not.toBeNull()
  })

  it('moves the ghost hand along a drag path and taps in place', () => {
    const out: HandPose = { x: 0, y: 0, press: 0, opacity: 0 }
    const drag = { kind: 'drag' as const, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] }
    expect(handPose(drag, 0.1, out)).toMatchObject({ x: 0, y: 0, press: 0 })
    expect(handPose(drag, 0.5, out).press).toBe(1)
    expect(handPose(drag, 0.8, out)).toMatchObject({ x: 100, y: 100 })
    expect(handPose(drag, 1, out).opacity).toBe(0)
    const tap = handPose({ kind: 'tap', at: { x: 5, y: 7 } }, 0.32, out)
    expect(tap).toMatchObject({ x: 5, y: 7 })
    expect(tap.press).toBeGreaterThan(0.9)
  })
})
