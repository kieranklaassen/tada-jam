import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { TIERS } from '../config'
import type { Guide } from '../guide'
import { Island } from '../island'
import { fresh, type Saved } from '../save'
import { REAR_S, WASH_S } from '../wash'
import { KINDS, type Kind, type Toy } from '../toys'
import { Diorama } from './scene3d'

// The gull stands on its buoy as the two are drawn: the buoy rocks, and rides the swell of the wash, and the
// gull rides it. This lays the gull's body on the buoy mesh by mesh, the way the view does, in every frame of
// a wash and of a landing, and measures how far the one is into the other the way the intersection audit does.

const near = new THREE.Vector3(), hit = new THREE.Vector3()
const ray = new THREE.Ray(), skew = new THREE.Vector3(0.5377, 0.7071, 0.4581).normalize(), face = new THREE.Triangle(), box = new THREE.Box3(), size = new THREE.Vector3()

type Solid = { corners: THREE.Vector3[]; faces: [THREE.Vector3, THREE.Vector3, THREE.Vector3][]; box: THREE.Box3; scale: number }

/** A mesh as it stands in the scene: its corners and the middles of its faces, its faces, its box, and its size (the middle one of its three extents). */
function solid(mesh: THREE.Mesh): Solid {
  mesh.updateWorldMatrix(true, false)
  const at = mesh.geometry.attributes.position, index = mesh.geometry.index
  const points = Array.from({ length: at.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld))
  const faces: Solid['faces'] = []
  for (let f = 0; f < (index ? index.count : at.count) / 3; f++) {
    const i = index ? index.getX(f * 3) : f * 3, j = index ? index.getX(f * 3 + 1) : f * 3 + 1, k = index ? index.getX(f * 3 + 2) : f * 3 + 2
    faces.push([points[i], points[j], points[k]])
  }
  const middles = faces.map(([p, q, r]) => new THREE.Vector3().add(p).add(q).add(r).divideScalar(3))
  const bounds = new THREE.Box3().setFromPoints(points), extents = bounds.getSize(size).toArray().sort((x, y) => x - y)
  return { corners: [...points, ...middles], faces, box: bounds, scale: extents[1] }
}

/** How deep one solid reaches into another: the farthest any of its points lies from the other's skin while inside it (a ray from the point crosses the skin an odd number of times). */
function into(of: Solid, within: Solid): number {
  let depth = 0
  box.copy(within.box)
  for (const p of of.corners) {
    if (!box.containsPoint(p)) continue
    ray.set(p, skew)
    let crossings = 0
    for (const [p0, p1, p2] of within.faces) if (ray.intersectTriangle(p0, p1, p2, false, hit)) crossings += 1
    if (crossings % 2 === 0) continue
    let least = Infinity
    for (const [p0, p1, p2] of within.faces) least = Math.min(least, face.set(p0, p1, p2).closestPointToPoint(p, near).distanceTo(p))
    depth = Math.max(depth, least)
  }
  return depth
}

/** How far two meshes are into each other, as a share of the smaller one's size: the measure of the intersection audit, which lets 0.06 pass. */
function inside(one: THREE.Mesh, other: THREE.Mesh): number {
  const s = solid(one), t = solid(other)
  if (!s.box.intersectsBox(t.box)) return 0
  return Math.max(into(s, t), into(t, s)) / Math.min(s.scale, t.scale)
}

type Out = Partial<Record<Kind, ['land' | 'sea', number, number]>>

const island = (out: Out): Saved => ({
  ...fresh(4),
  toys: KINDS.map((kind): Toy => (out[kind] ? { kind, where: out[kind]![0], x: out[kind]![1], z: out[kind]![2] } : { kind, where: 'tray', x: 0, z: 0 })),
})

/** As much as the two may touch: half of what the intersection audit lets pass. */
const TOUCH = 0.03

const blank: Guide = { glow: 0, rings: [], hand: null }

/** Plays an island for a while, drawing every frame, and says how far the gull was into its buoy at its worst: its body, its head, its beak and its wings. */
function worst(game: Island, diorama: Diorama, seconds: number, clock: { at: number; low?: number }): number {
  const buoy = diorama.scene.getObjectByName('buoy') as THREE.Mesh, parts: THREE.Mesh[] = []
  diorama.scene.getObjectByName('gull')!.traverse((part) => { if ((part as THREE.Mesh).isMesh) parts.push(part as THREE.Mesh) })
  let most = 0
  for (let i = 0; i < seconds * 60; i++) {
    game.step(1 / 60)
    clock.at += 1 / 60
    diorama.update(game.show(), blank, clock.at, TIERS[0])
    clock.low = Math.min(clock.low ?? Infinity, game.show().gull.y)
    // (A gull that is nowhere near its buoy is not measured.)
    if (Math.hypot(game.show().gull.x - buoy.position.x, game.show().gull.z - buoy.position.z) > 3) continue
    for (const part of parts) most = Math.max(most, inside(part, buoy))
  }
  return most
}

const tap = (game: Island, target: Parameters<Island['press']>[0]): void => {
  game.press(target)
  game.release()
}

describe('the gull on its buoy, as the two are drawn', () => {
  it('finds a gull that is pushed into the buoy', () => {
    // The check itself: a gull stood half its height down into its buoy is found there.
    const diorama = new Diorama(), game = new Island(fresh(4))
    game.step(1 / 60)
    const frame = game.show()
    diorama.update({ ...frame, gull: { ...frame.gull, y: frame.gull.y - 0.9 } }, blank, 0, TIERS[0])
    expect(inside(diorama.scene.getObjectByName('gull-body') as THREE.Mesh, diorama.scene.getObjectByName('buoy') as THREE.Mesh)).toBeGreaterThan(0.2)
  })

  it('sits on it through the whole wash, and when a touch ends the wash at any point of the swell', () => {
    const afloat = { lighthouse: ['sea', 0, -4.25], boat: ['sea', 5.75, 0], sheep: ['sea', 3, 3], tree: ['sea', -3.51, 2.39], house: ['sea', -4.1, -1.1] } satisfies Out
    for (const out of [{}, afloat] as Out[]) {
      for (const cut of out === afloat ? [Infinity] : [Infinity, 1, 1.3, 1.7, 2.1, 2.5]) {
        const diorama = new Diorama(), game = new Island(island(out)), clock = { at: 0 }
        expect(worst(game, diorama, 1.5, clock)).toBeLessThan(TOUCH)
        tap(game, { kind: 'wave' })
        expect(worst(game, diorama, Math.min(cut, REAR_S + WASH_S + 2), clock)).toBeLessThan(TOUCH)
        if (cut === Infinity) continue
        tap(game, { kind: 'sky' })
        expect(worst(game, diorama, 3, clock)).toBeLessThan(TOUCH)
      }
    }
  })

  it('sets down on it while the swell lifts it: washed off the smoke of a house anywhere on the land, on an island turned any way', () => {
    // The wave takes the house home, and the gull comes to its buoy as the buoy goes up and down on the swell.
    for (const turn of [0, 0.8, 4]) {
      for (const [x, z] of [[-1.6, 0.3], [2, 0], [0.3, -1.9], [-2.2, -0.6]]) {
        // The whole wash for the first of them, which is the island of the audit's moment, and its swell for the rest; and the wash ended by a touch on a slot.
        for (const cut of turn === 0.8 && x === -1.6 ? [Infinity, 3.3] : [5]) {
          const diorama = new Diorama(), game = new Island({ ...island({ house: ['land', x, z], tree: ['sea', -4.25, 0] }), turn }), clock = { at: 0 }
          expect(worst(game, diorama, 0.5, clock)).toBeLessThan(TOUCH)
          tap(game, { kind: 'wave' })
          expect(worst(game, diorama, Math.min(cut, REAR_S + WASH_S + 2), clock)).toBeLessThan(TOUCH)
          if (cut === Infinity) continue
          tap(game, { kind: 'slot', toy: 'tree' })
          expect(worst(game, diorama, 3, clock)).toBeLessThan(TOUCH)
        }
      }
    }
  })

  it('sets down on it from each side and lifts off it to each side, while the buoy still rocks: from the smoke, from beside a house in the sea, and from a dive', () => {
    const places: Out['house'][] = [['land', 2, 0], ['land', -2, 0.4], ['land', 0, 2], ['land', 0.3, -2], ['sea', -4.1, -1.1], ['sea', -3, 3], ['sea', 3, -3], ['sea', 0, 4.25], ['sea', -4.25, 0], ['sea', -3, -3]]
    for (const house of places) {
      const diorama = new Diorama(), game = new Island(island({})), clock: { at: number; low?: number } = { at: 0 }
      // A poke sets the buoy rocking, and the tree splashing down sends the gull off the front of it in a dive and back onto it.
      tap(game, { kind: 'gull' })
      worst(game, diorama, 0.1, clock)
      tap(game, { kind: 'slot', toy: 'tree' })
      tap(game, { kind: 'sea', x: 2.5, z: 3.5 })
      expect(worst(game, diorama, 4, clock)).toBeLessThan(TOUCH)
      expect(clock.low).toBeLessThan(-1)
      // The house goes out and the gull lifts off to it; the house goes home and it comes back, with a poke just before each.
      tap(game, { kind: 'gull' })
      worst(game, diorama, 0.1, clock)
      tap(game, { kind: 'slot', toy: 'house' })
      tap(game, { kind: house![0], x: house![1], z: house![2] })
      expect(worst(game, diorama, 4, clock)).toBeLessThan(TOUCH)
      tap(game, { kind: 'toy', toy: 'house' })
      tap(game, { kind: 'slot', toy: 'house' })
      expect(worst(game, diorama, 4, clock)).toBeLessThan(TOUCH)
    }
  })
})
