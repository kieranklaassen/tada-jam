import { describe, expect, it } from 'vitest'
import {
  chooseHint,
  DEMO_SECONDS,
  FIRST_PEEK_DELAY,
  guestsShouldReach,
  handPose,
  HintScheduler,
  IDLE_BEFORE_GLOW,
  IDLE_BEFORE_HINT,
  MAX_DEMOS_PER_IDLE,
  MAX_PEEKS,
  PEEK_EVERY,
  type TableSummary,
} from './guidance'
import { BAG, FEEDING, SCALE } from './layout'

const base: TableSummary = {
  liveMat: 'feeding',
  bag: 40,
  loose: [],
  panWeights: [0, 0],
  bowl: [],
  plates: [0, 0, 0, 0, 0],
  seats: [false, true, false, false, true],
  shareComplete: false,
  leftover: false,
  knife: FEEDING.knifeRest,
  shelf: { x: 1515, y: 155 },
  visitors: 0,
}

describe('chooseHint', () => {
  it('on Knock-Knock, shows knocking on the door while nobody is out', () => {
    const hint = chooseHint({ ...base, liveMat: 'door' })!
    expect(hint.kind).toBe('knock')
    expect(hint.to).toBeNull()
    expect(chooseHint({ ...base, liveMat: 'door', visitors: 3 })?.kind).toBe('swapMat')
  })

  it('shows tapping the bag on an empty table', () => {
    const hint = chooseHint(base)!
    expect(hint.kind).toBe('tapBag')
    expect(Math.hypot(hint.from.x - BAG.x, hint.from.y - BAG.y)).toBeLessThan(BAG.r)
  })

  it('on the scale, moves the nearest loose stone to the lighter pan', () => {
    const hint = chooseHint({
      ...base,
      liveMat: 'scale',
      bag: 0,
      loose: [
        { id: 1, x: 300, y: 800 },
        { id: 2, x: 1100, y: 800 },
      ],
      panWeights: [8, 4],
    })!
    expect(hint.kind).toBe('toPan')
    expect(hint.to).toEqual(SCALE.pans[1])
    expect(hint.stoneIds).toEqual([2])
  })

  it('on the scale with nothing loose, pulls from the bag to a pan', () => {
    const hint = chooseHint({ ...base, liveMat: 'scale', bag: 8, panWeights: [4, 0] })!
    expect(hint.kind).toBe('toPan')
    expect(hint.to).toEqual(SCALE.pans[1])
  })

  it('deals from the bowl while a round is possible', () => {
    const hint = chooseHint({ ...base, bowl: [{ id: 7, x: 780, y: 470 }] })!
    expect(hint).toMatchObject({ kind: 'dealFromBowl', stoneIds: [7], to: null })
  })

  it('hands a loose stone to the guest with the emptiest plate', () => {
    const hint = chooseHint({ ...base, loose: [{ id: 3, x: 400, y: 800 }], plates: [0, 4, 0, 0, 0] })!
    expect(hint.kind).toBe('toGuest')
    expect(hint.to).toEqual(FEEDING.seats[4].plate)
  })

  it('shows the knife on a leftover', () => {
    const hint = chooseHint({ ...base, bag: 0, bowl: [{ id: 9, x: 780, y: 470 }], plates: [0, 8, 0, 0, 8], shareComplete: true, leftover: true })!
    expect(hint).toMatchObject({ kind: 'useKnife', from: FEEDING.knifeRest, stoneIds: [9] })
  })

  it('suggests another mat when the share is done', () => {
    const hint = chooseHint({ ...base, bag: 0, plates: [0, 8, 0, 0, 8], shareComplete: true })!
    expect(hint.kind).toBe('swapMat')
  })
})

describe('HintScheduler', () => {
  it('shows nothing while the child is active', () => {
    const scheduler = new HintScheduler(0)
    for (let t = 0; t < 30; t += 1) {
      scheduler.touch(t)
      expect(scheduler.state(t + 0.9, false)).toEqual({ demo: null, glow: 0, peek: null })
    }
  })

  it('glows after a short idle and demonstrates after a longer one', () => {
    const scheduler = new HintScheduler(0)
    scheduler.touch(0)
    expect(scheduler.state(IDLE_BEFORE_GLOW - 0.1, false).glow).toBe(0)
    expect(scheduler.state(IDLE_BEFORE_GLOW + 2, false).glow).toBeGreaterThan(0)
    expect(scheduler.state(IDLE_BEFORE_HINT - 0.1, false).demo).toBeNull()
    expect(scheduler.state(IDLE_BEFORE_HINT + DEMO_SECONDS / 2, false).demo).toBeCloseTo(0.5)
  })

  it('fades everything the moment the child touches', () => {
    const scheduler = new HintScheduler(0)
    scheduler.touch(0)
    const during = IDLE_BEFORE_HINT + 1
    expect(scheduler.state(during, false).demo).not.toBeNull()
    scheduler.touch(during)
    expect(scheduler.state(during + 0.01, false)).toEqual({ demo: null, glow: 0, peek: null })
  })

  it('backs off and then goes quiet instead of nagging', () => {
    const scheduler = new HintScheduler(0)
    scheduler.touch(0)
    const starts: number[] = []
    let wasShowing = false
    for (let t = 0; t < 600; t += 0.05) {
      const showing = scheduler.state(t, false).demo !== null
      if (showing && !wasShowing) starts.push(t)
      wasShowing = showing
    }
    expect(starts).toHaveLength(MAX_DEMOS_PER_IDLE)
    const gaps = starts.slice(1).map((t, i) => t - starts[i])
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1])
  })

  it('wiggles the bag on first open, a few times, until the first touch', () => {
    const scheduler = new HintScheduler(0)
    expect(scheduler.state(FIRST_PEEK_DELAY - 0.1, true).peek).toBeNull()
    expect(scheduler.state(FIRST_PEEK_DELAY + 0.4, true).peek).not.toBeNull()
    expect(scheduler.state(FIRST_PEEK_DELAY + PEEK_EVERY * MAX_PEEKS + 0.4, true).peek).toBeNull()
    expect(scheduler.state(FIRST_PEEK_DELAY + 0.4, false).peek).toBeNull()
    scheduler.touch(2)
    expect(scheduler.state(FIRST_PEEK_DELAY + PEEK_EVERY + 0.4, true).peek).toBeNull()
  })
})

describe('handPose', () => {
  const drag = { kind: 'toPan' as const, from: { x: 100, y: 100 }, to: { x: 500, y: 300 }, stoneIds: [1] }

  it('fades in, travels from the stone to the target, and fades out', () => {
    expect(handPose(drag, 0).opacity).toBe(0)
    expect(handPose(drag, 0.1).at).toEqual(drag.from)
    expect(handPose(drag, 0.5).press).toBe(1)
    expect(handPose(drag, 0.8).at.x).toBeCloseTo(500)
    expect(handPose(drag, 1).opacity).toBe(0)
  })

  it('taps twice in place for a tap hint', () => {
    const tap = { kind: 'tapBag' as const, from: { x: 180, y: 800 }, to: null, stoneIds: [] }
    const presses = [0.31, 0.46, 0.61].map((p) => handPose(tap, p).press)
    expect(presses[0]).toBeGreaterThan(0.9)
    expect(presses[1]).toBeLessThan(0.3)
    expect(presses[2]).toBeGreaterThan(0.9)
    expect(handPose(tap, 0.5).at).toEqual(tap.from)
  })
})

describe('guestsShouldReach', () => {
  it('reaches only while idle on Fair Feeding with something to share', () => {
    expect(guestsShouldReach({ ...base, bowl: [{ id: 1, x: 780, y: 470 }] }, 0.5)).toBe(true)
    expect(guestsShouldReach({ ...base, bowl: [{ id: 1, x: 780, y: 470 }] }, 0)).toBe(false)
    expect(guestsShouldReach({ ...base, liveMat: 'scale' }, 0.5)).toBe(false)
    expect(guestsShouldReach({ ...base, shareComplete: true }, 0.5)).toBe(false)
  })
})
