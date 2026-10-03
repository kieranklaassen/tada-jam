import { describe, expect, it } from 'vitest'
import { CASTS, castById } from './casts'
import { setDownIn, tapIn, touchCoach, turnWheelIn, type Turn } from './cycle'
import { hintFor, type Hint } from './hint'
import { arrangementOf, freshStay, withCast, type Stay } from './stay'

const begin = (id: string): Stay => withCast({ ...freshStay(null), position: castById(id)!.position }, castById(id)!)

/** What happens when the child does exactly what the hand showed. A lifted guest is put back where it stood. */
function follow(stay: Stay, hint: Hint): Turn {
  if (hint.kind === 'lift') return setDownIn(stay, { guest: hint.guest }, 'lobby')
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
    for (const cast of CASTS) {
      let stay = begin(cast.id)
      const before = arrangementOf(stay)
      for (let step = 0; step < 8; step++) {
        const hint = hintFor(stay)
        if (!hint) break
        const turn = follow(stay, hint)
        expect(turn.cues, cast.id).toEqual([])
        stay = turn.stay
      }
      expect({ ...arrangementOf(stay), phase: before.phase }, cast.id).toEqual(before)
      expect([stay.finished, stay.moves, stay.position], cast.id).toEqual([false, 0, cast.position])
    }
  })
})
