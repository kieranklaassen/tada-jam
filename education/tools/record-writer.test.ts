import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NL_SOURCE, NL_WORDING, caObjective, caSource, nlObjective, nlSource } from './fixtures.ts'
import { normaliseCode, wordingHash } from './normalise.ts'
import { composeRecord, parseRecord, replaceRegion, withMarker } from './record.ts'
import { checkCount, writeObjective } from './record-writer.ts'
import type { ObjectiveFields } from './record-writer.ts'
import { DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS, ENGLISH_GLOSS, OFFICIAL_WORDING, SUMMARY, accompanyingLine, objectiveId, pathForId } from './schema.ts'
import { getWording } from './store.ts'
import { validateRecords } from './validate.ts'

// Every wording here is invented. No official wording belongs in a test.

const LANE = 'corpus/us-ca/kindergarten/mathematics'
const CA_SOURCE_LINE = 'Example Department, Example Counting Standards (2013 edition).'

let education: string
let store: string

beforeEach(() => {
  education = mkdtempSync(join(tmpdir(), 'education-writer-'))
  store = mkdtempSync(join(tmpdir(), 'education-writer-store-'))
})

afterEach(() => {
  rmSync(education, { recursive: true, force: true })
  rmSync(store, { recursive: true, force: true })
})

function without<T extends { wording_sha256: string }>(frontmatter: T): Omit<T, 'wording_sha256'> {
  const { wording_sha256: _hash, ...rest } = frontmatter
  return rest
}

function ca(code: string): ObjectiveFields {
  const slug = normaliseCode(code).toLowerCase().replaceAll('.', '-')
  return { ...without(caObjective), id: objectiveId('us-ca', 'kindergarten', 'mathematics', slug), code, code_key: normaliseCode(code), locator: `row ${code}` }
}

const nl: ObjectiveFields = without(nlObjective)

function read(file: string): string {
  return readFileSync(join(education, file), 'utf8')
}

function section(text: string, heading: string): string {
  const found = parseRecord(text).sections.find((candidate) => candidate.heading === heading)
  if (!found) throw new Error(`no section ${heading}`)
  return found.heading + found.text
}

const NOTES = withMarker(
  DESIGN_NOTES,
  [
    DESIGN_NOTES_SUBHEADINGS[0],
    'A child moves apples one at a time and says a number for each.',
    DESIGN_NOTES_SUBHEADINGS[1],
    'Numbers to ten only.',
    DESIGN_NOTES_SUBHEADINGS[2],
    'Saying two numbers for one apple.',
  ].join('\n\n'),
)

describe('writing objectives', () => {
  it('writes three objectives as three files with the printed codes, each at the path of its id', () => {
    const rows = [
      { code: 'K.CC.1', wording: 'Count the pears on a plate up to ten.' },
      { code: 'K.CC.2', wording: 'Count on from a number someone else picks.' },
      { code: 'K.CC.4a', wording: 'Say one number for each pear touched.' },
    ]
    const results = rows.map((row) => writeObjective(education, store, { frontmatter: ca(row.code), wording: row.wording, source: CA_SOURCE_LINE }))

    expect(results).toEqual([
      { file: `${LANE}/objectives/k-cc-1.md`, status: 'created' },
      { file: `${LANE}/objectives/k-cc-2.md`, status: 'created' },
      { file: `${LANE}/objectives/k-cc-4-a.md`, status: 'created' },
    ])
    expect(results.map((result) => parseRecord(read(result.file)).frontmatter.code)).toEqual(['K.CC.1', 'K.CC.2', 'K.CC.4a'])
    const tree = [
      { file: pathForId(caSource.id)!, text: composeRecord(caSource, 'An invented file.') },
      ...results.map((result) => ({ file: result.file, text: read(result.file) })),
    ]
    expect(validateRecords(tree)).toEqual([])
  })

  it('writes a verbatim record with its official wording and source line, and a record the validator accepts', () => {
    const result = writeObjective(education, store, { frontmatter: nl, wording: NL_WORDING, source: NL_SOURCE })

    expect(result).toEqual({ file: pathForId(nlObjective.id)!, status: 'created' })
    const text = read(result.file)
    expect(section(text, OFFICIAL_WORDING)).toBe(`${OFFICIAL_WORDING}\n\n${NL_WORDING}\n\nSource: ${NL_SOURCE}\n\n`)
    expect(validateRecords([{ file: pathForId(nlSource.id)!, text: composeRecord(nlSource, 'Een verzonnen bestand.') }, { file: result.file, text }])).toEqual([])
  })

  it('leaves every file byte-identical on a second run, reports it unchanged and writes nothing', () => {
    const inputs = [
      { frontmatter: ca('K.CC.1'), wording: 'Count the pears on a plate up to ten.', source: CA_SOURCE_LINE },
      { frontmatter: nl, wording: NL_WORDING, source: NL_SOURCE },
    ]
    const first = inputs.map((input) => writeObjective(education, store, input))
    const before = first.map((result) => read(result.file))
    // A file that cannot be written to: a second write would throw.
    for (const result of first) chmodSync(join(education, result.file), 0o444)

    const second = inputs.map((input) => writeObjective(education, store, input))

    expect(second.map((result) => result.status)).toEqual(['unchanged', 'unchanged'])
    expect(second.map((result) => read(result.file))).toEqual(before)
  })

  it('updates the official wording and the hash of a verbatim record and leaves the filled agent regions byte-identical', () => {
    const { file } = writeObjective(education, store, { frontmatter: nl, wording: NL_WORDING, source: NL_SOURCE })
    const glossed = replaceRegion(read(file), ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples in a basket, up to and including ten.'))
    const filled = replaceRegion(glossed, DESIGN_NOTES, NOTES)
    writeFileSync(join(education, file), filled)

    const changed = 'Tel de peren in een mand, tot en met twaalf.'
    const result = writeObjective(education, store, { frontmatter: nl, wording: changed, source: NL_SOURCE })

    expect(result.status).toBe('updated')
    const text = read(file)
    expect(section(text, ENGLISH_GLOSS)).toBe(section(filled, ENGLISH_GLOSS))
    expect(section(text, DESIGN_NOTES)).toBe(section(filled, DESIGN_NOTES))
    expect(section(text, OFFICIAL_WORDING)).toBe(`${OFFICIAL_WORDING}\n\n${changed}\n\nSource: ${NL_SOURCE}\n\n`)
    expect(parseRecord(text).frontmatter.wording_sha256).toBe(wordingHash(changed))
    expect(writeObjective(education, store, { frontmatter: nl, wording: changed, source: NL_SOURCE }).status).toBe('unchanged')
  })

  it('updates only the frontmatter of a description-only record and leaves its body byte-identical', () => {
    const fields = ca('K.CC.1')
    const { file } = writeObjective(education, store, { frontmatter: fields, wording: 'Count the pears on a plate up to ten.', source: CA_SOURCE_LINE })
    const summarised = replaceRegion(read(file), SUMMARY, withMarker(SUMMARY, 'Says how many pears there are, as far as ten.'))
    const filled = replaceRegion(summarised, DESIGN_NOTES, NOTES)
    writeFileSync(join(education, file), filled)

    const changed = 'Count the plums on a plate up to twelve.'
    const result = writeObjective(education, store, { frontmatter: { ...fields, locator: 'row 12' }, wording: changed, source: CA_SOURCE_LINE })

    expect(result.status).toBe('updated')
    const before = parseRecord(filled)
    const after = parseRecord(read(file))
    expect(after.preface).toBe(before.preface)
    expect(after.sections).toEqual(before.sections)
    expect(after.frontmatter.wording_sha256).toBe(wordingHash(changed))
    expect(after.frontmatter.locator).toBe('row 12')
    expect(read(file)).not.toContain('plums')
  })

  it('keeps the wording of a description-only record out of the file and in the store, under the hash in its frontmatter', () => {
    const wording = 'Count the pears on a plate up to ten.'
    const { file } = writeObjective(education, store, { frontmatter: ca('K.CC.1'), wording, source: CA_SOURCE_LINE })

    const text = read(file)
    expect(text).not.toContain('pears')
    expect(text).not.toContain(OFFICIAL_WORDING)
    expect(text).not.toContain(CA_SOURCE_LINE)
    const hash = parseRecord(text).frontmatter.wording_sha256
    expect(hash).toBe(wordingHash(wording))
    expect(getWording(store, hash as string)).toBe(wording)
  })

  it('puts the wording of a verbatim record in the store too', () => {
    writeObjective(education, store, { frontmatter: nl, wording: NL_WORDING, source: NL_SOURCE })

    expect(getWording(store, wordingHash(NL_WORDING))).toBe(NL_WORDING)
  })

  it('keeps the text that accompanies a statement in the store, and only its hash in the file, right after the wording hash', () => {
    const wording = 'Count the pears on a plate up to ten.'
    const supplement = 'Plates of more than ten pears are left for a later year.'
    const { file } = writeObjective(education, store, { frontmatter: ca('K.CC.1'), wording, supplement, source: CA_SOURCE_LINE })

    const text = read(file)
    expect(text).not.toContain('later year')
    const { frontmatter } = parseRecord(text)
    expect(Object.keys(frontmatter).slice(-2)).toEqual(['wording_sha256', 'supplement_sha256'])
    expect(frontmatter).toMatchObject({ wording_sha256: wordingHash(wording), supplement_sha256: wordingHash(supplement) })
    expect(getWording(store, wordingHash(supplement))).toBe(supplement)
    expect(getWording(store, wordingHash(wording))).toBe(wording)
    expect(validateRecords([{ file: pathForId(caSource.id)!, text: composeRecord(caSource, 'An invented file.') }, { file, text }])).toEqual([])
  })

  it('writes the accompanying text of a verbatim record into its file too: after the wording, under the line that says what it is, before the source line', () => {
    const supplement = '(bijv. drie appels en nog twee)'
    const note = 'the example printed under this goal in the example file, page 1'
    const { file } = writeObjective(education, store, { frontmatter: nl, wording: NL_WORDING, supplement, supplementNote: note, source: NL_SOURCE })

    const text = read(file)
    expect(section(text, OFFICIAL_WORDING)).toBe(`${OFFICIAL_WORDING}\n\n${NL_WORDING}\n\n${accompanyingLine(note)}\n${supplement}\n\nSource: ${NL_SOURCE}\n\n`)
    expect(parseRecord(text).frontmatter).toMatchObject({ wording_sha256: wordingHash(NL_WORDING), supplement_sha256: wordingHash(supplement) })
    expect(getWording(store, wordingHash(supplement))).toBe(supplement)
    expect(validateRecords([{ file: pathForId(nlSource.id)!, text: composeRecord(nlSource, 'An invented file.') }, { file, text }])).toEqual([])
  })

  it('adds accompanying text to a verbatim record that exists without changing its wording hash or what a lane agent wrote, and takes it out again', () => {
    const input = { frontmatter: nl, wording: NL_WORDING, source: NL_SOURCE }
    const { file } = writeObjective(education, store, input)
    const filled = replaceRegion(replaceRegion(read(file), ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples in a basket, up to ten.')), DESIGN_NOTES, NOTES)
    writeFileSync(join(education, file), filled)
    const more = { ...input, supplement: '(bijv. drie appels)', supplementNote: 'the example printed under this goal' }

    expect(writeObjective(education, store, more).status).toBe('updated')
    const added = read(file)
    expect(parseRecord(added).frontmatter.wording_sha256).toBe(parseRecord(filled).frontmatter.wording_sha256)
    expect(section(added, ENGLISH_GLOSS)).toBe(section(filled, ENGLISH_GLOSS))
    expect(section(added, DESIGN_NOTES)).toBe(section(filled, DESIGN_NOTES))
    expect(section(added, OFFICIAL_WORDING)).toContain('(bijv. drie appels)')
    expect(writeObjective(education, store, more).status).toBe('unchanged')

    expect(writeObjective(education, store, input).status).toBe('updated')
    expect(read(file)).toBe(filled)
  })

  it('refuses accompanying text for a verbatim record without a note of what it is, and writes nothing', () => {
    expect(() => writeObjective(education, store, { frontmatter: nl, wording: NL_WORDING, supplement: '(bijv. drie appels)', source: NL_SOURCE })).toThrow(/needs a note/)
    expect(existsSync(join(education, 'corpus'))).toBe(false)
  })

  it('writes no supplement hash for a statement with no accompanying text, or with only blank text', () => {
    const none = writeObjective(education, store, { frontmatter: ca('K.CC.1'), wording: 'Count the pears on a plate up to ten.', source: CA_SOURCE_LINE })
    const blank = writeObjective(education, store, { frontmatter: ca('K.CC.2'), wording: 'Count on from a number someone else picks.', supplement: ' \n', source: CA_SOURCE_LINE })

    expect(read(none.file)).not.toContain('supplement_sha256')
    expect(read(blank.file)).not.toContain('supplement_sha256')
  })

  it('adds the supplement hash to a record that exists and leaves its body byte-identical, changes nothing on the next run, and takes the hash away when the text is gone', () => {
    const input = { frontmatter: ca('K.CC.1'), wording: 'Count the pears on a plate up to ten.', source: CA_SOURCE_LINE }
    const supplement = 'Plates of more than ten pears are left for a later year.'
    const { file } = writeObjective(education, store, input)
    const filled = replaceRegion(replaceRegion(read(file), SUMMARY, withMarker(SUMMARY, 'Says how many pears there are, as far as ten.')), DESIGN_NOTES, NOTES)
    writeFileSync(join(education, file), filled)

    expect(writeObjective(education, store, { ...input, supplement }).status).toBe('updated')
    const added = parseRecord(read(file))
    expect(added.frontmatter.supplement_sha256).toBe(wordingHash(supplement))
    expect(added.frontmatter.wording_sha256).toBe(parseRecord(filled).frontmatter.wording_sha256)
    expect(read(file).slice(added.frontmatterText.length)).toBe(filled.slice(parseRecord(filled).frontmatterText.length))
    expect(writeObjective(education, store, { ...input, supplement }).status).toBe('unchanged')

    expect(writeObjective(education, store, input).status).toBe('updated')
    expect(read(file)).toBe(filled)
  })

  it('refuses an id that names no objective record, and writes nothing', () => {
    expect(() => writeObjective(education, store, { frontmatter: { ...ca('K.CC.1'), id: caSource.id }, wording: 'Count the pears.', source: CA_SOURCE_LINE })).toThrow(caSource.id)
    expect(existsSync(join(education, 'sources'))).toBe(false)
  })
})

describe('the count of a lane', () => {
  const files = [`${LANE}/objectives/k-cc-1.md`, `${LANE}/objectives/k-cc-2.md`]

  it('is a finding with both numbers when the lane holds another number of objective files than expected', () => {
    const finding = checkCount(LANE, files, 3)

    expect(finding).toMatchObject({ file: `${LANE}/frame.md`, rule: 'lane-count' })
    expect(finding!.message).toContain('2 objective file(s)')
    expect(finding!.message).toContain('expected 3')
    expect(checkCount(LANE, [], 3)!.message).toContain('0 objective file(s)')
  })

  it('is no finding when the numbers are equal', () => {
    expect(checkCount(LANE, files, 2)).toBeNull()
  })

  it('counts a file written twice once', () => {
    expect(checkCount(LANE, [...files, files[0]!], 3)!.message).toContain('2 objective file(s)')
  })
})
