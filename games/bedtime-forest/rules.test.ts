import { describe, expect, it } from 'vitest'
import { ANIMAL_KEYS, ANIMALS, HOME_KEYS } from './layout'
import { endsAtHome, reactionFor } from './rules'

describe('reactionFor', () => {
  it('every animal settles in its own home and only there', () => {
    for (const animal of ANIMAL_KEYS) {
      for (const home of HOME_KEYS) {
        const settles = reactionFor(animal, home, false) === 'settle'
        expect(settles, `${animal} in ${home}`).toBe(ANIMALS[animal].home === home)
      }
    }
  })

  it('names the brief’s physical corrections', () => {
    expect(reactionFor('bear', 'burrow', false)).toBe('bump')
    expect(reactionFor('fish', 'nest', false)).toBe('flop')
    expect(reactionFor('owl', 'burrow', false)).toBe('flyHome')
    expect(reactionFor('rabbit', 'pond', false)).toBe('splash')
    expect(reactionFor('fox', 'hollow', false)).toBe('slide')
    expect(reactionFor('bear', 'hollow', false)).toBe('bump')
    expect(reactionFor('rabbit', 'nest', false)).toBe('tip')
    expect(reactionFor('rabbit', 'cave', false)).toBe('shiver')
    expect(reactionFor('fox', 'burrow', false)).toBe('bump')
  })

  it('the fish and the birds always end up in their own homes', () => {
    for (const home of HOME_KEYS) {
      for (const animal of ['fish', 'owl', 'songbird'] as const) {
        expect(endsAtHome(reactionFor(animal, home, false)), `${animal} in ${home}`).toBe(true)
      }
    }
  })

  it('an occupied home turns a mammal away with a bump, never a verdict', () => {
    expect(reactionFor('rabbit', 'cave', true)).toBe('bump')
    expect(reactionFor('bear', 'den', true)).toBe('bump')
  })

  it('mammals never end at home from a wrong home (the child finishes the job)', () => {
    for (const animal of ['fox', 'rabbit', 'bear'] as const) {
      for (const home of HOME_KEYS) {
        if (ANIMALS[animal].home === home) continue
        expect(endsAtHome(reactionFor(animal, home, false))).toBe(false)
      }
    }
  })
})
