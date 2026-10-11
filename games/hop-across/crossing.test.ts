import { describe, expect, it } from 'vitest'
import { CLOTH_COL, HOME_COL, ROWS, hasRails, step, type Board, type Lane } from './board'
import { LADDER } from './config'
import { CROSSING_LANES, LAYOUTS, SEEDS, THINGS, holds, lay, layout } from './crossing'
import { duckInLane } from './duck'
import { HORIZON, PHASES, boardLanes, solve, timeline, unsolved } from './solver'

const every = (): { position: string; which: number; lanes: Lane[] }[] => LADDER.flatMap((position) => Array.from({ length: LAYOUTS }, (_, which) => ({ position, which, lanes: layout(position, which) })))

describe('the layouts', () => {
  it('has the same number of layouts for every position of the order, each different', () => {
    for (const position of LADDER) {
      expect(SEEDS[position], position).toHaveLength(LAYOUTS)
      expect(new Set(Array.from({ length: LAYOUTS }, (_, which) => JSON.stringify(layout(position, which)))).size, position).toBe(LAYOUTS)
    }
  })

  it('lays seven lanes, the first of them grass or a road of cars, and rails only after the bell is in the order', () => {
    for (const { position, which, lanes } of every()) {
      const name = `${position} ${which}`
      expect(lanes, name).toHaveLength(CROSSING_LANES)
      expect(lanes[0].kind === 'grass' || (lanes[0].kind === 'road' && lanes[0].movers.every((mover) => mover.kind === 'car')), name).toBe(true)
      const at = LADDER.indexOf(position)
      lanes.forEach((lane, i) => {
        if (lane.movers.some((mover) => mover.kind === 'lorry')) expect(at, name).toBeGreaterThanOrEqual(LADDER.indexOf('lorry'))
        if (lane.kind === 'river') expect(at, name).toBeGreaterThanOrEqual(LADDER.indexOf('logs'))
        if (lane.movers.some((mover) => mover.kind === 'turtle')) expect(at, name).toBeGreaterThanOrEqual(LADDER.indexOf('turtle'))
        if (hasRails(lane.kind)) {
          expect(at, name).toBeGreaterThanOrEqual(LADDER.indexOf('bell'))
          expect(lane.train, name).toBeDefined()
          // The plate lies on the grass before the rails, or between the rails in the last position.
          if (lane.bell?.dc === -1) expect(lanes[i - 1].kind, name).toBe('grass')
          else expect(position, name).toBe('all')
        } else expect(lane.train, name).toBeUndefined()
      })
    }
  })

  it('brings one new thing with each of the first five positions, and none after', () => {
    const held = (position: string) => THINGS.filter((thing) => Array.from({ length: LAYOUTS }, (_, which) => layout(position, which)).some((lanes) => lanes.some((lane) => holds(lane, thing))))
    expect(held('cars')).toEqual(['cars'])
    expect(held('lorry')).toEqual(['cars', 'lorry'])
    expect(held('logs')).toEqual(['cars', 'lorry', 'logs'])
    expect(held('turtle')).toEqual(['cars', 'lorry', 'logs', 'turtle'])
    for (const position of LADDER.slice(4)) expect(held(position), position).toContain('bell')
    // The new thing of a position is in every one of its layouts.
    THINGS.forEach((thing) => {
      for (let which = 0; which < LAYOUTS; which++) expect(layout(thing, which).some((lane) => holds(lane, thing)), `${thing} ${which}`).toBe(true)
    })
  })

  it('has a way across with no mishap from every square she can start on, at every phase of the lanes', () => {
    for (const { position, which, lanes } of every()) expect(unsolved(lanes), `${position} ${which}`).toBeNull()
  }, 60000)

  it('finds ways that the board itself agrees with: replayed through the real step, she arrives dry and round', () => {
    for (const { position, which, lanes } of every()) {
      const ten = boardLanes(lanes)
      const line = timeline(ten, PHASES + HORIZON)
      for (let row = 1; row < ROWS; row++) {
        const found = solve(line, [row], 0, HORIZON)!
        let board: Board = { lanes: ten, family: [{ c: HOME_COL, r: row, flat: false, on: null, dry: { c: HOME_COL, r: row } }] }
        for (const hop of found.hops) {
          const did = step(board, hop)
          board = did.board
          expect(did.events.filter((event) => event.type === 'flatten' || event.type === 'spit' || event.type === 'bell' || event.type === 'knock'), `${position} ${which} row ${row}`).toEqual([])
        }
        expect(board.family[0].c, `${position} ${which} row ${row}`).toBe(CLOTH_COL)
      }
    }
  }, 60000)

  it('gives the duck a lane past the first for every thing a crossing holds', () => {
    for (const { position, which, lanes } of every()) {
      for (const thing of THINGS) {
        if (!lanes.some((lane) => holds(lane, thing))) continue
        const show = lanes.map((lane, i) => (i >= 1 && holds(lane, thing) ? duckInLane(lane, i + 1, thing) : null)).find((one) => one)
        expect(show, `${position} ${which} ${thing}`).toBeTruthy()
        expect([3, 4], `${position} ${which} ${thing}`).toContain(show!.steps.length)
      }
    }
  })
})

describe('laying from the seeded stream', () => {
  it('gives the same crossing for the same seed, and carries the stream on', () => {
    const one = lay('logs', 7), again = lay('logs', 7)
    expect(again).toEqual(one)
    expect(one.seed).not.toBe(7)
    expect(one.crossing.from).toBe('logs')
    const seen = new Set<string>()
    let seed = 3
    for (let i = 0; i < 200; i++) {
      const next = lay('cars', seed)
      seen.add(JSON.stringify(next.crossing.lanes))
      seed = next.seed
    }
    expect(seen.size).toBeGreaterThan(LAYOUTS / 2)
  })

  it('lays an id it does not know from the first position', () => {
    expect(lay('nowhere', 1).crossing.from).toBe(LADDER[0])
  })
})
