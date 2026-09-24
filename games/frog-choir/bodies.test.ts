import { writeFileSync } from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BODIES, emptyShape, PAD_HEIGHTS, RINGS, shapeOf, TAP_STEP, TAP_STEPS, type Posture } from './bodies'
import { dunk, FALL_LONGEST, SPLASH_SECONDS, type FrogMode } from './controller'
import { PAD_TOP } from './layout'
import { buildFrog, CAST, REST_BOTTOM } from './view/frog'
import { animatorFor, applyPose, overlays, resetPose, restPose, type FrogMoment } from './view/personalities'

// Every frog's rig, posed by its animator through everything it does:
// sitting (singing, pressed, landing, inviting, watching the firefly,
// leaning aside for a visitor), tapped, carried, hopping, and splashing.
// The checks look at a sparse sample of those poses. With
// FROG_BODIES_OUT=<file>, the last test looks at every frame and writes the
// table bodies.ts is made from.

const OUT = process.env.FROG_BODIES_OUT
/** How far past the table a rig may reach before the table needs measuring again. */
const SLACK = 0.005

type Act = (m: FrogMoment, a: number) => void

function moment(): FrogMoment {
  return {
    time: 0,
    dt: 1 / 60,
    clock: 0,
    beat: 0.75,
    mode: 'sit',
    sing: Infinity,
    singStrength: 1,
    press: Infinity,
    tap: Infinity,
    lift: Infinity,
    land: Infinity,
    splash: Infinity,
    hop: -1,
    vx: 0,
    vz: 0,
    gazeX: 0,
    gazeY: 1,
    gazeZ: 0,
    fireNear: 0,
    invite: null,
    visited: 0,
    visitorX: 0,
    visitorY: 1,
    visitorZ: 0,
    visitorSide: 1,
  }
}

const tapped = (m: FrogMoment, age: number) => {
  m.tap = age
  m.sing = age
  m.singStrength = 1.25
}

const SITTING: Act[] = [
  () => {},
  (m, a) => void (m.sing = a % 0.75),
  (m, a) => ((m.sing = a % 1.5), (m.singStrength = 1.25)),
  (m, a) => void (m.press = a % 0.6),
  (m, a) => void (m.land = a % 2.5),
  (m, a) => void (m.invite = (a % 1.6) / 1.6),
  (m, a) => ((m.fireNear = 1), (m.sing = a % 0.9), (m.gazeY = 0.3 + Math.sin(a) * 2)),
  (m, a) => ((m.sing = a % 1.3), (m.singStrength = 1.25), (m.press = a % 0.7), (m.land = a % 2.1), (m.invite = (a % 1.9) / 1.9), (m.fireNear = 1)),
]

const VISITED: Act[] = [0.25, 0.5, 0.75, 1].flatMap((k): Act[] => [
  (m, a) => ((m.visited = k), (m.visitorSide = 1), (m.sing = a % 1.1)),
  (m, a) => ((m.visited = k), (m.visitorSide = -1), (m.sing = a % 0.8), (m.singStrength = 1.25), (m.visitorX = 0.4), (m.visitorY = 0.6)),
])

const AIR: Act[] = [
  (m, a) => ((m.mode = 'held'), (m.lift = a), (m.vx = Math.sin(a * 3) * 4), (m.vz = Math.cos(a * 2.3) * 3), (m.sing = a % 1.3), (m.singStrength = 0.55)),
  (m, a) => ((m.mode = 'hop'), (m.hop = (a % 0.5) / 0.5)),
  (m, a) => ((m.mode = 'hop'), (m.hop = (a % 0.5) / 0.5), (m.sing = a % 0.9)),
  (m, a) => ((m.mode = 'hop'), (m.hop = (a % 0.7) / 0.7), tapped(m, a % 1.3)),
  (m, a) => ((m.mode = 'held'), (m.lift = a % 2), tapped(m, a % 1.1)),
]

/** Falling to the water from as high as a frog is let go, then in it. */
const SPLASHING: Act = (m, a) => ((m.mode = 'splash'), (m.splash = (a % (FALL_LONGEST + SPLASH_SECONDS)) - FALL_LONGEST))

/** Taps over and over, a little under 1/60 s later into the tap each time round, sitting, hopping, and carried. */
const TAP_EVERY = 1.71
const TAPPING: Act[] = [
  (m, a) => tapped(m, a % TAP_EVERY),
  (m, a) => ((m.mode = 'hop'), (m.hop = (a * 0.61) % 1), tapped(m, a % TAP_EVERY)),
  (m, a) => ((m.mode = 'held'), (m.lift = 0.3 + a), tapped(m, a % TAP_EVERY)),
]

type Run = { label: string; act: Act; seconds: number; start: number; every: number }

const runs = (label: string, acts: Act[], seconds: number, starts: number[], every: number): Run[] =>
  acts.flatMap((act, k) => starts.map((start) => ({ label: `${label} ${k} from ${start}s`, act, seconds, start, every })))

/** What the table is measured from, every frame; the checks look at every `every`th frame. */
const RUNS: Run[] = [
  ...runs('sitting', SITTING, 16, [0], 29),
  ...runs('visited', VISITED, 8, [0], 29),
  ...runs('air', AIR, 12, [0], 23),
  ...runs('splash', [SPLASHING], 6, [0], 7),
  ...runs('tapping', TAPPING, TAP_EVERY * 5, [0, 3.1, 6.7], 5),
]
const SITTING_RUNS = RUNS.filter((run) => !run.label.startsWith('air') && !run.label.startsWith('splash') && !run.label.match(/^tapping [12] /))

const materials = { toon: new THREE.MeshBasicMaterial(), outline: new THREE.MeshBasicMaterial() }
const rigs = CAST.map((_, i) => buildFrog(i, materials))
const skinOf = (i: number) => rigs[i].group.children[0] as THREE.SkinnedMesh
const v = new THREE.Vector3()

/**
 * Animates frog `i` through `set` for `seconds` from `start`, every frame,
 * and hands every `every`th pose to `look` with the rig posed.
 */
function play(i: number, set: Act, seconds: number, every: number, start: number, look: (m: FrogMoment) => void): void {
  const character = CAST[i].character
  const animate = animatorFor(character)
  const pose = restPose()
  const frames = Math.ceil(seconds * 60 - 1e-9)
  for (let f = 0; f < frames; f++) {
    const m = moment()
    m.time = start + f / 60
    m.clock = m.time
    set(m, f / 60)
    resetPose(pose)
    animate(m, pose)
    overlays(m, pose, character)
    if (f % every !== 0) continue
    applyPose(rigs[i], pose)
    rigs[i].group.updateMatrixWorld(true)
    look(m)
  }
}

/** Every skin vertex of frog `i` as posed, relative to its feet. */
function eachVertex(i: number, visit: (x: number, y: number, z: number) => void): void {
  const skin = skinOf(i)
  const count = skin.geometry.getAttribute('position').count
  for (let k = 0; k < count; k++) {
    skin.getVertexPosition(k, v).applyMatrix4(skin.matrixWorld)
    visit(v.x, v.y, v.z)
  }
}

function ringOf(r: number): number {
  for (let k = 0; k < RINGS.length; k++) if (r <= RINGS[k]) return k
  return -1
}

const postureOf = (mode: FrogMode): Posture => (mode === 'sit' ? 'sit' : mode === 'splash' ? 'splash' : 'air')

/** How far frog `i` reaches past its table right now, and where. */
function escape(i: number, m: FrogMoment, shape = emptyShape()): number {
  shapeOf(BODIES[i], postureOf(m.mode), m.tap, shape)
  let worst = -Infinity
  eachVertex(i, (x, y, z) => {
    const r = Math.hypot(x, z)
    const k = ringOf(r)
    worst = Math.max(worst, k < 0 ? r - RINGS[RINGS.length - 1] : Math.max(y - shape.top[k], shape.low[k] - y))
  })
  return worst
}

/** The lowest point of frog `i`'s skin right now, relative to its feet. */
function lowest(i: number): number {
  let low = Infinity
  eachVertex(i, (_x, y) => void (low = Math.min(low, y)))
  return low
}

/** How far out frog `i`'s skin reaches right now between two heights in the pond, with its feet at `feet`. */
function reachBetween(i: number, feet: number, low: number, high: number): number {
  let reach = 0
  eachVertex(i, (x, y, z) => {
    if (y + feet >= low && y + feet <= high) reach = Math.max(reach, Math.hypot(x, z))
  })
  return reach
}

describe('frog bodies', () => {
  it('rest on their bellies: a frog at rest reaches `seat` below its feet', () => {
    for (let i = 0; i < CAST.length; i++) {
      applyPose(rigs[i], restPose())
      rigs[i].group.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(skinOf(i), true)
      expect(box.min.y, CAST[i].character).toBeCloseTo(-BODIES[i].seat, 3)
      expect(BODIES[i].seat).toBeCloseTo(-REST_BOTTOM * CAST[i].scale, 4)
    }
  })

  it('never reach below the pad while sitting, singing, pressed, landing, tapped, or leaning aside', { timeout: 60_000 }, () => {
    for (let i = 0; i < CAST.length; i++) {
      let low = Infinity
      let where = ''
      for (const run of SITTING_RUNS) {
        play(i, run.act, run.seconds, Math.ceil(run.every / 2), run.start + 0.5, (m) => {
          const y = lowest(i)
          if (y < low) [low, where] = [y, `${run.label}, at ${m.time.toFixed(2)}s`]
        })
      }
      expect(low, `${CAST[i].character}: ${where}`).toBeGreaterThanOrEqual(-BODIES[i].seat - 1e-3)
    }
  })

  it('stay inside the room measured for them, whatever they are doing', { timeout: 60_000 }, () => {
    for (let i = 0; i < CAST.length; i++) {
      let worst = -Infinity
      let where = ''
      const shape = emptyShape()
      for (const run of RUNS) {
        play(i, run.act, run.seconds, run.every, run.start, (m) => {
          const out = escape(i, m, shape)
          if (out > worst) [worst, where] = [out, `${run.label}, at ${m.time.toFixed(2)}s`]
        })
      }
      expect(worst, `${CAST[i].character}: ${where}`).toBeLessThanOrEqual(SLACK)
    }
  })

  it('in the water, reach no farther than splashWater at any height a pad reaches', () => {
    for (let i = 0; i < CAST.length; i++) {
      let reach = 0
      play(i, SPLASHING, (FALL_LONGEST + SPLASH_SECONDS) * 2, 2, 0.2, (m) => {
        if (m.splash >= 0) reach = Math.max(reach, reachBetween(i, PAD_TOP + dunk(m.splash) + BODIES[i].seat, PAD_HEIGHTS.low, PAD_HEIGHTS.high))
      })
      expect(reach, CAST[i].character).toBeLessThanOrEqual(BODIES[i].splashWater)
    }
  })

  it.runIf(OUT)('measures every frame and writes the table', { timeout: 1_800_000 }, () => {
    const up = (x: number) => (Number.isFinite(x) ? (Math.ceil(x * 100) / 100).toFixed(2) : '_')
    const down = (x: number) => (Number.isFinite(x) ? (Math.floor(x * 1000) / 1000).toFixed(3) : '_')
    const row = (xs: number[], f: (x: number) => string) => `[${xs.map(f).join(', ')}]`
    type Room = { top: number[]; low: number[] }
    const fresh = (): Room => ({ top: RINGS.map(() => -Infinity), low: RINGS.map(() => Infinity) })
    const out: string[] = []
    for (let i = 0; i < CAST.length; i++) {
      // Lows go to the posture; tops too, except within a tap on a sitting frog, where they go to that step of the tap.
      const rooms: Record<Posture, Room> = { sit: fresh(), air: fresh(), splash: fresh() }
      const steps = Array.from({ length: TAP_STEPS }, fresh)
      let over = 0
      let water = 0
      for (const run of RUNS) {
        play(i, run.act, run.seconds, 1, run.start, (m) => {
          const posture = postureOf(m.mode)
          const room = rooms[posture]
          const step = posture === 'sit' && m.tap >= 0 && m.tap < TAP_STEP * TAP_STEPS ? steps[Math.floor(m.tap / TAP_STEP)] : room
          eachVertex(i, (x, y, z) => {
            const r = Math.hypot(x, z)
            const k = ringOf(r)
            if (k < 0) over = Math.max(over, r)
            else [step.top[k], room.low[k]] = [Math.max(step.top[k], y), Math.min(room.low[k], y)]
          })
          if (posture === 'splash' && m.splash >= 0) {
            water = Math.max(water, reachBetween(i, PAD_TOP + dunk(m.splash) + BODIES[i].seat, PAD_HEIGHTS.low, PAD_HEIGHTS.high))
          }
        })
      }
      const { sit: seated, air, splash } = rooms
      out.push(
        `  // ${CAST[i].character}: rest bottom ${(REST_BOTTOM * CAST[i].scale).toFixed(3)}, seated lowest ${Math.min(...seated.low).toFixed(3)}, farthest past the rings ${over.toFixed(2)}`,
        '  {',
        `    seat: ${(-REST_BOTTOM * CAST[i].scale).toFixed(4)},`,
        `    seated: ${row(seated.top, up)},`,
        `    seatedLow: ${row(seated.low, down)},`,
        '    tapped: [',
        ...steps.map((s) => `      ${row(s.top, up)},`),
        '    ],',
        `    air: ${row(air.top, up)},`,
        `    airLow: ${row(air.low, down)},`,
        `    splash: ${row(splash.top, up)},`,
        `    splashLow: ${row(splash.low, down)},`,
        `    splashWater: ${up(water)},`,
        '  },',
      )
    }
    writeFileSync(OUT!, out.join('\n') + '\n')
  })
})
