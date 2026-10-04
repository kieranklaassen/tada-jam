import { describe, expect, it } from 'vitest'
import { SPECIES } from '../cast'
import { FACES, FIGURES } from './figures'

const height = (species: (typeof SPECIES)[number]) => FIGURES[species].bounds.y1 - FIGURES[species].bounds.y0

describe('the six figures', () => {
  it('has a figure for every species, and ten faces', () => {
    for (const species of SPECIES) {
      expect(FIGURES[species], species).toBeDefined()
      expect(typeof FIGURES[species].paint, species).toBe('function')
    }
    expect([...FACES].sort()).toEqual(['afraid', 'bliss', 'bothered', 'calm', 'glad', 'hurting', 'miserable', 'wary', 'worn', 'wow'])
  })

  it('keeps every anchor inside the figure', () => {
    for (const species of SPECIES) {
      const { bounds, anchors } = FIGURES[species]
      expect(Object.keys(anchors).sort(), species).toEqual(['back', 'head', 'lap', 'mouth', 'side'])
      for (const [name, spot] of Object.entries(anchors)) {
        expect(spot.x, `${species} ${name}`).toBeGreaterThanOrEqual(bounds.x0)
        expect(spot.x, `${species} ${name}`).toBeLessThanOrEqual(bounds.x1)
        expect(spot.y, `${species} ${name}`).toBeGreaterThanOrEqual(bounds.y0)
        expect(spot.y, `${species} ${name}`).toBeLessThanOrEqual(bounds.y1)
      }
    }
  })

  it('puts the anchors where their names say', () => {
    for (const species of SPECIES) {
      const { head, mouth, lap, back, side } = FIGURES[species].anchors
      expect(head.y, species).toBeLessThan(mouth.y)
      expect(mouth.y, species).toBeLessThan(lap.y)
      expect(lap.y, species).toBeLessThanOrEqual(0)
      // The animal's left is the right of the screen.
      expect(back.x, species).toBeGreaterThan(0)
      expect(back.y, species).toBeLessThan(lap.y)
      // The animal's right is the left of the screen; a held-up paw joins it about a third of the way up.
      const tall = -FIGURES[species].bounds.y0
      expect(side.x, species).toBeLessThan(0)
      expect(-side.y / tall, species).toBeGreaterThan(0.25)
      expect(-side.y / tall, species).toBeLessThan(0.42)
    }
  })

  it('orders the heights so the six differ at a glance', () => {
    expect(height('bear')).toBeGreaterThan(height('dog'))
    expect(height('dog')).toBeGreaterThan(Math.max(height('rabbit'), height('cat')))
    expect(Math.min(height('rabbit'), height('cat'))).toBeGreaterThan(height('duck'))
    expect(height('duck')).toBeGreaterThan(height('hedgehog'))
    for (let i = 0; i < SPECIES.length; i++) {
      for (let j = i + 1; j < SPECIES.length; j++) {
        expect(Math.abs(height(SPECIES[i]) - height(SPECIES[j])), `${SPECIES[i]} and ${SPECIES[j]}`).toBeGreaterThanOrEqual(8)
      }
    }
  })

  it('sits every figure on its origin', () => {
    for (const species of SPECIES) {
      const { bounds } = FIGURES[species]
      expect(bounds.y1, species).toBeGreaterThanOrEqual(0)
      expect(bounds.y1, species).toBeLessThanOrEqual(10)
      expect(bounds.x0, species).toBeLessThan(0)
      expect(bounds.x1, species).toBeGreaterThan(0)
    }
  })
})
