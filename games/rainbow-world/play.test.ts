import { describe, expect, it } from 'vitest'
import { named, run } from './drive'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW } from './guidance'
import type { Point } from './input'
import { CORNER } from './overlay'
import { PIECES, PIECE_IDS, type PieceId } from './pieces'
import { Play } from './play'
import { fit } from './stage'
import { stand } from './stack'
import { World, firstPlaces } from './world'
import { CAT } from './layout'

const CAT_AT = { x: CAT.x, y: CAT.y - 40 }

// Fingers and frames, as the Mount hands them on (play.ts). Held here: the grown-up's corner answers nothing
// and does not count as play; the browser taking a finger away sets off nothing; only a finger takes the idle
// ladder back; a put-away takes it back too; and a slow tap of the youngest is still a tap.

const SIZES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const

function playAt(world: World, size: { width: number; height: number }): { play: Play; px: (stage: Point) => Point } {
  const by = fit(size.width, size.height)
  return {
    play: new Play(world, (at) => ({ x: (at.x - by.x) / by.scale, y: (at.y - by.y) / by.scale })),
    px: (stage) => ({ x: stage.x * by.scale + by.x, y: stage.y * by.scale + by.y }),
  }
}
const frames = (play: Play, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += 1 / 60) play.frame(1 / 60) }
const homeOf = (id: PieceId): Point => ({ x: PIECES[id].home.x, y: PIECES[id].home.y - PIECES[id].height * 0.5 })

describe.each(SIZES)('fingers and frames on a surface of $width by $height', (size) => {
  it('answers nothing in the top right corner, and a touch there does not take the idle ladder back', () => {
    const world = new World(firstPlaces(true)), { play } = playAt(world, size)
    frames(play, IDLE_BEFORE_GLOW + 1)
    const before = { places: world.places(), changes: world.changes }
    for (const at of [{ x: size.width - 4, y: 4 }, { x: size.width - CORNER + 2, y: CORNER - 2 }, { x: size.width - 30, y: 40 }]) {
      play.down(1, at, 0, size.width)
      play.move(1, { x: at.x - 200, y: at.y + 300 }, size.width)
      play.up(1, { x: at.x - 200, y: at.y + 300 }, 100, size.width)
    }
    expect(world.takeSounds()).toEqual([])
    expect(world.hand).toBeNull()
    expect({ places: world.places(), changes: world.changes }).toEqual(before)
    // The glow that had come up is still up: the corner did not reset it.
    expect(play.frame(1 / 60).glow).toBeGreaterThan(0)
    // Just outside the corner the pane answers as the pane.
    play.down(2, { x: size.width - CORNER - 6, y: CORNER + 6 }, 200, size.width)
    expect(named(world.takeSounds())).toEqual(['tink'])
    expect(play.frame(1 / 60).glow).toBe(0)
  })

  it('never acts for the child when the browser takes the finger away', () => {
    // Mid-press: the thing was lifted on the press, which was the child's; the cancel adds nothing.
    const pressed = new World(), a = playAt(pressed, size)
    a.play.down(1, a.px(homeOf('doll-round')), 0, size.width)
    const afterPress = { hand: pressed.hand?.id, places: pressed.places(), changes: pressed.changes }
    pressed.takeSounds()
    a.play.cancel(1, size.width)
    expect(pressed.takeSounds()).toEqual([])
    expect({ hand: pressed.hand?.id, places: pressed.places(), changes: pressed.changes }).toEqual(afterPress)
    // Mid-drag: the thing goes back where it came from, with no drop, no pair and no sound.
    const dragged = new World(firstPlaces(true)), b = playAt(dragged, size)
    const before = dragged.places(), changes = dragged.changes
    b.play.down(1, b.px(homeOf('horse')), 0, size.width)
    b.play.move(1, b.px({ x: 700, y: 520 }), size.width)
    frames(b.play, 0.3)
    dragged.takeSounds()
    b.play.cancel(1, size.width)
    expect(dragged.takeSounds()).toEqual([])
    expect(dragged.hand).toBeNull()
    expect(dragged.scene).toBeNull()
    frames(b.play, 2)
    expect(dragged.takeSounds()).toEqual([])
    expect({ places: dragged.places(), changes: dragged.changes }).toEqual({ places: before, changes })
  })

  it('takes the idle ladder back for a finger, and not for what a character or an answer does by itself', () => {
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    play.down(1, px(homeOf('doll-round')), 0, size.width)
    play.up(1, px(homeOf('doll-round')), 80, size.width)
    play.down(1, px({ x: 480, y: 560 }), 200, size.width)
    play.up(1, px({ x: 480, y: 560 }), 280, size.width)
    expect(world.scene).toBeNull()
    // The doll lands, knocks, wobbles and looks about, and its neighbour hops; none of it is a finger.
    let glowAt = -1, demoAt = -1
    for (let t = 0; t < 9; t += 1 / 60) {
      const guidance = play.frame(1 / 60)
      if (glowAt < 0 && guidance.glow > 0) glowAt = t
      if (demoAt < 0 && guidance.demo !== null) demoAt = t
    }
    expect(glowAt).toBeGreaterThan(IDLE_BEFORE_GLOW - 0.1)
    expect(glowAt).toBeLessThan(IDLE_BEFORE_GLOW + 0.1)
    expect(demoAt).toBeGreaterThan(IDLE_BEFORE_DEMO - 0.1)
    expect(demoAt).toBeLessThan(IDLE_BEFORE_DEMO + 0.1)
  })

  it('does not count a scene as idle: the idle stretch starts when the scene has ended, and the hand comes no sooner than its first step after that', () => {
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    play.down(1, px(homeOf('doll-round')), 0, size.width)
    play.up(1, px(homeOf('doll-round')), 80, size.width)
    const doll = stand(world.pieces, world.piece('doll-small'))
    play.down(1, px({ x: doll.x, y: doll.y - 60 }), 200, size.width)
    play.up(1, px({ x: doll.x, y: doll.y - 60 }), 280, size.width)
    expect(world.scene).not.toBeNull()
    // The tower bows for more than four seconds. Nothing is offered while it plays, and the wait begins when it is over.
    let endedAt = -1, glowAt = -1, demoAt = -1
    for (let t = 0; t < 14; t += 1 / 60) {
      const guidance = play.frame(1 / 60)
      if (world.scene) expect([guidance.glow, guidance.demo]).toEqual([0, null])
      else if (endedAt < 0) endedAt = t
      if (glowAt < 0 && guidance.glow > 0) glowAt = t
      if (demoAt < 0 && guidance.demo !== null) demoAt = t
    }
    expect(endedAt).toBeGreaterThan(4)
    expect(glowAt - endedAt).toBeGreaterThan(IDLE_BEFORE_GLOW - 0.1)
    expect(glowAt - endedAt).toBeLessThan(IDLE_BEFORE_GLOW + 0.1)
    expect(demoAt - endedAt).toBeGreaterThan(IDLE_BEFORE_DEMO - 0.1)
    expect(demoAt - endedAt).toBeLessThan(IDLE_BEFORE_DEMO + 0.1)
  })

  it('takes the idle ladder back at a put-away, and leaves the world as a load would', () => {
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    frames(play, IDLE_BEFORE_DEMO + 1)
    expect(play.frame(1 / 60).demo).not.toBeNull()
    play.down(1, px(homeOf('horse')), 0, size.width)
    play.move(1, px({ x: 600, y: 500 }), size.width)
    const saved = world.places()
    play.rest(size.width)
    expect(world.hand).toBeNull()
    expect(play.touch.active).toBe(false)
    expect(world.places()).toEqual(saved)
    const back = play.frame(1 / 60)
    expect([back.glow, back.demo]).toEqual([0, null])
    // The finger that was down when the game was put away sets off nothing when it lifts afterwards.
    play.up(1, px({ x: 600, y: 500 }), 5000, size.width)
    expect(world.takeSounds()).toEqual([])
    expect(world.places()).toEqual(saved)
  })

  it('takes a slow tap of the youngest for a tap: a finger that rests 0.45 s, or wobbles a little, still turns the thing over', () => {
    for (const [heldMs, wobble] of [[450, 0], [450, 9], [1200, 4]] as const) {
      const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
      const at = px(homeOf('doll-round'))
      play.down(1, at, 0, size.width)
      play.up(1, at, 90, size.width)
      expect(world.hand?.id).toBe('doll-round')
      play.down(1, at, 1000, size.width)
      play.move(1, { x: at.x + wobble, y: at.y - wobble / 2 }, size.width)
      frames(play, heldMs / 1000)
      play.up(1, { x: at.x + wobble, y: at.y }, 1000 + heldMs, size.width)
      expect(world.hand, `${heldMs} ms, ${wobble} px`).toBeNull()
      expect(world.places()['doll-round'].turned).toBe(true)
    }
  })

  it('lets a second finger or a palm land and lift without doing anything', () => {
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    play.down(1, px(homeOf('doll-round')), 0, size.width)
    const held = { hand: world.hand?.id, places: world.places() }
    world.takeSounds()
    // They land on the bare mat and on the sill, on no thing.
    for (const id of [2, 3, 4]) play.down(id, px({ x: 380 + id * 40, y: id === 4 ? 770 : 560 }), 20, size.width)
    for (const id of [2, 3, 4]) play.up(id, px({ x: 380 + id * 40, y: id === 4 ? 770 : 560 }), 60, size.width)
    expect(world.takeSounds()).toEqual([])
    expect({ hand: world.hand?.id, places: world.places() }).toEqual(held)
  })

  it('does not let a wrist that landed first silence a finger: the newest touch that lands on a thing wins', () => {
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    // A wrist comes down on the sill and stays there.
    play.down(1, px({ x: 760, y: 780 }), 0, size.width)
    expect(named(world.takeSounds())).toEqual(['soft'])
    // A finger lands on a doll: the doll is lifted, and the finger carries it.
    play.down(2, px(homeOf('doll-round')), 40, size.width)
    expect(world.hand?.id).toBe('doll-round')
    play.move(2, px({ x: 560, y: 480 }), size.width)
    play.move(2, px({ x: 560, y: 500 }), size.width)
    expect(world.hand?.mode).toBe('drag')
    // The wrist lifting, or another palm on the bare mat, changes nothing; nor does a touch on another thing take a carry away.
    play.up(1, px({ x: 760, y: 780 }), 300, size.width)
    play.down(3, px({ x: 420, y: 600 }), 320, size.width)
    play.down(4, px(homeOf('doll-tall')), 330, size.width)
    expect([world.hand?.id, world.hand?.mode]).toEqual(['doll-round', 'drag'])
    play.up(2, px({ x: 560, y: 500 }), 400, size.width)
    frames(play, 1.5)
    expect(world.places()['doll-round'].at).toBe('mat')
  })

  it('never lets a hand at rest kill the taps: with a palm down first and still, the next contact is answered, so a thing in hand can be set down', () => {
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    // A palm comes down on the bare mat, five contacts at once, and stays: one thump, and nothing for the other four.
    const palm = [{ x: 380, y: 600 }, { x: 420, y: 570 }, { x: 460, y: 580 }, { x: 410, y: 650 }, { x: 340, y: 630 }]
    palm.forEach((at, i) => play.down(10 + i, px(at), i * 8, size.width))
    expect(named(world.takeSounds())).toEqual(['thump'])
    frames(play, 0.5)
    world.takeSounds()
    // A finger taps a doll by the mat: it is lifted.
    play.down(1, px(homeOf('doll-round')), 600, size.width)
    play.up(1, px(homeOf('doll-round')), 720, size.width)
    expect(world.hand?.id).toBe('doll-round')
    frames(play, 0.5)
    // The palm is still down. The finger taps the bare mat: the doll is set down there.
    play.down(2, px({ x: 700, y: 620 }), 1300, size.width)
    play.up(2, px({ x: 700, y: 620 }), 1420, size.width)
    expect(world.hand).toBeNull()
    expect(world.places()['doll-round']).toMatchObject({ at: 'mat', on: null })
    frames(play, 1)
    world.takeSounds()
    // The palm lifting at last sets off nothing.
    world.takeSounds()
    const places = world.places()
    palm.forEach((at, i) => play.up(10 + i, px(at), 9000, size.width))
    expect(world.takeSounds()).toEqual([])
    expect(world.places()).toEqual(places)
  })

  it('answers the next contact wherever it lands once a hand has come to rest: on the mat, the basket, the cat and the pane', () => {
    for (const [at, sound] of [[{ x: 700, y: 620 }, 'thump'], [{ x: 1062, y: 578 }, 'creak'], [CAT_AT, 'mew'], [{ x: 1150, y: 180 }, 'tink']] as const) {
      const world = new World(), { play, px } = playAt(world, size)
      // A wrist comes down on the sill and stays.
      play.down(1, px({ x: 760, y: 780 }), 0, size.width)
      expect(named(world.takeSounds())).toEqual(['soft'])
      // A contact that lands with it, in the same moment, is part of the same hand: nothing.
      play.down(2, px({ x: 800, y: 770 }), 30, size.width)
      expect(world.takeSounds()).toEqual([])
      frames(play, 0.4)
      world.takeSounds()
      // The wrist is still down. The next contact is answered in the touch itself.
      play.down(3, px(at), 500, size.width)
      expect(named(world.takeSounds()), sound).toContain(sound)
      play.up(3, px(at), 620, size.width)
    }
  })

  it('never lets the heel of a hand send a thing home: heel on the sill, then a finger on the mat, and the thing goes to the mat', () => {
    for (const gap of [0, 60, 200, 900]) {
      const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
      // A doll is lifted with a tap.
      play.down(1, px(homeOf('doll-round')), 0, size.width)
      play.up(1, px(homeOf('doll-round')), 100, size.width)
      frames(play, 0.5)
      world.takeSounds()
      // The heel comes down on the sill and stays: the sill answers, and the doll stays in hand.
      play.down(2, px({ x: 760, y: 780 }), 600, size.width)
      expect(named(world.takeSounds())).toEqual(['soft'])
      expect(world.hand?.id).toBe('doll-round')
      frames(play, gap / 1000)
      // The finger lands on the mat, at once or later: the doll is set down there.
      play.down(3, px({ x: 640, y: 600 }), 600 + gap, size.width)
      play.up(3, px({ x: 640, y: 600 }), 700 + gap, size.width)
      expect(world.hand, `${gap} ms`).toBeNull()
      expect(world.places()['doll-round'], `${gap} ms`).toMatchObject({ at: 'mat', on: null })
      expect(Math.hypot(world.places()['doll-round'].x - 640, world.places()['doll-round'].y - 600), `${gap} ms`).toBeLessThan(60)
      // The heel lifting afterwards sets off nothing.
      frames(play, 1.5)
      const places = world.places()
      world.takeSounds()
      play.up(2, px({ x: 760, y: 780 }), 5000, size.width)
      expect(world.takeSounds()).toEqual([])
      expect(world.places()).toEqual(places)
    }
    // A heel that rests and lifts with no finger after it: the doll is still in hand.
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    play.down(1, px(homeOf('doll-round')), 0, size.width)
    play.up(1, px(homeOf('doll-round')), 100, size.width)
    play.down(2, px({ x: 760, y: 780 }), 600, size.width)
    frames(play, 1.2)
    play.up(2, px({ x: 760, y: 780 }), 1800, size.width)
    expect(world.hand?.id).toBe('doll-round')
    // A tap there does send it home.
    play.down(4, px({ x: 760, y: 780 }), 3000, size.width)
    frames(play, 0.2)
    play.up(4, px({ x: 760, y: 780 }), 3200, size.width)
    expect(world.hand).toBeNull()
    expect(world.places()['doll-round'].at).toBe('home')
  })

  it('takes a smeared tap for a tap: a finger that slides 25 pixels on a thing by the mat leaves it in hand', () => {
    for (const [dx, dy] of [[25, 0], [-18, 17], [0, -25]] as const) {
      const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
      const at = px(homeOf('doll-round'))
      play.down(1, at, 0, size.width)
      for (let k = 1; k <= 5; k++) { play.move(1, { x: at.x + (dx * k) / 5, y: at.y + (dy * k) / 5 }, size.width); frames(play, 0.02) }
      play.up(1, { x: at.x + dx, y: at.y + dy }, 120, size.width)
      // It is in hand as after a tap, and stays there: it does not sink, drop or hop home.
      expect([world.hand?.id, world.hand?.mode], `${dx}, ${dy}`).toEqual(['doll-round', 'held'])
      frames(play, 1.5)
      expect([world.hand?.id, world.hand?.mode], `${dx}, ${dy}`).toEqual(['doll-round', 'held'])
      expect(world.places()['doll-round'].at).toBe('home')
      // A smeared tap on the mat sets it down where the finger landed.
      const to = px({ x: 620, y: 600 })
      play.down(1, to, 2000, size.width)
      play.move(1, { x: to.x + dx, y: to.y + dy }, size.width)
      play.up(1, { x: to.x + dx, y: to.y + dy }, 2100, size.width)
      expect(world.places()['doll-round']).toMatchObject({ at: 'mat', on: null })
      expect(Math.hypot(world.places()['doll-round'].x - 620, world.places()['doll-round'].y - 600)).toBeLessThan(60)
    }
    // Further than a smear, it is a carry.
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    const at = px(homeOf('doll-round'))
    play.down(1, at, 0, size.width)
    play.move(1, { x: at.x + 60, y: at.y + 40 }, size.width)
    expect(world.hand?.mode).toBe('drag')
  })

  it('never takes a finger that is on a thing for a hand at rest: a heel that lands later takes nothing over', () => {
    const world = new World(firstPlaces(true)), { play, px } = playAt(world, size)
    // A slow finger presses a doll by the mat and stays on it.
    play.down(1, px(homeOf('doll-round')), 0, size.width)
    expect(world.hand?.id).toBe('doll-round')
    frames(play, 0.6)
    world.takeSounds()
    const held = world.places()
    // The heel lands on the sill, and another contact on the bare mat: neither is answered, and the doll is neither sent home nor set down.
    play.down(2, px({ x: 760, y: 780 }), 600, size.width)
    play.down(3, px({ x: 500, y: 600 }), 650, size.width)
    expect(world.takeSounds()).toEqual([])
    expect([world.hand?.id, world.places()]).toEqual(['doll-round', held])
    // The finger is alive: it carries the doll to the mat.
    play.move(1, px({ x: 600, y: 480 }), size.width)
    play.move(1, px({ x: 620, y: 560 }), size.width)
    expect(world.hand?.mode).toBe('drag')
    play.up(1, px({ x: 620, y: 560 }), 1200, size.width)
    frames(play, 1.5)
    expect(world.places()['doll-round'].at).toBe('mat')
  })

  it('reaches every thing and every place with taps alone', () => {
    const world = new World(), { play, px } = playAt(world, size)
    const tap = (stage: Point, at: number): void => { play.down(1, px(stage), at, size.width); play.up(1, px(stage), at + 120, size.width) }
    // Each thing by the mat is taken with one tap and set down with another; the nest gives its arches from the outside in.
    const spots: Record<PieceId, Point> = { 'arch-large': { x: 420, y: 520 }, 'arch-middle': { x: 610, y: 500 }, 'arch-small': { x: 780, y: 520 }, 'doll-tall': { x: 400, y: 620 }, 'doll-round': { x: 560, y: 630 }, 'doll-small': { x: 700, y: 630 }, horse: { x: 500, y: 570 }, silk: { x: 690, y: 570 } }
    let clock = 0
    for (const id of PIECE_IDS) {
      tap(homeOf(id), clock += 500)
      expect(world.hand?.id, id).toBe(id)
      tap(spots[id], clock += 500)
      frames(play, 1)
      expect(world.places()[id].at, id).toBe('mat')
    }
    expect(run(world, 0.1).length).toBeGreaterThanOrEqual(0)
  })
})
