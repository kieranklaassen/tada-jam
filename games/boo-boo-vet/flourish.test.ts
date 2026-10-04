import { describe, expect, it } from 'vitest'
import { SPECIES, type Taste } from './cast'
import { flourishPose } from './flourish'
import type { Pose } from './motion'

const TASTES: readonly Taste[] = ['loves', 'wary', 'plain']
const STEPS = 60
const track = (species: (typeof SPECIES)[number], manner: Taste): Pose[] => Array.from({ length: STEPS - 1 }, (_, index) => flourishPose(species, manner, (index + 1) / STEPS))
/** How far apart two tracks are, summed over the flourish: place in design units, tilt and squash scaled to match. */
const apart = (one: Pose[], other: Pose[]) => one.reduce((sum, pose, index) => sum + Math.abs(pose.x - other[index].x) + Math.abs(pose.y - other[index].y) + 100 * Math.abs(Math.sin(pose.rot) - Math.sin(other[index].rot)) + 200 * Math.abs(pose.sx - other[index].sx) + 200 * Math.abs(pose.sy - other[index].sy), 0) / one.length

describe('the flourish of the well scene', () => {
  it('is each animal\'s own: no two of the eighteen move alike', () => {
    const all = SPECIES.flatMap((species) => TASTES.map((manner) => ({ name: `${species} ${manner}`, poses: track(species, manner) })))
    expect(all).toHaveLength(18)
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) expect(apart(all[a].poses, all[b].poses), `${all[a].name} and ${all[b].name}`).toBeGreaterThan(4)
    }
  })

  it('moves the animal for all to see, and stays on the table', () => {
    for (const species of SPECIES) {
      for (const manner of TASTES) {
        const poses = track(species, manner)
        const moved = Math.max(...poses.map((pose) => Math.abs(pose.x) + Math.abs(pose.y) + 100 * Math.abs(Math.sin(pose.rot / 2)) + 200 * Math.abs(pose.sx - 1) + 200 * Math.abs(pose.sy - 1)))
        expect(moved, `${species} ${manner}`).toBeGreaterThan(14)
        for (const pose of poses) {
          for (const value of [pose.x, pose.y, pose.rot, pose.sx, pose.sy]) expect(Number.isFinite(value)).toBe(true)
          expect(Math.abs(pose.x), `${species} ${manner}`).toBeLessThanOrEqual(70)
          expect(pose.y).toBeGreaterThanOrEqual(-45)
          expect(pose.y).toBeLessThanOrEqual(20)
          expect(pose.sx).toBeGreaterThan(0.8)
          expect(pose.sy).toBeGreaterThan(0.8)
        }
      }
    }
  })

  it('begins and ends where the animal sits, without a jump', () => {
    for (const species of SPECIES) {
      for (const manner of TASTES) {
        for (const p of [0.004, 0.996]) {
          const pose = flourishPose(species, manner, p)
          expect(Math.abs(pose.x) + Math.abs(pose.y), `${species} ${manner} at ${p}`).toBeLessThan(6)
          expect(Math.abs(Math.sin(pose.rot)), `${species} ${manner} at ${p}`).toBeLessThan(0.12)
          expect(Math.abs(pose.sx - 1) + Math.abs(pose.sy - 1)).toBeLessThan(0.05)
        }
      }
    }
  })

  it('wears only the faces of an animal that is well: wary of the thing, never hurt and never a sign', () => {
    for (const species of SPECIES) {
      for (const manner of TASTES) {
        const faces = new Set(track(species, manner).map((pose) => pose.face))
        for (const face of faces) expect(['calm', 'glad', 'wow', 'bliss', 'wary']).toContain(face)
        if (manner === 'wary') expect(faces.has('wary'), species).toBe(true)
        if (manner !== 'wary') expect(faces.has('wary'), species).toBe(false)
      }
    }
  })

  it('gives the dog that is wary of the plaster one long sniff: it leans to it and holds there for most of the flourish', () => {
    const held = track('dog', 'wary').filter((pose) => pose.x > 20 && pose.face === 'wary').length / STEPS
    expect(held).toBeGreaterThan(0.4)
  })
})
