import { PIECES, SHAPES, type Vec2 } from './pieces'

// Where things are in the playroom. The build plane is z = 0 with the rug at
// y = 0; the wall is behind it and the wooden tray lies on the rug in front,
// tipped toward the child so every piece in it is a big, clear target.
// Controller hit tests and the view share these numbers.

export type Vec3 = { x: number; y: number; z: number }

export const WALL_Z = -2.4

export const TRAY = {
  center: { x: 0, y: 0.5, z: 4.1 },
  /** Tipped toward the viewer about the x axis, radians; shallow, so its back rim never hides the foot of a tower. */
  tilt: 0.18,
  halfX: 7.45,
  halfZ: 1.72,
  rim: 0.2,
}

export type TraySlot = {
  id: number
  /** Tray-local centre (x across, z toward the viewer) and the piece's turn in the tray. */
  x: number
  z: number
  angle: number
  halfX: number
  halfZ: number
}

function rowSlots(ids: readonly number[], z: number, turned: ReadonlySet<number>): TraySlot[] {
  const inner = TRAY.halfX * 2 - 0.5
  const widths = ids.map((id) => {
    const half = SHAPES[PIECES[id].kind].half
    return (turned.has(id) ? half.y : half.x) * 2
  })
  const gap = (inner - widths.reduce((a, b) => a + b, 0)) / (ids.length + 1)
  let x = -inner / 2 + gap
  return ids.map((id, i) => {
    const shape = SHAPES[PIECES[id].kind]
    const angle = turned.has(id) ? -Math.PI / 2 : 0
    const halfX = turned.has(id) ? shape.half.y : shape.half.x
    const halfZ = turned.has(id) ? shape.half.x : shape.half.y
    const slot = { id, x: x + widths[i] / 2, z, angle, halfX, halfZ }
    x += widths[i] + gap
    return slot
  })
}

const PILLARS = new Set([6, 10])

/** Back row: the big curved pieces and two cubes; front row: planks, pillars (lying along the row), cubes. */
export const TRAY_SLOTS: readonly TraySlot[] = [
  ...rowSlots([2, 5, 0, 1, 9, 7], -0.72, PILLARS),
  ...rowSlots([4, 6, 3, 8, 10, 11], 0.98, PILLARS),
].sort((a, b) => a.id - b.id)

/** A tray-local point (x across, z toward the viewer, lift above the bed) in the room. */
export function trayToWorld(x: number, z: number, lift = 0): Vec3 {
  const c = Math.cos(TRAY.tilt)
  const s = Math.sin(TRAY.tilt)
  return { x: TRAY.center.x + x, y: TRAY.center.y + lift * c + -z * s, z: TRAY.center.z + z * c + lift * s }
}

/**
 * The tray-local point under a lying piece's centre of mass, so its outline
 * is centred in the slot. Lying on its back, local +y points away from the
 * viewer (tray -z); turned pieces (pillars) are symmetric.
 */
export function slotCenter(slot: TraySlot): Vec2 {
  if (slot.angle !== 0) return { x: slot.x, y: slot.z }
  let minY = Infinity
  let maxY = -Infinity
  for (const p of SHAPES[PIECES[slot.id].kind].outline) {
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return { x: slot.x, y: slot.z + (minY + maxY) / 2 }
}

/** A watcher wanders between `min` and `max`; to give the doll room it may step out as far as `aside`. */
export type WatcherHome = { home: number; min: number; max: number; aside: number; z: number }

export const WATCHERS: readonly WatcherHome[] = [
  { home: -6.55, min: -7.05, max: -5.85, aside: -7.35, z: -1.05 },
  { home: 6.55, min: 5.95, max: 7.1, aside: 7.35, z: -0.95 },
]

/** Shallow enough that Bean, wandering in front of it, never reaches into it (his arms and a bow backward included). */
export const SHELF = { x0: 3.72, x1: 6.98, back: WALL_Z + 0.02, front: -1.65, boards: [0.22, 2.0, 4.0], top: 6.7, side: 0.16, board: 0.14 }
export const WINDOW = { x0: -7.7, x1: -4.3, y0: 4.7, y1: 8.7, sill: 4.62 }
/** The shade's rim radius sets where the lamp can stand: clear of the wall behind it and of the blocks in front. */
export const LAMP = { x: -2.75, z: -1.6, shadeY: 7.25, shade: 0.72, base: 0.65 }
export const PEG_RAIL = { x0: -1.75, x1: 2.3, y: 7.25, depth: 0.12 }
