import { describe, expect, it } from 'vitest'
import { bellyLayout } from './belly'
import { GOBBLER, GOBBLERS, crewFor, crewGoesBy, gobblerFor, shapeOf, snackOf, takes } from './gobblers'
import { ATTRIBUTES, COLOURS, KINDS, SIZES, VALUES, type Toy } from './toys'

const EVERY_TOY: Toy[] = COLOURS.flatMap((colour) => KINDS.flatMap((kind) => SIZES.map((size) => ({ colour, kind, size }))))

describe('the gobblers and their tastes', () => {
  it('has one gobbler for every value of every attribute, and no other', () => {
    for (const by of ATTRIBUTES) for (const value of VALUES[by]) expect(GOBBLER[gobblerFor(by, value)].takes).toBe(value)
    expect(GOBBLERS.length).toBe(COLOURS.length + KINDS.length + SIZES.length)
  })

  it('gives every toy exactly one home in a crew that covers its attribute', () => {
    for (const by of ATTRIBUTES) {
      const crew = crewFor(by, VALUES[by])
      expect(crewGoesBy(crew)).toBe(by)
      for (const toy of EVERY_TOY) expect(crew.filter((id) => takes(id, toy)).length).toBe(1)
    }
  })

  it('takes a toy by one attribute alone, whatever the other two are', () => {
    for (const toy of EVERY_TOY) {
      expect(takes('red', toy)).toBe(toy.colour === 'red')
      expect(takes('car', toy)).toBe(toy.kind === 'car')
      expect(takes('little', toy)).toBe(toy.size === 'small')
      expect(takes('big', toy)).toBe(toy.size === 'big')
    }
  })

  it('keeps a crew in the fixed order of its values, however they are asked for', () => {
    expect(crewFor('colour', ['yellow', 'red'])).toEqual(['red', 'yellow'])
    expect(crewFor('size', ['big', 'small'])).toEqual(['little', 'big'])
  })

  it('gives no two gobblers the same way with a wrong toy or the same way of being lifted', () => {
    expect(new Set(GOBBLERS.map((id) => GOBBLER[id].wrong)).size).toBe(GOBBLERS.length)
    expect(new Set(GOBBLERS.map((id) => GOBBLER[id].lifted)).size).toBe(GOBBLERS.length)
  })

  it('arrives with a snack of its own sort, and the snacks of a crew differ only in what the crew goes by', () => {
    // Whatever the first toy of the load is, a snack is its gobbler's sort and is like that toy in the rest.
    for (const first of EVERY_TOY) {
      for (const id of GOBBLERS) {
        const snack = snackOf(id, first)
        expect(takes(id, snack)).toBe(true)
        for (const other of ATTRIBUTES) if (other !== GOBBLER[id].by) expect(snack[other]).toBe(first[other])
      }
      for (const by of ATTRIBUTES) {
        const snacks = crewFor(by, VALUES[by]).map((id) => snackOf(id, first))
        for (const other of ATTRIBUTES) {
          const seen = new Set(snacks.map((snack) => snack[other]))
          expect(seen.size).toBe(other === by ? snacks.length : 1)
        }
      }
    }
    // A gobbler that goes by size never gets a snack too tall for its belly from a load it can meet.
    for (const first of EVERY_TOY) expect(bellyLayout(shapeOf('little'), [snackOf('little', first)])).not.toBeNull()
  })

  it('shows what it takes in its own body', () => {
    expect(shapeOf('blue').model).toBeUndefined()
    expect(shapeOf('rocket').model).toBe('rocket')
    expect(shapeOf('big').width).toBeGreaterThan(shapeOf('little').width)
    expect(shapeOf('big').belly).toBeGreaterThan(shapeOf('little').belly)
    expect(shapeOf('red').colour).not.toEqual(shapeOf('yellow').colour)
  })
})
