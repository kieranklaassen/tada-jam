// Lengths, shares and the give of a tin: the arithmetic every other rule
// module stands on. Pure: no renderer, no DOM, no clock.
//
// Every length is a whole number of points. A fruit's own length divides by
// every part in play, so a share of it is always a whole number of points and
// two quarter pieces add up to a half piece exactly.

/** A share of a fruit: so many of so many equal parts. More than one whole when `num` is above `den`. */
export type Share = { num: number; den: number }

/** The three fruits. They differ in length and colour and in nothing else. */
export type Fruit = 'long' | 'middle' | 'short'
export const FRUITS: readonly Fruit[] = ['long', 'middle', 'short']

/** The whole length of each fruit, in points. Each divides by every part in play (`PARTS`, below), and by twice each of them. */
export const WHOLE: Readonly<Record<Fruit, number>> = { long: 2400, middle: 1920, short: 1440 }

/** The length of the board, of the rail the tin lies on and of the longest order: twice the short fruit. */
export const RAIL = 2880

/**
 * The parts a fruit is cut into, in the order they come into play. The list is the one a record states for
 * written fractions at the lower end of the band, less hundredths (ART.md, "The records"); it is the game's
 * own choice wherever a record names none.
 */
export const PARTS: readonly number[] = [2, 4, 8, 3, 6, 5, 10, 12]

/** The give of a tin's jaw is one of this many parts of the whole fruit, to either side. The game's own choice. */
export const GIVE_PARTS = 24

/** The give for this fruit, in points. It is also the shortest piece a cut can make. */
export function giveOf(fruit: Fruit): number {
  return WHOLE[fruit] / GIVE_PARTS
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a)), y = Math.abs(Math.round(b))
  while (y) [x, y] = [y, x % y]
  return x
}

export function lcm(a: number, b: number): number {
  return a && b ? Math.abs(a * b) / gcd(a, b) : 0
}

/** The same share in the fewest parts. */
export function reduced(share: Share): Share {
  const by = gcd(share.num, share.den) || 1
  return { num: share.num / by, den: share.den / by }
}

/** Whether two shares are the same size. Meaningful only for shares of one same fruit. */
export function sameSize(a: Share, b: Share): boolean {
  return a.num * b.den === b.num * a.den
}

/** Which of two shares of one same fruit is bigger: -1 the first is less, 0 equal, 1 the first is greater. */
export function compareShares(a: Share, b: Share): -1 | 0 | 1 {
  const left = a.num * b.den, right = b.num * a.den
  return left < right ? -1 : left > right ? 1 : 0
}

/** The fewest parts both shares can be ruled into. */
export function commonParts(a: Share, b: Share): number {
  return lcm(a.den, b.den)
}

/** A share written in more parts, or null when it does not come out in whole parts. */
export function inParts(share: Share, parts: number): Share | null {
  const num = (share.num * parts) / share.den
  return Number.isInteger(num) ? { num, den: parts } : null
}

/** The length of a share of this fruit, in points. Whole for every share whose parts are in play. */
export function shareLength(fruit: Fruit, share: Share): number {
  return (WHOLE[fruit] * share.num) / share.den
}

/** How a length sits in a tin of the ordered length. */
export type Fit = {
  /** Within the give, sticking out past the jaw, or leaving a gap. */
  kind: 'fit' | 'over' | 'under'
  /** By how many points it is over (positive) or under (negative). Zero only when exact. */
  by: number
}

/** Lays a total length against an ordered length: the jaw takes up anything within the give. */
export function fitOf(total: number, ordered: number, give: number): Fit {
  const by = total - ordered
  return { kind: Math.abs(by) <= give ? 'fit' : by > 0 ? 'over' : 'under', by }
}

/**
 * The note a length rings, in hertz, when a whole of this fruit rings `wholeHz`: a length rings as a string
 * does, so half the length is an octave up and two thirds is a fifth up. True of a string; a toy here.
 */
export function pitchOf(length: number, whole: number, wholeHz: number): number {
  return length > 0 ? (wholeHz * whole) / length : wholeHz
}

/**
 * How many whole parts of a fruit a length covers when the fruit is ruled into `parts`, or null when it ends
 * between two marks. A piece may be off a mark by the give, and never by more than a quarter of one part, so
 * that with fine parts not every length counts as ending on a mark.
 */
export function wholeParts(length: number, fruit: Fruit, parts: number): number | null {
  const part = WHOLE[fruit] / parts
  const count = Math.round(length / part)
  return count >= 1 && Math.abs(length - count * part) <= Math.min(giveOf(fruit), part / 4) ? count : null
}
