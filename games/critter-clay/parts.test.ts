import { describe, expect, it } from 'vitest'
import { CAMERA } from './layout'
import { BODY, bodyLift, canTake, ellipsoidPoint, familyCount, legsOf, nextHue, nextSocket, socketFor, tiltForward, type Part, type PartKind, type Vec3 } from './parts'

const parts = (...kinds: PartKind[]): Part[] => kinds.map((kind) => ({ kind, hue: 0 }))

describe('parts', () => {
  it('cycles the three plasticine colours', () => {
    expect(nextHue(0)).toBe(1)
    expect(nextHue(2)).toBe(0)
    expect(nextHue(0, -1)).toBe(2)
  })

  it('holds at most six legs, three eyes, two ears, one tail, one head, two horns', () => {
    const six = parts('legStub', 'legLong', 'legStub', 'legLong', 'legStub', 'legLong')
    expect(canTake(six, 'legStub')).toBe(false)
    expect(canTake(six, 'eye')).toBe(true)
    expect(canTake(parts('eye', 'eye', 'eye'), 'eye')).toBe(false)
    expect(canTake(parts('earRound', 'earFlop'), 'earPoint')).toBe(false)
    expect(canTake(parts('tailCurl'), 'tailLong')).toBe(false)
    expect(canTake(parts('head'), 'head')).toBe(false)
    expect(canTake(parts('horn', 'horn'), 'horn')).toBe(false)
    expect(familyCount(parts('earRound', 'earPoint', 'eye'), 'ears')).toBe(2)
  })

  it('lays legs out by count: one in the middle, two as a pair, six as three per side', () => {
    expect(socketFor(parts('legStub'), 0).dir[0]).toBe(0)
    const pair = parts('legStub', 'eye', 'legLong')
    expect(socketFor(pair, 0).dir[0]).toBeLessThan(0)
    expect(socketFor(pair, 2).dir[0]).toBeGreaterThan(0)
    const six = parts('legStub', 'legStub', 'legStub', 'legStub', 'legStub', 'legStub')
    const sides = six.map((_, i) => Math.sign(socketFor(six, i).dir[0]))
    expect(sides.filter((s) => s < 0)).toHaveLength(3)
    expect(sides.filter((s) => s > 0)).toHaveLength(3)
  })

  it('puts eyes, ears, and horns on the face, and legs, tails, and heads on the body', () => {
    const critter = parts('eye', 'earFlop', 'horn', 'legStub', 'tailCurl', 'head')
    expect(critter.map((_, i) => socketFor(critter, i).anchor)).toEqual(['face', 'face', 'face', 'body', 'body', 'body'])
  })

  it('previews the next socket and refuses a full family', () => {
    const one = parts('eye')
    expect(nextSocket(one, 'eye')?.dir[0]).toBeGreaterThan(0)
    expect(nextSocket(parts('tailLong'), 'tailCurl')).toBeNull()
  })

  it('previews exactly the socket a part takes once it is pressed on', () => {
    const kinds: PartKind[] = ['legStub', 'eye', 'legLong', 'earFlop', 'eye', 'legStub', 'horn', 'tailCurl', 'head', 'eye', 'earRound', 'horn']
    const built: Part[] = []
    for (const kind of kinds) {
      const preview = nextSocket(built, kind)
      built.push({ kind, hue: 0 })
      expect(preview).toEqual(socketFor(built, built.length - 1))
    }
  })

  it('raises the body on its legs and rests it on its belly without them', () => {
    expect(bodyLift([])).toBeLessThan(BODY.ry)
    expect(bodyLift(parts('legLong', 'legLong'))).toBeGreaterThan(bodyLift(parts('legStub', 'legStub')))
    expect(legsOf(parts('eye', 'legLong', 'legStub'))).toEqual(['legLong', 'legStub'])
  })

  it('stands a lone stub leg tall enough that its shin shows under the belly from the camera', () => {
    const lone = parts('legStub')
    const centre = bodyLift(lone)
    const socket = { p: [0, 0, 0] as Vec3, n: [0, 0, 0] as Vec3 }
    ellipsoidPoint(socketFor(lone, 0).dir, BODY.rx, BODY.ry, BODY.rz, socket)
    const up = Math.sin(CAMERA.pitch)
    const level = Math.cos(CAMERA.pitch)
    // the camera seen from the critter when it faces the child, and when it stands side on
    const views: Vec3[] = [
      [0, up, level],
      [level, up, 0],
    ]
    let nearest = Infinity
    for (const view of views) {
      for (let t = 0; t < 30; t += 0.1) {
        const x = socket.p[0] + view[0] * t
        const y = 1 + view[1] * t - centre
        const z = socket.p[2] + view[2] * t
        nearest = Math.min(nearest, (x / BODY.rx) ** 2 + (y / BODY.ry) ** 2 + (z / BODY.rz) ** 2)
      }
    }
    expect(nearest).toBeGreaterThan(1)
    expect(bodyLift(parts('legLong'))).toBeGreaterThan(centre)
  })

  it('finds points on the body surface', () => {
    const out = { p: [0, 0, 0] as Vec3, n: [0, 0, 0] as Vec3 }
    ellipsoidPoint([0, 0, 1], BODY.rx, BODY.ry, BODY.rz, out)
    expect(out.p[2]).toBeCloseTo(BODY.rz)
    expect(out.n[2]).toBeCloseTo(1)
    ellipsoidPoint([1, 1, 0], BODY.rx, BODY.ry, BODY.rz, out)
    expect((out.p[0] / BODY.rx) ** 2 + (out.p[1] / BODY.ry) ** 2).toBeCloseTo(1)
  })

  it('leans top-of-face parts forward on a headless body', () => {
    const out: Vec3 = [0, 0, 0]
    tiltForward([0, 1, 0], out)
    expect(out[2]).toBeGreaterThan(0.4)
    expect(out[1]).toBeGreaterThan(0.7)
  })
})
