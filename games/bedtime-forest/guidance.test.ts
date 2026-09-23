import { describe, expect, it } from 'vitest'
import { chooseHint, DEMO_REACH, handPose, HintScheduler, IDLE_BEFORE_GLOW, IDLE_BEFORE_HINT, MAX_INVITES } from './guidance'

function demosIn(scheduler: HintScheduler, from: number, to: number): number {
  let demos = 0
  let playing = false
  for (let t = from; t < to; t += 0.05) {
    const now = scheduler.update(t, false).demo >= 0
    if (now && !playing) demos++
    playing = now
  }
  return demos
}

describe('HintScheduler', () => {
  it('glows after 3 s idle and demonstrates after 5 s', () => {
    const s = new HintScheduler(0)
    s.touch(0)
    expect(s.update(IDLE_BEFORE_GLOW - 0.1, false).glow).toBe(0)
    expect(s.update(IDLE_BEFORE_GLOW + 1.6, false).glow).toBeGreaterThan(0)
    expect(s.update(IDLE_BEFORE_HINT - 0.1, false).demo).toBe(-1)
    expect(s.update(IDLE_BEFORE_HINT + 0.1, false).demo).toBeGreaterThanOrEqual(0)
  })

  it('backs off and stops after four demonstrations', () => {
    const s = new HintScheduler(0)
    s.touch(0)
    expect(demosIn(s, 0, 400)).toBe(4)
  })

  it('any touch clears the glow and the demo at once', () => {
    const s = new HintScheduler(0)
    s.touch(0)
    expect(s.update(6, false).demo).toBeGreaterThanOrEqual(0)
    s.touch(6)
    const timing = s.update(6.01, false)
    expect(timing.demo).toBe(-1)
    expect(timing.glow).toBe(0)
  })

  it('stays quiet at night and restarts the idle clock after it', () => {
    const s = new HintScheduler(0)
    s.touch(0)
    expect(s.update(20, true).glow).toBe(0)
    expect(s.update(20, true).demo).toBe(-1)
    expect(s.update(21, false).glow).toBe(0)
  })

  it('invites at most three times before the first touch, and never after', () => {
    const untouched = new HintScheduler(0)
    let invites = 0
    for (let t = 0; t < 60; t += 0.05) if (untouched.update(t, false).invite) invites++
    expect(invites).toBe(MAX_INVITES)
    const touched = new HintScheduler(0)
    touched.touch(0.5)
    invites = 0
    for (let t = 0; t < 60; t += 0.05) if (touched.update(t, false).invite) invites++
    expect(invites).toBe(0)
  })
})

describe('chooseHint and handPose', () => {
  it('picks the awake animal nearest its home', () => {
    const candidates = [
      { index: 0, x: 0, z: 0, homeX: 50, homeZ: 0 },
      { index: 3, x: 0, z: 0, homeX: 10, homeZ: 0 },
    ]
    expect(chooseHint(candidates, 2)).toBe(3)
    expect(chooseHint(candidates, 0)).toBe(-1)
  })

  it('carries only part of the way home, pressing in the middle', () => {
    const out = { x: 0, z: 0, press: 0, opacity: 0 }
    handPose({ x: 0, z: 0 }, { x: 100, z: 0 }, 0.8, out)
    expect(out.x).toBeCloseTo(100 * DEMO_REACH, 3)
    handPose({ x: 0, z: 0 }, { x: 100, z: 0 }, 0.5, out)
    expect(out.press).toBe(1)
    handPose({ x: 0, z: 0 }, { x: 100, z: 0 }, 0, out)
    expect(out.opacity).toBe(0)
  })
})
