import type { Lens } from './camera'
import { CAT_TALL } from './place'
import { FOOT, GULL_TALL, LAND_R, LAND_Y, RIM_IN, RIM_OUT, TALL, overTray, type Kind } from './toys'

// What a finger is on. The answer is worked out from where things stand in
// the world and how they come out on the glass, never from the meshes, so a
// small hand gets a target as wide as the rules of the band ask for however
// thin the thing is drawn, and a test can measure every target with a real
// camera and no canvas.

export type Target =
  /** A toy in its slot of the tray, or hanging in the hand above it. */
  | { kind: 'slot'; toy: Kind }
  /** A toy standing on the turntable. */
  | { kind: 'toy'; toy: Kind }
  | { kind: 'cat' }
  | { kind: 'gull' }
  | { kind: 'wave' }
  | { kind: 'whale' }
  /** Ground, with the point of the world under the finger. `rim` is the wooden edge, `sea` the water inside it, `open` the water outside. */
  | { kind: 'land' | 'sea' | 'rim' | 'open' | 'tray'; x: number; z: number }
  /** A cloud, with where it hangs in the world and how big it is there; the sun; bare sky. */
  | { kind: 'cloud'; index: number; x: number; y: number; z: number; size: number }
  | { kind: 'sun' }
  | { kind: 'sky' }

/** Where everything that can be touched stands at this moment, in the world. */
export type Standing = {
  /** `lies` is given for a toy that lies down where it stands (the tree afloat, a log): the two ends of it, in the world. */
  toys: readonly { kind: Kind; at: 'slot' | 'hand' | 'out' | 'air'; x: number; y: number; z: number; scale: number; lies?: readonly [Point3, Point3] }[]
  cat: { x: number; y: number; z: number }
  gull: { x: number; y: number; z: number }
  wave: { x: number; z: number }
  whale: { x: number; z: number }
}

type Point3 = { x: number; y: number; z: number }

/** What hangs in the sky, in the world: each with its middle and its radius there. The view knows; the rules do not. */
export type Sky = {
  clouds: readonly { x: number; y: number; z: number; r: number }[]
  sun: { x: number; y: number; z: number; r: number }
}

/** The least half-width of a thing in the sky on the glass, in pixels. */
export const SKY_REACH = 44

/** The least half-width of a target on the glass, in pixels: a toy in the tray, a toy on the island, a resident. */
export const SLOT_REACH = 50
export const TOY_REACH = 40
export const RESIDENT_REACH = 48
/** How near the middles of two things are, in the world, when one stands on the other. */
const STACKED = 0.3
/** How far above its top a thing can still be touched, in pixels. */
const OVER_TOP = 14

/** How far a point of the glass is from the upright line of a thing that stands `tall` high at (x, y, z), over its reach: under 1 is a hit. */
function near(lens: Lens, px: number, py: number, x: number, y: number, z: number, tall: number, reach: number): number {
  return along(lens, px, py, x, y, z, x, y + tall, z, reach, true)
}

/** How far a point of the glass is from the line between two points of the world, over its reach: under 1 is a hit. */
function along(lens: Lens, px: number, py: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, reach: number, upright: boolean): number {
  const a = lens.glass(ax, ay, az), b = lens.glass(bx, by, bz)
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy
  const raw = length === 0 ? 0 : ((px - a.x) * dx + (py - a.y) * dy) / length
  // Above its top a thing ends soon: what stands behind it on the glass is not it.
  if (upright && (raw - 1) * Math.sqrt(length) > OVER_TOP) return Infinity
  const part = Math.max(0, Math.min(1, raw))
  return Math.hypot(px - (a.x + dx * part), py - (a.y + dy * part)) / reach
}

/** How wide a toy's target is on the glass, from its middle to its edge. */
export function reachOf(lens: Lens, kind: Kind, x: number, y: number, z: number, scale: number, least: number): number {
  return Math.max(least, FOOT[kind] * scale * lens.scale(x, y, z) + 10)
}

export function pick(lens: Lens, px: number, py: number, standing: Standing, sky: Sky | null = null): Target {
  // The tray's toys first: they are the nearest things to the child and the ones a first touch is for.
  let best: Target | null = null, bestD = 1
  for (const toy of standing.toys) {
    if (toy.at !== 'slot' && toy.at !== 'hand') continue
    const d = near(lens, px, py, toy.x, toy.y, toy.z, TALL[toy.kind] * toy.scale, reachOf(lens, toy.kind, toy.x, toy.y, toy.z, toy.scale, SLOT_REACH))
    if (d < bestD) { best = { kind: 'slot', toy: toy.kind }; bestD = d }
  }
  if (best) return best
  // Then whatever stands on the island and whoever lives there. Of those under the finger the one the finger is
  // nearest wins; and where one stands in front of another and the finger is well on both, the one in front:
  // a touch on what the child sees is never taken for the thing behind it.
  const { cat, gull, wave, whale } = standing
  const hits: { target: Target; d: number; x: number; y: number; z: number }[] = []
  for (const toy of standing.toys) {
    if (toy.at !== 'out') continue
    const reach = reachOf(lens, toy.kind, toy.x, toy.y, toy.z, toy.scale, TOY_REACH)
    // A toy that lies down is touched along its length, as it is drawn; one that stands, up its height.
    const d = toy.lies
      ? along(lens, px, py, toy.lies[0].x, toy.lies[0].y, toy.lies[0].z, toy.lies[1].x, toy.lies[1].y, toy.lies[1].z, reach, false)
      : near(lens, px, py, toy.x, toy.y, toy.z, TALL[toy.kind] * toy.scale, reach)
    if (d < 1) hits.push({ target: { kind: 'toy', toy: toy.kind }, d, x: toy.x, y: toy.y, z: toy.z })
  }
  // The residents up to the top of what is drawn of them: the cat to the tips of its ears.
  const catD = near(lens, px, py, cat.x, cat.y, cat.z, CAT_TALL, Math.max(RESIDENT_REACH, 0.9 * lens.scale(cat.x, cat.y, cat.z)))
  if (catD < 1) hits.push({ target: { kind: 'cat' }, d: catD, ...cat })
  const gullD = near(lens, px, py, gull.x, gull.y, gull.z, GULL_TALL, Math.max(RESIDENT_REACH, 0.85 * lens.scale(gull.x, gull.y, gull.z)))
  if (gullD < 1) hits.push({ target: { kind: 'gull' }, d: gullD, ...gull })
  if (hits.length > 0) {
    let hit = hits[0]
    for (const other of hits) if (other.d < hit.d) hit = other
    for (const other of hits) if (other.d < 0.75 && other.z > hit.z + 0.5) hit = other
    // Where two of them share a place, the one that stands on the other is the one touched from its feet up: the
    // sheep aboard, not the boat under it. Below its feet the finger is on the one underneath: the boat's hull.
    for (const other of hits) if (other.y > hit.y && Math.hypot(other.x - hit.x, other.z - hit.z) < STACKED && py <= lens.glass(other.x, other.y, other.z).y) hit = other
    return hit.target
  }
  if (near(lens, px, py, wave.x, 0.9, wave.z, 0.9, Math.max(RESIDENT_REACH + 8, 1.9 * lens.scale(wave.x, 0, wave.z))) < 1) return { kind: 'wave' }
  if (near(lens, px, py, whale.x, 0.2, whale.z, 0.4, Math.max(RESIDENT_REACH, 1.4 * lens.scale(whale.x, 0, whale.z))) < 1) return { kind: 'whale' }
  // Then the ground. The land is looked for at its own height, so a finger on its far edge is on the land.
  const top = lens.ground(px, py, LAND_Y)
  if (top && Math.hypot(top.x, top.z) <= LAND_R) return { kind: 'land', x: top.x, z: top.z }
  const sea = lens.ground(px, py, 0)
  if (!sea) {
    // Above the sea's far edge: a cloud, the sun, or bare sky.
    if (sky) {
      for (let index = 0; index < sky.clouds.length; index++) {
        const cloud = sky.clouds[index], at = lens.glass(cloud.x, cloud.y, cloud.z)
        if (Math.hypot(px - at.x, py - at.y) <= Math.max(SKY_REACH, cloud.r * lens.scale(cloud.x, cloud.y, cloud.z))) return { kind: 'cloud', index, x: cloud.x, y: cloud.y, z: cloud.z, size: cloud.r }
      }
      const sun = lens.glass(sky.sun.x, sky.sun.y, sky.sun.z)
      if (Math.hypot(px - sun.x, py - sun.y) <= Math.max(SKY_REACH, sky.sun.r * lens.scale(sky.sun.x, sky.sun.y, sky.sun.z))) return { kind: 'sun' }
    }
    return { kind: 'sky' }
  }
  if (overTray(sea.x, sea.z)) return { kind: 'tray', x: sea.x, z: sea.z }
  const r = Math.hypot(sea.x, sea.z)
  if (r <= RIM_IN - 0.15) return { kind: r <= LAND_R + 0.2 ? 'land' : 'sea', x: sea.x, z: sea.z }
  if (r <= RIM_OUT + 0.35) return { kind: 'rim', x: sea.x, z: sea.z }
  return { kind: 'open', x: sea.x, z: sea.z }
}

/**
 * The ground under a fingertip that carries a toy: the top of the land where the finger is over the land, else
 * the water. The ring that shows where the toy will come down is drawn there, so it lies under the fingertip.
 */
export function under(lens: Lens, px: number, py: number): { x: number; z: number } | null {
  const land = lens.ground(px, py, LAND_Y)
  return land && Math.hypot(land.x, land.z) <= LAND_R ? land : lens.ground(px, py)
}
