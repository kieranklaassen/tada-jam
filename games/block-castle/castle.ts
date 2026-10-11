import { hitBox, type Box, type Ray } from './aim'
import { COLS, ROWS, SHAPE, settle, slopeFaces, type Kind, type Placed, type Standing } from './blocks'
import { BELL, BODY, FOLK, HALF_LEVEL, RUG, SIZE, backFor, cameraFor, placeX, placeZ, screenAt, standAt, type Who } from './layout'

// The evening castle, worked out from the rug alone. Pure: no renderer, no
// clock, no chance. From the list of blocks it says what each block has
// become, and where each of the folk comes to rest by his fixed taste
// (ART.md, "The characters and their fixed tastes"). Nothing here is saved:
// it all follows from the saved list.
//
// The folk stay the size they are, too big for anything a child builds. So
// each rule of taste also asks two things of a place before one of them takes
// it: that he passes through no block there, and that he leaves in view the
// part of every castle thing that answers a tap.

/** The half-round hole of an arch, as the block is sawn: its radius, and how high its straight legs stand. */
export const HOLE = { round: 0.56, legs: 0.26 }
/** How far out from the middle of its arch a gate's grille hangs, toward the child. */
export const GRILLE_OUT = 0.16
/** How far the dragon pulls his head back from under a grille, in his own units. */
export const NOSE_TUCK = 0.62

export type Bar = { x: number; y: number; z: number; wide: number; tall: number; deep: number }

/**
 * The iron of a gate's grille when it is `down` (0 drawn up into the arch,
 * 1 on the ground): five upright bars hung from the round of the hole, and
 * the cross bars the uprights have reached. Each is a box by its middle.
 */
export function grilleBars(thing: { x: number; base: number; z: number }, down: number): Bar[] {
  const bars: Bar[] = []
  const z = thing.z + GRILLE_OUT
  let lowest = Infinity
  for (let k = -2; k <= 2; k++) {
    const x = k * 0.21
    const top = HOLE.legs + Math.sqrt(HOLE.round * HOLE.round - x * x) - 0.03
    const long = top * down
    lowest = Math.min(lowest, top - long)
    bars.push({ x: thing.x + x, y: thing.base + top - long / 2, z, wide: 0.05, tall: long, deep: 0.05 })
  }
  for (const bar of [0.2, 0.46]) {
    if (bar < lowest + 0.03) continue
    const half = bar <= HOLE.legs ? HOLE.round : Math.sqrt(HOLE.round * HOLE.round - (bar - HOLE.legs) ** 2)
    bars.push({ x: thing.x, y: thing.base + bar, z, wide: half * 2 - 0.08, tall: 0.05, deep: 0.04 })
  }
  return bars
}

export type What = 'bridge' | 'gate' | 'tower' | 'pole' | 'room' | 'slide'

export const BECOMES: Record<Kind, What> = { long: 'bridge', arch: 'gate', round: 'tower', thin: 'pole', cube: 'room', slope: 'slide' }

/** How high a tower's roof stands over its top, in world units. */
export const ROOF = 0.7
/** How long a flag is where it has room, and where it has none; how deep it hangs; and how far down its pole it can run. */
export const FLAG = { long: 0.62, short: 0.34, deep: 0.36, run: 1.2 }
/** How thick the boards of a bridge lie on its block. */
export const BOARDS = 0.03

export type Thing = Standing & {
  /** Its place in the saved list. */
  index: number
  what: What
  /** Something stands on it. A tower then has battlements and no roof. */
  covered: boolean
  /** The same for each place it lies over, from its left: a bridge has whole boards where nothing stands on it. */
  coveredAt: boolean[]
  /** The middle of its foot, and its top, in world units. */
  x: number
  z: number
  base: number
  top: number
  /** The highest point of it as a castle thing: the tip of a roof, otherwise its top. */
  crown: number
  /** A slide: the side its toe is on. A flag: the side it flies to. Otherwise 0. */
  side: -1 | 0 | 1
  /** A flag: how long it is, and how far down the pole it can run before it meets what stands beside it. */
  flag: number
  run: number
  /** A bridge: whether its left and right ends hang in the air. */
  airLeft: boolean
  airRight: boolean
  /**
   * A bridge with an end in the air is a springboard: where along the room's
   * width it turns as that end dips, which is the near edge of the nearest
   * place that holds it up.
   */
  pivotLeft: number
  pivotRight: number
}

const cell = (col: number, row: number): number => row * COLS + col

/** The top of each place of the rug in world units, row by row, without what the evening adds. */
function plainTops(standing: readonly Standing[]): number[] {
  const tops = new Array<number>(COLS * ROWS).fill(0)
  for (const block of standing) for (let i = 0; i < SHAPE[block.kind].wide; i++) {
    const at = cell(block.col + i, block.row)
    tops[at] = Math.max(tops[at], (block.level + SHAPE[block.kind].high) * HALF_LEVEL)
  }
  return tops
}

/** What each block of the rug becomes in the evening. */
export function things(placed: readonly Placed[]): Thing[] {
  const standing = settle(placed)
  const tops = plainTops(standing)
  return standing.map((block, index) => {
    const shape = SHAPE[block.kind]
    const [x, , z] = standAt(block.kind, block.col, block.row, 0)
    const base = block.level * HALF_LEVEL, top = (block.level + shape.high) * HALF_LEVEL
    const coveredAt: boolean[] = []
    for (let i = 0; i < shape.wide; i++) coveredAt.push(tops[cell(block.col + i, block.row)] > top + 1e-6)
    const covered = coveredAt.some(Boolean)
    const what = BECOMES[block.kind]
    let side: -1 | 0 | 1 = 0
    let flag = 0
    let run = 0
    if (what === 'slide') side = slopeFaces(block.col) === 'left' ? -1 : 1
    if (what === 'pole') {
      // The flag flies to the side that has room for it at the height it hangs, the right first.
      const room = (to: number): boolean => block.col + to < 0 || block.col + to >= COLS || tops[cell(block.col + to, block.row)] <= top - FLAG.deep - 0.1
      side = room(1) ? 1 : room(-1) ? -1 : 1
      flag = room(1) || room(-1) ? FLAG.long : FLAG.short
      const over = block.col + side
      const beside = over >= 0 && over < COLS ? tops[cell(over, block.row)] : 0
      // A short flag reaches over no other place; a long one runs down only as far as what stands beside its pole.
      run = flag === FLAG.short ? FLAG.run : Math.max(0.1, Math.min(FLAG.run, top - FLAG.deep - 0.1 - beside))
    }
    // An end of a bridge hangs in the air when nothing reaches up to it there.
    const under = (col: number): boolean => standing.some((other, i) => i !== index && other.row === block.row && col >= other.col && col < other.col + SHAPE[other.kind].wide && (other.level + SHAPE[other.kind].high) === block.level)
    const airLeft = what === 'bridge' && block.level > 0 && !under(block.col)
    const airRight = what === 'bridge' && block.level > 0 && !under(block.col + shape.wide - 1)
    const held = [0, 1, 2].filter((i) => what === 'bridge' && under(block.col + i))
    const pivotLeft = held.length ? placeX(block.col + held[0]) - 0.5 : x
    const pivotRight = held.length ? placeX(block.col + held[held.length - 1]) + 0.5 : x
    return { ...block, index, what, covered, coveredAt, x, z, base, top, crown: what === 'tower' && !covered ? top + ROOF : what === 'bridge' && !covered ? top + BOARDS : top, side, flag, run, airLeft, airRight, pivotLeft, pivotRight }
  })
}

/** The top of each place of the rug in the evening, in world units: the blocks and what stands on them now (a roof). */
export function eveningTops(all: readonly Thing[]): number[] {
  const tops = new Array<number>(COLS * ROWS).fill(0)
  for (const thing of all) for (let i = 0; i < SHAPE[thing.kind].wide; i++) {
    const at = cell(thing.col + i, thing.row)
    tops[at] = Math.max(tops[at], thing.crown)
    // A bridge with a block on it has whole boards over each place where nothing stands on it.
    if (thing.what === 'bridge' && !thing.coveredAt[i]) tops[at] = Math.max(tops[at], thing.top + BOARDS)
  }
  // A long flag flies out over the place beside its pole: nothing can stand there below its tip.
  for (const thing of all) {
    const over = thing.col + thing.side
    if (thing.what === 'pole' && thing.flag === FLAG.long && over >= 0 && over < COLS) tops[cell(over, thing.row)] = Math.max(tops[cell(over, thing.row)], thing.top)
  }
  return tops
}

/** The highest top among the places a body standing over this stretch of floor would touch: the height at which it is clear of everything. */
export function clearOver(tops: readonly number[], x0: number, x1: number, z0: number, z1: number): number {
  let high = 0
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const x = placeX(col), z = placeZ(row)
    // A block reaches a little under half a place from the middle of its place.
    if (x + 0.46 <= x0 || x - 0.46 >= x1 || z + 0.46 <= z0 || z - 0.46 >= z1) continue
    high = Math.max(high, tops[cell(col, row)])
  }
  return high
}

/** How many boards lie along a bridge. */
export const SLATS = 9

/** One board of a bridge, or one end of a board that sticks out from under a block: its middle and its size, and which board along the bridge it is. */
export type Board = { slat: number; x: number; y: number; z: number; wide: number; tall: number; deep: number }

/**
 * The boards of a bridge as they lie at rest. Every long one has them. Over
 * a place where nothing stands a board lies whole across the block; where a
 * block stands on the bridge there is no room under it, and the two ends of
 * the board stick out from under it, front and back.
 */
export function bridgeBoards(thing: Thing): Board[] {
  const [w, , d] = SIZE.long
  const boards: Board[] = []
  const wide = w / SLATS - 0.05, y = thing.top + BOARDS / 2
  for (let slat = 0; slat < SLATS; slat++) {
    const x = thing.x - w / 2 + (slat + 0.5) * (w / SLATS)
    // The place this board lies over: three boards to a place.
    const place = Math.min(thing.coveredAt.length - 1, Math.floor((slat * 3) / SLATS))
    if (!thing.coveredAt[place]) boards.push({ slat, x, y, z: thing.z, wide, tall: BOARDS, deep: d + 0.04 })
    else for (const side of [-1, 1]) boards.push({ slat, x, y, z: thing.z + side * BOARD_END.at, wide, tall: BOARDS, deep: BOARD_END.deep })
  }
  return boards
}

/** A board's end under a block: how far from the middle of the bridge its middle is, and how long it is. It starts past the widest block that can stand there and ends short of a block in the next row. */
const BOARD_END = { at: 0.5, deep: 0.06 }

// --- Where the folk rest ------------------------------------------------------

export type Rest = {
  who: Who
  /** The point he stands on (the king, the cook), or the point his shoulders lie at (the dragon). */
  at: [number, number, number]
  /**
   * How he is there. The king: on a `seat`, on the `dragon`, or at his `day`
   * place. The cook: with his head in a `window`, or in the `open` on his
   * stool. The dragon: with his nose under a `gate` or a `bridge`, or at his
   * `day` place.
   */
  how: 'seat' | 'dragon' | 'day' | 'window' | 'open' | 'gate' | 'bridge'
  /** The thing he rests on, in or under: its place in the list, or -1. */
  thing: number
  /** The cook: the side his head points to as he lies, -1 left or 1 right; otherwise 0. */
  lie: -1 | 0 | 1
  /** The cook: the room is up high, so he came with his eyes shut and his pot on his head. */
  high: boolean
  /**
   * The dragon: the line his body lies along, from his shoulders to past his
   * tail, as points in the room. He bends where it bends.
   */
  path: [number, number, number][]
}

export type Rests = Record<Who, Rest>

/** The line along the front of the rug that the dragon's body trails along: clear of the last row of places and of the bell. */
const LIE_LINE = 2.27
/** How high the dragon's back is where the king sits on it. */
export const DRAGON_BACK = 0.98 * FOLK.dragon.size
/** How far the cook stands back from his window before he is lifted, and where he is set down before he puts his head in. */
export const PULL_OUT = 0.17
/** How far the crown of the cook's cap goes in at a window. */
const CROWN = 0.12

function dayRest(who: Who): Rest {
  const place = FOLK[who]
  return {
    who, at: [place.x, place.y, place.z], how: who === 'cook' ? 'open' : 'day', thing: -1, lie: 0, high: false,
    path: who === 'dragon' ? [[place.x, 0, place.z], [place.x - 8, 0, place.z]] : [],
  }
}

/** The space one of the folk takes up at rest, as boxes in the room. */
export function bodyOf(rest: Rest): Box[] {
  const [x, y, z] = rest.at
  if (rest.who === 'king') {
    const { half, tall } = BODY.king
    return [{ min: [x - half, y, z - half], max: [x + half, y + tall, z + half] }]
  }
  if (rest.who === 'cook') {
    const { half, tall, girth } = BODY.cook
    if (rest.lie === 0) return [{ min: [x - half, y, z - half], max: [x + half, y + tall, z + half] }]
    // Lying, he reaches from the point he stands on to the top of his cap, along x, and rests on the knobs of his
    // cap. The crown of his cap, the part that goes in at a window, is narrower than the rest of him.
    const crown = CROWN * rest.lie, tip = x + tall * rest.lie
    // His pot and spoon are out in front of him on his two arms, toward the child.
    const pot = FOLK.cook.size
    return [
      { min: [Math.min(x, tip - crown), y - girth, z - half], max: [Math.max(x, tip - crown), y + girth, z + half] },
      { min: [Math.min(tip - crown, tip), y - 0.4, z - 0.4], max: [Math.max(tip - crown, tip), y + 0.4, z + 0.4] },
      { min: [Math.min(x + 0.1 * pot * rest.lie, x + 0.8 * pot * rest.lie), y - 0.32 * pot, z + half], max: [Math.max(x + 0.1 * pot * rest.lie, x + 0.8 * pot * rest.lie), y + 0.32 * pot, z + 0.95 * pot] },
    ]
  }
  // The dragon: a box for his head before his shoulders, and one for each stretch of his body.
  const { behind, before, half, tall } = BODY.dragon
  const boxes: Box[] = []
  const [a, b] = rest.path
  const ahead = Math.hypot(a[0] - b[0], a[2] - b[2]) || 1
  const hx = ((a[0] - b[0]) / ahead) * before, hz = ((a[2] - b[2]) / ahead) * before
  // His head is as wide as this to either side, and ends at the tip of his nose.
  const wideX = Math.abs(hz) > Math.abs(hx) ? 0.38 : 0, wideZ = wideX > 0 ? 0 : 0.38
  boxes.push({ min: [Math.min(x, x + hx) - wideX, y, Math.min(z, z + hz) - wideZ], max: [Math.max(x, x + hx) + wideX, y + tall * 0.8, Math.max(z, z + hz) + wideZ] })
  // His body, stretch by stretch: slim at the shoulders, as wide as `half` from his belly back.
  const SLIM = 1
  let done = 0
  for (let i = 0; i + 1 < rest.path.length && done < behind; i++) {
    const p = rest.path[i], q = rest.path[i + 1]
    const long = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])
    if (long < 1e-6) continue
    const dir = [(q[0] - p[0]) / long, (q[1] - p[1]) / long, (q[2] - p[2]) / long]
    const end = Math.min(done + long, behind)
    for (const [s0, s1, wide] of [[done, Math.min(end, SLIM), 0.5], [Math.max(done, SLIM), end, half]] as const) {
      if (s1 <= s0) continue
      const a = [0, 1, 2].map((axis) => p[axis] + dir[axis] * (s0 - done)), b = [0, 1, 2].map((axis) => p[axis] + dir[axis] * (s1 - done))
      const padX = Math.abs(dir[0]) > 0.5 ? 0 : wide, padZ = Math.abs(dir[2]) > 0.5 ? 0 : wide
      const up = Math.abs(dir[1]) > 0.5 ? 0 : tall * (wide / half)
      boxes.push({ min: [Math.min(a[0], b[0]) - padX, Math.min(a[1], b[1]), Math.min(a[2], b[2]) - padZ], max: [Math.max(a[0], b[0]) + padX, Math.max(a[1], b[1]) + up, Math.max(a[2], b[2]) + padZ] })
    }
    done += long
  }
  return boxes
}

/** The box in which a touch is a castle thing's: the block and what it has become, never narrower than a finger. */
export function tapBox(thing: Thing): Box {
  const [w, , d] = SIZE[thing.kind]
  const hw = Math.max(w, 0.86) / 2, hd = Math.max(d, 0.86) / 2
  return { min: [thing.x - hw, thing.base, thing.z - hd], max: [thing.x + hw, thing.crown, thing.z + hd] }
}

/** How far a roof reaches out from the middle of its tower, and a ring of battlements; where a slide's ladder stands off its heel. */
export const ROOF_OUT = 0.56
const MERLON_OUT = 0.54
export const LADDER_OFF = 0.04

/**
 * Every box in which a touch is a castle thing's: its `tapBox`, and each
 * part of what it has become that is drawn outside that box. A flag flies
 * out past its pole, a roof and a ring of battlements reach out past the
 * tower, a ladder stands off the heel of a slide, and the lanterns hang on
 * the face of a gate. A thing is touched where it is drawn.
 */
export function tapBoxes(thing: Thing): Box[] {
  const boxes = [tapBox(thing)]
  const { x, z, base, top } = thing
  if (thing.what === 'pole') {
    const side = thing.side || 1
    const near = x + side * 0.1, far = x + side * (0.15 + thing.flag + 0.04)
    boxes.push({ min: [Math.min(near, far), top - 0.05 - FLAG.deep - 0.06, z - 0.22], max: [Math.max(near, far), top + 0.02, z + 0.22] })
  } else if (thing.what === 'tower') {
    if (thing.covered) boxes.push({ min: [x - MERLON_OUT, top - 0.2, z - MERLON_OUT], max: [x + MERLON_OUT, top, z + MERLON_OUT] })
    else boxes.push({ min: [x - ROOF_OUT, top, z - ROOF_OUT], max: [x + ROOF_OUT, thing.crown, z + ROOF_OUT] })
  } else if (thing.what === 'slide') {
    const at = x - (thing.side || 1) * (SIZE.slope[0] / 2 + LADDER_OFF)
    boxes.push({ min: [at - 0.07, base, z - 0.25], max: [at + 0.07, top, z + 0.25] })
  } else if (thing.what === 'gate') {
    const front = z + SIZE.arch[2] / 2
    boxes.push({ min: [x - 0.86, base + 0.8, front - 0.05], max: [x + 0.86, base + 1.25, front + 0.12] })
  }
  return boxes
}

/** The block itself as a box, for what hides what. */
function blockBox(thing: Thing): Box {
  const [w, , d] = SIZE[thing.kind]
  return { min: [thing.x - w / 2, thing.base, thing.z - d / 2], max: [thing.x + w / 2, thing.top, thing.z + d / 2] }
}

/** The surface the rule of sight is worked out for, and the least a thing must show of itself there, in its pixels. */
export const SIGHT = { width: 1180, height: 820, least: 56 }

/**
 * How much of a thing's touch box shows on the surface, as the longer side of
 * the patch that is in view, in pixels: its front and its top are sampled,
 * and a sample counts when nothing in `blockers` stands between it and the
 * camera.
 */
export function shows(thing: Thing, blockers: readonly Box[], back: number, width = SIGHT.width, height = SIGHT.height): number {
  const box = tapBox(thing)
  const eye = cameraFor(width / height, back).position
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  const see = (p: [number, number, number]): void => {
    const dir: [number, number, number] = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]]
    const far = Math.hypot(dir[0], dir[1], dir[2])
    const ray: Ray = { origin: eye, dir: [dir[0] / far, dir[1] / far, dir[2] / far] }
    for (const blocker of blockers) {
      const t = hitBox(ray, blocker)
      if (t !== null && t < far - 0.02) return
    }
    const [sx, sy] = screenAt(p, width, height, back)
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy)
  }
  const N = 6
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = box.min[0] + ((box.max[0] - box.min[0]) * i) / N
    see([x, box.min[1] + ((box.max[1] - box.min[1]) * j) / N, box.max[2]])
    see([x, box.max[1], box.min[2] + ((box.max[2] - box.min[2]) * j) / N])
  }
  return x1 < x0 ? 0 : Math.max(x1 - x0, y1 - y0)
}

/**
 * Whether the folk, resting as given, leave every thing in view: each shows
 * at least `SIGHT.least` pixels of itself, or as much as it showed before any
 * of them sat down, where the child's own pile already hides it.
 */
export function leavesInView(all: readonly Thing[], bodies: readonly Box[], back: number, width = SIGHT.width, height = SIGHT.height): boolean {
  const least = (SIGHT.least * width) / SIGHT.width
  for (const thing of all) {
    const others = all.filter((other) => other !== thing).map(blockBox)
    const before = shows(thing, others, back, width, height)
    if (before <= 0) continue
    const after = shows(thing, [...others, ...bodies], back, width, height)
    if (after < Math.min(least, before) - 0.5) return false
  }
  return true
}

/** The share of some boxes that shows on the surface past the blockers: their fronts and tops sampled, from 0 to 1. */
export function inSight(boxes: readonly Box[], blockers: readonly Box[], back: number): number {
  const eye = cameraFor(SIGHT.width / SIGHT.height, back).position
  let seen = 0, asked = 0
  const see = (p: [number, number, number]): void => {
    const dir: [number, number, number] = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]]
    const far = Math.hypot(dir[0], dir[1], dir[2])
    const ray: Ray = { origin: eye, dir: [dir[0] / far, dir[1] / far, dir[2] / far] }
    asked++
    for (const blocker of blockers) {
      const t = hitBox(ray, blocker)
      if (t !== null && t < far - 0.02) return
    }
    seen++
  }
  const N = 4
  for (const box of boxes) for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = box.min[0] + ((box.max[0] - box.min[0]) * i) / N
    see([x, box.min[1] + ((box.max[1] - box.min[1]) * j) / N, box.max[2]])
    see([x, box.max[1], box.min[2] + ((box.max[2] - box.min[2]) * j) / N])
  }
  return asked ? seen / asked : 0
}

/** The box in which a touch is the bell's. Nothing of the evening may stand in it. */
export const BELL_BOX: Box = { min: [BELL.x - BELL.wide / 2, 0, BELL.z - BELL.deep / 2], max: [BELL.x + BELL.wide / 2, BELL.tall, BELL.z + BELL.deep / 2] }

function overlap(a: Box, b: Box, slack = 0): boolean {
  for (let axis = 0; axis < 3; axis++) if (a.max[axis] <= b.min[axis] + slack || b.max[axis] <= a.min[axis] + slack) return false
  return true
}

/** Whether two boxes stand over the same floor, one above the other or in it. */
function sameFloor(a: Box, b: Box): boolean {
  return a.min[0] < b.max[0] - 0.03 && b.min[0] < a.max[0] - 0.03 && a.min[2] < b.max[2] - 0.03 && b.min[2] < a.max[2] - 0.03
}

/** How far the camera steps back for these rests: only the king on a high seat asks for it. */
export function backOf(rests: Rests): number {
  return rests.king.how === 'seat' ? backFor(rests.king.at[1] + BODY.king.tall + 0.5) : 0
}

/** The king's seat on a thing: the middle of its highest part. A slide's is its heel. */
function seatOn(thing: Thing): [number, number, number] {
  if (thing.what === 'slide') return [thing.x - thing.side * 0.5, thing.top, thing.z]
  return [thing.x, thing.crown, thing.z]
}

/**
 * Where each of the folk comes to rest in the evening, in the fixed order of
 * the sheet: the king, the cook, the dragon.
 *
 * - The king takes the highest seat: the highest point of any thing, the one
 *   nearest the wall where several are as high. On a bare rug he sits on the
 *   dragon.
 * - The cook takes the lowest room: he lies with his head in at its side
 *   window, where nothing beside it stands higher than its foot. Beside a
 *   room up high he sticks out over what is lower, wedged by his cap. Of its two sides he
 *   takes the one where more of him shows past the pile. With no room he can
 *   get his head into, he cooks in the open on his stool.
 * - The dragon lies with his nose under the nearest gate that nothing stands
 *   in front of, his body trailing out over the rug's edge and along the
 *   boards. Failing a gate he tries a bridge with air under it, and failing
 *   that he stays where he is.
 *
 * A place is passed over when he would hide a thing the child can tap, or
 * when it is under or over one of the others: each is lifted out of his
 * place and set down in it from straight above.
 */
export function restsFor(placed: readonly Placed[]): Rests {
  const all = things(placed)
  const tops = eveningTops(all)
  const rests: Rests = { king: dayRest('king'), cook: dayRest('cook'), dragon: dayRest('dragon') }

  // --- The king ---------------------------------------------------------------
  const seats = [...all].sort((a, b) => b.crown - a.crown || a.row - b.row || a.index - b.index)
  for (const seat of seats) {
    // Only the highest will do, and of the highest the one he hides nothing from.
    if (seat.crown < seats[0].crown - 1e-6) break
    const rest: Rest = { who: 'king', at: seatOn(seat), how: 'seat', thing: seat.index, lie: 0, high: false, path: [] }
    if (!leavesInView(all, bodyOf(rest), backFor(rest.at[1] + BODY.king.tall + 0.5))) continue
    rests.king = rest
    break
  }
  const back = backOf(rests)

  // --- The cook ---------------------------------------------------------------
  const rooms = all.filter((thing) => thing.what === 'room').sort((a, b) => a.level - b.level || a.index - b.index)
  const kingBody = bodyOf(rests.king)
  const blocks = all.map(blockBox)
  for (const room of rooms) {
    // Of the two sides of the room he takes the one where more of him shows past the child's pile.
    let most = -1
    for (const lie of [1, -1] as const) {
      // He lies beside the room with the crown of his cap in at its side window: the point he stands on is away from it.
      const { half, tall, girth } = BODY.cook
      const reach = tall - CROWN
      const edge = room.x - lie * 0.43
      const x0 = Math.min(edge, edge - lie * reach), x1 = Math.max(edge, edge - lie * reach)
      // Beside a room that stands on a bridge he lies on the bridge's boards, their thickness higher.
      const under = clearOver(tops, x0 + 0.06, x1 - 0.06, room.z - half, room.z + half)
      const rest: Rest = { who: 'cook', at: [edge - lie * reach, Math.max(room.base, Math.min(under, room.base + BOARDS)) + girth, room.z], how: 'window', thing: room.index, lie, high: room.level > 0, path: [] }
      // Over the rug, with nothing beside the room that stands higher than its foot. Where what is beside it is
      // lower, he sticks out over it with his cap wedged in at the window, as a block set in the air stays.
      if (x0 < RUG.x0 + 0.05 || x1 > RUG.x1 - 0.05) continue
      if (under > room.base + BOARDS + 1e-6) continue
      const body = bodyOf(rest)
      // His pot is out in front of him, and he is set down from straight above: no block stands in it or over it,
      // where he lies or a little back from the window, where he is set down first.
      const pot: Box = { min: [body[2].min[0] - (lie > 0 ? PULL_OUT : 0), body[2].min[1], body[2].min[2]], max: [body[2].max[0] + (lie < 0 ? PULL_OUT : 0), body[2].max[1], body[2].max[2]] }
      if (all.some((thing) => { const box = blockBox(thing); return sameFloor(box, pot) && thing.crown > pot.min[1] + 0.03 })) continue
      // Never under the king or over him: each of them is set down from straight above.
      if (kingBody.some((box) => body.some((mine) => sameFloor(box, mine)))) continue
      if (!leavesInView(all, [...kingBody, ...body], back)) continue
      const seen = inSight(body, blocks, back)
      if (seen > most + 0.05) { most = seen; rests.cook = rest }
    }
    if (most >= 0) break
  }
  const cookBody = bodyOf(rests.cook)

  // --- The dragon -------------------------------------------------------------
  const { half } = BODY.dragon
  /** The line of his body from a nose-in place: out toward the child, down to the floor, on to the boards, then along them. */
  const lineFrom = (x: number, y: number, z: number): [number, number, number][] => {
    const path: [number, number, number][] = [[x, y, z]]
    if (y > 0) path.push([x, y, z + 0.45], [x, 0, z + 0.45])
    const line = Math.max(LIE_LINE, y > 0 ? z + 0.45 : z + 0.1)
    path.push([x, 0, line])
    // Along the front of the rug, away from the bell, and never past the frame.
    const to = x < -2.4 ? 1 : -1
    path.push([x + to * 0.6, 0, line], [x + to * 8, 0, line])
    return path
  }
  const laneFree = (x: number, fromRow: number): boolean => {
    for (let row = fromRow + 1; row < ROWS; row++) if (clearOver(tops, x - half, x + half, placeZ(row) - 0.3, placeZ(row) + 0.3) > 0) return false
    return true
  }
  const tryDragon = (rest: Rest): boolean => {
    const body = bodyOf(rest)
    if ([...kingBody, ...cookBody, BELL_BOX].some((box) => body.some((mine) => overlap(box, mine)))) return false
    // He is set down with his head pulled in: the rest of him is never under or over one of the others.
    const lying = body.slice(1)
    if ([...kingBody, ...cookBody].some((box) => lying.some((mine) => sameFloor(box, mine)))) return false
    if (!leavesInView(all, [...kingBody, ...cookBody, ...body], back)) return false
    rests.dragon = rest
    return true
  }
  const near = (a: Thing, b: Thing): number => Math.hypot(a.x - FOLK.dragon.x, a.z - FOLK.dragon.z) - Math.hypot(b.x - FOLK.dragon.x, b.z - FOLK.dragon.z) || a.index - b.index
  let lying = false
  for (const gate of all.filter((thing) => thing.what === 'gate').sort(near)) {
    if (!laneFree(gate.x, gate.row)) continue
    // His shoulders lie just outside the gate, his head through its hole.
    const at: [number, number, number] = [gate.x, gate.base, gate.z + 0.41 + 0.5]
    if (tryDragon({ who: 'dragon', at, how: 'gate', thing: gate.index, lie: 0, high: false, path: lineFrom(...at) })) { lying = true; break }
  }
  if (!lying) for (const bridge of all.filter((thing) => thing.what === 'bridge' && thing.level >= 2).sort(near)) {
    // A place under the bridge with nothing on the rug there, and a way out toward the child.
    for (let i = 0; i < SHAPE.long.wide && !lying; i++) {
      const x = placeX(bridge.col + i)
      if (tops[cell(bridge.col + i, bridge.row)] > bridge.crown + 1e-6) continue
      if (settle(placed).some((block, n) => n !== bridge.index && block.row === bridge.row && bridge.col + i >= block.col && bridge.col + i < block.col + SHAPE[block.kind].wide)) continue
      if (!laneFree(x, bridge.row)) continue
      const at: [number, number, number] = [x, 0, bridge.z + 0.41 + 0.5]
      lying = tryDragon({ who: 'dragon', at, how: 'bridge', thing: bridge.index, lie: 0, high: false, path: lineFrom(...at) })
    }
    if (lying) break
  }

  // With a bare rug the king has no seat: he sits on the dragon, who has not moved.
  if (all.length === 0) {
    const d = FOLK.dragon
    rests.king = { who: 'king', at: [d.x - 1.9 * d.size, DRAGON_BACK, d.z], how: 'dragon', thing: -1, lie: 0, high: false, path: [] }
  }
  return rests
}

/** Which of the folk rests nearest a thing: the one who answers when it is tapped. */
export function nearestTo(thing: Thing, rests: Rests, among: readonly Who[]): Who | null {
  let best: Who | null = null
  let nearest = Infinity
  for (const who of among) {
    const [x, y, z] = rests[who].at
    const far = Math.hypot(x - thing.x, (y - thing.top) * 0.5, z - thing.z)
    if (far < nearest) { nearest = far; best = who }
  }
  return best
}

