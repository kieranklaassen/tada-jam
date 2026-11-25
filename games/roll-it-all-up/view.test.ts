import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ACTS, moveOf, ownOf } from './acts'
import { fakePen, fakeSurfaces } from './fakePen'
import { along, hintFor } from './guide'
import { HOME, PLACES, THINGS } from './layout'
import { surface } from './paint'
import { Play, ROUND } from './play'
import { STAMP_LIMIT, View } from './view'
import { CRY, PHRASE, voiceOf } from './voices'
import { centres, complete, freshWorld } from './world'

let undo: () => void
beforeAll(() => { undo = fakeSurfaces() })
afterAll(() => undo())
const ready = () => { const v = new View(); v.sized(surface.make, 1, 0, 0, 1180, 820); return v }

describe('a frame', () => {
  it('draws with no number gone wrong, stays in budget and paints nothing anew, through a whole game', () => {
    const play = new Play(freshWorld()), view = ready(), painted = view.stamps.painted
    let most = 0, walked = false
    const man = { x: HOME.x, y: 420 }
    for (let i = 0; i < 60 * 40; i++) {
      if (i % 90 === 0) { play.down(1, i % 270 === 180 ? man : { x: 100 + ((i * 37) % 620), y: 630 + (i % 120) }) }
      if (i % 90 === 70) play.up(1)
      play.advance(1 / 60)
      walked ||= play.world.walk !== null
      view.advance(play.world, play.at, (i / 60) % ROUND, 1 / 60)
      for (const e of play.world.events.splice(0)) view.notice(e)
      const pen = fakePen()
      view.draw(pen.ctx, play.world, (i / 60) % ROUND, { glow: 1, demo: 0.4, demoIndex: 0 })
      expect(pen.depth()).toBe(0)
      most = Math.max(most, view.stamps.stamped)
      view.sounds.length = 0
    }
    expect(walked).toBe(true)
    expect(view.stamps.painted).toBe(painted)
    expect(most).toBeLessThanOrEqual(STAMP_LIMIT)
  })
  it('draws each ball where the rules have it', () => {
    const w = freshWorld(), view = ready()
    view.draw(fakePen().ctx, w, -1, null)
    const mids = centres(w.stack, HOME.x, HOME.y)
    view.drawn.mids.forEach((m, i) => expect(Math.hypot(m.x - mids[i].x, m.y - mids[i].y)).toBeLessThan(6))
  })
  it('never lets his balls come further apart than an act lifts them, nor one through another', () => {
    for (const id of THINGS) for (const place of PLACES) for (let t = 0; t < 8; t += 1 / 30) {
      const m = moveOf(place, [{ id }], t)
      for (const v of Object.values(m)) expect(Number.isFinite(v)).toBe(true)
      expect(m.sy).toBeGreaterThan(-0.31)
      expect(m.lift).toBeGreaterThanOrEqual(0)
      if (place === 'base') expect(m.y).toBe(0)
    }
  })
  it('is the same on a surface of any size', () => {
    const view = new View()
    view.sized(surface.make, 0.4, -400, -900, 2000, 2600)
    expect(() => view.draw(fakePen().ctx, freshWorld(), 1, null)).not.toThrow()
  })
})

describe('the twenty-four acts', () => {
  it('are all different, to see and to hear', () => {
    const seen = new Set<string>(), heard = new Set<string>()
    for (const id of THINGS) for (const place of PLACES) {
      expect(ACTS[id][place]).toBeTypeOf('function')
      seen.add(JSON.stringify([0.13, 0.4, 0.77, 1.3].map((t) => [moveOf(place, [{ id }], t), ownOf(id, place, t)])))
      heard.add(JSON.stringify(PHRASE[id][place].notes(1)))
    }
    expect(seen.size).toBe(24)
    expect(heard.size).toBe(24)
  })
  it('keep him in one piece with everything in one ball', () => {
    for (const place of PLACES) for (let t = 0; t < 5; t += 0.05) {
      const m = moveOf(place, THINGS.map((id) => ({ id })), t)
      expect(Math.abs(m.x)).toBeLessThanOrEqual(26)
      expect(Math.abs(m.y)).toBeLessThanOrEqual(40)
      expect(Math.abs(m.lift)).toBeLessThanOrEqual(62)
    }
  })
})

describe('the voices', () => {
  it('keep to what a small speaker can play, and end', () => {
    const acts = [...THINGS, 'snow', 'man', 'robin', 'house', 'tree', 'sky'].map((on) => ({ type: 'press', on }) as never)
    const more = ['full', 'hop', 'drop', 'wake', 'walk', 'turn', 'shiver', 'flop', 'jolt'].map((type) => ({ type }) as never)
    const all = [...acts, ...more, ...PLACES.map((place) => ({ type: 'land', place }) as never), { type: 'leap', id: null } as never, ...THINGS.flatMap((id) => [{ type: 'stick', id }, { type: 'leap', id }, { type: 'home', id }] as never[])]
    for (const a of all) {
      const notes = voiceOf(a, 1)
      expect(notes.length).toBeGreaterThan(0)
      for (const n of notes) {
        expect(n.frequency).toBeGreaterThan(40)
        expect(n.frequency).toBeLessThan(6000)
        expect(n.peak).toBeLessThanOrEqual(0.4)
        expect((n.delay ?? 0) + n.attack + n.decay).toBeLessThan(4)
      }
    }
    expect(new Set(THINGS.map((id) => JSON.stringify(CRY[id](1)))).size).toBe(THINGS.length)
  })
})

describe('guidance', () => {
  it('shows the one next act: roll to him, then tap him, and nothing while a scene runs', () => {
    const play = new Play(freshWorld())
    expect(hintFor(play.world)).toMatchObject({ glow: 'ball' })
    const path = hintFor(play.world)!.path
    expect(along(path, 0)).toEqual(path[0])
    expect(along(path, 1).x).toBeCloseTo(HOME.x)
    play.down(1, { x: HOME.x, y: 420 }); play.up(1)
    for (let i = 0; i < 300; i++) play.advance(1 / 60)
    expect(complete(play.world)).toBe(true)
    expect(hintFor(play.world)).toMatchObject({ glow: 'man' })
    play.down(1, { x: HOME.x, y: 420 })
    expect(hintFor(play.world)).toBeNull()
  })
  it('shows the robin’s round on a touch, and a touch on the snow ends it', () => {
    const play = new Play(freshWorld())
    play.down(1, { x: 320, y: 470 }); play.up(1)
    expect(play.robin).toBe(0)
    play.down(1, { x: 400, y: 690 })
    expect(play.robin).toBe(-1)
  })
})
