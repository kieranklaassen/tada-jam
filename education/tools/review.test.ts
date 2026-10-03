import { describe, expect, it } from 'vitest'
import { CA_FILE, NL_FILE, caObjective, nlObjective, sampleTree } from './fixtures.ts'
import { parseRecord, replaceRegion, withMarker } from './record.ts'
import { parseReview, recordHashes, reviewPath, serialiseReview, textHash } from './review.ts'
import type { Review, Verdict } from './review.ts'
import { DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS, ENGLISH_GLOSS, OFFICIAL_WORDING, SUMMARY } from './schema.ts'

const LANE = 'us-ca/kindergarten/mathematics'
const FILE = reviewPath(LANE)
const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)

const confirmed: Verdict = {
  id: caObjective.id,
  wording_sha256: HASH_A,
  text_sha256: HASH_B,
  verdict: 'confirmed',
  rendition: 'example-counting-standards-pdf',
  place: { page: 12, offset: 340 },
  matched_by: 'script',
  checker: 'kindergarten-mathematics-all',
  round: 1,
}

const review: Review = {
  lane: LANE,
  verdicts: [confirmed],
  unrecorded: [{ rendition: 'example-counting-standards-pdf', code: 'K.CC.9', place: { page: 13 } }],
}

// The findings for a review file given as a value, as "<path> <rule>".
function problems(value: unknown): string[] {
  return parseReview(JSON.stringify(value), FILE).findings.map((finding) => `${finding.path} ${finding.rule}`)
}

function withVerdict(change: Record<string, unknown>): unknown {
  return { ...review, verdicts: [{ ...confirmed, ...change }] }
}

describe('the review file format', () => {
  it('reads what it writes, byte for byte', () => {
    const text = serialiseReview(review)
    const parsed = parseReview(text, FILE)
    expect(parsed.findings).toEqual([])
    expect(parsed.review).toEqual(review)
    expect(serialiseReview(parsed.review!)).toBe(text)
    expect(text.endsWith('}\n')).toBe(true)
    expect(text).toContain('\n  "verdicts": [\n    {\n      "id": ')
  })

  it('writes keys in one order and verdicts by record id, then round', () => {
    const second = `${caObjective.id}-b`
    const shuffled: Review = {
      unrecorded: [],
      verdicts: [
        { ...confirmed, id: second, round: 1 },
        { round: 2, checker: 'fix-round', matched_by: 'agent', place: { offset: 3, page: 1 }, rendition: 'same-file', verdict: 'confirmed', text_sha256: HASH_B, wording_sha256: HASH_A, id: caObjective.id },
        confirmed,
      ],
      lane: LANE,
    }
    const text = serialiseReview(shuffled)
    const written = JSON.parse(text) as Review
    expect(Object.keys(written)).toEqual(['lane', 'verdicts', 'unrecorded'])
    expect(written.verdicts.map((verdict) => `${verdict.id} ${verdict.round}`)).toEqual([`${caObjective.id} 1`, `${caObjective.id} 2`, `${second} 1`])
    expect(Object.keys(written.verdicts[1]!)).toEqual(['id', 'wording_sha256', 'text_sha256', 'verdict', 'rendition', 'place', 'matched_by', 'checker', 'round'])
    expect(Object.keys(written.verdicts[1]!.place)).toEqual(['page', 'offset'])
  })

  it('accepts an unconfirmed verdict with a reason from the closed list and nothing found', () => {
    expect(problems(withVerdict({ verdict: 'unconfirmed', reason: 'not-found-in-rendition', place: {}, matched_by: 'agent' }))).toEqual([])
  })

  it('rejects a reason outside the closed list', () => {
    const parsed = parseReview(JSON.stringify(withVerdict({ verdict: 'unconfirmed', reason: 'looks-wrong' })), FILE)
    expect(parsed.review).toBeNull()
    expect(parsed.findings.map((finding) => `${finding.file} ${finding.path} ${finding.rule}`)).toEqual([`${FILE} verdicts[0].reason review-reason`])
    expect(parsed.findings[0]!.message).toContain('wording-differs')
  })

  it('rejects an unconfirmed verdict with no reason, and a confirmed one that carries a reason', () => {
    expect(problems(withVerdict({ verdict: 'unconfirmed' }))).toEqual(['verdicts[0].reason review-reason'])
    expect(problems(withVerdict({ reason: 'code-differs' }))).toEqual(['verdicts[0].reason review-reason'])
  })

  it('rejects wording-differs with no note of the difference', () => {
    expect(problems(withVerdict({ verdict: 'unconfirmed', reason: 'wording-differs' }))).toEqual(['verdicts[0].note review-note'])
    expect(problems(withVerdict({ verdict: 'unconfirmed', reason: 'wording-differs', note: 'The rendition says twenty where the record says ten.' }))).toEqual([])
  })

  it('rejects a confirming verdict that does not say where the statement was found', () => {
    expect(problems(withVerdict({ place: {} }))).toEqual(['verdicts[0].place review-place'])
  })

  it('rejects a field it does not know, so an unrecorded entry cannot carry wording', () => {
    const value = { ...review, unrecorded: [{ ...review.unrecorded[0], wording: 'Count the pears.' }] }
    expect(problems(value)).toEqual(['unrecorded[0].wording review-field'])
    expect(problems(withVerdict({ confirmed_by: 'someone' }))).toEqual(['verdicts[0].confirmed_by review-field'])
  })

  it('rejects a missing field and a value of the wrong kind, each with its path', () => {
    const { checker: _checker, ...rest } = confirmed
    expect(problems({ ...review, verdicts: [rest] })).toEqual(['verdicts[0].checker review-field'])
    expect(problems(withVerdict({ wording_sha256: 'abc' }))).toEqual(['verdicts[0].wording_sha256 review-field'])
    expect(problems(withVerdict({ round: 0 }))).toEqual(['verdicts[0].round review-field'])
    expect(problems(withVerdict({ place: { page: 0 } }))).toEqual(['verdicts[0].place.page review-field'])
    expect(problems(withVerdict({ rendition: 'Example PDF' }))).toEqual(['verdicts[0].rendition review-field'])
    expect(problems({ lane: LANE, verdicts: [] })).toEqual(['unrecorded review-field'])
    expect(problems({ ...review, lane: 'kindergarten' })).toEqual(['lane review-field'])
  })

  it('rejects a verdict for a record of another lane', () => {
    expect(problems(withVerdict({ id: nlObjective.id }))).toEqual(['verdicts[0].id review-lane'])
  })

  it('rejects two verdicts for one record in one round', () => {
    expect(problems({ ...review, verdicts: [confirmed, { ...confirmed, matched_by: 'agent' }] })).toEqual(['verdicts[1] review-duplicate'])
    expect(problems({ ...review, verdicts: [confirmed, { ...confirmed, round: 2 }] })).toEqual([])
  })

  it('reports a file that is not JSON', () => {
    const parsed = parseReview('{ "lane": ', FILE)
    expect(parsed.review).toBeNull()
    expect(parsed.findings.map((finding) => finding.rule)).toEqual(['review-json'])
  })
})

describe('the hashes a verdict is bound by', () => {
  const NOTES = withMarker(DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS.map((heading) => `${heading}\n\nA child moves apples one at a time.`).join('\n\n'))
  const tree = sampleTree()
  const ca = parseRecord(tree[CA_FILE]!)
  const nl = parseRecord(tree[NL_FILE]!)

  it('gives the id, the wording hash the record states, and the hash of its own text', () => {
    expect(recordHashes(ca)).toEqual({ id: caObjective.id, wording_sha256: caObjective.wording_sha256, text_sha256: textHash(ca) })
    expect(textHash(ca)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('changes with the summary, the gloss and the design notes', () => {
    const summary = replaceRegion(tree[CA_FILE]!, SUMMARY, withMarker(SUMMARY, 'Says how many apples there are.'))
    const gloss = replaceRegion(tree[NL_FILE]!, ENGLISH_GLOSS, withMarker(ENGLISH_GLOSS, 'Count the apples, up to and including ten.'))
    const notes = replaceRegion(tree[NL_FILE]!, DESIGN_NOTES, NOTES)
    expect(textHash(parseRecord(summary))).not.toBe(textHash(ca))
    expect(textHash(parseRecord(gloss))).not.toBe(textHash(nl))
    expect(textHash(parseRecord(notes))).not.toBe(textHash(nl))
    expect(textHash(parseRecord(notes))).not.toBe(textHash(parseRecord(gloss)))
  })

  it('does not change with the official wording, the frontmatter or the spacing', () => {
    const wording = tree[NL_FILE]!.replace('Tel de appels', 'Tel de peren')
    expect(wording).not.toBe(tree[NL_FILE])
    expect(parseRecord(wording).sections[0]!.heading).toBe(OFFICIAL_WORDING)
    expect(textHash(parseRecord(wording))).toBe(textHash(nl))
    const respaced = tree[NL_FILE]!.replace(nlObjective.title, 'Peren tellen').replace(`${ENGLISH_GLOSS}\n\n`, `${ENGLISH_GLOSS}\n\n\n`)
    expect(parseRecord(respaced).frontmatter.title).toBe('Peren tellen')
    expect(respaced).toContain(`${ENGLISH_GLOSS}\n\n\n`)
    expect(textHash(parseRecord(respaced))).toBe(textHash(nl))
  })
})
