import { describe, expect, it } from 'vitest'
import { IDLE, POKE, POKE_SECONDS, idleMove, pokeMove, type Mover } from './motion'

const KINDS = Object.keys(IDLE) as Mover[]
const MOVING = KINDS.filter((kind) => kind !== 'dungBall')
/** Twenty seconds of a kind's idle at thirty samples a second, as one string. */
const trace = (kind: Mover, phase = 0) => {
  let text = ''
  for (let n = 0; n < 600; n++) {
    const m = idleMove(kind, n / 30, phase)
    text += `${m.second ? 1 : 0}${m.dx.toFixed(2)},${m.dy.toFixed(2)},${m.turn.toFixed(3)},${m.sx.toFixed(3)},${m.sy.toFixed(3)};`
  }
  return text
}

describe('idle motion', () => {
  it('gives every kind a row of its own: no shape, tempo or weight is shared', () => {
    for (const field of ['shape', 'period', 'bob', 'lean', 'squash'] as const) {
      expect(new Set(MOVING.map((kind) => IDLE[kind][field])).size, field).toBe(MOVING.length)
    }
  })

  it('moves no two kinds alike over twenty seconds', () => {
    const traces = KINDS.map((kind) => trace(kind))
    expect(new Set(traces).size).toBe(KINDS.length)
  })

  it('moves every kind but the ball, shows both of its poses, and comes round again', () => {
    for (const kind of MOVING) {
      let moved = false, first = false, second = false
      for (let n = 0; n < 600; n++) {
        const m = idleMove(kind, n / 30)
        if (m.second) second = true
        else first = true
        if (m.dx !== 0 || m.dy !== 0 || m.turn !== 0 || m.sx !== 1 || m.sy !== 1) moved = true
      }
      expect([moved, first, second], kind).toEqual([true, true, true])
      const a = idleMove(kind, 0.37, 0, { second: false, dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 })
      const b = idleMove(kind, 0.37 + IDLE[kind].period * 3, 0)
      expect(b.dy).toBeCloseTo(a.dy, 6)
      expect(b.turn).toBeCloseTo(a.turn, 6)
    }
    expect(trace('dungBall')).toBe(trace('dungBall', 0.4))
    expect(idleMove('dungBall', 3.3)).toEqual({ second: false, dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 })
  })

  it('sets two of a kind apart by their phase', () => {
    for (const kind of MOVING) expect(trace(kind, 0)).not.toBe(trace(kind, 0.37))
  })

  it('stays small: nothing idles more than a few units or a few degrees', () => {
    for (const kind of KINDS) for (let n = 0; n < 600; n++) {
      const m = idleMove(kind, n / 30)
      expect(Math.abs(m.dx)).toBeLessThanOrEqual(6.001)
      expect(Math.abs(m.dy)).toBeLessThanOrEqual(4.001)
      expect(Math.abs(m.turn)).toBeLessThanOrEqual(0.14)
      expect(Math.abs(m.sx - 1)).toBeLessThanOrEqual(0.07)
      expect(Math.abs(m.sy - 1)).toBeLessThanOrEqual(0.07)
    }
  })
})

describe('a poke', () => {
  it('is answered at once with a squash, then a hop, and is over in under a second', () => {
    for (const kind of KINDS) {
      const start = pokeMove(kind, 0.03, 0)!
      expect(start.sy, kind).toBeLessThan(1)
      expect(start.dy).toBeCloseTo(0)
      let highest = 0
      for (let t = 0.1; t < POKE_SECONDS; t += 0.01) highest = Math.max(highest, -pokeMove(kind, t, 0)!.dy)
      expect(highest, kind).toBeGreaterThan(POKE[kind][0].hop * 0.9)
      expect(pokeMove(kind, POKE_SECONDS, 0)).toBeNull()
      expect(pokeMove(kind, -1, 0)).toBeNull()
    }
    expect(POKE_SECONDS).toBeLessThan(1)
  })

  it('is answered by every kind in its own way, and by one kind in two ways taken in turn', () => {
    const shapes = KINDS.flatMap((kind) => POKE[kind].map((p) => `${p.hop}/${p.spin}/${p.squash}/${p.hops}`))
    expect(new Set(shapes).size).toBe(shapes.length)
    for (const kind of KINDS) {
      const at = (which: number) => JSON.stringify(pokeMove(kind, 0.45, which))
      expect(at(0)).not.toBe(at(1))
      expect(at(2)).toBe(at(0))
    }
  })

  it('by its weight: a fly leaps highest, the queen and a beetle barely leave the ground', () => {
    const hop = (kind: Mover) => Math.max(POKE[kind][0].hop, POKE[kind][1].hop)
    expect(hop('fly')).toBeGreaterThan(hop('raider'))
    expect(hop('raider')).toBeGreaterThan(hop('beetle'))
    expect(hop('beetle')).toBeGreaterThan(hop('queen'))
  })
})
