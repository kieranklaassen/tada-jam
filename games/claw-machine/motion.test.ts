import { describe, expect, it } from 'vitest'
import { GOBBLER, GOBBLERS } from './gobblers'
import { ACT_SECONDS, PERSONALITY, WRONG, actPose, actSeconds, idlePose, liftedPose, restPose, wrongPose, type Act, type Pose } from './motion'

const blank = (): Pose => restPose({} as Pose)
const numbers = (pose: Pose) => [pose.dx, pose.dy, pose.dz, pose.squash * 3, pose.leanX * 3, pose.leanZ * 3, pose.turn, pose.looks ? pose.gazeX : 0, pose.looks ? pose.gazeY : 0, pose.blink * 0.3]
/** A motion as a row of numbers: every channel, sampled along it. */
const curve = (at: (t: number, out: Pose) => Pose, samples = 60) => Array.from({ length: samples }, (_, i) => numbers(at(i / (samples - 1), blank()))).flat()
/** How far apart two motions are, on average, a sample. */
const apart = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0) / a.length)
const atRest = (pose: Pose) => Math.abs(pose.dx) + Math.abs(pose.dy) + Math.abs(pose.dz) + Math.abs(pose.squash - 1) + Math.abs(pose.leanX) + Math.abs(pose.leanZ)

describe('how the gobblers move', () => {
  it('gives no two gobblers the same way with a wrong toy, or a near copy of it', () => {
    const ways = GOBBLERS.map((id) => curve((t, out) => wrongPose(GOBBLER[id].wrong, t, out)))
    for (let a = 0; a < ways.length; a++) for (let b = a + 1; b < ways.length; b++) expect(apart(ways[a], ways[b]), `${GOBBLERS[a]} and ${GOBBLERS[b]}`).toBeGreaterThan(0.08)
    // Nor the same length, nor the same moment for the toy to leave.
    expect(new Set(GOBBLERS.map((id) => WRONG[GOBBLER[id].wrong].seconds)).size).toBe(GOBBLERS.length)
  })

  it('gives no two gobblers the same way of being lifted', () => {
    const ways = GOBBLERS.map((id) => curve((t, out) => liftedPose(GOBBLER[id].lifted, t * 1.5, out)))
    for (let a = 0; a < ways.length; a++) for (let b = a + 1; b < ways.length; b++) expect(apart(ways[a], ways[b]), `${GOBBLERS[a]} and ${GOBBLERS[b]}`).toBeGreaterThan(0.05)
  })

  it('lets no two gobblers breathe or blink in step', () => {
    const breaths = GOBBLERS.map((id) => curve((t, out) => idlePose(id, t * 12, out), 240))
    for (let a = 0; a < breaths.length; a++) for (let b = a + 1; b < breaths.length; b++) expect(apart(breaths[a], breaths[b]), `${GOBBLERS[a]} and ${GOBBLERS[b]}`).toBeGreaterThan(0.01)
    expect(new Set(GOBBLERS.map((id) => PERSONALITY[id].tempo)).size).toBe(GOBBLERS.length)
    expect(new Set(GOBBLERS.map((id) => PERSONALITY[id].blinkEvery)).size).toBe(GOBBLERS.length)
  })

  it('plays every shared act in each gobbler\'s own time', () => {
    for (const act of Object.keys(ACT_SECONDS) as Act[]) expect(new Set(GOBBLERS.map((id) => actSeconds(id, act).toFixed(4))).size, act).toBe(GOBBLERS.length)
    // A big toy takes three chomps and longer to get down than a small one.
    expect(actSeconds('red', 'gulp', 3)).toBeGreaterThan(actSeconds('red', 'gulp', 1) * 1.5)
    const one = curve((t, out) => actPose('red', 'gulp', t, 1, out)), three = curve((t, out) => actPose('red', 'gulp', t, 3, out))
    expect(apart(one, three)).toBeGreaterThan(0.05)
  })

  it('brings every way and every act back to rest, so nothing jumps when it ends', () => {
    for (const id of GOBBLERS) {
      expect(atRest(wrongPose(GOBBLER[id].wrong, 1, blank())), `${id} wrong`).toBeLessThan(0.02)
      for (const act of Object.keys(ACT_SECONDS) as Act[]) {
        if (act === 'open-wide') continue // held for as long as the claw waits
        expect(atRest(actPose(id, act, 1, 1, blank())), `${id} ${act}`).toBeLessThan(0.02)
        expect(atRest(actPose(id, act, 0, 1, blank())), `${id} ${act} at its start`).toBeLessThan(0.02)
      }
    }
  })

  it('never squashes a gobbler flat or stretches it out of its skin', () => {
    for (const id of GOBBLERS) for (let i = 0; i <= 100; i++) {
      const t = i / 100
      const poses = [wrongPose(GOBBLER[id].wrong, t, blank()), liftedPose(GOBBLER[id].lifted, t * 1.5, blank()), idlePose(id, t * 20, blank()), ...(Object.keys(ACT_SECONDS) as Act[]).map((act) => actPose(id, act, t, 3, blank()))]
      for (const pose of poses) { expect(pose.squash).toBeGreaterThan(0.45); expect(pose.squash).toBeLessThan(1.5) }
    }
  })
})
