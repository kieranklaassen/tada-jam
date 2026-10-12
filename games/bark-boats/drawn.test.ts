import { describe, expect, it } from 'vitest'
import type { Build } from './build'
import { GNOME_REACH } from './finger'
import { answersFor } from './journey'
import { HEAVY, HELD, HULL, LAID, OVER_EDDY, carryTo, launchBoat, pick, play, playUntil, tapAt, visit, type Visit } from './hands'
import { LINE, SEAT, STONE, WATER } from './layout'
import { openWorld } from './open'
import { lieSound } from './play'
import { saveWith } from './drive'
import { setUp } from './easel'
import { fit } from './stage'
import { STEP, boatShown, buildNow, fromGnome, gnomeShown, hatShown, toSave, type World } from './world'

// What the first reader found a child would notice about touch: the boat and
// the gnome answer where the view draws them, in every state, through the
// calls the Mount makes; no build is refused; and what is let go where
// nothing can lie goes back in a move that is seen.

const acts = (w: World): string[] => w.acts.map((run) => run.act.id)
const FULL: Partial<Build> = { masts: ['twig', 'stalk'], sails: ['maple', 'birch'], deck: ['berry', 'pebble', 'cap', 'feather'] }

/** Plays on until an answer of the brook has moved the boat's picture at least `far` from where the boat is. */
function midAnswer(v: Visit, far: number): boolean {
  launchBoat(v)
  return playUntil(v, (w) => w.journey.phase === 'answer' && Math.abs(w.stage.boat.dx) > far, 120)
}

describe('the boat is touched where it is drawn', () => {
  it('held on the sill: by its hull where the picture is', () => {
    const v = visit(HEAVY)
    HELD['held on the sill of the stepping stones'](v)
    const w = v.game.w, at = boatShown(w)
    expect(w.journey.phase).toBe('held')
    v.game.press(at.x + 84, at.y - 12, false)
    expect(v.game.w.hand?.on).toBe('boat')
    v.game.pressEnd()
    expect(v.game.w.journey.phase).toBe('held')
  })

  it('in the middle of an answer: where the picture is, and not where the boat was', () => {
    const v = visit()
    expect(midAnswer(v, 150)).toBe(true)
    const w = v.game.w, at = boatShown(w), was = { x: w.boat.x, y: w.boat.y }
    expect(Math.abs(at.x - was.x)).toBeGreaterThan(150)
    // Where the boat was a moment ago there is water now.
    v.game.press(was.x + 84, was.y - 12, false)
    expect(v.game.w.hand?.on).not.toBe('boat')
    v.game.tap()
    // On the picture the finger finds the boat. The place goes on answering it until the finger pulls.
    v.game.press(at.x + 84, at.y - 12, false)
    expect(v.game.w.hand?.on).toBe('answer')
    v.game.dragStart()
    expect(v.game.w.hand?.on).toBe('boat')
    // It comes up from where it was drawn, with no jump.
    play(v, STEP, true)
    expect(Math.abs(boatShown(v.game.w).x - at.x)).toBeLessThan(4)
    expect(v.game.w.stage.boat.dx).toBe(0)
  })

  it('a ring is behind the boat when it is behind the picture of the boat', () => {
    const v = visit(HEAVY)
    HELD['held on the sill of the stepping stones'](v)
    const w = v.game.w, at = boatShown(w)
    // The sill has drawn the boat downstream of where it is. A ring between the two is behind the picture.
    expect(w.boat.x - at.x).toBeGreaterThan(50)
    tapAt(v, at.x + 35, LINE + 62)
    expect(v.game.w.rings.length).toBeGreaterThan(0)
    play(v, 1.5)
    expect(v.game.w.journey.stuck).toBe(false)
  })
})

describe('the gnome is touched over his whole drawn shape', () => {
  it('at the tip of his hat and at his chest: on the stone, afloat, and in the middle of an answer', () => {
    const stone = visit({})
    play(stone, 0.3)
    const afloat = visit()
    launchBoat(afloat)
    play(afloat, 2)
    const answer = visit()
    expect(midAnswer(answer, 150)).toBe(true)
    for (const [name, v] of [['on the stone', stone], ['afloat', afloat], ['in an answer', answer]] as const) {
      for (const up of [206, 150, 60]) {
        const at = gnomeShown(v.game.w)
        tapAt(v, at.x - 4, at.y - up)
        expect(acts(v.game.w), `${name}, ${up} above his hips`).toContain('gnome:hat')
        play(v, 0.05)
      }
    }
    expect(GNOME_REACH).toBeGreaterThanOrEqual(48)
  })

  it('leaves the stern of the hull to the hand that takes the boat', () => {
    const v = visit()
    launchBoat(v)
    play(v, 2)
    const at = boatShown(v.game.w)
    v.game.press(at.x + 84, at.y - 12, false)
    expect(v.game.w.hand?.on).toBe('boat')
  })
})

describe('the gnome is dropped on, and touched in his seat, where he is drawn', () => {
  it('a thing let go on the upper half of his hat is given to the gnome, not to the water behind it', () => {
    for (const [kind, id] of [['cap', 'cap:gnome'], ['twig', 'mast:gnome']] as const) {
      const v = visit({})
      play(v, 0.3)
      const tip = hatShown(v.game.w)
      // The stone juts into the brook: behind the top of his hat is water.
      expect(tip.y + 40).toBeLessThan(STONE.edge)
      carryTo(v, LAID[kind], { x: tip.x, y: tip.y + 40 })
      expect(acts(v.game.w), kind).toContain(id)
    }
  })

  it('seated, he is found where the hull has turned and tipped him, at his hat tip and at his chest, and not where he would sit on a level boat', () => {
    const easel = setUp()
    const hat = (easel.view as unknown as { sheets: { gnome: { hat: { sheet: unknown } } } }).sheets.gnome.hat.sheet
    const by = fit(1180, 820)
    for (const [name, tilt, face] of [['tipped bow down', -0.5, 1], ['tipped stern down', 0.45, 1], ['turned about', 0.1, -1]] as const) {
      const v = visit()
      launchBoat(v)
      play(v, 2)
      const w = v.game.w
      const level = hatShown(w)
      w.stage.boat.tilt = tilt
      w.stage.boat.face = face
      // The view stamps his hat at the place the model says its tip is, to within the hat's own size.
      easel.frame(w)
      const stamped = easel.surface.stamped.filter((each) => each.image === hat)
      expect(stamped.length, name).toBe(1)
      const drawn = { x: (stamped[0].x / 2 - by.x) / by.scale, y: (stamped[0].y / 2 - by.y) / by.scale }
      const tip = hatShown(w)
      expect(Math.hypot(drawn.x - tip.x, drawn.y - tip.y), name).toBeLessThan(90)
      expect(Math.hypot(level.x - tip.x, level.y - tip.y), name).toBeGreaterThan(GNOME_REACH + 20)
      expect(fromGnome(w, tip.x, tip.y), name).toBeLessThan(1)
      // Where his hat would be on a level boat there is air now, and the finger there does not find him.
      expect(fromGnome(w, level.x, level.y), name).toBeGreaterThan(GNOME_REACH)
      v.game.press(tip.x, tip.y + 6, false)
      expect(acts(v.game.w), name).toContain('gnome:hat')
      v.game.tap()
    }
  })
})

describe('no build is refused', () => {
  it('a making let go on the boat afloat in the eddy goes on the boat, and the place opens for it on the way', () => {
    const v = visit({ masts: ['twig', null] })
    launchBoat(v)
    play(v, 2)
    const w = v.game.w
    pick(v, LAID.cap, { x: w.boat.x, y: w.boat.y - 60 })
    expect(v.game.w.boat.offer).toEqual({ on: 'deck', index: 0 })
    v.game.dragEnd()
    play(v, 1)
    expect(buildNow(v.game.w).deck).toEqual(['cap'])
    expect(toSave(v.game.w).boat.deck).toEqual(['cap'])
    carryTo(v, LAID.maple, { x: v.game.w.boat.x - 20, y: v.game.w.boat.y - 140 })
    play(v, 1)
    expect(buildNow(v.game.w).sails).toContain('maple')
  })
})

describe('a thing let go where nothing can lie', () => {
  it('flies back to where it lay, hull or making, and is never set in the brook', () => {
    for (const kind of ['walnut', 'pebble', 'maple'] as const) {
      const v = visit({})
      play(v, 0.2)
      carryTo(v, LAID[kind], { x: 620, y: 150 })
      const piece = v.game.w.pieces.find((each) => each.kind === kind)
      expect(piece?.mode, kind).toBe('fly')
      let lowest = 0
      for (let i = 0; i < 60 && piece?.mode === 'fly'; i++) {
        const before = piece.y
        play(v, STEP)
        // A seen move: no step of it is a jump.
        lowest = Math.max(lowest, Math.abs(piece.y - before))
      }
      expect(lowest, kind).toBeLessThan(90)
      expect(piece?.mode, kind).toBe('rest')
      expect({ x: piece?.x, y: piece?.y }, kind).toEqual(LAID[kind])
    }
  })

  it('a part pulled off the boat and let go over the far bank goes back on the boat', () => {
    const v = visit({ masts: ['twig', null] })
    play(v, 0.2)
    carryTo(v, { x: SEAT.x - 40, y: SEAT.y - 110 }, { x: 500, y: 200 })
    play(v, 1.5)
    expect(buildNow(v.game.w).masts.filter(Boolean)).toEqual(['twig'])
    expect(WATER.top).toBeGreaterThan(200)
  })

  it('a boat lifted as the brook takes it and let go over the bank is back on its stone', () => {
    const v = visit()
    launchBoat(v)
    expect(playUntil(v, (w) => w.journey.phase === 'out')).toBe(true)
    play(v, 0.1)
    const at = boatShown(v.game.w)
    carryTo(v, { x: at.x + 84, y: at.y - 12 }, { x: SEAT.x + 84, y: 700 })
    play(v, 2)
    const w = v.game.w
    expect(w.boat.mode).toBe('stone')
    expect([w.boat.x, w.boat.y]).toEqual([SEAT.x, SEAT.y])
    expect(toSave(w)).toMatchObject({ place: 'bank', boat: { at: 'stone' }, journey: { reach: null } })
  })
})

describe('the knock of a thing the boat has no room for', () => {
  it('is seen and heard on one step, in its own landing sound: the thing is on the stone when it sounds, and then flies on to the moss', () => {
    const v = visit(FULL)
    play(v, 0.3)
    v.game.heard()
    carryTo(v, LAID.stem, { x: SEAT.x + 60, y: SEAT.y - 60 })
    const piece = v.game.w.pieces.find((each) => each.kind === 'stem')
    // Let go: nothing has knocked yet.
    const own = lieSound('stem')[0]
    expect(v.game.heard().plain.map((sound) => sound.name)).not.toContain(own)
    let knockedAt: { x: number; y: number } | null = null
    for (let i = 0; i < 90 && !knockedAt; i++) {
      play(v, STEP)
      if (v.game.heard().plain.some((sound) => sound.name === own)) knockedAt = { x: piece?.x ?? 0, y: piece?.y ?? 0 }
    }
    expect(knockedAt).not.toBeNull()
    expect(knockedAt?.x).toBeGreaterThan(STONE.left)
    expect(knockedAt?.x).toBeLessThan(STONE.right)
    expect(Math.abs((knockedAt?.y ?? 0) - (STONE.edge + 34))).toBeLessThan(2)
    play(v, 2)
    expect(piece?.mode).toBe('rest')
    expect(piece?.place.on).toBe('bank')
  })
})

describe('each place answers every trait, as the boat stands', () => {
  const ids = (build: Partial<Build>, frame: number): string[] => answersFor(openWorld(saveWith(build), 1), frame).acts.map((act) => act.id)

  it('two masts that do not both carry a sail get an answer of their own from the sprite and the stones, and the two-sail answer only with two sails', () => {
    const bare: Partial<Build> = { masts: ['twig', 'stem'] }
    const one: Partial<Build> = { masts: ['twig', 'stem'], sails: ['birch', null] }
    const two: Partial<Build> = { masts: ['twig', 'stem'], sails: ['birch', 'feather'] }
    for (const [frame, place] of [[1, 'sprite'], [2, 'stones']] as const) {
      for (const build of [bare, one]) {
        expect(ids(build, frame), place).toContain(`${place}:baremast`)
        expect(ids(build, frame), place).not.toContain(`${place}:twomasts`)
      }
      expect(ids(two, frame), place).toContain(`${place}:twomasts`)
      expect(ids(two, frame), place).not.toContain(`${place}:baremast`)
    }
    // The masts themselves still comb the reeds and meet the branch.
    expect(ids(bare, 0)).toContain('reeds:twomasts')
    expect(ids(bare, 3)).toContain('branch:twomasts')
    expect(OVER_EDDY.y).toBeLessThan(LINE)
    expect(HULL.x).toBeGreaterThan(SEAT.x)
  })

  it('the branch holds a boat by its broad leaf only when the leaf is on the tall mast', () => {
    const onTall = ids({ masts: ['stalk', null], sails: ['maple', null] }, 3)
    expect(onTall).toContain('branch:broad-tall')
    // The leaf on the short twig and the tall stalk beside it under a small leaf: nothing holds it.
    const beside = openWorld(saveWith({ masts: ['twig', 'stalk'], sails: ['maple', 'birch'] }), 1)
    const acts = answersFor(beside, 3).acts
    expect(acts.map((act) => act.id)).toContain('branch:broad')
    expect(acts.map((act) => act.id)).toContain('branch:stalk')
    expect(acts.map((act) => act.id)).not.toContain('branch:broad-tall')
    expect(acts.some((act) => act.holds)).toBe(false)
  })
})
