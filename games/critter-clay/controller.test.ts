import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { WorkshopController, type Projector } from './controller'
import { IDLE_BEFORE_DEMO } from './guidance'
import { insideWalk, TRAY, traySlot, TURNTABLE } from './layout'
import type { PartKind } from './parts'
import { defaultWorkshop, deserialize, MAX_AWAKE, type WorkshopState } from './state'

// A straight-down "camera": ten screen pixels per bench unit, height ignored.
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

const screenOf = (x: number, z: number) => ({ x: x * PX + 600, y: z * PX + 400 })

function makeWorkshop(state: WorkshopState = defaultWorkshop(), childAge: number | null = 4) {
  const save = vi.fn()
  const workshop = new WorkshopController(state, { save, childAge })
  workshop.setProjector(topDown)
  return { workshop, save }
}

const run = (workshop: WorkshopController, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) workshop.step(1 / 60)
}

let clock = 0
let finger = 10

function tap(workshop: WorkshopController, at: { x: number; y: number }) {
  const id = finger++
  workshop.pointerDown(id, at, (clock += 10))
  workshop.pointerUp(id, at, (clock += 80))
  workshop.step(1 / 60)
}

function drag(workshop: WorkshopController, from: { x: number; y: number }, to: () => { x: number; y: number }, release = true) {
  const id = finger++
  workshop.pointerDown(id, from, (clock += 10))
  workshop.step(1 / 60)
  for (let i = 1; i <= 20; i++) {
    const target = to()
    workshop.pointerMove(id, { x: from.x + ((target.x - from.x) * i) / 20, y: from.y + ((target.y - from.y) * i) / 20 }, (clock += 16))
    workshop.step(1 / 60)
  }
  for (let i = 0; i < 12; i++) {
    workshop.pointerMove(id, to(), (clock += 16))
    workshop.step(1 / 60)
  }
  if (release) workshop.pointerUp(id, to(), (clock += 16))
  workshop.step(1 / 60)
  return id
}

const m = new THREE.Matrix4()
const v = new THREE.Vector3()

/** Screen point of where a new part of `kind` would go on the sleeper. */
function socketScreen(workshop: WorkshopController, kind: PartKind) {
  const sleeper = workshop.sleeper!
  if (!workshop.rig.socket(sleeper, kind, m)) throw new Error('no room')
  v.setFromMatrixPosition(m)
  return screenOf(v.x, v.z)
}

function giveSleeper(workshop: WorkshopController, kind: PartKind) {
  const slot = traySlot(kind)
  drag(workshop, screenOf(slot.x, slot.z), () => socketScreen(workshop, kind))
}

function tapNose(workshop: WorkshopController) {
  const nose = workshop.sleeper!.world.nose
  tap(workshop, screenOf(nose[0], nose[2]))
}

describe('WorkshopController', () => {
  it('presses a part from the tray onto the sleepy lump, and saves', () => {
    const { workshop, save } = makeWorkshop()
    giveSleeper(workshop, 'legStub')
    expect(workshop.state.sleeper!.parts.map((p) => p.kind)).toEqual(['legStub'])
    giveSleeper(workshop, 'legStub')
    giveSleeper(workshop, 'eye')
    expect(workshop.state.sleeper!.parts).toHaveLength(3)
    expect(save).toHaveBeenCalled()
  })

  it('sends a part dropped on the empty bench flying home to the tray', () => {
    const { workshop } = makeWorkshop()
    const slot = traySlot('horn')
    drag(workshop, screenOf(slot.x, slot.z), () => screenOf(-40, 25))
    expect(workshop.state.sleeper!.parts).toHaveLength(0)
    run(workshop, 1)
    expect(workshop.rig.batches.horn.count).toBe(1)
  })

  it('wakes the critter with a tap on its nose; it hops off and a new lump plops on', () => {
    const { workshop } = makeWorkshop()
    giveSleeper(workshop, 'legLong')
    giveSleeper(workshop, 'legLong')
    const first = workshop.state.sleeper!.id
    tapNose(workshop)
    expect(workshop.state.awake.map((c) => c.id)).toEqual([first])
    run(workshop, 3)
    const woken = workshop.critters.find((c) => c.save.id === first)!
    expect(woken.awake).toBe(true)
    expect(insideWalk(woken.mover, 0)).toBe(true)
    expect(workshop.sleeper?.save.id).not.toBe(first)
    expect(workshop.sleeper?.mode).toBe('sleeping')
    expect(workshop.sleeper?.save.parts).toHaveLength(0)
  })

  it('a tap on the sleeping body only stirs it', () => {
    const { workshop } = makeWorkshop()
    const body = workshop.sleeper!.world.body
    tap(workshop, screenOf(body[0] - 4, body[2] - 3))
    expect(workshop.state.awake).toHaveLength(0)
  })

  it('pulls a part off with a stretch and a pop, and it can go onto another body', () => {
    const { workshop } = makeWorkshop()
    giveSleeper(workshop, 'earFlop')
    run(workshop, 1)
    const sleeper = workshop.sleeper!
    const ear = sleeper.world.parts
    const from = screenOf(ear[0], ear[2])
    drag(workshop, from, () => ({ x: from.x - 200, y: from.y + 150 }))
    expect(workshop.state.sleeper!.parts).toHaveLength(0)
    run(workshop, 1)
  })

  it('a short tug snaps the part back', () => {
    const { workshop } = makeWorkshop()
    giveSleeper(workshop, 'horn')
    run(workshop, 1)
    const horn = workshop.sleeper!.world.parts
    const from = screenOf(horn[0], horn[2])
    drag(workshop, from, () => ({ x: from.x + 20, y: from.y + 10 }))
    expect(workshop.state.sleeper!.parts).toHaveLength(1)
  })

  it('carries an awake critter back onto the turntable to remake it', () => {
    const { workshop } = makeWorkshop()
    giveSleeper(workshop, 'legStub')
    giveSleeper(workshop, 'legStub')
    const id = workshop.state.sleeper!.id
    tapNose(workshop)
    run(workshop, 3)
    const critter = workshop.critters.find((c) => c.save.id === id)!
    const body = critter.world.body
    drag(workshop, screenOf(body[0], body[2]), () => screenOf(TURNTABLE.x, TURNTABLE.z))
    expect(workshop.state.sleeper!.id).toBe(id)
    expect(workshop.state.awake).toHaveLength(0)
    run(workshop, 2)
    expect(workshop.sleeper!.mode).toBe('sleeping')
    expect(workshop.critters).toHaveLength(1)
  })

  it('stops making lumps at four awake critters and shows carrying one back', () => {
    const state = defaultWorkshop()
    const { workshop } = makeWorkshop(state)
    for (let i = 0; i < MAX_AWAKE; i++) {
      giveSleeper(workshop, 'legStub')
      tapNose(workshop)
      run(workshop, 3)
    }
    expect(workshop.state.awake).toHaveLength(MAX_AWAKE)
    expect(workshop.state.sleeper).toBeNull()
    tap(workshop, screenOf(-45, -22))
    run(workshop, IDLE_BEFORE_DEMO + 1)
    expect(workshop.guidance.hint?.kind).toBe('carryToTurntable')
    expect(workshop.guidance.hand).not.toBeNull()
  })

  it('awake critters wander, greet, and always stay on the bench', () => {
    const state = deserialize({
      v: 1,
      sleeper: null,
      awake: [
        { id: 1, hue: 0, parts: [{ kind: 'legStub', hue: 1 }, { kind: 'legStub', hue: 1 }], x: -30, z: 20, heading: 1, seed: 1 },
        { id: 2, hue: 1, parts: [], x: 0, z: 20, heading: -1, seed: 2 },
        { id: 3, hue: 2, parts: Array.from({ length: 6 }, () => ({ kind: 'legLong', hue: 0 })), x: 15, z: -15, heading: 0, seed: 3 },
      ],
      tray: {},
      nextHue: 0,
      nextId: 4,
    })
    const { workshop } = makeWorkshop(state)
    const walkers = workshop.critters.filter((c) => c.awake)
    expect(walkers).toHaveLength(3)
    const start = walkers.map((c) => ({ x: c.mover.x, z: c.mover.z }))
    const modes = new Set<string>()
    for (let t = 0; t < 40; t += 1 / 30) {
      workshop.step(1 / 30)
      for (const critter of workshop.critters) {
        modes.add(critter.mode)
        if (critter.awake) expect(insideWalk(critter.mover, 0.5)).toBe(true)
      }
    }
    const moved = walkers.map((c, i) => Math.hypot(c.mover.x - start[i].x, c.mover.z - start[i].z))
    expect(Math.min(...moved)).toBeGreaterThan(2)
    expect(modes.has('walking')).toBe(true)
    expect(modes.has('greeting')).toBe(true)
  })

  it('shows a ghost hand pressing a leg onto the lump only after the child is idle, and a touch hides it', () => {
    const { workshop } = makeWorkshop()
    run(workshop, IDLE_BEFORE_DEMO - 0.5)
    expect(workshop.guidance.hand).toBeNull()
    run(workshop, 1.6)
    expect(workshop.guidance.hint).toEqual({ kind: 'givePart', part: 'legStub' })
    expect(workshop.guidance.hand).not.toBeNull()
    workshop.pointerDown(99, screenOf(-40, 25), (clock += 10))
    workshop.step(1 / 60)
    expect(workshop.guidance.hand).toBeNull()
    expect(workshop.guidance.glow).toBe(0)
  })

  it('after two parts the demonstration taps the nose', () => {
    const { workshop } = makeWorkshop()
    giveSleeper(workshop, 'legStub')
    giveSleeper(workshop, 'eye')
    run(workshop, IDLE_BEFORE_DEMO + 1)
    expect(workshop.guidance.hint).toEqual({ kind: 'tapNose' })
  })

  it('a resting hand cancels a part in flight to the lump; nothing attaches', () => {
    const { workshop } = makeWorkshop()
    const slot = traySlot('legStub')
    const id = drag(workshop, screenOf(slot.x, slot.z), () => socketScreen(workshop, 'legStub'), false)
    for (const other of [201, 202, 203]) workshop.pointerDown(other, screenOf(-40 + other - 200, 20), (clock += 5))
    workshop.pointerUp(id, socketScreen(workshop, 'legStub'), (clock += 16))
    run(workshop, 1)
    expect(workshop.state.sleeper!.parts).toHaveLength(0)
  })

  it('putting the workshop away mid-drag loses nothing and saves', () => {
    const { workshop, save } = makeWorkshop()
    giveSleeper(workshop, 'legStub')
    const slot = traySlot('eye')
    drag(workshop, screenOf(slot.x, slot.z), () => screenOf(0, 20), false)
    save.mockClear()
    workshop.setRunning(false)
    expect(workshop.state.sleeper!.parts).toHaveLength(1)
    workshop.setRunning(true)
    run(workshop, 1)
    expect(workshop.rig.batches.eye.count).toBe(1)
  })

  it('keeps tray parts in the tray and on screen', () => {
    const { workshop } = makeWorkshop()
    expect(workshop.rig.batches.legStub.count).toBe(1)
    const matrices = workshop.rig.batches.legStub.matrices
    expect(matrices[13]).toBeGreaterThanOrEqual(TRAY.height)
  })
})
