// Where everything stands in the room, and how a touch on the glass becomes a
// place in it. Plain numbers only: the view sets its camera from `CAMERA`, so
// what this module projects is what is drawn, and a test can ask where a
// thing lands on the surface without a renderer.
// Units are metres. x runs right, y up, z towards the child.

export type Vec = { x: number; y: number; z: number }

/** The side of one cell of a box face. */
export const CELL = 0.0125

export type KindId = 'big' | 'mid' | 'small'
export type Kind = { w: number; h: number; d: number; cols: number; rows: number }

/** The three sizes of box. A face is `cols` by `rows` cells. */
export const KINDS: Record<KindId, Kind> = {
  big: { w: 2.2, h: 1.6, d: 1.4, cols: 176, rows: 128 },
  mid: { w: 1.5, h: 1.1, d: 1.1, cols: 120, rows: 88 },
  small: { w: 1.1, h: 0.8, d: 0.9, cols: 88, rows: 64 },
}

/** The size of each box, by its id. */
export const BOX_KINDS: readonly KindId[] = ['big', 'mid', 'mid', 'small', 'small']
export const BOX_COUNT = BOX_KINDS.length

/** Every face that is turned to the child stands in this plane. */
export const FRONT_Z = 0.6
/** The thickness of the board. */
export const BOARD = 0.035

/** Where a standing box is on a first visit: the middle of its face along the rug, in centimetres. The two that stand on a first visit touch, so there is a seam for the tape from the start. */
export const FIRST_X: readonly number[] = [-35, 0, 0, 130, 0]

export const kindOf = (id: number): Kind => KINDS[BOX_KINDS[id]]

/** The camera: where it stands, what it looks at, and the part of the room it must always hold. */
export const CAMERA = {
  at: { x: 0, y: 2.15, z: 7.6 },
  to: { x: 0, y: 1.4, z: 0 },
  /** Half of the height seen in the plane of the box faces. */
  halfHeight: 2.1,
  /** Half of the width that must fit in that plane on the narrowest surface: out to where the grandmother stands up beside the boxes. */
  halfWidth: 3,
  near: 0.5,
  far: 40,
}

/** Where a box may stand along the rug: its edges stay between these. */
export const RUG = { left: -1.45, right: 1.9 }
/** No stack grows higher than this, so the cat on the highest box stays under the home control. */
export const MAX_TOP = 2.72
/** The lid of a box: a flap standing up along its back edge, which is what a finger takes a box by. */
export const FLAP = 0.36

/** Where the others are, for the eyes that follow and for a touch. Each is the middle of the head. */
export const BABY: Vec = { x: -1.66, y: 0.78, z: 1.55 }
export const GRAN: Vec = { x: 2.36, y: 2.12, z: -1.6 }
/** How large the baby is drawn, against the sizes its parts are cut at. */
export const BABY_SCALE = 0.9
/** Where the scissors lie when no finger holds them: the tips, and the way they point (radians, anticlockwise from the right). */
export const SCISSORS_REST: Vec = { x: -0.3, y: 0.15, z: 1.95 }
export const SCISSORS_TURN = 3.3
/** Where the cat sits on a box, from the middle of its face: to the left, clear of the home control above. */
export const CAT_SEAT_X = -0.5
/** Where the cat sits on the rug: to the left of the boxes, past where one may stand, behind the baby's side of the rug. */
export const CAT_RUG: Vec = { x: -2.32, y: 0, z: 0.5 }
/** Where the baby sits (its feet), and where the grandmother stands when she is out of her chair. */
export const BABY_HOME: Vec = { x: BABY.x, y: 0, z: BABY.z }
export const GRAN_STAND: Vec = { x: 2.36, y: 0, z: 0.8 }
/**
 * How far from the faces each of the three goes along the rug. One of them moves at a time, and each lane is clear of
 * what lies on the rug: a cushion on the floor lies nearer the faces than the grandmother's feet pass, and the heap, the
 * scissors, the roll and the baby's place are all further out than she walks.
 */
export const LANE = { cat: 0.8, baby: 1.0, gran: 0.7 }
/** Where the grandmother's lane begins: she comes out past the end of the boxes to where she stands, and steps from there onto her lane, inside the frame and clear of a cushion at the end of the strip. */
export const GRAN_OUT: Vec = { x: 2.12, y: 0, z: FRONT_Z + LANE.gran }
/** How high the grandmother lifts a box she wears. */
export const WORN = 0.55
/** Where the string of lights lies when it was dropped in a tangle: on the floor at the front, between the scissors and the heap. */
export const TANGLE: Vec = { x: 0.66, y: 0.06, z: 2.08 }
/** The three cushions on the sofa, in a row on its seat, each leaning a little way over the next one back so that no two share a plane and all three show to the left of the big box, and where one that was fired out of a box comes to rest: against the front of the sofa. */
export const CUSHIONS: readonly Vec[] = [{ x: -3.46, y: 0.86, z: -2.07 }, { x: -2.93, y: 0.86, z: -2.19 }, { x: -2.4, y: 0.86, z: -2.31 }]
export const CUSHION_RUG: Vec = { x: -2.9, y: 0.45, z: -1.15 }
/** The strip of rug in front of the faces where a cushion let go on bare rug lies flat: how far along the rug its middle may be, how far in front of the faces, how high its middle lies, and how much higher one that lies on another. */
export const STRIP = { left: -1.4, right: 1.28, out: 0.4, y: 0.1, pile: 0.17, flat: 1.163 }
/** Half the width of a cushion. */
export const CUSHION_HALF = 0.43
/** The blanket folded over the back of the sofa. */
export const BLANKET_HOME: Vec = { x: -3.5, y: 1.75, z: -2.5 }
/** The heap of flat boxes at the front of the rug, the tape roll beside it, the hook the lights hang from and the wall switch. */
export const HEAP: Vec = { x: 1.6, y: 0.1, z: 2.08 }
export const ROLL: Vec = { x: -0.82, y: 0.17, z: 1.98 }
/** How wide a box lies on the heap, against its width standing: it is folded in on itself. */
export const FOLDED = 0.62
export const HOOK: Vec = { x: 3.3, y: 3.47, z: -2.9 }
export const SWITCH: Vec = { x: -3.4, y: 3.6, z: -2.93 }
/** How far the coil of lights hangs below its hook. */
export const COIL = 0.5

/** The jam's home control: a round button at the top centre of the surface, in its pixels. */
export const HOME = { radius: 24, top: 10 }
/** The grown-up's corner: the top right of the surface, in its pixels. */
export const CORNER = 72

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const cross = (a: Vec, b: Vec): Vec => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y + a.z * b.z
const unit = (a: Vec): Vec => {
  const length = Math.hypot(a.x, a.y, a.z)
  return { x: a.x / length, y: a.y / length, z: a.z / length }
}

const FORWARD = unit(sub(CAMERA.to, CAMERA.at))
const RIGHT = unit(cross(FORWARD, { x: 0, y: 1, z: 0 }))
const UP = cross(RIGHT, FORWARD)
/** How far the plane of the faces is from the camera, along its line of sight. */
const FACE_DEPTH = dot(sub({ x: 0, y: 0, z: FRONT_Z }, CAMERA.at), FORWARD)

/**
 * The tangent of half the vertical field of view for a surface of this shape. The height is kept on a wide
 * surface; on a narrow one the view opens until the width that must fit does.
 */
export function halfTan(width: number, height: number): number {
  const aspect = width / height
  return Math.max(CAMERA.halfHeight, CAMERA.halfWidth / aspect) / FACE_DEPTH
}

/** The vertical field of view in degrees, as the view's camera takes it. */
export function fieldOfView(width: number, height: number): number {
  return (Math.atan(halfTan(width, height)) * 2 * 180) / Math.PI
}

export type Seen = { x: number; y: number; /** Surface pixels to a metre at that depth. */ scale: number }

/** Where a place in the room lands on a surface of this size, in its pixels. */
export function project(p: Vec, width: number, height: number): Seen {
  const from = sub(p, CAMERA.at), depth = dot(from, FORWARD), t = halfTan(width, height)
  const scale = height / 2 / (depth * t)
  return { x: width / 2 + dot(from, RIGHT) * scale, y: height / 2 - dot(from, UP) * scale, scale }
}

/** The place in the plane `z` that lies under a point of the surface. */
export function onPlane(px: number, py: number, width: number, height: number, z: number): Vec {
  const t = halfTan(width, height)
  const sx = ((px - width / 2) / (height / 2)) * t, sy = ((height / 2 - py) / (height / 2)) * t
  const dir = { x: FORWARD.x + RIGHT.x * sx + UP.x * sy, y: FORWARD.y + RIGHT.y * sx + UP.y * sy, z: FORWARD.z + RIGHT.z * sx + UP.z * sy }
  const along = (z - CAMERA.at.z) / dir.z
  return { x: CAMERA.at.x + dir.x * along, y: CAMERA.at.y + dir.y * along, z }
}

/** A box as it stands: where the middle of its face is along the rug, and how high its foot is. */
export type Standing = { id: number; x: number; foot: number }

/** A place on a face in cells, from its lower left corner; not rounded. */
export type OnFace = { id: number; cx: number; cy: number }

/** The face under a place of the front plane, or null. */
export function faceAt(at: Vec, boxes: readonly Standing[]): OnFace | null {
  for (const box of boxes) {
    const kind = kindOf(box.id), left = box.x - kind.w / 2
    if (at.x >= left && at.x <= left + kind.w && at.y >= box.foot && at.y <= box.foot + kind.h) return { id: box.id, cx: (at.x - left) / CELL, cy: (at.y - box.foot) / CELL }
  }
  return null
}

/** The place in the room of a point of a face given in cells. */
export function faceToRoom(box: Standing, cx: number, cy: number): Vec {
  return { x: box.x - kindOf(box.id).w / 2 + cx * CELL, y: box.foot + cy * CELL, z: FRONT_Z }
}
