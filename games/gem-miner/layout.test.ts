import { describe, expect, it } from 'vitest'
import { BURROW, COLS, GRASS, GRASS_FROM, HILL, LIFT, MAMMOTH, MOLEHILL, TOOLS, TOOL_HOME, boxesCross, feetOf, grassNode, homeControl, type Box } from './layout'
import { CORNER } from './overlay'
import { moleBox, toolBox, toolSpot } from './shapes'
import { STAGE, fit } from './stage'
import { SPRAYED, SPRAY_REACH } from './wall'

// What stands on the grass, against the two things the jam and the grown-up
// keep at the top of the surface: the home control at the top centre and the
// grown-up's corner at the top right. Both are a fixed size in CSS pixels, so
// on a small surface they are large on the stage.

/** The grown-up's corner in stage units on a surface of this size. */
function cornerOf(width: number, height: number): Box {
  const by = fit(width, height)
  return { x: (width - CORNER - by.x) / by.scale, y: -by.y / by.scale, w: CORNER / by.scale, h: CORNER / by.scale }
}

/** Every surface from 320 to 1400 wide and 320 to 1100 high, in steps of 20. */
function surfaces(): { width: number; height: number }[] {
  const out: { width: number; height: number }[] = []
  for (let width = 320; width <= 1400; width += 20) for (let height = 320; height <= 1100; height += 20) out.push({ width, height })
  return out
}

/** The surfaces a tablet gives, upright and on its side, and the one the stills are taken at. */
const TABLETS = [[1180, 820], [820, 1180], [1024, 768], [768, 1024], [1133, 744], [744, 1133], [1366, 1024], [1024, 1366], [1080, 810], [810, 1080]] as const

const tools = (): Box[] => TOOLS.map((tool) => toolBox(tool, toolSpot(TOOL_HOME[tool])))
/** The mole standing on each stretch of grass he can stand on. */
const molesOnGrass = (): Box[] => {
  const out: Box[] = []
  for (let c = GRASS_FROM; c < COLS; c++) { const at = feetOf(grassNode(c)); out.push(moleBox(at.x, at.y, false)) }
  return out
}

describe('what stands on the grass', () => {
  it('keeps the mammoth, the lift and the walked grass apart, and all of them above the hill', () => {
    expect(boxesCross(MAMMOTH, LIFT)).toBe(false)
    expect(boxesCross(LIFT, GRASS)).toBe(false)
    expect(boxesCross(MAMMOTH, GRASS)).toBe(false)
    for (const box of [MAMMOTH, LIFT, GRASS]) expect(box.y + box.h).toBeLessThanOrEqual(HILL.y)
    // A tap on the mammoth is never taken for a tap on the lift: they share an edge and no ground.
    expect(MAMMOTH.x + MAMMOTH.w).toBeLessThanOrEqual(LIFT.x)
  })

  it('lays the three tools on the walked grass, clear of the lift, the molehill and each other', () => {
    const boxes = tools()
    for (const box of boxes) {
      expect(boxesCross(box, LIFT)).toBe(false)
      expect(boxesCross(box, MOLEHILL)).toBe(false)
      expect(box.x).toBeGreaterThanOrEqual(GRASS.x)
      expect(box.x + box.w).toBeLessThanOrEqual(STAGE.width)
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(boxesCross(boxes[i], boxes[j])).toBe(false)
  })

  it('puts the molehill over the burrow', () => {
    expect(MOLEHILL.x + MOLEHILL.w / 2).toBe(HILL.x + (BURROW.c + 0.5) * 90)
  })
})

describe('the home control at the top centre', () => {
  it('is 48 px across, 10 px from the top and centred, in the units of the stage', () => {
    const box = homeControl(1180, 820, STAGE)
    expect(box).toEqual({ x: 566, y: 10, w: 48, h: 48 })
    const half = homeControl(590, 410, STAGE)
    expect(half).toEqual({ x: 542, y: 20, w: 96, h: 96 })
  })

  it('lies over neither the lift, the mammoth, a tool where it lies nor the molehill, on every surface from 320 px', () => {
    for (const { width, height } of surfaces()) {
      const control = homeControl(width, height, STAGE)
      for (const box of [LIFT, MAMMOTH, MOLEHILL, ...tools()]) expect(boxesCross(control, box), `${width} by ${height}`).toBe(false)
      // Nor over the hill, where every block answers a finger.
      expect(control.y + control.h, `${width} by ${height}`).toBeLessThan(HILL.y)
    }
  })

  it('lies over neither the walked grass nor the mole standing anywhere on it, on every surface a tablet gives', () => {
    for (const [width, height] of TABLETS) {
      const control = homeControl(width, height, STAGE)
      expect(boxesCross(control, GRASS), `${width} by ${height}`).toBe(false)
      for (const mole of molesOnGrass()) expect(boxesCross(control, mole), `${width} by ${height}`).toBe(false)
    }
  })

  it('clears the mole on the grass wherever the surface is at least 460 px high', () => {
    for (const { width, height } of surfaces()) {
      if (height < 460) continue
      const control = homeControl(width, height, STAGE)
      for (const mole of molesOnGrass()) expect(boxesCross(control, mole), `${width} by ${height}`).toBe(false)
    }
  })
})

describe("the grown-up's corner at the top right", () => {
  it('never reaches the hill, on every surface from 320 px', () => {
    for (const { width, height } of surfaces()) {
      const corner = cornerOf(width, height)
      expect(corner.y + corner.h, `${width} by ${height}`).toBeLessThan(HILL.y)
    }
  })

  it('lies over no tool, no walked grass and no place the mole stands, on every surface a tablet gives', () => {
    for (const [width, height] of TABLETS) {
      const corner = cornerOf(width, height)
      for (const box of [GRASS, LIFT, MAMMOTH, ...tools(), ...molesOnGrass()]) expect(boxesCross(corner, box), `${width} by ${height}`).toBe(false)
    }
  })
})

describe('the grown-up\'s corner holds no painted hand', () => {
  it('no sprayed hand lies in it on any tablet, and on the surface of the stills not even its spray', () => {
    const box = (x: number, y: number, reach: number): Box => ({ x: x - reach, y: y - reach, w: reach * 2, h: reach * 2 })
    for (const [width, height] of TABLETS) {
      const corner = cornerOf(width, height)
      for (const [x, y] of SPRAYED) expect(boxesCross(box(x, y, 36), corner), `${width} by ${height}, the hand at ${x}, ${y}`).toBe(false)
    }
    const still = cornerOf(1180, 820)
    for (const [x, y] of SPRAYED) expect(boxesCross(box(x, y, SPRAY_REACH), still)).toBe(false)
    expect(SPRAYED).toHaveLength(4)
  })
})
