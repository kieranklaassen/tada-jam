import { describe, expect, it } from 'vitest'
import {
  computeLayout,
  connected,
  findPath,
  isPerspectiveStep,
  isWalkable,
  nearestReachable,
  pivotIsValid,
  resolveRoom,
  rotateQuarter,
  stepArrangement,
  tileId,
  transformNormal,
  UP,
  visibleFrom,
  type CellDef,
  type RoomDef,
  type TurnDef,
  type Vec3,
} from './world'

const path = (x: number, y: number, z: number): CellDef => ({ at: [x, y, z], paths: [UP] })
const block = (x: number, y: number, z: number): CellDef => ({ at: [x, y, z] })

function room(cells: CellDef[], groups: RoomDef['groups'] = [], start: Vec3 = cells[0].at, door: Vec3 = cells[cells.length - 1].at): RoomDef {
  return { key: 'test', cells, groups, start, door }
}

describe('quarter turns', () => {
  it('match the three.js rotation matrices', () => {
    expect(rotateQuarter('y', 1, [1, 0, 0])).toEqual([0, 0, -1])
    expect(rotateQuarter('x', 1, [0, 1, 0])).toEqual([0, 0, 1])
    expect(rotateQuarter('z', 1, [1, 0, 0])).toEqual([0, 1, 0])
    expect(rotateQuarter('y', 4, [1, 2, 3])).toEqual([1, 2, 3])
    expect(rotateQuarter('y', -1, [1, 0, 0])).toEqual(rotateQuarter('y', 3, [1, 0, 0]))
  })

  it('turn normals with the group', () => {
    const drawbridge: TurnDef = { kind: 'turn', axis: 'x', pivot: [0, 1.5, 2.5], cells: [], start: 0, handle: [0, 0, 0] }
    expect(transformNormal(drawbridge, 1, [0, 0, -1])).toEqual([0, 1, 0])
  })

  it('only accept pivots on cell centres or corners', () => {
    const turn = (pivot: Vec3): TurnDef => ({ kind: 'turn', axis: 'y', pivot, cells: [], start: 0, handle: [0, 0, 0] })
    expect(pivotIsValid(turn([3.5, 9, 2.5]))).toBe(true)
    expect(pivotIsValid(turn([3, 9, 2]))).toBe(true)
    expect(pivotIsValid(turn([3.5, 9, 2]))).toBe(false)
  })
})

describe('walkable tops', () => {
  it('a covered top is not walkable', () => {
    const r = resolveRoom(room([path(0, 0, 0), block(0, 1, 0), path(1, 0, 0)], [], [1, 0, 0], [1, 0, 0]))
    const layout = computeLayout(r, [])
    expect(isWalkable(layout, tileId(0, UP))).toBe(false)
    expect(isWalkable(layout, tileId(2, UP))).toBe(true)
  })

  it('only faces marked as paths are walkable', () => {
    const r = resolveRoom(room([block(0, 0, 0), path(1, 0, 0)], [], [1, 0, 0], [1, 0, 0]))
    expect(computeLayout(r, []).tiles.map((t) => t.cell)).toEqual([1])
  })
})

describe('joins', () => {
  it('same-height neighbours join for real', () => {
    const r = resolveRoom(room([path(0, 0, 0), path(1, 0, 0), path(1, 0, 1)]))
    const layout = computeLayout(r, [])
    expect(connected(layout, tileId(0, UP), tileId(2, UP))).toBe(true)
    expect(isPerspectiveStep(layout, tileId(0, UP), tileId(1, UP))).toBe(false)
  })

  it('a nearer, higher top that touches on screen joins by perspective', () => {
    // Low end at (2,1,3), key (1,2); high tile at (6,4,6), key (2,2), three steps nearer the camera.
    const r = resolveRoom(room([path(2, 1, 3), path(6, 4, 6)]))
    const layout = computeLayout(r, [])
    expect(connected(layout, tileId(0, UP), tileId(1, UP))).toBe(true)
    expect(isPerspectiveStep(layout, tileId(0, UP), tileId(1, UP))).toBe(true)
  })

  it('a nearer top that is lower does not join (the far wall hides the seam)', () => {
    const r = resolveRoom(room([path(5, 4, 6), path(3, 1, 3)]))
    expect(connected(computeLayout(r, []), tileId(0, UP), tileId(1, UP))).toBe(false)
  })

  it('a seam hidden behind a block does not join', () => {
    const hidden = resolveRoom(room([path(2, 1, 3), path(6, 4, 6), block(4, 3, 5)]))
    expect(connected(computeLayout(hidden, []), tileId(0, UP), tileId(1, UP))).toBe(false)
  })

  it('tops two steps apart on screen do not join', () => {
    const r = resolveRoom(room([path(0, 0, 0), path(2, 0, 0)]))
    expect(connected(computeLayout(r, []), tileId(0, UP), tileId(1, UP))).toBe(false)
  })
})

describe('visibility', () => {
  it('a block along +(1,1,1) hides a point', () => {
    const solid = new Set<number>()
    const r = resolveRoom(room([path(0, 0, 0), block(1, 1, 1)]))
    const layout = computeLayout(r, [])
    for (const s of layout.solid) solid.add(s)
    expect(visibleFrom(solid, layout.bounds.max, 0.5, 1, 0.5)).toBe(false)
    expect(visibleFrom(new Set(), [5, 5, 5], 0.5, 1, 0.5)).toBe(true)
  })
})

describe('paths', () => {
  const turntable: TurnDef = {
    kind: 'turn',
    axis: 'y',
    pivot: [3.5, 0, 0.5],
    cells: [path(2, 0, 0), path(3, 0, 0), path(4, 0, 0)],
    start: 1,
    handle: [3.5, 0.6, 0.5],
  }
  const r = resolveRoom(room([path(0, 0, 0), path(1, 0, 0), path(5, 0, 0), path(6, 0, 0)], [turntable], [0, 0, 0], [6, 0, 0]))

  it('a turned bridge connects the ledges only when it lines up', () => {
    expect(connected(computeLayout(r, [1]), r.startTile, r.doorTile)).toBe(false)
    expect(connected(computeLayout(r, [0]), r.startTile, r.doorTile)).toBe(true)
    expect(connected(computeLayout(r, [2]), r.startTile, r.doorTile)).toBe(true)
  })

  it('finds the shortest path', () => {
    const route = findPath(computeLayout(r, [0]), r.startTile, r.doorTile)
    expect(route?.length).toBe(7)
    expect(route?.[0]).toBe(r.startTile)
    expect(route?.[6]).toBe(r.doorTile)
  })

  it('walks as near as it can when the target is unreachable', () => {
    const layout = computeLayout(r, [1])
    expect(nearestReachable(layout, r.startTile, [6.5, 1, 0.5])).toBe(tileId(1, UP))
  })

  it('turns wrap and slides stop at their ends', () => {
    expect(stepArrangement(r, [3], 0, 1)).toEqual([0])
  })
})
