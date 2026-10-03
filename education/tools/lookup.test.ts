import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Lane } from '../manifest.ts'
import { MANIFEST } from '../manifest.ts'
import { NL_SOURCE, caObjective, nlObjective } from './fixtures.ts'
import { HELP, NO_STORE, USAGE, formatAnswer, lookup, parseArgs } from './lookup.ts'
import type { LevelAnswer, Pack } from './lookup.ts'
import { normaliseCode, wordingHash } from './normalise.ts'
import { draftObjective, parseRecord, replaceRegion, withMarker } from './record.ts'
import type { RecordState } from './review-join.ts'
import { ENGLISH_GLOSS, JURISDICTIONS, SUMMARY, objectiveId, pathForId } from './schema.ts'
import type { ObjectiveFrontmatter, Subject } from './schema.ts'
import { FETCH_COMMAND, putWording } from './store.ts'
import { readRecords } from './validate.ts'

// Every record, wording and summary here is invented. No official wording
// belongs in a test; printed codes are fine. The ages and the lanes are the
// real California ones unless a test brings its own lane.

interface Sample {
  level: string
  subject: Subject
  code: string
  scope?: string
  parent?: string
  summary?: string
  // Invented text that accompanies the statement, as a footnote does.
  supplement?: string
}

function wordingOf(code: string): string {
  return `Invented official wording of ${code}, which says nothing real.`
}

function slugOf(code: string): string {
  return normaliseCode(code).toLowerCase().replaceAll('.', '-')
}

function caId(sample: Sample): string {
  return objectiveId('us-ca', sample.level, sample.subject, slugOf(sample.code))
}

function caRecord(sample: Sample): [string, string] {
  const frontmatter: ObjectiveFrontmatter = {
    ...caObjective,
    id: caId(sample),
    level: sample.level,
    subject: sample.subject,
    code: sample.code,
    code_key: normaliseCode(sample.code),
    code_scope: sample.scope ?? 'Example Standards, Example Domain',
    ...(sample.parent ? { parent_code: sample.parent } : {}),
    wording_sha256: wordingHash(wordingOf(sample.code)),
    ...(sample.supplement ? { supplement_sha256: wordingHash(sample.supplement) } : {}),
  }
  const draft = draftObjective(frontmatter)
  return [pathForId(frontmatter.id)!, sample.summary ? replaceRegion(draft, SUMMARY, withMarker(SUMMARY, sample.summary)) : draft]
}

const NL_ID = objectiveId('nl', 'fase-1', 'mathematics', 'getallen-1-1')
const NL_WORDING = 'Verzonnen doel: tel de peren in een schaal.'

function nlRecord(): [string, string] {
  const frontmatter: ObjectiveFrontmatter = {
    ...nlObjective,
    id: NL_ID,
    code: '1.1',
    code_key: '1.1',
    code_scope: 'Voorbeelddoelen rekenen, Getallen',
    wording_sha256: wordingHash(NL_WORDING),
  }
  const draft = draftObjective(frontmatter, { wording: NL_WORDING, source: NL_SOURCE })
  return [pathForId(NL_ID)!, replaceRegion(draft, ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Invented gloss: count the pears in a bowl.'))]
}

const NF1: Sample = { level: 'grade-4', subject: 'mathematics', code: '4.NF.1', summary: 'Invented summary: two ways of cutting a cake give the same share.' }
const NF2: Sample = { level: 'grade-4', subject: 'mathematics', code: '4.NF.2' }
const NF10: Sample = { level: 'grade-4', subject: 'mathematics', code: '4.NF.10' }
const FOOTNOTE = 'Invented footnote: cakes cut into more than twelve pieces wait for a later year.\nSo do pies.'
const G5: Sample = { level: 'grade-5', subject: 'mathematics', code: '5.NF.1', supplement: FOOTNOTE }
const G4_SCIENCE: Sample = { level: 'grade-4', subject: 'science', code: '4-PS3-1' }
const MP1: Sample = { level: 'cross-grade', subject: 'mathematics', code: 'MP.1' }
const CROSS_SCIENCE: Sample = { level: 'cross-grade', subject: 'science', code: 'SEP.1' }
const CC4A: Sample = { level: 'kindergarten', subject: 'mathematics', code: 'K.CC.4a', parent: 'K.CC.4' }
const CC4B: Sample = { level: 'kindergarten', subject: 'mathematics', code: 'K.CC.4b', parent: 'K.CC.4' }
// No parent_code: found because its code is the query plus one segment.
const CC4C: Sample = { level: 'kindergarten', subject: 'mathematics', code: 'K.CC.4c' }
const CC5: Sample = { level: 'kindergarten', subject: 'mathematics', code: 'K.CC.5' }
const LK1: Sample = { level: 'kindergarten', subject: 'reading-language', code: 'L.K.1' }
const NUMBER_SENSE = 'Example Foundations, Number Sense'
const INQUIRY = 'Example Foundations, Scientific Inquiry'
const PRE_MATH: Sample = { level: 'preschool-tk', subject: 'mathematics', code: '1.1', scope: NUMBER_SENSE }
const PRE_SCIENCE: Sample = { level: 'preschool-tk', subject: 'science', code: '1.1', scope: INQUIRY }

const SAMPLES = [NF1, NF2, NF10, G5, G4_SCIENCE, MP1, CROSS_SCIENCE, CC4A, CC4B, CC4C, CC5, LK1, PRE_MATH, PRE_SCIENCE]

let education: string
let store: string

beforeEach(() => {
  education = mkdtempSync(join(tmpdir(), 'education-lookup-'))
  store = join(education, 'store-that-is-not-there')
  for (const [file, text] of [...SAMPLES.map(caRecord), nlRecord()]) {
    mkdirSync(dirname(join(education, file)), { recursive: true })
    writeFileSync(join(education, file), text)
  }
})

afterEach(() => {
  rmSync(education, { recursive: true, force: true })
})

// An invented Dutch record at a level, with a code and a scope of its own.
function nlAt(level: string, code: string, scope: string, slug: string): [string, string] {
  const id = objectiveId('nl', level, 'mathematics', slug)
  const wording = `Verzonnen doel ${slug}.`
  const frontmatter: ObjectiveFrontmatter = { ...nlObjective, id, level, code, code_key: normaliseCode(code), code_scope: scope, wording_sha256: wordingHash(wording) }
  return [pathForId(id)!, draftObjective(frontmatter, { wording, source: NL_SOURCE })]
}

function add(...records: [string, string][]): void {
  for (const [file, text] of records) {
    mkdirSync(dirname(join(education, file)), { recursive: true })
    writeFileSync(join(education, file), text)
  }
}

function pack(change: Partial<Pack> = {}): Pack {
  return { records: readRecords(education), states: new Map(), lanes: MANIFEST, store, ...change }
}

function stateOf(id: string, state: RecordState['state'], reason?: string): Map<string, RecordState> {
  return new Map([[id, { id, file: pathForId(id)!, lane: 'us-ca/grade-4/mathematics', state, ...(reason ? { reason } : {}) }]])
}

function codes(level: LevelAnswer): string[] {
  return level.lanes.flatMap((lane) => lane.entries.map((entry) => entry.code))
}

describe('lookup by age', () => {
  it('California, age 10, mathematics: every grade 4 and grade 5 record with its code, then the cross-grade records labelled as cross-grade', () => {
    const answer = lookup({ by: 'age', jurisdiction: 'us-ca', age: 10, subject: 'mathematics' }, pack())
    expect(answer.levels.map((level) => [level.level, level.label])).toEqual([
      ['grade-4', undefined],
      ['grade-5', undefined],
      ['cross-grade', 'cross-grade'],
    ])
    expect(codes(answer.levels[0]!)).toEqual(['4.NF.1', '4.NF.2', '4.NF.10'])
    expect(codes(answer.levels[1]!)).toEqual(['5.NF.1'])
    expect(codes(answer.levels[2]!)).toEqual(['MP.1'])
    expect(answer.basis).toBe('derived')

    const text = formatAnswer(answer)
    for (const sample of [NF1, NF2, NF10, G5]) {
      expect(text).toContain(`\n${caId(sample)}\n`)
      expect(text).toContain(`code ${sample.code} `)
    }
    expect(text).toContain(`[cross-grade] ${caId(MP1)}`)
    expect(text).toContain('Age mapping: derived.')
    expect(text).not.toContain(caId(G4_SCIENCE))
    expect(text).not.toContain(caId(CROSS_SCIENCE))
  })

  it('with no subject, returns all four subjects of each level', () => {
    const answer = lookup({ by: 'age', jurisdiction: 'us-ca', age: 10 }, pack())
    expect(answer.levels[0]!.lanes.map((lane) => lane.subject)).toEqual(['mathematics', 'reading-language', 'science', 'practical-life-feelings'])
    expect(codes(answer.levels[0]!)).toContain('4-PS3-1')
    expect(codes(answer.levels[2]!)).toEqual(['MP.1', 'SEP.1'])
  })

  it('labels a level with its sub-band', () => {
    const answer = lookup({ by: 'age', jurisdiction: 'us-ca', age: 3, subject: 'mathematics' }, pack())
    expect(answer.levels).toHaveLength(1)
    expect(answer.levels[0]!.subBand).toContain('Early')
    expect(formatAnswer(answer)).toContain(`Sub-band: ${answer.levels[0]!.subBand}`)
  })

  it('age 9 says that grade 3 is not in the pack', () => {
    const answer = lookup({ by: 'age', jurisdiction: 'us-ca', age: 9, subject: 'mathematics' }, pack())
    expect(answer.levels.map((level) => level.level)).toEqual(['grade-4', 'cross-grade'])
    expect(formatAnswer(answer)).toContain('Grade 3 is not in the pack.')
  })

  it('an age the pack does not cover gives the "not covered" statement and no records', () => {
    const answer = lookup({ by: 'age', jurisdiction: 'us-ca', age: 8 }, pack())
    expect(answer.levels).toEqual([])
    const text = formatAnswer(answer)
    expect(text).toContain('Not covered: a child of eight')
    expect(text).not.toContain('edu.')
  })
})

describe('lookup by level', () => {
  it('returns the records of that one level', () => {
    const answer = lookup({ by: 'level', jurisdiction: 'us-ca', level: 'kindergarten', subject: 'mathematics' }, pack())
    expect(answer.levels.map((level) => level.level)).toEqual(['kindergarten'])
    expect(codes(answer.levels[0]!)).toEqual(['K.CC.4a', 'K.CC.4b', 'K.CC.4c', 'K.CC.5'])
  })

  it('a lane with nothing published prints the statement of the manifest, not an empty list', () => {
    const statement = 'The example department publishes no science statements for this grade.'
    const lane: Lane = {
      jurisdiction: 'us-ca',
      level: 'grade-1',
      subject: 'science',
      title: 'Grade 1 science',
      nothingPublished: statement,
      sources: [],
      parts: [],
      expectedCount: 0,
      countingMethod: 'Nothing to count.',
      countIsFromImportFile: false,
      domains: [],
      granularity: 'None.',
      skipped: [],
    }
    const answer = lookup({ by: 'level', jurisdiction: 'us-ca', level: 'grade-1', subject: 'science' }, pack({ lanes: [lane] }))
    expect(answer.levels[0]!.lanes[0]).toMatchObject({ nothingPublished: statement, entries: [] })
    const text = formatAnswer(answer)
    expect(text).toContain(`Nothing is published: ${statement}`)
    expect(text).not.toContain('No records')
  })

  it('a lane that only has no records yet says so', () => {
    const answer = lookup({ by: 'level', jurisdiction: 'us-ca', level: 'grade-1', subject: 'science' }, pack())
    expect(formatAnswer(answer)).toContain('No records in this lane.')
  })
})

describe('lookup by pack id', () => {
  // A record whose source prints no code: found by its id and by nothing else.
  const CODELESS: Sample = { level: 'grade-5', subject: 'science', code: '' }
  const CODELESS_ID = objectiveId('us-ca', 'grade-5', 'science', 'a-statement-without-a-code')

  function addCodeless(): void {
    const [, text] = caRecord({ ...CODELESS, summary: 'Invented summary of a statement that prints no code.' })
    add([pathForId(CODELESS_ID)!, text.replace(caId(CODELESS), CODELESS_ID)])
  }

  it('returns the one record with that id, printed as any entry is, with its file', () => {
    const answer = lookup({ by: 'id', id: caId(NF1) }, pack({ states: stateOf(caId(NF1), 'confirmed') }))
    expect(answer.entry).toMatchObject({ id: caId(NF1), file: pathForId(caId(NF1))!, code: '4.NF.1', state: 'confirmed', region: 'summary' })
    expect(formatAnswer(answer).split('\n')).toEqual([
      `# id ${caId(NF1)}`,
      '',
      caId(NF1),
      '  code 4.NF.1 | scope: Example Standards, Example Domain',
      '  standing: state-board-adopted-standard | check: confirmed',
      '  summary: Invented summary: two ways of cutting a cake give the same share.',
      `  file: education/${pathForId(caId(NF1))!}`,
      '',
      NO_STORE,
    ])
    // The same entry as the lookup by code gives.
    expect(answer.entry).toEqual(lookup({ by: 'code', code: '4.NF.1' }, pack({ states: stateOf(caId(NF1), 'confirmed') })).jurisdictions[0]!.matches[0]!.entry)
    expect(JSON.parse(JSON.stringify(answer))).toMatchObject({ by: 'id', id: caId(NF1), entry: { id: caId(NF1), file: pathForId(caId(NF1))! } })
  })

  it('finds a record that prints no code, which no lookup by code can', () => {
    addCodeless()
    const answer = lookup({ by: 'id', id: CODELESS_ID }, pack())
    expect(answer.entry).toMatchObject({ id: CODELESS_ID, code: '', level: 'grade-5', subject: 'science' })
    const text = formatAnswer(answer)
    expect(text).toContain(`${CODELESS_ID}\n  no printed code | scope: Example Standards, Example Domain`)
    expect(text).toContain(`  file: education/${pathForId(CODELESS_ID)!}`)
    expect(lookup({ by: 'code', code: '' }, pack()).jurisdictions).toEqual([])
  })

  it('a Dutch record by id prints its gloss, and with --wording its wording and source line', () => {
    const plain = lookup({ by: 'id', id: NL_ID }, pack())
    expect(plain.wordingHint).toBeUndefined()
    expect(formatAnswer(plain)).toContain('gloss: Invented gloss: count the pears in a bowl.')
    expect(formatAnswer(plain)).not.toContain('official wording')
    const answer = lookup({ by: 'id', id: NL_ID, wording: true }, pack())
    expect(answer.entry).toMatchObject({ wording: NL_WORDING, source: `Source: ${NL_SOURCE}` })
    expect(formatAnswer(answer)).toContain(`  file: education/${pathForId(NL_ID)!}\n  official wording: ${NL_WORDING}\n  Source: ${NL_SOURCE}`)
  })

  it('honours --wording for a California record: the wording the store holds, or how to get it', () => {
    const without = lookup({ by: 'id', id: caId(NF1), wording: true }, pack())
    expect(without.entry!.wording).toBeUndefined()
    expect(formatAnswer(without)).toContain('official wording: not on this machine.')
    expect(without.wordingHint).toBeUndefined()
    store = join(education, 'store')
    putWording(store, wordingOf('4.NF.1'))
    const answer = lookup({ by: 'id', id: caId(NF1), wording: true }, pack())
    expect(answer.entry!.wording).toBe(wordingOf('4.NF.1'))
    expect(formatAnswer(answer)).toContain(`official wording: ${wordingOf('4.NF.1')}`)
  })

  it('an id no record has gives one sentence and no entry, in text and in JSON', () => {
    for (const id of [objectiveId('us-ca', 'grade-4', 'mathematics', '4-nf-99'), 'edu.us-ca.source.example-counting-standards', caId(NF1).toUpperCase(), 'k-cc-1']) {
      const answer = lookup({ by: 'id', id }, pack())
      expect(answer).toEqual({ by: 'id', id })
      const text = formatAnswer(answer)
      expect(text).toBe(`No record has the id "${id}": the lookup holds the objective records, whose ids are edu.<jurisdiction>.<level>.<subject>.objective.<slug>.`)
      expect(text.split('\n')).toHaveLength(1)
    }
  })
})

describe('the outline of an answer by age or level', () => {
  it('by age: the title line, the age mapping, each level with its sub-band or its label and note, each lane with its title and count, and no record', () => {
    const full = lookup({ by: 'age', jurisdiction: 'us-ca', age: 10, subject: 'mathematics' }, pack())
    const answer = lookup({ by: 'age', jurisdiction: 'us-ca', age: 10, subject: 'mathematics', outline: true }, pack())
    expect(answer.outline).toBe(true)
    expect(answer.levels.map((level) => [level.level, level.label, level.lanes.map((lane) => [lane.subject, lane.count])])).toEqual([
      ['grade-4', undefined, [['mathematics', 3]]],
      ['grade-5', undefined, [['mathematics', 1]]],
      ['cross-grade', 'cross-grade', [['mathematics', 1]]],
    ])
    expect(JSON.stringify(answer)).not.toContain('entries')
    expect(JSON.stringify(answer)).not.toContain('edu.')
    expect(answer.levels[2]!.note).toBe(full.levels[2]!.note)

    const title = (level: string): string => MANIFEST.find((lane) => lane.jurisdiction === 'us-ca' && lane.level === level && lane.subject === 'mathematics')!.title
    const text = formatAnswer(answer)
    expect(text.split('\n')).toEqual([
      '# us-ca, age 10, mathematics',
      `Age mapping: derived. ${full.basisNote}`,
      '',
      '## grade-4',
      `- grade-4 / mathematics: ${title('grade-4')}, 3 records`,
      '',
      '## grade-5',
      `- grade-5 / mathematics: ${title('grade-5')}, 1 record`,
      '',
      '## cross-grade (returned beside the levels of this age, labelled cross-grade)',
      full.levels[2]!.note,
      `- cross-grade / mathematics: ${title('cross-grade')}, 1 record`,
      '',
      'Outline only. The records of one lane: npm run education:find -- --jurisdiction us-ca --level <level> --subject <subject>',
    ])
    // The opening lines are those of the full answer.
    expect(formatAnswer(full).split('\n').slice(0, 2)).toEqual(text.split('\n').slice(0, 2))
  })

  it('by age: keeps the sub-band, the gap line and the statement that an age is not covered', () => {
    const three = formatAnswer(lookup({ by: 'age', jurisdiction: 'us-ca', age: 3, subject: 'mathematics', outline: true }, pack()))
    expect(three).toMatch(/\n## preschool-tk\nSub-band: .*Early.*\n- preschool-tk \/ mathematics: .*, 1 record\n/)
    const nine = lookup({ by: 'age', jurisdiction: 'us-ca', age: 9, outline: true }, pack())
    expect(nine.gap).toContain('Grade 3 is not in the pack.')
    expect(formatAnswer(nine)).toContain('Grade 3 is not in the pack.')
    expect(nine.levels[0]!.lanes.map((lane) => [lane.subject, lane.count])).toEqual([
      ['mathematics', 3],
      ['reading-language', 0],
      ['science', 1],
      ['practical-life-feelings', 0],
    ])
    expect(formatAnswer(nine)).toMatch(/- grade-4 \/ reading-language: .*, no records\n/)
    const eight = lookup({ by: 'age', jurisdiction: 'us-ca', age: 8, outline: true }, pack())
    expect(eight.levels).toEqual([])
    expect(formatAnswer(eight)).toContain('Not covered: a child of eight')
    expect(formatAnswer(eight)).not.toContain('Outline only')
  })

  it('by level: one level, each lane with its count, in text and in JSON', () => {
    const answer = lookup({ by: 'level', jurisdiction: 'us-ca', level: 'kindergarten', outline: true }, pack())
    expect(JSON.parse(JSON.stringify(answer))).toEqual({
      by: 'level',
      jurisdiction: 'us-ca',
      outline: true,
      levels: [
        {
          level: 'kindergarten',
          lanes: (['mathematics', 'reading-language', 'science', 'practical-life-feelings'] as const).map((subject, index) => ({
            subject,
            title: MANIFEST.find((lane) => lane.jurisdiction === 'us-ca' && lane.level === 'kindergarten' && lane.subject === subject)!.title,
            count: [4, 1, 0, 0][index],
          })),
        },
      ],
    })
    const lines = formatAnswer(answer).split('\n')
    expect(lines.slice(0, 3)).toEqual(['# us-ca, level kindergarten, all four subjects', '', '## kindergarten'])
    expect(lines.filter((line) => line.startsWith('- kindergarten / '))).toHaveLength(4)
    expect(lines.some((line) => line.includes('edu.'))).toBe(false)
  })

  it('a lane with nothing published keeps the statement of the manifest', () => {
    const statement = 'The example department publishes no science statements for this grade.'
    const lane: Lane = { jurisdiction: 'us-ca', level: 'grade-1', subject: 'science', title: 'Grade 1 science', nothingPublished: statement, sources: [], parts: [], expectedCount: 0, countingMethod: 'Nothing to count.', countIsFromImportFile: false, domains: [], granularity: 'None.', skipped: [] }
    const answer = lookup({ by: 'level', jurisdiction: 'us-ca', level: 'grade-1', subject: 'science', outline: true }, pack({ lanes: [lane] }))
    expect(answer.levels[0]!.lanes).toEqual([{ subject: 'science', title: 'Grade 1 science', nothingPublished: statement, count: 0 }])
    expect(formatAnswer(answer)).toContain(`- grade-1 / science: Grade 1 science. Nothing is published: ${statement}`)
  })

  it('lists no record, so it reads no wording and ends with no line about the store', () => {
    const answer = lookup({ by: 'age', jurisdiction: 'us-ca', age: 10, outline: true }, pack())
    expect('wordingHint' in answer).toBe(false)
    expect(formatAnswer(answer)).not.toContain('wording')
  })

  it('leaves the answer without --outline as it was: every record, and no count', () => {
    const answer = lookup({ by: 'age', jurisdiction: 'us-ca', age: 10, subject: 'mathematics' }, pack())
    expect('outline' in answer).toBe(false)
    expect(answer.levels[0]!.lanes[0]).not.toHaveProperty('count')
    expect(answer.levels[0]!.lanes[0]!.entries).toHaveLength(3)
    expect(formatAnswer(answer)).toContain('### grade-4 / mathematics')
    expect(formatAnswer(answer)).not.toContain('Outline only')
  })
})

describe('lookup by code', () => {
  it('a code that exists in two scopes returns both, each labelled with its scope, and keeps the jurisdictions apart', () => {
    const answer = lookup({ by: 'code', code: '1.1' }, pack())
    expect(answer.jurisdictions.map((group) => group.jurisdiction)).toEqual(['us-ca', 'nl'])
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.entry.id, match.entry.codeScope])).toEqual([
      ['exact', caId(PRE_MATH), NUMBER_SENSE],
      ['exact', caId(PRE_SCIENCE), INQUIRY],
    ])
    expect(answer.jurisdictions[1]!.matches.map((match) => match.entry.id)).toEqual([NL_ID])

    const text = formatAnswer(answer)
    expect(text).toContain(`[exact match] ${caId(PRE_MATH)}\n  code 1.1 | scope: ${NUMBER_SENSE}`)
    expect(text).toContain(`[exact match] ${caId(PRE_SCIENCE)}\n  code 1.1 | scope: ${INQUIRY}`)
    expect(text.indexOf('us-ca: 2 records')).toBeLessThan(text.indexOf(caId(PRE_MATH)))
    expect(text.indexOf(caId(PRE_SCIENCE))).toBeLessThan(text.indexOf('nl: 1 record'))
    expect(text.indexOf('nl: 1 record')).toBeLessThan(text.indexOf(NL_ID))
  })

  it('can be kept to one jurisdiction', () => {
    const answer = lookup({ by: 'code', code: '1.1', jurisdiction: 'nl' }, pack())
    expect(answer.jurisdictions.map((group) => group.jurisdiction)).toEqual(['nl'])
  })

  it('finds a code however its sub-part is punctuated', () => {
    const answer = lookup({ by: 'code', code: 'K.CC.4.a' }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.entry.code])).toEqual([['exact', 'K.CC.4a']])
  })

  it('K.CC.4, held only as lettered parts, returns its sub-part records, labelled as sub-parts', () => {
    const answer = lookup({ by: 'code', code: 'K.CC.4' }, pack())
    expect(answer.jurisdictions).toHaveLength(1)
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.entry.code])).toEqual([
      ['sub-part', 'K.CC.4a'],
      ['sub-part', 'K.CC.4b'],
      ['sub-part', 'K.CC.4c'],
    ])
    expect(formatAnswer(answer)).toContain(`[sub-part of K.CC.4] ${caId(CC4A)}`)
  })

  it('L.K.1.a, which sits inside its parent row, returns the parent record, labelled as containing it', () => {
    const answer = lookup({ by: 'code', code: 'L.K.1.a' }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.entry.id])).toEqual([['contains', caId(LK1)]])
    expect(formatAnswer(answer)).toContain(`[contains match: no record has the code L.K.1.a in this scope; this is the record of L.K.1] ${caId(LK1)}`)
  })

  it('a containing record of another scope comes after the exact match and says that it is one', () => {
    // 4.NF.1 with a lettered part in one document, and a plain 4.NF.1 in another.
    const [file, text] = caRecord({ level: 'grade-4', subject: 'science', code: '4.NF.1.b', scope: 'Another Example Document, Fractions' })
    add([file, text])
    const answer = lookup({ by: 'code', code: '4.NF.1.b' }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.entry.code])).toEqual([
      ['exact', '4.NF.1.b'],
      ['contains', '4.NF.1'],
    ])
    const text2 = formatAnswer(answer)
    expect(text2.indexOf('[exact match]')).toBeLessThan(text2.indexOf('[contains match: no record has the code 4.NF.1.b in this scope; this is the record of 4.NF.1]'))
  })

  it('a code with a record of its own returns neither sub-parts nor a containing record', () => {
    const answer = lookup({ by: 'code', code: 'K.CC.5' }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => match.relation)).toEqual(['exact'])
  })

  it('finds a code typed in lower case, and with hyphens for dots, and says that it was normalised', () => {
    const lower = lookup({ by: 'code', code: 'k.cc.5' }, pack())
    expect(lower.jurisdictions[0]!.matches.map((match) => [match.relation, match.ignored, match.entry.code])).toEqual([['exact', ['capitals'], 'K.CC.5']])
    expect(formatAnswer(lower)).toContain(`[normalised match: capitals ignored] ${caId(CC5)}`)

    // The form of the slug in a record id.
    const slug = lookup({ by: 'code', code: 'k-cc-5' }, pack())
    expect(slug.jurisdictions[0]!.matches.map((match) => [match.relation, match.ignored])).toEqual([['exact', ['punctuation', 'capitals']]])
    expect(formatAnswer(slug)).toContain(`[normalised match: punctuation and capitals ignored] ${caId(CC5)}`)

    const hyphens = lookup({ by: 'code', code: 'K-CC-5' }, pack())
    expect(hyphens.jurisdictions[0]!.matches.map((match) => [match.relation, match.ignored])).toEqual([['exact', ['punctuation']]])

    const printed = lookup({ by: 'code', code: 'K.CC.5' }, pack())
    expect('ignored' in printed.jurisdictions[0]!.matches[0]!).toBe(false)
    expect(formatAnswer(printed)).toContain(`[exact match] ${caId(CC5)}`)
  })

  it('a science code with hyphens of its own is found in lower case', () => {
    const answer = lookup({ by: 'code', code: '4-ps3-1' }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.ignored, match.entry.code])).toEqual([['exact', ['capitals'], '4-PS3-1']])
  })

  it('lists the code as typed before the same code in other capitals', () => {
    add(caRecord({ level: 'grade-4', subject: 'science', code: 'mp.1', scope: 'Another Example Document, Practices' }))
    const answer = lookup({ by: 'code', code: 'mp.1' }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.entry.code, match.ignored])).toEqual([
      ['mp.1', undefined],
      ['MP.1', ['capitals']],
    ])
  })

  it('sub-parts are found in lower case too, and say so', () => {
    const answer = lookup({ by: 'code', code: 'k.cc.4' }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.ignored, match.entry.code])).toEqual([
      ['sub-part', ['capitals'], 'K.CC.4a'],
      ['sub-part', ['capitals'], 'K.CC.4b'],
      ['sub-part', ['capitals'], 'K.CC.4c'],
    ])
    expect(formatAnswer(answer)).toContain(`[sub-part of k.cc.4, capitals ignored] ${caId(CC4A)}`)
  })

  it('a code with no match of any kind says so', () => {
    const answer = lookup({ by: 'code', code: '9.ZZ.9' }, pack())
    expect(answer.jurisdictions).toEqual([])
    const text = formatAnswer(answer)
    expect(text).toContain('No record has the code "9.ZZ.9"')
    expect(text).not.toContain('edu.')
  })
})

describe('the codes the pack gives the bullets of a card', () => {
  const PEUTER_CARD = 'Voorbeeldkaart rekenen, peuters / GETALLEN'
  const FASE_1_CARD = 'Voorbeeldkaart rekenen, fase 1 / GETALLEN'
  const RANGE = 'Hoeveelheden (tot tenminste 20)'

  beforeEach(() => {
    add(
      nlAt('peuters', 'Hoeveelheden / 1', PEUTER_CARD, 'kaart-peuters-hoeveelheden-1'),
      nlAt('peuters', 'Hoeveelheden / 2', PEUTER_CARD, 'kaart-peuters-hoeveelheden-2'),
      nlAt('fase-1', `${RANGE} / 1`, FASE_1_CARD, 'kaart-fase-1-hoeveelheden-1'),
      nlAt('fase-1', `${RANGE} / 2`, FASE_1_CARD, 'kaart-fase-1-hoeveelheden-2'),
    )
  })

  it('a sub-heading and a position find the bullet of each card, whatever the sub-heading holds in brackets, each with its full code', () => {
    const answer = lookup({ by: 'code', code: 'Hoeveelheden / 1' }, pack())
    expect(answer.jurisdictions.map((group) => group.jurisdiction)).toEqual(['nl'])
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.ignored, match.entry.code, match.entry.level])).toEqual([
      ['exact', undefined, 'Hoeveelheden / 1', 'peuters'],
      ['exact', ['brackets'], `${RANGE} / 1`, 'fase-1'],
    ])
    const text = formatAnswer(answer)
    expect(text).toContain(`[exact match] ${objectiveId('nl', 'peuters', 'mathematics', 'kaart-peuters-hoeveelheden-1')}\n  code Hoeveelheden / 1 | scope: ${PEUTER_CARD}`)
    expect(text).toContain(`[match on the sub-heading, the part in brackets ignored] ${objectiveId('nl', 'fase-1', 'mathematics', 'kaart-fase-1-hoeveelheden-1')}\n  code ${RANGE} / 1 | scope: ${FASE_1_CARD}`)
  })

  it('the full code of one card finds its bullet first, then the bullet of the other card', () => {
    const answer = lookup({ by: 'code', code: `${RANGE} / 2` }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.ignored, match.entry.level])).toEqual([
      [undefined, 'fase-1'],
      [['brackets'], 'peuters'],
    ])
  })

  it('the sub-heading alone, in lower case, finds every bullet under it on both cards', () => {
    const answer = lookup({ by: 'code', code: 'hoeveelheden' }, pack())
    expect(answer.jurisdictions[0]!.matches.map((match) => [match.relation, match.ignored, match.entry.code])).toEqual([
      ['sub-part', ['brackets', 'capitals'], `${RANGE} / 1`],
      ['sub-part', ['brackets', 'capitals'], `${RANGE} / 2`],
      ['sub-part', ['capitals'], 'Hoeveelheden / 1'],
      ['sub-part', ['capitals'], 'Hoeveelheden / 2'],
    ])
    expect(formatAnswer(answer)).toContain('[sub-part of hoeveelheden, the part in brackets and capitals ignored]')
  })
})

describe('a code of the open data that does not say what it seems to', () => {
  const CLUSTER = 'Voorbeelddata, Rekenen / Bewerkingen (rw/bew/5)'
  const TWICE = objectiveId('nl', 'fase-2', 'mathematics', 'goal-a')
  const TWICE_AT_3 = objectiveId('nl', 'fase-3', 'mathematics', 'goal-b')

  beforeEach(() => {
    add(
      // One code on two records, of which one is filed at another fase than its code names.
      nlAt('fase-2', 'rw/bew/5/02/fase3', CLUSTER, 'goal-a'),
      nlAt('fase-3', 'rw/bew/5/02/fase3', CLUSTER, 'goal-b'),
      // A code whose last part names another fase, and one that misspells it.
      nlAt('fase-2', 'rw/bew/2/01/fase1', CLUSTER, 'goal-c'),
      nlAt('fase-1', 'rw/verb/1/01/fsae1', CLUSTER, 'goal-d'),
      // A code that says what it seems to.
      nlAt('fase-2', 'rw/bew/5/03/fase2', CLUSTER, 'goal-e'),
    )
  })

  it('one code on two records: each says where it is and where the other is', () => {
    const answer = lookup({ by: 'code', code: 'rw/bew/5/02/fase3' }, pack())
    const notes = new Map(answer.jurisdictions[0]!.matches.map((match) => [match.entry.id, match.entry.codeNote]))
    expect(notes.get(TWICE)).toBe('code as the open data has it; this record is at fase-2, and the same code is on a record at fase-3')
    expect(notes.get(TWICE_AT_3)).toBe('the open data gives this code to two records; this one is at fase-3, the other at fase-2')
    expect(formatAnswer(answer)).toContain(`  code rw/bew/5/02/fase3 (the open data gives this code to two records; this one is at fase-3, the other at fase-2) | scope: ${CLUSTER}`)
  })

  it('a last part that is not the fase of the record is said to be the code of the data, with the level of the record', () => {
    const other = lookup({ by: 'code', code: 'rw/bew/2/01/fase1' }, pack()).jurisdictions[0]!.matches[0]!.entry
    expect(other).toMatchObject({ level: 'fase-2', codeNote: 'code as the open data has it; this record is at fase-2' })
    const misspelt = lookup({ by: 'code', code: 'rw/verb/1/01/fsae1' }, pack()).jurisdictions[0]!.matches[0]!.entry
    expect(misspelt).toMatchObject({ level: 'fase-1', codeNote: 'code as the open data has it; this record is at fase-1' })
  })

  it('the note is on the record however it is listed, and no other record has one', () => {
    const answer = lookup({ by: 'level', jurisdiction: 'nl', level: 'fase-2', subject: 'mathematics' }, pack())
    expect(answer.levels[0]!.lanes[0]!.entries.map((entry) => [entry.code, entry.codeNote !== undefined])).toEqual([
      ['rw/bew/2/01/fase1', true],
      ['rw/bew/5/02/fase3', true],
      ['rw/bew/5/03/fase2', false],
    ])
    const california = lookup({ by: 'level', jurisdiction: 'us-ca', level: 'grade-4' }, pack())
    expect(california.levels[0]!.lanes.flatMap((lane) => lane.entries).some((entry) => entry.codeNote !== undefined)).toBe(false)
    expect(lookup({ by: 'code', code: '1.1', jurisdiction: 'nl' }, pack()).jurisdictions[0]!.matches[0]!.entry.codeNote).toBeUndefined()
  })
})

describe('what a record prints', () => {
  it('an unconfirmed record shows its state and the reason', () => {
    const reason = 'The second reading found a clause the summary leaves out.'
    const answer = lookup({ by: 'level', jurisdiction: 'us-ca', level: 'grade-4', subject: 'mathematics' }, pack({ states: stateOf(caId(NF1), 'unconfirmed', reason) }))
    expect(answer.levels[0]!.lanes[0]!.entries[0]).toMatchObject({ id: caId(NF1), state: 'unconfirmed', reason })
    const text = formatAnswer(answer)
    expect(text).toContain(`check: unconfirmed (${reason})`)
    // A record the join says nothing about is unchecked.
    expect(text).toContain('check: unchecked')
  })

  it('every record prints the path of its file, after its summary or gloss, however it was found', () => {
    const byLevel = formatAnswer(lookup({ by: 'level', jurisdiction: 'us-ca', level: 'grade-4', subject: 'mathematics' }, pack()))
    for (const sample of [NF1, NF2, NF10]) expect(byLevel).toContain(`\n  file: education/${pathForId(caId(sample))!}\n`)
    expect(byLevel).toContain(`summary: Invented summary: two ways of cutting a cake give the same share.\n  file: education/${pathForId(caId(NF1))!}`)
    const byCode = formatAnswer(lookup({ by: 'code', code: '1.1', jurisdiction: 'nl' }, pack()))
    expect(byCode).toContain(`gloss: Invented gloss: count the pears in a bowl.\n  file: education/${pathForId(NL_ID)!}`)
    const byAge = formatAnswer(lookup({ by: 'age', jurisdiction: 'us-ca', age: 10, subject: 'mathematics' }, pack()))
    expect(byAge.match(/^ {2}file: education\/corpus\//gm)).toHaveLength(5)
  })

  it('a California record prints its standing and the start of its summary, or that the text is pending', () => {
    const text = formatAnswer(lookup({ by: 'level', jurisdiction: 'us-ca', level: 'grade-4', subject: 'mathematics' }, pack()))
    expect(text).toContain('standing: state-board-adopted-standard | check:')
    expect(text).toContain('summary: Invented summary: two ways of cutting a cake give the same share.')
    expect(text).toContain('summary: still pending')
    expect(text).not.toContain('official wording:')
  })

  it('a Dutch record prints its regime and the start of its English gloss', () => {
    const text = formatAnswer(lookup({ by: 'code', code: '1.1', jurisdiction: 'nl' }, pack()))
    expect(text).toContain('standing: legal-core-goal | regime: 2026 | check:')
    expect(text).toContain('gloss: Invented gloss: count the pears in a bowl.')
  })

  it('a long summary is cut to one line', () => {
    const long = { ...NF2, summary: `Invented summary\nover two lines. ${'More invented words. '.repeat(20)}` }
    const [file, text] = caRecord(long)
    writeFileSync(join(education, file), text)
    const answer = lookup({ by: 'code', code: '4.NF.2' }, pack())
    const start = answer.jurisdictions[0]!.matches[0]!.entry.start!
    expect(start.startsWith('Invented summary over two lines. More invented words.')).toBe(true)
    expect(start.endsWith('…')).toBe(true)
    expect(start.length).toBeLessThanOrEqual(121)
  })
})

describe('official wording', () => {
  it('without the store, a description-only record prints its summary and how to get the wording', () => {
    const answer = lookup({ by: 'code', code: '4.NF.1', wording: true }, pack())
    const entry = answer.jurisdictions[0]!.matches[0]!.entry
    expect(entry.wording).toBeUndefined()
    const text = formatAnswer(answer)
    expect(text).toContain('summary: Invented summary: two ways of cutting a cake')
    // Both commands that fill the store: the importers, and the extraction for the records located in a PDF.
    expect(text).toContain(`official wording: not on this machine. Run \`${FETCH_COMMAND}\`, then \`npm run education:import\` and \`npm run education:extract\`, to put it in the store.`)
    expect(text).not.toContain(wordingOf('4.NF.1'))
    // Asked for, the line stands with each record and not once more at the foot.
    expect(answer.wordingHint).toBeUndefined()
  })

  it('without the store and without --wording, an answer that lists a description-only record ends with the line that says how to get the wording', () => {
    for (const answer of [
      lookup({ by: 'age', jurisdiction: 'us-ca', age: 10, subject: 'mathematics' }, pack()),
      lookup({ by: 'level', jurisdiction: 'us-ca', level: 'grade-4' }, pack()),
      lookup({ by: 'code', code: '4.NF.1' }, pack()),
    ]) {
      expect(answer.wordingHint).toBe(NO_STORE)
      const text = formatAnswer(answer)
      expect(text.endsWith(`\n\n${NO_STORE}`)).toBe(true)
      expect(text.split(NO_STORE)).toHaveLength(2)
      expect(text).toContain('summary:')
    }
    expect(NO_STORE).toContain(`\`${FETCH_COMMAND}\``)
    expect(NO_STORE).toContain('`npm run education:import`')
    expect(NO_STORE).toContain('`npm run education:extract`')
  })

  it('that line is not printed when the store is there, for records that hold their wording, or when nothing is listed', () => {
    const dutch = lookup({ by: 'code', code: '1.1', jurisdiction: 'nl' }, pack())
    expect(dutch.wordingHint).toBeUndefined()
    expect(formatAnswer(dutch)).not.toContain('wording store')
    expect(lookup({ by: 'code', code: '9.ZZ.9' }, pack()).wordingHint).toBeUndefined()
    expect(lookup({ by: 'age', jurisdiction: 'us-ca', age: 8 }, pack()).wordingHint).toBeUndefined()

    store = join(education, 'store')
    mkdirSync(store)
    const answer = lookup({ by: 'code', code: '4.NF.1' }, pack())
    expect(answer.wordingHint).toBeUndefined()
    expect(formatAnswer(answer)).not.toContain('wording store')
  })

  it('with the store, a description-only record prints the wording the store holds', () => {
    store = join(education, 'store')
    putWording(store, wordingOf('4.NF.1'))
    const answer = lookup({ by: 'code', code: '4.NF.1', wording: true }, pack())
    expect(answer.jurisdictions[0]!.matches[0]!.entry.wording).toBe(wordingOf('4.NF.1'))
    expect(formatAnswer(answer)).toContain(`official wording: ${wordingOf('4.NF.1')}`)
  })

  it('a verbatim record prints the wording its file holds, and its source line after it', () => {
    const answer = lookup({ by: 'code', code: '1.1', jurisdiction: 'nl', wording: true }, pack())
    // The wording is the statement alone; the source line is kept beside it.
    expect(answer.jurisdictions[0]!.matches[0]!.entry).toMatchObject({ wording: NL_WORDING, source: `Source: ${NL_SOURCE}` })
    expect(formatAnswer(answer)).toContain(`  official wording: ${NL_WORDING}\n  Source: ${NL_SOURCE}`)
  })

  it('a description-only record has no source line to print', () => {
    store = join(education, 'store')
    putWording(store, wordingOf('4.NF.1'))
    const answer = lookup({ by: 'code', code: '4.NF.1', wording: true }, pack())
    expect('source' in answer.jurisdictions[0]!.matches[0]!.entry).toBe(false)
    expect(formatAnswer(answer)).not.toContain('Source:')
  })

  it('a verbatim record prints the accompanying text its file holds, without the store', () => {
    const example = '(bijv. drie peren en nog twee)'
    const [file, text] = nlRecord()
    const frontmatter = { ...(parseRecord(text).frontmatter as unknown as ObjectiveFrontmatter), supplement_sha256: wordingHash(example) }
    writeFileSync(join(education, file), draftObjective(frontmatter, { wording: NL_WORDING, source: NL_SOURCE, accompanying: { note: 'the example printed under this goal', text: example } }))

    const answer = lookup({ by: 'code', code: '1.1', jurisdiction: 'nl', wording: true }, pack())

    expect(answer.jurisdictions[0]!.matches[0]!.entry).toMatchObject({ wording: NL_WORDING, supplement: example })
    expect(formatAnswer(answer)).toContain(`  official wording: ${NL_WORDING}\n  accompanying text: ${example}\n  Source: ${NL_SOURCE}`)
  })

  it('is not read or printed unless it is asked for', () => {
    store = join(education, 'store')
    putWording(store, wordingOf('4.NF.1'))
    const answer = lookup({ by: 'code', code: '4.NF.1' }, pack())
    expect('wording' in answer.jurisdictions[0]!.matches[0]!.entry).toBe(false)
    expect(formatAnswer(answer)).not.toContain('official wording')
    const dutch = lookup({ by: 'code', code: '1.1', jurisdiction: 'nl' }, pack())
    expect('source' in dutch.jurisdictions[0]!.matches[0]!.entry).toBe(false)
    expect(formatAnswer(dutch)).not.toContain('Source:')
  })

  it('with the store, a record that has accompanying text prints it after the wording, labelled as such', () => {
    store = join(education, 'store')
    putWording(store, wordingOf('5.NF.1'))
    putWording(store, FOOTNOTE)
    const answer = lookup({ by: 'code', code: '5.NF.1', wording: true }, pack())
    expect(answer.jurisdictions[0]!.matches[0]!.entry.supplement).toBe(FOOTNOTE)
    expect(formatAnswer(answer)).toContain(`  official wording: ${wordingOf('5.NF.1')}\n  accompanying text: ${FOOTNOTE.split('\n').join('\n    ')}`)
  })

  it('prints no accompanying text for a record without any, when the store lacks it, or when wording is not asked for', () => {
    store = join(education, 'store')
    putWording(store, wordingOf('4.NF.1'))
    putWording(store, wordingOf('5.NF.1'))
    for (const answer of [lookup({ by: 'code', code: '4.NF.1', wording: true }, pack()), lookup({ by: 'code', code: '5.NF.1', wording: true }, pack())]) {
      expect('supplement' in answer.jurisdictions[0]!.matches[0]!.entry).toBe(false)
      expect(formatAnswer(answer)).not.toContain('accompanying text')
    }
    putWording(store, FOOTNOTE)
    const unasked = lookup({ by: 'code', code: '5.NF.1' }, pack())
    expect('supplement' in unasked.jurisdictions[0]!.matches[0]!.entry).toBe(false)
    expect(formatAnswer(unasked)).not.toContain('accompanying text')
  })
})

describe('the command line', () => {
  it('reads the four forms', () => {
    expect(parseArgs(['--id', caId(NF1)])).toEqual({ query: { by: 'id', id: caId(NF1), wording: false }, json: false })
    expect(parseArgs(['--id', NL_ID, '--wording', '--json'])).toEqual({ query: { by: 'id', id: NL_ID, wording: true }, json: true })
    expect(parseArgs(['--jurisdiction', 'us-ca', '--age', '10', '--subject', 'mathematics'])).toEqual({
      query: { by: 'age', jurisdiction: 'us-ca', age: 10, subject: 'mathematics', wording: false },
      json: false,
    })
    expect(parseArgs(['--jurisdiction', 'nl', '--level', 'fase-1', '--json'])).toEqual({
      query: { by: 'level', jurisdiction: 'nl', level: 'fase-1', wording: false },
      json: true,
    })
    expect(parseArgs(['--code', 'K.CC.4', '--wording'])).toEqual({ query: { by: 'code', code: 'K.CC.4', wording: true }, json: false })
  })

  it('takes exactly one of --age, --level, --code and --id', () => {
    const one = { error: 'give one of --age, --level, --code and --id' }
    expect(parseArgs(['--jurisdiction', 'us-ca'])).toEqual(one)
    expect(parseArgs(['--id', caId(NF1), '--code', '4.NF.1'])).toEqual(one)
    expect(parseArgs(['--jurisdiction', 'us-ca', '--age', '5', '--id', caId(NF1)])).toEqual(one)
    expect(parseArgs(['--jurisdiction', 'us-ca', '--age', '5', '--level', 'kindergarten'])).toEqual(one)
    // An id names its jurisdiction and one record, so nothing narrows it.
    expect(parseArgs(['--id', caId(NF1), '--jurisdiction', 'us-ca'])).toEqual({ error: expect.stringContaining('--jurisdiction does not go with --id') })
    expect(parseArgs(['--id', caId(NF1), '--subject', 'mathematics'])).toEqual({ error: expect.stringContaining('--subject does not go with --id') })
    expect(parseArgs(['--id'])).toEqual({ error: '--id needs a value' })
  })

  it('--outline goes with --age and --level, and with nothing else', () => {
    expect(parseArgs(['--jurisdiction', 'us-ca', '--age', '5', '--outline'])).toEqual({ query: { by: 'age', jurisdiction: 'us-ca', age: 5, wording: false, outline: true }, json: false })
    expect(parseArgs(['--jurisdiction', 'nl', '--level', 'fase-1', '--subject', 'mathematics', '--outline', '--json'])).toEqual({
      query: { by: 'level', jurisdiction: 'nl', level: 'fase-1', subject: 'mathematics', wording: false, outline: true },
      json: true,
    })
    // Without the flag the query is as it was: no outline key.
    expect(parseArgs(['--jurisdiction', 'us-ca', '--age', '5'])).toEqual({ query: { by: 'age', jurisdiction: 'us-ca', age: 5, wording: false }, json: false })
    expect(parseArgs(['--code', 'K.CC.4', '--outline'])).toEqual({ error: expect.stringContaining('--outline does not go with --code') })
    expect(parseArgs(['--id', caId(NF1), '--outline'])).toEqual({ error: expect.stringContaining('--outline does not go with --id') })
    expect(parseArgs(['--jurisdiction', 'us-ca', '--age', '5', '--outline', '--wording'])).toEqual({ error: expect.stringContaining('--wording does not go with --outline') })
  })

  it('--help asks for the help text, which names every option and gives four examples per jurisdiction: by age as an outline, by age or level, by code and by id', () => {
    expect(parseArgs(['--help'])).toEqual({ help: true })
    expect(parseArgs(['--code', 'K.CC.4', '--help'])).toEqual({ help: true })
    for (const option of ['--jurisdiction', '--age', '--level', '--subject', '--outline', '--code', '--id', '--wording', '--json', '--help']) expect(HELP).toContain(`  ${option}`)
    const lines = HELP.split('\n')
    const EXAMPLE = '  npm run education:find -- '
    const examples = lines.filter((line) => line.startsWith(EXAMPLE))
    expect(examples).toHaveLength(4 * JURISDICTIONS.length)
    const real = resolve(import.meta.dirname, '..')
    for (const jurisdiction of JURISDICTIONS) {
      // The examples of a jurisdiction stand under its heading, and each asks about that jurisdiction.
      const from = lines.findIndex((line) => line.startsWith('examples, ') && line.endsWith(`(${jurisdiction}):`))
      const own = lines.slice(from + 1, from + 5)
      expect(own.every((line) => line.startsWith(EXAMPLE))).toBe(true)
      const queries = own.map((line) => {
        const args = (line.slice(EXAMPLE.length).match(/"[^"]*"|\S+/g) ?? []).map((arg) => arg.replace(/^"|"$/g, ''))
        // Every example is a command line the lookup reads.
        const parsed = parseArgs(args)
        expect(parsed, line).toHaveProperty('query')
        return (parsed as { query: Parameters<typeof lookup>[0] }).query
      })
      expect(queries.map((query) => query.by).sort()).toEqual(expect.arrayContaining(['code', 'id']))
      expect(queries.filter((query) => (query.by === 'age' || query.by === 'level') && query.outline)).toHaveLength(1)
      expect(queries.filter((query) => (query.by === 'age' || query.by === 'level') && !query.outline)).toHaveLength(1)
      for (const query of queries) {
        if (query.by === 'id') {
          // The example id is a record of the real corpus, of this jurisdiction.
          expect(query.id.startsWith(`edu.${jurisdiction}.`)).toBe(true)
          const file = join(real, pathForId(query.id)!)
          expect(existsSync(file) && readFileSync(file, 'utf8').includes(`\nid: ${query.id}\n`), query.id).toBe(true)
        } else expect(query.jurisdiction).toBe(jurisdiction)
      }
    }
  })

  it('the usage text and the help say how to run the lookup for a parser', () => {
    for (const text of [USAGE, HELP]) {
      expect(text).toContain('npm run --silent education:find -- ... --json')
      expect(text).toContain('node education/tools/lookup.ts ... --json')
      expect(text).toMatch(/npm prints the script name and the command/)
    }
    expect(USAGE).toContain('--id <pack id>')
    expect(USAGE).toContain('[--outline]')
  })

  it('an age outside 2 to 12 is a usage error', () => {
    for (const age of ['1', '13', '4.5', 'ten']) {
      expect(parseArgs(['--jurisdiction', 'us-ca', '--age', age])).toEqual({ error: expect.stringContaining('--age') })
    }
  })

  it('a level, subject or jurisdiction outside the vocabulary is a usage error', () => {
    expect(parseArgs(['--jurisdiction', 'us-ca', '--level', 'fase-1'])).toEqual({ error: expect.stringContaining('--level') })
    expect(parseArgs(['--jurisdiction', 'us-ca', '--age', '5', '--subject', 'maths'])).toEqual({ error: expect.stringContaining('--subject') })
    expect(parseArgs(['--jurisdiction', 'ca', '--age', '5'])).toEqual({ error: expect.stringContaining('--jurisdiction') })
    expect(parseArgs(['--age', '5'])).toEqual({ error: expect.stringContaining('--jurisdiction') })
    expect(parseArgs(['--jurisdiction', 'us-ca'])).toEqual({ error: expect.any(String) })
  })
})
