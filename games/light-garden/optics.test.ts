import { describe, expect, it } from 'vitest'
import { BeamBuffer, BLUE, END_BOUNDS, END_CIRCLE, END_FILTER, GREEN, lightAt, MAX_SEGMENTS, OpticsScene, RED, refract, response, trace, WHITE, type Source } from './optics'

function run(build: (scene: OpticsScene) => void, sources: Source[]): BeamBuffer {
  const scene = new OpticsScene()
  scene.bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 }
  build(scene)
  const out = new BeamBuffer()
  trace(scene, sources, out)
  return out
}

function segments(out: BeamBuffer) {
  return Array.from({ length: out.count }, (_, i) => ({
    ax: out.ax[i],
    ay: out.ay[i],
    bx: out.bx[i],
    by: out.by[i],
    mask: out.mask[i],
    inside: out.inside[i] === 1,
    angle: Math.atan2(out.by[i] - out.ay[i], out.bx[i] - out.ax[i]),
  }))
}

const east: Source = { x: -50, y: 0, angle: 0, mask: WHITE }

describe('optics', () => {
  it('a beam with nothing in its way runs to the panel edge', () => {
    const out = run(() => {}, [east])
    expect(out.count).toBe(1)
    expect(out.bx[0]).toBeCloseTo(100)
    expect(out.endCount).toBe(1)
    expect(out.endKind[0]).toBe(END_BOUNDS)
  })

  it('a 45° mirror turns the beam by 90°, angle in equals angle out', () => {
    const out = run((scene) => scene.addMirror(0, 0, Math.PI / 4, 5), [east])
    const [first, second] = segments(out)
    expect(first.bx).toBeCloseTo(0)
    expect(second.angle).toBeCloseTo(Math.PI / 2)
    expect(second.mask).toBe(WHITE)
  })

  it('mirrors reflect from both faces', () => {
    const west: Source = { x: 50, y: 0, angle: Math.PI, mask: WHITE }
    const out = run((scene) => scene.addMirror(0, 0, Math.PI / 4, 5), [west])
    expect(segments(out)[1].angle).toBeCloseTo(-Math.PI / 2)
  })

  it('a glancing mirror keeps the angle of incidence', () => {
    const tilt = (10 * Math.PI) / 180
    const out = run((scene) => scene.addMirror(0, 0, tilt, 6), [east])
    expect(segments(out)[1].angle).toBeCloseTo(2 * tilt)
  })

  it('a filter keeps only its own colour', () => {
    const out = run((scene) => scene.addFilter(0, 0, Math.PI / 2, 5, RED), [east])
    const [before, after] = segments(out)
    expect(before.mask).toBe(WHITE)
    expect(after.mask).toBe(RED)
    expect(after.angle).toBeCloseTo(0)
  })

  it('a filter that shares no colour with the beam stops it', () => {
    const red: Source = { ...east, mask: RED }
    const out = run((scene) => scene.addFilter(0, 0, Math.PI / 2, 5, GREEN), [red])
    expect(out.count).toBe(1)
    expect(out.endKind[0]).toBe(END_FILTER)
  })

  it('refraction obeys Snell: straight through at normal incidence, bends toward the normal going in', () => {
    const straight = refract(1, 0, -1, 0, 1, 1.5, { x: 0, y: 0, tir: false })
    expect(straight.x).toBeCloseTo(1)
    const inAngle = Math.PI / 6
    const bent = refract(Math.cos(inAngle), Math.sin(inAngle), -1, 0, 1, 1.5, { x: 0, y: 0, tir: false })
    expect(Math.sin(Math.atan2(bent.y, bent.x))).toBeCloseTo(Math.sin(inAngle) / 1.5)
  })

  it('refraction reflects totally past the critical angle', () => {
    const steep = (70 * Math.PI) / 180
    const r = refract(Math.cos(steep), Math.sin(steep), -1, 0, 1.5, 1, { x: 0, y: 0, tir: false })
    expect(r.tir).toBe(true)
    expect(r.x).toBeCloseTo(-Math.cos(steep))
  })

  it('a prism fans white light into red, green, and blue; red bends least, blue most', () => {
    // Vertex pointing up-screen (-y); the beam comes in near minimum deviation.
    const out = run((scene) => scene.addPrism(0, 0, -Math.PI / 2, 6, 0), [{ x: -40, y: 8, angle: -0.2, mask: WHITE }])
    const outside = segments(out).filter((s, i) => i > 0 && !s.inside)
    const byColour = (mask: number) => outside.find((s) => s.mask === mask)!
    const red = byColour(RED)
    const green = byColour(GREEN)
    const blue = byColour(BLUE)
    expect(red && green && blue).toBeTruthy()
    const deviation = (s: { angle: number }) => s.angle - -0.2
    expect(deviation(red)).toBeGreaterThan(0.2)
    expect(deviation(green)).toBeGreaterThan(deviation(red))
    expect(deviation(blue)).toBeGreaterThan(deviation(green))
    expect(out.prismLit[0]).toBe(WHITE)
  })

  it('light a creature swallows is recorded as its light', () => {
    const out = run((scene) => scene.addCircle(20, 0, 4, 2), [east])
    expect(out.count).toBe(1)
    expect(out.bx[0]).toBeCloseTo(16)
    expect(out.creatureLight[2]).toBe(WHITE)
    expect(out.endKind[0]).toBe(END_CIRCLE)
  })

  it('red and green light reaching the same creature mix to yellow', () => {
    const redFromLeft: Source = { x: -50, y: 0, angle: 0, mask: RED }
    const greenFromBelow: Source = { x: 20, y: 50, angle: -Math.PI / 2, mask: GREEN }
    const out = run((scene) => scene.addCircle(20, 0, 4, 1), [redFromLeft, greenFromBelow])
    expect(out.creatureLight[1]).toBe(RED | GREEN)
    expect(response(out.creatureLight[1], RED | GREEN)).toBe('wake')
  })

  it('lightAt unions the beams passing near a point, even when nothing absorbs them there', () => {
    const out = run(() => {}, [
      { x: -50, y: 0, angle: 0, mask: RED },
      { x: 0, y: -50, angle: Math.PI / 2, mask: GREEN },
    ])
    expect(lightAt(out, 0, 0, 3)).toBe(RED | GREEN)
    expect(lightAt(out, 30, 0, 3)).toBe(RED)
    expect(lightAt(out, 30, 30, 3)).toBe(0)
  })

  it('facing mirrors cannot trap the tracer: segments stay capped', () => {
    const out = run(
      (scene) => {
        scene.addMirror(-20, 0, Math.PI / 2, 50)
        scene.addMirror(20, 0, Math.PI / 2, 50)
      },
      [{ x: 0, y: 0, angle: 0.001, mask: WHITE }],
    )
    expect(out.count).toBeLessThanOrEqual(MAX_SEGMENTS)
    expect(out.count).toBeGreaterThan(10)
  })

  it('a lamp body absorbs light aimed at it', () => {
    const out = run((scene) => scene.addCircle(10, 0, 3, -1), [east])
    expect(out.count).toBe(1)
    expect(out.creatureLight.every((m) => m === 0)).toBe(true)
  })

  it('response: exact colour wakes, a mix holding the colour stirs, other colours do nothing', () => {
    expect(response(WHITE, WHITE)).toBe('wake')
    expect(response(RED, RED | GREEN)).toBe('stir')
    expect(response(WHITE, RED)).toBe('stir')
    expect(response(BLUE, RED)).toBe('none')
    expect(response(0, RED)).toBe('none')
  })

  it('re-tracing reuses the buffer without leaking old segments', () => {
    const scene = new OpticsScene()
    const out = new BeamBuffer()
    scene.addMirror(0, 0, Math.PI / 4, 5)
    trace(scene, [east], out)
    expect(out.count).toBe(2)
    scene.clear()
    trace(scene, [east], out)
    expect(out.count).toBe(1)
  })
})
