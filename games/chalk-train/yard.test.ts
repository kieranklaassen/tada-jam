import { describe, expect, it } from 'vitest'
import { DANDELION, PLACES, PLACE_IDS, PUDDLE, TAR, TARGET, WRIST_STRIP, crossesPuddle, distance, inPuddle, isPlaceId, onTar } from './yard'

describe('the patch of tar', () => {
  it('keeps every place a child aims at out of the wrist strip and on the tar', () => {
    for (const id of PLACE_IDS) {
      const p = PLACES[id]
      expect(p.y + TARGET / 2).toBeLessThanOrEqual(TAR.h - WRIST_STRIP)
      expect(p.x - TARGET / 2).toBeGreaterThanOrEqual(0)
      expect(p.x + TARGET / 2).toBeLessThanOrEqual(TAR.w)
      expect(p.y - TARGET / 2).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps places well apart: two targets never touch', () => {
    for (const a of PLACE_IDS) for (const b of PLACE_IDS) {
      if (a !== b) expect(distance(PLACES[a], PLACES[b])).toBeGreaterThanOrEqual(TARGET * 2)
    }
  })

  it('keeps the puddle and the dandelion clear of every place', () => {
    for (const id of PLACE_IDS) {
      expect(inPuddle(PLACES[id], TARGET / 2)).toBe(false)
      expect(distance(PLACES[id], DANDELION)).toBeGreaterThan(TARGET + DANDELION.reach)
    }
  })

  it('puts the puddle between the two southern places and nowhere else on a straight way', () => {
    expect(crossesPuddle(PLACES['south-west'], PLACES['south-east'])).toBe(true)
    expect(crossesPuddle(PLACES.west, PLACES.east)).toBe(false)
    expect(crossesPuddle(PLACES['north-west'], PLACES['north-east'])).toBe(false)
  })

  it('tells water from tar', () => {
    expect(inPuddle({ x: PUDDLE.x, y: PUDDLE.y })).toBe(true)
    expect(inPuddle({ x: PUDDLE.x + PUDDLE.rx + 5, y: PUDDLE.y })).toBe(false)
  })

  it('knows its place ids and keeps points on the tar', () => {
    expect(isPlaceId('west')).toBe(true)
    expect(isPlaceId('level-2')).toBe(false)
    expect(isPlaceId(3)).toBe(false)
    expect(onTar({ x: -40, y: 9000 })).toEqual({ x: 0, y: TAR.h })
  })
})
