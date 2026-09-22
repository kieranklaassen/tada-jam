import { describe, expect, it, vi } from 'vitest'
import { TableController, type Projector } from './controller'
import { IDLE_BEFORE_HINT } from './guidance'
import { BAG, SCALE } from './layout'
import { toWorld2 } from './physics3d'
import { panOf } from './scale'
import { accountedTotal, defaultTable } from './state'

// A straight-down orthographic "camera": screen pixels are world units.
const topDown: Projector = {
  toScreen: (v) => toWorld2(v),
  toPlane: (screen) => screen,
}

function makeTable(age: number | null = 4) {
  const save = vi.fn()
  const table = new TableController(defaultTable(age), { save })
  table.setProjector(topDown)
  return { table, save }
}

const run = (table: TableController, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) table.step(1 / 60)
}

let clock = 0
const tap = (table: TableController, at: { x: number; y: number }) => {
  table.pointerDown(1, at, (clock += 10))
  table.pointerUp(1, at, (clock += 80))
}
const drag = (table: TableController, from: { x: number; y: number }, to: { x: number; y: number }) => {
  table.pointerDown(2, from, (clock += 10))
  for (let i = 1; i <= 10; i++) {
    table.pointerMove(2, { x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 }, (clock += 16))
    table.step(1 / 60)
  }
  run(table, 0.2)
  table.pointerUp(2, to, (clock += 150))
}

describe('TableController', () => {
  it('tapping the bag spills every stone onto the table, conserving the total', () => {
    const { table, save } = makeTable()
    tap(table, { x: BAG.x, y: BAG.y })
    expect(table.state.bag).toBe(0)
    expect(table.state.pieces).toHaveLength(10)
    run(table, 3)
    expect(accountedTotal(table.state)).toBe(40)
    expect(table.physics.stoneIds()).toHaveLength(10)
    expect(save).toHaveBeenCalled()
  })

  it('keeps every spilled stone on the table across many random spills', () => {
    let lost = 0
    for (let n = 0; n < 40; n++) {
      const { table } = makeTable()
      tap(table, { x: BAG.x, y: BAG.y })
      run(table, 3)
      lost += 10 - table.physics.stoneIds().length
    }
    expect(lost).toBe(0)
  }, 30_000)

  it('pulls a stone from the bag and drops it into a pan, which tips the beam', () => {
    const { table } = makeTable(6)
    const pan = SCALE.pans[1]
    drag(table, { x: BAG.x, y: BAG.y }, pan)
    run(table, 2.5)
    const [piece] = table.state.pieces
    expect(panOf(piece)).toBe(1)
    expect(table.beam.angle).toBeGreaterThan(0.05)
  })

  it('lets go of a stone after a long still press', () => {
    const { table } = makeTable(6)
    drag(table, { x: BAG.x, y: BAG.y }, { x: 700, y: 850 })
    run(table, 1.5)
    const [piece] = table.state.pieces
    table.pointerDown(3, piece, (clock += 10))
    run(table, 0.8)
    table.pointerUp(3, piece, (clock += 800))
    expect(table.isHeld(piece.id)).toBe(false)
  })

  it('shows a ghost hand only after the child has been idle, and a touch hides it', () => {
    const { table } = makeTable()
    run(table, IDLE_BEFORE_HINT + 1)
    expect(table.guidance.hand).not.toBeNull()
    expect(table.guidance.hint?.kind).toBe('tapBag')
    table.pointerDown(4, { x: 1000, y: 900 }, (clock += 10))
    table.step(1 / 60)
    expect(table.guidance.hand).toBeNull()
    expect(table.guidance.glow).toBe(0)
  })

  it('wiggles the bag on first open and stops after the first touch', () => {
    const { table } = makeTable()
    run(table, 1.6)
    expect(table.guidance.peek).not.toBeNull()
    tap(table, { x: 1000, y: 900 })
    run(table, 6.5)
    expect(table.guidance.peek).toBeNull()
  })
})
