// template: cartridge/guidance.test.ts v2
import { describe, expect, it } from 'vitest'
import { AttendedClock } from './attention'
import { TAP_PRESSES } from './config'
import { DEMO_SECONDS, GLOW_FADE, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder, MAX_DEMOS, handPose, type HandPose } from './guidance'

function demoStarts(ladder: IdleLadder, until: number): number[] {
  const starts: number[] = []
  let wasPlaying = false
  for (let t = 0; t < until; t += 0.05) {
    const playing = ladder.update(t).demo !== null
    if (playing && !wasPlaying) starts.push(Math.round(t * 20) / 20)
    wasPlaying = playing
  }
  return starts
}

describe('the idle ladder', () => {
  it('shows what can be touched first, and one move only after that', () => {
    const ladder = new IdleLadder(0)
    expect(ladder.update(IDLE_BEFORE_GLOW - 0.1)).toMatchObject({ glow: 0, demo: null })
    const glowing = ladder.update(IDLE_BEFORE_DEMO - 0.1)
    expect(glowing.glow).toBeGreaterThan(0)
    expect(glowing.demo).toBeNull()
    const showing = ladder.update(IDLE_BEFORE_DEMO + DEMO_SECONDS / 2)
    expect(showing.demo).toBeCloseTo(0.5)
    expect(showing.demoIndex).toBe(0)
  })

  it('shows the move a few times, further and further apart, and then goes quiet', () => {
    const ladder = new IdleLadder(0)
    const starts = demoStarts(ladder, 600)
    expect(starts).toHaveLength(MAX_DEMOS)
    expect(starts[0]).toBeCloseTo(IDLE_BEFORE_DEMO, 1)
    const gaps = starts.slice(1).map((start, i) => start - starts[i] - DEMO_SECONDS)
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1] * 1.5)
    const lastEnd = starts[starts.length - 1] + DEMO_SECONDS
    expect(ladder.update(lastEnd + GLOW_FADE + 0.1)).toMatchObject({ glow: 0, demo: null })
    expect(ladder.update(100_000)).toMatchObject({ glow: 0, demo: null })
  })

  it('is reset by any touch, from any rung', () => {
    const ladder = new IdleLadder(0)
    expect(ladder.update(IDLE_BEFORE_DEMO + 0.5).demo).not.toBeNull()
    ladder.touch(IDLE_BEFORE_DEMO + 0.6)
    expect(ladder.update(IDLE_BEFORE_DEMO + 0.7)).toMatchObject({ glow: 0, demo: null, demoIndex: -1 })
    expect(ladder.update(IDLE_BEFORE_DEMO * 2 + 0.7).demo).not.toBeNull()
  })

  it('runs on attended time: a game put away for a minute is no further up the ladder', () => {
    const ladder = new IdleLadder(0)
    const clock = new AttendedClock()
    clock.advance(0)
    for (let ms = 100; ms <= 1000; ms += 100) clock.advance(ms)
    clock.rest()
    clock.advance(61_000)
    expect(clock.seconds).toBeCloseTo(1)
    expect(ladder.update(clock.seconds)).toMatchObject({ glow: 0, demo: null })
  })
})

describe('the ghost hand', () => {
  const pose: HandPose = { travel: 0, press: 0, opacity: 0 }

  /** How many times the hand goes down over one demonstration of a tap. */
  function pressesShown(presses?: 1 | 2): number {
    let count = 0
    let down = false
    for (let i = 0; i <= 200; i++) {
      const pressed = handPose(i / 200, false, pose, presses).press > 0.5
      if (pressed && !down) count += 1
      down = pressed
    }
    return count
  }

  it.each([1, 2] as const)('fades in, presses, and fades out; a tap of %i stays where it is', (presses) => {
    expect(handPose(0, false, pose, presses)).toMatchObject({ press: 0, opacity: 0 })
    const at = presses === 1 ? 0.43 : 0.28
    expect(handPose(at, false, pose, presses)).toMatchObject({ travel: 0, opacity: 1 })
    expect(handPose(at, false, pose, presses).press).toBeCloseTo(1)
    // The hand is up again before it fades.
    expect(handPose(0.8, false, pose, presses)).toMatchObject({ travel: 0, opacity: 1 })
    expect(handPose(0.8, false, pose, presses).press).toBeCloseTo(0)
    expect(handPose(1, false, pose, presses).opacity).toBe(0)
  })

  it('shows a tap as two presses with a lift between them, or as one press for a band that starts below 4', () => {
    expect(pressesShown(2)).toBe(2)
    expect(handPose(0.43, false, pose, 2).press).toBeCloseTo(0)
    expect(pressesShown(1)).toBe(1)
    // Left to itself it shows what config.ts gives the game's band.
    expect(pressesShown()).toBe(TAP_PRESSES)
  })

  it('carries a drag from its start to its end while pressed', () => {
    expect(handPose(0.1, true, pose).travel).toBe(0)
    expect(handPose(0.5, true, pose)).toMatchObject({ press: 1 })
    expect(handPose(0.5, true, pose).travel).toBeGreaterThan(0.2)
    expect(handPose(0.9, true, pose)).toMatchObject({ travel: 1, press: 0 })
  })
})
