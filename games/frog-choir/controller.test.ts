import { describe, expect, it, vi } from 'vitest'
import { PondController, silentSound, type Projector, type Sound } from './controller'
import { IDLE_BEFORE_DEMO } from './guidance'
import { PADS, partnerPad, ROW_PITCH_HZ } from './layout'
import { defaultPond } from './state'

// A straight-down camera: 100 px per world unit, centred at (1000, 1000).
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

const screenOf = (x: number, z: number) => ({ x: 1000 + x * 100, y: 1000 + z * 100 })

type Call = { name: keyof Sound; args: unknown[] }

function recordingSound(calls: Call[]): Sound {
  const sound = { ...silentSound }
  for (const name of Object.keys(silentSound) as (keyof Sound)[]) {
    ;(sound as Record<string, unknown>)[name] = (...args: unknown[]) => calls.push({ name, args })
  }
  return sound
}

function makePond(age: number | null = 4) {
  const calls: Call[] = []
  const save = vi.fn()
  const pond = new PondController(defaultPond(), { save, sound: recordingSound(calls), childAge: age })
  pond.setProjector(topDown)
  pond.setRunning(true)
  return { pond, save, calls }
}

const run = (pond: PondController, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) pond.step(1 / 60)
}

let ms = 0
function tapAt(pond: PondController, x: number, z: number) {
  const at = screenOf(x, z)
  pond.pointerDown(1, at.x, at.y, (ms += 10))
  pond.pointerUp(1, at.x, at.y, (ms += 80))
}

function dragTo(pond: PondController, fromX: number, fromZ: number, toX: number, toZ: number, pointer = 2) {
  const a = screenOf(fromX, fromZ)
  const b = screenOf(toX, toZ)
  pond.pointerDown(pointer, a.x, a.y, (ms += 10))
  for (let i = 1; i <= 12; i++) {
    pond.pointerMove(pointer, a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12)
    pond.step(1 / 60)
  }
  run(pond, 0.2)
  pond.pointerUp(pointer, b.x, b.y, (ms += 300))
}

const voices = (calls: Call[]) => calls.filter((call) => call.name === 'voice')
/** Loop notes are the full-strength ones; demonstrations sing softer. */
const loopNotes = (calls: Call[]) => voices(calls).filter((call) => call.args[3] === 1)

describe('PondController', () => {
  it('sings the rising staircase once per loop: C D E G A, then a silent column and the flight home', () => {
    const { pond, calls } = makePond()
    run(pond, pond.beat * 1.5)
    calls.length = 0
    run(pond, pond.beat * 8)
    const sung = loopNotes(calls).map((call) => [call.args[0], call.args[1]])
    expect(sung).toEqual(ROW_PITCH_HZ.map((pitch, frog) => [frog, pitch]))
  })

  it('schedules each loop note exactly once, a little ahead of the beat', () => {
    const { pond, calls } = makePond(8)
    run(pond, pond.beat * 8 * 3 + pond.beat * 1.4)
    const notes = loopNotes(calls)
    expect(notes).toHaveLength(15)
    for (const call of notes) expect(call.args[2] as number).toBeLessThanOrEqual(0.12 + 1e-9)
  })

  it('makes a frog sing on the frame the firefly crosses its column, directly overhead', () => {
    const { pond } = makePond()
    const frog = pond.frogs[0]
    run(pond, pond.beat * 1.6)
    expect(frog.sungAt).toBe(-Infinity)
    run(pond, pond.beat * 0.15)
    expect(frog.sungAt).toBeGreaterThan(0)
    expect(Math.abs(pond.firefly.x - PADS[pond.state.frogs[0]].x)).toBeLessThan(0.6)
  })

  it('a tap on a frog sings its note at once', () => {
    const { pond, calls } = makePond()
    const pad = PADS[pond.state.frogs[2]]
    calls.length = 0
    tapAt(pond, pad.x, pad.z)
    expect(pond.frogs[2].tappedAt).toBe(pond.time)
    expect(voices(calls)).toContainEqual({ name: 'voice', args: [2, pad.pitch, 0, 1.2] })
    expect(calls[0].name).toBe('unlock')
  })

  it('a tap on an empty pad plinks its note, and a tap on water bloops', () => {
    const { pond, calls } = makePond()
    const empty = partnerPad(pond.state.frogs[0])
    tapAt(pond, empty.x, empty.z)
    expect(calls).toContainEqual({ name: 'plink', args: [empty.pitch, 1] })
    tapAt(pond, 0, 5.2)
    expect(calls.some((call) => call.name === 'bloop')).toBe(true)
  })

  it('dragging a frog to an empty pad moves it there, saves, and it lands singing its new note', () => {
    const { pond, save, calls } = makePond()
    const from = PADS[pond.state.frogs[1]]
    const to = partnerPad(from.index)
    dragTo(pond, from.x, from.z, to.x, to.z)
    expect(pond.state.frogs[1]).toBe(to.index)
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ frogs: pond.state.frogs }))
    expect(calls.some((call) => call.name === 'preview' && call.args[0] === to.pitch)).toBe(true)
    run(pond, 1)
    expect(pond.frogs[1].mode).toBe('sit')
    expect(pond.frogs[1].x).toBeCloseTo(to.x)
    expect(calls.some((call) => call.name === 'land' && call.args[0] === 1)).toBe(true)
    expect(voices(calls).some((call) => call.args[0] === 1 && call.args[1] === to.pitch)).toBe(true)
  })

  it('dropping on another frog swaps them, and the other frog hops to the vacated pad', () => {
    const { pond } = makePond()
    const a = pond.state.frogs[0]
    const b = pond.state.frogs[3]
    dragTo(pond, PADS[a].x, PADS[a].z, PADS[b].x, PADS[b].z)
    expect(pond.state.frogs[0]).toBe(b)
    expect(pond.state.frogs[3]).toBe(a)
    run(pond, 1.2)
    expect(pond.frogs[3].mode).toBe('sit')
    expect(pond.frogs[3].x).toBeCloseTo(PADS[a].x)
  })

  it('a frog dropped on open water splashes and hops back home, with nothing saved', () => {
    const { pond, save, calls } = makePond()
    const home = pond.state.frogs[4]
    const pad = PADS[home]
    dragTo(pond, pad.x, pad.z, pad.x + 1, pad.z + 0.76)
    expect(pond.frogs[4].mode).toBe('splash')
    expect(calls.some((call) => call.name === 'splash')).toBe(true)
    run(pond, 1.4)
    expect(pond.frogs[4].mode).toBe('sit')
    expect(pond.state.frogs[4]).toBe(home)
    expect(pond.frogs[4].x).toBeCloseTo(pad.x)
    expect(save).not.toHaveBeenCalled()
  })

  it('put away mid-drag, the frog is back on its pad and sound is suspended', () => {
    const { pond, calls } = makePond()
    const pad = PADS[pond.state.frogs[2]]
    const a = screenOf(pad.x, pad.z)
    pond.pointerDown(3, a.x, a.y, (ms += 10))
    pond.pointerMove(3, a.x + 120, a.y + 40)
    run(pond, 0.2)
    expect(pond.frogs[2].mode).toBe('held')
    pond.setRunning(false)
    expect(pond.frogs[2].mode).toBe('sit')
    expect(pond.frogs[2].x).toBeCloseTo(pad.x)
    expect(calls.at(-1)).toEqual({ name: 'setActive', args: [false] })
    pond.pointerUp(3, a.x + 120, a.y + 40, (ms += 50))
    expect(pond.state.frogs[2]).toBe(pad.index)
  })

  it('a resting hand (a fourth finger) cancels a drag and the frog hops home', () => {
    const { pond } = makePond()
    const pad = PADS[pond.state.frogs[0]]
    const a = screenOf(pad.x, pad.z)
    pond.pointerDown(1, a.x, a.y, (ms += 10))
    pond.pointerMove(1, a.x + 150, a.y)
    for (const id of [2, 3, 4]) pond.pointerDown(id, 200, 200, (ms += 10))
    expect(pond.frogs[0].mode).toBe('hop')
    run(pond, 1)
    expect(pond.frogs[0].mode).toBe('sit')
    expect(pond.state.frogs[0]).toBe(pad.index)
  })

  it('demonstrates a tap first, then a drag to the other pad once the child has tapped', () => {
    const { pond } = makePond()
    run(pond, IDLE_BEFORE_DEMO + 0.3)
    expect(pond.hint?.kind).toBe('tapFrog')
    expect(pond.hand.opacity).toBeGreaterThan(0)
    const pad = PADS[pond.state.frogs[pond.hint!.frog]]
    run(pond, 1.2)
    expect(pond.frogs[pond.hint!.frog].tappedAt).toBeGreaterThan(IDLE_BEFORE_DEMO)
    tapAt(pond, pad.x, pad.z)
    expect(pond.hint).toBeNull()
    run(pond, IDLE_BEFORE_DEMO + 0.3)
    expect(pond.hint?.kind).toBe('dragFrog')
    expect(pond.hint?.toPad).toBe(partnerPad(pond.hint!.fromPad).index)
  })

  it('invites with the nearest frog before the first touch, and never after', () => {
    const { pond } = makePond()
    run(pond, 1.6)
    expect(pond.inviteFrog).toBe(0)
    const pad = PADS[pond.state.frogs[1]]
    tapAt(pond, pad.x, pad.z)
    run(pond, 8)
    expect(pond.inviteFrog).toBeNull()
  })
})
