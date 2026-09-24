import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { characterDetail, createGovernor, GOVERNOR, mergeStatic, smallCastersOff, snapshot, type SmoothGame } from '../../public/alien-frontier/jam-smooth.js'

// Frame budget for the Alien Frontier showcase, counted, not timed: the game is
// prebuilt, so what the jam controls is the work its smoothness shim removes
// (draw calls: one per mesh on the camera's layer, plus one per shadow caster)
// and the decisions its governor makes. Built on real three.js objects.

function world() {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera()
  const wood = new THREE.MeshStandardMaterial()
  const stone = new THREE.MeshStandardMaterial()
  const box = new THREE.BoxGeometry(1, 1, 1)
  // Scenery: 30 fence posts and 20 rocks in plain groups nobody holds.
  for (let g = 0; g < 10; g++) {
    const group = new THREE.Group()
    for (let i = 0; i < 3; i++) {
      const post = new THREE.Mesh(box, wood)
      post.position.set(g * 5 + i, 0.5, 0)
      post.castShadow = true
      group.add(post)
    }
    for (let i = 0; i < 2; i++) {
      const rock = new THREE.Mesh(box, stone)
      rock.position.set(g * 5 + i, 0, 3)
      group.add(rock)
    }
    scene.add(group)
  }
  // A windmill whose blades turn with their group, and an NPC the game holds and moves.
  const windmill = new THREE.Group()
  const tower = new THREE.Mesh(box, wood)
  const blades = new THREE.Group()
  blades.add(new THREE.Mesh(box, wood), new THREE.Mesh(box, wood))
  windmill.add(tower, blades)
  scene.add(windmill)
  const npc = new THREE.Group()
  for (let i = 0; i < 12; i++) npc.add(new THREE.Mesh(new THREE.BoxGeometry(1 - i * 0.07, 1, 1), stone))
  npc.position.set(200, 0, 0)
  scene.add(npc)
  const game: SmoothGame = { scene, camera, renderer: {} as THREE.WebGLRenderer, npcs: { pete: { rig: { root: npc } } } }
  scene.updateMatrixWorld(true)
  return { game, scene, windmill, blades, npc, box }
}

const meshesOnCamera = (scene: THREE.Scene) => {
  let n = 0
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.layers.mask !== 0) n++ })
  return n
}

describe('the smoothness shim', () => {
  it('merges still scenery into one draw per material, and leaves moving and held objects alone', () => {
    const { game, scene, windmill, blades, npc } = world()
    const before = snapshot(game)
    blades.rotation.z = 0.5
    scene.updateMatrixWorld(true)
    const draws = meshesOnCamera(scene)
    const report = mergeStatic(game, before)
    expect(report.removed, 'scenery meshes merged').toBe(50)
    expect(report.added, 'one merged mesh per material').toBe(2)
    expect(meshesOnCamera(scene), 'draw calls after the merge').toBe(draws - 50 + 2)
    expect(windmill.parent, 'the windmill, which moved while watched').toBe(scene)
    expect(npc.children, 'the NPC the game holds').toHaveLength(12)
    // Transforms are baked: the merged posts still stand where the posts stood.
    const merged = scene.children.find((o) => o.name === 'jam-merged-static' && (o as THREE.Mesh).castShadow) as THREE.Mesh
    merged.geometry.computeBoundingBox()
    expect(merged.geometry.boundingBox!.max.x).toBeCloseTo(47.5)
  })

  it('draws a far character from its largest parts only, and all of it up close', () => {
    const { game, scene, npc } = world()
    const report = characterDetail(game, 50, 5)
    expect(report.farParts).toBe(7)
    const onCamera = () => npc.children.filter((o) => o.layers.mask !== 0).length
    expect(onCamera(), 'parts drawn 200 m away').toBe(5)
    npc.position.set(10, 0, 0)
    scene.updateMatrixWorld(true)
    return new Promise<void>((resolve) => setTimeout(() => {
      expect(onCamera(), 'parts drawn 10 m away').toBe(12)
      resolve()
    }, 300))
  })

  it('stops tiny parts casting shadows', () => {
    const { game, scene } = world()
    const tiny = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial())
    tiny.castShadow = true
    scene.add(tiny)
    scene.updateMatrixWorld(true)
    expect(smallCastersOff(game, 0.25).off).toBe(1)
    expect(tiny.castShadow).toBe(false)
  })
})

describe('the showcase governor', () => {
  const feed = (governor: ReturnType<typeof createGovernor>, seconds: number, ms: number) => {
    const changes: number[] = []
    for (let t = 0; t < seconds; t += ms / 1000) {
      const next = governor.sample(ms / 1000)
      if (next !== null) changes.push(next)
    }
    return changes
  }

  it('starts at Medium, not at the Ultra a fast GPU is guessed to manage', () => {
    expect(createGovernor(0, () => 2).tier).toBe(GOVERNOR.startTier)
    expect(createGovernor(5, () => 2).tier).toBe(5)
  })

  it('steps down when one frame in five misses, and ignores a single long frame', () => {
    const judder = createGovernor(3, () => 2)
    let changes: number[] = []
    for (let i = 0; i < 600 && changes.length === 0; i++) {
      const next = judder.sample((i % 5 === 4 ? 33.3 : 16.7) / 1000)
      if (next !== null) changes = [next]
    }
    expect(changes).toEqual([4])
    // Heavy work, so it holds its tier rather than climbing, and one 300 ms frame changes nothing.
    const hiccup = createGovernor(3, () => 12)
    feed(hiccup, 3, 16.7)
    hiccup.sample(0.3)
    expect(feed(hiccup, 3, 16.7)).toEqual([])
    expect(hiccup.tier).toBe(3)
  })

  it('counts 400 ms frames as slow, not as stalls, and ignores a real stall', () => {
    const slow = createGovernor(3, () => 2)
    feed(slow, 20, 400)
    expect(slow.tier).toBe(6)
    const stalled = createGovernor(3, () => 2)
    stalled.sample(2)
    expect(feed(stalled, 4, 16.7)).toEqual([])
  })

  it('climbs on 60 Hz frames only with CPU headroom, and never retries a failed upgrade', () => {
    const busy = createGovernor(4, () => 12)
    expect(feed(busy, 30, 16.7)).toEqual([])
    const light = createGovernor(4, () => 2)
    let climbed: number | null = null
    for (let i = 0; i < 60 * 30 && climbed === null; i++) climbed = light.sample(16.7 / 1000)
    expect(climbed, 'climbed one tier').toBe(3)
    // The new tier cannot hold: it drops back, and that tier becomes the ceiling for good.
    let dropped: number | null = null
    for (let i = 0; i < 60 * 10 && dropped === null; i++) dropped = light.sample(25 / 1000)
    expect(dropped).toBe(4)
    expect(feed(light, 60, 16.7)).toEqual([])
    expect(light.tier).toBe(4)
  })
})
