import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { POKE_S, restPose, spunPose, toyPose, type Grazing, type Pose } from '../motion'
import { FOOT, GAP, KINDS, SEA_FOOT, SIZE, WEIGHT, type Kind } from '../toys'
import { toyModel } from './models'

// A toy is given a round piece of ground (FOOT on the land, SEA_FOOT afloat), and its neighbour stands a
// hair's breadth outside it. So no pose may take any part of a toy outside its own ground: this lays every
// pose the rules can ask for on the toy as it is cut, the way the view does, and measures how far out from
// its middle the furthest corner of it comes. It is the check for what the intersection audit's samples can
// miss between two of them.

const m = new THREE.Matrix4(), part = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3()

/** How far from the toy's middle, across the ground, its furthest corner is in that pose; and how far below its foot its lowest one. */
function extent(kind: Kind, model: ReturnType<typeof toyModel>, pose: Pose): { out: number; under: number } {
  m.compose(p.set(pose.x, pose.y, pose.z), q.setFromEuler(e.set(pose.pitch, pose.yaw, pose.roll)), s.set(pose.sx, pose.sy, pose.sz))
  part.compose(p.set(model.pivot[0], model.pivot[1] + pose.part.y, model.pivot[2]), q.setFromEuler(e.set(pose.part.pitch, pose.part.yaw, pose.part.roll)), s.setScalar(pose.part.s)).premultiply(m)
  let out = 0, under = 0
  for (const [geometry, matrix] of [[model.body, m], [model.part, part]] as const) {
    const at = geometry.attributes.position
    for (let i = 0; i < at.count; i++) {
      v.fromBufferAttribute(at, i).applyMatrix4(matrix)
      out = Math.max(out, Math.hypot(v.x, v.z) * SIZE[kind])
      under = Math.min(under, v.y * SIZE[kind])
    }
  }
  return { out, under }
}

describe('a toy keeps to its own ground', () => {
  it.each(KINDS)('the %s, standing, tapped and spun, on the land and afloat', (kind) => {
    const model = toyModel(kind), pose = restPose(), wide: string[] = []
    for (const where of ['land', 'sea'] as const) {
      const ground = (where === 'sea' ? SEA_FOOT : FOOT)[kind]
      const cases: [string, (t: number) => Pose][] = [
        ...(['graze', 'munch', 'ask'] as Grazing[]).map((grazing): [string, (t: number) => Pose] => [`standing (${grazing})`, (t) => toyPose(kind, where, t, Infinity, WEIGHT[kind], grazing, pose)]),
        ['just landed', (t) => toyPose(kind, where, t / 12, Infinity, WEIGHT[kind], 'graze', pose)],
        ['tapped', (t) => toyPose(kind, where, 5 + t / 8, (t / 12) * POKE_S[kind] * 1.2, WEIGHT[kind], 'graze', pose)],
        ['spun', (t) => spunPose(kind, where, 1, t, toyPose(kind, where, t, Infinity, WEIGHT[kind], 'graze', pose))],
        ['spun and tapped', (t) => spunPose(kind, where, 0.6, t, toyPose(kind, where, 5 + t / 8, (t / 12) * POKE_S[kind] * 1.2, WEIGHT[kind], 'graze', pose))],
      ]
      for (const [name, at] of cases) {
        let most = 0
        for (let i = 0; i <= 720; i++) most = Math.max(most, extent(kind, model, at(i / 60)).out)
        // Half the gap between two toys is its own to use.
        if (most > ground + GAP / 2) wide.push(`${where}, ${name}: ${most.toFixed(2)} of ${ground}`)
      }
    }
    expect(wide).toEqual([])
  })

  it.each(KINDS)('the %s never goes into the land it stands on by more than a squash', (kind) => {
    const model = toyModel(kind), pose = restPose(), deep: string[] = []
    const cases: [string, (t: number) => Pose][] = [
      ['standing', (t) => toyPose(kind, 'land', t, Infinity, WEIGHT[kind], 'graze', pose)],
      ['just landed', (t) => toyPose(kind, 'land', t / 12, Infinity, WEIGHT[kind], 'graze', pose)],
      ['tapped', (t) => toyPose(kind, 'land', 5 + t / 8, (t / 12) * POKE_S[kind] * 1.2, WEIGHT[kind], 'graze', pose)],
      ['spun', (t) => spunPose(kind, 'land', 1, t, toyPose(kind, 'land', t, Infinity, WEIGHT[kind], 'graze', pose))],
    ]
    for (const [name, at] of cases) {
      let most = 0
      for (let i = 0; i <= 720; i++) most = Math.min(most, extent(kind, model, at(i / 60)).under)
      if (most < -0.08) deep.push(`${name}: ${most.toFixed(2)}`)
    }
    expect(deep).toEqual([])
  })
})
