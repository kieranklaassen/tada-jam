import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { seatSpot } from './layout'
import { GUEST_IDS } from './party'
import { passingLanes, sizeOfGuest } from './stage'
import { Troupe } from './troupe'
import type { GuestId } from './world'

const party = (...who: GuestId[]) => who.map((guest, seat) => ({ who: guest, seat: seatSpot(who.length, seat) }))

/** Runs the troupe and returns the least room there ever was between two full-grown guests, less what the two take up. */
function run(troupe: Troupe, seconds: number, from = 0): number {
  let least = Infinity
  for (let i = 0; i < seconds * 60; i++) {
    troupe.update(1 / 60, from + i / 60, { x: 4, z: 3 }, () => undefined)
    const standing = troupe.standing()
    for (let a = 0; a < standing.length; a++) {
      for (let b = a + 1; b < standing.length; b++) {
        const one = standing[a], other = standing[b]
        const room = Math.hypot(one.x - other.x, one.z - other.z) - (sizeOfGuest(one.who).walking * one.scale + sizeOfGuest(other.who).walking * other.scale)
        least = Math.min(least, room)
      }
    }
  }
  return least
}

describe('a change of party', () => {
  it('has the old party walk off and the new one come in with nobody ever in anybody, whoever is in the two', () => {
    const parties: GuestId[][] = [['bear', 'hen'], ['hen', 'bear', 'mouse'], ['mouse', 'duckling-a', 'duckling-b', 'hen'], ['bear'], ['duckling-b', 'duckling-a', 'bear', 'mouse'], ['hen', 'mouse', 'bear'], ['bear', 'mouse']]
    for (let i = 0; i + 1 < parties.length; i++) {
      const troupe = new Troupe(new THREE.MeshBasicMaterial(), 10)
      const before = party(...parties[i]), after = party(...parties[i + 1])
      troupe.setParty(before, [], true)
      run(troupe, 0.5)
      // As the scene does it: the old party is told to go, and a little later the new one is seated.
      for (const guest of before) troupe.leave(guest.who)
      const first = run(troupe, 1.3, 0.5)
      troupe.setParty(after, [], false)
      const then = run(troupe, 8, 1.8)
      expect(Math.min(first, then), `${parties[i].join()} to ${parties[i + 1].join()}`).toBeGreaterThan(0)
      // Everyone of the new party is at its seat, and nobody else is left.
      expect(troupe.standing().map((guest) => guest.who).sort()).toEqual([...parties[i + 1]].sort())
      for (const guest of after) expect(troupe.spotOf(guest.who)).toEqual(guest.seat)
      // Each has arrived: the party is seated, and a cup that was held high on the way in is down in the paw.
      expect(troupe.seatedAll()).toBe(true)
      for (const guest of after) expect(troupe.raisedOf(guest.who)).toBeLessThan(0.01)
    }
    expect(GUEST_IDS).toHaveLength(5)
  })

  it('keeps a party that is only shown again where it sits', () => {
    const troupe = new Troupe(new THREE.MeshBasicMaterial(), 10)
    const guests = party('bear', 'hen')
    troupe.setParty(guests, [], true)
    troupe.setParty(guests, ['mouse'], false)
    run(troupe, 1)
    for (const guest of guests) expect(troupe.spotOf(guest.who)).toEqual(guest.seat)
    expect(troupe.standing()).toHaveLength(3)
  })
})

describe('two guests that change seats', () => {
  it('step out, pass in their lanes and step back in: clear of each other unless one is the Bear, who is squeezed past', () => {
    for (const a of GUEST_IDS) {
      for (const b of GUEST_IDS) {
        if (a === b) continue
        // Next to each other at a table of four; `a` has been led up to `b` and is let go there.
        const troupe = new Troupe(new THREE.MeshBasicMaterial(), 10)
        const seats = [seatSpot(4, 1), seatSpot(4, 2)]
        troupe.setParty([{ who: a, seat: seats[0] }, { who: b, seat: seats[1] }], [], true)
        run(troupe, 0.3)
        troupe.walk(a, { x: seats[1].x - sizeOfGuest(a).walking - sizeOfGuest(b).walking - 0.06, z: seats[0].z })
        run(troupe, 2, 0.3)
        const lanes = passingLanes(a, b)
        troupe.walk(a, seats[1], lanes[a], b)
        troupe.walk(b, seats[0], lanes[b], a)
        const least = run(troupe, 6, 2.3)
        if (a !== 'bear' && b !== 'bear') expect(least, `${a} and ${b}`).toBeGreaterThan(0)
        else expect(least, `${a} and ${b}`).toBeGreaterThan(-0.5)
        expect(troupe.spotOf(a)).toEqual(seats[1])
        expect(troupe.spotOf(b)).toEqual(seats[0])
      }
    }
  })
})

describe('the Ducklings settling', () => {
  it('lean on each other: each rolls toward the side its twin sits on, whichever seats they have', () => {
    for (const order of [['duckling-a', 'duckling-b', 'bear'], ['duckling-b', 'mouse', 'duckling-a']] as GuestId[][]) {
      const troupe = new Troupe(new THREE.MeshBasicMaterial(), 10)
      troupe.setParty(party(...order), [], true)
      run(troupe, 0.5)
      for (const who of order) troupe.do(who, 'settle')
      run(troupe, 4, 0.5)
      const rollOf = (who: GuestId) => troupe.group.getObjectByName(`guest-${who}`)!.rotation.z
      const [left, right] = (['duckling-a', 'duckling-b'] as GuestId[]).sort((a, b) => troupe.spotOf(a)!.x - troupe.spotOf(b)!.x)
      // A roll below 0 tips the top of a guest toward the child's right, above 0 toward the left.
      expect(rollOf(left)).toBeLessThan(-0.15)
      expect(rollOf(right)).toBeGreaterThan(0.15)
    }
  })
})

describe('a cup in the paw of a guest that is not at the table yet', () => {
  it('is held over the head at the gate and on the way in, and goes with the one that comes, never with the one of the same name that leaves', () => {
    const troupe = new Troupe(new THREE.MeshBasicMaterial(), 10)
    troupe.setParty(party('mouse', 'duckling-a', 'duckling-b', 'hen'), ['mouse', 'duckling-a', 'duckling-b', 'bear'], true)
    run(troupe, 0.5)
    const seat = { ...troupe.spotOf('duckling-a')! }
    for (const who of ['mouse', 'duckling-a', 'duckling-b', 'hen'] as GuestId[]) troupe.leave(who)
    run(troupe, 0.6, 0.5)
    // The Duckling that drank is walking off. The cup of the one at the gate is with that one, held high.
    const gate = troupe.spotOf('duckling-a')!
    expect(gate.x).toBeLessThan(-5)
    expect(troupe.leavingSpot('duckling-a')!.x).toBeGreaterThanOrEqual(seat.x)
    expect(troupe.raisedOf('duckling-a')).toBe(1)
    expect(troupe.scaleOf('duckling-a')).toBeLessThan(0.8)
    troupe.setParty(party('mouse', 'duckling-a', 'duckling-b', 'bear'), [], false)
    expect(troupe.spotOf('duckling-a')!.x).toBeLessThan(-5)
    expect(troupe.raisedOf('duckling-a')).toBe(1)
    run(troupe, 9, 1.1)
    expect(troupe.spotOf('duckling-a')).toEqual(seat)
    expect(troupe.raisedOf('duckling-a')).toBeLessThan(0.01)
  })
})
