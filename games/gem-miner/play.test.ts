import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { drawn, roomFor } from './fixtures'
import { BURROW_INDEX, CAGE, COLS, LIFT, TOOL_HOME, centre, indexOf } from './layout'
import { Play } from './play'
import { rig, run, watch, watched } from './rig'
import { makeRng } from './rng'
import { serialize, worldOf } from './save'
import { toolSpot } from './shapes'
import { layWorld, type World } from './world'

// One visit, as the Mount drives it: touches and frames in; notes, cuts and
// saves out. These tests hold what a visit owes the child across a put-away,
// in the grown-up's corner, at the end of a scene and at rest.

const mid = (index: number) => centre(index % COLS, Math.floor(index / COLS))
const view = rig(1)

/** Everything a visit holds, as plain data: what the rules know, how everyone stands, what is in the air, and the idle ladder. */
function all(play: Play): unknown {
  const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (_key, inner) => (typeof inner === 'function' ? undefined : inner instanceof Map ? [...inner] : inner)))
  return plain({ game: play.game, cast: play.cast, effects: play.effects, guidance: play.guidance, time: play.time, keeps: play.keeps })
}

/** What the frame of a visit stamps, and where. */
function picture(play: Play): unknown {
  const stamps = view.frame(play)
  const names = new Map<object, number>()
  return { stamps: stamps.map((one) => [names.get(one.image) ?? names.set(one.image, names.size).size - 1, Math.round(one.cx * 100), Math.round(one.cy * 100), Math.round(one.w * 100), Math.round(one.h * 100)]), pen: view.view.pen }
}

/** A load of what a visit would save now: through JSON, as storage does it. */
function loaded(play: Play, seed: number): Play {
  return new Play(worldOf(JSON.parse(JSON.stringify(serialize(play.keeps))), null, seed), seed, TIERS[0])
}

describe('a parked game comes back exactly as a load of its save', () => {
  const lift = { x: LIFT.x + LIFT.w / 2, y: LIFT.y + 100 }
  const cases: [string, () => World, (play: Play) => void][] = [
    ['in the middle of the blast, on his way up', () => drawn('oee', 'oee', 'oee', '@ae'), (play) => { play.press(mid(indexOf(1, 3)), false); run(play, 0.3 + 0.25 + 0.1, true) }],
    ['in the blast, hanging under the roof with his hat smoking', () => drawn('oee', 'oee', 'oee', '@ae'), (play) => { play.press(mid(indexOf(1, 3)), false); run(play, 2.5, true) }],
    ['in the middle of the run, with the water half way down', () => drawn('@wee', 'oeee', 'ooee', 'eooe'), (play) => { play.press(mid(indexOf(1, 0)), false); run(play, 1.4, true) }],
    ['in the middle of the ride, with the hillside rolled half away', () => { const world = layWorld(6, 'near'); world.mole.at = CAGE; return world }, (play) => { play.press(lift, false); play.release('tap', lift, false); run(play, 4.8) }],
    ['on an errand, half way to the bucket', () => layWorld(6, 'near'), (play) => { const at = toolSpot(TOOL_HOME.bucket); play.press({ x: at.x, y: at.y - 20 }, false); play.release('tap', at, false); run(play, 0.5) }],
    ['on his way to the cage', () => layWorld(6, 'near'), (play) => { play.press(lift, false); play.release('tap', lift, false); run(play, 0.3) }],
    ['with a finger down and a blow half struck on sandstone', () => drawn('@se', 'eee'), (play) => { play.press(mid(indexOf(1, 0)), false); run(play, 0.4, true) }],
    ['with a gem in the child hand', () => { const world = drawn('@oe', 'eee'); world.gems.push({ colour: 'blue', at: indexOf(1, 0), rest: 'floor' }); return world }, (play) => { const at = play.game.gemPlace(play.game.world.gems[0]); play.press(at, false); play.drag({ x: at.x - 30, y: at.y - 40 }, false); run(play, 0.3, true) }],
    ['with the idle ladder showing its glow and its hand', () => layWorld(6, 'near'), (play) => { run(play, 6.5); expect(play.guidance.demo).not.toBeNull(); expect(play.guidance.glow).toBe(1) }],
    ['with chips in the air, dwellers flinching and the mammoth mid rattle', () => { const world = roomFor('bat'); world.mole.at = indexOf(4, 4); world.kinds[indexOf(4, 4)] = 'open'; world.kinds[indexOf(5, 4)] = 'granite'; return world }, (play) => { play.press(mid(indexOf(5, 4)), false); run(play, 0.35, true) }],
  ]

  for (const [name, world, into] of cases) {
    it(name, () => {
      const seed = 9
      // Every saved hill has its burrow dug; a hill drawn by hand gets it here, or a load of it would be a first visit.
      const hill = world()
      hill.kinds[BURROW_INDEX] = 'open'
      const play = new Play(hill, seed, TIERS[0])
      into(play)
      play.take()
      const fromSave = loaded(play, seed)
      expect(fromSave.game.world.seed).toBe(play.keeps.seed)
      play.park()
      // The same in every number it holds, and in every stamp of its frame.
      expect(all(play)).toEqual(all(fromSave))
      expect(picture(play)).toEqual(picture(fromSave))
      // Put to rest it is silent from that moment, and it says nothing more.
      expect(play.take()).toEqual({ notes: [], cut: true, save: 'no' })
      // Nothing is on its way, nothing is in the air, the ladder is at the bottom and no scene plays.
      expect(play.game.busy).toBe(false)
      expect(play.game.sceneName).toBeNull()
      expect(play.game.hand).toBeNull()
      expect(play.guidance).toEqual({ glow: 0, demo: null, demoIndex: -1 })
      expect(play.effects.chips.length + play.effects.puffs.length + play.effects.shudders.length + play.effects.wisps.length + play.effects.flashes.length + play.effects.beads.length + play.effects.prints.length).toBe(0)
      // And it goes on from there exactly as the loaded one does, touch for touch.
      for (const one of [play, fromSave]) {
        run(one, 1.5)
        one.press(mid(indexOf(3, 2)), false)
        run(one, 1.2, true)
        one.release('drop', mid(indexOf(3, 2)), false)
        run(one, 4)
      }
      expect(all(play)).toEqual(all(fromSave))
      expect(play.take().notes).toEqual(fromSave.take().notes)
    })
  }

  it('no scene replays: parked during the ride, he is found in the fresh burrow, and nothing sounds by itself', () => {
    const world = layWorld(6, 'near')
    world.mole.at = CAGE
    const { play, log } = watched(world, 9)
    play.press(lift, false)
    play.release('tap', lift, false)
    run(play, 1)
    const seed = play.keeps.seed
    play.park()
    watch(play, log)
    const from = log.length
    expect(play.game.world.seed).toBe(seed)
    expect(play.game.world.position).toBe('wild')
    expect(play.game.world.mole.at).toBe(BURROW_INDEX)
    run(play, 2.5)
    expect(log.slice(from)).toEqual([])
  })
})

describe('the grown-up corner answers no touch of the child', () => {
  it('a press there, a hold, a tap and a lift: nothing moves, nothing sounds, nothing is saved, and the idle ladder goes on', () => {
    const play = new Play(layWorld(6, 'near'), 9, TIERS[0])
    const twin = new Play(layWorld(6, 'near'), 9, TIERS[0])
    run(play, 3.5)
    run(twin, 3.5)
    play.take()
    const at = mid(indexOf(12, 0))
    play.press(at, true)
    expect(play.take()).toEqual({ notes: [], cut: false, save: 'no' })
    // Held there for two seconds, as a grown-up holds it.
    run(play, 2, true)
    run(twin, 2, false)
    play.release('tap', at, true)
    expect(play.take()).toEqual({ notes: [], cut: false, save: 'no' })
    expect(all(play)).toEqual(all(twin))
    expect(play.guidance.demo).not.toBeNull()
  })

  it('a rub that enters it: the moves inside it are no moves, and a lift inside it sets nothing down', () => {
    const play = new Play(drawn('@eeeeeeeeeeee', 'eeeeeeeeeeeee'), 9, TIERS[0])
    play.press(mid(indexOf(1, 0)), false)
    run(play, 0.6, true)
    expect(play.game.world.mole.at).toBe(indexOf(1, 0))
    play.take()
    // The finger slides on into the corner: the mole stays with the last block it pointed at outside it.
    for (const c of [9, 10, 11, 12]) { play.drag(mid(indexOf(c, 0)), true); run(play, 0.3, true) }
    expect(play.game.world.mole.at).toBe(indexOf(1, 0))
    expect(play.game.world.kinds[indexOf(2, 0)]).toBe('earth')
    play.release('drop', mid(indexOf(12, 0)), true)
    run(play, 1)
    expect(play.game.busy).toBe(false)
    expect(play.game.world.mole.at).toBe(indexOf(1, 0))
    // A gem carried into the corner and let go there goes back where it was.
    const world = drawn('@oooooooooooo', 'eeeeeeeeeeeee')
    world.gems.push({ colour: 'red', at: indexOf(1, 0), rest: 'floor' })
    const carry = new Play(world, 9, TIERS[0])
    const gem = carry.game.world.gems[0]
    const from = carry.game.gemPlace(gem)
    carry.press(from, false)
    carry.drag(mid(indexOf(11, 0)), false)
    carry.drag(mid(indexOf(12, 0)), true)
    carry.release('drop', mid(indexOf(12, 0)), true)
    expect(gem.at).toBe(indexOf(1, 0))
    // It is seen flying back, and is where it was when it has landed.
    expect(carry.game.motions.some((motion) => motion.gem === gem)).toBe(true)
    run(carry, 1)
    expect(carry.game.motions).toEqual([])
    expect(carry.game.gemPlace(gem)).toMatchObject({ x: from.x, y: from.y })
  })

  it('a scene is not ended by a touch in the corner', () => {
    const play = new Play(drawn('oee', 'oee', 'oee', '@ae'), 9, TIERS[0])
    play.press(mid(indexOf(1, 3)), false)
    run(play, 1.5, true)
    play.release('drop', mid(indexOf(1, 3)), false)
    expect(play.game.sceneName).toBe('blast')
    play.take()
    play.press(mid(indexOf(2, 0)), true)
    expect(play.game.sceneName).toBe('blast')
    expect(play.take().cut).toBe(false)
  })
})

describe('a scene that a touch ends is silent from that frame', () => {
  const scenes: [string, () => World, (play: Play) => void, number][] = [
    ['the blast', () => drawn('oee', 'oee', 'oee', '@ae'), (play) => play.press(mid(indexOf(1, 3)), false), 1.2],
    ['the run', () => drawn('@wee', 'oeee', 'ooee', 'eooe'), (play) => play.press(mid(indexOf(1, 0)), false), 1.2],
    ['the ride', () => { const world = roomFor('bat'); world.mole.at = CAGE; return world }, (play) => { play.press({ x: LIFT.x + 60, y: LIFT.y + 100 }, false); play.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 }, false) }, 1.0],
  ]
  for (const [name, world, begin, into] of scenes) {
    it(name, () => {
      const { play, log } = watched(world(), 9)
      begin(play)
      run(play, into, true)
      play.release('drop', undefined, false)
      expect(play.game.sceneName).not.toBeNull()
      play.take()
      const from = log.length
      const at = mid(indexOf(3, 1))
      play.press(at, false)
      const out = play.take()
      // The touch cuts what was ringing, and all that sounds in its frame is the touch's own answer.
      expect(out.cut).toBe(true)
      expect(play.game.sceneName).toBeNull()
      const events = log.slice(from).map((entry) => entry.event)
      expect(events.map((event) => event.type)).toEqual(['knock'])
      expect(out.notes.length).toBeGreaterThan(0)
      // And the rest of the scene never sounds: no beat of it comes later.
      play.release('cancel', undefined, false)
      const later = log.length
      run(play, 8)
      const after = log.slice(later).map((entry) => entry.event.type)
      for (const type of ['whoomph', 'shoot', 'bump', 'grumble', 'gush', 'glug', 'lap', 'flap', 'soak', 'clack', 'squeal', 'show', 'roll', 'unroll']) expect(after, type).not.toContain(type)
    })
  }
})

describe('nothing pending outlives its touch', () => {
  type Inside = { aim: number | null; errand: unknown; held: boolean; spent: number | null; scene: unknown; saved: unknown }
  const inside = (play: Play): Inside => play.game as unknown as Inside

  it('after any touch has ended and its work is done, the game holds nothing over', () => {
    for (const seed of [31, 32, 33]) {
      const play = new Play(layWorld(seed, seed % 2 ? 'near' : 'wild'), seed, TIERS[0])
      const rng = makeRng(seed)
      for (let move = 0; move < 40; move++) {
        const pick = rng.next()
        const at = pick < 0.15 ? { x: LIFT.x + 60, y: LIFT.y + 100 } : pick < 0.3 ? { x: toolSpot(TOOL_HOME.rope).x - Math.floor(rng.next() * 3) * 180, y: 170 } : { x: play.game.mole.x + (rng.next() - 0.5) * 400, y: Math.max(200, play.game.mole.y + (rng.next() - 0.4) * 300) }
        play.press(at, false)
        const how = rng.next()
        if (how < 0.4) play.release('tap', at, false)
        else {
          run(play, rng.next() * 1.5, true)
          if (how < 0.7) play.drag({ x: at.x + 90, y: at.y }, false)
          run(play, rng.next() * 0.5, true)
          play.release(how < 0.9 ? 'drop' : 'cancel', how < 0.9 ? at : undefined, false)
        }
        // The finger is up: nothing is held, no gem is in the hand, and no block is marked as used.
        expect(inside(play).held).toBe(false)
        expect(play.game.hand).toBeNull()
        expect(inside(play).spent).toBeNull()
        expect(play.game.working).toBe(false)
        // And when what it began has come to its end, nothing is left waiting.
        run(play, 14)
        expect(play.game.busy).toBe(false)
        expect(inside(play)).toMatchObject({ aim: null, errand: null, held: false, spent: null, scene: null, saved: null })
        expect(play.game.motions).toEqual([])
        expect(play.game.staging).toEqual({ name: null, rise: 0, door: false, wind: 0, roll: null, stream: null, lap: null })
        expect(play.game.mole).toMatchObject({ mode: 'rest', act: null, pose: null, afloat: false })
      }
    }
  })

  it('a touch that is taken away sends the mole no further than the step he had begun', () => {
    const play = new Play(drawn('@oooe', 'eeeee'), 9, TIERS[0])
    play.press(mid(indexOf(3, 0)), false)
    play.release('cancel', undefined, false)
    run(play, 2)
    expect(play.game.world.mole.at).toBe(1)
    expect(play.game.busy).toBe(false)
  })
})

describe('no timer starts full on load, and no level only rises', () => {
  it('a loaded game has everyone at rest: nothing counts down, nothing is in the air, and nothing sounds until it is touched', () => {
    for (const world of [layWorld(6, 'near'), roomFor('bat'), (() => { const sooty = drawn('@ae', 'eee'); sooty.mole.sooty = true; sooty.kinds[1] = 'spout'; sooty.kinds[COLS + 1] = 'open'; return sooty })()]) {
      const { play, log } = watched(world, 9)
      const { game, cast, effects } = play
      expect(game.mole).toMatchObject({ mode: 'rest', act: null, t: 0, hat: 0, cross: 0, hang: false, afloat: false, pose: null })
      expect(game.time).toBe(0)
      expect(game.motions).toEqual([])
      expect([...game.drips]).toEqual([])
      expect(cast.mammoth).toMatchObject({ rattle: 0, knot: 0, fur: 0, idle: null })
      expect(cast.mammoth.idleBeat.left + cast.mammoth.blink.left).toBe(0)
      for (const s of [cast.mammoth.ear, cast.mammoth.trunk, cast.mammoth.hind, cast.mammoth.fore, cast.mammoth.dip, cast.cage, cast.lamp, cast.mole.squash, ...cast.beasts]) expect(s).toMatchObject({ x: 0, v: 0 })
      expect(cast.mole).toMatchObject({ start: 0, nose: 0, sting: 0, idle: null })
      expect(cast.mole.idleBeat.left + cast.mole.blink.left).toBe(0)
      for (const lodger of cast.lodgers) {
        // Whoever lives there is there already: nobody arrives.
        expect(lodger).toMatchObject({ here: 1, leaving: false, blown: 0 })
        expect(lodger.start.left + lodger.idleBeat.left).toBe(0)
        expect(lodger.flinch).toMatchObject({ x: 0, v: 0 })
      }
      expect([effects.chips, effects.puffs, effects.prints, effects.shudders, effects.wisps, effects.flashes, effects.beads, effects.hops].map((list) => list.length)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
      expect(play.guidance).toEqual({ glow: 0, demo: null, demoIndex: -1 })
      // Two and a half seconds untouched: not a sound.
      run(play, 2.5)
      expect(log).toEqual([])
      expect(play.take()).toEqual({ notes: [], cut: false, save: 'no' })
    }
  })

  it('every level that a touch raises comes down again by itself', () => {
    // A clang, a knock on a gas pocket, a blast and a finger on everyone, and then ten seconds of nothing.
    const world = drawn('oeeeeee', 'oegeeee', 'oeeeeee', '@aeeeee')
    world.kinds[indexOf(0, 0)] = 'open'
    const { play } = watched(world, 9)
    play.press({ x: play.game.mole.x, y: play.game.mole.y - 30 }, false)
    play.release('tap', undefined, false)
    expect(play.game.mole.hat).toBeGreaterThan(0)
    play.press({ x: 100, y: 100 }, false)
    play.release('tap', undefined, false)
    play.press({ x: 900, y: 60 }, false)
    play.release('tap', undefined, false)
    expect(play.effects.prints.length).toBe(1)
    play.press(mid(indexOf(1, 3)), false)
    run(play, 1.2, true)
    expect(play.cast.mammoth.fur).toBeGreaterThan(0)
    expect(play.cast.mammoth.knot).toBeGreaterThan(0)
    run(play, 5, true)
    play.release('drop', undefined, false)
    play.press(mid(indexOf(0, 2)), false)
    play.release('tap', undefined, false)
    expect(play.game.mole.cross).toBeGreaterThan(0)
    run(play, 12)
    const { game, cast, effects } = play
    expect(game.mole).toMatchObject({ hat: 0, cross: 0 })
    expect(cast.mammoth).toMatchObject({ rattle: 0, knot: 0, fur: 0 })
    expect(cast.mole).toMatchObject({ start: 0, nose: 0, sting: 0 })
    for (const s of [cast.mammoth.ear, cast.mammoth.trunk, cast.mammoth.hind, cast.mammoth.fore, cast.mammoth.dip, cast.cage, cast.mole.squash]) expect(Math.abs(s.x)).toBeLessThan(0.02)
    for (const lodger of cast.lodgers) { expect(lodger.blown).toBe(0); expect(Math.abs(lodger.flinch.x)).toBeLessThan(0.02); expect(lodger.turn).toBeLessThan(3) }
    expect([effects.chips, effects.puffs, effects.prints, effects.shudders, effects.wisps, effects.flashes, effects.beads, effects.hops].map((list) => list.length)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    // The idle ladder climbs, plays its hands and fades away again.
    run(play, 120)
    expect(play.guidance).toEqual({ glow: 0, demo: null, demoIndex: -1 })
  })
})
