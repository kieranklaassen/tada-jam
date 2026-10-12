import { describe, expect, it } from 'vitest'
import { POKE, RIM, blank, cut, decode, encode, goneShare, inFrame, isGone, opening, poke, type Cell } from './face'

const square = (x: number, y: number, side: number): Cell[] => [{ x, y }, { x: x + side, y }, { x: x + side, y: y + side }, { x, y: y + side }]
const count = (face: { gone: Uint8Array }): number => face.gone.reduce((sum, cell) => sum + cell, 0)

describe('a cut in a face', () => {
  it('takes out what the path encloses, and the path itself', () => {
    const face = blank(88, 64)
    const taken = cut(face, square(20, 20, 20))
    expect(taken).toBe(count(face))
    // The inside, the corners the blades went round, and nothing well outside.
    expect(isGone(face, 30, 30)).toBe(true)
    expect(isGone(face, 20, 20)).toBe(true)
    expect(isGone(face, 45, 30)).toBe(false)
    expect(taken).toBeGreaterThan(20 * 20)
    expect(taken).toBeLessThan(24 * 24)
  })

  it('is the same hole whichever way round the finger went', () => {
    const one = blank(88, 64), other = blank(88, 64)
    cut(one, square(20, 20, 20))
    cut(other, [...square(20, 20, 20)].reverse())
    expect(encode(one)).toBe(encode(other))
  })

  it('leaves a slit where the path encloses nothing, so a straight cut is still a hole', () => {
    const face = blank(88, 64)
    expect(cut(face, [{ x: 10, y: 30 }, { x: 40, y: 30 }])).toBeGreaterThan(30)
    expect(isGone(face, 25, 30)).toBe(true)
    expect(isGone(face, 25, 34)).toBe(false)
  })

  it('joins a cut to the hole it crosses, and takes nothing twice', () => {
    const face = blank(88, 64)
    const first = cut(face, square(20, 20, 20)), second = cut(face, square(30, 20, 20))
    expect(second).toBeLessThan(first)
    expect(count(face)).toBe(first + second)
    expect(cut(face, square(24, 24, 8))).toBe(0)
  })

  it('never reaches the frame of the face, wherever the finger goes', () => {
    const face = blank(88, 64)
    cut(face, [{ x: -50, y: -50 }, { x: 500, y: -50 }, { x: 500, y: 500 }, { x: -50, y: 500 }].map((at) => inFrame(face, at)))
    poke(face, { x: 0, y: 0 })
    for (let y = 0; y < 64; y++) for (let x = 0; x < 88; x++) if (x < RIM || y < RIM || x >= 88 - RIM || y >= 64 - RIM) expect(isGone(face, x, y)).toBe(false)
    expect(goneShare(face)).toBeGreaterThan(0.8)
  })

  it('pokes a round peep-hole with a tap', () => {
    const face = blank(88, 64)
    const taken = poke(face, { x: 40, y: 30 })
    expect(taken).toBeGreaterThan(Math.PI * (POKE - 1) ** 2)
    expect(taken).toBeLessThan(Math.PI * (POKE + 1) ** 2)
  })
})

describe('the widest round part of a hole', () => {
  it('is the middle of a square hole, with half its side as the radius', () => {
    const face = blank(88, 64)
    cut(face, square(20, 20, 20))
    const hole = opening(face, 30 * 88 + 30)!
    expect(hole.x).toBeGreaterThan(28); expect(hole.x).toBeLessThan(32)
    expect(hole.y).toBeGreaterThan(28); expect(hole.y).toBeLessThan(32)
    expect(hole.radius).toBeGreaterThan(9); expect(hole.radius).toBeLessThan(13)
    expect(face.gone[hole.cell]).toBe(1)
  })

  it('is found in the wide part of a hole that starts as a slit', () => {
    const face = blank(88, 64)
    cut(face, [{ x: 6, y: 10 }, { x: 40, y: 10 }])
    cut(face, square(40, 5, 16))
    const hole = opening(face, 10 * 88 + 8)!
    expect(hole.x).toBeGreaterThan(42)
    expect(hole.radius).toBeGreaterThan(6)
  })

  it('is nothing where the board is whole', () => {
    expect(opening(blank(88, 64), 100)).toBeNull()
  })
})

describe('the grid as it is saved', () => {
  it('comes back cell for cell', () => {
    const face = blank(88, 64)
    cut(face, square(20, 20, 20)); poke(face, { x: 70, y: 12 })
    const back = decode(encode(face), 88, 64)!
    expect([...back.gone]).toEqual([...face.gone])
  })

  it('is refused when it is not a grid of this size, and never reads a hole into the frame', () => {
    expect(decode(undefined, 88, 64)).toBeNull()
    expect(decode('AAAA', 88, 64)).toBeNull()
    expect(decode('!'.repeat(Math.ceil((88 * 64) / 6)), 88, 64)).toBeNull()
    const all = decode('_'.repeat(Math.ceil((88 * 64) / 6)), 88, 64)!
    expect(isGone(all, 0, 0)).toBe(false)
    expect(isGone(all, 40, 30)).toBe(true)
  })
})
