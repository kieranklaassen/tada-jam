import { describe, expect, it } from 'vitest'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import { MOVES, SLIDE, emptyHint, hintFor, loadShown } from './guide'
import { LOADS } from './lapState'
import { LANE_WIDTH } from './trail'

describe('the idle guidance', () => {
  const ladderAt = (seconds: number) => {
    const ladder = new IdleLadder(0)
    return ladder.update(seconds)
  }

  it('shows nothing over a fox that is busy, whatever the ladder says', () => {
    const hint = hintFor(ladderAt(IDLE_BEFORE_DEMO + 1), false, 'run', null, emptyHint())
    expect(hint.glow).toBe(0)
    expect(hint.hand).toBeNull()
    expect(hint.mime).toBe(0)
  })

  it('glows first and brings the hand afterwards, the same for every want', () => {
    for (const wants of ['load', 'run', 'next'] as const) {
      const early = hintFor(ladderAt(IDLE_BEFORE_GLOW + 1.5), true, wants, null, emptyHint())
      expect(early.glow, wants).toBeGreaterThan(0)
      expect(early.hand, wants).toBeNull()
      const later = hintFor(ladderAt(IDLE_BEFORE_DEMO + DEMO_SECONDS * 0.5), true, wants, null, emptyHint())
      expect(later.hand, wants).not.toBeNull()
      expect(later.wants).toBe(wants)
    }
  })

  it('holds the hand down on the trail, and the fox jogs on the spot as hard as it presses', () => {
    let pressed = 0
    for (let t = 0; t < DEMO_SECONDS; t += 0.05) {
      const hint = hintFor(ladderAt(IDLE_BEFORE_DEMO + t), true, 'run', null, emptyHint())
      if (!hint.hand) continue
      expect(hint.mime).toBe(hint.hand.press)
      pressed = Math.max(pressed, hint.mime)
    }
    expect(pressed).toBeGreaterThan(0.9)
    // At the shelf and after the hand-over the hand taps, and the fox does not jog.
    for (const wants of ['load', 'next'] as const) {
      for (let t = 0; t < DEMO_SECONDS; t += 0.05) expect(hintFor(ladderAt(IDLE_BEFORE_DEMO + t), true, wants, null, emptyHint()).mime).toBe(0)
    }
  })

  it('takes turns on the trail at the four things a finger does there: stay down, slide a lane, flick up, flick down', () => {
    // Half a lane, made quickly: steer.ts reads a third of a lane as one lane and two thirds as two.
    expect(SLIDE).toBe(LANE_WIDTH / 2)
    expect(MOVES).toEqual(['hold', 'slide', 'up', 'down'])
    for (let turn = 0; turn < 9; turn++) {
      let slide = 0, up = 0, down = 0
      for (let t = 0; t < DEMO_SECONDS; t += 0.05) {
        const guidance = ladderAt(IDLE_BEFORE_DEMO + t)
        const hint = hintFor(guidance, true, 'run', null, emptyHint(), turn)
        slide = Math.max(slide, hint.slide)
        up = Math.max(up, hint.flick)
        down = Math.max(down, -hint.flick)
        // The finger is down for as long as the hand is on its way: no slide or flick is made with the hand in the air.
        const going = Math.max(hint.slide / SLIDE, Math.abs(hint.flick))
        if (going > 0.02 && going < 0.98) expect(hint.hand!.press).toBeGreaterThan(0.9)
        // At the shelf and after the hand-over the hand only taps.
        for (const wants of ['load', 'next'] as const) {
          const other = hintFor(guidance, true, wants, null, emptyHint(), turn)
          expect(other.slide).toBe(0)
          expect(other.flick).toBe(0)
        }
      }
      const move = MOVES[turn % 4]
      expect(slide > SLIDE * 0.8, `turn ${turn} slides`).toBe(move === 'slide')
      expect(up > 0.9, `turn ${turn} flicks up`).toBe(move === 'up')
      expect(down > 0.9, `turn ${turn} flicks down`).toBe(move === 'down')
    }
  })

  it('reaches for a load that exists at every age, and for one without an age', () => {
    for (const age of [null, 2, 5, 6, 7, 8, 9, 10, 12, 40]) expect(LOADS).toContain(loadShown(age))
    expect(loadShown(null)).toBe(loadShown(6))
    expect(loadShown(10)).not.toBe(loadShown(6))
    expect(loadShown(99)).toBe(loadShown(10))
    expect(loadShown(1)).toBe(loadShown(6))
  })
})
