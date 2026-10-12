import { describe, expect, it } from 'vitest'
import { Bucket, Sketch, inside, noise } from './sketch'

describe('the drawing kit', () => {
  it('keeps paths apart and drops a path of one point', () => {
    const bucket = new Bucket(2, 1)
    bucket.point(0, 0); bucket.point(1, 1); bucket.end()
    bucket.point(5, 5); bucket.end()
    bucket.point(2, 2); bucket.point(3, 3); bucket.point(4, 4); bucket.end()
    expect(bucket.m).toBe(2)
    expect([...bucket.ends.slice(0, 2)]).toEqual([4, 10])
    expect([...bucket.pts.slice(0, 10)]).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4])
  })

  it('places a point through every move, turn, stretch and mirror, and finds the way back', () => {
    const s = new Sketch()
    const at = { x: 0, y: 0 }
    s.push(100, 50, Math.PI / 2, -2, 1)
    s.at(10, 0, at)
    expect(at.x).toBeCloseTo(100)
    expect(at.y).toBeCloseTo(30)
    s.push(5, 0)
    s.back(0, -20, at)
    expect(at.x).toBeCloseTo(10)
    expect(at.y).toBeCloseTo(0)
    s.pop(); s.pop()
    s.at(3, 4, at)
    expect(at).toEqual({ x: 3, y: 4 })
  })

  it('wobbles a line by no more than it is told, the same way every time, and a shape not at all', () => {
    const draw = (boil: number) => {
      const s = new Sketch()
      s.wobble = 2
      s.boil = boil
      s.line([0, 0, 100, 0, 200, 0])
      s.shape('hide', [0, 0, 50, 0, 50, 50])
      return s
    }
    const a = draw(1), b = draw(1), c = draw(2)
    expect([...a.lines.pts.slice(0, 6)]).toEqual([...b.lines.pts.slice(0, 6)])
    expect([...a.lines.pts.slice(0, 6)]).not.toEqual([...c.lines.pts.slice(0, 6)])
    for (let i = 0; i < 6; i += 2) expect(Math.abs(a.lines.pts[i] - i * 50)).toBeLessThanOrEqual(2)
    expect([...a.hide.pts.slice(0, 6)]).toEqual([0, 0, 50, 0, 50, 50])
  })

  it('gives noise between -1 and 1', () => {
    for (let i = 0; i < 500; i++) {
      const n = noise(i, i * 7)
      expect(n).toBeGreaterThanOrEqual(-1)
      expect(n).toBeLessThan(1)
    }
  })

  it('knows inside from outside, in a shape with a dent', () => {
    const dented = new Float32Array([0, 0, 100, 0, 100, 100, 50, 30, 0, 100])
    expect(inside(dented, dented.length, 50, 10)).toBe(true)
    expect(inside(dented, dented.length, 50, 80)).toBe(false)
    expect(inside(dented, dented.length, 150, 50)).toBe(false)
  })
})
