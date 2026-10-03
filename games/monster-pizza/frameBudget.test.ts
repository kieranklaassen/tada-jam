import { beforeAll, describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { IdleLadder } from './guidance'
import { Kitchen } from './kitchen'
import type { Kind } from './kinds'
import { PIZZA, tubPlace } from './layout'
import { useCanvases } from './marker'
import { Recording, recordingCanvases } from './recording'
import { freshSave, type Save } from './save'
import { KitchenView } from './view'

// Frame budget, counted rather than timed, so it holds on a busy CI runner.
// A frame of this game is stamps of sprites that were drawn once, plus a few
// pen lines for the parts that move (eyes, mouths, arms, a reaction). The
// real view draws into a recording context and the counts are held here, in
// the heaviest moments a child can reach.

/** What a frame may cost. Measured on 2026-10-03: 43 stamps and 61 pen strokes and fills with a full pizza, the glow and the hand; 35 and 68 at the worst of a tasting. */
const BUDGET = { stamps: 56, pen: 96, fullSurface: 1 }
const W = 1180, H = 820, RATIO = 2

let canvases: ReturnType<typeof recordingCanvases>
let surface: Recording
let view: KitchenView

beforeAll(() => {
  canvases = recordingCanvases()
  useCanvases(canvases.make)
  surface = new Recording(W * RATIO, H * RATIO)
  view = new KitchenView({ getContext: () => surface } as unknown as HTMLCanvasElement)
  view.resize(W, H, RATIO)
})

/** The busiest order there is: three kinds, ten pieces, four tubs, and a pizza filled to its twelve. */
function busy(seed: number): { kitchen: Kitchen; save: Save } {
  const kitchen = new Kitchen({ ...freshSave(null), position: LADDER[6], shown: ['tap-a-tub', 'to-the-oven'] }, seed)
  const save = kitchen.toSave()
  const tub = (kind: Kind) => tubPlace(save.tubs.indexOf(kind), save.tubs.length)
  for (let i = 0; i < 12; i++) {
    const at = tub(save.tubs[i % save.tubs.length])
    kitchen.press(at.x, at.y)
    kitchen.tap()
    for (let f = 0; f < 30; f++) kitchen.step(1 / 60)
  }
  return { kitchen, save }
}

function frame(kitchen: Kitchen, idle: number): { stamps: number; pen: number; full: number } {
  surface.reset()
  view.draw(kitchen.show(new IdleLadder(0).update(idle)))
  const full = surface.stamps.filter((s) => s.w >= W * RATIO * 0.8 && s.h >= H * RATIO * 0.8).length
  return { stamps: surface.stamps.length, pen: surface.strokes + surface.fills, full }
}

describe('frame budget', () => {
  it('draws every sprite once, when the surface is sized, and none in a frame', () => {
    const made = canvases.made()
    // The wall, the lip, the board, two ovens, two pizzas, the card, two rolls, six tubs, six pieces, five bodies, the halo, the hand, the crumbs.
    expect(made).toBeGreaterThanOrEqual(30)
    expect(made).toBeLessThanOrEqual(40)
    const { kitchen } = busy(1)
    for (let i = 0; i < 120; i++) {
      kitchen.step(1 / 60)
      frame(kitchen, i / 20)
    }
    expect(canvases.made()).toBe(made)
  })

  it('keeps a full pizza with the glow and the ghost hand inside the budget', () => {
    const { kitchen } = busy(2)
    expect(kitchen.table.pieces.length).toBe(12)
    let worst = { stamps: 0, pen: 0, full: 0 }
    for (const idle of [0, 4.5, 6.5, 7.2, 19.5]) {
      const cost = frame(kitchen, idle)
      worst = { stamps: Math.max(worst.stamps, cost.stamps), pen: Math.max(worst.pen, cost.pen), full: Math.max(worst.full, cost.full) }
    }
    // The heavy moment happened: twelve pieces, four tubs, ten pictures, three customers, five glows and the hand.
    expect(worst.stamps).toBeGreaterThanOrEqual(12 + 4 + 10 + 3 + 5)
    expect(worst.stamps).toBeLessThanOrEqual(BUDGET.stamps)
    expect(worst.pen).toBeLessThanOrEqual(BUDGET.pen)
    expect(worst.full).toBe(BUDGET.fullSurface)
  })

  it('keeps a tasting, a baking and an eating inside the budget, frame by frame', () => {
    const { kitchen } = busy(3)
    const slide = (dx: number, dy: number) => {
      kitchen.press(PIZZA.x, PIZZA.y + PIZZA.r * 0.95)
      kitchen.dragMove(PIZZA.x + dx, PIZZA.y + PIZZA.r * 0.95 + dy)
      kitchen.dragEnd()
    }
    let worst = { stamps: 0, pen: 0, full: 0 }
    const watch = (seconds: number) => {
      for (let i = 0; i < seconds * 60; i++) {
        kitchen.step(1 / 60)
        const cost = frame(kitchen, 0)
        worst = { stamps: Math.max(worst.stamps, cost.stamps), pen: Math.max(worst.pen, cost.pen), full: Math.max(worst.full, cost.full) }
        expect(cost.full).toBe(1)
      }
    }
    slide(100, 0)
    watch(3.2)
    slide(0, -60)
    expect(kitchen.busy).toBe(true)
    watch(8.5)
    expect(worst.stamps).toBeLessThanOrEqual(BUDGET.stamps)
    expect(worst.pen).toBeLessThanOrEqual(BUDGET.pen)
  })

  it('reports what it drew to the grown-up handle', () => {
    const { kitchen } = busy(4)
    const cost = frame(kitchen, 6.5)
    expect(view.draws).toBeGreaterThanOrEqual(cost.stamps - 3)
    expect(view.draws).toBeLessThan(120)
  })

  it('does a bounded amount of work in the rules, however full the pizza', () => {
    // The only loop that grows is the search for room; it is capped, and a full pizza turns a piece away without searching.
    const { kitchen, save } = busy(5)
    const at = tubPlace(0, save.tubs.length)
    const start = performance.now()
    for (let i = 0; i < 300; i++) {
      kitchen.press(at.x, at.y)
      kitchen.tap()
      kitchen.step(1 / 60)
    }
    // Counted in pieces, not in milliseconds: nothing got onto the pizza, and nothing piled up in the air.
    for (let i = 0; i < 60; i++) kitchen.step(1 / 60)
    expect(kitchen.table.pieces.length).toBe(12)
    expect(kitchen.table.flights.length).toBe(0)
    expect(performance.now() - start).toBeLessThan(5000)
  })
})
