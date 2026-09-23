import { PART_KINDS, type PartKind } from './parts'

// The workshop bench in world units (about a centimetre each). The bench
// plane is y = 0; +x is right, +z is toward the child. The camera frames
// the walkable bench and the tray; the tray of parts sits on the right, the
// turntable where a sleepy lump waits sits left of centre, and awake
// critters roam the rest. It is kept compact so a critter is big on screen.

export type Point = { x: number; z: number }

/** The fixed camera: in front of the bench, looking down at it. */
export const CAMERA = { pitch: (40 * Math.PI) / 180, fov: 28, target: { x: -3, y: 0, z: 1 } } as const

export const BOARD = { x: -6, z: 0, halfWidth: 54, halfDepth: 31 } as const

export const TURNTABLE = { x: -14, z: -3, r: 11, height: 1.6 } as const

export const TRAY = { x: 33, z: -1, halfWidth: 11, halfDepth: 26, height: 1.1 } as const

/** Tray slots, two columns by five rows, in PART_KINDS order: legs at the front where small hands reach first. */
const COLUMNS = [27.8, 38.2]
const ROWS = [19.4, 9.2, -1, -11.2, -21.4]

export const TRAY_SLOT_RADIUS = 4.7

export function traySlot(kind: PartKind): Point {
  const index = PART_KINDS.indexOf(kind)
  return { x: COLUMNS[index % 2], z: ROWS[Math.floor(index / 2)] }
}

/** Where awake critters may walk: the bench in front of the tray and around the turntable. */
export const WALK = { minX: -44, maxX: 14, minZ: -21, maxZ: 24, turntableClearance: 15 } as const

export function insideWalk(at: Point, margin = 0): boolean {
  if (at.x < WALK.minX + margin || at.x > WALK.maxX - margin || at.z < WALK.minZ + margin || at.z > WALK.maxZ - margin) return false
  return Math.hypot(at.x - TURNTABLE.x, at.z - TURNTABLE.z) >= WALK.turntableClearance + margin
}

/** Push a point back inside the walkable area (into `out` when given, so the frame loop allocates nothing). */
export function clampWalk(at: Point, margin = 0, out: Point = { x: 0, z: 0 }): Point {
  let x = Math.min(WALK.maxX - margin, Math.max(WALK.minX + margin, at.x))
  let z = Math.min(WALK.maxZ - margin, Math.max(WALK.minZ + margin, at.z))
  const dx = x - TURNTABLE.x
  const dz = z - TURNTABLE.z
  const d = Math.hypot(dx, dz)
  const clear = WALK.turntableClearance + margin
  if (d < clear) {
    const k = d < 1e-6 ? 1 : clear / d
    x = TURNTABLE.x + (d < 1e-6 ? clear : dx * k)
    z = TURNTABLE.z + (d < 1e-6 ? 0 : dz * k)
    const minZ = WALK.minZ + margin
    const maxZ = WALK.maxZ - margin
    if (z < minZ || z > maxZ) {
      // The clearance ring reaches past the bench edge here: slide sideways around it instead.
      z = Math.min(maxZ, Math.max(minZ, z))
      const side = Math.sqrt(Math.max(0, clear * clear - (z - TURNTABLE.z) ** 2))
      x = TURNTABLE.x + (dx >= 0 ? side : -side)
    }
  }
  out.x = x
  out.z = z
  return out
}

/**
 * The strip between the camera and the turntable. The camera is low (40 degrees), so a critter standing
 * here covers the sleeper's face, nose, and sockets: critters pass through it but never stop in it.
 */
export function blocksTurntable(at: Point): boolean {
  return at.z - TURNTABLE.z > 4 && Math.abs(at.x - TURNTABLE.x) < TURNTABLE.r + 6
}

/** Where a freshly woken critter lands when it hops off the turntable: front left, clear of the lump and of the tray side. */
export const WAKE_LANDING: Point = { x: TURNTABLE.x - 20, z: TURNTABLE.z + 12 }

export function onTurntable(at: Point, slop = 0): boolean {
  return Math.hypot(at.x - TURNTABLE.x, at.z - TURNTABLE.z) <= TURNTABLE.r + slop
}
