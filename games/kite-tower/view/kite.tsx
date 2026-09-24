import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { KITE_BRIDLE, KITE_LINE, type KiteController } from '../controller'
import { BlockField, keepOut, SPOOL_ROOM, type DollPlace } from '../doll'
import { SHELF, WALL_Z, WINDOW } from '../layout'
import type { Vec2 } from '../pieces'
import { TIERS } from '../quality'
import { gatherBlocks } from './dolls'
import { merge, stained, woodBox, woodLathe, woodSlab } from './shapes'
import { useTier } from './stage'
import { woodMaterial } from './wood'

// The kite: four thin stained panels on two crossed dowels, a tail of little
// wooden bows on a verlet string, and a flying line that dangles down to a
// wooden spool the doll can catch. While the doll holds it, the spool stays
// in her right hand. Tail, line and spool drape over her rather than through
// her. All of it is built once; the verlet chains reuse their arrays every
// frame.

const TOP = 0.95
const BOTTOM = -0.85
const SIDE = 0.62
const CROSS = 0.25
const BOWS = ['#d9473b', '#f08a2a', '#f2c230', '#5fae4f', '#3f86c8', '#7c5bab', '#e7799f']
const TAIL_MAX = TIERS[0].tail
const TAIL_LINK = 0.19
const LINE_NODES = 11
const GRAVITY = -7
/** Half a bow's span across the string, and half its height along it. */
const BOW_SPAN = 0.16
const BOW_HALF = 0.09
/** Room a bow needs round its knot: half its span and height, and its bevel. */
const BOW_ROOM = Math.hypot(BOW_SPAN, BOW_HALF) + 0.02
const LINE_ROOM = 0.03
/** Where the loose spool hangs below the line's end. */
const SPOOL_DROP = 0.12
/** From the kite's middle, as far as its line with the spool, or its longest tail, can hang. */
const REACH = Math.max(KITE_LINE + SPOOL_DROP + SPOOL_ROOM, -BOTTOM + TAIL_MAX * TAIL_LINK + BOW_ROOM)
/** Tops of the things a perched kite rests on, as thin slabs open at the front. */
const LEDGES = [
  ...SHELF.boards.map((y) => ({ x0: SHELF.x0 + SHELF.side, x1: SHELF.x1 - SHELF.side, y, front: SHELF.front })),
  { x0: SHELF.x0 - 0.07, x1: SHELF.x1 + 0.07, y: SHELF.top, front: SHELF.front + 0.08 },
  { x0: WINDOW.x0 - 0.35, x1: WINDOW.x1 + 0.35, y: WINDOW.sill, front: WALL_Z + 0.72 },
]

function kiteGeometry(): THREE.BufferGeometry {
  const centre = { x: 0, y: CROSS }
  const corners: Vec2[] = [
    { x: 0, y: TOP },
    { x: -SIDE, y: CROSS },
    { x: 0, y: BOTTOM },
    { x: SIDE, y: CROSS },
  ]
  const stains = ['#d9473b', '#3f86c8', '#5fae4f', '#f2c230']
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    const panel = woodSlab([centre, a, b], 0.04, 'y', { bevel: 0.014, segments: 1, offset: { x: i * 0.6, y: 0.1 } })
    parts.push(stained(panel, stains[i]))
  }
  parts.push(stained(woodBox(0.05, TOP - BOTTOM, 0.05, { x: 0, y: (TOP + BOTTOM) / 2, z: -0.045 }, 'y', { bevel: 0.012, segments: 1 }), '#f0dcb6'))
  parts.push(stained(woodBox(SIDE * 2, 0.05, 0.05, { x: 0, y: CROSS, z: -0.045 }, 'x', { bevel: 0.012, segments: 1 }), '#f0dcb6'))
  return merge(parts)
}

function bowGeometry(): THREE.BufferGeometry {
  const bow = woodSlab(
    [
      { x: -BOW_SPAN, y: -BOW_HALF },
      { x: 0, y: -0.02 },
      { x: BOW_SPAN, y: -BOW_HALF },
      { x: BOW_SPAN, y: BOW_HALF },
      { x: 0, y: 0.02 },
      { x: -BOW_SPAN, y: BOW_HALF },
    ],
    0.03,
    'x',
    { bevel: 0.01, segments: 1 },
  )
  return bow
}

function spoolGeometry(): THREE.BufferGeometry {
  const spool = woodLathe(
    [
      { x: 0, y: -0.16 },
      { x: 0.13, y: -0.16 },
      { x: 0.14, y: -0.14 },
      { x: 0.13, y: -0.11 },
      { x: 0.06, y: -0.1 },
      { x: 0.07, y: 0.1 },
      { x: 0.13, y: 0.11 },
      { x: 0.14, y: 0.14 },
      { x: 0.13, y: 0.16 },
      { x: 0, y: 0.16 },
    ],
    20,
  )
  spool.rotateZ(Math.PI / 2)
  return stained(spool, '#e8cfa3')
}

/** How far a bow on node `k` reaches below its knot: it spans across the string, so a level string stands it on end. */
function bowHalfHeight(p: Float32Array, k: number): number {
  const dx = p[k] - p[k - 3]
  const dy = p[k + 1] - p[k - 2]
  const d = Math.hypot(dx, dy)
  if (d < 1e-6) return BOW_SPAN
  return (BOW_SPAN * Math.abs(dx) + BOW_HALF * Math.abs(dy)) / d
}

/** A verlet string: positions and previous positions in flat arrays, fixed length links. */
class Chain {
  readonly p: Float32Array
  readonly q: Float32Array
  count: number
  private readonly at = { x: 0, y: 0, z: 0 }

  constructor(max: number, count: number) {
    this.p = new Float32Array(max * 3)
    this.q = new Float32Array(max * 3)
    this.count = count
  }

  reset(x: number, y: number, z: number, link: number): void {
    for (let i = 0; i < this.p.length / 3; i++) {
      this.p[i * 3] = this.q[i * 3] = x
      this.p[i * 3 + 1] = this.q[i * 3 + 1] = y - i * link
      this.p[i * 3 + 2] = this.q[i * 3 + 2] = z
    }
  }

  step(dt: number, ax: number, ay: number, az: number, damping: number): void {
    const dt2 = dt * dt
    for (let i = 1; i < this.count; i++) {
      const k = i * 3
      for (let d = 0; d < 3; d++) {
        const cur = this.p[k + d]
        const velocity = (cur - this.q[k + d]) * damping
        this.q[k + d] = cur
        this.p[k + d] = cur + velocity + (d === 0 ? ax : d === 1 ? ay : az) * dt2
      }
    }
  }

  pin(i: number, x: number, y: number, z: number): void {
    this.p[i * 3] = x
    this.p[i * 3 + 1] = y
    this.p[i * 3 + 2] = z
  }

  /**
   * Keep free nodes off the wall and out of the ledges so strings drape over
   * edges. From node `bows` on, every second node carries a bow, which sits
   * on a ledge by its lowest corner at the angle the string runs.
   */
  collide(first: number, last: number, bows = -1): void {
    for (let i = first; i <= last; i++) {
      const k = i * 3
      const x = this.p[k]
      // Pushes also move the previous position, so a correction never turns into a launch.
      if (this.p[k + 2] < WALL_Z + 0.04) this.p[k + 2] = this.q[k + 2] = WALL_Z + 0.04
      const room = bows >= 0 && i >= bows && (i - bows) % 2 === 0 ? bowHalfHeight(this.p, k) + 0.015 : 0.02
      for (let j = 0; j < LEDGES.length; j++) {
        const l = LEDGES[j]
        if (x < l.x0 || x > l.x1) continue
        const below = l.y - this.p[k + 1]
        const out = l.front + 0.03 - this.p[k + 2]
        if (below + room <= 0 || out <= 0 || below > 0.28) continue
        if (below + room < out) this.p[k + 1] = this.q[k + 1] = l.y + room
        else this.p[k + 2] = this.q[k + 2] = l.front + 0.03
      }
    }
  }

  /** Keep nodes `first`..`last` `margin` clear of the doll; the previous position moves too, so a push never becomes a fling. */
  avoid(doll: DollPlace, first: number, last: number, margin: number): void {
    const at = this.at
    for (let i = first; i <= last; i++) this.avoidAt(doll, i, margin, 0, at)
  }

  /** Keep a point `drop` below node `i` `margin` clear of the doll by moving the node. */
  avoidAt(doll: DollPlace, i: number, margin: number, drop: number, at = this.at): void {
    this.load(i, drop, at)
    if (keepOut(doll, at, margin)) this.shift(i, drop, at)
  }

  /** Keep nodes `first`..`last` (a point `drop` below each) `room` clear of the blocks; the previous position moves too. */
  avoidBlocks(blocks: BlockField, first: number, last: number, room: number, drop = 0): void {
    const at = this.at
    for (let i = first; i <= last; i++) {
      this.load(i, drop, at)
      if (blocks.pushOut(at, room)) this.shift(i, drop, at)
    }
  }

  /** Keep every `every`-th node from `first` `room` from point (x, y, z), pushing it straight away. */
  clearOf(x: number, y: number, z: number, room: number, first: number, every: number): void {
    const at = this.at
    for (let i = first; i < this.count; i += every) {
      this.load(i, 0, at)
      const dx = at.x - x
      const dy = at.y - y
      const dz = at.z - z
      const d = Math.hypot(dx, dy, dz)
      if (d >= room) continue
      // A knot right on the point goes toward the child.
      const k = d > 1e-6 ? room / d : 0
      at.x = x + dx * k
      at.y = y + dy * k
      at.z = d > 1e-6 ? z + dz * k : z + room
      this.shift(i, 0, at)
    }
  }

  /** Node `i`, `drop` below it, into `at`. */
  private load(i: number, drop: number, at: { x: number; y: number; z: number }): void {
    const k = i * 3
    at.x = this.p[k]
    at.y = this.p[k + 1] - drop
    at.z = this.p[k + 2]
  }

  /** Move node `i` (and its previous position, so the push never becomes a fling) so the point `drop` below it is at `at`. */
  private shift(i: number, drop: number, at: { x: number; y: number; z: number }): void {
    const k = i * 3
    const dx = at.x - this.p[k]
    const dy = at.y + drop - this.p[k + 1]
    const dz = at.z - this.p[k + 2]
    this.p[k] += dx
    this.p[k + 1] += dy
    this.p[k + 2] += dz
    this.q[k] += dx
    this.q[k + 1] += dy
    this.q[k + 2] += dz
  }

  /** Keep every `every`-th node from `first` at least `room` from the others, so a folded tail never stacks one bow on another. */
  spread(first: number, every: number, room: number): void {
    const p = this.p
    const q = this.q
    for (let i = first; i < this.count; i += every) {
      for (let j = i + every; j < this.count; j += every) {
        const a = i * 3
        const b = j * 3
        const dx = p[b] - p[a]
        const dy = p[b + 1] - p[a + 1]
        const dz = p[b + 2] - p[a + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d >= room) continue
        // Coincident knots part sideways.
        const k = d > 1e-6 ? (room - d) / d / 2 : 0
        const ox = d > 1e-6 ? dx * k : room / 2
        const oy = dy * k
        const oz = dz * k
        p[a] -= ox
        p[a + 1] -= oy
        p[a + 2] -= oz
        q[a] -= ox
        q[a + 1] -= oy
        q[a + 2] -= oz
        p[b] += ox
        p[b + 1] += oy
        p[b + 2] += oz
        q[b] += ox
        q[b + 1] += oy
        q[b + 2] += oz
      }
    }
  }

  /** Enforce link lengths; with `endPinned` the last node stays put too. */
  relax(link: number, iterations: number, endPinned: boolean): void {
    const n = this.count
    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < n - 1; i++) {
        const a = i * 3
        const b = a + 3
        const dx = this.p[b] - this.p[a]
        const dy = this.p[b + 1] - this.p[a + 1]
        const dz = this.p[b + 2] - this.p[a + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
        const diff = (d - link) / d
        const fixedA = i === 0
        const fixedB = endPinned && i + 1 === n - 1
        const wa = fixedA ? 0 : fixedB ? 1 : 0.5
        const wb = fixedB ? 0 : fixedA ? 1 : 0.5
        this.p[a] += dx * diff * wa
        this.p[a + 1] += dy * diff * wa
        this.p[a + 2] += dz * diff * wa
        this.p[b] -= dx * diff * wb
        this.p[b + 1] -= dy * diff * wb
        this.p[b + 2] -= dz * diff * wb
      }
    }
  }
}

export function Kite({ controller, pip }: { controller: KiteController; pip: DollPlace }) {
  const tier = useTier()
  const built = useMemo(() => {
    const wood = woodMaterial({ vertexColors: true })
    const bowMaterial = woodMaterial({ instanced: true })
    const body = new THREE.Mesh(kiteGeometry(), wood)
    const bowGeo = bowGeometry()
    bowGeo.setAttribute('grainShift', new THREE.InstancedBufferAttribute(new Float32Array(BOWS.length).map((_, i) => i * 0.37), 1))
    const bows = new THREE.InstancedMesh(bowGeo, bowMaterial, BOWS.length)
    const color = new THREE.Color()
    BOWS.forEach((c, i) => bows.setColorAt(i, color.set(c)))
    bows.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    const lineMaterial = new THREE.LineBasicMaterial({ color: '#8a6a4a' })
    const tailGeometry = new THREE.BufferGeometry()
    tailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TAIL_MAX * 3), 3).setUsage(THREE.DynamicDrawUsage))
    const tailLine = new THREE.Line(tailGeometry, lineMaterial)
    const flyGeometry = new THREE.BufferGeometry()
    flyGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_NODES * 3), 3).setUsage(THREE.DynamicDrawUsage))
    const flyLine = new THREE.Line(flyGeometry, lineMaterial)
    const spool = new THREE.Mesh(spoolGeometry(), wood)
    for (const o of [body, bows, tailLine, flyLine, spool]) o.frustumCulled = false
    body.name = 'kite-body'
    bows.name = 'kite-bows'
    tailLine.name = 'kite-tail'
    flyLine.name = 'kite-line'
    spool.name = 'kite-spool'
    const group = new THREE.Group()
    group.add(body, bows, tailLine, flyLine, spool)
    const tail = new Chain(TAIL_MAX, TIERS[0].tail)
    const line = new Chain(LINE_NODES, LINE_NODES)
    return { group, body, bows, tailLine, flyLine, spool, tail, line, blocks: new BlockField(), wood, bowMaterial, lineMaterial }
  }, [])

  const scratch = useMemo(
    () => ({ started: false, local: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), p: new THREE.Vector3(), z: new THREE.Vector3(0, 0, 1) }),
    [],
  )

  useEffect(() => {
    built.tail.count = Math.min(TAIL_MAX, tier.tail)
  }, [built, tier])

  useFrame((_, frameDt) => {
    const c = controller
    const kite = c.kite
    const hero = c.hero
    const t = c.t
    const dt = Math.min(1 / 30, Math.max(1e-4, frameDt))
    const { body, bows, tailLine, flyLine, spool, tail, line, blocks } = built
    const { local, m, q, s, p, z } = scratch
    const flutter = t - kite.flutterAt
    let wobble = Math.sin(t * 1.3) * 0.035
    if (flutter < 1) wobble += Math.sin(flutter * 24) * 0.18 * (1 - flutter)
    const flying = kite.mode === 'flying'
    body.position.set(kite.position.x, kite.position.y, kite.position.z)
    body.rotation.set(flying ? Math.sin(t * 3.1) * 0.18 : kite.lean, flying ? Math.sin(t * 1.7) * 0.25 : 0, kite.tilt + wobble)
    body.updateMatrix()
    if (!scratch.started) {
      local.set(0, BOTTOM, 0).applyEuler(body.rotation).add(body.position)
      tail.reset(local.x, local.y, local.z, TAIL_LINK)
      line.reset(kite.position.x, kite.position.y, kite.position.z + KITE_BRIDLE.z, KITE_LINE / (LINE_NODES - 1))
      scratch.started = true
    }
    // The blocks the line, spool and tail could reach this frame.
    gatherBlocks(c, blocks, kite.position.x, kite.position.y, REACH)
    // The flying line from the bridle, its spool in the doll's right hand while held.
    local.set(0, KITE_BRIDLE.y, KITE_BRIDLE.z).applyEuler(body.rotation).add(body.position)
    line.pin(0, local.x, local.y, local.z)
    const held = (hero.mode === 'grab' || hero.mode === 'fly') && pip.set
    const link = KITE_LINE / (LINE_NODES - 1)
    line.step(dt, flying ? 0 : Math.sin(t * 0.7) * 0.4, GRAVITY, flying ? 0 : 0.7, 0.94)
    const last = LINE_NODES - 1
    const end = last * 3
    if (held) {
      const grip = pip.grip
      const k = hero.mode === 'grab' ? Math.min(1, (t - hero.since) / 0.25) : 1
      line.pin(last, line.p[end] + (grip.x - line.p[end]) * k, line.p[end + 1] + (grip.y - line.p[end + 1]) * k, line.p[end + 2] + (grip.z - line.p[end + 2]) * k)
    }
    line.relax(link, 6, held)
    line.collide(1, held ? last - 1 : last)
    line.avoid(pip, 1, held ? last - 1 : last, LINE_ROOM)
    if (!blocks.empty) line.avoidBlocks(blocks, 1, held ? last - 1 : last, LINE_ROOM)
    if (!held) {
      line.avoidAt(pip, last, SPOOL_ROOM, SPOOL_DROP)
      if (!blocks.empty) {
        line.avoidBlocks(blocks, last, last, SPOOL_ROOM, SPOOL_DROP)
        line.avoidAt(pip, last, SPOOL_ROOM, SPOOL_DROP)
      }
    }
    const linePositions = flyLine.geometry.getAttribute('position') as THREE.BufferAttribute
    linePositions.array.set(line.p)
    linePositions.needsUpdate = true
    spool.position.set(line.p[end], line.p[end + 1] - (held ? 0 : SPOOL_DROP), line.p[end + 2])
    // Held, it lies across her hand; loose, across the line.
    const from = held ? pip.handR : null
    spool.rotation.z = from
      ? Math.atan2(line.p[end + 1] - from.y, line.p[end] - from.x) + Math.PI / 2
      : Math.atan2(line.p[end + 1] - line.p[end - 2], line.p[end] - line.p[end - 3]) + Math.PI / 2
    // Tail from the bottom tip, its bows clear of the spool.
    local.set(0, BOTTOM, 0).applyEuler(body.rotation).add(body.position)
    tail.pin(0, local.x, local.y, local.z)
    const breeze = flying ? 0 : Math.sin(t * 0.9) * 1.2
    tail.step(dt, breeze - kite.velocity.x * 0.2, GRAVITY, flying ? -2 : 0.9, 0.96)
    tail.relax(TAIL_LINK, 4, false)
    tail.spread(2, 2, BOW_ROOM * 2)
    tail.clearOf(spool.position.x, spool.position.y, spool.position.z, BOW_ROOM + SPOOL_ROOM, 2, 2)
    tail.collide(1, tail.count - 1, 2)
    tail.avoid(pip, 1, tail.count - 1, BOW_ROOM)
    if (!blocks.empty) tail.avoidBlocks(blocks, 1, tail.count - 1, BOW_ROOM)
    const tailPositions = tailLine.geometry.getAttribute('position') as THREE.BufferAttribute
    tailPositions.array.set(tail.p.subarray(0, tail.count * 3))
    tailPositions.needsUpdate = true
    tailLine.geometry.setDrawRange(0, tail.count)
    let bowCount = 0
    for (let i = 2; i < tail.count && bowCount < BOWS.length; i += 2) {
      const k = i * 3
      p.set(tail.p[k], tail.p[k + 1], tail.p[k + 2])
      const dx = tail.p[k] - tail.p[k - 3]
      const dy = tail.p[k + 1] - tail.p[k - 2]
      q.setFromAxisAngle(z, Math.atan2(dy, dx) + Math.PI / 2)
      bows.setMatrixAt(bowCount++, m.compose(p, q, s))
    }
    bows.count = bowCount
    bows.instanceMatrix.needsUpdate = true
  })

  useEffect(
    () => () => {
      built.group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose()
      })
      built.wood.dispose()
      built.bowMaterial.dispose()
      built.lineMaterial.dispose()
    },
    [built],
  )
  return <primitive object={built.group} />
}
