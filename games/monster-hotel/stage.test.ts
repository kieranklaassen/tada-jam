import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { Scene, followedBy, sceneLength } from './scene'
import { coachChangesOver, neatWay, pairing, restStage, sentAway, settledDay, whereOn, type Hooks, type Walk } from './stage'

const house = arrange({ shape: 'square', fixtures: [], twins: [] }, { troll: 0, bat: 1 })
const walk = (id: 'troll' | 'bat' | 'blob'): Walk => ({ id, legs: [{ from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }], progress: 0 })

/** Hooks that write down what a scene asked for. */
function recorder(landing = { now: false }) {
  const said: string[] = []
  const hooks: Hooks = {
    landing: () => landing.now,
    hour: (to) => said.push(`hour ${to}`),
    houseChanges: () => said.push('house'),
    porterComesIn: () => said.push('mark'),
    cue: (name) => said.push(name),
  }
  return { said, hooks, landing }
}
/** Plays a scene to its end at sixty frames a second, or to a moment and then lands it as a touch does. */
function play(beats: ReturnType<typeof settledDay>, landing: { now: boolean }, until = Infinity): void {
  const scene = new Scene(beats)
  scene.start(0, () => {})
  for (let t = 0; t <= Math.min(until, sceneLength(beats) + 0.1); t += 1 / 60) scene.update(t)
  if (scene.running) {
    landing.now = true
    scene.finish()
    landing.now = false
  }
}

describe('the scenes are as long as the sheet says', () => {
  it('the settled day lasts 8 to 10 seconds, the neat way 6 to 9, a pairing about 4', () => {
    const stage = restStage(), { hooks } = recorder()
    expect(sceneLength(settledDay(stage, 'day', hooks))).toBeGreaterThanOrEqual(8)
    expect(sceneLength(settledDay(stage, 'day', hooks))).toBeLessThanOrEqual(10)
    expect(sceneLength(neatWay(stage, house, hooks))).toBeGreaterThanOrEqual(6)
    expect(sceneLength(neatWay(stage, house, hooks))).toBeLessThanOrEqual(9)
    expect(sceneLength(pairing(stage, 'sauna', hooks))).toBeCloseTo(4)
  })

  it('the coach changes over in about 6 seconds and the lot is sent away in about 5, however many file out', () => {
    for (const count of [1, 3, 5]) {
      const leaving = (['troll', 'bat', 'blob', 'troll', 'bat'] as const).slice(0, count).map(walk)
      const over = sceneLength(coachChangesOver(restStage(), leaving, leaving.map((one) => ({ ...one })), recorder().hooks))
      const away = sceneLength(sentAway(restStage(), leaving, recorder().hooks))
      expect(over).toBeGreaterThanOrEqual(5.4); expect(over).toBeLessThanOrEqual(7.5)
      expect(away).toBeGreaterThanOrEqual(4.5); expect(away).toBeLessThanOrEqual(6.5)
    }
  })
})

describe('every scene leaves the stage at rest', () => {
  const rest = restStage()
  it('played through', () => {
    for (const build of [
      (stage: typeof rest, hooks: Hooks) => settledDay(stage, 'night', hooks),
      (stage: typeof rest, hooks: Hooks) => followedBy(settledDay(stage, 'day', hooks), neatWay(stage, house, hooks)),
      (stage: typeof rest, hooks: Hooks) => coachChangesOver(stage, [walk('troll')], [walk('bat'), walk('blob')], hooks),
      (stage: typeof rest, hooks: Hooks) => sentAway(stage, [walk('troll'), walk('bat')], hooks),
      (stage: typeof rest, hooks: Hooks) => pairing(stage, 'duet', hooks),
    ]) {
      const stage = restStage(), { hooks, landing } = recorder()
      play(build(stage, hooks), landing)
      expect(stage).toEqual(rest)
    }
  })

  it('ended by a touch at any moment, in silence', () => {
    for (let until = 0; until <= 16; until += 0.37) {
      for (const build of [
        (stage: typeof rest, hooks: Hooks) => followedBy(settledDay(stage, 'day', hooks), neatWay(stage, house, hooks)),
        (stage: typeof rest, hooks: Hooks) => coachChangesOver(stage, [walk('troll')], [walk('bat'), walk('blob')], hooks),
        (stage: typeof rest, hooks: Hooks) => followedBy(pairing(stage, 'sauna', hooks), sentAway(stage, [walk('troll'), walk('bat')], hooks)),
      ]) {
        const stage = restStage(), { said, hooks, landing } = recorder()
        const beats = build(stage, hooks)
        const scene = new Scene(beats)
        scene.start(0, () => {})
        for (let t = 0; t <= until; t += 1 / 60) scene.update(t)
        const before = said.length
        landing.now = true
        scene.finish()
        landing.now = false
        expect(stage, `ended at ${until.toFixed(2)}`).toEqual(rest)
        // Landing asks for no sound, no sweep and no mark; at most the house going back to the child's.
        expect(said.slice(before).filter((word) => word !== 'house'), `ended at ${until.toFixed(2)}`).toEqual([])
      }
    }
  })
})

describe('what each scene asks for, and when', () => {
  it('the settled day shows the other hour and comes back to the child hour, once each', () => {
    const stage = restStage(), { said, hooks, landing } = recorder()
    play(settledDay(stage, 'day', hooks), landing)
    expect(said).toEqual(['hour night', 'hour null'])
  })

  it('the porter marks the place when he comes in, and only if the scene gets that far by itself', () => {
    const through = recorder()
    play(neatWay(restStage(), house, through.hooks), through.landing)
    expect(through.said).toEqual(['porter-trundles', 'mark', 'house', 'porter-shows', 'house', 'porter-goes'])
    const cut = recorder()
    play(neatWay(restStage(), house, cut.hooks), cut.landing, 0.8)
    expect(cut.said).toEqual(['porter-trundles'])
    const shown = recorder()
    play(neatWay(restStage(), house, shown.hooks), shown.landing, 2.5)
    // He had come in: the mark stands, and the house goes back to the child's at once.
    expect(shown.said).toEqual(['porter-trundles', 'mark', 'house', 'porter-shows', 'house'])
  })

  it('an arriving guest stays in the coach until it sets out, and everyone who leaves is gone when the door shuts', () => {
    const stage = restStage(), { hooks } = recorder()
    const arriving = [walk('bat'), walk('blob')]
    const beats = coachChangesOver(stage, [walk('troll')], arriving, hooks)
    expect(arriving.map((one) => one.progress)).toEqual([-1, -1])
    const scene = new Scene(beats)
    scene.start(0, () => {})
    for (let t = 0; t <= 1.3; t += 1 / 60) scene.update(t)
    expect(stage.coachOpen).toBe(true)
    expect(arriving[0].progress).toBeGreaterThan(0)
    expect(arriving[1].progress).toBeLessThanOrEqual(0.05)
    for (let t = 1.3; t <= 4.2; t += 1 / 60) scene.update(t)
    expect([stage.coachOpen, stage.leaving, stage.arriving]).toEqual([false, [], []])
    expect(stage.coachAt).toBeGreaterThan(0)
  })
})

describe('a walk goes by doors and never through a wall', () => {
  const legs = [{ from: { x: 0, y: 0 }, to: { x: 30, y: 0 } }, { from: { x: 500, y: 200 }, to: { x: 500, y: 290 } }]
  it('is seen only on its legs, in order, at a steady pace', () => {
    expect(whereOn({ id: 'bat', legs, progress: -1 })).toBe(null)
    expect(whereOn({ id: 'bat', legs, progress: 0 })).toBe(null)
    expect(whereOn({ id: 'bat', legs, progress: 1 })).toBe(null)
    // A quarter of the way is the end of the first leg (30 of 120); it is never seen between the two doors.
    expect(whereOn({ id: 'bat', legs, progress: 0.125 })).toEqual({ x: 15, y: 0 })
    expect(whereOn({ id: 'bat', legs, progress: 0.625 })).toEqual({ x: 500, y: 245 })
    for (let p = 0.01; p < 1; p += 0.01) {
      const at = whereOn({ id: 'bat', legs, progress: p })!
      const onFirst = at.y === 0 && at.x >= 0 && at.x <= 30
      const onSecond = at.x === 500 && at.y >= 200 && at.y <= 290
      expect(onFirst || onSecond, `at ${p.toFixed(2)}`).toBe(true)
    }
  })
})

describe('the neat way at another hour', () => {
  it('shows the other hour once the porter has come in and gives the child\'s hour back when he puts things away; cut short before he comes in, no hour is shown', () => {
    const stage = restStage(), through = recorder()
    play(neatWay(stage, house, through.hooks, 'night'), through.landing)
    expect(through.said).toEqual(['porter-trundles', 'mark', 'house', 'porter-shows', 'hour night', 'house', 'porter-goes', 'hour null'])
    expect(stage.hour).toBe(null)
    const cut = recorder()
    play(neatWay(restStage(), house, cut.hooks, 'night'), cut.landing, 0.5)
    expect(cut.said).toEqual(['porter-trundles'])
  })
})
