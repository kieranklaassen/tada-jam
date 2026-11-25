import { describe, expect, it } from 'vitest'
import { fingerOn, openingBeats } from './opening'
import { Play } from './play'
import { OpeningRound } from './round'
import { fresh } from './save'

describe('the opening round', () => {
  it.each([4, 7])('plays one whole day for real at age %i, and leaves a morning', (age) => {
    const play = new Play(fresh(age), 3), round = new OpeningRound(openingBeats(play), fingerOn(play))
    const seen: string[] = []
    let seconds = 0
    for (; round.active && seconds < 120; seconds += 1 / 60) {
      round.advance(1 / 60, seconds * 1000)
      play.step(1 / 60)
      seen.push(...play.take().map((event) => event.kind))
    }
    for (let i = 0; i < 240; i++) play.step(1 / 60)
    expect(round.active).toBe(false)
    expect([seen.includes('mutter'), seen.includes('change'), seen.includes('unravel'), seen.includes('crow')]).toEqual([true, true, true, true])
    expect(play.save.phase).toBe('day')
    if (age === 4) expect(seconds).toBeLessThan(45)
  })
  it('lets go at any instant', () => {
    for (let at = 0; at < 40; at += 0.37) {
      const play = new Play(fresh(4), 3), round = new OpeningRound(openingBeats(play), fingerOn(play))
      for (let t = 0; t < at; t += 1 / 30) { round.advance(1 / 30, t * 1000); play.step(1 / 30) }
      round.stop()
      for (let i = 0; i < 400; i++) play.step(1 / 30)
      expect([play.held, play.busy, play.touching]).toEqual([null, false, false])
    }
  })
})

describe('a wish', () => {
  it('is for something that would change whoever asks, and is another once it has it', () => {
    const play = new Play(fresh(7), 1)
    const first = play.wish
    const other = new Play({ ...fresh(7), base: { ...fresh(7).base, pig: { coat: 'mud', pants: false, up: false } } }, 1)
    expect(other.wish).not.toBe(first)
  })
})
