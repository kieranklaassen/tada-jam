// The age-to-level tables (plan KTD15). California: sub-bands, explicit gaps,
// and the cross-grade lane from kindergarten up. The Netherlands: the
// curriculum institute's bands by the usual ages of each groep, labelled as
// convention, and the end-of-primary goals for every school age.

import { describe, expect, it } from 'vitest'
import { AGE_TABLES, levelsForAge } from '../ages.ts'
import { laneOf } from '../manifest.ts'
import { LEVELS, SUBJECTS } from './schema.ts'

const levels = (age: number): string[] => levelsForAge('us-ca', age).levels.map((each) => each.level)

describe('California ages', () => {
  it('returns grade 4 and grade 5 for age 10', () => {
    expect(levels(10)).toEqual(['grade-4', 'grade-5'])
    expect(levelsForAge('us-ca', 10).gap).toBeUndefined()
  })

  it('returns grade 4 for age 9 and says grade 3 is not in the pack', () => {
    expect(levels(9)).toEqual(['grade-4'])
    expect(levelsForAge('us-ca', 9).gap).toMatch(/grade 3 is not in the pack/i)
  })

  it('returns the infant-toddler level for age 2, with the 23 through 36 months sub-band', () => {
    const answer = levelsForAge('us-ca', 2)
    expect(answer.levels).toHaveLength(1)
    expect(answer.levels[0]!.level).toBe('infant-toddler')
    expect(answer.levels[0]!.subBand).toContain('23 through 36 months')
    expect(answer.also).toBeUndefined()
  })

  it('returns the preschool level alone for age 3, in its earlier band', () => {
    const answer = levelsForAge('us-ca', 3)
    expect(levels(3)).toEqual(['preschool-tk'])
    expect(answer.levels[0]!.subBand).toContain('Early')
    expect(answer.levels[0]!.subBand).not.toContain('Later')
  })

  it('returns the preschool level for age 4, in both printed bands', () => {
    const answer = levelsForAge('us-ca', 4)
    expect(levels(4)).toEqual(['preschool-tk'])
    expect(answer.levels[0]!.subBand).toContain('Early')
    expect(answer.levels[0]!.subBand).toContain('Later')
    expect(answer.also).toBeUndefined()
  })

  it('returns the preschool level (later band) and kindergarten for age 5', () => {
    const answer = levelsForAge('us-ca', 5)
    expect(levels(5)).toEqual(['preschool-tk', 'kindergarten'])
    expect(answer.levels[0]!.subBand).toContain('Later')
    expect(answer.levels[0]!.subBand).not.toContain('Early')
  })

  it('returns kindergarten and grade 1 for age 6', () => {
    expect(levels(6)).toEqual(['kindergarten', 'grade-1'])
  })

  it('returns grade 1 for age 7 and says grade 2 is not in the pack', () => {
    expect(levels(7)).toEqual(['grade-1'])
    expect(levelsForAge('us-ca', 7).gap).toMatch(/grade 2 is not in the pack/i)
  })

  it('returns no level for age 8 and says it is not covered', () => {
    const answer = levelsForAge('us-ca', 8)
    expect(answer.levels).toEqual([])
    expect(answer.gap).toMatch(/not covered/i)
    expect(answer.also).toBeUndefined()
  })

  it('returns grades 5 and 6 for age 11', () => {
    expect(levels(11)).toEqual(['grade-5', 'grade-6'])
  })

  it('returns grade 6 for age 12 and says grade 7 is not in the pack', () => {
    expect(levels(12)).toEqual(['grade-6'])
    expect(levelsForAge('us-ca', 12).gap).toMatch(/grade 7 is not in the pack/i)
  })

  it('also returns the cross-grade mathematics lane for age 10, labelled as cross-grade', () => {
    const { also } = levelsForAge('us-ca', 10)
    expect(also?.level).toBe('cross-grade')
    expect(also?.label).toBe('cross-grade')
    const lane = laneOf('us-ca', also!.level, 'mathematics')
    expect(lane?.level).toBe('cross-grade')
    expect(lane?.subject).toBe('mathematics')
    expect(lane?.expectedCount).toBeGreaterThan(0)
  })

  it('returns the cross-grade lane for every age from kindergarten up that has a level, and for no younger age', () => {
    for (const age of [5, 6, 7, 9, 10, 11, 12]) expect(levelsForAge('us-ca', age).also?.level, `age ${age}`).toBe('cross-grade')
    for (const age of [2, 3, 4]) expect(levelsForAge('us-ca', age).also, `age ${age}`).toBeUndefined()
  })

  it('says whether each mapping is official or derived', () => {
    for (const age of [2, 3, 4, 5, 6]) expect(levelsForAge('us-ca', age).basis, `age ${age}`).toBe('official')
    for (const age of [7, 8, 9, 10, 11, 12]) expect(levelsForAge('us-ca', age).basis, `age ${age}`).toBe('derived')
    for (const row of AGE_TABLES['us-ca']!) expect(row.basisNote.trim(), `age ${row.age}`).not.toBe('')
  })

  it('has one row for each age from 2 through 12, and only levels the jurisdiction has', () => {
    const table = AGE_TABLES['us-ca']!
    expect(table.map((row) => row.age)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    for (const row of table) {
      for (const each of row.levels) expect(LEVELS['us-ca'], `age ${row.age}`).toContain(each.level)
      if (row.also) expect(LEVELS['us-ca'], `age ${row.age}`).toContain(row.also.level)
    }
  })

  it('refuses an age the table does not hold', () => {
    expect(() => levelsForAge('us-ca', 13)).toThrow(/ages 2 to 12/)
  })
})

describe('Dutch ages', () => {
  const dutch = (age: number): string[] => levelsForAge('nl', age).levels.map((each) => each.level)
  const SCHOOL_AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12]

  it('returns fase 3 and the end-of-primary goals for age 11, labelled as convention', () => {
    const answer = levelsForAge('nl', 11)
    expect(dutch(11)).toEqual(['fase-3'])
    expect(answer.also?.level).toBe('einde-po')
    expect(answer.also?.label).toBe('end-of-primary goals')
    expect(answer.basis).toBe('convention')
    expect(answer.basisNote).toMatch(/convention, not law/)
  })

  it('returns fase 2 for age 9', () => {
    expect(dutch(9)).toEqual(['fase-2'])
    expect(levelsForAge('nl', 9).levels[0]!.subBand).toContain('groep 6')
  })

  it('returns both peuters and fase 1 for age 4', () => {
    expect(dutch(4)).toEqual(['peuters', 'fase-1'])
    expect(levelsForAge('nl', 4).levels[0]!.subBand).toMatch(/fourth birthday/)
  })

  it('returns peuters alone for ages 2 and 3, without the end-of-primary goals', () => {
    for (const age of [2, 3]) {
      expect(dutch(age), `age ${age}`).toEqual(['peuters'])
      expect(levelsForAge('nl', age).also, `age ${age}`).toBeUndefined()
    }
  })

  it('returns the band of each groep a child of that age is usually in', () => {
    expect(SCHOOL_AGES.slice(1).map(dutch)).toEqual([['fase-1'], ['fase-1'], ['fase-1', 'fase-2'], ['fase-2'], ['fase-2'], ['fase-2', 'fase-3'], ['fase-3'], ['fase-3']])
  })

  it('says of ages 7 and 8 that fase 2 is recorded because the band also holds groep 6', () => {
    for (const age of [7, 8]) {
      const band = levelsForAge('nl', age).levels.find((each) => each.level === 'fase-2')!
      expect(band.subBand, `age ${age}`).toMatch(/recorded because .* groep 6/)
    }
  })

  it('also returns the end-of-primary lane of every subject for every school age', () => {
    for (const age of SCHOOL_AGES) {
      const { also } = levelsForAge('nl', age)
      expect(also?.level, `age ${age}`).toBe('einde-po')
      for (const subject of SUBJECTS) expect(laneOf('nl', also!.level, subject)?.expectedCount, `age ${age} ${subject}`).toBeGreaterThan(0)
    }
  })

  it('says twelve-year-olds in secondary school are not in the pack', () => {
    expect(levelsForAge('nl', 12).gap).toMatch(/secondary school.*not in the pack/i)
  })

  it('labels every mapping as convention, with a note', () => {
    for (const row of AGE_TABLES.nl!) {
      expect(row.basis, `age ${row.age}`).toBe('convention')
      expect(row.basisNote, `age ${row.age}`).toMatch(/convention, not law/)
    }
  })

  it('has one row for each age from 2 through 12, and only levels the jurisdiction has', () => {
    const table = AGE_TABLES.nl!
    expect(table.map((row) => row.age)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    for (const row of table) {
      expect(row.levels.length, `age ${row.age}`).toBeGreaterThan(0)
      for (const each of row.levels) expect(LEVELS.nl, `age ${row.age}`).toContain(each.level)
      if (row.also) expect(LEVELS.nl, `age ${row.age}`).toContain(row.also.level)
    }
  })

  it('refuses an age the table does not hold', () => {
    expect(() => levelsForAge('nl', 1)).toThrow(/ages 2 to 12/)
  })
})
