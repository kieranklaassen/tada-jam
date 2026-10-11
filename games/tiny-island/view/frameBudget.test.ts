import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { answer, type Hands } from '../answer'
import { TIERS } from '../config'
import { guideOf, type Guide } from '../guide'
import { IdleLadder } from '../guidance'
import { Island } from '../island'
import { CORNER } from '../overlay'
import { deserialize, fresh } from '../save'
import { pick } from '../pick'
import { FOOT, KINDS, SIZE, TALL, type Kind } from '../toys'
import { toyModel } from './models'
import { Diorama } from './scene3d'

// What a frame costs, counted with no renderer: each visible mesh is one draw (an instanced mesh is one draw
// however many it holds), and the triangles are those of every visible geometry. The look asks for fewer than
// about 40 draws; the jam's bar is 80.

const run = (island: Island, seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) island.step(1 / 60) }
const blank = (): Guide => ({ glow: 0, rings: [], hand: null })

function triangles(diorama: Diorama): number {
  let count = 0
  diorama.scene.traverseVisible((object) => {
    const mesh = object as THREE.InstancedMesh
    if (!mesh.isMesh) return
    const each = mesh.geometry.index ? mesh.geometry.index.count / 3 : mesh.geometry.attributes.position.count / 3
    count += each * (mesh.isInstancedMesh ? mesh.count : 1)
  })
  return count
}

/** The busiest frame the toy can make: everything out, a toy in the finger, rings, puffs, the beam, and the hand. */
function busiest(): { diorama: Diorama; island: Island } {
  const diorama = new Diorama(), island = new Island(fresh(4))
  const set = (kind: Kind, x: number, z: number): void => {
    island.press({ kind: 'slot', toy: kind })
    island.press({ kind: 'land', x, z })
    run(island, 0.6)
  }
  set('lighthouse', -1.5, -1.2)
  set('house', 1.4, -0.9)
  set('tree', -1.2, 1.3)
  set('sheep', 1.5, 1.2)
  island.press({ kind: 'whale' })
  island.press({ kind: 'sea', x: 4.2, z: 1 })
  island.press({ kind: 'slot', toy: 'boat' })
  island.dragStart()
  island.drag({ x: 4, z: 2 })
  run(island, 0.2)
  const guide = guideOf(new IdleLadder(0).update(6), island.waiting, island.hand, island.handFor, blank())
  diorama.update(island.show(), guide, 3, TIERS[0])
  return { diorama, island }
}

describe('what a frame draws', () => {
  it('draws the first frame of a bare island in under 36 draws', () => {
    const diorama = new Diorama(), island = new Island(fresh(4))
    diorama.update(island.show(), blank(), 0, TIERS[0])
    expect(diorama.draws().length).toBeLessThan(36)
    expect(triangles(diorama)).toBeLessThan(12000)
  })

  it('never draws more than 40, with everything out and everything in the air', () => {
    const { diorama } = busiest()
    const draws = diorama.draws()
    expect(draws).toContain('lighthouse-beam')
    expect(draws).toContain('aim')
    expect(draws).toContain('rings')
    expect(draws).toContain('puffs')
    expect(draws).toContain('hand')
    expect(draws.length).toBeLessThanOrEqual(40)
    expect(triangles(diorama)).toBeLessThan(14000)
  })

  it('names every mesh, each name once', () => {
    const { diorama } = busiest()
    const names: string[] = []
    diorama.scene.traverse((object) => { if ((object as THREE.Mesh).isMesh) names.push(object.name) })
    expect(names.every((name) => name.length > 0)).toBe(true)
    expect(new Set(names).size).toBe(names.length)
  })

  it('shows the place alone until the toy has a frame, so nothing stands in a heap before the slot is read', () => {
    const diorama = new Diorama(), draws = diorama.draws()
    for (const kind of KINDS) expect(draws).not.toContain(`${kind}-body`)
    expect(draws).not.toContain('cat-body')
    expect(draws).toContain('turntable')
    expect(draws).toContain('sea')
  })

  it('draws fewer puffs on a cheaper tier, and stills the glint of the sea', () => {
    const { diorama, island } = busiest()
    for (let i = 0; i < 6; i++) { island.press({ kind: 'whale' }); run(island, 0.05) }
    const count = (tier: number): number => {
      diorama.update(island.show(), blank(), 3, TIERS[tier])
      let puffs = 0
      diorama.scene.traverse((object) => { if (object.name === 'puffs') puffs = (object as THREE.InstancedMesh).count })
      return puffs
    }
    expect(count(0)).toBeGreaterThan(TIERS[3].puffs)
    expect(count(3)).toBe(TIERS[3].puffs)
  })

  it('stands the camera and the residents again for a surface of another shape', () => {
    const diorama = new Diorama()
    const wide = { ...diorama.posts.buoy }
    diorama.resize(820, 1180)
    expect(diorama.lens.width).toBe(820)
    expect(diorama.posts.buoy).not.toEqual(wide)
    diorama.resize(1180, 820)
    expect(diorama.posts.buoy).toEqual(wide)
  })

  it('lets everything go', () => {
    const { diorama } = busiest()
    expect(() => diorama.dispose()).not.toThrow()
  })

  it('has every mesh on show while the shaders are made ready, the puffs and the rings among them, and puts them away again', () => {
    const diorama = new Diorama()
    let seen: string[] = []
    diorama.warm(() => { seen = diorama.draws() })
    for (const name of ['puffs', 'rings', 'discs', 'aim', 'hand', 'lighthouse-beam', 'cat-body', 'gull-body', 'house-bits', ...KINDS.map((kind) => `${kind}-body`)]) expect(seen, name).toContain(name)
    const after = diorama.draws()
    for (const name of ['puffs', 'rings', 'aim', 'hand', 'lighthouse-beam', 'cat-body']) expect(after).not.toContain(name)
  })
})

describe('the mark under a carried toy', () => {
  it('is a ring where the toy will come down on the island, and a whole disc with no hole on its slot in the tray, where a ring in the slot could be read as a numeral', () => {
    const diorama = new Diorama(), island = new Island(fresh(4)), blank: Guide = { glow: 0, rings: [], hand: null }
    diorama.resize(1180, 820)
    const aim = diorama.scene.getObjectByName('aim') as THREE.Mesh
    /** How near the middle the mark's nearest vertex is, as a share of its radius: nothing for a disc, most of the way out for a ring. */
    const hole = (): number => {
      const at = aim.geometry.getAttribute('position')
      let near = Infinity, far = 0
      for (let i = 0; i < at.count; i++) { const r = Math.hypot(at.getX(i), at.getZ(i)); near = Math.min(near, r); far = Math.max(far, r) }
      return near / far
    }
    island.press({ kind: 'slot', toy: 'house' })
    island.dragStart()
    island.drag({ x: 1, z: 0.5 })
    island.step(1 / 60)
    diorama.update(island.show(), blank, 0, TIERS[0])
    expect(aim.visible).toBe(true)
    expect(hole()).toBeGreaterThan(0.5)
    // Back over the tray: it would go home.
    island.drag({ x: 0, z: 9 })
    island.step(1 / 60)
    expect(island.show().spot?.home).toBe(true)
    diorama.update(island.show(), blank, 0, TIERS[0])
    expect(aim.visible).toBe(true)
    expect(hole()).toBe(0)
    // And out again: the ring again.
    island.drag({ x: -1, z: 0.5 })
    island.step(1 / 60)
    diorama.update(island.show(), blank, 0, TIERS[0])
    expect(hole()).toBeGreaterThan(0.5)
    expect(() => diorama.dispose()).not.toThrow()
  })
})

describe('the toys as they are cut', () => {
  it('stands each as tall and as wide as the rules take it to be', () => {
    for (const kind of KINDS) {
      // The body is cut standing on its own foot. The part that moves (the lamp's roof, the sail, the head, the crown, the door) is cut about its own hinge, and is not measured here.
      const body = toyModel(kind).body
      body.computeBoundingBox()
      const box = body.boundingBox!
      // The chimney stands above the height a hand lifts the house by; nothing else is taller than it is taken to be.
      expect(box.max.y * SIZE[kind], `${kind} tall`).toBeLessThanOrEqual(TALL[kind] + (kind === 'house' ? 0.4 : 0.12))
      if (kind === 'lighthouse' || kind === 'boat') expect(box.max.y * SIZE[kind], `${kind} tall`).toBeGreaterThanOrEqual(TALL[kind] - 0.4)
      // The boat's keel is under the water line; nothing else goes below its own foot.
      expect(box.min.y * SIZE[kind], `${kind} foot`).toBeGreaterThanOrEqual(kind === 'boat' ? -0.3 : -0.06)
      // And none is wider than the ground it is given, with the room a toy keeps from its neighbour.
      expect(Math.max(box.max.x, -box.min.x) * SIZE[kind], `${kind} wide`).toBeLessThanOrEqual(FOOT[kind] + 0.3)
    }
  })
})

describe('the sky', () => {
  it.each([[1180, 820], [1024, 768], [820, 1180]])('on a surface of %i by %i has a sun and clouds a small finger can find, in the frame and clear of the home control', (width, height) => {
    const diorama = new Diorama(), island = new Island(fresh(4))
    diorama.resize(width, height)
    island.posts = diorama.posts
    island.step(1 / 60)
    const sky = diorama.skyNow(), lens = diorama.lens, standing = island.standing()
    const sun = lens.glass(sky.sun.x, sky.sun.y, sky.sun.z)
    expect(pick(lens, sun.x, sun.y, standing, sky)).toEqual({ kind: 'sun' })
    expect(pick(lens, sun.x + 30, sun.y, standing, sky)).toEqual({ kind: 'sun' })
    expect(sun.x).toBeGreaterThan(44)
    expect(sun.y).toBeGreaterThan(30)
    // Not under the home control: a round of 48 pixels at the top centre.
    expect(Math.abs(sun.x - width / 2)).toBeGreaterThan(24 + 60)
    let found = 0
    sky.clouds.forEach((cloud, index) => {
      const at = lens.glass(cloud.x, cloud.y, cloud.z)
      if (at.x < 0 || at.x > width || at.y < 0) return
      const hit = pick(lens, at.x, at.y, standing, sky)
      // The gull on its buoy stands in front of one cloud on some surfaces: the touch is then the gull's.
      if (hit.kind === 'gull') return
      found += 1
      expect(hit).toMatchObject({ kind: 'cloud', index })
    })
    expect(found).toBeGreaterThanOrEqual(2)
    // Without the sky's things the same touch is bare sky.
    expect(pick(lens, sun.x, sun.y, standing).kind).toBe('sky')
  })

  it.each([[1180, 820], [1024, 768], [820, 1180]])("on a surface of %i by %i leaves the grown-up's corner bare sky: no cloud is drawn in it, drifted or bobbing, and a finger there is on nothing", (width, height) => {
    const diorama = new Diorama()
    diorama.resize(width, height)
    const clouds = diorama.scene.getObjectByName('clouds') as THREE.InstancedMesh, shape = clouds.geometry.attributes.position
    const matrix = new THREE.Matrix4(), point = new THREE.Vector3()
    for (const age of [2, 4]) {
      const island = new Island(fresh(age), 1, diorama.posts)
      island.step(1 / 60)
      const sky = diorama.skyNow(), lens = diorama.lens, standing = island.standing()
      // Every point of the corner, with the sky's things counted: bare sky.
      for (let x = width - CORNER; x <= width; x += 6) for (let y = 0; y <= CORNER; y += 6) expect(pick(lens, x, y, standing, sky), `${x} ${y}`).toEqual({ kind: 'sky' })
      // And nothing of a cloud is drawn there at any moment of its drift, or while it bobs from a breath of wind.
      for (const breeze of [Infinity, 0.4, 0.8]) for (let seconds = 0; seconds < 120; seconds += 3.7) {
        diorama.update({ ...island.show(), breeze }, { glow: 0, rings: [], hand: null }, seconds, TIERS[0])
        for (let i = 0; i < clouds.count; i++) {
          clouds.getMatrixAt(i, matrix)
          for (let k = 0; k < shape.count; k++) {
            const at = lens.glass(...point.fromBufferAttribute(shape, k).applyMatrix4(matrix).toArray())
            expect(at.x >= width - CORNER && at.y <= CORNER, `cloud ${i} at ${Math.round(at.x)}, ${Math.round(at.y)} after ${seconds} s`).toBe(false)
          }
        }
      }
    }
  })
})

describe("the audit's hold on the boat with the sheep aboard", () => {
  // The moment `sheep-tree-and-boat` of the intersection audit, played in the model at the audit's size with its
  // own points and waits. A finger on the middle of the boat is on the sheep; the audit takes the boat by its hull,
  // a little under the middle of its body. The numbers are the script's: change the two together.
  const W = 1180, H = 820, HULL_UNDER = { land: 0.064, sea: 0.037 }
  const SLOTS = { tree: [0.681, 0.791], boat: [0.319, 0.791] }, LAND = { right: [0.608, 0.416], front: [0.5, 0.487] }, SEA_RIGHT = [0.748, 0.438], TRAY = [0.777, 0.909]

  it('taps the sheep on the deck, lifts the boat by its hull on the land and afloat, and sends both home', () => {
    const diorama = new Diorama()
    diorama.resize(W, H)
    const toys = KINDS.map((kind) => (kind === 'sheep' ? { kind, where: 'land', x: -1.8, z: 0.6 } : kind === 'house' ? { kind, where: 'land', x: 0, z: -1.6 } : { kind, where: 'tray', x: 0, z: 0 }))
    const island = new Island(deserialize(JSON.parse(JSON.stringify({ ...fresh(4), toys })), 4), 1, diorama.posts), hands: Hands = { aside: false }
    const blank: Guide = { glow: 0, rings: [], hand: null }
    let seconds = 0
    const wait = (ms: number): void => { for (let t = 0; t < ms / 1000; t += 1 / 60) { island.step(1 / 60); seconds += 1 / 60 } }
    const px = (at: readonly number[]): { x: number; y: number } => ({ x: at[0] * W, y: at[1] * H })
    const say = (gesture: Parameters<typeof answer>[0]): void => answer(gesture, island, diorama.lens, diorama.skyNow(), W, hands)
    const tap = (at: readonly number[]): void => { say({ type: 'press', at: px(at) }); say({ type: 'tap', at: px(at) }) }
    const drag = (from: readonly number[], to: readonly number[], ms: number): void => {
      say({ type: 'press', at: px(from) })
      say({ type: 'dragStart', from: px(from) })
      for (let i = 1; i <= 10; i++) {
        say({ type: 'dragMove', from: px(from), at: { x: (from[0] + (to[0] - from[0]) * (i / 10)) * W, y: (from[1] + (to[1] - from[1]) * (i / 10)) * H } })
        wait(ms / 10)
      }
      say({ type: 'dragEnd', from: px(from), at: px(to) })
    }
    /** Where the audit finds a toy: the middle of the box of its body, on the glass. */
    const find = (kind: Kind): number[] => {
      diorama.update(island.show(), blank, seconds, TIERS[0])
      diorama.scene.updateMatrixWorld(true)
      const middle = new THREE.Box3().setFromObject(diorama.scene.getObjectByName(`${kind}-body`)!).getCenter(new THREE.Vector3()), at = diorama.lens.glass(middle.x, middle.y, middle.z)
      return [at.x / W, at.y / H]
    }
    const hull = (where: 'land' | 'sea'): number[] => { const [x, y] = find('boat'); return [x, y + HULL_UNDER[where]] }
    const on = (at: readonly number[]) => pick(diorama.lens, at[0] * W, at[1] * H, island.standing(), diorama.skyNow())
    const state = (kind: Kind) => island.state.toys[KINDS.indexOf(kind)]

    wait(500)
    tap(SLOTS.tree); wait(200); tap(LAND.right); wait(4500)
    tap(find('sheep')); wait(1500)
    tap(SLOTS.boat); wait(200); tap(LAND.front); wait(1500)
    expect(state('boat').where).toBe('land')
    // Set down on the middle of the boat's body the sheep would land behind it: the ground under that point of the glass is past the stern. The hull point is over the boat's own ground.
    drag(find('sheep'), hull('land'), 400)
    wait(3000)
    expect(state('sheep').where).toBe('boat')
    // The sheep on the deck is the sheep, and the middle of the boat's body is the sheep too.
    expect(on(find('sheep'))).toEqual({ kind: 'toy', toy: 'sheep' })
    expect(on(find('boat'))).toEqual({ kind: 'toy', toy: 'sheep' })
    tap(find('sheep')); wait(1500)
    // By its hull the boat is lifted with the sheep on it, and both are afloat.
    expect(on(hull('land'))).toEqual({ kind: 'toy', toy: 'boat' })
    drag(hull('land'), SEA_RIGHT, 600)
    wait(6000)
    expect(state('boat').where).toBe('sea')
    expect(state('sheep').where).toBe('boat')
    tap(find('sheep')); wait(1500)
    expect(on(hull('sea'))).toEqual({ kind: 'toy', toy: 'boat' })
    drag(hull('sea'), TRAY, 500)
    wait(2000)
    expect(state('boat').where).toBe('tray')
    expect(state('sheep').where).toBe('tray')
  })
})
