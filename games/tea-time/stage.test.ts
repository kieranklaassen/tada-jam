import { describe, expect, it } from 'vitest'
import { CLOTH, GUEST_Z, PLACE_Z } from './layout'
import { GUEST_IDS } from './party'
import { CUP_HOLDS, bowlOf, cupOuterR, cupProfile, dishOf, type CupSize } from './forms'
import { GUEST_SIZE, anchorOf, passingLanes, sizeOfGuest, spoonRest, tileMotion } from './stage'
import type { Thing } from './world'

const thing = (kind: Thing['kind'], worn: boolean): Thing => ({ id: kind, kind, size: 'house', ring: null, owner: null, x: 0, z: 0, on: null, heldBy: 'bear', worn, tea: 0 }) as Thing

describe('where things go on a guest', () => {
  it('lays a flat thing on top, above the rim of a cup worn as a hat, and holds a spoon before the face', () => {
    for (const who of GUEST_IDS) {
      const size = sizeOfGuest(who), seat = { x: 1, z: GUEST_Z }
      expect(anchorOf(thing('saucer', true), seat, who).y).toBe(size.crown)
      expect(size.crown).toBeGreaterThanOrEqual(size.height)
      expect(anchorOf(thing('cup', true), seat, who).y).toBe(size.hat)
      expect(size.hat).toBeLessThan(size.height)
      const nose = anchorOf(thing('spoon', true), seat, who)
      expect(nose.z - seat.z).toBeGreaterThan(size.girth * 0.75)
      expect(nose.y).toBeLessThan(size.height)
      // A cup in the paw is before the guest, clear of its body.
      expect(anchorOf(thing('cup', false), seat, who).z).toBeGreaterThan(seat.z + size.girth)
    }
  })
})

describe('two guests that change seats', () => {
  it('bow out of the row to opposite sides, the bigger to the wall, and neither into the wall or the places', () => {
    for (const a of GUEST_IDS) {
      for (const b of GUEST_IDS) {
        if (a === b) continue
        const lanes = passingLanes(a, b)
        const [small, big] = sizeOfGuest(a).walking <= sizeOfGuest(b).walking ? [a, b] : [b, a]
        expect(lanes[big]).toBeLessThanOrEqual(0)
        expect(lanes[small]).toBeGreaterThanOrEqual(0)
        expect(GUEST_Z + lanes[big] - sizeOfGuest(big).walking).toBeGreaterThan(CLOTH.minZ - 1.5)
        expect(GUEST_Z + lanes[small] + sizeOfGuest(small).walking).toBeLessThan(PLACE_Z - 0.98)
      }
    }
  })

  it('pass clear of each other, all but the Bear, who is squeezed past', () => {
    for (const a of GUEST_IDS) {
      for (const b of GUEST_IDS) {
        if (a === b) continue
        const lanes = passingLanes(a, b)
        const apart = Math.abs(lanes[a] - lanes[b]), wide = sizeOfGuest(a).walking + sizeOfGuest(b).walking
        if (a !== 'bear' && b !== 'bear') expect(apart, `${a} and ${b}`).toBeGreaterThan(wide)
        else expect(apart, `${a} and ${b}`).toBeGreaterThan(wide - 0.75)
      }
    }
    expect(GUEST_SIZE.bear.walking).toBeGreaterThan(GUEST_SIZE.hen.walking)
  })
})

describe('where a spoon rests on a thing', () => {
  const sizes = Object.keys(CUP_HOLDS) as CupSize[]
  const thing = (kind: Thing['kind'], size: CupSize): Thing => ({ id: kind, kind, x: 0, z: 0, size, tea: 0, on: null, heldBy: null, worn: false, owner: null, ring: null }) as unknown as Thing

  it('leans in a cup with its bowl above the floor and inside the wall, and its handle over the rim and never through it', () => {
    for (const size of sizes) {
      const cup = bowlOf(size), rest = spoonRest(thing('cup', size), undefined)
      // The inside of the cup at a height: its wall is this far from the middle.
      const wall = (y: number) => cup.floorR + (cup.rimR - cup.floorR) * Math.min(1, Math.max(0, (y - cup.floorY) / (cup.rimY - cup.floorY)))
      // The far end of the spoon's bowl, the lowest part of it, and where the underside of the handle crosses the rim.
      const end = { out: 0.29 * Math.cos(rest.tip) - rest.z, y: rest.y + 0.035 - 0.29 * Math.sin(rest.tip) }
      if (cup.rimR >= 0.37) {
        expect(end.y, size).toBeGreaterThan(cup.floorY)
        expect(end.out, size).toBeLessThan(wall(end.y) + 1e-9)
        expect(rest.tip, size).toBeGreaterThan(0.15)
      } else expect(rest.y + 0.035, size).toBeGreaterThanOrEqual(cup.rimY)
      const atRim = rest.y + 0.0775 * Math.cos(rest.tip) + (cup.rimR + rest.z) * Math.tan(rest.tip)
      expect(atRim, size).toBeGreaterThan(cup.rimY)
    }
  })

  it('knows how far out the wall of a cup is at every height, as the cup is turned', () => {
    for (const size of sizes) {
      const cup = bowlOf(size), profile = cupProfile(cup)
      for (const point of profile.points.slice(3, profile.insideFrom - 1)) expect(cupOuterR(cup, point.y), size).toBeCloseTo(point.r, 9)
    }
  })

  it('lies on the rim of a saucer clear of the cup that stands on it, and in the dish of an empty one, never under the top of the saucer', () => {
    for (const size of sizes) {
      const dish = dishOf(size), cup = bowlOf(size)
      const beside = spoonRest(thing('saucer', size), thing('cup', size)), alone = spoonRest(thing('saucer', size), undefined)
      // Its bowl is 0.215 wide to either side: the near edge is clear of the cup's wall at the height the spoon lies at.
      // The cup's wall swells out above its foot: at every height the spoon's bowl has, from its underside to its top.
      const foot = 0.041 * Math.cbrt(dish.holds / 0.2)
      for (const up of [0.035, 0.08, 0.125]) expect(beside.x - 0.215, size).toBeGreaterThan(cupOuterR(cup, beside.y + up - foot) + 0.03)
      expect(alone.x, size).toBe(0)
      for (const rest of [beside, alone]) {
        expect(rest.tip, size).toBe(0)
        // The underside of the spoon is 0.035 above where it is put: over the well, and over the saucer under both its ends.
        expect(rest.y + 0.035, size).toBeGreaterThan(0.035)
        expect(rest.y + 0.035, size).toBeLessThan(dish.rimY + 0.06)
        // Its middle is over the saucer's middle line, so it hangs out no further at one end than at the other.
        expect(rest.z + (1.08 - 0.29) / 2, size).toBeCloseTo(0, 9)
      }
    }
  })
})

describe('a tile of the wall that a touch has loosened', () => {
  const steps = Array.from({ length: 201 }, (_, i) => i / 200)

  it('starts and ends in the wall, and at every moment covers the still tile behind it', () => {
    for (let picture = 0; picture < 5; picture++) {
      for (const t of [0, 1]) {
        const at = tileMotion(picture, t)
        for (const value of [Math.cos(at.turn) - 1, Math.sin(at.turn), at.x, at.y, at.scale - 1]) expect(Math.abs(value), `picture ${picture} at ${t}`).toBeLessThan(1e-9)
      }
      for (const t of steps) {
        const at = tileMotion(picture, t)
        // A square turned by an angle covers the square it was when it is this much bigger, and more for a shift.
        const needs = Math.abs(Math.cos(at.turn)) + Math.abs(Math.sin(at.turn)) + 2 * (Math.abs(at.x) + Math.abs(at.y))
        expect(at.scale, `picture ${picture} at ${t}`).toBeGreaterThanOrEqual(needs - 1e-9)
      }
    }
  })

  it('does a different thing for each picture', () => {
    const shape = (picture: number) => steps.map((t) => tileMotion(picture, t)).flatMap((at) => [Math.sin(at.turn), at.x * 10, at.y * 10])
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) {
      const one = shape(a), other = shape(b)
      expect(Math.sqrt(one.reduce((sum, value, i) => sum + (value - other[i]) ** 2, 0) / one.length), `${a} and ${b}`).toBeGreaterThan(0.03)
    }
  })
})
