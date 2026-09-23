import { describe, expect, it } from 'vitest'
import { TAP_TURN } from './coverage'
import { blankDemoPose, DEMO_GAPS, DEMO_SECONDS, demoPose, GRIP_HEIGHT, HintScheduler, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, INVITE_EVERY, MAX_DEMOS, MAX_INVITES, type Demo, type GuidanceState } from './guidance'
import { PIN_HEIGHT } from './projection'

function blank(): GuidanceState {
  return { demo: null, demoNumber: -1, glow: 0, invite: null }
}

function demoStarts(scheduler: HintScheduler, from: number, to: number): number[] {
  const starts: number[] = []
  const out = blank()
  let playing = -1
  for (let t = from; t < to; t += 0.05) {
    scheduler.state(t, out)
    if (out.demoNumber !== playing && out.demoNumber >= 0) starts.push(Math.round((t - from) * 10) / 10)
    playing = out.demoNumber
  }
  return starts
}

describe('guidance', () => {
  it('the shapes start to breathe after a short idle, not before', () => {
    const scheduler = new HintScheduler(0, true)
    const out = blank()
    expect(scheduler.state(IDLE_BEFORE_GLOW - 0.1, out).glow).toBe(0)
    let peak = 0
    for (let t = IDLE_BEFORE_GLOW + 1.2; t < IDLE_BEFORE_GLOW + 4; t += 0.1) peak = Math.max(peak, scheduler.state(t, out).glow)
    expect(peak).toBeGreaterThan(0.9)
  })

  it('demonstrations come after 5 s, then back off, and stop after four', () => {
    const scheduler = new HintScheduler(0, true)
    const starts = demoStarts(scheduler, 0, 400)
    expect(starts).toHaveLength(MAX_DEMOS)
    expect(starts[0]).toBeCloseTo(IDLE_BEFORE_DEMO, 0)
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeCloseTo(DEMO_SECONDS + DEMO_GAPS[i - 1], 0)
  })

  it('a touch clears everything at once and restarts the idle clock', () => {
    const scheduler = new HintScheduler(0, true)
    const out = blank()
    expect(scheduler.state(IDLE_BEFORE_DEMO + 1, out).demo).not.toBeNull()
    scheduler.touch(IDLE_BEFORE_DEMO + 1)
    expect(scheduler.state(IDLE_BEFORE_DEMO + 1.05, out).demo).toBeNull()
    expect(out.glow).toBe(0)
    expect(demoStarts(scheduler, IDLE_BEFORE_DEMO + 1, IDLE_BEFORE_DEMO + 30)[0]).toBeCloseTo(IDLE_BEFORE_DEMO, 0)
  })

  it('the first-open invite plays a few times before any touch, then never again', () => {
    const scheduler = new HintScheduler(0, false)
    const out = blank()
    let invites = 0
    let inInvite = false
    for (let t = 0; t < INVITE_EVERY * (MAX_INVITES + 3); t += 0.05) {
      const playing = scheduler.state(t, out).invite !== null
      if (playing && !inInvite) invites++
      inInvite = playing
    }
    expect(invites).toBe(MAX_INVITES)
    const touched = new HintScheduler(0, false)
    touched.touch(0.5)
    for (let t = 0.5; t < 30; t += 0.1) expect(touched.state(t, out).invite).toBeNull()
    const returning = new HintScheduler(0, true)
    for (let t = 0; t < 30; t += 0.1) expect(returning.state(t, out).invite).toBeNull()
  })

  it('the ghost hand taps once per turn, then carries the see-through shape to its spot', () => {
    for (const taps of [0, 1, 2]) {
      const demo: Demo = { index: 2, from: { x: -20, z: 40, angle: 0, yaw: 0, lift: 0 }, to: { x: 4, z: 18, angle: taps * TAP_TURN, yaw: 0, lift: 0 }, turn: taps * TAP_TURN }
      const pose = blankDemoPose()
      let presses = 0
      let pressed = false
      for (let p = 0; p <= 1; p += 0.005) {
        demoPose(demo, p, pose)
        const down = pose.press > 0.5
        if (down && !pressed) presses++
        pressed = down
      }
      // Each tap is a press, then one more press to carry.
      expect(presses, `${taps} taps`).toBe(taps + 1)
      demoPose(demo, 0, pose)
      expect(pose.opacity).toBe(0)
      expect(pose.ghostOpacity).toBe(0)
      demoPose(demo, 0.85, pose)
      expect(pose.ghost.x).toBeCloseTo(4, 3)
      expect(pose.ghost.z).toBeCloseTo(18, 3)
      expect(pose.ghost.angle).toBeCloseTo(taps * TAP_TURN, 3)
      expect(pose.hand.x).toBe(pose.ghost.x)
      demoPose(demo, 1, pose)
      expect(pose.opacity).toBe(0)
    }
  })

  it('the ghost hand reaches up from below its grip, never down over the screen', () => {
    const demo: Demo = { index: 0, from: { x: -20, z: 40, angle: 0, yaw: 0, lift: 0 }, to: { x: 4, z: 18, angle: TAP_TURN, yaw: 0, lift: 0 }, turn: TAP_TURN }
    const pose = blankDemoPose()
    for (let p = 0; p <= 1; p += 0.01) {
      demoPose(demo, p, pose)
      const grip = PIN_HEIGHT + GRIP_HEIGHT + pose.ghost.lift
      expect(pose.hand.y, `at ${p.toFixed(2)}`).toBeLessThanOrEqual(grip + 1e-9)
      if (pose.press > 0.99) expect(pose.hand.y, `pressed at ${p.toFixed(2)}`).toBeCloseTo(grip, 1)
    }
  })
})
