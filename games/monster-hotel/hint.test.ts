import { describe, expect, it } from 'vitest'
import { CASTS, castById, neatOf } from './casts'
import { setDownIn, tapIn, touchCoach, turnWheelIn } from './cycle'
import { demandOf } from './demand'
import { hintFor } from './hint'
import { settled } from './mood'
import { arrangementOf, freshStay, withCast, type Stay } from './stay'

const begin = (id: string): Stay => withCast({ ...freshStay(null), position: castById(id)!.position }, castById(id)!)

describe('what the idle ladder may show', () => {
  it('on a first visit: carry the first waiting guest to the door it stares at', () => {
    const start = freshStay(null)
    const cast = castById(start.cast)!
    expect(hintFor(start)).toEqual({ kind: 'carry', guest: cast.guests[0], room: demandOf(cast.house, cast.guests[0]) })
  })

  it('when the room asked for is taken, the nearest room with a bed', () => {
    const start = begin('two-guests/a')
    const one = setDownIn(start, { guest: 'troll' }, { room: 3 }).stay
    expect(hintFor(one)).toEqual({ kind: 'carry', guest: 'bat', room: 2 })
  })

  it('when someone is cross: touch that guest, and never the one the page is already drawn from', () => {
    const start = begin('two-guests/b')
    const cross = setDownIn(setDownIn(start, { guest: 'troll' }, { room: 0 }).stay, { guest: 'blob' }, { room: 1 }).stay
    // By day nobody is cross (the troll sleeps): the wheel is the move.
    expect(hintFor(cross)).toEqual({ kind: 'wheel' })
    const night = turnWheelIn(cross).stay
    expect(hintFor(night)).toEqual({ kind: 'look', guest: 'blob' })
    expect(hintFor(tapIn(night, { guest: 'blob' }).stay)).toBe(null)
  })

  it('when the cycle has been judged: the coach', () => {
    const done = setDownIn(setDownIn(begin('two-guests/b'), { guest: 'troll' }, { room: 0 }).stay, { guest: 'blob' }, { room: 3 }).stay
    expect(hintFor(done)).toEqual({ kind: 'coach' })
    expect(hintFor(touchCoach(done).stay)!.kind).toBe('carry')
  })

  it('shows a move, never a solution: following the hand alone seldom settles a house past the first places', () => {
    let followed = 0, settledByHand = 0
    for (const cast of CASTS) {
      let stay = begin(cast.id)
      // Follow every carry the hand would show, and nothing else.
      for (let step = 0; step < 12; step++) {
        const hint = hintFor(stay)
        if (!hint || hint.kind !== 'carry') break
        stay = setDownIn(stay, { guest: hint.guest }, { room: hint.room }).stay
      }
      followed++
      if (settled(arrangementOf(stay))) settledByHand++
      // And the hand never names the neat way's rooms on purpose: it only knows each guest's own wish.
      expect(hintFor(begin(cast.id))).toEqual({ kind: 'carry', guest: cast.guests[0], room: demandOf(cast.house, cast.guests[0]) })
      expect(neatOf(cast).guests.length).toBeGreaterThan(0)
    }
    expect(followed).toBe(CASTS.length)
    expect(settledByHand).toBeLessThanOrEqual(CASTS.length / 4)
  })
})
