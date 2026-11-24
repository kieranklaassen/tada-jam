import { describe, expect, it } from 'vitest'
import { BLISS, HUSH, OUT, PLUNGE, cuesOf, frameOf, lastSeen, lengthOf, outAt, type Frame } from './acts'
import { STAGE_PLACE } from './layout'
import { FINDS } from './testing'
import { OWNER, OWNERS, type Lift, type OwnerId } from './owners'
import { THINGS, actOf } from './things'
import { VOICES } from './voices'

const ox = STAGE_PLACE.ox
const numbers = (f: Frame): number[] => [...Object.values(f.pose).filter((v): v is number => typeof v === 'number'), ...Object.values(f.pose.boot), ...f.items.flatMap((i) => [i.x, i.y, i.rot, i.s, i.fat]), ...f.bits.flatMap((b) => [b.x, b.y, b.r])]

describe('what a foot finds', () => {
  it('is nineteen different things: nothing, seven alone, eleven kinds of pair', () => {
    expect(new Set(FINDS.map(actOf)).size).toBe(19)
    expect(actOf(['bell', 'frog'])).toBe(actOf(['frog', 'bell']))
  })
  it('never gives a number that is not one, for anyone, at any moment', () => {
    for (const owner of OWNERS) for (const found of FINDS) for (let t = 0; t < lengthOf(found, owner) + 0.2; t += 0.07) {
      expect(numbers(frameOf(found, owner, t, ox)).every(Number.isFinite), `${owner} ${found} ${t}`).toBe(true)
    }
  })
  it('looks different for everything found', () => {
    for (const owner of OWNERS) {
      const seen = new Set<string>()
      for (const found of FINDS) {
      const marks = [0.3, 0.9, 1.7].map((u) => { const f = frameOf(found, owner, PLUNGE + HUSH + u, ox); return JSON.stringify([f.pose, f.items.map((i) => [i.id, Math.round(i.x)])]) })
        seen.add(marks.join())
      }
      expect(seen.size).toBe(FINDS.length)
    }
  })
  it('holds its owner near its boot and things in or above the room', () => {
    for (const owner of OWNERS) for (const found of FINDS) for (let t = 0; t < lengthOf(found, owner); t += 0.1) {
      const f = frameOf(found, owner, t, ox)
      expect(Math.abs(f.pose.dx)).toBeLessThan(160)
      expect(f.pose.dy).toBeLessThanOrEqual(1)
      for (const i of f.items) { expect(Math.abs(i.x)).toBeLessThan(620); expect(i.y).toBeLessThan(40) }
    }
  })
  it('moves without a jump of the body from one frame to the next', () => {
    for (const owner of OWNERS) for (const found of FINDS) {
      let was = frameOf(found, owner, 0, ox).pose
      for (let t = 1 / 60; t < lengthOf(found, owner); t += 1 / 60) {
        const now = frameOf(found, owner, t, ox).pose
        expect(Math.hypot(now.dx - was.dx, now.dy - was.dy), `${owner} ${actOf(found)} ${t.toFixed(2)}`).toBeLessThan(95)
        was = now
      }
    }
  })
  it('lasts four to six and a half seconds, is first seen within two, and knows where everything ended up', () => {
    for (const owner of OWNERS) for (const found of FINDS) {
      expect(lengthOf(found, owner)).toBeLessThan(6.7)
      expect(outAt(found, owner)).toBe(lengthOf(found, owner) - OUT)
      expect(lastSeen(found, owner, ox).size).toBe(found.length)
    }
  })
  it('lingers on what its owner likes best, and on what it cannot bear', () => {
    for (const owner of OWNERS) {
      const { loves, minds } = OWNER[owner], plain = THINGS.find((t) => t !== loves && t !== minds)!
      for (const id of [loves, minds]) expect(cuesOf([id], owner).some((c) => c.sound === `${id === loves ? 'loves' : 'minds'}.${owner}`)).toBe(true)
      expect(cuesOf([plain], owner).some((c) => /loves|minds/.test(c.sound))).toBe(false)
    }
    expect(BLISS).toBeGreaterThan(0.8)
  })
  it('has a voice for every sound it asks for, all inside the act', () => {
    for (const owner of OWNERS) for (const found of FINDS) for (const c of cuesOf(found, owner)) {
      expect(VOICES[c.sound], c.sound).toBeDefined()
      expect(c.at).toBeLessThan(lengthOf(found, owner))
    }
  })
})

describe('how each one leaves the ground', () => {
  const path = (o: OwnerId): number[] => { const out: Lift = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, arms: 0 }; return Array.from({ length: 21 }, (_, i) => { OWNER[o].leap(i / 20, 100, out); return [out.dy, out.rot * 100, out.dx] }).flat() }
  it('is nobody else\'s', () => {
    for (const a of OWNERS) for (const b of OWNERS) {
      if (a >= b) continue
      const p = path(a), q = path(b)
      expect(p.reduce((s, v, i) => s + Math.abs(v - q[i]), 0) / p.length).toBeGreaterThan(5)
    }
  })
  it('starts and ends on the floor', () => {
    for (const o of OWNERS) { const p = path(o); expect(Math.abs(p[0])).toBeLessThan(0.01); expect(Math.abs(p[60])).toBeLessThan(0.5) }
  })
})
