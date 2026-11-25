import { describe, expect, it } from 'vitest'
import { CAST, type Id, type Turn } from './cast'
import { EYE, SPOTS, seenFrom } from './layout'
import { affronts, framing, sights, topOf } from './sight'
import type { Arrangement } from './table'

const of = (arrangement: Arrangement, id: Id): string => { const s = sights(arrangement).find((one) => one.id === id)!; return s.how === 'seen' ? s.side : s.how }
const A = (...entries: ([Id, Turn] | null)[]): Arrangement => [0, 1, 2, 3].map((n) => entries[n] ?? null)

describe('what he sees', () => {
  it('is the side away from the child', () => {
    expect(of(A(['elephant', 0]), 'elephant')).toBe('back')
    expect(of(A(['elephant', 2]), 'elephant')).toBe('front')
    expect(of(A(['elephant', 1]), 'elephant')).toBe('side')
    expect(of(A(['elephant', 3]), 'elephant')).toBe('side')
  })
  it('cuts the giraffe\'s head off in a near place and fits it in from a far one', () => {
    for (const turn of [0, 1, 2, 3] as Turn[]) {
      expect(of(A(null, null, ['giraffe', turn]), 'giraffe')).toBe('cut')
      expect(of(A(['giraffe', turn]), 'giraffe')).not.toBe('cut')
    }
  })
  it('hides a small one behind a big one, and not a tall one', () => {
    expect(of(A(['crocodile', 2], null, ['hippo', 0]), 'crocodile')).toBe('hidden')
    expect(of(A(['giraffe', 2], null, ['pig', 2]), 'giraffe')).toBe('front')
    expect(of(A(['crocodile', 2], null, null, ['hippo', 0]), 'crocodile')).toBe('front')
  })
  it('puts whoever stands behind the board into its hole, face on or back on, and not edge on', () => {
    for (const turn of [0, 2] as Turn[]) expect(of(A(['hen', 2], null, ['board', turn]), 'hen')).toBe('hole')
    for (const turn of [1, 3] as Turn[]) expect(of(A(['hen', 2], null, ['board', turn]), 'hen')).not.toBe('hole')
  })
  it('is told nearest to him first, each once', () => {
    const seen = sights(A(['hen', 0], ['pig', 1], ['hippo', 2], ['elephant', 3]))
    expect(seen.map((s) => s.id)).toEqual(['hippo', 'elephant', 'hen', 'pig'])
  })
})

describe('the secret', () => {
  it('takes two or more, no board, and every one from behind', () => {
    expect(affronts(A(['elephant', 0]))).toBe(false)
    expect(affronts(A(['elephant', 0], ['pig', 0]))).toBe(true)
    expect(affronts(A(['elephant', 0], ['pig', 1]))).toBe(false)
    expect(affronts(A(['elephant', 0], ['pig', 0], null, ['board', 0]))).toBe(false)
  })
})

describe('his frame', () => {
  it('holds whoever stands there, up to the top he can fit in, and is never upside down or empty', () => {
    for (const id of CAST) for (let spot = 0; spot < 4; spot++) {
      const a = A(); (a as ([Id, Turn] | null)[])[spot] = [id, 0]
      const view = framing(a)
      expect(view.fov).toBeGreaterThan(3)
      expect(view.fov).toBeLessThan(60)
      const top = seenFrom(view, { x: SPOTS[spot].x, y: topOf(id, spot), z: SPOTS[spot].z }), foot = seenFrom(view, SPOTS[spot])
      expect(top.y).toBeLessThanOrEqual(1.02)
      expect(foot.y).toBeGreaterThanOrEqual(-1.05)
      expect(top.y - foot.y).toBeGreaterThan(0.5)
    }
  })
  it('looks from his side, at his eye', () => {
    expect(EYE.z).toBeLessThan(-5)
    const view = framing(A(['hen', 0], ['pig', 0]))
    // The child's left is the picture's right.
    expect(seenFrom(view, SPOTS[0]).x).toBeGreaterThan(seenFrom(view, SPOTS[1]).x)
  })
})
