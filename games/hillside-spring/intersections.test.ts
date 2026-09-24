import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { describe, expect, it } from 'vitest'
import { crossings, preparePiece, type MaterialInfo } from '../../scripts/intersections/core'
import { GardenController, RACK } from './controller'
import { ARRIVE_DELAY, CREATURES, LEAVE_DELAY, Presence, TRAVEL_SECONDS, type CreatureKind } from './creatures'
import type { Point } from './input'
import { cellIndex, PLOTS, ROWS, type Cell } from './layout'
import { MotionDirector } from './motion'
import type { Piece, PieceKind } from './pieces'
import { STATE_VERSION, type GardenState } from './state'
import { CreaturesView } from './view/creatures'
import { CARRY_LIFT, PiecesView, WHEEL_Y, type DemoPiece, type ShadowSink } from './view/pieces'
import { PlotsView } from './view/plots'
import { Projector } from './view/projector'
import { buildScenery } from './view/scenery'
import { WaterView } from './view/water'
import { backZ, fitCamera, WALL_OUT } from './view/world'

// The hillside's pieces, visitors, water and scenery, posed from the
// controller's state exactly as the views draw them, checked for passing
// through each other the way the intersection audit measures it: a piece
// resting on the ground may sink into it by a sliver of its own size, and
// may not cross a plant or a leaf card at all.

const W = 1180
const H = 820
const FRAME = 1 / 30
/** The audit lets a piece sink this share of its middle extent (its world bounding box) into another, or 2 mm. */
const ALLOWED = 0.06
/** Water running loose over a floor lies within this of it. */

function projector(): Projector {
  const camera = new THREE.PerspectiveCamera(27, 1, 1, 100)
  fitCamera(camera, W, H)
  const p = new Projector(camera)
  p.resize(W, H)
  return p
}

const texture = new THREE.Texture()
const noShadows: ShadowSink = { shadow: () => {}, streak: () => {} }
const noDemo: DemoPiece = { kind: null, at: new THREE.Vector3(), scale: 0, pressCell: -1, press: 0 }
const scenery = buildScenery(texture, texture, { value: 0 })
const plots = new PlotsView(texture, texture)

function mesh(group: THREE.Object3D, name: string): THREE.Mesh {
  const found = group.getObjectByName(name)
  if (!(found instanceof THREE.Mesh)) throw new Error(`no ${name} mesh`)
  return found
}

const hillside = mesh(scenery.group, 'hillside').geometry
const foliage = mesh(scenery.group, 'foliage').geometry
const beds = mesh(plots.group, 'beds').geometry
const crops = mesh(plots.group, 'crops').geometry
const foliageBvh = new MeshBVH(foliage)
const cropsBvh = new MeshBVH(crops)

/** The top of some meshes seen from straight above: how low a thing resting on them may reach at (x, z). */
class Heights {
  private readonly bvhs: MeshBVH[]
  private readonly ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0))

  constructor(geometries: THREE.BufferGeometry[]) {
    this.bvhs = geometries.map((g) => new MeshBVH(g))
  }

  at(x: number, z: number): number {
    let top = -Infinity
    this.ray.origin.set(x, 50, z)
    for (const bvh of this.bvhs) {
      const hit = bvh.raycastFirst(this.ray, THREE.DoubleSide)
      if (hit && hit.point.y > top) top = hit.point.y
    }
    return top
  }
}

const ground = new Heights([hillside, beds])

function allowance(box: THREE.Box3): number {
  const size = box.getSize(new THREE.Vector3())
  const middle = [size.x, size.y, size.z].sort((a, b) => a - b)[1]
  return Math.max(0.002, ALLOWED * middle)
}

function shown(object: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (!o.visible) return false
  return true
}

const v = new THREE.Vector3()

// ---------------------------------------------------------------- visitors

type Visitors = { now: number; creatures: Presence[]; creatureMotion: Record<CreatureKind, MotionDirector> }

/**
 * One visit by `kind` to `spot`, as the view draws it: after `away` seconds with no reason to come (its idle life
 * running on all the while) it comes and plays its arrival, stays `stay` seconds while a child pokes it every couple of
 * seconds and something good happens nearby once (moving on to `moveTo` halfway through, if given), and goes. Returns
 * what went wrong, frame by frame: a part sunk into the ground or a bed, or crossing a plant or a leaf.
 */
function visit(kind: CreatureKind, spot: Cell, stay: number, seed = CREATURES.indexOf(kind) + 1, moveTo: Cell | null = null, away = 0): string[] {
  const garden: Visitors = {
    now: 0,
    creatures: CREATURES.map((k) => new Presence(k)),
    creatureMotion: { frog: new MotionDirector('frog', seed), sparrow: new MotionDirector('sparrow', seed), tanuki: new MotionDirector('tanuki', seed) },
  }
  const frame = projector()
  const view = new CreaturesView(frame)
  const screen = { x: 0, y: 0 }
  const presence = garden.creatures[CREATURES.indexOf(kind)]
  const director = garden.creatureMotion[kind]
  const settled = away + ARRIVE_DELAY[kind] + TRAVEL_SECONDS[kind]
  const leaveAt = settled + stay
  const end = leaveAt + LEAVE_DELAY + TRAVEL_SECONDS[kind] + 0.5
  let nextPoke = settled + 1
  let cued = false
  let was = presence.phase
  const problems: string[] = []
  const box = new THREE.Box3()
  const deepest = new THREE.Vector3()
  for (let now = 0; now < end; now += FRAME) {
    garden.now = now
    presence.update(now, now < away || now >= leaveAt ? null : moveTo && now >= settled + stay / 2 ? moveTo : spot)
    if (was === 'arriving' && presence.phase === 'here') director.trigger('arrive', now)
    was = presence.phase
    if (presence.phase === 'here' && now >= nextPoke) {
      director.poke(now)
      nextPoke = now + 2.2
    }
    if (!cued && now >= settled + stay * 0.3) {
      director.cue(now)
      cued = true
    }
    view.update(garden as unknown as GardenController, noShadows)
    const root = view.group.getObjectByName(kind)!
    if (!root.visible) continue
    view.group.updateMatrixWorld(true)
    root.traverse((part) => {
      if (!(part instanceof THREE.Mesh) || !shown(part)) return
      const position = part.geometry.getAttribute('position')
      box.makeEmpty()
      let sunk = -Infinity
      let seen = false
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(part.matrixWorld)
        box.expandByPoint(v)
        frame.toScreen(v, screen)
        const inFrame = screen.x >= 0 && screen.x <= W && screen.y >= 0 && screen.y <= H
        seen ||= inFrame
        const depth = inFrame ? ground.at(v.x, v.z) - v.y : -Infinity
        if (depth > sunk) {
          sunk = depth
          deepest.copy(v)
        }
      }
      // What the frame leaves out (a visitor walking in from beside the garden) the child never sees.
      if (!seen) return
      const at = `${part.name} at (${spot.c}, ${spot.r}), ${presence.phase} at ${now.toFixed(2)} s, seed ${seed}`
      if (sunk > allowance(box)) problems.push(`${at}: ${sunk.toFixed(3)} into the ground at (${deepest.x.toFixed(2)}, ${deepest.y.toFixed(2)}, ${deepest.z.toFixed(2)})`)
      if (cropsBvh.intersectsGeometry(part.geometry, part.matrixWorld)) problems.push(`${at}: through the crops`)
      if (foliageBvh.intersectsGeometry(part.geometry, part.matrixWorld)) problems.push(`${at}: through the foliage`)
    })
  }
  return problems
}

describe('visitors on the hillside', () => {
  it('the frog hops from the pond over each terrace wall to its paddy and back, never through the ground, the beds or the plants', () => {
    const rice = PLOTS.find((p) => p.kind === 'rice')!
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((seed) => visit('frog', { c: rice.c, r: rice.r }, 16, seed).slice(0, 2))).toEqual([])
  }, 60_000)

  it('the sparrow flies in to a flower bed, sits and hops on its front ridge, and flies off, clear of the flowers', () => {
    const flowers = PLOTS.filter((p) => p.kind === 'sunflower' || p.kind === 'cosmos')
    expect(flowers.flatMap((plot) => [2, 4, 5, 6, 7, 8].flatMap((seed) => visit('sparrow', { c: plot.c, r: plot.r }, 16, seed).slice(0, 2)))).toEqual([])
  }, 60_000)

  it('the sparrow flies from one flower bed to the other in front of both, clear of the flowers', () => {
    const [a, b] = PLOTS.filter((p) => p.kind === 'sunflower' || p.kind === 'cosmos').map((p) => ({ c: p.c, r: p.r }))
    expect([visit('sparrow', a, 16, 2, b), visit('sparrow', b, 16, 2, a)].flatMap((problems) => problems.slice(0, 3))).toEqual([])
  }, 60_000)

  it('the tanuki walks in to each terrace end, naps, wakes and walks off on the meadow, clear of the bushes and flowers', () => {
    const ends = Array.from({ length: ROWS }, (_, r) => [{ c: 0, r }, { c: 6, r }]).flat()
    // It circles as it arrives, is poked while it does, and each end tries two of eight ways it can react.
    expect(ends.flatMap((spot, i) => [1 + (i % 8), 1 + ((i + 4) % 8)].flatMap((seed) => visit('tanuki', spot, 12, seed, null, 11).slice(0, 2)))).toEqual([])
  }, 120_000)
})

// ---------------------------------------------------------------- pieces

function garden(pieces: Piece[] = []): GardenController {
  const state: GardenState = { v: STATE_VERSION, pieces, growth: PLOTS.map(() => 1) }
  const controller = new GardenController(state, { save: () => {} })
  return controller
}

const piece = (kind: PieceKind, c: number, r: number, turn = 0, open = true): Piece => ({ kind, c, r, turn, open })

let clock = 0

/** A view of the kit over a garden, with the real projector as the garden's picker. */
function kit(controller: GardenController) {
  const p = projector()
  controller.setPicker(p)
  controller.setRunning(true)
  const view = new PiecesView(texture, p, plots.tops)
  const cell = (c: number, r: number): Point => ({ ...p.cellScreen(c, r, { x: 0, y: 0 }) })
  const rack = (kind: PieceKind): Point => ({ ...p.rackScreen(RACK.indexOf(kind), { x: 0, y: 0 }) })
  const draw = () => {
    view.update(controller, noShadows, noDemo)
    view.group.updateMatrixWorld(true)
  }
  const run = (seconds: number, each: () => void = () => {}) => {
    for (let t = 0; t < seconds; t += FRAME) {
      controller.step(FRAME)
      draw()
      each()
    }
  }
  const drag = (from: Point, to: Point) => {
    controller.pointerDown(1, from, (clock += 10))
    controller.pointerMove(1, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 })
    controller.pointerMove(1, to)
    controller.pointerUp(1, to, (clock += 300))
  }
  const tap = (at: Point) => {
    controller.pointerDown(1, at, (clock += 10))
    controller.pointerUp(1, at, (clock += 80))
  }
  return { projector: p, view, cell, rack, run, drag, tap, draw }
}

/** Every drawn part instance of the kit, in world space, by the piece it belongs to (`piece-<cell>`, `rack-<slot>`, `held-<n>`). */
function instances(view: PiecesView): { owner: string; part: string; geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] {
  const out: { owner: string; part: string; geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] = []
  for (const child of view.group.children) {
    if (!(child instanceof THREE.InstancedMesh)) continue
    const owners = child.userData.jamInstanceObjects as string[]
    for (let i = 0; i < child.count; i++) {
      const matrix = new THREE.Matrix4()
      child.getMatrixAt(i, matrix)
      out.push({ owner: owners[i], part: child.name, geometry: child.geometry, matrix: matrix.premultiply(child.matrixWorld) })
    }
  }
  return out
}

const OPAQUE: MaterialInfo = {
  type: 'ShaderMaterial',
  side: THREE.FrontSide,
  transparent: false,
  opacity: 1,
  depthTest: true,
  depthWrite: true,
  polygonOffset: false,
  colorWrite: true,
  customVertex: false,
  renderOrder: 0,
}

/** A geometry placed in the world as the intersection audit reads it: its triangles in world space. */
function auditPiece(name: string, geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, index?: Uint32Array) {
  const position = geometry.getAttribute('position')
  const positions = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) v.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(positions, i * 3)
  const own = geometry.getIndex()
  return preparePiece({ id: name, mesh: name, label: name, object: name, positions, index: index ?? (own ? Uint32Array.from(own.array) : null), material: OPAQUE })
}

function extremes(list: ReturnType<typeof instances>, axis: 'x' | 'y' | 'z'): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const item of list) {
    const position = item.geometry.getAttribute('position')
    for (let i = 0; i < position.count; i++) {
      const value = v.fromBufferAttribute(position, i).applyMatrix4(item.matrix)[axis]
      min = Math.min(min, value)
      max = Math.max(max, value)
    }
  }
  return { min, max }
}

/** One plain world-space geometry of some part instances, for looking down on. */
function merged(list: ReturnType<typeof instances>): THREE.BufferGeometry {
  const positions: number[] = []
  for (const item of list) {
    const position = item.geometry.getAttribute('position')
    const index = item.geometry.getIndex()
    const count = index ? index.count : position.count
    for (let k = 0; k < count; k++) {
      v.fromBufferAttribute(position, index ? index.getX(k) : k).applyMatrix4(item.matrix)
      positions.push(v.x, v.y, v.z)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return g
}

describe('the bamboo kit', () => {
  it("a placed piece's arms stop at the face of the wall behind its cell, turning and landing too", () => {
    const problems: string[] = []
    for (const kind of RACK) {
      for (let r = 0; r < ROWS; r++) {
        const controller = garden()
        const k = kit(controller)
        k.drag(k.rack(kind), k.cell(3, r))
        expect(controller.state.pieces).toHaveLength(1)
        const owner = `piece-${cellIndex(3, r)}`
        const face = backZ(r) + WALL_OUT
        for (let turn = 0; turn < 4; turn++) {
          k.run(1.3, () => {
            const arms = instances(k.view).filter((item) => item.owner === owner && item.part === 'bamboo-arm')
            const reach = extremes(arms, 'z').min
            if (reach < face - 1e-4) problems.push(`${kind} on row ${r}, turn ${turn}: ${(face - reach).toFixed(3)} into the wall`)
          })
          k.tap(k.cell(3, r))
        }
      }
    }
    expect(problems.slice(0, 8)).toEqual([])
  })

  it('a piece held over a built cell floats clear over what stands there, the wheel and a raised sluice too', () => {
    const built = [piece('wheel', 3, 2), piece('sluice', 5, 1, 0, true), piece('bend', 1, 1), piece('split', 3, 0)]
    const problems: string[] = []
    for (const target of built) {
      for (const kind of RACK) {
        const controller = garden(built.map((p) => ({ ...p })))
        const k = kit(controller)
        controller.pointerDown(1, k.rack(kind), (clock += 10))
        controller.pointerMove(1, k.cell(target.c, target.r))
        k.run(0.6)
        expect([...controller.held.values()][0]?.hover).toEqual({ c: target.c, r: target.r })
        k.run(2, () => {
          const all = instances(k.view)
          const held = extremes(all.filter((item) => item.owner === 'held-0'), 'y').min
          const under = extremes(all.filter((item) => item.owner === `piece-${cellIndex(target.c, target.r)}`), 'y').max
          if (held <= under) problems.push(`${kind} over the ${target.kind}: ${(under - held).toFixed(3)} into it`)
        })
        controller.pointerCancel(1)
      }
    }
    expect(problems.slice(0, 8)).toEqual([])
  })

  it("the windchime rings under the mill's eave, clear of its thatch, the hut's front and the paddles, however the wheel turns", () => {
    const problems: string[] = []
    for (const turn of [0, 1, 2, 3]) {
      const k = kit(garden([piece('wheel', 3, 2, turn)]))
      let t = 0
      let spun = 0
      k.run(4, () => {
        // Spun by hand over and over, so it rings its hardest.
        if ((t += FRAME) >= spun) {
          k.tap(k.cell(3, 2))
          spun = t + 0.4
        }
        const own = instances(k.view).filter((item) => item.owner === `piece-${cellIndex(3, 2)}`)
        const chime = own.find((item) => item.part === 'windchime')!
        for (const other of own.filter((item) => item.part === 'mill-hut' || item.part === 'wheel')) {
          if (crossings(auditPiece('windchime', chime.geometry, chime.matrix), auditPiece(other.part, other.geometry, other.matrix)).length > 0) {
            problems.push(`turn ${turn} at ${t.toFixed(2)} s: the chime through the ${other.part}`)
          }
        }
      })
    }
    expect(problems.slice(0, 8)).toEqual([])
  })

  it('a piece carried over the plots, the terraces and the rack rides over all of them, still where the finger holds it', () => {
    const built = [piece('wheel', 3, 2), piece('sluice', 5, 1, 0, true), piece('bend', 2, 3)]
    const problems: string[] = []
    for (const kind of RACK) {
      const controller = garden(built.map((p) => ({ ...p })))
      const k = kit(controller)
      k.draw()
      const standing = merged(instances(k.view))
      const under = new Heights([hillside, beds, crops, standing])
      // The finger's way: up from the rack, over each plot, along the terraces' ends, and back over the rack.
      const way: Point[] = [k.rack(kind)]
      for (const plot of PLOTS) way.push(k.cell(plot.c, plot.r))
      for (let r = 0; r < ROWS; r++) way.push({ x: 40, y: k.cell(0, r).y }, { x: W - 40, y: k.cell(6, r).y })
      for (const slot of RACK) way.push(k.rack(slot))
      controller.pointerDown(1, way[0], (clock += 10))
      for (let i = 1; i < way.length; i++) {
        for (let s = 1; s <= 12; s++) {
          const at = { x: way[i - 1].x + ((way[i].x - way[i - 1].x) * s) / 12, y: way[i - 1].y + ((way[i].y - way[i - 1].y) * s) / 12 }
          controller.pointerMove(1, at)
          k.run(FRAME * 2)
          const held = controller.held.get(1)
          if (!held || held.hover || controller.now - held.since < 0.3) continue
          const parts = instances(k.view).filter((item) => item.owner === 'held-0')
          const where = `${kind} at (${at.x.toFixed(0)}, ${at.y.toFixed(0)})`
          let sunk = -Infinity
          for (const item of parts) {
            const position = item.geometry.getAttribute('position')
            for (let j = 0; j < position.count; j++) {
              v.fromBufferAttribute(position, j).applyMatrix4(item.matrix)
              sunk = Math.max(sunk, under.at(v.x, v.z) - v.y)
            }
          }
          if (sunk > 0) problems.push(`${where}: ${sunk.toFixed(3)} into what it passes over`)
          const plot = PLOTS.find((p) => Math.hypot(at.x - k.cell(p.c, p.r).x, at.y - k.cell(p.c, p.r).y) < 2)
          if (plot && extremes(parts, 'y').min < plots.tops[plot.id]) problems.push(`${where}: under the top of the ${plot.kind}, stretched`)
          // Lifted along the ray through the finger, the piece stays on screen where the plain lift puts it.
          const hub = parts.find((item) => item.part === 'bamboo-hub' || item.part === 'wheel')!
          const base = new THREE.Vector3().setFromMatrixPosition(hub.matrix)
          if (hub.part === 'wheel') base.y -= WHEEL_Y * new THREE.Vector3().setFromMatrixScale(hub.matrix).y
          const plain = k.projector.hill(at, new THREE.Vector3())
          plain.y += CARRY_LIFT
          const want = k.projector.toScreen(plain, { x: 0, y: 0 })
          const got = k.projector.toScreen(base, { x: 0, y: 0 })
          if (Math.hypot(want.x - got.x, want.y - got.y) > 3) problems.push(`${where}: drawn ${Math.hypot(want.x - got.x, want.y - got.y).toFixed(1)} px from where it is held`)
        }
      }
      controller.pointerCancel(1)
    }
    expect(problems.slice(0, 8)).toEqual([])
  }, 60_000)
})

// ---------------------------------------------------------------- water

/** Where the running water goes through a piece on the hillside or in a hand; the waterwheel is turned by the water falling through its lower paddles. */
function waterThrough(label: string, water: WaterView, view: PiecesView): string[] {
  water.group.updateMatrixWorld(true)
  const ribbon = mesh(water.group, 'running-water')
  const { start, count } = ribbon.geometry.drawRange
  const flowing = auditPiece('running-water', ribbon.geometry, ribbon.matrixWorld, Uint32Array.from(ribbon.geometry.getIndex()!.array.slice(start, start + count)))
  const problems: string[] = []
  for (const item of instances(view).filter((each) => (each.owner.startsWith('piece-') || each.owner.startsWith('held-')) && each.part !== 'wheel')) {
    const segments = crossings(flowing, auditPiece(item.part, item.geometry, item.matrix))
    if (segments.length > 0) problems.push(`${label}: water through ${item.part} of ${item.owner} at (${segments.slice(0, 3).map((n) => n.toFixed(3)).join(', ')})`)
  }
  return problems
}

describe('running water', () => {
  it('water in a trough runs inside it, round a bend and into the hub, whichever way each piece turns', () => {
    const builds: Piece[][] = []
    for (const kind of ['straight', 'bend', 'split', 'sluice'] as const) {
      for (let turn = 0; turn < 4; turn++) {
        builds.push([piece(kind, 3, 0, turn)])
        builds.push([piece('straight', 3, 0), piece(kind, 3, 1, turn)])
        builds.push([piece('split', 3, 0), piece(kind, 2, 0, turn), piece(kind, 4, 0, turn)])
      }
    }
    builds.push([piece('straight', 3, 0), piece('sluice', 3, 1, 0, false)])
    builds.push([piece('straight', 3, 0), piece('wheel', 3, 1)])
    const problems: string[] = []
    for (const build of builds) {
      const controller = garden(build)
      const k = kit(controller)
      k.draw()
      const water = new WaterView(texture)
      water.update(controller)
      const names = build.map((p) => `${p.kind}(${p.c},${p.r}) turn ${p.turn}`).join(' + ')
      problems.push(...waterThrough(names, water, k.view))
      water.dispose()
    }
    expect(problems.slice(0, 12)).toEqual([])
  })

  it('water moves with a piece as it turns, lands and hops, waits behind a rising sluice board, and lands on top of a piece in a hand', () => {
    const problems: string[] = []
    type Act = (k: ReturnType<typeof kit>, controller: GardenController, look: (label: string) => void) => void
    const watch = (label: string, build: Piece[], act: Act) => {
      const controller = garden(build)
      const k = kit(controller)
      const water = new WaterView(texture)
      k.run(1.5)
      const look = (at: string) => {
        water.update(controller, k.view)
        problems.push(...waterThrough(`${label}, ${at}`, water, k.view).slice(0, 1))
      }
      act(k, controller, look)
      let t = 0
      k.run(1.5, () => look(`${(t += FRAME).toFixed(2)} s on`))
      water.dispose()
    }
    const fed = (kind: PieceKind, turn = 0, open = true) => [piece('straight', 3, 0), piece(kind, 3, 1, turn, open)]
    for (const [kind, turn] of [['bend', 0], ['bend', 1], ['straight', 1], ['split', 0], ['wheel', 0]] as const) {
      watch(`tapping a ${kind} at turn ${turn} under the water`, fed(kind, turn), (k) => k.tap(k.cell(3, 1)))
    }
    for (const kind of ['bend', 'straight', 'split', 'sluice', 'wheel'] as const) {
      watch(`dropping a ${kind} under the water`, [piece('straight', 3, 0)], (k) => k.drag(k.rack(kind), k.cell(3, 1)))
    }
    const underWheel = [piece('bend', 3, 1, 3), piece('wheel', 2, 2), piece('split', 3, 0), piece('sluice', 4, 1)]
    watch('dropping a split under the wheel, beside the paddy', underWheel, (k) => k.drag(k.rack('split'), k.cell(2, 3)))
    watch('opening a sluice under the water', fed('sluice', 0, false), (k) => k.tap(k.cell(3, 1)))
    watch('closing a sluice under the water', fed('sluice'), (k) => k.tap(k.cell(3, 1)))
    for (const kind of ['bend', 'sluice', 'wheel'] as const) {
      watch(`holding a ${kind} over the water and swapping it in`, fed('straight'), (k, controller, look) => {
        const from = k.rack(kind)
        controller.pointerDown(1, from, (clock += 10))
        let at = from
        for (const [c, r] of [[3, 2], [3, 1], [4, 1], [3, 1]]) {
          const to = k.cell(c, r)
          for (let i = 1; i <= 8; i++) {
            controller.pointerMove(1, { x: at.x + ((to.x - at.x) * i) / 8, y: at.y + ((to.y - at.y) * i) / 8 })
            k.run(FRAME, () => look(`carried toward (${c}, ${r})`))
          }
          at = to
          k.run(0.3, () => look(`held over (${c}, ${r})`))
        }
        controller.pointerUp(1, at, (clock += 300))
      })
    }
    expect(problems.slice(0, 12)).toEqual([])
  })

  it("loose water runs out over each wall's lip and falls clear of it, round a stand, off the spring's ledge and into a bed, through neither the ground, the beds nor the plants", () => {
    const starter = piece('bend', 3, 1, 2)
    const built = [piece('bend', 3, 1, 3), piece('wheel', 2, 2), piece('split', 3, 0), piece('sluice', 4, 1), piece('split', 2, 3)]
    const builds: Piece[][] = [[], [starter], built, [...built, piece('straight', 5, 3), piece('bend', 1, 1)]]
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < ROWS; r++) {
        for (const kind of ['straight', 'bend', 'split', 'sluice'] as const) builds.push([piece('split', 3, 0), piece(kind, c, r, 0)], [piece('split', 3, 0), piece(kind, c, r, 1)])
      }
    }
    const surfaces = (['hillside', 'beds', 'crops'] as const).map((name) => [name, auditPiece(name, { hillside, beds, crops }[name], new THREE.Matrix4())] as const)
    const problems: string[] = []
    for (const build of builds) {
      const controller = garden(build)
      kit(controller).draw()
      const water = new WaterView(texture)
      water.update(controller)
      water.group.updateMatrixWorld(true)
      const ribbon = mesh(water.group, 'running-water')
      const { start, count } = ribbon.geometry.drawRange
      const flowing = auditPiece('running-water', ribbon.geometry, ribbon.matrixWorld, Uint32Array.from(ribbon.geometry.getIndex()!.array.slice(start, start + count)))
      const names = build.map((p) => `${p.kind}(${p.c},${p.r}) turn ${p.turn}`).join(' + ') || 'bare garden'
      for (const [name, surface] of surfaces) {
        const segments = crossings(flowing, surface)
        if (segments.length > 0) problems.push(`${names}: water through ${name} at (${segments.slice(0, 3).map((n) => n.toFixed(3)).join(', ')})`)
      }
      water.dispose()
    }
    expect(problems.slice(0, 12)).toEqual([])
  })
})

// ---------------------------------------------------------------- one plane

type Face = { name: string; points: THREE.Vector3[]; normal: THREE.Vector3; d: number; centre: THREE.Vector3 }

function facesOf(name: string, geometry: THREE.BufferGeometry): Face[] {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const count = (index ? index.count : position.count) / 3
  const out: Face[] = []
  const triangle = new THREE.Triangle()
  for (let f = 0; f < count; f++) {
    const points = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(f * 3 + k) : f * 3 + k))
    triangle.set(points[0], points[1], points[2])
    if (triangle.getArea() < 1e-7) continue
    const normal = triangle.getNormal(new THREE.Vector3())
    // Either side of a face may be what shows, so a face and its reverse lie in one plane.
    const big = [normal.x, normal.y, normal.z].reduce((best, c) => (Math.abs(c) > Math.abs(best) ? c : best), 0)
    if (big < 0) normal.negate()
    out.push({ name, points, normal, d: normal.dot(points[0]), centre: triangle.getMidpoint(new THREE.Vector3()) })
  }
  return out
}

/** Do two triangles in one plane overlap there by more than `margin` (not just meet along an edge or at a corner)? */
function overlapInPlane(a: Face, b: Face, margin: number): boolean {
  const n = a.normal
  const drop = Math.abs(n.x) >= Math.abs(n.y) && Math.abs(n.x) >= Math.abs(n.z) ? 'x' : Math.abs(n.y) >= Math.abs(n.z) ? 'y' : 'z'
  const flat = (p: THREE.Vector3): [number, number] => (drop === 'x' ? [p.y, p.z] : drop === 'y' ? [p.x, p.z] : [p.x, p.y])
  const pa = a.points.map(flat)
  const pb = b.points.map(flat)
  for (const shape of [pa, pb]) {
    for (let i = 0; i < 3; i++) {
      const [x0, y0] = shape[i]
      const [x1, y1] = shape[(i + 1) % 3]
      const length = Math.hypot(x1 - x0, y1 - y0)
      const ax = -(y1 - y0) / length
      const ay = (x1 - x0) / length
      const range = (s: [number, number][]) => s.reduce(([lo, hi], [x, y]) => [Math.min(lo, x * ax + y * ay), Math.max(hi, x * ax + y * ay)], [Infinity, -Infinity])
      const [loA, hiA] = range(pa)
      const [loB, hiB] = range(pb)
      if (hiA - loB < margin || hiB - loA < margin) return false
    }
  }
  return true
}

/**
 * Faces of the given meshes that lie in one plane (within `eps`) and overlap there: the depth test cannot tell them
 * apart, so they flicker through each other as the view moves.
 */
function sharedPlanes(sets: [string, THREE.BufferGeometry][], eps = 1e-3): string[] {
  const faces = sets.flatMap(([name, g]) => facesOf(name, g))
  const bucket = (f: Face, dx = 0, dy = 0, dz = 0, dd = 0) =>
    `${Math.round(f.normal.x * 20) + dx},${Math.round(f.normal.y * 20) + dy},${Math.round(f.normal.z * 20) + dz},${Math.round(f.d / 0.01) + dd}`
  const buckets = new Map<string, Face[]>()
  for (const f of faces) {
    const key = bucket(f)
    const list = buckets.get(key)
    if (list) list.push(f)
    else buckets.set(key, [f])
  }
  const found: string[] = []
  const done = new Set<string>()
  for (const f of faces) {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (let dd = -1; dd <= 1; dd++) {
            for (const g of buckets.get(bucket(f, dx, dy, dz, dd)) ?? []) {
              if (g === f || f.normal.dot(g.normal) < 1 - 1e-4 || Math.abs(f.d - g.d) > eps) continue
              if (!overlapInPlane(f, g, 1e-3)) continue
              const where = `${f.name} × ${g.name} near (${f.centre.x.toFixed(2)}, ${f.centre.y.toFixed(2)}, ${f.centre.z.toFixed(2)})`
              if (done.has(where)) continue
              done.add(where)
              found.push(where)
            }
          }
    if (found.length > 40) break
  }
  return found
}

describe('surfaces in one plane', () => {
  it('no two faces of the hillside, its foliage and the beds lie in one plane over each other', () => {
    expect(sharedPlanes([['hillside', hillside], ['foliage', foliage], ['beds', beds]]).slice(0, 8)).toEqual([])
  }, 60_000)

  it("no two faces of the waterwheel lie in one plane over each other, where its spokes cross at the axle", () => {
    const wheel = mesh(new PiecesView(texture, projector(), plots.tops).group, 'wheel').geometry
    expect(sharedPlanes([['wheel', wheel]]).slice(0, 8)).toEqual([])
  })
})
