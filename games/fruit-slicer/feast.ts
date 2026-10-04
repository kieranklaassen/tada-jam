import { WHOLE, type Fruit } from './measure'
import type { Customer } from './orders'
import type { Show } from './scenes'
import type { Taste } from './tastes'

// What a customer's body shows of what it ate, as numbers the figure draws:
// each piece inside it at its own length, and the taste landing on these exact
// pieces. While the serve plays, the numbers follow its beats; once it is
// over, and on load, only the pieces stay. Pure.

export type Feast = {
  /** Each piece inside the customer, in the order eaten: how far down it has gone, 0 at the mouth to 1 at rest, its length as a share of the fruit on order, and which fruit it is a piece of. */
  lumps: { at: number; size: number; fruit: Fruit }[]
  /** The mouth opening for a bite, or held open by a piece that sticks out. */
  mouth: number
  /** Off the ground: a hiccup for every seam. */
  hop: number
  /** The shrug at a lid that will not shut, as the customer is sent off with a misfit: 0 to 1. */
  shrug: number
  /** The twins' longer piece pulled between them: -1 to 1. And the tin spinning under it, in radians. */
  pull: number
  spin: number
  /** For each ant of the file, how flat it is under the end of a piece that stops between two ants. */
  flat: number[]
  /** The cat: eyes crossed over two equal shares; a look at the gap (-1), then at the piece (1); the tail up at the longer tin filled. */
  cross: number
  gaze: number
  tail: number
  /** The boa: where along it a sneeze is travelling, 0 at the head to 1 at the far end, or -1 for none. */
  sneeze: number
  /** How pleased the body is with how it was cut, 0 to 1: it likes it or it does not, and it shows. */
  pleased: number
}

const bump = (t: number): number => Math.sin(Math.max(0, Math.min(1, t)) * Math.PI)

/**
 * The body's answer to exactly these pieces. `lengths` are the pieces in the order eaten; `taste` is the
 * customer's fixed taste applied to them, or nothing once the serve is long over; `sticksOut` says the order
 * was too long, so the last piece is eaten sticking out; `sentOff` says it was sent off with a misfit, so it
 * shrugs as the lid comes down and will not shut. `fruits` says which fruit each piece is of, where that is not
 * the fruit on order: the body shows exactly what went in.
 */
export function feastOf(customer: Customer, lengths: readonly number[], taste: Taste | null, show: Show | null, sticksOut = false, sentOff = false, fruits: readonly Fruit[] = []): Feast {
  const whole = WHOLE[customer.fruit]
  const bites = show ? show.bites : lengths.length
  const lumps: Feast['lumps'] = []
  lengths.forEach((length, index) => {
    if (bites <= index) return
    lumps.push({ at: Math.min(1, bites - index), size: Math.min(2, length / whole), fruit: fruits[index] ?? customer.fruit })
  })
  const feast: Feast = { lumps, mouth: 0, hop: 0, shrug: 0, pull: 0, spin: 0, flat: [], cross: 0, gaze: 0, tail: 0, sneeze: -1, pleased: 0 }
  if (!show || show.kind !== 'serve') return feast
  const biting = bites - Math.floor(bites)
  feast.mouth = Math.max(bites < lengths.length ? bump(biting) : 0, sticksOut && show.lift > 0 ? 0.4 : 0)
  feast.shrug = sentOff ? bump(show.lid) : 0
  if (!taste || show.taste <= 0) return feast
  const t = show.taste, easing = 1 - show.settle
  switch (taste.who) {
    case 'pelican':
      feast.hop = taste.hiccups > 0 ? 7 * Math.abs(Math.sin(t * Math.PI * taste.hiccups)) * easing : 0
      feast.pleased = taste.liked ? bump(t) : 0
      break
    case 'twins':
      feast.pull = taste.pulled === null ? 0 : (taste.pulled === 0 ? 1 : -1) * Math.sin(t * Math.PI * 6) * easing
      // Two whole turns, so it comes to rest the right way up.
      feast.spin = taste.pulled === null ? 0 : t * Math.PI * 4
      feast.pleased = taste.liked ? bump(t) : 0
      break
    case 'ants': {
      const count = wantedCount(customer)
      feast.flat = Array.from({ length: count }, (_, ant) => (taste.flattened.includes(ant) ? (t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.15)) : 0))
      feast.pleased = taste.liked ? bump(t) : 0
      break
    }
    case 'cat':
      feast.cross = taste.crossEyed ? bump(t) : 0
      feast.gaze = taste.gaveSmaller ? (t < 0.5 ? -bump(t * 2) : bump((t - 0.5) * 2)) : 0
      feast.tail = taste.liked ? t * easing + (1 - easing) * 0.3 : 0
      feast.pleased = taste.liked ? bump(t) : 0
      break
    case 'boa':
      feast.sneeze = taste.sneezes > 0 && t < 1 ? (t * taste.sneezes) % 1 : -1
      feast.pleased = taste.liked ? bump(t) : 0
      break
  }
  return feast
}

/**
 * What shows of a served customer on its way out, `away` of the way gone: the pieces it ate, at rest, and the
 * pelican still hiccuping once for every seam, all the way out.
 */
export function leavingFeast(customer: Customer, lengths: readonly number[], away: number, fruits: readonly Fruit[] = []): Feast {
  const feast = feastOf(customer, lengths, null, null, false, false, fruits)
  if (customer.who === 'pelican' && lengths.length > 1) feast.hop = 7 * Math.abs(Math.sin(away * Math.PI * Math.min(6, lengths.length - 1)))
  return feast
}

/** How many ants stand in the file: one for each part of the order. */
export function wantedCount(customer: Customer): number {
  return Math.max(...customer.shares.map((share) => share.num))
}
