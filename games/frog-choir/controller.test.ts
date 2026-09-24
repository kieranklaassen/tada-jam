import { describe, expect, it, vi } from 'vitest'
import { BODIES, FIREFLY_REACH, GRAZE, PAD_HEIGHTS, PAIR_REACH, RINGS } from './bodies'
import { fireflyAt, phaseAt } from './choir'
import { PAD_SINK, PAD_SPREAD_MAX, padDip, padWave, PondController, silentSound, type Frog, type Projector, type Sound } from './controller'
import { IDLE_BEFORE_DEMO } from './guidance'
import { PAD_RIM, PAD_TOP, PAD_UNDERSIDE, PADS, partnerPad, POND, ROW_PITCH_HZ, SHORE_Z } from './layout'
import { defaultPond } from './state'
import { dropLanded, shadowSpot, type ShadowSpot } from './surfaces'

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

  it('catches the firefly where the child saw it, a moment behind where it is now', () => {
    const { pond, calls } = makePond()
    for (let i = 0; i < 2000 && (pond.phase < 6.3 || pond.phase > 6.5); i++) pond.step(1 / 60)
    const seen = fireflyAt(phaseAt(pond.clock - 0.25, pond.beat), pond.targets, pond.occupied, { x: 0, y: 0, z: 0 })
    expect(Math.hypot(seen.x - pond.firefly.x, seen.z - pond.firefly.z) * 100).toBeGreaterThan(40)
    tapAt(pond, seen.x, seen.z)
    expect(calls.some((call) => call.name === 'chime')).toBe(true)
    calls.length = 0
    run(pond, 1.5)
    tapAt(pond, pond.firefly.x + 1, pond.firefly.z + 1)
    expect(calls.some((call) => call.name === 'chime')).toBe(false)
  })

  it('dragging a frog to an empty pad moves it there, saves, and it lands singing its new note', () => {
    const { pond, save, calls } = makePond()
    const from = PADS[pond.state.frogs[1]]
    const to = partnerPad(from.index)
    dragTo(pond, from.x, from.z, to.x, to.z)
    expect(pond.state.frogs[1]).toBe(to.index)
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ frogs: pond.state.frogs }))
    expect(calls.some((call) => call.name === 'preview' && call.args[0] === 1 && call.args[1] === to.pitch)).toBe(true)
    run(pond, 1)
    expect(pond.frogs[1].mode).toBe('sit')
    expect(pond.frogs[1].x).toBeCloseTo(to.x)
    expect(calls.some((call) => call.name === 'land' && call.args[0] === 1)).toBe(true)
    expect(voices(calls).some((call) => call.args[0] === 1 && call.args[1] === to.pitch)).toBe(true)
  })

  it('a frog lands on the pad under the fingertip, even though it is carried in the air above it', () => {
    // A camera in front of the pond looking down at 45°: height shifts a point up the screen.
    const oblique: Projector = {
      toScreen: (x, y, z, out) => {
        out.x = 1000 + x * 100
        out.y = 1000 + (z - y) * 100
        return out
      },
      toPlane: (sx, sy, height, out) => {
        out.x = (sx - 1000) / 100
        out.y = (sy - 1000) / 100 + height
        return out
      },
    }
    const { pond, save } = makePond()
    pond.setProjector(oblique)
    const from = PADS[pond.state.frogs[1]]
    const to = partnerPad(from.index)
    dragTo(pond, from.x, from.z, to.x, to.z)
    expect(pond.state.frogs[1]).toBe(to.index)
    expect(save).toHaveBeenCalled()
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

  it('takes the swapped-out frog off the lifted pad it was sitting on, not the waterline', () => {
    const { pond } = makePond()
    const a = pond.state.frogs[0]
    const b = pond.state.frogs[3]
    const from = screenOf(PADS[a].x, PADS[a].z)
    const to = screenOf(PADS[b].x, PADS[b].z)
    pond.pointerDown(2, from.x, from.y, (ms += 10))
    pond.pointerMove(2, to.x, to.y)
    run(pond, 0.5)
    // Its pad has risen to meet the carried frog, so it sits well above PAD_TOP.
    expect(pond.padTop[b]).toBeGreaterThan(PAD_TOP + 0.05)
    const sitting = pond.frogs[3].baseY
    pond.pointerUp(2, to.x, to.y, (ms += 300))
    pond.step(1 / 600)
    expect(pond.frogs[3].mode).toBe('hop')
    expect(pond.frogs[3].baseY).toBeGreaterThan(sitting - 0.01)
  })

  it('dropping on the pad of a frog another finger is carrying swaps them without pulling it out of the hand', () => {
    const { pond } = makePond()
    const a = pond.state.frogs[0]
    const b = pond.state.frogs[3]
    const held = screenOf(PADS[b].x, PADS[b].z)
    pond.pointerDown(7, held.x, held.y, (ms += 10))
    pond.pointerMove(7, held.x + 40, held.y + 120)
    run(pond, 0.2)
    expect(pond.frogs[3].mode).toBe('held')
    dragTo(pond, PADS[a].x, PADS[a].z, PADS[b].x, PADS[b].z)
    expect(pond.state.frogs[0]).toBe(b)
    expect(pond.state.frogs[3]).toBe(a)
    expect(pond.frogs[3].mode).toBe('held')
    pond.pointerCancel(7)
    run(pond, 1.2)
    expect(pond.frogs[3].mode).toBe('sit')
    expect(pond.frogs[3].x).toBeCloseTo(PADS[a].x)
    const home = screenOf(PADS[a].x, PADS[a].z)
    expect(pond.pick(home.x, home.y)).toEqual({ kind: 'frog', frog: 3 })
  })

  it('a frog dropped on open water splashes and hops back home, with nothing saved', () => {
    const { pond, save, calls } = makePond()
    const home = pond.state.frogs[4]
    const pad = PADS[home]
    dragTo(pond, pad.x, pad.z, pad.x + 1, pad.z + 0.76)
    expect(pond.frogs[4].mode).toBe('splash')
    run(pond, 0.6)
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

/** Whether two frogs' bodies could share a point: a ring of one overlaps a ring of the other both across and in height. */
function overlapping(a: Frog, b: Frog): boolean {
  const d = Math.hypot(a.x - b.x, a.z - b.z)
  for (let i = 0; i < RINGS.length; i++) {
    for (let j = 0; j < RINGS.length; j++) {
      if (d >= Math.min(RINGS[i] + RINGS[j], PAIR_REACH)) continue
      const [lowA, topA] = [a.baseY + a.shape.low[i], a.baseY + a.shape.top[i]]
      const [lowB, topB] = [b.baseY + b.shape.low[j], b.baseY + b.shape.top[j]]
      if (topA >= lowA && topB >= lowB && lowA < topB && lowB < topA) return true
    }
  }
  return false
}

/** Whether a frog's body reaches into a pad, underside to top, rim and all. */
function inPad(pond: PondController, frog: Frog, pad: number): boolean {
  const p = PADS[pad]
  const d = Math.hypot(frog.x - p.x, frog.z - p.z)
  const underside = pond.padY[pad] + PAD_UNDERSIDE * (1 + pond.padTilt[pad])
  for (let i = 0; i < RINGS.length; i++) {
    if (d >= RINGS[i] + p.radius * PAD_RIM * pond.padSpread[pad]) continue
    if (frog.baseY + frog.shape.low[i] < pond.padTop[pad] && frog.baseY + frog.shape.top[i] > underside) return true
  }
  return false
}

/**
 * A child using every hand at once: a tap mid-flight of the firefly, a frog
 * carried low over two occupied pads (tapped while it hovers), a swap, a
 * frog tapped as it hops, a frog dropped in the water beside a pad, and a
 * carry let go over its own pad. `check` runs after every step.
 */
function busyPond(check: (pond: PondController) => void): PondController {
  const { pond } = makePond(8)
  const padOf = (frog: number) => PADS[pond.state.frogs[frog]]
  let at = { x: 0, y: 0 }
  const step = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      pond.step(1 / 60)
      check(pond)
    }
  }
  const press = (pointer: number, frog: number) => {
    at = screenOf(padOf(frog).x, padOf(frog).z)
    pond.pointerDown(pointer, at.x, at.y, (ms += 10))
  }
  const move = (pointer: number, x: number, z: number, seconds: number) => {
    const to = screenOf(x, z)
    const frames = Math.round(seconds * 60)
    for (let k = 1; k <= frames; k++) {
      pond.pointerMove(pointer, at.x + ((to.x - at.x) * k) / frames, at.y + ((to.y - at.y) * k) / frames)
      step(1 / 60)
    }
    at = to
  }
  const letGo = (pointer: number) => pond.pointerUp(pointer, at.x, at.y, (ms += 300))
  const tap = (frog: number) => tapAt(pond, pond.frogs[frog].x, pond.frogs[frog].z)

  step(1.5)
  tap(1)
  step(0.4)
  const showoff = padOf(0)
  const over = [padOf(1), padOf(2)]
  const empty = partnerPad(padOf(2).index)
  press(5, 0)
  move(5, over[0].x, over[0].z, 0.6)
  step(0.3)
  tap(1)
  step(0.8)
  move(5, over[1].x, over[1].z, 0.6)
  tap(2)
  step(0.9)
  move(5, empty.x, empty.z, 0.6)
  letGo(5)
  step(0.3)
  press(6, 3)
  move(6, padOf(4).x, padOf(4).z, 0.7)
  letGo(6)
  step(0.25)
  tap(4)
  step(1.4)
  const beside = padOf(2)
  press(7, 1)
  move(7, beside.x + beside.radius + 0.5, beside.z + 0.2, 0.5)
  letGo(7)
  step(0.2)
  press(8, 2)
  move(8, showoff.x, showoff.z, 0.8)
  move(8, padOf(2).x, padOf(2).z, 0.8)
  letGo(8)
  step(3)
  return pond
}

describe('keeping things from passing through each other', () => {
  it('ends the busy pond with every frog on its pad', () => {
    const pond = busyPond(() => {})
    for (const frog of pond.frogs) {
      expect(frog.mode).toBe('sit')
      expect(frog.x).toBeCloseTo(PADS[pond.state.frogs[frog.index]].x)
    }
  })

  it('never lets two frogs pass through each other: carried over, swapped, hopping, or splashing', () => {
    const problems: string[] = []
    busyPond((pond) => {
      for (const a of pond.frogs) for (const b of pond.frogs) if (a.index < b.index && overlapping(a, b)) problems.push(`${a.index} ${a.mode} × ${b.index} ${b.mode} at ${pond.time.toFixed(2)}s`)
    })
    expect(problems.slice(0, 5)).toEqual([])
  })

  it('flies the firefly over every frog, however high a tapped frog leaps', () => {
    const problems: string[] = []
    busyPond((pond) => {
      const f = pond.firefly
      for (const frog of pond.frogs) {
        const d = Math.hypot(f.x - frog.x, f.z - frog.z)
        for (let i = 0; i < RINGS.length; i++) {
          if (d < RINGS[i] + FIREFLY_REACH && f.y - FIREFLY_REACH < frog.baseY + frog.shape.top[i]) problems.push(`frog ${frog.index} ${frog.mode} at ${pond.time.toFixed(2)}s`)
        }
      }
    })
    expect(problems.slice(0, 5)).toEqual([])
  })

  it('keeps every pad clear of the water it floats on, struck, bobbing, or lifted', () => {
    for (const strength of [-0.8, -0.4, 0.45, 0.5625, 0.8, 1]) {
      for (let age = 0; age < 2; age += 0.004) expect(padDip(padWave(age, strength))).toBeGreaterThanOrEqual(-PAD_SINK)
    }
    let lowestTop = Infinity
    let lowestUnderside = Infinity
    let highestTop = -Infinity
    busyPond((pond) => {
      for (const pad of PADS) {
        lowestTop = Math.min(lowestTop, pond.padTop[pad.index])
        highestTop = Math.max(highestTop, pond.padTop[pad.index])
        lowestUnderside = Math.min(lowestUnderside, pond.padY[pad.index] + PAD_UNDERSIDE * (1 + pond.padTilt[pad.index]))
        expect(pond.padSpread[pad.index]).toBeLessThanOrEqual(PAD_SPREAD_MAX)
      }
    })
    expect(lowestTop).toBeGreaterThan(0.005)
    expect(lowestUnderside).toBeGreaterThanOrEqual(PAD_HEIGHTS.low)
    expect(highestTop).toBeLessThanOrEqual(PAD_HEIGHTS.high)
  })

  it('brings a frog dropped in the water down in open water, clear of the pads, the frogs, and the shore', () => {
    const drops: [number, number][] = [
      [PADS[4].x + PADS[4].radius + 0.4, PADS[4].z],
      [(PADS[2].x + PADS[4].x) / 2, (PADS[2].z + PADS[4].z) / 2],
      [PADS[5].x + 1.3, SHORE_Z + 0.2],
      [POND.minX + 0.1, PADS[1].z],
      [PADS[3].x + 0.2, PADS[3].z + PADS[3].radius + 0.4],
    ]
    for (const [x, z] of drops) {
      const { pond, calls } = makePond()
      const frog = pond.frogs[2]
      const home = PADS[pond.state.frogs[2]]
      const problems: string[] = []
      dragTo(pond, home.x, home.z, x, z)
      expect(frog.mode).toBe('splash')
      const room = BODIES[2].splashWater
      for (const pad of PADS) expect(Math.hypot(pad.x - frog.splashX, pad.z - frog.splashZ)).toBeGreaterThanOrEqual(pad.radius * PAD_RIM * PAD_SPREAD_MAX + room)
      for (const other of pond.frogs) if (other !== frog) expect(Math.hypot(other.x - frog.splashX, other.z - frog.splashZ)).toBeGreaterThanOrEqual(PAIR_REACH)
      expect(frog.splashZ - room).toBeGreaterThan(SHORE_Z)
      expect(frog.splashX - room).toBeGreaterThan(POND.minX)
      expect(frog.splashX + room).toBeLessThan(POND.maxX)
      for (let t = 0; t < 2.5; t += 1 / 60) {
        pond.step(1 / 60)
        if (frog.mode !== 'splash') continue
        // In the water, splashWater keeps it off the pads (checked above); on the way down, its whole body must miss them.
        const falling = pond.time < frog.splashedAt
        for (const pad of PADS) if (falling && inPad(pond, frog, pad.index)) problems.push(`pad ${pad.index} at ${pond.time.toFixed(2)}s`)
        for (const other of pond.frogs) if (other !== frog && overlapping(frog, other)) problems.push(`frog ${other.index} at ${pond.time.toFixed(2)}s`)
      }
      expect(problems.slice(0, 3), `dropped at ${x.toFixed(2)}, ${z.toFixed(2)}`).toEqual([])
      expect(calls.filter((call) => call.name === 'splash')).toHaveLength(1)
      expect(frog.mode).toBe('sit')
    }
  })

  it('lays shadows a hair above what is under them, never cutting into another frog or reaching the shore', () => {
    // Less than this over the surface under it and a shadow flickers through it, polygon offset or not.
    const HAIR = 0.004
    const spot: ShadowSpot = { y: 0, radius: 0 }
    const problems: string[] = []
    const lay = (pond: PondController, x: number, z: number, radius: number, caster: number) => {
      shadowSpot(pond, x, z, radius, caster, spot)
      if (spot.radius === 0) return
      const at = `${caster} at ${pond.time.toFixed(2)}s`
      if (spot.radius > radius) problems.push(`grew ${at}`)
      if (z - spot.radius <= SHORE_Z) problems.push(`on the shore ${at}`)
      if (spot.y < HAIR) problems.push(`in the water ${at}`)
      for (const pad of PADS) {
        const reaches = Math.hypot(pad.x - x, pad.z - z) < pad.radius * PAD_RIM * pond.padSpread[pad.index] + spot.radius
        if (reaches && spot.y < pond.padTop[pad.index] + HAIR) problems.push(`in pad ${pad.index} ${at}`)
      }
      for (const frog of pond.frogs) {
        if (frog.index === caster) continue
        const d = Math.hypot(frog.x - x, frog.z - z)
        for (let i = 0; i < RINGS.length; i++) {
          const through = frog.baseY + frog.shape.low[i] < spot.y - GRAZE && frog.baseY + frog.shape.top[i] > spot.y
          if (through && d < RINGS[i] + spot.radius) problems.push(`in frog ${frog.index} ${at}`)
        }
      }
    }
    busyPond((pond) => {
      for (const frog of pond.frogs) if (frog.mode !== 'splash') lay(pond, frog.x, frog.z + 0.05, 0.8, frog.index)
      lay(pond, pond.firefly.x, pond.firefly.z, 0.21, -1)
    })
    expect(problems.slice(0, 5)).toEqual([])
  })

  it('stops a splash droplet once it lands on the water, a pad, the shore, or another frog', () => {
    const { pond } = makePond()
    pond.step(1 / 60)
    const pad = PADS[5]
    const r = 0.1
    expect(dropLanded(pond, 0, pad.x, pond.padTop[5] + r - 0.01, pad.z, r, true)).toBe(true)
    expect(dropLanded(pond, 0, pad.x, pond.padTop[5] + r + 0.05, pad.z, r, true)).toBe(false)
    expect(dropLanded(pond, 0, 0, r - 0.01, 3.9, r, true)).toBe(true)
    expect(dropLanded(pond, 0, 0, 0, 3.9, r, false)).toBe(false)
    expect(dropLanded(pond, 0, 0, 0.5, SHORE_Z + r - 0.01, r, false)).toBe(true)
    const frog = pond.frogs[2]
    expect(dropLanded(pond, 1, frog.x, frog.baseY + 0.4, frog.z, r, false)).toBe(true)
    expect(dropLanded(pond, 2, frog.x, frog.baseY + 0.4, frog.z, r, false)).toBe(false)
  })
})
