import { describe, expect, it } from 'vitest'
import { ACTS, BLOOPS, BLOOP_EVERY, CHIMES, CHIME_EVERY, FLIGHT_BACK, Lap, REST_BEFORE_TURN, RUN_SPEED, TICK, actAlong, actRise, type ActKind, type Gag, type LapEvent } from './lap'
import { AT_MOST, LOADS, TAKEN_WITH, deserializeLap, newLap, type LapState, type Load } from './lapState'
import { CLEAR, LENGTH, PLACES, SHELF_REACH, STEP, ZONES, type Lane, type Obstacle } from './trail'
import { notesFor } from './voices'

// The rules of a lap, with no browser: what the finger does to the fox, what
// each obstacle does to each load, what is saved and when.

function saved(fields: Record<string, unknown> = {}): LapState {
  return deserializeLap({ v: 1, position: 'pond', finished: false, ...fields })
}

/** A fox standing at `at` in `lane` with `load` in its hands. */
function lapAt(at: number, lane: Lane, load: Load = 'none', more: Record<string, unknown> = {}): Lap {
  return new Lap(saved({ at, lane, load, held: load !== 'none', left: TAKEN_WITH[load], ...more }))
}

const gags = (events: readonly LapEvent[]): Gag[] => events.flatMap((event) => (event.type === 'gag' ? [event.gag] : []))
const types = (events: readonly LapEvent[]): string[] => events.map((event) => event.type)

/** Holds a finger down until the fox has travelled `pegs`, or been carried. Returns what happened. */
function run(lap: Lap, pegs: number, stopOnAct = true): LapEvent[] {
  const all: LapEvent[] = []
  lap.hold(true)
  const most = ((pegs / RUN_SPEED) * 3 + 1) / TICK
  for (let i = 0; i < most; i++) {
    const before = lap.run
    lap.step(TICK)
    all.push(...lap.events.splice(0))
    pegs -= lap.run - before
    if (pegs <= 0 || (stopOnAct && lap.act) || lap.finished) break
  }
  return all
}

/** Plays on with whatever the finger is doing until nothing carries the fox and it is on the ground. */
function settle(lap: Lap, most = 6): LapEvent[] {
  const all: LapEvent[] = []
  for (let i = 0; i < most / TICK && (lap.act || lap.air); i++) {
    lap.step(TICK)
    all.push(...lap.events.splice(0))
  }
  return all
}

/** Runs the fox at an obstacle from two steps before it, in `lane`, doing `way` on the approach. */
function meet(obstacle: Obstacle, lane: Lane, load: Load, way: 'run' | 'roll' | 'jump', more: Record<string, unknown> = {}): { lap: Lap; events: LapEvent[] } {
  const zone = ZONES[obstacle]
  const lap = lapAt(zone.from - 2 * STEP, lane, load, more)
  const events: LapEvent[] = []
  lap.hold(true)
  lap.events.length = 0
  // A jump is made so that its top is over the middle; a roll just before the edge.
  const jumpAt = zone.mid - 28, rollAt = zone.from - 6
  let done = false
  for (let i = 0; i < 8 / TICK; i++) {
    if (!done && way === 'jump' && lap.s >= jumpAt) { lap.jump(); done = true }
    if (!done && way === 'roll' && lap.s >= rollAt) { lap.tuck(); done = true }
    lap.step(TICK)
    events.push(...lap.events.splice(0))
    if (lap.act) break
    if (lap.s > zone.to + 30 && !lap.air) break
  }
  lap.hold(false)
  events.push(...settle(lap), ...lap.events.splice(0))
  return { lap, events }
}

describe('the fox under the finger', () => {
  it('is at full speed on the tick the finger lands and at none on the tick it lifts', () => {
    const lap = lapAt(100, 1)
    lap.hold(true)
    lap.step(TICK)
    expect(lap.speed).toBe(RUN_SPEED)
    expect(types(lap.events)).toContain('start')
    lap.hold(false)
    expect(lap.speed).toBe(0)
    expect(types(lap.events)).toContain('stop')
  })

  it('never moves unasked: with no finger down it stands where it is, wherever it is, whatever it carries', () => {
    for (const load of ['none', ...LOADS] as Load[]) {
      for (const at of [0, 100, ZONES.stream.from + 4, ZONES.mud.from + 30, 900, 1300]) {
        const lap = lapAt(at, 0, load)
        lap.step(12)
        expect(lap.s).toBe(at)
        expect(lap.events).toEqual([])
      }
    }
  })

  it('never goes faster than its one speed, however long the finger stays down', () => {
    const lap = lapAt(0, 2)
    lap.hold(true)
    let fastest = 0
    for (let i = 0; i < 30 / TICK && !lap.finished; i++) {
      const before = lap.s
      lap.step(TICK)
      if (!lap.act) fastest = Math.max(fastest, ((lap.s - before + LENGTH) % LENGTH) / TICK)
    }
    expect(fastest).toBeLessThanOrEqual(RUN_SPEED + 1e-6)
  })

  it('changes lane, teeters past the outside lane, jumps for about three quarters of a second and rolls', () => {
    const lap = lapAt(100, 1)
    lap.hold(true)
    lap.shift(1)
    expect(lap.lane).toBe(2)
    lap.shift(1)
    expect(lap.lane).toBe(2)
    expect(lap.teeter).toBeGreaterThan(0)
    lap.jump()
    let air = 0
    while (lap.air) { lap.step(TICK); air += TICK }
    expect(air).toBeGreaterThan(0.65)
    expect(air).toBeLessThan(0.95)
    lap.events.length = 0
    lap.tuck()
    expect(lap.roll).toBeGreaterThan(0)
    expect(types(lap.events)).toEqual(['roll'])
  })

  it('puts a foot down each time its legs pass half a turn', () => {
    const lap = lapAt(220, 1)
    lap.hold(true)
    lap.events.length = 0
    let steps = 0
    for (let i = 0; i < 2 / TICK; i++) {
      const was = Math.floor(lap.phase / Math.PI)
      lap.step(TICK)
      const stepped = lap.events.some((event) => event.type === 'step')
      expect(stepped).toBe(Math.floor(lap.phase / Math.PI) !== was)
      if (stepped) steps++
      lap.events.length = 0
    }
    expect(steps).toBe(10)
  })

  it('turns round to the child after standing a moment', () => {
    const lap = lapAt(100, 1)
    run(lap, 20)
    lap.hold(false)
    lap.events.length = 0
    lap.step(REST_BEFORE_TURN + 0.05)
    expect(lap.faces).toBe('child')
    expect(types(lap.events)).toEqual(['turn'])
  })
})

describe('the shelf', () => {
  it('puts a load in the hands on a press, swaps it for another, and stops when the fox has left the clearing', () => {
    const lap = lapAt(0, 1)
    lap.take('cake')
    expect([lap.load, lap.carrying, lap.left]).toEqual(['cake', true, 3])
    expect(lap.urgent).toBe(true)
    lap.take('balloons')
    expect([lap.load, lap.left]).toEqual(['balloons', 4])
    expect(lap.events.filter((event) => event.type === 'take')).toEqual([{ type: 'take', load: 'cake', back: 'none' }, { type: 'take', load: 'balloons', back: 'cake' }])
    run(lap, SHELF_REACH + 2)
    lap.hold(false)
    lap.take('owl')
    expect(lap.load).toBe('balloons')
  })

  it('takes the bucket with one level in it', () => {
    const lap = lapAt(0, 1)
    lap.take('bucket')
    expect(lap.left).toBe(1)
  })
})

describe('the grid: empty hands', () => {
  it('stream: run in is a splash and a soaked fox, the stones are the way through, a jump clears it', () => {
    const wet = meet('stream', 1, 'none', 'run')
    expect(gags(wet.events)).toEqual(['splash'])
    expect(wet.lap.fox.wet).toBe(true)
    const stones = meet('stream', 0, 'none', 'run')
    expect(gags(stones.events)).toEqual(['stones'])
    expect(stones.events.some((event) => event.type === 'step' && event.surface === 'stone')).toBe(true)
    expect(stones.lap.fox.wet).toBe(false)
    const over = meet('stream', 2, 'none', 'jump')
    expect(gags(over.events)).toEqual([])
    expect(over.lap.fox.wet).toBe(false)
  })

  it('branch: run in is a bonk that leaves the fox before it, a jump a hat of leaves, a roll goes under, the right is open', () => {
    const bonk = meet('branch', 0, 'none', 'run')
    expect(gags(bonk.events)).toEqual(['bonk'])
    expect(bonk.lap.s).toBeLessThan(ZONES.branch.from)
    const hat = meet('branch', 1, 'none', 'jump')
    expect(gags(hat.events)).toEqual(['leafhat'])
    expect(hat.lap.fox.leaves).toBe(true)
    expect(gags(meet('branch', 0, 'none', 'roll').events)).toEqual([])
    expect(gags(meet('branch', 2, 'none', 'run').events)).toEqual([])
  })

  it('mud: wading is slow and muddy, a jump is a belly flop, a roll a brown ball, the plank is the way through', () => {
    const wade = meet('mud', 0, 'none', 'run')
    expect(gags(wade.events)).toEqual(['wade'])
    expect(wade.lap.fox.muddy).toBe(true)
    expect(wade.events.some((event) => event.type === 'step' && event.surface === 'mud')).toBe(true)
    const flop = meet('mud', 2, 'none', 'jump')
    expect(gags(flop.events)).toEqual(['flop'])
    expect(gags(meet('mud', 0, 'none', 'roll').events)).toEqual(['mudball'])
    const plank = meet('mud', 1, 'none', 'run')
    expect(gags(plank.events)).toEqual([])
    expect(plank.lap.fox.muddy).toBe(false)
    expect(plank.events.some((event) => event.type === 'step' && event.surface === 'plank')).toBe(true)
  })

  it('brambles: run in is a yelp and a hop back with burrs, a jump hangs by the tail, a roll comes out a burr ball', () => {
    const yelp = meet('brambles', 0, 'none', 'run')
    expect(gags(yelp.events)).toEqual(['burrs'])
    expect(yelp.lap.fox.burrs).toBe(true)
    expect(yelp.lap.s).toBeLessThan(ZONES.brambles.from)
    const hang = meet('brambles', 1, 'none', 'jump')
    expect(gags(hang.events)).toEqual(['tailhang'])
    expect(hang.lap.s).toBeGreaterThan(ZONES.brambles.to)
    const ball = meet('brambles', 0, 'none', 'roll')
    expect(gags(ball.events)).toEqual(['burrball'])
    expect(ball.lap.s).toBeGreaterThan(ZONES.brambles.to)
    expect(gags(meet('brambles', 2, 'none', 'run').events)).toEqual([])
  })

  it('goose: a honk and a leap on her left, a bump in the middle, a duck and a honk after a jump, nothing behind her back or rolling by', () => {
    expect(types(meet('goose', 0, 'none', 'run').events)).toEqual(expect.arrayContaining(['honk', 'fright']))
    const bump = meet('goose', 1, 'none', 'run')
    expect(types(bump.events)).toContain('bump')
    expect(bump.lap.s).toBeLessThan(ZONES.goose.from - STEP)
    const over = types(meet('goose', 1, 'none', 'jump').events)
    expect(over.indexOf('duck')).toBeGreaterThanOrEqual(0)
    expect(over.indexOf('honk')).toBeGreaterThan(over.indexOf('duck'))
    expect(types(meet('goose', 2, 'none', 'run').events)).not.toContain('honk')
    expect(types(meet('goose', 0, 'none', 'roll').events)).not.toContain('honk')
  })

  it('log: run in is a trip to the far side, a jump clears it, a roll goes through the hollow end on the left only', () => {
    const trip = meet('log', 1, 'none', 'run')
    expect(gags(trip.events)).toEqual(['trip'])
    expect(trip.lap.s).toBeGreaterThan(ZONES.log.to)
    expect(gags(meet('log', 2, 'none', 'jump').events)).toEqual([])
    expect(gags(meet('log', 0, 'none', 'roll').events)).toEqual(['hollow'])
    expect(gags(meet('log', 1, 'none', 'roll').events)).toEqual(['trip'])
    expect(gags(meet('log', 0, 'none', 'run').events)).toEqual(['trip'])
  })
})

describe('the grid: the cake', () => {
  it('loses a tier to the stream, the branch, the thorns, the goose and the log, each its own way, and gets a mud tier back', () => {
    const cells: [Obstacle, Lane, Gag, number, boolean][] = [
      ['stream', 1, 'sail', 2, false],
      ['branch', 0, 'birdTier', 2, true],
      ['mud', 0, 'mudTier', 3, false],
      ['brambles', 1, 'kebab', 2, true],
      ['log', 2, 'splat', 2, true],
    ]
    for (const [obstacle, lane, gag, left, leftover] of cells) {
      const { lap, events } = meet(obstacle, lane, 'cake', 'jump')
      expect(gags(events), obstacle).toContain(gag)
      expect(lap.left, obstacle).toBe(left)
      expect(lap.trail.leftovers.some((one) => one.obstacle === obstacle), obstacle).toBe(leftover)
    }
    expect(meet('mud', 0, 'cake', 'jump').lap.marks.muddy).toBe(true)
  })

  it('catches the tier again after a jump over plain trail', () => {
    const lap = lapAt(260, 1, 'cake')
    lap.hold(true)
    lap.jump()
    const events = [...lap.events.splice(0), ...settle(lap)]
    expect(types(events)).toEqual(expect.arrayContaining(['toss', 'catch']))
    expect(lap.left).toBe(3)
  })

  it('sways on the stones, lies flat under the branch, comes out of the thorns with berries, hums in the hollow, and is safe behind the goose', () => {
    expect(gags(meet('stream', 0, 'cake', 'run').events)).toEqual(['sway'])
    expect(gags(meet('branch', 1, 'cake', 'roll').events)).toEqual(['flat'])
    const thorns = meet('brambles', 0, 'cake', 'roll')
    expect(gags(thorns.events)).toEqual(['berries'])
    expect(thorns.lap.marks.berries).toBe(true)
    expect(gags(meet('log', 0, 'cake', 'roll').events)).toEqual(['hum'])
    expect(meet('goose', 2, 'cake', 'run').lap.left).toBe(3)
    for (const [obstacle, lane] of [['stream', 0], ['branch', 1], ['brambles', 0], ['log', 0]] as [Obstacle, Lane][]) expect(meet(obstacle, lane, 'cake', obstacle === 'stream' ? 'run' : 'roll').lap.left).toBe(3)
  })

  it('has its top tier snatched by a goose it passes on her left', () => {
    const { lap, events } = meet('goose', 0, 'cake', 'run')
    expect(gags(events)).toEqual(['snatch'])
    expect(lap.left).toBe(2)
  })
})

describe('the grid: the ladder', () => {
  it('is a bridge over the stream and a duckboard over the mud, crossed dry on its rungs', () => {
    const bridge = meet('stream', 2, 'ladder', 'run')
    expect(gags(bridge.events)).toEqual(['bridge'])
    expect(bridge.lap.fox.wet).toBe(false)
    const rungs = bridge.events.filter((event) => event.type === 'step' && event.surface === 'rung')
    expect(rungs.length).toBeGreaterThanOrEqual(4)
    expect(rungs.map((event) => (event.type === 'step' ? event.n : 0))).toEqual(rungs.map((_, i) => i + 1))
    const board = meet('mud', 0, 'ladder', 'run')
    expect(gags(board.events)).toEqual(['duckboard'])
    expect(board.lap.fox.muddy).toBe(false)
    expect(board.lap.marks.muddy).toBe(true)
  })

  it('snags on the branch run or jumped, drags under it rolled, climbs the thorns, vaults the log two steps on, and takes the goose for a ride', () => {
    const snag = meet('branch', 0, 'ladder', 'run')
    expect(gags(snag.events)).toEqual(['snag'])
    expect(snag.lap.carrying).toBe(true)
    expect(gags(meet('branch', 1, 'ladder', 'jump').events)).toEqual(['snag'])
    expect(gags(meet('branch', 0, 'ladder', 'roll').events)).toEqual(['drag'])
    const climb = meet('brambles', 1, 'ladder', 'run')
    expect(gags(climb.events)).toEqual(['climb'])
    expect(climb.lap.fox.burrs).toBe(false)
    expect(climb.lap.s).toBeGreaterThan(ZONES.brambles.to)
    const vault = meet('log', 1, 'ladder', 'run')
    expect(gags(vault.events)).toEqual(['vault'])
    expect(vault.lap.s).toBe(ZONES.log.to + 2 * STEP)
    const ride = meet('goose', 0, 'ladder', 'run')
    expect(gags(ride.events)).toEqual(['ride'])
    expect(ride.lap.trail.gooseRides).toBe(true)
    expect(types(ride.events)).not.toContain('honk')
  })

  it('carries the goose past her own nest without a bump', () => {
    const lap = lapAt(ZONES.goose.from - STEP, 1, 'ladder', { trail: { gooseRides: true } })
    const events = run(lap, 3 * STEP)
    expect(types(events)).not.toContain('bump')
    expect(events.some((event) => event.type === 'step' && event.rides)).toBe(true)
  })
})

describe('the grid: the balloons', () => {
  it('dangles the fox dry over the stream, catches under the branch, tiptoes and floats over the mud, drifts over the log', () => {
    const dangle = meet('stream', 1, 'balloons', 'run')
    expect(gags(dangle.events)).toEqual(['dangle'])
    expect(dangle.lap.fox.wet).toBe(false)
    const squeak = meet('branch', 0, 'balloons', 'run')
    expect(gags(squeak.events)).toEqual(['squeak'])
    expect(squeak.lap.s).toBeGreaterThan(ZONES.branch.to)
    expect(squeak.lap.left).toBe(4)
    const tiptoe = meet('mud', 2, 'balloons', 'run')
    expect(gags(tiptoe.events)).toEqual(['tiptoe'])
    expect(tiptoe.lap.fox.muddy).toBe(false)
    const float = meet('mud', 0, 'balloons', 'jump')
    expect(gags(float.events)).toEqual(['sigh'])
    expect(float.lap.s).toBeGreaterThan(ZONES.mud.to)
    expect(float.lap.fox.muddy).toBe(false)
    expect(gags(meet('log', 1, 'balloons', 'jump').events)).toEqual(['creak'])
  })

  it('pops three in the thorns, clears them with all four in a jump and not with fewer, and has one pecked by the goose', () => {
    const pops = meet('brambles', 0, 'balloons', 'run')
    expect(gags(pops.events)).toEqual(['pops'])
    expect(pops.lap.left).toBe(1)
    expect(pops.lap.trail.leftovers).toHaveLength(3)
    expect(pops.lap.s).toBeLessThan(ZONES.brambles.from)
    const clear = meet('brambles', 1, 'balloons', 'jump')
    expect(gags(clear.events)).toEqual([])
    expect(clear.lap.s).toBeGreaterThan(ZONES.brambles.to)
    expect(gags(meet('brambles', 1, 'balloons', 'jump', { left: 3 }).events)).toEqual(['tailhang'])
    const bang = meet('goose', 0, 'balloons', 'run')
    expect(gags(bang.events)).toEqual(['bang'])
    expect(bang.lap.left).toBe(3)
  })
})

describe('the grid: the sleeping owl', () => {
  it('snores on the stones, in the mud and over the log, and sleeps on behind the goose and rolled past her', () => {
    expect(gags(meet('stream', 0, 'owl', 'run').events)).toEqual(['snore'])
    expect(gags(meet('mud', 0, 'owl', 'run').events)).toEqual(['cradle'])
    expect(gags(meet('log', 1, 'owl', 'jump').events)).toEqual(['turnover'])
    for (const [lane, way] of [[2, 'run'], [0, 'roll']] as [Lane, 'run' | 'roll'][]) {
      const { lap } = meet('goose', lane, 'owl', way)
      expect(lap.marks.ruffles).toBe(0)
    }
  })

  it('wakes in the stream, at a thorn and at the honk, and flies the fox back three steps, one ruffle each', () => {
    const cells: [Obstacle, Lane, 'run' | 'roll' | 'jump', Gag][] = [
      ['stream', 1, 'run', 'prrrt'],
      ['brambles', 0, 'run', 'thorn'],
      ['brambles', 1, 'roll', 'thorn'],
      ['brambles', 0, 'jump', 'thorn'],
      ['goose', 0, 'run', 'shriek'],
      ['goose', 1, 'jump', 'shriek'],
    ]
    for (const [obstacle, lane, way, gag] of cells) {
      const { lap, events } = meet(obstacle, lane, 'owl', way)
      expect(gags(events), `${obstacle} ${way}`).toContain(gag)
      expect(lap.marks.ruffles, `${obstacle} ${way}`).toBe(1)
      expect(lap.carrying).toBe(true)
      expect(lap.s, `${obstacle} ${way}`).toBeLessThan(ZONES[obstacle].from)
    }
  })

  it('takes hold of the branch in its sleep when jumped into the leaves, and is had back by a jump under it', () => {
    const { lap, events } = meet('branch', 0, 'owl', 'jump')
    expect(gags(events)).toContain('cling')
    expect([lap.carrying, lap.lies]).toEqual([false, 'branch'])
    const again = new Lap({ ...saved(), ...lap.snapshot(saved()), at: ZONES.branch.from - 2 * STEP })
    again.hold(true)
    let jumped = false
    const more: LapEvent[] = []
    for (let i = 0; i < 3 / TICK; i++) {
      if (!jumped && again.s >= ZONES.branch.mid - 28) { again.jump(); jumped = true }
      again.step(TICK)
      more.push(...again.events.splice(0))
    }
    expect(types(more)).toContain('pickup')
    expect([again.carrying, again.lies]).toEqual([true, null])
  })
})

describe('the grid: the bucket', () => {
  it('is scooped brim full in the stream and lands on the head at the branch', () => {
    const scoop = meet('stream', 2, 'bucket', 'run')
    expect(gags(scoop.events)).toEqual(['scoop'])
    expect(scoop.lap.left).toBe(AT_MOST.bucket)
    const clang = meet('branch', 0, 'bucket', 'run')
    expect(gags(clang.events)).toEqual(['clang'])
    expect(clang.lap.left).toBe(0)
    expect(clang.lap.s).toBe(ZONES.branch.to + STEP)
  })

  it('slops one level a jump: a puddle on the mud, flowers on the thorns, mushrooms on the log, the goose turned round', () => {
    const full = { left: 3 }
    const puddle = meet('mud', 2, 'bucket', 'jump', full)
    expect(gags(puddle.events)).toEqual(['puddle', 'mudpie'])
    expect(puddle.lap.trail.puddle).toBe(true)
    const flowers = meet('brambles', 0, 'bucket', 'jump', full)
    expect(gags(flowers.events)).toEqual(['flowers'])
    expect([flowers.lap.trail.flowers, flowers.lap.left]).toEqual([true, 2])
    expect(flowers.lap.s).toBeGreaterThan(ZONES.brambles.to)
    const mushrooms = meet('log', 1, 'bucket', 'jump', full)
    expect(gags(mushrooms.events)).toEqual(['mushrooms'])
    expect(mushrooms.lap.trail.mushrooms).toBe(true)
    const sulk = meet('goose', 0, 'bucket', 'jump', full)
    expect(gags(sulk.events)).toEqual(['sulk'])
    expect(sulk.lap.trail.gooseLooks).toBe('right')
    const wasted = lapAt(260, 1, 'bucket', full)
    wasted.hold(true)
    wasted.jump()
    expect(gags(settle(wasted))).toEqual(['spill'])
    expect(wasted.left).toBe(2)
  })

  it('goes soft through thorns in flower, and is honked at on the right by a goose that was turned', () => {
    const soft = meet('brambles', 0, 'none', 'run', { trail: { flowers: true } })
    expect(gags(soft.events)).toEqual(['floomp'])
    expect(soft.lap.fox.burrs).toBe(false)
    expect(soft.lap.s).toBeGreaterThan(ZONES.brambles.to)
    expect(types(meet('goose', 2, 'none', 'run', { trail: { gooseLooks: 'right' } }).events)).toContain('honk')
    expect(types(meet('goose', 0, 'none', 'run', { trail: { gooseLooks: 'right' } }).events)).not.toContain('honk')
  })
})

describe('a tumble with a load', () => {
  it('throws the whole load to the worst spot of the obstacle, where it lies until the fox runs through its lane', () => {
    const { lap, events } = meet('log', 1, 'cake', 'run')
    expect(types(events)).toContain('throw')
    expect([lap.carrying, lap.lies]).toEqual([false, ZONES.log.worst])
    expect(lap.left).toBe(3)
    // The fox goes on without it, and the load stays where it lies.
    run(lap, 60)
    expect(lap.carrying).toBe(false)
    const back = new Lap({ ...lap.snapshot(saved()), at: ZONES.log.from - 2 * STEP, lane: 2 })
    const more = run(back, 3 * STEP, false)
    expect(types(more)).toContain('pickup')
    expect(back.carrying).toBe(true)
  })

  it('marks the load with what it was thrown into', () => {
    expect(meet('stream', 1, 'cake', 'run').lap.marks.wet).toBe(true)
    expect(meet('mud', 0, 'owl', 'jump').lap.marks.muddy).toBe(true)
    expect(meet('brambles', 0, 'cake', 'run').lap.marks.berries).toBe(true)
  })

  it('lets the fox meet every obstacle with empty hands while its load lies somewhere', () => {
    const { lap } = meet('stream', 1, 'ladder', 'jump')
    expect(lap.carrying).toBe(true)
    const thrown = lapAt(ZONES.goose.from - 2 * STEP, 1, 'ladder')
    run(thrown, 3 * STEP)
    settle(thrown)
    expect(thrown.carrying).toBe(false)
    expect(thrown.inHand).toBe('none')
    expect(thrown.lies).toEqual({ at: PLACES.goose, lane: 0 })
  })
})

describe("the owl's flight back", () => {
  it('is saved when it starts, three steps back and never before the obstacle behind', () => {
    const lap = lapAt(ZONES.brambles.from - 10, 0, 'owl')
    run(lap, 30)
    expect(lap.act?.kind).toBe('flight')
    expect(lap.urgent).toBe(true)
    const snap = lap.snapshot(saved())
    expect(snap.at).toBe(Math.round(lap.act!.to))
    expect(snap.marks.ruffles).toBe(1)
    expect(lap.act!.from - lap.act!.to).toBeCloseTo(FLIGHT_BACK, 0)
    expect(lap.act!.to).toBeGreaterThanOrEqual(ZONES.mud.to)
  })

  it('is ended by a touch, which lets the fox down where the flight ends with no sound', () => {
    const lap = lapAt(ZONES.brambles.from - 10, 0, 'owl')
    run(lap, 30)
    lap.hold(false)
    lap.step(0.4)
    const to = lap.act!.to
    lap.events.length = 0
    lap.hold(true)
    expect(lap.act).toBeNull()
    expect(lap.s).toBe(to)
    expect(types(lap.events)).toEqual(['start'])
  })
})

describe('the end of a lap and the next', () => {
  it('finishes at the hand-over spot, at once, with the fox stopped under a finger that is still down', () => {
    const lap = lapAt(PLACES.handOver - 30, 1, 'cake')
    const events = run(lap, 60)
    expect(types(events)).toContain('arrive')
    expect(lap.finished).toBe(true)
    expect(lap.s).toBe(PLACES.handOver)
    expect(lap.urgent).toBe(true)
    expect(lap.down).toBe(false)
    lap.events.length = 0
    lap.step(3)
    lap.shift(1)
    lap.jump()
    expect(lap.s).toBe(PLACES.handOver)
    expect(lap.events).toEqual([])
  })

  it('comes straight down on the spot when it is jumped over', () => {
    const lap = lapAt(PLACES.handOver - 40, 1)
    lap.hold(true)
    lap.step(0.3)
    lap.jump()
    settle(lap)
    expect(lap.finished).toBe(true)
    expect(lap.s).toBe(PLACES.handOver)
  })

  it('begins the whole new lap on the press, saved before the fox moves, and trots the one step to the shelf', () => {
    const lap = lapAt(PLACES.handOver - 30, 2, 'cake', { left: 2, marks: { berries: true }, fox: { burrs: true }, trail: { flowers: true, leftovers: [{ obstacle: 'log', lane: 1 }] } })
    run(lap, 60)
    const ended = lap.snapshot(saved())
    lap.dirty = lap.urgent = false
    lap.begin()
    expect(lap.urgent).toBe(true)
    expect(lap.snapshot(ended)).toEqual(newLap(ended))
    expect(newLap(ended)).toMatchObject({ finished: false, at: PLACES.shelf, lane: 2, load: 'none', held: false, lies: null, left: 0 })
    lap.step(ACTS.trot.seconds + TICK)
    expect(lap.s).toBe(PLACES.shelf)
    expect(lap.act).toBeNull()
    expect(lap.canTake).toBe(true)
  })
})

describe('found as left', () => {
  it('opens from any save with the fox standing, and nothing starts or sounds until a touch', () => {
    const moments: Lap[] = []
    for (const [obstacle, lane, load, way] of [['stream', 1, 'cake', 'run'], ['brambles', 0, 'owl', 'run'], ['log', 1, 'ladder', 'run'], ['goose', 0, 'balloons', 'run'], ['mud', 0, 'bucket', 'jump']] as [Obstacle, Lane, Load, 'run' | 'jump'][]) {
      const zone = ZONES[obstacle]
      const lap = lapAt(zone.from - 2 * STEP, lane, load)
      lap.hold(true)
      for (let i = 0; i < 2.5 / TICK; i++) {
        if (way === 'jump' && Math.abs(lap.s - (zone.mid - 28)) < 0.5) lap.jump()
        lap.step(TICK)
        if (i % 17 === 0) moments.push(new Lap(lap.snapshot(saved())))
      }
    }
    expect(moments.length).toBeGreaterThan(50)
    for (const opened of moments) {
      const at = opened.s
      expect(Number.isInteger(at)).toBe(true)
      opened.step(5)
      expect(opened.s).toBe(at)
      expect([opened.air, opened.act, opened.y, opened.speed, opened.tossed]).toEqual([false, null, 0, 0, false])
      expect(opened.events).toEqual([])
      expect(opened.faces).toBe('child')
    }
  })
})

describe('parked equals loaded', () => {
  it('settles at put-away into exactly what a load of its save finds, at any moment of any cell', () => {
    const plain = (lap: Lap): unknown => JSON.parse(JSON.stringify({ ...lap, events: [], dirty: false, urgent: false, remainder: 0, footfalls: 0, run: 0, phase: 0, tookOffAt: 0 }))
    let checked = 0
    for (const [obstacle, lane, load, way] of [['stream', 1, 'cake', 'run'], ['brambles', 0, 'owl', 'run'], ['log', 1, 'ladder', 'run'], ['goose', 1, 'bucket', 'jump'], ['mud', 0, 'bucket', 'jump'], ['branch', 0, 'owl', 'jump'], ['goose', 1, 'cake', 'run']] as [Obstacle, Lane, Load, 'run' | 'jump'][]) {
      const zone = ZONES[obstacle]
      for (let stop = 0.2; stop < 3; stop += 0.23) {
        const lap = lapAt(zone.from - 2 * STEP, lane, load)
        lap.hold(true)
        for (let i = 0; i < stop / TICK; i++) {
          if (way === 'jump' && Math.abs(lap.s - (zone.mid - 28)) < 0.5) lap.jump()
          lap.step(TICK)
        }
        const save = lap.snapshot(saved())
        lap.events.length = 0
        lap.settle()
        expect(lap.events).toEqual([])
        expect(plain(lap), `${obstacle} ${load} at ${stop}`).toEqual(plain(new Lap(save)))
        expect(lap.snapshot(saved())).toEqual(save)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(80)
  })

  it('settles the hand-over, the step to the shelf and a load in the hand the same way', () => {
    const arriving = lapAt(PLACES.handOver - 40, 1, 'balloons')
    arriving.hold(true)
    arriving.step(0.3)
    arriving.jump()
    arriving.step(0.4)
    const save = arriving.snapshot(saved())
    expect(save.finished).toBe(true)
    arriving.settle()
    expect(arriving.finished).toBe(true)
    expect(arriving.s).toBe(PLACES.handOver)
    arriving.begin()
    arriving.step(0.1)
    const next = arriving.snapshot(saved())
    arriving.settle()
    expect(arriving.s).toBe(PLACES.shelf)
    expect(arriving.snapshot(saved())).toEqual(next)
    arriving.take('ladder')
    const held = arriving.snapshot(saved())
    arriving.settle()
    expect(arriving.snapshot(saved())).toEqual(held)
    expect(new Lap(held).inHand).toBe('ladder')
  })
})

describe('clearances: nothing passes through anything', () => {
  /** How high an act holds the fox when it is over a place on its way. */
  function riseOver(kind: ActKind, from: number, to: number, place: number): number {
    for (let p = 0; p <= 1; p += 0.002) if (from + (to - from) * actAlong(kind, p) >= place) return actRise(kind, p)
    return 0
  }

  it('carries the fox over the log and over the thorns higher than their tops', () => {
    expect(riseOver('trip', ZONES.log.from, ZONES.log.to + 14, ZONES.log.mid)).toBeGreaterThan(CLEAR.logTop)
    expect(riseOver('vault', ZONES.log.from, ZONES.log.to + 2 * STEP, ZONES.log.mid)).toBeGreaterThan(CLEAR.logTop)
    expect(riseOver('climb', ZONES.brambles.from, ZONES.brambles.to + 10, ZONES.brambles.mid)).toBeGreaterThan(CLEAR.archTop)
    expect(actRise('tailhang', 0.3)).toBeGreaterThanOrEqual(CLEAR.archTop)
  })

  it('stops a bonk, a snag, a yelp and a bump short of the thing, by more than the fox is thick', () => {
    for (const kind of ['bonk', 'snag'] as ActKind[]) for (let p = 0; p <= 1; p += 0.01) expect(actAlong(kind, p)).toBeGreaterThanOrEqual(0)
    // The yelp goes ten pegs towards the thorns from eight pegs off their middle... and no further than their near edge plus two.
    let deepest = 0
    for (let p = 0; p <= 1; p += 0.01) deepest = Math.min(deepest, actAlong('burrs', p))
    expect(-deepest * 30).toBeLessThanOrEqual(10)
  })

  it('keeps a rolled fox rolled until it is out from under the branch, the thorns and the log', () => {
    for (const [obstacle, lane] of [['branch', 0], ['brambles', 1], ['log', 0]] as [Obstacle, Lane][]) {
      const zone = ZONES[obstacle]
      const lap = lapAt(zone.from - 40, lane)
      lap.hold(true)
      lap.tuck()
      for (let i = 0; i < 2 / TICK; i++) {
        lap.step(TICK)
        if (lap.s >= zone.from && lap.s < zone.to) {
          expect(lap.roll, obstacle).toBeGreaterThan(0)
          lap.jump()
          expect(lap.air, obstacle).toBe(false)
        }
      }
      expect(lap.s).toBeGreaterThan(zone.to)
      expect(lap.act).toBeNull()
    }
  })

  it('stops a rolled fox under the branch as a ball, and refuses a step sideways into something that stands', () => {
    const lap = lapAt(ZONES.branch.from - 6, 0)
    lap.hold(true)
    lap.tuck()
    lap.step(0.15)
    lap.hold(false)
    lap.step(2)
    expect(lap.roll).toBeGreaterThan(0)
    expect(lap.faces).toBe('trail')
    const beside = lapAt(ZONES.log.from - 6, 0)
    beside.hold(true)
    beside.tuck()
    beside.step(0.15)
    beside.shift(1)
    expect(beside.lane).toBe(0)
    const open = lapAt(ZONES.branch.from + 2, 2)
    open.shift(-1)
    expect(open.lane).toBe(2)
  })
})

describe('what the first reading found', () => {
  it('ends a jump that is begun and landed inside the mud in a belly flop, as one from outside does', () => {
    for (const lane of [0, 2] as const) {
      const lap = lapAt(ZONES.mud.from + 6, lane)
      lap.hold(true)
      lap.step(TICK)
      lap.events.length = 0
      lap.jump()
      const events = settle(lap)
      expect(lap.s, `lane ${lane}`).toBeLessThan(ZONES.mud.to)
      expect(gags(events), `lane ${lane}`).toEqual(['flop'])
      expect(lap.fox.muddy).toBe(true)
    }
    // On the plank, the way through, a jump is only a jump.
    const plank = lapAt(ZONES.mud.from + 6, 1)
    plank.hold(true)
    plank.step(TICK)
    plank.events.length = 0
    plank.jump()
    expect(gags(settle(plank))).toEqual([])
  })

  it('pops one balloon at a time in the thorns: one event for each that pops, each on a tick of its own, and no more', () => {
    for (const had of [4, 3, 2, 1]) {
      const lap = lapAt(ZONES.brambles.from - 2 * STEP, 0, 'balloons', { left: had })
      lap.hold(true)
      const ticks: number[] = []
      let cues = 0
      for (let tick = 0; tick < 4 / TICK; tick++) {
        lap.step(TICK)
        for (const event of lap.events.splice(0)) {
          if ((event.type === 'gag' && event.gag === 'pops') || event.type === 'pop') ticks.push(tick)
          if (event.type === 'cue' && event.act === 'burrs') cues += 1
        }
        if (ticks.length > 0 && !lap.act) break
      }
      const popped = Math.min(3, had)
      expect(ticks, `with ${had}`).toHaveLength(popped)
      expect(new Set(ticks).size, `with ${had}`).toBe(popped)
      // The moments of the hop back that are not a pop are the fox's own.
      expect(cues, `with ${had}`).toBe(ACTS.burrs.cues.length - (popped - 1))
      expect(lap.left, `with ${had}`).toBe(had - popped)
      expect(lap.trail.leftovers, `with ${had}`).toHaveLength(popped)
      expect(lap.popping).toBe(0)
    }
  })

  it('brings the mushrooms up on the log with three bloops, one after another, each on a tick of its own', () => {
    const lap = lapAt(ZONES.log.from - 2 * STEP, 1, 'bucket', { left: 3 })
    lap.hold(true)
    const at: number[] = [], which: number[] = []
    let jumped = false
    for (let tick = 0; tick < 6 / TICK; tick++) {
      if (!jumped && lap.s >= ZONES.log.mid - 28) { lap.jump(); jumped = true }
      lap.step(TICK)
      for (const event of lap.events.splice(0)) {
        if (!((event.type === 'gag' && event.gag === 'mushrooms') || event.type === 'bloop')) continue
        at.push(tick * TICK)
        which.push(event.type === 'bloop' ? event.index : 0)
      }
    }
    expect(which).toEqual([0, 1, 2])
    expect(BLOOPS).toBe(3)
    for (let i = 1; i < at.length; i++) expect(Math.abs(at[i] - at[i - 1] - BLOOP_EVERY)).toBeLessThan(TICK + 1e-9)
    // Each is a sound of its own, higher than the one before.
    const pitches = [notesFor({ type: 'gag', gag: 'mushrooms', obstacle: 'log', lane: 1 }), notesFor({ type: 'bloop', index: 1 }), notesFor({ type: 'bloop', index: 2 })].map((notes) => notes[0].frequency)
    expect(pitches[1]).toBeGreaterThan(pitches[0])
    expect(pitches[2]).toBeGreaterThan(pitches[1])
    // The save has them from the first, and a lap put away half way through the three finds all of them.
    expect(lap.trail.mushrooms).toBe(true)
  })

  it('rings a run of chimes when the brambles flower: four, one after another, each on a tick of its own', () => {
    const flowers = meet('brambles', 0, 'bucket', 'jump', { left: 3 })
    const ticks: number[] = []
    flowers.events.forEach((event) => {
      if (event.type === 'gag' && event.gag === 'flowers') ticks.push(0)
      if (event.type === 'chime') ticks.push(event.index)
    })
    expect(ticks).toEqual([0, 1, 2, 3])
    expect(CHIMES).toBe(4)
    // Timed again from a lap of its own: the chimes come a little more than a tenth of a second apart.
    const lap = lapAt(ZONES.brambles.from - 2 * STEP, 0, 'bucket', { left: 3 })
    lap.hold(true)
    const at: number[] = []
    let jumped = false
    for (let tick = 0; tick < 6 / TICK; tick++) {
      if (!jumped && lap.s >= ZONES.brambles.mid - 28) { lap.jump(); jumped = true }
      lap.step(TICK)
      for (const event of lap.events.splice(0)) if ((event.type === 'gag' && event.gag === 'flowers') || event.type === 'chime') at.push(tick * TICK)
    }
    expect(at).toHaveLength(4)
    for (let i = 1; i < at.length; i++) {
      // To the tick: never together, and never a gap a child would hear as two sounds.
      expect(Math.abs(at[i] - at[i - 1] - CHIME_EVERY)).toBeLessThan(TICK + 1e-9)
    }
    // Put away between two chimes, the rest do not ring: the flowers are in the save and the run is forgotten.
    const cut = lapAt(ZONES.brambles.from - 2 * STEP, 0, 'bucket', { left: 3 })
    cut.hold(true)
    let rung = 0
    jumped = false
    for (let tick = 0; tick < 6 / TICK && rung < 2; tick++) {
      if (!jumped && cut.s >= ZONES.brambles.mid - 28) { cut.jump(); jumped = true }
      cut.step(TICK)
      for (const event of cut.events.splice(0)) if ((event.type === 'gag' && event.gag === 'flowers') || event.type === 'chime') rung += 1
    }
    expect(rung).toBe(2)
    cut.settle()
    cut.events.length = 0
    for (let tick = 0; tick < 1 / TICK; tick++) cut.step(TICK)
    expect(cut.events.filter((event) => event.type === 'chime')).toEqual([])
    expect(cut.trail.flowers).toBe(true)
  })

  it('says the water came down over the fox when the bucket lands on its head, and only when there was water in it', () => {
    const full = meet('branch', 0, 'bucket', 'run', { left: 2 })
    expect(types(full.events).filter((type) => type === 'douse')).toHaveLength(1)
    expect(full.lap.fox.wet).toBe(true)
    const dry = meet('branch', 0, 'bucket', 'run', { left: 0 })
    expect(types(dry.events)).not.toContain('douse')
    expect(dry.lap.fox.wet).toBe(false)
  })

  it('answers a fox with empty hands at every one of the six obstacles, each in its own way and with its own sound, so a lap with nothing is not an empty one', () => {
    const names = Object.keys(ZONES) as Obstacle[]
    expect(names).toHaveLength(6)
    const answers = new Set<string>(), sounds = new Set<string>()
    for (const name of names) {
      // The goose is passed on the side she looks to; everything else is run into in a lane it fills.
      const lane = (name === 'goose' ? 0 : ZONES[name].blocked.indexOf(true)) as Lane
      const { events } = meet(name, lane, 'none', 'run')
      const told = events.filter((event) => event.type === 'gag' || event.type === 'honk' || event.type === 'bump')
      expect(told.length, name).toBeGreaterThan(0)
      answers.add(JSON.stringify(told[0]))
      const notes = told.flatMap((event) => notesFor(event))
      expect(notes.length, name).toBeGreaterThan(0)
      sounds.add(JSON.stringify(notes))
      // And a second answer of its own to a jump or a roll, which is not the first.
      const other = meet(name, lane, 'none', name === 'stream' || name === 'log' ? 'roll' : 'jump').events.filter((event) => event.type === 'gag' || event.type === 'duck' || event.type === 'honk')
      if (name !== 'stream') expect(other.length, `${name}, the other way`).toBeGreaterThan(0)
    }
    expect(answers.size).toBe(6)
    expect(sounds.size).toBe(6)
  })
})
