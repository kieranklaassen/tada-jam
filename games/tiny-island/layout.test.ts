import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { frame, lensOf, postsFor, type Lens } from './camera'
import { Island } from './island'
import { CORNER } from './overlay'
import { SLOT_REACH, pick, reachOf, under } from './pick'
import { CAT_HALF, CAT_TALL, EYES, GULL_HALF, RIM_SEAT, catSeat, settle } from './place'
import { makeRng } from './rng'
import { deserialize, fresh } from './save'
import { FOOT, KINDS, LAND_R, LAND_Y, RIM_IN, RIM_OUT, RIM_TOP, SEA_FOOT, SEA_LANE_R, SLOT_DX, TALL, TRAY_HALF, TRAY_SCALE, TRAY_TOP, TRAY_Z, overTray, slotOf, type Toy } from './toys'

// The sizes the sheet holds the game to, in CSS pixels: a tablet lying down, a smaller one, and one standing up.
const SIZES = [[1180, 820], [1024, 768], [820, 1180]] as const

function at(width: number, height: number, age: number | null = 4) {
  const camera = new THREE.PerspectiveCamera()
  frame(camera, width, height)
  const lens = lensOf(camera, width, height), island = new Island(fresh(age))
  island.posts = postsFor(width, height)
  island.step(1 / 60)
  return { lens, island, posts: island.posts }
}

describe.each(SIZES)('on a surface of %i by %i', (width, height) => {
  it('has the whole turntable, the tray and the residents in the frame', () => {
    const { lens, posts } = at(width, height)
    const inside = (x: number, y: number, z: number): void => {
      const p = lens.glass(x, y, z)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(width)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(height)
    }
    for (let i = 0; i < 16; i++) inside(Math.cos((i / 16) * Math.PI * 2) * RIM_OUT, 0, Math.sin((i / 16) * Math.PI * 2) * RIM_OUT)
    for (const x of [-TRAY_HALF.x, TRAY_HALF.x]) for (const z of [TRAY_Z - TRAY_HALF.z, TRAY_Z + TRAY_HALF.z]) inside(x, 0, z)
    inside(posts.buoy.x, 3.4, posts.buoy.z)
    inside(posts.wave.x, 2, posts.wave.z)
    // A lighthouse at the back of the land is in the frame to its top.
    inside(0, 3.3, -2.3)
  })

  it('gives every toy in the tray a target at least 100 pixels across, clear of its neighbours and of the bottom edge', () => {
    const { lens } = at(width, height)
    const middles = KINDS.map((kind) => lens.glass(slotOf(kind).x, TRAY_TOP, TRAY_Z))
    KINDS.forEach((kind, i) => {
      const slot = slotOf(kind)
      expect(reachOf(lens, kind, slot.x, TRAY_TOP, slot.z, TRAY_SCALE, SLOT_REACH) * 2).toBeGreaterThanOrEqual(100)
      if (i > 0) expect(middles[i].x - middles[i - 1].x).toBeGreaterThanOrEqual(100)
      // Nothing to touch in the lowest 40 pixels: the foot of the toy, where its target starts, is above them.
      expect(middles[i].y).toBeLessThanOrEqual(height - 40)
      // The toy is drawn at least as large as the least target, so what is seen is what is touched.
      const top = lens.glass(slot.x, TRAY_TOP + TALL[kind] * TRAY_SCALE, slot.z)
      expect(middles[i].y - top.y).toBeGreaterThanOrEqual(60)
    })
  })

  it('finds each toy of the tray under a finger on it, on its foot and on its top', () => {
    const { lens, island } = at(width, height)
    for (const kind of KINDS) {
      const slot = slotOf(kind)
      for (const up of [0, 0.5, 1]) {
        const p = lens.glass(slot.x, TRAY_TOP + TALL[kind] * TRAY_SCALE * up, slot.z)
        expect(pick(lens, p.x, p.y, island.standing())).toEqual({ kind: 'slot', toy: kind })
      }
      // And a finger that is 45 pixels off to the side still has it.
      const foot = lens.glass(slot.x, TRAY_TOP, slot.z)
      expect(pick(lens, foot.x + 45, foot.y, island.standing())).toEqual({ kind: 'slot', toy: kind })
    }
  })

  it('finds the cat, the gull, the wave and the whale under a finger, each at least 96 pixels across', () => {
    const { lens, island, posts } = at(width, height)
    const standing = island.standing()
    const cat = lens.glass(standing.cat.x, standing.cat.y + 0.8, standing.cat.z)
    expect(pick(lens, cat.x, cat.y, standing).kind).toBe('cat')
    expect(pick(lens, cat.x + 46, cat.y, standing).kind).toBe('cat')
    const gull = lens.glass(standing.gull.x, standing.gull.y + 1, standing.gull.z)
    expect(pick(lens, gull.x, gull.y, standing).kind).toBe('gull')
    expect(pick(lens, gull.x - 46, gull.y, standing).kind).toBe('gull')
    const wave = lens.glass(posts.wave.x, 1.2, posts.wave.z)
    expect(pick(lens, wave.x, wave.y, standing).kind).toBe('wave')
    expect(pick(lens, wave.x - 46, wave.y, standing).kind).toBe('wave')
    const whale = lens.glass(posts.whale.x, 0.3, posts.whale.z)
    if (whale.x > 20 && whale.y < height - 20) expect(pick(lens, whale.x + 30, whale.y, standing).kind).toBe('whale')
  })

  it('has nothing of its own under the home control at the top centre, or in the corner of the grown-ups', () => {
    for (const age of [2, 4]) {
      const { lens, island } = at(width, height, age)
      const standing = island.standing(), bare = ['sky', 'open', 'sea', 'rim']
      // The home control: a round of 48 pixels, 10 from the top, in the middle.
      for (const dx of [-24, 0, 24]) for (const y of [10, 34, 58]) expect(bare).toContain(pick(lens, width / 2 + dx, y, standing).kind)
      for (const x of [width - CORNER + 4, width - 36, width - 4]) for (const y of [4, 36, CORNER - 4]) expect(bare).toContain(pick(lens, x, y, standing).kind)
    }
  })

  it('reads the ground under a finger: land, the sea inside the rim, the rim, the tray, the open sea and the sky', () => {
    const { lens, island } = at(width, height)
    const standing = island.standing()
    const on = (x: number, y: number, z: number): string => {
      const p = lens.glass(x, y, z)
      return pick(lens, p.x, p.y, standing).kind
    }
    expect(on(2.2, 0.3, 1)).toBe('land')
    expect(on(4.4, 0, 1)).toBe('sea')
    expect(on(1.2, 0, -6.5)).toBe('rim')
    expect(on(1.25, 0, TRAY_Z + 0.9)).toBe('tray')
    expect(on(-5.2, 0, -5.2)).toBe('open')
    expect(pick(lens, width / 2, 2, standing).kind).toBe('sky')
  })
})

describe.each(SIZES)('a fingertip that carries a toy, at %i by %i', (width, height) => {
  it('has the ground it points at right under it: the top of the land over the land, the water elsewhere', () => {
    const { lens } = at(width, height)
    for (const [x, z] of [[0, 0], [1.5, 1.2], [-2, -1.6], [0.4, 2.7], [-2.8, 0.3]]) {
      const glass = lens.glass(x, LAND_Y, z), found = under(lens, glass.x, glass.y)
      expect(found && Math.hypot(found.x - x, found.z - z)).toBeLessThan(0.01)
    }
    for (const [x, z] of [[0, SEA_LANE_R], [-SEA_LANE_R, 0], [3.2, -3], [0, 5.6]]) {
      const glass = lens.glass(x, 0, z), found = under(lens, glass.x, glass.y)
      expect(found && Math.hypot(found.x - x, found.z - z)).toBeLessThan(0.01)
    }
  })
})

describe('how big the toys are for a two-year-old, on a tablet lying down', () => {
  it('stands every toy at least 110 pixels tall anywhere on the land, and gives every slot of the tray 100 pixels', () => {
    const { lens } = at(1180, 820)
    for (const kind of KINDS) {
      for (const [x, z] of [[0, 0], [0, -1.9], [-1.9, 0], [1.9, 0], [0, 1.9]]) {
        const tall = lens.glass(x, LAND_Y, z).y - lens.glass(x, LAND_Y + TALL[kind], z).y
        expect(tall, `${kind} at ${x}, ${z}`).toBeGreaterThanOrEqual(110)
      }
    }
    expect(lens.glass(SLOT_DX / 2, TRAY_TOP, TRAY_Z).x - lens.glass(-SLOT_DX / 2, TRAY_TOP, TRAY_Z).x).toBeGreaterThanOrEqual(100)
    // The turntable fills the width between the buoy and the wave: its rim is at least four fifths of the glass.
    expect(lens.glass(RIM_OUT, 0, 0).x - lens.glass(-RIM_OUT, 0, 0).x).toBeGreaterThanOrEqual(1180 * 0.75)
  })
})

describe('who stands in front of whom', () => {
  it('reckons from where the camera stands at each size', () => {
    SIZES.forEach(([width, height], i) => {
      const camera = new THREE.PerspectiveCamera()
      frame(camera, width, height)
      expect(camera.position.x).toBe(0)
      expect(Math.abs(camera.position.y - EYES[i].y)).toBeLessThan(0.4)
      expect(Math.abs(camera.position.z - EYES[i].z)).toBeLessThan(0.6)
    })
  })

  type Box = { l: number; r: number; t: number; b: number }
  const box = (lens: Lens, x: number, z: number, half: number, low: number, high: number): Box => {
    const a = lens.glass(x - half, low, z), b = lens.glass(x + half, high, z)
    return { l: a.x, r: b.x, t: b.y, b: a.y }
  }
  /** Whether two boxes on the glass lie over each other by more than a few pixels. */
  const meet = (a: Box, b: Box): boolean => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 4 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 4

  /** Islands with the toys set down here and there and the turntable turned, each as its save would open it. */
  function islands(): { toys: Toy[]; turn: number }[] {
    const rng = makeRng(11), out: { toys: Toy[]; turn: number }[] = []
    for (let round = 0; round < 90; round++) {
      let toys: Toy[] = fresh(4).toys.map((toy) => ({ ...toy }))
      for (const kind of KINDS) {
        if (rng.next() < 0.25) continue
        const a = rng.next() * Math.PI * 2, r = rng.next() < 0.6 ? rng.next() * 2.6 : 4.4
        const spot = settle(kind, Math.cos(a) * r, Math.sin(a) * r, toys)
        toys = toys.map((toy) => (toy.kind === kind ? { kind, where: spot.where, x: spot.x, z: spot.z } : toy))
      }
      out.push({ toys, turn: Math.round(rng.next() * 628) / 100 })
    }
    return out
  }

  it.each(SIZES)('on a surface of %i by %i the cat and the gull at rest cover no toy, no slot of the tray and no part of the wave', (width, height) => {
    const camera = new THREE.PerspectiveCamera()
    frame(camera, width, height)
    const lens = lensOf(camera, width, height), posts = postsFor(width, height)
    const seen = { seat: 0, rim: 0, smoke: 0, paddle: 0, buoy: 0 }
    for (const { toys, turn } of islands()) {
      const island = new Island(deserialize(JSON.parse(JSON.stringify({ ...fresh(4), toys, turn })), 4))
      island.posts = posts
      island.step(1 / 60)
      const standing = island.standing(), frame = island.show()
      expect(island.moving).toBe(false)
      const cat = box(lens, standing.cat.x, standing.cat.z, CAT_HALF - 0.1, standing.cat.y, standing.cat.y + CAT_TALL - 0.05)
      const house = toys.find((toy) => toy.kind === 'house')!
      const place = house.where === 'land' ? 'smoke' : Math.abs(standing.gull.x - posts.buoy.x) > 0.01 ? 'paddle' : 'buoy'
      // Afloat it is at rest; risen to let the boat pass under it, it is on its way, and is not held to this.
      const risen = place === 'paddle' && standing.gull.y > 0
      const gull = risen ? { l: -9, r: -9, t: -9, b: -9 } : box(lens, standing.gull.x, standing.gull.z, GULL_HALF - 0.05, Math.max(0, standing.gull.y), standing.gull.y + 1.84)
      seen[place] += 1
      seen[catSeat(toys, turn) === RIM_SEAT ? 'rim' : 'seat'] += 1
      // The cat is where its seat is worked out to be.
      expect(frame.cat.pose.puff).toBe(1)
      for (const toy of standing.toys) {
        const saved = toys.find((other) => other.kind === toy.kind)!
        if (toy.at === 'slot') {
          // A toy in its slot is nearer the child than either of them: nothing of theirs is ever in front of the tray.
          expect(standing.cat.z).toBeLessThan(toy.z - TRAY_HALF.z)
          expect(standing.gull.z).toBeLessThan(toy.z - TRAY_HALF.z)
          continue
        }
        // The boat afloat sails past behind them; a sheep aboard goes with it.
        if (saved.where === 'boat' || (toy.kind === 'boat' && saved.where === 'sea')) continue
        const half = (saved.where === 'sea' ? SEA_FOOT[toy.kind] : FOOT[toy.kind]) * 0.85
        const body = box(lens, toy.x, toy.z, half, toy.y, toy.y + TALL[toy.kind])
        if (standing.cat.z > toy.z) expect(meet(cat, body), `cat over the ${toy.kind}, turn ${turn}, ${JSON.stringify(toys)}`).toBe(false)
        // In the smoke the gull is held to the house alone: it rides clear above its roof.
        if (place === 'smoke' ? toy.kind === 'house' : standing.gull.z > toy.z) expect(meet(gull, body), `gull (${place}) over the ${toy.kind}, turn ${turn}, ${JSON.stringify(toys)}`).toBe(false)
      }
      for (const kind of KINDS) {
        const slot = slotOf(kind), empty = box(lens, slot.x, slot.z, 0.9, TRAY_TOP, TRAY_TOP + 0.1)
        expect(meet(cat, empty)).toBe(false)
        expect(meet(gull, empty)).toBe(false)
      }
      const wave = box(lens, posts.wave.x, posts.wave.z, 1.9, 0, 2.4)
      expect(meet(cat, wave), 'cat over the wave').toBe(false)
      expect(meet(gull, wave), `gull (${place}) over the wave`).toBe(false)
    }
    // Every place was looked at.
    for (const count of Object.values(seen)) expect(count).toBeGreaterThan(3)
  })

  it.each(SIZES)('on a surface of %i by %i a touch on the gull is the gull\'s and a touch on the house is the house\'s', (width, height) => {
    const camera = new THREE.PerspectiveCamera()
    frame(camera, width, height)
    const lens = lensOf(camera, width, height)
    for (const [x, z] of [[0, 0], [1.9, 0], [-1.9, 0], [0, 1.9], [0, -1.9]]) {
      const toys = fresh(4).toys.map((toy) => (toy.kind === 'house' ? { ...toy, where: 'land' as const, x, z } : toy))
      const island = new Island(deserialize(JSON.parse(JSON.stringify({ ...fresh(4), toys })), 4))
      island.posts = postsFor(width, height)
      island.step(1 / 60)
      const standing = island.standing(), house = standing.toys[4]
      for (const up of [0.1, 0.5, 0.9]) {
        const p = lens.glass(house.x, house.y + TALL.house * up, house.z)
        expect(pick(lens, p.x, p.y, standing)).toEqual({ kind: 'toy', toy: 'house' })
      }
      for (const up of [0.5, 1, 1.5]) {
        const p = lens.glass(standing.gull.x, standing.gull.y + up, standing.gull.z)
        expect(pick(lens, p.x, p.y, standing).kind).toBe('gull')
      }
      // The gull in the smoke is in the frame to the top of its head.
      expect(lens.glass(standing.gull.x, standing.gull.y + 1.84, standing.gull.z).y).toBeGreaterThanOrEqual(0)
    }
  })
})

// The intersection audit (the game's file under scripts/intersections/games) drives the game by places on
// the glass at 1180 by 820. They are written there as plain fractions; these are the same numbers, each held
// to the place of the world it is meant to be. Change the two together.
describe('the places on the glass the intersection audit touches', () => {
  const AUDIT = {
    land: { middle: [0.5, 0.416], right: [0.608, 0.416], left: [0.392, 0.416], back: [0.5, 0.354], front: [0.5, 0.487], frontRight: [0.578, 0.463], backLeft: [0.429, 0.372], backRight: [0.571, 0.372], frontLeft: [0.422, 0.463] },
    sea: { front: [0.5, 0.616], left: [0.252, 0.438], right: [0.748, 0.438], back: [0.5, 0.302], frontRight: [0.694, 0.559], frontLeft: [0.306, 0.559] },
    rim: { front: [0.5, 0.701], frontRight: [0.676, 0.674], right: [0.808, 0.605], farRight: [0.872, 0.417], farLeft: [0.128, 0.417] },
    slots: { lighthouse: [0.137, 0.791], boat: [0.319, 0.791], sheep: [0.5, 0.791], tree: [0.681, 0.791], house: [0.863, 0.791] },
    tray: [0.777, 0.909], openSea: [0.222, 0.29], sky: [0.62, 0.04], wave: [0.903, 0.257], whale: [0.04, 0.66],
  } as const
  const { lens, posts } = at(1180, 820)
  const under = (f: readonly [number, number], y: number): { x: number; z: number } => lens.ground(f[0] * 1180, f[1] * 820, y)!

  it('are on the land, on the sea ring, on the rim and on the slots', () => {
    for (const f of Object.values(AUDIT.land)) expect(Math.hypot(under(f, LAND_Y).x, under(f, LAND_Y).z)).toBeLessThan(LAND_R - 0.6)
    for (const f of Object.values(AUDIT.sea)) expect(Math.abs(Math.hypot(under(f, 0).x, under(f, 0).z) - SEA_LANE_R)).toBeLessThan(0.15)
    for (const f of Object.values(AUDIT.rim)) {
      const r = Math.hypot(under(f, RIM_TOP).x, under(f, RIM_TOP).z)
      expect(r).toBeGreaterThan(RIM_IN + 0.05)
      expect(r).toBeLessThan(RIM_OUT - 0.05)
    }
    for (const kind of KINDS) {
      // A slot is touched on the toy that stands in it, a little way up its body.
      const slot = slotOf(kind), p = under(AUDIT.slots[kind], TRAY_TOP + 0.75)
      expect(Math.hypot(p.x - slot.x, p.z - slot.z)).toBeLessThan(0.15)
    }
  })

  it('are on the bare tray, the open sea, the sky, the wave and the whale', () => {
    const tray = under(AUDIT.tray, TRAY_TOP)
    expect(overTray(tray.x, tray.z)).toBe(true)
    const sea = under(AUDIT.openSea, 0)
    expect(Math.hypot(sea.x, sea.z)).toBeGreaterThan(RIM_OUT + 0.5)
    for (const post of [posts.buoy, posts.wave, posts.whale]) expect(Math.hypot(sea.x - post.x, sea.z - post.z)).toBeGreaterThan(3)
    expect(lens.ground(AUDIT.sky[0] * 1180, AUDIT.sky[1] * 820)).toBeNull()
    const wave = under(AUDIT.wave, 1)
    expect(Math.hypot(wave.x - posts.wave.x, wave.z - posts.wave.z)).toBeLessThan(1.2)
    const whale = under(AUDIT.whale, 0.4)
    expect(Math.hypot(whale.x - posts.whale.x, whale.z - posts.whale.z)).toBeLessThan(2.4)
  })
})

describe.each(SIZES)('targets that follow the drawing, on a surface of %i by %i', (width, height) => {
  const made = (toys: Toy[], turn = 0) => {
    const camera = new THREE.PerspectiveCamera()
    frame(camera, width, height)
    const lens = lensOf(camera, width, height)
    const island = new Island(deserialize(JSON.parse(JSON.stringify({ ...fresh(4), toys: KINDS.map((kind) => toys.find((toy) => toy.kind === kind) ?? { kind, where: 'tray', x: 0, z: 0 }), turn })), 4), 1, postsFor(width, height))
    island.step(1 / 60)
    return { lens, island }
  }

  it('touches the sheep aboard as the sheep, from its feet up, and the boat by its hull', () => {
    for (const boat of [{ kind: 'boat', where: 'land', x: 1.6, z: 1 }, { kind: 'boat', where: 'land', x: -1.2, z: -1.4 }, { kind: 'boat', where: 'sea', x: 0, z: 4.6 }, { kind: 'boat', where: 'sea', x: -4.6, z: 0 }] as Toy[]) {
      const { lens, island } = made([boat, { kind: 'sheep', where: 'boat', x: 0, z: 0 }])
      const standing = island.standing(), sheep = standing.toys[2], hull = standing.toys[1]
      expect(sheep.at).toBe('out')
      // It stands on the deck, over the middle of the boat.
      expect(sheep.y).toBeGreaterThan(hull.y + 0.3)
      for (const up of [0.1, 0.5, 0.9]) {
        const p = lens.glass(sheep.x, sheep.y + TALL.sheep * up, sheep.z)
        expect(pick(lens, p.x, p.y, standing), `${boat.where} ${up}`).toEqual({ kind: 'toy', toy: 'sheep' })
      }
      // A finger on its body that slides lifts the sheep, not the boat under it.
      const body = lens.glass(sheep.x, sheep.y + TALL.sheep * 0.4, sheep.z)
      island.press(pick(lens, body.x, body.y, standing))
      island.dragStart()
      expect(island.standing().toys[2].at).toBe('air')
      expect(island.standing().toys[1].at).toBe('out')
      island.cancel()
      // Under the deck the finger is on the hull.
      const low = lens.glass(hull.x, hull.y + 0.08, hull.z)
      expect(pick(lens, low.x, low.y + 4, standing), boat.where).toEqual({ kind: 'toy', toy: 'boat' })
    }
  })

  it("touches the cat up to the tips of its ears", () => {
    const { lens, island } = made([])
    const standing = island.standing(), cat = standing.cat
    for (const up of [0.2, 1, 1.9, CAT_TALL - 0.1]) {
      const p = lens.glass(cat.x, cat.y + up, cat.z)
      expect(pick(lens, p.x, p.y, standing), `${up}`).toEqual({ kind: 'cat' })
    }
  })

  it('touches the tree afloat along the log it is, from end to end, and not where it would stand', () => {
    for (const [x, z, turn] of [[-4.25, 0, 0], [0, 4.25, 0], [3, 3, 0], [-4.25, 0, 1.3]] as const) {
      const { lens, island } = made([{ kind: 'tree', where: 'sea', x, z }], turn)
      const standing = island.standing(), log = standing.toys[3]
      expect(log.lies).toBeDefined()
      const [from, to] = log.lies!
      // As long as the tree is tall, level on the water, through its middle.
      expect(Math.hypot(to.x - from.x, to.z - from.z)).toBeCloseTo(TALL.tree, 5)
      expect((from.x + to.x) / 2).toBeCloseTo(log.x, 5)
      expect((from.z + to.z) / 2).toBeCloseTo(log.z, 5)
      // Along the shore: its ends are as far from the middle of the island as its middle is, or further.
      expect(Math.hypot(from.x, from.z)).toBeGreaterThanOrEqual(Math.hypot(log.x, log.z))
      for (const part of [0.02, 0.5, 0.98]) {
        const p = lens.glass(from.x + (to.x - from.x) * part, from.y, from.z + (to.z - from.z) * part)
        expect(pick(lens, p.x, p.y, standing), `${x} ${z} ${part}`).toEqual({ kind: 'toy', toy: 'tree' })
      }
      // Over it, where the crown of a standing tree would be, there is only what is behind it.
      const above = lens.glass(log.x, TALL.tree, log.z)
      if (Math.hypot(above.x - lens.glass(log.x, from.y, log.z).x, above.y - lens.glass(log.x, from.y, log.z).y) > 90) expect(pick(lens, above.x, above.y, standing).kind).not.toBe('toy')
    }
  })
})
