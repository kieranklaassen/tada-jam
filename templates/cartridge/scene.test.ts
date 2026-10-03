// template: cartridge/scene.test.ts v1
import { describe, expect, it } from 'vitest'
import { AttendedClock } from './attention'
import { Scene, type Beat } from './scene'

/** Three beats that write their progress into `seen`: 0 to 1 s, 1 to 3 s, and a cue at 3 s. */
function beats(seen: number[][]): Beat[] {
  const beat = (index: number, at: number, lasts: number): Beat => ({ at, lasts, play: (progress) => seen[index].push(progress) })
  return [beat(0, 0, 1), beat(1, 1, 2), beat(2, 3, 0)]
}

describe('a scene', () => {
  it('saves its outcome when it starts, before any beat plays', () => {
    const order: string[] = []
    const scene = new Scene([{ at: 0, lasts: 1, play: () => order.push('beat') }])
    scene.start(10, () => order.push('outcome'))
    scene.update(10.5)
    expect(order).toEqual(['outcome', 'beat'])
  })

  it('plays each beat over its own stretch of time and leaves it at its end', () => {
    const seen: number[][] = [[], [], []]
    const scene = new Scene(beats(seen))
    scene.start(100, () => {})
    scene.update(100.5)
    expect(seen).toEqual([[0.5], [], []])
    scene.update(102)
    expect(seen).toEqual([[0.5, 1], [0.5], []])
    expect(scene.running).toBe(true)
    scene.update(103.2)
    expect(seen).toEqual([[0.5, 1], [0.5, 1], [1]])
    expect(scene.running).toBe(false)
    scene.update(110)
    expect(seen).toEqual([[0.5, 1], [0.5, 1], [1]])
  })

  it('does not advance while unattended: its beats follow the attended clock', () => {
    const seen: number[][] = [[], [], []]
    const scene = new Scene(beats(seen))
    const clock = new AttendedClock()
    clock.advance(0)
    scene.start(clock.seconds, () => {})
    for (let ms = 50; ms <= 500; ms += 50) {
      clock.advance(ms)
      scene.update(clock.seconds)
    }
    expect(seen[0].at(-1)).toBeCloseTo(0.5)
    // Put away for a minute. No frame runs, and the first frame back plays no time.
    clock.rest()
    clock.advance(60_500)
    scene.update(clock.seconds)
    expect(seen[0].at(-1)).toBeCloseTo(0.5)
    expect(seen[1]).toEqual([])
    clock.advance(60_550)
    scene.update(clock.seconds)
    expect(seen[0].at(-1)).toBeCloseTo(0.55)
  })

  it('ends on a touch with every beat left at its end state, in order, each once', () => {
    const seen: number[][] = [[], [], []]
    const order: number[] = []
    const scene = new Scene(beats(seen).map((beat, index) => ({ ...beat, play: (progress: number) => { beat.play(progress); if (progress === 1) order.push(index) } })))
    scene.start(0, () => {})
    scene.update(0.4)
    scene.finish()
    expect(seen).toEqual([[0.4, 1], [1], [1]])
    expect(order).toEqual([0, 1, 2])
    expect(scene.running).toBe(false)
    scene.finish()
    scene.update(5)
    expect(order).toEqual([0, 1, 2])
  })

  it('started a second time plays every beat again from its beginning, and saves its outcome again', () => {
    const seen: number[][] = [[], [], []]
    let saved = 0
    const scene = new Scene(beats(seen))
    scene.start(0, () => saved++)
    scene.update(3.5)
    expect(seen).toEqual([[1], [1], [1]])
    expect(scene.running).toBe(false)
    scene.start(20, () => saved++)
    expect(saved).toBe(2)
    expect(scene.running).toBe(true)
    scene.update(20.5)
    expect(seen).toEqual([[1, 0.5], [1], [1]])
    // A touch ends the second run as it would the first: every beat lands at its end state once more.
    scene.finish()
    expect(seen).toEqual([[1, 0.5, 1], [1, 1], [1, 1]])
    expect(scene.running).toBe(false)
  })

  it('is not running before it starts, and a touch then does nothing', () => {
    const seen: number[][] = [[], [], []]
    const scene = new Scene(beats(seen))
    expect(scene.running).toBe(false)
    scene.finish()
    scene.update(3)
    expect(seen).toEqual([[], [], []])
  })
})
