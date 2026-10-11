import { describe, expect, it } from 'vitest'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import { LADYBIRD, limitsFor } from './layout'
import { keep, putAway, voice } from './putaway'
import { SAVE_THROTTLE_MS } from './config'
import { deserialize, freshSave, serialize, type Save } from './save'
import { SaveCadence } from './saveCadence'
import { Table } from './table'

describe('put-away', () => {
  const table = () => new Table(freshSave(null), 1)

  it('takes back the idle ladder\'s time: a child who comes back is shown no glow and no hand until they have been idle again', () => {
    const ladder = new IdleLadder(0)
    // Idle long enough for the hand to be showing as the game is put away.
    const seconds = IDLE_BEFORE_DEMO + DEMO_SECONDS / 2
    expect(ladder.update(seconds).demo).not.toBe(null)
    putAway(table(), ladder, seconds, limitsFor(1180, 820))
    // The attended clock stands still while the game rests: the first frame back is at the same second.
    expect(ladder.update(seconds)).toEqual({ glow: 0, demo: null, demoIndex: -1 })
    expect(ladder.update(seconds + IDLE_BEFORE_GLOW - 0.1).glow).toBe(0)
    expect(ladder.update(seconds + IDLE_BEFORE_DEMO - 0.1).demo).toBe(null)
    expect(ladder.update(seconds + IDLE_BEFORE_DEMO + 0.1).demo).not.toBe(null)
  })

  it('hands back the table as its save sets it up, fitted to the surface it is shown on', () => {
    const playing = table()
    playing.press(playing.bumperX, 720)
    playing.lift()
    for (let frame = 0; frame < 20; frame++) playing.step(1 / 60)
    expect(playing.ball.state).not.toBe('resting')
    const small = limitsFor(568, 320)
    const found = putAway(playing, new IdleLadder(0), 3, small)
    expect(found).not.toBe(playing)
    expect(found.ball.state).toBe('resting')
    expect(found.sounds).toEqual([])
    expect(found.busy).toBe(false)
    expect(small.ladyFrom).toBeGreaterThan(LADYBIRD.fromX)
    expect(found.ladybirdX).toBeGreaterThanOrEqual(small.ladyFrom)
    expect(found.ladybirdX).toBeLessThanOrEqual(small.ladyTo)
  })

  it('a crack made inside the throttle window is saved in the frame it is made, and a step of a drag there waits for the window', () => {
    const t = new Table({ ...freshSave(null), wall: freshSave(null).wall.map((brick, place) => (place === 14 ? { kind: 'glass', state: 'whole' } : place > 11 ? null : brick)) }, 1)
    const written: Save[] = []
    const cadence = new SaveCadence(() => written.push(JSON.parse(JSON.stringify(t.toSave()))))
    // A save has just been made: the window is open for the next 400 ms.
    let now = 1000
    cadence.change(now, true)
    expect(written.length).toBe(1)
    // A step of a drag inside the window waits.
    t.press(t.bumperX, 720)
    t.slide(t.bumperX + 40)
    keep(t, cadence, (now += 16))
    expect(written.length).toBe(1)
    t.takenAway()
    keep(t, cadence, (now += 16))
    // The ball cracks the glass: the save is made in that frame, still inside the window.
    const box = t.boxOf(14)
    Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2, y: box.y + box.h + 30, vx: 0, vy: -620 })
    let frames = 0
    while (t.wall[14]?.kind === 'glass' && t.wall[14].state === 'whole' && frames < 30) {
      t.step(1 / 60)
      keep(t, cadence, (now += 16))
      frames += 1
    }
    expect(now - 1000).toBeLessThan(SAVE_THROTTLE_MS)
    expect(t.wall[14]).toEqual({ kind: 'glass', state: 'cracked' })
    expect(written[written.length - 1].wall[14]).toEqual({ kind: 'glass', state: 'cracked' })
    expect(t.dirty).toBe('no')
  })

  it('a heavy ball flicked from a rest off the middle and put away in the air: what storage holds sets up the same table as the one that was parked', () => {
    let t = new Table({ ...freshSave(null), ball: 'heavy', seat: 0.6, shown: ['hot-gate', 'wet-gate'] }, 1)
    const written: unknown[] = []
    const cadence = new SaveCadence(() => written.push(JSON.parse(JSON.stringify(serialize(t.toSave())))))
    let now = 1000
    // The child's first frame writes the table as it was found, with the ball off the middle.
    t.press(t.bumperX, 720)
    keep(t, cadence, (now += 16))
    t.lift()
    keep(t, cadence, (now += 16))
    cadence.settle((now += 16))
    expect((written[written.length - 1] as Save).seat).toBe(0.6)
    // The bumper groans under the heavy ball and then springs it: it leaves a few frames after the lift.
    let frames = 0
    while (t.ball.state !== 'flying' && frames < 60) {
      t.step(1 / 60)
      keep(t, cadence, (now += 16))
      frames += 1
    }
    expect(t.ball.state).toBe('flying')
    for (let frame = 0; frame < 6; frame++) {
      t.step(1 / 60)
      keep(t, cadence, (now += 16))
    }
    // Put away in the air, before anything else has changed: the Mount parks the table and settles the cadence.
    const flying = t
    t = putAway(t, new IdleLadder(0), 3, limitsFor(1180, 820))
    cadence.settle((now += 16))
    const loaded = new Table(deserialize(written[written.length - 1]), 7)
    expect(flying.ball.state).toBe('flying')
    expect(t.ball.x).toBe(t.bumperX)
    expect(loaded.ball.x).toBe(t.ball.x)
    expect(serialize(loaded.toSave())).toEqual(serialize(t.toSave()))
  })

  it('a touch that ended a scene cuts what is sounding before its own answer is played, once', () => {
    const calls: string[] = []
    const audio = { hush: () => void calls.push('hush'), play: () => void calls.push('play') }
    const t = table()
    // Nothing to play and nothing ended: nothing is called.
    voice(t, audio)
    expect(calls).toEqual([])
    t.press(t.bumperX, 720)
    expect(t.sounds.length).toBeGreaterThan(0)
    voice(t, audio)
    expect(calls).toEqual(['play'])
    expect(t.sounds).toEqual([])
    // A touch that ended a scene: the cut comes first, then the touch's own sound, and the flag is put back.
    t.hushed = true
    t.takenAway()
    t.press(t.bumperX, 720)
    voice(t, audio)
    expect(calls).toEqual(['play', 'hush', 'play'])
    expect(t.hushed).toBe(false)
    // With nothing to play the cut is still made.
    t.hushed = true
    voice(t, audio)
    expect(calls).toEqual(['play', 'hush', 'play', 'hush'])
  })
})
