import * as THREE from 'three'
import { LID, RIM_OUT, TRAY_HALF, TRAY_Z } from './toys'

// The camera, made from the surface's shape and nothing else: it looks down
// on the turntable as from above a table, and stands just far enough back for
// the whole place to be in the frame at any size. The rules never see it; the
// Mount uses it to turn a touch into a point of the world, and a test uses it
// to measure the targets as they come out on the glass.

/** Degrees the camera looks down by, and its field of view top to bottom. */
export const LOOK_DOWN = 27
export const FIELD = 24
/**
 * The sea's far edge is the horizon of the diorama: beyond it is sky. On a wide surface it is close behind the
 * turntable; on a tall one the sea runs further back, where the residents are.
 */
export function seaFarZ(width: number, height: number): number {
  return width / height >= WIDE_FROM ? -7.6 : -11.2
}
/** The sea is a round plate about a point in front of the island, so it reaches further toward the child than away. */
export const SEA_MIDDLE_Z = 9
/** How much sky the frame keeps above the horizon, as a height standing on the sea's far edge. */
const SKY = 1.1
/** A surface at least this much wider than tall has the residents at its sides; a taller one has them behind the turntable. */
export const WIDE_FROM = 1.2

export type Posts = {
  /** The gull's bell buoy. */
  buoy: { x: number; z: number }
  /** Where the wave lies. */
  wave: { x: number; z: number }
  /** The whale. */
  whale: { x: number; z: number }
}

/**
 * Where the residents of the sea are, by the surface's shape. On a wide surface they are close against the
 * turntable, which fills the width between the buoy and the wave; on a tall one they are behind it.
 */
export function postsFor(width: number, height: number): Posts {
  return width / height >= WIDE_FROM
    ? { buoy: { x: -7.75, z: -0.2 }, wave: { x: 8.3, z: -3 }, whale: { x: -7.2, z: 5.5 } }
    : { buoy: { x: -4.6, z: -8.6 }, wave: { x: 5.5, z: -9.1 }, whale: { x: -3.6, z: 13.4 } }
}

/**
 * The points that must be in the frame: the rim all round, the tray, the buoy with the gull on it, the gull
 * in the smoke above a house at the back of the land, and the wave as far as its eyes. The far islets, the clouds and the wave's back may be cut by the frame's edge.
 */
function mustSee(posts: Posts, farZ: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i < 12; i++) points.push(new THREE.Vector3(Math.cos((i / 12) * Math.PI * 2) * (RIM_OUT + 0.1), 0, Math.sin((i / 12) * Math.PI * 2) * (RIM_OUT + 0.1)))
  for (const x of [-TRAY_HALF.x, TRAY_HALF.x]) points.push(new THREE.Vector3(x, 0, TRAY_Z + TRAY_HALF.z + 0.28), new THREE.Vector3(x, 0, TRAY_Z - TRAY_HALF.z))
  points.push(new THREE.Vector3(posts.buoy.x - 0.8, 0, posts.buoy.z), new THREE.Vector3(posts.buoy.x, 3.75, posts.buoy.z))
  // The lid: the gull in the smoke of a house at the very back of the land, and the cat in a leap, stay under it (toys.ts).
  points.push(new THREE.Vector3(0, LID.y, LID.z))
  points.push(new THREE.Vector3(posts.wave.x + 0.7, 0, posts.wave.z), new THREE.Vector3(posts.wave.x, 3, posts.wave.z))
  points.push(new THREE.Vector3(0, SKY, farZ))
  return points
}

/**
 * Sets `camera` for a surface of that size: as near as it can stand with every point that must be seen inside
 * the frame, looking at the point in front of the island's middle that leaves as much room above them as below.
 */
export function frame(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  camera.fov = FIELD
  camera.aspect = width / height
  camera.near = 1
  camera.far = 140
  const down = (LOOK_DOWN * Math.PI) / 180, points = mustSee(postsFor(width, height), seaFarZ(width, height)), seen = new THREE.Vector3(), aim = new THREE.Vector3(0, 0.4, 2)
  const stand = (distance: number): void => {
    camera.position.set(aim.x, aim.y + Math.sin(down) * distance, aim.z + Math.cos(down) * distance)
    camera.lookAt(aim)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }
  /** Stands at that distance, aimed so the highest and the lowest point are as far from the frame's middle as each other, and says whether all are in the frame. */
  const fits = (distance: number): boolean => {
    let back = -12, front = 16, across = 0
    for (let i = 0; i < 22; i++) {
      aim.z = (back + front) / 2
      stand(distance)
      let top = -Infinity, bottom = Infinity
      across = 0
      for (const point of points) {
        seen.copy(point).project(camera)
        top = Math.max(top, seen.y)
        bottom = Math.min(bottom, seen.y)
        across = Math.max(across, Math.abs(seen.x))
      }
      // Too much room above: look further forward, which takes everything up the glass.
      if (top + bottom < 0) back = aim.z
      else front = aim.z
      if (i === 21) return across <= 0.985 && top <= 0.96 && bottom >= -0.96
    }
    return false
  }
  // The nearest distance from which every point is inside the frame with a small margin, found by halving.
  let near = 8, far = 120
  for (let i = 0; i < 24; i++) {
    const distance = (near + far) / 2
    if (fits(distance)) far = distance
    else near = distance
  }
  fits(far)
}

/** What the rules of a touch need of the camera, so that they can be tested with a real one and no canvas. */
export type Lens = {
  width: number
  height: number
  /** The point of the plane at that height under a point of the glass, or null where the glass shows the sky. */
  ground(px: number, py: number, y?: number): { x: number; z: number } | null
  /** Where a point of the world comes out on the glass. */
  glass(x: number, y: number, z: number): { x: number; y: number }
  /** How many pixels one unit of length is, at that point of the world. */
  scale(x: number, y: number, z: number): number
}

export function lensOf(camera: THREE.PerspectiveCamera, width: number, height: number): Lens {
  const far = seaFarZ(width, height), ray = new THREE.Raycaster(), point = new THREE.Vector2(), v = new THREE.Vector3(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3()
  const glass = (x: number, y: number, z: number): { x: number; y: number } => {
    v.set(x, y, z).project(camera)
    return { x: (v.x * 0.5 + 0.5) * width, y: (0.5 - v.y * 0.5) * height }
  }
  return {
    width,
    height,
    ground(px, py, y = 0) {
      point.set((px / width) * 2 - 1, 1 - (py / height) * 2)
      ray.setFromCamera(point, camera)
      plane.constant = -y
      const found = ray.ray.intersectPlane(plane, hit)
      // Beyond the round edge of the sea the glass shows the sky.
      return found && Math.hypot(hit.x, hit.z - SEA_MIDDLE_Z) <= SEA_MIDDLE_Z - far ? { x: hit.x, z: hit.z } : null
    },
    glass,
    scale(x, y, z) {
      const a = glass(x - 0.5, y, z), b = glass(x + 0.5, y, z)
      return Math.hypot(b.x - a.x, b.y - a.y)
    },
  }
}
