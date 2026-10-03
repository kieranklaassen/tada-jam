// Whole-number arithmetic for amounts used over spans of time. Everything here
// is exact: an amount is so many pieces for so many hours, a moment in the
// night is a fraction of two whole numbers, and nothing is rounded except
// where a function says which way.
//
// The limits come from the design sheet (ART.md, "The records"): the amount
// for one hour is at most a fraction of two whole numbers, never a fraction
// inside a fraction, and the span of an amount is never zero.

/** So many pieces used in so many hours: three logs for one hour, one flask for two. Both are whole and at least 1. */
export type Amount = { readonly pieces: number; readonly hours: number }

/** A moment or a quantity as a fraction in lowest terms, with a positive denominator. */
export type Fraction = { readonly num: number; readonly den: number }

export function gcd(a: number, b: number): number {
  let x = Math.abs(a), y = Math.abs(b)
  while (y !== 0) [x, y] = [y, x % y]
  return x === 0 ? 1 : x
}

export function fraction(num: number, den: number): Fraction {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) throw new Error('a fraction is two whole numbers and its denominator is not zero')
  const sign = den < 0 ? -1 : 1, g = gcd(num, den)
  return { num: (sign * num) / g, den: (sign * den) / g }
}

export const whole = (n: number): Fraction => fraction(n, 1)
export const value = (f: Fraction): number => f.num / f.den
export const isWhole = (f: Fraction): boolean => f.den === 1
/** Negative when a comes first, zero when they are the same moment. */
export const compare = (a: Fraction, b: Fraction): number => a.num * b.den - b.num * a.den
export const least = (a: Fraction, b: Fraction): Fraction => (compare(a, b) <= 0 ? a : b)

export function isAmount(amount: Amount): boolean {
  return Number.isInteger(amount.pieces) && Number.isInteger(amount.hours) && amount.pieces >= 1 && amount.hours >= 1
}

/** The amount for one hour: three logs for one hour is 3, five logs for two hours is five halves. */
export function forOneHour(amount: Amount): Fraction {
  return fraction(amount.pieces, amount.hours)
}

/** How long a stock lasts at an amount, in hours: 8 logs at 3 for one hour last two and two thirds. */
export function lastsHours(stock: number, amount: Amount): Fraction {
  return fraction(stock * amount.hours, amount.pieces)
}

/** What a span of hours uses up at an amount, exactly: 7 hours at one flask for two hours use three and a half. */
export function usedIn(hours: Fraction, amount: Amount): Fraction {
  return fraction(hours.num * amount.pieces, hours.den * amount.hours)
}

/** The whole pieces a night needs: what it uses, with a part piece meaning one more. */
export function neededFor(hours: number, amount: Amount): number {
  return Math.ceil((hours * amount.pieces) / amount.hours)
}

/** A card doubled, tripled and so on: the same amount over a longer span. */
export function times(amount: Amount, by: number): Amount {
  return { pieces: amount.pieces * by, hours: amount.hours * by }
}

/** Whether two amounts use a stock equally fast: three for one hour and six for two. */
export function sameAmount(a: Amount, b: Amount): boolean {
  return a.pieces * b.hours === b.pieces * a.hours
}

/**
 * The running totals a card leaves when it is stamped along the ruler: one
 * entry a stamp, with the hours reached and the pieces laid so far. This is
 * the ratio table of the design sheet. It stops at the last stamp that still
 * starts inside the night.
 */
export function strip(amount: Amount, nightHours: number): { hours: number; pieces: number }[] {
  const rows: { hours: number; pieces: number }[] = []
  for (let n = 1; (n - 1) * amount.hours < nightHours; n++) rows.push({ hours: n * amount.hours, pieces: n * amount.pieces })
  return rows
}
