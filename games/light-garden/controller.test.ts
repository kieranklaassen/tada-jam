import { describe, expect, it, vi } from 'vitest'
import { GardenController, type Projector } from './controller'
import { isAwake } from './creatures'
import { KNOB, slotPoint, TURN_STEP, type Point } from './layout'
import { defaultGarden, deserialize, type GardenState } from './state'

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
const px = (at: Point): Point => ({ x: at.x * PX, y: at.y * PX })

function makeGarden(age: number | null = 7) {
  const save = vi.fn<(state: GardenState) => void>()
  const garden = new GardenController(defaultGarden(age), { save })
  garden.setProjector(topDown)
  return { garden, save }
}

const run = (garden: GardenController, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) garden.step(1 / 60)
}

let clock = 0
const tap = (garden: GardenController, at: Point) => {
  garden.pointerDown(1, px(at), (clock += 10))
  garden.pointerUp(1, px(at), (clock += 80))
}
const drag = (garden: GardenController, from: Point, to: Point, lift = true) => {
  garden.pointerDown(2, px(from), (clock += 10))
  for (let i = 1; i <= 12; i++) {
    garden.pointerMove(2, px({ x: from.x + ((to.x - from.x) * i) / 12, y: from.y + ((to.y - from.y) * i) / 12 }))
    garden.step(1 / 60)
  }
  run(garden, 0.4)
  if (lift) garden.pointerUp(2, px(to), (clock += 300))
}

const piece = (garden: GardenController, id: string) => garden.pieces.find((p) => p.spec.id === id)!

describe('GardenController', () => {
  it('a tap turns a piece one step and saves the new angle', () => {
    const { garden, save } = makeGarden()
    const lamp = piece(garden, 'lampA')
    tap(garden, lamp.pose)
    expect(lamp.pose.angle).toBeCloseTo(TURN_STEP)
    const saved = save.mock.lastCall![0]
    expect(saved.pieces.find((p) => p.id === 'lampA')!.angle).toBeCloseTo(TURN_STEP, 2)
  })

  it('at seven, the first beam misses everyone and one tap of the lamp wakes the moth', () => {
    const { garden } = makeGarden(7)
    run(garden, 2)
    expect(garden.creatures.some((c) => isAwake(c.c))).toBe(false)
    tap(garden, piece(garden, 'lampA').pose)
    run(garden, 2)
    const moth = garden.creatures.find((c) => c.c.kind === 'moth')!
    expect(isAwake(moth.c)).toBe(true)
    expect(garden.creatures.filter((c) => isAwake(c.c))).toHaveLength(1)
  })

  it('drags a mirror out of the tray onto the panel, where it stays', () => {
    const { garden, save } = makeGarden()
    const mirror = piece(garden, 'mirror1')
    drag(garden, slotPoint(mirror.spec.slot), { x: 10, y: -8 })
    run(garden, 1)
    expect(mirror.pose.inTray).toBe(false)
    expect(Math.hypot(mirror.pose.x - 10, mirror.pose.y + 11)).toBeLessThan(3)
    expect(save.mock.lastCall![0].pieces.find((p) => p.id === 'mirror1')!.inTray).toBe(false)
  })

  it('dropping a piece over the tray sends it home to its own slot', () => {
    const { garden } = makeGarden()
    const lamp = piece(garden, 'lampA')
    drag(garden, lamp.pose, { x: 0, y: 49 })
    run(garden, 1)
    expect(lamp.pose.inTray).toBe(true)
    const slot = slotPoint(lamp.spec.slot)
    expect(lamp.x).toBeCloseTo(slot.x)
    expect(lamp.y).toBeCloseTo(slot.y)
    expect(garden.beams.count).toBe(0)
  })

  it('the knob turns a piece freely, snapping near each step', () => {
    const { garden } = makeGarden()
    const lamp = piece(garden, 'lampA')
    const knob = garden.knobPoint(lamp)
    expect(knob.x).toBeCloseTo(lamp.x - KNOB.lamp.distance)
    // Swing the knob a quarter turn round the lamp (knob behind, so the lamp turns the same way).
    const target = { x: lamp.x + Math.cos(Math.PI * 1.5) * KNOB.lamp.distance, y: lamp.y + Math.sin(Math.PI * 1.5) * KNOB.lamp.distance }
    drag(garden, knob, target)
    expect(lamp.pose.angle).toBeCloseTo(Math.PI / 2, 1)
    expect(lamp.pose.inTray).toBe(false)
    expect(lamp.pose.x).toBe(-46)
  })

  it('putting the garden away mid-drag drops the piece where it is and saves', () => {
    const { garden, save } = makeGarden()
    const mirror = piece(garden, 'mirror2')
    drag(garden, slotPoint(mirror.spec.slot), { x: -10, y: 0 }, false)
    expect(mirror.heldBy).not.toBeNull()
    save.mockClear()
    garden.setRunning(false)
    expect(mirror.heldBy).toBeNull()
    expect(mirror.pose.inTray).toBe(false)
    expect(save).toHaveBeenCalled()
    garden.pointerUp(2, px({ x: 30, y: 30 }), (clock += 50))
    expect(mirror.pose.x).toBeLessThan(0)
  })

  it('a carried creature sleeps where it is set down, and the new bed is saved', () => {
    const { garden, save } = makeGarden()
    const fish = garden.creatures.find((c) => c.c.kind === 'fish')!
    drag(garden, { x: fish.x, y: fish.y }, { x: 20, y: 0 })
    run(garden, 0.5)
    expect(Math.hypot(fish.c.bed.x - 20, fish.c.bed.y - 0)).toBeLessThan(8)
    const saved = deserialize(save.mock.lastCall![0], 7)
    expect(saved.beds[fish.c.index].x).toBeCloseTo(fish.c.bed.x, 0)
  })

  it('a hand resting on the glass cancels every gesture', () => {
    const { garden } = makeGarden()
    const lamp = piece(garden, 'lampA')
    const before = lamp.pose.angle
    for (let id = 1; id <= 4; id++) garden.pointerDown(id, px({ x: -46, y: 2 }), (clock += 5))
    for (let id = 1; id <= 4; id++) garden.pointerUp(id, px({ x: -46, y: 2 }), (clock += 5))
    expect(lamp.pose.angle).toBe(before)
  })

  it('idle guidance shows a ghost hand, and a touch clears it at once', () => {
    const { garden } = makeGarden()
    run(garden, 7)
    expect(garden.guide.hint?.kind).toBe('tapLamp')
    expect(garden.guide.handVisible).toBe(true)
    tap(garden, { x: 0, y: 0 })
    garden.step(1 / 60)
    expect(garden.guide.handVisible).toBe(false)
  })

  it('never lets a trace outgrow its buffers, whatever the arrangement', () => {
    const { garden } = makeGarden()
    for (const p of garden.pieces) {
      p.pose.inTray = false
      p.pose.x = -40 + garden.pieces.indexOf(p) * 11
      p.pose.y = (garden.pieces.indexOf(p) % 2) * 20 - 10
    }
    for (let i = 0; i < 64; i++) {
      for (const p of garden.pieces) p.pose.angle += 0.37
      run(garden, 0.1)
      expect(garden.beams.count).toBeLessThanOrEqual(96)
    }
  })
})
