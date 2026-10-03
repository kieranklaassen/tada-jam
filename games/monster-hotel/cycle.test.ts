import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { castById, castsAt, neatOf } from './casts'
import { LADDER, ROUNDS, SET_DOWNS_PER_GUEST } from './config'
import { howItWent, pairingsIn, plainPage, sameHouse, setDownIn, tapIn, touchCoach, turnWheelIn, type Turn } from './cycle'
import type { GuestId } from './guests'
import type { House } from './hotel'
import { settled } from './mood'
import { arrangementOf, freshStay, readStay, withCast, writeStay, type Stay } from './stay'

/** A stay with the named cast just off the coach. */
const begin = (id: string): Stay => {
  const cast = castById(id)!
  return withCast({ ...freshStay(null), position: cast.position }, cast)
}
/** Plays the cast's neat arrangement: each guest into its room, each thing to its place, each dial to its step. The cues of every touch are kept: the house can be settled before the last thing is placed, when that thing only makes someone happier. */
const playNeat = (from: Stay): Turn => {
  const cast = castById(from.cast)!
  const neat = neatOf(cast)
  let turn: Turn = { stay: from, outcome: 'nothing', cues: [] }
  const cues: Turn['cues'] = []
  const then = (next: Turn) => {
    cues.push(...next.cues)
    turn = next
  }
  for (const guest of neat.guests) if (typeof guest.at === 'number') then(setDownIn(turn.stay, { guest: guest.id }, { room: guest.at }))
  for (const item of neat.things) {
    if (item.at === 'cupboard') continue
    const target = 'edge' in item.at ? { edge: item.at.edge, nearer: Number(item.at.edge.split('-')[0]) } : item.at
    then(setDownIn(turn.stay, { thing: item.kind }, target))
    for (let dial = 1; dial < item.dial; dial++) then(tapIn(turn.stay, { thing: item.kind }))
  }
  return { ...turn, cues }
}

describe('a cycle', () => {
  it('ends the moment the house is settled, is judged once, and the place moves one step for the next coach-load', () => {
    const start = begin('two-guests/b')
    const first = setDownIn(start, { guest: 'troll' }, { room: 0 })
    expect(first.stay.finished).toBe(false)
    expect(first.cues).toEqual([])
    expect(first.stay.moves).toBe(1)
    const second = setDownIn(first.stay, { guest: 'blob' }, { room: 3 })
    expect(settled(arrangementOf(second.stay))).toBe(true)
    expect(second.stay.finished).toBe(true)
    expect(second.cues).toContain('settled-day')
    expect(second.stay.position).toBe(LADDER[1])
    // The cast on screen stays; only the next coach-load is of the new place.
    expect(second.stay.cast).toBe('two-guests/b')
    // Playing on with a settled house is free and is not judged again.
    const again = setDownIn(setDownIn(second.stay, { guest: 'blob' }, { room: 1 }).stay, { guest: 'blob' }, { room: 3 })
    expect(again.cues).toEqual([])
    expect(again.stay.position).toBe(LADDER[1])
    expect(again.stay.moves).toBe(second.stay.moves)
  })

  it('goes well within three set-downs a guest and is mixed beyond, and looking is never counted', () => {
    expect(howItWent(2 * SET_DOWNS_PER_GUEST, 2)).toBe('well')
    expect(howItWent(2 * SET_DOWNS_PER_GUEST + 1, 2)).toBe('mixed')
    let stay = begin('two-guests/b')
    // Many looks, wheel turns and set-downs that change nothing: none is a move.
    for (let i = 0; i < 20; i++) {
      stay = tapIn(stay, { guest: i % 2 ? 'troll' : 'blob' }).stay
      stay = turnWheelIn(stay).stay
      stay = setDownIn(stay, { guest: 'troll' }, 'lobby').stay
    }
    expect(stay.moves).toBe(0)
    // Seven set-downs that change the house, then settled: mixed, and the place stays.
    stay = setDownIn(stay, { guest: 'troll' }, { room: 0 }).stay
    for (const room of [1, 2, 1, 2, 1]) stay = setDownIn(stay, { guest: 'blob' }, { room }).stay
    const done = setDownIn(stay, { guest: 'blob' }, { room: 3 })
    expect(done.stay.moves).toBe(7)
    expect(done.stay.finished).toBe(true)
    expect(done.stay.position).toBe('two-guests')
  })

  it('a guest carried out to the coach before the house is settled sends this lot away, and the place steps down', () => {
    const start = { ...begin('heat-and-snow/a'), position: 'heat-and-snow' }
    const placed = setDownIn(start, { guest: 'lizard' }, { room: 1 })
    const away = setDownIn(placed.stay, { guest: 'yeti' }, 'coach')
    expect(away.cues).toEqual(['sent-away'])
    expect(away.stay.finished).toBe(true)
    expect(away.stay.position).toBe('two-guests')
    expect(Object.values(away.stay.at).filter((at) => at === 'gone').length).toBe(2)
    // The empty house is not judged again by anything done in it.
    expect(tapIn(away.stay, { guest: 'yeti' }).outcome).toBe('nothing')
  })

  it('the coach only honks until the cycle is judged, and then brings the next cast of the place as it stands', () => {
    const start = begin('two-guests/b')
    expect(touchCoach(start)).toEqual({ stay: start, outcome: 'coach-honks', cues: [] })
    const done = setDownIn(setDownIn(start, { guest: 'troll' }, { room: 0 }).stay, { guest: 'blob' }, { room: 3 })
    const next = touchCoach(done.stay)
    expect(next.cues).toEqual(['coach-changes-over'])
    expect(next.stay.finished).toBe(false)
    expect(next.stay.round).toBe(done.stay.round + 1)
    expect(castById(next.stay.cast)!.position).toBe(done.stay.position)
    expect(next.stay.moves).toBe(0)
    expect(next.stay.from).toBe(null)
    const cast = castById(next.stay.cast)!
    expect(cast.guests.every((id) => next.stay.at[id] === 'lobby')).toBe(true)
    expect(Object.values(next.stay.kit).every((entry) => entry.at === 'cupboard')).toBe(true)
    // A guest set down on the coach after the house is settled does the same.
    expect(setDownIn(done.stay, { guest: 'troll' }, 'coach').cues).toEqual(['coach-changes-over'])
  })

  it('rotates through the casts of a place and wraps the round', () => {
    const three = castsAt('two-guests').map((cast) => cast.id)
    let stay: Stay = { ...begin(three[0]), finished: true, position: 'two-guests', round: 0 }
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      stay = { ...touchCoach(stay).stay, finished: true, position: 'two-guests' }
      seen.push(stay.cast)
    }
    expect([...seen].sort()).toEqual([...three].sort())
    expect(touchCoach({ ...stay, round: ROUNDS - 1 }).stay.round).toBe(0)
  })

  it('a dial turned a step can be what settles the house', () => {
    const cast = castsAt('stove-and-ice')[0]
    const neat = neatOf(cast)
    const turned = neat.things.find((item) => item.at !== 'cupboard' && item.dial > 1)
    // Only meaningful when the neat way needs more than one flame or icicle; the rule itself is held by the lizard and yeti below.
    if (turned) expect(playNeat(begin(cast.id)).stay.finished).toBe(true)
    const house: House = { shape: 'long', fixtures: [], twins: [] }
    expect(settled(arrange(house, { lizard: 0, yeti: 3 }, { stove: { room: 0 } }, { dials: { stove: 2 } }))).toBe(true)
  })

  it('the neat way is cued at the first settled day of a place when the child settled it another way, and once only', () => {
    const start = begin('two-guests/c')
    const neat = neatOf(castById('two-guests/c')!)
    // The child's own way: the mirror image of the neat one.
    const rooms: Partial<Record<GuestId, number>> = { troll: 1, bat: 0, blob: 2 }
    let turn: Turn = { stay: start, outcome: 'nothing', cues: [] }
    for (const id of ['troll', 'bat', 'blob'] as const) turn = setDownIn(turn.stay, { guest: id }, { room: rooms[id]! })
    expect(sameHouse(arrangementOf(turn.stay), neat)).toBe(false)
    expect(turn.cues).toEqual(['settled-day', 'neat-way'])
    expect(turn.stay.shown).toEqual(['two-guests'])
    // The neat way changes nothing that is saved except the mark.
    expect(arrangementOf(turn.stay).guests.filter((guest) => typeof guest.at === 'number').map((guest) => [guest.id, guest.at])).toEqual([['troll', 1], ['bat', 0], ['blob', 2]])
    // The same place again: no second showing.
    const later = begin('two-guests/b')
    const done = setDownIn(setDownIn({ ...later, shown: ['two-guests'] }, { guest: 'troll' }, { room: 1 }).stay, { guest: 'blob' }, { room: 2 })
    expect(done.cues).toEqual(['settled-day'])
  })

  it('is not cued when the child found the neat way itself', () => {
    const turn = playNeat(begin('two-guests/c'))
    expect(turn.cues).toEqual(['settled-day'])
    expect(turn.stay.shown).toEqual([])
  })

  it('every cast can be played to its ending by its neat way, from the lobby, by set-downs and dial taps alone', () => {
    for (const place of LADDER) {
      for (const cast of castsAt(place)) {
        const turn = playNeat(begin(cast.id))
        expect(turn.stay.finished, cast.id).toBe(true)
        expect(turn.cues, cast.id).toContain('settled-day')
      }
    }
  })
})

describe('the toy, the wheel and the pairings', () => {
  it('a tapped guest draws the page from its place, another takes it over, the same one or the margin gives the plain page back', () => {
    const start = begin('two-guests/b')
    const troll = tapIn(start, { guest: 'troll' }).stay
    expect(troll.from).toBe('troll')
    expect(tapIn(troll, { guest: 'blob' }).stay.from).toBe('blob')
    expect(tapIn(troll, { guest: 'troll' }).stay.from).toBe(null)
    expect(plainPage(troll).from).toBe(null)
    expect(plainPage(start)).toBe(start)
    // The guest on the bench can be looked from too; a guest this cast does not have cannot.
    expect(tapIn(start, { guest: castById('two-guests/b')!.bench }).stay.from).toBe(castById('two-guests/b')!.bench)
    expect(tapIn(start, { guest: 'singer' }).outcome).toBe('nothing')
  })

  it('looking changes nothing in the house and nothing that is judged', () => {
    const start = begin('two-guests/b')
    const looked = tapIn(start, { guest: 'troll' }).stay
    expect(arrangementOf(looked)).toEqual(arrangementOf(start))
    expect([looked.moves, looked.finished, looked.position]).toEqual([start.moves, start.finished, start.position])
  })

  it('the wheel turns the hour and nothing else', () => {
    const start = begin('two-guests/b')
    const night = turnWheelIn(start)
    expect(night.stay.phase).toBe('night')
    expect(night.cues).toEqual([])
    expect({ ...night.stay, phase: 'day' }).toEqual(start)
  })

  it('a pairing is cued every time its exact combination is made, and only then', () => {
    const house: House = { shape: 'long', fixtures: [], twins: [] }
    expect(pairingsIn(arrange(house, { yeti: 4 }, { stove: { room: 4 } }, { dials: { stove: 3 } }))).toEqual(['sauna'])
    expect(pairingsIn(arrange(house, { yeti: 4 }, { stove: { room: 4 } }, { dials: { stove: 2 } }))).toEqual([])
    expect(pairingsIn(arrange(house, { yeti: 4 }, { stove: { room: 3 } }, { dials: { stove: 3 } }))).toEqual([])
    expect(pairingsIn(arrange(house, { troll: 4, singer: 3 }, {}, { phase: 'night' }))).toEqual(['duet'])
    expect(pairingsIn(arrange(house, { troll: 4, singer: 3 }, {}, { phase: 'day' }))).toEqual([])
    expect(pairingsIn(arrange(house, { troll: 4, singer: 1 }, {}, { phase: 'night' }))).toEqual([])
  })
})

describe('found as left', () => {
  it('put away at any instant of a cycle and opened again, the stay is the same and nothing replays', () => {
    let turn: Turn = { stay: begin('two-guests/c'), outcome: 'nothing', cues: [] }
    const steps: ((stay: Stay) => Turn)[] = [
      (stay) => tapIn(stay, { guest: 'troll' }),
      (stay) => setDownIn(stay, { guest: 'troll' }, { room: 1 }),
      (stay) => turnWheelIn(stay),
      (stay) => setDownIn(stay, { guest: 'bat' }, { room: 0 }),
      (stay) => setDownIn(stay, { guest: 'blob' }, { room: 2 }),
      (stay) => touchCoach(stay),
      (stay) => setDownIn(stay, { guest: castById(stay.cast)!.guests[0] }, { room: 0 }),
    ]
    for (const step of steps) {
      turn = step(turn.stay)
      const back = readStay(JSON.parse(JSON.stringify(writeStay(turn.stay))), null)
      expect(back).toEqual(turn.stay)
    }
  })

  it('a scene outcome is in the stay that comes back with its cue, so a put-away mid-scene loses nothing', () => {
    const done = setDownIn(setDownIn(begin('two-guests/b'), { guest: 'troll' }, { room: 0 }).stay, { guest: 'blob' }, { room: 3 })
    const back = readStay(JSON.parse(JSON.stringify(writeStay(done.stay))), null)
    expect(back.finished).toBe(true)
    expect(back.position).toBe(done.stay.position)
    // Opened again, the coach waits: touching it brings the next coach-load, and nothing happened by itself.
    expect(touchCoach(back).cues).toEqual(['coach-changes-over'])
  })
})
