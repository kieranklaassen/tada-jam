import { describe, expect, it } from 'vitest'
import { BUTTONS, FIGURES, GARMENTS, SPOTS, ZIP_TEETH, sameSpot, type Garment } from './kinds'
import { ARMS, ARM_SEEN, BODIES, BUTTON_AT, BUTTON_HALF, BY_THE_DOOR, DOG_HEAD, DOOR, DOOR_TARGET, EXTENT, FLOOR_Y, GROWN_UP_CORNER, HANDLE, HEADING, HOME_CONTROL, ON_RACK, RAP, SASH_Y, SLIDER_REACH, WORN_TARGET, armTo, cockerelAcross, onButton, touchShapes, wornPad, RACK, RACK_TARGET, REACH, SHEET, VANE, VANE_TARGET, WINDOW, WRIST_LINE, aimsOf, boxesMeet, clearOf, coresAt, fromPaper, homeControlOn, onPaper, onRackTarget, onWearer, paperBox, placesOf, poseOf, sliderAt, spotAt, standOf, teethAt, toPaper, type Box } from './layout'
import { STAGE, fit } from './stage'

const middle = (box: Box) => ({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 })
const inside = (box: Box, x: number, y: number) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1
const firstOnRack = (x: number, y: number): Garment | undefined => GARMENTS.find((garment) => onRackTarget(garment, x, y))

describe('the rack', () => {
  it.each(GARMENTS)('gives the %s a target a small finger can hit, on the board and clear of the shell', (garment) => {
    const box = paperBox(garment, ON_RACK[garment], false), at = middle(box)
    expect(firstOnRack(at.x, at.y)).toBe(garment)
    // At least RACK_TARGET across each way, however thin the paper.
    for (const [dx, dy] of [[RACK_TARGET / 2 - 1, 0], [-(RACK_TARGET / 2 - 1), 0], [0, RACK_TARGET / 2 - 1], [0, -(RACK_TARGET / 2 - 1)]]) expect(onRackTarget(garment, at.x + dx, at.y + dy)).toBe(true)
    expect(inside(RACK, at.x, at.y)).toBe(true)
    expect(at.y).toBeLessThan(WRIST_LINE)
    for (const shell of [HOME_CONTROL, GROWN_UP_CORNER]) expect(box.x1 < shell.x0 || box.x0 > shell.x1 || box.y1 < shell.y0 || box.y0 > shell.y1).toBe(true)
    expect(box.x0).toBeGreaterThanOrEqual(RACK.x0)
    expect(box.x1).toBeLessThanOrEqual(STAGE.width)
  })

  it('keeps the middles of any two garments far apart', () => {
    for (const a of GARMENTS) for (const b of GARMENTS) {
      if (a === b) continue
      const pa = middle(paperBox(a, ON_RACK[a], false)), pb = middle(paperBox(b, ON_RACK[b], false))
      expect(Math.hypot(pa.x - pb.x, pa.y - pb.y), `${a} and ${b}`).toBeGreaterThan(RACK_TARGET)
    }
  })
})

describe('the figures', () => {
  it('stand in three places whoever is in the middle, the taller of the two who wait by the door', () => {
    for (const turn of FIGURES) {
      const places = FIGURES.map((who) => standOf(who, turn))
      expect(new Set(places.map((at) => at.x)).size).toBe(3)
      expect(standOf(turn, turn).x).toBeGreaterThan(Math.max(...FIGURES.filter((who) => who !== turn).map((who) => standOf(who, turn).x)))
    }
    expect(standOf('grandfather', 'child').x).toBeLessThan(standOf('baby', 'child').x)
    expect(standOf('dog', 'baby')).toEqual(standOf('dog', 'child'))
  })

  it.each(FIGURES)('give every part an aim that chooses that part, clear of the shell and above the wrists, with the %s in the middle', (turn) => {
    const stands = placesOf(turn)
    for (const spot of SPOTS) {
      const aims = aimsOf(spot, stands)
      expect(aims.length).toBeGreaterThan(0)
      for (const aim of aims) {
        expect(sameSpot(spotAt(aim.x, aim.y, stands) ?? 'rack', spot)).toBe(true)
        expect(inside(HOME_CONTROL, aim.x, aim.y)).toBe(false)
        expect(inside(GROWN_UP_CORNER, aim.x, aim.y)).toBe(false)
        expect(aim.y).toBeLessThan(WRIST_LINE)
        expect(inside(SHEET, aim.x, aim.y)).toBe(true)
      }
    }
  })

  it.each(FIGURES)('keep the aims of two parts at least 48 apart, and leave the rack and the bare wall as nowhere, with the %s in the middle', (turn) => {
    const stands = placesOf(turn)
    const aims = SPOTS.flatMap((spot) => aimsOf(spot, stands).map((aim) => ({ spot, aim })))
    for (const a of aims) for (const b of aims) {
      if (sameSpot(a.spot, b.spot)) continue
      expect(Math.hypot(a.aim.x - b.aim.x, a.aim.y - b.aim.y), `${a.spot.who} ${a.spot.part} and ${b.spot.who} ${b.spot.part}`).toBeGreaterThanOrEqual(48)
    }
    expect(spotAt(middle(RACK).x, middle(RACK).y, stands)).toBeNull()
    expect(spotAt(700, 300, stands)).toBeNull()
    expect(REACH).toBeGreaterThan(48)
  })

  it.each(GARMENTS)('keep the %s on the sheet on every part of everyone, shut or open, whoever is in the middle', (garment) => {
    for (const turn of FIGURES) for (const spot of SPOTS) for (const open of [false, true]) {
      const stands = placesOf(turn)
      const pose = poseOf(garment, spot, stands, open), box = paperBox(garment, pose, open), at = standOf(spot.who, turn)
      expect(box.y1, `${turn}: ${spot.who} ${spot.part}`).toBeLessThanOrEqual(at.y + 14.001)
      expect(box.y0, `${turn}: ${spot.who} ${spot.part}`).toBeGreaterThanOrEqual(SHEET.y0)
      expect(box.x0, `${turn}: ${spot.who} ${spot.part}`).toBeGreaterThanOrEqual(0)
      expect(box.x1, `${turn}: ${spot.who} ${spot.part}`).toBeLessThan(RACK.x0)
      // The garment is under the finger that looks for it where it lies.
      const on = fromPaper(pose, 0, 10)
      expect(onPaper(garment, { ...pose, sep: 0 }, open, on.x, on.y, 10)).toBe(true)
    }
    expect(poseOf(garment, 'rack', placesOf('child'), false)).toEqual(ON_RACK[garment])
  })
})

/** The surfaces the game is held to: the still's size, two tablets, a laptop window and a phone on its side. */
const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [1366, 1024], [1280, 720], [844, 390]]

describe.each(SURFACES)('nothing a child aims at lies under anything, on a surface of %i by %i', (width, height) => {
  const control = homeControlOn(width, fit(width, height)), clear = clearOf(control)
  const meets = (box: Box, other: Box) => boxesMeet(box, other)

  it('puts the home control at the top centre of the stage', () => {
    expect((control.x0 + control.x1) / 2).toBeCloseTo(STAGE.width / 2)
    expect(control.x1 - control.x0).toBeCloseTo(48 / fit(width, height).scale)
    expect(control.y0).toBeCloseTo(10 / fit(width, height).scale - fit(width, height).y / fit(width, height).scale)
  })

  it('keeps every garment clear of the home control, on its peg and on every part of everyone', () => {
    for (const garment of GARMENTS) {
      expect(meets(paperBox(garment, ON_RACK[garment], false), control), `${garment} on its peg`).toBe(false)
      for (const turn of FIGURES) for (const spot of SPOTS) for (const open of [false, true]) {
        const box = paperBox(garment, poseOf(garment, spot, placesOf(turn), open, clear), open)
        expect(meets(box, control), `${garment} on ${spot.who} ${spot.part}, ${turn} in the middle`).toBe(false)
      }
    }
  })

  it('keeps the vane and the door handle clear of every worn garment and of every figure, and of the home control', () => {
    const handle: Box = { x0: HANDLE.x - 24, y0: HANDLE.y - 24, x1: HANDLE.x + 24, y1: HANDLE.y + 24 }
    for (const target of [VANE_TARGET, handle]) expect(meets(target, control)).toBe(false)
    expect(inside(DOOR_TARGET, HANDLE.x, HANDLE.y)).toBe(true)
    expect(inside(WINDOW, VANE.x, VANE.y)).toBe(true)
    for (const turn of FIGURES) {
      const stands = placesOf(turn)
      for (const who of [...FIGURES, 'dog'] as const) {
        for (const core of coresAt(who, stands[who])) for (const target of [VANE_TARGET, handle]) expect(meets(core, target), `${who} with ${turn} in the middle`).toBe(false)
        // A finger on the vane or the handle is on no figure.
        for (const at of [VANE, HANDLE]) expect(onWearer(who, at.x, at.y, stands), `${who} with ${turn} in the middle`).toBe(false)
      }
      for (const garment of GARMENTS) for (const spot of SPOTS) for (const open of [false, true]) {
        const box = paperBox(garment, poseOf(garment, spot, stands, open, clear), open)
        for (const target of [VANE_TARGET, handle]) expect(meets(box, target), `${garment} on ${spot.who} ${spot.part}, ${turn} in the middle`).toBe(false)
      }
    }
  })

  it('keeps every figure and every aim clear of the home control, whoever is in the middle', () => {
    for (const turn of FIGURES) {
      const stands = placesOf(turn)
      for (const who of [...FIGURES, 'dog'] as const) for (const core of coresAt(who, stands[who])) expect(meets(core, control), `${who} with ${turn} in the middle`).toBe(false)
      for (const spot of SPOTS) for (const aim of aimsOf(spot, stands)) expect(inside(control, aim.x, aim.y), `${spot.who} ${spot.part}`).toBe(false)
    }
  })
})

describe('the fastenings and the setting', () => {
  it('give the zip a place for every tooth, a tooth further up the coat each time', () => {
    for (let teeth = 0; teeth <= ZIP_TEETH; teeth++) {
      expect(teethAt(sliderAt(teeth).y)).toBe(teeth)
      if (teeth > 0) expect(sliderAt(teeth).y).toBeLessThan(sliderAt(teeth - 1).y)
    }
    expect(teethAt(-500)).toBe(ZIP_TEETH)
    expect(teethAt(900)).toBe(0)
  })

  it('gives each button a box of its own, a hundred units across, with no point on two buttons', () => {
    expect(BUTTON_AT.length).toBe(BUTTONS)
    for (let i = 0; i < BUTTONS; i++) {
      const at = BUTTON_AT[i]
      for (const [dx, dy] of [[0, 0], [BUTTON_HALF.x, 0], [-BUTTON_HALF.x, 0], [0, BUTTON_HALF.y - 1], [0, -(BUTTON_HALF.y - 1)]]) expect(onButton(i, at.x + dx, at.y + dy)).toBe(true)
      expect(onButton(i, at.x + BUTTON_HALF.x + 1, at.y)).toBe(false)
    }
    for (let y = 0; y <= 240; y += 0.5) expect([0, 1, 2].filter((i) => onButton(i, 0, y)).length, `at ${y}`).toBeLessThanOrEqual(1)
    // The three boxes lie edge to edge, so a finger between two buttons is on one of them.
    for (let y = BUTTON_AT[0].y; y <= BUTTON_AT[2].y; y += 0.5) if (!BUTTON_AT.some((at) => Math.abs(Math.abs(y - at.y) - BUTTON_HALF.y) < 1e-9)) expect([0, 1, 2].filter((i) => onButton(i, 0, y)).length, `at ${y}`).toBe(1)
  })

  it('gives every shape a finger lands on 48 px or more each way on every tablet surface, and a hundred units across', () => {
    const shapes = touchShapes()
    expect(shapes.length).toBeGreaterThan(20)
    // The tablets: every surface but the phone.
    for (const [width, height] of SURFACES.filter(([w]) => w >= 1000)) {
      const scale = fit(width, height).scale
      for (const shape of shapes) {
        expect(shape.across * scale, `${shape.name} across, on ${width} by ${height}`).toBeGreaterThanOrEqual(48)
        expect(shape.high * scale, `${shape.name} high, on ${width} by ${height}`).toBeGreaterThanOrEqual(48)
      }
    }
    // The sheet's hundred units across holds for every shape; two are lower than a hundred, and those two only.
    for (const shape of shapes) expect(shape.across, shape.name).toBeGreaterThanOrEqual(100)
    expect(shapes.filter((shape) => shape.high < 100).map((shape) => [shape.name, shape.high])).toEqual([['a button', 62], ['the dog\'s head', 58]])
  })

  it('makes the shapes it lists the shapes a finger is tried against', () => {
    expect(SLIDER_REACH * 2).toBe(100)
    expect(DOG_HEAD.x1 - DOG_HEAD.x0).toBe(100)
    for (const garment of GARMENTS) {
      const box = EXTENT[garment], pad = wornPad(garment, false), pose = { x: 500, y: 400, rot: 0, sep: 0 }
      const across = box.x1 - box.x0 + pad.x * 2, high = box.y1 - box.y0 + pad.y * 2
      expect(across).toBeGreaterThanOrEqual(WORN_TARGET)
      expect(high).toBeGreaterThanOrEqual(WORN_TARGET)
      const cx = pose.x + (box.x0 + box.x1) / 2, cy = pose.y + (box.y0 + box.y1) / 2
      for (const [dx, dy] of [[across / 2 - 0.5, 0], [-(across / 2 - 0.5), 0], [0, high / 2 - 0.5], [0, -(high / 2 - 0.5)]]) expect(onPaper(garment, pose, false, cx + dx, cy + dy, pad), garment).toBe(true)
      expect(onPaper(garment, pose, false, cx + across / 2 + 1, cy, pad), garment).toBe(false)
    }
  })

  it('gives the cockerel four headings that are four different sights of it', () => {
    const turns = Object.values(HEADING)
    expect(new Set(turns).size).toBe(4)
    for (const turn of turns) {
      expect(turn).toBeGreaterThanOrEqual(0)
      expect(turn).toBeLessThan(1)
    }
    const sights = turns.map(cockerelAcross)
    for (let i = 0; i < sights.length; i++) for (let j = i + 1; j < sights.length; j++) expect(Math.abs(sights[i] - sights[j])).toBeGreaterThan(0.45)
  })

  it('puts the knuckles of whoever raps on the clear glass above the rail, within reach of its arm from by the door', () => {
    for (const who of ['grandfather', 'child'] as const) {
      const { at, hop } = RAP[who]
      expect(inside({ ...WINDOW, y1: SASH_Y }, at.x, at.y)).toBe(true)
      // Clear of the vane's own square: the rap is not a turn of the vane.
      expect(inside(VANE_TARGET, at.x, at.y)).toBe(false)
      const aim = { x: at.x - BY_THE_DOOR.x, y: at.y - (BY_THE_DOOR.y - hop) }, arm = armTo(who, aim)
      expect(arm.hand.x).toBeCloseTo(aim.x)
      expect(arm.hand.y).toBeCloseTo(aim.y)
      expect(arm.long).toBeGreaterThan(ARM_SEEN.least)
      expect(arm.long).toBeLessThanOrEqual(ARM_SEEN.most[who])
      // Without its jump the child could not: that is why it jumps.
      if (hop > 0) expect(Math.hypot(at.x - BY_THE_DOOR.x - ARMS[who].shoulder.x, at.y - BY_THE_DOOR.y - ARMS[who].shoulder.y) / Math.hypot(ARMS[who].hand.x - ARMS[who].shoulder.x, ARMS[who].hand.y - ARMS[who].shoulder.y)).toBeGreaterThan(ARM_SEEN.most[who])
    }
  })

  it('turn a point of a garment to the stage and back', () => {
    const pose = { x: 300, y: 200, rot: 0.7, sep: 0 }
    const there = fromPaper(pose, 40, -25), back = toPaper(pose, there.x, there.y)
    expect(back.x).toBeCloseTo(40)
    expect(back.y).toBeCloseTo(-25)
  })

  it('stands the door, the window and the rack on the sheet, with the floor above the wrists', () => {
    for (const box of [DOOR, WINDOW, RACK]) {
      expect(box.x0).toBeGreaterThanOrEqual(SHEET.x0)
      expect(box.x1).toBeLessThanOrEqual(SHEET.x1)
      expect(box.y0).toBeGreaterThanOrEqual(SHEET.y0)
      expect(box.y1).toBeLessThanOrEqual(SHEET.y1)
    }
    expect(FLOOR_Y).toBeLessThan(WRIST_LINE)
  })
})

describe('what is worn', () => {
  it('stays off the rack board, on every part of everyone, whoever is in the middle', () => {
    for (const turn of FIGURES) for (const garment of GARMENTS) for (const spot of SPOTS) for (const open of [false, true]) {
      const box = paperBox(garment, poseOf(garment, spot, placesOf(turn), open), open)
      expect(box.x1, `${garment} on ${spot.who} ${spot.part}, ${turn} in the middle`).toBeLessThanOrEqual(RACK.x0)
    }
  })

  it('leaves the eyes of the baby clear under the hat, and the hat still on its head', () => {
    for (const turn of FIGURES) {
      const at = placesOf(turn).baby, box = paperBox('hat', poseOf('hat', { who: 'baby', part: 'head' }, placesOf(turn), false), false)
      expect(box.y1).toBeLessThan(at.y + BODIES.baby.face.y - BODIES.baby.faceR / 2)
      expect(box.y1).toBeGreaterThan(at.y - BODIES.baby.height)
    }
  })
})
