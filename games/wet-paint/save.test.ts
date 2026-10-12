import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { VALUES } from './colours'
import { PEGS } from './layout'
import { pack, unpack } from './marble'
import { MOST_PRINTS, PLAIN, PRINT_CELLS, PRINT_GRID, deserialize, freePeg, isBlank, serialize, toolsAt, type Print, type Save } from './save'
import { STATE_VERSION } from './state'
import { CELLS } from './tray'

/** What ctx.storage hands back on the next visit. */
const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serialize(save)))

/** A water, and a print, with every value on it. */
const busy = (): string => pack(Uint8Array.from({ length: CELLS }, (_, i) => (i * 7 + (i >> 5)) % VALUES))
const picture = (seed: number): string => pack(Uint8Array.from({ length: PRINT_CELLS }, (_, i) => (i * 5 + seed) % VALUES))

const full = (): Save => ({
  v: STATE_VERSION, position: 'soap', finished: false, tray: busy(), pot: 2, tool: 'straw', used: ['comb', 'straw'],
  prints: [{ cells: picture(1), peg: 2 }, { cells: picture(2), peg: 0 }, { cells: picture(3), peg: 3 }, { cells: picture(4), peg: null }], shown: ['comb', 'straw', 'soap'],
})

describe('what the game saves', () => {
  it('round-trips every field of the sheet', () => {
    const save = full()
    expect(deserialize(stored(save), null)).toEqual(save)
    expect(Object.keys(serialize(save)).sort()).toEqual(['finished', 'position', 'pot', 'prints', 'shown', 'tool', 'tray', 'used', 'v'])
    expect(unpack(save.tray, CELLS)).toEqual(Uint8Array.from({ length: CELLS }, (_, i) => (i * 7 + (i >> 5)) % VALUES))
  })

  it('holds plain water as 14,976 characters and a print as 936: three bits to a cell, two cells to a character', () => {
    expect(PLAIN).toHaveLength(14976)
    expect(PLAIN).toHaveLength(CELLS / 2)
    expect(unpack(PLAIN, CELLS)?.every((cell) => cell === 0)).toBe(true)
    expect(PRINT_GRID).toEqual({ w: 52, h: 36 })
    expect(picture(0)).toHaveLength(936)
    expect(isBlank(PLAIN)).toBe(true)
    expect(isBlank(busy())).toBe(false)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'tray'],
    ['a list', [1, 2]],
    ['a version above this one', { ...full(), v: STATE_VERSION + 1 }],
  ])('opens on plain water with the first pot, the stick in hand and no prints for %s', (_, raw) => {
    const save = deserialize(raw, null)
    expect(save).toEqual({ v: STATE_VERSION, position: LADDER[0], finished: false, tray: PLAIN, pot: 0, tool: 'finger', used: [], prints: [], shown: [] })
  })

  it('reads the record the toy saved, which had the water and the pot only, as a game with the stick in hand', () => {
    const toy = { v: STATE_VERSION, position: 'comb', finished: false, tray: busy(), pot: 1 }
    expect(deserialize(toy, null)).toEqual({ ...toy, tool: 'finger', used: [], prints: [], shown: [] })
  })

  it('repairs each field by itself', () => {
    const good = full()
    for (const tray of [undefined, 7, '', 'short', PLAIN + 'A', PLAIN.slice(1), `${PLAIN.slice(1)}!`, { cells: [] }]) {
      expect(deserialize({ ...good, tray }, null)).toEqual({ ...good, tray: PLAIN })
    }
    for (const pot of [undefined, -1, 3, 1.5, '1', Number.NaN, null]) {
      expect(deserialize({ ...good, pot }, null)).toEqual({ ...good, pot: 0 })
    }
    for (const tool of [undefined, 'brush', 4, null, ['comb']]) expect(deserialize({ ...good, tool }, null)).toEqual({ ...good, tool: 'finger' })
    for (const used of [undefined, 'comb', 7, { comb: true }]) expect(deserialize({ ...good, used }, null)).toEqual({ ...good, used: [] })
    expect(deserialize({ ...good, used: ['comb', 'comb', 'brush', 3, 'soap'] }, null).used).toEqual(['comb', 'soap'])
    for (const shown of [undefined, 'comb', 7]) expect(deserialize({ ...good, shown }, null)).toEqual({ ...good, shown: [] })
    for (const prints of [undefined, 'x', 7, { cells: picture(1) }]) expect(deserialize({ ...good, prints }, null)).toEqual({ ...good, prints: [] })
    expect(deserialize({ ...good, position: 'brush' }, null).position).toBe(LADDER[0])
  })

  it('keeps a tool in the hand, and a tool as used, only when it lies on the table at the saved place', () => {
    const save = deserialize({ ...full(), position: 'comb' }, null)
    expect(toolsAt('comb')).toEqual(['comb'])
    expect(save.tool).toBe('finger')
    expect(save.used).toEqual(['comb'])
    expect(toolsAt('finger')).toEqual([])
    expect(toolsAt('soap')).toEqual(['comb', 'straw', 'soap'])
  })

  it('keeps the last four prints, drops a damaged one, and lets only the newest be in the cat\'s paws', () => {
    const six: Print[] = [0, 1, 2, 3, 4, 5].map((n) => ({ cells: picture(n), peg: n % PEGS.length }))
    const kept = deserialize({ ...full(), prints: six }, null).prints
    expect(kept).toHaveLength(MOST_PRINTS)
    expect(kept.map((print) => print.cells)).toEqual(six.slice(2).map((print) => print.cells))
    // No two on one peg, and every peg a real one.
    const pegs = kept.map((print) => print.peg).filter((peg) => peg !== null)
    expect(new Set(pegs).size).toBe(pegs.length)
    const damaged = deserialize({ ...full(), prints: [{ cells: 'short', peg: 0 }, { cells: picture(1), peg: 9 }, 7, { cells: picture(2), peg: null }, { cells: picture(3), peg: null }] }, null).prints
    expect(damaged.map((print) => print.cells)).toEqual([picture(1), picture(2), picture(3)])
    expect(damaged[2].peg).toBeNull()
    expect(damaged[0].peg).not.toBeNull()
    expect(damaged[1].peg).not.toBeNull()
    expect(damaged[0].peg).not.toBe(damaged[1].peg)
    expect(freePeg(damaged)).toBeGreaterThanOrEqual(0)
    expect(freePeg(PEGS.map((_, peg) => ({ cells: picture(peg), peg })))).toBe(-1)
  })

  it('takes a cycle as finished only while the water is plain, and then nothing has been used', () => {
    expect(deserialize({ ...full(), finished: true }, null).finished).toBe(false)
    const waiting = deserialize({ ...full(), finished: true, tray: PLAIN }, null)
    expect(waiting.finished).toBe(true)
    expect(waiting.used).toEqual([])
  })

  it('lets the age choose where a first visit starts and nothing after that', () => {
    expect(deserialize(undefined, null).position).toBe('finger')
    expect(deserialize(undefined, 2).position).toBe('finger')
    expect(deserialize(undefined, 3).position).toBe('finger')
    expect(deserialize(undefined, 4).position).toBe('comb')
    expect(deserialize(undefined, 5).position).toBe('straw')
    expect(deserialize(undefined, 6).position).toBe('soap')
    expect(deserialize(undefined, 12).position).toBe('soap')
    expect(FIRST_VISIT.map((row) => row.position)).toEqual([...LADDER])
    // On a first visit nothing has been shown, whatever lies on the table: each tool there is owed its showing.
    for (const age of [null, 3, 4, 5, 6, 9]) expect(deserialize(undefined, age).shown).toEqual([])
    // A saved place wins over the age, both ways.
    expect(deserialize(stored({ ...full(), position: 'finger', tool: 'finger', used: [] }), 7).position).toBe('finger')
    expect(deserialize(stored(full()), 3).position).toBe('soap')
    expect(deserialize(stored(full()), null)).toEqual(deserialize(stored(full()), 7))
  })

  it('keeps the largest state the game can save under 20 KB, well under half of the 64 KB cap', () => {
    const longest = [...LADDER].sort((a, b) => b.length - a.length)[0]
    const largest: Save = { ...full(), position: longest, finished: true }
    const size = JSON.stringify(serialize(largest)).length
    expect(size).toBeLessThan(20 * 1024)
    expect(size).toBeLessThan(32 * 1024)
  })
})
