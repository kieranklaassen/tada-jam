import { describe, expect, it } from 'vitest'
import { cut } from './face'
import { freshFort } from './fortState'
import { REACH, handAt, roomiest, windowAt, type HandAt } from './guide'
import { FRONT_Z, SCISSORS_REST, faceAt, kindOf } from './layout'

describe('the ghost hand', () => {
  it('starts at the scissors and goes once round a loop that stays on the face of a box', () => {
    const state = freshFort(null), out = {} as HandAt
    const standing = [{ id: 0, x: state.boxes[0].x / 100, foot: 0 }, { id: 3, x: state.boxes[3].x / 100, foot: 0 }]
    expect(handAt(state, 0, out)!.at).toEqual(SCISSORS_REST)
    for (let travel = REACH; travel <= 1; travel += 0.05) {
      const hand = handAt(state, travel, out)!
      expect(faceAt({ ...hand.at, z: FRONT_Z }, standing)?.id).toBe(0)
    }
    const end = handAt(state, 1, out)!
    expect(end.round).toBeCloseTo(1, 6)
    expect(end.at.x).toBeCloseTo(end.centre.x + end.radius, 6)
  })

  it('draws a closed window with four soft corners: a shape no child could take for a letter', () => {
    const centre = { x: 0, y: 1, z: FRONT_Z }, at = (round: number) => windowAt(centre, 0.4, round, { x: 0, y: 0, z: 0 })
    // It ends where it began.
    expect(at(1).x).toBeCloseTo(at(0).x, 6)
    expect(at(1).y).toBeCloseTo(at(0).y, 6)
    // It is squarer than a ring: further out at each corner than along each side, the same way on all four.
    const far = (round: number): number => Math.hypot(at(round).x - centre.x, (at(round).y - centre.y) / 0.86)
    for (const corner of [0.125, 0.375, 0.625, 0.875]) expect(far(corner)).toBeGreaterThan(far(corner - 0.125) * 1.15)
    // And it has no gap, no tail and no crossing: every step along it is a short one.
    for (let i = 0; i < 80; i++) expect(Math.hypot(at((i + 1) / 80).x - at(i / 80).x, at((i + 1) / 80).y - at(i / 80).y)).toBeLessThan(0.13)
  })

  it('shows the box with the most board left, and nothing when no face has room', () => {
    const state = freshFort(null)
    expect(roomiest(state)).toBe(0)
    const all = (id: number): void => { const kind = kindOf(id); cut(state.boxes[id].face, [{ x: 2, y: 2 }, { x: kind.cols - 3, y: 2 }, { x: kind.cols - 3, y: kind.rows - 3 }, { x: 2, y: kind.rows - 3 }]) }
    all(0)
    expect(roomiest(state)).toBe(3)
    all(3)
    expect(roomiest(state)).toBeNull()
    expect(handAt(state, 0.5, {} as HandAt)).toBeNull()
  })
})
