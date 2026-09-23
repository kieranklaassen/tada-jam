import { describe, expect, it, vi } from 'vitest'
import { FeltAudio } from './audio'
import { BLUE, ORANGE, RED, YELLOW, type Hue } from './colors'
import { HELD_LIFT, MeadowController, POUCH_SEED_Y, REST_BEFORE_PACING, visitEveryFor, type Projector } from './controller'
import { BLOOM_AT, GROWN_AT } from './flowers'
import { IDLE_BEFORE_DEMO, MAX_DEMOS } from './guidance'
import { BURROW, groundY, onPouch, PLOT_RADIUS, plotAt, PLOTS, plotTop, POUCH, POUCH_SLOTS, SEED_RADIUS, STEM_HEIGHT } from './layout'
import { defaultMeadow, deserialize, type MeadowState } from './meadow'

// A tilted orthographic camera: 4 px per world unit, looking down the slope,
// so things higher up the hill (or in the air) sit higher on the screen.
const SCALE = 4
const TILT = 0.6
const projector: Projector = {
  project: (x, y, z, out) => {
    out.x = 600 + x * SCALE
    out.y = 400 + (z - y * TILT) * SCALE
    return out
  },
  ground: (px, py, lift, out) => {
    const x = (px - 600) / SCALE
    const v = (py - 400) / SCALE
    let z = v
    for (let i = 0; i < 12; i++) z = v + TILT * (groundY(x, z) + lift)
    out.x = x
    out.z = z
    return out
  },
  pixelsPerUnit: () => SCALE,
}

class Silent extends FeltAudio {
  override unlock(): void {}
}

const FRAME = 1 / 60

function screen(x: number, y: number, z: number) {
  return projector.project(x, y, z, { x: 0, y: 0 })
}

/** Where a finger goes so the seed it holds hangs over (x, z). */
function fingerOver(x: number, z: number) {
  return screen(x, groundY(x, z) + SEED_RADIUS + HELD_LIFT, z)
}

function makeMeadow(meadow: MeadowState = defaultMeadow(), childAge: number | null = 4) {
  const save = vi.fn()
  const controller = new MeadowController(meadow, { save, sound: new Silent(), childAge })
  controller.attach(projector)
  return { controller, save }
}

let clock = 0
function run(controller: MeadowController, seconds: number, until?: () => boolean) {
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    controller.update(FRAME)
    clock += 1000 * FRAME
    if (until?.()) return
  }
}

function drag(controller: MeadowController, from: { x: number; y: number }, to: { x: number; y: number }, id = 1, release = true) {
  controller.pointerDown(id, from.x, from.y, clock)
  for (let i = 1; i <= 12; i++) {
    controller.pointerMove(id, from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12)
    run(controller, FRAME)
  }
  run(controller, 0.4)
  if (release) controller.pointerUp(id, clock)
}

function tap(controller: MeadowController, at: { x: number; y: number }, id = 3) {
  controller.pointerDown(id, at.x, at.y, clock)
  run(controller, 0.08)
  controller.pointerUp(id, clock)
}

function pouchSeed(slot: number) {
  return screen(POUCH_SLOTS[slot].x, POUCH_SEED_Y, POUCH_SLOTS[slot].z)
}

function flowerHead(controller: MeadowController, plot: number) {
  const head = controller.flowers[plot].headAt({ x: 0, y: 0, z: 0 })
  return screen(head.x, head.y, head.z)
}

function grownMeadow(plots: (Hue | null)[]): MeadowState {
  return deserialize({ ...defaultMeadow(), plots })
}

describe('planting', () => {
  it('drags a pouch seed into a molehill; the meadow changes at once and the flower blooms in its colour', () => {
    const { controller, save } = makeMeadow()
    drag(controller, pouchSeed(0), fingerOver(PLOTS[0].x, PLOTS[0].z))
    expect(controller.meadow.plots).toEqual([RED, null, null])
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ plots: [RED, null, null], loose: [] }))
    run(controller, GROWN_AT + 1)
    expect(controller.flowers[0].phase).toBe('bloom')
    expect(controller.flowers[0].hue).toBe(RED)
  })

  it('pulls a seed dropped near an empty molehill into it', () => {
    const { controller } = makeMeadow()
    drag(controller, pouchSeed(2), fingerOver(PLOTS[2].x + PLOT_RADIUS + 4, PLOTS[2].z + 3))
    expect(controller.meadow.plots[2]).toBe(BLUE)
  })

  it('offers its seeds when the pouch is tapped: each pops up out of the mouth in turn and settles back', () => {
    const { controller } = makeMeadow()
    run(controller, 0.5)
    const rest = controller.slotSeed.map((seed) => seed!.y)
    tap(controller, screen(POUCH.x, groundY(POUCH.x, POUCH.z) + 2, POUCH.z + 5))
    const peak = [0, 0, 0]
    const peakAt = [-1, -1, -1]
    for (let i = 0; i < 60; i++) {
      run(controller, FRAME)
      controller.slotSeed.forEach((seed, slot) => {
        const lift = seed!.y - rest[slot]
        if (lift > peak[slot]) {
          peak[slot] = lift
          peakAt[slot] = i
        }
      })
    }
    for (const lift of peak) expect(lift).toBeGreaterThan(3)
    expect(peakAt[0]).toBeLessThan(peakAt[1])
    expect(peakAt[1]).toBeLessThan(peakAt[2])
    controller.slotSeed.forEach((seed, slot) => expect(Math.abs(seed!.y - rest[slot])).toBeLessThan(0.6))
    expect(controller.slotSeed.every((seed) => seed?.mode === 'pouch')).toBe(true)
  })

  it('refills the pouch after a seed is taken, so there is always one of each', () => {
    const { controller } = makeMeadow()
    drag(controller, pouchSeed(1), fingerOver(PLOTS[1].x, PLOTS[1].z))
    run(controller, 1.5)
    expect(controller.slotSeed.map((seed) => seed?.hue)).toEqual([RED, YELLOW, BLUE])
  })

  it('bounces a seed off a molehill that already has a flower, onto the grass', () => {
    const { controller } = makeMeadow(grownMeadow([RED, null, null]))
    drag(controller, pouchSeed(2), fingerOver(PLOTS[0].x + 1, PLOTS[0].z + 1))
    run(controller, 1)
    expect(controller.meadow.plots[0]).toBe(RED)
    expect(controller.meadow.loose.map((seed) => seed.hue)).toEqual([BLUE])
    const [seed] = controller.meadow.loose
    expect(plotAt(seed.x, seed.z, SEED_RADIUS)).toBe(-1)
  })

  it('sends a primary seed let go over the pouch back home, and lays a mixed one beside it', () => {
    const { controller } = makeMeadow()
    drag(controller, pouchSeed(0), fingerOver(40, 24))
    run(controller, 1)
    expect(controller.meadow.loose.map((seed) => seed.hue)).toEqual([RED])
    const [loose] = controller.meadow.loose
    drag(controller, screen(loose.x, groundY(loose.x, loose.z) + SEED_RADIUS, loose.z), fingerOver(POUCH.x, POUCH.z))
    run(controller, 1.5)
    expect(controller.meadow.loose).toEqual([])
  })
})

describe('picking', () => {
  it('pulls a flower back into its seed; a put-away mid-drag keeps the seed', () => {
    const { controller, save } = makeMeadow(grownMeadow([null, YELLOW, null]))
    run(controller, 0.5)
    const target = fingerOver(-15, 25)
    drag(controller, flowerHead(controller, 1), target, 1, false)
    expect(controller.meadow.plots[1]).toBeNull()
    const snapshot = controller.snapshot()
    expect(snapshot.loose.map((seed) => seed.hue)).toEqual([YELLOW])

    save.mockClear()
    controller.setRunning(false)
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ plots: [null, null, null], loose: [expect.objectContaining({ hue: YELLOW })] }))
  })

  it('lays the picked seed where it is let go, ready to plant again', () => {
    const { controller } = makeMeadow(grownMeadow([null, YELLOW, null]))
    run(controller, 0.5)
    drag(controller, flowerHead(controller, 1), fingerOver(-15, 25))
    run(controller, 1)
    expect(controller.meadow.loose.map((seed) => seed.hue)).toEqual([YELLOW])
    expect(controller.flowers[1].phase).toBe('empty')
    const [seed] = controller.meadow.loose
    drag(controller, screen(seed.x, groundY(seed.x, seed.z) + SEED_RADIUS, seed.z), fingerOver(PLOTS[1].x, PLOTS[1].z))
    expect(controller.meadow.plots[1]).toBe(YELLOW)
    expect(controller.meadow.loose).toEqual([])
  })

  it('treats a tap on a flower as a call to the bee, not a pick', () => {
    const { controller } = makeMeadow(grownMeadow([RED, null, null]), 7)
    run(controller, 0.5)
    tap(controller, flowerHead(controller, 0))
    expect(controller.meadow.plots[0]).toBe(RED)
    expect(['notice', 'approach']).toContain(controller.bee.mode)
  })
})

describe('the bee mixes colours', () => {
  it('after sipping two colours it carries a seed of the mix to the empty molehill', () => {
    const { controller } = makeMeadow(grownMeadow([RED, YELLOW, null]), 7)
    run(controller, 0.5)
    tap(controller, flowerHead(controller, 0))
    run(controller, 15, () => controller.meadow.pollen.includes(RED))
    expect(controller.meadow.pollen).toEqual([RED])
    tap(controller, flowerHead(controller, 1))
    run(controller, 15, () => controller.meadow.pollen.length === 2)
    expect(controller.meadow.pollen).toEqual([RED, YELLOW])
    expect(controller.snapshot().pollen).toEqual([RED, YELLOW])

    run(controller, 20, () => controller.meadow.loose.length > 0)
    expect(controller.meadow.pollen).toEqual([])
    const [seed] = controller.meadow.loose
    expect(seed.hue).toBe(ORANGE)
    expect(Math.hypot(seed.x - PLOTS[2].x, seed.z - PLOTS[2].z)).toBeLessThan(PLOT_RADIUS + 14)
    expect(plotAt(seed.x, seed.z, SEED_RADIUS)).toBe(-1)

    run(controller, 1)
    drag(controller, screen(seed.x, groundY(seed.x, seed.z) + SEED_RADIUS, seed.z), fingerOver(PLOTS[2].x, PLOTS[2].z))
    expect(controller.meadow.plots).toEqual([RED, YELLOW, ORANGE])
  })

  it('visits and mixes on its own in a full meadow left alone', () => {
    const { controller } = makeMeadow(grownMeadow([RED, YELLOW, BLUE]), 4)
    run(controller, 90, () => controller.meadow.loose.length > 0)
    expect(controller.meadow.loose).toHaveLength(1)
    expect([ORANGE, 5, 6]).toContain(controller.meadow.loose[0].hue)
  })

  it('leaves a new flower to the child until it has opened, then comes to see it', () => {
    for (const wait of [0.2, 0.7, 1.2, 1.7, 2.2, 2.7]) {
      const { controller } = makeMeadow(deserialize({ ...defaultMeadow(), plots: [RED, null, null], pollen: [RED] }), 4)
      run(controller, wait)
      drag(controller, pouchSeed(1), fingerOver(PLOTS[1].x, PLOTS[1].z))
      expect(controller.meadow.plots[1]).toBe(YELLOW)
      const flower = controller.flowers[1]
      let covered = false
      run(controller, 30, () => {
        const bee = controller.bee
        const opening = flower.isNew() && flower.age > BLOOM_AT
        if (opening && Math.hypot(bee.x - PLOTS[1].x, bee.z - PLOTS[1].z) < 10) covered = true
        return !flower.isNew() && bee.plot === 1 && bee.mode === 'sip'
      })
      expect(covered).toBe(false)
      expect(controller.bee.mode).toBe('sip')
      expect(controller.bee.plot).toBe(1)
    }
  })

  it('visits more often for younger children', () => {
    expect(visitEveryFor(4)).toBeLessThan(visitEveryFor(7))
    expect(visitEveryFor(null)).toBeGreaterThan(0)
  })
})

describe('guidance in the meadow', () => {
  it('invites to the pouch on first open, then glows and shows the felt hand', () => {
    const { controller } = makeMeadow()
    let invited = false
    let handSeen = false
    for (let i = 0; i < 60 * 9; i++) {
      controller.update(FRAME)
      if (controller.guide.invite >= 0) invited = true
      if (controller.hand.visible) handSeen = true
    }
    expect(invited).toBe(true)
    expect(handSeen).toBe(true)
    expect(controller.hint).toMatchObject({ kind: 'plantPouch' })
  })

  it('holds off while the bee answers a tapped flower, through the mix and the drop, then guides again', () => {
    const { controller } = makeMeadow(deserialize({ ...defaultMeadow(), plots: [RED, BLUE, null], pollen: [RED] }), 7)
    run(controller, 0.5)
    tap(controller, flowerHead(controller, 1))
    let quiet = true
    let frames = 0
    run(controller, 20, () => {
      frames++
      if (controller.guide.glow > 0 || controller.hand.visible) quiet = false
      return controller.meadow.loose.length > 0
    })
    expect(controller.meadow.loose).toHaveLength(1)
    expect(frames * FRAME).toBeGreaterThan(IDLE_BEFORE_DEMO)
    expect(quiet).toBe(true)
    run(controller, 8, () => controller.hand.visible)
    expect(controller.hand.visible).toBe(true)
  })

  it('backs off its demonstrations in a full meadow left alone, though the bee keeps mixing and dropping seeds', () => {
    const { controller } = makeMeadow(grownMeadow([RED, YELLOW, BLUE]))
    let demos = 0
    let playing = false
    let rested = false
    run(controller, 150, () => {
      const now = controller.guide.demo >= 0
      if (now && !playing) demos += 1
      playing = now
      if (controller.resting()) rested = true
      return false
    })
    expect(controller.meadow.loose.length).toBeGreaterThanOrEqual(2)
    expect(demos).toBe(MAX_DEMOS)
    expect(rested).toBe(true)
  })

  it('rests only in the long quiet between demonstrations, and wakes the moment a finger lands', () => {
    const { controller } = makeMeadow()
    let restedEarly = false
    run(controller, REST_BEFORE_PACING - 0.1, () => {
      if (controller.resting()) restedEarly = true
      return false
    })
    expect(restedEarly).toBe(false)
    run(controller, 30 - controller.guide.idle)
    expect(controller.resting()).toBe(true)
    run(controller, 20, () => controller.guide.beckon)
    expect(controller.guide.demo).toBe(-1)
    expect(controller.resting()).toBe(false)
    run(controller, 20, () => controller.guide.demo >= 0)
    expect(controller.resting()).toBe(false)
    run(controller, 20, () => controller.resting())
    expect(controller.resting()).toBe(true)
    controller.pointerDown(1, 20, 20, clock)
    expect(controller.resting()).toBe(false)
    controller.pointerUp(1, clock)
    run(controller, FRAME)
    expect(controller.resting()).toBe(false)
  })

  it('clears all guidance the moment a finger lands', () => {
    const { controller } = makeMeadow()
    run(controller, 6)
    expect(controller.guide.demo).toBeGreaterThanOrEqual(0)
    controller.pointerDown(1, 20, 20, clock)
    run(controller, FRAME)
    expect(controller.guide.demo).toBe(-1)
    expect(controller.guide.glow).toBe(0)
    expect(controller.hand.visible).toBe(false)
    controller.pointerUp(1, clock)
  })
})

describe('touching everything is safe', () => {
  it('taps on every creature and thing never change the meadow', () => {
    const { controller } = makeMeadow(grownMeadow([RED, null, BLUE]))
    run(controller, 1)
    const before = JSON.stringify(controller.snapshot())
    const spots = [
      screen(controller.bee.x, controller.bee.y, controller.bee.z),
      screen(controller.snail.x, groundY(controller.snail.x, controller.snail.z) + 2.5, controller.snail.z),
      screen(POUCH.x, groundY(POUCH.x, POUCH.z) + 6, POUCH.z),
      screen(PLOTS[1].x, plotTop(1) - 1, PLOTS[1].z),
      screen(0, groundY(0, 28), 28),
    ]
    for (const spot of spots) tap(controller, spot)
    expect(JSON.stringify(controller.snapshot())).toBe(before)
  })

  it('a tap on the burrow brings the mouse out to see, and changes nothing', () => {
    const { controller } = makeMeadow(grownMeadow([RED, null, BLUE]))
    run(controller, 0.5)
    expect(controller.mouse.visible()).toBe(false)
    const before = JSON.stringify(controller.snapshot())
    tap(controller, screen(BURROW.x, groundY(BURROW.x, BURROW.z), BURROW.z))
    run(controller, 1.5, () => controller.mouse.visible())
    expect(controller.mouse.visible()).toBe(true)
    expect(JSON.stringify(controller.snapshot())).toBe(before)
  })

  it('a resting hand (four fingers) cancels a drag and leaves the seed on the grass', () => {
    const { controller } = makeMeadow()
    drag(controller, pouchSeed(1), fingerOver(10, 22), 1, false)
    for (let id = 2; id <= 4; id++) controller.pointerDown(id, 100 + id * 30, 700, clock)
    run(controller, 1)
    for (let id = 1; id <= 4; id++) controller.pointerUp(id, clock)
    run(controller, 1)
    expect(controller.meadow.loose.map((seed) => seed.hue)).toEqual([YELLOW])
    expect(onPouch(controller.meadow.loose[0].x, controller.meadow.loose[0].z)).toBe(false)
  })

  it('keeps flower heads within reach of a small finger', () => {
    const { controller } = makeMeadow(grownMeadow([RED, RED, RED]))
    run(controller, 1)
    for (let plot = 0; plot < PLOTS.length; plot++) {
      const head = controller.flowers[plot].headAt({ x: 0, y: 0, z: 0 })
      expect(head.y - plotTop(plot)).toBeGreaterThan(STEM_HEIGHT * 0.7)
      expect(controller.hitTest(flowerHead(controller, plot).x, flowerHead(controller, plot).y)).toEqual({ kind: 'flower', plot })
    }
  })
})

describe('sound', () => {
  it('unlocks audio on the lift of a touch too, the event that counts as a gesture for audio on a tablet', () => {
    const sound = new Silent()
    const unlock = vi.spyOn(sound, 'unlock')
    const controller = new MeadowController(defaultMeadow(), { save: vi.fn(), sound, childAge: 4 })
    controller.attach(projector)
    controller.pointerDown(1, 600, 500, clock)
    expect(unlock).toHaveBeenCalledTimes(1)
    controller.pointerUp(1, clock)
    expect(unlock).toHaveBeenCalledTimes(2)
  })
})

describe('frame budget', () => {
  it('lets a held seed come to rest under a still finger at 20 fps, the longest step a frame takes', () => {
    const { controller } = makeMeadow()
    const from = pouchSeed(0)
    const to = fingerOver(-10, 24)
    controller.pointerDown(1, from.x, from.y, clock)
    controller.pointerMove(1, to.x, to.y)
    const seed = controller.seeds.find((body) => body.mode === 'held')
    expect(seed).toBeDefined()
    let speed = 0
    for (let i = 0; i < 40; i++) {
      controller.update(0.05)
      if (i >= 30 && seed) speed = Math.max(speed, Math.hypot(seed.vx, seed.vy, seed.vz))
    }
    expect(speed).toBeLessThan(0.5)
  })

  it('a busy meadow costs the controller well under a millisecond per frame', () => {
    const { controller } = makeMeadow(grownMeadow([RED, YELLOW, BLUE]))
    run(controller, 2)
    drag(controller, pouchSeed(0), fingerOver(-10, 24), 1, false)
    const times: number[] = []
    for (let i = 0; i < 600; i++) {
      controller.pointerMove(1, 500 + Math.sin(i * 0.1) * 80, 480)
      const start = performance.now()
      controller.update(FRAME)
      times.push(performance.now() - start)
    }
    times.sort((a, b) => a - b)
    const p50 = times[300]
    console.log(`controller: p50 ${p50.toFixed(3)} ms, p95 ${times[570].toFixed(3)} ms`)
    expect(p50).toBeLessThan(0.3)
  })
})
