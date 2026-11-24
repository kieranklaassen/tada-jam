import { FIVE, WHO } from './bed'

// Sixteen acts, one for each way of parting five: five alone, ten in pairs,
// and all five on one side. The smaller part puts it on and the same part
// always puts on the same one. An act is a function of time: it lifts, spins,
// tips and squeezes whoever is in it where they lie, so it runs into nobody.

export type Eyes = 'open' | 'shut' | 'wide' | 'dizzy' | 'squint'
export type Pose = {
  /** Off the mattress, in stage units. */
  lift: number
  /** Turned about, as seen, in radians. */
  spin: number
  /** Tipped over sideways and forward, in radians: the ball rolls on the spot. */
  tipX: number
  tipY: number
  /** Wider (over 1) and flatter, or narrower. */
  wide: number
  mouth: number
  eyes: Eyes
  /** How far the feet stick out. */
  feet: number
}
export const still = (): Pose => ({ lift: 0, spin: 0, tipX: 0, tipY: 0, wide: 1, mouth: 0, eyes: 'open', feet: 0 })

export type Prop = { kind: 'feather' | 'bubble' | 'dummy' | 'mask' | 'pillow' | 'puff'; x: number; y: number; size: number; turn: number; alpha: number }
export type Cue = { at: number; who: number; what: 'snore' | 'pop' | 'bonk' | 'giggle' | 'hic' | 'cork' | 'whirl' | 'hum' | 'shriek' | 'boing' | 'squeal' | 'thud' }
/** Where the ones in the act lie. */
export type Place = { x: number; y: number }
export type Act = {
  lasts: number
  pose(t: number, n: number): Pose
  props(t: number, at: readonly Place[]): Prop[]
  cues: readonly Cue[]
}

const TAU = Math.PI * 2
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const part = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const ease = (v: number) => v * v * (3 - 2 * v)
/** Up and down once between a and b. */
const bump = (t: number, a: number, b: number) => Math.sin(part(t, a, b) * Math.PI)
/** In by a, out by b, each taking `k`. */
const during = (t: number, a: number, b: number, k = 0.2) => ease(Math.min(part(t, a, a + k), 1 - part(t, b - k, b)))
const pose = (p: Partial<Pose>): Pose => ({ ...still(), ...p })
const none = (): Prop[] => []
const prop = (kind: Prop['kind'], x: number, y: number, size = 1, turn = 0, alpha = 1): Prop => ({ kind, x, y, size, turn, alpha })
const breath = (t: number) => Math.sin((t / 1) * TAU)

const ALONE: Record<(typeof WHO)[number], Act> = {
  // A bubble grows on his nose with each snore and wakes him when it goes.
  tup: {
    lasts: 3.2,
    pose: (t) => pose({ wide: 1 + 0.07 * breath(t) * during(t, 0, 2.3), eyes: t < 2.2 ? 'shut' : t < 2.8 ? 'wide' : 'open', lift: 46 * bump(t, 2.2, 2.6), mouth: t < 2.2 ? 0.35 + 0.3 * breath(t) : 0.7 * bump(t, 2.2, 3) }),
    props: (t, [a]) => (t < 2.2 ? [prop('bubble', a.x + 16, a.y - 40 - 14 * part(t, 0, 2.2), 0.3 + 1.5 * part(t, 0, 2.2) + 0.15 * breath(t))] : t < 2.5 ? [prop('puff', a.x + 16, a.y - 56, 1 + part(t, 2.2, 2.5), 0, 1 - part(t, 2.2, 2.5))] : []),
    cues: [{ at: 0.1, who: 0, what: 'snore' }, { at: 1.1, who: 0, what: 'snore' }, { at: 2.2, who: 0, what: 'pop' }, { at: 2.35, who: 0, what: 'shriek' }],
  },
  // At last: she stretches as wide as she will go, and shivers with it.
  curl: {
    lasts: 3,
    pose: (t) => pose({ wide: 1 + 0.2 * during(t, 0.3, 2.5, 0.5) + 0.02 * Math.sin(t * 40) * during(t, 0.9, 2, 0.2), feet: 1.3 * during(t, 0.3, 2.5, 0.5), eyes: t > 0.4 && t < 2.4 ? 'squint' : 'open', mouth: 0.8 * during(t, 0.9, 2.2) }),
    props: none,
    cues: [{ at: 0.6, who: 0, what: 'squeal' }, { at: 2.2, who: 0, what: 'hum' }],
  },
  // The dummy goes off like a cork, straight up, and comes down where it was.
  pip: {
    lasts: 3,
    pose: (t) => pose({ wide: 1 + 0.16 * during(t, 0.1, 0.9, 0.5) - 0.1 * bump(t, 0.9, 1.2), mouth: t < 0.9 ? 0 : t < 2.3 ? 0.9 : 0, eyes: t < 0.9 ? 'squint' : t < 2.4 ? 'wide' : 'shut', lift: 10 * bump(t, 2.3, 2.6) }),
    props: (t, [a]) => (t > 0.9 && t < 2.3 ? [prop('dummy', a.x, a.y + 18 - 300 * Math.sin(part(t, 0.9, 2.3) * Math.PI), 1 + 0.7 * bump(t, 0.9, 2.3), t * 9)] : []),
    cues: [{ at: 0.9, who: 0, what: 'cork' }, { at: 2.3, who: 0, what: 'hic' }],
  },
  // Round and round, fast asleep.
  nell: {
    lasts: 3.4,
    pose: (t) => pose({ spin: TAU * 2 * ease(part(t, 0.2, 2.9)), lift: 26 * during(t, 0.2, 2.9, 0.6), wide: 1 - 0.06 * during(t, 0.3, 2.8), eyes: 'shut', feet: during(t, 0.3, 2.9) }),
    props: none,
    cues: [{ at: 0.2, who: 0, what: 'whirl' }, { at: 1.5, who: 0, what: 'whirl' }, { at: 2.9, who: 0, what: 'thud' }],
  },
  // Nothing is funny, and it gets funnier, and he bounces higher.
  gus: {
    lasts: 3.4,
    pose: (t) => {
      const hop = t < 2.8 ? Math.floor(t / 0.4) : 7
      const u = (t % 0.4) / 0.4
      return pose({ lift: t < 2.8 ? (8 + hop * 13) * Math.sin(u * Math.PI) : 0, wide: t < 2.8 ? 1 + 0.12 * (1 - Math.sin(u * Math.PI)) : 1, mouth: t < 3 ? 0.85 : 0.2, eyes: t < 3 ? 'squint' : 'open', spin: 0.12 * Math.sin(t * 16) * during(t, 0, 3) })
    },
    props: none,
    cues: [0, 0.4, 0.8, 1.2, 1.6, 2, 2.4].map((at) => ({ at, who: 0, what: 'giggle' as const })),
  },
}

type Pair = `${(typeof WHO)[number]}+${(typeof WHO)[number]}`
const TOGETHER: Partial<Record<Pair, Act>> = {
  // He snores, she fetches the pillow.
  'tup+curl': {
    lasts: 3.4,
    pose: (t, n) => n === 0
      ? pose({ eyes: t < 2.1 ? 'shut' : 'wide', wide: 1 + (t < 2 ? 0.07 * breath(t) : 0.24 * bump(t, 2, 2.5)), lift: 30 * bump(t, 2.3, 2.7), mouth: t < 2 ? 0.5 : 0.6 * bump(t, 2, 3) })
      : pose({ eyes: t < 1.4 ? 'wide' : 'squint', lift: 34 * bump(t, 0.5, 0.8) + 90 * bump(t, 1.4, 2.2), spin: 0.25 * bump(t, 1.4, 2.2), mouth: 0.5 * during(t, 1.4, 2.6), feet: bump(t, 1.4, 2.2) }),
    props: (t, [a, b]) => {
      const u = ease(part(t, 1.5, 2))
      const out: Prop[] = t > 1.2 && t < 2.5 ? [prop('pillow', b.x + (a.x - b.x) * u, b.y + (a.y - b.y) * u - 50 - 70 * Math.sin(u * Math.PI), 1, u * 5)] : []
      if (t > 2) for (let i = 0; i < 9; i++) {
        const v = part(t, 2, 3.4), k = (i / 9) * TAU
        out.push(prop('feather', a.x + Math.cos(k) * 150 * ease(v), a.y - 40 + Math.sin(k) * 90 * ease(v) + 60 * v * v, 1, k + v * 4, 1 - v * v))
      }
      return out
    },
    cues: [{ at: 0.1, who: 0, what: 'snore' }, { at: 1.1, who: 0, what: 'snore' }, { at: 2, who: 1, what: 'bonk' }, { at: 2.4, who: 0, what: 'shriek' }],
  },
  // Every snore is a wave, and Pip rides it.
  'tup+pip': {
    lasts: 3.4,
    pose: (t, n) => n === 0
      ? pose({ eyes: 'shut', wide: 1 + 0.14 * Math.sin(t * 4) * during(t, 0, 3.2), mouth: 0.4 + 0.3 * Math.sin(t * 4) })
      : pose({ lift: 46 * (0.5 + 0.5 * Math.sin(t * 4 - 0.6)) * during(t, 0.2, 3.2), tipX: 0.2 * Math.sin(t * 4), eyes: 'squint', feet: 0.6 }),
    props: none,
    cues: [{ at: 0, who: 0, what: 'snore' }, { at: 1.57, who: 0, what: 'snore' }, { at: 0.6, who: 1, what: 'hum' }, { at: 2.2, who: 1, what: 'hum' }],
  },
  // A waltz: he keeps the time, she goes round, and then he does.
  'tup+nell': {
    lasts: 3.6,
    pose: (t, n) => pose({ eyes: 'shut', spin: (n === 0 ? -1 : 1) * TAU * ease(part(t, n === 0 ? 1.6 : 0.2, n === 0 ? 3.2 : 1.8)), lift: 18 * Math.abs(Math.sin(t * Math.PI / 0.6)) * during(t, 0.1, 3.4), feet: 0.5, mouth: n === 0 ? 0.4 : 0 }),
    props: none,
    cues: [{ at: 0.1, who: 0, what: 'snore' }, { at: 0.2, who: 1, what: 'whirl' }, { at: 1.6, who: 0, what: 'whirl' }, { at: 3, who: 1, what: 'hum' }],
  },
  // Each snore sets him off, and his laugh sets off the next snore.
  'tup+gus': {
    lasts: 3.4,
    pose: (t, n) => n === 0
      ? pose({ eyes: 'shut', wide: 1 + 0.16 * (bump(t, 0, 0.8) + bump(t, 1.6, 2.4)), mouth: 0.8 * (bump(t, 0, 0.8) + bump(t, 1.6, 2.4)) })
      : pose({ eyes: 'squint', lift: 60 * Math.abs(Math.sin(t * 12)) * (during(t, 0.7, 1.6) + during(t, 2.3, 3.3)), mouth: 0.9 * (during(t, 0.7, 1.6) + during(t, 2.3, 3.3)), tipY: 0.25 * Math.sin(t * 12) * (during(t, 0.7, 1.6) + during(t, 2.3, 3.3)) }),
    props: none,
    cues: [{ at: 0, who: 0, what: 'snore' }, { at: 0.75, who: 1, what: 'giggle' }, { at: 1.1, who: 1, what: 'giggle' }, { at: 1.6, who: 0, what: 'snore' }, { at: 2.35, who: 1, what: 'giggle' }, { at: 2.75, who: 1, what: 'giggle' }],
  },
  // She rocks him, side to side, very strictly, and he goes limp.
  'curl+pip': {
    lasts: 3.4,
    pose: (t, n) => pose({ tipY: (n === 0 ? 0.3 : 0.5) * Math.sin(t * 3.4) * during(t, 0.2, 3.2, 0.4), eyes: n === 0 ? 'squint' : t > 1.6 ? 'shut' : 'open', mouth: n === 0 ? 0.35 + 0.2 * Math.sin(t * 6.8) : 0 }),
    props: none,
    cues: [{ at: 0.2, who: 0, what: 'hum' }, { at: 1.1, who: 0, what: 'hum' }, { at: 2, who: 0, what: 'hum' }, { at: 2.6, who: 1, what: 'hic' }],
  },
  // She lifts the mask to see if anyone is in. Someone is.
  'curl+nell': {
    lasts: 3.2,
    pose: (t, n) => n === 0
      ? pose({ lift: 20 * bump(t, 0.3, 1.1) + 100 * bump(t, 1.5, 2.2), eyes: t < 1.4 ? 'squint' : 'wide', mouth: 0.95 * during(t, 1.45, 2.5), feet: 1.2 * bump(t, 1.5, 2.3) })
      : pose({ lift: 100 * bump(t, 1.5, 2.2), eyes: t < 1.4 ? 'shut' : 'wide', mouth: 0.95 * during(t, 1.45, 2.5), feet: 1.2 * bump(t, 1.5, 2.3) }),
    props: (t, [, b]) => (t > 0.7 ? [prop('mask', b.x, b.y - 8 - 58 * ease(part(t, 0.7, 1.3)) + 58 * ease(part(t, 2.5, 3)) - 100 * bump(t, 1.5, 2.2), 1, 0.3 * during(t, 0.8, 3))] : []),
    cues: [{ at: 0.7, who: 0, what: 'boing' }, { at: 1.5, who: 0, what: 'shriek' }, { at: 1.5, who: 1, what: 'squeal' }, { at: 2.3, who: 1, what: 'thud' }],
  },
  // She will not laugh. She will not. She does.
  'curl+gus': {
    lasts: 3.4,
    pose: (t, n) => n === 0
      ? pose({ wide: 1 - 0.1 * during(t, 0.2, 1.7) + 0.2 * bump(t, 1.8, 2.2), tipY: 0.06 * Math.sin(t * 50) * during(t, 0.9, 1.8), eyes: t < 1.8 ? 'wide' : 'squint', mouth: t < 1.8 ? 0 : 0.95 * during(t, 1.8, 3.3), lift: 50 * Math.abs(Math.sin(t * 9)) * during(t, 1.9, 3.2) })
      : pose({ eyes: 'squint', mouth: 0.8, tipX: 0.3 * Math.sin(t * 14) * during(t, 0, 3.2), lift: 24 * Math.abs(Math.sin(t * 9)) * during(t, 0, 3.2) }),
    props: none,
    cues: [{ at: 0, who: 1, what: 'giggle' }, { at: 0.5, who: 1, what: 'giggle' }, { at: 1, who: 1, what: 'giggle' }, { at: 1.8, who: 0, what: 'squeal' }, { at: 2.2, who: 0, what: 'giggle' }, { at: 2.6, who: 1, what: 'giggle' }],
  },
  // Asleep, she has his dummy. Awake, he has her mask.
  'pip+nell': {
    lasts: 3.4,
    pose: (t, n) => n === 0
      ? pose({ eyes: t < 1.6 ? 'wide' : 'shut', mouth: t > 0.5 && t < 2.8 ? 0.4 : 0, lift: 24 * bump(t, 0.6, 1) })
      : pose({ eyes: t < 2 ? 'shut' : t < 3 ? 'dizzy' : 'shut', spin: 0.4 * Math.sin(t * 5) * during(t, 1, 2.8), lift: 14 * bump(t, 0.5, 1), mouth: 0 }),
    props: (t, [a, b]) => {
      const u = ease(part(t, 0.5, 1.2)) - ease(part(t, 2.5, 3.1)), v = ease(part(t, 1, 1.6)) - ease(part(t, 2.5, 3.1))
      const out: Prop[] = []
      if (t > 0.5 && t < 3.1) out.push(prop('dummy', a.x + (b.x - a.x) * u, a.y + 18 + (b.y - a.y) * u - 90 * Math.sin(u * Math.PI), 1, u * 6))
      if (t > 1 && t < 3.1) out.push(prop('mask', b.x + (a.x - b.x) * v, b.y - 8 + (a.y - b.y) * v - 110 * Math.sin(v * Math.PI), 1, v * 6))
      return out
    },
    cues: [{ at: 0.5, who: 0, what: 'cork' }, { at: 1, who: 1, what: 'whirl' }, { at: 1.7, who: 1, what: 'hic' }, { at: 2.5, who: 0, what: 'boing' }, { at: 3.1, who: 0, what: 'hic' }],
  },
  // Hic. Ha. Hic. Ha.
  'pip+gus': {
    lasts: 3.2,
    pose: (t, n) => {
      const beat = Math.floor(t / 0.4), u = (t % 0.4) / 0.4
      const mine = beat % 2 === n && t < 2.8
      return pose({ lift: mine ? (n === 0 ? 40 : 74) * Math.sin(u * Math.PI) : 0, wide: mine ? 0.94 : 1.05, mouth: mine ? (n === 0 ? 0.25 : 0.9) : 0, eyes: mine ? (n === 0 ? 'wide' : 'squint') : 'open' })
    },
    props: none,
    cues: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ at: i * 0.4, who: i % 2, what: i % 2 ? ('giggle' as const) : ('hic' as const) })),
  },
  // She turns, so he turns, and she stops and he cannot.
  'nell+gus': {
    lasts: 3.6,
    pose: (t, n) => n === 0
      ? pose({ spin: TAU * ease(part(t, 0.2, 1.3)), eyes: 'shut', lift: 14 * during(t, 0.2, 1.4) })
      : pose({ spin: -TAU * 3 * ease(part(t, 0.5, 2.6)) + 0.2 * Math.sin(t * 8) * during(t, 2.6, 3.5), eyes: t < 0.6 ? 'wide' : 'dizzy', mouth: t < 2.6 ? 0.8 : 0.35, lift: 22 * during(t, 0.5, 2.6), feet: 0.8 * during(t, 0.5, 2.7) }),
    props: none,
    cues: [{ at: 0.2, who: 0, what: 'whirl' }, { at: 0.5, who: 1, what: 'squeal' }, { at: 1.1, who: 1, what: 'whirl' }, { at: 1.8, who: 1, what: 'whirl' }, { at: 2.7, who: 1, what: 'giggle' }],
  },
}

/** All on one side: one after the other they go up like corn in a pan. */
const ALL: Act = {
  lasts: 3.2,
  pose: (t, n) => {
    const a = bump(t, 0.2 + n * 0.24, 0.6 + n * 0.24), b = bump(t, 1.6 + n * 0.14, 2.1 + n * 0.14)
    return pose({ lift: 80 * a + 120 * b, wide: 1 + 0.1 * Math.sin(t * 9) * (1 - Math.max(a, b)), mouth: Math.max(a, b), eyes: b > 0.1 ? 'squint' : 'wide', feet: b })
  },
  props: none,
  cues: [...[0, 1, 2, 3, 4].map((n) => ({ at: 0.2 + n * 0.24, who: n, what: 'boing' as const })), ...[0, 1, 2, 3, 4].map((n) => ({ at: 1.6 + n * 0.14, who: n, what: 'squeal' as const })), { at: 2.9, who: 0, what: 'thud' as const }],
}

/** Everybody in the act, in the order the act knows them: the smaller part, or all five when they lie together. */
export function castOf(parts: { left: readonly number[]; right: readonly number[] }): number[] {
  const small = parts.left.length < parts.right.length ? parts.left : parts.right
  return [...(small.length ? small : parts.left.length ? parts.left : parts.right)].sort((a, b) => a - b)
}

export const nameOf = (cast: readonly number[]): string => (cast.length === FIVE ? 'all' : cast.map((i) => WHO[i]).join('+'))

export function actOf(cast: readonly number[]): Act {
  if (cast.length === 1) return ALONE[WHO[cast[0]]]
  if (cast.length === 2) return TOGETHER[nameOf(cast) as Pair]!
  return ALL
}
