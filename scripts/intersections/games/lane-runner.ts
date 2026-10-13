import type { Driver, Frac, GameAudit, Moment } from '../types.ts'
import { OBSTACLES, PLACES, ZONES, type Lane, type Obstacle } from '../../../games/lane-runner/trail.ts'

// Lane Runner: every plaque is a flat rectangle that stands facing the child
// or lies on the board, so the only thing two of them can do wrong in three
// dimensions is share a plane where they overlap. The moments below put the
// game in every state it has: the idle ladder at the shelf and on the trail,
// each load taken and the gate flown, a load swapped two steps out, a dive
// with each load, every cell of the grid (each obstacle
// met with each load by running into it, jumping it and rolling under it),
// the other lanes an obstacle fills, loads part used, a tumble in the
// puddle, the goose from the side she looks to, a load thrown and picked
// up again, the owl on the branch, the goose riding, what a lap leaves on
// the trail, the ghost hand's four showings, a teeter at each edge, every
// hand-over and its end, a hand-over cut short, and every watcher poked,
// with empty hands, while carrying and after a hand-over. Each starts from
// a saved state, so none depends on the one before.
//
// Whether one thing passes through another from frame to frame (a swap of
// which is in front while their beads overlap) is not something a still
// scene can show; games/lane-runner/clear.test.ts holds that on every frame
// of the same grid, and names the contacts made on purpose.

type Load = 'none' | 'cake' | 'ladder' | 'balloons' | 'owl' | 'bucket'
const LOADS: readonly Load[] = ['none', 'cake', 'ladder', 'balloons', 'owl', 'bucket']
/** How much of each there is when it is taken, and the most there can be (lapState.ts). */
const TAKEN_WITH: Record<Load, number> = { none: 0, cake: 3, ladder: 1, balloons: 4, owl: 1, bucket: 1 }

type Hook = { projectFrac(p: readonly number[]): number[] | null }
type AuditWindow = { __jamAudit: Hook }

const SLOT = 'tada-jam:slot:lane-runner'
/** Pegs a second the fox runs (lap.ts), and how far before an obstacle's middle a jump is taken to clear it. */
const RUN_SPEED = 70
const JUMP_BEFORE = 24
/** Where the finger rests while the fox runs, and how far a flick and a slide of one lane go, as fractions of the surface. */
const FINGER: Frac = [0.5, 0.8]
const FLICK = 0.075
const SLIDE = 0.045

/** A place in the fox's own world as a place on the surface: the fox at the origin, the trail running away towards minus z. */
async function world(d: Driver, x: number, y: number, z: number): Promise<Frac> {
  const at = await d.page.evaluate((p) => (window as unknown as AuditWindow).__jamAudit.projectFrac(p), [x, y, z])
  return at ? [at[0], at[1]] : [0.5, 0.5]
}

type Saved = Record<string, unknown>
const save = (fields: Saved): Saved => ({ v: 1, position: 'pond', finished: false, ...fields })
const carrying = (at: number, lane: Lane, load: Load, more: Saved = {}): Saved =>
  load === 'none' ? save({ at, lane, ...more }) : save({ at, lane, load, held: true, lies: null, left: TAKEN_WITH[load], ...more })

async function start(d: Driver, state: Saved): Promise<void> {
  await d.reload({ [SLOT]: state })
  await d.wait(200)
}

type Way = 'into' | 'jump' | 'roll'

/** Runs the fox at an obstacle from two steps before it, in a lane it fills, and holds the finger down through whatever it does. */
async function meet(d: Driver, name: Obstacle, lane: Lane, load: Load, way: Way, more: Saved = {}): Promise<void> {
  const zone = ZONES[name]
  const from = zone.from - 40
  await start(d, carrying(from, lane, load, more))
  await d.press(FINGER)
  if (way === 'jump') {
    await d.wait(Math.max(0, ((zone.mid - JUMP_BEFORE - from) / RUN_SPEED) * 1000 - 66))
    await d.move([FINGER[0], FINGER[1] - FLICK], 33)
  } else if (way === 'roll') {
    await d.wait(Math.max(0, ((zone.from - 10 - from) / RUN_SPEED) * 1000 - 66))
    await d.move([FINGER[0], FINGER[1] + FLICK], 33)
  }
  await d.wait(2400)
  await d.release()
  await d.wait(700)
}

/** The lane an obstacle fills that a fox runs into: the first of them. */
const filled = (name: Obstacle): Lane => ZONES[name].blocked.indexOf(true) as Lane

const grid: Moment[] = []
for (const name of OBSTACLES) {
  for (const way of ['into', 'jump', 'roll'] as const) {
    for (const load of LOADS) grid.push({ name: `${name}-${way}-${load}`, run: (d) => meet(d, name, filled(name), load, way) })
  }
}

/** By the lane that needs no jump, with a slide across the trail on the way. */
const free: Moment[] = OBSTACLES.map((name) => ({
  name: `${name}-free-lane`,
  run: async (d: Driver) => {
    const lane = ZONES[name].blocked.indexOf(false)
    await start(d, carrying(ZONES[name].from - 40, (lane < 0 ? 1 : lane) as Lane, 'balloons'))
    await d.press(FINGER)
    await d.wait(1200)
    await d.move([FINGER[0] + (lane === 2 ? -SLIDE : SLIDE), FINGER[1]], 33)
    await d.wait(800)
    await d.release()
    await d.wait(500)
  },
}))

/** Stopped where there is no room to stand: under the branch, in the thorns, in the hollow end of the log. */
const tunnels: Moment[] = (['branch', 'brambles', 'log'] as const).flatMap((name) =>
  (['cake', 'balloons', 'bucket', 'owl', 'ladder'] as const).map((load) => ({
    name: `stopped-rolled-in-the-${name}-${load}`,
    run: async (d: Driver) => {
      await start(d, carrying(ZONES[name].mid + 2, 0, load))
      await d.wait(600)
      await d.press(FINGER)
      await d.wait(900)
      await d.release()
      await d.wait(400)
    },
  })),
)

/** The goose from the side she looks to: a honk, a snatch, a bang, a ride, a shriek. */
const seen: Moment[] = LOADS.flatMap((load) =>
  (['into', 'jump'] as const).map((way) => ({ name: `goose-seen-${way}-${load}`, run: (d: Driver) => meet(d, 'goose', 0, load, way) })),
)

/** Where each load stands on the gate's board (props.ts), seen from a fox at the shelf: the gate is eight pegs nearer the child. */
const ON_GATE: Record<Exclude<Load, 'none'>, readonly [number, number]> = { ladder: [-53, 70], cake: [16, 68], bucket: [-34, 65], owl: [-15, 65], balloons: [38, 68] }

const takes: Moment[] = (Object.keys(ON_GATE) as Exclude<Load, 'none'>[]).map((load) => ({
  name: `take-${load}-and-run-out`,
  run: async (d: Driver) => {
    await start(d, save({ at: PLACES.shelf, lane: 1 }))
    await d.tap(await world(d, ON_GATE[load][0], ON_GATE[load][1], 9))
    await d.wait(900)
    // Out under the gate, which is flown up as the fox goes.
    await d.press(FINGER)
    await d.wait(2200)
    await d.release()
    await d.wait(500)
  },
}))

/**
 * Two steps out from the shelf, in the left lane: the camera has stayed where it stood, so each load is where it
 * was on the surface and can still be taken. One is taken, another is taken in its place, and the fox runs out
 * past the third step, where the gate flies up.
 */
const swaps: Moment[] = [
  {
    name: 'swap-two-steps-out-and-run-out',
    run: async (d: Driver) => {
      const out = 40
      await start(d, save({ at: PLACES.shelf + out, lane: 0 }))
      await d.tap(await world(d, ON_GATE.cake[0], ON_GATE.cake[1], 9 + out))
      await d.wait(700)
      await d.tap(await world(d, ON_GATE.ladder[0], ON_GATE.ladder[1], 9 + out))
      await d.wait(700)
      await d.press(FINGER)
      await d.wait(2000)
      await d.release()
      await d.wait(500)
    },
  },
]

/** A dive: a flick up on plain trail and a flick down in the air, with each load and with empty hands. It ends in a roll. */
const dives: Moment[] = LOADS.map((load) => ({
  name: `dive-${load}`,
  run: async (d: Driver) => {
    await start(d, carrying(230, 1, load, load === 'bucket' ? { left: 3 } : {}))
    await d.press(FINGER)
    await d.wait(300)
    await d.move([FINGER[0], FINGER[1] - FLICK], 33)
    await d.wait(260)
    await d.move([FINGER[0], FINGER[1] + FLICK], 33)
    await d.wait(1300)
    await d.release()
    await d.wait(500)
  },
}))

/** The hand-over: the fox runs the last step in, and the scene plays to its end. */
function handOver(name: string, load: Load, more: Saved = {}): Moment {
  return {
    name: `hand-over-${name}`,
    run: async (d) => {
      await start(d, carrying(PLACES.handOver - 30, 1, load, more))
      await d.press(FINGER)
      await d.wait(700)
      await d.release()
      await d.wait(9600)
    },
  }
}

const marks = (more: Saved): Saved => ({ wet: false, muddy: false, berries: false, ruffles: 0, ...more })

const handOvers: Moment[] = [
  handOver('empty-hands', 'none'),
  handOver('cake-whole', 'cake'),
  handOver('cake-wet-muddy-berries', 'cake', { left: 2, marks: marks({ wet: true, muddy: true, berries: true }) }),
  handOver('cake-one-tier', 'cake', { left: 1 }),
  handOver('cake-crumbs', 'cake', { left: 0 }),
  handOver('ladder', 'ladder'),
  handOver('ladder-muddy', 'ladder', { marks: marks({ muddy: true }) }),
  handOver('ladder-with-the-goose', 'ladder', { trail: { gooseRides: true } }),
  handOver('balloons-four', 'balloons'),
  handOver('balloons-three', 'balloons', { left: 3 }),
  handOver('balloons-two', 'balloons', { left: 2 }),
  handOver('balloons-one', 'balloons', { left: 1 }),
  handOver('balloons-none', 'balloons', { left: 0 }),
  handOver('owl', 'owl'),
  handOver('owl-wet-muddy-ruffled', 'owl', { marks: marks({ wet: true, muddy: true, ruffles: 3 }) }),
  handOver('owl-left-on-the-branch', 'owl', { held: false, lies: 'branch' }),
  handOver('bucket-full', 'bucket', { left: 3 }),
  handOver('bucket-two', 'bucket', { left: 2 }),
  handOver('bucket-one', 'bucket', { left: 1 }),
  handOver('bucket-empty', 'bucket', { left: 0 }),
  // From an outer lane the one who takes the load stands on the side of the trail's middle.
  { ...handOver('from-the-left-lane', 'balloons'), run: async (d) => {
    await start(d, carrying(PLACES.handOver - 30, 0, 'balloons'))
    await d.press(FINGER)
    await d.wait(700)
    await d.release()
    await d.wait(9600)
  } },
  { ...handOver('from-the-right-lane', 'ladder'), run: async (d) => {
    await start(d, carrying(PLACES.handOver - 30, 2, 'ladder'))
    await d.press(FINGER)
    await d.wait(700)
    await d.release()
    await d.wait(9600)
  } },
]

/**
 * What the grid above does not reach, each cheap to reach: every other lane an obstacle fills, met with the cake
 * each way; the loads part used (balloons with three and two left, a cake with one tier, a pail with all its
 * water) into each obstacle; and a tumble into the mud once a slop has made a puddle of it.
 */
const otherLanes: Moment[] = OBSTACLES.flatMap((name) =>
  ([0, 1, 2] as const)
    .filter((lane) => ZONES[name].blocked[lane] && lane !== filled(name))
    .flatMap((lane) => (['into', 'jump', 'roll'] as const).map((way) => ({ name: `${name}-${way}-cake-lane-${lane}`, run: (d: Driver) => meet(d, name, lane, 'cake', way) }))),
)
const partUsed: Moment[] = OBSTACLES.flatMap((name) => [
  { name: `${name}-into-balloons-three-left`, run: (d: Driver) => meet(d, name, filled(name), 'balloons', 'into', { left: 3 }) },
  { name: `${name}-into-balloons-two-left`, run: (d: Driver) => meet(d, name, filled(name), 'balloons', 'into', { left: 2 }) },
  { name: `${name}-into-cake-one-tier`, run: (d: Driver) => meet(d, name, filled(name), 'cake', 'into', { left: 1 }) },
  { name: `${name}-into-bucket-full`, run: (d: Driver) => meet(d, name, filled(name), 'bucket', 'into', { left: 3 }) },
])
const puddle: Moment[] = (['none', 'cake', 'owl'] as const).flatMap((load) =>
  (['into', 'roll'] as const).map((way) => ({ name: `puddle-${way}-${load}`, run: (d: Driver) => meet(d, 'mud', filled('mud'), load, way, { trail: { puddle: true } }) })),
)

/**
 * The ghost hand's four showings on the trail, one after each touch: the hold, the slide, the flick up with the
 * fox's hop, and the flick down with its duck. Each is the next idle stretch after a short press.
 */
const showings: Moment[] = [
  {
    name: 'the-hand-shows-hold-slide-flick-and-roll',
    run: async (d: Driver) => {
      await start(d, carrying(300, 1, 'cake'))
      for (let i = 0; i < 4; i++) {
        await d.wait(8600)
        await d.press(FINGER)
        await d.wait(200)
        await d.release()
      }
      await d.wait(600)
    },
  },
  {
    // A slide past an outside lane: the fox teeters over the edge of the trail and comes back.
    name: 'teeter-at-each-edge',
    run: async (d: Driver) => {
      for (const [lane, dir] of [[0, -1], [2, 1]] as const) {
        await start(d, carrying(300, lane, 'bucket'))
        await d.press(FINGER)
        await d.wait(300)
        await d.move([FINGER[0] + dir * SLIDE, FINGER[1]], 33)
        await d.wait(900)
        await d.release()
        await d.wait(400)
      }
    },
  },
]

/** Where each of those who watch stands (scenery.ts), as pegs right of the trail's middle and pegs along the trail from the shelf. */
const WATCHERS: Record<string, readonly [number, number]> = { bear: [-50, -2], frog: [46, -6], hedgehog: [52, 40], owl: [-46, 74], cat: [64, 70] }

export default {
  enforce: true,
  childAge: 7,
  ignore: [
    // The soft dark under whatever stands: a flat decal with depth writing off, drawn over the board.
    '^shades$',
    // The idle ladder's pools of light: additive, with depth writing off.
    '^idle-light$',
    // The ghost hand is drawn over everything with no depth test.
    '^ghost-hand$',
    // The far sky is a backdrop with depth writing off, behind everything.
    '^sky$',
  ],
  allow: [],
  moments: [
    // Glow at 3 s, then the ghost hand taps a load on the gate (demo at 5 s).
    { name: 'idle-at-the-shelf', run: (d) => d.wait(8600) },
    {
      name: 'idle-on-the-trail',
      run: async (d) => {
        await start(d, carrying(300, 1, 'cake'))
        await d.wait(8600)
      },
    },
    {
      name: 'idle-after-the-hand-over',
      run: async (d) => {
        await start(d, save({ finished: true, at: PLACES.handOver, lane: 1, load: 'bucket', held: true, lies: null, left: 3 }))
        await d.wait(8600)
      },
    },
    ...takes,
    ...grid,
    ...seen,
    ...free,
    ...tunnels,
    {
      name: 'thrown-load-picked-up',
      run: async (d) => {
        // The cake lies where a tumble threw it at the stream; the fox wades in and has it back.
        await start(d, save({ at: ZONES.stream.from - 30, lane: ZONES.stream.worst.lane, load: 'cake', held: false, lies: ZONES.stream.worst, left: 2, marks: marks({ wet: true }) }))
        await d.wait(600)
        await d.press(FINGER)
        await d.wait(2200)
        await d.release()
        await d.wait(500)
      },
    },
    {
      name: 'every-load-lying-at-every-obstacle',
      run: async (d) => {
        for (const name of OBSTACLES) {
          for (const load of LOADS) {
            if (load === 'none') continue
            const spot = name === 'goose' ? { at: ZONES.goose.worst.at, lane: 0 } : ZONES[name].worst
            await start(d, save({ at: ZONES[name].from - 50, lane: 1, load, held: false, lies: spot, left: TAKEN_WITH[load] }))
            await d.wait(300)
          }
        }
      },
    },
    {
      name: 'owl-on-the-branch-and-back',
      run: async (d) => {
        await start(d, save({ at: ZONES.branch.from - 40, lane: 0, load: 'owl', held: false, lies: 'branch', left: 1 }))
        await d.wait(600)
        await d.press(FINGER)
        await d.wait(((ZONES.branch.mid - JUMP_BEFORE - (ZONES.branch.from - 40)) / RUN_SPEED) * 1000 - 66)
        await d.move([FINGER[0], FINGER[1] - FLICK], 33)
        await d.wait(1600)
        await d.release()
        await d.wait(500)
      },
    },
    {
      name: 'goose-rides-the-ladder-over-the-log',
      run: async (d) => {
        await start(d, carrying(ZONES.log.from - 60, 1, 'ladder', { trail: { gooseRides: true } }))
        await d.wait(500)
        await d.press(FINGER)
        await d.wait(3200)
        await d.release()
        await d.wait(600)
      },
    },
    {
      name: 'what-a-lap-leaves',
      run: async (d) => {
        // Thorns in flower with a tier on them, the puddle, mushrooms and a tier on the log, the bird's tier: run past and through each.
        const trail = { flowers: true, puddle: true, mushrooms: true, gooseLooks: 'right', leftovers: [{ obstacle: 'branch', lane: 0 }, { obstacle: 'brambles', lane: 0 }, { obstacle: 'brambles', lane: 1 }, { obstacle: 'log', lane: 1 }] }
        for (const [name, lane, load] of [['branch', 2, 'cake'], ['mud', 0, 'cake'], ['brambles', 0, 'cake'], ['brambles', 1, 'balloons'], ['goose', 2, 'bucket'], ['log', 1, 'cake']] as const) {
          await start(d, carrying(ZONES[name].from - 40, lane, load, { trail, fox: { wet: true, muddy: true, burrs: true, leaves: true }, marks: marks({ wet: true, muddy: true, berries: true }), left: load === 'balloons' ? 1 : TAKEN_WITH[load] }))
          await d.press(FINGER)
          await d.wait(2400)
          await d.release()
          await d.wait(500)
        }
      },
    },
    ...swaps,
    ...dives,
    ...otherLanes,
    ...partUsed,
    ...puddle,
    ...showings,
    ...handOvers,
    {
      name: 'hand-over-cut-short-and-the-next-lap',
      run: async (d) => {
        await start(d, carrying(PLACES.handOver - 30, 1, 'cake'))
        await d.press(FINGER)
        await d.wait(700)
        await d.release()
        await d.wait(2600)
        // A touch lands every beat at its end; the next touch begins the next lap.
        await d.tap(FINGER)
        await d.wait(1200)
        await d.tap(FINGER)
        await d.wait(1500)
      },
    },
    {
      name: 'found-finished-with-each-load',
      run: async (d) => {
        for (const load of LOADS) {
          await start(d, save(load === 'none' ? { finished: true, at: PLACES.handOver, lane: 1 } : { finished: true, at: PLACES.handOver, lane: 1, load, held: true, lies: null, left: TAKEN_WITH[load] }))
          await d.wait(900)
        }
      },
    },
    {
      name: 'everyone-poked',
      run: async (d) => {
        await start(d, save({ at: PLACES.shelf, lane: 1 }))
        for (const who of Object.keys(WATCHERS)) {
          const [x, s] = WATCHERS[who]
          await d.tap(await world(d, x, 12, -s))
          await d.wait(1300)
        }
        // And the goose on her nest, from two steps before her.
        await start(d, save({ at: PLACES.goose - 60, lane: 0 }))
        await d.tap(await world(d, 0, 12, -60))
        await d.wait(1500)
      },
    },
    {
      name: 'poked-while-carrying-and-after-the-hand-over',
      run: async (d) => {
        // The goose, by a fox with each load in its hands.
        for (const load of LOADS) {
          if (load === 'none') continue
          await start(d, carrying(PLACES.goose - 60, 0, load))
          await d.tap(await world(d, 0, 12, -60))
          await d.wait(1300)
        }
        // Each of the five after a hand-over: the press that pokes it is also the one that begins the next lap.
        for (const who of Object.keys(WATCHERS)) {
          const [x, s] = WATCHERS[who]
          await start(d, save({ finished: true, at: PLACES.handOver, lane: 1, load: 'bucket', held: true, lies: null, left: 3 }))
          await d.wait(400)
          await d.tap(await world(d, x, 12, -s - 20))
          await d.wait(1300)
        }
      },
    },
  ],
} satisfies GameAudit
