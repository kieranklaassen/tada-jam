import { describe, expect, it } from 'vitest'
import { BASKET_BOX, aimAt, hitBox, hitLevel, nearestBox, placeNear, type Box, type Ray } from './aim'
import { COLS, ROWS, heights } from './blocks'
import { BASKET, cameraFor, placeX, placeZ } from './layout'

const down = (x: number, z: number): Ray => ({ origin: [x, 12, z], dir: [0, -1, 0] })
const bare = heights([])

/** The ray from the camera of the design frame through a point of the room. */
function toward(x: number, y: number, z: number): Ray {
  const eye = cameraFor(1180 / 820).position
  const d = [x - eye[0], y - eye[1], z - eye[2]]
  const long = Math.hypot(d[0], d[1], d[2])
  return { origin: eye, dir: [d[0] / long, d[1] / long, d[2] / long] }
}

describe('rays', () => {
  const box: Box = { min: [0, 0, 0], max: [1, 2, 1] }

  it('enter a box at the near face, or miss', () => {
    expect(hitBox({ origin: [0.5, 5, 0.5], dir: [0, -1, 0] }, box)).toBeCloseTo(3)
    expect(hitBox({ origin: [3, 5, 0.5], dir: [0, -1, 0] }, box)).toBeNull()
    expect(hitBox({ origin: [0.5, 5, 0.5], dir: [0, 1, 0] }, box)).toBeNull()
  })

  it('meet a level in front of them only', () => {
    expect(hitLevel({ origin: [1, 4, 2], dir: [0, -1, 0] }, 1)).toEqual([1, 1, 2])
    expect(hitLevel({ origin: [1, 4, 2], dir: [0, 1, 0] }, 1)).toBeNull()
    expect(hitLevel({ origin: [1, 4, 2], dir: [1, 0, 0] }, 1)).toBeNull()
  })

  it('choose the nearest of several boxes', () => {
    const far: Box = { min: [0, -4, 0], max: [1, -3, 1] }
    expect(nearestBox({ origin: [0.5, 5, 0.5], dir: [0, -1, 0] }, [far, box])).toMatchObject({ index: 1 })
    expect(nearestBox({ origin: [9, 5, 9], dir: [0, -1, 0] }, [far, box])).toBeNull()
  })
})

describe('where a carried block is aimed', () => {
  it('is the place of the rug under the finger', () => {
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) expect(aimAt(down(placeX(col), placeZ(row)), bare)).toEqual({ over: 'rug', col, row })
  })

  it('is the nearest place when the finger is off the rug', () => {
    expect(placeNear(-40, -40)).toEqual({ col: 0, row: 0 })
    expect(placeNear(40, 40)).toEqual({ col: COLS - 1, row: ROWS - 1 })
    expect(aimAt(down(-9, 0), bare)).toEqual({ over: 'rug', col: 0, row: 1 })
    // A ray that never reaches the floor still gives a place.
    expect(aimAt({ origin: [0, 5, 0], dir: [0, 1, 0] }, bare).over).toBe('rug')
  })

  it('is the basket over the basket', () => {
    expect(aimAt(down(BASKET.x, BASKET.z), bare)).toEqual({ over: 'basket' })
    expect(BASKET_BOX.min[0]).toBeGreaterThan(placeX(COLS - 1) + 0.5)
  })

  it('is the tower when the finger is on the side of a tower', () => {
    const tower = heights([{ kind: 'round', col: 3, row: 1 }, { kind: 'round', col: 3, row: 1 }])
    // From the camera, a point on the front of the tower two units up lies over the rug behind it.
    const ray = toward(placeX(3), 2, placeZ(1) + 0.5)
    const behind = hitLevel(ray, 0)!
    expect(placeNear(behind[0], behind[2])).not.toEqual({ col: 3, row: 1 })
    expect(aimAt(ray, tower)).toEqual({ over: 'rug', col: 3, row: 1 })
  })
})
