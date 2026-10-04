import { describe, expect, it } from 'vitest'
import { ROSTER } from './cycle'
import { LAYOUT, groundAt } from './props'
import { TREAD, queueMud, queueOf, queueSpot } from './queue'
import { tally } from './surface'
import { deserializeWash, sendOff } from './washState'

const ids = ROSTER.map((def) => def.id)

describe('the queue in the yard', () => {
  it('is the two vehicles that are neither in the bay nor at the door', () => {
    for (const bay of ids) for (const next of ids) {
      if (bay === next) continue
      const queue = queueOf(bay, next)
      expect(queue).toHaveLength(2)
      expect(new Set([bay, next, ...queue]).size).toBe(4)
    }
  })

  it('has at its head the vehicle that comes to the door at the next send-off, wash after wash', () => {
    let state = deserializeWash(null, 2)
    for (let i = 0; i < 9; i++) {
      const head = queueOf(state.bay.who, state.next.who)[0]
      state = sendOff(state).state
      expect(state.next.who).toBe(head)
    }
  })

  it('after a send-off holds the one that waited behind and the one that just left', () => {
    const state = deserializeWash(null, 2)
    const before = queueOf(state.bay.who, state.next.who)
    const after = sendOff(state).state
    expect(new Set(queueOf(after.bay.who, after.next.who))).toEqual(new Set([before[1], state.bay.who]))
  })

  it('stands both places on the flat top of the hill, as far as a vehicle\'s wheels reach, and clear of each other and of the lane to the door', () => {
    for (const place of [0, 1]) {
      const spot = queueSpot(place)
      expect(spot.ground).toBe(LAYOUT.hill.h + TREAD)
      // Every wheel of every vehicle, turned as it stands there, with the tyre's own reach.
      const c = Math.cos(spot.turn), s = Math.sin(spot.turn)
      for (const def of ROSTER) for (const wheel of def.wheels) for (const side of [1, -1]) for (const reach of [-wheel.r, wheel.r]) {
        const x = wheel.x + reach, z = side * (wheel.z + wheel.w / 2)
        expect(groundAt(spot.x + x * c + z * s, spot.z - x * s + z * c)).toBe(LAYOUT.hill.h)
      }
      expect(spot.z).toBeLessThan(LAYOUT.door.z - 3)
    }
    // Side by side with room between: across the way the head faces, the two are further apart than two of the widest vehicles are wide.
    const head = queueSpot(0), other = queueSpot(1)
    const across = Math.abs((other.x - head.x) * -Math.sin(head.turn) - (other.z - head.z) * Math.cos(head.turn))
    expect(across).toBeGreaterThan(2 * 1.2 + 0.4)
  })

  it('wears fresh splashes, the same every time for the same vehicle', () => {
    for (const id of ids) {
      const mud = queueMud(id)
      expect(queueMud(id)).toEqual(mud)
      const t = tally(mud)
      expect(t.mud).toBeGreaterThan(0)
      expect(t.mud).toBeLessThan(t.body)
    }
  })
})
