import { describe, expect, it } from 'vitest'
import { isSound, lean, placeOf, putInSand, tap } from './arrangement'
import { MOVES_CAP } from './config'
import { furrow, isSmooth, marksToText, stamp } from './marks'
import { seeded } from './motion'
import { KINDS, layout, rideOf, wantMet, type Kind } from './rides'
import { afterMove, beginRide, endRide, freshWorld, largestSaved, load, markShown, rideIsOver, save, type World } from './save'
import { FRIEND_IDS, WAITING_PLACE } from './world'
import { standsAt } from './arrangement'

/** A ride of a kind as it opens, at that position. */
function rideAt(kind: Kind): World {
  const world = freshWorld(null)
  return { ...world, state: { ...world.state, position: kind }, kind, arrangement: layout(rideOf(kind, 0)) }
}

/** Through storage and back: plain JSON, as the shell keeps it. */
const through = (world: World, age: number | null = null) => load(JSON.parse(JSON.stringify(save(world))), age)

describe('a first visit', () => {
  it('opens on the first ride for no age, laid out and not begun', () => {
    const world = freshWorld(null)
    expect(world.kind).toBe('little-asks')
    expect(world.arrangement.left).toEqual(['pim'])
    expect(world.state.finished).toBe(false)
    expect(world.moves).toBe(0)
    expect(isSmooth(world.marks)).toBe(true)
    expect(freshWorld(5).kind).toBe('middle-asks')
  })
})

describe('found as left', () => {
  it('comes back from storage exactly as it was, mid-ride', () => {
    let world = freshWorld(null)
    world = afterMove(world, putInSand(world.arrangement, 'bo', { x: -3.1, z: 2.4 }))
    world = afterMove(world, tap(world.arrangement, 'pim'))
    world = afterMove(world, tap(world.arrangement, 'bo'))
    furrow(world.marks, -4, 2, 0, 2.5)
    stamp(world.marks, 3, 1.5, 0.3, 7)
    world = markShown(world, 'little-asks')
    const back = through(world)
    expect(back.arrangement).toEqual(world.arrangement)
    expect(back.state).toEqual(world.state)
    expect(back.moves).toBe(world.moves)
    expect(back.shown).toEqual(['little-asks'])
    expect(marksToText(back.marks)).toBe(marksToText(world.marks))
    expect(lean(back.arrangement)).toBe(lean(world.arrangement))
  })

  it('is the same after a second trip through storage: nothing drifts', () => {
    const random = seeded(11)
    let world = freshWorld(null)
    for (let i = 0; i < 300; i++) {
      const id = FRIEND_IDS[Math.floor(random() * 4)]
      const next = random() < 0.5 ? tap(world.arrangement, id) : putInSand(world.arrangement, id, { x: (random() - 0.5) * 12, z: (random() - 0.5) * 7.5 })
      world = afterMove(world, next)
      if (rideIsOver(world)) world = endRide(world)
      else if (world.state.finished && random() < 0.3) world = beginRide(world)
      const once = through(world)
      expect(isSound(once.arrangement)).toBe(true)
      expect(once.arrangement, `step ${i}`).toEqual(world.arrangement)
      expect(save(through(once))).toEqual(save(once))
    }
  })

  it('saves nothing in the air: only places, as whole numbers and ids', () => {
    const saved = save(freshWorld(null))
    expect(Object.keys(saved).sort()).toEqual(['finished', 'kind', 'left', 'marks', 'moves', 'position', 'right', 'sand', 'shown', 'turn', 'v', 'waiting'])
    for (const cell of Object.values(saved.sand)) expect(cell!.every((n) => Number.isInteger(n))).toBe(true)
  })
})

describe('the end of a ride and the start of the next', () => {
  const lifted = () => {
    let world = freshWorld(null)
    world = afterMove(world, tap(world.arrangement, 'mog'))
    expect(rideIsOver(world)).toBe(true)
    return world
  }

  it('the ride is judged once, the position moves, and the next asker goes to the waiting place', () => {
    const ended = endRide(lifted())
    expect(ended.state.finished).toBe(true)
    expect(ended.state.position).toBe('middle-asks')
    // The next ride is of the new position at once: its asker, Mog, comes down from the plank to wait.
    expect(ended.arrangement.waiting).toBe('mog')
    expect(standsAt(ended.arrangement, 'mog')).toEqual({ ...WAITING_PLACE })
    expect(ended.arrangement.right).toEqual([])
    expect(endRide(ended)).toBe(ended)
    expect(rideIsOver(ended)).toBe(false)
  })

  it('everything else stays exactly as the child left it', () => {
    const before = lifted(), ended = endRide(before)
    for (const id of FRIEND_IDS) if (id !== ended.arrangement.waiting) expect(placeOf(ended.arrangement, id)).toEqual(placeOf(before.arrangement, id))
  })

  it('if the child does nothing, nothing starts: only a touch on the waiting friend begins the next ride', () => {
    const ended = endRide(lifted())
    // Free play on the finished scene moves friends and counts nothing.
    const played = afterMove(ended, tap(ended.arrangement, 'bo'))
    expect(played.moves).toBe(ended.moves)
    expect(played.state.finished).toBe(true)
    expect(tap(played.arrangement, 'mog')).toBe(played.arrangement)
    // Nor can the waiting friend be carried off: the world stays as it was.
    expect(afterMove(played, putInSand(played.arrangement, 'mog', { x: 3, z: 2 }))).toBe(played)
    const begun = beginRide(played)
    expect(begun.state.finished).toBe(false)
    expect(begun.kind).toBe('middle-asks')
    expect(begun.turn).toBe(1)
    expect(begun.moves).toBe(0)
    expect(begun.arrangement.waiting).toBe(null)
    expect(wantMet(rideOf(begun.kind, begun.turn), begun.arrangement)).toBe(false)
    expect(beginRide(begun)).toBe(begun)
  })

  it('on load no ride replays: an ended ride is still ended, with the same friend waiting', () => {
    const ended = endRide(lifted())
    const back = through(ended)
    expect(back.state.finished).toBe(true)
    expect(back.arrangement).toEqual(ended.arrangement)
    expect(rideIsOver(back)).toBe(false)
  })

  it('a visit put away mid-ride leaves the position where it was', () => {
    let world = freshWorld(null)
    world = afterMove(world, tap(world.arrangement, 'bo'))
    world = afterMove(world, tap(world.arrangement, 'bo'))
    expect(through(world).state.position).toBe('little-asks')
    expect(through(world).moves).toBe(2)
  })

  it('a long muddle of a ride is judged badly and the next one is a step easier, never the one on screen', () => {
    let world = rideAt('big-asks')
    for (let i = 0; i < 12; i++) world = afterMove(world, tap(world.arrangement, 'pim'))
    expect(world.kind).toBe('big-asks')
    world = afterMove(world, tap(world.arrangement, 'pim'))
    world = afterMove(world, tap(world.arrangement, 'mog'))
    expect(rideIsOver(world)).toBe(true)
    expect(endRide(world).state.position).toBe('middle-asks')
  })

  it('the count of moves stops at its cap', () => {
    let world = rideAt('big-asks')
    for (let i = 0; i < MOVES_CAP * 3; i++) world = afterMove(world, tap(world.arrangement, 'pim'))
    expect(world.moves).toBe(MOVES_CAP)
  })
})

describe('a damaged or foreign save', () => {
  it('anything that is not this game’s record gives a first visit', () => {
    for (const bad of [null, undefined, 3, 'x', [], [1, 2], {}, { v: 99, position: 'big-asks' }, { v: '1' }]) {
      const world = load(bad, null)
      expect(save(world)).toEqual(save(freshWorld(null)))
    }
  })

  it('each damaged field is repaired by itself and the rest is kept', () => {
    const good = save(endRide(afterMove(freshWorld(null), tap(freshWorld(null).arrangement, 'mog'))))
    const cases: Record<string, unknown>[] = [
      { ...good, turn: 'x' }, { ...good, turn: -3.5 }, { ...good, turn: 1e9 }, { ...good, kind: 'nonsense' }, { ...good, moves: -5 }, { ...good, moves: Infinity },
      { ...good, shown: 'all' }, { ...good, shown: ['nonsense', 'big-asks', 'big-asks'] }, { ...good, marks: 12 }, { ...good, marks: 'abc' },
      { ...good, sand: null }, { ...good, sand: { pim: 'here', bo: [NaN, 2], dot: [1e9, -1e9] } }, { ...good, waiting: 'nobody' }, { ...good, waiting: null },
      { ...good, left: ['pim', 'pim', 'bo', 'ghost', 7], right: ['bo', 'pim'] }, { ...good, left: ['pim', 'mog', 'dot', 'bo'], right: ['pim', 'mog', 'dot', 'bo'], sand: {} },
      { ...good, position: 'grade-2' }, { ...good, finished: 'yes' }, { ...good, left: null }, { ...good, right: 'bo' },
    ]
    for (const raw of cases) {
      const world = load(JSON.parse(JSON.stringify(raw)), null)
      expect(isSound(world.arrangement), JSON.stringify(raw).slice(0, 80)).toBe(true)
      expect(Number.isInteger(world.turn) && world.turn >= 0 && world.turn < 10).toBe(true)
      expect(KINDS).toContain(world.kind)
      expect(world.moves >= 0 && world.moves <= MOVES_CAP).toBe(true)
      expect(world.shown.every((kind) => KINDS.includes(kind))).toBe(true)
      expect(new Set(world.shown).size).toBe(world.shown.length)
      // A ride that has ended always has someone waiting, and a ride that runs has nobody waiting.
      expect(world.arrangement.waiting !== null).toBe(world.state.finished)
      // And what it gives saves and loads to itself.
      expect(save(through(world))).toEqual(save(world))
    }
    expect(load({ ...good, position: 'grade-2' }, 5).state.position).toBe('middle-asks')
    expect(load({ ...good, moves: -5 }, null).state.position).toBe(good.position)
  })
})

describe('size', () => {
  it('the largest legal state is far under half the 64 KB cap, and under 2 KB', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(largestSaved())).length
    expect(bytes).toBeLessThan(32 * 1024)
    expect(bytes).toBeLessThan(2 * 1024)
    // It is at least as large as an ordinary one, so it is the one to measure.
    expect(bytes).toBeGreaterThanOrEqual(new TextEncoder().encode(JSON.stringify(save(freshWorld(null)))).length)
  })
})
