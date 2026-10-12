import { describe, expect, it } from 'vitest'
import { DWELLERS, PLACES, SEASONS, THINGS, UNDER, nextSeason, placeOf, shines, type Season } from './wood'

describe('what is under each cover', () => {
  it('is something, in every place and every season', () => {
    const known = new Set<string>([...THINGS, ...DWELLERS])
    for (const place of PLACES) for (const season of SEASONS) expect(known, `${place} in ${season}`).toContain(UNDER[place][season])
  })

  it('holds no find in two places of one season, since there is one of each thing', () => {
    for (const season of SEASONS) {
      const finds = PLACES.map((place) => UNDER[place][season])
      expect(new Set(finds).size, season).toBe(finds.length)
    }
  })

  it('has the worm somewhere in every season, so the hedgehog can always be brought out', () => {
    for (const season of SEASONS) expect(placeOf('worm', season), season).not.toBeNull()
    // And never twice running under the same cover: the child has to know the wood.
    for (const season of SEASONS) expect(placeOf('worm', nextSeason(season))).not.toBe(placeOf('worm', season))
  })

  it('has every thing and every dweller somewhere in the year', () => {
    for (const find of [...THINGS, ...DWELLERS]) expect(SEASONS.some((season) => placeOf(find, season) !== null), find).toBe(true)
  })

  it('grows the apple in autumn only, on the branch', () => {
    expect(SEASONS.map((season) => placeOf('apple', season))).toEqual([null, null, 'branch', null])
  })

  it('turns the year round in four quarters', () => {
    let season: Season = SEASONS[0]
    const seen: Season[] = [season]
    for (let i = 0; i < 4; i++) { season = nextSeason(season); seen.push(season) }
    expect(seen).toEqual(['spring', 'summer', 'autumn', 'winter', 'spring'])
  })

  it('counts the button as what shines', () => {
    expect(THINGS.filter(shines)).toEqual(['button'])
  })
})
