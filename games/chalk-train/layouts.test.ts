import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { NEAR, fits, layOut, layOutCompanion, roomFor, type Layout } from './layouts'
import { makeRng, pick } from './rng'
import { RIDERS } from './tastes'
import { ENGINE_PLACE, ENGINE_START, PLACES, RAIL_DROP, PLACE_IDS, crossesPuddle, distance, type PlaceId } from './yard'

describe('the positions of the designed order', () => {
  it('names places in the game own order, and never a grade, a groep or a level', () => {
    expect(LADDER).toEqual(['short-hop', 'long-way', 'up-and-down', 'round-the-water', 'far-rider', 'two-at-once'])
    for (const id of LADDER) expect(id).not.toMatch(/grade|groep|level|fase|class|year|stage|\d/i)
  })

  it('lays each position as designed on an empty tar, for every seed', () => {
    for (const position of LADDER) for (let seed = 1; seed <= 60; seed++) {
      const l = layOut(position, makeRng(seed), ENGINE_START, [ENGINE_PLACE], [])
      expect(fits(position, PLACES[l.stop], PLACES[l.home], ENGINE_START), `${position} seed ${seed}`).toBe(true)
    }
  })

  it('adds one new thing at a time', () => {
    const stop = PLACES['mid-2'], train = ENGINE_START
    // A short level way, then a long one, then a slope, then the water between, then a rider to fetch.
    expect(fits('short-hop', stop, PLACES['mid-3'], train)).toBe(true)
    expect(fits('long-way', stop, PLACES['mid-3'], train)).toBe(false)
    expect(fits('long-way', stop, PLACES['mid-4'], train)).toBe(true)
    expect(fits('up-and-down', stop, PLACES['mid-4'], train)).toBe(false)
    expect(fits('up-and-down', stop, PLACES['top-3'], train)).toBe(true)
    // A home right beside the train is no ride, at any position.
    expect(fits('short-hop', PLACES['mid-3'], PLACES['mid-2'], train)).toBe(false)
    expect(fits('round-the-water', PLACES['low-2'], PLACES['low-3'], PLACES['low-1'])).toBe(true)
    expect(fits('round-the-water', stop, PLACES['mid-4'], train)).toBe(false)
    expect(fits('far-rider', PLACES['top-4'], PLACES['mid-3'], train)).toBe(true)
    expect(fits('far-rider', stop, PLACES['mid-4'], train)).toBe(false)
    expect(fits('nowhere', stop, PLACES['mid-4'], train)).toBe(false)
  })

  it('keeps the water off the way until the position that brings it', () => {
    for (const position of ['short-hop', 'long-way', 'up-and-down']) for (let seed = 1; seed <= 80; seed++) {
      const l = layOut(position, makeRng(seed), ENGINE_START, [ENGINE_PLACE], [])
      expect(crossesPuddle(PLACES[l.stop], PLACES[l.home])).toBe(false)
    }
  })

  it('never lays a rider on a busy place, on one place twice, or as a kind already on the tar', () => {
    const rng = makeRng(11)
    for (let run = 0; run < 400; run++) {
      const busy: PlaceId[] = []
      while (busy.length < 7) { const id = pick(rng, PLACE_IDS); if (!busy.includes(id)) busy.push(id) }
      const taken = RIDERS.slice(0, run % 4)
      const l = layOut(pick(rng, LADDER), rng, PLACES[pick(rng, PLACE_IDS)], busy, taken)
      expect(busy).not.toContain(l.stop)
      expect(busy).not.toContain(l.home)
      expect(l.stop).not.toBe(l.home)
      expect(taken).not.toContain(l.kind)
      const c = layOutCompanion(rng, [...busy, l.stop, l.home], [...taken, l.kind])
      expect([...busy, l.stop, l.home]).not.toContain(c.stop)
      expect([...busy, l.stop, l.home]).not.toContain(c.home)
      expect(c.stop).not.toBe(c.home)
    }
  })

  it('lies as designed cycle after cycle, with the tar as full as play makes it', () => {
    for (const position of LADDER) {
      const rng = makeRng(77)
      let train = { ...ENGINE_START } as { x: number; y: number }
      let past: Layout | null = null
      let now = layOut(position, rng, train, [ENGINE_PLACE], [])
      let asDesigned = 0
      const cycles = 300
      for (let i = 0; i < cycles; i++) {
        // The next rider is laid out while `now` is in play and the last rider sits at home.
        const busy = [now.stop, now.home, ...(past ? [past.home] : [])]
        const whereTrainWillBe = { x: PLACES[now.home].x, y: PLACES[now.home].y + RAIL_DROP }
        const next = layOut(position, rng, whereTrainWillBe, busy, [now.kind, ...(past ? [past.kind] : [])])
        if (fits(position, PLACES[next.stop], PLACES[next.home], whereTrainWillBe)) asDesigned++
        past = now
        now = next
        train = whereTrainWillBe
      }
      // With three riders' places taken, a layout as designed is still found nearly always. The water has the
      // fewest ways across it, so it falls back most often, to a way across with a rider to fetch.
      expect(asDesigned / cycles, position).toBeGreaterThan(0.85)
    }
  })

  it('sets a near rider within walking reach of the train and a far one beyond it', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const near = layOut('short-hop', makeRng(seed), ENGINE_START, [ENGINE_PLACE], [])
      expect(distance(PLACES[near.stop], ENGINE_START)).toBeLessThanOrEqual(NEAR)
      const far = layOut('far-rider', makeRng(seed), ENGINE_START, [ENGINE_PLACE], [])
      expect(distance(PLACES[far.stop], ENGINE_START)).toBeGreaterThan(NEAR)
    }
  })

  it('knows when the tar is too full to lay anyone out', () => {
    expect(roomFor([])).toBe(true)
    expect(roomFor(PLACE_IDS.slice(0, 10))).toBe(true)
    expect(roomFor(PLACE_IDS.slice(0, 11))).toBe(false)
  })
})
