import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, IdleLadder } from './guidance'
import { standIn, type Stamp } from './recording'
import { freshSave } from './save'
import { BARE_PAPER, bolt, heardFrom, newToy, play, playUntil, pullAndLetGo, pullAt, slotAt, staged, type Played } from './testing'
import { GHOST_HOLD, HOLD_ON_LINE, PILOT_FLAME, REV_FLAME, type Frame } from './toy'
import { PILOT_LEANS, View } from './view'
import { CATAPULT, SEALS, thingAt } from './world'

// The rocket burns only under a held finger, and nothing may tell the child
// so in words. So the rocket shows it wants the finger: bolted on, it always
// has a small pilot flame that sputters and leans to the last touch; a held
// finger makes it the whole flame, a lift cuts it back at once; and the idle
// ladder's hand shows a hold.

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
  /** The flame as it is drawn in a frame: how long, and how far it is turned from the penguin it is on; null when none is drawn. */
  const flame = (f: Frame): { long: number; wide: number; lean: number } | null => {
    const stamps = draw(f)
    const plume = stamps.find((stamp) => stamp.image === art.flame.image), body = stamps.find((stamp) => stamp.image === art.pilot.image)
    if (!plume || !body) return null
    let lean = Math.atan2(plume.b, plume.a) - Math.atan2(body.b, body.a)
    while (lean > Math.PI) lean -= 2 * Math.PI
    while (lean < -Math.PI) lean += 2 * Math.PI
    return { long: Math.hypot(plume.c, plume.d), wide: Math.hypot(plume.a, plume.b), lean }
  }
  return { art, draw, flame }
}

const withRocket = (): Played => newToy(1, { ...freshSave(null), bolted: ['rocket'] })

describe('the rocket wants a finger', () => {
  it('draws a held flight and a let-go flight apart in the first half second: the whole flame under the finger, the pilot flame without it', () => {
    const { flame } = drawn()
    const held = withRocket(), let_ = withRocket()
    const pull = pullAt(40, 150)
    pullAndLetGo(held, pull)
    pullAndLetGo(let_, pull)
    // The finger that let the pouch go comes down again a twentieth of a second later, on bare paper, and stays.
    play(held, 0.05)
    play(let_, 0.05)
    held.toy.press(BARE_PAPER.x, BARE_PAPER.y)
    held.toy.takeSounds()
    let apart = 0, frames = 0
    for (let n = 3; n < 30; n++) {
      play(held, 1 / 60)
      play(let_, 1 / 60)
      const a = held.toy.show(), b = let_.toy.show()
      if (a.pilot.pose !== 'fly' || b.pilot.pose !== 'fly') continue
      frames += 1
      const burning = flame(a)!, pilot = flame(b)!
      // Both show a flame, so the rocket is seen to be alight; the held one is the whole flame and the other a third of it.
      expect(a.pilot.flame).toBe(1)
      expect(b.pilot.flame).toBe(PILOT_FLAME)
      expect(burning.long).toBeGreaterThan(0.75)
      // The penguin is stretched as it leaves the pouch, and its flame with it: under half the length, all the same.
      expect(pilot.long).toBeLessThan(0.45)
      expect(burning.long).toBeGreaterThan(pilot.long * 2.4)
      expect(burning.wide).toBeGreaterThan(pilot.wide * 1.5)
      apart = Math.hypot(a.pilot.x - b.pilot.x, a.pilot.y - b.pilot.y)
    }
    // Every frame of the flight in that half second, and by the end of it the two penguins are far apart on the page.
    expect(frames).toBeGreaterThan(20)
    expect(apart).toBeGreaterThan(60)
    expect(heardFrom(held)).toContain('whoosh')
    expect(heardFrom(held)).toContain('roar')
    expect(heardFrom(let_)).not.toContain('roar')
  })

  it('cuts the flame to the pilot flame in the frame the finger lifts, with its own small sound, and makes it the whole flame again at a touch', () => {
    const played = staged(['rocket'], { x: 600, y: 300, vx: 100, vy: -200 }, true)
    play(played, 0.2)
    expect(played.toy.show().pilot.flame).toBe(1)
    played.toy.tap()
    const from = played.heard.length
    play(played, 1 / 60)
    expect(played.toy.show().pilot.flame).toBe(PILOT_FLAME)
    expect(heardFrom(played, from)).toEqual(['putt'])
    played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
    played.toy.takeSounds()
    const again = played.heard.length
    play(played, 1 / 60)
    expect(played.toy.show().pilot.flame).toBe(1)
    expect(heardFrom(played, again)).toContain('whoosh')
  })

  it('cuts the flame to the pilot flame in the frame the finger lifts on a seal\'s nose too, with its small sound', () => {
    // The rocket and the open umbrella, coming down on the near seal with a finger held.
    const played = staged(['rocket', 'umbrella'], { x: SEALS[0].x - 6, y: 330, vy: 160, open: true }, true)
    let onNose = false
    for (let n = 0; n < 240 && !onNose; n++) {
      play(played, 1 / 60)
      onNose = played.toy.show().pilot.nose !== null
    }
    expect(onNose).toBe(true)
    play(played, 0.1)
    expect(played.toy.show().pilot.nose).not.toBeNull()
    expect(played.toy.show().pilot.flame).toBe(1)
    played.toy.tap()
    const from = played.heard.length
    play(played, 1 / 60)
    // Still on the nose, and the flame is the pilot flame at once.
    expect(played.toy.show().pilot.nose).not.toBeNull()
    expect(played.toy.show().pilot.flame).toBe(PILOT_FLAME)
    expect(heardFrom(played, from)).toEqual(['putt'])
    // And a finger put down again while it still stands there makes it the whole flame again.
    played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
    play(played, 1 / 60)
    expect(played.toy.show().pilot.nose).not.toBeNull()
    expect(played.toy.show().pilot.flame).toBe(1)
  })

  it('shows no flame once the tank is empty or the whale\'s water is on it, and none without a rocket', () => {
    const empty = staged(['rocket'], { x: 300, y: 200, vx: 100, vy: -100, fuel: 0.05 }, true)
    play(empty, 0.3)
    expect(empty.toy.body!.fuel).toBeLessThanOrEqual(0)
    expect(empty.toy.show().pilot.flame).toBe(0)
    const bare = newToy()
    expect(bare.toy.show().pilot.flame).toBe(0)
    const { flame } = drawn()
    expect(flame(bare.toy.show())).toBeNull()
  })

  it('sputters a small pilot flame in the pouch, which leans to the last touch', () => {
    const { flame } = drawn()
    const played = withRocket()
    const lengths = new Set<string>()
    for (let n = 0; n < 60; n++) {
      play(played, 1 / 60)
      const f = played.toy.show()
      expect(f.pilot.flame).toBe(PILOT_FLAME)
      const seen = flame(f)!
      expect(seen.long).toBeGreaterThan(0.1)
      expect(seen.long).toBeLessThanOrEqual(PILOT_FLAME + 1e-9)
      lengths.add(seen.long.toFixed(2))
    }
    // It sputters: its length is never still.
    expect(lengths.size).toBeGreaterThan(8)
    // A touch on one side of it and then on the other: it leans to each.
    const leanAfter = (x: number, y: number): number => {
      played.toy.press(x, y)
      played.toy.tap()
      let sum = 0
      for (let n = 0; n < 30; n++) { play(played, 1 / 60); sum += flame(played.toy.show())!.lean }
      return sum / 30
    }
    const left = leanAfter(40, 560), right = leanAfter(560, 560)
    expect(Math.abs(left - right)).toBeGreaterThan(0.5)
    expect(Math.abs(left)).toBeLessThanOrEqual(PILOT_LEANS + 0.1)
    expect(Math.abs(right)).toBeLessThanOrEqual(PILOT_LEANS + 0.1)
    expect(played.toy.phase).toBe('loaded')
  })

  it('flares and roars in the pouch under a finger held on the page, goes nowhere, and falls back when the finger lifts', () => {
    const played = withRocket()
    play(played, 0.2)
    played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
    played.toy.takeSounds()
    const from = played.heard.length
    play(played, 0.4)
    expect(played.toy.show().pilot.flame).toBe(REV_FLAME)
    expect(heardFrom(played, from)).toContain('roar')
    expect(played.toy.phase).toBe('loaded')
    expect(played.toy.show().pouch.x).toBeCloseTo(CATAPULT.rest.x, 0)
    played.toy.tap()
    play(played, 1 / 60)
    expect(played.toy.show().pilot.flame).toBe(PILOT_FLAME)
    expect(played.toy.takeSave()).toBe(false)
    // A tap on a seal is over before the rocket revs; a finger on the penguin or on the kit is working those.
    const tapped = withRocket()
    tapped.toy.press(SEALS[0].x, SEALS[0].y - 30)
    play(tapped, 0.08)
    tapped.toy.tap()
    play(tapped, 0.3)
    expect(heardFrom(tapped)).not.toContain('roar')
    for (const at of [CATAPULT.rest, slotAt('wings')]) {
      const working = withRocket()
      working.toy.press(at.x, at.y)
      play(working, 0.6)
      expect(heardFrom(working)).not.toContain('roar')
      expect(working.toy.show().pilot.flame).toBe(PILOT_FLAME)
    }
  })

  it('lights the pilot flame as the rocket is bolted on, and puts it out when it is taken off', () => {
    const played = newToy()
    const sounds = bolt(played, 'rocket').map((sound) => sound.name)
    expect(sounds).toEqual(['pick', 'bolt', 'putt'])
    expect(played.toy.show().pilot.flame).toBe(PILOT_FLAME)
    bolt(played, 'rocket')
    expect(played.toy.show().pilot.flame).toBe(0)
  })
})

describe('the idle ladder with a rocket on', () => {
  /** The frames of one demonstration of the ladder, by its number, with the toy idle throughout. */
  function demo(played: Played, index: number): Frame[] {
    const ladder = new IdleLadder(0)
    const frames: Frame[] = []
    let t = 0
    for (let n = 0; n < 60 * 120; n++) {
      t += 1 / 60
      const guidance = ladder.update(t)
      played.toy.step(1 / 60, guidance)
      played.heard.push(played.toy.takeSounds())
      if (guidance.demo !== null && guidance.demoIndex === index) frames.push(JSON.parse(JSON.stringify(played.toy.show(guidance))) as Frame)
      if (guidance.demoIndex > index) break
    }
    return frames
  }

  it('shows a hold, not a tap: the hand rests on bare paper in one long press, and the flame flares for as long as it rests', () => {
    const played = withRocket()
    const frames = demo(played, 0)
    expect(frames.length).toBeGreaterThan(DEMO_SECONDS * 50)
    expect(thingAt(GHOST_HOLD.x, GHOST_HOLD.y)).toBe('paper')
    let pressed = 0, presses = 0, down = false
    for (const f of frames) {
      // The hand stays where it is, off the penguin, and the pouch is not pulled.
      expect(f.hand).toMatchObject({ x: GHOST_HOLD.x, y: GHOST_HOLD.y })
      expect(Math.hypot(f.pouch.x - CATAPULT.rest.x, f.pouch.y - CATAPULT.rest.y)).toBeLessThan(3)
      const now = f.hand!.press > 0.5
      if (now) pressed += 1
      if (now && !down) presses += 1
      down = now
      // The flame flares with the press and is the pilot flame without it, and leans to the hand.
      expect(f.pilot.flame).toBe(now ? REV_FLAME : PILOT_FLAME)
      expect(f.pilot.flameTo).toEqual({ x: GHOST_HOLD.x, y: GHOST_HOLD.y })
    }
    // One press, and it lasts more than a second and a half of the three: a tap's press is a fifth of that.
    expect(presses).toBe(1)
    expect(pressed / 60).toBeGreaterThan(1.5)
    // The hand shows and flings nothing, and makes no sound.
    expect(heardFrom(played)).toEqual([])
    expect(played.toy.phase).toBe('loaded')
    expect(played.save.last).toBeNull()
  })

  it('shows the hold in the air, on the line of the flight, the next time the hand comes after a flight with the rocket in which no finger was held: once', () => {
    const played = withRocket()
    pullAndLetGo(played, pullAt(40, 170))
    playUntil(played, (toy) => toy.phase === 'loaded')
    played.heard.length = 0
    const line = played.toy.show().line
    expect(line.length).toBeGreaterThan(2 * HOLD_ON_LINE.least)
    const first = demo(played, 0)
    expect(first.length).toBeGreaterThan(DEMO_SECONDS * 50)
    const at = first[0].hand!
    // The hand is on the line of that flight, a little way along it, in the air: not at its start, and not on the bare paper beside the catapult.
    let nearest = Infinity, index = -1
    for (let i = 0; i < line.length; i += 2) {
      const far = Math.hypot(line[i] - at.x, line[i + 1] - at.y)
      if (far < nearest) { nearest = far; index = i / 2 }
    }
    expect(nearest).toBeLessThan(0.01)
    expect(index / (line.length / 2)).toBeGreaterThan(0.1)
    expect(index / (line.length / 2)).toBeLessThan(0.4)
    expect(Math.hypot(at.x - GHOST_HOLD.x, at.y - GHOST_HOLD.y)).toBeGreaterThan(40)
    let pressed = 0, presses = 0, down = false
    for (const f of first) {
      // It stays there, the pouch is not pulled, and the flame flares for as long as it rests, leaning to it.
      expect(f.hand).toMatchObject({ x: at.x, y: at.y })
      expect(Math.hypot(f.pouch.x - CATAPULT.rest.x, f.pouch.y - CATAPULT.rest.y)).toBeLessThan(3)
      const now = f.hand!.press > 0.5
      if (now) pressed += 1
      if (now && !down) presses += 1
      down = now
      expect(f.pilot.flame).toBe(now ? REV_FLAME : PILOT_FLAME)
      expect(f.pilot.flameTo).toEqual({ x: at.x, y: at.y })
    }
    expect(presses).toBe(1)
    expect(pressed / 60).toBeGreaterThan(1.5)
    // It shows, and does nothing: no sound, no flight, and nothing is kept of it.
    expect(heardFrom(played)).toEqual([])
    expect(played.toy.phase).toBe('loaded')
    // The time after, the hand shows the pull as it always does in its turn: the hold on the line was shown once.
    const second = demo(played, 1)
    expect(Math.max(...second.map((f) => Math.hypot(f.pouch.x - CATAPULT.rest.x, f.pouch.y - CATAPULT.rest.y)))).toBeGreaterThan(60)
    const third = demo(played, 2)
    expect(third[0].hand).toMatchObject({ x: GHOST_HOLD.x, y: GHOST_HOLD.y })
    // Another flight with no finger held changes nothing: the hold on a line is shown after the first such flight of a visit and not again.
    pullAndLetGo(played, pullAt(40, 170))
    playUntil(played, (toy) => toy.phase === 'loaded')
    const again = demo(played, 0)
    expect(again[0].hand).toMatchObject({ x: GHOST_HOLD.x, y: GHOST_HOLD.y })
    expect(Math.max(...demo(played, 1).map((f) => Math.hypot(f.pouch.x - CATAPULT.rest.x, f.pouch.y - CATAPULT.rest.y)))).toBeGreaterThan(60)
  })

  it('keeps the hold on bare paper after a flight in which a finger was held, and after a flight with no rocket', () => {
    const lit = withRocket()
    pullAndLetGo(lit, pullAt(40, 170))
    playUntil(lit, (toy) => toy.phase === 'fly')
    lit.toy.press(BARE_PAPER.x, BARE_PAPER.y)
    play(lit, 0.3)
    lit.toy.tap()
    playUntil(lit, (toy) => toy.phase === 'loaded')
    expect(demo(lit, 0)[0].hand).toMatchObject({ x: GHOST_HOLD.x, y: GHOST_HOLD.y })
    const bare = newToy()
    pullAndLetGo(bare, pullAt(40, 170))
    playUntil(bare, (toy) => toy.phase === 'loaded')
    const shown = demo(bare, 0)
    expect(Math.max(...shown.map((f) => Math.hypot(f.pouch.x - CATAPULT.rest.x, f.pouch.y - CATAPULT.rest.y)))).toBeGreaterThan(60)
  })

  it('shows the pull in turn with the hold, and only the pull when no rocket is on', () => {
    const second = demo(withRocket(), 1)
    expect(Math.max(...second.map((f) => Math.hypot(f.pouch.x - CATAPULT.rest.x, f.pouch.y - CATAPULT.rest.y)))).toBeGreaterThan(60)
    expect(second.every((f) => f.pilot.flame === PILOT_FLAME)).toBe(true)
    const bare = demo(newToy(), 0)
    expect(Math.max(...bare.map((f) => Math.hypot(f.pouch.x - CATAPULT.rest.x, f.pouch.y - CATAPULT.rest.y)))).toBeGreaterThan(60)
    expect(bare.every((f) => f.pilot.flame === 0)).toBe(true)
    expect(IDLE_BEFORE_DEMO).toBeGreaterThan(0)
  })
})
