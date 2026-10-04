import { describe, expect, it } from 'vitest'
import { atRest, clamp01, easeInOut, easeOut, hop, lerp, overshoot, scatter, stepSpring, type Spring } from './fx'
import { GROWN_UP_CORNER, POD_AT, beetleHome, dustAt, packetPlaces, potAt, standingOf, targetAt } from './hit'
import { freshLab, type LabState } from './lab'
import { HANDLE, layoutOf } from './layout'
import { kitAt } from './order'
import { dab, sow } from './page'
import { POD } from './specimen'

const SEED = 20261003
const layout = layoutOf(1180, 820)
const bloom = () => true
const page = (): LabState => freshLab(null, SEED)

describe('a spring', () => {
  it('comes to rest at its target, from a kick or from a distance', () => {
    const kicked: Spring = { x: 0, v: 6 }, far: Spring = { x: 1, v: 0 }
    for (let frame = 0; frame < 240; frame++) { stepSpring(kicked, 0, 180, 12, 1 / 60); stepSpring(far, 0, 180, 12, 1 / 60) }
    expect(atRest(kicked, 0)).toBe(true)
    expect(atRest(far, 0)).toBe(true)
  })

  it('swings past its target before it settles: it has weight', () => {
    const spring: Spring = { x: 1, v: 0 }
    let lowest = 1
    for (let frame = 0; frame < 120; frame++) { stepSpring(spring, 0, 180, 9, 1 / 60); lowest = Math.min(lowest, spring.x) }
    expect(lowest).toBeLessThan(-0.05)
  })

  it('stays finite through one very long frame and through no time at all', () => {
    const spring: Spring = { x: 1, v: 50 }
    stepSpring(spring, 0, 400, 4, 30)
    expect(Number.isFinite(spring.x) && Number.isFinite(spring.v)).toBe(true)
    const before = { ...spring }
    stepSpring(spring, 0, 400, 4, 0)
    expect(spring).toEqual(before)
  })

  it('ends up in the same place whether a second comes as 30 frames or as 120', () => {
    const slow: Spring = { x: 1, v: 0 }, fast: Spring = { x: 1, v: 0 }
    for (let frame = 0; frame < 30; frame++) stepSpring(slow, 0, 120, 8, 1 / 30)
    for (let frame = 0; frame < 120; frame++) stepSpring(fast, 0, 120, 8, 1 / 120)
    expect(slow.x).toBeCloseTo(fast.x, 2)
  })
})

describe('easing and hops', () => {
  it('starts at 0 and ends at 1, and holds outside that', () => {
    for (const ease of [easeOut, easeInOut, overshoot]) {
      expect(ease(0)).toBeCloseTo(0, 6)
      expect(ease(1)).toBeCloseTo(1, 6)
      expect(ease(-3)).toBeCloseTo(0, 6)
      expect(ease(7)).toBeCloseTo(1, 6)
    }
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('pops past the end on the way to it', () => {
    let highest = 0
    for (let step = 0; step <= 50; step++) highest = Math.max(highest, overshoot(step / 50))
    expect(highest).toBeGreaterThan(1.03)
  })

  it('hops from one place to another and is highest half way', () => {
    expect(hop(0, 100, 200, 100, 40, 0)).toEqual({ x: 0, y: 100 })
    expect(hop(0, 100, 200, 100, 40, 1)).toEqual({ x: 200, y: 100 })
    expect(hop(0, 100, 200, 100, 40, 0.5)).toEqual({ x: 100, y: 60 })
  })

  it('scatters the same number for the same seed and spreads over 0 to 1', () => {
    expect(scatter(3, 9)).toBe(scatter(3, 9))
    const tenths = new Array(10).fill(0)
    for (let index = 0; index < 5000; index++) tenths[Math.floor(scatter(17, index) * 10)]++
    for (const count of tenths) expect(Math.abs(count - 500)).toBeLessThan(120)
  })
})

describe('what lies under a finger', () => {
  it('is a flower at the top of a plant in bloom, and the pot below it', () => {
    const state = page(), plant = state.plants[0], at = standingOf(layout, plant)
    expect(targetAt(state, layout, at.flower, bloom)).toEqual({ kind: 'flower', plant: plant.id })
    expect(targetAt(state, layout, { x: at.x, y: at.y + 20 }, bloom)).toEqual({ kind: 'pot', row: 'shelf', slot: 0, plant: plant.id })
    // The stem and leaves count as the pot: a plant is carried by its body.
    expect(targetAt(state, layout, { x: at.x, y: (at.y + at.flower.y) / 2 + 20 }, bloom)).toEqual({ kind: 'pot', row: 'shelf', slot: 0, plant: plant.id })
  })

  it('is no flower while the plant is still drawing itself', () => {
    const state = page(), at = standingOf(layout, state.plants[0])
    expect(targetAt(state, layout, at.flower, () => false).kind).toBe('pot')
  })

  it('is a pod before its flower, where a plant holds one', () => {
    const state = dab(page(), 1, 2).state, at = standingOf(layout, state.plants[1])
    expect(targetAt(state, layout, at.pod, bloom)).toEqual({ kind: 'pod', plant: 2 })
    expect(targetAt(state, layout, { x: at.flower.x - 14, y: at.flower.y + 8 }, bloom)).toEqual({ kind: 'flower', plant: 2 })
  })

  it('finds a pod where the view draws it', () => {
    expect(POD_AT).toEqual({ x: POD.x, y: POD.y })
  })

  it('is bare soil in an empty pot, a packet, the beetle, or the paper', () => {
    const state = page(), pot = layout.tray[3].pot
    expect(targetAt(state, layout, { x: pot.x + pot.w / 2, y: pot.y + pot.h / 2 }, bloom)).toEqual({ kind: 'pot', row: 'tray', slot: 3, plant: null })
    const [packet] = packetPlaces(state, layout)
    expect(packet.packet).toBe('pink')
    expect(targetAt(state, layout, { x: packet.x + packet.w / 2, y: packet.y + packet.h / 2 }, bloom)).toEqual({ kind: 'packet', packet: 'pink' })
    const home = beetleHome(layout)
    expect(targetAt(state, layout, { x: home.x, y: home.y - 30 * home.s }, bloom)).toEqual({ kind: 'beetle' })
    expect(targetAt(state, layout, { x: home.x + 400, y: home.y - 30 }, bloom, { x: home.x + 400, y: home.y })).toEqual({ kind: 'beetle' })
    expect(targetAt(state, layout, { x: layout.tray[2].cell.x + 4, y: layout.tray[2].cell.y + 30 }, bloom)).toEqual({ kind: 'paper' })
  })

  it('shows only the packets that have arrived, in a fixed order', () => {
    expect(packetPlaces({ ...page(), kit: kitAt('whole-plant') }, layout).map((spot) => spot.packet)).toEqual(['pink', 'short', 'jagged', 'spots'])
    expect(packetPlaces(page(), layout)).toHaveLength(1)
  })

  it('is a border plant in the border', () => {
    const state = sow(page(), 'pink', 'shelf', 0).state, spot = layout.border[0]
    expect(targetAt(state, layout, { x: spot.x, y: spot.ground - 10 }, bloom)).toEqual({ kind: 'border', plant: 1 })
    expect(standingOf(layout, state.plants.find((plant) => plant.id === 1)!).k).toBe(layout.small)
  })

  it('is a pod wherever a border plant holds one: the whole small plant is its handle', () => {
    const state = sow(dab(page(), 2, 1).state, 'pink', 'shelf', 0).state, spot = layout.border[0]
    expect(targetAt(state, layout, { x: spot.x, y: spot.ground - 10 }, bloom)).toEqual({ kind: 'pod', plant: 1 })
  })

  it('answers nothing in the grown-up’s corner', () => {
    expect(targetAt(page(), layout, { x: layout.w - 10, y: 10 }, bloom)).toEqual({ kind: 'none' })
    expect(targetAt(page(), layout, { x: layout.w - GROWN_UP_CORNER - 5, y: 10 }, bloom).kind).not.toBe('none')
  })

  it('gives every flower a handle of 48 px or more', () => {
    const state = page(), at = standingOf(layout, state.plants[0])
    expect(targetAt(state, layout, { x: at.flower.x + HANDLE / 2 - 1, y: at.flower.y }, bloom).kind).toBe('flower')
  })
})

describe('where a thing is set down', () => {
  it('is the pot whose slot holds the point, or the nearest within reach, or none', () => {
    const cell = layout.tray[4].cell
    expect(potAt(layout, { x: cell.x + cell.w / 2, y: cell.y + 20 })).toEqual({ row: 'tray', slot: 4 })
    expect(potAt(layout, { x: layout.shelf[0].cell.x - 30, y: layout.shelf[0].cell.y + 50 })).toEqual({ row: 'shelf', slot: 0 })
    expect(potAt(layout, { x: layout.shelf[0].cell.x - 300, y: 5 })).toBe(null)
  })

  it('lets dust land on a plant’s flower from anywhere in its slot, on bare soil as soil, and elsewhere on the paper', () => {
    const state = page(), cell = layout.shelf[1].cell
    expect(dustAt(state, layout, { x: cell.x + 6, y: cell.y + cell.h - 30 }, bloom)).toEqual({ kind: 'flower', plant: 2 })
    const empty = layout.tray[0].cell
    expect(dustAt(state, layout, { x: empty.x + 10, y: empty.y + 10 }, bloom)).toEqual({ kind: 'pot', row: 'tray', slot: 0, plant: null })
    expect(dustAt(state, layout, { x: layout.w / 2, y: 3 }, bloom)).toEqual({ kind: 'paper' })
    expect(dustAt(state, layout, { x: cell.x + 6, y: cell.y + cell.h - 30 }, () => false)).toEqual({ kind: 'paper' })
    expect(dustAt(dab(state, 1, 2).state, layout, { x: cell.x + 6, y: cell.y + cell.h - 30 }, bloom)).toEqual({ kind: 'pod', plant: 2 })
  })
})
