import { describe, expect, it } from 'vitest'
import { at as beadAt } from './beads'
import { Game, type Sink } from './game'
import { LONGEST } from './handover'
import { LOADS, TAKEN_WITH, type Load } from './lapState'
import type { Quad } from './placing'
import { layOut, makeShapes } from './scenery'
import type { Item } from './stage'
import { LENGTH, OBSTACLES, PLACES, ZONES, offset, type Lane, type Obstacle } from './trail'
import { STAND } from './view/heights'

// Nothing passes through anything, held with no renderer. Every plaque is a
// flat rectangle that stands facing the child or lies on the board, so two
// of them can only ever do one of three wrong things: lie in the same plane
// where they overlap, which flickers; swap which is in front while their
// beads overlap, which is one thing passing through another; or an upright
// one reaching down into what lies flat. These tests look for all three, in
// every state a child can leave the game in and on every frame of whole laps.

const W = 1180, H = 820, DT = 1 / 60
/** The least two overlapping plaques must be apart in depth to be told apart, in pegs: beside the fox, and at the far end of what is drawn. */
const NEAR_TOLD = 0.005, FAR_TOLD = 0.03
const quiet: Sink = { play: () => {}, hush: () => {}, save: () => {} }

function save(fields: Record<string, unknown> = {}): Record<string, unknown> {
  return { v: 1, position: 'pond', finished: false, ...fields }
}
const withLoad = (at: number, lane: Lane, load: Load, more: Record<string, unknown> = {}): Record<string, unknown> =>
  save({ at, lane, load, lies: null, left: TAKEN_WITH[load], ...more })

/** The plane an upright plaque stands in: pegs along the trail, further from the child being more. */
const planeOf = (item: Item, quad: Quad): number => item.s - item.z - quad.z

type Rect = { minX: number; maxX: number; minY: number; maxY: number }
function rectOf(item: Item, quad: Quad): Rect {
  const cx = item.x + quad.x, cy = item.y + quad.y
  const rx = (Math.abs(quad.ax) + Math.abs(quad.bx)) / 2, ry = (Math.abs(quad.ay) + Math.abs(quad.by)) / 2
  return { minX: cx - rx, maxX: cx + rx, minY: cy - ry, maxY: cy + ry }
}
const overlapOf = (a: Rect, b: Rect): number => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)) * Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY))

/** How many beads of one plaque lie over a bead of the other, as they stand. */
function beadsShared(itemA: Item, a: Quad, itemB: Item, b: Quad): number {
  const [si, s, bi, big] = a.tile.w * a.tile.h <= b.tile.w * b.tile.h ? [itemA, a, itemB, b] : [itemB, b, itemA, a]
  const cx = si.x + s.x, cy = si.y + s.y, ox = bi.x + big.x, oy = bi.y + big.y
  const cross = big.ax * big.by - big.ay * big.bx
  if (Math.abs(cross) < 1e-9) return 0
  let shared = 0
  for (let j = 0; j < s.tile.h; j++) {
    for (let i = 0; i < s.tile.w; i++) {
      if (beadAt(s.tile, i, j) === 0) continue
      const u = (i + 0.5) / s.tile.w - 0.5, v = 0.5 - (j + 0.5) / s.tile.h
      const dx = cx + s.ax * u + s.bx * v - ox, dy = cy + s.ay * u + s.by * v - oy
      const pu = (dx * big.by - dy * big.bx) / cross, pv = (big.ax * dy - big.ay * dx) / cross
      const bx = Math.floor((pu + 0.5) * big.tile.w), by = Math.floor((0.5 - pv) * big.tile.h)
      if (bx < 0 || by < 0 || bx >= big.tile.w || by >= big.tile.h) continue
      if (beadAt(big.tile, bx, by) !== 0) shared += 1
    }
  }
  return shared
}

const partOf = (item: Item, quad: Quad): string => item.figure.parts.find((part) => part.plaque === quad.tile)?.name ?? 'eye'

/** Every pair of upright plaques that overlap, of two different things or (with `own`) of one thing, with how far apart their planes are and how much of them overlaps. */
function eachPair(game: Game, visit: (a: Item, qa: Quad, b: Item, qb: Quad, apart: number, area: number) => void, own = false): void {
  const items = game.stage.items, quads = game.stage.quads
  for (let m = 0; m < items.length; m++) {
    for (let n = own ? m : m + 1; n < items.length; n++) {
      const a = items[m], b = items[n]
      const far = Math.abs(offset(a.s, b.s))
      if (far > 40) continue
      for (let i = a.from; i < a.to; i++) {
        if (quads[i].flat) continue
        const ra = rectOf(a, quads[i])
        for (let j = m === n ? i + 1 : b.from; j < b.to; j++) {
          if (quads[j].flat) continue
          const area = overlapOf(ra, rectOf(b, quads[j]))
          if (area <= 0) continue
          let apart = planeOf(b, quads[j]) - planeOf(a, quads[i])
          if (apart > LENGTH / 2) apart -= LENGTH
          if (apart < -LENGTH / 2) apart += LENGTH
          visit(a, quads[i], b, quads[j], apart, area)
        }
      }
    }
  }
}

describe('nothing shares a plane', () => {
  it('stands every plaque on the beads that lie, and lays what lies at a height of its own under that', () => {
    const game = new Game(withLoad(ZONES.mud.from + 30, 1, 'ladder', { trail: { gooseRides: true, puddle: true } }), () => null, 1, 48, quiet)
    const flat = new Map<number, string>()
    for (const item of game.stage.items) {
      for (let i = item.from; i < item.to; i++) {
        const quad = game.stage.quads[i]
        if (!quad.flat) {
          // The view lifts every upright plaque by STAND: its lowest corner is never under that.
          expect(item.y + quad.y - (Math.abs(quad.ay) + Math.abs(quad.by)) / 2, `${item.key} ${partOf(item, quad)}`).toBeGreaterThanOrEqual(-1e-9)
          continue
        }
        expect(quad.y, `${item.key} ${partOf(item, quad)}`).toBeLessThan(STAND - 0.01)
        expect(quad.y, `${item.key} ${partOf(item, quad)}`).toBeGreaterThan(0.3)
        const name = `${item.key} ${partOf(item, quad)}`
        for (const [height, other] of flat) if (other.split(' ')[0] !== item.key) expect(Math.abs(height - quad.y), `${name} and ${other}`).toBeGreaterThan(0.03)
        flat.set(quad.y, name)
      }
    }
    expect(flat.size).toBeGreaterThanOrEqual(2)
  })

  it('never has two things in one plane where they overlap, wherever the fox is left standing with whatever it carries', () => {
    const found = new Map<string, string>()
    let states = 0
    const near = (s: number): boolean => Object.values(ZONES).some((zone) => s > zone.from - 30 && s < zone.to + 30) || s < 70 || s > PLACES.handOver - 40
    for (let s = 0; s <= PLACES.handOver; s += near(s) ? 1 : 7) {
      for (const lane of [0, 1, 2] as Lane[]) {
        for (const load of ['none', ...LOADS] as Load[]) {
          const game = new Game(load === 'none' ? save({ at: s, lane }) : withLoad(s, lane, load), () => null, 1, 48, quiet)
          states += 1
          eachPair(game, (a, qa, b, qb, apart, area) => {
            // What is told apart in depth grows coarser with distance. The fox and what it carries are always
            // near; everything else is also seen from as far as the haze lets it be.
            const near = a === b || a.key === 'fox' || b.key === 'fox' || a.key === `load-${load}` || b.key === `load-${load}`
            if (Math.abs(apart) >= (near ? NEAR_TOLD : FAR_TOLD) || area < 0.05) return
            const key = `${a.key} ${partOf(a, qa)} | ${b.key} ${partOf(b, qb)}`
            if (!found.has(key)) found.set(key, `at ${s} lane ${lane} with ${load}: ${apart.toFixed(3)} apart over ${area.toFixed(1)}`)
          }, true)
        }
      }
    }
    expect(states).toBeGreaterThan(8000)
    expect([...found].map(([key, where]) => `${key} (${where})`)).toEqual([])
  }, 60_000)
})

/**
 * The contacts the game makes on purpose: each is two things that are meant to touch, with why. Everything else
 * that swaps front and back while its beads overlap is one thing passing through another.
 */
const ON_PURPOSE = {
  load: 'what the fox carries is in its hands: it is taken, held, thrown, picked up and handed over, and the two touch all the while',
  leaves: 'a jump at the branch goes up through its leaves and twigs, which is how the fox comes out wearing a leaf',
  honk: 'the goose stretches her neck out over the lane on the side she looks to and honks in the ear of whoever passes there',
  flowers: 'thorns in flower catch no one: the fox goes through the blossom as through a curtain',
} as const
type Purpose = keyof typeof ON_PURPOSE

function onPurpose(game: Game, a: Item, partA: string, b: Item, partB: string): Purpose | null {
  const lap = game.lap
  const mine = (item: Item): boolean => item.key === 'fox' || item.key === `load-${lap.load}`
  const pair = (one: (item: Item, part: string) => boolean, other: (item: Item, part: string) => boolean): boolean => (one(a, partA) && other(b, partB)) || (one(b, partB) && other(a, partA))
  if (pair((item) => item.key === 'fox', (item) => item.key === `load-${lap.load}`)) return 'load'
  if (lap.air && pair(mine, (item, part) => item.key === 'branch' && (part === 'limb' || part === 'leaves'))) return 'leaves'
  const seen = lap.trail.gooseLooks === 'left' ? 0 : 2
  if (lap.lane === seen && pair(mine, (item, part) => item.key === 'goose' && (part === 'neck' || part === 'honk' || part === 'full'))) return 'honk'
  if (lap.trail.flowers && pair(mine, (item) => item.key === 'brambles')) return 'flowers'
  return null
}

describe('nothing in the setting shares a plane', () => {
  it('stands every tree, bush and stone in a plane of its own, apart from each one it overlaps and from everyone on the board', () => {
    const shapes = makeShapes()
    const things = layOut().map((thing) => {
      const plaque = shapes[thing.kind][thing.shape]
      return { name: `${thing.kind} at ${thing.s}`, plane: thing.s + thing.deep, rect: { minX: thing.x - plaque.w / 2, maxX: thing.x + plaque.w / 2, minY: 0, maxY: plaque.h } }
    })
    const round = (apart: number): number => Math.abs(apart > LENGTH / 2 ? apart - LENGTH : apart < -LENGTH / 2 ? apart + LENGTH : apart)
    const found: string[] = []
    for (let i = 0; i < things.length; i++) {
      for (let j = i + 1; j < things.length; j++) {
        const apart = round(things[j].plane - things[i].plane)
        if (apart < FAR_TOLD && overlapOf(things[i].rect, things[j].rect) > 0) found.push(`${things[i].name} | ${things[j].name}: ${apart.toFixed(3)} apart`)
      }
    }
    // Everyone on the board, as they stand with nobody playing.
    const game = new Game(save({ at: 0, lane: 1 }), () => null, 1, 48, quiet)
    let checked = 0
    for (const item of game.stage.items) {
      if (item.key === 'fox') continue
      for (let i = item.from; i < item.to; i++) {
        const quad = game.stage.quads[i]
        if (quad.flat) continue
        const rect = rectOf(item, quad), plane = planeOf(item, quad)
        for (const thing of things) {
          checked += 1
          if (round(thing.plane - plane) < FAR_TOLD && overlapOf(rect, thing.rect) > 0) found.push(`${item.key} ${partOf(item, quad)} | ${thing.name}`)
        }
      }
    }
    expect(checked).toBeGreaterThan(10000)
    expect(found).toEqual([])
  })
})

describe('nothing passes through anything', () => {
  /** What each pair of overlapping plaques was on the frame before: how far apart their planes were, and how many beads of them overlapped. */
  type Seen = Map<string, { apart: number; shared: number }>
  const acts = new Set<string>()
  const purposes = new Set<Purpose>()
  let frames = 0

  /**
   * One frame. Two plaques of different things have passed through each other when the one that was in front is
   * now behind, and beads of the two overlap on the glass on either side of the swap.
   */
  function watch(game: Game, seen: Seen, found: Map<string, string>, when: string): void {
    const now: Seen = new Map()
    eachPair(game, (a, qa, b, qb, apart) => {
      const partA = partOf(a, qa), partB = partOf(b, qb)
      const key = `${a.key} ${partA} | ${b.key} ${partB}`
      const before = seen.get(key)
      // Only a pair that may be about to swap, or just has, is worth counting beads for.
      const shared = Math.abs(apart) < 6 || (before !== undefined && before.apart * apart < 0) ? beadsShared(a, qa, b, qb) : 0
      now.set(key, { apart, shared })
      if (!before || before.apart * apart >= 0 || Math.abs(before.apart - apart) > 30) return
      const beads = Math.max(shared, before.shared)
      if (beads === 0) return
      const purpose = onPurpose(game, a, partA, b, partB)
      if (purpose) {
        purposes.add(purpose)
        return
      }
      const worst = found.get(key)
      if (!worst || beads > Number(worst.split(' beads')[0])) found.set(key, `${beads} beads, from ${before.apart.toFixed(2)} to ${apart.toFixed(2)} ${when}`)
    })
    seen.clear()
    for (const [key, value] of now) seen.set(key, value)
  }
  type Way = 'free' | 'into' | 'jump' | 'roll' | 'stops'

  /** The ways through an obstacle that need no jump: none for the log. */
  const freeLanes = (name: Obstacle): Lane[] => ([0, 1, 2] as Lane[]).filter((lane) => !ZONES[name].blocked[lane])

  /**
   * Plays one whole lap with the finger down, meeting every obstacle in its own way: by the free lane, by running
   * into it and then going round, by jumping it, by rolling under it, or stopping and starting all the way.
   */
  function lap(load: Load, way: Way, lane: Lane, found: Map<string, string>, from = 10, until = Infinity): { frames: number; acts: Set<string> } {
    const game = new Game(load === 'none' ? save({ at: from, lane }) : withLoad(from, lane, load), () => null, 1, 48, quiet)
    const acts = new Set<string>()
    const hits = new Map<Obstacle, number>()
    let clock = 0, frames = 0, acting = false
    const seen: Seen = new Map()
    game.press(600, 640, W, H, 0)
    for (let i = 0; i < 60 * 240 && !game.lap.finished && !(game.lap.s > until && !game.lap.act && !game.lap.air); i++) {
      clock += DT
      const now = game.lap
      const next = OBSTACLES.find((name) => ZONES[name].to > now.s - 1)
      if (next && !now.act && !now.air && now.down) {
        const zone = ZONES[next], tried = hits.get(next) ?? 0
        // The goose honks at whoever passes on the side she looks to: the next try is by the other side.
        const ways = freeLanes(next), free = ways.length > 0 ? ways[tried % ways.length] : null
        const before = zone.from - now.s, mid = zone.mid - now.s
        // Whatever the way, a fox that has run into the same thing twice goes round it or over it.
        const how: Way = tried >= 2 ? 'free' : way === 'into' && tried >= 1 ? 'free' : way
        if (how === 'free' || how === 'stops') {
          if (free !== null && before < 60 && before > 0 && now.lane !== free) now.shift(free > now.lane ? 1 : -1)
          if (free === null && mid < 27 && mid > 20) now.jump()
        } else if (how === 'into') {
          const blocked = zone.blocked.indexOf(true) as Lane
          if (before < 60 && before > 0 && !zone.blocked[now.lane]) now.shift(blocked > now.lane ? 1 : -1)
        } else if (how === 'jump') {
          if (mid < 27 && mid > 20) now.jump()
        } else if (how === 'roll') {
          if (before < 12 && before > 0) now.tuck()
          if (next === 'log' && before < 60 && before > 0 && now.lane !== 0) now.shift(-1)
        }
      }
      if (way === 'stops' && i % 150 === 110) game.lift()
      if (way === 'stops' && i % 150 === 149) game.press(600, 640, W, H, clock * 1000)
      game.frame(DT, clock)
      frames += 1
      const act = game.lap.act
      if (act && !acting) {
        acts.add(act.kind)
        const where = OBSTACLES.find((name) => game.lap.s > ZONES[name].from - 40 && game.lap.s < ZONES[name].to + 40)
        if (where) hits.set(where, (hits.get(where) ?? 0) + 1)
      }
      acting = act !== null
      watch(game, seen, found, `with ${load}, by ${way} from lane ${lane}, at ${Math.round(game.lap.s)} lane ${game.lap.lane}${act ? ` in ${act.kind}` : ''}${game.lap.roll > 0 ? ' rolled' : ''}${game.lap.air ? ' in the air' : ''}`)
    }
    if (until < Infinity) return { frames, acts }
    expect(game.lap.finished, `${load} by ${way} from lane ${lane}: stuck at ${Math.round(game.lap.s)}`).toBe(true)
    game.lift()
    for (let i = 0; i < 60 * (LONGEST + 1); i++) {
      clock += DT
      game.frame(DT, clock)
      frames += 1
      watch(game, seen, found, `in the hand-over of ${load}`)
    }
    // And the step to the shelf that begins the next lap.
    game.press(600, 640, W, H, clock * 1000)
    game.lift()
    for (let i = 0; i < 120; i++) {
      clock += DT
      game.frame(DT, clock)
      watch(game, seen, found, `beginning again after ${load}`)
    }
    return { frames, acts }
  }

  const ALL = ['none', ...LOADS] as Load[]

  it.each(ALL)('on every frame of whole laps with %s: by the free lane, into everything, over it, under it, and stopping all the way', (load) => {
    const found = new Map<string, string>()
    for (const way of ['free', 'into', 'jump', 'roll', 'stops'] as Way[]) {
      for (const lane of (way === 'into' || way === 'jump' ? [0, 1, 2] : [1]) as Lane[]) {
        const went = lap(load, way, lane, found)
        frames += went.frames
        for (const act of went.acts) acts.add(act)
      }
    }
    expect([...found].map(([key, where]) => `${key}: ${where}`)).toEqual([])
  }, 60_000)

  // And each obstacle met afresh with each load, each way, from each lane, so that no cell of the grid is missed.
  it.each(OBSTACLES)('at the %s, with each load, each way, from each lane', (name) => {
    const found = new Map<string, string>()
    for (const load of ALL) {
      for (const way of ['into', 'jump', 'roll'] as Way[]) {
        for (const lane of [0, 1, 2] as Lane[]) {
          const went = lap(load, way, lane, found, ZONES[name].from - 70, ZONES[name].to + 70)
          frames += went.frames
          for (const act of went.acts) acts.add(act)
        }
      }
    }
    expect([...found].map(([key, where]) => `${key}: ${where}`)).toEqual([])
  }, 60_000)

  // What the first reading had built: the dive's own pose, water seen leaving the pail, the crumbs licked off the fox's hands.
  it.each(ALL)('through a dive with %s: on plain trail from each lane, and onto the mud, the log and the goose', (load) => {
    const found = new Map<string, string>()
    let dived = 0
    for (const lane of [0, 1, 2] as Lane[]) {
      for (const from of [230, ZONES.mud.from - 40, ZONES.goose.from - 40, ZONES.log.from - 40]) {
        const game = new Game(load === 'none' ? save({ at: from, lane }) : withLoad(from, lane, load, load === 'bucket' ? { left: 3 } : {}), () => null, 1, 48, quiet)
        const seen: Seen = new Map()
        let clock = 0, jumped = false, tucked = false
        game.press(600, 640, W, H, 0)
        for (let i = 0; i < 240; i++) {
          clock += DT
          if (!jumped && game.lap.s >= from + 14 && !game.lap.act) { game.lap.jump(); jumped = true }
          else if (jumped && !tucked && game.lap.air && game.lap.y > 9) { game.lap.tuck(); tucked = true }
          game.frame(DT, clock)
          if (game.lap.diving) dived += 1
          frames += 1
          watch(game, seen, found, `diving with ${load} from ${from}, lane ${lane}, at ${Math.round(game.lap.s)}${game.lap.diving ? ' in the dive' : ''}${game.lap.roll > 0 ? ' rolled' : ''}`)
        }
      }
    }
    expect(dived).toBeGreaterThan(20)
    expect([...found].map(([key, where]) => `${key}: ${where}`)).toEqual([])
  }, 60_000)

  it('through the hand-over of a cake with no tier left, from each lane: the bear leans over the fox\'s hands and licks the crumbs off them', () => {
    const found = new Map<string, string>()
    for (const lane of [0, 1, 2] as Lane[]) {
      const game = new Game(withLoad(PLACES.handOver - 50, lane, 'cake', { left: 0 }), () => null, 1, 48, quiet)
      const seen: Seen = new Map()
      let clock = 0, shown = 0
      game.press(600, 640, W, H, 0)
      for (let i = 0; i < 60 * (LONGEST + 3); i++) {
        clock += DT
        if (game.lap.finished) game.lift()
        game.frame(DT, clock)
        if (game.stage.items.find((item) => item.key === 'fox')!.pose.parts.crumbs.show) shown += 1
        frames += 1
        watch(game, seen, found, `in the hand-over of crumbs from lane ${lane}`)
      }
      expect(game.lap.finished).toBe(true)
      expect(shown, `lane ${lane}`).toBeGreaterThan(30)
    }
    expect([...found].map(([key, where]) => `${key}: ${where}`)).toEqual([])
  }, 60_000)

  // Whoever takes the load stops clear of the fox on its own side, so each lane sends it another way in.
  it('through the hand-over of each load from each lane: whoever wanted it steps in beside the fox, takes it and goes home', () => {
    const found = new Map<string, string>()
    for (const load of LOADS) {
      for (const lane of [0, 1, 2] as Lane[]) {
        const game = new Game(withLoad(PLACES.handOver - 50, lane, load), () => null, 1, 48, quiet)
        const seen: Seen = new Map()
        let clock = 0
        game.press(600, 640, W, H, 0)
        for (let i = 0; i < 60 * (LONGEST + 3); i++) {
          clock += DT
          if (game.lap.finished) game.lift()
          game.frame(DT, clock)
          frames += 1
          watch(game, seen, found, `in the hand-over of ${load} from lane ${lane}`)
        }
        expect(game.lap.finished).toBe(true)
      }
    }
    expect([...found].map(([key, where]) => `${key}: ${where}`)).toEqual([])
  }, 60_000)

  it('saw every way an obstacle can carry the fox, and every contact made on purpose', () => {
    expect(frames).toBeGreaterThan(60000)
    expect([...acts].sort()).toEqual(['blind', 'bonk', 'burrs', 'catch', 'climb', 'flight', 'flop', 'snag', 'splash', 'tailhang', 'thrown', 'trip', 'vault'])
    // An allowance nothing needs any more is taken out of the list.
    expect([...purposes].sort()).toEqual(Object.keys(ON_PURPOSE).sort())
  })
})
