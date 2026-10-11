import { describe, expect, it } from 'vitest'
import { GRID, along, countPoints, graphOf, leadsTo, lengthOf, loopFrom, meetings, pebbleAt, route, snap, stepsBetween, wayToEnd, type Path } from './paths'

const line = (x0: number, y: number, n: number): Path => Array.from({ length: n }, (_, i) => ({ x: x0 + i * GRID, y }))
/** A square loop of pebbles, `n` to a side. */
const square = (x: number, y: number, n: number): Path => {
  const path: Path = []
  for (let i = 0; i < n; i++) path.push({ x: x + i * GRID, y })
  for (let i = 0; i < n; i++) path.push({ x: x + n * GRID, y: y + i * GRID })
  for (let i = 0; i < n; i++) path.push({ x: x + (n - i) * GRID, y: y + n * GRID })
  for (let i = 0; i < n; i++) path.push({ x, y: y + (n - i) * GRID })
  return path
}

describe('pebbles on their grid', () => {
  it('snaps to the grid and steps from one pebble to the next a neighbour at a time', () => {
    expect(snap(109)).toBe(100)
    expect(snap(110)).toBe(120)
    expect(stepsBetween({ x: 0, y: 0 }, { x: 60, y: 20 })).toEqual([{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 60, y: 20 }])
    expect(stepsBetween({ x: 40, y: 40 }, { x: 40, y: 40 })).toEqual([])
  })

  it('finds the pebble under a finger and whether a path leads to a place', () => {
    const paths = [line(100, 400, 5)]
    expect(pebbleAt(paths, 143, 406)).toEqual({ path: 0, index: 2 })
    expect(pebbleAt(paths, 143, 460)).toBeNull()
    expect(leadsTo(paths, { x: 200, y: 420 })).toBe(true)
    expect(leadsTo(paths, { x: 300, y: 400 })).toBe(false)
    expect(countPoints([line(0, 0, 3), line(0, 100, 4)])).toBe(7)
  })
})

describe('the way over the pebbles', () => {
  it('goes from one end of a path to the other, and over a second path that touches the first', () => {
    const paths = [line(100, 400, 6), [{ x: 220, y: 400 }, { x: 240, y: 420 }, { x: 240, y: 440 }]]
    const way = route(paths, (p) => p.x === 100, (p) => p.y === 440)
    expect(way![0]).toEqual({ x: 100, y: 400 })
    expect(way![way!.length - 1]).toEqual({ x: 240, y: 440 })
    expect(way!.length).toBe(9)
  })

  it('finds no way across a gap', () => {
    const paths = [line(100, 400, 3), line(200, 400, 3)]
    expect(route(paths, (p) => p.x === 100, (p) => p.x === 240)).toBeNull()
    expect(graphOf(paths).nodes.length).toBe(6)
  })

  it('walks a path to its other end', () => {
    const way = wayToEnd([line(100, 400, 6)], { x: 104, y: 410 })
    expect(way![way!.length - 1]).toEqual({ x: 200, y: 400 })
    expect(wayToEnd([line(100, 400, 6)], { x: 500, y: 100 })).toBeNull()
  })

  it('measures a way and finds the point a share along it', () => {
    const way = line(0, 0, 5)
    expect(lengthOf(way)).toBe(80)
    expect(along(way, 0.5)).toEqual({ x: 40, y: 0 })
    expect(along(way, 2)).toEqual({ x: 80, y: 0 })
  })
})

describe('loops and meetings', () => {
  it('finds a loop a gnome can go round, and the way to it', () => {
    const paths = [line(100, 400, 4), square(160, 400, 4)]
    const loop = loopFrom(paths, { x: 100, y: 400 })
    expect(loop).not.toBeNull()
    expect(loop!.round.length).toBeGreaterThanOrEqual(12)
    expect(loop!.round[0]).toEqual(loop!.round[loop!.round.length - 1])
    expect(loop!.to[0]).toEqual({ x: 100, y: 400 })
  })

  it('takes neither a straight path nor two rows of pebbles side by side for a loop', () => {
    expect(loopFrom([line(100, 400, 12)], { x: 100, y: 400 })).toBeNull()
    expect(loopFrom([line(100, 400, 3), line(100, 420, 3)], { x: 100, y: 400 })).toBeNull()
  })

  it('names the point two strokes share as their meeting, and nothing on a stroke alone', () => {
    const first = line(100, 400, 5)
    expect(meetings([first])).toEqual([])
    expect(meetings([first, [{ x: 140, y: 400 }, { x: 140, y: 420 }]])).toEqual([{ x: 140, y: 400 }])
    expect(meetings([[...first, { x: 180, y: 420 }, { x: 160, y: 420 }, { x: 140, y: 400 }]])).toEqual([{ x: 140, y: 400 }])
  })
})
