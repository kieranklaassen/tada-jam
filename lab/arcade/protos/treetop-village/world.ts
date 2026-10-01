// Where everything in the oak is: the limbs, the places a platform can settle,
// the ways a ladder or a bridge can run, the hollows, and the twigs a string
// can hang from. Pure numbers, shared by the paper and by the play.

export type Pt = [number, number]

// Where feet stand on the meadow.
export const GROUND = 672
export const TRUNK = 650
// Half the width of a platform.
export const HW = 75
// A platform's corner posts rise this far above its deck.
export const POST = 54

export const SUN = { x: 98, top: 122, r: 44 }

export interface Limb {
  p0: Pt
  c: Pt
  p1: Pt
  w0: number
  w1: number
}

// The six bearing limbs first (A B C D F G), then the crown fork and a few
// that only hold leaves.
export const LIMBS: Limb[] = [
  { p0: [606, 604], c: [455, 592], p1: [258, 556], w0: 62, w1: 20 },
  { p0: [694, 600], c: [850, 588], p1: [1046, 548], w0: 62, w1: 20 },
  { p0: [606, 486], c: [420, 438], p1: [160, 420], w0: 56, w1: 16 },
  { p0: [694, 478], c: [900, 430], p1: [1152, 408], w0: 56, w1: 16 },
  { p0: [622, 358], c: [520, 298], p1: [330, 276], w0: 46, w1: 14 },
  { p0: [678, 350], c: [790, 290], p1: [974, 266], w0: 46, w1: 14 },
  { p0: [634, 200], c: [604, 120], p1: [540, 26], w0: 34, w1: 12 },
  { p0: [666, 200], c: [700, 120], p1: [762, 22], w0: 34, w1: 12 },
  { p0: [900, 286], c: [960, 250], p1: [1012, 200], w0: 15, w1: 8 },
  { p0: [430, 290], c: [360, 230], p1: [296, 150], w0: 15, w1: 7 },
  { p0: [560, 110], c: [470, 90], p1: [400, 40], w0: 14, w1: 6 },
  { p0: [742, 100], c: [840, 80], p1: [920, 36], w0: 14, w1: 6 },
  { p0: [1010, 420], c: [1080, 370], p1: [1120, 300], w0: 14, w1: 6 },
]

export function limbAt(l: Limb, t: number): { x: number; y: number; w: number } {
  const u = 1 - t
  return {
    x: u * u * l.p0[0] + 2 * u * t * l.c[0] + t * t * l.p1[0],
    y: u * u * l.p0[1] + 2 * u * t * l.c[1] + t * t * l.p1[1],
    w: l.w0 + (l.w1 - l.w0) * t,
  }
}

// The top of a limb at a given x (its x runs one way, so a bisection finds it).
export function limbTop(l: Limb, x: number): number {
  let lo = 0
  let hi = 1
  const rising = l.p1[0] > l.p0[0]
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const here = limbAt(l, mid).x
    if (here < x === rising) lo = mid
    else hi = mid
  }
  const at = limbAt(l, (lo + hi) / 2)
  return at.y - at.w / 2
}

// The trunk's half width at a height.
export function trunkHalf(y: number): number {
  const stops: Pt[] = [
    [150, 34],
    [200, 42],
    [300, 50],
    [400, 58],
    [500, 68],
    [600, 82],
    [680, 104],
    [760, 124],
  ]
  if (y <= stops[0]![0]) return stops[0]![1]
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]!
    const b = stops[i]!
    if (y <= b[0]) return a[1] + ((b[1] - a[1]) * (y - a[0])) / (b[0] - a[0])
  }
  return stops[stops.length - 1]![1]
}

export interface Seat {
  x: number
  // The top of a deck that has settled here.
  y: number
}

const onLimb = (limb: number, x: number): Seat => ({ x, y: Math.round(limbTop(LIMBS[limb]!, x) - 11) })

// A B C D on the low and middle limbs, E a deck round the trunk, F G high, H
// the crow's nest in the fork.
export const SEATS: Seat[] = [onLimb(0, 410), onLimb(1, 890), onLimb(2, 255), onLimb(3, 1045), { x: TRUNK, y: 428 }, onLimb(4, 455), onLimb(5, 850), { x: TRUNK, y: 134 }]

// A ladder's foot stands on `lo` (the meadow is -1) at bx and its head rests on
// seat `hi` at tx.
export interface LadderWay {
  lo: number
  hi: number
  bx: number
  tx: number
}

export const LADDERS: LadderWay[] = [
  { lo: -1, hi: 0, bx: 352, tx: 380 },
  { lo: -1, hi: 1, bx: 950, tx: 922 },
  { lo: 0, hi: 2, bx: 356, tx: 304 },
  { lo: 0, hi: 4, bx: 470, tx: 588 },
  { lo: 1, hi: 4, bx: 830, tx: 712 },
  { lo: 1, hi: 3, bx: 944, tx: 996 },
  { lo: 2, hi: 5, bx: 312, tx: 398 },
  { lo: 4, hi: 5, bx: 604, tx: 498 },
  { lo: 4, hi: 6, bx: 696, tx: 806 },
  { lo: 3, hi: 6, bx: 988, tx: 906 },
  { lo: 5, hi: 7, bx: 520, tx: 592 },
  { lo: 6, hi: 7, bx: 782, tx: 708 },
]

// A rope bridge runs from the right end of `a` to the left end of `b`.
export const BRIDGES: { a: number; b: number }[] = [
  { a: 2, b: 4 },
  { a: 4, b: 3 },
  { a: 5, b: 6 },
]

// Hollows in the trunk. `node` is where someone stepping out would stand
// (-1 the meadow, a seat, or -2 for nowhere: the top one is only a window).
export const HOLLOWS: { x: number; y: number; node: number }[] = [
  { x: TRUNK, y: 612, node: -1 },
  { x: TRUNK, y: 372, node: 4 },
  { x: TRUNK, y: 244, node: -2 },
]
export const DOOR_R = 31

// Little forked twigs a lantern string can be tied to: where each grows from
// (on a limb, or the side of the trunk) and where its fork is.
function limbStub(limb: number, x: number): [Pt, Pt] {
  const y = limbTop(LIMBS[limb]!, x)
  return [
    [x, y + 4],
    [x, y - 24],
  ]
}
function trunkStub(side: number, y: number): [Pt, Pt] {
  const x = TRUNK + side * (trunkHalf(y) - 3)
  return [
    [x, y],
    [x + side * 24, y - 18],
  ]
}
export const STUB_TWIGS: [Pt, Pt][] = [
  limbStub(0, 282),
  limbStub(1, 1022),
  limbStub(2, 178),
  limbStub(3, 1136),
  limbStub(4, 348),
  limbStub(5, 956),
  [
    [548, 40],
    [540, 18],
  ],
  [
    [754, 36],
    [764, 14],
  ],
  trunkStub(-1, 524),
  trunkStub(1, 520),
  trunkStub(-1, 302),
  trunkStub(1, 298),
  [
    [302, 160],
    [294, 138],
  ],
]
export const STUBS: Pt[] = STUB_TWIGS.map((s) => s[1])

// Where a swing can hang: under the far ends of the two middle limbs.
export const HOOKS: Pt[] = [
  [196, Math.round(limbTop(LIMBS[2]!, 196) + 20)],
  [1106, Math.round(limbTop(LIMBS[3]!, 1106) + 20)],
]

// Leaf clumps the folk peek out from.
export const PEEKS: Pt[] = [
  [286, 216],
  [508, 98],
  [800, 94],
  [1122, 294],
]

// The owl's own twig.
export const OWL_PERCH: Pt = [1010, 200]

// The hills behind, as heights. The sun goes down behind the far one.
export const farHill = (x: number): number => 476 - 30 * Math.cos((x - 98) / 190) + 8 * Math.sin(x / 61 + 2)
// A paler ridge behind it; the sun is gone when it is below both.
export const backRidge = (x: number): number => farHill(x) - 22 + 16 * Math.sin(x / 130 + 4)
export const ridgeTop = (x: number): number => Math.min(farHill(x), backRidge(x))
export const nearHill = (x: number): number => 552 + 18 * Math.sin(x / 170 + 0.6) + 7 * Math.sin(x / 53)
export const groundTop = (x: number): number => 656 + 5 * Math.sin(x / 150 + 1) + 2 * Math.sin(x / 47)

export function bridgeEnds(i: number): [Pt, Pt] {
  const way = BRIDGES[i]!
  const a = SEATS[way.a]!
  const b = SEATS[way.b]!
  return [
    [a.x + HW - 2, a.y + 3],
    [b.x - HW + 2, b.y + 3],
  ]
}

export const postTop = (seat: number, side: number): Pt => [SEATS[seat]!.x + side * (HW - 6), SEATS[seat]!.y - POST]
