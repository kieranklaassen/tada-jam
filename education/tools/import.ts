// The import of both jurisdictions, as `npm run education:import` runs it:
// the California importer (import-california.ts), then the Dutch one
// (import-netherlands.ts).
//
//   node education/tools/import.ts                                         every lane of both
//   node education/tools/import.ts --lane us-ca/kindergarten/mathematics   one lane, by its importer
//   node education/tools/import.ts --lane einde-po/mathematics             the same, the jurisdiction read from the level
//
// A lane is named as everywhere else in the pack, <jurisdiction>/<level>/
// <subject>. The jurisdiction may be left out, because no level belongs to
// both. With `--lane`, only the importer of that lane's jurisdiction runs,
// and it is given the lane as it takes it, <level>/<subject>.
//
// Each importer runs as a command of its own, with its own output and exit
// status; the second does not run when the first fails. This file reads no
// source and writes no record.
//
// The routing is exported for import.test.ts.

import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JURISDICTIONS, LEVELS, SUBJECTS } from './schema.ts'
import type { Jurisdiction, Subject } from './schema.ts'

// The importer of each jurisdiction, in the order they run.
export const IMPORTERS: Record<Jurisdiction, string> = {
  'us-ca': 'import-california.ts',
  nl: 'import-netherlands.ts',
}

// One importer to run: its file under tools/, and the arguments it is given.
export interface ImportRun {
  jurisdiction: Jurisdiction
  script: string
  args: string[]
}

export const USAGE = `usage: npm run education:import [-- --lane [<${JURISDICTIONS.join('|')}>/]<level>/<subject>]`

// The importers a command line asks for, each with its arguments, or what is wrong with it.
export function routeImport(args: readonly string[]): { runs: ImportRun[] } | { error: string } {
  if (args.length === 0) return { runs: JURISDICTIONS.map((jurisdiction) => ({ jurisdiction, script: IMPORTERS[jurisdiction], args: [] })) }
  if (args[0] !== '--lane') return { error: `${args[0]} is not an option` }
  if (args[1] === undefined) return { error: '--lane needs a value' }
  if (args.length > 2) return { error: `${args[2]} is one argument too many` }

  const parts = args[1].split('/')
  if (parts.length !== 2 && parts.length !== 3) return { error: `--lane must be <jurisdiction>/<level>/<subject> or <level>/<subject> (it is "${args[1]}")` }
  const [level, subject] = parts.slice(-2) as [string, string]
  const named = parts.length === 3 ? parts[0]! : undefined
  if (named !== undefined && !JURISDICTIONS.includes(named as Jurisdiction)) return { error: `the jurisdiction of --lane must be one of ${JURISDICTIONS.join(', ')} (it is "${named}")` }
  const owner = JURISDICTIONS.find((jurisdiction) => LEVELS[jurisdiction].includes(level))
  if (owner === undefined) return { error: `--lane names the level "${level}", which is a level of neither jurisdiction` }
  if (named !== undefined && named !== owner) return { error: `--lane names the level "${level}", which is a level of ${owner}, not of ${named}` }
  if (!SUBJECTS.includes(subject as Subject)) return { error: `the subject of --lane must be one of ${SUBJECTS.join(', ')} (it is "${subject}")` }
  return { runs: [{ jurisdiction: owner, script: IMPORTERS[owner], args: ['--lane', `${level}/${subject}`] }] }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const routed = routeImport(process.argv.slice(2))
  if ('error' in routed) {
    console.error(`education import: ${routed.error}\n${USAGE}`)
    process.exit(2)
  }
  for (const run of routed.runs) {
    const done = spawnSync(process.execPath, [join(import.meta.dirname, run.script), ...run.args], { stdio: 'inherit' })
    if (done.error) throw done.error
    if (done.status !== 0) process.exit(done.status ?? 1)
  }
}
