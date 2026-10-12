import { describe, expect, it } from 'vitest'
import { cameraFor, project } from './camera'
import { deltaAt, heightAt } from './field'
import { STAR_START } from './folk'
import { act, answers } from './hand'
import type { Gesture } from './input'
import { deserializeKingdom, serializeKingdom } from './kingdom'
import { CLOUDS, EEL_ROCK, LOG, cloudTouch, targetAt } from './layout'
import { Play } from './play'

// Touches that are answered where an earlier reading found them unanswered: the gulls and a stroke drawn past
// them, the starfish poked on its way, and a finger that lands on a thing that is not carried and goes on onto
// the sand.

const DT = 1 / 60
const fresh = (seed = 7): Play => new Play(deserializeKingdom(null, seed), 1)
const steps = (play: Play, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) play.step(DT)
}
const names = (play: Play, from: number): string[] => play.heard.slice(from).map((one) => one.name)

describe('a stroke drawn toward the gulls', () => {
  it('makes them duck one after another when its grains come near them, with the finger still down from a landing far off', () => {
    const play = fresh()
    steps(play, 1)
    const birds = play.folk.gulls.birds, middle = birds[1]
    // It lands far from them: no duck.
    const from = { x: -1.5, z: 5.2 }, to = { x: 3.6, z: 3.4 }
    expect(Math.hypot(from.x - middle.x, from.z - middle.z)).toBeGreaterThan(5)
    play.press({ kind: 'sand', ...from })
    play.dragStart()
    const ducked: number[] = [-1, -1, -1]
    let firstNear = -1
    const count = 150
    for (let i = 1; i <= count; i++) {
      const x = from.x + ((to.x - from.x) * i) / count, z = from.z + ((to.z - from.z) * i) / count
      play.drag(x, z, 0)
      play.step(DT)
      if (firstNear < 0 && Math.hypot(x - middle.x, z - middle.z) <= 4.5) firstNear = i
      birds.forEach((bird, index) => {
        if (ducked[index] < 0 && bird.duck > 0.3) ducked[index] = i
      })
      // Far off, nothing of theirs is a duck.
      if (firstNear < 0) expect(Math.max(...birds.map((bird) => bird.duck)), `frame ${i}`).toBeLessThan(0.05)
    }
    expect(play.digging).toBe(true)
    expect(firstNear).toBeGreaterThan(20)
    // Each has ducked, the first within a third of a second of the grains coming near, and no two together.
    for (const at of ducked) expect(at).toBeGreaterThan(firstNear)
    expect(Math.min(...ducked) - firstNear).toBeLessThan(20)
    expect(new Set(ducked).size).toBe(3)
    play.release()
  })
})

describe('the starfish poked on its way', () => {
  // A tower by the starfish's rock at evening: it drops from its rock, wheels over the sand and leaps onto it.
  const evening = (): Play => {
    const play = fresh()
    steps(play, 0.5)
    const bucket = play.things.bucket
    play.press({ kind: 'bucket' })
    play.tap()
    steps(play, 1.2)
    play.press({ kind: 'bucket' })
    play.dragStart()
    for (let i = 1; i <= 40; i++) {
      play.drag(bucket.x + ((1.2 - bucket.x) * i) / 40, bucket.z + ((6.4 - bucket.z) * i) / 40, 0)
      play.step(DT)
    }
    play.release()
    steps(play, 1)
    play.press({ kind: 'bucket' })
    play.tap()
    steps(play, 2)
    play.press({ kind: 'sun' })
    play.tap()
    return play
  }

  it.each(['drop', 'roll', 'climb'] as const)('answers in the frame of its squeak with a start that is seen, eyes shut and mouth round, while it is in its %s, and goes on its way', (move) => {
    const play = evening(), star = play.folk.starfish
    let waited = 0
    while (star.move !== move && waited < 30) {
      play.step(DT)
      waited += DT
    }
    expect(star.move, 'it comes to this move').toBe(move)
    // A few frames in, so that nothing else of that move's beginning is taken for the answer.
    steps(play, move === 'roll' ? 0.5 : 0.1)
    expect(star.move).toBe(move)
    const from = play.heard.length, squash = star.squash, arms = [...star.arms]
    play.press({ kind: 'folk', who: 'starfish', index: 0 })
    play.tap()
    play.step(DT)
    expect(names(play, from)).toContain('squeak')
    // In that frame its eyes are shut and its mouth is round.
    expect(star.blink).toBe(1)
    expect(star.mouth).toBe(1)
    // It is flattened and springs back: seen within a tenth of a second, and over within a second.
    let most = 0
    for (let t = 0; t < 0.1; t += DT) {
      play.step(DT)
      most = Math.max(most, star.squash - squash)
    }
    expect(most).toBeGreaterThan(0.12)
    // No arm has curled: it cannot make a fist while it wheels or leaps.
    star.arms.forEach((arm, index) => expect(Math.abs(arm - arms[index])).toBeLessThan(0.1))
    // Its eyes open again when the start is over (a blink of its own may follow at any time).
    let open = false
    for (let t = 0; t < STAR_START.lasts + 0.3; t += DT) {
      play.step(DT)
      open = open || star.blink === 0
    }
    expect(open).toBe(true)
    // And it gets where it was going.
    steps(play, 12)
    expect(star.move).toBe('perched')
    expect(star.on).toBe('tower')
  })
})

describe('a finger that lands on a thing that is not carried and goes on onto the sand', () => {
  const camera = cameraFor(1180, 820)
  const targetOf = (play: Play, x: number, y: number) => targetAt(camera, x, y, play.field, play.folk.spots((gx, gz) => play.ground(gx, gz)), play.sea, play.drawn(), play.cloudXs())
  const saved = (play: Play): string => JSON.stringify(serializeKingdom(play.toState()))
  // Where each begins on the surface, and the sound the thing answers with.
  const starts: Record<string, (play: Play) => { x: number; y: number; kind: string; sound: string }> = {
    rock: () => ({ ...project(camera, EEL_ROCK.x + 1.2, EEL_ROCK.top * 0.5, EEL_ROCK.z + 1.2), kind: 'rock', sound: 'knock' }),
    log: () => ({ ...project(camera, LOG.x0 + (LOG.x1 - LOG.x0) * 0.66, LOG.top - 0.1, LOG.z + 0.2), kind: 'log', sound: 'hollow' }),
    cloud: (play) => ({ ...cloudTouch(camera, CLOUDS[1], play.cloudXs()[1]), kind: 'cloud', sound: 'puff' }),
    // The first open sky to the right of the home control, clear of the sun and of every cloud.
    sky: (play) => {
      let x = 660
      while (x < 1100 && (!answers(camera, x, 70) || targetOf(play, x, 70).kind !== 'sky')) x += 20
      return { x, y: 70, kind: 'sky', sound: 'breath' }
    },
    crab: (play) => ({ ...project(camera, play.folk.crab.x, play.folk.crab.floor + 0.3, play.folk.crab.z), kind: 'folk', sound: 'clack' }),
  }

  it.each(Object.keys(starts))('digs from where it comes onto the sand, with the sand\'s sound in that frame: begun on the %s', (name) => {
    const play = fresh()
    steps(play, 0.6)
    const start = starts[name](play)
    expect(targetOf(play, start.x, start.y).kind, 'what the finger lands on').toBe(start.kind)
    const end = project(camera, 0.4, heightAt(play.field, 0.4, 6.6), 6.6)
    const before = saved(play), from = play.heard.length
    const at = { x: start.x, y: start.y }
    act(play, camera, [{ type: 'press', at }])
    expect(names(play, from)).toContain(start.sound)
    expect(play.passing).toBe(true)
    const count = 90
    let came = -1, cameAt = { x: 0, z: 0 }, landed = -1
    const gestures = (i: number): Gesture[] => {
      const to = { x: start.x + ((end.x - start.x) * i) / count, y: start.y + ((end.y - start.y) * i) / count }
      return i === 1 ? [{ type: 'dragStart', from: at }, { type: 'dragMove', from: at, at: to }] : [{ type: 'dragMove', from: at, at: to }]
    }
    for (let i = 1; i <= count; i++) {
      const sx = start.x + ((end.x - start.x) * i) / count, sy = start.y + ((end.y - start.y) * i) / count
      const under = targetOf(play, sx, sy), heard = play.heard.length
      act(play, camera, gestures(i))
      if (came < 0 && (under.kind === 'sand' || under.kind === 'water')) {
        came = i
        cameAt = { x: under.x, z: under.z }
        // The frame it comes on is the frame of the landing: a sound of the sand or the sea, and a stroke begun.
        expect(play.heard.length, 'a sound in the frame it comes on').toBeGreaterThan(heard)
        expect(play.digging).toBe(true)
        expect(play.passing).toBe(false)
      } else if (came < 0) {
        // Still over the thing it began on, or another that is not carried: nothing is dug and nothing is in the hand.
        expect(play.digging, `frame ${i}`).toBe(false)
        expect(play.holding, `frame ${i}`).toBe(false)
        expect(saved(play), `frame ${i}`).toBe(before)
      }
      if (landed < 0 && under.kind === 'sand') landed = i
      play.step(DT)
    }
    expect(came).toBeGreaterThan(0)
    expect(came).toBeLessThan(count - 20)
    expect(landed).toBeGreaterThan(0)
    // A groove lies along the last of the way, on the sand, and the save has it.
    const last = { x: 0.4, z: 6.6 }
    let dug = 0
    for (let k = 1; k <= 6; k++) if (deltaAt(play.field, last.x + (cameAt.x - last.x) * k * 0.04, last.z + (cameAt.z - last.z) * k * 0.04) < -0.08) dug += 1
    expect(dug).toBeGreaterThanOrEqual(4)
    expect(saved(play)).not.toBe(before)
    act(play, camera, [{ type: 'dragEnd', from: at, at: { x: end.x, y: end.y } }])
    expect(play.digging).toBe(false)
  })

  it('a finger that stays on the thing it began on digs nothing, and a thing in the hand is carried as before', () => {
    const play = fresh()
    steps(play, 0.6)
    const start = starts.rock(play), before = saved(play)
    const at = { x: start.x, y: start.y }
    act(play, camera, [{ type: 'press', at }, { type: 'dragStart', from: at }, { type: 'dragMove', from: at, at: { x: at.x + 16, y: at.y - 4 } }, { type: 'dragEnd', from: at, at: { x: at.x + 16, y: at.y - 4 } }])
    expect(play.digging).toBe(false)
    expect(saved(play)).toBe(before)
    // The bucket in the hand goes with the finger: the sand it passes over is not dug by a landing.
    const bucket = play.drawn().bucket, on = project(camera, bucket.x, bucket.y, bucket.z)
    const down = { x: on.x, y: on.y }
    act(play, camera, [{ type: 'press', at: down }])
    expect(play.passing).toBe(false)
    expect(play.holding).toBe(true)
    act(play, camera, [{ type: 'dragStart', from: down }, { type: 'dragMove', from: down, at: { x: down.x - 120, y: down.y + 40 } }])
    expect(play.holding).toBe(true)
    expect(play.digging).toBe(false)
  })
})
