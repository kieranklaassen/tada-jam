import { describe, expect, it } from 'vitest'
import {
  BAKE_SECONDS, BOARD_SLOWER, EMPTY, MOST, PLACES, RISE_AIRY, RISE_FULL, RISE_ROUGH_CAP, RISE_SECONDS, WORK_FULL, WORK_SHAGGY, WORK_SMOOTH,
  bakedFrom, canRise, darker, gather, kindOf, pull, push, rest, textureOf, tip,
  type Bread, type Ingredient, type Load, type Stuff,
} from './stuff'

const tipAll = (load: Load, ...what: Ingredient[]): Load => what.reduce<Load>((at, next) => tip(at, next).load, load)
const pushes = (load: Load, times: number): Load => { for (let i = 0; i < times; i++) load = push(load).load; return load }
const raw = (load: Load): Stuff => { if (!load || !load.raw) throw new Error('not raw'); return load }
const bread = (load: Load): Bread => { if (!load || load.raw) throw new Error('not baked'); return load }
/** Flour and water, pushed until smooth. */
const smoothDough = (...extra: Ingredient[]) => pushes(tipAll(null, 'flour', 'water', ...extra), WORK_FULL)
const bake = (load: Load) => rest(load, 'oven', BAKE_SECONDS)

describe('what the stuff is', () => {
  it('is dough only when flour and water are both there, and batter when the water is more', () => {
    expect(kindOf(EMPTY)).toBe('nothing')
    expect(kindOf(raw(tipAll(null, 'flour')))).toBe('dust')
    expect(kindOf(raw(tipAll(null, 'water')))).toBe('puddle')
    expect(kindOf(raw(tipAll(null, 'seeds')))).toBe('seeds')
    expect(kindOf(raw(tipAll(null, 'bubbly')))).toBe('batter')
    expect(kindOf(raw(tipAll(null, 'flour', 'water')))).toBe('dough')
    expect(kindOf(raw(tipAll(null, 'flour', 'flour', 'water')))).toBe('dough')
    expect(kindOf(raw(tipAll(null, 'flour', 'water', 'water')))).toBe('batter')
  })

  it('is mended in place: dust takes water, and batter takes flour', () => {
    expect(kindOf(raw(tipAll(tipAll(null, 'flour'), 'water')))).toBe('dough')
    expect(kindOf(raw(tipAll(tipAll(null, 'flour', 'water', 'water'), 'flour')))).toBe('dough')
  })

  it('holds no more than the peel can, and a pour too many runs off without changing anything', () => {
    const full = tipAll(null, ...Array<Ingredient>(MOST).fill('flour'), ...Array<Ingredient>(MOST).fill('water'))
    expect(tip(full, 'flour')).toEqual({ load: full, effect: 'flour-over' })
    expect(tip(full, 'water')).toEqual({ load: full, effect: 'water-over' })
    const once = tipAll(null, 'bubbly')
    expect(tip(once, 'bubbly')).toEqual({ load: once, effect: 'burp' })
  })
})

describe('pushing', () => {
  it('takes dough from streaky to shaggy to smooth and no further', () => {
    let load = tipAll(null, 'flour', 'water')
    expect(textureOf(raw(load))).toBe('streaky')
    load = pushes(load, WORK_SHAGGY)
    expect(textureOf(raw(load))).toBe('shaggy')
    load = pushes(load, WORK_SMOOTH - WORK_SHAGGY)
    expect(textureOf(raw(load))).toBe('smooth')
    expect(raw(pushes(load, 100)).work).toBe(WORK_FULL)
  })

  it('never lowers the work, and only something added to the mix does', () => {
    let load = tipAll(null, 'flour', 'water'), last = 0
    for (let i = 0; i < 20; i++) { load = push(load).load; expect(raw(load).work).toBeGreaterThanOrEqual(last); last = raw(load).work }
    expect(raw(tip(load, 'flour').load).work).toBe(Math.floor(WORK_FULL / 2))
    expect(raw(tip(load, 'seeds').load).work, 'seeds lie on top').toBe(WORK_FULL)
  })

  it('answers on everything and changes only dough and batter', () => {
    for (const what of ['flour', 'water', 'seeds'] as const) {
      const load = tipAll(null, what)
      expect(push(load).load).toEqual(load)
    }
    expect(push(null)).toEqual({ load: null, effect: 'nothing-there' })
  })

  it('stretches smooth dough long, rips rougher dough short, and gathers it round again', () => {
    const rough = pushes(tipAll(null, 'flour', 'water'), WORK_SHAGGY)
    expect(pull(rough)).toEqual({ load: rough, effect: 'rip' })
    const long = pull(smoothDough())
    expect(long.effect).toBe('stretch')
    expect(raw(long.load).long).toBe(true)
    const round = gather(long.load)
    expect(round.effect).toBe('gather')
    expect(raw(round.load).long).toBe(false)
    expect(raw(tip(long.load, 'water').load).long, 'something added makes it a lump again').toBe(false)
  })
})

describe('rising', () => {
  it('needs the bubbly worked in: without it nothing rises anywhere', () => {
    for (const place of PLACES) if (place !== 'oven') expect(raw(rest(smoothDough(), place, 60)).rise).toBe(0)
    expect(canRise(raw(tipAll(null, 'flour', 'water', 'bubbly'))), 'not worked in yet').toBe(false)
    expect(canRise(raw(smoothDough('bubbly')))).toBe(true)
  })

  it('is quick in the warm nook, slow on the board and absent on the cold sill', () => {
    const dough = smoothDough('bubbly')
    expect(raw(rest(dough, 'nook', RISE_SECONDS)).rise).toBeCloseTo(RISE_FULL)
    expect(raw(rest(dough, 'board', RISE_SECONDS)).rise).toBeCloseTo(RISE_FULL / BOARD_SLOWER)
    expect(raw(rest(dough, 'sill', 600)).rise).toBe(0)
  })

  it('stops when it is full and stays there however long it waits', () => {
    const full = rest(smoothDough('bubbly'), 'nook', RISE_SECONDS * 2)
    expect(raw(full).rise).toBe(RISE_FULL)
    expect(rest(full, 'nook', 3600)).toEqual(full)
  })

  it('stops halfway in dough that is not smooth', () => {
    const rough = pushes(tipAll(null, 'flour', 'water', 'bubbly'), WORK_SHAGGY * 2)
    expect(textureOf(raw(rough))).toBe('shaggy')
    expect(raw(rest(rough, 'nook', 600)).rise).toBe(RISE_ROUGH_CAP)
  })

  it('is knocked out by a push, with a sigh', () => {
    const risen = rest(smoothDough('bubbly'), 'nook', RISE_SECONDS)
    const pushed = push(risen)
    expect(pushed.effect).toBe('sigh')
    expect(raw(pushed.load).rise).toBeLessThan(raw(risen).rise)
    expect(raw(pushes(risen, 10)).rise).toBe(0)
  })

  it('takes the same time in one step or in many frames', () => {
    let stepped = smoothDough('bubbly')
    for (let i = 0; i < 180; i++) stepped = rest(stepped, 'nook', RISE_SECONDS / 2 / 180)
    expect(raw(stepped).rise).toBeCloseTo(raw(rest(smoothDough('bubbly'), 'nook', RISE_SECONDS / 2)).rise)
  })
})

describe('the oven', () => {
  it('bakes raw stuff in its own time and not before', () => {
    const dough = smoothDough()
    const half = rest(dough, 'oven', BAKE_SECONDS / 2)
    expect(raw(half).bake).toBeCloseTo(50)
    expect(bread(rest(half, 'oven', BAKE_SECONDS / 2)).crust).toBe('gold')
  })

  it('makes each stuff into its own thing', () => {
    expect(bake(null)).toBeNull()
    expect(bake(tipAll(null, 'water')), 'water leaves only steam').toBeNull()
    expect(bread(bake(tipAll(null, 'flour')))).toMatchObject({ crumb: 'dust', shape: 'heap' })
    expect(bread(bake(tipAll(null, 'seeds')))).toMatchObject({ crumb: 'seeds', seeds: true })
    expect(bread(bake(tipAll(null, 'water', 'seeds')))).toMatchObject({ crumb: 'seeds' })
    expect(bread(bake(tipAll(null, 'bubbly')))).toMatchObject({ crumb: 'pancake', shape: 'flat' })
    expect(bread(bake(tipAll(null, 'flour', 'water', 'water')))).toMatchObject({ crumb: 'pancake', shape: 'flat' })
    expect(bread(bake(tipAll(null, 'flour', 'water')))).toMatchObject({ crumb: 'crumbly', shape: 'round' })
    expect(bread(bake(smoothDough()))).toMatchObject({ crumb: 'dense', shape: 'round', seeds: false })
    expect(bread(bake(pull(smoothDough('seeds')).load))).toMatchObject({ crumb: 'dense', shape: 'long', seeds: true })
  })

  it('makes an airy loaf only from smooth dough that rose, and a brick from the same dough that did not', () => {
    const dough = smoothDough('bubbly')
    expect(bread(bake(rest(dough, 'nook', RISE_SECONDS))).crumb).toBe('airy')
    expect(bread(bake(dough)).crumb).toBe('dense')
    expect(bread(bake(rest(dough, 'sill', 600))).crumb).toBe('dense')
    const justEnough = rest(dough, 'nook', (RISE_SECONDS * RISE_AIRY) / RISE_FULL + 0.01)
    expect(bread(bake(justEnough)).crumb).toBe('airy')
    expect(bread(bake(push(rest(dough, 'nook', RISE_SECONDS)).load)).crumb, 'one push leaves enough air').toBe('airy')
    expect(bread(bake(pushes(rest(dough, 'nook', RISE_SECONDS), 2))).crumb, 'two knock it flat').toBe('dense')
  })

  it('is never undone: a bread does not change with time, in any place', () => {
    const brick = bake(smoothDough())
    for (const place of PLACES) expect(rest(brick, place, 3600)).toEqual(brick)
    expect(push(brick)).toEqual({ load: brick, effect: 'knock' })
    for (const what of ['flour', 'water', 'bubbly', 'seeds'] as const) expect(tip(brick, what)).toEqual({ load: brick, effect: 'slides-off' })
  })

  it('darkens a bread one step each time it goes back in, and black stays black', () => {
    const gold = bread(bake(smoothDough()))
    expect(darker(gold).crust).toBe('dark')
    expect(darker(darker(gold)).crust).toBe('black')
    expect(darker(darker(darker(gold))).crust).toBe('black')
    expect(darker(gold)).toMatchObject({ crumb: gold.crumb, shape: gold.shape, seeds: gold.seeds })
  })

  it('gives the same bread whatever the frame length', () => {
    let stepped: Load = rest(smoothDough('bubbly'), 'nook', RISE_SECONDS)
    for (let i = 0; i < 400 && stepped?.raw; i++) stepped = rest(stepped, 'oven', 1 / 60)
    expect(stepped).toEqual(bake(rest(smoothDough('bubbly'), 'nook', RISE_SECONDS)))
  })
})

describe('every act is answered', () => {
  it('gives an effect for every ingredient on every kind of load, and never throws', () => {
    const loads: Load[] = [null, tipAll(null, 'flour'), tipAll(null, 'water'), tipAll(null, 'seeds'), tipAll(null, 'bubbly'), smoothDough(), bake(smoothDough()), bakedFrom(raw(tipAll(null, 'flour')))]
    for (const load of loads) {
      for (const what of ['flour', 'water', 'bubbly', 'seeds'] as const) expect(tip(load, what).effect).toBeTruthy()
      for (const act of [push, pull, gather]) expect(act(load).effect).toBeTruthy()
    }
  })
})
