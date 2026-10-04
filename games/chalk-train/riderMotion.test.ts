import { describe, expect, it } from 'vitest'
import { CLIPS, LOOPS, bearingOf, clipOf, feelClip, outClip, type Clip, type ClipName } from './riderMotion'
import { CHARACTERS, FEELS, RIDERS, taste } from './tastes'

const NUMBERS = ['secs', 'hop', 'hops', 'squash', 'tilt', 'spin', 'shake', 'part', 'partBeats', 'puff', 'flat', 'hide', 'pale'] as const
/** How many things two pieces do clearly differently: a number a fifth apart or more, or other eyes. */
function apart(a: Clip, b: Clip): number {
  let n = a.eyes === b.eyes ? 0 : 1
  for (const key of NUMBERS) {
    const big = Math.max(Math.abs(a[key]), Math.abs(b[key]))
    if (big > 0 && Math.abs(a[key] - b[key]) / big >= 0.2) n++
  }
  return n
}

describe('every rider moves like itself', () => {
  it('has its own version of every piece: no two riders share one, or come near to', () => {
    for (const name of CLIPS) for (const a of RIDERS) for (const b of RIDERS) {
      if (a < b) expect(apart(clipOf(a, name), clipOf(b, name)), `${name}: ${a} and ${b}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('differs by more than a shift in time: two riders in the same piece are in different poses all the way through', () => {
    for (const name of ['trick', 'board', 'out-plain', 'home-act', 'tickled'] as ClipName[]) for (const a of RIDERS) for (const b of RIDERS) {
      if (a >= b) continue
      let differ = 0
      for (let i = 1; i < 20; i++) {
        const pa = bearingOf(clipOf(a, name), i / 20, 0), pb = bearingOf(clipOf(b, name), i / 20, 0)
        if (Math.abs(pa.hop - pb.hop) > 2 || Math.abs(pa.part - pb.part) > 0.15 || Math.abs(pa.squash - pb.squash) > 0.02 || pa.hide !== pb.hide || pa.eyes !== pb.eyes || Math.abs(pa.spin - pb.spin) > 0.2) differ++
      }
      expect(differ, `${name}: ${a} and ${b}`).toBeGreaterThan(9)
    }
  })

  it('acts a like and a dislike differently, and each of its four tastes in a way of its own', () => {
    for (const kind of RIDERS) {
      const { likes, dislikes } = CHARACTERS[kind]
      for (const like of likes) for (const dislike of dislikes) expect(apart(clipOf(kind, feelClip(like)), clipOf(kind, feelClip(dislike))), `${kind}: ${like} and ${dislike}`).toBeGreaterThanOrEqual(3)
      expect(apart(clipOf(kind, feelClip(likes[0])), clipOf(kind, feelClip(likes[1])))).toBeGreaterThanOrEqual(2)
      expect(apart(clipOf(kind, feelClip(dislikes[0])), clipOf(kind, feelClip(dislikes[1])))).toBeGreaterThanOrEqual(2)
      // A feel it has no taste for gets a small plain answer, smaller than any of its four.
      for (const f of FEELS) {
        if (taste(kind, f) !== 'plain') continue
        const plain = clipOf(kind, feelClip(f))
        expect(plain.puff + plain.flat + plain.hide + plain.spin).toBe(0)
      }
    }
  })

  it('makes a dislike as much to watch as a like', () => {
    const size = (clip: Clip) => clip.hop / 40 + Math.abs(clip.squash) * 3 + Math.abs(clip.tilt) * 2 + clip.spin + clip.shake / 5 + Math.abs(clip.part) + clip.puff * 2 + clip.flat + clip.hide + (clip.eyes === 'open' ? 0 : 0.5)
    for (const kind of RIDERS) {
      const { likes, dislikes } = CHARACTERS[kind]
      const liked = likes.reduce((sum, f) => sum + size(clipOf(kind, feelClip(f))), 0), disliked = dislikes.reduce((sum, f) => sum + size(clipOf(kind, feelClip(f))), 0)
      expect(disliked / liked, kind).toBeGreaterThan(0.6)
    }
  })

  it('keeps every bearing sane and brings every piece back to rest', () => {
    for (const name of CLIPS) for (const kind of RIDERS) {
      const clip = clipOf(kind, name)
      expect(clip.secs).toBeGreaterThan(0.15)
      // A piece is short; only the three that go round and round may take their time.
      expect(clip.secs).toBeLessThan(LOOPS.includes(name) ? 6 : 4)
      for (let i = 0; i <= 30; i++) {
        const b = bearingOf(clip, i / 30, i * 0.1)
        for (const value of [b.hop, b.squash, b.tilt, b.spin, b.shake, b.part, b.puff, b.flat, b.hide, b.pale]) expect(Number.isFinite(value)).toBe(true)
        expect(b.hop).toBeGreaterThanOrEqual(0)
        expect(b.hop).toBeLessThanOrEqual(130)
        expect(Math.abs(b.part)).toBeLessThanOrEqual(1.0001)
      }
      const end = bearingOf(clip, 1, 0)
      expect(Math.abs(end.hop)).toBeLessThan(0.001)
      expect(Math.abs(end.squash)).toBeLessThan(0.001)
      expect(Math.abs(end.tilt)).toBeLessThan(0.001)
      expect(end.puff + end.flat + end.hide + end.pale).toBeLessThan(0.001)
      expect(end.eyes).toBe('open')
    }
  })

  it('has a piece for everything a ride can do and every way out at home, and loops only the three that stand still and the walk', () => {
    for (const f of FEELS) {
      expect(CLIPS).toContain(feelClip(f))
      expect(CLIPS).toContain(outClip(f))
    }
    expect(outClip(null)).toBe('out-plain')
    expect(LOOPS).toEqual(['wait', 'ride', 'at-home', 'walk'])
  })
})
