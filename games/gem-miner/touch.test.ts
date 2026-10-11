import { describe, expect, it } from 'vitest'
import { drawn, roomFor } from './fixtures'
import type { Event } from './game'
import { BURROW_INDEX, CAGE, COLS, LIFT, MAMMOTH, TOOLS, TOOL_HOME, centre, inBox, indexOf } from './layout'
import type { Play } from './play'
import type { Sprite } from './pigment'
import type { Stamped } from './recording'
import { FRAME, rig, run, stampsOf, watched } from './rig'
import { CRANK } from './wall'
import { DWELLER_KINDS, layWorld, type Colour, type World } from './world'

// A thing is touched where it is drawn, in every state it can be in. Each
// test draws the real frame on a recording surface, finds where the thing's
// picture was stamped, puts a finger on the middle of that stamp, and looks
// for the thing's own answer. At a pixel ratio of 1 on a surface of the
// stage's size, a pixel of the surface is a stage unit.

const view = rig(1)
const pictures = () => view.view.pictures!
const mid = (index: number) => centre(index % COLS, Math.floor(index / COLS))

/** The one stamp of a picture in the frame as it stands. */
function drawnAt(play: Play, sprite: Sprite): Stamped {
  const found = stampsOf(view.frame(play), sprite)
  expect(found.length).toBe(1)
  return found[0]
}

/** Puts a finger down on a point and gives back what the game answered in that call. */
function touch(play: Play, log: { event: Event }[], x: number, y: number): Event[] {
  const from = log.length
  play.press({ x, y }, false)
  return log.slice(from).map((entry) => entry.event)
}

function withGem(world: World, colour: Colour, at: number, rest: 'floor' | 'left' | 'right' | 'hung'): World {
  world.gems.push({ colour, at, rest })
  if (rest === 'hung') world.tools.rope = at
  return world
}

describe('a gem at the mole\'s feet', () => {
  it('is drawn after him, in front of his feet, and a finger on it takes the gem and not the mole', () => {
    const world = withGem(drawn('eeeeee@', 'eeeeeeo'), 'red', indexOf(6, 1), 'floor')
    world.mole.at = indexOf(6, 1)
    const { play } = watched(world)
    run(play, 0.5)
    const frame = view.frame(play)
    const images = frame.map((stamp) => stamp.image)
    const gem = images.indexOf(pictures().gem.red.image), body = images.lastIndexOf(pictures().mole.body.image), hat = images.lastIndexOf(pictures().mole.hat.image)
    expect(gem).toBeGreaterThan(body)
    expect(gem).toBeGreaterThan(hat)
    const at = stampsOf(frame, pictures().gem.red)[0]
    play.press({ x: at.cx, y: at.cy }, false)
    expect(play.game.hand?.gem).toBe(play.game.world.gems[0])
  })

  it('is drawn behind him when it lies in any other block', () => {
    const world = withGem(drawn('eeeeee@', 'eeeeeoo'), 'red', indexOf(5, 1), 'floor')
    world.mole.at = indexOf(6, 1)
    const { play } = watched(world)
    run(play, 0.5)
    const images = view.frame(play).map((stamp) => stamp.image)
    expect(images.indexOf(pictures().gem.red.image)).toBeLessThan(images.indexOf(pictures().mole.body.image))
  })
})

describe('a gem is taken where it is drawn', () => {
  const cave = (): World => drawn('eeeeee@', 'eeeeeee', 'eeeeeee', 'eeoooee', 'eeoooee', 'eeeeeee')
  const cases: [string, (world: World) => World][] = [
    ['lying on a floor', (world) => withGem(world, 'red', indexOf(3, 4), 'floor')],
    ['the second and the third on one floor', (world) => withGem(withGem(withGem(world, 'red', indexOf(3, 4), 'floor'), 'green', indexOf(3, 4), 'floor'), 'blue', indexOf(3, 4), 'floor')],
    ['set in a left wall', (world) => withGem(world, 'green', indexOf(2, 3), 'left')],
    ['set in a right wall', (world) => withGem(world, 'blue', indexOf(4, 3), 'right')],
    ['hung from the roof', (world) => withGem(world, 'red', indexOf(3, 3), 'hung')],
  ]
  for (const [name, make] of cases) {
    it(name, () => {
      const { play } = watched(make(cave()))
      run(play, 0.5)
      for (const gem of [...play.game.world.gems]) {
        const at = drawnAt(play, pictures().gem[gem.colour])
        play.press({ x: at.cx, y: at.cy }, false)
        expect(play.game.hand?.gem).toBe(gem)
        play.release('cancel', undefined, false)
      }
    })
  }

  it('on its way down, at every frame of the fall and of its two bounces', () => {
    const { play } = watched(withGem(cave(), 'red', indexOf(3, 3), 'left'))
    // Let go high in the room, it falls to the floor of the block below.
    const gem = play.game.world.gems[0]
    const from = drawnAt(play, pictures().gem.red)
    play.press({ x: from.cx, y: from.cy }, false)
    play.drag({ x: mid(indexOf(3, 3)).x, y: mid(indexOf(3, 3)).y }, false)
    play.release('drop', mid(indexOf(3, 3)), false)
    expect(gem.rest).toBe('floor')
    let frames = 0
    while (play.game.motions.length > 0) {
      const at = drawnAt(play, pictures().gem.red)
      play.press({ x: at.cx, y: at.cy }, false)
      expect(play.game.hand?.gem).toBe(gem)
      play.release('cancel', undefined, false)
      play.step(FRAME, false)
      frames += 1
    }
    expect(frames).toBeGreaterThan(5)
  })
})

describe('a tool is fetched where it is drawn', () => {
  it('on the grass, each in its place', () => {
    for (const tool of TOOLS) {
      const { play, log } = watched(layWorld(3, 'near'))
      const at = drawnAt(play, pictures().tool[tool])
      expect(touch(play, log, at.cx, at.cy)).toMatchObject([{ type: 'poke', who: tool }])
    }
  })

  it('lying in the hill, and in the cage', () => {
    for (const tool of TOOLS) {
      for (const node of [indexOf(3, 4), CAGE]) {
        const world = drawn('eeeeee@', 'eeeeeee', 'eeeeeee', 'eeoooee', 'eeoooee', 'eeeeeee')
        world.tools[tool] = node
        const { play, log } = watched(world)
        const at = drawnAt(play, pictures().tool[tool])
        expect(touch(play, log, at.cx, at.cy)[0]).toMatchObject({ type: 'poke', who: tool })
      }
    }
  })

  it('falling, at every frame of the fall', () => {
    const world = drawn('eeeeee@', 'eeeeeee', 'eeoeeee', 'eeoeeee', 'eeoeeee', 'eeeeeee')
    world.tools.bucket = indexOf(2, 2)
    const { play, log } = watched(world)
    // The hill comes to rest when anything changes: a gem set down is enough to let the bucket go.
    withGem(play.game.world, 'red', indexOf(2, 4), 'floor')
    const gem = drawnAt(play, pictures().gem.red)
    play.press({ x: gem.cx, y: gem.cy }, false)
    // It is set down in the burrow, out of the bucket's way.
    play.drag(mid(indexOf(6, 0)), false)
    play.release('drop', mid(indexOf(6, 0)), false)
    expect(play.game.world.tools.bucket).toBe(indexOf(2, 4))
    let frames = 0
    while (play.game.motions.some((motion) => motion.tool === 'bucket')) {
      const at = drawnAt(play, pictures().tool.bucket)
      expect(touch(play, log, at.cx, at.cy + 20)[0]).toMatchObject({ type: 'poke', who: 'bucket' })
      play.release('cancel', undefined, false)
      play.step(FRAME, false)
      frames += 1
    }
    expect(frames).toBeGreaterThan(5)
  })
})

describe('the mole is touched where he is drawn', () => {
  const states: [string, (world: World) => World][] = [
    ['at rest in his burrow', (world) => world],
    ['sooty', (world) => { world.mole.sooty = true; return world }],
    ...TOOLS.map((tool): [string, (world: World) => World] => [`holding the ${tool}`, (world) => { world.mole.tool = tool; return world }]),
    ['holding a bucket of water', (world) => { world.mole.tool = 'bucket'; world.mole.load = 'water'; return world }],
    ['ducking under a lamp', (world) => withGem(world, 'red', BURROW_INDEX, 'hung')],
    ['on the grass', (world) => { world.mole.at = TOOL_HOME.bucket - 1; return world }],
  ]
  for (const [name, make] of states) {
    it(name, () => {
      const { play, log } = watched(make(layWorld(3, 'near')))
      run(play, 0.3)
      const world = play.game.world
      const at = drawnAt(play, world.mole.sooty ? pictures().mole.sooty : pictures().mole.body)
      const answer = touch(play, log, at.cx, at.cy)
      // A lamp that hangs in his block is in front of him there; beside it he is found.
      if (name.startsWith('ducking')) return expect(inBox({ x: at.cx, y: at.cy + 10 }, play.game.moleShape())).toBe(true)
      expect(answer[0]).toMatchObject({ type: 'poke', who: 'mole' })
      // His body is inside the shape a finger finds him by.
      const shape = play.game.moleShape()
      expect(at.cx).toBeGreaterThan(shape.x)
      expect(at.cx).toBeLessThan(shape.x + shape.w)
      expect(at.cy).toBeGreaterThan(shape.y)
      expect(at.cy).toBeLessThan(shape.y + shape.h)
    })
  }

  it('under the roof after a blast, where a touch brings him down', () => {
    const { play, log } = watched(drawn('oee', 'oee', 'oee', '@ae'))
    play.press(mid(indexOf(1, 3)), false)
    run(play, 8, true)
    play.release('drop', mid(indexOf(1, 3)), false)
    expect(play.game.mole.hang).toBe(true)
    const at = drawnAt(play, pictures().mole.sooty)
    expect(inBox({ x: at.cx, y: at.cy }, play.game.moleShape())).toBe(true)
    expect(touch(play, log, at.cx, at.cy)[0]).toMatchObject({ type: 'poke', who: 'mole' })
    expect(play.game.mole.hang).toBe(false)
  })

  it('in the cage he is part of the lift: a tap on him there starts the ride, and a touch that stays does not', () => {
    const world = layWorld(3, 'near')
    world.mole.at = CAGE
    const { play } = watched(world)
    run(play, 0.3)
    const at = drawnAt(play, pictures().mole.body)
    expect(inBox({ x: at.cx, y: at.cy }, LIFT)).toBe(true)
    play.press({ x: at.cx, y: at.cy }, false)
    expect(play.game.sceneName).toBeNull()
    play.release('tap', { x: at.cx, y: at.cy }, false)
    expect(play.game.sceneName).toBe('ride')
  })
})

describe('a dweller is touched where it is drawn', () => {
  for (const kind of DWELLER_KINDS) {
    it(`the ${kind}, whole in its place`, () => {
      const { play, log } = watched(roomFor(kind))
      run(play, 0.4)
      expect(play.game.dwellers.map((dweller) => dweller.kind)).toEqual([kind])
      const found = view.frame(play).filter((one) => pictures().dweller[kind].some((sprite) => sprite.image === one.image))
      expect(found.length).toBeGreaterThan(0)
      for (const at of found) {
        const answer = touch(play, log, at.cx, at.cy)
        expect(answer.some((event) => event.type === 'poke' && event.who === kind)).toBe(true)
        play.release('cancel', undefined, false)
      }
    })
  }

  it('one that has drawn back out of the mole way is not drawn and not found', () => {
    const far = watched(roomFor('bat'))
    run(far.play, 0.5)
    const home = far.play.cast.lodgers[0].at
    expect(far.play.cast.lodgers[0].shown).toBe(1)
    // The same room with the mole standing in it, in the block beside the bat or in the bat's own.
    const world = roomFor('bat')
    world.mole.at = indexOf(1, 5)
    const { play, log } = watched(world)
    run(play, 0.5)
    const bats = play.cast.lodgers.filter((lodger) => lodger.kind === 'bat')
    expect(bats.map((bat) => bat.at)).toEqual([home])
    expect(bats[0].shown).toBe(0)
    const stamps = view.frame(play)
    expect(stamps.filter((one) => pictures().dweller.bat.some((sprite) => sprite.image === one.image))).toEqual([])
    const at = mid(home)
    const answer = touch(play, log, at.x, at.y - 20)
    expect(answer.some((event) => event.type === 'poke')).toBe(false)
  })

  it('one that is half drawn back is found in the half that is drawn, and not in the half that is gone', () => {
    const { play, log } = watched(roomFor('bat'))
    run(play, 0.4)
    const bat = play.cast.lodgers[0]
    bat.away = 0.5
    bat.shown = 0.5
    const at = mid(bat.at)
    // It hangs from the roof: at half its size it reaches half as far down.
    const top = at.y - 45 + 2
    expect(touch(play, log, at.x, top + 66 * 0.25).some((event) => event.type === 'poke')).toBe(true)
    play.release('cancel', undefined, false)
    bat.away = 0.5
    bat.shown = 0.5
    expect(touch(play, log, at.x, top + 66 * 0.75).some((event) => event.type === 'poke')).toBe(false)
  })

  it('one that is leaving is still found where it is drawn, and does its start', () => {
    const { play, log } = watched(roomFor('lizard'))
    run(play, 0.4)
    // The lamp is taken out of the room: the lizard leaves.
    play.game.world.gems.length = 0
    const at = mid(play.cast.lodgers[0].at)
    play.press({ x: at.x, y: at.y - 100 }, false)
    play.release('cancel', undefined, false)
    const lizard = play.cast.lodgers.find((lodger) => lodger.kind === 'lizard')!
    lizard.leaving = true
    lizard.here = 0.7
    lizard.shown = 0.7
    const answer = touch(play, log, at.x, at.y + 45 - 4 - 6)
    expect(answer.some((event) => event.type === 'poke' && event.who === 'lizard')).toBe(true)
    expect(lizard.start.left).toBeGreaterThan(0)
  })
})

describe('the lift and the mammoth are touched where they are drawn', () => {
  it('finds the lift on its cage, its frame and its crank', () => {
    const { play, log } = watched(layWorld(3, 'near'))
    const lift = pictures().lift
    for (const sprite of [lift.back, lift.front, lift.crank]) {
      const at = drawnAt(play, sprite)
      expect(touch(play, log, at.cx, at.cy)[0]).toMatchObject({ type: 'poke', who: 'lift' })
      play.release('cancel', undefined, false)
    }
    expect(inBox(CRANK, LIFT)).toBe(true)
  })

  it('finds the mammoth on its body, its head, its ear and its legs, and never takes them for the lift', () => {
    const { play, log } = watched(layWorld(3, 'near'))
    const mammoth = pictures().mammoth
    const stamps = view.frame(play)
    for (const sprite of [mammoth.body, mammoth.head, mammoth.ear, mammoth.leg]) {
      for (const at of stampsOf(stamps, sprite)) {
        expect(inBox({ x: at.cx, y: at.cy }, MAMMOTH)).toBe(true)
        expect(inBox({ x: at.cx, y: at.cy }, LIFT)).toBe(false)
        expect(touch(play, log, at.cx, at.cy)[0]).toMatchObject({ type: 'poke', who: 'mammoth' })
        play.release('cancel', undefined, false)
      }
    }
    // The whole of its body is inside its own box.
    const body = stampsOf(stamps, mammoth.body)[0]
    expect(body.x).toBeGreaterThanOrEqual(MAMMOTH.x - 1)
    expect(body.x + body.w).toBeLessThanOrEqual(MAMMOTH.x + MAMMOTH.w + 1)
  })

  it('the tip of its trunk rests on the crank, which is the lift: every other ring of the trunk is the mammoth', () => {
    const { play, log } = watched(layWorld(3, 'near'))
    run(play, 0.5)
    const rings = stampsOf(view.frame(play), pictures().mammoth.trunk)
    expect(rings.length).toBe(7)
    let onLift = 0
    for (const ring of rings) {
      const who = touch(play, log, ring.cx, ring.cy)[0]
      play.release('cancel', undefined, false)
      if (who.type === 'poke' && who.who === 'lift') {
        onLift += 1
        expect(Math.hypot(ring.cx - CRANK.x, ring.cy - CRANK.y)).toBeLessThan(30)
      } else expect(who).toMatchObject({ type: 'poke', who: 'mammoth' })
    }
    expect(onLift).toBeLessThanOrEqual(2)
  })
})
