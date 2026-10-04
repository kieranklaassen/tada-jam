import { describe, expect, it } from 'vitest'
import { CASTS, castById, startOf } from './casts'
import { LADDER, MOST_MOVES, ROUNDS } from './config'
import { GUEST_IDS } from './guests'
import { bedsIn, edgesOf, roomCount } from './hotel'
import { STATE_VERSION } from './state'
import { setDownIn } from './cycle'
import { arrangementOf, castFor, freshStay, readStay, withArrangement, withCast, writeStay, type Stay } from './stay'

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown

describe('what is saved', () => {
  it('a first visit opens with the first coach-load already in the lobby, by day, nothing touched', () => {
    const stay = freshStay(null)
    expect(stay.position).toBe(LADDER[0])
    expect(stay.finished).toBe(false)
    const cast = castById(stay.cast)!
    expect(cast.position).toBe(LADDER[0])
    expect(cast.guests.map((id) => stay.at[id])).toEqual(cast.guests.map(() => 'lobby'))
    expect(stay.at[cast.bench]).toBe('bench')
    expect([stay.phase, stay.from, stay.moves, stay.round, stay.shown]).toEqual(['day', null, 0, 0, []])
  })

  it('age only chooses where a first visit starts (the first place at 10 or younger, the second from 11), and a saved place wins over it', () => {
    expect(freshStay(9).position).toBe('two-guests')
    expect(freshStay(10).position).toBe('two-guests')
    expect(freshStay(11).position).toBe('heat-and-snow')
    expect(freshStay(12).position).toBe('heat-and-snow')
    expect(freshStay(4).position).toBe('two-guests')
    const saved = json(writeStay({ ...freshStay(9), position: 'corridor' }))
    expect(readStay(saved, 12).position).toBe('corridor')
  })

  it('writes exactly the eleven fields of the sheet, as plain JSON that reads back the same', () => {
    const stay = freshStay(11)
    const written = writeStay(stay)
    expect(Object.keys(written).sort()).toEqual(['at', 'cast', 'finished', 'from', 'kit', 'moves', 'phase', 'position', 'round', 'shown', 'v'])
    expect(readStay(json(written), null)).toEqual(stay)
  })

  it('every cast, arranged in any legal way, is found as it was left', () => {
    for (const cast of CASTS) {
      const start = startOf(cast)
      const edges = edgesOf(cast.house.shape)
      // Guests into rooms from the top down within the beds; the quilt and the pipe on two different edges; the rest spread out.
      const taken = new Array<number>(roomCount(cast.house.shape)).fill(0)
      const guests = start.guests.map((guest, index) => {
        for (let room = roomCount(cast.house.shape) - 1; room >= 0; room--) {
          if (taken[room] < bedsIn(cast.house, room) && (index + room) % 2 === 0) {
            taken[room]++
            return { id: guest.id, at: room }
          }
        }
        return guest
      })
      const roomed = guests.find((guest) => typeof guest.at === 'number')!
      const things = start.things.map((item, index) => ({
        kind: item.kind,
        // Only the stove and the ice box have a dial the child can set; the others keep the 1 they are given and nothing is saved for them.
        dial: (item.kind === 'stove' || item.kind === 'ice' ? (index % 3) + 1 : 1) as 1 | 2 | 3,
        at: item.kind === 'stove' || item.kind === 'ice' ? { room: index % roomCount(cast.house.shape) } : item.kind === 'clock' ? { guest: roomed.id } : { edge: edges[index % edges.length].id },
      }))
      const stay: Stay = { ...withArrangement({ ...freshStay(null), cast: cast.id, position: cast.position }, { ...start, guests, things, phase: 'night' }), from: roomed.id, moves: 7, round: 12, finished: true, shown: [LADDER[0], cast.position].filter((id, at, all) => all.indexOf(id) === at) }
      const written = json(writeStay(stay)) as { kit: Record<string, { dial?: number }> }
      for (const [kind, entry] of Object.entries(written.kit)) expect('dial' in entry, `${cast.id} ${kind}`).toBe(kind === 'stove' || kind === 'ice')
      const back = readStay(json(writeStay(stay)), null)
      expect(back, cast.id).toEqual(stay)
      expect(arrangementOf(back).guests, cast.id).toEqual(guests)
    }
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'hotel'],
    ['a number', 7],
    ['an array', [1, 2, 3]],
    ['an empty record', {}],
    ['a version above this one', { ...writeStay(freshStay(null)), v: STATE_VERSION + 1 }],
    ['no version', { ...writeStay(freshStay(null)), v: undefined }],
  ])('%s gives a fresh first visit', (_, raw) => {
    expect(readStay(raw, null)).toEqual(freshStay(null))
  })

  it('repairs each field by itself and keeps the rest', () => {
    const cast = CASTS.find((one) => one.kit.includes('quilt') && one.guests.length >= 3)!
    const good = writeStay({ ...withArrangement({ ...freshStay(null), cast: cast.id, position: cast.position }, { ...startOf(cast), guests: startOf(cast).guests.map((guest, at) => ({ id: guest.id, at: at === 0 ? 0 : guest.at })), phase: 'night' }), moves: 5, round: 3, from: cast.guests[0], shown: [cast.position] })
    const damage: [string, unknown, (stay: Stay) => unknown, unknown][] = [
      ['round', -1, (stay) => stay.round, 0],
      ['round', ROUNDS, (stay) => stay.round, 0],
      ['round', 1.5, (stay) => stay.round, 0],
      ['moves', MOST_MOVES + 1, (stay) => stay.moves, 0],
      ['moves', 'many', (stay) => stay.moves, 0],
      ['phase', 'dusk', (stay) => stay.phase, 'day'],
      ['from', 'nobody', (stay) => stay.from, null],
      ['from', GUEST_IDS.find((id) => !cast.guests.includes(id) && id !== cast.bench), (stay) => stay.from, null],
      ['shown', 'all', (stay) => stay.shown, []],
      ['shown', ['no-such-place', cast.position, cast.position, 7], (stay) => stay.shown, [cast.position]],
      ['at', null, (stay) => stay.at[cast.guests[0]], 'lobby'],
      ['at', { [cast.guests[0]]: 99 }, (stay) => stay.at[cast.guests[0]], 'lobby'],
      ['at', { [cast.guests[0]]: 'bench' }, (stay) => stay.at[cast.guests[0]], 'lobby'],
      ['at', { [cast.bench]: 'cellar' }, (stay) => stay.at[cast.bench], 'bench'],
      ['kit', [], (stay) => stay.kit.quilt, { at: 'cupboard', dial: 1 }],
      ['kit', { quilt: { at: { edge: 'no-such-wall' }, dial: 9 } }, (stay) => stay.kit.quilt, { at: 'cupboard', dial: 1 }],
      ['kit', { quilt: { at: { guest: cast.guests[1] }, dial: 1 } }, (stay) => stay.kit.quilt, { at: 'cupboard', dial: 1 }],
      ['kit', { quilt: { at: { guest: cast.guests[0] }, dial: 1 } }, (stay) => stay.kit.quilt, { at: { guest: cast.guests[0] }, dial: 1 }],
    ]
    for (const [field, value, read, expected] of damage) {
      const back = readStay(json({ ...good, [field]: value }), null)
      expect(read(back), `${field} = ${JSON.stringify(value)}`).toEqual(expected)
      expect(back.cast).toBe(cast.id)
      expect(back.position).toBe(cast.position)
    }
  })

  it('never puts more guests in a room than it has beds, and keeps the quilt and the pipe on one wall when that is how the house was left', () => {
    const cast = CASTS.find((one) => one.guests.length >= 3)!
    const crowded = readStay(json({ ...writeStay({ ...freshStay(null), cast: cast.id, position: cast.position }), at: Object.fromEntries(cast.guests.map((id) => [id, 1])) }), null)
    expect(cast.guests.filter((id) => crowded.at[id] === 1).length).toBe(bedsIn(cast.house, 1))
    const both = CASTS.find((one) => one.kit.includes('quilt') && one.kit.includes('pipe'))
    if (both) {
      const edge = edgesOf(both.house.shape)[0].id
      const back = readStay(json({ ...writeStay({ ...freshStay(null), cast: both.id, position: both.position }), kit: { quilt: { at: { edge }, dial: 1 }, pipe: { at: { edge }, dial: 1 } } }), null)
      expect([back.kit.quilt.at, back.kit.pipe.at]).toEqual([{ edge }, { edge }])
    }
  })

  it('a cast the game no longer knows is replaced by the first of the saved place, laid out fresh and unfinished', () => {
    const back = readStay(json({ ...writeStay(freshStay(null)), cast: 'retired/z', position: 'corridor', finished: true, moves: 9, round: 4, shown: ['quilt'] }), null)
    expect(back.position).toBe('corridor')
    expect(back.cast).toBe(castFor('corridor', 4).id)
    expect([back.finished, back.moves, back.round, back.shown]).toEqual([false, 0, 4, ['quilt']])
    expect(Object.values(back.at).every((at) => at === 'lobby' || at === 'bench')).toBe(true)
  })

  it('a place the game no longer knows falls back to the first-visit place', () => {
    expect(readStay(json({ ...writeStay(freshStay(null)), position: 'no-such-place' }), null).position).toBe(LADDER[0])
  })

  it('the largest legal state is far under half of the 64 KB cap', () => {
    let largest = 0
    for (const cast of CASTS) {
      const start = startOf(cast)
      const edge = edgesOf(cast.house.shape)
      const stay: Stay = {
        ...withArrangement({ ...freshStay(null), cast: cast.id, position: cast.position }, {
          ...start,
          // The longest spelling of every place: guests all gone, things on walls.
          guests: start.guests.map((guest) => ({ id: guest.id, at: 'bench' === guest.at ? 'bench' : 'lobby' })),
          things: start.things.map((item, at) => ({ kind: item.kind, at: { edge: edge[at % edge.length].id }, dial: 3 })),
          phase: 'night',
        }),
        round: ROUNDS - 1,
        moves: MOST_MOVES,
        from: cast.bench,
        finished: true,
        shown: [...LADDER],
      }
      largest = Math.max(largest, new TextEncoder().encode(JSON.stringify(writeStay(stay))).length)
    }
    expect(largest).toBeGreaterThan(100)
    expect(largest).toBeLessThan(2048)
    expect(largest).toBeLessThan((64 * 1024) / 2)
  })

  it('found as left after a guest who held a thing is carried out of its room: what is saved and loaded is what the house then was', () => {
    const cast = castById('corridor/b')!
    let stay = withCast({ ...freshStay(null), position: cast.position }, cast)
    stay = setDownIn(stay, { guest: 'blob' }, { room: 4 }).stay
    stay = setDownIn(stay, { thing: 'quilt' }, { guest: 'blob' }).stay
    expect(stay.kit.quilt!.at).toEqual({ guest: 'blob' })
    stay = setDownIn(stay, { guest: 'blob' }, 'lobby').stay
    const back = readStay(JSON.parse(JSON.stringify(writeStay(stay))), null)
    expect(arrangementOf(back)).toEqual(arrangementOf(stay))
    expect(back.kit.quilt!.at).toBe('cupboard')
  })
})
