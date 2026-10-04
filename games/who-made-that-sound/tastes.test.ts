import { describe, expect, it } from 'vitest'
import { TASTES, meetingOf, moveOf, reactionOf } from './tastes'
import { FAMILIES, KINDS, familyOf, nearOf } from './voices'

describe('fixed tastes', () => {
  it('sings in step with its own voice and is puzzled by its near voice', () => {
    for (const kind of KINDS) {
      expect(reactionOf(kind, kind)).toBe('in-step')
      expect(reactionOf(kind, nearOf(kind))).toBe('puzzled')
    }
  })

  it('loves one of the other two families and shies from the other', () => {
    for (const kind of KINDS) {
      const { loves, shies } = TASTES[kind]
      expect(new Set([loves, shies, familyOf(kind)]).size).toBe(FAMILIES.length)
      for (const heard of KINDS) {
        if (familyOf(heard) === loves) expect(reactionOf(kind, heard)).toBe('delighted')
        if (familyOf(heard) === shies) expect(reactionOf(kind, heard)).toBe('startled')
      }
    }
  })

  it('gives the two kinds of one family opposite tastes', () => {
    for (const kind of KINDS) {
      expect(TASTES[nearOf(kind)].loves).toBe(TASTES[kind].shies)
      expect(TASTES[nearOf(kind)].shies).toBe(TASTES[kind].loves)
    }
  })

  it('never changes: the same two kinds always meet the same way', () => {
    for (const a of KINDS) for (const b of KINDS) expect(meetingOf(a, b)).toEqual(meetingOf(a, b))
  })

  it('gives no two kinds the same move for anything', () => {
    const moves = new Map<string, string>()
    for (const listener of KINDS) for (const heard of KINDS) {
      const move = moveOf(listener, heard)
      const owner = moves.get(move)
      expect(owner === undefined || owner === listener).toBe(true)
      moves.set(move, listener)
    }
    for (const kind of KINDS) expect(new Set(KINDS.map((heard) => moveOf(kind, heard))).size).toBe(4)
  })

  it('makes thirty different meetings that do not match, and six that do', () => {
    const wrong = new Set<string>(), right = new Set<string>()
    for (const asker of KINDS) for (const other of KINDS) {
      const meeting = meetingOf(asker, other)
      const seen = `${asker}:${moveOf(asker, other)}|${other}:${moveOf(other, asker)}`
      if (meeting.match) right.add(seen)
      else wrong.add(seen)
      expect(meeting.match).toBe(meeting.askerDoes === 'in-step')
    }
    expect(wrong.size).toBe(30)
    expect(right.size).toBe(6)
  })
})
