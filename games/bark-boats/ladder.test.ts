import { describe, expect, it } from 'vitest'
import { MAKINGS } from './build'
import { picture } from './drive'
import { HEAVY, HELD, LAID, play, tapAt, visit, type Visit } from './hands'
import { GNOME_REACH } from './finger'
import { BIRD_AT_BRANCH, CORNER, FROG, FROG_AT_FALL, FROG_AT_REEDS, GNOME, HOME, KINGFISHER, LAID_OUT, POND, SEAT, SPRITE, SUN, WASHED } from './layout'
import { moving } from './open'
import { CORNER as OVERLAY_CORNER } from './overlay'
import { startAct } from './play'
import { croak, OPINIONS } from './pokeActs'
import { fit } from './stage'

// Lesson 7: the grown-up's corner answers nothing and leaves the idle
// ladder where it is, and nothing a child touches lies under the jam's home
// control or under that corner at any surface size. Lesson 14: a
// character's own doing never takes the ladder back.

const idle = (v: Visit, seconds: number): void => play(v, seconds)

describe('the grown-up\'s corner', () => {
  it('answers nothing: no sound, nothing in the hand, nobody looks, and the picture is as it was', () => {
    const v = visit()
    idle(v, 1)
    v.game.heard()
    const before = picture(v.game.w), eyes = { ...v.game.w.stage.gnome }
    v.game.press(1170, 10, true)
    play(v, 0.5, true)
    v.game.dragStart()
    v.game.dragMove(600, 500)
    play(v, 0.2, true)
    v.game.dragEnd()
    expect(v.game.heard()).toEqual({ plain: [], scene: [], cut: false })
    expect(picture(v.game.w)).toBe(before)
    expect(v.game.w.hand).toBeNull()
    expect(v.game.w.finger.down).toBe(false)
    expect([v.game.w.stage.gnome.lookX, v.game.w.stage.gnome.lookY]).toEqual([eyes.lookX, eyes.lookY])
    expect(v.game.changed()).toBe('no')
  })

  it('leaves the idle ladder where it is, however long the finger rests there', () => {
    const v = visit()
    idle(v, 6)
    expect(v.game.guidance.demo).not.toBeNull()
    v.game.press(1170, 10, true)
    play(v, 1.2, true)
    expect(v.game.guidance.demo).not.toBeNull()
    expect(v.game.guidance.glow).toBe(1)
    v.game.pressEnd()
    // A touch anywhere else takes it back at once.
    v.game.press(300, 792, false)
    v.game.tap()
    play(v, 0.1)
    expect(v.game.guidance).toMatchObject({ glow: 0, demo: null })
  })

  it('ends no scene and wakes no waiting boat', () => {
    const scene = visit()
    play(scene, 0.3)
    scene.game.press(SEAT.x + 84, SEAT.y - 12, false)
    scene.game.tap()
    expect(scene.game.w.scene?.name).toBe('aboard')
    scene.game.press(1170, 10, true)
    scene.game.tap()
    expect(scene.game.w.scene?.name).toBe('aboard')

    const brook = visit(undefined, { place: 'brook', journey: { reach: 2, stuck: false }, boat: { at: 'eddy', x: 500, aboard: true } as never })
    play(brook, 0.5)
    brook.game.press(1170, 10, true)
    brook.game.tap()
    play(brook, 2)
    expect(brook.game.w.journey.phase).toBe('wait')
  })

  it('is the same corner the overlay keeps', () => {
    expect(CORNER).toBe(OVERLAY_CORNER)
  })
})

/** Every spot a child's finger is asked to, in any frame: where it is and how far round it a touch counts. */
function touched(): { name: string; x: number; y: number; r: number }[] {
  const all: { name: string; x: number; y: number; r: number }[] = []
  for (const [kind, at] of Object.entries(LAID_OUT)) all.push({ name: kind, ...at, r: MAKINGS[kind as keyof typeof LAID_OUT].reach })
  for (const at of WASHED) all.push({ name: 'washed ashore', ...at, r: 60 })
  for (const [name, home] of Object.entries({ frog: FROG, 'frog at the reeds': FROG_AT_REEDS, 'frog at the fall': FROG_AT_FALL, kingfisher: KINGFISHER, 'kingfisher on the branch': BIRD_AT_BRANCH, sprite: SPRITE })) all.push({ name, ...home.tap })
  // The gnome from his belt to the tip of his hat, on the stone and on his pad.
  for (let up = -6; up <= 214; up += 44) {
    all.push({ name: 'gnome on the stone', x: GNOME.x - 4, y: GNOME.y - 45 - up, r: GNOME_REACH })
    all.push({ name: 'gnome on his pad', x: POND.pad.x - 4, y: POND.pad.y - 45 - up, r: GNOME_REACH })
  }
  all.push({ name: 'sun at rest', x: SUN.x, y: SUN.pond, r: SUN.tap })
  all.push({ name: 'sun lifted', x: SUN.x, y: SUN.pond - SUN.lift - 30, r: SUN.r })
  // The boat on the stone, to the top of the tallest mast with a sail on it.
  for (let y = SEAT.y; y > SEAT.y - MAKINGS.stalk.length - 70; y -= 40) all.push({ name: 'boat on the stone', x: SEAT.x, y, r: 60 })
  return all
}

const SIZES: readonly [number, number][] = [[1180, 820], [1024, 768], [1366, 1024], [2388, 1668], [1194, 834], [844, 390], [667, 375], [568, 320], [1600, 700], [800, 600], [1280, 720]]

describe('nothing a child touches lies under the shell\'s controls', () => {
  it('knows where the jam puts its home control: 48 px round, 10 px from the top, in the middle', () => {
    expect(HOME).toEqual({ x: 590, y: 34, r: 24 })
  })

  it('keeps every touched spot clear of the home control at every surface size', () => {
    for (const [width, height] of SIZES) {
      const by = fit(width, height)
      // The control is laid out in the surface's pixels; this is where it lies on the stage.
      const home = { x: (width / 2 - by.x) / by.scale, y: (10 + HOME.r - by.y) / by.scale, r: HOME.r / by.scale }
      for (const spot of touched()) {
        const gap = Math.hypot(spot.x - home.x, spot.y - home.y) - spot.r - home.r
        expect(gap, `${spot.name} at ${width}x${height}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps every touched spot clear of the grown-up\'s corner at every surface size', () => {
    for (const [width, height] of SIZES) {
      const by = fit(width, height)
      const left = (width - CORNER - by.x) / by.scale, bottom = (CORNER - by.y) / by.scale
      for (const spot of touched()) {
        const inside = spot.x + spot.r > left && spot.y - spot.r < bottom
        expect(inside, `${spot.name} at ${width}x${height}`).toBe(false)
      }
    }
  })
})

describe('a character\'s own doing never takes the idle ladder back', () => {
  it('a croak, a flinch or an opinion that starts by itself is not something on its way', () => {
    const v = visit()
    idle(v, 3.6)
    const glow = v.game.guidance.glow
    expect(glow).toBeGreaterThan(0)
    startAct(v.game.w, croak)
    startAct(v.game.w, OPINIONS.hm)
    expect(moving(v.game.w)).toBe(false)
    idle(v, 0.4)
    expect(v.game.w.acts.length).toBeGreaterThan(0)
    expect(v.game.guidance.glow).toBeGreaterThan(glow)
    idle(v, 1.2)
    expect(v.game.guidance.demo).not.toBeNull()
  })

  it('counts from the child\'s tap, and not from the end of the croak it started', () => {
    const v = visit()
    idle(v, 1)
    tapAt(v, FROG.x, FROG.y - 82)
    idle(v, 0.2)
    expect(v.game.w.acts.map((run) => run.act.id)).toContain('frog:croak')
    idle(v, 3.1)
    expect(v.game.guidance.glow).toBeGreaterThan(0)
  })

  it('waits for a thing the child sent on its way, and no longer', () => {
    const v = visit()
    idle(v, 1)
    v.game.press(LAID.cap.x, LAID.cap.y, false)
    v.game.dragStart()
    v.game.dragMove(150, 420)
    v.game.dragEnd()
    idle(v, 0.5)
    expect(moving(v.game.w)).toBe(true)
    let landed = 0
    while (moving(v.game.w) && landed < 20) { idle(v, 0.1); landed += 0.1 }
    expect(moving(v.game.w)).toBe(false)
    idle(v, 2.8)
    expect(v.game.guidance.glow).toBe(0)
    idle(v, 0.6)
    expect(v.game.guidance.glow).toBeGreaterThan(0)
  })

  it('shows the hand to a child whose boat is held at a place, while the boat swings there by itself', () => {
    const v = visit(HEAVY)
    HELD['held on the sill of the stepping stones'](v)
    expect(moving(v.game.w)).toBe(false)
    idle(v, 6)
    expect(v.game.guidance.demo).not.toBeNull()
    expect(v.game.w.journey.phase).toBe('held')
  })

  it('shows nothing while the brook has the boat on its way', () => {
    const v = visit()
    play(v, 0.3)
    v.game.press(SEAT.x + 84, SEAT.y - 12, false)
    v.game.dragStart()
    v.game.dragMove(560, 440)
    v.game.dragEnd()
    for (let t = 0; t < 12 && v.game.w.frame < 1; t += 0.25) {
      idle(v, 0.25)
      if (v.game.w.boat.mode === 'afloat') tapAt(v, v.game.w.boat.x + 215, 542)
      if (v.game.w.journey.phase === 'pan' || v.game.w.journey.phase === 'answer') expect(v.game.guidance.glow).toBe(0)
    }
  })
})
