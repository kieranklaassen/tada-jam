import { describe, expect, it } from 'vitest'
import { JamPerf, type PerfStats } from './perf'

const blank = (): PerfStats => ({ fps: 0, frameMs: 0, cpuMs: 0, dropped: 0, frames: 0 })

describe('grown-up frame stats', () => {
  it('reads frame rate, CPU p95, and missed vsyncs from the newest second of frames, before and after the ring wraps', () => {
    for (const older of [300, 650]) {
      const perf = new JamPerf()
      for (let i = 0; i < older; i++) perf.record(40, 40, 18, 1000, 3)
      for (let i = 0; i < 60; i++) perf.record(i === 59 ? 9 : 2, i % 20 === 0 ? 33.4 : 16.7, 18, 1000, 3)
      const stats = perf.stats(blank())
      expect(stats.frames).toBe(60)
      expect(stats.dropped).toBe(3)
      expect(stats.fps).toBeGreaterThan(55)
      expect(stats.fps).toBeLessThan(60)
      expect(stats.cpuMs).toBe(2)
    }
  })

  it('a resting garden at half rate is not counted as missing frames', () => {
    const perf = new JamPerf()
    for (let i = 0; i < 60; i++) perf.record(2, 33.4, 18, 1000, 3)
    expect(perf.stats(blank()).dropped).toBe(60)
    perf.paced = true
    const stats = perf.stats(blank())
    expect(stats.dropped).toBe(0)
    expect(Math.round(stats.fps)).toBe(30)
  })
})
