// What an idle child is shown, as three.js draws it: a soft ring on the sand
// where a touch could go, and a ghost hand that taps there once. It shows a
// move and never tells: no arrow, no word, no sound (guidance.ts).

import * as THREE from 'three'
import type { HandPose } from './guidance'
import type { Place } from './layout'
import { GUIDE_PAINT } from './look'
import { at, ball, mould, rod } from './mould'

/** How far above the thing the fingertip hovers before it presses on it, in yard units. */
const HOVER_ABOVE = 0.75

export type GuideView = {
  root: THREE.Group
  /** `glow` is 0 to 1; `hand` is the pose of the demonstration that is playing, or null; `at` is where a touch could go, and `reach` how wide the thing there is, and `high` how high its picture stands: the ring goes round it on the sand, and the hand presses on the thing itself. */
  show: (glow: number, hand: HandPose | null, at: Place, reach: number, high: number, now: number) => void
  dispose: () => void
}

export function buildGuideView(): GuideView {
  const root = new THREE.Group()
  root.name = 'guide'

  const ringShape = new THREE.RingGeometry(0.62, 0.86, 40)
  ringShape.rotateX(-Math.PI / 2)
  const ringPaint = new THREE.MeshBasicMaterial({ color: GUIDE_PAINT.ring, transparent: true, opacity: 0, depthWrite: false })
  const ring = new THREE.Mesh(ringShape, ringPaint)
  ring.name = 'guide-ring'
  ring.position.y = 0.03
  ring.renderOrder = 1
  ring.visible = false
  root.add(ring)

  // A mitten with one finger out, reaching into the yard from the child's side: the palm is nearest the child
  // and raised, and the fingertip, at the group's origin, points at the sand. It is lit like the toys, so it
  // has a shape, and it is a colour the sand and the grass do not have, so it shows on both.
  const handPaint = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false })
  const hand = new THREE.Mesh(
    mould([
      at(rod(0.1, 0.085, 0.62, GUIDE_PAINT.hand, 10), 0, 0, 0.33, Math.PI / 2),
      at(ball(0.088, GUIDE_PAINT.hand, [1, 1, 1], 10), 0, 0, 0.03),
      at(ball(0.34, GUIDE_PAINT.hand, [1, 0.6, 1.1], 12), 0.1, 0.02, 0.95),
      at(ball(0.12, GUIDE_PAINT.hand, [1, 0.9, 1.3], 10), 0.2, 0, 0.62),
      at(ball(0.115, GUIDE_PAINT.hand, [1, 0.9, 1.2], 10), 0.36, 0, 0.72),
      at(ball(0.13, GUIDE_PAINT.hand, [1, 0.9, 1.6], 10), -0.26, -0.02, 0.8, 0, 0.5),
      at(rod(0.3, 0.27, 0.3, GUIDE_PAINT.cuff, 12), 0.1, 0.02, 1.42, Math.PI / 2),
    ]),
    handPaint,
  )
  hand.name = 'guide-hand'
  hand.rotation.x = -0.45
  hand.scale.setScalar(1.7)
  hand.renderOrder = 3
  hand.visible = false
  root.add(hand)

  return {
    root,
    show: (glow, pose, at, reach, high, now) => {
      root.position.set(at.x, 0, at.z)
      ring.visible = glow > 0.01
      if (ring.visible) {
        // It breathes: a little wider and fainter, then back.
        const breath = 0.5 + 0.5 * Math.sin(now * 3.2)
        ringPaint.opacity = glow * (0.5 + 0.3 * breath)
        ring.scale.setScalar((reach / 0.74) * (1 + 0.06 * breath))
      }
      hand.visible = pose !== null && pose.opacity > 0.01
      if (pose && hand.visible) {
        handPaint.opacity = pose.opacity * 0.92
        hand.position.y = high + HOVER_ABOVE * (1 - pose.press)
      }
    },
    dispose: () => {
      ringShape.dispose()
      ringPaint.dispose()
      hand.geometry.dispose()
      handPaint.dispose()
    },
  }
}
