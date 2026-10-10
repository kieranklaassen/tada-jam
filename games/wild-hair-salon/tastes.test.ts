import { describe, expect, it } from 'vitest'
import { TUFTS } from './rules'
import { CUSTOMERS, TASTES, isCustomer, maneFeeling, maneKind } from './tastes'

const every = <T>(pick: (who: (typeof CUSTOMERS)[number]) => T): T[] => CUSTOMERS.map(pick)

describe('the customers and their tastes', () => {
  it('has four customers, each with every taste filled in', () => {
    expect(CUSTOMERS).toHaveLength(4)
    for (const who of CUSTOMERS) {
      const t = TASTES[who]
      for (const text of [t.funniest, ...Object.values(t.reactions), ...Object.values(t.asFriend)]) expect(text.length).toBeGreaterThan(3)
      expect(t.voiceHz).toBeGreaterThanOrEqual(100)
      expect(t.voiceHz).toBeLessThanOrEqual(700)
    }
  })

  it('gives no two customers the same reaction to anything', () => {
    const all = CUSTOMERS.flatMap((who) => [...Object.values(TASTES[who].reactions), ...Object.values(TASTES[who].asFriend)])
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives no two customers the same set of tastes, the same funniest part or the same voice', () => {
    expect(new Set(every((who) => `${TASTES[who].mane}/${TASTES[who].bow}/${TASTES[who].rub}`)).size).toBe(4)
    expect(new Set(every((who) => TASTES[who].funniest)).size).toBe(4)
    expect(new Set(every((who) => TASTES[who].voiceHz)).size).toBe(4)
    // Voices are far enough apart to tell by ear: at least a major third between any two.
    const voices = every((who) => TASTES[who].voiceHz).sort((a, b) => a - b)
    for (let i = 1; i < voices.length; i++) expect(voices[i] / voices[i - 1]).toBeGreaterThanOrEqual(1.25)
  })

  it('splits every taste two against two, so each is worth trying on purpose', () => {
    for (const key of ['mane', 'bow', 'rub'] as const) {
      const counts = new Map<string, number>()
      for (const who of CUSTOMERS) counts.set(TASTES[who][key], (counts.get(TASTES[who][key]) ?? 0) + 1)
      expect([...counts.values()].sort()).toEqual([2, 2])
    }
  })

  it('reads a mane as long, short or middling from its tufts', () => {
    expect(maneKind(Array(TUFTS).fill(90))).toBe('long')
    expect(maneKind(Array(TUFTS).fill(10))).toBe('short')
    expect(maneKind(Array(TUFTS).fill(48))).toBe('middling')
    expect(maneKind([])).toBe('short')
  })

  it('never changes a taste: the same mane gets the same feeling every time, and the other kind gets the opposite', () => {
    const long = Array(TUFTS).fill(88), short = Array(TUFTS).fill(8), middling = Array(TUFTS).fill(48)
    for (const who of CUSTOMERS) {
      const likesLong = TASTES[who].mane === 'long'
      for (let i = 0; i < 3; i++) {
        expect(maneFeeling(who, long)).toBe(likesLong ? 'liked' : 'hated')
        expect(maneFeeling(who, short)).toBe(likesLong ? 'hated' : 'liked')
        expect(maneFeeling(who, middling)).toBe('plain')
      }
    }
  })

  it('knows a customer from anything else', () => {
    for (const who of CUSTOMERS) expect(isCustomer(who)).toBe(true)
    for (const bad of ['cat', '', 3, null, undefined, {}]) expect(isCustomer(bad)).toBe(false)
  })
})
