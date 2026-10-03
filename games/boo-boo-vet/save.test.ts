import { describe, expect, it } from 'vitest'
import { stream } from './arrivals'
import { comeIn, freshClinic, giveAtTheDoor, giveCare, join, putDown, stick, type Clinic } from './clinic'
import { LADDER } from './config'
import { CARES, FITS, OPEN, type Care } from './needs'
import { isWell, showing, type Patient } from './patient'
import { SAVE_BUDGET_BYTES, SAVE_CAP_BYTES, deserializeClinic, savedBytes, serializeClinic } from './save'
import { STATE_VERSION } from './state'

const SEED = 4711

/** Through storage and back: what the shell does between a put-away and the next opening. */
function reopened(clinic: Clinic, childAge: number | null = null, seed = 1): Clinic {
  return deserializeClinic(JSON.parse(JSON.stringify(serializeClinic(clinic))), childAge, seed)
}

function busyRoom(): Clinic {
  let clinic = comeIn(freshClinic(6, SEED), 'door').clinic
  clinic = giveCare(clinic, 'basket').clinic
  clinic = putDown(clinic, 'bowl', 'floor-right')
  clinic = join(clinic, 'blanket', 'basket').clinic
  clinic = join(clinic, 'plaster', 'blanket').clinic
  return stick(stick(clinic, 'mouse'), 'lamp')
}

describe('found as left', () => {
  it('reads a first visit back as it was', () => {
    const clinic = freshClinic(null, SEED)
    expect(reopened(clinic)).toEqual(clinic)
  })

  it('reads a busy room back exactly: the animal, its sign, the things, the pairs, the plasters', () => {
    const clinic = busyRoom()
    expect(reopened(clinic)).toEqual(clinic)
    expect(reopened(reopened(clinic))).toEqual(clinic)
  })

  it('is found as left at every instant of a long, careless visit', () => {
    const random = stream(5)
    const choose = <T,>(from: readonly T[]): T => from[Math.floor(random() * from.length)]
    let clinic = freshClinic(5, SEED)
    for (let move = 0; move < 800; move++) {
      const roll = random()
      if (!clinic.table || roll < 0.15) clinic = comeIn(clinic, clinic.carrier && random() < 0.5 ? 'carrier' : 'door').clinic
      else if (roll < 0.2) clinic = giveAtTheDoor(clinic, choose(CARES)).clinic
      else if (roll < 0.75) clinic = giveCare(clinic, choose(clinic.table.cart)).clinic
      else if (roll < 0.85) clinic = join(clinic, choose(CARES), choose(CARES)).clinic
      else if (roll < 0.93) clinic = putDown(clinic, choose(['bowl', 'blanket', 'brush', 'basket'] as const), choose(['cart', 'table-right', 'floor-left'] as const))
      else clinic = stick(clinic, choose(['mouse', 'waiting', 'lamp', 'table', 'floor'] as const))
      expect(reopened(clinic), `after move ${move}`).toEqual(clinic)
      expect(savedBytes(clinic)).toBeLessThan(2048)
    }
  })

  it('replays nothing and judges nothing on load: a well animal is still well, and the position is where it was', () => {
    let clinic = comeIn(freshClinic(null, SEED), 'door').clinic
    clinic = giveCare(clinic, 'bowl').clinic
    expect(clinic).toMatchObject({ finished: true, position: 'blanket' })
    const again = reopened(reopened(clinic))
    expect(again).toMatchObject({ finished: true, position: 'blanket' })
    expect(isWell(again.table!)).toBe(true)
    // The next one still waits for the child's touch.
    expect(again.waiting).toEqual(clinic.waiting)
  })

  it('keeps a sign at the step it had reached, in the middle of a patient', () => {
    let clinic = comeIn(freshClinic(6, SEED), 'door').clinic
    const fitting = FITS[showing(clinic.table!)!.need]
    for (const care of CARES.filter((care) => care !== fitting).slice(0, 2)) clinic = giveCare(clinic, care).clinic
    const back = reopened(clinic)
    expect(showing(back.table!)).toMatchObject({ step: OPEN, met: false })
    expect(back.table!.wrong).toBe(2)
    // The well scene can still look back at each thing that did not fit, in the order it was tried.
    expect(back.table!.tried).toEqual(CARES.filter((care) => care !== fitting).slice(0, 2))
    expect(back.finished).toBe(false)
  })

  it('lets a saved position win over the age, and uses the seed it was given only on a first visit', () => {
    const clinic = { ...freshClinic(null, SEED), position: 'quiet' }
    const back = reopened(clinic, 3, 999)
    expect(back.position).toBe('quiet')
    expect(back.seed).toBe(SEED)
    expect(deserializeClinic(undefined, 4, 999)).toMatchObject({ seed: 999, position: 'blanket' })
  })
})

describe('a save that cannot be trusted', () => {
  it('opens as a first visit for anything that is not this game\'s record, and for a version it does not know', () => {
    const first = freshClinic(null, 7)
    for (const raw of [undefined, null, 0, 'room', [], {}, { v: STATE_VERSION + 1, position: 'two' }, { position: 'two' }]) {
      expect(deserializeClinic(raw, null, 7)).toEqual(first)
    }
  })

  it('opens from a record that holds only the version', () => {
    const clinic = deserializeClinic({ v: STATE_VERSION }, 5, 7)
    expect(clinic).toMatchObject({ position: 'plaster', finished: false, table: null, carrier: null, garden: [], seed: 7 })
    expect(clinic.waiting.needs.length).toBeGreaterThan(0)
  })

  it('repairs each field by itself and keeps the rest', () => {
    const good = busyRoom()
    const stored = JSON.parse(JSON.stringify(serializeClinic(good))) as Record<string, unknown>
    const damaged: [string, unknown, (clinic: Clinic) => void][] = [
      ['position', 'grade-9', (clinic) => expect(clinic.position).toBe(LADDER[0])],
      ['seed', -3.5, (clinic) => expect(clinic.seed).toBe(1)],
      ['drawn', 'many', (clinic) => expect(clinic.drawn).toBe(1)],
      ['table', { species: 'dragon' }, (clinic) => { expect(clinic.table).toBeNull(); expect(clinic.finished).toBe(false) }],
      ['waiting', 12, (clinic) => expect(clinic.waiting.needs.length).toBeGreaterThan(0)],
      ['carrier', 'box', (clinic) => expect(clinic.carrier).toBeNull()],
      ['garden', [{ species: 'cat' }, 5, { species: 'duck', keeps: ['bowl', 'bowl', 'needle'] }], (clinic) => expect(clinic.garden).toEqual([{ species: 'duck', keeps: ['bowl'] }])],
      ['shown', ['brush', 'brush', 'sword'], (clinic) => expect(clinic.shown).toEqual(['bowl', 'brush'])],
      ['things', { bowl: 'moon', brush: 'on-basket', plasters: ['mouse', 'sky', 'lamp', 'floor'] }, (clinic) => expect(clinic.things).toEqual({ bowl: 'cart', blanket: 'cart', brush: 'cart', basket: 'cart', plasters: ['lamp', 'floor'] })],
      ['made', { foam: 1, boat: true, patches: 40 }, (clinic) => expect(clinic.made).toMatchObject({ foam: false, boat: true, patches: 0 })],
    ]
    for (const [field, value, check] of damaged) {
      const clinic = deserializeClinic({ ...stored, [field]: value }, null, 1)
      check(clinic)
      for (const other of ['table', 'waiting', 'garden', 'shown', 'made'] as const) {
        if (other !== field && !(field === 'things' && other === 'made') && !(field === 'table' && other === 'waiting')) expect(clinic[other], `${other} with ${field} damaged`).toEqual(good[other])
      }
    }
  })

  it('never lets the den and the blanket disagree, and puts nothing on an animal that is not there', () => {
    const good = JSON.parse(JSON.stringify(serializeClinic(busyRoom()))) as Record<string, unknown>
    expect(deserializeClinic({ ...good, made: { den: false } }, null, 1).made.den).toBe(true)
    const empty = deserializeClinic({ ...good, table: null, things: { bowl: 'patient', plasters: ['patient', 'mouse'] } }, null, 1)
    expect(empty.things).toMatchObject({ bowl: 'cart', plasters: ['mouse'] })
  })

  it('always has one who waits', () => {
    const stored = JSON.parse(JSON.stringify(serializeClinic(busyRoom()))) as Record<string, unknown>
    const clinic = deserializeClinic({ ...stored, waiting: null }, null, 1)
    expect(clinic.waiting.species).not.toBe(clinic.table!.species)
    expect(clinic.drawn).toBe((stored.drawn as number) + 1)
  })
})

describe('the size of a save', () => {
  it('keeps the largest legal room under half the cap, and under 2 KB', () => {
    const fullest = (species: Patient['species'], fromCarrier: boolean): Patient => ({
      species,
      at: 'two-quiet',
      needs: [{ need: 'thirsty', step: OPEN, met: true }, { need: 'scared', step: OPEN, met: false }],
      wrong: 2,
      tried: [...CARES],
      cart: [...CARES],
      fromCarrier,
    })
    const largest: Clinic = {
      v: STATE_VERSION,
      position: 'two-quiet',
      finished: false,
      seed: 0x7fffffff,
      drawn: 0x7fffffff,
      table: fullest('hedgehog', true),
      waiting: fullest('hedgehog', false),
      carrier: fullest('hedgehog', true),
      garden: [1, 2, 3].map(() => ({ species: 'hedgehog' as const, keeps: ['blanket', 'plaster'] as Care[] })),
      shown: [...CARES],
      things: { bowl: 'floor-right', blanket: 'on-basket', brush: 'table-right', basket: 'floor-right', plasters: ['waiting', 'patient'] },
      made: { den: true, foam: true, boat: true, crackle: true, patches: 3 },
    }
    const bytes = savedBytes(largest)
    expect(bytes).toBeLessThan(2048)
    expect(bytes).toBeLessThan(SAVE_BUDGET_BYTES)
    expect(SAVE_BUDGET_BYTES).toBe(SAVE_CAP_BYTES / 2)
    // And it is a legal room: it reads back as itself.
    expect(reopened(largest)).toEqual(largest)
  })

  it('writes these fields and no others', () => {
    const stored = serializeClinic({ ...busyRoom(), stray: 'field' } as Clinic)
    expect(Object.keys(stored).sort()).toEqual(['carrier', 'drawn', 'finished', 'garden', 'made', 'position', 'seed', 'shown', 'table', 'things', 'v', 'waiting'])
  })
})
