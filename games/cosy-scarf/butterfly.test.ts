import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { loomDistance } from './balls'
import { BUTTERFLY } from './layout'
import { BUTTERFLY_MOTION, butterflyBody, butterflyWing, WING_OPEN, WING_SHUT, wingFold } from './view/props'

// The butterfly perched on the loom: wings open or shut, breathing and
// fluttering, bobbing, hopping, swaying and swelling as it pops in, it never
// goes into the loom or the felt hanging from it, its own head, or its other wing.

const wing = butterflyWing()
const body = butterflyBody()
/** Its head ball and bead eyes, as `butterflyBody` sews them on. */
const HEAD = { at: new THREE.Vector3(0, 4.6, 0.2), r: 1.5 }
const EYES = [-0.62, 0.62].map((x) => ({ at: new THREE.Vector3(x, 4.9, 1.2), r: 0.42 }))

const folds = Array.from({ length: 13 }, (_, i) => WING_OPEN + ((WING_SHUT - WING_OPEN) * i) / 12)

function eachVertex(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, visit: (v: THREE.Vector3) => void): void {
  const v = new THREE.Vector3()
  const p = geometry.attributes.position
  for (let i = 0; i < p.count; i++) visit(v.fromBufferAttribute(p, i).applyMatrix4(matrix))
}

describe('the butterfly on the loom', () => {
  it('folds its wings only between lying flat open and shut, however the springs overshoot and the flutter swings', () => {
    for (let open = -0.3; open <= 1.3; open += 0.05)
      for (let since = 0; since <= 1.2; since += 0.01) {
        const fold = wingFold(open, since, since * 7.3)
        expect(fold).toBeGreaterThanOrEqual(WING_OPEN)
        expect(fold).toBeLessThanOrEqual(WING_SHUT)
      }
  })

  it('stays clear of the loom and its felt, wings open or shut, bobbing, hopping, swaying and swelling as it pops in', () => {
    const perch = new THREE.Matrix4()
    const turn = new THREE.Matrix4()
    const matrix = new THREE.Matrix4()
    const mirror = new THREE.Matrix4().makeScale(-1, 1, 1)
    let nearest = { distance: Infinity, at: '' }
    for (const lift of [-BUTTERFLY_MOTION.bob, BUTTERFLY_MOTION.bob, BUTTERFLY_MOTION.bob + BUTTERFLY_MOTION.hop])
      for (const sway of [-BUTTERFLY_MOTION.sway, BUTTERFLY_MOTION.sway])
        for (const size of [0.4, 0.8, 1, BUTTERFLY_MOTION.biggest]) {
          perch.compose(new THREE.Vector3(BUTTERFLY.x, BUTTERFLY.y + lift, BUTTERFLY.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sway)), new THREE.Vector3(size, size, size))
          const look = (part: string) => (v: THREE.Vector3) => {
            const distance = loomDistance(v)
            if (distance < nearest.distance) nearest = { distance, at: `${part} lift=${lift} sway=${sway} size=${size}` }
          }
          eachVertex(body, perch, look('body'))
          for (const fold of folds) {
            eachVertex(wing, matrix.multiplyMatrices(perch, turn.makeRotationY(-fold)), look(`wing-r fold=${fold.toFixed(2)}`))
            eachVertex(wing, matrix.multiplyMatrices(perch, turn.makeRotationY(fold)).multiply(mirror), look(`wing-l fold=${fold.toFixed(2)}`))
          }
        }
    expect(nearest.distance, nearest.at).toBeGreaterThan(0)
  })

  it('keeps its wings clear of its head and bead eyes, and of each other, however far they fold', () => {
    const turn = new THREE.Matrix4()
    let intoHead = { depth: -Infinity, at: '' }
    let pastMiddle = -Infinity
    for (const fold of folds)
      eachVertex(wing, turn.makeRotationY(-fold), (v) => {
        for (const ball of [HEAD, ...EYES]) {
          const depth = ball.r - v.distanceTo(ball.at)
          if (depth > intoHead.depth) intoHead = { depth, at: `fold=${fold.toFixed(2)} at (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})` }
        }
        // The left wing is this one mirrored: they meet only where this one crosses the middle.
        pastMiddle = Math.max(pastMiddle, -v.x)
      })
    expect(intoHead.depth, intoHead.at).toBeLessThan(0)
    expect(pastMiddle).toBeLessThanOrEqual(0)
  })
})
