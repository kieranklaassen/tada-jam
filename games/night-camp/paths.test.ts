import { describe, expect, it } from 'vitest'
import { boardFor, type Point } from './board'
import { LADDER } from './config'
import { alongWay, clearLine, open, rounds, wayBetween, wayLength } from './paths'
import { SITES } from './world'

const boards = LADDER.flatMap((position) => SITES[position].map((site) => boardFor(1180, 820, site)))
const name = (board: (typeof boards)[number]) => `${board.site.position} ${SITES[board.site.position].indexOf(board.site)}`
/** The legs of a way that lie between its first open spot and its last: everything but leaving and arriving. */
const middle = (board: (typeof boards)[number], way: Point[]) => { const from = open(board, way[0]) ? 0 : 1, to = open(board, way[way.length - 1]) ? way.length - 1 : way.length - 2; return way.slice(from, to + 1) }

describe('a way through the camp', () => {
  it('starts where it is asked to and ends where it is asked to', () => {
    for (const board of boards) for (const camper of board.campers) {
      const way = wayBetween(board, camper.middle, { x: board.dog.at.x, y: board.walkway })
      expect(way[0]).toEqual(camper.middle)
      expect(way[way.length - 1]).toEqual({ x: board.dog.at.x, y: board.walkway })
      expect(way.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('passes through no tent, no camper, no lantern and not the fire, from every camper to every other, at every site', () => {
    for (const board of boards) for (const a of board.campers) for (const b of board.campers) {
      if (a === b) continue
      const inner = middle(board, wayBetween(board, a.middle, b.head))
      for (let i = 1; i < inner.length; i++) expect(clearLine(board, inner[i - 1], inner[i]), `${a.who} to ${b.who} at ${name(board)}, leg ${i}`).toBe(true)
      for (const corner of inner) for (const round of rounds(board)) expect(Math.hypot(corner.x - round.x, corner.y - round.y), `${a.who} to ${b.who} at ${name(board)}`).toBeGreaterThan(round.r - 10 * board.u)
    }
  })

  it('reaches the stream, the walkway and the fire\'s edge from every camper', () => {
    for (const board of boards) for (const camper of board.campers) {
      for (const to of [board.pool, { x: board.rodX, y: board.walkway }, { x: board.fire.x, y: board.fire.y + 80 * board.u }]) {
        const way = wayBetween(board, camper.middle, to), inner = middle(board, way)
        expect(wayLength(way), `${camper.who} at ${name(board)}`).toBeLessThan(2600)
        for (let i = 1; i < inner.length; i++) expect(clearLine(board, inner[i - 1], inner[i]), `${camper.who} at ${name(board)}`).toBe(true)
      }
    }
  })

  it('never goes down among the rods or onto the folded edge', () => {
    for (const board of boards) for (const camper of board.campers) for (const corner of wayBetween(board, camper.middle, board.pool)) {
      expect(corner.y).toBeLessThan(board.walkway + 14 * board.u)
      expect(corner.x).toBeLessThan(board.flap.top)
    }
  })

  it('is the same way every time, and a point along it moves from its start to its end', () => {
    const board = boards[boards.length - 1], a = board.campers[0].middle, b = board.campers[2].head
    expect(wayBetween(board, a, b)).toBe(wayBetween(board, a, b))
    const way = wayBetween(board, a, b), long = wayLength(way)
    expect(alongWay(way, 0).at).toEqual(a)
    expect(alongWay(way, long + 50).at).toEqual(b)
    let last = a
    for (let far = 0; far <= long; far += long / 20) { const now = alongWay(way, far).at; expect(Math.hypot(now.x - last.x, now.y - last.y)).toBeLessThan(long / 20 + 1); last = now }
  })
})
