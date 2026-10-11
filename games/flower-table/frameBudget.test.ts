import { beforeAll, describe, expect, it } from 'vitest'
import { Garden } from './garden'
import type { Guidance } from './guidance'
import { PATH_HOLDS, VISITOR } from './layout'
import { useCanvases } from './paint'
import { BED, SOIL_Y, fullOf } from './plants'
import { emptyTally, made, recordingCanvas, type Tally } from './recording'
import { deserialize, type Saved } from './save'
import { View } from './view'

// The frame budget, counted and not timed: this machine is shared, and a count
// is the same on every machine. The real view draws the real garden into a
// canvas that counts; each case is a moment a child can reach, and the last
// ones are the heaviest the game can come to. What is counted: sprites stamped
// (`drawImage`) and paths filled or stroked. The still garden is one stamp of
// the whole surface, and nothing else may cover it.

/** The most one frame may put on the surface: the bar's "about 80" for stamps, and the paths counted beside them. */
const BUDGET = { stamps: 80, pen: 32, fullSurface: 1 }
/** What a frame of the garden at rest may cost, where the game spends nearly all its time. */
const AT_REST = { stamps: 32, pen: 18 }

const tally: Tally = emptyTally()
let view: View

beforeAll(() => {
  useCanvases(() => recordingCanvas(null))
  // A tablet's surface at the pixel ratio the jam caps at.
  view = new View(recordingCanvas(tally, 2360, 1640))
  view.resize(1180, 820, 2)
})

const idle: Guidance = { glow: 0, demo: null, demoIndex: -1 }
const shown: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }

function frame(garden: Garden, guidance: Guidance): Tally & { said: number } {
  Object.assign(tally, emptyTally())
  const said = view.draw(garden, guidance)
  return { ...tally, said }
}

const top = (stem: number, len: number) => ({ stem, base: fullOf(stem) - len, len, head: true, spent: false })
const open = (more: Partial<Saved> = {}): Garden => new Garden({ ...deserialize(null, null), ...more }, 1)
const run = (garden: Garden, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += 0.05) garden.step(0.05) }

/** The fullest garden a child can make: seven tipped heads in the boot, sixteen pieces on the path, a bouquet out for every other visitor. */
function fullest(position = 'goat-jar'): Garden {
  const bunch = [0, 1, 4, 5, 0, 1, 4].map((stem, index) => ({ ...top(stem, fullOf(stem) - 20), at: index % 2 ? -8 : 8 }))
  const path = Array.from({ length: PATH_HOLDS }, (_, index) => ({ ...top(8 + (index % 2), 200), x: 60 + index * 50, y: 755 + (index % 3) * 11, rot: 1.57 }))
  return open({
    position, vase: bunch, path, bed: BED.map(() => 30),
    street: (['beekeeper', 'bride', 'aunt'] as const).map((who) => ({ who, pieces: bunch })),
  })
}

describe('the frame budget', () => {
  it('draws the garden a first visit finds well inside the budget, with the still garden as its one full-surface stamp', () => {
    const garden = open()
    run(garden, 1)
    const cost = frame(garden, idle)
    expect(cost.fullSurface).toBe(1)
    expect(cost.stamps).toBeLessThanOrEqual(AT_REST.stamps)
    expect(cost.pen).toBeLessThanOrEqual(AT_REST.pen)
    // What the grown-up's overlay is told is what was drawn.
    expect(cost.said).toBe(cost.stamps + cost.pen)
  })

  it('paints its sprites once: a frame makes no canvas, and a second frame costs the same', () => {
    const garden = open()
    const first = frame(garden, idle)
    const before = made.canvases
    const second = frame(garden, idle)
    expect(made.canvases).toBe(before)
    expect(second).toEqual(first)
  })

  it('draws what lies still on the path as one stamp, however many pieces lie there, and a falling piece by itself', () => {
    const lying = (count: number): Garden => {
      const garden = open({ path: Array.from({ length: count }, (_, index) => ({ ...top(8 + (index % 2), 200), x: 60 + index * 50, y: 755 + (index % 3) * 11, rot: 1.57 })) })
      run(garden, 1)
      return garden
    }
    const none = frame(lying(0), idle), one = frame(lying(1), idle), full = frame(lying(PATH_HOLDS), idle)
    expect(one.stamps).toBe(none.stamps + 1)
    expect(full.stamps).toBe(one.stamps)
    // One more is let fall: it is drawn by itself until it lies, and then it is in the layer with the rest.
    const garden = lying(6)
    const before = frame(garden, idle).stamps
    garden.press(BED[2].x, SOIL_Y - 100); garden.move(300, 500); garden.lift(300, 500)
    garden.step(0.05)
    expect(frame(garden, idle).stamps).toBeGreaterThan(before)
    run(garden, 3)
    expect(frame(garden, idle).stamps).toBe(before)
  })

  it('stays in budget with the whole idle ladder on: the glow on every stem and the hand', () => {
    const garden = open()
    const cost = frame(garden, shown)
    expect(cost.stamps).toBeLessThanOrEqual(BUDGET.stamps)
    expect(cost.pen).toBeLessThanOrEqual(BUDGET.pen)
    expect(cost.fullSurface).toBe(BUDGET.fullSurface)
  })

  it('stays in budget at the fullest garden there is, with a piece in the hand, every kind of loose bit in the air and the ladder on', () => {
    const garden = fullest()
    // A stalk grown back and cut again, so the blades and a piece are at the finger.
    garden.press(BED[2].x, SOIL_Y - 10); garden.lift(BED[2].x, SOIL_Y - 10)
    run(garden, 1)
    garden.press(BED[2].x, SOIL_Y - 100)
    garden.move(400, 300)
    for (const kind of ['seed', 'petal', 'fluff', 'haze', 'drop'] as const) for (let i = 0; i < 9; i++) garden.bits.push({ kind, x: 300 + i * 20, y: 300, vx: 0, vy: 0, age: 0, life: 9, size: 8, spin: 0, floor: 900 })
    garden.step(0.016)
    // The heavy moment is really here.
    expect(garden.inPot).toHaveLength(7)
    expect(garden.inPot.every((piece) => piece.bend !== 0)).toBe(true)
    expect(garden.path.length).toBe(PATH_HOLDS - 1)
    expect(garden.hand).not.toBeNull()
    expect(garden.streetSeen).toHaveLength(3)
    expect(new Set(garden.bits.map((bit) => bit.kind)).size).toBe(5)
    const cost = frame(garden, shown)
    expect(cost.stamps).toBeLessThanOrEqual(BUDGET.stamps)
    expect(cost.pen).toBeLessThanOrEqual(BUDGET.pen)
    expect(cost.fullSurface).toBe(BUDGET.fullSurface)
    expect(cost.said).toBe(cost.stamps + cost.pen)
  })

  it('stays in budget through the whole handing over of the fullest bouquet, for every visitor', () => {
    for (const position of ['goat-jar', 'beekeeper-jar', 'bride-jar', 'aunt-jar']) {
      const garden = fullest(position)
      garden.street = garden.street.filter((bouquet) => bouquet.who !== garden.turn.visitor)
      // A finger on the visitor, beside the heads that tip its way.
      let free: [number, number] | null = null
      for (let y = VISITOR.y - 150; y <= VISITOR.y + 150 && !free; y += 10) for (let x = VISITOR.x - 80; x <= VISITOR.x + 80 && !free; x += 10) if (garden.targetAt(x, y).on === 'visitor') free = [x, y]
      expect(free, position).not.toBeNull()
      garden.press(...free!)
      expect(garden.playing, position).toBe(true)
      let most = { stamps: 0, pen: 0 }, frames = 0
      while (garden.playing && frames < 400) {
        garden.step(0.05)
        const cost = frame(garden, idle)
        most = { stamps: Math.max(most.stamps, cost.stamps), pen: Math.max(most.pen, cost.pen) }
        expect(cost.fullSurface).toBe(1)
        frames++
      }
      expect(frames).toBeGreaterThan(100)
      expect(most.stamps, position).toBeLessThanOrEqual(BUDGET.stamps)
      expect(most.pen, position).toBeLessThanOrEqual(BUDGET.pen)
    }
  })

  it('stays in budget while a vase goes over and while the next visitor comes in', () => {
    const garden = open({ position: 'bride-vase', vase: [{ ...top(0, 340), at: 8 }] })
    garden.press(BED[1].x, SOIL_Y - 30)
    garden.move(garden.vaseDef.x + 16, garden.vaseDef.mouthY - 60)
    garden.lift(garden.vaseDef.x + 16, garden.vaseDef.mouthY - 60)
    expect(garden.playing).toBe(true)
    let most = 0
    while (garden.playing) { garden.step(0.05); const cost = frame(garden, idle); most = Math.max(most, cost.stamps + cost.pen) }
    const waiting = open({ finished: true, bed: BED.map(() => 30) })
    waiting.press(1100, 520)
    expect(waiting.playing).toBe(true)
    while (waiting.playing) { waiting.step(0.05); const cost = frame(waiting, idle); most = Math.max(most, cost.stamps + cost.pen) }
    expect(most).toBeLessThanOrEqual(BUDGET.stamps + BUDGET.pen)
    expect(most).toBeGreaterThan(30)
  })
})
