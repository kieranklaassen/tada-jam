import { describe, expect, it } from 'vitest'
import { LONGEST, ROUND, SHORTEST, gotOf, planFor } from './handover'
import { WANTS } from './lap'
import { AT_MOST, LOADS, noMarks, noTrailMarks, type Marks } from './lapState'
import { stepNotes } from './voices'

const marksOf = (more: Partial<Marks> = {}): Marks => ({ ...noMarks(), ...more })

describe('the hand-over', () => {
  it('lasts six to nine seconds whatever arrives, with every step inside it and in order of time', () => {
    const plans = [planFor(null)]
    for (const load of LOADS) {
      for (let left = 0; left <= AT_MOST[load]; left++) {
        for (const marks of [marksOf(), marksOf({ wet: true }), marksOf({ muddy: true }), marksOf({ berries: true }), marksOf({ ruffles: 3 }), marksOf({ wet: true, muddy: true, berries: true, ruffles: 3 })]) {
          for (const rode of [false, true]) plans.push(planFor({ load, left, marks, rode, fetched: false }))
        }
      }
    }
    plans.push(planFor({ load: 'owl', left: 1, marks: marksOf(), rode: false, fetched: true }))
    expect(plans.length).toBeGreaterThan(100)
    for (const plan of plans) {
      expect(plan.ends).toBeGreaterThanOrEqual(SHORTEST)
      expect(plan.ends).toBeLessThanOrEqual(LONGEST)
      let before = 0
      for (const step of plan.steps) {
        expect(step.at).toBeGreaterThanOrEqual(before)
        expect(step.at).toBeLessThan(plan.ends)
        before = step.at
      }
    }
  })

  it('is taken by the one who wanted the load, who comes, takes it and goes home with it', () => {
    for (const load of LOADS) {
      const steps = planFor({ load, left: AT_MOST[load], marks: marksOf(), rode: false, fetched: false }).steps
      const who = WANTS[load]
      expect(steps.slice(0, 2).map((step) => `${step.who} ${step.step}`)).toEqual([`${who} come`, `${who} take`])
      expect(steps.some((step) => step.who === who && step.step === 'home')).toBe(true)
      for (const step of steps) expect([who, 'goose', 'fox']).toContain(step.who)
    }
  })

  it('shows what the lap did to the load, and never anything about the child', () => {
    const steps = (load: 'cake' | 'ladder' | 'balloons' | 'owl' | 'bucket', left: number, marks: Marks, rode = false): string[] => planFor({ load, left, marks, rode, fetched: false }).steps.map((step) => step.step)
    expect(steps('cake', 3, marksOf()).filter((step) => step === 'eat').length).toBe(3)
    expect(steps('cake', 1, marksOf()).filter((step) => step === 'eat').length).toBe(1)
    expect(steps('cake', 0, marksOf())).toContain('crumbs')
    expect(steps('cake', 2, marksOf({ muddy: true }))).toEqual(expect.arrayContaining(['bite', 'spit']))
    expect(steps('cake', 2, marksOf({ wet: true }))).toContain('wring')
    expect(steps('cake', 2, marksOf({ berries: true }))).toContain('lick')
    expect(steps('ladder', 1, marksOf(), true)).toEqual(expect.arrayContaining(['perch', 'ridedown']))
    expect(steps('ladder', 1, marksOf({ muddy: true }))).toEqual(expect.arrayContaining(['slide', 'wash']))
    expect(steps('ladder', 1, marksOf()).filter((step) => step === 'rung').length).toBe(5)
    expect(steps('balloons', 4, marksOf())).toEqual(expect.arrayContaining(['pop', 'laugh', 'float']))
    expect(steps('balloons', 0, marksOf())).toContain('skip')
    expect(steps('owl', 1, marksOf({ ruffles: 2 })).filter((step) => step === 'preen').length).toBe(2)
    expect(steps('owl', 1, marksOf({ wet: true, muddy: true }))).toEqual(expect.arrayContaining(['dry', 'shakeout']))
    expect(steps('bucket', 0, marksOf())).toContain('hat')
    expect(steps('bucket', 3, marksOf())).toContain('dive')
    expect(steps('bucket', 1, marksOf())).toContain('sit')
  })

  it('has all five look at the fox in turn when it comes in with empty hands, and nobody look at its hands or shrug', () => {
    const steps = planFor(null).steps
    expect(steps.map((step) => step.who)).toEqual([...ROUND])
    expect(steps.map((step) => step.step)).toEqual(['greet', 'greet', 'greet', 'greet', 'greet'])
    // Each greets with a sound of its own that rises, as a greeting does, and none falls.
    const heard = new Set<string>()
    for (const step of steps) {
      const notes = stepNotes(step.who, step.step)
      expect(notes.length, step.who).toBeGreaterThan(0)
      for (const note of notes) expect(note.glideTo, step.who).toBeGreaterThan(note.frequency)
      heard.add(JSON.stringify(notes))
    }
    expect(heard.size).toBe(5)
    // The fox has no step in any hand-over: nothing it does there is a verdict on the lap.
    for (const load of ['cake', 'ladder', 'balloons', 'owl', 'bucket'] as const) {
      for (const fetched of [false, true]) {
        const all = planFor({ load, left: 1, marks: marksOf(), rode: false, fetched: fetched && load === 'owl' }).steps
        expect(all.some((step) => step.who === 'fox')).toBe(false)
      }
    }
  })

  it('reads what arrived from the lap: nothing for empty hands or a load left on the trail, and the owl on the branch is fetched', () => {
    const base = { held: true, lies: null, left: 1, marks: marksOf(), trail: noTrailMarks() }
    expect(gotOf({ ...base, load: 'none' })).toBeNull()
    expect(gotOf({ ...base, load: 'cake', held: false, lies: { at: 100, lane: 1 } })).toBeNull()
    expect(gotOf({ ...base, load: 'owl', held: false, lies: 'branch' })).toMatchObject({ load: 'owl', fetched: true })
    expect(gotOf({ ...base, load: 'ladder', trail: { ...noTrailMarks(), gooseRides: true } })).toMatchObject({ rode: true })
    expect(gotOf({ ...base, load: 'cake', trail: { ...noTrailMarks(), gooseRides: true } })).toMatchObject({ rode: false })
  })
})
