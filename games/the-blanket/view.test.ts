import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fakePen, fakeSurfaces } from './fakePen'
import { FIGURE_SPRITES } from './figures'
import { flightAt } from './flights'
import { hintFor } from './guide'
import { BELL, FISH, HOOK, PLACES, SEATS, SITTERS, SPOTS, headSpot, sausageAt, spotAt, type Spot } from './layout'
import { cover, drape, freshWorld, pickSausage, putSausage, quiet, ringBell, step, uncover, type World } from './model'
import { NATURES, aloft, footing, looksAt, neutral, poseOf } from './motion'
import { STAMP_LIMIT, View, glows } from './view'
import { surface } from './paint'
import { T } from './things'
import { voiceOfEvent, voiceOfPoke } from './voices'
import type { Note } from './audio'

let undo: () => void
beforeAll(() => { undo = fakeSurfaces() })
afterAll(() => undo())

function ready(): View {
  const view = new View()
  view.sized(surface.make, 1, 0, 0, 1180, 820)
  return view
}
function play(world: World, view: View, seconds: number, each: () => void = () => {}): void {
  for (let i = 0; i < seconds * 60; i++) {
    step(world)
    view.advance(world, null, 1 / 60)
    for (const e of world.events.splice(0)) view.notice(e, world)
    each()
  }
}
/** Every state a child can make, as far as the drawing is concerned. */
function busiest(): World {
  const world = freshWorld()
  for (const who of SITTERS) cover(world, who)
  return world
}

describe('a frame', () => {
  it('draws with no number gone wrong and stays in its budget, through a whole dash at every spot', () => {
    const spots: Spot[] = [...PLACES, 'hook', ...SITTERS.map(headSpot)]
    let most = 0
    for (const spot of spots) {
      const world = busiest(), view = ready()
      for (const who of SITTERS) world.sitters[who].belief = spot === headSpot(who) ? null : spot
      ringBell(world)
      play(world, view, 9, () => {
        const pen = fakePen()
        view.draw(pen.ctx, world, null, { glow: 1, demo: 0.4, demoIndex: 0 })
        expect((pen.ctx as unknown as { depth: number }).depth).toBe(0)
        most = Math.max(most, view.stamps.stamped)
      })
      expect(quiet(world)).toBe(true)
    }
    expect(most).toBeLessThanOrEqual(STAMP_LIMIT)
  })
  it('paints nothing anew while the room plays', () => {
    const world = busiest(), view = ready()
    view.draw(fakePen().ctx, world, null, null)
    const painted = view.stamps.painted
    ringBell(world)
    play(world, view, 6, () => view.draw(fakePen().ctx, world, null, { glow: 1, demo: 0.5, demoIndex: 0 }))
    for (const on of PLACES.slice(0, 4)) drape(world, on)
    view.draw(fakePen().ctx, world, null, null)
    expect(view.stamps.painted).toBe(painted)
  })
  it('is the same room on a surface of any size', () => {
    const view = new View()
    view.sized(surface.make, 0.4, -400, -900, 2000, 2600)
    expect(() => view.draw(fakePen().ctx, freshWorld(), null, null)).not.toThrow()
  })
  it('answers a touch on the bare room, at every tier, with something to see', () => {
    const view = ready(), world = freshWorld()
    const count = () => { view.draw(fakePen().ctx, world, null, null); return view.stamps.stamped }
    const before = count()
    view.poke({ thing: { kind: 'room' }, at: { x: 600, y: 300 } })
    expect(count()).toBeGreaterThan(before)
  })
})

describe('the belief can be read', () => {
  it('points a pair of eyes at each spot it believes in, differently for any two', () => {
    const spots: Spot[] = [...PLACES, 'hook']
    for (const who of SITTERS) {
      const seen = spots.map((spot) => {
        const world = freshWorld()
        world.sitters[who].belief = spot
        const at = looksAt(world, who, null, 3, null).at
        expect(at).toEqual(spotAt(spot))
        return Math.atan2(at.y - SEATS[who].head.y, at.x - SEATS[who].head.x)
      })
      for (const a of seen) for (const b of seen) if (a !== b) expect(Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))).toBeGreaterThan(0.12)
    }
  })
  it('follows the sausage in the hand only for those who see', () => {
    const world = freshWorld()
    cover(world, 'cat')
    pickSausage(world)
    expect(looksAt(world, 'dog', { x: 9, y: 9 }, 0, null).at).toEqual({ x: 9, y: 9 })
    expect(looksAt(world, 'cat', { x: 9, y: 9 }, 0, null).at).not.toEqual({ x: 9, y: 9 })
  })
  it('wanders when it does not know', () => {
    const world = freshWorld()
    world.sitters.dog.belief = null
    const at = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(looksAt(world, 'dog', null, i, null).at)))
    expect(at.size).toBeGreaterThan(5)
  })
})

describe('motion', () => {
  it('is nobody else’s: no two natures share a number that shows', () => {
    for (const key of Object.keys(NATURES.dog) as (keyof typeof NATURES.dog)[]) expect(new Set(SITTERS.map((who) => NATURES[who][key])).size, key).toBe(SITTERS.length)
  })
  it('looks different for each of them in every phase of a dash', () => {
    for (const phase of ['wind', 'run', 'hunt', 'eat', 'sulk', 'home', 'lost'] as const) {
      const poses = SITTERS.map((who) => {
        const world = freshWorld(), s = world.sitters[who]
        Object.assign(s, { phase, t: 0.5, target: 'boot', from: { x: 600, y: 600 }, at: { x: 640, y: 640 } })
        const p = poseOf(who, s, 2, 9, 9, 9, neutral())
        return JSON.stringify([p.sx, p.sy, p.rot, p.y, p.headRot, p.headY, p.lid, p.mouth].map((v) => (typeof v === 'number' ? v.toFixed(3) : v)))
      })
      expect(new Set(poses).size, phase).toBe(4)
    }
  })
  it('never jumps: whoever is out moves a step at a time from its seat and back to it', () => {
    for (const spot of [...PLACES, 'hook' as const]) for (const who of SITTERS) {
      const world = freshWorld()
      world.sausage = { kind: 'spot', spot: spot === 'boot' ? 'dish' : 'boot' }
      cover(world, who)
      world.sitters[who].belief = spot
      uncover(world, who)
      let last = footing(who, world.sitters[who])
      for (let i = 0; i < 600; i++) {
        step(world)
        const now = footing(who, world.sitters[who])
        expect(Math.hypot(now.x - last.x, now.y - last.y), `${who} to ${spot}, ${world.sitters[who].phase}`).toBeLessThan(48)
        last = now
      }
      expect(last).toEqual({ x: SEATS[who].x, y: SEATS[who].y })
    }
  })
  it('keeps hunters up a wall in front of the chairs', () => {
    expect(aloft('hook') && aloft('pot') && aloft('gramophone')).toBe(true)
    expect(aloft('dish') || aloft(headSpot('dog'))).toBe(false)
  })
  it('flies on an arc from where it was to where it goes', () => {
    const f = { what: 'sausage' as const, from: { x: 0, y: 100 }, to: 'dish' as Spot, t: 0, seconds: 1, key: '' }
    expect(flightAt(f, { x: 200, y: 100 })).toMatchObject({ x: 0, y: 100 })
    expect(flightAt({ ...f, t: 0.5 }, { x: 200, y: 100 }).y).toBeLessThan(70)
    expect(flightAt({ ...f, t: 2 }, { x: 200, y: 100 }).x).toBe(200)
  })
})

describe('guidance', () => {
  it('shows one next act in every quiet room, and glows where it acts', () => {
    const world = freshWorld()
    expect(hintFor(world)?.glow).toBe('sitters')
    cover(world, 'dog')
    expect(hintFor(world)?.glow).toBe('places')
    putSausage(world, 'boot')
    expect(hintFor(world)?.glow).toBe('dog')
    uncover(world, 'dog')
    expect(hintFor(world)).toBeNull()
    const gone = freshWorld()
    for (const who of SITTERS) gone.sitters[who].belief = null
    expect(hintFor(gone)?.glow).toBe('sausage')
    const two = freshWorld()
    cover(two, 'dog'); cover(two, 'cat'); putSausage(two, 'boot')
    expect(hintFor(two)?.glow).toBe('bell')
    const eaten = freshWorld()
    eaten.sausage = { kind: 'spot', spot: 'hook' }
    expect(hintFor(eaten)?.glow).toBe('hook')
    for (const w of [freshWorld(), eaten, world]) { const hint = hintFor(w); if (hint) expect(glows(hint, w).length).toBeGreaterThan(0) }
  })
})

describe('the voices', () => {
  const key = (notes: Note[]) => JSON.stringify(notes)
  it('keep to what a small speaker can play, and end', () => {
    for (const who of SITTERS) for (const spot of PLACES) for (const type of ['cover', 'uncover', 'run', 'empty', 'hunt', 'found', 'bowled', 'miss'] as const) {
      for (const note of voiceOfEvent({ type, who, spot } as never, 1)) {
        expect(note.frequency).toBeGreaterThan(40)
        expect(note.frequency).toBeLessThan(6000)
        expect(note.peak).toBeLessThanOrEqual(0.3)
        expect((note.delay ?? 0) + note.attack + note.decay).toBeLessThan(4)
      }
    }
  })
  it('are each somebody’s own, and each place’s own', () => {
    for (const type of ['cover', 'uncover', 'run', 'found'] as const) expect(new Set(SITTERS.map((who) => key(voiceOfEvent({ type, who, spot: 'dish' } as never, 1)))).size, type).toBe(4)
    for (const type of ['put', 'drape'] as const) expect(new Set(PLACES.map((on) => key(voiceOfEvent({ type, spot: on, on, from: 'hook' } as never, 1)))).size, type).toBe(5)
    expect(new Set(PLACES.map((spot) => key(voiceOfEvent({ type: 'hunt', who: 'dog', spot }, 1)))).size).toBe(5)
  })
  it('answer every thing a finger can land on', () => {
    const things = [{ kind: 'sausage' }, { kind: 'hook' }, { kind: 'bell' }, { kind: 'fish' }, { kind: 'basket' }, { kind: 'room' }, ...PLACES.map((id) => ({ kind: 'place' as const, id }))] as const
    for (const thing of things) expect(voiceOfPoke({ thing, at: { x: 0, y: 0 } }, 0, true).length).toBeGreaterThan(0)
  })
})

describe('the layout', () => {
  it('gives every target room, and keeps essentials off the bottom edge and out of the home control', () => {
    const targets = [...PLACES.map((id) => ({ ...SPOTS[id].at, r: 48 })), { ...BELL, r: 48 }, { ...FISH, r: 48 }, { ...HOOK, r: 48 }]
    for (const [i, a] of targets.entries()) {
      expect(a.y + a.r).toBeLessThanOrEqual(770)
      expect(Math.hypot(a.x - 590, a.y) - a.r).toBeGreaterThan(90)
      for (const b of targets.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r)
    }
    for (const id of PLACES) expect(Math.hypot(sausageAt(id).x - SPOTS[id].at.x, sausageAt(id).y - SPOTS[id].at.y)).toBeLessThan(100)
  })
  it('keeps every picture’s name to itself, since pictures are kept by name', () => {
    const names = [...Object.values(FIGURE_SPRITES), ...Object.values(T)].map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
