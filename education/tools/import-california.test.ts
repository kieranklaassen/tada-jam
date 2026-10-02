import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Lane, RowSelection, Skipped } from '../manifest.ts'
import { EXPORT_CORRECTION_REASONS, US_CA_EXPORT_CORRECTIONS, US_CA_EXPORT_CORRECTION_LANES, US_CA_EXPORT_DOMAIN_CORRECTIONS } from '../manifest/us-ca-additions.ts'
import type { ExportCorrections } from '../manifest/us-ca-additions.ts'
import { US_CA_LANES } from '../manifest/us-ca.ts'
import { caSource } from './fixtures.ts'
import { importCalifornia, report } from './import-california.ts'
import type { LaneImport } from './import-california.ts'
import { wordingHash } from './normalise.ts'
import { words } from './overlap.ts'
import { composeRecord, parseRecord, replaceRegion, withMarker } from './record.ts'
import { DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS, OFFICIAL_WORDING, SAME_FILE, SUMMARY, pathForId, sourceId } from './schema.ts'
import type { Subject } from './schema.ts'
import { getWording, putBlob } from './store.ts'
import { validateRecords } from './validate.ts'

// Every cell of every fixture export here is invented: the wording, the
// cluster headings, the footnotes. No official wording belongs in a test.
// The codes, the domain names and the column names are real, and so are the
// ids of the four exports, because the id is what says how an export is read.

const MATH = sourceId('us-ca', 'us-ca-cde-cacs-math-export')
const ELA = sourceId('us-ca', 'us-ca-cde-cacs-ela-export')
const SCIENCE = sourceId('us-ca', 'us-ca-cde-cacs-science-export')
const HEALTH = sourceId('us-ca', 'us-ca-cde-cacs-health-export')

const MATH_HEADER = ['Content Area', 'Standard Identifier', 'Grade Range', 'Min Grade', 'Max Grade', 'Domain', 'Discipline', 'Conceptual Category', 'Description']
const ELA_HEADER = ['Content Area', 'Standard Identifier', 'Grade Range', 'Min Grade', 'Max Grade', 'Subject Area', 'Domain', 'Cluster', 'Description']
const SCIENCE_HEADER = [
  'Content Area',
  'Standard Identifier',
  'Grade Range',
  'Min Grade',
  'Max Grade',
  'Disciplinary Core Idea',
  'Cross Cutting Concept',
  'Science & Engineering Practice',
  'Content Area',
  'Description',
]
const HEALTH_HEADER = ['Content Area', 'Standard Identifier', 'Grade Range', 'Min Grade', 'Max Grade', 'Content Area', 'Overarching Content Standard', 'Description']

const CLUSTER = 'Know the names of the pears and the order they ripen in.'
const COUNTING = 'Counting and Cardinality'

let education: string
let store: string

beforeEach(() => {
  education = mkdtempSync(join(tmpdir(), 'education-import-'))
  store = mkdtempSync(join(tmpdir(), 'education-import-store-'))
})

afterEach(() => {
  rmSync(education, { recursive: true, force: true })
  rmSync(store, { recursive: true, force: true })
})

// An export as the department serves it: rows end in CRLF, and a field that
// holds a comma, a quote or a line break is quoted.
function csv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const cell = (value: string): string => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)
  return [header, ...rows].map((row) => `${row.map(cell).join(',')}\r\n`).join('')
}

// Puts an export in the store, in Windows-1252, and writes the source record that pins it.
function seed(id: string, text: string): void {
  const pin = putBlob(store, Buffer.from(text, 'latin1'))
  const file = join(education, pathForId(id)!)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, composeRecord({ ...caSource, id, pin, version: 'Example Standards, 2013 edition' }, 'An invented export.'))
}

function lane(level: string, subject: Subject, source: string, selection: Omit<RowSelection, 'kind'>, expectedCount: number, skipped: readonly Skipped[] = []): Lane {
  return {
    jurisdiction: 'us-ca',
    level,
    subject,
    title: `${level} ${subject}`,
    sources: [source],
    parts: [
      {
        name: 'Fixture rows',
        source,
        checkRendition: SAME_FILE,
        checkStrength: 'second-reading',
        checkGranularity: 'A second reading of the fixture.',
        expectedCount,
        selection: { kind: 'rows', ...selection },
      },
    ],
    expectedCount,
    countingMethod: 'Rows of the fixture.',
    countIsFromImportFile: true,
    domains: [],
    granularity: 'One record is one row.',
    skipped,
  }
}

const byGrade = (range: string, domainColumn = 'Domain'): Omit<RowSelection, 'kind'> => ({ codeColumn: 'Standard Identifier', domainColumn, where: { 'Grade Range': [range] } })

const mathRow = (code: string, range: string, grade: string, domain: string, standard: string, footnote?: string): string[] => [
  'Mathematics',
  code,
  range,
  grade,
  grade,
  domain,
  '',
  '',
  `Cluster:\n${CLUSTER}\n\nStandard:\n${standard}${footnote === undefined ? '' : `\n\nFootnote:\n${footnote}`}`,
]

const elaRow = (code: string, range: string, min: string, max: string, domain: string, standard: string, footnote?: string): string[] => [
  'English Language Arts',
  code,
  range,
  min,
  max,
  'Example Subject Area',
  domain,
  'Example Cluster Name',
  `Standard:\n${standard}${footnote === undefined ? '' : `\n\nFootnote:\n${footnote}`}`,
]

const scienceRow = (code: string, range: string, grade: string, discipline: string, expectation: string): string[] => [
  'Science (CA NGSS)',
  code,
  range,
  grade,
  grade,
  'PS9.A: Rolling Fruit',
  '',
  'SEP-9: Watching Fruit',
  discipline,
  `Title: Rolling Fruit\n\nPerformance Expectation: ${expectation}\n\nDisciplinary Core Idea(s):\nPS9.A: Rolling Fruit\nRound fruit rolls further than square fruit.\n\nScience & Engineering Practices:\nWatch the fruit closely.`,
]

const healthRow = (code: string, range: string, grade: string, area: string, standard: string, footnote?: string): string[] => [
  'Health Education',
  code,
  range,
  grade,
  grade,
  area,
  '1: Essential Concepts',
  `Standard:\n${standard}${footnote === undefined ? '' : `\n\nFootnote:\n${footnote}`}`,
]

const KINDER_MATH = [
  mathRow('K.CC.1', 'K', '0', COUNTING, 'Count the pears on a plate up to ten.'),
  mathRow('K.CC.4.a', 'K', '0', COUNTING, 'Understand how pears are counted.\na. Say one number for each pear touched, 2 × 5 at most.'),
  mathRow('1.OA.1', '1', '1', 'Operations and Algebraic Thinking', 'Add two baskets of plums.'),
]

function read(file: string): string {
  return readFileSync(join(education, file), 'utf8')
}

function frontmatterOf(file: string): Record<string, unknown> {
  return parseRecord(read(file)).frontmatter
}

function files(imports: readonly LaneImport[]): string[] {
  return imports.flatMap((lane) => lane.results.map((result) => result.file))
}

function stored(file: string): string | null {
  return getWording(store, frontmatterOf(file).wording_sha256 as string)
}

// The accompanying text the store holds for a record, or null for a record without the field.
function supplementOf(file: string): string | null {
  const hash = frontmatterOf(file).supplement_sha256
  return hash === undefined ? null : getWording(store, hash as string)
}

const K_MATH = 'corpus/us-ca/kindergarten/mathematics/objectives'

describe('importing the California exports', () => {
  it('writes one record per row with the printed code, in the lane of its level, and records the validator accepts', () => {
    seed(MATH, csv(MATH_HEADER, KINDER_MATH))
    const lanes = [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2), lane('grade-1', 'mathematics', MATH, byGrade('1'), 1)]

    const imports = importCalifornia(education, store, lanes)

    expect(files(imports)).toEqual([`${K_MATH}/k-cc-1.md`, `${K_MATH}/k-cc-4-a.md`, 'corpus/us-ca/grade-1/mathematics/objectives/1-oa-1.md'])
    expect(imports.flatMap((lane) => lane.results.map((result) => result.status))).toEqual(['created', 'created', 'created'])
    expect(files(imports).map((file) => frontmatterOf(file).code)).toEqual(['K.CC.1', 'K.CC.4.a', '1.OA.1'])
    expect(files(imports).map((file) => frontmatterOf(file).level)).toEqual(['kindergarten', 'kindergarten', 'grade-1'])
    expect(frontmatterOf(`${K_MATH}/k-cc-1.md`)).toMatchObject({
      id: 'edu.us-ca.kindergarten.mathematics.objective.k-cc-1',
      title: 'K.CC.1, Counting and Cardinality',
      subject: 'mathematics',
      content_language: 'en',
      curriculum_version: 'Example Standards, 2013 edition',
      code_key: 'K.CC.1',
      code_scope: 'California Common Core State Standards: Mathematics, Counting and Cardinality',
      california_addition: false,
      standing: 'state-board-adopted-standard',
      reuse_policy: 'description-only',
      source: MATH,
      locator: 'row K.CC.1, Grade Range K',
    })
    expect(imports.map((lane) => lane.finding)).toEqual([null, null])
    const tree = [pathForId(MATH)!, ...files(imports)].map((file) => ({ file, text: read(file) }))
    expect(validateRecords(tree)).toEqual([])
  })

  it('flags a row whose text carries the California marker, on the statement or on a sub-part line', () => {
    seed(
      ELA,
      csv(ELA_HEADER, [
        elaRow('RL.K.4', 'K', '0', '0', 'Reading: Literature', 'Ask what a word about pears means. CA'),
        elaRow('RL.K.5', 'K', '0', '0', 'Reading: Literature', 'Tell a story about pears from a list of pears.'),
        elaRow('SL.K.2', 'K', '0', '0', 'Speaking and Listening', 'Say back what was read aloud about pears.\na. Follow a two-step direction about pears. CA'),
      ]),
    )

    const imports = importCalifornia(education, store, [lane('kindergarten', 'reading-language', ELA, byGrade('K'), 3)])

    expect(files(imports).map((file) => [frontmatterOf(file).code, frontmatterOf(file).california_addition])).toEqual([
      ['RL.K.4', true],
      ['RL.K.5', false],
      ['SL.K.2', true],
    ])
  })

  it('makes one record of a mathematics sub-part row, with its parent code and the stem the row repeats', () => {
    seed(MATH, csv(MATH_HEADER, KINDER_MATH))

    importCalifornia(education, store, [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2)])

    expect(frontmatterOf(`${K_MATH}/k-cc-4-a.md`)).toMatchObject({ code: 'K.CC.4.a', code_key: 'K.CC.4.a', parent_code: 'K.CC.4', title: 'K.CC.4.a, Counting and Cardinality' })
    expect(frontmatterOf(`${K_MATH}/k-cc-1.md`).parent_code).toBeUndefined()
    // Decoded from Windows-1252, and the cluster heading is not part of it.
    expect(stored(`${K_MATH}/k-cc-4-a.md`)).toBe('Understand how pears are counted.\na. Say one number for each pear touched, 2 × 5 at most.')
  })

  it('makes one record of an English language arts row with sub-parts inside it', () => {
    const standard = 'Print the names of pears.\na. Print "pear" in capitals.\nb.Print it again, smaller.'
    seed(ELA, csv(ELA_HEADER, [elaRow('L.K.1', 'K', '0', '0', 'Language', standard)]))

    const imports = importCalifornia(education, store, [lane('kindergarten', 'reading-language', ELA, byGrade('K'), 1)])

    const [file] = files(imports)
    expect(files(imports)).toHaveLength(1)
    expect(frontmatterOf(file!)).toMatchObject({ code: 'L.K.1', title: 'L.K.1, Language' })
    expect(frontmatterOf(file!).parent_code).toBeUndefined()
    expect(stored(file!)).toBe(standard)
  })

  it('writes no record for a code the lane lists as skipped', () => {
    seed(MATH, csv(MATH_HEADER, KINDER_MATH))
    const skipped = [{ code: 'K.CC.1', reason: 'Placeholder row in the fixture.' }]

    const imports = importCalifornia(education, store, [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 1, skipped)])

    expect(files(imports)).toEqual([`${K_MATH}/k-cc-4-a.md`])
    expect(existsSync(join(education, `${K_MATH}/k-cc-1.md`))).toBe(false)
    expect(imports[0]!.finding).toBeNull()
  })

  it('trims a code and a cell it compares, keeps a malformed code as printed, and leaves a footnote out of the wording', () => {
    seed(
      HEALTH,
      csv(HEALTH_HEADER, [
        healthRow('K7.3.N', 'Kindergarten', '0', 'Nutrition and Physical Activity', 'Pick a pear for a snack.'),
        healthRow('K.8.1.S ', 'Kindergarten\t', '0', 'Injury, Prevention, and Safety', 'Wash a pear before eating it.', '[1] See the invented fruit code.'),
      ]),
    )

    const imports = importCalifornia(education, store, [lane('kindergarten', 'practical-life-feelings', HEALTH, byGrade('Kindergarten', 'Content Area#2'), 2)])

    const folder = 'corpus/us-ca/kindergarten/practical-life-feelings/objectives'
    expect(files(imports)).toEqual([`${folder}/k7-3-n.md`, `${folder}/k-8-1-s.md`])
    expect(frontmatterOf(`${folder}/k7-3-n.md`)).toMatchObject({ code: 'K7.3.N', code_key: 'K.7.3.N', title: 'K7.3.N, Nutrition and Physical Activity' })
    expect(frontmatterOf(`${folder}/k-8-1-s.md`)).toMatchObject({
      code: 'K.8.1.S',
      code_scope: 'Health Education Content Standards for California Public Schools, Injury, Prevention, and Safety',
      locator: 'row K.8.1.S, Grade Range Kindergarten',
      california_addition: false,
    })
    expect(stored(`${folder}/k-8-1-s.md`)).toBe('Wash a pear before eating it.')
  })

  it('names the band in the code scope of a row that holds for a band of grades', () => {
    seed(
      ELA,
      csv(ELA_HEADER, [
        elaRow('RL.6.1', '6', '6', '6', 'Reading: Literature', 'Say what a story about pears says.'),
        elaRow('RH.6-8.1', '6-8\t', '6', '8', 'Reading: Literacy in History/Social Studies', 'Point to where a history of pears says so.'),
      ]),
    )
    const selection = { codeColumn: 'Standard Identifier', domainColumn: 'Domain', where: { 'Min Grade': ['6'] } }

    const imports = importCalifornia(education, store, [lane('grade-6', 'reading-language', ELA, selection, 2)])

    const folder = 'corpus/us-ca/grade-6/reading-language/objectives'
    expect(files(imports)).toEqual([`${folder}/rl-6-1.md`, `${folder}/rh-6-8-1.md`])
    expect(frontmatterOf(`${folder}/rl-6-1.md`).code_scope).toBe('California Common Core State Standards: English Language Arts and Literacy, Reading: Literature')
    expect(frontmatterOf(`${folder}/rh-6-8-1.md`)).toMatchObject({
      code: 'RH.6-8.1',
      code_scope: 'California Common Core State Standards: English Language Arts and Literacy, Reading: Literacy in History/Social Studies, grades 6-8',
      locator: 'row RH.6-8.1, Grade Range 6-8',
    })
  })

  it('reads only the performance expectation of a science row, writes a band row once, and flags a code the grade documents mark', () => {
    const engineering = 'Engineering, Technology, and Applications of Science'
    const expectation = ' Roll a pear down a ramp and say how far it goes.*  [Clarification Statement: A ramp could be a plank.] '
    seed(
      SCIENCE,
      csv(SCIENCE_HEADER, [
        scienceRow('3-5-ETS1-1', '4', '4', engineering, 'Say what a pear picker has to do.'),
        scienceRow('4-PS3-1', '4', '4', 'Physical Science', expectation),
        scienceRow('4-PS3-2', '4', '4', 'Physical Science', 'Watch a pear warm up in the sun.'),
        scienceRow('3-5-ETS1-1', '5', '5', engineering, 'Say what a pear picker has to do.'),
      ]),
    )
    const grade = lane('grade-4', 'science', SCIENCE, byGrade('4', 'Content Area#2'), 2, [{ code: '3-5-ETS1-1', reason: 'Recorded once, in the cross-grade lane.' }])
    const band = lane('cross-grade', 'science', SCIENCE, { ...byGrade('4', 'Content Area#2'), codePrefixes: ['3-5-ETS1-'] }, 1)

    const imports = importCalifornia(education, store, [grade, band])

    const folder = 'corpus/us-ca/grade-4/science/objectives'
    expect(files(imports)).toEqual([`${folder}/4-ps3-1.md`, `${folder}/4-ps3-2.md`, 'corpus/us-ca/cross-grade/science/objectives/3-5-ets1-1.md'])
    expect(stored(`${folder}/4-ps3-1.md`)).toBe(expectation.trim())
    expect(frontmatterOf(`${folder}/4-ps3-1.md`)).toMatchObject({
      title: '4-PS3-1, Physical Science',
      code_scope: 'Next Generation Science Standards for California Public Schools (CA NGSS), Physical Science',
      california_addition: true,
    })
    expect(frontmatterOf(`${folder}/4-ps3-2.md`).california_addition).toBe(false)
    expect(frontmatterOf('corpus/us-ca/cross-grade/science/objectives/3-5-ets1-1.md')).toMatchObject({
      level: 'cross-grade',
      code_scope: `Next Generation Science Standards for California Public Schools (CA NGSS), ${engineering}, grades 3-5`,
      locator: 'row 3-5-ETS1-1, Grade Range 4',
    })
  })

  it('gives two rows of a lane whose codes make the same slug different files, and says which', () => {
    seed(MATH, csv(MATH_HEADER, [mathRow('K.CC.1', 'K', '0', COUNTING, 'Count the pears on a plate.'), mathRow('K.CC-1', 'K', '0', COUNTING, 'Count the plums in a bowl.')]))

    const imports = importCalifornia(education, store, [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2)])

    expect(files(imports)).toEqual([`${K_MATH}/k-cc-1.md`, `${K_MATH}/k-cc-1-2.md`])
    expect(frontmatterOf(`${K_MATH}/k-cc-1-2.md`).code).toBe('K.CC-1')
    expect(imports[0]!.suffixed).toEqual(['K.CC-1 is k-cc-1-2'])
    expect(imports[0]!.finding).toBeNull()
  })

  it('leaves every file byte-identical on a second run and reports each unchanged', () => {
    seed(MATH, csv(MATH_HEADER, KINDER_MATH))
    const lanes = [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2), lane('grade-1', 'mathematics', MATH, byGrade('1'), 1)]
    const first = files(importCalifornia(education, store, lanes))
    const before = first.map(read)
    // A file that cannot be written to: a second write would throw.
    for (const file of first) chmodSync(join(education, file), 0o444)

    const second = importCalifornia(education, store, lanes)

    expect(second.flatMap((lane) => lane.results.map((result) => result.status))).toEqual(['unchanged', 'unchanged', 'unchanged'])
    expect(files(second).map(read)).toEqual(before)
  })

  it('leaves a region a lane agent has filled byte-identical', () => {
    seed(MATH, csv(MATH_HEADER, KINDER_MATH))
    const lanes = [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2)]
    importCalifornia(education, store, lanes)
    const file = `${K_MATH}/k-cc-1.md`
    const notes = withMarker(DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS.map((heading) => `${heading}\n\nA note about apples on a table.`).join('\n\n'))
    const filled = replaceRegion(replaceRegion(read(file), SUMMARY, withMarker(SUMMARY, 'Says how many apples are on the table.')), DESIGN_NOTES, notes)
    writeFileSync(join(education, file), filled)

    const again = importCalifornia(education, store, lanes)

    expect(read(file)).toBe(filled)
    expect(again[0]!.results.map((result) => result.status)).toEqual(['unchanged', 'unchanged'])
  })

  it('fails a lane whose imported count differs from the expected count, with both numbers', () => {
    seed(MATH, csv(MATH_HEADER, KINDER_MATH))

    const imports = importCalifornia(education, store, [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 3), lane('grade-1', 'mathematics', MATH, byGrade('1'), 1)])

    expect(imports[0]!.finding!.message).toContain('2 objective file(s)')
    expect(imports[0]!.finding!.message).toContain('expected 3')
    expect(imports[1]!.finding).toBeNull()
    const outcome = report(imports)
    expect(outcome.failed).toBe(true)
    expect(outcome.lines.find((line) => line.includes('kindergarten/mathematics'))).toMatch(/2 objective file\(s\).*expected 3/)
    expect(report([imports[1]!]).failed).toBe(false)
  })

  it('writes no wording into the file of a description-only source, and the hash of the wording into its frontmatter', () => {
    seed(MATH, csv(MATH_HEADER, KINDER_MATH))

    importCalifornia(education, store, [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2)])

    const file = `${K_MATH}/k-cc-1.md`
    const text = read(file)
    expect(text).not.toContain('pears')
    expect(text).not.toContain(OFFICIAL_WORDING)
    expect(frontmatterOf(file).wording_sha256).toBe(wordingHash('Count the pears on a plate up to ten.'))
    expect(stored(file)).toBe('Count the pears on a plate up to ten.')
  })

  it('never puts the wording, the cluster heading or the footnote anywhere in a record file', () => {
    const standard = 'Juggle seventeen quinces behind a velvet curtain.'
    const footnote = 'Quinces may be swapped for medlars on Thursdays.'
    seed(MATH, csv(MATH_HEADER, [mathRow('K.CC.6', 'K', '0', COUNTING, standard, footnote)]))

    importCalifornia(education, store, [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 1)])

    const file = `${K_MATH}/k-cc-6.md`
    const { title, code_scope: scope } = frontmatterOf(file)
    expect(title).toBe('K.CC.6, Counting and Cardinality')
    expect(scope).toBe('California Common Core State Standards: Mathematics, Counting and Cardinality')
    const text = read(file)
    for (const word of ['quinces', 'velvet', 'medlars', 'ripen', 'pears', 'Quinces', 'Know the names']) expect(text).not.toContain(word)
    expect(stored(file)).toBe(standard)
  })

  it('stores what accompanies a standard as its supplement and leaves the wording as it was: the cluster heading and the footnote of a mathematics row, the footnote of an English language arts or health row', () => {
    const standard = 'Count the pears on a plate up to ten.'
    const footnote = 'Plates of more than ten pears wait for a later year.\nSo do bowls.'
    seed(MATH, csv(MATH_HEADER, [mathRow('K.CC.1', 'K', '0', COUNTING, standard, footnote), mathRow('K.CC.2', 'K', '0', COUNTING, 'Count on from a number of plums.')]))
    seed(ELA, csv(ELA_HEADER, [elaRow('RL.K.4', 'K', '0', '0', 'Reading: Literature', 'Ask what a word about pears means.', '1 Words about plums count too.')]))
    seed(HEALTH, csv(HEALTH_HEADER, [healthRow('K.8.1.S', 'Kindergarten', '0', 'Injury, Prevention, and Safety', 'Wash a pear before eating it.', '[1] See the invented fruit code.')]))

    const imports = importCalifornia(education, store, [
      lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2),
      lane('kindergarten', 'reading-language', ELA, byGrade('K'), 1),
      lane('kindergarten', 'practical-life-feelings', HEALTH, byGrade('Kindergarten', 'Content Area#2'), 1),
    ])

    const [withFootnote, without, ela, health] = files(imports)
    const accompanying = `Cluster heading: ${CLUSTER}\nFootnote: ${footnote}`
    expect(supplementOf(withFootnote!)).toBe(accompanying)
    expect(frontmatterOf(withFootnote!)).toMatchObject({ wording_sha256: wordingHash(standard), supplement_sha256: wordingHash(accompanying) })
    expect(stored(withFootnote!)).toBe(standard)
    expect(read(withFootnote!)).not.toContain('later year')
    expect(read(withFootnote!)).not.toContain(CLUSTER)
    // A mathematics row without a footnote still has its cluster heading.
    expect(supplementOf(without!)).toBe(`Cluster heading: ${CLUSTER}`)
    expect(supplementOf(ela!)).toBe('1 Words about plums count too.')
    expect(supplementOf(health!)).toBe('[1] See the invented fruit code.')
  })

  it('gives a science row no supplement: its clarification statement and assessment boundary are part of its wording', () => {
    const both = 'Roll a pear down a ramp.* [Clarification Statement: A ramp could be a plank.] [Assessment Boundary: Ramps longer than a table are left out.] '
    seed(SCIENCE, csv(SCIENCE_HEADER, [scienceRow('4-PS3-1', '4', '4', 'Physical Science', both)]))

    const imports = importCalifornia(education, store, [lane('grade-4', 'science', SCIENCE, byGrade('4', 'Content Area#2'), 1)])

    const [first] = files(imports)
    expect(frontmatterOf(first!).supplement_sha256).toBeUndefined()
    expect(stored(first!)).toBe(both.trim())
    expect(read(first!)).not.toContain('plank')
  })

  it('leaves the footnote marker of a health row out of its wording', () => {
    seed(HEALTH, csv(HEALTH_HEADER, [healthRow('K.8.1.S', 'Kindergarten', '0', 'Injury, Prevention, and Safety', 'Wash a pear before eating it.[3]', '[3] See the invented fruit code.')]))

    const imports = importCalifornia(education, store, [lane('kindergarten', 'practical-life-feelings', HEALTH, byGrade('Kindergarten', 'Content Area#2'), 1)])

    const [record] = files(imports)
    expect(stored(record!)).toBe('Wash a pear before eating it.')
    expect(frontmatterOf(record!).wording_sha256).toBe(wordingHash('Wash a pear before eating it.'))
    expect(supplementOf(record!)).toBe('[3] See the invented fruit code.')
  })

  it('gives a footnote marked on a domain to every standard of the domain, and one marked on a parent stem to every lettered part', () => {
    const domainNote = 'Pears up to one hundred only.'
    const stemNote = 'Plums are not divided by plums this year.'
    seed(
      MATH,
      csv(MATH_HEADER, [
        mathRow('4.NBT.1', '4', '4', COUNTING, 'Count a crate of pears.', domainNote),
        mathRow('4.NBT.2', '4', '4', COUNTING, 'Compare two crates of pears.'),
        mathRow('5.NF.7.a', '4', '4', 'Sharing', 'Share plums. a. Halve a plum.', stemNote),
        mathRow('5.NF.7.b', '4', '4', 'Sharing', 'Share plums. b. Quarter a plum.'),
        mathRow('5.NF.6', '4', '4', 'Sharing', 'Weigh a plum.'),
      ]),
    )

    const imports = importCalifornia(education, store, [lane('grade-4', 'mathematics', MATH, byGrade('4'), 5)])

    const [first, second, partA, partB, other] = files(imports)
    expect(supplementOf(first!)).toBe(`Cluster heading: ${CLUSTER}\nFootnote: ${domainNote}`)
    expect(supplementOf(second!)).toBe(`Cluster heading: ${CLUSTER}\nFootnote: ${domainNote}`)
    expect(supplementOf(partA!)).toBe(`Cluster heading: ${CLUSTER}\nFootnote: ${stemNote}`)
    expect(supplementOf(partB!)).toBe(`Cluster heading: ${CLUSTER}\nFootnote: ${stemNote}`)
    expect(supplementOf(other!)).toBe(`Cluster heading: ${CLUSTER}`)
  })

  describe('export corrections', () => {
    const kinder = (): Lane[] => [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2)]
    const run = (corrections: ExportCorrections): LaneImport[] => importCalifornia(education, store, kinder(), undefined, { corrections })

    beforeEach(() => seed(MATH, csv(MATH_HEADER, KINDER_MATH)))

    it('replaces the fragment in the wording of the row, and the stored wording and the hash follow', () => {
      run({ [MATH]: { 'K.CC.1': [{ from: 'a plate', to: 'a platter', reason: 'export typo' }] } })

      const corrected = 'Count the pears on a platter up to ten.'
      expect(stored(`${K_MATH}/k-cc-1.md`)).toBe(corrected)
      expect(frontmatterOf(`${K_MATH}/k-cc-1.md`).wording_sha256).toBe(wordingHash(corrected))
      // The row beside it is as the export has it.
      expect(stored(`${K_MATH}/k-cc-4-a.md`)).toBe('Understand how pears are counted.\na. Say one number for each pear touched, 2 × 5 at most.')
    })

    it('fails when the fragment is not in the wording of the row, and names the code', () => {
      expect(() => run({ [MATH]: { 'K.CC.1': [{ from: 'a bowl', to: 'a platter', reason: 'export typo' }] } })).toThrow(/export correction 1 for K\.CC\.1 .*not in the wording/)
    })

    it('fails on a side longer than four words', () => {
      expect(() => run({ [MATH]: { 'K.CC.1': [{ from: 'pears on a plate up', to: 'plums', reason: 'export typo' }] } })).toThrow(/export correction 1 for K\.CC\.1 .*longer than 4 words/)
      expect(() => run({ [MATH]: { 'K.CC.1': [{ from: 'plate', to: 'platter of five ripe plums', reason: 'export typo' }] } })).toThrow(/export correction 1 for K\.CC\.1 .*longer than 4 words/)
    })

    it('replaces the second occurrence when the occurrence number says 2, and fails on a fragment that occurs twice without one', () => {
      expect(() => run({ [MATH]: { 'K.CC.4.a': [{ from: 'pear', to: 'plum', reason: 'export typo' }] } })).toThrow(/export correction 1 for K\.CC\.4\.a .*more than once/)

      run({ [MATH]: { 'K.CC.4.a': [{ from: 'pear', to: 'plum', occurrence: 2, reason: 'export typo' }] } })

      expect(stored(`${K_MATH}/k-cc-4-a.md`)).toBe('Understand how pears are counted.\na. Say one number for each plum touched, 2 × 5 at most.')
    })

    it('fails on a correction for a code no lane imports, before it writes anything', () => {
      // 1.OA.1 is a row of the export, and of no lane here.
      expect(() => run({ [MATH]: { '1.OA.1': [{ from: 'plums', to: 'plums.', reason: 'closing full stop missing in the export' }] } })).toThrow(/export correction 1 for 1\.OA\.1 .*no lane imports/)
      expect(existsSync(join(education, 'corpus'))).toBe(false)
    })

    it('fails when the lane a corrected code is listed under is not the one that imports its row, and on a listed code without a correction', () => {
      const corrections: ExportCorrections = { [MATH]: { 'K.CC.1': [{ from: 'a plate', to: 'a platter', reason: 'export typo' }] } }
      const listed = (lanes: Record<string, string[]>): (() => LaneImport[]) => () => importCalifornia(education, store, kinder(), undefined, { corrections, lanes: { [MATH]: lanes } })

      expect(listed({ 'grade-1/mathematics': ['K.CC.1'] })).toThrow(/export correction 1 for K\.CC\.1 .*listed under grade-1\/mathematics.*imported into kindergarten\/mathematics/)
      expect(listed({})).toThrow(/export correction 1 for K\.CC\.1 .*listed under no lane.*imported into kindergarten\/mathematics/)
      expect(listed({ 'kindergarten/mathematics': ['K.CC.1', 'K.CC.4.a'] })).toThrow(/K\.CC\.4\.a .*listed under kindergarten\/mathematics.*has no export correction/)
      expect(existsSync(join(education, 'corpus'))).toBe(false)

      expect(listed({ 'kindergarten/mathematics': ['K.CC.1'] })()[0]!.corrected).toEqual(['K.CC.1 (export typo)'])
    })

    it('reports the corrections a run applied, by code and reason and without their text', () => {
      const imports = run({
        [MATH]: {
          'K.CC.1': [{ from: 'ten.', to: 'ten²', reason: 'exponent flattened in the export' }],
          'K.CC.4.a': [
            { from: 'counted', to: 'counted ≠ 0', reason: 'symbol lost in the export' },
            { from: 'most.', to: 'most', reason: 'export typo' },
          ],
        },
      })

      expect(imports[0]!.corrected).toEqual(['K.CC.1 (exponent flattened in the export)', 'K.CC.4.a (symbol lost in the export)', 'K.CC.4.a (export typo)'])
      const [line] = report(imports).lines
      expect(line).toContain('; export corrected: K.CC.1 (exponent flattened in the export), K.CC.4.a (symbol lost in the export), K.CC.4.a (export typo)')
      expect(line).not.toContain('counted')
      expect(stored(`${K_MATH}/k-cc-1.md`)).toBe('Count the pears on a plate up to ten²')
      // A run without corrections says nothing of them.
      expect(report(importCalifornia(education, store, kinder())).lines[0]).not.toContain('export corrected')
    })
  })

  describe('a domain name the export cuts short', () => {
    // Invented names: the export's domain column stops one word before the end.
    const SHORT = 'Reading: Pears in Baskets and'
    const FULL = 'Reading: Pears in Baskets and Bowls'
    const DOCUMENT = 'California Common Core State Standards: English Language Arts and Literacy'
    const folder = 'corpus/us-ca/grade-6/reading-language/objectives'
    const lanes = (): Lane[] => [lane('grade-6', 'reading-language', ELA, { codeColumn: 'Standard Identifier', domainColumn: 'Domain', where: { 'Min Grade': ['6'] } }, 3)]
    const domains = { [ELA]: { [SHORT]: { to: FULL, reason: 'domain name truncated in the export' } } } as const

    beforeEach(() =>
      seed(
        ELA,
        csv(ELA_HEADER, [
          elaRow('RL.6.1', '6', '6', '6', 'Reading: Literature', 'Say what a story about pears says.'),
          elaRow('RST.6-8.1', '6-8\t', '6', '8', SHORT, 'Point to where a text about pears says so.'),
          elaRow('RST.6-8.2', '6-8\t', '6', '8', SHORT, 'Say what a text about plums is about.'),
          elaRow('RST.9-10.1', '9-10', '9', '10', 'Reading: Plums in', 'Point to where a text about plums says so.'),
        ]),
      ),
    )

    it("is named in the title and the code scope in the export's own form, completed from the adopted document, and the id, the file and the wording hash stay as they were", () => {
      const before = importCalifornia(education, store, lanes())
      const asExported = files(before).map((file) => frontmatterOf(file))
      expect(asExported[1]).toMatchObject({ title: `RST.6-8.1, ${SHORT}`, code_scope: `${DOCUMENT}, ${SHORT}, grades 6-8` })

      const after = importCalifornia(education, store, lanes(), undefined, { domains })

      expect(files(after)).toEqual([`${folder}/rl-6-1.md`, `${folder}/rst-6-8-1.md`, `${folder}/rst-6-8-2.md`])
      expect(files(after)).toEqual(files(before))
      expect(after[0]!.results.map((result) => result.status)).toEqual(['unchanged', 'updated', 'updated'])
      expect(frontmatterOf(`${folder}/rst-6-8-1.md`)).toEqual({ ...asExported[1], title: `RST.6-8.1, ${FULL}`, code_scope: `${DOCUMENT}, ${FULL}, grades 6-8` })
      expect(frontmatterOf(`${folder}/rst-6-8-2.md`)).toEqual({ ...asExported[2], title: `RST.6-8.2, ${FULL}`, code_scope: `${DOCUMENT}, ${FULL}, grades 6-8` })
      // A second run changes nothing.
      expect(importCalifornia(education, store, lanes(), undefined, { domains })[0]!.results.map((result) => result.status)).toEqual(['unchanged', 'unchanged', 'unchanged'])
    })

    it('is reported once for the lane, by the name it is given and the reason', () => {
      const imports = importCalifornia(education, store, lanes(), undefined, { domains })

      expect(imports[0]!.renamed).toEqual([`${FULL} (domain name truncated in the export)`])
      expect(report(imports).lines[0]).toContain(`; export domain renamed: ${FULL} (domain name truncated in the export)`)
      expect(report(importCalifornia(education, store, lanes())).lines[0]).not.toContain('renamed')
    })

    it('fails on a name no imported row has in its domain column, and on one given no other name, before it writes anything', () => {
      // A domain of the export, and of no lane here.
      const elsewhere = { [ELA]: { 'Reading: Plums in': { to: 'Reading: Plums in Bowls', reason: 'domain name truncated in the export' } } } as const
      expect(() => importCalifornia(education, store, lanes(), undefined, { domains: elsewhere })).toThrow(/export domain correction for "Reading: Plums in" .*no lane imports a row/)
      const same = { [ELA]: { [SHORT]: { to: SHORT, reason: 'domain name truncated in the export' } } } as const
      expect(() => importCalifornia(education, store, lanes(), undefined, { domains: same })).toThrow(/export domain correction for "Reading: Pears in Baskets and" .*another name/)
      expect(existsSync(join(education, 'corpus'))).toBe(false)
    })
  })

  describe('the committed export corrections', () => {
    const committed = Object.entries(US_CA_EXPORT_CORRECTIONS).flatMap(([source, byCode]) => Object.entries(byCode).flatMap(([code, entries]) => entries.map((entry) => ({ source, code, entry }))))

    it('keep to their form: an export this importer reads, sides of at most four words, a reason of the closed list', () => {
      expect(committed.length).toBeGreaterThan(0)
      for (const { source, code, entry } of committed) {
        expect([MATH, ELA, SCIENCE, HEALTH], code).toContain(source)
        expect(words(entry.from).length, code).toBeGreaterThan(0)
        expect(words(entry.from).length, code).toBeLessThanOrEqual(4)
        expect(words(entry.to).length, code).toBeLessThanOrEqual(4)
        expect(EXPORT_CORRECTION_REASONS, code).toContain(entry.reason)
      }
    })

    it('list each corrected code once, under a lane that reads the export from rows, and list no other code', () => {
      const listed = Object.entries(US_CA_EXPORT_CORRECTION_LANES).flatMap(([source, byLane]) => Object.entries(byLane).flatMap(([name, codes]) => codes.map((code) => ({ source, name, code }))))
      expect(listed.map((each) => `${each.source} ${each.code}`).sort()).toEqual([...new Set(committed.map((each) => `${each.source} ${each.code}`))].sort())
      for (const { source, name, code } of listed) {
        const reading = US_CA_LANES.filter((each) => `${each.level}/${each.subject}` === name && each.parts.some((part) => part.selection.kind === 'rows' && part.source === source))
        expect(reading, `${code} under ${name}`).toHaveLength(1)
      }
    })

    it('name the domain of the RST rows with the word the export stops before', () => {
      expect(EXPORT_CORRECTION_REASONS).toContain('domain name truncated in the export')
      const entries = Object.entries(US_CA_EXPORT_DOMAIN_CORRECTIONS[ELA] ?? {})
      expect(entries.map(([from, entry]) => [entry.to.startsWith(`${from} `), entry.reason])).toEqual([[true, 'domain name truncated in the export']])
      for (const [, entry] of Object.entries(US_CA_EXPORT_DOMAIN_CORRECTIONS).flatMap(([, byName]) => Object.entries(byName))) expect(EXPORT_CORRECTION_REASONS).toContain(entry.reason)
    })

    it('give a domain the name the manifest counts and batches it by, so a record still fits its batch', () => {
      for (const [source, byName] of Object.entries(US_CA_EXPORT_DOMAIN_CORRECTIONS)) {
        for (const [exported, entry] of Object.entries(byName)) {
          const reading = US_CA_LANES.filter((each) => each.parts.some((part) => part.source === source))
          const names = reading.flatMap((each) => [...each.domains.map((domain) => domain.name), ...(each.batches ?? []).flatMap((batch) => batch.values)])
          expect(names, exported).not.toContain(exported)
          const holding = reading.filter((each) => each.domains.some((domain) => domain.name === entry.to))
          expect(holding.length, entry.to).toBeGreaterThan(0)
          for (const each of holding.filter((held) => held.batches !== undefined)) expect(each.batches!.flatMap((batch) => batch.values), entry.to).toContain(entry.to)
        }
      }
    })

    it('put back the comma the export drops from the list of WHST.6-8.9, under a reason of its own', () => {
      expect(EXPORT_CORRECTION_REASONS).toContain('comma missing in the export')
      expect((US_CA_EXPORT_CORRECTIONS[ELA]!['WHST.6-8.9'] ?? []).map((entry) => entry.reason)).toEqual(['comma missing in the export'])
    })
  })

  it('imports only the lane asked for', () => {
    seed(MATH, csv(MATH_HEADER, KINDER_MATH))
    const lanes = [lane('kindergarten', 'mathematics', MATH, byGrade('K'), 2), lane('grade-1', 'mathematics', MATH, byGrade('1'), 1)]

    const imports = importCalifornia(education, store, lanes, 'grade-1/mathematics')

    expect(imports.map((lane) => lane.lane)).toEqual(['corpus/us-ca/grade-1/mathematics'])
    expect(readdirSync(join(education, 'corpus/us-ca'))).toEqual(['grade-1'])
    expect(() => importCalifornia(education, store, lanes, 'grade-9/mathematics')).toThrow('grade-9/mathematics')
  })
})
