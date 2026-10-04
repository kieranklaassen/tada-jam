import { KIND_COLOURS, PALETTE, shade } from './palette'
import type { Pillow, Vec3 } from './shapes'

// The four friends as lists of pillows. Pure data: the builder in friends.ts
// turns it into meshes, and the tests hold its sizes.
//
// A friend stands with its feet at y = 0 and faces +z, towards the child.
// Each is one hue all over: a beak, a belly or a claw tip is that hue a step
// darker or lighter. The eyes are printed in ink, and the valve is white.
// Every friend has the same few parts that move by themselves, so one set of
// motions can drive all four while each keeps its own shape:
//   body   the trunk, the legs and whatever never moves against the trunk
//   head   turns and nods about `neck`
//   eyes   blink and look, inside the head
//   armL   swings about `shoulderL`; the pillows hang down from the pivot
//   armR   the same on the other side, and holds the string at `hand`
//   extra  the funniest part: the duck's tail, the frog's throat, the hippo's
//          belly, the crab's eye stalks, each about `extraPivot`
//   jaw    the hippo's alone: its lower jaw, which drops about `jawPivot` when
//          it yawns. It rides on the head. The other kinds have none.

export type KindName = keyof typeof KIND_COLOURS

export type Body = {
  body: Pillow[]
  head: Pillow[]
  eyes: Pillow[]
  /** The left arm, hanging from its pivot at the origin. The right arm is its mirror. */
  arm: Pillow[]
  extra: Pillow[]
  /** The lower jaw, about its own hinge at the origin, and where that hinge is in the head. Empty for a kind whose mouth does not open. */
  jaw: Pillow[]
  jawPivot: Vec3
  /** What is seen only when the jaw has dropped: the lining of the mouth, which rides on the jaw. A friend too far off to open its mouth is built without it. */
  inside: Pillow[]
  neck: Vec3
  /** The left shoulder; the right is mirrored in x. */
  shoulder: Vec3
  extraPivot: Vec3
  /** Whether the extra part rides on the head (the crab's stalks) or on the trunk. */
  extraOnHead: boolean
  /** Where a string is held, in the arm's own space. */
  hand: Vec3
  /** The mouth, in the head's own space: where a duck's beak or a hippo's yawn takes a string before the hand has it, and where a frog's tongue comes from. */
  mouth: Vec3
  /** The valve, on the trunk. */
  valve: Vec3
  /** Top of the head at rest, and the half-width of the whole toy at its widest, which is with its arms up. */
  height: number
  halfWidth: number
  /** How far the arms swing out and up when the friend reaches, in radians from hanging. */
  reach: number
  /** The least an arm may swing out from hanging: the crab's claws are long enough to go through the hill if they hung straight down. */
  lowest: number
}

const SMALL: readonly [number, number] = [16, 10]
const TINY: readonly [number, number] = [10, 8]

/** A pair of pillows, one each side of the middle. */
function both(spec: Pillow): Pillow[] {
  const turn = spec.turn ?? [0, 0, 0]
  return [spec, { ...spec, at: [-spec.at[0], spec.at[1], spec.at[2]], turn: [turn[0], -turn[1], -turn[2]] }]
}

function eye(x: number, y: number, z: number, size: number): Pillow[] {
  return [
    ...both({ at: [x, y, z], size: [size * 0.8, size, size * 0.42], colour: PALETTE.ink, detail: SMALL }),
    // The shine sits up and to the side the light comes from, on both eyes alike.
    { at: [x - size * 0.26, y + size * 0.34, z + size * 0.36], size: [size * 0.3, size * 0.3, size * 0.16], colour: PALETTE.valve, detail: TINY },
    { at: [-x - size * 0.26, y + size * 0.34, z + size * 0.36], size: [size * 0.3, size * 0.3, size * 0.16], colour: PALETTE.valve, detail: TINY },
  ]
}

function duck(): Body {
  const c = KIND_COLOURS.duck, dark = shade(c, -0.2)
  return {
    body: [
      { at: [0, 0.7, 0], size: [0.74, 0.66, 0.68], colour: c, panels: 6 },
      ...both({ at: [0.3, 0.08, 0.22], size: [0.27, 0.09, 0.38], colour: dark, detail: SMALL }),
    ],
    head: [
      { at: [0, 0.5, 0.06], size: [0.62, 0.58, 0.56], colour: c },
      { at: [0, 0.36, 0.6], size: [0.3, 0.12, 0.26], colour: dark, detail: SMALL },
      { at: [0, 1.1, -0.04], size: [0.08, 0.17, 0.08], turn: [0.5, 0, 0], colour: c, detail: TINY },
    ],
    eyes: eye(0.26, 0.64, 0.5, 0.13),
    arm: [{ at: [-0.06, -0.34, 0], size: [0.19, 0.42, 0.32], colour: c, panels: 2, detail: SMALL }],
    extra: [{ at: [0, 0.2, -0.14], size: [0.22, 0.32, 0.22], turn: [-0.7, 0, 0], colour: c, detail: SMALL }],
    jaw: [],
    jawPivot: [0, 0, 0],
    inside: [],
    neck: [0, 1.2, 0.04],
    shoulder: [-0.66, 0.98, 0],
    extraPivot: [0, 0.76, -0.56],
    extraOnHead: false,
    hand: [-0.06, -0.72, 0],
    mouth: [0, 0.36, 0.82],
    valve: [0.5, 0.46, -0.48],
    height: 2.3,
    halfWidth: 1.06,
    reach: 2.75,
    lowest: 0,
  }
}

function frog(): Body {
  const c = KIND_COLOURS.frog, light = shade(c, 0.34), dark = shade(c, -0.18)
  return {
    body: [
      { at: [0, 0.62, 0], size: [0.9, 0.62, 0.74], colour: c, panels: 6 },
      ...both({ at: [0.74, 0.32, 0.02], size: [0.34, 0.32, 0.5], colour: c, panels: 2, detail: SMALL }),
      ...both({ at: [0.82, 0.07, 0.42], size: [0.34, 0.08, 0.36], colour: dark, detail: SMALL }),
    ],
    head: [
      { at: [0, 0.3, 0.06], size: [0.82, 0.46, 0.62], colour: c },
      ...both({ at: [0.4, 0.68, 0.04], size: [0.26, 0.26, 0.24], colour: c, detail: SMALL }),
      { at: [0, 0.14, 0.6], size: [0.5, 0.035, 0.08], colour: dark, detail: SMALL },
    ],
    eyes: eye(0.4, 0.74, 0.23, 0.14),
    arm: [
      { at: [-0.04, -0.3, 0.04], size: [0.13, 0.36, 0.13], colour: c, detail: SMALL },
      { at: [-0.06, -0.66, 0.06], size: [0.2, 0.17, 0.17], colour: c, detail: SMALL },
    ],
    extra: [{ at: [0, 0, 0.1], size: [0.44, 0.26, 0.3], colour: light, detail: SMALL }],
    jaw: [],
    jawPivot: [0, 0, 0],
    inside: [],
    neck: [0, 1.02, 0.06],
    shoulder: [-0.8, 0.98, 0.16],
    extraPivot: [0, 0.94, 0.5],
    extraOnHead: false,
    hand: [-0.06, -0.72, 0.06],
    mouth: [0, 0.14, 0.66],
    valve: [-0.6, 0.9, -0.5],
    height: 1.98,
    halfWidth: 1.2,
    reach: 2.8,
    lowest: 0,
  }
}

function hippo(): Body {
  const c = KIND_COLOURS.hippo, light = shade(c, 0.3), dark = shade(c, -0.18), lining = shade(c, -0.45)
  return {
    body: [
      { at: [0, 0.86, 0], size: [1.0, 0.82, 0.86], colour: c, panels: 6 },
      ...both({ at: [0.52, 0.2, 0.34], size: [0.3, 0.22, 0.32], colour: c, detail: SMALL }),
      { at: [0, 0.98, -0.86], size: [0.07, 0.07, 0.16], turn: [0.5, 0, 0], colour: c, detail: TINY },
    ],
    head: [
      { at: [0, 0.42, 0.04], size: [0.6, 0.46, 0.5], colour: c },
      // The top of the muzzle. The bottom of it is the jaw, a part of its own, and the two close on a dark lining.
      { at: [0, 0.27, 0.42], size: [0.62, 0.26, 0.4], colour: light, panels: 2 },
      ...both({ at: [0.2, 0.3, 0.8], size: [0.06, 0.045, 0.03], colour: dark, detail: TINY }),
      ...both({ at: [0.44, 0.84, -0.04], size: [0.14, 0.15, 0.08], turn: [0, 0, -0.4], colour: c, detail: SMALL }),
    ],
    eyes: eye(0.28, 0.68, 0.42, 0.12),
    arm: [{ at: [-0.04, -0.34, 0.02], size: [0.21, 0.42, 0.21], colour: c, panels: 2, detail: SMALL }],
    extra: [{ at: [0, 0, 0], size: [0.72, 0.56, 0.3], colour: light, detail: SMALL }],
    jaw: [{ at: [0, -0.1, 0.34], size: [0.58, 0.17, 0.36], colour: light, panels: 2 }],
    jawPivot: [0, 0.08, 0.04],
    inside: [{ at: [0, 0.02, 0.34], size: [0.46, 0.06, 0.29], colour: lining, detail: SMALL }],
    neck: [0, 1.52, 0.2],
    shoulder: [-0.94, 1.2, 0.1],
    extraPivot: [0, 0.74, 0.66],
    extraOnHead: false,
    hand: [-0.04, -0.72, 0.02],
    mouth: [0, 0.1, 0.7],
    valve: [0.74, 0.5, -0.56],
    height: 2.5,
    halfWidth: 1.3,
    reach: 2.95,
    lowest: 0,
  }
}

function crab(): Body {
  const c = KIND_COLOURS.crab, light = shade(c, 0.5), dark = shade(c, -0.2)
  const legs: Pillow[] = [-0.3, 0.02, 0.34].flatMap((z, i) => both({ at: [0.82 + i * 0.03, 0.24, z], size: [0.1, 0.3, 0.1], turn: [0, 0, 0.45], colour: dark, detail: TINY }))
  return {
    // Eight panels, so the welded seams fall either side of the smile and none runs down the middle of it: a bar
    // across a line would read as a sign.
    body: [{ at: [0, 0.66, 0], size: [0.94, 0.54, 0.72], colour: c, panels: 8 }, ...legs],
    // The crab has no head of its own: its face is on its shell, so the part that nods holds the smile.
    head: [{ at: [0, -0.18, 0.4], size: [0.25, 0.035, 0.06], colour: dark, detail: SMALL }],
    eyes: eye(0.3, 0.64, 0.15, 0.12),
    arm: [
      { at: [-0.1, -0.28, 0.02], size: [0.13, 0.34, 0.13], turn: [0, 0, -0.3], colour: c, detail: SMALL },
      { at: [-0.2, -0.72, 0.04], size: [0.3, 0.34, 0.2], colour: c, panels: 2, detail: SMALL },
      { at: [0.02, -1.0, 0.04], size: [0.13, 0.22, 0.12], turn: [0, 0, 0.5], colour: dark, detail: SMALL },
    ],
    extra: [
      ...both({ at: [0.3, 0.26, 0], size: [0.07, 0.3, 0.07], colour: c, detail: TINY }),
      ...both({ at: [0.3, 0.62, 0], size: [0.19, 0.19, 0.17], colour: light, detail: SMALL }),
    ],
    jaw: [],
    jawPivot: [0, 0, 0],
    inside: [],
    neck: [0, 0.86, 0.28],
    shoulder: [-0.8, 0.76, 0.12],
    extraPivot: [0, 0, 0],
    extraOnHead: true,
    hand: [-0.12, -0.98, 0.04],
    mouth: [0, -0.18, 0.44],
    valve: [0.6, 0.94, -0.4],
    height: 1.68,
    halfWidth: 1.34,
    reach: 2.95,
    lowest: 1.0,
  }
}

/**
 * How far to one side a friend reaches with its arms up, from its own pillows: the trunk, or the far end of a
 * raised arm, whichever is further out. A test holds each plan's `halfWidth` to it.
 */
export function reachOut(body: Body): number {
  const trunk = Math.max(...body.body.map((p) => Math.abs(p.at[0]) + Math.max(p.size[0], p.size[1] * Math.abs(Math.sin(p.turn?.[2] ?? 0)))))
  const c = Math.cos(-body.reach), s = Math.sin(-body.reach)
  const arm = Math.max(...body.arm.map((p) => Math.abs(body.shoulder[0] + p.at[0] * c - p.at[1] * s) + Math.max(p.size[0], p.size[2])))
  return Math.max(trunk, arm)
}

export const BODIES: Record<KindName, Body> = { duck: duck(), frog: frog(), hippo: hippo(), crab: crab() }
