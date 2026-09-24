import { describe, expect, it } from 'vitest'
import {
  VERDICT_INCONCLUSIVE,
  VERDICT_NEEDED,
  VERDICT_NOT_NEEDED,
  clarityMeasure,
  gate,
  hookVerdict,
  notApplicable,
  play5Change,
  rankScore,
  returnShares,
  shannonEntropy,
  startedShare,
  targetPanel,
} from './metrics.ts'
import { PERSONAS } from './personas.ts'
import { HOOK_NEEDED_DROP } from './thresholds.ts'
import type { ClarityResult, RunResult, SessionSummary } from './types.ts'

function session(index: number, signatures: string[], kinds: SessionSummary['kinds'], actions: number): SessionSummary {
  return {
    index,
    ticks: 100,
    endedBy: 'attention',
    actions,
    kinds,
    signatures,
    newSignatures: 0,
    aims: [],
    pull: 0,
    left: 0,
    interestLeft: 0,
    aimedTouches: 0,
    aimedHits: 0,
    freeTouches: 0,
    fingerprint: 0,
  }
}

function run(personaId: string, reached: number, sessions: SessionSummary[] = []): RunResult {
  return { personaId, seedIndex: 0, runSeed: 1, sessions, reached, decisions: [], crash: null }
}

describe('the target panel', () => {
  const ids = (band: [number, number]) => targetPanel({ ageBand: band }).map((p) => p.id)

  it('takes the personas within one year of the age band', () => {
    // 5 to 6 reaches ages 4 to 7.
    expect(ids([5, 6])).toEqual(['kaia', 'tess', 'arch-6', 'arch-7'])
    // 8 to 9 reaches ages 7 to 10.
    expect(ids([8, 9])).toEqual(['arch-7', 'arch-8', 'arch-9'])
  })

  it('widens to the nearest two personas by age distance when fewer fall in', () => {
    // 11 to 12 reaches 10 to 13: only Archetype 11 is inside, so the next nearest joins.
    expect(ids([11, 12])).toEqual(['arch-9', 'arch-11'])
    // 2 to 2 reaches 1 to 3: only Archetype 3, then Kaia (4) is the nearest.
    expect(ids([2, 2])).toEqual(['kaia', 'arch-3'])
  })

  it('never returns fewer than two personas', () => {
    for (let lo = 2; lo <= 12; lo++) {
      for (let hi = lo; hi <= Math.min(12, lo + 4); hi++) expect(ids([lo, hi]).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('keeps roster order', () => {
    const order = PERSONAS.map((p) => p.id)
    const panel = ids([4, 8])
    expect(panel).toEqual(order.filter((id) => panel.includes(id)))
  })
})

describe('return and the gate', () => {
  it('counts a run that quit earlier as not starting a later session', () => {
    const runs = [run('a', 5), run('b', 3), run('c', 2), run('d', 1)]
    expect(startedShare(runs, 3)).toBe(0.5)
    expect(returnShares(runs)).toEqual({ s3: 0.5, s4: 0.25, s5: 0.25 })
  })

  it('passes when at least half the runs start session 3', () => {
    expect(gate([run('a', 3), run('b', 1)]).pass).toBe(true)
    expect(gate([run('a', 3), run('b', 1), run('c', 1)]).pass).toBe(false)
    expect(gate([run('a', 5), run('b', 5), run('c', 1)])).toMatchObject({ pass: true, started: 2, runs: 3 })
  })

  it('fails with no runs', () => {
    expect(gate([]).pass).toBe(false)
  })
})

describe('play 5 against play 1', () => {
  it('counts signatures in the last session that the first did not reach, per 100 actions, plus kind growth', () => {
    const first = session(0, ['a', 'b'], ['tap'], 50)
    const last = session(4, ['a', 'c', 'd', 'e'], ['tap', 'drag'], 200)
    const change = play5Change(run('a', 5, [first, session(2, ['a'], ['tap'], 10), last]))
    expect(change.newSignatures).toBe(3)
    expect(change.newSignaturesPer100Actions).toBeCloseTo(1.5)
    expect(change.kindGrowth).toBe(1)
    expect(change.change).toBeCloseTo(2.5)
  })

  it('floors kind growth at zero', () => {
    const change = play5Change(run('a', 2, [session(0, ['a'], ['tap', 'drag', 'hold'], 10), session(1, ['a'], ['tap'], 10)]))
    expect(change.kindGrowth).toBe(0)
  })

  it('compares a persona that quit early using its last session, and shows nothing for one session', () => {
    const early = run('a', 2, [session(0, ['a'], ['tap'], 10), session(1, ['a', 'b'], ['tap'], 20)])
    expect(play5Change(early).newSignatures).toBe(1)
    expect(play5Change(run('b', 1, [session(0, ['a'], ['tap'], 10)])).change).toBe(0)
    expect(play5Change(run('c', 1)).change).toBe(0)
  })
})

describe('ranking', () => {
  const signals = (returnScore: number, changeScore: number, aimScore: number) => ({ returnScore, changeScore, aimScore })

  it('ranks by the mean of the three sub-signal ranks, best first', () => {
    const ranked = rankScore([
      { key: 'low', signals: signals(0, 0, 0) },
      { key: 'high', signals: signals(0.9, 5, 2) },
      { key: 'mid', signals: signals(0.5, 1, 1) },
    ])
    expect(ranked.map((r) => r.key)).toEqual(['high', 'mid', 'low'])
    expect(ranked.map((r) => r.meanRank)).toEqual([3, 2, 1])
  })

  it('gives ties the mean of their places', () => {
    const ranked = rankScore([
      { key: 'a', signals: signals(0, 0, 0) },
      { key: 'b', signals: signals(0, 0, 0) },
      { key: 'c', signals: signals(1, 1, 1) },
    ])
    const byKey = Object.fromEntries(ranked.map((r) => [r.key, r]))
    expect(byKey['a']!.ranks).toEqual({ returnRank: 1.5, changeRank: 1.5, aimRank: 1.5 })
    expect(byKey['c']!.meanRank).toBe(3)
  })

  it('places a dominant-strategy entry below an unflagged one of equal rank', () => {
    const ranked = rankScore([
      { key: 'a', signals: signals(1, 1, 1), dominant: true },
      { key: 'b', signals: signals(1, 1, 1) },
    ])
    expect(ranked.map((r) => r.key)).toEqual(['b', 'a'])
  })
})

describe('hook verdicts', () => {
  it('needs the hook when removing it lowers return by more than the threshold', () => {
    expect(hookVerdict(HOOK_NEEDED_DROP + 0.01, true)).toBe(VERDICT_NEEDED)
    expect(hookVerdict(HOOK_NEEDED_DROP + 0.01, false)).toBe(VERDICT_NEEDED)
  })

  it('calls a hook not needed only when removal changed the sim and return did not drop', () => {
    expect(hookVerdict(0, true)).toBe(VERDICT_NOT_NEEDED)
    expect(hookVerdict(-0.3, true)).toBe(VERDICT_NOT_NEEDED)
    expect(hookVerdict(HOOK_NEEDED_DROP, true)).toBe(VERDICT_NOT_NEEDED)
  })

  it('is inconclusive when removal leaves affordances and signatures unchanged', () => {
    expect(hookVerdict(0, false)).toBe(VERDICT_INCONCLUSIVE)
    expect(VERDICT_INCONCLUSIVE).toBe('inconclusive (the persona model has no reward response)')
  })

  it('records a reason for a hook that cannot be removed', () => {
    expect(notApplicable('the hook is the loop')).toBe('n/a: the hook is the loop')
  })
})

describe('outcome variety', () => {
  it('is the entropy of the counts in bits', () => {
    expect(shannonEntropy([5])).toBe(0)
    expect(shannonEntropy([])).toBe(0)
    expect(shannonEntropy([1, 1])).toBeCloseTo(1)
    expect(shannonEntropy([1, 1, 1, 1])).toBeCloseTo(2)
    expect(shannonEntropy([9, 1])).toBeLessThan(shannonEntropy([5, 5]))
  })
})

describe('clarity', () => {
  const result = (mode: ClarityResult['mode'], touches: number, changed: number, first: number | null, hits = 0, aimedTouches = 0): ClarityResult => ({
    personaId: 'kaia',
    seedIndex: 0,
    mode,
    touches,
    changed,
    firstChangeTick: first,
    kinds: ['tap'],
    aimedTouches,
    aimedHits: hits,
    crash: null,
  })

  it('reads the flag from the cue-blind runs and the hit share from the aimed runs', () => {
    const measure = clarityMeasure([result('blind', 20, 12, 30), result('aimed', 20, 20, 5, 19, 20)])
    expect(measure.changedShare).toBe(0.6)
    expect(measure.flag).toBe('ok')
    expect(measure.aimedHitShare).toBe(0.95)
    expect(measure.ticksToFirstChange).toBe(30)
  })

  it('reads low when few cue-blind touches change anything, or none does, or the first change is late', () => {
    expect(clarityMeasure([result('blind', 20, 2, 30)]).flag).toBe('low')
    expect(clarityMeasure([result('blind', 20, 0, null)]).flag).toBe('low')
    expect(clarityMeasure([result('blind', 20, 15, 300)]).flag).toBe('low')
  })

  it('leaves the hit share empty when nothing was aimed', () => {
    expect(clarityMeasure([result('blind', 5, 5, 1)]).aimedHitShare).toBeNull()
  })
})
