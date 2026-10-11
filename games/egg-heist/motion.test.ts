import { describe, expect, it } from 'vitest'
import { POTATO_KNOCKS, crowPeck, dogPant, dogTail, farmerNod, frogHop, gooseWaddle, raccoonPeep, scarecrowSway, sunTurn, thingHop, thingLand, washingSwing } from './motion'
import { THINGS } from './yard'

/** Twenty seconds of one character's idle motion at 30 samples a second, scaled to its own range. */
function series(of: (t: number) => number): number[] {
  const raw = Array.from({ length: 600 }, (_, i) => of(i / 30))
  const low = Math.min(...raw), high = Math.max(...raw)
  expect(high - low, 'it moves at all').toBeGreaterThan(0)
  return raw.map((v) => (v - low) / (high - low))
}

const IDLES: Record<string, (t: number) => number> = {
  raccoon: (t) => raccoonPeep(t),
  goose: (t) => gooseWaddle(t).tilt,
  dogTail: (t) => dogTail(t),
  dogPant: (t) => dogPant(t),
  scarecrow: (t) => scarecrowSway(t),
  crow: (t) => crowPeck(t).tilt,
  frog: (t) => frogHop(t).lift,
  farmer: (t) => farmerNod(t),
  longjohns: (t) => washingSwing(0, t),
  sheet: (t) => washingSwing(1, t),
  sock: (t) => washingSwing(2, t),
  otherSock: (t) => washingSwing(3, t),
  sun: (t) => sunTurn(t) % 1,
}

describe('every character moves like itself', () => {
  it('is alive at idle, and no two share a motion or differ only by where they start', () => {
    const all = Object.entries(IDLES).map(([name, of]) => ({ name, values: series(of) }))
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        // The nearest the two come over any shift of up to four seconds: a copy with a phase offset comes to nothing.
        let nearest = Infinity
        for (let shift = 0; shift < 120; shift += 3) {
          let sum = 0
          for (let i = 0; i < 480; i++) sum += Math.abs(all[a].values[i] - all[b].values[i + shift])
          nearest = Math.min(nearest, sum / 480)
        }
        expect(nearest, `${all[a].name} and ${all[b].name}`).toBeGreaterThan(0.08)
      }
    }
  })

  it('brings every thing to rest in its own way, and leaves it lying still and straight', () => {
    const lands = THINGS.map((id) => JSON.stringify(Array.from({ length: 12 }, (_, i) => { const m = thingLand(id, i * 0.05); return [Math.round(m.lift), Math.round(m.tilt * 50)] })))
    expect(new Set(lands).size).toBe(THINGS.length)
    const hops = THINGS.map((id) => JSON.stringify([Math.round(thingHop(id, 0.5).lift), Math.round(thingHop(id, 0.3).tilt * 50)]))
    expect(new Set(hops).size).toBe(THINGS.length)
    for (const id of THINGS) {
      const rest = thingLand(id, 4)
      expect(Math.abs(rest.lift)).toBeLessThan(0.5)
      expect(Math.abs(rest.tilt)).toBeLessThan(0.01)
    }
  })

  it('bounces the ball in time with the three boings of its voice', () => {
    // The potato rolls half a turn to its knock and then rocks to rest.
    expect(thingLand('potato', 0).tilt).toBeCloseTo(-Math.PI, 5)
    expect(thingLand('potato', POTATO_KNOCKS).tilt).toBeCloseTo(0, 5)
    expect(Math.abs(thingLand('potato', POTATO_KNOCKS + 0.1).tilt)).toBeGreaterThan(0.05)
    for (const touch of [0.22, 0.4]) expect(Math.abs(thingLand('ball', touch).lift)).toBeLessThan(1)
    expect(thingLand('ball', 0.11).lift).toBeLessThan(-30)
  })
})
