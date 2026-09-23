import { describe, expect, it } from 'vitest'
import { BLUE, ORANGE, RED, YELLOW } from './colors'
import {
  BECKON_MARGIN,
  chooseHint,
  DEMO_SECONDS,
  GuidanceClock,
  handPose,
  IDLE_BEFORE_DEMO,
  IDLE_BEFORE_GLOW,
  MAX_DEMOS,
  MAX_INVITES,
  QUIET_FADE,
  SETTLE_HOLD,
  type GuidanceTiming,
  type HandPose,
  type MeadowSummary,
} from './guidance'
import { PLOTS, POUCH_SLOTS } from './layout'

const summary = (partial: Partial<MeadowSummary>): MeadowSummary => ({ empty: [], bloomed: [], loose: [], pollen: [], beeHasRoom: true, ...partial })

describe('chooseHint', () => {
  it('shows planting a loose seed first, preferring a mixed one, into the nearest empty molehill', () => {
    const hint = chooseHint(
      summary({
        empty: [0, 2],
        loose: [
          { id: 1, hue: RED, x: 30, z: 10 },
          { id: 2, hue: ORANGE, x: -30, z: 14 },
        ],
      }),
    )
    expect(hint).toMatchObject({ kind: 'plantLoose', seedId: 2, plot: 0 })
    expect(hint?.to).toEqual(PLOTS[0])
  })

  it('then planting a pouch colour that is not already blooming', () => {
    const hint = chooseHint(summary({ empty: [2], bloomed: [{ plot: 0, hue: RED }] }))
    expect(hint).toMatchObject({ kind: 'plantPouch', slot: 1, plot: 2 })
    expect(hint?.from).toEqual(POUCH_SLOTS[1])
  })

  it('with every molehill full, taps a flower the bee has not sipped', () => {
    const hint = chooseHint(
      summary({
        bloomed: [
          { plot: 0, hue: RED },
          { plot: 1, hue: YELLOW },
          { plot: 2, hue: BLUE },
        ],
        pollen: [RED, YELLOW],
      }),
    )
    expect(hint).toMatchObject({ kind: 'callBee', plot: 2, to: null })
  })

  it('shows picking a flower when the grass has no room for the bee to drop a seed', () => {
    const hint = chooseHint(summary({ bloomed: [{ plot: 1, hue: RED }], beeHasRoom: false }))
    expect(hint).toMatchObject({ kind: 'pick', plot: 1 })
    expect(hint?.to).not.toBeNull()
  })

  it('has nothing to show while flowers are still growing', () => {
    expect(chooseHint(summary({}))).toBeNull()
  })
})

describe('GuidanceClock', () => {
  const timing = (): GuidanceTiming => ({ demo: -1, glow: 0, invite: -1, idle: 0, beckon: false })

  it('glows after IDLE_BEFORE_GLOW, demonstrates after IDLE_BEFORE_DEMO, backs off, and stops after MAX_DEMOS', () => {
    const clock = new GuidanceClock(0)
    const out = timing()
    clock.touch(0)
    expect(clock.timing(IDLE_BEFORE_GLOW - 0.1, false, out).glow).toBe(0)
    let glowSeen = false
    for (let t = IDLE_BEFORE_GLOW + 0.5; t < IDLE_BEFORE_DEMO; t += 0.1) glowSeen ||= clock.timing(t, false, out).glow > 0
    expect(glowSeen).toBe(true)
    expect(clock.timing(IDLE_BEFORE_DEMO - 0.05, false, out).demo).toBe(-1)
    expect(clock.timing(IDLE_BEFORE_DEMO + 0.1, false, out).demo).toBeGreaterThanOrEqual(0)

    const starts: number[] = []
    let playing = false
    for (let t = 0; t < 600; t += 0.05) {
      const now = clock.timing(t, false, out).demo >= 0
      if (now && !playing) starts.push(t)
      playing = now
    }
    expect(starts).toHaveLength(MAX_DEMOS)
    const gaps = starts.slice(1).map((start, i) => start - starts[i] - DEMO_SECONDS)
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1] * 1.8)
  })

  it('goes quiet after the last demonstration: the glow fades out and nothing beckons', () => {
    const clock = new GuidanceClock(0)
    const out = timing()
    let lastDemo = 0
    for (let t = 0; t < 600; t += 0.05) if (clock.timing(t, false, out).demo >= 0) lastDemo = t
    expect(clock.timing(lastDemo + 0.2, false, out).glow).toBeGreaterThan(0)
    for (let t = lastDemo + QUIET_FADE + 0.1; t < 900; t += 0.5) {
      clock.timing(t, false, out)
      expect(out.glow).toBe(0)
      expect(out.beckon).toBe(false)
    }
  })

  it('beckons around the glow rising and each demonstration, and lets the bee be between them', () => {
    const clock = new GuidanceClock(0)
    const out = timing()
    expect(clock.timing(IDLE_BEFORE_GLOW - 0.1, false, out).beckon).toBe(false)
    expect(clock.timing(IDLE_BEFORE_GLOW + 0.1, false, out).beckon).toBe(true)
    let demoWithoutBeckon = false
    let restBetween = 0
    for (let t = IDLE_BEFORE_DEMO; t < 200; t += 0.05) {
      clock.timing(t, false, out)
      if (out.demo >= 0 && !out.beckon) demoWithoutBeckon = true
      if (!out.beckon && out.glow > 0) restBetween += 0.05
    }
    expect(demoWithoutBeckon).toBe(false)
    expect(restBetween).toBeGreaterThan(BECKON_MARGIN * 4)
  })

  it('clears everything at once on a touch', () => {
    const clock = new GuidanceClock(0)
    const out = timing()
    clock.timing(IDLE_BEFORE_DEMO + 1, false, out)
    expect(out.demo).toBeGreaterThanOrEqual(0)
    clock.touch(IDLE_BEFORE_DEMO + 1)
    clock.timing(IDLE_BEFORE_DEMO + 1.01, false, out)
    expect(out).toMatchObject({ demo: -1, glow: 0 })
  })

  it('holds hints off while something the child is watching happens', () => {
    const clock = new GuidanceClock(0)
    const out = timing()
    clock.settle(IDLE_BEFORE_DEMO - 0.5)
    expect(clock.timing(IDLE_BEFORE_DEMO - 0.5, false, out)).toMatchObject({ demo: -1, glow: 0 })
    expect(out.idle).toBeLessThan(IDLE_BEFORE_GLOW)
    const mid = new GuidanceClock(0)
    mid.settle(IDLE_BEFORE_DEMO + 1)
    expect(mid.timing(IDLE_BEFORE_DEMO + 1, false, out).demo).toBe(-1)
    expect(mid.timing(IDLE_BEFORE_DEMO + 1 + SETTLE_HOLD + 0.1, false, out).demo).toBeGreaterThanOrEqual(0)
  })

  it('never starts the demonstrations over for things the child did not do, however often they happen', () => {
    const clock = new GuidanceClock(0)
    const out = timing()
    let completed = 0
    let progress = -1
    let settledAt = -Infinity
    for (let t = 0; t < 600; t += 0.05) {
      if (t > IDLE_BEFORE_DEMO && t < 200 && t - settledAt >= 7) {
        clock.settle(t)
        settledAt = t
      }
      const demo = clock.timing(t, false, out).demo
      if (demo >= 0 && progress < 0) expect(t - settledAt).toBeGreaterThanOrEqual(SETTLE_HOLD - 0.06)
      if (demo < 0 && progress > 0.95) completed += 1
      progress = demo
    }
    expect(completed).toBe(MAX_DEMOS)
    expect(out).toMatchObject({ glow: 0, beckon: false })
  })

  it('invites to the pouch a few times on first open, and never after a touch', () => {
    const clock = new GuidanceClock(0)
    const out = timing()
    let rounds = 0
    let inviting = false
    for (let t = 0; t < 120; t += 0.05) {
      const now = clock.timing(t, true, out).invite >= 0
      if (now && !inviting) rounds += 1
      inviting = now
    }
    expect(rounds).toBe(MAX_INVITES)

    const touched = new GuidanceClock(0)
    touched.touch(0.5)
    for (let t = 0; t < 30; t += 0.05) expect(touched.timing(t, true, out).invite).toBe(-1)
    const planted = new GuidanceClock(0)
    for (let t = 0; t < 30; t += 0.05) expect(planted.timing(t, false, out).invite).toBe(-1)
  })
})

describe('handPose', () => {
  it('carries from the seed to the molehill, pressed in the middle, faded at both ends', () => {
    const hint = chooseHint(summary({ empty: [1] }))!
    const pose: HandPose = { x: 0, z: 0, press: 0, opacity: 0, visible: false }
    expect(handPose(hint, 0, pose).visible).toBe(false)
    handPose(hint, 0.2, pose)
    expect(pose.x).toBeCloseTo(hint.from.x)
    handPose(hint, 0.5, pose)
    expect(pose.press).toBe(1)
    handPose(hint, 0.8, pose)
    expect(pose.x).toBeCloseTo(hint.to!.x)
    expect(pose.z).toBeCloseTo(hint.to!.z)
    expect(handPose(hint, 1, pose).visible).toBe(false)
  })

  it('pats twice in place for a tap hint', () => {
    const hint = chooseHint(summary({ bloomed: [{ plot: 2, hue: RED }] }))!
    const pose: HandPose = { x: 0, z: 0, press: 0, opacity: 0, visible: false }
    let pats = 0
    let down = false
    for (let p = 0; p <= 1; p += 0.01) {
      handPose(hint, p, pose)
      expect(pose.x).toBe(PLOTS[2].x)
      const now = pose.press > 0.5
      if (now && !down) pats += 1
      down = now
    }
    expect(pats).toBe(2)
  })
})
