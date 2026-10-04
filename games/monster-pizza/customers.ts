import type { Kind } from './kinds'

// The five customers and the tastes that never change, so a child can learn
// them and test them on purpose (pack: game-design,
// characters-with-opinions.md). No drawing here: the rules read the tastes,
// the motion reads the tempo and the weight, and the art reads the build.

export const CUSTOMERS = ['bim', 'grum', 'fizz', 'mops', 'ooze'] as const
export type Customer = (typeof CUSTOMERS)[number]

export function isCustomer(value: unknown): value is Customer {
  return typeof value === 'string' && (CUSTOMERS as readonly string[]).includes(value)
}

export type Character = {
  /** Always on its order. */
  loves: Kind
  /** Never on its order, and from the third place on the kind in the tub that is not wanted. */
  cannotStand: Kind
  /** Moves per second it tends to make: its tempo. */
  tempo: number
  /** 0 light and springy to 1 heavy: how long a move takes to settle. */
  weight: number
  /** The part of its body that overdoes everything. */
  funniest: 'eyeStalk' | 'belly' | 'neck' | 'ears' | 'tongue'
  /** Half its width and its whole height, in stage units, standing at the counter: big enough that its face is the biggest thing in the room. */
  halfWidth: number
  height: number
  /** How far up its body the mouth is, as a share of its height. */
  mouthAt: number
  /** Marker colours: the body, and the paler patch on it. */
  body: string
  patch: string
  /** Its voice: the pitch its babble sits on, in Hz. */
  voice: number
}

export const CHARACTERS: Record<Customer, Character> = {
  bim: { loves: 'olive', cannotStand: 'sock', tempo: 2.6, weight: 0.15, funniest: 'eyeStalk', halfWidth: 132, height: 285, mouthAt: 0.42, body: '#22b8a8', patch: '#a8ecdf', voice: 520 },
  grum: { loves: 'cheese', cannotStand: 'pepper', tempo: 0.7, weight: 0.95, funniest: 'belly', halfWidth: 240, height: 393, mouthAt: 0.6, body: '#8d5fd8', patch: '#d6c3f5', voice: 130 },
  fizz: { loves: 'pepper', cannotStand: 'mushroom', tempo: 3.4, weight: 0.3, funniest: 'neck', halfWidth: 126, height: 390, mouthAt: 0.75, body: '#ff8d24', patch: '#ffd9a6', voice: 390 },
  mops: { loves: 'sock', cannotStand: 'olive', tempo: 1.1, weight: 0.6, funniest: 'ears', halfWidth: 198, height: 330, mouthAt: 0.46, body: '#dc4f97', patch: '#f8c3dd', voice: 220 },
  ooze: { loves: 'worm', cannotStand: 'cheese', tempo: 1.6, weight: 0.75, funniest: 'tongue', halfWidth: 192, height: 308, mouthAt: 0.5, body: '#93d22f', patch: '#dcf3a8', voice: 300 },
}
