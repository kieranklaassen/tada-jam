import { describe, expect, it } from 'vitest'
import type { Sprite } from './art'
import { TIERS } from './config'
import { IDLE_BEFORE_DEMO, IdleLadder } from './guidance'
import { CORNER, inCorner } from './overlay'
import { standIn, type Stamp } from './recording'
import { freshSave } from './save'
import { STAGE, fit, toStage } from './stage'
import { BARE_PAPER, everyLoad, newToy, play, playHome, pullAndLetGo, pullAt, slotAt, staged, still, type Played } from './testing'
import type { Frame } from './toy'
import { SEAL_GIVES, View, sealScale } from './view'
import { CATAPULT, CLOUD, DRIFT, HOME_CONTROL, ICE_Y, KIT, PARTS, PENGUIN, SEALS, SLOTS, partAt, thingAt, type Thing } from './world'

// What the view owes the model: it reads every value the toy computes, it
// draws each thing where a finger finds it, in every state, and a seal's
// outline stays where the model has its belly. All of it is asked of a
// stand-in canvas, at the three surfaces the game is held to.

const SIZES: [number, number][] = [[1180, 820], [1024, 768], [820, 1180]]

function viewFor(width: number = STAGE.width, height: number = STAGE.height) {
  const stand = standIn(true)
  const view = new View(stand.make)
  view.setTier(TIERS[0])
  view.build(stand.ctx, width, height, 1)
  return { view, stand }
}

/** Where a stamp's own point lands on the stage, for a view built at a pixel ratio of 1. */
function onStage(view: View, stamp: Stamp, lx: number, ly: number): { x: number; y: number } {
  const by = view.fit
  return { x: (stamp.a * lx + stamp.c * ly + stamp.e - by.x) / by.scale, y: (stamp.b * lx + stamp.d * ly + stamp.f - by.y) / by.scale }
}

/** A point of a stamped figure, as shares of its box from its top left. */
const pointOf = (view: View, stamp: Stamp, sx = 0.5, sy = 0.5): { x: number; y: number } => onStage(view, stamp, stamp.x + stamp.w * sx, stamp.y + stamp.h * sy)

const GUIDANCE = { glow: 0.8, demo: 0.5, demoIndex: 0 }

/** A frame in which everything is going on at once, so that every value has something to change. */
function busy(pose: Frame['pilot']['pose']): Frame {
  const played = newToy(1, { ...freshSave(null), last: { x: -60, y: 40 } })
  play(played, 0.731)
  const f = still(played.toy.show(GUIDANCE))
  const mid = (o: Record<string, unknown>): void => { for (const key of Object.keys(o)) if (typeof o[key] === 'number') o[key] = 0.4 }
  for (const part of [f.nearSeal, f.farSeal, f.chick, f.walrus, f.puffin, f.whale, f.cloud]) mid(part as unknown as Record<string, unknown>)
  Object.assign(f, { stretch: 0.4, tremble: 0.4, fork: 0.1, sledge: 0.05, slump: 0.4, lights: 0.4, igloo: 0.4, berg: 0.4, balloon: 0.4, glow: 0.8 })
  Object.assign(f.pilot, { wide: 0.4, waggle: 0.4, flap: 0.4, shiver: 0.4, feet: 0.4, blink: 0.4, beak: 0.4, rocket: true, flame: 0.6, wings: true, flutter: 0.4, umbrella: 'open', balloon: true, springs: true, coil: 2, jangle: 0.4, rod: true, fish: 'wet', swing: 0.4, blown: 0.4 })
  f.cloud.partX = 500
  f.cloud.partY = 220
  f.line = [300, 300, 340, 280, 380, 270]
  f.older = [300, 320, 350, 300, 400, 310]
  f.furrow = [500, 640, 520, 640]
  f.tips = [240, 640, 270, 640]
  f.holes = [540, 200]
  f.gull = { x: 520, y: 180, face: 1, cry: 1 }
  f.crumbs = (['snow', 'drop', 'dot', 'smudge', 'bubble', 'mist', 'steam', 'soot'] as const).map((kind, i) => ({ kind, x: 300 + i * 20, y: 400, vx: 0, vy: 0, age: 0.2, life: 1, size: 7 }))
  f.moving = [{ part: 'wings', along: 0.5 }]
  f.kit.lid = 0.4
  f.kit.out.wings = true
  f.hand = { x: 200, y: 470, press: 0.5, opacity: 0.8 }
  f.pilot.pose = pose
  if (pose === 'seat') {
    // The puffin is up with its glass out, the far seal dreams, and two friends are being handed a fish.
    Object.assign(f.puffin, { duck: 0 })
    Object.assign(f.farSeal, { flat: 0, hold: 0 })
    // The whale's eye is not rolling: it watches the sky, and drifts.
    f.whale.roll = 0
    f.meal = { chick: { fish: 'wet', act: 'take', p: 0.5 }, walrus: { fish: 'wet', act: 'take', p: 0.5 }, puffin: null }
  } else {
    Object.assign(f.pilot, { x: 560, y: 420, rot: 0.3 })
    Object.assign(f.puffin, { duck: 0 })
    // The chick is on its way onto the penguin, where there is a penguin to hop onto.
    if (pose === 'fly') f.chick.ride = 'head'
    f.focus = { x: 560, y: 420 }
    f.meal = { chick: { fish: 'wet', act: 'react', p: 0.3 }, walrus: { fish: 'wet', act: 'react', p: 0.3 }, puffin: { fish: 'wet', act: 'take', p: 0.5 } }
  }
  return f
}

const OTHERS: Record<string, readonly unknown[]> = {
  pose: ['seat', 'fly', 'beak', 'belly', 'buried', 'hung', 'bowl', 'bob', 'perch', 'stand', 'toboggan', 'hop', 'walk', 'under', 'gone'],
  umbrella: ['none', 'shut', 'open', 'flipped'],
  fish: ['fresh', 'wet', 'frozen'],
  act: ['take', 'react', 'eat', 'gulp'],
  ride: [null, 'head', 'feet'],
  part: PARTS,
  face: [1, -1],
}

/** Every value of a frame, as a path to it, leaving out the lists, which are asked about one by one. */
function leaves(value: unknown, path: string[] = []): string[][] {
  if (Array.isArray(value) || value === null || typeof value !== 'object') return path.length > 0 ? [path] : []
  // A thing that is not there now (no ring, no gull, no meal) has no values; whether it is there is asked below.
  return Object.entries(value).flatMap(([key, inner]) => (Array.isArray(inner) || inner === null ? [] : typeof inner === 'object' ? leaves(inner, [...path, key]) : [[...path, key]]))
}

const reach = (frame: Frame, path: string[]): { holder: Record<string, unknown>; key: string } | null => {
  let holder = frame as unknown as Record<string, unknown>
  for (const key of path.slice(0, -1)) {
    const next = holder[key]
    if (next === null || typeof next !== 'object') return null
    holder = next as Record<string, unknown>
  }
  return { holder, key: path[path.length - 1] }
}

describe('what the model computes, the view reads', () => {
  const { view, stand } = viewFor()
  // A fish that is being taken is taken from where the view last drew it on the rod, so a frame is asked about once the view has drawn it.
  const drawn = (frame: Frame): string => {
    view.draw(stand.ctx, frame, 0)
    stand.reset()
    view.draw(stand.ctx, frame, 0)
    return stand.tally.log.join('\n')
  }
  const bases = (['seat', 'fly', 'buried'] as const).map((pose) => busy(pose))
  const paths = new Map<string, string[]>()
  for (const base of bases) for (const path of leaves(base)) paths.set(path.join('.'), path)

  it('draws a different frame for a change in any one value of the frame', () => {
    expect(paths.size).toBeGreaterThan(120)
    const unread: string[] = []
    for (const [name, path] of paths) {
      let read = false
      for (const base of bases) {
        const at = reach(base, path)
        if (!at || at.holder[at.key] === undefined || read) continue
        const before = drawn(base)
        const was = at.holder[at.key]
        const others: readonly unknown[] = OTHERS[at.key] ?? (typeof was === 'boolean' ? [!was] : typeof was === 'number' ? [was + 0.37, was - 0.37] : [])
        for (const other of others) {
          if (other === was) continue
          at.holder[at.key] = other
          if (drawn(base) !== before) read = true
        }
        at.holder[at.key] = was
      }
      if (!read) unread.push(name)
    }
    // The walrus's sigh on the scarf shows only over time, and is asked about below.
    expect(unread).toEqual(['pilot.blown'])
  })

  it('draws a different frame for each thing that comes and goes: a line, a mark, a hole, a crumb, a part on its way, a ring, a gull, a hand, a meal', () => {
    for (const base of bases) {
      const before = drawn(base)
      for (const list of ['line', 'older', 'furrow', 'tips', 'holes', 'crumbs', 'moving'] as const) {
        const was = base[list]
        ;(base as unknown as Record<string, unknown>)[list] = []
        expect(drawn(base), list).not.toBe(before)
        ;(base as unknown as Record<string, unknown>)[list] = was
      }
      for (const one of ['ring', 'gull', 'hand'] as const) {
        const was = base[one]
        ;(base as unknown as Record<string, unknown>)[one] = null
        expect(drawn(base), one).not.toBe(before)
        ;(base as unknown as Record<string, unknown>)[one] = was
      }
      for (const who of ['chick', 'walrus', 'puffin'] as const) {
        const was = base.meal[who]
        if (!was) continue
        base.meal[who] = null
        expect(drawn(base), who).not.toBe(before)
        base.meal[who] = was
      }
      // And each crumb is its own: its place, its age and its size.
      for (const key of ['x', 'y', 'age', 'size'] as const) {
        base.crumbs[0][key] += 0.3
        expect(drawn(base), `a crumb's ${key}`).not.toBe(before)
        base.crumbs[0][key] -= 0.3
      }
      expect(drawn(base)).toBe(before)
    }
  })

  it('streams the scarf out in the walrus\'s sigh, which only shows over time', () => {
    const tail = (blown: number): string => {
      const fresh = viewFor()
      const frame = busy('stand' as Frame['pilot']['pose'])
      frame.pilot.blown = blown
      let log = ''
      for (let n = 0; n < 12; n++) {
        fresh.stand.reset()
        fresh.view.draw(fresh.stand.ctx, frame, 1 / 60)
        log = fresh.stand.tally.log.join('\n')
      }
      return log
    }
    expect(tail(1)).not.toBe(tail(0))
  })
})

describe('a thing is touched where it is drawn', () => {
  /** Each thing a finger finds, the figure it is drawn as, and a point of that figure as shares of its box. */
  const figures: [Thing, (art: NonNullable<View['figures']>) => Sprite, number, number][] = [
    ['nearSeal', (art) => art.nearSeal, 0.5, 0.5],
    ['farSeal', (art) => art.farSeal, 0.5, 0.5],
    ['igloo', (art) => art.igloo, 0.5, 0.15],
    ['chick', (art) => art.chick, 0.5, 0.5],
    ['walrus', (art) => art.walrus, 0.5, 0.5],
    ['balloon', (art) => art.balloon, 0.5, 0.4],
    ['puffin', (art) => art.basket, 0.5, 0.5],
    ['puffin', (art) => art.puffin, 0.5, 0.4],
    ['drift', (art) => art.drift, 0.5, 0.5],
    ['crate', (art) => art.lid, 0.5, 0.5],
  ]

  /** Frames from every state: idle, pressed, a visit to each friend, a flight with everything bolted on, the way back. */
  function states(): Frame[] {
    const frames: Frame[] = []
    const keep = (played: Played, seconds: number, every = 5): void => {
      for (let n = 0; n < seconds * 60; n++) {
        play(played, 1 / 60)
        if (n % every === 0) frames.push(still(played.toy.show()))
      }
    }
    const idle = newToy()
    keep(idle, 1)
    for (const [x, y] of [[SEALS[0].x, 600], [SEALS[1].x, 600], [652, 600], [1112, 572], [800, 238], [800, 100], [750, 600], [100, 700]]) idle.toy.press(x, y)
    keep(idle, 1, 3)
    for (const put of [{ x: 540, y: ICE_Y - PENGUIN.r - 2, vy: 20 }, { x: 1150, y: 500 - PENGUIN.r - 2, vy: 20 }, { x: 750 - PENGUIN.r - 2, y: 308, vx: 100 }, { x: SEALS[0].x, y: 500, vy: 300 }, { x: SEALS[1].x, y: 500, vy: 300 }]) {
      for (const parts of [[], ['fish'], ['springs']] as const) {
        const played = staged(parts, put)
        keep(played, 5, 7)
      }
    }
    return frames
  }

  it('draws every thing a finger finds on the place that answers for it, in every state and at every size', () => {
    const frames = states()
    expect(frames.length).toBeGreaterThan(400)
    for (const [width, height] of SIZES) {
      const { view, stand } = viewFor(width, height)
      const art = view.figures!
      for (const frame of frames) {
        stand.reset()
        view.draw(stand.ctx, frame, 0)
        for (const [thing, of, sx, sy] of figures) {
          const stamp = stand.tally.placed.find((placed) => placed.image === of(art).image)
          // The puffin is not drawn while it is down behind the rim, and its basket answers for it.
          if (!stamp && of(art) === art.puffin) continue
          // Riding on the penguin the chick is part of a scene, which a touch ends before the touch is answered: by then it is in its doorway.
          if (of(art) === art.chick && frame.chick.ride !== null) continue
          expect(stamp, thing).toBeDefined()
          const at = pointOf(view, stamp!, sx, sy)
          expect(thingAt(at.x, at.y), `${thing} drawn at ${Math.round(at.x)}, ${Math.round(at.y)}`).toBe(thing)
        }
      }
    }
  })

  it('has the chick back in its doorway before a press is answered, when it was riding on the penguin', () => {
    const played = staged([], { x: 540, y: ICE_Y - PENGUIN.r - 2, vy: 20 })
    while (played.toy.show().chick.ride === null) play(played, 1 / 60)
    played.toy.takeSounds()
    played.toy.press(652, 600)
    expect(played.toy.show().chick.ride).toBeNull()
    expect(played.toy.takeSounds().map((sound) => sound.name)).toEqual(['peep'])
  })

  it('draws the chick\'s fish with the chick: in its doorway, and on the penguin while it rides', () => {
    const { view, stand } = viewFor()
    const art = view.figures!
    // Stuck by the beak at the igloo's door with the fish on the rod: the chick takes it, and rides on the feet.
    const played = staged(['fish'], { x: 540, y: ICE_Y - PENGUIN.r - 40, vy: 500 })
    let riding = 0, home = 0
    for (let n = 0; n < 900 && played.toy.phase !== 'loaded'; n++) {
      play(played, 1 / 60)
      const frame = played.toy.show()
      if (!frame.meal.chick || frame.meal.chick.act === 'take') continue
      stand.reset()
      view.draw(stand.ctx, frame, 0)
      const chick = stand.tally.placed.find((placed) => placed.image === art.chick.image)!
      // A fish is drawn on the chick; the one on the rod, once the rod is baited again, is another.
      const at = pointOf(view, chick)
      const fishes = stand.tally.placed.filter((placed) => placed.image === art.parts.fish.image).map((placed) => pointOf(view, placed))
      expect(Math.min(...fishes.map((has) => Math.hypot(has.x - at.x, has.y - at.y))), frame.chick.ride ?? 'home').toBeLessThan(50)
      expect(fishes.length).toBe(frame.pilot.rod && frame.pilot.fish ? 2 : 1)
      if (frame.chick.ride === null) home += 1
      else riding += 1
    }
    expect(riding).toBeGreaterThan(30)
    expect(home).toBeGreaterThan(30)
  })

  it('sits the penguin on the top of the drift in its umbrella: the bowl in front of it, its feet inside', () => {
    const { view, stand } = viewFor()
    const art = view.figures!
    const played = staged(['umbrella'], { x: DRIFT.x + 8, y: DRIFT.y - DRIFT.ry - PENGUIN.r - 20, vy: 120, open: true })
    let sat = 0
    for (let n = 0; n < 600 && played.toy.phase !== 'loaded'; n++) {
      play(played, 1 / 60)
      const frame = played.toy.show()
      if (frame.pilot.pose !== 'bowl') continue
      sat += 1
      // Its round rests on the crest, not in the snow.
      const along = (frame.pilot.x - DRIFT.x) / DRIFT.rx
      expect(frame.pilot.y + PENGUIN.r).toBeCloseTo(DRIFT.y - DRIFT.ry * Math.sqrt(1 - along * along), 6)
      stand.reset()
      view.draw(stand.ctx, frame, 0)
      const order = stand.tally.stamped
      expect(order.indexOf(art.parts.umbrellaFlipped.image)).toBeGreaterThan(order.indexOf(art.pilot.image))
      expect(order).not.toContain(art.foot.image)
      // The bowl is under the penguin: its cloth comes up to the penguin's middle.
      const bowl = stand.tally.placed.find((placed) => placed.image === art.parts.umbrellaFlipped.image)!
      const rim = onStage(view, bowl, bowl.x + bowl.w / 2, bowl.y)
      expect(Math.abs(rim.x - frame.pilot.x)).toBeLessThan(3)
      expect(rim.y).toBeGreaterThan(frame.pilot.y - 20)
      expect(rim.y).toBeLessThan(frame.pilot.y + 10)
    }
    expect(sat).toBeGreaterThan(60)
  })

  it('draws the cloud over the puffs a finger and a flight find, and never drifts it off them', () => {
    const { view, stand } = viewFor()
    const art = view.figures!
    const played = newToy()
    let furthest = 0
    for (let n = 0; n < 600; n++) {
      play(played, 0.1)
      stand.reset()
      view.draw(stand.ctx, played.toy.show(), 0)
      for (const bank of [art.cloud, art.cloudLeft]) {
        const stamp = stand.tally.placed.find((placed) => placed.image === bank.image)!
        furthest = Math.max(furthest, Math.abs(onStage(view, stamp, 0, 0).x))
      }
    }
    expect(furthest).toBeGreaterThan(1)
    expect(furthest).toBeLessThanOrEqual(6)
    for (const puff of CLOUD) expect(thingAt(puff.x, puff.y)).toBe('cloud')
  })

  it('takes hold of the penguin where it is drawn: at rest, bouncing from a poke, and while the ghost hand has the pouch', () => {
    const { view, stand } = viewFor()
    const art = view.figures!
    const pilotAt = (played: Played, guidance: typeof GUIDANCE | null = null): { x: number; y: number } => {
      stand.reset()
      view.draw(stand.ctx, played.toy.show(guidance), 0)
      return pointOf(view, stand.tally.placed.find((placed) => placed.image === art.pilot.image)!)
    }
    const resting = newToy()
    play(resting, 0.5)
    const poked = newToy()
    poked.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    poked.toy.tap()
    play(poked, 0.08)
    const shown = newToy()
    const ladder = new IdleLadder(0)
    let guidance = ladder.update(0)
    for (let t = 0; t < IDLE_BEFORE_DEMO + 1.6; t += 1 / 60) {
      guidance = ladder.update(t)
      shown.toy.step(1 / 60, guidance)
    }
    expect(Math.hypot(shown.toy.show(guidance).pouch.x - CATAPULT.rest.x, shown.toy.show(guidance).pouch.y - CATAPULT.rest.y)).toBeGreaterThan(40)
    for (const [played, name, with_] of [[resting, 'at rest', null], [poked, 'poked', null], [shown, 'shown', guidance]] as const) {
      const at = pilotAt(played, with_ ? { ...with_, demo: with_.demo ?? 0 } : null)
      played.toy.press(at.x, at.y)
      expect(played.toy.phase, name).toBe('pull')
    }
  })

  it('shows a part\'s empty place exactly where a press takes the part off again', () => {
    const { view, stand } = viewFor()
    const art = view.figures!
    for (const part of PARTS) {
      const played = newToy(1, { ...freshSave(null), bolted: [part] })
      stand.reset()
      view.draw(stand.ctx, played.toy.show(), 0)
      const empty = stand.tally.placed.filter((placed) => placed.image === art.empty.image)
      expect(empty.length).toBe(1)
      const at = pointOf(view, empty[0])
      expect(partAt(at.x, at.y)).toBe(part)
      expect(Math.hypot(at.x - slotAt(part).x, at.y - slotAt(part).y)).toBeLessThan(3)
      played.toy.press(at.x, at.y)
      expect(played.save.bolted).toEqual([])
    }
  })
})

describe('a seal\'s outline and its collider', () => {
  it('agree within four units in every pose: struck by every load, pressed, clapping, breathing', () => {
    let worst = 0, struck = 0
    const out = { sx: 1, sy: 1 }
    const measure = (frame: Frame): void => {
      for (const which of [0, 1] as const) {
        const seal = SEALS[which]
        sealScale(frame, which, out)
        // The outline is the part of the collider's round above the ice, stretched about the seal's place on the ice.
        for (let a = 0; a <= 32; a++) {
          const angle = -Math.PI * (a / 32)
          const x = Math.cos(angle) * seal.r, y = seal.y - ICE_Y + Math.sin(angle) * seal.r
          if (y > 0) continue
          worst = Math.max(worst, Math.hypot(x * (out.sx - 1), y * (out.sy - 1)))
        }
        if (Math.abs((which === 0 ? frame.nearSeal : frame.farSeal).squash) > 0.5) struck += 1
      }
    }
    for (const load of everyLoad()) for (const which of [0, 1] as const) for (const vy of [150, 500, 900]) {
      const played = staged(load.parts, { x: SEALS[which].x, y: SEALS[which].y - SEALS[which].r - PENGUIN.r - 10, vx: 30, vy })
      for (let n = 0; n < 90; n++) {
        if (n === 20) played.toy.press(SEALS[which].x, SEALS[which].y - 30)
        play(played, 1 / 60)
        measure(played.toy.show())
      }
    }
    expect(struck).toBeGreaterThan(200)
    expect(worst).toBeGreaterThan(1)
    expect(worst).toBeLessThanOrEqual(4)
    // And by its numbers: the most it gives, on the widest and the tallest it stands.
    const r = Math.max(SEALS[0].r, SEALS[1].r), high = Math.max(...SEALS.map((seal) => seal.r - (seal.y - ICE_Y)))
    expect(r * (SEAL_GIVES.wide * SEAL_GIVES.most + 0.006)).toBeLessThanOrEqual(4)
    expect(high * (SEAL_GIVES.high * SEAL_GIVES.most + 0.012)).toBeLessThanOrEqual(4)
  })

  it('shows the blow all the same: flippers, eyes, the ball and the strokes that stand off its belly', () => {
    const { view, stand } = viewFor()
    const calm = newToy(), hit = staged(['springs'], { x: SEALS[0].x, y: SEALS[0].y - SEALS[0].r - PENGUIN.r - 10, vx: 30, vy: 500 })
    play(calm, 0.2)
    play(hit, 0.1)
    const strokes = (frame: Frame): number => {
      stand.reset()
      view.draw(stand.ctx, frame, 0)
      return stand.tally.log.filter((line) => line.startsWith('lineTo')).length
    }
    expect(hit.toy.show().nearSeal.flat).toBeGreaterThan(0)
    // Three more strokes stand off the struck seal than off the calm one, and the spout is not blowing in either.
    expect(strokes(hit.toy.show())).toBeGreaterThan(strokes({ ...hit.toy.show(), nearSeal: calm.toy.show().nearSeal }))
  })
})

describe('the surfaces the game is held to', () => {
  /** Everything a finger works or presses, as a round on the stage. */
  const pressables: [string, number, number, number][] = [
    ['the penguin in the pouch', CATAPULT.rest.x, CATAPULT.rest.y, CATAPULT.grip],
    ...PARTS.map((part): [string, number, number, number] => [`the ${part} in the kit`, slotAt(part).x, slotAt(part).y, Math.min(SLOTS[part].x1 - SLOTS[part].x0, SLOTS[part].y1 - SLOTS[part].y0) / 2]),
  ]

  it('has everything a finger works on the surface, a finger wide, at each size', () => {
    for (const [width, height] of SIZES) {
      const by = fit(width, height)
      for (const [name, x, y, r] of pressables) {
        const px = x * by.scale + by.x, py = y * by.scale + by.y
        expect(px - r * by.scale, name).toBeGreaterThanOrEqual(0)
        expect(px + r * by.scale, name).toBeLessThanOrEqual(width)
        expect(py - r * by.scale, name).toBeGreaterThanOrEqual(0)
        expect(py + r * by.scale, name).toBeLessThanOrEqual(height)
        // Around 48 pixels: on the narrowest surface a part's place is 46 across.
        expect(2 * r * by.scale, `${name} at ${width} by ${height}`).toBeGreaterThanOrEqual(46)
      }
    }
  })

  it('puts nothing a finger works or presses under the home control or in the grown-up corner, at each size', () => {
    for (const [width, height] of SIZES) {
      const by = fit(width, height)
      // The home control: a round of 48 pixels at the top centre, 10 from the top, and a finger's slack round it.
      for (let a = 0; a < 24; a++) for (const r of [0, 12, 24, 34]) {
        const at = toStage({ x: width / 2 + Math.cos((a * Math.PI) / 12) * r, y: 34 + Math.sin((a * Math.PI) / 12) * r }, by)
        expect(thingAt(at.x, at.y), `${width} by ${height}`).toBe('paper')
        expect(partAt(at.x, at.y)).toBeNull()
        // The pouch cannot be pulled to there, so the penguin is never taken hold of from there.
        expect(at.y).toBeLessThan(CATAPULT.fork.y - CATAPULT.reach - CATAPULT.grip)
      }
      for (let x = width - CORNER; x <= width; x += 6) for (let y = 0; y <= CORNER; y += 6) {
        expect(inCorner(x, y, width)).toBe(true)
        const at = toStage({ x, y }, by)
        expect(thingAt(at.x, at.y), `${width} by ${height}`).toBe('paper')
        expect(partAt(at.x, at.y)).toBeNull()
        expect(Math.hypot(at.x - CATAPULT.rest.x, at.y - CATAPULT.rest.y)).toBeGreaterThan(CATAPULT.reach + CATAPULT.grip)
      }
    }
    expect(HOME_CONTROL).toEqual({ x: STAGE.width / 2, y: 34, r: 24 })
    expect(KIT.y0).toBeGreaterThan(CORNER)
  })

  it('answers a press on bare paper by the home control with a pencil dot and nothing else', () => {
    const played = newToy()
    played.toy.press(HOME_CONTROL.x, HOME_CONTROL.y)
    expect(played.toy.takeSounds().map((sound) => sound.name)).toEqual(['dot'])
    expect(played.toy.phase).toBe('loaded')
    expect(played.toy.takeSave()).toBe(false)
  })

  it('draws the whole game on each of them, and the same game', () => {
    const played = newToy()
    pullAndLetGo(played, pullAt(40, 170))
    play(played, 0.6)
    const counts = SIZES.map(([width, height]) => {
      const { view, stand } = viewFor(width, height)
      stand.reset()
      view.draw(stand.ctx, played.toy.show(), 0)
      expect(view.fit.scale).toBeCloseTo(Math.min(width / STAGE.width, height / STAGE.height), 9)
      return stand.tally.stamped.length
    })
    expect(new Set(counts).size).toBe(1)
    playHome(played)
    expect(BARE_PAPER.y).toBeGreaterThan(HOME_CONTROL.y + HOME_CONTROL.r)
  })
})
