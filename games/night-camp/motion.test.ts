import { describe, expect, it } from 'vitest'
import { Cast, MOVERS, PERSONALITIES, type Mover } from './motion'

const sample = (curve: (t: number) => number) => Array.from({ length: 41 }, (_, i) => curve(i / 40))
const apart = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length
const pairs = MOVERS.flatMap((a, i) => MOVERS.slice(i + 1).map((b) => [a, b] as const))

describe('every character moves like itself', () => {
  it('gives each a tempo, a weight and a funniest part of its own', () => {
    expect(new Set(MOVERS.map((who) => PERSONALITIES[who].tempo)).size).toBe(MOVERS.length)
    expect(new Set(MOVERS.map((who) => PERSONALITIES[who].part)).size).toBe(MOVERS.length)
    for (const [a, b] of pairs) expect(Math.abs(PERSONALITIES[a].tempo - PERSONALITIES[b].tempo), `${a} and ${b}`).toBeGreaterThan(0.25)
    for (const who of MOVERS) { expect(PERSONALITIES[who].weight).toBeGreaterThanOrEqual(0); expect(PERSONALITIES[who].weight).toBeLessThanOrEqual(1) }
  })

  it('shares no breathing rhythm: two at the same tempo would still breathe differently, or their tempos are far apart', () => {
    for (const [a, b] of pairs) {
      const shape = apart(sample(PERSONALITIES[a].breath), sample(PERSONALITIES[b].breath)), tempo = Math.abs(PERSONALITIES[a].tempo - PERSONALITIES[b].tempo)
      expect(shape > 0.12 || tempo > 0.6, `${a} and ${b}: shape ${shape.toFixed(2)}, tempo ${tempo.toFixed(2)}`).toBe(true)
    }
  })

  it('shares no idle act and no answer to a poke: no two curves are near copies, and no two take the same time', () => {
    for (const [a, b] of pairs) {
      expect(apart(sample(PERSONALITIES[a].idle), sample(PERSONALITIES[b].idle)), `idle of ${a} and ${b}`).toBeGreaterThan(0.08)
      expect(apart(sample(PERSONALITIES[a].poke), sample(PERSONALITIES[b].poke)), `poke of ${a} and ${b}`).toBeGreaterThan(0.08)
      expect(Math.abs(PERSONALITIES[a].pokeSeconds - PERSONALITIES[b].pokeSeconds), `poke of ${a} and ${b}`).toBeGreaterThan(0.04)
      expect(PERSONALITIES[a].idleSeconds).not.toBe(PERSONALITIES[b].idleSeconds)
    }
  })

  it('keeps every curve inside its range, and every answer to a poke starting and ending at rest', () => {
    for (const who of MOVERS) {
      for (const value of sample(PERSONALITIES[who].breath)) { expect(value, who).toBeGreaterThanOrEqual(-1.001); expect(value, who).toBeLessThanOrEqual(1.001) }
      for (const value of sample(PERSONALITIES[who].poke)) { expect(value, who).toBeGreaterThanOrEqual(-0.001); expect(value, who).toBeLessThanOrEqual(1.3) }
      expect(Math.max(...sample(PERSONALITIES[who].poke)), `${who} really answers`).toBeGreaterThan(0.6)
      expect(PERSONALITIES[who].poke(0), who).toBeCloseTo(0, 1)
      expect(PERSONALITIES[who].poke(1), who).toBeCloseTo(0, 1)
    }
  })

  it('answers later the heavier it is', () => {
    const half = (who: Mover) => { const own = PERSONALITIES[who]; for (let i = 0; i <= 200; i++) if (own.poke(i / 200) >= 0.5) return (i / 200) * own.pokeSeconds; return Infinity }
    for (const [a, b] of pairs) {
      const gap = PERSONALITIES[a].weight - PERSONALITIES[b].weight
      if (Math.abs(gap) < 0.3) continue
      const [heavy, light] = gap > 0 ? [a, b] : [b, a]
      expect(half(heavy), `${heavy} is heavier than ${light}`).toBeGreaterThan(half(light))
    }
  })
})

describe('the cast on game time', () => {
  const run = (seed: number, seconds: number, each?: (cast: Cast, t: number) => void) => {
    const cast = new Cast(seed)
    for (let i = 0; i < seconds * 60; i++) { cast.step(1 / 60); each?.(cast, (i + 1) / 60) }
    return cast
  }

  it('is the same for the same seed and different for another', () => {
    const snap = (seed: number) => { const cast = run(seed, 20); return MOVERS.map((who) => [cast.breath(who), cast.idle(who), cast.head(who)]) }
    expect(snap(7)).toEqual(snap(7))
    expect(snap(7)).not.toEqual(snap(8))
  })

  it('is alive at idle: every character does its own act within a minute, and rests in between', () => {
    const acted = new Map<Mover, number>(), rested = new Set<Mover>()
    run(3, 60, (cast) => { for (const who of MOVERS) { if (Math.abs(cast.idle(who)) > 0.3) acted.set(who, (acted.get(who) ?? 0) + 1); else if (cast.idle(who) === 0) rested.add(who) } })
    for (const who of MOVERS) { expect(acted.get(who) ?? 0, who).toBeGreaterThan(0); expect(rested.has(who), who).toBe(true) }
  })

  it('never has the whole cast acting in step', () => {
    let together = 0, frames = 0
    run(5, 120, (cast) => { frames++; if (MOVERS.filter((who) => cast.idle(who) !== 0).length >= 5) together++ })
    expect(together / frames).toBeLessThan(0.01)
  })

  it('never does two idle acts of the same size in a row', () => {
    const sizes: number[] = []
    let last = 0, peak = 0
    run(11, 240, (cast) => {
      const now = cast.idle('cook')
      if (now > 0) peak = Math.max(peak, now)
      if (now === 0 && last > 0) { sizes.push(peak); peak = 0 }
      last = now
    })
    expect(sizes.length).toBeGreaterThan(10)
    for (let i = 1; i < sizes.length; i++) expect(Math.abs(sizes[i] - sizes[i - 1]), `acts ${i - 1} and ${i}`).toBeGreaterThan(0.05)
  })

  it('gives a camper how far through its act it is, running once from start to end, and a smaller act is a shorter one', () => {
    const runs: number[][] = []
    let now: number[] = []
    run(9, 120, (cast) => { const t = cast.idleProgress('scout'); if (t > 0) now.push(t); else if (now.length) { runs.push(now); now = [] } })
    expect(runs.length).toBeGreaterThan(5)
    for (const one of runs) for (let i = 1; i < one.length; i++) expect(one[i]).toBeGreaterThan(one[i - 1])
    expect(new Set(runs.map((one) => one.length)).size, 'acts of more than one length').toBeGreaterThan(1)
  })

  it('answers a poke at once, in the character\'s own time, and a second poke starts the answer again', () => {
    const cast = run(2, 1)
    expect(cast.poked('small')).toBe(0)
    cast.poke('small'); cast.poke('sleeper')
    expect(cast.busy('small')).toBe(true)
    for (let i = 0; i < 12; i++) cast.step(1 / 60)
    expect(cast.poked('small')).toBeGreaterThan(0.4)
    expect(cast.poked('sleeper'), 'the heavy one has not moved yet').toBe(0)
    for (let i = 0; i < 60; i++) cast.step(1 / 60)
    expect(cast.busy('small')).toBe(false)
    expect(cast.poked('small')).toBe(0)
    expect(cast.busy('sleeper')).toBe(true)
    cast.poke('sleeper')
    expect(cast.pokeProgress('sleeper')).toBe(0)
    expect(cast.pokeProgress('small')).toBe(1)
  })

  it('turns a head toward what it watches and back, the quick ones first', () => {
    const cast = run(4, 1)
    cast.watch('small', 0.8, 1); cast.watch('sleeper', 0.8, 1)
    for (let i = 0; i < 15; i++) cast.step(1 / 60)
    expect(cast.head('small')).toBeGreaterThan(0.6)
    expect(cast.head('sleeper')).toBeLessThan(cast.head('small') / 2)
    for (let i = 0; i < 240; i++) cast.step(1 / 60)
    expect(Math.abs(cast.head('small'))).toBeLessThan(0.01)
    expect(cast.camper('reader')).toEqual({ breath: cast.breath('reader'), head: cast.head('reader'), idle: cast.idleProgress('reader'), poke: 0 })
  })
})
