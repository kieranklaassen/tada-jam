import { describe, expect, it } from 'vitest'
import { BODY, SMALLEST_TARGET, boxOf, campers, faceOf, type Box } from './camp'
import { PARTY, ROUND, type Party } from './order'
import { STAGE, fit, toStage } from './stage'
import { SHOWING_AT } from './view/display'
import { GRASS_Y, MOUTH_X } from './view/layout'
import { BELL, LIP, hillShape } from './view/props'

// The shell draws one round home control over every game: 48 px across, at the top centre, 10 px from the top edge
// of the surface. A tap on it goes home and never reaches the game, so nothing a child taps, drags or has to read
// may lie under it. The control keeps its size while the stage shrinks with the surface, so on a small surface it
// covers more of the stage: everything here is asked at each surface size, in stage units, against a circle 64 px
// across at the control's place.

const CONTROL = { top: 10, size: 48, clear: 64 } as const
/** The surfaces the stage's own tests name, and two low ones, where the control reaches furthest down the stage. */
const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [2360, 1640], [590, 820], [1024, 400], [333, 777], [1180, 600], [1366, 1024]]

/** The circle to keep clear, in stage units, on a surface of this size. */
function control(width: number, height: number): { x: number; y: number; radius: number } {
  const by = fit(width, height)
  const middle = toStage({ x: width / 2, y: CONTROL.top + CONTROL.size / 2 }, by)
  return { x: middle.x, y: middle.y, radius: CONTROL.clear / 2 / by.scale }
}
/** How far a box is from the circle's edge: negative where it reaches into it. */
const clearOf = (circle: { x: number; y: number; radius: number }, box: Box): number =>
  Math.hypot(Math.max(box.left - circle.x, 0, circle.x - box.right), Math.max(box.top - circle.y, 0, circle.y - box.bottom)) - circle.radius
/** A camper's box as a touch finds it: widened to the smallest target. */
const target = (box: Box): Box => {
  const growX = Math.max(0, (SMALLEST_TARGET - (box.right - box.left)) / 2), growY = Math.max(0, (SMALLEST_TARGET - (box.bottom - box.top)) / 2)
  return { left: box.left - growX, right: box.right + growX, top: box.top - growY, bottom: box.bottom + growY }
}
const PARTIES: readonly Party[] = [...Object.values(PARTY), ...ROUND]

describe('the home control at the top centre', () => {
  it('sits at the middle of the stage across, whatever the surface', () => {
    for (const [width, height] of SURFACES) expect(control(width, height).x).toBeCloseTo(STAGE.width / 2)
  })

  it.each(SURFACES)('is clear of the bell\'s whole reach, at %i by %i', (width, height) => {
    const circle = control(width, height)
    expect(Math.hypot(BELL.x - circle.x, BELL.y - circle.y)).toBeGreaterThan(circle.radius + BELL.reach)
  })

  it.each(SURFACES)('is clear of every camper\'s spot and every place at the log, for every party, and of every face at the camp, at %i by %i', (width, height) => {
    const circle = control(width, height)
    for (const party of PARTIES) {
      for (const camper of campers(party)) {
        expect(clearOf(circle, target(boxOf(camper))), `${party.join()}: ${camper.id}`).toBeGreaterThan(0)
        const face = faceOf(camper)
        if (face) expect(Math.hypot(face.x - circle.x, face.y - circle.y), `${party.join()}: the face of ${camper.id}`).toBeGreaterThan(circle.radius + face.radius)
      }
    }
    // Where a kind is shown large, caught out by its own habit.
    for (const [who, at] of Object.entries(SHOWING_AT)) {
      const body = BODY[who as keyof typeof BODY]
      expect(clearOf(circle, { left: at.x - (body.width / 2) * at.size, right: at.x + (body.width / 2) * at.size, top: at.y - body.height * at.size, bottom: at.y }), `the showing of the ${who}`).toBeGreaterThan(0)
    }
  })

  it.each(SURFACES)('is clear of the dung fly wherever it hovers or perches above the turf, and of the hill at its largest, at %i by %i', (width, height) => {
    const circle = control(width, height)
    const hill = hillShape(1)
    // The dung fly: on its toadstool and over the party at the log are campers, held above. In the ending it sits at the foot of the hill.
    const perch = { x: MOUTH_X + LIP + hill.right.reach * 0.3 + 96, y: GRASS_Y }
    expect(clearOf(circle, { left: perch.x - BODY.dungFly.width / 2, right: perch.x + BODY.dungFly.width / 2, top: perch.y - BODY.dungFly.height, bottom: perch.y })).toBeGreaterThan(0)
    // The two humps of the hill, each as a box from the lip of the mouth to its foot and up to its top.
    for (const [side, hump] of [[-1, hill.left], [1, hill.right]] as const) {
      const from = MOUTH_X + side * LIP, to = MOUTH_X + side * (LIP + hump.reach)
      expect(clearOf(circle, { left: Math.min(from, to), right: Math.max(from, to), top: GRASS_Y - hump.height * 1.05, bottom: GRASS_Y }), side < 0 ? 'the left hump' : 'the right hump').toBeGreaterThan(0)
    }
    // And the worker who stands on top of it with the spoil.
    const top = { x: MOUTH_X + LIP + hill.right.reach * 0.32, y: GRASS_Y - hill.right.height + 3 }
    expect(clearOf(circle, { left: top.x - BODY.worker.width / 2, right: top.x + BODY.worker.width / 2, top: top.y - BODY.worker.height, bottom: top.y })).toBeGreaterThan(0)
  })
})
