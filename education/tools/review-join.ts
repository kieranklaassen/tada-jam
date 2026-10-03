// The join of the records with their review files: the state of every
// objective record, computed and never stored on the record (plan KTD7).
//
//   node education/tools/review-join.ts             fails on any record unchecked or stale, and on any finding
//   node education/tools/review-join.ts --summary   the same report, and always exit 0 (for use while the corpus is built)
//   node education/tools/review-join.ts --gate      the final gate: prints only the lanes and records that fail it
//
// The final gate (`--gate`, and `npm run education:gate` with the other
// checks of the whole tree) is what the corpus has to pass before it is
// pushed as checked. In every lane: no record stale, no record unchecked, no
// statement of the check rendition without a record or an explanation, and
// no record unconfirmed for another reason than wording-differs. That one
// reason is allowed because it records a real difference between two official
// renditions, which no fix round can remove. Any other finding of the join
// fails the gate too: among them a lane that holds more or fewer records
// than the manifest expects (`lane-count`).
//
// A record is unchecked until a verdict names it. The verdict of the highest
// round decides: stale when the record's wording or its own text has changed
// since that verdict, otherwise confirmed, or unconfirmed with the verdict's
// reason. A record that fails its check is kept and counted, not dropped.
//
// When the store is present, the command also runs the scripted match again
// (match.ts) for every confirming verdict a script matched, and a verdict
// whose wording is not at the place it states makes its record unconfirmed.
// A place that cannot be looked up there (a source file that is not in the
// store, a tool that is missing) is printed with the rendition that could not
// be read and why: `--gate` then fails, and the plain command prints it as a
// notice. Without the store the place check is skipped and such a verdict
// stands, so the join and its gate run in CI, in the lookup and in the
// coverage report with the repo alone.
//
// A verdict also has to name a rendition the tree knows: `same-file`, or the
// slug of a source record. One that names anything else is a finding
// (`verdict-rendition-unknown`), with or without the store.
//
// A lane where more than a fifth of the checked records fail for one reason
// gets a notice that says where to look. For a reason an importer or an
// extractor can cause (the wording, the code, an artefact of extraction, a
// wording that is not at its place) it points at the importer; for a reason
// that is the writer's (the summary or gloss, the design notes) it points at
// how the lane was written. A notice is printed under its lane and never
// fails the gate.
//
// The core is exported for review-join.test.ts, the lookup and the coverage report.

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANIFEST } from '../manifest.ts'
import type { Lane } from '../manifest.ts'
import { FrontmatterError } from './frontmatter.ts'
import type { RecordFile } from './record.ts'
import { REASONS, formatPlace, parseReview, reviewPath, textHash } from './review.ts'
import type { Reason, Verdict } from './review.ts'
import { SAME_FILE, laneKey, parseId } from './schema.ts'
import { storeRoot } from './store.ts'
import { filesUnder, formatFinding, parsedRecord, readRecords } from './validate.ts'
import type { Finding, RecordText } from './validate.ts'

export type CheckState = 'confirmed' | 'unconfirmed' | 'stale' | 'unchecked'

export interface RecordState {
  id: string
  // The record file, relative to education/.
  file: string
  // <jurisdiction>/<level>/<subject>
  lane: string
  state: CheckState
  // Only when unconfirmed: one of REASONS, and the checker's note when it left one.
  reason?: string
  note?: string
}

export interface LaneSummary {
  // The objective records the lane holds.
  records: number
  counts: Record<CheckState, number>
  // The unconfirmed records, by reason.
  reasons: Partial<Record<Reason, number>>
  // Statements the check rendition holds that no record carries.
  unrecorded: { explained: number; unexplained: number }
}

export interface JoinOptions {
  // The lanes a review file may be for. The pack's manifest unless a test gives its own.
  manifest?: readonly Lane[]
  // Whether a record's wording is at the place a verdict states: false when
  // it is not, null when that cannot be looked up. Given when the store is
  // present; asked for every confirming verdict a script matched.
  verifyPlace?: (verdict: Verdict, record: RecordFile) => boolean | null
  // The record files, when the caller has read them already: readRecords(educationDir).
  records?: readonly RecordText[]
}

// Something about a lane worth a look that is not a failure of the gate.
export interface Notice {
  // <jurisdiction>/<level>/<subject>
  lane: string
  rule: 'likely-importer-fault' | 'likely-writing-fault'
  message: string
}

// What became of the place check: the deciding verdicts that confirm a
// record and that a script matched.
export interface PlaceCheck {
  // How many such verdicts there are, whether or not their place was asked about.
  scripted: number
  // Those whose wording `verifyPlace` found at the stated place.
  verified: number
  // Those `verifyPlace` could not tell about, each with the slug of the
  // rendition its verdict names (for `same-file`, the record's own source).
  // Their records stay confirmed. Empty when no `verifyPlace` was given.
  unknown: { id: string; rendition: string }[]
}

export interface Join {
  // By record id, in the order of the record files.
  states: Map<string, RecordState>
  findings: Finding[]
  notices: Notice[]
  // By lane, the manifest's lanes first and in its order.
  lanes: Map<string, LaneSummary>
  places: PlaceCheck
}

// More than one in this many of a lane's checked records failing for one
// reason points at what made them all, not at the records one by one.
const SHARED_FAULT_ONE_IN = 5
// A lane with fewer checked records than this gets no such notice: one honest
// unconfirmed record would be more than a fifth of it.
const SHARED_FAULT_FEWEST = 5

// Whose fault a reason shared by many records is likely to be. The importer
// and the extractor make the frontmatter and the official wording; the lane's
// writer makes the summary or gloss and the design notes. A rendition that
// could not be read is the fault of neither, and gets no notice.
interface SharedFault {
  rule: Notice['rule']
  likely: string
}
const IMPORTER: SharedFault = { rule: 'likely-importer-fault', likely: 'likely a fault of the importer or the extractor, not of the records' }
const WRITER: SharedFault = { rule: 'likely-writing-fault', likely: 'likely a fault in how the lane was written, not of the importer or the extractor' }
const SHARED_FAULT: Partial<Record<Reason, SharedFault>> = {
  'wording-differs': IMPORTER,
  'code-differs': IMPORTER,
  'extraction-artefact': IMPORTER,
  'not-found-in-rendition': IMPORTER,
  'summary-or-gloss-unfaithful': WRITER,
  'notes-contradict': WRITER,
}

// What a place that states no page, node or offset is called in a message.
const NO_PLACE = 'no stated place'

// Every check state at nought: where a count of records starts.
export function noCounts(): Record<CheckState, number> {
  return { confirmed: 0, unconfirmed: 0, stale: 0, unchecked: 0 }
}

function reviewFiles(education: string): string[] {
  return filesUnder(education, 'reviews')
    .filter((file) => file.endsWith('.json'))
    .sort()
}

interface Checked {
  file: string
  lane: string
  record: RecordFile
  wording: string
  text: string
}

export function joinTree(educationDir: string, options: JoinOptions = {}): Join {
  const findings: Finding[] = []
  const lanes = new Map<string, LaneSummary>()
  const summaryOf = (lane: string): LaneSummary => {
    if (!lanes.has(lane)) lanes.set(lane, { records: 0, counts: noCounts(), reasons: {}, unrecorded: { explained: 0, unexplained: 0 } })
    return lanes.get(lane)!
  }
  const manifest = options.manifest ?? MANIFEST
  for (const lane of manifest) summaryOf(laneKey(lane))

  // The objective records, by id. A record the validator would fail on its id
  // or kind is not a record here; one that cannot be read is a finding.
  const records = new Map<string, Checked>()
  // The slugs of the source records: a source record is sources/<slug>.md.
  const sources = new Set<string>()
  for (const each of options.records ?? readRecords(educationDir)) {
    const { file } = each
    const source = /^sources\/([^/]+)\.md$/.exec(file)
    if (source) sources.add(source[1]!)
    if (!file.startsWith('corpus/')) continue
    const record = parsedRecord(each)
    if (record instanceof FrontmatterError) {
      findings.push({ file, line: record.line, rule: 'frontmatter', message: record.reason })
      continue
    }
    const { id, kind, wording_sha256: wording } = record.frontmatter
    const parts = typeof id === 'string' ? parseId(id) : null
    if (kind !== 'objective' || parts?.kind !== 'objective' || typeof id !== 'string' || typeof wording !== 'string') continue
    records.set(id, { file, lane: laneKey(parts), record, wording, text: textHash(record) })
  }

  // The verdict of the highest round for each record, from every review file that can be read.
  const latest = new Map<string, Verdict>()
  for (const file of reviewFiles(educationDir)) {
    const parsed = parseReview(readFileSync(join(educationDir, file), 'utf8'), file)
    findings.push(...parsed.findings)
    const { review } = parsed
    if (!review) continue
    if (file !== reviewPath(review.lane)) {
      findings.push({ file, line: 1, rule: 'review-path', message: `lane is ${review.lane}, so the file belongs at ${reviewPath(review.lane)}` })
      continue
    }
    if (!manifest.some((lane) => laneKey(lane) === review.lane)) {
      findings.push({ file, line: 1, rule: 'review-lane-unknown', message: `lane ${review.lane} is not a lane of the manifest` })
    }
    // The renditions the file's verdicts name that the tree does not know, each with how many name it.
    const unknown = new Map<string, number>()
    for (const verdict of review.verdicts) {
      if (!records.has(verdict.id)) {
        findings.push({ file, line: 1, rule: 'verdict-names-no-record', message: `a verdict names ${verdict.id}, and there is no record with that id` })
        continue
      }
      if (verdict.rendition !== SAME_FILE && !sources.has(verdict.rendition)) unknown.set(verdict.rendition, (unknown.get(verdict.rendition) ?? 0) + 1)
      const held = latest.get(verdict.id)
      if (!held || verdict.round > held.round) latest.set(verdict.id, verdict)
    }
    for (const [rendition, verdicts] of unknown) {
      findings.push({
        file,
        line: 1,
        rule: 'verdict-rendition-unknown',
        message: `${verdicts} verdict(s) name the rendition ${rendition}, which is neither ${SAME_FILE} nor the slug of a source record: what they were checked against cannot be read again`,
      })
    }
    const summary = summaryOf(review.lane)
    for (const entry of review.unrecorded) {
      if (entry.explained !== undefined) {
        summary.unrecorded.explained += 1
        continue
      }
      summary.unrecorded.unexplained += 1
      const what = entry.code === undefined ? 'a statement' : `code ${entry.code}`
      findings.push({
        file,
        line: 1,
        rule: 'unrecorded',
        message: `${review.lane}: ${entry.rendition} holds ${what} (${formatPlace(entry.place, NO_PLACE)}) that no record carries: import it, or explain it`,
      })
    }
  }

  const states = new Map<string, RecordState>()
  const places: PlaceCheck = { scripted: 0, verified: 0, unknown: [] }
  for (const [id, { file, lane, record, wording, text }] of records) {
    const verdict = latest.get(id)
    const state: RecordState = { id, file, lane, state: 'unchecked' }
    if (verdict && (verdict.wording_sha256 !== wording || verdict.text_sha256 !== text)) state.state = 'stale'
    else if (verdict?.verdict === 'unconfirmed') {
      state.state = 'unconfirmed'
      state.reason = verdict.reason
      if (verdict.note !== undefined) state.note = verdict.note
    } else if (verdict?.matched_by === 'script') {
      places.scripted += 1
      // False: not there. Null: cannot be told. Undefined: nobody was asked (no store).
      const there = options.verifyPlace?.(verdict, record)
      if (there === false) {
        state.state = 'unconfirmed'
        state.reason = 'not-found-in-rendition' satisfies Reason
        state.note = `the wording is not at the stated place in ${verdict.rendition} (${formatPlace(verdict.place, NO_PLACE)})`
      } else {
        state.state = 'confirmed'
        if (there === true) places.verified += 1
        else if (there === null) places.unknown.push({ id, rendition: verdict.rendition === SAME_FILE ? sourceSlug(record) : verdict.rendition })
      }
    } else if (verdict) state.state = 'confirmed'
    states.set(id, state)

    const summary = summaryOf(lane)
    summary.records += 1
    summary.counts[state.state] += 1
    if (state.state === 'unconfirmed') {
      const reason = state.reason as Reason
      summary.reasons[reason] = (summary.reasons[reason] ?? 0) + 1
    }
  }

  // A lane of the manifest holds as many records as the manifest expects: a
  // record file that nothing gives any more, or one deleted together with its
  // verdict, would otherwise pass every check.
  for (const lane of manifest) {
    const key = laneKey(lane)
    const held = summaryOf(key).records
    if (held !== lane.expectedCount) {
      findings.push({ file: `corpus/${key}`, line: 1, rule: 'lane-count', message: `the lane holds ${held} record(s) and its manifest entry expects ${lane.expectedCount}` })
    }
  }

  const notices: Notice[] = []
  for (const [lane, summary] of lanes) {
    const checked = summary.counts.confirmed + summary.counts.unconfirmed
    if (checked < SHARED_FAULT_FEWEST) continue
    for (const reason of REASONS) {
      const failed = summary.reasons[reason] ?? 0
      const fault = SHARED_FAULT[reason]
      if (fault && failed * SHARED_FAULT_ONE_IN > checked) {
        notices.push({ lane, rule: fault.rule, message: `${lane}: ${failed} of ${checked} checked record(s) are unconfirmed for the reason ${reason}, more than a fifth: ${fault.likely}` })
      }
    }
  }

  return { states, findings, notices, lanes, places }
}

// The slug of the source record a record was read from, or `same-file` when its frontmatter names none.
function sourceSlug(record: RecordFile): string {
  const { source } = record.frontmatter
  return (typeof source === 'string' ? parseId(source)?.slug : undefined) ?? SAME_FILE
}

// Why the gate fails, as short sentences; empty when it passes. An unrecorded
// entry with no explanation is already a finding. A notice is not a failure.
export function gateFailures(result: Join): string[] {
  let unchecked = 0
  let stale = 0
  for (const summary of result.lanes.values()) {
    unchecked += summary.counts.unchecked
    stale += summary.counts.stale
  }
  return [
    unchecked > 0 ? `${unchecked} record(s) unchecked` : null,
    stale > 0 ? `${stale} record(s) stale` : null,
    result.findings.length > 0 ? `${result.findings.length} finding(s)` : null,
  ].filter((failure) => failure !== null)
}

// The one reason a record may stay unconfirmed for when the corpus is done:
// two official renditions differ, the record follows the one it was read
// from, and the verdict's note says what differs.
export const DIFFERENCE_BY_DESIGN: Reason = 'wording-differs'

// What keeps one lane from passing the final gate.
export interface GateLane {
  // <jurisdiction>/<level>/<subject>
  lane: string
  // Record ids.
  stale: string[]
  unchecked: string[]
  // The records unconfirmed for another reason than DIFFERENCE_BY_DESIGN.
  unconfirmed: { id: string; reason: string }[]
  // The statements the check rendition holds that no record carries and nobody has explained, as the join words them.
  unexplained: string[]
}

export interface Gate {
  // The objective records the join saw, and how many of them are unconfirmed for DIFFERENCE_BY_DESIGN.
  records: number
  differing: number
  // The lanes that fail, in the join's order. Empty when every lane passes.
  lanes: GateLane[]
  // The findings of the join that belong to no lane's list above: a review
  // file that cannot be read or sits at the wrong path, a verdict that names
  // no record, a record whose frontmatter cannot be read, a lane that holds
  // another number of records than the manifest expects.
  findings: Finding[]
}

// The final gate over a join. It passes when `lanes` and `findings` are both empty.
export function gateOf(result: Join): Gate {
  const lanes = new Map<string, GateLane>()
  for (const lane of result.lanes.keys()) lanes.set(lane, { lane, stale: [], unchecked: [], unconfirmed: [], unexplained: [] })
  let differing = 0
  for (const state of result.states.values()) {
    const lane = lanes.get(state.lane)!
    if (state.state === 'stale') lane.stale.push(state.id)
    else if (state.state === 'unchecked') lane.unchecked.push(state.id)
    else if (state.state === 'unconfirmed' && state.reason === DIFFERENCE_BY_DESIGN) differing += 1
    else if (state.state === 'unconfirmed') lane.unconfirmed.push({ id: state.id, reason: state.reason ?? 'no reason' })
  }
  // An unexplained statement is a finding on its lane's review file.
  const findings: Finding[] = []
  const byFile = new Map([...lanes.keys()].map((lane) => [reviewPath(lane), lane]))
  for (const finding of result.findings) {
    const lane = finding.rule === 'unrecorded' ? lanes.get(byFile.get(finding.file) ?? '') : undefined
    if (lane) lane.unexplained.push(finding.message)
    else findings.push(finding)
  }
  const failing = [...lanes.values()].filter((lane) => lane.stale.length + lane.unchecked.length + lane.unconfirmed.length + lane.unexplained.length > 0)
  return { records: result.states.size, differing, lanes: failing, findings }
}

export function gatePasses(gate: Gate): boolean {
  return gate.lanes.length === 0 && gate.findings.length === 0
}

// What the final gate prints: each failing lane with the ids that fail it,
// then the other findings, then one line that says whether it passed.
export function formatGate(gate: Gate): string[] {
  const lines: string[] = []
  const list = (heading: string, items: readonly string[]): void => {
    if (items.length > 0) lines.push(`  ${heading}: ${items.length}`, ...items.map((item) => `    ${item}`))
  }
  for (const lane of gate.lanes) {
    lines.push(lane.lane)
    list('stale', lane.stale)
    list('unchecked', lane.unchecked)
    list(
      `unconfirmed for another reason than ${DIFFERENCE_BY_DESIGN}`,
      lane.unconfirmed.map(({ id, reason }) => `${id} (${reason})`),
    )
    list('in the check rendition, with no record and no explanation', lane.unexplained)
  }
  for (const finding of gate.findings) lines.push(formatFinding(finding))
  const total = (pick: (lane: GateLane) => readonly unknown[]): number => gate.lanes.reduce((sum, lane) => sum + pick(lane).length, 0)
  const allowed = `${gate.differing} record(s) unconfirmed for the reason ${DIFFERENCE_BY_DESIGN}, which the gate allows`
  if (gatePasses(gate)) {
    return [`education gate (second check) passed: ${gate.records} record(s), none stale, none unchecked, no statement of a check rendition without a record or an explanation; ${allowed}`]
  }
  const failures = [
    [total((lane) => lane.stale), 'stale'],
    [total((lane) => lane.unchecked), 'unchecked'],
    [total((lane) => lane.unconfirmed), `unconfirmed for another reason than ${DIFFERENCE_BY_DESIGN}`],
    [total((lane) => lane.unexplained), 'statement(s) of a check rendition with no record and no explanation'],
    [gate.findings.length, 'other finding(s)'],
  ] as const
  return [
    ...lines,
    '',
    `education gate (second check) failed in ${gate.lanes.length} lane(s): ${failures
      .filter(([number]) => number > 0)
      .map(([number, what]) => `${number} ${what}`)
      .join(', ')}; ${allowed}`,
  ]
}

export function formatLane(lane: string, summary: LaneSummary): string {
  const reasons = REASONS.filter((reason) => summary.reasons[reason]).map((reason) => `${reason} ${summary.reasons[reason]}`)
  const { explained, unexplained } = summary.unrecorded
  return [
    lane,
    `records ${summary.records}`,
    `confirmed ${summary.counts.confirmed}`,
    `unconfirmed ${summary.counts.unconfirmed}${reasons.length > 0 ? ` (${reasons.join(', ')})` : ''}`,
    `stale ${summary.counts.stale}`,
    `unchecked ${summary.counts.unchecked}`,
    `unrecorded ${explained + unexplained}${unexplained > 0 ? ` (${unexplained} unexplained)` : ''}`,
  ].join('  ')
}

// --- the place check, as the command reports it ------------------------------------

// A rendition the place check could not read, and why (match.ts gives these).
export interface UnreadRendition {
  rendition: string
  why: string
}

// What the command says about the places the script-matched verdicts state.
// `unreadable` is given on a machine with the store, where the places were
// looked up; without it nothing was looked up, and the lines say so. The last
// field says whether every place that was asked about could be looked up.
// Both lists are short: there are no more renditions than source records.
export function formatPlaces(places: PlaceCheck, unreadable?: readonly UnreadRendition[]): { lines: string[]; lookedUp: boolean } {
  if (unreadable === undefined) {
    return { lines: [`the place of ${places.scripted} script-matched verdict(s) was not looked up: there is no wording store on this machine`], lookedUp: true }
  }
  if (places.unknown.length === 0) {
    return { lines: [`the place of ${places.verified} script-matched verdict(s) was looked up in the store, and each holds the wording`], lookedUp: true }
  }
  const byRendition = new Map<string, number>()
  for (const { rendition } of places.unknown) byRendition.set(rendition, (byRendition.get(rendition) ?? 0) + 1)
  return {
    lookedUp: false,
    lines: [
      `the place of ${places.unknown.length} script-matched verdict(s) could not be looked up (${places.verified} could, and hold the wording):`,
      '  by the rendition the verdict names:',
      ...[...byRendition].map(([rendition, verdicts]) => `    ${rendition}: ${verdicts} verdict(s)`),
      ...(unreadable.length > 0
        ? ['  renditions that could not be read:', ...unreadable.map(({ rendition, why }) => `    ${rendition}: ${why.split('\n')[0]}`)]
        : ['  every rendition was read: the wording of such a record is not in the store, or its verdict states no page and no node']),
    ],
  }
}

export interface Report {
  // What goes to standard output and to standard error, in that order.
  out: string[]
  err: string[]
  status: 0 | 1
}

// What the command prints and how it exits. `mode` is the flag it was given,
// and `unreadable` is given when the store is present (see formatPlaces).
export function report(mode: 'verify' | 'summary' | 'gate', result: Join, unreadable?: readonly UnreadRendition[]): Report {
  const places = formatPlaces(result.places, unreadable)
  if (mode === 'gate') {
    const gate = gateOf(result)
    const lines = formatGate(gate)
    if (gatePasses(gate) && places.lookedUp) return { out: [...lines, ...places.lines], err: [], status: 0 }
    if (!gatePasses(gate)) return { out: [], err: [...lines, ...(places.lookedUp ? [] : ['', ...places.lines])], status: 1 }
    return {
      out: [],
      err: [...places.lines, '', `education gate (second check) failed: the place of ${result.places.unknown.length} script-matched verdict(s) could not be looked up in the store, so those verdicts are not verified; ${gate.records} record(s), none stale, none unchecked`],
      status: 1,
    }
  }
  const out: string[] = []
  for (const [lane, summary] of result.lanes) {
    out.push(formatLane(lane, summary))
    for (const notice of result.notices) if (notice.lane === lane) out.push(`  notice (${notice.rule}): ${notice.message}`)
  }
  if (!places.lookedUp) out.push('', ...places.lines.map((line, index) => (index === 0 ? `notice (places-not-looked-up): ${line}` : line)))
  const err = result.findings.map(formatFinding)
  const failures = gateFailures(result)
  if (failures.length === 0) return { out: [...out, '', `education verify passed: ${result.states.size} record(s), each confirmed or unconfirmed with its reason`], err, status: 0 }
  if (mode === 'summary') return { out: [...out, '', `education verify would fail: ${failures.join(', ')}`], err, status: 0 }
  return { out, err: [...err, '', `education verify failed: ${failures.join(', ')}`], status: 1 }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  if (args.length > 1 || args.some((arg) => arg !== '--summary' && arg !== '--gate')) {
    console.error('usage: node education/tools/review-join.ts [--summary | --gate]')
    process.exit(2)
  }
  // The place check reads the renditions in the store. Without the store the join is as it is in CI.
  const verifyPlace = existsSync(storeRoot()) ? (await import('./match.ts')).verifyPlace : undefined
  const result = joinTree(resolve(import.meta.dirname, '..'), verifyPlace ? { verifyPlace } : {})
  const { out, err, status } = report(args[0] === '--gate' ? 'gate' : args[0] === '--summary' ? 'summary' : 'verify', result, verifyPlace?.unreadable())
  if (out.length > 0) console.log(out.join('\n'))
  if (err.length > 0) console.error(err.join('\n'))
  process.exitCode = status
}
