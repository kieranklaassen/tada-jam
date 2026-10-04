import { describe, expect, it } from 'vitest'
import { PLACARD, placardAt } from './folk'
import { beetleHome, standingOf } from './hit'
import { freshLab, type LabState, type Plant } from './lab'
import { PLANT, layoutOf, stemHeight, type Layout } from './layout'
import { kitAt, type Visit } from './order'
import { plantById } from './page'
import { PACKETS, pack } from './plant'
import { FRAME, rig } from './rig'
import { gameTargetAt, loupeHome } from './reach'
import { paintFamily } from './stage'
import { BODY, visitorSpot, waitingSpot } from './walker'

// Nothing passes through anything: the game's own overlap tests.
//
// A canvas game has no audit to read its scene, so the model is played here
// at sixty frames a second through moments that reach every state a child can
// reach, and what a child would see cross is measured: where a seed lands,
// where a hop ends, how long a plant on its way to the border is in front of
// the tray it leaves, where a visitor walks, and that everything comes to
// rest in a place of its own. What is meant to overlap is allowed here by
// name, with its reason and a cap.

const SEED = 20261003
const SIZES: [number, number][] = [[1180, 820], [1024, 768]]
const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
const visit = (over: Partial<Visit> = {}): Visit => ({ who: 'snail', at: 'colour', count: 1, big: false, given: [], pods: 0, ...over })
const late = (over: Partial<LabState> = {}): LabState => ({ ...freshLab(null, SEED), position: 'whole-plant', kit: kitAt('whole-plant'), shown: ['sort', 'hidden', 'runner', 'water'], visitor: visit(), nextId: 20, ...over })

/** The box a plant at rest fills: from its soil up to the top of its flower, as wide as its leaves reach. */
function boxOf(layout: Layout, state: LabState, id: number) {
  const plant = plantById(state, id)!, at = standingOf(layout, plant)
  const half = PLANT.leaf * at.k, top = at.flower.y - PLANT.flower * at.k
  return { x: at.x - half, y: top, w: half * 2, h: at.y - top }
}
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

describe('at rest', () => {
  it('no two plants overlap, on a page with every pot and every border place taken, at each size', () => {
    for (const [w, h] of SIZES) {
      const layout = layoutOf(w, h)
      const plants = []
      let id = 1
      for (const row of ['shelf', 'tray'] as const) for (let slot = 0; slot < 6; slot++) plants.push({ id: id++, pairs: RED, dry: false, row, slot, from: { how: 'packet' as const, packet: 'pink' as const } })
      for (let slot = 0; slot < 18; slot++) plants.push({ id: id++, pairs: RED, dry: false, row: 'border' as const, slot, from: { how: 'packet' as const, packet: 'pink' as const } })
      const state: LabState = { ...freshLab(null, SEED), plants, nextId: id }
      for (let a = 0; a < plants.length; a++) for (let b = a + 1; b < plants.length; b++) expect(overlap(boxOf(layout, state, plants[a].id), boxOf(layout, state, plants[b].id)), `${plants[a].row} ${plants[a].slot} and ${plants[b].row} ${plants[b].slot} at ${w}`).toBe(0)
    }
  })

  it('the plants a visitor has kept stand clear of the visitor, of its label, and of the one who waits with its sketch, for every pair of animals, at each size', () => {
    const KINDS = ['snail', 'bee', 'moth', 'ladybird', 'ant'] as const
    for (const [w, h] of SIZES) {
      const layout = layoutOf(w, h), row = layout.given, small = layout.small
      // Three kept plants at the tallest a plant grows: the most the place ever holds.
      const kept = [0, 1, 2].map((i) => ({ x: row.x + i * row.step - PLANT.leaf * small, y: row.y - stemHeight(4, small) - PLANT.flower * 2 * small, w: PLANT.leaf * 2 * small, h: stemHeight(4, small) + PLANT.flower * 2 * small }))
      for (const plant of kept) {
        expect(plant.x, `inside the page at ${w}`).toBeGreaterThanOrEqual(0)
        expect(plant.x + plant.w, `inside the page at ${w}`).toBeLessThanOrEqual(layout.w)
        // Never in the place where the next visitor waits, nor in the wish's.
        expect(overlap(plant, layout.waiting), `kept plant in the waiting place at ${w}`).toBe(0)
        expect(overlap(plant, layout.wish), `kept plant in the wish's place at ${w}`).toBe(0)
      }
      for (const kind of KINDS) {
        const on = visitorSpot(layout, kind), body = { x: on.x - (BODY[kind].w * on.s) / 2, y: on.y - BODY[kind].h * on.s, w: BODY[kind].w * on.s, h: BODY[kind].h * on.s }
        for (const plant of kept) expect(overlap(plant, body), `kept plant under the ${kind} at ${w}`).toBe(0)
        // The one who waits, whichever it is, with the sketch it holds over its head: wholly in its own place's column, above the visitor's place.
        const edge = waitingSpot(layout, kind), held = placardAt(layout, kind, edge.x, edge.y, edge.s)
        const tall = Math.min(layout.wish.h * 0.94, 190 * layout.k) * PLACARD
        const waits = { x: edge.x - (BODY[kind].w * edge.s) / 2, y: held.y - tall, w: BODY[kind].w * edge.s, h: edge.y - (held.y - tall) }
        for (const plant of kept) expect(overlap(plant, waits), `kept plant behind the ${kind} that waits at ${w}`).toBe(0)
        expect(waits.x, `the ${kind} that waits, at ${w}`).toBeGreaterThanOrEqual(layout.waiting.x - 6 * layout.k)
        expect(waits.x + waits.w).toBeLessThanOrEqual(layout.w)
        expect(overlap(waits, body), `the ${kind} that waits over the visitor at ${w}`).toBe(0)
      }
    }
  })

  it('a tap on a plant a visitor has kept never lets the next visitor in: it is a touch on the visitor it stands with', () => {
    for (const [w, h] of SIZES) {
      const layout = layoutOf(w, h), row = layout.given
      const base = late({ visitor: visit({ at: 'whole-plant', count: 3, given: [5, 5] }) })
      const t = rig(base, layout)
      for (const i of [0, 1, 2]) {
        for (const up of [4, 20, 44]) {
          const point = { x: row.x + i * row.step, y: row.y - up * layout.small }
          expect(gameTargetAt(t.made.state, layout, point, () => true).kind, `at ${w}`).toBe('visitor')
          t.tap(point)
          t.play(0.3)
          expect(t.made.state.visitor).toBe(base.visitor)
          expect(t.made.state.waiting).toBe(base.waiting)
          expect(t.made.motion.visitor?.away ?? false).toBe(false)
        }
      }
    }
  })

  it('a four-joint plant stands clear of the board above it and inside the surface', () => {
    for (const [w, h] of SIZES) {
      const layout = layoutOf(w, h)
      for (const row of ['shelf', 'tray'] as const) {
        const place = layout[row][0], top = place.soil - stemHeight(4, layout.k) - PLANT.flower * layout.k
        expect(top).toBeGreaterThan(place.cell.y - 1)
        if (row === 'tray') expect(top).toBeGreaterThan(layout.shelfBoard.y + layout.shelfBoard.h - 1)
      }
    }
  })

  it('the visitor, the plant it is answering, the beetle and the loupe each have room of their own', () => {
    for (const [w, h] of SIZES) {
      const layout = layoutOf(w, h)
      for (const who of ['snail', 'bee', 'moth', 'ladybird', 'ant'] as const) {
        const spot = visitorSpot(layout, who), half = (BODY[who].w * spot.s) / 2
        // The plant set down in front of a visitor stands clear of it: its leaves do not reach the visitor's edge.
        const leaves = layout.offer.x + PLANT.leaf * layout.k
        expect(leaves, `${who} at ${w}`).toBeLessThanOrEqual(spot.x - half + 1)
        // The visitor stands clear of the pots.
        const pots = layout.tray[5].cell.x + layout.tray[5].cell.w
        expect(spot.x - half).toBeGreaterThan(pots - 2)
      }
      const home = beetleHome(layout)
      expect(home.x - 62 * home.s).toBeGreaterThan(layout.tray[5].cell.x + layout.tray[5].cell.w)
    }
  })
})

describe('in motion', () => {
  it('every seed of a burst lands on the soil of its own pot, and never below it', () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.flower(1), t.where.flower(2))
    const soil = t.layout.tray[0].soil
    let seen = 0, lowest = -Infinity
    t.play(3, () => { for (const seed of t.made.motion.seeds) { seen++; lowest = Math.max(lowest, seed.y) } })
    expect(seen).toBeGreaterThan(40)
    // The soil point a seed flies to is a pixel under the soil line.
    expect(lowest).toBeLessThanOrEqual(soil + t.layout.k + 1)
    t.play(4)
    for (let slot = 0; slot < 6; slot++) expect(t.made.state.plants.some((plant) => plant.row === 'tray' && plant.slot === slot)).toBe(true)
  })

  it('a plant that hops ends in its own place, and one leaving the tray for the border goes over the tray and not through it', () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(6)
    t.drag(t.where.flower(1), t.where.flower(2))
    const board = t.layout.trayBoard
    // Allowed, by name: a plant on its way to the border is drawn in front of the tray's board as it comes down past it.
    // Reason: the border lies below the tray on a flat page. Cap: under a quarter of a second a hop.
    const inFront = new Map<number, number>()
    let lowestWhileOverTray = -Infinity
    t.play(4, () => {
      for (const [id, live] of t.made.motion.plants) {
        if (!live.at || live.grow < 1) continue
        const overBoard = live.at.x > board.x && live.at.x < board.x + board.w
        if (overBoard && live.at.y > board.y && live.at.y < board.y + board.h + 40) inFront.set(id, (inFront.get(id) ?? 0) + FRAME)
        // Before it is past the tray's edge it is above the pots it leaves, not among them.
        if (overBoard && live.at.y < board.y - 60) lowestWhileOverTray = Math.max(lowestWhileOverTray, live.at.y)
      }
    })
    for (const [, seconds] of inFront) expect(seconds).toBeLessThan(0.25)
    t.play(3)
    for (const plant of t.made.state.plants) expect(t.made.motion.plants.has(plant.id), `plant ${plant.id}`).toBe(false)
    expect(t.made.state.plants.filter((plant) => plant.row === 'border')).toHaveLength(6)
  })

  it('a plant carried back from the hand lands in its pot, and a plant set down squashes and does not sink', () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.pot('shelf', 0), t.where.pot('tray', 3))
    let lowest = Infinity
    t.play(2, () => { const live = t.made.motion.plants.get(1); if (live) lowest = Math.min(lowest, live.squash) })
    expect(lowest).toBeGreaterThan(0.6)
    expect(lowest).toBeLessThan(1)
    expect(t.made.motion.plants.has(1)).toBe(false)
  })

  it('a visitor keeps to its own side of the page: coming in, answering a plant and going off, it never walks among the pots', () => {
    const t = rig(late({ plants: [...late().plants, { id: 9, pairs: RED, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }] }))
    const pots = t.layout.tray[5].cell.x + t.layout.tray[5].cell.w
    const rowsTop = t.layout.shelf[0].cell.y
    const check = () => {
      const visitor = t.made.motion.visitor
      if (!visitor) return
      const half = (BODY[visitor.kind].w * visitorSpot(t.layout, visitor.kind).s) / 2
      // Above the rows, on its way to the top margin, it is over bare paper. Beside them it never goes further than
      // the plant it is answering, which stands on its own side of the pots.
      if (visitor.y > rowsTop + 4) expect(visitor.x).toBeGreaterThanOrEqual(t.layout.offer.x - 1)
      expect(t.layout.offer.x - half * 0).toBeGreaterThan(pots)
    }
    t.drag(t.where.pot('shelf', 0), t.where.visitor())
    t.play(5, check)
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    t.play(6, check)
    t.tap(t.where.waiting())
    t.play(5, check)
    t.tap(t.where.waiting())
    t.play(5, check)
  })

  it('a plant that leaves the border reaches the beetle in one hop, clear of the visitor and the loupe, and the beetle walks out past nothing', () => {
    for (const [w, h] of SIZES) {
      const layout = layoutOf(w, h), base = late()
      const plants = [...base.plants]
      for (let slot = 0; slot < 18; slot++) plants.push({ id: 30 + slot, pairs: RED, dry: false, row: 'border' as const, slot, from: { how: 'packet' as const, packet: 'pink' as const } })
      for (let slot = 0; slot < 6; slot++) plants.push({ id: 50 + slot, pairs: RED, dry: false, row: 'tray' as const, slot, from: { how: 'packet' as const, packet: 'pink' as const } })
      const t = rig({ ...base, plants, nextId: 60 }, layout)
      const home = beetleHome(layout), loupe = loupeHome(layout), snail = visitorSpot(layout, 'snail'), body = 62 * home.s
      t.drag(t.where.flower(1), t.where.flower(2))
      // Allowed, by name: a plant on its way from the border to the beetle's back is in the air in front of the tray's plants.
      // Reason: the oldest plants of the border stand at its far end from the beetle's corner, and the page is flat, so
      // any way to the beetle lies across something; this one is a hop, as a plant's way to the border is. Cap: 0.6 s a plant.
      const air = new Map<number, number>(), stood = new Map<number, number>()
      let walked = 0
      t.play(9, () => {
        const live = t.made.motion, feet = t.made.fx.beetleAt()
        for (const [id, plant] of live.plants) {
          if (id >= 0 || !plant.at) continue
          const height = (stemHeight(4, plant.at.k) + PLANT.flower * plant.at.k), top = plant.at.y - height, foot = plant.at.y + 10 * plant.at.k
          // It sets off from where it stood, one after another, and is in the air until it is over the beetle.
          if (!stood.has(id)) stood.set(id, plant.at.x)
          if (plant.at.x >= feet.x - body || plant.at.x === stood.get(id)) continue
          air.set(id, (air.get(id) ?? 0) + FRAME)
          // Over the visitor's side of the page it flies under the visitor's feet: it never crosses the visitor, its label or a plant offered to it.
          if (plant.at.x > layout.visitor.x - PLANT.leaf * plant.at.k) expect(top, `plant ${id} at ${w}`).toBeGreaterThan(snail.y)
          // And over the loupe, clear of its handle.
          if (Math.abs(plant.at.x - loupe.x) < loupe.r + PLANT.leaf * plant.at.k) expect(foot, `plant ${id} over the loupe at ${w}`).toBeLessThan(loupe.y - loupe.r)
        }
        if (live.beetle.turned && live.beetle.at) {
          walked++
          // It walks out level with its home, away from its loupe, and under the one who waits at the edge.
          expect(live.beetle.at.y).toBe(home.y)
          expect(live.beetle.at.x).toBeGreaterThanOrEqual(home.x)
          expect(waitingSpot(layout, t.made.motion.waiting!.kind).y).toBeLessThan(home.y - 78 * home.s)
        }
      })
      expect(air.size, `at ${w}`).toBe(6)
      for (const [, seconds] of air) expect(seconds).toBeLessThan(0.6)
      expect(walked).toBeGreaterThan(30)
      expect([...t.made.motion.plants.keys()].filter((id) => id < 0)).toHaveLength(0)
      expect(t.made.motion.beetle.at).toBe(null)
    }
  })

  it('the beetle comes home from everything it does, and stands nowhere else at rest', () => {
    const t = rig(late())
    const moments = [
      () => t.tap(t.where.beetle()),
      () => t.drag(t.where.flower(1), t.where.beetle()),
      () => t.drag(t.where.can(), t.where.beetle()),
      () => t.drag(t.where.can(), t.where.pot('tray', 2)),
      () => t.drag(t.where.beetle(), t.where.pot('tray', 4)),
      () => t.drag(t.where.beetle(), t.where.visitor()),
      () => t.drag(t.where.pot('shelf', 0), t.where.corner()),
      () => t.drag(t.where.flower(1), t.where.paper),
    ]
    for (const moment of moments) {
      moment()
      t.play(9)
      // At home it may be a step from its spot, in the middle of something it does by itself; it is in its own corner.
      const at = t.made.motion.beetle.at
      if (at) expect(at.x > t.layout.beetle.x && at.x < t.layout.beetle.x + t.layout.beetle.w && Math.abs(at.y - beetleHome(t.layout).y) < 1).toBe(true)
      expect(t.made.motion.beetle.flip).toBe(0)
      expect(t.made.motion.beetle.sink).toBe(0)
      expect(t.made.motion.fence).toBe(null)
    }
  })

  it('whatever is let go comes to rest: after a long seeded run of touches and ten quiet seconds nothing is in the air', () => {
    const t = rig(late())
    const spots = [() => t.where.flower(1), () => t.where.flower(2), () => t.where.pot('tray', 1), () => t.where.pot('shelf', 3), () => t.where.packet(0), () => t.where.can(), () => t.where.blotter(), () => t.where.loupe(), () => t.where.beetle(), () => t.where.visitor(), () => t.where.waiting(), () => t.where.bud('shelf', 0), () => t.where.paper]
    for (let round = 0; round < 120; round++) {
      const a = spots[(round * 7) % spots.length](), b = spots[(round * 11 + 3) % spots.length]()
      if (round % 3 === 0) t.tap(a)
      else t.drag(a, b)
      t.play(0.4)
    }
    t.play(16)
    const live = t.made.motion
    // Pods found waiting hold still; everything else has landed.
    expect(live.seeds).toHaveLength(0)
    expect(live.motes).toHaveLength(0)
    expect(live.puffs).toHaveLength(0)
    expect([...live.plants.values()].filter((plant) => plant.at !== null || plant.grow < 1)).toHaveLength(0)
    expect(live.can).toBe(null)
    expect(live.blotter).toBe(null)
    expect(live.loupe).toBe(null)
    expect(t.made.sceneRunning).toBe(false)
  }, 30_000)
})

describe('the family lines', () => {
  /** A context that draws nothing. */
  const blank = () => new Proxy({} as Record<string, unknown>, { get: (target, name: string) => (name in target ? target[name] : name === 'createLinearGradient' || name === 'createRadialGradient' ? () => ({ addColorStop: () => {} }) : () => {}), set: (target, name: string, value) => { target[name] = value; return true } }) as unknown as CanvasRenderingContext2D

  it('of a young carried up to the shelf, whose parents stand in the tray, leave from under its own board: none runs through the young, nor through what stands on the shelf over a parent', () => {
    for (const [w, h] of SIZES) {
      const layout = layoutOf(w, h), base = freshLab(null, SEED)
      const tray = (id: number, slot: number): Plant => ({ id, pairs: PACKETS.pink, dry: false, row: 'tray', slot, from: { how: 'packet', packet: 'pink' } })
      // The pod parent stands straight under the young, the dust parent three pots along with another plant on the shelf over it.
      const young: Plant = { id: 9, pairs: PACKETS.pink, dry: false, row: 'shelf', slot: 2, from: { how: 'seed', onto: 5, dust: 6 } }
      const over: Plant = { id: 7, pairs: PACKETS.pink, dry: false, row: 'shelf', slot: 5, from: { how: 'packet', packet: 'pink' } }
      const t = rig({ ...base, plants: [tray(5, 2), tray(6, 5), young, over], nextId: 20, shown: ['sort', 'hidden'] }, layout)
      const runs: (readonly (readonly [number, number])[])[] = []
      paintFamily(blank(), t.made.view(), t.layout, new Set(), (piece) => runs.push(piece))
      expect(runs.length).toBeGreaterThan(1)
      const foot = layout.shelf[2].foot
      // Every point of both lines is at or below the foot of the young's pot: in the gap under the shelf, or down at a parent's top.
      for (const run of runs) for (const [, y] of run) expect(y).toBeGreaterThanOrEqual(foot - 2)
      // And each ends over its parent, above that parent's flower.
      const ends = runs.flatMap((run) => [run[0], run[run.length - 1]])
      for (const parent of [5, 6]) expect(ends.some(([x, y]) => Math.abs(x - t.where.flower(parent).x) < 5 * layout.k && y < t.where.flower(parent).y && y > foot)).toBe(true)
    }
  })

  it('never cross: wherever an upright run of one line meets a level run of another, it hops it, through six broods and at each size', () => {
    for (const [w, h] of SIZES) {
      const t = rig({ ...freshLab(null, SEED), shown: ['sort', 'hidden'] }, layoutOf(w, h))
      let pieces = 0
      for (let brood = 0; brood < 6; brood++) {
        // Three broods from the two shelf plants, then three bred from young of the tray, whose parents and young end up side by side in the border.
        const tray = t.made.state.plants.filter((plant) => plant.row === 'tray').sort((one, two) => one.slot - two.slot)
        if (brood < 3 || tray.length < 2) t.drag(t.where.flower(1), t.where.flower(2))
        else t.drag(t.where.flower(tray[0].id), t.where.flower(tray[tray.length - 1].id))
        t.play(8)
        const runs: (readonly (readonly [number, number])[])[] = []
        // Every plant in focus in turn, and none: the lines are the same lines, drawn at other strengths.
        paintFamily(blank(), t.made.view(), t.layout, new Set(), (piece) => runs.push(piece))
        pieces += runs.length
        const level: { y: number; x1: number; x2: number; of: number }[] = [], upright: { x: number; y1: number; y2: number; of: number }[] = []
        runs.forEach((run, of) => {
          for (let i = 1; i < run.length; i++) {
            const [ax, ay] = run[i - 1], [bx, by] = run[i]
            if (Math.abs(ay - by) < 0.5 && Math.abs(ax - bx) > 0.5) level.push({ y: ay, x1: Math.min(ax, bx), x2: Math.max(ax, bx), of })
            if (Math.abs(ax - bx) < 0.5 && Math.abs(ay - by) > 0.5) upright.push({ x: ax, y1: Math.min(ay, by), y2: Math.max(ay, by), of })
          }
        })
        // A cross is a point with a stroke on all four sides of it, whichever lines the strokes belong to: an upright
        // run through a level one, or two level runs ending on an upright from left and right with the upright going on both ways.
        const near = 0.75, arm = 2
        const levelAt = (x1: number, x2: number, y: number) => level.some((bar) => Math.abs(bar.y - y) < near && bar.x1 <= x1 + 0.25 && bar.x2 >= x2 - 0.25)
        const uprightAt = (x: number, y1: number, y2: number) => upright.some((up) => Math.abs(up.x - x) < near && up.y1 <= y1 + 0.25 && up.y2 >= y2 - 0.25)
        const crosses = new Set<string>()
        for (const up of upright) for (const bar of level) {
          const x = up.x, y = bar.y
          if (levelAt(x - arm, x - 0.5, y) && levelAt(x + 0.5, x + arm, y) && uprightAt(x, y - arm, y - 0.5) && uprightAt(x, y + 0.5, y + arm)) crosses.add(`(${Math.round(x)}, ${Math.round(y)})`)
        }
        expect([...crosses], `brood ${brood + 1} at ${w}`).toEqual([])
      }
      expect(pieces).toBeGreaterThan(30)
    }
  })
})
