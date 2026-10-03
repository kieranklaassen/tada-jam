import { describe, expect, it } from 'vitest'
import { CAST, SPECIES, isSpecies, strokeTaste, taste } from './cast'
import { CARES } from './needs'

describe('the cast', () => {
  it('has six animals', () => {
    expect(SPECIES).toHaveLength(6)
    expect(Object.keys(CAST).sort()).toEqual([...SPECIES].sort())
  })

  it('gives every animal one thing it loves and another it is wary of', () => {
    for (const species of SPECIES) {
      const { loves, wary } = CAST[species]
      expect(CARES).toContain(loves)
      expect(CARES).toContain(wary)
      expect(loves, species).not.toBe(wary)
    }
  })

  it('has every care thing loved by someone and distrusted by someone, so each is worth trying on everyone', () => {
    for (const care of CARES) {
      expect(SPECIES.some((species) => CAST[species].loves === care), `${care} is loved`).toBe(true)
      expect(SPECIES.some((species) => CAST[species].wary === care), `${care} is distrusted`).toBe(true)
    }
  })

  it('reads a taste for every pair of animal and thing: one loved, one wary, three plain', () => {
    for (const species of SPECIES) {
      const tastes = CARES.map((care) => taste(species, care))
      expect(tastes.filter((t) => t === 'loves')).toHaveLength(1)
      expect(tastes.filter((t) => t === 'wary')).toHaveLength(1)
      expect(tastes.filter((t) => t === 'plain')).toHaveLength(3)
    }
  })

  it('gives every animal a spot it loves stroked and another that makes it squirm', () => {
    for (const species of SPECIES) {
      const { strokeLoved, strokeSquirms } = CAST[species]
      expect(strokeLoved, species).not.toBe(strokeSquirms)
      expect(strokeTaste(species, strokeLoved)).toBe('loved')
      expect(strokeTaste(species, strokeSquirms)).toBe('squirms')
    }
    expect(strokeTaste('bear', 'nose')).toBe('leans')
  })

  it('moves no two animals alike: tempo, weight and overshoot differ clearly between every pair', () => {
    for (let a = 0; a < SPECIES.length; a++) {
      for (let b = a + 1; b < SPECIES.length; b++) {
        const one = CAST[SPECIES[a]], other = CAST[SPECIES[b]]
        const apart = Math.abs(one.tempo - other.tempo) / 3.2 + Math.abs(one.weight - other.weight) + Math.abs(one.overshoot - other.overshoot)
        expect(apart, `${SPECIES[a]} and ${SPECIES[b]}`).toBeGreaterThan(0.3)
        expect(one.funniest, `${SPECIES[a]} and ${SPECIES[b]}`).not.toBe(other.funniest)
        expect(one.size).not.toBe(other.size)
      }
    }
  })

  it('tells an animal from anything else in a save', () => {
    expect(isSpecies('duck')).toBe(true)
    expect(isSpecies('unicorn')).toBe(false)
    expect(isSpecies(null)).toBe(false)
  })
})
