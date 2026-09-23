import { describe, expect, it, vi } from 'vitest'
import { TableController, type Projector } from './controller'
import { IDLE_BEFORE_HINT } from './guidance'
import { BAG, DOOR, FEEDING, SCALE } from './layout'
import { toWorld2 } from './physics3d'
import { panOf } from './scale'
import { plateOf } from './feeding'
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

  it('invites on an empty scale with one stone on a pan, and a stone on the other pan levels it', () => {
    const { table } = makeTable(6)
    run(table, 2.5)
    expect(table.state.pieces.filter((piece) => panOf(piece) === 0)).toHaveLength(1)
    expect(table.beam.angle).toBeLessThan(-0.05)
    drag(table, { x: BAG.x, y: BAG.y }, SCALE.pans[1])
    run(table, 3)
    expect(table.state.pieces.filter((piece) => panOf(piece) === 1)).toHaveLength(1)
    expect(Math.abs(table.beam.angle)).toBeLessThan(0.02)
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
    tap(table, { x: 1000, y: 900 })
    run(table, IDLE_BEFORE_HINT + 1)
    expect(table.guidance.hand).not.toBeNull()
    expect(table.guidance.hint?.kind).toBe('tapBag')
    table.pointerDown(4, { x: 1000, y: 900 }, (clock += 10))
    table.step(1 / 60)
    expect(table.guidance.hand).toBeNull()
    expect(table.guidance.glow).toBe(0)
  })

  it('wiggles the bag on first open when nobody is seated yet, and stops after the first touch', () => {
    const save = vi.fn()
    const table = new TableController({ ...defaultTable(4), seats: [false, false, false, false, false] }, { save })
    table.setProjector(topDown)
    run(table, 1.6)
    expect(table.guidance.peek).not.toBeNull()
    tap(table, { x: 1000, y: 900 })
    run(table, 6.5)
    expect(table.guidance.peek).toBeNull()
  })
})

describe('first open story beat', () => {
  it('rolls one stone out toward the hungry guest and the ghost hand carries it to that plate', () => {
    const { table } = makeTable()
    const hungry = table.wanting
    expect(hungry).not.toBeNull()
    run(table, 3)
    expect(table.guidance.hand).not.toBeNull()
    run(table, 3)
    expect(table.state.pieces).toHaveLength(1)
    expect(plateOf(table.state.pieces[0])).toBe(hungry)
    expect(table.state.bag).toBe(table.state.total - 4)
    expect(table.wanting).not.toBe(hungry)
  })

  it('ends at once when the child touches, and the stone lands where it was going', () => {
    const { table } = makeTable()
    run(table, 1.6)
    table.pointerDown(5, { x: 1000, y: 900 }, (clock += 10))
    table.step(1 / 60)
    expect(table.guidance.hand).toBeNull()
    expect(table.state.pieces).toHaveLength(1)
    expect(table.physics.stoneIds()).toHaveLength(1)
  })

  it('plays only on a brand-new table', () => {
    const { table } = makeTable()
    tap(table, { x: BAG.x, y: BAG.y })
    run(table, 6)
    expect(table.state.pieces).toHaveLength(10)
  })
})

describe('one obvious want', () => {
  it('has exactly one guest asking, and it faces the child', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 900 })
    run(table, 0.5)
    const asking = [0, 1, 2, 3, 4].filter((seat) => table.asking(seat) > 0)
    expect(asking).toEqual([table.wanting])
  })

  it('rumbles the hungry tummy while the child is idle, backing off, at most three times', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 900 })
    run(table, 2)
    expect(table.rumbles.size).toBe(0)
    run(table, 60)
    expect(table.rumbles.size).toBe(1)
  })

  it('keeps empty stools hidden until the first shared meal', () => {
    const { table } = makeTable()
    expect(table.stoolsShown).toBe(false)
    tap(table, { x: 1000, y: 900 })
    for (const seat of [1, 4]) {
      drag(table, { x: BAG.x, y: BAG.y }, FEEDING.seats[seat].plate)
      run(table, 1)
    }
    run(table, 3)
    expect(table.stoolsShown).toBe(true)
  })
})

describe('Knock-Knock', () => {
  const doorTable = () => {
    const table = new TableController({ ...defaultTable(4), liveMat: 'door', shelf: ['door', 'feeding', 'scale'] }, { save: vi.fn() })
    table.setProjector(topDown)
    return table
  }
  const knock = (table: TableController, times: number) => {
    for (let i = 0; i < times; i++) {
      tap(table, DOOR.door)
      run(table, 0.3)
    }
  }
  const out = (table: TableController) => table.door.visitors.filter((v) => v.leaveAt === null)

  it('answers three knocks with three visitors standing in groups in the yard', () => {
    const table = doorTable()
    knock(table, 3)
    run(table, 4)
    expect(out(table)).toHaveLength(3)
    knock(table, 5)
    run(table, 6)
    const sizes = [0, 1].map((g) => out(table).filter((v) => v.group === g).length)
    expect(sizes).toEqual([3, 2])
    const spots = out(table).map((v) => `${v.home.x},${v.home.y}`)
    expect(new Set(spots).size).toBe(5)
    expect(table.door.openAt).not.toBeNull()
  })

  it('sends the visitors home when the child knocks again, then answers the new count', () => {
    const table = doorTable()
    knock(table, 2)
    run(table, 4)
    knock(table, 5)
    run(table, 6)
    expect(out(table)).toHaveLength(5)
  })

  it('never lets more than ten out', () => {
    const table = doorTable()
    knock(table, 14)
    run(table, 8)
    expect(out(table)).toHaveLength(DOOR.maxVisitors)
  })

  it('peeks from the window while nobody is out, at most three times per idle stretch', () => {
    const table = doorTable()
    let peeks = 0
    let was = false
    for (let t = 0; t < 90; t += 1 / 30) {
      table.step(1 / 30)
      const now = table.doorPeek() !== null
      if (now && !was) peeks += 1
      was = now
    }
    expect(peeks).toBe(3)
  })
})
