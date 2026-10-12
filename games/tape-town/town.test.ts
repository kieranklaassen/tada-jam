import { describe, expect, it } from 'vitest'
import { DT, names, nudge, run, storm, strip, townWith, type Heard } from './bench'
import { ACTS, MOVERS, type ActName } from './habits'
import type { Point } from './input'
import { BOX, CAT, EDGE, FIELD, HOME_ORDER, HOME_PLACE, ROLLS, TAPE_WIDTH, TOY_IDS, TOY_SIZE } from './layout'
import { TAPPED_MOVE } from './motion'
import { freshTown } from './save'
import { isStub, lengthOf, nearestOn } from './tape'
import { Town } from './town'
import { HOP, LAND } from './voices'

// The toy is stepped here one frame at a time, as the Mount steps it, and
// every sound is held to the frame of the motion it belongs to: sight and
// sound run on one clock. A sound is "heard" on the frame whose step (or
// whose touch) queued it, because the Mount plays what it takes from the
// model in the same frame it paints.

const SEED = 1
const heardNow = (town: Town): string[] => town.takeSounds().map((sound) => sound.name)
const step = (town: Town): string[] => { town.step(DT); return heardNow(town) }

/** A place on the bare floor with no toy near it in a first visit. */
const CLEAR: Point = { x: 640, y: 300 }
const box: Point = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 }

/** A pull of tape in steps of about five units, a frame for each, without the lift. */
function pullTo(town: Town, from: Point, to: Point): string[] {
  const heard: string[] = []
  town.press(from)
  heard.push(...heardNow(town))
  const far = Math.hypot(to.x - from.x, to.y - from.y), moves = Math.max(1, Math.round(far / 5))
  for (let k = 1; k <= moves; k++) {
    town.move({ x: from.x + ((to.x - from.x) * k) / moves, y: from.y + ((to.y - from.y) * k) / moves })
    heard.push(...heardNow(town), ...step(town))
  }
  return heard
}

describe('the tape', () => {
  it('sticks down with a tick in the call that carries the finger, before any frame', () => {
    const town = new Town(freshTown(7), SEED)
    town.press(CLEAR)
    expect(town.pull).toMatchObject({ kind: 0, ax: CLEAR.x, ay: CLEAR.y, bx: CLEAR.x, by: CLEAR.y })
    expect(heardNow(town)).toEqual(['stick'])
  })

  it('zips once for each half tape-width that comes off the roll, in the move that brings it off, and the car revs at the first of a grey strip', () => {
    const town = new Town(freshTown(7), SEED)
    town.press(CLEAR)
    heardNow(town)
    let ticks = 0
    for (let x = 5; x <= 315; x += 5) {
      town.move({ x: CLEAR.x + x, y: CLEAR.y })
      const heard = heardNow(town), now = Math.floor(x / (TAPE_WIDTH / 2))
      expect(heard, `at ${x}`).toEqual(now > ticks ? (ticks === 0 ? ['zip', 'rev'] : ['zip']) : [])
      ticks = now
    }
    expect(ticks).toBe(10)
    // Tape that goes back onto the roll goes quietly, and comes off again with its zip.
    town.move({ x: CLEAR.x + 200, y: CLEAR.y })
    expect(heardNow(town)).toEqual([])
    town.move({ x: CLEAR.x + 240, y: CLEAR.y })
    expect(heardNow(town)).toEqual(['zip'])
  })

  it('zips higher the faster the hand pulls', () => {
    const pitch = (unitsAFrame: number): number => {
      const town = new Town(freshTown(7), SEED)
      town.press(CLEAR)
      let last = 0
      for (let k = 1; k <= 30; k++) {
        town.move({ x: CLEAR.x + Math.min(300, k * unitsAFrame), y: CLEAR.y })
        for (const sound of town.takeSounds()) if (sound.name === 'zip') last = sound.notes[0].frequency
        town.step(DT)
      }
      return last
    }
    expect(pitch(10)).toBeGreaterThan(pitch(3))
  })

  it('stops short of the edge of the bare floor, so that whoever travels it stays on the boards', () => {
    const town = new Town(freshTown(7), SEED)
    town.press(CLEAR)
    town.move({ x: 1170, y: 810 })
    expect(town.pull).toMatchObject({ bx: FIELD.x1 - EDGE, by: FIELD.y1 - EDGE })
  })

  it('tears at the lift: the rip is heard in that call, and the strip is on the floor and in the save from that call', () => {
    const town = new Town(freshTown(7), SEED)
    pullTo(town, CLEAR, { x: 900, y: 320 })
    expect(town.state.strips).toHaveLength(0)
    town.takeChanged()
    town.lift()
    expect(heardNow(town)).toEqual(['rip'])
    expect(town.pull).toBeNull()
    expect(town.takeChanged()).toBe('soon')
    expect((town.saved().strips as unknown[])).toHaveLength(1)
    expect(town.state.strips[0]).toMatchObject({ kind: 0, ax: 640, ay: 300, bx: 900, by: 320 })
    // Loose until the press has run along it: it is drawn, but is not yet a road.
    expect(town.pressings).toHaveLength(1)
    expect(town.flat).toHaveLength(0)
    expect(town.rollBackAt).toBe(town.time)
    expect(town.ripAt).toBe(town.time)
  })

  it('rips longer and lower for a longer strip', () => {
    const rip = (to: Point) => {
      const town = new Town(freshTown(7), SEED)
      pullTo(town, { x: 420, y: 260 }, to)
      town.lift()
      return town.takeSounds().find((sound) => sound.name === 'rip')!.notes[0]
    }
    const short = rip({ x: 520, y: 260 }), long = rip({ x: 940, y: 260 })
    expect(long.decay).toBeGreaterThan(short.decay)
    expect(long.frequency).toBeLessThan(short.frequency)
  })

  it('is patted flat on the frame the press reaches its far end, and on that frame the car sets off for a grey strip', () => {
    const town = new Town(freshTown(7), SEED)
    pullTo(town, CLEAR, { x: 900, y: 320 })
    town.lift()
    heardNow(town)
    const pressing = town.pressings[0], layer = town.layer
    const before = { ...town.bodies.car.at }
    let frames = 0
    for (;;) {
      const left = pressing.lasts - pressing.t, heard = step(town)
      frames++
      if (left > DT + 1e-9) { expect(heard.includes('pat'), `frame ${frames}`).toBe(false); continue }
      expect(heard).toContain('pat')
      expect(heard).toContain('brrm')
      break
    }
    expect(town.pressings).toHaveLength(0)
    expect(town.flat).toHaveLength(1)
    expect(town.layer).toBeGreaterThan(layer)
    expect(town.bodies.car.doing).toMatchObject({ is: 'walk', gait: 'scoot' })
    // It scoots to the nearer end, turns onto the strip and drives it.
    let drove = false
    run(town, 2.5, [], () => { const doing = town.bodies.car.doing; drove = drove || (doing.is === 'ride' && doing.kind === 0 && doing.gait === 'drive') })
    expect(drove).toBe(true)
    expect(Math.hypot(town.bodies.car.at.x - before.x, town.bodies.car.at.y - before.y)).toBeGreaterThan(200)
  })

  it('of another colour is patted flat and calls no car', () => {
    const town = new Town(freshTown(7), SEED)
    town.press(ROLLS[2])
    town.lift()
    pullTo(town, CLEAR, { x: 900, y: 320 })
    town.lift()
    heardNow(town)
    const heard = names(run(town, 1))
    expect(heard).toContain('pat')
    expect(heard).not.toContain('brrm')
    expect(town.bodies.car.doing.is).toBe('stand')
  })

  it('lays a stub one tape-width long at a tap, with a tick and a pat, and a stub is tape like any other', () => {
    const town = new Town(freshTown(7), SEED)
    town.press(CLEAR)
    town.lift()
    expect(heardNow(town)).toEqual(['stick', 'rip'])
    const stub = town.state.strips[0]
    expect(isStub(stub)).toBe(true)
    expect(lengthOf(stub)).toBeCloseTo(TAPE_WIDTH, 0)
    expect(nearestOn(stub, CLEAR).off).toBeLessThan(1)
    expect(names(run(town, 0.5))).toContain('pat')
    expect(town.flat).toEqual([stub])
  })
})

describe('the rolls and the room', () => {
  it('picks a roll in the call that carries the finger: a quarter turn, its own creak, and tape of that colour from then on', () => {
    const town = new Town(freshTown(7), SEED)
    ROLLS.forEach((roll, kind) => {
      town.press(roll)
      expect(heardNow(town)).toEqual([`roll-${kind}`])
      expect(town.state.roll).toBe(kind)
      expect(town.rollTurns[kind]).toBe(1)
      expect(town.rollPickedAt).toBe(town.time)
      expect(town.pull).toBeNull()
      expect(town.takeChanged()).toBe('soon')
      town.lift()
      step(town)
    })
    town.press(CLEAR)
    expect(town.pull?.kind).toBe(3)
  })

  it('answers a finger on the cat, the rug, the skirting board, the lid, the sock and the tray, each as itself', () => {
    const town = new Town(freshTown(7), SEED)
    const answers: [Point, string][] = [[{ x: CAT.x, y: CAT.y }, 'prrp'], [{ x: 300, y: 780 }, 'pff'], [{ x: 300, y: 20 }, 'tok'], [{ x: 115, y: 450 }, 'tok'], [{ x: 150, y: 640 }, 'pff'], [{ x: 1140, y: 690 }, 'ting']]
    for (const [at, name] of answers) {
      town.press(at)
      expect(heardNow(town)).toEqual([name])
      expect(town.pull).toBeNull()
      town.lift()
      step(town)
    }
    expect(town.catAt).toBeGreaterThan(-Infinity)
    expect(town.state.strips).toEqual([])
    expect(town.takeChanged()).toBe('no')
  })
})

describe('the car on its road', () => {
  it('at the end of the road makes a three-point turn: a squeak on the frame it stops, a lower one on the frame it starts back, and it comes back', () => {
    const town = townWith([strip(0, 400, 300, 800, 300)], { car: { x: 640, y: 300, a: 0 } })
    nudge(town)
    let turnedAt = -1, backAt = -1, furthest = 0
    for (let f = 0; f < 200; f++) {
      const was = town.bodies.car.doing.is, heard = step(town), doing = town.bodies.car.doing
      furthest = Math.max(furthest, town.bodies.car.at.x)
      if (was === 'ride' && doing.is === 'act' && turnedAt < 0) {
        turnedAt = f
        expect(doing.name).toBe('uturn')
        expect(heard).toContain('squeak')
      } else if (heard.includes('squeak-back')) {
        backAt = f
        expect(doing.is === 'act' && doing.t >= 0.275 && doing.t < 0.275 + DT + 1e-9).toBe(true)
      } else expect(heard.includes('squeak'), `frame ${f}`).toBe(false)
    }
    expect(turnedAt).toBeGreaterThan(0)
    expect(backAt).toBeGreaterThan(turnedAt)
    expect(furthest).toBeLessThanOrEqual(800)
    expect(town.bodies.car.at.x).toBeLessThan(furthest - 60)
    expect(Math.cos(town.bodies.car.at.a)).toBeLessThan(-0.9)
  })

  it('takes the turn at a join with a tyre squeak, toward the longer side of the road it joins', () => {
    const town = townWith([strip(0, 330, 300, 640, 300), strip(0, 600, 180, 600, 600)], { car: { x: 400, y: 300, a: 0 } })
    nudge(town)
    const log: Heard[] = []
    run(town, 2.6, log)
    expect(names(log)).toContain('squeak')
    expect(town.bodies.car.at.y).toBeGreaterThan(360)
    expect(Math.abs(town.bodies.car.at.x - 600)).toBeLessThan(4)
  })
})

describe('the shoebox', () => {
  /** Holds every take-off and every landing to its frame, and says who went in what order. */
  const flightsHeld = (town: Town, seconds: number): { hops: string[]; lands: string[] } => {
    const hops: string[] = [], lands: string[] = []
    for (let f = 0; f < seconds * 60; f++) {
      const before = TOY_IDS.map((id) => ({ started: town.bodies[id].flight?.started ?? false, flight: town.bodies[id].flight }))
      const heard = step(town)
      TOY_IDS.forEach((id, k) => {
        const flight = before[k].flight
        if (!flight?.scene) return
        const off = !before[k].started && (town.bodies[id].flight?.started ?? true)
        const down = town.bodies[id].flight === null
        expect(heard.includes(HOP[id].name), `${id} off, frame ${f}`).toBe(off)
        expect(heard.includes(LAND[id].name), `${id} down, frame ${f}`).toBe(down)
        if (off) { hops.push(id); expect(town.poseOf(id).lift).toBeGreaterThan(0) }
        if (down) { lands.push(id); expect(town.bodies[id].landedAt).toBe(town.time) }
      })
    }
    return { hops, lands }
  }

  it('calls every toy home at a tap: the knock in that call, the save at once, each toy heard as it leaves the floor and as it lands, smallest first and the bus last', () => {
    const town = new Town(freshTown(3), SEED)
    run(town, 1)
    town.takeChanged()
    town.press(box)
    expect(heardNow(town)).toEqual(['box-knock'])
    expect(town.takeChanged()).toBe('now')
    expect(town.playing).toBe(true)
    expect(town.saved()).toMatchObject({ out: false })
    expect(town.state.toys.bus).toEqual(HOME_PLACE.bus)
    town.lift()
    const { hops, lands } = flightsHeld(town, 5)
    expect(hops).toEqual([...HOME_ORDER])
    expect(lands).toEqual(hops)
    expect(town.playing).toBe(false)
    for (const id of TOY_IDS) expect(town.poseOf(id)).toMatchObject({ ...HOME_PLACE[id], lift: 0 })
    expect(names(run(town, 3))).toEqual([])
  })

  it('tips them out again at a tap, the thump in that call, each with its own landing, and the car goes to work on the frame it lands', () => {
    const town = new Town(freshTown(3), SEED)
    town.press(box)
    town.lift()
    run(town, 5)
    town.takeChanged()
    town.press(box)
    expect(heardNow(town)).toEqual(['box-thump'])
    expect(town.takeChanged()).toBe('now')
    expect(town.saved()).toMatchObject({ out: true })
    town.lift()
    let landedFrame = -1
    const landings = new Set<string>()
    for (let f = 0; f < 300; f++) {
      const flying = town.bodies.car.flight !== null
      const heard = step(town)
      for (const id of TOY_IDS) if (heard.includes(LAND[id].name)) landings.add(LAND[id].name)
      if (flying && !town.bodies.car.flight) {
        landedFrame = f
        expect(heard).toContain(LAND.car.name)
        expect(heard).toContain('brrm')
        expect(town.bodies.car.doing).toMatchObject({ is: 'walk', gait: 'scoot' })
      } else if (town.bodies.car.doing.is !== 'ride') expect(heard.includes('brrm'), `frame ${f}`).toBe(false)
    }
    expect(landedFrame).toBeGreaterThan(0)
    expect(landings.size).toBe(TOY_IDS.length)
    expect(town.playing).toBe(false)
    for (const id of TOY_IDS) expect(town.bodies[id].at.x).toBeGreaterThanOrEqual(FIELD.x0)
  })

  it('holds the two scenes to the frame, toy by toy', () => {
    const town = new Town(freshTown(7), SEED)
    town.press(box)
    town.lift()
    heardNow(town)
    flightsHeld(town, 5)
    town.press(box)
    town.lift()
    heardNow(town)
    const { hops, lands } = flightsHeld(town, 5)
    expect(hops).toHaveLength(TOY_IDS.length)
    expect(lands).toHaveLength(TOY_IDS.length)
  })

  it('ends either scene at a touch: every toy stands where it was going and no more of the scene is heard', () => {
    const town = new Town(freshTown(7), SEED)
    town.press(box)
    town.lift()
    run(town, 0.8)
    expect(town.playing).toBe(true)
    town.press({ x: 300, y: 780 })
    expect(heardNow(town)).toEqual(['pff'])
    expect(town.takeCut()).toBe(true)
    expect(town.playing).toBe(false)
    for (const id of TOY_IDS) expect(town.poseOf(id)).toMatchObject({ ...HOME_PLACE[id], lift: 0 })
    town.lift()
    expect(names(run(town, 4))).toEqual([])
    // And the other one: tipped out and stopped, every toy stands where it was to land.
    town.press(box)
    town.lift()
    run(town, 0.6)
    const places = TOY_IDS.map((id) => ({ ...town.state.toys[id] }))
    town.press({ x: 300, y: 780 })
    town.lift()
    TOY_IDS.forEach((id, k) => expect(town.poseOf(id)).toMatchObject({ x: places[k].x, y: places[k].y, lift: 0 }))
    const after = names(run(town, 4))
    for (const id of TOY_IDS) { expect(after).not.toContain(HOP[id].name); expect(after).not.toContain(LAND[id].name) }
  })
})

describe('one clock for sight and sound', () => {
  it('through a long play every beat of every act is heard on the frame its motion reaches it, and every beat of a tap on its own frame', () => {
    const town = new Town(freshTown(3), 5)
    let acts = 0
    storm(town, 11, 80, () => {
      for (const id of MOVERS) {
        const doing = town.bodies[id].doing
        if (doing.is !== 'act') continue
        acts++
        const cues = ACTS[doing.name as ActName].cues
        expect(doing.cue, `${id} ${doing.name} at ${doing.t.toFixed(3)}`).toBe(cues.filter((cue) => cue.at <= doing.t).length)
      }
      for (const id of TOY_IDS) {
        const body = town.bodies[id]
        if (body.tappedAt === -Infinity || body.cue === 0) continue
        const cues = TAPPED_MOVE[id].cues
        expect(body.cue, `${id} tapped`).toBe(Math.max(1, cues.filter((at) => at <= town.time - body.tappedAt).length))
      }
    })
    expect(acts).toBeGreaterThan(200)
  })

  it('plays the same from the same seed', () => {
    const play = (): { heard: string[]; saved: unknown } => {
      const town = new Town(freshTown(3), 77)
      const log: Heard[] = []
      storm(town, 3, 20, () => { for (const sound of town.takeSounds()) log.push({ name: sound.name, frame: town.frames, scene: false }) })
      return { heard: log.map((heard) => `${heard.frame} ${heard.name}`), saved: town.saved() }
    }
    const a = play(), b = play()
    expect(a).toEqual(b)
    expect(a.heard.length).toBeGreaterThan(20)
  })
})

describe('no pending flag outlives its touch', () => {
  it('through a long play, whenever no finger is down there is no strip on the roll, no end lifted and no toy in the hand, and a cancel leaves none either', () => {
    const town = new Town(freshTown(3), 9)
    let frames = 0
    storm(town, 21, 60, () => {
      frames++
      expect(town.finger === null && town.pull === null && town.grip === null && town.hold === null, `frame ${frames}`).toBe(true)
      for (const id of TOY_IDS) expect(town.bodies[id].doing.is, id).not.toBe('held')
      if (frames % 97 === 0) {
        // A finger goes down wherever the car is, drags, and is taken away by the system.
        const at = town.poseOf('car')
        town.press({ x: at.x, y: at.y })
        town.move({ x: at.x + 60, y: at.y + 40 })
        town.cancel()
      }
    })
    expect(frames).toBe(3600)
  })
})

describe('the move the idle ladder shows', () => {
  it('is a tap on the box when the toys are in it', () => {
    const town = new Town(freshTown(7), SEED)
    town.press(box)
    town.lift()
    run(town, 5)
    const hint = town.hint()
    expect('tap' in hint && hint.tap.x > BOX.x && hint.tap.x < BOX.x + BOX.w && hint.tap.y > BOX.y && hint.tap.y < BOX.y + BOX.h).toBe(true)
  })

  it('is one pull of tape across bare boards: long enough to be a road, on the floor, ending on no toy and along no tape that is down', () => {
    for (const age of [3, 7]) {
      const town = new Town(freshTown(age), SEED)
      for (let k = 0; k < 5; k++) {
        const hint = town.hint()
        if (!('from' in hint)) throw new Error('a pull was expected')
        const { from, to } = hint
        expect(Math.hypot(to.x - from.x, to.y - from.y)).toBeGreaterThan(170)
        for (const at of [from, to]) expect(at.x >= town.field.x0 + EDGE && at.x <= town.field.x1 - EDGE && at.y >= town.field.y0 + EDGE && at.y <= town.field.y1 - EDGE).toBe(true)
        for (const id of TOY_IDS) if (id !== 'car') expect(Math.hypot(town.bodies[id].at.x - to.x, town.bodies[id].at.y - to.y), `${id} at pull ${k}`).toBeGreaterThan(TOY_SIZE[id].r * 0.6)
        // The child does what was shown, and the next one shown is somewhere else.
        town.press(from)
        town.move(to)
        town.lift()
        run(town, 3)
      }
    }
  })
})
