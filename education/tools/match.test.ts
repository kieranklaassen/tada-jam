import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { DataNodes, Lane, LanePart, SourcePlan } from '../manifest.ts'
import { caObjective, caSource, nlObjective, nlSource } from './fixtures.ts'
import { formatMatch, markedColumns, markedLayout, matchLane, pagesByMarks, placeVerifier, tableColumns, tableLayout } from './match.ts'
import type { MatchOptions, ReadPages } from './match.ts'
import { normaliseCode, wordingHash } from './normalise.ts'
import { draftObjective, parseRecord } from './record.ts'
import type { Box, SourcePages } from './rendition.ts'
import { recordHashes } from './review.ts'
import type { Verdict } from './review.ts'
import { SAME_FILE, objectiveId, pathForId, sourceId } from './schema.ts'
import type { ObjectiveFrontmatter } from './schema.ts'
import { putWording } from './store.ts'

// Every wording, code scope and page here is invented. No official wording belongs in a test.

const CHECK = sourceId('us-ca', 'example-counting-standards-pdf')
const CHECK_SLUG = 'example-counting-standards-pdf'

function part(over: Partial<LanePart> = {}): LanePart {
  return {
    name: 'Example rows',
    source: caSource.id,
    checkRendition: CHECK,
    checkStrength: 'second-rendition',
    checkGranularity: 'The same statements, printed as pages.',
    expectedCount: 1,
    selection: { kind: 'rows', codeColumn: 'Code', domainColumn: 'Domain', where: {} },
    ...over,
  }
}

function lane(parts: readonly LanePart[] = [part()], over: Partial<Lane> = {}): Lane {
  return {
    jurisdiction: 'us-ca',
    level: 'kindergarten',
    subject: 'mathematics',
    title: 'Kindergarten mathematics',
    sources: [caSource.id, CHECK],
    parts,
    expectedCount: 1,
    countingMethod: 'Counted in the example file.',
    countIsFromImportFile: true,
    domains: [],
    granularity: 'One record per row.',
    skipped: [],
    ...over,
  }
}

interface Sample {
  code: string
  wording: string
  parent?: string
  // The domain its code scope ends in. Default: Counting and Cardinality.
  domain?: string
  // The last part of its id. Default: made from its code.
  slug?: string
}

// A folder of description-only records and a store that holds their wording.
function pack(samples: readonly Sample[]): { education: string; store: string; ids: string[] } {
  const education = mkdtempSync(join(tmpdir(), 'education-match-'))
  const store = mkdtempSync(join(tmpdir(), 'education-match-store-'))
  const ids = samples.map((sample) => {
    const id = objectiveId('us-ca', 'kindergarten', 'mathematics', sample.slug ?? (sample.code === '' ? 'uncoded' : sample.code.toLowerCase().replace(/[^a-z0-9]+/g, '-')))
    const frontmatter: ObjectiveFrontmatter = {
      ...caObjective,
      id,
      code: sample.code,
      code_key: normaliseCode(sample.code),
      ...(sample.parent === undefined ? {} : { parent_code: sample.parent }),
      ...(sample.domain === undefined ? {} : { code_scope: `Example Counting Standards, ${sample.domain}` }),
      wording_sha256: putWording(store, sample.wording),
    }
    const file = join(education, pathForId(id)!)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, draftObjective(frontmatter))
    return id
  })
  return { education, store, ids }
}

// Pages counted from 1; every page not given is empty.
function paged(pages: Record<number, string>): SourcePages {
  const last = Math.max(...Object.keys(pages).map(Number))
  return { pages: Array.from({ length: last + 1 }, (_, page) => pages[page] ?? '') }
}

function options(samples: readonly Sample[], renditions: Record<string, ReadPages>, plans: readonly SourcePlan[] = []): MatchOptions & { ids: string[] } {
  const { education, store, ids } = pack(samples)
  return {
    education,
    store,
    plans,
    pages: (source) => {
      const pages = renditions[source]
      if (!pages) throw new Error(`no pages for ${source}`)
      return pages
    },
    ids,
  }
}

describe('a record whose wording stands in the check rendition', () => {
  it('is matched with its page and the offset of its first word', () => {
    const run = options([{ code: 'K.CC.1', wording: 'Count the pears in a wide basket, up to ten.' }], { [CHECK]: paged({ 11: 'Nothing of it here.', 12: 'A heading. Count the pears in a wide basket up to ten. More text.' }) })
    const result = matchLane(lane(), run)
    expect(result.lane).toBe('us-ca/kindergarten/mathematics')
    // The comma the rendition lacks does not stand in the way; it is listed as a difference of form.
    expect(result.records).toEqual([
      { id: run.ids[0], code: 'K.CC.1', part: 'Example rows', matched: true, rendition: CHECK_SLUG, place: { page: 12, offset: 2 }, form_differences: [{ kind: 'comma', only_in: 'wording', word: 7, place: { page: 12, offset: 8 } }] },
    ])
  })

  it('is matched whatever the quotes, dashes, case and line breaks', () => {
    const run = options([{ code: 'K.CC.1', wording: 'Say “how many” – for sets of two-coloured beads.' }], { [CHECK]: paged({ 3: 'SAY "how many" - for sets\n   of two-coloured\nbeads' }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, place: { page: 3, offset: 0 } })
  })

  it('is reported not found when the rendition does not hold it', () => {
    const run = options([{ code: 'K.CC.1', wording: 'Count the pears in a wide basket up to ten.' }], { [CHECK]: paged({ 12: 'Count the pears in a wide basket up to twenty.' }) })
    expect(matchLane(lane(), run).records).toEqual([{ id: run.ids[0], code: 'K.CC.1', part: 'Example rows', matched: false, rendition: CHECK_SLUG, place: {}, why_not: 'not-found' }])
  })

  it('is reported unreadable when the rendition cannot be read, and the result says why', () => {
    const run = options([{ code: 'K.CC.1', wording: 'Count the pears in a wide basket up to ten.' }], {})
    const result = matchLane(lane(), run)
    expect(result.records[0]).toMatchObject({ matched: false, why_not: 'rendition-unreadable', place: {} })
    expect(result.unreadable).toEqual([{ rendition: CHECK_SLUG, why: `no pages for ${CHECK}` }])
    expect(formatMatch(result)).toContain(`unreadable\t${CHECK_SLUG}\tno pages for ${CHECK}`)
    expect(matchLane(lane(), options([{ code: 'K.CC.1', wording: 'Count the pears.' }], { [CHECK]: paged({ 1: 'Count the pears.' }) }))).not.toHaveProperty('unreadable')
  })

  it('reads the canonical source again for a part checked in the same file', () => {
    const run = options([{ code: 'K.CC.1', wording: 'Count the pears in a wide basket up to ten.' }], { [caSource.id]: paged({ 4: 'Count the pears in a wide basket up to ten.' }) })
    expect(matchLane(lane([part({ checkRendition: SAME_FILE, checkStrength: 'second-reading' })]), run).records[0]).toMatchObject({ matched: true, rendition: SAME_FILE, place: { page: 4, offset: 0 } })
  })

  it('searches each column of a page read by word position, and the columns joined', () => {
    const samples = [
      { code: 'K.CC.1', wording: 'Sort the green buttons by size.' },
      { code: 'K.CC.2', wording: 'Stack nine round stones and then count every stone again.' },
    ]
    const columns = ['a title\nSort the green buttons by size.', 'Stack nine round stones and then', 'count every stone again.']
    const run = options(samples, { [CHECK]: { pages: ['', '', columns.join('\n\f\n')], columns: [[], [], columns] } })
    const [first, second] = matchLane(lane(), run).records
    expect(first).toMatchObject({ matched: true, place: { page: 2, offset: 2 } })
    // The second runs from the foot of one column to the head of the next.
    expect(second).toMatchObject({ matched: true, place: { page: 2, offset: 8 } })
  })
})

describe('the two artefacts of a line-break hyphen', () => {
  const wording = 'Match the buttons one-to-one with the carefully painted cups.'

  it('matches a rendition that dropped the hyphen and joined two words, and says it was tolerant', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 5: 'Match the buttons oneto-one with the carefully painted cups.' }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, tolerant: true, place: { page: 5, offset: 0 } })
  })

  it('matches a rendition that kept the hyphen and split one word, and says it was tolerant', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 5: 'Match the buttons one-to-one with the care-\n   fully painted cups.' }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, tolerant: true })
  })

  it('does not call an exact match tolerant, and tolerates nothing else', () => {
    const exact = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 5: 'Match the buttons one-to-one with the carefully painted cups.' }) })
    expect(matchLane(lane(), exact).records[0]).not.toHaveProperty('tolerant')
    // A word split without a hyphen, and a word that is simply missing.
    const split = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 5: 'Match the buttons one-to-one with the care fully painted cups.' }) })
    expect(matchLane(lane(), split).records[0]).toMatchObject({ matched: false, why_not: 'not-found' })
    const missing = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 5: 'Match the buttons one-to-one with the painted cups.' }) })
    expect(matchLane(lane(), missing).records[0]).toMatchObject({ matched: false, why_not: 'not-found' })
  })
})

describe('a ligature the text layer breaks a word at', () => {
  const wording = 'Sort the stoffen and talk about conflicten with fietsers.'

  it('matches a word printed as two where the first ends in f, ff, fi or fl, and says it was tolerant', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 5: 'Sort the stoff en and talk about confl icten with fi etsers.' }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, tolerant: true, place: { page: 5, offset: 0 } })
  })

  it('also when the broken word opens the wording', () => {
    const run = options([{ code: 'K.CC.1', wording: 'Fietsers wait at the red light.' }], { [CHECK]: paged({ 5: 'A heading. Fi etsers wait at the red light.' }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, tolerant: true, place: { page: 5, offset: 2 } })
  })

  it('does not match a word split anywhere else', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 5: 'Sort the sto ffen and talk about conflicten with fietsers.' }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: false, why_not: 'not-found' })
  })
})

describe('raised and lowered digits', () => {
  it('match the same digits printed plain, either way round, and say it was tolerant', () => {
    const raised = options([{ code: 'K.CC.1', wording: 'A box of 1 dm³ holds 1000 cm³, and 2¹⁄₂ boxes hold more.' }], { [CHECK]: paged({ 5: 'A box of 1 dm3 holds 1000 cm3, and 21/2 boxes hold more.' }) })
    expect(matchLane(lane(), raised).records[0]).toMatchObject({ matched: true, tolerant: true, place: { page: 5, offset: 0 } })
    const plain = options([{ code: 'K.CC.1', wording: 'Fields are measured in m2 and km2.' }], { [CHECK]: paged({ 5: 'Fields are measured in m² and km².' }) })
    expect(matchLane(lane(), plain).records[0]).toMatchObject({ matched: true, tolerant: true })
    const opening = options([{ code: 'K.CC.1', wording: 'm³ is the cubic metre.' }], { [CHECK]: paged({ 5: 'Units: m3 is the cubic metre.' }) })
    expect(matchLane(lane(), opening).records[0]).toMatchObject({ matched: true, tolerant: true, place: { page: 5, offset: 1 } })
  })

  it('do not match another digit, or a digit set apart from its unit', () => {
    const other = options([{ code: 'K.CC.1', wording: 'A box of 1 dm³ holds a litre.' }], { [CHECK]: paged({ 5: 'A box of 1 dm2 holds a litre.' }) })
    expect(matchLane(lane(), other).records[0]).toMatchObject({ matched: false })
    const apart = options([{ code: 'K.CC.1', wording: 'A box of 1 dm³ holds a litre.' }], { [CHECK]: paged({ 5: 'A box of 1 dm 3 holds a litre.' }) })
    expect(matchLane(lane(), apart).records[0]).toMatchObject({ matched: false })
  })
})

describe('a statement the two renditions split differently', () => {
  const stem = 'Sort the buttons into cups by colour.'
  const lines = `${stem}\na. Put every red button in the first cup.\nb. Put every blue button in the second cup.`

  it('matches a stem and its lettered lines found in order, with the places of the parts', () => {
    const rendition = paged({
      7: `Earlier text. ${stem}`,
      8: 'A running head, page eight\na. Put every red button in the first cup.\nA note set between the two.\nb. Put every blue button in the second cup.',
    })
    const run = options([{ code: 'K.CC.1', wording: lines }], { [CHECK]: rendition })
    expect(matchLane(lane(), run).records[0]).toEqual({
      id: run.ids[0],
      code: 'K.CC.1',
      part: 'Example rows',
      matched: true,
      granularity_differs: true,
      rendition: CHECK_SLUG,
      place: { page: 7, offset: 2 },
      parts: [
        { page: 7, offset: 2 },
        { page: 8, offset: 5 },
        { page: 8, offset: 20 },
      ],
    })
  })

  it('is a plain match when the stem and its lines stand together', () => {
    const run = options([{ code: 'K.CC.1', wording: lines }], { [CHECK]: paged({ 7: `1. ${stem} a. Put every red button in the first cup. b. Put every blue button in the second cup.` }) })
    const [record] = matchLane(lane(), run).records
    expect(record).toMatchObject({ matched: true, place: { page: 7, offset: 1 } })
    expect(record).not.toHaveProperty('granularity_differs')
    expect(record).not.toHaveProperty('parts')
  })

  it('does not match lines that are out of order, or further away than the following page', () => {
    const backwards = paged({ 7: `b. Put every blue button in the second cup. a. Put every red button in the first cup. ${stem}` })
    expect(matchLane(lane(), options([{ code: 'K.CC.1', wording: lines }], { [CHECK]: backwards })).records[0]).toMatchObject({ matched: false })
    const far = paged({ 7: stem, 9: 'a. Put every red button in the first cup. b. Put every blue button in the second cup.' })
    expect(matchLane(lane(), options([{ code: 'K.CC.1', wording: lines }], { [CHECK]: far })).records[0]).toMatchObject({ matched: false })
  })

  it('matches a sub-part record that repeats its parent’s stem, where the rendition prints the stem once', () => {
    const samples = [
      { code: 'K.CC.4.a', parent: 'K.CC.4', wording: `${stem} Put every red button in the first cup.` },
      { code: 'K.CC.4.b', parent: 'K.CC.4', wording: `${stem} Put every blue button in the second cup.` },
      // The same shape on a record that is not a sub-part is not split.
      { code: 'K.CC.5', wording: `${stem} Put every blue button in the second cup.` },
    ]
    const run = options(samples, { [CHECK]: paged({ 7: `4. ${stem} a. Put every red button in the first cup. b. Put every blue button in the second cup.` }) })
    const [a, b, other] = matchLane(lane(), run).records
    expect(a).toMatchObject({ matched: true, granularity_differs: true, place: { page: 7, offset: 1 }, parts: [{ page: 7, offset: 1 }, { page: 7, offset: 9 }] })
    expect(b).toMatchObject({ matched: true, granularity_differs: true, place: { page: 7, offset: 1 }, parts: [{ page: 7, offset: 1 }, { page: 7, offset: 18 }] })
    expect(other).toMatchObject({ matched: false, why_not: 'not-found' })
  })
})

describe('a statement that runs over a page break', () => {
  const wording = 'Sort the wet pebbles by size and then count every one of them again.'
  const foot = 'Example Counting Standards, 2019, page 3'

  it('matches when it runs to the foot of a page and goes on at the top of the next, with both places', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 3: `An earlier statement. Sort the wet pebbles by size and then\n${foot}`, 4: 'count every one of them again. A later statement.' }) })
    const [record] = matchLane(lane(), run).records
    expect(record).toMatchObject({ matched: true, place: { page: 3, offset: 3 }, parts: [{ page: 3, offset: 3 }, { page: 4, offset: 0 }] })
    expect(record).not.toHaveProperty('granularity_differs')
    expect(record).not.toHaveProperty('tolerant')
  })

  it('goes on at the top of a column of the next page as well', () => {
    const next = ['A label', 'count every one of them again. A later statement.']
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: { pages: ['', '', '', `Sort the wet pebbles by size and then\n${foot}`, next.join('\n\f\n')], columns: [[], [], [], [`Sort the wet pebbles by size and then\n${foot}`], next] } })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, parts: [{ page: 3, offset: 0 }, { page: 4, offset: 2 }] })
  })

  it('does not match when more than a footer follows the first part, or the rest does not open the next page', () => {
    const more = 'Another statement of a dozen words or more that is certainly not the foot of a page at all.'
    const followed = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 3: `Sort the wet pebbles by size and then\n${more}`, 4: 'count every one of them again.' }) })
    expect(matchLane(lane(), followed).records[0]).toMatchObject({ matched: false })
    const later = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 3: `Sort the wet pebbles by size and then\n${foot}`, 4: 'A heading first. count every one of them again.' }) })
    expect(matchLane(lane(), later).records[0]).toMatchObject({ matched: false })
  })
})

describe('a record of several labelled spans', () => {
  const wording = 'Early (3 to 4 years): Stack three wooden blocks.\n\nLater (4 to 5 years): Stack ten wooden blocks and count them.'

  it('matches when every span is found, the labels aside', () => {
    const rendition = paged({ 9: 'Foundation 1.1 Stacking\nEarly\n3 to 4 years\nLater\n4 to 5 years\nStack three wooden blocks.\nStack ten wooden blocks and count them.' })
    const run = options([{ code: '1.1', wording }], { [CHECK]: rendition })
    const [record] = matchLane(lane(), run).records
    expect(record).toMatchObject({ matched: true, place: { page: 9, offset: 14 }, parts: [{ page: 9, offset: 14 }, { page: 9, offset: 18 }] })
    expect(record).not.toHaveProperty('granularity_differs')
  })

  it('is not found when one span is missing', () => {
    const run = options([{ code: '1.1', wording }], { [CHECK]: paged({ 9: 'Stack three wooden blocks.\nStack nine wooden blocks and count them.' }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: false, why_not: 'not-found' })
  })
})

describe('renditions that are data', () => {
  const samples = [{ code: 'K.CC.1', wording: 'Count the "ripe" pears in a wide basket.' }]

  it('finds a goal text that is a JSON string value, and names the file', () => {
    const goals = JSON.stringify([{ id: 'a1', title: 'Pears' }, { id: 'a2', description: '<p>Count the "ripe" pears in a <em>wide</em> basket.</p>' }])
    const rendition: SourcePages = { pages: ['', '[]', goals], files: ['', 'areas.json', 'goals.json'] }
    const plans: SourcePlan[] = [{ source: CHECK, incomingKey: 'example', file: 'repo', extraction: { kind: 'git', dataPath: 'data', format: 'json' } }]
    const run = options(samples, { [CHECK]: rendition }, plans)
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, place: { node: 'goals.json', offset: 3 } })
  })

  it('finds text that runs across the tags of an XML rendition', () => {
    const xml = '<artikel><kop>Artikel 1</kop><al>Count the &quot;ripe&quot; <nadruk>pears</nadruk> in a wide\n basket.</al></artikel>'
    const plans: SourcePlan[] = [{ source: CHECK, incomingKey: 'example', file: 'wet.xml', extraction: { kind: 'legal-xml' } }]
    const run = options(samples, { [CHECK]: paged({ 1: xml }) }, plans)
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, place: { page: 1, offset: 2 } })
  })
})

describe('the reverse pass', () => {
  const samples: Sample[] = [
    { code: 'K.CC.1', wording: 'Count the pears.' },
    { code: 'K.CC.4.a', parent: 'K.CC.4', wording: 'Sort the buttons. Put red ones first.' },
    { code: 'K.CC.4.b', parent: 'K.CC.4', wording: 'Sort the buttons. Put blue ones second.' },
    { code: 'K.G.2', domain: 'Geometry', wording: 'Name the shapes of the tiles.\na. Find every square tile.\nb. Find every round tile.' },
  ]
  const rendition = paged({
    3: 'K.CC.1 Count the pears. K.CC.2 A statement nobody imported. K.CC.3 A row the manifest skips.',
    4: 'K.CC.4 Sort the buttons. K.CC.4a Put red ones first. K.CC.4b Put blue ones second. 1.CC.9 belongs to another grade.',
    5: 'K.G.2 Name the shapes of the tiles. a. Find every square tile. b. Find every round tile. See K.G.2a and K.G.2b, and K.G.2c.',
  })
  const skipped = [{ code: 'K.CC.3', reason: 'Placeholder row, not a standard.' }]

  it('lists a code of the lane’s shape that no record carries, with its page', () => {
    const result = matchLane(lane([part()], { skipped }), options(samples, { [CHECK]: rendition }))
    expect(result.reverse).toHaveLength(1)
    expect(result.reverse[0]).toMatchObject({ part: 'Example rows', rendition: CHECK_SLUG, applies: true, printed: 4, of: 4 })
    expect(result.reverse[0]!.unexplained).toEqual([
      { code: 'K.CC.2', place: { page: 3 } },
      // The record K.G.2 holds lines a and b, and no line c.
      { code: 'K.G.2c', place: { page: 5 } },
    ])
  })

  it('explains the parent of sub-part records and a lettered sub-part held inside its parent’s record, and leaves out a skipped code', () => {
    const result = matchLane(lane([part()], { skipped }), options(samples, { [CHECK]: rendition }))
    expect(result.reverse[0]!.explained).toEqual([
      { code: 'K.CC.4', place: { page: 4 }, explained: 'parent of sub-part records; the source has no row for it' },
      { code: 'K.G.2a', place: { page: 5 }, explained: "sub-part inside its parent's record" },
      { code: 'K.G.2b', place: { page: 5 }, explained: "sub-part inside its parent's record" },
    ])
    const codes = [...result.reverse[0]!.explained, ...result.reverse[0]!.unexplained].map((entry) => entry.code)
    expect(codes).not.toContain('K.CC.3')
    expect(codes).not.toContain('1.CC.9')
  })

  it('still subtracts every record of the lane when only one batch is asked for', () => {
    const batched = lane([part()], {
      skipped,
      batchKey: 'Domain',
      batches: [
        { name: 'counting', values: ['Counting and Cardinality'], size: 3 },
        { name: 'shapes', values: ['Geometry'], size: 1 },
      ],
    })
    const result = matchLane(batched, { ...options(samples, { [CHECK]: rendition }), batch: 'shapes' })
    expect(result.batch).toBe('shapes')
    expect(result.records.map((record) => record.code)).toEqual(['K.G.2'])
    expect(result.reverse[0]!.unexplained.map((entry) => entry.code)).toEqual(['K.CC.2', 'K.G.2c'])
  })

  it('does not apply to a part checked in the same file, or to records without printed codes, and says why', () => {
    const same = matchLane(lane([part({ checkRendition: SAME_FILE, checkStrength: 'second-reading' })]), options(samples, { [caSource.id]: rendition }))
    expect(same.reverse[0]).toMatchObject({ applies: false, rendition: SAME_FILE })
    expect(same.reverse[0]!.why_not).toContain('same file')
    const uncoded = matchLane(lane(), options([{ code: '', wording: 'Count the pears.' }], { [CHECK]: rendition }))
    expect(uncoded.reverse[0]).toMatchObject({ applies: false })
    expect(uncoded.reverse[0]!.why_not).toContain('no printed code')
  })

  it('does not apply when the codes are bare numbers, or when the rendition prints none of them', () => {
    const numbers = matchLane(lane(), options([{ code: '1.1', wording: 'Count the pears.' }, { code: '1.2', wording: 'Sort the buttons.' }], { [CHECK]: paged({ 3: 'Foundation 1.1 Count the pears. Foundation 1.2 Sort the buttons. Strand 2.0' }) }))
    expect(numbers.reverse[0]).toMatchObject({ applies: false })
    expect(numbers.reverse[0]!.why_not).toContain('bare numbers')
    // A number with a letter set beside it, and a path of headings, are no more telling.
    const labels = [{ code: '18 B d', wording: 'Count the pears.' }, { code: '12 A', wording: 'Sort the buttons.' }, { code: 'Time / 4', wording: 'Name the days.' }]
    const labelled = matchLane(lane(), options(labels, { [CHECK]: paged({ 3: 'Count the pears. Sort the buttons. Name the days. See 3 A and 7 B c, and Time / 9.' }) }))
    expect(labelled.reverse[0]).toMatchObject({ applies: false, unexplained: [] })
    expect(labelled.reverse[0]!.why_not).toContain('bare numbers')
    const unprinted = matchLane(lane(), options(samples, { [CHECK]: paged({ 3: 'Count the pears. 2. Sort the buttons.' }) }))
    expect(unprinted.reverse[0]).toMatchObject({ applies: false })
    expect(unprinted.reverse[0]!.why_not).toContain('prints none')
  })

  it('reads codes printed without the part every code of the lane starts with, on the pages its records were found on', () => {
    const health: Sample[] = [
      { code: 'K.1.1.N', wording: 'Name three foods that grow on trees.' },
      { code: 'K.1.2.N', wording: 'Tell why breakfast helps a morning go well.' },
      { code: 'K.2.1.S', wording: 'Show how to cross a quiet road.' },
    ]
    const pages = paged({
      10: 'Kindergarten\n1.1.N Name three foods that grow on trees.\n1.2.N Tell why breakfast helps a morning go well.\n1.3.N A statement nobody imported.',
      11: 'Kindergarten\n2.1.S Show how to cross a quiet road.',
      12: 'Grade One\n1.1.N Another grade prints the same code.\n1.9.N And one this lane has no record of.',
    })
    const result = matchLane(lane(), options(health, { [CHECK]: pages }))
    expect(result.reverse[0]).toMatchObject({ applies: true, printed: 3, of: 3, explained: [] })
    expect(result.reverse[0]!.unexplained).toEqual([{ code: 'K.1.3.N', place: { page: 10 } }])
  })
})

describe('a statement the rendition prints for several grades in the same words', () => {
  const health: Sample[] = [
    { code: 'K.1.1.N', wording: 'Name three foods that grow on trees.' },
    { code: 'K.1.2.N', wording: 'Tell why breakfast helps a morning go well.' },
    { code: 'K.2.1.S', wording: 'Show how to cross a quiet road.' },
  ]
  const pages = paged({
    4: 'Preschool\n3.1.S Show how to cross a quiet road.\n3.2.S One only the younger children have.',
    10: 'Kindergarten\n1.1.N Name three foods that grow on trees.\n1.2.N Tell why breakfast helps a morning go well.',
    11: 'Kindergarten\n2.1.S Show how to cross a quiet road.',
  })

  it('is placed where the other records of its part stand, not at its first printing', () => {
    const result = matchLane(lane(), options(health, { [CHECK]: pages }))
    expect(result.records.map((record) => record.place)).toEqual([
      { page: 10, offset: 4 },
      { page: 10, offset: 14 },
      { page: 11, offset: 4 },
    ])
    // The codes of the other grade's page are not read as this lane's.
    expect(result.reverse[0]).toMatchObject({ applies: true, printed: 3, of: 3, unexplained: [] })
  })

  it('stays at its only printing when that is elsewhere', () => {
    const elsewhere = paged({ 4: 'Show how to cross a quiet road.', 10: 'Name three foods that grow on trees. Tell why breakfast helps a morning go well.' })
    expect(matchLane(lane(), options(health, { [CHECK]: elsewhere })).records[2]).toMatchObject({ matched: true, place: { page: 4, offset: 0 } })
  })
})

describe('parts that share a canonical source', () => {
  it('gives each record to the part whose selection picks it, and checks it in that part’s rendition', () => {
    const other = sourceId('us-ca', 'example-other-pdf')
    const parts = [
      part({ name: 'Band K-2', selection: { kind: 'rows', codeColumn: 'Code', domainColumn: 'Domain', where: {}, codePrefixes: ['K-2-ETS1-'] } }),
      part({ name: 'Band 3-5', checkRendition: other, selection: { kind: 'rows', codeColumn: 'Code', domainColumn: 'Domain', where: {}, codePrefixes: ['3-5-ETS1-'] } }),
    ]
    const samples = [
      { code: 'K-2-ETS1-1', wording: 'Ask what a paper bridge has to carry.' },
      { code: '3-5-ETS1-1', wording: 'Say what a paper bridge has to carry and how wide it may be.' },
    ]
    const run = options(samples, { [CHECK]: paged({ 2: 'K–2-ETS1-1. Ask what a paper bridge has to carry.' }), [other]: paged({ 6: '3–5-ETS1-1. Say what a paper bridge has to carry and how wide it may be.' }) })
    const result = matchLane(lane(parts), run)
    // Records come in the lane's order: by code, numbers read as numbers.
    expect(result.records.map((record) => [record.code, record.part, record.rendition, record.place.page])).toEqual([
      ['3-5-ETS1-1', 'Band 3-5', 'example-other-pdf', 6],
      ['K-2-ETS1-1', 'Band K-2', CHECK_SLUG, 2],
    ])
    expect(result.reverse.map((reverse) => [reverse.part, reverse.applies, reverse.printed, reverse.unexplained.length])).toEqual([
      ['Band K-2', true, 1, 0],
      ['Band 3-5', true, 1, 0],
    ])
  })
})

describe('records without a printed code, in parts that share a source', () => {
  it('gives each record to the part that lists its group, and never tries the other part’s rendition', () => {
    const located = (name: string, group: string, checkRendition: string): LanePart =>
      part({ name, checkRendition, selection: { kind: 'statements', locate: 'By its heading.', statements: [{ group, code: 'Counting / 1' }] } })
    const parts = [located('Level one', 'Level one / Numbers', CHECK), located('Level two', 'Level two / Numbers', SAME_FILE)]
    const samples = [
      { code: '', slug: 'level-one-counting-1', domain: 'Level one / Numbers', wording: 'Count the pears in a wide basket.' },
      { code: '', slug: 'level-two-counting-1', domain: 'Level two / Numbers', wording: 'Count the plums on a low branch.' },
    ]
    // The file the records were read from holds both; the other rendition holds neither.
    const run = options(samples, { [caSource.id]: paged({ 2: 'Count the pears in a wide basket. Count the plums on a low branch.' }), [CHECK]: paged({ 1: 'Nothing of either.' }) })
    expect(matchLane(lane(parts), run).records.map((record) => [record.part, record.rendition, record.matched])).toEqual([
      ['Level one', CHECK_SLUG, false],
      ['Level two', SAME_FILE, true],
    ])
  })
})

describe('a part checked against open data whose text is joined from another repository', () => {
  const STRUCTURE = sourceId('nl', 'voorbeeld-structuur')
  const BASIS = sourceId('nl', 'voorbeeld-basis')
  const GROUP = 'Niveau 1F rekenen / Getallen'
  // The structure lists goals-at-level; the other repository holds those, their levels and the goals' text.
  const nodes: DataNodes = {
    source: STRUCTURE,
    selection: {
      kind: 'data',
      walk: [
        { file: 'vakken.json', entity: 'vak', where: { prefix: ['RK'] } },
        { file: 'domeinen.json', entity: 'domein', via: 'domein_id' },
      ],
      join: { via: 'doelniveau_id', source: BASIS, file: 'doelniveaus.json', entity: 'doelniveau', wording: { via: 'doel_id', file: 'doelen.json', field: 'title' } },
      recordEntities: ['doelniveau'],
      codeField: 'prefix',
      level: { entity: 'doelniveau', field: 'niveau_id', source: BASIS, titles: ['1F'], rule: 'In when its one level has this title.' },
      groupBy: { entity: 'domein', field: 'prefix' },
      groups: [{ name: 'G', count: 3 }],
      notes: 'Invented.',
    },
    idsPairOneToOne: false,
    pairing: 'None.',
  }
  const dutch: Lane = lane(
    [part({ name: 'Voorbeeldbesluit, niveau 1F', source: nlSource.id, checkRendition: STRUCTURE, selection: { kind: 'legal', elements: ['/Bijlage1'], locate: 'By its row.', statements: [{ group: GROUP, code: '1' }] }, dataNodes: nodes })],
    { jurisdiction: 'nl', level: 'einde-po', sources: [nlSource.id, STRUCTURE, BASIS] },
  )
  const files = (held: Record<string, unknown>): SourcePages => ({ pages: ['', ...Object.values(held).map((value) => JSON.stringify(value))], files: ['', ...Object.keys(held)] })
  const renditions: Record<string, SourcePages> = {
    [STRUCTURE]: files({
      'domeinen.json': [
        { id: 'd1', prefix: 'G', doelniveau_id: ['n1', 'n2', 'n3', 'n4'] },
        { id: 'd2', prefix: 'H', doelniveau_id: ['n5'] },
      ],
      'vakken.json': [
        { id: 'v1', prefix: 'RK', domein_id: ['d1'] },
        { id: 'v2', prefix: 'XX', domein_id: ['d2'] },
      ],
    }),
    [BASIS]: files({
      'doelen.json': [
        { title: 'Tel de <i>appels</i> in een mand.', id: 'g1', bron: 'Einddoel' },
        { title: 'Sorteer de knopen', id: 'g2' },
        { title: 'op kleur en op grootte.', id: 'g3' },
        { title: 'Weeg de peren op een schaal.', id: 'g4' },
        { title: 'Stapel de blokken hoog op.', id: 'g5' },
      ],
      'doelniveaus.json': [
        { id: 'n1', doel_id: ['g1'], niveau_id: ['L1'] },
        { id: 'n2', doel_id: ['g2'], niveau_id: ['L1'] },
        { id: 'n3', doel_id: ['g3'], niveau_id: ['L1'] },
        { id: 'n4', doel_id: ['g4'], niveau_id: ['L2'] },
        { id: 'n5', doel_id: ['g5'], niveau_id: ['L1'] },
      ],
      'niveaus.json': [
        { id: 'L1', title: '1F' },
        { id: 'L2', title: '2F' },
      ],
    }),
  }
  const WORDINGS = ['Tel de appels in een mand.', 'Sorteer de knopen op kleur en op grootte.', 'Weeg de peren op een schaal.', 'Stapel de blokken hoog op.', 'op kleur en']

  // Verbatim records without a printed code, in the order of their slugs.
  function run(): MatchOptions & { texts: string[] } {
    const education = mkdtempSync(join(tmpdir(), 'education-match-'))
    const texts = WORDINGS.map((wording, index) => {
      const id = objectiveId('nl', 'einde-po', 'mathematics', `niveau-1f-getallen-${index + 1}`)
      const text = draftObjective({ ...nlObjective, id, level: 'einde-po', code: '', code_key: '', code_scope: `Voorbeeldbesluit, ${GROUP}`, wording_sha256: wordingHash(wording) }, { wording, source: 'Voorbeeldbesluit, bijlage 1.' })
      mkdirSync(dirname(join(education, pathForId(id)!)), { recursive: true })
      writeFileSync(join(education, pathForId(id)!), text)
      return text
    })
    return { education, store: mkdtempSync(join(tmpdir(), 'education-match-store-')), plans: [], lanes: [dutch], pages: (source) => renditions[source] ?? paged({ 1: 'Nothing.' }), texts }
  }

  it('finds a wording in the goals the part’s nodes list at its level, and names the goal', () => {
    const [first, , third, fourth] = matchLane(dutch, run()).records
    expect(first).toMatchObject({ matched: true, rendition: 'voorbeeld-basis', place: { node: 'g1', offset: 0 } })
    expect(first).not.toHaveProperty('granularity_differs')
    // A goal at another level, and one under another subject, are not this part's.
    expect(third).toMatchObject({ matched: false, rendition: 'voorbeeld-basis', why_not: 'not-found' })
    expect(fourth).toMatchObject({ matched: false, why_not: 'not-found' })
  })

  it('matches a wording that the data cuts into several goals, as differing granularity', () => {
    expect(matchLane(dutch, run()).records[1]).toMatchObject({ matched: true, granularity_differs: true, place: { node: 'g2', offset: 0 }, parts: [{ node: 'g2', offset: 0 }, { node: 'g3', offset: 0 }] })
  })

  it('says granularity differs for a wording that is only a piece of a goal', () => {
    const piece = matchLane(dutch, run()).records[4]
    expect(piece).toMatchObject({ matched: true, granularity_differs: true, place: { node: 'g3', offset: 0 } })
    expect(piece).not.toHaveProperty('parts')
  })

  it('verifies a stated goal against the same goals', () => {
    const options = run()
    const verify = placeVerifier(options)
    const at = (index: number, node: string): boolean | null => {
      const record = parseRecord(options.texts[index]!)
      return verify({ ...recordHashes(record), verdict: 'confirmed', rendition: 'voorbeeld-basis', place: { node, offset: 0 }, matched_by: 'script', checker: 'batch-all', round: 1 }, record)
    }
    expect(at(0, 'g1')).toBe(true)
    expect(at(1, 'g2')).toBe(true)
    expect(at(0, 'g2')).toBe(false)
    expect(at(1, 'g3')).toBe(false)
    // The goal holds the wording, and is not one of this part's.
    expect(at(2, 'g4')).toBe(false)
  })
})

describe('a part checked against the open-data nodes that carry its statements', () => {
  const DATA = sourceId('nl', 'voorbeeld-doelen')
  const LEVELS = sourceId('nl', 'voorbeeld-basis')
  const GROUP = 'Kerndoelen / Rekenen / Kerndoel 1'
  const nodes: DataNodes = {
    source: DATA,
    selection: {
      kind: 'data',
      walk: [
        { file: 'kernzinnen.json', entity: 'kernzin', where: { prefix: ['1'] } },
        { file: 'uitwerkingen.json', entity: 'uitwerking', via: 'uitwerking_id' },
      ],
      recordEntities: ['kernzin', 'uitwerking'],
      wordingField: 'description',
      codeField: 'prefix',
      level: { entity: 'uitwerking', field: 'niveau_id', source: LEVELS, titles: ['po'], rule: 'A kernzin is in when every uitwerking under it lists exactly this level.' },
      groupBy: { entity: 'kernzin', field: 'prefix' },
      groups: [{ name: '1', count: 3 }],
      notes: 'Invented.',
    },
    idsPairOneToOne: true,
    pairing: 'By position.',
  }
  const dutch: Lane = lane(
    [part({ name: 'Voorbeeldbesluit, kerndoel 1', source: nlSource.id, checkRendition: DATA, selection: { kind: 'legal', elements: ['/Bijlage1'], locate: 'By its row.', statements: [{ group: GROUP, code: '1' }] }, dataNodes: nodes })],
    { jurisdiction: 'nl', level: 'einde-po', sources: [nlSource.id, DATA, LEVELS] },
  )
  const files = (held: Record<string, unknown>): SourcePages => ({ pages: ['', ...Object.values(held).map((value) => JSON.stringify(value))], files: ['', ...Object.keys(held)] })
  const renditions: Record<string, SourcePages> = {
    [DATA]: files({
      // An older copy of every goal, as the law prints it: not what is checked.
      'deprecated.json': [{ id: 'old', description: 'Tel de appels in een mand. Sorteer de knopen op kleur. Weeg de peren op een schaal.' }],
      'kernzinnen.json': [
        { id: 'k1', prefix: '1', title: 'Kerndoel 1', description: 'Tel de appels in een mand.', uitwerking_id: ['u1', 'u2'] },
        // The same number for older children: its uitwerking lists another level.
        { id: 'k2', prefix: '1', title: 'Kerndoel 1', description: 'Weeg de peren op een schaal.', uitwerking_id: ['u3'] },
      ],
      'uitwerkingen.json': [
        { id: 'u1', prefix: 'u1', description: 'Sorteer de knopen op kleur', niveau_id: ['L1'] },
        { id: 'u2', prefix: 'u2', description: 'Stapel de bloken hoog op.', niveau_id: ['L1'] },
        { id: 'u3', prefix: 'u1', description: 'Meet de tafel op.', niveau_id: ['L2'] },
      ],
    }),
    [LEVELS]: files({
      'niveaus.json': [
        { id: 'L1', title: 'po' },
        { id: 'L2', title: 'vo' },
      ],
    }),
  }
  const WORDINGS = ['Tel de appels in een mand.', 'Sorteer de knopen op kleur.', 'Stapel de blokken hoog op.', 'Weeg de peren op een schaal.']

  it('looks only in those nodes: not in an older copy, not under another level, and a typo in the data is a miss', () => {
    const education = mkdtempSync(join(tmpdir(), 'education-match-'))
    WORDINGS.forEach((wording, index) => {
      const id = objectiveId('nl', 'einde-po', 'mathematics', `kerndoel-1-${index + 1}`)
      mkdirSync(dirname(join(education, pathForId(id)!)), { recursive: true })
      writeFileSync(join(education, pathForId(id)!), draftObjective({ ...nlObjective, id, level: 'einde-po', code: '', code_key: '', code_scope: `Voorbeeldbesluit, ${GROUP}`, wording_sha256: wordingHash(wording) }, { wording, source: 'Voorbeeldbesluit, bijlage 1.' }))
    })
    const result = matchLane(dutch, { education, store: mkdtempSync(join(tmpdir(), 'education-match-store-')), plans: [], pages: (source) => renditions[source] ?? paged({ 1: 'Nothing.' }) })
    expect(result.records.map((record) => [record.matched, record.rendition, record.place])).toEqual([
      [true, 'voorbeeld-doelen', { node: 'k1', offset: 0 }],
      [true, 'voorbeeld-doelen', { node: 'u1', offset: 0 }],
      [false, 'voorbeeld-doelen', {}],
      [false, 'voorbeeld-doelen', {}],
    ])
  })
})

describe('what is printed', () => {
  it('holds ids, codes and places, and none of the wording', () => {
    const samples = [
      { code: 'K.CC.1', wording: 'Count the pears in a wide basket up to ten.' },
      { code: 'K.CC.2', wording: 'Stack seven smooth pebbles beside the pond.' },
    ]
    const run = options(samples, { [CHECK]: paged({ 12: 'Count the pears in a wide basket up to ten. K.CC.1 and K.CC.7' }) })
    const text = formatMatch(matchLane(lane(), run))
    expect(text).toContain('us-ca/kindergarten/mathematics: 2 records, 1 matched exactly, 0 tolerantly, 0 with differing granularity, 1 not found')
    expect(text).toContain(`${run.ids[0]}\tK.CC.1\tmatched\t${CHECK_SLUG}\tpage 12, offset 0`)
    expect(text).toContain(`${run.ids[1]}\tK.CC.2\tNOT FOUND (not-found)\t${CHECK_SLUG}`)
    expect(text).toContain('unexplained\tK.CC.7\tpage 12')
    for (const word of ['pears', 'basket', 'pebbles', 'pond']) expect(text).not.toContain(word)
  })
})

describe('the place a verdict states', () => {
  const wording = 'Count the pears in a wide basket up to ten.'

  function verdictFor(id: string, over: Partial<Verdict>): { verdict: Verdict; record: ReturnType<typeof parseRecord> } {
    const record = parseRecord(draftObjective({ ...caObjective, id, wording_sha256: wordingHash(wording) }))
    return { record, verdict: { ...recordHashes(record), verdict: 'confirmed', rendition: CHECK_SLUG, place: { page: 12, offset: 2 }, matched_by: 'script', checker: 'batch-all', round: 1, ...over } }
  }

  it('holds the wording: true; does not: false', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 11: `Elsewhere too: ${wording}`, 12: `A heading. ${wording} More text.` }) })
    const verify = placeVerifier(run)
    const at = (place: Verdict['place']): boolean | null => {
      const { verdict, record } = verdictFor(run.ids[0]!, { place })
      return verify(verdict, record)
    }
    expect(at({ page: 12, offset: 2 })).toBe(true)
    expect(at({ page: 11, offset: 2 })).toBe(true)
    expect(at({ page: 12 })).toBe(true)
    expect(at({ page: 12, offset: 3 })).toBe(false)
    expect(at({ page: 10, offset: 2 })).toBe(false)
    expect(at({ page: 40, offset: 2 })).toBe(false)
  })

  it('cannot be told without the store, the rendition or the wording: null', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 12: wording }) })
    const { verdict, record } = verdictFor(run.ids[0]!, { place: { page: 12, offset: 0 } })
    expect(placeVerifier(run)(verdict, record)).toBe(true)
    expect(placeVerifier({ ...run, pages: undefined, store: join(run.store!, 'absent') })(verdict, record)).toBeNull()
    expect(placeVerifier(run)({ ...verdict, rendition: 'a-rendition-nobody-fetched' }, record)).toBeNull()
    const unstored = parseRecord(draftObjective({ ...caObjective, wording_sha256: 'f'.repeat(64) }))
    expect(placeVerifier(run)({ ...verdict, ...recordHashes(unstored) }, unstored)).toBeNull()
  })

  it('says which renditions it could not read, and why; a wording that is not in the store is no unread rendition', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 12: wording }) })
    const { verdict, record } = verdictFor(run.ids[0]!, { place: { page: 12, offset: 0 } })
    const verify = placeVerifier(run)
    expect(verify.unreadable()).toEqual([])
    expect(verify(verdict, record)).toBe(true)
    expect(verify({ ...verdict, rendition: 'a-rendition-nobody-fetched' }, record)).toBeNull()
    const unstored = parseRecord(draftObjective({ ...caObjective, wording_sha256: 'f'.repeat(64) }))
    expect(verify({ ...verdict, ...recordHashes(unstored) }, unstored)).toBeNull()
    const unreadable = verify.unreadable()
    expect(unreadable.map((each) => each.rendition)).toEqual(['a-rendition-nobody-fetched'])
    expect(unreadable[0]!.why).not.toBe('')
    // Without a store nothing is read, so nothing is listed as unread.
    const absent = placeVerifier({ ...run, pages: undefined, store: join(run.store!, 'absent') })
    expect(absent(verdict, record)).toBeNull()
    expect(absent.unreadable()).toEqual([])
  })

  it('reads a verbatim record’s wording from the record, and the same file for a same-file verdict', () => {
    const NL = 'Tel de appels in een mand, tot en met tien.'
    const record = parseRecord(draftObjective(nlObjective, { wording: NL, source: 'Voorbeeldinstituut, doel 1.' }))
    const verify = placeVerifier({ education: mkdtempSync(join(tmpdir(), 'education-match-')), store: mkdtempSync(join(tmpdir(), 'education-match-store-')), plans: [], pages: (source) => (source === nlSource.id ? paged({ 2: `Doel 1. ${NL}` }) : paged({ 1: '' })) })
    const verdict: Verdict = { ...recordHashes(record), verdict: 'confirmed', rendition: SAME_FILE, place: { page: 2, offset: 2 }, matched_by: 'script', checker: 'batch-all', round: 1 }
    expect(verify(verdict, record)).toBe(true)
    expect(verify({ ...verdict, place: { page: 2, offset: 0 } }, record)).toBe(false)
  })
})

// --- every printing, and what a checker has to look at ---------------------------------

// A page read by word position: its columns from left to right, and what the reading knows about them.
function columned(pages: Record<number, readonly string[]>, known: Pick<ReadPages, 'columnNames' | 'firm'> = {}): ReadPages {
  const last = Math.max(...Object.keys(pages).map(Number))
  const columns = Array.from({ length: last + 1 }, (_, page) => [...(pages[page] ?? [])])
  return { pages: columns.map((page) => page.join('\n\f\n')), columns, ...known }
}

describe('a wording the rendition prints more than once', () => {
  const wording = 'Sort the wet pebbles by size.'
  const twice = paged({ 3: `Band one. ${wording}`, 7: `Band two. ${wording} As the rule says: sort the wet pebbles by size.` })

  it('is reported at every printing, in reading order, the first as its place, and says it is ambiguous', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: twice })
    const [record] = matchLane(lane(), run).records
    expect(record).toMatchObject({ matched: true, place: { page: 3, offset: 2 }, ambiguous: true })
    // The third is the same words quoted inside another statement.
    expect(record!.places).toEqual([{ place: { page: 3, offset: 2 } }, { place: { page: 7, offset: 2 } }, { place: { page: 7, offset: 12 } }])
  })

  it('has neither field when it is printed once', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 3: `Band one. ${wording}` }) })
    const [record] = matchLane(lane(), run).records
    expect(record).not.toHaveProperty('ambiguous')
    expect(record).not.toHaveProperty('places')
  })

  it('holds at each of its printings when a verdict states one', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: twice })
    const record = parseRecord(draftObjective({ ...caObjective, id: run.ids[0]!, wording_sha256: wordingHash(wording) }))
    const verify = placeVerifier(run)
    const at = (place: Verdict['place']): boolean | null => verify({ ...recordHashes(record), verdict: 'confirmed', rendition: CHECK_SLUG, place, matched_by: 'script', checker: 'batch-all', round: 1 }, record)
    expect([at({ page: 3, offset: 2 }), at({ page: 7, offset: 2 }), at({ page: 7, offset: 12 }), at({ page: 7, offset: 3 })]).toEqual([true, true, true, false])
  })

  it('is printed with all its places', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: twice })
    const text = formatMatch(matchLane(lane(), run))
    expect(text).toContain('1 ambiguous')
    expect(text).toContain('ambiguous, 3 places: page 3, offset 2 | page 7, offset 2 | page 7, offset 12')
  })

  it('lists a printing found only as parts beside one found in a row', () => {
    const lines = 'Sort the buttons into cups by colour.\na. Put every red button in the first cup.'
    const rendition = paged({ 2: 'Band one. Sort the buttons into cups by colour. a. Put every red button in the first cup.', 6: 'Band two. Sort the buttons into cups by colour. A note set between. a. Put every red button in the first cup.' })
    const [record] = matchLane(lane(), options([{ code: 'K.CC.1', wording: lines }], { [CHECK]: rendition })).records
    expect(record).toMatchObject({ matched: true, place: { page: 2, offset: 2 }, ambiguous: true })
    expect(record).not.toHaveProperty('granularity_differs')
    expect(record!.places).toEqual([{ place: { page: 2, offset: 2 } }, { place: { page: 6, offset: 2 }, granularity_differs: true, parts: [{ page: 6, offset: 2 }, { page: 6, offset: 13 }] }])
  })
})

describe('a printing that needed tolerance beside one that did not', () => {
  const wording = 'Match the buttons with the carefully painted cups.'
  const broken = 'Match the buttons with the care-\nfully painted cups.'

  it('is reported too, before an exact one that comes after it, and marked tolerant; the exact one stays the place', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 3: broken, 7: wording }) })
    const [record] = matchLane(lane(), run).records
    expect(record).toMatchObject({ matched: true, ambiguous: true, place: { page: 7, offset: 0 } })
    expect(record).not.toHaveProperty('tolerant')
    expect(record!.places).toHaveLength(2)
    expect(record!.places![0]).toMatchObject({ place: { page: 3, offset: 0 }, tolerant: true, form_differences: [{ kind: 'split', word: 6 }] })
    expect(record!.places![1]).toEqual({ place: { page: 7, offset: 0 } })
  })

  it('is the place when no printing is exact, and both are held at when a verdict states them', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 3: broken, 7: `A heading. ${broken}` }) })
    const [found] = matchLane(lane(), run).records
    expect(found).toMatchObject({ matched: true, tolerant: true, ambiguous: true, place: { page: 3, offset: 0 } })
    const record = parseRecord(draftObjective({ ...caObjective, id: run.ids[0]!, wording_sha256: wordingHash(wording) }))
    const verify = placeVerifier(run)
    const at = (place: Verdict['place']): boolean | null => verify({ ...recordHashes(record), verdict: 'confirmed', rendition: CHECK_SLUG, place, matched_by: 'script', checker: 'batch-all', round: 1 }, record)
    expect([at({ page: 3, offset: 0 }), at({ page: 7, offset: 2 })]).toEqual([true, true])
  })

  it('is reported after an exact one that comes first, and only it is marked tolerant', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 3: wording, 7: broken }) })
    const [record] = matchLane(lane(), run).records
    expect(record).toMatchObject({ matched: true, ambiguous: true, place: { page: 3, offset: 0 } })
    expect(record).not.toHaveProperty('tolerant')
    expect(record!.places![1]).toMatchObject({ place: { page: 7, offset: 0 }, tolerant: true })
  })
})

describe('two records found at one place', () => {
  const same = 'Sort the wet pebbles by size.'
  const samples: Sample[] = [
    { code: 'K.CC.1', wording: same },
    { code: 'K.CC.2', wording: 'Stack seven smooth stones.' },
    { code: 'K.G.1', domain: 'Geometry', wording: same },
  ]

  it('name each other, and a record alone at its place names nobody', () => {
    const run = options(samples, { [CHECK]: paged({ 3: `${same} Stack seven smooth stones.` }) })
    const [first, alone, second] = matchLane(lane(), run).records
    expect(first).toMatchObject({ place: { page: 3, offset: 0 }, shared_place_with: [run.ids[2]] })
    expect(second).toMatchObject({ place: { page: 3, offset: 0 }, shared_place_with: [run.ids[0]] })
    expect(first).not.toHaveProperty('ambiguous')
    expect(alone).not.toHaveProperty('shared_place_with')
  })

  it('still share their first place when the wording is printed twice, and are ambiguous as well', () => {
    const run = options(samples, { [CHECK]: paged({ 3: `${same} Stack seven smooth stones. ${same}` }) })
    const [first, , second] = matchLane(lane(), run).records
    expect(first).toMatchObject({ ambiguous: true, shared_place_with: [run.ids[2]] })
    expect(second).toMatchObject({ ambiguous: true, shared_place_with: [run.ids[0]] })
  })

  it('name a record outside the batch that was asked for, and the text says so', () => {
    const batched = lane([part()], {
      batchKey: 'Domain',
      batches: [
        { name: 'counting', values: ['Counting and Cardinality'], size: 2 },
        { name: 'shapes', values: ['Geometry'], size: 1 },
      ],
    })
    const run = options(samples, { [CHECK]: paged({ 3: `${same} Stack seven smooth stones.` }) })
    const result = matchLane(batched, { ...run, batch: 'shapes' })
    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({ code: 'K.G.1', shared_place_with: [run.ids[0]] })
    expect(formatMatch(result)).toContain(`shares its place with ${run.ids[0]}`)
  })
})

describe('a match that would run from one printed statement into the next', () => {
  // The rendition closes one statement with a bracketed remark; the record opens the next with it.
  const wording = '(with help) sort the wet pebbles by size'
  const column = ['count the red pears in the old bowl (with help)', 'sort the wet pebbles by size (with help)', 'stack the blocks'].join('\n\n')

  it('is not a match where the reading knows where each statement starts', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: columned({ 1: ['labels', column] }, { firm: [false, true] }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: false, why_not: 'not-found' })
    const record = parseRecord(draftObjective({ ...caObjective, id: run.ids[0]!, wording_sha256: wordingHash(wording) }))
    const stated: Verdict = { ...recordHashes(record), verdict: 'confirmed', rendition: CHECK_SLUG, place: { page: 1, offset: 9 }, matched_by: 'script', checker: 'batch-all', round: 1 }
    expect(placeVerifier(run)(stated, record)).toBe(false)
  })

  it('is neither when it would take in the tail of a heading that reaches into the column', () => {
    const tail = ['find the pages of a book in the reading corner', 'year three) plans', 'read the plan aloud'].join('\n\n')
    const run = options([{ code: 'K.CC.1', wording: 'find the pages of a book in the reading corner (year three)' }], { [CHECK]: columned({ 1: ['labels', tail] }, { firm: [false, true] }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: false, why_not: 'not-found' })
  })

  it('is a match that says it crosses a break where the reading only knows of blank lines and columns', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: columned({ 1: ['labels', column] }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ matched: true, crosses_break: true, place: { page: 1, offset: 9 } })
    const plain = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 4: 'Count the red pears (with help).\n\nSort the wet pebbles by size.' }) })
    const result = matchLane(lane(), plain)
    expect(result.records[0]).toMatchObject({ matched: true, crosses_break: true, place: { page: 4, offset: 4 } })
    expect(formatMatch(result)).toContain('1 crossing a break')
    // From the foot of one column to the head of the next.
    const feet = options([{ code: 'K.CC.1', wording: 'Stack nine round stones and then count every stone again.' }], { [CHECK]: columned({ 2: ['Stack nine round stones and then', 'count every stone again.'] }) })
    expect(matchLane(lane(), feet).records[0]).toMatchObject({ matched: true, crosses_break: true, place: { page: 2, offset: 0 } })
  })
})

describe('a statement that really runs on over a line, a break of its own or a page', () => {
  it('is matched inside one printed statement, over its lines, and crosses nothing', () => {
    const column = ['count the red pears', 'sort the wet pebbles by size\nand then count every one of them again\n(for example in the sand tray)', 'stack the blocks'].join('\n\n')
    const run = options([{ code: 'K.CC.1', wording: 'sort the wet pebbles by size and then count every one of them again' }], { [CHECK]: columned({ 1: ['labels', column] }, { firm: [false, true] }) })
    const [record] = matchLane(lane(), run).records
    expect(record).toMatchObject({ matched: true, place: { page: 1, offset: 5 } })
    expect(record).not.toHaveProperty('crosses_break')
  })

  it('is matched over two printed statements when the record itself breaks its line there', () => {
    const column = ['tell a story to the class:', 'say what happened first'].join('\n\n')
    const wording = 'Tell a story to the class:\nsay what happened first'
    const firm = options([{ code: 'K.CC.1', wording }], { [CHECK]: columned({ 1: ['labels', column] }, { firm: [false, true] }) })
    expect(matchLane(lane(), firm).records[0]).toMatchObject({ matched: true, place: { page: 1, offset: 1 } })
    const loose = matchLane(lane(), options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 1: column }) })).records[0]
    expect(loose).toMatchObject({ matched: true })
    expect(loose).not.toHaveProperty('crosses_break')
    // The same record on one line is no match there.
    const flat = options([{ code: 'K.CC.1', wording: wording.replace('\n', ' ') }], { [CHECK]: columned({ 1: ['labels', column] }, { firm: [false, true] }) })
    expect(matchLane(lane(), flat).records[0]).toMatchObject({ matched: false })
  })

  it('is matched from the last statement of a column to the top of that column overleaf, and not from the middle of a statement', () => {
    const wording = 'sort the wet pebbles by size and then count every one of them again'
    const known = { firm: [false, true, true] }
    const over = columned({ 1: ['labels', 'count the red pears\n\nsort the wet pebbles by size and then', 'a footer'], 2: ['labels', 'count every one of them again\n\nstack the blocks'] }, known)
    const [record] = matchLane(lane(), options([{ code: 'K.CC.1', wording }], { [CHECK]: over })).records
    expect(record).toMatchObject({ matched: true, parts: [{ page: 1, offset: 5 }, { page: 2, offset: 1 }] })
    expect(record).not.toHaveProperty('crosses_break')
    // The statement at the foot goes on with other words: what follows overleaf is not its end.
    const middle = columned({ 1: ['labels', 'count the red pears\n\nsort the wet pebbles by size and then put them away'], 2: ['labels', 'count every one of them again\n\nstack the blocks'] }, known)
    expect(matchLane(lane(), options([{ code: 'K.CC.1', wording }], { [CHECK]: middle })).records[0]).toMatchObject({ matched: false })
  })
})

describe('the column a match stands in', () => {
  const wording = 'sort the wet pebbles by size'
  const columns = ['labels', `count the red pears\n\n${wording}`, `${wording}\n\nstack the blocks`]

  it('is named by its label where the reading knows one, for the place and for every other printing', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: columned({ 1: columns }, { firm: [false, true], columnNames: [[], [null, 'band 1', 'band 2']] }) })
    const result = matchLane(lane(), run)
    expect(result.records[0]).toMatchObject({ place: { page: 1, offset: 5 }, column: 'band 1', ambiguous: true })
    expect(result.records[0]!.places).toEqual([
      { place: { page: 1, offset: 5 }, column: 'band 1' },
      { place: { page: 1, offset: 11 }, column: 'band 2' },
    ])
    expect(formatMatch(result)).toContain('page 1, offset 5 (column band 1) | page 1, offset 11 (column band 2)')
    expect(formatMatch(result)).toContain('# Columns of the places: band 1 (1).')
  })

  it('is its number from the left where the reading knows no label, and is left out on a page of one column', () => {
    const run = options([{ code: 'K.CC.1', wording }], { [CHECK]: columned({ 1: columns }) })
    expect(matchLane(lane(), run).records[0]).toMatchObject({ column: 2 })
    const single = options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 1: wording }) })
    expect(matchLane(lane(), single).records[0]).not.toHaveProperty('column')
  })
})

describe('differences of form at the matched place', () => {
  const found = (wording: string, printed: string) => matchLane(lane(), options([{ code: 'K.CC.1', wording }], { [CHECK]: paged({ 5: `A heading. ${printed}` }) })).records[0]!

  it('lists a compound the record writes open where the rendition prints a hyphen, and the other way round', () => {
    expect(found('Sort the take away sums into two neat piles.', 'Sort the take-away sums into two neat piles.')).toMatchObject({
      matched: true,
      form_differences: [{ kind: 'hyphen', only_in: 'rendition', word: 3, place: { page: 5, offset: 4 } }],
    })
    expect(found('Sort the take-away sums into two neat piles.', 'Sort the take away sums into two neat piles.').form_differences).toEqual([{ kind: 'hyphen', only_in: 'wording', word: 3, place: { page: 5, offset: 4 } }])
  })

  it('lists a comma, or another mark, that only one of the two has inside the statement', () => {
    expect(found('Count the pears, the plums and the nuts.', 'Count the pears the plums and the nuts.').form_differences).toEqual([{ kind: 'comma', only_in: 'wording', word: 3, place: { page: 5, offset: 4 } }])
    expect(found('Count the pears the plums and the nuts.', 'Count the pears; the plums and the nuts.').form_differences).toEqual([{ kind: 'punctuation', mark: ';', only_in: 'rendition', word: 3, place: { page: 5, offset: 4 } }])
  })

  it('lists once, with the marks of each, a place where both have marks the other lacks: the bullets of a list', () => {
    const listed = found('Tell a story: - say what happened; - say who was there', 'Tell a story:\n> say what happened\n> say who was there')
    expect(listed.form_differences).toEqual([
      { kind: 'punctuation', marks: { wording: '-', rendition: '>' }, word: 3, place: { page: 5, offset: 4 } },
      { kind: 'punctuation', marks: { wording: ';-', rendition: '>' }, word: 6, place: { page: 5, offset: 7 } },
    ])
    const text = formatMatch(matchLane(lane(), options([{ code: 'K.CC.1', wording: 'Tell a story: - say what happened' }], { [CHECK]: paged({ 5: 'Tell a story: > say what happened' }) })))
    expect(text).toContain('form: punctuation (- in wording, > in rendition) after word 3')
  })

  it('lists what the tolerance let through: words joined, a word split at a line end, a raised digit', () => {
    expect(found('Match the buttons one-to-one with the cups.', 'Match the buttons oneto-one with the cups.')).toMatchObject({
      tolerant: true,
      form_differences: [{ kind: 'joined', only_in: 'rendition', word: 4, place: { page: 5, offset: 5 } }],
    })
    expect(found('Match the carefully painted cups.', 'Match the care-\nfully painted cups.').form_differences).toEqual([{ kind: 'split', only_in: 'rendition', word: 3, place: { page: 5, offset: 4 } }])
    expect(found('Fields are measured in m2 here.', 'Fields are measured in m² here.').form_differences).toEqual([{ kind: 'raised-digit', word: 5, place: { page: 5, offset: 6 } }])
  })

  it('is left out when the two are printed alike, and never changes whether a record is matched', () => {
    const alike = found('Say “how many” – for sets of two-coloured beads.', 'SAY "how many" - for sets\n   of two-coloured\nbeads')
    expect(alike).toMatchObject({ matched: true })
    expect(alike).not.toHaveProperty('form_differences')
    // A compound closed in the record and printed with a hyphen inside a line is still no match.
    expect(found('Sort the takeaway sums.', 'Sort the take-away sums.')).toMatchObject({ matched: false })
  })

  it('never holds the words of a description-only record, in the result or in what is printed', () => {
    const run = options([{ code: 'K.CC.1', wording: 'Sort the take away sums.' }], { [CHECK]: paged({ 5: 'Sort the take-away sums.' }) })
    const result = matchLane(lane(), run)
    expect(result.records[0]!.form_differences).toEqual([{ kind: 'hyphen', only_in: 'rendition', word: 3, place: { page: 5, offset: 2 } }])
    const text = formatMatch(result)
    expect(text).toContain('1 with differences of form')
    expect(text).toContain('form: hyphen only in rendition after word 3')
    for (const word of ['take', 'away', 'sums']) expect(`${JSON.stringify(result)}${text}`).not.toContain(word)
  })

  it('holds the two forms for a record whose wording is in its file', () => {
    const NL_CHECK = sourceId('nl', 'voorbeeld-inhoudslijn')
    const wording = 'Bedenk een aftrek situatie bij de som.'
    const education = mkdtempSync(join(tmpdir(), 'education-match-'))
    const id = objectiveId('nl', 'einde-po', 'mathematics', 'getallen-1')
    mkdirSync(dirname(join(education, pathForId(id)!)), { recursive: true })
    writeFileSync(join(education, pathForId(id)!), draftObjective({ ...nlObjective, id, level: 'einde-po', code: '', code_key: '', wording_sha256: wordingHash(wording) }, { wording, source: 'Voorbeeldinstituut, doel 1.' }))
    const dutch = lane([part({ source: nlSource.id, checkRendition: NL_CHECK })], { jurisdiction: 'nl', level: 'einde-po', sources: [nlSource.id, NL_CHECK] })
    const result = matchLane(dutch, { education, store: mkdtempSync(join(tmpdir(), 'education-match-store-')), plans: [], pages: () => paged({ 2: 'Doel. Bedenk een aftrek-\nsituatie bij de som.' }) })
    expect(result.records[0]!.form_differences).toEqual([{ kind: 'hyphen', only_in: 'rendition', word: 3, place: { page: 2, offset: 3 }, wording: 'aftrek situatie', rendition: 'aftrek- situatie' }])
  })
})

// --- columns under a header row ------------------------------------------------------

// A word as pdftotext -bbox gives it: five points per letter, ten points tall.
const word = (text: string, x: number, y: number): Box => ({ text, xMin: x, yMin: y, xMax: x + text.length * 5, yMax: y + 10 })

function line(text: string, x: number, y: number): Box[] {
  const boxes: Box[] = []
  let at = x
  for (const piece of text.split(' ')) {
    boxes.push(word(piece, at, y))
    at += piece.length * 5 + 3
  }
  return boxes
}

const LABEL = /^(?:Beginners|Grade \d+ Pupils)$/

describe('a table of columns under a header row', () => {
  // Three columns whose text nearly touches: the first ends at x 196 and the second starts at 200.
  const header = [...line('Beginners', 80, 40), ...line('Grade 1 Pupils', 250, 40), ...line('Grade 2 Pupils', 450, 40)]
  const first = [...line('1. Count the red apples in the bowls', 30, 60), ...line('on the long low shelf.', 44, 74), ...line('2. Sort the wet pebbles by size.', 30, 88)]
  const second = [...line('1. Stack the blocks up to grade 1.', 200, 60), ...line('and count each block again.', 214, 74), ...line('2. Name the flat round shapes.', 200, 88)]
  const third = [...line('1. Tell how many beads are', 400, 60), ...line('left on the string.', 414, 74), ...line('2. Draw the long path home.', 400, 88)]

  it('reads each column as its own text, from the numbers under the header', () => {
    const page = [...line('A title set right across the page above the table', 30, 10), ...header, ...first, ...second, ...third].sort((a, b) => a.yMin - b.yMin || b.xMin - a.xMin)
    expect(tableColumns(page, LABEL)).toEqual([
      'A title set right across the page above the table',
      '1. Count the red apples in the bowls\non the long low shelf.\n2. Sort the wet pebbles by size.',
      '1. Stack the blocks up to grade 1.\nand count each block again.\n2. Name the flat round shapes.',
      '1. Tell how many beads are\nleft on the string.\n2. Draw the long path home.',
    ])
  })

  it('reads two tables on one page one after the other, each by its own header', () => {
    const lower = [...line('Grade 3 Pupils', 60, 140), ...line('Grade 4 Pupils', 330, 140), ...line('1. Fold the square paper twice.', 20, 160), ...line('1. Weigh the two brown eggs.', 300, 160)]
    const columns = tableColumns([...header, ...first, ...second, ...third, ...lower], LABEL)!
    expect(columns.slice(3)).toEqual(['1. Fold the square paper twice.', '1. Weigh the two brown eggs.'])
  })

  it('still reads a header that is drawn twice, a few points apart and split differently', () => {
    const twice = [...header, ...line('Beginners', 84, 41), word('Grade', 254, 41), word('1', 282, 41), word('Pupil', 287, 41), word('s', 312, 41)]
    expect(tableColumns([...twice, ...first, ...second, ...third], LABEL)).toHaveLength(3)
  })

  it('is not misled by a note under the table that runs across its columns, or by a number that ends a line', () => {
    const note = [...line('A note set under the table that runs right across all of its columns and is long', 30, 130), ...line('enough to reach over every one of the places where a column of the table starts', 30, 144)]
    // The first column's line ends in a number at x 189 to 199, seven points before the second column starts.
    const single = [...line('1. Count the red pears in the bowl 1.', 30, 60), ...line('1. Stack the blocks up to grade 1.', 206, 60), ...line('1. Tell how many beads are', 400, 60)]
    const columns = tableColumns([...header, ...single, ...note], LABEL)!
    expect(columns.map((column) => column.split('\n')[0])).toEqual(['1. Count the red pears in the bowl 1.', '1. Stack the blocks up to grade 1.', '1. Tell how many beads are'])
  })

  it('is null for a page without a header row', () => {
    expect(tableColumns([...first, ...second], LABEL)).toBeNull()
  })
})

describe('columns of statements that each open with a mark', () => {
  const MARK = /^−$/
  // A statement: its mark, then its first line ten points further right.
  const statement = (text: string, x: number, y: number): Box[] => [word('−', x, y), ...line(text, x + 10, y)]
  // The first column's line ends at x 299, one point before the mark of the second.
  const first = [
    ...line('Counting', 20, 60),
    ...statement('count the red pears in the old bowl today', 100, 60),
    ...line('and say how many there are', 110, 74),
    ...statement('sort the wet pebbles by size', 300, 60),
    ...statement('work out eight − three with beads', 500, 60),
    ...statement('stack the blocks', 100, 88),
    ...statement('name the flat shapes', 300, 88),
    ...statement('draw the long path home', 500, 88),
  ]
  // The second page: a statement that runs on from the page before, and one mark only.
  const second = [...line('Shapes', 20, 60), ...line('and then count them all again', 310, 60), ...statement('fold the square paper twice', 500, 60)]

  it('reads each column as its own text, by where the marks stand in the whole file', () => {
    const [, one, two] = markedColumns([[], first, second], MARK)
    expect(one).toEqual([
      'Counting',
      '− count the red pears in the old bowl today\nand say how many there are\n− stack the blocks',
      '− sort the wet pebbles by size\n− name the flat shapes',
      '− work out eight − three with beads\n− draw the long path home',
    ])
    expect(two).toEqual(['Shapes', 'and then count them all again', '− fold the square paper twice'])
  })

  it('leaves a page without a mark, and a file whose marks stand under each other nowhere, to the gutters', () => {
    expect(markedColumns([[], first, line('A page of running text without any mark', 20, 60)], MARK)[2]).toBeNull()
    expect(markedColumns([[], [...line('eight − three is five', 20, 60), ...line('and nine − four is five as well', 20, 74)]], MARK)).toEqual([null, null])
  })
})

describe('what the reading by marks knows about its columns', () => {
  const MARK = /^−$/
  const statement = (text: string, x: number, y: number): Box[] => [word('−', x, y), ...line(text, x + 10, y)]
  const page = [
    // The first label carries the mark of a footnote.
    ...line('band 1*', 100, 30),
    ...line('band 2', 300, 30),
    ...line('Counting', 20, 60),
    ...statement('count the red pears in the old bowl today', 100, 60),
    ...line('and say how many there are', 110, 74),
    ...statement('sort the wet pebbles by size', 300, 60),
    ...statement('work out eight − three with beads', 500, 60),
    ...statement('stack the blocks', 100, 88),
    ...statement('name the flat shapes', 300, 88),
    ...statement('draw the long path home', 500, 88),
    // A heading set across the label column that reaches into the first column of statements: its last word starts at x 112.
    ...line('Shapes that we name aloud', 20, 102),
    // A label at the place of a mark.
    ...line('year 3:', 100, 116),
    ...statement('fold the paper', 100, 130),
    word('>', 110, 144),
    ...line('along the line', 120, 144),
    ...line('with care', 120, 158),
    // A footer, far below.
    ...line('a footer', 110, 400),
  ]

  it('sets every statement apart: from its mark to the next mark, label, heading or gap, its own lines and sub-points kept', () => {
    const [, columns] = markedLayout([[], page], MARK, /^band \d(?=\W*$)/)
    expect(columns).toEqual([
      { column: 0, blocks: ['Counting', 'Shapes that we name'] },
      {
        column: 'band 1',
        blocks: ['band 1*', '− count the red pears in the old bowl today\nand say how many there are', '− stack the blocks', 'aloud', 'year 3:', '− fold the paper\n> along the line\nwith care', 'a footer'],
      },
      { column: 'band 2', blocks: ['band 2', '− sort the wet pebbles by size', '− name the flat shapes'] },
      // No line of the third column is a label: it goes by its number.
      { column: 3, blocks: ['− work out eight − three with beads', '− draw the long path home'] },
    ])
  })

  it('keeps what runs on at the top of a column together: a sub-point, its lines, and the sub-point after it', () => {
    const next = [
      // The last line of a sub-point of the statement at the foot of the page before, and one more sub-point.
      ...line('of the long table', 120, 30),
      word('>', 110, 44),
      ...line('and back again', 120, 44),
      ...line('with care', 120, 58),
      ...statement('stack the blocks', 100, 72),
    ]
    expect(markedLayout([[], page, next], MARK)[2]).toEqual([{ column: 1, blocks: ['of the long table\n> and back again\nwith care', '− stack the blocks'] }])
  })

  it('gives the same columns as text, a statement to a line or more', () => {
    expect(markedColumns([[], page], MARK)[1]![3]).toBe('− work out eight − three with beads\n− draw the long path home')
  })

  it('takes the blocks for statements only on a page whose columns of statements all stand under a label', () => {
    // The third column of the page has no label over it.
    expect(pagesByMarks([[], page], MARK, /^band \d(?=\W*$)/)[1]).toMatchObject({ firm: false, names: [0, 'band 1', 'band 2', 3] })
    const labelled = [...page, ...line('band 3', 500, 30)]
    const [, read] = pagesByMarks([[], labelled], MARK, /^band \d(?=\W*$)/)
    expect(read).toMatchObject({ firm: true, names: [0, 'band 1', 'band 2', 'band 3'] })
    // A blank line between two blocks, none inside one.
    expect(read!.columns[3]).toBe('band 3\n\n− work out eight − three with beads\n\n− draw the long path home')
    expect(pagesByMarks([[], page], MARK, /^band \d(?=\W*$)/)[1]!.columns[3]).toBe('− work out eight − three with beads\n− draw the long path home')
  })
})

describe('what the reading by headers knows about its columns', () => {
  it('names each column by the label over it, and leaves what stands above the table unnamed', () => {
    const header = [...line('Beginners', 80, 40), ...line('Grade 1 Pupils', 250, 40)]
    const columns = tableLayout([...line('A title above the table', 30, 10), ...header, ...line('1. Count the red apples.', 30, 60), ...line('1. Stack the blocks.', 200, 60)], LABEL)
    expect(columns).toEqual([
      { text: 'A title above the table' },
      { name: 'Beginners', text: '1. Count the red apples.' },
      { name: 'Grade 1 Pupils', text: '1. Stack the blocks.' },
    ])
  })
})
