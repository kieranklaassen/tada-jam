import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { BOWLS, GOOSE, PEGS, PIG, SHEEP, SHEPHERD } from './layout'
import { baked, cell, daub, fresh, make, setDown, settle, standIn, tally } from './probe'
import { TICK, type Toy } from './toy'
import { View } from './view'
import { BLUE, GREEN, RUSSET, WHITE, YELLOW } from './wool'

// The frame budget. The game draws on one 2D canvas, so its draw count is what
// one frame puts on that surface: a stamp of a sprite or of a canvas painted
// earlier, a stroke, or a fill, each counted as one. Stamps made into a canvas
// that is painted once (the room, a figure's pieces, a shape's own wool, the
// lit room) are baked, and are not part of a frame. The count here is taken
// by a stand-in for the surface, not by the view, and the view's own tally
// must agree with it.

const NO_GUIDANCE: Guidance = { glow: 0, demo: null, demoIndex: -1 }

/**
 * The busiest legal moment: the sheet holds its twenty shapes, among them streams and winds that run, a cloud
 * that rains on a hill, a sun that dries part of that rain with a bow standing between them, and veils; all
 * four figures stand in the picture, one of them in a coat.
 */
export function busiest(): Toy {
  const toy = fresh(GREEN, 1, 3)
  daub(toy, GREEN, 4, 39, 30, 45)
  daub(toy, WHITE, 8, 3, 22, 8)
  daub(toy, YELLOW, 34, 4, 39, 9)
  daub(toy, RUSSET, 40, 40, 56, 45)
  daub(toy, YELLOW, 60, 40, 69, 45)
  for (let i = 0; i < 4; i++) daub(toy, BLUE, 34 + i * 9, 20 + (i % 2) * 6, 39 + i * 9, 22 + (i % 2) * 6)
  for (let i = 0; i < 3; i++) daub(toy, BLUE, 44 + i * 9, 3 + (i % 2) * 5, 50 + i * 9, 5 + (i % 2) * 5)
  daub(toy, YELLOW, 4, 20, 9, 26)
  daub(toy, RUSSET, 14, 18, 18, 30)
  daub(toy, GREEN, 22, 20, 28, 26)
  daub(toy, WHITE, 60, 30, 70, 34)
  daub(toy, RUSSET, 62, 12, 69, 15)
  // Veils: a lit hill, a wet trunk.
  daub(toy, YELLOW, 24, 40, 29, 44)
  daub(toy, BLUE, 14, 22, 18, 26)
  daub(toy, GREEN, 46, 32, 52, 35)
  settle(toy)
  setDown(toy, SHEEP, 10, 40)
  setDown(toy, SHEPHERD, 18, 40)
  setDown(toy, GOOSE, 37, 23)
  setDown(toy, PIG, 48, 42)
  settle(toy)
  // White wool drawn across the pig: a cloud on its head.
  toy.hand = WHITE
  toy.press({ x: toy.folk[PIG].x - 80, y: toy.folk[PIG].y - 30 })
  toy.move({ x: toy.folk[PIG].x, y: toy.folk[PIG].y - 30 })
  toy.advance(TICK)
  toy.end('dragEnd')
  settle(toy)
  return toy
}

/** The most one frame draws over six seconds in which everything is touched, by the surface's own count. */
function most(toy: Toy, view: View): number {
  const surface = tally(), c = standIn(surface)
  let top = 0
  for (let frame = 0; frame < 360; frame++) {
    const beat = frame % 60, turn = Math.floor(frame / 60)
    if (beat === 0) { toy.press({ x: toy.folk[turn % 4].x, y: toy.folk[turn % 4].y - 20 }); toy.end('tap') }
    if (beat === 6) { toy.press(PEGS[turn % 3]); toy.end('tap') }
    if (beat === 10) { toy.press({ x: BOWLS[turn % 5].x, y: BOWLS[0].y - 16 }); toy.end('tap') }
    if (beat === 14 && toy.mothAt()) { toy.press(toy.mothAt()!); toy.end('tap') }
    if (beat === 20) { toy.hand = turn % 2 ? 5 : GREEN; toy.press(cell(60, 24)) }
    if (beat > 20 && beat < 50) toy.move(cell(60 - (beat - 20), 24 + (turn % 3)))
    if (beat === 50) toy.end('dragEnd')
    toy.advance(TICK)
    surface.draws = 0
    view.draw(c, toy, NO_GUIDANCE)
    expect(view.draws).toBe(surface.draws)
    top = Math.max(top, surface.draws)
  }
  return top
}

function viewOf(toy: Toy, tier = TIERS[0]): View {
  const view = new View(make)
  view.setTier(tier, toy)
  view.resize(1180, 820, tier.dpr, { scale: 1, x: 0, y: 0 })
  view.load(toy)
  return view
}

describe('the frame budget', () => {
  it('builds the busiest legal moment: twenty shapes, rain, a sun that dries it, a bow, and four figures in the picture', () => {
    const toy = busiest()
    expect(toy.sheet.shapes).toHaveLength(20)
    expect(toy.weather.rains.length).toBeGreaterThan(0)
    expect(toy.weather.bows.length).toBeGreaterThan(0)
    expect(toy.sheet.shapes.filter((shape) => shape.kind === 'stream' || shape.kind === 'wind').length).toBeGreaterThanOrEqual(6)
    expect(toy.sheet.shapes.some((shape) => shape.veil >= 0)).toBe(true)
    expect(toy.folk.every((figure) => figure.at !== null)).toBe(true)
    expect(toy.folk[PIG].coat).toBe(WHITE)
  })

  it('draws the busiest legal moment in under 80 draws at every tier, by the surface count', () => {
    const tops = TIERS.map((tier) => { const toy = busiest(); return most(toy, viewOf(toy, tier)) })
    for (const top of tops) expect(top).toBeLessThan(80)
    expect(tops[0]).toBeGreaterThan(55)
    // The one draw number the game reports: the most of any frame at full quality.
    expect(tops[0]).toBe(DRAW_NUMBER)
    // What each cheaper tier reaches, as the art guide gives it.
    expect(tops).toEqual([DRAW_NUMBER, 74, 73, 71])
  })

  it('keeps the idle guidance inside the budget: the glow, the ghost hand, and the wool it lays', () => {
    for (const [toy, extra] of [[fresh(), 3], [busiest(), 3]] as const) {
      const view = viewOf(toy), surface = tally(), c = standIn(surface)
      toy.advance(4)
      view.draw(c, toy, NO_GUIDANCE)
      const without = surface.draws
      surface.draws = 0
      view.draw(c, toy, { glow: 1, demo: 0.7, demoIndex: 0 })
      expect(surface.draws).toBe(without + extra)
      expect(surface.draws).toBeLessThan(80)
    }
  })

  it('stamps the lit room whole once a frame, and puts it together again only when something in it changes', () => {
    const toy = busiest(), view = viewOf(toy), surface = tally(), c = standIn(surface)
    toy.advance(3)
    view.draw(c, toy, NO_GUIDANCE)
    const composed = view.lit.composed
    for (let frame = 0; frame < 120; frame++) { toy.advance(TICK); view.draw(c, toy, NO_GUIDANCE) }
    expect(view.lit.composed).toBe(composed)
    toy.press({ x: BOWLS[2].x, y: BOWLS[2].y - 16 })
    toy.end('tap')
    toy.advance(TICK)
    view.draw(c, toy, NO_GUIDANCE)
    expect(view.lit.composed).toBe(composed + 1)
  })

  it('bakes the wool when it is laid and not in a frame: a still frame stamps nothing into a shape', () => {
    const toy = busiest(), view = viewOf(toy), c = standIn(tally())
    toy.advance(2)
    view.draw(c, toy, NO_GUIDANCE)
    view.patches.baked = 0
    const before = baked.draws
    for (let frame = 0; frame < 30; frame++) { toy.advance(TICK); view.draw(c, toy, NO_GUIDANCE) }
    expect(view.patches.baked).toBe(0)
    expect(baked.draws).toBe(before)
    toy.hand = GREEN
    toy.press(cell(60, 8))
    view.draw(c, toy, NO_GUIDANCE)
    expect(view.patches.baked).toBeGreaterThan(0)
  })
})

/** The draw number: the most draws of any frame at the busiest legal moment, at full quality. */
const DRAW_NUMBER = 75
