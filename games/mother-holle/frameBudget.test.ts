import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { IDS } from './layout'
import { makeFigure } from './view/figures'
import { Land } from './view/land'
import { Holle } from './view/quilt'
import { Hand } from './testing'
import { newPose } from './motion'

// The frame budget, counted and never timed. The renderer needs a screen; what
// it is given does not: each mesh is one draw.

const MOST_DRAWS = 80
const MOST_TRIANGLES = 160_000
/** Eggs, lanterns, shadows, loose bits, the ring and the hand (view.ts). */
const OVER = 6

const scene = () => {
  const cloth = new THREE.MeshLambertMaterial()
  const land = new Land(cloth, new THREE.MeshBasicMaterial(), cloth), holle = new Holle(cloth, cloth)
  const figures = IDS.map((id) => makeFigure(id, cloth))
  const root = new THREE.Group()
  root.add(land.group, holle.group, ...figures.map((f) => f.root))
  return { root, land, holle, figures }
}
const meshes = (o: THREE.Object3D) => { const out: THREE.Mesh[] = []; o.traverse((m) => { if (m instanceof THREE.Mesh) out.push(m) }); return out }

describe('a frame', () => {
  it('is under the draws and the triangles of the bar, with everything shown', () => {
    const all = meshes(scene().root)
    expect(all.length + OVER).toBeLessThanOrEqual(MOST_DRAWS)
    expect(all.reduce((n, m) => n + (m.geometry.index?.count ?? 0) / 3, 0)).toBeLessThan(MOST_TRIANGLES)
    for (const m of all) expect(m.castShadow || m.receiveShadow, m.name).toBe(false)
  })
  it('is drawn from finite numbers, on a bare hill and on a white one', () => {
    const { root, land, holle, figures } = scene(), h = new Hand()
    for (let k = 0; k < 6; k++) {
      h.drag(-9, 4, 10, 4, 0.9)
      land.snow(h.v.snow)
      holle.update(h.v, k, 1 / 60, { x: 0, y: 0 }, k / 6)
      for (const f of figures) f.apply(newPose())
      for (const m of meshes(root)) { const a = m.geometry.getAttribute('position').array; for (let i = 0; i < a.length; i += 7) if (!Number.isFinite(a[i])) throw new Error(m.name) }
    }
  })
  it('makes nothing while it plays', () => {
    const { root, land, holle } = scene(), h = new Hand(), before = meshes(root).map((m) => m.geometry.uuid).join()
    for (let k = 0; k < 4; k++) { h.drag(-9, 4, 10, 4, 0.9); land.snow(h.v.snow); holle.update(h.v, k, 0.02, { x: 0, y: 0 }, 0) }
    expect(meshes(root).map((m) => m.geometry.uuid).join()).toBe(before)
  })
})
