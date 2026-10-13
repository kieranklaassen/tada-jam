import { describe, expect, it } from 'vitest'
import { BOX, BOX_MOUTH, CAT, EDGE, FIELD, HOME_CONTROL, HOME_KEEP_OUT, HOME_ORDER, HOME_PLACE, OUT_PLACE, ROLLS, ROLL_RADIUS, RUG_TOP, SKIRTING, STARTER, TAPE_WIDTH, TOY_IDS, TOY_SIZE, clampToField, inBox, inField, nearHomeControl, onCat, rollAt } from './layout'
import { CORNER } from './overlay'
import { STAGE } from './stage'
import { nearestOn } from './tape'

// The distances a small hand needs, held as numbers: what a three-year-old
// taps is about 100 across with room between, nothing that answers lies
// under the grown-ups' two places, and everything stands on the stage.

describe('the rolls', () => {
  it('are about 100 across and stand 130 apart, the size and the room a three-year-old\'s tap needs', () => {
    expect(ROLL_RADIUS * 2).toBeGreaterThanOrEqual(100)
    expect(ROLLS).toHaveLength(4)
    for (let k = 1; k < ROLLS.length; k++) expect(Math.hypot(ROLLS[k].x - ROLLS[k - 1].x, ROLLS[k].y - ROLLS[k - 1].y)).toBeGreaterThanOrEqual(130)
  })

  it('stand on the stage, clear of the bottom strip where a resting palm lands, of the floor the tape goes on, and of the home control', () => {
    for (const roll of ROLLS) {
      expect(roll.x + ROLL_RADIUS).toBeLessThanOrEqual(STAGE.width)
      expect(roll.y - ROLL_RADIUS).toBeGreaterThanOrEqual(SKIRTING)
      expect(roll.y + ROLL_RADIUS).toBeLessThanOrEqual(RUG_TOP)
      expect(roll.x - ROLL_RADIUS - 6).toBeGreaterThan(FIELD.x1)
      expect(nearHomeControl(roll)).toBe(false)
    }
  })

  it('are each found by a touch anywhere on them, and by no touch between two', () => {
    ROLLS.forEach((roll, kind) => {
      for (const [dx, dy] of [[0, 0], [ROLL_RADIUS - 1, 0], [0, 1 - ROLL_RADIUS], [-30, 30]]) expect(rollAt({ x: roll.x + dx, y: roll.y + dy })).toBe(kind)
    })
    expect(rollAt({ x: ROLLS[0].x, y: (ROLLS[0].y + ROLLS[1].y) / 2 })).toBe(-1)
    expect(rollAt({ x: FIELD.x1 - 5, y: ROLLS[1].y })).toBe(-1)
  })
})

describe('the grown-ups\' two places', () => {
  it('have nothing that answers a touch under the home control: no roll, no box, no cat, no toy', () => {
    expect(HOME_CONTROL).toMatchObject({ x: STAGE.width / 2, y: 34, r: 24 })
    expect(HOME_KEEP_OUT).toBeGreaterThanOrEqual(HOME_CONTROL.r + 16)
    for (let turn = 0; turn < 16; turn++) {
      for (const far of [0, HOME_CONTROL.r, HOME_KEEP_OUT - 0.01]) {
        const at = { x: HOME_CONTROL.x + Math.cos(turn) * far, y: HOME_CONTROL.y + Math.sin(turn) * far }
        expect(nearHomeControl(at)).toBe(true)
        expect(rollAt(at)).toBe(-1)
        expect(inBox(at)).toBe(false)
        expect(onCat(at)).toBe(false)
      }
    }
    for (const places of [OUT_PLACE, HOME_PLACE]) {
      for (const id of TOY_IDS) expect(Math.hypot(places[id].x - HOME_CONTROL.x, places[id].y - HOME_CONTROL.y), id).toBeGreaterThan(TOY_SIZE[id].r + HOME_KEEP_OUT)
    }
  })

  it('have no roll, box, cat or toy in the grown-up corner', () => {
    // The corner is the top right of the surface, which at the stage's own size is the top right of the stage.
    const corner = { x: STAGE.width - CORNER, y: CORNER }
    for (const roll of ROLLS) expect(roll.x + ROLL_RADIUS + 6 < corner.x || roll.y - ROLL_RADIUS - 6 > corner.y).toBe(true)
    expect(BOX.x + BOX.w).toBeLessThan(corner.x)
    expect(CAT.y - CAT.ry).toBeGreaterThan(corner.y)
    expect(FIELD.x1).toBeLessThanOrEqual(corner.x)
  })
})

describe('the bare floor, the box and the toys', () => {
  it('lies on the stage between the box and the rolls, above the rug and below the skirting board', () => {
    expect(FIELD.x0).toBeGreaterThan(BOX.x + BOX.w)
    expect(FIELD.y0).toBeGreaterThan(SKIRTING)
    expect(FIELD.y1).toBeLessThan(RUG_TOP)
    expect(inField({ x: FIELD.x0, y: FIELD.y0 })).toBe(true)
    expect(inField({ x: FIELD.x0 - 1, y: FIELD.y0 })).toBe(false)
    // Tape is laid a toy's overhang in from the sides of the boards, so that whoever travels it stays on them.
    expect(clampToField({ x: -50, y: 5000 })).toEqual({ x: FIELD.x0 + EDGE, y: FIELD.y1 - EDGE })
    expect(clampToField({ x: 5000, y: -50 }, 20)).toEqual({ x: FIELD.x1 - EDGE - 20, y: FIELD.y0 + EDGE + 20 })
    for (const id of TOY_IDS) expect(EDGE, id).toBeGreaterThanOrEqual(TOY_SIZE[id].wide / 2 - 1)
  })

  it('has a box far larger than a small finger, and a cat on the rug', () => {
    expect(Math.min(BOX.w, BOX.h)).toBeGreaterThanOrEqual(200)
    expect(inBox({ x: BOX.x + 1, y: BOX.y + 1 })).toBe(true)
    expect(inBox(BOX_MOUTH)).toBe(true)
    expect(CAT.y - CAT.ry).toBeGreaterThanOrEqual(RUG_TOP)
    expect(CAT.y + CAT.ry).toBeLessThanOrEqual(STAGE.height)
    expect(onCat({ x: CAT.x + CAT.rx - 2, y: CAT.y })).toBe(true)
    expect(onCat({ x: CAT.x + CAT.rx + 2, y: CAT.y })).toBe(false)
  })

  it('has toys a three-year-old can hit: every one at least 76 across where it is narrowest', () => {
    for (const id of TOY_IDS) {
      expect(Math.min(TOY_SIZE[id].long, TOY_SIZE[id].wide), id).toBeGreaterThanOrEqual(76)
      expect(TOY_SIZE[id].r * 2, id).toBeGreaterThanOrEqual(76)
    }
    // The car is the one who drives the tape, and it sits on it with a little to spare on each side.
    expect(TOY_SIZE.car.wide).toBeGreaterThan(TAPE_WIDTH)
    expect(TOY_SIZE.car.wide).toBeLessThan(TAPE_WIDTH * 1.5)
  })

  it('tips every toy out onto the bare floor, clear of each other and of the first road', () => {
    for (const id of TOY_IDS) {
      const at = OUT_PLACE[id], r = TOY_SIZE[id].r, { long, wide } = TOY_SIZE[id]
      // Its whole body, as it lies at its own heading.
      const across = (Math.abs(Math.cos(at.a)) * long + Math.abs(Math.sin(at.a)) * wide) / 2, down = (Math.abs(Math.sin(at.a)) * long + Math.abs(Math.cos(at.a)) * wide) / 2
      expect(at.x - across >= FIELD.x0 && at.x + across <= FIELD.x1 && at.y - down >= FIELD.y0 && at.y + down <= FIELD.y1, id).toBe(true)
      for (const other of TOY_IDS) {
        if (other === id) continue
        expect(Math.hypot(at.x - OUT_PLACE[other].x, at.y - OUT_PLACE[other].y), `${id} and ${other}`).toBeGreaterThanOrEqual(r + TOY_SIZE[other].r)
      }
      expect(nearestOn({ kind: 0, ...STARTER }, at).off, id).toBeGreaterThan(TAPE_WIDTH / 2 + TOY_SIZE[id].wide / 2)
    }
  })

  it('heaps every toy inside the box when it stands upright', () => {
    for (const id of TOY_IDS) expect(inBox(HOME_PLACE[id]), id).toBe(true)
    expect([...HOME_ORDER].sort()).toEqual([...TOY_IDS].sort())
  })

  it('lays the first road on the bare floor with room for the car to turn at both ends', () => {
    for (const end of [{ x: STARTER.ax, y: STARTER.ay }, { x: STARTER.bx, y: STARTER.by }]) {
      expect(end.x - TOY_SIZE.car.long / 2).toBeGreaterThan(FIELD.x0)
      expect(end.x + TOY_SIZE.car.long / 2).toBeLessThan(FIELD.x1)
      expect(inField(end)).toBe(true)
    }
  })
})
