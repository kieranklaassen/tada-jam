import { describe, expect, it } from 'vitest'
import { DAWN_SECONDS, ForestCycle, NIGHT_SECONDS, NIGHTFALL_SECONDS, SETTLE_BEFORE_NIGHT, WAKE_GAP, WAKE_START } from './cycle'

function run(cycle: ForestCycle, seconds: number, allAsleep: boolean): void {
  for (let t = 0; t < seconds; t += 1 / 30) cycle.step(1 / 30, allAsleep)
}

describe('the dusk-to-dawn loop', () => {
  it('stays dusk while anyone is awake', () => {
    const cycle = new ForestCycle()
    run(cycle, 60, false)
    expect(cycle.phase).toBe('dusk')
    expect(cycle.playful).toBe(true)
  })

  it('starts the night a moment after everyone is asleep', () => {
    const cycle = new ForestCycle()
    run(cycle, SETTLE_BEFORE_NIGHT - 0.2, true)
    expect(cycle.phase).toBe('dusk')
    run(cycle, 0.4, true)
    expect(cycle.phase).toBe('nightfall')
    expect(cycle.playful).toBe(false)
  })

  it('an animal lifted out of bed before nightfall restarts the settling moment', () => {
    const cycle = new ForestCycle()
    run(cycle, SETTLE_BEFORE_NIGHT - 0.2, true)
    run(cycle, 0.1, false)
    run(cycle, SETTLE_BEFORE_NIGHT - 0.2, true)
    expect(cycle.phase).toBe('dusk')
  })

  it('goes nightfall, night, dawn, then back to dusk, with the sky in range', () => {
    const cycle = new ForestCycle()
    cycle.startNight()
    const seen: string[] = []
    for (let t = 0; t < NIGHTFALL_SECONDS + NIGHT_SECONDS + DAWN_SECONDS + 1; t += 1 / 30) {
      cycle.step(1 / 30, true)
      if (cycle.entered) seen.push(cycle.entered)
      for (const value of Object.values(cycle.sky)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
      if (cycle.phase === 'night' && cycle.t > 12) expect(cycle.sky.stars).toBeGreaterThan(0.9)
    }
    expect(seen).toEqual(['night', 'dawn', 'dusk'])
    expect(cycle.phase).toBe('dusk')
    expect(cycle.sky.morning).toBeGreaterThan(0.9)
    run(cycle, 30, false)
    expect(cycle.sky.morning).toBe(0)
  })

  it('wakes animals one after another at dawn', () => {
    const cycle = new ForestCycle()
    cycle.startNight()
    run(cycle, NIGHTFALL_SECONDS + NIGHT_SECONDS + WAKE_START + 0.05, true)
    expect(cycle.phase).toBe('dawn')
    expect(cycle.wakeDue(0)).toBe(true)
    expect(cycle.wakeDue(1)).toBe(false)
    run(cycle, WAKE_GAP, true)
    expect(cycle.wakeDue(1)).toBe(true)
  })
})
