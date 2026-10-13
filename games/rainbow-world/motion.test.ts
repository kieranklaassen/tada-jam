import { describe, expect, it } from 'vitest'
import { CHARACTERS, DOLL_TURN, FLIP, PERSONALITY, REAR, ROCK_KNOCKS, SILK_TURN, archAngle, dollTurn, freshPose, horseRear, idle, silkHeap, type Pose } from './motion'

describe('every character moves like itself', () => {
  it('gives no two characters the same tempo, blink or habit', () => {
    for (const key of ['breathHz', 'blinkEvery', 'blink', 'habitEvery', 'habit', 'partHz'] as const) {
      const values = CHARACTERS.map((who) => PERSONALITY[who][key])
      expect(new Set(values).size, key).toBe(CHARACTERS.length)
    }
  })

  it('makes no two of them move alike over a minute', () => {
    const fields: (keyof Pose)[] = ['stretch', 'lean', 'eye', 'mouth', 'brow', 'habit', 'part']
    const sampled = CHARACTERS.map((who) => {
      const series: number[][] = []
      for (let t = 0; t < 60; t += 0.05) { const pose = idle(who, t, freshPose()); series.push(fields.map((field) => pose[field])) }
      return series
    })
    for (let a = 0; a < CHARACTERS.length; a++) for (let b = a + 1; b < CHARACTERS.length; b++) {
      // For each part of the pose, how much of the minute the two spend apart. Their habits never line up, and at least four parts differ.
      const apart = fields.map((_, f) => sampled[a].filter((row, i) => Math.abs(row[f] - sampled[b][i][f]) > 0.004).length / sampled[a].length)
      expect(apart[fields.indexOf('habit')], `${CHARACTERS[a]} and ${CHARACTERS[b]}: habit`).toBeGreaterThan(0.15)
      expect(apart.filter((share) => share > 0.3).length, `${CHARACTERS[a]} and ${CHARACTERS[b]}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps every pose in range, at any time', () => {
    for (const who of CHARACTERS) for (let t = 0; t < 120; t += 0.07) {
      const pose = idle(who, t, freshPose())
      expect(Math.abs(pose.stretch), who).toBeLessThan(0.3)
      expect(Math.abs(pose.lean), who).toBeLessThan(0.12)
      for (const value of [pose.eye, pose.mouth, pose.habit]) { expect(value, who).toBeGreaterThanOrEqual(0); expect(value, who).toBeLessThanOrEqual(1) }
      for (const value of [pose.brow, pose.part]) { expect(value, who).toBeGreaterThanOrEqual(-1); expect(value, who).toBeLessThanOrEqual(1) }
    }
  })

  it('is the same at the same moment of the world\'s clock, however often it is asked', () => {
    for (const who of CHARACTERS) expect(idle(who, 12.34, freshPose())).toEqual(idle(who, 12.34, freshPose()))
  })
})

describe('things turned over', () => {
  it('rocks an arch on its back with knocks that are each softer and sooner, and brings it to rest', () => {
    expect(ROCK_KNOCKS.length).toBeGreaterThanOrEqual(5)
    expect(ROCK_KNOCKS[0].at).toBe(FLIP)
    for (let i = 1; i < ROCK_KNOCKS.length; i++) {
      expect(ROCK_KNOCKS[i].wide).toBeLessThan(ROCK_KNOCKS[i - 1].wide)
      if (i > 1) expect(ROCK_KNOCKS[i].at - ROCK_KNOCKS[i - 1].at).toBeLessThan(ROCK_KNOCKS[i - 1].at - ROCK_KNOCKS[i - 2].at)
    }
    // It knocks as it passes through level, so the picture and the sound are the same moment.
    for (const knock of ROCK_KNOCKS) expect(archAngle(knock.at, true)).toBeCloseTo(Math.PI, 6)
    expect(archAngle(0, true)).toBe(0)
    expect(archAngle(60, true)).toBe(Math.PI)
    expect(archAngle(Infinity, true)).toBe(Math.PI)
    let last = 0
    for (let t = 0; t < 4; t += 1 / 240) { const a = archAngle(t, true); expect(Math.abs(a - last)).toBeLessThan(0.12); last = a }
  })

  it('sets an arch back on its feet in one move', () => {
    expect(archAngle(0, false)).toBeCloseTo(Math.PI, 6)
    expect(archAngle(FLIP, false)).toBe(0)
    expect(archAngle(Infinity, false)).toBe(0)
  })

  it('turns a doll through edge-on, rears the horse and swings it round, and gathers the silk', () => {
    expect(dollTurn(0)).toBe(1)
    expect(dollTurn(DOLL_TURN / 2)).toBeCloseTo(0, 6)
    expect(dollTurn(DOLL_TURN)).toBeCloseTo(-1, 6)
    expect(horseRear(0)).toEqual({ up: 0, swung: false })
    expect(horseRear(0.25).up).toBe(1)
    expect(horseRear(REAR)).toEqual({ up: 0, swung: true })
    expect(horseRear(Infinity)).toEqual({ up: 0, swung: true })
    expect([silkHeap(0, true), silkHeap(SILK_TURN, true), silkHeap(Infinity, true)]).toEqual([0, 1, 1])
    expect([silkHeap(0, false), silkHeap(SILK_TURN, false), silkHeap(Infinity, false)]).toEqual([1, 0, 0])
  })
})
