import { describe, expect, it } from 'vitest'
import type { GuestState, LiftTaste, Party } from './party'
import { firstLiftsRight, noteLift, outcomeOf, seatParty, sittingEnded } from './sitting'
import type { GuestId } from './world'

const WHO: readonly GuestId[] = ['bear', 'mouse', 'hen', 'duckling-a']

const party = (count: number): Party => ({ guests: WHO.slice(0, count).map((who) => ({ who, cup: 'own' as const })), trayCups: [], laysOwnPlace: false })

/** A table of `firsts.length` guests whose first lifts went this way, each then poured again until it drank. */
function sat(firsts: readonly LiftTaste[]): GuestState[] {
  let guests = seatParty(party(firsts.length))
  firsts.forEach((taste, seat) => { guests = noteLift(guests, WHO[seat], taste) })
  firsts.forEach((_, seat) => { guests = noteLift(guests, WHO[seat], 'right') })
  return guests
}

describe('a party sits down', () => {
  it('in its own order, with nothing noted yet', () => {
    expect(seatParty(party(3))).toEqual([
      { who: 'bear', seat: 0, firstLift: null, content: false },
      { who: 'mouse', seat: 1, firstLift: null, content: false },
      { who: 'hen', seat: 2, firstLift: null, content: false },
    ])
    expect(seatParty(party(0))).toEqual([])
  })
})

describe('a lift of the cup', () => {
  it('is noted the first time and never overwritten', () => {
    let guests = noteLift(seatParty(party(2)), 'bear', 'short')
    expect(guests[0]).toEqual({ who: 'bear', seat: 0, firstLift: 'short', content: false })
    guests = noteLift(guests, 'bear', 'over')
    guests = noteLift(guests, 'bear', 'right')
    expect(guests[0]).toEqual({ who: 'bear', seat: 0, firstLift: 'short', content: true })
    expect(guests[1]).toEqual({ who: 'mouse', seat: 1, firstLift: null, content: false })
  })

  it('leaves a guest content once it has drunk, whatever it lifts afterwards', () => {
    let guests = noteLift(seatParty(party(1)), 'bear', 'right')
    guests = noteLift(guests, 'bear', 'short')
    guests = noteLift(guests, 'bear', 'over')
    expect(guests[0]).toEqual({ who: 'bear', seat: 0, firstLift: 'right', content: true })
  })

  it('changes nothing for a guest who is not at the table', () => {
    const guests = seatParty(party(2))
    expect(noteLift(guests, 'duckling-b', 'right')).toEqual(guests)
  })

  it('never changes the list it is given', () => {
    const guests = noteLift(seatParty(party(3)), 'mouse', 'over')
    const before = structuredClone(guests)
    const after = noteLift(guests, 'mouse', 'right')
    noteLift(guests, 'bear', 'short')
    sittingEnded(guests)
    outcomeOf(guests)
    firstLiftsRight(guests)
    expect(guests).toEqual(before)
    expect(after).not.toBe(guests)
    after.forEach((guest, seat) => expect(guest).not.toBe(guests[seat]))
    const laidOut = party(2)
    const asLaid = structuredClone(laidOut)
    seatParty(laidOut)[0].content = true
    expect(laidOut).toEqual(asLaid)
  })
})

describe('the end of a sitting', () => {
  it('needs every guest to have drunk a cup to its taste', () => {
    for (let count = 1; count <= 4; count++) {
      let guests = seatParty(party(count))
      for (let seat = 0; seat < count; seat++) {
        expect(sittingEnded(guests)).toBe(false)
        guests = noteLift(guests, WHO[seat], 'over')
        expect(sittingEnded(guests)).toBe(false)
        guests = noteLift(guests, WHO[seat], 'right')
      }
      expect(sittingEnded(guests)).toBe(true)
    }
  })

  it('never comes for an empty table, which is mixed', () => {
    expect(sittingEnded([])).toBe(false)
    expect(outcomeOf([])).toBe('mixed')
    expect(firstLiftsRight([])).toBe(0)
  })
})

describe('how a sitting went', () => {
  it('went well when every first lift was to taste', () => {
    for (let count = 1; count <= 4; count++) {
      const guests = sat(new Array<LiftTaste>(count).fill('right'))
      expect(sittingEnded(guests)).toBe(true)
      expect(firstLiftsRight(guests)).toBe(count)
      expect(outcomeOf(guests)).toBe('well')
    }
  })

  it('went badly when two or more guests had no first lift to taste', () => {
    expect(outcomeOf(sat(['short', 'over']))).toBe('badly')
    expect(outcomeOf(sat(['over', 'over', 'short']))).toBe('badly')
    expect(outcomeOf(sat(['short', 'short', 'over', 'short']))).toBe('badly')
  })

  it('is mixed for one guest alone whose first lift was not to taste', () => {
    expect(outcomeOf(sat(['short']))).toBe('mixed')
    expect(outcomeOf(sat(['over']))).toBe('mixed')
  })

  it('is mixed when some first lifts were to taste and some were not', () => {
    expect(outcomeOf(sat(['right', 'short']))).toBe('mixed')
    expect(outcomeOf(sat(['over', 'right', 'right']))).toBe('mixed')
    expect(outcomeOf(sat(['short', 'over', 'right']))).toBe('mixed')
    expect(outcomeOf(sat(['right', 'right', 'right', 'over']))).toBe('mixed')
    expect(outcomeOf(sat(['short', 'short', 'short', 'right']))).toBe('mixed')
  })

  it('is mixed while a guest has not lifted its cup yet', () => {
    for (let count = 1; count <= 4; count++) expect(outcomeOf(seatParty(party(count)))).toBe('mixed')
    expect(outcomeOf(noteLift(seatParty(party(2)), 'bear', 'right'))).toBe('mixed')
    expect(outcomeOf(noteLift(seatParty(party(3)), 'mouse', 'short'))).toBe('mixed')
  })
})
