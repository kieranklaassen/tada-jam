import { describe, expect, it } from 'vitest'
import { Stamps } from './stamps'
import type { G } from './silk'

const sheet = (log: string[]) => new Proxy({}, { get: (_, name) => (...args: unknown[]) => (name === 'getTransform' ? { a: 1, b: 0.3, c: -0.3, d: 1, e: 0, f: 0 } : log.push(`${String(name)} ${args.length}`)), set: () => true }) as unknown as G

function kit() {
  let made = 0
  const stamps = new Stamps(() => {
    made += 1
    return { canvas: {} as CanvasImageSource, g: sheet([]) }
  })
  stamps.begin(1)
  let painted = 0
  const put = (name: string, what: string, how: string) => stamps.put(sheet([]), name, [0, 0, 10, 10], what, how, () => { painted += 1 })
  return { stamps, put, made: () => made, painted: () => painted }
}

describe('kept pictures', () => {
  it('paints once, and again only for a change', () => {
    const k = kit()
    k.put('a', 'x', '1')
    k.put('a', 'x', '1')
    expect([k.made(), k.painted()]).toEqual([1, 1])
    k.put('a', 'x', '2')
    expect([k.made(), k.painted()]).toEqual([1, 2])
  })
  it('lets a look wait one frame when busy, and what it is of never', () => {
    const k = kit()
    for (const name of ['a', 'b', 'c', 'd']) k.put(name, 'x', '1')
    k.stamps.begin(1)
    for (const name of ['a', 'b', 'c']) k.put(name, 'x', '2')
    expect(k.painted()).toBe(6)
    k.put('d', 'y', '1')
    expect(k.painted()).toBe(7)
    k.stamps.begin(1)
    for (const name of ['c', 'a', 'b']) k.put(name, 'x', '2')
    expect(k.painted()).toBe(8)
  })
  it('starts afresh at another size', () => {
    const k = kit()
    k.put('a', 'x', '1')
    k.stamps.begin(2)
    k.put('a', 'x', '1')
    expect([k.made(), k.painted()]).toEqual([2, 2])
  })
})
