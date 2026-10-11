import { STAGE } from './stage'

// Where everything on the table stands, in stage units. The table is seen
// from above: the ball rolls "down" it towards the drum-skin floor at the
// bottom of the frame. Nothing here draws; the rules and the view both read it.

/** The playing field between the two chrome rails, under the roof rail and over the drum-skin floor. */
export const FIELD = { left: 262, right: 918, roof: 100, floor: 772 } as const

export const BALL_R = 17

/** The bumper stands on the drum skin and slides along it. Its top is where a ball lands; its sides knock a low ball along. */
export const BUMPER = { half: 74, top: 676, minX: FIELD.left + 74, maxX: FIELD.right - 74 } as const

/**
 * The bumper's shape, which is the one it is painted with and the one a ball meets: a cap of rubber with round
 * ends, as wide as the bumper, on a narrower chrome stem that stands on the drum skin.
 */
export const BUMPER_SHAPE = { capH: 36, capRound: 17, stemHalf: 52 } as const

/**
 * How far from the bumper's middle the middle of a ball at height `y` is kept when the bumper's side meets it:
 * against the round end of the cap, and under the cap against the stem. A low ball rolls in under the cap's
 * overhang until it touches the stem, so no ball is pushed across air.
 */
export function bumperReach(y: number): number {
  const shape = BUMPER_SHAPE
  const off = Math.max(BUMPER.top + shape.capRound - y, y - (BUMPER.top + shape.capH - shape.capRound), 0)
  const far = shape.capRound + BALL_R
  const cap = off < far ? BUMPER.half - shape.capRound + Math.sqrt(far * far - off * off) : 0
  const stem = y + BALL_R > BUMPER.top + shape.capH ? shape.stemHalf + BALL_R : 0
  return Math.max(cap, stem)
}

/**
 * The wall: three rows of six places, the first row at the top. A ball fits between the roof and a jelly that has
 * swollen in the top row. The rows are laid well apart, each brick on its own strip of board: a place is 84 by 74,
 * so that on a tablet held upright, where the stage is shown at about two thirds of its size, a brick's own
 * share of the surface is still 48 px each way. The gap between two rows is narrower than the ball.
 */
export const WALL = { cols: 6, rows: 3, cellW: 84, cellH: 74, brickW: 78, brickH: 42, left: 338, top: 190 } as const
export const PLACES = WALL.cols * WALL.rows

export type Box = { x: number; y: number; w: number; h: number }

export const colOf = (place: number): number => place % WALL.cols
export const rowOf = (place: number): number => Math.floor(place / WALL.cols)
/** Rows counted from the foot of the wall, for the notes: 0 is the lowest row. */
export const rowFromFoot = (place: number): number => WALL.rows - 1 - rowOf(place)

/** The box of the brick in a place of the wall, as it is drawn and as the ball meets it. */
export function brickBox(place: number): Box {
  const col = colOf(place), row = rowOf(place)
  return {
    x: WALL.left + col * WALL.cellW + (WALL.cellW - WALL.brickW) / 2,
    y: WALL.top + row * WALL.cellH + (WALL.cellH - WALL.brickH) / 2,
    w: WALL.brickW,
    h: WALL.brickH,
  }
}

/** How far up a swollen jelly stands over its own box: it is twice the size, and all of the growth is upwards. */
export const SWELL = WALL.brickH - 4

/**
 * The tray: a trough of sand set into the board along the foot of the wall, under a clear cover that is level
 * with the board. What has fallen lies in the sand, below the surface the ball rolls on, so the ball crosses the
 * cover and touches nothing in the tray. The sand is there from the first frame: the tray is never an empty box.
 */
export const TRAY: Box = { x: WALL.left - 6, y: WALL.top + WALL.rows * WALL.cellH + 10, w: WALL.cols * WALL.cellW + 12, h: 56 }

/** A fallen piece is painted at this size and lies in the tray at `LIE` of it. */
export const SLOT = { w: 52, h: 24 } as const
export const LIE = 0.75
/** How the bricks that fall from one column tumble onto each other: each one's offset from the middle of its heap, and its lean. */
const TUMBLE: readonly (readonly [number, number, number])[] = [[-9, 6, -0.2], [10, -7, 0.26], [-2, -1, -0.08], [8, 8, 0.32], [-10, -8, 0.14], [1, 3, -0.3]]
/** No two heaps stand a like step apart or on a like line: where the heap under each column lies, off the column's middle. */
const HEAP_AT: readonly (readonly [number, number])[] = [[-5, 2], [7, -3], [-8, 1], [2, 3], [8, -2], [-6, -3]]
/**
 * Where a fallen brick lies: in the sand under the column it fell from, tumbled onto those that fell there before
 * it. `nth` counts the bricks that fell from that column, from 0. There are no slots and no order from left to
 * right: a brick lies where it fell, the heaps under two columns never touch, and sand shows between them
 * whatever has fallen.
 */
export function heapSpot(col: number, nth: number): { x: number; y: number; lean: number } {
  const [dx, dy, lean] = TUMBLE[nth % TUMBLE.length]
  const [hx, hy] = HEAP_AT[col % HEAP_AT.length]
  // A column that has shed more than the tumble holds starts over a little higher up the heap.
  const lap = (Math.floor(nth / TUMBLE.length) % 2) * 2
  return { x: WALL.left + col * WALL.cellW + WALL.cellW / 2 + hx + dx, y: TRAY.y + TRAY.h / 2 + hy + dy - lap, lean }
}

/**
 * The lane a seed's vine grows in: the first column of the wall, which a wall with a seed keeps empty. The seed
 * stands in the second column, beside it. A short vine reaches one brick above the seed's row; a tall one reaches
 * the roof.
 */
export const LANE = { col: 0, seedCol: 1, x: WALL.left + WALL.cellW / 2, half: WALL.cellW / 2 - 4, top: FIELD.roof + BALL_R + 5 } as const
/** Where a short vine on a seed in `row` lets the ball go: one brick above the middle of the seed's row. */
export const vineTop = (row: number): number => WALL.top + row * WALL.cellH + WALL.cellH / 2 - WALL.cellH
/** The foot of a vine on a seed in `row`: just under the foot of the seed. */
export const vineFoot = (row: number): number => WALL.top + row * WALL.cellH + (WALL.cellH + WALL.brickH) / 2 + 3
/**
 * How high the tip of the vine on a seed in `row` has got: `grow` is how far it has uncurled, from 0 to 1, and
 * `tall` how far it has shot on to the roof. The view draws the tip there, and a ball the vine lifts rides
 * `VINE_SEAT` under it: the ball is never above the vine that carries it.
 */
export function vineTip(row: number, grow: number, tall: number): number {
  const foot = vineFoot(row) - 6, short = Math.max(LANE.top, vineTop(row))
  const end = short + (LANE.top - short) * Math.max(0, Math.min(1, tall)) - VINE_SEAT
  return foot - 24 + (end - (foot - 24)) * Math.max(0, Math.min(1.05, grow))
}
export const VINE_SEAT = 12

/** Where each toy that can fetch a ball reaches from: the root of the dragon's tail and of the elephant's trunk. */
export const REACH = { dragon: { x: 166, y: 386 }, elephant: { x: 1050, y: 526 } } as const
/** Where the tip of the dragon's tail lies while it fetches nothing: curled round to its front. */
export const TAIL_HOME = { x: 200, y: 322 } as const

/** The bell hangs at the top of the right-hand lane, beside the wall. */
export const BELL = { x: 880, y: 140, r: 24 } as const

/** The folded wall waits on the apron above the roof rail, to the left of the middle and clear of the jam's home control. */
export const FOLDED: Box = { x: 318, y: 26, w: 210, h: 60 }

/** The jam's home control: a round button at the top centre, which nothing the child must touch may lie under. */
export const HOME = { x: STAGE.width / 2, y: 34, r: 24 } as const

/**
 * The three gates: each an opening in a side rail, held by the toy that stands there. A ball whose whole width is
 * inside the opening as it reaches the rail goes in. `mouth` is where the toy holds the ball, and `out` is where
 * the ball comes back onto the table.
 */
export const GATES = {
  dragon: { side: -1, y0: 158, y1: 266, mouth: { x: 214, y: 212 }, out: { x: FIELD.left + BALL_R + 4, y: 212 } },
  walrus: { side: -1, y0: 546, y1: 664, mouth: { x: 196, y: 664 }, out: { x: FIELD.left + BALL_R + 4, y: 600 } },
  elephant: { side: 1, y0: 404, y1: 536, mouth: { x: 968, y: 470 }, out: { x: FIELD.right - BALL_R - 4, y: 470 } },
} as const

/** The three large toys, each in its own panel beside the field. A finger inside a toy's box pokes it. */
export const TOYS = {
  dragon: { x: 6, y: 96, w: 250, h: 336 },
  walrus: { x: 6, y: 440, w: 250, h: 374 },
  elephant: { x: 924, y: 400, w: 250, h: 414 },
} as const satisfies Record<string, Box>
export type ToyName = keyof typeof TOYS
export const TOY_NAMES = ['dragon', 'walrus', 'elephant'] as const satisfies readonly ToyName[]

/** The ladybird walks the apron to the right of the home control and stops short of the grown-up's corner. */
export const LADYBIRD = { fromX: 660, toX: 1050, y: 62, r: 22 } as const

/** The jam's home control is 48 px round, 10 px from the top of the surface at its top centre; the grown-up corner is the top right 72 px. */
const HOME_PX = { r: 24, y: 34 } as const
const CORNER_PX = 72
/** A finger target is at least this many pixels each way, on any surface. */
export const TARGET_PX = 48

/** A brick's finger target reaches at least to the edge of its own place in the wall: a finger between two rows is on a brick, the nearer one. */
const OWN = { x: (WALL.cellW - WALL.brickW) / 2, y: (WALL.cellH - WALL.brickH) / 2 } as const

/**
 * What the surface the stage is fitted onto sets, in stage units. `padX` and `padY` are how far a brick's finger
 * target reaches past its drawn box: over its own place in the wall, and further where that is less than
 * `TARGET_PX` each way on that surface. `ladyFrom` to `ladyTo`
 * is the ladybird's walk: it starts clear of the home control, whatever the size, and stops short of the corner
 * where there is room to.
 */
export type Limits = { padX: number; padY: number; ladyFrom: number; ladyTo: number }

/** The limits of a stage shown at its own size. */
export const FULL_SIZE: Limits = { padX: OWN.x, padY: OWN.y, ladyFrom: LADYBIRD.fromX, ladyTo: LADYBIRD.toX }

export function limitsFor(width: number, height: number): Limits {
  if (!(width > 0) || !(height > 0)) return FULL_SIZE
  const scale = Math.min(width / STAGE.width, height / STAGE.height)
  const ox = (width - STAGE.width * scale) / 2, oy = (height - STAGE.height * scale) / 2
  const padX = Math.max(OWN.x, (TARGET_PX / scale - WALL.brickW) / 2), padY = Math.max(OWN.y, (TARGET_PX / scale - WALL.brickH) / 2)
  const clear = LADYBIRD.r + 14
  // The home control, in stage units. In a tall surface it lies in the band above the stage, clear of the walk.
  const home = { x: (width / 2 - ox) / scale, y: (HOME_PX.y - oy) / scale, r: HOME_PX.r / scale }
  const underHome = Math.abs(home.y - LADYBIRD.y) < home.r + clear
  const ladyFrom = underHome ? Math.max(LADYBIRD.fromX, home.x + home.r + clear + 4) : LADYBIRD.fromX
  const corner = { x: (width - CORNER_PX - ox) / scale, y: (CORNER_PX - oy) / scale }
  const inCorner = corner.y > LADYBIRD.y - clear
  const ladyTo = inCorner ? Math.min(LADYBIRD.toX, corner.x - clear - 4) : LADYBIRD.toX
  // Where there is no room for a walk it stands, clear of the home control.
  return { padX, padY, ladyFrom, ladyTo: Math.max(ladyFrom, ladyTo) }
}

/** Whether two boxes overlap by more than a hair. */
export function boxesCross(a: Box, b: Box, slack = 0.01): boolean {
  return a.x + a.w - slack > b.x && b.x + b.w - slack > a.x && a.y + a.h - slack > b.y && b.y + b.h - slack > a.y
}

export function inBox(x: number, y: number, box: Box, pad = 0): boolean {
  return x >= box.x - pad && x <= box.x + box.w + pad && y >= box.y - pad && y <= box.y + box.h + pad
}

export { STAGE }
