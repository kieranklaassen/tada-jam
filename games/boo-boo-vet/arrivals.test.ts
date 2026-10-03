import { describe, expect, it } from 'vitest'
import { carrierArrives, layOut, stream, type LayOut } from './arrivals'
import { SPECIES } from './cast'
import { LADDER } from './config'
import { rung } from './ladder'
import { CARES, FITS, NEEDS, PLAIN, QUIET, type Care } from './needs'
import type { Patient } from './patient'

const base: LayOut = { position: 'basket', seed: 20261003, drawn: 0, shown: CARES, recent: [] }

/** A run of layouts, each seeing the two before it as still in view. */
function run(count: number, over: Partial<LayOut> = {}): Patient[] {
  const laid: Patient[] = []
  for (let drawn = 0; drawn < count; drawn++) laid.push(layOut({ ...base, ...over, drawn, recent: laid.slice(-2).reverse() }))
  return laid
}

describe('the seeded stream', () => {
  it('gives the same numbers for the same seed, and numbers from 0 up to 1', () => {
    const one = stream(7), other = stream(7)
    for (let index = 0; index < 100; index++) {
      const value = one()
      expect(value).toBe(other())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('laying out a patient', () => {
  it('gives the same patient for the same seed and count, every time', () => {
    for (let drawn = 0; drawn < 20; drawn++) expect(layOut({ ...base, drawn })).toEqual(layOut({ ...base, drawn }))
  })

  it('gives another child another order', () => {
    const one = run(30).map((patient) => patient.species + patient.needs[0].need).join()
    const other = run(30, { seed: 99 }).map((patient) => patient.species + patient.needs[0].need).join()
    expect(one).not.toBe(other)
  })

  it('lays out what the position says: its needs, its cart, the step a sign starts at, how many needs', () => {
    for (const position of LADDER) {
      const step = rung(position)
      for (const patient of run(60, { position })) {
        expect(patient.at).toBe(position)
        expect(patient.cart).toEqual(step.cart)
        expect(patient.needs).toHaveLength(step.needs.length > 1 ? step.perPatient : 1)
        expect(patient.wrong).toBe(0)
        for (const entry of patient.needs) {
          expect(step.needs).toContain(entry.need)
          expect(entry.step).toBe(step.start)
          expect(entry.met).toBe(false)
          expect(patient.cart).toContain(FITS[entry.need])
        }
      }
    }
    expect(layOut({ ...base, position: 'quiet' }).needs[0].step).toBe(QUIET)
    expect(layOut({ ...base, position: 'bowl' }).needs[0].step).toBe(PLAIN)
  })

  it('gives a patient two different needs where two are asked', () => {
    for (const patient of run(200, { position: 'two' })) expect(patient.needs[0].need).not.toBe(patient.needs[1].need)
  })

  it('brings every animal and every need in play, none of them rarely', () => {
    const laid = run(600)
    for (const species of SPECIES) expect(laid.filter((patient) => patient.species === species).length, species).toBeGreaterThan(60)
    for (const need of NEEDS) expect(laid.filter((patient) => patient.needs[0].need === need).length, need).toBeGreaterThan(70)
  })

  it('never brings the same animal as one still in view', () => {
    const laid = run(300)
    for (let index = 2; index < laid.length; index++) {
      expect(laid[index].species).not.toBe(laid[index - 1].species)
      expect(laid[index].species).not.toBe(laid[index - 2].species)
    }
  })

  it('never brings the same need three times in a row where another is in play', () => {
    for (const position of ['blanket', 'plaster', 'basket']) {
      const laid = run(400, { position })
      for (let index = 2; index < laid.length; index++) {
        const three = [laid[index - 2], laid[index - 1], laid[index]].map((patient) => patient.needs[0].need)
        expect(new Set(three).size, `${position} at ${index}`).toBeGreaterThan(1)
      }
    }
    // With one need in play there is nothing else to bring.
    expect(new Set(run(10, { position: 'bowl' }).map((patient) => patient.needs[0].need))).toEqual(new Set(['thirsty']))
  })

  it('never gives a need whose thing the mouse has not shown, though the thing is on the cart', () => {
    const shown: Care[] = ['bowl', 'blanket']
    for (const patient of run(200, { position: 'plaster', shown })) {
      expect(patient.cart).toContain('plaster')
      expect(['thirsty', 'cold']).toContain(patient.needs[0].need)
    }
    for (const patient of run(100, { position: 'two', shown: ['bowl'] })) expect(patient.needs.map((entry) => entry.need)).toEqual(['thirsty'])
  })

  it('gives the patient laid out during a showing the need of the thing shown', () => {
    for (let drawn = 0; drawn < 50; drawn++) {
      const patient = layOut({ ...base, position: 'plaster', shown: ['bowl', 'blanket', 'plaster'], justShown: 'plaster', drawn })
      expect(patient.needs[0].need).toBe('sore')
    }
  })

  it('marks the one from the carrier, and lays it out by a stream of its own', () => {
    const waiting = run(40).map((patient) => patient.species + patient.needs[0].need).join()
    const carried = run(40, { fromCarrier: true })
    expect(carried.every((patient) => patient.fromCarrier)).toBe(true)
    expect(carried.map((patient) => patient.species + patient.needs[0].need).join()).not.toBe(waiting)
  })
})

describe('the carrier', () => {
  it('stands there about every other time, the same for the same seed and count', () => {
    let times = 0
    for (let drawn = 0; drawn < 400; drawn++) {
      expect(carrierArrives(5, drawn)).toBe(carrierArrives(5, drawn))
      if (carrierArrives(5, drawn)) times++
    }
    expect(times).toBeGreaterThan(150)
    expect(times).toBeLessThan(250)
  })
})
