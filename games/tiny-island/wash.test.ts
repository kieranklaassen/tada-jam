import { describe, expect, it } from 'vitest'
import { KINDS, SLOT_DX, slotOf } from './toys'
import { BACK_S, BARE_S, CREST_HALF, CURL, LIP, LONG, REAR_S, ROLL, SET, SET_S, SINK_S, WASH_S, backAt, crestRow, crestSlot, gateFor, washS, wavePose, type WavePose, type Washing } from './wash'

const post = { x: 8.3, z: -3 }
const idle = (more: Partial<Washing> = {}): Washing => ({ rearing: -1, sinking: -1, sankFrom: 0, at: -1, bare: false, back: backAt(5), gate: -Infinity, ...more })
const pose = (time: number, washing: Washing): WavePose => wavePose(time, washing, post, {} as WavePose)

describe('the wave at its edge', () => {
  it('lies where it lives, never quite asleep: its eyes half open and its crest curling and uncurling', () => {
    const lids = new Set<string>(), curl = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const wave = pose(i / 4, idle())
      expect(wave.x).toBe(post.x)
      expect(wave.z).toBe(post.z)
      expect(wave.rear).toBe(0)
      expect(wave.lids).toBeGreaterThan(0.4)
      expect(wave.lids).toBeLessThan(0.6)
      lids.add(wave.lids.toFixed(3))
      curl.add(wave.curl.toFixed(2))
    }
    expect(lids.size).toBeGreaterThan(10)
    expect(curl.size).toBeGreaterThan(10)
  })
})

describe('the wave called', () => {
  it('rears slowly enough to be seen, its eyes opening first, and has not moved from its edge when it has reared', () => {
    expect(REAR_S).toBeGreaterThanOrEqual(1.2)
    expect(pose(1, idle({ rearing: 0.4 })).lids).toBeGreaterThan(0.9)
    expect(pose(1, idle({ rearing: 0.4 })).rear).toBeLessThan(0.3)
    let last = -1
    for (let t = 0; t <= REAR_S; t += 0.05) {
      const wave = pose(1, idle({ rearing: t }))
      expect(wave.rear).toBeGreaterThanOrEqual(last)
      expect(wave.x).toBe(post.x)
      last = wave.rear
    }
    expect(last).toBeGreaterThan(0.98)
  })

  it('sinks back from however far it had reared when it is called off', () => {
    const half = pose(1, idle({ rearing: 0.7 })).rear
    expect(pose(1, idle({ sinking: 0, sankFrom: half })).rear).toBeCloseTo(half, 5)
    expect(pose(1, idle({ sinking: SINK_S, sankFrom: half })).rear).toBe(0)
    expect(pose(1, idle({ sinking: SINK_S, sankFrom: half })).lids).toBeLessThan(0.6)
  })
})

describe('the wash', () => {
  it('rolls from right to left slowly enough to watch, and never back', () => {
    expect(ROLL.lasts).toBeGreaterThanOrEqual(2)
    let last = Infinity
    for (let t = 0; t <= ROLL.lasts; t += 0.05) {
      const wave = pose(1, idle({ at: t }))
      expect(wave.x).toBeLessThanOrEqual(last + 1e-9)
      // No faster than a child's eye follows: under eight units a second.
      if (last !== Infinity) expect(last - wave.x).toBeLessThan(8 * 0.05)
      last = wave.x
    }
    expect(last).toBeLessThan(-2)
    expect(pose(1, idle({ at: 1 })).long).toBe(LONG)
    expect(pose(1, idle({ at: 1 })).lids).toBe(1)
  })

  it('waits behind a toy that is still on its way up', () => {
    const held = pose(1, idle({ at: 1.5, gate: 4 })), free = pose(1, idle({ at: 1.5 }))
    expect(free.x).toBeLessThan(4)
    expect(held.x).toBe(4)
    expect(gateFor(1, 0.9)).toBeGreaterThan(1 + 0.9 + LIP)
  })

  it('curls round to the front until its crest lies along the tray, a toy behind each slot at most a hop away', () => {
    const wave = pose(1, idle({ at: CURL.at + CURL.lasts }))
    expect(wave.yaw).toBeCloseTo(Math.PI / 2, 5)
    expect(wave.x).toBeCloseTo(0, 5)
    for (const kind of KINDS) {
      const at = crestSlot(slotOf(kind).x, wave, { x: 0, z: 0 })
      expect(at.x).toBeCloseTo(slotOf(kind).x, 5)
      expect(at.z).toBeLessThan(slotOf(kind).z - 2)
    }
    expect(CREST_HALF).toBe(2 * SLOT_DX)
  })

  it('sets one toy down at a time: each has landed before the next leaves the crest', () => {
    expect(SET.at).toBeGreaterThanOrEqual(CURL.at + CURL.lasts)
    expect(SET.each).toBeGreaterThanOrEqual(SET_S + 0.14)
    expect(backAt(3)).toBeGreaterThan(SET.at + 2 * SET.each + SET_S + 0.14)
  })

  it('spends itself as it sets them down, slides back, and lies at its edge again as it lay before', () => {
    const back = backAt(5)
    expect(pose(1, idle({ at: back - 0.01 })).tall).toBeLessThan(0.6)
    const home = pose(1, idle({ at: back + BACK_S }))
    expect(home.x).toBeCloseTo(post.x, 5)
    expect(home.z).toBeCloseTo(post.z, 5)
    expect(home.yaw).toBeCloseTo(0, 5)
    expect(home.long).toBeCloseTo(1, 5)
    expect(home.tall).toBeCloseTo(1, 5)
    expect(home.lids).toBeLessThan(0.6)
    expect(washS(5)).toBe(WASH_S)
    // Fewer toys, a shorter wash.
    expect(washS(1)).toBeLessThan(washS(5) - 1.5)
    const short = pose(1, idle({ at: backAt(1) + BACK_S, back: backAt(1) }))
    expect(short.x).toBeCloseTo(post.x, 5)
  })

  it('rolls over a bare island and comes up again at its edge', () => {
    const over = pose(1, idle({ at: 1.2, bare: true }))
    expect(over.x).toBeLessThan(post.x - 3)
    expect(pose(1, idle({ at: 1.59, bare: true })).tall).toBeLessThan(0.05)
    const home = pose(1, idle({ at: BARE_S, bare: true }))
    expect(home.x).toBe(post.x)
    expect(home.tall).toBeCloseTo(1, 5)
    expect(BARE_S).toBeCloseTo(2.5, 5)
  })
})

describe('the row of toys on the crest', () => {
  it('keeps each toy as near as it can to where the crest met it', () => {
    expect(crestRow([0.3])).toEqual([0.3])
    expect(crestRow([-3, 3])).toEqual([-3, 3])
  })

  it('keeps a slot between neighbours, in the order they stood, and none beyond the ends of the crest', () => {
    for (const reach of [[0, 0.1, 0.2, 0.3, 0.4], [9, 8, 7, -9, -8], [0, 0], [4.4, 4.5, 4.3], [-5, -5, 5, 5, 0], [1.2, -0.4, 3.3, 0.2]]) {
      const row = crestRow(reach), order = reach.map((_, i) => i).sort((a, b) => reach[a] - reach[b])
      for (const along of row) expect(Math.abs(along)).toBeLessThanOrEqual(CREST_HALF + 1e-9)
      for (let i = 1; i < order.length; i++) expect(row[order[i]] - row[order[i - 1]]).toBeGreaterThanOrEqual(SLOT_DX - 1e-9)
    }
  })

  it('lies along the crest: across the island while the wave rolls, along the tray when it has curled', () => {
    const rolling = { x: 2, z: 0.5, yaw: 0 } as WavePose, curled = { x: 0, z: 4.9, yaw: Math.PI / 2 } as WavePose
    expect(crestSlot(2.25, rolling, { x: 0, z: 0 })).toEqual({ x: 2, z: 2.75 })
    const at = crestSlot(2.25, curled, { x: 0, z: 0 })
    expect(at.x).toBeCloseTo(2.25, 5)
    expect(at.z).toBeCloseTo(4.9, 5)
  })
})
