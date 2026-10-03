import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Batch, Lane } from '../manifest.ts'
import { NL_SOURCE, NL_WORDING, caObjective, caSource, nlObjective, nlSource } from './fixtures.ts'
import { batchMismatches, batchOf, laneText, parseArgs, readLane } from './lane-text.ts'
import { normaliseCode, wordingHash } from './normalise.ts'
import { draftObjective } from './record.ts'
import { SAME_FILE, accompanyingLine, objectiveId, pathForId } from './schema.ts'
import type { ObjectiveFrontmatter } from './schema.ts'
import { putWording } from './store.ts'

// Every wording, footnote, document and domain here is invented. No official
// text belongs in a test.

const DOCUMENT = 'Example Health Standards for Example Schools'
const SAFETY = 'Injury, Prevention, and Safety'
const FOOD = 'Nutrition and Physical Activity'
const GROWTH = 'Growth and Development'
const FOOTNOTE = 'Invented footnote: pears only, plums wait for a later year.\nSo do quinces.'

let education: string
let store: string

beforeEach(() => {
  education = mkdtempSync(join(tmpdir(), 'education-lane-text-'))
  store = mkdtempSync(join(tmpdir(), 'education-lane-text-store-'))
})

afterEach(() => {
  rmSync(education, { recursive: true, force: true })
  rmSync(store, { recursive: true, force: true })
})

function lane(more: Partial<Lane> = {}): Lane {
  return {
    jurisdiction: 'us-ca',
    level: 'kindergarten',
    subject: 'practical-life-feelings',
    title: 'Kindergarten practical life and feelings',
    sources: [caSource.id],
    parts: [{ name: 'Fixture rows', source: caSource.id, checkRendition: SAME_FILE, checkStrength: 'second-reading', checkGranularity: 'The same rows.', expectedCount: 4, selection: { kind: 'statements', locate: 'By its number.', statements: [] } }],
    expectedCount: 4,
    countingMethod: 'Rows of the fixture.',
    countIsFromImportFile: true,
    domains: [],
    granularity: 'One record is one row.',
    skipped: [],
    ...more,
  }
}

const BATCHES: readonly Batch[] = [
  { name: 'safety-growth', values: [SAFETY, GROWTH], size: 3 },
  { name: 'food', values: [FOOD], size: 1 },
]
const BATCHED = lane({ batchKey: 'Content Area#2', batches: BATCHES })

function wordingOf(code: string): string {
  return `Invented official wording of ${code}, which says nothing real.`
}

interface Sample {
  code: string
  domain: string
  // Closes the code scope of a row that holds for a band of grades.
  band?: string
  supplement?: string
  // False to leave the wording out of the store.
  stored?: boolean
}

// Writes a description-only record of the lane and puts its wording in the store.
function seed(of: Lane, sample: Sample): ObjectiveFrontmatter {
  const slug = normaliseCode(sample.code).toLowerCase().replaceAll('.', '-')
  const frontmatter: ObjectiveFrontmatter = {
    ...caObjective,
    id: objectiveId(of.jurisdiction, of.level, of.subject, slug),
    title: `${sample.code}, ${sample.domain}`,
    level: of.level,
    subject: of.subject,
    code: sample.code,
    code_key: normaliseCode(sample.code),
    code_scope: `${DOCUMENT}, ${sample.domain}${sample.band ? `, grades ${sample.band}` : ''}`,
    wording_sha256: wordingHash(wordingOf(sample.code)),
    ...(sample.supplement ? { supplement_sha256: wordingHash(sample.supplement) } : {}),
  }
  if (sample.stored !== false) putWording(store, wordingOf(sample.code))
  if (sample.supplement) putWording(store, sample.supplement)
  write(pathForId(frontmatter.id)!, draftObjective(frontmatter))
  return frontmatter
}

function write(file: string, text: string): void {
  mkdirSync(dirname(join(education, file)), { recursive: true })
  writeFileSync(join(education, file), text)
}

const FOUR: readonly Sample[] = [
  { code: 'K.1.10.S', domain: SAFETY },
  { code: 'K.1.2.S', domain: SAFETY, supplement: FOOTNOTE },
  { code: 'K.1.1.G', domain: GROWTH },
  { code: 'K.1.1.N', domain: FOOD },
]

// Every file under a folder, with its text.
function snapshot(root: string): Record<string, string> {
  const files: Record<string, string> = {}
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) files[join(entry.parentPath, entry.name)] = readFileSync(join(entry.parentPath, entry.name), 'utf8')
  }
  return files
}

describe('the text of a lane', () => {
  it('prints every record with its id, file, code, scope, title and standing, then its official wording out of the store, in a stable order', () => {
    for (const sample of FOUR) seed(lane(), sample)

    const text = laneText(readLane(education, lane()), lane(), { store })

    expect(text.split('\n')[0]).toBe(
      '# us-ca/kindergarten/practical-life-feelings: 4 records (the manifest expects 4). What is printed below is official wording: read it, and copy none of it into any file.',
    )
    expect(text).toContain(
      [
        '===== record 2 of 4: edu.us-ca.kindergarten.practical-life-feelings.objective.k-1-2-s',
        'file: education/corpus/us-ca/kindergarten/practical-life-feelings/objectives/k-1-2-s.md',
        'code: K.1.2.S',
        `code scope: ${DOCUMENT}, ${SAFETY}`,
        `title: K.1.2.S, ${SAFETY}`,
        'standing: state-board-adopted-standard',
        '----- official wording',
        wordingOf('K.1.2.S'),
        '----- accompanying official text',
        FOOTNOTE,
        '===== end of record 2',
      ].join('\n'),
    )
    // By scope, so a domain stays together, then by code with its numbers read as numbers.
    expect([...text.matchAll(/^code: (.+)$/gm)].map((match) => match[1])).toEqual(['K.1.1.G', 'K.1.2.S', 'K.1.10.S', 'K.1.1.N'])
    expect(text.match(/accompanying official text/g)).toHaveLength(1)
  })

  it('prints only the records of the batch asked for, and refuses a batch the lane does not have', () => {
    for (const sample of FOUR) seed(BATCHED, sample)
    const records = readLane(education, BATCHED)

    const text = laneText(records, BATCHED, { store, batch: 'safety-growth' })

    expect(text.split('\n')[0]).toContain('# us-ca/kindergarten/practical-life-feelings, batch safety-growth: 3 records (the manifest expects 3).')
    expect([...text.matchAll(/^code: (.+)$/gm)].map((match) => match[1])).toEqual(['K.1.1.G', 'K.1.2.S', 'K.1.10.S'])
    expect([...laneText(records, BATCHED, { store, batch: 'food' }).matchAll(/^code: (.+)$/gm)].map((match) => match[1])).toEqual(['K.1.1.N'])
    expect(() => laneText(records, BATCHED, { store, batch: 'drinks' })).toThrow('safety-growth, food')
  })

  it('with ids only, prints each id and file path and nothing else, and needs no store', () => {
    for (const sample of FOUR) seed(BATCHED, sample)
    rmSync(store, { recursive: true, force: true })

    const text = laneText(readLane(education, BATCHED), BATCHED, { store, batch: 'food', ids: true })

    expect(text).toBe('edu.us-ca.kindergarten.practical-life-feelings.objective.k-1-1-n\teducation/corpus/us-ca/kindergarten/practical-life-feelings/objectives/k-1-1-n.md')
  })

  it('prints the wording a verbatim record holds in its file, without its source line, and needs no store for it', () => {
    const dutch = lane({ jurisdiction: 'nl', level: 'fase-1', subject: 'mathematics', sources: [nlSource.id], expectedCount: 1 })
    write(pathForId(nlObjective.id)!, draftObjective(nlObjective, { wording: NL_WORDING, source: NL_SOURCE }))
    rmSync(store, { recursive: true, force: true })

    const text = laneText(readLane(education, dutch), dutch, { store })

    expect(text).toContain(`----- official wording\n${NL_WORDING}\n===== end of record 1`)
    expect(text).not.toContain(NL_SOURCE)
    expect(text).toContain('code: 1\n')
  })

  it('prints the accompanying text a verbatim record holds in its file, with the line that says what it is, and needs no store for it', () => {
    const dutch = lane({ jurisdiction: 'nl', level: 'fase-1', subject: 'mathematics', sources: [nlSource.id], expectedCount: 1 })
    const example = '(bijv. drie appels en nog twee)'
    write(
      pathForId(nlObjective.id)!,
      draftObjective({ ...nlObjective, supplement_sha256: wordingHash(example) }, { wording: NL_WORDING, source: NL_SOURCE, accompanying: { note: 'the example printed under this goal', text: example } }),
    )
    rmSync(store, { recursive: true, force: true })

    const text = laneText(readLane(education, dutch), dutch, { store })

    expect(text).toContain(`----- official wording\n${NL_WORDING}\n----- accompanying official text: ${accompanyingLine('the example printed under this goal')}\n${example}\n===== end of record 1`)
    expect(text).not.toContain(NL_SOURCE)
  })

  it('stops at a record whose wording the store lacks, and names it', () => {
    for (const sample of FOUR) seed(lane(), { ...sample, stored: sample.code !== 'K.1.1.N' })

    expect(() => laneText(readLane(education, lane()), lane(), { store })).toThrow('edu.us-ca.kindergarten.practical-life-feelings.objective.k-1-1-n')
  })

  it('writes nothing under the education folder', () => {
    for (const sample of FOUR) seed(BATCHED, sample)
    const before = snapshot(education)

    laneText(readLane(education, BATCHED), BATCHED, { store, batch: 'safety-growth' })
    laneText(readLane(education, BATCHED), BATCHED, { store, ids: true })

    expect(snapshot(education)).toEqual(before)
  })

  it('reads no record of a lane that has none yet', () => {
    expect(readLane(education, lane())).toEqual([])
  })
})

describe('the batch of a record', () => {
  it('is the batch that lists the domain its code scope ends in, commas and all, with or without a band of grades after it', () => {
    const scope = (domain: string, band?: string) => ({ id: 'edu.us-ca.kindergarten.practical-life-feelings.objective.x', code_scope: `${DOCUMENT}, ${domain}${band ? `, grades ${band}` : ''}` })

    expect(batchOf(scope(SAFETY), BATCHED).name).toBe('safety-growth')
    expect(batchOf(scope(GROWTH), BATCHED).name).toBe('safety-growth')
    expect(batchOf(scope(FOOD), BATCHED).name).toBe('food')
    expect(batchOf(scope(FOOD, '6-8'), BATCHED).name).toBe('food')
  })

  it('is the batch that lists the group of a statement, in a lane batched by group', () => {
    const byGroup = lane({ batchKey: 'group', batches: [{ name: 'early', values: ['Early Elementary'], size: 1 }, { name: 'late', values: ['Late Elementary'], size: 1 }] })

    expect(batchOf({ id: 'x', code_scope: 'Example Competencies, Late Elementary' }, byGroup).name).toBe('late')
  })

  it('is the whole lane when the lane is not split', () => {
    expect(batchOf({ id: 'x', code_scope: `${DOCUMENT}, ${SAFETY}` }, lane())).toEqual({ name: 'all', values: [], size: 4 })
  })

  it('is an error that names the record when it fits no batch, or more than one', () => {
    const id = 'edu.us-ca.kindergarten.practical-life-feelings.objective.k-1-1-m'
    expect(() => batchOf({ id, code_scope: `${DOCUMENT}, Mental Health` }, BATCHED)).toThrow(`${id} fits no batch`)

    const overlapping = lane({ batchKey: 'Content Area#2', batches: [BATCHES[0]!, { name: 'safety-alone', values: ['and Safety'], size: 1 }] })
    expect(() => batchOf({ id, code_scope: `${DOCUMENT}, ${SAFETY}` }, overlapping)).toThrow(`${id} fits more than one batch: safety-growth, safety-alone`)
  })
})

describe('the batches of a lane on disk', () => {
  it('hold every record once, in the sizes the manifest gives', () => {
    for (const sample of FOUR) seed(BATCHED, sample)

    expect(batchMismatches(readLane(education, BATCHED), BATCHED)).toEqual([])
  })

  it('differ from the manifest when a batch has another size, or a record fits none', () => {
    for (const sample of [...FOUR, { code: 'K.1.3.N', domain: FOOD }, { code: 'K.1.1.M', domain: 'Mental Health' }]) seed(BATCHED, sample)

    expect(batchMismatches(readLane(education, BATCHED), BATCHED)).toEqual([
      'edu.us-ca.kindergarten.practical-life-feelings.objective.k-1-1-m fits no batch of us-ca/kindergarten/practical-life-feelings: its code scope ends in none of their values',
      'batch food of us-ca/kindergarten/practical-life-feelings holds 2 record(s) and the manifest says 1',
    ])
  })
})

describe('the command line', () => {
  it('reads a lane, a batch and the ids flag', () => {
    expect(parseArgs(['--lane', 'us-ca/grade-4/practical-life-feelings', '--batch', 'safety', '--ids'])).toEqual({
      jurisdiction: 'us-ca',
      level: 'grade-4',
      subject: 'practical-life-feelings',
      batch: 'safety',
      ids: true,
    })
    expect(parseArgs(['--lane', 'nl/fase-1/mathematics'])).toEqual({ jurisdiction: 'nl', level: 'fase-1', subject: 'mathematics', ids: false })
  })

  it('refuses a lane it cannot read as jurisdiction, level and subject, and an option it does not know', () => {
    expect(parseArgs([])).toHaveProperty('error')
    expect(parseArgs(['--lane', 'kindergarten/mathematics'])).toHaveProperty('error')
    expect(parseArgs(['--lane', 'mars/grade-4/mathematics'])).toHaveProperty('error')
    expect(parseArgs(['--lane', 'us-ca/grade-4/mathematics', '--wording'])).toHaveProperty('error')
  })
})
