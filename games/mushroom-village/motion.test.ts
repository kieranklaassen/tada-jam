import { describe, expect, it } from 'vitest'
import { GNOMES } from './ground'
import { idlePose, poseOf, snailIdle, sunIdle, type GnomePose, type GnomeStir } from './motion'

const CHANNELS = ['bob', 'lean', 'head', 'hat', 'nose', 'bundle'] as const satisfies readonly (keyof GnomePose)[]
/** How far each part moves over ten seconds at rest, and when it peaks. */
function trace(who: (typeof GNOMES)[number]) {
  const range = {} as Record<(typeof CHANNELS)[number], number>
  for (const channel of CHANNELS) {
    let low = Infinity, high = -Infinity
    for (let t = 0; t < 10; t += 1 / 30) { const v = idlePose(who, t)[channel]; low = Math.min(low, v); high = Math.max(high, v) }
    range[channel] = high - low
  }
  return range
}

const still: GnomeStir = { hop: 0, hatBend: 0, hatUp: 0, press: 0, rise: 0, lean: 0, nod: 0, face: null }

describe('how the characters move at rest', () => {
  it('moves every gnome while the child just watches', () => {
    for (const who of GNOMES) expect(Math.max(...Object.values(trace(who))), who).toBeGreaterThan(0.05)
  })

  it('gives no two gnomes the same move: for every pair, a part that one moves and the other holds still', () => {
    const traces = Object.fromEntries(GNOMES.map((who) => [who, trace(who)]))
    for (const a of GNOMES) for (const b of GNOMES) {
      if (a === b) continue
      const told = CHANNELS.some((channel) => traces[a][channel] > 4 * traces[b][channel] && traces[a][channel] > 0.04)
      expect(told, `${a} has a move ${b} does not`).toBe(true)
    }
  })

  it('gives each gnome his own part that moves most: the hat, the head, the nose, the bucket', () => {
    const most = (who: (typeof GNOMES)[number]) => { const range = trace(who); return CHANNELS.filter((c) => c !== 'bob').sort((x, y) => range[y] - range[x])[0] }
    expect(most('tall')).toBe('hat')
    expect(most('sleepy')).toBe('head')
    expect(most('sneezy')).toBe('nose')
    expect(most('baker')).toBe('bundle')
  })

  it('lays a touch over the rest: a pressed hat comes down over the eyes, a face is pulled, a tall mushroom lifts the tall one', () => {
    expect(poseOf('baker', 1, { ...still, press: 1 }).hatDown).toBe(1)
    expect(poseOf('sleepy', 1, { ...still, face: 'wide' }).lid).toBe(0)
    expect(poseOf('sneezy', 1, { ...still, face: 'shut' }).lid).toBe(1)
    expect(poseOf('tall', 1, { ...still, rise: 1 }).bob).toBeGreaterThan(idlePose('tall', 1).bob + 10)
    expect(poseOf('tall', 1, { ...still, rise: -0.8 }).brow).toBeLessThan(0)
  })

  it('sways the snail\'s two eyes one after the other, and turns the sun', () => {
    const a = snailIdle(1), b = snailIdle(3)
    expect(a.stalks[0]).not.toBeCloseTo(a.stalks[1], 2)
    expect(a.stalks[0]).not.toBeCloseTo(b.stalks[0], 2)
    expect(sunIdle(10).turn).toBeGreaterThan(sunIdle(1).turn)
  })
})
