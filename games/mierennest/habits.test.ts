import { describe, expect, it } from 'vitest'
import { MOUTH } from './ground'
import { DUNG_BALL, HABITS, SHOTS, type InvaderKind } from './habits'

const INVADERS = Object.keys(HABITS) as InvaderKind[]

describe('each kind of invader', () => {
  it('answers every shot, and no two answers in the whole table are alike', () => {
    const ids = INVADERS.flatMap((kind) => SHOTS.map((shot) => HABITS[kind].shots[shot].id))
    expect(ids.length).toBe(15)
    expect(new Set(ids).size).toBe(15)
  })

  it('is never removed by a shot: it goes home, is held until the raid is over, or carries on', () => {
    for (const kind of INVADERS) for (const shot of SHOTS) {
      const answer = HABITS[kind].shots[shot]
      expect(['home', 'held', 'on']).toContain(answer.then)
      expect(answer.pause).toBeGreaterThanOrEqual(0)
    }
  })

  it('has an act of its own in a chamber, done in a bounded time', () => {
    expect(new Set(INVADERS.map((kind) => HABITS[kind].act.id)).size).toBe(INVADERS.length)
    for (const kind of INVADERS) {
      expect(HABITS[kind].act.seconds).toBeGreaterThanOrEqual(4)
      expect(HABITS[kind].act.seconds).toBeLessThanOrEqual(10)
      expect(HABITS[kind].patience).toBeGreaterThan(0)
    }
  })
})

describe('the habits this table holds', () => {
  it('only beetles push, and a dung ball pushes harder than one beetle', () => {
    expect(INVADERS.filter((kind) => HABITS[kind].push > 0)).toEqual(['beetle', 'dungBeetle'])
    expect(DUNG_BALL.push).toBeGreaterThan(HABITS.beetle.push)
  })

  it('a dung ball fits the mouth of the nest', () => {
    expect(MOUTH.length).toBeGreaterThanOrEqual(DUNG_BALL.across)
  })

  it('only the dung fly, gummed, makes the army lose its way', () => {
    const losing = INVADERS.flatMap((kind) => SHOTS.filter((shot) => HABITS[kind].shots[shot].armyLosesItsWay).map((shot) => `${kind}:${shot}`))
    expect(losing).toEqual(['dungFly:mud'])
  })

  it('every ant is stopped by every load, and no load stops a beetle at once except mud', () => {
    for (const shot of SHOTS) expect(HABITS.ant.shots[shot].then).not.toBe('on')
    expect(SHOTS.filter((shot) => HABITS.beetle.shots[shot].then !== 'on')).toEqual(['mud'])
  })
})
