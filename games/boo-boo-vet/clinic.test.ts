import { describe, expect, it } from 'vitest'
import { stream } from './arrivals'
import { GARDEN_HOLDS, MOVABLES, PLASTERS_KEPT, comeIn, freshClinic, giveAtTheDoor, giveCare, join, markShown, putDown, stick, strokePatient, toShow, type Clinic } from './clinic'
import { LADDER } from './config'
import { CARES, FITS, NEEDS, type Care, type Need } from './needs'
import { isWell, showing, type Patient } from './patient'
import { deserializeClinic, serializeClinic } from './save'

const SEED = 20261003

/** The same room far enough on for the cart to carry every thing, now and for the one who comes next. */
function everyThing(clinic: Clinic): Clinic {
  return { ...clinic, table: clinic.table && { ...clinic.table, cart: [...CARES] }, waiting: { ...clinic.waiting, cart: [...CARES] } }
}

/** The one at the door comes in, and the mouse's showing of a new thing starts, as it does in the running game. */
function next(clinic: Clinic): Clinic {
  const { clinic: after, cameIn } = comeIn(clinic, 'door')
  return cameIn?.showing ? markShown(after, cameIn.showing) : after
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
    expect(cameIn).toEqual({ from: 'door', left: null, showing: null })
  })

  it('has the mouse show a new thing once, while the patient in front has a need already known, and gives the next patient the new need', () => {
    const { clinic, cameIn } = comeIn(freshClinic(4, SEED), 'door')
    expect(cameIn?.showing).toBe('blanket')
    expect(clinic.table!.needs[0].need).toBe('thirsty')
    expect(clinic.waiting.needs[0].need).toBe('cold')
    // It counts as shown from the moment the showing starts, not before: a put-away before then still owes it.
    expect(clinic.shown).toEqual(['bowl'])
    expect(toShow(clinic, clinic.table!.cart)).toBe('blanket')
    const marked = markShown(clinic, 'blanket')
    expect(marked.shown).toEqual(['bowl', 'blanket'])
    expect(markShown(marked, 'blanket')).toBe(marked)
    // Once shown, never again.
    expect(toShow(marked, marked.table!.cart)).toBeNull()
    expect(comeIn(makeWell(marked), 'door').cameIn?.showing).toBeNull()
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

  it('brings nobody in while a need on the table is unmet: the touch changes nothing, and the same touch works once the animal is well', () => {
    const seated = giveCare(next(freshClinic(6, SEED)), 'basket').clinic
    expect(isWell(seated.table!)).toBe(false)
    for (const from of ['door', 'carrier'] as const) expect(comeIn(seated, from)).toEqual({ clinic: seated, cameIn: null })
    const well = makeWell(seated)
    expect(comeIn(well, 'door').cameIn).toMatchObject({ from: 'door', left: { species: seated.table!.species } })
  })

  it('does nothing when the child touches a carrier that is not there', () => {
    const clinic = freshClinic(null, SEED)
    expect(comeIn(clinic, 'carrier')).toEqual({ clinic, cameIn: null })
  })

  it('puts every thing back on the cart, keeps the stuck plasters, and brings in what was made of a thing', () => {
    // A room far enough on for the cart to carry every thing, now and for the one who comes next.
    let clinic = everyThing(next(freshClinic(6, SEED)))
    clinic = putDown(clinic, 'bowl', 'floor-left')
    clinic = join(clinic, 'blanket', 'basket').clinic
    clinic = join(clinic, 'brush', 'bowl').clinic
    clinic = stick(clinic, 'mouse')
    const madeBefore = clinic.made
    clinic = next(makeWell(clinic))
    expect(clinic.things).toMatchObject({ bowl: 'cart', brush: 'cart', basket: 'cart', blanket: 'on-basket', plasters: ['mouse'] })
    // Unless making the animal well used the foam up, everything made is still there.
    expect(clinic.made).toMatchObject({ den: madeBefore.den, patches: madeBefore.patches, boat: madeBefore.boat })
    expect(clinic.made.den).toBe(true)
  })

  it('lets a plaster go where its animal goes', () => {
    let clinic = next(freshClinic(null, SEED))
    clinic = giveAtTheDoor(clinic, 'plaster').clinic
    expect(clinic.things.plasters).toEqual(['waiting'])
    clinic = next(makeWell(clinic))
    expect(clinic.things.plasters).toEqual(['patient'])
    clinic = next(makeWell(clinic))
    expect(clinic.things.plasters).toEqual([])
  })
})

describe('the carrier', () => {
  /** A room at a position, with a well animal on the table and the things all shown. */
  function roomAt(position: string): Clinic {
    const clinic = makeWell(next(freshClinic(null, SEED)))
    return { ...clinic, position, shown: [...CARES] }
  }

  it('stands beside the one who waits from the fifth position to the one before the last, and nowhere else', () => {
    for (const position of LADDER) {
      const stands = ['basket', 'quiet', 'two'].includes(position)
      expect(next(roomAt(position)).carrier !== null, position).toBe(stands)
    }
  })

  it('holds a patient laid out one position above, by the same stream, every time', () => {
    const one = next(roomAt('basket')), other = next(roomAt('basket'))
    expect(one.carrier).toEqual(other.carrier)
    expect(one.carrier).toMatchObject({ at: 'quiet', fromCarrier: true })
    expect(one.carrier!.species).not.toBe(one.waiting.species)
    expect(one.carrier!.species).not.toBe(one.table!.species)
    expect(one.drawn).toBe(roomAt('basket').drawn + 2)
  })

  it('may be chosen whenever a patient can come in: its patient comes in, the one who waits stays, and a shut carrier stands there again in the same coming in', () => {
    const before = makeWell(next(roomAt('basket')))
    const { clinic, cameIn } = comeIn(before, 'carrier')
    expect(cameIn?.from).toBe('carrier')
    expect(clinic.table).toEqual(before.carrier)
    expect(clinic.waiting).toBe(before.waiting)
    expect(clinic.carrier).not.toBeNull()
    expect(clinic.carrier).not.toEqual(before.carrier)
    expect(clinic.carrier).toMatchObject({ at: 'quiet', fromCarrier: true })
    expect(clinic.carrier!.species).not.toBe(clinic.table!.species)
    expect(clinic.carrier!.species).not.toBe(clinic.waiting.species)
    expect(clinic.drawn).toBe(before.drawn + 1)
    // And again, as often as the child likes.
    const again = comeIn(makeWell(clinic), 'carrier').clinic
    expect(again.table).toEqual(clinic.carrier)
    expect(again.carrier).not.toBeNull()
  })

  it('lays out no new carrier at the last position or below the fifth, when its own patient comes in', () => {
    for (const position of ['two-quiet', 'brush']) {
      const before = { ...makeWell(next(roomAt('basket'))), position }
      expect(comeIn(before, 'carrier').clinic.carrier, position).toBeNull()
    }
  })

  it('gives the next patient laid out for the door a need that was shown while the carrier\'s patient came in', () => {
    // The basket is on the carts but not yet shown; the child takes the carrier first.
    const clinic = makeWell(next({ ...roomAt('basket'), shown: ['bowl', 'blanket', 'plaster', 'brush'] }))
    expect(clinic.carrier!.needs.every((entry) => entry.need !== 'scared')).toBe(true)
    const viaCarrier = comeIn({ ...clinic, shown: ['bowl', 'blanket', 'plaster', 'brush'] }, 'carrier')
    expect(viaCarrier.cameIn?.showing).toBe('basket')
    expect(viaCarrier.clinic.waiting.needs[0].need).not.toBe('scared')
    // The carrier's patient had no fear, so making it well does not move the position on from `basket`: what is
    // new there has not been played. The debt is paid at the door.
    const afterwards = next(makeWell(markShown(viaCarrier.clinic, 'basket')))
    expect(afterwards.position).toBe('basket')
    expect(afterwards.waiting.needs[0].need).toBe('scared')
  })

  it('is judged like any other: a carrier cycle with no miss moves the position up only when the patient carried what is new at the stored position', () => {
    const before = makeWell(next(roomAt('basket')))
    expect(before.position).toBe('basket')
    // Laid out one step above, at `quiet`. With the fear that `basket` adds, it moves the position on.
    const afraid = { ...before, carrier: { ...before.carrier!, needs: [{ need: 'scared' as const, step: 0 as const, met: false }] } }
    expect(makeWell(comeIn(afraid, 'carrier').clinic).position).toBe('quiet')
    // Without it, the cycle went mixed and the position stays: `basket` is not left behind unplayed.
    const unafraid = { ...before, carrier: { ...before.carrier!, needs: [{ need: 'thirsty' as const, step: 0 as const, met: false }] } }
    expect(makeWell(comeIn(unafraid, 'carrier').clinic).position).toBe('basket')
  })

  it('stays where it stands when the position moves away from it', () => {
    const before = next(roomAt('two'))
    const carried = before.carrier
    expect(next(makeWell({ ...before, position: 'two-quiet' })).carrier).toBe(carried)
    expect(next(makeWell({ ...before, position: 'bowl' })).carrier).toBe(carried)
  })
})

describe('a den, when the next cart does not carry the basket', () => {
  it('is taken apart as that patient comes in: the blanket lies on the cart, where it can be given, and a reload finds it there', () => {
    // A den stands; the stored position has fallen back, so the one at the door was laid out without the basket.
    let clinic = everyThing(makeWell(next({ ...freshClinic(null, SEED), position: 'basket', shown: [...CARES] })))
    clinic = join(clinic, 'blanket', 'basket').clinic
    expect(clinic.made.den).toBe(true)
    const cold: Patient = { ...clinic.waiting, at: 'blanket', needs: [{ need: 'cold', step: 1, met: false }], cart: ['bowl', 'blanket'] }
    const after = comeIn({ ...clinic, position: 'blanket', waiting: cold }, 'door').clinic
    expect(after.table).toEqual(cold)
    expect(after.made.den).toBe(false)
    expect(after.things.blanket).toBe('cart')
    // The blanket helps it.
    expect(isWell(giveCare(after, 'blanket').clinic.table!)).toBe(true)
    // With the basket on the next cart, the den comes in as a den.
    const whole = comeIn({ ...clinic, waiting: { ...cold, cart: [...CARES] } }, 'door').clinic
    expect(whole.made.den).toBe(true)
    expect(whole.things.blanket).toBe('on-basket')
    // A save that holds the blanket on a basket the cart does not carry is repaired.
    const damaged = JSON.parse(JSON.stringify(serializeClinic({ ...after, things: { ...after.things, blanket: 'on-basket' }, made: { ...after.made, den: true } })))
    const read = deserializeClinic(damaged, null, 1)
    expect(read.things.blanket).toBe('cart')
    expect(read.made.den).toBe(false)
  })
})

describe('the same need three times running', () => {
  it('never comes onto the table where another is in play, whichever of the door and the carrier the child takes each time', () => {
    for (const position of ['basket', 'quiet', 'two', 'two-quiet']) {
      for (let seed = 1; seed <= 40; seed++) {
        // A room far on, every thing shown, played at this position for a long time: the position is put back after
        // every patient, so the carrier always stands.
        let clinic: Clinic = { ...freshClinic(null, seed), position, shown: [...CARES] }
        const choose = stream(seed * 7 + 1)
        const onTable: Need[][] = []
        for (let patients = 0; patients < 90; patients++) {
          const from = clinic.carrier && choose() < 0.6 ? 'carrier' : 'door'
          clinic = comeIn(clinic.table ? makeWell(clinic) : clinic, from).clinic
          clinic = { ...clinic, position }
          onTable.push(clinic.table!.needs.map((entry) => entry.need))
        }
        // No need is had by three in a row, as an only need or as one of two. The first few were laid out at the
        // first position, with one need in play: they are let through.
        for (let index = 6; index < onTable.length; index++) {
          const shared = onTable[index].filter((need) => onTable[index - 1].includes(need) && onTable[index - 2].includes(need))
          expect(shared, `${position}, seed ${seed}, patient ${index}: ${onTable.slice(index - 2, index + 1).map((needs) => needs.join('+')).join(', ')}`).toEqual([])
        }
      }
    }
  })

  it('never comes from the carrier taken every time, which is how it used to', () => {
    for (let seed = 1; seed <= 60; seed++) {
      let clinic: Clinic = { ...freshClinic(null, seed), position: 'basket', shown: [...CARES] }
      const onTable: Need[] = []
      for (let patients = 0; patients < 60; patients++) {
        clinic = comeIn(clinic.table ? makeWell(clinic) : clinic, clinic.carrier ? 'carrier' : 'door').clinic
        clinic = { ...clinic, position: 'basket' }
        onTable.push(clinic.table!.needs[0].need)
      }
      for (let index = 6; index < onTable.length; index++) expect(new Set(onTable.slice(index - 2, index + 1)).size, `seed ${seed}, patient ${index}`).toBeGreaterThan(1)
    }
  })
})

describe('the same animal twice running', () => {
  it('never comes onto the table, whichever of the door and the carrier the child takes each time, and nobody in view is the same animal as another', () => {
    for (const position of ['plaster', 'basket', 'two']) {
      for (let seed = 1; seed <= 40; seed++) {
        let clinic: Clinic = { ...freshClinic(null, seed), position, shown: [...CARES] }
        const choose = stream(seed * 13 + 5)
        let last: string | null = null
        for (let patients = 0; patients < 80; patients++) {
          const from = clinic.carrier && choose() < 0.5 ? 'carrier' : 'door'
          clinic = comeIn(clinic.table ? makeWell(clinic) : clinic, from).clinic
          clinic = { ...clinic, position }
          expect(clinic.table!.species, `${position}, seed ${seed}, patient ${patients}`).not.toBe(last)
          last = clinic.table!.species
          const inView = [clinic.table!.species, clinic.waiting.species, ...(clinic.carrier ? [clinic.carrier.species] : [])]
          expect(new Set(inView).size, `${position}, seed ${seed}, patient ${patients}: ${inView.join(', ')}`).toBe(inView.length)
        }
      }
    }
  })
})

describe('giving at the door', () => {
  it('lets the one who waits take a thing as play, by its taste, and leaves its sign and its count as they were', () => {
    const clinic = next(freshClinic(6, SEED))
    const waiting = clinic.waiting
    for (const care of CARES) {
      if (FITS[waiting.needs[0].need] === care) continue
      const { clinic: after, atTheDoor } = giveAtTheDoor(clinic, care)
      expect(atTheDoor.kind).toBe('play')
      expect(after.waiting).toBe(waiting)
      expect(after).toMatchObject({ position: clinic.position, finished: clinic.finished, table: clinic.table })
      if (care === 'plaster') expect(after.things.plasters).toEqual(['waiting'])
      else expect(after.things[care]).toBe('floor-left')
    }
  })

  it('never shows the care that fits failing to help: held out at the door it is nosed back, and nothing changes', () => {
    const clinic = next(freshClinic(6, SEED))
    const fitting = FITS[clinic.waiting.needs[0].need]
    expect(giveAtTheDoor(clinic, fitting)).toEqual({ clinic, atTheDoor: { kind: 'nosed-back' } })
    // On the table the same thing helps, as it always does.
    const seated = next(makeWell(clinic))
    expect(giveCare(seated, fitting).gave?.answer.kind).toBe('helps')
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
  const seated = everyThing(next(freshClinic(6, SEED)))

  it('makes nothing of a thing the cart does not carry', () => {
    const early = next(freshClinic(null, SEED))
    expect(early.table!.cart).toEqual(['bowl'])
    expect(join(early, 'blanket', 'basket')).toEqual({ clinic: early, secret: null })
    expect(join(early, 'brush', 'bowl')).toEqual({ clinic: early, secret: null })
  })

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

  it('gives the beard to whoever laps next and the fur on end to whoever goes under next, also when the thing did not fit, and to nobody who does neither', () => {
    const needing = (clinic: Clinic, need: Need): Clinic => ({ ...clinic, table: { ...clinic.table!, needs: [{ need, step: 1 as const, met: false }] } })
    const foamy = join(seated, 'brush', 'bowl').clinic, crackling = join(seated, 'brush', 'blanket').clinic
    for (const need of NEEDS) {
      // The one that droops drinks, the one that shivers laps once, the one that hides puts its tongue out for one lap.
      const lapped = giveCare(needing(foamy, need), 'bowl')
      expect(lapped.gave?.beard, need).toBe(['thirsty', 'cold', 'scared'].includes(need))
      expect(lapped.clinic.made.foam, need).toBe(!['thirsty', 'cold', 'scared'].includes(need))
      // Over a hiding place the blanket lies on the table; every other animal is under it.
      const covered = giveCare(needing(crackling, need), 'blanket')
      expect(covered.gave?.furOnEnd, need).toBe(need !== 'scared')
      expect(covered.clinic.made.crackle, need).toBe(need === 'scared')
    }
    // In play it follows the reaction: a bowl worn as a hat leaves no beard and the foam stays for the next one.
    const well = makeWell(foamy)
    expect(giveCare({ ...well, made: { ...well.made, foam: true } }, 'bowl', { drinks: false }).gave?.beard).toBe(false)
    expect(giveCare({ ...well, made: { ...well.made, foam: true } }, 'bowl', { drinks: false }).clinic.made.foam).toBe(true)
    expect(giveCare({ ...well, made: { ...well.made, foam: true } }, 'bowl', { drinks: true }).gave?.beard).toBe(true)
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
      clinic = arrival.cameIn?.showing ? markShown(arrival.clinic, arrival.cameIn.showing) : arrival.clinic
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
        else if (roll < 0.2) clinic = giveAtTheDoor(clinic, choose(CARES)).clinic
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

describe('the toy: animals that need nothing', () => {
  it('opens with one on the table and another at the door, every thing on the cart, and nothing to judge', () => {
    const toy = freshClinic(null, SEED, true)
    expect(toy.table!.needs).toEqual([])
    expect(toy.waiting.needs).toEqual([])
    expect(toy.table!.species).not.toBe(toy.waiting.species)
    expect(toy.table!.cart).toEqual([...CARES])
    expect(toy).toMatchObject({ finished: true, position: 'bowl', carrier: null, drawn: 2 })
  })

  it('makes every give play, by the animal\'s taste, and never moves the position', () => {
    let toy = freshClinic(null, SEED, true)
    for (const care of CARES) {
      const { clinic, gave } = giveCare(toy, care)
      expect(gave?.answer.kind).toBe('play')
      toy = clinic
    }
    expect(toy).toMatchObject({ position: 'bowl', finished: true })
    expect(toy.table!.wrong).toBe(0)
  })

  it('brings the next one in on a touch, sends the one on the table out with what it has on, and goes through every animal', () => {
    let toy = freshClinic(null, SEED, true)
    toy = giveCare(toy, 'basket').clinic
    toy = giveCare(toy, 'plaster').clinic
    const first = toy.table!.species
    const seen = new Set([first])
    toy = comeIn(toy, 'door', true).clinic
    expect(toy.garden).toEqual([{ species: first, keeps: ['plaster', 'basket'] }])
    expect(toy.things.basket).toBe('cart')
    for (let round = 0; round < 40; round++) {
      expect(toy.table!.needs).toEqual([])
      expect(toy.carrier).toBeNull()
      seen.add(toy.table!.species)
      toy = comeIn(toy, 'door', true).clinic
    }
    expect(seen.size).toBe(6)
    expect(toy.garden).toHaveLength(GARDEN_HOLDS)
  })
})
