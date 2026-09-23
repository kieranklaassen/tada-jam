import { describe, expect, it } from 'vitest'
import { ALL_HUES, BLUE, BROWN, GREEN, isHue, mix, ORANGE, PURPLE, RED, YELLOW } from './colors'
import { onPouch, plotAt, PLOTS, SEED_RADIUS } from './layout'
import { addLoose, blend, deserialize, defaultMeadow, MAX_LOOSE, mixOf, pick, plant, readyToMix, serialize, takeLoose, visit } from './meadow'

describe('colours', () => {
  it('mixes two primaries into the secondary a child would paint', () => {
    expect(mix(RED, YELLOW)).toBe(ORANGE)
    expect(mix(BLUE, YELLOW)).toBe(GREEN)
    expect(mix(RED, BLUE)).toBe(PURPLE)
  })

  it('is symmetric, keeps a colour mixed with itself, and turns everything into brown', () => {
    for (const a of ALL_HUES) {
      expect(mix(a, a)).toBe(a)
      expect(mix(a, BROWN)).toBe(BROWN)
      for (const b of ALL_HUES) {
        expect(mix(a, b)).toBe(mix(b, a))
        expect(isHue(mix(a, b))).toBe(true)
      }
    }
    expect(mix(ORANGE, BLUE)).toBe(BROWN)
    expect(mix(ORANGE, RED)).toBe(ORANGE)
  })

  it('rejects anything that is not a hue', () => {
    for (const bad of [0, 8, 1.5, -1, '1', null, undefined, Number.NaN]) expect(isHue(bad)).toBe(false)
  })
})

describe('meadow state', () => {
  it('plants only into an empty molehill and picks a flower back into its seed', () => {
    const meadow = defaultMeadow()
    expect(plant(meadow, 1, RED)).toBe(true)
    expect(plant(meadow, 1, BLUE)).toBe(false)
    expect(plant(meadow, 5, BLUE)).toBe(false)
    expect(meadow.plots).toEqual([null, RED, null])
    expect(pick(meadow, 1)).toBe(RED)
    expect(pick(meadow, 1)).toBeNull()
    expect(meadow.plots).toEqual([null, null, null])
  })

  it('keeps the two most recent different pollen colours', () => {
    const meadow = defaultMeadow()
    visit(meadow, RED)
    visit(meadow, RED)
    expect(meadow.pollen).toEqual([RED])
    expect(mixOf(meadow)).toBeNull()
    visit(meadow, YELLOW)
    visit(meadow, BLUE)
    expect(meadow.pollen).toEqual([YELLOW, BLUE])
    visit(meadow, YELLOW)
    expect(meadow.pollen).toEqual([BLUE, YELLOW])
    expect(mixOf(meadow)).toBe(GREEN)
  })

  it('holds the pollen until the blend, then clears it', () => {
    const meadow = defaultMeadow()
    visit(meadow, RED)
    visit(meadow, BLUE)
    expect(readyToMix(meadow)).toBe(true)
    expect(blend(meadow)).toBe(PURPLE)
    expect(meadow.pollen).toEqual([])
    expect(blend(meadow)).toBeNull()
  })

  it('waits to mix while the grass is crowded', () => {
    const meadow = defaultMeadow()
    visit(meadow, RED)
    visit(meadow, BLUE)
    for (let i = 0; i < 3; i++) addLoose(meadow, YELLOW, { x: -20 + i * 10, z: 20 })
    expect(readyToMix(meadow)).toBe(false)
  })

  it('rolls the oldest primary home when the grass is full, never a mixed seed', () => {
    const meadow = defaultMeadow()
    const first = addLoose(meadow, ORANGE, { x: 0, z: 25 }).seed
    const second = addLoose(meadow, RED, { x: 10, z: 25 }).seed
    for (let i = 0; i < MAX_LOOSE - 2; i++) addLoose(meadow, BLUE, { x: -60 + i * 8, z: -30 })
    expect(meadow.loose).toHaveLength(MAX_LOOSE)
    const { returned } = addLoose(meadow, GREEN, { x: 40, z: 25 })
    expect(returned.map((seed) => seed.id)).toEqual([second.id])
    expect(meadow.loose).toHaveLength(MAX_LOOSE)
    expect(meadow.loose.some((seed) => seed.id === first.id)).toBe(true)
  })

  it('takes a loose seed by id exactly once', () => {
    const meadow = defaultMeadow()
    const { seed } = addLoose(meadow, RED, { x: 0, z: 20 })
    expect(takeLoose(meadow, seed.id)?.hue).toBe(RED)
    expect(takeLoose(meadow, seed.id)).toBeNull()
  })
})

describe('saving', () => {
  it('round-trips through JSON', () => {
    const meadow = defaultMeadow()
    plant(meadow, 0, PURPLE)
    addLoose(meadow, GREEN, { x: 12.34, z: 18.76 })
    visit(meadow, RED)
    const saved = JSON.parse(JSON.stringify(serialize(meadow)))
    const back = deserialize(saved)
    expect(back.plots).toEqual([PURPLE, null, null])
    expect(back.pollen).toEqual([RED])
    expect(back.loose).toHaveLength(1)
    expect(back.loose[0].hue).toBe(GREEN)
    expect(back.nextId).toBeGreaterThan(back.loose[0].id)
  })

  it('lays a seed under a finger on the grass, off every molehill and the pouch', () => {
    const meadow = defaultMeadow()
    const saved = serialize(meadow, [
      { hue: RED, x: PLOTS[1].x, z: PLOTS[1].z },
      { hue: ORANGE, x: -62, z: 19 },
    ])
    expect(saved.loose.map((seed) => seed.hue)).toEqual([RED, ORANGE])
    for (const seed of saved.loose) {
      expect(plotAt(seed.x, seed.z, SEED_RADIUS)).toBe(-1)
      expect(onPouch(seed.x, seed.z)).toBe(false)
    }
    expect(new Set(saved.loose.map((seed) => seed.id)).size).toBe(2)
    expect(meadow.loose).toHaveLength(0)
  })

  it('never throws on damaged saves and keeps what is valid', () => {
    for (const raw of [null, 7, 'x', [], { v: 2 }, { v: 1, plots: 'no' }]) expect(deserialize(raw)).toEqual(defaultMeadow())
    const back = deserialize({
      v: 1,
      plots: [RED, 9, 'blue'],
      loose: [{ id: 3, hue: BLUE, x: 1, z: 2 }, { id: 3, hue: RED, x: 5, z: 5 }, { id: -1, hue: RED }, { hue: 8, id: 4 }, 'junk', { id: 5, hue: YELLOW, x: 'far' }],
      pollen: [RED, RED, 9, BLUE, YELLOW],
      nextId: 'eleven',
    })
    expect(back.plots).toEqual([RED, null, null])
    expect(back.loose.map((seed) => [seed.id, seed.hue])).toEqual([
      [3, BLUE],
      [5, YELLOW],
    ])
    expect(back.pollen).toEqual([RED, BLUE])
    expect(back.nextId).toBe(6)
  })

  it('caps loose seeds at the grass limit and spreads stacked seeds apart', () => {
    const loose = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, hue: RED, x: 0, z: 20 }))
    const back = deserialize({ v: 1, plots: [], loose, pollen: [], nextId: 1 })
    expect(back.loose).toHaveLength(MAX_LOOSE)
    for (let i = 0; i < back.loose.length; i++) {
      for (let j = i + 1; j < back.loose.length; j++) {
        expect(Math.hypot(back.loose[i].x - back.loose[j].x, back.loose[i].z - back.loose[j].z)).toBeGreaterThan(SEED_RADIUS * 2)
      }
    }
  })
})
