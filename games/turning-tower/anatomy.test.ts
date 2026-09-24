import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BIRD, headPoint, riderPoint, tailFlick, tailPoint, torsoPoint, wingPoint } from './anatomy'
import type { BirdPose } from './motion'
import type { MutableVec3 } from './projection'
import { buildBird } from './view/characters'

// The clearance tests the bird's head, wings and tail against the walls
// through these functions, so they must put every point exactly where the
// rig draws it, in any pose.

const POSES: BirdPose[] = [
  { x: 1.2, y: 2.05, z: -0.7, heading: 0.9, alpha: 1, bob: 0.03, squash: 0.74, pitch: -0.2, headYaw: 1.3, headPitch: 0.5, headTilt: -0.3, wing: 0.9, wingLeft: 0.9, wingRight: 0.4, tail: 1.4, puff: 1.2, scale: 1, ground: 2 },
  { x: -3, y: 0.01, z: 4.4, heading: -2.6, alpha: 1, bob: 0.004, squash: 1.12, pitch: 0.44, headYaw: -1.6, headPitch: -0.6, headTilt: 0.35, wing: 0, wingLeft: 0, wingRight: 0, tail: -1.5, puff: 0, scale: 0.6, ground: 0 },
]

function world(mesh: THREE.Object3D, local: readonly number[]): MutableVec3 {
  const v = mesh.localToWorld(new THREE.Vector3(local[0], local[1], local[2]))
  return [v.x, v.y, v.z]
}

function part(root: THREE.Object3D, name: string): THREE.Object3D {
  const found = root.getObjectByName(name)
  if (!found) throw new Error(`no ${name}`)
  return found
}

describe('bird anatomy', () => {
  it('puts every body, head, wing and tail point where the rig draws it', () => {
    const rig = buildBird(new THREE.MeshBasicMaterial(), new THREE.Object3D())
    for (const pose of POSES) {
      rig.apply(pose)
      rig.root.updateMatrixWorld(true)
      const body = part(rig.root, 'body')
      const head = part(rig.root, 'head')
      const tail = part(rig.root, 'tail')
      for (const local of [[0.43, 0.16, 0.3], [-0.2, 0.95, -0.47], BIRD.neck] as const) {
        expect(torsoPoint(pose, pose.heading, pose.pitch, [...local])).toEqual(world(body, local).map((v) => expect.closeTo(v, 9)))
      }
      // The head's mesh is drawn about the middle of its ball.
      const [bx, by, bz] = BIRD.headBall.centre
      for (const local of [BIRD.beakTip, BIRD.headBall.centre, ...BIRD.crest]) {
        const drawn = world(head, [local[0] - bx, local[1] - by, local[2] - bz])
        expect(headPoint(pose, pose.heading, pose.pitch, pose.headYaw, pose.headPitch, local, [0, 0, 0])).toEqual(drawn.map((v) => expect.closeTo(v, 9)))
      }
      for (const local of BIRD.tailTips) {
        expect(tailPoint(pose, pose.heading, pose.pitch, tailFlick(pose.tail), local, [0, 0, 0])).toEqual(world(tail, local).map((v) => expect.closeTo(v, 9)))
      }
      for (const side of [1, -1]) {
        const wing = part(rig.root, side > 0 ? 'wing-right' : 'wing-left')
        const angle = side > 0 ? pose.wingRight : pose.wingLeft
        for (const local of [...BIRD.wingPlate, ...BIRD.wingAccent]) {
          const drawn = world(wing, [side * local[0], local[1], local[2]])
          expect(wingPoint(pose, pose.heading, pose.pitch, side, angle, local, [0, 0, 0])).toEqual(drawn.map((v) => expect.closeTo(v, 9)))
        }
      }
      expect(riderPoint(pose, [0, 0, 0])).toEqual(world(body, [0, BIRD.saddleTop, BIRD.riderZ]).map((v) => expect.closeTo(v, 9)))
    }
  })
})
