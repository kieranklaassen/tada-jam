import { describe, expect, it } from 'vitest'
import { LOVES, MOOD_SECONDS, mothPose, poseOf, rest, type Mood, type Pose } from './cast'
import { GOOSE, PIG, SHEEP, SHEPHERD } from './layout'
import { ALL_KINDS } from './wool'

const WHO = [SHEEP, GOOSE, SHEPHERD, PIG]
const MOODS: readonly Mood[] = ['idle', 'look', 'poke', 'tickle']
const FIELDS = Object.keys(rest()) as (keyof Pose)[]
/** Slides are in stage units and the rest are ratios or turns: bring them to one scale. */
const SCALE: Partial<Record<keyof Pose, number>> = { dx: 0.05, dy: 0.05, headX: 0.05, headY: 0.05 }

/** A figure through one mood, sixty times a second, each field as its swing from rest. The eyes look straight ahead. */
function trace(who: number, mood: Mood, variant = 0, seconds = mood === 'idle' ? 12 : MOOD_SECONDS[mood]): number[][] {
  const out: number[][] = [], pose = rest(), still = rest()
  for (let i = 0; i < seconds * 60; i++) {
    poseOf(who, 3 + i / 60, mood, i / 60, 0, 0, variant, pose)
    out.push(FIELDS.map((field) => (pose[field] - still[field]) * (SCALE[field] ?? 1)))
  }
  return out
}

const apart = (a: number[][], b: number[][]): number => {
  let sum = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) for (let f = 0; f < FIELDS.length; f++) sum += Math.abs(a[i][f] - b[i][f])
  return sum / n
}

describe('the figures', () => {
  it('are alive at idle: each moves, blinks and works its own funny part with no touch', () => {
    for (const who of WHO) {
      const t = trace(who, 'idle')
      const moves = (field: keyof Pose) => t.some((row) => Math.abs(row[FIELDS.indexOf(field)]) > 1e-4)
      expect(moves('lid'), `figure ${who} blinks`).toBe(true)
      expect(moves('a'), `figure ${who} works its own part`).toBe(true)
      expect(moves('sy') || moves('lean') || moves('dy'), `figure ${who} breathes or rocks`).toBe(true)
    }
  })

  it('share no animation: in every mood the four hold themselves differently', () => {
    for (const mood of MOODS) {
      for (let i = 0; i < WHO.length; i++) {
        for (let j = i + 1; j < WHO.length; j++) expect(apart(trace(WHO[i], mood), trace(WHO[j], mood)), `${mood}: figures ${WHO[i]} and ${WHO[j]}`).toBeGreaterThan(0.08)
      }
    }
  })

  it('show each feeling as a pose of its own, unlike idling and unlike the other feelings', () => {
    for (const who of WHO) {
      for (let i = 0; i < MOODS.length; i++) {
        for (let j = i + 1; j < MOODS.length; j++) {
          const seconds = Math.min(MOOD_SECONDS[MOODS[i]], MOOD_SECONDS[MOODS[j]], 1)
          expect(apart(trace(who, MOODS[i], 0, seconds), trace(who, MOODS[j], 0, seconds)), `figure ${who}: ${MOODS[i]} and ${MOODS[j]}`).toBeGreaterThan(0.05)
        }
      }
    }
  })

  it('answer a second poke differently from the first', () => {
    for (const who of WHO) expect(apart(trace(who, 'poke', 0), trace(who, 'poke', 1)), `figure ${who}`).toBeGreaterThan(0.01)
  })

  it('end every feeling where idling carries on: no jump when the mood is over', () => {
    for (const who of WHO) {
      for (const mood of MOODS.slice(1)) {
        const end = poseOf(who, 9, mood, MOOD_SECONDS[mood], 0, 0, 0, rest()), idle = poseOf(who, 9, 'idle', 0, 0, 0, 0, rest())
        // The parts that spin or sit away from rest in a mood are let go by the view's own easing; the body is where it was.
        for (const field of ['dx', 'dy', 'sx', 'sy', 'lean'] as const) expect(end[field], `figure ${who} after ${mood}: ${field}`).toBeCloseTo(idle[field], 2)
      }
    }
  })

  it('follow the finger with their eyes', () => {
    for (const who of WHO) {
      const pose = poseOf(who, 1, 'idle', 0, -0.7, 0.4, 0, rest())
      expect(pose.eyeX).toBe(-0.7)
      expect(pose.eyeY).toBe(0.4)
    }
  })

  it('have fixed tastes: the sheep is drawn to a hill, the goose to a pond, the shepherd to a fire, the pig to earth, and no mood is a verdict', () => {
    expect(LOVES[SHEEP]).toContain('hill')
    expect(LOVES[GOOSE]).toContain('pond')
    expect(LOVES[SHEPHERD]).toContain('fire')
    expect(LOVES[PIG]).toContain('earth')
    for (const who of WHO) for (const kind of LOVES[who]) expect(ALL_KINDS).toContain(kind)
    expect(Object.keys(MOOD_SECONDS).sort()).toEqual(['idle', 'look', 'poke', 'tickle'])
  })

  it('give the moth a tremble at rest and a fast beat in flight', () => {
    const at = { wing: 0, feeler: 0, bob: 0, bite: 0 }
    let trembles = false, cleans = false
    for (let i = 0; i < 600; i++) {
      mothPose(i / 60, false, -1, at)
      trembles ||= Math.abs(at.wing) > 0.01
      cleans ||= at.feeler > 0.1
    }
    expect(trembles && cleans).toBe(true)
    let beats = 0, last = 0
    for (let i = 0; i < 60; i++) {
      const wing = mothPose(i / 60, true, -1, at).wing
      if (last <= 0 && wing > 0) beats++
      last = wing
    }
    expect(beats).toBeGreaterThan(6)
  })
})
