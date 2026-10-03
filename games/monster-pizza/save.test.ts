import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { KINDS } from './kinds'
import { deserialize, freshSave, serialize, type Save } from './save'
import { CAPACITY, makeTable, pressTub, restingPieces, stepTable, tapHand } from './table'

function full(): Save {
  // The largest legal state: a customer mid-order, three kinds wanted, four tubs, a full pizza, everything shown.
  const table = makeTable(['pepper', 'cheese', 'sock', 'worm'], 3)
  for (let i = 0; i < CAPACITY; i++) {
    pressTub(table, i % 4)
    tapHand(table)
    for (let f = 0; f < 40; f++) stepTable(table, 1 / 60)
  }
  return {
    ...freshSave(null),
    position: LADDER[LADDER.length - 1],
    customer: 'fizz',
    order: { wanted: [{ kind: 'pepper', count: 4 }, { kind: 'cheese', count: 3 }, { kind: 'sock', count: 3 }], picture: 'scattered', seed: 4294967295 },
    tubs: ['pepper', 'cheese', 'sock', 'worm'],
    bigRoll: true,
    pizza: { pieces: restingPieces(table), baked: true },
    pushedBack: 2,
    waiting: { small: 'bim', big: 'grum' },
    shown: ['tap-a-tub', 'to-the-oven'],
  }
}

describe('the save', () => {
  it('reads back what it wrote, field for field', () => {
    const save = full()
    const back = deserialize(JSON.parse(JSON.stringify(serialize(save))))
    expect(back.customer).toBe('fizz')
    expect(back.order).toEqual(save.order)
    expect(back.tubs).toEqual(save.tubs)
    expect(back.bigRoll).toBe(true)
    expect(back.pizza.baked).toBe(true)
    expect(back.pizza.pieces.length).toBe(CAPACITY)
    expect(back.pushedBack).toBe(2)
    expect(back.waiting).toEqual(save.waiting)
    expect(back.shown).toEqual(save.shown)
    expect(back.position).toBe(save.position)
  })

  it('keeps the largest legal state far below half of the 64 KB cap', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(serialize(full()))).length
    expect(bytes).toBeLessThan(32 * 1024)
    expect(bytes).toBeLessThan(2048)
  })

  it('opens fresh on anything that is not its record, and on a version it does not know', () => {
    for (const raw of [null, undefined, 7, 'x', [], { v: 99, customer: 'bim' }, { customer: 'bim' }]) {
      const save = deserialize(raw, 5)
      expect(save.customer).toBeNull()
      expect(save.pizza.pieces).toEqual([])
      expect(save.finished).toBe(false)
      expect(LADDER).toContain(save.position)
    }
  })

  it('repairs each field by itself and keeps the rest', () => {
    const good = serialize(full()) as unknown as Record<string, unknown>
    const back = deserialize({ ...good, tubs: 'nope', pushedBack: 'many', shown: [1, 'to-the-oven', 'made-up'], bigRoll: 'yes', position: 'not-a-place' })
    expect(back.customer).toBe('fizz')
    // The tubs are rebuilt from the order, so every kind wanted can still be reached.
    expect(back.tubs).toEqual(['pepper', 'cheese', 'sock'])
    expect(back.pushedBack).toBe(0)
    expect(back.shown).toEqual(['to-the-oven'])
    expect(back.bigRoll).toBe(false)
    expect(back.position).toBe(LADDER[0])
    expect(back.pizza.pieces.length).toBe(CAPACITY)
  })

  it('leaves out a piece that no child could have laid: off the pizza, on another piece, of no kind, or one too many', () => {
    const good = serialize(full()) as unknown as Record<string, unknown>
    const piece = (good.pizza as { pieces: unknown[] }).pieces[0] as { kind: string; x: number; y: number }
    const pieces = [piece, { ...piece }, { kind: 'pepper', x: 3, y: 0, turn: 0 }, { kind: 'anchovy', x: 0.5, y: 0.5, turn: 0 }, { kind: 'olive', x: Number.NaN, y: 0 }, 'crumb', null]
    const back = deserialize({ ...good, pizza: { pieces, baked: 'burnt' } })
    expect(back.pizza.pieces.length).toBe(1)
    expect(back.pizza.baked).toBe(false)
    const many = Array.from({ length: 40 }, (_, i) => ({ kind: KINDS[i % 6], x: Math.cos(i) * 0.6, y: Math.sin(i) * 0.6, turn: 0 }))
    expect(deserialize({ ...good, pizza: { pieces: many, baked: true } }).pizza.pieces.length).toBeLessThanOrEqual(CAPACITY)
  })

  it('clears the counter when the card cannot be read, and never keeps a cycle finished without its customer', () => {
    const good = serialize(full()) as unknown as Record<string, unknown>
    for (const order of [null, { wanted: [] }, { wanted: [{ kind: 'pepper', count: 11 }] }, { wanted: [{ kind: 'pepper', count: 2 }, { kind: 'pepper', count: 2 }] }, { wanted: [{ kind: 'x', count: 1 }] }, { wanted: [{ kind: 'olive', count: 0.5 }] }]) {
      const back = deserialize({ ...good, order, finished: true })
      expect(back.customer).toBeNull()
      expect(back.order).toBeNull()
      expect(back.finished).toBe(false)
      expect(back.pizza.pieces).toEqual([])
      // What a child has been shown once stays shown.
      expect(back.shown).toEqual(['tap-a-tub', 'to-the-oven'])
    }
  })

  it('never seats the same customer at the counter and at the door', () => {
    const good = serialize(full()) as unknown as Record<string, unknown>
    expect(deserialize({ ...good, waiting: { small: 'fizz', big: 'grum' } }).waiting).toBeNull()
    expect(deserialize({ ...good, waiting: { small: 'bim', big: 'bim' } }).waiting).toBeNull()
    expect(deserialize({ ...good, waiting: { small: 'bim', big: 'nobody' } }).waiting).toBeNull()
  })
})
