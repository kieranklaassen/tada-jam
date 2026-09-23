import { describe, expect, it } from 'vitest'
import { chooseHint, DEMO_AFTER, DEMO_SECONDS, handPose, HintClock, MAX_DEMOS, MAX_PEEKS, PEEK_AFTER, PEEK_EVERY, type PlayroomSummary } from './guidance'

const room = (patch: Partial<PlayroomSummary> = {}): PlayroomSummary => ({
  flying: false,
  tray: [
    { id: 2, cube: false },
    { id: 0, cube: true },
  ],
  loose: [],
  buildAt: { x: 5, y: 1 },
  ...patch,
})

describe('chooseHint', () => {
  it('carries a cube from the tray to where it helps', () => {
    expect(chooseHint(room())).toEqual({ kind: 'fromTray', id: 0, to: { x: 5, y: 1 } })
  })

  it('uses the first tray piece when no cube is left', () => {
    expect(chooseHint(room({ tray: [{ id: 7, cube: false }] }))).toMatchObject({ kind: 'fromTray', id: 7 })
  })

  it('moves the farthest loose piece once the tray is empty', () => {
    const hint = chooseHint(
      room({
        tray: [],
        loose: [
          { id: 3, x: 4.6, y: 0.5 },
          { id: 4, x: -2, y: 0.2 },
          { id: 5, x: -6, y: 0.4 },
        ],
      }),
    )
    expect(hint).toEqual({ kind: 'loose', id: 5, from: { x: -6, y: 0.4 }, to: { x: 5, y: 1 } })
  })

  it('shows nothing while the kite flies or when nothing is left to move', () => {
    expect(chooseHint(room({ flying: true }))).toBeNull()
    expect(chooseHint(room({ tray: [], loose: [{ id: 3, x: 4.6, y: 0.5 }] }))).toBeNull()
  })
})

describe('HintClock', () => {
  it('stays quiet for the first three seconds', () => {
    const clock = new HintClock(0)
    clock.touch(0)
    expect(clock.state(2.9)).toEqual({ glow: 0, demo: null, peek: null })
    expect(clock.state(5).glow).toBeGreaterThan(0)
  })

  it('demonstrates at five seconds, then backs off with growing gaps and stops after four', () => {
    const clock = new HintClock(0)
    clock.touch(0)
    const starts: number[] = []
    let was = false
    for (let t = 0; t < 400; t += 0.05) {
      const on = clock.state(t).demo !== null
      if (on && !was) starts.push(Math.round(t * 10) / 10)
      was = on
    }
    expect(starts).toHaveLength(MAX_DEMOS)
    expect(starts[0]).toBeCloseTo(DEMO_AFTER, 0)
    const gaps = starts.slice(1).map((s, i) => s - starts[i] - DEMO_SECONDS)
    expect(gaps[1]).toBeGreaterThan(gaps[0])
    expect(gaps[2]).toBeGreaterThan(gaps[1])
  })

  it('clears everything on a touch', () => {
    const clock = new HintClock(0)
    clock.touch(0)
    expect(clock.state(6).demo).not.toBeNull()
    clock.touch(6)
    expect(clock.state(6.1)).toEqual({ glow: 0, demo: null, peek: null })
  })

  it('peeks on first open at most three times and never after a touch', () => {
    const clock = new HintClock(0)
    let peeks = 0
    let was = false
    for (let t = 0; t < 60; t += 0.05) {
      const on = clock.state(t).peek !== null
      if (on && !was) peeks++
      was = on
    }
    expect(peeks).toBe(MAX_PEEKS)
    const touched = new HintClock(0)
    touched.touch(0.5)
    expect(touched.state(PEEK_AFTER + 0.2).peek).toBeNull()
    expect(touched.state(PEEK_AFTER + PEEK_EVERY + 0.2).peek).toBeNull()
  })

  it('restarts the idle stretch without ending the first-open peek', () => {
    const clock = new HintClock(0)
    clock.restart(10)
    expect(clock.idle(11)).toBeCloseTo(1)
  })
})

describe('handPose', () => {
  it('fades in on the piece, carries it in an arc, and fades out on the target', () => {
    const from = { x: 100, y: 600 }
    const to = { x: 700, y: 400 }
    expect(handPose(from, to, 0).opacity).toBe(0)
    expect(handPose(from, to, 0.15).at).toEqual(from)
    const mid = handPose(from, to, 0.45)
    expect(mid.carry).toBe(1)
    expect(mid.at.y).toBeLessThan(Math.min(from.y, to.y))
    const end = handPose(from, to, 0.8)
    expect(end.at.x).toBeCloseTo(to.x)
    expect(end.carry).toBe(0)
    expect(handPose(from, to, 1).opacity).toBe(0)
  })
})
