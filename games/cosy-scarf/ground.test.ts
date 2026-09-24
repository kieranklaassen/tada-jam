import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { ScarfController, type Projector } from './controller'
import { blanketTop, CEILING, groundCeiling, restHeight, snowTop, standY } from './ground'
import { BLANKET, SCARF } from './layout'
import { ANIMALS, initialState, WIDTH, type AnimalKey, type Row } from './state'
import { buildAnimals, type Animal, type Moment } from './view/animals'
import { blanketGeometry, landGeometry } from './view/world'
import type { YarnMaterials } from './view/yarn'

const side = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
const snow = new THREE.Mesh(landGeometry(), side)
const blanket = new THREE.Mesh(blanketGeometry(), side)
const ray = new THREE.Raycaster()
const down = new THREE.Vector3(0, -1, 0)

function drawnTop(mesh: THREE.Mesh, x: number, z: number): number | null {
  ray.set(new THREE.Vector3(x, 500, z), down)
  const hit = ray.intersectObject(mesh)[0]
  return hit ? hit.point.y : null
}

/** A seeded spread of places over the play area, many of them across the blanket's ribbed hem. */
function places(count: number): [number, number][] {
  let seed = 7
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const out: [number, number][] = []
  for (let i = 0; i < count; i++) out.push([-160 + random() * 320, -125 + random() * 215])
  for (let i = 0; i < count; i++) out.push([-140 + random() * 280, BLANKET.back + random() * BLANKET.rib])
  return out
}

describe('the ground the animals stand on', () => {
  it('is the drawn snow, triangle for triangle', () => {
    let worst = 0
    for (const [x, z] of places(400)) worst = Math.max(worst, Math.abs(snowTop(x, z) - drawnTop(snow, x, z)!))
    expect(worst).toBeLessThan(1e-3)
  })

  it('is the drawn blanket and its ribbed hem, triangle for triangle', () => {
    let worst = 0
    for (const [x, z] of places(400)) {
      const drawn = drawnTop(blanket, x, z)
      if (drawn === null) expect(blanketTop(x, z)).toBe(-Infinity)
      else worst = Math.max(worst, Math.abs(blanketTop(x, z) - drawn))
    }
    expect(worst).toBeLessThan(1e-3)
  })

  it('is whichever lies on top', () => {
    for (const [x, z] of places(100)) expect(standY(x, z)).toBe(Math.max(snowTop(x, z), blanketTop(x, z)))
  })

  it('reaches nowhere in a ceiling cell above its ceiling, which sits close over it', () => {
    const { step } = CEILING
    let above = -Infinity
    let slack = 0
    const cells = places(1500)
    for (const [x, z] of cells) {
      const x0 = CEILING.x + Math.floor((x - CEILING.x) / step) * step
      const z0 = CEILING.z + Math.floor((z - CEILING.z) / step) * step
      const ceiling = groundCeiling(x, z)
      let top = -Infinity
      for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) top = Math.max(top, standY(x0 + (a / 8) * step * 0.999999, z0 + (b / 8) * step * 0.999999))
      above = Math.max(above, top - ceiling)
      slack += ceiling - top
    }
    expect(above).toBeLessThanOrEqual(0)
    expect(slack / cells.length).toBeLessThan(0.02)
  })

  it('stands a thing as low as it goes with none of its points sunk in, just as feeling under every point would', () => {
    let seed = 11
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const count = 120
    const points = new Float64Array(3 * count)
    for (const [x, z] of places(150)) {
      let everyPoint = -Infinity
      for (let k = 0; k < count; k++) {
        points[3 * k] = x + (random() - 0.5) * 24
        points[3 * k + 1] = random() * 3
        points[3 * k + 2] = z + (random() - 0.5) * 24
        everyPoint = Math.max(everyPoint, standY(points[3 * k], points[3 * k + 2]) - points[3 * k + 1])
      }
      expect(restHeight(points, count)).toBe(everyPoint)
    }
  })
})

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

/** What each animal stands on: its body and its feet. */
const STANDS_ON = new Set(['body', 'feet', 'foot-l', 'foot-r', 'paw-l', 'paw-r'])

type Sink = { depth: number; what: string }

function sinkOf(animal: Animal, key: AnimalKey, t: number, parts: Set<string>, worst: Sink, vertex: THREE.Vector3): void {
  animal.root.updateMatrixWorld(true)
  animal.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !parts.has(object.name)) return
    const position = object.geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld)
      const depth = standY(vertex.x, vertex.z) - vertex.y
      if (depth > worst.depth) {
        worst.depth = depth
        worst.what = `${key} ${object.name} @ ${t.toFixed(2)} (${vertex.x.toFixed(1)}, ${vertex.z.toFixed(1)})`
      }
    }
  })
}

/**
 * Plays a scarf's whole visit with the real rigs: the animal at the loom
 * walks in over the flat blanket, hopes, is given the scarf, dances and
 * walks home over the blanket's hem and up the slope, while the next one
 * arrives. Returns how deep any of `parts` went into the ground drawn under it.
 */
function playVisit(warm: AnimalKey[], atLoom: AnimalKey | null, parts = STANDS_ON): Sink {
  const state = initialState()
  for (const animal of warm) state.scarves[animal] = [[row(0), row(1)]]
  state.atLoom = atLoom
  state.loom = Array.from({ length: 8 }, (_, i) => row(i % 2))
  const game = new ScarfController(state, { save: () => {}, childAge: 5 })
  game.setProjector(projector)
  const animals = buildAnimals(materials)
  const moment: Moment = { t: 0, dt: 1 / 60, knitting: 0, hoping: false, focus: new THREE.Vector3(0, 30, 20), progress: 0, humAt: -Infinity, step: () => {}, puff: () => {} }
  const worst: Sink = { depth: -Infinity, what: '' }
  const vertex = new THREE.Vector3()
  const frame = () => {
    game.step(1 / 60)
    moment.t = game.t
    for (const key of ANIMALS) {
      const actor = game.actors[key]
      moment.hoping = game.offered && game.state.atLoom === key
      animals[key].sync(actor, moment)
      if (!actor.visible) continue
      animals[key].update(actor, moment)
      sinkOf(animals[key], key, game.t, parts, worst, vertex)
    }
  }
  for (let i = 0; i < 60 * 20 && !game.offered; i++) frame()
  expect(game.offered).toBe(true)
  const at = { x: (SCARF.x + 70) * PPU, y: (80 - (SCARF.top - 10)) * PPU }
  game.pointerDown(1, at, 0)
  game.pointerUp(1, at, 80)
  for (let i = 0; i < 60 * 24; i++) frame()
  return worst
}

describe('Cosy Scarf animals stand on the ground', () => {
  for (const animal of ANIMALS) {
    it(`the ${animal}'s feet and body never sink into the snow or the blanket through a whole visit`, () => {
      const sink = playVisit(ANIMALS.slice(0, ANIMALS.indexOf(animal)), animal)
      expect(sink.depth, sink.what).toBeLessThan(0.05)
    })
  }

  it('nor does a cosy friend walking down from the hill and back', () => {
    const sink = playVisit([...ANIMALS], null)
    expect(sink.depth, sink.what).toBeLessThan(0.05)
  })

  it("the fox's tail rides clear of the ground, even flung out low as it chases it round", () => {
    const tail = new Set(['tail', 'tail-tip'])
    const fox = ANIMALS.indexOf('fox')
    for (const sink of [playVisit(ANIMALS.slice(0, fox), 'fox', tail), playVisit([...ANIMALS], null, tail)]) expect(sink.depth, sink.what).toBeLessThan(0)
  })
})
