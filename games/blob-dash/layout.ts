import { BEATS } from './beat'
import type { Point } from './input'
import { KINDS, type Kind } from './pieces'
import { STAGE, fit, type Fit } from './stage'

// Where everything is, in stage units (stage.ts). Pure numbers: the rules, the
// view and the tests all read the same places.
//
// The ring is the course. The blob runs round its inside, anticlockwise, so
// that it travels left to right along the bottom, where it stands the right
// way up. Its floor is the ring's line and its ceiling the rim of the round
// niche in the middle, where the pigeon lives.

export const RING = {
  x: 590,
  y: 404,
  /** Where the blob's feet touch the floor: the inner edge of the ring's line. */
  floor: 312,
  /** How thick the ring's line is sprayed, outward from the floor. */
  line: 14,
  /** The ceiling of the course: the outer edge of the niche's rim. */
  hub: 112,
  /** How thick that rim is, inward from the ceiling. */
  rim: 10,
} as const

export const BLOB = {
  size: 96,
  /** How far its feet leave the surface at the top of a jump. Every low piece and every spring fits under it; a wall does not. */
  jump: 50,
} as const

/** A spring: a coil that stands on the line. Under a piece on the same beat it is pressed down to `pressed`. */
export const SPRING = { width: 46, height: 42, pressed: 7 } as const

/** A low piece: a pad, a step, a scoop, a blade, a mouth. */
/** `reach` is how far outside a piece as drawn a finger still takes it. Of two within reach the one the finger is nearer takes it. */
export const PIECE = { width: 62, height: 41, reach: 16 } as const

/** The wall piece: a foot on its beat and an upright ahead of it, where the front of a blob standing on the beat is. No jump clears it. */
export const WALL = { height: 52, ahead: 40, thick: 8 } as const

/** How far apart two beats are along each surface, in stage units. */
export const BEAT_LENGTH = { floor: (Math.PI * 2 * RING.floor) / BEATS, ceiling: (Math.PI * 2 * RING.hub) / BEATS } as const

/** The roof of a pipe, as far off its surface as the tallest thing that can stand inside it. */
export const PIPE = { roof: 56 } as const

/** The angle of a position in the lap, in radians, for a point at `RING.x + r cos a, RING.y + r sin a`. Beat 0 is at the bottom, and the angle falls as the blob runs on. */
export function angleAt(beats: number): number {
  return Math.PI / 2 - (beats / BEATS) * Math.PI * 2
}

/** A point of the course: `beats` round the lap and `lift` stage units off a surface, towards the other one. */
export function onTrack(beats: number, lift: number, ceiling: boolean): Point {
  const a = angleAt(beats), r = ceiling ? RING.hub + lift : RING.floor - lift
  return { x: RING.x + r * Math.cos(a), y: RING.y + r * Math.sin(a) }
}

/** How a thing standing on a surface at `beats` is turned, in radians, so that its feet are on the surface and its head towards the other one. */
export function uprightOn(beats: number, ceiling: boolean): number {
  return angleAt(beats) + (ceiling ? Math.PI / 2 : -Math.PI / 2)
}

/** A point `along` stage units ahead of a place of the course (in the way the blob runs) and `lift` off its surface. */
export function ahead(beats: number, along: number, lift: number, ceiling: boolean): Point {
  const a = angleAt(beats), at = onTrack(beats, lift, ceiling)
  // The blob runs the way the angle falls.
  return { x: at.x + along * Math.sin(a), y: at.y - along * Math.cos(a) }
}

/** Where round the lap a point of the wall is, in beats from 0 up to 16, and how far from the middle of the ring. */
export function polar(at: Point): { beats: number; r: number } {
  const turn = (Math.PI / 2 - Math.atan2(at.y - RING.y, at.x - RING.x)) / (Math.PI * 2)
  return { beats: (((turn % 1) + 1) % 1) * BEATS, r: Math.hypot(at.x - RING.x, at.y - RING.y) }
}

/**
 * A place a piece can stand, numbered 0 to 15 for the beats of the floor and 16 to 31 for those of the ceiling. On
 * the floor every beat holds a piece. On the ceiling, where a beat is under half as long, every second beat does:
 * the even ones. So no piece there stands in reach of the next, and a finger takes the one it is on.
 */
export function slotOf(beat: number, ceiling: boolean): number {
  return (((beat % BEATS) + BEATS) % BEATS) + (ceiling ? BEATS : 0)
}

/** Whether a slot is a place a piece can stand. */
export function standsIn(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < BEATS * 2 && (slot < BEATS || slot % 2 === 0)
}

/** Every place a piece can stand: sixteen on the floor and eight on the ceiling. */
export const SLOTS: readonly number[] = Array.from({ length: BEATS * 2 }, (_, slot) => slot).filter(standsIn)

/** The middle of a piece standing in a slot. */
export function slotPoint(slot: number): Point {
  return onTrack(slot % BEATS, PIECE.height / 2, slot >= BEATS)
}

/** How far outside the ring's line and inside the niche's rim a piece may be let go and still be taken for the track. */
const TRACK_MARGIN = { outside: 30, inside: 8 } as const

/**
 * The slot a piece let go at a point goes to: the nearest place a piece can stand, on the floor in the outer half of
 * the course and on the ceiling in the inner half. Null off the track. The margin outside the ring's line reaches
 * down to the tops of the pieces on the rack, and there the rack wins: where a finger would take a piece of the
 * rack, a piece let go is over the rack and no slot.
 */
export function slotAt(at: Point): number | null {
  if (rackAt(at) !== null) return null
  const { beats, r } = polar(at)
  if (r > RING.floor + RING.line + TRACK_MARGIN.outside || r < RING.hub - TRACK_MARGIN.inside) return null
  const ceiling = r < (RING.floor + RING.hub) / 2
  return slotOf(ceiling ? Math.round(beats / 2) * 2 : Math.round(beats), ceiling)
}

/** A box in a slot's own frame: `along` the way the blob runs from the beat, and `lift` off the surface. */
export type Part = { from: number; to: number; top: number }

/** How far a wall's stub steps back behind its face, as drawn. */
export const WALL_STEPS = 12
/** How wide and how tall the grit that came off a wall lies on its beat, as drawn. */
export const RUBBLE = { width: 38, height: 7 } as const

/**
 * The box a piece fills as drawn, in its slot's frame. A wall's runs from the back of its grit on the beat to the
 * back of its stub ahead of it, and as high as the stub: a finger between the two is on the wall.
 */
export function boxOf(kind: Kind): Part {
  if (kind !== 'wall') return { from: -PIECE.width / 2, to: PIECE.width / 2, top: PIECE.height }
  return { from: -RUBBLE.width / 2, to: WALL.ahead + WALL.thick / 2 + WALL_STEPS, top: WALL.height }
}

/** How far a point is from a piece as drawn in a slot: nothing on the piece itself. */
export function offPiece(at: Point, slot: number, kind: Kind): number {
  const ceiling = slot >= BEATS, a = angleAt(slot % BEATS), foot = onTrack(slot % BEATS, 0, ceiling)
  const dx = at.x - foot.x, dy = at.y - foot.y, out = ceiling ? 1 : -1
  const along = dx * Math.sin(a) - dy * Math.cos(a), lift = out * (dx * Math.cos(a) + dy * Math.sin(a))
  const box = boxOf(kind)
  return Math.hypot(Math.max(box.from - along, 0, along - box.to), Math.max(-lift, 0, lift - box.top))
}

/**
 * The piece on the track a finger lands on, given what stands in each slot: the one the finger is on, or the one it
 * is nearest to within reach. So a finger on a piece as drawn takes that piece and never the one beside it.
 */
export function pieceUnder(at: Point, pieces: Iterable<readonly [number, Kind]>): number | null {
  let best: number | null = null, nearest: number = PIECE.reach
  for (const [slot, kind] of pieces) {
    const d = offPiece(at, slot, kind)
    if (d < nearest || (d === nearest && best === null)) {
      nearest = d
      best = slot
    }
  }
  return best
}

// --- The rack -----------------------------------------------------------------

/** The rack: a plank on the pavement under the ring, with one of each piece standing on it. */
/**
 * `scale` is how much larger a piece is drawn on the rack and in the hand than on the line. `reach` is how far
 * outside a piece as drawn there a finger still takes it. `over` is how far the plank runs on past the middle of
 * its first and last places.
 */
export const RACK = { first: 330, pitch: 104, y: 796, reach: 12, slots: 6, scale: 1.3, over: 56, under: 20 } as const

/** The middle of a place of the rack, half a low piece's height above the plank. */
export function rackPoint(index: number): Point {
  return { x: RACK.first + index * RACK.pitch, y: RACK.y - (PIECE.height / 2) * RACK.scale }
}

/**
 * Where the foot of the piece in a place of the rack stands on the plank. A piece is drawn there with the middle
 * of its box on the middle of its place, so a wall, whose stub stands ahead of its foot, stands whole on the plank.
 */
export function rackFoot(index: number): Point {
  const box = boxOf(KINDS[index])
  return { x: RACK.first + index * RACK.pitch - ((box.from + box.to) / 2) * RACK.scale, y: RACK.y }
}

/** The box the piece in a place of the rack fills as drawn, in stage units. */
export function rackBox(index: number): Box {
  const box = boxOf(KINDS[index]), foot = rackFoot(index)
  return { x: foot.x + box.from * RACK.scale, y: RACK.y - box.top * RACK.scale, w: (box.to - box.from) * RACK.scale, h: box.top * RACK.scale }
}

/**
 * Where a piece let go is put back on the rack: over the plank, from the top of the tallest piece on it down to
 * the bricks it lies on, or within a finger's reach of any piece as drawn there.
 */
export function overRack(at: Point): boolean {
  const left = RACK.first - RACK.over, right = RACK.first + (RACK.slots - 1) * RACK.pitch + RACK.over
  const top = RACK.y - WALL.height * RACK.scale - RACK.reach
  return rackAt(at) !== null || (at.x >= left && at.x <= right && at.y >= top && at.y <= RACK.y + RACK.under)
}

/** The place of the rack a finger lands on: the piece it is on as drawn, or the one it is nearest to within reach. Null off the rack. */
export function rackAt(at: Point): number | null {
  let best: number | null = null, nearest: number = RACK.reach
  for (let i = 0; i < RACK.slots; i++) {
    const box = rackBox(i)
    const d = Math.hypot(Math.max(box.x - at.x, 0, at.x - box.x - box.w), Math.max(box.y - at.y, 0, at.y - box.y - box.h))
    if (d < nearest || (d === nearest && best === null)) {
      nearest = d
      best = i
    }
  }
  return best
}

// --- The controls -------------------------------------------------------------

/** The springs' release: a cord that hangs from a catch, with a grip to pull at its end. */
export const RELEASE = {
  x: 988,
  /** Where the cord leaves the catch. */
  top: 86,
  /** The middle of the grip when it hangs at rest. */
  rest: 196,
  /** Half the grip's width as drawn, and the radius a finger may land in. */
  r: 30,
  reach: 46,
  /** How far down the grip can be pulled, and the share of that at which the catch lets go. */
  travel: 108,
  catch: 0.55,
  /** How far the grip swings to each side for one unit of its swing. */
  sway: 16,
} as const

/** The tempo dial: a knob with a pointer, turned by a finger that goes round it. */
export const DIAL = {
  x: 1052,
  y: 704,
  r: 62,
  reach: 80,
  /** The pointer's angle at the slowest and the fastest tempo, in radians from straight up, clockwise. */
  from: (-135 * Math.PI) / 180,
  to: (135 * Math.PI) / 180,
} as const

/** Whether a touch lands on the release's grip where it is drawn: `drop` stage units below its rest, `sway` to the side. */
export function onRelease(at: Point, drop = 0, sway = 0): boolean {
  return Math.hypot(at.x - RELEASE.x - sway, at.y - RELEASE.rest - drop) <= RELEASE.reach
}

/**
 * The snail at the dial's slow end and the hare at its fast end, stencilled on the wall beside the plate. They are
 * paint, not buttons: a tap on one is a tap on the wall, and the knob rocks towards that end to show what is turned.
 */
export const DIAL_ENDS = { snail: { x: DIAL.x - 84, y: DIAL.y + 70 }, hare: { x: DIAL.x + 84, y: DIAL.y + 68 }, reach: 30 } as const

/** Which end of the dial a touch lands on the animal of: -1 the snail, 1 the hare, 0 neither. */
export function dialEnd(at: Point): -1 | 0 | 1 {
  if (Math.hypot(at.x - DIAL_ENDS.snail.x, at.y - DIAL_ENDS.snail.y) <= DIAL_ENDS.reach) return -1
  if (Math.hypot(at.x - DIAL_ENDS.hare.x, at.y - DIAL_ENDS.hare.y) <= DIAL_ENDS.reach) return 1
  return 0
}

export function onDial(at: Point): boolean {
  return Math.hypot(at.x - DIAL.x, at.y - DIAL.y) <= DIAL.reach
}

// --- The cast -----------------------------------------------------------------

export type Who = 'pigeon' | 'rat' | 'cat' | 'camera' | 'neighbour'
export type Box = { x: number; y: number; w: number; h: number }

/** How much smaller the pigeon is drawn than its stencil was cut, to sit inside the niche. */
export const PIGEON_SCALE = 0.68

/** Where each of the cast is: the point its sprites are placed from, and the box a poke may land in. */
export const CAST: Readonly<Record<Who, { x: number; y: number; box: Box }>> = {
  pigeon: { x: RING.x + 9, y: RING.y + 29, box: { x: RING.x - 96, y: RING.y - 96, w: 192, h: 192 } },
  rat: { x: 148, y: 786, box: { x: 26, y: 372, w: 236, h: 414 } },
  cat: { x: 1040, y: 478, box: { x: 922, y: 356, w: 244, h: 126 } },
  // The camera turns on its joint: its box here is the wall it sweeps, and a poke lands on it where it is drawn (`onCamera`).
  camera: { x: 104, y: 150, box: { x: 26, y: 44, w: 220, h: 250 } },
  neighbour: { x: 1110, y: 330, box: { x: 1050, y: 96, w: 120, h: 234 } },
}

/** The ledge the cat lies along, the window above it, and the pavement at the foot of the wall. */
export const LEDGE = { x: 918, y: 478, h: 20 } as const
export const WINDOW = { x: 1050, y: 96, w: 120, h: 234 } as const
export const PAVEMENT = { y: 786 } as const

function within(at: Point, box: Box): boolean {
  return at.x >= box.x && at.x <= box.x + box.w && at.y >= box.y && at.y <= box.y + box.h
}

/** Where the cat's tail hangs and swings, below the ledge: a poke there is a poke of the cat. */
export const CAT_TAIL: Box = { x: 1080, y: 482, w: 100, h: 116 }

/**
 * The camera as drawn, in its own frame from its joint, pointing right: its box and hood from `from` to `to` along
 * the way it points and from `top` to `bottom` across it. `reach` is how far outside it a finger still pokes it,
 * and `least` and `most` are how far its joint lets it turn, in radians from pointing right.
 */
export const CAMERA = { from: -18, to: 122, top: -33, bottom: 27, reach: 10, least: -0.5, most: 1.25, nod: 0.1 } as const

/** Whether a point is on the camera as it is drawn when it is turned `pan` radians from pointing right. */
export function onCamera(at: Point, pan: number): boolean {
  const dx = at.x - CAST.camera.x, dy = at.y - CAST.camera.y, cos = Math.cos(pan), sin = Math.sin(pan)
  const along = dx * cos + dy * sin, across = dy * cos - dx * sin
  return along >= CAMERA.from - CAMERA.reach && along <= CAMERA.to + CAMERA.reach && across >= CAMERA.top - CAMERA.reach && across <= CAMERA.bottom + CAMERA.reach
}

/**
 * Which of the cast a touch lands on, if any. The pigeon is whatever is inside its niche. The camera turns, and is
 * touched where it is drawn: `pan` is where it points now.
 */
export function castAt(at: Point, pan = 0): Who | null {
  if (Math.hypot(at.x - RING.x, at.y - RING.y) < RING.hub - RING.rim) return 'pigeon'
  for (const who of ['rat', 'cat', 'neighbour'] as const) if (within(at, CAST[who].box)) return who
  if (onCamera(at, pan)) return 'camera'
  // The cat's tail hangs below its ledge and is the cat too.
  if (within(at, CAT_TAIL)) return 'cat'
  return null
}

// --- What the jam lays over the game ---------------------------------------------

/** The jam's home control: round, 48 px across, at the top centre of the surface and 10 px down, in the surface's own pixels. */
export const HOME = { size: 48, top: 10 } as const
/** The grown-up's corner at the top right of the surface, in the surface's own pixels (overlay.ts). */
export const CORNER_PX = 72

/** Surfaces the layout is held to: tablets both ways up, a short wide window and a small one, and three short wide surfaces down to a phone lying on its side. */
export const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [1133, 744], [1366, 1024], [1400, 700], [760, 560], [820, 1180], [1000, 600], [844, 390], [568, 320]]

/** The stage height above which nothing a finger must reach lies: the top beat of the track, less the reach of a piece standing on it and a little air. */
export const HOME_CLEAR = RING.y - RING.floor + PIECE.height / 2 - Math.hypot(PIECE.width / 2, PIECE.height / 2) - 4

/**
 * How the stage sits in a surface in this game: the plain fit, centred, wherever the home control then clears the
 * top of the track, which is every tablet. On a short wide surface the control, which does not shrink, would reach
 * down onto the top beat: there the stage is made a little smaller and set lower, so that the control ends above
 * `HOME_CLEAR`. The view draws with this fit and every touch comes back through it.
 */
export function frame(width: number, height: number): Fit {
  const plain = fit(width, height), under = HOME.top + HOME.size
  const scale = Math.min(plain.scale, (height - under) / (STAGE.height - HOME_CLEAR))
  if (!(scale > 0)) return { scale: 0, x: 0, y: 0 }
  return { scale, x: (width - STAGE.width * scale) / 2, y: Math.max((height - STAGE.height * scale) / 2, under - HOME_CLEAR * scale) }
}

/** The home control on a surface of a size, as a box in stage units. The stage shrinks with the surface and the control does not. */
export function homeOn(width: number, height: number): Box {
  const by = frame(width, height)
  return { x: (width / 2 - HOME.size / 2 - by.x) / by.scale, y: (HOME.top - by.y) / by.scale, w: HOME.size / by.scale, h: HOME.size / by.scale }
}

/** The grown-up's corner on a surface of a size, as a box in stage units. */
export function cornerOn(width: number, height: number): Box {
  const by = frame(width, height)
  return { x: (width - CORNER_PX - by.x) / by.scale, y: -by.y / by.scale, w: CORNER_PX / by.scale, h: CORNER_PX / by.scale }
}

export const STAGE_BOX: Box = { x: 0, y: 0, w: STAGE.width, h: STAGE.height }
