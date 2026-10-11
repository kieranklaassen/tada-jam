import { describe, expect, it } from 'vitest'
import { EARTH, MUD, SAND, STONE } from './ground'
import { DUNG_BALL, HABITS, INVADERS, SHOTS, climbsStep, fits } from './habits'

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

  it('has an act of its own in a chamber and a want of its own, each done in a bounded time', () => {
    expect(new Set(INVADERS.map((kind) => HABITS[kind].act.id)).size).toBe(INVADERS.length)
    expect(new Set(INVADERS.map((kind) => HABITS[kind].want)).size).toBe(INVADERS.length)
    for (const kind of INVADERS) {
      expect(HABITS[kind].act.seconds).toBeGreaterThanOrEqual(4)
      expect(HABITS[kind].act.seconds).toBeLessThanOrEqual(10)
      expect(HABITS[kind].patience).toBeGreaterThan(0)
    }
  })
})

describe('the habits, as the sheet lists them', () => {
  const fitting: { kind: 'ant' | 'beetle' | 'fly' | 'dungBeetle' | 'dungFly'; high: number; wide?: number; fits: boolean }[] = [
    { kind: 'ant', high: 1, fits: true },
    { kind: 'beetle', high: 1, fits: false },
    { kind: 'beetle', high: 2, fits: true },
    { kind: 'dungBeetle', high: 2, fits: true },
    { kind: 'fly', high: 2, fits: false },
    { kind: 'fly', high: 3, wide: 2, fits: true },
    { kind: 'fly', high: 3, wide: 1, fits: false },
    { kind: 'dungFly', high: 2, fits: false },
    { kind: 'dungFly', high: 3, wide: 2, fits: true },
  ]
  for (const row of fitting) {
    it(`a ${row.kind} ${row.fits ? 'fits' : 'does not fit'} a way ${row.high} high${row.wide ? ` and ${row.wide} wide` : ''}`, () => {
      expect(fits(row.kind, row.high, row.wide)).toBe(row.fits)
    })
  }

  it('a raider ant climbs earth and stone, slides off sand and sticks in mud', () => {
    expect(climbsStep('ant', 5, EARTH)).toBe(true)
    expect(climbsStep('ant', 5, STONE)).toBe(true)
    expect(climbsStep('ant', 1, SAND)).toBe(false)
    expect(HABITS.ant.slipsOn).toEqual([SAND])
    expect(HABITS.ant.stuckOn).toEqual([MUD])
    expect(HABITS.ant.pit).toBeNull()
  })

  it('a beetle gets up one cell and no more, is held by a pit two deep, and mud does not stick it', () => {
    expect(climbsStep('beetle', 1, EARTH)).toBe(true)
    expect(climbsStep('beetle', 2, EARTH)).toBe(false)
    expect(HABITS.beetle.pit).toBe(2)
    expect(HABITS.beetle.stuckOn).toEqual([])
    expect(HABITS.beetle.ploughsSand).toBe(true)
  })

  it('only beetles push, a dung ball pushes harder than one beetle, and only a dung beetle widens its way, never through stone', () => {
    expect(INVADERS.filter((kind) => HABITS[kind].push > 0)).toEqual(['beetle', 'dungBeetle'])
    expect(DUNG_BALL.push).toBeGreaterThan(HABITS.beetle.push)
    expect(INVADERS.filter((kind) => HABITS[kind].widens.length > 0)).toEqual(['dungBeetle'])
    expect(HABITS.dungBeetle.widens).not.toContain(STONE)
  })

  it('fliers cross any step and no pit holds them', () => {
    for (const kind of ['fly', 'dungFly'] as const) {
      expect(climbsStep(kind, 9, SAND)).toBe(true)
      expect(HABITS[kind].pit).toBeNull()
    }
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
