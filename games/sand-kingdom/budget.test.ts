import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { groove, tower } from './field'
import { deserializeKingdom } from './kingdom'
import { MOST_GRAINS, MOST_RINGS, Play } from './play'
import { JOURNEY_SECONDS } from './sun'
import { FOLK_COME } from './timeline'

// The frame budget, counted and never timed: the heavy work (reading the
// water, sinking what the tide covers, smoothing the beach) is done once
// where it is owed and never frame after frame, and what flies is capped.

const DT = 1 / 60

describe('the work a frame does', () => {
  it('reads the water once when the evening begins and once for each thing the child changes, never while nothing changes', { timeout: 60_000 }, () => {
    const play = new Play(BEACHES.kingdom(7), 1)
    expect(play.work).toEqual({ floods: 0, sinks: 0, smooths: 0 })
    play.press({ kind: 'sun' })
    play.tap()
    let most = 0
    for (let t = 0; t < JOURNEY_SECONDS + FOLK_COME.end + 20; t += DT) {
      const before = play.work.floods + play.work.sinks
      play.step(DT)
      most = Math.max(most, play.work.floods + play.work.sinks - before)
    }
    // The heavy moment happened: the evening is there, with its water and its folk.
    expect(play.sun.home).toBe('down')
    expect(play.folk.starfish.on).toBe('tower')
    expect(play.work).toEqual({ floods: 1, sinks: 1, smooths: 0 })
    // Both in the one frame the sun arrived, and in no other.
    expect(most).toBe(2)
    // One more for each thing the child lets go of, and none for a tap on one of the folk.
    play.press({ kind: 'sand', x: -2.8, z: 4.9 })
    play.tap()
    expect(play.work.floods).toBe(2)
    play.press({ kind: 'folk', who: 'crab', index: 0 })
    play.tap()
    for (let t = 0; t < 10; t += DT) play.step(DT)
    expect(play.work.floods).toBe(2)
  })

  it('smooths the beach a strip at a time while the one wave runs, and stops when it has passed', () => {
    const play = new Play(BEACHES.evening(7), 1)
    // An evening found on load reads its water once, to stand filled.
    expect(play.work).toEqual({ floods: 1, sinks: 0, smooths: 0 })
    play.press({ kind: 'sun' })
    play.tap()
    let frames = 0, most = 0
    for (let t = 0; t < JOURNEY_SECONDS + 12; t += DT) {
      const before = play.work.smooths
      play.step(DT)
      most = Math.max(most, play.work.smooths - before)
      if (play.playing) frames += 1
    }
    expect(play.sun.home).toBe('up')
    expect(play.field.d.every((d) => d === 0)).toBe(true)
    expect(most).toBe(1)
    expect(play.work.smooths).toBeGreaterThan(60)
    expect(play.work.smooths).toBeLessThanOrEqual(frames)
    const after = play.work.smooths
    for (let t = 0; t < 5; t += DT) play.step(DT)
    expect(play.work.smooths).toBe(after)
    expect(play.work.floods).toBe(1)
  })

  it('never holds more grains or rings than its most, in the busiest moments there are', () => {
    const play = new Play(deserializeKingdom(null, 3), 1)
    // A crowded beach: towers in the sea's reach and grooves everywhere, then a storm of touches.
    for (let x = -5; x <= 5; x += 1.25) {
      tower(play.field, x, -1.2, 0, 1)
      groove(play.field, x, 0, x, 3)
    }
    let grains = 0, rings = 0
    const look = () => {
      grains = Math.max(grains, play.grains.length)
      rings = Math.max(rings, play.rings.length)
    }
    for (let i = 0; i < 240; i++) {
      const x = -5 + (i % 11), z = -3.4 + (i % 7) * 1.4
      play.press(z < -3 ? { kind: 'water', x, z } : { kind: 'sand', x, z })
      play.dragStart()
      play.drag(x + 0.8, z + 0.5, 0)
      play.release()
      if (i % 5 === 0) {
        play.press({ kind: 'bucket' })
        play.tap()
      }
      play.step(DT)
      look()
    }
    play.press({ kind: 'sun' })
    play.tap()
    for (let t = 0; t < JOURNEY_SECONDS + 6; t += DT) {
      play.step(DT)
      look()
    }
    // The heavy moment happened: grains flew and rings spread, up to the cap and not past it.
    expect(grains).toBeGreaterThan(100)
    expect(grains).toBeLessThanOrEqual(MOST_GRAINS)
    expect(rings).toBeGreaterThan(8)
    expect(rings).toBeLessThanOrEqual(MOST_RINGS)
    expect(play.heard.length).toBeLessThanOrEqual(96)
    // Nothing here plays them as the Mount does every frame: they pile up, each sound that comes later as a voice of its own.
    expect(play.voices.length).toBeLessThan(900)
    expect(play.sceneVoices.length).toBeLessThan(60)
  })
})

describe('a long frame', () => {
  it('leaves no pose flown off after frames of a tenth of a second, the longest the clock hands over', () => {
    const play = new Play(BEACHES.kingdom(3), 1)
    const finite = (value: unknown, path: string, seen: Set<unknown>): void => {
      if (path.endsWith('.state')) return // a random stream's own number
      if (typeof value === 'number') expect(Number.isNaN(value) || (Number.isFinite(value) && Math.abs(value) > 1e4), `${path} = ${value}`).toBe(false)
      else if (value && typeof value === 'object' && !ArrayBuffer.isView(value) && !seen.has(value)) {
        seen.add(value)
        for (const [key, inner] of Object.entries(value)) finite(inner, `${path}.${key}`, seen)
      }
    }
    const long = (seconds: number): void => {
      for (let t = 0; t < seconds; t += 0.1) play.step(0.1)
      finite(play.poses, 'poses', new Set())
      finite(play.folk, 'folk', new Set())
      // What hops has come down again.
      expect(Math.abs(play.poses.bucket.hop)).toBeLessThan(0.05)
      expect(Math.abs(play.folk.crab.lift)).toBeLessThan(0.05)
    }
    play.press({ kind: 'bucket' })
    play.tap()
    long(3)
    for (const who of ['crab', 'starfish', 'eel'] as const) {
      play.press({ kind: 'folk', who, index: 0 })
      play.tap()
      long(3)
    }
    play.press({ kind: 'folk', who: 'gull', index: 1 })
    play.tap()
    long(3)
    play.press({ kind: 'sun' })
    play.tap()
    long(JOURNEY_SECONDS + FOLK_COME.end + 6)
    expect(play.sun.home).toBe('down')
  })
})
