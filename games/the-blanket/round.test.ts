import { describe, expect, it } from 'vitest'
import { freshWorld, sausageSpot, type Event } from './model'
import { openingBeats } from './opening'
import { Play } from './play'
import { OpeningRound, PATIENCE, ROUND_FINGER } from './round'

const FRAME = 1 / 60
function rig() {
  const play = new Play(freshWorld())
  const round = new OpeningRound(openingBeats(play), play)
  const told: Event[] = []
  let ms = 0
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += FRAME) {
      ms += FRAME * 1000
      round.advance(FRAME, ms)
      play.advance(FRAME, ms)
      told.push(...play.world.events.splice(0))
    }
  }
  return { play, round, told, run }
}

describe('the opening round', () => {
  it('plays the whole trick for real: the dog is fooled and finds the dish empty', () => {
    const { play, round, told, run } = rig()
    run(14)
    expect(round.active).toBe(false)
    expect(sausageSpot(play.world)).toBe('teapot')
    expect(told).toContainEqual({ type: 'empty', who: 'dog', spot: 'dish' })
  })

  it('lets go at once when the child touches, whatever it was doing, and never comes back', () => {
    for (let at = 0; at < 9; at += 0.21) {
      const { play, round, run } = rig()
      run(at)
      round.stop()
      expect(round.active).toBe(false)
      expect(round.hand).toBeNull()
      expect(play.touch.holds(ROUND_FINGER)).toBe(false)
      run(3)
      expect(play.world.held).toBeNull()
      expect(round.hand).toBeNull()
    }
  })

  it('gives up on a room that never comes to rest', () => {
    const round = new OpeningRound([{ wait: 1, ready: () => false, from: () => ({ x: 0, y: 0 }) }], { down() {}, move() {}, up() {}, cancel() {} })
    for (let t = 0; t < PATIENCE + 1; t += FRAME) round.advance(FRAME, t * 1000)
    expect(round.active).toBe(false)
  })
})
