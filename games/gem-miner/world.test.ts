import { describe, expect, it } from 'vitest'
import { drawn } from './fixtures'
import { BLOCKS, BURROW, BURROW_INDEX, COLS, beside, cellOf, indexOf } from './layout'
import { BLUE, COLOURS, DWELLER_KINDS, GREEN, RED, canPack, dwellerOf, dwellersOf, flowFrom, layWorld, lightOf, nextSeed, pack, placesOf, pour, settle, takeGround, unstable, wormsOf, type Kind, type World } from './world'

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 1)
const row = (world: World, r: number): Kind[] => world.kinds.slice(r * COLS, (r + 1) * COLS)
const count = (world: World, kind: Kind): number => world.kinds.filter((k) => k === kind).length

describe('laying a hillside', () => {
  it('lays the same hill from the same seed, and another from the next', () => {
    expect(layWorld(12, 'wild')).toEqual(layWorld(12, 'wild'))
    expect(layWorld(12, 'wild').kinds).not.toEqual(layWorld(13, 'wild').kinds)
    expect(nextSeed(12)).not.toBe(12)
    expect(nextSeed(12)).toBe(nextSeed(12))
  })

  it.each(['near', 'wild'] as const)('brings new things with depth on a %s hillside, and holds the same of each', (position) => {
    for (const seed of SEEDS) {
      const world = layWorld(seed, position)
      expect(world.kinds).toHaveLength(BLOCKS)
      expect(world.kinds[BURROW_INDEX]).toBe('open')
      // The top row is earth, and nothing but the burrow is dug in it.
      expect(row(world, 0).filter((kind) => kind !== 'earth')).toEqual(['open'])
      expect(row(world, 1).every((kind) => kind === 'earth' || kind === 'sandstone')).toBe(true)
      // Pockets lie from the third row down; granite begins in the fourth.
      for (let r = 0; r < 2; r++) for (const kind of ['water', 'gas'] as const) expect(row(world, r)).not.toContain(kind)
      for (let r = 0; r < 3; r++) expect(row(world, r)).not.toContain('granite')
      expect(count(world, 'water')).toBe(3)
      expect(count(world, 'gas')).toBe(3)
      expect(count(world, 'granite')).toBeGreaterThanOrEqual(3)
      expect(count(world, 'granite')).toBeLessThanOrEqual(20)
      // Three gems of each colour, each in earth or sandstone, none in the top row.
      for (const colour of COLOURS) expect(world.lode.filter((held) => held === colour)).toHaveLength(3)
      world.lode.forEach((held, index) => {
        if (!held) return
        expect(['earth', 'sandstone']).toContain(world.kinds[index])
        expect(cellOf(index).r).toBeGreaterThanOrEqual(1)
      })
      expect(world.gems).toEqual([])
      expect(world.hits.every((n) => n === 0)).toBe(true)
      expect(world.water.some(Boolean)).toBe(false)
    }
  })

  it('puts the lower gems beside granite or a pocket', () => {
    let lower = 0, beside_ = 0
    for (const seed of SEEDS) {
      const world = layWorld(seed, 'wild')
      world.lode.forEach((held, index) => {
        if (!held || cellOf(index).r < 3) return
        lower += 1
        if (beside(index).some((next) => ['granite', 'water', 'gas'].includes(world.kinds[next]))) beside_ += 1
      })
    }
    expect(lower).toBeGreaterThan(SEEDS.length * 4)
    expect(beside_).toBe(lower)
  })

  it('opens two natural caverns of two blocks, apart from the burrow', () => {
    for (const seed of SEEDS) {
      const world = layWorld(seed, 'wild')
      const found = placesOf(world, lightOf(world))
      expect(found.map((place) => place.length).sort()).toEqual([1, 2, 2])
    }
  })

  it('lays earth, a red gem in earth, sandstone and granite straight under the burrow of a near hillside, with a pocket to either side', () => {
    for (const seed of SEEDS) {
      const world = layWorld(seed, 'near')
      expect([1, 2, 3, 4].map((r) => world.kinds[indexOf(BURROW.c, r)])).toEqual(['earth', 'earth', 'sandstone', 'granite'])
      expect(world.lode[indexOf(BURROW.c, 2)]).toBe('red')
      expect(world.lode[indexOf(BURROW.c, 1)]).toBeNull()
      expect(world.kinds[indexOf(BURROW.c - 1, 2)]).toBe('water')
      expect(world.kinds[indexOf(BURROW.c + 1, 2)]).toBe('gas')
    }
  })

  it('shows a few worms in the earth of a fresh hillside, none beside another', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const world = layWorld(seed, 'wild')
      const worms = wormsOf(world)
      expect(worms.length).toBeGreaterThan(0)
      expect(worms.length).toBeLessThanOrEqual(4)
      for (const index of worms) expect(world.kinds[index]).toBe('earth')
    }
  })
})

describe('water', () => {
  it('runs down whatever was dug and rests in the lowest place it can reach', () => {
    const world = drawn('oee', 'oee', 'ooo', 'eeo')
    const flow = flowFrom(world, 0)
    expect(flow.path).toEqual([0, 13, 26, 27, 28, 41])
    expect(flow.rest).toBe(41)
  })

  it('fills the lowest place first, then the floor beside it, then the block above', () => {
    const world = drawn('o', 'o', 'oo')
    expect(pour(world, 0).rest).toBe(26)
    expect(pour(world, 0).rest).toBe(27)
    expect(pour(world, 0).rest).toBe(13)
    expect(world.water.filter(Boolean)).toHaveLength(3)
    for (const index of [0, 13, 26, 27]) expect(world.wet[index]).toBe(true)
  })

  it('is let go when a block under it is dug, and not while it has nowhere to go', () => {
    const world = drawn('~e', 'ee')
    expect(unstable(world)).toBe(false)
    world.kinds[13] = 'open'
    expect(unstable(world)).toBe(true)
    const settled = settle(world)
    expect(settled.flows).toHaveLength(1)
    expect(world.water[0]).toBe(false)
    expect(world.water[13]).toBe(true)
    expect(unstable(world)).toBe(false)
  })

  it('keeps the dug block under a spout wet', () => {
    const world = drawn('p', 'o')
    settle(world)
    expect(world.wet[13]).toBe(true)
    expect(world.water[13]).toBe(false)
  })
})

describe('what falls', () => {
  it('drops a loose boulder through dry dug space, and stops it over the mole', () => {
    const world = drawn('b', 'o', 'o', '@')
    const settled = settle(world)
    expect(settled.boulders).toEqual([{ from: 0, to: 26 }])
    expect(world.kinds[0]).toBe('open')
    expect(world.kinds[26]).toBe('boulder')
  })

  it('drops a gem whose wall has been dug away, and one whose floor has', () => {
    const world = drawn('eoe', 'eee')
    world.gems.push({ colour: 'red', at: 1, rest: 'left' }, { colour: 'blue', at: 1, rest: 'floor' })
    expect(settle(world).gems).toEqual([])
    world.kinds[0] = 'open'
    world.kinds[14] = 'open'
    settle(world)
    expect(world.gems).toEqual([{ colour: 'red', at: 14, rest: 'floor' }, { colour: 'blue', at: 14, rest: 'floor' }])
  })

  it('springs a gem free when its block is taken away', () => {
    const world = drawn('@R')
    expect(takeGround(world, 1)).toBe('red')
    expect(world.kinds[1]).toBe('open')
    expect(world.lode[1]).toBeNull()
    expect(world.gems).toEqual([{ colour: 'red', at: 1, rest: 'floor' }])
  })

  it('packs earth back into a dug block, standing water or not, and a gem that lay there is in the earth again', () => {
    const world = drawn('@o~')
    world.gems.push({ colour: 'green', at: 1, rest: 'floor' })
    expect(canPack(world, 1)).toBe(true)
    // In standing water it packs too, and takes the water and the wet up.
    expect(canPack(world, 2)).toBe(true)
    const pool = drawn('@o~')
    pack(pool, 2)
    expect([pool.kinds[2], pool.water[2], pool.wet[2]]).toEqual(['earth', false, false])
    expect(canPack(world, 0)).toBe(false)
    expect(canPack(world, BURROW_INDEX)).toBe(false)
    pack(world, 1)
    expect(world.kinds[1]).toBe('earth')
    expect(world.lode[1]).toBe('green')
    expect(world.gems).toEqual([])
    expect(lightOf(world).every((mask) => mask === 0)).toBe(true)
  })
})

describe('light', () => {
  it('reaches two blocks along the tunnels, and rock and loose boulders stop it', () => {
    const world = drawn('ooooo', 'obeee', 'oeeee')
    world.gems.push({ colour: 'red', at: 0, rest: 'floor' })
    world.kinds[13] = 'open'
    world.gems[0].at = 13
    const masks = lightOf(world)
    expect(masks[13]).toBe(RED)
    expect(masks[0]).toBe(RED)
    expect(masks[1]).toBe(RED)
    expect(masks[2]).toBe(0)
    expect(masks[26]).toBe(RED)
    // The boulder beside it is rock: it takes no light and lets none through.
    expect(masks[14]).toBe(0)
  })

  it('mixes where two colours fall on the same block', () => {
    const world = drawn('ooooo')
    world.gems.push({ colour: 'red', at: 0, rest: 'floor' }, { colour: 'green', at: 3, rest: 'floor' }, { colour: 'blue', at: 4, rest: 'floor' })
    expect(lightOf(world)).toEqual(expect.arrayContaining([]))
    const masks = lightOf(world).slice(0, 5)
    expect(masks).toEqual([RED, RED | GREEN, RED | GREEN | BLUE, GREEN | BLUE, GREEN | BLUE])
  })

  it('lights one block from under standing water, and only upward from the bucket', () => {
    const world = drawn('o~o', 'eee')
    world.gems.push({ colour: 'blue', at: 1, rest: 'floor' })
    expect(lightOf(world).slice(0, 3)).toEqual([0, BLUE, 0])
    const shaft = drawn('oo', '@o')
    shaft.mole.tool = 'bucket'
    shaft.mole.load = 'green'
    shaft.gems.push({ colour: 'green', at: 0, rest: 'bucket' })
    const masks = lightOf(shaft)
    expect([masks[0], masks[1], masks[13], masks[14]]).toEqual([GREEN, 0, GREEN, 0])
  })

  it('goes through water, and a gem in the rock lights nothing', () => {
    const world = drawn('o~oR')
    world.gems.push({ colour: 'red', at: 0, rest: 'left' })
    expect(lightOf(world).slice(0, 4)).toEqual([RED, RED, RED, 0])
  })
})

describe('who lives where', () => {
  it('follows the light and the wet by a table that never changes', () => {
    expect(dwellerOf(0, false)).toBe('bat')
    expect(dwellerOf(0, true)).toBe('newt')
    expect(dwellerOf(RED, false)).toBe('lizard')
    expect(dwellerOf(RED, true)).toBe('mushroom')
    expect(dwellerOf(GREEN, false)).toBe('beetle')
    expect(dwellerOf(GREEN, true)).toBe('fern')
    expect(dwellerOf(BLUE, false)).toBe('glowworm')
    expect(dwellerOf(BLUE, true)).toBe('snail')
    for (const wet of [false, true]) {
      expect(dwellerOf(RED | GREEN, wet)).toBe('moth')
      expect(dwellerOf(GREEN | BLUE, wet)).toBe('dragonfly')
      expect(dwellerOf(RED | BLUE, wet)).toBe('spider')
    }
    expect(dwellerOf(7, false)).toBeNull()
    expect(dwellerOf(7, true)).toBe('flower')
    const all = new Set<string>()
    for (let mask = 0; mask < 8; mask++) for (const wet of [false, true]) { const kind = dwellerOf(mask, wet); if (kind) all.add(kind) }
    expect([...all].sort()).toEqual([...DWELLER_KINDS].sort())
    expect(all.size).toBe(12)
  })

  it('gives a place of two blocks one dweller, and one more for every three blocks beyond that', () => {
    for (const [length, lives] of [[1, 0], [2, 1], [4, 1], [5, 2], [8, 3], [11, 4]] as const) {
      const world = drawn('e'.repeat(13), 'o'.repeat(length))
      expect(dwellersOf(world)).toHaveLength(lives)
      for (const dweller of dwellersOf(world)) expect(dweller.kind).toBe('bat')
    }
  })

  it('gives the same dwellers the same blocks every time, and keeps them as the place grows', () => {
    const world = drawn('e'.repeat(13), 'o'.repeat(5))
    const before = dwellersOf(world)
    expect(dwellersOf(world)).toEqual(before)
    world.kinds[13 + 5] = 'open'
    world.kinds[13 + 6] = 'open'
    world.kinds[13 + 7] = 'open'
    const after = dwellersOf(world)
    expect(after).toHaveLength(3)
  })

  it('splits a tunnel into places where the light or the wet changes', () => {
    const world = drawn('e'.repeat(13), 'o'.repeat(10))
    world.gems.push({ colour: 'blue', at: 13, rest: 'left' })
    const kinds = dwellersOf(world).map((dweller) => dweller.kind)
    expect(kinds).toContain('glowworm')
    expect(kinds).toContain('bat')
    for (const dweller of dwellersOf(world)) expect(dweller.at).not.toBe(13)
  })

  it('grows one flower in white wet light however large the place is', () => {
    const world = drawn('e'.repeat(13), 'ooooo')
    for (let i = 0; i < 5; i++) world.wet[13 + i] = true
    world.gems.push({ colour: 'red', at: 13, rest: 'left' }, { colour: 'green', at: 15, rest: 'floor' }, { colour: 'blue', at: 17, rest: 'right' })
    const flowers = dwellersOf(world).filter((dweller) => dweller.kind === 'flower')
    expect(flowers.length).toBeLessThanOrEqual(1)
    const lit = drawn('e'.repeat(13), 'ooo')
    for (let i = 0; i < 3; i++) lit.wet[13 + i] = true
    lit.gems.push({ colour: 'red', at: 13, rest: 'left' }, { colour: 'green', at: 13, rest: 'floor' }, { colour: 'blue', at: 15, rest: 'right' })
    expect(lightOf(lit).slice(13, 16)).toEqual([7, 7, 7])
    expect(dwellersOf(lit)).toEqual([{ kind: 'flower', at: 14 }])
  })
})
