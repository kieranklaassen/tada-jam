import { describe, expect, it } from 'vitest'
import { BALLOON_PULL, BARE, BASKET_HOLDS, FULL_STRETCH, FWOP, GRAVITY, SEAL_HOLDS, SEAL_KEEPS, SEAL_TOSS, SPRING, STEP, TANK, TOP_SPEED, WEIGHT, WING, clampPouch, fly, launch, step, stretchOf, weightOf, type Body, type Happening } from './flight'
import { bodyAt, everyLoad, everyPull, findPull, gridOfPulls, loadOf, placeOf, pullAt, run, type Place } from './testing'
import { BALLOON, BASKET, BERG, CATAPULT, CLOUD, CRATE, DRIFT, DRIFT_TAKES, FLOORS, ICE_Y, IGLOO, OFF_PAGE, PARTS, PENGUIN, SEALS, SEA_Y, SHELF_EDGE, SPOUT, WHALE, inCloud, type Box, type Circle, type Part } from './world'

const kindsOf = (out: Happening[]): string[] => out.map((what) => what.kind)
const speedOf = (body: Body): number => Math.hypot(body.vx, body.vy)

/** How far the body's round is inside a round thing or a box, 0 when it is clear. */
const intoCircle = (body: Body, c: Circle): number => Math.max(0, c.r + PENGUIN.r - Math.hypot(body.x - c.x, body.y - c.y))
const intoBox = (body: Body, b: Box): number => {
  const dx = body.x - Math.max(b.x0, Math.min(b.x1, body.x)), dy = body.y - Math.max(b.y0, Math.min(b.y1, body.y))
  return Math.max(0, PENGUIN.r - Math.hypot(dx, dy))
}

/** A place in clear air over the ice, well away from everything. */
const CLEAR = { x: 520, y: 420 } as const
/** A place in the cloud, and one over a seal. */
const IN_CLOUD = { x: CLOUD[2].x, y: CLOUD[2].y } as const
const overSeal = (which: number): { x: number; y: number } => ({ x: SEALS[which].x, y: SEALS[which].y - SEALS[which].r - PENGUIN.r - 8 })

describe('the pull', () => {
  it('stretches the bands only once the slack is taken up, and no further than their reach', () => {
    expect(stretchOf(CATAPULT.rest)).toBe(0)
    expect(stretchOf(pullAt(30, CATAPULT.reach))).toBeCloseTo(FULL_STRETCH, 6)
    const far = clampPouch(pullAt(30, CATAPULT.reach * 3))
    expect(Math.hypot(far.x - CATAPULT.fork.x, far.y - CATAPULT.fork.y)).toBeCloseTo(CATAPULT.reach, 6)
  })

  it('keeps the pouch on the page, above the ice and within the bands reach, wherever the finger goes', () => {
    for (let x = -400; x <= 1600; x += 23) for (let y = -300; y <= 1200; y += 19) {
      const at = clampPouch({ x, y })
      expect(at.x).toBeGreaterThanOrEqual(CATAPULT.wall)
      expect(at.y).toBeLessThanOrEqual(CATAPULT.floor)
      expect(Math.hypot(at.x - CATAPULT.fork.x, at.y - CATAPULT.fork.y)).toBeLessThanOrEqual(CATAPULT.reach + 1e-6)
      // The penguin in the pouch stays above the ice by its own half height.
      expect(at.y + PENGUIN.height / 2).toBeLessThanOrEqual(ICE_Y)
    }
  })

  it('leaves a pull that needs no help where the finger put it', () => {
    const at = pullAt(20, 150)
    expect(clampPouch(at)).toEqual(at)
  })
})

describe('the launch', () => {
  it('leaves the fork along the line from the pouch to the fork', () => {
    for (const pull of everyPull()) {
      const body = launch(pull)
      expect(body.x).toBe(CATAPULT.fork.x)
      expect(body.y).toBe(CATAPULT.fork.y)
      const speed = speedOf(body)
      if (speed === 0) continue
      const far = Math.hypot(CATAPULT.fork.x - pull.x, CATAPULT.fork.y - pull.y)
      expect(body.vx / speed).toBeCloseTo((CATAPULT.fork.x - pull.x) / far, 6)
      expect(body.vy / speed).toBeCloseTo((CATAPULT.fork.y - pull.y) / far, 6)
    }
  })

  it('is faster the further the pull, in proportion to the stretch, up to the top speed', () => {
    const at = (reach: number): number => speedOf(launch(pullAt(30, reach)))
    expect(at(CATAPULT.reach)).toBeCloseTo(TOP_SPEED, 6)
    expect(at(CATAPULT.slack)).toBeCloseTo(0, 6)
    expect(at(CATAPULT.slack + FULL_STRETCH / 2)).toBeCloseTo(TOP_SPEED / 2, 6)
    expect(at(150)).toBeGreaterThan(at(120))
  })

  it('gives a heavier penguin less speed from the same stretch: every part has weight, and the rocket is the heaviest', () => {
    const bare = speedOf(launch(pullAt(40, 180)))
    for (const part of PARTS) {
      expect(WEIGHT[part]).toBeGreaterThan(0)
      expect(WEIGHT.rocket).toBeGreaterThanOrEqual(WEIGHT[part])
      expect(speedOf(launch(pullAt(40, 180), loadOf([part])))).toBeCloseTo(bare / Math.sqrt(1 + WEIGHT[part]), 6)
    }
    // Two parts weigh what both weigh.
    expect(weightOf(loadOf(['rocket', 'fish']))).toBeCloseTo(1 + WEIGHT.rocket + WEIGHT.fish, 9)
    expect(weightOf(BARE)).toBe(1)
  })
})

describe('the flight', () => {
  it('is the same flight for the same pull, the same load and the same finger, every time', () => {
    const held = (body: Body): boolean => body.age > 0.3 && body.age < 1.1
    for (const load of [BARE, loadOf(['rocket', 'wings']), loadOf(['balloon', 'fish']), loadOf(['umbrella', 'springs'])]) for (const pull of [pullAt(20, 170), pullAt(60, 200), pullAt(45, 150)]) {
      const first = fly(pull, load, held), again = fly(pull, load, held)
      expect(again.body).toEqual(first.body)
      expect(again.happened).toEqual(first.happened)
      expect(again.path).toEqual(first.path)
    }
  })

  it('ends, for every pull and every load there is, in one of the ways a flight ends, and not one is carried off', () => {
    const ways = new Set<string>()
    let longest = 0
    for (const load of everyLoad()) for (const pull of gridOfPulls(40)) for (const hold of [() => false, () => true]) {
      if (hold() && !load.parts.includes('rocket')) continue
      const { body, happened } = fly(pull, load, hold)
      expect(body.ended, `${load.parts.join('+')} from ${pull.x}, ${pull.y}`).not.toBeNull()
      expect(happened.filter(({ what }) => what.kind === 'end')).toHaveLength(1)
      expect(happened[happened.length - 1].what.kind).toBe('end')
      longest = Math.max(longest, body.age)
      ways.add(body.ended!)
    }
    // With any load the penguin still comes down, and in good time.
    expect(longest).toBeLessThan(25)
    expect([...ways].sort()).toEqual(['basket', 'beak', 'belly', 'drift', 'feet', 'off', 'sea'])
  })

  it('leaves a body whose flight has ended as it is', () => {
    const { body } = fly(pullAt(85, 150))
    const before = { ...body }
    const out: Happening[] = []
    step(body, out, true)
    expect(body).toEqual(before)
    expect(out).toEqual([])
  })

  it('falls under its own weight: with nothing in the way, the path rises, turns over and comes down', () => {
    const { path } = fly(pullAt(80, 150))
    const top = Math.min(...path.map((p) => p.y))
    expect(top).toBeLessThan(CATAPULT.fork.y - 80)
    expect(path[path.length - 1].y).toBeGreaterThan(top)
  })

  it('is slowed by the air more the faster it goes', () => {
    const slow = bodyAt(CLEAR.x, CLEAR.y, 200, 0), fast = bodyAt(CLEAR.x, CLEAR.y, 600, 0)
    step(slow, [])
    step(fast, [])
    // Nine times the drag at three times the speed.
    expect((600 - fast.vx) / (200 - slow.vx)).toBeCloseTo(9, 1)
  })
})

describe('the landscape, with nothing bolted on', () => {
  it('sticks a steep, fast landing in by the beak, and lets a slow one lie where it fell', () => {
    const dive = bodyAt(CLEAR.x, 500, 20, 520)
    const out = run(dive, 200)
    expect(out[out.length - 1]).toMatchObject({ kind: 'end', how: 'beak', on: 'ice' })
    expect(dive.y).toBeCloseTo(ICE_Y - PENGUIN.r, 6)
    const plop = bodyAt(CLEAR.x, 560, 10, 120)
    expect(run(plop, 600).pop()).toMatchObject({ kind: 'end', how: 'belly' })
  })

  it('lets a shallow landing skid along the ice until it stops on its belly', () => {
    const body = bodyAt(100, ICE_Y - PENGUIN.r - 20, 240, 30)
    let skidded = 0
    const out = run(body, 3000, false, (b) => { if (b.skidding) skidded += 1; return false })
    expect(body.ended).toBe('belly')
    expect(kindsOf(out)).toContain('ice')
    // Ice is slippery: the skid goes on for a good part of a second, and ends further on.
    expect(skidded * STEP).toBeGreaterThan(0.4)
    expect(body.x).toBeGreaterThan(160)
  })

  it('bounces a body on off either seal: upwards, with nine tenths of its speed and never less than the toss, and never back the way it came', () => {
    for (const which of [0, 1]) for (const [vx, vy] of [[220, 300], [-220, 300], [40, 200], [300, 520]]) {
      const from = overSeal(which)
      const body = bodyAt(from.x - Math.sign(vx) * 20, from.y, vx, vy)
      const out = run(body, 60, false, (_, seen) => seen.some((what) => what.kind === 'seal'))
      const met = out.find((what) => what.kind === 'seal')
      expect(met).toMatchObject({ kind: 'seal', which })
      const before = met && met.kind === 'seal' ? met.speed : 0
      expect(body.vy).toBeLessThan(0)
      expect(speedOf(body)).toBeCloseTo(Math.max(before * SEAL_KEEPS, SEAL_TOSS), 3)
      expect(body.vx * vx).toBeGreaterThan(0)
    }
  })

  it('stops whatever goes into the snowdrift, dead', () => {
    const body = bodyAt(DRIFT.x + 10, DRIFT.y - DRIFT.ry - 120, 0, 200)
    const out = run(body, 400)
    expect(out[out.length - 1]).toMatchObject({ kind: 'end', how: 'drift' })
    expect(body.vx).toBe(0)
    expect(body.vy).toBe(0)
  })

  it('lifts a body that comes over the blowhole, and only there, as hard each time', () => {
    const over = bodyAt(SPOUT.x, SPOUT.bottom - 200, 0, 200)
    const beside = bodyAt(SPOUT.x - SPOUT.half - 60, SPOUT.bottom - 200, 0, 200)
    const out = run(over, 30)
    run(beside, 30)
    expect(out.filter((what) => what.kind === 'spout')).toHaveLength(1)
    expect(over.vy).toBeLessThan(beside.vy - 100)
    const again = bodyAt(SPOUT.x, SPOUT.bottom - 200, 0, 200)
    run(again, 30)
    expect(again).toEqual(over)
  })

  it('slows a body in the thin cloud and leaves it wearing a beard of mist', () => {
    const wet = bodyAt(IN_CLOUD.x, IN_CLOUD.y, 300, 0), dry = bodyAt(CLEAR.x, CLEAR.y, 300, 0)
    expect(inCloud(wet.x, wet.y)).toBe(true)
    expect(inCloud(dry.x, dry.y)).toBe(false)
    const out = run(wet, 12)
    run(dry, 12)
    expect(kindsOf(out)).toContain('cloudIn')
    expect(wet.misted).toBe(true)
    expect(dry.misted).toBe(false)
    expect(wet.vx).toBeLessThan(dry.vx)
  })

  it('ends a flight that comes down on open water in the sea', () => {
    const body = bodyAt(SHELF_EDGE + 60, 500, 0, 100)
    run(body, 600)
    expect(body.ended).toBe('sea')
    expect(body.y + PENGUIN.r).toBeGreaterThanOrEqual(SEA_Y - 5)
  })

  it('ends a flight that leaves the paper by either edge', () => {
    const left = bodyAt(20, 300, -400, -100), right = bodyAt(1160, 300, 400, -100)
    run(left, 400)
    run(right, 400)
    expect(left.ended).toBe('off')
    expect(left.x).toBeLessThan(OFF_PAGE.left)
    expect(right.ended).toBe('off')
    expect(right.x).toBeGreaterThan(OFF_PAGE.right)
  })

  it('lets a body that meets the side of the basket gently hold on there, and sends a harder one off again', () => {
    const come = (vx: number): { body: Body; out: Happening[] } => {
      const body = bodyAt(BASKET.x0 - PENGUIN.r - 8, (BASKET.y0 + BASKET.y1) / 2, vx, -40)
      return { body, out: run(body, 30, false, (_, seen) => seen.some((what) => what.kind === 'bump')) }
    }
    const gentle = come(BASKET_HOLDS - 40)
    expect(gentle.body.ended).toBe('basket')
    // It holds on beside the basket, outside it and clear of the balloon.
    expect(gentle.body.x).toBeCloseTo(BASKET.x0 - PENGUIN.r, 1)
    expect(intoCircle(gentle.body, BALLOON)).toBe(0)
    const hard = come(BASKET_HOLDS + 200)
    expect(hard.body.ended).toBeNull()
    expect(hard.out).toContainEqual(expect.objectContaining({ kind: 'bump', what: 'basket' }))
    expect(hard.body.vx).toBeLessThan(0)
  })

  it('has no room on top of the basket, under the balloon, for a body to come down', () => {
    expect(BASKET.y0 - (BALLOON.y + BALLOON.r)).toBeLessThan(PENGUIN.r * 2)
  })

  it('gives the kit a lid that is a floor like the ice, level with it, and no sides to strike', () => {
    const onLid = bodyAt((CRATE.x0 + CRATE.x1) / 2, ICE_Y - PENGUIN.r - 30, 0, 460)
    expect(run(onLid, 60).pop()).toMatchObject({ kind: 'end', how: 'beak', on: 'crate' })
    expect(onLid.y).toBeCloseTo(ICE_Y - PENGUIN.r, 6)
    const across = bodyAt(CRATE.x1 + 80, ICE_Y - PENGUIN.r - 2, -300, 20)
    const out = run(across, 40)
    expect(kindsOf(out)).not.toContain('bump')
    expect(across.vx).toBeLessThan(0)
    expect(across.x).toBeLessThan(CRATE.x1 + 10)
  })

  it('treats the igloo, the whale, the iceberg and the skin of the balloon as walls', () => {
    const hits: [Body, string][] = [
      [bodyAt(IGLOO.x - IGLOO.r - PENGUIN.r - 6, IGLOO.y - 10, 300, 0), 'igloo'],
      [bodyAt(WHALE.x, WHALE.y - WHALE.r - PENGUIN.r - 4, 0, 260, [], { inSpout: true }), 'whale'],
      [bodyAt(BERG.x0 - PENGUIN.r - 6, BERG.y0 + 60, 300, 0), 'berg'],
      [bodyAt(BALLOON.x - BALLOON.r - PENGUIN.r - 6, BALLOON.y, 300, 0), 'balloon'],
    ]
    for (const [body, what] of hits) {
      const out = run(body, 12, false, (_, seen) => seen.some((one) => one.kind === 'bump'))
      expect(out, what).toContainEqual(expect.objectContaining({ kind: 'bump', what }))
    }
  })
})

describe('the rocket', () => {
  it('pushes along the way the penguin points for as long as a finger is held, and not otherwise', () => {
    const held = bodyAt(CLEAR.x, CLEAR.y, 200, -200, ['rocket']), free = bodyAt(CLEAR.x, CLEAR.y, 200, -200, ['rocket'])
    const out = run(held, 30, true)
    run(free, 30, false)
    expect(out[0]).toEqual({ kind: 'flame', on: true, why: 'held' })
    expect(held.burning).toBe(true)
    expect(free.burning).toBe(false)
    // Up and to the right is where it points, and that is where the push goes.
    expect(held.vx).toBeGreaterThan(free.vx + 50)
    expect(held.vy).toBeLessThan(free.vy - 50)
    expect(run(held, 2, false)).toEqual([{ kind: 'flame', on: false, why: 'let' }])
  })

  it('burns one tank a flight, about a second and a half, and then no more', () => {
    const body = bodyAt(200, 200, 100, -300, ['rocket'])
    let burnt = 0
    const out = run(body, 400, true, (b) => { if (b.burning) burnt += 1; return false })
    expect(burnt * STEP).toBeCloseTo(TANK, 1)
    expect(TANK).toBeCloseTo(1.5, 1)
    expect(out).toContainEqual({ kind: 'flame', on: false, why: 'empty' })
    expect(body.fuel).toBeLessThanOrEqual(0)
  })

  it('is put out by the whale water and lights again once clear, if fuel is left', () => {
    const body = bodyAt(SPOUT.x - SPOUT.half - 30, 420, 160, -60, ['rocket'])
    const out = run(body, 400, true, (b, seen) => seen.filter((what) => what.kind === 'flame' && what.on).length >= 2 || b.fuel <= 0)
    const flames = out.filter((what) => what.kind === 'flame')
    expect(flames.slice(0, 3)).toEqual([{ kind: 'flame', on: true, why: 'held' }, { kind: 'flame', on: false, why: 'water' }, { kind: 'flame', on: true, why: 'held' }])
  })

  it('melts through the snowdrift still burning, and comes out the far side slower and sooty', () => {
    // The drift lies between the igloo and the far seal, so it is come into from above.
    const from = { x: DRIFT.x + 5, y: DRIFT.y - DRIFT.ry - 170 }
    const body = bodyAt(from.x, from.y, 20, 320, ['rocket'])
    let before = 0
    const out = run(body, 300, true, (b, seen) => {
      if (!seen.some((what) => what.kind === 'melt')) before = speedOf(b)
      return b.x > DRIFT.x + DRIFT.rx + DRIFT_TAKES + 2
    })
    expect(kindsOf(out)).toContain('melt')
    expect(kindsOf(out)).not.toContain('end')
    // It comes out on the far side from the catapult, slower than it went in, and sooty.
    expect(body.x).toBeGreaterThan(DRIFT.x + DRIFT.rx)
    expect(speedOf(body)).toBeLessThan(before)
    expect(body.sooty).toBe(true)
    // Without the flame the drift has it, like anything else.
    const cold = bodyAt(from.x, from.y, 20, 320, ['rocket'])
    run(cold, 300)
    expect(cold.ended).toBe('drift')
  })

  it('punches one hole in the cloud each time it burns through it', () => {
    const body = bodyAt(IN_CLOUD.x - 200, IN_CLOUD.y, 300, 0, ['rocket'])
    const out = run(body, 150, true)
    expect(out.filter((what) => what.kind === 'hole')).toHaveLength(1)
    // Through its own hole it is neither slowed like a wet thing nor misted.
    expect(body.misted).toBe(false)
  })

  it('ploughs along the ice like a sledge while it burns, and sticks in nowhere', () => {
    const body = bodyAt(90, ICE_Y - PENGUIN.r - 40, 200, 560, ['rocket'])
    const out = run(body, 40, true)
    expect(kindsOf(out)).not.toContain('end')
    expect(body.skidding).toBe(true)
    expect(body.burning).toBe(true)
    // The same dive without the flame sticks.
    const cold = bodyAt(90, ICE_Y - PENGUIN.r - 40, 200, 560, ['rocket'])
    expect(run(cold, 40).pop()).toMatchObject({ kind: 'end', how: 'beak' })
  })
})

describe('the glider wings', () => {
  it('lift at right angles to the flight, with the square of the speed, up to what the canvas holds', () => {
    const lift = (speed: number): number => {
      const winged = bodyAt(CLEAR.x, CLEAR.y, speed, 0, ['wings']), bare = bodyAt(CLEAR.x, CLEAR.y, speed, 0)
      step(winged, [])
      step(bare, [])
      return (bare.vy - winged.vy) / STEP
    }
    expect(lift(200)).toBeCloseTo(WING.lift * 200 * 200, 0)
    expect(lift(400) / lift(200)).toBeCloseTo(4, 1)
    // Past what the canvas holds there is no more lift, and the wings flutter.
    expect(lift(900)).toBeCloseTo(WING.holds, 0)
    const fast = bodyAt(CLEAR.x, CLEAR.y, 900, 0, ['wings'])
    expect(run(fast, 1)).toContainEqual({ kind: 'flutter' })
  })

  it('lift nothing with no speed: launched straight up, the penguin comes down like a leaf', () => {
    const body = bodyAt(CLEAR.x, 300, 0, 0, ['wings'])
    step(body, [])
    expect(body.vy).toBeCloseTo(GRAVITY * STEP, 3)
  })

  it('soak in the cloud, and lift a third as much for the rest of the flight', () => {
    const body = bodyAt(IN_CLOUD.x, IN_CLOUD.y, 300, 0, ['wings'])
    expect(run(body, 2)).toContainEqual({ kind: 'soaked', what: 'wings' })
    expect(body.wet).toBe(true)
    const wet = bodyAt(CLEAR.x, CLEAR.y, 300, 0, ['wings'], { wet: true }), dry = bodyAt(CLEAR.x, CLEAR.y, 300, 0, ['wings']), bare = bodyAt(CLEAR.x, CLEAR.y, 300, 0)
    for (const one of [wet, dry, bare]) step(one, [])
    expect((bare.vy - wet.vy) / (bare.vy - dry.vy)).toBeCloseTo(1 / 3, 2)
  })

  it('make a long flat hop of a seal, and a long low run of the ice', () => {
    const from = overSeal(0)
    const winged = bodyAt(from.x - 20, from.y, 220, 300, ['wings']), bare = bodyAt(from.x - 20, from.y, 220, 300)
    run(winged, 60, false, (_, seen) => seen.some((what) => what.kind === 'seal'))
    run(bare, 60, false, (_, seen) => seen.some((what) => what.kind === 'seal'))
    // Flatter than a bare penguin is sent on.
    expect(Math.abs(winged.vy / winged.vx)).toBeLessThan(Math.abs(bare.vy / bare.vx))
    // On the ice the wings carry some of the weight: the same skid loses less than half the speed a bare one loses.
    const lost = (parts: Part[]): number => {
      const body = bodyAt(70, ICE_Y - PENGUIN.r, 300, 0, parts, { skidding: true, turn: 0 })
      run(body, 40)
      expect(body.skidding).toBe(true)
      return 300 - body.vx
    }
    expect(lost(['wings'])).toBeLessThan(lost([]) * 0.6)
  })

  it('ride the whale water higher than anything else does', () => {
    const top = (parts: Part[]): number => {
      const body = bodyAt(SPOUT.x - 24, SPOUT.bottom - 70, 0, 0, parts)
      let highest = body.y
      run(body, 600, false, (b) => { highest = Math.min(highest, b.y); return !b.inSpout && b.age > 1.1 })
      return highest
    }
    const winged = top(['wings'])
    for (const parts of [[], ['rocket'], ['umbrella'], ['balloon'], ['springs'], ['fish']] as Part[][]) expect(winged, parts.join()).toBeLessThan(top(parts))
  })
})

describe('the umbrella', () => {
  it('is shut while the penguin rises and opens when it falls: a large drag on the fall only', () => {
    const rising = bodyAt(CLEAR.x, CLEAR.y, 100, -300, ['umbrella']), bare = bodyAt(CLEAR.x, CLEAR.y, 100, -300)
    run(rising, 20)
    run(bare, 20)
    expect(rising.open).toBe(false)
    expect(rising.vy).toBeCloseTo(bare.vy, 6)
    const falling = bodyAt(CLEAR.x, 340, 0, 10, ['umbrella']), stone = bodyAt(CLEAR.x, 340, 0, 10)
    const out = run(falling, 80)
    run(stone, 80)
    expect(out[0]).toEqual({ kind: 'umbrella', how: 'open' })
    expect(falling.vy).toBeLessThan(stone.vy / 2)
  })

  it('sets the penguin down on its feet, and turns inside out when it comes down fast', () => {
    const gently = bodyAt(CLEAR.x, 420, 30, 40, ['umbrella'])
    expect(run(gently, 400).pop()).toMatchObject({ kind: 'end', how: 'feet', on: 'ice' })
    const fast = bodyAt(CLEAR.x, ICE_Y - PENGUIN.r - 6, 320, FWOP, ['umbrella'], { open: true })
    const out = run(fast, 4)
    expect(out).toContainEqual({ kind: 'umbrella', how: 'flip' })
    expect(fast.flipped).toBe(true)
    expect(fast.open).toBe(false)
  })

  it('is balanced on a seal nose for a moment before the seal tips it on', () => {
    const from = overSeal(0)
    const body = bodyAt(from.x, from.y - 30, 40, 60, ['umbrella'], { open: true })
    const out = run(body, 400, false, (_, seen) => seen.some((what) => what.kind === 'seal'))
    const caught = out.findIndex((what) => what.kind === 'caught'), sent = out.findIndex((what) => what.kind === 'seal')
    expect(caught).toBeGreaterThanOrEqual(0)
    expect(sent).toBeGreaterThan(caught)
    expect(body.vy).toBeLessThan(0)
    // Held still for as long as the seal holds it.
    const held = bodyAt(from.x, from.y - 30, 40, 60, ['umbrella'], { open: true })
    run(held, 400, false, (b) => b.held > 0)
    const at = { x: held.x, y: held.y }
    let steps = 0
    run(held, 400, false, (b) => { steps += 1; return b.held <= 0 })
    expect(steps * STEP).toBeCloseTo(SEAL_HOLDS, 1)
    expect({ x: held.x, y: held.y }).toEqual(at)
  })

  it('keeps the penguin and anything else bolted on dry in the cloud', () => {
    for (const other of ['wings', 'balloon', 'fish'] as Part[]) {
      const body = bodyAt(IN_CLOUD.x, IN_CLOUD.y, 200, 20, ['umbrella', other])
      const out = run(body, 20)
      expect(kindsOf(out)).not.toContain('soaked')
      expect(kindsOf(out)).not.toContain('fish')
      expect(body.misted).toBe(false)
    }
  })

  it('is driven up the whale water like a cork: harder than a bare penguin', () => {
    const cork = bodyAt(SPOUT.x, SPOUT.bottom - 80, 0, 40, ['umbrella'], { open: true }), bare = bodyAt(SPOUT.x, SPOUT.bottom - 80, 0, 40)
    run(cork, 20)
    run(bare, 20)
    expect(cork.vy).toBeLessThan(bare.vy)
  })
})

describe('the balloon', () => {
  it('pulls up with four fifths of the bare penguin weight, and half as hard once it hangs with dew', () => {
    const pull = (more: Partial<Body>): number => {
      const body = bodyAt(CLEAR.x, CLEAR.y, 0, 0, ['balloon'], more)
      step(body, [])
      return GRAVITY - body.vy / STEP
    }
    expect(BALLOON_PULL.dry).toBeCloseTo(0.8, 6)
    expect(pull({})).toBeCloseTo((BALLOON_PULL.dry * GRAVITY) / (1 + WEIGHT.balloon), 3)
    expect(pull({ dewy: true }) / pull({})).toBeCloseTo(0.5, 6)
    const body = bodyAt(IN_CLOUD.x, IN_CLOUD.y, 100, 0, ['balloon'])
    expect(run(body, 2)).toContainEqual({ kind: 'soaked', what: 'balloon' })
  })

  it('never carries the penguin off: let go at rest in clear air, it still comes down', () => {
    const body = bodyAt(CLEAR.x, 200, 0, 0, ['balloon'])
    run(body, 60)
    expect(body.vy).toBeGreaterThan(0)
  })

  it('touches down on tiptoe and goes on in slow hops, each a little shorter', () => {
    const body = bodyAt(60, ICE_Y - PENGUIN.r - 120, 50, 260, ['balloon'])
    const out = run(body, 6000)
    const hops = out.filter((what) => what.kind === 'ice' && what.hop).map((what) => (what.kind === 'ice' ? what.speed : 0))
    expect(hops.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < hops.length; i++) expect(hops[i]).toBeLessThan(hops[i - 1])
    expect(out[out.length - 1]).toMatchObject({ kind: 'end', how: 'feet' })
  })

  it('is nosed up by a seal slower and steeper than a bare penguin', () => {
    const from = overSeal(0)
    const light = bodyAt(from.x - 20, from.y, 220, 300, ['balloon']), bare = bodyAt(from.x - 20, from.y, 220, 300)
    for (const one of [light, bare]) run(one, 60, false, (_, seen) => seen.some((what) => what.kind === 'seal'))
    expect(speedOf(light)).toBeLessThan(speedOf(bare))
    expect(Math.abs(light.vy / light.vx)).toBeGreaterThan(Math.abs(bare.vy / bare.vx))
  })

  it('is spun round its own string by the whale water', () => {
    const body = bodyAt(SPOUT.x, SPOUT.bottom - 120, 0, 0, ['balloon'])
    const before = body.turn
    run(body, 30)
    expect(Math.abs(body.turn - before)).toBeGreaterThan(2)
  })
})

describe('the spring feet', () => {
  it('bounce on and on off the ice, each bounce three quarters of the last, and then stand', () => {
    const body = bodyAt(70, ICE_Y - PENGUIN.r - 200, 12, 300, ['springs'])
    const out = run(body, 8000)
    const speeds = out.filter((what) => what.kind === 'ice' && what.hop).map((what) => (what.kind === 'ice' ? what.speed : 0))
    expect(speeds.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < speeds.length; i++) expect(speeds[i] / speeds[i - 1]).toBeCloseTo(SPRING.keeps, 1)
    expect(SPRING.keeps).toBeCloseTo(0.75, 6)
    expect(out[out.length - 1]).toMatchObject({ kind: 'end', how: 'feet' })
  })

  it('lose nothing to a seal: the bounce is the highest in the game', () => {
    const from = overSeal(1)
    const after = (parts: Part[]): number => {
      const body = bodyAt(from.x - 10, from.y, 120, 520, parts)
      run(body, 60, false, (_, seen) => seen.some((what) => what.kind === 'seal'))
      return -body.vy
    }
    const sprung = after(['springs'])
    for (const parts of [[], ['rocket'], ['wings'], ['balloon'], ['fish']] as Part[][]) expect(sprung, parts.join()).toBeGreaterThan(after(parts))
  })

  it('are pushed back out of the snowdrift the way they came, by one hop', () => {
    const body = bodyAt(DRIFT.x + 5, DRIFT.y - DRIFT.ry - 170, 20, 320, ['springs'])
    const out = run(body, 300, false, (_, seen) => seen.some((what) => what.kind === 'sprung'))
    expect(kindsOf(out)).toContain('sprung')
    expect(body.vx).toBeLessThan(0)
    expect(body.vy).toBeLessThan(0)
    expect(body.ended).toBeNull()
  })

  it('fill with water in the spout', () => {
    const body = bodyAt(SPOUT.x, SPOUT.bottom - 150, 0, 0, ['springs'])
    run(body, 2)
    expect(body.filled).toBe(true)
  })
})

describe('the fish on a rod', () => {
  it('comes out of the spout or the cloud wet and out of the snowdrift frozen, and the last of these wins', () => {
    const inSpout = bodyAt(SPOUT.x, SPOUT.bottom - 150, 0, 0, ['fish'])
    expect(run(inSpout, 2)).toContainEqual({ kind: 'fish', now: 'wet' })
    const cloud = bodyAt(IN_CLOUD.x, IN_CLOUD.y, 100, 0, ['fish'])
    expect(run(cloud, 2)).toContainEqual({ kind: 'fish', now: 'wet' })
    const drift = bodyAt(DRIFT.x, DRIFT.y - DRIFT.ry - 80, 0, 200, ['fish'], { fish: 'wet' })
    expect(run(drift, 200)).toContainEqual({ kind: 'fish', now: 'frozen' })
    expect(drift.fish).toBe('frozen')
    const thawed = bodyAt(SPOUT.x, SPOUT.bottom - 150, 0, 0, ['fish'], { fish: 'frozen' })
    run(thawed, 2)
    expect(thawed.fish).toBe('wet')
  })

  it('is eaten by a seal in passing, and the bounce is the same as ever', () => {
    const from = overSeal(0)
    const fed = bodyAt(from.x - 20, from.y, 220, 300, ['fish']), bare = bodyAt(from.x - 20, from.y, 220, 300)
    const out = run(fed, 60, false, (_, seen) => seen.some((what) => what.kind === 'seal'))
    run(bare, 60, false, (_, seen) => seen.some((what) => what.kind === 'seal'))
    expect(out).toContainEqual({ kind: 'eaten', which: 0 })
    expect(fed.fish).toBe('eaten')
    expect(fed.vx).toBeCloseTo(bare.vx, 6)
    expect(fed.vy).toBeCloseTo(bare.vy, 6)
  })

  it('leaves as it is given: a fish that was frozen on an earlier flight leaves frozen', () => {
    expect(launch(pullAt(30, 150), loadOf(['fish'], 'frozen')).fish).toBe('frozen')
    expect(launch(pullAt(30, 150), loadOf(['wings'], 'frozen')).fish).toBeNull()
  })
})

describe('two parts together', () => {
  it('add their forces: the rocket and the balloon climb higher than either does alone', () => {
    const top = (parts: Part[]): number => Math.min(...fly(pullAt(88, 200), loadOf(parts), (body) => body.vy < 0 || body.age < 0.2).path.map((p) => p.y))
    const both = top(['rocket', 'balloon'])
    expect(both).toBeLessThan(top(['rocket']))
    expect(both).toBeLessThan(top(['balloon']))
  })

  it('reach every friend by more than one route', () => {
    const reaches = (parts: Part[], who: Place, hold: (body: Body) => boolean = () => false): boolean => findPull(loadOf(parts), (flight) => placeOf(flight) === who, hold) !== null
    // The weather balloon: with the rocket and the balloon straight up, with the wings in one long climb, with the spring feet off the near seal.
    expect(reaches(['rocket', 'balloon'], 'puffin', (body) => body.age < 0.5)).toBe(true)
    expect(findPull(loadOf(['wings']), (flight) => placeOf(flight) === 'puffin' && !flight.happened.some(({ what }) => what.kind === 'seal'))).not.toBeNull()
    expect(findPull(loadOf(['springs']), (flight) => placeOf(flight) === 'puffin' && flight.happened.some(({ what }) => what.kind === 'seal' && what.which === 0))).not.toBeNull()
    // The iceberg: off the seals and the whale water, or across the water with the rocket.
    expect(findPull(BARE, (flight) => placeOf(flight) === 'walrus' && flight.happened.filter(({ what }) => what.kind === 'seal' || what.kind === 'spout').length === 3)).not.toBeNull()
    expect(findPull(loadOf(['rocket']), (flight) => placeOf(flight) === 'walrus' && !flight.happened.some(({ what }) => what.kind === 'seal' || what.kind === 'spout'), () => true)).not.toBeNull()
    // The igloo close by, with nothing at all.
    expect(reaches([], 'chick')).toBe(true)
  })

  it('carry a fish to each friend: frozen to the walrus, fresh under the umbrella through the cloud to the chick, wet to the puffin', () => {
    // The fish is frozen in the drift on one flight, and stays frozen on the rod for the next.
    expect(findPull(loadOf(['fish']), (flight) => flight.body.ended === 'drift' && flight.body.fish === 'frozen')).not.toBeNull()
    expect(findPull(loadOf(['fish', 'rocket'], 'frozen'), (flight) => placeOf(flight) === 'walrus' && flight.body.fish === 'frozen', () => true)).not.toBeNull()
    expect(findPull(loadOf(['fish', 'umbrella']), (flight) => placeOf(flight) === 'chick' && flight.body.fish === 'fresh' && flight.happened.some(({ what }) => what.kind === 'cloudIn'))).not.toBeNull()
    expect(findPull(loadOf(['fish', 'balloon']), (flight) => placeOf(flight) === 'puffin' && flight.body.fish === 'wet')).not.toBeNull()
  })
})

describe('the spread of a bare pull', () => {
  const pulls = gridOfPulls()
  const flights = pulls.map((pull) => ({ pull, flight: fly(pull) }))
  const places = flights.map(({ flight }) => placeOf(flight))
  const count = (place: Place): number => places.filter((one) => one === place).length

  it('reaches the belly slide, the beak in the ice, the drift, the sea and each friend from several pulls a square apart', () => {
    for (const place of ['belly', 'beak', 'drift', 'sea', 'chick', 'walrus', 'puffin'] as Place[]) expect(count(place), place).toBeGreaterThanOrEqual(5)
    // The igloo close by is the easiest friend, and the other two are harder.
    expect(count('chick')).toBeGreaterThan(count('walrus'))
    expect(count('chick')).toBeGreaterThan(count('puffin'))
  })

  it('ends nowhere more than a third of the time, and off the paper seldom', () => {
    for (const place of new Set(places)) expect(count(place) / places.length, place).toBeLessThan(1 / 3)
    expect(count('off')).toBeLessThan(places.length / 20)
  })

  it('finds each of them again a square away: every place is reached from two pulls side by side', () => {
    for (const place of ['belly', 'beak', 'drift', 'sea', 'chick', 'walrus', 'puffin'] as Place[]) {
      const here = pulls.filter((_, i) => places[i] === place)
      const paired = here.some((a) => here.some((b) => a !== b && Math.abs(a.col - b.col) <= 1 && Math.abs(a.row - b.row) <= 1))
      expect(paired, place).toBe(true)
    }
  })

  it('meets something on the way, most times: a seal, the igloo, the cloud or the whale', () => {
    const met = flights.filter(({ flight }) => flight.happened.some(({ what }) => what.kind === 'seal' || what.kind === 'bump' || what.kind === 'spout' || what.kind === 'cloudIn')).length
    expect(met / flights.length).toBeGreaterThan(0.55)
    // And no flight is long: the next pull is never far off.
    expect(Math.max(...flights.map(({ flight }) => flight.body.age))).toBeLessThan(10)
  })
})

describe('nothing passes through anything', () => {
  it('never leaves the body inside a seal, the igloo, the whale, the balloon, the basket, the iceberg or the ice, with any load', () => {
    let worst = 0
    const holds: ((body: Body) => boolean)[] = [() => false, () => true, (body) => body.age > 0.7]
    for (const load of everyLoad()) for (const pull of gridOfPulls(40)) for (const hold of load.parts.includes('rocket') ? holds : holds.slice(0, 1)) {
      const body = launch(pull, load)
      const out: Happening[] = []
      for (let n = 0; n < 6000 && !body.ended; n++) {
        step(body, out, hold(body))
        if (body.ended === 'drift' || body.ended === 'off') break
        for (const round of [...SEALS, IGLOO, WHALE, BALLOON]) worst = Math.max(worst, intoCircle(body, round))
        worst = Math.max(worst, intoBox(body, BASKET))
        if (body.x < BERG.x0) worst = Math.max(worst, intoBox(body, BERG))
        for (const floor of FLOORS) if (body.x >= floor.x0 && body.x <= floor.x1 && floor.of !== 'crate') worst = Math.max(worst, Math.min(PENGUIN.r, body.y + PENGUIN.r - floor.top))
      }
    }
    // What is allowed: half a unit, which is less than the width of a pencil line.
    expect(worst).toBeLessThanOrEqual(0.5)
  })
})
