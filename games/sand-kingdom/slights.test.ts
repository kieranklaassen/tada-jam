import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { cameraFor, project } from './camera'
import { GATE_RADIUS, deltaAt, groove, tower } from './field'
import { act, frameFor, lifted } from './hand'
import { ForgivingTouch } from './input'
import { deserializeKingdom } from './kingdom'
import { LUMPS, targetAt } from './layout'
import { HEAPED, Play } from './play'
import { JOURNEY_SECONDS } from './sun'
import { fromBough } from './things'
import { FOLK_COME } from './timeline'

// Small things a second reading of the game against its sheet found, each
// held here by a test of its own: an answer that came late, came twice, came
// all at once, or did not come.

const DT = 1 / 60
const fresh = (age: number | null = 7, seed = 1): Play => new Play(deserializeKingdom(null, age), seed)
const steps = (play: Play, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) play.step(DT)
}
const names = (play: Play, from: number): string[] => play.heard.slice(from).map((one) => one.name)
const planOf = (play: Play): unknown => (play as unknown as { plan: unknown }).plan

describe('the sun reaches the bottom with a thing in the hand', () => {
  it('the folk still come one by one, the crab first, and wood in the water\'s way creaks once', () => {
    // The channel beach: a piece of wood lies in the channel the tide will fill, and drifts.
    const play = new Play(BEACHES.channel(7), 1)
    const from = play.heard.length
    play.press({ kind: 'sun' })
    play.tap()
    steps(play, JOURNEY_SECONDS - 0.5)
    // A shell is picked up and is in the hand when the sun arrives.
    const shell = play.things.shells[2]
    play.press({ kind: 'shell', index: 2 })
    play.dragStart()
    const folk = play.folk
    const home = { eel: folk.eel.where, gull: folk.gulls.birds[0].place }
    const seen: { who: string; at: number }[] = []
    let began = -1
    for (let frame = 0; frame < (FOLK_COME.end + 14) * 60; frame++) {
      if (play.holding) play.drag(shell.x - 0.01, shell.z, 0)
      play.step(DT)
      if (began < 0 && play.playing) began = frame
      const note = (who: string, is: boolean): void => {
        if (is && !seen.some((one) => one.who === who)) seen.push({ who, at: (frame - began) * DT })
      }
      note('crab', folk.crab.out)
      note('eel', folk.eel.where !== home.eel)
      note('gulls', folk.gulls.birds.some((bird) => bird.place !== home.gull || bird.y > 1.4))
    }
    expect(began).toBeGreaterThan(0)
    expect(play.holding).toBe(false)
    // None of them set out when the hand was emptied: each waited for its own moment of the scene.
    for (const one of seen) expect(one.at, one.who).toBeGreaterThan(FOLK_COME.crab - 0.1)
    expect(seen[0].who).toBe('crab')
    expect(seen.find((one) => one.who === 'eel')!.at).toBeGreaterThan(FOLK_COME.eel - 0.1)
    // The wood lifts once, with one creak, as the water comes to it.
    expect(names(play, from).filter((name) => name === 'woodCreak')).toHaveLength(1)
  })
})

describe('the empty bucket knocked over on a piece of wood at evening', () => {
  const camera = cameraFor(1180, 820)
  /** An evening beach with the empty bucket a short way from a piece of wood, on open sand. */
  const ready = (): { play: Play; aim: { x: number; z: number } } => {
    const state = deserializeKingdom(null, 7)
    state.wood[0] = { ...state.wood[0], x: 0.3, z: 3.8 }
    state.wood[1] = { ...state.wood[1], x: -4.5, z: 0.5 }
    state.shells.forEach((shell, i) => { state.shells[i] = { ...shell, x: 3.5 + i * 0.1, z: -1.5 + i * 1.5 } })
    const wood = state.wood[0], ax = Math.cos(wood.turn), az = Math.sin(wood.turn)
    state.bucket = { ...state.bucket, x: 0.3 - az * 1.7, z: 3.8 + ax * 1.7, holds: 'nothing', side: false }
    const play = new Play(state, 1)
    frameFor(play, camera)
    play.press({ kind: 'sun' })
    play.tap()
    steps(play, JOURNEY_SECONDS + FOLK_COME.end + 1)
    expect(play.playing).toBe(false)
    return { play, aim: fromBough(play.things.wood[0], play.things.bucket.x, play.things.bucket.z) }
  }
  const at = (play: Play, x: number, z: number): { x: number; y: number } => {
    const on = project(camera, x, play.ground(x, z), z)
    return { x: on.x, y: on.y }
  }

  it('is answered by the water and the folk at once, while the finger is still down', () => {
    const { play, aim } = ready()
    const before = planOf(play)
    const bucket = play.things.bucket, fromX = bucket.x, fromZ = bucket.z
    play.press({ kind: 'bucket' })
    play.dragStart()
    for (let i = 1; i <= 40 && !bucket.side; i++) {
      play.drag(fromX + ((aim.x - fromX) * i) / 40, fromZ + ((aim.z - fromZ) * i) / 40, 0)
      play.step(DT)
    }
    expect(bucket.side).toBe(true)
    // The hand is empty, and what the beach holds for the folk has been looked at again: no touch has lifted.
    expect(play.holding).toBe(false)
    expect(planOf(play)).not.toBe(before)
  })

  it('leaves no drag behind it: a quick tap on the fallen bucket straight after is a press, and stands it up', () => {
    const { play, aim } = ready()
    const touch = new ForgivingTouch()
    const bucket = play.things.bucket
    const from = at(play, bucket.x, bucket.z + 0.001), to = at(play, aim.x, aim.z)
    let time = 0
    act(play, camera, touch.down(1, from, time))
    expect(play.holding).toBe(true)
    let last = from
    for (let i = 1; i <= 40 && !bucket.side; i++) {
      last = { x: from.x + ((to.x - from.x) * i) / 40, y: from.y + ((to.y - from.y) * i) / 40 }
      act(play, camera, touch.move(1, last))
      play.step(DT)
      time += 1000 * DT
    }
    expect(bucket.side).toBe(true)
    // The finger lifts where the bucket was knocked out of it, and nothing is left waiting for it to come back.
    act(play, camera, lifted(play, touch, 1, last, time))
    expect(touch.active).toBe(false)
    steps(play, 0.1)
    time += 100
    // A new finger, a tenth of a second later and a few points away: it lands on the fallen bucket.
    const drawn = play.drawn().bucket, on = project(camera, drawn.x, drawn.y, drawn.z)
    const mark = play.heard.length
    const next = touch.down(2, { x: on.x, y: on.y }, time)
    expect(next.map((gesture) => gesture.type)).toEqual(['press'])
    act(play, camera, next)
    act(play, camera, lifted(play, touch, 2, { x: on.x, y: on.y }, time + 60))
    expect(names(play, mark).length).toBeGreaterThan(0)
    steps(play, 1)
    expect(bucket.side).toBe(false)
  })
})

describe('the full bucket tipped out against a shell or a piece of wood', () => {
  it('goes over onto it and lifts off from there: in no frame does it move more than a step', () => {
    const cases: { name: string; arrange: (play: Play) => void }[] = [
      { name: 'a shell', arrange: (play) => Object.assign(play.things.shells[0], { x: play.things.bucket.x + 1.25, z: play.things.bucket.z + 0.2, state: 'lying' }) },
      { name: 'a shell on the other side', arrange: (play) => Object.assign(play.things.shells[1], { x: play.things.bucket.x - 1.2, z: play.things.bucket.z - 0.3, state: 'lying' }) },
      { name: 'a piece of wood', arrange: (play) => Object.assign(play.things.wood[0], { x: play.things.bucket.x + 0.4, z: play.things.bucket.z - 0.95, turn: 0.1 }) },
      { name: 'a piece of wood end on', arrange: (play) => Object.assign(play.things.wood[1], { x: play.things.bucket.x - 1.9, z: play.things.bucket.z, turn: 0 }) },
    ]
    for (const one of cases) {
      const play = fresh(3)
      Object.assign(play.things.bucket, { x: 0, z: 4, holds: 'sand', side: false })
      play.things.shells.forEach((shell, index) => Object.assign(shell, { x: -5 + index, z: 7.2, state: 'lying' }))
      Object.assign(play.things.wood[0], { x: 4.5, z: 6.8, turn: 0 })
      Object.assign(play.things.wood[1], { x: 4.5, z: 1.2, turn: 0 })
      one.arrange(play)
      steps(play, 0.3)
      const stood = { x: play.things.bucket.x, z: play.things.bucket.z }
      let was = play.bucketPose()
      play.press({ kind: 'bucket' })
      play.tap()
      let far = 0, most = 0, aside = 0, frames = 0
      for (let frame = 0; frame < 120; frame++) {
        if (frame > 0) play.step(DT)
        const now = play.bucketPose()
        most = Math.max(most, Math.hypot(now.x - was.x, now.y - was.y, now.z - was.z))
        aside = Math.max(aside, Math.hypot(now.x - was.x, now.z - was.z))
        if (Math.hypot(now.x - was.x, now.z - was.z) > 0.01) frames += 1
        far = Math.max(far, Math.hypot(now.x - stood.x, now.z - stood.z))
        was = now
      }
      // It did go somewhere: over onto the thing and off again to stand beside what it made.
      expect(far, one.name).toBeGreaterThan(0.5)
      // It is seen to go: its way across is spread over many frames, a quarter of its own width in the fastest
      // of them, and it is never in two places from one frame to the next. Up, it goes faster than across.
      expect(frames, one.name).toBeGreaterThan(12)
      expect(aside, one.name).toBeLessThan(0.3)
      expect(most, one.name).toBeLessThan(0.6)
    }
  })
})

describe('a gate cut through raised sand', () => {
  it('ticks and sheds grains from its two sides in the frame the sand comes down, however slow the finger', () => {
    for (const speed of [0.5, 1.5, 4]) {
      const play = fresh()
      play.things.shells.forEach((shell, index) => Object.assign(shell, { x: -5 + index, z: 7.2 }))
      Object.assign(play.things.bucket, { x: 5, z: 7 })
      Object.assign(play.things.wood[0], { x: 4.5, z: 0.5 })
      Object.assign(play.things.wood[1], { x: -4.5, z: 0.5 })
      tower(play.field, 0, 3, 0, 1)
      /** The highest the sand stands in front of the finger, as far as a gate is wide. */
      const ahead = (x: number): number => {
        let high = -Infinity
        for (let far = 0; far <= GATE_RADIUS + 0.06; far += 0.05) high = Math.max(high, deltaAt(play.field, x + far, 3))
        return high
      }
      play.press({ kind: 'sand', x: -2.4, z: 3 })
      play.dragStart()
      let x = -2.4, crumbled = 0, cutAt = NaN, stood = 0, since = -1
      /** How high the sand stands at one place of the finger's way. */
      const at = (px: number): number => deltaAt(play.field, px, 3)
      while (x < 2.4) {
        const before = ahead(x + speed * DT), mark = play.heard.length, grains = new Set(play.grains)
        // Where in front of the finger the sand stands highest, before this frame.
        let peak = x + speed * DT
        for (let far = 0; far <= GATE_RADIUS + 0.06; far += 0.05) if (at(x + speed * DT + far) >= before) peak = x + speed * DT + far
        x += speed * DT
        play.drag(x, 3, 0)
        play.step(DT)
        if (since >= 0) since += 1
        // A fifth of a second on, at the latest, the cut is plain to see where the tick sounded.
        if (since === 12) expect(at(cutAt), `at ${speed}`).toBeLessThan(stood - 0.04)
        if (!names(play, mark).includes('crumble')) continue
        crumbled += 1
        // In this frame: the sand a gate's width in front of the finger stood heaped before it, and is coming down.
        expect(before, `at ${speed}`).toBeGreaterThan(HEAPED)
        expect(at(peak), `at ${speed}`).toBeLessThan(before - 0.002)
        cutAt = peak
        stood = before
        since = 0
        // Grains slide off the two cut sides, to either side of the finger's way.
        const flung = play.grains.filter((grain) => !grains.has(grain) && Math.abs(grain.x - x) < GATE_RADIUS + 0.3)
        expect(flung.filter((grain) => grain.z > 3.1).length, `at ${speed}`).toBeGreaterThanOrEqual(3)
        expect(flung.filter((grain) => grain.z < 2.9).length, `at ${speed}`).toBeGreaterThanOrEqual(3)
      }
      play.release()
      expect(crumbled, `at ${speed}`).toBe(1)
    }
  })
})

describe('a gull in the air or sliding off', () => {
  it('poked in the air squawks and flaps harder, and goes on to where it was going', () => {
    const play = fresh()
    steps(play, 1)
    // Poked on the log, it goes up; poked again while it is up, it answers again.
    play.press({ kind: 'folk', who: 'gull', index: 1 })
    play.tap()
    steps(play, 0.15)
    const gulls = play.folk.gulls, bird = gulls.birds[1]
    expect(bird.hop + bird.y).toBeGreaterThan(1)
    const mark = play.heard.length, slot = bird.slot
    play.press({ kind: 'folk', who: 'gull', index: 1 })
    play.tap()
    expect(names(play, mark)).toContain('squawk')
    play.step(DT)
    expect(bird.squash).not.toBe(0)
    steps(play, 2)
    // It came down where it was going: its place in the row did not change again.
    expect(bird.slot).toBe(slot)
    expect(bird.place).toBe('log')
  })
})

describe('a shell the crab is wearing when the tide goes out', () => {
  it('is set down with a tock as it lands', () => {
    const play = new Play(BEACHES.evening(7), 1)
    // Until the crab has a shell on its head.
    for (let t = 0; t < 60 && play.hat < 0; t += DT) play.step(DT)
    expect(play.hat).toBeGreaterThanOrEqual(0)
    const worn = play.hat
    play.press({ kind: 'sun' })
    play.tap()
    let landed = -1, tocked = -1
    const from = play.heard.length
    for (let frame = 0; frame < (JOURNEY_SECONDS + 4) * 60; frame++) {
      play.step(DT)
      if (landed < 0 && play.hat < 0 && play.poses.shells[worn].fly === null) landed = frame
      if (tocked < 0 && play.heard.slice(from).some((one) => one.name === 'tock' && one.by === 'shell' && one.at <= play.time + 1e-9)) tocked = frame
    }
    expect(landed).toBeGreaterThan(0)
    expect(tocked).toBeGreaterThan(0)
    // The tock is the landing: within two frames of it.
    expect(Math.abs(tocked - landed)).toBeLessThanOrEqual(2)
  })
})

describe('every rock that is drawn', () => {
  const camera = cameraFor(1180, 820)
  it('is a rock under a finger: the three in the shallows and the small ones at the feet of the two big ones knock, and none splashes', () => {
    const play = fresh()
    frameFor(play, camera)
    const rocks = LUMPS.filter((rock) => !rock.big && rock.of !== 'pebble')
    expect(rocks).toHaveLength(7)
    for (const rock of rocks) {
      const on = project(camera, rock.x, rock.y + rock.ry * 0.6, rock.z)
      if (on.x < 4 || on.x > camera.width - 4) continue
      const target = targetAt(camera, on.x, on.y, play.field, play.folk.spots((x, z) => play.ground(x, z)), play.sea, play.drawn(), play.cloudXs())
      expect(target.kind, `the rock at ${rock.x}, ${rock.z}`).toBe('rock')
      const mark = play.heard.length
      play.press(target)
      play.tap()
      expect(names(play, mark), `the rock at ${rock.x}, ${rock.z}`).not.toContain('plip')
      expect(names(play, mark).length, `the rock at ${rock.x}, ${rock.z}`).toBeGreaterThan(0)
      steps(play, 0.5)
    }
  })
})

describe('the bored small crabs', () => {
  it('each sound their own run: a scuttle for every one that sets off, not for the first alone', () => {
    const play = fresh(7, 3)
    play.press({ kind: 'sun' })
    play.tap()
    steps(play, JOURNEY_SECONDS + FOLK_COME.end + 2)
    const small = play.folk.small
    expect(small.crabs.map((crab) => crab.shown)).toEqual([1, 1, 1])
    // Which of them set off in a frame, by how far each went, and whether a scuttle sounded in it.
    const ran = [0, 0, 0], sounded = [0, 0, 0]
    let was = small.crabs.map((crab) => crab.x), still = [true, true, true]
    for (let frame = 0; frame < 30 * 60; frame++) {
      const mark = play.heard.length
      play.step(DT)
      const scuttles = play.heard.slice(mark).filter((one) => one.name === 'scuttle').length
      const started: number[] = []
      small.crabs.forEach((crab, index) => {
        const moving = Math.abs(crab.x - was[index]) > 1e-4
        if (moving && still[index]) started.push(index)
        still[index] = !moving
      })
      was = small.crabs.map((crab) => crab.x)
      for (const index of started) ran[index] += 1
      if (scuttles > 0) for (const index of started) sounded[index] += 1
    }
    for (const index of [0, 1, 2]) {
      expect(ran[index], `crab ${index}`).toBeGreaterThan(2)
      expect(sounded[index], `crab ${index}`).toBeGreaterThan(2)
    }
  })
})

describe('the wood and the groove', () => {
  it('a piece of wood in a groove the sea fills is lifted with one creak and no second one when it sets off', () => {
    const play = fresh()
    play.things.bucket.x = -4
    play.things.bucket.z = 5
    for (let z = -2.5; z < 4; z += 0.25) groove(play.field, 1.6, z, 1.6, z + 0.25)
    for (let z = -2.5; z < 4; z += 0.25) groove(play.field, 2.1, z, 2.1, z + 0.25)
    play.dug.push(0)
    Object.assign(play.things.wood[0], { x: 1.85, z: 1.2, turn: Math.PI / 2 })
    const from = play.heard.length
    play.press({ kind: 'sun' })
    play.tap()
    steps(play, JOURNEY_SECONDS + FOLK_COME.end + 4)
    expect(names(play, from).filter((name) => name === 'woodCreak')).toHaveLength(1)
  })
})
