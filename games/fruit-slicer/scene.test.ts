// template: cartridge/scene.test.ts v2
import { describe, expect, it } from 'vitest'
import { AttendedClock } from './attention'
import { Scene, followedBy, sceneLength, type Beat } from './scene'

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

  it('lays the rest of a counted beat when a touch ends it, so nothing is laid twice and nothing is left out', () => {
    // A beat that lays ten things as it goes, counting what it has laid.
    const laid: number[] = []
    const lay = (progress: number): void => {
      while (laid.length < Math.floor(progress * 10)) laid.push(laid.length)
    }
    const scene = new Scene([{ at: 0, lasts: 2, play: lay }])
    scene.start(0, () => {})
    scene.update(0.5)
    scene.update(0.7)
    expect(laid).toEqual([0, 1, 2])
    scene.finish()
    expect(laid).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

describe('one scene after another', () => {
  /** Two beats that write their progress into `seen` under `name`: 0 to 1 s, and a cue at 1.5 s. */
  const pair = (name: string, seen: string[]): Beat[] => [
    { at: 0, lasts: 1, play: (progress) => seen.push(`${name} move ${progress}`) },
    { at: 1.5, lasts: 0, play: () => seen.push(`${name} cue`) },
  ]

  it('is as long as its last beat takes to end, whatever the order of its beats', () => {
    expect(sceneLength([])).toBe(0)
    expect(sceneLength(beats([[], [], []]))).toBe(3)
    expect(sceneLength([{ at: 2, lasts: 4, play: () => {} }, { at: 5, lasts: 0, play: () => {} }])).toBe(6)
  })

  it('moves the second scene to after the end of the first, and leaves both as they were', () => {
    const first = pair('first', []), second = pair('second', [])
    const both = followedBy(first, second)
    expect(both.map((beat) => [beat.at, beat.lasts])).toEqual([[0, 1], [1.5, 0], [1.5, 1], [3, 0]])
    expect(first.map((beat) => beat.at)).toEqual([0, 1.5])
    expect(second.map((beat) => beat.at)).toEqual([0, 1.5])
    expect(sceneLength(both)).toBe(3)
    // After an empty scene nothing moves.
    expect(followedBy([], second).map((beat) => beat.at)).toEqual([0, 1.5])
  })

  it('plays the two as one scene: the second starts when the first has ended', () => {
    const seen: string[] = []
    const scene = new Scene(followedBy(pair('first', seen), pair('second', seen)))
    scene.start(10, () => {})
    scene.update(10.5)
    scene.update(11.25)
    expect(seen).toEqual(['first move 0.5', 'first move 1'])
    scene.update(12)
    expect(seen).toEqual(['first move 0.5', 'first move 1', 'first cue', 'second move 0.5'])
    expect(scene.running).toBe(true)
    scene.update(13)
    expect(seen.slice(4)).toEqual(['second move 1', 'second cue'])
    expect(scene.running).toBe(false)
  })

  it('ends both on a touch, the first before the second, each beat once', () => {
    const seen: string[] = []
    const scene = new Scene(followedBy(pair('first', seen), pair('second', seen)))
    scene.start(0, () => {})
    scene.update(0.5)
    scene.finish()
    expect(seen).toEqual(['first move 0.5', 'first move 1', 'first cue', 'second move 1', 'second cue'])
    expect(scene.running).toBe(false)
  })
})
