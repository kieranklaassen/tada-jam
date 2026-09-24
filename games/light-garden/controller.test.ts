import { describe, expect, it, vi } from 'vitest'
import { CREATURE_BODY, KNOB_BODY, PIECE_BODY } from './bodies'
import { GardenController, pieceHeight, type PieceSim, type Projector, type Sound } from './controller'
import { isAwake } from './creatures'
import { KNOB, onPanel, slotPoint, TURN_STEP, type CreatureKind, type Point } from './layout'
import { lightAt } from './optics'
import { REST_BEFORE_PACING } from './tiers'
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

/** Carry whatever is under `from` through each point in turn, a frame at a time, and let go; `watch` sees every frame. */
const carry = (garden: GardenController, from: Point, through: Point[], watch: () => void) => {
  garden.pointerDown(3, px(from), (clock += 10))
  let last = from
  for (const point of through) {
    for (let i = 1; i <= 30; i++) {
      garden.pointerMove(3, px({ x: last.x + ((point.x - last.x) * i) / 30, y: last.y + ((point.y - last.y) * i) / 30 }))
      garden.step(1 / 60)
      watch()
    }
    last = point
  }
  garden.pointerUp(3, px(last), (clock += 600))
  for (let f = 0; f < 90; f++) {
    garden.step(1 / 60)
    watch()
  }
}

/** Where something carried or flying home passes through something resting this frame: their glass shares room and height. */
function throughs(garden: GardenController): string[] {
  const things = [
    ...garden.pieces.map((p) => {
      const body = PIECE_BODY[p.spec.kind]
      return { name: p.spec.id, x: p.x, y: p.y, reach: body.reach, bottom: pieceHeight(p), top: pieceHeight(p) + body.top, moving: p.heldBy !== null || p.flying > 0 }
    }),
    ...garden.creatures.map((c) => {
      const body = CREATURE_BODY[c.c.kind]
      return { name: c.c.kind, x: c.x, y: c.y, reach: body.reach, bottom: c.alt - c.ground, top: c.alt + body.top, moving: c.heldBy !== null }
    }),
  ]
  const found: string[] = []
  for (const a of things) {
    if (!a.moving) continue
    for (const b of things) {
      if (b.moving || Math.hypot(a.x - b.x, a.y - b.y) >= a.reach + b.reach || a.bottom >= b.top) continue
      found.push(`${a.name} through ${b.name} at ${garden.t.toFixed(2)}s`)
    }
  }
  return found
}

/** How near a knob (arm and bead) comes to a point on the table. */
function knobGap(garden: GardenController, p: PieceSim, at: Point): number {
  const knob = garden.knobPoint(p)
  const dx = knob.x - p.x
  const dy = knob.y - p.y
  const k = Math.max(0, Math.min(1, ((at.x - p.x) * dx + (at.y - p.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(at.x - (p.x + dx * k), at.y - (p.y + dy * k)) - KNOB_BODY.bead
}

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

  it('an awake creature flies round a sleeping one instead of through it', () => {
    const { garden } = makeGarden(7)
    tap(garden, piece(garden, 'lampA').pose)
    run(garden, 3)
    const moth = garden.creatures.find((c) => c.c.kind === 'moth')!
    const snail = garden.creatures.find((c) => c.c.kind === 'snail')!
    expect(isAwake(moth.c)).toBe(true)
    // Right beside its bed, on the open side (towards the middle of the panel).
    snail.c.bed.x = moth.c.bed.x + 2
    snail.c.bed.y = moth.c.bed.y - 4
    run(garden, 1.5)
    // Without the sidestep its loops pass within a centimetre of the snail; with it, it only brushes by as it dodges.
    let closest = Infinity
    let near = 0
    const frames = 8 * 60
    for (let f = 0; f < frames; f++) {
      garden.step(1 / 60)
      const distance = Math.hypot(moth.x - snail.x, moth.y - snail.y)
      closest = Math.min(closest, distance)
      if (distance < 11) near++
    }
    expect(isAwake(snail.c)).toBe(false)
    expect(Math.hypot(snail.x - snail.c.bed.x, snail.y - snail.c.bed.y)).toBeLessThan(0.01)
    expect(closest).toBeGreaterThan(7)
    expect(near / frames).toBeLessThan(0.1)
  })

  it('a hand resting on the glass cancels every gesture', () => {
    const { garden } = makeGarden()
    const lamp = piece(garden, 'lampA')
    const before = lamp.pose.angle
    for (let id = 1; id <= 4; id++) garden.pointerDown(id, px({ x: -46, y: 2 }), (clock += 5))
    for (let id = 1; id <= 4; id++) garden.pointerUp(id, px({ x: -46, y: 2 }), (clock += 5))
    expect(lamp.pose.angle).toBe(before)
  })

  it('one sleeper is the want from the first frame; it passes on when that one wakes', () => {
    const { garden } = makeGarden(7)
    const moth = garden.creatures.find((c) => c.c.kind === 'moth')!
    expect(garden.wantIndex).toBe(moth.c.index)
    expect(moth.carry.want).toBe(1)
    run(garden, 7)
    expect(garden.guide.hint?.sleeper).toBe(moth.c.index)
    tap(garden, piece(garden, 'lampA').pose)
    run(garden, 3)
    expect(isAwake(moth.c)).toBe(true)
    expect(garden.wantIndex).not.toBe(moth.c.index)
    const next = garden.creatures[garden.wantIndex]
    expect(next.c.phase).toBe('asleep')
    expect(next.carry.want).toBeGreaterThan(0.9)
    expect(moth.carry.want).toBeLessThan(0.1)
  })

  it('a ghost tap swings the lamp part of a step and back, without turning it', () => {
    const { garden } = makeGarden(7)
    const lamp = piece(garden, 'lampA')
    let swing = 0
    for (let t = 0; t < 11; t += 1 / 60) {
      garden.step(1 / 60)
      if (garden.guide.hint?.kind === 'tapLamp') swing = Math.max(swing, lamp.wobble.x)
    }
    expect(swing).toBeGreaterThan(0.12)
    expect(swing).toBeLessThan(TURN_STEP * 0.6)
    expect(lamp.pose.angle).toBe(0)
    expect(Math.abs(lamp.wobble.x)).toBeLessThan(0.01)
    expect(garden.creatures.some((c) => isAwake(c.c))).toBe(false)
  })

  it('once colours fan out, the ghost hand carries a sleeper into its own colour', () => {
    const state = defaultGarden(7)
    Object.assign(state.pieces.find((p) => p.id === 'lampA')!, { angle: TURN_STEP })
    Object.assign(state.pieces.find((p) => p.id === 'prism')!, { x: -24, y: 11, angle: -Math.PI / 2 + TURN_STEP, inTray: false })
    const garden = new GardenController(state, { save: () => {} })
    garden.setProjector(topDown)
    const moth = garden.creatures.find((c) => c.c.kind === 'moth')!
    moth.c.phase = 'awake'
    run(garden, 0.5)
    const summary = garden.summary()
    expect(summary.spots.length).toBeGreaterThan(0)
    for (const spot of summary.spots) {
      const sleeper = garden.creatures[spot.index]
      expect(lightAt(garden.beams, spot.x, spot.y, sleeper.c.radius)).toBe(sleeper.c.wants)
    }
    run(garden, 6)
    const hint = garden.guide.hint!
    expect(hint.kind).toBe('carrySleeper')
    expect(hint.sleeper).toBe(garden.wantIndex)
    expect(summary.spots.map((s) => s.index)).toContain(hint.sleeper)
  })

  it('a poke gets the creature its own answer and voice, a different one each time, and never wakes it', () => {
    const poke = vi.fn<(kind: CreatureKind, variant: number) => void>()
    const creature = vi.fn<Sound['creature']>()
    const quiet = () => {}
    const sound: Sound = { unlock: quiet, setActive: quiet, dispose: quiet, pick: quiet, drop: quiet, turn: quiet, tick: quiet, home: quiet, ripple: quiet, creature, poke, garden: quiet }
    const garden = new GardenController(defaultGarden(7), { save: () => {}, sound })
    garden.setProjector(topDown)
    const snail = garden.creatures.find((c) => c.c.kind === 'snail')!
    for (let i = 0; i < 3; i++) {
      tap(garden, { x: snail.x, y: snail.y })
      run(garden, 0.4)
    }
    expect(poke.mock.calls).toEqual([
      ['snail', 0],
      ['snail', 1],
      ['snail', 0],
    ])
    expect(creature).not.toHaveBeenCalled()
    expect(snail.c.phase).toBe('asleep')
    expect(snail.c.stirAt).toBe(-Infinity)
  })

  it('rests only while nothing happens: no demonstration, nothing held, nobody waking', () => {
    const { garden } = makeGarden()
    tap(garden, { x: 0, y: -10 })
    let longest = 0
    for (let t = 0; t < 60; t += 1 / 60) {
      garden.step(1 / 60)
      const resting = garden.restingFor()
      if (garden.guide.handVisible) expect(resting).toBe(0)
      longest = Math.max(longest, resting)
    }
    expect(longest).toBeGreaterThan(REST_BEFORE_PACING)
    const lamp = piece(garden, 'lampA')
    drag(garden, lamp.pose, { x: -30, y: 0 }, false)
    run(garden, REST_BEFORE_PACING + 2)
    expect(garden.restingFor()).toBe(0)
    garden.pointerUp(2, px({ x: -30, y: 0 }), (clock += 80))
    garden.step(1 / 60)
    expect(garden.restingFor()).toBeLessThan(0.1)
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

  it('a carried piece floats over the lamp and the sleepers it passes, and flies home over the tray', () => {
    const { garden } = makeGarden(7)
    const mirror = piece(garden, 'mirror1')
    const filter = piece(garden, 'filterB')
    const jelly = garden.creatures.find((c) => c.c.kind === 'jelly')!
    const found: string[] = []
    let overLamp = 0
    let overJelly = 0
    carry(garden, slotPoint(mirror.spec.slot), [{ x: -46, y: 2 }, { x: -40, y: -8 }], () => {
      found.push(...throughs(garden))
      overLamp = Math.max(overLamp, pieceHeight(mirror))
    })
    carry(garden, slotPoint(filter.spec.slot), [{ x: jelly.x, y: jelly.y }, { x: 40, y: -18 }, { x: 20, y: -24 }], () => {
      found.push(...throughs(garden))
      overJelly = Math.max(overJelly, pieceHeight(filter))
    })
    // Let go short of the tray, so it flies home across the prism's slot.
    carry(garden, mirror.pose, [{ x: -32, y: 40 }], () => found.push(...throughs(garden)))
    expect(found.slice(0, 3)).toEqual([])
    expect(overLamp).toBeGreaterThan(PIECE_BODY.lamp.top)
    expect(overJelly).toBeGreaterThan(CREATURE_BODY.jelly.top)
    expect(mirror.pose.inTray).toBe(true)
    expect(filter.pose.inTray).toBe(false)
  })

  it('a carried creature floats over the pieces it passes, and none ever dips under the panel', () => {
    const state = defaultGarden(7)
    Object.assign(state.pieces.find((p) => p.id === 'mirror1')!, { x: -40, y: -6, angle: Math.PI, inTray: false })
    const garden = new GardenController(state, { save: () => {} })
    garden.setProjector(topDown)
    const snail = garden.creatures.find((c) => c.c.kind === 'snail')!
    const found: string[] = []
    let lowest = Infinity
    let over = 0
    carry(garden, { x: snail.x, y: snail.y }, [{ x: -38, y: -8 }, { x: -46, y: 2 }, { x: -28, y: -18 }], () => {
      found.push(...throughs(garden))
      for (const c of garden.creatures) lowest = Math.min(lowest, c.alt - c.ground)
      over = Math.max(over, snail.alt - snail.ground)
    })
    expect(found.slice(0, 3)).toEqual([])
    expect(lowest).toBeGreaterThan(-1e-9)
    expect(over).toBeGreaterThan(PIECE_BODY.lamp.top)
  })

  it('a lamp at the edge slides in to keep its knob on the panel, however it is turned', () => {
    const saved = defaultGarden(7)
    Object.assign(saved.pieces.find((p) => p.id === 'lampB')!, { x: -58, y: -20, angle: 0, inTray: false })
    const loaded = new GardenController(saved, { save: () => {} })
    expect(onPanel(loaded.knobPoint(piece(loaded, 'lampB')), KNOB_BODY.bead)).toBe(true)

    const { garden } = makeGarden(7)
    const lamp = piece(garden, 'lampB')
    const knobOnPanel = () => onPanel(garden.knobPoint(lamp), KNOB_BODY.bead)
    drag(garden, slotPoint(lamp.spec.slot), { x: -58, y: -20 })
    run(garden, 0.5)
    expect(lamp.pose.inTray).toBe(false)
    expect(knobOnPanel()).toBe(true)
    for (let i = 0; i < 2; i++) {
      tap(garden, lamp.pose)
      run(garden, 0.6)
      expect(knobOnPanel()).toBe(true)
    }
    // Round and round by the knob, a whole turn in two seconds, right at the edge.
    garden.pointerDown(4, px(garden.knobPoint(lamp)), (clock += 10))
    let off = 0
    for (let f = 1; f <= 120; f++) {
      const a = Math.PI * 1.25 + (f / 120) * Math.PI * 2
      garden.pointerMove(4, px({ x: lamp.x + Math.cos(a) * KNOB.lamp.distance, y: lamp.y + Math.sin(a) * KNOB.lamp.distance }))
      garden.step(1 / 60)
      if (!knobOnPanel()) off++
    }
    garden.pointerUp(4, px(garden.knobPoint(lamp)), (clock += 2000))
    expect(off).toBe(0)
  })

  it('a knob swung into a neighbour pushes its own piece clear instead of passing through', () => {
    const state = defaultGarden(7)
    Object.assign(state.pieces.find((p) => p.id === 'mirror1')!, { x: -46, y: -12, angle: Math.PI, inTray: false })
    const garden = new GardenController(state, { save: () => {} })
    garden.setProjector(topDown)
    const lamp = piece(garden, 'lampA')
    const mirror = piece(garden, 'mirror1')
    expect(mirror.pose).toMatchObject({ x: -46, y: -12 })
    // Swing the lamp's knob round until it points straight at the mirror.
    drag(garden, garden.knobPoint(lamp), { x: lamp.x, y: lamp.y - KNOB.lamp.distance })
    run(garden, 0.5)
    expect(Math.hypot(lamp.pose.x + 46, lamp.pose.y - 2)).toBeGreaterThan(1)
    expect(knobGap(garden, lamp, mirror.pose)).toBeGreaterThan(mirror.spec.radius + 0.5 - 1e-6)
    expect(Math.hypot(lamp.pose.x - mirror.pose.x, lamp.pose.y - mirror.pose.y)).toBeGreaterThan(lamp.spec.radius + mirror.spec.radius + 1.5 - 1e-6)
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
