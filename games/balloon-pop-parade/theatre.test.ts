import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { PERSONALITIES } from './clips'
import { applyPose, buildFriend } from './friends'
import { BALLOON, CLOUDS, FAR_HILL, farGroundAt, friendX, GROUND, seenAt, skySlots, viewFor, hillSeenTop, groundAt, FRIEND_SCALE } from './layout'
import { MOMENTS, saveOf, type Moment } from './moments'
import { freshSave } from './save'
import { restPose, type Pose } from './pose'
import { MAX_BALLOONS, MAX_SHADOWS, MAX_STRINGS } from './scenery'
import { HUT } from './setting'
import { FLIGHT, handOf, REGROW_AFTER, SIDE_BY_SIDE, Theatre, type Painter } from './theatre'
import { sharedVinyl } from './vinyl'
import { type Mesh, Vector3 } from 'three'

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
/** A tap on a bunch in the sky where it is seen: beside whatever has risen in front of it, as the bunch that carries a friend off does. */
const tapSeen = (theatre: Theatre, slot: number) => {
  const at = skySlots(theatre.sky.length, VIEW)[slot]
  for (const dy of [0, -0.35, 0.35, -0.7, 0.7]) for (const dx of [0, -0.35, 0.35, -0.7, 0.7]) {
    const hit = theatre.hit(at.x + dx, at.y + dy, VIEW)
    if (hit.on !== 'bunch' || hit.slot !== slot) continue
    theatre.press(at.x + dx, at.y + dy, VIEW)
    theatre.release(VIEW)
    return
  }
  throw new Error(`no part of the bunch in place ${slot} is seen`)
}

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

  it('on a balloon whips its string: the loose end is flung aside from the first frame and hangs straight again soon after', () => {
    for (const count of [1, 3] as const) {
      const theatre = staged({ troop: { kind: 'duck', size: 3, held: [false, false, false] }, sky: [{ colour: 'duck', count }, { colour: 'frog', count: 1 }], waiting: { kind: 'frog', size: 1 } })
      const ends: { x0: number; y0: number; x1: number; y1: number }[] = []
      const painter: Painter = { ...recorder().painter, string: (x0, y0, _z0, x1, y1) => void ends.push({ x0, y0, x1, y1 }) }
      const at = skySlots(2, VIEW)[0]
      // How far the lowest end of any string under the pressed bunch is from the middle of the bunch, sideways.
      const flung = () => {
        ends.length = 0
        theatre.paint(painter, VIEW)
        const under = ends.filter((end) => Math.abs(end.x0 - at.x) < 1.6 && end.y0 > 0)
        const lowest = under.reduce((low, end) => (end.y1 < low.y1 ? end : low))
        return { aside: Math.abs(lowest.x1 - at.x), pieces: under.length }
      }
      play(theatre, 0.5)
      const before = flung()
      theatre.press(at.x, at.y, VIEW)
      theatre.step(1 / 60)
      theatre.step(1 / 60)
      expect(flung().pieces, `a bunch of ${count}`).toBe(before.pieces + 1)
      let most = 0
      for (let i = 0; i < 12; i++) { theatre.step(1 / 60); most = Math.max(most, flung().aside) }
      expect(most - before.aside, `a bunch of ${count}`).toBeGreaterThan(0.12)
      theatre.cancel()
      play(theatre, 2)
      const after = flung()
      expect(after.pieces).toBe(before.pieces)
      expect(Math.abs(after.aside - before.aside)).toBeLessThan(0.12)
    }
  })

  it('is left alone in the top right corner, which is the grown-up\'s', () => {
    const moment = MOMENTS.mixed, theatre = new Theatre(saveOf(moment)), before = JSON.stringify(theatre.save)
    theatre.press(VIEW.width / 2 - 0.3, VIEW.height / 2 - 0.3, VIEW)
    theatre.release(VIEW)
    expect(theatre.sounds).toHaveLength(0)
    expect(JSON.stringify(theatre.save)).toBe(before)
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
    // One hill, one answer: the strip of pink at and behind the friends' feet, up to the hill's crest as it is seen,
    // is the hill too, all the way across; a little above the crest it is not.
    for (const x of [-6.8, -4, -2.2, 2.2, 4, 6.8]) {
      const top = hillSeenTop(x, VIEW)
      expect(top, `the crest is above the feet at ${x}`).toBeGreaterThan(groundAt(x, 0) + 0.1)
      // (Or whatever stands on the hill in front of that strip: the troop that waits, the whale in its pool, the ball.)
      const onHill = ['hill', 'waiting', 'whale', 'ball']
      expect(onHill, `just under the crest at ${x}`).toContain(theatre.hit(x, top - 0.04, VIEW).on)
      expect(onHill, `at the feet's height at ${x}`).toContain(theatre.hit(x, GROUND - 0.05, VIEW).on)
      expect(theatre.hit(x, top + 0.12, VIEW).on, `just over the crest at ${x}`).not.toBe('hill')
    }
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
    // It stands as one that has its balloon: its free arm down, its eyes on the balloon and no longer on the sky.
    expect(frame.poses.get('friend-0')!.armL).toBeLessThan(0.6)
    // A positive turn of the head looks to the child's right, and that is the side its balloon hangs on.
    expect(mine[0].x).toBeGreaterThan(frame.poses.get('friend-0')!.x)
    expect(frame.poses.get('friend-0')!.headTurn).toBeGreaterThan(0.05)
  })

  it.each(KINDS)('is refused by a %s of another colour in its own way, and nothing is lost', (kind) => {
    const other: KindName = kind === 'duck' ? 'frog' : 'duck'
    const theatre = solo(kind, [kind, other])
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + 0.02)
    expect(voices(theatre)).toContain(`${kind}Refuse`)
    // The balloon hangs beside the friend until the refusal lands on it.
    expect(voices(theatre)).not.toContain('pop')
    // The hippo sneezes it away flat; the duck and the crab pop it where it hangs; the frog bounces it off, and then it pops.
    play(theatre, PERSONALITIES[kind].cue.hit + (kind === 'frog' ? 0.4 : 0.05))
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

  it.each(KINDS)('shows a %s the bunch it cannot have, read against the friends one for one: a balloon over each that still reaches, the rest over ground where nobody stands', (kind) => {
    // Two for one friend that reaches (the other has its own); three for two that reach; three for one alone.
    for (const [held, count] of [[[true, false], 2], [[false, false], 3], [[false], 3], [[false, true, false], 3]] as const) {
      const size = held.length
      const theatre = staged({ troop: { kind, size, held: [...held] }, sky: [{ colour: kind, count: 1 }, { colour: kind, count }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } }), { frame, painter, clear } = recorder()
      tapSlot(theatre, 1)
      play(theatre, FLIGHT + PERSONALITIES[kind].cue.grab + 0.25)
      clear()
      theatre.paint(painter, VIEW)
      // The bunch that strains upwards is drawn taller than it is wide, and nothing else is.
      const bunch = frame.balloons.filter((balloon) => balloon.tall > 1.05 && balloon.wide < 0.99).map((balloon) => balloon.x)
      expect(bunch.length, `${count} for ${held.join()}`).toBe(count)
      const reaching = held.map((holds, i) => (holds ? null : frame.poses.get(`friend-${i}`)!.x)).filter((x): x is number => x !== null)
      const everyone = held.map((_, i) => friendX(i, size))
      // Each friend that still reaches has one straight over it.
      for (const x of reaching) expect(bunch.filter((at) => Math.abs(at - x) < 0.35), `over the friend at ${x.toFixed(1)}`).toHaveLength(1)
      // And every other balloon of the bunch is over a gap: more than a balloon's width from the middle of any friend.
      const spare = bunch.filter((at) => reaching.every((x) => Math.abs(at - x) >= 0.35))
      expect(spare, `${count} for ${held.join()}`).toHaveLength(count - reaching.length)
      for (const at of spare) for (const x of everyone) expect(Math.abs(at - x), 'nobody under it').toBeGreaterThan(1.3)
      // No two balloons of it overlap.
      for (const a of bunch) for (const b of bunch) if (a !== b) expect(Math.abs(a - b)).toBeGreaterThan(1.3)
    }
  })

  it('is swatted away by the duck\'s tail: the tail is at the balloon when the swat lands, on whichever side the balloon hangs', () => {
    const shared = sharedVinyl(), world = new Vector3()
    // One duck alone has the balloon on its right; the first of two has it on its left, where the motion is mirrored.
    for (const size of [1, 2] as const) {
      const theatre = staged({ troop: { kind: 'duck', size, held: Array.from({ length: size }, () => false) }, sky: [{ colour: 'frog', count: 1 }, { colour: 'duck', count: 1 }], waiting: { kind: 'frog', size: 1 } }), { frame, painter, clear } = recorder()
      const rig = buildFriend('duck', 'test', shared)
      tapSlot(theatre, 0)
      let nearest = Infinity
      for (let i = 0; i < 90; i++) {
        theatre.step(1 / 60)
        clear()
        theatre.paint(painter, VIEW)
        // The refused balloon is the only one below the row.
        const it = frame.balloons.find((balloon) => balloon.y < 1.5 && balloon.wide > 0.8)
        if (!it) continue
        applyPose(rig, frame.poses.get('friend-0')!)
        rig.root.updateWorldMatrix(true, true)
        // Every point of the tail's skin, as the meshes put it.
        const tail = rig.extra.children[0] as Mesh, at = tail.geometry.getAttribute('position')
        for (let v = 0; v < at.count; v++) {
          tail.localToWorld(world.fromBufferAttribute(at, v))
          nearest = Math.min(nearest, Math.hypot(world.x - it.x, world.y - it.y))
        }
      }
      rig.material.dispose()
      // Inside the balloon's own radius: the tail is on it.
      expect(nearest, `a troop of ${size}`).toBeLessThan(BALLOON)
    }
  })

  it('is bounced off a frog: it flies from the frog for a moment after the throat meets it, and then it pops', () => {
    const theatre = solo('frog', ['frog', 'duck']), { frame, painter, clear } = recorder()
    tapSlot(theatre, 1)
    const yellow = () => { clear(); theatre.paint(painter, VIEW); return frame.balloons.filter((balloon) => balloon.y < 2 && balloon.wide > 0.8) }
    // It hangs beside the frog until the refusal lands on it.
    play(theatre, FLIGHT + PERSONALITIES.frog.cue.hit - 0.2)
    const hung = yellow()
    expect(hung).toHaveLength(1)
    theatre.sounds.length = 0
    let furthest = 0, flew = 0
    for (let i = 0; i < 60; i++) {
      theatre.step(1 / 60)
      const now = yellow()
      if (now.length === 0) break
      if (voices(theatre).includes('pop')) break
      furthest = Math.max(furthest, Math.abs(now[0].x - hung[0].x))
      if (Math.abs(now[0].x - hung[0].x) > 0.05) flew += 1
    }
    expect(furthest, 'it went somewhere before it popped').toBeGreaterThan(0.9)
    expect(flew, 'over a good many frames').toBeGreaterThan(8)
    play(theatre, 0.5)
    expect(voices(theatre)).toContain('pop')
    expect(yellow()).toHaveLength(0)
  })

  it.each(KINDS)('hangs beside a %s for a beat before the refusal lands on it, the two colours side by side, where colour is new and where the refusal is shorter', (kind) => {
    const other: KindName = kind === 'duck' ? 'frog' : 'duck'
    for (const position of ['solo-two-colours', 'bunches-mixed']) for (let seed = 1; seed <= 6; seed++) {
      const save = saveOf({ position, troop: { kind, size: 1, held: [false] }, sky: [{ colour: kind, count: 1 }, { colour: other, count: 1 }], waiting: { kind: other, size: 1 } })
      const theatre = new Theatre(save, seed), { frame, painter, clear } = recorder()
      tapSlot(theatre, 1)
      // The refused balloon is the only one below the row that is not the friend's own colour.
      let last: { x: number; y: number } | null = null, hung = 0, began = -1
      for (let i = 0; i < 150; i++) {
        theatre.step(1 / 60)
        if (began < 0 && voices(theatre).includes(`${kind}Refuse`)) began = (i + 1) / 60
        clear()
        theatre.paint(painter, VIEW)
        const pose = frame.poses.get('friend-0')!
        const it = frame.balloons.find((balloon) => balloon.y < 1.8 && balloon.wide > 0.8 && Math.abs(balloon.x - pose.x) < 3.2)
        if (!it) { if (last) break; continue }
        // It hangs while it stays where it is, beside the friend; the flight before and whatever the refusal does to it are not hanging.
        if (last && Math.hypot(it.x - last.x, it.y - last.y) < 0.05 && i / 60 >= FLIGHT - 0.02) hung += 1
        else if (hung > 0) break
        last = { x: it.x, y: it.y }
      }
      expect(hung / 60, `${position}, seed ${seed}`).toBeGreaterThanOrEqual(SIDE_BY_SIDE - 0.04)
      // And the friend's answer still begins inside half a second of the touch.
      expect(began, `${position}, seed ${seed}`).toBeGreaterThan(0)
      expect(began).toBeLessThanOrEqual(0.5 + 1 / 60)
    }
  })

  it('is answered well inside half a second when it is the wrong colour: the friend begins to refuse it as it arrives', () => {
    const theatre = solo('duck', ['duck', 'frog'])
    tapSlot(theatre, 1)
    play(theatre, 0.42)
    expect(voices(theatre)).toContain('duckRefuse')
  })

  it('is refused at full length where colour is new, and more shortly once bunches have come: the look takes as long, what follows is quicker', () => {
    const timed = (position: string) => {
      const theatre = new Theatre(saveOf({ position, troop: { kind: 'crab', size: 1, held: [false] }, sky: [{ colour: 'crab', count: 1 }, { colour: 'duck', count: 1 }], waiting: { kind: 'frog', size: 1 } }), 3), { frame, painter } = recorder()
      tapSlot(theatre, 1)
      // The pop is the moment the pinch lands; the crab's eyes shoot up at it and come down again when it is over.
      let popped = -1, over = -1, up = false
      for (let i = 0; i < 240 && over < 0; i++) {
        theatre.step(1 / 60)
        if (popped < 0 && voices(theatre).includes('pop')) popped = i / 60
        theatre.paint(painter, VIEW)
        const puff = frame.poses.get('friend-0')!.puff
        if (puff > 1.5) up = true
        else if (up && puff < 1.1) over = i / 60
      }
      return { popped, after: over - popped }
    }
    const full = timed('solo-two-colours'), shorter = timed('bunches-mixed')
    expect(Math.abs(full.popped - shorter.popped)).toBeLessThan(0.02)
    expect(full.after).toBeGreaterThan(shorter.after + 0.06)
  })

  it('bounces the clouds when a hippo that was carried off sits down', () => {
    const theatre = solo('hippo', ['hippo', 'hippo']), { frame, painter } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 1.5)
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + PERSONALITIES.hippo.cue.land + 0.1)
    theatre.paint(painter, VIEW)
    expect(frame.clouds.every((squash) => squash > 1.01)).toBe(true)
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

  it('has the hippos yawn in a row, one after another, where the ducks jump at once', () => {
    /** When each friend of a troop of three is first seen to move for its catch, in seconds after the bunch is sent. */
    const starts = (kind: KindName) => {
      const theatre = staged({ troop: { kind, size: 3, held: [false, false, false] }, sky: [{ colour: kind, count: 1 }, { colour: kind, count: 3 }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } }), { frame, painter } = recorder()
      theatre.paint(painter, VIEW)
      tapSlot(theatre, 1)
      const first = [-1, -1, -1]
      for (let t = 0; t < 1.6; t += 1 / 60) {
        theatre.step(1 / 60)
        theatre.paint(painter, VIEW)
        // A catch brings the free arm down from reaching.
        for (let i = 0; i < 3; i++) if (first[i] < 0 && frame.poses.get(`friend-${i}`)!.armL < 2) first[i] = t
      }
      return first
    }
    const hippos = starts('hippo'), ducks = starts('duck')
    expect(hippos[1]).toBeGreaterThan(hippos[0] + 0.1)
    expect(hippos[2]).toBeGreaterThan(hippos[1] + 0.1)
    expect(Math.abs(ducks[2] - ducks[0])).toBeLessThan(0.05)
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
    // Each comes down later than the one before it, and is heard as it lands.
    const down = [-1, -1, -1], heard: number[] = []
    for (let i = 0; i < 180; i++) {
      const lands = theatre.sounds.filter((sound) => sound.voice === 'hippoLand').length
      theatre.step(1 / 60)
      if (theatre.sounds.filter((sound) => sound.voice === 'hippoLand').length > lands) heard.push(i)
      theatre.paint(painter, VIEW)
      for (let k = 0; k < 3; k++) if (down[k] < 0 && frame.poses.get(`friend-${k}`)!.y - GROUND < 0.02) down[k] = i
    }
    expect(down[1] - down[0]).toBeGreaterThanOrEqual(7)
    expect(down[2] - down[1]).toBeGreaterThanOrEqual(7)
    expect(heard).toHaveLength(3)
    expect(heard[1] - heard[0]).toBeGreaterThanOrEqual(7)
    expect(heard[2] - heard[1]).toBeGreaterThanOrEqual(7)
    const lifts = theatre.sounds.filter((sound) => sound.voice === 'hippoLiftOff'), lands = theatre.sounds.filter((sound) => sound.voice === 'hippoLand')
    expect(lifts.map((sound) => sound.after)).toEqual([0, 0, 0])
    expect(lifts[2].pitch).toBeGreaterThan(lifts[0].pitch * 1.1)
    expect(lands.map((sound) => sound.after)).toEqual([0, 0, 0])
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

  it.each(KINDS)('brings the balloon a %s holds round onto its head when it refuses another colour, as the bonk sounds', (kind) => {
    const other: KindName = kind === 'duck' ? 'frog' : 'duck'
    const theatre = staged({ troop: { kind, size: 1, held: [true] }, sky: [{ colour: kind, count: 1 }, { colour: other, count: 1 }], waiting: { kind: other, size: 1 } }), { frame, painter, clear } = recorder()
    tapSlot(theatre, 1)
    theatre.sounds.length = 0
    // How far the underside of its own balloon is above the top of its head, and how far to the side of its middle.
    let nearest = Infinity, aside = Infinity, bonkAt = -1, touchedAt = -1
    for (let i = 0; i < 150; i++) {
      theatre.step(1 / 60)
      const bonk = theatre.sounds.find((sound) => sound.voice === 'bonk')
      if (bonk && bonkAt < 0) bonkAt = i + Math.round(bonk.after * 60)
      clear()
      theatre.paint(painter, VIEW)
      const pose = frame.poses.get('friend-0')!, top = pose.y + BODIES[kind].height * FRIEND_SCALE * pose.squash
      const own = frame.balloons.filter((balloon) => balloon.y < 2.2 && balloon.y > pose.y + 1.2 && balloon.tall === 1 && balloon.wide === 1)[0]
      if (!own) continue
      const gap = own.y - BALLOON * 1.12 - top
      if (gap < nearest) { nearest = gap; aside = Math.abs(own.x - pose.x) }
      if (touchedAt < 0 && gap < 0.05 && Math.abs(own.x - pose.x) < 0.4) touchedAt = i
    }
    expect(nearest, 'its underside reaches the top of the head').toBeLessThan(0.05)
    expect(aside, 'over the head, not beside it').toBeLessThan(0.4)
    expect(bonkAt).toBeGreaterThan(0)
    expect(Math.abs(touchedAt - bonkAt), 'and the bonk sounds as it touches').toBeLessThanOrEqual(6)
    play(theatre, 2)
    expect(theatre.troop.held).toEqual([true])
  })

  it('still goes to the troop when four bunches are already in the air: it leaves the sky at the lift, and is caught when the friend has dealt with the others', () => {
    const theatre = solo('duck', ['frog', 'hippo', 'crab', 'frog', 'duck'])
    for (const slot of [0, 1, 2, 3]) { tapSlot(theatre, slot); play(theatre, 0.08) }
    expect(theatre.troop.held).toEqual([false])
    theatre.sounds.length = 0
    tapSlot(theatre, 4)
    // The fifth leaves the sky at the lift, as every bunch does, and the duck has its balloon.
    expect(voices(theatre)).toEqual(expect.arrayContaining(['letGo', 'whistle']))
    expect(theatre.troop.held).toEqual([true])
    // It is caught when the duck has refused the others: the first beside it, and those that waited with it.
    play(theatre, 8)
    expect(voices(theatre)).toContain('duckCatch')
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

describe('the frog\'s tongue', () => {
  /** A painter that keeps the thick strings of one frame: the pieces of the tongues. */
  function tongues() {
    const drawn: { x0: number; y0: number; x1: number; y1: number; thick: number }[] = []
    const painter: Painter = {
      place: () => {}, drop: () => {}, balloon: () => {}, shadow: () => {}, marcher: () => {}, hand: () => {}, cloud: () => {},
      string: (x0, y0, _z0, x1, y1, _z1, _colour, thick) => { if ((thick ?? 0) > 0.05) drawn.push({ x0, y0, x1, y1, thick: thick ?? 0 }) },
    }
    /** Each tongue from its mouth to its pad: the pieces follow one another, and the pad is the fat piece at the end. */
    const whole = () => {
      const pads = drawn.filter((piece) => piece.thick > 0.1)
      return pads.map((pad) => {
        const at = drawn.indexOf(pad), pieces = drawn.slice(at - 4, at)
        return { mouthX: pieces[0].x0, mouthY: pieces[0].y0, tipX: pad.x1, tipY: pad.y1, pieces }
      })
    }
    return { drawn, painter, whole }
  }

  it('goes up beside its neighbour\'s when two frogs take from one bunch, each to the balloon nearest it: the two never cross, and each is a bow with a pad and never a straight bar', () => {
    const theatre = staged({ troop: { kind: 'frog', size: 2, held: [false, false] }, sky: [{ colour: 'frog', count: 1 }, { colour: 'frog', count: 2 }], waiting: { kind: 'duck', size: 1 } }), { painter, whole } = tongues()
    tapSlot(theatre, 1)
    play(theatre, FLIGHT - 0.12)
    theatre.paint(painter, VIEW)
    const both = whole()
    expect(both).toHaveLength(2)
    const [left, right] = both[0].mouthX < both[1].mouthX ? both : [both[1], both[0]]
    // The frog on the left reaches the balloon on the left, and the one on the right the one on the right.
    expect(left.tipX).toBeLessThan(right.tipX)
    for (const tongue of both) {
      // The middle of the tongue is off the straight line from its mouth to its tip, by more than its own thickness.
      const middle = tongue.pieces[1], dx = tongue.tipX - tongue.mouthX, dy = tongue.tipY - tongue.mouthY
      const off = Math.abs((middle.x1 - tongue.mouthX) * dy - (middle.y1 - tongue.mouthY) * dx) / Math.hypot(dx, dy)
      expect(off).toBeGreaterThan(0.1)
    }
  })

  it('is how a frog that passes by takes the balloon that hangs low for it', () => {
    // A new game whose first showing is a frog: the child's troop is some other kind.
    for (let seed = 1; seed < 40; seed++) {
      const theatre = new Theatre(freshSave(2, seed), seed)
      let kind: KindName | null = null
      const { drawn, painter } = tongues()
      const spy: Painter = { ...painter, place: (name, placed) => { if (name === 'passer-0') kind = placed } }
      theatre.paint(spy, VIEW)
      if (kind !== 'frog') continue
      let most = 0
      for (let i = 0; i < 60 * 7; i++) {
        theatre.step(1 / 60)
        drawn.length = 0
        theatre.paint(spy, VIEW)
        most = Math.max(most, drawn.length)
      }
      // A whole tongue is four pieces and a pad, and nothing of it is left when the frog has gone.
      expect(most).toBe(5)
      expect(drawn).toHaveLength(0)
      return
    }
    throw new Error('no seed opened on a passing frog')
  })

  it('is what a frog that had no balloon hangs by when it is carried off, its arms dangling', () => {
    const two = staged({ troop: { kind: 'frog', size: 1, held: [false] }, sky: [{ colour: 'frog', count: 1 }, { colour: 'frog', count: 2 }], waiting: { kind: 'duck', size: 1 } }), drawnBy = tongues(), { frame, painter } = recorder()
    tapSlot(two, 1)
    play(two, FLIGHT + 0.7)
    two.paint(drawnBy.painter, VIEW)
    two.paint(painter, VIEW)
    const pose = frame.poses.get('friend-0')!
    expect(pose.y - GROUND, 'in the air').toBeGreaterThan(0.5)
    expect(drawnBy.drawn, 'one tongue, from its mouth up to the bunch').toHaveLength(1)
    expect(drawnBy.drawn[0].y1).toBeGreaterThan(drawnBy.drawn[0].y0 + 0.3)
    expect(pose.armL, 'its arms hang').toBeLessThan(1.2)
    expect(pose.armR).toBeLessThan(1.2)
  })

  it('is not what a frog with a balloon takes one more by: that is its other hand, a balloon in each', () => {
    const theatre = solo('frog', ['frog', 'frog']), drawnBy = tongues(), { frame, painter } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 7)
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + 0.7)
    theatre.paint(drawnBy.painter, VIEW)
    theatre.paint(painter, VIEW)
    const pose = frame.poses.get('friend-0')!
    expect(pose.y - GROUND, 'in the air').toBeGreaterThan(0.5)
    expect(drawnBy.drawn, 'no tongue').toHaveLength(0)
    expect(pose.armL, 'its other hand is up').toBeGreaterThan(2)
    expect(pose.armR, 'and so is the hand that holds its own').toBeGreaterThan(2)
  })
})

describe('a duck or a hippo that passes by', () => {
  it.each(['duck', 'hippo'] as const)('takes the string by its mouth first, as a %s does, and then has it in its hand', (wanted) => {
    for (let seed = 1; seed < 60; seed++) {
      const theatre = new Theatre(freshSave(2, seed), seed)
      let kind: KindName | null = null, x = 0
      const ends: number[] = []
      const painter: Painter = {
        ...recorder().painter,
        place: (name, placed, pose) => { if (name === 'passer-0') { kind = placed; x = pose.x } },
        // The string of the balloon it carries: the only thin string that ends on the friend, below its balloon.
        string: (_x0, y0, _z0, x1, y1, _z1, _colour, thick) => { if ((thick ?? 0) < 0.05 && y0 > GROUND + 3 && y1 < y0 - 1 && Math.abs(x1 - x) < 2) ends.push(Math.abs(x1 - x)) },
      }
      theatre.paint(painter, VIEW)
      if (kind !== wanted) continue
      let nearest = Infinity, last = 0
      for (let i = 0; i < 60 * 7 && kind !== null; i++) {
        theatre.step(1 / 60)
        ends.length = 0
        kind = null
        theatre.paint(painter, VIEW)
        if (ends.length === 0) continue
        nearest = Math.min(nearest, ends[0])
        last = ends[0]
      }
      // At the mouth the string is at the middle of the friend; in the hand it is out at its side.
      expect(nearest).toBeLessThan(0.2)
      expect(last).toBeGreaterThan(nearest + 0.2)
      return
    }
    throw new Error(`no seed opened on a passing ${wanted}`)
  })
})

describe('the director', () => {
  it.each(KINDS)('never has a %s take a poke the same way twice running', (kind) => {
    const theatre = solo(kind, [kind, kind === 'duck' ? 'frog' : 'duck']), { frame, painter } = recorder()
    const taken: string[] = []
    for (let poke = 0; poke < 4; poke++) {
      theatre.press(0, GROUND + 1, VIEW)
      theatre.release(VIEW)
      play(theatre, 0.3)
      theatre.paint(painter, VIEW)
      const pose = frame.poses.get('friend-0')!
      taken.push([pose.y - GROUND, pose.bow, pose.puff, pose.headTurn, pose.squash, pose.x].map((value) => value.toFixed(1)).join(' '))
      play(theatre, 2)
    }
    expect(taken[0]).not.toBe(taken[1])
    expect(taken[1]).not.toBe(taken[2])
    expect(taken[2]).not.toBe(taken[3])
  })
})

describe('a friend that is being carried off', () => {
  /** One friend with no balloon, a bunch of two of its colour that carries it off, and whatever else hangs in the sky. */
  const carried = (kind: KindName, others: { colour: KindName; count: 1 | 2 | 3 }[]) => {
    const theatre = staged({ troop: { kind, size: 1, held: [false] }, sky: [{ colour: kind, count: 2 }, ...others], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } })
    tapSlot(theatre, 0)
    play(theatre, FLIGHT + PERSONALITIES[kind].cue.grab + 0.3)
    return theatre
  }
  /** Plays on and keeps, frame by frame, how high the friend is and what has sounded so far. */
  /** Follows the first friend for so many seconds: how high it is in each frame and what has been heard by then. With `toTheLeap`, only until the leap that ends an ending begins, which is a rise of its own. */
  const follow = (theatre: Theatre, seconds: number, toTheLeap = false) => {
    const { frame, painter } = recorder(), high: number[] = [], heard: string[][] = []
    const leaping = () => (theatre as unknown as { actors: { leapAt?: number }[] }).actors[0].leapAt !== undefined
    for (let i = 0; i < seconds * 60 && !(toTheLeap && leaping()); i++) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      high.push(frame.poses.get('friend-0')!.y - GROUND)
      heard.push(voices(theatre))
    }
    return { high, heard }
  }

  it.each(KINDS)('goes on being carried off when a balloon of its own colour is sent to it: a %s comes down once, with a landing, and has its balloon', (kind) => {
    const theatre = carried(kind, [{ colour: kind, count: 1 }])
    theatre.sounds.length = 0
    tapSeen(theatre, 1)
    expect(theatre.troop.held).toEqual([true])
    const { high, heard } = follow(theatre, 5, true)
    // It never snaps down: from one frame to the next it moves no further than a fall does.
    for (let i = 1; i < high.length; i++) expect(Math.abs(high[i] - high[i - 1]), `frame ${i}`).toBeLessThan(0.35)
    // It lands once, and is heard landing; it does not rise a second time.
    const landed = heard.findIndex((voices) => voices.includes(`${kind}Land`))
    expect(landed).toBeGreaterThan(0)
    expect(heard[heard.length - 1].filter((voice) => voice === `${kind}Land`)).toHaveLength(1)
    expect(heard[heard.length - 1].filter((voice) => voice === `${kind}LiftOff`)).toHaveLength(0)
    // A hop of its own is all it does after it is down; the frog's catch has one.
    expect(Math.max(...high.slice(landed + 20))).toBeLessThan(BODIES[kind].height * PERSONALITIES[kind].carried * 0.5 + 0.35)
    // Its catch is heard when it is played, which is when it is down: never heard and not seen.
    const caught = heard.findIndex((voices) => voices.includes(`${kind}Catch`))
    expect(caught, 'the catch is heard').toBeGreaterThan(0)
    expect(caught, 'after the landing').toBeGreaterThanOrEqual(landed)
    expect(heard[heard.length - 1].filter((voice) => voice === `${kind}Catch`)).toHaveLength(1)
  })

  it.each(KINDS)('starts where it hangs when the balloon it holds is popped under it: a %s wobbles and is heard at once, and has no start left over for the ground', (kind) => {
    const theatre = solo(kind, [kind, kind]), { frame, painter, clear } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 6)
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + PERSONALITIES[kind].cue.grab + 0.3)
    clear()
    theatre.paint(painter, VIEW)
    const own = frame.balloons.filter((balloon) => balloon.tall === 1 && balloon.wide === 1 && balloon.y < 2.4)[0]
    theatre.sounds.length = 0
    theatre.press(own.x, own.y, VIEW)
    theatre.cancel()
    expect(voices(theatre)).toEqual(expect.arrayContaining(['pop', `${kind}Startle`]))
    // In the air it wobbles at once.
    let wobble = 0, last = frame.poses.get('friend-0')!.squash
    for (let i = 0; i < 12; i++) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      wobble = Math.max(wobble, Math.abs(frame.poses.get('friend-0')!.squash - last))
      last = frame.poses.get('friend-0')!.squash
    }
    expect(wobble).toBeGreaterThan(0.02)
    // And when it is down it reaches up again: it does not start a second time (a duck would leap, a crab hide its eyes).
    const { high, heard } = follow(theatre, 5)
    const landed = heard.findIndex((voices) => voices.includes(`${kind}Land`))
    expect(landed).toBeGreaterThan(0)
    expect(Math.max(...high.slice(landed + 25))).toBeLessThan(0.3)
    expect(heard[heard.length - 1].filter((voice) => voice === `${kind}Startle`)).toHaveLength(1)
    theatre.paint(painter, VIEW)
    expect(frame.poses.get('friend-0')!.armL).toBeGreaterThan(2)
  })

  it.each(KINDS)('refuses another colour when it is down again: beside a %s the bunch hangs and waits, and the refusal is heard after the landing', (kind) => {
    const other: KindName = kind === 'duck' ? 'frog' : 'duck'
    const theatre = carried(kind, [{ colour: other, count: 1 }])
    theatre.sounds.length = 0
    tapSeen(theatre, 1)
    const { heard } = follow(theatre, 6)
    const last = heard[heard.length - 1]
    const order = (voice: string) => heard.findIndex((voices) => voices.includes(voice))
    expect(order(`${kind}Land`)).toBeGreaterThan(0)
    expect(order(`${kind}Refuse`), 'the refusal begins when it has landed').toBeGreaterThan(order(`${kind}Land`))
    // What the refusal does to the bunch comes a beat after it begins, and not while the friend is in the air.
    // (The bunch that got away pops too, earlier: the refused balloon's pop is the last one.)
    const pops = last.filter((voice) => voice === 'pop').length
    const done = kind === 'hippo' ? order('raspberry') : heard.findIndex((voices) => voices.filter((voice) => voice === 'pop').length === pops)
    expect(done - order(`${kind}Refuse`)).toBeGreaterThanOrEqual(Math.round((SIDE_BY_SIDE - 0.05) * 60))
    expect(last.filter((voice) => voice === `${kind}Refuse`)).toHaveLength(1)
    expect(theatre.troop.held).toEqual([false])
  })

  it.each(KINDS)('lets the bunch that carries a %s be popped: a tap on it pops it at once, and the friend comes down from where it is', (kind) => {
    const theatre = carried(kind, [{ colour: kind, count: 1 }]), { frame, painter, clear } = recorder()
    theatre.paint(painter, VIEW)
    const bunch = frame.balloons.filter((balloon) => balloon.tall > 1.05 && balloon.wide < 0.99)
    expect(bunch).toHaveLength(2)
    const was = frame.poses.get('friend-0')!.y - GROUND
    // The one straight over it; and the other too, also where it has risen in front of a bunch in the sky: what is drawn in front is touched.
    for (const one of bunch) expect(theatre.hit(one.x, one.y, VIEW), 'each balloon of the carrying bunch').toEqual({ on: 'tug', friend: 0 })
    const over = bunch.sort((a, b) => Math.abs(a.x - frame.poses.get('friend-0')!.x) - Math.abs(b.x - frame.poses.get('friend-0')!.x))[0]
    expect(theatre.hit(over.x, over.y, VIEW)).toEqual({ on: 'tug', friend: 0 })
    theatre.sounds.length = 0
    theatre.press(over.x, over.y, VIEW)
    theatre.cancel()
    expect(voices(theatre).filter((voice) => voice === 'pop')).toHaveLength(2)
    clear()
    theatre.paint(painter, VIEW)
    expect(frame.balloons.filter((balloon) => balloon.tall > 1.05 && balloon.wide < 0.99)).toHaveLength(0)
    // It is where it was in that frame, and from there it only falls.
    expect(Math.abs(frame.poses.get('friend-0')!.y - GROUND - was)).toBeLessThan(0.3)
    const { high, heard } = follow(theatre, 3)
    for (let i = 1; i < high.length; i++) expect(high[i] - high[i - 1], `frame ${i}`).toBeLessThan(0.12)
    expect(heard[heard.length - 1]).toContain(`${kind}Land`)
    expect(theatre.troop.held).toEqual([false])
  })
})

describe('a troop that sets off while one of it is in the air', () => {
  it.each(KINDS)('lets a %s come down as it goes, from where it was, and lets the bunch that had hold of it get away', (kind) => {
    const theatre = staged({ troop: { kind, size: 1, held: [true] }, sky: [{ colour: kind, count: 1 }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } }), { frame, painter, clear } = recorder()
    // One more for a friend that has its balloon: it is carried off.
    tapSlot(theatre, 0)
    play(theatre, FLIGHT + PERSONALITIES[kind].cue.grab + 0.3)
    clear()
    theatre.paint(painter, VIEW)
    const up = frame.poses.get('friend-0')!.y - GROUND
    expect(frame.balloons.filter((balloon) => balloon.tall > 1.05 && balloon.wide < 0.99)).toHaveLength(1)
    // The troop that waits is tapped while it is up there.
    theatre.press(-VIEW.width / 2 + 1.1, GROUND + 0.9, VIEW)
    theatre.cancel()
    theatre.step(1 / 60)
    clear()
    theatre.paint(painter, VIEW)
    const leaving = frame.poses.get('leaving-0')!
    expect(Math.abs(leaving.y - GROUND - up), 'it is where it was').toBeLessThan(0.3)
    // The bunch is on its way out, as a balloon that got away is: taller than wide, and a little more so.
    expect(frame.balloons.filter((balloon) => balloon.tall > 1.05 && balloon.wide < 0.99)).toHaveLength(0)
    let high = leaving.y, lowest = Infinity
    for (let i = 0; i < 40; i++) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      const now = frame.poses.get('leaving-0')!.y
      expect(high - now, `frame ${i}`).toBeLessThan(0.4)
      high = now
      lowest = Math.min(lowest, now)
    }
    // It is on the ground soon (a frog goes on in hops).
    expect(lowest - GROUND).toBeLessThan(0.15)
  })
})

describe('the bunch that has hold of a friend', () => {
  it.each(KINDS)('hangs as it did when it took hold of a %s, also when the balloon that friend held is popped under it', (kind) => {
    const theatre = solo(kind, [kind, kind]), { frame, painter, clear } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 6)
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + PERSONALITIES[kind].cue.grab + 0.25)
    const look = () => { clear(); theatre.paint(painter, VIEW); return { pose: frame.poses.get('friend-0')!, tug: frame.balloons.filter((balloon) => balloon.tall > 1.05 && balloon.wide < 0.99), own: frame.balloons.filter((balloon) => balloon.tall === 1 && balloon.wide === 1 && balloon.y < 2.4) } }
    const before = look()
    expect(before.tug).toHaveLength(1)
    expect(before.own).toHaveLength(1)
    theatre.press(before.own[0].x, before.own[0].y, VIEW)
    theatre.cancel()
    expect(theatre.troop.held).toEqual([false])
    theatre.step(1 / 60)
    const after = look()
    expect(after.own).toHaveLength(0)
    expect(after.tug).toHaveLength(1)
    expect(Math.abs((after.tug[0].x - after.pose.x) - (before.tug[0].x - before.pose.x))).toBeLessThan(0.12)
  })
})

describe('a balloon a friend holds', () => {
  it('popped in a troop that had all of its own stops the troop swaying, and the others look at the empty hand', () => {
    for (const kind of KINDS) {
      const theatre = staged({ troop: { kind, size: 3, held: [true, true, true] }, sky: [{ colour: kind, count: 1 }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } }), { frame, painter, clear } = recorder()
      play(theatre, 1)
      theatre.paint(painter, VIEW)
      // The balloon of the friend in the middle: the others stand either side of it.
      const middle = frame.poses.get('friend-1')!.x
      const mine = frame.balloons.filter((balloon) => balloon.y < 2 && balloon.y > GROUND + 2).sort((a, b) => Math.abs(a.x - middle - 0.7) - Math.abs(b.x - middle - 0.7))[0]
      theatre.sounds.length = 0
      theatre.press(mine.x, mine.y, VIEW)
      theatre.cancel()
      expect(theatre.troop.held, kind).toEqual([true, false, true])
      expect(voices(theatre), kind).toContain('heels')
      const still: string[] = []
      for (let i = 0; i < 4; i++) {
        play(theatre, 0.25)
        clear()
        theatre.paint(painter, VIEW)
        const left = frame.poses.get('friend-0')!, right = frame.poses.get('friend-2')!
        // A positive turn looks to the child's right: the friend on the left looks right, the one on the right looks left.
        expect(left.headTurn, kind).toBeGreaterThan(0.4)
        expect(right.headTurn, kind).toBeLessThan(-0.4)
        still.push([left.x, left.y, left.lean, left.squash, left.puff, left.wag, right.x, right.lean, right.squash].map((value) => value.toFixed(4)).join(' '))
      }
      // Nothing of their breathing or swaying moved in that second.
      expect(new Set(still).size, kind).toBe(1)
      // Then they sway again, from where they stopped.
      play(theatre, 1.5)
      clear()
      theatre.paint(painter, VIEW)
      const after = frame.poses.get('friend-0')!
      expect([after.x, after.y, after.lean, after.squash, after.puff, after.wag, frame.poses.get('friend-2')!.x, frame.poses.get('friend-2')!.lean, frame.poses.get('friend-2')!.squash].map((value) => value.toFixed(4)).join(' '), kind).not.toBe(still[0])
      expect(Math.abs(after.headTurn), kind).toBeLessThan(0.3)
    }
  })

  it('pops the moment the finger lands on it, and the friend reaches up again', () => {
    const theatre = solo('crab', ['crab', 'duck']), { frame, painter } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 2)
    theatre.paint(painter, VIEW)
    const mine = frame.balloons.find((balloon) => balloon.y < 2 && balloon.y > GROUND + 2)!
    theatre.sounds.length = 0
    theatre.press(mine.x, mine.y, VIEW)
    // One friend alone is a troop too: it had all its balloons, so its heels squeak as it stops still.
    expect(voices(theatre)).toEqual(expect.arrayContaining(['pop', 'crabStartle', 'heels']))
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
    const theatre = staged({ troop: { kind: 'duck', size: 2, held: [true, true] }, sky: [{ colour: 'duck', count: 1 }, { colour: 'duck', count: 3 }], waiting: { kind: 'frog', size: 1 } }), { frame, painter, clear } = recorder()
    tapSlot(theatre, 1)
    // The cloud that hangs over the troop, as it is seen: the bunch's balloons are yellow, and nothing else yellow comes near it.
    const cloud = CLOUDS[CLOUDS.length - 1], seen = seenAt(cloud.x, cloud.y, cloud.z, VIEW, { x: 0, y: 0, scale: 1 })
    const near = () => {
      clear()
      theatre.paint(painter, VIEW)
      return frame.balloons.filter((balloon) => balloon.wide > 0.8 && Math.abs(balloon.x - seen.x) < 2.2 * cloud.scale * seen.scale + BALLOON && Math.abs(balloon.y - seen.y) < 0.55 * cloud.scale * seen.scale + BALLOON).length
    }
    // Until the bunch is let go the cloud is left alone; it squeaks in the very step a balloon reaches it.
    let squeakedAt = -1, touching = 0
    for (let i = 0; i < 60 * (FLIGHT + PERSONALITIES.duck.cue.letGo + 0.6) && squeakedAt < 0; i++) {
      theatre.step(1 / 60)
      if (voices(theatre).includes('cloudSqueak')) { squeakedAt = i / 60; touching = near() }
    }
    expect(squeakedAt).toBeGreaterThan(FLIGHT + PERSONALITIES.duck.cue.letGo)
    expect(touching, 'a balloon of the bunch is on the cloud as it squeaks').toBeGreaterThan(0)
    expect(voices(theatre)).toEqual(expect.arrayContaining(['cloudSqueak', 'patter']))
    play(theatre, 0.1)
    theatre.paint(painter, VIEW)
    expect(frame.clouds[2]).not.toBe(1)
    // The troop blinks under the drops.
    expect(frame.poses.get('friend-0')!.blink).toBe(1)
    play(theatre, 3)
    expect(theatre.save.troop.held).toEqual([true, true])
  })
})

describe('the troop that waits', () => {
  it('is one thing to touch, a hundred logical pixels across or more on every surface, whatever kind waits and however many', () => {
    for (const [w, h] of [[1180, 820], [820, 1180], [1024, 640], [844, 390]]) for (const kind of KINDS) for (const size of [1, 2, 3] as const) {
      const view = viewFor(w, h)
      const theatre = staged({ troop: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1, held: [false] }, sky: [{ colour: 'duck', count: 1 }], waiting: { kind, size } })
      // Along a line at the height of its middle, from the left edge of the surface: how far the touch is the waiting troop's.
      let wide = 0
      for (let x = -view.width / 2; x < 0 && theatre.hit(x, GROUND + 0.6, view).on === 'waiting'; x += 0.02) wide += 0.02
      expect(wide * view.pixelsPerUnit, `${size} ${kind}s waiting on ${w} by ${h}`).toBeGreaterThanOrEqual(100)
    }
  })
})

describe('the far hill', () => {
  it('answers a touch: a troop that is touched squeaks in its own voice, small and quiet, and jumps, and the others jump after it', () => {
    const save = { ...saveOf(MOMENTS.solo), parade: [{ kind: 'duck' as const, size: 2 as const, balloons: 2 }, { kind: 'crab' as const, size: 3 as const, balloons: 1 }] }
    const theatre = new Theatre(save)
    const far: { kind: KindName; x: number; y: number; z: number }[] = []
    const painter: Painter = { ...recorder().painter, marcher: (kind, x, y, z) => void far.push({ kind, x, y, z }) }
    const look = () => { far.length = 0; theatre.paint(painter, VIEW); return far.map((marcher) => ({ ...marcher })) }
    play(theatre, 0.5)
    const before = look(), crab = before.find((marcher) => marcher.kind === 'crab')!
    const seen = seenAt(crab.x, crab.y, crab.z, VIEW, { x: 0, y: 0, scale: 1 })
    expect(theatre.hit(seen.x, seen.y + 0.3, VIEW)).toEqual({ on: 'parade', troop: 1 })
    theatre.sounds.length = 0
    theatre.press(seen.x, seen.y + 0.3, VIEW)
    theatre.cancel()
    // And the keeper by its hut cheeps after it, quieter.
    expect(theatre.sounds.map((sound) => [sound.voice, sound.gain])).toEqual([['crabPoke', 0.4], ['cheep', 0.5]])
    // Higher than a step ever takes it: the crabs first, the ducks a moment later.
    const highest = { crab: 0, duck: 0 }, at = { crab: -1, duck: -1 }
    for (let i = 0; i < 50; i++) {
      theatre.step(1 / 60)
      look().forEach((marcher, k) => {
        const up = marcher.y - before[k].y, kind = marcher.kind as 'crab' | 'duck'
        if (up > highest[kind]) { highest[kind] = up; at[kind] = i }
      })
    }
    expect(highest.crab).toBeGreaterThan(0.7)
    expect(highest.duck).toBeGreaterThan(0.7)
    expect(at.duck).toBeGreaterThan(at.crab)
    play(theatre, 1)
    look().forEach((marcher, k) => expect(Math.abs(marcher.y - before[k].y)).toBeLessThan(0.5))
  })

  it('lets nobody appear, vanish or jump in plain sight when a fifth troop is served: the oldest goes down and out of sight, the rest keep their places, the newest comes up', () => {
    const parade = [{ kind: 'crab' as const, size: 3 as const, balloons: 3 }, { kind: 'duck' as const, size: 2 as const, balloons: 1 }, { kind: 'frog' as const, size: 1 as const, balloons: 1 }, { kind: 'hippo' as const, size: 2 as const, balloons: 2 }]
    const save = { ...saveOf({ position: 'pair-singles', troop: { kind: 'duck', size: 2, held: [true, true] }, sky: [{ colour: 'duck', count: 1 }], waiting: { kind: 'frog', size: 1 } }), parade }
    const theatre = new Theatre(save)
    type Far = { kind: KindName; x: number; y: number; z: number }
    const far: Far[] = []
    const painter: Painter = { ...recorder().painter, marcher: (kind, x, y, z) => void far.push({ kind, x, y, z }) }
    const look = () => { far.length = 0; theatre.paint(painter, VIEW); return far.map((marcher) => ({ ...marcher })) }
    play(theatre, 0.4)
    let before = look()
    expect(before).toHaveLength(8)
    // The troop that waits is tapped: the ducks march off, and they are the fifth for the far hill.
    theatre.press(-VIEW.width / 2 + 1.1, GROUND + 0.9, VIEW)
    theatre.cancel()
    expect(theatre.save.parade.map((troop) => troop.kind)).toEqual(['duck', 'frog', 'hippo', 'duck'])
    // What hides a far friend: it is sunk below the foot of the far hill, under the near hill's horizon.
    const hidden = (marcher: Far) => marcher.y < farGroundAt(FAR_HILL.x + FAR_HILL.rx * 2, FAR_HILL.z) - 2
    const seen = new Set<string>(), counts: number[] = []
    for (let i = 0; i < 60 * 6; i++) {
      theatre.step(1 / 60)
      const now = look()
      counts.push(now.length)
      // Every far friend is where one was a frame ago, give or take a step; a new one starts hidden; one that goes was hidden.
      for (const marcher of now) {
        const was = before.filter((other) => other.kind === marcher.kind).map((other) => Math.hypot(other.x - marcher.x, other.y - marcher.y, other.z - marcher.z))
        if (was.length > 0 && Math.min(...was) < 0.45) continue
        expect(hidden(marcher), `frame ${i}: a ${marcher.kind} appears in plain sight`).toBe(true)
        seen.add(marcher.kind)
      }
      for (const marcher of before) {
        const is = now.filter((other) => other.kind === marcher.kind).map((other) => Math.hypot(other.x - marcher.x, other.y - marcher.y, other.z - marcher.z))
        if (is.length > 0 && Math.min(...is) < 0.45) continue
        expect(hidden(marcher), `frame ${i}: a ${marcher.kind} vanishes in plain sight`).toBe(true)
      }
      before = now
    }
    // The three crabs left, the two ducks that marched off came up, and there are seven on the ring at the end.
    expect(Math.max(...counts)).toBeLessThanOrEqual(8)
    expect(seen.has('duck')).toBe(true)
    expect(before).toHaveLength(7)
    expect(before.filter((marcher) => marcher.kind === 'crab')).toHaveLength(0)
    expect(before.filter((marcher) => marcher.kind === 'duck')).toHaveLength(4)
    expect(before.every((marcher) => !hidden(marcher))).toBe(true)
  })

  it('answers a touch on the hill itself, with nobody on it or with a parade: a small far boing, a cheep from its keeper, and the sky bobs', () => {
    const theatre = new Theatre(saveOf(MOMENTS.solo)), { frame, painter, clear } = recorder()
    // The far hill as it is seen, a little under its crest and to the right of the hut.
    const top = seenAt(FAR_HILL.x + 3.4, farGroundAt(FAR_HILL.x + 3.4, FAR_HILL.z) - 0.6, FAR_HILL.z, VIEW, { x: 0, y: 0, scale: 1 })
    expect(theatre.hit(top.x, top.y, VIEW)).toEqual({ on: 'farHill' })
    theatre.paint(painter, VIEW)
    const still = frame.balloons.map((balloon) => balloon.x)
    theatre.press(top.x, top.y, VIEW)
    theatre.cancel()
    expect(voices(theatre)).toEqual(['hillBoing', 'cheep'])
    play(theatre, 0.15)
    clear()
    theatre.paint(painter, VIEW)
    expect(Math.max(...frame.balloons.map((balloon, k) => Math.abs(balloon.x - still[k])))).toBeGreaterThan(0.01)
    // Just over its crest, to the right of the hut that stands on it, is sky.
    const over = seenAt(FAR_HILL.x + 3.4, farGroundAt(FAR_HILL.x + 3.4, FAR_HILL.z) + 0.8, FAR_HILL.z, VIEW, { x: 0, y: 0, scale: 1 })
    expect(theatre.hit(over.x, over.y, VIEW).on).toBe('air')
    // The hut and its keeper are one thing to touch: a knock at the door, and the keeper cheeps and jumps.
    const door = seenAt(HUT.x, farGroundAt(HUT.x, HUT.z) + 1.2, HUT.z, VIEW, { x: 0, y: 0, scale: 1 })
    expect(theatre.hit(door.x, door.y, VIEW)).toEqual({ on: 'keeper' })
    theatre.sounds.length = 0
    theatre.press(door.x, door.y, VIEW)
    theatre.cancel()
    expect(voices(theatre)).toEqual(['cheep'])
  })

  it('shows the troops that were served going round with the balloons they carried off, and nothing else', () => {
    const save = { ...saveOf(MOMENTS.solo), parade: [{ kind: 'duck' as const, size: 2 as const, balloons: 2 }, { kind: 'crab' as const, size: 3 as const, balloons: 1 }] }
    const theatre = new Theatre(save), { frame, painter } = recorder()
    theatre.paint(painter, VIEW)
    expect(frame.marchers).toBe(5)
    // The sky of four, and three balloons on the far hill, each a paler one of its troop's colour.
    expect(frame.balloons).toHaveLength(7)
  })
})

describe('a friend that has its balloon', () => {
  it.each(KINDS)('stands unlike one that still reaches up: a %s\'s free hand is down by its body, not up by its head', (kind) => {
    const out = { x: 0, y: 0, z: 0 }
    const standing = (held: boolean) => {
      const theatre = staged({ troop: { kind, size: 2, held: [held, held] }, sky: [{ colour: kind, count: 1 }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } }), { frame, painter } = recorder()
      play(theatre, 0.4)
      theatre.paint(painter, VIEW)
      const pose = frame.poses.get('friend-1')!
      // The hand as it is drawn, which for the crab is where its least swing leaves it.
      handOf(BODIES[kind], pose, out, true)
      return { hand: out.y - pose.y, x: out.x, beside: frame.poses.get('friend-0')! }
    }
    const reaching = standing(false).hand, holding = standing(true)
    const height = BODIES[kind].height * FRIEND_SCALE
    expect(reaching, 'reaching: above its shoulders').toBeGreaterThan(height * 0.7)
    expect(holding.hand, 'holding: its free hand low').toBeLessThan(height * 0.45)
    expect(holding.hand, 'and not through the hill').toBeGreaterThan(0)
    expect(reaching - holding.hand).toBeGreaterThan(height * 0.4)
    // The lowered hand stays on its own side of the friend beside it.
    expect(holding.x).toBeGreaterThan(holding.beside.x + BODIES[kind].halfWidth * 0.5)
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
