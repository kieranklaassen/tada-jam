import { describe, expect, it } from 'vitest'
import { KINDS } from './blocks'
import { LIFT_SECONDS, NOD_CREAK, NOD_SECONDS, SECOND_KNOCK, SETTLE_SECONDS, settleSeconds, Spring, clamp01, liftPose, liftStretch, settlePose, smooth, type SettlePose } from './motion'

const pose = (): SettlePose => ({ squash: 1, tilt: 0, turn: 0 })

describe('a spring', () => {
  it('overshoots and comes to rest on its target', () => {
    const spring = new Spring(0, 300, 14)
    spring.target = 1
    let highest = 0
    for (let i = 0; i < 480; i++) { spring.step(1 / 120); highest = Math.max(highest, spring.value) }
    expect(highest).toBeGreaterThan(1)
    expect(spring.value).toBeCloseTo(1, 3)
    expect(spring.velocity).toBeCloseTo(0, 2)
  })

  it('snaps without moving on', () => {
    const spring = new Spring(0, 300, 14)
    spring.velocity = 9
    spring.snap(2)
    spring.step(1 / 120)
    expect(spring.value).toBe(2)
  })
})

describe('how a block settles', () => {
  it('is at rest before it lands and once its time is up', () => {
    for (const kind of KINDS) {
      for (const t of [-1, SETTLE_SECONDS[kind], SETTLE_SECONDS[kind] + 0.01, 99]) expect(settlePose(kind, t, pose())).toEqual({ squash: 1, tilt: 0, turn: 0 })
    }
  })

  it('moves in the moment after landing, and comes to rest without a snap', () => {
    for (const kind of KINDS) {
      const early = settlePose(kind, 0.02, pose())
      expect(Math.abs(early.squash - 1) + Math.abs(early.tilt) + Math.abs(early.turn)).toBeGreaterThan(0.01)
      const late = settlePose(kind, SETTLE_SECONDS[kind] - 0.004, pose())
      expect(Math.abs(late.squash - 1)).toBeLessThan(0.005)
      expect(Math.abs(late.tilt)).toBeLessThan(0.005)
      expect(Math.abs(late.turn)).toBeLessThan(0.01)
    }
  })

  it('stays within what a block of wood can do', () => {
    for (const kind of KINDS) for (let t = 0; t < 1.2; t += 1 / 120) {
      const at = settlePose(kind, t, pose())
      expect(at.squash).toBeGreaterThan(0.75)
      expect(at.squash).toBeLessThan(1.25)
      expect(Math.abs(at.tilt)).toBeLessThan(0.2)
    }
  })

  it('is its own for every kind: no two kinds share a landing', () => {
    const trace = (kind: (typeof KINDS)[number]): string => {
      const out: string[] = []
      for (let t = 0.01; t < 0.34; t += 0.03) { const at = settlePose(kind, t, pose()); out.push(`${at.squash.toFixed(3)},${at.tilt.toFixed(3)},${at.turn.toFixed(3)}`) }
      return out.join(' ')
    }
    const traces = KINDS.map(trace)
    expect(new Set(traces).size).toBe(KINDS.length)
    // And not by a hair: each pair differs clearly somewhere.
    for (let a = 0; a < KINDS.length; a++) for (let b = a + 1; b < KINDS.length; b++) {
      let apart = 0
      for (let t = 0.01; t < 0.34; t += 0.01) {
        const one = settlePose(KINDS[a], t, pose()), two = settlePose(KINDS[b], t, pose())
        apart = Math.max(apart, Math.abs(one.squash - two.squash) + Math.abs(one.tilt - two.tilt) + Math.abs(one.turn - two.turn))
      }
      expect(apart, `${KINDS[a]} and ${KINDS[b]}`).toBeGreaterThan(0.04)
    }
  })

  it('has its second knock inside its settling', () => {
    for (const kind of KINDS) {
      const second = SECOND_KNOCK[kind]
      if (second !== null) expect(second).toBeLessThan(SETTLE_SECONDS[kind])
    }
  })
})

describe('small helpers', () => {
  it('stretch a block as it comes up and let it go', () => {
    expect(liftStretch(0)).toBeCloseTo(1)
    expect(liftStretch(0.11)).toBeGreaterThan(1.1)
    expect(liftStretch(0.22)).toBeCloseTo(1)
    expect(liftStretch(99)).toBeCloseTo(1)
  })

  it('clamp and ease', () => {
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(smooth(0)).toBe(0)
    expect(smooth(0.5)).toBe(0.5)
    expect(smooth(7)).toBe(1)
  })
})

describe('a block coming up into the hand', () => {
  const pose = (): SettlePose => ({ squash: 1, tilt: 0, turn: 0 })
  it('comes up its own way for each kind but the plain cube, and is at rest before and after', () => {
    const traces = KINDS.map((kind) => {
      const out: string[] = []
      for (let t = 0.02; t < LIFT_SECONDS; t += 0.04) { const at = liftPose(kind, t, pose()); out.push(`${at.squash.toFixed(3)},${at.tilt.toFixed(3)},${at.turn.toFixed(3)}`) }
      return out.join(' ')
    })
    expect(new Set(traces).size).toBe(KINDS.length)
    for (const kind of KINDS) {
      for (const t of [-1, LIFT_SECONDS, 99]) expect(liftPose(kind, t, pose())).toEqual({ squash: 1, tilt: 0, turn: 0 })
      // Nothing snaps: it ends where rest is.
      const late = liftPose(kind, LIFT_SECONDS - 0.002, pose())
      expect(Math.abs(late.squash - 1)).toBeLessThan(0.02)
      expect(Math.abs(late.tilt)).toBeLessThan(0.02)
      expect(Math.abs(late.turn)).toBeLessThan(0.02)
    }
    expect(liftPose('cube', 0.1, pose())).toEqual({ squash: 1, tilt: 0, turn: 0 })
  })
})

describe('a slope set on a block', () => {
  const pose: SettlePose = { squash: 1, tilt: 0, turn: 0 }
  it('nods: its toe comes up and down three times, each smaller, never below where it rests, for longer than on the rug', () => {
    expect(settleSeconds('slope', true)).toBe(NOD_SECONDS)
    expect(settleSeconds('slope', false)).toBe(SETTLE_SECONDS.slope)
    for (const kind of KINDS) if (kind !== 'slope') expect(settleSeconds(kind, true)).toBe(SETTLE_SECONDS[kind])
    const second = SECOND_KNOCK.slope!
    const tilts: number[] = []
    for (let t = second; t < NOD_SECONDS; t += 1 / 240) tilts.push(settlePose('slope', t, pose, true).tilt)
    // The toe is up, the way it is as the heel lands: never the other way, which would be into what is under it.
    const heel = settlePose('slope', second / 2, pose, true).tilt
    expect(heel).toBeLessThan(0)
    for (const tilt of tilts) expect(tilt).toBeLessThanOrEqual(1e-9)
    const peaks: number[] = []
    for (let i = 1; i + 1 < tilts.length; i++) if (tilts[i] < tilts[i - 1] && tilts[i] <= tilts[i + 1] && tilts[i] < -0.002) peaks.push(-tilts[i])
    expect(peaks.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]).toBeLessThan(peaks[i - 1])
    // Larger than the shiver it has on the rug.
    expect(peaks[0]).toBeGreaterThan(0.03)
    expect(settlePose('slope', NOD_SECONDS, pose, true).tilt).toBe(0)
    // On the rug it is at rest long before, and nothing nods.
    expect(settlePose('slope', 0.5, pose, false).tilt).toBe(0)
    expect(Math.abs(settlePose('slope', 0.5, pose, true).tilt)).toBeGreaterThan(0.001)
    // The creak comes as the toe comes up the first time.
    expect(NOD_CREAK).toBeGreaterThan(second)
    expect(NOD_CREAK).toBeLessThan(second + Math.PI / 11)
  })
})
