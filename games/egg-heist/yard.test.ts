import { describe, expect, it } from 'vitest'
import { CORNER } from './overlay'
import { STAGE } from './stage'
import {
  BUSHES, BUSH_COVERS, DOOR, FLOOR, HOME, LANE_ENDS, LAST_ROW, PLACES, PLACE_IDS, ROUND, ROWS, SIGHT, SIGHT_OPENS, STAND_CLEAR, START, THINGS, THING_GAP,
  bushAt, clampToRow, freeSpot, gazeShape, gooseAt, inGaze, inRect, rowAt, stretchOf, type Spot,
} from './yard'

/** The round home control the jam lays over every game: 48 across, at the top centre, 10 from the top. */
const HOME_CONTROL = { x: STAGE.width / 2 - 24, y: 10, w: 48, h: 48 }
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('the yard as it stands', () => {
  it('reads a tap a little above a groove as that groove', () => {
    ROWS.forEach((y, row) => {
      expect(rowAt(y - 34)).toBe(row)
      expect(rowAt(y - 10)).toBe(row)
    })
  })

  it('keeps a figure out of the pond, which lies across the front groove', () => {
    expect(clampToRow(3, 440)).not.toBe(440)
    expect(stretchOf(3, 200)).not.toBe(stretchOf(3, 700))
    expect(clampToRow(1, 440)).toBe(440)
  })

  it('has nothing a child can tap under the home control or in the grown-up corner', () => {
    const corner = { x: STAGE.width - CORNER, y: 0, w: CORNER, h: CORNER }
    for (const id of PLACE_IDS) {
      expect(overlaps(PLACES[id].hit, HOME_CONTROL), id).toBe(false)
      expect(overlaps(PLACES[id].hit, corner), id).toBe(false)
    }
    expect(overlaps(DOOR, HOME_CONTROL)).toBe(false)
    expect(overlaps(DOOR, corner)).toBe(false)
    expect(FLOOR.top).toBeGreaterThan(HOME_CONTROL.y + HOME_CONTROL.h)
  })

  it('gives every place, the door and every thing a target of 48 or more', () => {
    for (const id of PLACE_IDS) {
      expect(PLACES[id].hit.w).toBeGreaterThanOrEqual(48)
      expect(PLACES[id].hit.h).toBeGreaterThanOrEqual(48)
    }
    expect(Math.min(DOOR.w, DOOR.h)).toBeGreaterThanOrEqual(48)
  })

  it('has places that do not claim the same tap, and a spot to stand at that a figure can reach', () => {
    for (const a of PLACE_IDS) for (const b of PLACE_IDS) if (a < b) expect(overlaps(PLACES[a].hit, PLACES[b].hit), `${a} and ${b}`).toBe(false)
    for (const id of PLACE_IDS) {
      expect(overlaps(PLACES[id].hit, DOOR), id).toBe(false)
      const stand = PLACES[id].stand
      expect(clampToRow(stand.row, stand.x)).toBe(stand.x)
      expect(bushAt(stand.x, stand.row)).toBe(-1)
    }
  })

  it('starts every thing on a free spot, clear of the bushes and of each other', () => {
    const lying: Spot[] = []
    for (const id of THINGS) {
      const loc = START[id]
      if (loc.at !== 'floor') continue
      expect(freeSpot(loc.x, loc.row, lying), id).toEqual({ x: loc.x, row: loc.row })
      lying.push({ x: loc.x, row: loc.row })
    }
    expect(bushAt(HOME.x, HOME.row)).toBe(0)
  })
})

describe('laying a thing down', () => {
  it('never lays it on a bush, on the spot the raccoon stands at to reach a place, on an end of the goose\'s lanes, on another thing or off the floor', () => {
    let s = 7
    const next = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
    for (let round = 0; round < 60; round++) {
      const lying: Spot[] = []
      for (let i = 0; i < THINGS.length; i++) {
        const spot = freeSpot(40 + next() * 1100, Math.floor(next() * (LAST_ROW + 1)), lying)
        expect(clampToRow(spot.row, spot.x)).toBe(spot.x)
        for (const bush of BUSHES) if (bush.row === spot.row) expect(Math.abs(bush.x - spot.x)).toBeGreaterThanOrEqual(BUSH_COVERS)
        if (spot.row === 1 || spot.row === 2) for (const end of [LANE_ENDS.from, LANE_ENDS.to]) expect(Math.abs(end - spot.x)).toBeGreaterThanOrEqual(44)
        for (const id of PLACE_IDS) if (PLACES[id].stand.row === spot.row) expect(Math.abs(PLACES[id].stand.x - spot.x)).toBeGreaterThanOrEqual(STAND_CLEAR)
        for (const other of lying) if (other.row === spot.row) expect(Math.abs(other.x - spot.x)).toBeGreaterThanOrEqual(THING_GAP)
        expect(spot.x).toBeGreaterThan(FLOOR.left + 40)
        expect(spot.x).toBeLessThan(FLOOR.right - 40)
        lying.push(spot)
      }
    }
  })
})

describe('the goose', () => {
  it('walks a round that closes on itself, each leg starting where the last ended', () => {
    ROUND.forEach((leg, i) => {
      const next = ROUND[(i + 1) % ROUND.length]
      expect(gooseAt(i, 1).x).toBeCloseTo(gooseAt((i + 1) % ROUND.length, 0).x)
      expect(leg.to).toEqual(next.from)
      expect(leg.faceTo).toBe(next.faceFrom)
    })
  })

  it('never walks through a bush, or over a thing as the farmer lays it out: her lanes lie clear of them all', () => {
    for (let leg = 0; leg < ROUND.length; leg++) {
      for (let k = 0; k <= 20; k++) {
        const at = gooseAt(leg, k / 20)
        for (const bush of BUSHES) if (bush.row === at.row) expect(Math.abs(bush.x - at.x)).toBeGreaterThan(140)
        for (const id of THINGS) { const loc = START[id]; if (loc.at === 'floor' && loc.row === at.row) expect(Math.abs(loc.x - at.x), id).toBeGreaterThan(80) }
      }
    }
  })

  it('sees in front of her only: along her own groove from her beak, and in the grooves beside it once the gaze has opened', () => {
    expect(inGaze(600, 1, 1, 700, 1)).toBe(true)
    expect(inGaze(600, 1, 1, 500, 1)).toBe(false)
    expect(inGaze(600, 1, -1, 500, 1)).toBe(true)
    // The wedge ends in a blunt point a little past her sight in her own groove, and opens on a slant.
    expect(inGaze(600, 1, 1, 600 + SIGHT + 16, 1)).toBe(false)
    expect(inGaze(600, 1, 1, 600 + SIGHT_OPENS - 30, 2)).toBe(false)
    expect(inGaze(600, 1, 1, 600 + SIGHT_OPENS + 1, 2)).toBe(true)
    expect(inGaze(600, 1, 1, 800, 0)).toBe(true)
    expect(inGaze(600, 1, 1, 800, 3)).toBe(false)
  })

  it('is drawn the gaze she has: the wedge on the floor covers what she sees and stops where her sight stops', () => {
    for (const face of [1, -1] as const) {
      for (const grow of [1, 2]) {
        const shape = gazeShape(600, ROWS[grow], grow, face)
        const xs = shape.map((p) => p.x), ys = shape.map((p) => p.y)
        const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
        // Every groove she sees along lies inside the wedge at the far end, and the groove beyond does not.
        for (let row = 0; row <= LAST_ROW; row++) {
          const seen = inGaze(600, grow, face, 600 + face * (SIGHT - 20), row)
          expect(inRect(600 + face * (SIGHT - 20), ROWS[row] - 20, box), `groove ${row} from ${grow}`).toBe(seen)
        }
        expect(box.w).toBeLessThan(SIGHT + 20)
      }
    }
  })
})
