import { describe, expect, it } from 'vitest'
import { MAX_LEN, MEET, MIN_LEN, NEAR, TUFTS } from './rules'
import { compare, outcomeOf, showingOf } from './showing'
import { CUSTOMERS, TASTES } from './tastes'
import type { Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 70, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(50), ribbon: null, clippings: [], shown: { snip: true, pull: true, ribbon: false }, ...over,
})

describe('what shows when the cape comes off', () => {
  it('says where the difference is: the piece below the model, or the gap above its end', () => {
    expect(compare(70, 44)).toMatchObject({ kind: 'too-long', by: 26, from: 44, to: 70 })
    expect(compare(30, 44)).toMatchObject({ kind: 'too-short', by: 14, from: 30, to: 44 })
    expect(compare(44, 44)).toMatchObject({ kind: 'as-long', by: 0, from: 44, to: 44, muddle: 0 })
  })

  it('lets two ends meet within a few steps either way, and no further', () => {
    for (let d = -MEET; d <= MEET; d++) expect(compare(50 + d, 50).kind).toBe('as-long')
    expect(compare(50 + MEET + 1, 50).kind).toBe('too-long')
    expect(compare(50 - MEET - 1, 50).kind).toBe('too-short')
  })

  it('makes a bigger muddle of a bigger miss, from nothing up to the most a lock can be off', () => {
    let last = 0
    for (let lock = 50 + MEET + 1; lock <= MAX_LEN; lock++) {
      const { muddle } = compare(lock, 50)
      expect(muddle).toBeGreaterThan(last)
      last = muddle
    }
    expect(compare(MAX_LEN, MIN_LEN).muddle).toBe(1)
    expect(compare(MIN_LEN, MAX_LEN).muddle).toBe(1)
    expect(compare(51 + MEET, 50).muddle).toBeLessThan(0.05)
  })

  it('treats too long and too short alike: the same miss is the same size either way', () => {
    for (const by of [6, 13, 30]) expect(compare(50 + by, 50).muddle).toBe(compare(50 - by, 50).muddle)
  })

  it('judges a cycle well, mixed or badly by how far the ends are apart', () => {
    expect(outcomeOf(50, 50)).toBe('well')
    expect(outcomeOf(50 + MEET, 50)).toBe('well')
    expect(outcomeOf(50 - MEET - 1, 50)).toBe('mixed')
    expect(outcomeOf(50 + NEAR, 50)).toBe('mixed')
    expect(outcomeOf(50 + NEAR + 1, 50)).toBe('badly')
    expect(outcomeOf(MIN_LEN, 50)).toBe('badly')
    expect(outcomeOf(MAX_LEN, 50)).toBe('badly')
  })

  it('cannot be passed by cutting to the root or pulling to the floor', () => {
    for (let model = 34; model <= 66; model++) {
      expect(outcomeOf(MIN_LEN, model)).toBe('badly')
      expect(outcomeOf(MAX_LEN, model)).toBe('badly')
    }
  })

  it('gives each customer its own reaction to each of the three', () => {
    const seen = new Set<string>()
    for (const chair of CUSTOMERS) for (const lock of [44, 80, 10]) seen.add(showingOf(salon({ chair, friend: chair === 'lion' ? 'yak' : 'lion', lock })).lock)
    expect(seen.size).toBe(12)
    expect(showingOf(salon({ lock: 80 })).lock).toBe(TASTES.lion.reactions.lockTooLong)
    expect(showingOf(salon({ lock: 10 })).lock).toBe(TASTES.lion.reactions.lockTooShort)
    expect(showingOf(salon({ lock: 46 })).lock).toBe(TASTES.lion.reactions.lockAsLong)
  })

  it('stars the exact haircut: the mane, the bow, the blindfold and what is worn on faces', () => {
    const long = showingOf(salon({ mane: Array(TUFTS).fill(90), ribbon: { len: 40, at: 'mane' } }))
    expect(long.mane).toBe('liked')
    expect(long.maneReaction).toBe(TASTES.lion.reactions.maneLiked)
    expect(long.bow).toBe(TASTES.lion.reactions.bow)
    const short = showingOf(salon({ mane: Array(TUFTS).fill(8), ribbon: { len: 40, at: 'face-friend' } }))
    expect(short.maneReaction).toBe(TASTES.lion.reactions.maneHated)
    expect(short.bow).toBeNull()
    expect(short.blindfold).toBe('friend')
    const plain = showingOf(salon({ clippings: [{ len: 9, hue: 'lion', on: 'chair', x: 0 }, { len: 9, hue: 'lion', on: 'chair', x: 0 }, { len: 9, hue: 'lion', on: 'friend', x: 0 }, { len: 9, hue: 'lion', on: 'floor', x: 5 }] }))
    expect(plain.maneReaction).toBeNull()
    expect(plain.blindfold).toBeNull()
    expect(plain.worn).toEqual({ chair: 2, friend: 1 })
  })
})
