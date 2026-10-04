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

  it('shuts each eye to an arc, low in the middle and up at both ends, with no white and no shine: never a straight dash', () => {
    const bits = eyes({ ...restFace(), blink: 1 }, { ...PLAN, brows: false })
    expect(bits).toHaveLength(6)
    for (const bit of bits) expect(bit.colour).toBe(PALETTE.ink)
    for (const side of [1, -1]) {
      const [middle, outer, inner] = bits.filter((bit) => Math.sign(bit.x) === side || bit.x === 0).sort((a, b) => Math.abs(a.turn) - Math.abs(b.turn))
      // The two ends are turned up, each away from the middle, and stand higher than it.
      const ends = [outer, inner].sort((a, b) => a.x - b.x)
      expect(ends[0].turn).toBeLessThan(-0.4)
      expect(ends[1].turn).toBeGreaterThan(0.4)
      for (const end of ends) expect(end.y).toBeGreaterThan(middle.y)
      // And the three pieces join: each end starts inside the middle piece.
      for (const end of ends) expect(Math.abs(end.x - middle.x) - end.wide * Math.cos(end.turn)).toBeLessThan(middle.wide)
    }
  })

  it('prints only the two corners of a mouth that is a beak or a muzzle, which turn up and down, and the dark of it when it opens', () => {
    const plan: FacePlan = { ...PLAN, mouth: null, corners: { at: [0, 0.3, 0.5], wide: 0.6, long: 0.08, gape: { at: [0, 0.3, 0.8], wide: 0.17, tall: 0.08 } } }
    for (const smiling of [-1, -0.4, 0, 0.5, 1]) {
      const corners = mouth({ ...restFace(), smile: smiling }, plan)
      expect(corners).toHaveLength(2)
      expect(corners[0].x).toBeCloseTo(-corners[1].x, 9)
      expect(corners[0].turn).toBeCloseTo(-corners[1].turn, 9)
      // Each starts where the mouth ends and goes outwards, up for a smile and down for the other thing; never level.
      expect(Math.abs(corners[0].x) - corners[0].wide * Math.cos(corners[0].turn)).toBeGreaterThan(0.3 - 0.03)
      expect(Math.abs(corners[0].turn)).toBeGreaterThan(0.25)
      expect(Math.sign(corners[0].y - 0.3)).toBe(smiling >= -0.15 ? 1 : -1)
    }
    const open = mouth({ ...restFace(), open: 1 }, plan)
    expect(open).toHaveLength(3)
    expect(open[2].tall).toBeGreaterThan(open[0].tall)
    // Barely open, it shows no dark; and when the dark shows it is round, never a thin level line.
    expect(mouth({ ...restFace(), open: 0.4 }, plan)).toHaveLength(2)
    for (const wide of [0.46, 0.6, 1]) { const dark = mouth({ ...restFace(), open: wide }, plan)[2]; expect(dark.tall, `${wide}`).toBeGreaterThan(dark.wide * 0.4) }
    // One that has a jaw to drop shows no printed dark.
    expect(mouth({ ...restFace(), open: 1 }, { ...plan, corners: { ...plan.corners!, gape: null } })).toHaveLength(2)
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
    // Level, it still turns up a little: a mouth is never one straight bar.
    expect(level[0].turn).toBeGreaterThan(0.1)
    for (const smiling of [-1, -0.5, -0.2, -0.1, 0, 0.3, 1]) expect(Math.abs(mouth({ ...restFace(), smile: smiling })[0].turn), `${smiling}`).toBeGreaterThan(0.1)
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
