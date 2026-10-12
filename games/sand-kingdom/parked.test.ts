import { describe, expect, it } from 'vitest'
import { BEACHES, CHANNEL } from './beaches'
import { cameraFor, project } from './camera'
import { encode, heap, makeField } from './field'
import { act, frameFor, rested } from './hand'
import { ForgivingTouch } from './input'
import { type Kingdom, deserializeKingdom, serializeKingdom } from './kingdom'
import { CRAB_BACK } from './plan'
import { Play } from './play'
import { JOURNEY_SECONDS } from './sun'
import { FOLK_COME, TIDE_OUT } from './timeline'

// Parked equals loaded. Whatever the child was doing when the game was put
// away, the game that comes back from a rest and the game a load of the save
// makes are the same game: the same beach, nothing in a hand or in the air,
// no sun on its way, no scene and no wave that no touch asked for. And what
// is saved is what is seen: a scene's start ends the stroke under the finger,
// whatever sank is shown sinking, and nothing sounds because the game opened.

const DT = 1 / 60
const camera = cameraFor(1180, 820)
const SEED = 5
const steps = (play: Play, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) play.step(DT)
}
const savedOf = (play: Play): string => JSON.stringify(serializeKingdom(play.toState()))
const open = (state: Kingdom, seed = 1): Play => {
  const play = new Play(state, seed)
  frameFor(play, camera)
  return play
}
const at = (play: Play, x: number, z: number): { x: number; y: number } => {
  const on = project(camera, x, play.ground(x, z), z)
  return { x: on.x, y: on.y }
}

/** Everything of a game that shows, as plain numbers, for one frame. */
function shown(play: Play): unknown {
  const round = (value: number): number => Math.round(value * 1e6) / 1e6
  return JSON.parse(JSON.stringify({
    state: serializeKingdom(play.toState()),
    bucket: play.bucketPose(),
    shells: play.things.shells.map((_, index) => play.shellPose(index)),
    wood: play.things.wood.map((_, index) => play.woodPose(index)),
    folk: play.folk.spots((x, z) => play.ground(x, z)),
    hat: play.hat,
    sun: [play.sun.t, play.sun.mode, play.sun.home],
    sea: [play.tide, play.dusk, play.gold],
    wave: play.wave,
    wet: play.wetVersion,
    clouds: play.cloudXs(),
    grains: play.grains.length,
    rings: play.rings.length,
    heard: play.heard.map((one) => one.name),
  }, (_, value) => (typeof value === 'number' ? round(value) : value)))
}

/**
 * The game goes to rest as the Mount does it: the touch in progress is ended, what is held is saved, and the
 * game that comes back is taken. Beside it, the game a load of that save makes. Both are then played for a
 * quarter of a minute with no touch, and held to each other and to the save frame by frame.
 */
function restAndCompare(play: Play, touch: ForgivingTouch): { parked: Play; saved: Kingdom } {
  act(play, camera, touch.clear())
  const saved = savedOf(play)
  const parked = rested(play, camera, SEED)
  const loaded = open(deserializeKingdom(JSON.parse(saved), 7), SEED)
  // Found as left: what was saved is what both hold, and nothing is going on in either.
  for (const game of [parked, loaded]) {
    expect(savedOf(game)).toBe(saved)
    expect(game.playing).toBe(false)
    expect(game.holding).toBe(false)
    expect(game.finger).toBeNull()
    expect(game.sun.mode).toBe('rest')
    expect(game.wave.show).toBe(0)
    expect(game.heard).toEqual([])
    expect(game.voices).toEqual([])
    expect(game.sceneVoices).toEqual([])
    expect(game.grains).toEqual([])
    expect(game.rings).toEqual([])
    expect(game.poses.bucket.fly).toBeNull()
    expect(game.poses.shells.every((pose) => pose.fly === null)).toBe(true)
    expect(game.hat).toBe(-1)
  }
  expect(shown(parked)).toEqual(shown(loaded))
  for (let frame = 0; frame < 15 * 60; frame++) {
    parked.step(DT)
    loaded.step(DT)
    if (frame < 3) {
      // Nothing sounds and nothing flies because the game was opened.
      expect(parked.heard).toEqual([])
      expect(parked.grains).toEqual([])
    }
    if (frame % 6 === 0 || frame < 30) expect(shown(parked), `frame ${frame}`).toEqual(shown(loaded))
    // No sun sets off, no scene plays and no wave runs with no touch.
    expect(parked.playing).toBe(false)
    expect(parked.sun.mode).toBe('rest')
    expect(parked.wave.show).toBe(0)
    expect(parked.gold).toBe(0)
  }
  // And a quarter of a minute later the beach is still the one that was saved.
  const now = JSON.parse(savedOf(parked)) as Kingdom, then = JSON.parse(saved) as Kingdom
  expect(now.sand).toBe(then.sand)
  expect(now.sun).toBe(then.sun)
  expect(now.finished).toBe(then.finished)
  expect(now.bucket).toEqual(then.bucket)
  expect(now.wood).toEqual(then.wood)
  return { parked, saved: then }
}

const tapSun = (play: Play): void => {
  play.press({ kind: 'sun' })
  play.tap()
}

describe('parked equals loaded', () => {
  it('in the middle of a stroke: the groove is there as far as it was dug', () => {
    const play = open(deserializeKingdom(null, 7)), touch = new ForgivingTouch()
    // On open sand, well out of a finger's reach of the bough that lies nearest.
    const from = at(play, -2.6, 2.6)
    act(play, camera, touch.down(1, from, 0))
    for (let i = 1; i <= 25; i++) {
      act(play, camera, touch.move(1, { x: from.x + i * 6, y: from.y - i }))
      play.step(DT)
    }
    const dug = encode(play.field)
    const { saved } = restAndCompare(play, touch)
    expect(saved.sand).toBe(dug)
    expect(saved.sand).not.toBe('')
  })

  it('with the bucket in the hand, and with the bucket in the air off the tower it has just turned out', () => {
    // In the hand: it is found where it was taken from.
    const carried = open(deserializeKingdom(null, 4)), touch = new ForgivingTouch()
    const home = { x: carried.things.bucket.x, z: carried.things.bucket.z }
    const drawn = carried.drawn().bucket, from = project(camera, drawn.x, drawn.y, drawn.z)
    act(carried, camera, touch.down(1, { x: from.x, y: from.y }, 0))
    for (let i = 1; i <= 15; i++) {
      act(carried, camera, touch.move(1, { x: from.x - i * 5, y: from.y - i * 2 }))
      carried.step(DT)
    }
    expect(carried.holding).toBe(true)
    const first = restAndCompare(carried, touch)
    expect(first.saved.bucket.x).toBeCloseTo(home.x, 2)
    expect(first.saved.bucket.z).toBeCloseTo(home.z, 2)
    // In the air: the tower stands, and the bucket is found beside it, empty.
    const turned = open(deserializeKingdom(null, 4)), other = new ForgivingTouch()
    const pail = turned.drawn().bucket, on = project(camera, pail.x, pail.y, pail.z)
    act(turned, camera, other.down(1, { x: on.x, y: on.y }, 0))
    act(turned, camera, other.up(1, { x: on.x, y: on.y }, 60))
    steps(turned, 0.1)
    expect(turned.poses.bucket.fly).not.toBeNull()
    const second = restAndCompare(turned, other)
    expect(second.saved.bucket.holds).toBe('nothing')
    expect(second.saved.sand).not.toBe('')
  })

  it('with the sun half way: in the hand, lifted a moment ago, let go past half way, and tapped', { timeout: 60_000 }, () => {
    const cases: [string, (play: Play, touch: ForgivingTouch, way: 1 | -1) => void][] = [
      ['in the hand', (play, touch, way) => {
        const sun = project(camera, play.drawn().sun.x, play.drawn().sun.y, -14)
        act(play, camera, touch.down(1, { x: sun.x, y: sun.y }, 0))
        for (let i = 1; i <= 6; i++) act(play, camera, touch.move(1, { x: sun.x, y: sun.y + way * i * 5 }))
        expect(play.sun.mode).toBe('held')
        expect(play.sun.gone).toBeGreaterThan(0.2)
      }],
      ['lifted a moment ago, half way', (play, touch, way) => {
        const sun = project(camera, play.drawn().sun.x, play.drawn().sun.y, -14)
        act(play, camera, touch.down(1, { x: sun.x, y: sun.y }, 0))
        for (let i = 1; i <= 8; i++) act(play, camera, touch.move(1, { x: sun.x, y: sun.y + way * i * 6 }))
        expect(play.sun.gone).toBeGreaterThan(0.5)
        // The finger is off the glass and the game goes to rest before anything else: the drop is the child's,
        // the sun sets off, and the game that comes back has it where it set out all the same.
        act(play, camera, touch.up(1, { x: sun.x, y: sun.y + way * 48 }, 100))
      }],
      ['let go past half way and on its way', (play, _, way) => {
        play.press({ kind: 'sun' })
        play.drag(null, null, way * 0.7)
        play.release()
        steps(play, 0.3)
        expect(play.sun.travelling).toBe(true)
      }],
      ['tapped and on its way', (play) => {
        tapSun(play)
        steps(play, JOURNEY_SECONDS / 2)
        expect(play.sun.t).toBeGreaterThan(0.3)
        expect(play.sun.t).toBeLessThan(0.7)
      }],
    ]
    for (const [name, reach] of cases) {
      for (const beach of ['kingdom', 'evening'] as const) {
        const play = open(BEACHES[beach](7)), touch = new ForgivingTouch()
        const before = savedOf(play)
        reach(play, touch, beach === 'evening' ? -1 : 1)
        const { saved, parked } = restAndCompare(play, touch)
        // Back where it set out: no evening came and no wave smoothed the kingdom.
        expect(JSON.stringify(saved), `${name}, ${beach}`).toBe(before)
        expect(parked.sun.t).toBe(beach === 'evening' ? 1 : 0)
      }
    }
  })

  it('while the water is running in: the evening is found with its water standing and the folk at their places', () => {
    const play = open(BEACHES.kingdom(7)), touch = new ForgivingTouch()
    tapSun(play)
    steps(play, JOURNEY_SECONDS + FOLK_COME.flow.at + 0.5)
    expect(play.playing).toBe(true)
    const { saved, parked } = restAndCompare(play, touch)
    expect(saved.sun).toBe('down')
    expect(saved.finished).toBe(true)
    expect(parked.water).not.toBeNull()
    expect(parked.wet.some((cell) => cell === 1)).toBe(true)
    expect(parked.wet.every((cell) => cell === 0 || cell === 1)).toBe(true)
  })

  it('at evening, at rest and with a finger at work in the sand', { timeout: 60_000 }, () => {
    const still = open(BEACHES.evening(7))
    steps(still, 3)
    restAndCompare(still, new ForgivingTouch())
    const play = open(BEACHES.evening(7)), touch = new ForgivingTouch()
    steps(play, 1)
    const from = at(play, 2.5, 5.5)
    act(play, camera, touch.down(1, from, 0))
    for (let i = 1; i <= 12; i++) {
      act(play, camera, touch.move(1, { x: from.x + i * 6, y: from.y }))
      play.step(DT)
    }
    const { saved } = restAndCompare(play, touch)
    expect(saved.sun).toBe('down')
  })

  it('while the long wave is running, and the morning after', { timeout: 60_000 }, () => {
    for (const wait of [TIDE_OUT.wave.at + 1.0, TIDE_OUT.wave.at + TIDE_OUT.wave.lasts + 0.5, TIDE_OUT.back.at + TIDE_OUT.back.lasts + 2]) {
      const play = open(BEACHES.evening(7)), touch = new ForgivingTouch()
      tapSun(play)
      steps(play, JOURNEY_SECONDS + wait)
      const { saved, parked } = restAndCompare(play, touch)
      // The morning beach: smooth, the sun up, the day sea, and no wave on it.
      expect(saved.sun).toBe('up')
      expect(saved.finished).toBe(false)
      expect(saved.sand).toBe('')
      expect(saved.dug).toEqual([])
      expect(parked.water).toBeNull()
      expect(parked.wet.every((cell) => cell === 0)).toBe(true)
    }
  })
})

describe('nothing sounds or starts because the game was opened', () => {
  it('a shell left lying in the water and a piece of wood left afloat are found full and afloat, without a glug, a bubble or a rise', () => {
    // By day: a groove dug down into the sea, with a shell lying in its water and a piece of wood floating on it.
    const built = open(deserializeKingdom(null, 7))
    built.press({ kind: 'sand', x: 2, z: 0.2 })
    built.dragStart()
    for (let i = 1; i <= 30; i++) built.drag(2, 0.2 - i * 0.1, 0)
    built.release()
    const state = JSON.parse(savedOf(built)) as Kingdom
    state.shells[2] = { x: 2, z: -1.2, up: true, state: 'lying' }
    state.wood[0] = { x: 2, z: -2.2, turn: Math.PI / 2 }
    const play = open(deserializeKingdom(state, 7), 3)
    expect(play.standing(2, -1.2)).toBe(true)
    expect(play.standing(2, -2.2)).toBe(true)
    const first = play.woodPose(0).y
    expect(play.poses.wood[0].lift).toBeCloseTo(0.1, 6)
    for (let frame = 0; frame < 120; frame++) {
      play.step(DT)
      expect(play.heard).toEqual([])
      expect(play.voices).toEqual([])
      expect(play.grains).toEqual([])
      expect(play.poses.shells[2].squashSpeed).toBe(0)
      // Afloat from the first frame: it only bobs.
      expect(Math.abs(play.woodPose(0).y - first)).toBeLessThan(0.07)
    }
    expect(savedOf(play)).toBe(JSON.stringify(serializeKingdom(deserializeKingdom(state, 7))))
  })

  it('a shell whose tower is gone is found lying, with no drop', () => {
    const state = BEACHES.kingdom(7)
    const play = open({ ...state, sand: '', dug: [] }, 3)
    expect(play.things.shells[1].state).toBe('lying')
    steps(play, 1)
    expect(play.heard).toEqual([])
    expect(play.poses.shells[1].fly).toBeNull()
  })
})

describe('a scene starting under a finger that is still at work', () => {
  it('ends the stroke: the finger must land again, and what was saved when the scene began is what is seen when it ends', () => {
    const play = open(BEACHES.kingdom(7))
    tapSun(play)
    steps(play, JOURNEY_SECONDS - 0.4)
    // A finger digs slowly across the dry sand as the sun arrives, and keeps moving all through the scene.
    play.press({ kind: 'sand', x: 1.5, z: 6 })
    play.dragStart()
    let x = 1.5, began = '', dugAtStart = ''
    for (let frame = 0; frame < (FOLK_COME.end + 2) * 60; frame++) {
      x += 0.01
      play.drag(Math.min(5, x), 6, 0)
      play.step(DT)
      if (began === '' && play.playing) {
        began = savedOf(play)
        dugAtStart = encode(play.field)
        // Nothing is under the finger any more, for the folk or for the sand.
        expect(play.finger).toBeNull()
      }
    }
    expect(began).not.toBe('')
    expect(play.playing).toBe(false)
    // The groove stopped where it was when the scene began: the moving finger dug no further.
    const end = JSON.parse(began) as Kingdom
    expect(savedOf(play)).toBe(began)
    expect(encode(play.field)).toBe(end.sand)
    const dry = makeField()
    expect(dugAtStart).not.toBe(encode(dry))
    // Landing again, it digs.
    play.press({ kind: 'sand', x: 3.5, z: 6.4 })
    play.tap()
    expect(encode(play.field)).not.toBe(end.sand)
  })

  it('sets down the thing in the hand where it is, and saves it there', () => {
    const play = open(BEACHES.kingdom(7))
    tapSun(play)
    steps(play, JOURNEY_SECONDS - 0.5)
    play.press({ kind: 'shell', index: 2 })
    play.dragStart()
    let began = ''
    for (let frame = 0; frame < 90; frame++) {
      play.drag(2.2 - Math.min(1.2, frame * 0.02), 7.1 - Math.min(0.6, frame * 0.01), 0)
      play.step(DT)
      if (began === '' && play.playing) began = savedOf(play)
    }
    expect(began).not.toBe('')
    expect(play.holding).toBe(false)
    const shell = (JSON.parse(began) as Kingdom).shells[2]
    // Where it was when the sun arrived, not where it was taken from and not where the finger went on to.
    expect(shell.x).toBeLessThan(1.9)
    expect(shell.x).toBeGreaterThan(1.3)
    expect(play.things.shells[2].x).toBeCloseTo(shell.x, 2)
    expect(play.shellPose(2).x).toBeCloseTo(shell.x, 2)
  })
})

describe('sand that sinks at evening', () => {
  it('is shown sinking wherever it is, and at the end of the scene the beach is the one that was saved', () => {
    // Low heaps in the reach of the evening sea, at places a cell apart: whichever cells they cover, they sink.
    for (const [x, z] of [[3, -1.4], [3.25, -1.15], [-2.5, -1.9], [4.1, -0.9], [0.9, -1.65]] as const) {
      const field = makeField()
      heap(field, x, z, 0.45, 0.16)
      const before = encode(field)
      const play = open({ ...deserializeKingdom(null, 7), sand: before })
      tapSun(play)
      steps(play, JOURNEY_SECONDS + 0.05)
      expect(play.playing).toBe(true)
      const saved = JSON.parse(savedOf(play)) as Kingdom
      // It was saved sunk, and is not shown sunk yet.
      expect(saved.sand).not.toBe(before)
      expect(encode(play.field)).toBe(before)
      steps(play, FOLK_COME.sink.at + FOLK_COME.sink.lasts * 0.5)
      const half = encode(play.field)
      expect(half).not.toBe(before)
      expect(half).not.toBe(saved.sand)
      steps(play, FOLK_COME.end + 1)
      expect(play.playing).toBe(false)
      expect(encode(play.field), `heap at ${x}, ${z}`).toBe(saved.sand)
    }
  })
})

describe('the tide going out', () => {
  /** The sun is taken in the hand at evening and carried straight to the top: it arrives in the next step. */
  const sunUpAtOnce = (play: Play): void => {
    play.press({ kind: 'sun' })
    play.drag(null, null, -1)
    play.release()
  }

  it('the shell the crab is wearing travels from its head to where it will lie', () => {
    // Where the crab walks at evening, found by watching it; a shell is then left lying in its way, at a place
    // it passes in the middle of a run, so it wears the shell for a while.
    const watched = open(BEACHES.evening(7), 3)
    const walked: { x: number; z: number }[] = []
    for (let frame = 0; frame < 12 * 60; frame++) {
      watched.step(DT)
      walked.push({ x: watched.folk.crab.x, z: watched.folk.crab.z })
    }
    let play: Play | null = null
    for (let frame = 150; frame < walked.length && !play; frame += 20) {
      const state = BEACHES.evening(7)
      state.shells[2] = { ...walked[frame], up: true, state: 'lying' }
      const tried = open(state, 3)
      let worn = 0
      for (let i = 0; i < 20 * 60 && worn < 30; i++) {
        tried.step(DT)
        worn = tried.hat === 2 ? worn + 1 : 0
      }
      // Worn for half a second: it is up on the crab's head, and still there.
      if (worn >= 30) play = tried
    }
    if (!play) throw new Error('the crab never wore the shell')
    expect(play.hat).toBe(2)
    const crab = play.folk.crab, head = { x: crab.x, y: crab.floor + CRAB_BACK + 0.45, z: crab.z }
    sunUpAtOnce(play)
    play.step(DT)
    expect(play.playing).toBe(true)
    const lies = (JSON.parse(savedOf(play)) as Kingdom).shells[2]
    // It leaves the crab's head, and is never anywhere it did not travel to.
    let last = play.shellPose(2)
    // It is worn over its eyes, forward of the middle of its back.
    expect(Math.hypot(last.x - head.x, last.z - head.z)).toBeLessThan(0.5)
    expect(Math.abs(last.y - head.y)).toBeLessThan(0.3)
    expect(Math.hypot(lies.x - head.x, lies.z - head.z)).toBeGreaterThan(0.8)
    for (let frame = 0; frame < 60; frame++) {
      play.step(DT)
      const now = play.shellPose(2)
      // Its fastest is the drop from over the crab's eyes to the sand: a third of a step in a frame, and never a jump.
      expect(Math.hypot(now.x - last.x, now.y - last.y, now.z - last.z), `frame ${frame}`).toBeLessThan(0.35)
      last = now
    }
    expect(last.x).toBeCloseTo(lies.x, 2)
    expect(last.z).toBeCloseTo(lies.z, 2)
  })

  it('wood the water is carrying goes on to the end of its way, where it was saved', () => {
    const play = open({ ...BEACHES.channel(7), sun: 'down', finished: true }, 3)
    steps(play, 0.5)
    // A touch at evening: the water is read again, and the wood lying in the channel floats off along it.
    play.press({ kind: 'sand', x: -3, z: 6.5 })
    play.tap()
    steps(play, 1.0)
    const piece = play.things.wood[0]
    expect(piece.z).toBeGreaterThan(1.5)
    expect(piece.z).toBeLessThan(CHANNEL.to - 1)
    sunUpAtOnce(play)
    play.step(DT)
    expect(play.playing).toBe(true)
    const lies = (JSON.parse(savedOf(play)) as Kingdom).wood[0]
    expect(lies.z).toBeGreaterThan(piece.z + 0.5)
    let last = play.woodPose(0)
    for (let frame = 0; frame < 4 * 60; frame++) {
      play.step(DT)
      const now = play.woodPose(0)
      expect(Math.hypot(now.x - last.x, now.z - last.z), `frame ${frame}`).toBeLessThan(0.1)
      last = now
    }
    expect(last.x).toBeCloseTo(lies.x, 1)
    expect(last.z).toBeCloseTo(lies.z, 1)
    // A touch that ends the scene lands it where it was going.
    const ended = open({ ...BEACHES.channel(7), sun: 'down', finished: true }, 3)
    steps(ended, 0.5)
    ended.press({ kind: 'sand', x: -3, z: 6.5 })
    ended.tap()
    steps(ended, 1.0)
    sunUpAtOnce(ended)
    ended.step(DT)
    const there = (JSON.parse(savedOf(ended)) as Kingdom).wood[0]
    ended.endScene()
    expect(ended.things.wood[0].x).toBeCloseTo(there.x, 2)
    expect(ended.things.wood[0].z).toBeCloseTo(there.z, 2)
  })
})
