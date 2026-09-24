import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { createRng, deriveSeed } from '../kit/rng.ts'
import type { CreateSim, ProtoMeta, Sim } from '../kit/sim.ts'
import * as constant from './fixtures/constant.ts'
import * as emergent from './fixtures/emergent.ts'
import * as ladder from './fixtures/ladder.ts'
import * as noise from './fixtures/noise.ts'
import * as scoreOnly from './fixtures/scoreOnly.ts'
import { listProtoKeys, loadProto, protoDir } from './load.ts'
import { PERSONAS } from './personas.ts'
import { buildReport, parseArgs, runKeys, stableStringify } from './run.ts'
import { createMemory, createSessionRunner, playRun } from './session.ts'
import { DEFAULT_MASTER_SEED, NOISE_SEEDS, THRESHOLDS_VERSION } from './thresholds.ts'
import type { PanelProto } from './types.ts'

const scratch = mkdtempSync(join(tmpdir(), 'lab-panel-'))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

function protoOf(module: { meta: ProtoMeta; createSim: CreateSim }, createSim: CreateSim = module.createSim): PanelProto {
  return { meta: module.meta, createSim }
}

type Loose = Record<string, any>

describe('the report', () => {
  const ladderProto = protoOf(ladder)

  it('is byte-identical for the same seed and different for another (AE2)', () => {
    const a = stableStringify(buildReport(ladderProto, { seed: 7 }))
    const b = stableStringify(buildReport(ladderProto, { seed: 7 }))
    const c = stableStringify(buildReport(ladderProto, { seed: 8 }))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('has sorted keys, no timestamps, and a thresholds version', () => {
    const text = stableStringify(buildReport(ladderProto, { seed: DEFAULT_MASTER_SEED }))
    const report = JSON.parse(text) as Loose
    expect(report['thresholdsVersion']).toBe(THRESHOLDS_VERSION)
    const sorted = (value: unknown): boolean => {
      if (Array.isArray(value)) return value.every(sorted)
      if (value && typeof value === 'object') {
        const keys = Object.keys(value)
        return keys.every((k, i) => i === 0 || keys[i - 1]! <= k) && Object.values(value).every(sorted)
      }
      return true
    }
    expect(sorted(report)).toBe(true)
    expect(text).not.toMatch(/\b(timestamp|generatedAt|createdAt|date)\b/i)
    expect(text.endsWith('\n')).toBe(true)
  })

  it('holds the runs, the measures, self-play, the hook arms, and the crashes', () => {
    const report = buildReport(ladderProto, { seed: 1 }) as Loose
    expect(report['key']).toBe('ladder')
    expect(report['meta']).toMatchObject({ key: 'ladder', verb: 'press', engine: 'mastery', ageBand: [5, 8], hooks: ['unlock', 'sparkle'], hookAblation: 'supported' })
    expect(report['targetPanel']).toEqual(['kaia', 'tess', 'arch-6', 'arch-7', 'arch-8', 'arch-9'])
    expect(report['runs']).toHaveLength(PERSONAS.length * NOISE_SEEDS)
    expect(report['runs'][0]).toMatchObject({ persona: 'kaia', seed: 0 })
    expect(report['runs'][0]['sessions'][0]).toMatchObject({ index: 1 })
    expect(new Set(Object.keys(report['measures']['perPersona']))).toEqual(new Set(PERSONAS.map((p) => p.id)))
    expect(report['measures']['perPersona']['arch-3']['inTargetPanel']).toBe(false)
    expect(report['measures']['perPersona']['kaia']['inTargetPanel']).toBe(true)
    const panel = report['measures']['targetPanel']
    expect(panel['runs']).toBe(6 * NOISE_SEEDS)
    expect(panel['returnShare']).toHaveProperty('session3')
    expect(panel['play5']).toHaveProperty('newSignaturesPer100Actions')
    expect(panel['play5']).toHaveProperty('kindGrowth')
    expect(panel['aims']).toHaveProperty('features')
    expect(panel['clarity']).toHaveProperty('flag')
    expect(panel['subSignals']).toHaveProperty('returnScore')
    expect(report['gate']).toMatchObject({ pass: true, runs: 6 * NOISE_SEEDS })
    expect(report['selfPlay']).toHaveProperty('policies')
    expect(report['selfPlay']['dominant']).toHaveProperty('flagged')
    expect(report['hooks']['perHook']).toHaveProperty('unlock')
    expect(report['crashes']).toEqual([])
  })

  it('reports the gate from the target panel only', () => {
    const report = buildReport(protoOf(constant), { seed: 1 }) as Loose
    expect(report['gate']).toMatchObject({ pass: false, started: 0 })
    // The other personas are reported for information.
    expect(Object.values(report['measures']['perPersona']).some((p: any) => !p.inTargetPanel)).toBe(true)
  })

  it('records a hook that cannot be removed as n/a with its reason, and a prototype with no hooks as none declared', () => {
    const stuck: PanelProto = {
      meta: { ...constant.meta, hooks: ['loop'], hookAblation: { supported: false, reason: 'the hook is the loop itself' } },
      createSim: constant.createSim,
    }
    expect((buildReport(stuck, { seed: 1 }) as Loose)['hooks']).toMatchObject({ status: 'n/a: the hook is the loop itself', declared: ['loop'] })
    expect((buildReport(protoOf(constant), { seed: 1 }) as Loose)['hooks']).toMatchObject({ status: 'none declared' })
  })

  it('runs an arm with every hook off and one arm per declared hook', () => {
    const hooks = (buildReport(protoOf(scoreOnly), { seed: 1 }) as Loose)['hooks']
    expect(hooks['status']).toBe('ran')
    expect(hooks['baseline']).toHaveProperty('session3Share')
    expect(hooks['allOff']).toHaveProperty('diffFromBaseline')
    expect(Object.keys(hooks['perHook'])).toEqual(['score'])
    // Removing the score changes no affordance and no signature, so the persona
    // model cannot say anything about it.
    expect(hooks['perHook']['score']).toMatchObject({
      verdict: 'inconclusive (the persona model has no reward response)',
      changedAffordancesOrSignatures: false,
    })
  })
})

describe('the touches', () => {
  it('change with the persona seed and repeat with the same one', () => {
    const logFor = (runSeed: number, persona = PERSONAS[0]!) => {
      // The constant sim ignores its seed, so only the persona stream can differ.
      const runner = createSessionRunner({
        persona,
        proto: protoOf(constant),
        runSeed,
        sessionIndex: 0,
        memory: createMemory(),
        rng: createRng(deriveSeed(runSeed, 1)),
        hooks: [],
        hints: false,
        maxTicks: 600,
      })
      while (!runner.done) runner.tick()
      return JSON.stringify(runner.log)
    }
    expect(logFor(1)).toBe(logFor(1))
    expect(logFor(1)).not.toBe(logFor(2))
    expect(logFor(1, PERSONAS[0])).not.toBe(logFor(1, PERSONAS[1]))
    // And through the run: the constant sim ignores its seed there too.
    const run = (seed: number) => JSON.stringify(playRun({ persona: PERSONAS[0]!, proto: protoOf(constant), runSeed: seed }).sessions[0])
    expect(run(1)).not.toBe(run(2))
  })
})

describe('crashes', () => {
  it('are recorded in the report and the run continues', () => {
    // Every seventh sim built loses itself at tick 120.
    let built = 0
    const flaky: CreateSim = (config): Sim => {
      const sim = ladder.createSim(config)
      const doomed = built++ % 7 === 3
      let ticks = 0
      return {
        ...sim,
        step() {
          if (doomed && ++ticks === 120) throw new Error(`flaky at ${config.seed}`)
          sim.step()
        },
      }
    }
    const report = buildReport(protoOf(ladder, flaky), { seed: 1 }) as Loose
    expect(report['crashes'].length).toBeGreaterThan(0)
    expect(report['crashes'][0]).toHaveProperty('message')
    expect(report['crashes'][0]['message']).toMatch(/^flaky at \d+$/)
    // The rest of the panel still ran.
    expect(report['runs']).toHaveLength(PERSONAS.length * NOISE_SEEDS)
    const crashed = report['runs'].filter((r: Loose) => r['crashed'])
    const fine = report['runs'].filter((r: Loose) => !r['crashed'])
    expect(crashed.length).toBeGreaterThan(0)
    expect(fine.length).toBeGreaterThan(0)
    expect(Object.keys(report['measures']['perPersona'])).toHaveLength(PERSONAS.length)
  })
})

describe('hooks in a sim', () => {
  // Press the newest button of the ladder enough times to unlock.
  function press(sim: Sim, times: number): string[] {
    const seen: string[] = []
    for (let i = 0; i < times; i++) {
      const target = sim.affordances()[0]!
      const x = target.x + target.w / 2
      const y = target.y + target.h / 2
      sim.pointer({ id: i + 1, phase: 'down', x, y })
      sim.step()
      sim.pointer({ id: i + 1, phase: 'up', x, y })
      sim.step()
      for (const event of sim.observe().events) if (event.kind === 'hook') seen.push(event.name)
    }
    return seen
  }

  it('emits no hook events when the enabled list is empty', () => {
    const sim = ladder.createSim({ seed: 1, hooks: [], hints: false })
    expect(press(sim, 6)).toEqual([])
    expect(sim.observe().features['level']).toBe(0)
  })

  it('keeps the other hooks when one named hook is removed', () => {
    const all = ladder.meta.hooks
    const withoutUnlock = ladder.createSim({ seed: 1, hooks: all.filter((h) => h !== 'unlock'), hints: false })
    expect(press(withoutUnlock, 6)).toEqual([])
    expect(withoutUnlock.affordances().some((a) => a.salience === 0.05)).toBe(true)
    const withoutSparkle = ladder.createSim({ seed: 1, hooks: all.filter((h) => h !== 'sparkle'), hints: false })
    expect(press(withoutSparkle, 6)).toContain('unlock')
    expect(withoutSparkle.affordances().some((a) => a.salience === 0.05)).toBe(false)
  })

  it('emits score events only while the score hook is enabled', () => {
    const on = scoreOnly.createSim({ seed: 1, hooks: ['score'], hints: false })
    const off = scoreOnly.createSim({ seed: 1, hooks: [], hints: false })
    for (const sim of [on, off]) {
      const target = sim.affordances()[0]!
      sim.pointer({ id: 1, phase: 'down', x: target.x + 5, y: target.y + 5 })
    }
    expect(on.observe().events).toEqual([{ kind: 'hook', name: 'score' }])
    expect(off.observe().events).toEqual([])
  })
})

describe('the fixtures', () => {
  it('are contract-shaped: bounded signatures, finite features, affordances inside the field', () => {
    for (const fixture of [constant, noise, ladder, emergent, scoreOnly]) {
      const proto = protoOf(fixture)
      const seen = new Set<string>()
      for (const persona of PERSONAS) {
        const result = playRun({ persona, proto, runSeed: 3, playSessions: 1 })
        for (const s of result.sessions) for (const sig of s.signatures) seen.add(sig)
      }
      expect(seen.size).toBeGreaterThanOrEqual(1)
      expect(seen.size).toBeLessThanOrEqual(fixture.meta.signatureBound)
      const sim = fixture.createSim({ seed: 1, hooks: fixture.meta.hooks, hints: false })
      const obs = sim.observe()
      for (const spec of fixture.meta.features) expect(Number.isFinite(obs.features[spec.name])).toBe(true)
      for (const a of sim.affordances()) {
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.y).toBeGreaterThanOrEqual(0)
        expect(a.x + a.w).toBeLessThanOrEqual(1180)
        expect(a.y + a.h).toBeLessThanOrEqual(820)
      }
    }
  })

  it('name a distinct key each and a depth engine from the closed set', () => {
    const keys = [constant, noise, ladder, emergent, scoreOnly].map((f) => f.meta.key)
    expect(new Set(keys).size).toBe(5)
    for (const f of [constant, noise, ladder, emergent, scoreOnly]) {
      expect(f.meta.ageBand[1] - f.meta.ageBand[0]).toBeLessThanOrEqual(4)
    }
  })
})

describe('writing reports', () => {
  it('writes one file per key, byte-identical across two runs of the same seed', async () => {
    const fixtures: Record<string, PanelProto> = { constant: protoOf(constant), ladder: protoOf(ladder) }
    const load = async (key: string): Promise<PanelProto> => fixtures[key]!
    const one = join(scratch, 'one')
    const two = join(scratch, 'two')
    const reports = await runKeys(['constant', 'ladder'], { seed: 5, outDir: one, load })
    await runKeys(['constant', 'ladder'], { seed: 5, outDir: two, load })
    expect(Object.keys(reports)).toEqual(['constant', 'ladder'])
    expect(readdirSync(one).sort()).toEqual(['constant.json', 'ladder.json'])
    for (const file of ['constant.json', 'ladder.json']) {
      expect(readFileSync(join(one, file), 'utf8')).toBe(readFileSync(join(two, file), 'utf8'))
    }
    expect(JSON.parse(readFileSync(join(one, 'ladder.json'), 'utf8')).seed).toBe(5)
  })
})

describe('the command line', () => {
  it('reads keys and a seed', () => {
    expect(parseArgs([])).toEqual({ keys: [], seed: DEFAULT_MASTER_SEED })
    expect(parseArgs(['alpha', 'beta', '--seed', '7'])).toEqual({ keys: ['alpha', 'beta'], seed: 7 })
    expect(parseArgs(['--seed=9', 'gamma'])).toEqual({ keys: ['gamma'], seed: 9 })
  })

  it('refuses a bad seed or an unknown option', () => {
    expect(() => parseArgs(['--seed', 'x'])).toThrow(/whole number/)
    expect(() => parseArgs(['--seed=1.5'])).toThrow(/whole number/)
    expect(() => parseArgs(['--fast'])).toThrow(/unknown option/)
  })
})

describe('loading prototypes', () => {
  it('lists directories that have a meta.ts, skipping underscore and dot names, plus the example', () => {
    const protos = join(scratch, 'protos')
    const example = join(scratch, 'example')
    mkdirSync(protos)
    mkdirSync(example)
    for (const name of ['beta', 'alpha', '_template', '.hidden']) {
      mkdirSync(join(protos, name))
      writeFileSync(join(protos, name, 'meta.ts'), 'export const meta = {}\n')
    }
    mkdirSync(join(protos, 'no-meta'))
    writeFileSync(join(protos, 'stray.txt'), 'x')
    expect(listProtoKeys(protos, join(scratch, 'absent'))).toEqual(['alpha', 'beta'])
    writeFileSync(join(example, 'meta.ts'), 'export const meta = {}\n')
    expect(listProtoKeys(protos, example)).toEqual(['alpha', 'beta', 'example'])
    expect(listProtoKeys(join(scratch, 'absent'), join(scratch, 'absent'))).toEqual([])
  })

  it('resolves the example from the kit and everything else from protos', () => {
    expect(protoDir('example')).toMatch(/lab\/kit\/example$/)
    expect(protoDir('pebble-toss')).toMatch(/lab\/protos\/pebble-toss$/)
  })

  it('refuses a key that could leave the protos directory, and an unknown one', async () => {
    await expect(loadProto('../kit')).rejects.toThrow(/not a prototype key/)
    await expect(loadProto('a/b')).rejects.toThrow(/not a prototype key/)
    await expect(loadProto('no-such-proto')).rejects.toThrow()
  })

  it('loads every listed prototype from meta.ts and sim.ts', async () => {
    for (const key of listProtoKeys()) {
      const proto = await loadProto(key)
      expect(proto.meta.key).toBe(key)
      expect(typeof proto.createSim).toBe('function')
    }
  })
})

describe('the panel source', () => {
  const panelDir = import.meta.dirname
  const files = [
    ...readdirSync(panelDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => join(panelDir, f)),
    ...readdirSync(join(panelDir, 'fixtures')).filter((f) => f.endsWith('.ts')).map((f) => join(panelDir, 'fixtures', f)),
    join(panelDir, '..', 'shell', 'watch.ts'),
  ]

  it('has no wall-clock or unseeded randomness', () => {
    expect(files.length).toBeGreaterThan(14)
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/Date\.now|performance\.now|Math\.random|new Date\(/)
    }
  })

  it('imports no DOM, no prototype view or index, and nothing from the jam', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/from '[^']*\/(games|harness)\//)
      expect(text, file).not.toMatch(/from '[^']*\/(view|index)\.ts'/)
      expect(text, file).not.toMatch(/\b(document|window|globalThis)\.[A-Za-z_]|\b(HTMLElement|requestAnimationFrame|localStorage)\b/)
    }
  })

  it('uses explicit .ts extensions and type-only imports for types', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/^import (?:type )?[^\n]* from '(\.[^']*)'/gm)) {
        expect(match[1], `${file} imports ${match[1]}`).toMatch(/\.ts$/)
      }
    }
  })
})
