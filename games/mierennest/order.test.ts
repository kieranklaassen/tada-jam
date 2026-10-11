import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { INVADERS } from './habits'
import { PARTY, ROUND, SHOWINGS, after, arrived, judge, owed, partyAt, weight, type Progress } from './order'

describe('the places of the order', () => {
  it('names places in the game own words, never a grade, a groep or a level', () => {
    for (const id of LADDER) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
      expect(id).not.toMatch(/grade|groep|level|fase|niveau|class|year|stage|\d/)
    }
    expect(new Set(LADDER).size).toBe(LADDER.length)
  })

  it('starts at a first chamber and ends in the open kingdom, with the great raid just before it', () => {
    expect(LADDER[0]).toBe('first-chamber')
    expect(LADDER.slice(-2)).toEqual(['great-raid', 'open-kingdom'])
  })

  it('has a party at every place', () => {
    for (const id of LADDER) expect(partyAt(id, 0).length).toBeGreaterThan(0)
    expect(partyAt('no-such-place', 0)).toEqual(PARTY['first-chamber'])
  })

  it('brings in one new kind at a time', () => {
    const met = new Set<string>()
    for (const id of LADDER.slice(0, -1)) {
      const fresh = [...new Set(partyAt(id, 0))].filter((kind) => !met.has(kind))
      expect(fresh.length, id).toBeLessThanOrEqual(1)
      for (const kind of fresh) met.add(kind)
    }
    expect([...met].sort()).toEqual([...INVADERS].sort())
  })

  it('never brings a new kind and a machine at the same place', () => {
    const met = new Set<string>()
    for (const id of LADDER.slice(0, -1)) {
      const fresh = [...new Set(partyAt(id, 0))].filter((kind) => !met.has(kind))
      for (const kind of fresh) met.add(kind)
      const machineHere = arrived(id).length > arrived(LADDER[Math.max(0, LADDER.indexOf(id) - 1)]).length
      if (id !== LADDER[0]) expect(fresh.length > 0 && machineHere, id).toBe(false)
    }
  })

  it('has the catapult from its place on and the cannon from its place on', () => {
    expect(arrived('first-fly')).toEqual([])
    expect(arrived('the-catapult')).toEqual(['catapult'])
    expect(arrived('mixed-party')).toEqual(['catapult'])
    expect(arrived('the-cannon')).toEqual(['catapult', 'cannon'])
    expect(arrived('open-kingdom')).toEqual(['catapult', 'cannon'])
    expect(arrived('no-such-place')).toEqual([])
  })

  it('runs the round of the open kingdom from the lightest party to the heaviest, and round again', () => {
    expect(ROUND.length).toBe(6)
    for (let n = 1; n < ROUND.length; n++) expect(weight(ROUND[n])).toBeGreaterThan(weight(ROUND[n - 1]))
    expect(partyAt('open-kingdom', 6)).toEqual(ROUND[0])
    expect(partyAt('open-kingdom', -1)).toEqual(ROUND[5])
  })
})

describe('how a raid is judged', () => {
  const cases: { name: string; end: Parameters<typeof judge>[0]; verdict: string }[] = [
    { name: 'no invader finished its act: it went well', end: { chambersWhenCalled: 2, actsFinished: 0, putAway: false }, verdict: 'well' },
    { name: 'one invader finished its act: it did not go well', end: { chambersWhenCalled: 2, actsFinished: 1, putAway: false }, verdict: 'not-well' },
    { name: 'no chamber as it was called: not judged', end: { chambersWhenCalled: 0, actsFinished: 0, putAway: false }, verdict: 'not-judged' },
    { name: 'put away while it ran: not judged', end: { chambersWhenCalled: 3, actsFinished: 0, putAway: true }, verdict: 'not-judged' },
    { name: 'put away after an act was finished: still not judged', end: { chambersWhenCalled: 3, actsFinished: 2, putAway: true }, verdict: 'not-judged' },
  ]
  for (const row of cases) it(row.name, () => expect(judge(row.end)).toBe(row.verdict))
})

describe('how the position moves', () => {
  const start: Progress = { position: 'first-chamber', muster: 0, ended: false }

  it('moves one place forward after a raid that went well', () => {
    expect(after(start, 'well')).toEqual({ position: 'ant-file', muster: 0, ended: false })
  })

  it('never moves back, and does not move after a raid that did not go well or was not judged', () => {
    for (const id of LADDER) for (const verdict of ['not-well', 'not-judged'] as const) {
      const progress = { position: id, muster: 2, ended: id === 'open-kingdom' }
      expect(after(progress, verdict)).toEqual(progress)
    }
  })

  it('walks the whole order one place at a time and opens the kingdom after the great raid', () => {
    let progress = start
    const walked = [progress.position]
    for (let n = 0; n < LADDER.length - 1; n++) {
      progress = after(progress, 'well')
      walked.push(progress.position)
      expect(progress.ended).toBe(progress.position === 'open-kingdom')
    }
    expect(walked).toEqual([...LADDER])
  })

  it('steps the round in the open kingdom and stays there', () => {
    let progress: Progress = { position: 'open-kingdom', muster: 4, ended: true }
    progress = after(progress, 'well')
    expect(progress).toEqual({ position: 'open-kingdom', muster: 5, ended: true })
    expect(after(progress, 'well')).toEqual({ position: 'open-kingdom', muster: 0, ended: true })
  })
})

describe('first showings', () => {
  it('owes each kind once and each machine once, and nothing once they are shown', () => {
    expect(owed('first-chamber', 0, [])).toEqual(['ant'])
    expect(owed('first-chamber', 0, ['ant'])).toEqual([])
    expect(owed('the-catapult', 0, ['ant', 'beetle', 'fly'])).toEqual(['catapult'])
    expect(owed('great-raid', 0, ['ant', 'beetle', 'fly', 'catapult', 'cannon', 'dungBeetle'])).toEqual(['dungFly'])
    expect(owed('open-kingdom', 3, [...SHOWINGS])).toEqual([])
  })

  it('never owes anything that is not a showing', () => {
    for (const id of LADDER) for (const mark of owed(id, 0, [])) expect(SHOWINGS).toContain(mark)
  })
})
