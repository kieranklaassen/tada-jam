import { describe, expect, it } from 'vitest'
import { HOME_COL, LOOP, faults } from './board'
import { HOPS, visitAt } from './careful'
import { LADDER } from './config'
import { THINGS } from './crossing'
import { hop } from './play'
import { below, makeRng } from './rng'
import { boardOf, deserialize, serialize, type Saved } from './save'
import { STATE_VERSION } from './state'

const SEED = 1
const roundTrip = (saved: Saved): Saved => deserialize(JSON.parse(JSON.stringify(serialize(saved))), null, SEED)

describe('the saved game', () => {
  it('opens a first visit on a crossing from the burrow, with the next one laid, the family in a line and nothing shown', () => {
    const saved = deserialize(undefined, null, SEED)
    expect(saved.position).toBe(LADDER[0])
    expect(saved.finished).toBe(false)
    expect(saved.crossing.home).toBe('burrow')
    expect(saved.crossing.from).toBe(LADDER[0])
    expect(saved.next.home).toBe('cloth')
    expect(saved.family.map((pawn) => [pawn.c, pawn.r])).toEqual([2, 3, 4, 5].map((r) => [HOME_COL, r]))
    expect(saved.shown).toEqual([])
    expect(saved.mishaps).toBe(0)
    expect(faults(boardOf(saved))).toEqual([])
    // The same seed lays the same first visit, so a still can be taken again.
    expect(deserialize(undefined, null, SEED)).toEqual(saved)
    expect(deserialize(undefined, null, SEED + 1).crossing).not.toEqual(saved.crossing)
  })

  it('starts a first visit by age and never holds anyone to it: no age and the youngest start with the cars, and both ends are open', () => {
    const first = (age: number | null) => deserialize(undefined, age, SEED).position
    expect([null, 2, 5].map(first)).toEqual(['cars', 'cars', 'cars'])
    expect([6, 7].map(first)).toEqual(['logs', 'logs'])
    expect([8, 9, 12, 40].map(first)).toEqual(['bell', 'bell', 'bell', 'bell'])
    // A saved position wins over any age, in both directions.
    expect(deserialize(serialize(visitAt('all', SEED)), 5, SEED).position).toBe('all')
    expect(deserialize(serialize(visitAt('cars', SEED)), 9, SEED).position).toBe('cars')
  })

  it('is found as left after every hop of a long walk on every position, flat pawns and riders included', () => {
    let flat = 0, riding = 0
    for (const position of LADDER) {
      const rng = makeRng(7)
      let saved = visitAt(position, 2)
      for (let n = 0; n < 120; n++) {
        saved = hop(saved, HOPS[below(rng, HOPS.length)]).saved
        const back = roundTrip(saved)
        expect(back).toEqual(serialize(saved))
        flat += back.family.filter((pawn) => pawn.flat).length
        riding += back.family.filter((pawn) => pawn.on).length
      }
    }
    expect(flat).toBeGreaterThan(0)
    expect(riding).toBeGreaterThan(0)
  })

  it('is found as left with a lorry in the tunnel the train shoved it into, and lays the board anew for a count no step could leave', () => {
    const saved = visitAt('cars', 2)
    const waiting = (count: number, at: number): Saved => ({
      ...saved,
      crossing: { ...saved.crossing, lanes: saved.crossing.lanes.map((lane, i) => (i === 1 ? { kind: 'grass' as const, movers: [] } : i === 2 ? { kind: 'railroad' as const, movers: [{ kind: 'lorry' as const, at, dir: 1 as const, count }], train: { arch: 'near' as const, awake: false }, bell: { dc: -1 as const, r: 2 } } : lane)) },
    })
    for (const count of [1, 2, 3]) expect(roundTrip(waiting(count, 7))).toEqual(serialize(waiting(count, 7)))
    // A count on a lorry in sight, or one too long, is no state a step leaves.
    expect(roundTrip(waiting(2, 3))).not.toEqual(serialize(waiting(2, 3)))
    expect(roundTrip(waiting(9, 7))).not.toEqual(serialize(waiting(9, 7)))
  })

  it('keeps the position and what the duck has shown, and lays the board anew, when the board is damaged or could not have been left by a step', () => {
    const good = serialize({ ...visitAt('logs', SEED), shown: ['cars', 'logs'] })
    const lanes = good.crossing.lanes
    const damaged: unknown[] = [
      { ...good, crossing: undefined },
      { ...good, next: undefined },
      { ...good, next: { ...good.next, home: 'burrow' } },
      { ...good, crossing: { ...good.crossing, lanes: lanes.slice(1) } },
      { ...good, crossing: { ...good.crossing, from: 'nowhere' } },
      { ...good, crossing: { ...good.crossing, lanes: lanes.map((lane) => ({ ...lane, kind: 'lava' })) } },
      { ...good, crossing: { ...good.crossing, lanes: lanes.map((lane) => ({ ...lane, movers: lane.movers.map((mover) => ({ ...mover, at: LOOP })) })) } },
      { ...good, crossing: { ...good.crossing, lanes: lanes.map((lane) => ({ ...lane, movers: [...lane.movers, ...lane.movers] })) } },
      { ...good, crossing: { ...good.crossing, lanes: lanes.map((lane, i) => (i === 0 ? { ...lane, kind: 'rails', train: { arch: 'far', awake: false }, bell: { dc: -1, r: 2 } } : lane)) } },
      { ...good, crossing: { ...good.crossing, lanes: lanes.map((lane, i) => (i === 1 ? { ...lane, bell: { dc: 0, r: 2 } } : lane)) } },
      { ...good, family: 'four' },
      { ...good, family: good.family.slice(1) },
      { ...good, family: good.family.map((pawn) => ({ ...pawn, c: 0, r: 2 })) },
      { ...good, family: good.family.map((pawn, who) => (who === 0 ? { ...pawn, on: { index: 3, part: 0 } } : pawn)) },
      { ...good, family: good.family.map((pawn, who) => (who === 0 ? { ...pawn, r: 2.5 } : pawn)) },
      { ...good, family: good.family.map((pawn, who) => (who === 0 ? { ...pawn, dry: null } : pawn)) },
    ]
    for (const raw of damaged) {
      const saved = deserialize(JSON.parse(JSON.stringify(raw)), null, SEED)
      expect(saved.position).toBe('logs')
      expect(saved.shown).toEqual(['cars', 'logs'])
      expect(saved.crossing.from).toBe('logs')
      expect(saved.finished).toBe(false)
      expect(faults(boardOf(saved))).toEqual([])
    }
  })

  it('repairs the small fields one by one and keeps the board', () => {
    const good = serialize(visitAt('turtle', SEED))
    const saved = deserialize(JSON.parse(JSON.stringify({ ...good, mishaps: 99, shown: ['bell', 'pie', 7, 'cars'], seed: 'x' })), null, 77)
    expect(saved.mishaps).toBe(0)
    expect(saved.shown).toEqual(['cars', 'bell'])
    expect(saved.seed).toBe(77)
    expect(boardOf(saved)).toEqual(boardOf(good))
  })

  it('opens a fresh first visit for anything that is not this game\'s record', () => {
    for (const raw of [null, 7, 'board', [], { v: STATE_VERSION + 1 }]) {
      const saved = deserialize(raw, null, SEED)
      expect(faults(boardOf(saved))).toEqual([])
      expect(saved.finished).toBe(false)
      expect(saved.shown).toEqual([])
    }
  })

  it('stays far under half of the 64 KB a slot may hold', () => {
    // The fullest it gets: the position with the most on its lanes, everything shown, every pawn flat and riding.
    let most = 0
    for (const position of LADDER) {
      for (let seed = 1; seed <= 8; seed++) {
        const saved = visitAt(position, seed)
        const full: Saved = { ...saved, shown: [...THINGS], mishaps: 9, family: saved.family.map((pawn) => ({ ...pawn, flat: true, on: { index: 1, part: 1 } })) }
        most = Math.max(most, JSON.stringify(serialize(full)).length)
      }
    }
    expect(most).toBeLessThan(8 * 1024)
  })
})
