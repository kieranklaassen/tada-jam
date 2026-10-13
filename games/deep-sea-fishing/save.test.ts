import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { buildFrame } from './frame'
import { Game, bodyBox, type Left } from './game'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import type { Item } from './items'
import { FRAME, beside, bring, draw, make, run } from './kit'
import { makeRng } from './rng'
import { BARE_HOOK_FROM_AGE, UNDER_THE_ROD, firstVisit, leftOf, load, store, type Saved } from './save'
import { CREATURE_IDS, HOOK_EYE, HOOK_REST, KEEL_DEPTH, LAYERS, NET_DEPTH, PEGS, ROD_TIP, SEABED, TUB_SLOTS, UNDER_BOAT, WATERLINE, inside, linePath } from './sea'
import { STATE_VERSION, beginCycle, finishCycle } from './state'

// What is kept (ART.md, "The designed order, and what is stored"): read
// defensively, a first visit laid out by age as a default and never a gate,
// and the game found as it was left, with no scene played again.

/** What ctx.storage hands back on the next visit. */
const stored = (state: Saved): unknown => JSON.parse(JSON.stringify(store(state)))
const saved = (more: Partial<Saved> = {}): Saved => ({ v: STATE_VERSION, position: LADDER[0], finished: false, bait: 'none', hook: { ...HOOK_REST }, hooked: null, following: [], tub: [], ...more })
/** The game put away as it stands and opened again: what the Mount does with a snapshot. */
function reopened(game: Game, childAge: number | null = null, seed = 99): Game {
  const state = load(stored({ ...saved(), ...game.snapshot() }), childAge)
  return new Game(leftOf(state), makeRng(seed))
}

describe('a first visit', () => {
  it('hangs the worm straight down under the rod for a child under nine, and for a child whose age is not known', () => {
    for (const age of [null, 2, 7, 8, 0, -3]) {
      const fresh = load(undefined, age)
      expect(fresh.bait, String(age)).toBe('worm')
      expect(fresh.hook, String(age)).toEqual(UNDER_THE_ROD)
      expect([fresh.hooked, fresh.following, fresh.tub, fresh.finished]).toEqual([null, [], [], false])
    }
  })

  it('starts a child of nine or older with a bare hook under the rod, with no upper end', () => {
    expect(BARE_HOOK_FROM_AGE).toBe(9)
    for (const age of [9, 10, 11, 12, 15, 40]) {
      const fresh = load(undefined, age)
      expect(fresh.bait, String(age)).toBe('none')
      expect(fresh.hook, String(age)).toEqual(HOOK_REST)
    }
    expect(firstVisit(8.9).bait).toBe('worm')
  })

  it('is a default and never a gate: a saved game is read the same at any age, and everything is in reach at every age', () => {
    const left = saved({ bait: 'boot', hook: { x: 900, y: 700 }, tub: ['squid'] })
    for (const age of [null, 2, 7, 9, 12, 40]) expect(load(stored(left), age)).toEqual(left)
    for (const age of [null, 12]) {
      // The youngest layout and the oldest reach the same sea: every bait with one tap, the seabed with one drag.
      const game = new Game(leftOf(load(undefined, age)), makeRng(1))
      game.press({ x: PEGS.boot.x, y: PEGS.boot.y + 24 })
      expect(game.bait).toBe('boot')
      draw(game, { x: 700, y: SEABED - 20 }, 7)
      expect(game.hook.y).toBeGreaterThan(SEABED - 40)
    }
  })

  it('hangs the first worm straight down from the rod in the sunlit water, the line bent round nothing, on nobody and within nobody\'s reach', () => {
    expect(UNDER_THE_ROD.x).toBe(ROD_TIP.x)
    expect(UNDER_THE_ROD.x).toBeGreaterThan(UNDER_BOAT)
    expect(UNDER_THE_ROD.y).toBeGreaterThan(WATERLINE + HOOK_EYE)
    expect(UNDER_THE_ROD.y).toBeLessThan(LAYERS.sunlit.bottom)
    expect(linePath(ROD_TIP, { x: UNDER_THE_ROD.x, y: UNDER_THE_ROD.y - HOOK_EYE })).toHaveLength(2)
    for (const seed of [1, 3, 9]) {
      const game = new Game(leftOf(load(undefined, null)), makeRng(seed))
      for (const id of CREATURE_IDS) {
        expect(Math.hypot(game.hook.x - game.touchPoint(id).x, game.hook.y - game.touchPoint(id).y), id).toBeGreaterThan(game.reachOf(id))
        expect(inside(game.hook, bodyBox(id, game.creatures[id], game.centre(id))), id).toBe(false)
        expect(game.creatures[id].notice, id).toBe(0)
      }
    }
  })

  it('brings the turtle to the worm by its own slow swim within a few seconds, where it stops and looks, and nothing else happens until a touch', () => {
    const game = new Game(leftOf(load(undefined, null)), makeRng(3)), turtle = game.creatures.turtle
    const eyes = game.pose('turtle').pupil
    let came = -1
    for (let i = 0; i < 6 * 60 && came < 0; i++) {
      const before = game.centre('turtle').x
      expect(run(game, FRAME)).toEqual([])
      // It swims no faster than it ever does.
      expect(Math.abs(game.centre('turtle').x - before)).toBeLessThan(0.5)
      if (turtle.notice > 0.9) came = game.time
    }
    expect(came).toBeGreaterThan(0.8)
    expect(came).toBeLessThan(5)
    // Its eyes are wide and on the worm, its nose is at it, and it has stopped.
    expect(game.pose('turtle').pupil).toBeGreaterThan(eyes * 1.2)
    expect(Math.hypot(game.hook.x - game.touchPoint('turtle').x, game.hook.y - game.touchPoint('turtle').y)).toBeLessThan(game.reachOf('turtle'))
    const stopped = game.centre('turtle').x
    expect(run(game, 20)).toEqual([])
    expect(Math.abs(game.centre('turtle').x - stopped)).toBeLessThan(6)
    expect(game.snapshot()).toEqual(leftOf(load(undefined, null)))
    expect(game.dirty).toBe(0)
    expect(turtle.cell).toBeNull()
  })

  it('answers the first touch at once: the turtle that was looking at the worm begins on it, whether the finger taps the hook or draws it a little way', () => {
    for (const drawn of [{ x: 0, y: 0 }, { x: 0, y: 30 }, { x: -20, y: 10 }]) {
      const game = new Game(leftOf(load(undefined, null)), makeRng(3))
      run(game, 6)
      const heard = draw(game, { x: game.hook.x + drawn.x, y: game.hook.y + drawn.y }, 0.4).map((cue) => cue.name)
      expect(game.creatures.turtle.cell).toBe('worm.turtle')
      expect(heard).toContain('crunch')
      game.release()
      run(game, 2.4)
      expect(game.bait).toBe('none')
    }
  })

  it('leaves the bare hook of an older child just under the boat, where nobody is looking at it', () => {
    const game = new Game(leftOf(load(undefined, 10)), makeRng(3))
    expect(run(game, 12)).toEqual([])
    for (const id of CREATURE_IDS) expect(game.creatures[id].notice, id).toBe(0)
  })
})

describe('reading what was kept', () => {
  it.each([
    ['nothing', undefined], ['null', null], ['a string', 'sea'], ['a number', 7], ['an array', [1, 2]],
    ['a later version', { v: STATE_VERSION + 1, position: 'sea', finished: false, bait: 'boot' }],
    ['no version', { position: 'sea', bait: 'boot', tub: ['squid'] }],
  ])('starts a first visit from %s', (_, raw) => {
    expect(load(raw, null)).toEqual({ v: STATE_VERSION, position: 'sea', finished: false, ...firstVisit(null) })
    expect(load(raw, 10)).toEqual({ v: STATE_VERSION, position: 'sea', finished: false, ...firstVisit(10) })
  })

  it('reads a record from before the game had its own fields as a bare hook and an empty tub', () => {
    expect(load({ v: STATE_VERSION, position: 'sea', finished: false }, null)).toEqual(saved())
  })

  it('repairs each field by itself and keeps the others', () => {
    const good = saved({ bait: 'glow', hook: { x: 700, y: 600 }, following: ['jelly', 'angler'], tub: ['puffer', 'squid'] })
    const raw = stored(good) as Record<string, unknown>
    expect(load(raw, null)).toEqual(good)
    expect(load({ ...raw, bait: 'gold' }, null)).toEqual({ ...good, bait: 'none', following: [] })
    expect(load({ ...raw, hook: 'deep' }, null)).toEqual({ ...good, hook: { ...HOOK_REST } })
    expect(load({ ...raw, hook: { x: Number.NaN, y: 3 } }, null).hook).toEqual(HOOK_REST)
    expect(load({ ...raw, hook: { x: 1e9, y: 1e9 } }, null).hook).toEqual({ x: 1146, y: SEABED - 8 })
    expect(load({ ...raw, tub: 'four' }, null)).toEqual({ ...good, tub: [] })
    expect(load({ ...raw, following: { 0: 'jelly' } }, null)).toEqual({ ...good, following: [] })
    expect(load({ ...raw, hooked: 12 }, null)).toEqual(good)
    expect(load({ ...raw, position: 9, finished: 'no' }, null)).toEqual(good)
  })

  it('makes the fields agree: nobody is in two places, and only what the rules allow is read', () => {
    // Nobody twice, nobody unknown, no more than the tub holds, and nobody in the tub who cannot be caught.
    expect(load({ ...saved(), tub: ['puffer', 'puffer', 'kraken', 'shark', 'turtle', 'squid', 'jelly', 'octopus', 'angler', 7] }, null).tub).toEqual(['puffer', 'squid', 'jelly', 'octopus'])
    // A catch on the hook: no bait and no train, and it is not also in the tub.
    expect(load({ ...saved(), bait: 'glow', hooked: 'angler', following: ['jelly'] }, null)).toEqual(saved({ hooked: 'angler' }))
    expect(load({ ...saved(), hooked: 'squid', tub: ['squid'] }, null)).toEqual(saved({ tub: ['squid'] }))
    // Only those who bite can be on the hook, and only those who follow the bait that is on can follow.
    expect(load({ ...saved(), hooked: 'shark' }, null).hooked).toBeNull()
    expect(load({ ...saved(), hooked: 'turtle' }, null).hooked).toBeNull()
    expect(load({ ...saved(), bait: 'spoon', following: ['jelly', 'turtle', 'turtle', 'shoal', 'blobfish'] }, null).following).toEqual(['turtle', 'shoal'])
    expect(load({ ...saved(), bait: 'cheese', following: ['blobfish'], tub: ['blobfish'] }, null).following).toEqual([])
    // A hook saved inside the hull or the net is put under them.
    expect(load({ ...saved(), hook: { x: 400, y: 200 } }, null).hook).toEqual({ x: 400, y: KEEL_DEPTH })
    expect(load({ ...saved(), hook: { x: 100, y: 200 } }, null).hook).toEqual({ x: 100, y: NET_DEPTH })
    // A trip is over only with nothing left of it on screen.
    expect(load({ ...saved(), finished: true, tub: ['squid'] }, null).finished).toBe(false)
    expect(load({ ...saved(), finished: true }, null).finished).toBe(true)
  })

  it('never throws, whatever is in the slot', () => {
    const junk: unknown[] = [{}, { v: STATE_VERSION }, { v: STATE_VERSION, tub: [[['puffer']]], hook: { x: {}, y: [] }, following: null, hooked: {}, bait: 5 }, { v: 'one' }, [[]], true, () => 1, { v: STATE_VERSION, hook: null, tub: { length: 9 } }]
    for (const raw of junk) for (const age of [null, 7, 11]) {
      const state = load(raw, age)
      expect(() => new Game(leftOf(state), makeRng(1)).step(FRAME)).not.toThrow()
    }
  })

  it('round-trips, in whole numbers, and stays far under the cap', () => {
    const full = saved({ bait: 'cheese', hook: { x: 1146, y: SEABED - 8 }, following: ['blobfish'], tub: ['puffer', 'squid', 'jelly', 'octopus'], finished: false })
    expect(load(stored(full), null)).toEqual(full)
    expect(store({ ...full, hook: { x: 300.4, y: 500.6 } }).hook).toEqual({ x: 300, y: 501 })
    expect(JSON.stringify(store(full)).length).toBeLessThan(1024)
  })
})

describe('found as left', () => {
  const quiet = (game: Game): void => {
    const before = game.snapshot()
    // Hands off: nothing sounds, nothing is caught or lost, no scene starts.
    expect(run(game, 12).filter((cue) => cue.name !== 'plip')).toEqual([])
    expect(game.snapshot()).toEqual(before)
    expect(game.tow).toBeNull()
    expect(game.tip).toBeNull()
    expect(game.dirty).toBe(0)
  }

  it('finds the bait, the hook, a catch on it, a train and the tub as they were, and nothing moves on by itself', () => {
    const lefts: Partial<Left>[] = [
      { bait: 'worm', hook: { x: 845, y: 514 } },
      { bait: 'glow', hook: { x: 700, y: 620 }, following: ['angler', 'jelly'] },
      { bait: 'spoon', hook: { x: 300, y: 300 }, following: ['shoal', 'turtle'], tub: ['squid'] },
      { hooked: 'octopus', hook: { x: 500, y: 400 }, tub: ['puffer', 'jelly'] },
      { hooked: 'puffer', hook: { x: 620, y: 200 } },
      { tub: ['puffer', 'squid', 'jelly', 'octopus'] },
      { bait: 'cheese', hook: { x: 1040, y: 700 }, following: ['blobfish'], tub: ['angler', 'squid', 'jelly', 'octopus'] },
    ]
    for (const left of lefts) {
      const game = make(left), again = reopened(game)
      expect(again.snapshot()).toEqual(game.snapshot())
      expect(again.hook.x).toBe(game.snapshot().hook.x)
      // Who was on the hook is on it; who followed is behind it; who was in the tub lies in the tub.
      if (left.hooked) expect(again.creatures[left.hooked].mode).toBe('hooked')
      for (const id of left.following ?? []) expect(again.creatures[id].mode).toBe('following')
      ;(left.tub ?? []).forEach((id, index) => { expect(again.creatures[id].mode).toBe('away'); expect(again.creatures[id].off).toEqual(TUB_SLOTS[index]) })
      quiet(again)
    }
  })

  it('keeps where the line was taken up while a finger is still drawing it', () => {
    const game = make({ bait: 'worm', hook: { x: 700, y: 300 } })
    draw(game, { x: 660, y: 400 }, 0.4)
    expect(game.hook.y).toBeGreaterThan(360)
    expect(game.snapshot().hook).toEqual({ x: 700, y: 300 })
    expect(reopened(game).hook).toMatchObject({ x: 700, y: 300 })
  })

  it('the tow: its outcome is in place when it starts, and it is not played again', () => {
    const game = beside('shark', 'worm', { tub: ['puffer', 'squid'] })
    bring(game, 'shark', 0.6)
    expect(game.tow).not.toBeNull()
    expect(game.dirty).toBe(2)
    // Put away in the middle of it, at several moments: the worm is gone, the hook is back under the boat, the tub is as it was.
    for (const after of [0, 1.5, 4, 6.5]) {
      const now = beside('shark', 'worm', { tub: ['puffer', 'squid'] })
      bring(now, 'shark', 0.6)
      run(now, after)
      const again = reopened(now)
      expect(again.snapshot()).toEqual({ bait: 'none', hook: { ...HOOK_REST }, hooked: null, following: [], tub: ['puffer', 'squid'], finished: false })
      expect(again.creatures.shark.mode).toBe('home')
      quiet(again)
    }
    // Played to its end, it leaves the same.
    run(game, 9)
    expect(game.tow).toBeNull()
    expect(game.snapshot()).toEqual({ bait: 'none', hook: { ...HOOK_REST }, hooked: null, following: [], tub: ['puffer', 'squid'], finished: false })
  })

  it('the tip-out: the trip is over and the tub empty when it starts, and it is not played again', () => {
    for (const after of [0, 0.5, 2, 4, 7]) {
      const game = make({ tub: ['puffer', 'squid', 'jelly', 'octopus'] })
      game.press({ x: 285, y: 140 })
      expect(game.tip).not.toBeNull()
      expect(game.dirty).toBe(2)
      expect(game.snapshot()).toMatchObject({ tub: [], finished: true, hooked: null, following: [], bait: 'none' })
      run(game, after)
      const again = reopened(game)
      expect(again.finished).toBe(true)
      expect(again.tub).toEqual([])
      // Everyone is back in the sea, the lantern is lit and the cat is asleep in the tub; nothing happens until the line is touched.
      for (const id of ['puffer', 'squid', 'jelly', 'octopus'] as const) expect(again.creatures[id].mode).toBe('home')
      expect(again.cat.asleep).toBe(true)
      quiet(again)
      expect(again.finished).toBe(true)
    }
  })

  it('the next trip waits for the child: a touch on the line wakes the cat and starts it', () => {
    const game = make({ finished: true })
    run(game, 30)
    expect(game.finished).toBe(true)
    // The cat and the gull still answer, and start nothing.
    game.press({ x: 690, y: 40 })
    expect(game.finished).toBe(true)
    game.cues.length = 0
    game.press({ x: 640, y: 420 })
    expect(game.finished).toBe(false)
    expect(game.cues.map((cue) => cue.name)).toContain('wake')
    expect(game.dirty).toBe(2)
    expect(game.cat.asleep).toBe(false)
  })

  it('counts a trip as one cycle: begun when the line is first drawn, finished when the tub is tipped out', () => {
    let state = saved()
    state = beginCycle(state)
    expect(state.finished).toBe(false)
    state = finishCycle({ ...state, tub: [] }, 'mixed')
    expect(state.finished).toBe(true)
    expect(state.position).toBe('sea')
    expect(load(stored(state), null).finished).toBe(true)
    expect(beginCycle(state).finished).toBe(false)
    expect(WATERLINE).toBeLessThan(HOOK_REST.y)
  })
})

describe('parked against loaded', () => {
  // The Mount sets the game up again from the saved state when it goes to rest (`open` in the Mount), so a game that
  // was parked and one that was loaded are made by the same call. What is held here is that the state it was saved
  // with is the whole of what shows: a game made from the snapshot draws the same frame as one made from storage,
  // nothing of a scene or an answer is left in it, and the idle ladder starts from the bottom.
  const items: Item[] = [], other: Item[] = []
  const parked = (game: Game): Game => new Game(game.snapshot(), makeRng(5))
  const loaded = (game: Game): Game => new Game(leftOf(load(stored({ ...saved(), ...game.snapshot() }), null)), makeRng(5))
  const same = (game: Game): Game => {
    const a = parked(game), b = loaded(game)
    expect(buildFrame(a, null, items)).toEqual(buildFrame(b, null, other))
    for (const each of [a, b]) {
      run(each, 0.5)
      expect(each.playing).toBe(false)
      for (const id of CREATURE_IDS) expect(each.creatures[id].cell, id).toBeNull()
    }
    expect(buildFrame(a, null, items)).toEqual(buildFrame(b, null, other))
    return a
  }

  it('in the middle of a scene: the scene is over, its outcome stands, and nothing of it plays on', () => {
    const tow = beside('shark', 'worm', { tub: ['puffer'] })
    bring(tow, 'shark', 2)
    expect(tow.playing).toBe(true)
    const back = same(tow)
    expect(back.tow).toBeNull()
    expect(back.snapshot()).toEqual({ bait: 'none', hook: { ...HOOK_REST }, hooked: null, following: [], tub: ['puffer'], finished: false })
    expect(run(back, 8)).toEqual([])
    const tip = make({ tub: ['puffer', 'squid', 'jelly', 'octopus'] })
    tip.press({ x: 285, y: 140 })
    run(tip, 3)
    expect(tip.playing).toBe(true)
    const night = same(tip)
    expect(night.tip).toBeNull()
    expect(night.finished).toBe(true)
    expect(night.cat.asleep).toBe(true)
  })

  it('with a hunter hanging beside the timid: no startle, ink, bolt or bump, and the tub does not change, until the line is drawn', () => {
    const quiet = ['startle', 'scatter', 'bump', 'surface', 'scoop', 'land', 'inkLost']
    // An anglerfish on the hook, or following the stick, left hanging within a hunter's reach of the squid, the pufferfish and the shoal.
    const lefts: Partial<Left>[] = [
      { hooked: 'angler', hook: { x: 290, y: 380 }, tub: ['jelly'] },
      { bait: 'glow', following: ['angler'], hook: { x: 290, y: 400 }, tub: ['jelly'] },
      { hooked: 'angler', hook: { x: 880, y: 300 }, tub: ['jelly'] },
      { bait: 'glow', following: ['angler', 'jelly'], hook: { x: 150, y: 420 } },
    ]
    for (const left of lefts) {
      const game = make(left)
      const a = parked(game), b = loaded(game)
      expect(buildFrame(a, null, items)).toEqual(buildFrame(b, null, other))
      for (const each of [a, b]) {
        const heard = run(each, 9).map((cue) => cue.name)
        expect(heard.filter((name) => quiet.includes(name)), JSON.stringify(left)).toEqual([])
        expect(each.inks).toEqual([])
        expect(each.tub).toEqual(left.tub ?? [])
        expect(each.flights).toEqual([])
        for (const id of ['squid', 'puffer', 'shoal'] as const) expect(each.creatures[id].mode, id).toBe('home')
        expect(each.dirty).toBe(0)
      }
      expect(buildFrame(a, null, items)).toEqual(buildFrame(b, null, other))
    }
    // The child draws the line: whoever the hunter was already hanging beside is past its scare, and whoever it is then led to is not.
    const game = make(lefts[0])
    run(game, 2)
    expect(game.creatures.squid.scared).toBe(true)
    const first = draw(game, { x: 300, y: 390 }, 1).map((cue) => cue.name)
    expect(first.filter((name) => quiet.includes(name))).toEqual([])
    const led = draw(game, { x: 900, y: 300 }, 6).map((cue) => cue.name)
    expect(led).toContain('scatter')
  })

  it('with the hook resting in the air and a bite on it: nothing lands without a touch', () => {
    // The last catch was landed, so the line is taken up from a rest in the air, under the rod. The child baits the
    // hook, draws it down to the pufferfish, gets a bite, and the game is put away with the finger still down.
    const game = beside('puffer', 'worm', { tub: ['squid'] })
    game.rest = { x: ROD_TIP.x, y: WATERLINE - 30 }
    bring(game, 'puffer', 2.6)
    expect(game.hooked).toBe('puffer')
    expect(game.held).toBe(true)
    // The bite moved the rest under the boat: that is where a touch that is taken away puts the hook, and what is saved.
    expect(game.rest).toEqual({ ...HOOK_REST })
    expect(game.snapshot().hook).toEqual({ ...HOOK_REST })
    const a = parked(game), b = loaded(game)
    game.cancel()
    for (const each of [game, a, b]) {
      const heard = run(each, 4).map((cue) => cue.name)
      expect(each.hooked).toBe('puffer')
      expect(each.tub).toEqual(['squid'])
      expect(each.flights).toEqual([])
      expect(heard).not.toContain('land')
      // Opened again, the cat is already flat under the catch that hangs just below the surface, and says nothing.
      if (each !== game) expect(heard).not.toContain('catDuck')
      expect(each.hook.y).toBeGreaterThan(WATERLINE)
    }
    expect(buildFrame(a, null, items)).toEqual(buildFrame(b, null, other))
    // A saved state that has a catch on a hook in the air (from before this was so) opens with the catch under the boat.
    const old = new Game(leftOf(load(stored({ ...saved(), hooked: 'puffer', hook: { x: ROD_TIP.x, y: WATERLINE - 30 }, tub: ['squid'] }), null)), makeRng(5))
    expect(old.rest).toEqual({ ...HOOK_REST })
    expect(run(old, 4).map((cue) => cue.name)).not.toContain('land')
    expect(old.tub).toEqual(['squid'])
    // A touch that is taken away never lands a catch, wherever the line was taken up: with the rest just under the
    // surface the hook springs back from a deep bite and swings a little past it, into the air, and nothing is swung in.
    for (const depth of [1, 3, 6, 10, 16, 24, 40, 70]) {
      const deep = beside('angler', 'worm', { tub: ['squid'] })
      deep.rest = { x: ROD_TIP.x, y: WATERLINE + depth }
      bring(deep, 'angler', 2.6)
      expect(deep.hooked, String(depth)).toBe('angler')
      deep.cancel()
      let highest = Infinity
      const heard = run(deep, 5, () => { highest = Math.min(highest, deep.hook.y) }).map((cue) => cue.name)
      expect(heard, String(depth)).not.toContain('land')
      expect(deep.hooked, String(depth)).toBe('angler')
      expect(deep.tub, String(depth)).toEqual(['squid'])
      expect(deep.flights, String(depth)).toEqual([])
      expect(highest, String(depth)).toBeLessThan(WATERLINE + depth)
      // However far past its rest the spring were to carry it, into the air over a cat that is already flat: still nothing is swung in.
      deep.hook.y = WATERLINE - 20
      deep.hook.vy = 0
      expect(deep.cat.act, String(depth)).toBe('duck')
      expect(run(deep, 2).map((cue) => cue.name), String(depth)).not.toContain('land')
      expect(deep.tub, String(depth)).toEqual(['squid'])
      expect(deep.hooked, String(depth)).toBe('angler')
      // The child's next touch lands it as ever.
      if (depth === 1) {
        for (let i = 0; i < 6 * 60 && !deep.tub.includes('angler'); i++) { draw(deep, { x: 620, y: 150 }, 0); run(deep, FRAME) }
        expect(deep.tub).toEqual(['squid', 'angler'])
      }
    }
    // And the child's own touch still lands it.
    for (let i = 0; i < 6 * 60 && !old.tub.includes('puffer'); i++) { draw(old, { x: 620, y: 150 }, 0); run(old, FRAME) }
    expect(old.tub).toEqual(['squid', 'puffer'])
  })

  it('in the middle of a joke: the joke is over, the hook is where it was let go, and whoever had hold of it has let go', () => {
    for (const [bait, id] of [['none', 'octopus'], ['boot', 'shark'], ['none', 'jelly'], ['cheese', 'turtle']] as const) {
      const game = beside(id, bait)
      bring(game, id, 0.6)
      expect(game.creatures[id].cell, id).not.toBeNull()
      game.release()
      run(game, 0.1)
      const back = same(game)
      expect(back.bait).toBe(bait)
      expect(back.held).toBe(false)
      // Nothing at all is heard until the child draws the line again: whoever the hook hangs beside only looks at it.
      expect(run(back, 6)).toEqual([])
      expect(back.creatures[id].cell).toBeNull()
    }
  })

  it('the idle ladder starts from the bottom, as on a load: no glow and no hand until the child has been idle again', () => {
    const ladder = new IdleLadder(0)
    expect(ladder.update(IDLE_BEFORE_DEMO + 1).demo).not.toBeNull()
    // The Mount makes a new ladder at the attended clock's present second when the game is set up again.
    const again = new IdleLadder(IDLE_BEFORE_DEMO + 1), fresh = new IdleLadder(0)
    for (const idle of [0, 1, IDLE_BEFORE_GLOW - 0.1, IDLE_BEFORE_GLOW + 0.5, IDLE_BEFORE_DEMO + 1]) expect(again.update(IDLE_BEFORE_DEMO + 1 + idle)).toEqual(fresh.update(idle))
    expect(again.update(IDLE_BEFORE_DEMO + 1)).toEqual({ glow: 0, demo: null, demoIndex: -1 })
  })
})
