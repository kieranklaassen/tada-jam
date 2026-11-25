import { describe, expect, it } from 'vitest'
import { moveToShow } from './guide'
import { BROOD, THINGS } from './layout'
import { fingerOn, openingBeats } from './opening'
import { Play } from './play'
import { makeRng } from './rng'
import { OpeningRound } from './round'
import { deserialize, freshState } from './save'
import { OUT, TUCK_S, Yard } from './yard'

const FRAME = 1 / 60
const DEMO = { glow: 1, demo: 0.5, demoIndex: 0 } as Parameters<typeof moveToShow>[1]
const open = (age: number | null = null): Play => { const play = new Play(new Yard(freshState(age), makeRng(3))); play.size(1180, 820); return play }
const run = (play: Play, s: number): void => { for (let t = 0; t < s; t += FRAME) play.step(FRAME) }

describe('the opening round', () => {
  for (const age of [null, 6]) it(`opens the egg by the boot and lets the chick copy it (${String(age)})`, () => {
    const play = open(age), round = new OpeningRound(openingBeats(play.yard), fingerOn(play))
    let copied = false
    for (let t = 0; t < 16; t += FRAME) { round.advance(FRAME, t * 1000); play.step(FRAME); if (play.yard.brood[0].act?.name === 'bootStomp') copied = true }
    expect(round.active).toBe(false)
    expect(play.yard.brood[0].mother).toBe('boot')
    expect(copied).toBe(true)
    expect(play.yard.proud).toBe(null)
  })
  it('leaves nothing held when a touch ends it', () => {
    for (let at = 0; at < 8; at += 0.19) {
      const play = open(), round = new OpeningRound(openingBeats(play.yard), fingerOn(play))
      for (let t = 0; t < at; t += FRAME) { round.advance(FRAME, t * 1000); play.step(FRAME) }
      round.stop()
      expect(play.active).toBe(false)
      expect(play.yard.carry).toBe(null)
    }
  })
})

describe('the loop', () => {
  it('is egg, mother, next egg, and the hen when there is none', () => {
    const play = open(6), yard = play.yard
    for (let i = 0; i < 12 && yard.asking; i++) {
      const egg = yard.asking
      yard.tap({ kind: 'body', id: egg.id })
      run(play, OUT + 1)
      if (egg.mother && THINGS.some((k) => k === egg.mother)) {
        expect(yard.proud).toBe(egg.mother)
        const m = yard.things[yard.proud!]
        expect(moveToShow(yard, DEMO).from).toEqual(yard.middle(m))
        yard.tap({ kind: 'body', id: m.id })
        expect(yard.proud).toBe(null)
        run(play, 2)
      }
    }
    expect(moveToShow(yard, DEMO).from).toEqual(yard.middle(yard.hen))
    yard.tap({ kind: 'body', id: 'hen' })
    run(play, 1)
    yard.tap({ kind: 'body', id: 'hen' })
    expect(yard.brood.every((c) => c.kind === 'egg')).toBe(true)
    expect(deserialize(yard.toState()).brood).toHaveLength(BROOD.length)
    run(play, TUCK_S + 0.5)
    // A new round, and not every egg has the hen for its mother.
    expect(yard.asking).not.toBe(null)
    expect(yard.brood.filter((c) => yard.nearest(c) !== 'hen').length).toBeGreaterThan(3)
  })
})
