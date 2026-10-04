import { describe, expect, it } from 'vitest'
import { CAST } from './cast'
import type { Ctx } from './ink'
import { drawPage, type MakeSheet } from './journal'
import { freshLab, type LabState } from './lab'
import { layoutOf } from './layout'
import { kitAt } from './order'
import { pack } from './plant'
import { FRAME, rig } from './rig'

// The frame budget, counted and never timed: a shared runner cannot hold a
// timing, and it can hold a count. The real game is played through its
// busiest moments with the real cast, every frame is drawn onto a surface
// that only counts, and the counts are held to budgets: how many things a
// frame lays down, how many full-surface stamps it makes, how much it
// strokes and fills by hand, and how many kept drawings it has to make anew.

const SEED = 20261003
const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })

/** The budgets. A frame's laid-down things are the canvas game's draw calls: the jam's bar is about 80. */
const BUDGET = {
  draws: 80,
  fullSurfaceStamps: 1,
  /** Paths stroked or filled by hand in one frame, outside the kept drawings: the live strokes of the characters, the dust, the lines of a scene. Measured at 183 in this run. */
  handDrawn: 400,
  /** Kept drawings made in one frame once the page is warm. The worst is the frame in which the next visitor is let in: eight, for the one that leaves, the one that comes and the one that arrives at the edge. A new look that comes up makes two. */
  newSheets: 8,
  /** Kept drawings made in the whole run after the first second. Measured at 25: a visitor in motion is drawn from the kept drawings of its place and makes none of its own. */
  newSheetsInAll: 40,
  /**
   * Things laid into the kept set in one frame, on a frame in which it has to be made again (a pot lifted or
   * squashing, soil wetted or dried, a packet shaken, a sketch finished, a paper thing touched): every pot, packet,
   * kept drawing, margin sketch and tool that stands still, the pressed leaf and the frond, at most thirty-two. They go
   * onto a kept sheet, not onto the surface.
   */
  keptSet: 32,
}

function counter(w: number, h: number) {
  const counts = { strokes: 0, fills: 0, images: 0, full: 0 }
  const held: Record<string, unknown> = {}
  const gradient = { addColorStop: () => {} }
  const ctx = new Proxy(held, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'getTransform') return () => ({ a: 2 })
      if (name === 'measureText') return () => ({ width: 10 })
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient
      if (name === 'stroke') return () => { counts.strokes++ }
      if (name === 'fill') return () => { counts.fills++ }
      if (name === 'drawImage') return (...args: unknown[]) => {
        counts.images++
        // A stamp as wide and as high as the surface is the paper ground.
        const dw = args.length >= 5 ? (args[3] as number) : 0, dh = args.length >= 5 ? (args[4] as number) : 0
        if (dw >= w - 1 && dh >= h - 1) counts.full++
      }
      return () => {}
    },
    set(target, name: string, value) { target[name] = value; return true },
  }) as unknown as Ctx
  return { ctx, counts }
}

describe('a frame of the game', () => {
  it('stays inside its budgets through the busiest moments of a late page, played with the real cast', () => {
    const layout = layoutOf(1180, 820)
    const base = freshLab(null, SEED)
    const state: LabState = {
      ...base, position: 'whole-plant', kit: kitAt('whole-plant'), shown: ['sort', 'hidden', 'runner', 'water'], nextId: 20,
      plants: [...base.plants, { id: 9, pairs: RED, dry: false, row: 'tray', slot: 0, from: { how: 'seed', onto: 1, dust: 2 } }],
      visitor: { who: 'snail', at: 'whole-plant', count: 2, big: false, given: [], pods: 0 },
      sketched: [1, 5, 9, 14, 20, 27, 30, 33],
      kept: [{ who: 'bee', look: 3 }, { who: 'moth', look: 12 }, { who: 'ant', look: 7 }, { who: 'ladybird', look: 30 }],
    }
    const t = rig(state, layout, CAST)
    let sheetsMade = 0
    const make: MakeSheet = (width, height) => { sheetsMade++; return { canvas: { width, height } as unknown as CanvasImageSource, ctx: counter(width, height).ctx } }
    const worst = { draws: 0, full: 0, hand: 0, sheets: 0, kept: 0 }
    let frames = 0, sheetsAfterWarm = 0
    const drawFrame = () => {
      const { ctx, counts } = counter(layout.w, layout.h)
      const before = sheetsMade, work = { kept: 0 }
      const draws = drawPage(ctx, t.made.view(), layout, frames * FRAME, 0, make, t.made.motion, work)
      frames++
      if (frames <= 60) return
      worst.draws = Math.max(worst.draws, draws)
      worst.kept = Math.max(worst.kept, work.kept)
      worst.full = Math.max(worst.full, counts.full)
      worst.hand = Math.max(worst.hand, counts.strokes + counts.fills)
      worst.sheets = Math.max(worst.sheets, sheetsMade - before)
      sheetsAfterWarm += sheetsMade - before
    }
    t.play(1.2, drawFrame)
    // A brood, and a second while the first still grows.
    t.drag(t.where.flower(1), t.where.flower(2)); t.play(2.2, drawFrame)
    t.drag(t.where.flower(2), t.where.flower(1)); t.play(1.2, drawFrame)
    // A plant offered while the brood grows, the beetle dusted, a pot watered, the loupe over a plant.
    t.drag(t.where.pot('tray', 0), t.where.visitor()); t.play(1.5, drawFrame)
    t.drag(t.where.flower(1), t.where.beetle()); t.play(1.5, drawFrame)
    t.drag(t.where.can(), t.where.pot('shelf', 3)); t.play(1, drawFrame)
    t.drag(t.where.loupe(), { x: t.where.flower(1).x, y: t.where.flower(1).y + 46 * layout.k }, drawFrame)
    t.play(2, drawFrame)
    // The next visitor let in: one leaves, one comes, one arrives at the edge.
    t.tap(t.where.waiting()); t.play(4, drawFrame)
    // Idle, with the ladder's rings and its hand.
    t.made.step(FRAME, { glow: 1, demo: 0.5, demoIndex: 0 }); drawFrame()
    expect(frames).toBeGreaterThan(800)
    expect(worst.draws, 'things laid down in the busiest frame').toBeLessThanOrEqual(BUDGET.draws)
    expect(worst.kept, 'things laid into the kept set in one frame').toBeLessThanOrEqual(BUDGET.keptSet)
    expect(worst.full, 'full-surface stamps in a frame').toBeLessThanOrEqual(BUDGET.fullSurfaceStamps)
    expect(worst.hand, 'paths stroked or filled by hand in the busiest frame').toBeLessThanOrEqual(BUDGET.handDrawn)
    expect(worst.sheets, 'kept drawings made in one frame').toBeLessThanOrEqual(BUDGET.newSheets)
    expect(sheetsAfterWarm, 'kept drawings made after the first second').toBeLessThanOrEqual(BUDGET.newSheetsInAll)
  }, 30_000)

  it('keeps the fullest frame the game has under the bar: a brood landing on a full page, every pot and every border place taken', () => {
    const layout = layoutOf(1180, 820)
    const base = freshLab(null, SEED)
    const plants = [...base.plants]
    for (let slot = 2; slot < 6; slot++) plants.push({ id: 70 + slot, pairs: RED, dry: false, row: 'shelf', slot, from: { how: 'packet', packet: 'pink' } })
    for (let slot = 0; slot < 6; slot++) plants.push({ id: 50 + slot, pairs: RED, dry: false, row: 'tray', slot, from: { how: 'packet', packet: 'pink' } })
    for (let slot = 0; slot < 18; slot++) plants.push({ id: 30 + slot, pairs: RED, dry: false, row: 'border', slot, from: { how: 'packet', packet: 'pink' } })
    const state: LabState = {
      ...base, position: 'whole-plant', kit: kitAt('whole-plant'), shown: ['sort', 'hidden', 'runner', 'water'], nextId: 90, plants,
      visitor: { who: 'snail', at: 'whole-plant', count: 2, big: false, given: [], pods: 0 },
      sketched: [1, 5, 9, 14, 20, 27, 30, 33],
      kept: [{ who: 'bee', look: 3 }, { who: 'moth', look: 12 }, { who: 'ant', look: 7 }, { who: 'ladybird', look: 30 }],
    }
    const t = rig(state, layout, CAST)
    const make: MakeSheet = (width, height) => ({ canvas: { width, height } as unknown as CanvasImageSource, ctx: counter(width, height).ctx })
    let worst = 0, kept = 0, frames = 0
    const drawFrame = () => {
      const work = { kept: 0 }
      worst = Math.max(worst, drawPage(counter(layout.w, layout.h).ctx, t.made.view(), layout, frames++ * FRAME, 0, make, t.made.motion, work))
      if (frames > 1) kept = Math.max(kept, work.kept)
    }
    t.play(1, drawFrame)
    const rest = worst
    expect(rest, 'things laid down on a full page at rest').toBeLessThanOrEqual(BUDGET.draws)
    // The brood: six plants leave the border for the beetle's back, twelve close up, six come down from the tray, six come up.
    // Thirty plants are in motion at once; what stands still is in the kept set and costs the frame nothing.
    t.drag(t.where.flower(1), t.where.flower(2)); t.play(7, drawFrame)
    expect(worst, 'things laid down in the busiest frame of a brood on a full page').toBeLessThanOrEqual(BUDGET.draws)
    expect(kept, 'things laid into the kept set in one frame').toBeLessThanOrEqual(BUDGET.keptSet)
    // Measured when the kept set came in: 48 at rest, 63 in the busiest frame of the brood, and 25 laid into the kept set in the one frame that made it again.
  }, 30_000)

  it('hands the view no more than a bounded number of things to draw', () => {
    const t = rig(freshLab(null, SEED), layoutOf(1180, 820), CAST)
    let motes = 0, plants = 0, seeds = 0, puffs = 0
    const look = () => { const live = t.made.motion; motes = Math.max(motes, live.motes.length); plants = Math.max(plants, live.plants.size); seeds = Math.max(seeds, live.seeds.length); puffs = Math.max(puffs, live.puffs.length) }
    for (let round = 0; round < 12; round++) { t.drag(t.where.flower(1), t.where.flower(2)); t.play(0.9, look); t.tap(t.where.flower(2)); t.play(0.4, look) }
    expect(motes).toBeLessThanOrEqual(150)
    expect(plants).toBeLessThanOrEqual(40)
    expect(seeds).toBeLessThanOrEqual(12)
    expect(puffs).toBeLessThanOrEqual(24)
  })
})
