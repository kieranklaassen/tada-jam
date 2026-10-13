import { describe, expect, it } from 'vitest'
import { SUN_LOOK } from './folk'
import { deserializeKingdom } from './kingdom'
import { SUN } from './layout'
import { Play } from './play'
import { JOURNEY_SECONDS } from './sun'
import { FOLK_COME } from './timeline'

// The longest wait in the game is the evening: the sun's journey down and the scene's first beats, before the
// crab is sent to its evening place. The folk are in that wait: each turns to the sun and follows it down.

const DT = 1 / 60
const fresh = (seed: number): Play => new Play(deserializeKingdom(null, seed), 1)
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

type Look = { crab: number[]; star: number[]; eel: number[]; gulls: number[] }
const look = (play: Play): Look => {
  const folk = play.folk
  return {
    crab: folk.crab.eyes.flatMap((eye) => [eye.across, eye.toward]),
    star: [folk.starfish.lookAcross, folk.starfish.lookUp, folk.starfish.wave],
    eel: [folk.eel.lookAcross, folk.eel.lookUp],
    gulls: folk.gulls.birds.map((bird) => bird.head),
  }
}

describe('the folk while the sun goes down', () => {
  it.each([[1], [7], [23]])('each turns to the sun and follows it down, and none is still for half a second before the crab is sent: seed %i', (seed) => {
    const play = fresh(seed), folk = play.folk
    for (let t = 0; t < 3; t += DT) play.step(DT)
    play.press({ kind: 'sun' })
    play.tap()
    const wait = JOURNEY_SECONDS + FOLK_COME.crab
    const frames: Look[] = [look(play)]
    const lows: number[] = [0]
    let arrived = -1
    for (let t = 0; t < wait - 2 * DT; t += DT) {
      play.step(DT)
      frames.push(look(play))
      lows.push(play.sun.t)
      if (arrived < 0 && play.sun.home === 'down') arrived = frames.length - 1
      // The eel's eyes are on the sun in every frame, up at it and down with it.
      expect(folk.eel.lookUp).toBeCloseTo(1 - SUN_LOOK.drop * play.sun.t, 6)
      if (play.sun.home === 'up') expect(folk.eel.lookAcross).toBeCloseTo(clamp((SUN.x - folk.eel.x) * SUN_LOOK.across, SUN_LOOK.seek - 1, 1 - SUN_LOOK.seek), 6)
    }
    expect(arrived).toBeGreaterThan(JOURNEY_SECONDS / DT - 5)
    const at = (seconds: number): Look => frames[Math.round(seconds / DT)]
    // A second in, each has turned to it where it stands high.
    const early = at(1.2), low = lows[Math.round(1.2 / DT)]
    for (const toward of [early.crab[1], early.crab[3]]) expect(toward).toBeLessThan(-SUN_LOOK.high * 0.8)
    expect(early.star[1]).toBeGreaterThan(0.8)
    for (const head of early.gulls) expect(head).toBeLessThan(-SUN_LOOK.head * 0.7)
    expect(low).toBeLessThan(0.4)
    // When it is down they have followed it down: the crab's eyes right out to it, the starfish's eyes lower and
    // its arm up after it, the gulls' heads further round.
    const late = frames[arrived + 30]
    for (const toward of [late.crab[1], late.crab[3]]) expect(toward).toBeLessThan(-0.9)
    expect(late.star[1]).toBeLessThan(early.star[1] - 0.25)
    expect(late.star[1]).toBeCloseTo(1 - SUN_LOOK.drop, 1)
    for (let i = 0; i < 3; i++) expect(late.gulls[i]).toBeLessThan(early.gulls[i] - 0.3)
    // The starfish's arm goes up after the sun from its rock: higher late than early, whenever it is not at its reach.
    const arm = (from: number, to: number): number => Math.max(...frames.slice(from, to).map((frame) => frame.star[2]))
    expect(arm(arrived, frames.length)).toBeGreaterThan(0.6)
    expect(arm(arrived, frames.length)).toBeGreaterThan(arm(0, 40) + 0.3)
    // They turn one after another, never together: each gull's head passes the same mark in a frame of its own.
    const turned = [0, 1, 2].map((i) => frames.findIndex((frame) => frame.gulls[i] < -0.3))
    expect(new Set(turned).size).toBe(3)
    const eyes = [1, 3].map((i) => frames.findIndex((frame) => frame.crab[i] < -0.3))
    expect(eyes[0]).not.toBe(eyes[1])
    // None of the four is still for half a second anywhere in the wait: with the sun down their eyes go along the sky where it was.
    const window = Math.round(0.5 / DT)
    for (let from = 0; from + window < frames.length; from += window) {
      for (const who of ['crab', 'star', 'eel', 'gulls'] as const) {
        let moved = 0
        for (let i = from + 1; i <= from + window; i++) frames[i][who].forEach((value, k) => { moved += Math.abs(value - frames[i - 1][who][k]) })
        expect(moved, `${who} from ${(from * DT).toFixed(1)} s`).toBeGreaterThan(0.004)
      }
    }
  })

  it('a sun held in the hand takes their eyes with it, down and back up, and at rest at the top they look where they like', () => {
    const play = fresh(7), folk = play.folk
    for (let t = 0; t < 2; t += DT) play.step(DT)
    play.press({ kind: 'sun' })
    play.dragStart()
    for (let i = 1; i <= 60; i++) {
      play.drag(null, null, 0.6 * (i / 60))
      play.step(DT)
    }
    expect(play.sun.t).toBeGreaterThan(0.3)
    const down = folk.starfish.lookUp
    expect(folk.eel.lookUp).toBeCloseTo(1 - SUN_LOOK.drop * play.sun.t, 6)
    for (let i = 59; i >= 0; i--) {
      play.drag(null, null, 0.6 * (i / 60))
      play.step(DT)
    }
    expect(folk.eel.lookUp).toBeCloseTo(1 - SUN_LOOK.drop * play.sun.t, 6)
    expect(folk.starfish.lookUp).toBeGreaterThan(down + 0.05)
    play.release()
    // Back at the top and let go: the eel's eyes jump about again.
    const seen = new Set<number>()
    for (let t = 0; t < 6; t += DT) {
      play.step(DT)
      if (play.sun.mode === 'rest') seen.add(folk.eel.lookUp)
    }
    expect(play.sun.home).toBe('up')
    expect(seen.size).toBeGreaterThan(3)
  })
})
