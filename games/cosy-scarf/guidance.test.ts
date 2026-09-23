import { describe, expect, it } from 'vitest'
import { chooseHint, DEMO_SECONDS, handPose, HintScheduler, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, MAX_PEEKS, type GuidanceFrame, type HandPose, type LoomSummary } from './guidance'

const loom = (over: Partial<LoomSummary> = {}): LoomSummary => ({ colours: [], balls: 4, canOffer: false, full: false, recipient: true, busy: false, ...over })
const frame = (): GuidanceFrame => ({ demo: -1, glow: 0, peek: -1, idle: 0 })

describe('chooseHint', () => {
  it('shows knitting on an empty loom', () => {
    expect(chooseHint(loom())).toEqual({ kind: 'knit', colour: 0 })
  })

  it('reaches for the colour that carries the pattern on', () => {
    expect(chooseHint(loom({ colours: [0, 2, 0] }))).toEqual({ kind: 'knit', colour: 2 })
  })

  it('shows giving once the scarf is offered and someone is waiting', () => {
    expect(chooseHint(loom({ canOffer: true }))).toEqual({ kind: 'give' })
    expect(chooseHint(loom({ canOffer: true, recipient: false }))).toEqual({ kind: 'knit', colour: 0 })
  })

  it('stays quiet while something is happening or nothing can be done', () => {
    expect(chooseHint(loom({ busy: true }))).toBeNull()
    expect(chooseHint(loom({ full: true, canOffer: true, recipient: false }))).toBeNull()
  })
})

describe('HintScheduler', () => {
  it('glows after 3 s and demonstrates after 5 s of idle', () => {
    const s = new HintScheduler(0)
    s.touch(0)
    expect(s.frame(IDLE_BEFORE_GLOW - 0.1, frame()).glow).toBe(0)
    expect(s.frame(IDLE_BEFORE_GLOW + 1.5, frame()).glow).toBeGreaterThan(0)
    expect(s.frame(IDLE_BEFORE_DEMO - 0.1, frame()).demo).toBe(-1)
    expect(s.frame(IDLE_BEFORE_DEMO + DEMO_SECONDS / 2, frame()).demo).toBeCloseTo(0.5)
  })

  it('backs off with doubling gaps and stops after four demonstrations', () => {
    const s = new HintScheduler(0)
    s.touch(0)
    const starts: number[] = []
    let wasDemo = false
    for (let t = 0; t < 400; t += 0.05) {
      const isDemo = s.frame(t, frame()).demo >= 0
      if (isDemo && !wasDemo) starts.push(Math.round(t * 10) / 10)
      wasDemo = isDemo
    }
    expect(starts).toHaveLength(4)
    const gaps = starts.slice(1).map((start, i) => Math.round(start - starts[i] - DEMO_SECONDS))
    expect(gaps).toEqual([10, 20, 40])
  })

  it('clears everything on any touch', () => {
    const s = new HintScheduler(0)
    s.touch(0)
    expect(s.frame(6, frame()).demo).toBeGreaterThanOrEqual(0)
    s.touch(6)
    const after = s.frame(6.1, frame())
    expect(after.demo).toBe(-1)
    expect(after.glow).toBe(0)
  })

  it('starts the idle clock over while held, without counting as the first touch', () => {
    const s = new HintScheduler(0)
    s.hold(4)
    expect(s.frame(IDLE_BEFORE_DEMO + 1, frame()).demo).toBe(-1)
    expect(s.frame(4 + IDLE_BEFORE_DEMO + 0.1, frame()).demo).toBeGreaterThanOrEqual(0)
    expect(s.touched).toBe(false)
  })

  it('peeks a ball out of the basket a few times on first open only', () => {
    const s = new HintScheduler(0)
    let peeks = 0
    let was = false
    for (let t = 0; t < 60; t += 0.05) {
      const peeking = s.frame(t, frame()).peek >= 0
      if (peeking && !was) peeks++
      was = peeking
    }
    expect(peeks).toBe(MAX_PEEKS)
    const touched = new HintScheduler(0)
    touched.touch(0.5)
    expect(touched.frame(1.5, frame()).peek).toBe(-1)
  })
})

describe('handPose', () => {
  const out: HandPose = { x: 0, y: 0, z: 0, press: 0, opacity: 0 }

  it('presses twice in place for a tap', () => {
    const from = { x: 1, y: 2, z: 3 }
    expect(handPose(out, from, null, 0.32).press).toBeCloseTo(1, 1)
    expect(handPose(out, from, null, 0.47).press).toBeLessThan(0.3)
    expect(handPose(out, from, null, 0.62).press).toBeCloseTo(1, 1)
    expect(out.x).toBe(1)
  })

  it('carries from one place to another for a drag and fades at both ends', () => {
    const from = { x: 0, y: 0, z: 0 }
    const to = { x: 10, y: 0, z: 0 }
    expect(handPose(out, from, to, 0).opacity).toBe(0)
    expect(handPose(out, from, to, 0.5).opacity).toBe(1)
    expect(handPose(out, from, to, 0.75).x).toBeCloseTo(10)
    expect(handPose(out, from, to, 1).opacity).toBe(0)
  })
})
