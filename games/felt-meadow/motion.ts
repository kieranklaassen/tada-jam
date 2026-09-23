import { seeded } from './math'

// Motion personalities. Each character has its own tempo, weight, and
// funniest part, and its own variants of every action a child can cause or
// catch: the bee is light and quick and says everything with tumbles and its
// wings; the snail is slow and heavy and says everything with its eye stalks;
// the mouse is tiny and twitchy and says everything with its nose, head, and
// tail. A director picks a variant without repeating one back to back, varies
// each play a little in size and speed, and plays rare delights only while
// its character has nothing else to do. The characters' own modules turn the
// playing variant into motion; this module only chooses.

export type Character = 'bee' | 'snail' | 'mouse'
export type ActionKind = 'poke' | 'delight'

export type Variant = { readonly name: string; readonly seconds: number }

export type Personality = {
  readonly poke: readonly Variant[]
  readonly delight: readonly Variant[]
  /** Seconds of calm between delights, low and high. */
  readonly delightEvery: readonly [number, number]
}

export const PERSONALITIES = {
  bee: {
    poke: [
      { name: 'spin-hop', seconds: 0.95 },
      { name: 'tumble', seconds: 1.05 },
      { name: 'giggle', seconds: 1.6 },
    ],
    delight: [
      { name: 'glance', seconds: 1.6 },
      { name: 'waggle-dance', seconds: 2.2 },
      { name: 'loop-de-loop', seconds: 1.3 },
    ],
    delightEvery: [6, 13],
  },
  snail: {
    poke: [
      { name: 'tuck-and-peek', seconds: 4.2 },
      { name: 'tall-eyes', seconds: 2.2 },
      { name: 'shiver-in', seconds: 2.8 },
    ],
    delight: [
      { name: 'glance', seconds: 2.4 },
      { name: 'long-stretch', seconds: 3 },
      { name: 'eye-wobble', seconds: 2.2 },
    ],
    delightEvery: [8, 16],
  },
  mouse: {
    poke: [
      { name: 'leap-home', seconds: 0.3 },
      { name: 'stand-and-squeak', seconds: 1.2 },
      { name: 'tail-chase', seconds: 1.1 },
    ],
    // The mouse's calm moments (a freeze, sitting up) are short, so it fills them quickly.
    delight: [
      { name: 'glance', seconds: 1.2 },
      { name: 'wash-face', seconds: 1.6 },
      { name: 'tail-flick', seconds: 1 },
    ],
    delightEvery: [1.2, 3.5],
  },
} as const satisfies Record<Character, Personality>

type Table = typeof PERSONALITIES
export type PokeName<C extends Character> = Table[C]['poke'][number]['name']
export type DelightName<C extends Character> = Table[C]['delight'][number]['name']
export type ActionName<C extends Character> = PokeName<C> | DelightName<C>

export class Director<C extends Character> {
  playing: ActionName<C> | null = null
  kind: ActionKind | null = null
  /** Seconds into the playing action. */
  t = 0
  /** Length of this play (the variant's length over this play's speed). */
  seconds = 0
  /** Size of this play, 0.85..1.15. */
  amp = 1
  private readonly personality: Personality
  private readonly random: () => number
  private readonly last: Record<ActionKind, string | null> = { poke: null, delight: null }
  private untilDelight: number

  constructor(character: C, seed: number) {
    this.personality = PERSONALITIES[character]
    this.random = seeded(seed)
    this.untilDelight = this.gap()
  }

  /** The playing poke, or null. */
  get poke(): PokeName<C> | null {
    return this.kind === 'poke' ? (this.playing as PokeName<C>) : null
  }

  /** The playing delight, or null. */
  get delight(): DelightName<C> | null {
    return this.kind === 'delight' ? (this.playing as DelightName<C>) : null
  }

  trigger(kind: 'poke'): PokeName<C>
  trigger(kind: 'delight'): DelightName<C>
  trigger(kind: ActionKind): ActionName<C> {
    const options = this.personality[kind]
    let index = Math.floor(this.random() * options.length)
    if (options.length > 1 && options[index].name === this.last[kind]) index = (index + 1 + Math.floor(this.random() * (options.length - 1))) % options.length
    const variant = options[index]
    this.last[kind] = variant.name
    this.playing = variant.name as ActionName<C>
    this.kind = kind
    this.t = 0
    this.amp = 0.85 + this.random() * 0.3
    this.seconds = variant.seconds / (0.9 + this.random() * 0.2)
    if (kind === 'poke') this.untilDelight = Math.max(this.untilDelight, this.gap() * 0.5)
    return this.playing
  }

  /** Advance the playing action; while `calm`, count down to the next delight and start it. */
  step(dt: number, calm: boolean): void {
    if (this.playing !== null) {
      this.t += dt
      if (this.t >= this.seconds) this.stop()
      return
    }
    if (!calm) return
    this.untilDelight -= dt
    if (this.untilDelight <= 0) {
      this.trigger('delight')
      this.untilDelight = this.gap()
    }
  }

  /** Real life needs the character: a delight stops at once (a poke plays out). */
  interrupt(): void {
    if (this.kind === 'delight') this.stop()
  }

  /** 0..1 through the playing action. */
  progress(): number {
    return this.playing === null ? 0 : Math.min(1, this.t / this.seconds)
  }

  private stop(): void {
    this.playing = null
    this.kind = null
    this.t = 0
  }

  private gap(): number {
    const [low, high] = this.personality.delightEvery
    return low + this.random() * (high - low)
  }
}
