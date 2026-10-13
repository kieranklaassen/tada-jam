// The six things of the street, smallest first, and the sizes the rules use.
// Lengths are street units: the street is thirteen of them wide.

export const KINDS = ['pie', 'hat', 'dog', 'balloon', 'tuba', 'drummer'] as const
export type Kind = (typeof KINDS)[number]

export type KindDef = {
  /** How wide it stands on the street. The hole takes it when its mouth is wider than this. */
  width: number
  /** How tall it stands, for the finger that points at it. */
  height: number
  /** How far above its own foot the next thing of a stack sits, when this thing is itself riding on another. */
  seat: number
  /** The same when it is the bottom of the stack, used the wrong way: squashed, upside down, sat in. */
  seatUnder: number
}

export const KIND: Readonly<Record<Kind, KindDef>> = {
  pie: { width: 1.1, height: 0.7, seat: 0.36, seatUnder: 0.16 },
  hat: { width: 1.25, height: 1.05, seat: 0.8, seatUnder: 0.34 },
  dog: { width: 1.5, height: 1.05, seat: 0.78, seatUnder: 0.78 },
  balloon: { width: 1.75, height: 2.2, seat: 2.0, seatUnder: 1.4 },
  tuba: { width: 2.1, height: 2.0, seat: 1.55, seatUnder: 1.2 },
  drummer: { width: 2.6, height: 3.0, seat: 2.72, seatUnder: 2.72 },
}

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

/** The mouth of an empty hole: wide enough for a pie and nothing else. */
export const EMPTY_MOUTH = 1.3
/** Each thing in the hole widens the mouth by this share of its own width. */
export const GROW = 0.15
/** A thing fits when it is no wider than this share of the mouth. */
export const FIT = 0.92

/** How wide the mouth is with these things inside. */
export function mouthOf(belly: readonly Kind[]): number {
  let wide = EMPTY_MOUTH
  for (const kind of belly) wide += GROW * KIND[kind].width
  return wide
}

/** The room a stack takes on the street: it is as wide as its widest part. */
export function widthOf(parts: readonly Kind[]): number {
  let wide = 0
  for (const kind of parts) wide = Math.max(wide, KIND[kind].width)
  return wide
}

/** What a stack stands on: its bottom thing. That is the width the mouth must be wider than. */
export function footOf(parts: readonly Kind[]): number {
  return parts.length > 0 ? KIND[parts[0]].width : 0
}

/** How far above the stack's foot the part at `index` sits. Only the bottom thing of a stack of two or more is used the wrong way. */
export function seatOf(parts: readonly Kind[], index: number): number {
  let high = 0
  for (let below = 0; below < index; below++) high += below === 0 ? KIND[parts[0]].seatUnder : KIND[parts[below]].seat
  return high
}

/** How high a stack stands. */
export function heightOf(parts: readonly Kind[]): number {
  if (parts.length === 0) return 0
  const top = parts.length - 1
  return seatOf(parts, top) + KIND[parts[top]].height
}

/** Whether a mouth of this width takes a thing of that width. */
export function fits(width: number, mouth: number): boolean {
  return width <= mouth * FIT
}
