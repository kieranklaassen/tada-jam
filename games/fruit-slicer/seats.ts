import type { Customer, Who } from './orders'
import { QUEUE, WINDOW, type Point } from './stage'

// Where each customer stands in the stall's panel and how large it is drawn
// there: the one at the window fills the height of the panel, the two who
// wait are smaller, and the small ones are drawn larger than life so their
// faces read. From these the view places the figures, and everything that
// has to find a face (a drop of juice, a comic mark, a pair of eyes that
// follow the finger) finds it. Pure: no canvas.

/** Which customer: the one at the window, or one of the two who wait. */
export type Seat = 'window' | 0 | 1

/** How big each customer is drawn at the window and in the queue, beside its figure's own units. */
export const AT_WINDOW: Readonly<Record<Who, number>> = { pelican: 1.3, twins: 1.8, ants: 2, cat: 1.45, boa: 1.5 }
export const IN_QUEUE: Readonly<Record<Who, number>> = { pelican: 0.85, twins: 1.15, ants: 1.3, cat: 0.95, boa: 0.9 }
/** The feet of everyone in the stall's panel stand on this line. */
export const SILL = WINDOW.y + WINDOW.h - 4

/**
 * The twins stand nose to nose: each this far from the middle of the pair, with a snout that reaches this far
 * from its own middle, so the two tips keep a gap between them. Two snouts that crossed would read as a sign.
 */
export const TWINS_APART = 60
export const SNOUT_REACH = 55
/** The paper there is always between the two tips, whatever the two are doing. */
export const SNOUT_GAP = 6
/** How high the tip of a snout is above the feet, and how much wider a twin is when it is rolled flat. */
const SNOUT_HIGH = 52
export const TWIN_SPREAD = 0.1

/**
 * How far toward the middle of the pair a twin's snout tip is from its own feet: it leans about its feet, so
 * leaning in by `leanIn` radians carries the tip nearer the other twin and leaning back takes it away, and
 * rolled `flat` it is a little wider and much lower.
 */
export function snoutReach(leanIn: number, flat = 0): number {
  return SNOUT_REACH * (1 + TWIN_SPREAD * flat) * Math.cos(leanIn) + SNOUT_HIGH * (1 - 0.88 * flat) * Math.sin(leanIn)
}

/** How far from the middle each twin stands, given how far each one's snout reaches now: where they would touch, both give way. */
export function twinsApart(reachA: number, reachB: number): number {
  return Math.max(TWINS_APART, (SNOUT_GAP + reachA + reachB) / 2)
}

/** How many stand in a file of ants: one for each part of the order. */
const fileOf = (customer: Customer): number => Math.max(...customer.shares.map((share) => share.num))

/** How large a customer is drawn in its seat, and how much of the sill a file of ants may take: a short file is drawn large, a long one runs on under the ticket. */
export function fitOf(customer: Customer, seat: Seat): { s: number; room: number } {
  if (seat !== 'window') return { s: IN_QUEUE[customer.who], room: customer.who === 'ants' ? 200 : 210 }
  if (customer.who !== 'ants') return { s: AT_WINDOW[customer.who], room: 540 }
  return fileOf(customer) <= 3 ? { s: AT_WINDOW.ants, room: 280 } : { s: 1.3, room: 540 }
}

/** Where a customer's feet are, by who it is: the middle of them, or the first ant of a file. */
export function standsAt(who: Who, seat: Seat): Point {
  if (seat === 'window') return { x: WINDOW.x + (who === 'ants' ? 60 : who === 'boa' ? 150 : who === 'twins' ? 185 : 120), y: SILL }
  return { x: QUEUE[seat].x + (who === 'ants' ? 26 : who === 'boa' ? 125 : who === 'twins' ? 116 : who === 'cat' ? 62 : 58), y: SILL }
}

/** Where each figure's head is from its feet, in the figure's own units: the middle of the face. */
const HEAD: Readonly<Record<Who, Point>> = { pelican: { x: 16, y: -124 }, twins: { x: 0, y: -48 }, ants: { x: 16, y: -20 }, cat: { x: 4, y: -92 }, boa: { x: 74, y: -80 } }

/** The middle of a customer's face on the stage: of the pair for the twins, and of the first ant for a file. */
export function headOf(customer: Customer, seat: Seat): Point {
  const feet = standsAt(customer.who, seat), { s, room } = fitOf(customer, seat)
  // A file of ants is drawn at the size its spacing allows.
  const k = customer.who === 'ants' ? Math.min(44 * s, room / fileOf(customer)) / 44 : s
  return { x: feet.x + HEAD[customer.who].x * k, y: feet.y + HEAD[customer.who].y * k }
}
