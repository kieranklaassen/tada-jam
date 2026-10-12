import { describe, expect, it } from 'vitest'
import { picture } from './drive'
import { HEAVY, HELD, STATES, launchBoat, play, playUntil, tapAt, visit, type Visit } from './hands'
import { LINE, PLACES } from './layout'
import { Session } from './session'

// Lessons 4 and 5. Put away at any instant, the game becomes exactly what a
// load of its save would find: nothing in the hand, in the air or on its
// way, no scene, no sound owed, the idle ladder at the bottom. And a load is
// a still picture: nothing starts, moves or sounds until the child touches.

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Reaches a state, and says what storage holds at that instant. */
function reach(name: string): { v: Visit; stored: unknown } {
  const heavy = name in HELD
  const v = visit(heavy ? HEAVY : undefined)
  ;(heavy ? HELD : STATES)[name](v)
  return { v, stored: copy(v.game.save()) }
}

const ALL = [...Object.keys(STATES), ...Object.keys(HELD)]

describe('parked equals loaded, in every state', () => {
  for (const name of ALL) {
    it(name, () => {
      const { v, stored } = reach(name)
      v.game.heard()
      v.game.park()
      const loaded = new Session(stored, null, 1)
      expect(picture(v.game.w)).toBe(picture(loaded.w))
      // The put-away loses nothing: what is saved after it is what was saved before it.
      expect(copy(v.game.save())).toEqual(stored)
      // Nothing is left in the hand, in the air, playing or owed.
      const w = v.game.w
      expect(w.hand).toBeNull()
      expect(w.finger.down).toBe(false)
      expect(w.boat.offer).toBeNull()
      expect(w.scene).toBeNull()
      expect(w.acts).toEqual([])
      expect(w.rings).toEqual([])
      expect(w.puffs).toEqual([])
      expect(w.pieces.every((piece) => piece.mode === 'rest')).toBe(true)
      expect(v.game.heard()).toEqual({ plain: [], scene: [], cut: false })
    })
  }

  it('reaches the states it names: each test above starts from the thing it says', () => {
    const seen = (name: string): Session => reach(name).v.game
    expect(seen('a making in the hand').w.hand?.on).toBe('piece')
    expect(seen('a part of the boat in the hand').w.hand?.on).toBe('piece')
    expect(seen('the boat in the hand, the gnome climbing aboard').w.scene?.name).toBe('aboard')
    expect(seen('a making on its way to the boat').w.pieces.some((piece) => piece.mode === 'fly')).toBe(true)
    expect(seen('the frog with the cap').w.acts.map((run) => run.act.id)).toContain('cap:frog')
    expect(seen('a leaf afloat with the dragonfly on it').w.pieces.some((piece) => piece.mode === 'float')).toBe(true)
    expect(seen('the boat dropping into the eddy').w.boat.mode).toBe('fall')
    expect(seen('afloat, a ring spreading').w.rings.length).toBeGreaterThan(0)
    expect(seen('the sprite blowing').w.stage.sprite.breath).toBeGreaterThan(0)
    expect(seen('the view moving on').w.journey.phase).toBe('pan')
    expect(seen('a place answering').w.journey.phase).toBe('answer')
    expect(seen('the boat lifted out of the brook').w.hand?.on).toBe('boat')
    expect(seen('coming in to moor, the lamp scene').w.scene?.name).toBe('lamp')
    expect(seen('the lamps answering').w.scene?.name).toBe('lamp')
    expect(seen('the finished pond').w.finished).toBe(true)
    expect(seen('the sun under the finger').w.hand?.on).toBe('sun')
    expect(seen('the morning scene').w.scene?.name).toBe('morning')
    expect(seen('held on the sill of the stepping stones').w.journey.holder?.id).toBe('stones:pebble')
  })
})

describe('nothing starts or sounds on load', () => {
  for (const name of ALL) {
    it(`${name}: found as left, and still until it is touched`, () => {
      const { stored } = reach(name)
      const loaded: Visit = { game: new Session(stored, null, 1), now: 0 }
      const first = picture(loaded.game.w)
      const heard: string[] = []
      for (let i = 0; i < 40; i++) {
        play(loaded, 0.25)
        const now = loaded.game.heard()
        heard.push(...now.plain.map((sound) => sound.name), ...now.scene.map((sound) => sound.name))
        expect(now.cut).toBe(false)
      }
      expect(heard).toEqual([])
      expect(picture(loaded.game.w)).toBe(first)
      expect(loaded.game.changed()).toBe('no')
      expect(copy(loaded.game.save())).toEqual(stored)
    })
  }

  it('has no timer full on load: nothing drips, rolls, swings or is half way anywhere', () => {
    for (const name of ALL) {
      const { stored } = reach(name)
      const w = new Session(stored, null, 1).w
      expect(w.boat.wet, name).toBe(0)
      expect(w.boat.groan, name).toBe(false)
      expect([w.boat.lean, w.boat.dip, w.boat.squash, w.boat.billow, w.boat.vx, w.boat.vy], name).toEqual([0, 0, 0, 0, 0, 0])
      expect(w.journey.pan, name).toBe(0)
      expect(w.journey.swing, name).toBe(0)
      expect(w.owed, name).toBe(0)
      expect(w.blown, name).toBe(false)
      for (const piece of w.pieces) expect([piece.roll, piece.squash, piece.swing, piece.knock], `${name} ${piece.kind}`).toEqual([0, 0, 0, null])
    }
  })
})

describe('the idle ladder at put-away', () => {
  it('is taken back to the bottom, so a hand that was showing is not there when the child comes back', () => {
    const v = visit()
    play(v, 6)
    expect(v.game.guidance.demo).not.toBeNull()
    expect(v.game.guidance.glow).toBeGreaterThan(0.9)
    v.game.park()
    expect(v.game.guidance).toMatchObject({ glow: 0, demo: null, demoIndex: -1 })
    play(v, 2.9)
    expect(v.game.guidance.glow).toBe(0)
    play(v, 3)
    expect(v.game.guidance.demo).not.toBeNull()
  })

  it('starts at the bottom on a load too', () => {
    const game = new Session(null, 4, 1)
    expect(game.guidance).toMatchObject({ glow: 0, demo: null })
  })
})

describe('a place does not answer twice', () => {
  /** The ids of the acts with which the place of the frame on show is answering the boat. */
  const answering = (v: Visit): string[] => v.game.w.acts.filter((run) => run.brook).map((run) => run.act.id)

  for (const [name, at] of [['in the middle of the answer', 'answer'], ['drifting on from it', 'leave']] as const) {
    it(`put away ${name}, parked or loaded: the answer is over, the boat waits, and a touch sends it on`, () => {
      const v = visit()
      launchBoat(v)
      expect(playUntil(v, (w) => w.frame === 0 && w.journey.phase === at)).toBe(true)
      if (at === 'answer') play(v, 0.3)
      const frame = v.game.w.frame, stored = copy(v.game.save())
      expect(stored).toMatchObject({ place: 'brook', journey: { reach: 0, stuck: false, done: true } })
      v.game.park()
      for (const game of [v.game, new Session(stored, null, 1)]) {
        const found: Visit = { game, now: 0 }
        expect(game.w.journey.phase, name).toBe('wait')
        // Past where the place met it, and still.
        const x = game.w.boat.x
        play(found, 3)
        expect(game.w.boat.x, name).toBe(x)
        expect(answering(found), name).toEqual([])
        // The child's touch: the boat drifts on, and the reeds say nothing more.
        tapAt(found, 1100, LINE + 60)
        let again: string[] = []
        for (let i = 0; i < 200 && game.w.frame === frame; i++) { play(found, 0.1); again = again.concat(answering(found)) }
        expect(again.filter((id) => id.startsWith(`${PLACES[frame]}:`)), name).toEqual([])
        expect(game.w.frame, name).toBe(frame + 1)
      }
    })
  }

  it('put away during an answer that would hold the boat, parked or loaded: the boat is found held at that place and waits for a ring', () => {
    const v = visit(HEAVY)
    launchBoat(v)
    // The stepping stones are answering the heavy boat, and have not stopped it on the sill yet.
    expect(playUntil(v, (w) => w.frame === 2 && w.journey.phase === 'answer', 200)).toBe(true)
    play(v, 0.2)
    expect(v.game.w.journey.stuck).toBe(false)
    const stored = copy(v.game.save())
    expect(stored).toMatchObject({ place: 'brook', journey: { reach: 2, stuck: true, done: true } })
    v.game.park()
    for (const game of [v.game, new Session(stored, null, 1)]) {
      const found: Visit = { game, now: 0 }
      expect(game.w.journey.phase).toBe('held')
      expect(game.w.journey.stuck).toBe(true)
      const x = game.w.boat.x
      play(found, 4)
      expect(game.w.journey.phase).toBe('held')
      expect(game.w.boat.x).toBe(x)
      // A ring from behind lifts it over, as it would have.
      expect(playUntil(found, (w) => w.frame === 3, 60)).toBe(true)
    }
  })

  it('put away before the place has met the boat, the place still answers it', () => {
    const v = visit()
    launchBoat(v)
    expect(playUntil(v, (w) => w.frame === 0 && w.journey.phase === 'enter')).toBe(true)
    play(v, 0.2)
    expect(copy(v.game.save())).toMatchObject({ journey: { reach: 0, done: false } })
    v.game.park()
    tapAt(v, 1100, LINE + 60)
    expect(playUntil(v, (w) => w.journey.phase === 'answer', 30)).toBe(true)
  })
})
