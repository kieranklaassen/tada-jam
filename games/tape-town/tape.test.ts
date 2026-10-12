import { describe, expect, it } from 'vitest'
import { EDGE, FIELD, TAPE_WIDTH } from './layout'
import { MAX_STRIPS, along, isStub, lay, lengthOf, nearestOn, readStrip, stripFrom, type Strip } from './tape'

const road = (ax: number, ay: number, bx: number, by: number): Strip => ({ kind: 0, ax, ay, bx, by })

describe('a strip of tape', () => {
  it('runs from where the finger landed to where it lifted, in whole stage units', () => {
    expect(stripFrom(1, { x: 300.4, y: 200.6 }, { x: 640.2, y: 410.5 }, 0)).toEqual({ kind: 1, ax: 300, ay: 201, bx: 640, by: 411 })
  })

  it('stops short of the edge of the bare floor when the finger goes on past it', () => {
    const strip = stripFrom(0, { x: 400, y: 300 }, { x: 2000, y: 900 }, 0)
    expect(strip.bx).toBe(FIELD.x1 - EDGE)
    expect(strip.by).toBe(FIELD.y1 - EDGE)
  })

  it('is a stub one tape-width long for a tap, centred on the tap and tilted as asked', () => {
    const stub = stripFrom(2, { x: 500, y: 400 }, { x: 500, y: 400 }, 0)
    expect(lengthOf(stub)).toBeCloseTo(TAPE_WIDTH, 0)
    expect((stub.ax + stub.bx) / 2).toBeCloseTo(500, 0)
    expect(isStub(stub)).toBe(true)
    const tilted = stripFrom(2, { x: 500, y: 400 }, { x: 500, y: 400 }, Math.PI / 2)
    expect(Math.abs(tilted.by - tilted.ay)).toBeCloseTo(TAPE_WIDTH, 0)
  })

  it('is a stub along the pull for a pull shorter than a tape-width, and stays on the floor in a corner', () => {
    const stub = stripFrom(0, { x: 500, y: 400 }, { x: 500, y: 430 }, 0)
    expect(stub.ax).toBe(stub.bx)
    expect(lengthOf(stub)).toBeCloseTo(TAPE_WIDTH, 0)
    const corner = stripFrom(0, { x: FIELD.x0, y: FIELD.y0 }, { x: FIELD.x0, y: FIELD.y0 }, 0.3)
    for (const [x, y] of [[corner.ax, corner.ay], [corner.bx, corner.by]]) {
      expect(x).toBeGreaterThanOrEqual(FIELD.x0)
      expect(y).toBeGreaterThanOrEqual(FIELD.y0)
    }
  })

  it('gives the point any distance along it, and the nearest place on it to a point off it', () => {
    const strip = road(300, 200, 700, 200)
    expect(along(strip, 100)).toEqual({ x: 400, y: 200 })
    expect(nearestOn(strip, { x: 450, y: 230 })).toEqual({ d: 150, off: 30 })
    expect(nearestOn(strip, { x: 900, y: 200 })).toEqual({ d: 400, off: 200 })
  })
})

describe('the floor', () => {
  it('keeps sixty-four strips, and lifts the oldest to lay one more', () => {
    let strips: Strip[] = []
    for (let i = 0; i < MAX_STRIPS; i++) {
      const laid = lay(strips, road(300, 100 + i * 9, 600, 100 + i * 9))
      expect(laid.lifted).toBeNull()
      strips = laid.strips
    }
    const oldest = strips[0], newest = road(700, 100, 900, 300)
    const laid = lay(strips, newest)
    expect(laid.lifted).toBe(oldest)
    expect(laid.strips).toHaveLength(MAX_STRIPS)
    expect(laid.strips[MAX_STRIPS - 1]).toBe(newest)
    expect(laid.strips).not.toContain(oldest)
  })
})

describe('a strip read from a save', () => {
  it('is read whole, and anything that is not a strip is left out', () => {
    expect(readStrip({ kind: 3, ax: 300, ay: 200, bx: 500, by: 260 })).toEqual({ kind: 3, ax: 300, ay: 200, bx: 500, by: 260 })
    for (const raw of [null, 7, 'strip', [], {}, { kind: 4, ax: 300, ay: 200, bx: 500, by: 260 }, { kind: 0, ax: '300', ay: 200, bx: 500, by: 260 }, { kind: 0, ax: NaN, ay: 200, bx: 500, by: 260 }, { kind: 0, ax: 300, ay: 200, bx: 302, by: 200 }]) expect(readStrip(raw)).toBeNull()
  })

  it('is brought back onto the bare floor when its ends lie off it', () => {
    const strip = readStrip({ kind: 0, ax: -500, ay: 200, bx: 5000, by: 200 })
    expect(strip).toEqual({ kind: 0, ax: FIELD.x0 + EDGE, ay: 200, bx: FIELD.x1 - EDGE, by: 200 })
  })
})
