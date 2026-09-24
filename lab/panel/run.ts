// Runs the persona panel on prototypes and writes one deterministic JSON report
// per prototype. `node lab/panel/run.ts [key ...] [--seed N]` runs the given
// keys (every key from listProtoKeys() except `example` by default) and writes
// lab/reports/<key>.json. Same seed, same bytes: no timestamps, sorted keys,
// stable ordering.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PERSONAS } from './personas.ts'
import { listProtoKeys, loadProto } from './load.ts'
import {
  aimSummary,
  clarityMeasure,
  gate,
  hookVerdict,
  notApplicable,
  play5Change,
  returnShares,
  round6,
  startedShare,
  subSignals,
  targetPanel,
} from './metrics.ts'
import { masterRunSeed, playClarity, playRun } from './session.ts'
import { runSelfPlay } from './selfplay.ts'
import type { ClarityResult, CrashRecord, PanelProto, Persona, RunResult } from './types.ts'
import { DEFAULT_MASTER_SEED, HOOK_ARM_SESSIONS, NOISE_SEEDS, THRESHOLDS_VERSION } from './thresholds.ts'

// --------------------------------------------------------------- stable JSON
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2) + '\n'
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key]
      if (v !== undefined) out[key] = sortKeys(v)
    }
    return out
  }
  if (typeof value === 'number') return Number.isFinite(value) ? round6(value) : null
  return value
}

// ------------------------------------------------------------------- report
export interface PanelOptions {
  seed?: number
  personas?: readonly Persona[]
}

export interface PanelRuns {
  runs: RunResult[]
  clarity: ClarityResult[]
}

// Every persona plays the prototype over NOISE_SEEDS noise seeds; the first
// ten seconds are played cue-blind and aimed, with hints on.
export function playPersonas(proto: PanelProto, personas: readonly Persona[], masterSeed: number): PanelRuns {
  const runs: RunResult[] = []
  const clarity: ClarityResult[] = []
  for (const persona of personas) {
    for (let k = 0; k < NOISE_SEEDS; k++) {
      const runSeed = masterRunSeed(masterSeed, k)
      runs.push(playRun({ persona, proto, runSeed, seedIndex: k }))
      clarity.push(playClarity({ persona, proto, runSeed, seedIndex: k, mode: 'blind' }))
      clarity.push(playClarity({ persona, proto, runSeed, seedIndex: k, mode: 'aimed' }))
    }
  }
  return { runs, clarity }
}

function playAggregate(runs: readonly RunResult[]) {
  const changes = runs.map(play5Change)
  const mean = (f: (c: (typeof changes)[number]) => number): number =>
    changes.length === 0 ? 0 : changes.reduce((a, c) => a + f(c), 0) / changes.length
  return {
    newSignaturesPer100Actions: mean((c) => c.newSignaturesPer100Actions),
    kindGrowth: mean((c) => c.kindGrowth),
    change: mean((c) => c.change),
  }
}

function measuresFor(runs: readonly RunResult[], clarity: readonly ClarityResult[]) {
  const shares = returnShares(runs)
  return {
    runs: runs.length,
    sessionsStartedMean: runs.length === 0 ? 0 : runs.reduce((a, r) => a + r.reached, 0) / runs.length,
    returnShare: { session3: shares.s3, session4: shares.s4, session5: shares.s5 },
    play5: playAggregate(runs),
    aims: aimSummary(runs),
    clarity: clarityMeasure(clarity),
  }
}

// ------------------------------------------------------------ hook ablation
interface ArmResult {
  share: number
  fingerprints: number[]
  crashes: CrashRecord[]
}

function playArm(proto: PanelProto, panel: readonly Persona[], masterSeed: number, hooks: readonly string[], label: string): ArmResult {
  const fingerprints: number[] = []
  const crashes: CrashRecord[] = []
  const runs: RunResult[] = []
  for (const persona of panel) {
    for (let k = 0; k < NOISE_SEEDS; k++) {
      const run = playRun({
        persona,
        proto,
        runSeed: masterRunSeed(masterSeed, k),
        seedIndex: k,
        hooks,
        playSessions: HOOK_ARM_SESSIONS,
        fingerprint: true,
      })
      runs.push(run)
      fingerprints.push(run.sessions[0]?.fingerprint ?? 0)
      if (run.crash) crashes.push({ ...run.crash, where: `hook arm ${label}: ${run.crash.where}` })
    }
  }
  return { share: startedShare(runs, 3), fingerprints, crashes }
}

function runHookArms(proto: PanelProto, panel: readonly Persona[], masterSeed: number) {
  const { hooks, hookAblation } = proto.meta
  if (hooks.length === 0) return { report: { status: 'none declared', declared: [] as string[] }, crashes: [] as CrashRecord[] }
  if (!hookAblation.supported) {
    return {
      report: { status: notApplicable(hookAblation.reason), declared: [...hooks] },
      crashes: [] as CrashRecord[],
    }
  }
  const baseline = playArm(proto, panel, masterSeed, hooks, 'all on')
  const changedVs = (arm: ArmResult): boolean => arm.fingerprints.some((f, i) => f !== baseline.fingerprints[i])
  const allOff = playArm(proto, panel, masterSeed, [], 'all off')
  const perHook: Record<string, unknown> = {}
  const crashes = [...baseline.crashes, ...allOff.crashes]
  for (const hook of hooks) {
    const arm = playArm(proto, panel, masterSeed, hooks.filter((h) => h !== hook), `without ${hook}`)
    crashes.push(...arm.crashes)
    const drop = baseline.share - arm.share
    const changed = changedVs(arm)
    perHook[hook] = {
      session3Share: arm.share,
      diffFromBaseline: arm.share - baseline.share,
      changedAffordancesOrSignatures: changed,
      verdict: hookVerdict(drop, changed),
    }
  }
  return {
    report: {
      status: 'ran',
      declared: [...hooks],
      baseline: { session3Share: baseline.share },
      allOff: {
        session3Share: allOff.share,
        diffFromBaseline: allOff.share - baseline.share,
        changedAffordancesOrSignatures: changedVs(allOff),
      },
      perHook,
    },
    crashes,
  }
}

// ---------------------------------------------------------------- the report
export function buildReport(proto: PanelProto, options: PanelOptions = {}): Record<string, unknown> {
  const seed = options.seed ?? DEFAULT_MASTER_SEED
  const personas = options.personas ?? PERSONAS
  const meta = proto.meta
  const panel = targetPanel(meta, personas)
  const panelIds = new Set(panel.map((p) => p.id))
  const { runs, clarity } = playPersonas(proto, personas, seed)

  const perPersona: Record<string, unknown> = {}
  for (const persona of personas) {
    const own = runs.filter((r) => r.personaId === persona.id)
    const ownClarity = clarity.filter((c) => c.personaId === persona.id)
    perPersona[persona.id] = { age: persona.age, inTargetPanel: panelIds.has(persona.id), ...measuresFor(own, ownClarity) }
  }
  const panelRuns = runs.filter((r) => panelIds.has(r.personaId))
  const panelClarity = clarity.filter((c) => panelIds.has(c.personaId))
  const verdict = gate(panelRuns)
  const signals = subSignals(panelRuns)

  const selfPlay = runSelfPlay(proto, seed)
  const hooks = runHookArms(proto, panel, seed)

  const crashes: CrashRecord[] = [
    ...runs.flatMap((r) => (r.crash ? [r.crash] : [])),
    ...clarity.flatMap((c) => (c.crash ? [c.crash] : [])),
    ...selfPlay.crashes,
    ...hooks.crashes,
  ].sort((a, b) => {
    const x = `${a.where}|${a.persona}|${a.seedIndex}|${a.tick}`
    const y = `${b.where}|${b.persona}|${b.seedIndex}|${b.tick}`
    return x < y ? -1 : x > y ? 1 : 0
  })

  return {
    key: meta.key,
    thresholdsVersion: THRESHOLDS_VERSION,
    seed,
    meta: {
      key: meta.key,
      name: meta.name,
      verb: meta.verb,
      engine: meta.engine,
      lens: meta.lens,
      toy: meta.toy ?? null,
      ageBand: [...meta.ageBand],
      hooks: [...meta.hooks],
      features: meta.features.map((f) => ({ name: f.name, objective: f.objective ?? null })),
      signatureBound: meta.signatureBound,
      hookAblation: meta.hookAblation.supported ? 'supported' : notApplicable(meta.hookAblation.reason),
    },
    targetPanel: panel.map((p) => p.id),
    gate: { pass: verdict.pass, share: verdict.share, started: verdict.started, runs: verdict.runs },
    measures: {
      targetPanel: { ...measuresFor(panelRuns, panelClarity), subSignals: signals },
      perPersona,
    },
    runs: runs.map((r) => ({
      persona: r.personaId,
      seed: r.seedIndex,
      runSeed: r.runSeed,
      reached: r.reached,
      crashed: r.crash !== null,
      returns: r.decisions.map((d) => ({
        afterSession: d.afterSession,
        left: d.left,
        probability: d.probability,
        returned: d.returned,
      })),
      sessions: r.sessions.map((s) => ({
        index: s.index + 1,
        ticks: s.ticks,
        endedBy: s.endedBy,
        actions: s.actions,
        distinctSignatures: s.signatures.length,
        newSignatures: s.newSignatures,
        kinds: s.kinds,
        aims: s.aims.map((a) => ({
          feature: a.feature,
          dir: a.dir,
          windows: a.windows,
          progressWindows: a.progressWindows,
          madeProgress: a.madeProgress,
        })),
        pull: s.pull,
        left: s.left,
      })),
    })),
    selfPlay: {
      objective: selfPlay.objective,
      policies: selfPlay.policies,
      overallVariety: selfPlay.overallVariety,
      dominant: selfPlay.dominant,
      replayedTicks: selfPlay.replayedTicks,
    },
    hooks: hooks.report,
    crashes,
  }
}

// -------------------------------------------------------------- file output
export interface RunKeysOptions {
  seed?: number
  outDir: string
  load?: (key: string) => Promise<PanelProto>
}

export async function runKeys(keys: readonly string[], options: RunKeysOptions): Promise<Record<string, Record<string, unknown>>> {
  const load = options.load ?? loadProto
  mkdirSync(options.outDir, { recursive: true })
  const reports: Record<string, Record<string, unknown>> = {}
  for (const key of keys) {
    const proto = await load(key)
    const report = buildReport(proto, { seed: options.seed })
    writeFileSync(join(options.outDir, `${key}.json`), stableStringify(report))
    reports[key] = report
  }
  return reports
}

export function parseArgs(argv: readonly string[]): { keys: string[]; seed: number } {
  const keys: string[] = []
  let seed = DEFAULT_MASTER_SEED
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '--seed') {
      const next = Number(argv[++i])
      if (!Number.isInteger(next)) throw new Error('--seed needs a whole number')
      seed = next
    } else if (arg.startsWith('--seed=')) {
      const next = Number(arg.slice('--seed='.length))
      if (!Number.isInteger(next)) throw new Error('--seed needs a whole number')
      seed = next
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown option: ${arg}`)
    } else {
      keys.push(arg)
    }
  }
  return { keys, seed }
}

export async function main(argv: readonly string[]): Promise<void> {
  const parsed = parseArgs(argv)
  const keys = parsed.keys.length > 0 ? parsed.keys : listProtoKeys().filter((k) => k !== 'example')
  const outDir = join(import.meta.dirname, '..', 'reports')
  const reports = await runKeys(keys, { seed: parsed.seed, outDir })
  for (const key of keys) {
    const gateResult = reports[key]!['gate'] as { pass: boolean; started: number; runs: number }
    console.log(`${key}: gate ${gateResult.pass ? 'pass' : 'fail'} (${gateResult.started} of ${gateResult.runs} runs start session 3) -> lab/reports/${key}.json`)
  }
  if (keys.length === 0) console.log('no prototypes to run')
}

if (process.argv[1] === import.meta.filename) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

