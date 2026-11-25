import { describe, expect, it } from 'vitest'
import { digAlong } from './build'
import { kingdom } from './chambers'
import { EARTH, MOUTH, OPEN, at, clone, equal, fromPicture, generate, put, settle } from './ground'
import { WEDGED, demoDrag, queenSeat, workerSpots } from './residents'

function nest() {
  // Plain earth from turf to bedrock, a shaft, a room of seven by three on its right and one of five by three on its left.
  const ground = generate(1)
  for (let y = 1; y < ground.rows - 1; y++) for (let x = 0; x < ground.cols; x++) put(ground, x, y, EARTH)
  for (let y = 1; y <= 9; y++) for (const x of MOUTH) put(ground, x, y, OPEN)
  for (let y = 4; y <= 6; y++) for (let x = 24; x <= 30; x++) put(ground, x, y, OPEN)
  for (let y = 7; y <= 9; y++) for (let x = 10; x <= 14; x++) put(ground, x, y, OPEN)
  // Each is joined to the shaft by a tunnel two cells high, so the shaft is no part of either room.
  for (const y of [5, 6]) for (const x of [22, 23]) put(ground, x, y, OPEN)
  for (const y of [8, 9]) for (let x = 15; x <= 18; x++) put(ground, x, y, OPEN)
  settle(ground)
  return ground
}

describe('where the kingdom stands', () => {
  it('has the queen wedged under the mouth while there is no chamber', () => {
    const ground = generate(1)
    const realm = kingdom(ground)
    expect(queenSeat(ground, realm.chambers, realm.queenRoom)).toBeNull()
    expect(at(ground, Math.floor(WEDGED.x), WEDGED.y)).toBe(OPEN)
    // The walls of the shaft hold her, and the cell under her is free for the ant.
    expect(at(ground, MOUTH[0] - 1, WEDGED.y)).toBe(EARTH)
    expect(at(ground, MOUTH[MOUTH.length - 1] + 1, WEDGED.y)).toBe(EARTH)
    expect(at(ground, Math.floor(WEDGED.x), WEDGED.y + 1)).toBe(OPEN)
  })

  it('seats the queen on the floor of the largest chamber, and stands the workers where the floors have room', () => {
    const ground = nest()
    const realm = kingdom(ground)
    expect(realm.chambers.length).toBe(2)
    const seat = queenSeat(ground, realm.chambers, realm.queenRoom)!
    const spots = workerSpots(ground, realm.chambers, realm.queenRoom, realm.workers)
    // Her room is seven cells wide: she takes over four of them and no worker fits beside her. The other is five wide and has one.
    expect(spots.length).toBe(1)
    for (const place of [seat, ...spots]) {
      expect(at(ground, Math.floor(place.x), place.y), `${place.x},${place.y}`).toBe(OPEN)
      expect(at(ground, Math.floor(place.x), place.y + 1)).not.toBe(OPEN)
    }
    expect(realm.chambers[realm.queenRoom!].cells).toContain(seat.y * ground.cols + Math.floor(seat.x))
    // Her room lies to the right of the mouth, so she sits at its right end, the end further from the mouth.
    expect(seat.x - 2.2).toBeGreaterThanOrEqual(24)
    expect(seat.x + 2.2).toBeCloseTo(31, 6)
    expect(spots[0].x - 1.5).toBeGreaterThanOrEqual(10)
    expect(spots[0].x + 1.5).toBeLessThanOrEqual(15)
  })

  it('stands two workers in a long room, one at each end, and one beside the queen where her room is long enough', () => {
    const ground = nest()
    for (let y = 4; y <= 6; y++) for (let x = 31; x <= 35; x++) put(ground, x, y, OPEN)
    for (let y = 7; y <= 9; y++) for (let x = 4; x <= 9; x++) put(ground, x, y, OPEN)
    const realm = kingdom(ground)
    const seat = queenSeat(ground, realm.chambers, realm.queenRoom)!
    const spots = workerSpots(ground, realm.chambers, realm.queenRoom, realm.workers)
    expect(spots.length).toBe(4)
    const beside = spots.filter((s) => s.y === seat.y)
    expect(beside.length).toBe(2)
    for (const spot of beside) expect(Math.abs(spot.x - seat.x)).toBeGreaterThanOrEqual(2.2 + 1.5 - 1e-9)
    const others = spots.filter((s) => s.y !== seat.y).sort((a, b) => a.x - b.x)
    expect(others[1].x - others[0].x).toBeGreaterThanOrEqual(3)
  })

  it('seats the queen in the middle of a floor shorter than she is wide, drawn small enough to stand in nothing', () => {
    const ground = nest()
    // A pit under the right of her room leaves her four cells of floor.
    for (const x of [28, 29, 30]) put(ground, x, 7, OPEN)
    const realm = kingdom(ground)
    const seat = queenSeat(ground, realm.chambers, realm.queenRoom)!
    expect(seat.fit).toBeLessThan(1)
    const half = 2.2 * seat.fit
    for (let x = Math.floor(seat.x - half + 0.01); x <= Math.floor(seat.x + half - 0.01); x++) expect(at(ground, x, seat.y)).toBe(OPEN)
  })

  it('stands nobody when the count of workers is nought', () => {
    const ground = nest()
    const realm = kingdom(ground)
    expect(workerSpots(ground, realm.chambers, realm.queenRoom, 0)).toEqual([])
  })
})

describe('the one drag the ghost hand may show', () => {
  it('goes through plain earth only, beside the ant, and digging it touches nothing built', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const ground = generate(seed)
      const ant = { x: MOUTH[1], y: 3 }
      const drag = demoDrag(ground, ant)!
      expect(drag, `seed ${seed}`).not.toBeNull()
      expect(Math.hypot(drag.from.x - ant.x, drag.from.y - ant.y)).toBeLessThan(9)
      const dug = clone(ground)
      const answer = digAlong(dug, drag.from.x, drag.from.y, drag.to.x, drag.to.y)
      expect(answer.met).toEqual([])
      expect(answer.dug.length).toBeGreaterThan(4)
      settle(dug)
      // Nothing fell: the only cells that differ are the ones the drag opened.
      const again = clone(ground)
      for (const i of answer.dug) again.cells[i] = OPEN
      expect(equal(dug, again)).toBe(true)
    }
  })

  it('is not offered where there is no plain earth to show it in', () => {
    const ground = fromPicture(['X.X', 'o.o', 'o.o', 'o.o', 'XXX'])
    expect(demoDrag(ground, { x: 1, y: 2 })).toBeNull()
  })
})
