import { describe, expect, it } from 'vitest'
import { beadCount } from './beads'
import { CLEARING, PIECE, PIECES, POND, inPond, layOut, makeShapes } from './scenery'
import { LENGTH, PLACES, TRAIL_HALF, offset } from './trail'

describe('the setting', () => {
  const shapes = makeShapes(), standing = layOut()

  it('is the same on every visit: it never draws from the visit\'s chance', () => {
    expect(layOut()).toEqual(standing)
    const again = makeShapes()
    for (const kind of Object.keys(shapes) as (keyof typeof shapes)[]) {
      expect(again[kind].length).toBe(shapes[kind].length)
      again[kind].forEach((plaque, i) => expect(Array.from(plaque.cells)).toEqual(Array.from(shapes[kind][i].cells)))
    }
  })

  it('fills both sides of the whole ring, with no stretch of trail left bare', () => {
    expect(standing.length).toBeGreaterThan(200)
    const STRETCH = 120
    for (let from = 0; from < LENGTH; from += STRETCH) {
      for (const side of [-1, 1]) {
        const here = standing.filter((thing) => Math.sign(thing.x) === side && thing.s >= from && thing.s < from + STRETCH)
        expect(here.length, `side ${side} from ${from}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('stands nothing on the trail, in the pond or where the characters stand', () => {
    for (const thing of standing) {
      const half = shapes[thing.kind][thing.shape].w / 2
      expect(Math.abs(thing.x) - half, `${thing.kind} at ${thing.s}`).toBeGreaterThanOrEqual(TRAIL_HALF)
      if (thing.kind !== 'reeds') expect(inPond(thing.x, thing.s), `${thing.kind} at ${thing.s}`).toBe(false)
      for (const who of Object.keys(CLEARING) as (keyof typeof CLEARING)[]) {
        const near = Math.abs(offset(CLEARING[who].s, thing.s)) < 12 && Math.abs(thing.x - CLEARING[who].x) < half + 12
        expect(near, `${thing.kind} beside the ${who}`).toBe(false)
      }
    }
  })

  it('names shapes that exist', () => {
    for (const thing of standing) expect(shapes[thing.kind][thing.shape], thing.kind).toBeDefined()
  })

  it('puts the pond beside the goose, off the trail, where she looks', () => {
    expect(Math.abs(offset(PLACES.goose, POND.s))).toBeLessThan(POND.halfS)
    expect(POND.x + POND.halfX).toBeLessThan(-TRAIL_HALF)
    expect(inPond(POND.x, POND.s)).toBe(true)
    expect(inPond(0, POND.s)).toBe(false)
  })

  it('stands the five who wait off the trail and apart from each other', () => {
    const all = Object.values(CLEARING)
    for (const one of all) expect(Math.abs(one.x)).toBeGreaterThan(TRAIL_HALF + 6)
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(Math.hypot(all[i].x - all[j].x, offset(all[i].s, all[j].s))).toBeGreaterThan(30)
  })

  it('divides the ring into whole pieces, none holding more beads than one draw should', () => {
    expect(Number.isInteger(PIECES)).toBe(true)
    expect(PIECE * PIECES).toBe(LENGTH)
    const beads = new Array<number>(PIECES).fill(0)
    for (const thing of standing) beads[Math.floor(thing.s / PIECE)] += beadCount(shapes[thing.kind][thing.shape])
    for (const count of beads) {
      expect(count).toBeGreaterThan(2000)
      expect(count).toBeLessThan(11000)
    }
  })
})
