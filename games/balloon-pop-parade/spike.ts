import { Vector3 } from 'three'
import { BODIES, type KindName } from './bodies'
import { BALLOON, bunchOffsets, FRIEND_SCALE, friendX, GROUND, groundAt, HELD_HEIGHT, skySlots, WAITING_SCALE, waitingSpot } from './layout'
import { KIND_COLOURS, PALETTE, shade } from './palette'
import { restPose, type Pose } from './pose'
import type { Stage } from './stage'

// The look spike: the game's real scene standing still but alive, in the
// first reserved look, before any play is built on it. The Mount shows it at
// load. It is one moment of a cycle as the rules lay it out: a troop in the
// middle, part of it served, the bunches of its position in the sky, and the
// next troop waiting at the edge. The toy replaces this file.

type Spike = {
  troop: { kind: KindName; held: boolean[] }
  sky: { colour: KindName; count: number }[]
  waiting: { kind: KindName; size: number }
}

/** `look=` in the address picks another moment, so each kind and each kind of sky can be seen in the look. */
const SPIKES: Record<string, Spike> = {
  // `pair-singles`: two ducks, one served, five single balloons in three colours.
  pair: {
    troop: { kind: 'duck', held: [true, false] },
    sky: [{ colour: 'duck', count: 1 }, { colour: 'hippo', count: 1 }, { colour: 'crab', count: 1 }, { colour: 'duck', count: 1 }, { colour: 'hippo', count: 1 }],
    waiting: { kind: 'frog', size: 3 },
  },
  // `solo-two-colours`: one frog and four single balloons in two colours.
  solo: {
    troop: { kind: 'frog', held: [false] },
    sky: [{ colour: 'crab', count: 1 }, { colour: 'frog', count: 1 }, { colour: 'frog', count: 1 }, { colour: 'crab', count: 1 }],
    waiting: { kind: 'hippo', size: 1 },
  },
  // `bunches-own-colour`: three hippos and bunches of two, one and three.
  bunches: {
    troop: { kind: 'hippo', held: [false, false, false] },
    sky: [{ colour: 'hippo', count: 2 }, { colour: 'hippo', count: 1 }, { colour: 'hippo', count: 3 }],
    waiting: { kind: 'crab', size: 2 },
  },
  // `bunches-mixed`: two crabs, one served, and four bunches in three colours.
  mixed: {
    troop: { kind: 'crab', held: [true, false] },
    sky: [{ colour: 'duck', count: 2 }, { colour: 'crab', count: 1 }, { colour: 'frog', count: 3 }, { colour: 'crab', count: 2 }],
    waiting: { kind: 'duck', size: 2 },
  },
}

const pose: Pose = restPose()
const hand = new Vector3()

/** A blink now and then, each friend at its own moments: 0 open, 1 shut. */
function blink(time: number, seed: number): number {
  const phase = (time * 0.31 + seed * 0.37) % 1
  return phase > 0.955 ? Math.sin(((phase - 0.955) / 0.045) * Math.PI) : 0
}

export function drawSpike(stage: Stage, time: number, search: string): void {
  const spike = SPIKES[new URLSearchParams(search).get('look') ?? 'pair'] ?? SPIKES.pair
  const view = stage.view

  // The bunches, bobbing in their places, each balloon with a short string.
  const slots = skySlots(spike.sky.length, view)
  spike.sky.forEach((bunch, slot) => {
    const colour = KIND_COLOURS[bunch.colour], cord = shade(colour, -0.3)
    const bob = Math.sin(time * 1.1 + slot * 1.7) * 0.07
    const knotX = slots[slot].x, knotY = slots[slot].y + bob - BALLOON * 2.5
    bunchOffsets(bunch.count).forEach((offset, i) => {
      const sway = Math.sin(time * 0.9 + slot * 2.3 + i * 1.3) * 0.05
      const x = slots[slot].x + offset.x + sway * 0.4, y = slots[slot].y + offset.y + bob
      const lean = bunch.count > 1 ? -offset.x * 0.42 + sway : sway
      stage.balloon(x, y, -i * 0.02, 1, 1, lean, colour)
      const tailX = x + Math.sin(lean) * BALLOON * 1.32, tailY = y - Math.cos(lean) * BALLOON * 1.32
      // A bunch's strings run to one knot; a single balloon's string just hangs.
      if (bunch.count > 1) stage.string(tailX, tailY, 0, knotX, knotY, 0, cord)
      else stage.string(tailX, tailY, 0, tailX + Math.sin(time * 1.3 + slot) * 0.06, tailY - 0.6, 0, cord)
    })
    if (bunch.count > 1) stage.string(knotX, knotY, 0, knotX + Math.sin(time * 1.3 + slot) * 0.06, knotY - 0.5, 0, cord)
  })

  // The troop in the middle: a friend without a balloon reaches up, one with a balloon holds it and looks at it.
  const { kind, held } = spike.troop
  const plan = BODIES[kind], colour = KIND_COLOURS[kind]
  held.forEach((holds, i) => {
    const rig = stage.friend(`friend-${i}`, kind)
    const x = friendX(i, held.length), breath = Math.sin(time * 1.9 + i * 2.1)
    Object.assign(pose, restPose())
    pose.x = x
    pose.y = groundAt(x, 0)
    pose.scale = FRIEND_SCALE
    pose.squash = 1 + breath * 0.018
    pose.lean = Math.sin(time * 0.8 + i) * 0.025
    pose.blink = blink(time, i)
    pose.wag = Math.sin(time * 3.1 + i) * 0.12
    if (holds) {
      pose.armR = plan.reach
      pose.armL = 0.25
      pose.nod = -0.3
      pose.headTurn = -0.12
      pose.tilt = -0.08
    } else {
      const stretch = Math.sin(time * 2.4 + i * 1.3) * 0.08
      pose.armL = plan.reach + stretch
      pose.armR = plan.reach - stretch
      pose.nod = -0.42
      pose.squash += 0.03
    }
    stage.pose(rig, pose)
    stage.shadow(x, pose.y + 0.02, 0.1, plan.halfWidth * FRIEND_SCALE * 1.05, 0.55, shade(colour, -0.35))
    if (holds) {
      rig.root.updateWorldMatrix(true, true)
      rig.armR.localToWorld(hand.copy(rig.hand))
      const bx = x + 0.7 + Math.sin(time * 1.2 + i) * 0.1, by = GROUND + HELD_HEIGHT + Math.sin(time * 1.5 + i) * 0.06
      const lean = (hand.x - bx) * -0.18
      stage.balloon(bx, by, 0.3, 1, 1, lean, colour)
      stage.string(bx + Math.sin(lean) * BALLOON * 1.32, by - Math.cos(lean) * BALLOON * 1.32, 0.3, hand.x, hand.y, hand.z, shade(colour, -0.3))
    }
  })
  for (let i = held.length; i < 3; i++) stage.dropFriend(`friend-${i}`)

  // The troop that waits: smaller, further back, bobbing and looking at the balloons.
  const waiting = spike.waiting, waitingPlan = BODIES[waiting.kind]
  for (let i = 0; i < 3; i++) {
    if (i >= waiting.size) {
      stage.dropFriend(`waiting-${i}`)
      continue
    }
    const rig = stage.friend(`waiting-${i}`, waiting.kind)
    const spot = waitingSpot(i, view)
    Object.assign(pose, restPose())
    pose.x = spot.x
    pose.z = spot.z
    pose.y = groundAt(spot.x, spot.z)
    pose.scale = WAITING_SCALE * FRIEND_SCALE
    pose.turn = 0.45
    pose.nod = -0.25
    pose.squash = 1 + Math.sin(time * 2.3 + i * 1.9) * 0.03
    pose.blink = blink(time, i + 5)
    pose.wag = Math.sin(time * 2.2 + i) * 0.1
    stage.pose(rig, pose)
    stage.shadow(spot.x, pose.y + 0.02, spot.z + 0.1, waitingPlan.halfWidth * 0.75, 0.36, PALETTE.shadow)
  }
}
