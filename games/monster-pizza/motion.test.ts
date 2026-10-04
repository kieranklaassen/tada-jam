import { describe, expect, it } from 'vitest'
import { CUSTOMERS } from './customers'
import { CHANNELS, MotionDirector, PERSONALITIES, type Action, type ActionKind, type Delta } from './motion'

const KINDS_OF_ACTION: ActionKind[] = ['react', 'poke', 'delight']
const KEYS = CHANNELS
// Each channel in the units it is drawn in, so a hop and a squash can be compared.
const SCALE: Record<keyof Delta, number> = { lift: 1 / 40, squash: 5, lean: 8, mouth: 1, tongue: 1, part: 1, lookX: 1, lookY: 1, blink: 1, brow: 1, frown: 1, smile: 1, pucker: 1, cheeks: 1, pupil: 2, upset: 1, rollX: 1, rollY: 1 }

/** An action as a curve: every channel sampled along its length. */
function curve(action: Action): number[] {
  const out: number[] = []
  for (let i = 1; i < 16; i++) {
    const d = action.at(i / 16)
    for (const key of KEYS) out.push((d[key] ?? 0) * SCALE[key])
  }
  return out
}

function distance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length)
}

describe('motion', () => {
  it('gives every customer its own variants of every action, two or three of each', () => {
    const names = new Set<string>()
    for (const who of CUSTOMERS) {
      for (const kind of KINDS_OF_ACTION) {
        const actions = PERSONALITIES[who].actions[kind]
        expect(actions.length, `${who} ${kind}`).toBeGreaterThanOrEqual(2)
        for (const action of actions) {
          expect(names.has(action.name), action.name).toBe(false)
          names.add(action.name)
          expect(action.lasts).toBeGreaterThan(0.2)
          expect(action.lasts).toBeLessThanOrEqual(3)
        }
      }
    }
  })

  it('shares no action between two customers: no curve is a copy or a near copy of another', () => {
    const all: { who: string; action: Action; length: number; shape: number[] }[] = []
    for (const who of CUSTOMERS) for (const kind of KINDS_OF_ACTION) for (const action of PERSONALITIES[who].actions[kind]) all.push({ who, action, length: action.lasts, shape: curve(action) })
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        if (all[a].who === all[b].who) continue
        expect(distance(all[a].shape, all[b].shape), `${all[a].action.name} and ${all[b].action.name}`).toBeGreaterThan(0.12)
      }
    }
  })

  it('rests every customer in its own way: no two breathe at the same pace or by the same amount', () => {
    const rest = CUSTOMERS.map((who) => {
      const samples: number[] = []
      for (let t = 0; t < 12; t += 0.05) samples.push(PERSONALITIES[who].idle(t).squash ?? 0)
      let crossings = 0
      for (let i = 1; i < samples.length; i++) if (samples[i - 1] <= 0 !== samples[i] <= 0) crossings++
      return { crossings, depth: Math.max(...samples) }
    })
    for (let a = 0; a < rest.length; a++) for (let b = a + 1; b < rest.length; b++) expect(rest[a].crossings === rest[b].crossings && Math.abs(rest[a].depth - rest[b].depth) < 0.004).toBe(false)
    // Blinks and eyes too.
    expect(new Set(CUSTOMERS.map((who) => PERSONALITIES[who].blinkLasts)).size).toBe(CUSTOMERS.length)
    expect(new Set(CUSTOMERS.map((who) => PERSONALITIES[who].look.stiffness)).size).toBe(CUSTOMERS.length)
  })

  it('gives every customer a face of its own at rest, and a face to every action', () => {
    const resting = CUSTOMERS.map((who) => {
      const d = PERSONALITIES[who].idle(1.3)
      return [d.brow ?? 0, d.frown ?? 0, d.smile ?? 0, d.cheeks ?? 0, d.pupil ?? 0].map((v) => v.toFixed(1)).join(' ')
    })
    expect(new Set(resting).size).toBe(CUSTOMERS.length)
    const FACE = ['brow', 'frown', 'smile', 'pucker', 'cheeks', 'pupil'] as const
    for (const who of CUSTOMERS) {
      for (const kind of KINDS_OF_ACTION) {
        for (const action of PERSONALITIES[who].actions[kind]) {
          let moved = 0
          for (let i = 1; i < 10; i++) for (const key of FACE) moved += Math.abs(action.at(i / 10)[key] ?? 0)
          expect(moved, action.name).toBeGreaterThan(0.5)
        }
      }
    }
  })

  it('never plays the same variant twice in a row', () => {
    for (const who of CUSTOMERS) {
      const director = new MotionDirector(who, 7)
      for (const kind of KINDS_OF_ACTION) {
        let last = ''
        for (let i = 0; i < 12; i++) {
          const name = director.trigger(kind, i * 5)
          expect(name).not.toBe(last)
          last = name
        }
      }
    }
  })

  it('keeps every pose drawable through a long, busy stretch', () => {
    for (const who of CUSTOMERS) {
      const director = new MotionDirector(who, 3)
      let now = 0
      for (let frame = 0; frame < 60 * 40; frame++) {
        now += 1 / 60
        if (frame % 47 === 0) director.trigger('poke', now)
        if (frame % 31 === 0) director.trigger('react', now)
        const pose = director.update(now, 1 / 60, { x: Math.sin(now), y: Math.cos(now * 1.3) })
        for (const value of [pose.sx, pose.sy, pose.lean, pose.lift, pose.lookX, pose.lookY, pose.blink, pose.mouth, pose.tongue, pose.part]) expect(Number.isFinite(value)).toBe(true)
        expect(pose.sy).toBeGreaterThan(0.45)
        expect(pose.sy).toBeLessThan(1.5)
        expect(Math.abs(pose.lean)).toBeLessThan(0.4)
        expect(pose.lift).toBeGreaterThanOrEqual(0)
        // A face stays a face: every part of it inside what the art can draw.
        for (const signed of [pose.brow, pose.frown, pose.smile]) {
          expect(signed).toBeGreaterThanOrEqual(-1)
          expect(signed).toBeLessThanOrEqual(1)
        }
        expect(pose.pupil).toBeGreaterThanOrEqual(0.5)
        expect(pose.pupil).toBeLessThanOrEqual(1.5)
        for (const unit of [pose.blink, pose.mouth, pose.tongue, pose.pucker, pose.cheeks]) {
          expect(unit).toBeGreaterThanOrEqual(0)
          expect(unit).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('is alive at rest, and holds its delights back when asked for quiet', () => {
    for (const who of CUSTOMERS) {
      const lively = new MotionDirector(who, 5), quiet = new MotionDirector(who, 5)
      const seen = new Set<string>()
      let moved = 0, last = 1, now = 0
      for (let frame = 0; frame < 60 * 30; frame++) {
        now += 1 / 60
        const pose = lively.update(now, 1 / 60, null)
        moved += Math.abs(pose.sy - last)
        last = pose.sy
        quiet.update(now, 1 / 60, null, true)
        expect(quiet.busy).toBe(false)
        seen.add(`${pose.part.toFixed(1)} ${pose.tongue.toFixed(1)} ${pose.lean.toFixed(2)}`)
      }
      expect(moved, who).toBeGreaterThan(0.5)
      expect(seen.size, who).toBeGreaterThan(3)
    }
  })

  it('plays the same from the same seed', () => {
    const run = (): number[] => {
      const director = new MotionDirector('ooze', 99)
      const out: number[] = []
      for (let frame = 0; frame < 600; frame++) {
        const pose = director.update(frame / 60, 1 / 60, null)
        out.push(pose.sy, pose.part, pose.blink)
      }
      return out
    }
    expect(run()).toEqual(run())
  })
})
