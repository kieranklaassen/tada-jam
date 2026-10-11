// template: cartridge/perf.test.ts v2
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installJamPerf } from './perf'
import { PerfRing } from './quality'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the performance handle', () => {
  it('publishes the game\'s work, tier and draw counts on window.__jamPerf, read live', () => {
    vi.stubGlobal('window', {})
    const ring = new PerfRing()
    const reading = { tier: 1, drawCalls: 12, triangles: 340 }
    installJamPerf(ring, () => reading)
    ring.push(3)
    ring.push(5)
    expect(window.__jamPerf).toMatchObject({ cpuMs: [3, 5], tier: 1, drawCalls: 12, triangles: 340 })
    reading.tier = 2
    expect(window.__jamPerf?.tier).toBe(2)
    window.__jamPerf?.reset()
    expect(window.__jamPerf?.cpuMs).toEqual([])
  })

  it('removes its own handle on cleanup, and never another game\'s', () => {
    vi.stubGlobal('window', {})
    const read = () => ({ tier: 0, drawCalls: 0, triangles: 0 })
    const removeFirst = installJamPerf(new PerfRing(), read)
    const removeSecond = installJamPerf(new PerfRing(), read)
    const second = window.__jamPerf
    removeFirst()
    expect(window.__jamPerf).toBe(second)
    removeSecond()
    expect(window.__jamPerf).toBeUndefined()
  })
})
