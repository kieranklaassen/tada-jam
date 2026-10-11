import { describe, expect, it } from 'vitest'
import { FOOT_OUTLINE, PART_SHAPES, PILOT_OUTLINE } from './art'
import { TIERS } from './config'
import type { Body } from './flight'
import { standIn, type Stamp } from './recording'
import { everyLoad, play, playUntil, staged, type Played } from './testing'
import { HOP_ON, TAKE, type Frame, type Pose } from './toy'
import { View } from './view'
import { BASKET, BERG, CHICK, ICE_Y, PENGUIN, type Friend, type Part } from './world'

// Who stands on whom, and who takes what from whom, as it is drawn. The view
// draws each frame on the stand-in canvas at one pixel to a unit, and these
// tests read the stamps: the chick's feet against the outline of the penguin
// it stands on, in every pose the penguin can lie or stand in at the igloo;
// its way there, frame by frame; and the fish against the hand that takes it.

function drawn() {
  const stand = standIn()
  const view = new View(stand.make)
  view.setTier(TIERS[0])
  view.build(stand.ctx, 1180, 820, 1)
  const art = view.figures!
  const draw = (f: Frame): Stamp[] => {
    stand.reset()
    view.draw(stand.ctx, f, 1 / 60)
    return stand.tally.placed.map((stamp) => ({ ...stamp }))
  }
  return { art, draw }
}

/** An outline as it was stamped, a point every unit along it, in stage units. */
function laid(stamp: Stamp, flat: readonly number[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < flat.length; i += 2) {
    const x0 = flat[i], y0 = flat[i + 1], x1 = flat[(i + 2) % flat.length], y1 = flat[(i + 3) % flat.length]
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
    for (let step = 0; step < steps; step++) {
      const x = x0 + ((x1 - x0) * step) / steps, y = y0 + ((y1 - y0) * step) / steps
      points.push({ x: stamp.a * x + stamp.c * y + stamp.e, y: stamp.b * x + stamp.d * y + stamp.f })
    }
  }
  return points
}

/** The chick's two feet reach this far either side of its middle. */
const FEET = 14
/** Its feet are no further than this from the line they stand on. */
const ON = 3

/** The ways a penguin can come down in front of the igloo: steep, gentle, and sliding either way, from three places. */
const ARRIVALS: Partial<Body>[] = [490, 520, 545].flatMap((x) => [
  { x, y: ICE_Y - PENGUIN.r - 6, vy: 500 },
  { x, y: ICE_Y - PENGUIN.r - 6, vy: 150 },
  { x, y: ICE_Y - PENGUIN.r - 2, vy: 20 },
  { x, y: ICE_Y - PENGUIN.r - 2, vx: 140, vy: 40 },
  { x, y: ICE_Y - PENGUIN.r - 2, vx: 50, vy: 40 },
  { x, y: ICE_Y - PENGUIN.r - 2, vx: -30, vy: 40 },
  { x, y: ICE_Y - PENGUIN.r - 2, vx: -70, vy: 50 },
])

describe('the chick on the penguin', () => {
  const { art, draw } = drawn()
  const chickOf = (stamps: Stamp[]): Stamp => stamps.find((stamp) => stamp.image === art.chick.image)!

  /** The top of everything the chick can stand on, as stamped, in the column under its two feet. */
  function topUnder(stamps: Stamp[], x: number): number {
    let top = Infinity
    const outlines: [unknown, readonly number[]][] = [[art.pilot.image, PILOT_OUTLINE], [art.foot.image, FOOT_OUTLINE], [art.parts.rocket.image, PART_SHAPES.rocket], [art.parts.springs.image, PART_SHAPES.springs]]
    for (const stamp of stamps) for (const [image, flat] of outlines) {
      if (stamp.image !== image) continue
      for (const point of laid(stamp, flat)) if (Math.abs(point.x - x) <= FEET && point.y < top) top = point.y
    }
    return top
  }

  it('stands with its feet on the outline of the penguin as it is drawn: on its head, on its back when it lies, on the rocket strapped to its back, on its feet when it is stuck by the beak', () => {
    const seen = new Map<string, number>()
    for (const load of everyLoad()) for (const put of ARRIVALS) {
      const played = staged(load.parts, put)
      if (!playUntil(played, (toy) => toy.phase === 'scene', 1 / 60, 8)) continue
      let frame = played.toy.show()
      // Its ride, if it gets one, from the hop on to the hop off.
      for (let n = 0; n < 900 && played.toy.phase === 'scene'; n++) {
        play(played, 1 / 60)
        frame = played.toy.show()
        // While it stands there, every other frame is drawn and measured: the feet under it kick, and it rides them.
        if (frame.chick.ride === null || frame.chick.onto < 1 || n % 2 === 1) continue
        const stamps = draw(frame)
        const pose: Pose = frame.pilot.pose
        const name = `${pose}${pose === 'belly' ? (frame.pilot.face > 0 ? ' facing right' : ' facing left') : ''}${frame.pilot.rocket && pose === 'belly' ? ' with the rocket' : ''}`
        seen.set(name, (seen.get(name) ?? 0) + 1)
        const chick = chickOf(stamps)
        const top = topUnder(stamps, chick.e)
        // Its feet are on the top of what is under them: not above it, and not down in it.
        expect(Math.abs(chick.f - top), `${load.parts.join(' and ') || 'bare'}, ${name}, frame ${n}`).toBeLessThanOrEqual(ON)
        // And what is under them is the penguin, not the ice: a lying penguin's back is well off the ground.
        expect(chick.f, name).toBeLessThan(ICE_Y - 60)
      }
    }
    // Every pose it can lie or stand in at the igloo was met, each many times.
    expect([...seen.keys()].sort()).toEqual(['beak', 'belly facing left', 'belly facing left with the rocket', 'belly facing right', 'belly facing right with the rocket', 'stand'])
    for (const [name, frames] of seen) expect(frames, name).toBeGreaterThan(30)
  }, 120_000)

  it('gets there and gets home by a hop of many frames, up and over, and no frame moves it further than a hop does', () => {
    let rides = 0
    for (const put of ARRIVALS) {
      const played = staged([], put)
      playUntil(played, (toy) => toy.phase === 'scene')
      let before: Stamp | null = null, onto = 0, up = 0, down = 0, rode = 0
      const rising: { onto: number; y: number }[] = []
      const from = { x: 0, y: 0 }
      while (played.toy.phase === 'scene') {
        play(played, 1 / 60)
        const frame = played.toy.show()
        const chick = chickOf(draw(frame))
        if (frame.chick.ride !== null && before && onto === 0) { from.x = before.e; from.y = before.f }
        // No frame moves it further than a quick hop does.
        if (before) expect(Math.hypot(chick.e - before.e, chick.f - before.f), `at ${frame.chick.onto}`).toBeLessThan(26)
        if (frame.chick.ride !== null) {
          if (frame.chick.onto < 1 && frame.chick.onto >= onto) up += 1
          if (frame.chick.onto < 1 && frame.chick.onto < onto) down += 1
          if (frame.chick.onto === 1) {
            rode += 1
            // It went up and over: in the middle of its hop it was well above the straight way from its doorway to where it landed.
            if (rode === 1) expect(Math.max(...rising.map((at) => from.y + (chick.f - from.y) * at.onto - at.y))).toBeGreaterThan(25)
          } else if (rode === 0) rising.push({ onto: frame.chick.onto, y: chick.f })
        }
        onto = frame.chick.onto
        before = chick
      }
      // An arrival that slid on past the igloo gets no ride.
      if (rode === 0) continue
      rides += 1
      expect(rode).toBeGreaterThan(20)
      expect(up).toBeGreaterThanOrEqual(Math.floor(HOP_ON * 60) - 2)
      expect(up).toBeGreaterThan(12)
      expect(down).toBeGreaterThan(12)
      // It left from its doorway and is back in it.
      expect(Math.hypot(from.x - CHICK.x, from.y - ICE_Y)).toBeLessThan(8)
      expect(Math.hypot(before!.e - CHICK.x, before!.f - ICE_Y)).toBeLessThan(8)
    }
    expect(rides).toBeGreaterThan(8)
  })
})

describe('a friend is seen to take the fish', () => {
  const { art, draw } = drawn()
  const at = (stamp: Stamp, x: number, y: number): { x: number; y: number } => ({ x: stamp.a * x + stamp.c * y + stamp.e, y: stamp.b * x + stamp.d * y + stamp.f })
  const far = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y)
  const fishOf = (stamps: Stamp[]): Stamp[] => stamps.filter((stamp) => stamp.image === art.parts.fish.image || stamp.image === art.parts.frozen.image)

  /** The hand each friend takes a fish with, as it was stamped: the chick's plate, the walrus's flipper on its arm, the hoop of the puffin's net. */
  const hands: Record<Friend, (stamps: Stamp[]) => { x: number; y: number } | null> = {
    chick: (stamps) => { const plate = stamps.find((stamp) => stamp.image === art.plate.image); return plate ? at(plate, 0, 0) : null },
    // The seals have three flippers between them; the fourth is the walrus's, and the fish is at the middle of it.
    walrus: (stamps) => { const flippers = stamps.filter((stamp) => stamp.image === art.sealFlipper.image); return flippers.length === 4 ? at(flippers[0], 0, -16 / 1.2) : null },
    puffin: (stamps) => { const net = stamps.find((stamp) => stamp.image === art.net.image); return net ? at(net, 13, -54) : null },
  }
  const arrivals: [Friend, Part[], Partial<Body>][] = [
    ['chick', ['fish'], { x: 540, y: ICE_Y - PENGUIN.r - 2, vy: 20, fish: 'wet' }],
    ['chick', ['fish'], { x: 500, y: ICE_Y - PENGUIN.r - 6, vy: 500, fish: 'fresh' }],
    ['chick', ['fish'], { x: 500, y: ICE_Y - PENGUIN.r - 2, vx: 120, vy: 40, fish: 'frozen' }],
    ['walrus', ['fish'], { x: BERG.x0 + 106, y: BERG.y0 - PENGUIN.r - 2, vy: 20, fish: 'wet' }],
    ['walrus', ['fish'], { x: BERG.x0 + 70, y: BERG.y0 - PENGUIN.r - 6, vy: 500, fish: 'frozen' }],
    ['puffin', ['fish'], { x: BASKET.x0 - PENGUIN.r - 2, y: (BASKET.y0 + BASKET.y1) / 2, vx: 100, fish: 'frozen' }],
    ['puffin', ['fish'], { x: BASKET.x1 + PENGUIN.r + 2, y: (BASKET.y0 + BASKET.y1) / 2, vx: -100, fish: 'wet' }],
  ]

  it('leaves the fish hanging where it hung until the hand has come for it, and moves it only in that hand', () => {
    for (const [who, parts, put] of arrivals) {
      const played: Played = staged(parts, put)
      const name = `${who}, ${put.fish}, at ${put.x}`
      expect(playUntil(played, (toy) => toy.phase === 'scene'), name).toBe(true)
      let hung: { x: number; y: number } | null = null, first: { x: number; y: number } | null = null, was: { x: number; y: number } | null = null
      let gap = Infinity, reached = false, carried = 0, takes = 0, kept: { x: number; y: number } | null = null
      while (played.toy.phase === 'scene') {
        play(played, 1 / 60)
        const frame = played.toy.show()
        const stamps = draw(frame)
        const fish = fishOf(stamps)
        const meal = frame.meal[who]
        if (!meal) { if (fish.length === 1) hung = at(fish[0], 0, 0); continue }
        if (meal.act !== 'take') {
          // Where the friend has its fish, in the first frame of its answer: the chick's fish is on the plate from then on.
          if (meal.act === 'react' && !kept && who === 'chick') kept = { x: at(fish[0], 0, 0).x - hands.chick(stamps)!.x, y: at(fish[0], 0, 0).y - hands.chick(stamps)!.y }
          continue
        }
        takes += 1
        // The one fish there is: it is off the rod.
        expect(fish.length, name).toBe(1)
        expect(frame.pilot.fish, name).toBeNull()
        const now = at(fish[0], 0, 0)
        const hand = hands[who](stamps)
        if (!first) {
          first = now
          // It is where it hung on the rod the frame before.
          expect(far(now, hung!), `${name}: off the rod`).toBeLessThan(2)
        }
        if (meal.p < TAKE.reach) {
          // It has not moved, and the hand is on its way to it.
          expect(far(now, first), `${name}: before the hand`).toBeLessThan(0.01)
          if (hand) {
            const off = who === 'chick' ? 0 : far(hand, now)
            if (who !== 'chick') expect(off, `${name}: the hand comes`).toBeLessThanOrEqual(gap + 0.01)
            gap = off
          }
        } else if (meal.p < TAKE.home) {
          // The hand is at the fish, and stays at it while the fish moves.
          expect(hand, `${name}: a hand`).not.toBeNull()
          if (who !== 'chick') expect(far(hand!, now), `${name}: in the hand at ${meal.p}`).toBeLessThan(2.5)
          reached = true
          if (was) carried += far(now, was)
        }
        was = now
      }
      expect(takes, name).toBeGreaterThan(Math.floor(TAKE.lasts * 60) - 3)
      expect(reached, name).toBe(true)
      // It was carried, not dropped: it went some way in that hand.
      expect(carried, name).toBeGreaterThan(10)
    }
  })

  it('has the chick hop out to the fish with its plate and home with the fish on it', () => {
    const played = staged(['fish'], { x: 540, y: ICE_Y - PENGUIN.r - 2, vy: 20, fish: 'wet' })
    playUntil(played, (toy) => toy.phase === 'scene')
    let out = 0, before: Stamp | null = null
    const offs: number[] = []
    let rest: { x: number; y: number } | null = null
    const taken: { fish: { x: number; y: number }; plate: { x: number; y: number }; p: number }[] = []
    while (played.toy.phase === 'scene') {
      play(played, 1 / 60)
      const frame = played.toy.show()
      const stamps = draw(frame)
      const chick = stamps.find((stamp) => stamp.image === art.chick.image)!
      const meal = frame.meal.chick
      // It hops there and back: no frame moves it further than a quick hop does.
      if (before && frame.chick.ride === null) expect(Math.hypot(chick.e - before.e, chick.f - before.f)).toBeLessThan(26)
      before = chick
      if (!meal) continue
      const fish = at(fishOf(stamps)[0], 0, 0), plate = hands.chick(stamps)!
      if (meal.act === 'take') {
        out = Math.max(out, Math.hypot(chick.e - CHICK.x, chick.f - ICE_Y))
        // It never goes into the ice for a fish.
        expect(chick.f).toBeLessThanOrEqual(ICE_Y + 0.01)
        taken.push({ fish, plate, p: meal.p })
      } else if (meal.act === 'react' && !rest) rest = { x: fish.x - plate.x, y: fish.y - plate.y }
    }
    // It went out to the fish: further than a step from its doorway.
    expect(out).toBeGreaterThan(30)
    // From the moment it gets there the fish is on its plate, where it will be when the chick is home.
    for (const one of taken) if (one.p >= TAKE.reach) offs.push(Math.hypot(one.fish.x - one.plate.x - rest!.x, one.fish.y - one.plate.y - rest!.y))
    expect(offs.length).toBeGreaterThan(10)
    // The fish turns and shrinks onto the plate as it goes, so its mouth is a few units from where it will lie.
    expect(Math.max(...offs)).toBeLessThan(8)
  })
})
