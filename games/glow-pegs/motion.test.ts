import { describe, expect, it } from 'vitest'
import { COLOURS } from './board'
import { Actor, BOUNCE_BOTTOMS, CHIRPS, DRUM_HITS, FRIGHT_SLIP, GECKO_ACTS, GECKO_IDLE, GECKO_TASTE, LICK_TOUCH, SPIDER_ACTS, SPIDER_IDLE, SPIDER_TASTE, YOYO_BOTTOM, geckoPose, spiderPose, type ActSpec, type GeckoAct, type GeckoPose, type SpiderAct, type SpiderPose } from './motion'
import { makeRng } from './rng'

const spider = (): SpiderPose => ({ drop: 0, swing: 0, squash: 0, eyeSpread: 0, lids: 0, cover: 0, feet: [0, 0, 0, 0], shake: 0, strand: 0 })
const gecko = (): GeckoPose => ({ slide: 0, tremble: 0, tongue: 0, curl: 0, wag: 0, belly: 0, lids: [0, 0], pupil: 1, mouth: 0, slip: 0, rolling: 0, roll: 0, cross: 0, nod: 0 })
const SPIDER_NAMES = Object.keys(SPIDER_ACTS) as SpiderAct[]
const GECKO_NAMES = Object.keys(GECKO_ACTS) as GeckoAct[]

/** A pose as a flat list of numbers, each on a scale where 1 is a large movement of that part. */
const spiderNumbers = (p: SpiderPose) => [p.drop / 40, p.swing / 0.25, p.squash / 0.15, p.eyeSpread, p.lids, p.cover, ...p.feet, p.shake / 0.3, p.strand]
const geckoNumbers = (p: GeckoPose) => [p.slide / 40, p.tremble / 3, p.tongue, p.curl, p.wag / 0.5, p.belly, ...p.lids, 1 - p.pupil, p.mouth, p.slip, p.rolling, p.cross, p.nod / 10]

/** An act as 40 poses along its own length. */
function trace<A>(pose: (act: A, t: number) => number[], act: A, length: number): number[][] {
  return Array.from({ length: 40 }, (_, i) => pose(act, ((i + 0.5) / 40) * length))
}
/** The parts an act moves, as a string of 0 and 1. */
const partsMoved = (run: number[][]) => run[0].map((_, part) => (run.some((pose) => Math.abs(pose[part]) > 0.15) ? 1 : 0)).join('')
/** How far apart two acts are at their most different moment, on the scale above. */
const apart = (a: number[][], b: number[][]) => Math.max(...a.map((pose, i) => Math.max(...pose.map((value, part) => Math.abs(value - b[i][part])))))

describe('every act moves like itself', () => {
  const spiderRuns = SPIDER_NAMES.map((act) => trace((a: SpiderAct, t) => spiderNumbers(spiderPose(a, t, spider())), act, SPIDER_ACTS[act].length))
  const geckoRuns = GECKO_NAMES.map((act) => trace((a: GeckoAct, t) => geckoNumbers(geckoPose(a, t, gecko())), act, GECKO_ACTS[act].length))

  it('moves something in every act, and comes back to rest at its end', () => {
    spiderRuns.forEach((run, i) => expect(partsMoved(run), SPIDER_NAMES[i]).toContain('1'))
    geckoRuns.forEach((run, i) => expect(partsMoved(run), GECKO_NAMES[i]).toContain('1'))
    for (const act of SPIDER_NAMES) for (const value of spiderNumbers(spiderPose(act, SPIDER_ACTS[act].length, spider()))) expect(Math.abs(value), act).toBeLessThan(0.02)
    for (const act of GECKO_NAMES) for (const value of geckoNumbers(geckoPose(act, GECKO_ACTS[act].length, gecko()))) expect(Math.abs(value), act).toBeLessThan(0.02)
  })

  it('gives no two acts of one watcher the same parts in motion, nor a pose that is a near copy', () => {
    for (const [names, runs] of [[SPIDER_NAMES, spiderRuns], [GECKO_NAMES, geckoRuns]] as const) {
      for (let i = 0; i < runs.length; i++) {
        for (let j = i + 1; j < runs.length; j++) {
          expect(partsMoved(runs[i]), `${names[i]} and ${names[j]}`).not.toBe(partsMoved(runs[j]))
          expect(apart(runs[i], runs[j]), `${names[i]} and ${names[j]}`).toBeGreaterThan(0.5)
        }
      }
    }
  })

  it('gives no two acts the same length, in one watcher or across the two', () => {
    const lengths = [...SPIDER_NAMES.map((act) => SPIDER_ACTS[act].length), ...GECKO_NAMES.map((act) => GECKO_ACTS[act].length)]
    expect(new Set(lengths).size).toBe(lengths.length)
  })

  it('answers each colour of peg with a different act, and the two watchers never with the same one', () => {
    expect(new Set(COLOURS.map((colour) => SPIDER_TASTE[colour])).size).toBe(5)
    expect(new Set(COLOURS.map((colour) => GECKO_TASTE[colour])).size).toBe(5)
    for (const colour of COLOURS) expect(SPIDER_TASTE[colour] as string).not.toBe(GECKO_TASTE[colour])
  })

  it('is at rest with no act', () => {
    for (const value of spiderNumbers(spiderPose(null, 1, spider()))) expect(value).toBe(0)
    for (const value of geckoNumbers(geckoPose(null, 1, gecko()))) expect(value).toBe(0)
  })
})

describe('a sound falls where its motion is', () => {
  it('drums: each foot is up before its hit and down on it', () => {
    DRUM_HITS.forEach((hit, n) => {
      expect(spiderPose('drum', hit - 0.05, spider()).feet[n % 4], `hit ${n}`).toBeGreaterThan(0.8)
      expect(spiderPose('drum', hit, spider()).feet[n % 4]).toBeLessThan(0.01)
      // The web is seen to give just after.
      expect(spiderPose('drum', hit + 0.05, spider()).strand).toBeGreaterThan(0.8)
    })
    expect(SPIDER_ACTS.drum.beats.map((beat) => beat.at)).toEqual([...DRUM_HITS])
  })

  it('twangs when the yo-yo reaches the end of its thread, and bounces lowest on each bounce beat', () => {
    const drop = (act: SpiderAct, t: number) => spiderPose(act, t, spider()).drop
    expect(drop('yoyo', YOYO_BOTTOM)).toBeGreaterThan(drop('yoyo', YOYO_BOTTOM - 0.05))
    expect(drop('yoyo', YOYO_BOTTOM)).toBeGreaterThanOrEqual(drop('yoyo', YOYO_BOTTOM + 0.3))
    expect(SPIDER_ACTS.yoyo.beats.map((beat) => [beat.at, beat.cue.name])).toEqual([[0, 'boing'], [YOYO_BOTTOM, 'twang']])
    for (const bottom of BOUNCE_BOTTOMS) {
      expect(drop('bounce', bottom)).toBeGreaterThan(drop('bounce', bottom - 0.1))
      expect(drop('bounce', bottom)).toBeGreaterThan(drop('bounce', bottom + 0.1))
    }
    expect(SPIDER_ACTS.bounce.beats.map((beat) => beat.at)).toEqual([...BOUNCE_BOTTOMS])
  })

  it('licks when the tongue touches the eye, slips when the foot lets go, and opens its mouth on each chirp', () => {
    expect(geckoPose('lick', LICK_TOUCH, gecko()).tongue).toBeCloseTo(1, 5)
    expect(geckoPose('lick', LICK_TOUCH - 0.15, gecko()).tongue).toBeLessThan(0.6)
    expect(GECKO_ACTS.lick.beats[0].at).toBe(LICK_TOUCH)
    expect(geckoPose('fright', FRIGHT_SLIP, gecko()).slide).toBe(0)
    expect(geckoPose('fright', FRIGHT_SLIP, gecko()).slip).toBeCloseTo(1, 5)
    expect(geckoPose('fright', FRIGHT_SLIP + 0.1, gecko()).slide).toBeGreaterThan(5)
    expect(GECKO_ACTS.fright.beats.find((beat) => beat.cue.name === 'slip')!.at).toBe(FRIGHT_SLIP)
    for (const at of CHIRPS) {
      expect(geckoPose('chirp', at, gecko()).mouth).toBe(1)
      expect(geckoPose('chirp', at - 0.02, gecko()).mouth).toBeLessThan(0.5)
    }
    // The tail is at the middle of its swing, where it whips fastest, on each beat of the wag.
    for (const beat of GECKO_ACTS.wag.beats) expect(Math.abs(geckoPose('wag', beat.at, gecko()).wag)).toBeLessThan(0.01)
  })

  it('keeps every beat inside its act, and what a watcher does by itself silent', () => {
    for (const spec of [...Object.values(SPIDER_ACTS), ...Object.values(GECKO_ACTS)] as ActSpec[]) for (const beat of spec.beats) {
      expect(beat.at).toBeGreaterThanOrEqual(0)
      expect(beat.at).toBeLessThan(spec.length)
    }
    for (const act of SPIDER_IDLE) expect(SPIDER_ACTS[act].beats).toEqual([])
    for (const act of GECKO_IDLE) expect(GECKO_ACTS[act].beats).toEqual([])
  })
})

describe('one who acts', () => {
  const quiet = () => 0.5

  it('gives each beat once, in the step it falls in, at any frame rate', () => {
    for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.1]) {
      for (const act of SPIDER_NAMES) {
        const actor = new Actor(SPIDER_ACTS, SPIDER_IDLE, quiet)
        const heard: { at: number; name: string }[] = actor.begin(act).map((cue) => ({ at: 0, name: cue.name }))
        let t = 0
        while (actor.act !== null) {
          const before = t
          t += dt
          for (const cue of actor.step(dt)) {
            const beat = SPIDER_ACTS[act].beats.find((b) => b.cue === cue)!
            // The beat lies inside the step that gave it.
            expect(beat.at).toBeGreaterThan(before - 1e-9)
            expect(beat.at).toBeLessThanOrEqual(t + 1e-9)
            heard.push({ at: beat.at, name: cue.name })
          }
        }
        expect(heard.map((h) => h.name), `${act} at ${dt}`).toEqual(SPIDER_ACTS[act].beats.map((beat) => beat.cue.name))
      }
    }
  })

  it('does something by itself when left alone, never the same thing twice running, and from a seed the same every time', () => {
    const run = (seed: number) => {
      const chance = makeRng(seed)
      const actor = new Actor(GECKO_ACTS, GECKO_IDLE, () => chance.next())
      const acts: string[] = []
      let last: string | null = null
      for (let i = 0; i < 60 * 120; i++) {
        expect(actor.step(1 / 60)).toEqual([])
        if (actor.act !== null && last === null) acts.push(actor.act)
        last = actor.act
      }
      return acts
    }
    const acts = run(1)
    expect(acts.length).toBeGreaterThan(10)
    for (let i = 1; i < acts.length; i++) expect(acts[i]).not.toBe(acts[i - 1])
    expect(new Set(acts)).toEqual(new Set(GECKO_IDLE))
    expect(run(1)).toEqual(acts)
    expect(run(2)).not.toEqual(acts)
  })

  it('stands still while no time passes', () => {
    const actor = new Actor(SPIDER_ACTS, SPIDER_IDLE, quiet)
    actor.begin('yoyo')
    for (let i = 0; i < 100; i++) expect(actor.step(0)).toEqual([])
    expect(actor.act).toBe('yoyo')
    expect(actor.t).toBe(0)
  })
})
