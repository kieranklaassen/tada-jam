// The shape of a panel report and the numbers read from it: parsing, the
// per-prototype summary, the ranking within each age bucket, and the small
// formatting helpers the documents share. Part of the report generator (report.ts).

import { ageBucket } from '../ideas/types.ts'
import type { AgeBucket, IdeaRecord } from '../ideas/types.ts'
import { AGE_BUCKETS } from '../ideas/validate.ts'
import { TICK_MS } from '../kit/sim.ts'
import { rankScore } from './metrics.ts'
import type { ClarityMeasure, RankedEntry, SubSignals } from './metrics.ts'
import * as T from './thresholds.ts'
import type { CrashRecord } from './types.ts'

// ------------------------------------------------------------------ constants
export const CLEAR = 'clear'
export const BLOCKED = 'blocked-for-polish'
export const NOT_ASSESSED_SHORT = 'not assessed'
export const NOT_ASSESSED = 'not assessed (did not pass the depth gate)'
export const FINDINGS_START = '<!-- findings:start -->'
export const FINDINGS_END = '<!-- findings:end -->'
export const WEAKNESSES_HEADING = '## Known weaknesses'
export const SPEC_MAX_LINES = 70
// Fewer passing prototypes than this adds the near-the-gate list to SHORTLIST.md.
export const SHORTLIST_MIN_PASSING = 3
export const NEAR_GATE_COUNT = 10
// The one plain statement each document makes about what the numbers are.
export const GUESS_NOTE = 'The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge.'

// -------------------------------------------------------------- report shape
export interface HookArmReport {
  session3Share: number
  diffFromBaseline: number
  changedAffordancesOrSignatures: boolean
  verdict: string
}

export interface PersonaMeasures {
  age: number
  inTargetPanel: boolean
  runs: number
  sessionsStartedMean: number
}

export interface SelfPlayReport {
  objective: { name: string; dir: 'up' | 'down' } | null
  policies: Record<string, { meanObjective: number | null; variety: number; episodes: number }>
  overallVariety: number
  dominant: { flagged: boolean; by: string | null; note: string }
}

// The part of lab/reports/<key>.json this generator reads (see run.ts).
export interface PanelReport {
  key: string
  thresholdsVersion: string
  seed: number
  meta: {
    key: string
    name: string
    verb: string
    engine: string
    lens: string
    toy: string | null
    ageBand: [number, number]
    hooks: string[]
    // `supported`, or `n/a: <reason>`.
    hookAblation: string
  }
  targetPanel: string[]
  gate: { pass: boolean; share: number; started: number; runs: number }
  measures: {
    targetPanel: {
      runs: number
      returnShare: { session3: number; session4: number; session5: number }
      play5: { newSignaturesPer100Actions: number; kindGrowth: number; change: number }
      aims: { adopted: number; madeProgress: number; features: string[] }
      clarity: ClarityMeasure
      subSignals: SubSignals
    }
    perPersona: Record<string, PersonaMeasures>
  }
  selfPlay: SelfPlayReport
  hooks: {
    // `none declared`, `n/a: <reason>`, or `ran`.
    status: string
    declared: string[]
    baseline?: { session3Share: number }
    allOff?: { session3Share: number; diffFromBaseline: number; changedAffordancesOrSignatures: boolean }
    perHook?: Record<string, HookArmReport>
  }
  crashes: CrashRecord[]
}

type Kind = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'number|null' | 'object|null'

const REQUIRED: readonly (readonly [string, Kind])[] = [
  ['key', 'string'],
  ['thresholdsVersion', 'string'],
  ['seed', 'number'],
  ['meta.name', 'string'],
  ['meta.verb', 'string'],
  ['meta.engine', 'string'],
  ['meta.lens', 'string'],
  ['meta.ageBand', 'array'],
  ['meta.hooks', 'array'],
  ['meta.hookAblation', 'string'],
  ['targetPanel', 'array'],
  ['gate.pass', 'boolean'],
  ['gate.share', 'number'],
  ['gate.started', 'number'],
  ['gate.runs', 'number'],
  ['measures.targetPanel.runs', 'number'],
  ['measures.targetPanel.returnShare.session3', 'number'],
  ['measures.targetPanel.returnShare.session4', 'number'],
  ['measures.targetPanel.returnShare.session5', 'number'],
  ['measures.targetPanel.play5.newSignaturesPer100Actions', 'number'],
  ['measures.targetPanel.play5.kindGrowth', 'number'],
  ['measures.targetPanel.play5.change', 'number'],
  ['measures.targetPanel.aims.adopted', 'number'],
  ['measures.targetPanel.aims.madeProgress', 'number'],
  ['measures.targetPanel.aims.features', 'array'],
  ['measures.targetPanel.clarity.flag', 'string'],
  ['measures.targetPanel.clarity.touches', 'number'],
  ['measures.targetPanel.clarity.changedShare', 'number'],
  ['measures.targetPanel.clarity.ticksToFirstChange', 'number|null'],
  ['measures.targetPanel.clarity.runsWithChange', 'number'],
  ['measures.targetPanel.clarity.runs', 'number'],
  ['measures.targetPanel.clarity.distinctKinds', 'number'],
  ['measures.targetPanel.subSignals.returnScore', 'number'],
  ['measures.targetPanel.subSignals.changeScore', 'number'],
  ['measures.targetPanel.subSignals.aimScore', 'number'],
  ['measures.perPersona', 'object'],
  ['selfPlay.objective', 'object|null'],
  ['selfPlay.policies', 'object'],
  ['selfPlay.overallVariety', 'number'],
  ['selfPlay.dominant.flagged', 'boolean'],
  ['selfPlay.dominant.note', 'string'],
  ['hooks.status', 'string'],
  ['hooks.declared', 'array'],
  ['crashes', 'array'],
]

function valueAt(root: unknown, path: string): unknown {
  let current: unknown = root
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function isKind(value: unknown, kind: Kind): boolean {
  switch (kind) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    case 'array':
      return Array.isArray(value)
    case 'number|null':
      return value === null || isKind(value, 'number')
    case 'object|null':
      return value === null || isKind(value, 'object')
  }
}

// Checks the fields the generator reads. Throws one error naming the key and
// every field that is missing or of the wrong type, so a stale or hand-edited
// report never becomes a document silently.
export function parseReport(raw: unknown, key: string): PanelReport {
  const problems: string[] = []
  for (const [path, kind] of REQUIRED) {
    if (!isKind(valueAt(raw, path), kind)) problems.push(`${path} should be ${kind}`)
  }
  if (problems.length === 0) {
    const report = raw as PanelReport
    if (report.key !== key) problems.push(`key is ${report.key}, expected ${key}`)
    if (report.thresholdsVersion !== T.THRESHOLDS_VERSION) {
      problems.push(`made with thresholds ${report.thresholdsVersion}, but this code is ${T.THRESHOLDS_VERSION}; rerun the panel`)
    }
    const band = report.meta.ageBand
    if (band.length !== 2 || !band.every((n) => typeof n === 'number')) problems.push('meta.ageBand should be two whole years')
    for (const [id, persona] of Object.entries(report.measures.perPersona)) {
      if (typeof persona?.inTargetPanel !== 'boolean') problems.push(`measures.perPersona.${id}.inTargetPanel should be boolean`)
      if (typeof persona?.sessionsStartedMean !== 'number') problems.push(`measures.perPersona.${id}.sessionsStartedMean should be number`)
    }
    if (report.hooks.status === 'ran') {
      if (!isKind(valueAt(report, 'hooks.baseline.session3Share'), 'number')) problems.push('hooks.baseline.session3Share should be number')
      if (!isKind(valueAt(report, 'hooks.allOff.session3Share'), 'number')) problems.push('hooks.allOff.session3Share should be number')
      for (const hook of report.hooks.declared) {
        const arm = report.hooks.perHook?.[hook]
        if (!arm || typeof arm.session3Share !== 'number' || typeof arm.verdict !== 'string' || typeof arm.changedAffordancesOrSignatures !== 'boolean') {
          problems.push(`hooks.perHook.${hook} should hold session3Share, changedAffordancesOrSignatures, and verdict`)
        }
      }
    }
  }
  if (problems.length > 0) throw new Error(`report for ${key} is malformed: ${problems.join('; ')}`)
  return raw as PanelReport
}

// ------------------------------------------------------------------- inputs
export interface Prototype {
  key: string
  report: PanelReport
  // The text of SPEC.md.
  spec: string
  // The catalog record whose decision names this prototype, if any.
  idea: IdeaRecord | null
}

export function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

// ---------------------------------------------------------------- formatting
export function fixed(x: number, digits: number): string {
  const text = x.toFixed(digits)
  return Number(text) === 0 ? (0).toFixed(digits) : text
}

export function pct(share: number, digits = 0): string {
  return `${fixed(share * 100, digits)}%`
}

export function points(diff: number): string {
  return `${fixed(Math.abs(diff) * 100, 1)} points`
}

export function cell(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|')
}

export function table(head: readonly string[], rows: readonly (readonly string[])[], right: readonly number[] = []): string[] {
  const line = (cells: readonly string[]): string => `| ${cells.map(cell).join(' | ')} |`
  const rule = head.map((_, i) => (right.includes(i) ? '---:' : '---'))
  return [line(head), `| ${rule.join(' | ')} |`, ...rows.map(line)]
}

export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export function bandText(band: readonly [number, number]): string {
  return band[0] === band[1] ? `${band[0]}` : `${band[0]} to ${band[1]}`
}

export function clip(text: string, max: number): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length <= max ? one : `${one.slice(0, max - 3)}...`
}

export function shortVerdict(verdict: string): string {
  if (verdict.startsWith('inconclusive')) return 'inconclusive'
  if (verdict.startsWith('n/a')) return 'n/a'
  return verdict
}

export function ticksText(ticks: number): string {
  return `tick ${Math.round(ticks)} (about ${fixed((ticks * TICK_MS) / 1000, 1)} s)`
}

export function withFinalNewline(lines: readonly string[]): string {
  return `${lines.join('\n').replace(/\s+$/, '')}\n`
}

// ------------------------------------------------------------------- summary
export interface HookLine {
  name: string
  // The report's verdict, or `n/a: <reason>`, or `no result`.
  verdict: string
}

export interface Summary {
  key: string
  name: string
  verb: string
  engine: string
  lens: string
  toy: string | null
  band: readonly [number, number]
  bucket: AgeBucket
  pass: boolean
  started: number
  runs: number
  shares: { s3: number; s4: number; s5: number }
  // Runs (of `runs`) that start session 3, 4, and 5.
  counts: { s3: number; s4: number; s5: number }
  play5: number
  aimsAdopted: number
  aimsProgress: number
  dominant: boolean
  dominantBy: string | null
  hasObjective: boolean
  // `clear` or `blocked-for-polish` for a prototype that passed the gate, else
  // `not assessed`: clarity is read only after depth.
  clarity: typeof CLEAR | typeof BLOCKED | typeof NOT_ASSESSED_SHORT
  clarityReason: string | null
  signals: SubSignals
  hooks: HookLine[]
  play5Line: string | null
}

// Why a cue-blind first ten seconds read low, from the frozen clarity lines.
export function clarityReason(clarity: ClarityMeasure): string {
  const reasons: string[] = []
  if (clarity.ticksToFirstChange === null) {
    reasons.push('no cue-blind run changed the sim in the first ten seconds')
  } else if (clarity.ticksToFirstChange > T.CLARITY_MAX_FIRST_TICK) {
    reasons.push(`the first change came at ${ticksText(clarity.ticksToFirstChange)} on average; the line is tick ${T.CLARITY_MAX_FIRST_TICK}`)
  }
  if (clarity.changedShare < T.CLARITY_MIN_SHARE) {
    reasons.push(`only ${pct(clarity.changedShare)} of cue-blind touches changed anything; the line is ${pct(T.CLARITY_MIN_SHARE)}`)
  }
  return reasons.length > 0 ? reasons.join('; ') : 'the cue-blind first ten seconds read low'
}

function hookLines(report: PanelReport): HookLine[] {
  const { hooks } = report
  if (hooks.status === 'none declared') return []
  return hooks.declared.map((name) => {
    if (hooks.status !== 'ran') return { name, verdict: hooks.status }
    return { name, verdict: hooks.perHook?.[name]?.verdict ?? 'no result' }
  })
}

export function summarize(proto: Prototype): Summary {
  const { report } = proto
  const measures = report.measures.targetPanel
  const runs = report.gate.runs
  const share = measures.returnShare
  const pass = report.gate.pass
  const low = measures.clarity.flag === 'low'
  return {
    key: proto.key,
    name: report.meta.name,
    verb: report.meta.verb,
    engine: report.meta.engine,
    lens: report.meta.lens,
    toy: report.meta.toy,
    band: report.meta.ageBand,
    bucket: ageBucket(report.meta.ageBand),
    pass,
    started: report.gate.started,
    runs,
    shares: { s3: share.session3, s4: share.session4, s5: share.session5 },
    counts: { s3: Math.round(share.session3 * runs), s4: Math.round(share.session4 * runs), s5: Math.round(share.session5 * runs) },
    play5: measures.play5.change,
    aimsAdopted: measures.aims.adopted,
    aimsProgress: measures.aims.madeProgress,
    dominant: report.selfPlay.dominant.flagged,
    dominantBy: report.selfPlay.dominant.by,
    hasObjective: report.selfPlay.objective !== null,
    clarity: !pass ? NOT_ASSESSED_SHORT : low ? BLOCKED : CLEAR,
    clarityReason: pass && low ? clarityReason(measures.clarity) : null,
    signals: measures.subSignals,
    hooks: hookLines(report),
    play5Line: proto.idea?.play5 ?? null,
  }
}

export function dominantText(s: Summary): string {
  if (!s.hasObjective) return 'no objective'
  return s.dominant ? `yes${s.dominantBy ? ` (${s.dominantBy})` : ''}` : 'no'
}

export function hooksText(s: Summary): string {
  if (s.hooks.length === 0) return 'none'
  return s.hooks.map((h) => `${h.name}: ${shortVerdict(h.verdict)}`).join('; ')
}

// ------------------------------------------------------------------- ranking
export interface RankedRow {
  summary: Summary
  ranked: RankedEntry
}

export interface BucketRanking {
  bucket: AgeBucket
  // Passing prototypes only, best first.
  rows: RankedRow[]
}

// Passing prototypes ranked within their own age bucket; never across buckets.
export function rankByBucket(summaries: readonly Summary[]): BucketRanking[] {
  return AGE_BUCKETS.map((bucket) => {
    const passing = summaries.filter((s) => s.pass && s.bucket === bucket)
    const byKey = new Map(passing.map((s) => [s.key, s]))
    const ranked = rankScore(passing.map((s) => ({ key: s.key, signals: s.signals, dominant: s.dominant })))
    return { bucket, rows: ranked.map((r) => ({ summary: byKey.get(r.key)!, ranked: r })) }
  })
}
