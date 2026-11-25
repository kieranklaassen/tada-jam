import { describe, expect, it } from 'vitest'
import { fingerOn, openingBeats } from './opening'
import { Play } from './play'
import { OpeningRound } from './round'
import { fresh } from './save'

const FRAME = 1 / 60

describe('the opening round', () => {
  for (const age of [null, 7]) it(`puts one thing in, and a dream comes true (${String(age)})`, () => {
    const play = new Play(fresh(age), 1), round = new OpeningRound(openingBeats(play), fingerOn(play))
    let laughed = false, called = 0
    for (let t = 0; t < 70 && round.active; t += FRAME) { round.advance(FRAME, t * 1000); play.step(FRAME); laughed ||= play.scene !== null; called = Math.max(called, play.called.length) }
    for (let t = 0; t < 3; t += FRAME) play.step(FRAME)
    expect(laughed).toBe(true)
    expect(called).toBeGreaterThan(2)
    expect(round.active).toBe(false)
    expect(play.dreaming).toBe(true)
  })
  it('leaves nothing held when a touch ends it', () => {
    for (let at = 0; at < 8; at += 0.19) {
      const play = new Play(fresh(null), 1), round = new OpeningRound(openingBeats(play), fingerOn(play))
      for (let t = 0; t < at; t += FRAME) { round.advance(FRAME, t * 1000); play.step(FRAME) }
      round.stop()
      expect(play.holding).toBe(null)
    }
  })
})
