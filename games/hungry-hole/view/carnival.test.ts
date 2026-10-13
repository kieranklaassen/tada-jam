import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Bystanders, MAYOR_REACH_Z } from '../bystanders'
import { TIERS } from '../config'
import { hintOf } from '../guide'
import { EMPTY_MOUTH, KIND, KINDS, heightOf, mouthOf, type Kind } from '../kinds'
import { LIMBS, LIMB_OF, POKE_SECONDS, ride, stepLift } from '../motion'
import { inCorner } from '../overlay'
import { GATE_TOUCH, holePoint, pick, streetPoint } from '../pick'
import { GATE, KEEPER, YARD } from '../places'
import { HOVER, Play, liftOf, loadOf, type World } from '../play'
import { notesOf } from '../voices'
import { makeRng } from '../rng'
import { Scene, sceneLength } from '../scene'
import { Stage, enterBeats, enterOutcome, floatBeats, floatOutcome, showWaiting, waitingOf } from '../scenes'
import { HOLE_START, STREET, clampHole, layStreet, setDown, type Standing } from '../street'
import { Carnival, HOME_CONTROL, type Guide } from './carnival'
import { makeKeeper } from './people'
import { makeThingGeometries } from './things'
import { LIMB_VECTORS } from './paper'

// The scene is built with no renderer and no canvas. The frame budget is
// counted and never timed, so it holds on a busy machine: each frame the test
// counts what three would submit, every visible mesh in the camera's view, one
// draw each, and their triangles.

const FRAME = 1 / 60, W = 1180, H = 820
/** The surface sizes the game's tests name. */
const SIZES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [820, 1180]]
/** The jam's bar is about 80 draw calls. Measured here: 46 at the most, with the fullest street coming in through the gate under the glow and the hand. */
const DRAW_BUDGET = 50
/** Measured here: 36,728 at the most, counting every mesh whole. Most of them are the setting and the crowd, two meshes that never change. */
const TRIANGLE_BUDGET = 40000

const world = (over: Partial<World> = {}): World => ({ hole: { x: -0.5, z: 1.1 }, belly: [], breath: [], street: [], ...over })

function count(view: Carnival): { draws: number; triangles: number } {
  view.scene.updateMatrixWorld()
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(view.camera.projectionMatrix, view.camera.matrixWorldInverse))
  let draws = 0, triangles = 0
  view.scene.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return
    if (object.frustumCulled && !frustum.intersectsObject(object)) return
    const geometry = object.geometry as THREE.BufferGeometry, each = (geometry.index ? geometry.index.count : geometry.attributes.position?.count ?? 0) / 3
    const copies = object instanceof THREE.InstancedMesh ? object.count : 1
    if (each === 0 || copies === 0) return
    draws += 1
    triangles += each * copies
  })
  return { draws, triangles }
}

const shown = (view: Carnival, prefix: string): THREE.Object3D[] => {
  const found: THREE.Object3D[] = []
  view.scene.traverseVisible((object) => { if (object.name.startsWith(prefix)) found.push(object) })
  return found
}

describe('the carnival street', () => {
  it('is built with no renderer, and shows only the setting until a street has been read', () => {
    const view = new Carnival(makeRng(1))
    expect(shown(view, 'setting')).toHaveLength(1)
    expect(shown(view, 'gate:leaf')).toHaveLength(2)
    expect(shown(view, 'pit')).toHaveLength(0)
    expect(shown(view, 'mayor')).toHaveLength(0)
    expect(shown(view, 'thing')).toHaveLength(0)
    view.update(new Play(world({ street: layStreet('few', 1) })), new Bystanders(makeRng(2)), new Stage(), null, 0)
    expect(shown(view, 'pit')).toHaveLength(1)
    // The mayor: body, head, pupils, brows, mouth, moustache, tuft, his reaching arm and the two parts of his free arm.
    expect(shown(view, 'mayor:').length).toBe(10)
    // The gate keeper: body, head, pupils, brows, mouth, two arms of two parts, his key and his cap.
    expect(shown(view, 'keeper:').length).toBe(11)
    view.dispose()
  })

  it('draws each thing as one mesh, and hides what the hole has eaten but for the last thing, dim in the mouth', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    const play = new Play(world({ street: layStreet('many', 2) }))
    view.update(play, bystanders, stage, null, 0)
    expect(shown(view, 'thing:').length).toBe(13)
    const eaten = new Play(world({ belly: ['pie', 'pie', 'drummer'], street: [{ parts: ['dog', 'hat'], x: 3, z: 0 }], breath: ['tuba'] }))
    view.update(eaten, bystanders, stage, null, 0)
    expect(shown(view, 'thing:').map((object) => object.name).sort()).toEqual(['thing:dog:0', 'thing:drummer:0', 'thing:hat:0', 'thing:tuba:0'])
    expect(shown(view, 'breath')).toHaveLength(1)
    view.dispose()
  })

  it('hands each thing its own limbs as it is drawn, and builds every limb the motion asks for', () => {
    const view = new Carnival(makeRng(1)), play = new Play(world({ street: layStreet('many', 2) }))
    view.update(play, new Bystanders(makeRng(2)), new Stage(), null, FRAME)
    const meshes = shown(view, 'thing:') as THREE.Mesh[]
    const all = new Set<unknown>()
    for (const mesh of meshes) {
      const material = mesh.material as THREE.ShaderMaterial, limbs = mesh.userData.limbs as Float32Array
      expect(limbs).toBeInstanceOf(Float32Array)
      expect(limbs.length).toBeLessThanOrEqual(LIMB_VECTORS * 4)
      all.add(limbs)
      ;(mesh.onBeforeRender as () => void)()
      expect(material.uniforms.uLimbs.value).toBe(limbs)
      const kind = mesh.name.split(':')[1] as Kind, joint = mesh.geometry.getAttribute('aJoint')
      const built = new Set<number>()
      for (let i = 0; i < joint.count; i++) if (joint.getW(i) > 0 && joint.getW(i) <= LIMBS) built.add(joint.getW(i) - 1)
      for (const [name, limb] of Object.entries(LIMB_OF[kind])) expect(built.has(limb as number), `${kind} ${name}`).toBe(true)
      expect(built.size, kind).toBe(Object.keys(LIMB_OF[kind]).length)
    }
    // No two meshes share their limbs: two pies side by side do not move as one.
    expect(all.size).toBe(meshes.length)
    view.dispose()
  })

  it('names what each mesh belongs to, so the intersection audit reads a stack as one object', () => {
    const view = new Carnival(makeRng(1)), stage = new Stage()
    const play = new Play(world({ belly: ['pie'], street: [{ parts: ['dog', 'hat'], x: 3, z: 0 }, { parts: ['tuba'], x: -3, z: 0 }], breath: ['balloon', 'drummer'] }))
    view.update(play, new Bystanders(makeRng(2)), stage, null, FRAME)
    const keys = (shown(view, 'thing:') as THREE.Mesh[]).map((mesh) => `${mesh.name.split(':')[1]} ${mesh.userData.jamObject}`).sort()
    expect(keys).toEqual(['balloon riding', 'dog thing:0', 'drummer riding', 'hat thing:0', 'pie belly', 'tuba thing:1'])
    view.dispose()
  })

  it('shows the glow and the ghost hand only when the idle ladder asks: on the hole and a thing, or on the gate keeper and the gate', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage(), play = new Play(world({ street: layStreet('few', 1) }))
    view.update(play, bystanders, stage, { hint: hintOf(play, false), glow: 0, press: 0, opacity: 0 }, FRAME)
    expect(shown(view, 'glow')).toHaveLength(0)
    expect(shown(view, 'hand')).toHaveLength(0)
    view.update(play, bystanders, stage, { hint: hintOf(play, false), glow: 1, press: 0.5, opacity: 1 }, FRAME)
    expect(shown(view, 'glow').map((object) => object.name).sort()).toEqual(['glow:hole', 'glow:thing'])
    expect(shown(view, 'hand')).toHaveLength(1)
    const bare = new Play(world())
    view.update(bare, bystanders, stage, { hint: hintOf(bare, true), glow: 1, press: 0.5, opacity: 1 }, FRAME)
    expect(shown(view, 'glow').map((object) => object.name).sort()).toEqual(['glow:gate', 'glow:thing'])
    // The second ring lies at the gate keeper's feet, and the hand is up at his middle.
    const ring = view.scene.getObjectByName('glow:thing')!, hand = view.scene.getObjectByName('hand')!
    expect(new THREE.Vector3().setFromMatrixPosition(ring.matrix).x).toBeCloseTo(KEEPER.x, 1)
    expect(new THREE.Vector3().setFromMatrixPosition(hand.matrix).y).toBeGreaterThan(1.5)
    view.dispose()
  })

  it('swings the two leaves of the gate apart as it opens, and shows what waits behind its bars', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage(), play = new Play(world())
    showWaiting(stage, 'some', 1)
    view.update(play, bystanders, stage, null, FRAME)
    const [left, right] = shown(view, 'gate:leaf')
    const shut = [left.rotation.y, right.rotation.y]
    const waiting = shown(view, 'thing:') as THREE.Mesh[]
    expect(waiting.map((mesh) => mesh.userData.jamObject).sort()).toEqual(['waiting:0', 'waiting:1'])
    for (const mesh of waiting) {
      const at = new THREE.Vector3().setFromMatrixPosition(mesh.matrix)
      expect(at.z).toBeLessThan(GATE.z)
      expect(Math.abs(at.x - GATE.x)).toBeLessThan(GATE.half)
      expect(at.z).toBeCloseTo(YARD.z, 5)
    }
    stage.gate = 1
    view.update(play, bystanders, stage, null, FRAME)
    expect(left.rotation.y).toBeLessThan(shut[0] - 1)
    expect(right.rotation.y).toBeGreaterThan(shut[1] + 1)
    view.dispose()
  })

  it('the mouth strains at a thing too wide for it: it lies beside the thing\'s foot in full view, reaches under the foot with its lip in quick tugs, stands taller, and lets go', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    const play = new Play(world({ hole: { x: 2, z: 1.5 }, street: [{ parts: ['tuba'], x: -1, z: -0.5 }] }))
    const tuba = play.things[0], rim = view.scene.getObjectByName('rim') as THREE.Mesh
    const at = new THREE.Vector3(), turn = new THREE.Quaternion(), size = new THREE.Vector3()
    play.press({ on: 'thing', thing: tuba, part: 0, x: tuba.x, z: tuba.z }); play.tap()
    let most = 0, tallest = 0, least = Infinity, tugs = 0, last = 0, rising = false
    for (let frame = 0; frame < 240; frame++) {
      play.step(FRAME)
      play.cues.length = 0
      view.update(play, bystanders, stage, null, FRAME)
      rim.matrix.decompose(at, turn, size)
      if (play.strain <= 0.01) continue
      // How far the lip reaches from where the hole lies toward the thing's foot.
      const toward = ((at.x - play.x) * (tuba.x - play.x) + (at.z - play.z) * (tuba.z - play.z)) / Math.hypot(tuba.x - play.x, tuba.z - play.z)
      const reach = toward + size.x
      if (reach > last && !rising) tugs += 1
      rising = reach > last
      last = reach
      most = Math.max(most, reach - play.mouth / 2)
      tallest = Math.max(tallest, size.y)
      // The mouth itself is not under the thing: more than half of it lies clear of the foot, where the child sees it.
      least = Math.min(least, Math.hypot(play.x - tuba.x, play.z - tuba.z) - KIND.tuba.width / 2)
    }
    expect(most).toBeGreaterThan(0.25)
    expect(tallest).toBeGreaterThan(1.4)
    expect(tugs).toBeGreaterThanOrEqual(3)
    expect(least).toBeGreaterThan(0)
    // Let go: round again and at rest, where it stopped.
    expect(play.strain).toBe(0)
    rim.matrix.decompose(at, turn, size)
    expect(Math.hypot(at.x - play.x, at.z - play.z)).toBeLessThan(0.02)
    expect(size.y).toBeCloseTo(1, 1)
    view.dispose()
  })

  it('a thing of a standing stack that a finger lands on answers alone, where it sits: the things under and over it keep still', () => {
    const stack = { parts: ['dog', 'hat', 'pie'] as Kind[], x: 2, z: 0.5 }
    const poses = (part: number): number[][] => {
      const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
      const play = new Play(world({ hole: { x: -5, z: 2 }, street: [stack] }))
      if (part >= 0) { play.press({ on: 'thing', thing: play.things[0], part, x: stack.x, z: stack.z }); play.halt() }
      for (let frame = 0; frame < 6; frame++) { play.step(FRAME); bystanders.step(FRAME, play, stage); view.update(play, bystanders, stage, null, FRAME) }
      const found = ['dog', 'hat', 'pie'].map((kind) => [...(view.scene.getObjectByName(`thing:${kind}:0`) as THREE.Mesh).matrix.elements])
      view.dispose()
      return found
    }
    const still = poses(-1)
    const moved = (now: number[][], index: number): boolean => now[index].some((value, at) => Math.abs(value - still[index][at]) > 1e-4)
    for (const part of [1, 2]) {
      const now = poses(part)
      expect([0, 1, 2].filter((index) => moved(now, index)), `part ${part}`).toEqual([part])
    }
    // The bottom thing carries the rest: its answer moves the whole stack.
    const bottom = poses(0)
    expect([0, 1, 2].filter((index) => moved(bottom, index))).toEqual([0, 1, 2])
  })

  it('a thing touched while it hangs or walks answers in motion as well as sound: what is its own to move moves, and it stays where the hop or the walk has it', () => {
    for (const state of ['hanging', 'walking'] as const) {
      for (const kind of KINDS) {
        const drawn = (touched: boolean): { limbs: number[]; matrix: number[] } => {
          const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
          const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: [kind], x: 2, z: 0.5 }] }))
          const thing = play.things[0]
          if (state === 'hanging') { thing.hop = 0; thing.air = HOVER } else { thing.walk = { fromX: 0, fromZ: 0.5, steps: 4, seconds: 1.2, phase: 1.3, heard: 2, lift: 0, aside: false, over: 0 }; thing.gait = 1.3; thing.sx = 0.7 }
          if (touched) { play.press({ on: 'thing', thing, part: 0, x: thing.x, z: thing.z }); play.halt(); thing.poked = POKE_SECONDS[kind] * 0.15 }
          view.update(play, bystanders, stage, null, 0)
          const mesh = view.scene.getObjectByName(`thing:${kind}:0`) as THREE.Mesh
          const found = { limbs: [...(mesh.userData.limbs as Float32Array)], matrix: [...mesh.matrix.elements] }
          view.dispose()
          return found
        }
        const still = drawn(false), answered = drawn(true), label = `${kind} ${state}`
        const limbs = answered.limbs.some((value, at) => Math.abs(value - still.limbs[at]) > 1e-3)
        const shape = [0, 1, 2, 4, 5, 6, 8, 9, 10].some((at) => Math.abs(answered.matrix[at] - still.matrix[at]) > 1e-3)
        expect(limbs || shape, label).toBe(true)
        // Where it is stays the hop's or the walk's.
        for (const at of [12, 13, 14]) expect(answered.matrix[at], label).toBeCloseTo(still.matrix[at], 6)
      }
    }
  })

  it('a thing of a stack that hangs answers a finger where it sits, as it does when the stack stands', () => {
    const drawn = (part: number): number[][] => {
      const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
      const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts: ['dog', 'hat', 'pie'], x: 2, z: 0.5 }] }))
      const thing = play.things[0]
      thing.hop = 0
      thing.air = HOVER
      if (part >= 0) { play.press({ on: 'thing', thing, part, x: thing.x, z: thing.z }); play.halt(); thing.poked = 0.1 }
      view.update(play, bystanders, stage, null, 0)
      const found = ['dog', 'hat', 'pie'].map((kind) => { const mesh = view.scene.getObjectByName(`thing:${kind}:0`) as THREE.Mesh; return [...mesh.matrix.elements, ...(mesh.userData.limbs as Float32Array)] })
      view.dispose()
      return found
    }
    const still = drawn(-1)
    for (const part of [1, 2]) {
      const now = drawn(part)
      expect([0, 1, 2].filter((index) => now[index].some((value, at) => Math.abs(value - still[index][at]) > 1e-4)), `part ${part}`).toEqual([part])
    }
  })

  it('one clock on the breath: the stack rises and falls on the beat its notes are heard on, also after a thing has come up under it', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    const play = new Play(world({ hole: { x: 0, z: 0.5 }, belly: ['pie'], breath: ['hat', 'dog'] }))
    const frames = (count: number, each: () => void = () => {}): void => {
      for (let i = 0; i < count; i++) { play.step(FRAME); play.cues.length = 0; bystanders.step(FRAME, play, stage); view.update(play, bystanders, stage, null, FRAME); each() }
    }
    frames(50)
    // A thing comes up under it: the beat is brought forward so the stack plays soon after it has grown.
    play.press({ on: 'hole', x: play.x, z: play.z })
    play.tap()
    expect(play.riders).toHaveLength(3)
    frames(90)
    const bottom = view.scene.getObjectByName('thing:pie:0') as THREE.Mesh
    const offs: number[] = []
    let highest = -Infinity, lowest = Infinity
    frames(360, () => {
      const high = bottom.matrix.elements[13]
      highest = Math.max(highest, high)
      lowest = Math.min(lowest, high)
      offs.push(high - ride(play.load, play.bob))
    })
    // It bobs, and all of the bob is the beat's: less the beat, it hangs still.
    expect(highest - lowest).toBeGreaterThan(0.1)
    expect(Math.max(...offs) - Math.min(...offs)).toBeLessThan(0.01)
    view.dispose()
  })

  it('a pie sliding under a stack leaves cream on the street, which fades in a few seconds', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage(), play = new Play(world())
    const shadows = (): number => (view.scene.getObjectByName('shadows') as THREE.InstancedMesh).count
    view.update(play, bystanders, stage, null, FRAME)
    const before = shadows()
    view.cue({ type: 'step', parts: ['pie', 'dog'], step: 0, x: 1, z: 1 }, play)
    view.cue({ type: 'step', parts: ['pie'], step: 0, x: 2, z: 1 }, play)
    view.cue({ type: 'step', parts: ['dog', 'pie'], step: 0, x: 3, z: 1 }, play)
    view.update(play, bystanders, stage, null, FRAME)
    expect(shadows()).toBe(before + 1)
    for (let i = 0; i < 200; i++) view.update(play, bystanders, stage, null, FRAME)
    expect(shadows()).toBe(before)
    view.dispose()
  })
})

describe('the frame', () => {
  it('finds the point of the street under a finger, on a surface of any shape', () => {
    const view = new Carnival(makeRng(1))
    for (const [w, h] of [[1180, 820], [820, 1180], [2000, 600], [390, 700]]) {
      view.resize(w, h)
      for (const [x, z] of [[0, 0], [STREET.x0, STREET.z0], [STREET.x1, STREET.z1], [3.3, -1.2]]) {
        const pixel = view.project(x, 0, z, w, h)
        const point = streetPoint(view.ray(pixel.x, pixel.y, w, h))!
        expect(point.x).toBeCloseTo(x, 3)
        expect(point.z).toBeCloseTo(z, 3)
        // The whole street is inside the frame.
        expect(pixel.x).toBeGreaterThanOrEqual(0)
        expect(pixel.x).toBeLessThanOrEqual(w)
        expect(pixel.y).toBeGreaterThanOrEqual(0)
        expect(pixel.y).toBeLessThanOrEqual(h)
      }
    }
    view.dispose()
  })

  /** The lower edge of the jam's home control, in CSS pixels from the top of the surface. */
  const UNDER_HOME = HOME_CONTROL.top + HOME_CONTROL.size
  const box = new THREE.Box3(), corner = new THREE.Vector3()
  /** Every thing drawn is inside the frame, top and sides, and its top is below the home control: measured on the meshes as they are drawn. */
  const allSeen = (view: Carnival, w: number, h: number, label: string): number => {
    let highest = Infinity
    for (const mesh of shown(view, 'thing:') as THREE.Mesh[]) {
      if (mesh.userData.jamObject === 'belly') continue
      mesh.geometry.computeBoundingBox()
      box.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrix)
      const middle = view.project((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2, w, h)
      expect(middle.y, `${label}: top of ${mesh.name}`).toBeGreaterThanOrEqual(UNDER_HOME)
      expect(middle.y, `${label}: top of ${mesh.name}`).toBeLessThanOrEqual(h)
      for (const x of [box.min.x, box.max.x]) {
        const side = view.project(corner.set(x, box.max.y, (box.min.z + box.max.z) / 2).x, corner.y, corner.z, w, h)
        expect(side.x, `${label}: side of ${mesh.name}`).toBeGreaterThanOrEqual(0)
        expect(side.x, `${label}: side of ${mesh.name}`).toBeLessThanOrEqual(w)
      }
      highest = Math.min(highest, middle.y)
    }
    return highest
  }
  const FULLEST: Kind[] = ['pie', 'pie', 'pie', 'pie', 'hat', 'dog', 'dog', 'dog', 'balloon', 'balloon', 'tuba', 'tuba', 'drummer']

  it('is the same frame as ever while nothing tall has been made: on every street as it is laid the eye is neither lifted nor drawn back', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    for (const [w, h] of SIZES) {
      view.resize(w, h)
      const whole = view.eye.whole
      for (const id of ['few', 'some', 'many']) {
        for (let seed = 1; seed <= 10; seed++) {
          view.update(new Play(world({ hole: { ...HOLE_START }, street: layStreet(id, seed) })), bystanders, stage, null, 0)
          expect(view.eye, `${w}x${h} ${id} ${seed}`).toEqual({ distance: whole, lifted: 0, whole })
        }
      }
      // Nor for the first things a child stacks: three pies and the hat on the breath, anywhere on the street.
      for (const hole of [{ x: 0, z: 0.5 }, { x: STREET.x0, z: STREET.z0 }, { x: STREET.x1, z: STREET.z0 }, { x: 0, z: STREET.z1 }]) {
        view.update(new Play(world({ hole, breath: ['pie', 'pie', 'pie', 'hat'] })), bystanders, stage, null, 0)
        expect(view.eye, `${w}x${h} four on the breath at ${hole.x},${hole.z}`).toEqual({ distance: whole, lifted: 0, whole })
      }
    }
    view.dispose()
  })

  it('a tower of the whole fullest street is seen to its top, below the home control, wherever the hole is and whatever the shape of the surface', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    for (const [w, h] of [...SIZES, [2000, 600], [390, 700]] as const) {
      view.resize(w, h)
      for (const hole of [{ x: 0, z: 0.5 }, { x: STREET.x0, z: STREET.z0 }, { x: STREET.x1, z: STREET.z0 }, { x: STREET.x0, z: STREET.z1 }, { x: 0, z: STREET.z1 }]) {
        // Riding on the breath.
        view.update(new Play(world({ hole, breath: FULLEST })), bystanders, stage, null, 0)
        const highest = allSeen(view, w, h, `${w}x${h} riding at ${hole.x},${hole.z}`)
        // The frame is not drawn back further than it needs: the top is in the upper third.
        expect(highest, `${w}x${h} riding at ${hole.x},${hole.z}`).toBeLessThan(h / 3)
        expect(view.eye.distance).toBeGreaterThanOrEqual(view.eye.whole)
        // Standing on the street: all of it but one thing, which is the tallest stack that can stand.
        view.update(new Play(world({ hole: { x: 5, z: 2 }, belly: ['pie'], street: [{ parts: FULLEST.slice(1), x: hole.x * 0.8, z: Math.max(STREET.z0 + 2, hole.z) }] })), bystanders, stage, null, 0)
        allSeen(view, w, h, `${w}x${h} standing at ${hole.x},${hole.z}`)
      }
    }
    view.dispose()
  })

  it('frame by frame: burped up thing by thing, bobbing, let down and gone out as a float, the tower never leaves the frame, and the eye comes back when it is gone', () => {
    for (const [w, h] of [[W, H], [820, 1180]] as const) {
      const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
      view.resize(w, h)
      const play = new Play(world({ hole: { x: 0.5, z: -1.2 }, belly: FULLEST }))
      let scene: Scene | null = null, clock = 0, frames = 0, most = 0
      const run = (seconds: number, label: string): void => {
        for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
          clock += FRAME
          play.step(FRAME)
          stage.step(FRAME)
          scene?.update(clock)
          bystanders.step(FRAME, play, stage)
          for (const cue of play.cues) {
            view.cue(cue, play)
            if (cue.type === 'float') {
              scene = new Scene(floatBeats(stage, play, cue.parts, { x: cue.x, z: cue.z }, []))
              scene.start(clock, () => {})
            }
          }
          play.cues.length = 0
          view.update(play, bystanders, stage, null, FRAME)
          // The tower is seen whole until it has tipped into a float, which lies low and leaves through the gate as the sheet has it.
          if (!stage.float || stage.float.tower) allSeen(view, w, h, `${w}x${h} ${label} frame ${frame}`)
          most = Math.max(most, view.eye.distance)
          frames += 1
        }
      }
      for (let burp = 0; burp < FULLEST.length; burp++) { play.press({ on: 'hole', x: play.x, z: play.z }); play.tap(); run(0.35, `burp ${burp}`) }
      expect(play.riders).toHaveLength(FULLEST.length)
      run(2.5, 'bobbing')
      // On a wide surface the eye has drawn back for it; on a tall one, lifting is enough.
      expect(view.eye.lifted).toBeGreaterThan(0)
      if (w > h) expect(most).toBeGreaterThan(view.eye.whole)
      const drawnBack = most
      play.press({ on: 'street', x: -4.5, z: 1.5 }); play.letGo()
      run(3, 'let down')
      expect(stage.float).not.toBeNull()
      run(9, 'float')
      // The float lying on the street and leaving through the gate draws the eye no further back than the tower did.
      expect(most).toBeCloseTo(drawnBack, 3)
      // The street is bare: the eye is back where it frames the whole street.
      expect(view.eye.distance).toBeCloseTo(view.eye.whole, 2)
      expect(view.eye.lifted).toBeCloseTo(0, 2)
      expect(frames).toBeGreaterThan(1000)
      view.dispose()
    }
  })

  it('keeps the size it has when it is parked and measures nothing', () => {
    const view = new Carnival(makeRng(1))
    view.resize(1180, 820)
    const before = view.camera.position.clone()
    view.resize(0, 0)
    view.resize(NaN, 300)
    expect(view.camera.position.equals(before)).toBe(true)
    view.dispose()
  })

})

describe('what the child sees', () => {
  /** A point of the scene is behind a thing or a stack when a finger on it would land on that thing. */
  const hidden = (view: Carnival, play: Play, x: number, y: number, z: number, w: number, h: number): boolean => {
    const pixel = view.project(x, y, z, w, h)
    return pick(view.ray(pixel.x, pixel.y, w, h), play, -99).on === 'thing'
  }
  /** Up the gate keeper at his tallest, risen with his key held up, and across the gate and its arch. */
  const KEEPER_POINTS: [number, number, number][] = [0.4, 1.2, 2, 2.8, 3.6, 4.4, 5.2].map((y) => [KEEPER.x, y, KEEPER.z])
  const GATE_POINTS: [number, number, number][] = [-1, -0.5, 0, 0.5, 1].flatMap((across): [number, number, number][] => [0.3, 1.4, 2.6, 3.6].map((y): [number, number, number] => [GATE.x + across * GATE.half, y, GATE.z])).concat([[GATE.x, GATE.high, GATE.z]])

  it('a finger on a thing as it is drawn picks that thing: on every street as it is laid, no thing is behind another', () => {
    const view = new Carnival(makeRng(1))
    for (const [w, h] of SIZES) {
      view.resize(w, h)
      for (const id of ['few', 'some', 'many']) {
        for (let seed = 1; seed <= 25; seed++) {
          const play = new Play(world({ hole: { ...HOLE_START }, street: layStreet(id, seed) }))
          for (const thing of play.things) {
            const pixel = view.project(thing.x, heightOf(thing.parts) * 0.5, thing.z, w, h)
            const target = pick(view.ray(pixel.x, pixel.y, w, h), play, -99)
            expect(target.on === 'thing' && target.thing, `${w}x${h} ${id} ${seed} ${thing.parts[0]}`).toBe(thing)
          }
        }
      }
    }
    view.dispose()
  })

  it('on every street as it is laid, no thing stands in front of the gate keeper or the gate', () => {
    const view = new Carnival(makeRng(1))
    for (const [w, h] of SIZES) {
      view.resize(w, h)
      for (const id of ['few', 'some', 'many']) {
        for (let seed = 1; seed <= 25; seed++) {
          const play = new Play(world({ hole: { ...HOLE_START }, street: layStreet(id, seed) }))
          for (const [x, y, z] of [...KEEPER_POINTS, ...GATE_POINTS]) expect(hidden(view, play, x, y, z, w, h), `${w}x${h} ${id} ${seed} at ${x},${y}`).toBe(false)
        }
      }
    }
    view.dispose()
  })

  it('a stack set down where the rules call it clear covers no thing, and neither the gate keeper nor the gate, at every surface size', () => {
    const view = new Carnival(makeRng(1))
    const stacks: Kind[][] = [['pie', 'hat'], ['dog', 'tuba', 'drummer'], ['hat', 'pie', 'dog'], ['tuba', 'drummer', 'balloon'], ['drummer', 'tuba'], ['pie', 'pie', 'pie', 'hat', 'dog', 'balloon', 'balloon', 'tuba']]
    let count = 0
    for (const id of ['few', 'some', 'many']) {
      for (let seed = 1; seed <= 8; seed++) {
        for (const parts of stacks) {
          const street: Standing[] = [...layStreet(id, seed)]
          for (const kind of parts) street.splice(street.findIndex((standing) => standing.parts[0] === kind), 1)
          for (const [fx, fz, ax, az] of [[0, 0.4, 1, 0], [-4, -0.5, -1, 0.3], [4, 1.5, 0, -1], [3, -1.6, 1, 0.2]]) {
            const mouth = mouthOf(parts.slice(1)), far = Math.hypot(ax, az), hole = { ...clampHole(fx + (ax / far) * 1.2, fz + (az / far) * 1.2, mouth), mouth }
            const down = setDown(parts, { x: fx, z: fz }, hole.x - fx, hole.z - fz, street, hole)
            if (!down.clear) continue
            count += 1
            const play = new Play(world({ hole: { x: hole.x, z: hole.z }, street: [...street, { parts, ...down.spot }] }))
            for (const [w, h] of SIZES) {
              view.resize(w, h)
              const label = `${w}x${h} ${id} ${seed} ${parts.join('+')} from ${fx},${fz}`
              for (const thing of play.things) {
                const pixel = view.project(thing.x, heightOf(thing.parts) * 0.5, thing.z, w, h)
                const target = pick(view.ray(pixel.x, pixel.y, w, h), play, -99)
                expect(target.on === 'thing' && target.thing, `${label}: ${thing.parts.join('+')}`).toBe(thing)
              }
              for (const [x, y, z] of [...KEEPER_POINTS, ...GATE_POINTS]) expect(hidden(view, play, x, y, z, w, h), `${label} at ${x},${y}`).toBe(false)
            }
          }
        }
      }
    }
    expect(count).toBeGreaterThan(300)
    view.dispose()
  })

  it('nothing a child can touch lies under the jam\'s round home control: no spot of the street, and no part of the gate keeper or the gate', () => {
    // The control is a round 48 px button at the top centre, 10 px from the top. A tall thing may rise behind it; its spot may not lie under it.
    const view = new Carnival(makeRng(1))
    for (const [w, h] of SIZES) {
      view.resize(w, h)
      const points: [number, number, number][] = [...KEEPER_POINTS, ...GATE_POINTS]
      for (let x = STREET.x0; x <= STREET.x1 + 1e-6; x += 0.5) points.push([x, 0, STREET.z0 - 0.25], [x, 0, STREET.z1 + 0.25])
      for (let z = STREET.z0; z <= STREET.z1 + 1e-6; z += 0.4) points.push([STREET.x0 - 0.25, 0, z], [STREET.x1 + 0.25, 0, z])
      for (const [x, y, z] of points) {
        const pixel = view.project(x, y, z, w, h)
        expect(Math.hypot(pixel.x - w / 2, pixel.y - 34), `${w}x${h} at ${x},${y},${z}: ${Math.round(pixel.x)},${Math.round(pixel.y)}`).toBeGreaterThan(24 + 6)
        // And nothing of them is in the grown-up's corner, 72 px square at the top right.
        expect(pixel.x > w - 72 && pixel.y < 72, `${w}x${h} corner at ${x},${y},${z}`).toBe(false)
      }
    }
    view.dispose()
  })

  it('no part of the gate that answers a finger lies in the grown-up\'s corner, where no touch is answered, and no touch in that corner is on the gate', () => {
    const view = new Carnival(makeRng(1)), play = new Play(world({ hole: { ...HOLE_START } }))
    for (const [w, h] of [...SIZES, [2000, 600], [390, 700]] as const) {
      view.resize(w, h)
      for (let across = 0; across <= 20; across++) {
        for (let up = 0; up <= 20; up++) {
          const pixel = view.project(GATE.x - GATE.half - 0.3 + (across / 20) * (GATE.half * 2 + 0.6), (up / 20) * GATE_TOUCH, GATE.z, w, h)
          expect(inCorner(pixel.x, pixel.y, w), `${w}x${h} ${across} ${up}`).toBe(false)
        }
      }
      for (let x = w - 72; x <= w; x += 6) for (let y = 0; y <= 72; y += 6) expect(pick(view.ray(x, y, w, h), play, -99).on, `${w}x${h} ${x} ${y}`).not.toBe('gate')
    }
    view.dispose()
  })

  it('the gate keeper\'s key has a bow and one tooth: a shaft with two teeth would read as a letter', () => {
    const position = makeKeeper().key.getAttribute('position')
    // The levels at which anything stands out from the shaft, below the bow: one tooth has a top and a bottom, and nothing between or beyond.
    const levels = new Set<number>()
    for (let i = 0; i < position.count; i++) if (position.getX(i) > 0.09 && position.getY(i) < 0.9) levels.add(Math.round(position.getY(i) * 50) / 50)
    expect([...levels].sort()).toHaveLength(2)
    const [low, high] = [...levels].sort((a, b) => a - b)
    expect(high - low).toBeGreaterThan(0.15)
    expect(high - low).toBeLessThan(0.3)
  })

  it('a pie is about eighty pixels across at 1180 by 820, and the empty mouth a little more', () => {
    const view = new Carnival(makeRng(1))
    view.resize(W, H)
    const across = (width: number, z: number): number => view.project(width / 2, 0, z, W, H).x - view.project(-width / 2, 0, z, W, H).x
    expect(across(KIND.pie.width, 2.2)).toBeGreaterThan(72)
    expect(across(KIND.pie.width, 2.2)).toBeLessThan(92)
    expect(across(EMPTY_MOUTH, HOLE_START.z)).toBeGreaterThan(across(KIND.pie.width, HOLE_START.z))
    // Every thing is at least a finger wide.
    for (const kind of KINDS) expect(across(KIND[kind].width, STREET.z0 + 1), kind).toBeGreaterThanOrEqual(64)
    view.dispose()
  })
})

describe('nothing passes through anything', () => {
  /** The furthest any vertex of the shown meshes whose name starts with `prefix` reaches toward the near side. */
  const nearest = (view: Carnival, prefix: string): number => {
    view.scene.updateMatrixWorld(true)
    const at = new THREE.Vector3()
    let most = -Infinity
    for (const object of shown(view, prefix)) {
      if (!(object instanceof THREE.Mesh)) continue
      const position = (object.geometry as THREE.BufferGeometry).attributes.position
      for (let i = 0; i < position.count; i++) most = Math.max(most, at.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).z)
    }
    return most
  }

  it('every thing is sculpted inside the round foot the street\'s rules give it', () => {
    const geometries = makeThingGeometries()
    for (const kind of KINDS) {
      const position = geometries[kind].attributes.position
      let far = 0
      for (let i = 0; i < position.count; i++) far = Math.max(far, Math.hypot(position.getX(i), position.getZ(i)))
      expect(far, kind).toBeLessThanOrEqual(KIND[kind].width / 2 + 1e-3)
      geometries[kind].dispose()
    }
  })

  it('the crowd is a mesh of its own beside the setting, so a touch on an onlooker is told from a touch on a wall', () => {
    const view = new Carnival(makeRng(1))
    expect(shown(view, 'crowd')).toHaveLength(1)
    expect(shown(view, 'crowd')[0]).not.toBe(shown(view, 'setting')[0])
    view.dispose()
  })

  it('the float is one object from the drop to the gate: the tower it was, and then the things lying in a line', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage(), play = new Play(world({ hole: { x: 0, z: 0.5 } }))
    const parts: Kind[] = ['pie', 'hat', 'dog']
    const scene = new Scene(floatBeats(stage, play, parts, { x: 0, z: 0.5 }, []))
    scene.start(0, () => {})
    let stood = 0, lay = 0
    for (let clock = 0; clock < 4; clock += FRAME) {
      stage.step(FRAME)
      scene.update(clock)
      view.update(play, bystanders, stage, null, FRAME)
      if (!stage.float) continue
      const meshes = shown(view, 'thing:')
      expect(meshes.map((mesh) => mesh.userData.jamObject)).toEqual(parts.map(() => 'float'))
      if (stage.float.tower) stood += 1
      else lay += 1
    }
    expect(stood).toBeGreaterThan(0)
    expect(lay).toBeGreaterThan(0)
    view.dispose()
  })

  it('no face of a thing lies in the plane of a face of another thing it touches, so none can flicker however far the eye draws back: in a tower, and in a float lying in its line and turning through the gate', () => {
    type Face = { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; n: THREE.Vector3; box: THREE.Box3 }
    // Two faces share a plane on the screen when they are within a degree and a half of each other and nearer than the depth the eye can tell apart, which grows with the square of how far off it is.
    const PARALLEL = Math.cos((1.5 * Math.PI) / 180), DEPTH = 0.002
    const told = (view: Carnival, far: number): number => ((far * far) / (view.camera.near * 2 ** 24)) * 16
    const facesOf = (mesh: THREE.Mesh, within: THREE.Box3): Face[] => {
      const geometry = mesh.geometry as THREE.BufferGeometry, position = geometry.getAttribute('position'), index = geometry.index, faces: Face[] = []
      for (let t = 0; t < (index ? index.count : position.count) / 3; t++) {
        const [a, b, c] = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(t * 3 + k) : t * 3 + k).applyMatrix4(mesh.matrixWorld))
        const n = b.clone().sub(a).cross(c.clone().sub(a)), box = new THREE.Box3().setFromPoints([a, b, c])
        if (n.length() > 1e-10 && box.intersectsBox(within)) faces.push({ a, b, c, n: n.normalize(), box })
      }
      return faces
    }
    /** The pairs of things drawn now with a face of each in one plane, where the two faces lie over each other. */
    const shared = (view: Carnival): string[] => {
      view.scene.updateMatrixWorld()
      const meshes = shown(view, 'thing:') as THREE.Mesh[], found: string[] = []
      for (let i = 0; i < meshes.length; i++) {
        for (let j = i + 1; j < meshes.length; j++) {
          const both = new THREE.Box3().setFromObject(meshes[i]).intersect(new THREE.Box3().setFromObject(meshes[j]))
          if (both.isEmpty()) continue
          both.expandByScalar(0.01)
          const mine = facesOf(meshes[i], both), theirs = facesOf(meshes[j], both)
          if (mine.some((one) => theirs.some((other) => Math.abs(one.n.dot(other.n)) >= PARALLEL && Math.abs(one.n.dot(other.a) - one.n.dot(one.a)) <= DEPTH && Math.abs(one.n.dot(other.b) - one.n.dot(one.a)) <= DEPTH && Math.abs(one.n.dot(other.c) - one.n.dot(one.a)) <= DEPTH && one.box.intersectsBox(other.box)))) found.push(`${meshes[i].name} and ${meshes[j].name}`)
        }
      }
      return found
    }
    const bystanders = new Bystanders(makeRng(2))
    const FULLEST: Kind[] = ['pie', 'pie', 'pie', 'pie', 'hat', 'dog', 'dog', 'dog', 'balloon', 'balloon', 'tuba', 'tuba', 'drummer']
    const apart: Kind[] = ['dog', 'pie', 'dog', 'pie', 'dog', 'pie', 'pie', 'hat', 'balloon', 'balloon', 'tuba', 'tuba', 'drummer']
    // `DEPTH` is more than the eye can tell apart with the tallest tower in the frame of the widest, shortest surface, where it draws back furthest, and half as far again.
    {
      const view = new Carnival(makeRng(1))
      view.resize(2000, 600)
      view.update(new Play(world({ hole: { x: STREET.x0, z: STREET.z1 }, breath: FULLEST })), bystanders, new Stage(), null, 0)
      expect(view.eye.distance).toBeGreaterThan(view.eye.whole)
      expect(DEPTH).toBeGreaterThan(told(view, view.eye.distance * 1.5))
      view.dispose()
    }
    // As many of a kind as the fullest street holds, one on the other.
    const alike = KINDS.map((kind) => FULLEST.filter((one) => one === kind)).filter((parts) => parts.length > 1)
    // Towers: the whole fullest street as it is eaten, the other way up and with its dogs apart, and each kind on its own kind.
    for (const parts of [FULLEST, [...FULLEST].reverse(), apart, ...alike]) {
      const view = new Carnival(makeRng(1))
      view.resize(W, H)
      view.update(new Play(world({ hole: { x: 0.5, z: -1.2 }, breath: parts })), bystanders, new Stage(), null, 0)
      expect(shared(view), `${parts.join('+')} riding`).toEqual([])
      view.update(new Play(world({ hole: { x: 5, z: 2 }, belly: ['pie'], street: [{ parts, x: 0, z: 0 }] })), bystanders, new Stage(), null, 0)
      expect(shared(view), `${parts.join('+')} standing`).toEqual([])
      view.dispose()
    }
    // Floats of the same, to the gate.
    let looked = 0
    for (const parts of [FULLEST, [...FULLEST].reverse(), apart, ...alike]) {
      const view = new Carnival(makeRng(1)), stage = new Stage(), play = new Play(world({ hole: { x: 0.5, z: -1.2 } }))
      view.resize(W, H)
      const scene = new Scene(floatBeats(stage, play, parts, { x: 0.5, z: -1.2 }, []))
      scene.start(0, () => {})
      let frame = 0
      for (let clock = 0; clock < 12; clock += FRAME) {
        stage.step(FRAME)
        scene.update(clock)
        // The tower as it drops, and the float once every thing of it has come down: lying in its line and rolling out. In between, the things are in the air, each on its own arc.
        if (!stage.float || (!stage.float.tower && stage.float.parts.some((part) => part.y > 1e-6))) continue
        frame += 1
        // Every fifth of a second, as the audit samples it.
        if (frame % 12 !== 0) continue
        view.update(play, bystanders, stage, null, FRAME)
        expect(shared(view), `${parts.join('+')} float at ${clock.toFixed(2)}`).toEqual([])
        looked += 1
      }
      view.dispose()
    }
    expect(looked).toBeGreaterThan(150)
  })

  it('the mayor stays behind the far kerb, head and hands, wherever his hat is and however he leans', () => {
    const cases: World[] = [
      world({ hole: { x: -4.5, z: -2.0 }, belly: ['pie', 'hat'] }),
      world({ hole: { x: 3, z: 1 }, street: [{ parts: ['hat'], x: -4.8, z: STREET.z0 + 0.7 }] }),
      world({ hole: { x: 3, z: 1 }, street: [{ parts: ['hat', 'drummer'], x: -3.2, z: STREET.z0 + 1.3 }] }),
      world({ hole: { x: -5, z: -1.5 }, breath: ['hat', 'pie'] }),
      world({ hole: { x: 3, z: 1 }, street: [{ parts: ['hat'], x: 6, z: 2 }] }),
    ]
    cases.forEach((given, which) => {
      const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage(), play = new Play(given)
      bystanders.react({ type: 'drop', kind: 'hat' })
      let most = -Infinity
      for (let frame = 0; frame < 240; frame++) {
        bystanders.step(FRAME, play, stage)
        if (frame % 6 !== 0) continue
        view.update(play, bystanders, stage, null, FRAME)
        most = Math.max(most, nearest(view, 'mayor:'))
      }
      expect(most, `case ${which}`).toBeLessThanOrEqual(MAYOR_REACH_Z + 0.05)
      view.dispose()
    })
  })

  it('the gate keeper\'s key, his saluting hand and the cap he fans with stay off his head and his nose, wherever the hole is', () => {
    // His head as it is sculpted, in its own frame: an egg about its middle, with his eyes and brows on its front.
    const middle = new THREE.Vector3(0, 0.9, 0), radii = new THREE.Vector3(0.46, 0.56, 0.5)
    // His nose: from its root on his face to its tip, and how thick it is at the root.
    const root = new THREE.Vector3(0, 0.84, 0.36), tip = new THREE.Vector3(0, 0.75, 1.1), thick = 0.15, nose = new THREE.Line3(root, tip), nearest = new THREE.Vector3()
    const reactions: readonly (readonly Parameters<Bystanders['react']>[0][])[] = [
      [{ type: 'bystander', who: 'keeper', head: -1 }],
      [{ type: 'setdown', parts: ['pie', 'hat', 'dog', 'balloon', 'tuba'], x: 0, z: 0 }],
      [{ type: 'setdown', parts: ['pie', 'hat', 'dog', 'balloon', 'tuba'], x: 0, z: 0 }, { type: 'bystander', who: 'keeper', head: -1 }],
      [{ type: 'burp', kind: 'tuba', onto: null, rest: 0 }],
      [{ type: 'burp', kind: 'pie', onto: 'hat', rest: 1 }, { type: 'bystander', who: 'keeper', head: -1 }],
    ]
    // The hole to his left, at his feet and to his right: his head turns after it.
    const cases = reactions.flatMap((cues) => [{ x: -5, z: 1 }, { x: KEEPER.x, z: -2 }, { x: 6, z: 1.5 }].map((hole) => ({ cues, hole })))
    cases.forEach(({ cues, hole }, which) => {
      const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2 + which)), stage = new Stage(), play = new Play(world({ hole, street: [{ parts: ['drummer'], x: 0, z: 0 }] }))
      const head = view.scene.getObjectByName('keeper:head') as THREE.Mesh, at = new THREE.Vector3(), into = new THREE.Matrix4()
      /** How far the nearest point of a mesh is off his head (over 1 is clear of it) and off the skin of his nose, which thins to its tip (in his own measure). */
      const off = (name: string): { head: number; nose: number } => {
        const mesh = view.scene.getObjectByName(name) as THREE.Mesh, position = (mesh.geometry as THREE.BufferGeometry).attributes.position
        let least = Infinity, fromNose = Infinity
        for (let i = 0; i < position.count; i++) {
          at.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(into)
          const along = nose.closestPointToPointParameter(at, true)
          fromNose = Math.min(fromNose, nose.at(along, nearest).distanceTo(at) - thick * (1 - along))
          least = Math.min(least, at.sub(middle).divide(radii).length())
        }
        return { head: least, nose: fromNose }
      }
      for (let frame = 0; frame < 600; frame++) {
        if (frame === 60) for (const cue of cues) bystanders.react(cue)
        bystanders.step(FRAME, play, stage)
        if (frame % 3 !== 0) continue
        view.update(play, bystanders, stage, null, FRAME)
        view.scene.updateMatrixWorld(true)
        into.copy(head.matrixWorld).invert()
        const key = off('keeper:key'), hand = off('keeper:key:fore')
        expect(Math.min(key.head, hand.head), `case ${which}, frame ${frame}: the key and its hand, off his head`).toBeGreaterThan(1)
        expect(Math.min(key.nose, hand.nose), `case ${which}, frame ${frame}: the key and its hand, off his nose`).toBeGreaterThan(0.02)
        // His cap is in his other hand while he fans: it is off his face from the moment it has left his head.
        if (bystanders.keeper.capOff > 0.9) {
          const cap = off('keeper:cap')
          expect(cap.head, `case ${which}, frame ${frame}: the cap, off his head`).toBeGreaterThan(1)
          expect(cap.nose, `case ${which}, frame ${frame}: the cap, off his nose`).toBeGreaterThan(0.02)
        }
      }
      view.dispose()
    })
  })
})

describe('the audit\'s taps on a thing in the air and on its way, played on the model', () => {
  /** The audit's own step of game time, and a tap as its driver makes one: the press, two steps, the lift, one step. */
  const STEP = 0.033
  const steps = (play: Play, count: number): void => { for (let i = 0; i < count; i++) { play.step(STEP); play.cues.length = 0 } }
  const tap = (view: Carnival, play: Play, x: number, y: number, z: number): ReturnType<typeof pick> => {
    const pixel = view.project(x, y, z, W, H), target = pick(view.ray(pixel.x, pixel.y, W, H), play, -99)
    play.press(target)
    steps(play, 2)
    play.tap()
    steps(play, 1)
    return target
  }
  /** The fullest street as the audit has it, without a pie and the two balloons. */
  const CROWDED: Standing[] = [
    { parts: ['drummer'], x: -4.86, z: -0.69 }, { parts: ['tuba'], x: -2.17, z: -0.88 }, { parts: ['tuba'], x: 0.48, z: -0.86 },
    { parts: ['dog'], x: -3.59, z: 2.17 }, { parts: ['dog'], x: -1.8, z: 2.11 }, { parts: ['dog'], x: 0.02, z: 2.18 }, { parts: ['hat'], x: 1.7, z: 2.26 },
    { parts: ['pie'], x: 3.15, z: 0.93 }, { parts: ['pie'], x: 4.6, z: 2.24 }, { parts: ['pie'], x: 4.51, z: 0.75 },
  ]

  it('the tall stack let down on the fullest street hangs where it rode while the things behind it step out, and the second tap lands on its bottom balloon there', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    view.resize(W, H)
    const play = new Play(world({ hole: { x: 4, z: -1 }, breath: ['balloon', 'pie', 'balloon'], street: CROWDED }))
    steps(play, 48)
    view.update(play, bystanders, stage, null, STEP)
    expect(tap(view, play, 5.5, 0, 1.8).on).toBe('street')
    const stack = play.things.find((thing) => thing.parts.length === 3)!
    expect(play.riders).toHaveLength(0)
    expect([stack.hop, stack.air, stack.sx, stack.sz]).toEqual([0, HOVER, 4, -1])
    // It hangs for a good few steps yet: the tap has room on either side.
    const waiting = new Play(world({ hole: { x: 4, z: -1 }, breath: ['balloon', 'pie', 'balloon'], street: CROWDED }))
    steps(waiting, 48)
    waiting.press({ on: 'street', x: 5.5, z: 1.8 })
    steps(waiting, 2)
    waiting.tap()
    steps(waiting, 1)
    let hung = 0
    while (waiting.things.find((thing) => thing.parts.length === 3)!.hop === 0 && hung < 100) { steps(waiting, 1); hung += 1 }
    expect(hung).toBeGreaterThanOrEqual(5)
    view.update(play, bystanders, stage, null, STEP)
    const radius = Math.max(0.55, KIND.balloon.width / 2)
    const target = tap(view, play, 4, HOVER + KIND.balloon.height / 2, -1 + radius - 0.05)
    expect(target.on === 'thing' && target.thing).toBe(stack)
    expect(target.on === 'thing' && target.part).toBe(0)
    expect(stack.poked).toBeLessThan(0.2)
    expect(stack.hop).toBeLessThan(1)
    // It comes down, bounces and stands, with every thing still on the street.
    steps(play, 120)
    expect(stack.hop).toBe(1)
    expect(stack.walk).toBeNull()
    expect(play.things.flatMap((thing) => thing.parts).sort()).toEqual([...CROWDED.flatMap((standing) => standing.parts), 'balloon', 'pie', 'balloon'].sort())
    view.dispose()
  })

  it('the march is on its way when the tap comes, and the tap lands on it where its dog is drawn', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    view.resize(W, H)
    const street: Standing[] = [{ parts: ['balloon'], x: 0.3, z: -1.1 }, { parts: ['balloon'], x: 2.9, z: -1.1 }, { parts: ['hat'], x: -2.4, z: 2.2 }, { parts: ['pie'], x: -0.6, z: 2.2 }]
    const play = new Play(world({ hole: { x: 1.5, z: 1.1 }, belly: ['pie', 'pie'], breath: ['dog', 'tuba', 'drummer'], street }))
    steps(play, 48)
    view.update(play, bystanders, stage, null, STEP)
    expect(tap(view, play, 3.5, 0, 1.4).on).toBe('street')
    steps(play, 36)
    const march = play.things.find((thing) => thing.parts.length === 3)!
    expect(march.hop).toBe(1)
    expect(march.walk).not.toBeNull()
    expect(march.walk!.phase).toBeGreaterThan(1)
    expect(march.walk!.phase).toBeLessThan(march.walk!.steps - 2)
    // The audit taps the middle of the dog's mesh as it finds it; the script's fallback is this same spot.
    expect(Math.hypot(march.sx + 1.85, march.sz - 0.08)).toBeLessThan(0.05)
    view.update(play, bystanders, stage, null, STEP)
    const target = tap(view, play, march.sx, KIND.dog.height / 2, march.sz)
    expect(target.on === 'thing' && target.thing).toBe(march)
    expect(march.walk).not.toBeNull()
    expect(march.poked).toBeLessThan(0.2)
    view.dispose()
  })
})

describe('what the second reading asked for, as it is drawn', () => {
  const RX = 0
  const limb = (mesh: THREE.Mesh, index: number, field: number): number => (mesh.userData.limbs as Float32Array)[index * 8 + field]

  it('the rim snaps to the finger in the frame it lands: in the first frame drawn after the touch the mouth lies along the way to the finger, stretched its full reach', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    const play = new Play(world({ hole: { x: 0, z: 0.5 }, street: [{ parts: ['pie'], x: -3, z: 0.5 }] }))
    const rim = view.scene.getObjectByName('rim') as THREE.Mesh
    const lies = (): { x: number; z: number; long: number } => {
      const e = rim.matrix.elements, ra = Math.hypot(e[0], e[1], e[2]), rb = Math.hypot(e[8], e[9], e[10])
      return { x: e[0] / ra, z: e[2] / ra, long: ra / rb }
    }
    for (let i = 0; i < 90; i++) { play.step(FRAME); play.cues.length = 0; view.update(play, bystanders, stage, null, FRAME) }
    // At rest it laps toward the pie, which is the other way.
    expect(lies().x).toBeLessThan(-0.99)
    play.press({ on: 'street', x: 0, z: 2.6 })
    play.step(FRAME)
    view.update(play, bystanders, stage, null, FRAME)
    const first = lies()
    expect(first.x * play.headingX + first.z * play.headingZ).toBeGreaterThan(0.999)
    expect(first.z).toBeGreaterThan(0.99)
    // Stretched the whole of its reach for the finger, not an eighth of the way there.
    expect(first.long).toBeGreaterThan(1.24)
    view.dispose()
  })

  it('a thing riding on the breath, touched where it is drawn, answers as itself and alone, in the frame of the touch, and on the lift the hole burps under the stack', () => {
    const PARTS: Kind[] = ['tuba', 'dog', 'pie']
    const drawn = (part: number): number[][] => {
      const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
      view.resize(W, H)
      const play = new Play(world({ hole: { x: 0.5, z: 0.5 }, belly: ['hat'], breath: PARTS }))
      for (let i = 0; i < 40; i++) { play.step(FRAME); play.cues.length = 0; view.update(play, bystanders, stage, null, FRAME) }
      if (part >= 0) {
        const rider = play.riding[part], foot = rider.y + ride(play.load, play.bob), radius = Math.max(0.55, KIND[rider.kind].width / 2)
        const pixel = view.project(play.anchor.x, foot + KIND[rider.kind].height * 0.4, play.anchor.z + radius - 0.03, W, H)
        const target = pick(view.ray(pixel.x, pixel.y, W, H), play, -99)
        expect(target, `part ${part}`).toEqual({ on: 'rider', part, x: 0.5, z: 0.5 })
        play.press(target)
        // Its own small sound and the hole's drawn breath, in the frame of the touch.
        expect(play.cues, `part ${part}`).toEqual([part === 1 ? { type: 'poke', kind: 'dog', deep: true } : { type: 'poke', kind: PARTS[part] }, { type: 'pucker' }])
      }
      // Drawn while the finger is still down.
      for (let i = 0; i < 6; i++) { play.step(FRAME); play.cues.length = 0 }
      expect(play.riders.map((rider) => rider.kind)).toEqual(PARTS)
      view.update(play, bystanders, stage, null, FRAME)
      const found = PARTS.map((kind) => { const mesh = view.scene.getObjectByName(`thing:${kind}:0`) as THREE.Mesh; return [...mesh.matrix.elements, ...(mesh.userData.limbs as Float32Array)] })
      // On the lift the hat comes up under the stack, and the hole is where it was.
      if (part >= 0) play.tap()
      for (let i = 0; i < 30; i++) { play.step(FRAME); play.cues.length = 0 }
      expect(play.riders.map((rider) => rider.kind), `part ${part}`).toEqual(part >= 0 ? ['hat', ...PARTS] : PARTS)
      expect([play.x, play.z]).toEqual([0.5, 0.5])
      view.dispose()
      return found
    }
    const still = drawn(-1)
    const moved = (part: number): number[] => { const now = drawn(part); return [0, 1, 2].filter((index) => now[index].some((value, at) => Math.abs(value - still[index][at]) > 1e-4)) }
    expect(moved(0)).toContain(0)
    expect(moved(1)).toEqual([1])
    expect(moved(2)).toEqual([2])
  })

  it('a finger where the ghost hand shows the hole burps, and so does the audit\'s tap on the middle of the mouth: with a stack riding over it the finger is on the stack, at every surface size, wherever the hole is, burped up thing by thing through the eye', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    let taps = 0, most = 0
    for (const [w, h] of SIZES) {
      view.resize(w, h)
      for (const seed of [12, 3]) {
        const all = layStreet('many', seed).map((standing) => standing.parts[0])
        if (seed === 3) all.reverse()
        for (const hole of [HOLE_START, { x: STREET.x0, z: STREET.z1 }, { x: STREET.x1, z: STREET.z1 }, { x: STREET.x0, z: STREET.z0 }, { x: 4.4, z: -0.6 }]) {
          const play = new Play(world({ hole: clampHole(hole.x, hole.z, mouthOf(all)), belly: [...all] }))
          view.update(play, bystanders, stage, null, FRAME)
          for (let burp = 0; burp < all.length + 2; burp++) {
            // By turns where the ghost hand taps, and where the audit taps: the middle of the mouth on the street, seen or not.
            const hand = burp % 2 === 0, point = hand ? holePoint(play) : { x: play.x, y: 0, z: play.z }
            const pixel = view.project(point.x, point.y, point.z, w, h), label = `${w}x${h} seed ${seed} hole ${hole.x},${hole.z} burp ${burp}`
            // In the frame, and under neither the home control nor the grown-up's corner.
            expect(pixel.x > 0 && pixel.x < w && pixel.y > 0 && pixel.y < h, label).toBe(true)
            expect(pixel.y > HOME_CONTROL.top + HOME_CONTROL.size && !inCorner(pixel.x, pixel.y, w), label).toBe(true)
            const target = pick(view.ray(pixel.x, pixel.y, w, h), play, -99)
            if (hand) expect(target.on, label).toBe(burp === 0 ? 'hole' : 'rider')
            else expect(['hole', 'rider'], label).toContain(target.on)
            const before = play.riders.length
            play.press(target)
            play.tap()
            for (let i = 0; i < 50; i++) { play.step(FRAME); play.cues.length = 0; view.update(play, bystanders, stage, null, FRAME) }
            // The tap was the hole's: a thing came up, until the belly was empty.
            expect(play.riders.length, label).toBe(Math.min(all.length, before + 1))
            expect(play.riding.length, label).toBe(play.riders.length)
            taps += 1
            most = Math.max(most, play.riders.length)
          }
        }
      }
    }
    expect(most).toBe(13)
    expect(taps).toBe(SIZES.length * 2 * 5 * 15)
    view.dispose()
  })

  it('one height for the eye and the finger: a hat in its hop and a balloon in its bounce are drawn as high as `liftOf` says, and a finger on them there picks them', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    view.resize(W, H)
    for (const parts of [['hat'], ['balloon'], ['hat', 'pie'], ['balloon', 'dog']] as Kind[][]) {
      // Where it is drawn when it stands on the street between two steps, to measure from: a hat that carries is drawn upside down.
      let highest = 0, street = 0
      for (const phase of [2, ...Array.from({ length: 30 }, (_, index) => 0.05 + index * 0.1)]) {
        const play = new Play(world({ hole: { x: -5, z: 2 }, street: [{ parts, x: 2, z: 0.5 }] }))
        const thing = play.things[0]
        thing.walk = { fromX: 0, fromZ: 0.5, steps: 4, seconds: 1.2, phase, heard: Math.floor(phase), lift: 0, aside: false, over: 0 }
        thing.gait = phase
        thing.sx = 0.5 + phase * 0.3
        view.update(play, bystanders, stage, null, 0)
        const mesh = view.scene.getObjectByName(`thing:${parts[0]}:0`) as THREE.Mesh, lift = liftOf(thing), label = `${parts.join('+')} at ${phase.toFixed(2)}`
        expect(lift, label).toBeCloseTo(stepLift(parts[0], phase, loadOf(parts)), 9)
        if (phase === 2) { street = mesh.matrix.elements[13]; expect(lift, label).toBeCloseTo(0, 9) }
        // The bottom thing is drawn that far above the street, give or take the stretch of its step, which shows most in a hat carried upside down.
        expect(Math.abs(mesh.matrix.elements[13] - street - lift), label).toBeLessThan(parts[0] === 'hat' && parts.length > 1 ? 0.15 : 0.06)
        highest = Math.max(highest, lift)
        // A finger on its middle, as it is drawn, is on it; a finger where its middle would be on the street is not, when it is well up.
        const radius = Math.max(0.55, KIND[parts[0]].width / 2), high = KIND[parts[0]].height * (parts.length > 1 ? 0.3 : 0.5)
        const pixel = view.project(thing.sx, lift + high, thing.sz + radius - 0.03, W, H)
        const target = pick(view.ray(pixel.x, pixel.y, W, H), play, -99)
        expect(target.on === 'thing' && target.thing === thing && target.part, label).toBe(0)
      }
      expect(highest, parts.join('+')).toBeGreaterThan(0.3)
    }
    view.dispose()
  })

  it('the drummer on the breath has both sticks down in the frame his boom is heard, and up between booms', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    const play = new Play(world({ hole: { x: 0, z: 0.5 }, breath: ['dog', 'drummer'] }))
    const sticks: { left: number; right: number; boom: boolean }[] = []
    for (let i = 0; i < 420; i++) {
      play.step(FRAME)
      // The cue of a bob is the cue of his boom, and the boom is a note with no delay (voices.test.ts).
      const boom = play.cues.some((cue) => cue.type === 'bob' && Math.min(...notesOf(cue).map((note) => note.delay ?? 0)) === 0)
      play.cues.length = 0
      view.update(play, bystanders, stage, null, FRAME)
      const mesh = view.scene.getObjectByName('thing:drummer:0') as THREE.Mesh
      sticks.push({ left: limb(mesh, LIMB_OF.drummer.left, RX), right: limb(mesh, LIMB_OF.drummer.right, RX), boom })
    }
    const booms = sticks.filter((frame) => frame.boom)
    // The first of them comes in the first frame after the load.
    expect(sticks[0].boom).toBe(true)
    expect(booms.length).toBeGreaterThanOrEqual(3)
    for (const side of ['left', 'right'] as const) {
      const down = Math.max(...sticks.map((frame) => frame[side])), up = Math.min(...sticks.map((frame) => frame[side]))
      expect(down - up, side).toBeGreaterThan(0.5)
      for (const frame of booms) expect(down - frame[side], side).toBeLessThan(0.02)
    }
    view.dispose()
  })

  it('the ghost hand taps the hole where a finger finds it: the middle of its mouth, and the thing at the bottom of a stack that rides over it', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage()
    const hand = view.scene.getObjectByName('hand')!, at = new THREE.Vector3()
    for (const breath of [[], ['dog'], ['pie', 'tuba']] as Kind[][]) {
      const play = new Play(world({ hole: { x: 1, z: 0.5 }, belly: ['pie', 'hat'], breath }))
      for (let i = 0; i < 20; i++) { play.step(FRAME); play.cues.length = 0 }
      const hint = hintOf(play, false)
      expect(hint.hand?.on, breath.join('+')).toBe('hole')
      view.update(play, bystanders, stage, { hint, glow: 1, press: 1, opacity: 1 }, FRAME)
      const point = holePoint(play)
      at.setFromMatrixPosition(hand.matrix)
      expect([at.x - point.x, at.y - point.y, at.z - point.z].map((value) => Math.round(value * 100) / 100), breath.join('+')).toEqual([0.12, 0.25, 0.16])
      expect(point.y > 0, breath.join('+')).toBe(breath.length > 0)
    }
    view.dispose()
  })

  it('the float\'s scraps fly in the frame its tower touches down: none when the stack goes into the scene, a burst on its thud', () => {
    const view = new Carnival(makeRng(1)), bystanders = new Bystanders(makeRng(2)), stage = new Stage(), play = new Play(world())
    const scraps = (): number => { view.update(play, bystanders, stage, null, 0); return (view.scene.getObjectByName('scraps') as THREE.InstancedMesh).count }
    const before = scraps()
    view.cue({ type: 'float', parts: ['pie', 'dog'], x: 1, z: 1 }, play)
    expect(scraps()).toBe(before)
    view.cue({ type: 'thud', parts: ['pie', 'dog'], x: 1, z: 1 }, play)
    expect(scraps()).toBe(before + 16)
    view.dispose()
  })
})

describe('frame budget', () => {
  type Seen = { draws: number; triangles: number; riders: number; falling: number; hand: boolean; float: boolean; coming: number }

  /**
   * The heaviest minute: on the fullest street everything is eaten that will go, burped into a tower and let down,
   * with the glow and the hand up throughout; then a tower that holds the whole street goes out as a float, and the
   * next street comes in.
   */
  function busiest(): Seen[] {
    const view = new Carnival(makeRng(3)), bystanders = new Bystanders(makeRng(4)), stage = new Stage()
    view.setTier(TIERS[0])
    view.resize(W, H)
    const seen: Seen[] = [], guide: Guide = { hint: { thing: null, gate: false, hand: null }, glow: 1, press: 0.5, opacity: 1 }
    let play = new Play(world({ street: layStreet('many', 12) })), scene: Scene | null = null, clock = 0
    let state = { v: 1 as const, position: 'many', finished: false, seed: 12 }
    const run = (seconds: number): void => {
      for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
        clock += FRAME
        play.step(FRAME)
        stage.step(FRAME)
        scene?.update(clock)
        bystanders.step(FRAME, play, stage)
        for (const cue of play.cues) {
          bystanders.react(cue)
          view.cue(cue, play)
          if (cue.type === 'float') {
            state = floatOutcome(state)
            scene = new Scene(floatBeats(stage, play, cue.parts, { x: cue.x, z: cue.z }, waitingOf(state.position, state.seed)))
            scene.start(clock, () => {})
          }
        }
        play.cues.length = 0
        guide.hint = hintOf(play, state.finished)
        view.update(play, bystanders, stage, guide, FRAME)
        seen.push({ ...count(view), riders: play.riders.length, falling: play.falling.length, hand: guide.hint.hand !== null, float: stage.float !== null, coming: play.things.filter((thing) => thing.coming).length })
      }
    }
    for (let guard = 0; guard < 30; guard++) {
      const next = play.nearestThatFits()
      if (!next) break
      play.press({ on: 'thing', thing: next, x: next.x, z: next.z }); play.tap()
      run(1.2)
    }
    for (let i = 0; i < 6; i++) { play.press({ on: 'hole', x: play.x, z: play.z }); play.tap(); run(0.3) }
    play.press({ on: 'street', x: play.x > 0 ? -4 : 4, z: 0 }); play.letGo()
    run(2)
    // The whole street on the breath: the float, and then the next street.
    play = new Play(world({ hole: { x: 0, z: 0.5 }, breath: [...layStreet('many', 12).map((standing) => standing.parts[0])].reverse() }))
    run(0.5)
    play.press({ on: 'street', x: -4.5, z: 1.5 }); play.letGo()
    run(9)
    state = enterOutcome(state, play)
    const beats = enterBeats(stage, play, 0.5)
    scene = new Scene(beats)
    scene.start(clock, () => {})
    run(sceneLength(beats) + 0.5)
    view.dispose()
    return seen
  }

  const seen = busiest()

  it('the stretch is the heavy one: things going in, a tower on the breath, the glow and the hand, the float and a street coming in', () => {
    expect(Math.max(...seen.map((frame) => frame.riders))).toBeGreaterThanOrEqual(13)
    expect(seen.some((frame) => frame.falling > 0)).toBe(true)
    expect(seen.some((frame) => frame.hand)).toBe(true)
    expect(seen.some((frame) => frame.float)).toBe(true)
    expect(Math.max(...seen.map((frame) => frame.coming))).toBe(13)
    expect(seen[seen.length - 1].coming).toBe(0)
    expect(seen.length).toBeGreaterThan(1200)
  })

  it('every frame submits a small, bounded number of draws', () => {
    expect(Math.max(...seen.map((frame) => frame.draws)), 'most draws in one frame').toBeLessThanOrEqual(DRAW_BUDGET)
  })

  it('and a bounded number of triangles, under sixty thousand, most of them the setting, which never changes', () => {
    expect(Math.max(...seen.map((frame) => frame.triangles)), 'most triangles in one frame').toBeLessThanOrEqual(TRIANGLE_BUDGET)
    expect(TRIANGLE_BUDGET).toBeLessThan(60000)
  })

  it('a lower tier keeps every figure and only thins the scraps in the air', () => {
    const view = new Carnival(makeRng(3)), bystanders = new Bystanders(makeRng(4)), stage = new Stage(), play = new Play(world({ belly: ['pie', 'pie', 'pie'], street: layStreet('few', 1) }))
    const scraps = (tier: number): number => {
      view.setTier(TIERS[tier])
      for (let i = 0; i < 6; i++) view.cue({ type: 'burp', kind: 'pie', onto: null, rest: 0 }, play)
      view.update(play, bystanders, stage, null, FRAME)
      return (view.scene.getObjectByName('scraps') as THREE.InstancedMesh).count
    }
    expect(scraps(0)).toBeLessThanOrEqual(TIERS[0].scraps)
    const things = shown(view, 'thing:').length
    expect(scraps(TIERS.length - 1)).toBeLessThanOrEqual(TIERS[TIERS.length - 1].scraps)
    expect(shown(view, 'thing:').length).toBe(things)
    view.dispose()
  })
})
