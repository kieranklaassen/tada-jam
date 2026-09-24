import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { ScarfController, type Projector } from './controller'
import { LOOM, SCARF } from './layout'
import { ANIMALS, initialState, WIDTH, type AnimalKey, type Row } from './state'
import { BODY_EGG, buildAnimals, BUNNY_EAR, EggOutline, FOX_EAR, seatSnow, SNOW_SEATS, snowLumps, type Moment, type SnowLump } from './view/animals'
import type { YarnMaterials } from './view/yarn'

// A limb is sewn on at its shoulder: however it swings, hugs, stamps or
// flaps, it never sinks deeper into the body than it does at its shallowest,
// past the audit's pose limit (6% of the limb's middle extent).

const materials = {
  animal: () => ({ material: new THREE.MeshStandardMaterial(), warmth: { uCold: { value: 0 }, uBlush: { value: 0 } } }),
  crochet: new THREE.MeshStandardMaterial(),
} as unknown as YarnMaterials

const PPU = 10
const projector: Projector = {
  toScreen(p, out) {
    out.x = (p.x + 70) * PPU
    out.y = (80 - p.y) * PPU
    return true
  },
  toPlaneZ(s, z, out) {
    out.x = s.x / PPU - 70
    out.y = 80 - s.y / PPU
    out.z = z
    return true
  },
  toPlaneY(s, y, out) {
    out.x = s.x / PPU - 70
    out.y = y
    out.z = 0
    return true
  },
  pixelsPerUnit: () => PPU,
}
const row = (colour: number): Row => new Array<number>(WIDTH).fill(colour)

const POSE_LIMIT = 0.06
const LIMBS: Record<AnimalKey, string[]> = {
  bunny: ['head', 'arm-l', 'arm-r', 'feet'],
  penguin: ['head', 'flipper-l', 'flipper-r', 'foot-l', 'foot-r'],
  fox: ['head', 'paw-l', 'paw-r', 'tail'],
  bear: ['head', 'arm-l', 'arm-r', 'foot-l', 'foot-r'],
}

type Track = { least: number; most: number; at: string; leastAt: string; extent: number }
type Look = (key: AnimalKey, root: THREE.Object3D, when: string) => void

/**
 * Plays a visit (or, with no one at the loom, everyone warm on the hill), looking at every animal in sight every few frames;
 * the one at the loom hopes for its finished scarf for `hope` seconds before it is given.
 */
function playVisit(warm: AnimalKey[], atLoom: AnimalKey | null, look: Look, hope = 0): void {
  const state = initialState()
  for (const animal of warm) state.scarves[animal] = [[row(0), row(1)]]
  state.atLoom = atLoom
  state.loom = Array.from({ length: 8 }, (_, i) => row(i % 2))
  const game = new ScarfController(state, { save: () => {}, childAge: 5 })
  game.setProjector(projector)
  const animals = buildAnimals(materials)
  const moment: Moment = { t: 0, dt: 1 / 60, knitting: 0, hoping: false, focus: new THREE.Vector3(0, 30, 20), progress: 0, humAt: -Infinity, step: () => {}, puff: () => {} }
  let n = 0
  const frame = () => {
    game.step(1 / 60)
    moment.t = game.t
    n++
    for (const key of ANIMALS) {
      const actor = game.actors[key]
      moment.hoping = game.offered && game.state.atLoom === key
      animals[key].sync(actor, moment)
      if (!actor.visible) continue
      animals[key].update(actor, moment)
      if (n % 4) continue
      const root = animals[key].root
      root.updateMatrixWorld(true)
      look(key, root, `t=${game.t.toFixed(2)} ${atLoom ?? 'hill'}`)
    }
  }
  for (let i = 0; i < 60 * 20 && !game.offered; i++) frame()
  for (let i = 0; i < 60 * hope; i++) frame()
  const at = { x: (SCARF.x + 70) * PPU, y: (80 - (SCARF.top - 10)) * PPU }
  game.pointerDown(1, at, 0)
  game.pointerUp(1, at, 80)
  for (let i = 0; i < 60 * 24; i++) frame()
}

/** Every visit in turn, then everyone warm on the hill. */
function playAll(look: Look): void {
  for (const animal of ANIMALS) playVisit(ANIMALS.slice(0, ANIMALS.indexOf(animal)), animal, look)
  playVisit([...ANIMALS], null, look)
}

function eachVertex(mesh: THREE.Object3D, into: THREE.Matrix4, visit: (v: THREE.Vector3) => void): void {
  const v = new THREE.Vector3()
  const p = ((mesh as THREE.Mesh).geometry as THREE.BufferGeometry).attributes.position
  for (let i = 0; i < p.count; i++) visit(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(into))
}

describe('limbs sewn onto the body', () => {
  it('sink in no deeper than at their shallowest, through every visit and everyone warm on the hill', () => {
    const tracks = new Map<string, Track>()
    const outlines = Object.fromEntries(ANIMALS.map((key) => [key, new EggOutline(...BODY_EGG[key])])) as Record<AnimalKey, EggOutline>
    const toBody = new THREE.Matrix4()
    const size = new THREE.Vector3()
    playAll((key, root, when) => {
      toBody.copy(root.getObjectByName('body')!.matrixWorld).invert()
      for (const name of LIMBS[key]) {
        const limb = root.getObjectByName(name) as THREE.Mesh
        let deepest = -Infinity
        eachVertex(limb, toBody, (v) => (deepest = Math.max(deepest, outlines[key].depth(v.x, v.y, v.z))))
        const id = `${key} ${name}`
        let track = tracks.get(id)
        if (!track) {
          limb.geometry.computeBoundingBox()
          limb.geometry.boundingBox!.getSize(size)
          const sorted = [size.x, size.y, size.z].sort((a, b) => a - b)
          track = { least: Infinity, most: -Infinity, at: '', leastAt: '', extent: sorted[1] }
          tracks.set(id, track)
        }
        if (deepest < track.least) {
          track.least = deepest
          track.leastAt = `${when} rx=${limb.rotation.x.toFixed(2)}`
        }
        if (deepest > track.most) {
          track.most = deepest
          track.at = `${when} rx=${limb.rotation.x.toFixed(2)}`
        }
      }
    })
    const report = [...tracks.entries()].map(([id, t]) => `${id}: ${(((t.most - t.least) / t.extent) * 100).toFixed(1)}% (${(t.most - t.least).toFixed(2)}: deepest ${t.at}, shallowest ${t.leastAt})`)
    for (const [id, track] of tracks) expect((track.most - track.least) / track.extent, `${id}\n${report.join('\n')}`).toBeLessThan(POSE_LIMIT)
    expect(tracks.size).toBe(Object.values(LIMBS).flat().length)
  }, 120_000)
})

/** The loom's posts and the feet running forward under them, as capsules. */
const LOOM_LOW = [-1, 1].flatMap((side) => {
  const x = LOOM.x + side * LOOM.postX
  const footZ = LOOM.z + LOOM.foot.z
  return [
    { line: new THREE.Line3(new THREE.Vector3(x, 0, LOOM.z), new THREE.Vector3(x, LOOM.rodY, LOOM.z)), r: LOOM.postBottom },
    { line: new THREE.Line3(new THREE.Vector3(x, LOOM.foot.y, footZ - LOOM.foot.length / 2), new THREE.Vector3(x, LOOM.foot.y, footZ + LOOM.foot.length / 2)), r: LOOM.foot.radius },
  ]
})
/** The fox's head is a ball this big (squashed a little), its snout and cheeks in front. */
const FOX_HEAD = new THREE.Vector3(6.8 * 1.08, 6.8 * 0.94, 6.8)

describe("the fox's tail", () => {
  const TAIL = ['tail', 'tail-tip']

  it('flung round in the chase beside the loom, passes over its posts and feet', () => {
    const near = new THREE.Vector3()
    const world = new THREE.Matrix4()
    let worst = { into: -Infinity, at: '' }
    playVisit(['bunny', 'penguin'], 'fox', (key, root, when) => {
      if (key !== 'fox') return
      for (const name of TAIL)
        eachVertex(root.getObjectByName(name)!, world, (v) => {
          for (const { line, r } of LOOM_LOW) {
            const into = r - line.closestPointToPoint(v, true, near).distanceTo(v)
            if (into > worst.into) worst = { into, at: `${name} ${when}` }
          }
        })
    })
    expect(worst.into, worst.at).toBeLessThan(0)
  }, 60_000)

  it('never goes into its own head, held up in the cold or swishing', () => {
    const toHead = new THREE.Matrix4()
    let worst = { into: -Infinity, at: '' }
    playAll((key, root, when) => {
      if (key !== 'fox') return
      toHead.copy(root.getObjectByName('head')!.matrixWorld).invert()
      for (const name of TAIL)
        eachVertex(root.getObjectByName(name)!, toHead, (v) => {
          const into = (1 - Math.hypot(v.x / FOX_HEAD.x, v.y / FOX_HEAD.y, v.z / FOX_HEAD.z)) * FOX_HEAD.z
          if (into > worst.into) worst = { into, at: `${name} ${when}` }
        })
    })
    expect(worst.into, worst.at).toBeLessThan(0)
  }, 120_000)
})

type Snowy = 'bunny' | 'fox'
const SNOWY: Snowy[] = ['bunny', 'fox']
/**
 * How far each ear splays out (rotation.z, out from the head) and twists
 * (|rotation.y|), from the rigs in view/animals.ts: the fox's cold ears splay
 * 0.12 + 0.4 × cold; the bunny's go from pricked up in hope (0.18, a little
 * past upright as that hope bounces when it is given its scarf) to flopped
 * out in the cold and flung out mid-binky (0.18 + 0.7 + 0.95).
 */
const EAR_SWING: Record<Snowy, { splay: [number, number]; twist: number }> = {
  fox: { splay: [0.12, 0.52], twist: 0.22 },
  bunny: { splay: [-0.1, 1.83], twist: 0 },
}
/** How far inside an ear (in its own frame) a point is: positive inside. */
const INSIDE_EAR: Record<Snowy, (p: THREE.Vector3) => number> = {
  fox: (p) => {
    const { radius, height, y, depth } = FOX_EAR
    const up = p.y - (y - height / 2)
    if (up < 0) return up
    if (up > height) return height - up
    return (radius * (1 - up / height) - Math.hypot(p.x, p.z / depth)) * depth
  },
  bunny: (p) => {
    const { radius, length, y, lining } = BUNNY_EAR
    const along = (from: number, to: number) => Math.max(from, Math.min(to, p.y))
    const outer = radius - Math.hypot(p.x, p.y - along(y - length / 2, y + length / 2), p.z)
    const inner = (lining.radius - Math.hypot(p.x, p.y - along(lining.y - lining.length / 2, lining.y + lining.length / 2), (p.z - lining.z) / lining.depth)) * lining.depth
    return Math.max(outer, inner)
  },
}
/** How far inside the snow (in its own frame) a point is: positive inside a lump. */
function insideSnow(lumps: SnowLump[], p: THREE.Vector3): number {
  let into = -Infinity
  for (const { at, radius, scale } of lumps) {
    const k = Math.hypot((p.x - at[0]) / (radius * scale[0]), (p.y - at[1]) / (radius * scale[1]), (p.z - at[2]) / (radius * scale[2]))
    into = Math.max(into, (1 - k) * radius * Math.min(...scale))
  }
  return into
}
function uniquePoints(mesh: THREE.Mesh): THREE.Vector3[] {
  const p = (mesh.geometry as THREE.BufferGeometry).attributes.position
  const seen = new Map<string, THREE.Vector3>()
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i)
    seen.set(`${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`, v)
  }
  return [...seen.values()]
}

describe("the snow on the bunny's and the fox's heads", () => {
  it('sits in front of their ears in every pose the ears can take while it is on, and as it pops off', () => {
    const animals = buildAnimals(materials)
    const cap = new THREE.Object3D()
    const ear = new THREE.Object3D()
    const toCap = new THREE.Matrix4()
    const toEar = new THREE.Matrix4()
    const p = new THREE.Vector3()
    for (const key of SNOWY) {
      const root = animals[key].root
      const seat = SNOW_SEATS[key]
      const lumps = snowLumps(seat.radius, seat.depth)
      const snowPoints = uniquePoints(root.getObjectByName('snow-cap') as THREE.Mesh)
      const earMesh = root.getObjectByName('ear-r') as THREE.Mesh
      const earPoints = uniquePoints(earMesh)
      const { splay, twist } = EAR_SWING[key]
      let worst = { into: -Infinity, at: '' }
      for (const melt of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98]) {
        seatSnow(cap, seat, melt)
        cap.updateMatrix()
        const room = seat.earsForward
        const tips: number[] = []
        for (let rx = -Math.PI; rx < room; rx += 0.05) tips.push(rx)
        tips.push(room)
        for (const side of [1, -1])
          for (let s = 0; s <= 4; s++)
            for (const turn of twist ? [-twist, 0, twist] : [0])
              for (const tip of tips) {
                const out = splay[0] + ((splay[1] - splay[0]) * s) / 4
                ear.position.set(side * earMesh.position.x, earMesh.position.y, earMesh.position.z)
                ear.rotation.set(tip, turn, -side * out)
                ear.updateMatrix()
                const at = () => `${key} ${side > 0 ? 'right' : 'left'} ear tipped ${tip.toFixed(2)}, splayed ${out.toFixed(2)}, twisted ${turn}, snow ${melt} melted`
                toCap.copy(cap.matrix).invert().multiply(ear.matrix)
                for (const v of earPoints) {
                  const into = insideSnow(lumps, p.copy(v).applyMatrix4(toCap)) * cap.scale.x
                  if (into > worst.into) worst = { into, at: at() }
                }
                toEar.copy(ear.matrix).invert().multiply(cap.matrix)
                for (const v of snowPoints) {
                  const into = INSIDE_EAR[key](p.copy(v).applyMatrix4(toEar))
                  if (into > worst.into) worst = { into, at: at() }
                }
              }
      }
      expect(worst.into, worst.at).toBeLessThan(0)
    }
  }, 120_000)

  it('keeps those ears to those swings in their visits, hoping and all, and they never meet', () => {
    const toSnow = new THREE.Matrix4()
    const toEar = new THREE.Matrix4()
    const swung: string[] = []
    let worst = { into: -Infinity, at: '' }
    const look: Look = (key, root, when) => {
      if (key !== 'bunny' && key !== 'fox') return
      const cap = root.getObjectByName('snow-cap')!
      if (!cap.visible) return
      const seat = SNOW_SEATS[key]
      const lumps = snowLumps(seat.radius, seat.depth)
      const room = seat.earsForward
      const { splay, twist } = EAR_SWING[key]
      toSnow.copy(cap.matrixWorld).invert()
      for (const name of ['ear-l', 'ear-r']) {
        const ear = root.getObjectByName(name)!
        const out = name === 'ear-r' ? -ear.rotation.z : ear.rotation.z
        if (ear.rotation.x > room + 1e-9 || out < splay[0] - 1e-9 || out > splay[1] + 1e-9 || Math.abs(ear.rotation.y) > twist + 1e-9)
          swung.push(`${key} ${name} ${when}: ${[ear.rotation.x, ear.rotation.y, ear.rotation.z].map((n) => n.toFixed(2)).join(', ')}`)
        eachVertex(ear, toSnow, (v) => {
          const into = insideSnow(lumps, v)
          if (into > worst.into) worst = { into, at: `${key} ${name} into the snow ${when}` }
        })
        toEar.copy(ear.matrixWorld).invert()
        eachVertex(cap, toEar, (v) => {
          const into = INSIDE_EAR[key](v)
          if (into > worst.into) worst = { into, at: `the snow into the ${key}'s ${name} ${when}` }
        })
      }
    }
    playVisit([], 'bunny', look, 4)
    playVisit(['bunny', 'penguin'], 'fox', look, 4)
    expect(swung.slice(0, 5)).toEqual([])
    expect(worst.into, worst.at).toBeLessThan(0)
  }, 120_000)
})
