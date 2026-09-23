import { describe, expect, it, vi } from 'vitest'
import { joinCatalog, loadCatalog } from './catalog.ts'
import type { Critique, Decision, IdeaDraft } from './types.ts'

// loadCatalog reads three index modules. Stand-ins keep these tests about the
// wiring, whatever the real catalog holds at the time.
const stub = vi.hoisted(() => {
  const draft = (id: string, engine: string, verb: string) => ({
    id,
    name: `Name of ${id}`,
    loop: 'The child pokes and it answers.',
    verb,
    ageBand: [5, 6],
    engine,
    secondaryEngines: [],
    lens: 'other',
    toy: null,
    play5: 'A route opens that was closed on play 1.',
  })
  const decision = (id: string, status: string) => ({
    id,
    status,
    cutReason: status === 'cut' ? 'Cut in the stub.' : null,
    protoKey: status === 'built' ? `proto-${id}` : null,
    batch: status === 'built' ? 1 : null,
    reserveOrder: status === 'reserve' ? 1 : null,
    replaces: null,
  })
  return {
    shardA: [draft('mastery-01', 'mastery', 'jump'), draft('mastery-02', 'mastery', 'hop')],
    shardB: [draft('mystery-01', 'mystery', 'poke')],
    critiques: [
      { id: 'mastery-01', verdict: 'keep', reason: 'Fine.' },
      { id: 'mastery-02', verdict: 'cut', reason: 'Same verb family.' },
      { id: 'mystery-01', verdict: 'keep', reason: 'Fine.' },
    ],
    decisions: [decision('mastery-01', 'built'), decision('mastery-02', 'cut'), decision('mystery-01', 'reserve')],
  }
})

vi.mock('./shards/index.ts', () => ({ shards: [stub.shardA, stub.shardB] }))
vi.mock('./critiques/index.ts', () => ({ critiques: stub.critiques }))
vi.mock('./decisions.ts', () => ({ decisions: stub.decisions }))

function draft(id: string, patch: Partial<IdeaDraft> = {}): IdeaDraft {
  return {
    id,
    name: `Name of ${id}`,
    loop: 'The child pokes and it answers.',
    verb: 'poke',
    ageBand: [5, 6],
    engine: 'mystery',
    secondaryEngines: [],
    lens: 'other',
    toy: null,
    play5: 'A route opens.',
    ...patch,
  }
}

function critique(id: string, patch: Partial<Critique> = {}): Critique {
  return { id, verdict: 'keep', reason: 'Fine.', ...patch }
}

function decision(id: string, patch: Partial<Decision> = {}): Decision {
  return { id, status: 'reserve', cutReason: null, protoKey: null, batch: null, reserveOrder: 1, replaces: null, ...patch }
}

describe('joinCatalog', () => {
  it('joins each draft with the critique and decision of the same id, in draft order', () => {
    const drafts = [draft('mystery-02'), draft('mystery-01')]
    const critiques = [critique('mystery-01', { verdict: 'cut', reason: 'Escalation only.' }), critique('mystery-02')]
    const decisions = [decision('mystery-01', { status: 'cut', cutReason: 'Escalation only.', reserveOrder: null }), decision('mystery-02')]
    const { records, problems } = joinCatalog(drafts, critiques, decisions)
    expect(problems).toEqual([])
    expect(records.map((r) => r.id)).toEqual(['mystery-02', 'mystery-01'])
    expect(records[0]!.critique).toEqual(critiques[1])
    expect(records[0]!.decision).toEqual(decisions[1])
    expect(records[1]!.critique).toEqual(critiques[0])
    expect(records[1]!.decision).toEqual(decisions[0])
    // The draft fields ride along unchanged.
    expect(records[0]!.name).toBe('Name of mystery-02')
    expect(records[0]!.ageBand).toEqual([5, 6])
  })

  it('does not change its inputs', () => {
    const drafts = [draft('mystery-01')]
    const critiques = [critique('mystery-01')]
    const decisions = [decision('mystery-01')]
    const before = JSON.stringify([drafts, critiques, decisions])
    joinCatalog(drafts, critiques, decisions)
    expect(JSON.stringify([drafts, critiques, decisions])).toBe(before)
    expect(drafts[0]).not.toHaveProperty('critique')
  })

  it('joins nothing to nothing', () => {
    expect(joinCatalog([], [], [])).toEqual({ records: [], problems: [] })
  })

  it('reports a draft with no critique, and keeps its record with a null critique', () => {
    const { records, problems } = joinCatalog([draft('mystery-01'), draft('mystery-02')], [critique('mystery-02')], [decision('mystery-01'), decision('mystery-02')])
    expect(problems).toEqual([{ rule: 'join-missing-critique', id: 'mystery-01', message: expect.stringContaining('critique') }])
    expect(records).toHaveLength(2)
    expect(records[0]!.critique).toBeNull()
    expect(records[0]!.decision).not.toBeNull()
  })

  it('reports a draft with no decision, and keeps its record with a null decision', () => {
    const { records, problems } = joinCatalog([draft('mystery-01'), draft('mystery-02')], [critique('mystery-01'), critique('mystery-02')], [decision('mystery-02')])
    expect(problems).toEqual([{ rule: 'join-missing-decision', id: 'mystery-01', message: expect.stringContaining('decision') }])
    expect(records[0]!.decision).toBeNull()
    expect(records[0]!.critique).not.toBeNull()
  })

  it('reports a draft missing both, once for each', () => {
    const { problems } = joinCatalog([draft('mystery-01')], [], [])
    expect(problems.map((p) => [p.rule, p.id])).toEqual([
      ['join-missing-critique', 'mystery-01'],
      ['join-missing-decision', 'mystery-01'],
    ])
  })

  it('reports a critique whose id matches no draft', () => {
    const { records, problems } = joinCatalog([draft('mystery-01')], [critique('mystery-01'), critique('mystery-09')], [decision('mystery-01')])
    expect(problems).toEqual([{ rule: 'join-orphan-critique', id: 'mystery-09', message: expect.stringContaining('no draft') }])
    expect(records).toHaveLength(1)
  })

  it('reports a decision whose id matches no draft', () => {
    const { records, problems } = joinCatalog([draft('mystery-01')], [critique('mystery-01')], [decision('mystery-01'), decision('mystery-09')])
    expect(problems).toEqual([{ rule: 'join-orphan-decision', id: 'mystery-09', message: expect.stringContaining('no draft') }])
    expect(records).toHaveLength(1)
  })

  it('reports an orphan once however often it repeats, and the repeat as a duplicate', () => {
    const { problems } = joinCatalog([draft('mystery-01')], [critique('mystery-01'), critique('mystery-09'), critique('mystery-09')], [decision('mystery-01')])
    expect(problems.map((p) => [p.rule, p.id])).toEqual([
      ['join-duplicate-id', 'mystery-09'],
      ['join-orphan-critique', 'mystery-09'],
    ])
  })

  it('reports duplicate ids in the drafts, naming the list and the count', () => {
    const { problems } = joinCatalog([draft('mystery-01'), draft('mystery-01'), draft('mystery-01')], [critique('mystery-01')], [decision('mystery-01')])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatchObject({ rule: 'join-duplicate-id', id: 'mystery-01' })
    expect(problems[0]!.message).toContain('drafts')
    expect(problems[0]!.message).toContain('3')
  })

  it('reports duplicate ids in the critiques', () => {
    const { problems } = joinCatalog([draft('mystery-01')], [critique('mystery-01'), critique('mystery-01')], [decision('mystery-01')])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatchObject({ rule: 'join-duplicate-id', id: 'mystery-01' })
    expect(problems[0]!.message).toContain('critiques')
  })

  it('reports duplicate ids in the decisions', () => {
    const { problems } = joinCatalog([draft('mystery-01')], [critique('mystery-01')], [decision('mystery-01'), decision('mystery-01')])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatchObject({ rule: 'join-duplicate-id', id: 'mystery-01' })
    expect(problems[0]!.message).toContain('decisions')
  })

  it('uses the first critique and decision for a duplicated id', () => {
    const first = critique('mystery-01', { reason: 'First.' })
    const firstDecision = decision('mystery-01', { reserveOrder: 1 })
    const { records } = joinCatalog([draft('mystery-01')], [first, critique('mystery-01', { reason: 'Second.' })], [firstDecision, decision('mystery-01', { reserveOrder: 2 })])
    expect(records[0]!.critique).toBe(first)
    expect(records[0]!.decision).toBe(firstDecision)
  })

  it('lists every kind of problem in a fixed order, the same on every run, one missing-record problem per id', () => {
    const args = [
      [draft('mystery-01'), draft('mystery-02'), draft('mystery-02')],
      [critique('mystery-02'), critique('mystery-07')],
      [decision('mystery-01'), decision('mystery-08'), decision('mystery-08')],
    ] as const
    const rules = joinCatalog(...args).problems.map((p) => `${p.rule}:${p.id}`)
    expect(rules).toEqual([
      'join-duplicate-id:mystery-02',
      'join-duplicate-id:mystery-08',
      'join-missing-critique:mystery-01',
      'join-missing-decision:mystery-02',
      'join-orphan-critique:mystery-07',
      'join-orphan-decision:mystery-08',
    ])
    expect(joinCatalog(...args).problems.map((p) => `${p.rule}:${p.id}`)).toEqual(rules)
  })
})

describe('loadCatalog', () => {
  it('joins the shards (flattened in order), the critiques, and the decisions from the index modules', () => {
    const { records, problems } = loadCatalog({})
    expect(records.map((r) => r.id)).toEqual(['mastery-01', 'mastery-02', 'mystery-01'])
    expect(records.map((r) => r.decision?.status)).toEqual(['built', 'cut', 'reserve'])
    expect(records.map((r) => r.critique?.verdict)).toEqual(['keep', 'cut', 'keep'])
    expect(problems.filter((p) => p.rule.startsWith('join-'))).toEqual([])
  })

  it('validates the joined records', () => {
    // Three ideas cannot meet the catalog floors, so validate has plenty to say.
    const rules = loadCatalog({}).problems.map((p) => p.rule)
    expect(rules).toContain('reserve-floor')
    expect(rules).toContain('age-bucket-floor')
  })

  it('expects 30 built ideas unless told otherwise', () => {
    expect(loadCatalog().problems.map((p) => p.rule)).toContain('built-count')
    expect(loadCatalog({ expectedBuilt: 1 }).problems.map((p) => p.rule)).not.toContain('built-count')
    expect(loadCatalog({}).problems.map((p) => p.rule)).not.toContain('built-count')
  })
})
