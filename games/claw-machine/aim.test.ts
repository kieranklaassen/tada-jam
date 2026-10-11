import { describe, expect, it } from 'vitest'
import { POINTING_HEIGHT, aimAt, asideAt, type Ray, type Standing } from './aim'
import { lampSpots } from './lamps'
import { WATCHER_AT } from './watcher'
import { BELL, GATE, PLACES, SLOT_Z, STEP, WAIT_Z, placeAt, slotX } from './places'

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
    expect(aimAt(toward(-3, 6, -10.5), []).target).toEqual({ on: 'ledge', which: 0 })
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
  it('with a toy in the jaws takes a finger anywhere in the row of the crew for the mouth nearest to it', () => {
    const two: Standing[] = [0, 1].map((slot) => ({ x: slotX(slot, 2), width: 10, height: 9 }))
    // The gap between a crew of two, where the gate shows: bare, the gate; with a toy, the nearer mouth.
    expect(aimAt(toward(-0.5, GATE.top, GATE.z), two).target).toEqual({ on: 'ledge', which: 0 })
    expect(aimAt(toward(-0.5, GATE.top, GATE.z), two, true).target).toEqual({ on: 'gobbler', slot: 0 })
    expect(aimAt(toward(0.5, GATE.top, GATE.z), two, true).target).toEqual({ on: 'gobbler', slot: 1 })
    // On the step in front of the gap, and out past the end of the row.
    expect(aimAt(toward(1, STEP.top, SLOT_Z + 1), two, true).target).toEqual({ on: 'gobbler', slot: 1 })
    expect(aimAt(toward(-15.5, STEP.top + 2, SLOT_Z), two, true).target).toEqual({ on: 'gobbler', slot: 0 })
    // Over their heads the ledge is still the ledge, and the tray is still the tray.
    expect(aimAt(toward(-8, 11, WAIT_Z), two, true).target).toEqual({ on: 'ledge', which: 0 })
    expect(aimAt(toward(placeAt(2).x, POINTING_HEIGHT, placeAt(2).z), two, true).target).toEqual({ on: 'place', place: 2 })
  })

  it('gives a finger on the watcher or on a lamp to that thing, unless something the claw goes to stands in front', () => {
    expect(asideAt(toward(WATCHER_AT.x, 4, WATCHER_AT.z), crew, false)).toEqual({ on: 'watcher' })
    // The bell on its post stands in front of the watcher: a finger on the bell is the bell's.
    expect(asideAt(toward(BELL.x, BELL.top - 0.5, BELL.z), crew, false)).toBeNull()
    expect(aimAt(toward(BELL.x, BELL.top - 0.5, BELL.z), crew).target).toEqual({ on: 'rail-end', side: 1 })
    // Every bulb, where no gobbler stands in front of it.
    const none: Standing[] = []
    lampSpots().forEach((spot, lamp) => expect(asideAt(toward(spot.x, spot.y, spot.z), none, false), `lamp ${lamp}`).toEqual({ on: 'lamp', lamp }))
    // A bulb behind a gobbler is the gobbler's, and with a toy in the jaws a bulb in a gap of the row is a mouth's.
    const behind = lampSpots().findIndex((spot) => Math.abs(spot.x - crew[1].x) < 1.1 && spot.y > 2 && spot.z > -12)
    expect(behind).toBeGreaterThanOrEqual(0)
    const spot = lampSpots()[behind]
    expect(asideAt(toward(spot.x, spot.y, spot.z), crew, false)).toBeNull()
    const two: Standing[] = [0, 1].map((slot) => ({ x: slotX(slot, 2), width: 10, height: 9 }))
    expect(asideAt(toward(spot.x, spot.y, spot.z), two, false)).toEqual({ on: 'lamp', lamp: behind })
    expect(asideAt(toward(spot.x, spot.y, spot.z), two, true)).toBeNull()
  })
})
