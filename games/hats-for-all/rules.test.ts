import { describe, expect, it } from 'vitest'
import { CREATURE_KINDS, HAT_KINDS, MOST, type HatKind } from './kinds'
import {
  MOST_SLIPS, applyChange, bareSpots, changeDue, dropHat, freeSpot, hatsInTile, judge, off, placeOf, ready, settled, tapCreature, tapHat,
  type Change, type World,
} from './rules'

/** A world with creatures on these spots and this many hats, all in the tile. */
function world(spots: number[], hats: number, changes: Change[] = []): World {
  return {
    crew: spots.map((spot, i) => ({ kind: CREATURE_KINDS[i % CREATURE_KINDS.length], spot, hats: [] })),
    tile: Array.from({ length: hats }, (_, i): HatKind => HAT_KINDS[i % HAT_KINDS.length]),
    loose: [],
    changes,
    guest: changes.includes('come') ? 'pip' : null,
    leaver: changes.includes('leave') ? spots[0] : null,
    slips: 0,
  }
}

/** A small seeded stream, so a failing run can be played again. */
function stream(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Every hat is in exactly one place, no two creatures share a spot, and the sets stay at five or fewer. */
function expectSound(w: World): void {
  const worn = w.crew.flatMap((creature) => creature.hats), loose = w.loose.map((entry) => entry.hat)
  const out = [...worn, ...loose]
  expect(new Set(out).size).toBe(out.length)
  for (const hat of out) expect(hat >= 0 && hat < w.tile.length).toBe(true)
  expect(out.length + hatsInTile(w).length).toBe(w.tile.length)
  expect(new Set(w.crew.map((creature) => creature.spot)).size).toBe(w.crew.length)
  expect(w.crew.length).toBeLessThanOrEqual(MOST)
  expect(w.tile.length).toBeLessThanOrEqual(MOST)
  expect(w.slips).toBeLessThanOrEqual(MOST_SLIPS)
}

describe('a tapped hat', () => {
  it('goes from the tile to the nearest bare head', () => {
    // Three hats lie at x -2.3, 0 and 2.3; the heads stand at x -3, 0 and 3.
    const { world: after, happened } = tapHat(world([1, 2, 3], 3), 2)
    expect(placeOf(after, 2)).toEqual({ at: 'head', spot: 3, level: 0 })
    expect(happened).toEqual([{ type: 'hatMoved', hat: 2, from: { at: 'tile' }, to: { at: 'head', spot: 3, level: 0 } }, { type: 'wore', spot: 3, hat: 2 }])
    expect(after.slips).toBe(0)
  })

  it('goes to the lower spot when two bare heads are as near', () => {
    // A hat laid by itself lies at x 1.6, half way between spots 2 and 3.
    const { world: after } = tapHat(world([2, 3], 1), 0)
    expect(placeOf(after, 0)).toEqual({ at: 'head', spot: 2, level: 0 })
  })

  it('comes out loose when no head is bare, and that is a slip', () => {
    let w = world([2], 2)
    w = tapHat(w, 0).world
    const { world: after, happened } = tapHat(w, 1)
    expect(placeOf(after, 1).at).toBe('loose')
    expect(happened.at(-1)).toEqual({ type: 'slip' })
    expect(after.slips).toBe(1)
  })

  it('goes home from the floor when no head is bare, and to a bare head when one is', () => {
    let w = world([2], 2)
    w = tapHat(tapHat(w, 0).world, 1).world
    expect(placeOf(tapHat(w, 1).world, 1)).toEqual({ at: 'tile' })
    const bared = tapHat(w, 0).world
    expect(placeOf(tapHat(bared, 1).world, 1)).toEqual({ at: 'head', spot: 2, level: 0 })
  })

  it('goes home from a head and leaves it bare, which is a slip', () => {
    const w = tapHat(world([2], 1), 0).world
    const { world: after, happened } = tapHat(w, 0)
    expect(placeOf(after, 0)).toEqual({ at: 'tile' })
    expect(happened.map((h) => h.type)).toEqual(['hatMoved', 'bared', 'slip'])
  })

  it('that is not there changes nothing', () => {
    const w = world([2], 1)
    expect(tapHat(w, 4).world).toBe(w)
    expect(tapHat(w, -1).world).toBe(w)
  })
})

describe('a tower', () => {
  it('is made by a second hat on one head, and its top goes home without a slip', () => {
    let w = dropHat(world([1, 2], 2), 0, { on: 'head', spot: 1 }).world
    const built = dropHat(w, 1, { on: 'head', spot: 1 })
    w = built.world
    expect(w.crew[0].hats).toEqual([0, 1])
    expect(built.happened.at(-1)).toEqual({ type: 'slip' })
    // A tap on the lower hat lifts the one on top.
    const after = tapHat(w, 0)
    expect(after.world.crew[0].hats).toEqual([0])
    expect(placeOf(after.world, 1)).toEqual({ at: 'tile' })
    expect(after.world.slips).toBe(w.slips)
  })

  it('of three falls, and every hat of it goes home', () => {
    let w = world([2], 3)
    w = dropHat(w, 0, { on: 'head', spot: 2 }).world
    w = dropHat(w, 1, { on: 'head', spot: 2 }).world
    const { world: after, happened } = dropHat(w, 2, { on: 'head', spot: 2 })
    expect(after.crew[0].hats).toEqual([])
    expect(hatsInTile(after)).toEqual([0, 1, 2])
    expect(happened).toContainEqual({ type: 'towerFell', spot: 2, hats: [0, 1, 2] })
  })
})

describe('a tapped creature', () => {
  it('calls the nearest hat from the tile when it is bare', () => {
    const { world: after } = tapCreature(world([0, 4], 2), 4)
    expect(placeOf(after, 1)).toEqual({ at: 'head', spot: 4, level: 0 })
  })

  it('leaves a loose hat where it is when the tile is empty: the hat waits for its own tap', () => {
    let w = world([1, 2], 1)
    w = dropHat(w, 0, { on: 'floor', spot: 4 }).world
    expect(tapCreature(w, 1)).toEqual({ world: w, happened: [{ type: 'noHat', spot: 1 }] })
    expect(placeOf(tapHat(w, 0).world, 0)).toEqual({ at: 'head', spot: 2, level: 0 })
  })

  it('pats its head when no hat is in the tile, and nothing changes', () => {
    const w = tapHat(world([1, 2], 1), 0).world
    const bare = bareSpots(w)[0]
    const { world: after, happened } = tapCreature(w, bare)
    expect(after).toBe(w)
    expect(happened).toEqual([{ type: 'noHat', spot: bare }])
  })

  it('does its trick with the hat it wears, and nothing changes', () => {
    const w = tapHat(world([2], 1), 0).world
    expect(tapCreature(w, 2)).toEqual({ world: w, happened: [{ type: 'trick', spot: 2, hat: 0 }] })
    expect(tapCreature(w, 0).happened).toEqual([])
  })
})

describe('loose hats', () => {
  it('never rest two beside one round spot: the second takes the nearest free one', () => {
    let w = world([2], 4)
    for (const hat of [0, 1, 2, 3]) w = dropHat(w, hat, { on: 'floor', spot: 2 }).world
    expect(w.loose.map((entry) => entry.spot)).toEqual([2, 1, 3, 0])
    expect(new Set(w.loose.map((entry) => entry.spot)).size).toBe(4)
  })
})

describe('a dragged hat', () => {
  it('let go where it was changes nothing', () => {
    const w = dropHat(world([1, 2], 2), 0, { on: 'head', spot: 1 }).world
    expect(dropHat(w, 1, { on: 'tile' }).world).toBe(w)
    expect(dropHat(w, 0, { on: 'head', spot: 1 }).world).toBe(w)
    expect(dropHat(w, 1, { on: 'head', spot: 4 }).world).toBe(w)
  })

  it('moves from one head to another, and that mends a tower and a bare head in one move', () => {
    let w = dropHat(world([1, 2], 2), 0, { on: 'head', spot: 1 }).world
    w = dropHat(w, 1, { on: 'head', spot: 1 }).world
    expect(off(w)).toBe(2)
    const after = dropHat(w, 1, { on: 'head', spot: 2 }).world
    expect(off(after)).toBe(0)
    expect(after.slips).toBe(w.slips)
  })
})

describe('the crew', () => {
  it('is settled when no more can be paired, and ready only when every head has one', () => {
    const short = tapHat(world([1, 2], 1), 0).world
    expect(settled(short)).toBe(true)
    expect(ready(short)).toBe(false)
    const even = tapHat(tapHat(world([1, 2], 3), 0).world, 1).world
    expect(ready(even)).toBe(true)
    expect(ready({ ...even, changes: ['come'] })).toBe(false)
    expect(settled(tapHat(even, 2).world)).toBe(false)
    expect(ready(world([], 2))).toBe(false)
  })

  it('gets one more, bare, on the next spot, once it is settled', () => {
    let w = world([1, 2], 3, ['come'])
    expect(changeDue(w)).toBe(null)
    expect(applyChange(w).world).toBe(w)
    w = tapHat(tapHat(w, 0).world, 1).world
    expect(changeDue(w)).toBe('come')
    const { world: after, happened } = applyChange(w)
    expect(after.crew.map((c) => [c.kind, c.spot, c.hats.length])).toContainEqual(['pip', 3, 0])
    expect(happened).toEqual([{ type: 'came', spot: 3, kind: 'pip' }])
    expect(after.changes).toEqual([])
    expect(after.slips).toBe(0)
  })

  it('loses one, whose hat is left loose on its spot', () => {
    let w = world([1, 2, 3], 3, ['leave'])
    for (const hat of [0, 1, 2]) w = tapHat(w, hat).world
    const { world: after, happened } = applyChange(w)
    expect(after.crew.map((c) => c.spot)).toEqual([2, 3])
    const worn = w.crew.find((creature) => creature.spot === 1)!.hats[0]
    expect(after.loose).toEqual([{ hat: worn, spot: 1 }])
    expect(happened.at(-1)).toEqual({ type: 'left', spot: 1, kind: 'bop' })
    expect(ready(after)).toBe(false)
    expect(ready(tapHat(after, worn).world)).toBe(true)
  })

  it('always frees a hat: when the one who was to leave stands bare and another wears a hat, the hatted creature nearest to it leaves in its place', () => {
    // Four heads and three hats: whoever is left bare, the one who walks out wears a hat, and its hat lies loose for the bare head.
    for (const named of [1, 2, 3, 4]) for (const bare of [1, 2, 3, 4]) {
      const w = { ...world([1, 2, 3, 4], 3, ['leave']), leaver: named }
      let hat = 0
      for (const creature of w.crew) if (creature.spot !== bare) creature.hats = [hat++]
      expect(settled(w)).toBe(true)
      const { world: after, happened } = applyChange(w), left = happened.at(-1)
      expect(left?.type).toBe('left')
      expect(after.loose).toHaveLength(1)
      expect(bareSpots(after)).toEqual([bare])
      if (left?.type === 'left') {
        expect(left.spot).not.toBe(bare)
        if (named !== bare) expect(left.spot).toBe(named)
        else expect(Math.abs(left.spot - named)).toBe(1)
      }
      // One tap on the loose hat and every head has one.
      expect(ready(tapHat(after, after.loose[0].hat).world)).toBe(true)
    }
  })

  it('never loses its last creature and never grows past five', () => {
    const alone = tapHat(world([2], 1, ['leave']), 0).world
    expect(applyChange(alone).world.crew.length).toBe(1)
    let full = world([0, 1, 2, 3, 4], 5, ['come'])
    for (const hat of [0, 1, 2, 3, 4]) full = tapHat(full, hat).world
    const after = applyChange(full).world
    expect(after.crew.length).toBe(MOST)
    expect(after.changes).toEqual([])
  })

  it('takes the spot before the row when the row reaches the end', () => {
    expect(freeSpot(world([3, 4], 0))).toBe(2)
    expect(freeSpot(world([0, 1], 0))).toBe(2)
    expect(freeSpot(world([0, 1, 2, 3, 4], 0))).toBe(null)
  })
})

describe('whatever the child does', () => {
  it('leaves every hat in exactly one place', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const random = stream(seed)
      const heads = 1 + Math.floor(random() * 4), hats = 1 + Math.floor(random() * MOST)
      let w = world(Array.from({ length: heads }, (_, i) => i), hats, random() < 0.5 ? ['come'] : ['leave'])
      for (let step = 0; step < 80; step++) {
        const hat = Math.floor(random() * hats), spot = Math.floor(random() * MOST), pick = random()
        if (pick < 0.35) w = tapHat(w, hat).world
        else if (pick < 0.55) w = tapCreature(w, spot).world
        else if (pick < 0.75) w = dropHat(w, hat, { on: 'head', spot }).world
        else if (pick < 0.85) w = dropHat(w, hat, { on: 'floor', spot }).world
        else if (pick < 0.92) w = dropHat(w, hat, { on: 'tile' }).world
        else w = applyChange(w).world
        expectSound(w)
      }
    }
  })

  it('by taps alone, with as many hats as heads, never leaves a hat loose or builds a tower', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const random = stream(seed), heads = 2 + Math.floor(random() * 2)
      let w = world(Array.from({ length: heads }, (_, i) => i + 1), heads)
      for (let step = 0; step < 60; step++) {
        w = random() < 0.6 ? tapHat(w, Math.floor(random() * heads)).world : tapCreature(w, Math.floor(random() * MOST)).world
        expect(w.loose).toEqual([])
        expect(w.crew.every((creature) => creature.hats.length <= 1)).toBe(true)
      }
    }
  })
})

describe('a finished cycle', () => {
  it('went well with no slip or one, was mixed with two or three, and went badly with more', () => {
    expect([0, 1, 2, 3, 4, MOST_SLIPS].map(judge)).toEqual(['well', 'well', 'mixed', 'mixed', 'badly', 'badly'])
  })
})
