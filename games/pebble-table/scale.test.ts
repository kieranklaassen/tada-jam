import { describe, expect, it } from 'vitest'
import { SCALE } from './layout'
import { creak, panDrops, panOf, panWeights, restingBeam, stepBeam, targetTilt, type Beam } from './scale'
import type { Piece } from './state'

const [leftPan, rightPan] = SCALE.pans
let nextId = 1
const on = (side: 0 | 1, count: number, q: 1 | 2 | 4 = 4): Piece[] => {
  const pan = side === 0 ? leftPan : rightPan
  return Array.from({ length: count }, (_, i) => ({ id: nextId++, q, x: pan.x - 60 + i * 20, y: pan.y }))
}

function settle(beam: Beam, target: number, seconds: number) {
  let current = beam
  let levelEvents = 0
  let wasLevel = beam.settledLevel
  for (let t = 0; t < seconds; t += 1 / 60) {
    current = stepBeam(current, target, 1 / 60)
    if (current.settledLevel && !wasLevel) levelEvents++
    wasLevel = current.settledLevel
  }
  return { beam: current, levelEvents }
}

describe('Honest Scale', () => {
  it('targets level with empty pans', () => {
    expect(targetTilt(panWeights([]))).toBe(0)
  })

  it('tilts toward the heavier pan, more for a bigger difference, never past the maximum', () => {
    const one = targetTilt(panWeights(on(0, 1)))
    const three = targetTilt(panWeights(on(0, 3)))
    const ten = targetTilt(panWeights(on(0, 10)))
    expect(three).toBeLessThan(0)
    expect(Math.abs(three)).toBeGreaterThan(Math.abs(one))
    expect(Math.abs(ten)).toBeLessThanOrEqual(SCALE.maxTilt)
    expect(targetTilt(panWeights(on(1, 2)))).toBeGreaterThan(0)
  })

  it('Covers AE4. three and three settle level, silent, with one level event', () => {
    const tilted = settle(restingBeam(), targetTilt(panWeights(on(0, 3))), 3).beam
    const target = targetTilt(panWeights([...on(0, 3), ...on(1, 3)]))
    expect(target).toBe(0)
    const { beam, levelEvents } = settle(tilted, target, 3)
    expect(beam.angle).toBe(0)
    expect(creak(beam).gain).toBe(0)
    expect(levelEvents).toBe(1)
  })

  it('balances two halves against one whole stone', () => {
    expect(targetTilt(panWeights([...on(0, 2, 2), ...on(1, 1, 4)]))).toBe(0)
  })

  it('counts a straddling stone only when its center is inside the pan', () => {
    expect(panOf({ x: leftPan.x + leftPan.r - 1, y: leftPan.y })).toBe(0)
    expect(panOf({ x: leftPan.x + leftPan.r + 5, y: leftPan.y })).toBeNull()
  })

  it('comes to rest within two seconds instead of swinging forever', () => {
    const { beam } = settle(restingBeam(), targetTilt(panWeights(on(1, 4))), 2)
    expect(beam.velocity).toBe(0)
  })

  it('creaks while moving and drops the heavier pan', () => {
    const moving = stepBeam(restingBeam(), SCALE.maxTilt, 0.05)
    expect(creak(moving).gain).toBeGreaterThan(0)
    const [leftDrop, rightDrop] = panDrops(SCALE.maxTilt)
    expect(rightDrop).toBe(SCALE.maxDrop)
    expect(leftDrop).toBe(-SCALE.maxDrop)
  })
})
