import { describe, expect, it } from 'vitest'
import { FACES, faceFor, isWrongUse, type FaceName } from './faces'
import type { Hand, Patch } from './surface'

const HANDS: Hand[] = ['finger', 'sponge', 'hose', 'cloth']
const ON: Patch[] = ['c', 's', 'm', 'b', 'f', 'w', 'd', 'p']

describe('the faces a vehicle makes', () => {
  it('every touch on every surface gets a face, and never the one it wears at rest', () => {
    for (const hand of HANDS) for (const met of ON) for (const landing of [true, false]) {
      const name = faceFor(hand, met, landing)
      expect(FACES[name], `${hand} on ${met}`).toBeDefined()
      expect(name).not.toBe('rest')
    }
  })

  it('every wrong use of a tool gets a joke: a face with something in it besides a smile', () => {
    for (const hand of HANDS) for (const met of ON) {
      if (!isWrongUse(hand, met)) continue
      const f = FACES[faceFor(hand, met, true)]
      const joke = f.tongue + f.brow + f.cross + f.shake + f.nod + Math.abs(f.jolt) + (f.lid >= 0.7 ? 1 : 0) + (f.open >= 0.6 ? 1 : 0)
      expect(joke, `${hand} on ${met}`).toBeGreaterThanOrEqual(0.5)
      expect(faceFor(hand, met, true), `${hand} on ${met}`).not.toBe('pleased')
    }
  })

  it('the wrong uses do not all get the same joke', () => {
    const jokes = new Set<FaceName>()
    for (const hand of HANDS) for (const met of ON) if (isWrongUse(hand, met)) jokes.add(faceFor(hand, met, true))
    expect(jokes.size).toBeGreaterThanOrEqual(6)
  })

  it('each tool has a right use that pleases', () => {
    expect(faceFor('sponge', 's', true)).toBe('pleased')
    expect(faceFor('hose', 'f', true)).toBe('aah')
    expect(faceFor('cloth', 'w', true)).toBe('pleased')
  })

  it('cold water makes it flinch when the jet lands, and only then', () => {
    expect(faceFor('hose', 'd', true)).toBe('flinch')
    expect(faceFor('hose', 'd', false)).toBe('aah')
    expect(FACES.flinch.jolt).toBeGreaterThan(1)
    expect(FACES.flinch.shake).toBeGreaterThan(0.5)
  })

  it('no two faces are the same, and every one is let go of within a few seconds', () => {
    const seen = new Set<string>()
    for (const [name, f] of Object.entries(FACES)) {
      const key = JSON.stringify([f.smile, f.open, f.tongue, f.lid, f.brow, f.cross, f.jolt, f.shake, f.nod])
      expect(seen.has(key), name).toBe(false)
      seen.add(key)
      expect(f.seconds).toBeLessThanOrEqual(2.5)
      for (const v of [f.smile, f.open, f.tongue, f.lid, f.brow, f.cross]) expect(Math.abs(v)).toBeLessThanOrEqual(1)
    }
  })

  it('no face is a sad one: no mouth turns far down, and no body sags', () => {
    for (const [name, f] of Object.entries(FACES)) {
      expect(f.smile, name).toBeGreaterThanOrEqual(-0.3)
      expect(f.jolt, name).toBeGreaterThanOrEqual(0)
      // Every face ends: none is held for good.
      if (name !== 'rest') expect(f.seconds, name).toBeGreaterThan(0)
    }
  })
})
