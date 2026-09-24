import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildCreature, CREATURE_ORDER } from './creatures'
import { blankPose, CREATURE_STACK, PERSONALITIES, restPose, SKY_HOMES, skyDepth, skyScale } from './motion'
import { placeCreature } from './view/game'

describe('creature cards', () => {
  it('keep their paper in its own layer through every idle and tap reaction in the sky, so none sweeps through a neighbour', () => {
    const group = new THREE.Group()
    const corner = new THREE.Vector3()
    const escapes: string[] = []
    for (const kind of CREATURE_ORDER) {
      const { bounds, center } = buildCreature(kind)
      const personality = PERSONALITIES[kind]
      SKY_HOMES.forEach((home, slot) => {
        for (let k = 0; k <= 1; k += 1 / 64) {
          const pose = restPose(blankPose())
          personality.idle(slot * 1.7 + k * personality.reactSeconds, home.x, home.y, pose)
          pose.z = skyDepth(slot)
          pose.scale = skyScale(kind)
          personality.react(k, pose)
          placeCreature(group, pose)
          group.updateMatrixWorld()
          const back = pose.z + CREATURE_STACK.drop * pose.scale
          const front = pose.z + CREATURE_STACK.front * pose.scale
          for (const x of [bounds.x0 - center.x, bounds.x1 - center.x])
            for (const y of [bounds.y0 - center.y, bounds.y1 - center.y])
              for (const z of [CREATURE_STACK.drop, CREATURE_STACK.front]) {
                corner.set(x, y, z).applyMatrix4(group.matrixWorld)
                if (corner.z < back - 1e-6 || corner.z > front + 1e-6) escapes.push(`${kind} in slot ${slot} at k ${k.toFixed(2)}: z ${corner.z.toFixed(2)} outside ${back.toFixed(2)}..${front.toFixed(2)}`)
              }
        }
      })
    }
    expect(escapes.slice(0, 4), `${escapes.length} corners out of their layer`).toEqual([])
  })

  it('turn over about the hinge edge in their own plane while peeling off the screen', () => {
    const group = new THREE.Group()
    const pose = blankPose()
    pose.x = 4
    pose.z = 1.3
    pose.hinge = -12
    for (const facing of [1, 0.5, 0, -0.5, -1]) {
      pose.facing = facing
      placeCreature(group, pose)
      group.updateMatrixWorld()
      const hinge = new THREE.Vector3(pose.hinge, 0, 0).applyMatrix4(group.matrixWorld)
      expect(hinge.x).toBeCloseTo(pose.x + pose.hinge, 6)
      expect(group.position.z).toBe(pose.z)
    }
  })
})
