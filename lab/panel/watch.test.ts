import { describe, expect, it } from 'vitest'
import type { CreateSim, PointerInput, Sim, SimConfig } from '../kit/sim.ts'
import { TICK_MS } from '../kit/sim.ts'
import { createWatcher } from '../shell/watch.ts'
import * as constant from './fixtures/constant.ts'
import * as ladder from './fixtures/ladder.ts'
import { getPersona } from './personas.ts'
import { createRunPlayer } from './session.ts'
import type { PanelProto } from './types.ts'

interface Seen {
  sims: number
  configs: SimConfig[]
  steps: number
  // Every pointer input with the sim it went to and that sim's step count.
  inputs: { sim: number; step: number; input: PointerInput }[]
}

// Wraps a sim so everything the driver feeds it is recorded.
function recording(base: CreateSim): { createSim: CreateSim; seen: Seen } {
  const seen: Seen = { sims: 0, configs: [], steps: 0, inputs: [] }
  const createSim: CreateSim = (config): Sim => {
    const index = seen.sims++
    seen.configs.push(config)
    const sim = base(config)
    let step = 0
    return {
      ...sim,
      step() {
        step++
        seen.steps++
        sim.step()
      },
      pointer(input) {
        seen.inputs.push({ sim: index, step, input })
        sim.pointer(input)
      },
    }
  }
  return { createSim, seen }
}

describe('watch mode', () => {
  it('feeds the sim the very input log the panel produced for the same persona and seed', () => {
    const TICKS = 4000
    for (const [personaId, seed] of [['kaia', 5], ['arch-8', 9], ['arch-3', 21]] as const) {
      const watched = recording(ladder.createSim)
      const panelled = recording(ladder.createSim)
      const persona = getPersona(personaId)

      const watcher = createWatcher({ proto: { meta: ladder.meta, createSim: watched.createSim }, seed, personaId })
      // Frames of an uneven length, as the browser delivers them.
      let elapsed = 0
      let frame = 0
      while (elapsed < TICKS * TICK_MS) {
        const dt = [16, 17, 33, 50, 8][frame++ % 5]!
        watcher.advance(dt)
        elapsed += dt
      }

      const player = createRunPlayer({ persona, proto: { meta: ladder.meta, createSim: panelled.createSim }, runSeed: seed, hints: false })
      const ticks = Math.floor(elapsed / TICK_MS)
      for (let i = 0; i < ticks; i++) player.tick()

      expect(panelled.seen.inputs.length).toBeGreaterThan(30)
      expect(JSON.stringify(watched.seen.inputs)).toBe(JSON.stringify(panelled.seen.inputs))
      expect(watched.seen.configs).toEqual(panelled.seen.configs)
      expect(watched.seen.steps).toBe(panelled.seen.steps)
    }
  })

  it('shows the panel run for the seed: session 1 input log equals the run player log', () => {
    const watched = recording(ladder.createSim)
    const watcher = createWatcher({ proto: { meta: ladder.meta, createSim: watched.createSim }, seed: 12, personaId: 'tess' })
    watcher.advance(1500 * TICK_MS)
    const player = createRunPlayer({ persona: getPersona('tess'), proto: ladder as unknown as PanelProto, runSeed: 12, hints: false })
    for (let i = 0; i < 1500; i++) player.tick()
    const log = player.runner.log.map((entry) => ({ step: entry.tick, input: entry.input }))
    expect(watched.seen.inputs.map((i) => ({ step: i.step, input: i.input }))).toEqual(log)
  })

  it('runs whole ticks of the fixed step and carries the remainder', () => {
    const watched = recording(constant.createSim)
    const watcher = createWatcher({ proto: { meta: constant.meta, createSim: watched.createSim }, seed: 1, personaId: 'kaia' })
    watcher.advance(10)
    watcher.advance(10)
    watcher.advance(10)
    expect(watched.seen.steps).toBe(0)
    watcher.advance(3)
    expect(watched.seen.steps).toBe(1)
    watcher.advance(TICK_MS * 10 + 5)
    expect(watched.seen.steps).toBe(11)
    watcher.advance(-100)
    expect(watched.seen.steps).toBe(11)
  })

  it('plays without hints and with every declared hook, like the panel return runs', () => {
    const watched = recording(ladder.createSim)
    const watcher = createWatcher({ proto: { meta: ladder.meta, createSim: watched.createSim }, seed: 3, personaId: 'kaia' })
    watcher.advance(TICK_MS)
    expect(watched.seen.configs).toHaveLength(1)
    expect(watched.seen.configs[0]).toMatchObject({ hints: false, hooks: ['unlock', 'sparkle'] })
    expect(watcher.sim).toBeDefined()
  })

  it('lets the world carry on, without input, once the persona has left', () => {
    // On a sim that never changes, Archetype 3 is bored inside the first
    // session and (for this seed) does not come back.
    const shown = recording(constant.createSim)
    const watcher = createWatcher({ proto: { meta: constant.meta, createSim: shown.createSim }, seed: 4, personaId: 'arch-3' })
    watcher.advance(4000 * TICK_MS)
    expect(shown.seen.sims).toBe(1)
    const inputs = shown.seen.inputs.length
    const steps = shown.seen.steps
    expect(inputs).toBeGreaterThan(20)
    watcher.advance(500 * TICK_MS)
    expect(shown.seen.inputs.length).toBe(inputs)
    expect(shown.seen.steps).toBe(steps + 500)
  })

  it('refuses a persona that does not exist', () => {
    expect(() => createWatcher({ proto: constant as unknown as PanelProto, seed: 1, personaId: 'nobody' })).toThrow(/unknown persona/)
  })

  it('does not throw when the sim does: the watcher stops feeding it', () => {
    const proto: PanelProto = {
      meta: constant.meta,
      createSim: (config) => {
        const sim = constant.createSim(config)
        let n = 0
        return {
          ...sim,
          step() {
            if (++n === 50) throw new Error('watch boom')
          },
        }
      },
    }
    const watcher = createWatcher({ proto, seed: 1, personaId: 'kaia' })
    expect(() => watcher.advance(200 * TICK_MS)).not.toThrow()
    expect(() => watcher.advance(200 * TICK_MS)).not.toThrow()
  })
})
