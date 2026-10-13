import { describe, expect, it } from 'vitest'
import { PART_SHAPES, type PartShape } from './art'
import { TIERS } from './config'
import { standIn, type Stamp } from './recording'
import { freshSave } from './save'
import { everyLoad, gridOfPulls, newToy, play, pullAndLetGo, staged, type Played } from './testing'
import type { Frame } from './toy'
import { View } from './view'
import { BERG, ICE_Y, PENGUIN, SEALS, SEAL_NOSES, SHELF_EDGE, type Part } from './world'

// Nothing bolted on is drawn in the ice or in a seal. The penguin is flown as
// a round, and intersections.test.ts holds the round out of everything; what
// is bolted to it reaches further than the round. So here every bolted part
// is measured as it is drawn: the view draws each frame of a whole flight on
// the stand-in canvas, at one pixel to a unit, and the outline of every part
// it stamped is laid against the ice of the shelf, the iceberg and each seal.
// No clip is counted: a part hidden under a clip is still measured.
//
// Where it is said to be in something, and so not measured:
// - In the pouch, before the flight, and in the kit.
// - Under the water it is not drawn, and floating it sits in the water as a bath duck does.
// - In the snowdrift, which takes whatever comes into it (buried, hung by the wings, sat in the umbrella).
// - On its way home along the back of the shelf, behind whatever stands on the ice.
// Allowed, with its cap: the umbrella balanced on a seal's nose stands on the seal. The nose is on the seal's own
// round, so the cloth beside its point lies over the top of the round, in front of it, by no more than NOSE_CAP.

/** The model leaves the round at most half a unit inside a thing between two steps, and a part is turned free in steps of a few hundredths of a turn: no part is drawn further in than this. */
const CAP = 1
const NOSE_CAP = 24

function drawn() {
  const stand = standIn()
  const view = new View(stand.make)
  view.setTier(TIERS[0])
  view.build(stand.ctx, 1180, 820, 1)
  const art = view.figures!
  const shapes = new Map<unknown, PartShape>()
  for (const name of Object.keys(PART_SHAPES) as PartShape[]) shapes.set(art.parts[name].image, name)
  const draw = (f: Frame): Stamp[] => {
    stand.reset()
    view.draw(stand.ctx, f, 1 / 60)
    return stand.tally.placed.map((stamp) => ({ ...stamp }))
  }
  return { art, shapes, draw }
}

/** A part's outline as it was stamped, a point every two units along it, in stage units. */
function outlineOf(stamp: Stamp, shape: PartShape): { x: number; y: number }[] {
  const flat = PART_SHAPES[shape], points: { x: number; y: number }[] = []
  for (let i = 0; i < flat.length; i += 2) {
    const x0 = flat[i], y0 = flat[i + 1], x1 = flat[(i + 2) % flat.length], y1 = flat[(i + 3) % flat.length]
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2))
    for (let step = 0; step < steps; step++) {
      const x = x0 + ((x1 - x0) * step) / steps, y = y0 + ((y1 - y0) * step) / steps
      points.push({ x: stamp.a * x + stamp.c * y + stamp.e, y: stamp.b * x + stamp.d * y + stamp.f })
    }
  }
  return points
}

/** How far a point is inside the ice of the shelf, the iceberg or a seal: to the nearest face of it. */
function into(at: { x: number; y: number }): number {
  let deep = 0
  if (at.x <= SHELF_EDGE) deep = Math.max(deep, Math.min(at.y - ICE_Y, SHELF_EDGE - at.x))
  if (at.x >= BERG.x0 && at.x <= BERG.x1) deep = Math.max(deep, Math.min(at.y - BERG.y0, at.x - BERG.x0))
  for (const seal of SEALS) deep = Math.max(deep, seal.r - Math.hypot(at.x - seal.x, at.y - seal.y))
  return deep
}

/** The parts the penguin wears in a frame's stamps: not the fish a friend is eating, which is the same figure. */
function worn(stamps: Stamp[], shapes: Map<unknown, PartShape>): { stamp: Stamp; shape: PartShape }[] {
  const rod = stamps.find((stamp) => shapes.get(stamp.image) === 'rod')
  const tip = rod ? { x: rod.a * 140 + rod.c * -40 + rod.e, y: rod.b * 140 + rod.d * -40 + rod.f } : null
  const out: { stamp: Stamp; shape: PartShape }[] = []
  for (const stamp of stamps) {
    const shape = shapes.get(stamp.image)
    if (!shape) continue
    if ((shape === 'fish' || shape === 'frozen') && !(tip && Math.hypot(stamp.e - tip.x, stamp.f - tip.y) < 0.01)) continue
    out.push({ stamp, shape })
  }
  return out
}

const deepest = (stamp: Stamp, shape: PartShape): number => Math.max(0, ...outlineOf(stamp, shape).map(into))

/** Whether a frame is one of those the head of this file leaves out. */
const leftOut = (f: Frame): boolean => f.pilot.behind || ['seat', 'under', 'gone', 'bob', 'buried', 'hung', 'bowl'].includes(f.pilot.pose)

/** Pulls from all over the grid: every eighteenth, and none of those the audit of the round flies. */
const PULLS = gridOfPulls(20).filter((_, index) => index % 18 === 4)

/** Plays a toy home, handing every frame to `look`. A finger is held for the first second when `hold` is set. */
function watch(played: Played, look: (f: Frame, n: number) => void, hold = false): void {
  if (hold) played.toy.press(330, 330)
  for (let n = 0; n < 2400 && played.toy.phase !== 'loaded'; n++) {
    if (hold && n === 60) played.toy.tap()
    play(played, 1 / 60)
    look(played.toy.show(), n)
  }
  expect(played.toy.phase).toBe('loaded')
}

type Worst = { into: number; when: string }
type Sweep = { flights: number; frames: number; byPart: Map<PartShape, Worst>; onNose: Worst; nosed: number; poses: Set<string>; skids: number; shut: number }
let swept: Sweep | null = null
/** Every load with something bolted on, from pulls all over the grid, the rocket both held and not, once. */
function sweep(): Sweep {
  if (swept) return swept
  const { art, shapes, draw } = drawn()
  const found: Sweep = { flights: 0, frames: 0, byPart: new Map(), onNose: { into: 0, when: '' }, nosed: 0, poses: new Set(), skids: 0, shut: 0 }
  for (const load of everyLoad()) for (const pull of PULLS) for (const hold of load.parts.includes('rocket') ? [false, true] : [false]) {
    if (load.parts.length === 0) continue
    const played = newToy(1, { ...freshSave(null), bolted: [...load.parts] })
    pullAndLetGo(played, pull)
    const name = `${load.parts.join(' and ')} from ${Math.round(pull.x)}, ${Math.round(pull.y)}${hold ? ', held' : ''}`
    watch(played, (f, n) => {
      if (leftOut(f)) return
      // High in the air nothing is within reach of the ice or a seal: the longest part is under 200 units.
      if (f.pilot.pose === 'fly' && f.pilot.y < 220) return
      const stamps = draw(f)
      found.frames += 1
      found.poses.add(f.pilot.pose)
      if (f.pilot.skid) found.skids += 1
      for (const { stamp, shape } of worn(stamps, shapes)) {
        const deep = deepest(stamp, shape)
        const when = `${shape}, ${f.pilot.pose}${f.pilot.skid ? ' in a skid' : ''}, frame ${n}, ${name}`
        // Standing on a nose: the one allowance.
        const nose = f.pilot.nose
        if (nose && shape === 'umbrellaOpen' && Math.hypot(stamp.e + stamp.c * -149 - nose.x, stamp.f + stamp.d * -149 - nose.y) < 1) {
          found.nosed += 1
          if (deep > found.onNose.into) found.onNose = { into: deep, when }
          continue
        }
        // An umbrella the flight has open or blown out, drawn shut: knocked shut where it has no room.
        if (shape === 'umbrellaShut' && f.pilot.umbrella !== 'shut') found.shut += 1
        const before = found.byPart.get(shape)
        if (!before || deep > before.into) found.byPart.set(shape, { into: deep, when })
      }
      expect(art.parts.rocket).toBeDefined()
    }, hold)
    found.flights += 1
  }
  swept = found
  return found
}

describe('nothing bolted on is drawn in the ice or in a seal', () => {
  it('keeps every bolted part out of the ice, the iceberg and each seal through whole flights: the air, the bounce, the skid, the stop and the getting up, for every load and pulls all over the grid', () => {
    const found = sweep()
    expect(found.flights).toBeGreaterThan(220)
    expect(found.frames).toBeGreaterThan(50_000)
    // Every figure of every part was met, and so were the skid and each way of stopping.
    expect([...found.byPart.keys()].sort()).toEqual((Object.keys(PART_SHAPES) as PartShape[]).sort())
    expect(found.skids).toBeGreaterThan(500)
    for (const pose of ['fly', 'belly', 'beak', 'stand', 'perch']) expect(found.poses, pose).toContain(pose)
    for (const [shape, worst] of found.byPart) expect(worst.into, `${shape}: ${worst.when}`).toBeLessThanOrEqual(CAP)
  }, 240_000)

  it('allows the umbrella balanced on a seal\'s nose to stand on the seal, over the top of its round by no more than its cap', () => {
    const found = sweep()
    expect(found.nosed).toBeGreaterThan(0)
    expect(found.onNose.into, found.onNose.when).toBeLessThanOrEqual(NOSE_CAP)
    // The nose it stands on is on the seal's own round: that is why its cloth lies over the round.
    for (const which of [0, 1]) expect(Math.hypot(SEAL_NOSES[which].x - SEALS[which].x, SEAL_NOSES[which].y - SEALS[which].y)).toBeLessThan(SEALS[which].r)
  }, 240_000)

  it('knocks the open umbrella shut only where its cloth has no room to be open', () => {
    // Between the shelf and the iceberg, in the whale's water: few frames of few flights.
    const found = sweep()
    expect(found.shut).toBeLessThan(found.frames / 500)
  }, 240_000)
})

/** A penguin with `parts` on, coming down flat at speed on the bare ice between the kit and the near seal: it slides on its belly. Returns each frame of the slide and the frame it stopped in, with what was drawn. */
function slide(parts: readonly Part[], way: 1 | -1) {
  const { art, shapes, draw } = drawn()
  const played = staged(parts, { x: way > 0 ? 110 : 255, y: ICE_Y - PENGUIN.r - 3, vx: way * 150, vy: 30 })
  const skid: { f: Frame; stamps: Stamp[] }[] = []
  let stopped: { f: Frame; stamps: Stamp[] } | null = null
  for (let n = 0; n < 600 && !stopped; n++) {
    play(played, 1 / 60)
    const f = played.toy.show()
    const stamps = draw(f)
    if (f.pilot.skid) skid.push({ f: JSON.parse(JSON.stringify(f)) as Frame, stamps })
    else if (f.pilot.pose === 'belly') stopped = { f, stamps }
  }
  expect(skid.length).toBeGreaterThan(20)
  expect(stopped).not.toBeNull()
  return { art, shapes, skid, stopped: stopped! }
}

const at = (stamp: Stamp, x: number, y: number): { x: number; y: number } => ({ x: stamp.a * x + stamp.c * y + stamp.e, y: stamp.b * x + stamp.d * y + stamp.f })

describe('each part has its pose for the skid and the stop', () => {
  it('folds the wing that is under the penguin back along its side, where it trails clear of the ice; the other stands up as a sail', () => {
    for (const way of [1, -1] as const) {
      const { art, skid, stopped } = slide(['wings'], way)
      // Once it has lain down: from a fifth of a second into the slide, and when it has stopped.
      for (const { f, stamps } of [...skid.slice(12), stopped]) {
        const wings = stamps.filter((stamp) => stamp.image === art.parts.wings.image)
        expect(wings).toHaveLength(2)
        // The far wing is laid first. Its tip is behind the penguin's feet and above the ice.
        const under = at(wings[0], -124, -36), sail = at(wings[1], -124, -36)
        expect((f.pilot.x - under.x) * way).toBeGreaterThan(PENGUIN.height / 2)
        expect(under.y).toBeLessThanOrEqual(ICE_Y)
        expect(under.y).toBeGreaterThan(f.pilot.y - PENGUIN.r)
        // And none of it is under the ice.
        for (const point of outlineOf(wings[0], 'wings')) expect(point.y).toBeLessThanOrEqual(ICE_Y + CAP)
        // The near wing is above the penguin's back.
        expect(sail.y).toBeLessThan(f.pilot.y - PENGUIN.r)
      }
      // In the air before, the far wing was spread on the other side of the body from the near one.
      const inAir = staged(['wings'], { x: 400, y: 300, vx: way * 300, vy: 0 })
      play(inAir, 0.1)
      const { art: air, draw } = drawn()
      const spread = draw(inAir.toy.show()).filter((stamp) => stamp.image === air.parts.wings.image)
      const f = inAir.toy.show()
      expect(at(spread[0], -124, -36).y).toBeGreaterThan(f.pilot.y + PENGUIN.r)
      expect(at(spread[1], -124, -36).y).toBeLessThan(f.pilot.y - PENGUIN.r)
    }
  })

  it('carries the rod over the back in a skid, trailing behind, and the fish hangs from it above the ice', () => {
    for (const way of [1, -1] as const) {
      const { art, skid, stopped } = slide(['fish'], way)
      for (const { f, stamps } of [...skid.slice(12), stopped]) {
        const rod = stamps.find((stamp) => stamp.image === art.parts.rod.image)!
        const tip = at(rod, 140, -40)
        // The end of the line is behind the penguin's middle and above its back.
        expect((f.pilot.x - tip.x) * way).toBeGreaterThan(PENGUIN.r)
        expect(tip.y).toBeLessThan(f.pilot.y - PENGUIN.r)
        // The fish hangs from it, straight down but for its swing, and its tail is above the ice.
        const fish = stamps.find((stamp) => stamp.image === art.parts.fish.image && Math.hypot(stamp.e - tip.x, stamp.f - tip.y) < 0.01)!
        expect(fish).toBeDefined()
        expect(Math.abs(Math.atan2(fish.b, fish.a))).toBeLessThanOrEqual(1.2)
        for (const point of outlineOf(fish, 'fish')) expect(point.y).toBeLessThan(ICE_Y - 10)
        for (const point of outlineOf(rod, 'rod')) expect(point.y).toBeLessThan(ICE_Y)
      }
    }
  })

  it('slides belly down whichever way it goes: sent back the other way, it is turned round and is never on its back', () => {
    for (const way of [1, -1] as const) {
      const { art, skid, stopped } = slide(['rocket'], way)
      for (const { f, stamps } of [...skid.slice(12), stopped]) {
        expect(f.pilot.face).toBe(way)
        // Its beak is under its middle and the rocket on its back is above it.
        const beak = stamps.find((stamp) => stamp.image === art.beak.image)!
        const rocket = stamps.find((stamp) => stamp.image === art.parts.rocket.image)!
        expect(beak.f).toBeGreaterThan(f.pilot.y)
        expect(rocket.f).toBeLessThan(f.pilot.y - PENGUIN.r)
      }
    }
  })

  it('slides the rocket round on its strap when the penguin is stuck by its beak, so its nose is out of the ice', () => {
    const { art, draw } = drawn()
    const played = staged(['rocket'], { x: 540, y: ICE_Y - PENGUIN.r - 40, vx: 20, vy: 620 })
    while (played.toy.phase === 'fly') play(played, 1 / 60)
    const f = played.toy.show()
    expect(f.pilot.pose).toBe('beak')
    const rocket = draw(f).find((stamp) => stamp.image === art.parts.rocket.image)!
    for (const point of outlineOf(rocket, 'rocket')) expect(point.y).toBeLessThanOrEqual(ICE_Y + CAP)
    // As it is strapped on, upside down, its nose would be well into the ice: it has been turned.
    const strapped = Math.atan2(rocket.b, rocket.a)
    expect(Math.abs(Math.abs(strapped) - Math.PI)).toBeGreaterThan(0.1)
  })

  it('leans the balloon and folds the wings away from a seal the penguin bounces on', () => {
    const { art, shapes, draw } = drawn()
    for (const parts of [['wings'], ['balloon'], ['fish'], ['rocket'], ['umbrella'], ['springs']] as const) for (const which of [0, 1]) for (const side of [-1, 0, 1]) {
      const seal = SEALS[which]
      const played = staged(parts, { x: seal.x + side * 60, y: seal.y - seal.r - PENGUIN.r - 30, vx: side * -40, vy: 260 })
      let measured = 0
      for (let n = 0; n < 50 && played.toy.phase === 'fly'; n++) {
        play(played, 1 / 60)
        const f = played.toy.show()
        if (leftOut(f) || f.pilot.nose) continue
        for (const { stamp, shape } of worn(draw(f), shapes)) {
          measured += 1
          expect(deepest(stamp, shape), `${shape} on seal ${which} from side ${side}, frame ${n}`).toBeLessThanOrEqual(CAP)
        }
      }
      expect(measured).toBeGreaterThan(10)
      expect(art.pilot).toBeDefined()
    }
  })
})
