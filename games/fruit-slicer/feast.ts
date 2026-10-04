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
  lumps: { at: number; size: number; fruit: Fruit; twin: 0 | 1 }[]
  /** The mouth opening for a bite, or held open by a piece that sticks out. */
  mouth: number
  /** Of the twins, which is biting: 0 or 1 when they eat one after the other, -1 when they eat in step, each its own piece at the same moment. */
  eater: number
  /** Off the ground: a hiccup for every seam. */
  hop: number
  /** The shrug at a lid that will not shut, as the customer is sent off with a misfit: 0 to 1. */
  shrug: number
  /** The twins' longer piece pulled between them: -1 to 1. How long that piece is, as a share of the fruit. And the tin spinning under it, in radians. */
  pull: number
  rope: number
  spin: number
  /** For each ant of the file, how flat it is under the end of a piece that stops between two ants; and, once it has peeled itself up, how cross it is. */
  flat: number[]
  cross2: number[]
  /** The cat: eyes crossed over two equal shares; a look down at the gap at the far end of its tin (-1), then at the piece in it (1); the tail up at its tin filled. */
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
export function feastOf(customer: Customer, lengths: readonly number[], taste: Taste | null, show: Show | null, sticksOut = false, sentOff = false, fruits: readonly Fruit[] = [], sides: readonly number[] = []): Feast {
  const whole = WHOLE[customer.fruit]
  const bites = show ? show.bites : lengths.length
  const lumps: Feast['lumps'] = []
  const first = taste && taste.who === 'twins' ? taste.first : null
  // The twins, given two pieces of one length, one each, eat in step: both pieces go down together. Everyone else eats one piece after another.
  const inStep = taste !== null && taste.who === 'twins' && taste.liked
  lengths.forEach((length, index) => {
    if (inStep ? bites <= 0 : bites <= index) return
    // Which twin it is inside: the one whose side of the tin it lay in. What the pair is given with no tin (one who waits) goes to each in turn.
    lumps.push({ at: Math.min(1, inStep ? bites / lengths.length : bites - index), size: Math.min(2, length / whole), fruit: fruits[index] ?? customer.fruit, twin: (sides[index] ?? (first !== null ? (index < first ? 0 : 1) : index % 2)) === 0 ? 0 : 1 })
  })
  const feast: Feast = { lumps, mouth: 0, eater: -1, hop: 0, shrug: 0, pull: 0, rope: 0, spin: 0, flat: [], cross2: [], cross: 0, gaze: 0, tail: 0, sneeze: -1, pleased: 0 }
  if (!show || show.kind !== 'serve') return feast
  const biting = bites - Math.floor(bites)
  feast.mouth = Math.max(bites < lengths.length ? bump(biting) : 0, sticksOut && show.lift > 0 ? 0.4 : 0)
  feast.shrug = sentOff ? bump(show.lid) : 0
  if (taste && taste.who === 'twins') {
    // In step, both mouths open for the one bite; otherwise only the twin whose piece it is opens its mouth.
    feast.eater = taste.liked ? -1 : Math.floor(bites) < taste.first ? 0 : 1
    if (taste.liked) feast.mouth = bites < lengths.length ? bump(bites / lengths.length) : 0
  }
  // Given the smaller share, the cat looks at the gap in its tin as the lid comes down on it, and then at the child's piece as the tin is
  // lifted: both while the piece still lies in the tin, before a bite is taken.
  if (taste && taste.who === 'cat' && taste.gaveSmaller && bites <= 0) feast.gaze = show.lift > 0 ? Math.min(1, show.lift * 3) : -Math.min(1, show.lid * 3)
  if (!taste || show.taste <= 0) return feast
  const t = show.taste, easing = 1 - show.settle
  switch (taste.who) {
    case 'pelican':
      feast.hop = taste.hiccups > 0 ? 7 * Math.abs(Math.sin(t * Math.PI * taste.hiccups)) * easing : 0
      feast.pleased = taste.liked ? bump(t) : 0
      break
    case 'twins':
      feast.pull = taste.pulled === null ? 0 : (taste.pulled === 0 ? 1 : -1) * Math.sin(t * Math.PI * 6) * easing
      // The rope is the longer twin's share, at its own length: half of all they were given and half of what one has over the other.
      feast.rope = taste.pulled === null ? 0 : (lengths.reduce((sum, length) => sum + length, 0) + Math.abs(taste.by)) / 2 / whole
      // Two whole turns, so it comes to rest the right way up.
      feast.spin = taste.pulled === null ? 0 : t * Math.PI * 4
      feast.pleased = taste.liked ? bump(t) : 0
      break
    case 'ants': {
      const count = wantedCount(customer)
      // Each flattened ant goes down in its turn along the file, lies flat, and peels itself up.
      const since = (ant: number): number => t - flatAt(taste.flattened.indexOf(ant), taste.flattened.length)
      feast.flat = Array.from({ length: count }, (_, ant) => (taste.flattened.includes(ant) && since(ant) >= 0 ? (since(ant) < PEELS_AFTER ? 1 : Math.max(0, 1 - (since(ant) - PEELS_AFTER) / 0.15)) : 0))
      // Peeled up, it is cross, and stays so until the file has settled.
      feast.cross2 = Array.from({ length: count }, (_, ant) => (taste.flattened.includes(ant) && since(ant) >= PEELS_AFTER + 0.15 ? easing : 0))
      feast.pleased = taste.liked ? bump(t) : 0
      break
    }
    case 'cat':
      feast.cross = taste.crossEyed ? bump(t) : 0
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
 * When in a taste each thing happens, as a share of the taste from 0 to 1: the scene sounds each of them at
 * the moment the body shows it, one sound for each, however many there are.
 */
/** The top of the pelican's hop for seam `k` of `seams`. */
export const hiccupAt = (k: number, seams: number): number => (k + 0.5) / seams
/** The flattened ants go down one after another along the file, and each peels itself up this long after it went down. */
export const flatAt = (k: number, flattened: number): number => (0.25 * k) / flattened
export const PEELS_AFTER = 0.6
/** Sneeze `k` of `sneezes` sets off down the boa. */
export const sneezeAt = (k: number, sneezes: number): number => k / sneezes

/**
 * What shows of a served customer on its way out, `away` of the way gone: the pieces it ate, at rest, and the
 * pelican still hiccuping once for every seam, all the way out.
 */
export function leavingFeast(customer: Customer, lengths: readonly number[], away: number, fruits: readonly Fruit[] = [], sides: readonly number[] = []): Feast {
  const feast = feastOf(customer, lengths, null, null, false, false, fruits, sides)
  if (customer.who === 'pelican' && lengths.length > 1) feast.hop = 7 * Math.abs(Math.sin(away * Math.PI * (lengths.length - 1)))
  return feast
}

/** How many ants stand in the file: one for each part of the order. */
export function wantedCount(customer: Customer): number {
  return Math.max(...customer.shares.map((share) => share.num))
}
