import { describe, expect, it } from 'vitest'
import { CHALK_AREA, DANDELION, PLACES, PLACE_IDS, PUDDLE, TAR, TARGET, WRIST_STRIP, crossesPuddle, distance, inPuddle, isPlaceId, onTar } from './yard'

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

  it('puts the puddle between the two halves of the low row and on no other straight way along a row', () => {
    expect(crossesPuddle(PLACES['low-1'], PLACES['low-4'])).toBe(true)
    expect(crossesPuddle(PLACES['low-2'], PLACES['low-3'])).toBe(true)
    expect(crossesPuddle(PLACES['low-1'], PLACES['low-2'])).toBe(false)
    expect(crossesPuddle(PLACES['mid-1'], PLACES['mid-4'])).toBe(false)
    expect(crossesPuddle(PLACES['top-1'], PLACES['top-4'])).toBe(false)
  })

  it('tells water from tar', () => {
    expect(inPuddle({ x: PUDDLE.x, y: PUDDLE.y })).toBe(true)
    expect(inPuddle({ x: PUDDLE.x + PUDDLE.rx + 5, y: PUDDLE.y })).toBe(false)
  })

  it('knows its place ids and keeps points on the tar', () => {
    expect(isPlaceId('mid-1')).toBe(true)
    expect(isPlaceId('level-2')).toBe(false)
    expect(isPlaceId(3)).toBe(false)
    expect(onTar({ x: -40, y: 9000 })).toEqual({ x: CHALK_AREA.x0, y: CHALK_AREA.y1 })
    // The room kept at the top is a train's height, so a train on any mark is in view.
    expect(CHALK_AREA.y0).toBeGreaterThanOrEqual(125)
    expect(onTar({ x: 600, y: 300 })).toEqual({ x: 600, y: 300 })
  })
})
