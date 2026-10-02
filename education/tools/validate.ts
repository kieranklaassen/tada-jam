// The record validator for the education pack.
//
//   node education/tools/validate.ts                      every record under corpus/ and sources/
//   node education/tools/validate.ts education/corpus/nl  only the findings under that file or folder
//   node education/tools/validate.ts --complete           also fail on any own region still pending
//
// It checks each record against the schema for its kind, its id against its
// path, its vocabulary against its jurisdiction, and an objective's body
// against its reuse policy and language. The check that matters most is the
// structural half of the reuse rule (plan KTD5): a description-only record
// must not hold an official wording section, an objective's reuse policy must
// be its source record's, and no California record is verbatim. The other half, the overlap check against the
// wording store, is a separate tool. A frame's sources and check renditions
// must be source records that exist.
//
// The core is exported so validate.test.ts can seed each defect and
// corpus.test.ts can run it over the real corpus.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FrontmatterError } from './frontmatter.ts'
import type { Value } from './frontmatter.ts'
import { normaliseCode, wordingHash } from './normalise.ts'
import { afterMarker, officialWording, tryParseRecord } from './record.ts'
import type { RecordFile, Section } from './record.ts'
import {
  ACCOMPANYING_PREFIX,
  CONTENT_LANGUAGES,
  DESIGN_NOTES,
  DESIGN_NOTES_SUBHEADINGS,
  FIELDS,
  JURISDICTIONS,
  KINDS,
  LEVELS,
  MARKERS,
  OFFICIAL_WORDING,
  PENDING,
  REGIMES,
  REGION_ORDER,
  REUSE_POLICIES,
  REUSE_POLICIES_BY_JURISDICTION,
  SOURCE_LINE_PREFIX,
  STANDINGS,
  parseId,
  pathForId,
  regionsFor,
} from './schema.ts'
import type { ContentLanguage, Field, Jurisdiction, Kind, OwnRegionHeading, RegionHeading, ReusePolicy } from './schema.ts'

export interface Finding {
  // The record file, relative to education/, with forward slashes.
  file: string
  // The 1-based line the finding is about, or 1 when it is about the whole file.
  line: number
  // A short stable name for the rule that failed, e.g. `official-wording-forbidden`.
  rule: string
  message: string
}

export interface ValidateOptions {
  // Fail on any own region that still holds the pending line. Left out,
  // pending regions are allowed: that is a record between import and writing.
  complete?: boolean
}

export interface RecordText {
  // Relative to education/, with forward slashes.
  file: string
  text: string
}

type Add = (rule: string, line: number, message: string) => void

function oneOf(values: readonly string[]): string {
  return values.join(', ')
}

// --- fields ----------------------------------------------------------------

function stringProblem(field: Field, value: string): string | null {
  if (field.values) return field.values.includes(value) ? null : `must be one of ${oneOf(field.values)} (it is "${value}")`
  if (value === '') return field.blank ? null : 'must not be empty'
  if (field.pattern) return field.pattern.test(value) ? null : `must be ${field.expects} (it is "${value}")`
  return null
}

function fieldProblem(field: Field, value: Value): string | null {
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : 'must be true or false'
    case 'integer':
      return typeof value === 'number' ? null : 'must be a whole number'
    case 'strings': {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return 'must be a list of strings'
      for (const item of value as string[]) {
        const problem = stringProblem(field, item)
        if (problem) return `holds an item that ${problem}`
      }
      return null
    }
    case 'string':
      return typeof value === 'string' ? stringProblem(field, value) : 'must be a string (quote it if it looks like a number)'
  }
}

function checkFields(kind: Kind, record: RecordFile, add: Add): void {
  const fields = FIELDS[kind]
  const known = new Set(fields.map((field) => field.name))
  for (const key of Object.keys(record.frontmatter)) {
    if (!known.has(key)) add('unknown-field', record.lines[key]!, `${key} is not a field of a ${kind} record`)
  }
  for (const field of fields) {
    const value = record.frontmatter[field.name]
    if (value === undefined) {
      if (!field.optional) add('missing-field', 1, `${field.name} is required on a ${kind} record`)
      continue
    }
    const problem = fieldProblem(field, value)
    if (problem) add('field', record.lines[field.name]!, `${field.name} ${problem}`)
  }
}

// --- id --------------------------------------------------------------------

function checkId(file: string, record: RecordFile, add: Add): void {
  const { frontmatter, lines } = record
  const id = frontmatter.id
  if (typeof id !== 'string') return
  const parts = parseId(id)
  if (!parts) {
    add('id', lines.id!, `id ${id} is neither edu.<jurisdiction>.<level>.<subject>.<frame|objective>.<slug> nor edu.<jurisdiction>.source.<slug>`)
    return
  }
  const path = pathForId(id)
  if (path !== file) add('id-path', lines.id!, `id ${id} belongs at ${path}, not ${file}`)
  for (const [name, value] of Object.entries(parts)) {
    if (name === 'slug' || frontmatter[name] === undefined || frontmatter[name] === value) continue
    add('id-fields', lines[name]!, `${name} is ${String(frontmatter[name])} but the id says ${value}`)
  }
}

// --- vocabulary per jurisdiction ---------------------------------------------

function checkVocabulary(kind: Kind, record: RecordFile, add: Add): void {
  const { frontmatter, lines } = record
  const jurisdiction = frontmatter.jurisdiction
  if (!JURISDICTIONS.includes(jurisdiction as Jurisdiction)) return
  const check = (name: string, lists: Record<Jurisdiction, readonly string[]>): void => {
    const value = frontmatter[name]
    if (typeof value !== 'string') return
    const allowed = lists[jurisdiction as Jurisdiction]
    if (allowed.includes(value)) return
    const hint = allowed.length === 0 ? `${String(jurisdiction)} records carry no ${name}` : `one of ${oneOf(allowed)}`
    add('vocabulary', lines[name]!, `${name} "${value}" is not in the ${String(jurisdiction)} list: ${hint}`)
  }
  if (kind !== 'source') check('level', LEVELS)
  if (kind !== 'frame') {
    check('standing', STANDINGS)
    check('regime', REGIMES)
    // A policy outside the closed set is already a field finding.
    if (REUSE_POLICIES.includes(frontmatter.reuse_policy as ReusePolicy)) check('reuse_policy', REUSE_POLICIES_BY_JURISDICTION)
  }
}

// --- the body of an objective ------------------------------------------------

function checkOfficialWording(section: Section, record: RecordFile, add: Add): void {
  const { wording, accompanying, source } = officialWording(section.text)
  if (source === null) add('source-line', section.line, `the official wording must end with a line that starts with "${SOURCE_LINE_PREFIX}"`)
  // The official text that accompanies the statement: in the file exactly when the frontmatter has its hash, and with that hash.
  const supplement = record.frontmatter.supplement_sha256
  if (accompanying === null) {
    if (typeof supplement === 'string') {
      add('accompanying-text', record.lines.supplement_sha256!, `supplement_sha256 says official text accompanies the statement, and the official wording holds none: it stands after the wording, under a line that opens "${ACCOMPANYING_PREFIX} ("`)
    }
  } else if (accompanying.text === '') add('accompanying-text', section.line + accompanying.offset, 'the line that opens the accompanying text has no text under it')
  else if (supplement === undefined) add('accompanying-text', section.line + accompanying.offset, 'the official wording holds accompanying text, and the frontmatter has no supplement_sha256')
  else if (supplement !== wordingHash(accompanying.text)) {
    add('supplement-hash', record.lines.supplement_sha256!, `supplement_sha256 is not the hash of the accompanying text in this file, which is ${wordingHash(accompanying.text)}`)
  }
  if (wording === '') {
    add('empty-region', section.line, `${section.heading} holds no wording`)
    return
  }
  const recorded = record.frontmatter.wording_sha256
  const actual = wordingHash(wording)
  if (typeof recorded === 'string' && recorded !== actual) {
    add('wording-hash', record.lines.wording_sha256!, `wording_sha256 is not the hash of the official wording in this file, which is ${actual}`)
  }
}

function designNotesProblem(rows: readonly string[]): string | null {
  const headings = rows.filter((row) => row.startsWith('### '))
  const wanted: readonly string[] = DESIGN_NOTES_SUBHEADINGS
  if (headings.length !== wanted.length || headings.some((heading, index) => heading !== wanted[index])) {
    return `written design notes hold exactly these sub-headings, in this order: ${wanted.join(' / ')}`
  }
  if (rows[0] !== wanted[0]) return `design notes hold text before ${wanted[0]}`
  const empty = rows.find((row, index) => row.startsWith('### ') && (rows[index + 1] === undefined || rows[index + 1]!.startsWith('### ')))
  return empty === undefined ? null : `${empty} has no text under it`
}

function checkOwnRegion(heading: OwnRegionHeading, section: Section, options: ValidateOptions, add: Add): void {
  const body = afterMarker(heading, section.text)
  if (!body) {
    add('marker', section.line, `the first line under ${heading} must be the marker ${MARKERS[heading]}`)
    return
  }
  const rows = body.content.split('\n')
  const text = rows.filter((row) => row.trim() !== '')
  if (text.length === 0) {
    add('empty-region', section.line, `${heading} holds nothing after its marker: write the text, or ${PENDING} until it is written`)
    return
  }
  if (options.complete) {
    rows.forEach((row, index) => {
      if (row.trim() === PENDING) add('pending', section.line + body.offset + index, `${heading} is still pending`)
    })
  }
  if (text.length === 1 && text[0] === PENDING) return
  if (heading === DESIGN_NOTES) {
    const problem = designNotesProblem(text)
    if (problem) add('design-notes', section.line, problem)
  }
}

function checkBody(record: RecordFile, options: ValidateOptions, add: Add): void {
  const { frontmatter } = record
  if (record.preface.trim() !== '') {
    const offset = record.preface.split('\n').findIndex((row) => row.trim() !== '')
    add('unowned-text', record.prefaceLine + offset, 'text before the first section belongs to no region')
  }

  // Which regions the record holds depends on two fields; when either is
  // wrong that is already a finding, and presence is not judged.
  const policy = frontmatter.reuse_policy
  const language = frontmatter.content_language
  const wanted =
    REUSE_POLICIES.includes(policy as ReusePolicy) && CONTENT_LANGUAGES.includes(language as ContentLanguage)
      ? regionsFor(policy as ReusePolicy, language as ContentLanguage)
      : null

  const seen = new Set<string>()
  let furthest = -1
  for (const section of record.sections) {
    const position = REGION_ORDER.indexOf(section.heading as RegionHeading)
    if (position === -1) {
      add('unknown-section', section.line, `${section.heading} is not a section of an objective record (${REGION_ORDER.join(', ')})`)
      continue
    }
    const heading = section.heading as RegionHeading
    if (seen.has(heading)) {
      add('duplicate-section', section.line, `${heading} appears more than once`)
      continue
    }
    seen.add(heading)
    if (position < furthest) add('section-order', section.line, `${heading} is out of order: sections go ${REGION_ORDER.join(', ')}`)
    furthest = Math.max(furthest, position)

    if (wanted && !wanted.includes(heading)) {
      if (heading === OFFICIAL_WORDING) {
        add('official-wording-forbidden', section.line, 'a description-only record must not hold the official wording: its source does not allow the text to be copied')
      } else {
        add('forbidden-section', section.line, `${heading} does not belong in a record with reuse_policy ${String(policy)} and content_language ${String(language)}`)
      }
      continue
    }
    if (heading === OFFICIAL_WORDING) checkOfficialWording(section, record, add)
    else checkOwnRegion(heading, section, options, add)
  }
  for (const heading of wanted ?? []) {
    if (!seen.has(heading)) {
      add('missing-section', record.prefaceLine, `${heading} is required in a record with reuse_policy ${String(policy)} and content_language ${String(language)}`)
    }
  }
}

// --- one record, then the set -------------------------------------------------

function checkRecord(file: string, record: RecordFile, options: ValidateOptions, add: Add): void {
  const kind = record.frontmatter.kind
  if (!KINDS.includes(kind as Kind)) {
    add('kind', record.lines.kind ?? 1, `kind must be one of ${oneOf(KINDS)}`)
    return
  }
  checkFields(kind as Kind, record, add)
  checkId(file, record, add)
  checkVocabulary(kind as Kind, record, add)
  if (kind !== 'objective') return
  const { code, code_key: codeKey } = record.frontmatter
  if (typeof code === 'string' && typeof codeKey === 'string' && codeKey !== normaliseCode(code)) {
    add('code-key', record.lines.code_key!, `code_key must be "${normaliseCode(code)}", the lookup key of code "${code}"`)
  }
  checkBody(record, options, add)
}

// Every finding for a set of record files. Never throws on a bad record: a
// file whose frontmatter cannot be read is one finding, with its line.
export function validateRecords(records: readonly RecordText[], options: ValidateOptions = {}): Finding[] {
  const findings: Finding[] = []
  const parsed: { file: string; record: RecordFile }[] = []
  for (const { file, text } of records) {
    const add: Add = (rule, line, message) => findings.push({ file, line, rule, message })
    const record = tryParseRecord(text, file)
    if (record instanceof FrontmatterError) {
      add('frontmatter', record.line, record.reason)
      continue
    }
    checkRecord(file, record, options, add)
    parsed.push({ file, record })
  }

  const filesById = new Map<string, string[]>()
  const policyBySource = new Map<string, Value | undefined>()
  for (const { file, record } of parsed) {
    const { id, kind, reuse_policy: policy } = record.frontmatter
    if (typeof id !== 'string') continue
    filesById.set(id, [...(filesById.get(id) ?? []), file])
    if (kind === 'source' && !policyBySource.has(id)) policyBySource.set(id, policy)
  }
  for (const { file, record } of parsed) {
    const { id, kind, source, reuse_policy: policy } = record.frontmatter
    const sharing = typeof id === 'string' ? filesById.get(id)! : []
    if (sharing.length > 1) {
      findings.push({ file, line: record.lines.id!, rule: 'duplicate-id', message: `id ${String(id)} is the id of ${sharing.length} files: ${sharing.join(' and ')}` })
    }
    if (kind === 'frame') {
      // A frame names the files its lane is read from and checked against.
      for (const name of ['sources', 'check_renditions']) {
        const named = record.frontmatter[name]
        if (!Array.isArray(named)) continue
        for (const each of named) {
          // An item that is no source id is already a field finding.
          if (typeof each === 'string' && parseId(each)?.kind === 'source' && !policyBySource.has(each)) {
            findings.push({ file, line: record.lines[name]!, rule: 'source-missing', message: `${name} holds ${each}, which names no source record` })
          }
        }
      }
      continue
    }
    if (kind !== 'objective' || typeof source !== 'string') continue
    const line = record.lines.source!
    if (!policyBySource.has(source)) {
      findings.push({ file, line, rule: 'source-missing', message: `source ${source} names no source record` })
    } else if (policyBySource.get(source) !== policy) {
      findings.push({
        file,
        line: record.lines.reuse_policy ?? line,
        rule: 'reuse-policy-mismatch',
        message: `reuse_policy is ${String(policy)} but its source ${source} is ${String(policyBySource.get(source))}: the source decides what may be committed`,
      })
    }
  }

  return findings.sort(byFileThenLine)
}

// The order findings are listed in: by file, and in a file by line.
export function byFileThenLine(a: Finding, b: Finding): number {
  return a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1
}

// Every file under one folder at the top of an education folder, as paths
// relative to education/ with forward slashes, in the order the folders list
// them. None when the folder does not exist.
export function filesUnder(education: string, top: string): string[] {
  const files: string[] = []
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) visit(path)
      else files.push(relative(education, path).split(sep).join('/'))
    }
  }
  if (existsSync(join(education, top))) visit(join(education, top))
  return files
}

// A file the validator reads as a record, by its path relative to education/.
export function isRecordFile(file: string): boolean {
  return (file.startsWith('corpus/') || file.startsWith('sources/')) && file.endsWith('.md')
}

// Every markdown file under corpus/ and sources/ of an education folder, sorted by path.
export function readRecords(education: string): RecordText[] {
  const files = ['corpus', 'sources'].flatMap((top) => filesUnder(education, top)).filter(isRecordFile)
  return files.sort().map((file) => ({ file, text: readFileSync(join(education, file), 'utf8') }))
}

const parsedOnce = new WeakMap<RecordText, RecordFile | FrontmatterError>()

// A record file as tryParseRecord gives it, parsed once for each RecordText object.
export function parsedRecord(file: RecordText): RecordFile | FrontmatterError {
  let held = parsedOnce.get(file)
  if (held === undefined) {
    held = tryParseRecord(file.text, file.file)
    parsedOnce.set(file, held)
  }
  return held
}

export function validateTree(education: string, options: ValidateOptions = {}): Finding[] {
  return validateRecords(readRecords(education), options)
}

function isUnder(file: string, path: string): boolean {
  return path === '' || file === path || file.startsWith(`${path}/`)
}

// The findings about one file, or about the files under one folder. `path` is
// relative to education/. The whole tree is still what gets validated, since
// a duplicate id or a missing source is only visible across files.
export function under(findings: readonly Finding[], path: string): Finding[] {
  return findings.filter((finding) => isUnder(finding.file, path))
}

export function formatFinding(finding: Finding): string {
  return `education/${finding.file}:${finding.line}  ${finding.rule}  ${finding.message}`
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const education = resolve(import.meta.dirname, '..')
  const args = process.argv.slice(2)
  const flags = args.filter((arg) => arg.startsWith('--'))
  const paths = args.filter((arg) => !arg.startsWith('--'))
  if (flags.some((flag) => flag !== '--complete') || paths.length > 1) {
    console.error('usage: node education/tools/validate.ts [file or folder] [--complete]')
    process.exit(2)
  }
  const only = paths[0] === undefined ? '' : relative(education, resolve(paths[0])).split(sep).join('/')
  const records = readRecords(education)
  const checked = records.filter((record) => isUnder(record.file, only)).length
  if (paths[0] !== undefined && checked === 0) {
    console.error(`education validate: no record files under ${paths[0]}`)
    process.exit(1)
  }
  const findings = under(validateRecords(records, { complete: flags.length > 0 }), only)
  if (findings.length > 0) {
    for (const finding of findings) console.error(formatFinding(finding))
    console.error(`\neducation validate failed: ${findings.length} finding(s) in ${checked} record file(s)`)
    process.exit(1)
  }
  console.log(`education validate passed: ${checked} record file(s)`)
}
