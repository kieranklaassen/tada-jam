import { describe, expect, it } from 'vitest'
import { Mover, PERSONALITIES, REST, springTo, type Character, type Pose } from './motion'

const CAST = Object.keys(PERSONALITIES) as Character[]
const trace = (draw: (t: number, pose: Pose) => void, seconds: number) => Array.from({ length: 24 }, (_, i) => {
  const pose = { ...REST }
  draw((i / 23) * seconds, pose)
  return Object.values(pose).map((one) => one.toFixed(2)).join()
}).join('|')

describe('the cast', () => {
  it('share no movement', () => {
    const all = CAST.flatMap((kind) => {
      const one = PERSONALITIES[kind]
      return [trace(one.idle, 6), trace(one.soup, 6), trace(one.bath, 6), trace(one.bed, 6), ...one.pokes.map((poke) => trace((t, pose) => poke.curve(t, pose), 1))]
    })
    expect(new Set(all).size).toBe(all.length)
    const names = CAST.flatMap((kind) => PERSONALITIES[kind].pokes.map((poke) => poke.name))
    expect(new Set(names).size).toBe(names.length)
    for (const key of ['breath', 'look', 'depth'] as const) expect(new Set(CAST.map((kind) => PERSONALITIES[kind][key])).size).toBe(CAST.length)
  })
  it('never repeat a poke, and blink', () => {
    for (const kind of CAST) {
      const mover = new Mover(kind, 3)
      let last = -1, blinked = false
      for (let i = 0; i < 12; i++) {
        const now = mover.touch()
        expect(now).not.toBe(last)
        last = now
      }
      for (let i = 0; i < 60 * 12; i++) blinked = mover.update(1 / 60, 'home').eyes < 0.3 || blinked
      expect(blinked).toBe(true)
    }
  })
  it('springs settle, on slow frames too', () => {
    const spring = { x: 0, v: 0 }
    for (let i = 0; i < 40; i++) springTo(spring, 1, 200, 18, 0.1)
    expect(spring.x).toBeCloseTo(1, 2)
  })
})
