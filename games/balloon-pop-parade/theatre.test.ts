import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { PERSONALITIES } from './clips'
import { applyPose, buildFriend } from './friends'
import { GROUND, skySlots, viewFor } from './layout'
import { MOMENTS, saveOf, type Moment } from './moments'
import { restPose, type Pose } from './pose'
import { MAX_BALLOONS, MAX_SHADOWS, MAX_STRINGS } from './scenery'
import { FLIGHT, handOf, REGROW_AFTER, Theatre, type Painter } from './theatre'
import { sharedVinyl } from './vinyl'
import { Vector3 } from 'three'

const VIEW = viewFor(1180, 820)
const KINDS: KindName[] = ['duck', 'frog', 'hippo', 'crab']

/** A painter that keeps what one frame drew. */
function recorder() {
  const frame = { balloons: [] as { x: number; y: number; wide: number; tall: number; colour: string; glow: number }[], strings: 0, shadows: 0, marchers: 0, hand: null as { x: number; y: number; size: number; press: number } | null, clouds: [1, 1, 1], poses: new Map<string, Pose>() }
  const painter: Painter = {
    place: (name, _kind, pose) => void frame.poses.set(name, { ...pose }),
    drop: (name) => void frame.poses.delete(name),
    balloon: (x, y, _z, wide, tall, _lean, colour, glow = 0) => void frame.balloons.push({ x, y, wide, tall, colour, glow }),
    string: () => void (frame.strings += 1),
    marcher: () => void (frame.marchers += 1),
    hand: (x, y, size, press) => void (frame.hand = { x, y, size, press }),
    cloud: (index, squash) => void (frame.clouds[index] = squash),
    shadow: () => void (frame.shadows += 1),
  }
  return { frame, painter, clear: () => { frame.balloons.length = 0; frame.strings = 0; frame.shadows = 0; frame.marchers = 0; frame.hand = null } }
}

/** A theatre on a made-up moment of a cycle. */
function staged(moment: Omit<Moment, 'position'>): Theatre {
  return new Theatre(saveOf({ position: 'bunches-mixed', ...moment }))
}

function solo(kind: KindName, colours: KindName[]) {
  return staged({ troop: { kind, size: 1, held: [false] }, sky: colours.map((colour) => ({ colour, count: 1 as const })), waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } })
}

const play = (theatre: Theatre, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) theatre.step(1 / 60) }
const tapSlot = (theatre: Theatre, slot: number) => {
  const at = skySlots(theatre.sky.length, VIEW)[slot]
  theatre.press(at.x, at.y, VIEW)
  theatre.release(VIEW)
}
const voices = (theatre: Theatre) => theatre.sounds.map((sound) => sound.voice)

describe('a touch', () => {
  it('is answered when the finger lands, with a sound in the same call, wherever it lands', () => {
    const theatre = solo('duck', ['duck', 'frog', 'duck', 'frog'])
    for (const [x, y] of [[skySlots(4, VIEW)[0].x, 3.1], [0, GROUND + 1], [-6.2, GROUND + 0.6], [3, 0], [6.9, -4.5], [-7, 4.9]]) {
      theatre.sounds.length = 0
      theatre.press(x, y, VIEW)
      expect(theatre.sounds.length, `at ${x}, ${y}`).toBeGreaterThan(0)
      theatre.cancel()
    }
  })

  it('squashes the bunch under the finger at once and holds it flat until the lift', () => {
    const theatre = solo('duck', ['duck', 'frog', 'duck', 'frog']), { frame, painter, clear } = recorder()
    const at = skySlots(4, VIEW)[1]
    theatre.press(at.x, at.y, VIEW)
    theatre.step(1 / 60)
    theatre.paint(painter, VIEW)
    const first = frame.balloons[1]
    expect(first.tall).toBeLessThan(0.99)
    expect(first.wide).toBeGreaterThan(1.01)
    play(theatre, 0.4)
    clear()
    theatre.paint(painter, VIEW)
    expect(frame.balloons[1].tall).toBeLessThan(0.75)
    expect(frame.balloons[1].tall).toBeGreaterThan(0.5)
  })

  it('reads a finger that lands just beside a bunch as on it, and one far from everything as on the air', () => {
    const theatre = solo('duck', ['duck', 'frog', 'duck', 'frog']), at = skySlots(4, VIEW)[2]
    expect(theatre.hit(at.x + 1.3, at.y - 1.2, VIEW)).toEqual({ on: 'bunch', slot: 2 })
    expect(theatre.hit(-2.6, -0.5, VIEW)).toEqual({ on: 'air' })
    // The scenery is touchable too: the cloud over the troop, and the hill under its feet.
    expect(theatre.hit(0.4, 0.5, VIEW)).toEqual({ on: 'cloud', index: 2 })
    expect(theatre.hit(3, GROUND - 0.8, VIEW)).toEqual({ on: 'hill' })
    expect(theatre.hit(0, GROUND + 1, VIEW)).toEqual({ on: 'friend', friend: 0 })
    expect(theatre.hit(-VIEW.width / 2 + 0.9, GROUND + 0.9, VIEW)).toEqual({ on: 'waiting' })
  })

  it('leaves the bunch in the sky when the press ends without a tap', () => {
    const theatre = solo('duck', ['duck', 'frog']), at = skySlots(2, VIEW)[0]
    theatre.press(at.x, at.y, VIEW)
    theatre.cancel()
    theatre.release(VIEW)
    play(theatre, 1)
    expect(theatre.troop.held).toEqual([false])
  })
})

describe('a bunch the child sends', () => {
  it.each(KINDS)('is caught by a %s of its colour: the balloon is in its hand when the flight ends, with its own catch', (kind) => {
    const theatre = solo(kind, [kind, kind === 'duck' ? 'frog' : 'duck']), { frame, painter, clear } = recorder()
    tapSlot(theatre, 0)
    expect(theatre.troop.held).toEqual([true])
    // The friend stands as one without a balloon until the balloon is there.
    theatre.paint(painter, VIEW)
    expect(frame.poses.get('friend-0')!.armL).toBeGreaterThan(2)
    play(theatre, FLIGHT + 0.05)
    expect(voices(theatre)).toContain(`${kind}Catch`)
    // The ending plays, and then the friend stands holding its balloon.
    play(theatre, 9)
    expect(theatre.playing).toBe(null)
    clear()
    theatre.paint(painter, VIEW)
    const mine = frame.balloons.filter((balloon) => balloon.y < 2 && balloon.y > GROUND + 2)
    expect(mine).toHaveLength(1)
    expect(frame.poses.get('friend-0')!.armL).toBeLessThan(0.6)
  })

  it.each(KINDS)('is refused by a %s of another colour in its own way, and nothing is lost', (kind) => {
    const other: KindName = kind === 'duck' ? 'frog' : 'duck'
    const theatre = solo(kind, [kind, other])
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + 0.02)
    expect(voices(theatre)).toContain(`${kind}Refuse`)
    // The balloon hangs beside the friend until the refusal lands on it.
    expect(voices(theatre)).not.toContain('pop')
    play(theatre, PERSONALITIES[kind].cue.hit + 0.05)
    // The hippo sneezes it away flat; the others pop it.
    expect(voices(theatre)).toContain(kind === 'hippo' ? 'raspberry' : 'pop')
    play(theatre, 2)
    expect(theatre.troop.held).toEqual([false])
    const { frame, painter } = recorder()
    theatre.paint(painter, VIEW)
    expect(frame.balloons, 'the sky is as it was and nothing else is left').toHaveLength(2)
  })

  it.each(KINDS)('carries a %s off its feet when it is one too many, gets away, and the friend comes down with what it had', (kind) => {
    const theatre = solo(kind, [kind, kind]), { frame, painter, clear } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 1.5)
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + PERSONALITIES[kind].cue.letGo - 0.05)
    theatre.paint(painter, VIEW)
    const height = BODIES[kind].height
    expect(frame.poses.get('friend-0')!.y - GROUND, 'in the air').toBeGreaterThan(PERSONALITIES[kind].carried * height * 0.7)
    play(theatre, 2.5)
    clear()
    theatre.paint(painter, VIEW)
    expect(frame.poses.get('friend-0')!.y - GROUND, 'down again').toBeLessThan(0.1)
    expect(theatre.troop.held).toEqual([true])
    expect(voices(theatre)).toEqual(expect.arrayContaining([`${kind}LiftOff`, `${kind}Land`, 'pop', 'squeal']))
    expect(frame.balloons, 'two in the sky and the one it holds').toHaveLength(3)
  })

  it('goes one each to a troop it fits, all at once', () => {
    const moment = MOMENTS.bunches
    const theatre = new Theatre(saveOf(moment))
    tapSlot(theatre, 2)
    expect(theatre.troop.held).toEqual([true, true, true])
    play(theatre, FLIGHT + 0.05)
    // The hippos' honks come one after another, stepping down.
    const honks = theatre.sounds.filter((sound) => sound.voice === 'hippoCatch')
    expect(honks).toHaveLength(3)
    expect(honks[0].after).toBeLessThan(honks[1].after)
    expect(honks[1].after).toBeLessThan(honks[2].after)
    expect(honks[0].pitch).toBeGreaterThan(honks[2].pitch * 1.1)
  })

  it('carries a whole troop off at the same moment when each of them is given one more, and brings them down one after another', () => {
    const moment = MOMENTS.bunches, theatre = new Theatre(saveOf(moment)), { frame, painter, clear } = recorder()
    tapSlot(theatre, 2)
    play(theatre, 2)
    theatre.sounds.length = 0
    tapSlot(theatre, 2)
    play(theatre, FLIGHT + PERSONALITIES.hippo.cue.letGo - 0.1)
    theatre.paint(painter, VIEW)
    for (const name of ['friend-0', 'friend-1', 'friend-2']) expect(frame.poses.get(name)!.y - GROUND, name).toBeGreaterThan(0.1)
    play(theatre, 3)
    const lifts = theatre.sounds.filter((sound) => sound.voice === 'hippoLiftOff'), lands = theatre.sounds.filter((sound) => sound.voice === 'hippoLand')
    expect(lifts.map((sound) => sound.after)).toEqual([0, 0, 0])
    expect(lifts[2].pitch).toBeGreaterThan(lifts[0].pitch * 1.1)
    expect(lands.map((sound) => sound.after)).toEqual([0, 0.11, 0.22])
    clear()
    theatre.paint(painter, VIEW)
    expect(theatre.troop.held).toEqual([true, true, true])
    expect(frame.balloons, 'the sky of six and one each').toHaveLength(9)
  })

  it('has the nearest friend take one too many in its other hand and be carried off alone', () => {
    const troop = { kind: 'duck' as const, size: 3 as const, held: [true, true, true] }
    const theatre = staged({ troop, sky: [{ colour: 'duck', count: 1 }, { colour: 'frog', count: 1 }, { colour: 'duck', count: 1 }], waiting: { kind: 'frog', size: 1 } }), { frame, painter } = recorder()
    // The place on the right is nearest the duck on the right.
    tapSlot(theatre, 2)
    play(theatre, FLIGHT + 0.6)
    theatre.paint(painter, VIEW)
    expect(frame.poses.get('friend-2')!.y - GROUND).toBeGreaterThan(0.3)
    expect(frame.poses.get('friend-0')!.y - GROUND).toBeLessThan(0.1)
    expect(frame.poses.get('friend-1')!.y - GROUND).toBeLessThan(0.1)
    expect(voices(theatre)).toContain('squeal')
  })

  it('knocks the balloon a friend already holds when that friend refuses another colour', () => {
    const theatre = staged({ troop: { kind: 'crab', size: 1, held: [true] }, sky: [{ colour: 'crab', count: 1 }, { colour: 'duck', count: 1 }], waiting: { kind: 'frog', size: 1 } }), { frame, painter, clear } = recorder()
    theatre.paint(painter, VIEW)
    const before = frame.balloons.find((balloon) => balloon.y < 2 && balloon.y > GROUND + 2)!
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + PERSONALITIES.crab.cue.hit + 0.12)
    expect(voices(theatre)).toContain('bonk')
    clear()
    theatre.paint(painter, VIEW)
    const after = frame.balloons.find((balloon) => balloon.colour === before.colour && balloon.y < 2.2 && balloon.y > GROUND + 1)!
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(0.3)
    play(theatre, 3)
    expect(theatre.troop.held).toEqual([true])
  })

  it('is refused by a friend who is still without a balloon when there is one', () => {
    const moment = MOMENTS.pair, theatre = new Theatre(saveOf(moment)), { frame, painter } = recorder()
    // The purple balloon hangs nearest the duck that already has one.
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + 0.3)
    theatre.paint(painter, VIEW)
    expect(frame.poses.get('friend-0')!.turn).toBe(0)
    expect(Math.abs(frame.poses.get('friend-1')!.headTurn) + Math.abs(frame.poses.get('friend-1')!.turn)).toBeGreaterThan(0.1)
  })

  it('comes back to its place in the sky, the same bunch, after it has gone', () => {
    const theatre = solo('frog', ['frog', 'crab', 'frog']), { frame, painter, clear } = recorder()
    tapSlot(theatre, 0)
    play(theatre, REGROW_AFTER - 0.1)
    theatre.paint(painter, VIEW)
    const during = frame.balloons.filter((balloon) => balloon.y > 2.4).length
    expect(during).toBe(2)
    play(theatre, 1.2)
    clear()
    theatre.paint(painter, VIEW)
    expect(frame.balloons.filter((balloon) => balloon.y > 2.4)).toHaveLength(3)
    expect(theatre.sky).toHaveLength(3)
    expect(voices(theatre)).toContain('bloop')
  })
})

describe('a friend that is poked', () => {
  it('answers in its own voice, and the string of a balloon it holds hums', () => {
    const theatre = staged({ troop: { kind: 'frog', size: 1, held: [true] }, sky: [{ colour: 'frog', count: 1 }], waiting: { kind: 'duck', size: 1 } })
    theatre.press(0, GROUND + 1, VIEW)
    expect(voices(theatre)).toEqual(['frogPoke', 'stringHum'])
    const empty = solo('frog', ['frog'])
    empty.press(0, GROUND + 1, VIEW)
    expect(voices(empty)).toEqual(['frogPoke'])
  })
})

describe('a balloon a friend holds', () => {
  it('pops the moment the finger lands on it, and the friend reaches up again', () => {
    const theatre = solo('crab', ['crab', 'duck']), { frame, painter } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 2)
    theatre.paint(painter, VIEW)
    const mine = frame.balloons.find((balloon) => balloon.y < 2 && balloon.y > GROUND + 2)!
    theatre.sounds.length = 0
    theatre.press(mine.x, mine.y, VIEW)
    expect(voices(theatre)).toEqual(expect.arrayContaining(['pop', 'crabStartle']))
    expect(theatre.troop.held).toEqual([false])
    theatre.release(VIEW)
    play(theatre, 2)
    const after = recorder()
    theatre.paint(after.painter, VIEW)
    expect(after.frame.poses.get('friend-0')!.armL).toBeGreaterThan(2)
    expect(after.frame.balloons).toHaveLength(2)
  })
})

describe('a frame', () => {
  it('never asks for more than the stage holds, however fast a child taps', () => {
    // The counted frame budget: what a frame draws is these three lists and at most six friends.
    for (const name of Object.keys(MOMENTS)) {
      const moment = MOMENTS[name], theatre = new Theatre(saveOf(moment)), { frame, painter, clear } = recorder()
      let seed = 7
      const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
      let most = { balloons: 0, strings: 0, shadows: 0, friends: 0 }
      for (let i = 0; i < 60 * 25; i++) {
        if (i % 7 === 0) {
          theatre.press((random() - 0.5) * VIEW.width, (random() - 0.5) * VIEW.height, VIEW)
          if (random() < 0.9) theatre.release(VIEW)
          else theatre.cancel()
        }
        theatre.step(1 / 60)
        clear()
        theatre.paint(painter, VIEW)
        most = { balloons: Math.max(most.balloons, frame.balloons.length), strings: Math.max(most.strings, frame.strings), shadows: Math.max(most.shadows, frame.shadows), friends: Math.max(most.friends, frame.poses.size) }
        for (const pose of frame.poses.values()) for (const value of Object.values(pose)) expect(Number.isFinite(value)).toBe(true)
        for (const balloon of frame.balloons) expect(Number.isFinite(balloon.x + balloon.y + balloon.wide + balloon.tall)).toBe(true)
      }
      expect(most.balloons, `${name} balloons`).toBeLessThanOrEqual(MAX_BALLOONS)
      expect(most.strings, `${name} strings`).toBeLessThanOrEqual(MAX_STRINGS)
      expect(most.shadows, `${name} shadows`).toBeLessThanOrEqual(MAX_SHADOWS)
      expect(most.friends, `${name} friends`).toBeLessThanOrEqual(6)
      theatre.sounds.length = 0
    }
  }, 20_000)

  it('settles: left alone after any play, only the sky, the held balloons and the friends are drawn', () => {
    const moment = MOMENTS.mixed, theatre = new Theatre(saveOf(moment)), { frame, painter } = recorder()
    for (let slot = 0; slot < 4; slot++) { tapSlot(theatre, slot); play(theatre, 0.2) }
    play(theatre, 6)
    theatre.paint(painter, VIEW)
    const inSky = moment.sky.reduce((sum, bunch) => sum + bunch.count, 0)
    expect(frame.balloons).toHaveLength(inSky + theatre.troop.held.filter(Boolean).length)
  })

  it('plays the same for the same touches', () => {
    const run = () => {
      const theatre = solo('frog', ['frog', 'crab', 'frog', 'crab']), { frame, painter } = recorder()
      for (const slot of [1, 0, 2]) { tapSlot(theatre, slot); play(theatre, 0.7) }
      theatre.paint(painter, VIEW)
      return JSON.stringify([frame.balloons, [...frame.poses], theatre.sounds])
    }
    expect(run()).toBe(run())
  })
})

describe('the idle guidance', () => {
  const glowing = { glow: 1, demo: null, demoIndex: -1 }
  const showing = (index: number) => ({ glow: 1, demo: 0.43, demoIndex: index })

  it('swells the bunches while the troop wants balloons, and never touches their colour', () => {
    const theatre = solo('duck', ['duck', 'frog', 'duck', 'frog']), { frame, painter, clear } = recorder()
    theatre.paint(painter, VIEW)
    const plain = frame.balloons.map((balloon) => balloon.colour)
    clear()
    theatre.paint(painter, VIEW, glowing)
    expect(frame.balloons.every((balloon) => balloon.glow > 0)).toBe(true)
    expect(frame.balloons.map((balloon) => balloon.colour)).toEqual(plain)
    expect([...frame.poses.values()].every((pose) => pose.glow === 0)).toBe(true)
  })

  it('shows one move with the hand: a tap on one place after another, whatever hangs there', () => {
    const theatre = solo('duck', ['duck', 'frog', 'duck', 'frog']), { frame, painter, clear } = recorder(), places = skySlots(4, VIEW)
    const tapped: number[] = []
    for (let demo = 0; demo < 4; demo++) {
      clear()
      theatre.paint(painter, VIEW, showing(demo))
      expect(frame.hand!.press).toBeGreaterThan(0.9)
      const slot = places.findIndex((place) => Math.abs(place.x - frame.hand!.x) < 1)
      tapped.push(slot)
      // The bunch under the hand squashes as a touched one would, and nothing is sent.
      expect(frame.balloons[slot].tall).toBeLessThan(0.85)
    }
    expect(new Set(tapped).size, 'not always the same place').toBeGreaterThan(1)
    expect(tapped.map((slot) => theatre.sky[slot].colour), 'not only the troop\'s own colour').toContain('frog')
    expect(theatre.save.troop.held).toEqual([false])
  })

  it('moves to the troop that waits once the troop on screen is served: one next act at a time', () => {
    const theatre = staged({ troop: { kind: 'duck', size: 1, held: [true] }, sky: [{ colour: 'duck', count: 1 }, { colour: 'frog', count: 1 }], waiting: { kind: 'frog', size: 2 } }), { frame, painter } = recorder()
    theatre.paint(painter, VIEW, showing(0))
    expect(frame.balloons.every((balloon) => balloon.glow === 0)).toBe(true)
    expect(frame.poses.get('waiting-0')!.glow).toBeGreaterThan(0)
    expect(frame.poses.get('friend-0')!.glow).toBe(0)
    expect(frame.hand!.x, 'the hand is at the edge, by the troop that waits').toBeLessThan(-VIEW.width / 2 + 3)
  })

  it('shows nothing while a bunch is in the air or a scene plays', () => {
    const theatre = solo('duck', ['duck', 'frog']), { frame, painter, clear } = recorder()
    tapSlot(theatre, 0)
    theatre.paint(painter, VIEW, showing(0))
    expect(frame.hand).toBe(null)
    expect(frame.balloons.every((balloon) => balloon.glow === 0)).toBe(true)
    play(theatre, 1.4)
    expect(theatre.playing).toBe('ending')
    clear()
    theatre.paint(painter, VIEW, showing(0))
    expect(frame.hand).toBe(null)
  })
})

describe('the scenery', () => {
  it('answers a touch on a cloud with a squeak, a squash and drops that fall and are gone', () => {
    const theatre = solo('duck', ['duck', 'frog']), { frame, painter, clear } = recorder()
    theatre.press(0.4, 0.5, VIEW)
    expect(voices(theatre)).toEqual(['cloudSqueak', 'patter'])
    play(theatre, 0.1)
    theatre.paint(painter, VIEW)
    expect(frame.clouds[2]).toBeLessThan(0.95)
    expect(frame.balloons.length, 'the sky of two and seven drops').toBe(9)
    play(theatre, 2)
    clear()
    theatre.paint(painter, VIEW)
    expect(frame.balloons).toHaveLength(2)
    expect(frame.clouds[2]).toBeCloseTo(1, 1)
  })

  it('answers a touch on the hill with a wobble that the friends ride', () => {
    const theatre = solo('hippo', ['hippo', 'duck']), { frame, painter } = recorder()
    theatre.press(3, GROUND - 0.8, VIEW)
    expect(voices(theatre)).toEqual(['hillBoing'])
    let highest = 0
    for (let i = 0; i < 40; i++) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      highest = Math.max(highest, frame.poses.get('friend-0')!.y - GROUND)
    }
    expect(highest).toBeGreaterThan(0.05)
    expect(frame.shadows, 'a dimple where it was touched').toBeGreaterThan(2)
  })

  it('has the spare balloons of a bunch bigger than a served troop bump the cloud, which sheds its drops on the troop', () => {
    const theatre = staged({ troop: { kind: 'duck', size: 2, held: [true, true] }, sky: [{ colour: 'duck', count: 1 }, { colour: 'duck', count: 3 }], waiting: { kind: 'frog', size: 1 } }), { frame, painter } = recorder()
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + PERSONALITIES.duck.cue.letGo + 0.4)
    expect(voices(theatre)).toEqual(expect.arrayContaining(['cloudSqueak', 'patter']))
    theatre.paint(painter, VIEW)
    expect(frame.clouds[2]).not.toBe(1)
    // The troop blinks under the drops.
    expect(frame.poses.get('friend-0')!.blink).toBe(1)
    play(theatre, 3)
    expect(theatre.save.troop.held).toEqual([true, true])
  })
})

describe('the far hill', () => {
  it('shows the troops that were served going round with the balloons they carried off, and nothing else', () => {
    const save = { ...saveOf(MOMENTS.solo), parade: [{ kind: 'duck' as const, size: 2 as const, balloons: 2 }, { kind: 'crab' as const, size: 3 as const, balloons: 1 }] }
    const theatre = new Theatre(save), { frame, painter } = recorder()
    theatre.paint(painter, VIEW)
    expect(frame.marchers).toBe(5)
    // The sky of four, and three balloons on the far hill, each a paler one of its troop's colour.
    expect(frame.balloons).toHaveLength(7)
  })
})

describe('the hand that holds the string', () => {
  it('is where the meshes put it, in any pose', () => {
    const shared = sharedVinyl(), out = { x: 0, y: 0, z: 0 }, world = new Vector3()
    for (const kind of KINDS) {
      const rig = buildFriend(kind, 'test', shared)
      const pose: Pose = { ...restPose(), x: 1.2, y: -3.1, z: 0.4, scale: 1.08, turn: 0.7, lean: -0.2, bow: 0.3, squash: 0.8, armR: 2.1, armRForward: 0.5 }
      applyPose(rig, pose)
      rig.root.updateWorldMatrix(true, true)
      rig.armR.localToWorld(world.copy(rig.hand))
      handOf(BODIES[kind], pose, out)
      expect(out.x, kind).toBeCloseTo(world.x, 4)
      expect(out.y, kind).toBeCloseTo(world.y, 4)
      expect(out.z, kind).toBeCloseTo(world.z, 4)
      // And the other hand, which takes a bunch when the string hand is full.
      const other: Pose = { ...pose, armL: 2.4, armLForward: 0.3 }
      applyPose(rig, other)
      rig.root.updateWorldMatrix(true, true)
      rig.armL.localToWorld(world.set(BODIES[kind].hand[0], BODIES[kind].hand[1], BODIES[kind].hand[2]))
      handOf(BODIES[kind], other, out, true)
      expect(out.x, `${kind} left`).toBeCloseTo(world.x, 4)
      expect(out.y, `${kind} left`).toBeCloseTo(world.y, 4)
      expect(out.z, `${kind} left`).toBeCloseTo(world.z, 4)
      rig.material.dispose()
    }
  })
})
