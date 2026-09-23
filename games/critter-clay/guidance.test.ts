import { describe, expect, it } from 'vitest'
import {
  chooseHint,
  DEMO_SECONDS,
  FIRST_INVITE_DELAY,
  friendsCheer,
  handPose,
  HintScheduler,
  IDLE_BEFORE_DEMO,
  IDLE_BEFORE_GLOW,
  INVITE_EVERY,
  MAX_DEMOS_PER_IDLE,
  MAX_INVITES,
  partToShow,
  type GuidanceTiming,
  type HandPose,
  type WorkshopSummary,
} from './guidance'
import { TURNTABLE } from './layout'
import type { Part, PartKind } from './parts'

const parts = (...kinds: PartKind[]): Part[] => kinds.map((kind) => ({ kind, hue: 1 }))
const timing = (): GuidanceTiming => ({ demo: null, glow: 0, invite: null })
const hand = (): HandPose => ({ x: 0, z: 0, height: 0, press: 0, opacity: 0, carry: false })

describe('chooseHint', () => {
  const summary = (sleeper: Part[] | null, awake: WorkshopSummary['awake'] = [], childAge: number | null = 4): WorkshopSummary => ({
    sleeper: sleeper ? { parts: sleeper } : null,
    awake,
    childAge,
  })

  it('shows pressing legs onto a blank lump first', () => {
    expect(chooseHint(summary([]), TURNTABLE)).toEqual({ kind: 'givePart', part: 'legStub' })
    expect(chooseHint(summary(parts('legStub')), TURNTABLE)).toEqual({ kind: 'givePart', part: 'eye' })
  })

  it('shows older children a long leg and a head, which suggest designing', () => {
    expect(partToShow([], 7)).toBe('legLong')
    expect(partToShow(parts('legLong', 'eye'), 7)).toBe('head')
    expect(partToShow(parts('legStub', 'eye'), 4)).toBe('tailCurl')
  })

  it('shows tapping the nose once the lump has a couple of parts', () => {
    expect(chooseHint(summary(parts('legStub', 'eye')), TURNTABLE)).toEqual({ kind: 'tapNose' })
  })

  it('with the turntable empty, shows carrying the nearest critter back to it', () => {
    const awake = [
      { id: 3, x: 20, z: 20 },
      { id: 5, x: -12, z: 20 },
    ]
    expect(chooseHint(summary(null, awake), TURNTABLE)).toEqual({ kind: 'carryToTurntable', critterId: 5 })
    expect(chooseHint(summary(null, []), TURNTABLE)).toBeNull()
  })

  it('friends cheer only while idle and the sleeper is ready to wake', () => {
    const awake = [{ id: 2, x: 0, z: 20 }]
    expect(friendsCheer(summary(parts('legStub', 'eye'), awake), 0.5)).toBe(true)
    expect(friendsCheer(summary(parts('legStub', 'eye'), awake), 0)).toBe(false)
    expect(friendsCheer(summary(parts('legStub'), awake), 0.5)).toBe(false)
    expect(friendsCheer(summary(parts('legStub', 'eye'), []), 0.5)).toBe(false)
  })
})

describe('HintScheduler', () => {
  it('shows nothing while the child is active', () => {
    const scheduler = new HintScheduler(0)
    const out = timing()
    for (let t = 0; t < 30; t += 1) {
      scheduler.touch(t)
      expect(scheduler.timing(t + 0.9, out)).toEqual({ demo: null, glow: 0, invite: null })
    }
  })

  it('glows after 3 s idle and demonstrates after 5 s', () => {
    const scheduler = new HintScheduler(0)
    scheduler.touch(0)
    const out = timing()
    expect(scheduler.timing(IDLE_BEFORE_GLOW - 0.1, out).glow).toBe(0)
    expect(scheduler.timing(IDLE_BEFORE_GLOW + 2, out).glow).toBeGreaterThan(0)
    expect(scheduler.timing(IDLE_BEFORE_DEMO - 0.1, out).demo).toBeNull()
    expect(scheduler.timing(IDLE_BEFORE_DEMO + DEMO_SECONDS / 2, out).demo).toBeCloseTo(0.5)
  })

  it('fades everything the moment the child touches', () => {
    const scheduler = new HintScheduler(0)
    scheduler.touch(0)
    const during = IDLE_BEFORE_DEMO + 1
    expect(scheduler.timing(during, timing()).demo).not.toBeNull()
    scheduler.touch(during)
    expect(scheduler.timing(during + 0.01, timing())).toEqual({ demo: null, glow: 0, invite: null })
  })

  it('backs off 10, 20, 40 s and stops after four demonstrations', () => {
    const scheduler = new HintScheduler(0)
    scheduler.touch(0)
    const starts: number[] = []
    const out = timing()
    let wasShowing = false
    for (let t = 0; t < 600; t += 0.05) {
      const showing = scheduler.timing(t, out).demo !== null
      if (showing && !wasShowing) starts.push(t)
      wasShowing = showing
    }
    expect(starts).toHaveLength(MAX_DEMOS_PER_IDLE)
    const gaps = starts.slice(1).map((t, i) => t - starts[i] - DEMO_SECONDS)
    expect(gaps[0]).toBeCloseTo(10, 0)
    expect(gaps[1]).toBeCloseTo(20, 0)
    expect(gaps[2]).toBeCloseTo(40, 0)
  })

  it('invites on first open a few times, until the first touch', () => {
    const scheduler = new HintScheduler(0)
    const out = timing()
    expect(scheduler.timing(FIRST_INVITE_DELAY - 0.1, out).invite).toBeNull()
    expect(scheduler.timing(FIRST_INVITE_DELAY + 0.4, out).invite).not.toBeNull()
    expect(scheduler.timing(FIRST_INVITE_DELAY + INVITE_EVERY * MAX_INVITES + 0.4, out).invite).toBeNull()
    scheduler.touch(2)
    expect(scheduler.touched).toBe(true)
    expect(scheduler.timing(FIRST_INVITE_DELAY + INVITE_EVERY + 0.4, out).invite).toBeNull()
  })
})

describe('handPose', () => {
  const from = { x: 40, z: 20 }
  const to = { x: -10, z: 1 }

  it('fades in, presses, carries from the tray to the lump, and fades out', () => {
    const out = hand()
    expect(handPose(from, to, 0, out).opacity).toBe(0)
    expect(handPose(from, to, 0.2, out).x).toBe(from.x)
    expect(handPose(from, to, 0.5, out).press).toBe(1)
    expect(out.carry).toBe(true)
    expect(handPose(from, to, 0.8, out).x).toBeCloseTo(to.x)
    expect(handPose(from, to, 1, out).opacity).toBe(0)
  })

  it('taps twice in place for the nose', () => {
    const out = hand()
    const presses = [0.31, 0.45, 0.59].map((p) => handPose(from, null, p, out).press)
    expect(presses[0]).toBeGreaterThan(0.9)
    expect(presses[1]).toBeLessThan(0.3)
    expect(presses[2]).toBeGreaterThan(0.9)
    expect(out.x).toBe(from.x)
    expect(out.carry).toBe(false)
  })
})
