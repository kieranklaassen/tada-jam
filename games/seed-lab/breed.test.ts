import { describe, expect, it } from 'vitest'
import { POD_SEEDS, chancesOf, runnerOf, seedOf, seedsOfPod } from './breed'
import { STREAM, draws, isSeed, pick } from './chance'
import { PACKETS, TRAITS, colourOf, lookOf, pack, pairOf, type Pairs } from './plant'

const SEED = 20261003
const ALL = Array.from({ length: 256 }, (_, pairs) => pairs)
const PINK = PACKETS.pink
const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
const WHITE = pack({ colour: [0, 0], height: [1, 1], leaf: [1, 1], petals: [1, 1] })

describe('the streams of chance', () => {
  it('give the same draws for the same seed, stream and place', () => {
    const a = draws(SEED, STREAM.pod, 7), b = draws(SEED, STREAM.pod, 7)
    for (let i = 0; i < 50; i++) expect(a()).toBe(b())
  })

  it('give different draws for another seed, stream or place', () => {
    const first = (seed: number, stream: 1 | 2, index: number) => { const next = draws(seed, stream, index); return [next(), next(), next()].join() }
    const base = first(SEED, STREAM.pod, 7)
    expect(first(SEED + 1, STREAM.pod, 7)).not.toBe(base)
    expect(first(SEED, STREAM.visit, 7)).not.toBe(base)
    expect(first(SEED, STREAM.pod, 8)).not.toBe(base)
  })

  it('stay from 0 up to 1 and spread evenly', () => {
    const next = draws(SEED, STREAM.pod, 0)
    const tenths = new Array(10).fill(0)
    for (let i = 0; i < 20000; i++) {
      const value = next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      tenths[Math.floor(value * 10)]++
    }
    for (const count of tenths) expect(Math.abs(count - 2000)).toBeLessThan(200)
  })

  it('pick a whole number below the count, and know a seed from anything else', () => {
    const next = draws(SEED, STREAM.visit, 3)
    for (let i = 0; i < 500; i++) expect([0, 1, 2, 3]).toContain(pick(next, 4))
    expect(pick(() => 0.999999999, 4)).toBe(3)
    expect(isSeed(SEED)).toBe(true)
    for (const bad of [-1, 1.5, 2 ** 32, NaN, '1', null]) expect(isSeed(bad)).toBe(false)
  })
})

describe('a seed of two parents', () => {
  it('takes, for every trait, one factor its first parent carries and one its second carries', () => {
    const next = draws(SEED, STREAM.pod, 1)
    for (let i = 0; i < 4000; i++) {
      const onto = ALL[pick(next, 256)], dust = ALL[pick(next, 256)]
      const young = seedOf(next, onto, dust)
      for (const trait of TRAITS) {
        const [first, second] = pairOf(young, trait)
        expect(pairOf(onto, trait)).toContain(first)
        expect(pairOf(dust, trait)).toContain(second)
      }
    }
  })

  it('never gives what neither parent carries: two whites give only whites', () => {
    for (let pod = 0; pod < 200; pod++) for (const young of seedsOfPod(SEED, pod, WHITE, WHITE)) expect(colourOf(young)).toBe('white')
  })

  it('gives only pinks from a red and a white', () => {
    for (let pod = 0; pod < 200; pod++) for (const young of seedsOfPod(SEED, pod, RED, WHITE)) expect(colourOf(young)).toBe('pink')
  })

  it('works with a plant’s own dust', () => {
    const colours = new Set<string>()
    for (let pod = 0; pod < 50; pod++) for (const young of seedsOfPod(SEED, pod, PINK, PINK)) colours.add(colourOf(young))
    expect([...colours].sort()).toEqual(['pink', 'red', 'white'])
  })
})

describe('a pod', () => {
  it('holds six seeds, and the same six every time it is asked for', () => {
    const pod = seedsOfPod(SEED, 12, PACKETS.short, PACKETS.spots)
    expect(pod).toHaveLength(POD_SEEDS)
    expect(seedsOfPod(SEED, 12, PACKETS.short, PACKETS.spots)).toEqual(pod)
  })

  it('differs from the pod before it and from the same pod on another page', () => {
    const key = (seed: number, index: number) => seedsOfPod(seed, index, PACKETS.short, PACKETS.short).join()
    const distinct = new Set(Array.from({ length: 40 }, (_, index) => key(SEED, index)))
    expect(distinct.size).toBeGreaterThan(30)
    expect(key(SEED + 1, 0)).not.toBe(key(SEED, 0))
  })

  it('gives young that differ from one another', () => {
    let mixed = 0
    for (let pod = 0; pod < 200; pod++) if (new Set(seedsOfPod(SEED, pod, PINK, PINK).map(colourOf)).size > 1) mixed++
    expect(mixed).toBeGreaterThan(180)
  })

  it('is six honest draws: over many pods the colours of two pinks come near one red, two pink, one white', () => {
    const counts = { red: 0, pink: 0, white: 0 }
    const pods = 4000
    for (let pod = 0; pod < pods; pod++) for (const young of seedsOfPod(SEED, pod, PINK, PINK)) counts[colourOf(young)]++
    const total = pods * POD_SEEDS
    expect(Math.abs(counts.red / total - 0.25)).toBeLessThan(0.015)
    expect(Math.abs(counts.pink / total - 0.5)).toBeLessThan(0.015)
    expect(Math.abs(counts.white / total - 0.25)).toBeLessThan(0.015)
  })

  it('is never smoothed into a tidy sample: some pods of two pinks hold no white, and some hold three or more', () => {
    let none = 0, many = 0
    for (let pod = 0; pod < 400; pod++) {
      const whites = seedsOfPod(SEED, pod, PINK, PINK).filter((young) => colourOf(young) === 'white').length
      if (whites === 0) none++
      if (whites >= 3) many++
    }
    // By the model 17.8% of pods hold none and 16.9% hold three or more.
    expect(none).toBeGreaterThan(40)
    expect(many).toBeGreaterThan(40)
  })

  it('draws each trait by itself: a hidden short shows in about a quarter of the young, whatever their colour', () => {
    const carrier = PACKETS.short
    let short = 0, shortAndWhite = 0
    const pods = 4000
    for (let pod = 0; pod < pods; pod++) {
      for (const young of seedsOfPod(SEED, pod, carrier, carrier)) {
        const look = lookOf(young, false)
        if (look.joints === 2) short++
        if (look.joints === 2 && look.colour === 'white') shortAndWhite++
      }
    }
    const total = pods * POD_SEEDS
    expect(Math.abs(short / total - 1 / 4)).toBeLessThan(0.015)
    expect(Math.abs(shortAndWhite / total - 1 / 16)).toBeLessThan(0.01)
  })
})

describe('a runner', () => {
  it('gives the one parent again, for every plant there is', () => {
    for (const parent of ALL) expect(runnerOf(parent)).toBe(parent)
  })
})

describe('the chances by the model', () => {
  const total = (chances: Map<Pairs, number>) => [...chances.values()].reduce((sum, chance) => sum + chance, 0)

  it('add up to one for any two parents', () => {
    const next = draws(SEED, STREAM.pod, 2)
    for (let i = 0; i < 300; i++) expect(total(chancesOf(ALL[pick(next, 256)], ALL[pick(next, 256)]))).toBeCloseTo(1, 10)
  })

  it('give one plant only when both parents breed true', () => {
    expect(chancesOf(RED, WHITE).size).toBe(1)
    expect(chancesOf(WHITE, WHITE).size).toBe(1)
  })

  it('hold every young a pod ever gives', () => {
    const chances = chancesOf(PACKETS.short, PACKETS.jagged)
    for (let pod = 0; pod < 300; pod++) for (const young of seedsOfPod(SEED, pod, PACKETS.short, PACKETS.jagged)) expect(chances.has(young)).toBe(true)
  })
})
