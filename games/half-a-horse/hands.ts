import type { Point } from './stage'

// Every finger on its own. A contact is bound to what it lands on and keeps
// it until it lifts, so two children's fingers never take from each other.
// - At most three contacts work. Any other, or a second on what another holds,
//   is extra: it gets a small answer and acts on nothing.
// - A holder that has lain still for a second hands a half over to the next
//   finger that lands on it, so a resting hand never deadens a half. A holder
//   that is moving is never interrupted.
// - A tap is a contact that stayed within the slop and lifted soon. Held
//   still for longer it has rested, and its lift does nothing.

export const MAX_WORKING = 3
export const TAP_SLOP = 14
export const TAP_S = 0.45
export const REST_S = 1
export const LIFT_GRACE_S = 0.3
export const REGRAB = 140

export type Contact<T> = {
  id: number
  target: T
  from: Point
  at: Point
  /** The finger's place on what it holds, from that thing's middle. */
  off: Point
  seconds: number
  still: number
  /** Where `still` is measured from: a slow drag leaves it, a resting finger's tremble does not. */
  anchor: Point
  moved: boolean
  extra: boolean
  /** It is on something that takes a finger. One on bare ground keeps none of the three from the others. */
  counts: boolean
}

export class Hands<T> {
  /** How far a tap may stray, in stage units: the Mount widens it on a small surface. */
  slop = TAP_SLOP
  readonly contacts = new Map<number, Contact<T>>()

  working(): number {
    let n = 0
    for (const contact of this.contacts.values()) if (!contact.extra && contact.counts && contact.still < REST_S) n++
    return n
  }

  land(id: number, at: Point, target: T, off: Point, extra: boolean, counts = true): Contact<T> {
    const contact: Contact<T> = { id, target, from: { ...at }, at: { ...at }, off, seconds: 0, still: 0, anchor: { ...at }, moved: false, counts, extra: extra || (counts && this.working() >= MAX_WORKING) }
    this.contacts.set(id, contact)
    return contact
  }

  /** Returns the contact, or null for a finger that is not known. */
  move(id: number, at: Point): Contact<T> | null {
    const contact = this.contacts.get(id)
    if (!contact) return null
    if (Math.hypot(at.x - contact.anchor.x, at.y - contact.anchor.y) > 4) {
      contact.still = 0
      contact.anchor = { ...at }
    }
    contact.at = { ...at }
    if (!contact.moved && Math.hypot(at.x - contact.from.x, at.y - contact.from.y) > this.slop) contact.moved = true
    return contact
  }

  lift(id: number): Contact<T> | null {
    const contact = this.contacts.get(id) ?? null
    this.contacts.delete(id)
    return contact
  }

  step(dt: number): void {
    for (const contact of this.contacts.values()) { contact.seconds += dt; contact.still += dt }
  }

  isTap(contact: Contact<T>): boolean {
    return !contact.moved && contact.seconds <= TAP_S
  }
}
