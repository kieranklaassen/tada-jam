import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Lane } from '../manifest.ts'
import { CA_FILE, CA_WORDING, NL_FILE, caObjective, caSource, nlObjective, nlSource, sampleTree } from './fixtures.ts'
import { placeVerifier } from './match.ts'
import { draftObjective, parseRecord, replaceFrontmatter, replaceRegion, withMarker } from './record.ts'
import { DIFFERENCE_BY_DESIGN, formatGate, formatLane, formatPlaces, gateFailures, gateOf, gatePasses, joinTree, report } from './review-join.ts'
import type { JoinOptions } from './review-join.ts'
import { REASONS, recordHashes, reviewPath, serialiseReview } from './review.ts'
import type { Reason, Unrecorded, Verdict } from './review.ts'
import { DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS, ENGLISH_GLOSS, SAME_FILE, SUMMARY, objectiveId, parseId, pathForId } from './schema.ts'
import { wordingHash } from './normalise.ts'
import { putWording } from './store.ts'

const CA_LANE = 'us-ca/kindergarten/mathematics'
const NL_LANE = 'nl/fase-1/mathematics'

function lane(key: string, source: string): Lane {
  const [jurisdiction, level, subject] = key.split('/') as [Lane['jurisdiction'], string, Lane['subject']]
  return {
    jurisdiction,
    level,
    subject,
    title: `${level} ${subject}`,
    sources: [source],
    parts: [{ name: 'All of it', source, checkRendition: SAME_FILE, checkStrength: 'second-reading', checkGranularity: 'The same rows.', expectedCount: 1, selection: { kind: 'statements', locate: 'By its number.', statements: [] } }],
    expectedCount: 1,
    countingMethod: 'Counted in the example file.',
    countIsFromImportFile: false,
    domains: [],
    granularity: 'One record per statement.',
    skipped: [],
  }
}

const manifest = [lane(CA_LANE, caSource.id), lane(NL_LANE, nlSource.id)]

const NOTES = withMarker(DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS.map((heading) => `${heading}\n\nA child moves apples one at a time.`).join('\n\n'))

// The sample tree with every agent region written.
function writtenTree(): Record<string, string> {
  const tree = sampleTree()
  const ca = replaceRegion(tree[CA_FILE]!, SUMMARY, withMarker(SUMMARY, 'Says how many apples there are, as far as ten.'))
  const nl = replaceRegion(tree[NL_FILE]!, ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples, up to and including ten.'))
  return { ...tree, [CA_FILE]: replaceRegion(ca, DESIGN_NOTES, NOTES), [NL_FILE]: replaceRegion(nl, DESIGN_NOTES, NOTES) }
}

// A verdict bound to a record file's text as it is now. Confirming unless told otherwise.
function verdict(recordText: string, over: Partial<Verdict> = {}): Verdict {
  return {
    ...recordHashes(parseRecord(recordText)),
    verdict: 'confirmed',
    rendition: SAME_FILE,
    place: { page: 3, offset: 120 },
    matched_by: 'script',
    checker: 'batch-all',
    round: 1,
    ...over,
  }
}

function reviewOf(laneKey: string, verdicts: Verdict[], unrecorded: Unrecorded[] = []): Record<string, string> {
  return { [reviewPath(laneKey)]: serialiseReview({ lane: laneKey, verdicts, unrecorded }) }
}

function join_(tree: Record<string, string>, options: JoinOptions = {}): ReturnType<typeof joinTree> {
  const root = mkdtempSync(join(tmpdir(), 'education-join-'))
  for (const [path, text] of Object.entries(tree)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return joinTree(root, { manifest, ...options })
}

function rules(result: ReturnType<typeof joinTree>): string[] {
  return result.findings.map((finding) => `${finding.file} ${finding.rule}`)
}

// The written tree with `count` more records in its California lane, named
// k-cc-2 onward, their files, and the manifest that expects that many.
function caLaneOf(count: number): { tree: Record<string, string>; files: string[]; expecting: JoinOptions } {
  const tree = writtenTree()
  const files: string[] = []
  for (let n = 2; n < count + 2; n += 1) {
    const id = objectiveId('us-ca', 'kindergarten', 'mathematics', `k-cc-${n}`)
    const file = pathForId(id)!
    tree[file] = draftObjective({ ...caObjective, id, code: `K.CC.${n}`, code_key: `K.CC.${n}`, wording_sha256: wordingHash(`Count ${n} apples.`) })
    files.push(file)
  }
  return { tree, files, expecting: { manifest: [{ ...lane(CA_LANE, caSource.id), expectedCount: count + 1 }, lane(NL_LANE, nlSource.id)] } }
}

describe('the state of a record', () => {
  it('is unchecked, and counted, when no verdict names it', () => {
    const result = join_(writtenTree())
    expect(result.states.get(caObjective.id)).toEqual({ id: caObjective.id, file: CA_FILE, lane: CA_LANE, state: 'unchecked' })
    expect(result.states.get(nlObjective.id)!.state).toBe('unchecked')
    expect(result.states.size).toBe(2)
    expect(result.lanes.get(CA_LANE)).toEqual({
      records: 1,
      counts: { confirmed: 0, unconfirmed: 0, stale: 0, unchecked: 1 },
      reasons: {},
      unrecorded: { explained: 0, unexplained: 0 },
    })
    expect(result.findings).toEqual([])
    expect(gateFailures(result)).toEqual(['2 record(s) unchecked'])
  })

  it('is confirmed by a confirming verdict bound to its text, and the gate passes when every record is', () => {
    const tree = writtenTree()
    const result = join_({ ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) })
    expect(result.states.get(caObjective.id)).toEqual({ id: caObjective.id, file: CA_FILE, lane: CA_LANE, state: 'confirmed' })
    expect(result.lanes.get(NL_LANE)!.counts).toEqual({ confirmed: 1, unconfirmed: 0, stale: 0, unchecked: 0 })
    expect(gateFailures(result)).toEqual([])
  })

  it('is unconfirmed, with the reason and the difference, after a verdict of wording-differs', () => {
    const tree = writtenTree()
    const note = 'The rendition says twenty where the record says ten.'
    const result = join_({ ...tree, ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!, { verdict: 'unconfirmed', reason: 'wording-differs', note })]) })
    expect(result.states.get(nlObjective.id)).toEqual({ id: nlObjective.id, file: NL_FILE, lane: NL_LANE, state: 'unconfirmed', reason: 'wording-differs', note })
    expect(result.lanes.get(NL_LANE)!.counts.unconfirmed).toBe(1)
    expect(result.lanes.get(NL_LANE)!.reasons).toEqual({ 'wording-differs': 1 })
  })

  it('is stale, not confirmed, when the wording hash no longer matches the record', () => {
    const tree = writtenTree()
    const review = reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)])
    const reimported = replaceFrontmatter(tree[CA_FILE]!, { ...parseRecord(tree[CA_FILE]!).frontmatter, wording_sha256: wordingHash('Count the pears in a basket up to ten.') })
    const result = join_({ ...tree, [CA_FILE]: reimported, ...review })
    expect(result.states.get(caObjective.id)!.state).toBe('stale')
    expect(result.lanes.get(CA_LANE)!.counts).toEqual({ confirmed: 0, unconfirmed: 0, stale: 1, unchecked: 0 })
    expect(gateFailures(result)).toContain('1 record(s) stale')
  })

  it('is stale when a Dutch record’s gloss changes after its verdict', () => {
    const tree = writtenTree()
    const review = reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)])
    const reglossed = replaceRegion(tree[NL_FILE]!, ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples in a basket, to ten at most.'))
    expect(join_({ ...tree, ...review }).states.get(nlObjective.id)!.state).toBe('confirmed')
    expect(join_({ ...tree, [NL_FILE]: reglossed, ...review }).states.get(nlObjective.id)!.state).toBe('stale')
  })

  it('is confirmed when two renditions split the statement differently and the joined content is equal', () => {
    const tree = writtenTree()
    const result = join_({ ...tree, ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!, { matched_by: 'agent', granularity_differs: true, note: 'One goal here, two lettered parts there.' })]) })
    expect(result.findings).toEqual([])
    expect(result.states.get(nlObjective.id)!.state).toBe('confirmed')
  })
})

describe('the fix round', () => {
  const tree = writtenTree()
  const first = verdict(tree[CA_FILE]!, { verdict: 'unconfirmed', reason: 'summary-or-gloss-unfaithful', note: 'The summary says twenty.' })
  const corrected = replaceRegion(tree[CA_FILE]!, SUMMARY, withMarker(SUMMARY, 'Says how many apples a basket holds, no more than ten.'))

  it('leaves a corrected record stale until its new verdict arrives', () => {
    expect(join_({ ...tree, ...reviewOf(CA_LANE, [first]) }).states.get(caObjective.id)!.state).toBe('unconfirmed')
    expect(join_({ ...tree, [CA_FILE]: corrected, ...reviewOf(CA_LANE, [first]) }).states.get(caObjective.id)!.state).toBe('stale')
  })

  it('then takes the round 2 verdict bound to the new text: confirmed, or unconfirmed', () => {
    const confirming = verdict(corrected, { round: 2, checker: 'fix-round' })
    const failing = verdict(corrected, { round: 2, checker: 'fix-round', verdict: 'unconfirmed', reason: 'notes-contradict' })
    expect(join_({ ...tree, [CA_FILE]: corrected, ...reviewOf(CA_LANE, [confirming, first]) }).states.get(caObjective.id)!.state).toBe('confirmed')
    const state = join_({ ...tree, [CA_FILE]: corrected, ...reviewOf(CA_LANE, [first, failing]) }).states.get(caObjective.id)!
    expect(state).toMatchObject({ state: 'unconfirmed', reason: 'notes-contradict' })
    expect(state.note).toBeUndefined()
  })
})

describe('the place a script-matched verdict states', () => {
  const tree = writtenTree()
  const files = { ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!, { matched_by: 'agent' })]) }

  it('rejects a confirming verdict when the wording is not there', () => {
    const asked: string[] = []
    const result = join_(files, {
      verifyPlace: (checked, record) => {
        asked.push(`${checked.id} ${String(record.frontmatter.id)}`)
        return false
      },
    })
    // Only the script-matched verdict is asked about.
    expect(asked).toEqual([`${caObjective.id} ${caObjective.id}`])
    const state = result.states.get(caObjective.id)!
    expect(state).toMatchObject({ state: 'unconfirmed', reason: 'not-found-in-rendition' })
    expect(state.note).toContain('not at the stated place')
    expect(result.lanes.get(CA_LANE)!.reasons).toEqual({ 'not-found-in-rendition': 1 })
    expect(result.states.get(nlObjective.id)!.state).toBe('confirmed')
  })

  it('keeps it when the wording is there, or when the place cannot be looked up', () => {
    expect(join_(files, { verifyPlace: () => true }).states.get(caObjective.id)!.state).toBe('confirmed')
    expect(join_(files, { verifyPlace: () => null }).states.get(caObjective.id)!.state).toBe('confirmed')
  })

  it('asks the matcher, which reads the rendition again: a place that does not hold the wording is rejected', () => {
    const store = mkdtempSync(join(tmpdir(), 'education-join-store-'))
    putWording(store, CA_WORDING)
    // The same file read again: an invented page three holds the wording after two other words.
    const verifyPlace = placeVerifier({ store, plans: [], pages: () => ({ pages: ['', 'A page about something else.', '', `Row one. ${CA_WORDING}`] }) })
    const at = (place: Verdict['place']): ReturnType<typeof joinTree> => join_({ ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!, { place })]) }, { verifyPlace })
    expect(at({ page: 3, offset: 2 }).states.get(caObjective.id)!.state).toBe('confirmed')
    const wrong = at({ page: 1, offset: 0 })
    expect(wrong.states.get(caObjective.id)).toMatchObject({ state: 'unconfirmed', reason: 'not-found-in-rendition' })
    expect(wrong.states.get(caObjective.id)!.note).toContain('page 1, offset 0')
    expect(wrong.lanes.get(CA_LANE)!.counts).toEqual({ confirmed: 0, unconfirmed: 1, stale: 0, unchecked: 0 })
    // Without the store the place cannot be looked up, and the verdict stands.
    const absent = placeVerifier({ store: join(store, 'absent'), plans: [] })
    expect(join_({ ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!, { place: { page: 1, offset: 0 } })]) }, { verifyPlace: absent }).states.get(caObjective.id)!.state).toBe('confirmed')
  })
})

describe('the places that could not be looked up', () => {
  const tree = writtenTree()
  const CA_SOURCE = parseId(caSource.id)!.slug
  // Both verdicts are script-matched; the Dutch one names its rendition by slug.
  const files = { ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!, { rendition: parseId(nlSource.id)!.slug })]) }

  it('counts the script-matched confirming verdicts, those verified, and those nobody could tell about, with the rendition each names', () => {
    const told = join_(files, { verifyPlace: (each) => (each.id === caObjective.id ? null : true) })
    expect(told.places).toEqual({ scripted: 2, verified: 1, unknown: [{ id: caObjective.id, rendition: CA_SOURCE }] })
    // The record stays confirmed: what fails is the gate of a machine with the store.
    expect(told.states.get(caObjective.id)!.state).toBe('confirmed')
    expect(told.findings).toEqual([])
    // Without the store nobody is asked, and nothing is unknown.
    expect(join_(files).places).toEqual({ scripted: 2, verified: 0, unknown: [] })
    // A place that does not hold the wording is neither: its record is unconfirmed.
    expect(join_(files, { verifyPlace: () => false }).places).toEqual({ scripted: 2, verified: 0, unknown: [] })
    // A verdict an agent matched, an unconfirming one and a stale one are not asked about.
    const others = { ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!, { matched_by: 'agent' })]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!, { verdict: 'unconfirmed', reason: 'code-differs' })]) }
    expect(join_(others, { verifyPlace: () => null }).places).toEqual({ scripted: 0, verified: 0, unknown: [] })
  })

  it('the verifier over a store that lacks the rendition says which rendition it could not read, and the gate fails', () => {
    const store = mkdtempSync(join(tmpdir(), 'education-join-empty-store-'))
    // The store is there, and it holds no plan and no file for the source.
    const verifyPlace = placeVerifier({ store, plans: [] })
    const result = join_(files, { verifyPlace })
    expect(result.places.unknown.map((each) => each.rendition).sort()).toEqual([CA_SOURCE, parseId(nlSource.id)!.slug].sort())
    const unreadable = verifyPlace.unreadable()
    expect(unreadable.map((each) => each.rendition).sort()).toEqual([CA_SOURCE, parseId(nlSource.id)!.slug].sort())
    for (const each of unreadable) expect(each.why).not.toBe('')

    // Every record is confirmed, and the gate of the join alone would pass.
    expect(gatePasses(gateOf(result))).toBe(true)
    const gate = report('gate', result, unreadable)
    expect(gate.status).toBe(1)
    expect(gate.out).toEqual([])
    const text = gate.err.join('\n')
    expect(text).toContain('the place of 2 script-matched verdict(s) could not be looked up (0 could, and hold the wording):')
    expect(text).toContain(`    ${CA_SOURCE}: 1 verdict(s)`)
    expect(text).toContain(`  renditions that could not be read:\n    ${unreadable[0]!.rendition}: ${unreadable[0]!.why.split('\n')[0]}`)
    expect(gate.err.at(-1)).toContain('education gate (second check) failed: the place of 2 script-matched verdict(s) could not be looked up')

    // The plain command and --summary say it as a notice and do not fail for it.
    for (const mode of ['verify', 'summary'] as const) {
      const plain = report(mode, result, unreadable)
      expect(plain.status).toBe(0)
      expect(plain.out.join('\n')).toContain('notice (places-not-looked-up): the place of 2 script-matched verdict(s) could not be looked up')
      expect(plain.out.at(-1)).toContain('education verify passed: 2 record(s)')
    }
  })

  it('passes the gate when every place was looked up, and says how many were verified', () => {
    const result = join_(files, { verifyPlace: () => true })
    const gate = report('gate', result, [])
    expect(gate).toEqual({ out: [expect.stringContaining('education gate (second check) passed: 2 record(s)'), 'the place of 2 script-matched verdict(s) was looked up in the store, and each holds the wording'], err: [], status: 0 })
    expect(report('verify', result, []).out.join('\n')).not.toContain('notice (places-not-looked-up)')
  })

  it('keeps "cannot tell" as confirmed where there is no store, and says that nothing was looked up', () => {
    const result = join_(files)
    const gate = report('gate', result)
    expect(gate.status).toBe(0)
    expect(gate.out.at(-1)).toBe('the place of 2 script-matched verdict(s) was not looked up: there is no wording store on this machine')
    expect(formatPlaces(result.places)).toEqual({ lines: [gate.out.at(-1)], lookedUp: true })
    expect(report('verify', result).status).toBe(0)
  })

  it('says so when a place is unknown though every rendition was read', () => {
    const result = join_(files, { verifyPlace: (each) => (each.id === caObjective.id ? null : true) })
    const { lines, lookedUp } = formatPlaces(result.places, [])
    expect(lookedUp).toBe(false)
    expect(lines[0]).toBe('the place of 1 script-matched verdict(s) could not be looked up (1 could, and hold the wording):')
    expect(lines.at(-1)).toContain('every rendition was read')
    expect(report('gate', result, []).status).toBe(1)
  })

  it('a failing gate still fails with its own lines, and adds the places that could not be looked up', () => {
    const unchecked = { ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)]) }
    const result = join_(unchecked, { verifyPlace: () => null })
    const gate = report('gate', result, [{ rendition: CA_SOURCE, why: 'the file is not in the store' }])
    expect(gate.status).toBe(1)
    const text = gate.err.join('\n')
    expect(text).toContain(`${NL_LANE}\n  unchecked: 1`)
    expect(text).toContain('the place of 1 script-matched verdict(s) could not be looked up')
    expect(text).toContain(`    ${CA_SOURCE}: the file is not in the store`)
  })

  it('on the real tree with a store that holds nothing: every script-matched place is unknown, the renditions are named, and the gate fails', () => {
    const empty = mkdtempSync(join(tmpdir(), 'education-join-empty-store-'))
    const verifyPlace = placeVerifier({ store: empty })
    const result = joinTree(resolve(import.meta.dirname, '..'), { verifyPlace })
    expect(result.places.scripted).toBeGreaterThan(3000)
    expect(result.places.verified).toBe(0)
    expect(result.places.unknown).toHaveLength(result.places.scripted)
    const unreadable = verifyPlace.unreadable()
    expect(unreadable.length).toBeGreaterThan(20)
    // The same tree passes its gate where nothing is looked up, which is what CI runs.
    expect(gatePasses(gateOf(result))).toBe(true)
    const gate = report('gate', result, unreadable)
    expect(gate.status).toBe(1)
    expect(gate.err.at(-1)).toContain(`the place of ${result.places.scripted} script-matched verdict(s) could not be looked up`)
  })
})

describe('what the join reports', () => {
  it('reports a verdict whose rendition is neither same-file nor the slug of a source record, once per rendition and file', () => {
    const { tree, files, expecting } = caLaneOf(2)
    const slug = parseId(caSource.id)!.slug
    const verdicts = [verdict(tree[CA_FILE]!, { rendition: slug }), verdict(tree[files[0]!]!, { rendition: 'a-source-nobody-recorded' }), verdict(tree[files[1]!]!, { rendition: 'a-source-nobody-recorded', matched_by: 'agent' })]
    const result = join_({ ...tree, ...reviewOf(CA_LANE, verdicts), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }, expecting)
    expect(result.findings).toEqual([
      {
        file: reviewPath(CA_LANE),
        line: 1,
        rule: 'verdict-rendition-unknown',
        message: '2 verdict(s) name the rendition a-source-nobody-recorded, which is neither same-file nor the slug of a source record: what they were checked against cannot be read again',
      },
    ])
    // The records keep their state, and the gate fails on the finding.
    expect([...result.states.values()].every((state) => state.state === 'confirmed')).toBe(true)
    const gate = gateOf(result)
    expect(gate.findings.map((finding) => finding.rule)).toEqual(['verdict-rendition-unknown'])
    expect(gatePasses(gate)).toBe(false)
    // The slug of a source record of the tree, and same-file, are known.
    const known = [verdict(tree[CA_FILE]!, { rendition: slug }), verdict(tree[files[0]!]!), verdict(tree[files[1]!]!, { rendition: parseId(nlSource.id)!.slug })]
    expect(join_({ ...tree, ...reviewOf(CA_LANE, known), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }, expecting).findings).toEqual([])
  })

  it('the real tree names no rendition it does not hold', () => {
    const result = joinTree(resolve(import.meta.dirname, '..'))
    expect(result.findings.filter((finding) => finding.rule === 'verdict-rendition-unknown')).toEqual([])
  })

  it('reports a verdict that names an id no record has', () => {
    const tree = writtenTree()
    const ghost = objectiveId('us-ca', 'kindergarten', 'mathematics', 'k-cc-99')
    const result = join_({ ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!), verdict(tree[CA_FILE]!, { id: ghost })]) })
    expect(rules(result)).toEqual([`${reviewPath(CA_LANE)} verdict-names-no-record`])
    expect(result.findings[0]!.message).toContain(ghost)
    expect(result.states.has(ghost)).toBe(false)
    expect(gateFailures(result)).toContain('1 finding(s)')
  })

  it('passes on a reason outside the closed list as a finding, and counts nothing from that file', () => {
    const tree = writtenTree()
    const bad = JSON.stringify({ lane: CA_LANE, verdicts: [{ ...verdict(tree[CA_FILE]!), verdict: 'unconfirmed', reason: 'looks-wrong' }], unrecorded: [] })
    const result = join_({ ...tree, [reviewPath(CA_LANE)]: bad })
    expect(rules(result)).toEqual([`${reviewPath(CA_LANE)} review-reason`])
    expect(result.states.get(caObjective.id)!.state).toBe('unchecked')
  })

  it('reports a review file whose lane is not its path, and one whose lane the manifest does not hold', () => {
    const tree = writtenTree()
    const misplaced = { 'reviews/us-ca/grade-1/mathematics.json': serialiseReview({ lane: CA_LANE, verdicts: [verdict(tree[CA_FILE]!)], unrecorded: [] }) }
    const wrongPath = join_({ ...tree, ...misplaced })
    expect(rules(wrongPath)).toEqual(['reviews/us-ca/grade-1/mathematics.json review-path'])
    expect(wrongPath.states.get(caObjective.id)!.state).toBe('unchecked')
    const unknown = join_({ ...tree, ...reviewOf('us-ca/grade-1/mathematics', []) })
    expect(rules(unknown)).toEqual(['reviews/us-ca/grade-1/mathematics.json review-lane-unknown'])
  })

  it('notes a likely importer fault when more than a fifth of a lane’s verdicts fail for one reason, and does not fail the gate for it', () => {
    const { tree, files, expecting } = caLaneOf(5)
    const failing = (file: string): Verdict => verdict(tree[file]!, { verdict: 'unconfirmed', reason: 'code-differs' })
    const verdicts = [verdict(tree[CA_FILE]!), ...files.map((file) => verdict(tree[file]!))]
    const dutch = reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)])
    // Two of six records, a third.
    const third = join_({ ...tree, ...dutch, ...reviewOf(CA_LANE, [...verdicts.slice(0, 4), failing(files[3]!), failing(files[4]!)]) }, expecting)
    expect(third.notices).toEqual([
      {
        lane: CA_LANE,
        rule: 'likely-importer-fault',
        message: `${CA_LANE}: 2 of 6 checked record(s) are unconfirmed for the reason code-differs, more than a fifth: likely a fault of the importer or the extractor, not of the records`,
      },
    ])
    expect(third.findings).toEqual([])
    expect(third.lanes.get(CA_LANE)!.reasons).toEqual({ 'code-differs': 2 })
    expect(gateFailures(third)).toEqual([])
    // One of six is under a fifth; two of six for two different reasons is no shared reason.
    expect(join_({ ...tree, ...reviewOf(CA_LANE, [...verdicts.slice(0, 5), failing(files[4]!)]) }, expecting).notices).toEqual([])
    const mixed = [...verdicts.slice(0, 4), failing(files[3]!), verdict(tree[files[4]!]!, { verdict: 'unconfirmed', reason: 'notes-contradict' })]
    expect(join_({ ...tree, ...reviewOf(CA_LANE, mixed) }, expecting).notices).toEqual([])
  })

  it('calls it a likely importer fault only for a reason an importer or an extractor can cause', () => {
    const { tree, files, expecting } = caLaneOf(5)
    const rulesFor = (reason: Reason): string[] => {
      const failing = (file: string): Verdict => verdict(tree[file]!, { verdict: 'unconfirmed', reason, ...(reason === 'wording-differs' ? { note: 'Ten there, twenty here.' } : {}) })
      const verdicts = [verdict(tree[CA_FILE]!), ...files.slice(0, 3).map((file) => verdict(tree[file]!)), failing(files[3]!), failing(files[4]!)]
      return join_({ ...tree, ...reviewOf(CA_LANE, verdicts) }, expecting).notices.map((notice) => notice.rule)
    }
    for (const reason of ['wording-differs', 'code-differs', 'extraction-artefact', 'not-found-in-rendition'] as const) expect(rulesFor(reason), reason).toEqual(['likely-importer-fault'])
    for (const reason of ['summary-or-gloss-unfaithful', 'notes-contradict'] as const) expect(rulesFor(reason), reason).toEqual(['likely-writing-fault'])
    // A rendition that could not be read is the fault of neither.
    expect(rulesFor('rendition-unavailable')).toEqual([])
    // Every reason of the closed list is one of the three.
    expect(REASONS).toHaveLength(7)
  })

  it('notes a likely fault in how the lane was written when more than a fifth fail for a reason that is the writer\'s, and says so', () => {
    const { tree, files, expecting } = caLaneOf(5)
    const failing = (file: string): Verdict => verdict(tree[file]!, { verdict: 'unconfirmed', reason: 'summary-or-gloss-unfaithful' })
    const verdicts = [verdict(tree[CA_FILE]!), ...files.slice(0, 3).map((file) => verdict(tree[file]!)), failing(files[3]!), failing(files[4]!)]
    const result = join_({ ...tree, ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]), ...reviewOf(CA_LANE, verdicts) }, expecting)
    expect(result.notices).toEqual([
      {
        lane: CA_LANE,
        rule: 'likely-writing-fault',
        message: `${CA_LANE}: 2 of 6 checked record(s) are unconfirmed for the reason summary-or-gloss-unfaithful, more than a fifth: likely a fault in how the lane was written, not of the importer or the extractor`,
      },
    ])
    expect(result.notices[0]!.message).not.toContain('likely a fault of the importer')
    expect(gateFailures(result)).toEqual([])
  })

  it('does not call exactly a fifth a likely importer fault', () => {
    const { tree, files, expecting } = caLaneOf(4)
    const verdicts = [verdict(tree[CA_FILE]!, { verdict: 'unconfirmed', reason: 'code-differs' }), ...files.map((file) => verdict(tree[file]!))]
    expect(join_({ ...tree, ...reviewOf(CA_LANE, verdicts) }, expecting).notices).toEqual([])
  })

  it('notes nothing for a lane of four checked records, however many of them fail', () => {
    const { tree, files, expecting } = caLaneOf(3)
    const failing = (file: string): Verdict => verdict(tree[file]!, { verdict: 'unconfirmed', reason: 'code-differs' })
    const four = join_({ ...tree, ...reviewOf(CA_LANE, [failing(CA_FILE), failing(files[0]!), verdict(tree[files[1]!]!), verdict(tree[files[2]!]!)]) }, expecting)
    expect(four.lanes.get(CA_LANE)!.counts).toEqual({ confirmed: 2, unconfirmed: 2, stale: 0, unchecked: 0 })
    expect(four.notices).toEqual([])
    expect(four.findings).toEqual([])
    // Five checked of six records: the unchecked one does not count, and two of five is more than a fifth.
    const six = caLaneOf(5)
    const five = [verdict(six.tree[CA_FILE]!, { verdict: 'unconfirmed', reason: 'code-differs' }), verdict(six.tree[six.files[0]!]!, { verdict: 'unconfirmed', reason: 'code-differs' }), ...six.files.slice(1, 4).map((file) => verdict(six.tree[file]!))]
    expect(join_({ ...six.tree, ...reviewOf(CA_LANE, five) }, six.expecting).notices.map((notice) => notice.rule)).toEqual(['likely-importer-fault'])
  })

  it('reports the lane and the code when the check rendition holds a code no record carries', () => {
    const tree = writtenTree()
    const entry: Unrecorded = { rendition: 'example-counting-standards-pdf', code: 'K.CC.9', place: { page: 13 } }
    const reviews = { ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)], [entry]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }
    const result = join_({ ...tree, ...reviews })
    expect(rules(result)).toEqual([`${reviewPath(CA_LANE)} unrecorded`])
    expect(result.findings[0]!.message).toContain(CA_LANE)
    expect(result.findings[0]!.message).toContain('K.CC.9')
    expect(result.findings[0]!.message).toContain('page 13')
    expect(result.lanes.get(CA_LANE)!.unrecorded).toEqual({ explained: 0, unexplained: 1 })
    expect(gateFailures(result)).toEqual(['1 finding(s)'])
  })

  it('counts an explained one without failing the gate', () => {
    const tree = writtenTree()
    const entry: Unrecorded = { rendition: 'example-counting-standards-pdf', code: 'K.CC.9', place: { page: 13 }, explained: 'Placeholder row, skipped by the manifest.' }
    const reviews = { ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)], [entry]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }
    const result = join_({ ...tree, ...reviews })
    expect(result.lanes.get(CA_LANE)!.unrecorded).toEqual({ explained: 1, unexplained: 0 })
    expect(gateFailures(result)).toEqual([])
  })

  it('reports a lane that holds more records than its manifest entry expects, though each of them is confirmed', () => {
    // Two records in a lane the manifest counts one for.
    const { tree, files } = caLaneOf(1)
    const reviews = { ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!), verdict(tree[files[0]!]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }
    const result = join_({ ...tree, ...reviews })
    expect([...result.states.values()].map((state) => state.state)).toEqual(['confirmed', 'confirmed', 'confirmed'])
    expect(result.findings).toEqual([{ file: `corpus/${CA_LANE}`, line: 1, rule: 'lane-count', message: 'the lane holds 2 record(s) and its manifest entry expects 1' }])
    expect(gateFailures(result)).toEqual(['1 finding(s)'])
  })

  it('reports a lane that holds fewer records than expected, and none when a nothing-published lane holds none', () => {
    const tree = writtenTree()
    const without = Object.fromEntries(Object.entries(tree).filter(([file]) => file !== NL_FILE))
    const short = join_({ ...without, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)]) })
    expect(short.findings).toEqual([{ file: `corpus/${NL_LANE}`, line: 1, rule: 'lane-count', message: 'the lane holds 0 record(s) and its manifest entry expects 1' }])
    const nothing: Lane = { ...lane('nl/einde-po/practical-life-feelings', nlSource.id), sources: [], parts: [], expectedCount: 0, nothingPublished: 'The example institute sets no goals here.' }
    expect(join_(tree, { manifest: [...manifest, nothing] }).findings).toEqual([])
    // The same lane with a record in it is off by one.
    const stray = objectiveId('nl', 'einde-po', 'practical-life-feelings', 'doel-1')
    const strayed = join_({ ...tree, [pathForId(stray)!]: draftObjective({ ...nlObjective, id: stray, level: 'einde-po', subject: 'practical-life-feelings' }, { wording: 'Verzonnen doel.', source: 'Voorbeeldinstituut.' }) }, { manifest: [...manifest, nothing] })
    expect(rules(strayed)).toEqual(['corpus/nl/einde-po/practical-life-feelings lane-count'])
  })

  it('prints a lane as records, confirmed, unconfirmed by reason, stale, unchecked and unrecorded', () => {
    const line = formatLane(CA_LANE, {
      records: 9,
      counts: { confirmed: 4, unconfirmed: 3, stale: 1, unchecked: 1 },
      reasons: { 'wording-differs': 2, 'code-differs': 1 },
      unrecorded: { explained: 1, unexplained: 2 },
    })
    expect(line).toBe(`${CA_LANE}  records 9  confirmed 4  unconfirmed 3 (wording-differs 2, code-differs 1)  stale 1  unchecked 1  unrecorded 3 (2 unexplained)`)
  })
})

describe('the final gate', () => {
  const NOTE = 'The other rendition adds a clarification.'
  const differing = (text: string): Verdict => verdict(text, { verdict: 'unconfirmed', reason: 'wording-differs', note: NOTE })

  it('passes when every record is confirmed, and says how many records it saw', () => {
    const tree = writtenTree()
    const gate = gateOf(join_({ ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }))
    expect(gate).toEqual({ records: 2, differing: 0, lanes: [], findings: [] })
    expect(gatePasses(gate)).toBe(true)
    expect(formatGate(gate)).toEqual([expect.stringContaining('passed: 2 record(s)')])
  })

  it('allows a record that is unconfirmed because two renditions differ, and counts it', () => {
    expect(DIFFERENCE_BY_DESIGN).toBe('wording-differs')
    const tree = writtenTree()
    const gate = gateOf(join_({ ...tree, ...reviewOf(CA_LANE, [differing(tree[CA_FILE]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }))
    expect(gate).toEqual({ records: 2, differing: 1, lanes: [], findings: [] })
    expect(gatePasses(gate)).toBe(true)
    expect(formatGate(gate)[0]).toContain('1 record(s) unconfirmed for the reason wording-differs, which the gate allows')
    // What a checker noted is in the review file; the gate does not print it.
    expect(formatGate(gate).join('\n')).not.toContain(NOTE)
  })

  it('fails on a record unconfirmed for any other reason, and names the lane, the record and the reason', () => {
    for (const reason of REASONS.filter((each) => each !== 'wording-differs')) {
      const tree = writtenTree()
      const failing = verdict(tree[CA_FILE]!, { verdict: 'unconfirmed', reason })
      const gate = gateOf(join_({ ...tree, ...reviewOf(CA_LANE, [failing]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }))
      expect(gate.lanes).toEqual([{ lane: CA_LANE, stale: [], unchecked: [], unconfirmed: [{ id: caObjective.id, reason }], unexplained: [] }])
      expect(gatePasses(gate)).toBe(false)
      const text = formatGate(gate).join('\n')
      expect(text).toContain(`${CA_LANE}\n  unconfirmed for another reason than wording-differs: 1\n    ${caObjective.id} (${reason})`)
      expect(text).not.toContain(NL_LANE)
    }
  })

  it('fails on a record with no verdict and on one changed after its verdict, each under its lane', () => {
    const tree = writtenTree()
    const reglossed = replaceRegion(tree[NL_FILE]!, ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples, to ten at most.'))
    const gate = gateOf(join_({ ...tree, [NL_FILE]: reglossed, ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }))
    expect(gate.lanes).toEqual([
      { lane: CA_LANE, stale: [], unchecked: [caObjective.id], unconfirmed: [], unexplained: [] },
      { lane: NL_LANE, stale: [nlObjective.id], unchecked: [], unconfirmed: [], unexplained: [] },
    ])
    const lines = formatGate(gate)
    expect(lines.slice(0, 6)).toEqual([CA_LANE, '  unchecked: 1', `    ${caObjective.id}`, NL_LANE, '  stale: 1', `    ${nlObjective.id}`])
    expect(lines.at(-1)).toContain('failed in 2 lane(s): 1 stale, 1 unchecked')
  })

  it('fails on a statement of the check rendition that no record carries and nobody explained, and passes once it is explained', () => {
    const tree = writtenTree()
    const entry: Unrecorded = { rendition: 'example-counting-standards-pdf', code: 'K.CC.9', place: { page: 13 } }
    const reviews = (unrecorded: Unrecorded): Record<string, string> => ({ ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)], [unrecorded]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) })
    const gate = gateOf(join_({ ...tree, ...reviews(entry) }))
    expect(gate.lanes.map((lane) => [lane.lane, lane.unexplained.length])).toEqual([[CA_LANE, 1]])
    expect(gate.lanes[0]!.unexplained[0]).toContain('K.CC.9')
    expect(gate.findings).toEqual([])
    expect(formatGate(gate).join('\n')).toContain(`${CA_LANE}\n  in the check rendition, with no record and no explanation: 1\n    ${CA_LANE}: example-counting-standards-pdf holds code K.CC.9`)

    expect(gatePasses(gateOf(join_({ ...tree, ...reviews({ ...entry, explained: 'Placeholder row, skipped by the manifest.' }) })))).toBe(true)
  })

  it('fails on a finding that belongs to no lane, such as a verdict that names no record', () => {
    const tree = writtenTree()
    const ghost = { ...verdict(tree[CA_FILE]!), id: objectiveId('us-ca', 'kindergarten', 'mathematics', 'k-cc-99') }
    const gate = gateOf(join_({ ...tree, ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!), ghost]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }))
    expect(gate.lanes).toEqual([])
    expect(gate.findings.map((finding) => finding.rule)).toEqual(['verdict-names-no-record'])
    expect(gatePasses(gate)).toBe(false)
    expect(formatGate(gate).at(-1)).toContain('1 other finding(s)')
  })

  it('fails on a lane with a record too many, and prints the lane and both numbers', () => {
    const { tree, files } = caLaneOf(1)
    const reviews = { ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!), verdict(tree[files[0]!]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }
    const gate = gateOf(join_({ ...tree, ...reviews }))
    expect(gate.lanes).toEqual([])
    expect(gate.findings.map((finding) => finding.rule)).toEqual(['lane-count'])
    expect(gatePasses(gate)).toBe(false)
    expect(formatGate(gate).join('\n')).toContain(`education/corpus/${CA_LANE}:1  lane-count  the lane holds 2 record(s) and its manifest entry expects 1`)
  })

  it('fails on a confirming verdict whose wording is not at the place it states, when the store lets that be looked up', () => {
    const tree = writtenTree()
    const reviews = { ...reviewOf(CA_LANE, [verdict(tree[CA_FILE]!)]), ...reviewOf(NL_LANE, [verdict(tree[NL_FILE]!)]) }
    const gate = gateOf(join_({ ...tree, ...reviews }, { verifyPlace: (each) => each.id !== caObjective.id }))
    expect(gate.lanes).toEqual([{ lane: CA_LANE, stale: [], unchecked: [], unconfirmed: [{ id: caObjective.id, reason: 'not-found-in-rendition' }], unexplained: [] }])
  })
})
