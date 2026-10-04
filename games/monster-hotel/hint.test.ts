import { describe, expect, it } from 'vitest'
import { placeOf } from './arrangement'
import { CASTS, castById } from './casts'
import { setDownIn, tapIn, touchCoach, turnWheelIn, type Turn } from './cycle'
import { TAP_PRESSES } from './config'
import { hintFor, hintsFor, type Hint } from './hint'
import { arrangementOf, freshStay, withCast, type Stay } from './stay'

const begin = (id: string): Stay => withCast({ ...freshStay(null), position: castById(id)!.position }, castById(id)!)

/** What happens when the child does exactly what the hand showed. A lifted guest or thing is put back where it stood: the hand lifts only a guest in the lobby and a thing in the cupboard, and the test holds it to that. */
function follow(stay: Stay, hint: Hint): Turn {
  if (hint.kind === 'lift') {
    expect(placeOf(arrangementOf(stay), hint.guest)).toBe('lobby')
    return setDownIn(stay, { guest: hint.guest }, 'lobby')
  }
  if (hint.kind === 'handle') {
    expect(arrangementOf(stay).things.find((item) => item.kind === hint.thing)?.at).toBe('cupboard')
    return setDownIn(stay, { thing: hint.thing }, 'cupboard')
  }
  if (hint.kind === 'look') return tapIn(stay, { guest: hint.guest })
  if (hint.kind === 'wheel') return turnWheelIn(stay)
  return touchCoach(stay)
}

describe('what the idle ladder may show', () => {
  it('on a first visit: the first waiting guest lifted a little and put back', () => {
    const start = freshStay(null)
    expect(hintFor(start)).toEqual({ kind: 'lift', guest: castById(start.cast)!.guests[0] })
    const one = setDownIn(begin('two-guests/a'), { guest: 'troll' }, { room: 3 }).stay
    expect(hintFor(one)).toEqual({ kind: 'lift', guest: 'bat' })
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
    expect(hintFor(touchCoach(done).stay)!.kind).toBe('lift')
  })

  it('never shows an arrangement that settles the house: a child who only copies the hand changes nothing in it', () => {
    const kinds = new Set<string>()
    for (const cast of CASTS) {
      // From the house as it opens, and from one with somebody cross in a room, where the hand has more to show.
      const opened = begin(cast.id)
      const lodged = cast.guests.reduce((stay, guest, room) => setDownIn(stay, { guest }, { room }).stay, opened)
      for (const start of [opened, lodged]) {
        if (start.finished) continue
        let stay = start
        const before = arrangementOf(stay)
        // The ladder goes down the list with each showing, so every move on the list is copied, one a showing.
        for (let showing = 0; showing < 12; showing++) {
          const hints = hintsFor(stay)
          if (hints.length === 0) break
          const hint = hints[showing % hints.length]
          kinds.add(hint.kind)
          const turn = follow(stay, hint)
          expect(turn.cues, cast.id).toEqual([])
          stay = turn.stay
        }
        expect({ ...arrangementOf(stay), phase: before.phase }, cast.id).toEqual(before)
        expect([stay.finished, stay.moves, stay.position], cast.id).toEqual([false, start.moves, cast.position])
      }
    }
    // Every verb the hand has was copied somewhere, but for the coach, which it shows only when the house is settled.
    expect([...kinds].sort()).toEqual(['handle', 'lift', 'look', 'wheel'])
  })

  it('shows a tap as one press, since the second of two, copied, takes the first back or hurries past what it began', () => {
    expect(TAP_PRESSES).toBe(1)
    // A second tap on the cross guest turns the page back from its place.
    const start = begin('two-guests/b')
    const night = turnWheelIn(setDownIn(setDownIn(start, { guest: 'troll' }, { room: 0 }).stay, { guest: 'blob' }, { room: 1 }).stay).stay
    expect(hintFor(night)).toEqual({ kind: 'look', guest: 'blob' })
    const once = tapIn(night, { guest: 'blob' }).stay
    expect(once.from).toBe('blob')
    expect(tapIn(once, { guest: 'blob' }).stay.from).toBe(null)
    // A second turn of the wheel turns the hour back.
    expect(arrangementOf(turnWheelIn(turnWheelIn(night).stay).stay).phase).toBe(arrangementOf(night).phase)
  })
})
