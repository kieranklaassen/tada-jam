import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { PERSONALITIES } from './clips'
import { applyPose, buildFriend } from './friends'
import { BALLOON, CLOUDS, FAR_HILL, farGroundAt, friendX, GROUND, seenAt, skySlots, viewFor } from './layout'
import { MOMENTS, saveOf, type Moment } from './moments'
import { freshSave } from './save'
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

  it.each(KINDS)('shows a %s the bunch it cannot have: one balloon over its head and the rest over ground where nobody stands', (kind) => {
    for (const count of [2, 3] as const) {
      const theatre = staged({ troop: { kind, size: 2, held: [false, false] }, sky: [{ colour: kind, count: 1 }, { colour: kind, count }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } }), { frame, painter, clear } = recorder()
      // Three for two, or two for one: either way one friend takes hold and the bunch has more than it can use.
      if (count === 2) { tapSlot(theatre, 0); play(theatre, 2) }
      tapSlot(theatre, 1)
      play(theatre, FLIGHT + PERSONALITIES[kind].cue.grab + 0.25)
      clear()
      theatre.paint(painter, VIEW)
      // The bunch that strains upwards is drawn taller than it is wide, and nothing else is.
      const bunch = frame.balloons.filter((balloon) => balloon.tall > 1.05 && balloon.wide < 0.99)
      expect(bunch.length, `${count} for ${kind}`).toBe(count)
      const middle = bunch.reduce((sum, balloon) => sum + balloon.x, 0) / count
      const grabber = Math.abs(middle - friendX(0, 2)) < Math.abs(middle - friendX(1, 2)) ? 0 : 1
      const at = frame.poses.get(`friend-${grabber}`)!
      const off = bunch.map((balloon) => balloon.x - at.x).sort((a, b) => Math.abs(a) - Math.abs(b))
      expect(Math.abs(off[0]), 'one straight over it').toBeLessThan(0.2)
      // The next is past the friend's own side and short of the friend beside it: over the gap, with nobody under it.
      const beside = [0, 1].map((i) => friendX(i, 2)).filter((x) => Math.abs(x - friendX(grabber, 2)) > 1)[0]
      expect(Math.max(...off.map(Math.abs)), 'another well to its side').toBeGreaterThan(1.3)
      for (const dx of off.slice(count === 3 ? 2 : 1)) expect(Math.abs(friendX(grabber, 2) + dx - beside), 'and not over the friend beside it').toBeGreaterThan(1.2)
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

  it('is answered well inside half a second when it is the wrong colour: the friend begins to refuse it as it arrives', () => {
    const theatre = solo('duck', ['duck', 'frog'])
    tapSlot(theatre, 1)
    play(theatre, 0.42)
    expect(voices(theatre)).toContain('duckRefuse')
  })

  it('is refused at full length where colour is new, and more shortly once bunches have come', () => {
    const lasts = (position: string) => {
      const theatre = new Theatre(saveOf({ position, troop: { kind: 'crab', size: 1, held: [false] }, sky: [{ colour: 'crab', count: 1 }, { colour: 'duck', count: 1 }], waiting: { kind: 'frog', size: 1 } }))
      tapSlot(theatre, 1)
      let waited = 0
      while (!voices(theatre).includes('pop') && waited < 3) { theatre.step(1 / 60); waited += 1 / 60 }
      return waited
    }
    expect(lasts('solo-two-colours')).toBeGreaterThan(lasts('bunches-mixed') + 0.04)
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

  it('crosses its neighbour\'s in the air when two frogs take from one bunch, each a bow with a pad and never a straight bar', () => {
    const theatre = staged({ troop: { kind: 'frog', size: 2, held: [false, false] }, sky: [{ colour: 'frog', count: 1 }, { colour: 'frog', count: 2 }], waiting: { kind: 'duck', size: 1 } }), { painter, whole } = tongues()
    tapSlot(theatre, 1)
    play(theatre, FLIGHT - 0.12)
    theatre.paint(painter, VIEW)
    const both = whole()
    expect(both).toHaveLength(2)
    const [left, right] = both[0].mouthX < both[1].mouthX ? both : [both[1], both[0]]
    // The frog on the left reaches the balloon on the right, and the other way round.
    expect(left.tipX).toBeGreaterThan(right.tipX)
    for (const tongue of both) {
      // The middle of the tongue is off the straight line from its mouth to its tip, by more than its own thickness.
      const middle = tongue.pieces[1], dx = tongue.tipX - tongue.mouthX, dy = tongue.tipY - tongue.mouthY
      const off = Math.abs((middle.x1 - tongue.mouthX) * dy - (middle.y1 - tongue.mouthY) * dx) / Math.hypot(dx, dy)
      expect(off).toBeGreaterThan(0.2)
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

  it('is what a frog hangs by when it is carried off, its arms dangling', () => {
    const theatre = solo('frog', ['frog', 'frog']), drawnBy = tongues(), { frame, painter } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 7)
    tapSlot(theatre, 1)
    play(theatre, FLIGHT + 0.7)
    theatre.paint(drawnBy.painter, VIEW)
    theatre.paint(painter, VIEW)
    const pose = frame.poses.get('friend-0')!
    expect(pose.y - GROUND, 'in the air').toBeGreaterThan(0.5)
    expect(drawnBy.drawn, 'one tongue, from its mouth up to the bunch').toHaveLength(1)
    expect(drawnBy.drawn[0].y1).toBeGreaterThan(drawnBy.drawn[0].y0 + 0.3)
    expect(pose.armL, 'the free arm hangs').toBeLessThan(1.2)
    // The hand that holds its own balloon stays up.
    expect(pose.armR).toBeGreaterThan(2)
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
    expect(theatre.sounds.map((sound) => [sound.voice, sound.gain])).toEqual([['crabPoke', 0.4]])
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

  it('answers a touch on the hill itself, with nobody on it or with a parade: a small far boing, and the sky bobs', () => {
    const theatre = new Theatre(saveOf(MOMENTS.solo)), { frame, painter, clear } = recorder()
    // The top of the far hill as it is seen, a little under its crest.
    const top = seenAt(FAR_HILL.x, farGroundAt(FAR_HILL.x, FAR_HILL.z) - 0.6, FAR_HILL.z, VIEW, { x: 0, y: 0, scale: 1 })
    expect(theatre.hit(top.x, top.y, VIEW)).toEqual({ on: 'farHill' })
    theatre.paint(painter, VIEW)
    const still = frame.balloons.map((balloon) => balloon.x)
    theatre.press(top.x, top.y, VIEW)
    theatre.cancel()
    expect(voices(theatre)).toEqual(['hillBoing'])
    play(theatre, 0.15)
    clear()
    theatre.paint(painter, VIEW)
    expect(Math.max(...frame.balloons.map((balloon, k) => Math.abs(balloon.x - still[k])))).toBeGreaterThan(0.01)
    // Just over its crest is sky.
    const over = seenAt(FAR_HILL.x, farGroundAt(FAR_HILL.x, FAR_HILL.z) + 0.8, FAR_HILL.z, VIEW, { x: 0, y: 0, scale: 1 })
    expect(theatre.hit(over.x, over.y, VIEW).on).toBe('air')
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
    const height = BODIES[kind].height * 1.08
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
