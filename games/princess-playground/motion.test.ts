import { describe, expect, it } from 'vitest'
import { emptyArrangement, isSound, placeOf, putInSand, putOnEnd, type Arrangement } from './arrangement'
import { HALF_AWAY, Playground, seeded, type PlayEvent } from './motion'
import { PERSONALITY } from './personality'
import { restTilt } from './rest'
import { FRIEND_IDS, FRIENDS, MAX_TILT, PLANK, homeOn, lowTilt, plankTopAt, type FriendId } from './world'

/** The first ride as it is laid out: Pim on the left end, the others in the sand on the right. */
function firstRide(): Arrangement {
  return putOnEnd(emptyArrangement(), 'pim', 'left')
}

/** Plays `seconds` at 60 frames a second and returns every event. */
function play(world: Playground, seconds: number, each?: (world: Playground) => void): PlayEvent[] {
  const events: PlayEvent[] = []
  for (let t = 0; t < seconds; t += 1 / 60) {
    world.advance(1 / 60)
    events.push(...world.takeEvents())
    each?.(world)
  }
  return events
}

function peakOf(world: Playground, id: FriendId, seconds: number): number {
  let peak = 0
  play(world, seconds, (w) => { peak = Math.max(peak, w.bodies[id].y) })
  return peak
}

describe('the playground in motion', () => {
  it('tosses its riders a finger\'s width when the plank is tapped, never into the board, and leaves those in the sand where they are', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    const rest = world.frame().poses.pim.y, bo = world.frame().poses.bo.y
    world.tapPlank(-2)
    let peak = -Infinity, lowest = Infinity, boPeak = -Infinity
    // The plank bobs under her too, so her lift is read against the seat she rides.
    play(world, 0.5, (w) => {
      const lift = w.frame().poses.pim.y - w.bodies.pim.y
      peak = Math.max(peak, lift)
      lowest = Math.min(lowest, lift)
      boPeak = Math.max(boPeak, w.frame().poses.bo.y)
    })
    expect(peak).toBeGreaterThan(0.1)
    expect(peak).toBeLessThan(0.2)
    expect(lowest).toBeGreaterThan(-0.03)
    expect(boPeak).toBeCloseTo(bo, 1)
    expect(rest).toBeGreaterThan(0)
  })

  it('shakes the plank four times for a chuckle, as far one way as the other, and lets it settle where it lay', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    const lay = world.plank.tilt
    world.shake(0.4)
    let moved = 0
    play(world, 1, (w) => { moved = Math.max(moved, Math.abs(w.plank.tilt - lay)) })
    expect(moved).toBeGreaterThan(0.005)
    play(world, 2)
    expect(world.plank.tilt).toBeCloseTo(lay, 2)
    // A twin forked in the middle of a shake finishes it the same way.
    world.shake(0.4)
    play(world, 0.2)
    const twin = world.fork()
    play(world, 0.5)
    play(twin, 0.5)
    expect(twin.plank.tilt).toBeCloseTo(world.plank.tilt, 6)
  })

  it('has Dot stand turned half away while it is apart in the sand, and turn back the moment it is touched or in company', () => {
    const world = new Playground(firstRide())
    play(world, 2)
    // Apart at the rim on the right: turned away from the middle of the tray, the face still toward the child's side.
    expect(world.frame().poses.dot.turn).toBeCloseTo(HALF_AWAY, 2)
    expect(HALF_AWAY).toBeLessThan(Math.PI / 2)
    for (const id of ['pim', 'mog', 'bo'] as const) expect(Math.abs(world.frame().poses[id].turn)).toBeLessThan(0.01)
    world.touch('dot')
    play(world, 0.3)
    expect(Math.abs(world.frame().poses.dot.turn)).toBeLessThan(0.05)
    // Brought onto the plank beside Pim it stays turned to the others.
    world.tapFriend('dot')
    play(world, 3)
    expect(world.frame().poses.dot.turn).toBeCloseTo(0, 2)
    // Tapped off again and alone in the sand, it turns half away once more.
    world.tapFriend('dot')
    play(world, 4)
    expect(Math.abs(world.frame().poses.dot.turn)).toBeCloseTo(HALF_AWAY, 2)
  })

  it('turns a friend to the one it greets, with a bounce, and back again', () => {
    const world = new Playground(firstRide())
    play(world, 1)
    world.act('pim', 'greet', 0.7, 0.9)
    let furthest = 0, highest = 0
    const rest = world.frame().poses.pim.y
    play(world, 0.7, (w) => {
      furthest = Math.max(furthest, w.frame().poses.pim.turn)
      highest = Math.max(highest, w.frame().poses.pim.y - rest)
    })
    expect(furthest).toBeCloseTo(0.9, 1)
    expect(highest).toBeGreaterThan(0.1)
    play(world, 0.5)
    expect(world.frame().poses.pim.turn).toBe(0)
  })

  it('puts a friend in the hand back where it was picked up from when the game is put away, and moves nobody', () => {
    const world = new Playground(firstRide())
    play(world, 0.5)
    const before = JSON.stringify(world.arrangement)
    const home = { x: world.bodies.bo.x, z: world.bodies.bo.z }
    world.grab('bo')
    world.carryTo(-3, -1)
    play(world, 0.6)
    world.putBack()
    expect(world.held).toBe(null)
    expect(JSON.stringify(world.arrangement)).toBe(before)
    play(world, 3)
    expect(world.bodies.bo.mode).toBe('rest')
    expect(world.bodies.bo.x).toBeCloseTo(home.x, 5)
    expect(world.bodies.bo.z).toBeCloseTo(home.z, 5)
    expect(world.bodies.bo.y).toBeCloseTo(0, 5)
    expect(JSON.stringify(world.arrangement)).toBe(before)
  })

  it('squashes whoever is under Bo flat for as long as he sits there, and pops them back when he leaves', () => {
    const under = (top: FriendId) => {
      const world = new Playground(firstRide())
      play(world, 0.5)
      world.grab(top)
      world.carryTo(-3, -1)
      play(world, 0.5)
      world.release()
      play(world, 4)
      expect(placeOf(world.arrangement, top)).toMatchObject({ at: 'end', end: 'left', level: 1 })
      return world
    }
    const mog = under('mog'), bo = under('bo')
    expect(mog.frame().poses.pim.squash).toBeGreaterThan(0.88)
    expect(bo.frame().poses.pim.squash).toBeLessThan(0.76)
    // Still flat a good while later: it is held, not a bounce.
    play(bo, 5)
    expect(bo.frame().poses.pim.squash).toBeLessThan(0.76)
    // And Bo sits that much lower on her.
    expect(bo.frame().poses.bo.y - bo.frame().poses.pim.y).toBeLessThan(FRIENDS.pim.halfHeight * 2 * 0.8)
    // He leaves: she pops back, past her own height for a moment, and settles.
    bo.tapFriend('bo')
    let tallest = 0
    play(bo, 1, (w) => { tallest = Math.max(tallest, w.frame().poses.pim.squash) })
    expect(tallest).toBeGreaterThan(1.04)
    play(bo, 3)
    expect(bo.frame().poses.pim.squash).toBeCloseTo(1, 1)
  })

  it('throws two friends of one weight equally high: the toss comes from the weights', () => {
    const peak = (id: FriendId) => {
      const world = new Playground(putOnEnd(emptyArrangement(), id, 'left'))
      play(world, 0.5)
      world.tapFriend('bo')
      return peakOf(world, id, 4)
    }
    expect(peak('mog')).toBeCloseTo(peak('dot'), 1)
    expect(peak('pim')).toBeGreaterThan(peak('mog') + 0.3)
  })

  it('lets a friend that is let go over the middle slide down the slope on the board itself, and climb onto whoever holds the low end', () => {
    const world = new Playground(firstRide())
    play(world, 0.5)
    world.grab('mog')
    world.carryTo(0.4, PLANK.z)
    play(world, 0.6)
    world.release()
    expect(world.takeEvents().some((event) => event.type === 'slide')).toBe(true)
    expect(placeOf(world.arrangement, 'mog')).toMatchObject({ at: 'end', end: 'left', level: 1 })
    let onBoard = 0, travelled = 0, last = world.bodies.mog.x, backwards = 0
    play(world, 1.2, (w) => {
      const body = w.bodies.mog
      if (body.mode !== 'hop') return
      // Sitting on the board: its underside on the board's top where it is.
      if (Math.abs(body.y - plankTopAt(body.x, w.plank.tilt)) < 1e-6 && Math.abs(body.z - PLANK.z) < 1e-6) {
        onBoard += 1
        travelled += last - body.x
      }
      if (body.x > last + 1e-9) backwards += 1
      last = body.x
    })
    // Half a second of it on the board, a good way down the slope, and never back up it.
    expect(onBoard).toBeGreaterThan(24)
    expect(travelled).toBeGreaterThan(1.2)
    expect(backwards).toBe(0)
    play(world, 2)
    expect(world.bodies.mog.mode).toBe('rest')
    expect(world.bodies.mog.y).toBeGreaterThan(world.bodies.pim.y + FRIENDS.pim.halfHeight)
  })

  it('sinks the low end further when a friend is sent onto it, and lets it rise again when that friend leaves, with no knock', () => {
    // The wrong side: Pim sits low on the left, and Mog is carried onto her head.
    const world = new Playground(firstRide())
    play(world, 0.5)
    const before = world.plank.tilt
    expect(before).toBeCloseTo(-MAX_TILT)
    world.grab('mog')
    world.carryTo(-3, -1)
    play(world, 0.5)
    world.release()
    play(world, 4)
    expect(world.plank.tilt).toBeCloseTo(-lowTilt(5))
    // The end is lower than it was: by more than a hundredth of the plank's half length.
    expect(plankTopAt(-PLANK.seat, before) - plankTopAt(-PLANK.seat, world.plank.tilt)).toBeGreaterThan(0.05)
    world.tapFriend('mog')
    const events = play(world, 4)
    expect(world.plank.tilt).toBeCloseTo(-MAX_TILT)
    expect(events.some((event) => event.type === 'knock')).toBe(false)
  })

  it('tosses nobody when the plank is tapped: its riders only bob, on a low end and on a high one', () => {
    for (const along of [-2, 2]) {
      const world = new Playground(putOnEnd(firstRide(), 'bo', 'right'))
      play(world, 1)
      world.takeEvents()
      world.tapPlank(along)
      const sat = world.frame().poses.pim.y
      let highest = 0
      const events = play(world, 2.5, (w) => { highest = Math.max(highest, w.frame().poses.pim.y - sat) })
      expect(events.some((event) => event.type === 'toss'), `${along}`).toBe(false)
      // She is lifted a finger's width and a spring's worth above where she sat, no more: the board may dip away under her and catch her again.
      expect(highest, `${along}`).toBeLessThan(0.3)
      // A friend landing straight after a tap is no tap: it throws.
      world.tapPlank(along)
      world.tapFriend('bo')
      world.tapFriend('mog')
      play(world, 0.2)
    }
    const world = new Playground(firstRide())
    play(world, 0.5)
    world.tapPlank(2)
    world.tapFriend('bo')
    expect(play(world, 4).some((event) => event.type === 'toss' && event.id === 'pim')).toBe(true)
  })

  it('throws whoever rides the end that goes up, every time a friend tapped on tips the plank, and once', () => {
    // Every pair of stacks the four can make, and every friend still in the sand tapped onto the lighter end.
    let tips = 0
    const ids = FRIEND_IDS
    for (let code = 0; code < 81; code++) {
      const where = ids.map((_, index) => Math.floor(code / 3 ** index) % 3)
      let a = emptyArrangement()
      ids.forEach((id, index) => { a = where[index] === 0 ? putInSand(a, id, homeOn(id, 'right')) : putOnEnd(a, id, where[index] === 1 ? 'left' : 'right') })
      for (const id of ids.filter((_, index) => where[index] === 0)) for (const end of ['left', 'right'] as const) {
        const after = putOnEnd(a, id, end)
        const weight = (x: Arrangement, e: 'left' | 'right') => x[e].reduce((sum, f) => sum + FRIENDS[f].weight, 0)
        const other = end === 'left' ? 'right' : 'left'
        // It tips: the other end was down, or the plank was level or empty, and this end is now the heavier.
        if (!(weight(a, end) <= weight(a, other) && weight(after, end) > weight(after, other)) || a[other].length === 0) continue
        tips += 1
        const world = new Playground(a)
        play(world, 0.3)
        world.grab(id)
        world.carryTo((end === 'left' ? -1 : 1) * PLANK.seat, PLANK.z)
        play(world, 0.4)
        world.release()
        const tossed = play(world, 5).filter((event) => event.type === 'toss').map((event) => (event.type === 'toss' ? event.id : ''))
        expect([...tossed].sort(), `${JSON.stringify(a.left)} ${JSON.stringify(a.right)} + ${id} on ${end}`).toEqual([...a[other]].sort())
      }
    }
    expect(tips).toBeGreaterThan(30)
  })

  it('throws Bo too when the others bring his end up hard, lower than anyone lighter', () => {
    const world = new Playground(putOnEnd(emptyArrangement(), 'bo', 'left'))
    play(world, 0.5)
    world.tapFriend('mog')
    play(world, 0.3)
    world.tapFriend('dot')
    let top = 0
    const events = play(world, 5, (w) => { top = Math.max(top, w.bodies.bo.y) })
    expect(events.some((event) => event.type === 'toss' && event.id === 'bo')).toBe(true)
    expect(top - world.bodies.bo.y).toBeGreaterThan(0.05)
    expect(top - world.bodies.bo.y).toBeLessThan(1.2)
  })

  it('says when an end that lay in the sand lifts out of it, tipped over or only lightened to level', () => {
    // Tipped over: Pim's end lifts as Bo's comes down.
    const tipped = new Playground(firstRide())
    play(tipped, 0.5)
    tipped.takeEvents()
    tipped.tapFriend('bo')
    expect(play(tipped, 4).filter((event) => event.type === 'rise').map((event) => (event.type === 'rise' ? event.end : ''))).toEqual(['left'])
    // Lightened to level: the last friend hops off and the end comes up.
    const emptied = new Playground(firstRide())
    play(emptied, 0.5)
    emptied.takeEvents()
    emptied.tapFriend('pim')
    expect(play(emptied, 4).filter((event) => event.type === 'rise').length).toBe(1)
    // At rest nothing lifts.
    expect(play(emptied, 3).some((event) => event.type === 'rise')).toBe(false)
  })

  it('slips Pim\'s crown right down over one eye when she is set down in the sand, and has her shake it back', () => {
    const world = new Playground(firstRide())
    play(world, 0.5)
    expect(world.frame().poses.pim.slip).toBe(0)
    world.act('pim', 'slip', 1.1)
    let most = 0
    play(world, 0.5, (w) => { most = Math.max(most, w.frame().poses.pim.slip) })
    expect(most).toBe(1)
    play(world, 1)
    expect(world.frame().poses.pim.slip).toBe(0)
  })

  it('throws Mog flat and long, where anyone else stretches tall in the air', () => {
    const flight = (id: FriendId) => {
      const world = new Playground(putOnEnd(emptyArrangement(), id, 'left'))
      play(world, 0.5)
      world.tapFriend('bo')
      let least = 9, most = 0, thrown = false
      play(world, 4, (w) => {
        if (w.bodies[id].mode !== 'air') return
        thrown = true
        least = Math.min(least, w.frame().poses[id].squash)
        most = Math.max(most, w.frame().poses[id].squash)
      })
      expect(thrown, id).toBe(true)
      expect(w0(world, id)).toBeCloseTo(1, 1)
      return { least, most }
    }
    const w0 = (world: Playground, id: FriendId) => world.frame().poses[id].squash / (1 + Math.sin(world.bodies[id].phase) * 0.03)
    expect(flight('mog').least).toBeLessThan(0.8)
    expect(flight('dot').most).toBeGreaterThan(1.05)
    expect(flight('dot').least).toBeGreaterThan(0.8)
  })

  it('has Dot\'s speckles shimmer while it is glad, and lie still while it is apart', () => {
    const world = new Playground(firstRide())
    world.setMood('dot', 'put-out')
    let moved = 0
    play(world, 2, (w) => { moved = Math.max(moved, Math.abs(w.frame().poses.dot.shimmer)) })
    expect(moved).toBe(0)
    world.setMood('dot', 'glad')
    play(world, 3, (w) => { moved = Math.max(moved, Math.abs(w.frame().poses.dot.shimmer)) })
    expect(moved).toBeGreaterThan(0.9)
    for (const id of ['pim', 'mog', 'bo'] as const) expect(world.frame().poses[id].shimmer).toBe(0)
  })

  it('has Bo rock right over, one way and the other, twice, before he gets going from the sand', () => {
    const world = new Playground(firstRide())
    play(world, 0.5)
    world.tapFriend('bo')
    const leans: number[] = []
    play(world, 0.6, (w) => { if (!w.bodies.bo.leapt) leans.push(w.frame().poses.bo.lean) })
    // Two swings each way, each a good tenth of a radian: plain to see on the biggest body in the tray.
    let swings = 0
    for (let i = 1; i < leans.length - 1; i++) if (Math.abs(leans[i]) > 0.17 && Math.abs(leans[i]) >= Math.abs(leans[i - 1]) && Math.abs(leans[i]) > Math.abs(leans[i + 1])) swings += 1
    expect(swings).toBe(4)
    // Nobody else winds up like that.
    for (const id of ['pim', 'mog', 'dot'] as const) expect(PERSONALITY[id].windUp).toBe(0)
  })

  it('shuts a friend\'s eyes for as long as a slow blink lasts', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    world.blink('mog', 0.7)
    play(world, 0.5)
    expect(world.frame().poses.mog.lids).toBe(1)
    play(world, 0.4)
    expect(world.frame().poses.mog.lids).toBeLessThan(1)
  })

  it('puffs a friend out sideways, and leaves it as it was', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    play(world, 1)
    const before = world.frame().poses.pim.squash
    world.act('pim', 'puff', 0.6)
    let flattest = before
    play(world, 0.6, (w) => { flattest = Math.min(flattest, w.frame().poses.pim.squash) })
    expect(flattest).toBeLessThan(before - 0.08)
    play(world, 0.5)
    expect(world.frame().poses.pim.squash).toBeCloseTo(before, 1)
  })

  it('starts at rest, as the arrangement has it, and a first frame plays no time', () => {
    const world = new Playground(firstRide())
    world.advance(0)
    expect(world.settled).toBe(true)
    expect(world.plank.tilt).toBeCloseTo(-MAX_TILT)
    expect(world.takeEvents()).toEqual([])
  })

  it('answers a touch at once, before any time has passed', () => {
    const world = new Playground(firstRide())
    world.touch('bo')
    expect(world.takeEvents()).toEqual([{ type: 'touch', id: 'bo' }])
    world.advance(1 / 60)
    expect(world.bodies.bo.squash).toBeLessThan(1)
  })

  it('a tap on Bo sends him onto his end, tips the plank and throws Pim', () => {
    const world = new Playground(firstRide())
    world.tapFriend('bo')
    const events = play(world, 6)
    const kinds = events.map((event) => event.type)
    expect(kinds).toContain('leap')
    expect(kinds).toContain('knock')
    expect(events.find((event) => event.type === 'toss')).toMatchObject({ id: 'pim' })
    // The order of the chain: he lands, then the plank knocks, then she flies.
    expect(kinds.indexOf('land')).toBeLessThan(kinds.indexOf('knock'))
    expect(kinds.indexOf('knock')).toBeLessThanOrEqual(kinds.indexOf('toss'))
    expect(world.settled).toBe(true)
    // Down on Bo's end, a little deeper in the sand than Pim's end lay.
    expect(world.plank.tilt).toBeCloseTo(lowTilt(4))
    expect(world.plank.tilt).toBeGreaterThan(MAX_TILT)
    expect(placeOf(world.arrangement, 'pim')).toMatchObject({ at: 'end', end: 'left' })
  })

  it('throws Pim higher the heavier the friend who lands', () => {
    const withBo = new Playground(firstRide())
    withBo.tapFriend('bo')
    const withMog = new Playground(firstRide())
    withMog.tapFriend('mog')
    const high = peakOf(withBo, 'pim', 5), low = peakOf(withMog, 'pim', 5)
    expect(high).toBeGreaterThan(low + 0.6)
    // High enough to be a fling, and not out of the top of the picture.
    expect(high).toBeGreaterThan(4)
    expect(high).toBeLessThan(8.5)
  })

  it('a friend too light to tip the plank dangles on the high end, and the plank only creaks', () => {
    const start = putInSand(putOnEnd(emptyArrangement(), 'bo', 'left'), 'pim', homeOn('pim', 'right'))
    const world = new Playground(start)
    world.tapFriend('pim')
    const events = play(world, 5)
    expect(events.some((event) => event.type === 'creak')).toBe(true)
    expect(events.some((event) => event.type === 'toss')).toBe(false)
    expect(world.plank.tilt).toBeCloseTo(restTilt(world.arrangement))
    expect(world.plank.tilt).toBeLessThan(0)
    expect(world.bodies.pim.y).toBeGreaterThan(1.8)
  })

  it('floats level when both ends weigh the same, and says so once', () => {
    const world = new Playground(putOnEnd(emptyArrangement(), 'mog', 'left'))
    world.tapFriend('dot')
    const events = play(world, 12)
    expect(events.filter((event) => event.type === 'level').length).toBe(1)
    expect(Math.abs(world.plank.tilt)).toBeLessThan(0.02)
  })

  it('a second tap undoes the first, even in mid-hop', () => {
    const world = new Playground(firstRide())
    const before = JSON.stringify(placeOf(world.arrangement, 'mog').at)
    world.tapFriend('mog')
    play(world, 0.2)
    world.tapFriend('mog')
    play(world, 4)
    expect(JSON.stringify(placeOf(world.arrangement, 'mog').at)).toBe(before)
    expect(world.settled).toBe(true)
    expect(world.plank.tilt).toBeCloseTo(-MAX_TILT)
  })

  it('a carried friend let go over an end lands on it, and one let go over the middle slides to the low end', () => {
    const world = new Playground(firstRide())
    world.grab('mog')
    world.carryTo(3.1, -1)
    play(world, 0.6)
    expect(world.bodies.mog.y).toBeGreaterThan(2)
    world.release()
    play(world, 5)
    expect(placeOf(world.arrangement, 'mog')).toMatchObject({ at: 'end', end: 'right' })
    world.grab('dot')
    world.carryTo(0.2, -1)
    play(world, 0.6)
    world.release()
    const events = play(world, 5)
    expect(events.some((event) => event.type === 'slide')).toBe(true)
    expect(placeOf(world.arrangement, 'dot')).toMatchObject({ at: 'end', end: 'right' })
    expect(world.settled).toBe(true)
  })

  it('is the same play for the same touches', () => {
    const run = () => {
      const world = new Playground(firstRide(), 7)
      world.tapFriend('bo')
      play(world, 1.3)
      world.tapFriend('mog')
      play(world, 3)
      return JSON.stringify([world.plank, world.bodies])
    }
    expect(run()).toBe(run())
  })
})

describe('nothing passes through anything', () => {
  // A child tapping and carrying whatever is nearest, quickly, for a long while.
  it('through two minutes of seeded play nobody sinks into the sand, the plank or the friend below', () => {
    for (const seed of [1, 2, 3, 4]) {
      const random = seeded(seed * 97)
      const world = new Playground(firstRide(), seed)
      let nextTouch = 0, worst = 0
      for (let t = 0; t < 120; t += 1 / 60) {
        if (t >= nextTouch) {
          nextTouch = t + 0.15 + random() * 1.4
          const id = FRIEND_IDS[Math.floor(random() * 4)]
          const act = random()
          if (world.held) world.release()
          else if (act < 0.6) world.tapFriend(id)
          else if (act < 0.85) {
            world.grab(id)
            world.carryTo((random() - 0.5) * 11, (random() - 0.5) * 6)
          } else world.tapPlank(random() < 0.5 ? -2 : 2)
        }
        world.advance(1 / 60)
        world.takeEvents()
        expect(isSound(world.arrangement)).toBe(true)
        for (const id of FRIEND_IDS) {
          const body = world.bodies[id]
          expect(Number.isFinite(body.y) && Number.isFinite(body.squash)).toBe(true)
          worst = Math.min(worst, body.y)
          expect(body.y).toBeLessThan(12)
        }
        // Each stack keeps its order, bottom first, whatever is in the air.
        for (const end of ['left', 'right'] as const) {
          const stack = world.arrangement[end].filter((id) => world.bodies[id].mode === 'rest' || world.bodies[id].mode === 'air')
          for (let level = 1; level < stack.length; level++) {
            const below = world.bodies[stack[level - 1]], body = world.bodies[stack[level]]
            if (world.arrangement[end].indexOf(stack[level]) - world.arrangement[end].indexOf(stack[level - 1]) !== 1) continue
            expect(body.y - below.y).toBeGreaterThan(FRIENDS[stack[level - 1]].halfHeight * 0.55)
          }
        }
      }
      // A body's bottom may press a hair into the sand on a hard landing, never further.
      expect(worst).toBeGreaterThan(-0.02)
    }
  }, 30_000)
})
