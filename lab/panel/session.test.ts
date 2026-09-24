import { describe, expect, it } from 'vitest'
import { createRng, deriveSeed } from '../kit/rng.ts'
import type { Affordance, CreateSim, PointerInput, ProtoMeta, Sim, SimConfig, SimEvent } from '../kit/sim.ts'
import * as constant from './fixtures/constant.ts'
import * as ladder from './fixtures/ladder.ts'
import { clarityMeasure } from './metrics.ts'
import { PERSONAS } from './personas.ts'
import {
  createMemory,
  createRunPlayer,
  createSessionRunner,
  decideReturn,
  learningProgress,
  masterRunSeed,
  outcomeOf,
  playClarity,
  playRun,
  predictNext,
} from './session.ts'
import {
  AIM_MIN_TOUCHES,
  BOREDOM_WINDOW,
  CLARITY_MAX_FIRST_TICK,
  FIRST_TEN_TICKS,
  LP_WINDOW,
  SESSIONS,
  SESSION_CAP_TICKS,
  returnProbability,
} from './thresholds.ts'
import type { PanelProto, Persona } from './types.ts'

const kaia = PERSONAS[0]!

function protoOf(module: { meta: ProtoMeta; createSim: CreateSim }, createSim: CreateSim = module.createSim): PanelProto {
  return { meta: module.meta, createSim }
}

function meta(overrides: Partial<ProtoMeta> = {}): ProtoMeta {
  return {
    key: 'test-sim',
    name: 'Test sim',
    verb: 'poke',
    engine: 'mystery',
    lens: 'other',
    ageBand: [5, 8],
    hooks: [],
    features: [],
    signatureBound: 64,
    hookAblation: { supported: false, reason: 'test' },
    ...overrides,
  }
}

function inside(a: Affordance, x: number, y: number): boolean {
  return x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h
}

const BUTTON: Affordance = { x: 400, y: 250, w: 400, h: 300, kind: 'tap', salience: 1 }

// A sim that reports one new signature every 100 ticks and never anything else.
const drip: PanelProto = {
  meta: meta({ signatureBound: 64, features: [{ name: 'x' }] }),
  createSim: () => {
    let ticks = 0
    return {
      step() {
        ticks++
      },
      pointer() {},
      affordances: () => [BUTTON],
      observe: () => ({ signature: `d${Math.min(40, Math.floor(ticks / 100))}`, features: { x: 0 }, events: [] }),
      snapshot: () => ({}),
    }
  },
}

// A sim whose one feature moves by `step` per tap inside the button.
function pusher(step: number): PanelProto {
  return {
    meta: meta({ features: [{ name: 'height' }] }),
    createSim: () => {
      let height = 0
      let events: SimEvent[] = []
      return {
        step() {},
        pointer(input: PointerInput) {
          if (input.phase === 'down' && inside(BUTTON, input.x, input.y)) {
            height += step
            events.push({ kind: 'state', name: 'push' })
          }
        },
        affordances: () => [BUTTON],
        observe() {
          const out = events
          events = []
          return { signature: 'flat', features: { height }, events: out }
        },
        snapshot: () => ({ height }),
      }
    },
  }
}

const bold: Persona = { ...kaia, aimInvention: 1, returnPropensity: 1 }

describe('a session', () => {
  it('sends every touch through the sim pointer and nowhere else', () => {
    let pointerCalls = 0
    const proto = protoOf(ladder, (config: SimConfig): Sim => {
      const sim = ladder.createSim(config)
      const original = sim.pointer.bind(sim)
      return {
        ...sim,
        pointer(input) {
          pointerCalls++
          original(input)
        },
      }
    })
    const runner = createSessionRunner({
      persona: kaia,
      proto,
      runSeed: 3,
      sessionIndex: 0,
      memory: createMemory(),
      rng: createRng(1),
      hooks: ladder.meta.hooks,
      hints: false,
      maxTicks: 800,
    })
    while (!runner.done) runner.tick()
    expect(runner.log.length).toBeGreaterThan(20)
    expect(pointerCalls).toBe(runner.log.length)
  })

  it('ends at spent attention', () => {
    const patient: Persona = { ...kaia, attention: 1500, aimInvention: 0 }
    const result = playRun({ persona: patient, proto: protoOf(constant), runSeed: 4, playSessions: 1 })
    const first = result.sessions[0]!
    expect(first.endedBy).toBe('attention')
    expect(first.ticks).toBe(1500)
  })

  it('ends at the cap when interest never runs out', () => {
    const tireless: Persona = { ...kaia, attention: 1_000_000, aimInvention: 0 }
    const result = playRun({ persona: tireless, proto: protoOf(constant), runSeed: 4, playSessions: 1 })
    expect(result.sessions[0]!.endedBy).toBe('cap')
    expect(result.sessions[0]!.ticks).toBe(SESSION_CAP_TICKS)
  })

  it('gives a constant sim nothing to refill interest, so the session ends bored', () => {
    const result = playRun({ persona: { ...kaia, aimInvention: 0 }, proto: protoOf(constant), runSeed: 9, playSessions: 1 })
    expect(result.sessions[0]!.left).toBe(0)
    expect(result.sessions[0]!.signatures).toEqual(['still'])
  })
})

describe('a run', () => {
  it('plays at most five sessions', () => {
    const player = createRunPlayer({ persona: bold, proto: protoOf(ladder), runSeed: 8, maxTicks: 300 })
    while (!player.done) player.tick()
    const result = player.result()
    expect(SESSIONS).toBe(5)
    expect(result.sessions.length).toBe(5)
    expect(result.reached).toBe(5)
    expect(result.decisions.length).toBe(4)
  })

  it('builds a fresh sim each session from the seed derived from run seed and session index, and carries only memory', () => {
    const configs: SimConfig[] = []
    const sims: Sim[] = []
    const proto = protoOf(ladder, (config) => {
      configs.push(config)
      const sim = ladder.createSim(config)
      sims.push(sim)
      return sim
    })
    const result = playRun({ persona: bold, proto, runSeed: 77, maxTicks: 600 })
    expect(result.sessions.length).toBe(5)
    expect(configs.map((c) => c.seed)).toEqual([0, 1, 2, 3, 4].map((i) => deriveSeed(77, i)))
    expect(new Set(sims).size).toBe(5)
    expect(configs.every((c) => c.hints === false)).toBe(true)
    // The ladder restarts every session (nothing carries over but the persona),
    // and what the persona has already seen no longer counts as new.
    const [first, second] = result.sessions
    expect(first!.newSignatures).toBeGreaterThan(4)
    expect(second!.newSignatures).toBeLessThan(first!.newSignatures)
    expect(second!.signatures).toContain('lv0')
  })

  it('draws the same run from the same seed and a different run from another', () => {
    const a = playRun({ persona: kaia, proto: protoOf(ladder), runSeed: 5 })
    const b = playRun({ persona: kaia, proto: protoOf(ladder), runSeed: 5 })
    const c = playRun({ persona: kaia, proto: protoOf(ladder), runSeed: 6 })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c))
  })

  it('passes the enabled hooks to the sim, all of them by default', () => {
    const seen: string[][] = []
    const proto = protoOf(ladder, (config) => {
      seen.push([...config.hooks])
      return ladder.createSim(config)
    })
    playRun({ persona: kaia, proto, runSeed: 1, playSessions: 1, maxTicks: 50 })
    playRun({ persona: kaia, proto, runSeed: 1, playSessions: 1, maxTicks: 50, hooks: ['sparkle'] })
    playRun({ persona: kaia, proto, runSeed: 1, playSessions: 1, maxTicks: 50, hooks: [] })
    expect(seen).toEqual([['unlock', 'sparkle'], ['sparkle'], []])
  })

  it('records a sim that throws mid-session as a crash and stops that run', () => {
    let ticks = 0
    const proto = protoOf(constant, (config) => {
      const sim = constant.createSim(config)
      return {
        ...sim,
        step() {
          if (++ticks === 120) throw new Error('boom at 120')
        },
      }
    })
    const result = playRun({ persona: kaia, proto, runSeed: 2 })
    expect(result.crash).toMatchObject({ message: 'boom at 120', persona: 'kaia', seedIndex: 0 })
    expect(result.sessions[0]!.endedBy).toBe('crash')
    expect(result.sessions.length).toBe(1)
  })

  it('records a sim that throws on creation as a crash', () => {
    const proto = protoOf(constant, () => {
      throw new Error('no sim')
    })
    const result = playRun({ persona: kaia, proto, runSeed: 2 })
    expect(result.crash?.message).toBe('no sim')
    expect(result.sessions.length).toBe(1)
  })

  it('yields zero affordance touches but counts free touches when the sim offers nothing', () => {
    const proto = protoOf(constant, (config) => {
      const sim = constant.createSim(config)
      return { ...sim, affordances: () => [] }
    })
    const result = playRun({ persona: kaia, proto, runSeed: 2, playSessions: 1 })
    const first = result.sessions[0]!
    expect(first.aimedTouches).toBe(0)
    expect(first.freeTouches).toBeGreaterThan(20)
    expect(first.actions).toBe(first.freeTouches)
  })
})

describe('returning', () => {
  it('returns less often after a bored ending than after a mid-discovery one, over 1000 seeded draws', () => {
    const count = (left: number, seed: number): number => {
      const rng = createRng(seed)
      let returned = 0
      for (let i = 0; i < 1000; i++) if (decideReturn(0.9, left, rng).returned) returned++
      return returned
    }
    const bored = count(0, 1)
    const midDiscovery = count(1, 2)
    expect(bored).toBeLessThan(100)
    expect(midDiscovery).toBeGreaterThan(800)
    expect(bored).toBeLessThan(midDiscovery / 5)
  })

  it('scales the persona propensity by how much was left', () => {
    expect(returnProbability(0.9, 1)).toBeCloseTo(0.9)
    expect(returnProbability(0.9, 0)).toBeLessThan(0.05)
    expect(returnProbability(0.9, 0.35)).toBeGreaterThan(returnProbability(0.9, 0.1))
    expect(returnProbability(0.5, 1)).toBeLessThan(returnProbability(0.9, 1))
    expect(returnProbability(1, 5)).toBeLessThanOrEqual(1)
  })

  it('draws the decision from the persona stream, not from the sim', () => {
    const a = playRun({ persona: kaia, proto: protoOf(ladder), runSeed: 11 })
    const b = playRun({ persona: kaia, proto: protoOf(ladder), runSeed: 11 })
    expect(a.decisions).toEqual(b.decisions)
    expect(a.decisions.length).toBeGreaterThan(0)
  })
})

describe('self-set aims', () => {
  it('are adopted only after boredom crosses the threshold', () => {
    // A signature every 100 ticks keeps a persona busy, so it never sets an aim.
    const busy = playRun({ persona: bold, proto: drip, runSeed: 3, playSessions: 1, maxTicks: 2500 })
    expect(busy.sessions[0]!.aims).toEqual([])
    // A sim that never changes bores the same persona, and the aim follows.
    const bored = playRun({ persona: bold, proto: protoOf(constant), runSeed: 3, playSessions: 1 })
    const aims = bored.sessions[0]!.aims
    expect(aims.length).toBeGreaterThan(0)
    // Ticks are counted from 0, so tick 479 is the 480th.
    for (const aim of aims) expect(aim.adoptedTick + 1).toBeGreaterThanOrEqual(BOREDOM_WINDOW)
  })

  it('are never adopted by a persona with no aim invention', () => {
    const result = playRun({ persona: { ...kaia, aimInvention: 0 }, proto: protoOf(constant), runSeed: 3, playSessions: 1 })
    expect(result.sessions[0]!.aims).toEqual([])
  })

  it('count as progress only when the feature moves the intended way', () => {
    const up = pusher(1)
    const down = pusher(-1)
    const collected = { up: { up: 0, down: 0 }, down: { up: 0, down: 0 } }
    const progress = { up: { up: 0, down: 0 }, down: { up: 0, down: 0 } }
    for (let seed = 1; seed <= 24; seed++) {
      for (const [name, proto] of [['up', up], ['down', down]] as const) {
        const result = playRun({ persona: bold, proto, runSeed: seed, playSessions: 1 })
        for (const aim of result.sessions[0]!.aims) {
          // An aim the session ended on before its first window closed was never judged.
          if (aim.windows === 0) continue
          collected[name][aim.dir] += 1
          if (aim.madeProgress) progress[name][aim.dir] += 1
        }
      }
    }
    // Both directions were chosen on both sims, so the check means something.
    for (const name of ['up', 'down'] as const) {
      for (const dir of ['up', 'down'] as const) expect(collected[name][dir]).toBeGreaterThan(1)
    }
    // A sim whose taps raise the feature rewards only aims that push it up, and the reverse.
    expect(progress.up.up).toBe(collected.up.up)
    expect(progress.up.down).toBe(0)
    expect(progress.down.down).toBe(collected.down.down)
    expect(progress.down.up).toBe(0)
  })

  it('give adoption but no progress when the sim has no controllable feature', () => {
    let adopted = 0
    let progressed = 0
    for (let seed = 1; seed <= 6; seed++) {
      const result = playRun({ persona: bold, proto: protoOf(constant), runSeed: seed, playSessions: 1 })
      for (const aim of result.sessions[0]!.aims) {
        adopted++
        if (aim.madeProgress) progressed++
      }
    }
    expect(adopted).toBeGreaterThan(3)
    expect(progressed).toBe(0)
  })

  it('need enough touches in the window to count', () => {
    expect(AIM_MIN_TOUCHES).toBeGreaterThan(1)
  })
})

describe('prediction and learning progress', () => {
  it('expects nothing to change until it has seen otherwise, then the outcome it has seen most', () => {
    const memory = createMemory()
    const nothing = outcomeOf(['a'], false, { a: 0 }, { a: 0 })
    expect(predictNext(memory, 'tap|9', nothing)).toBe(nothing)
    memory.predictor.set('tap|9', new Map([['S+', 3], ['-0', 1]]))
    expect(predictNext(memory, 'tap|9', nothing)).toBe('S+')
  })

  it('describes an outcome as whether the signature changed and which way each feature moved', () => {
    expect(outcomeOf(['a', 'b', 'c'], true, { a: 1, b: 5, c: 2 }, { a: 2, b: 4, c: 2 })).toBe('S+-0')
    expect(outcomeOf([], false, {}, {})).toBe('-')
  })

  it('sees progress in a drop in wrong predictions that chance would not produce, and none in a steady rate', () => {
    const steady = Array.from({ length: 2 * LP_WINDOW }, (_, i) => (i % 3 === 0 ? 1 : 0))
    expect(learningProgress(steady)).toBe(0)
    const learning = [...Array.from({ length: LP_WINDOW }, () => 1), ...Array.from({ length: LP_WINDOW }, (_, i) => (i < 3 ? 1 : 0))]
    expect(learningProgress(learning)).toBeGreaterThan(0.5)
    const worse = [...Array.from({ length: LP_WINDOW }, () => 0), ...Array.from({ length: LP_WINDOW }, () => 1)]
    expect(learningProgress(worse)).toBe(0)
    expect(learningProgress([1, 0, 1])).toBe(0)
  })
})

describe('the first ten seconds', () => {
  // One small button (about one percent of the field) that answers only a touch
  // on it, with an honest declaration.
  const SMALL: Affordance = { x: 100, y: 100, w: 100, h: 100, kind: 'tap', salience: 1 }
  const honest: PanelProto = {
    meta: meta({ features: [{ name: 'taps' }] }),
    createSim: () => {
      let taps = 0
      let events: SimEvent[] = []
      return {
        step() {},
        pointer(input) {
          if (input.phase === 'down' && inside(SMALL, input.x, input.y)) {
            taps++
            events.push({ kind: 'state', name: 'tap' })
          }
        },
        affordances: () => [SMALL],
        observe() {
          const out = events
          events = []
          return { signature: 'a', features: { taps }, events: out }
        },
        snapshot: () => ({ taps }),
      }
    },
  }
  const anywhere: PanelProto = {
    meta: meta({ features: [{ name: 'taps' }] }),
    createSim: () => {
      let taps = 0
      let events: SimEvent[] = []
      return {
        step() {},
        pointer(input) {
          if (input.phase === 'down') {
            taps++
            events.push({ kind: 'state', name: 'tap' })
          }
        },
        affordances: () => [SMALL],
        observe() {
          const out = events
          events = []
          return { signature: 'a', features: { taps }, events: out }
        },
        snapshot: () => ({ taps }),
      }
    },
  }

  const blindResults = (proto: PanelProto) =>
    PERSONAS.slice(0, 4).flatMap((persona) =>
      [0, 1].map((k) => playClarity({ persona, proto, runSeed: masterRunSeed(1, k), seedIndex: k, mode: 'blind' })),
    )
  const blind = (proto: PanelProto) => {
    const results = blindResults(proto)
    return {
      touches: results.reduce((a, r) => a + r.touches, 0),
      changed: results.reduce((a, r) => a + r.changed, 0),
    }
  }

  // Wraps a proto to record the configs it was built with and the tick at which
  // the sim first got a touch it answers. The sim is stepped once per tick and
  // is touched before it steps, so that count is the tick of the touch.
  const watch = (proto: PanelProto, answers: (x: number, y: number) => boolean) => {
    const configs: SimConfig[] = []
    let answeredAt: number | null = null
    const watched = protoOf(proto, (config) => {
      configs.push(config)
      const sim = proto.createSim(config)
      let steps = 0
      return {
        ...sim,
        step() {
          steps++
          sim.step()
        },
        pointer(input) {
          if (answeredAt === null && input.phase === 'down' && answers(input.x, input.y)) answeredAt = steps
          sim.pointer(input)
        },
      }
    })
    return { watched, configs, answeredAt: () => answeredAt }
  }

  it('reads low for a sim that answers no touch away from its declared affordance, even when the declaration is honest', () => {
    const { touches, changed } = blind(honest)
    expect(touches).toBeGreaterThan(100)
    expect(changed / touches).toBeLessThan(0.1)
    // The aimed run confirms the declaration is honest: it lands on the button.
    const aimed = playClarity({ persona: kaia, proto: honest, runSeed: masterRunSeed(1, 0), mode: 'aimed' })
    expect(aimed.aimedTouches).toBeGreaterThan(5)
    expect(aimed.aimedHits / aimed.aimedTouches).toBeGreaterThan(0.5)
    expect(aimed.changed).toBeGreaterThan(0)
  })

  it('reads clear for a sim that answers a touch anywhere', () => {
    const { touches, changed } = blind(anywhere)
    expect(changed / touches).toBeGreaterThan(0.9)
  })

  it.each([
    ['blind', anywhere, () => true],
    ['aimed', honest, (x: number, y: number) => inside(SMALL, x, y)],
  ] as const)('uses hints on and counts the ticks to the first change from the start (%s)', (mode, proto, answers) => {
    const spy = watch(proto, answers)
    const result = playClarity({ persona: kaia, proto: spy.watched, runSeed: 5, mode })
    expect(spy.configs.length).toBeGreaterThan(0)
    expect(spy.configs.every((c) => c.hints === true)).toBe(true)
    // The sim answered a touch, so a first change exists, inside the ten seconds,
    // and it lands on the tick of the first touch the sim answers.
    const answeredAt = spy.answeredAt()
    expect(answeredAt).not.toBeNull()
    expect(result.firstChangeTick).not.toBeNull()
    expect(result.firstChangeTick!).toBeGreaterThanOrEqual(0)
    expect(result.firstChangeTick!).toBeLessThan(FIRST_TEN_TICKS)
    expect(result.firstChangeTick).toBe(answeredAt)
  })

  it('gives the flag its first-change input: every persona sees a change from a sim that answers anywhere', () => {
    const results = blindResults(anywhere)
    expect(results.length).toBeGreaterThanOrEqual(8)
    for (const r of results) {
      expect(r.firstChangeTick).not.toBeNull()
      expect(r.firstChangeTick!).toBeGreaterThanOrEqual(0)
      expect(r.firstChangeTick!).toBeLessThan(FIRST_TEN_TICKS)
    }
    const measure = clarityMeasure(results)
    expect(measure.runsWithChange).toBe(measure.runs)
    expect(measure.ticksToFirstChange!).toBeLessThanOrEqual(CLARITY_MAX_FIRST_TICK)
  })

  it('flags a sim that answers only on its declared button as low, and one that answers anywhere as ok', () => {
    expect(clarityMeasure(blindResults(anywhere)).flag).toBe('ok')
    expect(clarityMeasure(blindResults(honest)).flag).toBe('low')
  })

  it('does not credit a touch with a change the sim makes on its own', () => {
    const drifting: PanelProto = {
      meta: meta({ features: [{ name: 't' }] }),
      createSim: () => {
        let t = 0
        return {
          step() {
            t++
          },
          pointer() {},
          affordances: () => [SMALL],
          observe: () => ({ signature: 'a', features: { t }, events: [] }),
          snapshot: () => ({}),
        }
      },
    }
    const { changed } = blind(drifting)
    expect(changed).toBe(0)
  })
})
