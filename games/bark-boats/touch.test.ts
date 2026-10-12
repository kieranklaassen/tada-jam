import { describe, expect, it } from 'vitest'
import { picture } from './drive'
import { HULL, OVER_EDDY, launchBoat, partSpot, pick, play, playUntil, tapAt, visit, type Visit } from './hands'
import { BIRD_AT_BRANCH, FROG, FROG_AT_FALL, FROG_AT_REEDS, KINGFISHER, LAID_OUT, SPRITE, SUN } from './layout'
import { setUp } from './easel'
import { looseAt } from './finger'
import { openWorld } from './open'
import { freshSave } from './save'
import { fit } from './stage'
import { boatShown, gnomeSpot, type World } from './world'

// Lesson 3, second half: a thing is touched where it is drawn, in every
// state. Lesson 6: a touch the system takes away never acts for the child.
// Lesson 14: a tap may last, and a character's own doing never takes the
// idle ladder back.

const acts = (w: World): string[] => w.acts.map((run) => run.act.id)
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** A visit with the boat found at place `reach` of the brook. */
const onBrook = (reach: number): Visit => visit(undefined, { place: 'brook', journey: { reach, stuck: false }, boat: { at: 'eddy', x: 500, aboard: true } as never })

describe('a thing is touched where it is drawn', () => {
  it('each of the folk, in every frame they are in, at the middle of the body the view draws', () => {
    // The view draws the frog's body 82 above his seat, the kingfisher's 72 above his feet, the sprite's 86 above the water.
    const cases: [string, Visit, { x: number; y: number }, string][] = [
      ['the frog on his stone', visit(), { x: FROG.x, y: FROG.y - 82 }, 'frog:croak'],
      ['the frog swimming among the reeds, sunk to his eyes', onBrook(0), { x: FROG_AT_REEDS.x, y: FROG_AT_REEDS.y - 30 }, 'frog:croak'],
      ['the frog on his rock under the fall', onBrook(4), { x: FROG_AT_FALL.x, y: FROG_AT_FALL.y - 82 }, 'frog:croak'],
      ['the kingfisher on the pine', visit(), { x: KINGFISHER.x + 4, y: KINGFISHER.y - 72 }, 'bird:rattle'],
      ['the kingfisher on his low branch', onBrook(3), { x: BIRD_AT_BRANCH.x + 4, y: BIRD_AT_BRANCH.y - 72 }, 'bird:rattle'],
      ['the sprite by the bank', visit(), { x: SPRITE.x - 4, y: SPRITE.y - 86 }, 'sprite:blow'],
      ['the sprite at her own place', onBrook(1), { x: SPRITE.x - 4, y: SPRITE.y - 86 }, 'sprite:blow'],
    ]
    for (const [name, v, at, act] of cases) {
      play(v, 0.3)
      tapAt(v, at.x, at.y)
      expect(acts(v.game.w), name).toContain(act)
    }
  })

  it('the folk where an act has moved them, and not where they were', () => {
    // The view draws the frog where his rig has moved him: every stamp of him is that far up.
    const easel = setUp(1180, 820, 2), by = fit(1180, 820)
    const still = visit(), moved = visit()
    for (const v of [still, moved]) play(v, 0.3)
    moved.game.w.stage.frog.dy = -120
    easel.frame(still.game.w)
    const before = easel.surface.stamped.map((stamped) => `${stamped.w}:${Math.round(stamped.x)}:${Math.round(stamped.y)}`)
    easel.frame(moved.game.w)
    const shifted = easel.surface.stamped.filter((stamped) => before.includes(`${stamped.w}:${Math.round(stamped.x)}:${Math.round(stamped.y + 120 * by.scale * 2)}`) && !before.includes(`${stamped.w}:${Math.round(stamped.x)}:${Math.round(stamped.y)}`))
    expect(shifted.length).toBeGreaterThanOrEqual(2)
    // The finger finds him there, and not where he was.
    tapAt(moved, FROG.x, FROG.y - 82 + 70)
    expect(acts(moved.game.w)).not.toContain('frog:croak')
    tapAt(moved, FROG.x, FROG.y - 82 - 120 - 70)
    expect(acts(moved.game.w)).toContain('frog:croak')
    // Left where he sits, the same two touches answer the other way round.
    tapAt(still, FROG.x, FROG.y - 82 - 120 - 70)
    expect(acts(still.game.w)).not.toContain('frog:croak')
    tapAt(still, FROG.x, FROG.y - 82 + 70)
    expect(acts(still.game.w)).toContain('frog:croak')
  })

  it('gives every load on the deck a finger\'s room of its own, 48 px each way at 1024 by 768, with the other loads and two bare masts beside it', () => {
    const scale = fit(1024, 768).scale
    for (const hull of ['bark', 'pod', 'walnut'] as const) {
      const v = visit({ hull, masts: ['twig', 'stem'], deck: ['berry', 'cap', 'pebble'] })
      play(v, 0.3)
      const taken = (x: number, y: number): string | null => {
        v.game.press(x, y, false)
        const hand = v.game.w.hand
        v.game.pressEnd()
        // A press that found the hull lifted the boat a little: it is let settle on its stone again.
        if (hand?.on !== 'piece') play(v, 0.8)
        return hand?.on === 'piece' ? hand.piece.kind : null
      }
      for (const kind of ['berry', 'cap', 'pebble'] as const) {
        const at = partSpot(v, kind)
        expect(taken(at.x, at.y), `${kind} on the ${hull}`).toBe(kind)
        for (const [dx, dy, name] of [[1, 0, 'across'], [0, 1, 'down']] as const) {
          let run = 1
          for (const way of [1, -1]) {
            let i = 1
            while (i < 120 && taken(at.x + way * i * dx, at.y + way * i * dy) === kind) i++
            run += i - 1
          }
          expect(run * scale, `${kind} on the ${hull}, ${name}`).toBeGreaterThanOrEqual(48)
        }
      }
      // The bare masts are still taken; deck.test.ts holds them along their whole length.
      const mast = partSpot(v, 'twig')
      expect(taken(mast.x, mast.y - 20), `the twig on the ${hull}`).toBe('twig')
    }
  })

  it('gives every making on a fresh bank a finger\'s room of its own, 48 px each way, on a tablet lying and standing', () => {
    for (const age of [4, 8]) {
      const w = openWorld(freshSave(age), 1)
      for (const [width, height] of [[1024, 768], [820, 1180]] as const) {
        const scale = fit(width, height).scale
        for (const piece of w.pieces.filter((each) => each.place.on === 'bank')) {
          // The run of points through its middle that take this thing and no other, across and down.
          for (const [dx, dy, name] of [[1, 0, 'across'], [0, 1, 'down']] as const) {
            let run = 1
            for (const way of [1, -1]) {
              let i = 1
              while (i < 200 && looseAt(w, piece.x + way * i * dx, piece.y + way * i * dy) === piece) i++
              run += i - 1
            }
            expect(run * scale, `${piece.kind} ${name} at ${width} by ${height}, age ${age}`).toBeGreaterThanOrEqual(48)
          }
        }
      }
    }
  })

  it('the gnome on the stone, aboard on the stone, afloat and on the brook', () => {
    const stone = visit({})
    play(stone, 0.3)
    const at = gnomeSpot(stone.game.w)
    tapAt(stone, at.x, at.y - 70)
    expect(acts(stone.game.w)).toContain('gnome:hat')

    const afloat = visit()
    launchBoat(afloat)
    // He is still climbing aboard: the scene is let run out.
    play(afloat, 2)
    const seat = gnomeSpot(afloat.game.w)
    expect(Math.abs(seat.x - afloat.game.w.boat.x)).toBeLessThan(160)
    tapAt(afloat, seat.x, seat.y - 70)
    expect(acts(afloat.game.w)).toContain('gnome:hat')

    const brook = onBrook(2)
    play(brook, 0.3)
    const there = gnomeSpot(brook.game.w)
    tapAt(brook, there.x, there.y - 70)
    expect(acts(brook.game.w)).toContain('gnome:hat')
  })

  it('every making where it lies, and every part of the boat where it stands', () => {
    const v = visit()
    play(v, 0.3)
    for (const kind of ['walnut', 'pod', 'stalk', 'stem', 'birch', 'feather', 'cap', 'pebble'] as const) {
      v.game.press(LAID_OUT[kind].x, LAID_OUT[kind].y, false)
      const hand = v.game.w.hand
      expect(hand?.on === 'piece' ? hand.piece.kind : null, kind).toBe(kind)
      v.game.tap()
      play(v, 0.4)
    }
    for (const kind of ['maple', 'berry'] as const) {
      const at = partSpot(v, kind)
      v.game.press(at.x, at.y, false)
      const hand = v.game.w.hand
      expect(hand?.on === 'piece' ? hand.piece.kind : null, kind).toBe(kind)
      v.game.tap()
      play(v, 0.4)
    }
  })

  it('the boat by its hull: on the stone, afloat, and held at a place of the brook', () => {
    const v = visit()
    play(v, 0.3)
    v.game.press(HULL.x, HULL.y, false)
    expect(v.game.w.hand?.on).toBe('boat')
    v.game.tap()
    play(v, 1)
    launchBoat(v)
    const w = v.game.w
    v.game.press(w.boat.x + 84, w.boat.y - 12, false)
    expect(v.game.w.hand?.on).toBe('boat')
    // Where the boat is not, the water answers.
    v.game.tap()
    play(v, 0.5)
    v.game.press(w.boat.x + 300, w.boat.y - 12, false)
    expect(v.game.w.hand?.on).toBe('water')
    v.game.tap()
  })

  it('the sun at the finished pond, where it rests and while it is lifted', () => {
    const v = visit()
    launchBoat(v)
    expect(playUntil(v, (w) => w.finished && !w.scene)).toBe(true)
    v.game.press(SUN.x, SUN.pond, false)
    expect(v.game.w.hand?.on).toBe('sun')
    v.game.dragStart()
    v.game.dragMove(SUN.x, SUN.pond - 40)
    play(v, 0.1, true)
    expect(v.game.w.show.sun).toBe(40)
    // Let go before it is lifted clear, it sinks back, and nothing else has changed.
    v.game.dragEnd()
    play(v, 1)
    expect(v.game.w.show.sun).toBe(0)
    expect(v.game.w.finished).toBe(true)
  })
})

describe('a touch that is taken away never acts for the child', () => {
  /** Whatever is in the hand in `state`, a cancel leaves the game as it was before the finger landed, once things have settled. */
  function cancelled(setUp: (v: Visit) => void, hold: (v: Visit) => void): { before: string; after: string; v: Visit } {
    const v = visit()
    setUp(v)
    play(v, 1.5)
    const before = picture(v.game.w)
    hold(v)
    v.game.dragCancel()
    play(v, 3)
    return { before, after: picture(v.game.w), v }
  }

  it('a making carried over the frog goes back where it lay, and the frog gets nothing', () => {
    const { before, after, v } = cancelled(() => {}, (each) => pick(each, LAID_OUT.cap, { x: 150, y: 420 }))
    expect(after).toBe(before)
    expect(acts(v.game.w)).toEqual([])
  })

  it('a making carried over the water does not fall in', () => {
    const { before, after } = cancelled(() => {}, (each) => pick(each, LAID_OUT.pebble, { x: 900, y: 470 }))
    expect(after).toBe(before)
  })

  it('a part pulled off the boat goes back on it, and the gnome has no new opinion', () => {
    const { before, after, v } = cancelled((each) => { tapAt(each, HULL.x, HULL.y); play(each, 3) }, (each) => pick(each, partSpot(each, 'maple'), { x: 800, y: 420 }))
    expect(after).toBe(before)
    expect(acts(v.game.w)).toEqual([])
  })

  it('the boat carried over the water goes back on its stone', () => {
    const { before, after } = cancelled((each) => { tapAt(each, HULL.x, HULL.y); play(each, 3) }, (each) => pick(each, HULL, OVER_EDDY))
    expect(after).toBe(before)
  })

  it('the boat lifted afloat goes back into the eddy where it was', () => {
    const { before, after } = cancelled((each) => launchBoat(each), (each) => pick(each, { x: each.game.w.boat.x + 84, y: each.game.w.boat.y - 12 }, { x: 392, y: 560 }))
    expect(after).toBe(before)
  })

  it('a tap, a press taken away or a cancelled lift on the boat as the brook takes it changes nothing and saves nothing', () => {
    for (const end of ['tap', 'pressEnd', 'dragCancel'] as const) {
      const v = visit()
      launchBoat(v)
      expect(playUntil(v, (w) => w.journey.phase === 'out')).toBe(true)
      play(v, 0.1)
      const stored = copy(v.game.save())
      expect(stored).toMatchObject({ place: 'brook', journey: { reach: 0 } })
      v.game.changed()
      const at = boatShown(v.game.w)
      if (end === 'dragCancel') pick(v, { x: at.x + 84, y: at.y - 12 }, { x: at.x + 60, y: 300 })
      else v.game.press(at.x + 84, at.y - 12, false)
      expect(v.game.w.hand?.on, end).toBe('boat')
      v.game[end]()
      expect(v.game.w.journey.phase, end).toBe('out')
      expect(v.game.w.where, end).toBe('brook')
      expect(v.game.changed(), end).toBe('no')
      expect(copy(v.game.save()), end).toEqual(stored)
      // And the brook takes it on to the reeds, as it was doing.
      expect(playUntil(v, (w) => w.frame === 0, 20), end).toBe(true)
    }
  })

  it('a boat held at the pond is not sent on by a cancel: the ending is the child\'s to start', () => {
    const v = visit({}, { place: 'brook', journey: { reach: 5, stuck: true }, boat: { at: 'eddy', x: 500, aboard: true } as never })
    play(v, 1)
    expect(v.game.w.journey.phase).toBe('held')
    const stored = copy(v.game.save())
    pick(v, { x: v.game.w.boat.x + 84, y: v.game.w.boat.y - 12 }, { x: 300, y: 300 })
    v.game.dragCancel()
    play(v, 4)
    expect(v.game.w.finished).toBe(false)
    expect(copy(v.game.save())).toEqual(stored)
  })

  it('a press that is taken away is not a tap: the sun stays down and the frog stays quiet', () => {
    const v = visit()
    play(v, 0.3)
    v.game.press(LAID_OUT.cap.x, LAID_OUT.cap.y, false)
    v.game.pressEnd()
    play(v, 1)
    expect(v.game.w.hand).toBeNull()
    expect(v.game.w.pieces.find((piece) => piece.kind === 'cap')?.place).toMatchObject({ on: 'bank', x: LAID_OUT.cap.x, y: LAID_OUT.cap.y })
  })

  it('leaves no flag behind: after any ending of a touch the hand is empty and nothing is offered a place', () => {
    for (const end of ['tap', 'pressEnd', 'dragEnd', 'dragCancel'] as const) {
      const v = visit()
      play(v, 0.3)
      pick(v, LAID_OUT.cap, { x: 400, y: 480 })
      expect(v.game.w.boat.offer, end).not.toBeNull()
      v.game[end]()
      expect(v.game.w.hand, end).toBeNull()
      expect(v.game.w.finger.down, end).toBe(false)
      expect(v.game.w.boat.offer, end).toBeNull()
    }
  })
})

describe('a tap may last', () => {
  it('a slow tap of 0.45 s on the frog is the same croak as a quick one', () => {
    const quick = visit(), slow = visit()
    for (const v of [quick, slow]) play(v, 0.3)
    tapAt(quick, FROG.x, FROG.y - 82)
    slow.game.press(FROG.x, FROG.y - 82, false)
    expect(acts(slow.game.w)).toEqual(acts(quick.game.w))
    play(slow, 0.45, true)
    slow.game.tap()
    play(quick, 0.45)
    play(quick, 2); play(slow, 2)
    expect(picture(slow.game.w)).toBe(picture(quick.game.w))
  })

  it('a slow tap on a making lifts it and sets it down where it was', () => {
    const v = visit()
    play(v, 0.3)
    const before = picture(v.game.w)
    v.game.press(LAID_OUT.pebble.x, LAID_OUT.pebble.y, false)
    play(v, 0.45, true)
    v.game.tap()
    play(v, 1)
    expect(picture(v.game.w)).toBe(before)
  })
})
