// The idea-catalog validator (plan KTD8). It owns the counts: given the joined
// records it returns a list of problems and never throws, the way
// `validateManifest` does in harness/contract.ts. Records come from
// catalog.ts's join; tests pass small in-memory catalogs.

import { ENGINE_IDS } from './engines.ts'
import type { Engine } from './engines.ts'
import { TOYS } from './toys.ts'
import { ageBucket } from './types.ts'
import type { AgeBucket, IdeaRecord } from './types.ts'

export interface Problem {
  // A short stable name for the rule that failed, e.g. `engine-cap`.
  rule: string
  // The idea the problem is about, when it is about one.
  id?: string
  message: string
}

export interface ValidateOptions {
  // How many built ideas the catalog must hold. Left out, the built count is
  // not checked (small test catalogs). U4 passes 30, which also switches on
  // the batch-balance rules.
  expectedBuilt?: number
}

export const AGE_BUCKETS: readonly AgeBucket[] = ['2-4', '5-6', '7-9', '10-12']

export const MIN_AGE = 2
export const MAX_AGE = 12
export const MAX_BAND_WIDTH = 4

export const MAX_BUILT_PER_ENGINE = 6
export const MIN_BUILT_PER_ENGINE = 2
// The per-engine minimum only applies from this many built ideas up, so a
// small in-memory catalog does not have to cover all eight engines.
export const MIN_BUILT_FOR_ENGINE_FLOOR = 16
export const MIN_BUILT_PER_BUCKET = 4
export const MIN_RESERVES = 6
// Percent of ALL written ideas that are physical-toy ideas, inclusive.
export const WRITTEN_PHYSICAL_PERCENT = { min: 30, max: 40 } as const
// At least this fraction of the BUILT ideas are physical-toy ideas.
export const BUILT_PHYSICAL_DENOMINATOR = 3

export const BATCHES = [1, 2, 3] as const
// The batch-balance rules only run when expectedBuilt is exactly this.
export const BATCH_RULES_BUILT = 30
export const MIN_ENGINES_PER_BATCH = 4
export const MIN_PHYSICAL_PER_BATCH = 3

// Same shape as KEY_PATTERN in harness/contract.ts (the lab may not import it).
const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const ID_PATTERN = /^([a-z]+(?:-[a-z]+)*)-(\d{2})$/

const ENGINE_SET: ReadonlySet<string> = new Set(ENGINE_IDS)
const TOY_IDS: ReadonlySet<string> = new Set(TOYS.map((toy) => toy.id))

function isBlank(text: string | null | undefined): boolean {
  return text === null || text === undefined || text.trim() === ''
}

function percent(part: number, whole: number): string {
  return whole === 0 ? '0.0%' : `${((part * 100) / whole).toFixed(1)}%`
}

export function validate(records: readonly IdeaRecord[], options: ValidateOptions = {}): Problem[] {
  const problems: Problem[] = []
  const add = (rule: string, message: string, id?: string): void => {
    problems.push(id === undefined ? { rule, message } : { rule, id, message })
  }

  // The first record with an id answers `replaces` lookups.
  const byId = new Map<string, IdeaRecord>()
  for (const record of records) if (!byId.has(record.id)) byId.set(record.id, record)

  for (const record of records) checkIdea(record, byId, add)

  const built = records.filter((r) => r.decision?.status === 'built')
  checkBuilt(built, options, add)
  checkWritten(records, built, add)
  return problems
}

type Add = (rule: string, message: string, id?: string) => void

// Rules about one idea on its own, plus `replaces` (which needs the lookup).
function checkIdea(record: IdeaRecord, byId: ReadonlyMap<string, IdeaRecord>, add: Add): void {
  const { id, decision } = record
  const status = decision?.status ?? null
  if (decision === null) add('decision', 'has no decision record', id)

  // AE1: an idea with no engine or no play-5 line must be cut, with a reason.
  const cutWithReason = status === 'cut' && !isBlank(decision?.cutReason)
  if (status === 'cut' && !cutWithReason) add('cut-reason', 'is cut without a reason', id)

  if (record.engine !== null && !ENGINE_SET.has(record.engine)) {
    add('engine', `names an unknown engine "${record.engine}"`, id)
  } else if (record.engine === null && !cutWithReason) {
    add('engine', 'has no depth engine and is not cut with a reason', id)
  }
  for (const secondary of record.secondaryEngines) {
    if (!ENGINE_SET.has(secondary)) add('engine', `names an unknown secondary engine "${secondary}"`, id)
  }
  if (isBlank(record.play5) && !cutWithReason) add('play5', 'has no play-5 line and is not cut with a reason', id)

  // `<engine>-NN`; when the engine is known, the prefix is that engine.
  const match = ID_PATTERN.exec(id)
  if (match === null || !ENGINE_SET.has(match[1]!)) {
    add('id-format', `id "${id}" is not <engine>-NN with a known engine`, id)
  } else if (record.engine !== null && match[1] !== record.engine) {
    add('id-format', `id "${id}" does not start with its engine "${record.engine}"`, id)
  }

  if (record.lens === 'physical-toy') {
    if (isBlank(record.toy)) add('toy', 'is a physical-toy idea and names no toy', id)
    else if (!TOY_IDS.has(record.toy!)) add('toy', `names toy "${record.toy}", which is not in toys.ts`, id)
  } else if (record.lens === 'other') {
    if (record.toy !== null) add('toy', `is not a physical-toy idea, so its toy must be null (found "${record.toy}")`, id)
  } else {
    add('lens', `has unknown lens "${String(record.lens)}"`, id)
  }

  const bandProblem = ageBandProblem(record.ageBand)
  if (bandProblem !== null) add('age-band', bandProblem, id)

  if (status === 'built') {
    if (isBlank(record.verb)) add('verb', 'is built and has no verb', id)
    const protoKey = decision?.protoKey
    if (isBlank(protoKey)) add('proto-key', 'is built and has no protoKey', id)
    else if (!KEBAB_CASE.test(protoKey!)) add('proto-key', `protoKey "${protoKey}" is not kebab-case`, id)
    const batch = decision?.batch
    if (!(BATCHES as readonly (number | null | undefined)[]).includes(batch)) {
      add('batch', `is built and its batch is ${String(batch)}, not 1 to 3`, id)
    }
    if (!isBlank(record.play5) && wordsAreEscalationOnly(record.play5!)) {
      add('play5-escalation', 'is built and its play-5 line is only escalation (harder, faster, more, a higher score)', id)
    }
  }

  if (decision !== null && decision.replaces !== null) {
    if (status !== 'built') {
      add('replaces', `sets replaces "${decision.replaces}" but is not built`, id)
    } else {
      const target = byId.get(decision.replaces)
      if (target === undefined) add('replaces', `replaces "${decision.replaces}", which is not an idea in the catalog`, id)
      else if (target.decision?.status !== 'cut') {
        add('replaces', `replaces "${decision.replaces}", which is ${target.decision?.status ?? 'undecided'}, not cut`, id)
      }
    }
  }
}

function ageBandProblem(band: readonly [number, number]): string | null {
  const [lo, hi] = band
  if (!Number.isInteger(lo) || !Number.isInteger(hi)) return `age band ${String(lo)} to ${String(hi)} is not whole years`
  if (hi < lo) return `age band ${lo} to ${hi} has its ages the wrong way round`
  if (lo < MIN_AGE || hi > MAX_AGE) return `age band ${lo} to ${hi} is outside ${MIN_AGE} to ${MAX_AGE}`
  if (hi - lo + 1 > MAX_BAND_WIDTH) return `age band ${lo} to ${hi} is ${hi - lo + 1} years wide (at most ${MAX_BAND_WIDTH})`
  return null
}

// Rules over the built ideas only.
function checkBuilt(built: readonly IdeaRecord[], options: ValidateOptions, add: Add): void {
  if (options.expectedBuilt !== undefined && built.length !== options.expectedBuilt) {
    add('built-count', `${built.length} ideas are built, expected ${options.expectedBuilt}`)
  }

  // protoKey unique among built ideas; reported on the later idea.
  const keyOwner = new Map<string, string>()
  for (const r of built) {
    const key = r.decision?.protoKey
    if (isBlank(key)) continue
    const owner = keyOwner.get(key!)
    if (owner === undefined) keyOwner.set(key!, r.id)
    else add('proto-key-unique', `protoKey "${key}" is already used by ${owner}`, r.id)
  }

  // A distinct primary verb per built idea, ignoring case; reported on the later idea.
  const verbOwner = new Map<string, string>()
  for (const r of built) {
    if (isBlank(r.verb)) continue
    const verb = r.verb.trim().toLowerCase()
    const owner = verbOwner.get(verb)
    if (owner === undefined) verbOwner.set(verb, r.id)
    else add('verb-distinct', `verb "${verb}" is already used by ${owner}`, r.id)
  }

  // Primary engine: at most 6 built each, at least 2 each once 16 are built.
  const perEngine = new Map<Engine, number>(ENGINE_IDS.map((engine) => [engine, 0]))
  for (const r of built) {
    if (r.engine !== null && perEngine.has(r.engine)) perEngine.set(r.engine, perEngine.get(r.engine)! + 1)
  }
  for (const engine of ENGINE_IDS) {
    const count = perEngine.get(engine)!
    if (count > MAX_BUILT_PER_ENGINE) {
      add('engine-cap', `${engine} is the primary engine of ${count} built ideas (at most ${MAX_BUILT_PER_ENGINE})`)
    }
  }
  if (built.length >= MIN_BUILT_FOR_ENGINE_FLOOR) {
    for (const engine of ENGINE_IDS) {
      const count = perEngine.get(engine)!
      if (count < MIN_BUILT_PER_ENGINE) {
        add('engine-floor', `${engine} is the primary engine of ${count} built ideas (at least ${MIN_BUILT_PER_ENGINE})`)
      }
    }
  }

  // Age buckets: an idea counts once, in the bucket of its lowest age.
  const perBucket = new Map<AgeBucket, number>(AGE_BUCKETS.map((bucket) => [bucket, 0]))
  for (const r of built) {
    const bucket = ageBucket(r.ageBand)
    perBucket.set(bucket, perBucket.get(bucket)! + 1)
  }
  for (const bucket of AGE_BUCKETS) {
    const count = perBucket.get(bucket)!
    if (count < MIN_BUILT_PER_BUCKET) {
      add('age-bucket-floor', `age bucket ${bucket} has ${count} built ideas (at least ${MIN_BUILT_PER_BUCKET})`)
    }
  }

  const builtPhysical = built.filter((r) => r.lens === 'physical-toy')
  if (builtPhysical.length * BUILT_PHYSICAL_DENOMINATOR < built.length) {
    add('built-physical-third', `${builtPhysical.length} of ${built.length} built ideas are physical-toy ideas (at least a third)`)
  }

  if (options.expectedBuilt === BATCH_RULES_BUILT) checkBatches(built, add)
}

// Every batch the same size, from at least 4 engines, with at least 3
// physical-toy ideas, so a partly finished lab is still balanced.
function checkBatches(built: readonly IdeaRecord[], add: Add): void {
  const size = BATCH_RULES_BUILT / BATCHES.length
  for (const batch of BATCHES) {
    const ideas = built.filter((r) => r.decision?.batch === batch)
    if (ideas.length !== size) add('batch-size', `batch ${batch} has ${ideas.length} built ideas (expected ${size})`)
    const engines = new Set(ideas.map((r) => r.engine).filter((engine) => engine !== null && ENGINE_SET.has(engine)))
    if (engines.size < MIN_ENGINES_PER_BATCH) {
      add('batch-engines', `batch ${batch} has ${engines.size} distinct primary engines (at least ${MIN_ENGINES_PER_BATCH})`)
    }
    const physical = ideas.filter((r) => r.lens === 'physical-toy').length
    if (physical < MIN_PHYSICAL_PER_BATCH) {
      add('batch-physical', `batch ${batch} has ${physical} physical-toy ideas (at least ${MIN_PHYSICAL_PER_BATCH})`)
    }
  }
}

// Rules over all written ideas, and the reserve floor.
function checkWritten(records: readonly IdeaRecord[], built: readonly IdeaRecord[], add: Add): void {
  const physical = records.filter((r) => r.lens === 'physical-toy').length
  const { min, max } = WRITTEN_PHYSICAL_PERCENT
  // Integer arithmetic so 30 and 40 percent are inclusive with no rounding.
  if (physical * 100 < min * records.length || physical * 100 > max * records.length) {
    add(
      'physical-share',
      `${physical} of ${records.length} written ideas (${percent(physical, records.length)}) are physical-toy ideas (between ${min} and ${max} percent)`,
    )
  }

  // A reserve promoted to replace a failed build is built, with `replaces` set,
  // and still counts toward the floor.
  const reserves = records.filter((r) => r.decision?.status === 'reserve').length
  const promoted = built.filter((r) => r.decision?.replaces !== null).length
  if (reserves + promoted < MIN_RESERVES) {
    add('reserve-floor', `${reserves + promoted} reserve ideas (${reserves} waiting, ${promoted} promoted), at least ${MIN_RESERVES} needed`)
  }
}

// ---------------------------------------------------------------------------
// Is a play-5 line nothing but "more of the same"?
//
// A small heuristic, not a parser. It answers true only when every word of the
// line is either escalation wording (harder, faster, more levels, a higher
// score, more objects, unlocks) or a filler word, and at least one escalation
// word is present. One word it does not know, such as a noun naming something
// that actually changes, makes the line concrete and the answer false. So it
// errs toward false: it can miss escalation, and it should not call a concrete
// line escalation.
// ---------------------------------------------------------------------------

// "more objects", "extra points", "another level": the quantity word takes the
// next word with it, since "more" plus any noun is still just more.
const QUANTITY_PHRASE = /\b(?:(?:even|many|much|lots)\s+)?(?:more|extra|additional|another)\b(?:\s+[a-z0-9']+)?/g

const ESCALATION_WORDS: ReadonlySet<string> = new Set([
  'more', 'extra', 'additional', 'another', 'most',
  'harder', 'hard', 'faster', 'fast', 'quicker', 'quick', 'quickly', 'speed', 'speeds', 'speedier', 'sooner',
  'bigger', 'big', 'larger', 'large', 'higher', 'high', 'taller', 'longer', 'stronger', 'tougher', 'tighter',
  'denser', 'busier', 'trickier', 'steeper', 'heavier',
  'twice', 'double', 'doubles', 'doubled', 'triple', 'triples', 'tripled',
  'difficult', 'difficulty', 'challenge', 'challenges', 'challenging',
  'level', 'levels', 'score', 'scores', 'points', 'point', 'bonus', 'bonuses', 'combo', 'combos', 'streak', 'streaks',
  'unlock', 'unlocks', 'unlocked', 'unlocking',
  'increase', 'increases', 'increased', 'increasingly', 'ramps', 'escalates',
])

const FILLER_WORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'with', 'without', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'from', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this', 'that', 'these', 'those', 'they', 'them', 'their',
  'there', 'then', 'than', 'so', 'still', 'just', 'only', 'also', 'even', 'very', 'much', 'many', 'lots', 'lot', 'bit', 'little',
  'slightly', 'somewhat', 'all', 'each', 'every', 'any', 'some', 'after', 'before', 'when', 'while', 'if', 'will', 'would',
  'can', 'could', 'has', 'have', 'had', 'do', 'does', 'did', 'you', 'your', 'we', 'i', 'he', 'she', 'what', 'which', 'who',
  'get', 'gets', 'getting', 'got', 'become', 'becomes', 'becoming', 'go', 'goes', 'going', 'keep', 'keeps', 'keeping',
  'grow', 'grows', 'growing', 'play', 'plays', 'played', 'playing', 'game', 'games', 'child', 'children', 'kid', 'kids',
  'player', 'players', 'round', 'rounds', 'session', 'sessions', 'time', 'times', 'again', 'over', 'up', 'down', 'out', 'into',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'twenty', 'hundred', 'dozen',
  'no', 'not', 'nothing', 'everything', 'thing', 'things', 'stuff', 'way', 'same', 'like', 'such',
  'too', 'both', 'gradually', 'eventually', 'later', 'now', 'simply', 'mostly', 'basically',
  'appear', 'appears', 'appearing', 'add', 'adds', 'added', 'come', 'comes', 'show', 'shows', 'screen', 'scene', 'world',
  'new', 'newer', 'change', 'changes', 'changed', 'changing', 'different', 'differs', 'difference',
])

export function wordsAreEscalationOnly(play5: string): boolean {
  let text = play5.toLowerCase().replace(/[’]/g, "'")
  let sawEscalation = false
  text = text.replace(QUANTITY_PHRASE, () => {
    sawEscalation = true
    return ' '
  })
  for (const raw of text.match(/[a-z]+(?:'[a-z]+)*/g) ?? []) {
    const word = raw.replace(/'s$/, '')
    if (ESCALATION_WORDS.has(word)) sawEscalation = true
    else if (!FILLER_WORDS.has(word)) return false
  }
  return sawEscalation
}
