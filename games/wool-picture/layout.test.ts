import { describe, expect, it } from 'vitest'
import { BOWLS, BOWL_REACH, COMB, FELT, FOLK, FRAME, LOOP, PEGS, PERCHES, ROOM, folkBox, grownUpCorner, homeControl, overlaps, spotAt, touchables } from './layout'

/** The two landscape sizes a still is taken at. */
const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768]]

describe('the layout', () => {
  it.each(SURFACES)('keeps everything that answers a touch out from under the home control and the grown-up corner at %i by %i', (width, height) => {
    const home = homeControl(width, height), corner = grownUpCorner(width, height)
    for (const { name, box } of touchables()) {
      expect(overlaps(box, home), `${name} under the home control`).toBe(false)
      expect(overlaps(box, corner), `${name} in the grown-up corner`).toBe(false)
    }
  })

  it('makes the felt the large thing: over a third of the stage', () => {
    expect((FELT.w * FELT.h) / (ROOM.width * ROOM.height)).toBeGreaterThan(0.33)
  })

  it('gives every bowl a circle of 120 to answer on, and keeps the circles apart', () => {
    expect(BOWL_REACH * 2).toBe(120)
    for (let i = 1; i < BOWLS.length; i++) expect(BOWLS[i].x - BOWLS[i - 1].x).toBeGreaterThanOrEqual(BOWL_REACH * 2 + 12)
  })

  it('stands the figures large: each at least a seventh of the stage wide, and all inside it', () => {
    for (let who = 0; who < FOLK.length; who++) {
      const box = folkBox(who)
      expect(box.w).toBeGreaterThanOrEqual(ROOM.width / 7)
      expect(box.x).toBeGreaterThanOrEqual(FRAME.x + FRAME.w)
      expect(box.x + box.w).toBeLessThanOrEqual(ROOM.width)
      expect(box.y + box.h).toBeLessThanOrEqual(ROOM.height)
    }
  })

  it('finds what a touch lands on among the things that keep their place: the felt by its cell, a bowl, the comb, the loop, a peg, the moth where it sits, and the room otherwise', () => {
    expect(spotAt({ x: FELT.x + 5, y: FELT.y + 5 }, null)).toEqual({ on: 'felt', col: 0, row: 0 })
    expect(spotAt({ x: FELT.x + FELT.w - 1, y: FELT.y + FELT.h - 1 }, null)).toEqual({ on: 'felt', col: 71, row: 47 })
    BOWLS.forEach((bowl, dye) => expect(spotAt({ x: bowl.x, y: bowl.y - 20 }, null)).toEqual({ on: 'bowl', dye }))
    expect(spotAt({ x: COMB.x, y: COMB.y }, null)).toEqual({ on: 'comb' })
    expect(spotAt({ x: LOOP.x, y: LOOP.y }, null)).toEqual({ on: 'loop' })
    PEGS.forEach((peg, i) => expect(spotAt(peg, null)).toEqual({ on: 'peg', peg: i }))
    expect(spotAt(PERCHES[0], PERCHES[0])).toEqual({ on: 'moth' })
    expect(spotAt(PERCHES[0], null)).toEqual({ on: 'room' })
    expect(spotAt({ x: 20, y: 300 }, null)).toEqual({ on: 'room' })
  })
})
