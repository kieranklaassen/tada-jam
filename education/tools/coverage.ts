// The coverage report: what the corpus holds per lane and how well it was
// checked (plan R17), generated from the lane manifest, the record files and
// the join of the review files, and committed as education/docs/COVERAGE.md.
//
//   node education/tools/coverage.ts           write the report
//   node education/tools/coverage.ts --check   fail when the committed report differs from a fresh one
//
// The report holds no date and no time, so generating it again on an
// unchanged tree changes nothing. It is made without the wording store: the
// join here does not look up the place a verdict states, so the same tree
// gives the same report on a machine with the store and in CI without it.
//
// The core is exported for coverage.test.ts.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANIFEST } from '../manifest.ts'
import type { Lane } from '../manifest.ts'
import { FrontmatterError } from './frontmatter.ts'
import { afterMarker } from './record.ts'
import { joinTree, noCounts } from './review-join.ts'
import type { CheckState, Join } from './review-join.ts'
import { REASONS } from './review.ts'
import type { Reason } from './review.ts'
import { JURISDICTIONS, NO_SUMMARY, REGIMES, STANDINGS, SUMMARY, laneKey, parseId } from './schema.ts'
import type { CheckStrength, Jurisdiction } from './schema.ts'
import { parsedRecord, readRecords } from './validate.ts'
import type { RecordText } from './validate.ts'

// Relative to education/.
export const COVERAGE_FILE = 'docs/COVERAGE.md'

export interface CoverageOptions {
  // The pack's manifest unless a test gives its own.
  manifest?: readonly Lane[]
}

const NAMES: Record<Jurisdiction, string> = { 'us-ca': 'California', nl: 'The Netherlands' }
const STRENGTHS: Record<CheckStrength, string> = { 'second-rendition': 'second rendition', 'second-reading': 'second reading' }

const COLUMNS = ['Level', 'Subject', 'Records', 'Confirmed', 'Unconfirmed', 'Stale', 'Unchecked', 'No summary', 'No record', 'Check', 'Sources'] as const
const STATES = ['Confirmed', 'Unconfirmed', 'Stale', 'Unchecked'] as const
const TOTAL_COLUMNS = ['Jurisdiction', 'Lanes', 'Records', ...STATES] as const
const STANDING_COLUMNS = ['Standing', 'Regime', 'Records', ...STATES] as const

// The three kinds of standing a Dutch record can have, each with the
// standings (tools/schema.ts) that are of that kind, and with what the report
// says of the records of that kind after their number. A claim words each
// kind differently, so the report counts them apart.
export const DUTCH_KINDS: readonly { says: string; standings: readonly string[] }[] = [
  { says: 'set by law or decree (core goals, reference levels and aims for childcare)', standings: ['legal-core-goal', 'legal-reference-level', 'legal-aim-for-childcare'] },
  { says: 'guidance of the curriculum institute', standings: ['curriculum-institute-guidance'] },
  { says: 'of a draft that is not in force', standings: ['draft-not-yet-in-force'] },
]

const HEADER = `# Coverage

This file is generated from the lane manifest, the record files and the review files by \`npm run education:coverage\` (\`node education/tools/coverage.ts\`). Do not edit it: change the records or the reviews, then generate it again. \`npm run education:coverage -- --check\` fails when it is out of date.

The first table gives the totals. Then there is one table per jurisdiction with one row per lane, which is a level and a subject, and under it the records of the jurisdiction by standing, and its unconfirmed records by reason and one by one. In the totals and in a lane's row, **Records** is the record files present, then the number the manifest expects. The columns of a lane's row:

- **Records**: the record files present, then the number the manifest expects.
- **Confirmed**: records the second check confirmed, whose text has not changed since.
- **Unconfirmed**: records the second check did not confirm. They are kept, and listed with the reason under the table.
- **Stale**: records whose wording, summary, gloss or notes changed after their check.
- **Unchecked**: records no verdict names yet.
- **No summary**: description-only records whose summary is the fixed sentence saying a faithful summary could not differ from the official wording. \`-\` where the lane holds no description-only record.
- **No record**: statements the check rendition holds for the lane that no record carries, and in brackets how many of those nobody has explained.
- **Check**: how strong the second check is, for each part of the lane. \`second rendition\` reads a different official file; \`second reading\` reads the same file again.
- **Sources**: the lane's source records (\`sources/<name>.md\`), each with the version it states.
`

// Text from the manifest or a source record, made safe for a table cell.
function cell(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim()
}

function tableRow(cells: readonly string[]): string {
  return `| ${cells.join(' | ')} |`
}

// The records of one standing and regime, by check state.
type Standing = Record<CheckState, number>

// A standing and a regime as one name. A record without a regime has the empty one.
function standingKey(jurisdiction: string, standing: string, regime: string): string {
  return `${jurisdiction}\n${standing}\n${regime}`
}

// What the report needs from the record files beyond the join: each source
// record's version, per lane how many description-only records there are
// and how many of them carry the no-summary sentence, and per jurisdiction
// the objective records by standing, regime and check state.
function readFacts(records: readonly RecordText[], result: Join): { versions: Map<string, string>; summaries: Map<string, { records: number; none: number }>; standings: Map<string, Standing> } {
  const versions = new Map<string, string>()
  const summaries = new Map<string, { records: number; none: number }>()
  const standings = new Map<string, Standing>()
  for (const each of records) {
    const { file } = each
    const record = parsedRecord(each)
    // The validator and the join report a record that cannot be read.
    if (record instanceof FrontmatterError) continue
    const { id, kind, version, reuse_policy: policy } = record.frontmatter
    if (typeof id !== 'string') continue
    if (kind === 'source' && typeof version === 'string') versions.set(id, version)
    const state = result.states.get(id)
    if (!state || state.file !== file) continue
    const { standing, regime } = record.frontmatter
    const named = standingKey(state.lane.split('/')[0]!, typeof standing === 'string' ? standing : '', typeof regime === 'string' ? regime : '')
    const held = standings.get(named) ?? noCounts()
    held[state.state] += 1
    standings.set(named, held)
    if (policy !== 'description-only') continue
    const count = summaries.get(state.lane) ?? { records: 0, none: 0 }
    const summary = record.sections.find((section) => section.heading === SUMMARY)
    count.records += 1
    if (summary && afterMarker(SUMMARY, summary.text)?.content.trim() === NO_SUMMARY) count.none += 1
    summaries.set(state.lane, count)
  }
  return { versions, summaries, standings }
}

function sum(numbers: readonly number[]): number {
  return numbers.reduce((total, each) => total + each, 0)
}

function stateCells(counts: Record<CheckState, number>): string[] {
  return [String(counts.confirmed), String(counts.unconfirmed), String(counts.stale), String(counts.unchecked)]
}

function table(columns: readonly string[], rows: readonly string[]): string {
  return [tableRow(columns), tableRow(columns.map(() => '---')), ...rows].join('\n')
}

// The totals: one row per jurisdiction, and one for the pack.
function totalsBlock(manifest: readonly Lane[], result: Join): string {
  const row = (name: string, lanes: readonly Lane[]): string => {
    const summaries = lanes.map((lane) => result.lanes.get(laneKey(lane))!)
    const counts = noCounts()
    for (const summary of summaries) for (const state of Object.keys(counts) as CheckState[]) counts[state] += summary.counts[state]
    return tableRow([name, String(lanes.length), `${sum(summaries.map((summary) => summary.records))} / ${sum(lanes.map((lane) => lane.expectedCount))}`, ...stateCells(counts)])
  }
  const present = JURISDICTIONS.filter((jurisdiction) => manifest.some((lane) => lane.jurisdiction === jurisdiction))
  return table(TOTAL_COLUMNS, [
    ...present.map((jurisdiction) =>
      row(
        `${NAMES[jurisdiction]} (${jurisdiction})`,
        manifest.filter((lane) => lane.jurisdiction === jurisdiction),
      ),
    ),
    row('Both', manifest),
  ])
}

// The records of a jurisdiction by standing and regime, in the order of the
// vocabularies; for the Netherlands, also the three kinds of standing.
function standingBlocks(jurisdiction: Jurisdiction, standings: ReadonlyMap<string, Standing>): string[] {
  const total = (counts: Standing): number => counts.confirmed + counts.unconfirmed + counts.stale + counts.unchecked
  const rows: string[] = []
  const ofStanding = new Map<string, number>()
  for (const standing of STANDINGS[jurisdiction]) {
    for (const regime of ['', ...REGIMES[jurisdiction]]) {
      const counts = standings.get(standingKey(jurisdiction, standing, regime))
      if (!counts) continue
      ofStanding.set(standing, (ofStanding.get(standing) ?? 0) + total(counts))
      rows.push(tableRow([standing, regime === '' ? '-' : regime, String(total(counts)), ...stateCells(counts)]))
    }
  }
  const blocks = [`### Records by standing (${jurisdiction})`, rows.length === 0 ? 'No records.' : table(STANDING_COLUMNS, rows)]
  if (jurisdiction === 'nl' && rows.length > 0) {
    const kinds = DUTCH_KINDS.map((kind) => {
      const records = sum(kind.standings.map((standing) => ofStanding.get(standing) ?? 0))
      return `${records} ${records === 1 ? 'is' : 'are'} ${kind.says}`
    })
    blocks.push(`By kind of standing: ${kinds.slice(0, -1).join(', ')}, and ${kinds.at(-1)}.`)
  }
  return blocks
}

function sourceCell(lane: Lane, versions: ReadonlyMap<string, string>): string {
  if (lane.nothingPublished !== undefined) return `Nothing published: ${cell(lane.nothingPublished)}`
  return lane.sources
    .map((id) => {
      const parts = parseId(id)
      const name = parts?.kind === 'source' ? parts.slug : id
      return `${cell(name)} (${cell(versions.get(id) ?? 'no source record')})`
    })
    .join('<br>')
}

function checkCell(lane: Lane): string {
  if (lane.parts.length === 0) return '-'
  if (lane.parts.length === 1) return STRENGTHS[lane.parts[0]!.checkStrength]
  return lane.parts.map((part) => `${cell(part.name)}: ${STRENGTHS[part.checkStrength]}`).join('<br>')
}

// The report as markdown.
export function renderCoverage(educationDir: string, options: CoverageOptions = {}): string {
  const manifest = options.manifest ?? MANIFEST
  const records = readRecords(educationDir)
  const result = joinTree(educationDir, { manifest, records })
  const { versions, summaries, standings } = readFacts(records, result)
  const blocks: string[] = [HEADER, '## Totals', totalsBlock(manifest, result)]

  for (const jurisdiction of JURISDICTIONS) {
    const lanes = manifest.filter((lane) => lane.jurisdiction === jurisdiction)
    if (lanes.length === 0) continue
    const rows = lanes.map((lane) => {
      const summary = result.lanes.get(laneKey(lane))!
      const described = summaries.get(laneKey(lane))
      const { explained, unexplained } = summary.unrecorded
      return tableRow([
        lane.level,
        lane.subject,
        `${summary.records} / ${lane.expectedCount}`,
        ...stateCells(summary.counts),
        described ? String(described.none) : '-',
        `${explained + unexplained}${unexplained > 0 ? ` (${unexplained} unexplained)` : ''}`,
        checkCell(lane),
        sourceCell(lane, versions),
      ])
    })
    blocks.push(`## ${NAMES[jurisdiction]} (${jurisdiction})`, table(COLUMNS, rows), ...standingBlocks(jurisdiction, standings))

    // Id and reason only: a checker's note may quote the difference it found.
    const inLanes = new Set(lanes.map(laneKey))
    const unconfirmed = [...result.states.values()]
      .filter((state) => state.state === 'unconfirmed' && inLanes.has(state.lane))
      .sort((a, b) => REASONS.indexOf(a.reason as Reason) - REASONS.indexOf(b.reason as Reason) || (a.id < b.id ? -1 : 1))
    const byReason = REASONS.map((reason) => [reason, unconfirmed.filter((state) => state.reason === reason).length] as const).filter(([, records]) => records > 0)
    blocks.push(
      `### Unconfirmed records (${jurisdiction})`,
      ...(unconfirmed.length === 0
        ? ['No record is unconfirmed.']
        : [`${unconfirmed.length} unconfirmed, by reason: ${byReason.map(([reason, records]) => `${reason} ${records}`).join(', ')}.`, unconfirmed.map((state) => `- \`${state.id}\`: ${state.reason}`).join('\n')]),
    )
  }
  return `${blocks.map((block) => block.trim()).join('\n\n')}\n`
}

export function writeCoverage(educationDir: string, options: CoverageOptions = {}): void {
  const path = join(educationDir, COVERAGE_FILE)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, renderCoverage(educationDir, options))
}

// Whether the committed report is what generating it now would write.
export function coverageIsFresh(educationDir: string, options: CoverageOptions = {}): boolean {
  const path = join(educationDir, COVERAGE_FILE)
  return existsSync(path) && readFileSync(path, 'utf8') === renderCoverage(educationDir, options)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const education = resolve(import.meta.dirname, '..')
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== '--check')) {
    console.error('usage: node education/tools/coverage.ts [--check]')
    process.exit(2)
  }
  if (args.length === 0) {
    writeCoverage(education)
    console.log(`education coverage: wrote education/${COVERAGE_FILE}`)
  } else if (coverageIsFresh(education)) {
    console.log(`education coverage: education/${COVERAGE_FILE} is up to date`)
  } else {
    console.error(`education coverage: education/${COVERAGE_FILE} is missing or out of date: run \`npm run education:coverage\` and commit the result`)
    process.exit(1)
  }
}
