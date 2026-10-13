import { describe, expect, it } from 'vitest'
import { BALL, BERRY_LEN, ICICLE, MOST_DENTS, ON_BANK_Y, STUB, restOf, type Rest } from './blocks'
import { BERRY, firstWorld } from './first'
import { BLOCK_H, MAX_LEN, POND, SCOOPS, type Hole } from './ground'
import { MOST_BLOCKS, MOST_HOLES } from './limits'
import { deserializeClearing, legalWorld, serializeClearing, type Saved } from './save'
import { STATE_VERSION } from './state'
import { carry, cut, faults, letGo, press, run, scoop, toNight } from './testing'
import { Toy } from './toy'

/** What ctx.storage hands back on the next visit. */
const stored = (state: Saved): unknown => JSON.parse(JSON.stringify(serializeClearing(state)))
const saveOf = (toy: Toy, from: Saved): Saved => ({ ...from, ...toy.world() })
const record = (more: Record<string, unknown>): Record<string, unknown> => ({ v: STATE_VERSION, position: 'pond', finished: false, night: false, blocks: [], holes: [], drift: 0, icicles: [], ...more })

describe('the saved clearing', () => {
  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'clearing'],
    ['an array', [1, 2]],
    ['a version above the current one', { v: STATE_VERSION + 1, blocks: [], holes: [] }],
  ])('gives a first visit for %s', (_, raw) => {
    expect(deserializeClearing(raw, null)).toMatchObject({ v: STATE_VERSION, position: 'pond', finished: false, ...firstWorld(null) })
    expect(deserializeClearing(raw, 9)).toMatchObject(firstWorld(9))
  })

  it('takes the age for a first visit only: a saved clearing reads the same at every age, and no age is ever in the record', () => {
    const young = deserializeClearing(null, 5)
    for (const age of [null, 2, 5, 7, 9, 12]) expect(deserializeClearing(stored(young), age)).toEqual(young)
    const old = deserializeClearing(null, 9)
    for (const age of [null, 5, 9]) expect(deserializeClearing(stored(old), age)).toEqual(old)
    expect(JSON.stringify(stored(young))).not.toMatch(/age/i)
  })

  it('round-trips a clearing that has been played in, with every field, and reading it a second time changes nothing', () => {
    const first = deserializeClearing(null, null)
    const toy = new Toy(first, 1)
    cut(toy, 380, 720, 520, 700)
    carry(toy, 560, 606, 420, 300)
    scoop(toy, 180)
    press(toy, 318, 80)
    letGo(toy)
    run(toy, 2)
    toNight(toy)
    const saved = saveOf(toy, first)
    expect(saved).toMatchObject({ night: true, drift: 1, icicles: [0] })
    const again = deserializeClearing(stored(saved), null)
    expect(again.finished).toBe(true)
    expect(again.holes).toEqual(saved.holes)
    expect(again.blocks).toEqual(saved.blocks)
    expect(again.drift).toBe(1)
    expect(again.icicles).toEqual([0])
    expect(deserializeClearing(stored(again), null)).toEqual(again)
  })

  it('keeps a palace standing however its blocks were ordered in the record', () => {
    const palace: Rest[] = [
      restOf('clear', 220, 480, ON_BANK_Y - BLOCK_H, 'built'),
      restOf('cloudy', 80, 480, ON_BANK_Y - 2 * BLOCK_H, 'built'),
      restOf('icicle', ICICLE, 480, ON_BANK_Y, 'hung'),
      restOf('clear', 64, 402, ON_BANK_Y, 'built'),
      restOf('clear', 64, 558, ON_BANK_Y, 'built'),
    ]
    const world = legalWorld(palace, [])
    expect(world.blocks.slice(0, palace.length)).toEqual(palace)
  })

  it('repairs one damaged field and keeps the rest', () => {
    const good = stored(deserializeClearing(null, null)) as Record<string, unknown>
    expect(deserializeClearing({ ...good, holes: 'none' }, null).holes).toEqual([])
    expect(deserializeClearing({ ...good, holes: 'none' }, null).blocks.length).toBe(4)
    const noBlocks = deserializeClearing({ ...good, blocks: 7 }, null)
    expect(noBlocks.blocks.map((b) => b.kind)).toEqual(['berry'])
    expect(noBlocks.holes).toHaveLength(1)
    expect(deserializeClearing({ ...good, position: 42 }, null).position).toBe('pond')
    expect(deserializeClearing({ ...good, drift: 'deep' }, null).drift).toBe(0)
    expect(deserializeClearing({ ...good, drift: 99 }, null).drift).toBe(0)
    expect(deserializeClearing({ ...good, drift: SCOOPS }, null).drift).toBe(SCOOPS)
    expect(deserializeClearing({ ...good, icicles: [4, 4, 9, 'two', -1, 0] }, null).icicles).toEqual([4, 0])
    expect(deserializeClearing({ ...good, icicles: null }, null).icicles).toEqual([])
  })

  it('keeps dents only on a snow block, the newest four, and a cap only on a block that bears', () => {
    const state = deserializeClearing(record({
      blocks: [
        { kind: 'snow', len: 120, x: 400, y: 600, place: 'lying', dent: [-50, -30, 0, 'x', 30, 50, 9999], cap: true },
        { kind: 'clear', len: 120, x: 600, y: 600, place: 'lying', dent: [3], cap: 'yes' },
        { kind: 'ball', len: 31, x: 800, y: 600, place: 'lying', cap: true },
        { kind: 'icicle', len: STUB, x: 300, y: 600, place: 'lying', cap: true },
      ],
    }), null)
    const [snow, clear, ball, icicle] = state.blocks
    expect(snow.dent).toHaveLength(MOST_DENTS)
    expect(snow.dent).toEqual([-30, 0, 30, 50])
    expect(snow.cap).toBe(true)
    expect(clear).toMatchObject({ dent: [], cap: false })
    expect(ball).toMatchObject({ len: BALL, cap: false })
    expect(icicle).toMatchObject({ len: STUB, cap: false })
  })

  it('never opens on things inside each other, over water or in the air, whatever the record holds', () => {
    const mess = record({
      holes: [{ x: 560, y: 672, angle: 0, len: 150 }, { x: 5, y: 5, angle: 0, len: 100 }, { x: 560, y: 672, angle: 'up', len: 100 }, null, { x: 600, y: 700, angle: 1, len: 5 }],
      blocks: [
        { kind: 'clear', len: 120, x: 500, y: 300, place: 'built' },
        { kind: 'clear', len: 120, x: 510, y: 300, place: 'built' },
        { kind: 'cloudy', len: 100, x: 560, y: 672, place: 'lying' },
        { kind: 'cloudy', len: 100, x: 560, y: 672, place: 'afloat' },
        { kind: 'ball', len: 46, x: 560, y: 672, place: 'afloat' },
        { kind: 'ball', len: 46, x: 560, y: 672, place: 'afloat' },
        { kind: 'icicle', len: 44, x: 100, y: 100, place: 'hung' },
        { kind: 'icicle', len: 44, x: 300, y: 300, place: 'frozen' },
        { kind: 'berry', len: 900, x: 300, y: 700, place: 'lying' },
        { kind: 'berry', len: 78, x: 320, y: 700, place: 'lying' },
        { kind: 'granite', len: 100, x: 400, y: 700, place: 'lying' },
        { kind: 'clear', len: 100000, x: 400, y: 700, place: 'lying' },
        { kind: 'clear', len: 100, x: Number.NaN, y: 700, place: 'lying' },
        'block',
      ],
    })
    const state = deserializeClearing(JSON.parse(JSON.stringify(mess)), null)
    expect(state.holes).toEqual([{ x: 560, y: 672, angle: 0, len: 150 }])
    expect(state.blocks).toHaveLength(9)
    expect(state.blocks.find((b) => b.kind === 'berry')!.len).toBe(BERRY_LEN)
    expect(state.blocks.filter((b) => b.place === 'afloat')).toHaveLength(1)
    expect(faults(state)).toEqual([])
    // The toy opens on it at rest, and playing time changes nothing.
    const toy = new Toy(state, 1)
    run(toy, 2)
    expect(toy.world()).toEqual({ night: false, blocks: state.blocks, holes: state.holes, drift: 0, icicles: [] })
  })

  it('always has the one berry block', () => {
    expect(deserializeClearing(record({}), null).blocks).toEqual([BERRY])
  })

  it('lets night win where the two fields disagree: finished always equals night', () => {
    expect(serializeClearing(deserializeClearing(null, null))).toMatchObject({ night: false, finished: false })
    expect(deserializeClearing(record({ finished: true, night: false }), null).finished).toBe(false)
    expect(deserializeClearing(record({ finished: false, night: true }), null)).toMatchObject({ night: true, finished: true })
  })

  it('keeps a largest legal clearing under half of the 64 KB cap, and cuts a record with more than the most down to it', () => {
    const blocks: Rest[] = Array.from({ length: MOST_BLOCKS }, (_, i) => ({ kind: 'snow', len: MAX_LEN, x: 1000 + i, y: 800 - i, place: 'afloat', dent: [-100, -101, -102, -103], cap: true }))
    const holes: Hole[] = Array.from({ length: MOST_HOLES }, (_, i) => ({ x: POND.cx + i, y: POND.cy + i, angle: -3.14, len: MAX_LEN }))
    const largest: Saved = { v: STATE_VERSION, position: 'pond', finished: true, night: true, blocks, holes, drift: SCOOPS, icicles: [0, 1, 2, 3, 4] }
    expect(JSON.stringify(serializeClearing(largest)).length).toBeLessThan(32 * 1024)
    const over = deserializeClearing(JSON.parse(JSON.stringify({ ...largest, blocks: [...blocks, ...blocks], holes: [...holes, ...holes] })), null)
    expect(over.blocks).toHaveLength(MOST_BLOCKS)
    expect(over.blocks.filter((b) => b.kind === 'berry')).toHaveLength(1)
    expect(over.holes.length).toBeLessThanOrEqual(MOST_HOLES)
  })
})
