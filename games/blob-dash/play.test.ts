import { describe, expect, it } from 'vitest'
import { BEATS } from './beat'
import { BARE, FRAME, GRIP, KNOB, piece } from './drive'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW } from './guidance'
import { by } from './body'
import { DIAL, RACK, RELEASE, WALL, boxOf, frame, rackBox, rackFoot, rackPoint, slotPoint } from './layout'
import { CORNER } from './overlay'
import { KINDS, type Piece } from './pieces'
import { Play } from './play'
import { Toy, type ToyEvent } from './toy'

// The rules of a visit, held where the Mount cannot get them wrong: whose a
// finger is, what a taken-away pointer does, what counts as a touch to the
// idle ladder, what a put-away leaves, and when a scene's sound is closed.

/** A surface the size of the stage: one CSS pixel is one stage unit, so a point of the wall is a point of the surface. */
const W = 1180, H = 820
const CORNER_AT = { x: W - CORNER / 2, y: CORNER / 2 }

/** Everything a loop holds, as plain data, with "never" kept apart from nothing. */
function whole(toy: Toy): string {
  return JSON.stringify(toy, (_key, value: unknown) => {
    if (value === Infinity) return 'never'
    if (value === -Infinity) return 'never before'
    if (value instanceof Set) return [...value]
    if (value instanceof Map) return [...value.entries()]
    if (typeof value === 'function') return 'does'
    return value
  })
}

/** A visit with a clock of its own: frames advance it, and a finger lands at its time. */
function visit(tempo = 100, springs: number[] = [], pieces: Piece[] = [], seed = 1, width = W, height = H) {
  const play = new Play({ tempo, springs, pieces }, seed, 0)
  play.size(frame(width, height), width, height)
  const heard: ToyEvent[] = []
  const time = { seconds: 0 }
  const listen = () => {
    // What the Mount does after every call: the voice is asked for in that touch or that frame.
    heard.push(...peek(play))
    return play.voice()
  }
  return {
    play,
    time,
    heard,
    listen,
    frames(count: number) {
      for (let i = 0; i < count; i++) {
        time.seconds += FRAME
        play.frame(time.seconds * 1000, FRAME, time.seconds)
        listen()
      }
    },
    down: (id: number, at: { x: number; y: number }) => { const grown = play.down(id, at, time.seconds * 1000, time.seconds); listen(); return grown },
    move: (id: number, at: { x: number; y: number }) => { const grown = play.move(id, at); listen(); return grown },
    up: (id: number, at: { x: number; y: number }) => { const grown = play.up(id, at, time.seconds * 1000); listen(); return grown },
    cancel: (id: number) => { const grown = play.cancel(id); listen(); return grown },
  }
}

/** The events waiting in a loop, read without taking them. */
function peek(play: Play): ToyEvent[] {
  const events = play.toy.take()
  // Put back, so the voice is made from them.
  for (const event of events) (play.toy as unknown as { events: ToyEvent[] }).events.push(event)
  return events
}

const EVERY = Array.from({ length: 64 }, (_, sp) => sp)
/** The sizes a touch and a clear-out are held at: a tablet lying, a smaller one, and a tablet standing. */
const SIZES = [[1180, 820], [1024, 768], [820, 1180]] as const
const seconds = (s: number): number => Math.round(s / FRAME)

/** A stand-in for an audio context that keeps the gains built on it. */
function fakeContext() {
  const gains: { value: number; connected: boolean }[] = []
  const param = () => ({ value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} })
  const node = () => ({ connect: (to: unknown) => to, disconnect() {}, start() {}, stop() {}, onended: null as null | (() => void) })
  const context = {
    currentTime: 0,
    sampleRate: 8000,
    createGain() {
      const record = { value: 1, connected: false }
      gains.push(record)
      return {
        gain: { get value() { return record.value }, set value(v: number) { record.value = v }, setValueAtTime(v: number) { record.value = v }, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
        connect(to: unknown) { record.connected = true; return to },
        disconnect() { record.connected = false },
      }
    },
    createOscillator: () => ({ ...node(), type: 'sine', frequency: param() }),
    createBufferSource: () => ({ ...node(), buffer: null, loop: false }),
    createBiquadFilter: () => ({ ...node(), type: 'bandpass', Q: param(), frequency: param() }),
    createBuffer: (_channels: number, size: number) => ({ getChannelData: () => new Float32Array(size) }),
  }
  return { context: context as unknown as AudioContext, out: {} as AudioNode, gains }
}

describe('the grown-up\'s corner', () => {
  it('answers a finger with nothing: no jump, no sound, nothing taken hold of, and the finger is handed to the overlay', () => {
    const v = visit(100, [4])
    v.frames(30)
    const before = v.heard.length, was = whole(v.play.toy)
    expect(v.down(1, CORNER_AT)).toBe(true)
    expect(v.move(1, { x: CORNER_AT.x - 4, y: CORNER_AT.y + 4 })).toBe(true)
    expect(v.up(1, CORNER_AT)).toBe(true)
    expect(v.heard.length).toBe(before)
    expect(whole(v.play.toy)).toBe(was)
    expect(v.play.touching).toBe(false)
  })

  it('is not a touch to the idle ladder: the glow and the hand stay as they were', () => {
    const v = visit()
    v.frames(seconds(IDLE_BEFORE_DEMO + 1))
    expect(v.play.guidance?.demo).not.toBeNull()
    const glow = v.play.guidance!.glow
    v.down(1, CORNER_AT)
    v.frames(1)
    expect(v.play.guidance!.glow).toBeCloseTo(glow, 1)
    expect(v.play.guidance!.demo).not.toBeNull()
    v.up(1, CORNER_AT)
    v.frames(1)
    expect(v.play.guidance!.demo).not.toBeNull()
  })

  it('takes one finger at a time, and a finger beside it on the wall is still the child\'s', () => {
    const v = visit()
    expect(v.down(1, CORNER_AT)).toBe(true)
    expect(v.down(2, { x: CORNER_AT.x + 6, y: CORNER_AT.y })).toBe(false)
    expect(v.heard).toEqual([])
    expect(v.down(3, BARE)).toBe(false)
    expect(v.heard.map((event) => event.type)).toContain('touch')
  })
})

describe('the idle ladder', () => {
  it('is not taken back by anything the loop or the cast does by itself: springs fire, the cast keeps time and has its habits, and the hand still comes', () => {
    const v = visit(160, [0, 4, 8, 12, 16, 20, 24, 28], [piece('drum', 3), piece('chime', 9)])
    v.frames(seconds(IDLE_BEFORE_GLOW + 1.4))
    // In that time springs have fired and the cast has answered them.
    expect([...new Set(v.heard.map((event) => event.type))]).toContain('cast')
    expect(v.heard.some((event) => event.type === 'launch' && event.by === 'spring')).toBe(true)
    expect(v.play.guidance!.glow).toBeGreaterThan(0.9)
    v.frames(seconds(IDLE_BEFORE_DEMO - IDLE_BEFORE_GLOW))
    expect(v.play.guidance!.demo).not.toBeNull()
  })

  it('goes back to the bottom at a touch, and stays there under a finger that holds or drags', () => {
    const v = visit()
    v.frames(seconds(IDLE_BEFORE_DEMO + 1))
    v.down(1, rackPoint(1))
    v.frames(1)
    expect(v.play.guidance).toMatchObject({ glow: 0, demo: null })
    // A slow drag of a piece, far longer than the ladder waits.
    v.move(1, { x: 500, y: 500 })
    v.frames(seconds(IDLE_BEFORE_DEMO + 2))
    expect(v.play.guidance).toMatchObject({ glow: 0, demo: null })
    v.up(1, { x: 500, y: 500 })
  })

  it('stays at the bottom while the springs a finger pulled come down: nobody is shown a hand over the clear-out', () => {
    const v = visit(60, EVERY)
    v.down(1, GRIP)
    v.move(1, { x: GRIP.x, y: GRIP.y + RELEASE.travel })
    v.up(1, { x: GRIP.x, y: GRIP.y + RELEASE.travel })
    expect(v.play.toy.clearing).not.toBeNull()
    let shown = 0
    while (v.play.toy.clearing) {
      v.frames(1)
      shown = Math.max(shown, v.play.guidance!.glow)
    }
    expect(shown).toBe(0)
  })

  it('climbs over the pigeon\'s lap, which starts by itself: on a ring with a spring on every beat the carry is still shown', () => {
    const v = visit(160, Array.from({ length: BEATS }, (_, beat) => beat * 2))
    // No finger, ever. The pigeon flies half of every lap from the second on.
    let laps = 0, flying = false, glowInLap = false
    const shown = new Set<number>()
    for (let i = 0; i < 60 * 40; i++) {
      v.frames(1)
      const lap = v.play.toy.lap !== null
      if (lap && !flying) laps += 1
      flying = lap
      if (lap && v.play.guidance!.glow > 0) glowInLap = true
      if (v.play.guidance!.demo !== null) shown.add(v.play.guidance!.demoIndex)
    }
    expect(laps).toBeGreaterThan(4)
    expect(glowInLap).toBe(true)
    // The tap is the hand's first showing and the carry its second.
    expect([...shown]).toEqual(expect.arrayContaining([0, 1]))
  })
})

describe('a pointer the browser takes away', () => {
  it('lays no piece: one carried from the rack over a beat is not set down', () => {
    const v = visit()
    v.down(1, rackPoint(0))
    v.move(1, slotPoint(5))
    expect(v.play.toy.hand).not.toBeNull()
    v.cancel(1)
    expect(v.play.toy.hand).toBeNull()
    expect(v.play.toy.toSave().pieces).toEqual([])
    expect(v.play.toy.changed).toBe(0)
  })

  it('moves no piece: one carried from its beat over another, or off the track, is back where it came from', () => {
    for (const to of [slotPoint(9), { x: 130, y: 300 }, rackPoint(3)]) {
      const v = visit(100, [], [piece('wall', 3)])
      v.down(1, slotPoint(3))
      v.move(1, to)
      v.cancel(1)
      expect(v.play.toy.toSave().pieces).toEqual([{ kind: 'wall', beat: 3, ceiling: false }])
      expect(v.play.toy.changed).toBe(0)
    }
  })

  it('pulls nothing and turns nothing: the springs stay and the tempo goes back', () => {
    const v = visit(100, [4, 9])
    v.down(1, GRIP)
    v.move(1, { x: GRIP.x, y: GRIP.y + RELEASE.travel })
    v.cancel(1)
    expect(v.play.toy.clearing).toBeNull()
    expect(v.play.toy.toSave().springs).toEqual([4, 9])
    v.down(2, KNOB)
    v.move(2, { x: DIAL.x, y: DIAL.y + 40 })
    expect(v.play.toy.tempo).not.toBe(100)
    v.cancel(2)
    expect(v.play.toy.tempo).toBe(100)
  })

  it('is no tap: a press on a control that is taken away does not knock it', () => {
    const v = visit()
    v.down(1, KNOB)
    const before = v.heard.length
    v.cancel(1)
    expect(v.heard.length).toBe(before)
    expect(v.play.toy.dial.held).toBe(false)
  })
})

describe('a second finger', () => {
  it('is a tap where it lands on wall, and nothing where it lands on something a finger takes hold of', () => {
    const v = visit(100, [], [piece('drum', 6)])
    v.down(1, rackPoint(2))
    v.move(1, { x: 500, y: 520 })
    const hand = v.play.toy.hand
    for (const at of [rackPoint(4), slotPoint(6), KNOB, GRIP]) {
      const before = v.heard.length
      v.down(2, at)
      v.up(2, at)
      expect(v.heard.length).toBe(before)
    }
    expect(v.play.toy.hand).toBe(hand)
    v.down(3, BARE)
    expect(v.heard.at(-1)).toMatchObject({ type: 'touch' })
    // And the first finger still has its piece.
    expect(v.play.toy.hand).toBe(hand)
  })
})

describe('a load', () => {
  it('starts nothing and sounds nothing: no scene, no one mid-answer, nothing in a hand, no mark on the wall, no voice waiting', () => {
    const v = visit(120, EVERY, [piece('wall', 3), piece('splitter', 6)])
    const toy = v.play.toy
    expect(v.play.voice()).toBeNull()
    expect(toy.clearing).toBeNull()
    expect(toy.lap).toBeNull()
    expect(toy.hand).toBeNull()
    expect(toy.fx).toEqual([])
    expect(toy.ghosts).toEqual([])
    expect(toy.runners).toHaveLength(1)
    expect(toy.sceneEnded).toBe(false)
    expect(v.play.guidance).toBeNull()
    for (const who of Object.values(toy.cast)) for (const age of Object.values(who)) if (typeof age === 'number') expect(age === Infinity || age === 0).toBe(true)
    for (const ages of [toy.fired, toy.ducked, toy.laid, toy.flashed, toy.set, toy.rack]) expect(ages.every((age) => age === Infinity)).toBe(true)
  })
})

describe('a put-away', () => {
  /** A visit in the middle of everything: twins on a full ring, a storm of taps, a piece in the hand. */
  const busy = () => {
    const v = visit(150, EVERY, [piece('splitter', 2), piece('tunnel', 5), piece('wall', 11), piece('flip', 14)], 4)
    for (let i = 0; i < 400; i++) {
      if (i % 9 === 0) { v.down(7, BARE); v.up(7, BARE) }
      v.frames(1)
    }
    v.down(1, slotPoint(11))
    v.move(1, { x: 400, y: 420 })
    return v
  }

  it('leaves what a load would find, whatever was under way: parked and loaded are one state', () => {
    const v = busy()
    expect(v.play.toy.hand).not.toBeNull()
    const saved = v.play.toy.settled(4).toSave()
    v.play.rest(v.time.seconds)
    expect(whole(v.play.toy)).toBe(whole(new Toy(saved, 4)))
    expect(v.play.toy.toSave().pieces).toContainEqual({ kind: 'wall', beat: 11, ceiling: false })
    expect(v.play.touching).toBe(false)
  })

  it('closes every sound and makes none of its own', () => {
    const v = busy(), fake = fakeContext()
    // A voice is sounding and another is still waiting for the browser.
    v.play.down(9, BARE, 0, v.time.seconds)
    const waiting = v.play.voice()
    expect(waiting).not.toBeNull()
    v.play.down(10, { x: BARE.x + 20, y: BARE.y }, 0, v.time.seconds)
    v.play.voice()?.(fake.context, fake.out, 0)
    expect(v.play.bus.sounding).toBeGreaterThan(0)
    v.play.rest(v.time.seconds)
    expect(v.play.bus.sounding).toBe(0)
    expect(v.play.voice()).toBeNull()
    // The voice that was waiting never plays.
    const built = fake.gains.length
    waiting!(fake.context, fake.out, 0)
    expect(fake.gains.length).toBe(built)
  })

  it('takes the idle ladder back to the bottom, and forgets a finger in the corner', () => {
    const v = visit()
    v.frames(seconds(IDLE_BEFORE_DEMO + 1))
    v.down(1, CORNER_AT)
    v.play.rest(v.time.seconds)
    expect(v.play.guidance).toBeNull()
    v.frames(seconds(IDLE_BEFORE_GLOW - 0.2))
    expect(v.play.guidance).toMatchObject({ glow: 0, demo: null })
    // The corner is free again: the lift never came.
    expect(v.down(2, CORNER_AT)).toBe(true)
  })

  it('keeps what the last touch changed for the save, and nothing else carries over', () => {
    const v = visit()
    v.down(1, rackPoint(0))
    v.move(1, slotPoint(4))
    v.up(1, slotPoint(4))
    expect(v.play.toy.changed).toBe(1)
    v.play.rest(v.time.seconds)
    expect(v.play.toy.changed).toBe(1)
    expect(v.play.toy.toSave().pieces).toEqual([{ kind: 'drum', beat: 4, ceiling: false }])
  })
})

describe('a scene ended by a touch', () => {
  it('is silent from that touch: what of it was sounding is closed, and the springs still on the wall drop without a sound', () => {
    const v = visit(60, EVERY), fake = fakeContext()
    const play = v.play
    play.down(1, GRIP, 0, 0)
    play.move(1, { x: GRIP.x, y: GRIP.y + RELEASE.travel })
    play.up(1, { x: GRIP.x, y: GRIP.y + RELEASE.travel }, 0)
    play.voice()?.(fake.context, fake.out, 0)
    for (let i = 0; i < 20; i++) {
      play.frame(i * 16, FRAME, i * FRAME)
      play.voice()?.(fake.context, fake.out, 0)
    }
    expect(play.toy.clearing).not.toBeNull()
    const sounding = play.bus.sounding
    expect(sounding).toBeGreaterThan(2)
    play.down(2, BARE, 400, 0.4)
    expect(play.toy.clearing).toBeNull()
    expect(play.toy.sceneEnded).toBe(true)
    const touch = play.voice()
    // The flag does not outlive the touch, and the scene's voices are closed before the touch's own is played.
    expect(play.toy.sceneEnded).toBe(false)
    expect(play.bus.sounding).toBeLessThan(sounding)
    expect(touch).not.toBeNull()
    for (let i = 0; i < 120; i++) {
      play.frame(400 + i * 16, FRAME, 0.4 + i * FRAME)
      expect(peek(play).filter((event) => event.type === 'pop')).toEqual([])
      play.voice()
    }
    // All that is left is the spring the touch itself laid, being a tap.
    expect(play.toy.toSave().springs.length).toBeLessThanOrEqual(1)
  })
})

describe('a clear-out on each surface', () => {
  it('is over in four seconds at the most, to the last spring out of the frame the child has, wherever the blob was when it began', () => {
    for (const [width, height] of SIZES) {
      const scale = frame(width, height), onSurface = (p: { x: number; y: number }) => ({ x: scale.x + p.x * scale.scale, y: scale.y + p.y * scale.scale })
      let longest = 0
      // The springs come off round the ring from the blob's place, so where the blob is decides which one is last.
      for (const wait of [0, 40, 90, 150, 200, 260]) {
        const v = visit(160, EVERY, [], 1, width, height)
        v.frames(wait)
        v.down(1, onSurface(GRIP))
        v.move(1, onSurface({ x: GRIP.x, y: GRIP.y + RELEASE.travel }))
        v.up(1, onSurface({ x: GRIP.x, y: GRIP.y + RELEASE.travel }))
        expect(v.play.toy.clearing).not.toBeNull()
        let frames = 0
        while (v.play.toy.clearing || v.play.toy.fallers.length > 0) {
          v.frames(1)
          frames += 1
          // A spring is kept until it has been drawn under the bottom edge of this surface, and no longer.
          for (const faller of v.play.toy.fallers) expect(scale.y + faller.y * scale.scale).toBeLessThan(height + 120)
        }
        longest = Math.max(longest, frames * FRAME)
        expect(v.play.toy.springs.size).toBe(0)
      }
      expect(longest, `at ${width}x${height}`).toBeLessThanOrEqual(4)
      expect(longest, `at ${width}x${height}`).toBeGreaterThan(3)
    }
  })

  it('keeps a falling spring until it is under the bottom edge of the surface, on a standing tablet too', () => {
    const [width, height] = SIZES[2], scale = frame(width, height)
    const v = visit(100, [0], [], 1, width, height)
    v.down(1, { x: scale.x + GRIP.x * scale.scale, y: scale.y + GRIP.y * scale.scale })
    v.move(1, { x: scale.x + GRIP.x * scale.scale, y: scale.y + (GRIP.y + RELEASE.travel) * scale.scale })
    v.up(1, { x: scale.x + GRIP.x * scale.scale, y: scale.y + (GRIP.y + RELEASE.travel) * scale.scale })
    let lowest = 0
    while (v.play.toy.clearing || v.play.toy.fallers.length > 0) {
      v.frames(1)
      for (const faller of v.play.toy.fallers) lowest = Math.max(lowest, scale.y + faller.y * scale.scale)
    }
    // It was still there when it reached the bottom edge.
    expect(lowest).toBeGreaterThan(height)
  })
})

describe('touched where it is drawn', () => {
  it('takes a wall by its stub, which stands ahead of its beat, and by the grit on the beat', () => {
    for (const beat of [0, 3, 7, 12]) {
      const v = visit(100, [], [piece('wall', beat)])
      const stub = by(beat, WALL.ahead, WALL.height / 2, false), rubble = by(beat, 0, 4, false)
      expect(v.play.toy.under(stub)).toBe('piece')
      expect(v.play.toy.under(rubble)).toBe('piece')
      v.down(1, stub)
      expect(v.play.toy.hand).toMatchObject({ kind: 'wall', from: beat })
      v.cancel(1)
    }
  })

  it('takes a piece on the rack by any part of it as drawn, at each surface size: the wall by its stub too, and the blob does not jump', () => {
    for (const [width, height] of SIZES) {
      const scale = frame(width, height), onSurface = (p: { x: number; y: number }) => ({ x: scale.x + p.x * scale.scale, y: scale.y + p.y * scale.scale })
      for (const [i, kind] of KINDS.entries()) {
        const box = rackBox(i)
        const points = [0.02, 0.25, 0.5, 0.75, 0.98].flatMap((x) => [0.04, 0.5, 0.96].map((y) => ({ x: box.x + box.w * x, y: box.y + box.h * y })))
        // The wall's stub as it is drawn there, ahead of its foot, and its grit on the beat.
        if (kind === 'wall') points.push({ x: rackFoot(i).x + WALL.ahead * RACK.scale, y: RACK.y - WALL.height * RACK.scale * 0.9 }, { x: rackFoot(i).x + boxOf('wall').from * RACK.scale + 1, y: RACK.y - 2 })
        for (const point of points) {
          const v = visit(100, [], [], 1, width, height)
          v.frames(3)
          v.heard.length = 0
          v.down(1, onSurface(point))
          expect(v.play.toy.hand, `${kind} at ${width}x${height}, ${JSON.stringify(point)}`).toMatchObject({ kind, from: null })
          expect(v.heard.map((event) => event.type), `${kind} at ${width}x${height}`).toEqual(['piece'])
          v.frames(20)
          expect(v.play.toy.blob.air).toBeNull()
          expect([...v.play.toy.springs]).toEqual([])
          v.cancel(1)
        }
      }
    }
  })

  it('finds the release\'s grip under a finger wherever the cord has swung or sprung to', () => {
    const v = visit()
    v.down(1, GRIP)
    v.move(1, { x: GRIP.x, y: GRIP.y + RELEASE.travel * 0.6 })
    v.up(1, { x: GRIP.x, y: GRIP.y + RELEASE.travel * 0.6 })
    let moved = 0
    for (let i = 0; i < 40; i++) {
      v.frames(1)
      const grip = v.play.toy.gripAt()
      moved = Math.max(moved, Math.abs(grip.drop) + Math.abs(grip.sway))
      expect(v.play.toy.under({ x: RELEASE.x + grip.sway, y: RELEASE.rest + grip.drop })).toBe('release')
    }
    expect(moved).toBeGreaterThan(10)
  })
})
