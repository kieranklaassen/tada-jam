import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { CREATURE_BODY, CREATURE_SCALE, groundAlt, KNOB_BODY, PIECE_BODY } from './bodies'
import { GardenController, type Projector } from './controller'
import { KNOB, type CreatureKind, type PieceKind, type Point } from './layout'
import type { Pose } from './motion'
import { defaultGarden, deserialize, type GardenState } from './state'
import { creatureGeometry, pieceGeometry } from './view/geometry'
import { KIND, PART } from './view/materials'

// The glass vertex shader's moves (view/materials.ts, `deform`), vertex by vertex: the reference the
// keel in bodies.ts is checked against.
type V = [number, number, number]
const rotX = (p: V, a: number): V => [p[0], Math.cos(a) * p[1] - Math.sin(a) * p[2], Math.sin(a) * p[1] + Math.cos(a) * p[2]]
const rotY = (p: V, a: number): V => [Math.cos(a) * p[0] + Math.sin(a) * p[2], p[1], -Math.sin(a) * p[0] + Math.cos(a) * p[2]]
const rotZ = (p: V, a: number): V => [Math.cos(a) * p[0] - Math.sin(a) * p[1], Math.sin(a) * p[0] + Math.cos(a) * p[1], p[2]]
const about = (p: V, pivot: V, turn: (q: V) => V): V => {
  const q = turn([p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]])
  return [q[0] + pivot[0], q[1] + pivot[1], q[2] + pivot[2]]
}

function deform(kind: number, part: number, rest: V, pose: Pose, time: number): V {
  let p: V = [...rest]
  if (kind === KIND.jelly) {
    const sq = pose.a
    if (part === PART.a) {
      p = [p[0] * (1 - 0.3 * sq), 3.6 + (p[1] - 3.6) * (1 + 0.45 * sq), p[2] * (1 - 0.3 * sq)]
    } else if (part === PART.b) {
      const hang = Math.max(0, 3.6 - p[1])
      const k = (1 - 0.22 * sq) * (1 + hang * 0.28 * pose.c)
      p = [p[0] * k, 3.6 - hang * (1 - 0.4 * pose.c), p[2] * k]
      p[0] += Math.sin(hang * 1.5 - time * 2.4 + p[2] * 1.7 + p[0]) * pose.b * hang * 0.22
      p[2] += Math.cos(hang * 1.2 - time * 2.0 + p[0] * 2.0) * pose.b * hang * 0.12
    }
  } else if (kind === KIND.moth) {
    const angle = -0.32 + 0.44 * pose.a + pose.b * 0.75
    const sweep = (1 - pose.a) * 0.62
    if (part === PART.a) p = about(p, [0.4, 2.35, 0], (q) => rotX(rotY(q, -sweep), -angle))
    else if (part === PART.b) p = about(p, [0.4, 2.35, 0], (q) => rotX(rotY(q, sweep), angle))
    else if (part === PART.c) p = about(p, [2.6, 2.8, 0], (q) => rotZ(q, (pose.c - 0.5) * 0.8))
  } else if (kind === KIND.snail) {
    const ext = 0.28 + 0.72 * pose.a
    if (part === PART.a && p[0] > -0.4) p[0] = -0.4 + (p[0] + 0.4) * ext
    if (part === PART.b || part === PART.c) {
      const side = part === PART.b ? 1 : -1
      const root: V = [2.7, 1.9, side * 0.42]
      const len = Math.max(0.12, part === PART.b ? pose.b : pose.c)
      p = [-0.4 + (root[0] + 0.4) * ext + (p[0] - root[0]) * len, root[1] + (p[1] - root[1]) * len, root[2] + (p[2] - root[2])]
    }
    if ((part === PART.a || part === PART.rigid) && p[1] <= 1.2) p[1] += Math.sin(p[0] * 1.8 - time * 3) * 0.07 * pose.a
  } else if (kind === KIND.fish) {
    if (part === PART.a) p = about(p, [-2.9, 2.5, 0], (q) => rotY(q, pose.a * 0.65))
    else if (part === PART.b) {
      const side = Math.sign(p[2])
      p = about(p, [0.8, 2.2, side * 1.3], (q) => rotX(q, -pose.b * 0.6 * side))
    }
    p[2] += pose.c * p[0] * p[0] * 0.085
  }
  return p
}

const CREATURE_KIND: Record<CreatureKind, number> = { moth: KIND.moth, fish: KIND.fish, snail: KIND.snail, jelly: KIND.jelly }
const MESHES = new Map((['moth', 'fish', 'snail', 'jelly'] as const).map((kind) => [kind, creatureGeometry(kind)]))

const matrix = new THREE.Matrix4()
const euler = new THREE.Euler()
const turn = new THREE.Quaternion()
const scratch = new THREE.Vector3()

/** Every vertex of a creature drawn as the view draws it, standing at height 0: the lowest and highest y and the widest reach. */
function drawn(kind: CreatureKind, pose: Pose, time: number): { lowest: number; top: number; reach: number } {
  euler.set(pose.roll, -pose.heading, pose.pitch, 'YXZ')
  turn.setFromEuler(euler)
  const squashed = CREATURE_SCALE / Math.sqrt(Math.max(0.2, pose.stretch * pose.squash))
  matrix.compose(new THREE.Vector3(), turn, new THREE.Vector3(pose.stretch * CREATURE_SCALE, pose.squash * CREATURE_SCALE, squashed))
  const geometry = MESHES.get(kind)!
  const position = geometry.getAttribute('position')
  const part = geometry.getAttribute('aPart')
  let lowest = Infinity
  let top = -Infinity
  let reach = 0
  for (let i = 0; i < position.count; i++) {
    const p = deform(CREATURE_KIND[kind], Math.round(part.getX(i)), [position.getX(i), position.getY(i), position.getZ(i)], pose, time)
    scratch.set(p[0], p[1], p[2]).applyMatrix4(matrix)
    lowest = Math.min(lowest, scratch.y)
    top = Math.max(top, scratch.y)
    reach = Math.max(reach, Math.hypot(scratch.x, scratch.z))
  }
  return { lowest, top, reach }
}

// A straight-down camera: ten screen pixels to a centimetre, height ignored.
const PX = 10
const topDown: Projector = {
  toPlane: (screen, _height, out = { x: 0, y: 0 }) => {
    out.x = screen.x / PX
    out.y = screen.y / PX
    return out
  },
  toScreen: (x, y) => ({ x: x * PX, y: y * PX }),
}

const FULL_GARDEN = {
  v: 1,
  pieces: [
    { id: 'lampA', x: -46, y: 2, angle: 0.393, inTray: false },
    { id: 'lampB', x: 48.5, y: -24, angle: 2.685, inTray: false },
    { id: 'prism', x: -24, y: 11, angle: -2.12, inTray: false },
    { id: 'mirror1', x: -44, y: -24, angle: 0.4, inTray: false },
    { id: 'mirror2', x: 48, y: 24, angle: -0.8, inTray: false },
    { id: 'filterR', x: -10, y: -26, angle: 0, inTray: false },
    { id: 'filterG', x: 16, y: 27, angle: 1.2, inTray: false },
    { id: 'filterB', x: -46, y: 24, angle: 0.5, inTray: false },
  ],
  beds: [
    { x: 0, y: 6 },
    { x: 26, y: -3 },
    { x: -30, y: 26 },
    { x: -23, y: -10 },
  ],
}

type Sample = { kind: CreatureKind; pose: Pose; time: number; where: string }

/** Poses from a sleeping garden and a full one: resting, dreaming, poked twice each, carried, waking, playing. */
function poses(): Sample[] {
  const samples: Sample[] = []
  let clock = 0
  const run = (garden: GardenController, seconds: number, where: string) => {
    for (let t = 0; t < seconds; t += 1 / 30) {
      garden.step(1 / 30)
      for (const c of garden.creatures) samples.push({ kind: c.c.kind, pose: { ...c.pose }, time: garden.t, where: `${where} (${c.c.kind} ${c.c.phase})` })
    }
  }
  const at = (x: number, y: number): Point => ({ x: x * PX, y: y * PX })
  const everyone = (garden: GardenController, where: string) => {
    for (const c of garden.creatures) {
      for (const n of [1, 2]) {
        garden.pointerDown(1, at(c.x, c.y), (clock += 10))
        garden.pointerUp(1, at(c.x, c.y), (clock += 80))
        run(garden, n === 1 ? 0.6 : 2.2, `${where}: ${c.c.kind} poked ${n}`)
      }
      const from = at(c.x, c.y)
      garden.pointerDown(2, from, (clock += 10))
      for (let i = 1; i <= 20; i++) {
        garden.pointerMove(2, { x: from.x + i * 5, y: from.y + i * 2 })
        run(garden, 1 / 30, `${where}: ${c.c.kind} carried`)
      }
      run(garden, 1.2, `${where}: ${c.c.kind} held`)
      garden.pointerUp(2, { x: from.x + 100, y: from.y + 40 }, (clock += 300))
      run(garden, 1.5, `${where}: ${c.c.kind} set down`)
    }
  }
  const save = vi.fn<(state: GardenState) => void>()
  const sleeping = new GardenController(defaultGarden(7), { save })
  sleeping.setProjector(topDown)
  run(sleeping, 12, 'asleep')
  everyone(sleeping, 'asleep')
  const full = new GardenController(deserialize(FULL_GARDEN, 7), { save })
  full.setProjector(topDown)
  run(full, 6, 'waking')
  run(full, 30, 'awake')
  everyone(full, 'awake')
  run(full, 10, 'awake after')
  return samples
}

/** Every pose, drawn once for all the checks below. */
const SAMPLES = poses().map((sample) => ({ ...sample, drawn: drawn(sample.kind, sample.pose, sample.time) }))

describe('bodies', () => {
  it('measures every piece from its mesh: the glass, and the knob apart', () => {
    for (const kind of ['lamp', 'mirror', 'filter', 'prism'] as PieceKind[]) {
      const geometry = pieceGeometry(kind)
      const position = geometry.getAttribute('position')
      const part = geometry.getAttribute('aPart')
      const knob = KNOB[kind]
      const kx = Math.cos(knob.angle) * knob.distance
      const kz = Math.sin(knob.angle) * knob.distance
      let top = 0
      let reach = 0
      let knobTop = 0
      let bead = 0
      for (let i = 0; i < position.count; i++) {
        const [x, y, z] = [position.getX(i), position.getY(i), position.getZ(i)]
        if (Math.round(part.getX(i)) === PART.knob) {
          knobTop = Math.max(knobTop, y)
          if (Math.hypot(x - kx, z - kz) < 2.5) bead = Math.max(bead, Math.hypot(x - kx, z - kz))
        } else {
          top = Math.max(top, y)
          reach = Math.max(reach, Math.hypot(x, z))
        }
      }
      for (const [name, table, measured] of [
        ['top', PIECE_BODY[kind].top, top],
        ['reach', PIECE_BODY[kind].reach, reach],
        ['knob top', KNOB_BODY.top, knobTop],
        ['bead', KNOB_BODY.bead, bead],
      ] as const) {
        expect(table, `${kind} ${name}`).toBeGreaterThanOrEqual(measured - 1e-6)
        expect(table, `${kind} ${name}`).toBeLessThan(measured + 0.05)
      }
    }
  })

  it('folds each knob into the middle of its piece for the tray, and moves nothing else', () => {
    for (const kind of ['lamp', 'mirror', 'filter', 'prism'] as PieceKind[]) {
      const geometry = pieceGeometry(kind)
      const position = geometry.getAttribute('position')
      const part = geometry.getAttribute('aPart')
      const folded = geometry.morphAttributes.position![0]
      const wrong: string[] = []
      for (let i = 0; i < position.count; i++) {
        const at = [folded.getX(i), folded.getY(i), folded.getZ(i)]
        if (Math.round(part.getX(i)) !== PART.knob) {
          if (at[0] !== position.getX(i) || at[1] !== position.getY(i) || at[2] !== position.getZ(i)) wrong.push(`glass ${i} moved`)
        } else if (at[0] !== 0 || at[2] !== 0 || at[1] > 0.2 * KNOB_BODY.top + 1e-6) wrong.push(`knob ${i} at ${at.map((v) => v.toFixed(2))}`)
      }
      expect(wrong.slice(0, 3), kind).toEqual([])
    }
  })

  it('holds every creature inside its measured top and reach, in every pose it takes', () => {
    // The full garden wakes all four, so their widest and tallest poses are among the samples.
    expect([...new Set(SAMPLES.filter((s) => s.where.endsWith(' awake)')).map((s) => s.kind))].sort()).toEqual(['fish', 'jelly', 'moth', 'snail'])
    const most: Record<string, { top: number; reach: number }> = {}
    for (const sample of SAMPLES) {
      const { top, reach } = sample.drawn
      const seen = (most[sample.kind] ??= { top: 0, reach: 0 })
      seen.top = Math.max(seen.top, top)
      seen.reach = Math.max(seen.reach, reach)
    }
    for (const kind of ['moth', 'fish', 'snail', 'jelly'] as const) {
      expect(most[kind].top, `${kind} top`).toBeLessThanOrEqual(CREATURE_BODY[kind].top)
      expect(most[kind].reach, `${kind} reach`).toBeLessThanOrEqual(CREATURE_BODY[kind].reach)
      // Measured, not guessed: a little over the tallest and widest pose seen, never a generous round number.
      expect(most[kind].top, `${kind} top`).toBeGreaterThan(CREATURE_BODY[kind].top * 0.88)
      expect(most[kind].reach, `${kind} reach`).toBeGreaterThan(CREATURE_BODY[kind].reach * 0.88)
    }
  })

  it('stands every creature on the panel in every pose: nothing dips under it, and it never floats clear of it', () => {
    const dips: string[] = []
    const floats: string[] = []
    for (const sample of SAMPLES) {
      const ground = groundAlt(sample.kind, sample.pose, sample.time)
      const lowest = ground + sample.drawn.lowest
      if (lowest < -0.02) dips.push(`${sample.where} at ${sample.time.toFixed(2)}s: ${lowest.toFixed(3)}`)
      if (lowest > 0.35) floats.push(`${sample.where} at ${sample.time.toFixed(2)}s: ${lowest.toFixed(3)}`)
    }
    expect(dips.slice(0, 5)).toEqual([])
    expect(floats.slice(0, 5)).toEqual([])
  })
})
