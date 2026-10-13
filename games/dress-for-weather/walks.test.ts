import { describe, expect, it } from 'vitest'
import { FIGURES, type Figure, type Wearer } from './kinds'
import { DOG_PLACE, DOOR, HANDLE, MIDDLE, RACK, SHEET, VANE_TARGET, boxesMeet, coresAt, homeControlOn, placesOf, standOf, type Point } from './layout'
import { fit } from './stage'
import { DOORWAY, FRONT_LANE, STRUT_LANE, STRUT_TO, gaitOf, leaveAt, othersOf, strutAt, swapAt } from './walks'

// Flat paper has no depth but the height of a stand on the floor: whoever
// stands lower on the sheet is nearer. Two figures may overlap only while
// their stands are in different lanes, and nobody walks through the rack.

/** Two stands this far apart up the floor are in different lanes. */
const LANE = 8
const SWAPS = FIGURES.flatMap((from) => othersOf(from).map((to) => [from, to] as const))
const moments = Array.from({ length: 201 }, (_, i) => i / 200)
const meet = (a: Wearer, at: Point, b: Wearer, bt: Point) => coresAt(a, at).some((box) => coresAt(b, bt).some((other) => boxesMeet(box, other)))

describe('standing', () => {
  it.each(FIGURES)('nobody stands in anybody, with the %s in the middle', (turn) => {
    const stands = placesOf(turn), all = [...FIGURES, 'dog'] as const
    for (const a of all) for (const b of all) if (a < b) expect(meet(a, stands[a], b, stands[b]), `${a} and ${b}`).toBe(false)
    for (const who of all) for (const box of coresAt(who, stands[who])) {
      expect(box.x1).toBeLessThan(RACK.x0)
      expect(box.x0).toBeGreaterThan(SHEET.x0)
    }
  })
})

describe.each(SWAPS)('the %s leaves the middle and the %s takes it', (from, to) => {
  it('starts and ends with everyone in place', () => {
    for (const who of FIGURES) {
      expect(swapAt(who, from, to, 0)).toEqual(standOf(who, from))
      expect(swapAt(who, from, to, 1)).toEqual(standOf(who, to))
      expect(gaitOf(who, 0).hop).toBeCloseTo(0)
      expect(gaitOf(who, 1).tilt).toBeCloseTo(0)
    }
  })

  it('never has one figure in another in the same lane, nor in the dog, nor in the rack', () => {
    for (const u of moments) {
      const at = Object.fromEntries(FIGURES.map((who) => [who, swapAt(who, from, to, u)])) as Record<Figure, Point>
      for (const a of FIGURES) {
        for (const b of FIGURES) if (a < b && meet(a, at[a], b, at[b])) expect(Math.abs(at[a].y - at[b].y), `${a} and ${b} at ${u}`).toBeGreaterThanOrEqual(LANE)
        if (meet(a, at[a], 'dog', DOG_PLACE)) expect(Math.abs(at[a].y - DOG_PLACE.y), `${a} and the dog at ${u}`).toBeGreaterThanOrEqual(LANE)
        for (const box of coresAt(a, at[a])) expect(box.x1, `${a} at ${u}`).toBeLessThan(RACK.x0)
      }
    }
  })

  it('brings the one who comes along the front lane', () => {
    const half = swapAt(to, from, to, 0.5)
    expect(half.y).toBe(FRONT_LANE)
    expect(FRONT_LANE).toBeGreaterThan(MIDDLE.y)
  })

  it.each([[1180, 820], [1024, 768], [1366, 1024], [1280, 720], [844, 390]])('walks nobody under the home control on a surface of %i by %i', (width, height) => {
    const control = homeControlOn(width, fit(width, height))
    for (const u of moments) for (const who of FIGURES) for (const box of coresAt(who, swapAt(who, from, to, u))) expect(boxesMeet(box, control), `${who} at ${u}`).toBe(false)
  })
})

describe('the dog\'s turn of the hall', () => {
  it('starts and ends where the dog sits, facing as it sits', () => {
    expect(strutAt(0)).toMatchObject({ ...DOG_PLACE, facing: 1 })
    expect(strutAt(1)).toMatchObject({ ...DOG_PLACE, facing: 1 })
    expect(strutAt(0).trot).toBeCloseTo(0)
    expect(strutAt(1).trot).toBeCloseTo(0)
  })

  it('goes along the front of the hall and back, turned round on the way back, short of the rack', () => {
    const far = Math.max(...moments.map((u) => strutAt(u).x))
    expect(far).toBeCloseTo(STRUT_TO, 0)
    expect(far + 88).toBeLessThan(RACK.x0)
    expect(strutAt(0.3).facing).toBe(1)
    expect(strutAt(0.7).facing).toBe(-1)
    expect(strutAt(0.7).x).toBeLessThan(strutAt(0.55).x)
  })

  it('is in a lane of its own whenever it is in front of a figure, whoever is in the middle', () => {
    for (const turn of FIGURES) for (const u of moments) {
      const dog = strutAt(u), stands = placesOf(turn)
      // Turned round, its paper is mirrored about its stand: the same boxes, mirrored.
      const boxes = coresAt('dog', dog).map((box) => (dog.facing === 1 ? box : { ...box, x0: 2 * dog.x - box.x1, x1: 2 * dog.x - box.x0 }))
      for (const who of FIGURES) {
        const hit = boxes.some((box) => coresAt(who, stands[who]).some((other) => boxesMeet(box, other)))
        if (hit) expect(Math.abs(dog.y - stands[who].y), `${who} at ${u}, ${turn} in the middle`).toBeGreaterThanOrEqual(LANE)
      }
      if (u > 0.1 && u < 0.9) expect(dog.y).toBe(STRUT_LANE)
    }
  })

  it('is in a lane of its own whenever it meets a figure that is changing places, at any two moments of the two walks', () => {
    const some = moments.filter((_, i) => i % 4 === 0)
    for (const [from, to] of SWAPS) for (const u of some) {
      const dog = strutAt(u)
      const boxes = coresAt('dog', dog).map((box) => (dog.facing === 1 ? box : { ...box, x0: 2 * dog.x - box.x1, x1: 2 * dog.x - box.x0 }))
      for (const v of some) for (const who of FIGURES) {
        const at = swapAt(who, from, to, v)
        if (boxes.some((box) => coresAt(who, at).some((other) => boxesMeet(box, other)))) expect(Math.abs(dog.y - at.y), `${who} at ${v}, the dog at ${u}`).toBeGreaterThanOrEqual(LANE)
      }
    }
  })

  it('never crosses the vane or the door handle', () => {
    const handle = { x0: HANDLE.x - 24, y0: HANDLE.y - 24, x1: HANDLE.x + 24, y1: HANDLE.y + 24 }
    for (const u of moments) for (const box of coresAt('dog', strutAt(u))) for (const target of [VANE_TARGET, handle]) expect(boxesMeet(box, target)).toBe(false)
  })
})

describe.each(FIGURES)('the %s walks out of the door', (who) => {
  it('goes from the middle into the doorway, which is inside the door, and never turns back', () => {
    expect(leaveAt(0)).toEqual(MIDDLE)
    expect(leaveAt(1)).toEqual(DOORWAY)
    expect(DOORWAY.x).toBeGreaterThan(DOOR.x0)
    expect(DOORWAY.x).toBeLessThan(DOOR.x1)
    for (let i = 1; i < moments.length; i++) expect(leaveAt(moments[i]).x).toBeLessThanOrEqual(leaveAt(moments[i - 1]).x)
  })

  it('passes the two who wait and the dog in the front lane, never in their own', () => {
    const stands = placesOf(who)
    for (const u of moments) {
      const at = leaveAt(u)
      for (const other of [...othersOf(who), 'dog'] as const) {
        if (meet(who, at, other, stands[other])) expect(at.y - stands[other].y, `${other} at ${u}`).toBeGreaterThanOrEqual(LANE)
      }
      for (const box of coresAt(who, at)) expect(box.x1, `at ${u}`).toBeLessThan(RACK.x0)
    }
  })

  it.each([[1180, 820], [1024, 768], [1366, 1024], [1280, 720], [844, 390]])('goes under no home control on a surface of %i by %i', (width, height) => {
    const control = homeControlOn(width, fit(width, height))
    for (const u of moments) for (const box of coresAt(who, leaveAt(u))) expect(boxesMeet(box, control), `at ${u}`).toBe(false)
  })
})
