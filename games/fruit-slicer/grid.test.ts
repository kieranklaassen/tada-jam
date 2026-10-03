import { describe, expect, it } from 'vitest'
import { ACTS, GRID, THINGS, answer } from './grid'
import { VOICES, notesOf } from './voices'

const cells = THINGS.flatMap((thing) => ACTS.map((act) => ({ thing, act, cell: answer(thing, act) })))

describe('the object-by-action grid', () => {
  it('is six things by five acts, and every cell has an answer', () => {
    expect(THINGS).toHaveLength(6)
    expect(ACTS).toHaveLength(5)
    expect(cells).toHaveLength(30)
    for (const thing of THINGS) expect(Object.keys(GRID[thing]).sort()).toEqual([...ACTS].sort())
    for (const { thing, act, cell } of cells) {
      expect(cell.show, `${thing} ${act}`).not.toBe('')
      expect(Object.keys(VOICES), `${thing} ${act}`).toContain(cell.voice)
    }
  })

  /** Every cell, and the two a shut tin answers differently. */
  const all = [...cells.map(({ cell }) => cell), answer('tin', 'poke', true), answer('tin', 'roll', true)]

  it('looks different in every cell, a shut tin included', () => {
    expect(new Set(all.map((cell) => cell.show)).size).toBe(32)
  })

  it('sounds different in every cell, a shut tin included', () => {
    expect(new Set(all.map((cell) => cell.voice)).size).toBe(32)
    expect(new Set(all.map((cell) => JSON.stringify(notesOf(cell.voice, 1200, 4)))).size).toBe(32)
  })

  it('answers a shut tin without opening it or marking anything, and a shut tin changes no other cell', () => {
    expect(answer('tin', 'poke', true)).toEqual({ show: 'rattles-shut', voice: 'rattle', does: 'nothing' })
    expect(answer('tin', 'roll', true)).toEqual({ show: 'drum-along-lid', voice: 'drum', does: 'nothing' })
    expect(answer('tin', 'give', true)).toEqual(answer('tin', 'give'))
    expect(answer('fruit', 'roll', true)).toEqual(answer('fruit', 'roll'))
  })

  it('makes a poke on a customer the call and the send-off as well as a flinch', () => {
    expect(answer('customer', 'poke')).toMatchObject({ show: 'flinch', does: 'call' })
  })

  it('never refuses: a cell that changes nothing is still seen and heard', () => {
    for (const { cell } of cells.filter(({ cell }) => cell.does === 'nothing')) {
      expect(cell.show).not.toBe('')
      expect(notesOf(cell.voice).length).toBeGreaterThan(0)
    }
  })

  it('cuts only what is fruit, serves only through the tin or the hand, and loses nothing but to the dog', () => {
    expect(cells.filter(({ cell }) => cell.does === 'cut').map(({ thing }) => thing)).toEqual(['fruit', 'piece'])
    expect(cells.filter(({ cell }) => cell.does === 'serve').map(({ thing, act }) => `${thing} ${act}`)).toEqual(['tin give'])
    expect(cells.filter(({ cell }) => cell.does === 'feed').map(({ thing, act }) => `${thing} ${act}`)).toEqual(['customer give'])
    for (const { thing } of cells.filter(({ cell }) => cell.does === 'toDog')) expect(['customer', 'crate', 'dog']).toContain(thing)
  })
})
