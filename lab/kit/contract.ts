// The shared contract suite's machinery. contract.test.ts runs it over EVERY
// prototype folder, the example included, without per-prototype code. Node
// only (it lists directories and loads modules); the browser shell never
// imports this file.
//
// Everything here is deterministic: a fuzz session is a function of two seeds,
// and the input it produces is logged so it can be replayed into a fresh sim.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ENGINE_IDS } from '../ideas/engines.ts'
import { TOYS } from '../ideas/toys.ts'
import { between, createRng, int, pick } from './rng.ts'
import type { Rng } from './rng.ts'
import { FIELD_H, FIELD_W, MAX_SIGNATURE_BOUND } from './sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, ProtoMeta, Sim, SimConfig } from './sim.ts'

export const LAB_DIR = resolve(import.meta.dirname, '..')
// Three sim-minutes at 33 ms a step: the length of one persona session.
export const SESSION_TICKS = 5454
export const DETERMINISM_TICKS = 600

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface ProtoFolder {
  key: string
  dir: string
  example: boolean
}

// Every folder under lab/protos/ that could be a prototype: not hidden, not
// underscore-prefixed. A folder without meta.ts is still listed here, so the
// recipe check can name it.
export function listProtoDirs(labDir = LAB_DIR): ProtoFolder[] {
  const protosDir = join(labDir, 'protos')
  if (!existsSync(protosDir)) return []
  return readdirSync(protosDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.'))
    .map((entry) => ({ key: entry.name, dir: join(protosDir, entry.name), example: false }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

// The folders the suite runs over: lab/protos/* with a meta.ts, plus the
// example under the key `example`.
export function discoverProtos(labDir = LAB_DIR): ProtoFolder[] {
  const protos = listProtoDirs(labDir).filter((folder) => existsSync(join(folder.dir, 'meta.ts')))
  return [...protos, { key: 'example', dir: join(labDir, 'kit', 'example'), example: true }]
}

// What every folder under lab/protos/ must contain (lab/kit/example is the
// template and is exempt from SPEC.md).
export const RECIPE_FILES = ['meta.ts', 'sim.ts', 'view.ts', 'index.ts', 'sim.test.ts', 'SPEC.md'] as const

export function missingRecipeFiles(dir: string): string[] {
  return RECIPE_FILES.filter((name) => !existsSync(join(dir, name)))
}

export interface LoadedProto {
  meta: ProtoMeta
  createSim: CreateSim
}

// Loads meta.ts and sim.ts only: index.ts and view.ts are browser side.
export async function loadProto(folder: ProtoFolder): Promise<LoadedProto> {
  const metaModule: unknown = await import(pathToFileURL(join(folder.dir, 'meta.ts')).href)
  const simModule: unknown = await import(pathToFileURL(join(folder.dir, 'sim.ts')).href)
  const meta = (metaModule as { meta?: ProtoMeta }).meta
  const createSim = (simModule as { createSim?: CreateSim }).createSim
  if (!meta || typeof meta !== 'object') throw new Error(`${folder.key}/meta.ts must export const meta`)
  if (typeof createSim !== 'function') throw new Error(`${folder.key}/sim.ts must export const createSim`)
  return { meta, createSim }
}

// ---------------------------------------------------------------------------
// Meta validity
// ---------------------------------------------------------------------------

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const TOY_IDS = new Set(TOYS.map((toy) => toy.id))

function isNonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function duplicates(names: readonly string[]): string[] {
  return names.filter((name, index) => names.indexOf(name) !== index)
}

// Problems with a prototype's meta, as plain sentences. Empty means valid.
// `folderName` is the folder the prototype lives in (`example` for the
// template).
export function validateMeta(meta: unknown, folderName: string): string[] {
  const problems: string[] = []
  if (typeof meta !== 'object' || meta === null) return ['meta is not an object']
  const m = meta as Record<string, unknown>

  if (typeof m.key !== 'string' || !KEBAB.test(m.key)) problems.push(`key ${JSON.stringify(m.key)} is not kebab-case`)
  else if (m.key !== folderName) problems.push(`key "${m.key}" must equal the folder name "${folderName}"`)
  if (!isNonBlank(m.name)) problems.push('name is blank')
  if (!isNonBlank(m.verb)) problems.push('verb is blank')

  if (!(ENGINE_IDS as readonly unknown[]).includes(m.engine)) problems.push(`engine ${JSON.stringify(m.engine)} is not one of the eight`)

  if (m.lens !== 'physical-toy' && m.lens !== 'other') problems.push(`lens ${JSON.stringify(m.lens)} must be 'physical-toy' or 'other'`)
  if (m.lens === 'physical-toy' && !isNonBlank(m.toy)) problems.push("lens 'physical-toy' needs a toy id")
  if (m.toy !== undefined && !(typeof m.toy === 'string' && TOY_IDS.has(m.toy))) {
    problems.push(`toy ${JSON.stringify(m.toy)} is not an id in lab/ideas/toys.ts`)
  }

  const band = m.ageBand
  if (!Array.isArray(band) || band.length !== 2 || !band.every((n) => Number.isInteger(n))) {
    problems.push('ageBand must be two whole years')
  } else {
    const [lo, hi] = band as [number, number]
    if (lo < 2 || hi > 12) problems.push(`ageBand ${lo}-${hi} must sit inside 2 to 12`)
    if (hi < lo) problems.push(`ageBand ${lo}-${hi} runs backwards`)
    else if (hi - lo + 1 > 4) problems.push(`ageBand ${lo}-${hi} is wider than four years`)
  }

  const bound = m.signatureBound
  if (!Number.isInteger(bound) || (bound as number) < 2 || (bound as number) > MAX_SIGNATURE_BOUND) {
    problems.push(`signatureBound ${JSON.stringify(bound)} must be a whole number from 2 to ${MAX_SIGNATURE_BOUND}`)
  }

  if (!Array.isArray(m.hooks) || !m.hooks.every(isNonBlank)) problems.push('hooks must be a list of non-empty names')
  else if (duplicates(m.hooks as string[]).length > 0) problems.push('hook names must be unique')

  if (!Array.isArray(m.features)) problems.push('features must be a list')
  else {
    const names: string[] = []
    for (const feature of m.features as unknown[]) {
      const f = feature as { name?: unknown; objective?: unknown } | null
      if (!f || !isNonBlank(f.name)) problems.push('every feature needs a non-empty name')
      else names.push(f.name)
      if (f && f.objective !== undefined && f.objective !== 'up' && f.objective !== 'down') {
        problems.push(`feature ${JSON.stringify(f.name)} objective must be 'up' or 'down'`)
      }
    }
    if (duplicates(names).length > 0) problems.push('feature names must be unique')
  }

  const ablation = m.hookAblation as { supported?: unknown; reason?: unknown } | undefined
  if (!ablation || typeof ablation.supported !== 'boolean') problems.push('hookAblation must say supported: true or false')
  else if (ablation.supported === false && !isNonBlank(ablation.reason)) problems.push('hookAblation unsupported needs a reason')

  return problems
}

// ---------------------------------------------------------------------------
// Source hygiene
// ---------------------------------------------------------------------------

// Walks the source once, dropping // and /* */ comments. String contents are
// kept, or blanked to spaces, so an identifier scan does not trip on the
// word "window" inside a string. Newlines survive, so line numbers stay true.
// A regex literal is treated as code, which is fine for a hygiene scan.
function sanitize(source: string, keepStrings: boolean): string {
  let out = ''
  let mode: 'code' | 'line' | 'block' | 'single' | 'double' | 'template' = 'code'
  let depth = 0
  const templateDepths: number[] = []
  const text = (c: string) => (keepStrings || c === '\n' ? c : ' ')

  for (let i = 0; i < source.length; i++) {
    const c = source[i]!
    const next = source[i + 1]
    if (mode === 'code') {
      if (c === '/' && next === '/') {
        mode = 'line'
        i++
      } else if (c === '/' && next === '*') {
        mode = 'block'
        out += ' '
        i++
      } else if (c === "'") {
        mode = 'single'
        out += c
      } else if (c === '"') {
        mode = 'double'
        out += c
      } else if (c === '`') {
        mode = 'template'
        out += c
      } else if (c === '}' && templateDepths.length > 0 && templateDepths[templateDepths.length - 1] === depth) {
        templateDepths.pop()
        mode = 'template'
        out += c
      } else {
        if (c === '{') depth++
        else if (c === '}') depth--
        out += c
      }
    } else if (mode === 'line') {
      if (c === '\n') {
        mode = 'code'
        out += c
      }
    } else if (mode === 'block') {
      if (c === '*' && next === '/') {
        mode = 'code'
        i++
      } else if (c === '\n') out += c
    } else if (c === '\\') {
      out += text(c)
      if (next !== undefined) out += text(next)
      i++
    } else if (mode === 'template' && c === '`') {
      mode = 'code'
      out += c
    } else if (mode === 'template' && c === '$' && next === '{') {
      templateDepths.push(depth)
      mode = 'code'
      out += '${'
      i++
    } else if ((mode === 'single' && c === "'") || (mode === 'double' && c === '"')) {
      mode = 'code'
      out += c
    } else if (c === '\n' && mode !== 'template') {
      // An unterminated string ends at the line.
      mode = 'code'
      out += c
    } else {
      out += text(c)
    }
  }
  return out
}

export function stripComments(source: string): string {
  return sanitize(source, true)
}

const NONDETERMINISM: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bMath\s*\.\s*random\b/g, 'Math.random (use createRng)'],
  [/\bDate\s*\.\s*now\b/g, 'Date.now (sims advance by ticks, not clocks)'],
  [/\bperformance\s*\.\s*now\b/g, 'performance.now (sims advance by ticks, not clocks)'],
  [/\bnew\s+Date\s*\(/g, 'new Date( (sims advance by ticks, not clocks)'],
]

const DOM_IDENTIFIERS = [
  'document',
  'window',
  'HTMLElement',
  'CanvasRenderingContext2D',
  'localStorage',
  'sessionStorage',
  'requestAnimationFrame',
]

const NETWORK: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bfetch\s*\(/g, 'fetch( (prototypes stay offline)'],
  [/\bXMLHttpRequest\b/g, 'XMLHttpRequest (prototypes stay offline)'],
  [/\bWebSocket\b/g, 'WebSocket (prototypes stay offline)'],
  [/\bsendBeacon\b/g, 'sendBeacon (prototypes stay offline)'],
]

function lineOf(text: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++
  return line
}

// Problems in one prototype file, as `file:line: what`. meta.ts and sim.ts
// must be pure and deterministic; every file must stay offline.
export function scanSource(fileName: string, source: string): string[] {
  const problems: string[] = []
  const base = fileName.split(/[\\/]/).pop() ?? fileName
  const simSide = base === 'meta.ts' || base === 'sim.ts'
  const withStrings = sanitize(source, true)
  const code = sanitize(source, false)

  const flag = (text: string, pattern: RegExp, what: string) => {
    for (const match of text.matchAll(pattern)) problems.push(`${base}:${lineOf(text, match.index)}: ${what}`)
  }

  if (simSide) {
    for (const [pattern, what] of NONDETERMINISM) flag(code, pattern, what)
    flag(code, new RegExp(`\\b(?:${DOM_IDENTIFIERS.join('|')})\\b`, 'g'), 'DOM identifier (meta.ts and sim.ts stay pure)')
  }
  for (const [pattern, what] of NETWORK) flag(code, pattern, what)
  flag(withStrings, /\bhttps?:\/\//gi, 'URL (prototypes stay offline)')
  flag(withStrings, /\bimport\s*\(\s*['"`]\s*(?:https?:|\/\/|data:|blob:)/gi, 'import( of a URL (prototypes stay offline)')
  return problems
}

// ---------------------------------------------------------------------------
// Generated input
// ---------------------------------------------------------------------------

export interface LoggedInput {
  tick: number
  input: PointerInput
}

const EXTREMES = [1e6, -1e6, 1e9, -1e9, 1e12, -1e12, 32768, -32768, 0.001]

// Mostly inside the field, then edges and corners exactly, just outside, and
// far out of range. Never NaN or Infinity: a browser does not send those.
function fuzzPoint(rng: Rng): { x: number; y: number } {
  const roll = rng()
  if (roll < 0.6) return { x: between(rng, 0, FIELD_W), y: between(rng, 0, FIELD_H) }
  if (roll < 0.7) return { x: pick(rng, [0, FIELD_W]), y: pick(rng, [0, FIELD_H]) }
  if (roll < 0.85) {
    const outside = (max: number) => (rng() < 0.5 ? -between(rng, 0.5, 60) : max + between(rng, 0.5, 60))
    return rng() < 0.5
      ? { x: outside(FIELD_W), y: between(rng, 0, FIELD_H) }
      : { x: outside(FIELD_W), y: outside(FIELD_H) }
  }
  return { x: pick(rng, EXTREMES), y: pick(rng, EXTREMES) }
}

function pointInside(rng: Rng, a: Affordance): { x: number; y: number } {
  return { x: a.x + a.w * between(rng, 0.2, 0.8), y: a.y + a.h * between(rng, 0.2, 0.8) }
}

// Plans one gesture starting at `tick`: a list of [tickOffset, input].
// Kinds cover taps, drags, holds, overlapping ids, a down that never gets an
// up, and an up or move that never had a down.
function planGesture(
  rng: Rng,
  target: Affordance | null,
): Array<{ offset: number; phase: PointerInput['phase']; id: number; x: number; y: number }> {
  const id = int(rng, 0, 3)
  const start = target ? pointInside(rng, target) : fuzzPoint(rng)
  const kind = target ? target.kind : pick(rng, ['tap', 'drag', 'hold', 'strayUp', 'strayMove', 'leak', 'overlap'] as const)
  const at = (offset: number, phase: PointerInput['phase'], p = start, pid = id) => ({
    offset,
    phase,
    id: pid,
    x: p.x,
    y: p.y,
  })

  switch (kind) {
    case 'tap':
      return [at(0, 'down'), at(int(rng, 1, 4), 'up')]
    case 'hold':
      return [at(0, 'down'), at(int(rng, 12, 90), 'up')]
    case 'drag': {
      const end = target ? { x: between(rng, 0, FIELD_W), y: between(rng, 0, FIELD_H) } : fuzzPoint(rng)
      const steps = int(rng, 3, 25)
      const plan = [at(0, 'down')]
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        plan.push(at(s, 'move', { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }))
      }
      plan.push(at(steps + 1, 'up', end))
      return plan
    }
    case 'strayUp':
      return [at(0, 'up')]
    case 'strayMove':
      return [at(0, 'move')]
    case 'leak':
      // Never released, on an id the taps do not reuse.
      return [at(0, 'down', start, 100 + int(rng, 0, 3))]
    case 'overlap':
      return [at(0, 'down'), at(1, 'down', fuzzPoint(rng)), at(int(rng, 2, 8), 'up')]
  }
}

// ---------------------------------------------------------------------------
// Fuzz session
// ---------------------------------------------------------------------------

const EPS = 1e-6

// Problems with one affordance, empty if it is fine: finite, positive size,
// inside the field, a known kind, salience 0 to 1. x and y are the top-left
// corner of the rectangle.
export function affordanceProblems(a: Affordance): string[] {
  const problems: string[] = []
  const numbers = [a.x, a.y, a.w, a.h, a.salience]
  if (!numbers.every((n) => typeof n === 'number' && Number.isFinite(n))) return ['affordance has a non-finite number']
  if (a.w <= 0 || a.h <= 0) problems.push('affordance has no positive size')
  if (a.x < -EPS || a.y < -EPS || a.x + a.w > FIELD_W + EPS || a.y + a.h > FIELD_H + EPS) {
    problems.push(`affordance ${Math.round(a.x)},${Math.round(a.y)} ${Math.round(a.w)}x${Math.round(a.h)} is outside the field`)
  }
  if (a.kind !== 'tap' && a.kind !== 'drag' && a.kind !== 'hold') problems.push(`affordance kind ${String(a.kind)} is unknown`)
  if (a.salience < 0 || a.salience > 1) problems.push('affordance salience is outside 0 to 1')
  return problems
}

export interface RunOutcome {
  log: LoggedInput[]
  // observe().signature after every tick.
  signatures: string[]
  hookNames: string[]
  problems: string[]
  finalObservation: Observation
  finalSnapshotJson: string
}

interface RunOptions {
  createSim: CreateSim
  config: SimConfig
  ticks: number
  declaredFeatures?: readonly string[]
}

// How busy the generated child is. `rate` is the chance a gesture starts on a
// tick; `aimed` is the share of gestures that go for something affordances()
// names (the rest are blind, including the misuse cases).
export interface FuzzProfile {
  rate: number
  aimed: number
}
export const STEADY: FuzzProfile = { rate: 0.06, aimed: 0.5 }
// Hook checks use a busier child, so a hook that only fires after real play
// has a fair chance to fire at least once.
export const BUSY: FuzzProfile = { rate: 0.2, aimed: 0.85 }

// An affordance chosen in proportion to how strongly it draws the eye.
function pickAffordance(rng: Rng, list: readonly Affordance[]): Affordance {
  const weights = list.map((a) => 0.05 + Math.max(0, Math.min(1, a.salience)))
  let roll = rng() * weights.reduce((sum, w) => sum + w, 0)
  for (let i = 0; i < list.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return list[i]!
  }
  return list[list.length - 1]!
}

function checkObservation(obs: Observation, tick: number, declared: readonly string[], problems: Set<string>): void {
  if (typeof obs.signature !== 'string' || obs.signature.length === 0) problems.add('signature is not a non-empty string')
  else if (obs.signature.length > 120) problems.add('signature is not short (over 120 characters)')
  if (typeof obs.features !== 'object' || obs.features === null) {
    problems.add('features is not an object')
  } else {
    for (const [name, value] of Object.entries(obs.features)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) problems.add(`feature "${name}" is not finite (tick ${tick})`)
    }
    for (const name of declared) if (!(name in obs.features)) problems.add(`feature "${name}" is declared in meta but not observed`)
  }
  if (!Array.isArray(obs.events)) problems.add('events is not a list')
  else {
    for (const event of obs.events) {
      const ok = (event.kind === 'hook' || event.kind === 'state') && isNonBlank(event.name)
      if (!ok) problems.add('an event has no kind or no name')
    }
  }
}

// What a session records after every step. fuzzSession and replaySession both
// use it, so the determinism check compares two runs that were recorded the
// same way. `problems` is exposed so the fuzz run can add its affordance
// checks to the same set, in order.
function createRecorder(sim: Sim, declaredFeatures: readonly string[]) {
  const problems = new Set<string>()
  const hookNames = new Set<string>()
  const signatures: string[] = []
  let last: Observation = { signature: '', features: {}, events: [] }
  return {
    problems,
    afterStep(tick: number): void {
      last = sim.observe()
      checkObservation(last, tick, declaredFeatures, problems)
      signatures.push(last.signature)
      for (const event of last.events) if (event.kind === 'hook') hookNames.add(event.name)
    },
    outcome(log: LoggedInput[]): RunOutcome {
      return {
        log,
        signatures,
        hookNames: [...hookNames].sort(),
        problems: [...problems].slice(0, 20),
        finalObservation: last,
        finalSnapshotJson: JSON.stringify(sim.snapshot()),
      }
    },
  }
}

function addAtTick(schedule: Map<number, PointerInput[]>, tick: number, input: PointerInput): void {
  const list = schedule.get(tick) ?? []
  list.push(input)
  schedule.set(tick, list)
}

// Plays one session of generated input. Aimed gestures read affordances() at
// the moment they start; the rest is blind. The input actually delivered is
// logged so replay() can feed the same session to a fresh sim.
export function fuzzSession(options: RunOptions & { fuzzSeed: number; profile?: FuzzProfile }): RunOutcome {
  const { createSim, config, ticks, fuzzSeed, declaredFeatures = [], profile = STEADY } = options
  const rng = createRng(fuzzSeed)
  const sim = createSim(config)
  const recorder = createRecorder(sim, declaredFeatures)
  const { problems } = recorder
  const log: LoggedInput[] = []
  const schedule = new Map<number, PointerInput[]>()
  const checkAffordances = (list: Affordance[]) => {
    for (const a of list) for (const problem of affordanceProblems(a)) problems.add(problem)
  }

  const atStart = sim.affordances()
  if (atStart.length === 0) problems.add('affordances() is empty at tick 0')
  checkAffordances(atStart)

  for (let tick = 0; tick < ticks; tick++) {
    if (rng() < profile.rate) {
      let target: Affordance | null = null
      if (rng() < profile.aimed) {
        const list = sim.affordances()
        if (tick % 97 === 0) checkAffordances(list)
        if (list.length > 0) target = pickAffordance(rng, list)
      }
      for (const step of planGesture(rng, target)) {
        addAtTick(schedule, tick + step.offset, { id: step.id, phase: step.phase, x: step.x, y: step.y })
      }
    }
    for (const input of schedule.get(tick) ?? []) {
      log.push({ tick, input })
      sim.pointer(input)
    }
    schedule.delete(tick)
    sim.step()
    recorder.afterStep(tick)
    if (tick % 211 === 0) {
      checkAffordances(sim.affordances())
      sim.snapshot()
    }
  }
  return recorder.outcome(log)
}

// Feeds a logged session into a fresh sim. It does NOT call affordances() or
// snapshot() in between, so a sim whose reads change its state diverges from
// the fuzz run and the determinism check catches it.
export function replaySession(options: RunOptions & { log: readonly LoggedInput[] }): RunOutcome {
  const { createSim, config, ticks, log, declaredFeatures = [] } = options
  const sim = createSim(config)
  const recorder = createRecorder(sim, declaredFeatures)
  const byTick = new Map<number, PointerInput[]>()
  for (const entry of log) addAtTick(byTick, entry.tick, entry.input)
  for (let tick = 0; tick < ticks; tick++) {
    for (const input of byTick.get(tick) ?? []) sim.pointer(input)
    sim.step()
    recorder.afterStep(tick)
  }
  return recorder.outcome([...log])
}

// ---------------------------------------------------------------------------
// The checks (each returns problems; empty means it holds)
// ---------------------------------------------------------------------------

function configFor(hooks: readonly string[], hints = true, seed = 7): SimConfig {
  return { seed, hooks, hints }
}

const FUZZ_SEED = 1234

// Same seed and same input log give identical signatures, features, and
// snapshot. A different seed is allowed to differ, so nothing asserts it does.
export function checkDeterminism(createSim: CreateSim, meta: ProtoMeta, ticks = DETERMINISM_TICKS): string[] {
  const config = configFor(meta.hooks)
  const declaredFeatures = meta.features.map((f) => f.name)
  const first = fuzzSession({ createSim, config, ticks, fuzzSeed: FUZZ_SEED, declaredFeatures })
  const second = replaySession({ createSim, config, ticks, log: first.log, declaredFeatures })
  const problems: string[] = []
  const divergedAt = first.signatures.findIndex((signature, i) => signature !== second.signatures[i])
  if (divergedAt !== -1) problems.push(`signature diverged on replay at tick ${divergedAt}`)
  if (JSON.stringify(first.finalObservation.features) !== JSON.stringify(second.finalObservation.features)) {
    problems.push('features differ after replay')
  }
  if (first.finalSnapshotJson !== second.finalSnapshotJson) problems.push('snapshot differs after replay')
  return problems
}

// One full session of fuzz: nothing throws (a throw propagates), features stay
// finite, affordances are honest, and the signature count sits between 2 and
// the declared bound.
export function checkFuzz(createSim: CreateSim, meta: ProtoMeta, ticks = SESSION_TICKS): string[] {
  const declaredFeatures = meta.features.map((f) => f.name)
  const problems: string[] = []
  const runs = [
    fuzzSession({ createSim, config: configFor(meta.hooks), ticks, fuzzSeed: FUZZ_SEED, declaredFeatures }),
    // Hints off is how return and self-aim runs play; it must be as safe.
    fuzzSession({ createSim, config: configFor(meta.hooks, false, 8), ticks: 1200, fuzzSeed: 99, declaredFeatures }),
  ]
  for (const run of runs) problems.push(...run.problems)

  const distinct = new Set(runs[0]!.signatures)
  if (distinct.size < 2) problems.push(`only ${distinct.size} distinct signature across a session; need at least 2`)
  if (distinct.size > meta.signatureBound) {
    problems.push(`${distinct.size} distinct signatures exceed the declared signatureBound ${meta.signatureBound}`)
  }
  return problems
}

// With hooks: [] no hook event ever appears; with one hook alone, only that
// hook's name does; with all declared, nothing undeclared.
export function checkHooks(createSim: CreateSim, meta: ProtoMeta, ticks = SESSION_TICKS): string[] {
  const declaredFeatures = meta.features.map((f) => f.name)
  const problems: string[] = []
  const play = (hooks: readonly string[]) =>
    fuzzSession({ createSim, config: configFor(hooks), ticks, fuzzSeed: FUZZ_SEED, declaredFeatures, profile: BUSY })

  const none = play([])
  if (none.hookNames.length > 0) problems.push(`hooks: [] still produced hook events: ${none.hookNames.join(', ')}`)
  // With no hook declared the all-hooks run is the none run, and with exactly
  // one it is that hook's solo run: the same deterministic session, so it is
  // not played twice.
  let all = none
  for (const hook of meta.hooks) {
    const alone = play([hook])
    all = alone
    const others = alone.hookNames.filter((name) => name !== hook)
    if (others.length > 0) problems.push(`hooks: ["${hook}"] also produced: ${others.join(', ')}`)
  }
  if (meta.hooks.length > 1) all = play(meta.hooks)
  const undeclared = all.hookNames.filter((name) => !meta.hooks.includes(name))
  if (undeclared.length > 0) problems.push(`hook events not declared in meta.hooks: ${undeclared.join(', ')}`)
  return problems
}

// The .ts files in a prototype folder, with their contents.
export function readPrototypeSources(dir: string): Array<{ name: string; source: string }> {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.ts'))
    .sort()
    .map((name) => ({ name, source: readFileSync(join(dir, name), 'utf8') }))
}
