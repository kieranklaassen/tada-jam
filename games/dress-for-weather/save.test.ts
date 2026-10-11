import { describe, expect, it } from 'vitest'
import { BUTTONS, GARMENTS, SPOTS, TUG_STEPS, ZIP_TEETH } from './kinds'
import { COAT_ON_UP_TO, deserialize, freshSave, serialize, type Save } from './save'
import { STATE_VERSION } from './state'

/** What ctx.storage hands back on the next visit. */
const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serialize(save)))

/** A hall with something on every part it can be on, every fastening done. */
function fullest(): Save {
  const save = freshSave(5)
  GARMENTS.forEach((garment, i) => { save.where[garment] = SPOTS[SPOTS.length - 1 - i] })
  const marks = Object.fromEntries(GARMENTS.map((garment) => [garment, 'snowy'])) as Save['marks']
  return { ...save, turn: 'grandfather', zip: ZIP_TEETH, buttons: Array.from({ length: BUTTONS }, () => true), tug: TUG_STEPS, open: true, weather: 'snow', back: true, marks, shown: ['door', 'out', 'vane'] }
}

describe('the saved hall', () => {
  it('comes back as it was left', () => {
    const save = fullest()
    expect(deserialize(stored(save), 3)).toEqual(save)
    const half: Save = { ...freshSave(5), zip: 5, buttons: [true, false, true], tug: 2 }
    half.where.hat = { who: 'dog', part: 'back' }
    half.where.boots = { who: 'grandfather', part: 'head' }
    expect(deserialize(stored(half), null)).toEqual(half)
  })

  it('opens a first visit by age, with both ends open: the raincoat on and unzipped for the youngest and for no age, everything on the rack from four', () => {
    for (const age of [null, 1, 2, COAT_ON_UP_TO]) {
      const save = deserialize(undefined, age)
      expect(save.where.raincoat).toEqual({ who: 'child', part: 'body' })
      expect(save.zip).toBe(0)
      for (const garment of GARMENTS) if (garment !== 'raincoat') expect(save.where[garment]).toBe('rack')
    }
    for (const age of [COAT_ON_UP_TO + 1, 6, 12, 40]) for (const garment of GARMENTS) expect(deserialize(undefined, age).where[garment]).toBe('rack')
  })

  it('lets a saved hall win over the age', () => {
    const save = freshSave(6)
    save.where.scarf = { who: 'baby', part: 'feet' }
    expect(deserialize(stored(save), 2)).toEqual(save)
    expect(deserialize(stored(freshSave(2)), 9)).toEqual(freshSave(2))
  })

  it.each([
    ['nothing', undefined], ['null', null], ['a string', 'rack'], ['a number', 3], ['an array', [1, 2]],
    ['a later version', { ...freshSave(5), v: STATE_VERSION + 1 }], ['no version', { where: {} }],
  ])('gives a first visit for %s', (_, raw) => {
    expect(deserialize(raw, 5)).toEqual(freshSave(5))
    expect(deserialize(raw, null)).toEqual(freshSave(null))
  })

  it('repairs each field by itself', () => {
    const base = stored(freshSave(5)) as Record<string, unknown>
    const read = (over: Record<string, unknown>) => deserialize({ ...base, ...over }, 5)
    expect(read({ where: 'everywhere' })).toEqual(freshSave(5))
    expect(read({ where: { hat: { who: 'dog', part: 'head' }, scarf: { who: 'nobody', part: 'neck' }, boots: { who: 'baby', part: 'elbow' }, mittens: 7, umbrella: { who: 'child', part: 'head' } } }).where).toEqual({ ...freshSave(5).where, umbrella: { who: 'child', part: 'head' } })
    // Two garments on one part: the later one in the rack's order goes back.
    const twice = read({ where: { hat: { who: 'child', part: 'head' }, umbrella: { who: 'child', part: 'head' } } }).where
    expect(twice.hat).toEqual({ who: 'child', part: 'head' })
    expect(twice.umbrella).toBe('rack')
    for (const zip of [-1, ZIP_TEETH + 1, 2.5, '4', null]) expect(read({ zip }).zip).toBe(0)
    for (const tug of [-1, TUG_STEPS + 1, 0.5, 'two']) expect(read({ tug }).tug).toBe(0)
    expect(read({ buttons: 'all' }).buttons).toEqual([false, false, false])
    expect(read({ buttons: [true, 'yes', 1, true, true] }).buttons).toEqual([true, false, false])
    // An umbrella on the rack is shut, whatever the record says.
    expect(read({ open: true }).open).toBe(false)
    expect(read({ open: true, where: { umbrella: { who: 'baby', part: 'hands' } } }).open).toBe(true)
    expect(read({ position: 'somewhere' })).toEqual(freshSave(5))
    for (const turn of ['dog', 'nobody', 3, null]) expect(read({ turn }).turn).toBe('child')
    expect(read({ turn: 'baby' }).turn).toBe('baby')
    for (const weather of ['fog', 2, null, ['sun']]) expect(read({ weather }).weather).toBe('rain')
    expect(read({ weather: 'wind' }).weather).toBe('wind')
    // What happens once is kept in its own order, and anything else is dropped.
    expect(read({ shown: ['vane', 'cat', 'door', 7, 'door'] }).shown).toEqual(['door', 'vane'])
    expect(read({ shown: 'door' }).shown).toEqual([])
  })

  it('holds the fields of the cycle to what the garments say', () => {
    const base = stored(freshSave(5)) as Record<string, unknown>
    const read = (over: Record<string, unknown>) => deserialize({ ...base, ...over }, 5)
    const hatOn = { hat: { who: 'child', part: 'head' } }, hatOnBaby = { hat: { who: 'baby', part: 'head' } }
    // Finished is said only of a middle figure with nothing on; back only of one that wears something.
    expect(read({ finished: true }).finished).toBe(true)
    expect(read({ finished: true, where: hatOn }).finished).toBe(false)
    expect(read({ finished: true, where: hatOnBaby }).finished).toBe(true)
    expect(read({ back: true }).back).toBe(false)
    expect(read({ back: true, where: hatOn }).back).toBe(true)
    expect(read({ back: true, where: hatOnBaby }).back).toBe(false)
    expect(read({ back: true, turn: 'baby', where: hatOnBaby }).back).toBe(true)
    // A garment on the rack is dry, and a mark nobody knows is dry.
    expect(read({ marks: { hat: 'wet', scarf: 'snowy' } }).marks).toEqual(freshSave(5).marks)
    expect(read({ marks: { hat: 'wet', scarf: 'muddy' }, where: { ...hatOn, scarf: { who: 'dog', part: 'back' } } }).marks).toEqual({ ...freshSave(5).marks, hat: 'wet' })
    expect(read({ marks: 'wet', where: hatOn }).marks).toEqual(freshSave(5).marks)
  })

  it('opens every first visit with the child in the middle, the vane at rain, nothing marked and nothing shown', () => {
    for (const age of [null, 2, 3, 4, 9]) expect(freshSave(age)).toMatchObject({ turn: 'child', weather: 'rain', back: false, finished: false, shown: [], zip: 0, tug: 0, open: false })
  })

  it('hands storage a copy, as plain small JSON', () => {
    const save = fullest(), copy = serialize(save)
    copy.buttons[0] = false
    copy.where.hat = 'rack'
    expect(save).toEqual(fullest())
    expect(JSON.parse(JSON.stringify(copy))).toEqual(copy)
    expect(JSON.stringify(serialize(save)).length).toBeLessThan(32 * 1024)
  })
})
