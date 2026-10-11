import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { SNAIL } from '../visitor'
import { FRIENDS, HOME, PLANK, SAND, TRAY } from '../world'
import { FIELD_OF_VIEW, placeCamera } from './camera'

// The frame: the whole tray is in it whatever the shape of the surface, with room above the plank, and the friends
// are a good size in it.

function framed(width: number, height: number) {
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 1, 240)
  placeCamera(camera, width / height)
  const at = (x: number, y: number, z: number) => {
    const p = new THREE.Vector3(x, y, z).project(camera)
    return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height }
  }
  /** How far the line of sight through a point of the surface passes from a place in the world. */
  const ray = new THREE.Raycaster()
  const passes = (px: number, py: number, x: number, y: number, z: number) => {
    ray.setFromCamera(new THREE.Vector2((px / width) * 2 - 1, 1 - (py / height) * 2), camera)
    return Math.sqrt(ray.ray.distanceSqToPoint(new THREE.Vector3(x, y, z)))
  }
  return { at, passes, wide: (x: number, y: number, z: number, radius: number) => at(x + radius, y, z).x - at(x - radius, y, z).x }
}

const SHAPES: [number, number][] = [[1180, 820], [1024, 768], [1366, 1024], [1280, 720], [820, 1180], [700, 500], [390, 844], [2000, 600]]

describe('the frame', () => {
  it('holds the whole tray with its rim, and the air above the plank, whatever the shape of the surface', () => {
    const w = TRAY.halfWidth + TRAY.rimThick, d = TRAY.halfDepth + TRAY.rimThick
    for (const [width, height] of SHAPES) {
      const { at } = framed(width, height)
      const label = `${width} by ${height}`
      for (const [x, y, z] of [[-w, 0, d], [w, 0, d], [-w, TRAY.rimHeight, -d], [w, TRAY.rimHeight, -d], [-PLANK.halfLength, 6.5, PLANK.z], [PLANK.halfLength, 6.5, PLANK.z]]) {
        const p = at(x, y, z)
        expect(p.x, label).toBeGreaterThanOrEqual(0)
        expect(p.x, label).toBeLessThanOrEqual(width)
        expect(p.y, label).toBeGreaterThanOrEqual(0)
        expect(p.y, label).toBeLessThanOrEqual(height)
      }
    }
  })

  it('fills the surface the game is drawn for: the tray reaches nearly from side to side and from the bottom to four fifths of the way up', () => {
    const { at } = framed(1180, 820)
    const w = TRAY.halfWidth + TRAY.rimThick, d = TRAY.halfDepth + TRAY.rimThick
    expect(at(w, 0, d).x - at(-w, 0, d).x).toBeGreaterThan(1180 * 0.93)
    expect(at(0, 0, d).y).toBeGreaterThan(820 * 0.93)
    expect(at(0, TRAY.rimHeight, -d).y).toBeLessThan(820 * 0.26)
  })

  it('shows every friend as a target of a hundred logical pixels or more, where it stands in front, on a seat and at the far rim', () => {
    const { wide } = framed(1180, 820)
    const sizes = {
      pim: wide(HOME.pim.x, FRIENDS.pim.halfHeight, HOME.pim.z, FRIENDS.pim.radius),
      mog: wide(PLANK.seat, PLANK.pivotHeight + FRIENDS.mog.halfHeight, PLANK.z, FRIENDS.mog.radius),
      dot: wide(HOME.dot.x, FRIENDS.dot.halfHeight, HOME.dot.z, FRIENDS.dot.radius),
      bo: wide(HOME.bo.x, FRIENDS.bo.halfHeight, HOME.bo.z, FRIENDS.bo.radius),
    }
    for (const size of Object.values(sizes)) expect(size).toBeGreaterThanOrEqual(100)
    // Between a twelfth and a fifth of the frame's width each.
    expect(sizes.pim / 1180).toBeGreaterThan(0.085)
    expect(sizes.bo / 1180).toBeGreaterThan(0.15)
    expect(sizes.bo / 1180).toBeLessThan(0.2)
  })

  it('keeps the friends out of the bottom strip, where wrists rest', () => {
    const { at } = framed(1180, 820)
    // The nearest a friend's underside comes to the child: at the front of the sand.
    expect(at(0, 0, SAND.maxZ + FRIENDS.pim.radius).y).toBeLessThan(820 * 0.9)
  })

  // The shell that holds the game lays one round home control over it: 48 px across, 10 px from the top edge, in the
  // middle. A finger on it goes home, so nothing of the game's that answers a finger may lie under it.
  it('keeps the snail clear of the home control at the top centre, whatever the shape of the surface: neither its picture nor its reach comes under it', () => {
    const control = { radius: 24, top: 10 }
    for (const [width, height] of SHAPES) {
      const { at, passes } = framed(width, height)
      const label = `${width} by ${height}`
      // The nearest it comes to the middle: at the inner end of its line, facing the middle, its foot stretched and its eyes out.
      const head = at(-SNAIL.near + 1.55, 0.5, SNAIL.z)
      expect(head.x, label).toBeLessThan(width / 2 - control.radius)
      // And no finger on the control touches it there: the reach round it that counts as a touch ends short of the control.
      for (let step = 0; step < 16; step++) {
        const angle = (step / 16) * Math.PI * 2
        const px = width / 2 + Math.cos(angle) * control.radius, py = control.top + control.radius + Math.sin(angle) * control.radius
        expect(passes(px, py, -SNAIL.near, 0.3, SNAIL.z), label).toBeGreaterThan(SNAIL.touch)
      }
    }
  })
})
