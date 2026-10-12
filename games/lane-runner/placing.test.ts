import { describe, expect, it } from 'vitest'
import { CHARACTERS, FOX } from './figures'
import { Game, type Sink } from './game'
import { LOADS, TAKEN_WITH, type Load } from './lapState'
import { place, type Bounds, type Quad } from './placing'
import { Pose } from './pose'
import { PLACES, ZONES } from './trail'

// Every pose value a motion computes is read by the one function that lays
// plaques out, and what a finger is read against is exactly what is drawn.

const quiet: Sink = { play: () => {}, hush: () => {}, save: () => {} }
const laid = (pose: Pose, figure = FOX): string => {
  const quads: Quad[] = []
  const n = place(figure, pose, quads)
  return JSON.stringify(quads.slice(0, n).map((quad) => [quad.tile.w, quad.tile.h, Array.from(quad.tile.cells).join(''), quad.x, quad.y, quad.z, quad.ax, quad.ay, quad.bx, quad.by, quad.flat].map((value) => (typeof value === 'number' ? Math.round(value * 1000) / 1000 : value))))
}

describe('a pose', () => {
  it('has no value the layout does not read: each one moves a plaque', () => {
    const rest = laid(new Pose(FOX))
    const changes: Record<string, (pose: Pose) => void> = {
      x: (pose) => (pose.x = 3),
      y: (pose) => (pose.y = 3),
      spin: (pose) => (pose.spin = 1),
      tilt: (pose) => (pose.tilt = 0.4),
      flip: (pose) => (pose.flip = true),
      sx: (pose) => (pose.sx = 1.2),
      sy: (pose) => (pose.sy = 0.8),
      lookX: (pose) => (pose.lookX = -1),
      lookY: (pose) => (pose.lookY = 1),
      shut: (pose) => (pose.shut = true),
      'part dx': (pose) => (pose.parts.armLeft.dx = 1),
      'part dy': (pose) => (pose.parts.armLeft.dy = 1),
      'part turn': (pose) => (pose.parts.armLeft.turn = 1),
      'part show': (pose) => (pose.parts.armLeft.show = false),
    }
    // Every field of a pose but the two the stage reads itself (`s`, below) is in the list.
    const fields = Object.keys(new Pose(FOX)).filter((name) => name !== 'parts' && name !== 'figure' && name !== 's')
    expect(fields.sort()).toEqual(Object.keys(changes).filter((name) => !name.startsWith('part')).sort())
    for (const [name, change] of Object.entries(changes)) {
      const pose = new Pose(FOX)
      change(pose)
      expect(laid(pose), name).not.toBe(rest)
    }
  })

  it('moves a thing along the trail by its `s`: the stage stands it there', () => {
    const game = new Game({ v: 1, position: 'pond', finished: false, at: PLACES.handOver - 30, lane: 1, load: 'balloons', lies: null, left: 4 }, () => null, 1, 48, quiet)
    game.press(600, 640, 1180, 820, 0)
    let clock = 0, moved = 0
    for (let i = 0; i < 60 * 4; i++) {
      clock += 1 / 60
      game.frame(1 / 60, clock)
      if (game.lap.finished) game.lift()
      for (const item of game.stage.items) {
        if (item.pose.s === 0) continue
        moved += 1
        const still = game.stage.items.find((other) => other.key === `${item.key}-fixture`)
        if (still) expect(item.s - still.s).toBeCloseTo(item.pose.s, 6)
      }
    }
    // The hedgehog walked in.
    expect(moved).toBeGreaterThan(30)
  })

  it('never puts a corner of a figure under the board, however it is turned', () => {
    for (const figure of CHARACTERS) {
      for (const tilt of [0, 0.6, Math.PI / 2, Math.PI, -2]) {
        const pose = new Pose(figure)
        pose.tilt = tilt
        const quads: Quad[] = []
        const n = place(figure, pose, quads)
        let lowest = Infinity
        for (let i = 0; i < n; i++) if (!quads[i].flat) lowest = Math.min(lowest, quads[i].y - (Math.abs(quads[i].ay) + Math.abs(quads[i].by)) / 2)
        expect(lowest, `${figure.name} tilted ${tilt}`).toBeGreaterThanOrEqual(-1e-6)
      }
    }
  })
})

describe('what a finger is read against', () => {
  it('is the box of exactly the plaques that are drawn, for every thing in every state the lap can be left in', () => {
    let checked = 0
    const states: Record<string, unknown>[] = [{ at: 0, lane: 1 }]
    for (const load of LOADS) {
      states.push({ at: 0, lane: 1, load, lies: null, left: TAKEN_WITH[load as Exclude<Load, 'none'>] })
      states.push({ at: ZONES.mud.from + 30, lane: 2, load, lies: null, left: 1, trail: { gooseRides: load === 'ladder', puddle: true, flowers: true, mushrooms: true } })
      states.push({ at: PLACES.handOver, lane: 1, finished: true, load, lies: null, left: TAKEN_WITH[load as Exclude<Load, 'none'>] })
    }
    for (const state of states) {
      const game = new Game({ v: 1, position: 'pond', finished: false, ...state }, () => null, 1, 48, quiet)
      for (const item of game.stage.items) {
        const box: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, front: -Infinity }
        for (let i = item.from; i < item.to; i++) {
          const quad = game.stage.quads[i]
          if (quad.flat) continue
          const rx = (Math.abs(quad.ax) + Math.abs(quad.bx)) / 2, ry = (Math.abs(quad.ay) + Math.abs(quad.by)) / 2
          box.minX = Math.min(box.minX, quad.x - rx)
          box.maxX = Math.max(box.maxX, quad.x + rx)
          box.minY = Math.min(box.minY, quad.y - ry)
          box.maxY = Math.max(box.maxY, quad.y + ry)
          box.front = Math.max(box.front, quad.z)
        }
        if (box.minX === Infinity) continue
        checked += 1
        for (const side of ['minX', 'maxX', 'minY', 'maxY', 'front'] as const) expect(item.bounds[side], `${item.key} ${side}`).toBeCloseTo(box[side], 6)
      }
    }
    expect(checked).toBeGreaterThan(300)
  })
})
