import { describe, expect, it } from 'vitest'
import { InkPage } from './ink'
import { INK, PAPER, SPOT, mulberry32, type Surface } from './inkHatch'
import { SPIKE_SCENE, type InkScene } from './inkScene'

/** A 2D context that draws nothing and writes down every call and every property set. */
function fakeContext(log: string[]): CanvasRenderingContext2D {
  const round = (value: unknown): unknown => (typeof value === 'number' ? Math.round(value * 1000) / 1000 : typeof value === 'object' && value !== null ? '#' : value)
  return new Proxy({} as Record<string, unknown>, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return (...args: unknown[]) => {
        log.push(`${name}(${args.map(round).join(',')})`)
        return name === 'createPattern' ? { pattern: true } : undefined
      }
    },
    set(target, name, value) {
      if (typeof name === 'string') { target[name] = value; log.push(`${name}=${String(round(value))}`) }
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

function fakeSurfaces() {
  const logs: string[][] = []
  const make = (width: number, height: number): Surface => {
    const log: string[] = []
    logs.push(log)
    const context = fakeContext(log)
    return { width, height, getContext: () => context }
  }
  return { make, logs }
}

const TEXT = /^(fillText|strokeText|measureText|font=)/

function frame(page: InkPage, scene: InkScene, seconds: number): { log: string[]; count: number } {
  const log: string[] = []
  const count = page.draw(fakeContext(log), scene, seconds)
  return { log, count }
}

describe('the ink page', () => {
  it('draws the spike scene with no text call anywhere, on the page or in a cached figure', () => {
    const { make, logs } = fakeSurfaces()
    const page = new InkPage(make)
    page.resize(1180, 820, 2, 0)
    const all = [0, 0.1, 0.4, 2, 7.3].flatMap((seconds) => frame(page, SPIKE_SCENE, seconds).log)
    expect(all.length).toBeGreaterThan(100)
    expect(all.filter((call) => TEXT.test(call))).toEqual([])
    expect(logs.length).toBeGreaterThan(10)
    for (const log of logs) expect(log.filter((call) => TEXT.test(call))).toEqual([])
  })

  it('draws a frame in well under 80 sprites and figures', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    for (const seconds of [0, 1, 2, 3.7, 12]) {
      const { count, log } = frame(page, SPIKE_SCENE, seconds)
      expect(count).toBeGreaterThan(8)
      expect(count).toBeLessThan(80)
      // What it reports is at least every sprite it set on the page.
      expect(count).toBeGreaterThanOrEqual(log.filter((call) => call.startsWith('drawImage')).length)
      // At most one composite the size of the whole surface: the still layer.
      expect(log.filter((call) => call === 'drawImage(#,0,0)')).toHaveLength(1)
    }
  })

  it('issues the same calls for the same seconds, and other calls for other seconds', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const first = frame(page, SPIKE_SCENE, 2.25)
    const moved = frame(page, SPIKE_SCENE, 2.6)
    const again = frame(page, SPIKE_SCENE, 2.25)
    expect(again.log).toEqual(first.log)
    expect(again.count).toBe(first.count)
    expect(moved.log).not.toEqual(first.log)
    // A second page, built from nothing, draws the very same frame: nothing depends on when it was built.
    const other = new InkPage(fakeSurfaces().make)
    other.resize(1180, 820, 2, 0)
    expect(frame(other, SPIKE_SCENE, 2.25).log).toEqual(first.log)
  })

  it('paints the same building twice over: the still layer is seeded', () => {
    const a = fakeSurfaces(), b = fakeSurfaces()
    for (const { make } of [a, b]) {
      const page = new InkPage(make)
      page.resize(760, 560, 1.5, 0)
      frame(page, SPIKE_SCENE, 1)
    }
    expect(a.logs.length).toBe(b.logs.length)
    a.logs.forEach((log, i) => expect(log).toEqual(b.logs[i]))
  })

  it('rebuilds nothing on a second resize with the same arguments, and rebuilds on a new size', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    for (const seconds of [0, 0.2, 0.4, 0.6, 0.8]) frame(page, SPIKE_SCENE, seconds)
    const built = page.built
    expect(built).toBeGreaterThan(10)
    page.resize(1180, 820, 2, 0)
    for (const seconds of [0, 0.2, 0.4, 0.6, 0.8]) frame(page, SPIKE_SCENE, seconds)
    expect(page.built).toBe(built)
    page.resize(1000, 700, 2, 0)
    frame(page, SPIKE_SCENE, 0)
    expect(page.built).toBeGreaterThan(built)
  })

  it('draws nothing before it has a size', () => {
    const page = new InkPage(fakeSurfaces().make)
    expect(frame(page, SPIKE_SCENE, 1)).toEqual({ log: [], count: 0 })
  })

  it('sheds the boil at the lower tiers and still draws every guest', () => {
    const full = new InkPage(fakeSurfaces().make), low = new InkPage(fakeSurfaces().make)
    full.resize(1180, 820, 2, 0)
    low.resize(1180, 820, 1, 3)
    for (const seconds of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) {
      const a = frame(full, SPIKE_SCENE, seconds), b = frame(low, SPIKE_SCENE, seconds)
      expect(b.count).toBe(a.count)
    }
    expect(low.built).toBeLessThan(full.built)
  })

  it('uses one ink, one paper and one spot colour, and nothing else, on the frame', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const colours = new Set(frame(page, SPIKE_SCENE, 3).log.filter((call) => /^(fillStyle|strokeStyle)=/.test(call)).map((call) => call.split('=')[1]))
    for (const colour of colours) expect([INK, PAPER, SPOT]).toContain(colour)
  })

  it('has a generator that repeats for a seed and differs between seeds', () => {
    const a = mulberry32(5), b = mulberry32(5), c = mulberry32(6)
    const run = (next: () => number) => [next(), next(), next()]
    const first = run(a)
    expect(run(b)).toEqual(first)
    expect(run(c)).not.toEqual(first)
    for (const value of first) { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThan(1) }
  })
})
