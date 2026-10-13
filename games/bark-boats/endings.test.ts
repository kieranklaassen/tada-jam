import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { Bus } from './bus'
import { carry, drain, launch, liftSun, picture, poke, run, sail, saved, worldWith } from './drive'
import { LAID_OUT, SEAT } from './layout'
import { openWorld } from './open'
import { Session } from './session'
import { step } from './tick'
import { STEP, toSave, type World } from './world'

// The three short scenes (the gnome climbs aboard, the lamp, the morning).
// What a scene changes is saved before its first beat; a touch ends it in
// the state a load would find, and silent from that frame (lesson 2); and
// left alone it ends in that same state.

const SAIL = { masts: ['twig', null], sails: ['maple', null], deck: ['berry'] } as const

/** A world in which `name` has just started: the step it started on has been played, and nothing after. */
function at(name: 'aboard' | 'lamp' | 'morning'): World {
  if (name === 'aboard') {
    const w = worldWith({})
    run(w, 0.2)
    carry(w, LAID_OUT.twig, { x: SEAT.x + 10, y: SEAT.y - 120 })
    return w
  }
  const w = worldWith(SAIL as never)
  run(w, 0.2)
  launch(w)
  expect(sail(w, (world) => world.scene?.name === 'lamp')).toBe(true)
  if (name === 'lamp') return w
  run(w, 14)
  expect(w.scene).toBeNull()
  liftSun(w)
  expect(w.scene?.name).toBe('morning')
  return w
}

const SCENES = ['aboard', 'lamp', 'morning'] as const

describe('each scene saves what it changes before its first beat', () => {
  it('the gnome is aboard in the save while he is still on the stone to the eye', () => {
    const w = at('aboard')
    expect(w.scene?.name).toBe('aboard')
    expect(toSave(w).boat.aboard).toBe(true)
    expect(w.show.aboard).toBeLessThan(1)
    expect(w.dirty).toBe('now')
  })

  it('the lamp: finished, the pond, and this boat among the boats sent before, while the boat is still coming in', () => {
    const w = at('lamp')
    const save = toSave(w)
    expect(save.finished).toBe(true)
    expect(save.place).toBe('pond')
    expect(save.journey).toEqual({ reach: 5, stuck: false, done: false })
    expect(save.pond.length).toBe(1)
    expect(save.pond[0].sails[0]).toBe('maple')
    expect(w.show.dusk).toBe(0)
    expect(w.gnomeAt).toBe('aboard')
  })

  it('the morning: a bare stone, all twelve makings laid out and the boat kept at the pond, while the sky is still dusk', () => {
    const w = at('morning')
    const save = toSave(w)
    expect(save.finished).toBe(false)
    expect(save.place).toBe('bank')
    expect(save.boat.hull).toBeNull()
    expect(save.boat.aboard).toBe(false)
    expect(save.loose.length).toBe(12)
    expect(save.pond.length).toBe(1)
    expect(save.journey).toEqual({ reach: null, stuck: false, done: false })
    expect(w.show.dusk).toBeGreaterThan(0.5)
  })

  it('saves nothing more while the scene plays: the save at its first beat is the save at its last', () => {
    for (const name of SCENES) {
      const w = at(name)
      const first = saved(w)
      run(w, 14)
      expect(w.scene, name).toBeNull()
      expect(saved(w), name).toBe(first)
    }
  })
})

describe('a scene ends where a load would find it', () => {
  it('left alone, touched at its first beat, and touched part way: one and the same picture', () => {
    for (const name of SCENES) {
      const alone = at(name)
      run(alone, 14)
      const loaded = openWorld(toSave(alone), 1)
      run(loaded, 14)
      for (const after of [0, 0.5, 1.5, 3]) {
        const touched = at(name)
        run(touched, after)
        // A touch on the bare moss, where nothing answers but the ground.
        poke(touched, 300, 792)
        expect(touched.scene, `${name} ${after}`).toBeNull()
        run(touched, 14)
        expect(picture(touched), `${name} touched after ${after}`).toBe(picture(alone))
      }
      expect(picture(loaded), `${name} loaded`).toBe(picture(alone))
    }
  })

  it('plays no scene on load, whichever beat the game was put away at', () => {
    for (const name of SCENES) {
      for (const after of [0, 0.7, 2.5]) {
        const w = at(name)
        run(w, after)
        const loaded = openWorld(toSave(w), 1)
        expect(loaded.scene, name).toBeNull()
        expect(run(loaded, 6), `${name} ${after}`).toEqual([])
      }
    }
  })
})

describe('a scene ended by a touch is silent from that frame', () => {
  it('queues no scene sound after the touch, and says so to the speaker on that frame', () => {
    for (const name of SCENES) {
      const w = at(name)
      run(w, 0.3)
      drain(w)
      w.cut = false
      poke(w, 300, 792)
      expect(w.cut, name).toBe(true)
      const later = [...drain(w), ...run(w, 14)]
      expect(later.filter((sound) => sound.scene), name).toEqual([])
    }
  })

  it('answers the first thing pressed on with the gnome climbing aboard and with nothing else; his opinion comes from the second thing on', () => {
    const opinions = (w: World): string[] => w.acts.map((run) => run.act.id).filter((id) => id.startsWith('gnome:') && id !== 'gnome:hat')
    for (const first of ['berry', 'pebble', 'twig'] as const) {
      const w = worldWith({})
      run(w, 0.2)
      carry(w, LAID_OUT[first], { x: SEAT.x, y: SEAT.y - 60 })
      expect(w.scene?.name, first).toBe('aboard')
      let seen: string[] = []
      const heard: string[] = []
      for (let i = 0; i < 4 / STEP; i++) { heard.push(...run(w, STEP).map((sound) => sound.name)); seen = seen.concat(opinions(w)) }
      expect(seen, first).toEqual([])
      for (const voice of ['ha', 'whoop', 'hm', 'mmm', 'giggle', 'grumble', 'burst', 'squeak']) expect(heard, first).not.toContain(voice)
      expect(w.gnomeAt).toBe('aboard')
      // The second thing is answered by what he thinks of it.
      carry(w, LAID_OUT.cap, { x: SEAT.x, y: SEAT.y - 60 })
      run(w, 0.4)
      expect(opinions(w).length, first).toBe(1)
    }
    // A touch that lands the scene while the first thing is still in the air changes nothing about that.
    const w = worldWith({})
    run(w, 0.2)
    carry(w, LAID_OUT.berry, { x: SEAT.x, y: SEAT.y - 60 })
    poke(w, 300, 792)
    run(w, 1)
    expect(opinions(w)).toEqual([])
  })

  it('marks every sound of a scene as the scene\'s, and no other sound', () => {
    for (const name of SCENES) {
      const w = at(name)
      drain(w)
      const heard = run(w, 14)
      expect(heard.filter((sound) => sound.scene).length, name).toBeGreaterThan(1)
      // Beside the scene only the thing that started it is heard: the twig landing in its hole. His opinion is not: he is not aboard to have one.
      if (name !== 'aboard') for (const sound of heard) expect(sound.scene, `${name} ${sound.name}`).toBe(true)
    }
    const w = worldWith({})
    run(w, 0.2)
    carry(w, LAID_OUT.berry, { x: 150, y: 420 })
    for (const sound of [...drain(w), ...run(w, 4)]) expect(sound.scene, sound.name).toBe(false)
  })

  it('hands the session the cut with the touch that made it, once', () => {
    const game = new Session(null, null, 1)
    game.frame(0.2, 0.2, false)
    game.press(SEAT.x + 84, SEAT.y - 12, false)
    game.dragStart()
    game.dragMove(SEAT.x + 84, SEAT.y - 60)
    game.frame(STEP, 0.3, true)
    expect(game.w.scene?.name).toBe('aboard')
    game.dragEnd()
    game.heard()
    game.press(300, 792, false)
    const heard = game.heard()
    expect(heard.cut).toBe(true)
    expect(heard.scene).toEqual([])
    game.tap()
    expect(game.heard().cut).toBe(false)
  })
})

describe('the speaker', () => {
  type FakeGain = { gain: { value: number }; connected: boolean; connect(): void; disconnect(): void }
  const context = (): { currentTime: number; made: FakeGain[]; createGain(): FakeGain } => {
    const made: FakeGain[] = []
    return {
      currentTime: 0, made,
      createGain() {
        const gain: FakeGain = { gain: { value: 1 }, connected: false, connect() { this.connected = true }, disconnect() { this.connected = false } }
        made.push(gain)
        return gain
      },
    }
  }
  const quiet: Voice = () => {}
  const play = (bus: Bus, ctx: ReturnType<typeof context>, scene: boolean): void => bus.through(quiet, 1, scene)(ctx as unknown as AudioContext, {} as AudioNode, ctx.currentTime)

  it('shuts the scene\'s sounds on a cut and leaves the rest ringing', () => {
    const bus = new Bus(), ctx = context()
    play(bus, ctx, true)
    play(bus, ctx, false)
    bus.cutScene()
    expect(ctx.made[0]).toMatchObject({ gain: { value: 0 }, connected: false })
    expect(ctx.made[1]).toMatchObject({ gain: { value: 1 }, connected: true })
    expect(bus.open).toEqual({ scene: 0, plain: 1 })
  })

  it('closes every sound at put-away', () => {
    const bus = new Bus(), ctx = context()
    play(bus, ctx, true)
    play(bus, ctx, false)
    play(bus, ctx, false)
    bus.cutAll()
    for (const gain of ctx.made) expect(gain).toMatchObject({ gain: { value: 0 }, connected: false })
    expect(bus.open).toEqual({ scene: 0, plain: 0 })
  })

  it('lets go of a line that has rung out, with no timer', () => {
    const bus = new Bus(), ctx = context()
    play(bus, ctx, false)
    ctx.currentTime = 5
    play(bus, ctx, false)
    expect(bus.open.plain).toBe(1)
    expect(ctx.made[0].connected).toBe(false)
  })

  it('steps the world no further for a sound: a cut world is the same world', () => {
    const w = at('aboard')
    const before = saved(w)
    poke(w, 300, 792)
    step(w, STEP)
    expect(saved(w)).toBe(before)
  })
})
