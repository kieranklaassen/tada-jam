import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { drop, emptyArrangement, placeOf, putInSand, putOnEnd, type Arrangement } from '../arrangement'
import { restFrame } from '../rest'
import { FRIEND_IDS, FRIENDS, PLANK, homeOn, plankTopAt, type FriendId } from '../world'
import { FIELD_OF_VIEW, placeCamera } from './camera'
import { groundUnder, type Ray } from './ground'

// What the finger points at, with the stage's own camera on the surface the game is drawn for.

const WIDTH = 1180, HEIGHT = 820
const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 1, 80)
placeCamera(camera, WIDTH / HEIGHT)

/** Where a point of the tray is drawn, in pixels. */
function drawnAt(x: number, y: number, z: number): { px: number; py: number } {
  const p = new THREE.Vector3(x, y, z).project(camera)
  return { px: ((p.x + 1) / 2) * WIDTH, py: ((1 - p.y) / 2) * HEIGHT }
}

/** The ray under a pixel. */
function rayAt(px: number, py: number): Ray {
  const caster = new THREE.Raycaster()
  caster.setFromCamera(new THREE.Vector2((px / WIDTH) * 2 - 1, -(py / HEIGHT) * 2 + 1), camera)
  return caster.ray
}

function on(left: FriendId[], right: FriendId[]): Arrangement {
  let a = emptyArrangement()
  for (const id of FRIEND_IDS) a = putInSand(a, id, homeOn(id, 'right'))
  for (const id of left) a = putOnEnd(a, id, 'left')
  for (const id of right) a = putOnEnd(a, id, 'right')
  return a
}

describe('what the finger points at', () => {
  it('the board, where the finger is on the picture of the board: at either end, however it lies, and in the middle', () => {
    for (const a of [on(['pim'], []), on([], ['bo']), on(['mog'], ['dot']), on([], [])]) {
      const frame = restFrame(a)
      for (const along of [-PLANK.seat, -1.2, 0.9, PLANK.seat]) {
        // Skip a seat somebody sits on: the finger there is on that friend.
        if ((along === -PLANK.seat && a.left.length) || (along === PLANK.seat && a.right.length)) continue
        const x = along * Math.cos(frame.tilt), at = drawnAt(x, plankTopAt(along, frame.tilt), PLANK.z)
        const under = groundUnder(rayAt(at.px, at.py), frame, 'pim')
        expect(under, `${along}`).toMatchObject({ on: 'plank', z: PLANK.z })
        expect(under!.x, `${along}`).toBeCloseTo(x, 1)
        // A friend hanging over that place and let go lands on the plank.
        const landed = placeOf(drop(a, 'pim', under!.x, under!.z).arrangement, 'pim')
        expect(landed.at, `${along}`).toBe('end')
      }
    }
  })

  it('a friend, where the finger is on that friend: a stack on an end means that end', () => {
    const a = on(['bo', 'mog'], [])
    const frame = restFrame(a)
    for (const id of ['bo', 'mog'] as const) {
      const pose = frame.poses[id], at = drawnAt(pose.x, pose.y + FRIENDS[id].halfHeight, pose.z)
      const under = groundUnder(rayAt(at.px, at.py), frame, 'pim')
      expect(under).toMatchObject({ on: 'friend' })
      expect(placeOf(drop(a, 'pim', under!.x, under!.z).arrangement, 'pim')).toMatchObject({ at: 'end', end: 'left', level: 2 })
    }
    // The friend in the hand is never what the finger points at.
    const pim = frame.poses.pim, at = drawnAt(pim.x, pim.y + FRIENDS.pim.halfHeight, pim.z)
    expect(groundUnder(rayAt(at.px, at.py), frame, 'pim')).toMatchObject({ on: 'sand' })
    expect(groundUnder(rayAt(at.px, at.py), frame, null)).toMatchObject({ on: 'friend' })
  })

  it('the sand, everywhere else: a friend let go there stands where the finger pointed, all over the front of the tray', () => {
    const a = on(['pim'], [])
    const frame = restFrame(a)
    let reached = 0
    for (let x = -4.8; x <= 4.8; x += 0.6) for (let z = 0.6; z <= 2.4; z += 0.3) {
      const at = drawnAt(x, 0, z)
      const under = groundUnder(rayAt(at.px, at.py), frame, 'mog')
      // A finger on a friend's body points at that friend; anywhere else in front of the plank it points at the sand.
      if (!under || under.on !== 'sand') continue
      expect(under.x).toBeCloseTo(x, 2)
      expect(under.z).toBeCloseTo(z, 2)
      expect(placeOf(drop(a, 'mog', under.x, under.z).arrangement, 'mog').at, `${x}, ${z}`).toBe('sand')
      reached += 1
    }
    // Nearly all of it: only the spots where another friend stands are that friend's.
    expect(reached).toBeGreaterThan(100)
    // Mog's own default place among them.
    const home = homeOn('mog', 'right'), at = drawnAt(home.x, 0, home.z)
    expect(groundUnder(rayAt(at.px, at.py), frame, 'mog')).toMatchObject({ on: 'sand' })
  })

  it('nothing, where the finger is above the tray and looks at the sky', () => {
    const up = rayAt(WIDTH / 2, 0)
    expect(groundUnder({ origin: up.origin, direction: { x: 0, y: 0.2, z: -1 } }, restFrame(on([], [])), null)).toBe(null)
  })
})
