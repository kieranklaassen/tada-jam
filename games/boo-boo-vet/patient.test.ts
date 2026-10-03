import { describe, expect, it } from 'vitest'
import { SPECIES } from './cast'
import { LADDER } from './config'
import { cell } from './grid'
import { CARES, FITS, NEEDS, OPEN, PLAIN, QUIET, type Care, type Need, type Step } from './needs'
import { carriesNew, give, helpedBy, isWell, judge, repairPatient, showing, stroke, type Patient } from './patient'

function patient(needs: Need[], over: Partial<Patient> = {}, step: Step = PLAIN): Patient {
  return { species: 'rabbit', at: 'basket', needs: needs.map((need) => ({ need, step, met: false })), wrong: 0, tried: [], cart: [...CARES], fromCarrier: false, ...over }
}

describe('giving a care', () => {
  it('helps when the care fits, for every need and every animal, whatever its taste', () => {
    for (const species of SPECIES) {
      for (const need of NEEDS) {
        const { patient: after, answer } = give(patient([need], { species }), FITS[need])
        expect(answer.kind).toBe('helps')
        expect(isWell(after)).toBe(true)
        if (answer.kind === 'helps') {
          expect(answer.well).toBe(true)
          expect(answer.cell).toBe(cell(FITS[need], need))
        }
      }
    }
  })

  it('never refuses a care that does not fit: its own cell plays and the sign moves one step plainer', () => {
    for (const need of NEEDS) {
      for (const care of CARES) {
        if (FITS[need] === care) continue
        const { patient: after, answer } = give(patient([need], {}, QUIET), care)
        expect(answer).toMatchObject({ kind: 'misses', need, step: PLAIN, cell: cell(care, need) })
        expect(after.needs[0]).toEqual({ need, step: PLAIN, met: false })
        expect(after.wrong).toBe(1)
      }
    }
  })

  it('keeps the state after a miss: the same animal, the same need, the same cart, and the fitting care still helps', () => {
    const before = patient(['cold'])
    const missed = give(before, 'bowl').patient
    expect(missed.species).toBe(before.species)
    expect(missed.cart).toEqual(before.cart)
    expect(showing(missed)?.need).toBe('cold')
    expect(give(missed, 'blanket').answer.kind).toBe('helps')
  })

  it('goes from quiet to plain to open and stays at open, never back down', () => {
    let current = patient(['thirsty'], {}, QUIET)
    const steps: Step[] = []
    for (const care of ['blanket', 'plaster', 'brush', 'basket'] as Care[]) {
      current = give(current, care).patient
      steps.push(current.needs[0].step)
    }
    expect(steps).toEqual([PLAIN, OPEN, OPEN, OPEN])
  })

  it('counts cares that did not fit as 0, 1, or 2 for two or more', () => {
    let current = patient(['sore'])
    expect(current.wrong).toBe(0)
    current = give(current, 'bowl').patient
    expect(current.wrong).toBe(1)
    current = give(current, 'brush').patient
    current = give(current, 'basket').patient
    expect(current.wrong).toBe(2)
  })

  it('keeps the things that did not fit, each once, in the order first tried, for the well scene to look back at', () => {
    let current = patient(['sore'])
    for (const care of ['brush', 'bowl', 'brush', 'basket', 'bowl'] as Care[]) current = give(current, care).patient
    expect(current.tried).toEqual(['brush', 'bowl', 'basket'])
    const well = give(current, 'plaster').patient
    expect(well.tried).toEqual(['brush', 'bowl', 'basket'])
    // Play with a well animal adds nothing to it.
    expect(give(well, 'blanket').patient.tried).toEqual(['brush', 'bowl', 'basket'])
    // With two needs every thing can have missed once: five at most.
    let two = patient(['thirsty', 'scared'])
    for (const care of ['bowl', 'bowl', 'blanket', 'plaster', 'brush'] as Care[]) two = give(two, care).patient
    two = give(give(two, 'basket').patient, 'basket').patient
    expect(two.tried).toEqual(['bowl', 'blanket', 'plaster', 'brush'])
    expect(two.tried.length).toBeLessThanOrEqual(CARES.length)
  })

  it('does not change the patient it was given', () => {
    const before = patient(['itchy'])
    const frozen = JSON.stringify(before)
    give(before, 'bowl')
    give(before, 'brush')
    expect(JSON.stringify(before)).toBe(frozen)
  })

  it('is always resolved within five gives, however the child goes about it', () => {
    for (const need of NEEDS) {
      let current = patient([need])
      let gives = 0
      for (const care of CARES) {
        if (isWell(current)) break
        current = give(current, care).patient
        gives++
      }
      expect(isWell(current)).toBe(true)
      expect(gives).toBeLessThanOrEqual(5)
    }
  })

  it('takes two needs in either order, and is well only after both', () => {
    for (const order of [['blanket', 'bowl'], ['bowl', 'blanket']] as Care[][]) {
      const first = give(patient(['cold', 'thirsty']), order[0])
      expect(first.answer).toMatchObject({ kind: 'helps', well: false })
      const second = give(first.patient, order[1])
      expect(second.answer).toMatchObject({ kind: 'helps', well: true })
      expect(helpedBy(second.patient)).toEqual(['blanket', 'bowl'])
    }
  })

  it('shows the first unmet need, and a miss makes that one plainer and leaves the other', () => {
    const { patient: after, answer } = give(patient(['cold', 'thirsty'], {}, QUIET), 'brush')
    expect(answer).toMatchObject({ kind: 'misses', need: 'cold' })
    expect(after.needs.map((entry) => entry.step)).toEqual([PLAIN, QUIET])
  })

  it('makes every thing a toy for an animal that needs nothing, taken by its taste, and judges none of it', () => {
    const well = give(patient(['thirsty'], { species: 'cat' }), 'bowl').patient
    const tastes = CARES.map((care) => {
      const { patient: after, answer } = give(well, care)
      expect(after).toBe(well)
      expect(answer.kind).toBe('play')
      return answer.taste
    })
    expect(tastes.sort()).toEqual(['loves', 'plain', 'plain', 'plain', 'wary'])
    expect(well.wrong).toBe(0)
  })

  it('carries the taste on a help and on a miss, so the same cell plays in the animal\'s own manner', () => {
    expect(give(patient(['thirsty'], { species: 'cat' }), 'bowl').answer).toMatchObject({ kind: 'helps', taste: 'wary' })
    expect(give(patient(['thirsty'], { species: 'dog' }), 'bowl').answer).toMatchObject({ kind: 'helps', taste: 'loves' })
    expect(give(patient(['cold'], { species: 'dog' }), 'bowl').answer).toMatchObject({ kind: 'misses', taste: 'loves' })
  })
})

describe('a stroke of the hand', () => {
  it('shows the sign again at the step it is at, changes nothing and is never counted', () => {
    const before = patient(['scared'], {}, QUIET)
    expect(stroke(before)).toEqual({ kind: 'shows', need: 'scared', step: QUIET, cell: cell('hand', 'scared') })
    expect(before.wrong).toBe(0)
    expect(before.needs[0].step).toBe(QUIET)
    expect(stroke(give(before, 'basket').patient)).toEqual({ kind: 'play' })
  })
})

describe('judging a cycle', () => {
  it('goes well only with no miss and with what is new at the stored position', () => {
    expect(judge(give(patient(['scared']), 'basket').patient, 'basket')).toBe('well')
    // The first give was right, but the need was an older one: the position stays.
    expect(judge(give(patient(['thirsty']), 'bowl').patient, 'basket')).toBe('mixed')
    // Laid out before the position moved up: the position stays.
    expect(judge(give(patient(['itchy'], { at: 'brush' }), 'brush').patient, 'basket')).toBe('mixed')
  })

  it('is mixed after one miss and goes badly after two or more', () => {
    const once = give(give(patient(['scared']), 'bowl').patient, 'basket').patient
    expect(judge(once, 'basket')).toBe('mixed')
    const twice = give(give(once, 'bowl').patient, 'brush').patient
    expect(judge({ ...twice, wrong: 2 }, 'basket')).toBe('badly')
    expect(judge(patient(['cold'], { wrong: 2, at: 'bowl' }), 'two')).toBe('badly')
  })

  it('counts every patient laid out at a later step as carrying what is new there', () => {
    for (const at of ['quiet', 'two', 'two-quiet']) expect(carriesNew(patient(['thirsty'], { at }), at)).toBe(true)
    // A patient from the step above, as the carrier brings, counts at the stored position too.
    expect(carriesNew(patient(['thirsty'], { at: 'quiet' }), 'basket')).toBe(true)
    expect(carriesNew(patient(['thirsty'], { at: 'basket' }), 'quiet')).toBe(false)
  })
})

describe('reading a patient out of a save', () => {
  it('keeps a good one as it is', () => {
    const good = give(patient(['cold', 'sore'], { species: 'duck', at: 'two', fromCarrier: true }), 'bowl').patient
    expect(repairPatient(JSON.parse(JSON.stringify(good)))).toEqual(good)
  })

  it('gives null for anything that is not a patient', () => {
    for (const raw of [null, undefined, 3, 'bear', [], {}, { species: 'unicorn', needs: [] }, { species: 'bear' }, { species: 'bear', needs: [] }, { species: 'bear', needs: [{ need: 'bored' }] }]) {
      expect(repairPatient(raw)).toBeNull()
    }
  })

  it('repairs each field by itself', () => {
    const repaired = repairPatient({ species: 'bear', at: 'nowhere', needs: [{ need: 'sore', step: 9, met: 'yes' }, { need: 'sore' }, 7, { need: 'cold', step: 2, met: true }, { need: 'itchy' }], wrong: 5, tried: ['brush', 'brush', 'saw', 'bowl'], cart: ['bowl', 'needle', 'bowl'], fromCarrier: 1 })
    expect(repaired).toEqual({
      species: 'bear',
      at: LADDER[0],
      needs: [{ need: 'sore', step: PLAIN, met: false }, { need: 'cold', step: OPEN, met: true }],
      wrong: 0,
      tried: ['brush', 'bowl'],
      // The things that fit its needs are put back on the cart.
      cart: ['bowl', 'blanket', 'plaster'],
      fromCarrier: false,
    })
  })
})
