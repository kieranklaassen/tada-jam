import { describe, expect, it } from 'vitest'
import { stream } from './arrivals'
import { GARDEN_HOLDS, MOVABLES, PLASTERS_KEPT, comeIn, freshClinic, giveCare, join, putDown, stick, strokePatient, type Clinic } from './clinic'
import { LADDER } from './config'
import { CARES, FITS, NEEDS, type Care, type Need } from './needs'
import { isWell, showing } from './patient'

const SEED = 20261003

/** Brings the next one in from the door. */
function next(clinic: Clinic): Clinic {
  return comeIn(clinic, 'door').clinic
}

/** Gives the animal on the table the care that fits each of its needs, first time. */
function makeWell(clinic: Clinic): Clinic {
  let current = clinic
  while (current.table && !isWell(current.table)) current = giveCare(current, FITS[showing(current.table)!.need]).clinic
  return current
}

describe('a first visit', () => {
  it('opens on an empty table with the first patient at the door and every thing on the cart', () => {
    const clinic = freshClinic(null, SEED)
    expect(clinic).toMatchObject({ position: 'bowl', finished: false, table: null, carrier: null, garden: [], shown: ['bowl'], drawn: 1 })
    expect(clinic.waiting.needs).toEqual([{ need: 'thirsty', step: 1, met: false }])
    expect(clinic.waiting.cart).toEqual(['bowl'])
    for (const thing of MOVABLES) expect(clinic.things[thing]).toBe('cart')
  })

  it('starts older children further on, with one thing at most still to be shown and a first patient whose need is already known', () => {
    const four = freshClinic(4, SEED)
    expect(four).toMatchObject({ position: 'blanket', shown: ['bowl'] })
    expect(four.waiting.cart).toEqual(['bowl', 'blanket'])
    expect(four.waiting.needs[0].need).toBe('thirsty')
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const six = freshClinic(6, seed)
      expect(six).toMatchObject({ position: 'plaster', shown: ['bowl', 'blanket'] })
      expect(['thirsty', 'cold']).toContain(six.waiting.needs[0].need)
    }
  })
})

describe('coming in', () => {
  it('brings the one who waits onto the table when the child touches it, and lays out the next', () => {
    const before = freshClinic(null, SEED)
    const { clinic, cameIn } = comeIn(before, 'door')
    expect(clinic.table).toEqual(before.waiting)
    expect(clinic.waiting).not.toEqual(before.waiting)
    expect(clinic.waiting.species).not.toBe(clinic.table!.species)
    expect(clinic.drawn).toBe(2)
    expect(cameIn).toEqual({ from: 'door', left: null, swapped: false, showing: null })
  })

  it('has the mouse show a new thing once, while the patient in front has a need already known, and gives the next patient the new need', () => {
    const { clinic, cameIn } = comeIn(freshClinic(4, SEED), 'door')
    expect(cameIn?.showing).toBe('blanket')
    expect(clinic.shown).toEqual(['bowl', 'blanket'])
    expect(clinic.table!.needs[0].need).toBe('thirsty')
    expect(clinic.waiting.needs[0].need).toBe('cold')
    // Once shown, never again.
    expect(comeIn(makeWell(clinic), 'door').cameIn?.showing).toBeNull()
  })

  it('sends a well animal to the garden with what helped it, and keeps the last three', () => {
    let clinic = freshClinic(null, SEED)
    const helped: string[] = []
    for (let round = 0; round < 6; round++) {
      clinic = makeWell(next(clinic))
      helped.push(clinic.table!.species)
    }
    clinic = next(clinic)
    expect(clinic.garden).toHaveLength(GARDEN_HOLDS)
    expect(clinic.garden.map((kept) => kept.species)).toEqual(helped.slice(-GARDEN_HOLDS))
    for (const kept of clinic.garden) expect(kept.keeps.length).toBeGreaterThan(0)
  })

  it('lets an animal that still has a need change places with the newcomer, keeping everything about it and judging nothing', () => {
    const seated = giveCare(next(freshClinic(6, SEED)), 'basket').clinic
    const unwell = seated.table!
    expect(unwell.wrong).toBe(1)
    const { clinic, cameIn } = comeIn(seated, 'door')
    expect(cameIn).toMatchObject({ swapped: true, left: null })
    expect(clinic.table).toEqual(seated.waiting)
    expect(clinic.waiting).toEqual(unwell)
    expect(clinic).toMatchObject({ drawn: seated.drawn, position: seated.position, garden: [], finished: false })
    // And back again: it is found as it was.
    expect(comeIn(clinic, 'door').clinic.table).toEqual(unwell)
  })

  it('does nothing when the child touches a carrier that is not there', () => {
    const clinic = freshClinic(null, SEED)
    expect(comeIn(clinic, 'carrier')).toEqual({ clinic, cameIn: null })
  })

  it('puts every thing back on the cart, keeps the stuck plasters, and takes the den apart', () => {
    let clinic = next(freshClinic(6, SEED))
    clinic = putDown(clinic, 'bowl', 'floor-left')
    clinic = join(clinic, 'blanket', 'basket').clinic
    clinic = stick(clinic, 'mouse')
    expect(clinic.things.blanket).toBe('on-basket')
    clinic = next(makeWell(clinic))
    for (const thing of MOVABLES) expect(clinic.things[thing]).toBe('cart')
    expect(clinic.things.plasters).toEqual(['mouse'])
    expect(clinic.made.den).toBe(false)
  })
})

describe('giving a care in the room', () => {
  it('gives nothing when nobody is on the table', () => {
    const clinic = freshClinic(null, SEED)
    expect(giveCare(clinic, 'bowl')).toEqual({ clinic, gave: null })
    expect(strokePatient(clinic)).toBeNull()
  })

  it('judges the cycle the moment the last need is met, once, and saves it as finished', () => {
    const seated = next(freshClinic(null, SEED))
    const { clinic, gave } = giveCare(seated, 'bowl')
    expect(gave?.answer).toMatchObject({ kind: 'helps', well: true })
    expect(clinic).toMatchObject({ finished: true, position: 'blanket' })
    // More gives are play: nothing is judged again.
    const again = giveCare(giveCare(clinic, 'bowl').clinic, 'bowl').clinic
    expect(again).toMatchObject({ finished: true, position: 'blanket' })
  })

  it('never moves the position inside a cycle', () => {
    let clinic = next(freshClinic(6, SEED))
    const fitting = FITS[clinic.table!.needs[0].need]
    for (const care of CARES.filter((care) => care !== fitting)) {
      clinic = giveCare(clinic, care).clinic
      expect(clinic).toMatchObject({ position: 'plaster', finished: false })
    }
    expect(giveCare(clinic, fitting).clinic).toMatchObject({ position: 'blanket', finished: true })
  })

  it('leaves a thing that fitted on the animal and one that did not beside it, and loses none', () => {
    const seated = next(freshClinic(4, SEED))
    const missed = giveCare(seated, 'blanket').clinic
    expect(missed.things.blanket).toBe('table-left')
    const helped = giveCare(missed, 'bowl').clinic
    expect(helped.things.bowl).toBe('patient')
    const stuck = giveCare(seated, 'plaster').clinic
    expect(stuck.things.plasters).toEqual(['table'])
    let many = seated
    for (let index = 0; index < 5; index++) many = giveCare(many, 'plaster').clinic
    expect(many.things.plasters).toHaveLength(PLASTERS_KEPT)
  })

  it('plays an animal\'s own scene whenever a well one is given the thing it loves', () => {
    let clinic = makeWell(next(freshClinic(null, SEED)))
    clinic = { ...clinic, table: { ...clinic.table!, species: 'duck' } }
    expect(giveCare(clinic, 'bowl').gave).toMatchObject({ signature: true, answer: { kind: 'play', taste: 'loves' } })
    expect(giveCare(clinic, 'bowl').gave?.signature).toBe(true)
    expect(giveCare(clinic, 'brush').gave?.signature).toBe(false)
  })
})

describe('the pairs in the room', () => {
  const seated = next(freshClinic(6, SEED))

  it('makes the den from the blanket and the basket, and takes it apart when the blanket is moved', () => {
    const { clinic, secret } = join(seated, 'basket', 'blanket')
    expect(secret).toBe('den')
    expect(clinic).toMatchObject({ made: { den: true }, things: { blanket: 'on-basket' } })
    expect(putDown(clinic, 'blanket', 'floor-right').made.den).toBe(false)
    expect(giveCare(clinic, 'blanket').clinic.made.den).toBe(false)
    expect(giveCare(clinic, 'basket').clinic.made.den).toBe(true)
  })

  it('makes foam that gives the next one who drinks a beard, once', () => {
    const foamy = join(seated, 'brush', 'bowl').clinic
    expect(foamy).toMatchObject({ made: { foam: true }, things: { brush: 'cart' } })
    const thirsty = { ...foamy, table: { ...foamy.table!, needs: [{ need: 'thirsty' as Need, step: 1 as const, met: false }] } }
    const drank = giveCare(thirsty, 'bowl')
    expect(drank.gave?.beard).toBe(true)
    expect(drank.clinic.made.foam).toBe(false)
    expect(giveCare(drank.clinic, 'bowl').gave?.beard).toBe(false)
  })

  it('keeps the foam and the crackle for the next patient, so a joke can be made ready', () => {
    const ready = join(join(seated, 'brush', 'bowl').clinic, 'brush', 'blanket').clinic
    const later = next(makeWellWithout(ready, ['bowl', 'blanket']))
    expect(later.made).toMatchObject({ foam: true, crackle: true })
  })

  it('makes the blanket crackle so the next one under it comes out with its fur on end, once', () => {
    const crackly = join(seated, 'blanket', 'brush').clinic
    const cold = { ...crackly, table: { ...crackly.table!, needs: [{ need: 'cold' as Need, step: 1 as const, met: false }] } }
    const wrapped = giveCare(cold, 'blanket')
    expect(wrapped.gave?.furOnEnd).toBe(true)
    expect(giveCare(wrapped.clinic, 'blanket').gave?.furOnEnd).toBe(false)
  })

  it('floats a plaster as a boat and keeps up to three patches on the blanket', () => {
    expect(join(seated, 'plaster', 'bowl').clinic.made.boat).toBe(true)
    let clinic = seated
    for (let index = 0; index < 5; index++) clinic = join(clinic, 'plaster', 'blanket').clinic
    expect(clinic.made.patches).toBe(3)
  })

  it('changes nothing where two things make nothing', () => {
    expect(join(seated, 'bowl', 'basket')).toEqual({ clinic: seated, secret: null })
  })
})

/** Makes the animal on the table well without using the named things, by swapping in a need that another thing fits. */
function makeWellWithout(clinic: Clinic, spare: Care[]): Clinic {
  const need = NEEDS.find((candidate) => !spare.includes(FITS[candidate]))!
  return giveCare({ ...clinic, table: { ...clinic.table!, needs: [{ need, step: 1, met: false }] } }, FITS[need]).clinic
}

describe('a child who reads every sign', () => {
  it('meets each need only after its thing was shown, climbs one step at a time, and reaches the top', () => {
    let clinic = freshClinic(null, SEED)
    const met: Need[] = []
    const positions: string[] = [clinic.position]
    for (let patients = 0; patients < 60; patients++) {
      const shownBefore = clinic.shown
      const arrival = comeIn(clinic, 'door')
      clinic = arrival.clinic
      for (const entry of clinic.table!.needs) {
        // The need was known before this patient came in: the thing shown now is never the answer in front of the child.
        expect(shownBefore, `patient ${patients}`).toContain(FITS[entry.need])
        if (!met.includes(entry.need)) met.push(entry.need)
      }
      clinic = makeWell(clinic)
      if (clinic.position !== positions[positions.length - 1]) positions.push(clinic.position)
    }
    expect(met).toEqual([...NEEDS])
    expect(positions).toEqual([...LADDER])
    expect(clinic.shown).toEqual([...CARES])
  })

  it('shows a new position on the patient after next, never on the one who was already waiting', () => {
    let clinic = next(freshClinic(null, SEED))
    const alreadyWaiting = clinic.waiting
    clinic = makeWell(clinic)
    expect(clinic.position).toBe('blanket')
    expect(clinic.waiting).toBe(alreadyWaiting)
    clinic = next(clinic)
    expect(clinic.table!.at).toBe('bowl')
    expect(clinic.waiting.at).toBe('blanket')
  })
})

describe('a child who taps anything', () => {
  it('is never stuck, never leaves the ladder, and the room never holds more than it may', () => {
    for (const seed of [11, 12, 13]) {
      const random = stream(seed)
      const choose = <T,>(from: readonly T[]): T => from[Math.floor(random() * from.length)]
      let clinic = freshClinic(choose([null, 3, 4, 5, 6]), seed)
      for (let move = 0; move < 1500; move++) {
        const roll = random()
        if (!clinic.table || roll < 0.12) clinic = comeIn(clinic, clinic.carrier && random() < 0.5 ? 'carrier' : 'door').clinic
        else if (roll < 0.8) clinic = giveCare(clinic, choose(clinic.table.cart)).clinic
        else if (roll < 0.9) clinic = join(clinic, choose(CARES), choose(CARES)).clinic
        else clinic = stick(clinic, choose(['mouse', 'waiting', 'lamp'] as const))
        expect(LADDER).toContain(clinic.position)
        expect(clinic.garden.length).toBeLessThanOrEqual(GARDEN_HOLDS)
        expect(clinic.things.plasters.length).toBeLessThanOrEqual(PLASTERS_KEPT)
        expect(clinic.finished).toBe(clinic.table !== null && isWell(clinic.table))
        for (const patient of [clinic.table, clinic.waiting, clinic.carrier]) {
          if (patient) for (const entry of patient.needs) expect(patient.cart).toContain(FITS[entry.need])
        }
      }
    }
  })
})
