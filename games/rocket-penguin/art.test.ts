import { describe, expect, it } from 'vitest'
import { JOINTS, drawFigures, drawPage } from './art'
import { Leads } from './pencil'
import { standIn } from './recording'
import { STAGE } from './stage'
import { CATAPULT, ICE_Y } from './world'

describe('the figures', () => {
  const stand = standIn()
  const kit = { make: stand.make, leads: new Leads(stand.make), k: 2 }
  const art = drawFigures(kit)

  it('draws every figure once, each on a canvas of its own size at the pixel scale asked for', () => {
    type Drawn = { image: { width: number; height: number }; x: number; y: number; w: number; h: number }
    const all = (value: unknown, name: string): [string, Drawn][] => (value !== null && typeof value === 'object' && 'image' in value ? [[name, value as Drawn]] : Object.entries(value as object).flatMap(([key, inner]) => all(inner, `${name} ${key}`)))
    const figures = all(art, 'the')
    expect(figures.length).toBeGreaterThan(50)
    for (const [name, figure] of figures) {
      expect(figure.w, name).toBeGreaterThan(0)
      expect(figure.h, name).toBeGreaterThan(0)
      expect(Math.abs(figure.image.width - figure.w * 2), name).toBeLessThanOrEqual(1)
      expect(Math.abs(figure.image.height - figure.h * 2), name).toBeLessThanOrEqual(1)
      // No figure is as much as a third of the page: the largest is the lights in the sky.
      expect(figure.w * figure.h, name).toBeLessThan(STAGE.width * STAGE.height * 0.3)
    }
    expect(stand.tally.strokes).toBeGreaterThan(200)
  })

  it('keeps every joint inside the figure it belongs to', () => {
    const inside = (figure: { x: number; y: number; w: number; h: number }, at: readonly number[]): boolean => at[0] >= figure.x && at[0] <= figure.x + figure.w && at[1] >= figure.y && at[1] <= figure.y + figure.h
    for (const at of [...JOINTS.pilot.lenses, JOINTS.pilot.beak, JOINTS.pilot.flipper, JOINTS.pilot.farFlipper, ...JOINTS.pilot.feet, JOINTS.pilot.scarf, JOINTS.pilot.chin]) expect(inside(art.pilot, at)).toBe(true)
    for (const at of JOINTS.pouch.ties) expect(inside(art.pouch, at)).toBe(true)
    for (const at of JOINTS.fork.tips) expect(inside(art.fork, at)).toBe(true)
    expect(inside(art.sledge, JOINTS.sledge.foot)).toBe(true)
    for (const at of [...JOINTS.nearSeal.eyes, JOINTS.nearSeal.mouth, ...JOINTS.nearSeal.flippers]) expect(inside(art.nearSeal, at)).toBe(true)
    for (const at of [JOINTS.farSeal.nose, JOINTS.farSeal.flipper]) expect(inside(art.farSeal, at)).toBe(true)
    for (const at of [...JOINTS.chick.eyes, JOINTS.chick.beak]) expect(inside(art.chick, at)).toBe(true)
    for (const at of [...JOINTS.walrus.eyes, JOINTS.walrus.moustache]) expect(inside(art.walrus, at)).toBe(true)
    for (const at of [JOINTS.puffin.eye, JOINTS.puffin.glass]) expect(inside(art.puffin, at)).toBe(true)
  })

  it('stands the foot of the fork on the sledge where the world has it', () => {
    expect(JOINTS.sledge.heel[0] + JOINTS.sledge.foot[0]).toBe(CATAPULT.foot.x)
    expect(JOINTS.sledge.heel[1] + JOINTS.sledge.foot[1]).toBe(CATAPULT.foot.y)
    // The sledge stands a step back from the edge of the ice: its runner is a few units up the page from the ice line.
    expect(JOINTS.sledge.heel[1]).toBeLessThan(ICE_Y)
    expect(JOINTS.sledge.heel[1]).toBeGreaterThan(ICE_Y - 6)
    // The tips of the fork are either side of where the bands are tied in the model, and level with it.
    expect(JOINTS.fork.tips[0][0]).toBe(-JOINTS.fork.tips[1][0])
    expect(Math.abs(CATAPULT.foot.y + JOINTS.fork.tips[0][1] - CATAPULT.fork.y)).toBeLessThan(15)
  })

  it('is the same drawing every time: the pencil takes its wobble from a seed', () => {
    const calls = (): string[] => {
      const seen: string[] = []
      const ctx = new Proxy({}, { get: (_, name) => name === 'createPattern' ? () => null : (...args: unknown[]) => { seen.push(`${String(name)}(${args.map((arg) => typeof arg === 'number' ? arg.toFixed(3) : '').join(',')})`) }, set: () => true })
      const make = ((width: number, height: number) => ({ width, height, getContext: () => ctx })) as unknown as typeof stand.make
      drawFigures({ make, leads: new Leads(make), k: 1 })
      return seen
    }
    expect(calls()).toEqual(calls())
  })

  it('draws the page across the whole surface, whatever its shape', () => {
    for (const [x0, y0, x1, y1] of [[0, 0, STAGE.width, STAGE.height], [-200, 0, STAGE.width + 200, STAGE.height], [0, -300, STAGE.width, STAGE.height + 300]]) {
      const page = drawPage(kit, x0, y0, x1, y1)
      expect([page.x, page.y, page.w, page.h]).toEqual([x0, y0, x1 - x0, y1 - y0])
      expect(page.image.width).toBe((x1 - x0) * 2)
    }
  })
})
