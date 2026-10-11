import { describe, expect, it } from 'vitest'
import { LUMPS, MUD, OPEN, SAND, STONE, at, count, fromPicture, settle } from './ground'
import { LOB, SAND_CARRIES, arrivalPlace, canStand, cellsOf, fireInNest, machineAt, nearestStand, shotPath } from './machines'
import type { Machine } from './save'

const hall = ['XXXXXXXXXXXXXXXX', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '################', 'XXXXXXXXXXXXXXXX']
const machine = (kind: Machine['kind'], x: number, y: number, facing: -1 | 1 = 1, load: Machine['load'] = 'stone'): Machine => ({ kind, x, y, facing, load })
const xy = (cells: number[], cols = 16) => cells.map((cell) => [cell % cols, Math.floor(cell / cols)])

describe('where a machine stands', () => {
  it('on a floor two cells wide with two cells clear over it', () => {
    const ground = fromPicture(['XXXXXXXX', '#......#', '#...#..#', '#.o....#', '###.####', 'XXXXXXXX'])
    expect(canStand(ground, [], 5, 3)).toBe(true)
    // A lump in one of its four cells, no floor under one side, a roof too low.
    expect(canStand(ground, [], 1, 3)).toBe(false)
    expect(canStand(ground, [], 2, 3)).toBe(false)
    expect(canStand(ground, [], 3, 3)).toBe(false)
    expect(canStand(ground, [], 5, 2)).toBe(false)
  })

  it('never in the top rows, at an edge, or in another machine', () => {
    const ground = fromPicture(hall)
    expect(canStand(ground, [], 3, 1)).toBe(false)
    expect(canStand(ground, [], 14, 5)).toBe(false)
    const cannon = machine('cannon', 6, 5)
    expect(canStand(ground, [cannon], 7, 5)).toBe(false)
    expect(canStand(ground, [cannon], 5, 5)).toBe(false)
    expect(canStand(ground, [cannon], 8, 5)).toBe(true)
    // The machine being moved does not stand in its own way.
    expect(canStand(ground, [cannon], 7, 5, 0)).toBe(true)
  })

  it('is found by any of its four cells', () => {
    const list = [machine('catapult', 3, 5), machine('cannon', 8, 5)]
    expect(cellsOf(list[0], 16).sort((a, b) => a - b)).toEqual([4 * 16 + 3, 4 * 16 + 4, 5 * 16 + 3, 5 * 16 + 4])
    expect([machineAt(list, 3, 5), machineAt(list, 4, 4), machineAt(list, 9, 4), machineAt(list, 5, 5), machineAt(list, 3, 3)]).toEqual([0, 0, 1, -1, -1])
  })

  it('is brought to the place nearest the foot of the shaft where it can stand', () => {
    const picture = ['XXXXXXXXXXXXXXXXXXX...XXXXXXXXXXXXXXXXXX', ...Array.from({ length: 3 }, () => '#'.repeat(19) + '...' + '#'.repeat(18)), '#'.repeat(40), 'X'.repeat(40)]
    const ground = fromPicture(picture)
    const place = arrivalPlace(ground, [])!
    expect(canStand(ground, [], place.x, place.y)).toBe(true)
    expect(place.y).toBe(3)
    expect(nearestStand(fromPicture(['XXXX', '#..#', 'XXXX']), [], 1, 1)).toBeNull()
  })
})

describe('a shot', () => {
  it('from the cannon goes level along the floor it stands on as far as the way is open', () => {
    const ground = fromPicture(hall)
    expect(xy(shotPath(ground, machine('cannon', 2, 5)))).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((x) => [x, 5]))
    expect(xy(shotPath(ground, machine('cannon', 8, 5, -1)))).toEqual([7, 6, 5, 4, 3, 2, 1].map((x) => [x, 5]))
  })

  it('of sand from the cannon is short', () => {
    expect(shotPath(fromPicture(hall), machine('cannon', 2, 5, 1, 'sand')).length).toBe(SAND_CARRIES)
  })

  it('from the cannon stops at the first thing in its way', () => {
    const picture = hall.slice()
    picture[5] = '#......o.......#'
    expect(xy(shotPath(fromPicture(picture), machine('cannon', 2, 5)))).toEqual([[4, 5], [5, 5], [6, 5]])
    picture[5] = '#...o..........#'
    expect(shotPath(fromPicture(picture), machine('cannon', 2, 5))).toEqual([])
  })

  it('from the catapult rises three cells, comes down six along, and falls on', () => {
    const path = xy(shotPath(fromPicture(hall), machine('catapult', 2, 5)))
    const top = Math.min(...path.map(([, y]) => y))
    expect(4 - top).toBe(LOB.up)
    // Six along from the middle of the machine it is back at the height it left at, and lands on the floor beyond.
    expect(path).toContainEqual([3 + LOB.along, 4])
    expect(path[path.length - 1][1]).toBe(5)
    expect(path[path.length - 1][0]).toBeGreaterThan(3 + LOB.along - 1)
    for (let n = 1; n < path.length; n++) expect(Math.abs(path[n][0] - path[n - 1][0]) + Math.abs(path[n][1] - path[n - 1][1])).toBeLessThanOrEqual(2)
  })

  it('from the catapult goes over a wall a cannon cannot pass', () => {
    const picture = hall.slice()
    picture[4] = '#.....o........#'
    picture[5] = '#.....o........#'
    const ground = fromPicture(picture)
    const lob = xy(shotPath(ground, machine('catapult', 2, 5)))
    expect(Math.max(...lob.map(([x]) => x))).toBeGreaterThan(6)
    expect(Math.max(...xy(shotPath(ground, machine('cannon', 2, 5))).map(([x]) => x))).toBeLessThan(6)
  })

  it('from the catapult under a low roof hits the roof and drops short', () => {
    const low = ['XXXXXXXXXXXXXXXX', '################', '################', '################', '#..............#', '#..............#', '################', 'XXXXXXXXXXXXXXXX']
    const path = xy(shotPath(fromPicture(low), machine('catapult', 2, 5)))
    // One cell on from the machine, at the roof and then on the floor.
    expect(path).toEqual([[4, 4], [4, 5]])
    expect(Math.max(...path.map(([x]) => x))).toBeLessThan(3 + LOB.along)
  })
})

describe('firing in the nest', () => {
  it('really throws the lump: it lies where it landed and the machine is empty', () => {
    const ground = fromPicture(hall)
    const cannon = machine('cannon', 2, 5, 1, 'mud')
    const fired = fireInNest(ground, cannon)!
    expect(fired.shot).toBe('mud')
    expect(cannon.load).toBeNull()
    settle(ground)
    expect(count(ground, MUD)).toBe(1)
    expect(at(ground, 14, 5)).toBe(MUD)
    expect(fireInNest(ground, cannon)).toBeNull()
  })

  it('lets sand and a stone fall where they land, and mud stick', () => {
    for (const [load, kind] of [['sand', SAND], ['stone', STONE]] as const) {
      const ground = fromPicture(hall)
      fireInNest(ground, machine('catapult', 2, 5, 1, load))
      settle(ground)
      expect(count(ground, kind)).toBe(1)
      expect(LUMPS.reduce((sum, lump) => sum + count(ground, lump), 0)).toBe(1)
      const row5 = [...Array(16).keys()].filter((x) => at(ground, x, 5) === kind)
      expect(row5.length).toBe(1)
    }
  })

  it('changes nothing where the shot has nowhere to go', () => {
    const picture = hall.slice()
    picture[5] = '#...o..........#'
    const ground = fromPicture(picture)
    const cannon = machine('cannon', 2, 5, 1, 'stone')
    expect(fireInNest(ground, cannon)).toBeNull()
    expect(cannon.load).toBe('stone')
    expect(at(ground, 5, 5)).toBe(OPEN)
  })
})
