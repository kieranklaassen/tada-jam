import { smoothstep } from './math'

// The hillside in world units (about a centimetre each): x runs right, z runs
// toward the child, y is up. The hill rises gently away from the child to a
// crest near the back, so the whole slope faces the camera. Everything that
// sits on the hill asks `groundY` for its height.

export type Point = { x: number; z: number }

export const HILL = { left: -96, right: 96, near: 44, far: -70, crestZ: -52, crestY: 13 }

/** Where seeds and critters may rest: the open grass of the slope. */
export const GRASS = { left: -80, right: 80, near: 30, far: -40 }

export const PLOTS: readonly Point[] = [
  { x: -34, z: 1 },
  { x: 0, z: -15 },
  { x: 34, z: 1 },
]
export const PLOT_RADIUS = 8.5
export const MOLEHILL_HEIGHT = 4.2
/** Height of a bloomed flower head above the molehill top. */
export const STEM_HEIGHT = 15.5

export const POUCH: Point = { x: -62, z: 19 }
export const POUCH_HEIGHT = 12
export const POUCH_RADIUS = 9
/** The three seeds sit in the pouch's mouth: red, yellow, blue from left to right, the middle one a little further back. */
export const POUCH_SLOTS: readonly Point[] = [
  { x: POUCH.x - 5, z: POUCH.z + 1.4 },
  { x: POUCH.x, z: POUCH.z - 0.6 },
  { x: POUCH.x + 5, z: POUCH.z + 1.4 },
]
export const SEED_RADIUS = 2.8

export const SNAIL_PATH = { left: 14, right: 72, z: 27 }
/** Right of the meadow, level with the molehills, so the mouse's outings happen where the child looks. */
export const BURROW: Point = { x: 66, z: -6 }
/** Where the child sits, under the camera, for characters that turn to look at her. */
export const CHILD: Point = { x: 0, z: 210 }

/** Height of the felt hill at (x, z): a slope that rises to a rounded crest, with soft swells. */
export function groundY(x: number, z: number): number {
  const rise = HILL.crestY * smoothstep(HILL.near - 6, HILL.crestZ, z)
  const beyond = z < HILL.crestZ ? (HILL.crestZ - z) * (HILL.crestZ - z) * 0.018 : 0
  const swell = 3.2 * Math.exp(-((x + 8) * (x + 8)) / 2400 - ((z + 30) * (z + 30)) / 700)
  const ripple = 0.7 * Math.sin(x * 0.061 + 1.3) * Math.sin(z * 0.083 + 0.4)
  return rise - beyond + swell + ripple
}

/** Top of a molehill's dimple, where a seed goes in and a stem comes out. */
export function plotTop(plot: number): number {
  const p = PLOTS[plot]
  return groundY(p.x, p.z) + MOLEHILL_HEIGHT * 0.86
}

export function clampToGrass(x: number, z: number, out: Point): Point {
  out.x = Math.min(GRASS.right, Math.max(GRASS.left, x))
  out.z = Math.min(GRASS.near, Math.max(GRASS.far, z))
  return out
}

export function onGrass(x: number, z: number): boolean {
  return x >= GRASS.left && x <= GRASS.right && z >= GRASS.far && z <= GRASS.near
}

export function plotAt(x: number, z: number, slop = 0): number {
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i]
    if (Math.hypot(x - p.x, z - p.z) <= PLOT_RADIUS + slop) return i
  }
  return -1
}

export function onPouch(x: number, z: number): boolean {
  return Math.hypot(x - POUCH.x, z - POUCH.z) <= POUCH_RADIUS
}

/** Somewhere a seed can rest that is not a molehill or the pouch, as close to (x, z) as possible. */
export function restingSpot(x: number, z: number, taken: readonly Point[], out: Point): Point {
  clampToGrass(x, z, out)
  const startX = out.x
  const startZ = out.z
  for (let ring = 0; ring < 40; ring++) {
    const radius = ring * 2.4
    const steps = ring === 0 ? 1 : 6 + ring * 2
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2 + ring * 0.7
      const cx = startX + Math.cos(a) * radius
      const cz = startZ + Math.sin(a) * radius * 0.8
      if (!onGrass(cx, cz) || plotAt(cx, cz, SEED_RADIUS + 1.5) >= 0 || Math.hypot(cx - POUCH.x, cz - POUCH.z) < POUCH_RADIUS + SEED_RADIUS + 1) continue
      let free = true
      for (const other of taken) {
        if (Math.hypot(other.x - cx, other.z - cz) < SEED_RADIUS * 2.1) {
          free = false
          break
        }
      }
      if (free) {
        out.x = cx
        out.z = cz
        return out
      }
    }
  }
  return out
}
