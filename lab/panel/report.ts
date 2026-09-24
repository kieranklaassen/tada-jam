// The report generator (U8). Turns the per-prototype panel reports into the
// documents Kieran reads:
//
//   lab/reports/SHORTLIST.md    the depth gate, then a ranking within each age bucket
//   lab/reports/HOOKS.md        what removing each declared hook did (KTD7)
//   lab/reports/INSTRUMENT.md   the frozen thresholds, the personas, the fixture validation
//   lab/protos/<key>/SPEC.md    the findings block and the known weaknesses
//
// `node lab/panel/report.ts` reads lab/reports/<key>.json for every folder under
// lab/protos (never `example`), each SPEC.md, and the idea catalog, and writes
// nothing at all unless every report and spec is in order. Run
// `node lab/panel/run.ts` first. Output is a pure function of its inputs: no
// timestamps, stable order, so a second run changes nothing.
//
// The panel numbers are model guesses at children, not measurements. Every
// document says so once.
//
// The work is split by document: report-shape.ts (report shape, summary,
// ranking, formatting), report-docs.ts (SHORTLIST, HOOKS, INSTRUMENT), and
// report-spec.ts (SPEC.md). This file joins them and owns the files and the CLI.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCatalog } from '../ideas/catalog.ts'
import type { IdeaRecord } from '../ideas/types.ts'
import { listProtoKeys } from './load.ts'
import { buildHooks, buildInstrument, buildShortlist, validateInstrument } from './report-docs.ts'
import type { InstrumentValidation } from './report-docs.ts'
import { checkSpec, fillSpec } from './report-spec.ts'
import { cmp, parseReport, plural, summarize } from './report-shape.ts'
import type { PanelReport, Prototype } from './report-shape.ts'

export * from './report-docs.ts'
export * from './report-shape.ts'
export * from './report-spec.ts'

// --------------------------------------------------------------- generation
export interface Outputs {
  shortlist: string
  hooks: string
  instrument: string
  // SPEC.md text by prototype key.
  specs: Record<string, string>
}

export function generateDocuments(protos: readonly Prototype[], validation: InstrumentValidation): Outputs {
  const sorted = [...protos].sort((a, b) => cmp(a.key, b.key))
  const specs: Record<string, string> = {}
  for (const proto of sorted) specs[proto.key] = fillSpec(proto.spec, proto.report)
  return {
    shortlist: buildShortlist(sorted),
    hooks: buildHooks(sorted),
    instrument: buildInstrument(validation, sorted.map(summarize)),
    specs,
  }
}

export interface Locations {
  protosDir: string
  reportsDir: string
}

export function defaultLocations(): Locations {
  const lab = join(import.meta.dirname, '..')
  return { protosDir: join(lab, 'protos'), reportsDir: join(lab, 'reports') }
}

// The prototype folders under protosDir that have a meta.ts, never `example`.
export function protoKeys(protosDir: string): string[] {
  return listProtoKeys(protosDir, join(protosDir, '.no-example')).filter((k) => k !== 'example')
}

export function collectPrototypes(locations: Locations, catalog: readonly IdeaRecord[]): { protos: Prototype[]; problems: string[] } {
  const protos: Prototype[] = []
  const problems: string[] = []
  for (const key of protoKeys(locations.protosDir)) {
    const reportPath = join(locations.reportsDir, `${key}.json`)
    const specPath = join(locations.protosDir, key, 'SPEC.md')
    if (!existsSync(reportPath)) {
      problems.push(`no report for ${key}: expected ${reportPath}; run \`node lab/panel/run.ts ${key}\` first`)
      continue
    }
    if (!existsSync(specPath)) {
      problems.push(`no SPEC.md for ${key}: expected ${specPath}`)
      continue
    }
    let report: PanelReport
    try {
      report = parseReport(JSON.parse(readFileSync(reportPath, 'utf8')) as unknown, key)
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error))
      continue
    }
    protos.push({
      key,
      report,
      spec: readFileSync(specPath, 'utf8'),
      idea: catalog.find((r) => r.decision?.protoKey === key) ?? null,
    })
  }
  return { protos, problems }
}

export interface GenerateOptions extends Locations {
  catalog: readonly IdeaRecord[]
  validation?: InstrumentValidation
}

export interface GenerateResult {
  written: string[]
  problems: string[]
}

// Reads everything, checks everything, and only then writes. Any problem means
// nothing is written.
export function generate(options: GenerateOptions): GenerateResult {
  const { protos, problems } = collectPrototypes(options, options.catalog)
  if (problems.length > 0) return { written: [], problems }
  for (const proto of protos) problems.push(...checkSpec(proto.spec, proto.key, { generated: false, report: proto.report }))
  if (problems.length > 0) return { written: [], problems }

  let outputs: Outputs
  try {
    outputs = generateDocuments(protos, options.validation ?? validateInstrument())
  } catch (error) {
    return { written: [], problems: [error instanceof Error ? error.message : String(error)] }
  }
  for (const proto of protos) {
    problems.push(...checkSpec(outputs.specs[proto.key]!, proto.key, { generated: true, report: proto.report }))
  }
  if (problems.length > 0) return { written: [], problems }

  const written: string[] = []
  const put = (path: string, text: string): void => {
    writeFileSync(path, text)
    written.push(path)
  }
  mkdirSync(options.reportsDir, { recursive: true })
  put(join(options.reportsDir, 'SHORTLIST.md'), outputs.shortlist)
  put(join(options.reportsDir, 'HOOKS.md'), outputs.hooks)
  put(join(options.reportsDir, 'INSTRUMENT.md'), outputs.instrument)
  for (const proto of protos) put(join(options.protosDir, proto.key, 'SPEC.md'), outputs.specs[proto.key]!)
  return { written, problems: [] }
}

// ---------------------------------------------------------------------- CLI
export function parseArgs(argv: readonly string[]): Partial<Locations> {
  const out: Partial<Locations> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    const flag = (name: string): string | null => {
      if (arg === `--${name}`) {
        const value = argv[++i]
        if (!value) throw new Error(`--${name} needs a folder`)
        return value
      }
      return arg.startsWith(`--${name}=`) ? arg.slice(name.length + 3) : null
    }
    const reports = flag('reports')
    const protos = flag('protos')
    if (reports !== null) out.reportsDir = reports
    else if (protos !== null) out.protosDir = protos
    else throw new Error(`unknown argument: ${arg}`)
  }
  return out
}

export function main(argv: readonly string[]): void {
  const locations = { ...defaultLocations(), ...parseArgs(argv) }
  if (!existsSync(locations.protosDir) || !statSync(locations.protosDir).isDirectory()) throw new Error(`not a folder: ${locations.protosDir}`)
  const result = generate({ ...locations, catalog: loadCatalog().records })
  if (result.problems.length > 0) {
    for (const problem of result.problems) console.error(`error: ${problem}`)
    console.error(`nothing written: ${plural(result.problems.length, 'problem')}`)
    process.exitCode = 1
    return
  }
  for (const path of result.written) console.log(`wrote ${path}`)
}

if (process.argv[1] === import.meta.filename) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
