import { describe, expect, it } from 'vitest'
import { BODY, BOARD, CAT, CLOTH, FEET_Y, FRIEND_KINDS, GATE, GRASS_SIZE, GROWN_UP, HELD, HILL, HOME, LAWN, LINE, LINE_SIZE, PEG_REACH, PLACE_X, PUDDLE, RAIL, RIDGES, SOAP, TUB, TUB_FRIEND, TUB_SIZE, TUB_SLOTS, WAIT_FEET, WAIT_HELD, WAIT_SCALE, WAIT_X, WRIST_STRIP, YARD_SCALE, bodyOval, boxAt, heldAt, inBox, lineSpot, lineY, onLawn, overlap, pegHome, targets, underPlace, waitBox, waitHeldAt, type Box } from './layout'
import { CORNER } from './overlay'
import { STAGE, fit } from './stage'

const middle = (box: Box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const round = (x: number, y: number, r: number): Box => ({ x: x - r, y: y - r, w: r * 2, h: r * 2 })
const PEG: number = 28

/** Everything that answers a touch and that a child reaches for: the targets of a cycle and the toys beside them. */
function everything(): { name: string; box: Box }[] {
  return [
    ...targets(),
    { name: 'board', box: BOARD },
    { name: 'cat', box: round(CAT.x, CAT.y, CAT.r) },
    { name: 'soap', box: round(SOAP.x, SOAP.y, SOAP.r) },
    { name: 'puddle', box: { x: PUDDLE.x - PUDDLE.rx, y: PUDDLE.y - PUDDLE.ry, w: PUDDLE.rx * 2, h: PUDDLE.ry * 2 } },
    ...TUB_SLOTS.map((slot, i) => ({ name: `tub slot ${i}`, box: boxAt(slot.x, slot.y, TUB_SIZE) })),
    ...[0, 1, 2, 3, 4, 5].map((peg) => ({ name: `peg ${peg}`, box: round(pegHome(peg).x, pegHome(peg).y, PEG) })),
    ...PLACE_X.map((_, i) => ({ name: `held ${i}`, box: boxAt(heldAt(i).x, heldAt(i).y, HELD.size) })),
    ...FRIEND_KINDS.map((kind, i) => ({ name: `waiting ${kind}`, box: waitBox(i, kind) })),
    ...FRIEND_KINDS.map((kind, i) => ({ name: `waiting ${kind}'s garment`, box: boxAt(waitHeldAt(i, kind).x, waitHeldAt(i, kind).y, WAIT_HELD.size) })),
  ]
}

describe('where things stand', () => {
  it('every target is on the stage and large enough for the youngest hand', () => {
    for (const { name, box } of targets()) {
      expect(box.x, name).toBeGreaterThanOrEqual(0)
      expect(box.y, name).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w, name).toBeLessThanOrEqual(STAGE.width)
      expect(box.y + box.h, name).toBeLessThanOrEqual(STAGE.height)
      expect(box.w, name).toBeGreaterThanOrEqual(100)
      expect(box.h, name).toBeGreaterThanOrEqual(80)
    }
    for (const { name, box } of everything()) {
      expect(box.w, name).toBeGreaterThanOrEqual(48)
      expect(box.h, name).toBeGreaterThanOrEqual(48)
    }
  })

  it('nothing a child taps or drags lies under the home control: not a target, a toy, a place on the line or a peg', () => {
    for (const { name, box } of everything()) expect(overlap(box, HOME), name).toBe(false)
    // The home control is a round button 48 across at the top centre, 10 from the top edge.
    expect(HOME).toEqual({ x: STAGE.width / 2 - 24, y: 10, w: 48, h: 48 })
    // The line passes well under it, and so does the top of whatever hangs or is pegged there.
    expect(lineY(STAGE.width / 2) - PEG).toBeGreaterThan(HOME.y + HOME.h)
    for (let place = 0; place < PLACE_X.length; place++) {
      expect(lineSpot(place).y - LINE_SIZE / 2).toBeGreaterThan(HOME.y + HOME.h)
      // No place on the line is straight below the control either, so a finger aiming at one does not pass over it.
      expect(Math.abs(PLACE_X[place] - STAGE.width / 2)).toBeGreaterThan(HOME.w)
    }
  })

  it('the home control stays clear when the stage is fitted into a smaller or a wider surface', () => {
    // The control is 48 px of the surface at its top centre whatever the stage's scale is.
    for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180], [640, 360], [1366, 1024]]) {
      const by = fit(width, height)
      const home: Box = { x: width / 2 - 24, y: 10, w: 48, h: 48 }
      for (const { name, box } of everything()) {
        const shown: Box = { x: by.x + box.x * by.scale, y: by.y + box.y * by.scale, w: box.w * by.scale, h: box.h * by.scale }
        expect(overlap(shown, home), `${name} at ${width}x${height}`).toBe(false)
      }
    }
  })

  it('nothing a child must hit lies in the grown-up corner', () => {
    expect(GROWN_UP).toEqual({ x: STAGE.width - CORNER, y: 0, w: CORNER, h: CORNER })
    for (const { name, box } of everything()) expect(overlap(box, GROWN_UP), name).toBe(false)
  })

  it('the middle of every target is above the strip where wrists rest', () => {
    for (const { name, box } of targets()) expect(middle(box).y, name).toBeLessThan(STAGE.height - WRIST_STRIP)
    for (let place = 0; place < PLACE_X.length; place++) expect(heldAt(place).y + HELD.size / 2).toBeLessThan(STAGE.height - WRIST_STRIP)
    expect(PUDDLE.y).toBeLessThan(STAGE.height - WRIST_STRIP)
    expect(TUB_FRIEND.y - BODY.pig.ry * YARD_SCALE).toBeLessThan(STAGE.height - WRIST_STRIP)
  })

  it('the friends stand apart: the middle of each is in no other friend, and none stands in the tub or the puddle', () => {
    PLACE_X.forEach((a, i) => PLACE_X.forEach((b, j) => {
      if (i !== j) expect(Math.abs(a - b)).toBeGreaterThan(BODY[FRIEND_KINDS[j]].rx * YARD_SCALE)
    }))
    expect(PLACE_X[0] - BODY.pig.rx * YARD_SCALE).toBeGreaterThan(TUB.x + TUB.rx)
    expect(PLACE_X[2] + BODY.goat.rx * YARD_SCALE).toBeLessThan(PUDDLE.x - PUDDLE.rx)
  })

  it('a held garment hangs clear of the board and of the garment next to it', () => {
    for (let place = 0; place < PLACE_X.length; place++) {
      const at = heldAt(place)
      expect(at.x - HELD.size / 2).toBeGreaterThan(BOARD.x + BOARD.w)
      if (place > 0) expect(at.x - heldAt(place - 1).x).toBeGreaterThan(HELD.size)
    }
  })

  it('the cloth lies on the ridged face of the board, the board stands in the tub, and the soap sits on its top bar', () => {
    expect(CLOTH.x).toBeGreaterThanOrEqual(RIDGES.x)
    expect(CLOTH.x + CLOTH.w).toBeLessThanOrEqual(RIDGES.x + RIDGES.w)
    expect(CLOTH.y).toBeGreaterThanOrEqual(RIDGES.y)
    expect(CLOTH.y + CLOTH.h).toBeLessThanOrEqual(RIDGES.y + RIDGES.h)
    expect(RIDGES.x).toBeGreaterThanOrEqual(BOARD.x)
    expect(RIDGES.x + RIDGES.w).toBeLessThanOrEqual(BOARD.x + BOARD.w)
    expect(BOARD.x).toBeGreaterThan(TUB.x - TUB.rx)
    expect(BOARD.x + BOARD.w).toBeLessThan(TUB.x + TUB.rx)
    expect(SOAP.y).toBeLessThan(RIDGES.y)
    expect(inBox(BOARD, SOAP.x, SOAP.y, SOAP.r)).toBe(true)
  })

  it('the rail stands behind the tub, above the board, and what hangs on it hangs clear of the cloth and the cat', () => {
    expect(RAIL.y).toBeLessThan(BOARD.y)
    expect(RAIL.box.y + RAIL.box.h).toBeLessThanOrEqual(BOARD.y)
    expect(overlap(RAIL.box, CLOTH)).toBe(false)
    expect(overlap(RAIL.box, round(CAT.x, CAT.y, CAT.r))).toBe(false)
    expect(inBox(RAIL.box, RAIL.hang.x, RAIL.hang.y)).toBe(true)
    expect(RAIL.y).toBeGreaterThan(lineY(RAIL.hang.x) + 40)
  })

  it('what floats in the tub floats on its water, right of the board', () => {
    for (const slot of TUB_SLOTS) {
      expect(slot.x - TUB_SIZE / 2).toBeGreaterThanOrEqual(BOARD.x + BOARD.w - 20)
      expect(slot.x).toBeLessThan(TUB.x + TUB.rx)
      expect(Math.abs(slot.y - TUB.y)).toBeLessThan(TUB.ry)
    }
  })

  it('the line hangs lowest in the middle and is tied at both ends; each place has a peg to each side', () => {
    expect(lineY(LINE.x0)).toBeCloseTo(LINE.y)
    expect(lineY(LINE.x1)).toBeCloseTo(LINE.y)
    expect(lineY((LINE.x0 + LINE.x1) / 2)).toBeCloseTo(LINE.y + LINE.sag)
    for (let place = 0; place < PLACE_X.length; place++) {
      expect(pegHome(place * 2).x).toBe(PLACE_X[place] - PEG_REACH)
      expect(pegHome(place * 2 + 1).x).toBe(PLACE_X[place] + PEG_REACH)
      expect(pegHome(place * 2).y).toBeCloseTo(lineY(pegHome(place * 2).x))
      if (place > 0) expect(lineSpot(place).x - lineSpot(place - 1).x).toBeGreaterThan(LINE_SIZE)
      // A thing that falls from a place lands on the lawn below it.
      expect(onLawn(underPlace(place).x, underPlace(place).y)).toEqual(underPlace(place))
    }
  })
})

describe('the three who wait behind the gate', () => {
  it.each([[1180, 820], [1024, 768], [640, 360]])('each one, and what it holds up, shows above the top bar and clear of the boards at %i by %i', (width, height) => {
    const by = fit(width, height)
    FRIEND_KINDS.forEach((kind, place) => {
      const held = boxAt(waitHeldAt(place, kind).x, waitHeldAt(place, kind).y, WAIT_HELD.size)
      // The garment is held wholly above the top bar, so the gate never cuts it.
      expect(held.y + held.h, kind).toBeLessThanOrEqual(GATE.y)
      expect(overlap(held, GATE), kind).toBe(false)
      // Its feet are hidden behind the boards and its head is above them.
      expect(WAIT_FEET[kind], kind).toBeGreaterThan(GATE.y)
      const oval = bodyOval(kind, WAIT_X[place], WAIT_FEET[kind], WAIT_SCALE)
      expect(oval.cy - oval.ry, kind).toBeLessThan(GATE.y - 40)
      // What a touch lands on is the part above the bar, and it is large enough at this size of surface for a fingertip with the slack a touch gets.
      const box = waitBox(place, kind)
      expect(box.y + box.h, kind).toBeLessThanOrEqual(GATE.y)
      expect(box.x, kind).toBeGreaterThanOrEqual(GATE.x)
      expect(box.x + box.w, kind).toBeLessThanOrEqual(GATE.x + GATE.w)
      expect(box.h * by.scale, kind).toBeGreaterThanOrEqual(48)
      // Nothing of it is above the frame or under the corner.
      expect(by.y + box.y * by.scale, kind).toBeGreaterThanOrEqual(0)
      expect(overlap(box, GROWN_UP), kind).toBe(false)
    })
    // The three stand apart behind it.
    expect(WAIT_X[1] - WAIT_X[0]).toBeGreaterThanOrEqual(WAIT_HELD.size)
    expect(WAIT_X[2] - WAIT_X[1]).toBeGreaterThanOrEqual(WAIT_HELD.size)
  })

  it('the gate is a target of its own, apart from the ones who wait above it and from the puddle below', () => {
    FRIEND_KINDS.forEach((kind, place) => expect(overlap(waitBox(place, kind), GATE), kind).toBe(false))
    expect(GATE.y + GATE.h).toBeLessThan(PUDDLE.y - PUDDLE.ry)
    expect(GATE.x).toBeGreaterThan(PLACE_X[2] + BODY.goat.rx * YARD_SCALE - 10)
  })

  it('the hill has a place for each of the last three, far off and small, behind everything a finger reaches for', () => {
    expect(HILL).toHaveLength(3)
    for (const spot of HILL) {
      expect(spot.y).toBeLessThan(LAWN.y)
      expect(spot.y).toBeGreaterThan(lineY(spot.x) + LINE_SIZE)
    }
    expect(GRASS_SIZE).toBeGreaterThanOrEqual(48)
    expect(FEET_Y).toBeLessThan(STAGE.height - WRIST_STRIP)
  })
})
