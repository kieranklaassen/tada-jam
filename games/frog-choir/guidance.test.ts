import { describe, expect, it } from 'vitest'
import {
  chooseHint,
  DEMO_SECONDS,
  handPose,
  HintScheduler,
  IDLE_BEFORE_DEMO,
  IDLE_BEFORE_GLOW,
  INVITE_DELAY,
  INVITE_EVERY,
  MAX_DEMOS,
  MAX_INVITES,
  nearestFrog,
  type HandPose,
} from './guidance'
import { PADS, partnerPad } from './layout'
import { defaultPond } from './state'

function demoStarts(scheduler: HintScheduler, from: number, until: number): number[] {
  const starts: number[] = []
  let wasPlaying = false
  for (let t = from; t < until; t += 0.05) {
    const playing = scheduler.update(t).demo !== null
    if (playing && !wasPlaying) starts.push(Math.round((t - from) * 20) / 20)
    wasPlaying = playing
  }
  return starts
}

describe('guidance timing', () => {
  it('glows after a few idle seconds, then demonstrates, backing off and stopping', () => {
    const scheduler = new HintScheduler(0)
    scheduler.touch(0)
    expect(scheduler.update(IDLE_BEFORE_GLOW - 0.1).glow).toBe(0)
    expect(scheduler.update(IDLE_BEFORE_GLOW + 1.5).glow).toBeGreaterThan(0)
    const starts = demoStarts(scheduler, 0, 400)
    expect(starts).toHaveLength(MAX_DEMOS)
    expect(starts[0]).toBeCloseTo(IDLE_BEFORE_DEMO, 1)
    const gaps = starts.slice(1).map((start, i) => start - starts[i] - DEMO_SECONDS)
    expect(gaps[0]).toBeCloseTo(IDLE_BEFORE_DEMO * 2, 0)
    expect(gaps[1]).toBeCloseTo(gaps[0] * 2, 0)
    expect(gaps[2]).toBeCloseTo(gaps[1] * 2, 0)
  })

  it('clears everything on a touch and restarts the idle clock', () => {
    const scheduler = new HintScheduler(0)
    expect(scheduler.update(IDLE_BEFORE_DEMO + 0.5).demo).not.toBeNull()
    scheduler.touch(IDLE_BEFORE_DEMO + 0.6)
    const after = scheduler.update(IDLE_BEFORE_DEMO + 0.7)
    expect(after.demo).toBeNull()
    expect(after.glow).toBe(0)
    expect(scheduler.update(IDLE_BEFORE_DEMO * 2 + 0.7).demo).not.toBeNull()
  })

  it('invites a few times on first open only, never over a demonstration', () => {
    const scheduler = new HintScheduler(0)
    let invites = 0
    let was = false
    for (let t = 0; t < 60; t += 0.05) {
      const timing = scheduler.update(t)
      if (timing.invite !== null && timing.demo !== null) throw new Error('invite over a demo')
      if (timing.invite !== null && !was) invites++
      was = timing.invite !== null
    }
    expect(invites).toBeGreaterThan(0)
    expect(invites).toBeLessThanOrEqual(MAX_INVITES)
    expect(scheduler.update(INVITE_DELAY + 0.1).invite).not.toBeNull()
    scheduler.touch(INVITE_DELAY + 0.2)
    for (let t = INVITE_DELAY + 0.3; t < INVITE_EVERY * 4; t += 0.1) expect(scheduler.update(t).invite).toBeNull()
  })
})

describe('choosing what to show', () => {
  it('taps the frog nearest the child until the child has tapped one', () => {
    const pond = defaultPond()
    const hint = chooseHint({ frogs: pond.frogs, everTapped: false }, 0)!
    expect(hint.kind).toBe('tapFrog')
    expect(hint.frog).toBe(nearestFrog(pond.frogs))
    const nearestZ = Math.max(...pond.frogs.map((pad) => PADS[pad].z))
    expect(PADS[hint.fromPad].z).toBe(nearestZ)
  })

  it('then drags a frog to the empty other pad in its column, rotating between frogs', () => {
    const pond = defaultPond()
    const seen = new Set<number>()
    for (let demo = 0; demo < 5; demo++) {
      const hint = chooseHint({ frogs: pond.frogs, everTapped: true }, demo)!
      expect(hint.kind).toBe('dragFrog')
      expect(hint.toPad).toBe(partnerPad(hint.fromPad).index)
      expect(pond.frogs).not.toContain(hint.toPad)
      seen.add(hint.frog)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('never demonstrates with a lifted frog', () => {
    const hint = chooseHint({ frogs: [null, null, null, null, 7], everTapped: true }, 0)!
    expect(hint.frog).toBe(4)
    expect(chooseHint({ frogs: [null, null, null, null, null], everTapped: false }, 0)).toBeNull()
  })

  it('moves the ghost hand from the frog to the target and lifts it at the end', () => {
    const pond = defaultPond()
    const hint = chooseHint({ frogs: pond.frogs, everTapped: true }, 0)!
    const pose: HandPose = { x: 0, z: 0, press: 0, opacity: 0, carry: false }
    handPose(hint, 0.05, pose)
    expect(pose.x).toBeCloseTo(PADS[hint.fromPad].x)
    expect(pose.carry).toBe(false)
    handPose(hint, 0.5, pose)
    expect(pose.carry).toBe(true)
    expect(pose.press).toBe(1)
    handPose(hint, 0.8, pose)
    expect(pose.x).toBeCloseTo(PADS[hint.toPad!].x)
    expect(handPose(hint, 1, pose).opacity).toBe(0)
  })
})
