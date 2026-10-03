import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { ROSTER, judge, vehicle, whoNext } from './cycle'
import { dipsLeft } from './mud'
import { silhouette } from './silhouette'
import { STATE_VERSION } from './state'
import { CELLS, decode, encode, tally, type Patch, type Surface } from './surface'
import { deserializeWash, freshWash, landedOnNext, markShown, sendOff, serializeWash, throughPuddle, washed, type WashState } from './washState'

/** The vehicle's whole body in one patch. */
const coat = (who: WashState['bay']['who'], patch: Patch): Surface => silhouette(vehicle(who)).map((p) => (p === '.' ? '.' : patch))
const save = (state: WashState): unknown => JSON.parse(JSON.stringify(serializeWash(state)))

describe('a first visit', () => {
  it('opens on the first vehicle in the bay and the second at the door, muddy as the first place in the order', () => {
    const state = freshWash(null)
    expect(state.position).toBe(LADDER[0])
    expect(state.bay.who).toBe(ROSTER[0].id)
    expect(state.next.who).toBe(ROSTER[1].id)
    expect(state.bay.came).toBe(tally(decode(state.bay.cells)!).mud)
    expect(state.bay.came).toBeGreaterThan(0)
    expect(tally(decode(state.bay.cells)!).c).toBe(0)
    expect(state.finished).toBe(false)
    expect(state.shown).toEqual([])
  })

  it('is the same scene every time, and age only chooses where it starts', () => {
    expect(freshWash(2)).toEqual(freshWash(null))
    expect(freshWash(3).position).toBe(LADDER[0])
    expect(freshWash(4).position).toBe(LADDER[1])
    expect(freshWash(11).position).toBe(LADDER[1])
    expect(tally(decode(freshWash(4).bay.cells)!).c).toBeGreaterThan(0)
  })
})

describe('the save', () => {
  it('comes back exactly as it was left', () => {
    let state = freshWash(3)
    state = washed(state, coat(state.bay.who, 'f'))
    state = markShown(throughPuddle(state), 'drip')
    expect(deserializeWash(save(state), 9)).toEqual(state)
  })

  it('is plain JSON far under half the 64 KB cap, at its largest', () => {
    let state = freshWash(4)
    state = markShown(throughPuddle(throughPuddle(state)), 'drip')
    state = { ...state, position: LADDER[LADDER.length - 1], seed: 2 ** 32 - 1 }
    const text = JSON.stringify(serializeWash(state))
    expect(text.length).toBeLessThan(1024)
    expect(text.length).toBeLessThan(32 * 1024)
  })

  it.each([null, undefined, 7, 'x', [], {}, { v: STATE_VERSION + 1, position: LADDER[2] }, { v: 0 }])('gives a fresh visit for %j', (raw) => {
    expect(deserializeWash(raw, null)).toEqual(freshWash(null))
  })

  it('repairs one damaged field and keeps the rest', () => {
    const good = markShown(washed(freshWash(null), coat(ROSTER[0].id, 'w')), 'drip')
    const raw = save(good) as Record<string, any>

    const shortGrid = deserializeWash({ ...raw, bay: { ...raw.bay, cells: 'ccc' } })
    expect(decode(shortGrid.bay.cells)).not.toBeNull()
    expect(shortGrid.next).toEqual(good.next)
    expect(shortGrid.shown).toEqual(['drip'])
    expect(shortGrid.bay.came).toBe(tally(decode(shortGrid.bay.cells)!).mud)

    const noSeed = deserializeWash({ ...raw, seed: Number.NaN })
    expect(noSeed.seed).toBe(freshWash(null).seed)
    expect(noSeed.bay).toEqual(good.bay)

    const junkShown = deserializeWash({ ...raw, shown: ['drip', 'drip', 'nonsense', 4] })
    expect(junkShown.shown).toEqual(['drip'])
    expect(deserializeWash({ ...raw, shown: 'drip' }).shown).toEqual([])

    const lostPlace = deserializeWash({ ...raw, position: 'groep-3' })
    expect(lostPlace.position).toBe(LADDER[0])
    expect(lostPlace.bay).toEqual(good.bay)

    const lowCame = deserializeWash({ ...raw, bay: { ...raw.bay, cells: encode(coat(ROSTER[0].id, 'c')), came: 1 } })
    expect(lowCame.bay.came).toBe(tally(coat(ROSTER[0].id, 'c')).mud)
  })

  it('refuses a grid that is not this vehicle\'s body, and a vehicle it does not know', () => {
    const raw = save(freshWash(null)) as Record<string, any>
    const wrongBody = deserializeWash({ ...raw, bay: { ...raw.bay, cells: encode(coat(ROSTER[2].id, 'd')) } })
    expect(wrongBody.bay.cells).not.toBe(encode(coat(ROSTER[2].id, 'd')))
    const stranger = deserializeWash({ ...raw, bay: { who: 'rocket', cells: raw.bay.cells, came: 3 } })
    expect(stranger.bay.who).toBe(ROSTER[0].id)
    expect(decode(stranger.bay.cells)).not.toBeNull()
  })

  it('never has the same vehicle in the bay and at the door, and is never left finished', () => {
    const raw = save(freshWash(null)) as Record<string, any>
    const twin = deserializeWash({ ...raw, next: { who: raw.bay.who, cells: raw.bay.cells }, finished: true })
    expect(twin.next.who).not.toBe(twin.bay.who)
    expect(decode(twin.next.cells)).not.toBeNull()
    expect(twin.finished).toBe(false)
  })
})

describe('how a wash is judged', () => {
  const body = tally(coat('tipper', 'd')).body
  const withMud = (n: number, patch: Patch = 'c'): Surface => {
    let left = n
    return coat('tipper', 'p').map((p) => (p !== '.' && left-- > 0 ? patch : p))
  }

  it('went well with a tenth or less still under mud or foam, wet or dry', () => {
    expect(judge(coat('tipper', 'w'), 30)).toBe('well')
    expect(judge(withMud(Math.floor(body * 0.1)), 30)).toBe('well')
    expect(judge(withMud(Math.floor(body * 0.1), 'f'), 30)).toBe('well')
  })

  it('went badly with more than half its mud still on as mud', () => {
    expect(judge(withMud(16), 30)).toBe('badly')
    expect(judge(coat('tipper', 's'), body)).toBe('badly')
  })

  it('is mixed otherwise: foam left on, or half the mud gone', () => {
    expect(judge(coat('tipper', 'b'), 30)).toBe('mixed')
    expect(judge(withMud(15), 30)).toBe('mixed')
  })
})

describe('sending a vehicle off', () => {
  const start = (position: string): WashState => ({ ...freshWash(null), position })

  it('brings in the one that waited, with the mud it stood in, and puts another at the door', () => {
    const before = freshWash(null)
    const { state, left } = sendOff(before)
    expect(left).toBe(before.bay.who)
    expect(state.bay.who).toBe(before.next.who)
    expect(state.bay.cells).toBe(before.next.cells)
    expect(state.bay.came).toBe(tally(decode(before.next.cells)!).mud)
    expect([state.bay.who, left]).not.toContain(state.next.who)
    expect(decode(state.next.cells)).not.toBeNull()
    expect(state.seed).not.toBe(before.seed)
    expect(state.finished).toBe(false)
    expect(state.shown).toBe(before.shown)
  })

  it('moves the place in the order one step up after a wash that went well', () => {
    const clean = washed(start(LADDER[0]), coat(ROSTER[0].id, 'p'))
    const { state, outcome } = sendOff(clean)
    expect(outcome).toBe('well')
    expect(state.position).toBe(LADDER[1])
    // The vehicle that now waits is muddy as the new place says: it has dried mud.
    expect(tally(decode(state.next.cells)!).c).toBeGreaterThan(0)
  })

  it('one step down after one that went badly, and not at all after a mixed one or at either end', () => {
    expect(sendOff(start(LADDER[1])).state.position).toBe(LADDER[0])
    expect(sendOff(start(LADDER[0])).state.position).toBe(LADDER[0])
    const foamy = washed(start(LADDER[1]), coat(ROSTER[0].id, 'b'))
    expect(sendOff(foamy).outcome).toBe('mixed')
    expect(sendOff(foamy).state.position).toBe(LADDER[1])
    const top = washed(start(LADDER[2]), coat(ROSTER[0].id, 'w'))
    expect(sendOff(top).state.position).toBe(LADDER[2])
  })

  it('goes round the whole roster and never repeats a vehicle straight away', () => {
    let state = freshWash(null)
    const seen = new Set<string>([state.bay.who])
    for (let i = 0; i < 24; i++) {
      const before = state
      state = sendOff(state).state
      expect(state.bay.who).not.toBe(before.bay.who)
      expect(state.next.who).not.toBe(state.bay.who)
      expect(state.next.who).not.toBe(before.bay.who)
      seen.add(state.bay.who)
    }
    expect(seen.size).toBe(ROSTER.length)
  })

  it('picks who waits from the seeded stream, never one that is excluded', () => {
    expect(whoNext(5, ['tipper'])).toEqual(whoNext(5, ['tipper']))
    for (let seed = 1; seed < 40; seed++) expect(['tipper', 'mixer']).not.toContain(whoNext(seed, ['tipper', 'mixer'])[0])
  })
})

describe('the puddle and what lands on the one that waits', () => {
  it('muddies the waiting vehicle twice and then has no more to add', () => {
    const fresh = freshWash(null)
    const once = throughPuddle(fresh), twice = throughPuddle(once)
    expect(tally(decode(once.next.cells)!).s).toBeGreaterThan(tally(decode(fresh.next.cells)!).s)
    expect(dipsLeft(decode(twice.next.cells)!)).toBe(0)
    expect(throughPuddle(twice)).toBe(twice)
    // The position is the child's place in the order: the puddle does not move it.
    expect(twice.position).toBe(fresh.position)
    expect(twice.bay).toBe(fresh.bay)
  })

  it('keeps what landed on the waiting vehicle, and rolls in with it', () => {
    const fresh = freshWash(null)
    const hat = coat(fresh.next.who, 'f')
    const state = landedOnNext(fresh, hat)
    expect(sendOff(state).state.bay.cells).toBe(encode(hat))
    expect(CELLS).toBe(hat.length)
  })
})
