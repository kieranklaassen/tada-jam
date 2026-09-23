import { describe, expect, it } from 'vitest'
import { BEAT_SECONDS, clusterPieces, groupsFor, schedule, type Placed } from './voice'

const row = (count: number, startId: number, x: number, y = 500, r = 30): Placed[] =>
  Array.from({ length: count }, (_, i) => ({ id: startId + i, x: x + i * 62, y, r }))

const heap = (count: number, startId: number, cx: number, cy: number): Placed[] =>
  Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    x: cx + (i % 4) * 62,
    y: cy + Math.floor(i / 4) * 62,
    r: 30,
  }))

describe('number voice grouping', () => {
  it('sounds ten in one heap as five and five', () => {
    expect(groupsFor(heap(10, 1, 500, 400)).map((g) => g.length)).toEqual([5, 5])
  })

  it('sounds three in a row as three', () => {
    expect(groupsFor(row(3, 1, 500)).map((g) => g.length)).toEqual([3])
  })

  it('sounds a heap of two and a lone stone as two and one, left to right', () => {
    const pieces = [...row(2, 1, 400), ...row(1, 3, 900)]
    expect(groupsFor(pieces)).toEqual([[1, 2], [3]])
  })

  it('chunks seven touching stones as five and two', () => {
    expect(groupsFor(row(7, 1, 300)).map((g) => g.length)).toEqual([5, 2])
  })

  it('counts halves as pieces', () => {
    const halves = row(2, 1, 500, 500, 23)
    expect(clusterPieces(halves)).toEqual([[1, 2]])
  })
})

describe('schedule', () => {
  it('rises within a group and rests longer between groups', () => {
    const beats = schedule([
      [1, 2, 3],
      [4, 5],
    ])
    expect(beats.map((b) => b.step)).toEqual([0, 1, 2, 0, 1])
    const within = beats[1].t - beats[0].t
    const between = beats[3].t - beats[2].t
    expect(within).toBeCloseTo(BEAT_SECONDS)
    expect(between).toBeGreaterThan(within)
  })

  it('puts every piece on exactly one beat', () => {
    const groups = groupsFor(heap(10, 1, 500, 400))
    const ids = schedule(groups).flatMap((b) => b.ids)
    expect([...ids].sort((a, b) => a - b)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1))
  })

  it('schedules nothing for an empty set', () => {
    expect(schedule([])).toEqual([])
    expect(schedule([[]])).toEqual([])
  })
})
