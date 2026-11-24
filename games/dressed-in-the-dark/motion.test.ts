import { describe, expect, it } from 'vitest'
import { ACTS, LASTS, NATURE, poseOf, type Act, type Pose } from './motion'
import { SLEEPERS, type Sleeper } from './things'

const KEYS: (keyof Pose)[] = ['x', 'up', 'turn', 'flip', 'wide', 'tall', 'headX', 'headY', 'headTurn', 'armL', 'armR', 'cover', 'legL', 'legR', 'own', 'mouth']
const SIZE: Partial<Record<keyof Pose, number>> = { x: 1 / 30, up: 1 / 30, headX: 1 / 12, headY: 1 / 12, turn: 4, headTurn: 3, wide: 6, tall: 6 }
const at = (sleeper: Sleeper, act: Act, u: number) => poseOf(sleeper, act, u * (LASTS[act] || 3), 10 + u * 3, { x: 0, y: 0 })
function apart(a: Sleeper, b: Sleeper, act: Act): number {
  let sum = 0
  for (let i = 0; i <= 30; i++) { const p = at(a, act, i / 30), q = at(b, act, i / 30); sum += Math.max(...KEYS.map((key) => Math.abs((p[key] - q[key]) * (SIZE[key] ?? 1)))) }
  return sum / 31
}

describe('how they move', () => {
  it.each(ACTS.filter((act) => !['awake', 'look', 'sleepy', 'scuttle', 'knight', 'lady', 'rider'].includes(act)))('no two share their %s', (act) => {
    for (const a of SLEEPERS) for (const b of SLEEPERS) if (a < b) expect(apart(a, b, act), `${a} and ${b}`).toBeGreaterThan(0.2)
  })
  it.each(['knight', 'lady', 'rider'] as const)('the %s is played by each in its own body', (act) => {
    for (const a of SLEEPERS) for (const b of SLEEPERS) if (a < b) expect(apart(a, b, act), `${a} and ${b}`).toBeGreaterThan(0.03)
  })
  it('breathes, twitches and steps differently in the dark', () => {
    expect(new Set(SLEEPERS.map((sleeper) => NATURE[sleeper].breath)).size).toBe(5)
    expect(new Set(SLEEPERS.map((sleeper) => NATURE[sleeper].stride)).size).toBe(5)
    expect(new Set(SLEEPERS.map((sleeper) => JSON.stringify([0.2, 0.45, 0.7].map(NATURE[sleeper].twitch)))).size).toBe(5)
  })
  it('is never still, never not a number, and stays within its bed', () => {
    for (const sleeper of SLEEPERS) for (const act of ACTS) {
      for (let i = 0; i <= 60; i++) {
        const pose = at(sleeper, act, i / 60)
        for (const value of Object.values(pose)) expect(Number.isFinite(value)).toBe(true)
        expect(Math.abs(pose.x)).toBeLessThan(30)
        expect(pose.up).toBeGreaterThanOrEqual(-1)
        expect(pose.up).toBeLessThan(130)
        expect(pose.tall).toBeGreaterThan(0.6)
      }
    }
    for (const sleeper of SLEEPERS) expect(JSON.stringify(poseOf(sleeper, 'awake', 0, 1, { x: 0, y: 0 }))).not.toBe(JSON.stringify(poseOf(sleeper, 'awake', 1, 2.1, { x: 0, y: 0 })))
  })
})
