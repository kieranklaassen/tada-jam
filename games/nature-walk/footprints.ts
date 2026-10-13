import { DOOR, FAR_BANK, FOOT_SPOTS, HEDGEHOG, JAY, NEST, NOSE, PUDDLE, PUDDLE_SLOT, SPOTS, STEP, STONE_SPOT, THING_R, TOAD_FOOT, TOAD_HOME, TOAD_SCALE, WHEEL, type P, type Spot } from './layout'
import { coverPose } from './motion'
import { PLACES, type PlaceId } from './wood'

// Where every piece of the wood rests, as discs in stage units, so that a
// test can hold that nothing lies on anything. A piece is a few discs drawn
// about its own origin, the same origin its art is drawn about, turned and
// moved by the pose it rests in. The discs follow the cut outline closely
// from inside: they are what would be seen to overlap.

export type Piece = { name: string; owner: string; discs: Spot[] }

type Local = readonly (readonly [number, number, number])[]

/** The discs of a piece drawn about `at`, turned by `turn` and scaled, as put() in the view draws it. */
export function placed(local: Local, at: P, turn = 0, sx = 1, sy = 1): Spot[] {
  const cos = Math.cos(turn), sin = Math.sin(turn)
  return local.map(([x, y, r]) => {
    const px = x * sx, py = y * sy
    return { x: at.x + px * cos - py * sin, y: at.y + px * sin + py * cos, r: r * Math.min(Math.abs(sx), Math.abs(sy)) }
  })
}

const COVER_DISCS: Record<PlaceId, Local> = {
  // The fan with the two corners of its foot, which swing out when it lies open.
  grass: [[18, -22, 40], [18, -70, 38], [20, -112, 22], [-20, -2, 12], [56, -2, 12]],
  log: [[26, -16, 26], [72, -20, 30], [122, -20, 30], [176, -16, 28], [208, -4, 14]],
  stone: [[0, -2, 54], [28, -4, 40], [-26, 2, 40]],
  puddle: [[-36, 0, 36], [36, 0, 36], [0, 0, 38]],
  branch: [[0, 30, 34], [-46, 60, 34], [46, 60, 34], [0, 98, 32]],
  burrow: [[-58, 60, 62], [-98, 22, 26], [-98, 98, 26], [-14, 22, 20], [-18, 96, 20]],
}

/** A cover where it rests, shut or open. The grass is two fans. */
export function coverPieces(place: PlaceId, open: boolean): Piece[] {
  const amount = open ? 1 : 0, name = `${place} ${open ? 'open' : 'shut'}`
  if (place === 'grass') {
    return ([-1, 1] as const).map((side) => {
      const pose = coverPose('grass', amount, 0, 99, side)
      return { name: `${name} ${side < 0 ? 'left' : 'right'}`, owner: place, discs: placed(COVER_DISCS.grass, pose, pose.turn, side, 1) }
    })
  }
  const pose = coverPose(place, amount, 0, 99)
  return [{ name, owner: place, discs: placed(COVER_DISCS[place], pose, pose.turn, pose.sx, pose.sy) }]
}

/** What lies under a cover, where it sits in its hollow. */
export function findPiece(place: PlaceId): Piece {
  return { name: `under ${place}`, owner: place, discs: [{ x: SPOTS[place].find.x, y: SPOTS[place].find.y, r: 40 }] }
}

const TOAD_DISCS: Local = [[-44, -40, 56], [44, -40, 56], [0, -56, 56], [-40, -104, 46], [40, -104, 46], [-44, -140, 26], [44, -140, 26]]

/** The toad with his feet at `feet`. */
export function toadPiece(feet: P, name = 'toad'): Piece {
  return { name, owner: 'toad', discs: placed(TOAD_DISCS, feet, 0, TOAD_SCALE, TOAD_SCALE) }
}

/** A thing lying at a point. */
export function thingPiece(at: P, name: string): Piece {
  return { name, owner: name, discs: [{ x: at.x, y: at.y, r: THING_R }] }
}

/** The log itself, which no cover and no thing may lie on but its own lid. */
const LOG_BODY: Piece = { name: 'log body', owner: 'log', discs: [{ x: 280, y: 540, r: 46 }, { x: 350, y: 540, r: 50 }, { x: 420, y: 540, r: 46 }] }

/** The pieces that never move from where they stand. */
export function standing(): Piece[] {
  const h = HEDGEHOG
  return [
    { name: 'hedgehog', owner: 'hedgehog', discs: [{ x: h.x - 44, y: h.y + 14, r: 84 }, { x: h.x + 24, y: h.y + 14, r: 76 }, { x: h.x + 92, y: h.y + 12, r: 40 }, { x: h.x - 6, y: h.y - 4, r: 100 }] },
    { name: 'jay', owner: 'jay', discs: [{ x: JAY.x, y: JAY.y + 6, r: 58 }, { x: JAY.x - 26, y: JAY.y - 78, r: 36 }, { x: JAY.x + 38, y: JAY.y + 92, r: 24 }] },
    { name: 'nest', owner: 'jay', discs: [{ x: NEST.x, y: NEST.y + 12, r: 32 }, { x: NEST.x - 34, y: NEST.y + 10, r: 24 }, { x: NEST.x + 34, y: NEST.y + 10, r: 24 }] },
    { name: 'wheel', owner: 'wheel', discs: [{ x: WHEEL.x, y: WHEEL.y, r: 84 }] },
    { name: 'door', owner: 'door', discs: [{ x: DOOR.x, y: DOOR.y - 60, r: 48 }, { x: DOOR.x, y: DOOR.y, r: 48 }, { x: DOOR.x, y: DOOR.y + 62, r: 48 }] },
    LOG_BODY,
    // The wall of the house, from its corner down to the step.
    { name: 'house', owner: 'door', discs: [{ x: 1062, y: 330, r: 26 }, { x: 1062, y: 382, r: 26 }, { x: 1062, y: 434, r: 26 }, { x: 1062, y: 486, r: 26 }, { x: 1062, y: 538, r: 26 }, { x: 1080, y: 250, r: 40 }] },
    // The stem of the jay's tree with its fork, and the water of the puddle: no cover comes to rest on either.
    { name: 'stem of the jay\'s tree', owner: 'jay', discs: [{ x: 738, y: 412, r: 28 }, { x: 738, y: 380, r: 30 }, { x: 775, y: 282, r: 14 }, { x: 797, y: 240, r: 10 }, { x: 680, y: 240, r: 12 }] },
    // The crown of the jay's tree.
    { name: 'crown of the jay\'s tree', owner: 'jay', discs: [{ x: 724, y: 140, r: 92 }, { x: 664, y: 140, r: 48 }, { x: 786, y: 140, r: 46 }] },
    // The two far trees, small on the rise: no cover comes to rest on them either.
    { name: 'far tree at the left', owner: 'far', discs: [{ x: 176, y: 330, r: 40 }, { x: 176, y: 400, r: 9 }, { x: 176, y: 440, r: 9 }] },
    { name: 'far tree at the right', owner: 'far', discs: [{ x: 466, y: 340, r: 36 }, { x: 466, y: 400, r: 9 }, { x: 466, y: 440, r: 9 }] },
    { name: 'water of the puddle', owner: 'puddle', discs: [{ x: PUDDLE.x - 60, y: PUDDLE.y, r: 40 }, { x: PUDDLE.x, y: PUDDLE.y, r: 44 }, { x: PUDDLE.x + 60, y: PUDDLE.y, r: 40 }] },
  ]
}

/** Every place the toad can be sent to that the layout fixes. */
export function toadSeats(): Piece[] {
  return [toadPiece(TOAD_HOME, 'toad at home'), toadPiece(TOAD_FOOT, 'toad at the foot of the tree'), ...PLACES.map((place) => toadPiece(SPOTS[place].seat, `toad beside ${place}`))]
}

/** Every fixed spot a thing is set down on by the game. */
export function thingSpots(): Piece[] {
  return [
    thingPiece(NOSE, 'thing before the hedgehog'), thingPiece(STONE_SPOT, 'thing on the stone'), thingPiece(PUDDLE_SLOT, 'thing in the puddle'),
    thingPiece(FAR_BANK, 'thing on the far bank'), thingPiece(STEP, 'thing by the step'),
    ...FOOT_SPOTS.map((spot, index) => thingPiece(spot, `thing at the foot of the tree ${index}`)),
  ]
}

/** How far two pieces overlap: the deepest overlap of any two of their discs, or 0. */
export function overlap(a: Piece, b: Piece): number {
  let deepest = 0
  for (const p of a.discs) for (const q of b.discs) deepest = Math.max(deepest, p.r + q.r - Math.hypot(p.x - q.x, p.y - q.y))
  return deepest
}
