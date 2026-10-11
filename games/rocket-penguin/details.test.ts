import { describe, expect, it } from 'vitest'
import { STEP, fly, type Fish } from './flight'
import { serialize } from './save'
import { fit } from './stage'
import { bolt, everyLoad, gridOfPulls, heardFrom, newToy, play, playHome, playUntil, pullAndLetGo, staged, still, type Played } from './testing'
import { LINE_POINTS, found } from './toy'
import { BASKET, BERG, CATAPULT, DRIFT, ICE_Y, OFF_PAGE, PENGUIN, SEALS, SEA_Y, WHALE, WHALE_BODY, WHALE_EYE, WHALE_TAIL, inPolygon, thingAt, type Part } from './world'

// Small things each held by itself: which honk a landing gives, that a hop is
// heard only with a hop, how long the pencil line lasts, what becomes of the
// fish on the rod when the game is put away, where the paper ends on a wide
// surface, and how the whale answers a finger.

const OVER_DRIFT = { x: DRIFT.x + 5, y: DRIFT.y - DRIFT.ry - 34 }

/** Plays a staged flight home, keeping every frame's pose, height and sounds. */
function watched(played: Played): { pose: string; y: number; sounds: string[] }[] {
  const frames: { pose: string; y: number; sounds: string[] }[] = []
  for (let n = 0; n < 2400 && played.toy.phase !== 'loaded'; n++) {
    play(played, 1 / 60)
    const pilot = played.toy.show().pilot
    frames.push({ pose: pilot.pose, y: pilot.y, sounds: played.heard[played.heard.length - 1].map((sound) => sound.name) })
  }
  expect(played.toy.phase).toBe('loaded')
  return frames
}

describe('the honk after a landing', () => {
  it('is muffled only when the head is in the ice or the snow', () => {
    const cases: [string, readonly Part[], { x: number; y: number; vx?: number; vy?: number; open?: boolean }, string, string][] = [
      ['stuck by the beak', [], { x: 540, y: ICE_Y - PENGUIN.r - 40, vy: 500 }, 'beak', 'muffled'],
      ['swallowed by the drift', [], { ...OVER_DRIFT, vy: 250 }, 'buried', 'muffled'],
      ['hung in the drift by its wings, head out', ['wings'], { ...OVER_DRIFT, vy: 250 }, 'hung', 'squawk'],
      ['sat on the drift in its umbrella, head out', ['umbrella'], { ...OVER_DRIFT, vy: 120, open: true }, 'bowl', 'squawk'],
      ['afloat', [], { x: 965, y: 540, vy: 150 }, 'bob', 'squawk'],
      ['holding on to the basket', [], { x: BASKET.x0 - PENGUIN.r - 2, y: 308, vx: 100 }, 'perch', 'squawk'],
    ]
    for (const [name, parts, put, pose, honk] of cases) {
      const played = staged(parts, put)
      playUntil(played, (toy) => toy.phase === 'scene')
      expect(played.toy.show().pilot.pose, name).toBe(pose)
      const from = played.heard.length
      play(played, 0.8)
      const honks = heardFrom(played, from).filter((sound) => sound === 'muffled' || sound === 'squawk' || sound === 'honk')
      expect(honks, name).toEqual([honk])
    }
  })
})

describe('the hop voice', () => {
  it('is heard only as the penguin leaves the ground: within a quarter of a second it is higher than it was', () => {
    const scenes: [string, readonly Part[], { x: number; y: number; vx?: number; vy?: number; open?: boolean }][] = [
      ['a belly landing', [], { x: 238, y: ICE_Y - PENGUIN.r - 12, vx: -60, vy: 120 }],
      ['the sea', [], { x: 965, y: 540, vy: 150 }],
      ['the near side of the basket', [], { x: BASKET.x0 - PENGUIN.r - 2, y: 308, vx: 100 }],
      ['the far side of the basket', [], { x: BASKET.x1 + PENGUIN.r + 2, y: 308, vx: -100 }],
      ['the drift', [], { ...OVER_DRIFT, vy: 250 }],
      ['the drift in an umbrella', ['umbrella'], { ...OVER_DRIFT, vy: 120, open: true }],
      ['the iceberg', [], { x: 1150, y: BERG.y0 - PENGUIN.r - 2, vy: 20 }],
      ['off the paper', [], { x: 1232, y: 300, vx: 300 }],
    ]
    let hops = 0
    for (const [name, parts, put] of scenes) {
      const frames = watched(staged(parts, put))
      frames.forEach((frame, at) => {
        if (!frame.sounds.includes('hop')) return
        hops += 1
        // The frame before the sound is where it stood.
        const stood = frames[Math.max(0, at - 1)].y
        const highest = Math.min(...frames.slice(at, at + 15).map((later) => later.y))
        expect(stood - highest, `${name}, frame ${at}`).toBeGreaterThanOrEqual(8)
      })
      // The last hop of every way back is the one up into the pouch.
      expect(frames.filter((frame) => frame.sounds.includes('hop')).length, name).toBeGreaterThanOrEqual(1)
    }
    expect(hops).toBeGreaterThan(scenes.length)
  })

  it('is not heard where nothing hops: afloat it only turns to swim, and at the basket it shifts its hold with a creak of wicker', () => {
    const sea = watched(staged([], { x: 965, y: 540, vy: 150 }))
    // Afloat and under the water, no hop.
    for (const frame of sea) if (frame.pose === 'bob' || frame.pose === 'under') expect(frame.sounds).not.toContain('hop')
    const basket = staged([], { x: BASKET.x0 - PENGUIN.r - 2, y: 308, vx: 100 })
    const frames = watched(basket)
    const perched = frames.filter((frame) => frame.pose === 'perch').flatMap((frame) => frame.sounds)
    expect(perched).not.toContain('hop')
    expect(perched.filter((sound) => sound === 'wicker').length).toBe(2)
  })
})

describe('the line of the flight', () => {
  it('lasts the whole of the longest flight the parts allow, from the fork to where it comes down', () => {
    // The longest flight there is: every load from pulls all over the grid, the rocket both held and let go.
    let longest = { age: 0, pull: { x: 0, y: 0 }, parts: [] as readonly Part[], hold: false }
    for (const load of everyLoad()) for (const pull of gridOfPulls(20)) for (const hold of load.parts.includes('rocket') ? [false, true] : [false]) {
      const age = fly(pull, load, () => hold).body.age
      if (age > longest.age) longest = { age, pull, parts: load.parts, hold }
    }
    // It outlasts what the line holds at a point every three steps.
    expect(longest.age).toBeGreaterThan(LINE_POINTS * 3 * STEP)
    const played = newToy(1)
    played.save.bolted = [...longest.parts]
    pullAndLetGo(played, longest.pull)
    if (longest.hold) played.toy.press(330, 330)
    playUntil(played, (toy) => toy.phase === 'scene', 1 / 60, 60)
    const body = played.toy.body!
    expect(body.age).toBeCloseTo(longest.age, 5)
    const line = [...played.toy.show().line]
    expect(line.length / 2).toBeLessThanOrEqual(LINE_POINTS + 1)
    expect(line.length / 2).toBeGreaterThan(LINE_POINTS / 2)
    // It starts at the fork and ends where the flight ended.
    expect(Math.hypot(line[0] - CATAPULT.fork.x, line[1] - CATAPULT.fork.y)).toBeLessThan(12)
    expect(Math.hypot(line[line.length - 2] - body.x, line[line.length - 1] - body.y)).toBeLessThan(1)
    // And it has no hole in it: no two points are further apart than a body's width, but for the one stride with
    // which each seal takes an open umbrella from where it landed onto its nose.
    const strides: number[] = []
    for (let i = 2; i < line.length; i += 2) {
      const far = Math.hypot(line[i] - line[i - 2], line[i + 1] - line[i - 1])
      if (far >= PENGUIN.width) strides.push(far)
    }
    expect(strides.length).toBeLessThanOrEqual(SEALS.length)
    for (const far of strides) expect(far).toBeLessThan(2 * (SEALS[0].r + PENGUIN.r))
  }, 30_000)

  it('ends where the flight ended for a short flight too', () => {
    const played = staged([], { x: 540, y: ICE_Y - PENGUIN.r - 40, vy: 500 })
    playUntil(played, (toy) => toy.phase === 'scene')
    const line = played.toy.show().line, body = played.toy.body!
    expect(Math.hypot(line[line.length - 2] - body.x, line[line.length - 1] - body.y)).toBeLessThan(1)
  })
})

describe('the fish on the rod', () => {
  /** A flight with the rod on that leaves the fish as `fish`, played home. */
  function carried(fish: Fish): Played {
    const played = newToy(1)
    bolt(played, 'fish')
    played.toy.takeSave()
    const pull = gridOfPulls(10).find((at) => {
      const flight = fly(at, { parts: ['fish'], fish: 'fresh' })
      // Home again with the fish as wanted, and not at a friend's, who would take it.
      return flight.body.fish === fish && (flight.body.ended === 'sea' || (flight.body.ended === 'drift' && fish === 'frozen'))
    })
    expect(pull, fish).toBeDefined()
    pullAndLetGo(played, pull!)
    return played
  }

  it('is saved as the flight left it, in the frame the flight comes down, and is found so after a put-away', () => {
    for (const fish of ['wet', 'frozen'] as const) {
      const played = carried(fish)
      played.toy.takeSave()
      playUntil(played, (toy) => toy.phase === 'scene')
      // Saved at once, when the scene starts.
      expect(played.save.rod, fish).toBe(fish)
      expect(played.toy.takeSave(), fish).toBe(true)
      // Put away in the middle of the way back, and found: the same fish hangs on the rod.
      play(played, 0.5)
      const back = found(JSON.parse(JSON.stringify(serialize(played.save))), null, 1)
      expect(back.show().pilot.fish, fish).toBe(fish)
      expect(back.phase).toBe('loaded')
      // Played home instead, it is the same game.
      expect(playHome(played)).toBe(true)
      expect(played.toy.show().pilot.fish, fish).toBe(fish)
      expect(still(back.show()).pilot.fish).toBe(played.toy.show().pilot.fish)
      // And the next flight leaves with it as it is.
      pullAndLetGo(played, { x: 200, y: 470 })
      playUntil(played, (toy) => toy.phase === 'fly')
      expect(played.toy.body!.fish, fish).toBe(fish)
    }
  })

  it('is as it was before the flight when the game is put away in the air: nothing is saved in the air', () => {
    const played = carried('wet')
    playUntil(played, (toy) => toy.phase === 'fly' && toy.body!.fish === 'wet')
    expect(played.save.rod).toBe('fresh')
    expect(found(JSON.parse(JSON.stringify(serialize(played.save))), null, 1).show().pilot.fish).toBe('fresh')
  })

  it('is fresh again once a seal or a friend has had it, and whenever the rod comes out of the kit', () => {
    // A seal eats it in passing: the rod is baited fresh.
    const eaten = staged(['fish'], { x: 392, y: SEA_Y - 70 - PENGUIN.r - 12, vy: 300 })
    eaten.save.rod = 'frozen'
    playUntil(eaten, (toy) => toy.phase === 'scene')
    expect(eaten.toy.body!.fish).toBe('eaten')
    expect(eaten.save.rod).toBe('fresh')
    // A friend takes it.
    const given = staged(['fish'], { x: 1150, y: BERG.y0 - PENGUIN.r - 2, vy: 20, fish: 'frozen' })
    playUntil(given, (toy) => toy.phase === 'scene')
    expect(given.save.eating).toEqual({ who: 'walrus', fish: 'frozen' })
    expect(given.save.rod).toBe('fresh')
    // Unbolted and bolted on again, it leaves the kit fresh.
    const played = carried('frozen')
    expect(playHome(played)).toBe(true)
    expect(played.save.rod).toBe('frozen')
    bolt(played, 'fish')
    expect(played.save.bolted).toEqual([])
    expect(played.save.rod).toBe('fresh')
    bolt(played, 'fish')
    expect(played.toy.show().pilot.fish).toBe('fresh')
  })
})

describe('the edge of the paper, in flight', () => {
  it('lets a flight go on to the edge that is seen on a wide surface, and walks the penguin back on from there', () => {
    const put = { x: 1232, y: 300, vx: 300, vy: -200 }
    // On the stage's own shape it has left the paper a step later.
    const tablet = staged([], put)
    play(tablet, 0.1)
    expect(tablet.toy.phase).toBe('scene')
    expect(tablet.toy.show().pilot.pose).toBe('gone')
    // On a surface 1920 wide the paper goes on, and so does the flight.
    const by = fit(1920, 820)
    const x0 = -by.x / by.scale, x1 = (1920 - by.x) / by.scale
    const wide = newToy(1)
    wide.toy.sees(x0, x1)
    pullAndLetGo(wide, { x: 120, y: 480 })
    playUntil(wide, (toy) => toy.phase === 'fly')
    Object.assign(wide.toy.body!, put, { spin: 0, age: 1 })
    play(wide, 0.1)
    expect(wide.toy.phase).toBe('fly')
    expect(wide.toy.body!.x).toBeGreaterThan(OFF_PAGE.right)
    // It comes down on the iceberg beyond the stage, or leaves by the edge that is seen: never in between.
    playUntil(wide, (toy) => toy.phase === 'scene')
    const body = wide.toy.body!
    if (body.ended === 'off') {
      expect(body.x).toBeGreaterThan(x1 + PENGUIN.r)
      // It walks back on from that edge.
      play(wide, 1.2)
      const walking = wide.toy.show().pilot
      expect(walking.pose).toBe('walk')
      expect(walking.x).toBeGreaterThan(OFF_PAGE.right)
      expect(walking.x).toBeLessThanOrEqual(x1 + PENGUIN.r + 2)
    } else expect(body.x).toBeLessThanOrEqual(x1 + PENGUIN.r + 2)
    expect(playHome(wide)).toBe(true)
  })

  it('leaves by the left edge that is seen, too', () => {
    const wide = newToy(1)
    wide.toy.sees(-400, 1580)
    pullAndLetGo(wide, { x: 120, y: 480 })
    playUntil(wide, (toy) => toy.phase === 'fly')
    Object.assign(wide.toy.body!, { x: -40, y: 200, vx: -500, vy: -300, spin: 0, age: 1 })
    play(wide, 0.1)
    expect(wide.toy.phase).toBe('fly')
    playUntil(wide, (toy) => toy.phase === 'scene')
    // Off by the far edge, or down on the ice that the wide surface shows.
    const body = wide.toy.body!
    if (body.ended === 'off') expect(body.x).toBeLessThan(-400 - PENGUIN.r)
    else expect(body.x).toBeGreaterThanOrEqual(-400 - PENGUIN.r - 2)
    expect(playHome(wide)).toBe(true)
  })
})

describe('the whale under a finger', () => {
  const regions = [
    ['its eye', 'whaleEye', WHALE_EYE.x, WHALE_EYE.y, 'moan', 'wide'],
    ['its head', 'whale', WHALE.x + 10, SEA_Y + 40, 'puff', 'puff'],
    ['its back', 'whaleBack', 740, 760, 'rumble', 'tickle'],
    ['its tail', 'whaleTail', WHALE_TAIL.x - 40, WHALE_TAIL.y + 10, 'swish', 'tail'],
  ] as const

  it('answers wherever it is drawn, each large part of it with a sight and a sound of its own', () => {
    expect(new Set(regions.map((region) => region[4])).size).toBe(regions.length)
    const moved = new Set<string>()
    for (const [name, thing, x, y, sound, sight] of regions) {
      expect(thingAt(x, y), name).toBe(thing)
      const played = newToy()
      const before = still(played.toy.show()).whale
      played.toy.press(x, y)
      expect(played.toy.takeSounds().map((heard) => heard.name), name).toEqual([sound])
      play(played, 0.15)
      const after = played.toy.show().whale
      // Its own sight is what moved, and no other part's.
      const changed = (['wide', 'puff', 'tickle', 'tail'] as const).filter((key) => Math.abs(after[key] - before[key]) > (key === 'tail' ? 0.05 : key === 'puff' ? 0.3 : 0.01))
      expect(changed, name).toEqual([sight])
      moved.add(changed.join())
    }
    expect(moved.size).toBe(regions.length)
  })

  it('never answers a press on its body with a pencil dot', () => {
    // Wherever its body is drawn, from the root of its tail to its head, a press finds the whale and not the bare paper.
    let inside = 0
    for (let x = 480; x <= 1050; x += 6) for (let y = 640; y <= 812; y += 6) {
      if (!inPolygon(x, y, WHALE_BODY)) continue
      inside += 1
      expect(['whale', 'whaleEye', 'whaleBack', 'whaleTail'], `at ${x}, ${y}`).toContain(thingAt(x, y))
    }
    expect(inside).toBeGreaterThan(600)
    // And its flukes, which are drawn apart.
    for (const [dx, dy] of [[-32, -27], [-60, -31], [-46, -1], [-62, 35], [-32, 29]]) expect(thingAt(WHALE_TAIL.x + dx, WHALE_TAIL.y + dy)).toBe('whaleTail')
  })
})
