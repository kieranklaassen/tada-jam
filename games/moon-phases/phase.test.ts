import { describe, expect, it } from 'vitest'
import { PHASE_COUNT, TAU, elongationAt, isWaxing, litFraction, litPath, orbitPoint, phaseAngle, phaseIndex, shortestTurn, wrap } from './phase'

describe('moon phase geometry', () => {
  it('is dark at new moon, half lit at the quarters and fully lit at full moon', () => {
    expect(litFraction(0)).toBeCloseTo(0)
    expect(litFraction(Math.PI / 2)).toBeCloseTo(0.5)
    expect(litFraction(Math.PI)).toBeCloseTo(1)
    expect(litFraction((3 * Math.PI) / 2)).toBeCloseTo(0.5)
  })

  it('waxes on the way to full and wanes after', () => {
    expect(isWaxing(0.3)).toBe(true)
    expect(isWaxing(Math.PI + 0.3)).toBe(false)
    expect(isWaxing(-0.3)).toBe(false)
  })

  it('names the nearest of the eight phases and wraps around', () => {
    expect(phaseIndex(0)).toBe(0)
    expect(phaseIndex(Math.PI)).toBe(4)
    expect(phaseIndex(TAU - 0.1)).toBe(0)
    for (let i = 0; i < PHASE_COUNT; i++) expect(phaseIndex(phaseAngle(i) + 0.2)).toBe(i)
  })

  it('new moon sits between Earth and the sun (along −x); full moon on the far side', () => {
    const r = 3
    expect(orbitPoint(0, r).x).toBeCloseTo(-r)
    expect(orbitPoint(Math.PI, r).x).toBeCloseTo(r)
    // Counter-clockwise seen from above (+y): a quarter turn after new moon is towards +z.
    expect(orbitPoint(Math.PI / 2, r).z).toBeCloseTo(r)
  })

  it('reads the elongation back from any point on the orbit', () => {
    for (let a = 0; a < TAU; a += 0.37) {
      const p = orbitPoint(a, 2.5)
      expect(elongationAt(p.x, p.z)).toBeCloseTo(a)
    }
  })

  it('takes the short way round', () => {
    expect(shortestTurn(0.1, TAU - 0.1)).toBeCloseTo(-0.2)
    expect(shortestTurn(TAU - 0.1, 0.1)).toBeCloseTo(0.2)
    expect(wrap(-0.5)).toBeCloseTo(TAU - 0.5)
  })
})

describe('phase pictures', () => {
  // The lit region's extent along x, read from the arc end points and the
  // terminator's radius: a crescent covers only the limb side.
  const arcs = (path: string) => [...path.matchAll(/A([\d.]+) ([\d.]+) 0 0 ([01]) /g)].map(m => ({ rx: Number(m[1]), sweep: Number(m[3]) }))

  it('draws nothing at new moon and a full disc at full moon', () => {
    expect(litPath(0, 10)).toBe('')
    expect(litPath(Math.PI, 10)).toContain('A10 10 0 1 1')
  })

  it('lights the right limb while waxing and the left while waning', () => {
    expect(arcs(litPath(1, 10))[0].sweep).toBe(1)
    expect(arcs(litPath(TAU - 1, 10))[0].sweep).toBe(0)
  })

  it('a crescent terminator bows towards the lit limb; a gibbous one away from it', () => {
    // Waxing crescent: back from bottom to top through the right (counter-clockwise, sweep 0).
    expect(arcs(litPath(0.8, 10))[1].sweep).toBe(0)
    // Waxing gibbous: back through the left (sweep 1).
    expect(arcs(litPath(2.3, 10))[1].sweep).toBe(1)
    // Waning mirrors both.
    expect(arcs(litPath(TAU - 0.8, 10))[1].sweep).toBe(1)
    expect(arcs(litPath(TAU - 2.3, 10))[1].sweep).toBe(0)
  })

  it('the terminator is straight at the quarters', () => {
    expect(arcs(litPath(Math.PI / 2, 10))[1].rx).toBeCloseTo(0)
  })
})
