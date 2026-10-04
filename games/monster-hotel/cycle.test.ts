import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { CASTS, castById, castsAt, neatOf } from './casts'
import { LADDER, ROUNDS, SET_DOWNS_PER_GUEST } from './config'
import { howItWent, neatHourOf, newThingAt, pairingsIn, showsAt, porterComesIn, sameHouse, setDownIn, tapIn, touchCoach, turnWheelIn, type Turn } from './cycle'
import { PHASES, type GuestId } from './guests'
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
    expect(Object.values(away.stay.at)).toEqual(['gone', 'gone', 'gone'])
    expect(Object.values(away.stay.kit).every((entry) => entry.at === 'cupboard')).toBe(true)
    expect(away.stay.from).toBe(null)
    // Sending away saves what the sheet names and no more: the count of set-downs is as the last set-down left it.
    expect(away.stay.moves).toBe(placed.stay.moves)
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
    // Not the neat way: the yeti over the lizard, so its cold sinks onto the lizard and one flame beside the lizard is too few.
    const cast = castsAt('stove-and-ice')[0]
    expect([...cast.guests].sort()).toEqual(['fly', 'lizard', 'troll', 'yeti'])
    let stay = begin(cast.id)
    for (const [guest, room] of [['lizard', 0], ['yeti', 3], ['troll', 2], ['fly', 1]] as const) stay = setDownIn(stay, { guest }, { room }).stay
    const placed = setDownIn(stay, { thing: 'stove' }, { room: 0 })
    const dial = (of: Stay) => arrangementOf(of).things.find((item) => item.kind === 'stove')!.dial
    expect(dial(placed.stay)).toBe(1)
    // Everyone has a room and the stove stands by the lizard, and the house is not settled.
    expect([placed.stay.finished, placed.cues, settled(arrangementOf(placed.stay))]).toEqual([false, [], false])
    // One step of the dial, and nothing else, settles it: the tap is judged as a set-down is.
    const turned = tapIn(placed.stay, { thing: 'stove' })
    expect(dial(turned.stay)).toBe(2)
    expect(arrangementOf(turned.stay).guests).toEqual(arrangementOf(placed.stay).guests)
    expect(settled(arrangementOf(turned.stay))).toBe(true)
    expect(turned.stay.finished).toBe(true)
    expect(turned.cues).toContain('settled-day')
    // A step too many would not have: three flames are too warm for somebody.
    expect(settled(arrange(cast.house, { lizard: 0, yeti: 3, troll: 2, fly: 1 }, { stove: { room: 0 } }, { dials: { stove: 3 }, bench: cast.bench }))).toBe(false)
  })

  it('the neat way is cued on a settled day of a cast whose place is not yet shown, when the child settled it another way', () => {
    const start = begin('two-guests/c')
    const neat = neatOf(castById('two-guests/c')!)
    // The child's own way: the mirror image of the neat one.
    const rooms: Partial<Record<GuestId, number>> = { troll: 1, bat: 0, blob: 2 }
    let turn: Turn = { stay: start, outcome: 'nothing', cues: [] }
    for (const id of ['troll', 'bat', 'blob'] as const) turn = setDownIn(turn.stay, { guest: id }, { room: rooms[id]! })
    expect(sameHouse(arrangementOf(turn.stay), neat)).toBe(false)
    expect(turn.cues).toEqual(['settled-day', 'neat-way'])
    // Nothing is marked until the porter comes in: the settled day itself saves no mark.
    expect(turn.stay.shown).toEqual([])
    // The neat way changes nothing that is saved except the mark.
    expect(arrangementOf(turn.stay).guests.filter((guest) => typeof guest.at === 'number').map((guest) => [guest.id, guest.at])).toEqual([['troll', 1], ['bat', 0], ['blob', 2]])
  })

  it('the mark is saved when the porter comes in, for the place of the cast on screen and not for the place the judgement moved to', () => {
    const done = setDownIn(setDownIn(begin('two-guests/b'), { guest: 'troll' }, { room: 1 }).stay, { guest: 'blob' }, { room: 2 })
    expect(done.cues).toEqual(['settled-day', 'neat-way'])
    // The settled day went well: the saved position is already the next place.
    expect(done.stay.position).toBe('heat-and-snow')
    const shown = porterComesIn(done.stay)
    expect(shown.shown).toEqual(['two-guests'])
    expect({ ...shown, shown: [] }).toEqual(done.stay)
    expect(porterComesIn(shown)).toBe(shown)
    // The same place again: no second showing.
    const later = setDownIn(setDownIn({ ...begin('two-guests/b'), shown: ['two-guests'] }, { guest: 'troll' }, { room: 1 }).stay, { guest: 'blob' }, { room: 2 })
    expect(later.cues).toEqual(['settled-day'])
  })

  it('a settled day that ends before the porter comes in, or whose arrangement is already the neat one, leaves the showing for the next settled day of that place', () => {
    // Ended before the porter came in: `porterComesIn` was never called, so the place is still unshown.
    const cut = setDownIn(setDownIn(begin('two-guests/b'), { guest: 'troll' }, { room: 1 }).stay, { guest: 'blob' }, { room: 2 })
    expect(cut.stay.shown).toEqual([])
    const again = setDownIn(setDownIn({ ...begin('two-guests/b'), shown: cut.stay.shown }, { guest: 'troll' }, { room: 3 }).stay, { guest: 'blob' }, { room: 0 })
    expect(again.cues).toEqual(['settled-day', 'neat-way'])
    // The child found the neat way itself: nothing is cued and nothing marked, and another cast of the place can still show it.
    const found = playNeat(begin('two-guests/c'))
    expect(found.cues).toEqual(['settled-day'])
    expect(found.stay.shown).toEqual([])
    const next = setDownIn(setDownIn({ ...begin('two-guests/b'), shown: found.stay.shown }, { guest: 'troll' }, { room: 1 }).stay, { guest: 'blob' }, { room: 2 })
    expect(next.cues).toEqual(['settled-day', 'neat-way'])
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
  it('a tapped guest draws the page from its place, another takes it over, and the same one tapped again gives the plain page back', () => {
    const start = begin('two-guests/b')
    const troll = tapIn(start, { guest: 'troll' }).stay
    expect(troll.from).toBe('troll')
    expect(tapIn(troll, { guest: 'blob' }).stay.from).toBe('blob')
    expect(tapIn(troll, { guest: 'troll' }).stay.from).toBe(null)
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

  it('a pairing is cued whichever touch makes it: a set-down, the turn of a dial, or the turn of the wheel', () => {
    const cast = castById('stove-and-ice/a')!
    let stay = withCast({ ...freshStay(null), position: cast.position }, cast)
    stay = setDownIn(stay, { guest: 'yeti' }, { room: 4 }).stay
    stay = setDownIn(stay, { thing: 'stove' }, { room: 4 }).stay
    expect(tapIn(stay, { thing: 'stove' }).cues).toEqual([])
    stay = tapIn(stay, { thing: 'stove' }).stay
    // The third flame is what makes it.
    const third = tapIn(stay, { thing: 'stove' })
    expect(third.cues).toEqual(['sauna'])
    // And every time: round the dial again.
    let round = third.stay
    for (let i = 0; i < 2; i++) round = tapIn(round, { thing: 'stove' }).stay
    expect(tapIn(round, { thing: 'stove' }).cues).toEqual(['sauna'])
    // By set-down: the yeti carried out and back in.
    const out = setDownIn(third.stay, { guest: 'yeti' }, 'lobby')
    expect(setDownIn(out.stay, { guest: 'yeti' }, { room: 4 }).cues).toEqual(['sauna'])
    // By the wheel: the troll and the singer on two sides of one wall, by day, and then the wheel is turned.
    const duet = castById('listener/b')!
    let pair = withCast({ ...freshStay(null), position: duet.position }, duet)
    pair = setDownIn(pair, { guest: 'troll' }, { room: 4 }).stay
    pair = setDownIn(pair, { guest: 'singer' }, { room: 3 }).stay
    expect(turnWheelIn(pair).cues).toEqual(['duet'])
  })

  it('a pairing is cued every time its exact combination is made, and only then', () => {
    const house: House = { shape: 'long', fixtures: [], twins: [] }
    expect(pairingsIn(arrange(house, { yeti: 4 }, { stove: { room: 4 } }, { dials: { stove: 3 } }))).toEqual(['sauna'])
    expect(pairingsIn(arrange(house, { yeti: 4 }, { stove: { room: 4 } }, { dials: { stove: 2 } }))).toEqual([])
    expect(pairingsIn(arrange(house, { yeti: 4 }, { stove: { room: 3 } }, { dials: { stove: 3 } }))).toEqual([])
    expect(pairingsIn(arrange(house, { troll: 4, singer: 3 }, {}, { phase: 'night' }))).toEqual(['duet'])
    // No duet through a quilt, and none with a player who makes no noise: the troll rolled in the quilt, or the quilt hung on the wall between them.
    expect(pairingsIn(arrange(house, { troll: 4, singer: 3 }, { quilt: { guest: 'troll' } }, { phase: 'night' }))).toEqual([])
    expect(pairingsIn(arrange(house, { troll: 4, singer: 3 }, { quilt: { guest: 'singer' } }, { phase: 'night' }))).toEqual([])
    expect(pairingsIn(arrange(house, { troll: 4, singer: 3 }, { quilt: { edge: '3-4' } }, { phase: 'night' }))).toEqual([])
    expect(pairingsIn(arrange(house, { troll: 4, singer: 3 }, { quilt: { edge: '4-5' } }, { phase: 'night' }))).toEqual(['duet'])
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

describe('the hour the porter\'s neat way is shown at', () => {
  it('is the hour at which the new thing of its place is at work, whichever hour the wheel was left at', () => {
    const shownAt = (id: string, left: 'day' | 'night') => { const cast = castById(id)!; return neatHourOf(cast.position, neatOf(cast), left) ?? left }
    // The quilt beside a troll that plays by night: by night, with the noise pressed against it.
    for (const id of ['quilt/a', 'quilt/c']) for (const left of PHASES) expect(shownAt(id, left), id).toBe('night')
    // The singer sings by night; the cook stews by day.
    for (const id of ['listener/a', 'listener/b', 'listener/c']) for (const left of PHASES) expect(shownAt(id, left), id).toBe('night')
    for (const id of ['corridor/b', 'corridor/c']) for (const left of PHASES) expect(shownAt(id, left), id).toBe('day')
  })

  it('in every cast there is an hour at which the neat way has its place\'s new thing at work, and that is the hour it is shown at', () => {
    for (const cast of CASTS) {
      const neat = neatOf(cast)
      expect(PHASES.some((phase) => newThingAt(cast.position, neat, phase)), cast.id).toBe(true)
      for (const left of PHASES) {
        const hour = neatHourOf(cast.position, neat, left) ?? left, other = hour === 'day' ? 'night' : 'day'
        expect(newThingAt(cast.position, neat, hour), `${cast.id} left at ${left}`).toBe(true)
        expect(showsAt(cast.position, neat, hour), cast.id).toBeGreaterThanOrEqual(showsAt(cast.position, neat, other))
      }
    }
  })
})
