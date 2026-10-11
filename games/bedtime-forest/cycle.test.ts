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

  /** Everyone asleep from dusk: through nightfall and to the end of the lullaby. */
  function throughTheLullaby(cycle: ForestCycle): void {
    run(cycle, SETTLE_BEFORE_NIGHT + NIGHTFALL_SECONDS + NIGHT_SECONDS + 0.2, true)
  }

  it('the night stays as long as the child likes: no morning comes by itself', () => {
    const cycle = new ForestCycle()
    throughTheLullaby(cycle)
    run(cycle, 120, true)
    expect(cycle.phase).toBe('night')
    expect(cycle.playful).toBe(false)
    expect(cycle.sky.stars).toBe(1)
    expect(cycle.sky.moon).toBe(1)
  })

  it('while the lullaby plays, the morning cannot be called', () => {
    const cycle = new ForestCycle()
    run(cycle, SETTLE_BEFORE_NIGHT + NIGHTFALL_SECONDS + NIGHT_SECONDS - 1, true)
    expect(cycle.phase).toBe('night')
    expect(cycle.callMorning()).toBe(false)
    expect(cycle.phase).toBe('night')
  })

  it('goes nightfall, night, then dawn when the morning is called, and back to dusk, with the sky in range', () => {
    const cycle = new ForestCycle()
    const seen: string[] = []
    const watch = (seconds: number) => {
      for (let t = 0; t < seconds; t += 1 / 30) {
        cycle.step(1 / 30, true)
        if (cycle.entered) seen.push(cycle.entered)
        for (const value of Object.values(cycle.sky)) {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThanOrEqual(1)
        }
        if (cycle.phase === 'night' && cycle.t > 12) expect(cycle.sky.stars).toBeGreaterThan(0.9)
      }
    }
    watch(SETTLE_BEFORE_NIGHT + NIGHTFALL_SECONDS + NIGHT_SECONDS + 0.2)
    expect(cycle.callMorning()).toBe(true)
    expect(cycle.phase).toBe('dawn')
    watch(DAWN_SECONDS + 1)
    expect(seen).toEqual(['nightfall', 'night', 'dusk'])
    expect(cycle.phase).toBe('dusk')
    expect(cycle.sky.morning).toBeGreaterThan(0.9)
    run(cycle, 30, false)
    expect(cycle.sky.morning).toBe(0)
  })

  it('a forest left asleep opens in the night it was left in, with the morning waiting', () => {
    const cycle = new ForestCycle()
    cycle.resumeNight()
    expect(cycle.phase).toBe('night')
    expect(cycle.entered).toBe(null)
    expect(cycle.sky.night).toBe(1)
    expect(cycle.sky.moon).toBe(1)
    expect(cycle.sky.stars).toBe(1)
    run(cycle, 60, true)
    expect(cycle.phase).toBe('night')
    expect(cycle.callMorning()).toBe(true)
  })

  it('wakes animals one after another at dawn', () => {
    const cycle = new ForestCycle()
    cycle.resumeNight()
    cycle.callMorning()
    run(cycle, WAKE_START + 0.05, true)
    expect(cycle.phase).toBe('dawn')
    expect(cycle.wakeDue(0)).toBe(true)
    expect(cycle.wakeDue(1)).toBe(false)
    run(cycle, WAKE_GAP, true)
    expect(cycle.wakeDue(1)).toBe(true)
  })
})
