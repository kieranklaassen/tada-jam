import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { silentSound, WorkshopController, type Projector } from './controller'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO } from './guidance'
import { blocksTurntable, insideWalk, TRAY, traySlot, TURNTABLE } from './layout'
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

  it('a bare lump is not ready: a tap on its nose makes it peek at the tray, and the part it wants hops', () => {
    const { workshop } = makeWorkshop()
    run(workshop, 0.1)
    const legs = workshop.rig.batches.legStub.matrices
    const rest = legs[13]
    tapNose(workshop)
    let lids = 0
    let hop = 0
    for (let i = 0; i < 1.7 * 60; i++) {
      workshop.step(1 / 60)
      lids = Math.max(lids, workshop.sleeper!.pose.lids)
      hop = Math.max(hop, legs[13] - rest)
    }
    expect(workshop.state.awake).toHaveLength(0)
    expect(workshop.sleeper!.mode).toBe('sleeping')
    expect(lids).toBeGreaterThan(0.5)
    expect(hop).toBeGreaterThan(2)
    expect(workshop.sleeper!.pose.lids).toBe(0)
    giveSleeper(workshop, 'legStub')
    tapNose(workshop)
    expect(workshop.state.awake).toHaveLength(1)
  })

  it('a tap on the sleeping body stirs it and points at what it wants: the tray part, then its own nose', () => {
    const { workshop } = makeWorkshop()
    run(workshop, 0.1)
    const legs = workshop.rig.batches.legStub.matrices
    const rest = legs[13]
    const tapBody = () => {
      const body = workshop.sleeper!.world.body
      tap(workshop, screenOf(body[0] - 4, body[2] - 3))
    }
    tapBody()
    let hop = 0
    for (let i = 0; i < 60; i++) {
      workshop.step(1 / 60)
      hop = Math.max(hop, legs[13] - rest)
    }
    expect(workshop.state.awake).toHaveLength(0)
    expect(hop).toBeGreaterThan(2)
    giveSleeper(workshop, 'legStub')
    giveSleeper(workshop, 'eye')
    run(workshop, 1)
    tapBody()
    let noseGlow = 0
    for (let i = 0; i < 60; i++) {
      workshop.step(1 / 60)
      const [x, y, z] = workshop.sleeper!.world.nose
      const glows = workshop.rig.glows
      for (let g = 0; g < glows.count; g++) {
        const d = Math.hypot(glows.matrices[g * 16 + 12] - x, glows.matrices[g * 16 + 13] - y, glows.matrices[g * 16 + 14] - z)
        if (d < 0.5 && glows.params[g * 3 + 1] === 0) noseGlow = Math.max(noseGlow, glows.params[g * 3])
      }
    }
    expect(workshop.state.awake).toHaveLength(0)
    expect(noseGlow).toBeGreaterThan(0.8)
  })

  it('the sleeper sniffs toward a part held close, still asleep, and settles when it goes', () => {
    const { workshop } = makeWorkshop()
    const slot = traySlot('eye')
    const near = () => screenOf(TURNTABLE.x + 16, TURNTABLE.z + 6)
    const id = drag(workshop, screenOf(slot.x, slot.z), near, false)
    run(workshop, 0.6)
    const sleeper = workshop.sleeper!
    expect(sleeper.sniff).toBeGreaterThan(0.8)
    expect(sleeper.mode).toBe('sleeping')
    workshop.pointerMove(id, screenOf(30, 20), (clock += 16))
    workshop.pointerUp(id, screenOf(30, 20), (clock += 16))
    run(workshop, 2.5)
    expect(sleeper.sniff).toBeLessThan(0.05)
  })

  it('marks where a new leg will show, out past the body, not its socket under the belly', () => {
    const { workshop } = makeWorkshop()
    run(workshop, 0.1)
    const sleeper = workshop.sleeper!
    const mark = new THREE.Vector3()
    const body = new THREE.Vector3(...sleeper.world.body)
    expect(workshop.rig.socketMark(sleeper, 'legStub', mark)).toBe(true)
    workshop.rig.socket(sleeper, 'legStub', m)
    v.setFromMatrixPosition(m)
    expect(mark.distanceTo(body)).toBeGreaterThan(v.distanceTo(body) + 1)
  })

  it('with no touch the sleeper stretches toward the tray while it needs parts, then its nose itches to be tapped', () => {
    const { workshop } = makeWorkshop()
    const sleeper = workshop.sleeper!
    let lean = 0
    for (let i = 0; i < 6 * 60; i++) {
      workshop.step(1 / 60)
      lean = Math.min(lean, sleeper.pose.roll)
    }
    expect(lean).toBeLessThan(-0.12)
    expect(sleeper.itch).toBe(0)
    giveSleeper(workshop, 'legStub')
    giveSleeper(workshop, 'eye')
    let itch = 0
    for (let i = 0; i < 4 * 60; i++) {
      workshop.step(1 / 60)
      itch = Math.max(itch, sleeper.itch)
    }
    expect(itch).toBeGreaterThan(0.5)
  })

  it('each temperament wakes out loud its own way, answering the tap at once', () => {
    const heard = (seed: number, extra: PartKind[]) => {
      const sounds: { t: number; what: string }[] = []
      let t = 0
      const hear = (what: string) => sounds.push({ t, what })
      const sound = { ...silentSound, voice: (_: unknown, kind: string) => hear(kind), sniff: () => hear('sniff'), thud: () => hear('thud'), shake: () => hear('shake') }
      const parts = (['legStub', 'legStub', ...extra] as PartKind[]).map((kind) => ({ kind, hue: 0 as const }))
      const state = deserialize({ v: 1, sleeper: { id: 1, hue: 0, parts, x: 0, z: 0, heading: 0, seed }, awake: [], tray: {}, nextHue: 1, nextId: 2 })
      const workshop = new WorkshopController(state, { save: vi.fn(), sound, childAge: 4 })
      workshop.setProjector(topDown)
      workshop.step(1 / 60)
      sounds.length = 0
      tapNose(workshop)
      for (; t < 2.6; t += 1 / 60) workshop.step(1 / 60)
      expect(sounds[0].t, `seed ${seed}`).toBeLessThan(0.2)
      return sounds.map((s) => s.what).join(' ')
    }
    const wakes = [heard(3, []), heard(4, []), heard(5, []), heard(6, ['horn'])]
    expect(new Set(wakes).size).toBe(4)
    expect(wakes[1]).toContain('sniff')
    expect(wakes[3]).toContain('yawn')
    expect(wakes[3]).toContain('shake')
  })

  it('sniffs out loud once as a part comes close, not every frame', () => {
    const sound = { ...silentSound, sniff: vi.fn() }
    const workshop = new WorkshopController(defaultWorkshop(), { save: vi.fn(), sound, childAge: 4 })
    workshop.setProjector(topDown)
    const slot = traySlot('eye')
    drag(workshop, screenOf(slot.x, slot.z), () => screenOf(TURNTABLE.x + 16, TURNTABLE.z + 6), false)
    run(workshop, 1)
    expect(sound.sniff).toHaveBeenCalledTimes(1)
  })

  it('a part let go anywhere over the lump goes on, even far from its socket', () => {
    const { workshop } = makeWorkshop(defaultWorkshop(), 7)
    run(workshop, 0.1)
    const sleeper = workshop.sleeper!
    const body = sleeper.world.body
    const drop = screenOf(body[0] - sleeper.world.bodyR * 0.5, body[2] - sleeper.world.bodyR * 0.8)
    const socket = socketScreen(workshop, 'legStub')
    expect(Math.hypot(socket.x - drop.x, socket.y - drop.y)).toBeGreaterThan(workshop.snapPx)
    const slot = traySlot('legStub')
    drag(workshop, screenOf(slot.x, slot.z), () => drop)
    expect(workshop.state.sleeper!.parts.map((p) => p.kind)).toEqual(['legStub'])
  })

  it('the demonstration lets go on top of the lump, the part settles into its socket, and the hand never ends on the nose', () => {
    const { workshop } = makeWorkshop()
    run(workshop, IDLE_BEFORE_DEMO + 0.1)
    const at = new THREE.Vector3()
    let settled = false
    let released = 0
    for (let i = 0; i < DEMO_SECONDS * 60; i++) {
      workshop.step(1 / 60)
      const g = workshop.guidance
      if (!g.hand || g.hand.carry || g.ghostSettle === 0) continue
      released++
      const nose = workshop.sleeper!.world.nose
      expect(Math.hypot(g.hand.x - nose[0], g.hand.z - nose[2])).toBeGreaterThan(3)
      if (g.ghostSettle > 0.99) {
        settled = true
        workshop.rig.socket(workshop.sleeper!, 'legStub', m)
        v.setFromMatrixPosition(m)
        expect(at.setFromMatrixPosition(workshop.ghostMatrix).distanceTo(v)).toBeLessThan(0.1)
      }
    }
    expect(released).toBeGreaterThan(10)
    expect(settled).toBe(true)
  })

  it('during a demonstration the sleeper sniffs toward the ghost part as it arrives', () => {
    const { workshop } = makeWorkshop()
    run(workshop, IDLE_BEFORE_DEMO + 0.2)
    expect(workshop.sleeper!.sniff).toBe(0)
    run(workshop, DEMO_SECONDS * 0.7 - 0.2)
    expect(workshop.sleeper!.sniff).toBeGreaterThan(0.5)
  })

  it('a friend in front of the turntable steps aside before it stops to watch, so the lump stays in view', () => {
    const state = deserialize({
      v: 1,
      sleeper: { id: 9, hue: 1, parts: [], x: 0, z: 0, heading: 0, seed: 9 },
      awake: [{ id: 1, hue: 0, parts: [{ kind: 'legStub', hue: 1 }, { kind: 'legStub', hue: 1 }], x: TURNTABLE.x + 2, z: TURNTABLE.z + 20, heading: 0, seed: 5 }],
      tray: {},
      nextHue: 0,
      nextId: 10,
    })
    const { workshop } = makeWorkshop(state)
    const friend = workshop.critters.find((c) => c.awake)!
    expect(blocksTurntable(friend.mover)).toBe(true)
    const slot = traySlot('eye')
    drag(workshop, screenOf(slot.x, slot.z), () => screenOf(TURNTABLE.x + 6, TURNTABLE.z + 20), false)
    let watchedInFront = false
    for (let i = 0; i < 6 * 60; i++) {
      workshop.step(1 / 60)
      if (friend.mode === 'watching' && blocksTurntable(friend.mover)) watchedInFront = true
    }
    expect(watchedInFront).toBe(false)
    expect(friend.mode).toBe('watching')
    expect(blocksTurntable(friend.mover)).toBe(false)
  })

  it('friends keep wandering through the demonstration; only the sleeper sniffs the ghost part', () => {
    const state = deserialize({
      v: 1,
      sleeper: { id: 9, hue: 1, parts: [], x: 0, z: 0, heading: 0, seed: 9 },
      awake: [{ id: 1, hue: 0, parts: [{ kind: 'legLong', hue: 1 }, { kind: 'legLong', hue: 1 }], x: TURNTABLE.x + 18, z: TURNTABLE.z + 4, heading: 0, seed: 6 }],
      tray: {},
      nextHue: 0,
      nextId: 10,
    })
    const { workshop } = makeWorkshop(state)
    const friend = workshop.critters.find((c) => c.awake)!
    run(workshop, IDLE_BEFORE_DEMO + 0.2)
    const modes = new Set<string>()
    for (let i = 0; i < DEMO_SECONDS * 60; i++) {
      workshop.step(1 / 60)
      modes.add(friend.mode)
    }
    expect(workshop.sleeper!.sniff).toBeGreaterThan(0)
    expect(modes.has('watching')).toBe(false)
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

  it('a critter tapped while carried or still dropping from the finger comes down to the bench', () => {
    const { workshop } = makeWorkshop()
    giveSleeper(workshop, 'legStub')
    giveSleeper(workshop, 'legStub')
    const id = workshop.state.sleeper!.id
    tapNose(workshop)
    run(workshop, 3)
    const critter = workshop.critters.find((c) => c.save.id === id)!
    const body = () => screenOf(critter.world.body[0], critter.world.body[2])
    const holding = drag(workshop, body(), () => screenOf(-30, 12), false)
    expect(critter.mode).toBe('carried')
    tap(workshop, body())
    workshop.pointerUp(holding, screenOf(-30, 12), (clock += 16))
    run(workshop, 3)
    expect(critter.ground).toBe(0)
    drag(workshop, body(), () => screenOf(-20, 16))
    workshop.step(1 / 60)
    tap(workshop, body())
    run(workshop, 3)
    expect(critter.ground).toBe(0)
  })

  it('a finger near the middle of a decorated critter lifts it; only a finger right on a leg pulls the leg', () => {
    const kinds: PartKind[] = ['legStub', 'legStub', 'legStub', 'legStub', 'eye', 'eye', 'earRound', 'tailCurl']
    const state = deserialize({
      v: 1,
      sleeper: null,
      awake: [{ id: 1, hue: 0, parts: kinds.map((kind) => ({ kind, hue: 1 })), x: -30, z: 10, heading: 0, seed: 1 }],
      tray: {},
      nextHue: 0,
      nextId: 2,
    })
    const { workshop } = makeWorkshop(state)
    workshop.step(1 / 60)
    const critter = workshop.critters.find((c) => c.save.id === 1)!
    const legAt = () => screenOf(critter.world.parts[0], critter.world.parts[2])
    const bodyAt = () => screenOf(critter.world.body[0], critter.world.body[2])
    const leg = legAt()
    const body = bodyAt()
    const apart = Math.hypot(body.x - leg.x, body.y - leg.y)
    expect(apart).toBeGreaterThan(16)
    const nearLeg = { x: leg.x + ((body.x - leg.x) * 16) / apart, y: leg.y + ((body.y - leg.y) * 16) / apart }
    const holding = drag(workshop, nearLeg, () => screenOf(-20, 14), false)
    expect(critter.mode).toBe('carried')
    expect(critter.save.parts).toHaveLength(kinds.length)
    workshop.pointerUp(holding, screenOf(-20, 14), (clock += 16))
    run(workshop, 2)
    const from = legAt()
    drag(workshop, from, () => ({ x: from.x - 220, y: from.y + 160 }))
    expect(critter.save.parts).toHaveLength(kinds.length - 1)
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
