// Renders the idea catalog as markdown, and is the script behind
// `npm run lab:catalog`:
//
//   node lab/ideas/render.ts          write lab/ideas/CATALOG.md
//   node lab/ideas/render.ts --check  write nothing; exit 1 if the file differs
//                                     from what the data renders to
//
// The output is a pure function of the records (sorted by id, no dates), so
// running the script twice changes nothing and `--check` proves it.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from './catalog.ts'
import type { LoadedCatalog } from './catalog.ts'
import { ENGINE_IDS } from './engines.ts'
import { ageBucket } from './types.ts'
import type { IdeaRecord } from './types.ts'
import { AGE_BUCKETS } from './validate.ts'
import type { Problem } from './validate.ts'

const NO_ENGINE = '(no engine)'

// Plain code-unit order: the same on every machine, unlike localeCompare.
function byId(a: IdeaRecord, b: IdeaRecord): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

// Free text goes on one line so an idea stays one bullet group.
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function percent(part: number, whole: number): string {
  return whole === 0 ? '0.0%' : `${((part * 100) / whole).toFixed(1)}%`
}

function statusOf(record: IdeaRecord): string {
  return record.decision?.status ?? 'none'
}

function knownEngine(record: IdeaRecord): boolean {
  return record.engine !== null && (ENGINE_IDS as readonly string[]).includes(record.engine)
}

function bandText(band: readonly [number, number]): string {
  return band[0] === band[1] ? `${band[0]}` : `${band[0]} to ${band[1]}`
}

function renderIdea(record: IdeaRecord): string[] {
  const { decision } = record
  const lines = [
    `### ${record.id}: ${oneLine(record.name)}`,
    '',
    `- Verb: ${oneLine(record.verb)}`,
    `- Age band: ${bandText(record.ageBand)} (bucket ${ageBucket(record.ageBand)})`,
    `- Lens: ${record.lens}${record.toy === null ? '' : ` (toy: ${record.toy})`}`,
    `- Status: ${statusOf(record)}`,
  ]
  if (decision?.batch != null) lines.push(`- Batch: ${decision.batch}`)
  if (decision?.protoKey != null) lines.push(`- Proto key: \`${decision.protoKey}\``)
  if (decision?.reserveOrder != null) lines.push(`- Reserve order: ${decision.reserveOrder}`)
  if (decision?.replaces != null) lines.push(`- Replaces: ${decision.replaces}`)
  lines.push(`- Loop: ${oneLine(record.loop)}`)
  lines.push(`- Play 5: ${record.play5 === null ? 'none' : oneLine(record.play5)}`)
  if (decision?.cutReason != null) lines.push(`- Cut reason: ${oneLine(decision.cutReason)}`)
  lines.push('')
  return lines
}

function renderSummary(sorted: readonly IdeaRecord[], problems: readonly Problem[] | undefined): string[] {
  const built = sorted.filter((r) => statusOf(r) === 'built')
  const count = (status: string) => sorted.filter((r) => statusOf(r) === status).length
  const physical = sorted.filter((r) => r.lens === 'physical-toy')
  const builtPhysical = built.filter((r) => r.lens === 'physical-toy')

  const lines = [
    '## Summary',
    '',
    `- Written: ${sorted.length}`,
    `- Built: ${built.length}`,
    `- Reserve: ${count('reserve')}`,
    `- Cut: ${count('cut')}`,
    `- Promoted reserves (built, replacing a cut idea): ${built.filter((r) => r.decision?.replaces != null).length}`,
  ]
  if (count('none') > 0) lines.push(`- No decision: ${count('none')}`)
  lines.push(`- Physical-toy share of written ideas: ${physical.length} of ${sorted.length} (${percent(physical.length, sorted.length)})`)
  lines.push(`- Physical-toy share of built ideas: ${builtPhysical.length} of ${built.length} (${percent(builtPhysical.length, built.length)})`)
  if (problems !== undefined) {
    lines.push(
      problems.length === 0
        ? '- Validation: passed'
        : `- Validation: ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'} (listed below)`,
    )
  }

  lines.push('', '### Per engine', '', '| Engine | Written | Built | Reserve | Cut |', '| --- | ---: | ---: | ---: | ---: |')
  const groups: [string, IdeaRecord[]][] = ENGINE_IDS.map((engine) => [engine, sorted.filter((r) => r.engine === engine)])
  const unknown = sorted.filter((r) => !knownEngine(r))
  if (unknown.length > 0) groups.push([NO_ENGINE, unknown])
  for (const [name, members] of groups) {
    const of = (status: string) => members.filter((r) => statusOf(r) === status).length
    lines.push(`| ${name} | ${members.length} | ${of('built')} | ${of('reserve')} | ${of('cut')} |`)
  }

  lines.push('', '### Built per age bucket', '', '| Age bucket | Built |', '| --- | ---: |')
  for (const bucket of AGE_BUCKETS) {
    lines.push(`| ${bucket} | ${built.filter((r) => ageBucket(r.ageBand) === bucket).length} |`)
  }
  lines.push('')
  return lines
}

function renderProblems(problems: readonly Problem[]): string[] {
  if (problems.length === 0) return []
  const lines = ['## Problems', '']
  for (const problem of problems) {
    lines.push(`- ${problem.rule}${problem.id === undefined ? '' : ` (${problem.id})`}: ${oneLine(problem.message)}`)
  }
  lines.push('')
  return lines
}

// `problems` is optional: leave it out and the output says nothing about
// validation. The script always passes it.
export function renderCatalog(records: readonly IdeaRecord[], problems?: readonly Problem[]): string {
  const sorted = [...records].sort(byId)
  const lines = [
    '# Idea catalog',
    '',
    '<!-- Generated by `npm run lab:catalog` from lab/ideas. Do not edit by hand. -->',
    '',
    ...renderSummary(sorted, problems),
    ...(problems === undefined ? [] : renderProblems(problems)),
  ]

  for (const engine of ENGINE_IDS) {
    const members = sorted.filter((r) => r.engine === engine)
    lines.push(`## ${engine}`, '')
    if (members.length === 0) lines.push('_No ideas._', '')
    else {
      const built = members.filter((r) => statusOf(r) === 'built').length
      lines.push(`${members.length} ideas, ${built} built.`, '')
      for (const record of members) lines.push(...renderIdea(record))
    }
  }

  const orphans = sorted.filter((r) => !knownEngine(r))
  if (orphans.length > 0) {
    lines.push('## No engine', '')
    for (const record of orphans) lines.push(...renderIdea(record))
  }

  while (lines[lines.length - 1] === '') lines.pop()
  return `${lines.join('\n')}\n`
}

export interface CatalogCliOptions {
  // Where CATALOG.md lives.
  target: string
  load: () => LoadedCatalog
}

export interface CatalogCliResult {
  exitCode: number
  out: string[]
  err: string[]
}

export function runCatalogCli(argv: readonly string[], options: CatalogCliOptions): CatalogCliResult {
  const unknown = argv.filter((arg) => arg !== '--check')
  if (unknown.length > 0) {
    return { exitCode: 2, out: [], err: [`unknown argument: ${unknown[0]}`, 'usage: node lab/ideas/render.ts [--check]'] }
  }
  const check = argv.includes('--check')
  const name = basename(options.target)

  const { records, problems } = options.load()
  const rendered = renderCatalog(records, problems)
  const existing = existsSync(options.target) ? readFileSync(options.target, 'utf8') : null
  // Problems do not fail either mode: the tests own validity, this owns drift.
  const err = problems.length === 0 ? [] : [`${name}: the catalog has ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'}; see its Problems section`]

  if (check) {
    if (existing === rendered) return { exitCode: 0, out: [`${name} is up to date`], err }
    const why = existing === null ? `${name} does not exist` : `${name} differs from the catalog data`
    return { exitCode: 1, out: [], err: [...err, `${why}; run npm run lab:catalog`] }
  }

  if (existing === rendered) return { exitCode: 0, out: [`${name} unchanged`], err }
  writeFileSync(options.target, rendered)
  return { exitCode: 0, out: [`wrote ${name} (${records.length} ideas)`], err }
}

if (import.meta.main) {
  const result = runCatalogCli(process.argv.slice(2), {
    target: fileURLToPath(new URL('./CATALOG.md', import.meta.url)),
    load: () => loadCatalog(),
  })
  for (const line of result.out) console.log(line)
  for (const line of result.err) console.error(line)
  process.exitCode = result.exitCode
}
