// The importer for California's standards search exports: one
// objective record per row of the mathematics, English language arts, science
// and health exports, for every lane part of the manifest whose selection is
// rows.
//
//   node education/tools/import-california.ts                                   every such lane
//   node education/tools/import-california.ts --lane kindergarten/mathematics   one lane
//
// The export is read out of the store by the pin in its source record. Each
// record is written through writeObjective(), so the official wording and the
// text that accompanies it go to the store and never into the file (California
// is description-only), and a second run changes nothing. After a lane is written its files are counted
// against the manifest's expected count.
//
// What a record's fields are made of:
//
//   code         the identifier as the row prints it, less the spaces and tabs
//                around it. A malformed code stays malformed.
//   title        the code and the name of the domain or strand. Never the
//                wording, and never a cluster heading: a cluster heading is a
//                sentence of official text.
//   code_scope   the document, the domain, and the band for a row that holds
//                for a band of grades.
//   wording      the standard as the Description column holds it, read as the
//                export's profile below says. Only the standard: not the
//                cluster heading, not a footnote, not the rest of a science page.
//   supplement   the official text that accompanies the standard and limits
//                it: the footnote of a mathematics, English language arts or
//                health row, and the cluster heading of a mathematics row. It goes to the store beside the wording, and the
//                record carries its hash. A row with none has no such field,
//                and neither has a science row: its clarification statement
//                and assessment boundary are part of its wording.
//
// Where the export itself is damaged or mistyped, the wording is first put
// right from the small committed list of export corrections
// (US_CA_EXPORT_CORRECTIONS), and the run says which it applied. Where the
// export cuts the name of a domain short, the title and the code scope take
// the name from the list beside it (US_CA_EXPORT_DOMAIN_CORRECTIONS); the row
// is still selected by what the export holds, and the id and the file name
// are made of the code alone.

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Lane, LanePart, RowSelection } from '../manifest.ts'
import { US_CA_EXPORT_FIXES, US_CA_MATH_FOOTNOTE_SCOPE, US_CA_SCIENCE_ADDITIONS } from '../manifest/us-ca-additions.ts'
import type { ExportCorrection, ExportFixes } from '../manifest/us-ca-additions.ts'
import { US_CA_LANES } from '../manifest/us-ca.ts'
import { readTable } from './csv.ts'
import type { Table } from './csv.ts'
import { WORD_CAP } from './extract.ts'
import { normaliseCode } from './normalise.ts'
import { words } from './overlap.ts'
import { parseRecord } from './record.ts'
import { checkCount, statusCounts, writeObjective } from './record-writer.ts'
import type { ObjectiveFields, WriteResult } from './record-writer.ts'
import { laneKey, objectiveId, pathForId, sourceId } from './schema.ts'
import type { SourceFrontmatter } from './schema.ts'
import { FETCH_COMMAND, decodeText, getBlob, requireStore, storeRoot } from './store.ts'
import type { Finding } from './validate.ts'

type Row = Record<string, string>

// ---------------------------------------------------------------------------
// How each export is read. All four keep the standard in the Description
// column, under labels, and none splits it over a second column.
// ---------------------------------------------------------------------------

const DESCRIPTION = 'Description'

interface Profile {
  // The document the codes are unique in, as the code scope names it.
  document: string
  // The official wording of a row.
  wording: (row: Row) => string
  // The official text that accompanies the wording of a row. Empty when the row has none.
  // `shared` is a footnote another row of the lane carries that also holds for this one.
  supplement: (row: Row, shared?: string) => string
  // The code of the parent of a sub-part row, when the parent has no row.
  parent?: (code: string) => string | undefined
  // The band of grades a row holds for, when it is not one grade's.
  band?: (row: Row, code: string) => string | undefined
  // Whether the row is, or holds, a California addition.
  addition: (code: string, wording: string) => boolean
}

// The text under the line `Standard:`, up to the line `Footnote:` when the
// row has one. In the mathematics export a cluster heading sits above it,
// under its own label.
function standard(row: Row): string {
  const lines = (row[DESCRIPTION] ?? '').split('\n')
  const start = lines.indexOf('Standard:')
  if (start === -1) throw new Error('its Description has no line "Standard:"')
  const footnote = lines.indexOf('Footnote:', start)
  return lines
    .slice(start + 1, footnote === -1 ? undefined : footnote)
    .join('\n')
    .trim()
}

// The text under the line `Footnote:`, to the end of the field. Empty for a
// row without one.
function footnote(row: Row): string {
  const lines = (row[DESCRIPTION] ?? '').split('\n')
  const start = lines.indexOf('Footnote:', lines.indexOf('Standard:'))
  return start === -1
    ? ''
    : lines
        .slice(start + 1)
        .join('\n')
        .trim()
}

// The cluster heading of a mathematics row: the text under the line
// `Cluster:`, up to the line `Standard:`. It is a sentence of official text
// that can carry scope the standard itself leaves out (a list of the shapes
// meant, the kinds of problem), so it accompanies the standard.
function cluster(row: Row): string {
  const lines = (row[DESCRIPTION] ?? '').split('\n')
  const start = lines.indexOf('Cluster:')
  const end = lines.indexOf('Standard:')
  if (start === -1 || end === -1 || end < start) return ''
  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim()
}

// What accompanies a mathematics standard: its cluster heading, then its
// footnote, each under a label of the pack's own.
function mathematicsSupplement(row: Row, shared = ''): string {
  const heading = cluster(row)
  const note = footnote(row)
  return [heading === '' ? '' : `Cluster heading: ${heading}`, shared === '' || shared === note ? '' : `Footnote: ${shared}`, note === '' ? '' : `Footnote: ${note}`]
    .filter((part) => part !== '')
    .join('\n')
}

// The footnotes of a lane's rows that hold for other rows too, by the domain
// or the parent code they hold for (US_CA_MATH_FOOTNOTE_SCOPE).
function sharedFootnotes(rows: readonly Row[], codeColumn: string, domainColumn: string, parent: Profile['parent']): { domain: Map<string, string>; parent: Map<string, string> } {
  const shared = { domain: new Map<string, string>(), parent: new Map<string, string>() }
  for (const row of rows) {
    const code = trim(row[codeColumn])
    const scope = US_CA_MATH_FOOTNOTE_SCOPE[code]
    const note = footnote(row)
    if (scope === undefined || note === '') continue
    if (scope === 'domain') shared.domain.set(trim(row[domainColumn]), note)
    else {
      const stem = parent?.(code)
      if (stem !== undefined) shared.parent.set(stem, note)
    }
  }
  return shared
}

// A health row with a footnote ends its standard with the footnote's marker
// written in line, a digit in square brackets after the closing full stop.
// The adopted document prints that marker raised; it is not wording.
const MARKER = /\s*\[\d+\]\s*$/
const healthStandard = (row: Row): string => standard(row).replace(MARKER, '')

const EXPECTATION = 'Performance Expectation:'

// The paragraph labelled Performance Expectation, with its bracketed
// clarification statement and assessment boundary. The rest of the field is
// the page around it: core ideas, practices, concepts, connections.
function expectation(row: Row): string {
  const lines = (row[DESCRIPTION] ?? '').split('\n')
  const start = lines.findIndex((line) => line.startsWith(EXPECTATION))
  if (start === -1) throw new Error(`its Description has no paragraph labelled "${EXPECTATION}"`)
  const blank = lines.findIndex((line, index) => index > start && line.trim() === '')
  return lines
    .slice(start, blank === -1 ? undefined : blank)
    .join('\n')
    .slice(EXPECTATION.length)
    .trim()
}

// The department marks a California addition with " CA" at the end of the
// statement, or of the sub-part line it added.
const marked = (_code: string, wording: string): boolean => wording.split('\n').some((line) => line.trimEnd().endsWith(' CA'))

const PROFILES: Readonly<Record<string, Profile>> = {
  [sourceId('us-ca', 'us-ca-cde-cacs-math-export')]: {
    document: 'California Common Core State Standards: Mathematics',
    wording: standard,
    supplement: mathematicsSupplement,
    // A lettered sub-part is its own row (K.CC.4.a) and its parent has none.
    parent: (code) => /^(.+)\.[a-z]$/.exec(code)?.[1],
    addition: marked,
  },
  [sourceId('us-ca', 'us-ca-cde-cacs-ela-export')]: {
    document: 'California Common Core State Standards: English Language Arts and Literacy',
    // Lettered sub-parts are lines inside the row's standard, so they stay in its wording.
    wording: standard,
    supplement: footnote,
    // The literacy rows for grades 6 to 8: Grade Range 6-8, Min Grade 6, Max Grade 8.
    band: (row) => (trim(row['Min Grade']) === trim(row['Max Grade']) ? undefined : trim(row['Grade Range'])),
    addition: marked,
  },
  [sourceId('us-ca', 'us-ca-cde-cacs-science-export')]: {
    document: 'Next Generation Science Standards for California Public Schools (CA NGSS)',
    wording: expectation,
    // The clarification statement and assessment boundary are inside the wording already.
    supplement: () => '',
    // An engineering design expectation is its band's (K-2-ETS1-1), whichever grade's row it is read under.
    band: (_row, code) => /^([K\d]-\d)-/.exec(code)?.[1],
    // The export drops the marker, so it comes from the grade documents.
    addition: (code) => US_CA_SCIENCE_ADDITIONS.includes(code),
  },
  [sourceId('us-ca', 'us-ca-cde-cacs-health-export')]: {
    document: 'Health Education Content Standards for California Public Schools',
    wording: healthStandard,
    supplement: footnote,
    // The whole document is California's own, so nothing in it is marked.
    addition: () => false,
  },
}

// ---------------------------------------------------------------------------
// Rows to records.
// ---------------------------------------------------------------------------

// The exports carry stray spaces and tabs around codes and grade ranges.
function trim(cell: string | undefined): string {
  return (cell ?? '').trim()
}

// The rows of a part: every column in `where` holds one of its values, the
// code starts with one of the prefixes when there are any, and the code is
// not one the lane skips.
function select(table: Table, selection: RowSelection, skipped: ReadonlySet<string>): Row[] {
  return table.rows.filter((row) => {
    const code = trim(row[selection.codeColumn])
    if (!Object.entries(selection.where).every(([column, values]) => values.includes(trim(row[column])))) return false
    if (selection.codePrefixes && !selection.codePrefixes.some((prefix) => code.startsWith(prefix))) return false
    return !skipped.has(code)
  })
}

// A file name made of a code: lower case, each run of anything else one hyphen.
function slugOf(code: string): string {
  return code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// The wording of a row with its export corrections made, in the order they
// are listed: each replaces one occurrence of its `from`, the only one or
// the one its occurrence number names. `name` is what an error calls an entry.
function correct(wording: string, entries: readonly ExportCorrection[], name: (index: number) => string): string {
  return entries.reduce((text, entry, index) => {
    let at = -1
    for (let n = 0; n < (entry.occurrence ?? 1) && (n === 0 || at !== -1); n++) at = text.indexOf(entry.from, at + 1)
    if (at === -1) throw new Error(`${name(index)}: its \`from\` is not in the wording of the row${entry.occurrence === undefined ? '' : ` ${entry.occurrence} time(s)`}, so the export has changed or the entry is wrong`)
    if (entry.occurrence === undefined && text.indexOf(entry.from, at + 1) !== -1) throw new Error(`${name(index)}: its \`from\` is in the wording of the row more than once, so it needs an occurrence number`)
    return text.slice(0, at) + entry.to + text.slice(at + entry.from.length)
  }, wording)
}

interface Export {
  source: SourceFrontmatter
  profile: Profile
  table: Table
}

function readExport(education: string, store: string, id: string): Export {
  const profile = PROFILES[id]
  if (!profile) throw new Error(`${id} is not one of the standards search exports this importer reads`)
  const file = pathForId(id)!
  const source = parseRecord(readFileSync(join(education, file), 'utf8'), file).frontmatter as SourceFrontmatter
  const bytes = getBlob(store, source.pin)
  if (!bytes) throw new Error(`the file of ${id} is not in the store at ${store}: run \`${FETCH_COMMAND}\` first`)
  return { source, profile, table: readTable(decodeText(bytes)) }
}

export interface LaneImport {
  // The lane's folder, relative to education/: corpus/us-ca/<level>/<subject>.
  lane: string
  // The records its row parts should give, by the manifest.
  expected: number
  // One per row written, in the order of the export.
  results: WriteResult[]
  // The rows whose slug needed a suffix to be the only one in the lane: "<code> is <slug>".
  suffixed: string[]
  // The export corrections made, one per entry applied: "<code> (<reason>)". Never their text.
  corrected: string[]
  // The domains named otherwise than the export names them, once each: "<name given> (<reason>)".
  renamed: string[]
  // Set when the lane holds another number of files than expected.
  finding: Finding | null
}

const isRows = (part: LanePart): part is LanePart & { selection: RowSelection } => part.selection.kind === 'rows'

// Writes the records of every lane that has a part read from rows, under
// `education` (the education folder), with their wording in the store at
// `store`. `only` narrows it to one lane, named <level>/<subject>.
// `fixes` are the export corrections to make on the way, any of its lists
// left out; every entry is checked against all of `lanes` before anything is
// written.
export function importCalifornia(education: string, store: string, lanes: readonly Lane[], only?: string, fixes: Partial<ExportFixes> = {}): LaneImport[] {
  const { corrections = {}, domains = {} } = fixes
  const chosen = lanes.filter((lane) => lane.parts.some(isRows) && (only === undefined || `${lane.level}/${lane.subject}` === only))
  if (only !== undefined && chosen.length === 0) throw new Error(`no lane ${only} is read from the rows of an export`)

  const exports = new Map<string, Export>()
  const exportOf = (id: string): Export => {
    if (!exports.has(id)) exports.set(id, readExport(education, store, id))
    return exports.get(id)!
  }
  const skippedBy = (lane: Lane): Set<string> => new Set(lane.skipped.map((entry) => entry.code))

  const named = (source: string, code: string, index: number): string => `export correction ${index + 1} for ${code} of ${source}`
  for (const [source, byCode] of Object.entries(corrections)) {
    for (const [code, entries] of Object.entries(byCode)) {
      entries.forEach((entry, index) => {
        if (entry.from === '') throw new Error(`${named(source, code, index)}: its \`from\` is empty`)
        if (words(entry.from).length > WORD_CAP || words(entry.to).length > WORD_CAP) {
          throw new Error(`${named(source, code, index)}: it is longer than ${WORD_CAP} words on one side, and the corrections are committed text of a description-only source`)
        }
      })
      const importing = lanes
        .filter((lane) =>
          lane.parts.some((part) => isRows(part) && part.source === source && select(exportOf(source).table, part.selection, skippedBy(lane)).some((row) => trim(row[part.selection.codeColumn]) === code)),
        )
        .map((lane) => `${lane.level}/${lane.subject}`)
      if (importing.length === 0) throw new Error(`${named(source, code, 0)}: no lane imports a row ${code} of that export`)
      if (fixes.lanes) {
        const listed = Object.entries(fixes.lanes[source] ?? {})
          .filter(([, codes]) => codes.includes(code))
          .map(([name]) => name)
        if ([...listed].sort().join() !== [...importing].sort().join()) throw new Error(`${named(source, code, 0)}: it is listed under ${listed.join(', ') || 'no lane'} and its row is imported into ${importing.join(', ')}`)
      }
    }
  }
  for (const [source, byLane] of Object.entries(fixes.lanes ?? {})) {
    for (const [name, codes] of Object.entries(byLane)) {
      for (const code of codes) if (!corrections[source]?.[code]) throw new Error(`${code} of ${source} is listed under ${name} as corrected and has no export correction`)
    }
  }

  for (const [source, byName] of Object.entries(domains)) {
    for (const [name, entry] of Object.entries(byName)) {
      const what = `export domain correction for "${name}" of ${source}`
      if (entry.to.trim() === '' || entry.to === name) throw new Error(`${what}: it must give the domain another name than the export's`)
      const isImported = lanes.some((lane) =>
        lane.parts.some((part) => isRows(part) && part.source === source && select(exportOf(source).table, part.selection, skippedBy(lane)).some((row) => trim(row[part.selection.domainColumn]) === name)),
      )
      if (!isImported) throw new Error(`${what}: no lane imports a row with that name in its domain column, so the export has changed or the entry is wrong`)
    }
  }

  return chosen.map((lane) => {
    const folder = `corpus/${laneKey(lane)}`
    const parts = lane.parts.filter(isRows)
    const skipped = skippedBy(lane)
    const slugs = new Set<string>()
    const suffixed: string[] = []
    const corrected: string[] = []
    const renamed = new Set<string>()
    const results: WriteResult[] = []

    for (const part of parts) {
      const { source, profile, table } = exportOf(part.source)
      const rows = select(table, part.selection, skipped)
      const shared = sharedFootnotes(rows, part.selection.codeColumn, part.selection.domainColumn, profile.parent)
      for (const row of rows) {
        const code = trim(row[part.selection.codeColumn])
        // The domain as the export's column holds it, and as the records name it.
        const exported = trim(row[part.selection.domainColumn])
        const rename = domains[part.source]?.[exported]
        const domain = rename?.to ?? exported
        if (rename) renamed.add(`${rename.to} (${rename.reason})`)

        let slug = slugOf(code)
        if (slugs.has(slug)) {
          const base = slug
          for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`
          suffixed.push(`${code} is ${slug}`)
        }
        slugs.add(slug)

        let wording: string
        let supplement: string
        try {
          const entries = corrections[part.source]?.[code] ?? []
          wording = correct(profile.wording(row), entries, (index) => named(part.source, code, index))
          corrected.push(...entries.map((entry) => `${code} (${entry.reason})`))
          supplement = profile.supplement(row, shared.domain.get(exported) ?? shared.parent.get(profile.parent?.(code) ?? ''))
        } catch (error) {
          throw new Error(`row ${code} of ${part.source}: ${(error as Error).message}`)
        }
        const band = profile.band?.(row, code)
        const parent = profile.parent?.(code)

        const frontmatter: ObjectiveFields = {
          id: objectiveId(lane.jurisdiction, lane.level, lane.subject, slug),
          kind: 'objective',
          title: `${code}, ${domain}`,
          jurisdiction: lane.jurisdiction,
          level: lane.level,
          subject: lane.subject,
          content_language: 'en',
          curriculum_version: source.version,
          status: 'draft',
          authority: 'official',
          code,
          code_key: normaliseCode(code),
          code_scope: `${profile.document}, ${domain}${band === undefined ? '' : `, grades ${band}`}`,
          ...(parent === undefined ? {} : { parent_code: parent }),
          california_addition: profile.addition(code, wording),
          standing: source.standing,
          reuse_policy: source.reuse_policy,
          source: source.id,
          // Codes repeat in the science export, once under each grade of a band, so the grade range is part of where a row is.
          locator: `row ${code}, Grade Range ${trim(row['Grade Range'])}`,
        }
        results.push(writeObjective(education, store, { frontmatter, wording, supplement, source: `${source.publisher}, ${source.title}, row ${code}.` }))
      }
    }

    const expected = parts.reduce((sum, part) => sum + part.expectedCount, 0)
    const finding = checkCount(
      folder,
      results.map((result) => result.file),
      expected,
    )
    return { lane: folder, expected, results, suffixed, corrected, renamed: [...renamed], finding }
  })
}

// What a run did, one line per lane, and whether any lane's count is off.
export function report(imports: readonly LaneImport[]): { lines: string[]; failed: boolean } {
  const lines = imports.map((lane) => {
    if (lane.finding) return `FAIL  ${lane.lane}: ${lane.finding.message}`
    const suffixes = lane.suffixed.length === 0 ? '' : `; slug suffixed: ${lane.suffixed.join(', ')}`
    const corrections = lane.corrected.length === 0 ? '' : `; export corrected: ${lane.corrected.join(', ')}`
    const renamed = lane.renamed.length === 0 ? '' : `; export domain renamed: ${lane.renamed.join(', ')}`
    return `ok    ${lane.lane}: ${lane.results.length} of ${lane.expected} (${statusCounts(lane.results)})${suffixes}${corrections}${renamed}`
  })
  return { lines, failed: imports.some((lane) => lane.finding !== null) }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const only = args[0] === '--lane' ? args[1] : undefined
  if (args.length > 0 && (only === undefined || args.length !== 2)) {
    console.error('usage: node education/tools/import-california.ts [--lane <level>/<subject>]')
    process.exit(2)
  }
  const imports = importCalifornia(resolve(import.meta.dirname, '..'), requireStore(storeRoot()), US_CA_LANES, only, US_CA_EXPORT_FIXES)
  const { lines, failed } = report(imports)
  for (const line of lines) console.log(line)
  const total = imports.reduce((sum, lane) => sum + lane.results.length, 0)
  if (failed) {
    console.error(`\neducation import (California) failed: a lane holds another number of records than its manifest entry expects`)
    process.exit(1)
  }
  console.log(`\neducation import (California): ${total} record(s) in ${imports.length} lane(s)`)
}
