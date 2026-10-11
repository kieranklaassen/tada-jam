import { describe, expect, it } from 'vitest'
import { BARE_TREE_FROM_AGE, STARTING_PIECES, deserialize, freshSaved, serialize, type Saved } from './save'
import { STATE_VERSION } from './state'
import { FOLK, HOME, LANDINGS, PLACE_COUNT } from './tree'
import { KINDS } from './ways'

const through = (saved: Saved): Saved => deserialize(JSON.parse(JSON.stringify(serialize(saved))))

const busy = (): Saved => {
  const saved = freshSaved(8)
  saved.places = Array.from({ length: PLACE_COUNT }, (_, index) => KINDS[index % KINDS.length])
  saved.lifts = saved.places.map((kind, index) => (kind === 'bucket' && index % 2 === 1 ? 1 : 0))
  saved.folk = { squirrel: { at: 7, errand: 3 }, owl: { at: 4, errand: 'home' }, mice: { at: 5, errand: 'none' }, beetle: { at: 1, errand: 9 } }
  saved.newest = 9
  saved.night = true
  return saved
}

describe('a first visit', () => {
  it('finds three pieces in the tree below the bare-tree age and with no age, and a bare tree from it up', () => {
    for (const age of [null, 2, 4, BARE_TREE_FROM_AGE - 1]) {
      const saved = freshSaved(age)
      expect(saved.places.filter((kind) => kind !== null)).toHaveLength(STARTING_PIECES.length)
      for (const { place, kind } of STARTING_PIECES) expect(saved.places[place]).toBe(kind)
    }
    // The top is open: every age from the bare-tree age up, however old.
    for (const age of [BARE_TREE_FROM_AGE, 8, 12, 40]) expect(freshSaved(age).places.every((kind) => kind === null)).toBe(true)
  })

  it('has every walker at its own door with no errand, by day, at every age', () => {
    for (const age of [null, 3, 9]) {
      const saved = freshSaved(age)
      for (const folk of FOLK) expect(saved.folk[folk]).toEqual({ at: HOME[folk].landing, errand: 'none' })
      expect(saved.night).toBe(false)
      expect(saved.newest).toBeNull()
      expect(saved.position).toBe('oak')
    }
  })
})

describe('the saved tree', () => {
  it('comes back as it was', () => {
    const saved = busy()
    expect(through(saved)).toEqual(serialize(saved))
    expect(through(freshSaved(null))).toEqual(serialize(freshSaved(null)))
  })

  it('is plain data of a small size, at its fullest', () => {
    const text = JSON.stringify(serialize(busy()))
    expect(text.length).toBeLessThan(1024)
    expect(JSON.parse(text).v).toBe(STATE_VERSION)
  })

  it('gives a first visit for anything that is not a record of this version', () => {
    for (const raw of [null, undefined, 7, 'tree', [], { v: 99 }, { places: [] }]) {
      expect(deserialize(raw, 4)).toEqual(freshSaved(4))
      expect(deserialize(raw, 9)).toEqual(freshSaved(9))
    }
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const good = JSON.parse(JSON.stringify(serialize(busy()))) as Record<string, unknown>
    const whole = deserialize(good)
    const damage: [string, unknown, (saved: Saved) => void][] = [
      ['places', 'gone', (saved) => { expect(saved.places.every((kind) => kind === null)).toBe(true); expect(saved.newest).toBeNull(); expect(saved.folk.squirrel.errand).toBe('none') }],
      ['places', ['plank', 'rocket', 7, null], (saved) => expect(saved.places.slice(0, 4)).toEqual(['plank', null, null, null])],
      ['lifts', { 0: 1 }, (saved) => expect(saved.lifts.every((end) => end === 0)).toBe(true)],
      ['folk', 12, (saved) => { for (const folk of FOLK) expect(saved.folk[folk]).toEqual({ at: HOME[folk].landing, errand: 'none' }) }],
      ['folk', { squirrel: { at: 99, errand: 'moon' }, owl: null, mice: { at: 2.5 } }, (saved) => {
        expect(saved.folk.squirrel).toEqual({ at: HOME.squirrel.landing, errand: 'none' })
        expect(saved.folk.owl).toEqual({ at: HOME.owl.landing, errand: 'none' })
        expect(saved.folk.mice.at).toBe(HOME.mice.landing)
      }],
      ['newest', 400, (saved) => expect(saved.newest).toBeNull()],
      ['night', 'yes', (saved) => expect(saved.night).toBe(false)],
    ]
    for (const [field, value, check] of damage) {
      const saved = deserialize({ ...good, [field]: value })
      check(saved)
      for (const other of ['places', 'lifts', 'folk', 'newest', 'night'] as const) {
        if (other === field || field === 'places') continue
        expect(saved[other], `${other} after damage to ${field}`).toEqual(whole[other])
      }
    }
  })

  it('never reads a walker onto a landing that is not there, a bucket end where no bucket is, or an errand to an empty place', () => {
    const saved = deserialize({ v: STATE_VERSION, position: 'oak', finished: true, places: [null, 'bucket'], lifts: [1, 1, 1], folk: { owl: { at: LANDINGS.length, errand: 0 }, beetle: { at: -1, errand: 1 } }, newest: 0, night: true })
    expect(saved.lifts.slice(0, 3)).toEqual([0, 1, 0])
    expect(saved.folk.owl).toEqual({ at: HOME.owl.landing, errand: 'none' })
    expect(saved.folk.beetle).toEqual({ at: HOME.beetle.landing, errand: 1 })
    expect(saved.newest).toBeNull()
    expect(saved.finished).toBe(false)
    expect(saved.places).toHaveLength(PLACE_COUNT)
  })
})
