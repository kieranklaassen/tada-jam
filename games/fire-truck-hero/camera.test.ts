import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CAMERA_FOV, frameCamera } from './camera'
import { BELL, GATE, PEEK, PEEK_X, SPOTS } from './layout'

// The jam draws one round home control over every game: 48 px across, at the
// top centre of the surface, 10 px from its top edge.
const HOME = { fromTop: 10, across: 48 }
/** A gap a child can see between the control and what stands nearest it, in px. */
const CLEAR = 8
/** Half the width of the fattest thing that waits: a puff of smoke at its biggest, in yard units. */
const BODY = 0.5

/** Surfaces wider than tall, where the far fence comes near the top edge. */
const WIDE: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [1366, 1024], [1600, 760]]

/** How far a point of the yard comes from the rim of the home control, in px: below zero is under it. */
function fromHome(width: number, height: number, x: number, y: number, z: number): number {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 1, 120)
  frameCamera(camera, width, height)
  const p = new THREE.Vector3(x, y, z).project(camera)
  const px = ((p.x + 1) / 2) * width, py = ((1 - p.y) / 2) * height
  return Math.hypot(px - width / 2, py - (HOME.fromTop + HOME.across / 2)) - HOME.across / 2
}

describe('the home control at the top centre', () => {
  it('covers nothing of the one who waits beyond the fence: not the wisp of smoke as it rises, the bee on her round, or the duck', () => {
    const z = GATE.z - PEEK.beyond
    for (const [width, height] of WIDE) {
      for (let y = 0; y <= PEEK.high + BODY; y += 0.1) {
        for (const x of [PEEK_X - PEEK.wide - BODY, PEEK_X, PEEK_X + PEEK.wide + BODY]) {
          expect(fromHome(width, height, x, y, z), `${width}x${height}, at ${x.toFixed(1)} across and ${y.toFixed(1)} high`).toBeGreaterThan(CLEAR)
        }
      }
    }
  })

  it('covers nothing a child aims at: the bell, and the top of the tallest thing on each far spot', () => {
    for (const [width, height] of [...WIDE, [820, 1180] as const]) {
      expect(fromHome(width, height, BELL.x, 2.7, BELL.z)).toBeGreaterThan(CLEAR)
      for (const spot of SPOTS) expect(fromHome(width, height, spot.x, 3, spot.z)).toBeGreaterThan(CLEAR)
    }
  })
})
