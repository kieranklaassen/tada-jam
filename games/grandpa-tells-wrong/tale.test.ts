import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { makeRng, pick } from './rng'
import { BARE, CAST, THINGS, YARD, after, morning, next, run, same, sameTale, tellWrong, type Event } from './tale'

const days: Event[][] = []
for (const a of YARD) for (const x of THINGS) for (const b of YARD) for (const y of ['jam', 'pillow', 'water'] as const) days.push([{ who: a, what: x }, { who: b, what: y }, { who: 'pig', what: 'mud' }])
days.push(Array.from({ length: 3 }, () => ({ who: 'goose', what: 'jam' })))

describe('what a thing leaves behind', () => {
  it('combines in an order', () => {
    const jam = after(BARE, 'jam')
    expect(after(jam, 'pillow').coat).toBe('feathers')
    expect(after(after(BARE, 'pillow'), 'jam').coat).toBe('jam')
    expect(after(after(BARE, 'mud'), 'pillow').coat).toBe('mud')
    expect(after({ coat: 'feathers', pants: true, up: true }, 'water')).toEqual({ coat: 'bare', pants: false, up: true })
    expect(after({ coat: 'bare', pants: true, up: true }, 'mud')).toEqual({ coat: 'mud', pants: true, up: false })
  })
  it('never changes what it was given, and a thing done twice leaves what it left the first time', () => {
    const base = morning(), frozen = JSON.stringify(base)
    for (const day of days) run(base, day)
    expect(JSON.stringify(base)).toBe(frozen)
    for (const what of THINGS) expect(after(after(BARE, what), what)).toEqual(after(BARE, what))
  })
})

describe('how he gets it wrong', () => {
  it.each(LADDER)('at %s always differs, and in as few places as it says', (position) => {
    const rng = makeRng(9)
    for (const day of days) {
      const kept = JSON.stringify(day)
      const told = tellWrong(day, position, (from) => pick(rng, from))
      expect(JSON.stringify(day)).toBe(kept)
      expect(told).toHaveLength(3)
      expect(sameTale(told, day)).toBe(false)
      const wrong = told.map((event, i) => (same(event, day[i]) ? -1 : i)).filter((i) => i >= 0)
      const sorted = (events: Event[]) => events.map((e) => e.who + e.what).sort().join()
      if (position !== 'any') expect(wrong).toHaveLength(position === 'order' && sorted(told) === sorted(day) ? 2 : 1)
      const at = wrong[0]
      if (position === 'who') expect([told[at].what, (YARD as readonly string[]).includes(told[at].who)]).toEqual([day[at].what, true])
      if (position === 'what') expect(told[at].who).toBe(day[at].who)
      if (position === 'himself') expect(told[at].who).toBe('grandpa')
      if (position === 'moon') expect(told[at].who).toBe('moon')
      if (position === 'order' && new Set(day.map((e) => e.who + e.what)).size > 1) expect(sorted(told)).toBe(sorted(day))
    }
  })
  it('spreads the wrong picture over all three places', () => {
    const rng = makeRng(4)
    const at = new Set(Array.from({ length: 60 }, (_, n) => {
      const told = tellWrong(days[n], 'what', (from) => pick(rng, from))
      return told.findIndex((event, i) => !same(event, days[n][i]))
    }))
    expect(at).toEqual(new Set([0, 1, 2]))
  })
  it('goes round to every puppet and every thing by taps alone', () => {
    const round = <T>(of: readonly T[]) => { const seen = new Set<T>(); let now = of[0]; do { seen.add(now); now = next(of, now) } while (now !== of[0]); return seen.size }
    expect([round(CAST), round(THINGS)]).toEqual([5, 6])
  })
})
