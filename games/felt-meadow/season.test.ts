import { describe, expect, it } from 'vitest'
import { SEASON_LOOKS, seasonFor } from './season'

describe('calendar season mirror', () => {
  it('follows the northern calendar by default', () => {
    expect(seasonFor(new Date(2026, 0, 15))).toBe('winter')
    expect(seasonFor(new Date(2026, 3, 15))).toBe('spring')
    expect(seasonFor(new Date(2026, 6, 15))).toBe('summer')
    expect(seasonFor(new Date(2026, 9, 15))).toBe('autumn')
    expect(seasonFor(new Date(2026, 11, 15), null)).toBe('winter')
  })

  it('flips for southern-hemisphere countries, in any case', () => {
    expect(seasonFor(new Date(2026, 6, 15), 'AU')).toBe('winter')
    expect(seasonFor(new Date(2026, 0, 15), 'nz')).toBe('summer')
    expect(seasonFor(new Date(2026, 6, 15), 'NL')).toBe('summer')
  })

  it('falls back to a season for an invalid date instead of throwing', () => {
    expect(SEASON_LOOKS[seasonFor(new Date(Number.NaN))]).toBeDefined()
  })

  it('only changes the look: every season has the same shape of look', () => {
    for (const look of Object.values(SEASON_LOOKS)) {
      expect(look.grass).toMatch(/^#[0-9a-f]{6}$/)
      expect(look.scatter === 'none' || look.scatterColors.length > 0).toBe(true)
    }
  })
})
