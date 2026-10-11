import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { LANE, PLACES, WALL, colOf, rowOf } from './layout'
import type { BrickKind } from './save'
import { layWall } from './walls'

const kinds = (position: string, seed = 1): Set<BrickKind> => new Set(layWall(position, seed).flatMap((brick) => (brick ? [brick.kind] : [])))

describe('the walls of the designed order', () => {
  it('meets one new kind of brick at each place, and all five at the last', () => {
    expect([...kinds('glass')]).toEqual(['glass'])
    expect(kinds('jelly')).toEqual(new Set(['glass', 'jelly']))
    expect(kinds('ice')).toEqual(new Set(['glass', 'jelly', 'ice']))
    expect(kinds('sleepy')).toEqual(new Set(['glass', 'ice', 'sleepy']))
    expect(kinds('seed')).toEqual(new Set(['glass', 'jelly', 'seed']))
    for (let seed = 1; seed < 40; seed++) expect(kinds('all', seed)).toEqual(new Set(['glass', 'jelly', 'ice', 'seed', 'sleepy']))
  })

  it('lays every wall out new, whole and inside the three rules of the table', () => {
    const walls = [...LADDER.map((position) => layWall(position, 1)), ...Array.from({ length: 60 }, (_, seed) => layWall('all', seed + 1))]
    for (const wall of walls) {
      expect(wall.length).toBe(PLACES)
      const seeds = wall.flatMap((brick, place) => (brick?.kind === 'seed' ? [place] : []))
      expect(seeds.length).toBeLessThanOrEqual(1)
      wall.forEach((brick, place) => {
        if (!brick) return
        // A jelly stands in the top row, with nothing above it.
        if (brick.kind === 'jelly') expect(rowOf(place)).toBe(0)
        // The seed stands in the second column, and the lane beside it holds nothing.
        if (brick.kind === 'seed') expect(colOf(place)).toBe(LANE.seedCol)
        if (seeds.length > 0) expect(colOf(place)).not.toBe(LANE.col)
        expect(['whole', 'fresh', 'asleep']).toContain(brick.state)
      })
    }
    // Not every place holds a brick, after the first wall.
    for (const wall of walls.slice(1)) expect(wall.filter((brick) => brick === null).length).toBeGreaterThan(0)
    expect(layWall('glass', 1).filter((brick) => brick !== null).length).toBe(WALL.cols * WALL.rows)
  })

  it('lays the last wall out afresh each time, and the same for the same seed', () => {
    expect(layWall('all', 5)).toEqual(layWall('all', 5))
    const shapes = new Set(Array.from({ length: 30 }, (_, seed) => JSON.stringify(layWall('all', seed + 1))))
    expect(shapes.size).toBeGreaterThan(20)
  })

  it('lays out a glass wall for a position it does not know', () => {
    expect(layWall('no-such-place', 1)).toEqual(layWall('glass', 1))
  })
})
