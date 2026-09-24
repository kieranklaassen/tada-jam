import { describe, expect, it } from 'vitest'
import type { Affordance, CreateSim, ProtoMeta, Sim, SimConfig } from '../kit/sim.ts'
import * as constant from './fixtures/constant.ts'
import * as emergent from './fixtures/emergent.ts'
import * as ladder from './fixtures/ladder.ts'
import { judgeDominant, objectiveOf, playEpisode, replayLog, runSelfPlay } from './selfplay.ts'
import type { EpisodeResult } from './selfplay.ts'
import { masterRunSeed, sessionSeed } from './session.ts'
import { GREEDY_CANDIDATES, GREEDY_REPLAY_BUDGET, SELFPLAY_DECISION_TICKS, SELFPLAY_EPISODE_TICKS } from './thresholds.ts'
import type { PanelProto } from './types.ts'

function meta(overrides: Partial<ProtoMeta> = {}): ProtoMeta {
  return {
    key: 'planted',
    name: 'Planted',
    verb: 'poke',
    engine: 'mastery',
    lens: 'other',
    ageBand: [5, 8],
    hooks: [],
    features: [{ name: 'power', objective: 'up' }],
    signatureBound: 16,
    hookAblation: { supported: false, reason: 'test' },
    ...overrides,
  }
}

const BIG: Affordance = { x: 100, y: 100, w: 300, h: 300, kind: 'tap', salience: 1 }
const DECOYS: Affordance[] = [
  { x: 500, y: 100, w: 150, h: 150, kind: 'tap', salience: 0.3 },
  { x: 700, y: 100, w: 150, h: 150, kind: 'tap', salience: 0.3 },
  { x: 500, y: 400, w: 150, h: 150, kind: 'tap', salience: 0.3 },
  { x: 700, y: 400, w: 150, h: 150, kind: 'tap', salience: 0.3 },
]

// One big salient button that piles up power fast and shows nothing new, and
// decoys that pile up little and change what the sim shows.
const planted: PanelProto = {
  meta: meta(),
  createSim: () => {
    let power = 0
    let shown = 0
    return {
      step() {},
      pointer(input) {
        if (input.phase !== 'down') return
        const hit = (a: Affordance) => input.x >= a.x && input.x <= a.x + a.w && input.y >= a.y && input.y <= a.y + a.h
        if (hit(BIG)) power += 3
        else if (DECOYS.some(hit)) {
          power += 0.2
          shown = (shown + 1) % 6
        }
      },
      affordances: () => [BIG, ...DECOYS],
      observe: () => ({ signature: `x${shown}`, features: { power }, events: [] }),
      snapshot: () => ({}),
    }
  },
}

// Every button does the same small thing: no strategy stands out.
const even: PanelProto = {
  meta: meta(),
  createSim: () => {
    let power = 0
    let shown = 0
    return {
      step() {},
      pointer(input) {
        if (input.phase !== 'down') return
        const hit = (a: Affordance) => input.x >= a.x && input.x <= a.x + a.w && input.y >= a.y && input.y <= a.y + a.h
        if ([BIG, ...DECOYS].some(hit)) {
          power += 1
          shown = (shown + 1) % 6
        }
      },
      affordances: () => [BIG, ...DECOYS.map((d) => ({ ...d, salience: 0.95 }))],
      observe: () => ({ signature: `x${shown}`, features: { power }, events: [] }),
      snapshot: () => ({}),
    }
  },
}

const SEED = masterRunSeed(1, 0)

describe('the self-play policies', () => {
  it('finds the first feature with an objective', () => {
    expect(objectiveOf([{ name: 'a' }, { name: 'b', objective: 'down' }, { name: 'c', objective: 'up' }])).toEqual({ name: 'b', dir: 'down' })
    expect(objectiveOf([{ name: 'a' }])).toBeNull()
    expect(objectiveOf(constant.meta.features)).toEqual({ name: 'level', dir: 'up' })
  })

  it('runs an episode of at most 600 ticks', () => {
    expect(SELFPLAY_EPISODE_TICKS).toBe(600)
    for (const policy of ['random', 'repeat-one', 'greedy'] as const) {
      const episode = playEpisode(planted, policy, SEED)
      expect(episode.ticks).toBe(SELFPLAY_EPISODE_TICKS)
      expect(episode.crash).toBeNull()
    }
  })

  it('has zero variety for random play on a constant sim', () => {
    const result = runSelfPlay(protoOf(constant), 1)
    expect(result.policies['random']!.variety).toBe(0)
    expect(result.overallVariety).toBe(0)
    expect(result.dominant.flagged).toBe(false)
  })

  it('has variety for random play on a sim that shows different things', () => {
    const result = runSelfPlay(planted, 1)
    expect(result.policies['random']!.variety).toBeGreaterThan(1)
    expect(result.policies['repeat-one']!.variety).toBe(0)
  })

  it('reports variety only, with no greedy policy, when the prototype declares no objective', () => {
    const noObjective: PanelProto = { meta: meta({ features: [{ name: 'power' }] }), createSim: planted.createSim }
    const result = runSelfPlay(noObjective, 1)
    expect(result.objective).toBeNull()
    expect(Object.keys(result.policies).sort()).toEqual(['random', 'repeat-one'])
    expect(result.policies['random']!.meanObjective).toBeNull()
    expect(result.dominant).toMatchObject({ flagged: false, note: 'no objective declared: variety only' })
  })
})

describe('dominant strategy', () => {
  it('flags repeat-one on a sim with a planted dominant strategy', () => {
    const result = runSelfPlay(planted, 1)
    const random = result.policies['random']!
    const repeat = result.policies['repeat-one']!
    expect(repeat.meanObjective!).toBeGreaterThan(random.meanObjective! * 2)
    expect(repeat.variety).toBeLessThan(random.variety)
    expect(result.dominant).toMatchObject({ flagged: true, by: 'repeat-one' })
  })

  it('does not flag a sim where every button is worth the same', () => {
    const result = runSelfPlay(even, 1)
    expect(result.dominant.flagged).toBe(false)
  })

  it('needs both an advantage and collapsed variety', () => {
    const episode = (objective: number): EpisodeResult => ({
      policy: 'random',
      seedIndex: 0,
      ticks: 600,
      objective,
      signatureCounts: {},
      log: [],
      finalSignature: '',
      finalFeatures: {},
      replayedTicks: 0,
      crash: null,
    })
    const episodes = [episode(0), episode(10)]
    const random = { meanObjective: 0, variety: 2, episodes: 1 }
    // A big advantage without a collapse in variety is not dominance.
    expect(judgeDominant({ random, 'repeat-one': { meanObjective: 10, variety: 2, episodes: 1 } }, episodes, true).flagged).toBe(false)
    // A collapse without an advantage is not dominance either.
    expect(judgeDominant({ random, 'repeat-one': { meanObjective: 0, variety: 0, episodes: 1 } }, episodes, true).flagged).toBe(false)
    expect(judgeDominant({ random, greedy: { meanObjective: 10, variety: 0.2, episodes: 1 } }, episodes, true)).toMatchObject({ flagged: true, by: 'greedy' })
  })
})

describe('greedy play', () => {
  it('forks by replaying the input log into a fresh sim of the same seed, never by cloning', () => {
    let created = 0
    const counting: PanelProto = {
      meta: planted.meta,
      createSim: (config: SimConfig): Sim => {
        created++
        return planted.createSim(config)
      },
    }
    const episode = playEpisode(counting, 'greedy', SEED)
    const decisions = SELFPLAY_EPISODE_TICKS / SELFPLAY_DECISION_TICKS
    // One sim for the episode, and one fresh replay per candidate per decision.
    expect(created).toBe(1 + decisions * GREEDY_CANDIDATES)
    expect(episode.replayedTicks).toBeGreaterThan(0)
  })

  it('matches a direct run of the same input log', () => {
    const episode = playEpisode(protoOf(ladder), 'greedy', SEED)
    expect(episode.log.length).toBeGreaterThan(20)
    const config: SimConfig = { seed: sessionSeed(SEED, 0), hooks: [...ladder.meta.hooks], hints: false }
    const direct = replayLog(protoOf(ladder), config, episode.log, episode.ticks)
    expect(direct.last!.signature).toBe(episode.finalSignature)
    expect(direct.last!.features).toEqual(episode.finalFeatures)
    // The same log into another fresh sim gives the same place again.
    const again = replayLog(protoOf(ladder), config, episode.log, episode.ticks)
    expect(again.last).toEqual(direct.last)
  })

  it('reaches at least as much of the objective as random play on a loop it can read', () => {
    const greedy = playEpisode(planted, 'greedy', SEED)
    const random = playEpisode(planted, 'random', SEED)
    expect(greedy.objective!).toBeGreaterThan(random.objective!)
  })

  it('keeps replayed ticks within a fixed budget, counted', () => {
    for (const proto of [planted, protoOf(ladder), protoOf(emergent)]) {
      const episode = playEpisode(proto, 'greedy', SEED)
      expect(episode.replayedTicks).toBeGreaterThan(0)
      expect(episode.replayedTicks).toBeLessThanOrEqual(GREEDY_REPLAY_BUDGET)
    }
    // Other policies replay nothing.
    expect(playEpisode(planted, 'random', SEED).replayedTicks).toBe(0)
    expect(playEpisode(planted, 'repeat-one', SEED).replayedTicks).toBe(0)
    expect(GREEDY_REPLAY_BUDGET).toBe(40 * 4 * 615)
  })

  it('decides every 15 ticks over at most its four most salient affordances', () => {
    expect(SELFPLAY_DECISION_TICKS).toBe(15)
    expect(GREEDY_CANDIDATES).toBe(4)
  })
})

describe('crashes in self-play', () => {
  it('are recorded and the other policies still run', () => {
    const throwing: CreateSim = (config) => {
      const sim = planted.createSim(config)
      let ticks = 0
      return {
        ...sim,
        step() {
          if (++ticks > 40) throw new Error('self-play boom')
        },
      }
    }
    const result = runSelfPlay({ meta: planted.meta, createSim: throwing }, 1)
    expect(result.crashes.length).toBeGreaterThan(0)
    expect(result.crashes[0]!.message).toBe('self-play boom')
    expect(result.crashes[0]!.where).toMatch(/^self-play/)
  })
})

function protoOf(module: { meta: ProtoMeta; createSim: CreateSim }): PanelProto {
  return { meta: module.meta, createSim: module.createSim }
}
