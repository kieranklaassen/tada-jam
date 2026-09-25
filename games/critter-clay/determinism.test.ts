import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkshopController, type Projector } from './controller'
import { traySlot } from './layout'
import type { PartKind } from './parts'
import { defaultWorkshop, serialize, type WorkshopState } from './state'

// The workshop plays the same from the same frames and touches, whatever else
// draws on Math.random (the sounds, three.js, a test page's seeded stream) and
// however far the wall clock runs on while a busy machine draws a frame. The
// intersection audit and a recorded walkthrough both rely on it: the audit
// puts its taps on the same frames every run, and this keeps what the
// critters do on those frames the same.

const PX = 10
const topDown: Projector = {
  toScreen(x, _y, z, out) {
    out.x = x * PX + 600
    out.y = z * PX + 400
    return true
  },
  toPlane(screen, _height, out) {
    out.x = (screen.x - 600) / PX
    out.z = (screen.y - 400) / PX
    return true
  },
  scaleAt: () => PX,
}

/** Playwright's paused clock runs animation frames on a 16 ms grid; the audit moves the finger every 33 ms. */
const FRAME = 0.016
const MOVE = 0.033

const screenOf = (x: number, z: number) => ({ x: x * PX + 600, y: z * PX + 400 })

class Player {
  private ms = 0
  private finger = 1
  constructor(readonly workshop: WorkshopController) {}

  play(seconds: number): void {
    const frames = Math.round(seconds / FRAME)
    for (let i = 0; i < frames; i++) {
      this.workshop.step(FRAME)
      this.ms += FRAME * 1000
    }
  }

  drag(from: () => { x: number; y: number }, to: () => { x: number; y: number }, seconds: number): void {
    const id = this.finger++
    const start = from()
    this.workshop.pointerDown(id, start, this.ms)
    this.play(MOVE * 2)
    const moves = Math.max(1, Math.round(seconds / MOVE))
    for (let i = 1; i <= moves; i++) {
      const target = to()
      this.workshop.pointerMove(id, { x: start.x + ((target.x - start.x) * i) / moves, y: start.y + ((target.y - start.y) * i) / moves }, this.ms)
      this.play(MOVE)
    }
    this.play(MOVE * 3)
    this.workshop.pointerUp(id, to(), this.ms)
    this.play(MOVE)
  }

  tap(at: () => { x: number; y: number }): void {
    const id = this.finger++
    this.workshop.pointerDown(id, at(), this.ms)
    this.play(MOVE * 2)
    this.workshop.pointerUp(id, at(), this.ms)
    this.play(MOVE)
  }
}

function makePlayer(state: WorkshopState): Player {
  const workshop = new WorkshopController(state, { save: () => {}, childAge: 4 })
  workshop.setProjector(topDown)
  return new Player(workshop)
}

function give(player: Player, kind: PartKind) {
  const slot = traySlot(kind)
  const body = () => {
    const sleeper = player.workshop.sleeper!
    return screenOf(sleeper.world.body[0], sleeper.world.body[2])
  }
  player.drag(() => screenOf(slot.x, slot.z), body, 0.5)
}

/** Where every critter stands, how it faces, what it is doing and wearing, and what the bench keeps. */
function snapshot(workshop: WorkshopController) {
  const state = serialize(workshop.state)
  return {
    t: workshop.t,
    critters: workshop.critters.map((c) => ({
      id: c.save.id,
      mode: c.mode,
      awake: c.awake,
      at: [c.mover.x, c.mover.z, c.mover.heading],
      body: Array.from(c.world.body),
      parts: Array.from(c.world.parts.slice(0, c.save.parts.length * 3)),
    })),
    sleeper: state.sleeper && { id: state.sleeper.id, parts: state.sleeper.parts },
    awake: state.awake.map((c) => ({ id: c.id, parts: c.parts })),
    tray: state.tray,
  }
}

const part = (kind: PartKind, hue: number) => ({ kind, hue })

/** Three awake critters built differently and a sleeper, as the audit's busy bench. */
function busyBench(): WorkshopState {
  const state = defaultWorkshop()
  state.awake = [
    { id: 1, hue: 0, parts: [...Array.from({ length: 6 }, () => part('legStub', 1)), part('eye', 2), part('eye', 2), part('earPoint', 1)], x: -32, z: 10, heading: 0.6, seed: 17 },
    { id: 2, hue: 2, parts: [part('legLong', 0), part('legLong', 0), part('tailCurl', 1), part('earFlop', 1), part('earFlop', 1), part('eye', 0)], x: 8, z: 12, heading: -1.2, seed: 29 },
    { id: 3, hue: 1, parts: [part('legLong', 2), part('legLong', 2), part('legLong', 2), part('legLong', 2), part('head', 0), part('horn', 2), part('tailLong', 0), part('eye', 2)], x: -36, z: -14, heading: 2.2, seed: 43 },
  ] as WorkshopState['awake']
  return state
}

/** The audit's opening: the idle demonstration, the lump dressed fast, woken, and walking; then a busy bench, carried and dropped. */
function story() {
  const first = makePlayer(defaultWorkshop())
  first.play(8.8)
  for (const kind of ['legStub', 'eye', 'legLong', 'horn'] as PartKind[]) give(first, kind)
  first.play(0.9)
  const dressed = snapshot(first.workshop)
  first.tap(() => {
    const nose = first.workshop.sleeper!.world.nose
    return screenOf(nose[0], nose[2])
  })
  first.play(5.2)
  const walked = snapshot(first.workshop)

  const bench = makePlayer(busyBench())
  bench.play(3.5)
  const body = (id: number) => () => {
    const c = bench.workshop.critters.find((one) => one.save.id === id)!
    return screenOf(c.world.body[0], c.world.body[2])
  }
  bench.drag(body(3), () => screenOf(-10, 20), 0.7)
  bench.play(1.4)
  bench.drag(body(1), () => screenOf(-40, 5), 0.6)
  bench.play(3)
  return { dressed, walked, bench: snapshot(bench.workshop) }
}

describe('the workshop plays the same whatever else happens on the machine', () => {
  afterEach(() => vi.restoreAllMocks())

  const reference = story()

  it('plays the audit opening: the lump dressed and woken, walking, and a busy bench carried about', () => {
    expect(reference.dressed.sleeper?.parts.length).toBeGreaterThanOrEqual(3)
    const woken = reference.walked.critters.find((c) => c.id === reference.dressed.sleeper?.id)
    expect(woken?.awake).toBe(true)
    expect(reference.bench.critters.filter((c) => c.awake)).toHaveLength(3)
    expect(reference.bench.critters.some((c) => c.mode === 'walking')).toBe(true)
  })

  it('whatever Math.random returns', () => {
    let s = 7
    vi.spyOn(Math, 'random').mockImplementation(() => (s = (s * 16807) % 2147483647) / 2147483647)
    expect(story()).toEqual(reference)
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    expect(story()).toEqual(reference)
  })

  it('however far the wall clock runs while a frame is drawn', () => {
    let now = 5e6
    vi.spyOn(performance, 'now').mockImplementation(() => (now += 37))
    expect(story()).toEqual(reference)
  })
})
