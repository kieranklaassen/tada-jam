// The small marks of the look that a reader could take for a numeral, a
// letter or a sign if they were drawn evenly: stripes, creases, knots, a
// puddle and shut eyes. Their geometry is here, apart from the drawing, so
// that a test can hold each of them uneven.

/** A short bowed stroke: from, through, to (a quadratic curve), and how wide the pencil is. */
export type Stroke = { points: readonly [number, number, number, number, number, number]; width: number }

/**
 * The stripes of the fat one's nightcap. Each runs across the cap where it lies, from the band up to the cap's
 * upper edge, so they fan round with the cap's curve and the last lies across its hanging tail. No two are alike
 * in length, in width or in how far apart they are.
 */
export const CAP_STRIPES: readonly Stroke[] = [
  { points: [-38, -6, -41, -16, -36, -26], width: 5 },
  { points: [-9, -6, -6, -27, 5, -43], width: 3.4 },
  { points: [31, -5, 44, -15, 49, -31], width: 4.4 },
  { points: [63, 10, 73, 1, 87, 1], width: 3 },
]

/** The two creases of the ghost hand's folded fingers: one long and bowed one way, one short and bowed the other. */
export const HAND_CREASES: readonly Stroke[] = [
  { points: [9, 43, 14, 52, 10, 62], width: 2.2 },
  { points: [20, 48, 18, 53, 23, 57], width: 1.6 },
]

/**
 * The two marks in the hollow's back wall. One is a knot: a big drop shape, pointed at one end, with the grain
 * bending round it. The other is the stub of a broken branch: small and angular. They are not two like ovals.
 * The grain by the knot is drawn as curves through three points, each bowed well off its chord: a short level
 * stroke alone on a wall is a dash.
 */
export const WALL_MARKS: { knot: readonly number[]; stub: readonly number[]; grain: readonly (readonly number[])[] } = {
  knot: [484, 384, 507, 359, 529, 357, 538, 371, 526, 384, 505, 382],
  stub: [693, 349, 705, 343, 715, 352, 709, 365, 698, 360],
  grain: [[480, 366, 512, 348, 548, 364]],
}

/** How far along a spill each point of its edge lies, how far the water bulges down there and how far it stands up. */
const PUDDLE = [
  [0, 0, 0], [0.06, 5, 1.5], [0.19, 13, 3], [0.26, 4, 1.5], [0.45, 14, 5], [0.53, 19, 2.5], [0.72, 5, 4.5], [0.8, 12, 2], [0.94, 3, 1.5], [1, 0, 0],
] as const

/**
 * The outline of the water a bath has spilt, as one closed run of points for a soft-cornered shape: one puddle
 * from end to end, thick in some places and thin in others, its lobes of different lengths. It is not a row of
 * like strokes.
 */
export function puddle(from: number, to: number, y: number): number[] {
  const span = to - from
  const upper = PUDDLE.map(([along, , up]) => [from + span * along, y - 2 - up])
  const lower = PUDDLE.slice(1, -1).reverse().map(([along, down]) => [from + span * along, y + down])
  return [...upper, ...lower].flat()
}

/** From how far shut an eye is drawn as a lash: before that it is an open eye, never so low that it is a bar. */
export const SHUT_FROM = 0.7

/**
 * A shut eye: a lash that bows down, its outer end lower than its inner end, from the eye's middle. `inner` is
 * 1 where the nose lies to the right of the eye and -1 where it lies to the left, so the two lashes of a face
 * mirror each other and neither is level.
 */
export function lash(r: number, inner: 1 | -1): Stroke['points'] {
  return [-inner * r, r * 0.3, -inner * r * 0.1, r * 1.1, inner * r, -r * 0.2]
}

/** An eye as it is drawn for how far its lid is down: open, with how high its white stands, or shut. */
export function eyeFor(r: number, lid: number): { shut: true } | { shut: false; rx: number; ry: number } {
  return lid >= SHUT_FROM ? { shut: true } : { shut: false, rx: r, ry: r * (1 - lid) }
}

/**
 * The twigs, each its own: how its stem bends (its outline, from the foot up and down again), its side shoots as
 * bent lines with the pencil's width, its knot and its scar, and how it splinters where the fat one snaps it. No
 * two stand alike, so two posts side by side are never a pair of like strokes. Every stem carries at the same
 * height and takes the same room: only what a child sees differs.
 */
export type TwigLook = {
  stem: readonly number[]
  shoots: readonly { points: readonly number[]; width: number }[]
  marks: readonly (readonly number[])[]
  /** The stem snapped: the foot as it was, and a splintered top of its own. */
  stump: readonly number[]
}
/** The heights a stem is given at, from the foot to the tip, and how thick it is there: thick at the foot, thin at the tip. */
const STEM_AT = [0, -30, -60, -90, -116] as const
const STEM_HALF = [6, 5, 4.5, 4, 3.5] as const

/** A stem's outline from where its middle lies at each height: up its right side and down its left. */
function stemOf(spine: readonly number[]): number[] {
  const right = STEM_AT.map((y, i) => [spine[i] + STEM_HALF[i], y]), left = STEM_AT.map((y, i) => [spine[i] - STEM_HALF[i], y])
  return [left[0], ...right, ...left.slice(1).reverse()].flat()
}

/** A stump's outline: the foot of the stem, and the splinters it broke into, from right to left. */
function stumpOf(spine: readonly number[], splinters: readonly number[]): number[] {
  return [spine[0] - STEM_HALF[0], 0, spine[0] + STEM_HALF[0], 0, spine[1] + STEM_HALF[1], -30, ...splinters, spine[1] - STEM_HALF[1], -30]
}

const twigLook = (spine: readonly number[], shoots: TwigLook['shoots'], marks: TwigLook['marks'], splinters: readonly number[]): TwigLook => ({ stem: stemOf(spine), shoots, marks, stump: stumpOf(spine, splinters) })

export const TWIGS: readonly TwigLook[] = [
  // Bowed to the right, with one long shoot high on the right.
  twigLook([0, 2, 2.5, 1.5, 0.5], [{ points: [5, -66, 12, -76, 19, -90], width: 4 }], [[-1, -50, 2, -54, 5, -52], [0, -20, 4, -27]], [6, -52, 3, -46, 1, -58, -2, -48, -5, -55]),
  // Bowed to the left, with a short stub low on the left and a bud under the tip.
  twigLook([1, -1.5, -2, -1.5, 1.5], [{ points: [-5, -30, -13, -35, -16, -45], width: 3.4 }, { points: [3, -100, 8, -104], width: 3 }], [[-4, -70, -1, -75, 1, -71], [0, -12, 2, -17, 0, -22]], [3, -50, 1, -57, -1, -47, -4, -53, -6, -44]),
  // Straight, forked: a long shoot on the left, halfway up.
  twigLook([0, 0, 0.5, 0, -0.5], [{ points: [-4, -58, -11, -70, -14, -86, -19, -94], width: 3.8 }], [[0, -94, 2, -98], [-3, -30, 1, -33, 3, -40]], [5, -49, 2, -56, 0, -45, -3, -58, -5, -50]),
  // A dog-leg: it steps to the right halfway up, with two small shoots, one each side.
  twigLook([-0.5, -1.5, 1.5, 2.5, 2.5], [{ points: [4, -22, 11, -27, 13, -37], width: 3 }, { points: [-1, -86, -8, -93, -9, -103], width: 3.2 }], [[-3, -40, 0, -43], [2, -76, 5, -80, 3, -85]], [5, -47, 3, -55, 0, -49, -2, -57, -4, -46]),
]

/** The bristles of the tiny one's scrubbing brush, from the brush's back: where each stands, how long it is and how it leans. A used brush, not a comb: no two are as long, and no two gaps beside each other are as wide. */
export const BRUSH_BRISTLES: readonly (readonly [number, number, number])[] = [
  [-16, 11, -3], [-12, 15, 0], [-5, 9, 2], [-2, 13, -1], [6, 7, 3], [10, 14, -2], [16, 10, 2],
]

/** The fringe at the hanging end of the tiny one's towel: where each thread hangs, how long it is and how it leans. */
export const TOWEL_FRINGE: readonly (readonly [number, number, number])[] = [[4, 5, -1], [8, 10, 1], [15, 7, 2]]

/**
 * The far birds that go up off the hill: where each starts beside the touch, how high over the hill's top, how long
 * its wings are, how fast it rises and which way its wings are bent. A scatter, not a row: no two as high, as large
 * or as far apart, and they do not rise together.
 */
export const FAR_BIRDS: readonly (readonly [number, number, number, number, number])[] = [
  [-18, 4, 3, 20, -1.5], [-9, 15, 6, 31, 2], [4, 8, 4.5, 24, -2.5], [20, 23, 7.5, 38, 1],
]
