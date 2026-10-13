import { describe, expect, it } from 'vitest'
import { BABY, BOX_COUNT, CAMERA, CAT_SEAT_X, CELL, CUSHIONS, FIRST_X, FRONT_Z, GRAN, HOME, KINDS, SCISSORS_REST, faceAt, faceToRoom, kindOf, onPlane, project, type Standing } from './layout'
import { seams } from './fort'
import { freshFort } from './fortState'
import { CORNER } from './overlay'

// Kid-land is landscape: the two surfaces the stills are taken at.
const SURFACES = [[1180, 820], [1024, 768]] as const
const FIRST: Standing[] = [{ id: 0, x: FIRST_X[0] / 100, foot: 0 }, { id: 3, x: FIRST_X[3] / 100, foot: 0 }]

describe('the room on the surface', () => {
  it('has a face of whole cells for every box', () => {
    for (const kind of Object.values(KINDS)) {
      expect(kind.cols * CELL).toBeCloseTo(kind.w, 6)
      expect(kind.rows * CELL).toBeCloseTo(kind.h, 6)
    }
    for (let id = 0; id < BOX_COUNT; id++) expect(kindOf(id).cols).toBeGreaterThan(0)
  })

  it.each(SURFACES)('brings a touch back to the place it was drawn at, on %i by %i', (width, height) => {
    for (const p of [{ x: -1.2, y: 0.3, z: FRONT_Z }, { x: 2, y: 1.5, z: FRONT_Z }, { x: 0, y: 0, z: FRONT_Z }]) {
      const seen = project(p, width, height), back = onPlane(seen.x, seen.y, width, height, FRONT_Z)
      expect(back.x).toBeCloseTo(p.x, 6)
      expect(back.y).toBeCloseTo(p.y, 6)
    }
  })

  it.each(SURFACES)('holds both boxes, the baby, the grandmother and the scissors inside a surface of %i by %i', (width, height) => {
    const inside = (p: { x: number; y: number; z: number }, margin = 0): void => {
      const seen = project(p, width, height)
      expect(seen.x).toBeGreaterThan(margin); expect(seen.x).toBeLessThan(width - margin)
      expect(seen.y).toBeGreaterThan(margin); expect(seen.y).toBeLessThan(height - margin)
    }
    for (const box of FIRST) for (const [cx, cy] of [[0, 0], [kindOf(box.id).cols, kindOf(box.id).rows]]) inside(faceToRoom(box, cx, cy), 8)
    inside(BABY, 60); inside(GRAN, 60); inside(SCISSORS_REST, 48)
    for (const cushion of CUSHIONS) inside(cushion)
  })

  it.each(SURFACES)('keeps what answers a touch clear of the home control and the grown-up corner, on %i by %i', (width, height) => {
    const home = { x: width / 2, y: HOME.top + HOME.radius }
    const clear = (p: { x: number; y: number; z: number }, metres: number): void => {
      const seen = project(p, width, height), reach = metres * seen.scale
      expect(Math.hypot(seen.x - home.x, seen.y - home.y), 'the home control').toBeGreaterThan(reach + HOME.radius)
      expect(seen.x + reach < width - CORNER || seen.y - reach > CORNER, 'the grown-up corner').toBe(true)
    }
    // The cat on top of the big box is the highest thing a finger can be on.
    const top = kindOf(0).h
    clear({ x: FIRST[0].x + CAT_SEAT_X, y: top + 0.5, z: FRONT_Z - 0.5 }, 0.5)
    // And it sits well to the side of the control, not only below it.
    expect(project({ x: FIRST[0].x + CAT_SEAT_X + 0.3, y: top + 1, z: FRONT_Z - 0.5 }, width, height).x).toBeLessThan(width / 2 - HOME.radius)
    clear(GRAN, 0.4); clear(BABY, 0.42)
    for (const box of FIRST) clear(faceToRoom(box, kindOf(box.id).cols / 2, kindOf(box.id).rows), 0)
  })

  it.each(SURFACES)('lays the scissors down in front of the boxes and on no face, on %i by %i', (width, height) => {
    // Their tips are their highest point where they lie.
    const tips = project(SCISSORS_REST, width, height)
    for (const box of FIRST) expect(tips.y).toBeGreaterThan(project(faceToRoom(box, 0, 0), width, height).y)
    expect(tips.y).toBeLessThan(height - 60)
  })

  it('tells which face a place of the front plane is on, in cells from its lower left corner', () => {
    const big = FIRST[0], kind = kindOf(0)
    expect(faceAt({ x: big.x - kind.w / 2 + 0.25, y: 0.5, z: FRONT_Z }, FIRST)).toEqual({ id: 0, cx: 20, cy: 40 })
    expect(faceAt({ x: big.x, y: kind.h + 0.2, z: FRONT_Z }, FIRST)).toBeNull()
    expect(faceAt({ x: FIRST[1].x, y: 0.4, z: FRONT_Z }, FIRST)?.id).toBe(3)
  })

  it('stands the first two boxes side by side and touching, so that tape holds on a first visit, with the baby in front of neither face', () => {
    const [big, small] = FIRST
    // Reading 1, ruling 6: the two boxes of a first visit meet in a seam.
    expect(big.x + kindOf(0).w / 2).toBeCloseTo(small.x - kindOf(3).w / 2, 9)
    expect(seams(freshFort(null)).map((seam) => [seam.a, seam.b])).toEqual([[0, 3]])
    for (const [width, height] of SURFACES) {
      const edge = project(faceToRoom(big, 0, 30), width, height), baby = project(BABY, width, height)
      expect(baby.x + 0.36 * baby.scale).toBeLessThan(edge.x)
    }
    expect(CAMERA.at.z).toBeGreaterThan(FRONT_Z)
  })
})
