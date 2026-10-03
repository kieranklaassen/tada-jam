import { describe, expect, it } from 'vitest'
import { POINTING_HEIGHT, aimAt, type Ray, type Standing } from './aim'
import { BELL, PLACES, SLOT_Z, STEP, WAIT_Z, placeAt, slotX } from './places'

// The eye of the child: in front of the cabinet and above it, as the camera is.
const EYE = { x: 0, y: 46, z: 58 }
const toward = (x: number, y: number, z: number): Ray => ({ ox: EYE.x, oy: EYE.y, oz: EYE.z, dx: x - EYE.x, dy: y - EYE.y, dz: z - EYE.z })
const crew: Standing[] = [0, 1, 2].map((slot) => ({ x: slotX(slot, 3), width: 10, height: 9 }))

describe('what a finger points at', () => {
  it('finds the place under a finger on the tray, and the nearest place for a finger off it', () => {
    for (let place = 0; place < PLACES; place++) {
      const at = placeAt(place)
      const aim = aimAt(toward(at.x + 1, POINTING_HEIGHT, at.z - 1), crew)
      expect(aim.target).toEqual({ on: 'place', place })
      expect(aim.x).toBeCloseTo(at.x + 1, 3)
    }
    expect(aimAt(toward(-9, 0, 14.5), crew).target).toEqual({ on: 'place', place: 6 })
  })

  it('finds a gobbler by any part of it: its mouth, its belly or an eye', () => {
    crew.forEach((one, slot) => {
      expect(aimAt(toward(one.x, STEP.top + 7.5, SLOT_Z), crew).target).toEqual({ on: 'gobbler', slot })
      expect(aimAt(toward(one.x + 2, STEP.top + 3.5, SLOT_Z + 3), crew).target).toEqual({ on: 'gobbler', slot })
      expect(aimAt(toward(one.x - 5.6, STEP.top + 8, SLOT_Z + 2.4), crew).target).toEqual({ on: 'gobbler', slot })
    })
  })

  it('finds the ledge behind the gobblers, and tells the two sides apart', () => {
    expect(aimAt(toward(-8, 11, WAIT_Z), crew).target).toEqual({ on: 'ledge', which: 0 })
    expect(aimAt(toward(8, 11, WAIT_Z), crew).target).toEqual({ on: 'ledge', which: 1 })
    // With no crew at the tray the parapet itself is the ledge.
    expect(aimAt(toward(-3, 6, -8.5), []).target).toEqual({ on: 'ledge', which: 0 })
  })

  it('finds the bell post at either end of the rail', () => {
    expect(aimAt(toward(BELL.x, 3, BELL.z), crew).target).toEqual({ on: 'rail-end', side: 1 })
    expect(aimAt(toward(-BELL.x, 3, BELL.z), crew).target).toEqual({ on: 'rail-end', side: -1 })
  })

  it('always finds something, wherever the finger is', () => {
    for (let x = -30; x <= 30; x += 3) for (let y = -4; y <= 30; y += 2) {
      const aim = aimAt(toward(x, y, -6), crew)
      expect(aim.target).toBeDefined()
      expect(Number.isFinite(aim.x + aim.z)).toBe(true)
    }
  })
})
