import * as THREE from 'three'
import { KIND, type Kind } from '../kinds'
import { LIMB_OF } from '../motion'
import { Sculpt } from './sculpt'

// The six things, each one mesh. They are the plainest things in the street:
// one or two flat poster colours each, a simple outline, and no life of their
// own. Each stands with its foot at the origin; its size matches kinds.ts.
// The parts of a thing that move by themselves are its limbs (motion.ts).

const PI = Math.PI

function hat(): THREE.BufferGeometry {
  const sculpt = new Sculpt()
  // The brim lifts like a lid, hinged at its far edge.
  sculpt.limb(LIMB_OF.hat.brim, [-0.62, 0.04, 0], () => { sculpt.tube(0.62, 0.62, 0.08, { c: 0xd8343c }, { lump: 0.02 }, 14) })
  sculpt.tube(0.46, 0.4, 0.95, { c: 0xd8343c }, { at: [0, 0.07, 0], lump: 0.03 })
  sculpt.tube(0.43, 0.415, 0.2, { c: 0xffd23c }, { at: [0, 0.12, 0], lump: 0.01 })
  return sculpt.build()
}

function dog(): THREE.BufferGeometry {
  const coat = { c: 0xf2a02c }, ear = { c: 0x8a4a20 }, ink = { c: 0x2a1a22 }, limb = LIMB_OF.dog
  const wheel = { c: 0xd8343c, c2: 0xfdf3dc, pattern: 'spokes' as const, count: 3 }
  const sculpt = new Sculpt()
  sculpt.group({ size: 1.1 }, () => {
    sculpt.ball(0.33, coat, { at: [-0.05, 0.5, 0], size: [1.4, 0.85, 0.85], lump: 0.04 })
    // The head nods on a spring at the neck, and the ears flap on the head.
    sculpt.limb(limb.head, [0.3, 0.6, 0], () => {
      sculpt.ball(0.25, coat, { at: [0.42, 0.74, 0], lump: 0.03 })
      sculpt.ball(0.15, coat, { at: [0.58, 0.66, 0], size: [1.3, 0.9, 0.9], lump: 0.02 })
      sculpt.ball(0.06, ink, { at: [0.75, 0.68, 0], lump: 0 })
      sculpt.ball(0.05, ink, { at: [0.52, 0.83, 0.2], lump: 0 })
      sculpt.ball(0.05, ink, { at: [0.52, 0.83, -0.2], lump: 0 })
      sculpt.limb(limb.ears, [0.34, 0.9, 0], () => {
        sculpt.ball(0.16, ear, { at: [0.34, 0.72, 0.25], size: [0.7, 1.3, 0.35], lump: 0.02 })
        sculpt.ball(0.16, ear, { at: [0.34, 0.72, -0.25], size: [0.7, 1.3, 0.35], lump: 0.02 })
      })
    })
    // The tail stands up, so the dog is no longer than its foot.
    sculpt.limb(limb.tail, [-0.44, 0.6, 0], () => { sculpt.cone(0.07, 0.42, ear, { at: [-0.46, 0.62, 0], turn: [0, 0, 0.3], lump: 0.01 }, 7) })
    // Two axles: each pair of wheels spins about its own.
    for (const [x, which] of [[0.28, limb.front], [-0.3, limb.back]] as const) {
      sculpt.limb(which, [x, 0.16, 0], () => {
        for (const z of [-0.27, 0.27]) sculpt.tube(0.16, 0.16, 0.09, wheel, { at: [x, 0.16, z - Math.sign(z) * 0.045], turn: [PI / 2, 0, 0], lump: 0 }, 10)
      })
    }
  })
  return sculpt.build()
}

function balloon(): THREE.BufferGeometry {
  const limb = LIMB_OF.balloon, sculpt = new Sculpt()
  // A small sack holds it down, toward the eye, where it shows from above.
  sculpt.ball(0.17, { c: 0xc9a56a }, { at: [0, 0.1, 0.28], size: [1.2, 0.7, 1.2], lump: 0.02 })
  // The string runs from the sack up to the knot, and is drawn out as the balloon rises.
  sculpt.limb(limb.string, [0, 0.12, 0.28], () => { sculpt.tube(0.028, 0.028, 0.575, { c: 0xfdf3dc }, { at: [0, 0.12, 0.28], turn: [-0.51, 0, 0], lump: 0 }, 5) })
  sculpt.limb(limb.body, [0, 0.62, 0], () => {
    sculpt.cone(0.11, 0.2, { c: 0x2f7fe0 }, { at: [0, 0.58, 0], lump: 0.01 }, 8)
    sculpt.ball(0.8, { c: 0x2f7fe0 }, { at: [0, 1.4, 0], lump: 0.05 })
    sculpt.ball(0.2, { c: 0x8fc0f4 }, { at: [-0.3, 1.78, 0.5], size: [1, 1.3, 0.5], lump: 0.02 })
  })
  return sculpt.build()
}

function pie(): THREE.BufferGeometry {
  const limb = LIMB_OF.pie, sculpt = new Sculpt()
  sculpt.limb(limb.plate, [0, 0, 0], () => { sculpt.tube(0.55, 0.47, 0.08, { c: 0xfdf3dc }, { lump: 0.01 }, 14) })
  sculpt.tube(0.45, 0.41, 0.2, { c: 0xd79a55 }, { at: [0, 0.07, 0], lump: 0.02 })
  // The cream wobbles on the crust, and the cherry sits on the cream.
  sculpt.limb(limb.cream, [0, 0.2, 0], () => {
    sculpt.ball(0.41, { c: 0xfffaf0 }, { at: [0, 0.33, 0], size: [1, 0.6, 1], lump: 0.05 })
    sculpt.limb(limb.cherry, [0.04, 0.56, 0.03], () => { sculpt.ball(0.115, { c: 0xe02b3a }, { at: [0.04, 0.58, 0.03], lump: 0.01 }) })
  })
  return sculpt.build()
}

function tuba(): THREE.BufferGeometry {
  const brass = { c: 0xf5c22e }, dark = { c: 0xc98a14 }, inside = { c: 0x7a4a12 }, white = { c: 0xfdf3dc }, sculpt = new Sculpt()
  // Two coils beside the bell, tipped back to face the eye, which looks down from above the near kerb: they read as coils and not as a pipe.
  sculpt.ring(0.5, 0.14, brass, { at: [-0.34, 0.47, 0], turn: [-0.9, 0, 0], lump: 0.03 })
  sculpt.ring(0.27, 0.09, brass, { at: [-0.34, 0.53, 0.05], turn: [-0.9, 0, 0], lump: 0.02 })
  // The pipe up to the bell, and the bell tipped toward the eye, dark inside. The bell is no wider than the coils, so both are seen.
  sculpt.tube(0.16, 0.14, 0.8, brass, { at: [0.42, 0.6, 0], lump: 0.02 })
  sculpt.group({ at: [0.42, 1.2, 0.04], turn: [0.45, 0, -0.15] }, () => {
    sculpt.lathe([[0.16, 0], [0.18, 0.25], [0.25, 0.5], [0.4, 0.68], [0.58, 0.78], [0.62, 0.84], [0.55, 0.8]], brass, { lump: 0.03 })
    sculpt.lathe([[0.55, 0.8], [0.36, 0.66], [0.2, 0.48], [0.02, 0.3]], inside, { lump: 0 })
  })
  // Three valves, and the mouthpiece.
  for (const x of [-0.52, -0.34, -0.16]) sculpt.tube(0.06, 0.06, 0.3, white, { at: [x, 0.5, 0.12], lump: 0 }, 7)
  sculpt.tube(0.05, 0.09, 0.45, dark, { at: [-0.78, 0.5, 0.2], turn: [0, 0, 0.6], lump: 0 }, 7)
  return sculpt.build()
}

/** The drummer, all of him: his arms and legs, and his cheeks, are limbs. He faces the near kerb. */
function drummer(): THREE.BufferGeometry {
  const coat = { c: 0xd8343c }, skin = { c: 0xf4b98f }, white = { c: 0xfdf3dc }, blue = { c: 0x2f5fc8 }, gold = { c: 0xffd23c }, ink = { c: 0x2a1a22 }, cheek = { c: 0xf08a7a }
  const limb = LIMB_OF.drummer, sculpt = new Sculpt()
  sculpt.group({ size: 0.95 }, () => {
    // Boots and legs: each leg lifts from the hip.
    for (const [x, which] of [[-0.34, limb.leftLeg], [0.34, limb.rightLeg]] as const) {
      sculpt.limb(which, [x, 0.75, 0], () => {
        sculpt.ball(0.2, ink, { at: [x, 0.14, 0.06], size: [1, 0.7, 1.4], lump: 0.02 })
        sculpt.tube(0.17, 0.15, 0.6, white, { at: [x, 0.16, 0], lump: 0.02 }, 9)
      })
    }
    sculpt.ball(0.68, coat, { at: [0, 1.25, -0.12], size: [1.05, 1.05, 0.85], lump: 0.05 })
    // The bass drum on his belly, its skin toward the street: the widest thing about him.
    sculpt.tube(1.0, 1.0, 0.55, { c: 0x2f5fc8, c2: 0xfdf3dc, pattern: 'spokes', count: 10 }, { at: [0, 1.17, 0.3], turn: [PI / 2, 0, 0], lump: 0.02 }, 18)
    sculpt.tube(0.9, 0.9, 0.04, white, { at: [0, 1.17, 0.84], turn: [PI / 2, 0, 0], lump: 0.01 }, 18)
    // A cymbal on a stalk above the drum, at his right hand.
    sculpt.tube(0.03, 0.03, 0.75, ink, { at: [0.86, 2.0, 0.42], lump: 0 }, 5)
    sculpt.tube(0.4, 0.4, 0.035, gold, { at: [0.86, 2.74, 0.42], turn: [0.3, 0, -0.15], lump: 0 }, 12)
    // Epaulettes with fringe.
    sculpt.ball(0.2, gold, { at: [-0.74, 1.88, -0.1], size: [1.2, 0.5, 1], lump: 0.02 })
    sculpt.ball(0.2, gold, { at: [0.74, 1.88, -0.1], size: [1.2, 0.5, 1], lump: 0.02 })
    for (let i = 0; i < 5; i++) {
      sculpt.strip(0.09, 0.2, gold, { at: [-0.92 + i * 0.09, 1.86, 0.02 + (i % 2) * 0.03], sway: [0.02, i * 1.3, 0] })
      sculpt.strip(0.09, 0.2, gold, { at: [0.56 + i * 0.09, 1.86, 0.02 + (i % 2) * 0.03], sway: [0.02, i * 1.7, 0] })
    }
    // The big head: cheeks that puff, a round nose, a shako with a pom.
    sculpt.ball(0.62, skin, { at: [0, 2.32, -0.05], size: [1.08, 0.95, 1], lump: 0.05 })
    sculpt.limb(limb.cheeks, [-0.42, 2.17, 0.4], () => { sculpt.ball(0.22, cheek, { at: [-0.42, 2.17, 0.4], lump: 0.03 }) })
    sculpt.limb(limb.cheeks, [0.42, 2.17, 0.4], () => { sculpt.ball(0.22, cheek, { at: [0.42, 2.17, 0.4], lump: 0.03 }) })
    sculpt.ball(0.14, { c: 0xe9795f }, { at: [0, 2.3, 0.6], lump: 0.02 })
    sculpt.ball(0.12, white, { at: [-0.22, 2.5, 0.5], size: [1, 1.15, 0.6], lump: 0 })
    sculpt.ball(0.12, white, { at: [0.22, 2.5, 0.5], size: [1, 1.15, 0.6], lump: 0 })
    sculpt.ball(0.05, ink, { at: [-0.22, 2.48, 0.57], lump: 0 })
    sculpt.ball(0.05, ink, { at: [0.22, 2.48, 0.57], lump: 0 })
    sculpt.ball(0.1, ink, { at: [0, 2.08, 0.55], size: [1.3, 0.7, 0.6], lump: 0 })
    sculpt.tube(0.36, 0.42, 0.46, blue, { at: [0, 2.72, -0.05], lump: 0.02 })
    sculpt.tube(0.46, 0.46, 0.05, ink, { at: [0, 2.7, 0.08], size: [1, 1, 1.1], lump: 0.01 })
    sculpt.ball(0.12, gold, { at: [0, 3.05, -0.05], lump: 0.03 })
    // The arms, each from its shoulder, reaching forward over the drum with a stick: lifted, the stick is raised.
    for (const [x, which] of [[-0.98, limb.left], [0.98, limb.right]] as const) {
      sculpt.limb(which, [x, 1.86, 0], () => {
        sculpt.tube(0.13, 0.15, 0.62, coat, { at: [x, 1.86, 0], turn: [PI / 2 + 0.25, 0, 0], lump: 0.02 }, 9)
        sculpt.ball(0.14, white, { at: [x, 1.7, 0.6], lump: 0.02 })
        sculpt.tube(0.035, 0.035, 0.62, { c: 0xc9a56a }, { at: [x, 1.7, 0.6], turn: [PI / 2 + 0.2, 0, Math.sign(x) * 0.5], lump: 0 }, 5)
        sculpt.ball(0.1, white, { at: [x - Math.sign(x) * 0.29, 1.58, 1.14], lump: 0.01 })
      })
    }
  })
  return sculpt.build()
}

/**
 * Stands a thing inside its own foot: its middle over the origin, and no part of it further out than half the
 * width kinds.ts gives it. Where it stands is then all the room it takes, so two things a gap apart never touch. Its limbs' roots move with it.
 */
function stand(kind: Kind, geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  geometry.computeBoundingBox()
  const box = geometry.boundingBox as THREE.Box3, cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2
  let reach = 0
  for (let i = 0; i < position.count; i++) reach = Math.max(reach, Math.hypot(position.getX(i) - cx, position.getZ(i) - cz))
  const size = Math.min(1, KIND[kind].width / 2 / reach)
  for (let i = 0; i < position.count; i++) position.setXYZ(i, (position.getX(i) - cx) * size, position.getY(i) * size, (position.getZ(i) - cz) * size)
  for (const name of ['aJoint', 'aParent']) {
    const roots = geometry.getAttribute(name) as THREE.BufferAttribute
    for (let i = 0; i < roots.count; i++) if (roots.getW(i) > 0) roots.setXYZ(i, (roots.getX(i) - cx) * size, roots.getY(i) * size, (roots.getZ(i) - cz) * size)
  }
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()
  return geometry
}

export function makeThingGeometries(): Record<Kind, THREE.BufferGeometry> {
  return { pie: stand('pie', pie()), hat: stand('hat', hat()), dog: stand('dog', dog()), balloon: stand('balloon', balloon()), tuba: stand('tuba', tuba()), drummer: stand('drummer', drummer()) }
}
