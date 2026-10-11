import { BOAT_LANE_R, FOOT, GAP, LAND_Y, SEA_FOOT, STAND, LAND_R, RIM_IN, RIM_OUT, SEA_LANE_R, SHORE_R, TALL, toWorld, type Kind, type Toy } from './toys'

// Where things come to stand. A toy let go anywhere over the turntable is
// given a place of its own: on the land, on the ring of the sea, or (the
// sheep) in the boat. Nothing is refused and nothing ever stands in anything
// else: a toy aimed at a toy lands beside it, and a toy aimed at land that has
// no room left comes down in the sea beside it.
// Every point here is on the turntable, in its own units, as a save holds it.

export type Spot = { where: 'land' | 'sea' | 'boat'; x: number; z: number }

/** A point nearer the middle than this is aimed at the land; further out, at the sea. */
export const LAND_AIM_R = (LAND_R + SHORE_R) / 2

const round = (n: number): number => Math.round(n * 100) / 100

/** Whether two toys' grounds keep their gap. */
function apart(a: Kind, ax: number, az: number, b: Kind, bx: number, bz: number): boolean {
  return Math.hypot(ax - bx, az - bz) >= FOOT[a] + FOOT[b] + GAP - 1e-9
}

function freeOnLand(kind: Kind, x: number, z: number, toys: readonly Toy[]): boolean {
  if (Math.hypot(x, z) > LAND_R - STAND[kind] - 0.05 + 1e-9) return false
  for (const other of toys) if (other.kind !== kind && other.where === 'land' && !apart(kind, x, z, other.kind, other.x, other.z)) return false
  return true
}

/** The free place on the land nearest to where the toy was aimed, or null when the land has no room for it. */
export function landSpot(kind: Kind, x: number, z: number, toys: readonly Toy[]): { x: number; z: number } | null {
  const reach = LAND_R - STAND[kind] - 0.05, r = Math.hypot(x, z)
  if (r > reach) { x *= reach / r; z *= reach / r }
  if (freeOnLand(kind, x, z, toys)) return { x: round(x), z: round(z) }
  // Rings that widen round the aim: the first free point found is among the nearest.
  for (let ring = 1; ring <= 50; ring++) {
    const d = ring * 0.12, steps = 8 + ring * 4
    for (let i = 0; i < steps; i++) {
      // Alternate to either side of the way out from the middle, so a toy pushed off another goes outward first.
      const a = Math.atan2(z, x) + (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * ((2 * Math.PI) / steps)
      const px = round(x + Math.cos(a) * d), pz = round(z + Math.sin(a) * d)
      if (freeOnLand(kind, px, pz, toys)) return { x: px, z: pz }
    }
  }
  return null
}

/** The place on the sea ring nearest to that bearing. The boat has the outer ring to itself. */
export function seaSpot(kind: Kind, x: number, z: number, toys: readonly Toy[]): { x: number; z: number } {
  // A toy let go over the very middle has no bearing: it takes the front.
  const bearing = Math.hypot(x, z) < 1e-6 ? Math.PI / 2 : Math.atan2(z, x)
  if (kind === 'boat') return { x: round(Math.cos(bearing) * BOAT_LANE_R), z: round(Math.sin(bearing) * BOAT_LANE_R) }
  for (let i = 0; i < 400; i++) {
    const a = bearing + (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 0.02
    const px = round(Math.cos(a) * SEA_LANE_R), pz = round(Math.sin(a) * SEA_LANE_R)
    if (toys.every((other) => other.kind === kind || other.kind === 'boat' || other.where !== 'sea' || Math.hypot(px - other.x, pz - other.z) >= SEA_FOOT[kind] + SEA_FOOT[other.kind] + GAP - 1e-9)) return { x: px, z: pz }
  }
  // Four toys cannot fill the ring, so this is never reached; the aim itself is the answer of last resort.
  return { x: round(Math.cos(bearing) * SEA_LANE_R), z: round(Math.sin(bearing) * SEA_LANE_R) }
}

/**
 * Where a toy let go over the point (x, z) of the turntable comes to stand, among the toys as they stand now.
 * The boat's place in `toys` is where it is at this moment, sailing or not.
 */
export function settle(kind: Kind, x: number, z: number, toys: readonly Toy[]): Spot {
  if (kind === 'sheep') {
    const boat = toys.find((toy) => toy.kind === 'boat')
    if (boat && (boat.where === 'land' || boat.where === 'sea') && Math.hypot(x - boat.x, z - boat.z) <= FOOT.boat) return { where: 'boat', x: 0, z: 0 }
  }
  if (Math.hypot(x, z) <= LAND_AIM_R) {
    const land = landSpot(kind, x, z, toys)
    if (land) return { where: 'land', ...land }
  }
  return { where: 'sea', ...seaSpot(kind, x, z, toys) }
}

/**
 * Where the sheep stands to eat the tree: the free spot right beside the tree that is nearest the sheep. Null
 * when either is not on the land or there is no room beside the tree, and the sheep then stays where it is.
 */
export function munchSpot(toys: readonly Toy[]): { x: number; z: number } | null {
  const sheep = toys.find((toy) => toy.kind === 'sheep'), tree = toys.find((toy) => toy.kind === 'tree')
  if (!sheep || !tree || sheep.where !== 'land' || tree.where !== 'land') return null
  const reach = FOOT.sheep + FOOT.tree + GAP + 0.02
  const toward = Math.hypot(sheep.x - tree.x, sheep.z - tree.z) < 1e-6 ? Math.PI / 2 : Math.atan2(sheep.z - tree.z, sheep.x - tree.x)
  for (let i = 0; i < 18; i++) {
    const a = toward + (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 9)
    const x = round(tree.x + Math.cos(a) * reach), z = round(tree.z + Math.sin(a) * reach)
    if (apart('sheep', x, z, 'tree', tree.x, tree.z) && freeOnLand('sheep', x, z, toys)) return { x, z }
  }
  return null
}

// --- Who stands in front of whom ------------------------------------------------

/**
 * Where the child's eye is, in the world, on a tablet lying down, a smaller one, and one standing up: above
 * the table's edge, in front of it. camera.ts stands the camera there, and a test holds the two together.
 */
export const EYES: readonly { y: number; z: number }[] = [{ y: 12.3, z: 25.9 }, { y: 13.2, z: 27.4 }, { y: 22.4, z: 43.3 }]

/** A thing standing in the world: where, how wide from its middle, and from what height to what height. */
export type Upright = { x: number; z: number; half: number; low: number; high: number }

/** Room kept round a thing when it is asked whether it stands in front of another. */
const ROOM = 0.12

/**
 * Whether `a` stands between the child and any part of `b`: nearer the child, and over it on the glass as
 * seen from any of the eyes. What is seen is worked out as the eye sees it, each thing by how far off it is.
 */
export function covers(a: Upright, b: Upright): boolean {
  if (a.z <= b.z) return false
  for (const eye of EYES) {
    const da = eye.z - a.z, db = eye.z - b.z
    if ((a.x - a.half - ROOM) / da >= (b.x + b.half) / db || (b.x - b.half) / db >= (a.x + a.half + ROOM) / da) continue
    // How far below the eye's level each end is seen: the top of the nearer thing against the foot of the further, and the other way.
    if ((eye.y - a.high - ROOM) / da < (eye.y - b.low) / db && (eye.y - b.high) / db < (eye.y - a.low + ROOM) / da) return true
  }
  return false
}

/**
 * The toys that stand still on the turntable, as uprights in the world, with the island turned by `turn`.
 * The boat afloat is not one of them: it sails, and passes behind whoever sits still.
 */
export function resting(toys: readonly Toy[], turn: number): (Upright & { kind: Kind })[] {
  const out: (Upright & { kind: Kind })[] = []
  for (const toy of toys) {
    if (toy.where !== 'land' && toy.where !== 'sea') continue
    if (toy.kind === 'boat' && toy.where === 'sea') continue
    const low = toy.where === 'land' ? LAND_Y : 0
    // The sheep aboard a boat that lies on the land stands that much higher than the boat alone.
    const aboard = toy.kind === 'boat' && toys.some((other) => other.kind === 'sheep' && other.where === 'boat') ? TALL.sheep * 0.8 : 0
    out.push({ kind: toy.kind, ...toWorld(toy.x, toy.z, turn), half: toy.where === 'sea' && toy.kind !== 'house' ? SEA_FOOT[toy.kind] : FOOT[toy.kind], low, high: low + TALL[toy.kind] + aboard })
  }
  return out
}

// --- The cat -------------------------------------------------------------------

/** The ground the cat needs. */
export const CAT_FOOT = 0.84

/**
 * The cat's seats on the land: six in a ring, the front left one first, and the middle. The last seat is the
 * back of the rim; its place here is nominal, and island.ts keeps it at the back as the child sees it, a little
 * to the left, however the island is turned.
 */
export const SEATS: readonly { x: number; z: number }[] = [
  ...[120, 60, 180, 0, 240, 300].map((degrees) => ({ x: round(Math.cos((degrees * Math.PI) / 180) * 1.75), z: round(Math.sin((degrees * Math.PI) / 180) * 1.75) })),
  { x: 0, z: 0 },
  { x: 0, z: -(RIM_IN + RIM_OUT) / 2 },
]
export const RIM_SEAT = SEATS.length - 1

/** How tall and how wide the cat sits, for whoever asks what it stands in front of. */
export const CAT_TALL = 2.3
export const CAT_HALF = 0.7
/** Half the width of its face, and of the body of the gull that rides the smoke over the house: what hides the one behind the other. */
const FACE_HALF = 0.3
const GULL_BODY = 0.5

/**
 * The cat's seat. Worked out from the toys and the island's turn alone (a first visit, a record that names no
 * seat, a cat coming back from the rim), it is the free seat on the land that is farthest from every toy
 * standing there, and the back of the rim when no seat is free. A seat from which the cat would sit between the child and a toy is not free: it never covers
 * one. And of the free seats, those where no toy (nor the gull in the smoke of the house) hides the cat's face
 * come before the others.
 *
 * A cat that sits on the land (`from`) keeps its seat for as long as it is free, and when a toy comes for it
 * goes no further than it has to: to the free seat nearest the one it had, so that it is seen to step out of
 * the toy's way. That seat cannot be worked out from the toys alone, so the island saves it (`cat` in save.ts).
 */
export function catSeat(toys: readonly Toy[], turn = 0, from: number = RIM_SEAT): number {
  const standing = toys.filter((toy) => toy.where === 'land'), still = resting(toys, turn)
  const sat = (i: number): Upright => ({ ...toWorld(SEATS[i].x, SEATS[i].z, turn), half: CAT_HALF, low: LAND_Y, high: LAND_Y + CAT_TALL })
  // Its face is the top of it, and narrower than it: a toy in front of its feet or of one ear hides nothing of it.
  const face = (i: number): Upright => ({ ...toWorld(SEATS[i].x, SEATS[i].z, turn), half: FACE_HALF, low: LAND_Y + CAT_TALL * 0.55, high: LAND_Y + CAT_TALL })
  const house = standing.find((toy) => toy.kind === 'house')
  const hiding = house ? [...still, { ...toWorld(house.x, house.z, turn), half: GULL_BODY, low: LAND_Y + TALL.house, high: LAND_Y + TALL.house + 2.1 }] : still
  const free = SEATS.map((_, i) => i).filter((i) => i !== RIM_SEAT && seatFree(i, toys) && !still.some((toy) => covers(sat(i), toy)))
  const seen = free.filter((i) => !hiding.some((toy) => covers(toy, face(i))))
  // Where its face is seen, if there is such a seat; else any free seat.
  const open = seen.length > 0 ? seen : free
  if (from !== RIM_SEAT && open.includes(from)) return from
  let best = RIM_SEAT, room = -1
  for (const i of open) {
    const nearest = from !== RIM_SEAT
      ? -Math.hypot(SEATS[i].x - SEATS[from].x, SEATS[i].z - SEATS[from].z)
      : Math.min(...standing.map((toy) => Math.hypot(SEATS[i].x - toy.x, SEATS[i].z - toy.z)), Infinity)
    // A seat must be clearly better to win, so the first of two equal seats keeps it.
    if (best === RIM_SEAT || nearest > room + 1e-6) { best = i; room = nearest }
  }
  return best
}

/** Whether no toy on the land stands in a seat. The rim seat is always free. */
export function seatFree(seat: number, toys: readonly Toy[]): boolean {
  return seat === RIM_SEAT || toys.every((toy) => toy.where !== 'land' || Math.hypot(SEATS[seat].x - toy.x, SEATS[seat].z - toy.z) >= FOOT[toy.kind] + CAT_FOOT + GAP)
}

// --- The gull ------------------------------------------------------------------

/** How tall and how wide the gull is afloat. */
export const GULL_AFLOAT = 1.65
export const GULL_HALF = 0.5
/** From its beak to its tail it is longer: this far from its middle, whichever way it is turned. */
export const GULL_LONG = 0.85
/** Where it paddles: this far out from the island's middle, between the toys afloat and the rim, and this far round from the house. */
export const GULL_RING_R = 5.3
export const GULL_ROUND = 0.38

/**
 * Where the gull paddles beside a house that stands in the sea, on the turntable: on the house's seaward
 * side, a little way round from the house to one side or the other, where it has room from its beak to its
 * tail between the house and the rim. The side further from the child comes first. Null when it would cover
 * a toy or the wave from both: it stays on its buoy.
 */
export function gullSpot(toys: readonly Toy[], turn: number, wave: { x: number; z: number } | null = null): { x: number; z: number } | null {
  const house = toys.find((toy) => toy.kind === 'house')
  if (!house || house.where !== 'sea') return null
  const bearing = Math.atan2(house.z, house.x), still: Upright[] = resting(toys, turn)
  // The wave lies in the world, wherever the turntable is turned to: the gull does not paddle in front of it either.
  if (wave) still.push({ x: wave.x, z: wave.z, half: 2, low: 0, high: 2.4 })
  const at = (round: number, r: number): { x: number; z: number } => ({ x: Math.cos(bearing + round) * r, z: Math.sin(bearing + round) * r })
  const sides = [at(GULL_ROUND, GULL_RING_R), at(-GULL_ROUND, GULL_RING_R)].sort((a, b) => toWorld(a.x, a.z, turn).z - toWorld(b.x, b.z, turn).z)
  for (const spot of sides) {
    const gull: Upright = { ...toWorld(spot.x, spot.z, turn), half: GULL_HALF, low: 0, high: GULL_AFLOAT }
    if (still.some((toy) => covers(gull, toy))) continue
    // And it floats clear of every toy in the sea but the house it keeps company.
    if (toys.some((toy) => toy.where === 'sea' && toy.kind !== 'house' && toy.kind !== 'boat' && Math.hypot(toy.x - spot.x, toy.z - spot.z) < SEA_FOOT[toy.kind] + GULL_LONG + 0.1)) continue
    return spot
  }
  return null
}
