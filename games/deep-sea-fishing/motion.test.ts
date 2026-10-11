import { describe, expect, it } from 'vitest'
import { ACTS, KNOCK_EVERY, momentOf } from './acts'
import { CELLS, type CellKey } from './grid'
import { beside, bring, make, run } from './kit'
import { CAT_ACTS, CAT_BEATS, CAT_MEWS, DREAM_PATS, OPINIONS, catPose, driftOf, gullPose, type CatAct } from './motion'
import { CREATURES, CREATURE_IDS, LAYERS, TUB, CAT } from './sea'

// Every character moves like itself (docs/solutions/design-patterns/
// motion-personality-per-character.md): no two drift alike, no two answers
// are the same figure, and the cat has an act of its own for everything.

/** The numbers of a pose that a figure can differ in, as one row. */
const row = (pose: object): number[] => Object.values(pose).filter((value): value is number => typeof value === 'number')

describe('at idle', () => {
  it('everyone is alive: each creature moves, with nobody touching anything', () => {
    const game = make()
    const seen = Object.fromEntries(CREATURE_IDS.map((id) => [id, new Set<string>()]))
    run(game, 12, () => { for (const id of CREATURE_IDS) seen[id].add(row(game.pose(id)).map((value) => value.toFixed(3)).join()) })
    for (const id of CREATURE_IDS) expect(seen[id].size, id).toBeGreaterThan(100)
  })

  it('no two creatures drift alike: each keeps its own stretch, at its own pace', () => {
    const paths = CREATURE_IDS.map((id) => Array.from({ length: 120 }, (_, i) => { const at = driftOf(id, i * 0.25), home = CREATURES[id].home; return [at.x - home.x, at.y - home.y] }))
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const apart = paths[i].reduce((sum, at, k) => sum + Math.hypot(at[0] - paths[j][k][0], at[1] - paths[j][k][1]), 0) / 120
        expect(apart, `${CREATURE_IDS[i]} and ${CREATURE_IDS[j]}`).toBeGreaterThan(1.5)
      }
    }
  })

  it('everyone keeps to its own layer of the sea', () => {
    for (const id of CREATURE_IDS) {
      const layer = LAYERS[CREATURES[id].layer]
      for (let t = 0; t < 60; t += 0.5) {
        const at = driftOf(id, t)
        expect(at.y, id).toBeGreaterThan(layer.top)
        expect(at.y, id).toBeLessThan(layer.bottom + 1)
      }
    }
  })
})

describe('the answers', () => {
  it('every cell of the grid has a figure of its own: something of the creature, the bait or a drawing moves in it', () => {
    for (const key of Object.keys(CELLS) as CellKey[]) {
      const act = ACTS[key]
      // The shark's answer to the worm is the tow, which is a scene (scenes.ts).
      if (key === 'worm.shark') continue
      expect(act.pose ?? act.draw ?? act.fish ?? act.bait, key).toBeDefined()
    }
  })

  it('no two answers of one creature are the same figure', () => {
    for (const id of CREATURE_IDS) {
      const figures = new Map<string, string>()
      for (const bait of ['worm', 'spoon', 'glow', 'cheese', 'boot', 'none'] as const) {
        if (bait === 'worm' && id === 'shark') continue
        const game = beside(id, bait)
        const trace: string[] = []
        bring(game, id, 2.2, () => {
          if (game.creatures[id].cell === null) return
          const pose = game.pose(id), home = game.centre(id)
          trace.push([pose.x - home.x, pose.y - home.y, pose.rot, pose.sx, pose.sy, pose.open, pose.a, pose.b, pose.more, pose.alt, pose.lid].map((value) => value.toFixed(1)).join())
        })
        expect(trace.length, `${bait}.${id}`).toBeGreaterThan(10)
        const figure = trace.join(';') + '|' + Object.keys(ACTS[`${bait}.${id}` as CellKey]).sort().join()
        expect(figures.get(figure), `${bait}.${id}`).toBeUndefined()
        figures.set(figure, bait)
      }
    }
  })
})

describe('the cat and the gull', () => {
  const sample = (act: CatAct): string => Array.from({ length: 16 }, (_, i) => row(catPose(3 + i * 0.05, 3 + i * 0.05, act, (CAT_ACTS[act] * (i + 0.5)) / 16, { x: -90, y: -50 }, false, { x: TUB.x - CAT.x, y: -40 })).map((value) => value.toFixed(2)).join()).join(';')

  it('gives the cat an act of its own for every catch and every occasion', () => {
    const acts = Object.keys(CAT_ACTS) as CatAct[]
    expect(new Set(acts.map(sample)).size).toBe(acts.length)
    expect(new Set(Object.values(OPINIONS)).size).toBe(6)
    expect(CAT_MEWS).toHaveLength(3)
    for (const act of acts) expect(CAT_ACTS[act], act).toBeLessThanOrEqual(3)
  })

  it('has the gull hop when it is startled and settle again', () => {
    expect(gullPose(1, null, 0).lift).toBe(0)
    expect(gullPose(1, 0.3, 0).lift).toBeGreaterThan(4)
    expect(gullPose(1, 5, 0).lift).toBeCloseTo(0, 1)
  })
})

describe('a figure that keeps a beat', () => {
  // The picture and its sound read one clock: a limb, a mouth, a lid or a squeeze that moves on a sound's beat is
  // drawn from the answer's own seconds, never from the free-running time, which a pause or a later start would set apart.
  it('draws the same stroke, mouth, lid and squeeze at the same moment of an answer, whatever the time of day', () => {
    for (const key of Object.keys(ACTS) as CellKey[]) {
      const pose = ACTS[key].pose
      if (!pose) continue
      const [bait, id] = key.split('.') as [never, (typeof CREATURE_IDS)[number]]
      const game = beside(id, bait), base = game.shown(id), at = { x: base.x, y: base.y }, hook = { x: base.x + 40, y: base.y + 10 }
      for (let t = 0.05; t < (CELLS[key]?.lasts ?? 2); t += 0.05) {
        const seen = [0.3, 1.17, 5.9, 11.43].map((now) => { const p = { ...base }; pose(p, momentOf(key, t, now, hook, at)); return p })
        for (const p of seen) {
          expect(Math.abs(p.b - seen[0].b), `${key} b at ${t.toFixed(2)}`).toBeLessThan(0.01)
          expect(Math.abs(p.open - seen[0].open), `${key} open at ${t.toFixed(2)}`).toBeLessThan(0.01)
          expect(Math.abs(p.lid - seen[0].lid), `${key} lid at ${t.toFixed(2)}`).toBeLessThan(0.01)
          // A shiver may ride on the squash; a beat may not.
          expect(Math.abs(p.sx - seen[0].sx), `${key} sx at ${t.toFixed(2)}`).toBeLessThan(0.09)
          expect(Math.abs(p.sy - seen[0].sy), `${key} sy at ${t.toFixed(2)}`).toBeLessThan(0.09)
        }
      }
    }
  })

  it('brings the turtle\'s flipper down at every knock, and squeezes the jellyfish at every breath', () => {
    const turtle = beside('turtle', 'none'), base = turtle.shown('turtle'), at = { x: base.x, y: base.y }
    const flipper = (t: number, now: number): number => { const p = { ...base }; ACTS['none.turtle'].pose!(p, momentOf('none.turtle', t, now, at, at)); return p.b }
    for (let knock = 2; knock <= 6; knock++) {
      for (const now of [0.4, 3.3, 9.1]) {
        expect(flipper(knock * KNOCK_EVERY, now)).toBeLessThan(0.02)
        expect(flipper((knock + 0.5) * KNOCK_EVERY, now)).toBeGreaterThan(0.5)
      }
    }
    // The knocks themselves, as the rules sound them: one each stretch.
    bring(turtle, 'turtle', 0.4)
    const cell = turtle.creatures.turtle
    expect(cell.cell).toBe('none.turtle')
    let last = cell.since
    run(turtle, 1.2, (cues) => {
      for (const cue of cues) if (cue.name === 'knock') { expect(Math.floor(cell.since / KNOCK_EVERY)).toBeGreaterThan(Math.floor(last / KNOCK_EVERY)); expect((cell.since % KNOCK_EVERY) / KNOCK_EVERY).toBeLessThan(0.1) }
      last = cell.since
    })
    const jelly = beside('jelly', 'glow'), bell = jelly.shown('jelly'), where = { x: bell.x, y: bell.y }
    const squeezed = (t: number, now: number): number => { const p = { ...bell }; ACTS['glow.jelly'].pose!(p, momentOf('glow.jelly', t, now, where, where)); return p.sy - bell.sy }
    const breaths = CELLS['glow.jelly'].beats.map((beat) => beat.at)
    expect(breaths).toEqual([0, 0.7])
    for (const now of [0.2, 4.4]) {
      expect(squeezed(breaths[1] + 0.1, now)).toBeCloseTo(squeezed(0.1, 0.9), 6)
      expect(squeezed(breaths[1] + 0.1, now)).not.toBeCloseTo(squeezed(breaths[1] + 0.45, now), 2)
    }
  })

  it('has the dreaming cat\'s paw meet the water at each plip', () => {
    const paw = (since: number): number => catPose(2, 2, 'dream', since, { x: 0, y: 0 }, false, { x: 0, y: 0 }).paw!.y
    for (const beat of CAT_BEATS.dream!) {
      expect(DREAM_PATS).toContain(beat.at)
      expect(paw(beat.at)).toBeGreaterThan(paw(beat.at - 0.12))
      expect(paw(beat.at)).toBeGreaterThan(paw(beat.at + 0.12))
      expect(paw(beat.at)).toBeCloseTo(40, 1)
    }
  })
})
