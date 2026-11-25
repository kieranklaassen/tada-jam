import { describe, expect, it } from 'vitest'
import { wantedPeg } from './demos'
import { openingBeats } from './opening'
import { CHEER_S, Play } from './play'
import { OpeningRound } from './round'
import { MEET, RIGHT } from './layout'
import { deserialize, freshSave, type Saved } from './save'

const FRAME = 1 / 60
const open = (change: Partial<Saved> = {}): Play => { let s = 7; return new Play(deserialize({ ...freshSave(), ...change }), () => ((s = (s * 16807) % 2147483647) / 2147483647)) }

describe('the opening round', () => {
  it('leads the horse to the farmer for real, and fetches the next animal off the line', () => {
    const play = open(), round = new OpeningRound(openingBeats(play), play)
    for (let t = 0; t < 18; t += FRAME) { round.advance(FRAME, t * 1000); play.step(FRAME) }
    expect(round.active).toBe(false)
    expect(play.wish).toBe(1)
    expect(play.halves[0].wear).toBe(1)
  })
  it('leaves nothing held when a touch ends it', () => {
    for (let at = 0; at < 8; at += 0.19) {
      const play = open(), round = new OpeningRound(openingBeats(play), play)
      for (let t = 0; t < at; t += FRAME) { round.advance(FRAME, t * 1000); play.step(FRAME) }
      round.stop()
      expect(play.hands.contacts.size).toBe(0)
      expect(play.halves.every((half) => half.held === null)).toBe(true)
    }
  })
})

describe('the wish', () => {
  const near = (wear: [number, number], wish: number): Play => {
    const pegs = [...Array(8).keys()].filter((end) => !wear.includes(end))
    return open({ wish, food: [], halves: [{ x: RIGHT - 10, sit: false, wear: wear[0] }, { x: RIGHT - 290, sit: false, wear: wear[1] }], pegs: [...pegs, null, null] })
  }
  it('is granted by the whole animal before him, and then it is the next one, for ever', () => {
    for (let wish = 0; wish < 4; wish++) {
      const play = near([wish, wish + 4], wish)
      play.step(FRAME)
      expect(play.wish).toBe((wish + 1) % 4)
      for (let t = 0; t < 5; t += FRAME) play.step(FRAME)
      expect(play.cheer).toBe(CHEER_S)
      expect(play.wish).toBe((wish + 1) % 4)
      expect(deserialize(play.saved()).wish).toBe(play.wish)
    }
  })
  it('is not granted by a mixture, nor from far away', () => {
    for (const play of [near([1, 4], 1), open({ food: [] })]) {
      const was = play.wish
      for (let t = 0; t < 2; t += FRAME) play.step(FRAME)
      expect(play.wish).toBe(was)
    }
    expect(MEET).toBeLessThan(RIGHT)
  })
  it('asks for the end it is short of, head first', () => {
    const play = open({ wish: 2 })
    expect(play.pegs[wantedPeg(play)!]).toBe(2)
    expect(wantedPeg(open())).toBeNull()
  })
})
