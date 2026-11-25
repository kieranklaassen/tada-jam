import { describe, expect, it } from 'vitest'
import { fingerOn, openingBeats } from './opening'
import { Party, demoMove } from './party'
import { OpeningRound } from './round'
import { GUESTS } from './rules'
import { deserialize, freshState, serialize } from './state'

const FRAME = 1 / 60
const run = (party: Party, s: number): void => { for (let t = 0; t < s; t += FRAME) party.step(FRAME) }

describe('the opening round', () => {
  for (const age of [null, 5, 9]) it(`pours what the walrus asks for, and fans the dog (${String(age)})`, () => {
    const party = new Party(freshState(age)), round = new OpeningRound(openingBeats(party), fingerOn(party))
    for (let t = 0; t < 40 && round.active; t += FRAME) { round.advance(FRAME, t * 1000); party.step(FRAME) }
    run(party, 6)
    expect(round.active).toBe(false)
    expect(party.state.glad).toMatchObject({ walrus: true, dog: true })
    expect(party.calling).toBe(0)
  })
  it('leaves nothing held when a touch ends it', () => {
    for (let at = 0; at < 12; at += 0.23) {
      const party = new Party(freshState(null)), round = new OpeningRound(openingBeats(party), fingerOn(party))
      for (let t = 0; t < at; t += FRAME) { round.advance(FRAME, t * 1000); party.step(FRAME) }
      round.stop()
      run(party, 1)
      expect(party.touching).toBe(false)
      expect(party.carried).toEqual([null, null])
    }
  })
})

describe('the loop', () => {
  it('followed as the room asks for it, makes all four glad, tidies, and asks again', () => {
    const party = new Party(freshState(null)), finger = fingerOn(party)
    let glad = false, again = false
    for (let i = 0; i < 30 && !again; i++) {
      const move = demoMove(party)
      finger.down(1, move.from, 0)
      run(party, 0.1)
      if (move.drag) for (let k = 1; k <= 20; k++) { finger.move(1, { x: move.from.x + ((move.to.x - move.from.x) * k) / 20, y: move.from.y + ((move.to.y - move.from.y) * k) / 20 }, 0); run(party, 0.05) }
      finger.up(1, move.to, 0)
      run(party, 10)
      if (GUESTS.every((one) => party.state.glad[one])) glad = true
      if (glad && GUESTS.every((one) => !party.state.glad[one])) again = true
    }
    expect([glad, again]).toEqual([true, true])
    expect(party.asker).toBe(0)
  })
  it('keeps who is glad', () => {
    const state = freshState(null)
    state.glad.dog = true
    expect(deserialize(serialize(state)).glad).toEqual(state.glad)
    expect(deserialize({ ...state, glad: 'x' }).glad.dog).toBe(false)
  })
})
