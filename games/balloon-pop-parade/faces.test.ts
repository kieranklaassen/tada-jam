import { describe, expect, it } from 'vitest'
import { eyeBits, mouthBits, restFace, type FacePlan } from './faces'
import { PALETTE } from './palette'

const PLAN: FacePlan = { eye: [0.3, 0.6, 0.5], eyeSize: 0.14, brows: true, mouth: [0, 0.2, 0.6], mouthWide: 0.5, ink: PALETTE.ink, whites: true }
type Drawn = { x: number; y: number; z: number; wide: number; tall: number; deep: number; turn: number; colour: string }
const eyes = (state = restFace(), plan = PLAN) => { const out: Drawn[] = []; eyeBits(plan, state, (x, y, z, wide, tall, deep, turn, colour) => void out.push({ x, y, z, wide, tall, deep, turn, colour })); return out }
const mouth = (state = restFace(), plan = PLAN) => { const out: Drawn[] = []; mouthBits(plan, state, (x, y, z, wide, tall, deep, turn, colour) => void out.push({ x, y, z, wide, tall, deep, turn, colour })); return out }

describe('a face', () => {
  it('has two eyes, each a white with a dark pupil and a shine in it, and a brow over each', () => {
    const bits = eyes()
    expect(bits.filter((bit) => bit.colour === PALETTE.valve)).toHaveLength(4)
    expect(bits.filter((bit) => bit.colour === PALETTE.ink)).toHaveLength(4)
    // One side is the mirror of the other.
    const left = bits.filter((bit) => bit.x > 0), right = bits.filter((bit) => bit.x < 0)
    expect(left).toHaveLength(right.length)
  })

  it('looks where it is told, and the pupil stays inside the white however far', () => {
    for (const lookX of [-3, -1, -0.5, 0, 0.5, 1, 3]) for (const lookY of [-2, -1, 0, 1, 2]) {
      const bits = eyes({ ...restFace(), lookX, lookY }).filter((bit) => bit.x > 0)
      const white = bits[0], pupil = bits[1]
      expect(Math.abs(pupil.x - white.x) + pupil.wide, `${lookX}, ${lookY}`).toBeLessThanOrEqual(white.wide + 1e-9)
      expect(Math.abs(pupil.y - white.y) + pupil.tall, `${lookX}, ${lookY}`).toBeLessThanOrEqual(white.tall + 1e-9)
      if (Math.abs(lookX) <= 1) expect(Math.sign(pupil.x - white.x)).toBe(Math.sign(lookX))
    }
  })

  it('shuts its eyes to a short line each, with no white and no shine', () => {
    const bits = eyes({ ...restFace(), blink: 1 }, { ...PLAN, brows: false })
    expect(bits).toHaveLength(2)
    for (const bit of bits) { expect(bit.colour).toBe(PALETTE.ink); expect(bit.tall).toBeLessThan(bit.wide * 0.2) }
  })

  it('turns its brows the two ways, mirrored, and keeps each clear of its eye: a brow is a bar that crosses nothing', () => {
    for (const brow of [-1, 0, 1]) for (const browLift of [0, 1]) {
      const bits = eyes({ ...restFace(), brow, browLift }), brows = bits.slice(-2), whites = bits.filter((bit) => bit.colour === PALETTE.valve && bit.wide > 0.1)
      expect(brows[0].turn).toBeCloseTo(-brows[1].turn, 9)
      expect(Math.sign(brows[0].turn)).toBe(Math.sign(brow))
      // The lowest a turned brow reaches is above the top of the white under it.
      for (const [k, one] of brows.entries()) expect(one.y - one.tall - Math.abs(Math.sin(one.turn)) * one.wide, `brow ${k}`).toBeGreaterThan(whites[k].y + whites[k].tall)
    }
  })

  it('has a mouth of two halves that turn up for a smile and down for the other thing, with a dark middle when it is open: more than two shapes', () => {
    const smile = mouth({ ...restFace(), smile: 1 }), frown = mouth({ ...restFace(), smile: -1 }), level = mouth({ ...restFace(), smile: 0 })
    for (const halves of [smile, frown, level]) {
      expect(halves).toHaveLength(2)
      expect(halves[0].x).toBeCloseTo(-halves[1].x, 9)
      expect(halves[0].turn).toBeCloseTo(-halves[1].turn, 9)
    }
    expect(smile[0].turn).toBeGreaterThan(0.3)
    expect(frown[0].turn).toBeLessThan(-0.3)
    expect(level[0].turn).toBe(0)
    const open = mouth({ ...restFace(), smile: 0, open: 1 }), laugh = mouth({ ...restFace(), smile: 1, open: 1 })
    expect(open).toHaveLength(3)
    expect(open[2].tall).toBeGreaterThan(open[0].tall * 1.5)
    expect(laugh[2].wide).toBeGreaterThan(open[2].wide)
  })

  it('draws no mouth where the plan has none, and no whites where the face is printed on white', () => {
    expect(mouth(restFace(), { ...PLAN, mouth: null })).toHaveLength(0)
    expect(eyes(restFace(), { ...PLAN, whites: false, brows: false }).filter((bit) => bit.wide > 0.1)).toHaveLength(0)
  })
})
