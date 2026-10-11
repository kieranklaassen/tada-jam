import * as THREE from 'three'
import { KEEPER_BUILD, MAYOR_BUILD } from '../bystanders'
import type { Onlooker } from '../places'
import { CROWD_BACK, CROWD_FRONT, Sculpt, quiet } from './sculpt'

// The bystanders: parade figures with huge heads. Each is a few meshes, split
// only where something moves by itself: the body, the head, the pupils, the
// brows, the mouth, an arm. Every piece has its origin where it turns.

const PI = Math.PI
const INK = { c: 0x2a1a22 }
const WHITE = { c: 0xfdf3dc }

export type MayorParts = {
  body: THREE.BufferGeometry
  head: THREE.BufferGeometry
  pupils: THREE.BufferGeometry
  brows: THREE.BufferGeometry
  mouth: THREE.BufferGeometry
  moustache: THREE.BufferGeometry
  arm: THREE.BufferGeometry
  tuft: THREE.BufferGeometry
  /** The arm he gestures with, in two parts, each from its joint at the origin along its own upright. */
  upper: THREE.BufferGeometry
  fore: THREE.BufferGeometry
}

/** The mayor. His body stands with its foot at the origin; the head's origin is his neck. */
export function makeMayor(): MayorParts {
  const coat = { c: 0x6b3f96 }, skin = { c: 0xf6c49b }
  const body = new Sculpt()
    .ball(1.0, coat, { at: [0, 1.0, 0], size: [1.2, 1.15, 0.95], lump: 0.07 })
    // The sash, a collar and three gold buttons.
    .ring(1.02, 0.11, { c: 0xffd23c }, { at: [0, 1.05, 0.02], turn: [PI / 2 - 0.25, 0.75, 0], size: [1.16, 0.95, 1], lump: 0.02 })
    .ball(0.5, WHITE, { at: [0, 1.98, 0.1], size: [1.3, 0.4, 1.1], lump: 0.03 })
    .ball(0.09, { c: 0xffd23c }, { at: [0.1, 1.5, 0.9], lump: 0 })
    .ball(0.09, { c: 0xffd23c }, { at: [0.14, 1.15, 0.96], lump: 0 })
    .ball(0.09, { c: 0xffd23c }, { at: [0.16, 0.8, 0.92], lump: 0 })
    .ball(0.3, coat, { at: [MAYOR_BUILD.shoulder.x, MAYOR_BUILD.shoulder.y, MAYOR_BUILD.shoulder.z], lump: 0.02 })
    .build()
  const head = new Sculpt()
    .ball(1.2, skin, { at: [0, 1.1, 0], size: [1.12, 1.0, 1.0], lump: 0.09 })
    // The bald crown, ears, a huge nose, cheeks and the whites of his eyes.
    .ball(0.8, { c: 0xfbd9bb }, { at: [0, 1.75, -0.1], size: [1.1, 0.75, 1], lump: 0.04 })
    .ball(0.3, skin, { at: [-1.3, 1.1, -0.05], size: [0.5, 1, 0.8], lump: 0.03 })
    .ball(0.3, skin, { at: [1.3, 1.1, -0.05], size: [0.5, 1, 0.8], lump: 0.03 })
    .ball(0.34, { c: 0xef9a80 }, { at: [0, 1.02, 1.2], size: [1, 0.9, 1], lump: 0.04 })
    .ball(0.3, { c: 0xf5a590 }, { at: [-0.72, 0.82, 0.86], size: [1, 0.8, 0.6], lump: 0.03 })
    .ball(0.3, { c: 0xf5a590 }, { at: [0.72, 0.82, 0.86], size: [1, 0.8, 0.6], lump: 0.03 })
    .ball(0.3, WHITE, { at: [-0.46, 1.42, 0.96], size: [1, 1.15, 0.5], lump: 0 })
    .ball(0.3, WHITE, { at: [0.46, 1.42, 0.96], size: [1, 1.15, 0.5], lump: 0 })
    .build()
  const pupils = new Sculpt()
    .ball(0.12, INK, { at: [-0.46, 0, 0], size: [1, 1, 0.5], lump: 0 })
    .ball(0.12, INK, { at: [0.46, 0, 0], size: [1, 1, 0.5], lump: 0 })
    .build()
  const brows = new Sculpt()
    .ball(0.2, { c: 0x6a4630 }, { at: [-0.48, 0, 0], size: [1.5, 0.42, 0.5], turn: [0, 0, 0.18], lump: 0.01 })
    .ball(0.2, { c: 0x6a4630 }, { at: [0.48, 0, 0], size: [1.5, 0.42, 0.5], turn: [0, 0, -0.18], lump: 0.01 })
    .build()
  const mouth = new Sculpt().ball(0.3, { c: 0x7a1f32 }, { size: [1, 1, 0.4], lump: 0 }).build()
  // The moustache curls up at both ends; turned upside down it droops.
  const whisker = new Sculpt()
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const out = 0.16 + i * 0.2, up = 0.02 * i * i
      whisker.ball(0.2 - i * 0.026, { c: 0x6a4630 }, { at: [side * out, up, 0], size: [1.2, 0.9, 0.7], lump: 0.01 })
    }
  }
  const arm = new Sculpt()
    .tube(0.26, 0.3, 1.25, coat, { turn: [PI / 2, 0, 0], lump: 0.03 })
    .tube(0.3, 0.3, 0.12, WHITE, { at: [0, 0, 1.2], turn: [PI / 2, 0, 0], lump: 0.01 })
    .ball(0.3, WHITE, { at: [0, 0, 1.55], size: [1, 0.7, 1.1], lump: 0.03 })
    .ball(0.1, WHITE, { at: [-0.2, 0, 1.86], size: [1, 1, 1.9], lump: 0.01 })
    .ball(0.1, WHITE, { at: [0, 0, 1.92], size: [1, 1, 2.0], lump: 0.01 })
    .ball(0.1, WHITE, { at: [0.2, 0, 1.86], size: [1, 1, 1.9], lump: 0.01 })
    .ball(0.1, WHITE, { at: [0.34, 0.02, 1.56], size: [1.6, 1, 1], lump: 0.01 })
    .build()
  const tuft = new Sculpt().cone(0.07, 0.5, { c: 0x6a4630 }, { lump: 0 }).cone(0.05, 0.36, { c: 0x6a4630 }, { at: [0.08, 0, 0], turn: [0, 0, -0.4], lump: 0 }).build()
  // The other arm: a sleeve from shoulder to elbow, and a sleeve with a cuff and an open white glove from elbow to hand.
  const upper = new Sculpt()
    .tube(0.19, 0.22, MAYOR_BUILD.upper, coat, { lump: 0.02 }, 9)
    .ball(0.21, coat, { at: [0, MAYOR_BUILD.upper, 0], lump: 0.01 })
    .build()
  const reach = MAYOR_BUILD.fore
  const fore = new Sculpt()
    .tube(0.2, 0.19, reach - 0.3, coat, { lump: 0.02 }, 9)
    .tube(0.23, 0.23, 0.1, WHITE, { at: [0, reach - 0.36, 0], lump: 0.01 }, 9)
    .ball(0.28, WHITE, { at: [0, reach - 0.02, 0], size: [1, 1.05, 0.6], lump: 0.03 })
    .ball(0.09, WHITE, { at: [-0.19, reach + 0.27, 0], size: [1, 1.8, 0.9], lump: 0.01 })
    .ball(0.09, WHITE, { at: [0, reach + 0.32, 0], size: [1, 1.9, 0.9], lump: 0.01 })
    .ball(0.09, WHITE, { at: [0.19, reach + 0.27, 0], size: [1, 1.8, 0.9], lump: 0.01 })
    .ball(0.09, WHITE, { at: [0.32, reach + 0.02, 0], size: [1.6, 1, 0.9], lump: 0.01 })
    .build()
  return { body, head, pupils, brows, mouth, moustache: whisker.build(), arm, tuft, upper, fore }
}

export type KeeperParts = {
  body: THREE.BufferGeometry
  head: THREE.BufferGeometry
  pupils: THREE.BufferGeometry
  brows: THREE.BufferGeometry
  mouth: THREE.BufferGeometry
  /** One sleeve from shoulder to elbow and one from elbow to a white glove: both arms are drawn with them. */
  upper: THREE.BufferGeometry
  fore: THREE.BufferGeometry
  /** The key, from the grip at the origin upward; and the cap, from its rim at the origin. */
  key: THREE.BufferGeometry
  cap: THREE.BufferGeometry
}

/** The gate keeper on his stilts. The body's foot is at the origin; the head's origin is the top of his collar. */
export function makeKeeper(): KeeperParts {
  const coat = { c: 0x1f9a8a }, skin = { c: 0xf2c7a0 }, stripes = { c: 0xd8343c, c2: 0xfdf3dc, pattern: 'bands' as const, count: 2.2 }
  const body = new Sculpt()
    // The stilts go below the street, so he can rise on them and stay planted.
    .tube(0.09, 0.09, 3.2, stripes, { at: [-0.25, -0.8, 0], lump: 0 }, 7)
    .tube(0.09, 0.09, 3.2, stripes, { at: [0.25, -0.8, 0], lump: 0 }, 7)
    // A long coat that flares, and a tail of fringe along its hem.
    .tube(0.34, 0.66, 1.9, coat, { at: [0, 2.1, 0], lump: 0.05 })
    .ball(0.36, coat, { at: [0, 3.98, 0], size: [1.15, 0.6, 1], lump: 0.03 })
    .tube(0.2, 0.3, 0.2, WHITE, { at: [0, 4.0, 0], lump: 0.01 })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2
    body.strip(0.2, 0.3, { c: 0xffd23c }, { at: [Math.cos(a) * 0.64, 2.14, Math.sin(a) * 0.64], turn: [0, -a + PI / 2, 0], sway: [0.03, i * 0.9, 0] })
  }
  const head = new Sculpt()
    // A long neck, a small egg of a head, a long nose, big ears and a tiny cap.
    .tube(0.1, 0.12, 1.0, skin, { at: [0, -0.4, 0], lump: 0.01 }, 8)
    .ball(0.46, skin, { at: [0, 0.9, 0], size: [0.92, 1.12, 0.95], lump: 0.04 })
    .cone(0.13, 0.75, { c: 0xee9478 }, { at: [0, 0.84, 0.36], turn: [PI / 2 + 0.12, 0, 0], lump: 0.02 })
    .ball(0.17, skin, { at: [-0.44, 0.92, -0.04], size: [0.4, 1, 0.8], lump: 0.02 })
    .ball(0.17, skin, { at: [0.44, 0.92, -0.04], size: [0.4, 1, 0.8], lump: 0.02 })
    .ball(0.15, WHITE, { at: [-0.19, 1.06, 0.36], size: [1, 1.2, 0.5], lump: 0 })
    .ball(0.15, WHITE, { at: [0.19, 1.06, 0.36], size: [1, 1.2, 0.5], lump: 0 })
    .build()
  // His small cap: he takes it off to fan a burp away.
  const cap = new Sculpt()
    .tube(0.24, 0.3, 0.24, { c: 0xd8343c }, { at: [0, 0.02, -0.02], lump: 0.02 })
    .tube(0.36, 0.36, 0.04, { c: 0x2a1a22 }, { at: [0, 0, 0.16], size: [0.9, 1, 0.9], lump: 0 })
    .ball(0.07, { c: 0xffd23c }, { at: [0, 0.3, -0.02], lump: 0 })
    .build()
  const pupils = new Sculpt()
    .ball(0.06, INK, { at: [-0.19, 0, 0], size: [1, 1, 0.5], lump: 0 })
    .ball(0.06, INK, { at: [0.19, 0, 0], size: [1, 1, 0.5], lump: 0 })
    .build()
  const brows = new Sculpt()
    .ball(0.1, INK, { at: [-0.2, 0, 0], size: [1.5, 0.3, 0.5], turn: [0, 0, -0.25], lump: 0 })
    .ball(0.1, INK, { at: [0.2, 0, 0], size: [1.5, 0.3, 0.5], turn: [0, 0, 0.25], lump: 0 })
    .build()
  const mouth = new Sculpt().ball(0.13, { c: 0x7a1f32 }, { size: [1, 1, 0.4], lump: 0 }).build()
  const upper = new Sculpt().tube(0.1, 0.12, KEEPER_BUILD.upper, coat, { lump: 0.02 }, 8).ball(0.11, coat, { at: [0, KEEPER_BUILD.upper, 0], lump: 0.01 }).build()
  const fore = new Sculpt().tube(0.1, 0.1, KEEPER_BUILD.fore, coat, { lump: 0.02 }, 8).ball(0.15, WHITE, { at: [0, KEEPER_BUILD.fore, 0], lump: 0.02 }).build()
  // The big key: a shaft, a ring for its bow at the top and one square tooth. Two teeth on a shaft read as a letter, so it has one.
  const gold = { c: 0xffd23c }
  const key = new Sculpt()
    .tube(0.05, 0.05, 1.0, gold, { lump: 0 }, 6)
    .ring(0.2, 0.06, gold, { at: [0, 1.18, 0], lump: 0 })
    .box(0.24, 0.22, 0.08, gold, { at: [0.14, 0.22, 0] })
    .build()
  return { body: body.build(), head, pupils, brows, mouth, upper, fore, key, cap }
}

/** The colours the crowd's big heads are painted, quieter than anything that can be touched. */
export const CROWD_SKINS: readonly number[] = [0xf4b98f, 0xbfe08a, 0xf5a8c4, 0xb9c4f2, 0xf7d57a, 0xa7e0d2].map((hex) => quiet(hex, 0.38))
export const CROWD_COATS: readonly number[] = [0x5a78c8, 0xd86a4c, 0x4aa87a, 0x9a5ab8, 0xd8a43c, 0x3c9ab8].map((hex) => quiet(hex, 0.45))

/**
 * One head of the crowd, added to the setting's own sculpt: a body, a huge painted head with two dot eyes, a
 * nose and a mouth, and a hat. It rocks from side to side by itself. `back` turns it away, for the near kerb.
 */
export function addOnlooker(sculpt: Sculpt, one: Onlooker, which: number): void {
  const { x, z, size, back } = one
  const skin = { c: CROWD_SKINS[which % CROWD_SKINS.length] }, coat = { c: CROWD_COATS[(which * 5 + 2) % CROWD_COATS.length] }
  const rock: readonly [number, number, number] = [0.05 + 0.03 * ((which * 7) % 3), which * 2.1, 1]
  const dark = { c: quiet(0x2a1a22, 0.25) }
  sculpt.group({ at: [x, 0, z], size, turn: [0, back ? PI : 0, 0] }, () => {
    sculpt.ball(0.62, coat, { at: [0, 0.75, 0], size: [1, 1.25, 0.8], lump: 0.05 })
    // The head and its hat are a limb of the setting: it turns to the hole, ducks under a finger and jerks back when the hole swallows.
    sculpt.limb(back ? CROWD_BACK : CROWD_FRONT, [0, 1.35, 0], () => {
    sculpt.ball(0.8, skin, { at: [0, 2.0, 0], size: [1.05, 0.95, 1], lump: 0.07, sway: rock })
    sculpt.ball(0.19, { c: quiet(0xe9795f, 0.3) }, { at: [0, 1.95, 0.8], lump: 0.02, sway: rock })
    sculpt.ball(0.085, dark, { at: [-0.3, 2.22, 0.7], lump: 0, sway: rock })
    sculpt.ball(0.085, dark, { at: [0.3, 2.22, 0.7], lump: 0, sway: rock })
    sculpt.ball(0.2, dark, { at: [0, 1.62, 0.68], size: [which % 2 ? 1.5 : 0.8, which % 2 ? 0.45 : 0.9, 0.4], lump: 0, sway: rock })
    // A hat for each: a party cone with a pom, a flat cap, or a tall striped topper.
    const hat = { c: CROWD_COATS[(which * 3 + 1) % CROWD_COATS.length], c2: quiet(0xfdf3dc, 0.2), pattern: 'bands' as const, count: 3 }
    if (which % 3 === 0) {
      sculpt.cone(0.42, 0.9, hat, { at: [0, 2.68, 0], lump: 0.02, sway: rock })
      sculpt.ball(0.13, { c: quiet(0xffd23c, 0.3) }, { at: [0, 3.6, 0], lump: 0.02, sway: rock })
    } else if (which % 3 === 1) {
      sculpt.ball(0.62, { c: hat.c }, { at: [0, 2.62, 0], size: [1.1, 0.45, 1.1], lump: 0.03, sway: rock })
    } else {
      sculpt.tube(0.4, 0.36, 0.7, hat, { at: [0, 2.66, 0], lump: 0.02, sway: rock })
      sculpt.tube(0.62, 0.62, 0.06, { c: hat.c }, { at: [0, 2.66, 0], lump: 0.01, sway: rock })
    }
    })
  })
}
