import { describe, expect, it } from 'vitest'
import { beatColumn, columnTargets, CRUISE_Y, fireflyAt, HOME_Z, phaseAt, STEPS, type Vec3 } from './choir'
import { COLUMNS, columnX, PADS } from './layout'
import { defaultPond } from './state'

function targetsFor(frogs: (number | null)[]) {
  const targets = new Float32Array(COLUMNS)
  const occupied = new Uint8Array(COLUMNS)
  columnTargets(frogs, targets, occupied)
  return { targets, occupied }
}

describe('the firefly loop', () => {
  it('crosses each column once per eight-beat loop and rests on the flight home', () => {
    const columns = Array.from({ length: STEPS * 2 }, (_, k) => beatColumn(k))
    expect(columns).toEqual([0, 1, 2, 3, 4, 5, -1, -1, 0, 1, 2, 3, 4, 5, -1, -1])
    expect(beatColumn(-1)).toBe(-1)
    expect(beatColumn(-8)).toBe(0)
  })

  it('wraps the phase into the loop', () => {
    expect(phaseAt(0, 0.75)).toBe(0)
    expect(phaseAt(0.75 * 9, 0.75)).toBeCloseTo(1)
    expect(phaseAt(-0.75, 0.75)).toBeCloseTo(7)
  })

  it('aims at a lone frog, between two frogs, and along a line over empty columns', () => {
    const pond = defaultPond()
    const { targets, occupied } = targetsFor(pond.frogs)
    for (let c = 0; c < 5; c++) expect(targets[c]).toBeCloseTo(PADS[pond.frogs[c]].z)
    expect(occupied[5]).toBe(0)
    expect(targets[5]).toBeCloseTo(targets[4])

    const chord = PADS.filter((pad) => pad.column === 2).map((pad) => pad.index)
    const both = targetsFor([chord[0], chord[1], null, null, null])
    expect(both.occupied[2]).toBe(2)
    expect(both.targets[2]).toBeCloseTo((PADS[chord[0]].z + PADS[chord[1]].z) / 2)

    const ends = targetsFor([PADS[0].index, PADS[10].index, null, null, null])
    expect(ends.targets[2]).toBeGreaterThan(Math.min(ends.targets[0], ends.targets[5]) - 1e-6)
    expect(ends.targets[2]).toBeLessThan(Math.max(ends.targets[0], ends.targets[5]) + 1e-6)
  })

  it('is directly over each lone frog on its beat, dipping toward it', () => {
    const pond = defaultPond()
    const { targets, occupied } = targetsFor(pond.frogs)
    const at: Vec3 = { x: 0, y: 0, z: 0 }
    for (let c = 0; c < 5; c++) {
      fireflyAt(c, targets, occupied, at)
      expect(at.x).toBeCloseTo(columnX(c))
      expect(at.z).toBeCloseTo(PADS[pond.frogs[c]].z)
      expect(at.y).toBeLessThan(CRUISE_Y)
    }
    fireflyAt(5, targets, occupied, at)
    expect(at.y).toBeCloseTo(CRUISE_Y)
  })

  it('climbs up the screen as the default melody rises', () => {
    const { targets, occupied } = targetsFor(defaultPond().frogs)
    const at: Vec3 = { x: 0, y: 0, z: 0 }
    let lastZ = Infinity
    for (let c = 0; c < 5; c++) {
      fireflyAt(c, targets, occupied, at)
      expect(at.z).toBeLessThan(lastZ)
      lastZ = at.z
    }
  })

  it('flies home over the far shore and moves continuously all the way round', () => {
    const { targets, occupied } = targetsFor(defaultPond().frogs)
    const at: Vec3 = { x: 0, y: 0, z: 0 }
    fireflyAt(6.5, targets, occupied, at)
    expect(at.z).toBeCloseTo(HOME_Z)
    expect(at.x).toBeCloseTo(0)
    const prev: Vec3 = { x: 0, y: 0, z: 0 }
    fireflyAt(0, targets, occupied, prev)
    const steps = 800
    for (let i = 1; i <= steps; i++) {
      fireflyAt((i / steps) * STEPS, targets, occupied, at)
      expect(Math.hypot(at.x - prev.x, at.y - prev.y, at.z - prev.z), `step ${i}`).toBeLessThan(0.2)
      prev.x = at.x
      prev.y = at.y
      prev.z = at.z
    }
  })
})
