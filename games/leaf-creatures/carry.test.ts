import { describe, expect, it } from 'vitest'
import { HEAPS, onEarth } from './clearing'
import { TIERS } from './config'
import { LET_SINK, LIFT_GRACE, lettingGo } from './hand'
import { ForgivingTouch, LIFT_GRACE_MS, REGRAB_RADIUS, type Gesture, type Point } from './input'
import { Painter } from './painter'
import { partKey } from './pen'
import { outside } from './posed'
import type { Saved } from './save'
import { DT, RecordingPen, clearing, drawnAt, heard, thing, toyOf } from './testing'
import { PULL_CLEAR, STROKE } from './touching'
import type { Toy } from './toy'
import { IdleLadder } from './guidance'
import { inCorner } from './overlay'
import { holdsLadder, landing, liftOf, perform, touchClock } from './visit'
import { drawFrame } from './view'

// A carry survives a lifted finger (the sheet, and the pack's rule for the
// youngest). The finger may come back within the grace and carry on; the
// part is dropped only when it stays away. While the grace runs the part is
// seen to be letting go, and the grace is counted on the toy's own clock.
// Everything here goes the way the Mount sends it: the tracker's gestures
// through `perform`, the tracker told the time by `touchClock`.

type Visit = { toy: Toy; touch: ForgivingTouch; frame: () => void; down: (at: Point) => void; move: (at: Point) => void; up: (at: Point) => void }

function visit(saved: Saved = clearing([])): Visit {
  const toy = toyOf(saved), touch = new ForgivingTouch()
  const act = (gestures: Gesture[]): void => { for (const gesture of gestures) perform(toy, gesture, (at) => at) }
  return {
    toy, touch,
    frame: () => { act(touch.advance(touchClock(toy))); toy.step(DT) },
    down: (at) => act(touch.down(1, at, touchClock(toy))),
    move: (at) => act(touch.move(1, at)),
    up: (at) => act(liftOf(toy, touch, 1, at)),
  }
}

/** A seed is taken from its heap and carried to `to`, and held there until it has caught the finger up. */
function carried(to: Point): Visit {
  const game = visit(), from = HEAPS.seed
  game.down(from)
  for (let f = 1; f <= 30; f++) { game.move({ x: from.x + ((to.x - from.x) * f) / 30, y: from.y + ((to.y - from.y) * f) / 30 }); game.frame() }
  for (let f = 0; f < 40; f++) game.frame()
  expect(game.toy.hand?.kind).toBe('seed')
  return game
}

const frames = (seconds: number): number => Math.round(seconds / DT)
const OVER_EARTH = { x: 590, y: 500 }

describe('a carry survives a lifted finger', () => {
  it('keeps the part for a finger that lifts and lands again within the grace, and the carry goes on as the same carry', () => {
    const game = carried(OVER_EARTH), { toy } = game, hand = toy.hand
    game.up(OVER_EARTH)
    for (let f = 0; f < frames(LIFT_GRACE) - 4; f++) game.frame()
    // Nothing was dropped and nothing was laid: the part waits.
    expect(toy.hand).toBe(hand)
    expect(hand?.waiting).toBe(true)
    expect(toy.things).toHaveLength(0)
    // The finger comes down again, not on the part but near where it lifted.
    const back = { x: OVER_EARTH.x + REGRAB_RADIUS - 20, y: OVER_EARTH.y }
    game.down(back)
    expect(toy.hand).toBe(hand)
    expect([hand?.waiting, hand?.waited, hand?.fingerX]).toEqual([false, 0, back.x])
    // It is the same carry for as long as the finger stays, however long that is.
    for (let f = 0; f < frames(1); f++) game.frame()
    expect(toy.hand).toBe(hand)
    expect(toy.things).toHaveLength(0)
    game.move({ x: back.x - 60, y: back.y - 40 })
    game.frame()
    expect(toy.hand?.fingerX).toBe(back.x - 60)
  })

  it('drops the part where it was let go when the finger stays away for the grace, and not before', () => {
    const game = carried(OVER_EARTH), { toy } = game
    const at = { x: toy.hand!.x, y: toy.hand!.y }
    expect(onEarth(at.x, at.y)).toBe(true)
    game.up(OVER_EARTH)
    let droppedAt = -1
    for (let f = 0; f < 60 && droppedAt < 0; f++) { game.frame(); if (!toy.hand) droppedAt = f }
    expect(droppedAt).toBeGreaterThanOrEqual(frames(LIFT_GRACE) - 1)
    expect(droppedAt).toBeLessThanOrEqual(frames(LIFT_GRACE) + 2)
    expect(toy.things).toHaveLength(1)
    expect([toy.things[0].x, toy.things[0].y]).toEqual([at.x, at.y])
    expect(game.touch.active).toBe(false)
  })

  it('drops it too when the finger comes down somewhere else, and that touch is then a touch of its own', () => {
    const game = carried(OVER_EARTH), { toy } = game
    game.up(OVER_EARTH)
    game.frame()
    game.down({ x: OVER_EARTH.x - REGRAB_RADIUS - 60, y: OVER_EARTH.y - 120 })
    expect(toy.things).toHaveLength(1)
    expect(toy.hand).toBeNull()
  })

  it('holds the half-way flutter for a part whose finger stays away: let go beside the earth it flutters on to it, and let go by its heap it goes home', () => {
    const far = carried({ x: 868, y: 336 })
    expect(onEarth(far.toy.hand!.x, far.toy.hand!.y)).toBe(false)
    far.up({ x: 868, y: 336 })
    for (let f = 0; f < frames(LIFT_GRACE) + 3; f++) far.frame()
    expect(far.toy.hand).toBeNull()
    expect(far.toy.things).toHaveLength(1)
    expect(onEarth(far.toy.things[0].x, far.toy.things[0].y)).toBe(true)

    const near = carried({ x: HEAPS.seed.x - 30, y: HEAPS.seed.y - 20 })
    near.up({ x: HEAPS.seed.x - 30, y: HEAPS.seed.y - 20 })
    for (let f = 0; f < frames(LIFT_GRACE) + 3; f++) near.frame()
    expect(near.toy.hand).toBeNull()
    expect(near.toy.things).toHaveLength(0)
    expect(near.toy.air.strays).toHaveLength(1)
  })

  it('counts the grace on the toy\'s clock: while the game does not run, a lifted finger loses nothing, however long it is', () => {
    const game = carried(OVER_EARTH), { toy } = game
    game.up(OVER_EARTH)
    // The tracker is asked again and again, as a loop would ask it, and the toy is not stepped: its clock stands.
    for (let f = 0; f < 600; f++) expect(game.touch.advance(touchClock(toy))).toEqual([])
    expect(toy.hand?.waiting).toBe(true)
    // The clock runs again: the same grace is still to come.
    for (let f = 0; f < frames(LIFT_GRACE) - 4; f++) game.frame()
    expect(toy.hand).not.toBeNull()
    for (let f = 0; f < 8; f++) game.frame()
    expect(toy.hand).toBeNull()
    expect(LIFT_GRACE).toBe(LIFT_GRACE_MS / 1000)
  })
})

describe('a part whose finger has lifted is seen to be letting go', () => {
  /** Where the seed in the hand is drawn in this frame: x, y and turn. */
  function shown(toy: Toy, pen: RecordingPen, painter: Painter): number[] {
    pen.reset()
    drawFrame(pen, toy, null, TIERS[0], painter)
    const key = partKey('seed', toy.hand!.look)
    const stamps = pen.log.filter((line) => line.startsWith(`|stamp|${key},`))
    expect(stamps).toHaveLength(1)
    return stamps[0].split('|')[2].split(',').slice(1, 4).map(Number)
  }

  it('sinks a little more in every frame of the grace and quivers as it sinks, so no two frames in a row show it the same', () => {
    const game = carried(OVER_EARTH), { toy } = game, pen = new RecordingPen(), painter = new Painter()
    const held = shown(toy, pen, painter)
    game.up(OVER_EARTH)
    const seen: number[][] = []
    for (let f = 0; f < frames(LIFT_GRACE) - 2; f++) { game.frame(); seen.push(shown(toy, pen, painter)) }
    for (let f = 1; f < seen.length; f++) {
      // Lower than the frame before, and turned otherwise.
      expect(seen[f][1], `frame ${f}`).toBeGreaterThan(seen[f - 1][1])
      expect(seen[f][2], `frame ${f}`).not.toBeCloseTo(seen[f - 1][2], 4)
    }
    // A little: by the end it is most of `LET_SINK` lower than it was held, and it has turned to both sides.
    const sunk = seen[seen.length - 1][1] - held[1]
    expect(sunk).toBeGreaterThan(LET_SINK * 0.6)
    expect(sunk).toBeLessThanOrEqual(LET_SINK + 4)
    const turns = seen.map((one) => one[2] - toy.hand!.turn)
    expect(Math.max(...turns)).toBeGreaterThan(0.04)
    expect(Math.min(...turns)).toBeLessThan(-0.04)
  })

  it('does neither while the finger is on it, and stops both in the frame the finger is back', () => {
    const game = carried(OVER_EARTH), { toy } = game
    expect(lettingGo(toy.hand!)).toEqual({ sink: 0, quiver: 0 })
    game.up(OVER_EARTH)
    for (let f = 0; f < 8; f++) game.frame()
    expect(lettingGo(toy.hand!).sink).toBeGreaterThan(3)
    game.down(OVER_EARTH)
    expect(lettingGo(toy.hand!)).toEqual({ sink: 0, quiver: 0 })
  })
})

describe('the grace is for a carried part only', () => {
  /** A creature that stands still in the middle of the ground: a long willow back, two legs, two eyes. Parts 0 and 1 are its back. */
  function standing(more: Partial<{ drowsy: boolean }> = {}): Visit {
    const game = visit(clearing([thing(1, 590, 420, ['willow', 'willow', 'twig', 'cap', 'cap'], 1, more)]))
    game.toy.creatures[0].rest = 999
    for (let f = 0; f < 30; f++) game.frame()
    heard(game.toy)
    return game
  }

  it('answers a slide that carries nothing on the frame the finger lifts: the poke and its sound are in that call, and the touch is over', () => {
    const game = standing(), { toy } = game, creature = toy.creatures[0], at = drawnAt(creature, 0)
    game.down(at)
    for (let k = 1; k <= 6; k++) { game.move({ x: at.x + k * 5, y: at.y }); game.frame() }
    expect(toy.grip).not.toBeNull()
    heard(toy)
    game.up({ x: at.x + 30, y: at.y })
    // No frame has passed since the lift.
    expect(heard(toy)).toContain('poke-willow')
    expect(toy.grip).toBeNull()
    expect(creature.poke).not.toBeNull()
    expect(game.touch.active).toBe(false)
  })

  it('springs a stretched eye back on the lift, sight and sound together, when it was not pulled off', () => {
    const game = standing(), { toy } = game, creature = toy.creatures[0], eye = 3, at = drawnAt(creature, eye)
    game.down(at)
    // Straight up the page until the finger is half a cap clear of the creature: the eye stretches after it.
    let y = at.y
    while (outside(creature, at.x, y) < PULL_CLEAR * 0.5) { y -= 4; game.move({ x: at.x, y }); game.frame() }
    expect(creature.tug).not.toBeNull()
    expect(toy.hand).toBeNull()
    heard(toy)
    game.up({ x: at.x, y })
    expect(creature.tug).toBeNull()
    expect(heard(toy)).toEqual(['press-cap'])
    expect([toy.grip, game.touch.active]).toEqual([null, false])
    expect(toy.things[0].parts.filter((part) => part.kind === 'cap')).toHaveLength(2)
  })

  it('keeps the grace for an eye that came off: it is a carry, it quivers while the finger is away, and the finger takes it up again', () => {
    const game = visit(clearing([thing(1, 590, 420, ['willow', 'willow', 'twig', 'cap', 'cap', 'cap'], 1)])), { toy } = game
    toy.creatures[0].rest = 999
    for (let f = 0; f < 30; f++) game.frame()
    const creature = toy.creatures[0], at = drawnAt(creature, 3)
    game.down(at)
    let y = at.y
    while (!toy.hand && y > 0) { y -= 4; game.move({ x: at.x, y }); game.frame() }
    expect(toy.hand?.pulled).toBe(true)
    const hand = toy.hand
    game.up({ x: at.x, y })
    for (let f = 0; f < 8; f++) game.frame()
    expect(toy.hand).toBe(hand)
    expect(lettingGo(hand!).sink).toBeGreaterThan(3)
    game.down({ x: at.x + 30, y })
    expect(toy.hand).toBe(hand)
    expect(hand?.waiting).toBe(false)
  })

  it('never takes a finger that arrives again for a stroke: two quick pokes, far enough apart to add up to one, bed nobody', () => {
    const game = standing({ drowsy: true }), { toy } = game, creature = toy.creatures[0]
    // Two places on its long back, one toward each end of the same leaf.
    const mid = drawnAt(creature, 0), a = { x: mid.x - 50, y: mid.y }, b = { x: mid.x + 50, y: mid.y }
    for (const at of [a, b]) expect(outside(creature, at.x, at.y)).toBeLessThanOrEqual(0)
    // The two places are on the creature and further apart than a stroke is long, and near enough for a finger to be taken for coming back.
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(STROKE)
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(REGRAB_RADIUS)
    const sounds: string[] = []
    game.down(a)
    for (let k = 1; k <= 4; k++) { game.move({ x: a.x, y: a.y + k * 4 }); game.frame() }
    game.up({ x: a.x, y: a.y + 16 })
    sounds.push(...heard(toy))
    for (let f = 0; f < 3; f++) game.frame()
    game.down(b)
    // The second touch is a press of its own: it begins with nothing stroked.
    expect(toy.grip?.stroked).toBe(0)
    for (let k = 1; k <= 4; k++) { game.move({ x: b.x, y: b.y + k * 4 }); game.frame() }
    game.up({ x: b.x, y: b.y + 16 })
    sounds.push(...heard(toy))
    expect(sounds.filter((key) => key.startsWith('poke-'))).toHaveLength(2)
    expect([toy.sceneKind, creature.thing.bedded, creature.thing.drowsy]).toEqual([null, false, false])
    for (let f = 0; f < 120; f++) game.frame()
    expect(creature.thing.bedded).toBe(false)
  })
})

describe('a second finger in the corner changes nothing for the working finger', () => {
  const WIDTH = 1180
  const corner = (at: Point): boolean => inCorner(at.x, at.y, WIDTH)

  it('leaves the carrying finger out of the corner, so the hint does not rise during the carry however long it lasts', () => {
    const game = carried(OVER_EARTH), { toy, touch } = game
    let cornered = false
    // A second finger, or the heel of the hand, comes down in the grown-up's corner.
    const landed = landing(touch, 2, { x: WIDTH - 20, y: 20 }, touchClock(toy), cornered, corner)
    expect(landed.gestures).toEqual([])
    cornered = landed.cornered
    expect(cornered).toBe(false)
    expect(toy.hand?.kind).toBe('seed')
    // Twenty seconds of carrying, the idle ladder kept as the Mount keeps it: nothing of the hint comes up.
    const ladder = new IdleLadder(0)
    for (let f = 1; f <= frames(20); f++) {
      game.frame()
      const now = f * DT
      if (holdsLadder(touch.active, cornered, toy)) ladder.touch(now)
      const shown = ladder.update(now)
      expect(shown.glow, `frame ${f}`).toBe(0)
      expect(shown.demo, `frame ${f}`).toBeNull()
    }
    expect(toy.hand?.kind).toBe('seed')
  })

  it('counts a finger that lands alone in the corner as in the corner, and a part in the hand as work wherever a finger is', () => {
    const game = visit(), { toy, touch } = game
    const alone = landing(touch, 1, { x: WIDTH - 20, y: 20 }, touchClock(toy), false, corner)
    expect(alone.gestures.map((gesture) => gesture.type)).toEqual(['press'])
    expect(alone.cornered).toBe(true)
    expect(holdsLadder(true, true, toy)).toBe(false)
    // A finger that begins a press elsewhere is out of it again.
    touch.up(1, { x: WIDTH - 20, y: 20 }, touchClock(toy))
    expect(landing(touch, 1, OVER_EARTH, touchClock(toy), true, corner).cornered).toBe(false)
    const carrying = carried(OVER_EARTH)
    expect(holdsLadder(true, true, carrying.toy)).toBe(true)
    expect(holdsLadder(false, true, carrying.toy)).toBe(true)
  })
})
