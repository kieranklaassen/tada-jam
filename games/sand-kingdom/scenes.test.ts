import { describe, expect, it } from 'vitest'
import { BEACHES, MOAT } from './beaches'
import { decode, deltaAt, makeField, peakNear, tower } from './field'
import { type Kingdom, deserializeKingdom, serializeKingdom } from './kingdom'
import { type Heard, Play } from './play'
import { DAY_PLAN } from './plan'
import { JOURNEY_SECONDS } from './sun'
import { FOLK_COME, TIDE_OUT } from './timeline'
import { EVENING_SEA, FAR_SEA } from './water'
import { SEA } from './field'

// The two scenes: the folk come when the sun reaches the bottom, and the tide
// goes out when it is sent back to the top. Each saves its outcome before its
// first beat, a touch ends it, and neither plays again on load.

const DT = 1 / 60
const fresh = (age: number | null = 7): Play => new Play(deserializeKingdom(null, age), 1)
const steps = (play: Play, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) play.step(DT)
}
/** Put away and opened again: what the shell would hand back. */
const reopened = (play: Play, age: number | null = 7): Play => new Play(deserializeKingdom(JSON.parse(JSON.stringify(serializeKingdom(play.toState()))), age), 2)
const since = (play: Play, from: number): string[] => play.heard.slice(from).map((one) => one.name)
const tapSun = (play: Play): void => {
  play.press({ kind: 'sun' })
  play.tap()
}
const tapSand = (play: Play, x: number, z: number): void => {
  play.endScene()
  play.press({ kind: 'sand', x, z })
  play.tap()
}

describe('the sun', () => {
  it('rings one note when a finger lands on it and a second as it sets off, and the sea follows it the whole way', () => {
    const play = fresh()
    const from = play.heard.length
    play.press({ kind: 'sun' })
    expect(since(play, from)).toEqual(['chimeFirst'])
    play.tap()
    expect(since(play, from)).toEqual(['chimeFirst', 'chimeSecond'])
    expect(play.sun.travelling).toBe(true)
    steps(play, JOURNEY_SECONDS / 2)
    expect(play.sun.t).toBeGreaterThan(0.3)
    expect(play.sun.t).toBeLessThan(0.7)
    // The sea has come part of the way with it, and the light with it; nothing else has changed yet.
    expect(play.tide).toBeGreaterThan(SEA + 0.05)
    expect(play.tide).toBeLessThan(EVENING_SEA)
    expect(play.dusk).toBeGreaterThan(0.2)
    expect(play.playing).toBe(false)
    expect(play.toState().sun).toBe('up')
  })

  it('is turned round by a tap on its way, with a falling hum, and nothing has changed when it is back', () => {
    const play = fresh()
    const before = serializeKingdom(play.toState())
    tapSun(play)
    steps(play, JOURNEY_SECONDS * 0.6)
    const from = play.heard.length
    play.press({ kind: 'sun' })
    play.tap()
    expect(since(play, from)).toEqual(['hum'])
    steps(play, JOURNEY_SECONDS)
    expect(play.sun.t).toBe(0)
    expect(play.sun.mode).toBe('rest')
    expect(play.tide).toBeCloseTo(SEA, 5)
    expect(play.dusk).toBe(0)
    expect(play.playing).toBe(false)
    expect(serializeKingdom(play.toState())).toEqual(before)
  })

  it('goes with a finger that drags it, the sea with it, and goes back from less than half way with a hum', () => {
    const play = fresh()
    play.press({ kind: 'sun' })
    play.dragStart()
    play.drag(null, null, 0.3)
    play.step(DT)
    expect(play.sun.t).toBeCloseTo(0.3, 5)
    expect(play.tide).toBeGreaterThan(SEA + 0.02)
    const from = play.heard.length
    play.release()
    expect(since(play, from)).toEqual(['hum'])
    steps(play, JOURNEY_SECONDS)
    expect(play.sun.t).toBe(0)
    expect(play.playing).toBe(false)
    // Past half way it finishes the journey, with the second note.
    play.press({ kind: 'sun' })
    play.dragStart()
    play.drag(null, null, 0.7)
    const mark = play.heard.length
    play.release()
    expect(since(play, mark)).toEqual(['chimeSecond'])
    steps(play, JOURNEY_SECONDS)
    expect(play.sun.home).toBe('down')
    expect(play.playing).toBe(true)
  })
})

describe('the folk come', () => {
  const atDusk = (): { play: Play; from: number } => {
    const play = new Play(BEACHES.kingdom(7), 1)
    const from = play.heard.length
    tapSun(play)
    steps(play, JOURNEY_SECONDS + DT)
    return { play, from }
  }

  it('saves the evening as it will be, at once, before its first beat has shown anything', () => {
    const { play } = atDusk()
    expect(play.playing).toBe(true)
    expect(play.urgent).toBe(true)
    const saved = play.toState()
    expect(saved.sun).toBe('down')
    expect(saved.finished).toBe(true)
    // The folk have not set out yet, and the water has not run.
    expect(play.folk.crab.out).toBe(false)
    // The same thing is saved for as long as the scene plays, and it is what the scene ends on.
    steps(play, 3)
    expect(play.toState()).toBe(saved)
    steps(play, FOLK_COME.end + 2)
    expect(play.playing).toBe(false)
    const ended = serializeKingdom(play.toState())
    expect(ended.sand).toBe(saved.sand)
    expect(ended.wood).toEqual(saved.wood)
    expect(ended.sun).toBe('down')
  })

  it('brings them one by one, the crab first, each to what the beach holds for it', () => {
    const { play, from } = atDusk()
    const folk = play.folk
    const seen: string[] = []
    const home = { star: folk.starfish.on, eel: folk.eel.where, gull: folk.gulls.birds[0].place }
    for (let t = 0; t < FOLK_COME.end + 14; t += DT) {
      play.step(DT)
      if (!seen.includes('crab') && folk.crab.out) seen.push('crab')
      if (!seen.includes('star') && folk.starfish.move !== 'perched') seen.push('star')
      if (!seen.includes('eel') && folk.eel.where !== home.eel) seen.push('eel')
      if (!seen.includes('gulls') && folk.gulls.birds.some((bird) => bird.place !== home.gull || bird.y > 1.4)) seen.push('gulls')
    }
    expect(seen).toEqual(['crab', 'star', 'eel', 'gulls'])
    expect(folk.starfish.on).toBe('tower')
    expect(folk.starfish.on).not.toBe(home.star)
    expect(folk.eel.where).toBe('groove')
    expect(folk.gulls.birds.every((bird) => bird.place === 'wall')).toBe(true)
    expect(since(play, from)).toContain('fizz')
  })

  it('is ended by a touch: the water stands filled, each of the folk is at its place, and the touch is an ordinary touch', () => {
    const { play } = atDusk()
    steps(play, 0.5)
    const saved = play.toState()
    const from = play.heard.length
    play.endScene()
    play.press({ kind: 'sand', x: -2.8, z: 4.9 })
    expect(play.playing).toBe(false)
    expect(since(play, from)).toEqual(['thud'])
    expect(deltaAt(play.field, -2.8, 4.9)).toBeLessThan(-0.1)
    play.tap()
    expect(play.tide).toBe(EVENING_SEA)
    expect(play.dusk).toBe(1)
    expect(play.folk.starfish.on).toBe('tower')
    expect(play.folk.starfish.move).toBe('perched')
    expect(play.folk.eel.where).toBe('groove')
    expect(play.folk.gulls.birds.every((bird) => bird.place === 'wall' && bird.y > 0)).toBe(true)
    expect(play.folk.crab.out).toBe(true)
    // Nothing but the dent differs from what was saved when the scene began.
    const now = play.toState()
    expect(now.wood).toEqual(saved.wood)
    expect(now.sun).toBe('down')
  })

  it('does not play again on load: the evening is found filled, placed and silent', () => {
    const { play } = atDusk()
    // Put away in the first half second of the scene.
    steps(play, 0.5)
    const again = reopened(play)
    expect(again.playing).toBe(false)
    expect(again.heard).toEqual([])
    expect(again.voices).toEqual([])
    expect(again.grains).toEqual([])
    expect(again.sun.t).toBe(1)
    expect(again.tide).toBe(EVENING_SEA)
    expect(again.folk.starfish.on).toBe('tower')
    expect(again.folk.eel.where).toBe('groove')
    expect(again.folk.gulls.birds.every((bird) => bird.place === 'wall')).toBe(true)
    expect(again.standing(MOAT.x + MOAT.r, MOAT.z)).toBe(true)
    steps(again, 1)
    expect(again.playing).toBe(false)
    expect(again.heard.every((one) => one.by !== 'sea' && one.by !== 'sun')).toBe(true)
    // And it is the same evening the scene would have ended on.
    steps(play, FOLK_COME.end + 2)
    expect(serializeKingdom(again.toState()).sand).toBe(serializeKingdom(play.toState()).sand)
  })

  it('answers what the child changes at evening as soon as the finger lifts', () => {
    const play = new Play(BEACHES.evening(7), 1)
    expect(play.folk.starfish.on).toBe('tower')
    // The tower is patted away from under the starfish: it moves to what is left standing, and that is patted too.
    const star = play.folk.starfish
    for (let i = 0; i < 60 && star.on === 'tower'; i++) {
      play.press({ kind: 'sand', x: star.x, z: star.z })
      play.tap()
      steps(play, 0.25)
    }
    steps(play, 6)
    expect(play.folk.starfish.on).not.toBe('tower')
    expect(play.playing).toBe(false)
  })
})

describe('the tide goes out', () => {
  const leaving = (): { play: Play; from: number; evening: Kingdom } => {
    const play = new Play(BEACHES.evening(7), 1)
    const evening = serializeKingdom(play.toState())
    const from = play.heard.length
    tapSun(play)
    return { play, from, evening }
  }

  it('gives a journey the child sees and can turn round: the sea draws far back and the folk leave, and nothing is smoothed yet', () => {
    const { play, evening } = leaving()
    steps(play, JOURNEY_SECONDS * 0.7)
    expect(play.sun.t).toBeLessThan(0.5)
    // The sea has drawn back further than it stands by day, and the folk are on their way home.
    expect(play.tide).toBeLessThan(SEA)
    expect(play.tide).toBeGreaterThanOrEqual(FAR_SEA)
    expect(play.folk.gulls.birds.some((bird) => bird.place === 'log' || bird.y > 1)).toBe(true)
    expect(play.playing).toBe(false)
    expect(serializeKingdom(play.toState()).sand).toBe(evening.sand)
    // Turned round, the evening comes back as it was: nothing was lost.
    play.press({ kind: 'sun' })
    play.tap()
    steps(play, JOURNEY_SECONDS + 12)
    expect(play.sun.home).toBe('down')
    expect(play.sun.t).toBe(1)
    expect(play.tide).toBeCloseTo(EVENING_SEA, 5)
    expect(play.playing).toBe(false)
    expect(serializeKingdom(play.toState())).toEqual(evening)
    expect(play.folk.starfish.on).toBe('tower')
    expect(play.folk.eel.where).toBe('groove')
  })

  it('saves the smooth day beach at once when the sun arrives, and one long wave smooths the sand as it passes', () => {
    const { play, from } = leaving()
    steps(play, JOURNEY_SECONDS + DT)
    expect(play.playing).toBe(true)
    expect(play.urgent).toBe(true)
    const saved = play.toState()
    expect(saved.sun).toBe('up')
    expect(saved.finished).toBe(false)
    expect(saved.sand).toBe('')
    expect(saved.dug).toEqual([])
    // Nothing is smooth yet: the tower still stands.
    expect(peakNear(play.field, MOAT.x, MOAT.z, 0.5)).toBeGreaterThan(0.5)
    steps(play, TIDE_OUT.wave.at + TIDE_OUT.wave.lasts * 0.5)
    expect(since(play, from).filter((name) => name === 'wave')).toHaveLength(1)
    // The wave is half way up the beach: smooth behind it, as built ahead of it.
    expect(play.wave.show).toBe(1)
    expect(play.wave.front).toBeGreaterThan(0)
    expect(play.wave.front).toBeLessThan(3)
    expect(Math.abs(deltaAt(play.field, 2, play.wave.front - 1.5))).toBeLessThan(0.02)
    expect(peakNear(play.field, MOAT.x, MOAT.z, 0.5)).toBeGreaterThan(0.5)
    steps(play, TIDE_OUT.back.at + TIDE_OUT.back.lasts)
    expect(play.playing).toBe(false)
    expect(play.field.d.every((d) => d === 0)).toBe(true)
    expect(play.tide).toBeCloseTo(SEA, 5)
    expect(play.dusk).toBe(0)
    expect(play.gold).toBe(0)
    expect(play.wave.show).toBe(0)
    expect(play.wet.every((w) => w === 0)).toBe(true)
    expect(play.dug).toEqual([])
    // The bucket, the shells and the wood are where they were; a shell worn or stuck in a tower lies on the sand.
    const ended = serializeKingdom(play.toState())
    expect(ended.bucket).toEqual(saved.bucket)
    expect(ended.wood).toEqual(saved.wood)
    expect(ended.shells.every((shell) => shell.state === 'lying' || shell.state === 'bucket')).toBe(true)
    expect(ended.sand).toBe(saved.sand)
    // The folk are back at their day places.
    steps(play, 8)
    expect(play.folk.starfish.on).toBe('rock')
    expect(play.folk.eel.where).toBe('rock')
    expect(play.folk.gulls.birds.every((bird) => bird.place === 'log')).toBe(true)
    expect(play.folk.crab.out).toBe(false)
  })

  it('washes a shell out of a tower\'s side and one pressed into the sand so that each tips over and lies flat, never flat from one frame to the next', () => {
    const { play } = leaving()
    // The kingdom holds one of each: a shell in the tower's side and one pressed in at the top of the beach.
    const states = play.things.shells.map((shell) => shell.state)
    expect(states).toContain('tower')
    expect(states).toContain('pressed')
    let was = play.things.shells.map((_, index) => play.shellPose(index))
    const tipped = play.things.shells.map(() => 0)
    for (let t = 0; t < JOURNEY_SECONDS + TIDE_OUT.back.at + TIDE_OUT.back.lasts + 1; t += DT) {
      play.step(DT)
      const now = play.things.shells.map((_, index) => play.shellPose(index))
      now.forEach((pose, index) => {
        if (play.hat === index || states[index] === 'lying') return
        // No frame turns it more than a twentieth of the way over, or moves it more than a finger's width.
        expect(Math.abs(pose.tip - was[index].tip), `shell ${index} at ${t.toFixed(2)}`).toBeLessThan(0.12)
        expect(Math.hypot(pose.x - was[index].x, pose.y - was[index].y, pose.z - was[index].z), `shell ${index} at ${t.toFixed(2)}`).toBeLessThan(0.12)
        tipped[index] += Math.abs(pose.tip - was[index].tip)
      })
      was = now
    }
    play.things.shells.forEach((shell, index) => {
      if (states[index] === 'lying') return
      expect(shell.state).toBe('lying')
      expect(play.shellPose(index).tip).toBeCloseTo(shell.up ? 0 : Math.PI, 5)
      expect(tipped[index]).toBeGreaterThan(0.3)
    })
  })

  it('is ended by a touch, which is then an ordinary touch on a smooth beach, and does not play again on load', () => {
    const { play } = leaving()
    steps(play, JOURNEY_SECONDS + 0.4)
    const again = reopened(play)
    expect(again.playing).toBe(false)
    expect(again.heard).toEqual([])
    expect(again.sun.t).toBe(0)
    expect(again.field.d.every((d) => d === 0)).toBe(true)
    expect(again.wave.show).toBe(0)
    steps(again, 1)
    expect(again.heard.every((one) => one.by !== 'sea')).toBe(true)
    const from = play.heard.length
    tapSand(play, -2.8, 4.9)
    expect(play.playing).toBe(false)
    expect(since(play, from)).toEqual(['thud'])
    expect(play.wave.show).toBe(0)
    expect(play.gold).toBe(0)
    expect(deltaAt(play.field, -2.8, 4.9)).toBeLessThan(-0.1)
    expect(deltaAt(play.field, MOAT.x, MOAT.z)).toBe(0)
    const field = makeField()
    decode(serializeKingdom(play.toState()).sand, field)
    expect(deltaAt(field, -2.8, 4.9)).toBeLessThan(-0.1)
  })

  it('leaves the cycle where it began: the day beach, and the sun can go down again', () => {
    const { play } = leaving()
    steps(play, JOURNEY_SECONDS + TIDE_OUT.back.at + TIDE_OUT.back.lasts + 1)
    expect(play.sun.home).toBe('up')
    tower(play.field, 0, 3, 0, 1)
    tapSun(play)
    steps(play, JOURNEY_SECONDS + FOLK_COME.end + 3)
    expect(play.sun.home).toBe('down')
    expect(play.folk.starfish.on).toBe('tower')
    expect(DAY_PLAN.star.on).toBe('rock')
  })
})

export type { Heard }
