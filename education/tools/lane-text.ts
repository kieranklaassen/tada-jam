// The official text of a lane or of one batch, printed for the agents who
// write and check its records (plan KTD13).
//
//   node education/tools/lane-text.ts --lane us-ca/grade-4/practical-life-feelings
//   node education/tools/lane-text.ts --lane us-ca/grade-4/practical-life-feelings --batch safety
//   node education/tools/lane-text.ts --lane us-ca/grade-4/practical-life-feelings --batch safety --ids
//
// For each objective record: its id, file, printed code, code scope, title and
// standing, then its official wording, and the official text that accompanies
// it when it has any. The wording of a verbatim record, and its accompanying
// text, are read from its file. Those of a description-only record are read
// from the store, so a description-only lane needs the store. `--ids` prints
// only each id and file path, and needs nothing but the records.
//
// This prints and never writes. What it prints is official wording, and for a
// description-only lane none of it may be copied into a file: the first line
// of the output says so.
//
// A batch is named in the manifest by values of the lane's batch key: the
// domain or content area of an export row, the group of a located statement.
// A record carries that value as the last part of its code scope, after the
// document's name (and before the band, for a row that holds for a band of
// grades), which is how a record is given its batch here.
//
// The core is exported so lane-text.test.ts can run it on invented records.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { batchesOf, laneOf } from '../manifest.ts'
import type { Batch, Lane } from '../manifest.ts'
import { officialWording, parseRecord } from './record.ts'
import { JURISDICTIONS, OFFICIAL_WORDING, laneKey } from './schema.ts'
import type { Jurisdiction, ObjectiveFrontmatter } from './schema.ts'
import { FETCH_COMMAND, getWording, requireStore, storeRoot } from './store.ts'

export interface LaneRecord {
  // Relative to education/, with forward slashes.
  file: string
  frontmatter: ObjectiveFrontmatter
  // The official wording, when the file holds it: a verbatim record.
  official: string | null
  // The official text that accompanies the statement, when the file holds it,
  // and the line that says what it is.
  accompanying: { line: string; text: string } | null
}

// The objective records of a lane under `education`, by code scope and then by
// code, with the numbers in a code read as numbers. None for a lane without
// records yet.
export function readLane(education: string, lane: Lane): LaneRecord[] {
  const folder = `corpus/${laneKey(lane)}/objectives`
  if (!existsSync(join(education, folder))) return []
  const records = readdirSync(join(education, folder))
    .filter((name) => name.endsWith('.md'))
    .map((name): LaneRecord => {
      const file = `${folder}/${name}`
      const record = parseRecord(readFileSync(join(education, file), 'utf8'), file)
      const section = record.sections.find((each) => each.heading === OFFICIAL_WORDING)
      const official = section ? officialWording(section.text) : null
      return { file, frontmatter: record.frontmatter as unknown as ObjectiveFrontmatter, official: official?.wording ?? null, accompanying: official?.accompanying ?? null }
    })
  const order = new Intl.Collator('en', { numeric: true })
  return records.sort(
    (a, b) => order.compare(a.frontmatter.code_scope, b.frontmatter.code_scope) || order.compare(a.frontmatter.code_key, b.frontmatter.code_key) || order.compare(a.frontmatter.id, b.frontmatter.id),
  )
}

// ---------------------------------------------------------------------------
// Batches.
// ---------------------------------------------------------------------------

// A row that holds for a band of grades names the band after its domain.
export const BAND = /, grades [^,]+$/

// The batch of a lane that a record belongs to: the one that lists the value
// its code scope ends in. A lane that is not split is one batch. Throws, and
// names the record, when it fits no batch or more than one.
export function batchOf(record: Pick<ObjectiveFrontmatter, 'id' | 'code_scope'>, lane: Lane): Batch {
  const batches = batchesOf(lane)
  if (!lane.batches && batches.length === 1) return batches[0]!
  const scope = record.code_scope.replace(BAND, '')
  const fitting = batches.filter((batch) => batch.values.some((value) => scope.endsWith(`, ${value}`)))
  if (fitting.length === 1) return fitting[0]!
  if (fitting.length === 0) throw new Error(`${record.id} fits no batch of ${laneKey(lane)}: its code scope ends in none of their values`)
  throw new Error(`${record.id} fits more than one batch: ${fitting.map((batch) => batch.name).join(', ')}`)
}

// The batch of a lane by its name, or undefined when no name is given. Throws
// on a name that is none of the lane's batches.
export function batchNamed(lane: Lane, name?: string): Batch | undefined {
  const batch = name === undefined ? undefined : batchesOf(lane).find((each) => each.name === name)
  if (name !== undefined && !batch) {
    throw new Error(`${laneKey(lane)} has no batch ${name}: its batches are ${batchesOf(lane).map((each) => each.name).join(', ')}`)
  }
  return batch
}

// Every way the records of a lane differ from the batches the manifest gives
// it, as sentences: a record that fits no batch or several, a batch of
// another size. None when each record is in one batch and the sizes are equal.
export function batchMismatches(records: readonly LaneRecord[], lane: Lane): string[] {
  const misfits: string[] = []
  const sizes = new Map<string, number>()
  for (const record of records) {
    try {
      const { name } = batchOf(record.frontmatter, lane)
      sizes.set(name, (sizes.get(name) ?? 0) + 1)
    } catch (error) {
      misfits.push((error as Error).message)
    }
  }
  const sized = batchesOf(lane)
    .filter((batch) => (sizes.get(batch.name) ?? 0) !== batch.size)
    .map((batch) => `batch ${batch.name} of ${laneKey(lane)} holds ${sizes.get(batch.name) ?? 0} record(s) and the manifest says ${batch.size}`)
  return [...misfits, ...sized]
}

// ---------------------------------------------------------------------------
// The text.
// ---------------------------------------------------------------------------

export interface TextOptions {
  // The root of the wording store. It has to exist only when text is read from it.
  store: string
  // The name of one batch of the lane. Left out, the whole lane.
  batch?: string
  // Only each id and file path.
  ids?: boolean
}

function fromStore(store: string, hash: string, what: string, record: LaneRecord): string {
  const text = getWording(store, hash)
  if (text === null) {
    throw new Error(`${what} of ${record.frontmatter.id} is not in the store at ${store}: run \`${FETCH_COMMAND}\`, then the import that wrote the record`)
  }
  return text.trim()
}

// What the command prints for the records of a lane (readLane), or of one of its batches.
export function laneText(records: readonly LaneRecord[], lane: Lane, options: TextOptions): string {
  const batch = batchNamed(lane, options.batch)
  const chosen = batch ? records.filter((record) => batchOf(record.frontmatter, lane).name === batch.name) : records
  if (options.ids) return chosen.map((record) => `${record.frontmatter.id}\teducation/${record.file}`).join('\n')

  const lines = [
    `# ${laneKey(lane)}${batch ? `, batch ${batch.name}` : ''}: ${chosen.length} record${chosen.length === 1 ? '' : 's'} (the manifest expects ${batch ? batch.size : lane.expectedCount}). What is printed below is official wording: read it, and copy none of it into any file.`,
  ]
  chosen.forEach((record, index) => {
    const fields = record.frontmatter
    lines.push(
      '',
      `===== record ${index + 1} of ${chosen.length}: ${fields.id}`,
      `file: education/${record.file}`,
      `code: ${fields.code === '' ? '(none printed)' : fields.code}`,
      `code scope: ${fields.code_scope}`,
      `title: ${fields.title}`,
      `standing: ${fields.standing}`,
      '----- official wording',
      record.official ?? fromStore(options.store, fields.wording_sha256, 'the official wording', record),
    )
    if (record.accompanying) lines.push(`----- accompanying official text: ${record.accompanying.line}`, record.accompanying.text)
    else if (fields.supplement_sha256 !== undefined) lines.push('----- accompanying official text', fromStore(options.store, fields.supplement_sha256, 'the accompanying text', record))
    lines.push(`===== end of record ${index + 1}`)
  })
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// The command line.
// ---------------------------------------------------------------------------

const USAGE = 'usage: node education/tools/lane-text.ts --lane <jurisdiction>/<level>/<subject> [--batch <name>] [--ids]'

export interface Asked {
  jurisdiction: Jurisdiction
  level: string
  subject: string
  batch?: string
  ids: boolean
}

// The lane a command line names with `--lane`, the batch it names with
// `--batch`, and whether it gives `flag`, the one option that takes no value;
// or what is wrong with it.
export function parseLaneArgs(args: readonly string[], flag: string): { jurisdiction: Jurisdiction; level: string; subject: string; batch?: string; flagged: boolean } | { error: string } {
  let lane: string | undefined
  let batch: string | undefined
  let flagged = false
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!
    if (arg === flag) flagged = true
    else if (arg !== '--lane' && arg !== '--batch') return { error: `${arg} is not an option` }
    else if (args[index + 1] === undefined) return { error: `${arg} needs a value` }
    else if (arg === '--lane') lane = args[++index]
    else batch = args[++index]
  }
  const [jurisdiction, level, subject, ...more] = (lane ?? '').split('/')
  if (!JURISDICTIONS.includes(jurisdiction as Jurisdiction) || !level || !subject || more.length > 0) {
    return { error: `--lane must be <jurisdiction>/<level>/<subject>, with a jurisdiction of ${JURISDICTIONS.join(' or ')}` }
  }
  return { jurisdiction: jurisdiction as Jurisdiction, level, subject, ...(batch === undefined ? {} : { batch }), flagged }
}

export function parseArgs(args: readonly string[]): Asked | { error: string } {
  const parsed = parseLaneArgs(args, '--ids')
  if ('error' in parsed) return parsed
  const { flagged, ...asked } = parsed
  return { ...asked, ids: flagged }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const asked = parseArgs(process.argv.slice(2))
  if ('error' in asked) {
    console.error(`education lane-text: ${asked.error}\n${USAGE}`)
    process.exit(2)
  }
  try {
    const lane = laneOf(asked.jurisdiction, asked.level, asked.subject)
    if (!lane) throw new Error(`the manifest has no lane ${laneKey(asked)}`)
    const records = readLane(resolve(import.meta.dirname, '..'), lane)
    const needsStore = !asked.ids && records.some((record) => record.official === null)
    const store = needsStore ? requireStore() : storeRoot()
    console.log(laneText(records, lane, { store, ...(asked.batch === undefined ? {} : { batch: asked.batch }), ids: asked.ids }))
  } catch (error) {
    console.error(`education lane-text failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
