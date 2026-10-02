import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Lane, LanePart } from '../manifest.ts'
import { COVERAGE_FILE, DUTCH_KINDS, coverageIsFresh, renderCoverage, writeCoverage } from './coverage.ts'
import { CA_FILE, NL_FILE, caObjective, caSource, nlObjective, nlSource, sampleTree } from './fixtures.ts'
import { draftObjective, parseRecord, replaceRegion, withMarker } from './record.ts'
import { recordHashes, reviewPath, serialiseReview } from './review.ts'
import type { Unrecorded, Verdict } from './review.ts'
import { DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS, ENGLISH_GLOSS, NO_SUMMARY, SAME_FILE, STANDINGS, SUMMARY, pathForId } from './schema.ts'

const CA_LANE = 'us-ca/kindergarten/mathematics'
const NL_LANE = 'nl/fase-1/mathematics'
const NOTHING = 'The example institute sets no goals for this subject at the end of primary school.'

function part(name: string, source: string, checkStrength: LanePart['checkStrength']): LanePart {
  return {
    name,
    source,
    checkRendition: checkStrength === 'second-reading' ? SAME_FILE : source,
    checkStrength,
    checkGranularity: 'The same statements.',
    expectedCount: 1,
    selection: { kind: 'statements', locate: 'By its number.', statements: [] },
  }
}

function lane(key: string, sources: string[], parts: LanePart[], over: Partial<Lane> = {}): Lane {
  const [jurisdiction, level, subject] = key.split('/') as [Lane['jurisdiction'], string, Lane['subject']]
  return {
    jurisdiction,
    level,
    subject,
    title: `${level} ${subject}`,
    sources,
    parts,
    expectedCount: parts.length,
    countingMethod: 'Counted in the example file.',
    countIsFromImportFile: false,
    domains: [],
    granularity: 'One record per statement.',
    skipped: [],
    ...over,
  }
}

const manifest = [
  lane(CA_LANE, [caSource.id], [part('Counting rows', caSource.id, 'second-rendition'), part('Practice statements', caSource.id, 'second-reading')]),
  lane(NL_LANE, [nlSource.id], [part('Number goals', nlSource.id, 'second-rendition')]),
  lane('nl/einde-po/practical-life-feelings', [], [], { nothingPublished: NOTHING }),
]

const NOTES = withMarker(DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS.map((heading) => `${heading}\n\nA child moves apples one at a time.`).join('\n\n'))

// The sample tree with every agent region written.
function writtenTree(): Record<string, string> {
  const tree = sampleTree()
  const ca = replaceRegion(tree[CA_FILE]!, SUMMARY, withMarker(SUMMARY, 'Says how many apples there are, as far as ten.'))
  const nl = replaceRegion(tree[NL_FILE]!, ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples, up to and including ten.'))
  return { ...tree, [CA_FILE]: replaceRegion(ca, DESIGN_NOTES, NOTES), [NL_FILE]: replaceRegion(nl, DESIGN_NOTES, NOTES) }
}

function verdict(recordText: string, over: Partial<Verdict> = {}): Verdict {
  return { ...recordHashes(parseRecord(recordText)), verdict: 'confirmed', rendition: SAME_FILE, place: { page: 3 }, matched_by: 'script', checker: 'batch-all', round: 1, ...over }
}

function reviewOf(laneKey: string, verdicts: Verdict[], unrecorded: Unrecorded[] = []): Record<string, string> {
  return { [reviewPath(laneKey)]: serialiseReview({ lane: laneKey, verdicts, unrecorded }) }
}

function plant(tree: Record<string, string>, root = mkdtempSync(join(tmpdir(), 'education-coverage-'))): string {
  for (const [path, text] of Object.entries(tree)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return root
}

function report(tree: Record<string, string>): string {
  return renderCoverage(plant(tree), { manifest })
}

function tableRows(markdown: string): string[][] {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('| '))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
}

// The cells of the row that opens with these cells, by the column headings of the table that opens with `heading`.
function cellsOf(markdown: string, heading: string, ...first: string[]): Record<string, string> {
  const rows = tableRows(markdown)
  const head = rows.find((cells) => cells[0] === heading)
  const found = rows.find((cells) => cells.length === head?.length && first.every((cell, index) => cells[index] === cell))
  if (!head || !found) throw new Error(`no row for ${first.join(' ')}`)
  return Object.fromEntries(head.map((name, index) => [name, found[index]!]))
}

// The cells of a lane's row, by column heading.
function row(markdown: string, level: string, subject: string): Record<string, string> {
  return cellsOf(markdown, 'Level', level, subject)
}

describe('the coverage report', () => {
  const tree = writtenTree()
  const DIFFERENCE = 'The rendition says twenty where the record says ten.'
  const failing = verdict(tree[CA_FILE]!, { verdict: 'unconfirmed', reason: 'wording-differs', note: DIFFERENCE })

  it('counts an unconfirmed record under unconfirmed for its lane, and lists it by reason without its note', () => {
    const markdown = report({ ...tree, ...reviewOf(CA_LANE, [failing]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) })
    expect(row(markdown, 'kindergarten', 'mathematics')).toMatchObject({ Records: '1 / 2', Confirmed: '0', Unconfirmed: '1', Stale: '0', Unchecked: '0' })
    expect(row(markdown, 'fase-1', 'mathematics')).toMatchObject({ Records: '1 / 1', Confirmed: '1', Unconfirmed: '0' })
    expect(markdown).toContain(`- \`${caObjective.id}\`: wording-differs`)
    expect(markdown).not.toContain(nlObjective.id)
    expect(markdown).not.toContain(DIFFERENCE)
  })

  it('has one table per jurisdiction, and says so when none of its records is unconfirmed', () => {
    const markdown = report(tree)
    expect(markdown.indexOf('## California (us-ca)')).toBeGreaterThan(0)
    expect(markdown.indexOf('## The Netherlands (nl)')).toBeGreaterThan(markdown.indexOf('## California (us-ca)'))
    expect(markdown.match(/^No record is unconfirmed\.$/gm)).toHaveLength(2)
  })

  it('counts a record with no verdict as unchecked, and one whose text changed as stale', () => {
    const reglossed = replaceRegion(tree[NL_FILE]!, ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples, to ten at most.'))
    const markdown = report({ ...tree, [NL_FILE]: reglossed, ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) })
    expect(row(markdown, 'kindergarten', 'mathematics')).toMatchObject({ Confirmed: '0', Unchecked: '1' })
    expect(row(markdown, 'fase-1', 'mathematics')).toMatchObject({ Confirmed: '0', Stale: '1', Unchecked: '0' })
  })

  it('shows a lane where nothing is published, with that statement and no records', () => {
    const cells = row(report(tree), 'einde-po', 'practical-life-feelings')
    expect(cells).toMatchObject({ Records: '0 / 0', Confirmed: '0', Unconfirmed: '0', Stale: '0', Unchecked: '0' })
    expect(cells.Sources).toBe(`Nothing published: ${NOTHING}`)
  })

  it('shows the check strength of each part of a lane', () => {
    const markdown = report(tree)
    expect(row(markdown, 'kindergarten', 'mathematics').Check).toBe('Counting rows: second rendition<br>Practice statements: second reading')
    expect(row(markdown, 'fase-1', 'mathematics').Check).toBe('second rendition')
  })

  it('shows the sources of a lane with the version each source record states', () => {
    const markdown = report(tree)
    expect(row(markdown, 'kindergarten', 'mathematics').Sources).toBe(`example-counting-standards (${caSource.version})`)
    expect(row(markdown, 'fase-1', 'mathematics').Sources).toBe(`voorbeeld-rekendoelen (${nlSource.version})`)
  })

  it('counts the description-only records that carry the no-summary sentence', () => {
    const markdown = report({ ...tree, [CA_FILE]: replaceRegion(tree[CA_FILE]!, SUMMARY, withMarker(SUMMARY, NO_SUMMARY)) })
    expect(row(markdown, 'kindergarten', 'mathematics')['No summary']).toBe('1')
    expect(row(report(tree), 'kindergarten', 'mathematics')['No summary']).toBe('0')
    // A lane of verbatim records holds no summaries to count.
    expect(row(markdown, 'fase-1', 'mathematics')['No summary']).toBe('-')
  })

  it('gives the totals per jurisdiction and for the pack: lanes, records against the expected number, and each check state', () => {
    const markdown = report({ ...tree, ...reviewOf(CA_LANE, [failing]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) })
    expect(markdown.indexOf('## Totals')).toBeLessThan(markdown.indexOf('## California (us-ca)'))
    expect(cellsOf(markdown, 'Jurisdiction', 'California (us-ca)')).toEqual({ Jurisdiction: 'California (us-ca)', Lanes: '1', Records: '1 / 2', Confirmed: '0', Unconfirmed: '1', Stale: '0', Unchecked: '0' })
    expect(cellsOf(markdown, 'Jurisdiction', 'The Netherlands (nl)')).toMatchObject({ Lanes: '2', Records: '1 / 1', Confirmed: '1', Unconfirmed: '0' })
    expect(cellsOf(markdown, 'Jurisdiction', 'Both')).toMatchObject({ Lanes: '3', Records: '2 / 3', Confirmed: '1', Unconfirmed: '1', Stale: '0', Unchecked: '0' })
  })

  it('counts the unconfirmed records of a jurisdiction by reason', () => {
    const second = { ...caObjective, id: caObjective.id.replace(/k-cc-1$/, 'k-cc-2'), code: 'K.CC.2', code_key: 'K.CC.2' }
    const file = CA_FILE.replace('k-cc-1', 'k-cc-2')
    const other = replaceRegion(replaceRegion(draftObjective(second), SUMMARY, withMarker(SUMMARY, 'Says how many pears there are.')), DESIGN_NOTES, NOTES)
    const markdown = report({
      ...tree,
      [file]: other,
      ...reviewOf(CA_LANE, [failing, verdict(other, { verdict: 'unconfirmed', reason: 'notes-contradict' })]),
    })
    expect(markdown).toContain('2 unconfirmed, by reason: wording-differs 1, notes-contradict 1.')
    expect(markdown.indexOf('2 unconfirmed, by reason')).toBeLessThan(markdown.indexOf(`- \`${caObjective.id}\`: wording-differs`))
  })

  it('counts the records of a jurisdiction by standing and regime, and the Dutch ones by the three kinds of standing', () => {
    const guidance = { ...nlObjective, id: nlObjective.id.replace(/getallen-1$/, 'kaart-1'), code: 'Tellen / 1', code_key: 'Tellen.1', standing: 'curriculum-institute-guidance' }
    delete (guidance as { regime?: string }).regime
    const draft = { ...nlObjective, id: nlObjective.id.replace(/getallen-1$/, 'concept-1'), code: '19', code_key: '19', standing: 'draft-not-yet-in-force', regime: '2027-draft' }
    const reference = { ...nlObjective, id: nlObjective.id.replace(/getallen-1$/, 'niveau-1'), code: '', code_key: '', standing: 'legal-reference-level' }
    delete (reference as { regime?: string }).regime
    const added = Object.fromEntries([guidance, draft, reference].map((frontmatter) => [pathForId(frontmatter.id)!, draftObjective(frontmatter, { wording: `Verzonnen: ${frontmatter.id}.`, source: 'Voorbeeldinstituut.' })]))
    const markdown = report({ ...tree, ...added, ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!), verdict(added[pathForId(draft.id)!]!, { verdict: 'unconfirmed', reason: 'code-differs' })]) })

    expect(cellsOf(markdown, 'Standing', 'legal-core-goal', '2026')).toEqual({ Standing: 'legal-core-goal', Regime: '2026', Records: '1', Confirmed: '1', Unconfirmed: '0', Stale: '0', Unchecked: '0' })
    expect(cellsOf(markdown, 'Standing', 'legal-reference-level', '-')).toMatchObject({ Records: '1', Unchecked: '1' })
    expect(cellsOf(markdown, 'Standing', 'curriculum-institute-guidance', '-')).toMatchObject({ Records: '1', Unchecked: '1' })
    expect(cellsOf(markdown, 'Standing', 'draft-not-yet-in-force', '2027-draft')).toMatchObject({ Records: '1', Unconfirmed: '1' })
    expect(cellsOf(markdown, 'Standing', 'state-board-adopted-standard', '-')).toMatchObject({ Records: '1', Unchecked: '1' })
    expect(markdown).toContain('By kind of standing: 2 are set by law or decree (core goals, reference levels and aims for childcare), 1 is guidance of the curriculum institute, and 1 is of a draft that is not in force.')
    // Only the Netherlands has the three kinds.
    expect(markdown.match(/^By kind of standing:/gm)).toHaveLength(1)
  })

  it('every Dutch standing is of one of the three kinds', () => {
    expect(DUTCH_KINDS.flatMap((kind) => kind.standings).sort()).toEqual([...STANDINGS.nl].sort())
  })

  it('counts the statements of the check rendition that no record carries', () => {
    const entries: Unrecorded[] = [
      { rendition: 'example-counting-standards-pdf', code: 'K.CC.9', place: { page: 13 } },
      { rendition: 'example-counting-standards-pdf', code: 'K.CC.10', place: { page: 13 }, explained: 'Placeholder row, skipped by the manifest.' },
    ]
    const markdown = report({ ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)], entries) })
    expect(row(markdown, 'kindergarten', 'mathematics')['No record']).toBe('2 (1 unexplained)')
    expect(row(markdown, 'fase-1', 'mathematics')['No record']).toBe('0')
  })
})

describe('the freshness of the committed report', () => {
  const tree = writtenTree()
  const reviews = { ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }

  it('is the same text every time on an unchanged tree, with no date in it', () => {
    const root = plant({ ...tree, ...reviews })
    const first = renderCoverage(root, { manifest })
    expect(renderCoverage(root, { manifest })).toBe(first)
    expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/)
    expect(first).toContain('generated')
    expect(first.endsWith('\n')).toBe(true)
  })

  it('fails the check until the report is written, then passes, and writing it again changes nothing', () => {
    const root = plant({ ...tree, ...reviews })
    expect(coverageIsFresh(root, { manifest })).toBe(false)
    writeCoverage(root, { manifest })
    expect(existsSync(join(root, COVERAGE_FILE))).toBe(true)
    expect(coverageIsFresh(root, { manifest })).toBe(true)
    const written = readFileSync(join(root, COVERAGE_FILE), 'utf8')
    writeCoverage(root, { manifest })
    expect(readFileSync(join(root, COVERAGE_FILE), 'utf8')).toBe(written)
  })

  it('fails the check when one verdict changes, until the report is regenerated', () => {
    const root = plant({ ...tree, ...reviews })
    writeCoverage(root, { manifest })
    plant(reviewOf(CA_LANE, [verdict(tree[CA_FILE]!, { verdict: 'unconfirmed', reason: 'code-differs' })]), root)
    expect(coverageIsFresh(root, { manifest })).toBe(false)
    writeCoverage(root, { manifest })
    expect(coverageIsFresh(root, { manifest })).toBe(true)
  })
})
