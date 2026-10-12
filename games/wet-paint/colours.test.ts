import { describe, expect, it } from 'vitest'
import { BLUE, BROWN, GREEN, INKS, ORANGE, POTS, RED, VALUES, VIOLET, WATER, YELLOW, isPot, mixOf, parentsOf } from './colours'

describe('the colours on the water', () => {
  it('has three pot colours, and a cell fits in three bits', () => {
    expect(POTS).toEqual([RED, YELLOW, BLUE])
    expect(VALUES).toBe(8)
    expect(INKS).toHaveLength(VALUES)
    for (const pot of POTS) expect(isPot(pot)).toBe(true)
    for (const other of [WATER, ORANGE, GREEN, VIOLET, BROWN]) expect(isPot(other)).toBe(false)
  })

  it('makes a third colour where two pot colours are pulled together, whichever is carried', () => {
    expect(mixOf(RED, YELLOW)).toBe(ORANGE)
    expect(mixOf(YELLOW, RED)).toBe(ORANGE)
    expect(mixOf(YELLOW, BLUE)).toBe(GREEN)
    expect(mixOf(BLUE, YELLOW)).toBe(GREEN)
    expect(mixOf(RED, BLUE)).toBe(VIOLET)
    expect(mixOf(BLUE, RED)).toBe(VIOLET)
  })

  it('makes brown where a pot colour is pulled through the mix that does not hold it, and nothing where it does', () => {
    expect(mixOf(BLUE, ORANGE)).toBe(BROWN)
    expect(mixOf(RED, GREEN)).toBe(BROWN)
    expect(mixOf(YELLOW, VIOLET)).toBe(BROWN)
    for (const mix of [ORANGE, GREEN, VIOLET]) for (const parent of parentsOf(mix)!) expect(mixOf(parent, mix)).toBe(WATER)
  })

  it('makes nothing on clear water, in the same colour, in brown, or when what is carried is no pot colour', () => {
    for (const pot of POTS) {
      expect(mixOf(pot, WATER)).toBe(WATER)
      expect(mixOf(pot, pot)).toBe(WATER)
      expect(mixOf(pot, BROWN)).toBe(WATER)
    }
    expect(mixOf(ORANGE, BLUE)).toBe(WATER)
    expect(mixOf(WATER, RED)).toBe(WATER)
  })

  it('gives every ink a face and a darker edge, and no two inks one face', () => {
    const faces = new Set<string>()
    for (let value = 1; value < VALUES; value++) {
      const { face, edge } = INKS[value]
      expect(edge[0] + edge[1] + edge[2]).toBeLessThan(face[0] + face[1] + face[2])
      faces.add(face.join())
    }
    expect(faces.size).toBe(VALUES - 1)
  })
})
