import { describe, expect, it } from 'vitest'
import { PERSONAS, consideredCount, gestureProfile, getPersona } from './personas.ts'

describe('the roster', () => {
  it('has eight personas: Kaia, Tess, and archetypes at 3, 6, 7, 8, 9, and 11', () => {
    expect(PERSONAS.map((p) => p.id)).toEqual(['kaia', 'tess', 'arch-3', 'arch-6', 'arch-7', 'arch-8', 'arch-9', 'arch-11'])
    expect(PERSONAS.map((p) => p.age)).toEqual([4, 5, 3, 6, 7, 8, 9, 11])
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(8)
  })

  it('keeps every parameter in range and gives each a provenance label', () => {
    const labels = new Set(['research', 'default'])
    for (const p of PERSONAS) {
      expect(p.touchJitter).toBeGreaterThan(0)
      expect(p.attention).toBeGreaterThan(0)
      expect(p.draw.novelty).toBeGreaterThanOrEqual(0)
      expect(p.draw.mastery).toBeGreaterThanOrEqual(0)
      expect(p.aimInvention).toBeGreaterThanOrEqual(0)
      expect(p.aimInvention).toBeLessThanOrEqual(1)
      expect(p.returnPropensity).toBeGreaterThan(0)
      expect(p.returnPropensity).toBeLessThanOrEqual(1)
      for (const key of ['age', 'touchJitter', 'attention', 'draw', 'aimInvention', 'returnPropensity', 'gestureMix', 'tempo', 'focus']) {
        expect(labels.has(p.provenance[key] ?? '')).toBe(true)
      }
    }
  })

  it('labels a parameter research only where the age-band table supports it', () => {
    // Only affordances weighed at once for the 3 to 4 row is supported.
    for (const p of PERSONAS) {
      const research = Object.entries(p.provenance).filter(([, v]) => v === 'research').map(([k]) => k)
      expect(research).toEqual(p.age <= 4 ? ['focus'] : [])
    }
  })

  it('does not claim Kaia numbers or Tess age are measured', () => {
    expect(getPersona('kaia').provenance['touchJitter']).toBe('default')
    expect(getPersona('kaia').provenance['attention']).toBe('default')
    expect(getPersona('tess').provenance['age']).toBe('default')
  })

  it('varies the archetypes independently of age', () => {
    const archetypes = PERSONAS.filter((p) => p.id.startsWith('arch-'))
    const byAge = [...archetypes].sort((a, b) => a.age - b.age)
    // Not every trait is monotone in age: some older ones are jittery, some
    // young ones are patient, and the draw and propensity move around.
    const jitters = byAge.map((p) => p.touchJitter)
    const attentions = byAge.map((p) => p.attention)
    const sortedDown = (values: number[]) => values.every((v, i) => i === 0 || v <= values[i - 1]!)
    const sortedUp = (values: number[]) => values.every((v, i) => i === 0 || v >= values[i - 1]!)
    expect(sortedDown(jitters)).toBe(false)
    expect(sortedUp(attentions)).toBe(false)
    expect(new Set(archetypes.map((p) => p.draw.novelty)).size).toBeGreaterThan(4)
    const novelty = archetypes.filter((p) => p.draw.novelty >= 0.7)
    const mastery = archetypes.filter((p) => p.draw.mastery >= 0.7)
    expect(novelty.length).toBeGreaterThan(0)
    expect(mastery.length).toBeGreaterThan(0)
  })

  it('makes younger children more jittery with shorter attention than older ones, on the age-led pair', () => {
    const kaia = getPersona('kaia')
    const eleven = getPersona('arch-11')
    expect(kaia.touchJitter).toBeGreaterThan(eleven.touchJitter)
    expect(kaia.attention).toBeLessThan(eleven.attention)
    expect(getPersona('arch-3').touchJitter).toBeGreaterThan(getPersona('arch-8').touchJitter)
  })

  it('finds a persona by id and refuses an unknown one', () => {
    expect(getPersona('tess').age).toBe(5)
    expect(() => getPersona('nobody')).toThrow(/unknown persona/)
  })
})

describe('gesture profiles', () => {
  it('gives younger children more taps and holds, older children more drags', () => {
    const young = gestureProfile(getPersona('arch-3'))
    const old = gestureProfile(getPersona('arch-11'))
    expect(young.mix.tap + young.mix.hold).toBeGreaterThan(old.mix.tap + old.mix.hold)
    expect(old.mix.drag).toBeGreaterThan(young.mix.drag)
    expect(young.thinkMax).toBeLessThan(old.thinkMax)
  })

  it('weighs fewer affordances at once when young', () => {
    expect(consideredCount(getPersona('kaia'))).toBe(2)
    expect(consideredCount(getPersona('tess'))).toBeGreaterThan(2)
    expect(consideredCount(getPersona('arch-11'))).toBe(Number.POSITIVE_INFINITY)
  })
})
