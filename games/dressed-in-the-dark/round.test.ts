import { describe, expect, it } from 'vitest'
import { moveFor } from './guide'
import { freshNight } from './night'
import { fingerOn, openingBeats } from './opening'
import { OpeningRound } from './round'
import { Show } from './show'
import { LOVES, SLEEPERS } from './things'

const FRAME = 1 / 60
const run = (show: Show, s: number): void => { for (let t = 0; t < s; t += FRAME) show.step(FRAME) }

describe('the opening round', () => {
  it('puts the lamp out, dresses the one who dreams, and puts the lamp on', () => {
    const show = new Show(freshNight(false)), round = new OpeningRound(openingBeats(show), fingerOn(show))
    for (let t = 0; t < 30; t += FRAME) { round.advance(FRAME, t * 1000); show.step(FRAME) }
    expect(round.active).toBe(false)
    expect(show.lit).toBe(true)
    expect(show.night.worn.hen).toEqual([LOVES.hen])
    expect(show.people.hen.rest).toBe('glow')
  })
  it('leaves nothing held when a touch ends it', () => {
    for (let at = 0; at < 18; at += 0.23) {
      const show = new Show(freshNight(false)), round = new OpeningRound(openingBeats(show), fingerOn(show))
      for (let t = 0; t < at; t += FRAME) { round.advance(FRAME, t * 1000); show.step(FRAME) }
      round.stop()
      expect(show.hand).toBe(null)
      expect(show.lifted).toBe(null)
    }
  })
})

describe('the loop', () => {
  it('followed as the room asks for it, makes all five glad, and then begins again', () => {
    const show = new Show(freshNight(false)), finger = fingerOn(show)
    const follow = (): void => {
      const move = moveFor(show, 0)
      finger.down(1, move.from, 0)
      if (move.to) finger.move(1, move.to, 0)
      finger.up(1, move.to ?? move.from, 0)
      run(show, 12)
    }
    for (let i = 0; i < 40 && !SLEEPERS.every((one) => show.night.worn[one].length > 0); i++) follow()
    expect(SLEEPERS.map((one) => show.night.worn[one])).toEqual(SLEEPERS.map((one) => [LOVES[one]]))
    while (!show.lit) follow()
    follow()
    expect(show.lit).toBe(false)
    expect(SLEEPERS.every((one) => show.night.worn[one].length === 0)).toBe(true)
    expect(show.dreams).not.toBe(null)
  })
})
