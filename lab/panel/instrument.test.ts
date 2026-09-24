// Instrument validation: the panel run on five fixtures whose depth is known.
// ladder (an authored progression) and emergent (a combining sim with no
// unlocks) must pass the depth gate; constant, noise, and scoreOnly must fail
// it; and both positives must outrank all three negatives on the mean of the
// sub-signal ranks. The thresholds are FROZEN against this test: if it fails,
// the model is wrong, not the fixture, and changing a threshold means bumping
// THRESHOLDS_VERSION and recording the new values in thresholds.ts.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CreateSim, ProtoMeta } from '../kit/sim.ts'
import * as constant from './fixtures/constant.ts'
import * as emergent from './fixtures/emergent.ts'
import * as ladder from './fixtures/ladder.ts'
import * as noise from './fixtures/noise.ts'
import * as scoreOnly from './fixtures/scoreOnly.ts'
import { gate, rankScore, subSignals, targetPanel } from './metrics.ts'
import { PERSONAS } from './personas.ts'
import { buildReport } from './run.ts'
import { masterRunSeed, playRun } from './session.ts'
import * as T from './thresholds.ts'
import type { PanelProto, RunResult } from './types.ts'

interface Fixture {
  meta: ProtoMeta
  createSim: CreateSim
}

const POSITIVES: Record<string, Fixture> = { ladder, emergent }
const NEGATIVES: Record<string, Fixture> = { constant, noise, 'score-only': scoreOnly }
const ALL: Record<string, Fixture> = { ...POSITIVES, ...NEGATIVES }

function targetRuns(fixture: Fixture, masterSeed: number): RunResult[] {
  const proto: PanelProto = { meta: fixture.meta, createSim: fixture.createSim }
  const runs: RunResult[] = []
  for (const persona of targetPanel(fixture.meta)) {
    for (let k = 0; k < T.NOISE_SEEDS; k++) {
      runs.push(playRun({ persona, proto, runSeed: masterRunSeed(masterSeed, k), seedIndex: k }))
    }
  }
  return runs
}

describe('the depth gate on fixtures of known depth', () => {
  // The frozen seed, and four others so the verdicts are not one lucky draw.
  for (const seed of [T.DEFAULT_MASTER_SEED, 2, 3, 4, 5]) {
    it(`passes ladder and emergent and fails constant, noise, and scoreOnly (master seed ${seed})`, () => {
      for (const [name, fixture] of Object.entries(POSITIVES)) {
        const verdict = gate(targetRuns(fixture, seed))
        expect(verdict.pass, `${name} should pass (share ${verdict.share})`).toBe(true)
      }
      for (const [name, fixture] of Object.entries(NEGATIVES)) {
        const verdict = gate(targetRuns(fixture, seed))
        expect(verdict.pass, `${name} should fail (share ${verdict.share})`).toBe(false)
      }
    })
  }

  it('passes the positives well clear of the line and fails the negatives well clear of it', () => {
    for (const fixture of Object.values(POSITIVES)) {
      expect(gate(targetRuns(fixture, T.DEFAULT_MASTER_SEED)).share).toBeGreaterThanOrEqual(0.65)
    }
    for (const fixture of Object.values(NEGATIVES)) {
      expect(gate(targetRuns(fixture, T.DEFAULT_MASTER_SEED)).share).toBeLessThanOrEqual(0.15)
    }
  })

  it('judges every fixture on the same target panel', () => {
    const ids = Object.values(ALL).map((f) => targetPanel(f.meta).map((p) => p.id).join(','))
    expect(new Set(ids).size).toBe(1)
    expect(ids[0]).toBe('kaia,tess,arch-6,arch-7,arch-8,arch-9')
  })
})

describe('the ranking on fixtures of known depth', () => {
  for (const seed of [T.DEFAULT_MASTER_SEED, 2, 3]) {
    it(`ranks both positives above all three negatives on the mean of the sub-signal ranks (master seed ${seed})`, () => {
      const ranked = rankScore(
        Object.entries(ALL).map(([key, fixture]) => ({ key, signals: subSignals(targetRuns(fixture, seed)) })),
      )
      const byKey = Object.fromEntries(ranked.map((r) => [r.key, r]))
      for (const positive of Object.keys(POSITIVES)) {
        for (const negative of Object.keys(NEGATIVES)) {
          expect(byKey[positive]!.meanRank, `${positive} over ${negative}`).toBeGreaterThan(byKey[negative]!.meanRank)
        }
      }
      expect(ranked.slice(0, 2).map((r) => r.key).sort()).toEqual(['emergent', 'ladder'])
    })
  }

  it('gives the positives more return than the negatives, and the sandbox aims that make progress', () => {
    const signals = Object.fromEntries(Object.entries(ALL).map(([key, f]) => [key, subSignals(targetRuns(f, T.DEFAULT_MASTER_SEED))]))
    for (const positive of Object.keys(POSITIVES)) {
      for (const negative of Object.keys(NEGATIVES)) {
        expect(signals[positive]!.returnScore).toBeGreaterThan(signals[negative]!.returnScore)
        expect(signals[positive]!.changeScore).toBeGreaterThanOrEqual(signals[negative]!.changeScore)
      }
    }
    expect(signals['emergent']!.aimScore).toBeGreaterThan(1)
    // The negatives have nothing a persona can push, or nothing it can claim.
    for (const negative of Object.keys(NEGATIVES)) expect(signals[negative]!.aimScore).toBeLessThan(0.1)
  })
})

describe('a number that only goes up', () => {
  // A clicker: one big button, and a declared feature that goes up with every
  // touch on it. A score is a hook, but a builder can declare it as a feature.
  // Pushing it teaches a persona nothing it did not know after the first
  // touches, so it must not pass the gate on the strength of self-set aims.
  const BUTTON = { x: 390, y: 210, w: 400, h: 400 }
  const clicker: PanelProto = {
    meta: { ...constant.meta, key: 'clicker', features: [{ name: 'count', objective: 'up' }] },
    createSim: () => {
      let count = 0
      return {
        step() {},
        pointer(input) {
          const inside = input.x >= BUTTON.x && input.x <= BUTTON.x + BUTTON.w && input.y >= BUTTON.y && input.y <= BUTTON.y + BUTTON.h
          if (input.phase === 'down' && inside) count++
        },
        affordances: () => [{ ...BUTTON, kind: 'tap', salience: 1 }],
        observe: () => ({ signature: 'flat', features: { count }, events: [] }),
        snapshot: () => ({}),
      }
    },
  }

  for (const seed of [T.DEFAULT_MASTER_SEED, 2, 3]) {
    it(`fails the gate even though its aims all make progress (master seed ${seed})`, () => {
      const runs = targetRuns(clicker, seed)
      expect(gate(runs).pass).toBe(false)
      expect(gate(runs).share).toBeLessThanOrEqual(0.15)
      // Aims did make progress: the number went up. That alone kept nobody.
      expect(subSignals(runs).aimScore).toBeGreaterThan(0.5)
    })
  }
})

describe('hook ablation on the fixtures', () => {
  const report = (fixture: Fixture) => buildReport({ meta: fixture.meta, createSim: fixture.createSim }, { seed: T.DEFAULT_MASTER_SEED })

  it('finds the unlock hook of the ladder needed and its decoration not needed', () => {
    const hooks = report(ladder)['hooks'] as { status: string; allOff: { session3Share: number }; perHook: Record<string, { verdict: string }> }
    expect(hooks.status).toBe('ran')
    expect(hooks.allOff.session3Share).toBe(0)
    expect(hooks.perHook['unlock']!.verdict).toBe('needed')
    expect(hooks.perHook['sparkle']!.verdict).toBe('not needed')
  })

  it('reads the score hook of scoreOnly as inconclusive', () => {
    const hooks = report(scoreOnly)['hooks'] as { perHook: Record<string, { verdict: string; changedAffordancesOrSignatures: boolean }> }
    expect(hooks.perHook['score']).toMatchObject({
      verdict: 'inconclusive (the persona model has no reward response)',
      changedAffordancesOrSignatures: false,
    })
  })
})

describe('the frozen thresholds', () => {
  const source = readFileSync(join(import.meta.dirname, 'thresholds.ts'), 'utf8')

  it('records every constant in the header, with the value the code uses', () => {
    const header = source.slice(0, source.indexOf('\nimport '))
    const recorded = new Map<string, string>()
    for (const line of header.split('\n')) {
      const match = /^\/\/ {3}([A-Z][A-Z0-9_]*) = (.+)$/.exec(line)
      if (match) recorded.set(match[1]!, match[2]!.trim())
    }
    const exported = Object.entries(T).filter(([, value]) => typeof value === 'number' || typeof value === 'string')
    expect(exported.length).toBeGreaterThan(50)
    for (const [name, value] of exported) {
      expect(recorded.get(name), `${name} is recorded in the thresholds header`).toBe(String(value))
    }
    expect(recorded.size).toBe(exported.length)
  })

  it('records every persona parameter and its research or default label in the header', () => {
    const header = source.slice(0, source.indexOf('\nimport '))
    for (const persona of PERSONAS) {
      const line = header.split('\n').find((l) => new RegExp(`^//   ${persona.id} `).test(l))
      expect(line, `${persona.id} is recorded`).toBeDefined()
      expect(line).toContain(`age ${persona.age}`)
      expect(line).toContain(`jitter ${persona.touchJitter}`)
      expect(line).toContain(`attention ${persona.attention}`)
      expect(line).toContain(`novelty ${persona.draw.novelty}`)
      expect(line).toContain(`aim ${persona.aimInvention}`)
      expect(line).toContain(`return ${persona.returnPropensity}`)
      expect(line).toContain(persona.provenance['focus'] === 'research' ? 'focus research' : 'focus default')
    }
    expect(header).toContain('touchJitter        default')
    expect(header).toContain('research for age 4 and under')
    expect(header).toContain('tess (5) is ASSUMED')
  })

  it('names the version the instrument was frozen at', () => {
    expect(T.THRESHOLDS_VERSION).toBe('u2-panel-1')
  })
})
