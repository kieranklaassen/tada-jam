import { describe, expect, it } from 'vitest'
import { KINDS } from './loads'
import { RANGE, voiceLength, voices, type Cue } from './voices'

const every = (): [string, Cue][] => {
  const v = voices, all: [string, Cue][] = [['toss', v.toss(0.5)], ['shuffle', v.shuffle()], ['heave', v.heave()], ['pop', v.pop()], ['thump', v.thump()], ['cork', v.cork()], ['peel', v.peel()], ['spring', v.spring()], ['rumble', v.rumble()], ['open', v.open()], ['flop', v.flop()], ['howl', v.howl(0)]]
  for (let n = 0; n < 6; n++) all.push(['squeeze', v.squeeze(n)], ['mouse', v.mouse(n)], ['cub', v.cub(n)], ['sugar', v.sugar(n)], ['cloth', v.cloth(n)], ['jar', v.jar(n - 3, n)], ['lift', v.lift(n)], ['down', v.down(n)], ['caught', v.caught(n)], ['step', v.step(n)], ['bear', v.bear(0, n)], ['bear', v.bear(1, n)], ['knock', v.knock(n % 3, n)], ['bump', v.bump(n)])
  for (const who of [0, 1] as const) all.push(['squashed', v.squashed(who)], ['boing', v.boing(who)])
  all.push(['boing', v.boing(2)])
  for (const kind of KINDS) for (const what of ['turn', 'swap', 'bump', 'in'] as const) for (let turn = 0; turn < 4; turn++) all.push([`${kind} ${what} ${turn}`, v.rider(kind, what, turn, 0)])
  return all
}

describe('every voice', () => {
  it('is inside the ranges', () => {
    for (const [name, cue] of every()) {
      expect(cue.length, name).toBeGreaterThan(0)
      for (const n of cue) {
        for (const hz of [n.frequency, n.glideTo ?? n.frequency]) { expect(hz, name).toBeGreaterThanOrEqual(RANGE.frequency[0]); expect(hz, name).toBeLessThanOrEqual(RANGE.frequency[1]) }
        expect(n.peak, name).toBeLessThanOrEqual(RANGE.peak)
        expect(n.attack, name).toBeGreaterThanOrEqual(RANGE.attack[0])
        expect(n.attack, name).toBeLessThanOrEqual(RANGE.attack[1])
        const moment = (n.delay ?? 0) + n.attack
        expect(cue.filter((m) => (m.delay ?? 0) <= moment && moment <= (m.delay ?? 0) + m.attack + m.decay * 0.6).reduce((sum, m) => sum + m.peak, 0), name).toBeLessThanOrEqual(RANGE.sum)
      }
      expect(voiceLength(cue), name).toBeLessThanOrEqual(RANGE.length)
    }
  })

  it('every cell of the grid is its own: five different sounds for each load, and no two loads share one', () => {
    const seen = new Set<string>()
    for (const kind of KINDS) for (const cue of [voices.rider(kind, 'turn', 1, 0), voices.rider(kind, 'turn', 2, 0), voices.rider(kind, 'swap', 0, 0), voices.rider(kind, 'bump', 0, 0), voices.rider(kind, 'in', 0, 0)]) seen.add(JSON.stringify(cue))
    expect(seen.size).toBe(30)
  })
})
