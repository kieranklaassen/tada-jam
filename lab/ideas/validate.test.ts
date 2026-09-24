import { describe, expect, it } from 'vitest'
import { ENGINE_IDS } from './engines.ts'
import type { Engine } from './engines.ts'
import { TOY_PARTITIONS } from './toys.ts'
import type { AgeBucket, Decision, IdeaDraft, IdeaRecord, IdeaStatus } from './types.ts'
import { validate, wordsAreEscalationOnly } from './validate.ts'
import type { Problem } from './validate.ts'

// ---------------------------------------------------------------------------
// A compact valid catalog to mutate.
//
// Default shape: 8 engines x 14 ideas = 112 written; per engine the first 4
// (3 for the last two engines) are built, the next one is a reserve, and the
// rest are cut. That is 30 built, 8 reserves. Positions 1, 2, 8, 9, 10 of each
// engine are physical-toy ideas (5 per engine, 40 of 112 = 35.7%), so the
// built ones are 2 per engine (16 of 30). Built ideas cycle through the four
// age buckets and round-robin through batches 1 to 3.
// ---------------------------------------------------------------------------

const BANDS: readonly (readonly [number, number])[] = [
  [2, 4],
  [5, 6],
  [7, 9],
  [10, 12],
]
const PHYSICAL_POSITIONS = [1, 2, 8, 9, 10]
const BUILT_PER_ENGINE: Readonly<Record<Engine, number>> = {
  emergence: 4,
  combination: 4,
  mastery: 4,
  mystery: 4,
  'other-minds': 4,
  expression: 4,
  variation: 3,
  'rule-play': 3,
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

interface CatalogShape {
  perEngine?: number
  physicalPerEngine?: number
}

function makeCatalog({ perEngine = 14, physicalPerEngine = 5 }: CatalogShape = {}): IdeaRecord[] {
  const records: IdeaRecord[] = []
  let builtIndex = 0
  let otherIndex = 0
  let reserveOrder = 0
  for (const engine of ENGINE_IDS) {
    const builtCount = BUILT_PER_ENGINE[engine]
    const physicalAt = PHYSICAL_POSITIONS.slice(0, physicalPerEngine)
    for (let n = 1; n <= perEngine; n += 1) {
      const id = `${engine}-${pad(n)}`
      const status: IdeaStatus = n <= builtCount ? 'built' : n === builtCount + 1 ? 'reserve' : 'cut'
      const physicalIndex = physicalAt.indexOf(n)
      const band = status === 'built' ? BANDS[builtIndex % 4]! : BANDS[otherIndex % 4]!
      const draft: IdeaDraft = {
        id,
        name: `Idea ${id}`,
        loop: `The child pokes ${id} and it answers back.`,
        verb: `${engine.replace('-', '')}${n}`,
        ageBand: band,
        engine,
        secondaryEngines: [],
        lens: physicalIndex >= 0 ? 'physical-toy' : 'other',
        toy: physicalIndex >= 0 ? TOY_PARTITIONS[engine][physicalIndex]! : null,
        play5: `Something learned earlier now opens a route to the ${engine} gate.`,
      }
      const decision: Decision = {
        id,
        status,
        cutReason: status === 'cut' ? 'The critic found no play-5 difference.' : null,
        protoKey: status === 'built' ? `proto-${id}` : null,
        batch: status === 'built' ? ((builtIndex % 3) + 1) as 1 | 2 | 3 : null,
        reserveOrder: status === 'reserve' ? (reserveOrder += 1) : null,
        replaces: null,
      }
      records.push({
        ...draft,
        critique: { id, verdict: status === 'cut' ? 'cut' : 'keep', reason: 'Judged in the test helper.' },
        decision,
      })
      if (status === 'built') builtIndex += 1
      else otherIndex += 1
    }
  }
  return records
}

function patchIdea(records: readonly IdeaRecord[], id: string, patch: Partial<IdeaDraft>): IdeaRecord[] {
  return records.map((r) => (r.id === id ? { ...r, ...patch } : r))
}

function patchDecision(records: readonly IdeaRecord[], id: string, patch: Partial<Decision>): IdeaRecord[] {
  return records.map((r) => (r.id === id ? { ...r, decision: { ...r.decision!, ...patch } } : r))
}

function cutIdea(records: readonly IdeaRecord[], id: string, reason = 'Cut for a test.'): IdeaRecord[] {
  return patchDecision(records, id, { status: 'cut', cutReason: reason, protoKey: null, batch: null, reserveOrder: null })
}

// Make an idea built: gives it the fields a built idea needs.
function buildIdea(records: readonly IdeaRecord[], id: string, batch: 1 | 2 | 3, extra: Partial<Decision> = {}): IdeaRecord[] {
  return patchDecision(records, id, {
    status: 'built',
    cutReason: null,
    protoKey: `proto-${id}`,
    batch,
    reserveOrder: null,
    ...extra,
  })
}

// A failed build replaced by a reserve: the failed idea becomes cut, the
// reserve becomes built in its slot and names it in `replaces`.
function promote(records: readonly IdeaRecord[], reserveId: string, failedId: string): IdeaRecord[] {
  const failed = records.find((r) => r.id === failedId)!
  const withFailedCut = cutIdea(records, failedId, 'The prototype could not be made to work.')
  const withBand = patchIdea(withFailedCut, reserveId, { ageBand: failed.ageBand })
  return buildIdea(withBand, reserveId, failed.decision!.batch!, { replaces: failedId })
}

function builtIds(records: readonly IdeaRecord[]): string[] {
  return records.filter((r) => r.decision?.status === 'built').map((r) => r.id)
}

// Re-band the built ideas, in order, so bucket `i` gets counts[i] of them.
function assignBuckets(records: readonly IdeaRecord[], counts: readonly [number, number, number, number]): IdeaRecord[] {
  const plan: (readonly [number, number])[] = []
  counts.forEach((count, bucket) => {
    for (let i = 0; i < count; i += 1) plan.push(BANDS[bucket]!)
  })
  const built = builtIds(records)
  expect(plan.length).toBe(built.length)
  let result = [...records]
  built.forEach((id, i) => {
    result = patchIdea(result, id, { ageBand: plan[i]! })
  })
  return result
}

function setBatches(records: readonly IdeaRecord[], pick: (id: string, index: number) => 1 | 2 | 3): IdeaRecord[] {
  let result = [...records]
  builtIds(records).forEach((id, i) => {
    result = patchDecision(result, id, { batch: pick(id, i) })
  })
  return result
}

function ruleSet(problems: readonly Problem[]): string[] {
  return [...new Set(problems.map((p) => p.rule))].sort()
}

const THIRTY = { expectedBuilt: 30 }

// Ten built ideas per batch, each batch from exactly four engines, and at
// least four physical-toy ideas (positions 1 and 2) in each.
const FOUR_ENGINE_BATCHES: Readonly<Record<string, 1 | 2 | 3>> = Object.fromEntries([
  ...['emergence-01', 'emergence-02', 'emergence-03', 'combination-01', 'combination-02', 'combination-03'].map((id) => [id, 1]),
  ...['mastery-01', 'mastery-02', 'mystery-01', 'mystery-02'].map((id) => [id, 1]),
  ...['other-minds-01', 'other-minds-02', 'other-minds-03', 'other-minds-04'].map((id) => [id, 2]),
  ...['expression-01', 'expression-02', 'expression-03', 'expression-04', 'emergence-04', 'combination-04'].map((id) => [id, 2]),
  ...['variation-01', 'variation-02', 'variation-03', 'rule-play-01', 'rule-play-02', 'rule-play-03'].map((id) => [id, 3]),
  ...['mastery-03', 'mastery-04', 'mystery-03', 'mystery-04'].map((id) => [id, 3]),
])

describe('the test catalog helper', () => {
  it('builds 30 built, 8 reserve, and 112 written ideas that validate clean', () => {
    const records = makeCatalog()
    const statuses = records.map((r) => r.decision!.status)
    expect(records).toHaveLength(112)
    expect(statuses.filter((s) => s === 'built')).toHaveLength(30)
    expect(statuses.filter((s) => s === 'reserve')).toHaveLength(8)
    expect(records.filter((r) => r.lens === 'physical-toy')).toHaveLength(40)
    expect(validate(records, THIRTY)).toEqual([])
  })

  it('validates clean with no options too, and does not change its input', () => {
    const records = makeCatalog()
    const before = JSON.stringify(records)
    expect(validate(records)).toEqual([])
    expect(validate(records)).toEqual(validate(records))
    expect(JSON.stringify(records)).toBe(before)
  })
})

describe('AE1: an engine and a play-5 line, or a cut with a reason', () => {
  it('a built idea with no engine is a problem', () => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-01', { engine: null }))
    expect(problems.filter((p) => p.rule === 'engine').map((p) => p.id)).toEqual(['emergence-01'])
  })

  it('the same idea cut with a reason passes, even with no engine and no play-5 line', () => {
    const noEngine = patchIdea(makeCatalog(), 'emergence-01', { engine: null, play5: null })
    expect(validate(cutIdea(noEngine, 'emergence-01', 'No depth engine names its play-5 difference.'))).toEqual([])
  })

  it('cut without a reason is a problem, for a null and a blank reason alike', () => {
    for (const cutReason of [null, '', '   ']) {
      const records = patchDecision(makeCatalog(), 'emergence-14', { cutReason })
      expect(validate(records).filter((p) => p.rule === 'cut-reason').map((p) => p.id)).toEqual(['emergence-14'])
    }
  })

  it('a cut idea with no reason does not escape the engine rule', () => {
    const records = patchDecision(patchIdea(makeCatalog(), 'emergence-14', { engine: null, play5: null }), 'emergence-14', {
      cutReason: null,
    })
    const rules = ruleSet(validate(records))
    expect(rules).toContain('cut-reason')
    expect(rules).toContain('engine')
    expect(rules).toContain('play5')
  })

  it('a built or reserve idea with no play-5 line is a problem, blank included', () => {
    for (const id of ['emergence-01', 'emergence-05']) {
      for (const play5 of [null, '', '  ']) {
        const problems = validate(patchIdea(makeCatalog(), id, { play5 }))
        expect(problems.filter((p) => p.rule === 'play5').map((p) => p.id)).toEqual([id])
      }
    }
  })

  it('an unknown engine is a problem, even on a cut idea', () => {
    const bogus = 'gravity' as Engine
    for (const id of ['emergence-01', 'emergence-14']) {
      const problems = validate(patchIdea(makeCatalog(), id, { engine: bogus }))
      expect(problems.filter((p) => p.rule === 'engine').map((p) => p.id)).toContain(id)
    }
  })

  it('an unknown secondary engine is a problem', () => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-01', { secondaryEngines: ['mastery', 'gravity' as Engine] }))
    expect(problems.filter((p) => p.rule === 'engine').map((p) => p.id)).toEqual(['emergence-01'])
    expect(validate(patchIdea(makeCatalog(), 'emergence-01', { secondaryEngines: ['mastery', 'mystery'] }))).toEqual([])
  })

  it('an idea with no decision record is a problem', () => {
    const records = makeCatalog().map((r) => (r.id === 'emergence-14' ? { ...r, decision: null } : r))
    expect(validate(records).filter((p) => p.rule === 'decision').map((p) => p.id)).toEqual(['emergence-14'])
  })
})

describe('idea ids', () => {
  it.each([
    ['too short a number', 'emergence-1'],
    ['a three-digit number', 'emergence-001'],
    ['upper case', 'Emergence-01'],
    ['no number', 'emergence'],
    ['an unknown engine prefix', 'gravity-01'],
    ['the wrong engine for the idea', 'mastery-01'],
  ])('%s is a problem', (_label, id) => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-01', { id }))
    expect(problems.filter((p) => p.rule === 'id-format').map((p) => p.id)).toEqual([id])
  })

  it('an id prefixed with a real engine passes when the engine is missing (a cut fixture)', () => {
    const records = cutIdea(patchIdea(makeCatalog(), 'emergence-14', { engine: null, play5: null }), 'emergence-14', 'Cut.')
    expect(ruleSet(validate(records))).toEqual([])
  })
})

describe('lens and toy', () => {
  it('a physical-toy idea with no toy is a problem', () => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-01', { toy: null }))
    expect(problems.filter((p) => p.rule === 'toy').map((p) => p.id)).toEqual(['emergence-01'])
  })

  it('a physical-toy idea naming a toy that is not in toys.ts is a problem', () => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-01', { toy: 'trampoline' }))
    expect(problems.filter((p) => p.rule === 'toy').map((p) => p.id)).toEqual(['emergence-01'])
  })

  it('a non-physical idea must have toy null', () => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-03', { toy: 'dominoes' }))
    expect(problems.filter((p) => p.rule === 'toy').map((p) => p.id)).toEqual(['emergence-03'])
  })

  it('an unknown lens is a problem', () => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-03', { lens: 'digital' as never }))
    expect(problems.filter((p) => p.rule === 'lens').map((p) => p.id)).toEqual(['emergence-03'])
  })

  it('applies to cut ideas too', () => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-08', { toy: null }))
    expect(problems.filter((p) => p.rule === 'toy').map((p) => p.id)).toEqual(['emergence-08'])
  })
})

describe('age band', () => {
  it.each([
    ['two to five (width 4)', [2, 5]],
    ['nine to twelve (width 4)', [9, 12]],
    ['a single year', [6, 6]],
    ['two to two', [2, 2]],
    ['twelve to twelve', [12, 12]],
  ])('%s passes', (_label, band) => {
    const records = patchIdea(makeCatalog(), 'emergence-14', { ageBand: band as [number, number] })
    expect(validate(records)).toEqual([])
  })

  it.each([
    ['wider than 4 years', [2, 6]],
    ['wider than 4 years, higher up', [7, 12]],
    ['starting below 2', [1, 3]],
    ['ending above 12', [10, 13]],
    ['entirely above 12', [13, 14]],
    ['inverted', [6, 4]],
    ['fractional', [4.5, 6]],
    ['not a number', [Number.NaN, 6]],
  ])('%s is a problem', (_label, band) => {
    const records = patchIdea(makeCatalog(), 'emergence-14', { ageBand: band as [number, number] })
    expect(validate(records).filter((p) => p.rule === 'age-band').map((p) => p.id)).toEqual(['emergence-14'])
  })
})

describe('built ideas: verb, proto key, batch', () => {
  it('a built idea with no proto key is a problem', () => {
    for (const protoKey of [null, '', '  ']) {
      const problems = validate(patchDecision(makeCatalog(), 'emergence-01', { protoKey }))
      expect(problems.filter((p) => p.rule === 'proto-key').map((p) => p.id)).toEqual(['emergence-01'])
    }
  })

  it.each(['Two Words', 'Camel-Case', 'snake_case', 'trailing-', '-leading', 'double--dash', '1starts-with-digit', 'dots.here'])(
    'a proto key of %j is not kebab-case',
    (protoKey) => {
      const problems = validate(patchDecision(makeCatalog(), 'emergence-01', { protoKey }))
      expect(problems.filter((p) => p.rule === 'proto-key').map((p) => p.id)).toEqual(['emergence-01'])
    },
  )

  it.each(['tower', 'sand-castle', 'route-66', 'a-b-c'])('a proto key of %j is fine', (protoKey) => {
    expect(validate(patchDecision(makeCatalog(), 'emergence-01', { protoKey }))).toEqual([])
  })

  it('a built idea needs a batch of 1, 2, or 3', () => {
    for (const batch of [null, 0, 4, 1.5] as unknown as (1 | 2 | 3 | null)[]) {
      const problems = validate(patchDecision(makeCatalog(), 'emergence-01', { batch }))
      expect(problems.filter((p) => p.rule === 'batch').map((p) => p.id)).toEqual(['emergence-01'])
    }
    for (const batch of [1, 2, 3] as const) {
      expect(validate(patchDecision(makeCatalog(), 'emergence-01', { batch }))).toEqual([])
    }
  })

  it('a reserve or cut idea needs neither proto key nor batch', () => {
    expect(validate(patchDecision(makeCatalog(), 'emergence-05', { protoKey: null, batch: null }))).toEqual([])
  })

  it('proto keys must be unique among built ideas', () => {
    const problems = validate(patchDecision(makeCatalog(), 'emergence-02', { protoKey: 'proto-emergence-01' }))
    expect(problems.filter((p) => p.rule === 'proto-key-unique').map((p) => p.id)).toEqual(['emergence-02'])
  })

  it('two built ideas sharing a verb are a problem, case-insensitively, reported on the later one', () => {
    const problems = validate(patchIdea(patchIdea(makeCatalog(), 'emergence-01', { verb: 'Stack' }), 'combination-01', { verb: ' stack ' }))
    expect(problems.filter((p) => p.rule === 'verb-distinct').map((p) => p.id)).toEqual(['combination-01'])
  })

  it('a verb shared with a reserve or cut idea is fine', () => {
    expect(validate(patchIdea(makeCatalog(), 'emergence-05', { verb: 'emergence1' }))).toEqual([])
  })

  it('a built idea with a blank verb is a problem', () => {
    const problems = validate(patchIdea(makeCatalog(), 'emergence-01', { verb: '  ' }))
    expect(problems.filter((p) => p.rule === 'verb').map((p) => p.id)).toEqual(['emergence-01'])
  })
})

describe('built ideas: engines', () => {
  it('an engine primary for 6 built ideas passes and for 7 is a problem', () => {
    let six = makeCatalog()
    six = buildIdea(six, 'emergence-05', 1)
    six = buildIdea(six, 'emergence-06', 2)
    six = patchIdea(six, 'emergence-05', { verb: 'gather' })
    six = patchIdea(six, 'emergence-06', { verb: 'scatter' })
    expect(builtIds(six).filter((id) => id.startsWith('emergence'))).toHaveLength(6)
    expect(ruleSet(validate(six))).not.toContain('engine-cap')

    const seven = patchIdea(buildIdea(six, 'emergence-07', 3), 'emergence-07', { verb: 'sweep' })
    const problems = validate(seven)
    expect(problems.filter((p) => p.rule === 'engine-cap')).toHaveLength(1)
    expect(problems.find((p) => p.rule === 'engine-cap')!.message).toContain('emergence')
  })

  it('each engine needs at least 2 built ideas once 16 or more are built', () => {
    // Keep only the built ideas of the first four engines: 16 built, the
    // other four engines have none.
    const keep = new Set(['emergence', 'combination', 'mastery', 'mystery'])
    let records = makeCatalog()
    for (const r of records.filter((x) => x.decision!.status === 'built' && !keep.has(x.engine!))) {
      records = cutIdea(records, r.id)
    }
    expect(builtIds(records)).toHaveLength(16)
    const floor = validate(records).filter((p) => p.rule === 'engine-floor')
    expect(floor).toHaveLength(4)
    expect(floor.map((p) => p.message).join(' ')).toContain('other-minds')
  })

  it('an engine with exactly 1 built idea is under the floor', () => {
    let records = makeCatalog()
    records = cutIdea(records, 'emergence-02')
    records = cutIdea(records, 'emergence-03')
    records = cutIdea(records, 'emergence-04')
    expect(validate(records).filter((p) => p.rule === 'engine-floor')).toHaveLength(1)
  })

  it('exactly 2 built ideas for every engine passes the floor', () => {
    let records = makeCatalog()
    for (const engine of ENGINE_IDS) {
      records = cutIdea(records, `${engine}-03`)
      if (engine !== 'variation' && engine !== 'rule-play') records = cutIdea(records, `${engine}-04`)
    }
    expect(builtIds(records)).toHaveLength(16)
    expect(ruleSet(validate(records))).not.toContain('engine-floor')
  })

  // The floor of 2 per engine is skipped below 16 built ideas, so a small
  // in-memory catalog does not have to cover all eight engines.
  it('skips the per-engine minimum below 16 built ideas', () => {
    let records = makeCatalog()
    const built = builtIds(records)
    for (const id of built.slice(15)) records = cutIdea(records, id)
    expect(builtIds(records)).toHaveLength(15)
    // Engines after the first four have no built idea, and nothing complains.
    expect(ruleSet(validate(records))).not.toContain('engine-floor')
    // The cap still applies at any size.
    const many = ['emergence-05', 'emergence-06', 'emergence-07'].reduce(
      (acc, id, i) => patchIdea(buildIdea(acc, id, 1), id, { verb: `extra${i}` }),
      records,
    )
    expect(ruleSet(validate(many))).toContain('engine-cap')
  })
})

describe('built ideas: age buckets', () => {
  it('exactly 4 built in every bucket passes', () => {
    expect(ruleSet(validate(assignBuckets(makeCatalog(), [4, 4, 11, 11])))).toEqual([])
  })

  it('fewer than 4 built in a bucket is a problem that names the bucket', () => {
    const problems = validate(assignBuckets(makeCatalog(), [11, 3, 8, 8])).filter((p) => p.rule === 'age-bucket-floor')
    expect(problems).toHaveLength(1)
    expect(problems[0]!.message).toContain('5-6')
  })

  it('reports each short bucket', () => {
    const problems = validate(assignBuckets(makeCatalog(), [0, 0, 15, 15])).filter((p) => p.rule === 'age-bucket-floor')
    expect(problems.map((p) => p.message.match(/\d+-\d+/)![0])).toEqual(['2-4', '5-6'])
  })

  it('a band that straddles buckets (4 to 7) counts once, in the bucket of its lowest age', () => {
    // 2-4 has four built ideas, one of them 4 to 7; 5-6 has three of its own.
    const records = assignBuckets(makeCatalog(), [4, 3, 11, 12])
    const straddling = patchIdea(records, builtIds(records)[0]!, { ageBand: [4, 7] })
    const problems = validate(straddling).filter((p) => p.rule === 'age-bucket-floor')
    // 2-4 still has 4. 5-6 has 3: the straddler does not also count there or in 7-9.
    expect(problems).toHaveLength(1)
    expect(problems[0]!.message).toContain('5-6')
    // Moving the straddler's lowest age up to 5 moves it out of 2-4.
    const moved = patchIdea(records, builtIds(records)[0]!, { ageBand: [5, 8] })
    const movedProblems = validate(moved).filter((p) => p.rule === 'age-bucket-floor')
    expect(movedProblems).toHaveLength(1)
    expect(movedProblems[0]!.message).toContain('2-4')
  })

  it('only built ideas count toward the bucket floor', () => {
    const buckets: Record<AgeBucket, number> = { '2-4': 0, '5-6': 0, '7-9': 0, '10-12': 0 }
    expect(Object.keys(buckets)).toHaveLength(4)
    // Cut a built idea in the 2-4 bucket so it has 3 built ideas, though many are written there.
    const records = assignBuckets(makeCatalog(), [4, 4, 11, 11])
    const cut = cutIdea(records, builtIds(records)[0]!)
    const problems = validate(cut).filter((p) => p.rule === 'age-bucket-floor')
    expect(problems).toHaveLength(1)
    expect(problems[0]!.message).toContain('2-4')
  })
})

describe('physical-toy share', () => {
  it('exactly 30 percent and exactly 40 percent of written ideas both pass (inclusive)', () => {
    const thirty = makeCatalog({ perEngine: 10, physicalPerEngine: 3 })
    expect(thirty.filter((r) => r.lens === 'physical-toy')).toHaveLength(24)
    expect(thirty).toHaveLength(80)
    expect(validate(thirty, THIRTY)).toEqual([])

    const forty = makeCatalog({ perEngine: 10, physicalPerEngine: 4 })
    expect(forty.filter((r) => r.lens === 'physical-toy')).toHaveLength(32)
    expect(validate(forty, THIRTY)).toEqual([])
  })

  it('20 percent and 50 percent are problems', () => {
    expect(ruleSet(validate(makeCatalog({ perEngine: 10, physicalPerEngine: 2 }), THIRTY))).toEqual(['physical-share'])
    expect(ruleSet(validate(makeCatalog({ perEngine: 10, physicalPerEngine: 5 }), THIRTY))).toEqual(['physical-share'])
  })

  it('just under 30 percent and just over 40 percent are problems', () => {
    // 23 of 80 = 28.75 percent
    const under = patchIdea(makeCatalog({ perEngine: 10, physicalPerEngine: 3 }), 'emergence-08', { lens: 'other', toy: null })
    expect(ruleSet(validate(under, THIRTY))).toEqual(['physical-share'])
    // 33 of 80 = 41.25 percent
    const over = patchIdea(makeCatalog({ perEngine: 10, physicalPerEngine: 4 }), 'emergence-03', {
      lens: 'physical-toy',
      toy: TOY_PARTITIONS.emergence[4]!,
    })
    expect(ruleSet(validate(over, THIRTY))).toEqual(['physical-share'])
  })

  it('counts all written ideas, cut ones included', () => {
    // Every physical-toy idea beyond the built ones is cut or a reserve; the share still counts them.
    const records = makeCatalog()
    const physicalNonBuilt = records.filter((r) => r.lens === 'physical-toy' && r.decision!.status !== 'built')
    expect(physicalNonBuilt.length).toBeGreaterThan(0)
    expect(validate(records)).toEqual([])
  })
})

describe('built physical-toy third', () => {
  it('exactly a third of built ideas passes and one fewer is a problem', () => {
    const builtPhysical = makeCatalog()
      .filter((r) => r.decision!.status === 'built' && r.lens === 'physical-toy')
      .map((r) => r.id)
    expect(builtPhysical).toHaveLength(16)

    const flip = (count: number) =>
      builtPhysical.slice(0, count).reduce((acc, id) => patchIdea(acc, id, { lens: 'other', toy: null }), makeCatalog())

    // 10 of 30 built are physical (exactly a third); 34 of 112 written is still over 30 percent.
    expect(validate(flip(6))).toEqual([])
    // 9 of 30 is under a third, and 33 of 112 written also falls under 30 percent.
    expect(ruleSet(validate(flip(7)))).toEqual(['built-physical-third', 'physical-share'])
  })
})

describe('reserves', () => {
  it('exactly 6 reserves passes and 5 is a problem', () => {
    let six = makeCatalog()
    six = cutIdea(six, 'variation-04')
    six = cutIdea(six, 'rule-play-04')
    expect(six.filter((r) => r.decision!.status === 'reserve')).toHaveLength(6)
    expect(validate(six, THIRTY)).toEqual([])

    const five = cutIdea(six, 'expression-05')
    const problems = validate(five, THIRTY).filter((p) => p.rule === 'reserve-floor')
    expect(problems).toHaveLength(1)
    expect(ruleSet(validate(five, THIRTY))).toEqual(['reserve-floor'])
  })

  it('a promoted reserve still counts toward the floor', () => {
    let records = makeCatalog()
    records = cutIdea(records, 'variation-04')
    records = cutIdea(records, 'rule-play-04')
    // 6 reserves; promoting one leaves 5 reserve-status ideas plus 1 promoted.
    const promoted = promote(records, 'emergence-05', 'emergence-04')
    expect(promoted.filter((r) => r.decision!.status === 'reserve')).toHaveLength(5)
    expect(validate(promoted, THIRTY)).toEqual([])

    // Without the `replaces` mark it is only a built idea, and the floor is short.
    const unmarked = patchDecision(promoted, 'emergence-05', { replaces: null })
    expect(ruleSet(validate(unmarked, THIRTY))).toEqual(['reserve-floor'])
  })
})

describe('replaces', () => {
  const swapped = () => promote(makeCatalog(), 'emergence-05', 'emergence-04')

  it('a promoted reserve that names a cut idea passes', () => {
    const records = swapped()
    expect(records.find((r) => r.id === 'emergence-04')!.decision!.status).toBe('cut')
    expect(validate(records, THIRTY)).toEqual([])
  })

  it('naming an id that does not exist is a problem', () => {
    const problems = validate(patchDecision(swapped(), 'emergence-05', { replaces: 'emergence-99' }), THIRTY)
    expect(problems.filter((p) => p.rule === 'replaces').map((p) => p.id)).toEqual(['emergence-05'])
  })

  it('naming an idea that is not cut is a problem', () => {
    for (const target of ['emergence-01', 'combination-05']) {
      const problems = validate(patchDecision(swapped(), 'emergence-05', { replaces: target }), THIRTY)
      expect(problems.filter((p) => p.rule === 'replaces').map((p) => p.id)).toEqual(['emergence-05'])
    }
  })

  it('an idea cannot replace itself', () => {
    const problems = validate(patchDecision(swapped(), 'emergence-05', { replaces: 'emergence-05' }), THIRTY)
    expect(problems.filter((p) => p.rule === 'replaces').map((p) => p.id)).toEqual(['emergence-05'])
  })

  it('only a built idea can replace another', () => {
    const problems = validate(patchDecision(makeCatalog(), 'emergence-06', { replaces: 'emergence-14' }))
    expect(problems.filter((p) => p.rule === 'replaces').map((p) => p.id)).toEqual(['emergence-06'])
  })
})

describe('built count and batch balance (expectedBuilt: 30)', () => {
  it('reports a built count that differs from expectedBuilt', () => {
    const records = cutIdea(makeCatalog(), 'emergence-04')
    expect(ruleSet(validate(records, THIRTY))).toContain('built-count')
    expect(ruleSet(validate(records, { expectedBuilt: 29 }))).not.toContain('built-count')
    expect(ruleSet(validate(records))).not.toContain('built-count')
  })

  it('10 built per batch, 4 or more engines, and 3 or more physical-toy ideas passes', () => {
    expect(validate(makeCatalog(), THIRTY)).toEqual([])
  })

  it('an unbalanced batch is a problem', () => {
    const records = patchDecision(makeCatalog(), 'emergence-01', { batch: 2 })
    const problems = validate(records, THIRTY).filter((p) => p.rule === 'batch-size')
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.map((p) => p.message).join(' ')).toContain('batch 1')
    expect(problems.map((p) => p.message).join(' ')).toContain('batch 2')
  })

  it('a batch with fewer than 4 distinct primary engines is a problem', () => {
    // Engine-major order in blocks of ten: three engines per batch.
    const records = setBatches(makeCatalog(), (_id, i) => (Math.floor(i / 10) + 1) as 1 | 2 | 3)
    const problems = validate(records, THIRTY)
    expect(ruleSet(problems)).toEqual(['batch-engines'])
    expect(problems.filter((p) => p.rule === 'batch-engines')).toHaveLength(3)
  })

  it('exactly 4 distinct engines in a batch passes', () => {
    const records = setBatches(makeCatalog(), (id) => FOUR_ENGINE_BATCHES[id]!)
    for (const batch of [1, 2, 3]) {
      const engines = records.filter((r) => r.decision!.batch === batch).map((r) => r.engine)
      expect(engines).toHaveLength(10)
      expect(new Set(engines).size).toBe(4)
    }
    expect(validate(records, THIRTY)).toEqual([])
  })

  it('swapping one engine out of two four-engine batches names exactly those batches', () => {
    // Batches 1 and 2 trade mystery-01/02 for emergence-04/combination-04: batch 1 keeps
    // emergence, combination, and mastery; batch 2 keeps other-minds, expression, and mystery.
    const records = setBatches(makeCatalog(), (id) => {
      if (id === 'emergence-04' || id === 'combination-04') return 1
      if (id === 'mystery-01' || id === 'mystery-02') return 2
      return FOUR_ENGINE_BATCHES[id]!
    })
    const problems = validate(records, THIRTY)
    expect(ruleSet(problems)).toEqual(['batch-engines'])
    expect(problems).toHaveLength(2)
    expect(problems[0]!.message).toContain('batch 1')
    expect(problems[1]!.message).toContain('batch 2')
  })

  it('a batch with fewer than 3 physical-toy ideas is a problem', () => {
    // Give batch 1 the first ten non-physical built ideas, from five engines.
    const nonPhysical = makeCatalog()
      .filter((r) => r.decision!.status === 'built' && r.lens !== 'physical-toy')
      .map((r) => r.id)
    expect(nonPhysical).toHaveLength(14)
    const batchOne = new Set(nonPhysical.slice(0, 10))
    const rest = builtIds(makeCatalog()).filter((id) => !batchOne.has(id))
    const records = setBatches(makeCatalog(), (id) => {
      if (batchOne.has(id)) return 1
      return ((rest.indexOf(id) % 2) + 2) as 2 | 3
    })
    const problems = validate(records, THIRTY)
    expect(ruleSet(problems)).toEqual(['batch-physical'])
    expect(problems.filter((p) => p.rule === 'batch-physical')).toHaveLength(1)
    expect(problems[0]!.message).toContain('batch 1')
  })

  it('batch balance is only checked when expectedBuilt is 30', () => {
    const skewed = setBatches(makeCatalog(), (_id, i) => (Math.floor(i / 10) + 1) as 1 | 2 | 3)
    expect(validate(skewed)).toEqual([])
    expect(validate(skewed, { expectedBuilt: 24 }).filter((p) => p.rule.startsWith('batch-'))).toEqual([])
  })
})

describe('play-5 escalation rule', () => {
  it('flags a built idea whose play-5 line is only escalation', () => {
    const records = patchIdea(makeCatalog(), 'emergence-01', { play5: 'It gets harder and faster with more levels.' })
    expect(validate(records).filter((p) => p.rule === 'play5-escalation').map((p) => p.id)).toEqual(['emergence-01'])
  })

  it('does not flag a reserve or cut idea, which the critics judge', () => {
    for (const id of ['emergence-05', 'emergence-14']) {
      const records = patchIdea(makeCatalog(), id, { play5: 'A higher score and more objects.' })
      expect(validate(records)).toEqual([])
    }
  })

  it('does not flag a concrete line', () => {
    const records = patchIdea(makeCatalog(), 'emergence-01', {
      play5: 'The dominoes now chain around the corner the child learned to build.',
    })
    expect(validate(records)).toEqual([])
  })
})

describe('wordsAreEscalationOnly', () => {
  it.each([
    'It gets harder and faster.',
    'Harder, faster, more levels.',
    'The game gets harder and faster with more levels and a higher score.',
    'More objects appear on the screen.',
    'A higher score and more objects.',
    'Unlocks more levels.',
    'The speed doubles and it gets a bit harder each round.',
    'Bigger, faster, and there are extra points.',
    'FASTER AND HARDER',
    'Same as before, just faster.',
    'Ten more levels and a bonus.',
  ])('is true for %j', (line) => {
    expect(wordsAreEscalationOnly(line)).toBe(true)
  })

  it.each([
    'The towers topple in a chain the child learned to start from the bottom block.',
    'The child arrives knowing the red key opens the gate and goes after the hidden door.',
    'Faster and harder, and the child now steers the marble around the fork on purpose.',
    'More colours mix in ways the child had not seen.',
    'A new creature that only wakes when it is quiet.',
    'The rope swings in a pattern the child has learned to read, and they jump on the third beat.',
    'Unlocks a hat that changes how the puppet walks.',
  ])('is false for %j', (line) => {
    expect(wordsAreEscalationOnly(line)).toBe(false)
  })

  it('is false for a blank line or one with no escalation wording at all', () => {
    expect(wordsAreEscalationOnly('')).toBe(false)
    expect(wordsAreEscalationOnly('   ')).toBe(false)
    expect(wordsAreEscalationOnly('It is different.')).toBe(false)
    expect(wordsAreEscalationOnly('The game is different.')).toBe(false)
  })
})
