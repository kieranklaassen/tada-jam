import { describe, expect, it } from 'vitest'
import { bodyOf } from './body'
import { PLACES, TWIN_LAG } from './beat'
import { TEMPO } from './config'
import { ratPose } from './cast'
import { BARE, FRAME, GRIP, KNOB, carry, fresh, of, piece, runTo, types } from './drive'
import { BLOB, CAST, CAT_TAIL, DIAL, DIAL_ENDS, RACK, RELEASE, STAGE_BOX, dialEnd, onDial, overRack, rackAt, rackPoint, slotPoint } from './layout'
import { makeRng } from './rng'
import { GHOSTS_KEPT, MOST_FX, POP_EVERY, VOICE_REST, type ToyEvent } from './toy'

const launch = (place: number, by: 'tap' | 'spring', accent = false, second = false): ToyEvent => ({ type: 'launch', place, by, accent, muffled: false, second })

describe('the tap', () => {
  it('is answered when the finger lands: the burst under it, and the blob in the air', () => {
    const toy = fresh()
    runTo(toy, 2.1)
    expect(toy.press(BARE)).toBe('wall')
    const events = toy.take()
    expect(events[0]).toEqual(launch(4, 'tap'))
    expect(events).toContainEqual({ type: 'touch', x: BARE.x, y: BARE.y, answer: 'jump' })
    expect(toy.blob.air).not.toBeNull()
    expect(toy.fx.filter((fx) => fx.kind === 'burst')).toHaveLength(1)
  })

  it('makes a jump that lasts exactly one beat and comes down on the next place', () => {
    const toy = fresh()
    runTo(toy, 2.1)
    toy.press(BARE)
    toy.take()
    expect(toy.blob.air).toMatchObject({ from: 2, to: 3 })
    expect(types(runTo(toy, 2.99))).not.toContain('land')
    expect(toy.liftOf(toy.blob, BLOB.jump)).toBeGreaterThan(0)
    expect(runTo(toy, 3.01)).toContainEqual({ type: 'land', place: 6, second: false })
    expect(toy.blob.air).toBeNull()
    expect(toy.liftOf(toy.blob, BLOB.jump)).toBe(0)
  })

  it('rises to the top of the jump half a beat in, and turns the blob half over by the time it lands', () => {
    const toy = fresh()
    runTo(toy, 2)
    toy.press(BARE)
    runTo(toy, 2.5)
    expect(toy.liftOf(toy.blob, BLOB.jump)).toBeCloseTo(BLOB.jump, 0)
    expect(toy.turnOf(toy.blob)).toBeCloseTo(Math.PI / 2, 1)
    runTo(toy, 2.98)
    expect(toy.turnOf(toy.blob)).toBeGreaterThan(Math.PI * 0.95)
  })

  it('holds an early tap in a crouch and launches as the blob crosses the place', () => {
    const toy = fresh()
    runTo(toy, 3.75)
    toy.press(BARE)
    expect(toy.take()).toEqual([{ type: 'touch', x: BARE.x, y: BARE.y, answer: 'crouch' }])
    expect(toy.blob.air).toBeNull()
    expect(toy.held).toBe(8)
    toy.step(FRAME)
    expect(toy.blob.squash.value).toBeLessThan(0)
    const events = [...toy.take(), ...runTo(toy, 4.02)]
    expect(events).toContainEqual(launch(8, 'tap'))
    expect(toy.blob.air).toMatchObject({ from: 4, to: 5, start: 4 })
    expect(toy.held).toBeNull()
  })

  it('leaves a spring where the blob took off, and the blob jumps there on every later lap without a tap', () => {
    const toy = fresh()
    runTo(toy, 2.1)
    toy.press(BARE)
    expect(toy.take()).toContainEqual({ type: 'lay', place: 4 })
    expect([...toy.springs]).toEqual([4])
    runTo(toy, 4)
    for (const lap of [1, 2, 3]) {
      const events = runTo(toy, 16 * lap + 3.05)
      expect(of(events, 'launch')).toEqual([launch(4, 'spring')])
      expect(of(events, 'land')).toEqual([{ type: 'land', place: 6, second: false }])
      expect(of(events, 'lay')).toEqual([])
      runTo(toy, 16 * lap + 4)
    }
    expect([...toy.springs]).toEqual([4])
  })

  it('accents a spring that is tapped again, for that lap only, and lays no second spring', () => {
    const toy = fresh(120, [8])
    runTo(toy, 3.8)
    toy.press(BARE)
    expect(runTo(toy, 4.05)).toContainEqual(launch(8, 'tap', true))
    runTo(toy, 16 + 3.9)
    expect(runTo(toy, 16 + 4.05)).toContainEqual(launch(8, 'spring'))
    expect([...toy.springs]).toEqual([8])
  })

  it('accents a spring that fired a moment before the tap', () => {
    const toy = fresh(120, [8])
    runTo(toy, 4.1)
    expect(toy.blob.air).toMatchObject({ from: 4, accent: false })
    toy.press(BARE)
    expect(toy.take()).toEqual([{ type: 'accent', place: 8 }, { type: 'touch', x: BARE.x, y: BARE.y, answer: 'jump' }])
    expect(toy.blob.air).toMatchObject({ from: 4, to: 5, accent: true })
  })
})

describe('on the beat and off it', () => {
  it('lands a jump from a beat on the next beat, where the line flashes', () => {
    const toy = fresh()
    runTo(toy, 2.05)
    toy.press(BARE)
    runTo(toy, 3.02)
    expect(toy.flashed[6]).toBeLessThan(0.05)
    expect(toy.fx.some((fx) => fx.kind === 'dust' && !fx.half)).toBe(true)
  })

  it('takes a jump from a half as a jump of its own, which costs nothing: it lands on the next half and its spring stays', () => {
    const toy = fresh()
    runTo(toy, 2.55)
    toy.press(BARE)
    expect(toy.take()).toContainEqual(launch(5, 'tap'))
    const events = runTo(toy, 3.52)
    expect(events).toContainEqual({ type: 'land', place: 7, second: false })
    // It flew over the beat between, which is a rest: no footfall there.
    expect(of(events, 'step')).toEqual([])
    expect([...toy.springs]).toEqual([5])
    expect(toy.pos).toBeGreaterThan(3.5)
  })

  it('has each of the two liked by one of the cast: the pigeon for a landing on a beat, the rat for a jump from a half', () => {
    const beat = fresh()
    runTo(beat, 2.05)
    beat.press(BARE)
    const landing = [...beat.take(), ...runTo(beat, 3.02)]
    expect(landing).toContainEqual({ type: 'cast', who: 'pigeon', act: 'coo' })
    expect(of(landing, 'cast').some((event) => event.who === 'rat')).toBe(false)
    expect(beat.cast.pigeon.puff).toBeLessThan(0.05)

    const half = fresh()
    runTo(half, 2.55)
    half.press(BARE)
    const jump = half.take()
    expect(jump).toContainEqual({ type: 'cast', who: 'rat', act: 'rattle' })
    expect(half.cast.rat.smirk).toBe(0)
    expect(of([...jump, ...runTo(half, 3.52)], 'cast').some((event) => event.who === 'pigeon')).toBe(false)
  })

  it('answers a spring the same as a tap, and no more for many than for one: a coo and a rattle are habits', () => {
    // A spring on every beat: sixteen landings a lap, and the pigeon coos once in two beats.
    const full = fresh(120, Array.from({ length: 16 }, (_, beat) => beat * 2))
    const lap = runTo(full, 16.02)
    const coos = of(lap, 'cast').filter((event) => event.act === 'coo')
    expect(coos.length).toBe(16 / VOICE_REST)
    // Its chest goes out for every one of them.
    runTo(full, 17.02)
    expect(full.cast.pigeon.puff).toBeLessThan(0.05)
    // One spring: the same coo.
    const one = fresh(120, [4])
    expect(of(runTo(one, 3.02), 'cast')).toEqual([{ type: 'cast', who: 'pigeon', act: 'coo' }])
    // And the rat, for a spring on every half.
    const halves = fresh(120, Array.from({ length: 16 }, (_, beat) => beat * 2 + 1))
    expect(of(runTo(halves, 16.02), 'cast').filter((event) => event.act === 'rattle').length).toBe(16 / VOICE_REST)
  })
})

describe('what the cast makes of the loop, and never of the child', () => {
  it('has the cat blink at a spring that fires in a pipe, as at anything hushed', () => {
    const toy = fresh(120, [6], [piece('tunnel', 1)])
    runTo(toy, 2.9)
    expect(toy.blob.hushed).toBe(true)
    toy.cast.cat.blink = Infinity
    const events = runTo(toy, 3.02)
    expect(of(events, 'launch')).toEqual([{ type: 'launch', place: 6, by: 'spring', accent: false, muffled: true, second: false }])
    expect(toy.cast.cat.blink).toBeLessThan(0.05)
  })

  it('has the rat frown when a mouth swallows the blob, and never at the finger that set the mouth down', () => {
    const toy = fresh(120)
    runTo(toy, 1.2)
    // Setting a mouth down, moving it, tapping it and throwing it home: none of these is the hush.
    carry(toy, 'tunnel', 5)
    expect(toy.cast.rat.hush).toBe(Infinity)
    const at = slotPoint(5)
    toy.press(at)
    toy.tap()
    toy.press(at)
    toy.drag(at, slotPoint(6))
    toy.endDrag(true)
    expect(toy.cast.rat.hush).toBe(Infinity)
    runTo(toy, 5.9)
    expect(toy.cast.rat.hush).toBe(Infinity)
    // The blob goes in: the frown starts in that step of the loop, a beat or more after the finger.
    runTo(toy, 6.02)
    expect(toy.blob.hushed).toBe(true)
    expect(toy.cast.rat.hush).toBeLessThan(0.05)
    // It is the same frown every time: nothing in it grows with how often the blob goes in.
    const first = ratPose({ beats: toy.pos, seconds: toy.seconds, tempo: toy.tempo, blob: { x: 0, y: 0 } }, { ...toy.cast.rat, hush: 0.5 })
    runTo(toy, 16 + 6.5)
    const later = ratPose({ beats: toy.pos, seconds: toy.seconds, tempo: toy.tempo, blob: { x: 0, y: 0 } }, { ...toy.cast.rat, hush: 0.5 })
    expect(later.cup).toBe(first.cup)
    // Its eye is on the blob while it frowns, as at any other time: it never turns to the finger.
    const finger = { x: 900, y: 100 }
    toy.press(finger)
    const looking = ratPose({ beats: toy.pos, seconds: toy.seconds, tempo: toy.tempo, blob: { x: 300, y: 700 } }, toy.cast.rat)
    const elsewhere = ratPose({ beats: toy.pos, seconds: toy.seconds, tempo: toy.tempo, blob: { x: 300, y: 100 } }, toy.cast.rat)
    expect(looking.look).not.toEqual(elsewhere.look)
  })
})

describe('a tap that cannot start a jump', () => {
  it('kicks the blob half a turn more in the air, and leaves no spring', () => {
    const toy = fresh()
    runTo(toy, 2.02)
    toy.press(BARE)
    toy.take()
    runTo(toy, 2.3)
    toy.press(BARE)
    expect(toy.take()).toEqual([{ type: 'touch', x: BARE.x, y: BARE.y, answer: 'kick' }])
    expect(toy.blob.air!.kicks).toHaveLength(1)
    expect([...toy.springs]).toEqual([4])
    runTo(toy, 2.98)
    expect(toy.turnOf(toy.blob)).toBeGreaterThan(Math.PI * 1.9)
  })

  it('kicks for every tap in every part of a jump, up to the last three tenths, where the tap is held', () => {
    const toy = fresh(60)
    runTo(toy, 2.02)
    toy.press(BARE)
    toy.take()
    // Early, in the middle, after two kicks already, and as late as a kick can be.
    const taps = [2.21, 2.3, 2.42, 2.5, 2.61, 2.69]
    for (const [i, at] of taps.entries()) {
      runTo(toy, at)
      toy.take()
      toy.press(BARE)
      expect(toy.take(), `the tap at ${at}`).toEqual([{ type: 'touch', x: BARE.x, y: BARE.y, answer: 'kick' }])
      expect(toy.blob.air!.kicks).toHaveLength(i + 1)
    }
    expect([...toy.springs]).toEqual([4])
    // The last kick is over as the blob comes down: it lands having turned half over and half again for each.
    runTo(toy, 2.995)
    expect(toy.turnOf(toy.blob)).toBeCloseTo(Math.PI * (1 + taps.length), 1)
    // In the last three tenths a tap is for the landing.
    const late = fresh(60)
    runTo(late, 2.02)
    late.press(BARE)
    runTo(late, 2.71)
    late.take()
    late.press(BARE)
    expect(late.take()).toEqual([{ type: 'touch', x: BARE.x, y: BARE.y, answer: 'crouch' }])
    expect(late.blob.air!.kicks).toHaveLength(0)
  })

  it('kicks on a jump that already has its accent', () => {
    const toy = fresh(60, [4])
    runTo(toy, 2.05)
    toy.press(BARE)
    expect(of(toy.take(), 'accent')).toHaveLength(1)
    runTo(toy, 2.1)
    toy.take()
    toy.press(BARE)
    expect(toy.take()).toEqual([{ type: 'touch', x: BARE.x, y: BARE.y, answer: 'kick' }])
  })

  it('holds a tap in the last three tenths before a landing, and bounces the blob straight off the place it lands on', () => {
    const toy = fresh()
    runTo(toy, 2.02)
    toy.press(BARE)
    runTo(toy, 2.8)
    toy.take()
    toy.press(BARE)
    expect(toy.take()).toEqual([{ type: 'touch', x: BARE.x, y: BARE.y, answer: 'crouch' }])
    const events = runTo(toy, 3.02)
    expect(types(events)).toEqual(expect.arrayContaining(['land', 'launch', 'lay']))
    expect(toy.blob.air).toMatchObject({ from: 3, to: 4 })
  })

  it('does not fire a spring the blob flies over: the spring ducks', () => {
    const toy = fresh(120, [5, 6])
    const events = runTo(toy, 3.6)
    expect(of(events, 'launch')).toEqual([launch(5, 'spring')])
    expect(toy.ducked[6]).toBeLessThan(0.4)
    expect(toy.fired[6]).toBe(Infinity)
  })

  it('takes a tap while the blob is thrown by a flip as it takes one in a jump: a kick, and in the last three tenths a tap held for the landing', () => {
    const toy = fresh(120, [], [piece('flip', 4)]), plain = fresh(120, [], [piece('flip', 4)])
    runTo(toy, 4.3)
    expect(toy.blob.flight).not.toBeNull()
    toy.take()
    toy.press(BARE)
    expect(toy.take()).toContainEqual({ type: 'touch', x: BARE.x, y: BARE.y, answer: 'kick' })
    expect(toy.blob.flight!.kicks).toHaveLength(1)
    expect(toy.held).toBeNull()
    // The kick is drawn: three tenths of a beat on, the thrown body has turned half a turn more than one not kicked.
    runTo(toy, 4.62)
    runTo(plain, 4.62)
    expect(toy.kicked(toy.blob)).toBeCloseTo(Math.PI, 5)
    expect(Math.abs(bodyOf(toy, toy.blob).turn - bodyOf(plain, plain.blob).turn)).toBeCloseTo(Math.PI, 5)
    expect(toy.springs.size).toBe(0)
    // In the last three tenths the tap is for the place it comes down on: it bounces straight off the far side.
    runTo(toy, 4.8)
    toy.take()
    toy.press(BARE)
    expect(toy.take()).toContainEqual({ type: 'touch', x: BARE.x, y: BARE.y, answer: 'crouch' })
    expect(toy.blob.flight!.kicks).toHaveLength(1)
    runTo(toy, 5.05)
    expect(toy.blob.ceiling).toBe(true)
    expect(toy.blob.air).toMatchObject({ from: 5 })
    expect([...toy.springs]).toEqual([10 + 32])
  })

  it('sets nothing on a blob that is flat on a wall or on the rim of a mouth: the tap is the hiss and the burst, and the body is as it was', () => {
    const onWall = fresh(120, [], [piece('wall', 3)])
    runTo(onWall, 3.2)
    expect(onWall.blob.stuck).not.toBeNull()
    const onRim = fresh(120, [4], [piece('tunnel', 3)])
    runTo(onRim, 3.1)
    expect(onRim.blob.perch).toBeGreaterThan(onRim.pos)
    for (const toy of [onWall, onRim]) {
      toy.take()
      const before = { value: toy.blob.squash.value, speed: toy.blob.squash.speed, body: bodyOf(toy, toy.blob) }
      toy.press(BARE)
      expect(toy.take()).toEqual([{ type: 'touch', x: BARE.x, y: BARE.y, answer: 'again' }])
      expect({ value: toy.blob.squash.value, speed: toy.blob.squash.speed, body: bodyOf(toy, toy.blob) }).toEqual(before)
      expect(toy.held).toBeNull()
      expect(toy.fx.some((fx) => fx.kind === 'burst' && fx.age === 0)).toBe(true)
    }
  })
})

describe('nothing fails, scores, counts or hurries', () => {
  it('never changes the tempo by itself, however long and however hard the wall is tapped', () => {
    const toy = fresh(100)
    const rng = makeRng(5)
    for (let i = 0; i < 60 * 60; i++) {
      if (rng.next() < 0.08) toy.press({ x: 300 + rng.next() * 30, y: 40 + rng.next() * 60 })
      toy.step(FRAME)
    }
    expect(toy.tempo).toBe(100)
  })

  it('keeps the loop running through everything: the blob is never stopped and never sent back', () => {
    const toy = fresh(120, [], [piece('wall', 3), piece('flip', 6), piece('splitter', 9), piece('tunnel', 12)])
    const rng = makeRng(9)
    let last = 0
    for (let i = 0; i < 60 * 40; i++) {
      if (rng.next() < 0.1) toy.press({ x: 300 + rng.next() * 30, y: 40 + rng.next() * 60 })
      toy.step(FRAME)
      expect(toy.pos).toBeGreaterThan(last)
      expect(toy.pos - last).toBeCloseTo((FRAME * 120) / 60, 9)
      last = toy.pos
    }
  })

  it('holds nothing that counts the child: no score, no attempts, no best, no clock of its own', () => {
    const toy = fresh()
    const names = Object.keys(toy).join(' ').toLowerCase()
    for (const word of ['score', 'point', 'attempt', 'best', 'streak', 'combo', 'count', 'miss', 'fail', 'timer', 'level', 'star']) expect(names, word).not.toContain(word)
    expect(Object.keys(toy.toSave()).sort()).toEqual(['pieces', 'springs', 'tempo'])
  })

  it('plays no time on a frame of no length', () => {
    const toy = fresh()
    toy.step(0)
    toy.step(-1)
    toy.step(Number.NaN)
    expect(toy.pos).toBe(0)
    expect(toy.take()).toEqual([])
  })
})

describe('the release', () => {
  const pull = (toy: ReturnType<typeof fresh>, share: number) => {
    toy.press(GRIP)
    toy.drag(GRIP, { x: GRIP.x, y: GRIP.y + RELEASE.travel * share })
  }

  it('takes hold without a jump, and is drawn down under the finger', () => {
    const toy = fresh()
    runTo(toy, 2.1)
    expect(toy.press(GRIP)).toBe('release')
    expect(toy.take()).toEqual([{ type: 'release', act: 'grab' }])
    expect(toy.blob.air).toBeNull()
    toy.drag(GRIP, { x: GRIP.x, y: GRIP.y + RELEASE.travel * 0.5 })
    expect(toy.release.pull).toBeCloseTo(0.5, 6)
    expect(toy.gripAt().drop).toBeCloseTo(RELEASE.travel * 0.5, 6)
  })

  it('is touched where it is drawn: swinging, pulled down, and springing back', () => {
    const toy = fresh()
    pull(toy, 1)
    toy.endDrag(false)
    // Let go, it is still most of the way down for a moment, and that is where a finger finds it.
    toy.step(FRAME)
    const grip = toy.gripAt()
    expect(grip.drop).toBeGreaterThan(RELEASE.travel * 0.5)
    expect(toy.under({ x: GRIP.x + grip.sway, y: GRIP.y + grip.drop })).toBe('release')
    expect(toy.under({ x: GRIP.x, y: GRIP.y - 30 })).toBe('wall')
    for (let i = 0; i < 240; i++) toy.step(FRAME)
    expect(toy.under(GRIP)).toBe('release')
  })

  it('clears every spring at once in the state when pulled past the catch and let go, and takes them off the wall one by one', () => {
    const toy = fresh(120, [2, 9, 20, 40])
    runTo(toy, 1.2)
    pull(toy, 0.8)
    toy.endDrag(true)
    expect(toy.springs.size).toBe(0)
    expect(toy.toSave().springs).toEqual([])
    expect(toy.changed).toBe(2)
    expect(toy.standing().length).toBe(4)
    const events = toy.take()
    expect(events).toContainEqual({ type: 'release', act: 'clack' })
    expect(events).toContainEqual({ type: 'cast', who: 'cat', act: 'fur' })
    const pops: number[] = []
    for (let i = 0; i < 60 && toy.clearing; i++) {
      toy.step(FRAME)
      pops.push(...of(toy.take(), 'pop').map((event) => event.place))
    }
    // From the place just ahead of the blob and on round the ring, the ceiling's with the floor's.
    expect(pops).toEqual([8, 9, 20, 2])
    expect(toy.clearing).toBeNull()
  })

  it('takes a full course down in under four seconds', () => {
    const all = Array.from({ length: PLACES * 2 }, (_, sp) => sp)
    const toy = fresh(120, all)
    pull(toy, 1)
    toy.endDrag(true)
    let seconds = 0
    // To the last spring out of the frame, not only off the wall.
    while (toy.clearing || toy.fallers.length > 0) {
      toy.step(FRAME)
      seconds += FRAME
    }
    expect(seconds).toBeLessThan(4)
    expect(seconds).toBeGreaterThan(1)
    expect(PLACES * 2 * POP_EVERY).toBeLessThan(4)
  })

  it('gives way to a touch: what is still on the wall drops at once without a sound, and the touch is an ordinary tap', () => {
    const toy = fresh(120, Array.from({ length: 32 }, (_, sp) => sp))
    runTo(toy, 2.05)
    pull(toy, 1)
    toy.endDrag(true)
    for (let i = 0; i < 6; i++) toy.step(FRAME)
    toy.take()
    expect(toy.clearing).not.toBeNull()
    toy.press(BARE)
    expect(toy.clearing).toBeNull()
    expect(toy.sceneEnded).toBe(true)
    expect(toy.standing()).toEqual([])
    const events = toy.take()
    expect(of(events, 'pop')).toEqual([])
    expect(types(events)).toContain('touch')
  })

  it('snaps back with a tock and clears nothing when let go short of the catch', () => {
    const toy = fresh(120, [4])
    pull(toy, 0.3)
    toy.take()
    toy.endDrag(true)
    expect(toy.take()).toEqual([{ type: 'release', act: 'tock' }])
    expect([...toy.springs]).toEqual([4])
    expect(toy.changed).toBe(0)
  })

  it('pulls nothing when the finger is taken away, however far it had pulled', () => {
    const toy = fresh(120, [4])
    pull(toy, 1)
    toy.take()
    toy.endDrag(false)
    expect(toy.take()).toEqual([])
    expect([...toy.springs]).toEqual([4])
  })

  it('swings with a clink when tapped, and clacks its catch when there is no spring to clear', () => {
    const toy = fresh()
    toy.press(GRIP)
    toy.take()
    toy.tap()
    expect(toy.take()).toEqual([{ type: 'release', act: 'clink' }])
    expect(toy.release.swing.speed).toBeGreaterThan(0)
    pull(toy, 1)
    toy.take()
    toy.endDrag(true)
    expect(toy.take()).toEqual([{ type: 'release', act: 'clack' }])
    expect(toy.clearing).toBeNull()
    expect(toy.cast.cat.ear).toBe(0)
  })
})

describe('the dial', () => {
  /** Turns the knob by an angle, in small steps round its middle, as a finger does. */
  const turn = (toy: ReturnType<typeof fresh>, by: number): ToyEvent[] => {
    const r = 40, steps = Math.max(1, Math.ceil(Math.abs(by) / 0.05))
    for (let i = 1; i <= steps; i++) {
      const a = (by * i) / steps
      toy.drag(KNOB, { x: DIAL.x + r * Math.cos(a), y: DIAL.y + r * Math.sin(a) })
    }
    return toy.take()
  }
  const sweep = DIAL.to - DIAL.from

  it('sets the tempo wherever the child turns it, between its two ends, and clicks over its steps', () => {
    const toy = fresh(100)
    expect(toy.press(KNOB)).toBe('dial')
    const events = turn(toy, sweep * 0.2)
    expect(toy.tempo).toBe(120)
    expect(of(events, 'dial').length).toBe(4)
    toy.endDrag(true)
    expect(toy.changed).toBe(2)
    expect(toy.tempo).toBe(120)
  })

  it('stops at each end, and a finger that turns on past an end turns back from the end at once', () => {
    const toy = fresh(100)
    toy.press(KNOB)
    turn(toy, sweep)
    expect(toy.tempo).toBe(TEMPO.fastest)
    turn(toy, -sweep * 0.1)
    expect(Math.abs(toy.tempo - (TEMPO.fastest - 10))).toBeLessThanOrEqual(1)
    // Off the fast end, the pigeon has to shake its head straight.
    expect(toy.cast.pigeon.shake).toBe(0)
    turn(toy, -sweep * 2)
    expect(toy.tempo).toBe(TEMPO.slowest)
  })

  it('speeds the loop at once and keeps the blob where it is', () => {
    const toy = fresh(60)
    runTo(toy, 3.3)
    const at = toy.pos
    toy.press(KNOB)
    turn(toy, sweep * 0.6)
    expect(toy.pos).toBe(at)
    toy.step(1 / 60)
    expect(toy.pos - at).toBeCloseTo(toy.tempo / 3600, 9)
  })

  it('goes back to where the finger found it when the turn is taken away, and a save in the middle of a turn keeps the tempo the finger found', () => {
    const toy = fresh(100)
    toy.press(KNOB)
    turn(toy, sweep * 0.3)
    expect(toy.tempo).toBe(130)
    expect(toy.toSave().tempo).toBe(100)
    toy.endDrag(false)
    expect(toy.tempo).toBe(100)
  })

  it('answers a tap with a knock and leaves the tempo alone', () => {
    const toy = fresh(100)
    toy.press(KNOB)
    toy.tap()
    expect(toy.take()).toEqual([{ type: 'dial', act: 'knock', tempo: 100 }])
    expect(toy.tempo).toBe(100)
    expect(toy.blob.air).toBeNull()
  })
})

describe('the cast', () => {
  it('answers a poke as itself, and the tap is still a tap on the wall', () => {
    for (const who of ['pigeon', 'rat', 'cat', 'camera', 'neighbour'] as const) {
      const toy = fresh()
      runTo(toy, 2.1)
      const box = CAST[who].box
      toy.press({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
      const events = toy.take()
      expect(events).toContainEqual({ type: 'cast', who, act: 'poke' })
      expect(types(events)).toEqual(expect.arrayContaining(['launch', 'touch']))
      expect(toy.cast[who].poke).toBe(0)
    }
  })

  it('pokes the camera where it is drawn: on its lens when it has turned down after the blob, and not where it pointed before', () => {
    const lens = (pan: number) => ({ x: CAST.camera.x + 112 * Math.cos(pan), y: CAST.camera.y + 112 * Math.sin(pan) })
    for (const beats of [1, 4.2, 9, 12.5, 14, 15.5]) {
      const toy = fresh()
      runTo(toy, beats)
      toy.take()
      const blob = bodyOf(toy, toy.blob), pan = Math.atan2(blob.y - CAST.camera.y, blob.x - CAST.camera.x)
      expect(toy.whoAt(lens(pan)), `${beats} beats`).toBe('camera')
      toy.press(lens(pan))
      expect(toy.take(), `${beats} beats`).toContainEqual({ type: 'cast', who: 'camera', act: 'poke' })
    }
    // Turned down to the foot of the ring, its lens is far from where it is when it points level: a touch there
    // is a touch on bare wall.
    const toy = fresh()
    runTo(toy, 14)
    toy.take()
    expect(toy.whoAt(lens(0))).toBeNull()
    toy.press(lens(0))
    expect(of(toy.take(), 'cast')).toEqual([])
    // A piece let go on the lens where it is now is dealt with by nobody else: it is on the camera, which has no
    // manner of its own for a piece, so it sticks and slides like one let go on bare wall.
    const blob = bodyOf(toy, toy.blob), pan = Math.atan2(blob.y - CAST.camera.y, blob.x - CAST.camera.x)
    expect(Math.abs(lens(pan).y - lens(0).y)).toBeGreaterThan(80)
    toy.press(rackPoint(0))
    toy.drag(rackPoint(0), lens(pan))
    toy.endDrag(true)
    expect(of(toy.take(), 'piece').map((event) => event.act)).toEqual(['lift', 'stick'])
  })

  it('takes up its idle habits in turn, each by its own count, and never one twice running', () => {
    const toy = fresh()
    const seen: Record<string, number[]> = { pigeon: [], rat: [], cat: [], neighbour: [] }
    for (let i = 0; i < 60 * 120; i++) {
      toy.step(FRAME)
      for (const who of ['pigeon', 'rat', 'cat', 'neighbour'] as const) if (toy.cast[who].habit.age === 0) seen[who].push(toy.cast[who].habit.kind)
    }
    for (const kinds of Object.values(seen)) {
      expect(kinds.length).toBeGreaterThan(5)
      for (let i = 1; i < kinds.length; i++) expect(kinds[i]).toBe(1 - kinds[i - 1])
    }
  })
})

describe('found as left', () => {
  it('keeps the loop as built and not the run: the springs, the pieces and the tempo come back, and the blob starts its lap', () => {
    const toy = fresh(110, [], [piece('drum', 3)])
    runTo(toy, 2.05)
    toy.press(BARE)
    runTo(toy, 5.3)
    const save = toy.toSave()
    expect(save).toEqual({ tempo: 110, springs: [4], pieces: [{ kind: 'drum', beat: 3, ceiling: false }] })
    const again = toy.settled(7)
    expect(again.pos).toBe(0)
    expect(again.toSave()).toEqual(save)
    expect(again.take()).toEqual([])
  })

  it('marks a laid spring for a save at the throttle, and nothing when a tap changes nothing', () => {
    const toy = fresh()
    runTo(toy, 2.05)
    toy.press(BARE)
    expect(toy.changed).toBe(1)
    toy.changed = 0
    runTo(toy, 2.4)
    toy.press(BARE)
    expect(toy.changed).toBe(0)
  })

  it('is the same loop for the same seed', () => {
    const play = (seed: number) => {
      const toy = fresh(120, [3], [piece('splitter', 5), piece('wall', 9)], seed)
      const rng = makeRng(3)
      const heard: ToyEvent[] = []
      for (let i = 0; i < 1200; i++) {
        if (rng.next() < 0.05) toy.press({ x: 300 + rng.next() * 30, y: 60 })
        toy.step(FRAME)
        heard.push(...toy.take())
      }
      return { heard, fx: toy.fx.map((fx) => [fx.kind, fx.x, fx.y]), habits: [toy.cast.pigeon.habit, toy.cast.rat.habit, toy.cast.cat.habit] }
    }
    expect(play(4)).toEqual(play(4))
  })
})

describe('a long, rough visit', () => {
  it('keeps every number finite and every list short through three minutes of taps, pulls, turns and pieces', () => {
    const toy = fresh(100)
    const rng = makeRng(77)
    const finite = (value: unknown, path: string, depth = 0): void => {
      if (typeof value === 'number') {
        // An age of "never" is the one number that is meant to be without end.
        if (value !== Infinity && value !== -Infinity) expect(Number.isFinite(value), path).toBe(true)
      } else if (value && typeof value === 'object' && depth < 6) for (const [key, inner] of value instanceof Map || value instanceof Set ? [...value.entries()].map(([k, v]) => [String(k), v] as const) : Object.entries(value)) finite(inner, `${path}.${key}`, depth + 1)
    }
    let most = 0
    for (let i = 0; i < 60 * 180; i++) {
      const roll = rng.next()
      const at = { x: rng.next() * 1180, y: rng.next() * 820 }
      if (roll < 0.06) {
        toy.press(at)
        const move = rng.next()
        if (move < 0.4) toy.tap()
        else {
          const to = { x: rng.next() * 1180, y: rng.next() * 820 }
          toy.drag(at, to)
          if (move < 0.9) toy.endDrag(true)
          else toy.endDrag(false)
        }
      }
      toy.step(rng.next() < 0.02 ? 0.1 : FRAME)
      toy.take()
      most = Math.max(most, toy.fx.length)
      if (i % 600 === 0) finite(toy, 'toy')
    }
    expect(toy.ghosts.length).toBeLessThanOrEqual(GHOSTS_KEPT)
    expect(most).toBeLessThanOrEqual(MOST_FX + 6)
    expect(toy.runners.length).toBeLessThanOrEqual(2)
    expect(toy.tempo).toBeGreaterThanOrEqual(TEMPO.slowest)
    expect(toy.tempo).toBeLessThanOrEqual(TEMPO.fastest)
    expect(toy.pieces.size).toBeLessThanOrEqual(32)
    expect(TWIN_LAG).toBeCloseTo(1 / 3, 9)
  })
})

describe('the snail and the hare beside the dial', () => {
  it('are paint and not buttons: a tap on one is a tap on the wall, the knob rocks towards that end with its knock, and the tempo stays', () => {
    for (const [name, end] of [['snail', -1], ['hare', 1]] as const) {
      const toy = fresh(100), at = DIAL_ENDS[name]
      runTo(toy, 1.1)
      toy.take()
      expect(toy.under(at)).toBe('wall')
      toy.press(at)
      toy.tap()
      const events = toy.take()
      // The wall's answer: the burst under the finger and the blob's jump.
      expect(of(events, 'touch')).toHaveLength(1)
      expect(toy.fx.some((fx) => fx.kind === 'burst' && fx.x === at.x && fx.y === at.y)).toBe(true)
      expect(toy.blob.air !== null || toy.held !== null).toBe(true)
      // Its own: the knob rocks that way and knocks, and nothing is turned.
      expect(of(events, 'dial')).toEqual([{ type: 'dial', act: 'knock', tempo: 100 }])
      expect(Math.sign(toy.dial.wobble.speed)).toBe(end)
      toy.step(FRAME)
      expect(Math.sign(toy.dial.wobble.value)).toBe(end)
      expect(toy.tempo).toBe(100)
      expect(toy.toSave().tempo).toBe(100)
    }
    // A tap on bare wall rocks no knob.
    const toy = fresh(100)
    toy.press(BARE)
    toy.tap()
    expect(of(toy.take(), 'dial')).toEqual([])
  })

  it('stand on the stage, outside the dial a finger turns, and clear of the rack and the cat', () => {
    for (const at of [DIAL_ENDS.snail, DIAL_ENDS.hare]) {
      expect(dialEnd(at)).not.toBe(0)
      expect(onDial(at)).toBe(false)
      expect(Math.hypot(at.x - DIAL.x, at.y - DIAL.y) - DIAL_ENDS.reach).toBeGreaterThan(DIAL.r)
      expect(at.x + DIAL_ENDS.reach).toBeLessThanOrEqual(STAGE_BOX.w)
      expect(at.y + DIAL_ENDS.reach).toBeLessThanOrEqual(STAGE_BOX.h)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const edge = { x: at.x + dx * DIAL_ENDS.reach, y: at.y + dy * DIAL_ENDS.reach }
        expect(rackAt(edge)).toBeNull()
        expect(overRack(edge)).toBe(false)
        expect(edge.x >= CAT_TAIL.x && edge.x <= CAT_TAIL.x + CAT_TAIL.w && edge.y >= CAT_TAIL.y && edge.y <= CAT_TAIL.y + CAT_TAIL.h).toBe(false)
      }
    }
    expect(RACK.under).toBeGreaterThan(0)
  })
})
