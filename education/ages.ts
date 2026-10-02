// Which levels of the pack a child of a given age falls in (plan KTD15): one
// table per jurisdiction, with sub-bands and explicit gaps. The pack covers
// ages 2 to 5, the first school years, and ages 9 to 12, so some California
// ages return one level and a statement about the level that is missing, and
// one returns no level at all. The Dutch bands leave no age out: the one
// that holds groep 6 also holds groep 4 and 5.
//
// Plain data and one lookup. Nothing here reads a file.

import type { Jurisdiction } from './tools/schema.ts'

export interface AgeLevel {
  // One of LEVELS[jurisdiction].
  level: string
  // The part of the level that applies at this age, in the source's own labels.
  subBand?: string
}

// A lane that is returned beside the levels, for the subject asked about, and
// the label it is returned under.
export interface AlsoReturned {
  level: string
  label: string
  note: string
}

export interface AgeRow {
  // Whole years.
  age: number
  levels: readonly AgeLevel[]
  // What the pack does not hold for a child of this age.
  gap?: string
  // `official`: the publisher or the law states the ages. `derived`: worked
  // out from an official rule. `convention`: usual practice, stated nowhere
  // official.
  basis: 'official' | 'derived' | 'convention'
  basisNote: string
  also?: AlsoReturned
}

// California from kindergarten up: the subject's cross-grade lane holds for
// every grade, so it is returned with the grade's own lane.
const CROSS_GRADE: AlsoReturned = {
  level: 'cross-grade',
  label: 'cross-grade',
  note: "Also return the subject's cross-grade lane, labelled as cross-grade: its statements hold for every grade, not for this age in particular.",
}

const EARLY = 'Early (3 to 4 ½ Years)'
const LATER = 'Later (4 to 5 ½ Years)'

const PRESCHOOL_BANDS =
  'The preschool and transitional kindergarten foundations print two overlapping age ranges: Early, between three and four and a half, and Later, between four and five and a half.'
const KINDERGARTEN_LAW = 'Education Code 48000: a child is admitted to kindergarten whose fifth birthday is on or before September 1.'
const FIRST_GRADE_LAW = 'Education Code 48010: a child is admitted to first grade whose sixth birthday is on or before September 1.'
const DERIVED =
  'Derived from the first-grade entry rule (Education Code 48010, sixth birthday on or before September 1): a child starts grade N at age N + 5 and turns N + 6 during the year. These are typical ages, not law.'

const US_CA: readonly AgeRow[] = [
  {
    age: 2,
    levels: [
      {
        level: 'infant-toddler',
        subBand: 'The indicator for 23 through 36 months of each foundation. A two-year-old is 24 to 35 months old, wholly inside that period.',
      },
    ],
    basis: 'official',
    basisNote: 'The infant-toddler foundations print three overlapping age periods: 4 through 11 months, 11 through 23 months, and 23 through 36 months. The two earlier periods are not recorded.',
  },
  {
    age: 3,
    levels: [{ level: 'preschool-tk', subBand: EARLY }],
    basis: 'official',
    basisNote: `${PRESCHOOL_BANDS} The last infant-toddler period ends at 36 months, the third birthday, so age 3 does not return the infant-toddler level.`,
  },
  {
    age: 4,
    levels: [{ level: 'preschool-tk', subBand: `${EARLY} and ${LATER}: the two printed bands overlap for the whole of age 4, so both statements of a foundation apply.` }],
    basis: 'official',
    basisNote: `${PRESCHOOL_BANDS} A child who turns four by September 1 may enter transitional kindergarten (Education Code 48000), which has no standards of its own and follows these foundations.`,
  },
  {
    age: 5,
    levels: [{ level: 'preschool-tk', subBand: `${LATER}: it runs to five and a half and covers a five-year-old in transitional kindergarten.` }, { level: 'kindergarten' }],
    basis: 'official',
    basisNote: `${PRESCHOOL_BANDS} ${KINDERGARTEN_LAW}`,
    also: CROSS_GRADE,
  },
  {
    age: 6,
    levels: [{ level: 'kindergarten' }, { level: 'grade-1' }],
    basis: 'official',
    basisNote: `${KINDERGARTEN_LAW} A kindergartner turns six during the year. ${FIRST_GRADE_LAW}`,
    also: CROSS_GRADE,
  },
  {
    age: 7,
    levels: [{ level: 'grade-1' }],
    gap: 'Grade 2 is not in the pack. A first grader turns seven during the year; a child who starts the school year at seven is in grade 2.',
    basis: 'derived',
    basisNote: DERIVED,
    also: CROSS_GRADE,
  },
  {
    age: 8,
    levels: [],
    gap: 'Not covered: a child of eight is in grade 2 or grade 3, and neither is in the pack.',
    basis: 'derived',
    basisNote: DERIVED,
  },
  {
    age: 9,
    levels: [{ level: 'grade-4' }],
    gap: 'Grade 3 is not in the pack. A third grader turns nine during the year; grade 4 starts at nine.',
    basis: 'derived',
    basisNote: DERIVED,
    also: CROSS_GRADE,
  },
  { age: 10, levels: [{ level: 'grade-4' }, { level: 'grade-5' }], basis: 'derived', basisNote: DERIVED, also: CROSS_GRADE },
  { age: 11, levels: [{ level: 'grade-5' }, { level: 'grade-6' }], basis: 'derived', basisNote: DERIVED, also: CROSS_GRADE },
  {
    age: 12,
    levels: [{ level: 'grade-6' }],
    gap: 'Grade 7 is not in the pack. A sixth grader turns twelve during the year; a child who starts the school year at twelve is in grade 7.',
    basis: 'derived',
    basisNote: DERIVED,
    also: CROSS_GRADE,
  },
]

// The Netherlands. The curriculum institute's level table defines the bands
// by groep, not by age: fase 1 is groep 1, 2 and 3; fase 2 is groep 4, 5 and
// 6; fase 3 is groep 7 and 8. The ages of a groep are usual practice.

// From the first school age up: the goals set for the end of primary school
// hold for the whole school, so they are returned with the band's own lane.
const END_OF_PRIMARY: AlsoReturned = {
  level: 'einde-po',
  label: 'end-of-primary goals',
  note: "Also return the subject's end-of-primary lane, labelled as the end-of-primary goals: the legal core goals, the draft core goals and the reference levels say what a school works towards by the end of groep 8, not what a child of this age should master.",
}

const CONVENTION =
  'The mapping from groep to age is convention, not law. By that convention a child is 4 to 5 in groep 1, 5 to 6 in groep 2, 6 to 7 in groep 3, 7 to 8 in groep 4, 8 to 9 in groep 5, 9 to 10 in groep 6, 10 to 11 in groep 7 and 11 to 12 in groep 8. No law or decree ties a groep to an age, and a child may repeat or skip one. The bands themselves are official: the level table of the SLO open data defines fase 1 as groep 1, 2 and 3, fase 2 as groep 4, 5 and 6, and fase 3 as groep 7 and 8.'
const BEFORE_SCHOOL = `${CONVENTION} The peuter cards are for children in childcare before school; the early-years programme decree starts at two and a half, and a child is admitted to school at four (Wet op het primair onderwijs, artikel 39).`
const GROEP_3_BLOCKS = 'On the fase 1 card for Dutch, the two blocks headed "vanaf GROEP 3" are for older children.'
const WHY_FASE_2 = 'Not an age the pack set out to cover: fase 2 is recorded because the band also holds groep 6, and SLO publishes nothing narrower than the band.'

const NL: readonly AgeRow[] = [
  { age: 2, levels: [{ level: 'peuters' }], basis: 'convention', basisNote: BEFORE_SCHOOL },
  { age: 3, levels: [{ level: 'peuters' }], basis: 'convention', basisNote: BEFORE_SCHOOL },
  {
    age: 4,
    levels: [
      { level: 'peuters', subBand: 'Up to the fourth birthday, when a child may start school. Returned for a child who has only just turned four.' },
      { level: 'fase-1', subBand: `groep 1. ${GROEP_3_BLOCKS}` },
    ],
    basis: 'convention',
    basisNote: BEFORE_SCHOOL,
    also: END_OF_PRIMARY,
  },
  { age: 5, levels: [{ level: 'fase-1', subBand: `groep 1 or groep 2. ${GROEP_3_BLOCKS}` }], basis: 'convention', basisNote: CONVENTION, also: END_OF_PRIMARY },
  { age: 6, levels: [{ level: 'fase-1', subBand: 'groep 2 or groep 3.' }], basis: 'convention', basisNote: CONVENTION, also: END_OF_PRIMARY },
  {
    age: 7,
    levels: [
      { level: 'fase-1', subBand: 'groep 3: a child turns seven during it.' },
      { level: 'fase-2', subBand: `groep 4. ${WHY_FASE_2}` },
    ],
    basis: 'convention',
    basisNote: CONVENTION,
    also: END_OF_PRIMARY,
  },
  { age: 8, levels: [{ level: 'fase-2', subBand: `groep 4 or groep 5. ${WHY_FASE_2}` }], basis: 'convention', basisNote: CONVENTION, also: END_OF_PRIMARY },
  {
    age: 9,
    levels: [{ level: 'fase-2', subBand: 'groep 5 or groep 6. The goals are for the whole band, groep 4 to 6: nothing in them says which are for groep 6.' }],
    basis: 'convention',
    basisNote: CONVENTION,
    also: END_OF_PRIMARY,
  },
  {
    age: 10,
    levels: [
      { level: 'fase-2', subBand: 'groep 6: a child turns ten during it.' },
      { level: 'fase-3', subBand: 'groep 7.' },
    ],
    basis: 'convention',
    basisNote: CONVENTION,
    also: END_OF_PRIMARY,
  },
  { age: 11, levels: [{ level: 'fase-3', subBand: 'groep 7 or groep 8.' }], basis: 'convention', basisNote: CONVENTION, also: END_OF_PRIMARY },
  {
    age: 12,
    levels: [{ level: 'fase-3', subBand: 'groep 8: a child turns twelve during it.' }],
    gap: 'A child who starts the school year at twelve is usually in secondary school, which is not in the pack.',
    basis: 'convention',
    basisNote: CONVENTION,
    also: END_OF_PRIMARY,
  },
]

export const AGE_TABLES: Partial<Record<Jurisdiction, readonly AgeRow[]>> = {
  'us-ca': US_CA,
  nl: NL,
}

// The levels for a child of `age` whole years. Throws for an age or a
// jurisdiction the tables do not hold: the pack covers ages 2 to 12.
export function levelsForAge(jurisdiction: Jurisdiction, age: number): AgeRow {
  const row = AGE_TABLES[jurisdiction]?.find((each) => each.age === age)
  if (!row) throw new RangeError(`no row for ${jurisdiction} at age ${age}: the pack covers ages 2 to 12, in whole years, for the jurisdictions that have a table`)
  return row
}
