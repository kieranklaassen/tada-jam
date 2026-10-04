import { describe, expect, it } from 'vitest'
import { type Puff, RANGE, WAYS, brush, burst, crack, flick, gasp, knock, plop, rustle, secondsOf, swish, thump, tick } from './sounds'
import { KINDS, callSeconds, VOICES } from './voices'

const within = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high

const every: [string, Puff[]][] = [
  ...[0, 0.5, 1].map((weight) => [`knock ${weight}`, knock(weight)] as [string, Puff[]]),
  ...[0, 1, 2].map((way) => [`crack ${way}`, crack(way)] as [string, Puff[]]),
  ...[0, 1, 2].map((way) => [`burst ${way}`, burst(way)] as [string, Puff[]]),
  ...[0, 0.5, 1].map((weight) => [`thump ${weight}`, thump(weight)] as [string, Puff[]]),
  ...[0, 1, 2, 3].map((which) => [`plop ${which}`, plop(which)] as [string, Puff[]]),
  ...[0, 0.5, 1].map((across) => [`flick ${across}`, flick(across)] as [string, Puff[]]),
  ['swish', swish()],
  ['rustle', rustle()],
  ['gasp', gasp()],
  ['tick', tick()],
  ['brush', brush()],
]

describe('every sound that is not a voice', () => {
  it('stays inside its ranges', () => {
    for (const [name, puffs] of every) {
      expect(puffs.length, name).toBeGreaterThan(0)
      for (const one of puffs) {
        expect(within(one.pitch, RANGE.pitch), name).toBe(true)
        expect(within(one.glideTo, RANGE.pitch), name).toBe(true)
        expect(within(one.q, RANGE.q), name).toBe(true)
        expect(within(one.peak, RANGE.peak), name).toBe(true)
        expect(within(one.attack, RANGE.attack), name).toBe(true)
        expect(within(one.decay, RANGE.decay), name).toBe(true)
        expect(one.at, name).toBeGreaterThanOrEqual(0)
      }
      expect(within(secondsOf(puffs), RANGE.seconds), name).toBe(true)
    }
  })

  it('is shorter than the shortest call a voice makes twice over, so it never covers a call', () => {
    const longest = Math.max(...every.map(([, puffs]) => secondsOf(puffs)))
    expect(longest).toBeLessThan(0.6)
    // A knock and a crack come before a call from inside: together they are over before the call has well begun.
    expect(secondsOf(knock(1))).toBeLessThan(0.1)
    expect(secondsOf(crack(2))).toBeLessThan(0.13)
    expect(Math.min(...KINDS.map((kind) => callSeconds(VOICES[kind])))).toBeGreaterThanOrEqual(0.12)
  })

  it('is never louder than the loudest voice', () => {
    const loudest = Math.max(...KINDS.map((kind) => VOICES[kind].peak))
    for (const [name, puffs] of every) for (const one of puffs) expect(one.peak, name).toBeLessThanOrEqual(loudest)
  })

  it('comes in several ways that differ', () => {
    for (const make of [crack, burst]) expect(new Set(Array.from({ length: WAYS }, (_, way) => JSON.stringify(make(way)))).size).toBe(WAYS)
    expect(JSON.stringify(crack(WAYS))).toBe(JSON.stringify(crack(0)))
  })

  it('follows weight and place: a heavier body knocks and lands lower, and a flick differs across the page', () => {
    expect(knock(1)[0].pitch).toBeLessThan(knock(0)[0].pitch)
    expect(thump(1)[0].pitch).toBeLessThan(thump(0)[0].pitch)
    expect(thump(1)[0].peak).toBeGreaterThan(thump(0)[0].peak)
    expect(flick(1)[0].pitch).toBeGreaterThan(flick(0)[0].pitch)
    expect(new Set([0, 1, 2].map((which) => plop(which)[0].pitch)).size).toBe(3)
  })
})
