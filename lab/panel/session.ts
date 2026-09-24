// Sessions and runs. One persona plays one prototype over up to five sessions
// (KTD6). Each session builds a FRESH sim from a seed derived from the run seed
// and the session index; only the persona's own memory carries over.
//
// The engagement model (KTD5, described at the top of thresholds.ts): interest
// is a store of ticks that drains with time and refills with novelty (a
// signature reached for the first time), with learning progress (the persona's
// prediction of what its actions do is getting better), and with self-set aims
// that move a declared feature the intended way. A constant sim and pure noise
// refill nothing. At the end of a session the persona comes back with a
// probability that depends on how much learning progress and novelty were left.

import { chance, createRng, deriveSeed, hashText, pick } from '../kit/rng.ts'
import type { Rng } from '../kit/rng.ts'
import type { Affordance, AffordanceKind, FeatureSpec, Observation, Sim } from '../kit/sim.ts'
import { createDriver } from './driver.ts'
import type { Aim, Driver, GestureInfo } from './driver.ts'
import type {
  AimRecord,
  ClarityResult,
  CrashRecord,
  EndedBy,
  KeyStat,
  LogEntry,
  PanelProto,
  Persona,
  ReturnDecision,
  RunResult,
  SessionSummary,
} from './types.ts'
import {
  AIM_GAIN,
  AIM_ATTRIBUTION_LIFT,
  AIM_MAX_PER_SESSION,
  AIM_MAX_WINDOWS,
  AIM_MIN_TOUCHES,
  AIM_OBJECTIVE_BIAS,
  AIM_PATIENCE,
  AIM_SURPRISE_FULL,
  AIM_WINDOW_TICKS,
  BOREDOM_REROLL,
  BOREDOM_WINDOW,
  DRAIN,
  FINGERPRINT_STRIDE,
  FIRST_TEN_TICKS,
  LP_BASE,
  LP_GAIN,
  LP_WINDOW,
  LP_Z,
  MEANINGFUL_GAIN,
  NOVELTY_BASE,
  NOVELTY_GAIN,
  PULL_FULL,
  PULL_WINDOW,
  REDISCOVERY,
  SESSIONS,
  SESSION_CAP_TICKS,
  SETTLE_TICKS,
  returnProbability,
} from './thresholds.ts'

// ------------------------------------------------------------------- memory
export interface Memory {
  // Signature -> number of earlier sessions it was reached in.
  seen: Map<string, number>
  // action context -> outcome -> count.
  predictor: Map<string, Map<string, number>>
  // 1 when the persona's prediction of an outcome was wrong, else 0; the last
  // 2 * LP_WINDOW outcomes.
  errors: number[]
  keyStats: Map<string, KeyStat>
}

export function createMemory(): Memory {
  return {
    seen: new Map(),
    predictor: new Map(),
    errors: [],
    keyStats: new Map(),
  }
}

// What the persona expects an action to lead to: the outcome it has seen most
// often after an action like it, or nothing changing when it has seen none.
export function predictNext(memory: Memory, context: string, nothing: string): string {
  const table = memory.predictor.get(context)
  if (!table) return nothing
  let best = nothing
  let bestCount = 0
  for (const [next, count] of table) {
    if (count > bestCount) {
      best = next
      bestCount = count
    }
  }
  return best
}

// An action's context for prediction: its gesture kind, how salient the thing
// aimed at was, and whether the touch landed on it (a child sees whether it did).
// A free touch has no target.
export function actionContext(gesture: { kind: string; salience: number | null; hit: boolean }): string {
  if (gesture.salience === null) return `${gesture.kind}|free`
  return `${gesture.kind}|${Math.round(gesture.salience * 10)}|${gesture.hit ? 'hit' : 'miss'}`
}

// What an action led to: whether the signature changed, and which way each
// declared feature moved.
export function outcomeOf(
  names: readonly string[],
  signatureChanged: boolean,
  before: Record<string, number>,
  after: Record<string, number>,
): string {
  let text = signatureChanged ? 'S' : '-'
  for (const name of names) {
    const delta = (after[name] ?? 0) - (before[name] ?? 0)
    text += delta > 1e-9 ? '+' : delta < -1e-9 ? '-' : '0'
  }
  return text
}

// Learning progress: how much fewer of the last LP_WINDOW predictions were
// wrong than of the LP_WINDOW before them, counted only when that drop is
// unlikely to be chance (a two-proportion z test). Zero for a sim whose
// outcomes never get easier to predict: constant, noise, or a fixed rate.
export function learningProgress(errors: readonly number[]): number {
  if (errors.length < 2 * LP_WINDOW) return 0
  const older = errors.slice(errors.length - 2 * LP_WINDOW, errors.length - LP_WINDOW)
  const newer = errors.slice(errors.length - LP_WINDOW)
  const rate = (list: readonly number[]): number => list.reduce((a, b) => a + b, 0) / list.length
  const before = rate(older)
  const after = rate(newer)
  const drop = before - after
  if (drop <= 0) return 0
  const pooled = (before + after) / 2
  const se = Math.sqrt(Math.max(pooled * (1 - pooled), 1e-9) * (2 / LP_WINDOW))
  return drop / se >= LP_Z ? drop : 0
}

function learn(memory: Memory, context: string, actual: string): void {
  let table = memory.predictor.get(context)
  if (!table) {
    table = new Map()
    memory.predictor.set(context, table)
  }
  table.set(actual, (table.get(actual) ?? 0) + 1)
}

// ---------------------------------------------------------------- returning
// One draw from the persona's own stream.
export function decideReturn(propensity: number, left: number, rng: Rng): { probability: number; returned: boolean } {
  const probability = returnProbability(propensity, left)
  return { probability, returned: rng() < probability }
}

// ------------------------------------------------------------------- seeding
const PERSONA_STREAM = 0x5eed
const SESSION_STREAM = 100
const RETURN_STREAM = 200

export function personaSeed(runSeed: number, personaId: string): number {
  return deriveSeed((runSeed ^ hashText(personaId)) >>> 0, PERSONA_STREAM)
}

export function sessionSeed(runSeed: number, sessionIndex: number): number {
  return deriveSeed(runSeed, sessionIndex)
}

export function masterRunSeed(masterSeed: number, seedIndex: number): number {
  return deriveSeed(masterSeed, seedIndex)
}

// -------------------------------------------------------------------- hashing
function mixHash(h: number, text: string): number {
  let x = h
  for (let i = 0; i < text.length; i++) {
    x ^= text.charCodeAt(i)
    x = Math.imul(x, 0x01000193)
  }
  return x >>> 0
}

function affordanceText(affs: Affordance[]): string {
  return affs.map((a) => `${Math.round(a.x)},${Math.round(a.y)},${Math.round(a.w)},${Math.round(a.h)},${a.kind},${a.salience.toFixed(2)}`).join(';')
}

// ------------------------------------------------------------- session runner
const DEAD_SIM: Sim = {
  step() {},
  pointer() {},
  affordances: () => [],
  observe: () => ({ signature: '', features: {}, events: [] }),
  snapshot: () => null,
}

// Ticks at which an idle copy of the sim changed on its own, so a touch is
// only credited with changes the sim would not have made anyway.
export interface ControlTrace {
  autonomous: Set<string>
}

// The key idleControl writes and processTick reads for "this tick changed on
// its own": `sig` for the signature, or a feature's name.
const AUTONOMOUS_SIGNATURE = 'sig'
function autonomousKey(tick: number, what: string): string {
  return `${tick}:${what}`
}

export interface GestureRecord extends GestureInfo {
  changed: boolean
}

export interface SessionOptions {
  persona: Persona
  proto: PanelProto
  runSeed: number
  sessionIndex: number
  memory: Memory
  rng: Rng
  hooks: readonly string[]
  hints: boolean
  cueBlind?: boolean
  maxTicks?: number
  // Ticks of interest at the start; the persona's attention by default.
  attention?: number
  // Record which touches changed sim state (first-10-seconds runs).
  trackChanges?: boolean
  control?: ControlTrace | null
  // Hash the outcome stream (signatures and affordances) for hook arms.
  fingerprint?: boolean
}

export interface SessionRunner {
  readonly sim: Sim
  readonly log: LogEntry[]
  readonly done: boolean
  readonly crash: CrashRecord | null
  readonly gestures: GestureRecord[]
  readonly changeTicks: number[]
  tick(): void
  summary(): SessionSummary
}

interface PendingOutcome {
  due: number
  gesture: GestureInfo
  signature: string
  features: Record<string, number>
}

// What one judging window of an aim has counted so far.
interface AimWindow {
  windowStart: number
  // The feature's first and last value in the window (meaningful once ticks > 0).
  first: number
  last: number
  // Ticks in the window, ticks within a touch, feature changes, and changes
  // that fell within a touch.
  ticks: number
  touchTicks: number
  changes: number
  touchChanges: number
  touches: number
  // Of those touches, how many led somewhere the persona did not expect.
  surprises: number
}

interface ActiveAim extends Aim, AimWindow {
  patience: number
  record: AimRecord
}

function freshWindow(windowStart: number): AimWindow {
  return { windowStart, first: 0, last: 0, ticks: 0, touchTicks: 0, changes: 0, touchChanges: 0, touches: 0, surprises: 0 }
}

function signOf(dir: 'up' | 'down'): 1 | -1 {
  return dir === 'up' ? 1 : -1
}

// The way a new aim pushes its feature: with the prototype's objective (one
// draw) or against it, or a coin flip when the feature has none (one draw).
function chooseAimDirection(rng: Rng, objective: 'up' | 'down' | undefined): 'up' | 'down' {
  if (objective) {
    if (chance(rng, AIM_OBJECTIVE_BIAS)) return objective
    return objective === 'up' ? 'down' : 'up'
  }
  return chance(rng, 0.5) ? 'up' : 'down'
}

export function finite(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

// An observation's features as finite numbers, one per declared feature.
function readFeatures(specs: readonly FeatureSpec[], obs: Observation): Record<string, number> {
  const values: Record<string, number> = {}
  for (const spec of specs) values[spec.name] = finite(obs.features[spec.name])
  return values
}

export function createSessionRunner(options: SessionOptions): SessionRunner {
  const { persona, proto, memory, rng, hooks, hints, runSeed, sessionIndex } = options
  const maxTicks = options.maxTicks ?? SESSION_CAP_TICKS
  const cueBlind = options.cueBlind ?? false
  const features = proto.meta.features
  const featureNames = features.map((f) => f.name)
  const nothingHappened = outcomeOf(featureNames, false, {}, {})

  const log: LogEntry[] = []
  const gestures: GestureRecord[] = []
  const changeTicks: number[] = []
  const aims: AimRecord[] = []
  const signatures = new Set<string>()
  const kinds = new Set<AffordanceKind>()
  const pending: PendingOutcome[] = []

  let sim: Sim = DEAD_SIM
  let crash: CrashRecord | null = null
  let done = false
  let endedBy: EndedBy = 'cap'
  let tick = 0
  const startInterest = options.attention ?? persona.attention
  let interest = startInterest
  let pull = 0
  let gainSum = 0
  const gainWindow = new Array<number>(PULL_WINDOW).fill(0)
  let sinceGain = 0
  let nextRoll = BOREDOM_WINDOW
  let actions = 0
  let aimedTouches = 0
  let aimedHits = 0
  let freeTouches = 0
  let newSignatures = 0
  let lastSignature: string | null = null
  let lastFeatures: Record<string, number> = {}
  let startSignature = ''
  let startFeatures: Record<string, number> = {}
  let fingerprint = options.fingerprint ? 2166136261 : 0
  let aim: ActiveAim | null = null
  let fingerDown = false
  let lastTouchEnd = -1000

  const driver: Driver = createDriver({ persona, rng, cueBlind, keyStats: memory.keyStats })
  const getAffordances = (): Affordance[] => sim.affordances()

  const fail = (where: string, error: unknown): void => {
    crash = {
      where,
      persona: persona.id,
      seedIndex: -1,
      tick,
      message: error instanceof Error ? error.message : String(error),
    }
    done = true
    endedBy = 'crash'
  }

  try {
    sim = proto.createSim({ seed: sessionSeed(runSeed, sessionIndex), hooks: [...hooks], hints })
  } catch (error) {
    fail(`session ${sessionIndex + 1}`, error)
  }

  // Judge a finished window; returns the interest it earned.
  const evaluateAim = (current: ActiveAim): number => {
    const net = (current.last - current.first) * signOf(current.dir)
    // The feature must have moved the intended way over the window, and its
    // changes must fall within the persona's own touches more than chance
    // would put them there (so a feature that wanders on its own, or a noisy
    // one, is not credited to the persona).
    const chanceShare = current.ticks > 0 ? current.touchTicks / current.ticks : 1
    const attributed =
      current.changes > 0 && current.touchChanges / current.changes >= Math.min(1, AIM_ATTRIBUTION_LIFT * chanceShare)
    const progress = net > 0 && current.touches >= AIM_MIN_TOUCHES && attributed
    current.record.windows += 1
    let gained = 0
    if (progress) {
      current.record.progressWindows += 1
      current.record.madeProgress = true
      current.patience = AIM_PATIENCE
      // Progress refills interest in proportion to how much the persona still
      // had to work out: pushing a number with a move it already knows teaches
      // it nothing and refills nothing.
      const surprise = current.touches > 0 ? current.surprises / current.touches : 0
      gained = AIM_GAIN * (0.5 + persona.draw.mastery) * Math.min(1, surprise / AIM_SURPRISE_FULL)
    } else {
      current.patience -= 1
    }
    Object.assign(current, freshWindow(tick))
    const gaveUp = !progress && current.patience <= 0
    if (gaveUp && !current.record.madeProgress) {
      // An aim that never got anywhere: the persona drifts off.
      done = true
      endedBy = 'drift'
    }
    if (gaveUp || current.record.windows >= AIM_MAX_WINDOWS) {
      // Gave up, or reached and moved as far as it will (done, not failed, when
      // it had made progress).
      driver.setAim(null)
      aim = null
    }
    return gained
  }

  const processTick = (obs: Observation, now: number): void => {
    let gain = 0
    const sig = obs.signature

    // Novelty: a signature reached for the first time this session. The one
    // the session starts in is not a discovery. A signature seen in earlier
    // sessions is worth less each time (habituation).
    if (!signatures.has(sig)) {
      signatures.add(sig)
      const before = memory.seen.get(sig) ?? 0
      memory.seen.set(sig, before + 1)
      if (before === 0) newSignatures += 1
      if (signatures.size > 1) {
        const weight = NOVELTY_BASE + persona.draw.novelty
        gain += NOVELTY_GAIN * weight * REDISCOVERY ** before
      }
    }

    // The features now, and change tracking for first-10-seconds runs.
    const current = readFeatures(features, obs)
    if (options.trackChanges) {
      const autonomous = options.control?.autonomous
      let changed = obs.events.some((e) => e.kind === 'state')
      if (lastSignature !== null && sig !== lastSignature && !autonomous?.has(autonomousKey(now, AUTONOMOUS_SIGNATURE))) changed = true
      for (const spec of features) {
        const before = lastFeatures[spec.name]
        if (before !== undefined && before !== current[spec.name] && !autonomous?.has(autonomousKey(now, spec.name))) changed = true
      }
      if (changed) changeTicks.push(now)
    }
    lastSignature = sig
    lastFeatures = current

    // Outcomes of finished touches: score the persona's prediction.
    while (pending.length > 0 && pending[0]!.due <= now) {
      const outcome = pending.shift()!
      const context = actionContext(outcome.gesture)
      const actual = outcomeOf(featureNames, sig !== outcome.signature, outcome.features, current)
      const wrong = predictNext(memory, context, nothingHappened) === actual ? 0 : 1
      learn(memory, context, actual)
      memory.errors.push(wrong)
      if (memory.errors.length > 2 * LP_WINDOW) memory.errors.shift()
      const progress = learningProgress(memory.errors)
      if (progress > 0) gain += LP_GAIN * progress * (LP_BASE + persona.draw.mastery)
      const key = outcome.gesture.key
      if (key) {
        const stat = memory.keyStats.get(key) ?? { tries: 0, changes: 0 }
        stat.tries += 1
        if (sig !== outcome.signature) stat.changes += 1
        memory.keyStats.set(key, stat)
      }
      if (aim) {
        const delta = ((current[aim.feature] ?? 0) - (outcome.features[aim.feature] ?? 0)) * signOf(aim.dir)
        if (key) driver.report(key, delta)
        aim.touches += 1
        aim.surprises += wrong
      }
    }

    // A self-set aim: sample its feature, and judge each window.
    if (aim) {
      const value = current[aim.feature] ?? 0
      const touching = fingerDown || now - lastTouchEnd <= SETTLE_TICKS
      const moved = aim.ticks > 0 && value !== aim.last
      if (aim.ticks === 0) aim.first = value
      aim.last = value
      aim.ticks += 1
      if (touching) aim.touchTicks += 1
      if (moved) {
        aim.changes += 1
        if (touching) aim.touchChanges += 1
      }
      if (now + 1 - aim.windowStart >= AIM_WINDOW_TICKS) gain += evaluateAim(aim)
    }

    // Interest, pull, boredom.
    interest = Math.min(startInterest, interest + gain - DRAIN)
    const slot = now % PULL_WINDOW
    gainSum += gain - gainWindow[slot]!
    gainWindow[slot] = gain
    pull = gainSum / PULL_WINDOW
    if (gain >= MEANINGFUL_GAIN) {
      sinceGain = 0
      nextRoll = BOREDOM_WINDOW
    } else {
      sinceGain += 1
    }
    if (!done && !aim && aims.length < AIM_MAX_PER_SESSION && sinceGain >= nextRoll) {
      nextRoll = sinceGain + BOREDOM_REROLL
      if (features.length > 0 && chance(rng, persona.aimInvention)) {
        const spec = pick(rng, features)
        const dir = chooseAimDirection(rng, spec.objective)
        const record: AimRecord = {
          feature: spec.name,
          dir,
          adoptedTick: now,
          windows: 0,
          progressWindows: 0,
          madeProgress: false,
        }
        aims.push(record)
        aim = { feature: spec.name, dir, patience: AIM_PATIENCE, record, ...freshWindow(now + 1) }
        driver.setAim({ feature: spec.name, dir })
      }
    }

    if (options.fingerprint) {
      fingerprint = mixHash(fingerprint, sig)
      if (now % FINGERPRINT_STRIDE === 0) fingerprint = mixHash(fingerprint, affordanceText(sim.affordances()))
    }
  }

  const step = (): void => {
    const now = tick
    const s = driver.act(now, getAffordances)
    for (const input of s.inputs) {
      sim.pointer(input)
      log.push({ tick: now, input })
    }
    if (s.started) {
      fingerDown = true
      startSignature = lastSignature ?? ''
      startFeatures = lastFeatures
      actions += 1
      kinds.add(s.started.kind)
      if (s.started.aimed) {
        aimedTouches += 1
        if (s.started.hit) aimedHits += 1
      } else {
        freeTouches += 1
      }
      gestures.push({ ...s.started, changed: false })
    }
    if (s.ended) {
      fingerDown = false
      lastTouchEnd = now
      const record = gestures[gestures.length - 1]
      if (record) record.endTick = s.ended.endTick
      pending.push({
        due: now + SETTLE_TICKS,
        gesture: s.ended,
        signature: startSignature,
        features: startFeatures,
      })
    }
    sim.step()
    const obs = sim.observe()
    tick = now + 1
    processTick(obs, now)
    if (!done) {
      if (interest <= 0) {
        done = true
        endedBy = 'attention'
      } else if (tick >= maxTicks) {
        done = true
        endedBy = 'cap'
      }
    }
  }

  return {
    get sim() {
      return sim
    },
    log,
    get done() {
      return done
    },
    get crash() {
      return crash
    },
    gestures,
    changeTicks,
    tick() {
      if (done) return
      try {
        step()
      } catch (error) {
        fail(`session ${sessionIndex + 1}`, error)
      }
    },
    summary() {
      // What was left when the session ended: the recent rate of interest
      // gained, and for a persona who chose to stop, how recently it last
      // gained any (a cap is the grown-up's choice, not the child's).
      const rate = Math.min(1, pull / PULL_FULL)
      const recency = endedBy === 'cap' ? 1 : Math.max(0, 1 - sinceGain / BOREDOM_WINDOW)
      const left = done && endedBy === 'crash' ? 0 : rate * recency
      return {
        index: sessionIndex,
        ticks: tick,
        endedBy,
        actions,
        kinds: [...kinds].sort(),
        signatures: [...signatures].sort(),
        newSignatures,
        aims: aims.map((a) => ({ ...a })),
        pull,
        left,
        interestLeft: Math.max(0, interest),
        aimedTouches,
        aimedHits,
        freeTouches,
        fingerprint,
      }
    },
  }
}

// ---------------------------------------------------------------------- runs
export interface RunOptions {
  persona: Persona
  proto: PanelProto
  runSeed: number
  seedIndex?: number
  // Enabled hooks; every declared hook by default.
  hooks?: readonly string[]
  // Off by default: return and self-aim runs use no hints (Bonawitz).
  hints?: boolean
  // Sessions to play; the return decision after the last one is still drawn.
  playSessions?: number
  fingerprint?: boolean
  maxTicks?: number
}

export interface RunPlayer {
  readonly sim: Sim
  readonly done: boolean
  readonly crash: CrashRecord | null
  readonly runner: SessionRunner
  tick(): void
  result(): RunResult
}

export function createRunPlayer(options: RunOptions): RunPlayer {
  const { persona, proto, runSeed } = options
  const seedIndex = options.seedIndex ?? 0
  const hooks = options.hooks ?? proto.meta.hooks
  const hints = options.hints ?? false
  const playSessions = Math.min(SESSIONS, options.playSessions ?? SESSIONS)
  const pSeed = personaSeed(runSeed, persona.id)
  const memory = createMemory()
  const sessions: SessionSummary[] = []
  const decisions: ReturnDecision[] = []
  let crash: CrashRecord | null = null
  let done = false
  let reached = 1
  let index = 0

  const startSession = (): SessionRunner =>
    createSessionRunner({
      persona,
      proto,
      runSeed,
      sessionIndex: index,
      memory,
      rng: createRng(deriveSeed(pSeed, SESSION_STREAM + index)),
      hooks,
      hints,
      maxTicks: options.maxTicks,
      fingerprint: options.fingerprint,
    })

  let runner = startSession()

  const finishSession = (): void => {
    const summary = runner.summary()
    sessions.push(summary)
    if (runner.crash) {
      crash = { ...runner.crash, seedIndex }
      done = true
      return
    }
    if (index + 1 >= SESSIONS) {
      done = true
      return
    }
    const rng = createRng(deriveSeed(pSeed, RETURN_STREAM + index))
    const { probability, returned } = decideReturn(persona.returnPropensity, summary.left, rng)
    decisions.push({ afterSession: index + 1, left: summary.left, probability, returned })
    if (!returned) {
      done = true
      return
    }
    reached = index + 2
    if (index + 1 >= playSessions) {
      done = true
      return
    }
    index += 1
    runner = startSession()
    if (runner.crash) finishSession()
  }

  if (runner.crash) finishSession()

  return {
    get sim() {
      return runner.sim
    },
    get done() {
      return done
    },
    get crash() {
      return crash
    },
    get runner() {
      return runner
    },
    tick() {
      if (done) return
      runner.tick()
      if (runner.done) finishSession()
    },
    result() {
      return { personaId: persona.id, seedIndex, runSeed, sessions, reached, decisions, crash }
    },
  }
}

export function playRun(options: RunOptions): RunResult {
  const player = createRunPlayer(options)
  while (!player.done) player.tick()
  return player.result()
}

// ------------------------------------------------- first ten seconds (clarity)
export function idleControl(proto: PanelProto, runSeed: number, hooks: readonly string[], hints: boolean, ticks: number): ControlTrace {
  const autonomous = new Set<string>()
  let sim: Sim
  try {
    sim = proto.createSim({ seed: sessionSeed(runSeed, 0), hooks: [...hooks], hints })
  } catch {
    return { autonomous }
  }
  let lastSignature: string | null = null
  let last: Record<string, number> = {}
  try {
    for (let t = 0; t < ticks; t++) {
      sim.step()
      const obs = sim.observe()
      if (lastSignature !== null && obs.signature !== lastSignature) autonomous.add(autonomousKey(t, AUTONOMOUS_SIGNATURE))
      const now = readFeatures(proto.meta.features, obs)
      for (const spec of proto.meta.features) {
        if (last[spec.name] !== undefined && last[spec.name] !== now[spec.name]) autonomous.add(autonomousKey(t, spec.name))
      }
      lastSignature = obs.signature
      last = now
    }
  } catch {
    // A sim that throws while idle is caught properly by the real runs.
  }
  return { autonomous }
}

export interface ClarityOptions {
  persona: Persona
  proto: PanelProto
  runSeed: number
  seedIndex?: number
  mode: 'blind' | 'aimed'
}

// The first ten seconds: hints ON, a fresh memory, and either cue-blind touches
// spread over the field or the persona's normal aimed play.
export function playClarity(options: ClarityOptions): ClarityResult {
  const { persona, proto, runSeed, mode } = options
  const seedIndex = options.seedIndex ?? 0
  const hooks = proto.meta.hooks
  const control = idleControl(proto, runSeed, hooks, true, FIRST_TEN_TICKS)
  const pSeed = personaSeed(runSeed, persona.id)
  const runner = createSessionRunner({
    persona,
    proto,
    runSeed,
    sessionIndex: 0,
    memory: createMemory(),
    rng: createRng(deriveSeed(pSeed, SESSION_STREAM + 50)),
    hooks,
    hints: true,
    cueBlind: mode === 'blind',
    maxTicks: FIRST_TEN_TICKS,
    attention: Number.MAX_SAFE_INTEGER,
    trackChanges: true,
    control,
  })
  while (!runner.done) runner.tick()
  const gestures = runner.gestures
  let changed = 0
  gestures.forEach((g, i) => {
    const next = gestures[i + 1]
    const end = Math.min(g.endTick + SETTLE_TICKS, next ? next.startTick - 1 : Number.POSITIVE_INFINITY)
    g.changed = runner.changeTicks.some((t) => t >= g.startTick && t <= end)
    if (g.changed) changed += 1
  })
  const firstTouch = gestures[0]?.startTick
  const firstChange = firstTouch === undefined ? undefined : runner.changeTicks.find((t) => t >= firstTouch)
  const summary = runner.summary()
  return {
    personaId: persona.id,
    seedIndex,
    mode,
    touches: gestures.length,
    changed,
    firstChangeTick: firstChange ?? null,
    kinds: summary.kinds,
    aimedTouches: summary.aimedTouches,
    aimedHits: summary.aimedHits,
    crash: runner.crash ? { ...runner.crash, where: 'clarity', seedIndex } : null,
  }
}

