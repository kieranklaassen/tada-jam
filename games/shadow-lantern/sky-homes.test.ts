import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildCreature, CREATURE_ORDER } from './creatures'
import { SKY_HOMES, skyDepth, skyScale } from './motion'
import { frameTheatre } from './view/game'

// The jam draws one round home control over every game: 48 px across, centred
// at the top, 10 px from the top edge. A tap there goes home, so no friend a
// child can tap may rest under it.
const CONTROL = { size: 48, top: 10 }

/** Landscape tablets, a short wide window, and two narrower windows. */
const SURFACES: readonly [number, number][] = [
  [1180, 820],
  [1024, 768],
  [1366, 1024],
  [1280, 720],
  [900, 820],
  [700, 820],
]

describe('homes in the sky', () => {
  it('leave the home control clear: no friend, whatever its kind, rests under it', () => {
    const camera = new THREE.PerspectiveCamera()
    const point = new THREE.Vector3()
    const under: string[] = []
    for (const [width, height] of SURFACES) {
      frameTheatre(camera, width / height)
      const px = (x: number, y: number, z: number) => {
        point.set(x, y, z).project(camera)
        return { x: ((point.x + 1) / 2) * width, y: ((1 - point.y) / 2) * height }
      }
      const control = { x: width / 2, y: CONTROL.top + CONTROL.size / 2, r: CONTROL.size / 2 }
      for (const kind of CREATURE_ORDER) {
        const { bounds } = buildCreature(kind)
        const hx = ((bounds.x1 - bounds.x0) / 2) * skyScale(kind)
        const hy = ((bounds.y1 - bounds.y0) / 2) * skyScale(kind)
        SKY_HOMES.forEach((home, slot) => {
          const z = skyDepth(slot)
          const lo = px(home.x - hx, home.y - hy, z)
          const hi = px(home.x + hx, home.y + hy, z)
          // The point of the friend's box nearest the control's centre.
          const nx = Math.min(Math.max(control.x, lo.x), hi.x)
          const ny = Math.min(Math.max(control.y, hi.y), lo.y)
          if (Math.hypot(nx - control.x, ny - control.y) < control.r) under.push(`${kind} in slot ${slot} at ${width}x${height}`)
        })
      }
    }
    expect(under).toEqual([])
  })
})
