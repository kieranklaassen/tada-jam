import { describe, expect, it } from 'vitest'
import { CHARACTERS, HAPPENINGS, TASTES, WATER_IS, reactionOf, type Character, type Happening } from './tastes'

const likes = (character: Character) => Object.keys(TASTES[character].likes).sort()
const dislikes = (character: Character) => Object.keys(TASTES[character].dislikes).sort()
const cuesOf = (character: Character) => [...Object.values(TASTES[character].likes), ...Object.values(TASTES[character].dislikes), TASTES[character].unmoved]

describe('the characters and their fixed tastes', () => {
  it('has four animals and the truck, each with exactly one want', () => {
    expect(CHARACTERS).toEqual(['truck', 'cat', 'duck', 'snail', 'bee'])
    for (const character of CHARACTERS) {
      expect(typeof TASTES[character].want).toBe('string')
      expect(TASTES[character].want.length).toBeGreaterThan(0)
    }
    expect(new Set(CHARACTERS.map((character) => TASTES[character].want)).size).toBe(5)
    expect(Object.keys(TASTES).sort()).toEqual([...CHARACTERS].sort())
  })

  it('holds the tastes of the design sheet exactly', () => {
    expect(likes('truck')).toEqual(['something-to-aim-at'])
    expect(dislikes('truck')).toEqual([])
    expect(likes('cat')).toEqual(['dry-sand', 'fire-lit', 'on-roof'])
    expect(dislikes('cat')).toEqual(['fire-out', 'water-on-me', 'wet-ground-under-me'])
    expect(likes('duck')).toEqual(['afloat', 'puddle', 'ride-over-rim', 'water-on-me'])
    expect(dislikes('duck')).toEqual(['dry-pool-floor'])
    expect(likes('snail')).toEqual(['puddle', 'wet-ground-under-me'])
    expect(dislikes('snail')).toEqual(['dry-sand', 'heat'])
    expect(likes('bee')).toEqual(['flower-open'])
    expect(dislikes('bee')).toEqual(['drops-on-wings'])
  })

  it('gives the truck no dislikes', () => {
    for (const happening of HAPPENINGS) expect(reactionOf('truck', happening).feeling).not.toBe('dislikes')
  })

  it('lets the same water delight the duck and the snail and offend the cat and the bee', () => {
    expect(reactionOf('duck', WATER_IS.duck).feeling).toBe('likes')
    expect(reactionOf('snail', WATER_IS.snail).feeling).toBe('likes')
    expect(reactionOf('cat', WATER_IS.cat).feeling).toBe('dislikes')
    expect(reactionOf('bee', WATER_IS.bee).feeling).toBe('dislikes')
    // Wet sand and a puddle divide them the same way.
    expect(reactionOf('snail', 'wet-ground-under-me').feeling).toBe('likes')
    expect(reactionOf('cat', 'wet-ground-under-me').feeling).toBe('dislikes')
    expect(reactionOf('duck', 'puddle').feeling).toBe('likes')
    expect(reactionOf('snail', 'dry-sand').feeling).toBe('dislikes')
    expect(reactionOf('cat', 'dry-sand').feeling).toBe('likes')
  })

  it('sets the cat and the snail against each other over the fire', () => {
    expect(reactionOf('cat', 'fire-lit')).toEqual({ feeling: 'likes', cue: 'cat-eyes-shut' })
    expect(reactionOf('cat', 'fire-out')).toEqual({ feeling: 'dislikes', cue: 'cat-tail-up' })
    expect(reactionOf('snail', 'heat').feeling).toBe('dislikes')
  })

  it('never likes and dislikes one happening, and names only known happenings', () => {
    for (const character of CHARACTERS) {
      for (const happening of likes(character)) expect(dislikes(character)).not.toContain(happening)
      for (const happening of [...likes(character), ...dislikes(character)]) expect(HAPPENINGS).toContain(happening as Happening)
    }
    expect(new Set(HAPPENINGS).size).toBe(HAPPENINGS.length)
    // Every happening matters to someone.
    for (const happening of HAPPENINGS) expect(CHARACTERS.some((character) => reactionOf(character, happening).feeling !== 'indifferent')).toBe(true)
  })

  it('answers every character and every happening, always the same way', () => {
    for (const character of CHARACTERS) {
      for (const happening of HAPPENINGS) {
        const reaction = reactionOf(character, happening)
        expect(['likes', 'dislikes', 'indifferent']).toContain(reaction.feeling)
        expect(reaction.cue).toMatch(/^[a-z]+(-[a-z]+)+$/)
        expect(reactionOf(character, happening)).toEqual(reaction)
        if (reaction.feeling === 'indifferent') expect(reaction.cue).toBe(TASTES[character].unmoved)
      }
    }
  })

  it('shares no reaction cue between two characters, or between two tastes of one', () => {
    const all = CHARACTERS.flatMap(cuesOf)
    expect(new Set(all).size).toBe(all.length)
    for (const character of CHARACTERS) for (const cue of cuesOf(character)) expect(cue.startsWith(`${character}-`)).toBe(true)
  })

  it('has no reaction about the child', () => {
    const words = [...CHARACTERS.flatMap(cuesOf), ...CHARACTERS.map((character) => TASTES[character].want), ...HAPPENINGS]
    for (const word of words) for (const banned of ['child', 'player', 'praise', 'thanks', 'sad-at']) expect(word).not.toContain(banned)
  })
})
