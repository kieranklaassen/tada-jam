import { visitor } from './artDog'
import type { Beat } from './figure'
import { dogAbout, type House } from './house'
import type { Oval } from './layout'
import type { Picture } from './pen'
import type { Rng } from './rng'
import { b, type Part } from './room'

// The dog as a visitor. Once he is awake he trots through every door ahead of
// the child and sits by whatever can be eaten in the room; once he has eaten
// the toppled pies he is round and rolls. Every room but the bedroom has him
// through this one set of rules, drawn at a place of its own.

export type DogKit = {
  segments: Record<string, Picture>
  ghosts: string[]
  /** Where he answers a touch. */
  area: Oval
  /** What is lit of him at rest: nothing while he is not about. */
  rest(h: House): readonly string[]
  /** `fly` says the fly is about in the room: then, now and then, he snaps at it and misses. */
  idle(h: House, rng: Rng, fly?: boolean): readonly Beat[] | null
  /** His own tap: a bark, or, round, a burp and a wobble. */
  tap(h: House): Part
  /** He comes in first. */
  arrive(h: House): Part[]
  squint(h: House): Part[]
  /** His answer to a punchline, `after` seconds into it. */
  startle(h: House, after: number): Part[]
}

export function dogKit(prefix: string, x: number, footY: number, scale: number, mirror = false, clip?: { x: number; y: number; w: number; h: number }): DogKit {
  const n = (pose: string): string => `${prefix}${pose}`
  return {
    segments: visitor(prefix, x, footY, scale, mirror, clip),
    ghosts: [n('Sit')],
    area: clip ? { x: clip.x + clip.w / 2, y: footY - 180 * scale, rx: clip.w / 2 + 14, ry: 190 * scale } : { x, y: footY - 180 * scale, rx: 130 * scale, ry: 190 * scale },
    rest: (h) => (!dogAbout(h) ? [] : [n(h.full ? 'Round' : 'Sit')]),
    idle(h, rng, fly = false) {
      if (!dogAbout(h)) return null
      if (h.full) return [b(n('Round'), 2.2 + rng.next() * 2), b(n('RoundB'), 0.45)]
      const wait = b(n('Sit'), 1.6 + rng.next() * 1.8)
      if (fly && rng.next() < 0.45) return [wait, b(n('Snap'), 0.16, 'dogSnap'), b(n('SitB'), 0.4)]
      return [wait, b(n('SitB'), 0.5)]
    },
    tap: (h) =>
      h.full
        ? { who: 'dog', beats: [b(n('RoundB'), 0.3, 'dogBurp'), b(n('RoundC'), 0.3, 'dogRoll'), b(n('Round'), 0.3, 'dogPaws')] }
        : { who: 'dog', beats: [b(n('Bark'), 0.13, 'dogBarkA'), b(n('SitB'), 0.09), b(n('Bark'), 0.15, 'dogBarkB'), b(n('Beg'), 0.6, 'dogWhine')] },
    arrive(h) {
      if (!dogAbout(h)) return []
      if (h.full) return [{ who: 'dog', after: 0.12, beats: [b(n('RoundC'), 0.22, 'dogRoll'), b(n('RoundB'), 0.22), b(n('Round'), 0.3, 'dogPaws')] }]
      return [{ who: 'dog', after: 0.12, beats: [b(n('In'), 0.3, 'dogPant'), b(n('Sit'), 0.3)] }]
    },
    squint: (h) => (!dogAbout(h) ? [] : [{ who: 'dog', after: 0.3, beats: [b(n(h.full ? 'RoundB' : 'Duck'), 0.6, 'dogFlop')] }]),
    startle: (h, after) => (!dogAbout(h) ? [] : [{ who: 'dog', after, beats: h.full ? [b(n('RoundC'), 0.4, 'dogRoll'), b(n('Round'), 0.2)] : [b(n('Bark'), 0.14, 'dogBarkA'), b(n('Duck'), 0.5)] }]),
  }
}
