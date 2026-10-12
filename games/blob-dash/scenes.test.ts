import { describe, expect, it } from 'vitest'
import { BARE, FRAME, GRIP, fresh, of, runTo, types } from './drive'
import { RELEASE } from './layout'
import { pigeonOut, pigeonPose } from './cast'
import { RING } from './layout'
import { HOME_SECONDS, LAP, MOST_FX, OUT_OF_SIGHT, ofScene, type Faller, type Toy } from './toy'

// The two scenes: the clear-out, which the child starts, and the pigeon's
// lap, which a lap jumped from every beat starts. Both run on the loop's own
// clock, give way to any touch, and neither is ever played again by a load.

const BEATS_ALL = Array.from({ length: 16 }, (_, beat) => beat * 2)

/** A full ring of beat springs, played to the first beat of the third lap, where the pigeon's lap begins. */
function atLap(): { toy: Toy; first: ReturnType<typeof runTo> } {
  const toy = fresh(120, BEATS_ALL)
  runTo(toy, 31.9)
  toy.take()
  return { toy, first: runTo(toy, 32.02) }
}

describe('the pigeon\'s lap', () => {
  it('starts when a lap is over in which the blob left the ground from every one of the sixteen beats', () => {
    const { toy, first } = atLap()
    expect(of(first, 'lap')).toEqual([{ type: 'lap', act: 'stare' }])
    expect(toy.lap).toMatchObject({ from: 32 })
    expect(toy.flying()).toMatchObject({ stage: 'stare' })
  })

  it('does not start for fifteen beats, nor for sixteen jumps from halves', () => {
    const fifteen = fresh(120, BEATS_ALL.slice(1))
    expect(of(runTo(fifteen, 50), 'lap')).toEqual([])
    const halves = fresh(120, BEATS_ALL.map((place) => place + 1))
    expect(of(runTo(halves, 50), 'lap')).toEqual([])
  })

  it('takes a tap for a spring: fifteen springs and one tapped beat start it as well', () => {
    const toy = fresh(120, BEATS_ALL.filter((place) => place !== 12))
    runTo(toy, 16 + 5.9)
    toy.press(BARE)
    expect(of(runTo(toy, 32.02), 'lap')).toEqual([{ type: 'lap', act: 'stare' }])
  })

  it('stares for a beat, flies once round in six ahead of the blob, and lands out of breath: half a lap in all', () => {
    const { toy } = atLap()
    const acts: [number, string][] = []
    while (toy.lap) {
      toy.step(FRAME)
      for (const event of of(toy.take(), 'lap')) acts.push([Math.round(toy.pos * 10) / 10, event.act])
    }
    expect(acts).toEqual([[33, 'takeoff'], [34, 'flap'], [35, 'flap'], [36, 'flap'], [37, 'flap'], [38, 'flap'], [39, 'perch']])
    expect(toy.pos).toBeCloseTo(32 + LAP.stare + LAP.fly + LAP.land, 1)
    expect(LAP.stare + LAP.fly + LAP.land).toBe(8)
    expect(toy.cast.pigeon.pant).toBeLessThan(0.6)
  })

  it('keeps the pigeon ahead of the blob all the way round', () => {
    const { toy } = atLap()
    runTo(toy, 33.01)
    let last = 0
    while (toy.flying()?.stage === 'fly') {
      const flight = toy.flying()!
      expect(flight.beats).toBeGreaterThan(toy.pos + 1)
      expect(flight.beats).toBeGreaterThanOrEqual(last)
      last = flight.beats
      toy.step(FRAME)
    }
    // Once round: it comes down where it took off.
    expect(toy.flying()).toMatchObject({ stage: 'land', beats: last > 0 ? 32 + 1 + 1.5 + 16 : 0 })
  })

  it('ducks the springs it flies over', () => {
    const { toy } = atLap()
    runTo(toy, 33.5)
    // Over the far side of the ring, where the blob has not been for half a lap.
    expect(toy.ducked[2 * 10]).toBeGreaterThan(1)
    runTo(toy, 37)
    expect(toy.ducked[2 * 10]).toBeLessThan(2)
  })

  it('changes nothing that is saved', () => {
    const { toy } = atLap()
    const save = JSON.stringify(toy.toSave())
    toy.changed = 0
    while (toy.lap) toy.step(FRAME)
    expect(JSON.stringify(toy.toSave())).toBe(save)
    expect(toy.changed).toBe(0)
  })

  it('gives way to a touch: the lap is over at once, nothing more of the scene is raised, and the touch is an ordinary tap', () => {
    const { toy } = atLap()
    runTo(toy, 34.5)
    toy.take()
    toy.press(BARE)
    expect(toy.lap).toBeNull()
    expect(toy.flying()).toBeNull()
    expect(toy.sceneEnded).toBe(true)
    const events = [...toy.take(), ...runTo(toy, 44)]
    expect(of(events, 'lap')).toEqual([])
    expect(types(events)).toContain('touch')
  })

  it('brings the pigeon home in a move that is seen when a touch ends its lap: from where it was, nearer every frame, and without a sound', () => {
    const where = (toy: Toy) => pigeonOut(pigeonPose({ beats: toy.pos, seconds: toy.seconds, tempo: toy.tempo, blob: { x: 0, y: 0 } }, toy.cast.pigeon, toy.flying()), toy.flying(), toy.homing)
    const { toy } = atLap()
    runTo(toy, 35.5)
    const before = where(toy)!
    expect(before.out).toBe(1)
    toy.take()
    toy.press(BARE)
    // In the touch it is still where it was, out of its niche.
    const first = where(toy)!
    expect(first.beats).toBeCloseTo(before.beats, 6)
    expect(first.out).toBe(1)
    let last = first.out, frames = 0, heard = 0
    while (toy.homing) {
      toy.step(FRAME)
      heard += toy.take().filter(ofScene).length
      const now = where(toy)
      if (!now) break
      expect(now.out).toBeLessThan(last)
      last = now.out
      frames += 1
    }
    expect(frames).toBeGreaterThan(8)
    expect(frames * FRAME).toBeLessThanOrEqual(HOME_SECONDS + FRAME)
    expect(last).toBeLessThan(0.05)
    expect(heard).toBe(0)
    expect(where(toy)).toBeNull()
    // While it stares it has not left its niche, and a touch then leaves nothing to come home from.
    const staring = atLap().toy
    runTo(staring, 32.5)
    staring.press(BARE)
    expect(staring.homing).toBeNull()
    // A put-away finds it on its perch.
    const away = atLap().toy
    runTo(away, 35.5)
    away.press(BARE)
    expect(away.settled(1).homing).toBeNull()
  })

  it('comes in to land at the end of a lap as it went out: in a curve, not a snap', () => {
    const { toy } = atLap()
    const where = () => pigeonOut(pigeonPose({ beats: toy.pos, seconds: toy.seconds, tempo: toy.tempo, blob: { x: 0, y: 0 } }, toy.cast.pigeon, toy.flying()), toy.flying(), toy.homing)
    runTo(toy, 39.02)
    expect(toy.flying()).toMatchObject({ stage: 'land' })
    expect(where()!.out).toBeGreaterThan(0.95)
    runTo(toy, 39.5)
    expect(where()!.out).toBeCloseTo(0.5, 1)
    runTo(toy, 39.95)
    expect(where()!.out).toBeLessThan(0.05)
  })

  it('works every time: the next lap jumped from every beat starts it again', () => {
    const { toy } = atLap()
    const events = runTo(toy, 48.02)
    expect(of(events, 'lap').filter((event) => event.act === 'stare')).toHaveLength(1)
    expect(toy.lap).toMatchObject({ from: 48 })
  })

  it('has the pigeon too busy to coo while it flies', () => {
    const { toy } = atLap()
    const events = runTo(toy, 39.5)
    expect(of(events, 'cast').filter((event) => event.act === 'coo')).toEqual([])
  })
})

describe('the clear-out', () => {
  const cleared = (springs: number[]): Toy => {
    const toy = fresh(120, springs)
    toy.press(GRIP)
    toy.drag(GRIP, { x: GRIP.x, y: GRIP.y + RELEASE.travel })
    toy.endDrag(true)
    return toy
  }

  it('saves the springs empty when it starts, so a load in the middle of it finds the wall bare and plays nothing', () => {
    const toy = cleared([1, 2, 3, 40, 50])
    expect(toy.clearing!.queue).toHaveLength(5)
    expect(toy.toSave().springs).toEqual([])
    const again = toy.settled(3)
    expect(again.clearing).toBeNull()
    expect(again.standing()).toEqual([])
    expect(runTo(again, 0.4)).toEqual([])
  })

  it('fires no spring that is on its way off the wall', () => {
    const toy = cleared(Array.from({ length: 64 }, (_, sp) => sp))
    toy.take()
    const events = runTo(toy, 3)
    expect(of(events, 'launch')).toEqual([])
  })

  it('lets a new spring be laid while the old ones still come off', () => {
    const toy = cleared(Array.from({ length: 64 }, (_, sp) => sp))
    for (let i = 0; i < 6; i++) toy.step(FRAME)
    // A touch ends the scene, and is itself a tap: its spring is the first on a bare wall.
    toy.press(BARE)
    expect(toy.clearing).toBeNull()
    runTo(toy, 2.05)
    toy.press(BARE)
    expect([...toy.springs]).toEqual([1, 4])
  })

  it('sends every spring out of the frame: each is kept until it is below the bottom edge, however many are falling', () => {
    for (const bottom of [820, 1260]) {
      const toy = cleared(Array.from({ length: 64 }, (_, sp) => sp))
      toy.bottom = bottom
      const lastSeen = new Map<Faller, number>()
      let most = 0, pops = 0
      for (let i = 0; i < 60 * 8 && (toy.clearing || toy.fallers.length > 0); i++) {
        toy.step(FRAME)
        pops += of(toy.take(), 'pop').length
        most = Math.max(most, toy.fallers.length)
        for (const faller of toy.fallers) lastSeen.set(faller, faller.y)
      }
      expect(pops).toBe(64)
      // One falls for each spring that came off, and each was last seen under the frame's bottom edge.
      expect(lastSeen.size).toBe(64)
      for (const y of lastSeen.values()) expect(y).toBeGreaterThan(bottom)
      expect(toy.fallers).toHaveLength(0)
      // More are in the air at once than there may be short-lived marks: none gives way to another.
      expect(most).toBeGreaterThan(MOST_FX)
    }
  })

  it('drops the rest together at a touch: every spring still on the wall falls as it stands, and is kept until the highest is out of the frame', () => {
    const toy = cleared(Array.from({ length: 64 }, (_, sp) => sp))
    for (let i = 0; i < 20; i++) toy.step(FRAME)
    const off = toy.fallers.length
    expect(off).toBeGreaterThan(2)
    toy.take()
    toy.press(BARE)
    expect(toy.clearing).toBeNull()
    // Those that had come off are still falling one by one, and all the others fall together: none has gone.
    expect(toy.fallers).toHaveLength(off)
    expect(toy.dropping!.places).toHaveLength(64 - off)
    expect(new Set(toy.dropping!.places).size).toBe(64 - off)
    expect(toy.dropping!.y).toBe(0)
    let last = 0, pops = 0
    while (toy.dropping) {
      last = toy.dropping.y
      toy.step(FRAME)
      pops += of(toy.take(), 'pop').length
      if (toy.dropping) expect(toy.dropping.y).toBeGreaterThan(last)
    }
    // A spring at the very top of the ring was below the bottom edge the last time the fall was drawn.
    expect(RING.y - RING.floor + last).toBeGreaterThan(toy.bottom - OUT_OF_SIGHT)
    expect(pops).toBe(0)
    // A put-away in the middle of the fall finds a bare wall and nothing falling.
    const again = cleared([1, 2, 3])
    again.press(BARE)
    expect(again.dropping).not.toBeNull()
    const loaded = again.settled(2)
    expect(loaded.dropping).toBeNull()
    expect(loaded.fallers).toHaveLength(0)
  })

  it('names what belongs to a scene, so its sound can be cut when a touch ends it', () => {
    expect(ofScene({ type: 'pop', place: 3 })).toBe(true)
    expect(ofScene({ type: 'lap', act: 'flap' })).toBe(true)
    expect(ofScene({ type: 'cast', who: 'cat', act: 'fur' })).toBe(true)
    expect(ofScene({ type: 'cast', who: 'cat', act: 'poke' })).toBe(false)
    expect(ofScene({ type: 'lay', place: 3 })).toBe(false)
    expect(ofScene({ type: 'release', act: 'clack' })).toBe(false)
  })
})
