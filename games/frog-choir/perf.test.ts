import { describe, expect, it } from 'vitest'
import { PondController, silentSound, type Frog, type Projector } from './controller'
import { PADS } from './layout'
import { defaultPond } from './state'
import { CAST } from './view/frog'
import { animatorFor, overlays, resetPose, restPose, type Animator, type FrogMoment, type Pose } from './view/personalities'

// Frame-time budget for the CPU side of a frame that is the game's own:
// the pond (gestures, the loop, the firefly, guidance) and the five frogs'
// personalities. The busiest the pond gets is a child using every hand at
// once: one frog carried across the pads (a preview note at every pad it
// passes), another dropped in the water to splash and hop home, and the
// other three tapped over and over, all on the fastest tempo. On an iPad
// the GPU needs most of a 16 ms frame, so this must stay a small slice even
// on a CI runner. The budget is about ten times the measured cost: loose
// enough not to flake on a busy runner, tight enough to catch a search over
// every pad for every frog, or state rebuilt each frame. three.js and the GPU
// side are measured in the browser.

const FRAME = 1 / 60

const topDown: Projector = {
  toScreen: (x, _y, z, out) => {
    out.x = 1000 + x * 100
    out.y = 1000 + z * 100
    return out
  },
  toPlane: (sx, sy, _height, out) => {
    out.x = (sx - 1000) / 100
    out.y = (sy - 1000) / 100
    return out
  },
}

function screenOfPad(pad: number): { x: number; y: number } {
  return { x: 1000 + PADS[pad].x * 100, y: 1000 + PADS[pad].z * 100 }
}

type Slot = { moment: FrogMoment; pose: Pose; animate: Animator }
type Busy = { average: number; worst: number; carried: boolean; splashed: boolean; taps: number; previews: number }

/** The moment the view builds for each frog, from the same controller state. */
function fill(m: FrogMoment, pond: PondController, frog: Frog, scale: number): void {
  const t = pond.time
  m.time = t
  m.dt = FRAME
  m.clock = pond.clock
  m.beat = pond.beat
  m.mode = frog.mode
  m.sing = t - frog.sungAt
  m.singStrength = frog.singStrength
  m.press = t - frog.pressedAt
  m.tap = t - frog.tappedAt
  m.lift = t - frog.liftedAt
  m.land = t - frog.landedAt
  m.splash = t - frog.splashedAt
  m.hop = frog.mode === 'hop' ? Math.max(0, Math.min(1, (t - frog.hopStart) / frog.hopDuration)) : -1
  m.vx = frog.vx
  m.vz = frog.vz
  const f = pond.firefly
  m.gazeX = (f.x - frog.x) / scale
  m.gazeY = (f.y - frog.y - 1.05 * scale) / scale
  m.gazeZ = (f.z - frog.z) / scale
  m.fireNear = Math.max(0, 1 - Math.hypot(f.x - frog.x, f.z - frog.z) / 2.4)
  m.invite = pond.inviteFrog === frog.index ? pond.timing.invite : null
}

function busyCost(frames: number): Busy {
  let previews = 0
  const sound = { ...silentSound, preview: () => void previews++ }
  const pond = new PondController(defaultPond(), { save: () => {}, sound, childAge: 8 })
  pond.setProjector(topDown)
  pond.setRunning(true)
  const slots: Slot[] = CAST.map((spec) => ({ moment: emptyMoment(), pose: restPose(), animate: animatorFor(spec.character) }))
  const frame = () => {
    pond.step(FRAME)
    for (let index = 0; index < slots.length; index++) {
      const slot = slots[index]
      fill(slot.moment, pond, pond.frogs[index], CAST[index].scale)
      slot.animate(slot.moment, resetPose(slot.pose))
      overlays(slot.moment, slot.pose)
    }
  }
  for (let i = 0; i < 30; i++) frame()

  // Frog 1 is dragged off its pad and let go over open water.
  let ms = 0
  const dropped = screenOfPad(pond.state.frogs[1])
  pond.pointerDown(2, dropped.x, dropped.y, (ms += 10))
  for (let i = 1; i <= 12; i++) {
    pond.pointerMove(2, dropped.x + i * 8, dropped.y + i * 6)
    frame()
  }
  pond.pointerUp(2, dropped.x + 96, dropped.y + 72, (ms += 300))
  const splashed = pond.frogs[1].mode === 'splash'

  // Frog 0 is carried from pad to pad while frogs 2 to 4 are tapped in turn.
  const home = screenOfPad(pond.state.frogs[0])
  pond.pointerDown(1, home.x, home.y, (ms += 10))
  for (let i = 1; i <= 6; i++) {
    pond.pointerMove(1, home.x, home.y - i * 10)
    frame()
  }
  const tappedBefore = pond.frogs.map((frog) => frog.tappedAt)
  previews = 0
  let carried = true
  const times: number[] = []
  for (let i = 0; i < frames; i++) {
    const t0 = performance.now()
    const across = screenOfPad(Math.floor(((i % 120) / 120) * PADS.length))
    pond.pointerMove(1, across.x + Math.sin(i * 0.2) * 20, across.y - 20)
    if (i % 20 === 0) {
      const at = screenOfPad(pond.state.frogs[2 + ((i / 20) % 3)])
      pond.pointerDown(3, at.x, at.y, (ms += 10))
      pond.pointerUp(3, at.x, at.y, (ms += 80))
    }
    frame()
    times.push(performance.now() - t0)
    carried &&= pond.frogs[0].mode === 'held'
  }
  pond.pointerUp(1, home.x, home.y, (ms += 10))
  const taps = pond.frogs.filter((frog, index) => frog.tappedAt !== tappedBefore[index]).length
  return { average: times.reduce((a, b) => a + b, 0) / times.length, worst: Math.max(...times), carried, splashed, taps, previews }
}

function emptyMoment(): FrogMoment {
  return {
    time: 0,
    dt: FRAME,
    clock: 0,
    beat: 1,
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

describe('frame budget', () => {
  it('carrying, splashing, and tapping at once costs the pond and five frogs under 0.15 ms per frame on average', () => {
    busyCost(60)
    const runs = Array.from({ length: 5 }, () => busyCost(180))
    for (const run of runs) {
      expect([run.carried, run.splashed, run.taps]).toEqual([true, true, 3])
      expect(run.previews).toBeGreaterThanOrEqual(PADS.length)
    }
    const best = Math.min(...runs.map((run) => run.average))
    console.log(`busy pond: best average ${best.toFixed(3)} ms, worst frame ${Math.max(...runs.map((run) => run.worst)).toFixed(2)} ms`)
    expect(best).toBeLessThan(0.15)
  })
})
