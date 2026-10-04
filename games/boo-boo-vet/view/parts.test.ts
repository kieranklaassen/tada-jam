import { describe, expect, it } from 'vitest'
import { SPECIES } from '../cast'
import { FIGURES } from './figures'
import { TABLE_HEIGHT } from './layout'
import { CARRIER, PARTS, SHADE, TONGUE } from './parts'
import type { Bounds } from './sticker'

type Origin = 'centre' | 'bottom' | 'top' | 'left'
const NEAR = 12

/** Whether the origin (0, 0) lies where it should on the box: its centre, or the middle of one of its edges. */
function originAt(bounds: Bounds, where: Origin): boolean {
  const cx = (bounds.x0 + bounds.x1) / 2, cy = (bounds.y0 + bounds.y1) / 2
  if (where === 'centre') return Math.abs(cx) <= NEAR && Math.abs(cy) <= NEAR
  if (where === 'bottom') return Math.abs(cx) <= NEAR && Math.abs(bounds.y1) <= NEAR
  if (where === 'top') return Math.abs(cx) <= NEAR && Math.abs(bounds.y0) <= NEAR
  return Math.abs(bounds.x0) <= NEAR && Math.abs(cy) <= NEAR
}

const every: [string, { paint: unknown; bounds: Bounds }, Origin][] = [
  ...SPECIES.map((species): [string, { paint: unknown; bounds: Bounds }, Origin] => [`paw of the ${species}`, PARTS.paw(species), 'bottom']),
  ...SPECIES.map((species): [string, { paint: unknown; bounds: Bounds }, Origin] => [`arms of the ${species}`, PARTS.arms(species), 'centre']),
  ['short tongue', PARTS.tongue(1), 'top'],
  ['long tongue', PARTS.tongue(2), 'top'],
  ['burr', PARTS.burr, 'centre'],
  ['puff', PARTS.puff, 'left'],
  ['shade', PARTS.shade, 'top'],
  ['eyes open', PARTS.eyes(false), 'centre'],
  ['eyes shut', PARTS.eyes(true), 'centre'],
  ['carrier shut', PARTS.carrier(false), 'bottom'],
  ['carrier open', PARTS.carrier(true), 'bottom'],
  ['den', PARTS.den, 'centre'],
  ['foam', PARTS.foam, 'bottom'],
  ['beard', PARTS.beard, 'top'],
]

describe('the parts', () => {
  it.each(every)('%s has a drawing, a box of some size, and its origin in the right place', (_name, part, where) => {
    expect(typeof part.paint).toBe('function')
    expect(part.bounds.x1 - part.bounds.x0).toBeGreaterThan(0)
    expect(part.bounds.y1 - part.bounds.y0).toBeGreaterThan(0)
    expect(originAt(part.bounds, where)).toBe(true)
  })

  it('has a paw and a hug for every animal, larger for a larger animal', () => {
    const width = (bounds: Bounds) => bounds.x1 - bounds.x0
    for (const species of SPECIES) {
      expect(width(PARTS.paw(species).bounds), species).toBeGreaterThan(20)
      expect(width(PARTS.arms(species).bounds), species).toBeGreaterThan(40)
    }
    expect(width(PARTS.paw('bear').bounds)).toBeGreaterThan(width(PARTS.paw('hedgehog').bounds))
    expect(width(PARTS.arms('bear').bounds)).toBeGreaterThan(width(PARTS.arms('rabbit').bounds))
  })

  it('has fur on end for every animal, in a ring that stands out past the animal all round', () => {
    for (const species of SPECIES) {
      const fur = PARTS.fur(species).bounds, body = FIGURES[species].bounds
      expect('bare' in PARTS.fur(species), species).toBe(false)
      // Wider than the animal's body on both sides, and reaching from above its shoulders to its seat.
      expect(fur.x1, species).toBeGreaterThan(Math.min(body.x1, -body.x0))
      expect(fur.x0, species).toBeLessThan(-Math.min(body.x1, -body.x0))
      expect(fur.y1, species).toBeGreaterThanOrEqual(0)
      expect(fur.y0, species).toBeLessThan(body.y0 * 0.6)
    }
    expect(PARTS.eye.bare).toBe(true)
  })

  it('draws the same part for the same animal each time', () => {
    for (const species of SPECIES) {
      expect(PARTS.paw(species).bounds).toEqual(PARTS.paw(species).bounds)
      expect(PARTS.arms(species).bounds).toEqual(PARTS.arms(species).bounds)
    }
  })

  it('hangs the long tongue well below the short one', () => {
    const long = (length: 1 | 2) => PARTS.tongue(length).bounds.y1 - PARTS.tongue(length).bounds.y0
    expect(long(2) - long(1)).toBeGreaterThanOrEqual(20)
    expect(long(1)).toBe(TONGUE[1])
    expect(long(2)).toBe(TONGUE[2])
  })

  it('bakes bare what is not vinyl and what lies on the animal, and nothing else', () => {
    for (const part of [PARTS.shade, PARTS.eyes(false), PARTS.eyes(true), PARTS.arms('bear'), PARTS.tongue(1), PARTS.tongue(2), PARTS.burr, PARTS.beard]) {
      expect(part.bare).toBe(true)
    }
    for (const part of [PARTS.paw('bear'), PARTS.paw('duck'), PARTS.puff, PARTS.den, PARTS.foam, PARTS.carrier(false), PARTS.carrier(true)]) {
      expect('bare' in part).toBe(false)
    }
  })

  it('fits the dark under the table: between the legs, from under the top to the floor', () => {
    // room.ts: the top's edge is 50 deep and the legs' inner sides stand 105 from the middle.
    expect(SHADE.half).toBeLessThanOrEqual(105)
    expect(50 + SHADE.deep).toBeLessThanOrEqual(TABLE_HEIGHT)
    expect(50 + SHADE.deep).toBeGreaterThan(TABLE_HEIGHT - 12)
  })

  it('puts the carrier window inside the carrier, where the eyes fit', () => {
    const shut = PARTS.carrier(false).bounds, eyes = PARTS.eyes(false).bounds
    expect(CARRIER.window.x + eyes.x0).toBeGreaterThan(shut.x0)
    expect(CARRIER.window.x + eyes.x1).toBeLessThan(shut.x1)
    expect(CARRIER.window.y + eyes.y0).toBeGreaterThan(shut.y0)
    expect(CARRIER.window.y + eyes.y1).toBeLessThan(shut.y1)
  })
})
