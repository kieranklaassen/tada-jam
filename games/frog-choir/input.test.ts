import { describe, expect, it } from 'vitest'
import { GestureTracker, TAP_MAX_MS, TAP_SLOP_PX, type Gestures } from './input'

function recorder() {
  const log: string[] = []
  const out: Gestures<string> = {
    press: (id, target) => log.push(`press ${id} ${target}`),
    tap: (id, target) => log.push(`tap ${id} ${target}`),
    dragStart: (id, target) => log.push(`dragStart ${id} ${target}`),
    dragMove: (id, target) => log.push(`dragMove ${id} ${target}`),
    dragEnd: (id, target) => log.push(`dragEnd ${id} ${target}`),
    cancel: (id, target) => log.push(`cancel ${id} ${target}`),
  }
  const tracker = new GestureTracker<string>((x) => (x < 100 ? 'frog' : 'water'), out)
  return { log, tracker }
}

describe('gestures', () => {
  it('turns a short still touch into a tap', () => {
    const { log, tracker } = recorder()
    tracker.down(1, 10, 10, 0)
    tracker.move(1, 12, 11)
    tracker.up(1, 12, 11, 120)
    expect(log).toEqual(['press 1 frog', 'tap 1 frog'])
  })

  it('turns travel into a drag that keeps its first target', () => {
    const { log, tracker } = recorder()
    tracker.down(1, 10, 10, 0)
    tracker.move(1, 10 + TAP_SLOP_PX + 5, 10)
    tracker.move(1, 300, 10)
    tracker.up(1, 300, 10, 900)
    expect(log).toEqual(['press 1 frog', 'dragStart 1 frog', 'dragMove 1 frog', 'dragMove 1 frog', 'dragEnd 1 frog'])
  })

  it('treats a long still press as nothing', () => {
    const { log, tracker } = recorder()
    tracker.down(1, 10, 10, 0)
    tracker.up(1, 10, 10, TAP_MAX_MS + 100)
    expect(log).toEqual(['press 1 frog', 'cancel 1 frog'])
  })

  it('lets three fingers act at once', () => {
    const { log, tracker } = recorder()
    tracker.down(1, 10, 10, 0)
    tracker.down(2, 200, 10, 0)
    tracker.down(3, 20, 10, 0)
    tracker.up(2, 200, 10, 100)
    expect(log.filter((line) => line.startsWith('tap'))).toEqual(['tap 2 water'])
    expect(tracker.activeCount).toBe(2)
  })

  it('cancels everything on a fourth finger until the whole hand lifts', () => {
    const { log, tracker } = recorder()
    for (let id = 1; id <= 3; id++) tracker.down(id, 10 * id, 10, 0)
    tracker.move(1, 200, 10)
    tracker.down(4, 50, 50, 10)
    expect(log.filter((line) => line.startsWith('cancel'))).toHaveLength(3)
    const before = log.length
    tracker.up(1, 200, 10, 20)
    tracker.down(5, 10, 10, 30)
    tracker.up(5, 10, 10, 40)
    expect(log.length).toBe(before)
    for (const id of [2, 3, 4]) tracker.up(id, 10, 10, 50)
    tracker.down(6, 10, 10, 60)
    tracker.up(6, 10, 10, 70)
    expect(log.slice(-2)).toEqual(['press 6 frog', 'tap 6 frog'])
  })

  it('forgets every finger on reset, cancelling what was held', () => {
    const { log, tracker } = recorder()
    tracker.down(1, 10, 10, 0)
    tracker.move(1, 200, 10)
    tracker.reset()
    expect(log.at(-1)).toBe('cancel 1 frog')
    tracker.up(1, 200, 10, 100)
    expect(log.at(-1)).toBe('cancel 1 frog')
    expect(tracker.activeCount).toBe(0)
  })
})
