import { describe, expect, it } from 'vitest'
import { BALL, ICICLE, ON_BANK_Y, restOf, type Kind, type Rest } from './blocks'
import { BLOCK_H, BUILD, GROUND_Y } from './ground'
import { BESIDE, KING_WIDE, LIGHT_Y, MOST_LAMPS, RIM, castPoint, hollows, lampsOf, nightOf, seatOf, widestGap } from './night'

// The night is worked out from what stands on the bank and nothing else. The
// last column of the design sheet's grid is here: what a lamp's light does at
// each of the six things.

const row = (n: number): number => ON_BANK_Y - n * BLOCK_H
const on = (kind: Kind, len: number, x: number, n: number): Rest => restOf(kind, len, x, row(n), 'built')
/** Two posts and a lintel: one hollow, 96 wide, under the lintel. */
const gate = (lintel: Kind = 'clear', x = 480): Rest[] => [on('clear', 64, x - 80, 0), on('clear', 64, x + 80, 0), on(lintel, 224, x, 1)]

describe('hollows and lamps', () => {
  it('finds the free place under a block, and none under a block that stands on the snow', () => {
    expect(hollows([on('clear', 200, 480, 0)])).toEqual([])
    expect(hollows(gate())).toEqual([{ x: 480, y: row(0), w: 96 }])
  })

  it('hangs one lamp in each hollow from left to right, six at most', () => {
    const many = [0, 1, 2, 3].flatMap((i) => gate('clear', 300 + i * 140).slice(0, 2)).concat([on('clear', 300, 370, 1), on('clear', 300, 670, 1)])
    const lamps = lampsOf(many)
    expect(lamps.length).toBeLessThanOrEqual(MOST_LAMPS)
    expect(lamps.every((lamp) => lamp.hung)).toBe(true)
    expect(lamps.map((lamp) => lamp.x)).toEqual([...lamps.map((lamp) => lamp.x)].sort((a, b) => a - b))
  })

  it('stands the frost children’s two lamps on the snow beside the wall when it has no hollow, outside the stretch a palace is built on', () => {
    const lamps = lampsOf([on('clear', 200, 480, 0)])
    expect(lamps).toEqual(BESIDE.map((place) => ({ ...place, hung: false })))
    expect(BESIDE[0].x).toBeLessThan(BUILD.x0)
    expect(BESIDE[1].x).toBeGreaterThan(BUILD.x1)
    // With one hollow, one lamp hangs and one stands.
    expect(lampsOf(gate()).map((lamp) => lamp.hung)).toEqual([true, false])
  })

  it('gives the same night for the same palace every time: no chance and no clock', () => {
    const palace = [...gate('cloudy'), on('berry', 78, 480, 2)]
    expect(nightOf(palace)).toEqual(nightOf(palace.map((b) => ({ ...b }))))
  })
})

describe('met by lamp light', () => {
  const toneOf = (kind: Kind): string | undefined => {
    const things = gate(kind)
    const night = nightOf(things)
    return night.patches.find((patch) => patch.of === 2)?.tone
  }

  it('goes straight through a clear block and lies on the snow as a sharp bar', () => {
    expect(toneOf('clear')).toBe('sharp')
  })
  it('comes through a cloudy block soft', () => {
    expect(toneOf('cloudy')).toBe('soft')
  })
  it('comes out red where it crossed the berry block, also for the ice behind it', () => {
    const things = [...gate(), on('berry', 78, 480, 2), on('clear', 100, 480, 3)]
    const night = nightOf(things)
    expect(night.patches.find((patch) => patch.of === 3)?.tone).toBe('red')
    expect(night.patches.find((patch) => patch.of === 4)?.tone).toBe('red')
  })
  it('is broken into a fan by an icicle', () => {
    const things = [...gate(), restOf('icicle', ICICLE, 480, row(2), 'built')]
    expect(nightOf(things).patches.find((patch) => patch.of === 3)?.tone).toBe('fan')
  })
  it('is stopped by a snow block, whose own shape stays unlit, and by a snowball', () => {
    const snow = nightOf(gate('snow'))
    expect(snow.stopped).toContain(2)
    expect(snow.patches.find((patch) => patch.of === 2)?.tone).toBe('dark')
    expect(snow.lit).not.toContain(2)
    const ball = nightOf([...gate(), restOf('ball', BALL, 480, row(2), 'built')])
    expect(ball.stopped).toContain(3)
    expect(ball.patches.find((patch) => patch.of === 3)).toMatchObject({ tone: 'dark', kind: 'ball' })
  })

  it('lights nothing behind snow: what the snow hides gets no patch, and swapping that one block for ice lets the light out', () => {
    const shut = [...gate('snow'), on('clear', 120, 480, 2)]
    expect(nightOf(shut).patches.some((patch) => patch.of === 3)).toBe(false)
    const open = [...gate('clear'), on('clear', 120, 480, 2)]
    expect(nightOf(open).patches.some((patch) => patch.of === 3)).toBe(true)
  })

  it('names the snow that shuts a lamp in, and the clear block a lamp shines straight through', () => {
    // A lamp walled in by snow on every side lights no ice at all.
    const walled = [on('snow', 64, 400, 0), on('snow', 64, 560, 0), on('snow', 224, 480, 1)]
    expect(nightOf(walled).shutIn).toBeGreaterThanOrEqual(0)
    expect(nightOf(gate()).shutIn).toBe(-1)
    expect(nightOf(gate()).clearLit).toBeGreaterThanOrEqual(0)
  })

  it('lays each lit thing’s own outline on the snow, tall enough to read, beginning at the foot of the bank and leaning away from the lamp it came from', () => {
    const things = [...gate(), on('clear', 100, 650, 0)]
    const night = nightOf(things)
    const lamp = night.lamps[0]
    expect(lamp).toMatchObject({ x: 480, hung: true })
    const far = night.patches.find((patch) => patch.of === 3)!, lintel = night.patches.find((patch) => patch.of === 2)!
    // The block's own length across, and most of a block's height deep: no thin dash.
    expect(far.kind).toBe('clear')
    expect(far.len).toBe(100)
    expect(far.y1 - far.y0).toBeGreaterThanOrEqual(30)
    expect(far.y0).toBe(LIGHT_Y)
    expect(LIGHT_Y - GROUND_Y).toBeLessThan(BLOCK_H)
    // Its middle lies on the line from the lamp through the block, and its far edge is further from the lamp than its near edge.
    const near = castPoint(far.cast, 0, -BLOCK_H / 2), out = castPoint(far.cast, 0, BLOCK_H / 2)
    expect(near.x).toBeGreaterThan(650)
    expect(out.x - near.x).toBeGreaterThan(8)
    // Right over its lamp a thing's light lies straight.
    expect(Math.abs(castPoint(lintel.cast, 0, BLOCK_H / 2).x - castPoint(lintel.cast, 0, -BLOCK_H / 2).x)).toBeLessThan(0.01)
    // Rows do not run into each other: the lintel's light begins where the posts' light has ended.
    const post = night.patches.find((patch) => patch.of === 0)!
    expect(lintel.y0).toBeGreaterThan(post.y1)
    // A thing that stops the light leaves its own outline with a rim of light round it.
    const dark = nightOf(gate('snow')).patches.find((patch) => patch.tone === 'dark')!
    expect(dark.x1 - dark.x0).toBeGreaterThan(224 + RIM)
  })

  it('lays every patch on the snow in front of the bank, a row further out for each row the thing stands higher, and lights only as many lamps as are lit', () => {
    const things = [...gate(), on('clear', 100, 480, 2)]
    const night = nightOf(things)
    for (const patch of night.patches) expect(patch.y0).toBeGreaterThan(GROUND_Y)
    const low = night.patches.find((patch) => patch.of === 2)!, high = night.patches.find((patch) => patch.of === 3)!
    expect(high.y0).toBeGreaterThan(low.y0)
    expect(nightOf(things, 0).patches).toEqual([])
    expect(nightOf(things, 0).lamps).toEqual([])
  })
})

describe('King Winter’s seat', () => {
  it('is the highest block that is as wide as he is, rests on enough and has nothing on it', () => {
    const things = [on('clear', 200, 480, 0), on('clear', 180, 480, 1), on('clear', 100, 700, 0)]
    expect(seatOf(things).seat).toBe(1)
    expect(seatOf([on('clear', KING_WIDE - 10, 480, 0)]).seat).toBe(-1)
    // A wide block balanced on a narrow post rests on too little.
    expect(seatOf([on('clear', 64, 480, 0), on('clear', 260, 480, 1)]).seat).toBe(-1)
  })

  it('looks at the highest thing there is, which is the place he wanted when nothing will bear him', () => {
    const things = [on('clear', 100, 480, 0), on('clear', 80, 480, 1)]
    expect(seatOf(things)).toMatchObject({ seat: -1, wanted: { x: 480, y: row(1) - BLOCK_H / 2 } })
    expect(seatOf([]).wanted).toBeNull()
  })

  it('names the seat with a point on it when that is higher than the seat he gets', () => {
    const things = [on('clear', 200, 480, 0), on('clear', 180, 480, 1), restOf('icicle', ICICLE, 480, row(2), 'built'), on('clear', 200, 720, 0)]
    const found = seatOf(things)
    expect(found.point).toBe(1)
    expect(found.seat).toBe(3)
  })

  it('walks in by the widest gap at the foot of the wall: the whole bank while nothing stands on it', () => {
    expect(widestGap([])).toBe((BUILD.x0 + BUILD.x1) / 2)
    const things = [on('clear', 100, 300, 0), on('clear', 100, 800, 0)]
    expect(widestGap(things)).toBe(550)
  })
})
