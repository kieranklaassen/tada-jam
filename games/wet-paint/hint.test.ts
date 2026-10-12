import { describe, expect, it } from 'vitest'
import { Turns, moveFor, type Table } from './hint'
import { HELD, PEGS, POT, TOOL_IDS, inRect, onWater, whatIsAt, type Laid } from './layout'

const plain: Table = { inked: false, pot: 0, tool: 'finger', tools: [], held: false, free: 0 }
const laid = (table: Table): Laid => ({ birdX: 0, tools: table.tools, held: table.held, hung: PEGS.map((_, peg) => table.free < 0 || peg < table.free) })

describe('the move the ghost hand shows', () => {
  it('is a touch on the water while the water is plain', () => {
    for (let index = 0; index < 4; index++) {
      const move = moveFor(index, plain)
      expect(move.kind).toBe('tap')
      expect(onWater(move.x, move.y)).toBe(true)
    }
  })

  it('takes a print in the paws up to a free peg every other time, over plain water, and never when no peg is free', () => {
    const holding: Table = { ...plain, held: true, free: 2 }
    expect(moveFor(0, holding).kind).toBe('tap')
    const up = moveFor(1, holding)
    expect(up.kind).toBe('pull')
    if (up.kind === 'pull') {
      expect(inRect(up.x, up.y, HELD)).toBe(true)
      expect(whatIsAt(up.x, up.y, laid(holding))).toEqual({ kind: 'held' })
      expect(up.toX).toBe(PEGS[2].x)
      expect(up.toY).toBeLessThan(HELD.y - 30)
    }
    expect(moveFor(1, { ...holding, free: -1 }).kind).toBe('tap')
  })

  it('offers one next act at a time once there is colour: the paper at the very next pause, then a pull, the next pot, the newest tool', () => {
    const inked: Table = { ...plain, inked: true }
    const paper = moveFor(0, inked)
    expect(paper.kind).toBe('tap')
    expect(whatIsAt(paper.x, paper.y, laid(inked))).toEqual({ kind: 'paper' })
    const first = moveFor(1, inked)
    expect(first.kind).toBe('pull')
    if (first.kind === 'pull') {
      expect(onWater(first.x, first.y)).toBe(true)
      expect(onWater(first.toX, first.toY)).toBe(true)
      expect(Math.hypot(first.toX - first.x, first.toY - first.y)).toBeGreaterThan(150)
    }
    for (let pot = 0; pot < POT.ys.length; pot++) {
      const dip = moveFor(2, { ...inked, pot })
      expect(dip.kind).toBe('tap')
      expect(whatIsAt(dip.x, dip.y, laid(inked))).toEqual({ kind: 'pot', pot: (pot + 1) % POT.ys.length })
    }
    // With no tool on the table the fourth showing is the pull again, and then the paper comes round.
    expect(moveFor(3, inked)).toEqual(first)
    expect(moveFor(4, inked)).toEqual(paper)
  })

  it('shows the newest tool on the table and no other: taken up when it lies there, used when it is in the hand', () => {
    TOOL_IDS.forEach((tool, index) => {
      const tools = TOOL_IDS.slice(0, index + 1), lying: Table = { ...plain, inked: true, tools }
      const take = moveFor(3, lying)
      expect(take.kind).toBe('tap')
      expect(whatIsAt(take.x, take.y, laid(lying))).toEqual({ kind: 'tool', tool })
      const use = moveFor(3, { ...lying, tool })
      expect(use.kind).toBe(tool === 'comb' ? 'pull' : 'tap')
      expect(onWater(use.x, use.y)).toBe(true)
    })
    // The straw and the soap work with a touch, so with one of them in hand the showing on the water is a touch too.
    expect(moveFor(1, { ...plain, inked: true, tools: TOOL_IDS, tool: 'soap' }).kind).toBe('tap')
  })

  it('does not start again at the paper after every touch: each stillness goes on to the next thing not shown since the last print', () => {
    const turns = new Turns()
    // A stillness: the glow comes up, on the first turn's thing, and the hand shows it.
    expect(turns.turn(-1, false, true)).toBe(0)
    expect(turns.turn(-1, true, true)).toBe(0)
    expect(turns.turn(0, true, true)).toBe(0)
    // Between showings the glow stays on the thing last shown.
    expect(turns.turn(-1, true, true)).toBe(0)
    // The child touches: the ladder goes back to the bottom. The next stillness begins at the second turn.
    expect(turns.turn(-1, false, true)).toBe(1)
    expect(turns.turn(-1, true, true)).toBe(1)
    expect(turns.turn(0, true, true)).toBe(1)
    expect(turns.turn(1, true, true)).toBe(2)
    expect(turns.turn(-1, true, true)).toBe(2)
    // Another touch, during a showing: that one counts as shown.
    expect(turns.turn(-1, false, true)).toBe(3)
    // Four showings at most in one stillness, as the ladder has it, and then it is quiet: the turns go round.
    for (let index = 0; index < 4; index++) expect(turns.turn(index, true, true)).toBe(3 + index)
    expect(turns.turn(-1, false, true)).toBe(7)
    // So a child who touches between showings is shown the pull, the pot and the tool, and not only the print.
    const inked: Table = { ...plain, inked: true, tools: ['comb'] }
    const kinds = [0, 1, 2, 3].map((turn) => {
      const move = moveFor(turn, inked)
      return whatIsAt(move.x, move.y, laid(inked)).kind
    })
    expect(kinds).toEqual(['paper', 'water', 'pot', 'tool'])
    // A print leaves plain water, and the count begins again: the paper is the first thing shown on the next tray.
    expect(turns.turn(-1, false, false)).toBe(0)
    expect(turns.turn(-1, false, true)).toBe(0)
    // A touch before anything was shown moves nothing on.
    expect(turns.turn(-1, false, true)).toBe(0)
  })

  it('never points at a thing that is not there to touch', () => {
    for (const inked of [false, true]) for (const held of [false, true]) for (let count = 0; count <= TOOL_IDS.length; count++) for (let index = 0; index < 8; index++) {
      const table: Table = { inked, pot: index % 3, tool: 'finger', tools: TOOL_IDS.slice(0, count), held, free: held ? 1 : 0 }
      const move = moveFor(index, table)
      expect(['water', 'pot', 'tool', 'paper', 'held']).toContain(whatIsAt(move.x, move.y, laid(table)).kind)
    }
  })
})
