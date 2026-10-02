// The review file: what the second check found, kept apart from the records
// it checked (plan KTD7). One file per lane:
//
//   education/reviews/<jurisdiction>/<level>/<subject>.json
//
// A verdict is bound by hash to the text it checked: the record's official
// wording and the pack's own text about it. Nothing here is ever written onto
// a record; review-join.ts computes each record's state from these files.
//
//   node education/tools/review.ts <record file>...   print the two hashes a verdict for each record carries
//
// The file also lists what the check rendition holds for the lane that no
// record carries. Those entries have a code and a place and no field for
// wording, so wording that may not be committed has no way in through them.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { wordingHash } from './normalise.ts'
import { parseRecord } from './record.ts'
import type { RecordFile } from './record.ts'
import { JURISDICTIONS, OWN_REGIONS, SHA256, SLUG, laneKey, parseId } from './schema.ts'
import type { Finding } from './validate.ts'

export const VERDICTS = ['confirmed', 'unconfirmed'] as const

// Why a record is not confirmed. The list is closed: a reason outside it is rejected.
export const REASONS = [
  'wording-differs',
  'code-differs',
  'not-found-in-rendition',
  'summary-or-gloss-unfaithful',
  'notes-contradict',
  'extraction-artefact',
  'rendition-unavailable',
] as const
export type Reason = (typeof REASONS)[number]

export const MATCHERS = ['script', 'agent'] as const

// Where in a rendition a statement is: a PDF page counted from 1, a node or
// row of a data file, and a word offset into the normalised text (words as the matcher counts them).
export interface Place {
  page?: number
  node?: string
  offset?: number
}

// A place as a message names it: "page 3, offset 12". `empty` is what a place that states nothing is called.
export function formatPlace(place: Place, empty = ''): string {
  const parts = [
    place.page === undefined ? null : `page ${place.page}`,
    place.node === undefined ? null : `node ${place.node}`,
    place.offset === undefined ? null : `offset ${place.offset}`,
  ].filter((part) => part !== null)
  return parts.length === 0 ? empty : parts.join(', ')
}

export interface Verdict {
  // The id of the objective record that was checked.
  id: string
  // The record's wording hash as it was when checked.
  wording_sha256: string
  // textHash of the record as it was when checked.
  text_sha256: string
  verdict: (typeof VERDICTS)[number]
  // Required when unconfirmed, forbidden when confirmed.
  reason?: Reason
  // Free text, for example the difference found. Required for `wording-differs`.
  note?: string
  // The slug of the source record that was read, or `same-file`.
  rendition: string
  // Where the statement was found in that rendition. Empty only when it was not found.
  place: Place
  matched_by: (typeof MATCHERS)[number]
  // The two renditions split the statement differently and the joined content is equal.
  granularity_differs?: boolean
  // For a record whose extraction used corrections: each was verified against the page.
  corrections_verified?: boolean
  // A short label such as the batch name. Never a person.
  checker: string
  // 1 for the first check, 2 for the check after the fix round.
  round: number
}

// A statement the check rendition holds for the lane that no record carries.
export interface Unrecorded {
  rendition: string
  // The printed code, when the rendition prints one.
  code?: string
  place: Place
  // Why no record carries it, for example a placeholder row the manifest skips.
  explained?: string
}

export interface Review {
  // <jurisdiction>/<level>/<subject>
  lane: string
  verdicts: Verdict[]
  unrecorded: Unrecorded[]
}

export interface ReviewFinding extends Finding {
  // Where in the JSON the finding is, e.g. `verdicts[3].reason`.
  path: string
}

// The path of a lane's review file, relative to education/.
export function reviewPath(lane: string): string {
  return `reviews/${lane}.json`
}

// --- the hashes a verdict is bound by ----------------------------------------

// The hash of the pack's own text in a record: its summary or gloss, then its
// design notes, headings and markers included, as one string. A verdict
// carries it, and the join compares it with the record as it is now.
export function textHash(record: Pick<RecordFile, 'sections'>): string {
  const own: readonly string[] = OWN_REGIONS
  return wordingHash(
    record.sections
      .filter((section) => own.includes(section.heading))
      .map((section) => section.heading + section.text)
      .join('\n'),
  )
}

// What a verdict for this record starts from: its id and its two hashes as they are now.
export function recordHashes(record: RecordFile): Pick<Verdict, 'id' | 'wording_sha256' | 'text_sha256'> {
  const { id, kind, wording_sha256: wording } = record.frontmatter
  if (kind !== 'objective' || typeof id !== 'string' || typeof wording !== 'string') {
    throw new Error('only an objective record with an id and a wording_sha256 can be checked')
  }
  return { id, wording_sha256: wording, text_sha256: textHash(record) }
}

// --- reading ---------------------------------------------------------------

type Problem = (value: unknown) => string | null

interface Field {
  name: string
  optional?: true
  // What is wrong with a value, or for an object, the fields it holds.
  problem: Problem | readonly Field[]
  // The rule a bad value is reported under, when it is not `review-field`.
  rule?: string
}

const LANE = new RegExp(`^(?:${JURISDICTIONS.join('|')})/${SLUG}/${SLUG}$`)

const oneOf =
  (values: readonly string[]): Problem =>
  (value) =>
    typeof value === 'string' && values.includes(value) ? null : `must be one of ${values.join(', ')}`
const matching =
  (pattern: RegExp, expects: string): Problem =>
  (value) =>
    typeof value === 'string' && pattern.test(value) ? null : `must be ${expects}`
const wholeFrom =
  (least: number): Problem =>
  (value) =>
    Number.isInteger(value) && (value as number) >= least ? null : `must be a whole number, ${least} or more`
const text: Problem = (value) => (typeof value === 'string' && value.trim() !== '' ? null : 'must be text and not empty')
const flag: Problem = (value) => (typeof value === 'boolean' ? null : 'must be true or false')
const list: Problem = (value) => (Array.isArray(value) ? null : 'must be a list')
const sha256 = matching(SHA256.pattern, SHA256.expects)
const rendition = matching(new RegExp(`^${SLUG}$`), 'the slug of a source record, or same-file')

// The order of each list is the order the keys are written in.
const PLACE_FIELDS: readonly Field[] = [
  { name: 'page', optional: true, problem: wholeFrom(1) },
  { name: 'node', optional: true, problem: text },
  { name: 'offset', optional: true, problem: wholeFrom(0) },
]

const REVIEW_FIELDS: readonly Field[] = [
  { name: 'lane', problem: matching(LANE, 'a lane as <jurisdiction>/<level>/<subject>') },
  { name: 'verdicts', problem: list },
  { name: 'unrecorded', problem: list },
]

const VERDICT_FIELDS: readonly Field[] = [
  { name: 'id', problem: (value) => (typeof value === 'string' && parseId(value)?.kind === 'objective' ? null : 'must be the id of an objective record') },
  { name: 'wording_sha256', problem: sha256 },
  { name: 'text_sha256', problem: sha256 },
  { name: 'verdict', problem: oneOf(VERDICTS) },
  { name: 'reason', optional: true, problem: oneOf(REASONS), rule: 'review-reason' },
  { name: 'note', optional: true, problem: text },
  { name: 'rendition', problem: rendition },
  { name: 'place', problem: PLACE_FIELDS },
  { name: 'matched_by', problem: oneOf(MATCHERS) },
  { name: 'granularity_differs', optional: true, problem: flag },
  { name: 'corrections_verified', optional: true, problem: flag },
  { name: 'checker', problem: text },
  { name: 'round', problem: wholeFrom(1) },
]

const UNRECORDED_FIELDS: readonly Field[] = [
  { name: 'rendition', problem: rendition },
  { name: 'code', optional: true, problem: text },
  { name: 'place', problem: PLACE_FIELDS },
  { name: 'explained', optional: true, problem: text },
]

type Add = (path: string, rule: string, problem: string) => void
type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// One object against its fields. False when anything about it was reported.
function checkFields(value: unknown, path: string, fields: readonly Field[], add: Add): value is Json {
  const at = (name: string): string => (path === '' ? name : `${path}.${name}`)
  if (!isObject(value)) {
    add(path, 'review-field', 'must be an object')
    return false
  }
  let sound = true
  const report = (name: string, rule: string, problem: string): void => {
    add(at(name), rule, problem)
    sound = false
  }
  for (const key of Object.keys(value)) {
    if (!fields.some((field) => field.name === key)) report(key, 'review-field', 'is not a field here')
  }
  for (const field of fields) {
    const held = value[field.name]
    if (held === undefined) {
      if (!field.optional) report(field.name, 'review-field', 'is required')
      continue
    }
    if (typeof field.problem !== 'function') {
      if (!checkFields(held, at(field.name), field.problem, add)) sound = false
      continue
    }
    const problem = field.problem(held)
    if (problem) report(field.name, field.rule ?? 'review-field', problem)
  }
  return sound
}

function checkVerdict(value: unknown, path: string, lane: string | null, add: Add): void {
  if (!checkFields(value, path, VERDICT_FIELDS, add)) return
  const verdict = value as unknown as Verdict
  const id = parseId(verdict.id)!
  if (lane !== null && id.kind === 'objective' && laneKey(id) !== lane) {
    add(`${path}.id`, 'review-lane', `names a record of another lane: this file is for ${lane}`)
  }
  if (verdict.verdict === 'unconfirmed') {
    if (verdict.reason === undefined) add(`${path}.reason`, 'review-reason', `is required when the verdict is unconfirmed: one of ${REASONS.join(', ')}`)
    if (verdict.reason === 'wording-differs' && verdict.note === undefined) add(`${path}.note`, 'review-note', 'is required for wording-differs: say what differs')
    return
  }
  if (verdict.reason !== undefined) add(`${path}.reason`, 'review-reason', 'must be left out of a confirmed verdict')
  if (Object.keys(verdict.place).length === 0) add(`${path}.place`, 'review-place', 'must say where the statement was found when the verdict is confirmed')
}

// A review file's text as a Review, or every way it departs from the format.
// `file` is its path relative to education/. The review is null when there is
// any finding: a file that is partly wrong is not read at all.
export function parseReview(source: string, file: string): { review: Review | null; findings: ReviewFinding[] } {
  const findings: ReviewFinding[] = []
  const add: Add = (path, rule, problem) => findings.push({ file, line: 1, rule, path, message: `${path === '' ? 'the file' : path} ${problem}` })
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error) {
    add('', 'review-json', `is not JSON: ${(error as Error).message}`)
    return { review: null, findings }
  }
  const top = isObject(value) ? value : {}
  const lane = typeof top.lane === 'string' && LANE.test(top.lane) ? top.lane : null
  if (checkFields(value, '', REVIEW_FIELDS, add)) {
    const seen = new Set<string>()
    ;(value.verdicts as unknown[]).forEach((verdict, index) => {
      const path = `verdicts[${index}]`
      checkVerdict(verdict, path, lane, add)
      if (!isObject(verdict) || typeof verdict.id !== 'string' || typeof verdict.round !== 'number') return
      const key = `${verdict.id} ${verdict.round}`
      if (seen.has(key)) add(path, 'review-duplicate', `is a second verdict for ${verdict.id} in round ${verdict.round}`)
      seen.add(key)
    })
    ;(value.unrecorded as unknown[]).forEach((entry, index) => checkFields(entry, `unrecorded[${index}]`, UNRECORDED_FIELDS, add))
  }
  return { review: findings.length === 0 ? (value as Review) : null, findings }
}

// --- writing ---------------------------------------------------------------

function inOrder<T extends object>(value: T, fields: readonly Field[]): T {
  const held = value as Json
  const ordered: Json = {}
  for (const { name, problem } of fields) {
    if (held[name] !== undefined) ordered[name] = typeof problem === 'function' ? held[name] : inOrder(held[name] as Json, problem)
  }
  return ordered as T
}

// The one way a review file is written: keys in a fixed order, verdicts by
// record id and then round, two-space indent, a line break at the end.
export function serialiseReview(review: Review): string {
  const verdicts = [...review.verdicts].sort((a, b) => (a.id === b.id ? a.round - b.round : a.id < b.id ? -1 : 1))
  const canonical: Review = {
    lane: review.lane,
    verdicts: verdicts.map((verdict) => inOrder(verdict, VERDICT_FIELDS)),
    unrecorded: review.unrecorded.map((entry) => inOrder(entry, UNRECORDED_FIELDS)),
  }
  return `${JSON.stringify(canonical, null, 2)}\n`
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const files = process.argv.slice(2)
  if (files.length === 0 || files.some((file) => file.startsWith('--'))) {
    console.error('usage: node education/tools/review.ts <record file>...')
    process.exit(2)
  }
  for (const file of files) console.log(JSON.stringify(recordHashes(parseRecord(readFileSync(file, 'utf8'), file))))
}
